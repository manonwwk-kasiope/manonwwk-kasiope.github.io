// Harnais commun des tests d'acceptation SNAKE 2030 (hors bundle : build.mjs ne lit que src/).
// Invocation type : NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node tools/test/<script>.mjs
// L'URL de base est lue dans S2030_URL (défaut http://127.0.0.1:8112/snake2030/index.html).
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, 'out');
export const URL = process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

/* ------------------------------------------------------------ profils ---- */
const IPHONE = { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true };
const TABLET = { viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
  userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

async function launchWith(ctxOpts, kind, opts = {}) {
  const args = ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'];
  if (opts.args) args.push(...opts.args);
  const browser = await chromium.launch({ headless: true, args });
  const context = await browser.newContext({ ...ctxOpts, ...(opts.ctx || {}) });
  // opts.clock : horloge factice Playwright (Date, performance.now, timers, requestAnimationFrame) posée AVANT le
  // chargement — elle avance avec le temps réel tant qu'on ne l'arrête pas ; clockPause/clockStep font ensuite
  // avancer le jeu image par image pour des captures d'écran exactes (G5)
  if (opts.clock) await context.clock.install();
  // opts.init : scripts d'initialisation (chaîne ou fonction) posés AVANT le chargement de la page (espions d'API, G2)
  for (const s of (opts.init || [])) await context.addInitScript(s);
  const page = await context.newPage();
  page.setDefaultTimeout(opts.timeout || 15000);
  const pageErrors = [], consoleErrors = [];
  page.on('pageerror', e => { pageErrors.push(String(e && e.message || e).slice(0, 300)); });
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  const cdp = await context.newCDPSession(page);
  const t0 = Date.now();
  await page.goto(opts.url || URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__S && window.__M && window.__M.ui, null, { timeout: 30000 });
  const loadMs = Date.now() - t0;
  const ctx = { browser, context, page, cdp, kind, pageErrors, consoleErrors, loadMs, profile: opts.profile || kind, clock: opts.clock ? context.clock : null };
  ctx.close = async () => { try { await browser.close(); } catch (e) {} };
  return ctx;
}

/** Bureau : viewport w×h, souris + clavier, pas de tactile.
 *  opts.unthrottled : sans limiteur de cadence (--disable-frame-rate-limit --disable-gpu-vsync). En Chromium headless
 *  sans GPU, la cadence à 60 Hz quantifie chaque image à 16,7 ou 33,3 ms : quand le coût d'une image est proche de
 *  16,7 ms, la « part > 33 ms » devient un tirage à pile ou face (mesuré 45→50 % d'une exécution à l'autre avec une
 *  partie strictement identique). Sans limiteur, le delta rAF EST le coût réel de l'image (continu, ≈ 18 ms),
 *  et les seuils relatifs de la NR (part ± 3 points, p99 ≤ 1,1 × base) prennent leur sens. Le profil iPhone garde
 *  la cadence 60 Hz (le p99 ≤ 33 ms y compte les images doublées). */
export function launchDesktop(w = 1440, h = 900, opts = {}) {
  const args = [...(opts.args || []), ...(opts.unthrottled ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : [])];
  return launchWith({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dpr || 1, hasTouch: false, isMobile: false }, 'desk', { profile: 'desk' + w + 'x' + h, ...opts, args });
}
/** iPhone 13 paysage : devices['iPhone 13'] + viewport 844×390, entrées par CDP (touch). */
export function launchPhone(opts = {}) { return launchWith(IPHONE, 'touch', { profile: 'iphone', ...opts }); }
/** Tablette 1194×834 tactile. */
export function launchTablet(opts = {}) { return launchWith(TABLET, 'touch', { profile: 'tablet', ...opts }); }

/* ------------------------------------------------------------- entrées --- */
/** Doigt via CDP Input.dispatchTouchEvent (coordonnées CSS du viewport). */
export function touch(cdp) {
  return {
    start: (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts }),
    move: (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts }),
    end: (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pts || [] }),
  };
}
/** Tape (touchStart puis touchEnd) au point (x, y) via CDP. */
export async function tapAt(cdp, x, y, holdMs = 60) {
  const T = touch(cdp);
  await T.start([{ x, y, id: 7 }]);
  await sleep(holdMs);
  await T.end([]);
}

function buttonLocator(page, text) {
  return page.locator('#ui button:visible', { hasText: new RegExp('^' + text + '$') }).first();
}
/** Bouton de l'interface (#ui) au texte exact : souris sur bureau, doigt CDP sur tactile. */
export async function clickButton(ctx, text, opts = {}) {
  const page = ctx.page || ctx;
  const b = buttonLocator(page, text);
  await b.waitFor({ state: 'visible', timeout: opts.timeout || 8000 });
  const box = await b.boundingBox();
  if (!box) throw new Error('bouton sans boîte : ' + text);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  if (ctx.kind === 'touch' && ctx.cdp) await tapAt(ctx.cdp, x, y);
  else await page.mouse.click(x, y);
  return { x, y };
}
/** Le bouton existe-t-il (visible) ? Sert à sortir en code 2 quand un sélecteur manque. */
export async function hasButton(page, text) {
  return (await buttonLocator(page, text).count()) > 0;
}

/** Appuie sur JOUER / REJOUER et attend S.phase === 'play'.
 *  opts.seed : graine de partie imposée (window.__SEED, lue par resetRun — G1) : mêmes vagues d'une
 *  exécution à l'autre ; sans elle la graine est tirée de l'horloge par le jeu. */
export async function startGame(ctx, opts = {}) {
  const page = ctx.page;
  if (opts.seed != null) await page.evaluate(sd => { window.__SEED = sd; }, opts.seed);
  const b = page.locator('#ui button.s2big:visible', { hasText: /^(JOUER|REJOUER)$/ }).first();
  await b.waitFor({ state: 'visible', timeout: 8000 });
  const box = await b.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  if (ctx.kind === 'touch') await tapAt(ctx.cdp, x, y); else await page.mouse.click(x, y);
  await page.waitForFunction(() => window.__S.phase === 'play', null, { timeout: 8000 });
}

/* --------------------------------------------------------------- état ---- */
export async function state(page) {
  return page.evaluate(() => {
    const S = window.__S, s = S.snake || {}, M = window.__M;
    const ph = M.phases && M.phases.state ? M.phases.state() : {};
    return { t: S.t, phase: S.phase, paused: S.paused, screen: M.ui.screen(),
      x: s.x, y: s.y, ang: s.ang, speed: s.speed, len: s.len, hp: s.hp, invuln: s.invuln, ghost: s.ghost,
      kills: S.kills, score: S.score, level: S.level, ult: S.ult, ultMax: S.ultMax,
      ne: S.enemies.length, nb: S.bullets.length, neb: S.ebullets.length, np: S.pickups.length,
      cam: { x: S.cam.x, y: S.cam.y }, view: { ...S.view }, pxEff: S.pxEff,
      zoom: ph.zoom, persp: ph.perspDeg, railed: ph.railed, fi: window.__fi || 0,
      err: window.__ERR ? { count: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs || {}).length } : null };
  });
}
/** window.__ERR.count (G1) ; null si l'API est absente. */
export async function errCount(page) {
  return page.evaluate(() => (window.__ERR && typeof window.__ERR.count === 'number') ? window.__ERR.count : null);
}
export async function errSigs(page) {
  return page.evaluate(() => window.__ERR ? Object.keys(window.__ERR.sigs || {}).slice(0, 20) : []);
}

/* -------------------------------------------------------- sonde images --- */
/** Sonde : temps d'image brut (rAF) + trace compacte par image + marques d'entrée.
 *  Tampons circulaires Float64Array (aucune allocation par image : ni objet, ni phases.state() qui
 *  passait par JSON.parse/stringify à chaque image) ; capacité 65 536 images, au-delà les plus
 *  anciennes sont écrasées. La phase est codée en nombre et décodée par pullProbe. */
const PROBE_PHASES = ['', 'play', 'cards', 'dead', 'menu', 'intro', 'boss', 'warp'];
export async function installProbe(page) {
  await page.evaluate((PHASES) => {
    const S = window.__S, M = window.__M;
    const CAP = 65536, NF = 10, NR = 9;
    const P = window.__P = { CAP, NF, NR, fb: new Float64Array(CAP * NF), fn: 0, fh: 0, rb: new Float64Array(CAP * NR), rn: 0, rh: 0, marks: [] };
    const PH = {}; PHASES.forEach((k, i) => { if (k) PH[k] = i; });
    const persp = (M.phases && typeof M.phases.persp === 'function') ? M.phases.persp : null;
    const railed = (M.phases && typeof M.phases.railed === 'function') ? M.phases.railed : null;
    window.__fi = 0;
    let last = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      window.__fi++;
      const raw = now - last; last = now;
      const s = S.snake;
      let pd = 0, rl = 0;
      try { pd = persp ? persp() * 180 / Math.PI : 0; rl = railed && railed() ? 1 : 0; } catch (e) {}
      const fb = P.fb, o = P.fh * NF;
      fb[o] = window.__fi; fb[o + 1] = now; fb[o + 2] = raw; fb[o + 3] = S.t; fb[o + 4] = PH[S.phase] || 0; fb[o + 5] = S.paused ? 1 : 0;
      fb[o + 6] = S.pxEff || 0; fb[o + 7] = S.enemies.length; fb[o + 8] = pd; fb[o + 9] = rl;
      P.fh = (P.fh + 1) % CAP; if (P.fn < CAP) P.fn++;
      if (s) {
        const rb = P.rb, q = P.rh * NR;
        rb[q] = window.__fi; rb[q + 1] = now; rb[q + 2] = S.t; rb[q + 3] = s.x; rb[q + 4] = s.y; rb[q + 5] = s.ang; rb[q + 6] = S.cam.x; rb[q + 7] = S.cam.y; rb[q + 8] = s.len;
        P.rh = (P.rh + 1) % CAP; if (P.rn < CAP) P.rn++;
      }
      // pilote déterministe (installAutoPilot) : il agit ici, après frame() du jeu, pour l'image suivante
      if (P.pilot) { try { P.pilot(window.__fi); } catch (e) { P.pilotErr = String(e && e.stack || e); } }
    }
    requestAnimationFrame(tick);
    // crochet à usage unique (rail2) : appelé avant le gestionnaire du jeu ; s'il rend true il est désarmé
    addEventListener('keydown', e => { const f = window.__onKeyOnce; if (f) { try { if (f(e)) window.__onKeyOnce = null; } catch (x) {} } P.marks.push({ fi: window.__fi, now: performance.now(), key: e.key, type: 'down' }); }, true);
    addEventListener('keyup', e => { P.marks.push({ fi: window.__fi, now: performance.now(), key: e.key, type: 'up' }); }, true);
    addEventListener('touchstart', e => { P.marks.push({ fi: window.__fi, now: performance.now(), type: 'ts', n: e.touches.length }); }, true);
    addEventListener('touchmove', e => { P.marks.push({ fi: window.__fi, now: performance.now(), type: 'tm' }); }, true);
  }, PROBE_PHASES);
}
/** Vide les tampons de la sonde et rend leur contenu : f = [{fi, now, raw, t, phase, paused, pxEff, ne, persp, railed}],
 *  rec = [{fi, now, t, x, y, ang, cx, cy, len}], marks = [...]. Les valeurs sont arrondies comme avant (raw à 0,01 ms). */
export async function pullProbe(page, clear = true) {
  return page.evaluate(([clear, PHASES]) => {
    const P = window.__P, { CAP, NF, NR } = P;
    const f = new Array(P.fn), rec = new Array(P.rn);
    let st = (P.fh - P.fn + CAP) % CAP;
    for (let k = 0; k < P.fn; k++) {
      const o = ((st + k) % CAP) * NF, b = P.fb;
      f[k] = { fi: b[o], now: b[o + 1], raw: +b[o + 2].toFixed(2), t: b[o + 3], phase: PHASES[b[o + 4]] || 'other', paused: b[o + 5], pxEff: b[o + 6], ne: b[o + 7], persp: +b[o + 8].toFixed(1), railed: b[o + 9] };
    }
    st = (P.rh - P.rn + CAP) % CAP;
    for (let k = 0; k < P.rn; k++) {
      const o = ((st + k) % CAP) * NR, b = P.rb;
      rec[k] = { fi: b[o], now: b[o + 1], t: b[o + 2], x: b[o + 3], y: b[o + 4], ang: b[o + 5], cx: b[o + 6], cy: b[o + 7], len: b[o + 8] };
    }
    const out = { f, rec, marks: P.marks.slice() };
    if (clear) { P.fn = 0; P.fh = 0; P.rn = 0; P.rh = 0; P.marks.length = 0; }
    return out;
  }, [clear, PROBE_PHASES]);
}
export async function clearProbe(page) { await page.evaluate(() => { const P = window.__P; P.fn = 0; P.fh = 0; P.rn = 0; P.rh = 0; P.marks.length = 0; }); }
/* ------------------------------------------------ horloge factice (G5) ---
   Avec launch…({ clock: true }) : clockPause gèle le jeu (plus aucune image), clockStep(n) fait tourner exactement n
   images (une image = un requestAnimationFrame de 16 ms d'horloge factice), clockResume rend le temps réel. Les
   entrées (clavier Playwright, doigt CDP) sont traitées même à l'arrêt ; waitFrames, lui, attendrait pour rien. */
export async function clockPause(ctx) {
  if (!ctx.clock) throw new Error('lancer avec { clock: true }');
  /* Course de l'horloge factice : une fois sur deux environ, pauseAt laisse la boucle du jeu (frame() de 90-boot.js)
     hors du lot de requestAnimationFrame rejoué — le compteur rAF du test avance mais S.t reste figé (mesuré 3/7 par
     l'exécuteur de G5). En jeu, on vérifie que le jeu avance sur deux images ; sinon on rend le temps réel 150 ms et
     on recommence (six essais). Hors jeu (menu, pause) rien ne bouge par construction : on ne vérifie pas. */
  for (let a = 0; a < 6; a++) {
    await ctx.clock.pauseAt(Date.now());
    const playing = await ctx.page.evaluate(() => !!(window.__S && window.__S.phase === 'play' && !window.__S.paused));
    if (!playing) return;
    const t0 = await ctx.page.evaluate(() => window.__S.t);
    await clockStep(ctx, 2);
    const t1 = await ctx.page.evaluate(() => window.__S.t);
    if (t1 > t0) return;
    await ctx.clock.resume(); await sleep(150);
  }
  throw new Error('clockPause : la boucle du jeu ne tourne plus sous l\'horloge factice (6 essais)');
}
export async function clockStep(ctx, n = 1) {
  // compteur d'images côté page (une image = un lot de requestAnimationFrame de l'horloge factice) : on avance par
  // tranches de 6 ms jusqu'à voir le compteur bouger — runFor(16) seul pouvait tomber juste avant la frontière
  // de 16 ms et ne faire tourner aucune image
  const page = ctx.page;
  await page.evaluate(() => { if (!window.__clk) { window.__clk = { n: 0 }; (function t() { requestAnimationFrame(t); window.__clk.n++; })(); } });
  for (let k = 0; k < n; k++) {
    const before = await page.evaluate(() => window.__clk.n);
    let moved = false;
    for (let j = 0; j < 6 && !moved; j++) { await ctx.clock.runFor(6); moved = (await page.evaluate(() => window.__clk.n)) > before; }
    if (!moved) throw new Error('clockStep : aucune image en 36 ms d\'horloge factice');
  }
}
export async function clockResume(ctx) { await ctx.clock.resume(); }

/** Attend que `n` images (window.__fi) se soient écoulées, comptées côté page par requestAnimationFrame. */
export async function waitFrames(page, n) {
  await page.evaluate(n => new Promise(r => { let k = 0; (function f() { if (++k >= n) r(); else requestAnimationFrame(f); })(); }), n);
}
export async function fi(page) { return page.evaluate(() => window.__fi || 0); }

/** Statistiques de temps d'image (ms) : p50/p95/p99, part > 33 ms (%), max, moyenne. */
export function frameStats(arr) {
  if (!arr || !arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const q = p => +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return { n: arr.length, avg: +avg.toFixed(2), p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +s[s.length - 1].toFixed(1),
    pct33: +(100 * arr.filter(v => v > 33).length / arr.length).toFixed(2), fps: +(1000 / avg).toFixed(1) };
}
/** Stats sur les images de jeu (phase play, non pausé), en excluant des fenêtres [t, t+excl] (captures). */
export function playStats(frames, excludeAt = [], exclMs = 1500) {
  const play = frames.filter(o => o.phase === 'play' && !o.paused && !excludeAt.some(t => o.t >= t && o.t < t + exclMs));
  return { play: frameStats(play.map(o => o.raw)), all: frameStats(frames.map(o => o.raw)),
    flat: frameStats(play.filter(o => o.persp < 0.5).map(o => o.raw)), tilt: frameStats(play.filter(o => o.persp >= 0.5).map(o => o.raw)) };
}

/* ------------------------------------------------------------ pilotes ---- */
/** Cerveau du bot (évalué dans la page) : direction normalisée, boost, pouvoir, ultime. */
export const botBrain = `(() => {
  const S = window.__S, s = S.snake; if (!s || S.phase !== 'play') return null;
  let ax = 0, ay = 0;
  for (const e of S.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - s.x, e.y - s.y) || 1; if (d < 260) { const w = (260 - d) / 260; ax -= (e.x - s.x) / d * w * 2.2; ay -= (e.y - s.y) / d * w * 2.2; } }
  for (const b of S.ebullets) { const d = Math.hypot(b.x - s.x, b.y - s.y) || 1; if (d < 160) { const w = (160 - d) / 160; ax -= (b.x - s.x) / d * w * 2; ay -= (b.y - s.y) / d * w * 2; } }
  let best = null, bd = 1e9;
  for (const p of S.pickups) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = p; } }
  if (best && bd < 600) { ax += (best.x - s.x) / bd * 0.9; ay += (best.y - s.y) / bd * 0.9; }
  let tgt = null, td = 1e9;
  for (const e of S.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - s.x, e.y - s.y); if (d > 220 && d < td) { td = d; tgt = e; } }
  if (tgt) { ax += (tgt.x - s.x) / td * 0.5; ay += (tgt.y - s.y) / td * 0.5; }
  const K = window.__K, m = 220;
  if (s.x < m) ax += (m - s.x) / m * 2; if (s.x > K.ARENA_W - m) ax -= (s.x - (K.ARENA_W - m)) / m * 2;
  if (s.y < m) ay += (m - s.y) / m * 2; if (s.y > K.ARENA_H - m) ay -= (s.y - (K.ARENA_H - m)) / m * 2;
  ax += Math.cos(s.ang) * 0.35; ay += Math.sin(s.ang) * 0.35;
  const n = Math.hypot(ax, ay) || 1;
  let danger = 0; for (const e of S.enemies) { if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) < 120) danger++; }
  const ph = window.__M.phases && window.__M.phases.state ? window.__M.phases.state() : {};
  const powerReady = Object.values(ph.cds || {}).some(v => v <= 0);
  return { dx: ax / n, dy: ay / n, boost: danger > 0 && s.boostE > 30, special: danger >= 2 && powerReady, ult: S.ult >= S.ultMax };
})()`;

/** Pilote clavier : traduit la décision du bot en flèches/Espace/R/E. */
export async function keyDrive(page, b, keysDown) {
  const want = new Set();
  if (b) {
    if (b.dx > 0.38) want.add('ArrowRight'); if (b.dx < -0.38) want.add('ArrowLeft');
    if (b.dy > 0.38) want.add('ArrowDown'); if (b.dy < -0.38) want.add('ArrowUp');
    if (b.boost) want.add('Space');
  }
  for (const k of [...keysDown]) if (!want.has(k)) { await page.keyboard.up(k); keysDown.delete(k); }
  for (const k of want) if (!keysDown.has(k)) { await page.keyboard.down(k); keysDown.add(k); }
  if (b && b.ult) await page.keyboard.press('r');
  if (b && b.special) await page.keyboard.press('e');
}

/** Pilote au doigt (CDP) : manche (id 1) + bouton boost (id 2) + tapes pouvoir/ultime (id 3). */
export function makeTouchDriver(page, cdp) {
  const T = touch(cdp);
  const st = { joy: null, boost: false, rects: null };
  async function rects() { if (!st.rects) st.rects = await page.evaluate(() => JSON.parse(JSON.stringify(window.__M.ui.rects()))); return st.rects; }
  function pts() {
    const a = [];
    if (st.joy) a.push({ x: st.joy.x, y: st.joy.y, id: 1 });
    if (st.boost) a.push({ x: st.rects.boost.x, y: st.rects.boost.y, id: 2 });
    return a;
  }
  return {
    async drive(b) {
      const R = await rects();
      try {
        if (!b) { if (st.joy || st.boost) { st.joy = null; st.boost = false; await T.end([]); } return; }
        if (!st.joy) { st.joy = { x: R.joy.x, y: R.joy.y, ox: R.joy.x, oy: R.joy.y }; await T.start(pts()); }
        st.joy.x = st.joy.ox + b.dx * 58; st.joy.y = st.joy.oy + b.dy * 58;
        await T.move(pts());
        if (b.boost && !st.boost) { st.boost = true; await T.start(pts()); }
        else if (!b.boost && st.boost) { st.boost = false; await T.end(pts()); }
        if (b.ult || b.special) {
          const r = b.ult ? R.ult : R.special;
          if (r) { await T.start([...pts(), { x: r.x, y: r.y, id: 3 }]); await T.end(pts()); }
        }
      } catch (e) { st.joy = null; st.boost = false; if (!/TouchStart first/.test(String(e.message))) throw e; }
    },
    async release() { const had = st.joy || st.boost; st.joy = null; st.boost = false; if (had) { try { await T.end([]); } catch (e) {} } }
  };
}

/* ------------------------------------------------- pilote déterministe (G1) ---
   La partie de diag doit être la même d'une exécution à l'autre pour que la part d'images > 33 ms soit
   comparable à ±1 point : mêmes entrées à la même image, même pas de temps. Le pilote tourne donc DANS
   la page, depuis le tick rAF de la sonde (après frame() du jeu), et n'échange rien avec Node pendant
   la partie :
   - window.__DT = 1/60 (sonde de 90-boot.js) : une image = 16,7 ms de jeu quel que soit le temps réel ;
   - à la première image de jeu, S.t est calé sur la minute suivante (les vérifications en (S.t|0) % n
     et les pas « S.t - dernier ≥ x » ne dépendent plus de l'instant réel de l'appui sur JOUER) ;
   - décision du bot (botBrain) toutes les `every` images depuis cette image ;
   - clavier : KeyboardEvent synthétiques sur window (flèches, Espace, e, r — mêmes gestionnaires) ;
   - tactile : TouchEvent synthétiques sur le canvas (#game → #app, mêmes gestionnaires que le doigt CDP),
     manche (id 1) à la géométrie de ui.rects(), boost (id 2), tapes pouvoir/ultime (id 3) ;
   - cartes : pointerdown sur la carte choisie (.s2card, suite à graine) après `cardWait` images.
   Les temps d'image mesurés par la sonde restent les deltas rAF réels. */
export async function installAutoPilot(page, opts = {}) {
  return page.evaluate(([o, brainSrc]) => {
    const S = window.__S, M = window.__M, P = window.__P;
    if (!P) throw new Error('installProbe d\'abord');
    const mode = o.mode || 'key', every = o.every || 4, cardWait = o.cardWait || 20, useUlt = o.ult !== false, useSpecial = o.special !== false;
    const brain = new Function('return ' + brainSrc);
    let a = (o.seed || 2030) | 0;
    const rnd = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const cv = document.getElementById('game');
    const st = window.__PST = { mode, f0: -1, t0: 0, tSnapFrom: 0, decisions: 0, cards: 0, cardsAt: -1, keys: [], joy: null, boost: false, ultN: 0, specialN: 0, events: 0 };
    window.__DT = 1 / 60;
    /* clavier */
    function key(type, k) { st.events++; window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === ' ' ? 'Space' : k, bubbles: true, cancelable: true })); }
    function keyApply(b) {
      const want = [];
      if (b) {
        if (b.dx > 0.38) want.push('ArrowRight'); if (b.dx < -0.38) want.push('ArrowLeft');
        if (b.dy > 0.38) want.push('ArrowDown'); if (b.dy < -0.38) want.push('ArrowUp');
        if (b.boost) want.push(' ');
      }
      for (const k of st.keys.slice()) if (want.indexOf(k) < 0) { key('keyup', k); st.keys.splice(st.keys.indexOf(k), 1); }
      for (const k of want) if (st.keys.indexOf(k) < 0) { key('keydown', k); st.keys.push(k); }
      if (b && b.ult && useUlt) { key('keydown', 'r'); key('keyup', 'r'); st.ultN++; }
      if (b && b.special && useSpecial) { key('keydown', 'e'); key('keyup', 'e'); st.specialN++; }
    }
    /* tactile */
    function mk(id, x, y) { return new Touch({ identifier: id, target: cv, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y, radiusX: 2, radiusY: 2, force: 1 }); }
    function active() { const l = []; if (st.joy) l.push(mk(1, st.joy.x, st.joy.y)); if (st.boost) l.push(mk(2, st.boost.x, st.boost.y)); return l; }
    function fire(type, changed) {
      st.events++;
      let all = active();
      if (type === 'touchend') { const ids = changed.map(t => t.identifier); all = all.filter(t => ids.indexOf(t.identifier) < 0); }
      else for (const t of changed) if (!all.some(u => u.identifier === t.identifier)) all.push(t);
      cv.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: all, targetTouches: all, changedTouches: changed }));
    }
    function touchApply(b) {
      const R = M.ui.rects();
      if (!b || !R || !R.joy) { touchRelease(); return; }
      if (!st.joy) { st.joy = { x: R.joy.x, y: R.joy.y, ox: R.joy.x, oy: R.joy.y }; fire('touchstart', [mk(1, st.joy.x, st.joy.y)]); }
      st.joy.x = st.joy.ox + b.dx * 58; st.joy.y = st.joy.oy + b.dy * 58;
      fire('touchmove', [mk(1, st.joy.x, st.joy.y)]);
      if (b.boost && !st.boost && R.boost) { st.boost = { x: R.boost.x, y: R.boost.y }; fire('touchstart', [mk(2, st.boost.x, st.boost.y)]); }
      else if (!b.boost && st.boost) { const t = mk(2, st.boost.x, st.boost.y); st.boost = false; fire('touchend', [t]); }
      const r = (b.ult && useUlt) ? R.ult : ((b.special && useSpecial) ? R.special : null);
      if (r) { if (b.ult && useUlt) st.ultN++; else st.specialN++; const t = mk(3, r.x, r.y); fire('touchstart', [t]); fire('touchend', [t]); }
    }
    function touchRelease() {
      const l = active(); st.joy = null; st.boost = false;
      if (l.length) fire('touchend', l);
    }
    const apply = mode === 'touch' ? touchApply : keyApply;
    const release = mode === 'touch' ? touchRelease : () => keyApply(null);
    function pickCard() {
      const els = Array.from(document.querySelectorAll('.s2card')).filter(el => el.style.display !== 'none' && el.offsetParent !== null);
      if (!els.length) return false;
      const el = els[Math.floor(rnd() * els.length)];
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: mode === 'touch' ? 'touch' : 'mouse' }));
      st.cards++;
      return true;
    }
    P.pilot = function (fi) {
      const ph = S.phase;
      if (ph === 'play' && !S.paused) {
        if (st.f0 < 0) {
          st.f0 = fi; st.tSnapFrom = S.t;
          S.t = 60000 * (Math.floor(S.t / 60000) + 1);   // calage : même S.t de départ à chaque exécution
          st.t0 = S.t;
        }
        if (st.cardsAt >= 0) st.cardsAt = -1;
        if ((fi - st.f0) % every === 0) { st.decisions++; apply(brain()); }
        return;
      }
      if (ph === 'cards') {
        if (st.cardsAt < 0) { release(); st.cardsAt = fi; return; }
        if (fi - st.cardsAt >= cardWait) { if (pickCard()) st.cardsAt = -1; }
        return;
      }
      if (st.keys.length || st.joy || st.boost) release();
    };
    return { mode, every, cardWait };
  }, [opts, botBrain]);
}
/** Lit l'état du pilote déterministe (window.__PST) et l'erreur éventuelle du crochet. */
export async function pilotState(page) {
  return page.evaluate(() => { const s = window.__PST || null; const P = window.__P; return s ? { ...s, t: window.__S.t, fi: window.__fi, err: P && P.pilotErr || null } : null; });
}
/** Joue `gameSecs` secondes de TEMPS DE JEU (S.t depuis la première image de jeu) avec le pilote déterministe
 *  installé par installAutoPilot ; Node ne fait que scruter S.t toutes les 100 ms (captures via opts.onTick(elGame)).
 *  Garde-fou : opts.wallCap secondes réelles (défaut 2,5 × gameSecs + 30). */
export async function playDet(ctx, gameSecs, opts = {}) {
  const { page } = ctx;
  const wallCap = (opts.wallCap || gameSecs * 2.5 + 30) * 1000;
  const t0 = Date.now();
  let lastTick = -1, deadAt = null, el = 0, st = null;
  while (Date.now() - t0 < wallCap) {
    st = await page.evaluate(() => { const S = window.__S, s = window.__PST; return { t: S.t, ph: S.phase, fi: window.__fi, f0: s ? s.f0 : -1, tt0: s ? s.t0 : 0 }; });
    el = st.f0 >= 0 ? (st.t - st.tt0) / 1000 : 0;
    if (st.ph === 'dead' && deadAt == null) deadAt = el;
    if (el >= gameSecs) break;
    if (opts.onTick && Math.floor(el) > lastTick) { lastTick = Math.floor(el); await opts.onTick(el); }
    await sleep(opts.period || 100);
  }
  const ps = await pilotState(page);
  return { played: +el.toFixed(2), wall: +((Date.now() - t0) / 1000).toFixed(1), frames: ps && ps.f0 >= 0 ? ps.fi - ps.f0 : 0, deadAt, pilot: ps };
}

/** Générateur pseudo-aléatoire à graine (mulberry32) : les choix du harnais sont les mêmes d'une exécution à l'autre. */
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const _cardRnd = mulberry32(2030);
/** Choisit une carte (suite pseudo-aléatoire à graine fixe : même choix à chaque exécution) quand S.phase === 'cards'. */
export async function handleCards(ctx) {
  const { page } = ctx;
  const ph = await page.evaluate(() => window.__S.phase);
  if (ph !== 'cards') return false;
  await sleep(350);
  const cards = page.locator('.s2card:visible');
  const n = await cards.count(); if (!n) return false;
  const c = cards.nth(Math.floor(_cardRnd() * n));
  try {
    const box = await c.boundingBox();
    if (box) { const x = box.x + box.width / 2, y = box.y + box.height / 2; if (ctx.kind === 'touch') await tapAt(ctx.cdp, x, y); else await page.mouse.click(x, y); }
  } catch (e) {}
  await sleep(250);
  return true;
}

/** Mode « dieu » par régénération : le serpent est rallongé dès qu'il est court (dégâts, effets et sons naturels). */
export async function installGod(page) {
  await page.evaluate(() => {
    window.__GOD = true;
    (function g() { requestAnimationFrame(g); const S = window.__S; if (window.__GOD && S.phase === 'play' && S.snake && S.snake.len < 10) { S.snake.len = 24; S.snake.hp = 24; if (S.snake.maxHp < 24) S.snake.maxHp = 24; } })();
  });
}
/** Invulnérabilité totale : S.snake.ghost et invuln maintenus à 1e9 à chaque image. */
export async function installInvuln(page) {
  await page.evaluate(() => {
    window.__INV = true;
    (function g() { requestAnimationFrame(g); const S = window.__S; if (window.__INV && S.snake) { if (S.snake.ghost < 1e9) S.snake.ghost = 1e9; if (S.snake.invuln < 1e9) S.snake.invuln = 1e9; } })();
  });
}

/** Joue `secs` secondes avec le bot (clavier ou doigt). opts : god, restart (REJOUER si mort), onTick(el), tickEvery, period. */
export async function playFor(ctx, secs, opts = {}) {
  const { page, cdp, kind } = ctx;
  const keys = new Set();
  const td = kind === 'touch' ? makeTouchDriver(page, cdp) : null;
  const t0 = Date.now();
  let lastTick = 0, deadAt = null, restarts = 0;
  while (Date.now() - t0 < secs * 1000) {
    const ph = await page.evaluate(() => window.__S.phase);
    if (ph === 'cards') { if (td) await td.release(); await handleCards(ctx); continue; }
    if (ph === 'dead') {
      if (deadAt == null) deadAt = (Date.now() - t0) / 1000;
      if (opts.restart) {
        if (td) await td.release(); else for (const k of keys) { await page.keyboard.up(k); keys.delete(k); }
        await sleep(1200);
        try { await startGame(ctx); restarts++; if (opts.onRestart) await opts.onRestart(); } catch (e) {}
        continue;
      }
      if (!opts.god) break;
    }
    if (ph === 'play') {
      const b = await page.evaluate(botBrain);
      if (td) await td.drive(b); else await keyDrive(page, b, keys);
    }
    const el = (Date.now() - t0) / 1000;
    if (opts.onTick && el - lastTick >= (opts.tickEvery || 5)) { lastTick = el; await opts.onTick(el); }
    await sleep(opts.period || 60);
  }
  if (td) await td.release(); else for (const k of keys) await page.keyboard.up(k);
  return { deadAt, restarts, played: (Date.now() - t0) / 1000 };
}

/* -------------------------------------------------------------- audio ---- */
/** Analyseur branché sur la prise audio.tap (quoi = 'tout' | 'musique'). RMS en dBFS. */
export async function installAudioTap(page, quoi = 'tout') {
  return page.evaluate((quoi) => {
    const M = window.__M;
    if (!M.audio || typeof M.audio.tap !== 'function') return { ok: false, why: 'audio.tap absent' };
    try { M.audio.init && M.audio.init(); } catch (e) {}
    const c = M.audio.ctx;
    if (!c) return { ok: false, why: 'audio.ctx absent' };
    const an = c.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
    const ok = M.audio.tap(an, quoi);
    if (!ok) return { ok: false, why: 'tap refusé' };
    const td = new Float32Array(2048);
    window.__rmsDb = function () { an.getFloatTimeDomainData(td); let s = 0; for (let i = 0; i < td.length; i++) s += td[i] * td[i]; const r = Math.sqrt(s / td.length); return r > 0 ? 20 * Math.log10(r) : -120; };
    window.__audState = function () { return c.state; };
    return { ok: true, state: c.state, sampleRate: c.sampleRate };
  }, quoi);
}

/* --------------------------------------------------------------- divers -- */
export function md5(buf) { return crypto.createHash('md5').update(buf).digest('hex'); }
export function isMain(metaUrl) {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl); } catch (e) { return false; }
}
export function save(name, obj) { fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 1)); }
/** Dernière ligne JSON + code de sortie : 0 (pass), 1 (échec mesuré), 2 (impossible de mesurer). */
export function finish(test, r) {
  const code = r.code != null ? r.code : (r.pass ? 0 : 1);
  const line = JSON.stringify({ test, pass: !!r.pass, measured: r.measured, threshold: r.threshold });
  console.log(line);
  process.exit(code);
}
/** Garde-fou de durée : tue le processus (code 2) si le script dépasse `secs`. */
export function deadline(secs, label = 'script') {
  const t = setTimeout(() => { console.log(JSON.stringify({ test: label, pass: false, measured: { timeout: secs }, threshold: 'durée ≤ ' + secs + ' s' })); process.exit(2); }, secs * 1000);
  t.unref();
  return t;
}
