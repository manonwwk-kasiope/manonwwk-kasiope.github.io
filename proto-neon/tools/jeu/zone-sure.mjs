/* tools/jeu/zone-sure.mjs — Chromium n'émule pas env(safe-area-inset-*) : on impose S.view.safe comme le
   ferait un iPhone 13 (paysage : encoche 47 px CSS à gauche et à droite, barre d'accueil 21 ; portrait : 47 en
   haut, 34 en bas), puis on capture l'interface et l'arène. */
import { chromium, devices } from 'playwright';
const OUT = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
for (const [nom, vp, safe] of [['paysage', { width: 844, height: 390 }, { l: 24, t: 0, r: 24, b: 11 }], ['portrait', { width: 390, height: 844 }, { l: 0, t: 24, r: 0, b: 17 }]]) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: vp });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; window.__MODE = 'expert'; window.__CHECK = [{ t: 50, name: 'zs' }]; });
  await page.addInitScript({ path: OUT + 'pilote.js' });
  await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
  await page.waitForFunction(() => window.__N && window.__N.intro);
  await page.evaluate(s => { window.__S.view.safe = s; window.__N.intro.skip(); }, safe);
  await page.waitForFunction(() => window.__HOLD, null, { timeout: 300000, polling: 100 });
  const g = await page.evaluate(() => { const d = window.__N.game.dbg(); return { W: d.W, H: d.H, arene: [d.AL, d.AR, d.AT, d.AB], bouton: d.SB, sure: window.__S.view.safe, tete: [Math.round(d.P.x), Math.round(d.P.y)] }; });
  await page.screenshot({ path: OUT + 'zs-' + nom + '.png' });
  console.log(nom, JSON.stringify(g));
  await ctx.close();
}
await browser.close();
