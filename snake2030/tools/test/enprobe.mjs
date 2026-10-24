// Sonde « menaces » (copie versionnée et allégée de scratchpad/en-probe.mjs, étendue pour G6).
// Injectée une fois par page (réelle ou simulée) ; window.__EP.reset() entre deux parties, window.__EP.L est le journal.
//
// Ce qu'elle enregistre :
//  - spawns : première image de chaque ennemi, inView à cet instant, distance à la tête, couvée (brood) ou vague ;
//  - tele   : transitions d'état par ennemi — 'wind' (ouverture de la fenêtre d'armement), 'attack', 'end' —
//             avec inView à l'instant de la transition et la durée annonce → attaque ;
//  - hurts  : chaque coup encaissé, sa source (bullet, cutter:dash, contact…), l'indice du segment touché,
//             et depuis combien de temps l'ennemi source était visible (seenMs) ;
//  - unknown: coups détectés par la chute de S.snake.len sans burst rouge identifiable (garde-fou d'attribution).
export const PROBE_SRC = `
(function(){
  if (window.__EP) return;
  const S = window.__S, M = window.__M, K = window.__K;
  const EP = window.__EP = { L: null, seen: new Map(), lastLen: 0, lastFrameHurt: -1 };
  const CHILD = new Set();
  try { for (const k in M.enemies.defs) { const c = M.enemies.defs[k].child; if (c) CHILD.add(c); } } catch(e){}
  function fresh() { return { spawns: [], tele: [], hurts: [], kills: [], winds: 0, unknown: 0, t0: null, tEnd: null }; }
  EP.reset = function(){ EP.L = fresh(); EP.seen = new Map(); EP.lastLen = S.snake ? S.snake.len : 0; };
  EP.reset();
  function inView(x, y, m) {                 // même définition que le coeur : étendue réellement visible
    m = m || 0;
    const P = M.phases, V = (P && P.visibleExtent) ? P.visibleExtent() : null;
    if (V) return x > V.x0 - m && x < V.x1 + m && y > V.y0 - m && y < V.y1 + m;
    return Math.abs(x - S.cam.x) < S.view.w * 0.5 + m && Math.abs(y - S.cam.y) < S.view.h * 0.5 + m;
  }
  EP.inView = inView;
  function railed(){ try { return M.phases.railed(); } catch(e){ return false; } }
  function stateOf(e) {
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

  // une couvée est un enfant (defs[*].child) apparu au contact d'une pondeuse vivante
  function isBrood(e) {
    if (!CHILD.has(e.type)) return false;
    for (const o of S.enemies) { if (o === e || o.dead || !o.child) continue; if (Math.hypot(o.x - e.x, o.y - e.y) < 90) return true; }
    return false;
  }

  const origUpd = M.enemies.update;
  M.enemies.update = function(e, dt) {
    const L = EP.L;
    let rec = EP.seen.get(e.id);
    if (!rec) {
      const vis = inView(e.x, e.y, 0);
      rec = { id: e.id, type: e.type, elite: !!e.elite, mod: e.mod, boss: !!e.boss, tSpawn: S.t, st: stateOf(e),
        lastWind: -1e9, lastAtk: -1e9, winds: 0, atks: 0, hurts: 0, firstView: vis ? S.t : -1, brood: isBrood(e) };
      EP.seen.set(e.id, rec);
      L.spawns.push({ t: S.t, id: e.id, type: e.type, elite: rec.elite, mod: e.mod, boss: rec.boss, brood: rec.brood,
        level: S.level, lph: S.levelPhase, inView: vis, d: Math.round(Math.hypot(e.x - S.snake.x, e.y - S.snake.y)) });
    }
    if (rec.firstView < 0 && inView(e.x, e.y, 0)) rec.firstView = S.t;
    const before = stateOf(e);
    origUpd.call(M.enemies, e, dt);
    const after = stateOf(e);
    if (after !== before) {
      const w = WIND[e.type], a = ATK[e.type];
      let kind = null;
      if (w && before === w[0] && after === w[1]) kind = 'wind';
      else if (a && before === a[0] && after === a[1]) kind = 'attack';
      if (kind) {
        if (kind === 'wind') { rec.lastWind = S.t; rec.winds++; L.winds++; }
        let announce = null;
        if (kind === 'attack' && rec.lastWind > -1e8) announce = Math.round(S.t - rec.lastWind);
        if (kind === 'attack') rec.lastAtk = S.t;
        L.tele.push({ t: S.t, id: e.id, type: e.type, elite: rec.elite, mod: e.mod || null, boss: rec.boss, kind,
          inView: inView(e.x, e.y, 0), announce, railed: railed(), brood: rec.brood,
          d: Math.round(Math.hypot(e.x - S.snake.x, e.y - S.snake.y)) });
      }
    }
  };

  const origDeath = M.enemies.onDeath;
  M.enemies.onDeath = function(e) {
    const rec = EP.seen.get(e.id);
    EP.L.kills.push({ t: S.t, id: e.id, type: e.type, elite: !!e.elite, boss: !!e.boss, winds: rec ? rec.winds : 0 });
    return origDeath.call(M.enemies, e);
  };

  // --- coups reçus : signature du burst rouge de hurtSnake (22 particules, #ff2e63) ---
  const origBurst = M.fx.burst;
  M.fx.burst = function(x, y, color, n, power, opts) {
    // 10-core.js émet burst(hx, hy, '#ff2e63', 12, 210, ...) depuis G8 ; le filtre
    // sur 22 ne voyait plus aucune blessure et G6/t1-sim.mjs sortait code 2.
    if (color === '#ff2e63' && (n === 22 || n === 12) && S.phase === 'play') EP.logHurt(x, y);
    return origBurst.apply(M.fx, arguments);
  };
  EP.logHurt = function(x, y) {
    const L = EP.L; if (!L) return;
    let src = 'inconnu', id = null, type = null, elite = false, seenMs = null, wasInView = null;
    let best = null, bd = 1e9;
    for (const e of S.enemies) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    let bullet = null;
    for (const b of S.ebullets) { if (Math.abs(b.x - x) < 2 && Math.abs(b.y - y) < 2) { bullet = b; break; } }
    if (best && bd < 1.5) {
      id = best.id; type = best.type; elite = !!best.elite;
      if (best.dead) src = 'blast:' + (best.type === 'mine' ? 'mine' : best.type);
      else if (best.type === 'parasite' && best.st === 1) src = 'parasite:bite';
      else if (best.type === 'cutter' && best.st === 2) src = 'cutter:dash';
      else if (best.type === 'chaser' && best.st === 2) src = 'chaser:lunge';
      else if (best.type === 'interceptor' && best.st === 2) src = 'interceptor:dash';
      else src = best.type + ':contact';
    } else if (bullet) { src = 'bullet'; }
    else if (best && bd < best.r + K.HEAD_R + 6) { id = best.id; type = best.type; elite = !!best.elite; src = best.type + ':near'; }
    if (id !== null) {
      const rec = EP.seen.get(id);
      if (rec) { rec.hurts++; seenMs = rec.firstView >= 0 ? Math.round(S.t - rec.firstView) : -1; }
      wasInView = best ? inView(best.x, best.y, 0) : null;
    }
    // où le coup tombe : distance à la tête et indice du segment le plus proche
    const hd = Math.hypot(x - S.snake.x, y - S.snake.y);
    let segIdx = -1, sbd = 1e9;
    for (let i = 0; i < S.snake.segs.length; i++) { const sg = S.snake.segs[i]; const dd = Math.hypot(sg.x - x, sg.y - y); if (dd < sbd) { sbd = dd; segIdx = i; } }
    const bodyHit = hd > K.HEAD_R + 12 && sbd < hd;
    L.hurts.push({ t: S.t, x: Math.round(x), y: Math.round(y), src, id, type, elite, seenMs, wasInView,
      level: S.level, railed: railed(), len: S.snake.len, headD: Math.round(hd),
      segIdx: bodyHit ? segIdx : -1, bodyHit, hitInView: inView(x, y, 0) });
    EP.lastFrameHurt = window.__EPF || 0;
  };

  // passe par image : garde-fou d'attribution (une chute de len sans burst rouge est comptée à part)
  window.__EPF = 0;
  function tick() {
    requestAnimationFrame(tick);
    window.__EPF++;
    if (S.phase !== 'play') { EP.lastLen = S.snake ? S.snake.len : 0; return; }
    const L = EP.L; if (!L) return;
    if (L.t0 === null) L.t0 = S.t;
    L.tEnd = S.t;
    const len = S.snake.len;
    if (len < EP.lastLen && EP.lastFrameHurt !== window.__EPF && EP.lastFrameHurt !== window.__EPF - 1) L.unknown++;
    EP.lastLen = len;
  }
  requestAnimationFrame(tick);
})();
`;

/** Percentile (0..1) d'un tableau de nombres. */
export function pct(arr, p) {
  if (!arr || !arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}
export function pctOf(n, d) { return d > 0 ? +(100 * n / d).toFixed(2) : 0; }
