/**
 * HomeRow — Problem Key Tracker
 * Tracks which keys the user misses most often and generates
 * targeted drill sequences for future sessions.
 * Exposed as window.Tracker.
 */

window.Tracker = (() => {

  // Session-level key stats (reset each session)
  let sessionStats = {};

  // ─── Session tracking ─────────────────────────────────────────────────────────

  function resetSession() {
    sessionStats = {};
  }

  function record(key, isCorrect) {
    const k = key.toLowerCase();
    if (!sessionStats[k]) sessionStats[k] = { misses: 0, total: 0 };
    sessionStats[k].total++;
    if (!isCorrect) sessionStats[k].misses++;

    // Also persist to storage
    if (window.Storage) window.Storage.recordKeyResult(k, isCorrect);
  }

  function getSessionStats() {
    return { ...sessionStats };
  }

  // ─── Problem key analysis ─────────────────────────────────────────────────────

  /**
   * Returns the top N problem keys from persistent storage,
   * sorted by error rate, filtered to keys with enough data.
   */
  function getTopProblemKeys(n = 5, minTotal = 10) {
    const stored = window.Storage ? window.Storage.getProblemKeys() : {};
    return Object.entries(stored)
      .filter(([, v]) => v.total >= minTotal)
      .map(([key, v]) => ({
        key,
        misses: v.misses,
        total: v.total,
        errorRate: v.misses / v.total,
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, n);
  }

  /**
   * Returns top problem keys from the current session only.
   */
  function getSessionProblemKeys(n = 3) {
    return Object.entries(sessionStats)
      .filter(([, v]) => v.total >= 3)
      .map(([key, v]) => ({
        key,
        misses: v.misses,
        total: v.total,
        errorRate: v.misses / v.total,
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, n);
  }

  // ─── Drill generation ─────────────────────────────────────────────────────────

  /**
   * Generates a short drill string targeting specific problem keys.
   * Mixes: isolated key repeats, adjacent-key combos, short words containing the key.
   */
  function generateDrill(problemKeys, lessonKeys) {
    if (!problemKeys || problemKeys.length === 0) return null;

    const keys = problemKeys.map(p => typeof p === 'string' ? p : p.key);
    const parts = [];

    // 1. Isolated repeats for each problem key
    keys.forEach(k => {
      parts.push(k.repeat(4));
    });

    // 2. Combos with adjacent home-row keys
    const homeRow = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];
    keys.forEach(k => {
      const neighbours = homeRow.filter(h => h !== k).slice(0, 2);
      neighbours.forEach(n => {
        parts.push(k + n + k);
      });
    });

    // 3. Short sequences alternating problem keys
    if (keys.length >= 2) {
      const seq = [];
      for (let i = 0; i < 6; i++) seq.push(keys[i % keys.length]);
      parts.push(seq.join(''));
    }

    // 4. Any lesson words containing the problem key
    const words = findWordsWithKeys(keys, lessonKeys);
    if (words.length > 0) parts.push(words.slice(0, 6).join(' '));

    return parts.join(' ');
  }

  /**
   * Returns common short English words that contain the given keys
   * and only use characters from the allowed set.
   */
  function findWordsWithKeys(targetKeys, allowedKeys) {
    const wordBank = [
      'add', 'aid', 'air', 'all', 'and', 'are', 'ask', 'bad', 'bag', 'ban',
      'bar', 'bat', 'bed', 'big', 'bit', 'box', 'boy', 'but', 'buy', 'can',
      'cap', 'car', 'cat', 'cot', 'cry', 'cup', 'cut', 'dad', 'day', 'did',
      'dig', 'dim', 'dip', 'dog', 'dot', 'dry', 'dug', 'ear', 'eat', 'egg',
      'end', 'era', 'eye', 'fad', 'fan', 'far', 'fat', 'fed', 'few', 'fig',
      'fin', 'fit', 'fix', 'fly', 'fog', 'for', 'fox', 'fun', 'fur', 'gap',
      'gas', 'gel', 'get', 'gig', 'gnu', 'got', 'gun', 'gut', 'had', 'ham',
      'has', 'hat', 'hay', 'her', 'hid', 'him', 'his', 'hit', 'hop', 'hot',
      'how', 'hub', 'hug', 'hum', 'ice', 'ill', 'ink', 'ion', 'jab', 'jag',
      'jam', 'jar', 'jaw', 'jet', 'job', 'jog', 'jot', 'joy', 'jug', 'jut',
      'keg', 'key', 'kid', 'kin', 'kit', 'lab', 'lag', 'lap', 'law', 'lay',
      'led', 'leg', 'let', 'lid', 'lip', 'lit', 'log', 'lot', 'low', 'map',
      'mat', 'men', 'met', 'mix', 'mob', 'mod', 'mom', 'mop', 'mud', 'mug',
      'nab', 'nap', 'net', 'new', 'nil', 'nod', 'nor', 'not', 'now', 'nun',
      'nut', 'oak', 'odd', 'oil', 'old', 'one', 'opt', 'orb', 'ore', 'our',
      'out', 'own', 'pad', 'pal', 'pan', 'pap', 'par', 'pat', 'paw', 'pay',
      'peg', 'pen', 'pet', 'pie', 'pig', 'pin', 'pit', 'pod', 'pop', 'pot',
      'pub', 'pug', 'pun', 'pup', 'put', 'rag', 'ram', 'ran', 'rap', 'rat',
      'raw', 'ray', 'red', 'ref', 'rep', 'rid', 'rig', 'rim', 'rip', 'rob',
      'rod', 'rot', 'row', 'rub', 'rug', 'run', 'rut', 'sad', 'sag', 'sap',
      'sat', 'saw', 'say', 'set', 'sew', 'sir', 'sit', 'six', 'ski', 'sky',
      'sly', 'sob', 'sod', 'son', 'sop', 'sow', 'spa', 'spy', 'sub', 'sum',
      'sun', 'tab', 'tag', 'tan', 'tap', 'tar', 'tax', 'ten', 'the', 'thy',
      'tie', 'tin', 'tip', 'toe', 'ton', 'too', 'top', 'tot', 'tow', 'toy',
      'tub', 'tug', 'two', 'urn', 'use', 'van', 'vat', 'via', 'vim', 'wag',
      'war', 'was', 'wax', 'web', 'wed', 'wet', 'who', 'why', 'wig', 'win',
      'wit', 'woe', 'wok', 'won', 'woo', 'wow', 'yam', 'yap', 'yaw', 'yea',
      'yet', 'yew', 'you', 'zap', 'zed', 'zen', 'zig', 'zip', 'zoo',
    ];

    const allowed = new Set(allowedKeys || []);
    if (allowed.size === 0) return [];

    return wordBank.filter(word => {
      const chars = word.split('');
      return (
        chars.some(c => targetKeys.includes(c)) &&
        chars.every(c => allowed.has(c))
      );
    });
  }

  /**
   * Merges current session problem keys with stored persistent keys
   * and saves back to storage. Call at end of session.
   */
  function flushSession() {
    if (!window.Storage) return;
    // Storage.recordKeyResult is called in real-time during record(),
    // so nothing extra needed here — just return session summary.
    return getSessionProblemKeys(5);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    resetSession,
    record,
    getSessionStats,
    getTopProblemKeys,
    getSessionProblemKeys,
    generateDrill,
    flushSession,
  };
})();
