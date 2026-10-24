// Sondes audiovisuelles partagées pour l'audit SNAKE 2030.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
export const URL = 'http://127.0.0.1:8112/snake2030/index.html';
export const OUT = '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch(kind) {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
  const ctxOpts = kind === 'iphone'
    ? { ...devices['iPhone 13 landscape'], hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: false, isMobile: false };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const cdp = await context.newCDPSession(page);
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__S && window.__M && window.__M.ui);
  return { browser, context, page, cdp };
}

/** Sonde : par image -> état, RMS audio, compteurs fx ; toutes les N images -> contraste des entités. */
export async function installProbe(page, opts = {}) {
  await page.evaluate((opts) => {
    const S = window.__S, M = window.__M, K = window.__K;
    const rec = window.__rec = [], ev = window.__ev = [], contr = window.__contr = [], ints = window.__ints = [];
    window.__fi = 0;
    // --- audio : analyseurs sur bus musique et master
    M.audio.init();
    const c = M.audio.ctx;
    const anM = c.createAnalyser(); anM.fftSize = 2048; anM.smoothingTimeConstant = 0;
    const anA = c.createAnalyser(); anA.fftSize = 2048; anA.smoothingTimeConstant = 0;
    window.__tapM = M.audio.tap(anM, 'musique'); window.__tapA = M.audio.tap(anA, 'tout');
    const tdM = new Float32Array(2048), tdA = new Float32Array(2048), fdM = new Float32Array(1024), fdA = new Float32Array(1024);
    const rms = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); };
    const bands = (fd, sr) => { // énergie moyenne (dB) par bande
      const binHz = sr / 2048; const lim = [0, 120, 400, 2000, 8000, sr / 2]; const out = [];
      for (let b = 0; b < 5; b++) { let s = 0, n = 0; for (let i = Math.max(1, Math.floor(lim[b] / binHz)); i < Math.min(1024, Math.floor(lim[b + 1] / binHz)); i++) { s += Math.pow(10, fd[i] / 10); n++; } out.push(n ? +(10 * Math.log10(s / n)).toFixed(1) : -120); }
      return out;
    };
    const centroid = (fd, sr) => { const binHz = sr / 2048; let num = 0, den = 0; for (let i = 1; i < 1024; i++) { const p = Math.pow(10, fd[i] / 10); num += p * i * binHz; den += p; } return den > 0 ? num / den : 0; };
    // --- journal setIntensity + fx
    const oSI = M.audio.setIntensity; M.audio.setIntensity = function (v) { ints.push([S.t, +v.toFixed(3)]); return oSI.call(this, v); };
    let fxN = { burst: 0, parts: 0, ring: 0, flare: 0, flash: 0, shake: 0, text: 0, hitstop: 0, glitch: 0, sfx: 0 };
    window.__fxN = fxN;
    const wrap = (obj, name, fn) => { const o = obj[name]; obj[name] = function () { fn.apply(null, arguments); return o.apply(this, arguments); }; };
    wrap(M.fx, 'burst', (x, y, col, n) => { fxN.burst++; fxN.parts += (n || 10); });
    wrap(M.fx, 'ring', () => fxN.ring++); wrap(M.fx, 'flare', () => fxN.flare++);
    wrap(M.fx, 'flash', (col, a, mode) => { fxN.flash++; ev.push({ t: S.t, k: 'flash', a: +(a || 0.5).toFixed(2), col, mode }); });
    wrap(M.fx, 'shake', (a) => { fxN.shake += a || 0; }); wrap(M.fx, 'text', () => fxN.text++);
    wrap(M.fx, 'hitstop', (ms) => { fxN.hitstop += ms || 0; }); if (M.fx.glitch) wrap(M.fx, 'glitch', () => fxN.glitch++);
    wrap(M.audio, 'sfx', (n) => { fxN.sfx++; ev.push({ t: S.t, k: 'sfx', n }); });
    if (M.ui) { wrap(M.ui, 'banner', (t) => ev.push({ t: S.t, k: 'banner', s: t })); wrap(M.ui, 'toast', (a, b) => ev.push({ t: S.t, k: 'toast', s: a + ' | ' + b })); }
    // --- luminance
    const game = document.getElementById('game');
    const small = document.createElement('canvas'); small.width = 96; small.height = 60; const sg = small.getContext('2d', { willReadFrequently: true });
    const lum = () => { try { sg.drawImage(game, 0, 0, 96, 60); const d = sg.getImageData(0, 0, 96, 60).data; let s = 0, mx = 0; for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; if (l > mx) mx = l; } return { all: +(s / (d.length / 4)).toFixed(1), max: +mx.toFixed(0) }; } catch (e) { return { all: -1, max: -1 }; } };
    // --- contraste par entité (lecture directe du canvas)
    const gctx = game.getContext('2d');
    const srgb = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const relL = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
    function toPx(x, y) {
      const ph = M.phases.state(); const CW = innerWidth, CH = innerHeight; const DPR = game.width / CW;
      const sx2 = CW / S.view.w, sy2 = CH / S.view.h; const rt = ph.rot || 0;
      let dx = (x - S.cam.x) * sx2, dy = (y - S.cam.y) * sy2;
      const px = CW / 2 + dx * Math.cos(rt) - dy * Math.sin(rt), py = CH / 2 + dx * Math.sin(rt) + dy * Math.cos(rt);
      return { x: px * DPR, y: py * DPR, sx: sx2 * DPR, dpr: DPR };
    }
    function sampleEntity(kind, sub, x, y, rWorld) {
      const p = toPx(x, y); const W = game.width, H = game.height;
      const rp = rWorld * p.sx; if (p.x < rp + 30 || p.y < rp + 30 || p.x > W - rp - 30 || p.y > H - rp - 30) return null;
      const cx = Math.round(p.x), cy = Math.round(p.y);
      const box = Math.max(1, Math.round(rp * 0.35));
      const d = gctx.getImageData(cx - box, cy - box, box * 2 + 1, box * 2 + 1).data;
      let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      const core = [r / n, g / n, b / n];
      // anneau à 1.6 r + 6 px : le fond immédiat (halo compris) ; 24 échantillons
      const rr = rp * 1.6 + 6 * p.dpr; let R = 0, G = 0, B = 0, N = 0; const ringL = [];
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; const sx = Math.round(cx + Math.cos(a) * rr), sy = Math.round(cy + Math.sin(a) * rr); if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue; const q = gctx.getImageData(sx, sy, 1, 1).data; R += q[0]; G += q[1]; B += q[2]; N++; ringL.push(relL(q[0], q[1], q[2])); }
      if (!N) return null;
      const ring = [R / N, G / N, B / N];
      const Lc = relL(core[0], core[1], core[2]), Lr = relL(ring[0], ring[1], ring[2]);
      const cr = (Math.max(Lc, Lr) + 0.05) / (Math.min(Lc, Lr) + 0.05);
      // contraste le plus faible sur l'anneau (le point où l'entité se perd)
      let worst = 1e9; for (const l of ringL) { const c2 = (Math.max(Lc, l) + 0.05) / (Math.min(Lc, l) + 0.05); if (c2 < worst) worst = c2; }
      return { kind, sub, t: Math.round(S.t), rpx: +(rp / p.dpr).toFixed(1), core: core.map(v => Math.round(v)), ring: ring.map(v => Math.round(v)), cr: +cr.toFixed(2), worst: +worst.toFixed(2) };
    }
    window.__sampleContrast = function () {
      if (S.phase !== 'play') return;
      if (M.fx.shakeAmount() > 0.2) return;
      const out = [];
      const s = S.snake; out.push(sampleEntity('snake', 'head', s.x, s.y, K.HEAD_R));
      if (s.segs[6]) out.push(sampleEntity('snake', 'body', s.segs[6].x, s.segs[6].y, K.HEAD_R * 0.75));
      let ne = 0; for (const e of S.enemies) { if (e.dead || ne > 10) continue; const r = sampleEntity('enemy', e.type + (e.elite ? '!' : '') + (e.mod ? '+' + e.mod : ''), e.x, e.y, e.r); if (r) { out.push(r); ne++; } }
      let nb = 0; for (const b of S.bullets) { if (nb > 6) break; const r = sampleEntity('bullet', b.kind || '?', b.x, b.y, b.r); if (r) { out.push(r); nb++; } }
      let neb = 0; for (const b of S.ebullets) { if (neb > 6) break; const r = sampleEntity('ebullet', b.kind || '?', b.x, b.y, b.r); if (r) { out.push(r); neb++; } }
      let np = 0; for (const p of S.pickups) { if (np > 6) break; const r = sampleEntity('pickup', p.kind, p.x, p.y, p.r); if (r) { out.push(r); np++; } }
      for (const o of out) if (o) contr.push(o);
    };
    let nextContr = 0, nextAud = 0;
    function sample() {
      requestAnimationFrame(sample); window.__fi++;
      const s = S.snake; if (!s) return;
      const ph = M.phases.state();
      const o = { fi: window.__fi, now: performance.now(), t: Math.round(S.t), phase: S.phase, ne: S.enemies.length, nb: S.bullets.length, neb: S.ebullets.length, np: S.pickups.length,
        int: +(S.intensity || 0).toFixed(3), len: s.len, kills: S.kills, combo: S.combo, mult: S.mult, score: S.score, level: S.level, lphase: S.levelPhase, boss: !!(S.boss && !S.boss.dead),
        zoom: +(ph.zoom || 1).toFixed(3), persp: +(ph.perspDeg || 0).toFixed(1), rot: +(ph.rot || 0).toFixed(3), pkind: ph.phase, shake: +(M.fx.shakeAmount() || 0).toFixed(2), hs: M.fx.hitstopLeft(),
        boosting: s.boosting, fx: { ...fxN } };
      if (performance.now() >= nextAud) {
        nextAud = performance.now() + 100;
        anM.getFloatTimeDomainData(tdM); anA.getFloatTimeDomainData(tdA); anM.getFloatFrequencyData(fdM); anA.getFloatFrequencyData(fdA);
        o.rmsM = +rms(tdM).toFixed(4); o.rmsA = +rms(tdA).toFixed(4); o.bM = bands(fdM, c.sampleRate); o.bA = bands(fdA, c.sampleRate); o.cM = Math.round(centroid(fdM, c.sampleRate)); o.cA = Math.round(centroid(fdA, c.sampleRate));
        o.lum = lum(); o.playing = M.audio.playing() ? 1 : 0; o.track = (M.audio.playing() || {}).i;
      }
      rec.push(o);
      if (opts.contrast && performance.now() >= nextContr && S.phase === 'play') { nextContr = performance.now() + (opts.contrastEvery || 1500); try { window.__sampleContrast(); } catch (e) { ev.push({ t: S.t, k: 'contrErr', s: String(e) }); } }
      if (rec.length > 30000) rec.splice(0, 5000);
    }
    requestAnimationFrame(sample);
  }, opts);
}

export async function startGame(page, kind) {
  const btn = page.locator('button.s2big:not(.mag)', { hasText: /^JOUER$/ });
  await btn.waitFor({ state: 'visible' });
  if (kind === 'iphone') await btn.tap(); else await btn.click();
  await page.waitForFunction(() => window.__S.phase === 'play');
}

export async function dump(page) {
  return page.evaluate(() => ({ rec: window.__rec, ev: window.__ev, contr: window.__contr, ints: window.__ints, stats: window.__M.audio.stats(), fxN: window.__fxN }));
}

export async function hudInfo(page) {
  return page.evaluate(() => {
    const q = s => document.querySelector(s); const cs = e => e ? getComputedStyle(e) : null;
    const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return { vw: innerWidth, vh: innerHeight, score: { fs: cs(q('.s2score')).fontSize, box: box(q('.s2score')) }, seg: { fs: cs(q('.s2seg>b')).fontSize, box: box(q('.s2seg')) },
      lv: { fs: cs(q('.s2lv>b')).fontSize, box: box(q('.s2lv')) }, bar: box(q('.s2bar')), xp: box(q('.s2xp')), prog: box(q('.s2prog')), gb: box(q('.s2gb')), gu: box(q('.s2gu')), mult: { fs: cs(q('.s2mult>b')).fontSize, box: box(q('.s2mult')) },
      pause: box(q('.s2pause')), hudOpacity: cs(q('.s2hud')).opacity, font: cs(q('#ui')).fontFamily, ctlOn: q('.s2ctl').classList.contains('on') };
  });
}

export function touch(cdp) {
  return {
    start: (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts }),
    move: (pts) => cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts }),
    end: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
  };
}

export const botBrain = `(() => {
  const S = window.__S, s = S.snake; if (!s || S.phase !== 'play') return null;
  let ax = 0, ay = 0;
  for (const e of S.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < 260) { const w = (260 - d) / 260; ax -= (e.x - s.x) / d * w * 2.2; ay -= (e.y - s.y) / d * w * 2.2; } }
  for (const b of S.ebullets) { const d = Math.hypot(b.x - s.x, b.y - s.y); if (d < 160) { const w = (160 - d) / 160; ax -= (b.x - s.x) / d * w * 2; ay -= (b.y - s.y) / d * w * 2; } }
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
  const ph = window.__M.phases.state();
  const powerReady = Object.values(ph.cds || {}).some(v => v <= 0);
  return { dx: ax / n, dy: ay / n, boost: danger > 0 && s.boostE > 30, special: danger >= 2 && powerReady, ult: S.ult >= S.ultMax };
})()`;

/* clavier : traduit la direction du bot en flèches */
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

export async function handleCards(page, kind) {
  const ph = await page.evaluate(() => window.__S.phase);
  if (ph !== 'cards') return false;
  await sleep(350);
  const cards = page.locator('.s2card:visible');
  const n = await cards.count(); if (!n) return false;
  const c = cards.nth(Math.floor(Math.random() * n));
  try { if (kind === 'iphone') await c.tap({ timeout: 800 }); else await c.click({ timeout: 800 }); } catch (e) {}
  await sleep(250);
  return true;
}
