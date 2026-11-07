// MediaPipe Pose Landmarker (Google AI Edge): runs fully in the browser, nothing is uploaded.
// Gives 33 body landmarks per frame. Spotter uses them for:
//   - a live skeleton overlay
//   - a "full body in frame" check
//   - joint angles + rep counting per exercise (see `pose` in exercises.js)
//   - objective measurements that are passed to Gemini with the clip

const VERSION = "0.10.14";
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let lib = null;
let landmarker = null;
let loading = null;
let lastTs = 0;

/** Loads MediaPipe once (about 1-10 s the first time, cached after). Safe to call repeatedly. */
export function loadPose() {
  if (loading) return loading;
  loading = (async () => {
    lib = await import(`${CDN}/vision_bundle.mjs`);
    const fileset = await lib.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    const make = (delegate) =>
      lib.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    try {
      landmarker = await make("GPU");
    } catch {
      landmarker = await make("CPU");
    }
    return landmarker;
  })();
  loading.catch(() => (loading = null)); // allow a retry if the network failed
  return loading;
}

export const poseReady = () => !!landmarker;

/** Landmarks for the current frame of a <video>, or null. */
export function detect(video) {
  if (!landmarker || !video || video.readyState < 2 || !video.videoWidth) return null;
  const ts = Math.max(performance.now(), lastTs + 1); // timestamps must always increase
  lastTs = ts;
  try {
    return landmarker.detectForVideo(video, ts).landmarks?.[0] || null;
  } catch {
    return null;
  }
}

// ---- geometry -----------------------------------------------------------

const IDX = {
  L: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, foot: 31 },
  R: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, foot: 32 },
};

const vis = (p) => p?.visibility ?? 1;

function sideScore(lm, s) {
  const ids = Object.values(IDX[s]);
  return ids.reduce((t, i) => t + vis(lm[i]), 0) / ids.length;
}

/** The side of the body facing the camera. */
const bestSide = (lm) => (sideScore(lm, "L") >= sideScore(lm, "R") ? "L" : "R");

function angleAt(a, b, c) {
  const d = Math.atan2(a.y - b.y, a.x - b.x) - Math.atan2(c.y - b.y, c.x - b.x);
  let deg = Math.abs((d * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function sideAngle(lm, side, joints, w, h) {
  const [a, b, c] = joints.map((j) => {
    const p = lm[IDX[side][j]];
    return { x: p.x * w, y: p.y * h };
  });
  return { value: angleAt(a, b, c), anchor: lm[IDX[side][joints[1]]] };
}

/**
 * Angles for one frame. Returns { values: {key: degrees}, anchors: {key: landmark} }.
 * spec.both: "min" / "max" picks the lower/higher of the two body sides (for lunges, etc.);
 * otherwise the side facing the camera is used.
 */
export function computeMetrics(lm, ex, w, h) {
  const values = {};
  const anchors = {};
  if (!lm || !ex.pose) return { values, anchors };
  const side = bestSide(lm);
  for (const spec of ex.pose.metrics) {
    let r;
    if (spec.both) {
      const L = sideAngle(lm, "L", spec.joints, w, h);
      const R = sideAngle(lm, "R", spec.joints, w, h);
      r = (spec.both === "min" ? L.value <= R.value : L.value >= R.value) ? L : R;
    } else {
      r = sideAngle(lm, side, spec.joints, w, h);
    }
    values[spec.key] = Math.round(r.value);
    anchors[spec.key] = r.anchor;
  }
  return { values, anchors };
}

/** Is the whole body visible? Returns { ok, msg }. */
export function framing(lm) {
  if (!lm) return { ok: false, msg: "Step into the frame" };
  const s = IDX[bestSide(lm)];
  const need = [0, s.shoulder, s.hip, s.knee, s.ankle];
  const seen = need.every((i) => vis(lm[i]) > 0.25);
  const inside = need.every((i) => lm[i].x > 0.01 && lm[i].x < 0.99 && lm[i].y > 0.01 && lm[i].y < 0.99);
  if (lm[s.ankle].y > 0.98 || lm[s.foot].y > 0.99) return { ok: false, msg: "Move back: your feet are cut off" };
  if (lm[0].y < 0.01) return { ok: false, msg: "Move back: your head is cut off" };
  if (!seen || !inside) return { ok: false, msg: "Move back so your whole body is visible" };
  return { ok: true, msg: "Full body in frame" };
}

// ---- reps & session stats -----------------------------------------------

/** Counts a rep each time the metric enters the "work" zone and returns to "rest". */
class RepCounter {
  constructor(rep) {
    this.rep = rep;
    this.reps = 0;
    this.inWork = false;
    this.extreme = null;
    this.extremes = [];
  }

  update(values) {
    const r = this.rep;
    if (!r) return;
    const v = values[r.metric];
    if (v == null) return;
    const below = r.work === "<";
    const isWork = below ? v < r.workAt : v > r.workAt;
    const isRest = below ? v > r.restAt : v < r.restAt;
    if (!this.inWork && isWork) {
      this.inWork = true;
      this.extreme = v;
    }
    if (this.inWork) {
      this.extreme = below ? Math.min(this.extreme, v) : Math.max(this.extreme, v);
      if (isRest) {
        this.inWork = false;
        this.reps += 1;
        this.extremes.push(this.extreme);
      }
    }
  }
}

function meets(target, value) {
  if (!target || value == null) return null;
  return target.op === "<=" ? value <= target.value : value >= target.value;
}

/** Collects angles across a whole set (live recording or an uploaded clip). */
export class PoseTracker {
  constructor(ex) {
    this.ex = ex;
    this.reset();
  }

  reset() {
    this.frames = 0;
    this.good = 0;
    this.stats = {};
    this.counter = new RepCounter(this.ex.pose?.rep);
  }

  /** Feed one frame. Returns the frame's { values, anchors, frame } (frame = framing result). */
  add(lm, w, h) {
    this.frames += 1;
    const frame = framing(lm);
    if (!frame.ok || !this.ex.pose) return { values: {}, anchors: {}, frame };
    this.good += 1;
    const m = computeMetrics(lm, this.ex, w, h);
    for (const [key, v] of Object.entries(m.values)) (this.stats[key] ||= []).push(v);
    this.counter.update(m.values);
    return { ...m, frame };
  }

  get reps() {
    return this.counter.reps;
  }

  /** Plain, JSON-safe summary that is saved with the session and sent to Gemini. */
  summary() {
    if (!this.ex.pose || !this.frames) return null;
    // 5th/95th percentiles instead of raw min/max, so a single glitchy frame can't skew results.
    const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))];
    const metrics = this.ex.pose.metrics
      .filter((spec) => this.stats[spec.key]?.length)
      .map((spec) => {
        const arr = [...this.stats[spec.key]].sort((a, b) => a - b);
        const vals = { min: pct(arr, 5), max: pct(arr, 95), avg: Math.round(arr.reduce((t, v) => t + v, 0) / arr.length) };
        const t = spec.target;
        return {
          key: spec.key,
          label: spec.label,
          joints: spec.joints.join("-"),
          ...vals,
          target: t ? { stat: t.stat, op: t.op, value: t.value, text: t.text } : null,
          met: t ? meets(t, vals[t.stat]) : null,
        };
      });
    return {
      source: "MediaPipe Pose",
      detectedPct: Math.round((this.good / this.frames) * 100),
      reps: this.ex.hold || !this.ex.pose.rep ? null : this.counter.reps,
      repExtremes: this.counter.extremes,
      repMetric: this.ex.pose.rep ? this.ex.pose.metrics.find((m) => m.key === this.ex.pose.rep.metric)?.label : null,
      metrics,
    };
  }
}

/** Plain-language description of a summary, added to the Gemini prompt. */
export function describeMeasurements(m) {
  if (!m) return "";
  const lines = [`- Full body tracked in ${m.detectedPct}% of frames.`];
  if (m.reps != null) {
    const per = m.repExtremes?.length ? ` (${m.repMetric?.toLowerCase()} at each rep's deepest point: ${m.repExtremes.map((v) => `${v}°`).join(", ")})` : "";
    lines.push(`- Reps counted: ${m.reps}${per}.`);
  }
  for (const x of m.metrics) {
    lines.push(
      `- ${x.label} (${x.joints}): lowest ${x.min}°, highest ${x.max}°, average ${x.avg}°.` +
        (x.target ? ` Reference: ${x.target.text}. ${x.met ? "Met." : "Not met."}` : "")
    );
  }
  return lines.join("\n");
}

/**
 * Analyzes a video file frame by frame (for uploaded clips). Calls onProgress(0-1),
 * and onFrame(seconds, video, landmarks) for each analyzed frame (used for snapshots).
 */
export async function analyzeVideoUrl(url, ex, onProgress = () => {}, onFrame = null) {
  await loadPose();
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  await new Promise((resolve, reject) => {
    v.onloadeddata = resolve;
    v.onerror = () => reject(new Error("Couldn't read the video for pose tracking."));
  });
  if (!Number.isFinite(v.duration) || v.duration <= 0) return null;
  const tracker = new PoseTracker(ex);
  const step = 1 / 8; // 8 frames per second is plenty for angles and reps
  for (let t = 0; t < v.duration; t += step) {
    v.currentTime = t;
    await new Promise((r) => (v.onseeked = r));
    const lm = detect(v);
    tracker.add(lm, v.videoWidth, v.videoHeight);
    if (onFrame) onFrame(t, v, lm);
    onProgress(Math.min(1, t / v.duration));
  }
  onProgress(1);
  v.removeAttribute("src");
  v.load();
  return tracker.summary();
}

// ---- snapshots ----------------------------------------------------------

/**
 * JPEG data URL of the current video frame with the skeleton and angle labels drawn on it.
 * Used for the "What to fix" snapshots. Kept in memory only; never saved.
 */
export function snapshot(video, ex, lm, width = 480) {
  if (!video?.videoWidth) return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((width * video.videoHeight) / video.videoWidth);
  const ctx = c.getContext("2d");
  ctx.drawImage(video, 0, 0, c.width, c.height);
  if (lm) {
    const frame = framing(lm);
    const m = computeMetrics(lm, ex, video.videoWidth, video.videoHeight);
    const labels = {};
    for (const spec of ex.pose?.metrics || []) labels[spec.key] = { value: m.values[spec.key], anchor: m.anchors[spec.key] };
    drawPose(c, video, lm, { fit: "contain", fixed: true, clear: false, labels, ok: frame.ok });
  }
  try {
    return c.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}

// ---- drawing ------------------------------------------------------------

/**
 * Draws the skeleton over a video. fit = "cover" | "contain" (match the video's CSS object-fit).
 * mirror = true when the video is shown mirrored (webcam preview).
 * labels = { key: { value, anchor } } to draw angle readouts next to joints.
 */
export function drawPose(canvas, video, lm, { fit = "cover", mirror = false, labels = {}, ok = true, fixed = false, clear = true } = {}) {
  // fixed = draw into an off-screen canvas at its own pixel size (used for snapshots).
  const dpr = fixed ? 1 : window.devicePixelRatio || 1;
  const W = fixed ? canvas.width : canvas.clientWidth;
  const H = fixed ? canvas.height : canvas.clientHeight;
  if (!fixed && (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr))) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (clear) ctx.clearRect(0, 0, W, H);
  if (!lm || !video?.videoWidth || !lib) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const s = fit === "cover" ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
  const ox = (W - vw * s) / 2;
  const oy = (H - vh * s) / 2;
  const P = (p) => {
    const x = ox + p.x * vw * s;
    return { x: mirror ? W - x : x, y: oy + p.y * vh * s };
  };

  const line = ok ? "rgba(255,255,255,0.9)" : "rgba(255,190,80,0.9)";
  ctx.lineCap = "round";
  for (const { start, end } of lib.PoseLandmarker.POSE_CONNECTIONS) {
    if (start < 11 || end < 11) continue; // skip the face mesh lines
    if (vis(lm[start]) < 0.2 || vis(lm[end]) < 0.2) continue;
    const a = P(lm[start]);
    const b = P(lm[end]);
    ctx.strokeStyle = "rgba(80,0,0,0.55)";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = line;
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let i = 11; i < lm.length; i++) {
    if (vis(lm[i]) < 0.2) continue;
    const p = P(lm[i]);
    ctx.fillStyle = "#500000";
    ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }

  ctx.font = "700 15px Inter, system-ui, sans-serif";
  for (const { value, anchor, label } of Object.values(labels)) {
    if (!anchor || value == null) continue;
    const p = P(anchor);
    const text = `${label ? `${label} ` : ""}${value}°`;
    const tw = ctx.measureText(text).width;
    const bx = p.x + 12;
    const by = p.y - 12;
    ctx.fillStyle = "rgba(20,5,5,0.78)";
    ctx.beginPath(); ctx.roundRect(bx - 6, by - 15, tw + 12, 22, 8); ctx.fill();
    ctx.fillStyle = "#ffd88a";
    ctx.fillText(text, bx, by + 1);
    ctx.fillStyle = "#ffd88a";
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
  }
}
