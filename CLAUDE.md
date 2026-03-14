# HomeRow — Developer Reference

This file is the authoritative reference for Claude Code and developers working on this project. Read it before making changes.

## Working Conventions

- **Do not commit or push** unless the user explicitly asks. Make changes, then stop and wait for instruction.

---

## Project Structure

```
homerow/
├── index.html              Main app entry point — links all CSS and JS
├── css/
│   └── style.css             All visual styling; CSS variables for theming
├── js/
│   ├── storage.js            All localStorage operations, export, import
│   ├── tracker.js            Problem key tracking and drill generation
│   ├── lessons.js            Lesson curriculum data and progression logic
│   └── app.js                Main app: screens, typing engine, AI, audio
├── assets/
│   ├── sounds/
│   │   ├── keypress.wav      Correct keystroke sound — static WAV file
│   │   └── error.wav         Incorrect keystroke sound — static WAV file
│   └── icons/
│       └── favicon.svg       SVG favicon — transparent key outline with blue bump dot
├── server/
│   ├── proxy.php             Receives session data, calls Anthropic, returns feedback
│   └── config.php            Holds ANTHROPIC_API_KEY — never commit this file
├── versions/                 Milestone snapshots before major changes (gitignored)
├── README.md                 End-user guide
└── CLAUDE.md                 This file
```

**Script load order in index.html (matters):**
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
| 1 | A S D F Space | Left home row. Foundation of touch typing. Space introduced here as it is used from the first exercise. |
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
    theme: "dark",                     // "dark" | "light"
    seenHandTutorial: false,           // True after hand placement tutorial is dismissed once
    seenStrictPrompt: false            // True after one-time Strict Mode prompt is dismissed
  },

  achievements: {                      // Keyed by achievement ID
    "sharpshooter": { unlockedAt: "2025-01-15T10:30:00Z" }
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

The welcome screen (`#screen-welcome`) has three sections between the tagline and the buttons:

1. **Home row key graphic** (`.welcome-homerow`) — colour-coded A S D F · J K L ; keys using the finger-colour CSS variables. F and J show a bump indicator via `.welcome-anchor::after`.

2. **Progress bar** (`.welcome-progress`) — a segmented horizontal progress bar showing completion across all three phases. Three segments sit side-by-side inside `.welcome-progress-bar`:
   - `.progress-segment--beginner` (flex: 7) — green fill using `--finger-index`
   - `.progress-segment--intermediate` (flex: 7) — yellow fill using `--finger-middle`
   - `.progress-segment--advanced` (flex: 6) — red fill using `--finger-pinky`

   Each segment has a `.progress-segment-track` (grey background) with a `.progress-segment-fill` (coloured, width set dynamically as a percentage of lessons completed). Below the bar, a `.progress-segment-label` shows the phase name and a `completed / total` count. The fill widths and counts are set in `showScreen('welcome')` from `lessonProgress` data.

   Below the bar, `#welcome-phase-hint` (`.welcome-phase-hint`) shows a single dynamic line of text: the current phase hint if in progress, "Start with the home row" on first visit, or a completion message once all lessons are done.

3. The **HomeRow logo** in the toolbar is a `<button data-screen="welcome">` — clicking it navigates back to the welcome screen from anywhere. Styled via `#toolbar .logo` with `cursor: pointer` and `opacity` hover.

4. The **Start Learning / Continue Learning** button (`#btn-start`) — text is set dynamically in `showScreen('welcome')` based on whether `Storage.getAll().sessions` is non-empty. First visit: "Start Learning →". Returning user: "Continue Learning →".

5. The **Load Progress** button (`#btn-import-welcome`) on the welcome screen — calls `triggerImport()` directly, same as the Settings import. Hidden on first visit (`hasProgress === false`); shown once at least one session exists.

---

## Button Styles and Keyboard Navigation

### Button styles

All buttons default to a neutral, non-filled appearance. The accent colour only appears on interaction (hover or keyboard focus):

- **`.btn-primary`** — outline style: blue border, no fill, accent text. Hover: blue fill + white text.
- **`.btn-secondary`** — grey border, muted text. Hover: blue fill + white text.
- **`.btn-danger`** — red tint. Hover: deeper red tint (unchanged by keyboard nav).
- **`.kb-focus`** — applied by `KeyNav` to the keyboard-focused button. Same visual as hover: blue fill + white text, using `!important` to override button type.

### KeyNav — arrow key navigation

`KeyNav` (defined in `app.js`) manages keyboard focus for screens with multiple action buttons. It operates in two mutually exclusive modes:

- **Mouse mode** (default): no classes applied, hover styles work naturally.
- **Keyboard mode**: active while user is pressing arrow keys. The focused button gets `.kb-focus`.

Transitions:
- Any arrow key press → enters keyboard mode. First Right/Down focuses button 0; first Left/Up focuses last button.
- Any mouse movement → exits keyboard mode immediately (`onMouse()` clears `.kb-focus` and resets `idx = -1`).

`KeyNav.setGroup(buttons)` is called with the relevant button elements when a screen is shown or a modal opens. Groups are set for:
- **Welcome screen**: `[btn-start, btn-import-welcome]` — set inside `showScreen('welcome')`
- **Lessons screen**: `[btn-save-lessons, btn-load-lessons]` — set inside `showScreen('lessons')`
- **Session summary**: `[btn-retry, btn-next-lesson, btn-lessons-from-summary, btn-save-summary]` — set inside `showScreen('summary')`, **after** `renderSummary()` has run and set button visibility. Do not set this group inside `renderSummary()` — `showScreen()` calls `KeyNav.clear()` for all screens unless explicitly handled, so setting it in `renderSummary()` would be immediately overwritten.
- **Reset modal**: `[btn-cancel-reset, btn-confirm-reset]`

Space or Enter activates the focused button when keyboard mode is active.

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
  .tutorial-hands-row
    .tutorial-hand-group  ← "Left Hand — Home Row"
      .tutorial-hand-keys
        .tutorial-key-col × 4  (A, S, D, F — each with .tutorial-key-label below)
    .tutorial-spacer  ← flex:1, pushes hands apart
    .tutorial-hand-group  ← "Right Hand — Home Row"
      .tutorial-hand-keys
        .tutorial-key-col × 4  (J, K, L, ; — each with .tutorial-key-label below)
  .tutorial-spacebar-col   ← inside .tutorial-keyboard, full width
    .tutorial-spacebar + .tutorial-key-label[data-finger="thumb"]
```

The `.tutorial-keyboard` is `flex-direction: column`. `.tutorial-hands-row` is `display: flex` (horizontal). The spacebar is a direct child of `.tutorial-keyboard` below `.tutorial-hands-row`, so its `width: 100%` spans the full width of both hand groups.

### New key intro (`modal-new-keys`)

Shown at the start of any lesson where `lesson.newKeys.length > 0`. Renders one `.new-key-card` per new key using `KEY_INFO` data from `app.js`.

Keys are sorted before rendering: left-hand keys first, right-hand keys second, spacebar/thumb last (determined by `fingerClass` prefix). The spacebar card uses the additional class `.new-key-card--spacebar` (`grid-column: 1 / -1` — spans both columns) and the badge uses `.key-badge-spacebar` (wider, taller).

If `lesson.newKeysNote` is set, it is shown as a coloured subtitle (`#new-keys-note`, `.new-keys-note`) above the description paragraph. Lessons 1 and 2 use this:
- Lesson 1: `"Left Hand Home Row — your left fingers rest here between every keystroke."`
- Lesson 2: `"Right Hand Home Row — these complete all eight home row keys. Both hands are now in position."`

### Modal close (X button)

Both modals have a `.modal-close` button (`#btn-hand-tutorial-close`, `#btn-new-keys-close`) in the top-right corner. Clicking it — or pressing **Escape** — calls `cancel()`, which closes the modal without starting the session. This is distinct from `dismiss()`, which closes the modal and proceeds.

### Modal keyboard shortcuts

- **Space / Enter** → `dismiss()` — proceeds to the next step (new-key intro or session)
- **Escape** → `cancel()` — closes the modal, returns to lessons screen

Each modal adds a single `keydown` listener that handles both; the listener is removed immediately when either function runs to prevent leaking into the typing session.

```javascript
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dismiss(); }
}
document.addEventListener('keydown', onKey);
```

---

## Achievements System

### Data

`ACHIEVEMENTS` is a const array in `app.js` (defined before `init()`). Each entry:
```javascript
{
  id: 'sharpshooter',       // unique snake_case ID
  name: 'Sharpshooter',     // display name
  description: '...',       // shown in card and unlock banner
  platinum: true,           // optional — only set on The HomeRow Legend
  icon: `<svg .../>`,       // inline SVG string, uses currentColor
  check: (sessionData, allStorageData) => boolean
}
```

The 12 regular achievements cover: first-attempt pass at 90%+ (Sharpshooter), 100% accuracy (Ghost Fingers), 5-in-a-row at 95%+ (Iron Discipline), speed (30/50/70 WPM), streaks (3/7 consecutive days), phase completion (beginner/intermediate/advanced), and problem key recovery. The platinum **The HomeRow Legend** checks that all 12 others are unlocked.

### Storage

`Storage.getAchievements()` returns `{ [id]: { unlockedAt: ISO string } }`.
`Storage.unlockAchievement(id)` writes the entry and returns `true` if newly unlocked, `false` if already had it. Achievements are merged (not overwritten) in `getAll()` so imports don't lose progress.

### Checking and rendering

`checkAchievements(sessionData)` is called inside `renderSummary()` after all session data is saved. It runs every achievement's `check()` against the current storage snapshot, unlocks newly earned ones, and returns the array of newly unlocked achievement objects.

`renderNewAchievements(newlyUnlocked)` shows/hides the `#new-achievements-banner` on the summary screen with a gold banner listing each newly earned achievement and its icon.

`renderAchievements()` is called by `showScreen('achievements')`. It renders all 13 cards into `#achievements-grid` — a fixed 3-column CSS grid. The platinum card has `grid-column: 2` so it sits in the centre column of the final row. Locked cards get `.locked` (40% opacity); unlocked get `.unlocked` (blue left border); platinum unlocked gets `.platinum.unlocked` (gold styling throughout). On screens ≤680px the grid collapses to 2 columns and the platinum card spans full width.

`getMaxConsecutiveDays(sessions)` is a helper that computes the longest streak of calendar days with at least one session.

### Screen

`#screen-achievements` is a restorable screen (added to the `restorable` array in `init()`). Nav button: `<button class="nav-btn" data-screen="achievements">Achievements</button>`.

---

## Phase Complete Screen

`#screen-phase-complete` is a transient screen (not in the restorable list) shown when a user passes the final lesson of a phase (7, 14, or 20) for the first time.

**Trigger** in `endSession()`:
```javascript
const phaseData = PHASE_COMPLETIONS[lessonId];
const progress  = Storage.getLessonProgress(lessonId);
if (phaseData && unlocked && progress.attempts === 1) showPhaseComplete(phaseData);
else showScreen('summary');
```
`renderSummary()` is always called first so the summary is pre-rendered. The phase complete screen simply delays showing it.

**`PHASE_COMPLETIONS`** — keyed by lesson ID (7, 14, 20). Each entry has `phase`, `label`, `colour` (CSS variable matching the traffic-light phase colour), `message`, and `achievementId`.

**`showPhaseComplete(phaseData)`** populates the screen elements, sets `--phase-colour` as a CSS custom property on the screen element, and calls `showScreen('phase-complete')`. The achievement icon is pulled from the `ACHIEVEMENTS` array by `achievementId`.

**"View Results →"** button calls `showScreen('summary')`.

---

## Summary Screen

`renderSummary(sessionData, unlocked, nextLesson)` in `app.js` is called before `showScreen('summary')`. It:

1. Populates stats (WPM, accuracy, duration, lesson number) and colours them by bracket.
2. Populates `.target-lbl` sub-labels under WPM (`#summary-wpm-target`) and Accuracy (`#summary-acc-target`) with the lesson targets.
3. Updates the header copy dynamically: `"Session Complete 🎉"` / `"Great work — lesson passed!"` if `unlocked`; `"Session Complete"` / `"Here's how you did."` if not.
4. Shows the **unlock banner** (`#unlock-banner`) if `unlocked && nextLesson`.
5. Shows the **not-passed notice** (`#not-passed-notice`) if `!unlocked` — lists exactly which thresholds were missed.
6. Shows the **Strict Mode prompt** (`#strict-mode-prompt`) once — only when `unlocked && completedCount === 1 && !seenStrictPrompt && !State.strictMode`. Dismissed via "Turn on Strict Mode" or "Not yet"; both set `seenStrictPrompt: true`.
7. Syncs the **Strict Mode toggle** (`#summary-strict-check`) with `State.strictMode`. The toggle updates Settings and `State` in both directions.
8. Renders problem key chips — keys that round to 0% error rate are excluded.
9. Shows/hides the **Next Lesson** button based on whether the next lesson is now unlocked. The **Next Lesson** button appears before the **Try Again** button in the DOM.
10. Calls `checkAchievements()` and `renderNewAchievements()` — always runs regardless of pass/fail.
11. Calls `fetchAiFeedback()`.

KeyNav for the summary is set in `showScreen('summary')`, not in `renderSummary()`.

### Live session colour coding

`updateStats()` calls `liveColourClass(value, target, thresholds)` to assign one of four CSS classes to `#live-wpm` and `#live-accuracy`:

- `live-good` → `--finger-index` (green) — at or above target
- `live-close` → `--finger-middle` (yellow) — within 20% below target (WPM) / within 3% below target (accuracy)
- `live-mid` → `--finger-ring` (orange) — within 40% below target (WPM) / within 7% below (accuracy)
- `live-low` → `--finger-pinky` (red) — below that

WPM colour only activates once `wpm > 0` to avoid red flash at session start.

---

## AI Feedback Integration

### Detection logic

```javascript
function isHosted() {
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}
```

- `file://` protocol → local mode → falls back to template feedback (no API key UI in settings)
- `http://` or `https://` → hosted mode → POST to `./server/proxy.php`

### Prompt format

The prompt sent to the model includes:
- Lesson number and phase
- Session WPM and accuracy
- Duration
- Top 3 problem keys with finger assignment and error rates (e.g. `K (Right Middle, 11% error rate)`) — finger label sourced from `KEY_INFO[key].finger`
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

1. **Hosted (proxy available)** → AI-generated coaching note displayed.
2. **No proxy (local file://)** → `generateTemplateFeedback(sessionData)` is called and its output is displayed silently with no error message.
3. **API call fails at runtime** → same template feedback, shown silently with no error message.

`generateTemplateFeedback(sessionData)` in `app.js` builds feedback from session data directly:
- Accuracy bracket (≥97% / ≥93% / ≥88% / below) → appropriate phrasing
- WPM bracket (≥50 / ≥30 / ≥15 / below) → pace commentary
- WPM trend from `computeTrend()` → improving / declining sentence if applicable
- Top problem key from `Tracker.getSessionProblemKeys(3)` → specific key tip

No errors are thrown and all other features work normally.

### History screen AI summary

`fetchHistoryAiFeedback(sessions)` in `app.js` is called from `renderHistory()` when `sessions.length >= 3`. It posts to the same proxy with a prompt summarising the student's overall arc: WPM at start vs recently, average accuracy, lessons completed, and persistent problem keys. The prompt instructs the model not to include a heading or title. Before rendering, any leading markdown heading line is stripped from the response via `.replace(/^#+\s*[^\n]*\n+/, '')`. The result appears in `#history-ai-text` inside `#history-ai-wrap` (`.ai-feedback` block) above the chart. A ↺ refresh button (`#btn-history-ai-refresh`) re-calls the function.

`generateHistoryTemplateFeedback(sessions)` is the fallback — called silently when not hosted or when the API call fails. It produces a 3–4 sentence summary covering sessions/lessons completed, WPM progress (early vs recent), accuracy bracket, and top problem keys. Indistinguishable in appearance from the AI version.

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

The **Save/Load Progress** feature is the recommended way for users to back up and transfer progress across devices or browsers. Export filename format: `homerow-lesson{N}-YYYY-MM-DD.json` where N is `currentLesson`.

If a future version requires shared cross-device progress (e.g. for a classroom), a database backend would need to be added. The localStorage schema above is the starting point for that design.

---

## Adding / Extending Features

### New lessons
Append to `LESSON_DATA` in `js/lessons.js`. Follow the existing schema.

### New settings
Add to the `preferences` object in `Storage.defaults()`, add a UI row in the Settings screen in `index.html`, and wire up the change handler in `bindGlobalEvents()` in `app.js`.

### Mobile detection

`isMobileDevice()` in `app.js` runs at the top of `init()`. If it returns `true`, the `#mobile-notice` overlay is shown and the app does not load. Detection uses two signals — either triggers the notice:
- `navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches` — touch-only device with no fine pointer
- `window.innerWidth < 600` — screen narrower than 600 px

### Screen persistence on refresh

`showScreen(name)` writes the screen name to `sessionStorage` (`homerow_screen`). On `init()`, if the user has existing data, this value is read back and used to restore the last screen. Only the screens `welcome`, `lessons`, `history`, and `settings` are restorable — `session` and `summary` are transient and fall back to `lessons`.

### New screens
1. Add a `<main id="screen-name">` block in `index.html`
2. Add a `.nav-btn[data-screen="name"]` button
3. Add rendering logic in `app.js → showScreen()` if needed
4. If it should be restorable on refresh, add it to the `restorable` array in `init()`

### Themes
`preferences.theme` (`"dark"` / `"light"`) is fully implemented. `applyTheme(theme)` in `app.js` toggles the `light` class on `<body>`. Add additional theme values by extending the CSS variable overrides in `style.css` and wiring them in `applyTheme()`.

---

## Known Limitations / Future Work

- No cross-device sync — localStorage only. Needs a backend for shared progress.
- No capital letters introduced in beginner/intermediate lessons. Advanced lessons include some via punctuation context.
- The history chart uses vanilla Canvas, not a charting library. It handles up to 30 sessions cleanly.
- Sound files (`keypress.wav`, `error.wav`) must be present in `assets/sounds/` for audio to work.
- The AI feedback prompt is designed for English. Multi-language support would need prompt adjustments.
