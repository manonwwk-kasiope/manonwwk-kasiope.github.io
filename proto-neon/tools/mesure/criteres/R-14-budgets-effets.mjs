/* R-14 — Budgets d'effets : au plus 12 % d'images secouées (S.shake > 0, compté pas à pas) ; au plus une
   bannière toutes les 10 s hors CYCLOPE (appels de N.hud.banniere). Parties complètes du pilote bon. */
import { executer, principal, seuils, stats } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-14', titre: 'Budgets d’effets', seuil: '≤ 12 % d’images secouées ; ≤ 1 bannière par 10 s hors CYCLOPE', bloquant: true };
const CYCLOPE = ['alerte', 'panneau', 'boss', 'victoire'];

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R14');
  const b = bilanLot(await lot(banc, 'bon', banc.graines(10, 3)));
  if (!b.ok) return res.nonMesurable('parties du pilote bon', b.raison);
  const sec = b.resumes.filter(r => r.parPas && r.parPas.pas);
  if (sec.length) {
    const parts = sec.map(r => r.parPas.secoues / r.parPas.pas);
    res.verifie('images secouées (pire partie)', Math.max(...parts), '≤ ' + s.secouees, Math.max(...parts) <= s.secouees, { mediane: stats.mediane(parts), parties: parts.length });
  } else res.absent('images secouées', 'N.cam.update');
  const avec = b.resumes.filter(r => r.appels && r.appels['N.hud.banniere']);
  if (!avec.length) return res.absent('bannières', 'N.hud.banniere');
  let trop = 0, total = 0; const ex = [];
  for (const r of avec) {
    const l = r.appels['N.hud.banniere'].filter(x => !CYCLOPE.includes(x.etat));
    total += l.length;
    for (let i = 1; i < l.length; i++) if (l[i].t - l[i - 1].t < s.banniere) { trop++; if (ex.length < 6) ex.push({ graine: r.graine, t: +l[i].t.toFixed(1), ecart: +(l[i].t - l[i - 1].t).toFixed(2), texte: l[i].a, avant: l[i - 1].a }); }
  }
  res.verifie('bannières à moins de ' + s.banniere + ' s de la précédente, hors CYCLOPE', trop, 0, trop === 0, { bannieres: total, exemples: ex });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
