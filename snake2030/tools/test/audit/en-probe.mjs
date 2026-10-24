// Sonde « ennemis / boss / niveaux » pour SNAKE 2030.
// Injectée une fois par page (réelle ou simulée). window.__EP.reset() entre deux parties,
// window.__EP.L est le journal.
export const PROBE_SRC = `
(function(){
  if (window.__EP) return;
  const S = window.__S, M = window.__M, K = window.__K;
  const EP = window.__EP = { L: null, seen: new Map(), lastBoss: null, lastRailed: false, lastLevel: 0, lastSample: -1e9, lastLen: 0, prevPhase: '', lastPk: '' };
  function fresh() {
    return { spawns: [], tele: [], hurts: [], kills: [], boss: [], samples: [], rails: [], levels: [], phases: [], winds: 0, t0: null, tEnd: null };
  }
  EP.reset = function(){ EP.L = fresh(); EP.seen = new Map(); EP.lastBoss = null; EP.lastRailed = false; EP.lastLevel = 0; EP.lastSample = -1e9; EP.lastLen = 0; EP.prevPhase=''; EP.lastPk=''; };
  EP.reset();
  function inView(x, y, m) {
    m = m || 0;
    return Math.abs(x - S.cam.x) < S.view.w * 0.5 + m && Math.abs(y - S.cam.y) < S.view.h * 0.5 + m;
  }
  function railed(){ try { return M.phases.railed(); } catch(e){ return false; } }
  function stateOf(e) {
    // signature d'état par type, pour détecter les transitions
    switch (e.type) {
      case 'chaser': case 'interceptor': case 'cutter': case 'mine': return e.st;
      case 'shooter': return e.aimT > 0 ? 1 : 0;
      case 'spawner': return e.st;
      case 'parasite': return e.st === 1 ? (e.warned ? 3 : 2) : 0;
      default: return 0;
    }
  }
  const WIND = { chaser: [0,1], interceptor: [0,1], cutter: [0,1], mine: [0,1], shooter: [0,1], spawner: [0,1], parasite: [2,3] };
  const ATK  = { chaser: [1,2], interceptor: [1,2], cutter: [1,2], shooter: [1,0], spawner: [1,0] };
  const END  = { chaser: [2,0], interceptor: [2,0], cutter: [2,3] };

  // --- ennemis : apparitions, transitions d'état ---
  const origUpd = M.enemies.update;
  M.enemies.update = function(e, dt) {
    const L = EP.L;
    let rec = EP.seen.get(e.id);
    if (!rec) {
      rec = { id: e.id, type: e.type, elite: !!e.elite, mod: e.mod, boss: !!e.boss, tSpawn: S.t, st: stateOf(e), tp: e.tpPh, lastWind: -1e9, lastAtk: -1e9, winds: 0, atks: 0, hurts: 0, firstView: inView(e.x, e.y, 0) ? S.t : -1, dSpawn: Math.hypot(e.x - S.snake.x, e.y - S.snake.y) };
      EP.seen.set(e.id, rec);
      L.spawns.push({ t: S.t, id: e.id, type: e.type, elite: rec.elite, mod: e.mod, boss: rec.boss, level: S.level, lph: S.levelPhase, inView: rec.firstView >= 0, d: Math.round(rec.dSpawn), hp: e.maxHp });
    }
    if (rec.firstView < 0 && inView(e.x, e.y, 0)) rec.firstView = S.t;
    const before = stateOf(e), tpb = e.tpPh, xb = e.x, yb = e.y;
    origUpd.call(M.enemies, e, dt);
    const after = stateOf(e);
    if (after !== before) {
      const w = WIND[e.type], a = ATK[e.type], en = END[e.type];
      let kind = null;
      if (w && before === w[0] && after === w[1]) kind = 'wind';
      else if (a && before === a[0] && after === a[1]) kind = 'attack';
      else if (en && before === en[0] && after === en[1]) kind = 'end';
      else if (e.type === 'parasite' && before === 0 && after === 2) kind = 'attach';
      if (kind) {
        const d = Math.hypot(e.x - S.snake.x, e.y - S.snake.y);
        if (kind === 'wind') { rec.lastWind = S.t; rec.winds++; L.winds++; }
        if (kind === 'attack') { rec.lastAtk = S.t; rec.atks++; }
        L.tele.push({ t: S.t, id: e.id, type: e.type, elite: rec.elite, mod: e.mod, boss: rec.boss, kind, d: Math.round(d), inView: inView(e.x, e.y, 0), railed: railed(), level: S.level, cs: e.cdScale || 1 });
      }
    }
    if (e.mTp) {
      if (tpb === 0 && e.tpPh === 1) { rec.lastTp = S.t; L.tele.push({ t: S.t, id: e.id, type: e.type, mod: 'teleporter', kind: 'tpwind', inView: inView(e.x, e.y, 0), d: Math.round(Math.hypot(e.x - S.snake.x, e.y - S.snake.y)) }); }
      if (Math.hypot(e.x - xb, e.y - yb) > 60) L.tele.push({ t: S.t, id: e.id, type: e.type, mod: 'teleporter', kind: 'tpjump', since: S.t - (rec.lastTp || S.t), inView: inView(e.x, e.y, 0), d: Math.round(Math.hypot(e.x - S.snake.x, e.y - S.snake.y)) });
    }
  };

  // --- morts ---
  const origDeath = M.enemies.onDeath;
  M.enemies.onDeath = function(e) {
    const rec = EP.seen.get(e.id);
    EP.L.kills.push({ t: S.t, id: e.id, type: e.type, elite: !!e.elite, mod: e.mod, boss: !!e.boss, age: Math.round(e.t), level: S.level, lph: S.levelPhase, winds: rec ? rec.winds : 0, atks: rec ? rec.atks : 0, hurts: rec ? rec.hurts : 0, inView: inView(e.x, e.y, 0), seenMs: rec && rec.firstView >= 0 ? Math.round(S.t - rec.firstView) : -1, railed: railed(), st: e.st, detonated: !!e.detonated });
    return origDeath.call(M.enemies, e);
  };

  // --- coups reçus : burst rouge de hurtSnake ---
  const origBurst = M.fx.burst;
  M.fx.burst = function(x, y, color, n, power, opts) {
    if (color === '#ff2e63' && n === 22 && S.phase === 'play') {
      const L = EP.L;
      let src = 'inconnu', id = null, type = null, mod = null, elite = false, boss = false, sinceWind = null, sinceAtk = null, seenMs = null, wasInView = null;
      let best = null, bd = 1e9;
      for (const e of S.enemies) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
      let bullet = null;
      for (const b of S.ebullets) { if (Math.abs(b.x - x) < 1.5 && Math.abs(b.y - y) < 1.5) { bullet = b; break; } }
      let rig = null, node = null;
      for (const h of (M.levels.hazards || [])) {
        if (h.kind === 'rig' && Math.abs(x - h.x) <= h.w2 + 2 && Math.abs(y - h.y) <= h.h2 + 2) rig = h;
        if (h.kind === 'pull' && Math.hypot(x - h.x, y - h.y) < 2) node = h;
      }
      if (best && bd < 1.5) {
        id = best.id; type = best.type; mod = best.mod; elite = !!best.elite; boss = !!best.boss;
        if (best.dead) src = 'blast:' + (best.type === 'mine' ? 'mine' : best.mod === 'explosive' ? 'explosive' : best.type);
        else if (best.type === 'parasite' && best.st === 1) src = 'parasite:bite';
        else if (best.type === 'cutter' && best.st === 2) src = 'cutter:dash';
        else if (best.type === 'chaser' && best.st === 2) src = 'chaser:lunge';
        else if (best.type === 'interceptor' && best.st === 2) src = 'interceptor:dash';
        else src = best.type + ':contact';
      } else if (bullet) { src = 'bullet'; }
      else if (rig) { src = 'rig'; const ri = EP.rigInfo(rig); var rigSeenMs = ri.seen >= 0 ? Math.round(S.t - ri.seen) : -1, rigAgeMs = Math.round(S.t - ri.t0), rigSpeed = Math.round(Math.hypot(rig.vx, rig.vy)); }
      else if (node) { src = 'node'; }
      else if (best && bd < best.r + K.HEAD_R + 6) { id = best.id; type = best.type; mod = best.mod; elite = !!best.elite; boss = !!best.boss; src = best.type + ':near'; }
      if (id !== null) {
        const rec = EP.seen.get(id);
        if (rec) { rec.hurts++; if (S.t - rec.lastWind < 4000) sinceWind = Math.round(S.t - rec.lastWind); if (S.t - rec.lastAtk < 4000) sinceAtk = Math.round(S.t - rec.lastAtk); seenMs = rec.firstView >= 0 ? Math.round(S.t - rec.firstView) : -1; }
        wasInView = best ? inView(best.x, best.y, 0) : null;
      }
      // où le coup tombe sur le corps : distance à la tête, index du segment le plus proche
      const hd = Math.hypot(x - S.snake.x, y - S.snake.y);
      let segIdx = -1, sbd = 1e9;
      for (let i = 0; i < S.snake.segs.length; i++) { const sg = S.snake.segs[i]; const dd = Math.hypot(sg.x - x, sg.y - y); if (dd < sbd) { sbd = dd; segIdx = i; } }
      const bodyHit = hd > K.HEAD_R + 12 && sbd < hd;
      L.hurts.push({ t: S.t, x: Math.round(x), y: Math.round(y), src, id, type, mod, elite, boss, sinceWind, sinceAtk, seenMs, wasInView, level: S.level, lph: S.levelPhase, railed: railed(), len: S.snake.len, ne: S.enemies.length, bossOn: !!S.boss, ph: (M.phases.state().phase || ''), headD: Math.round(hd), segIdx: bodyHit ? segIdx : -1, bodyHit, hitInView: inView(x, y, 0), zoom: +M.phases.state().zoom.toFixed(2), rigSeenMs: typeof rigSeenMs === 'number' ? rigSeenMs : undefined, rigAgeMs: typeof rigAgeMs === 'number' ? rigAgeMs : undefined, rigSpeed: typeof rigSpeed === 'number' ? rigSpeed : undefined });
    }
    return origBurst.apply(M.fx, arguments);
  };

  // --- convois : depuis quand chaque convoi est visible ---
  EP.rigs = new WeakMap();
  function rigInfo(h) {
    let r = EP.rigs.get(h);
    if (!r || Math.hypot(h.x - r.x, h.y - r.y) > 600) { r = { t0: S.t, seen: inView(h.x, h.y, 0) ? S.t : -1, x: h.x, y: h.y }; EP.rigs.set(h, r); }
    if (r.seen < 0 && inView(h.x, h.y, 0)) r.seen = S.t;
    r.x = h.x; r.y = h.y;
    return r;
  }
  EP.rigInfo = rigInfo;
  // --- passe par image : boss, treillis, échantillons ---
  function tick() {
    requestAnimationFrame(tick);
    if (S.phase !== 'play') return;
    const L = EP.L; if (!L) return;
    for (const h of (M.levels.hazards || [])) if (h.kind === 'rig') rigInfo(h);
    if (L.t0 === null) L.t0 = S.t;
    L.tEnd = S.t;
    // boss
    const b = S.boss;
    if (b && !EP.lastBoss) {
      EP.lastBoss = { id: b.id, name: b.name, type: b.type, mod: b.mod, hp: b.maxHp, t0: S.t, level: S.level, hurts0: L.hurts.length, kills0: L.kills.length, len0: S.snake.len, hpTrace: [] };
    }
    if (EP.lastBoss) {
      const cur = EP.lastBoss;
      const alive = S.enemies.find(e => e.id === cur.id);
      if (alive && S.t - (cur.lastTrace || -1e9) > 500) { cur.lastTrace = S.t; cur.hpTrace.push([Math.round(S.t - cur.t0), Math.round(alive.hp), alive.shHp === undefined ? -1 : alive.shHp, Math.round(Math.hypot(alive.x - S.snake.x, alive.y - S.snake.y)), inView(alive.x, alive.y, 0) ? 1 : 0]); }
      if (!b || b.id !== cur.id) {
        // fin de ce boss (mort ou relais/forfait)
        const stillAlive = !!alive && !alive.dead;
        const rec = EP.seen.get(cur.id);
        L.boss.push({ name: cur.name, type: cur.type, mod: cur.mod, hp: cur.hp, level: cur.level, t0: Math.round(cur.t0 - L.t0), dur: Math.round(S.t - cur.t0), outcome: stillAlive ? 'timeout' : 'killed', hurts: L.hurts.length - cur.hurts0, kills: L.kills.length - cur.kills0, lenLost: cur.len0 - S.snake.len, hpTrace: cur.hpTrace, id: cur.id, firstSeenMs: rec && rec.firstView >= 0 ? Math.round(rec.firstView - cur.t0) : -1, bossHurts: L.hurts.slice(cur.hurts0).filter(h => h.id === cur.id).length, winds: rec ? rec.winds : 0, atks: rec ? rec.atks : 0 });
        EP.lastBoss = null;
        if (b) { EP.lastBoss = { id: b.id, name: b.name, type: b.type, mod: b.mod, hp: b.maxHp, t0: S.t, level: S.level, hurts0: L.hurts.length, kills0: L.kills.length, len0: S.snake.len, hpTrace: [] }; }
      }
    }
    // niveaux : au changement, vérifier si un ancien boss survit
    if (S.level !== EP.lastLevel) {
      const survivors = [];
      for (const bb of L.boss) { if (bb.outcome === 'timeout') { const e = S.enemies.find(x => x.id === bb.id); if (e && !e.dead) survivors.push(bb.name); } }
      L.levels.push({ t: Math.round(S.t - L.t0), level: S.level, name: S.levelName, bossSurvivors: survivors, enemiesCarried: S.enemies.filter(e => !e.dead).length, len: S.snake.len });
      EP.lastLevel = S.level;
    }
    // treillis
    const r = railed();
    if (r !== EP.lastRailed) { L.rails.push({ t: Math.round(S.t - L.t0), on: r, axis: M.phases.state().axe, level: S.level, lph: S.levelPhase }); EP.lastRailed = r; }
    const pk = M.phases.state().phase || '';
    if (pk !== EP.lastPk) { L.phases.push({ t: Math.round(S.t - L.t0), kind: pk, level: S.level }); EP.lastPk = pk; }
    // échantillons
    if (S.t - EP.lastSample >= 1000) {
      EP.lastSample = S.t;
      const by = {}; let elites = 0, mods = 0, inv = 0;
      for (const e of S.enemies) { if (e.dead) continue; by[e.type] = (by[e.type] || 0) + 1; if (e.elite) elites++; if (e.mod) mods++; if (inView(e.x, e.y, 0)) inv++; }
      const ph = M.phases.state();
      // treillis : combien d'ennemis partagent la droite du serpent (file indienne sur mon rail)
      let onMyRail = 0, aheadOnRail = 0;
      if (r) {
        const ra = M.phases.railAng(S.snake.ang); const nx = -Math.sin(ra), ny = Math.cos(ra);
        const us = S.snake.x * nx + S.snake.y * ny;
        for (const e of S.enemies) { if (e.dead) continue; const ue = e.x * nx + e.y * ny; if (Math.abs(ue - us) < 14) { onMyRail++; const along = (e.x - S.snake.x) * Math.cos(ra) + (e.y - S.snake.y) * Math.sin(ra); if (along > 0 && along < 500) aheadOnRail++; } }
      }
      L.samples.push({ t: Math.round(S.t - L.t0), level: S.level, lph: S.levelPhase, by, ne: S.enemies.length, inv, elites, mods, eb: S.ebullets.length, len: S.snake.len, railed: r, pk, persp: Math.round(ph.perspDeg), boss: !!S.boss, kills: S.kills, rigs: (M.levels.hazards || []).filter(h => h.kind === 'rig').length, nodes: (M.levels.hazards || []).filter(h => h.kind === 'pull' || h.kind === 'push').length, int: +S.intensity.toFixed(2), onMyRail, aheadOnRail, zoom: +ph.zoom.toFixed(2) });
    }
  }
  requestAnimationFrame(tick);
})();
`;

/** Résumé compact d'un journal. */
export function summarize(L) {
  const dur = (L.tEnd - L.t0) / 1000;
  const bySrc = {};
  for (const h of L.hurts) bySrc[h.src] = (bySrc[h.src] || 0) + 1;
  const byType = {};
  for (const k of L.kills) { const t = k.type + (k.elite ? '*' : ''); byType[t] = (byType[t] || 0) + 1; }
  const tele = {};
  for (const h of L.hurts) {
    if (!h.type) continue;
    const key = h.src;
    tele[key] = tele[key] || { n: 0, sinceWind: [], noWind: 0, offscreen: 0 };
    tele[key].n++;
    if (h.sinceWind === null) tele[key].noWind++; else tele[key].sinceWind.push(h.sinceWind);
    if (h.seenMs !== null && h.seenMs >= 0 && h.seenMs < 500) tele[key].offscreen++;
  }
  return { dur: +dur.toFixed(1), hurts: L.hurts.length, bySrc, kills: L.kills.length, byType, boss: L.boss, levels: L.levels, rails: L.rails.length, tele };
}

export function pct(arr, p) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }
export function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
