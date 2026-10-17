/* tools/F/score.mjs — essai de N.score (lot F) : défi de vague tiré à l'entrée et réussi par les événements, prime et énergie,
   résumé de fin au schéma, déblocage par l'énergie, records (stockage refusé sans erreur).
   Usage : node tools/F/score.mjs [--url URL] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8133/proto-neon/index.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13 landscape'] })).newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.score && window.__S);
const res = await page.evaluate(() => {
  const N = window.__N, R = N.R, bad = [], info = {};
  const pas = () => N.ev.nouveauPas();
  // 1. un défi de vague par entrée de vague (V1 à V5), mesurable, réussi par ses propres événements
  const faits = [];
  for (let n = 1; n <= 5; n++) {
    N.socle.reset(7 + n); N.score.reset();
    const s0 = N.score.score; pas();
    N.ev.emit('vague', { n, etape: 'vague', evt: 'entree', nom: 'V' + n, quartier: 'docks' });
    const d = N.score.defiVague;
    if (!d) { bad.push('aucun défi à la vague ' + n); continue; }
    const def = d.def, but = d.but;
    for (let k = 0; k < but + 2 && d.etat === 'actif'; k++) {
      pas();
      if (def.lassos) N.ev.emit('lasso', { n: 3, ids: [1, 2, 3], aire: 400, x: 0, y: 0, poly: [0, 0, 1, 1] });
      else if (def.enfermes) N.ev.emit('lasso', { n: but, ids: [1], aire: 400, x: 0, y: 0, poly: [0, 0, 1, 1] });
      else if (def.cellules) N.ev.emit('ramassage', { type: 'cellule', x: 0, y: 0, valeur: 1 });
      else if (def.broyes) N.ev.emit('kill', { id: k, type: 'fleche', x: 0, y: 0, elite: false, boss: false, base: 50, src: { genre: 'arene', type: 'convoi', id: null }, distTete: 50, gen: 0 });
      else if (def.mines) N.ev.emit('kill', { id: k, type: 'mine', x: 0, y: 0, elite: false, boss: false, base: 40, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 50, gen: 0 });
      else if (def.tourelles) N.ev.emit('kill', { id: k, type: 'tourelle', x: 0, y: 0, elite: false, boss: false, base: 150, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 50, gen: 0 });
      else if (def.mult) { for (let q = 0; q < 5 * def.mult; q++) { pas(); N.ev.emit('kill', { id: q, type: 'larve', x: 0, y: 0, elite: false, boss: false, base: 20, src: { genre: 'arme', type: 'canon', id: -1 }, distTete: 50, gen: 0 }); } N.score.update(0.016); }
    }
    faits.push(d.id + ':' + d.etat);
    if (d.etat !== 'reussi') bad.push('défi ' + d.id + ' non réussi (' + d.prog + '/' + d.but + ')');
    else if (N.score.score - s0 < R.defis.vague.prime * n) bad.push('prime du défi ' + d.id + ' : ' + (N.score.score - s0));
  }
  info.defis = faits.join(' ');
  // 2. résumé de fin et déblocage par l'énergie
  N.socle.reset(7); N.score.reset();
  const e0 = N.score.energie;
  for (let i = 0; i < 300; i++) { pas(); N.ev.emit('ramassage', { type: 'noyau', x: 0, y: 0, valeur: 5 }); }
  pas();
  N.score.terminer(false);
  const r = N.score.resume();
  if (!r) bad.push('pas de résumé');
  else {
    if (r.energieGagnee < 1500) bad.push('énergie gagnée ' + r.energieGagnee);
    if (!r.debloques.includes('ralenti')) bad.push('RALENTI non débloqué (' + r.debloques.join(',') + ')');
    if (!N.score.deblocages.includes('ralenti')) bad.push('deblocages ne contient pas ralenti');
    if (!r.prochain || r.prochain.reste <= 0) bad.push('prochain déblocage absent');
    for (const k of ['score', 'cause', 'vague', 'progression', 'build', 'note', 'conseil', 'energie', 'prochain', 'avant', 'defi']) if (!(k in r)) bad.push('champ du résumé absent : ' + k);
    info.resume = { energie: r.energieGagnee, debloques: r.debloques, prochain: r.prochain && r.prochain.id, note: r.note };
  }
  // 3. le déblocage ouvre RALENTI dans le vivier
  N.cartes.reset();
  info.vivierRalenti = N.cartes.vivier().includes('ralenti');
  if (!info.vivierRalenti) bad.push('RALENTI absent du vivier après son déblocage');
  // 4. stockage refusé : aucune exception
  const sv = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('quota'); };
  try { N.score.terminer(false); N.score.profil.reglages({ secousse: 0.5 }); } catch (e) { bad.push('stockage refusé : ' + e.message); }
  Storage.prototype.setItem = sv;
  // 5. dix records au plus
  for (let i = 0; i < 14; i++) N.score.terminer(false);
  if (N.score.records.length > 10) bad.push('records : ' + N.score.records.length);
  return { bad, info };
});
const err = await page.evaluate(() => ({ n: window.__ERR.count, s: Object.keys(window.__ERR.sigs) }));
console.log(JSON.stringify(res.info));
console.log(res.bad.length ? 'ÉCHECS :\n  ' + res.bad.join('\n  ') : 'score : défis de vague, résumé, déblocage, records, stockage refusé : OK');
console.log('__ERR.count =', err.n, err.s.join(' | '), '; console :', logs.length);
for (const l of logs.slice(0, 5)) console.log('  ' + l);
await browser.close();
process.exit(res.bad.length === 0 && err.n === 0 && logs.length === 0 ? 0 : 1);
