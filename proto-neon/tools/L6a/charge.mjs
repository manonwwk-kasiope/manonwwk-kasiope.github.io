/* tools/L6a/charge.mjs — le coût de l'image sur la scène 'charge' (iPhone 13 paysage), page du lot contre la page
   des squelettes (tools/L6a/base/, mêmes fichiers sauf les trois du lot), mesurées en alternance : la machine des
   bancs est partagée, seul l'écart compte (nonreg : au plus 0,5 ms de plus que la référence).
   Mesure aussi le coût propre des trois modules par image (fx.draw, drawTele, drawEcran, scene) sur cette scène. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { ecrire, ICI } from './commun.mjs';
/* la page des squelettes : src/ de la copie, avec les trois fichiers du lot pris au commit de base */
const PN = path.resolve(ICI, '../..'), TMP = path.join(ICI, 'base-src');
if (!fs.existsSync(path.join(ICI, 'base/index.html'))) {
  fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  fs.cpSync(path.join(PN, 'src'), path.join(TMP, 'src'), { recursive: true }); fs.copyFileSync(path.join(PN, 'build.mjs'), path.join(TMP, 'build.mjs'));
  for (const d of ['art', 'musique']) fs.symlinkSync(path.join(PN, d), path.join(TMP, d));
  const base = execSync('git merge-base HEAD origin/claude/snake-game-mobile-17dqpi', { cwd: PN }).toString().trim();
  for (const f of ['40-sprites.js', '50-fx.js', '79-scene.js']) fs.writeFileSync(path.join(TMP, 'src', f), execSync('git show ' + base + ':proto-neon/src/' + f, { cwd: PN }));
  execSync('node build.mjs ' + path.join(ICI, 'base/index.html'), { cwd: TMP });
  fs.rmSync(TMP, { recursive: true, force: true });
}
const B = 'http://127.0.0.1:8129/proto-neon/tools/L6a/';
const nav = await chromium.launch();
async function mesure(url) {
  const ctx = await nav.newContext({ ...devices['iPhone 13 landscape'] }), pg = await ctx.newPage();
  await pg.goto(url + '?scene=charge');
  await pg.waitForFunction(() => window.__N && window.__S && window.__S.frame > 30);
  await pg.waitForTimeout(4000);
  const r = await pg.evaluate(() => {
    const N = window.__N, out = { p95: window.__S.perf.p95, p50: window.__S.perf.p50 };
    /* coût propre des modules du lot, 200 images rejouées sur l'état courant (minimum de 3 par image) */
    const ms = [];
    for (let i = 0; i < 200; i++) {
      let best = 1e9;
      for (let z = 0; z < 3; z++) { const t0 = performance.now(); N.gfx.origin(N.cam.x, N.cam.y); N.fx.draw(); N.fx.drawTele(); N.gfx.origin(0, 0); N.fx.drawEcran(); N.scene.update(0); const d = performance.now() - t0; if (d < best) best = d; }
      ms.push(best);
    }
    ms.sort((a, b) => a - b); out.lot95 = ms[190]; out.lot50 = ms[100]; out.teles = (N.S.tele || []).length; out.ex = N.fx.stats ? N.fx.stats.ex : 0;
    return out;
  });
  await ctx.close();
  return r;
}
const res = { lot: [], base: [] };
for (let k = 0; k < 3; k++) { res.base.push(await mesure(B + 'base/index.html')); res.lot.push(await mesure(B + 'index.html')); }
await nav.close();
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
res.resume = { baseP95: med(res.base.map(x => x.p95)), lotP95: med(res.lot.map(x => x.p95)), ecart: +(med(res.lot.map(x => x.p95)) - med(res.base.map(x => x.p95))).toFixed(2), lotPropre95: med(res.lot.map(x => x.lot95)), basePropre95: med(res.base.map(x => x.lot95)) };
ecrire('charge.json', res);
console.log(JSON.stringify(res));
