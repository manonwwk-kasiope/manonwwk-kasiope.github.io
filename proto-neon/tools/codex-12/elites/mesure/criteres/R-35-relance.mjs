/* R-35 — Relance : REJOUER rend le serpent en moins de 2 s, sans briefing (scène `fin`, validation, puis
   chronométrage en images × __DT jusqu'à l'état jeu, joueuse vivante) ; V1 dure au plus 24 s (médiane,
   pilote bon, de l'entrée au nettoyage). */
import { executer, principal, seuils, exiger, stats } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-35', titre: 'Relance', seuil: 'REJOUER → serpent en main < 2 s, sans briefing ; V1 ≤ 24 s (médiane)', bloquant: true };

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R35');
  if (await exiger(s, res, 'écran de fin', ['N.game.dbg.scene', 'N.game.dbg.input'])) {
    const sc = await s.scene('fin', { images: 40 });
    if (!sc.ok) res.nonMesurable('REJOUER', sc.raison);
    else {
      await s.eval(() => window.__MESURE.parImage('r35', 'return { f: window.__FRAME, e: M.etat(), j: N.joueuse && N.joueuse.etat };'));
      await s.eval(() => window.__MESURE.dbg().input({ valider: true, any: true }));
      await s.images(200, 20);
      const I = await s.eval(() => window.__MESURE.arreter('r35'));
      const k = I.findIndex(x => x.e === 'jeu' && x.j === 'vivant');
      const etats = [...new Set(I.map(x => x.e))];
      res.verifie('REJOUER → serpent en main (s)', k < 0 ? null : k / 60, '< ' + S.relance, k >= 0 && k / 60 < S.relance, { etats });
      res.verifie('REJOUER sans briefing', !etats.includes('briefing') && !etats.includes('ouverture'), true, !etats.includes('briefing') && !etats.includes('ouverture'));
    }
  }
  await s.fermer();
  const b = bilanLot(await lot(banc, 'bon', banc.graines(50, 5)));
  if (!b.ok) return res.nonMesurable('durée de V1', b.raison);
  const d = b.resumes.map(r => r.entreeV(1) !== null && r.nettoyeeV(1) !== null ? r.nettoyeeV(1) - r.entreeV(1) : null).filter(x => x !== null);
  if (!d.length) return res.nonMesurable('durée de V1', 'aucune V1 nettoyée');
  res.verifie('durée de V1 (médiane, s)', stats.mediane(d), '≤ ' + S.v1Max, stats.mediane(d) <= S.v1Max, { parties: d.length, min: Math.min(...d), max: Math.max(...d) });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
