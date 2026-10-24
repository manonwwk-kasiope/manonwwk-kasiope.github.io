/* R-08 — Mort juste : au moins 95 % des morts ont une source visible depuis 600 ms ou plus (champ
   visibleDepuis du journal `mort`), hors mur, morsure et traînée (visibles par construction). */
import { executer, principal, seuils, pct } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-08', titre: 'Mort juste', seuil: '≥ 95 % des morts avec une source visible depuis ≥ 0,6 s', bloquant: true };
const EXCLUES = ['mur', 'morsure', 'traine'];

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R08');
  const graines = banc.graines(50, 5);
  let n = 0, justes = 0, absent = null; const parCause = {}, injustes = [];
  for (const pilote of ['bon', 'humain', 'expert', 'maladroit']) {
    const b = bilanLot(await lot(banc, pilote, graines, pilote === 'humain' ? { actions: 'auto' } : {}));
    if (!b.ok) { absent = absent || b.raison; continue; }
    for (const r of b.resumes) for (const m of r.morts) {
      if (EXCLUES.includes(m.cause)) continue;
      n++; const ok = m.visibleDepuis >= s.visible - 1e-6; if (ok) justes++;
      const c = parCause[m.cause] || (parCause[m.cause] = { n: 0, justes: 0 }); c.n++; if (ok) c.justes++;
      if (!ok && injustes.length < 8) injustes.push({ pilote, graine: r.graine, t: +m.t.toFixed(2), cause: m.cause, auteur: m.auteur, visibleDepuis: m.visibleDepuis });
    }
  }
  if (!n) return res.nonMesurable('morts justes', absent || 'aucune mort hors mur, morsure et traînée dans le journal');
  res.verifie('morts à source visible depuis ≥ ' + s.visible + ' s', justes / n, '≥ ' + pct(s.part), justes / n >= s.part, { morts: n, parCause, exemples: injustes });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
