// Gemini calls: form analysis (D1-D5) and per-exercise history summary (G3).
// With no API key in js/config.js, everything falls back to sample/local results ("demo mode").

const API = "https://generativelanguage.googleapis.com/v1beta/models";
export const MAX_CLIP_BYTES = 14 * 1024 * 1024; // inline request limit is 20 MB after base64
const TIMEOUT_MS = 90_000;

let config = null;

export async function init() {
  if (config) return config;
  try {
    const mod = await import("./config.js");
    config = mod.CONFIG || {};
  } catch {
    config = {};
  }
  return config;
}

export function keyReady() {
  const key = (config?.GEMINI_API_KEY || "").trim();
  return key.length > 20;
}

function model() {
  return (config?.MODEL || "gemini-flash-latest").trim();
}

// ---- low-level call -----------------------------------------------------

async function generate(parts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/${encodeURIComponent(model())}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.GEMINI_API_KEY.trim() },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Gemini error: ${msg}`);
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) {
      const reason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason || "empty response";
      throw new Error(`Gemini returned no answer (${reason}).`);
    }
    return text;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Gemini took too long to respond. Check the Wi-Fi and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Gemini's answer wasn't valid JSON.");
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Couldn't read the video."));
    reader.readAsDataURL(blob);
  });
}

function geminiMime(type) {
  const base = (type || "video/webm").split(";")[0].trim().toLowerCase();
  if (base === "video/quicktime") return "video/mov";
  if (base === "video/x-matroska") return "video/webm";
  return base || "video/webm";
}

// ---- form analysis ------------------------------------------------------

export function analysisPrompt(ex) {
  return `You are a certified strength and conditioning coach reviewing a 15-second webcam clip of a BEGINNER at a college recreation center performing: ${ex.name}.

Focus on these checkpoints for ${ex.name}: ${ex.checkpoints}.

Rules:
- Only comment on what you can actually see in the video. Never invent problems.
- If the full body is not visible, the person is not doing ${ex.name}, the person is not in the frame, or the video is too dark or blurry to judge, set "visible": false and explain briefly in "visibilityIssue" what the user should change (for example "Move back so your feet are in frame").
- Give at most 3 issues, most important first (injury risk first).
- If the form is good, it's fine to return 0 or 1 minor issues and a high score.
- Be encouraging and use plain language with no jargon. Each fix must be a short, actionable cue.
- Timestamps use m:ss from the start of the clip.

Return ONLY JSON in exactly this shape:
{
  "visible": boolean,
  "visibilityIssue": string or null,
  "score": integer from 1 to 10,
  "repsObserved": integer or null${ex.hold ? " (use null, this is a hold)" : ""},
  "good": [1-2 short strings: what they did well],
  "issues": [{ "problem": string, "fix": string, "timestamp": "m:ss" }],
  "cues": [2-3 short phrases, max 4 words each]
}`;
}

function normalizeAnalysis(raw, ex, mode) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const visible = raw.visible !== false;
  let score = Math.round(Number(raw.score));
  if (!Number.isFinite(score)) score = 5;
  score = Math.min(10, Math.max(1, score));
  const reps = Number.isFinite(Number(raw.repsObserved)) && raw.repsObserved !== null ? Math.round(Number(raw.repsObserved)) : null;
  return {
    visible,
    visibilityIssue: str(raw.visibilityIssue) || (visible ? null : "Spotter couldn't see your whole body. Move back and try again."),
    score,
    repsObserved: ex.hold ? null : reps,
    good: arr(raw.good).map(str).filter(Boolean).slice(0, 2),
    issues: arr(raw.issues)
      .map((i) => ({ problem: str(i?.problem), fix: str(i?.fix), timestamp: str(i?.timestamp) || null }))
      .filter((i) => i.problem)
      .slice(0, 3),
    cues: arr(raw.cues).map(str).filter(Boolean).slice(0, 3),
    mode,
  };
}

/** Returns { raw, result }. Used by the app and by tools/prompt-test.html. */
export async function analyzeClipDetailed(blob, ex) {
  if (!keyReady()) {
    await new Promise((r) => setTimeout(r, 1200)); // feel like real analysis in demo mode
    const result = sampleAnalysis(ex);
    return { raw: JSON.stringify(result, null, 2), result };
  }
  if (blob.size > MAX_CLIP_BYTES) {
    throw new Error("That video is too large (max about 14 MB). Record in the app or trim the clip to 15 seconds.");
  }
  const data = await blobToBase64(blob);
  const text = await generate([
    { inline_data: { mime_type: geminiMime(blob.type), data } },
    { text: analysisPrompt(ex) },
  ]);
  return { raw: text, result: normalizeAnalysis(parseJson(text), ex, "ai") };
}

export async function analyzeClip(blob, ex) {
  return (await analyzeClipDetailed(blob, ex)).result;
}

const SAMPLES = {
  squat: {
    score: 6, repsObserved: 7,
    good: ["Chest stayed up through every rep", "Smooth, controlled pace"],
    issues: [
      { problem: "Knees caving inward on the way up", fix: "Push your knees out over your pinky toes as you stand.", timestamp: "0:05" },
      { problem: "Not reaching parallel depth", fix: "Sit a little lower until your thighs are parallel to the floor.", timestamp: "0:09" },
    ],
    cues: ["Knees out", "Sit deeper", "Chest up"],
  },
  pushup: {
    score: 6, repsObserved: 8,
    good: ["Full lockout at the top of each rep"],
    issues: [
      { problem: "Hips sagging toward the floor", fix: "Squeeze your glutes and brace your core to keep one straight line.", timestamp: "0:06" },
      { problem: "Elbows flaring out wide", fix: "Tuck your elbows to about 45 degrees from your body.", timestamp: "0:10" },
    ],
    cues: ["Straight line", "Elbows 45°", "Brace core"],
  },
  lunge: {
    score: 7, repsObserved: 6,
    good: ["Torso stayed tall", "Good step length"],
    issues: [
      { problem: "Front knee drifting inward", fix: "Keep your front knee stacked over your ankle and in line with your toes.", timestamp: "0:07" },
    ],
    cues: ["Knee over ankle", "Tall torso"],
  },
  plank: {
    score: 7, repsObserved: null,
    good: ["Elbows directly under shoulders", "Neck stayed neutral"],
    issues: [
      { problem: "Hips starting to sag near the end", fix: "Squeeze your glutes and pull your belly button toward your spine.", timestamp: "0:11" },
    ],
    cues: ["Hips level", "Squeeze glutes"],
  },
};

export function sampleAnalysis(ex) {
  const fromExercise = ex.sample && {
    score: 6,
    repsObserved: ex.hold ? null : 6,
    good: [ex.sample.good || "Controlled pace through the set"],
    issues: [{ problem: ex.sample.problem, fix: ex.sample.fix, timestamp: "0:07" }],
    cues: ex.cues,
  };
  const generic = { score: 7, repsObserved: ex.hold ? null : 6, good: ["Controlled pace through the set"], issues: [], cues: ex.cues };
  return normalizeAnalysis({ visible: true, ...(SAMPLES[ex.id] || fromExercise || generic) }, ex, "sample");
}

// ---- per-exercise history summary (G3) ----------------------------------

function summaryPrompt(ex, history) {
  const lines = history
    .map((h, i) => `${i + 1}. ${h.date.slice(0, 10)}, score ${h.score}/10, issues: ${h.issues.map((x) => x.problem).join("; ") || "none"}`)
    .join("\n");
  return `Here is a beginner's past form feedback for ${ex.name}, oldest to newest:
${lines}

Write a short coaching summary. Return ONLY JSON:
{
  "focusNextTime": string (1-2 encouraging sentences: the single most important thing to focus on next session),
  "recurring": [issues seen 2+ times that are still present in the latest session; short labels],
  "fixed": [issues that appeared before but not in the latest session; short labels],
  "trend": "improving" | "steady" | "declining"
}`;
}

/** Local, no-AI summary used in demo mode or if the API call fails. */
export function localSummary(history) {
  if (!history.length) return { focusNextTime: "", recurring: [], fixed: [], trend: "steady" };
  const latest = history[history.length - 1];
  const label = (p) => p.trim().toLowerCase();
  const counts = {};
  const names = {};
  for (const h of history) {
    for (const i of h.issues) {
      counts[label(i.problem)] = (counts[label(i.problem)] || 0) + 1;
      names[label(i.problem)] = i.problem;
    }
  }
  const latestSet = new Set(latest.issues.map((i) => label(i.problem)));
  const recurring = [...latestSet].filter((p) => counts[p] >= 2).map((p) => names[p]);
  const fixed = Object.keys(counts).filter((p) => !latestSet.has(p)).map((p) => names[p]);
  const diff = latest.score - history[0].score;
  const trend = history.length < 2 ? "steady" : diff > 0 ? "improving" : diff < 0 ? "declining" : "steady";
  const top = latest.issues[0];
  const focusNextTime = top ? `${top.fix}` : "Great form last time. Keep the same focus and add a rep or two.";
  return { focusNextTime, recurring, fixed, trend };
}

export async function summarizeHistory(ex, history) {
  if (!keyReady() || !history.length) return localSummary(history);
  try {
    const raw = parseJson(await generate([{ text: summaryPrompt(ex, history) }]));
    const arr = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.trim()) : []);
    const trend = ["improving", "steady", "declining"].includes(raw.trend) ? raw.trend : "steady";
    const fallback = localSummary(history);
    return {
      focusNextTime: typeof raw.focusNextTime === "string" && raw.focusNextTime.trim() ? raw.focusNextTime.trim() : fallback.focusNextTime,
      recurring: arr(raw.recurring),
      fixed: arr(raw.fixed),
      trend,
    };
  } catch {
    return localSummary(history);
  }
}
