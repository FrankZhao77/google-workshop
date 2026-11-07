// Spotter: screens, routing, and the session flow.
// Routes: #login #home #pick #session #summary/{id} #history #history/{id}

import * as store from "./store.js";
import { EXERCISES, getExercise } from "./exercises.js";
import { Recorder, countdown, beep } from "./recorder.js";
import * as ai from "./gemini.js";

const RECORD_SECONDS = 15;
const COUNTDOWN_SECONDS = 5;

const app = document.getElementById("app");
const recorder = new Recorder();

/** The session in progress (in memory only; clips are never written to storage). */
let session = null;
/** Exercises chosen on the picker. */
let picked = new Set();

// ---- helpers ------------------------------------------------------------

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel) => app.querySelector(sel);
const $$ = (sel) => [...app.querySelectorAll(sel)];
const scoreClass = (s) => (s >= 8 ? "good" : s >= 5 ? "mid" : "low");
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const trendLabel = { improving: "↗ Improving", steady: "→ Steady", declining: "↘ Needs focus" };

function go(hash) {
  if (location.hash === `#${hash}`) route();
  else location.hash = hash;
}

function on(sel, event, fn) {
  const el = typeof sel === "string" ? $(sel) : sel;
  if (el) el.addEventListener(event, fn);
}

function header(user) {
  if (!user) {
    return `<header class="topbar"><span class="brand"><span class="brand-mark">S</span> Spotter</span></header>`;
  }
  return `<header class="topbar">
    <a class="brand" href="#home"><span class="brand-mark">S</span> Spotter</a>
    <nav>
      <a href="#home">Home</a>
      <a href="#history">History</a>
      <span class="user-chip">${esc(user.name)}</span>
      <button class="link" data-action="logout">Log out</button>
    </nav>
  </header>`;
}

function render(user, html) {
  app.innerHTML = `${header(user)}<main>${html}</main>`;
  on("[data-action=logout]", "click", () => {
    store.setCurrentUser(null);
    go("login");
  });
  wireReferenceVideos();
  window.scrollTo(0, 0);
}

/** A reference video that turns into a placeholder if the Flow clip isn't in /videos/ yet. */
function refVideo(src, { thumb = false } = {}) {
  const attrs = thumb
    ? `src="${esc(src)}#t=0.8" muted playsinline preload="metadata"`
    : `src="${esc(src)}" muted playsinline autoplay loop controls preload="auto"`;
  return `<video data-ref ${attrs}></video>
    <div class="video-missing" hidden><div>Reference video coming soon<br /><code>${esc(src)}</code></div></div>`;
}

function wireReferenceVideos(root = app) {
  root.querySelectorAll("video[data-ref]").forEach((v) => {
    const showMissing = () => {
      v.hidden = true;
      if (v.nextElementSibling) v.nextElementSibling.hidden = false;
    };
    v.addEventListener("error", showMissing);
    if (v.error) showMissing();
  });
}

function modal(inner) {
  const el = document.createElement("div");
  el.className = "modal-backdrop";
  el.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${inner}</div>`;
  document.body.appendChild(el);
  const close = () => {
    el.querySelectorAll("video").forEach((v) => v.pause());
    el.remove();
  };
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-close]")) close();
  });
  wireReferenceVideos(el);
  return { el, close };
}

function demoBanner() {
  return ai.keyReady()
    ? ""
    : `<p class="banner small"><strong>Demo mode:</strong> no Gemini API key in <code>js/config.js</code>, so Spotter shows sample feedback.</p>`;
}

// ---- router -------------------------------------------------------------

function route() {
  const [name = "", param] = location.hash.slice(1).split("/");
  const user = store.getCurrentUser();
  if (name !== "session") discardSession();
  if (!user) return name === "login" ? viewLogin() : go("login");

  switch (name) {
    case "login": return viewLogin();
    case "pick": return viewPick(user);
    case "session": return session ? viewSession(user) : go("home");
    case "summary": return viewSummary(user, param);
    case "history": return param ? viewSessionDetail(user, param) : viewHistory(user);
    default: return viewHome(user);
  }
}

// ---- login (A1, A3) -----------------------------------------------------

function viewLogin() {
  render(null, `
    <section class="card narrow center">
      <h1>Your AI spotter at the Rec</h1>
      <p class="muted">Record a 15-second set on your laptop and get instant, specific feedback on your form.</p>
      <label class="field">Demo account
        <select id="user">${store.USERS.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select>
      </label>
      <button class="btn primary big" id="login" style="width:100%">Log in</button>
      <p class="hint">Alex has a few past sessions. Jordan is a brand-new user.</p>
    </section>`);
  on("#login", "click", () => {
    store.setCurrentUser($("#user").value);
    go("home");
  });
}

// ---- home (B1, B2) ------------------------------------------------------

function viewHome(user) {
  const count = store.getSessions(user.id).length;
  const latest = store.getLatestFocus(user.id);
  render(user, `
    <section class="hero">
      <span class="eyebrow">Spotter</span>
      <h1>Welcome back, ${esc(user.name)}</h1>
      <p class="muted">${count ? `${count} session${count === 1 ? "" : "s"} completed. Keep it up.` : "Ready for your first session? It takes about 5 minutes."}</p>
      ${latest ? `<div class="tip"><span class="tip-label">Focus for next time · ${esc(getExercise(latest.exerciseId)?.name || "")}</span><p>${esc(latest.focusNextTime)}</p></div>` : ""}
      <div class="actions">
        <button class="btn primary big" id="start">Start Session</button>
        <a class="btn big" href="#history">View History</a>
      </div>
      ${demoBanner()}
    </section>`);
  on("#start", "click", () => {
    if (store.hasAcceptedDisclaimer(user.id)) {
      picked = new Set();
      go("pick");
    } else {
      showDisclaimer(user);
    }
  });
}

// ---- disclaimer (H1) ----------------------------------------------------

function showDisclaimer(user) {
  const m = modal(`
    <h2>Before you start</h2>
    <p>Spotter gives general form tips from AI. <strong>It is not medical advice</strong> and can make mistakes.</p>
    <ul>
      <li>Stop right away if you feel pain, dizziness, or discomfort.</li>
      <li>Warm up first and work at your own level.</li>
      <li>If you have an injury or health condition, check with a professional first.</li>
    </ul>
    <p class="muted small">🔒 Your videos are only used for analysis and are discarded when the session ends. Only the text feedback is saved.</p>
    <div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="agree">I understand</button></div>`);
  m.el.querySelector("#agree").addEventListener("click", () => {
    store.acceptDisclaimer(user.id);
    m.close();
    picked = new Set();
    go("pick");
  });
}

// ---- exercise picker (B3, B4) -------------------------------------------

function viewPick(user) {
  render(user, `
    <section>
      <span class="eyebrow">New session</span>
      <h1>Pick today's exercises</h1>
      <p class="muted">Choose one or more. You'll record a 15-second set of each.</p>
      <div class="grid">
        ${EXERCISES.map((ex) => `
          <article class="ex-card ${picked.has(ex.id) ? "selected" : ""}" data-id="${ex.id}" tabindex="0" role="button" aria-pressed="${picked.has(ex.id)}">
            <div class="thumb">${refVideo(ex.video, { thumb: true })}</div>
            <div class="ex-body">
              <h3>${esc(ex.name)}</h3>
              <p class="muted small" style="margin:0">${esc(ex.blurb)}</p>
              <div class="row">
                <button class="btn small" data-preview="${ex.id}">▶ Preview</button>
                <span class="check">${picked.has(ex.id) ? "✓ Selected" : "Tap to select"}</span>
              </div>
            </div>
          </article>`).join("")}
      </div>
      <div class="sticky-actions">
        <span><strong>${picked.size}</strong> selected</span>
        <button class="btn primary big" id="go" ${picked.size ? "" : "disabled"}>Start session →</button>
      </div>
    </section>`);

  $$(".ex-card").forEach((card) => {
    const toggle = () => {
      const id = card.dataset.id;
      picked.has(id) ? picked.delete(id) : picked.add(id);
      viewPick(user);
    };
    card.addEventListener("click", (e) => {
      const previewBtn = e.target.closest("[data-preview]");
      if (previewBtn) {
        e.stopPropagation();
        showPreview(getExercise(previewBtn.dataset.preview));
      } else {
        toggle();
      }
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  on("#go", "click", () => startSession(EXERCISES.filter((ex) => picked.has(ex.id)).map((ex) => ex.id)));
}

function showPreview(ex) {
  modal(`
    <h2>${esc(ex.name)}</h2>
    <div class="video-box">${refVideo(ex.video)}</div>
    <div class="cues">${ex.cues.map((c) => `<span class="cue">${esc(c)}</span>`).join("")}</div>
    <div class="actions"><button class="btn primary" data-close>Close</button></div>`);
}

// ---- session flow (C1-C6, D1-D5, E1-E2, F1-F4) ---------------------------

function startSession(ids) {
  session = { ids, index: 0, results: [], phase: "setup", clip: null, analysis: null, message: null, urls: [] };
  go("session");
}

function discardSession() {
  if (!session) return;
  recorder.close();
  session.urls.forEach((u) => URL.revokeObjectURL(u)); // H2: clips never leave memory
  session = null;
}

function setClip(blob) {
  const url = URL.createObjectURL(blob);
  session.urls.push(url);
  session.clip = { blob, url };
}

function setPhase(user, phase, extra = {}) {
  Object.assign(session, { phase }, extra);
  viewSession(user);
}

function progressBar() {
  return `<div class="progress">${session.ids
    .map((_, i) => `<span class="${i < session.index ? "done" : i === session.index ? "current" : ""}"></span>`)
    .join("")}</div>`;
}

function viewSession(user) {
  if (session.phase === "finishing") {
    return render(user, `<div class="center-block"><div class="spinner"></div><h2>Saving your session…</h2><p class="muted">Updating your coach notes for next time.</p></div>`);
  }
  const ex = getExercise(session.ids[session.index]);
  const head = `
    <div class="session-head">
      <div>
        <span class="eyebrow">Exercise ${session.index + 1} of ${session.ids.length}</span>
        <h1>${esc(ex.name)}</h1>
        ${progressBar()}
      </div>
    </div>`;

  const body = {
    setup: () => setupView(ex),
    review: () => reviewView(),
    analyzing: () => `<div class="center-block"><div class="spinner"></div><h2>Spotter is reviewing your set…</h2><p class="muted">This usually takes 10–30 seconds.</p></div>`,
    invisible: () => noticeView("📷", "Spotter couldn't see you clearly", session.message, true),
    error: () => noticeView("⚠️", "Something went wrong", session.message, false),
    feedback: () => feedbackView(ex, session.analysis),
  }[session.phase]();

  render(user, `<section class="session">${head}${body}</section>`);
  wireSession(user, ex);
}

function setupView(ex) {
  return `
    <div class="stage-wrap">
      <div class="stage ${ex.orientation}">
        <video id="live" class="mirror" autoplay muted playsinline></video>
        <div class="outline"><span>Fit your whole body inside</span></div>
        <div class="overlay" id="overlay" hidden></div>
        <div class="rec" id="rec" hidden><span class="dot"></span> REC <span id="rec-time">${RECORD_SECONDS}</span>s</div>
        <div class="cam-error" id="cam-error" hidden></div>
      </div>
      <aside class="side">
        <h3>Set up your camera</h3>
        <ul>${ex.setupTips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <p class="muted small">${ex.hold ? "Hold the plank for the full 15 seconds." : "Do slow, controlled reps for the full 15 seconds."} Recording starts after a ${COUNTDOWN_SECONDS}-second countdown and stops on its own.</p>
        <div class="stack">
          <button class="btn primary big" id="record" disabled>● Start</button>
          <label class="btn file-btn">⬆ Upload a video instead<input type="file" id="upload" accept="video/*" /></label>
          <button class="btn ghost" id="skip">Skip this exercise</button>
        </div>
      </aside>
    </div>`;
}

function reviewView() {
  return `
    <div class="stage-wrap">
      <div class="stage"><video class="contain" src="${session.clip.url}" controls autoplay muted loop playsinline></video></div>
      <aside class="side">
        <h3>Check your clip</h3>
        <p class="muted">Is your whole body visible from head to feet? If not, re-record before analyzing.</p>
        <div class="stack">
          <button class="btn primary big" id="analyze">Analyze my form</button>
          <button class="btn" id="rerecord">↺ Re-record</button>
          <button class="btn ghost" id="skip">Skip this exercise</button>
        </div>
        ${demoBanner()}
      </aside>
    </div>`;
}

function noticeView(icon, title, message, visibility) {
  return `
    <div class="panel notice">
      <div class="big-icon">${icon}</div>
      <h2>${esc(title)}</h2>
      <p>${esc(message)}</p>
      <div class="actions" style="justify-content:center">
        ${visibility ? "" : `<button class="btn primary" id="retry">Try again</button>`}
        <button class="btn ${visibility ? "primary" : ""}" id="rerecord">↺ Re-record</button>
        ${visibility ? "" : `<button class="btn" id="use-sample">Use sample feedback</button>`}
        <button class="btn ghost" id="skip">Skip this exercise</button>
      </div>
    </div>`;
}

function feedbackBody(a, ex) {
  const reps = a.repsObserved != null ? `${a.repsObserved} reps observed` : ex.hold ? "Plank hold" : "";
  return `
    <div class="panel">
      <div class="score-row">
        <div class="score ${scoreClass(a.score)}"><span>${a.score}</span><small>/10</small></div>
        <div>
          <h2>Form score</h2>
          <p class="muted" style="margin:0">${esc(reps)} ${a.mode === "sample" ? `<span class="tag">sample feedback</span>` : ""}</p>
        </div>
      </div>
    </div>
    ${a.good.length ? `<div class="panel"><h3>What you did well</h3><ul class="good-list">${a.good.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>` : ""}
    <div class="panel">
      <h3>What to fix</h3>
      ${a.issues.length
        ? a.issues.map((i, n) => `
          <div class="issue">
            <span class="issue-n">${n + 1}</span>
            <div>
              <p><strong>${esc(i.problem)}</strong>${i.timestamp ? ` <span class="ts">at ${esc(i.timestamp)}</span>` : ""}</p>
              <p class="fix">Fix: ${esc(i.fix)}</p>
            </div>
          </div>`).join("")
        : `<p style="margin:0">No major issues spotted. Great set!</p>`}
    </div>`;
}

function feedbackView(ex, a) {
  const cues = a.cues.length ? a.cues : ex.cues;
  const last = session.index === session.ids.length - 1;
  return `
    <div class="feedback">
      <div>${feedbackBody(a, ex)}</div>
      <aside class="panel">
        <h3>Correct form</h3>
        <div class="video-box">${refVideo(ex.video)}</div>
        <div class="cues">${cues.map((c) => `<span class="cue">${esc(c)}</span>`).join("")}</div>
      </aside>
    </div>
    <div class="actions end">
      <button class="btn" id="rerecord">↺ Try this exercise again</button>
      <button class="btn primary big" id="next">${last ? "Finish session ✓" : "Next exercise →"}</button>
    </div>`;
}

function wireSession(user, ex) {
  const s = session;
  const stillHere = (phase) => session === s && session.phase === phase;

  on("#skip", "click", () => advance(user, { exerciseId: ex.id, status: "skipped" }));
  on("#rerecord", "click", () => setPhase(user, "setup", { clip: null, analysis: null, message: null }));

  if (s.phase === "setup") {
    const live = $("#live");
    const recordBtn = $("#record");
    recorder
      .open()
      .then(() => {
        if (!stillHere("setup")) return;
        recorder.attach(live);
        recordBtn.disabled = false;
      })
      .catch((err) => {
        if (!stillHere("setup")) return;
        const box = $("#cam-error");
        box.hidden = false;
        const denied = err?.name === "NotAllowedError";
        box.innerHTML = `<div><h3>Camera unavailable</h3><p>${esc(denied ? "Camera permission was blocked. Allow camera access in the address bar, then reload." : err?.message || "No camera found.")}</p><p class="small">You can still upload a video instead.</p></div>`;
      });

    on(recordBtn, "click", async () => {
      $$(".side button, .side .file-btn").forEach((b) => (b.disabled = true, b.style.pointerEvents = "none"));
      const overlay = $("#overlay");
      overlay.hidden = false;
      await countdown(COUNTDOWN_SECONDS, (n) => {
        overlay.textContent = n;
        beep(660, 120);
      });
      if (!stillHere("setup")) return;
      overlay.hidden = true;
      $("#rec").hidden = false;
      beep(990, 350);
      try {
        const blob = await recorder.record(RECORD_SECONDS, (left) => {
          const t = $("#rec-time");
          if (t) t.textContent = Math.max(0, left);
        });
        if (!stillHere("setup")) return;
        beep(990, 350);
        if (!blob.size) throw new Error("the clip came out empty. Make sure the camera preview is showing, then try again.");
        setClip(blob);
        setPhase(user, "review");
      } catch (err) {
        if (stillHere("setup")) setPhase(user, "error", { message: `Recording failed: ${err.message}` });
      }
    });

    on("#upload", "change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) return alert("Please choose a video file.");
      if (file.size > ai.MAX_CLIP_BYTES) return alert("That video is too large (max about 14 MB). Trim it to 15 seconds and try again.");
      setClip(file);
      setPhase(user, "review");
    });
  }

  const analyze = async () => {
    setPhase(user, "analyzing");
    try {
      const result = await ai.analyzeClip(s.clip.blob, ex);
      if (session !== s) return;
      if (!result.visible) setPhase(user, "invisible", { message: result.visibilityIssue });
      else setPhase(user, "feedback", { analysis: result });
    } catch (err) {
      if (session === s) setPhase(user, "error", { message: err.message });
    }
  };
  on("#analyze", "click", analyze);
  on("#retry", "click", () => (s.clip ? analyze() : setPhase(user, "setup")));
  on("#use-sample", "click", () => setPhase(user, "feedback", { analysis: ai.sampleAnalysis(ex) }));

  on("#next", "click", () => {
    const a = s.analysis;
    advance(user, {
      exerciseId: ex.id,
      status: "done",
      score: a.score,
      repsObserved: a.repsObserved,
      good: a.good,
      issues: a.issues,
      cues: a.cues.length ? a.cues : ex.cues,
      mode: a.mode,
    });
  });
}

function advance(user, result) {
  session.results.push(result);
  session.index += 1;
  Object.assign(session, { clip: null, analysis: null, message: null, phase: "setup" });
  if (session.index >= session.ids.length) finishSession(user);
  else viewSession(user);
}

async function finishSession(user) {
  recorder.close();
  session.phase = "finishing";
  viewSession(user);

  const record = { id: `s${Date.now()}`, userId: user.id, date: new Date().toISOString(), exercises: session.results };
  store.saveSession(user.id, record);

  // G3: refresh the "focus next time" summary for each exercise done today.
  const done = record.exercises.filter((r) => r.status === "done");
  await Promise.all(
    done.map(async (r) => {
      const ex = getExercise(r.exerciseId);
      const history = store.getExerciseHistory(user.id, r.exerciseId);
      const summary = await ai.summarizeHistory(ex, history).catch(() => ai.localSummary(history));
      store.setSummary(user.id, r.exerciseId, summary);
    })
  );

  discardSession();
  go(`summary/${record.id}`);
}

// ---- session summary (F3) -----------------------------------------------

function viewSummary(user, id) {
  const s = store.getSession(user.id, id);
  if (!s) return go("history");
  const sums = store.getSummaries(user.id);
  const doneCount = s.exercises.filter((e) => e.status === "done").length;
  render(user, `
    <section>
      <span class="eyebrow">Session complete · ${fmtDate(s.date)}</span>
      <h1>${doneCount ? `Nice work, ${esc(user.name)}!` : "Session ended"}</h1>
      <p class="muted">${doneCount} of ${s.exercises.length} exercise${s.exercises.length === 1 ? "" : "s"} completed.</p>
      <div class="list">
        ${s.exercises.map((r) => {
          const ex = getExercise(r.exerciseId);
          if (r.status !== "done") {
            return `<div class="sum-row"><span class="pill skip">–</span><div class="grow"><strong>${esc(ex?.name)}</strong><p class="muted">Skipped</p></div></div>`;
          }
          const tip = r.issues[0]?.fix || "Great form. Keep it up!";
          const focus = sums[r.exerciseId]?.focusNextTime;
          return `<div class="sum-row">
            <span class="pill ${scoreClass(r.score)}">${r.score}</span>
            <div class="grow">
              <strong>${esc(ex?.name)}</strong>
              <p>${esc(tip)}</p>
              ${focus && focus !== tip ? `<p class="muted small"><strong>Next time:</strong> ${esc(focus)}</p>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
      <p class="privacy">🔒 Your videos were discarded. Only the text feedback was saved.</p>
      <div class="actions"><a class="btn" href="#home">Home</a><a class="btn primary" href="#history">View History</a></div>
    </section>`);
}

// ---- history (G1-G3) ----------------------------------------------------

function viewHistory(user) {
  const sessions = store.getSessions(user.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const sums = store.getSummaries(user.id);
  const cards = EXERCISES.filter((ex) => sums[ex.id]?.focusNextTime).map((ex) => {
    const s = sums[ex.id];
    return `<article class="sum-card">
      <div class="row"><h3 style="margin:0">${esc(ex.name)}</h3><span class="trend ${esc(s.trend)}">${trendLabel[s.trend] || ""}</span></div>
      <p><span class="tip-label">Focus next time</span>${esc(s.focusNextTime)}</p>
      ${s.recurring?.length ? `<p class="small"><strong>Still working on:</strong> ${s.recurring.map(esc).join(", ")}</p>` : ""}
      ${s.fixed?.length ? `<p class="small" style="color:var(--good)"><strong>Fixed ✓</strong> ${s.fixed.map(esc).join(", ")}</p>` : ""}
    </article>`;
  });

  render(user, `
    <section>
      <span class="eyebrow">History</span>
      <h1>Your progress</h1>
      ${cards.length ? `<h2 style="margin-top:22px">Coach notes by exercise</h2><div class="cards">${cards.join("")}</div>` : ""}
      <h2>Past sessions</h2>
      ${sessions.length
        ? `<div class="list">${sessions.map((s) => `
            <a class="session-row" href="#history/${esc(s.id)}">
              <div><strong>${fmtDate(s.date)}</strong><div class="muted small">${s.exercises.map((e) => esc(getExercise(e.exerciseId)?.name)).join(" · ")}</div></div>
              <div class="scores">${s.exercises.map((e) => (e.status === "done" ? `<span class="pill ${scoreClass(e.score)}">${e.score}</span>` : `<span class="pill skip">–</span>`)).join("")}</div>
            </a>`).join("")}</div>`
        : `<div class="empty panel"><p>No sessions yet.</p><a class="btn primary" href="#home">Start your first session</a></div>`}
    </section>`);
}

function viewSessionDetail(user, id) {
  const s = store.getSession(user.id, id);
  if (!s) return go("history");
  render(user, `
    <section>
      <a href="#history" class="small">← Back to history</a>
      <span class="eyebrow" style="display:block;margin-top:12px">Session · ${fmtDate(s.date)}</span>
      <h1>Session details</h1>
      ${s.exercises.map((r) => {
        const ex = getExercise(r.exerciseId);
        if (r.status !== "done") return `<h2 style="margin-top:28px">${esc(ex?.name)} <span class="pill skip">Skipped</span></h2>`;
        return `<h2 style="margin-top:28px">${esc(ex?.name)}</h2>
          ${feedbackBody({ ...r, good: r.good || [], issues: r.issues || [] }, ex)}
          <div class="cues">${(r.cues || []).map((c) => `<span class="cue">${esc(c)}</span>`).join("")}</div>`;
      }).join("")}
    </section>`);
}

// ---- boot ---------------------------------------------------------------

async function boot() {
  store.ensureSeed();
  await ai.init();
  window.addEventListener("hashchange", route);
  window.spotter = { resetDemoData: () => (store.resetDemoData(), route()) }; // console helper for demo prep
  route();
}

boot();
