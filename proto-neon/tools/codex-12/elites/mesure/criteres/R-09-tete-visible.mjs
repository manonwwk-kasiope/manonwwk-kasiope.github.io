/* R-09 — Tête visible : la tête dans le cadre (15-85 % de la zone sûre) sur 100 % des images ; le trajet
   visible devant (§ 3.3 : ≥ min(1,2 s × v, d_mur + 16 px) en croisière, ≥ min(0,8 s × v, d_mur + 16 px) en
   accélération) ; la tête et 2 segments au-dessus des effets (codes 1 et 2 du masque). Mesure : partie
   dessinée du pilote bon (invulnérable), chaque image lue après le dessin (N.gfx.present). */
import { executer, principal, seuils, exiger, stats, pct } from '../commun.mjs';

export const meta = { id: 'R-09', titre: 'Tête visible', seuil: 'tête dans 15-85 % de la zone sûre sur 100 % des images ; trajet devant ; tête et 2 segments au-dessus des effets', bloquant: true };
const ECHANTILLON = `
  var p = S.player, c = N.cam, e = M.etat(); if (!p || !c || ['jeu','nettoyage','reapparition','defile','alerte','boss'].indexOf(e) < 0) return null;
  if (N.joueuse && N.joueuse.etat && N.joueuse.etat !== 'vivant') return null;
  var W = N.gfx.W, H = N.gfx.H, sf = S.view && S.view.safe || {l:0,t:0,r:0,b:0};
  var o = {}; c.toScreen(p.x, p.y, o);
  var zx = (o.x - sf.l) / (W - sf.l - sf.r), zy = (o.y - sf.t) / (H - sf.t - sf.b);
  /* trajet visible devant : de la tête au bord de la vue, le long du cap ; d_mur : jusqu'au mur courant */
  var a = p.ang, dx = Math.cos(a), dy = Math.sin(a), w = N.world;
  function sortie(x0, y0, x1, y1) { var t = 1e9; if (dx > 1e-9) t = Math.min(t, (x1 - p.x) / dx); if (dx < -1e-9) t = Math.min(t, (x0 - p.x) / dx); if (dy > 1e-9) t = Math.min(t, (y1 - p.y) / dy); if (dy < -1e-9) t = Math.min(t, (y0 - p.y) / dy); return Math.max(0, t); }
  var vu = sortie(c.x, c.y, c.x + c.w, c.y + c.h), dmur = w ? sortie(w.x0, w.y0, w.x1, w.y1) : 1e9;
  return { zx: zx, zy: zy, vu: vu, devant: c.devant ? c.devant() : null, dmur: dmur, v: p.vit, boost: !!p.boost };`;

export async function mesurer(banc, res) {
  const duree = banc.o.long ? 180 : banc.o.rapide ? 15 : 60;
  for (const profil of banc.profils()) {
    const s = await banc.ouvrir(profil, { dt: 1 / 60 });
    const { R, s: S } = await seuils(s, 'R09');
    if (!await exiger(s, res, `${profil} : caméra`, ['N.cam.toScreen', 'N.cam.w', 'N.world.x0', 'S.player', 'N.gfx.present'])) { await s.fermer(); continue; }
    const d = await s.demarrer({ graine: 4, pilote: 'bon', god: true });
    if (!d.ok) { res.nonMesurable(`${profil} : partie`, d.raison); await s.fermer(); continue; }
    await s.eval(c => window.__MESURE.parImage('r09', c), ECHANTILLON);
    /* la tête au-dessus des effets : toutes les secondes, le masque sous la tête et sous les segments 1 et 2 */
    const dessus = [];
    const absMasque = await s.absents(['N.game.dbg.masque', 'N.joueuse.segs']);
    const t0 = Date.now();
    while (Date.now() - t0 < duree * 1000) {
      await s.page.waitForTimeout(1000);
      if (absMasque.length) continue;
      const m = await s.eval(() => {
        const N = window.__N, M = window.__MESURE; if (!N.game.dbg.masque || !N.joueuse || !N.joueuse.segs) return null;
        const segs = N.joueuse.segs(); const pts = [];
        if (ArrayBuffer.isView(segs) || (Array.isArray(segs) && typeof segs[0] === 'number')) for (let i = 0; i < 6; i += 2) pts.push({ x: segs[i], y: segs[i + 1] }); else for (let i = 0; i < 3 && i < segs.length; i++) pts.push(segs[i]);
        const mk = M.masque(); if (!mk) return null; const W = N.gfx.W, o = {};
        return pts.map((p, k) => { N.cam.toScreen(p.x, p.y, o); const x = Math.round(o.x), y = Math.round(o.y); return x >= 0 && y >= 0 && x < W && y < N.gfx.H ? { k, code: mk[y * W + x] } : null; }).filter(Boolean);
      });
      if (m) dessus.push(m);
    }
    const E = (await s.eval(() => window.__MESURE.arreter('r09'))).filter(x => x && !x.erreurSonde);
    if (!E.length) { res.nonMesurable(`${profil} : images de jeu`, 'aucune image de jeu avec la joueuse vivante'); await s.fermer(); continue; }
    const cadre = (R.camera && R.camera.cadre) || { min: S.cadre[0], max: S.cadre[1], portraitMaxY: 0.72 };
    const dans = E.filter(e => e.zx >= cadre.min && e.zx <= cadre.max && e.zy >= cadre.min && e.zy <= cadre.max).length;
    res.verifie(`${profil} : tête dans ${pct(cadre.min)}-${pct(cadre.max)} de la zone sûre`, dans / E.length, 1, dans === E.length, { images: E.length, zx: [stats.quantile(E.map(e => e.zx), 0), stats.quantile(E.map(e => e.zx), 1)], zy: [stats.quantile(E.map(e => e.zy), 0), stats.quantile(E.map(e => e.zy), 1)] });
    const dv = (R.camera && R.camera.devant) || { croisiere: 1.2, boost: 0.8, margeMur: 16 };
    const ok = E.filter(e => e.vu + 1 >= Math.min((e.boost ? dv.boost : dv.croisiere) * e.v, e.dmur + dv.margeMur)).length;
    res.verifie(`${profil} : trajet visible devant (mesuré sur la vue)`, ok / E.length, 1, ok === E.length, { images: E.length, enAcceleration: E.filter(e => e.boost).length });
    const avecDevant = E.filter(e => e.devant !== null);
    if (avecDevant.length) { const ecart = stats.quantile(avecDevant.map(e => Math.abs(e.devant - e.vu)), 0.95); res.indicatif(`${profil} : N.cam.devant() fidèle à la vue (écart p95, px)`, ecart, '≤ 2', ecart <= 2); }
    else res.absent(`${profil} : N.cam.devant()`, 'N.cam.devant');
    const lus = dessus.flat();
    if (lus.length) {
      const bons = lus.filter(x => (x.k === 0 ? x.code === 1 : x.code === 1 || x.code === 2)).length;
      res.verifie(`${profil} : tête et 2 segments au-dessus des effets (masque)`, bons / lus.length, 1, bons === lus.length, { lectures: lus.length });
    } else if (absMasque.length) res.absent(`${profil} : tête au-dessus des effets`, absMasque);
    else res.nonMesurable(`${profil} : tête au-dessus des effets`, 'aucune lecture du masque sous la tête (joueuse hors de la vue ou masque vide)');
    await s.fermer();
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
