/* R-28 — Mouvement réduit : sous prefers-reduced-motion, caméra et plans immobiles à la mort d'une élite
   (aucune poussée N.cam, aucune secousse S.shake, moins de 0,5 % de pixels changés pendant le gel), jeu
   complet (pilote dieu, mode simulé), lumière gardée (valeur globale indicative, décision SORTIE.md). */
import { executer, principal, seuils, exiger } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-28', titre: 'Mouvement réduit', seuil: 'caméra et plans immobiles à la mort d’une élite ; jeu complet ; lumière gardée', bloquant: true };
const IMAGE = 'var p = S.player || {x:0,y:0}; return { f: window.__FRAME, h: N.horloge.etat(), etat: M.etat(), b: M.b64(N.gfx.buf()), cx: N.cam.x, cy: N.cam.y, px: p.x, py: p.y, sh: +S.shake || 0, g: N.horloge && N.horloge.gele ? !!N.horloge.gele() : false };';

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60, reducedMotion: 'reduce' });
  const { R } = await seuils(s, 'R28');
  const L = (R.decor && R.decor.lumiere) || { calme: { part: 0.25 }, reduit: 0.005 };
  if (!await exiger(s, res, 'élite', ['N.ennemis.spawn', 'N.ennemis.hit', 'N.game.dbg.scene', 'N.gfx.present', 'N.journal.lire'])) return;
  res.verifie('prefers-reduced-motion vu par la page', await s.eval(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true, true);
  const v = await s.scene('v5');
  if (!v.ok) res.nonMesurable('mort d’une élite', v.raison);
  else {
    await s.eval(() => { const d = window.__MESURE.dbg(); if (d.god) d.god(true); });
    let id = await s.eval(() => { const N = window.__N; try { const e = N.ennemis.spawn('fleche', N.cam.x + N.cam.w / 2, N.cam.y + N.cam.h / 2, { elite: 'flecheBlindee' }); return e ? e.id : null; } catch (x) { return null; } });
    if (id === null) res.nonMesurable('mort d’une élite', 'N.ennemis.spawn n’a rien rendu');
    else {
      await s.images(20);
      await s.eval(c => window.__MESURE.parImage('r28', c), IMAGE);
      await s.images(10);
      id = await s.eval(i => {
        const N = window.__N;
        // L'élite de chauffe a pu mourir sous le tir automatique. Construire alors la
        // cible au moment de la frappe, et ne jamais attribuer son gel à un autre kill.
        let e = N.ennemis.list.find(x => x.id === i && x.etat !== 'mort');
        if (!e) e = N.ennemis.spawn('fleche', N.cam.x, N.cam.y, { elite: 'flecheBlindee' });
        if (!e) return null;
        e.x = N.cam.x + N.cam.w / 2; e.y = N.cam.y + N.cam.h / 2;
        for (let k = 0; k < 50 && e.etat !== 'mort'; k++) N.ennemis.hit(e, (e.pvMax || 1) * 4, { genre: 'arme', type: 'canon', id: 0 });
        return e.id;
      }, id);
      const morte = await s.eval(i => window.__N.journal.lire('kill').some(e => e.d.id === i), id);
      res.verifie('mort réelle de l’élite au journal', morte, true, morte);
      await s.images(40);
      const I = (await s.eval(() => window.__MESURE.arreter('r28'))).map(x => ({ ...x, b: Buffer.from(x.b, 'base64') }));
      const avant = I.slice(0, 10), apres = I.slice(10, 40), c0 = avant[avant.length - 1];
      const temoin = Math.max(0, ...avant.slice(1).map(x => Math.hypot(x.cx - x.px - (avant[0].cx - avant[0].px), x.cy - x.py - (avant[0].cy - avant[0].py))));
      const jolt = Math.max(0, Math.max(0, ...apres.map(x => Math.hypot(x.cx - x.px - (c0.cx - c0.px), x.cy - x.py - (c0.cy - c0.py)))) - temoin);
      res.verifie('poussée de caméra à la mort de l’élite (px)', jolt, '≤ 0,5', jolt <= 0.5, { temoin });
      res.verifie('secousse S.shake à la mort de l’élite (px)', Math.max(0, ...apres.map(x => x.sh)), 0, apres.every(x => x.sh === 0));
      const geles = apres.filter(x => x.g);
      if (geles.length >= 2) {
        let maxCh = 0, paires = 0, pire = null; for (let k = 1; k < geles.length; k++) { if (geles[k].f !== geles[k-1].f + 1) continue; paires++; let n = 0; for (let i = 0; i < geles[k].b.length; i++) if (geles[k].b[i] !== geles[k - 1].b[i]) n++; if(!pire || n/geles[k].b.length>maxCh){maxCh=n/geles[k].b.length;pire=[geles[k-1],geles[k]].map(x=>({...x,b:x.b.toString('base64')}));} }
        if (!paires) res.nonMesurable('plans immobiles pendant le gel', 'aucune paire de deux images gelées consécutives');
        else res.verifie('pixels changés d’une image à l’autre pendant le gel', maxCh, '≤ ' + (L.reduit || 0.005), maxCh <= (L.reduit || 0.005), { imagesGelees: geles.length, pairesConsecutives: paires, pairePire: pire });
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
