/* tools/jeu/cout.mjs — coût d'image au plus fort du chaos (iPhone 13 paysage, pilote expert, graine 7).
   Mesure, dans le banc et jamais dans le jeu, la durée de chaque appel de N.game.update/draw/drawTop et de
   l'image entière (rappel de requestAnimationFrame), de 95 à 118 s de jeu. Usage : node cout.mjs [ralenti] */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const rate = +(process.argv[2] || 1);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; window.__MODE = 'expert'; window.__CHECK = []; });
await page.addInitScript({ path: new URL('./pilote.js', import.meta.url).pathname });
await page.addInitScript(() => {
  /* boucle accélérée et chronométrée : l'image entière, telle que 90-boot.js la déroule */
  window.__HOLD = false; window.__FR = []; window.__GM = [];
  window.requestAnimationFrame = function (cb) {
    setTimeout(function tick() { if (window.__HOLD) { setTimeout(tick, 15); return; } const a = performance.now(); cb(a); const d = performance.now() - a; const g = window.__N && window.__N.game; if (g && g.dbg && g.dbg().t > 95 && g.dbg().st === 'jeu') window.__FR.push(d); }, 0);
    return 1;
  };
});

await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__N.intro);
await page.evaluate(() => {
  const g = window.__N.game; let acc = 0;
  for (const k of ['update', 'draw', 'drawTop']) { const f = g[k]; g[k] = function () { const a = performance.now(); const r = f.apply(this, arguments); acc += performance.now() - a; if (k === 'drawTop') { if (g.dbg().t > 95 && g.dbg().st === 'jeu') window.__GM.push(acc); acc = 0; } return r; }; }
  window.__N.intro.skip();
});
if (rate > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); }
await page.waitForFunction(() => window.__N.game.dbg().t > 118 || window.__N.game.dbg().st !== 'jeu', null, { timeout: 900000, polling: 500 });
const r = await page.evaluate(() => {
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return +(s[Math.min(s.length - 1, Math.floor(p * s.length))] || 0).toFixed(2); };
  const d = window.__N.game.dbg();
  return { ralenti: 0, images: window.__FR.length, imageP50: q(window.__FR, 0.5), imageP95: q(window.__FR, 0.95), imageMax: q(window.__FR, 1),
    jeuP50: q(window.__GM, 0.5), jeuP95: q(window.__GM, 0.95), jeuMax: q(window.__GM, 1), vivants: d.E.length, tirs: d.EB.length + d.PB.length, segments: d.P.len, t: +d.t.toFixed(1), st: d.st };
});
r.ralenti = rate;
console.log(JSON.stringify(r));
await browser.close();
