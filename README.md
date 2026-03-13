# HomeRow

A focused, distraction-free touch typing tutor that takes you from your very first keystroke to confident full-keyboard fluency — with personalised AI coaching after every session.

---

## What is HomeRow?

HomeRow is a web-based typing tutor that runs entirely in your browser with no account, no login, and no internet connection required (except for optional AI coaching feedback). Your progress is saved automatically in your browser and stays on your device.

HomeRow teaches you to type the right way: home row first, then one key at a time, building real muscle memory through structured lessons, animated finger guides, and real English words.

---

## How to Open HomeRow

1. Find the `homerow.html` file in your HomeRow folder.
2. Double-click it — it will open in your default web browser.
3. That's it. No installation, no server, no setup required.

**Tip:** Bookmark it in your browser so you can come back to it easily.

---

## The Three Learning Phases

HomeRow uses a progressive phase system. Each phase unlocks automatically when you meet the requirements.

### Phase 1 — Beginner (Lessons 1–7)
**Session length: 15–20 minutes**

You start with just the home row keys (A S D F J K L ;) and build from there, key by key. The focus is entirely on accuracy and proper finger placement — speed comes later. Each lesson adds only one or two new keys so nothing feels overwhelming.

To move to the next lesson, you need:
- At least **90% accuracy**
- At least the **target WPM** shown on the lesson card

### Phase 2 — Intermediate (Lessons 8–14)
**Session length: 25–30 minutes**

You now know all the home row keys and start exploring the full keyboard. Every letter of the alphabet is introduced in a sensible order: most common and most comfortable first. Sessions get a little longer because your fingers need more practice to build reliable pathways.

### Phase 3 — Advanced (Lessons 15+)
**Session length: 30–45 minutes**

Numbers, punctuation, symbols, and long real-world text passages. This is where you push your speed and develop true fluency. Sessions are longer and the text is more varied and challenging.

---

## During a Session

Each session has three parts:

1. **Warmup** — A short exercise to wake your fingers up and get into the rhythm.
2. **Main Drills** — The core lesson content: key drills, word practice, and sentences.
3. **Summary** — Your stats, problem key report, and (if enabled) an AI coaching note.

**Just start typing.** HomeRow listens for your keystrokes automatically — there's no need to click the text box first.

- **Green** = correct keystroke
- **Red** = incorrect keystroke
- The **animated keyboard** at the bottom always shows you which finger to use for the next key

If your accuracy drops below 80% on any drill, HomeRow will repeat that drill before moving on. This is normal and intentional.

---

## The Welcome Screen

When you open HomeRow you'll see the welcome screen with a colour-coded home row key display (A S D F · J K L ;). Each key is bordered in the colour of the finger that presses it — a quick visual reminder of what you'll be learning from the very first lesson.

---

## Hand Placement Tutorial

The first time you start a session, HomeRow shows a one-time hand placement guide. It displays the full home row split into two labelled groups — **Left Hand** (A S D F) and **Right Hand** (J K L ;) — with each key's finger name shown directly below it, and the spacebar below both groups with "Thumb" underneath.

Tips shown in the tutorial:
- F and J have raised bumps — find home position without looking down
- Curve fingers lightly — rest them on the keys, not pressing down
- Return after every keystroke — always come back to home row between reaches
- Eyes on the screen — the keyboard diagram shows which finger to use at all times

**To dismiss this screen:** click the button, or press **Space** or **Enter**.

---

## New Key Introduction

At the start of any lesson that introduces new keys, HomeRow shows a brief card for each new key: which finger presses it and what the reach feels like. Lessons 1 and 2 include an extra note identifying them as the Left Hand Home Row and Right Hand Home Row respectively.

**To dismiss this screen:** click the button, or press **Space** or **Enter**.

---

## The Animated Finger Guide

Below the typing area you'll see a keyboard diagram. The key you need to type next is highlighted in blue and pulses gently. Colour-coded borders on each key show which finger to use:

| Colour | Finger |
|--------|--------|
| Red | Pinky |
| Orange | Ring |
| Yellow | Middle |
| Green | Index |
| Blue | Thumb (space) |

Keep your eyes on the screen, not the keyboard. That's the whole point of touch typing.

---

## Strict Mode

**Strict Mode is off by default.** You can turn it on in Settings.

In normal mode, if you type the wrong key, HomeRow marks it red and moves on. You can keep typing.

In **Strict Mode**, you must correct every mistake before you can continue. The cursor stays on the wrong character until you backspace and retype it correctly. This is harder and slower — but it builds cleaner habits and stops you developing the common bad habit of "ploughing through errors."

**Recommendation:** Use normal mode until you're comfortable with all the key positions. Then switch to Strict Mode to sharpen your accuracy.

---

## Light and Dark Mode

HomeRow defaults to a dark theme. Click the 🌙 / ☀️ button in the top-right toolbar to switch between dark and light mode. You can also toggle it under **Settings → Appearance**. Your preference is saved and restored automatically.

---

## Sound Effects

HomeRow plays a soft click on correct keystrokes and a short buzz on errors. This gives your fingers instant feedback even when your eyes are on the screen.

**To toggle sound on or off:** Click the speaker icon (🔊 / 🔇) in the top-right corner of the toolbar. Your preference is remembered between sessions.

**Note:** Sound requires `keypress.wav` and `error.wav` to be present in `assets/sounds/`. The app works fine without them — sound is optional.

---

## AI Coaching Feedback

After every session, HomeRow shows a personalised coaching note based on your actual session data: your WPM, accuracy, which keys you missed most, and how you're trending over time.

**You always get feedback** — even without an API key. HomeRow generates template feedback from your stats automatically. Adding an API key upgrades this to a fully personalised AI-written note.

### To enable AI coaching (optional)

**When running locally (file on your computer):**
1. Go to **Settings**
2. Enter your Anthropic API key (get one free at [console.anthropic.com](https://console.anthropic.com))
3. Click **Save**

Your API key is stored only in your browser on this device. It is never shared or uploaded.

**When running on a hosted server:** AI coaching works automatically with no API key needed in your browser — the server handles it securely.

**If the AI is unavailable:** HomeRow falls back to template feedback silently. You'll still see a useful coaching note — just not an AI-generated one.

---

## Exporting and Importing Progress

HomeRow saves your progress automatically in your browser. But if you switch browsers, reinstall your OS, or want to use HomeRow on another computer, you'll need to export and import your progress manually.

### Export
1. Go to **Settings**
2. Click **Export**
3. A file named `homerow-progress-YYYY-MM-DD.json` will download
4. Save it somewhere safe (suggested: the `backups/` folder in your HomeRow project)

### Import
1. Go to **Settings** (or the Welcome screen if starting fresh)
2. Click **Import**
3. Select your previously exported `.json` file
4. Your progress is restored

---

## Session History

The **History** screen shows a chart of your WPM and accuracy over your last 30 sessions, with phase milestones marked. Below the chart is a table of your recent sessions.

This is a good place to check in weekly and see your overall trend. Don't get discouraged by dips — they're normal, especially after introducing new keys.

---

## Tips for Best Results

- **Practice for 15–20 minutes daily** rather than one long session per week. Consistency beats intensity.
- **Don't look at the keyboard.** It's tempting, especially on new keys — resist it. The finger guide is there to help.
- **Accuracy first, speed second.** Speed is a by-product of accurate, confident typing. Chase the 90% threshold first.
- **If a drill feels too hard, stay on it.** HomeRow will repeat drills where your accuracy is low. That's the right thing to happen.
- **Use Strict Mode once you hit Lesson 5 or 6.** It's the fastest way to stop making sloppy errors.

---

## Folder Structure

```
homerow/
├── homerow.html          ← Open this in your browser
├── css/style.css         ← All styling
├── js/                   ← App logic
├── assets/sounds/        ← keypress.wav and error.wav
├── server/               ← PHP proxy for hosted AI feedback
├── backups/              ← Save your exported progress files here
└── versions/             ← Milestone snapshots (for developers)
```
