/* tools/A/verifier.mjs — une partie simulée (mode simulé, sans dessin) sous la VÉRIFICATION du bus d'événements :
   un consommateur hors du tableau du § 7.4, ou une charge hors schéma, est une erreur. Chaque enregistrement du
   journal est validé contre son schéma. La joueuse est pilotée par un bot simple (cap qui tourne, cartes prises).
   Usage : node tools/A/verifier.mjs [--url URL] [--secs N] [--graine N] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8121/proto-neon/index.html');
const SECS = +arg('--secs', '150');
const GRAINE = +arg('--graine', '7');
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(g => { window.__SEED = g; }, GRAINE);
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
/* depuis le nouveau démarrage (horloge à pas fixes), sauter l'ouverture ne suffit plus : on touche l'écran comme une joueuse, jusqu'à la partie */
for (let k = 0; k < 12; k++) { const e0 = await page.evaluate(() => window.__N.game.etat()); if (!['demarrage', 'ouverture', 'titre', 'briefing'].includes(e0)) break; const v = page.viewportSize(); if ((await page.evaluate(() => 'ontouchstart' in window))) await page.touchscreen.tap(v.width / 2, v.height / 2); else await page.mouse.click(v.width / 2, v.height / 2); await page.waitForFunction(e => window.__N.game.etat() !== e && (window.__N.game.etat() === 'titre' || window.__N.game.etat() === 'plongee' || window.__N.game.etat() === 'jeu' ? (window.__N.game.dbg.god(true), true) : true), e0, { timeout: 3000, polling: 'raf' }).catch(() => {}); }
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const r = await page.evaluate(async (secs) => {
  const N = window.__N, S = window.__S, g = N.game;
  N.ev.verifier(true); N.journal.actif(true);
  const etats = {}; let morts = 0, cartes = 0;
  for (let s = 0; s < secs; s++) {
    const e = g.etat(); etats[e] = (etats[e] || 0) + 1;
    if (e === 'cartes') { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' })); cartes++; }
    if (e === 'fin') { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); }
    // le bot : il chasse l'ennemi le plus proche (sinon la cellule la plus proche), reste loin des murs ;
    // un coup sur trois secondes de partie, la joueuse est mortelle (les morts passent aussi par la vérification)
    const P = N.joueuse.tete, m = N.joueuse.distMur(P.x, P.y);
    g.dbg.god(!(s % 3 === 2));
    let cib = null, dm = 1e9;
    for (const q of N.ennemis.list.concat(N.butin.list)) { const d = Math.hypot(q.x - P.x, q.y - P.y); if (d < dm) { dm = d; cib = q; } }
    const a = cib ? Math.atan2(cib.y - P.y, cib.x - P.x) : s * 0.9;
    g.dbg.input(m.d < 40 ? { x: m.nx, y: m.ny, mag: 1 } : { x: Math.cos(a), y: Math.sin(a), mag: 1 });
    g.dbg.simuler(1);
    if (e === 'mort') morts++;
  }
  const J = N.journal.dump(), mauvais = [], types = {};
  for (const rec of J) {
    types[rec.type] = (types[rec.type] || 0) + 1;
    if (!N.ids.journal.includes(rec.type)) continue;
    const er = N.ids.valider('journal:' + rec.type, rec);
    if (er.length && mauvais.length < 6) mauvais.push(rec.type + ' : ' + er.join(' ; '));
  }
  return { etats, morts, cartes, types, mauvais, ev: N.ev.stats(), err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 8), score: N.score.score, vague: N.dir.vague(), etat: g.etat() };
}, SECS);
console.log(JSON.stringify(r, null, 1));
console.log('console :', logs.length); for (const l of logs.slice(0, 6)) console.log('  ' + l);
await browser.close();
process.exit(r.err === 0 && r.mauvais.length === 0 && logs.length === 0 ? 0 : 1);
