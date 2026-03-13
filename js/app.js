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
  //  INIT
  // ═══════════════════════════════════════════════════════════════════════════

  function init() {
    loadPreferences();
    buildKeyboard();
    bindGlobalEvents();
    initAudio();

    if (Storage.isFirstRun()) {
      Storage.initFresh();
      showScreen('welcome');
    } else {
      showScreen('lessons');
    }
  }

  function loadPreferences() {
    const prefs = Storage.getPreferences();
    State.soundEnabled = prefs.soundEnabled !== false;
    State.strictMode   = prefs.strictMode === true;
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

    // Update nav highlights
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === name);
    });

    // Screen-specific rendering
    if (name === 'lessons')  renderLessonSelect();
    if (name === 'history')  renderHistory();
    if (name === 'settings') renderSettings();
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
    showScreen('summary');
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

  function updateStats() {
    const wpm = getLiveWpm();
    const accuracy = getLiveAccuracy();

    const wpmEl = document.getElementById('live-wpm');
    if (wpmEl) wpmEl.textContent = wpm;

    const accEl = document.getElementById('live-accuracy');
    if (accEl) accEl.textContent = accuracy + '%';

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

    // Stats
    document.getElementById('summary-wpm').textContent = wpm;
    document.getElementById('summary-accuracy').textContent = accuracy + '%';
    document.getElementById('summary-duration').textContent = formatTime(duration);
    const lessonNumEl = document.getElementById('summary-lesson');
    if (lessonNumEl) lessonNumEl.textContent = `#${lessonId}`;

    // Colour the WPM
    const wpmEl = document.getElementById('summary-wpm');
    wpmEl.className = 'val ' + (wpm >= 40 ? 'good' : wpm >= 25 ? 'accent' : 'warning');

    // Accuracy colour
    const accEl = document.getElementById('summary-accuracy');
    accEl.className = 'val ' + (accuracy >= 95 ? 'good' : accuracy >= 85 ? 'accent' : 'warning');

    // Lesson unlocked banner
    const banner = document.getElementById('unlock-banner');
    if (unlocked && nextLesson) {
      banner.classList.remove('hidden');
      document.getElementById('unlock-lesson-title').textContent =
        `Lesson ${nextLesson.id}: ${nextLesson.title}`;
    } else {
      banner.classList.add('hidden');
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

    // AI feedback
    fetchAiFeedback(sessionData);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AI FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  function isHosted() {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
  }

  async function fetchAiFeedback(sessionData) {
    const feedbackEl = document.getElementById('ai-feedback-text');
    if (!feedbackEl) return;

    const proxyAvailable = isHosted();
    const apiKey = Storage.getApiKey();

    if (!proxyAvailable && !apiKey) {
      feedbackEl.innerHTML = `<span class="unavailable">Add your Anthropic API key in Settings to unlock personalised coaching feedback after each session.</span>`;
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
      feedbackEl.innerHTML = `<span class="unavailable">Feedback unavailable: ${escapeHtml(err.message)}</span>`;
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

    // Sound toggle
    const soundCheck = document.getElementById('setting-sound');
    if (soundCheck) soundCheck.checked = prefs.soundEnabled !== false;

    // Strict mode toggle
    const strictCheck = document.getElementById('setting-strict');
    if (strictCheck) strictCheck.checked = prefs.strictMode === true;

    // API key
    const apiInput = document.getElementById('setting-api-key');
    if (apiInput) apiInput.value = prefs.apiKey || '';
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

    // Toolbar navigation
    document.querySelectorAll('.nav-btn[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });

    // Sound toggle (toolbar)
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);

    // Welcome screen
    const startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.addEventListener('click', () => showScreen('lessons'));

    const importWelcome = document.getElementById('btn-import-welcome');
    if (importWelcome) importWelcome.addEventListener('click', triggerImport);

    // Summary screen
    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) retryBtn.addEventListener('click', () => {
      if (State.session) startSession(State.session.lessonId);
    });

    const lessonsFromSummary = document.getElementById('btn-lessons-from-summary');
    if (lessonsFromSummary) lessonsFromSummary.addEventListener('click', () => showScreen('lessons'));

    // Settings
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

    const apiInput = document.getElementById('setting-api-key');
    const saveApiBtn = document.getElementById('btn-save-api-key');
    if (saveApiBtn && apiInput) {
      saveApiBtn.addEventListener('click', () => {
        Storage.saveApiKey(apiInput.value.trim());
        showToast('API key saved.', 'success');
      });
    }

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
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
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
