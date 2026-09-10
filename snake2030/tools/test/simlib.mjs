// Harnais de simulation accélérée (copie versionnée de scratchpad/sim-lib.mjs, adaptée aux tests d'acceptation).
// - rAF synthétique : chaque image reçoit un temps +16,667 ms, pompé aussi vite que le processeur le permet
// - rendu canvas court-circuité (la logique du jeu est intacte, seul le dessin ne coûte rien) : ces mesures
//   portent sur la LOGIQUE (positions, champ de vision, dégâts), jamais sur des pixels
// - audio désactivé (AudioContext absent -> le module se replie sans erreur)
// - pilote en page : esquive analogique (manche tactile synthétique) ou clavier 8 directions
// - trois profils de fenêtre : desk1440 (1440×900), desk2560 (2560×1080), iphone (iPhone 13 paysage 844×390)
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { URL as S2030_URL } from './lib.mjs';

export const PROFILES = {
  desk1440: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false },
  desk2560: { viewport: { width: 2560, height: 1080 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false },
  iphone: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
};

const INIT = `
(function(){
  // --- audio off ---
  try { window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch(e){}
  // --- canvas 2D neutralisé ---
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
  window.__simBatch = 12;
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

/** Ouvre une page de simulation sur le profil demandé. Rend { browser, context, page, errors }. */
export async function launchSim(profile = 'desk1440', opts = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext(PROFILES[profile] || PROFILES.desk1440);
  await context.addInitScript(INIT);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(opts.url || S2030_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__S && window.__M && window.__M.ui, null, { timeout: 30000 });
  await page.evaluate(PILOT_SRC);
  return { browser, context, page, errors, close: async () => { try { await browser.close(); } catch (e) {} } };
}

// Code du pilote, injecté une fois. Il lit window.__PSIM (config) et écrit window.__LSIM (journal minimal).
const PILOT_SRC = `
(function(){
  if (window.__pilotTick) return;
  const clamp = (v,a,b)=>v<a?a:v>b?b:v;
  window.__PSIM = null; window.__LSIM = null;
  function key(k, down){ window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup', { key: k, bubbles: true })); }
  window.__key = key;
  function touchJoy(x,y){
    const app = document.getElementById('app');
    const t = new Touch({ identifier: 77, target: app, clientX: x, clientY: y, pageX: x, pageY: y });
    app.dispatchEvent(new TouchEvent('touchstart', { touches:[t], targetTouches:[t], changedTouches:[t], bubbles:true, cancelable:true }));
  }
  const PRIO = ['frontCannon','blast','power','rate','growth','shield','pierce','crit','regen','missiles','magnet','iframes','sideTurrets','arcLightning'];
  const M = window.__M, S = window.__S, K = window.__K;
  const origShow = M.ui.showCards;
  M.ui.showCards = function(cards, cb){
    // choix par le vrai chemin, sans le verrou anti-rebond de 220 ms réels de _uiTap
    let best = cards[0], br = 1e9;
    for (const c of cards) { let r = PRIO.indexOf(c.id); if (r < 0) r = 50; if (r < br) { br = r; best = c; } }
    origShow.call(M.ui, cards, cb);
    const pick = best;
    setTimeout(function(){ M.ui.showScreen(null); cb(pick.id); }, 2);
  };

  window.__pilotTick = function(){
    const P = window.__PSIM, L = window.__LSIM; if (!P || !L) return;
    const s = S.snake; if (!s) return;
    if (S.phase !== 'play') return;
    if (L.t0 === undefined) L.t0 = S.t;
    L.tEnd = S.t;
    if (S.t - L.t0 > P.maxT) { L.aborted = true; S.phase = 'dead'; try { M.ui.showScreen('over'); } catch(e){} return; }
    if (P.god) { s.ghost = 1e9; s.invuln = 1e9; }
    // --- vecteur de pilotage : fuite des menaces, ramassage, approche prudente ---
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
    if (!P.joy) { touchJoy(150, 300); P.joy = true; }
    S.input.jx = fx / mg; S.input.jy = fy / mg; S.input.jmag = 1; S.input.jactive = true;
    S.input.boost = wantBoost;
    if (nearest && nd < 55 && s.invuln <= 0 && S.specialCd <= 0) { M.phases.use(); }
    if (S.ult >= S.ultMax && S.enemies.length >= 6) key('r', true);
  };
})();
`;

/** Joue une partie jusqu'à la mort (ou jusqu'à maxT ms de temps de jeu). Graine et pas de temps imposés.
 *  Rend { t, kills, level, aborted }. Le journal détaillé est celui de la sonde (enprobe.mjs). */
export async function runOne(page, cfg = {}) {
  const { diff = 1, maxT = 240000, seed = 2030, god = false } = cfg;
  await page.evaluate(({ diff, maxT, seed, god }) => {
    const S = window.__S, M = window.__M;
    S.opt.diff = [1.25, 1.55, 1.9, 2.3, 2.75][diff];
    S.opt.music = false; S.opt.sfx = false; S.opt.haptics = false;
    S.stats.unlocks = {};
    window.__SEED = seed;                 // graine imposée, lue par resetRun (G1)
    window.__DT = 1 / 60;                 // pas de temps imposé : une image = 16,7 ms de jeu
    window.__PSIM = { maxT, joy: false, god };
    window.__LSIM = { aborted: false };
    const btns = Array.from(document.querySelectorAll('#ui button')).filter(b => /^(JOUER|REJOUER)$/.test(b.textContent.trim()) && b.offsetParent !== null);
    if (!btns.length) throw new Error('bouton JOUER introuvable, écran=' + M.ui.screen() + ' phase=' + S.phase);
    btns[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  }, { diff, maxT, seed, god });
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__S.phase === 'dead', null, { timeout: 0, polling: 100 });
  await page.waitForFunction(() => window.__M.ui.screen() === 'over', null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => {
    const S = window.__S, L = window.__LSIM;
    if (window.__PSIM) window.__PSIM.joy = false;
    return { t: S.t, kills: S.kills, level: S.level, score: S.score, aborted: !!(L && L.aborted) };
  });
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
