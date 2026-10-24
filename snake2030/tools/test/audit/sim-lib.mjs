// Harnais de simulation accélérée pour SNAKE 2030 (dimension progression / économie).
// - rAF synthétique : chaque image reçoit un temps +16,667 ms, pompé aussi vite que le CPU le permet
// - rendu canvas court-circuité (la logique du jeu est intacte, seul le dessin ne coûte rien)
// - audio désactivé (AudioContext absent -> le module se replie sans erreur)
// - pilotes en page : passif, esquive analogique (joystick tactile synthétique), esquive clavier 8 directions
// - stratégies de cartes : first, random, build:<axe>, greedy
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

export const URL = 'http://127.0.0.1:8112/snake2030/index.html';
export const OUT = '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad';

const INIT = `
(function(){
  // --- audio off ---
  try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch(e){}
  // --- canvas 2D stub ---
  try {
    const P = CanvasRenderingContext2D.prototype;
    const fakeGrad = { addColorStop(){} };
    for (const k of Object.getOwnPropertyNames(P)) {
      const d = Object.getOwnPropertyDescriptor(P, k);
      if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
      if (k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createConicGradient') P[k] = function(){ return fakeGrad; };
      else if (k === 'createPattern') P[k] = function(){ return null; };
      else if (k === 'measureText') P[k] = function(){ return { width: 10 }; };
      else if (k === 'getImageData') P[k] = function(w,h){ return { data: new Uint8ClampedArray(4), width: 1, height: 1 }; };
      else if (k === 'isPointInPath' || k === 'isPointInStroke') P[k] = function(){ return false; };
      else if (k === 'getTransform') P[k] = function(){ return new DOMMatrix(); };
      else P[k] = function(){};
    }
  } catch(e) { console.error('stub canvas', e); }
  // --- rAF synthétique ---
  let cbs = []; let now = 1000; const STEP = 1000/60;
  window.__simNow = () => now;
  window.__simFrames = 0;
  window.__simBatch = 6;
  window.__simPaused = false;
  window.requestAnimationFrame = function(cb){ cbs.push(cb); return cbs.length; };
  window.cancelAnimationFrame = function(){};
  // --- minuteries virtuelles : setTimeout/setInterval avancent avec l'horloge synthétique ---
  const timers = new Map(); let tid = 1;
  window.setTimeout = function(fn, ms){ const args = Array.prototype.slice.call(arguments, 2); const id = tid++; timers.set(id, { at: now + Math.max(0, +ms || 0), fn, args, iv: 0 }); return id; };
  window.setInterval = function(fn, ms){ const args = Array.prototype.slice.call(arguments, 2); const id = tid++; const iv = Math.max(1, +ms || 1); timers.set(id, { at: now + iv, fn, args, iv }); return id; };
  window.clearTimeout = window.clearInterval = function(id){ timers.delete(id); };
  function runTimers(){
    for (const [id, t] of Array.from(timers)) {
      if (t.at > now) continue;
      if (t.iv) t.at += t.iv; else timers.delete(id);
      try { if (typeof t.fn === 'function') t.fn.apply(null, t.args); } catch(e){ console.error('timer', e && e.stack || e); }
    }
  }
  const ch = new MessageChannel();
  ch.port1.onmessage = function(){
    if (!window.__simPaused) {
      const n = window.__simBatch;
      for (let i=0;i<n;i++){
        now += STEP; window.__simFrames++;
        try { if (window.__pilotTick) window.__pilotTick(); } catch(e){ console.error('pilot', e && e.stack || e); }
        const list = cbs; cbs = [];
        for (const cb of list) { try { cb(now); } catch(e){ console.error('frame', e && e.stack || e); } }
        runTimers();
      }
    }
    ch.port2.postMessage(0);
  };
  ch.port2.postMessage(0);
})();
`;

export async function launchSim(kind = 'phone') {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctxOpts = kind === 'phone'
    ? { ...devices['iPhone 13 landscape'], hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 900 }, hasTouch: true, isMobile: false, deviceScaleFactor: 1 };
  const context = await browser.newContext(ctxOpts);
  await context.addInitScript(INIT);
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__S && window.__M && window.__M.ui);
  await page.evaluate(PILOT_SRC);
  return { browser, context, page };
}

// Code du pilote, injecté une fois. Il lit window.__P (config) et écrit window.__L (journal).
const PILOT_SRC = `
(function(){
  const clamp = (v,a,b)=>v<a?a:v>b?b:v;
  window.__P = null; window.__L = null;
  function key(k, down){ window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup', { key: k, bubbles: true })); }
  window.__key = key;
  function touchJoy(x,y){
    const app = document.getElementById('app');
    const t = new Touch({ identifier: 77, target: app, clientX: x, clientY: y, pageX: x, pageY: y });
    app.dispatchEvent(new TouchEvent('touchstart', { touches:[t], targetTouches:[t], changedTouches:[t], bubbles:true, cancelable:true }));
  }
  const PRIO = {
    laser: ['frontCannon','pierce','power','sideTurrets','rate','crit','blast','bulletSpeed','ricochet','growth','range','shield'],
    elec:  ['arcLightning','chainPlus','conduct','ionMark','shockExplode','staticField','deathArc','rate','power','growth','range','shield'],
    explo: ['missiles','tailMines','blast','blastDmg','deathBomb','chainExplode','burnPool','implode','rate','power','growth','shield'],
    speed: ['speed','capacity','ram','boostDrain','momentum','agility','sonicBoom','tailLaser','trailWide','growth','power','shield'],
    fort:  ['growth','shield','regen','drones','shockwave','thorns','pickHeal','iframes','capDamage','power','rate','magnet'],
    ghost: ['ghostTime','ghostOnHit','slowmo','phaseShot','permGhost','echo','frontCannon','power','growth','rate','shield','iframes'],
    greedy:['frontCannon','blast','power','rate','growth','shield','pierce','crit','regen','missiles','magnet','iframes','sideTurrets','arcLightning']
  };
  function chooseCard(cards){
    const P = window.__P; const st = P.cards || 'first';
    if (st === 'first') return cards[0];
    if (st === 'random') return cards[Math.floor(Math.random()*cards.length)];
    if (st === 'rarest') { const R={common:0,rare:1,epic:2,ultra:3}; return cards.slice().sort((a,b)=>R[b.rarity]-R[a.rarity])[0]; }
    let list = PRIO[st.replace('build:','')] || PRIO.greedy;
    let best = null, br = 1e9;
    for (const c of cards) { let r = list.indexOf(c.id); if (r < 0) r = 50; if (r < br) { br = r; best = c; } }
    return best;
  }
  // interception des cartes
  const M = window.__M, S = window.__S, K = window.__K;
  const origShow = M.ui.showCards;
  M.ui.showCards = function(cards, cb){
    const L = window.__L;
    const pick = chooseCard(cards);
    if (L) L.cards.push({ t: S.t, offered: cards.map(c=>({id:c.id, r:c.rarity, ax:c.axis})), picked: pick.id, len: S.snake.len, kills: S.kills, level: S.level });
    // on laisse l'UI afficher (fidélité), puis on choisit par le vrai chemin : pointerdown sur la carte
    // validation par le même chemin que _uiPickCard, sans le verrou anti-rebond
    // de 220 ms réels de _uiTap (qui avale un tap sur deux à 200x)
    origShow.call(M.ui, cards, cb);
    setTimeout(function(){ M.ui.showScreen(null); cb(pick.id); }, (window.__P && window.__P.cardDelay) || 2);
  };

  let prev = null;
  window.__pilotTick = function(){
    const P = window.__P, L = window.__L; if (!P || !L) return;
    const s = S.snake; if (!s) return;
    const M = window.__M;
    if (S.phase !== 'play') { prev = null; return; }
    if (L.t0 === undefined) L.t0 = S.t;
    L.tEnd = S.t;
    // --- journal ---
    const ph = M.phases.state();
    if (prev) {
      if (s.len < prev.len && ph.fold <= 0 && !(prev.fold > 0)) L.hits.push({ t: S.t, from: prev.len, to: s.len, level: S.level, lph: S.levelPhase, enemies: S.enemies.length, boss: !!S.boss });
      if (S.level !== prev.level) L.levels.push({ t: S.t, level: S.level });
      if (S.boss && !prev.boss) L.boss.push({ t: S.t, level: S.level, name: S.boss.name, hp: S.boss.maxHp });
      if (S.ult < prev.ult - 50) L.ults.push({ t: S.t, enemies: S.enemies.length });
      if (ph.owned.length > prev.owned) L.powers.push({ t: S.t, kills: S.kills, owned: ph.owned.slice() });
      if (S.levelPhase !== prev.lph) L.phases.push({ t: S.t, level: S.level, ph: S.levelPhase });
    }
    if (S.t - L.lastSample >= 1000) {
      L.lastSample = S.t;
      L.samples.push({ t: Math.round(S.t), en: S.enemies.length, eb: S.ebullets.length, len: s.len, mh: s.maxHp, kills: S.kills, score: S.score, xp: S.xp, xpn: S.xpNext, lvl: S.level, lph: S.levelPhase, ult: Math.round(S.ult), mult: S.mult, coins: S.coins, boost: s.boosting, be: Math.round(s.boostE), int: +S.intensity.toFixed(2), sp: Math.round(s.speed) });
    }
    prev = { len: s.len, level: S.level, boss: !!S.boss, ult: S.ult, owned: ph.owned.length, lph: S.levelPhase, fold: ph.fold };
    if (S.t - L.t0 > P.maxT) { L.aborted = true; S.phase = 'dead'; try { M.ui.showScreen('over'); } catch(e){} return; }

    if (window.__god) { s.ghost = 1e9; s.invuln = 1e9; }
    if (P.pilot === 'passive') return;
    if (P.pilot === 'sloppy') {
      P.frame = (P.frame || 0) + 1;
      if (P.frame % 15 !== 1 && P.last) { S.input.jx = P.last.jx; S.input.jy = P.last.jy; S.input.jmag = 1; S.input.jactive = true; S.input.boost = P.last.boost; if (!P.joy) { touchJoy(150, 300); P.joy = true; } return; }
      let fx2 = 0, fy2 = 0, nearest2 = null, nd2 = 1e9, th2 = 0;
      for (const e of S.enemies) { if (e.dead) continue; const dx = e.x - s.x, dy = e.y - s.y; const d = Math.hypot(dx, dy) - e.r; if (d < nd2) { nd2 = d; nearest2 = e; } const R = 150 + (e.type === 'mine' ? 40 : 0); if (d < R) { const w = Math.pow(1 - clamp(d, 0, R) / R, 2); fx2 -= dx / (d + 8) * w * 8; fy2 -= dy / (d + 8) * w * 8; th2 = Math.max(th2, w); } }
      const m2 = 160; if (s.x < m2) fx2 += 1.2; if (s.x > K.ARENA_W - m2) fx2 -= 1.2; if (s.y < m2) fy2 += 1.2; if (s.y > K.ARENA_H - m2) fy2 -= 1.2;
      let bp = null, bd = 1e9; for (const p of S.pickups) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; bp = p; } }
      if (bp && th2 < 0.4 && bd < 400) { const dx = bp.x - s.x, dy = bp.y - s.y, d = Math.hypot(dx, dy) || 1; fx2 += dx / d * 0.5; fy2 += dy / d * 0.5; }
      if (nearest2 && nd2 > 150 && th2 < 0.3) { const dx = nearest2.x - s.x, dy = nearest2.y - s.y, d = Math.hypot(dx, dy) || 1; fx2 += dx / d * 0.5; fy2 += dy / d * 0.5; }
      if (Math.hypot(fx2, fy2) < 0.05) { fx2 = Math.cos(s.ang); fy2 = Math.sin(s.ang); }
      // bruit humain : +/- 25 degrés
      const na = Math.atan2(fy2, fx2) + (Math.random() - 0.5) * 0.87;
      P.last = { jx: Math.cos(na), jy: Math.sin(na), boost: th2 > 0.8 && s.boostE > 40 };
      if (!P.joy) { touchJoy(150, 300); P.joy = true; }
      S.input.jx = P.last.jx; S.input.jy = P.last.jy; S.input.jmag = 1; S.input.jactive = true; S.input.boost = P.last.boost;
      if (nearest2 && nd2 < 40 && s.invuln <= 0 && S.specialCd <= 0 && Math.random() < 0.5) { M.phases.use(); L.specials.push({ t: S.t }); }
      if (S.ult >= S.ultMax && S.enemies.length >= 10 && Math.random() < 0.1) key('r', true);
      return;
    }

    // --- vecteur de pilotage ---
    let fx = 0, fy = 0, nearest = null, nd = 1e9, threat = 0;
    for (const e of S.enemies) {
      if (e.dead) continue;
      const dx = e.x - s.x, dy = e.y - s.y; const d = Math.hypot(dx, dy) - e.r;
      if (d < nd) { nd = d; nearest = e; }
      const R = 250 + (e.type === 'mine' ? 70 : 0) + (e.elite ? 60 : 0) + (e.speed > 140 ? 80 : 0) + (e.boss ? 120 : 0);
      if (d < R) { const w = Math.pow(1 - clamp(d, 0, R) / R, 2) * (e.type === 'mine' ? 1.8 : 1); fx -= dx / (d + 8) * w * 8; fy -= dy / (d + 8) * w * 8; threat = Math.max(threat, w); }
    }
    for (const b of S.ebullets) {
      const dx = b.x - s.x, dy = b.y - s.y; const d = Math.hypot(dx, dy);
      if (d < 240) { const closing = -(dx * b.vx + dy * b.vy) / (d + 1);
        if (closing > 0) { const w = Math.pow(1 - d / 240, 2) * 1.3; const vm = Math.hypot(b.vx, b.vy) || 1; const px = -b.vy / vm, py = b.vx / vm; const side = (px * (-dx) + py * (-dy)) >= 0 ? 1 : -1; fx += px * side * w; fy += py * side * w; threat = Math.max(threat, w); } }
    }
    for (const h of (M.levels.hazards || [])) {
      if (h.kind === 'rig') { const cx = clamp(s.x, h.x - h.w2, h.x + h.w2), cy = clamp(s.y, h.y - h.h2, h.y + h.h2); const dx = cx - s.x, dy = cy - s.y; const d = Math.hypot(dx, dy); if (d < 220) { const w = Math.pow(1 - d / 220, 2) * 1.6; fx -= dx / (d + 4) * w * 4; fy -= dy / (d + 4) * w * 4; threat = Math.max(threat, w); } }
      else if (h.kind === 'pull') { const dx = h.x - s.x, dy = h.y - s.y; const d = Math.hypot(dx, dy); if (d < h.r * 0.55) { const w = Math.pow(1 - d / (h.r * 0.55), 2) * 1.4; fx -= dx / (d + 4) * w * 4; fy -= dy / (d + 4) * w * 4; threat = Math.max(threat, w); } }
    }
    const m = 230;
    if (s.x < m) fx += (1 - s.x / m) * 1.6; if (s.x > K.ARENA_W - m) fx -= (1 - (K.ARENA_W - s.x) / m) * 1.6;
    if (s.y < m) fy += (1 - s.y / m) * 1.6; if (s.y > K.ARENA_H - m) fy -= (1 - (K.ARENA_H - s.y) / m) * 1.6;
    let bestP = null, pd = 1e9;
    for (const p of S.pickups) { const d = Math.hypot(p.x - s.x, p.y - s.y) / (p.kind === 'energy' ? 1 : 2.2); if (d < pd) { pd = d; bestP = p; } }
    if (bestP && threat < 0.55 && pd < 520) { const dx = bestP.x - s.x, dy = bestP.y - s.y; const d = Math.hypot(dx, dy) || 1; fx += dx / d * 0.5; fy += dy / d * 0.5; }
    if (nearest && nd > 200 && threat < 0.45) { const dx = nearest.x - s.x, dy = nearest.y - s.y; const d = Math.hypot(dx, dy) || 1; fx += dx / d * 0.5; fy += dy / d * 0.5; }
    if (Math.hypot(fx, fy) < 0.05) { const dx = K.ARENA_W / 2 - s.x, dy = K.ARENA_H / 2 - s.y; const d = Math.hypot(dx, dy) || 1; fx = dx / d; fy = dy / d; }
    const mg = Math.hypot(fx, fy);
    const wantBoost = (threat > 0.55 && s.boostE > 25 && nd < 140) || (s.boosting && threat > 0.35 && s.boostE > 4);
    if (P.pilot === 'dodge8') {
      const ang = Math.atan2(fy, fx); const c = Math.cos(ang), sn = Math.sin(ang);
      const want = new Set(); if (c > 0.38) want.add('ArrowRight'); if (c < -0.38) want.add('ArrowLeft'); if (sn > 0.38) want.add('ArrowDown'); if (sn < -0.38) want.add('ArrowUp');
      if (wantBoost) want.add(' ');
      P.keys = P.keys || new Set();
      for (const k of Array.from(P.keys)) if (!want.has(k)) { key(k, false); P.keys.delete(k); }
      for (const k of want) if (!P.keys.has(k)) { key(k, true); P.keys.add(k); }
    } else {
      if (!P.joy) { touchJoy(150, 300); P.joy = true; }
      S.input.jx = fx / mg; S.input.jy = fy / mg; S.input.jmag = 1; S.input.jactive = true;
      S.input.boost = wantBoost;
    }
    if (nearest && nd < 55 && s.invuln <= 0 && S.specialCd <= 0) { M.phases.use(); L.specials.push({ t: S.t }); }
    if (S.ult >= S.ultMax && S.enemies.length >= 6) key('r', true);
  };
})();
`;

/** Lance une partie et rend le journal. */
export async function runOne(page, cfg) {
  const { diff = 1, pilot = 'dodge', cards = 'first', maxT = 600000, unlocks = null, build = null, seed = null, noCards = false, god = false, level = 0 } = cfg;
  await page.evaluate(({ diff, pilot, cards, maxT, unlocks, build, noCards, god, level }) => {
    const S = window.__S, M = window.__M;
    S.opt.diff = [1.25, 1.55, 1.9, 2.3, 2.75][diff];
    S.opt.music = false; S.opt.sfx = false; S.opt.haptics = false;
    S.stats.unlocks = unlocks || {};
    window.__P = { pilot, cards, maxT, joy: false, keys: null };
    window.__L = { cards: [], hits: [], levels: [], boss: [], ults: [], powers: [], phases: [], specials: [], samples: [], lastSample: -1e9, aborted: false };
    // JOUER / REJOUER selon l'écran
    const btns = Array.from(document.querySelectorAll('#ui button')).filter(b => /^(JOUER|REJOUER)$/.test(b.textContent.trim()) && b.offsetParent !== null);
    if (!btns.length) throw new Error('bouton JOUER introuvable, écran=' + M.ui.screen() + ' phase=' + S.phase + ' btns=' + Array.from(document.querySelectorAll('#ui button')).map(b=>b.textContent.trim()+':'+(b.offsetParent!==null)).join(','));
    btns[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    if (build) { for (const id of build) M.upgrades.apply(id); }
    if (noCards) { S.xpNext = 1e9; }
    if (level) { M.levels.start(level); }
    if (god) { S.snake.ghost = 1e9; S.snake.invuln = 1e9; window.__god = true; M.enemies.isJammed = function () { return false; }; }
  }, { diff, pilot, cards, maxT, unlocks, build, noCards, god, level });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 5000 }).catch(async e => { const d = await page.evaluate(() => ({ phase: window.__S.phase, screen: window.__M.ui.screen(), paused: window.__S.paused })); throw new Error('pas en jeu: ' + JSON.stringify(d)); });
  await page.waitForFunction(() => window.__S.phase === 'dead', null, { timeout: 0, polling: 100 });
  // laisse l'écran de fin s'afficher (900 ms réels) pour que les stats soient enregistrées
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 5000 }).catch(() => {});
  const r = await page.evaluate(() => {
    const S = window.__S, L = window.__L, M = window.__M;
    // libère les touches
    if (window.__P && window.__P.keys) for (const k of window.__P.keys) window.__key(k, false);
    return { t: S.t, score: S.score, kills: S.kills, level: S.level, lph: S.levelPhase, coins: S.coins, len: S.snake.len, maxHp: S.snake.maxHp, up: JSON.parse(JSON.stringify(S.up)), ultMax: S.ultMax, stats: JSON.parse(JSON.stringify(S.stats)), L, powers: M.phases.state().owned };
  });
  return r;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function reinject(page) { await page.evaluate(PILOT_SRC); }
