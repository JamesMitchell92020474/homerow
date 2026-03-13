# HomeRow — Developer Reference

This file is the authoritative reference for Claude Code and developers working on this project. Read it before making changes.

---

## Project Structure

```
homerow/
├── homerow.html              Main app entry point — links all CSS and JS
├── css/
│   └── style.css             All visual styling; CSS variables for theming
├── js/
│   ├── storage.js            All localStorage operations, export, import
│   ├── tracker.js            Problem key tracking and drill generation
│   ├── lessons.js            Lesson curriculum data and progression logic
│   └── app.js                Main app: screens, typing engine, AI, audio
├── assets/
│   └── sounds/
│       ├── keypress.wav      Correct keystroke sound — static WAV file
│       └── error.wav         Incorrect keystroke sound — static WAV file
├── server/
│   ├── proxy.php             Receives session data, calls Anthropic, returns feedback
│   └── config.php            Holds ANTHROPIC_API_KEY — never commit this file
├── backups/                  User-exported progress JSON files (gitignored)
├── versions/                 Milestone snapshots before major changes (gitignored)
├── README.md                 End-user guide
└── CLAUDE.md                 This file
```

**Script load order in homerow.html (matters):**
1. `storage.js` — no dependencies
2. `tracker.js` — depends on `window.Storage`
3. `lessons.js` — depends on `window.Storage`, `window.Tracker`
4. `app.js` — depends on all three

Each module exposes a single object on `window` (e.g. `window.Storage`). This avoids ES modules, which require a server to work. The app is designed to run from `file://` with no server.

---

## Lesson Curriculum Design

### Key Introduction Order

Keys are introduced following established typing pedagogy: home row first (most ergonomic), then top row by frequency, then bottom row, then numbers and symbols.

| Lesson | New Keys | Rationale |
|--------|----------|-----------|
| 1 | A S D F | Left home row. Foundation of touch typing. |
| 2 | J K L ; | Right home row. Both hands on home row. |
| 3 | E I | Two most common vowels, top row, middle fingers. |
| 4 | T O | High-frequency consonant and vowel, index/ring reach. |
| 5 | N R | Two most common consonants. Unlocks hundreds of words. |
| 6 | G H | Inner home-row neighbours (index finger, small reach). |
| 7 | (review) | Consolidation. First phase gate. |
| 8 | Y U | Index fingers, top row. |
| 9 | W P | Ring and pinky, top row. |
| 10 | C M | Bottom row middle and index. |
| 11 | B V | Both bottom row, left index. |
| 12 | Q X Z | Rarest letters, pinky/ring bottom row. |
| 13–14 | (review) | Full alphabet, speed building. |
| 15–16 | 1–5, 6–0 | Number row, left then right. |
| 17 | . , ' | Basic punctuation. |
| 18 | ! ? - | Expressive and hyphen. |
| 19–20 | (review) | Real-world passages, speed challenges. |

### Exercise Types

Each lesson's `exercises` array contains objects with:
```javascript
{
  id: 'unique-id',
  type: 'warmup' | 'drill' | 'words' | 'sentence' | 'mixed',
  label: 'Human-readable label shown during session',
  text: 'The text the user types'
}
```

### Progression Rules

- **Unlock threshold:** 90% accuracy AND `lesson.targetWpm` WPM (varies by lesson).
- **Mid-drill repeat:** If accuracy drops below 80% on a single exercise, it repeats before advancing.
- `Storage.updateLessonProgress(lessonId, wpm, accuracy)` handles unlock logic and persists best stats.
- `Lessons.isUnlocked(lessonId)` checks whether the previous lesson has `completed: true`.

### Lesson schema fields

Each lesson object supports:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique integer ID, sequential |
| `title` | yes | Shown on lesson card and session header |
| `subtitle` | yes | Key list shown on lesson card |
| `description` | yes | Longer description shown on lesson card |
| `newKeysNote` | no | Short note shown in the new-key intro modal (e.g. "Left Hand Home Row"). If absent, no note is shown. |
| `phase` | yes | `"beginner"` / `"intermediate"` / `"advanced"` |
| `newKeys` | yes | Keys introduced this lesson — drives the new-key intro modal |
| `allKeys` | yes | All keys the student has learned so far — gates problem-key drill injection |
| `targetWpm` | yes | WPM required to unlock the next lesson |
| `targetAccuracy` | yes | Accuracy % required to unlock next lesson |
| `sessionLength` | yes | `{ min, max }` in minutes — advisory display only |
| `exercises` | yes | Array of exercise objects (see above) |

### Adding New Lessons

Append to the `LESSON_DATA` array in `js/lessons.js`. Follow the existing schema exactly. Use IDs in sequence. Choose a phase and add the new keys to `allKeys` (all keys the student has learned so far). The app will pick them up automatically.

---

## localStorage Data Schema

All data is stored under a single key: `homerow_data`.

```javascript
{
  version: "1.0",                      // Schema version for future migrations
  currentLesson: 1,                    // Lesson ID currently selected
  currentPhase: "beginner",            // "beginner" | "intermediate" | "advanced"

  sessions: [
    {
      id: "abc123",                    // Auto-generated unique ID
      date: "2025-01-15T10:30:00Z",   // ISO 8601 timestamp
      lessonId: 3,                     // Lesson number
      lesson: 3,                       // Duplicate (legacy, keep for compat)
      phase: "beginner",
      wpm: 24,
      accuracy: 91,
      duration: 720,                   // Seconds
      problemKeys: {                   // Session-level key error stats
        "f": { misses: 3, total: 20 }
      }
    }
  ],

  problemKeys: {                       // Persistent cumulative key stats
    "f": { misses: 12, total: 80 },
    "j": { misses: 5, total: 60 }
  },

  lessonProgress: {
    "1": {
      completed: true,
      bestWpm: 28,
      bestAccuracy: 95,
      attempts: 4
    },
    "2": {
      completed: false,
      bestWpm: 19,
      bestAccuracy: 87,
      attempts: 2
    }
  },

  preferences: {
    soundEnabled: true,                // Sound on/off — persists across sessions
    strictMode: false,                 // Strict Mode on/off
    apiKey: "sk-ant-...",              // Anthropic API key (local use only)
    theme: "dark",                     // "dark" | "light"
    seenHandTutorial: false            // True after hand placement tutorial is dismissed once
  }
}
```

`Storage.initFresh()` creates this structure with defaults. `Storage.getAll()` merges any stored data with defaults so new fields always exist (forward-compatible schema migration).

---

## Problem Key Tracker Logic

### How it works

1. During typing, `Tracker.record(key, isCorrect)` is called for every keystroke.
2. This updates `sessionStats` (in-memory) and calls `Storage.recordKeyResult(key, isCorrect)` (persistent).
3. At session start, `Tracker.getTopProblemKeys(3)` fetches the stored cumulative stats and returns keys with error rate > 20% and at least 10 total presses.
4. If relevant problem keys exist for the current lesson's key set, a problem key drill is automatically injected as exercise index 1 (after warmup).
5. At session end, `Tracker.flushSession()` returns the session summary (used by `renderSummary`).

### Drill injection

The drill is only injected once per session (`State.drillInjected` flag). It uses `Tracker.generateDrill()`, which:
1. Repeats the problem key 4× isolated
2. Pairs it with adjacent home-row keys
3. Alternates the problem keys together
4. Finds words from a word bank that contain the problem key and only use allowed keys for the current lesson

---

## Three Learning Phases

| Phase | Lessons | Session Length | Target WPM | Target Accuracy |
|-------|---------|----------------|------------|-----------------|
| Beginner | 1–7 | 15–20 min | 15–25 | 90% |
| Intermediate | 8–14 | 25–30 min | 27–35 | 90% |
| Advanced | 15+ | 30–45 min | 30–45+ | 88–90% |

The session length is displayed in the session header but is advisory — HomeRow doesn't enforce a time limit. Sessions end when all exercises are completed. Lesson exercises are designed to take approximately the stated time at a beginner pace.

---

## Audio System

### File location
```
assets/sounds/keypress.wav
assets/sounds/error.wav
```

These are **static WAV files** loaded directly from disk. They are not generated at runtime.

### How audio is loaded

In `app.js → initAudio()`:
```javascript
function loadSound(name, path) {
  const audio = new Audio();
  audio.src = path;
  audio.addEventListener('canplaythrough', () => {
    State.sounds[name] = audio; // ready to play
  }, { once: true });
  audio.addEventListener('error', () => {
    State.sounds[name] = null; // silently skip if missing
  });
}
```

### How audio is played

`playSound(type)` clones the audio node (allows rapid repeated playback):
```javascript
const clone = snd.cloneNode();
clone.volume = type === 'keypress' ? 0.4 : 0.6;
clone.play().catch(() => {}); // ignore autoplay policy errors
```

### Sound preference storage

`preferences.soundEnabled` in localStorage. `true` by default.
- Toolbar button (🔊/🔇): calls `toggleSound()`, saves preference, updates button class and text.
- Settings checkbox `#setting-sound`: synced with the same preference.
- Both are kept in sync in both directions.

---

## Theming

### Light / dark mode

`preferences.theme` in localStorage. `'dark'` by default.

- Toolbar button (🌙/☀️): calls `toggleTheme()`, saves preference, updates button icon and title.
- Settings checkbox `#setting-theme` (under **Appearance**): synced with the toolbar button.
- Both are kept in sync in both directions.

`applyTheme(theme)` in `app.js` toggles the `light` class on `<body>`. All colours are CSS variables defined in `:root` (dark values) with overrides under `body.light` in `style.css`. No hardcoded colours outside those blocks.

### CSS variable structure

`:root` defines the dark theme. `body.light { … }` overrides only the variables that differ:
- Surface/background/border/input colours
- `--shadow` opacity
- `--badge-bg-beginner / intermediate / advanced` tints (light versions use soft pastel backgrounds)
- Finger colours (slightly deeper for contrast on light backgrounds)

Accent, success, error, warning, and info colours are intentionally shared between themes.

---

## Welcome Screen

The welcome screen (`#screen-welcome`) displays a colour-coded home row key graphic (`.welcome-homerow`) between the tagline and the phase cards. Keys use the same finger-colour CSS variables as the session keyboard diagram. F and J show a bump indicator via `.welcome-anchor::after`.

---

## Tutorial Modal Chain

`startSession(lessonId)` in `app.js` chains three steps before the typing session begins:

```
startSession()
  → showHandTutorial(onDone)     ← only if !prefs.seenHandTutorial
    → sets seenHandTutorial = true
  → showNewKeyIntro(lesson, onDone)  ← only if lesson.newKeys.length > 0
  → _beginSession(lessonId)
```

### Hand placement tutorial (`modal-hand-tutorial`)

Shown once ever (guarded by `preferences.seenHandTutorial`). Displays the full home row as two labelled groups:

- **Left Hand — Home Row**: A (pinky) · S (ring) · D (middle) · F (index)
- **Right Hand — Home Row**: J (index) · K (middle) · L (ring) · ; (pinky)

Each key is wrapped in a `.tutorial-key-col` with the finger label (`.tutorial-key-label`) directly below it. The spacebar sits in a `.tutorial-spacebar-col` below both groups with "Thumb" beneath it.

HTML structure:
```
.tutorial-keyboard
  .tutorial-hand-group  ← "Left Hand — Home Row"
    .tutorial-hand-keys
      .tutorial-key-col × 4  (A, S, D, F — each with .tutorial-key-label below)
  .tutorial-spacer
  .tutorial-hand-group  ← "Right Hand — Home Row"
    .tutorial-hand-keys
      .tutorial-key-col × 4  (J, K, L, ; — each with .tutorial-key-label below)
.tutorial-spacebar-col
  .tutorial-spacebar + .tutorial-key-label[data-finger="thumb"]
```

### New key intro (`modal-new-keys`)

Shown at the start of any lesson where `lesson.newKeys.length > 0`. Renders one `.new-key-card` per new key using `KEY_INFO` data from `app.js`.

If `lesson.newKeysNote` is set, it is shown as a coloured subtitle (`#new-keys-note`, `.new-keys-note`) above the description paragraph. Lessons 1 and 2 use this:
- Lesson 1: `"Left Hand Home Row — your left fingers rest here between every keystroke."`
- Lesson 2: `"Right Hand Home Row — these complete all eight home row keys. Both hands are now in position."`

### Modal keyboard dismissal

Both modals support **Space or Enter** as keyboard shortcuts to dismiss, in addition to clicking the button. `showHandTutorial` and `showNewKeyIntro` each add a `keydown` listener that calls the same `dismiss()` function as the button. The listener is removed immediately on dismissal to prevent leaking into the typing session.

```javascript
function onKey(e) {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dismiss(); }
}
document.addEventListener('keydown', onKey);
// removed inside dismiss() via document.removeEventListener('keydown', onKey)
```

---

## AI Feedback Integration

### Detection logic

```javascript
function isHosted() {
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}
```

- `file://` protocol → local mode → call Anthropic API directly using `preferences.apiKey`
- `http://` or `https://` → hosted mode → POST to `./server/proxy.php`

### Prompt format

The prompt sent to the model includes:
- Lesson number and phase
- Session WPM and accuracy
- Duration
- Top 3 problem keys with error rates
- WPM trend vs last 3–6 sessions

### proxy.php flow

```
Browser (session data as JSON)
  → POST ./server/proxy.php
    → reads ANTHROPIC_API_KEY from config.php
    → POST https://api.anthropic.com/v1/messages
    → returns { feedback: "..." }
  → Browser displays feedback
```

The API key in `config.php` never reaches the browser at any point.

### Model

`claude-haiku-4-5-20251001` — fast and cost-effective for short coaching summaries. `max_tokens: 400`.

### Graceful degradation

The feedback section always shows something useful. Priority order:

1. **API available** → AI-generated coaching note displayed.
2. **No API key / no proxy** → `generateTemplateFeedback(sessionData)` is called and its output is displayed, with a small "unlock AI coaching" hint beneath.
3. **API call fails at runtime** → same template feedback, shown silently with no error message.

`generateTemplateFeedback(sessionData)` in `app.js` builds feedback from session data directly:
- Accuracy bracket (≥97% / ≥93% / ≥88% / below) → appropriate phrasing
- WPM bracket (≥50 / ≥30 / ≥15 / below) → pace commentary
- WPM trend from `computeTrend()` → improving / declining sentence if applicable
- Top problem key from `Tracker.getSessionProblemKeys(3)` → specific key tip

No errors are thrown and all other features work normally.

---

## Hosting on cPanel (e.g. myhost.nz)

HomeRow is designed to be self-hosted on a subdomain such as `homerow.yourdomain.co.nz`.

### Steps

1. **Create the subdomain** in cPanel's Subdomain Manager, pointing to a folder such as `public_html/homerow`. The subdomain can be created independently — no main site is required first.
2. **Upload the project files** via cPanel File Manager or an FTP client. Upload everything in the `homerow/` folder (not the folder itself) to `public_html/homerow/`.
3. **Configure the API key** in `server/config.php` on the server. Replace `'your-api-key-here'` with your real Anthropic API key.
4. **Verify** by opening `homerow.yourdomain.co.nz` in a browser. The proxy should work automatically.

### Security notes

- `server/config.php` must **never** be committed to version control or exposed publicly. Add it to `.gitignore`.
- The PHP proxy validates input, strips HTML tags, and enforces a 4000-character prompt limit.
- CORS is configured in `proxy.php` to allow all origins (necessary for the `file://` case). If you want to lock it down to your domain only, update `ALLOWED_ORIGINS` in `config.php`.

### Progress and multi-user

Progress is stored in each user's **browser localStorage**. It is not shared between users or devices. Each browser/device has its own independent progress.

The **Export/Import** feature is the recommended way for users to back up and transfer progress across devices or browsers.

If a future version requires shared cross-device progress (e.g. for a classroom), a database backend would need to be added. The localStorage schema above is the starting point for that design.

---

## Adding / Extending Features

### New lessons
Append to `LESSON_DATA` in `js/lessons.js`. Follow the existing schema.

### New settings
Add to the `preferences` object in `Storage.defaults()`, add a UI row in the Settings screen in `homerow.html`, and wire up the change handler in `bindGlobalEvents()` in `app.js`.

### New screens
1. Add a `<main id="screen-name">` block in `homerow.html`
2. Add a `.nav-btn[data-screen="name"]` button
3. Add rendering logic in `app.js → showScreen()` if needed

### Themes
`preferences.theme` (`"dark"` / `"light"`) is fully implemented. `applyTheme(theme)` in `app.js` toggles the `light` class on `<body>`. Add additional theme values by extending the CSS variable overrides in `style.css` and wiring them in `applyTheme()`.

---

## Known Limitations / Future Work

- No cross-device sync — localStorage only. Needs a backend for shared progress.
- No capital letters introduced in beginner/intermediate lessons. Advanced lessons include some via punctuation context.
- The history chart uses vanilla Canvas, not a charting library. It handles up to 30 sessions cleanly.
- Sound files (`keypress.wav`, `error.wav`) must be present in `assets/sounds/` for audio to work.
- The AI feedback prompt is designed for English. Multi-language support would need prompt adjustments.
