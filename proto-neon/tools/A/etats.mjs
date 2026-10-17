/* tools/A/etats.mjs — le parcours des états avec les replis, sans erreur (critère du lot 0b) :
   demarrage → titre → plongee → jeu → nettoyage → cartes → vol → jeu → mort → reapparition → … → fin → plongee
   Chaque étape vérifie N.game.etat(). Usage : node tools/A/etats.mjs [--url URL] [--profil paysage|portrait|bureau] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8121/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
const etat = () => page.evaluate(() => window.__N.game.etat());
const att = (nom, ms = 20000) => page.waitForFunction(n => window.__N.game.etat() === n, nom, { timeout: ms, polling: 50 });
let ok = true; const trace = [];
async function veut(nom, ms) { try { await att(nom, ms); trace.push(nom); } catch (e) { ok = false; trace.push('!' + nom + '(est ' + await etat() + ')'); } }
const tap = () => page.evaluate(() => { const S = window.__S; S.input.taps = S.input.taps || []; });
trace.push(await etat());                                    // demarrage
await page.evaluate(() => window.__N.intro.skip());          // l'ancienne boucle : l'ouverture sautée lance la partie
await veut('plongee', 5000);
await veut('jeu', 5000);
// finir la vague 1 : en mode simulé, la joueuse invulnérable, jusqu'à la fin de la vague
await page.evaluate(() => { window.__N.game.dbg.god(true); window.__N.game.dbg.simuler(21.5); });
await veut('nettoyage', 8000);
await veut('cartes', 8000);
// choisir la première carte par un toucher simulé sur le canvas
await page.evaluate(() => { const o = window.__N.outils; const r = window.__N.ui.cartes; });
await page.waitForTimeout(500);
await page.keyboard.press('Digit1');
await veut('vol', 8000);
await veut('jeu', 8000);
// la mort : god off, tuer
await page.evaluate(() => { window.__N.game.dbg.god(false); window.__N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 }); });
await veut('mort', 3000);
await veut('reapparition', 6000);
await veut('jeu', 6000);
// deux morts de plus (la partie en compte trois) : game over à la troisième
for (let i = 0; i < 2; i++) {
  await page.evaluate(() => { window.__N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: -1 }); });
  await veut('mort', 3000);
  if (i < 1) { await veut('reapparition', 6000); await veut('jeu', 6000); }
}
await veut('fin', 6000);
await page.waitForTimeout(700);
await page.keyboard.press('Space');
await veut('plongee', 4000);
await veut('jeu', 4000);
const err = await page.evaluate(() => ({ n: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs) }));
console.log(trace.join(' → '));
console.log('__ERR.count =', err.n, err.sigs.join(' | '), '; console :', logs.length);
for (const l of logs.slice(0, 6)) console.log('  ' + l);
await browser.close();
process.exit(ok && err.n === 0 && logs.length === 0 ? 0 : 1);
