/* tools/jeu/fumee.mjs — essai de fumée : ouvre la page, saute l'ouverture, joue N secondes de jeu
   (pas imposé __DT, graine __SEED), capture, et rend l'état du jeu et les erreurs.
   Usage : node tools/jeu/fumee.mjs profil secondes sortie.png   (profil : bureau | paysage | portrait) */
import { chromium, devices } from 'playwright';
const [profil = 'bureau', secs = '10', out = 'tools/jeu/fumee.png'] = process.argv.slice(2);
const P = {
  bureau: { viewport: { width: 1440, height: 900 } },
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
}[profil];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto('' + (process.env.URL_JEU || 'http://127.0.0.1:8121/proto-neon/index.html') + '');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); else window.__S.phase = 'play'; });
/* la joueuse invulnérable (N.game.dbg.god) : sans pilote, un vrai serpent meurt en quelques secondes et l'essai ne finirait pas */
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
await page.evaluate(() => window.__N.game.dbg.god(true));
const t0 = Date.now();
/* les CARTES attendent un toucher entre deux vagues : un bot presse 1 dès qu'elles apparaissent */
const dl = Date.now() + 120000;
for (;;) {
  const [t, e] = await page.evaluate(() => [window.__N.game.dbg().t, window.__N.game.etat()]);
  if (t >= +secs || Date.now() > dl) break;
  if (e === 'cartes') { await page.waitForTimeout(400); await page.keyboard.press('Digit1'); }
  else await page.waitForTimeout(80);
}
const ms = Date.now() - t0;
const info = await page.evaluate(() => {
  const d = window.__N.game.dbg();
  return { t: d.t.toFixed(2), st: d.st, W: d.W, H: d.H, arena: [d.AL, d.AR, d.AT, d.AB], len: d.P.len, lives: d.P.lives, score: d.score, kills: d.kills,
    alive: d.E.length, cells: d.CELLS.length, phase: window.__S.phase, etat: d.etat, vague: d.vague, err: window.__ERR, enemyStart: d.enemyStart, frame: window.__FRAME,
    spawns: d.stats.spawns.length, inView: d.stats.inView, px: window.__N.gfx.PX };
});
await page.screenshot({ path: out });
console.log(JSON.stringify(info), 'reel', ms, 'ms');
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
