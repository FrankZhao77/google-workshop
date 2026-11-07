# Spotter: submission video script (draft, AT-59)

Target length: about 2:30. Edit freely so it sounds like you.

## 0:00–0:08 · Intro (Flow clip)
**Visual:** Flow intro clip: laptop on a gym bench, student squatting.
**Text on screen:** "Spotter: your AI spotter at the Rec"

## 0:08–0:40 · The problem
**Visual:** A teammate at a bench, looking unsure, checking the mirror.

**Narration:**
> Every semester, thousands of Aggies walk into the Rec for the first time. Most of them have the same question: *am I doing this right?*
> Personal trainers cost extra. Friends aren't experts. And a mirror shows you what you look like, not what you're doing wrong.
> Bad form leads to injuries, slow progress, and a lot of beginners just stop going.

## 0:40–2:05 · The demo
**Visual:** Screen recording on the Alex account, with cutaways of the teammate exercising in front of the laptop.

1. **Home (0:40):** "This is Spotter. Alex logs in and sees the one thing their AI coach said to work on last time."
2. **Pick exercises (0:50):** "Alex picks today's exercises: squats and push-ups. Each one has a correct-form video we generated with Google Flow."
3. **Record (1:00):** "Set the laptop on a bench, step back, press Start. A five-second countdown, then Spotter records a 15-second set and stops on its own."
4. **Feedback (1:15):** "Gemini watches the clip and gives a form score, what Alex did well, and the top things to fix, with exactly when they happened and how to fix them."
5. **Correct form (1:35):** "Right next to the feedback is the Flow video of correct form, with short cues to remember."
6. **Summary and history (1:45):** "When the session ends, Spotter updates Alex's coach notes. History shows which mistakes are fixed, which keep coming back, and what to focus on next time."

## 2:05–2:30 · Impact
**Visual:** History page, then the team.

**Narration:**
> Spotter is free, takes five minutes, and only needs a laptop. Videos are never saved, only the text feedback.
> We built it with Google Flow for the reference videos and Gemini for video understanding.
> Our goal is simple: help every Aggie beginner train safely and keep coming back. Thanks and Gig 'em!

## Checklist
- [ ] Reset demo data before recording (`spotter.resetDemoData()` in the console)
- [ ] Real Gemini key in `js/config.js` (no yellow Demo banner on screen)
- [ ] All 4 Flow videos in `videos/`
- [ ] Final length between 2:00 and 3:00
