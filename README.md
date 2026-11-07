# Spotter: your AI spotter at the Rec

Spotter is an AI form coach for Texas A&M students who are new to strength training at the Student Rec Center.
You pick exercises, record a 15-second set on your laptop webcam, and Gemini tells you what to fix.
You also see a Google Flow video of correct form and track your progress across sessions.

## Run it

You need Python (already on the team laptops) and Chrome or Edge.

```bash
python -m http.server 8000
```

Then open http://localhost:8000. The camera only works on `localhost` or `https`, so don't open `index.html` as a file.

## Add your Gemini API key

1. Get a key at https://aistudio.google.com → **Get API key**.
2. Paste it into `js/config.js` (this file is gitignored, so it never gets committed).
3. Reload the page. The yellow "Demo mode" banner disappears.

Without a key, the whole app still works with sample feedback, which is useful as a backup for the demo video.

> The key is visible to anyone using the app in a browser. That's fine for a local demo; don't host this publicly with your key in it.

## Add the Flow reference videos

Put the four Flow exports in `videos/` named `squat.mp4`, `pushup.mp4`, `lunge.mp4`, `plank.mp4`
(see `videos/README.md`). Until then, the app shows a placeholder.

## Demo accounts

| Account | What it shows |
|---|---|
| Alex | 3 past sessions with improving squat scores, coach notes, and fixed/recurring mistakes |
| Jordan | A brand-new user with no history |

To reset all demo data before recording, open the browser console and run `spotter.resetDemoData()`.

## Testing the Gemini prompt

Open http://localhost:8000/tools/prompt-test.html, pick an exercise, choose a test clip, and see the exact prompt plus Gemini's raw JSON.

## Project layout

```
index.html           single page; screens are rendered by js/app.js
css/style.css        maroon/white theme
js/app.js            routing, screens, session flow
js/recorder.js       webcam preview, countdown, 15s auto-stop recording
js/gemini.js         Gemini form analysis + history summary, demo-mode fallbacks
js/store.js          per-user localStorage, demo accounts, seed data
js/exercises.js      the 4 preset exercises (setup tips, checkpoints, cues, video path)
js/config.js         your API key (gitignored); template in js/config.example.js
videos/              Google Flow reference clips
tools/prompt-test.html  prompt testing page
docs/video-script.md    draft script for the submission video
```

## Privacy

Clips stay in browser memory only and are discarded when the session ends.
Only the text feedback is saved, in this browser's localStorage.
