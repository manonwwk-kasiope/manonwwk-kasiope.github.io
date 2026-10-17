/* R-12 — Explosion : à la mort du CYCLOPE et des élites, la part de brasier dépasse 8 % de l'écran pendant
   au moins 4 images, et la caméra bouge d'au moins 6 px de jeu (poussée N.cam ou secousse S.shake).
   Mesure : partie dessinée, invulnérable ; l'œil du CYCLOPE (scène boss3) et chaque élite (scène v5, une
   élite posée à 70 px devant la tête) sont détruits par N.ennemis.hit ; chaque image est lue après le dessin. */
import { executer, principal, seuils, exiger } from '../commun.mjs';

export const meta = { id: 'R-12', titre: 'Explosion', seuil: 'brasier > 8 % pendant ≥ 4 images ; caméra ≥ 6 px', bloquant: true };
const ELITES = { flecheBlindee: 'fleche', rival: 'rival', rucheInstable: 'ruche' };
const IMAGE = 'var b = N.gfx.buf(), n = 0; for (var i = 0; i < b.length; i++) if (b[i] === 11) n++; var p = S.player || {x:0,y:0}; return { br: n / b.length, cx: N.cam.x, cy: N.cam.y, px: p.x, py: p.y, sh: +S.shake || 0, e: M.etat() };';

async function exploser(s, cible) {
  await s.eval(c => window.__MESURE.parImage('r12', c), IMAGE);
  await s.images(30);
  const tue = await s.eval(c => {
    const N = window.__N, src = { genre: 'arme', type: 'canon', id: 0 };
    let n = 0, tues = 0;
    const viser = () => N.ennemis.list.filter(e => e.etat !== 'mort' && (c.boss ? e.boss : e.id === c.id));
    for (let k = 0; k < 200; k++) { const l = viser(); if (!l.length) break; for (const e of l) { if (N.ennemis.hit(e, Math.max(1, e.pvMax || e.pv || 1) * 4, src)) tues++; n++; } }
    return { coups: n, tues, reste: viser().length };
  }, cible);
  await s.images(60);
  const L = await s.eval(() => window.__MESURE.arreter('r12'));
  const nb = 30, base = L.slice(0, nb), apres = L.slice(nb);
  let run = 0, best = 0; for (const x of apres) { if (x.br > 0.08) { run++; best = Math.max(best, run); } else run = 0; }
  /* la caméra suit la tête : on mesure l'écart caméra − tête par rapport à celui d'avant le coup (poussée
     N.cam.jolt), et la secousse en espace écran S.shake ; sur les 30 images qui suivent */
  const ecart = (l, c0) => Math.max(0, ...l.map(x => Math.max(Math.hypot(x.cx - x.px - (c0.cx - c0.px), x.cy - x.py - (c0.cy - c0.py)), x.sh)));
  /* témoin : le même écart sur les 30 images d'avant le coup (suivi qui se pose encore, secousse résiduelle) */
  const temoin = base.length > 1 ? ecart(base.slice(1), base[0]) : 0;
  const brut = ecart(apres.slice(0, 30), base[base.length - 1] || apres[0]);
  return { tue, imagesBrasier: best, brasierMax: Math.max(...apres.map(x => x.br)), camera: Math.max(0, brut - temoin), brut, temoin };
}

export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });
  const { s: S } = await seuils(s, 'R12');
  if (!await exiger(s, res, 'destruction', ['N.ennemis.hit', 'N.ennemis.list', 'N.ennemis.spawn', 'N.cam.x', 'N.gfx.present', 'N.game.dbg.god'])) return;
  const juger = (nom, r) => {
    if (!r.tue.tues) return res.nonMesurable(nom, 'la cible n’a pas été détruite par N.ennemis.hit (' + JSON.stringify(r.tue) + ')');
    res.verifie(`${nom} : images à plus de ${S.brasier * 100} % de brasier (suite la plus longue)`, r.imagesBrasier, '≥ ' + S.images, r.imagesBrasier >= S.images, { brasierMax: r.brasierMax });
    res.verifie(`${nom} : mouvement de caméra imputable au coup (px)`, r.camera, '≥ ' + S.camera, r.camera >= S.camera, { brut: r.brut, temoin: r.temoin });
  };
  const b = await s.scene('boss3');
  if (!b.ok) res.nonMesurable('CYCLOPE', b.raison);
  else { await s.eval(() => window.__MESURE.dbg().god(true)); juger('mort du CYCLOPE', await exploser(s, { boss: true })); res.capture(await s.capture('R-12-cyclope')); }
  for (const [elite, type] of Object.entries(ELITES)) {
    const v = await s.scene('v5');
    if (!v.ok) { res.nonMesurable(`élite ${elite}`, v.raison); continue; }
    await s.eval(() => window.__MESURE.dbg().god(true));
    const id = await s.eval(o => {
      const N = window.__N, p = window.__S.player, x = p.x + Math.cos(p.ang) * 70, y = p.y + Math.sin(p.ang) * 70;
      try { const e = N.ennemis.spawn(o.type, x, y, { elite: o.elite, direct: true }); return e && e.id !== undefined ? e.id : null; } catch (x) { return null; }
    }, { type, elite });
    if (id === null) { res.nonMesurable(`élite ${elite}`, 'N.ennemis.spawn(\'' + type + '\', x, y, {elite:\'' + elite + '\'}) n’a rien rendu'); continue; }
    await s.images(30);
    juger(`mort de l’élite ${elite}`, await exploser(s, { id }));
  }
}
if (principal(import.meta.url)) executer({ meta, mesurer });
