/* R-02 — Palette fermée : 100 % des pixels du tampon dans les seize (N.gfx.buf()), sur 10 captures de jeu,
   l'attraction, la mort, LE VOL, l'INVERSION, les cartes et la fin. Le tampon est un tampon d'index : un
   index hors de 0..15 est une couleur hors palette. */
import { executer, principal, exiger, seuils, SCENES_JEU, pct } from '../commun.mjs';
import { atteindre } from '../scenes.mjs';

export const meta = { id: 'R-02', titre: 'Palette fermée', seuil: '100 % des pixels du tampon dans les seize', bloquant: true };
export const MOMENTS = [...SCENES_JEU, 'attraction', 'mort', 'vol', 'inversion', 'cartes', 'fin'];

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R02');
  if (!await exiger(s, res, 'tampon', ['N.gfx.buf'])) return;
  for (const m of MOMENTS) {
    const r = await atteindre(s, m);
    if (!r.ok) { res.nonMesurable(m, r.raison); continue; }
    const a = await s.analyse({ masque: false });
    res.capture(await s.captureTampon('R-02-' + m));
    const part = 1 - a.horsPalette / a.total;
    res.verifie(m, part, S.palette, part >= S.palette, { horsPalette: a.horsPalette, etat: a.etat });
  }
  if (!res.mesures.some(x => x.statut === 'ok' || x.statut === 'echec')) res.note('aucune image n’a pu être atteinte');
  else res.note('part dans la palette, image par image : ' + res.mesures.filter(x => x.valeur !== undefined).map(x => x.nom + ' ' + pct(x.valeur)).join(', '));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
