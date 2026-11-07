// Per-user data in localStorage. Keys: spotter:{userId}:sessions / :summaries / :disclaimer
// Only text feedback is ever stored here. Videos are never saved (H2).

export const USERS = [
  { id: "alex", name: "Alex" },
  { id: "jordan", name: "Jordan" },
];

const memory = {}; // fallback when localStorage is blocked (private mode, etc.)

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return key in memory ? memory[key] : fallback;
  }
}

function write(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* keep the in-memory copy */
  }
}

const k = (userId, name) => `spotter:${userId}:${name}`;

// ---- current user -------------------------------------------------------

export function getCurrentUser() {
  const id = read("spotter:currentUser", null);
  return USERS.find((u) => u.id === id) || null;
}

export function setCurrentUser(id) {
  write("spotter:currentUser", id);
}

// ---- sessions -----------------------------------------------------------

export function getSessions(userId) {
  return read(k(userId, "sessions"), []);
}

export function getSession(userId, sessionId) {
  return getSessions(userId).find((s) => s.id === sessionId) || null;
}

export function saveSession(userId, session) {
  write(k(userId, "sessions"), [...getSessions(userId), session]);
}

/** Every completed attempt of one exercise, oldest first. */
export function getExerciseHistory(userId, exerciseId) {
  return getSessions(userId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((s) =>
      s.exercises
        .filter((e) => e.exerciseId === exerciseId && e.status === "done")
        .map((e) => ({ date: s.date, score: e.score, issues: e.issues || [] }))
    );
}

// ---- per-exercise AI summaries (G3) -------------------------------------

export function getSummaries(userId) {
  return read(k(userId, "summaries"), {});
}

export function setSummary(userId, exerciseId, summary) {
  const all = getSummaries(userId);
  all[exerciseId] = { ...summary, updatedAt: new Date().toISOString() };
  write(k(userId, "summaries"), all);
}

export function getLatestFocus(userId) {
  const entries = Object.entries(getSummaries(userId));
  if (!entries.length) return null;
  entries.sort((a, b) => (b[1].updatedAt || "").localeCompare(a[1].updatedAt || ""));
  const [exerciseId, s] = entries[0];
  return s.focusNextTime ? { exerciseId, focusNextTime: s.focusNextTime } : null;
}

// ---- disclaimer (H1) ----------------------------------------------------

export function hasAcceptedDisclaimer(userId) {
  return read(k(userId, "disclaimer"), false) === true;
}

export function acceptDisclaimer(userId) {
  write(k(userId, "disclaimer"), true);
}

// ---- demo seed data (AT-54) ---------------------------------------------
// Alex gets a few past sessions with improving squat scores so History looks real.
// Jordan stays empty to show the new-user experience.

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(7, 30, 0, 0);
  return d.toISOString();
}

export function ensureSeed() {
  if (read("spotter:alex:seeded", false)) return;

  const sessions = [
    {
      id: "seed-1",
      userId: "alex",
      date: daysAgo(12),
      exercises: [
        {
          exerciseId: "squat", status: "done", score: 4, repsObserved: 6, mode: "seed",
          good: ["Kept a steady, controlled pace"],
          issues: [
            { problem: "Knees caving inward", fix: "Push your knees out so they track over your pinky toes.", timestamp: "0:04" },
            { problem: "Heels lifting off the floor", fix: "Sit your hips back and keep your weight in your heels.", timestamp: "0:08" },
            { problem: "Not reaching parallel depth", fix: "Lower until your thighs are parallel to the floor.", timestamp: "0:11" },
          ],
          cues: ["Knees out", "Heels down", "Sit back"],
        },
        {
          exerciseId: "pushup", status: "done", score: 5, repsObserved: 7, mode: "seed",
          good: ["Hands placed at a good width"],
          issues: [
            { problem: "Hips sagging", fix: "Squeeze your glutes and brace your core to keep a straight line.", timestamp: "0:06" },
            { problem: "Partial range of motion", fix: "Lower until your chest is a fist's height from the floor.", timestamp: "0:09" },
          ],
          cues: ["Straight line", "Chest to floor"],
        },
      ],
    },
    {
      id: "seed-2",
      userId: "alex",
      date: daysAgo(7),
      exercises: [
        {
          exerciseId: "squat", status: "done", score: 6, repsObserved: 7, mode: "seed",
          good: ["Knees tracked over the toes", "Chest stayed up"],
          issues: [
            { problem: "Heels lifting off the floor", fix: "Keep your whole foot planted; think 'sit back' not 'sit down'.", timestamp: "0:05" },
            { problem: "Not reaching parallel depth", fix: "Go a little lower each rep until your thighs are parallel.", timestamp: "0:10" },
          ],
          cues: ["Heels down", "Sit back"],
        },
        {
          exerciseId: "pushup", status: "done", score: 6, repsObserved: 8, mode: "seed",
          good: ["Full lockout at the top", "Hips stayed level"],
          issues: [
            { problem: "Elbows flaring out", fix: "Tuck your elbows to about 45 degrees from your body.", timestamp: "0:07" },
          ],
          cues: ["Elbows 45°"],
        },
        { exerciseId: "lunge", status: "skipped" },
      ],
    },
    {
      id: "seed-3",
      userId: "alex",
      date: daysAgo(3),
      exercises: [
        {
          exerciseId: "squat", status: "done", score: 7, repsObserved: 8, mode: "seed",
          good: ["Heels stayed down the whole set", "Knees tracked over the toes"],
          issues: [
            { problem: "Not reaching parallel depth", fix: "Pause briefly at the bottom to own the depth.", timestamp: "0:09" },
          ],
          cues: ["Sit deeper", "Chest up"],
        },
        {
          exerciseId: "plank", status: "done", score: 6, repsObserved: null, mode: "seed",
          good: ["Elbows directly under shoulders"],
          issues: [
            { problem: "Hips sagging late in the hold", fix: "Squeeze your glutes and pull your belly button in as you tire.", timestamp: "0:11" },
          ],
          cues: ["Hips level", "Squeeze glutes"],
        },
      ],
    },
  ];

  const summaries = {
    squat: {
      focusNextTime: "Depth is your last big fix. Pause for a second at the bottom of each squat so your thighs reach parallel.",
      recurring: ["Not reaching parallel depth"],
      fixed: ["Knees caving inward", "Heels lifting off the floor"],
      trend: "improving",
      updatedAt: daysAgo(3),
    },
    pushup: {
      focusNextTime: "Keep your elbows tucked to about 45 degrees. Your hips and range of motion already look much better.",
      recurring: [],
      fixed: ["Hips sagging", "Partial range of motion"],
      trend: "improving",
      updatedAt: daysAgo(7),
    },
    plank: {
      focusNextTime: "When the hold gets hard, squeeze your glutes to stop your hips from sagging.",
      recurring: [],
      fixed: [],
      trend: "steady",
      updatedAt: daysAgo(3),
    },
  };

  write(k("alex", "sessions"), sessions);
  write(k("alex", "summaries"), summaries);
  write("spotter:alex:seeded", true);
}

/** Wipes all Spotter data and re-seeds. Handy before recording the demo video. */
export function resetDemoData() {
  for (const u of USERS) {
    for (const name of ["sessions", "summaries", "disclaimer", "seeded"]) {
      try { localStorage.removeItem(k(u.id, name)); } catch { /* ignore */ }
      delete memory[k(u.id, name)];
    }
  }
  ensureSeed();
}
