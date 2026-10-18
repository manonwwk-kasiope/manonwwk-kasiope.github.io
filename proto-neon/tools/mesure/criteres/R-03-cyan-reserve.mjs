/* R-03 — Cyan réservé : cyan et cyan pâle hors du masque joueuse + arsenal + icônes de vie (codes 1 à 4 de
   __N.game.dbg.masque()) sous 0,5 % du tampon, sur 10 captures de jeu (et la mort, LE VOL, l'INVERSION,
   les cartes). Les écrans pleins de cinématique (fin, panneaux) sont hors compte : le serpent y est la joueuse. */
import { executer, principal, exiger, seuils, SCENES_JEU, pct } from '../commun.mjs';
import { atteindre } from '../scenes.mjs';
import { construire } from '../../codex-p22/cas.mjs';

export const meta = { id: 'R-03', titre: 'Cyan réservé', seuil: 'cyan hors codes 1-4 du masque < 0,5 %', bloquant: true };
const MOMENTS = [...SCENES_JEU, 'mort', 'vol', 'inversion', 'cartes'];

export async function mesurer(banc, res) {
  for (const profil of banc.profils(['paysage', 'portrait', 'bureau'])) {
  const s = await banc.ouvrir(profil, { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R03');
  if (!await exiger(s, res, 'masque de propriété', ['N.gfx.buf', 'N.game.dbg.masque'])) return;
  // Le masque doit être armé AVANT la première image calme, jamais déduit de sa couleur.
  await s.eval(() => window.__N.game.dbg.masque());
  let pire = 0;
  for (const m of MOMENTS) {
    const r = await atteindre(s, m);
    if (!r.ok) { res.nonMesurable(m, r.raison); continue; }
    // Un panneau encore visible n'est pas un tampon de jeu admissible (CONTRAT.md).
    // Garder la capture et signaler la superposition, sans l'exclure pour obtenir un OK.
    const film = await s.eval(() => window.__N.intro && window.__N.intro.current ? window.__N.intro.current() : null);
    if (film) {
      res.capture(await s.captureTampon('R-03-' + m));
      res.nonMesurable(m, 'panneau ' + film + ' encore dessiné dans état ' + await s.etat());
      continue;
    }
    await s.eval(() => window.__MESURE.masque());
    await s.images(1);
    const a = await s.analyse();
    if (!a.masque) { res.nonMesurable(m, await s.eval(() => window.__MESURE.raisonMasque)); continue; }
    pire = Math.max(pire, a.cyanHorsMasque);
    res.capture(await s.captureTampon('R-03-' + m));
    res.verifie(`${profil} ${m}`, a.cyanHorsMasque, S.cyanHorsMasque, a.cyanHorsMasque < S.cyanHorsMasque, { cyanTotal: a.cyan, etat: a.etat });
  }
  const vol = await s.eval(construire, { nom: 'vol' });
  for (const a of vol.images) {
    if (!a.proprietaires) res.nonMesurable(`${profil} vol t=${a.t}`, 'aucun propriétaire après dessin');
    else res.verifie(`${profil} vol t=${a.t}${a.secondeEntree ? ' seconde entrée' : ''}`, a.part, S.cyanHorsMasque, a.part < S.cyanHorsMasque, { cyanTotal: a.cyan / (a.W * a.H), horsPalette: a.horsPalette });
  }
  res.verifie(`${profil} vol erreurs`, vol.err.count, 0, vol.err.count === 0);
  res.note(profil + ' : pire image ' + pct(Math.max(pire, vol.pire)));
  await s.fermer();
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
