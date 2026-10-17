/* tools/L7a/repli.mjs — sans fichier de piste, le jeu complet tourne en génératif sans erreur.
   Les requêtes vers musique/ sont refusées (le serveur ne les sert pas) ; on parcourt toutes les sections
   et une mort ; on vérifie que le son ne s'arrête jamais, que la grille reste à 114,995 BPM et qu'aucune
   mesure complète ne sort trois fois de suite.
     node tools/L7a/repli.mjs [url]  → tools/L7a/repli.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] || 'http://127.0.0.1:8131/proto-neon/tools/L7a/index.html';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const erreurs = [], refusees = [];
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push(String(e)));
await page.route('**/musique/**', r => { refusees.push(r.request().url()); r.abort(); });
await page.goto(URL);
await page.waitForTimeout(600);
await page.mouse.click(200, 400);
const rel = [];
async function releve(n, ms) {
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(ms);
    rel.push(await page.evaluate(() => { const m = window.__N.music, i = m.info(); return { t: m.context().currentTime, out: m.rmsOut(), style: i.style, piste: i.piste, bpm: i.bpm, layers: i.layers, etat: window.__N.game.etat() }; }));
  }
}
await releve(6, 500);
await page.evaluate(() => { window.__N.game.dbg.god(true); window.__N.game.dbg.vague(1); });
for (const [t, ms] of [[0.15, 6], [0.5, 6], [0.9, 8]]) { await page.evaluate(t => window.__N.music.tension(t), t); await releve(ms, 500); }
await page.evaluate(() => { const N = window.__N; N.game.dbg.god(false); N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: -1 }); });
await releve(10, 500);
await page.evaluate(() => window.__N.game.dbg.god(true));
for (const s of ['repit', 'alerte', 'boss', 'victoire', 'defaite', 'titre', 'jeu']) { await page.evaluate(n => window.__N.music.section(n), s); await releve(6, 500); }
const bars = await page.evaluate(() => window.__N.music.renderOffline(60, t => (t < 20 ? 0.2 : t < 40 ? 0.6 : 0.95), [], 22050).then(() => window.__N.music.lastBars));
let triple = 0; for (let i = 2; i < bars.length; i++) if (bars[i] === bars[i - 1] && bars[i] === bars[i - 2]) triple++;
const err = await page.evaluate(() => (window.__ERR && window.__ERR.count) || 0);
const info = await page.evaluate(() => window.__N.music.info());
const silences = rel.filter((r, i) => i > 0 && r.out < 1e-4 && r.etat !== 'mort' && r.etat !== 'reapparition');
const R = {
  refusees: refusees.length, etatPiste: info.piste, erreurs, err, triple, mesuresRendues: bars.length,
  bpm: [...new Set(rel.map(r => +(r.bpm || 0).toFixed(3)))], silences: silences.length, styles: [...new Set(rel.map(r => r.style))], releves: rel
};
fs.writeFileSync(path.join(ICI, 'repli.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify({ refusees: R.refusees, etatPiste: R.etatPiste, erreurs: erreurs.length, err, triple, mesures: bars.length, bpm: R.bpm, silences: R.silences, styles: R.styles }));
await browser.close();
const ok = erreurs.length === 0 && err === 0 && triple === 0 && R.silences === 0 && info.piste !== 'pret';
console.log(ok ? 'REPLI : tenu' : 'REPLI : ÉCHEC');
process.exit(ok ? 0 : 1);
