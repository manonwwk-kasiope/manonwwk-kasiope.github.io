/* R-16 — Progression dans la partie : 10 ± 2 cartes par partie gagnée ; au moins 4 pour une mort en V3 ;
   première carte à la fin de V1 dans 100 % des parties ; 3 défis et un défi par vague annoncés.
   Parties des pilotes bon, expert et dieu (journal `carte`, `vague` ; N.score.defis, N.score.defiVague). */
import { executer, principal, seuils, stats } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-16', titre: 'Progression dans la partie', seuil: '10 ± 2 cartes par victoire ; ≥ 4 pour une mort en V3 ; 1re carte à la fin de V1 ; 3 défis + 1 par vague', bloquant: true };

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R16');
  const R = [];
  for (const [p, o] of [['bon', {}], ['expert', {}], ['dieu', { god: true }]]) { const b = bilanLot(await lot(banc, p, banc.graines(50, 5), o)); if (b.ok) R.push(...b.resumes); else if (!R.length && p === 'dieu') return res.nonMesurable('parties des pilotes', b.raison); }
  if (!R.length) return res.nonMesurable('parties des pilotes', 'aucune partie');
  const gagnees = R.filter(r => r.victoire);
  if (gagnees.length) { const c = gagnees.map(r => r.cartes.length), hors = c.filter(n => Math.abs(n - s.cartes) > s.tolerance); res.verifie('cartes par partie gagnée', stats.mediane(c), `${s.cartes} ± ${s.tolerance} (toutes)`, hors.length === 0, { parties: c.length, min: Math.min(...c), max: Math.max(...c) }); }
  else res.nonMesurable('cartes par partie gagnée', 'aucune partie gagnée');
  const v3 = R.filter(r => r.defaite && r.vagueA(r.duree) === 3);
  if (v3.length) { const c = v3.map(r => r.cartes.length); res.verifie('cartes pour une mort en V3 (minimum)', Math.min(...c), '≥ ' + s.mortV3, Math.min(...c) >= s.mortV3, { parties: c.length }); }
  else res.nonMesurable('cartes pour une mort en V3', 'aucun game over en V3');
  const v1 = R.filter(r => r.nettoyeeV(1) !== null);
  if (v1.length) {
    const ok = v1.filter(r => { const c = r.cartes[0]; const fin = r.entreeV(2) ?? Infinity; return c && c.t >= r.nettoyeeV(1) - 0.01 && c.t <= fin; }).length;
    res.verifie('première carte à la fin de V1', ok / v1.length, 1, ok === v1.length, { parties: v1.length });
  } else res.nonMesurable('première carte à la fin de V1', 'aucune partie ne nettoie V1');
  const debut = R.map(r => (r.echantillons.find(e => e.etat === 'jeu') || {}).defis).filter(v => v !== undefined && v !== null);
  if (debut.length) res.verifie('trois défis de partie (N.score.defis)', stats.mediane(debut), 3, debut.every(n => n === 3));
  else res.absent('trois défis de partie', 'N.score.defis');
  let n = 0, avec = 0;
  for (const r of R) for (const v of r.vagues.filter(x => x.evt === 'entree' && x.n >= 1)) { const e = r.echantillons.find(x => x.t >= v.t + 0.3); if (!e) continue; n++; if (e.defiVague) avec++; }
  if (n) res.verifie('un défi de vague à chaque entrée de vague (N.score.defiVague)', avec / n, 1, avec === n, { vagues: n });
  else res.absent('défi de vague', 'N.score.defiVague');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
