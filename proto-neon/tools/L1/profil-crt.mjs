/* tools/L1/profil-crt.mjs — ce que coûte le tube, poste par poste (expérience du lot 1, pas un critère).
   Usage : node tools/L1/profil-crt.mjs [url] [profil] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://127.0.0.1:8121/proto-neon/tools/L1/index.html';
const prof = process.argv[3] || 'paysage';
const P = { paysage: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  bureau: { viewport: { width: 1440, height: 900 } } }[prof];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext(P); const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.addInitScript(() => { window.__DT = 1 / 60; window.__SEED = 3; });
await page.goto(url); await page.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg);
await page.evaluate(() => { __N.game.dbg.scene('charge'); __N.game.dbg.god(true); if (__N.crt.auto) __N.crt.auto(false); });
const r = await page.evaluate(async () => {
  const N = __N, out = {};
  const mes = async (nom, fn) => {
    fn && fn();
    const a = N.crt.apply, T = []; let tot = [];
    N.crt.apply = function (dt) { const t0 = performance.now(); a(dt); T.push(performance.now() - t0); };
    const raf = window.requestAnimationFrame;
    await new Promise(res => setTimeout(res, 2500));
    N.crt.apply = a;
    T.sort((x, y) => x - y);
    out[nom] = { n: T.length, p50: +T[T.length >> 1].toFixed(2), p95: +T[(T.length * 0.95) | 0].toFixed(2), max: +T[T.length - 1].toFixed(2) };
  };
  N.crt.preset('riche'); await mes('riche');
  N.crt.bloom = 0; await mes('sans halo');
  N.crt.preset('riche'); N.crt.ab = 0; await mes('sans aberration');
  N.crt.preset('riche'); N.crt.bloom = 0; N.crt.ab = 0; await mes('ni halo ni aberration');
  N.crt.preset('sobre'); await mes('sobre');
  N.crt.preset('riche');
  out.taille = { W: N.gfx.W, H: N.gfx.H, PX: N.gfx.PX, K: N.gfx.K, toile: [N.gfx.canvas().width, N.gfx.canvas().height] };
  out.perf = __S.perf;
  return out;
});
console.log(JSON.stringify(r, null, 1)); console.log('erreurs', errs.length, errs.slice(0, 3));
await b.close();
