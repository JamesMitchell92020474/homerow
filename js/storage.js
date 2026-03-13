/**
 * HomeRow — Storage Module
 * Handles all localStorage operations, export, and import.
 * Exposed as window.Storage.
 */

window.Storage = (() => {
  const KEY = 'homerow_data';
  const VERSION = '1.0';

  // ─── Default data structure ──────────────────────────────────────────────────

  function defaults() {
    return {
      version: VERSION,
      currentLesson: 1,
      currentPhase: 'beginner',
      sessions: [],
      problemKeys: {}, // { "f": { misses: 0, total: 0 } }
      lessonProgress: {}, // { 1: { completed: false, bestWpm: 0, bestAccuracy: 0, attempts: 0 } }
      preferences: {
        soundEnabled: true,
        strictMode: false,
        apiKey: '',
        theme: 'dark',
        seenHandTutorial: false,
      },
    };
  }

  // ─── Core get / save ─────────────────────────────────────────────────────────

  function getAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Merge with defaults to handle schema upgrades gracefully
      return Object.assign({}, defaults(), data, {
        preferences: Object.assign({}, defaults().preferences, data.preferences || {}),
      });
    } catch (e) {
      console.warn('HomeRow: failed to parse localStorage data', e);
      return null;
    }
  }

  function saveAll(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error('HomeRow: failed to save data', e);
    }
  }

  function isFirstRun() {
    return localStorage.getItem(KEY) === null;
  }

  function initFresh() {
    const data = defaults();
    saveAll(data);
    return data;
  }

  // ─── Progress ────────────────────────────────────────────────────────────────

  function getCurrentLesson() {
    return (getAll() || defaults()).currentLesson;
  }

  function getCurrentPhase() {
    return (getAll() || defaults()).currentPhase;
  }

  function setCurrentLesson(lessonId, phase) {
    const data = getAll() || defaults();
    data.currentLesson = lessonId;
    if (phase) data.currentPhase = phase;
    saveAll(data);
  }

  function getLessonProgress(lessonId) {
    const data = getAll() || defaults();
    return data.lessonProgress[lessonId] || { completed: false, bestWpm: 0, bestAccuracy: 0, attempts: 0 };
  }

  function updateLessonProgress(lessonId, wpm, accuracy) {
    const data = getAll() || defaults();
    const prev = data.lessonProgress[lessonId] || { completed: false, bestWpm: 0, bestAccuracy: 0, attempts: 0 };
    const bestWpm = Math.max(prev.bestWpm, wpm);
    const bestAccuracy = Math.max(prev.bestAccuracy, accuracy);
    // Unlock if thresholds met
    const lesson = window.Lessons ? window.Lessons.get(lessonId) : null;
    const targetWpm = lesson ? lesson.targetWpm : 20;
    const targetAccuracy = lesson ? lesson.targetAccuracy : 90;
    const completed = prev.completed || (wpm >= targetWpm && accuracy >= targetAccuracy);
    data.lessonProgress[lessonId] = {
      completed,
      bestWpm,
      bestAccuracy,
      attempts: (prev.attempts || 0) + 1,
    };
    saveAll(data);
    return completed;
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  function addSession(session) {
    const data = getAll() || defaults();
    session.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    session.date = new Date().toISOString();
    data.sessions.push(session);
    // Keep last 200 sessions
    if (data.sessions.length > 200) data.sessions = data.sessions.slice(-200);
    saveAll(data);
    return session;
  }

  function getSessions() {
    return (getAll() || defaults()).sessions;
  }

  function getRecentSessions(n) {
    const sessions = getSessions();
    return sessions.slice(-n);
  }

  // ─── Problem keys ────────────────────────────────────────────────────────────

  function getProblemKeys() {
    return (getAll() || defaults()).problemKeys;
  }

  function saveProblemKeys(keys) {
    const data = getAll() || defaults();
    data.problemKeys = keys;
    saveAll(data);
  }

  function recordKeyResult(key, isCorrect) {
    const data = getAll() || defaults();
    if (!data.problemKeys[key]) data.problemKeys[key] = { misses: 0, total: 0 };
    data.problemKeys[key].total++;
    if (!isCorrect) data.problemKeys[key].misses++;
    saveAll(data);
  }

  // ─── Preferences ─────────────────────────────────────────────────────────────

  function getPreferences() {
    return (getAll() || defaults()).preferences;
  }

  function savePreference(key, value) {
    const data = getAll() || defaults();
    data.preferences[key] = value;
    saveAll(data);
  }

  function getApiKey() {
    return getPreferences().apiKey || '';
  }

  function saveApiKey(key) {
    savePreference('apiKey', key);
  }

  // ─── Export / Import ─────────────────────────────────────────────────────────

  function exportData() {
    const data = getAll() || defaults();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const filename = `homerow-progress-${date}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  }

  function importData(json) {
    try {
      const data = JSON.parse(json);
      if (!data || typeof data !== 'object') throw new Error('Invalid format');
      // Merge with defaults so new fields are always present
      const merged = Object.assign({}, defaults(), data, {
        preferences: Object.assign({}, defaults().preferences, data.preferences || {}),
      });
      saveAll(merged);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ─── Reset ───────────────────────────────────────────────────────────────────

  function clearAll() {
    localStorage.removeItem(KEY);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    isFirstRun,
    initFresh,
    getAll,
    saveAll,
    getCurrentLesson,
    getCurrentPhase,
    setCurrentLesson,
    getLessonProgress,
    updateLessonProgress,
    addSession,
    getSessions,
    getRecentSessions,
    getProblemKeys,
    saveProblemKeys,
    recordKeyResult,
    getPreferences,
    savePreference,
    getApiKey,
    saveApiKey,
    exportData,
    importData,
    clearAll,
  };
})();
