/**
 * HomeRow — Main Application
 * Orchestrates all screens, session management, typing engine,
 * keyboard diagram, audio, AI feedback, and settings.
 *
 * Depends on (loaded before this file):
 *   window.Storage  — js/storage.js
 *   window.Tracker  — js/tracker.js
 *   window.Lessons  — js/lessons.js
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  //  APP STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const State = {
    currentScreen: null,
    // Session
    session: null,        // active session data
    exerciseIndex: 0,     // which exercise we're on
    sessionStart: null,   // Date when session began
    // Typing engine
    text: '',             // current exercise text
    position: 0,         // current char position
    errors: 0,           // errors this exercise
    correct: 0,          // correct keystrokes this exercise
    typingStart: null,   // Date when first key pressed
    exerciseComplete: false,
    // Accumulated across exercises in session
    totalCorrect: 0,
    totalErrors: 0,
    totalChars: 0,
    // Problem key drill injected?
    drillInjected: false,
    // Audio
    sounds: { keypress: null, error: null },
    soundReady: false,
    // Preferences (cached)
    soundEnabled: true,
    strictMode: false,
    // Timer
    wpmInterval: null,
    sessionTimerInterval: null,
    sessionElapsed: 0,   // seconds
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  KEYBOARD NAVIGATION — arrow key focus for multi-button screens/modals
  // ═══════════════════════════════════════════════════════════════════════════

  const KeyNav = (() => {
    let group  = [];
    let idx    = -1;  // -1 = no selection; set on first arrow press
    let active = false;

    function clearVisual() {
      group.forEach(b => b.classList.remove('kb-focus'));
    }

    function applyVisual() {
      if (idx >= 0 && idx < group.length) group[idx].classList.add('kb-focus');
    }

    // Called when mouse moves — exits keyboard mode, restoring normal hover styles
    function onMouse() {
      if (!active) return;
      active = false;
      idx = -1; // reset so next arrow press starts fresh from first/last button
      clearVisual();
    }

    function setGroup(buttons) {
      clearVisual();
      group  = (buttons || []).filter(b => b && !b.classList.contains('hidden') && !b.disabled);
      idx    = -1;
      active = false;
    }

    function move(delta) {
      if (group.length < 2) return false;
      active = true;
      if (idx === -1) {
        // First arrow press — land on first or last button depending on direction
        idx = delta > 0 ? 0 : group.length - 1;
      } else {
        idx = (idx + delta + group.length) % group.length;
      }
      clearVisual();
      applyVisual();
      return true;
    }

    function activate() {
      if (!active || idx < 0 || idx >= group.length) return false;
      group[idx].click();
      return true;
    }

    function clear() { clearVisual(); group = []; idx = -1; active = false; }
    function isActive() { return active && group.length > 0; }

    return { setGroup, onMouse, move, activate, clear, isActive };
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  //  KEY INFO — finger and reach descriptions for tutorials
  // ═══════════════════════════════════════════════════════════════════════════

  const KEY_INFO = {
    // Spacebar
    ' ': { finger: 'Either Thumb',  fingerClass: 'finger-thumb',           desc: 'Press with whichever thumb is closest — usually your right thumb.' },
    // Home row
    'a': { finger: 'Left Pinky',   fingerClass: 'finger-left-pinky',   desc: 'Home row anchor — your left pinky rests here at all times.' },
    's': { finger: 'Left Ring',    fingerClass: 'finger-left-ring',    desc: 'Home row — your left ring finger rests here.' },
    'd': { finger: 'Left Middle',  fingerClass: 'finger-left-middle',  desc: 'Home row — your left middle finger rests here.' },
    'f': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Home row anchor — feel the raised bump. Left index rests here.' },
    'j': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Home row anchor — feel the raised bump. Right index rests here.' },
    'k': { finger: 'Right Middle', fingerClass: 'finger-right-middle', desc: 'Home row — your right middle finger rests here.' },
    'l': { finger: 'Right Ring',   fingerClass: 'finger-right-ring',   desc: 'Home row — your right ring finger rests here.' },
    ';': { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Home row — your right pinky rests here.' },
    // Top row
    'q': { finger: 'Left Pinky',   fingerClass: 'finger-left-pinky',   desc: 'Reach up from A with your left pinky.' },
    'w': { finger: 'Left Ring',    fingerClass: 'finger-left-ring',    desc: 'Reach up from S with your left ring finger.' },
    'e': { finger: 'Left Middle',  fingerClass: 'finger-left-middle',  desc: 'Reach up from D with your left middle finger.' },
    'r': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Reach up from F with your left index finger.' },
    't': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Reach up and right from F with your left index finger.' },
    'y': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Reach up and left from J with your right index finger.' },
    'u': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Reach up from J with your right index finger.' },
    'i': { finger: 'Right Middle', fingerClass: 'finger-right-middle', desc: 'Reach up from K with your right middle finger.' },
    'o': { finger: 'Right Ring',   fingerClass: 'finger-right-ring',   desc: 'Reach up from L with your right ring finger.' },
    'p': { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Reach up from ; with your right pinky finger.' },
    // Home row extras
    'g': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Stretch right from F with your left index finger.' },
    'h': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Stretch left from J with your right index finger.' },
    // Bottom row
    'z': { finger: 'Left Pinky',   fingerClass: 'finger-left-pinky',   desc: 'Reach down from A with your left pinky.' },
    'x': { finger: 'Left Ring',    fingerClass: 'finger-left-ring',    desc: 'Reach down from S with your left ring finger.' },
    'c': { finger: 'Left Middle',  fingerClass: 'finger-left-middle',  desc: 'Reach down from D with your left middle finger.' },
    'v': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Reach down and left from F with your left index finger.' },
    'b': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Reach down and right from F with your left index finger.' },
    'n': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Reach down from J with your right index finger.' },
    'm': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Reach down and right from J with your right index finger.' },
    ',': { finger: 'Right Middle', fingerClass: 'finger-right-middle', desc: 'Reach down from K with your right middle finger.' },
    '.': { finger: 'Right Ring',   fingerClass: 'finger-right-ring',   desc: 'Reach down from L with your right ring finger.' },
    '/': { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Reach down from ; with your right pinky finger.' },
    // Number row
    '1': { finger: 'Left Pinky',   fingerClass: 'finger-left-pinky',   desc: 'Reach up from Q with your left pinky.' },
    '2': { finger: 'Left Ring',    fingerClass: 'finger-left-ring',    desc: 'Reach up from W with your left ring finger.' },
    '3': { finger: 'Left Middle',  fingerClass: 'finger-left-middle',  desc: 'Reach up from E with your left middle finger.' },
    '4': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Reach up from R with your left index finger.' },
    '5': { finger: 'Left Index',   fingerClass: 'finger-left-index',   desc: 'Reach up from T with your left index finger.' },
    '6': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Reach up from Y with your right index finger.' },
    '7': { finger: 'Right Index',  fingerClass: 'finger-right-index',  desc: 'Reach up from U with your right index finger.' },
    '8': { finger: 'Right Middle', fingerClass: 'finger-right-middle', desc: 'Reach up from I with your right middle finger.' },
    '9': { finger: 'Right Ring',   fingerClass: 'finger-right-ring',   desc: 'Reach up from O with your right ring finger.' },
    '0': { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Reach up from P with your right pinky finger.' },
    // Punctuation
    "'": { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Reach right from ; with your right pinky.' },
    '-': { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Reach up-right from P with your right pinky.' },
    '!': { finger: 'Left Pinky',   fingerClass: 'finger-left-pinky',   desc: 'Shift + 1 — reach up from Q with your left pinky.' },
    '?': { finger: 'Right Pinky',  fingerClass: 'finger-right-pinky',  desc: 'Shift + / — reach down from ; with your right pinky.' },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  function getMaxConsecutiveDays(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    const dates = [...new Set(sessions.map(s => s.date.split('T')[0]))].sort();
    if (dates.length === 1) return 1;
    let maxStreak = 1, streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
      if (diff === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 1;
    }
    return maxStreak;
  }

  const ACHIEVEMENTS = [
    {
      id: 'sharpshooter',
      name: 'Sharpshooter',
      description: 'Pass a lesson on your very first attempt with 90% accuracy or better.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="20" cy="20" r="13"/><circle cx="20" cy="20" r="6"/><circle cx="20" cy="20" r="2" fill="currentColor" stroke="none"/><line x1="20" y1="3" x2="20" y2="11"/><line x1="20" y1="29" x2="20" y2="37"/><line x1="3" y1="20" x2="11" y2="20"/><line x1="29" y1="20" x2="37" y2="20"/></svg>`,
      check: (s, data) => {
        const progress = data.lessonProgress && data.lessonProgress[s.lessonId];
        return s.accuracy >= 90 && progress && progress.attempts === 1 && progress.completed;
      },
    },
    {
      id: 'ghost_fingers',
      name: 'Ghost Fingers',
      description: 'Complete a session with 100% accuracy.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 34 C6 36 4 34 4 34 L4 17 C4 9 11 4 20 4 C29 4 36 9 36 17 L36 34 C36 34 34 36 32 34 C30 32 28 34 26 34 C24 32 22 34 20 34 C18 32 16 34 14 34 C12 32 10 34 8 34 Z"/><circle cx="15" cy="18" r="2" fill="currentColor" stroke="none"/><circle cx="25" cy="18" r="2" fill="currentColor" stroke="none"/></svg>`,
      check: (s) => s.accuracy === 100,
    },
    {
      id: 'iron_discipline',
      name: 'Iron Discipline',
      description: 'Achieve 95% accuracy or better in 5 sessions in a row.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4 L32 9 L32 20 C32 28 26 34 20 37 C14 34 8 28 8 20 L8 9 Z"/><polyline points="14,21 18,25 27,15"/></svg>`,
      check: (s, data) => {
        const ss = data.sessions;
        return ss.length >= 5 && ss.slice(-5).every(x => x.accuracy >= 95);
      },
    },
    {
      id: 'up_to_speed',
      name: 'Up to Speed',
      description: 'Hit 30 WPM or more in a session.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 30 A16 16 0 0 1 34 30"/><line x1="7.5" y1="33" x2="10.5" y2="30"/><line x1="32.5" y1="33" x2="29.5" y2="30"/><line x1="20" y1="14" x2="20" y2="17"/><line x1="20" y1="30" x2="28" y2="21" stroke-width="2.5"/><circle cx="20" cy="30" r="2" fill="currentColor" stroke="none"/></svg>`,
      check: (s) => s.wpm >= 30,
    },
    {
      id: 'full_send',
      name: 'Full Send',
      description: 'Hit 50 WPM or more in a session.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 30 A16 16 0 0 1 34 30"/><line x1="7.5" y1="33" x2="10.5" y2="30"/><line x1="32.5" y1="33" x2="29.5" y2="30"/><line x1="20" y1="14" x2="20" y2="17"/><line x1="20" y1="30" x2="32" y2="18" stroke-width="2.5"/><circle cx="20" cy="30" r="2" fill="currentColor" stroke="none"/></svg>`,
      check: (s) => s.wpm >= 50,
    },
    {
      id: 'keyboard_ninja',
      name: 'Keyboard Ninja',
      description: 'Hit 70 WPM or more in a session.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4 L24 16 L36 20 L24 24 L20 36 L16 24 L4 20 L16 16 Z"/></svg>`,
      check: (s) => s.wpm >= 70,
    },
    {
      id: 'showing_up',
      name: 'Showing Up',
      description: 'Complete sessions on 3 consecutive days.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="28" height="26" rx="3"/><line x1="6" y1="16" x2="34" y2="16"/><line x1="14" y1="5" x2="14" y2="11"/><line x1="26" y1="5" x2="26" y2="11"/><circle cx="14" cy="24" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="24" r="1.5" fill="currentColor" stroke="none"/><circle cx="26" cy="24" r="1.5" fill="currentColor" stroke="none"/></svg>`,
      check: (s, data) => getMaxConsecutiveDays(data.sessions) >= 3,
    },
    {
      id: 'habit_formed',
      name: 'Habit Formed',
      description: 'Complete sessions on 7 consecutive days.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 36 C13 36 8 30 8 24 C8 18 12 14 16 10 C16 15 18 17 20 17 C20 17 15 10 20 4 C22 10 26 15 28 20 C30 16 30 12 28 8 C34 13 32 20 32 24 C32 30 27 36 20 36 Z"/></svg>`,
      check: (s, data) => getMaxConsecutiveDays(data.sessions) >= 7,
    },
    {
      id: 'home_base',
      name: 'Home Base',
      description: 'Complete all Beginner lessons (1–7).',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,21 20,7 34,21"/><path d="M11 17 L11 34 L29 34 L29 17"/><rect x="15" y="25" width="10" height="9"/></svg>`,
      check: (s, data) => {
        const p = data.lessonProgress || {};
        return [1,2,3,4,5,6,7].every(id => p[id] && p[id].completed);
      },
    },
    {
      id: 'levelling_up',
      name: 'Levelling Up',
      description: 'Complete all Intermediate lessons (8–14).',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="28" x2="32" y2="28"/><line x1="8" y1="34" x2="32" y2="34"/><polyline points="20,6 20,24"/><polyline points="13,13 20,6 27,13"/></svg>`,
      check: (s, data) => {
        const p = data.lessonProgress || {};
        return [8,9,10,11,12,13,14].every(id => p[id] && p[id].completed);
      },
    },
    {
      id: 'full_board',
      name: 'The Full Board',
      description: 'Complete all Advanced lessons (15–20).',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="32" height="18" rx="3"/><rect x="8" y="15" width="4" height="4" rx="1"/><rect x="14" y="15" width="4" height="4" rx="1"/><rect x="20" y="15" width="4" height="4" rx="1"/><rect x="26" y="15" width="4" height="4" rx="1"/><rect x="11" y="21" width="4" height="4" rx="1"/><rect x="19" y="21" width="10" height="4" rx="1"/></svg>`,
      check: (s, data) => {
        const p = data.lessonProgress || {};
        return [15,16,17,18,19,20].every(id => p[id] && p[id].completed);
      },
    },
    {
      id: 'redemption_arc',
      name: 'Redemption Arc',
      description: 'Turn a problem key around — bring a key\'s error rate below 10% after extensive practice.',
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 34 C10 34 13 28 17 23 C21 18 24 15 28 11 C30 9 32 8 34 7"/><polyline points="27,7 34,7 34,14"/></svg>`,
      check: (s, data) => {
        const keys = data.problemKeys || {};
        return Object.values(keys).some(k => k.total >= 30 && (k.misses / k.total) < 0.10);
      },
    },
    {
      id: 'homerow_legend',
      name: 'The HomeRow Legend',
      description: 'Unlock every other achievement. The rarest honour HomeRow can bestow.',
      platinum: true,
      icon: `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 16 L8 10 L14 14 L20 4 L26 14 L32 10 L32 16 C32 26 27 33 20 36 C13 33 8 26 8 16 Z"/><polyline points="15,19 18,23 26,15"/></svg>`,
      check: (s, data) => {
        const unlocked = data.achievements || {};
        return ACHIEVEMENTS.filter(a => !a.platinum).every(a => !!unlocked[a.id]);
      },
    },
  ];

  function checkAchievements(sessionData) {
    const allData = Storage.getAll();
    const already = allData.achievements || {};
    const newlyUnlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (already[a.id]) continue;
      try {
        if (a.check(sessionData, allData)) {
          Storage.unlockAchievement(a.id);
          newlyUnlocked.push(a);
        }
      } catch (e) { /* silent */ }
    }
    return newlyUnlocked;
  }

  function renderNewAchievements(newlyUnlocked) {
    const banner = document.getElementById('new-achievements-banner');
    const list   = document.getElementById('new-achievements-list');
    if (!banner || !list) return;
    if (newlyUnlocked.length === 0) { banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    list.innerHTML = '';
    newlyUnlocked.forEach(a => {
      const item = document.createElement('div');
      item.className = 'new-achievement-item';
      item.innerHTML = `
        <div class="new-achievement-icon">${a.icon}</div>
        <div>
          <div class="new-achievement-name">${escapeHtml(a.name)}</div>
          <div class="new-achievement-desc">${escapeHtml(a.description)}</div>
        </div>`;
      list.appendChild(item);
    });
  }

  function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const unlocked = Storage.getAchievements();

    function makeCard(a) {
      const isUnlocked = !!unlocked[a.id];
      const card = document.createElement('div');
      card.className = 'achievement-card' +
        (isUnlocked ? ' unlocked' : ' locked') +
        (a.platinum ? ' platinum' : '');
      const dateStr = isUnlocked
        ? `<div class="achievement-date">Unlocked ${new Date(unlocked[a.id].unlockedAt).toLocaleDateString()}</div>`
        : '';
      card.innerHTML = `
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-info">
          <div class="achievement-name">${escapeHtml(a.name)}</div>
          <div class="achievement-desc">${escapeHtml(a.description)}</div>
          ${dateStr}
        </div>`;
      return card;
    }

    grid.innerHTML = '';
    ACHIEVEMENTS.forEach(a => grid.appendChild(makeCard(a)));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════════════════════

  function isMobileDevice() {
    const touchOnly = navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches;
    const narrowScreen = window.innerWidth < 600;
    return touchOnly || narrowScreen;
  }

  function init() {
    if (isMobileDevice()) {
      document.getElementById('mobile-notice').classList.remove('hidden');
      return;
    }

    loadPreferences();
    buildKeyboard();
    bindGlobalEvents();
    initAudio();

    if (Storage.isFirstRun()) {
      Storage.initFresh();
      showScreen('welcome');
    } else {
      const restorable = ['welcome', 'lessons', 'history', 'achievements', 'settings'];
      const last = sessionStorage.getItem('homerow_screen');
      showScreen(restorable.includes(last) ? last : 'lessons');
    }
  }

  function loadPreferences() {
    const prefs = Storage.getPreferences();
    State.soundEnabled = prefs.soundEnabled !== false;
    State.strictMode   = prefs.strictMode === true;
    State.theme        = prefs.theme === 'light' ? 'light' : 'dark';
    applyTheme(State.theme);
    updateSoundToggleUI();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.add('active');
    State.currentScreen = name;
    sessionStorage.setItem('homerow_screen', name);

    // Update nav highlights
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === name);
    });

    // Screen-specific rendering
    if (name === 'lessons')      renderLessonSelect();
    if (name === 'history')      renderHistory();
    if (name === 'achievements') renderAchievements();
    if (name === 'settings')     renderSettings();

    // Keyboard nav for multi-button screens
    if (name === 'welcome') {
      const data = Storage.getAll();
      const hasProgress = data.sessions && data.sessions.length > 0;
      document.getElementById('btn-start').textContent = hasProgress ? 'Continue Learning →' : 'Start Learning →';
      KeyNav.setGroup([
        document.getElementById('btn-start'),
        document.getElementById('btn-import-welcome'),
      ]);
    } else if (name === 'summary') {
      // renderSummary runs before showScreen, so btn-next-lesson visibility is already set
      KeyNav.setGroup([
        document.getElementById('btn-retry'),
        document.getElementById('btn-next-lesson'),
        document.getElementById('btn-lessons-from-summary'),
        document.getElementById('btn-save-summary'),
      ]);
    } else if (name === 'lessons') {
      KeyNav.setGroup([
        document.getElementById('btn-save-lessons'),
        document.getElementById('btn-load-lessons'),
      ]);
    } else {
      KeyNav.clear();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WELCOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function setupWelcomeScreen() {
    document.getElementById('btn-start').addEventListener('click', () => showScreen('lessons'));
    document.getElementById('btn-import-welcome').addEventListener('click', triggerImport);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LESSON SELECT
  // ═══════════════════════════════════════════════════════════════════════════

  function renderLessonSelect() {
    const currentLesson = Storage.getCurrentLesson();
    const lessons = Lessons.getAll();
    const phases = ['beginner', 'intermediate', 'advanced'];

    const container = document.getElementById('lessons-grid-root');
    container.innerHTML = '';

    phases.forEach(phase => {
      const phaseLessons = lessons.filter(l => l.phase === phase);
      if (phaseLessons.length === 0) return;

      const section = document.createElement('div');
      section.className = 'phase-section';

      const phaseLabels = {
        beginner:     'Beginner — Lessons 1–7 · 15–20 min',
        intermediate: 'Intermediate — Lessons 8–14 · 25–30 min',
        advanced:     'Advanced — Lessons 15+ · 30–45 min',
      };
      section.innerHTML = `<h3>${phaseLabels[phase]}</h3>`;

      const grid = document.createElement('div');
      grid.className = 'lessons-grid';

      phaseLessons.forEach(lesson => {
        const unlocked = Lessons.isUnlocked(lesson.id);
        const progress = Storage.getLessonProgress(lesson.id);
        const isCurrent = lesson.id === currentLesson;

        const card = document.createElement('div');
        card.className = [
          'lesson-card',
          !unlocked ? 'locked' : '',
          isCurrent ? 'current' : '',
          progress.completed ? 'completed' : '',
        ].filter(Boolean).join(' ');

        const statusIcon = progress.completed ? '✓' : (isCurrent ? '▶' : (!unlocked ? '🔒' : ''));
        const bestStats = progress.bestWpm > 0
          ? `<div class="best-stats">Best: <span class="stat">${progress.bestWpm} WPM</span> · <span class="stat">${progress.bestAccuracy}%</span></div>`
          : '';

        card.innerHTML = `
          <div class="lesson-num">Lesson ${lesson.id}</div>
          <h4>${lesson.title}</h4>
          <div class="lesson-keys">${lesson.subtitle}</div>
          ${bestStats}
          <div class="lesson-status">${statusIcon}</div>
        `;

        if (unlocked) {
          card.addEventListener('click', () => startSession(lesson.id));
        }

        grid.appendChild(card);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  function startSession(lessonId) {
    const lesson = Lessons.get(lessonId);
    if (!lesson) return;

    const prefs = Storage.getPreferences();

    // Chain: hand tutorial (once ever) → new key intro (when lesson has new keys) → session
    if (!prefs.seenHandTutorial) {
      showHandTutorial(() => {
        Storage.savePreference('seenHandTutorial', true);
        if (lesson.newKeys && lesson.newKeys.length > 0) {
          showNewKeyIntro(lesson, () => _beginSession(lessonId));
        } else {
          _beginSession(lessonId);
        }
      });
    } else if (lesson.newKeys && lesson.newKeys.length > 0) {
      showNewKeyIntro(lesson, () => _beginSession(lessonId));
    } else {
      _beginSession(lessonId);
    }
  }

  function showHandTutorial(onDone) {
    const modal = document.getElementById('modal-hand-tutorial');
    if (!modal) { onDone(); return; }
    modal.classList.add('open');
    const btn = document.getElementById('btn-hand-tutorial-done');
    const closeBtn = document.getElementById('btn-hand-tutorial-close');

    function dismiss() {
      modal.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      onDone();
    }
    function cancel() {
      modal.classList.remove('open');
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dismiss(); }
    }
    document.addEventListener('keydown', onKey);
    if (btn) btn.onclick = dismiss;
    if (closeBtn) closeBtn.onclick = cancel;
  }

  function showNewKeyIntro(lesson, onDone) {
    const modal = document.getElementById('modal-new-keys');
    const cardsEl = document.getElementById('new-key-cards');
    if (!modal || !cardsEl) { onDone(); return; }

    cardsEl.innerHTML = lesson.newKeys.map(key => {
      const info = KEY_INFO[key];
      if (!info) return '';
      const label = key === ' ' ? 'Space' : key.toUpperCase();
      return `
        <div class="new-key-card">
          <div class="key-badge-large ${info.fingerClass}">${label}</div>
          <div class="new-key-info">
            <div class="key-finger-label">${info.finger}</div>
            <div class="key-reach-desc">${info.desc}</div>
          </div>
        </div>`;
    }).join('');

    const noteEl = document.getElementById('new-keys-note');
    if (noteEl) {
      if (lesson.newKeysNote) {
        noteEl.textContent = lesson.newKeysNote;
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
      }
    }

    modal.classList.add('open');
    const btn = document.getElementById('btn-new-keys-done');
    const closeBtn = document.getElementById('btn-new-keys-close');

    function dismiss() {
      modal.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      onDone();
    }
    function cancel() {
      modal.classList.remove('open');
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dismiss(); }
    }
    document.addEventListener('keydown', onKey);
    if (btn) btn.onclick = dismiss;
    if (closeBtn) closeBtn.onclick = cancel;
  }

  function _beginSession(lessonId) {
    const lesson = Lessons.get(lessonId);
    Storage.setCurrentLesson(lessonId, lesson.phase);

    // Build exercise list — maybe inject problem key drill
    let exercises = [...lesson.exercises];
    const topProblems = Tracker.getTopProblemKeys(3);
    const allowedKeys = new Set(lesson.allKeys);
    const relevantProblems = topProblems.filter(p => allowedKeys.has(p.key) && p.errorRate > 0.2);

    if (relevantProblems.length > 0 && !State.drillInjected) {
      const drillText = Lessons.getProblemKeyDrill(lessonId, relevantProblems);
      if (drillText) {
        exercises.splice(1, 0, {
          id: 'problem-drill',
          type: 'drill',
          label: 'Problem Key Drill — ' + relevantProblems.map(p => p.key.toUpperCase()).join(' '),
          text: drillText,
        });
        State.drillInjected = true;
      }
    }

    State.session = {
      lessonId,
      lesson,
      exercises,
      wpmHistory: [],
      errorsByKey: {},
    };

    State.exerciseIndex = 0;
    State.totalCorrect = 0;
    State.totalErrors = 0;
    State.totalChars = 0;
    State.sessionStart = new Date();
    State.sessionElapsed = 0;
    Tracker.resetSession();

    // Update session header UI
    const sessionInfo = document.getElementById('session-lesson-title');
    if (sessionInfo) sessionInfo.textContent = `Lesson ${lesson.id}: ${lesson.title}`;

    const phaseBadge = document.getElementById('session-phase-badge');
    if (phaseBadge) {
      phaseBadge.textContent = lesson.phase;
      phaseBadge.className = `phase-badge ${lesson.phase}`;
    }

    const sessionLen = Lessons.getSessionLength(lessonId);
    const lenEl = document.getElementById('session-length');
    if (lenEl) lenEl.textContent = `~${sessionLen} min session`;

    showScreen('session');
    startSessionTimer();
    loadExercise(0);
  }

  function startSessionTimer() {
    if (State.sessionTimerInterval) clearInterval(State.sessionTimerInterval);
    State.sessionTimerInterval = setInterval(() => {
      State.sessionElapsed++;
    }, 1000);
  }

  function loadExercise(index) {
    const { exercises } = State.session;
    if (index >= exercises.length) {
      endSession();
      return;
    }

    State.exerciseIndex = index;
    const exercise = exercises[index];

    // Update exercise label
    const labelEl = document.getElementById('exercise-label');
    if (labelEl) labelEl.textContent = exercise.label || exercise.type;

    // Update exercise progress indicator
    const progressEl = document.getElementById('exercise-progress-label');
    if (progressEl) progressEl.textContent = `Exercise ${index + 1} of ${exercises.length}`;

    // Reset typing state
    State.text = exercise.text.trim();
    State.position = 0;
    State.errors = 0;
    State.correct = 0;
    State.typingStart = null;
    State.exerciseComplete = false;

    renderTypingText();
    updateProgressBar();
    updateStats();

    // Keyboard focus
    document.getElementById('typing-text').focus();
  }

  const PHASE_COMPLETIONS = {
    7:  {
      phase: 'Beginner',
      label: 'Beginner Complete',
      colour: 'var(--finger-index)',
      message: 'You\'ve built the foundation every great typist starts from. The home row is yours — now the full keyboard awaits.',
      achievementId: 'home_base',
    },
    14: {
      phase: 'Intermediate',
      label: 'Intermediate Complete',
      colour: 'var(--finger-middle)',
      message: 'Every letter of the alphabet, learned and locked in. You\'re typing real words with real speed now.',
      achievementId: 'levelling_up',
    },
    20: {
      phase: 'Advanced',
      label: 'Course Complete',
      colour: 'var(--finger-pinky)',
      message: 'You\'ve completed every lesson HomeRow has to offer. Numbers, punctuation, speed — all of it. You\'re a touch typist.',
      achievementId: 'full_board',
    },
  };

  function showPhaseComplete(phaseData) {
    const icon   = document.getElementById('phase-complete-icon');
    const label  = document.getElementById('phase-complete-label');
    const title  = document.getElementById('phase-complete-title');
    const msg    = document.getElementById('phase-complete-message');
    const aName  = document.getElementById('phase-complete-achievement-name');
    const screen = document.getElementById('screen-phase-complete');

    // Populate content
    label.textContent = phaseData.label;
    title.textContent = phaseData.phase === 'Advanced' ? 'You did it.' : 'Phase Complete!';
    msg.textContent   = phaseData.message;

    // Achievement icon + name
    const achievement = ACHIEVEMENTS.find(a => a.id === phaseData.achievementId);
    if (achievement) {
      icon.innerHTML  = achievement.icon;
      aName.textContent = achievement.name;
    }

    // Apply phase colour
    screen.style.setProperty('--phase-colour', phaseData.colour);

    showScreen('phase-complete');
  }

  function endSession() {
    if (State.sessionTimerInterval) clearInterval(State.sessionTimerInterval);
    if (State.wpmInterval) clearInterval(State.wpmInterval);

    const finalWpm = calculateSessionWpm();
    const finalAccuracy = calculateSessionAccuracy();

    const sessionData = {
      lessonId: State.session.lessonId,
      lesson: State.session.lesson.id,
      phase: State.session.lesson.phase,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      duration: State.sessionElapsed,
      problemKeys: Tracker.getSessionStats(),
    };

    const savedSession = Storage.addSession(sessionData);
    const unlocked = Storage.updateLessonProgress(
      State.session.lessonId,
      finalWpm,
      finalAccuracy
    );

    const nextLesson = Lessons.getNext(State.session.lessonId);
    Tracker.flushSession();
    State.drillInjected = false;

    renderSummary(sessionData, unlocked, nextLesson);

    // Check for phase completion — first-time pass of lesson 7, 14, or 20
    const lessonId = State.session.lessonId;
    const phaseData = PHASE_COMPLETIONS[lessonId];
    const progress = Storage.getLessonProgress(lessonId);
    if (phaseData && unlocked && progress.attempts === 1) {
      showPhaseComplete(phaseData);
    } else {
      showScreen('summary');
    }
  }

  function calculateSessionWpm() {
    if (!State.sessionStart) return 0;
    const minutes = (new Date() - State.sessionStart) / 60000;
    if (minutes < 0.05) return 0;
    return Math.round((State.totalCorrect / 5) / minutes);
  }

  function calculateSessionAccuracy() {
    const total = State.totalCorrect + State.totalErrors;
    if (total === 0) return 100;
    return Math.round((State.totalCorrect / total) * 100);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TYPING ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  function renderTypingText() {
    const container = document.getElementById('typing-text');
    container.innerHTML = '';

    State.text.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00a0' : ch; // non-breaking space for display
      span.dataset.char = ch;
      span.dataset.index = i;
      span.className = i === 0 ? 'current' : 'pending';
      container.appendChild(span);
    });

    highlightKey(State.text[0]);
  }

  function handleKeydown(e) {
    if (State.currentScreen !== 'session') return;
    if (State.exerciseComplete) return;

    // Ignore modifier-only keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) return;

    // Start timer on first keypress
    if (!State.typingStart) {
      State.typingStart = new Date();
      startWpmTicker();
    }

    const expected = State.text[State.position];
    let key = e.key;

    // Map Enter to newline if text has newlines (not used currently, but safe)
    if (key === 'Enter') key = '\n';

    if (key === 'Backspace') {
      handleBackspace();
      return;
    }

    // Only process printable single chars
    if (key.length !== 1) return;
    e.preventDefault();

    const isCorrect = key === expected;

    processKeystroke(key, expected, isCorrect);
  }

  function processKeystroke(key, expected, isCorrect) {
    const spans = document.getElementById('typing-text').children;
    const currentSpan = spans[State.position];

    if (isCorrect) {
      currentSpan.className = 'correct';
      currentSpan.dataset.actual = key;
      State.correct++;
      State.totalCorrect++;
      Tracker.record(expected, true);
      playSound('keypress');

      State.position++;

      if (State.position < State.text.length) {
        spans[State.position].className = 'current';
        highlightKey(State.text[State.position]);
      } else {
        // Exercise complete
        finishExercise(true);
      }
    } else {
      // Error
      State.errors++;
      State.totalErrors++;
      Tracker.record(expected, false);
      playSound('error');

      if (State.strictMode) {
        // In strict mode: shake the area, don't advance
        const area = document.querySelector('.typing-area');
        area.classList.remove('shake');
        void area.offsetWidth; // reflow to restart animation
        area.classList.add('shake');
        setTimeout(() => area.classList.remove('shake'), 400);
      } else {
        // Normal mode: mark error and advance
        currentSpan.className = 'error';
        currentSpan.dataset.actual = key;
        State.position++;

        if (State.position < State.text.length) {
          spans[State.position].className = 'current';
          highlightKey(State.text[State.position]);
        } else {
          // Completed with errors at end
          finishExercise(false);
        }
      }
    }

    updateProgressBar();
    updateStats();
  }

  function handleBackspace() {
    if (State.position <= 0) return;
    const spans = document.getElementById('typing-text').children;

    // Remove current cursor
    if (State.position < spans.length) {
      spans[State.position].className = 'pending';
    }

    State.position--;
    spans[State.position].className = 'current';
    highlightKey(State.text[State.position]);
    updateProgressBar();
  }

  function finishExercise(passedClean) {
    State.exerciseComplete = true;
    if (State.wpmInterval) clearInterval(State.wpmInterval);

    const accuracy = State.errors === 0
      ? 100
      : Math.round((State.correct / (State.correct + State.errors)) * 100);

    // If accuracy is below 80%, repeat this exercise
    if (accuracy < 80 && State.session.lesson.targetAccuracy) {
      setTimeout(() => {
        showToast('Accuracy below 80% — repeating drill.', 'info');
        loadExercise(State.exerciseIndex);
      }, 800);
      return;
    }

    // Advance
    setTimeout(() => {
      loadExercise(State.exerciseIndex + 1);
    }, 600);
  }

  function startWpmTicker() {
    if (State.wpmInterval) clearInterval(State.wpmInterval);
    State.wpmInterval = setInterval(updateStats, 1000);
  }

  // ─── Live stats display ───────────────────────────────────────────────────────

  function liveColourClass(value, target, thresholds) {
    // thresholds: [good, close, mid] as fractions of target
    if (value >= target * thresholds[0]) return 'live-good';
    if (value >= target * thresholds[1]) return 'live-close';
    if (value >= target * thresholds[2]) return 'live-mid';
    return 'live-low';
  }

  function updateStats() {
    const wpm = getLiveWpm();
    const accuracy = getLiveAccuracy();
    const lesson = State.session ? Lessons.get(State.session.lessonId) : null;

    const wpmEl = document.getElementById('live-wpm');
    if (wpmEl) {
      wpmEl.textContent = wpm;
      if (lesson && wpm > 0) {
        wpmEl.className = 'stat-val ' + liveColourClass(wpm, lesson.targetWpm, [1, 0.8, 0.6]);
      }
    }

    const accEl = document.getElementById('live-accuracy');
    if (accEl) {
      accEl.textContent = accuracy + '%';
      if (lesson) {
        const target = lesson.targetAccuracy || 90;
        accEl.className = 'stat-val ' + liveColourClass(accuracy, target, [1, 0.97, 0.93]);
      }
    }

    const timeEl = document.getElementById('session-time');
    if (timeEl) timeEl.textContent = formatTime(State.sessionElapsed);
  }

  function getLiveWpm() {
    if (!State.typingStart) return 0;
    const minutes = (new Date() - State.typingStart) / 60000;
    if (minutes < 0.02) return 0;
    return Math.round((State.correct / 5) / minutes);
  }

  function getLiveAccuracy() {
    const total = State.correct + State.errors;
    if (total === 0) return 100;
    return Math.round((State.correct / total) * 100);
  }

  function updateProgressBar() {
    const pct = State.text.length > 0 ? (State.position / State.text.length) * 100 : 0;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = pct + '%';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  KEYBOARD DIAGRAM
  // ═══════════════════════════════════════════════════════════════════════════

  function buildKeyboard() {
    const diagram = document.getElementById('keyboard-diagram');
    if (!diagram) return;

    const layout = Lessons.getKeyboardLayout();

    // Offsets to simulate staggered keyboard rows
    const rowOffsets = [0, 18, 28, 36]; // px

    layout.forEach((row, rowIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      rowEl.style.marginLeft = rowOffsets[rowIdx] + 'px';

      row.forEach(key => {
        const keyEl = document.createElement('div');
        keyEl.className = 'kb-key';
        keyEl.dataset.key = key;
        keyEl.textContent = key.toUpperCase();

        const finger = Lessons.getFingerFor(key);
        if (finger) keyEl.dataset.finger = finger;

        rowEl.appendChild(keyEl);
      });

      diagram.appendChild(rowEl);
    });

    // Spacebar row
    const spaceRow = document.createElement('div');
    spaceRow.className = 'kb-row';
    spaceRow.style.marginLeft = '80px';
    spaceRow.style.marginTop = '4px';
    const spacebar = document.createElement('div');
    spacebar.className = 'kb-spacebar';
    spacebar.dataset.key = ' ';
    spacebar.id = 'kb-spacebar';
    spaceRow.appendChild(spacebar);
    diagram.appendChild(spaceRow);
  }

  function highlightKey(char) {
    // Remove all existing highlights
    document.querySelectorAll('.kb-key.active').forEach(k => k.classList.remove('active'));
    const spacebar = document.getElementById('kb-spacebar');
    if (spacebar) spacebar.classList.remove('active');

    if (!char) return;

    const lower = char.toLowerCase();
    if (lower === ' ') {
      if (spacebar) spacebar.classList.add('active');
      return;
    }

    const key = document.querySelector(`.kb-key[data-key="${lower}"]`);
    if (key) key.classList.add('active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUMMARY SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function renderSummary(sessionData, unlocked, nextLesson) {
    const { wpm, accuracy, duration, phase, lessonId } = sessionData;
    const lesson = Lessons.get(lessonId);
    const targetWpm = lesson ? lesson.targetWpm : null;
    const targetAccuracy = lesson ? (lesson.targetAccuracy || 90) : 90;

    // Stats
    document.getElementById('summary-wpm').textContent = wpm;
    document.getElementById('summary-accuracy').textContent = accuracy + '%';
    document.getElementById('summary-duration').textContent = formatTime(duration);
    const lessonNumEl = document.getElementById('summary-lesson');
    if (lessonNumEl) lessonNumEl.textContent = `#${lessonId}`;

    // Target sub-labels
    const wpmTargetEl = document.getElementById('summary-wpm-target');
    if (wpmTargetEl) wpmTargetEl.textContent = targetWpm ? `Target: ${targetWpm}` : '';
    const accTargetEl = document.getElementById('summary-acc-target');
    if (accTargetEl) accTargetEl.textContent = `Target: ${targetAccuracy}%`;

    // Colour the WPM
    const wpmEl = document.getElementById('summary-wpm');
    wpmEl.className = 'val ' + (wpm >= 40 ? 'good' : wpm >= 25 ? 'accent' : 'warning');

    // Accuracy colour
    const accEl = document.getElementById('summary-accuracy');
    accEl.className = 'val ' + (accuracy >= 95 ? 'good' : accuracy >= 85 ? 'accent' : 'warning');

    // Header copy — changes based on pass/fail
    const headerEl = document.querySelector('#screen-summary .summary-header');
    if (headerEl) {
      headerEl.querySelector('h2').textContent = unlocked ? 'Session Complete 🎉' : 'Session Complete';
      headerEl.querySelector('p').textContent = unlocked ? 'Great work — lesson passed!' : 'Here\'s how you did.';
    }

    // Lesson unlocked banner
    const banner = document.getElementById('unlock-banner');
    if (unlocked && nextLesson) {
      banner.classList.remove('hidden');
      document.getElementById('unlock-lesson-title').textContent =
        `Lesson ${nextLesson.id}: ${nextLesson.title}`;
    } else {
      banner.classList.add('hidden');
    }

    // Not-passed notice
    const notPassed = document.getElementById('not-passed-notice');
    const reasonsList = document.getElementById('not-passed-reasons');
    if (!unlocked) {
      const lesson = Lessons.get(lessonId);
      const targetWpm = lesson ? lesson.targetWpm : 20;
      const targetAccuracy = lesson ? (lesson.targetAccuracy || 90) : 90;
      reasonsList.innerHTML = '';
      if (accuracy < targetAccuracy) {
        const li = document.createElement('li');
        li.className = 'not-passed-fail';
        li.textContent = `Accuracy: ${accuracy}% — need ${targetAccuracy}%`;
        reasonsList.appendChild(li);
      }
      if (wpm < targetWpm) {
        const li = document.createElement('li');
        li.className = 'not-passed-fail';
        li.textContent = `Speed: ${wpm} WPM — need ${targetWpm} WPM`;
        reasonsList.appendChild(li);
      }
      notPassed.classList.remove('hidden');
    } else {
      notPassed.classList.add('hidden');
    }

    // Problem keys
    const sessionProblems = Tracker.getSessionProblemKeys(5);
    const problemList = document.getElementById('problem-key-list');
    problemList.innerHTML = '';

    if (sessionProblems.length === 0) {
      problemList.innerHTML = '<span class="text-dim text-sm">No significant problem keys this session. Great work!</span>';
    } else {
      sessionProblems.forEach(pk => {
        const chip = document.createElement('div');
        chip.className = 'problem-key-chip';
        const rate = Math.round(pk.errorRate * 100);
        chip.innerHTML = `
          <span>${pk.key === ' ' ? 'space' : pk.key.toUpperCase()}</span>
          <span class="rate">${rate}% error</span>
        `;
        problemList.appendChild(chip);
      });
    }

    // Next lesson button
    const nextBtn = document.getElementById('btn-next-lesson');
    if (nextBtn) {
      if (nextLesson && Lessons.isUnlocked(nextLesson.id)) {
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = `Start Lesson ${nextLesson.id} →`;
        nextBtn.onclick = () => startSession(nextLesson.id);
      } else {
        nextBtn.classList.add('hidden');
      }
    }

    // Strict Mode toggle — sync with current preference
    const summaryStrictCheck = document.getElementById('summary-strict-check');
    if (summaryStrictCheck) {
      summaryStrictCheck.checked = State.strictMode;
    }

    // Strict Mode prompt — show once after first-ever lesson pass
    const strictPrompt = document.getElementById('strict-mode-prompt');
    if (strictPrompt) {
      const prefs = Storage.getAll().preferences;
      const completedCount = Object.values(Storage.getAll().lessonProgress || {}).filter(l => l.completed).length;
      if (unlocked && completedCount === 1 && !prefs.seenStrictPrompt && !State.strictMode) {
        strictPrompt.classList.remove('hidden');
      } else {
        strictPrompt.classList.add('hidden');
      }
    }

    // Achievements
    const newlyUnlocked = checkAchievements(sessionData);
    renderNewAchievements(newlyUnlocked);

    // AI feedback
    fetchAiFeedback(sessionData);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AI FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  function isHosted() {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
  }

  function generateTemplateFeedback(sessionData) {
    const recentSessions = Storage.getRecentSessions(5);
    const trend = computeTrend(recentSessions);
    const topProblems = Tracker.getSessionProblemKeys(3);

    const sentences = [];

    // Accuracy sentence
    if (sessionData.accuracy >= 97) {
      sentences.push(`Outstanding accuracy at ${sessionData.accuracy}% — your fingers are landing exactly where they need to.`);
    } else if (sessionData.accuracy >= 93) {
      sentences.push(`Solid accuracy at ${sessionData.accuracy}% — you're building clean habits that will pay off as speed increases.`);
    } else if (sessionData.accuracy >= 88) {
      sentences.push(`Accuracy at ${sessionData.accuracy}% is a good foundation, though slowing down slightly on tricky keys will help lock in cleaner muscle memory.`);
    } else {
      sentences.push(`Accuracy at ${sessionData.accuracy}% suggests you're pushing pace a little faster than your fingers are ready for — prioritise hitting the right key over hitting it quickly.`);
    }

    // Speed sentence
    if (sessionData.wpm >= 50) {
      sentences.push(`${sessionData.wpm} WPM is strong, confident typing.`);
    } else if (sessionData.wpm >= 30) {
      sentences.push(`${sessionData.wpm} WPM shows you're finding a good rhythm.`);
    } else if (sessionData.wpm >= 15) {
      sentences.push(`${sessionData.wpm} WPM is a steady pace for this stage — consistency now builds speed later.`);
    } else {
      sentences.push(`Focus on accuracy over speed for now — the WPM will follow naturally once your fingers know where to go.`);
    }

    // Trend sentence
    if (trend === 'improving') {
      sentences.push(`Your speed has been trending upward across recent sessions — keep it up.`);
    } else if (trend === 'declining') {
      sentences.push(`Your WPM has dipped slightly compared to recent sessions — that can happen when tackling harder keys, so don't be discouraged.`);
    }

    // Problem key tip
    if (topProblems.length > 0) {
      const worst = topProblems[0];
      const keyName = worst.key === ' ' ? 'the space bar' : `the ${worst.key.toUpperCase()} key`;
      sentences.push(`Your most-missed key this session was ${keyName} — try practising it in slow, deliberate repetitions before your next session.`);
    }

    return sentences.join(' ');
  }

  async function fetchAiFeedback(sessionData) {
    const feedbackEl = document.getElementById('ai-feedback-text');
    if (!feedbackEl) return;

    const proxyAvailable = isHosted();
    const apiKey = Storage.getApiKey();

    // No API available — show template feedback
    if (!proxyAvailable && !apiKey) {
      const template = generateTemplateFeedback(sessionData);
      feedbackEl.innerHTML = `<p>${escapeHtml(template)}</p>`;
      return;
    }

    feedbackEl.innerHTML = `<span class="loading">Generating your coaching feedback…</span>`;

    // Build prompt from session data
    const recentSessions = Storage.getRecentSessions(5);
    const trend = computeTrend(recentSessions);

    const topProblems = Tracker.getSessionProblemKeys(3);
    const problemStr = topProblems.length > 0
      ? topProblems.map(p => `${p.key === ' ' ? 'space' : p.key.toUpperCase()} (${Math.round(p.errorRate * 100)}% error rate)`).join(', ')
      : 'none significant';

    const prompt = `You are a friendly, encouraging touch-typing coach. Give a short (3–4 sentence) personalised feedback summary for a student who just completed a typing session.

Session data:
- Lesson: ${sessionData.lessonId} (${sessionData.phase} phase)
- WPM: ${sessionData.wpm}
- Accuracy: ${sessionData.accuracy}%
- Duration: ${formatTime(sessionData.duration)}
- Top problem keys: ${problemStr}
- WPM trend vs last 3 sessions: ${trend}

Be specific, warm, and actionable. Don't repeat stats verbatim — interpret them. Give one concrete tip for improvement. Keep it under 80 words.`;

    try {
      let feedback;

      if (proxyAvailable) {
        // Hosted: call proxy
        const resp = await fetch('./server/proxy.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        feedback = data.feedback;
      } else {
        // Local: call Anthropic API directly
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        feedback = data.content[0].text;
      }

      feedbackEl.innerHTML = `<p>${escapeHtml(feedback)}</p>`;
    } catch (err) {
      // API failed — fall back to template feedback silently
      const template = generateTemplateFeedback(sessionData);
      feedbackEl.innerHTML = `<p>${escapeHtml(template)}</p>`;
    }
  }

  function computeTrend(sessions) {
    if (sessions.length < 2) return 'not enough data yet';
    const recent = sessions.slice(-3);
    const older  = sessions.slice(-6, -3);
    if (older.length === 0) return 'first few sessions';
    const recentAvg = avg(recent.map(s => s.wpm));
    const olderAvg  = avg(older.map(s => s.wpm));
    const diff = recentAvg - olderAvg;
    if (diff > 3)  return `improving (+${Math.round(diff)} WPM)`;
    if (diff < -3) return `slightly slower (${Math.round(diff)} WPM)`;
    return 'holding steady';
  }

  function avg(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HISTORY SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function renderHistory() {
    const sessions = Storage.getSessions();

    if (sessions.length === 0) {
      document.getElementById('history-empty').classList.remove('hidden');
      document.getElementById('history-content').classList.add('hidden');
      return;
    }

    document.getElementById('history-empty').classList.add('hidden');
    document.getElementById('history-content').classList.remove('hidden');

    renderChart(sessions);
    renderHistoryTable(sessions);

    if (sessions.length >= 3) {
      fetchHistoryAiFeedback(sessions);
    } else {
      document.getElementById('history-ai-wrap').classList.add('hidden');
    }
  }

  function generateHistoryTemplateFeedback(sessions) {
    const data        = Storage.getAll();
    const all         = sessions.slice(-30);
    const recent      = all.slice(-3);
    const early       = all.slice(0, 3);
    const avgWpm      = arr => Math.round(arr.reduce((a, s) => a + s.wpm, 0) / arr.length);
    const avgAcc      = arr => Math.round(arr.reduce((a, s) => a + s.accuracy, 0) / arr.length);
    const wpmEarly    = avgWpm(early);
    const wpmRecent   = avgWpm(recent);
    const accRecent   = avgAcc(recent);
    const currentLesson = data.currentLesson || 1;
    const lessonsCompleted = Object.values(data.lessonProgress || {}).filter(l => l.completed).length;

    const topKeys = Object.entries(data.problemKeys || {})
      .map(([k, v]) => ({ key: k, rate: v.total > 0 ? v.misses / v.total : 0, total: v.total }))
      .filter(k => k.total >= 10 && k.rate > 0.15)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 2);

    const sentences = [];

    // Sessions + lesson progress
    if (lessonsCompleted > 0) {
      sentences.push(`You've completed ${all.length} session${all.length !== 1 ? 's' : ''} and passed ${lessonsCompleted} lesson${lessonsCompleted !== 1 ? 's' : ''} — currently on lesson ${currentLesson}.`);
    } else {
      sentences.push(`You've completed ${all.length} session${all.length !== 1 ? 's' : ''} and are on lesson ${currentLesson}.`);
    }

    // WPM progress
    if (all.length >= 6 && wpmRecent > wpmEarly + 2) {
      sentences.push(`Your speed has grown from around ${wpmEarly} WPM early on to ${wpmRecent} WPM recently — a solid improvement.`);
    } else if (all.length >= 6 && wpmRecent < wpmEarly - 2) {
      sentences.push(`Your recent WPM (${wpmRecent}) is a little lower than your earlier average (${wpmEarly}) — that's normal when tackling harder keys, keep going.`);
    } else {
      sentences.push(`You're averaging around ${wpmRecent} WPM recently with ${accRecent}% accuracy.`);
    }

    // Accuracy note
    if (accRecent >= 95) {
      sentences.push(`Your accuracy is excellent — keep prioritising clean strokes as speed builds.`);
    } else if (accRecent >= 90) {
      sentences.push(`Your accuracy is solid at ${accRecent}% — a little more focus on problem keys will push it higher.`);
    } else {
      sentences.push(`Accuracy at ${accRecent}% is the main area to focus on — slow down slightly and aim for clean keystrokes before pushing speed.`);
    }

    // Problem keys
    if (topKeys.length > 0) {
      const keyNames = topKeys.map(k => k.key === ' ' ? 'Space' : k.key.toUpperCase()).join(' and ');
      sentences.push(`Your most persistent problem key${topKeys.length > 1 ? 's are' : ' is'} ${keyNames} — give ${topKeys.length > 1 ? 'them' : 'it'} extra attention in your next session.`);
    }

    return sentences.join(' ');
  }

  async function fetchHistoryAiFeedback(sessions) {
    const wrap = document.getElementById('history-ai-wrap');
    const el   = document.getElementById('history-ai-text');
    if (!el) return;
    wrap.classList.remove('hidden');
    el.innerHTML = `<span class="loading">Generating your progress summary…</span>`;

    if (!isHosted()) {
      el.innerHTML = `<p>${escapeHtml(generateHistoryTemplateFeedback(sessions))}</p>`;
      return;
    }

    const data = Storage.getAll();
    const allSessions = sessions.slice(-30);
    const first  = allSessions[0];
    const recent = allSessions.slice(-5);
    const avgWpm = n => Math.round(n.reduce((a, s) => a + s.wpm, 0) / n.length);
    const avgAcc = n => Math.round(n.reduce((a, s) => a + s.accuracy, 0) / n.length);

    const lessonsCompleted = Object.values(data.lessonProgress || {}).filter(l => l.completed).length;
    const currentLesson    = data.currentLesson || 1;

    const topKeys = Object.entries(data.problemKeys || {})
      .map(([k, v]) => ({ key: k, rate: v.total > 0 ? v.misses / v.total : 0, total: v.total }))
      .filter(k => k.total >= 10 && k.rate > 0.15)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
    const problemStr = topKeys.length > 0
      ? topKeys.map(k => `${k.key === ' ' ? 'Space' : k.key.toUpperCase()} (${Math.round(k.rate * 100)}% error rate)`).join(', ')
      : 'none';

    const wpmFirst  = avgWpm(allSessions.slice(0, 3));
    const wpmRecent = avgWpm(recent);
    const accRecent = avgAcc(recent);

    const prompt = `You are a friendly, encouraging touch-typing coach. Write a short (4–5 sentence) overall progress summary for a student based on their practice history.

Student data:
- Total sessions: ${allSessions.length}
- Lessons completed: ${lessonsCompleted}, currently on lesson ${currentLesson}
- WPM when they started: ~${wpmFirst} WPM
- WPM recently (last 5 sessions): ~${wpmRecent} WPM
- Recent average accuracy: ${accRecent}%
- Persistent problem keys: ${problemStr}

Comment on their overall trajectory, acknowledge what they've built, and give one specific focus for their next sessions. Be warm and concrete. Under 100 words.`;

    try {
      const resp = await fetch('./server/proxy.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      el.innerHTML = `<p>${escapeHtml(result.feedback)}</p>`;
    } catch {
      el.innerHTML = `<p>${escapeHtml(generateHistoryTemplateFeedback(sessions))}</p>`;
    }
  }

  function renderChart(sessions) {
    const canvas = document.getElementById('history-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Use last 30 sessions
    const data = sessions.slice(-30);

    const W = canvas.offsetWidth || 800;
    const H = 220;
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    if (data.length === 0) return;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    const maxWpm = Math.max(...data.map(s => s.wpm), 10);
    const maxAcc = 100;

    function xPos(i) {
      return padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    }
    function yWpm(wpm) {
      return padding.top + chartH - (wpm / maxWpm) * chartH;
    }
    function yAcc(acc) {
      return padding.top + chartH - (acc / maxAcc) * chartH;
    }

    // ─ Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();
    }

    // ─ Phase milestone markers
    let lastPhase = null;
    data.forEach((s, i) => {
      if (s.phase !== lastPhase) {
        lastPhase = s.phase;
        if (i > 0) {
          const x = xPos(i);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, padding.top);
          ctx.lineTo(x, H - padding.bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = '10px system-ui';
          ctx.fillText(s.phase, x + 3, padding.top + 10);
        }
      }
    });

    // ─ Accuracy line (dashed, secondary)
    ctx.strokeStyle = '#4cbb8f';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    data.forEach((s, i) => {
      const x = xPos(i), y = yAcc(s.accuracy);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // ─ WPM line (solid, primary)
    ctx.strokeStyle = '#5b8cf7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((s, i) => {
      const x = xPos(i), y = yWpm(s.wpm);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // ─ WPM dots
    ctx.fillStyle = '#5b8cf7';
    data.forEach((s, i) => {
      ctx.beginPath();
      ctx.arc(xPos(i), yWpm(s.wpm), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // ─ Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxWpm / 4) * (4 - i));
      ctx.fillText(val, padding.left - 6, padding.top + (chartH / 4) * i + 4);
    }

    // ─ X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Sessions', W / 2, H - 2);
  }

  function renderHistoryTable(sessions) {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';

    // Show most recent first
    const recent = [...sessions].reverse().slice(0, 20);

    recent.forEach(s => {
      const tr = document.createElement('tr');
      const date = new Date(s.date);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

      tr.innerHTML = `
        <td>${dateStr} ${timeStr}</td>
        <td>Lesson ${s.lesson}</td>
        <td><span class="badge ${s.phase}">${s.phase}</span></td>
        <td style="color: var(--accent); font-weight: 600;">${s.wpm}</td>
        <td style="color: ${s.accuracy >= 90 ? 'var(--success)' : s.accuracy >= 80 ? 'var(--warning)' : 'var(--error)'}; font-weight: 600;">${s.accuracy}%</td>
        <td style="color: var(--text-dim);">${formatTime(s.duration)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SETTINGS SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  function renderSettings() {
    const prefs = Storage.getPreferences();

    // Theme toggle
    const themeCheck = document.getElementById('setting-theme');
    if (themeCheck) themeCheck.checked = (prefs.theme === 'light');

    // Sound toggle
    const soundCheck = document.getElementById('setting-sound');
    if (soundCheck) soundCheck.checked = prefs.soundEnabled !== false;

    // Strict mode toggle
    const strictCheck = document.getElementById('setting-strict');
    if (strictCheck) strictCheck.checked = prefs.strictMode === true;

  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUDIO
  // ═══════════════════════════════════════════════════════════════════════════

  function initAudio() {
    // Attempt to load WAV files from assets/sounds/
    // These must be generated first using tools/sound-generator.html
    loadSound('keypress', './assets/sounds/keypress.wav');
    loadSound('error', './assets/sounds/error.wav');
  }

  function loadSound(name, path) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = path;
    audio.addEventListener('canplaythrough', () => {
      State.sounds[name] = audio;
    }, { once: true });
    audio.addEventListener('error', () => {
      // Sound file not found — silently skip (sounds are optional)
      State.sounds[name] = null;
    });
  }

  function playSound(type) {
    if (!State.soundEnabled) return;
    const snd = State.sounds[type];
    if (!snd) return;
    try {
      const clone = snd.cloneNode();
      clone.volume = type === 'keypress' ? 0.4 : 0.6;
      clone.play().catch(() => {}); // ignore autoplay errors
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  THEME TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  function applyTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    updateThemeToggleUI(theme);
  }

  function toggleTheme() {
    State.theme = State.theme === 'light' ? 'dark' : 'light';
    Storage.savePreference('theme', State.theme);
    applyTheme(State.theme);
    // Sync settings checkbox
    const check = document.getElementById('setting-theme');
    if (check) check.checked = State.theme === 'light';
  }

  function updateThemeToggleUI(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'light') {
      btn.textContent = '☀️';
      btn.title = 'Switch to dark mode';
    } else {
      btn.textContent = '🌙';
      btn.title = 'Switch to light mode';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SOUND TOGGLE
  // ═══════════════════════════════════════════════════════════════════════════

  function toggleSound() {
    State.soundEnabled = !State.soundEnabled;
    Storage.savePreference('soundEnabled', State.soundEnabled);
    updateSoundToggleUI();
    // Also sync the settings checkbox
    const check = document.getElementById('setting-sound');
    if (check) check.checked = State.soundEnabled;
  }

  function updateSoundToggleUI() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    if (State.soundEnabled) {
      btn.textContent = '🔊';
      btn.classList.add('on');
      btn.classList.remove('off');
      btn.title = 'Sound on — click to mute';
    } else {
      btn.textContent = '🔇';
      btn.classList.remove('on');
      btn.classList.add('off');
      btn.title = 'Sound off — click to enable';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  EXPORT / IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  function triggerExport() {
    const filename = Storage.exportData();
    showToast(`Progress exported as ${filename}`, 'success');
  }

  function triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = Storage.importData(ev.target.result);
        if (result.ok) {
          showToast('Progress imported successfully!', 'success');
          loadPreferences();
          renderLessonSelect();
        } else {
          showToast('Import failed: ' + result.error, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function confirmReset() {
    document.getElementById('modal-reset').classList.add('open');
    KeyNav.setGroup([
      document.getElementById('btn-cancel-reset'),
      document.getElementById('btn-confirm-reset'),
    ]);
  }

  function executeReset() {
    Storage.clearAll();
    Storage.initFresh();
    document.getElementById('modal-reset').classList.remove('open');
    loadPreferences();
    showToast('All progress reset.', 'info');
    showScreen('welcome');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  EVENT BINDING
  // ═══════════════════════════════════════════════════════════════════════════

  function bindGlobalEvents() {
    // Typing — capture all keydown events
    document.addEventListener('keydown', handleKeydown);

    // Toolbar navigation (includes logo button)
    document.querySelectorAll('[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });

    // Theme toggle (toolbar)
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Sound toggle (toolbar)
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);

    // Welcome screen
    const startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.addEventListener('click', () => showScreen('lessons'));

    const importWelcome = document.getElementById('btn-import-welcome');
    if (importWelcome) importWelcome.addEventListener('click', triggerImport);

    // Phase complete screen
    const phaseContinueBtn = document.getElementById('btn-phase-continue');
    if (phaseContinueBtn) phaseContinueBtn.addEventListener('click', () => showScreen('summary'));

    // Summary screen
    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) retryBtn.addEventListener('click', () => {
      if (State.session) startSession(State.session.lessonId);
    });

    const lessonsFromSummary = document.getElementById('btn-lessons-from-summary');
    if (lessonsFromSummary) lessonsFromSummary.addEventListener('click', () => showScreen('lessons'));

    const saveSummaryBtn = document.getElementById('btn-save-summary');
    if (saveSummaryBtn) saveSummaryBtn.addEventListener('click', triggerExport);

    // Summary strict toggle
    const summaryStrictCheck = document.getElementById('summary-strict-check');
    if (summaryStrictCheck) {
      summaryStrictCheck.addEventListener('change', () => {
        State.strictMode = summaryStrictCheck.checked;
        Storage.savePreference('strictMode', summaryStrictCheck.checked);
        const settingsCheck = document.getElementById('setting-strict');
        if (settingsCheck) settingsCheck.checked = summaryStrictCheck.checked;
      });
    }

    // Strict Mode prompt buttons
    const strictYesBtn = document.getElementById('btn-strict-yes');
    if (strictYesBtn) {
      strictYesBtn.addEventListener('click', () => {
        State.strictMode = true;
        Storage.savePreference('strictMode', true);
        Storage.savePreference('seenStrictPrompt', true);
        const settingsCheck = document.getElementById('setting-strict');
        if (settingsCheck) settingsCheck.checked = true;
        if (summaryStrictCheck) summaryStrictCheck.checked = true;
        document.getElementById('strict-mode-prompt').classList.add('hidden');
      });
    }
    const strictNoBtn = document.getElementById('btn-strict-no');
    if (strictNoBtn) {
      strictNoBtn.addEventListener('click', () => {
        Storage.savePreference('seenStrictPrompt', true);
        document.getElementById('strict-mode-prompt').classList.add('hidden');
      });
    }

    // Lessons screen
    const saveLessonsBtn = document.getElementById('btn-save-lessons');
    if (saveLessonsBtn) saveLessonsBtn.addEventListener('click', triggerExport);

    const loadLessonsBtn = document.getElementById('btn-load-lessons');
    if (loadLessonsBtn) loadLessonsBtn.addEventListener('click', triggerImport);

    const historyRefreshBtn = document.getElementById('btn-history-ai-refresh');
    if (historyRefreshBtn) historyRefreshBtn.addEventListener('click', () => {
      const sessions = Storage.getSessions();
      if (sessions.length >= 3) fetchHistoryAiFeedback(sessions);
    });

    // Settings
    const themeSettingCheck = document.getElementById('setting-theme');
    if (themeSettingCheck) themeSettingCheck.addEventListener('change', () => {
      State.theme = themeSettingCheck.checked ? 'light' : 'dark';
      Storage.savePreference('theme', State.theme);
      applyTheme(State.theme);
    });

    const soundCheck = document.getElementById('setting-sound');
    if (soundCheck) soundCheck.addEventListener('change', () => {
      State.soundEnabled = soundCheck.checked;
      Storage.savePreference('soundEnabled', soundCheck.checked);
      updateSoundToggleUI();
    });

    const strictCheck = document.getElementById('setting-strict');
    if (strictCheck) strictCheck.addEventListener('change', () => {
      State.strictMode = strictCheck.checked;
      Storage.savePreference('strictMode', strictCheck.checked);
    });

    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', triggerExport);

    const importBtn = document.getElementById('btn-import');
    if (importBtn) importBtn.addEventListener('click', triggerImport);

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', confirmReset);

    const confirmResetBtn = document.getElementById('btn-confirm-reset');
    if (confirmResetBtn) confirmResetBtn.addEventListener('click', executeReset);

    const cancelResetBtn = document.getElementById('btn-cancel-reset');
    if (cancelResetBtn) cancelResetBtn.addEventListener('click', () => {
      document.getElementById('modal-reset').classList.remove('open');
      KeyNav.clear();
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
          KeyNav.clear();
        }
      });
    });

    // Exit keyboard nav mode the moment the mouse moves
    document.addEventListener('mousemove', () => KeyNav.onMouse(), { passive: true });

    // Arrow key navigation for multi-button screens and modals
    document.addEventListener('keydown', (e) => {
      if (State.currentScreen === 'session') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (KeyNav.move(-1)) e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (KeyNav.move(1)) e.preventDefault();
      } else if ((e.key === ' ' || e.key === 'Enter') && KeyNav.isActive()) {
        e.preventDefault();
        KeyNav.activate();
      }
    });

    // Typing area click to focus
    const typingText = document.getElementById('typing-text');
    if (typingText) {
      typingText.setAttribute('tabindex', '0');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  function formatTime(seconds) {
    if (!seconds || seconds < 1) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════════════════

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
