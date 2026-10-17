/* Essais de N.world et N.cam en Node pur (vm) : tête dans le cadre, trajet visible devant, caméra qui ne recule pas,
   TRAVELLING (vitesse, annonce, arrêt au bord du monde). Usage : node proto-neon/tools/B/cam.mjs */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src') + path.sep;
function charger(W, H) {
  const ctx = { console, Math, Object, Uint8Array, Float32Array, Uint32Array, Int16Array, ArrayBuffer };
  ctx.globalThis = ctx; ctx.__N = { gfx: { W, H }, S: { input: { x: 0, y: 0, mag: 0, boost: false } } };
  vm.createContext(ctx);
  for (const f of ['02-regles.js', '12-cam.js']) vm.runInContext(fs.readFileSync(SRC + f, 'utf8'), ctx, { filename: f });
  return ctx.__N;
}
function parcours(t, v) {
  const m = 9, per = 2 * (1024 - 2 * m) + 2 * (512 - 2 * m); let s = (t * v) % per;
  if (s < 1024 - 2 * m) return { x: m + s, y: m, ang: 0 };
  s -= 1024 - 2 * m; if (s < 512 - 2 * m) return { x: 1024 - m, y: m + s, ang: Math.PI / 2 };
  s -= 512 - 2 * m; if (s < 1024 - 2 * m) return { x: 1024 - m - s, y: 512 - m, ang: Math.PI };
  s -= 1024 - 2 * m; return { x: m, y: 512 - m - s, ang: -Math.PI / 2 };
}
function essai(W, H, v, boost, secondes) {
  const N = charger(W, H); const head = { x: 100, y: 9, ang: 0, vit: v }; N.cam.suit(head); N.S.input.boost = boost; N.cam.reset(100, 9);
  const dt = 1 / 120, n = Math.round(secondes / dt);
  let hors = 0, horsNonBorne = 0, nonBorne = 0, devMal = 0, devMax = 1e9, mur = 0, prev = null, recul = 0;
  const portrait = H > W;
  for (let i = 0; i < n; i++) {
    const p = parcours(i * dt, v); head.x = p.x; head.y = p.y; head.ang = p.ang; head.vit = v;
    N.cam.update(dt);
    const c = N.cam, b = c.bornes();
    const fx = (head.x - c.x) / c.w, fy = (head.y - c.y) / c.h;
    const maxY = portrait ? 0.72 : 0.85;
    const bornX = (c.x <= Math.ceil(b.x0) + 1 || c.x >= Math.floor(b.x1) - 1), bornY = (c.y <= Math.ceil(b.y0) + 1 || c.y >= Math.floor(b.y1) - 1);
    const okX = fx >= 0.15 - 1e-3 && fx <= 0.85 + 1e-3, okY = fy >= 0.15 - 1e-3 && fy <= maxY + 1e-3;
    if (!(okX && okY)) hors++;
    if (!bornX && !bornY) { nonBorne++; if (!(okX && okY)) horsNonBorne++; }
    // devant : distance au mur dans le sens du cap
    const dx = Math.cos(head.ang), dy = Math.sin(head.ang);
    let dm = Infinity;
    if (dx > 0.5) dm = 1024 - head.x; else if (dx < -0.5) dm = head.x; else if (dy > 0.5) dm = 512 - head.y; else dm = head.y;
    const need = Math.min((boost ? 0.8 : 1.2) * v, dm + 16), dev = c.devant();
    if (dev < need - 1) { devMal++; if (need - dev > mur) mur = need - dev; }
    // monotonie : la caméra arrondie ne recule pas quand elle avance dans le même sens (sur x, tête qui va à droite)
    if (prev && dx > 0.5 && c.x < prev.x) recul++;
    prev = { x: c.x, y: c.y };
  }
  return { W, H, v, boost, images: n, tetehorscadre: hors, horsHorsBornes: horsNonBorne, nonBorne, devantInsuffisant: devMal, pireManque: +mur.toFixed(1), reculsX: recul };
}
for (const [W, H] of [[422, 195], [195, 422], [360, 225]]) {
  console.log(JSON.stringify(essai(W, H, 68, false, 48)));
  console.log(JSON.stringify(essai(W, H, 109, true, 30)));
}

/* le TRAVELLING : 576 px de large, 12 px/s, part de la gauche ; positions annoncées dès le premier instant ; arrêt au bord */
{
  const N = charger(422, 195), Wd = N.world; let ann0 = null, vx = [], x0prev = null, arret = null;
  Wd.travelling({ largeur: 576, vx: 12 });
  ann0 = JSON.stringify(Wd.mursAnnonces());
  const dt = 1 / 120; let t = 0, depart = null;
  for (let i = 0; i < 120 * 90; i++) {
    N.cam.update(dt); t += dt;
    if (Wd.voyage().actif && depart === null) { depart = { t, x: Wd.x0 }; }
    if (depart !== null && Wd.voyage().actif && x0prev !== null && !arret) vx.push((Wd.x0 - x0prev) / dt);
    if (depart !== null && !Wd.voyage().actif && arret === null && vx.length) arret = { t, x0: Wd.x0, x1: Wd.x1 };
    x0prev = Wd.x0;
  }
  const moy = vx.reduce((a, b) => a + b, 0) / vx.length;
  console.log(JSON.stringify({ travelling: { annonceDesLePremierInstant: ann0, miseEnPlaceS: +depart.t.toFixed(2), vitesseMoyenne: +moy.toFixed(3), ecartVitessePct: +(Math.abs(moy - 12) / 12 * 100).toFixed(2), arret } }));
}
