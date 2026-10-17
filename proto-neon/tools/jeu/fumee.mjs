/* tools/jeu/fumee.mjs — essai de fumée (contrat 1.0, adapté par le lot 0b) : ouvre le bundle, lance une
   partie par les crochets (dbg.vague(1)), la fait jouer N secondes de TEMPS DE JEU par le pilote de repli
   (pas imposé __DT, graine __SEED), capture, et rend l'état du jeu et les erreurs. Les cartes, la mort et
   l'écran de fin sont traversés par le pilote : le parcours ne dépend d'aucun module en particulier.
   Usage : node tools/jeu/fumee.mjs profil secondes sortie.png [url]   (profil : bureau | paysage | portrait)
   Sortie 0 si __ERR.count = 0 et la console est vide. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [profil = 'bureau', secs = '10', out = 'tools/jeu/fumee.png', url = 'http://127.0.0.1:8112/proto-neon/index.html'] = process.argv.slice(2);
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
await page.goto(url);
await page.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg && window.__S);
await page.evaluate(() => { const N = window.__N; N.game.dbg.vague(1); N.pilote.niveau('bon'); N.pilote.activer(true); });
const t0 = Date.now();
await page.waitForFunction((s) => window.__N.horloge.t() >= s, +secs, { timeout: Math.max(60000, secs * 4000), polling: 100 });
const ms = Date.now() - t0;
const info = await page.evaluate(() => {
  const N = window.__N, S = window.__S, P = S.player || {};
  return { t: N.horloge.t().toFixed(2), etat: N.game.etat(), W: N.gfx.W, H: N.gfx.H, px: N.gfx.PX, monde: S.monde, len: P.len, joueuse: P.etat,
    vies: N.score.vies, score: N.score.score, vague: S.vague && S.vague.nom, vivants: N.ennemis.count(), butin: S.butin.length,
    tirs: S.shots.length, tele: S.tele.length, frame: window.__FRAME, err: window.__ERR, transitions: N.game.dbg.historique().map(h => h.etat).join(' → ') };
});
await page.screenshot({ path: out });
console.log(JSON.stringify(info), 'reel', ms, 'ms');
if (logs.length) console.log(logs.slice(0, 20).join('\n'));
await browser.close();
process.exit(info.err.count === 0 && !logs.some(l => !l.startsWith('warning')) ? 0 : 1);
