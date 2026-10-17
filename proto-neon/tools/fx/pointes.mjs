/* tools/fx/pointes.mjs — où tombent les pointes de coût : update ou draw, à quelle image */
import { build, lancer, ouvrir } from './commun.mjs';
build();
const browser = await lancer();
const { page, ctx } = await ouvrir(browser, 'iphone', { crt: 'riche' });
const r = await page.evaluate(() => new Promise(res => {
  const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx, rec = [];
  let s = 5; const rr = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const fu = fx.update, fd = fx.draw; let u = 0;
  fx.update = function (dt) { const t0 = performance.now(); fu(dt); u = performance.now() - t0; };
  fx.draw = function () { const t0 = performance.now(); fd(); const d = performance.now() - t0; rec.push([T.k, +u.toFixed(2), +d.toFixed(2), fx.stats.ex, fx.stats.live]); };
  for (let i = 0; i < 15; i++) T.act[5 + 8 * i] = () => fx.boom(Math.round(g.W * (0.15 + 0.7 * rr())), Math.round(g.H * (0.2 + 0.6 * rr())), 0.65 + 0.35 * rr(), 'magenta');
  for (let i = 0; i < 40; i++) { const k = 6 + 3 * i, p = T.act[k]; T.act[k] = () => { if (p) p(); fx.boom(Math.round(g.W * rr()), Math.round(g.H * rr()), 0.2 + 0.25 * rr(), 'magenta'); }; }
  T.k = 0;
  const iv = setInterval(() => { if (T.k >= 180) { clearInterval(iv); res(rec); } }, 50);
}));
console.log('images > 6 ms [k, update, draw, explosions, particules] :', JSON.stringify(r.filter(x => x[1] + x[2] > 6)));
console.log('pire update', Math.max(...r.map(x => x[1])), 'pire draw', Math.max(...r.map(x => x[2])));
await ctx.close(); await browser.close();
