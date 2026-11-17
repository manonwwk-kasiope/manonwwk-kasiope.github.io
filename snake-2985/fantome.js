(() => {
  'use strict';

  const prefix = 'snake2985.echo.';
  const limit = 2000;
  const best = new Map();
  let recording = null, lastLoss = null, playback = null;
  let cursor = 0, now = 0;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(prefix + key)); }
    catch { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); }
    catch { /* L’écho reste disponible pour cette session. */ }
  }
  const preference = 'v1.enabled';
  let enabled = read(preference) !== false;

  function keyFor(year, width, height) { return 'v2.' + width + 'x' + height + '.' + year; }

  // Chaque triplet contient l'horloge du jeu en centièmes, puis la case x, y.
  function valid(record, year, width, height) {
    if (!record || record.year !== year || record.width !== width || record.height !== height
      || !Number.isSafeInteger(record.score) || record.score < 0
      || !Array.isArray(record.path) || record.path.length < 6 || record.path.length > limit * 3
      || record.path.length % 3 || !Number.isSafeInteger(record.until)) return false;
    let prior = -1;
    for (let i = 0; i < record.path.length; i += 3) {
      const time = record.path[i], x = record.path[i + 1], y = record.path[i + 2];
      if (!Number.isSafeInteger(time) || time <= prior || !Number.isInteger(x) || !Number.isInteger(y)
        || x < 0 || x >= width || y < 0 || y >= height) return false;
      prior = time;
    }
    return record.until >= prior;
  }
  function stronger(a, b) {
    return !b || a.score > b.score || (a.score === b.score && a.until > b.until);
  }
  function recordFor(year, width, height) {
    const key = keyFor(year, width, height), saved = read(key), cached = best.get(key);
    if (valid(saved, year, width, height) && stronger(saved, cached)) best.set(key, saved);
    return best.get(key);
  }
  function begin(year, options = {}) {
    const width = options.width || 36, height = options.height || 18;
    const past = options.timejump && lastLoss?.width === width && lastLoss?.height === height && lastLoss;
    playback = past || recordFor(year, width, height) || null;
    lastLoss = null;
    recording = { year, width, height, score: 0, until: 0, path: [] };
    cursor = 0;
    now = 0;
    return message();
  }
  function update(state) {
    if (!recording || state.year !== recording.year || !Number.isFinite(state.elapsed)) return;
    if (state.width !== recording.width || state.height !== recording.height) {
      recording.width = state.width;
      recording.height = state.height;
      recording.path.length = 0;
      playback = recordFor(state.year, state.width, state.height) || null;
      cursor = 0;
    }
    now = Math.max(0, Math.round(state.elapsed * 100));
    const head = state.snake?.[0], path = recording.path, n = path.length;
    if (!head || n >= limit * 3 || !Number.isInteger(head.x) || !Number.isInteger(head.y)
      || head.x < 0 || head.x >= state.width || head.y < 0 || head.y >= state.height) return;
    if (n && head.x === path[n - 2] && head.y === path[n - 1]) return;
    const step = Math.round((state.elapsed - (state.stepClock || 0)) * 100);
    path.push(n ? Math.max(path[n - 3] + 1, step) : 0, head.x, head.y);
  }
  function end(state) {
    if (!recording || state.year !== recording.year) return;
    update(state);
    const entry = recording;
    recording = playback = null;
    if (entry.path.length < 6) return;
    entry.score = state.score;
    const endStep = entry.path[entry.path.length - 3];
    entry.until = entry.path.length === limit * 3 ? endStep : Math.max(endStep, now);
    lastLoss = state.status === 'dead' ? entry : null;
    if (stronger(entry, recordFor(entry.year, entry.width, entry.height))) {
      const key = keyFor(entry.year, entry.width, entry.height);
      best.set(key, entry);
      save(key, entry);
    }
  }
  function active() { return !!(enabled && playback && now <= playback.until); }
  function message() {
    return active() ? 'Le trait pointillé rejoue ton passage en ' + playback.year + '.' : '';
  }
  function setEnabled(value) {
    enabled = !!value;
    save(preference, enabled);
    return enabled;
  }

  function draw(canvas, state, reducedMotion = false) {
    if (!active() || !canvas || state.year !== recording?.year) return;
    const path = playback.path;
    while (cursor + 3 < path.length && path[cursor + 3] <= now) cursor += 3;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(canvas.width / state.width, 0, 0, canvas.height / state.height, 0, 0);
    ctx.strokeStyle = 'rgba(225,225,246,.44)';
    ctx.lineWidth = .085;
    ctx.lineCap = 'round';
    ctx.setLineDash([.12, .21]);
    ctx.beginPath();
    const start = Math.max(0, cursor - 12);
    for (let i = start; i <= cursor; i += 3) {
      const x = path[i + 1] + .5, y = path[i + 2] + .5;
      if (i === start) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (!reducedMotion && cursor + 3 < path.length) {
      const t = (now - path[cursor]) / (path[cursor + 3] - path[cursor]);
      ctx.lineTo(.5 + path[cursor + 1] + t * (path[cursor + 4] - path[cursor + 1]),
        .5 + path[cursor + 2] + t * (path[cursor + 5] - path[cursor + 2]));
    }
    ctx.stroke();
    ctx.restore();
  }
  window.SnakeEcho = Object.freeze({ begin, update, end, draw, active, message, setEnabled, getEnabled: () => enabled });
})();
