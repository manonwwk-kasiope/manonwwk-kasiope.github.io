/* tools/F/captures.mjs — le parcours de l'interface du lot F, avec captures (cartes, pause, fin) et un VRAI toucher sur une plaque.
   Usage : node tools/F/captures.mjs [--url URL] [--profil paysage|portrait|bureau] [--sortie /tmp/claude-501/lotF] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8133/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const DIR = arg('--sortie', '/tmp/claude-501/lotF');
const P = { paysage: { ...devices['iPhone 13 landscape'] }, portrait: { ...devices['iPhone 13'] }, bureau: { viewport: { width: 1440, height: 900 } } }[PROFIL];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await (await browser.newContext(P)).newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
const etat = () => page.evaluate(() => window.__N.game.etat());
const att = (nom, ms = 20000) => page.waitForFunction(n => window.__N.game.etat() === n, nom, { timeout: ms, polling: 50 });
const images = n => page.evaluate(n => new Promise(r => { const f0 = window.__FRAME; const t = () => window.__FRAME >= f0 + n ? r() : requestAnimationFrame(t); t(); }), n);
const trace = []; let ok = true;
const veut = async (nom, ms) => { try { await att(nom, ms); trace.push(nom); } catch (e) { ok = false; trace.push('!' + nom + '(est ' + await etat() + ')'); } };
await page.evaluate(() => window.__N.intro.skip());
await veut('plongee', 5000); await veut('jeu', 5000);
// de l'XP pour une montée de niveau, puis la fin de la vague 1 : l'écran des cartes
await page.evaluate(() => { const N = window.__N; N.cartes.xp(N.R.xp.seuils[1]); N.game.dbg.god(true); N.game.dbg.simuler(21.5); });
await veut('nettoyage', 8000); await veut('cartes', 8000);
await images(60);
await page.screenshot({ path: DIR + '/cartes-' + PROFIL + '.png' });
const info = await page.evaluate(() => { const N = window.__N, r = N.gfx.canvas().getBoundingClientRect(); return { px: N.gfx.PX, left: r.left, top: r.top, n: N.ui.main().length, rects: N.ui.main().map((_, i) => N.ui.rect(i)), main: N.ui.main(), ecran: window.__S.ecran, garde: N.R.cartes.garde }; });
console.log('cartes :', info.main.join(','), 'px', info.px, 'plaque 0', JSON.stringify(info.rects[0]), '(cible', Math.round(info.rects[0].w * info.px), 'x', Math.round(info.rects[0].h * info.px), 'pt)');
// une plaque ≥ 44 pt
if (info.rects.some(r => r.w * info.px < 44 || r.h * info.px < 44)) { ok = false; trace.push('!plaque < 44 pt'); }
// CHOISIS 2 : le premier toucher choisit sans changer d'écran, le second passe au vol
const cible = i => ({ x: info.left + (info.rects[i].x + info.rects[i].w / 2) * info.px, y: info.top + (info.rects[i].y + info.rects[i].h / 2) * info.px });
const n0 = info.n;
const c0 = cible(0);
if (P.hasTouch) await page.touchscreen.tap(c0.x, c0.y); else await page.mouse.click(c0.x, c0.y);
await images(30);
const apres = await page.evaluate(() => ({ e: window.__N.game.etat(), n: window.__N.ui.main().length, prises: window.__N.cartes.prises() }));
trace.push('tap1→' + apres.e + '(' + apres.n + ' plaques)');
for (let k = 0; k < 5 && (await etat()) === 'cartes'; k++) {
  await images(30); if (k === 0) await page.screenshot({ path: DIR + '/cartes2-' + PROFIL + '.png' });
  const r1 = await page.evaluate(() => window.__N.ui.rect(0)); const c1 = { x: info.left + (r1.x + r1.w / 2) * info.px, y: info.top + (r1.y + r1.h / 2) * info.px };
  if (P.hasTouch) await page.touchscreen.tap(c1.x, c1.y); else await page.mouse.click(c1.x, c1.y);
  await images(5);
}
await veut('vol', 8000); await veut('jeu', 8000);
// pause par le clavier, capture
await page.keyboard.press('KeyP'); await veut('pause', 2000); await images(20);
await page.screenshot({ path: DIR + '/pause-' + PROFIL + '.png' });
await page.keyboard.press('KeyP'); await veut('jeu', 2000);
// la mort : trois vies
await page.evaluate(() => { window.__N.game.dbg.god(false); });
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => { window.__N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 }); });
  await veut('mort', 3000);
  if (i < 2) { await veut('reapparition', 6000); await veut('jeu', 6000); }
}
await veut('fin', 6000);
await images(90);
await page.screenshot({ path: DIR + '/fin-' + PROFIL + '.png' });
const resume = await page.evaluate(() => window.__N.score.resume());
if (!resume) { console.log(trace.join(' → ')); console.log('ERR', JSON.stringify(await page.evaluate(() => Object.keys(window.__ERR.sigs))), logs.slice(0, 4)); await browser.close(); process.exit(1); }
console.log('résumé :', JSON.stringify({ cause: resume.cause, auteur: resume.auteur, vague: resume.vague, note: resume.note, build: resume.build.nom, conseil: resume.conseil, energie: resume.energieGagnee, prochain: resume.prochain && resume.prochain.id }));
// REJOUER : le serpent en main en moins de 2 s
const t0 = Date.now();
if (P.hasTouch) await page.touchscreen.tap(P.viewport ? P.viewport.width / 2 : 400, 100); else await page.mouse.click(700, 300);
await veut('plongee', 4000); await veut('jeu', 4000);
const dtRejouer = Date.now() - t0;
const err = await page.evaluate(() => ({ n: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs) }));
console.log(trace.join(' → '));
console.log('REJOUER → jeu en', dtRejouer, 'ms ; __ERR.count =', err.n, err.sigs.join(' | '), '; console :', logs.length);
for (const l of logs.slice(0, 6)) console.log('  ' + l);
await browser.close();
process.exit(ok && err.n === 0 && logs.length === 0 ? 0 : 1);
