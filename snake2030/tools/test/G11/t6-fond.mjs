/* G11 — test 6 : LUMINANCE DU FOND (et non de l'image entière).
   Le fond est défini comme les pixels situés hors de tout masque d'entité
   (tête, segments, ennemis, butins, tirs joueur et ennemis) ; l'interface du
   jeu est en DOM, elle ne touche pas le tampon du canevas. La grandeur suivie
   est la MÉDIANE de leur luminance Rec.709 — pas la moyenne sur toute l'image
   que renvoie av-hue.mjs sous le nom pct.lum, qui compte les entités.
   L'objectif fait légitimement monter la luminance GLOBALE (télégraphes de 0,10
   à 0,35 et de 0,18-0,60 à 0,35-0,85, halo blanc de tête, traits épaissis, cône
   de visée) : le contrôle porte donc sur le fond seul, et il porte DEUX bornes
   qui doivent être tenues TOUTES LES DEUX :
     - médiane du fond <= 30/255 en ABSOLU ;
     - éclaircissement <= 15 % relatifs par rapport à la référence relevée AVANT
       modification (build du dernier commit, même protocole, même graine). */
import { save, finish, deadline } from '../lib.mjs';
import { captures } from './capture.mjs';
deadline(600, 'G11-t6-fond');

const { cur, ref } = await captures('both');
const lignes = cur.captures.map((c, i) => {
  const R = ref.captures[i];
  const rel = R.fondMedianeLum > 0 ? 100 * (c.fondMedianeLum - R.fondMedianeLum) / R.fondMedianeLum : 0;
  return {
    capture: c.label, level: c.level, t: Math.round(c.t), partEff: c.partEff,
    fondMediane: c.fondMedianeLum, fondPx: c.fondPx,
    reference: R.fondMedianeLum, referencePx: R.fondPx,
    ecartRelatifPct: +rel.toFixed(1),
    okAbsolu: c.fondMedianeLum <= 30, okRelatif: rel <= 15,
  };
});
const pass = lignes.every(l => l.okAbsolu && l.okRelatif);
const r = {
  test: 'G11-t6-fond', pass,
  seuil: 'médiane de luminance du fond ≤ 30/255 en absolu ET éclaircissement ≤ 15 % relatifs par rapport à la référence d’avant modification',
  referenceCommit: ref.commit,
  measured: lignes,
};
save('G11-t6-fond.json', r);
finish(r.test, { pass, measured: lignes, threshold: r.seuil });
