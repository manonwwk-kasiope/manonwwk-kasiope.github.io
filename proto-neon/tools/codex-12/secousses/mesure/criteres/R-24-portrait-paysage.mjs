/* R-24 — Portrait et paysage : le jeu complet dans les deux sens (pilote dieu, mode simulé, jusqu'à la
   victoire, zéro erreur) ; en portrait, la tête hors du quart bas de la zone sûre sur au moins 95 % des
   images (partie dessinée du pilote bon, invulnérable). */
import { executer, principal, seuils, exiger } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-24', titre: 'Portrait et paysage', seuil: 'jeu complet dans les deux sens ; tête hors du quart bas ≥ 95 % en portrait', bloquant: true };

export async function mesurer(banc, res) {
  const { s: S } = await seuils(null, 'R24');
  for (const profil of ['paysage', 'portrait']) {
    const b = bilanLot(await lot(banc, 'dieu', banc.graines(3, 1), { profil, god: true }));
    if (!b.ok) { res.nonMesurable(`${profil} : secteur complet`, b.raison); continue; }
    const fin = b.resumes.filter(r => r.victoire && r.erreurs && r.erreurs.zero).length;
    res.verifie(`${profil} : secteur complet gagné sans erreur (pilote dieu)`, fin / b.resumes.length, 1, fin === b.resumes.length, { parties: b.resumes.length, durees: b.resumes.map(r => +r.duree.toFixed(1)) });
  }
  const s = await banc.ouvrir('portrait', { dt: 1 / 60 });
  if (!await exiger(s, res, 'portrait : tête hors du quart bas', ['N.cam.toScreen', 'S.player', 'N.gfx.present'])) return;
  const d = await s.demarrer({ graine: 6, pilote: 'bon', god: true });
  if (!d.ok) return res.nonMesurable('portrait : tête hors du quart bas', d.raison);
  await s.eval(() => window.__MESURE.parImage('r24', `var p = S.player, e = M.etat(); if (!p || ['jeu','nettoyage','reapparition','defile','alerte','boss'].indexOf(e) < 0) return null;
    var o = {}; N.cam.toScreen(p.x, p.y, o); var sf = S.view && S.view.safe || {t:0,b:0}; return (o.y - sf.t) / (N.gfx.H - sf.t - sf.b);`));
  await s.page.waitForTimeout((banc.o.rapide ? 15 : 60) * 1000);
  const Y = (await s.eval(() => window.__MESURE.arreter('r24'))).filter(v => typeof v === 'number');
  if (!Y.length) return res.nonMesurable('portrait : tête hors du quart bas', 'aucune image de jeu');
  const part = Y.filter(y => y < 0.75).length / Y.length;
  res.verifie('portrait : tête hors du quart bas de la zone sûre', part, '≥ ' + S.teteHorsQuartBas, part >= S.teteHorsQuartBas, { images: Y.length, yMax: Math.max(...Y) });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
