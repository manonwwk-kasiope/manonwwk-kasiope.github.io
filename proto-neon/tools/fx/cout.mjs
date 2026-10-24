/* tools/fx/cout.mjs — coût de N.fx.update + N.fx.draw, sans sonde de pixels.
   Chromium de bureau, puis ralenti x4 (Emulation.setCPUThrottlingRate) : un ordre de grandeur pour un
   téléphone, PAS une mesure d'iPhone 13. */
import { build, lancer, ouvrir } from './commun.mjs';
build();
const browser = await lancer();
async function mesure(profil, ralenti, scenario) {
  const { page, ctx } = await ouvrir(browser, profil, { crt: 'riche' });
  if (ralenti > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: ralenti }); }
  const r = await page.evaluate(sc => new Promise(res => {
    const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx, ms = [];
    let s = 5; const rr = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const fu = fx.update, fd = fx.draw;
    let acc = 0;
    fx.update = function (dt) { const t0 = performance.now(); fu(dt); acc = performance.now() - t0; };
    fx.draw = function () { const t0 = performance.now(); fd(); ms.push(acc + performance.now() - t0); };
    if (sc === 'grosse') T.act[5] = () => { fx.boom(Math.round(g.W * 0.5), Math.round(g.H * 0.5), 1, 'magenta'); };
    if (sc === 'partie') {
      for (let i = 0; i < 30; i++) T.act[5 + 20 * i] = () => fx.boom(Math.round(g.W * rr()), Math.round(g.H * rr()), 0.25 + 0.3 * rr(), 'magenta');
      for (let i = 0; i < 4; i++) { const k = 15 + 150 * i, p = T.act[k]; T.act[k] = () => { if (p) p(); fx.boom(Math.round(g.W * (0.3 + 0.4 * rr())), Math.round(g.H * (0.3 + 0.4 * rr())), 1, 'magenta'); }; }
    }
    if (sc === 'chaine') {
      for (let i = 0; i < 15; i++) T.act[5 + 8 * i] = () => fx.boom(Math.round(g.W * (0.15 + 0.7 * rr())), Math.round(g.H * (0.2 + 0.6 * rr())), 0.65 + 0.35 * rr(), 'magenta');
      for (let i = 0; i < 40; i++) { const k = 6 + 3 * i, p = T.act[k]; T.act[k] = () => { if (p) p(); fx.boom(Math.round(g.W * rr()), Math.round(g.H * rr()), 0.2 + 0.25 * rr(), 'magenta'); }; }
    }
    const N0 = sc === 'grosse' ? 70 : (sc === 'partie' ? 600 : 180);
    T.k = 0;
    const iv = setInterval(() => { if (T.k >= N0) { clearInterval(iv); res(ms.slice(5, N0)); } }, 50);
  }), scenario);
  await ctx.close();
  r.sort((a, b) => a - b);
  const q = p => r[Math.min(r.length - 1, Math.floor(p * r.length))].toFixed(2);
  return `${profil} x${ralenti} ${scenario.padEnd(7)} : p50 ${q(0.5)} ms  p95 ${q(0.95)} ms  max ${r[r.length - 1].toFixed(2)} ms  (${r.length} images)`;
}
for (const sc of ['grosse', 'partie', 'chaine']) for (const ra of [1, 4]) console.log(await mesure('iphone', ra, sc));
await browser.close();
