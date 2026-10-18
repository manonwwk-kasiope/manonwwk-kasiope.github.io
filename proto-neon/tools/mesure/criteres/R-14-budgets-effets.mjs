/* R-14 — Budgets d'effets : au plus 12 % d'images secouées (S.shake > 0, compté pas à pas) ; au plus une
   bannière toutes les 10 s hors CYCLOPE (admissions du HUD, décision Claude05h08). Parties complètes du pilote bon. */
import { executer, principal, seuils, stats } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-14', titre: 'Budgets d’effets', seuil: '≤ 12 % d’images secouées ; ≤ 1 bannière par 10 s hors CYCLOPE', bloquant: true };
const CYCLOPE = ['alerte', 'panneau', 'boss', 'victoire'];

// Le HUD prend la même décision au update avec ou sans dessin ; le draw conserve son journal géométrique.
export function compterAdmissions(parties, intervalle) {
  let trop = 0, total = 0; const ex = []; let present = false;
  for (const p of parties) {
    const admises = (p.journal || []).filter(e => e.type === 'hudBanniereAdmise');
    if (admises.length) present = true;
    const l = admises.filter(e => !CYCLOPE.includes(e.d.etat)); total += l.length;
    for (let i = 1; i < l.length; i++) if (l[i].t - l[i - 1].t < intervalle) { trop++; if (ex.length < 6) ex.push({ graine: p.params && p.params.graine, t: l[i].t, ecart: l[i].t - l[i - 1].t, texte: l[i].d.texte, avant: l[i - 1].d.texte }); }
  }
  return { present, trop, total, ex };
}

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R14');
  const b = bilanLot(await lot(banc, 'bon', banc.graines(10, 3)));
  if (!b.ok) return res.nonMesurable('parties du pilote bon', b.raison);
  const sec = b.resumes.filter(r => r.parPas && r.parPas.pas);
  if (sec.length) {
    const parts = sec.map(r => r.parPas.secoues / r.parPas.pas);
    res.verifie('images secouées (pire partie)', Math.max(...parts), '≤ ' + s.secouees, Math.max(...parts) <= s.secouees, { mediane: stats.mediane(parts), parties: parts.length });
  } else res.absent('images secouées', 'N.cam.update');
  const budget = compterAdmissions(b.parties, s.banniere);
  if (!budget.present) return res.nonMesurable('bannières admises', 'journal sans hudBanniereAdmise : les demandes brutes ne prouvent pas les bannières vues');
  res.verifie('bannières à moins de ' + s.banniere + ' s de la précédente, hors CYCLOPE', budget.trop, 0, budget.trop === 0, { bannieres: budget.total, exemples: budget.ex });

}
if (principal(import.meta.url)) executer({ meta, mesurer });
