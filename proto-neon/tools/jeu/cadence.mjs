/* tools/jeu/cadence.mjs — J-29 : à 30 et à 60 images/s (__DT imposé), même distance par seconde et même
   durée de quart de tour. Une seconde en ligne droite, puis un virage vers le bas demandé au clavier simulé. */
import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const out = {};
for (const fps of [60, 30]) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  await page.addInitScript(f => { window.__SEED = 3; window.__DT = 1 / f; }, fps);
  await page.goto('' + (process.env.URL_JEU || 'http://127.0.0.1:8121/proto-neon/index.html') + '');
  await page.waitForFunction(() => window.__N && window.__N.intro);
  await page.evaluate(() => window.__N.intro.skip());
  const r = await page.evaluate(() => new Promise(res => {
    const N = window.__N, S = window.__S, g = N.game, upd = g.update; let p0 = null, t0 = -1, tTurn = -1, done = null;
    g.update = function (dt) {
      upd.call(this, dt);
      const d = g.dbg();
      if (d.t >= 0.5 && !p0) { p0 = { x: d.P.x, y: d.P.y, t: d.t }; }
      if (p0 && t0 < 0 && d.t >= p0.t + 1) { t0 = d.t; done = { dist: Math.hypot(d.P.x - p0.x, d.P.y - p0.y) / (d.t - p0.t) }; S.input.x = 0; S.input.y = 1; S.input.mag = 1; }
      if (t0 > 0 && tTurn < 0 && Math.abs(d.P.ang - Math.PI / 2) < 0.02) { tTurn = d.t - t0; S.input.mag = 0; g.update = upd; done.quartDeTourMs = Math.round(tTurn * 1000); res(done); }
    };
  }));
  out[fps + ' i/s'] = { pxParSeconde: +r.dist.toFixed(2), quartDeTourMs: r.quartDeTourMs };
  await ctx.close();
}
console.log(JSON.stringify(out));
await browser.close();
