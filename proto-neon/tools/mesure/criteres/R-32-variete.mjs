/* R-32 — Variété : 7 quartiers distincts (masques de cité deux à deux d'intersection sur union < 0,5) ; avant
   le CYCLOPE, aucune fenêtre de 60 s de jeu sans une première fois (nouvel ennemi, nouvelle mécanique ou
   nouveau quartier) dans la partie du pilote bon.
   Le masque de cité d'un quartier : le décor lointain seul (N.decor.drawFar) dessiné à une caméra fixe, puis
   les pixels au-dessus de l'horizon (N.decor.horizon()) dans les encres de silhouette (nuit, ardoise, violet,
   indigo, sang, nuit profonde). C'est une approximation documentée ; les captures sont jointes. */
import { executer, principal, seuils, exiger } from '../commun.mjs';
import { lot, bilanLot } from '../parties.mjs';

export const meta = { id: 'R-32', titre: 'Variété', seuil: '7 quartiers d’IoU < 0,5 deux à deux ; une première fois au moins toutes les 60 s avant le CYCLOPE', bloquant: true };
const SILHOUETTE = new Set([1, 2, 3, 4, 14, 15]);
const MECANIQUES = ['vol', 'inversion', 'arene', 'phase', 'lasso', 'pouvoir', 'apogee', 'coupe', 'ramassage', 'carte', 'defi'];

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R32');
  if (await exiger(s, res, 'quartiers', ['N.decor.quartier', 'N.decor.drawFar', 'N.decor.horizon', 'N.ids.quartiers', 'N.gfx.clear'])) {
    const sc = await s.scene('calme');
    if (!sc.ok) res.nonMesurable('quartiers', sc.raison);
    else {
      const Q = await s.eval(() => window.__N.ids.quartiers.slice());
      const masques = {};
      for (const q of Q) {
        await s.eval(n => { const D = window.__N.decor; try { if (D.preparer) D.preparer(n); } catch (e) { } }, q);
        await s.images(40);
        const r = await s.eval(n => {
          const N = window.__N, D = N.decor, g = N.gfx;
          try { D.quartier(n); } catch (e) { return { erreur: String(e) }; }
          if (D.etat) try { D.etat('calme'); } catch (e) { }
          const cam = { x: 300, y: 158, w: N.cam.w, h: N.cam.h };
          g.clear(0); if (g.origin) g.origin(0, 0); D.drawFar(cam);
          const h = D.horizon(), b = g.buf(), W = g.W;
          return { W, H: g.H, h, b: window.__MESURE.b64(b) };
        }, q);
        if (r.erreur) { res.nonMesurable(`quartier ${q}`, r.erreur); continue; }
        const b = Buffer.from(r.b, 'base64'), m = new Uint8Array(r.W * r.H);
        for (let y = 0; y < Math.min(r.h, r.H); y++) for (let x = 0; x < r.W; x++) if (SILHOUETTE.has(b[y * r.W + x])) m[y * r.W + x] = 1;
        const n = m.reduce((a, v) => a + v, 0);
        if (!n) { res.nonMesurable(`quartier ${q}`, 'masque de cité vide (aucun pixel de silhouette au-dessus de l’horizon ' + r.h + ')'); continue; }
        masques[q] = m;
        res.capture(await s.captureTampon('R-32-' + q, 2, { W: r.W, H: r.H, buf: b }));
      }
      const noms = Object.keys(masques), paires = [];
      for (let i = 0; i < noms.length; i++) for (let j = i + 1; j < noms.length; j++) {
        const a = masques[noms[i]], c = masques[noms[j]]; let inter = 0, uni = 0;
        for (let k = 0; k < a.length; k++) { if (a[k] && c[k]) inter++; if (a[k] || c[k]) uni++; }
        paires.push({ a: noms[i], b: noms[j], iou: inter / uni });
      }
      const ok = paires.filter(p => p.iou < S.iou);
      res.verifie('quartiers distincts (paires d’IoU < ' + S.iou + ')', ok.length, `${paires.length} paires sur ${S.quartiers} quartiers`, noms.length >= S.quartiers && ok.length === paires.length, { quartiers: noms, pires: paires.sort((x, y) => y.iou - x.iou).slice(0, 4).map(p => ({ ...p, iou: +p.iou.toFixed(3) })) });
    }
  }
  await s.fermer();
  const b = bilanLot(await lot(banc, 'bon', banc.graines(10, 3)));
  if (!b.ok) return res.nonMesurable('premières fois', b.raison);
  const trous = [];
  for (const p of b.parties) {
    const r = b.resumes.find(x => x.graine === p.params.graine), fin = r.entreeCyclope ?? r.duree, vus = new Set(), instants = [0];
    for (const x of p.journal) {
      if (x.t > fin) break; const d = x.d || {};
      let k = null;
      if (x.type === 'apparition') k = 'ennemi:' + d.type + (d.elite ? ':elite' : '');
      else if (x.type === 'vague' && d.quartier) k = 'quartier:' + d.quartier;
      else if (MECANIQUES.includes(x.type)) k = x.type + ':' + (d.evt || d.id || d.type || '');
      if (k && !vus.has(k)) { vus.add(k); instants.push(x.t); }
    }
    instants.push(fin);
    let max = 0, at = 0; for (let i = 1; i < instants.length; i++) if (instants[i] - instants[i - 1] > max) { max = instants[i] - instants[i - 1]; at = instants[i - 1]; }
    trous.push({ graine: r.graine, max: +max.toFixed(1), depuis: +at.toFixed(1), premieres: vus.size });
  }
  const pire = Math.max(...trous.map(t => t.max));
  res.verifie('plus longue fenêtre sans première fois avant le CYCLOPE (s, pire partie)', pire, '≤ ' + S.premiereFois, pire <= S.premiereFois, { parties: trous });
}
if (principal(import.meta.url)) executer({ meta, mesurer });
