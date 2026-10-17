/* tools/jeu/cadence.mjs — J-29 (adapté au contrat 1.0 par le lot 0b) : à 30, 60 et 120 images/s (__DT imposé),
   le pas fixe de 1/120 s (N.horloge) donne la même distance par seconde et la même durée de quart de tour.
   Une seconde en ligne droite, puis un virage vers le bas demandé au manche (S.input), mesurés sur S.player et
   N.horloge.t() (secondes de temps de jeu), à chaque pas, par un crochet sur N.game.update.
   Usage : node tools/jeu/cadence.mjs [url]. Sortie 0 si les écarts restent sous 1 % et un pas de 1/120 s. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://127.0.0.1:8112/proto-neon/index.html';
const browser = await chromium.launch();
const out = {};
for (const fps of [120, 60, 30]) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  await page.addInitScript(f => { window.__SEED = 3; window.__DT = 1 / f; }, fps);
  await page.goto(url);
  await page.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg);
  const r = await page.evaluate(() => new Promise(res => {
    const N = window.__N, S = window.__S, g = N.game, upd = g.update;
    N.game.dbg.vague(1); N.game.dbg.god(true);
    S.input.x = 1; S.input.y = 0; S.input.mag = 1;
    let p0 = null, t0 = -1, done = null;
    g.update = function (dt) {
      upd.call(this, dt);
      const P = S.player, t = N.horloge.t();
      if (!P || g.etat() !== 'jeu') return;
      if (t >= 0.5 && !p0) p0 = { x: P.x, y: P.y, t };
      if (p0 && t0 < 0 && t >= p0.t + 1) { t0 = t; done = { dist: Math.hypot(P.x - p0.x, P.y - p0.y) / (t - p0.t) }; S.input.x = 0; S.input.y = 1; S.input.mag = 1; }
      if (t0 > 0 && Math.abs(P.ang - Math.PI / 2) < 0.02) { done.quartDeTourMs = Math.round((t - t0) * 1000); S.input.mag = 0; g.update = upd; res(done); }
    };
  }));
  out[fps + ' i/s'] = { pxParSeconde: +r.dist.toFixed(2), quartDeTourMs: r.quartDeTourMs };
  await ctx.close();
}
console.log(JSON.stringify(out));
const v = Object.values(out), d0 = v[0].pxParSeconde, q0 = v[0].quartDeTourMs;
const ok = v.every(x => Math.abs(x.pxParSeconde - d0) / d0 < 0.01 && Math.abs(x.quartDeTourMs - q0) <= 9);
console.log(ok ? 'CADENCE : OK' : 'CADENCE : ÉCHEC');
await browser.close();
process.exit(ok ? 0 : 1);
