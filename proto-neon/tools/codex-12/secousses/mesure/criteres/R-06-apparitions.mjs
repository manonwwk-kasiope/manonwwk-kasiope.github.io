/* R-06 — Aucune apparition dans la vue : 0 ennemi apparu dans la vue courante (journal `apparition`, champ
   `vue`), et 0 armement hors de la vue (journal `armement`, champ `shown`). Parties des pilotes bon, humain
   et expert, 50 graines. */
import { executer, principal, seuils } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-06', titre: 'Aucune apparition dans la vue', seuil: '0 apparition dans la vue ; 0 armement hors de la vue', bloquant: true };

export async function mesurer(banc, res) {
  const { s } = await seuils(null, 'R06');
  const graines = banc.graines(50, 5);
  let app = 0, dansVue = 0, arm = 0, horsVue = 0, absent = null, sansVue = 0;
  const exemples = [];
  for (const pilote of ['bon', 'humain', 'expert']) {
    const b = bilanLot(await lot(banc, pilote, graines, pilote === 'humain' ? { actions: 'auto' } : {}));
    if (!b.ok) { absent = absent || b.raison; continue; }
    for (const p of b.parties) for (const x of p.journal) {
      const d = x.d || x;
      if (x.type === 'apparition') {
        app++;
        if (!d.vue) { sansVue++; continue; }
        const v = d.vue;
        if (d.x >= v.x && d.x <= v.x + v.w && d.y >= v.y && d.y <= v.y + v.h) { dansVue++; if (exemples.length < 5) exemples.push({ pilote, graine: p.params.graine, t: x.t, type: d.type, x: d.x, y: d.y, vue: v }); }
      } else if (x.type === 'armement') { arm++; if (d.shown === false) horsVue++; }
    }
  }
  if (!app && !arm) return res.nonMesurable('apparitions', absent || 'journal sans apparition ni armement');
  if (app) res.verifie('apparitions dans la vue', dansVue, s.apparitionsVue, dansVue <= s.apparitionsVue, { apparitions: app, sansChampVue: sansVue, exemples });
  else res.nonMesurable('apparitions dans la vue', 'journal `apparition` vide');
  if (arm) res.verifie('armements hors de la vue', horsVue, s.armementsHorsVue, horsVue <= s.armementsHorsVue, { armements: arm });
  else res.nonMesurable('armements hors de la vue', 'journal `armement` vide');
}
if (principal(import.meta.url)) executer({ meta, mesurer });
