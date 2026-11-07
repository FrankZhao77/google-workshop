// The preset exercises. Reference videos come from Google Flow and live in /videos/.

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

export const EXERCISES = [
  {
    id: "squat",
    name: "Bodyweight Squat",
    blurb: "The foundation of lower-body strength.",
    orientation: "standing",
    hold: false,
    setupTips: STANDING_SETUP,
    checkpoints:
      "squat depth (thighs at least parallel to the floor), knees caving inward, heels lifting off the floor, chest falling forward, rounded lower back",
    cues: ["Chest up", "Knees out", "Sit back"],
    video: "videos/squat.mp4",
  },
  {
    id: "pushup",
    name: "Push-up",
    blurb: "Chest, shoulders, triceps, and core.",
    orientation: "floor",
    hold: false,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "hips sagging or piked up (body not in a straight line), elbows flared out to 90 degrees, partial range of motion, head dropping",
    cues: ["Straight line", "Elbows 45°", "Chest to floor"],
    video: "videos/pushup.mp4",
  },
  {
    id: "lunge",
    name: "Forward Lunge",
    blurb: "Single-leg strength and balance.",
    orientation: "standing",
    hold: false,
    setupTips: STANDING_SETUP,
    checkpoints:
      "front knee traveling past the toes or caving inward, torso leaning forward, step too short, back knee slamming into the floor",
    cues: ["Tall torso", "Knee over ankle", "Drop straight down"],
    video: "videos/lunge.mp4",
  },
  {
    id: "plank",
    name: "Forearm Plank",
    blurb: "Core stability, held for the full set.",
    orientation: "floor",
    hold: true,
    setupTips: FLOOR_SETUP,
    checkpoints:
      "hips sagging, hips piked up, elbows not directly under shoulders, head dropping, shaking or breaking the hold",
    cues: ["Hips level", "Elbows under shoulders", "Squeeze glutes"],
    video: "videos/plank.mp4",
  },
];

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id);
}
