// Temps réel (aucun __DT) : début de chaque étape au chronomètre du navigateur, coût de N.intro.draw()
// par image, intervalles entre images autour du saut vers le jeu. usage : node durees.mjs [ralenti=1] [saut=13]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const lent = +(process.argv[2] || 1), sautA = +(process.argv[3] || 13), mode = process.argv[4] || 'doigt';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => {
  window.__M = { etapes: [], cout: [], dts: [], t0: 0, part: {} };
  const W = (obj, name, key) => { if (!obj || !obj[name] || obj[name].__w) return; const f = obj[name]; const g = function () { const a = performance.now(); const r = f.apply(this, arguments); const P = window.__M.part; P[key] = (P[key] || 0) + performance.now() - a; return r; }; g.__w = true; obj[name] = g; };
  const wrap = () => {
    const N = window.__N;
    if (!N || !N.intro || !N.intro.draw) return false;
    if (!N.intro.__w) { const d = N.intro.draw; N.intro.draw = function () { const a = performance.now(); d.apply(this, arguments); const c = performance.now() - a; window.__M.cout.push(c); window.__M.part['intro.draw'] = (window.__M.part['intro.draw'] || 0) + c; }; N.intro.__w = true; }
    W(N.intro, 'update', 'intro.update'); W(N.game, 'update', 'game.update'); W(N.game, 'draw', 'game.draw'); W(N.game, 'drawTop', 'game.drawTop');
    W(N.music, 'init', 'music.init'); W(N.music, 'start', 'music.start'); W(N.art, 'unlock', 'art.unlock');
    W(N.fx, 'update', 'fx.update'); W(N.fx, 'draw', 'fx.draw'); W(N.gfx, 'present', 'present'); W(N.crt, 'apply', 'crt');
    return true;
  };
  let last = 0, prevE = null;
  (function f(now) {
    wrap();
    const N = window.__N, M = window.__M;
    if (N && N.intro && N.intro.state) {
      const s = N.intro.state(), e = s.mode === 'ouverture' ? s.etape : ('jeu:' + (window.__S && window.__S.phase));
      if (e !== prevE) { if (!M.t0) M.t0 = now; M.etapes.push({ e, ms: +(now - M.t0).toFixed(1) }); prevE = e; }
    }
    if (last) M.dts.push({ dt: now - last, ph: window.__S && window.__S.phase, et: window.__N && window.__N.intro ? window.__N.intro.state().etape : '', part: M.part });
    M.part = {};
    last = now; requestAnimationFrame(f);
  })(0);
});
const cdp = await ctx.newCDPSession(page);
if (lent > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: lent });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/intro/index.html');
await page.waitForFunction((T) => window.__N && window.__N.intro && window.__N.intro.state().t >= T, sautA, { polling: 100, timeout: 60000 });
if (mode === 'doigt') {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 200, id: 1 }] });
  await page.waitForTimeout(150);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else { await page.keyboard.down(mode); await page.waitForTimeout(150); await page.keyboard.up(mode); }
console.log('saut par', mode);
await page.waitForTimeout(1500);
const M = await page.evaluate(() => window.__M);
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
console.log('processeur bridé ×' + lent);
console.log('étapes (ms depuis la première image) :', M.etapes.map(x => x.e + ' ' + x.ms).join(' | '));
const durs = []; for (let i = 1; i < M.etapes.length; i++) durs.push(M.etapes[i - 1].e + ' ' + ((M.etapes[i].ms - M.etapes[i - 1].ms) / 1000).toFixed(2) + ' s');
console.log('durées :', durs.join(' | '));
console.log('coût de N.intro.draw : médiane', q(M.cout, 0.5).toFixed(2), 'ms, p95', q(M.cout, 0.95).toFixed(2), 'ms, max', Math.max(...M.cout).toFixed(2), 'ms sur', M.cout.length, 'images');
const iSaut = M.dts.findIndex(d => d.ph === 'play');
const autour = M.dts.slice(Math.max(0, iSaut - 6), iSaut + 10).map(d => d.dt.toFixed(1));
console.log('intervalles entre images autour du passage en jeu (ms) :', autour.join(' '));
const intro = M.dts.filter(d => d.ph === 'intro').map(d => d.dt);
console.log('intervalles pendant l\'ouverture : médiane', q(intro, 0.5).toFixed(1), 'ms, p95', q(intro, 0.95).toFixed(1), 'ms, max', Math.max(...intro).toFixed(1), 'ms');
const lents = M.dts.filter(d => d.dt > 25);
console.log('images lentes :', lents.map(d => d.dt.toFixed(0) + 'ms[' + d.ph + '/' + d.et + '] ' + Object.entries(d.part).map(([k, v]) => k + '=' + v.toFixed(1)).join(',')).join(' || '));
console.log('erreurs :', errs.length);
await browser.close();
