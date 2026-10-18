/* R-05 — On peut mourir : les sept causes de mort naturelles (SORTIE.md, 18/10 à 00 h 41) se produisent au moins une fois sur
   l'ensemble des parties des pilotes (journal `mort`). */
import { executer, principal } from '../commun.mjs';
import { lot, bilanLot, PILOTES } from '../parties.mjs';

export const meta = { id: 'R-05', titre: 'On peut mourir', seuil: 'les sept causes naturelles au moins une fois ; morsure = coupe', bloquant: true };
export const CAUSES = ['mur', 'ennemi', 'tir', 'laser', 'souffle', 'convoi', 'traine'];

export async function mesurer(banc, res) {
  // La décision de SORTIE.md prime sur N.R.criteres.R05.causes encore historique (= 8).
  const graines = banc.graines(50, 5), vues = {};
  let n = 0, absent = null;
  for (const pilote of PILOTES.filter(p => p !== 'dieu')) {
    const b = bilanLot(await lot(banc, pilote, graines, pilote === 'humain' ? { actions: 'auto' } : {}));
    if (!b.ok) { absent = absent || b.raison; continue; }
    for (const r of b.resumes) { n++; for (const m of r.morts) vues[m.cause] = (vues[m.cause] || 0) + 1; }
  }
  if (!n) return res.nonMesurable('causes de mort', absent || 'aucune partie');
  const manquantes = CAUSES.filter(c => !vues[c]);
  res.verifie('causes distinctes produites', CAUSES.length - manquantes.length, CAUSES.length, manquantes.length === 0, { parCause: vues, manquantes, parties: n });
  const inconnues = Object.keys(vues).filter(c => !CAUSES.includes(c));
  res.verifie('causes hors des sept causes naturelles', inconnues.length, 0, inconnues.length === 0, { inconnues });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
