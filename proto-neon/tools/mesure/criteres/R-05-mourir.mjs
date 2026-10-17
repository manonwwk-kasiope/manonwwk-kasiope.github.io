/* R-05 — On peut mourir : les 8 causes de mort (N.ids.causes) se produisent au moins une fois sur
   l'ensemble des parties des pilotes (journal `mort`). */
import { executer, principal, seuils } from '../commun.mjs';
import { lot, bilanLot, PILOTES } from '../parties.mjs';

export const meta = { id: 'R-05', titre: 'On peut mourir', seuil: 'les 8 causes de mort au moins une fois', bloquant: true };
const CAUSES = ['mur', 'morsure', 'ennemi', 'tir', 'laser', 'souffle', 'convoi', 'traine'];

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R05');
  const graines = banc.graines(50, 5), vues = {};
  let n = 0, absent = null;
  for (const pilote of PILOTES.filter(p => p !== 'dieu')) {
    const b = bilanLot(await lot(banc, pilote, graines, pilote === 'humain' ? { actions: 'auto' } : {}));
    if (!b.ok) { absent = absent || b.raison; continue; }
    for (const r of b.resumes) { n++; for (const m of r.morts) vues[m.cause] = (vues[m.cause] || 0) + 1; }
  }
  if (!n) return res.nonMesurable('causes de mort', absent || 'aucune partie');
  const manquantes = CAUSES.filter(c => !vues[c]);
  res.verifie('causes distinctes produites', CAUSES.length - manquantes.length, s.causes || 8, manquantes.length === 0, { parCause: vues, manquantes, parties: n });
  const inconnues = Object.keys(vues).filter(c => !CAUSES.includes(c));
  res.verifie('causes hors de N.ids.causes', inconnues.length, 0, inconnues.length === 0, { inconnues });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
