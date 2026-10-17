/* tools/L4a/banc.mjs — les critères d'acceptation du lot 4a (REFONTE.md § 8.3, LOT 4a), mesurés sur la page
   d'essai réglementaire (tools/L4a/index.html : le bundle, avec les replis des autres lots), chaque type isolé
   puis en groupe, sur 20 graines ; zéro erreur sur les trois profils ; coût p95 à 40 ennemis.
     node tools/L4a/banc.mjs [--graines 20] [--page index.html] [--rapide]
   Sortie : tools/L4a/sortie/banc.json et un résumé lisible. */
import path from 'node:path';
import { ouvrir, fermer, ecrireJSON, ICI } from './outils.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RAPIDE = process.argv.includes('--rapide');
const NG = +arg('--graines', RAPIDE ? 4 : 20), PAGE = arg('--page', 'index.html');
const GRAINES = Array.from({ length: NG }, (_, i) => i + 1);
const TYPES = ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'sentinelle', 'traqueur'];
const HARNAIS = path.join(ICI, 'harnais.js');

async function session(profil, opts = {}) {
  const s = await ouvrir(Object.assign({ page: PAGE, profil, graine: 1 }, opts));
  await s.page.addScriptTag({ path: HARNAIS });
  return s;
}
function p95(a) { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * 0.95))]; }

const R = { page: PAGE, graines: NG, isoles: {}, groupe: null, essais: {}, profils: {}, cout: null };
const tot = { attaques: [], armHorsVue: 0, armements: 0, tirsHorsVue: 0, tireurHorsVue: 0, tirs: 0, teleManques: 0, teleVus: 0, schemas: 0, schemasFaux: 0, exSchema: [], bonds: [], annulees: 0 };
function cumuler(r) {
  tot.attaques.push(...r.attaques); tot.armHorsVue += r.armHorsVue; tot.armements += r.armements; tot.tirsHorsVue += r.tirsHorsVue; tot.tireurHorsVue += r.tireurHorsVue;
  tot.tirs += r.tirs; tot.teleManques += r.teleManques; tot.teleVus += r.teleVus; tot.schemas += r.schemas; tot.schemasFaux += r.schemasFaux;
  tot.exSchema.push(...r.exSchema.slice(0, 2)); tot.bonds.push(...r.bonds); tot.annulees += r.annulees;
}

try {
  /* ---------------------------------------------------------------- chaque type isolé, puis en groupe */
  const s = await session('paysage');
  for (const type of TYPES) {
    const acc = { attaques: 0, min: 99, rapides: 0, minRapide: 99, armHorsVue: 0, tirsHorsVue: 0, annulees: 0 };
    for (const g of GRAINES) {
      const r = await s.page.evaluate(({ type, g }) => {
        const H = window.__L4A, N = window.__N, S = window.__S;
        H.prep({ graine: g, script: 'aleatoire', vague: 3 });
        const p = S.player;
        for (let k = 0; k < 3; k++) {
          const a = H.rnd() * 6.283, d = 80 + H.rnd() * 60;
          N.ennemis.spawn(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, { mods: { rapide: k === 0 && g % 2 === 0 } });
        }
        return H.courir(10);
      }, { type, g });
      cumuler(r);
      for (const a of r.attaques) { acc.attaques++; acc.min = Math.min(acc.min, a.d); if (a.rapide) { acc.rapides++; acc.minRapide = Math.min(acc.minRapide, a.d); } }
      acc.armHorsVue += r.armHorsVue; acc.tirsHorsVue += r.tirsHorsVue; acc.annulees += r.annulees;
    }
    R.isoles[type] = acc;
    console.log(type.padEnd(11), 'attaques', String(acc.attaques).padStart(4), ' télégraphe min', acc.min.toFixed(3), 's', ' (RAPIDE', acc.rapides, 'min', acc.rapides ? acc.minRapide.toFixed(3) : '-', ')',
      ' armements hors vue', acc.armHorsVue, ' tirs hors vue', acc.tirsHorsVue, ' annulées', acc.annulees);
  }
  const grp = { attaques: 0, min: 99, rapides: 0, minRapide: 99, armHorsVue: 0, tirsHorsVue: 0, maxEnnemis: 0, maxTirs: 0 };
  for (const g of GRAINES) {
    const r = await s.page.evaluate(({ g, TYPES }) => {
      const H = window.__L4A, N = window.__N, S = window.__S;
      H.prep({ graine: g, script: 'aleatoire', vague: 4, len: 20 });
      const p = S.player;
      for (let k = 0; k < 18; k++) {
        const a = H.rnd() * 6.283, d = 70 + H.rnd() * 90;
        N.ennemis.spawn(TYPES[k % TYPES.length], p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, { mods: { rapide: H.rnd() < 0.15 } });
      }
      return H.courir(14);
    }, { g, TYPES });
    cumuler(r);
    for (const a of r.attaques) { grp.attaques++; grp.min = Math.min(grp.min, a.d); if (a.rapide) { grp.rapides++; grp.minRapide = Math.min(grp.minRapide, a.d); } }
    grp.armHorsVue += r.armHorsVue; grp.tirsHorsVue += r.tirsHorsVue; grp.maxEnnemis = Math.max(grp.maxEnnemis, r.maxEnnemis); grp.maxTirs = Math.max(grp.maxTirs, r.maxTirs);
  }
  R.groupe = grp;
  console.log('groupe     ', 'attaques', String(grp.attaques).padStart(4), ' télégraphe min', grp.min.toFixed(3), 's', ' (RAPIDE', grp.rapides, 'min', grp.rapides ? grp.minRapide.toFixed(3) : '-', ')',
    ' armements hors vue', grp.armHorsVue, ' tirs hors vue', grp.tirsHorsVue);

  /* ---------------------------------------------------------------- les essais ponctuels, sur les graines */
  const E = R.essais = { blindage: { face: 0, ricochetsFace: 0, cote: 0, ricochetsCote: 0 }, esquive: { essais: 0, vues: 0 }, mineAbattue: { essais: 0, vivante: 0, coupee: 0 },
    mineDisque: [], chaine: [], traqueur: [], inversion: [], finInversion: [], plafonds: null };
  for (const g of GRAINES) {
    const b = await s.page.evaluate(g => window.__L4A.blindage(g), g);
    for (const k in b) E.blindage[k] += b[k];
    const q = await s.page.evaluate(g => window.__L4A.esquive(g), g); E.esquive.essais++; if (q.esquive) E.esquive.vues++;
    const m = await s.page.evaluate(g => window.__L4A.mineAbattue(g), g); E.mineAbattue.essais++; if (m.vivante) E.mineAbattue.vivante++; if (m.coupee) E.mineAbattue.coupee++;
  }
  for (const dist of [10, 25, 29, 31, 33]) E.mineDisque.push(await s.page.evaluate(d => window.__L4A.mineDisque(3, d), dist));
  for (const g of GRAINES.slice(0, 5)) E.chaine.push(await s.page.evaluate(g => window.__L4A.chaine(g), g));
  for (const g of GRAINES.slice(0, 10)) E.traqueur.push(await s.page.evaluate(g => window.__L4A.traqueur(g), g));
  for (const g of GRAINES) E.inversion.push(await s.page.evaluate(g => window.__L4A.inversion(g), g));
  for (const g of GRAINES.slice(0, 5)) E.finInversion.push(await s.page.evaluate(g => window.__L4A.finInversion(g), g));
  E.plafonds = await s.page.evaluate(() => window.__L4A.plafonds(1));
  R.profils.paysage = { err: await s.page.evaluate(() => window.__ERR && window.__ERR.count), console: s.erreurs.slice(0, 5) };
  await s.fin();

  /* ---------------------------------------------------------------- zéro erreur, deux autres profils, en jeu dessiné */
  for (const profil of ['portrait', 'bureau']) {
    const t = await session(profil);
    await t.page.evaluate(({ TYPES }) => {
      const H = window.__L4A, N = window.__N, S = window.__S;
      H.prep({ graine: 5, script: 'aleatoire', vague: 4, len: 20 });
      const p = S.player;
      for (let k = 0; k < 24; k++) { const a = H.rnd() * 6.283, d = 70 + H.rnd() * 90; N.ennemis.spawn(TYPES[k % TYPES.length], p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, {}); }
      window.__chaqueImage = null;
    }, { TYPES });
    await t.page.waitForTimeout(6000);                       // la vraie boucle d'images : mise à jour ET dessin
    await t.page.evaluate(() => window.__N.ennemis.inverser(4));
    await t.page.waitForTimeout(5000);
    R.profils[profil] = { err: await t.page.evaluate(() => window.__ERR && window.__ERR.count), console: t.erreurs.slice(0, 5), ennemis: await t.page.evaluate(() => window.__N.ennemis.count()) };
    await t.fin();
  }

  /* ---------------------------------------------------------------- le coût, à 40 ennemis mêlés, image par image */
  const couts = [];
  for (let rep = 0; rep < 3; rep++) {
  const c = await session('paysage', { manuel: true });
  couts.push(await c.page.evaluate(({ TYPES, rep }) => {
    const H = window.__L4A, N = window.__N, S = window.__S;
    H.prep({ graine: 9 + rep, script: 'aleatoire', vague: 4, len: 24 });
    const p = S.player;
    const u0 = N.ennemis.update, d0 = N.ennemis.draw, perf = window.performance;
    let acc = 0; const parImage = [];
    N.ennemis.update = function (dt) { const t0 = perf.now(); u0(dt); acc += perf.now() - t0; };
    N.ennemis.draw = function () { const t0 = perf.now(); d0(); acc += perf.now() - t0; };
    const remplir = () => { let k = 0; while (N.ennemis.count() < 40 && k++ < 60) { const a = H.rnd() * 6.283, d = 60 + H.rnd() * 100; N.ennemis.spawn(TYPES[(H.rnd() * 7) | 0], p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, { etat: 'approche' }); } };
    window.__chaqueImage = function () { remplir(); };
    window.__pas(300);
    for (let i = 0; i < 1200; i++) { acc = 0; window.__pas(1); parImage.push(acc); }
    N.ennemis.update = u0; N.ennemis.draw = d0;
    const b = parImage.slice().sort((x, y) => x - y);
    return { images: parImage.length, ennemis: N.ennemis.count(), tirs: N.ennemis.tirs.length, moyenne: parImage.reduce((a, x) => a + x, 0) / parImage.length, p50: b[Math.floor(b.length * 0.5)], p95: b[Math.floor(b.length * 0.95)], max: b[b.length - 1] };
  }, { TYPES, rep }));
  R.profils['cout' + rep] = { err: await c.page.evaluate(() => window.__ERR && window.__ERR.count), console: c.erreurs.slice(0, 5) };
  await c.fin();
  }
  couts.sort((a, b) => a.p95 - b.p95);
  R.cout = Object.assign({}, couts[1], { series: couts.map(x => +x.p95.toFixed(3)) });   // la médiane de trois séries (la machine est partagée)
} finally { await fermer(); }

/* ---------------------------------------------------------------- le verdict */
const att = tot.attaques, minAtt = att.reduce((m, a) => Math.min(m, a.d), 99), courts = att.filter(a => a.d < 0.5 - 1e-6).length;
const bondsEcarts = tot.bonds.map(b => Math.abs(b.bond - b.ligne)), bondMax = bondsEcarts.length ? Math.max(...bondsEcarts) : null;
const E = R.essais, inv = E.inversion;
const v = (ok) => ok ? 'TENU' : 'NON TENU';
const L = [];
L.push(['Télégraphes journalisés ≥ 500 ms (100 %, RAPIDE et groupe compris)', `${att.length} attaques, ${courts} sous 0,5 s ; minimum ${minAtt.toFixed(3)} s ; télégraphe publié à ${tot.teleVus} pas d'armement, manquant à ${tot.teleManques}`, courts === 0 && tot.teleManques === 0]);
L.push(['Ligne de la flèche = bond réel ± 2 px', `${tot.bonds.length} bonds ; écart max ${bondMax === null ? '-' : bondMax.toFixed(2)} px`, tot.bonds.length > 0 && bondMax <= 2]);
const dq = E.mineDisque;
L.push(['Disque de la mine = souffle réel', dq.map(d => `${d.dist} px : télégraphe r=${d.rTele}, ${d.morte ? 'mort (' + d.cause + ')' : 'vivante'}`).join(' ; '), dq.every(d => d.rTele === d.souffle && (d.morte === (d.dist <= d.souffle)))]);
L.push(['0 armement hors de la vue ; 0 tir parti hors de la vue', `${tot.armements} armements, ${tot.armHorsVue} hors vue ; ${tot.tirs} tirs, ${tot.tirsHorsVue} nés hors vue, ${tot.tireurHorsVue} frappes d'un auteur hors vue`, tot.armHorsVue === 0 && tot.tirsHorsVue === 0 && tot.tireurHorsVue === 0]);
const bl = E.blindage;
L.push(['Ricochet sur la face de la tourelle (100 % dans ± 45°)', `${bl.ricochetsFace}/${bl.face} de face ; ${bl.ricochetsCote}/${bl.cote} de côté`, bl.face > 0 && bl.ricochetsFace === bl.face && bl.ricochetsCote === 0]);
L.push(['Esquive latérale de la flèche dans l\'axe', `${E.esquive.vues}/${E.esquive.essais}`, E.esquive.vues === E.esquive.essais]);
L.push(['Mine abattue sans blesser la joueuse (G-30)', `${E.mineAbattue.vivante}/${E.mineAbattue.essais} vivante, ${E.mineAbattue.coupee} coupée ; chaîne : ${E.chaine.map(c => c.kills).join(', ')} kills, vivante ${E.chaine.filter(c => c.vivante).length}/${E.chaine.length}`, E.mineAbattue.vivante === E.mineAbattue.essais && E.mineAbattue.coupee === 0 && E.chaine.every(c => c.vivante && c.kills >= 3)]);
const tq = E.traqueur;
L.push(['TRAQUEUR : invulnérable aux armes ; meurt au LASSO ; dévorable ; fuit à la fin', `armes ${tq.filter(t => t.armes).length}/${tq.length}, lasso ${tq.filter(t => t.lasso).length}/${tq.length} (base ${tq[0] && tq[0].baseLasso}), dévoré ${tq.filter(t => t.devore).length}/${tq.length} (base ${tq[0] && tq[0].baseDevore}), fuite ${tq.filter(t => t.fuitALaPurge && t.parti).length}/${tq.length}, vitesse ${tq.map(t => t.rapport).join(' ')}`, tq.every(t => t.armes && t.lasso && t.devore && t.proie && t.fuitALaPurge && t.parti && Math.abs(t.rapport - 0.95) < 0.02)]);
const ordin = i => i.bases.filter(b => b !== 5000);   // le TRAQUEUR dévoré vaut 5 000 à part, hors de l'escalier
const pts = inv.map(i => ordin(i).join(',')), ptsOk = inv.every(i => ordin(i).slice(0, 5).join(',') === '200,400,800,1600,1600');
L.push(['INVERSION : proies en 1 image, 0 tir, 0 attaque, 0 dégât ; 200, 400, 800, 1 600, 1 600 ; fin : 0 dégât 0,5 s dans 32 px',
  `proies ${inv.filter(i => i.proies === i.ordinaires).length}/${inv.length} ; tirs après ${inv.reduce((s, i) => s + i.tirsApres, 0)} (avant ${inv.reduce((s, i) => s + i.tirsAvant, 0)}) ; télégraphes ${inv.reduce((s, i) => s + i.teleApres, 0)} ; armements pendant ${inv.reduce((s, i) => s + i.armPendant, 0)} ; tirs pendant ${inv.reduce((s, i) => s + i.tirsPendant, 0)} ; vivante ${inv.filter(i => i.vivantePendant).length}/${inv.length} ; points ${pts[0]} ; délai de fin ${E.finInversion.map(f => f.delai).join(' ')} s`,
  inv.every(i => i.proies === i.ordinaires && i.tirsApres === 0 && i.teleApres === 0 && i.armPendant === 0 && i.tirsPendant === 0 && i.vivantePendant) && ptsOk && E.finInversion.every(f => f.delai !== null && f.delai >= 0.5 - 1 / 60)]);
L.push(['Schéma : 100 % des objets de list et tirs valides, à chaque pas', `${tot.schemas} validations, ${tot.schemasFaux} fautes ${tot.exSchema.slice(0, 2).join(' | ')}`, tot.schemasFaux === 0]);
L.push(['Plafonds : 40 ennemis, 80 tirs ; coût p95 ≤ 1,0 ms à 40 ennemis', `spawn ${E.plafonds.ennemis}/60 acceptés (compte ${E.plafonds.compte}), tirs ${E.plafonds.tirs}/120 (liste ${E.plafonds.liste}) ; coût ${R.cout.ennemis} ennemis, ${R.cout.tirs} tirs, ${R.cout.images} images × 3 séries : moyenne ${R.cout.moyenne.toFixed(3)} ms, p50 ${R.cout.p50.toFixed(3)} ms, p95 ${R.cout.p95.toFixed(3)} ms (séries ${R.cout.series.join(' / ')}), max ${R.cout.max.toFixed(2)} ms`, E.plafonds.compte === 40 && E.plafonds.liste === 80 && R.cout.p95 <= 1.0]);
const errs = Object.entries(R.profils).map(([k, x]) => `${k} ${x.err}${x.console.length ? ' (' + x.console[0] + ')' : ''}`);
L.push(['Zéro erreur (__ERR, console) sur les trois profils', errs.join(' ; '), Object.values(R.profils).every(x => x.err === 0 && x.console.length === 0)]);
R.verdict = L.map(([c, m, ok]) => ({ critere: c, mesure: m, tenu: ok }));
ecrireJSON('banc.json', R);
console.log('\n' + L.map(([c, m, ok]) => `${v(ok).padEnd(9)} ${c}\n          ${m}`).join('\n'));
process.exit(L.every(x => x[2]) ? 0 : 1);
