/* tools/F/cartes.mjs — essai de N.cartes (lot F) : textes (19 cartes à tous les niveaux : nom ≤ 14, lignes ≤ 19 caractères,
   chiffres égaux à N.R), première main, pitié, trophée, « CHOISIS n », mods au schéma, déterminisme à graine égale.
   Usage : node tools/F/cartes.mjs [--url URL] */
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
await page.waitForFunction(() => window.__N && window.__N.cartes && window.__S);
const res = await page.evaluate(() => {
  const N = window.__N, C = N.cartes, R = N.R, bad = [], info = {};
  const choisirOrig = C.choisir; const ch = (id) => { N.ev.nouveauPas(); return choisirOrig(id); };
  const deb = (N.score && N.score.deblocages) || [];
  // 1. textes : tous les niveaux de chaque carte
  const ids = N.ids.cartes.slice();
  for (const id of ids) {
    C.reset();
    for (let k = 0; k <= R.cartes.liste[id].prises; k++) {
      const t = C.texte(id);
      if (t.nom.length > R.cartes.texte.nomMax) bad.push('nom trop long ' + id + ' ' + t.nom);
      for (const l of [t.l1, t.l2]) if (!l || l.length > R.cartes.texte.ligneMax) bad.push('ligne ' + id + '#' + k + ' (' + (l ? l.length : 0) + ') ' + l);
      if (/undefined|NaN|\[object/.test(t.l1 + t.l2 + t.tag)) bad.push('valeur absente ' + id + ' ' + t.l1 + '/' + t.l2);
      if (k < R.cartes.liste[id].prises) ch(id);
    }
  }
  // 2. égalité texte / chiffres : CADENCE, PUISSANCE, AIMANT
  C.reset();
  const t1 = C.texte('cadence'); ch('cadence');
  const attendu = (R.armes.canon.paliers[0].cadence).toString().replace('.', ',') + ' → ' + (Math.round(R.armes.canon.paliers[0].cadence * 1.2 * 100) / 100).toString().replace('.', ',') + ' TIRS/S';
  if (t1.l2 !== attendu) bad.push('texte cadence ' + t1.l2 + ' ≠ ' + attendu);
  if (Math.abs(C.mods.cadence - 1.2) > 1e-9) bad.push('mods.cadence ' + C.mods.cadence);
  ch('croissance'); if (C.mods.lenMax !== R.passifs.mods.lenMax + R.longueur.parCroissance) bad.push('lenMax ' + C.mods.lenMax);
  const ok = N.ids.valider('mods', C.mods); if (ok.length) bad.push('mods schéma ' + ok.join(';'));
  // 2b. le texte de CROISSANCE égale l'effet mesuré sur la joueuse (leçon C8)
  if (N.joueuse && N.joueuse.len) {
    N.socle.reset(7); N.game.reset(7); C.reset();
    const l0 = N.joueuse.len(), t = C.texte('croissance'); ch('croissance'); N.joueuse.update(0.016);
    const gain = N.joueuse.len() - l0, dit = +/\+(\d+) SEG/.exec(t.l1)[1];
    info.croissance = { dit, gain };
    if (gain !== dit) bad.push('texte CROISSANCE +' + dit + ' ≠ effet mesuré +' + gain);
  }
  // 3. première main
  C.reset();
  const h1 = C.main(3, { vague: 1 });
  const L = R.cartes.liste;
  const armeNeuve = h1.some(i => ['tourelles', 'arc', 'missiles', 'drones', 'minesQ'].includes(i));
  const pouvoir = h1.some(i => ['traversee', 'ralenti', 'repli'].includes(i));
  const survie = h1.some(i => R.cartes.premiereMain.survie.includes(i));
  info.premiere = h1.join(',');
  if (!(armeNeuve && pouvoir && survie)) bad.push('première main incomplète : ' + h1.join(','));
  if (new Set(h1).size !== h1.length) bad.push('doublon dans la main');
  for (const i of h1) if (i === 'ralenti' || i === 'repli') bad.push('pouvoir verrouillé proposé : ' + i);
  // 4. « CHOISIS n » : 2 montées en attente → 3 cartes, taille de main 5
  C.reset();
  const fl = []; N.ev.on('niveau', 90, c => fl.push(c.niveau), '03-socle');
  C.xp(R.xp.seuils[1]);                                       // 2 niveaux d'un coup
  if (C.niveauxEnAttente() !== 2) bad.push('niveaux en attente ' + C.niveauxEnAttente());
  const h3 = C.main(null, { vague: 1 });
  if (C.choix() !== 3 || h3.length !== 5) bad.push('CHOISIS 3 : choix ' + C.choix() + ' main ' + h3.length);
  if (C.niveauxEnAttente() !== 0) bad.push('montées non consommées');
  C.reset(); C.xp(R.xp.seuils[3]); C.main(null, {});
  if (C.choix() !== 3 || C.niveauxEnAttente() !== 2) bad.push('plafond à 3 : choix ' + C.choix() + ' reste ' + C.niveauxEnAttente());
  // 5. pitié : sur 200 parties de 5 écrans, au moins une rare tous les 3 écrans et une épique tous les 7
  let pire = 0, pireE = 0;
  for (let g = 0; g < 40; g++) {
    C.reset(); let sr = 0, se = 0;
    for (let e = 0; e < 14; e++) {
      const h = C.main(3, { vague: e + 1 }); const rg = h.map(i => ['commune', 'rare', 'epique', 'ultime'].indexOf(C.rarete(i)));
      sr = rg.some(r => r >= 1) ? 0 : sr + 1; se = rg.some(r => r >= 2) ? 0 : se + 1; pire = Math.max(pire, sr); pireE = Math.max(pireE, se);
      ch(h[0]);
    }
  }
  info.pire = [pire, pireE];
  if (pire > R.cartes.pitie.rare - 1) bad.push('pitié rare : ' + pire + ' écrans sans rare');
  if (pireE > R.cartes.pitie.epique - 1) bad.push('pitié épique : ' + pireE + ' écrans sans épique');
  // 6. trophée : aucune commune
  C.reset(); ch('tourelles'); ch('tourelles'); ch('tourelles'); C.main(3, {});
  const ht = C.main(3, { trophee: true });
  if (ht.some(i => C.rarete(i) === 'commune')) bad.push('trophée avec une commune : ' + ht.join(','));
  info.trophee = ht.join(',') + ' [' + ht.map(i => C.rarete(i)).join(',') + ']';
  // 7. armes : 4 au plus
  C.reset(); for (const a of ['tourelles', 'arc', 'missiles']) ch(a);
  if (C.vivier().some(i => i === 'drones' || i === 'minesQ')) bad.push('5ᵉ arme proposée');
  // 8. déterminisme : même graine, même main
  const run = () => { N.socle.reset(7); C.reset(); return C.main(3, {}).join(','); };
  info.det = [run(), run()];
  if (info.det[0] !== info.det[1]) bad.push('main non déterministe (' + info.det.join(' ≠ ') + ')');
  return { bad, info, n: ids.length };
});
const err = await page.evaluate(() => ({ n: window.__ERR.count }));
console.log(JSON.stringify(res.info));
console.log(res.bad.length ? 'ÉCHECS :\n  ' + res.bad.join('\n  ') : 'cartes : ' + res.n + ' cartes, textes, mains, pitié, trophée, CHOISIS n, mods : OK');
console.log('__ERR.count =', err.n, '; console :', logs.length);
for (const l of logs.slice(0, 5)) console.log('  ' + l);
await browser.close();
process.exit(res.bad.length === 0 && err.n === 0 && logs.length === 0 ? 0 : 1);
