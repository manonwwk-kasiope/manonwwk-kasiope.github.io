/* R-28 — Mouvement réduit : sous prefers-reduced-motion, caméra et plans immobiles à la mort d'une élite
   (aucune poussée N.cam, aucune secousse S.shake, moins de 0,5 % de pixels changés pendant le gel), jeu
   complet (pilote dieu, mode simulé), lumière gardée (valeur globale indicative, décision SORTIE.md). */
import { executer, principal, seuils, exiger } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-28', titre: 'Mouvement réduit', seuil: 'caméra et plans immobiles à la mort d’une élite ; jeu complet ; lumière gardée', bloquant: true };
const IMAGE = 'var p = S.player || {x:0,y:0}; return { b: M.b64(N.gfx.buf()), cx: N.cam.x, cy: N.cam.y, px: p.x, py: p.y, sh: +S.shake || 0, g: N.horloge && N.horloge.gele ? !!N.horloge.gele() : false };';

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, reducedMotion: 'reduce' });
  const { R } = await seuils(s, 'R28');
  const L = (R.decor && R.decor.lumiere) || { calme: { part: 0.25 }, reduit: 0.005 };
  if (!await exiger(s, res, 'élite', ['N.ennemis.spawn', 'N.ennemis.hit', 'N.game.dbg.scene', 'N.gfx.present'])) return;
  res.verifie('prefers-reduced-motion vu par la page', await s.eval(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true, true);
  const v = await s.scene('v5');
  if (!v.ok) res.nonMesurable('mort d’une élite', v.raison);
  else {
    await s.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
    const id = await s.eval(() => { const N = window.__N, p = window.__S.player; try { const e = N.ennemis.spawn('fleche', p.x + Math.cos(p.ang) * 70, p.y + Math.sin(p.ang) * 70, { elite: 'flecheBlindee', direct: true }); return e ? e.id : null; } catch (x) { return null; } });
    if (id === null) res.nonMesurable('mort d’une élite', 'N.ennemis.spawn n’a rien rendu');
    else {
      await s.images(20);
      await s.eval(c => window.__MESURE.parImage('r28', c), IMAGE);
      await s.images(10);
      await s.eval(i => { const N = window.__N; for (let k = 0; k < 50; k++) { const e = N.ennemis.list.find(x => x.id === i && x.etat !== 'mort'); if (!e) break; N.ennemis.hit(e, (e.pvMax || 1) * 4, { genre: 'arme', type: 'canon', id: 0 }); } }, id);
      await s.images(40);
      const I = (await s.eval(() => window.__MESURE.arreter('r28'))).map(x => ({ ...x, b: Buffer.from(x.b, 'base64') }));
      const avant = I.slice(0, 10), apres = I.slice(10, 40), c0 = avant[avant.length - 1];
      const temoin = Math.max(0, ...avant.slice(1).map(x => Math.hypot(x.cx - x.px - (avant[0].cx - avant[0].px), x.cy - x.py - (avant[0].cy - avant[0].py))));
      const jolt = Math.max(0, Math.max(0, ...apres.map(x => Math.hypot(x.cx - x.px - (c0.cx - c0.px), x.cy - x.py - (c0.cy - c0.py)))) - temoin);
      res.verifie('poussée de caméra à la mort de l’élite (px)', jolt, '≤ 0,5', jolt <= 0.5, { temoin });
      res.verifie('secousse S.shake à la mort de l’élite (px)', Math.max(0, ...apres.map(x => x.sh)), 0, apres.every(x => x.sh === 0));
      const geles = apres.filter(x => x.g);
      if (geles.length >= 2) {
        let maxCh = 0; for (let k = 1; k < geles.length; k++) { let n = 0; for (let i = 0; i < geles[k].b.length; i++) if (geles[k].b[i] !== geles[k - 1].b[i]) n++; maxCh = Math.max(maxCh, n / geles[k].b.length); }
        res.verifie('pixels changés d’une image à l’autre pendant le gel', maxCh, '≤ ' + (L.reduit || 0.005), maxCh <= (L.reduit || 0.005), { imagesGelees: geles.length });
      } else res.nonMesurable('plans immobiles pendant le gel', 'moins de deux images gelées après la mort de l’élite');
    }
  }
  const c = await s.scene('calme');
  if (!c.ok) res.nonMesurable('lumière gardée', c.raison);
  else { const a = await s.analyse({ masque: false }); res.indicatif('lumière gardée (scène calme, pixels lumineux)', a.lumineux, '≥ ' + L.calme.part, a.lumineux >= L.calme.part); }
  const b = bilanLot(await lot(banc, 'dieu', banc.graines(2, 1), { god: true, reducedMotion: 'reduce' }));
  if (!b.ok) res.nonMesurable('jeu complet en mouvement réduit', b.raison);
  else res.verifie('jeu complet en mouvement réduit (pilote dieu)', b.resumes.filter(r => r.victoire && r.erreurs.zero).length / b.resumes.length, 1, b.resumes.every(r => r.victoire && r.erreurs.zero));
}
if (principal(import.meta.url)) executer({ meta, mesurer });
