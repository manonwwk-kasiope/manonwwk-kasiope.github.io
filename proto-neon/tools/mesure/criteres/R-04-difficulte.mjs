/* R-04 — Difficulté : les 8 pilotes dans leurs cibles bloquantes du § 4.10 (N.R.pilotes) ; les cibles
   indicatives sont rapportées. 50 graines, mode simulé, iPhone 13 paysage, __DT = 1/60, profil vierge. */
import { executer, principal, seuils, stats } from '../commun.mjs';
import { lot, bilanLot, PILOTES, mediane, medianeFins, ciblesR04 } from '../parties.mjs';

export const meta = { id: 'R-04', titre: 'Difficulté', seuil: 'cibles bloquantes des 8 pilotes (§ 4.10)', bloquant: true };
const dans = (v, [a, b]) => v !== null && v >= a && v <= b;

export async function mesurer(banc, res) {
  const { R } = await seuils(null, 'R04');
  // Décision cheffe 18/10 05 h 11 : mur <11 s. Trajet nu
  // (1021 - 389,12) / 68 = 9,29235 s, avant grâce et plongée : <8 s impossible.
  const P = ciblesR04(R);
  res.note('Médianes de fin : toutes les parties terminées, victoires comprises, horloge globale ; un lot censuré est non mesurable. gameOver reste un diagnostic des seules défaites.');
  res.note('CYCLOPE atteint : événement phase/arrivee uniquement. Combat : première phase/entree n=1 à phase/mort, répits compris ; aucune substitution par un panneau ou une victoire.');
  const graines = banc.graines(P.banc && P.banc.graines || 50, 5);
  const L = {};
  for (const pilote of PILOTES) {
    const o = pilote === 'dieu' ? { god: true } : pilote === 'humain' ? { actions: 'auto' } : {};
    const b = bilanLot(await lot(banc, pilote, graines, o));
    if (!b.ok) { res.nonMesurable(pilote, b.raison); continue; }
    L[pilote] = b.resumes;
    if (!b.resumes.some(r => r.piloteConforme)) res.note(`${pilote} : aucune décision « cap » au journal du pilote — repli du squelette, pas le pilote gelé de refonte/lots/pilotes.md`);
  }
  const part = (l, f) => stats.part(l, f);
  const med = mediane;
  const n = l => ` (${l.length} graines)`;
  if (L.inerte) {
    const l = L.inerte, c = P.inerte || { perdAvant: 35, partPerd: 1, premiereMortAvant: 11 };
    res.verifie('inerte : perd ses 3 vies avant ' + c.perdAvant + ' s' + n(l), part(l, r => r.gameOver !== null && r.gameOver < c.perdAvant), c.partPerd, part(l, r => r.gameOver !== null && r.gameOver < c.perdAvant) >= c.partPerd);
    const pm = part(l, r => r.premiereMort && r.premiereMort.cause === 'mur' && r.premiereMort.t < c.premiereMortAvant);
    res.verifie('inerte : première mort au mur avant ' + c.premiereMortAvant + ' s', pm, 1, pm >= 1);
  }
  if (L.tourneur) {
    const l = L.tourneur, c = P.tourneur || { perdAvant: 90, partPerd: 1, scoreMax: 0.1 };
    const v = part(l, r => r.gameOver !== null && r.gameOver < c.perdAvant);
    res.verifie('tourneur : perd ses 3 vies avant ' + c.perdAvant + ' s' + n(l), v, c.partPerd, v >= c.partPerd);
    if (L.bon) { const rap = med(l.map(r => r.score)) / Math.max(1, med(L.bon.map(r => r.score))); res.indicatif('tourneur : score / score du bon (médianes)', rap, '< ' + c.scoreMax, rap < c.scoreMax); }
  }
  if (L.maladroit) {
    const l = L.maladroit, c = P.maladroit || { medianeGameOver: [45, 150], cyclope: 0, premierCoupAvant: 30, partPremierCoup: 0.8 };
    const m = medianeFins(l);
    if (m === null) res.nonMesurable('maladroit : fin de partie médiane (s)', 'lot incomplet ou durée de fin absente');
    else res.verifie('maladroit : fin de partie médiane (s), victoires comprises' + n(l), m, c.medianeGameOver, dans(m, c.medianeGameOver));
    const cy = l.filter(r => r.cyclopeAtteint).length;
    res.verifie('maladroit : atteint le CYCLOPE (parties)', cy, c.cyclope, cy <= c.cyclope);
    const pc = part(l, r => { const t = [...r.coups, ...r.morts].map(x => x.t).sort((a, b) => a - b)[0]; return t !== undefined && t < c.premierCoupAvant; });
    res.indicatif('maladroit : premier coup avant ' + c.premierCoupAvant + ' s', pc, '≥ ' + c.partPremierCoup, pc >= c.partPremierCoup);
  }
  if (L.kamikaze) {
    const l = L.kamikaze, c = P.kamikaze || { perdAvantCyclope: 0.9, gagneMax: 2 };
    const v = part(l, r => r.defaite && !r.cyclopeAtteint);
    res.verifie('kamikaze : game over avant le CYCLOPE' + n(l), v, '≥ ' + c.perdAvantCyclope, v >= c.perdAvantCyclope);
    const g = l.filter(r => r.victoire).length;
    res.verifie('kamikaze : victoires', g, '≤ ' + c.gagneMax + ' sur 50', g <= c.gagneMax * l.length / 50);
  }
  if (L.humain) {
    const l = L.humain, c = P.humain || { medianeGameOver: [120, 210], cyclope: [0.1, 0.35], bat: [0.02, 0.12], coupV1: 0.5, lasso: { court: 0.5, long: 0.4 } };
    const m = medianeFins(l);
    if (m === null) res.nonMesurable('humain : fin de partie médiane (s)', 'lot incomplet ou durée de fin absente');
    else res.verifie('humain : fin de partie médiane (s), victoires comprises' + n(l), m, c.medianeGameOver, dans(m, c.medianeGameOver));
    res.indicatif('humain : atteint le CYCLOPE', part(l, r => r.cyclopeAtteint), c.cyclope, dans(part(l, r => r.cyclopeAtteint), c.cyclope));
    res.indicatif('humain : bat le CYCLOPE', part(l, r => r.victoire), c.bat, dans(part(l, r => r.victoire), c.bat));
    res.indicatif('humain : au moins un coup en V1', part(l, r => r.coupsV1 > 0), '≥ ' + c.coupV1, part(l, r => r.coupsV1 > 0) >= c.coupV1);
    res.note('humain : la réussite du LASSO (cible bloquante) est mesurée par R-34');
  }
  if (L.bon) {
    const l = L.bon, c = P.bon || { cyclope: [0.3, 0.6], bat: [0.1, 0.3], mortAvantCyclope: 0.7, coupV1: 0.4, longueurMaxAvant: 120 };
    res.verifie('bon : atteint le CYCLOPE' + n(l), part(l, r => r.cyclopeAtteint), c.cyclope, dans(part(l, r => r.cyclopeAtteint), c.cyclope));
    res.verifie('bon : bat le CYCLOPE', part(l, r => r.victoire), c.bat, dans(part(l, r => r.victoire), c.bat));
    res.indicatif('bon : au moins une mort avant le CYCLOPE', part(l, r => r.morts.some(m => r.entreeCyclope === null || m.t < r.entreeCyclope)), '≥ ' + c.mortAvantCyclope, part(l, r => r.morts.some(m => r.entreeCyclope === null || m.t < r.entreeCyclope)) >= c.mortAvantCyclope);
    res.indicatif('bon : au moins un coup en V1', part(l, r => r.coupsV1 > 0), '≥ ' + c.coupV1, part(l, r => r.coupsV1 > 0) >= c.coupV1);
    const lenMax = R.longueur && (R.longueur.max || R.longueur.lenMax);
    if (lenMax) {
      const temps = l.map(r => { const e = r.echantillons.find(x => x.len >= lenMax); return e ? e.t : Infinity; }).sort((a, b) => a - b);
      const t = (temps[Math.floor((temps.length - 1) / 2)] + temps[Math.ceil((temps.length - 1) / 2)]) / 2;
      res.indicatif('bon : longueur maximale atteinte (médiane, s)', t === Infinity ? 'jamais' : t, '≥ ' + c.longueurMaxAvant, t >= c.longueurMaxAvant);
    } else res.nonMesurable('bon : longueur maximale avant 2:00', 'N.R.longueur.max absent');
  }
  if (L.expert) {
    const l = L.expert, c = P.expert || { cyclope: 0.8, bat: [0.4, 0.7], perdVie: 0.8, lassos: 10, apogees: 2 };
    res.indicatif('expert : atteint le CYCLOPE', part(l, r => r.cyclopeAtteint), '≥ ' + c.cyclope, part(l, r => r.cyclopeAtteint) >= c.cyclope);
    res.verifie('expert : bat le CYCLOPE' + n(l), part(l, r => r.victoire), c.bat, dans(part(l, r => r.victoire), c.bat));
    res.verifie('expert : perd au moins une vie', part(l, r => r.morts.length > 0), '≥ ' + c.perdVie, part(l, r => r.morts.length > 0) >= c.perdVie);
    res.indicatif('expert : LASSO par partie (médiane)', med(l.map(r => r.lassos.length)), '≥ ' + c.lassos, med(l.map(r => r.lassos.length)) >= c.lassos);
    res.indicatif('expert : APOGÉE par partie (médiane)', med(l.map(r => r.apogees)), '≥ ' + c.apogees, med(l.map(r => r.apogees)) >= c.apogees);
  }
  if (L.dieu) {
    const l = L.dieu, c = P.dieu || { duree: [320, 390], combat: [55, 90] };
    const fini = l.filter(r => r.victoire);
    res.verifie('dieu : finit le secteur' + n(l), fini.length / l.length, 1, fini.length === l.length);
    const d = med(fini.map(r => r.duree));
    res.verifie('dieu : durée du secteur (médiane, s)', d, c.duree, fini.length > 0 && fini.every(r => dans(r.duree, c.duree)), { min: Math.min(...fini.map(r => r.duree)), max: Math.max(...fini.map(r => r.duree)) });
    const cb = fini.map(r => r.combatCyclope).filter(Number.isFinite);
    if (!fini.length || cb.length !== fini.length) res.nonMesurable('dieu : combat du CYCLOPE (s)', `phase/entree n=1 ou phase/mort absent : ${cb.length}/${fini.length} combats mesurables`);
    else res.verifie('dieu : combat du CYCLOPE (s)', med(cb), c.combat, cb.every(x => dans(x, c.combat)));
    res.note('dieu : borne alternative première phase/entree → section/victoire (s), non substituée : ' + JSON.stringify(fini.map(r => r.combatCyclopeJusquaVictoire)));
    const z = l.filter(r => r.erreurs && r.erreurs.zero).length;
    res.verifie('dieu : zéro erreur', z / l.length, 1, z === l.length);
  }
  if (L.bon && L.kamikaze) {
    const e = med(L.bon.map(r => r.score)) / Math.max(1, med(L.kamikaze.map(r => r.score)));
    res.indicatif('rythme : score bon / kamikaze (médianes)', e, '≥ ' + ((P.rythme && P.rythme.ecartBonKamikaze) || 1.3), e >= ((P.rythme && P.rythme.ecartBonKamikaze) || 1.3));
  }
  res.note('graines : ' + graines[0] + ' à ' + graines[graines.length - 1] + ' (' + graines.length + ')' + (graines.length < 50 ? ' — moins de 50 graines : proportions indicatives (± 11 points sur 20 graines)' : ''));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
