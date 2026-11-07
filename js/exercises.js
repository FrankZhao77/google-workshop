// The preset exercises. Reference videos come from Google Flow and live in /videos/{id}.mp4.
// Each exercise: category + equipment (for picker filters), orientation (camera outline),
// hold (true = timed hold, no reps), checkpoints (fed into the Gemini prompt), cues,
// and `sample` (used for demo-mode feedback when there's no API key).

const STANDING_SETUP = [
  "Put your laptop on a bench or chair at about waist height.",
  "Stand 6-8 ft away so your whole body fits in the frame.",
  "Turn sideways: Spotter needs a side view.",
  "Make sure the room is bright and wear fitted clothes.",
];

const FLOOR_SETUP = [
  "Put your laptop on the floor or a low step.",
  "Position yourself 6-8 ft away, side view, head to heels in frame.",
  "Make sure the room is bright and wear fitted clothes.",
];

const BENCH_SETUP = [
  "Place the bench or box sideways to the camera.",
  "Put your laptop 6-8 ft away so you and the bench are fully in frame.",
  "Make sure the bench is stable and won't slide.",
  "Make sure the room is bright and wear fitted clothes.",
];

const DUMBBELL_SETUP = [
  ...STANDING_SETUP,
  "Use a light dumbbell you can control for the full 15 seconds.",
];

export const CATEGORIES = ["Lower body", "Upper body", "Core"];

export const EXERCISES = [
  // ---- Lower body --------------------------------------------------------
  {
    id: "squat",
    name: "Bodyweight Squat",
    blurb: "The foundation of lower-body strength.",
    category: "Lower body",
    equipment: "None",
    orientation: "standing",
    hold: false,
    setupTips: STANDING_SETUP,
    checkpoints:
      "squat depth (thighs at least parallel to the floor), knees caving inward, heels lifting off the floor, chest falling forward, rounded lower back",
    cues: ["Chest up", "Knees out", "Sit back"],
    video: "videos/squat.mp4",
  },
  {
    id: "lunge",
    name: "Forward Lunge",
    blurb: "Single-leg strength and balance.",
    category: "Lower body",
    equipment: "None",
    orientation: "standing",
    hold: false,
    setupTips: STANDING_SETUP,
    checkpoints:
      "front knee traveling past the toes or caving inward, torso leaning forward, step too short, back knee slamming into the floor",
    cues: ["Tall torso", "Knee over ankle", "Drop straight down"],
    video: "videos/lunge.mp4",
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    blurb: "A knee-friendly lunge that builds balance.",
    category: "Lower body",
    equipment: "None",
    orientation: "standing",
    hold: false,
    setupTips: STANDING_SETUP,
    checkpoints:
      "front knee caving inward or drifting past the toes, torso leaning forward, stepping back too short, back knee slamming into the floor, losing balance",
    cues: ["Step back long", "Tall torso", "Soft knee touch"],
    sample: {
      good: "Front knee stayed stacked over the ankle",
      problem: "Stepping back too short",
      fix: "Take a longer step back so both knees can bend to about 90 degrees.",
    },
    video: "videos/reverse-lunge.mp4",
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    blurb: "A squat holding one dumbbell at your chest.",
    category: "Lower body",
    equipment: "Dumbbell",
    orientation: "standing",
    hold: false,
    setupTips: DUMBBELL_SETUP,
    checkpoints:
      "not reaching parallel depth, knees caving inward, heels lifting, chest dropping so the dumbbell pulls the torso forward, rounding the lower back",
    cues: ["Elbows inside knees", "Chest proud", "Sit between heels"],
    sample: {
      good: "Dumbbell stayed tight to the chest",
      problem: "Chest dropping at the bottom",
      fix: "Keep your chest proud and your elbows pointing down as you sit between your heels.",
    },
    video: "videos/goblet-squat.mp4",
  },
  {
    id: "rdl",
    name: "Dumbbell Romanian Deadlift",
    blurb: "A hip hinge for hamstrings, glutes, and back.",
    category: "Lower body",
    equipment: "Dumbbell",
    orientation: "standing",
    hold: false,
    setupTips: DUMBBELL_SETUP,
    checkpoints:
      "rounding the back, bending the knees too much so it turns into a squat, dumbbells drifting away from the legs, not pushing the hips back, over-arching the lower back at the top, cranking the neck to look up",
    cues: ["Hips back", "Flat back", "Weights close"],
    sample: {
      good: "Slow, controlled lowering",
      problem: "Rounding the upper back",
      fix: "Pull your shoulders back and keep your back flat; only lower as far as you can without rounding.",
    },
    video: "videos/rdl.mp4",
  },
  {
    id: "step-up",
    name: "Step-up",
    blurb: "Single-leg strength using a bench or box.",
    category: "Lower body",
    equipment: "Bench",
    orientation: "standing",
    hold: false,
    setupTips: BENCH_SETUP,
    checkpoints:
      "pushing off the back foot instead of driving through the front heel, front knee caving inward, torso leaning far forward, not standing fully tall at the top, dropping down without control",
    cues: ["Drive through heel", "Stand tall", "Control down"],
    sample: {
      good: "Stood fully tall at the top",
      problem: "Pushing off the back foot",
      fix: "Keep your back toes light and drive up through the heel on the bench.",
    },
    video: "videos/step-up.mp4",
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    blurb: "Glutes and hamstrings, easy on the back.",
    category: "Lower body",
    equipment: "None",
    orientation: "floor",
    hold: false,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "hips not rising high enough (shoulders to knees should form a straight line), arching the lower back at the top instead of squeezing the glutes, feet too far from or too close to the hips, knees caving in or flaring out, heels lifting",
    cues: ["Squeeze glutes", "Ribs down", "Push through heels"],
    sample: {
      good: "Steady, even tempo",
      problem: "Arching the lower back at the top",
      fix: "Stop when your body makes a straight line and squeeze your glutes instead of pushing higher.",
    },
    video: "videos/glute-bridge.mp4",
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    blurb: "An isometric hold that builds leg endurance.",
    category: "Lower body",
    equipment: "Wall",
    orientation: "standing",
    hold: true,
    setupTips: [
      "Use a wall that runs sideways to the camera.",
      "Put your laptop 6-8 ft away so your whole body fits in the frame.",
      "Make sure the room is bright and wear fitted clothes.",
    ],
    checkpoints:
      "thighs not parallel to the floor, knees traveling past the toes, back and head not flat against the wall, heels lifting, sliding up or breaking the hold early",
    cues: ["Thighs parallel", "Back flat", "Knees over ankles"],
    sample: {
      good: "Back stayed flat against the wall",
      problem: "Sliding up above parallel near the end",
      fix: "Keep your thighs parallel to the floor; if it's too hard, hold a little higher for the whole set instead.",
    },
    video: "videos/wall-sit.mp4",
  },

  // ---- Upper body --------------------------------------------------------
  {
    id: "pushup",
    name: "Push-up",
    blurb: "Chest, shoulders, triceps, and core.",
    category: "Upper body",
    equipment: "None",
    orientation: "floor",
    hold: false,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "hips sagging or piked up (body not in a straight line), elbows flared out to 90 degrees, partial range of motion, head dropping",
    cues: ["Straight line", "Elbows 45°", "Chest to floor"],
    video: "videos/pushup.mp4",
  },
  {
    id: "incline-pushup",
    name: "Incline Push-up",
    blurb: "A beginner-friendly push-up with hands on a bench.",
    category: "Upper body",
    equipment: "Bench",
    orientation: "floor",
    hold: false,
    setupTips: BENCH_SETUP,
    checkpoints:
      "hips sagging or piked up, elbows flaring out to 90 degrees, chest not reaching the bench edge, head dropping, hands too far forward of the shoulders",
    cues: ["Straight line", "Chest to bench", "Elbows 45°"],
    sample: {
      good: "Body stayed in a straight line",
      problem: "Stopping short of the bench",
      fix: "Lower until your chest is about a fist's height from the bench edge.",
    },
    video: "videos/incline-pushup.mp4",
  },
  {
    id: "bench-dip",
    name: "Bench Dip",
    blurb: "Triceps and shoulders using a bench.",
    category: "Upper body",
    equipment: "Bench",
    orientation: "floor",
    hold: false,
    setupTips: BENCH_SETUP,
    checkpoints:
      "shoulders shrugging up toward the ears, elbows flaring out to the sides, hips drifting far away from the bench, going too deep so the shoulders roll forward, partial range of motion",
    cues: ["Shoulders down", "Elbows back", "Hips close"],
    sample: {
      good: "Smooth, controlled reps",
      problem: "Elbows flaring out to the sides",
      fix: "Point your elbows straight back behind you as you lower.",
    },
    video: "videos/bench-dip.mp4",
  },
  {
    id: "bent-over-row",
    name: "Dumbbell Bent-over Row",
    blurb: "Upper back and lats with a hip hinge.",
    category: "Upper body",
    equipment: "Dumbbell",
    orientation: "standing",
    hold: false,
    setupTips: DUMBBELL_SETUP,
    checkpoints:
      "rounding the back, torso too upright, jerking the weight with momentum, elbow flaring out wide instead of pulling toward the hip, shrugging the shoulders, not fully lowering the weight",
    cues: ["Flat back", "Elbow to hip", "Squeeze shoulder blades"],
    sample: {
      good: "Back stayed flat through the set",
      problem: "Using momentum to swing the weight",
      fix: "Pause for a second at the top and lower slowly; use a lighter dumbbell if needed.",
    },
    video: "videos/bent-over-row.mp4",
  },
  {
    id: "overhead-press",
    name: "Dumbbell Overhead Press",
    blurb: "Shoulders and triceps, standing tall.",
    category: "Upper body",
    equipment: "Dumbbell",
    orientation: "standing",
    hold: false,
    setupTips: DUMBBELL_SETUP,
    checkpoints:
      "arching the lower back and leaning back, not pressing to full lockout overhead, dumbbells drifting forward of the head, ribs flaring up, using leg drive or bouncing, elbows too wide",
    cues: ["Ribs down", "Squeeze glutes", "Press straight up"],
    sample: {
      good: "Full lockout at the top",
      problem: "Leaning back and arching the lower back",
      fix: "Squeeze your glutes and pull your ribs down so you press straight up over your head.",
    },
    video: "videos/overhead-press.mp4",
  },

  // ---- Core --------------------------------------------------------------
  {
    id: "plank",
    name: "Forearm Plank",
    blurb: "Core stability, held for the full set.",
    category: "Core",
    equipment: "None",
    orientation: "floor",
    hold: true,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "hips sagging, hips piked up, elbows not directly under shoulders, head dropping, shaking or breaking the hold",
    cues: ["Hips level", "Elbows under shoulders", "Squeeze glutes"],
    video: "videos/plank.mp4",
  },
  {
    id: "mountain-climber",
    name: "Mountain Climber",
    blurb: "Core and cardio in a high plank.",
    category: "Core",
    equipment: "None",
    orientation: "floor",
    hold: false,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "hips piking up high, hips sagging, shoulders drifting behind the wrists, knees not driving toward the chest, short bouncy range of motion",
    cues: ["Hips level", "Shoulders over wrists", "Knee to chest"],
    sample: {
      good: "Kept a steady rhythm",
      problem: "Hips piking up",
      fix: "Keep your hips level with your shoulders, like a plank, while your knees drive in.",
    },
    video: "videos/mountain-climber.mp4",
  },
  {
    id: "bird-dog",
    name: "Bird Dog",
    blurb: "Core control and back health on hands and knees.",
    category: "Core",
    equipment: "None",
    orientation: "floor",
    hold: false,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "lower back arching or sagging, hips rotating open when the leg lifts, lifting the arm or leg above the body line, moving too fast without control, head dropping or looking up",
    cues: ["Flat back", "Hips square", "Slow and long"],
    sample: {
      good: "Arm and leg reached long",
      problem: "Hip rotating open when the leg lifts",
      fix: "Keep both hip bones pointing at the floor; only lift your leg to hip height.",
    },
    video: "videos/bird-dog.mp4",
  },
];

// ---- MediaPipe pose metrics ---------------------------------------------
// Each metric is an angle at the middle joint (2D, side view). `both: "min"/"max"` picks the
// lower/higher of the two body sides (e.g. the front knee in a lunge). `target` is shown with
// a ✓/✗ and passed to Gemini. `rep` counts a rep when the metric enters the work zone
// (work "<" workAt, or ">" workAt) and then returns past restAt.

const KNEE = { key: "knee", label: "Knee angle", joints: ["hip", "knee", "ankle"] };
const HIP = { key: "hip", label: "Hip angle", joints: ["shoulder", "hip", "knee"] };
const BODY = { key: "body", label: "Body line", joints: ["shoulder", "hip", "ankle"] };
const ELBOW = { key: "elbow", label: "Elbow angle", joints: ["shoulder", "elbow", "wrist"] };

const T = (stat, op, value, text) => ({ stat, op, value, text });

const SQUAT_POSE = {
  metrics: [
    { ...KNEE, target: T("min", "<=", 100, "lowest knee angle ≤ 100° ≈ thighs parallel") },
    { ...HIP, label: "Hip angle (torso lean)" },
  ],
  rep: { metric: "knee", work: "<", workAt: 125, restAt: 155 },
};

const LUNGE_POSE = {
  metrics: [{ ...KNEE, both: "min", label: "Front knee angle", target: T("min", "<=", 100, "front knee ≈ 90° at the bottom") }],
  rep: { metric: "knee", work: "<", workAt: 125, restAt: 155 },
};

const PUSHUP_POSE = {
  metrics: [
    { ...ELBOW, target: T("min", "<=", 100, "lowest elbow angle ≤ 100° = full depth") },
    { ...BODY, target: T("avg", ">=", 160, "average body line ≥ 160° = no sagging or piking") },
  ],
  rep: { metric: "elbow", work: "<", workAt: 115, restAt: 150 },
};

const POSE = {
  squat: SQUAT_POSE,
  "goblet-squat": SQUAT_POSE,
  lunge: LUNGE_POSE,
  "reverse-lunge": LUNGE_POSE,
  rdl: {
    metrics: [
      { ...HIP, label: "Hip hinge angle", target: T("min", "<=", 120, "hip angle ≤ 120° = a deep enough hinge") },
      { ...KNEE, target: T("min", ">=", 130, "knees stay ≥ 130° (a hinge, not a squat)") },
    ],
    rep: { metric: "hip", work: "<", workAt: 135, restAt: 160 },
  },
  "step-up": {
    metrics: [
      { ...KNEE, key: "kneeBent", both: "min", label: "Working knee (bent)" },
      { ...KNEE, key: "kneeTall", both: "max", label: "Standing knee", target: T("max", ">=", 165, "knee ≥ 165° = stood fully tall") },
    ],
    rep: { metric: "kneeBent", work: "<", workAt: 125, restAt: 155 },
  },
  "glute-bridge": {
    metrics: [{ ...HIP, label: "Hip extension", target: T("max", ">=", 160, "hip ≥ 160° = straight line at the top") }],
    rep: { metric: "hip", work: ">", workAt: 155, restAt: 135 },
  },
  "wall-sit": {
    metrics: [
      { ...KNEE, target: T("avg", "<=", 105, "average knee ≈ 90° = thighs parallel") },
      { ...HIP, label: "Hip angle" },
    ],
  },
  pushup: PUSHUP_POSE,
  "incline-pushup": PUSHUP_POSE,
  "bench-dip": {
    metrics: [{ ...ELBOW, target: T("min", "<=", 115, "elbow ≈ 90–115° at the bottom") }],
    rep: { metric: "elbow", work: "<", workAt: 125, restAt: 150 },
  },
  "bent-over-row": {
    metrics: [
      { ...ELBOW, target: T("min", "<=", 110, "elbow ≤ 110° = full pull") },
      { ...HIP, label: "Torso hinge", target: T("avg", "<=", 165, "average hip ≤ 165° = torso stays hinged (upright ≈ 180°)") },
    ],
    rep: { metric: "elbow", work: "<", workAt: 115, restAt: 145 },
  },
  "overhead-press": {
    metrics: [
      { ...ELBOW, target: T("max", ">=", 160, "elbow ≥ 160° = full lockout") },
      { ...BODY, label: "Body line (lean-back)", target: T("avg", ">=", 165, "average body line ≥ 165° = no leaning back") },
    ],
    rep: { metric: "elbow", work: ">", workAt: 150, restAt: 110 },
  },
  plank: {
    metrics: [{ ...BODY, target: T("avg", ">=", 140, "average body line ≥ 140° = hips roughly level (2D estimate)") }],
  },
  "mountain-climber": {
    metrics: [
      { ...HIP, key: "drive", both: "min", label: "Knee drive (hip angle)", target: T("min", "<=", 90, "hip ≤ 90° = knee reaches the chest") },
      { ...BODY, both: "max", label: "Plank line", target: T("avg", ">=", 150, "average plank line ≥ 150° = hips not piking") },
    ],
    rep: { metric: "drive", work: "<", workAt: 100, restAt: 130 },
  },
  "bird-dog": {
    metrics: [{ ...HIP, key: "reach", both: "max", label: "Leg reach (hip angle)", target: T("max", ">=", 160, "hip ≥ 160° = leg in line with the body") }],
    rep: { metric: "reach", work: ">", workAt: 150, restAt: 120 },
  },
};

for (const ex of EXERCISES) ex.pose = POSE[ex.id] || null;

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id);
}
