/* R-03 — Cyan réservé : cyan et cyan pâle hors du masque joueuse + arsenal + icônes de vie (codes 1 à 4 de
   __N.game.dbg.masque()) sous 0,5 % du tampon, sur 10 captures de jeu (et la mort, LE VOL, l'INVERSION,
   les cartes). Les écrans pleins de cinématique (fin, panneaux) sont hors compte : le serpent y est la joueuse. */
import { executer, principal, exiger, seuils, SCENES_JEU, pct } from '../commun.mjs';
import { atteindre } from '../scenes.mjs';

export const meta = { id: 'R-03', titre: 'Cyan réservé', seuil: 'cyan hors codes 1-4 du masque < 0,5 %', bloquant: true };
const MOMENTS = [...SCENES_JEU, 'mort', 'vol', 'inversion', 'cartes'];

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R03');
  if (!await exiger(s, res, 'masque de propriété', ['N.gfx.buf', 'N.game.dbg.masque'])) return;
  let pire = 0;
  for (const m of MOMENTS) {
    const r = await atteindre(s, m);
    if (!r.ok) { res.nonMesurable(m, r.raison); continue; }
    const a = await s.analyse();
    if (!a.masque) { res.nonMesurable(m, 'N.game.dbg.masque() a rendu null'); continue; }
    pire = Math.max(pire, a.cyanHorsMasque);
    res.capture(await s.captureTampon('R-03-' + m));
    res.verifie(m, a.cyanHorsMasque, S.cyanHorsMasque, a.cyanHorsMasque < S.cyanHorsMasque, { cyanTotal: a.cyan, etat: a.etat });
  }
  res.note('pire image : ' + pct(pire));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
