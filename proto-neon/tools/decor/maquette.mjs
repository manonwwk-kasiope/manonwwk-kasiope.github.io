/* SNAKE 2975 — maquette composée des plans de parallaxe, et mesure de la lumière.
   C'est aussi l'implémentation de référence que 15-decor.js peut transcrire : même ordre de dessin,
   mêmes facteurs, même sol ligne par ligne (REFONTE.md § 3.4, 3.5, 3.6, 5.2).
   Usage : node proto-neon/tools/decor/maquette.mjs [--x 3] [--q docks] [--etat calme]
   Écrit tools/decor/out/*.png (captures agrandies, non versionnées) et affiche les mesures. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I, T, L, Img, dither, lirePNG, ecrireCapture, VIF, INTERDITS } from './commun.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DEC = path.resolve(ICI, '..', '..', 'art', 'decor');
const M = JSON.parse(fs.readFileSync(path.join(DEC, 'decor.json'), 'utf8'));
const cache = {};
export const png = nom => cache[nom] || (cache[nom] = lirePNG(path.join(DEC, nom + '.png')));
const { vide, nuit, ardoise, violet, indigo, ambre, jaune, brasier, os, sang, nuitProfonde } = I;
const MONDE = { w: 1024, h: 512 };
const TEMPS = 60 / 144.6;                      // un temps de « Neon Velocity »
const mod = (a, n) => ((a % n) + n) % n;

/* codes de propriété pour les mesures (comme N.gfx.owner) */
export const CODE = { ciel: 1, etoiles: 2, soleil: 3, montagnes: 4, cite: 5, brume: 6, sol: 7, structures: 8, plateau: 9, avant: 10 };

/* ------------------------------------------------------------------------------------------------
   composer : rend une image d'index W × H du décor seul.
   o = { q, etat, W, H, cx, cy, t, plateau (bool), eteintes (0..1 : part des rangées de fenêtres éteintes) }
   ------------------------------------------------------------------------------------------------ */
export function composer(o) {
  const { W, H } = o, Q = M.quartiers[o.q], E = M.etats[o.etat || 'calme'], t = o.t || 0;
  const img = new Img(W, H, vide), own = new Uint8Array(W * H);
  const lut = new Uint8Array(17).map((_, i) => i); for (const [k, v] of Object.entries(Q.lut || {})) lut[+k] = v;
  const put = (x, y, c, code) => { if (c === T || x < 0 || y < 0 || x >= W || y >= H) return; img.d[y * W + x] = c; own[y * W + x] = code; };
  const portrait = H > W;
  const c = Math.max(0, Math.min(1, o.cy / (MONDE.h - H)));
  const yh = Math.floor(H * (portrait ? 0.62 - 0.20 * c : 0.80 - 0.42 * c));
  const cxMid = (MONDE.w - W) / 2, temps = t / TEMPS;

  /* P0 ciel : bande de 64 px bouclée, dernière rangée sur l'horizon */
  const ciel = png(E.ciel || Q.ciel);
  for (let y = 0; y < yh; y++) { const sy = Math.max(0, ciel.h - (yh - y)); for (let x = 0; x < W; x++) put(x, y, lut[ciel.d[sy * ciel.w + (x & 63)]], CODE.ciel); }

  /* P1 étoiles : deux phases qui échangent os et acier à chaque demi-temps */
  const et = png('etoiles'), ph = Math.floor(temps * 2) & 1, ox1 = -Math.round(0.03 * (o.cx - cxMid)), oy1 = -Math.round(0.05 * o.cy * 0.2);
  const vl = png('voie-lactee');
  for (let y = 0; y < vl.h && y < yh - 20; y++) for (let x = 0; x < W; x++) { const v = vl.getw(x - ox1, y - oy1); if (v !== T && (img.get(x, y) === vide || img.get(x, y) === nuit || img.get(x, y) === indigo)) put(x, y, v, CODE.etoiles); }
  for (let k = 0; k < (Q.etoiles || 1); k++) for (let y = 0; y < et.h; y++) for (let x = 0; x < W; x++) {
    let v = et.getw(x - ox1 + k * 211, y - oy1 - k * 37); if (v === T) continue; const yy = y + k * 37;
    if (yy >= yh - 24) continue; if (ph) v = v === I.os ? I.acier : (v === I.acier && et.getw(x - ox1 + k * 211 - 1, y - oy1 - k * 37) === T && et.getw(x - ox1 + k * 211 + 1, y - oy1 - k * 37) === T ? I.os : v);
    if (img.get(x, yy) === vide || img.get(x, yy) === nuit) put(x, yy, v, CODE.etoiles);
  }

  /* P2 : halo, soleil, silhouette lointaine du CYCLOPE, montagnes. Bande de 512 px centrée sous le soleil */
  const D = portrait ? 64 : 80, bandX = Math.round(W / 2 - 256 - 0.08 * (o.cx - cxMid));
  const variante = E.soleil || Q.soleil.variante;
  const baisse = E.soleilBaisse === 99 ? Q.soleil.haut - Math.round(D * 0.22) : (E.soleilBaisse || 0);
  const sx = bandX + 256, sy = yh - Math.round(Q.soleil.haut * D / 80) + baisse;
  const hal = png(`halo${variante === 'eclipse' ? '-eclipse' : ''}-${D}`);
  for (let y = 0; y < hal.h; y++) for (let x = 0; x < hal.w; x++) { const v = hal.d[y * hal.w + x]; const X = sx - (hal.w >> 1) + x, Y = sy - (hal.h >> 1) + y; if (v !== T && Y < yh) put(X, Y, lut[v], CODE.ciel); }
  const sol = png(`soleil-${variante}-${D}`), fr = Math.floor(t / (8 * TEMPS)) % 8;
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) { const v = sol.d[y * sol.w + fr * D + x]; const X = sx - D / 2 + x, Y = sy - D / 2 + y; if (v !== T && Y < yh) put(X, Y, v, CODE.soleil); }
  if (Q.colosseLoin) { const cl = png('colosse-loin'); for (let y = 0; y < cl.h; y++) for (let x = 0; x < cl.w; x++) { const v = cl.d[y * cl.w + x]; if (v !== T) put(sx - (cl.w >> 1) + x + 6, yh - cl.h + y, v, CODE.montagnes); } }
  const mt = png('montagnes');
  for (let y = 0; y < mt.h; y++) for (let x = 0; x < mt.w; x++) { const v = mt.d[y * mt.w + x]; if (v !== T) put(bandX + x, yh - mt.h + y, lut[v], CODE.montagnes); }

  /* P3 cité lointaine (sauf LE CIEL, posé sous l'horizon après le sol) */
  const ox3 = -Math.round(0.20 * (o.cx - cxMid)) + Math.round(W / 2) - 150;   // x = 150 de la cité au centre ; la tour (x = 0) à gauche du soleil
  const tempoEns = (Q.enseignes?.tempo ?? 1) * (E.enseignes ?? 1), n = Math.floor(temps * tempoEns);
  const CY = M.cycleEnseignes, phase = v => CY.indexOf(v);
  const dessineCite = (y0) => {
    const b = png(Q.cite), f = png(Q.cite + '-fenetres'), e = png(Q.cite + '-enseignes');
    const coupe = Math.round((o.eteintes || 0) * b.h);
    for (let y = 0; y < b.h; y++) { const Y = y0 + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < W; x++) {
      const sxx = x - ox3, v = b.getw(sxx, y); if (v === T) continue; put(x, Y, lut[v], CODE.cite);
      const fv = f.getw(sxx, y); if (fv !== T && y >= coupe) put(x, Y, fv, CODE.cite);
      const ev = e.getw(sxx, y); if (ev !== T && (E.enseignes ?? 1) > 0) put(x, Y, CY[(phase(ev) + n) & 3], CODE.cite);
    } }
  };
  if (o.q !== 'ciel') dessineCite(yh - png(Q.cite).h);

  /* P4 brume */
  const br = png('brume'), ox4 = -Math.round(0.35 * (o.cx - cxMid) + 4 * t);
  for (let y = 0; y < br.h; y++) for (let x = 0; x < W; x++) { const v = br.getw(x - ox4, y); if (v !== T) put(x, yh + 4 - br.h + y, v, CODE.brume); }

  /* SOL ligne par ligne (§ 3.5) : K = 900, Z0 tel que le bas de l'écran suive le plateau (facteur 1) */
  const K = 900, dyMax = H - yh, Z0 = K / dyMax, xf = sx, av = 24 * temps * (E.sol?.cases ?? 1);
  const reflet = E.sol?.reflet || Q.sol.reflet, grille = Q.sol.grille ?? violet, braise = E.sol?.braiseProche || 0, ep = E.sol?.epaisseur || 1;
  for (let y = yh; y < H; y++) {
    const dy = y - yh;
    if (dy === 0) { for (let x = 0; x < W; x++) put(x, y, dither(x, y, 0.5) ? (Math.abs(x - sx) < D * 0.7 ? jaune : brasier) : sang, CODE.sol); continue; }
    const z = K / dy, dz = K / dy - K / (dy + 1), u = dy / dyMax;
    const fz = mod(z + av, 24), transv = fz < Math.max(dz, 0.35 * ep), arete = fz < dz;   // arete : la rangée où la ligne passe vraiment
    const hw = Math.round(12 + 12 * u), off = Math.round(2 * Math.sin(y * 0.7 + t * 3)), segment = 0.6 + 0.4 * Math.abs(Math.sin(y * 1.37 + Math.floor(t * 2)));
    const ink = reflet[u < 0.15 ? 0 : u < 0.45 ? 1 : 2];
    for (let x = 0; x < W; x++) {
      let v = dy < 6 ? (dither(x, y, 0.5) ? indigo : nuit) : (dither(x, y, 0.25) ? vide : nuit);
      const dcx = Math.abs(x - sx);
      /* le sol reflète l'horizon embrasé, puis le soleil en un cône tramé à 12 % au plus */
      if (dy < 20 && dither(x, y, dy < 3 ? 0.5 : 0.25 * (1 - (dy - 3) / 17))) v = dcx < D ? ambre : brasier;
      else { const cone = 36 + u * W * 0.45, k = 1 - dcx / cone; if (u > 0.1 && k > 0) { if (dither(x, y, 0.25 * k) && k > 0.55) v = brasier; else if (dither(x + 2, y, 0.5 * k)) v = sang; } }
      /* la grille : lignes pleines d'un pixel, éclairées près du soleil, tramées vers l'horizon */
      const uu = o.cx + (x - xf) * z / Z0, longi = mod(uu, 32) < Math.max(1.05 * ep, z / Z0);
      if (longi || transv) {
        const plein = (longi && z / Z0 < 1.6) || (transv && arete);
        let g = u > 0.35 ? grille : indigo;
        const ecl = 1 - dcx / (W * 0.55);                                               // éclairage du soleil : 1 au centre, 0 à 42 % de la largeur
        if (ecl > 0 && (ecl > 0.3 || dither(x, y, ecl / 0.3 * 0.5))) g = dcx < hw * 1.5 ? ambre : brasier;
        else if (braise && u > 0.6 && dither(x, y, braise * 2)) g = brasier;            // état montee et plus : lignes proches en brasier
        if (u < 0.12 || !plein) { if (dither(x, y, 0.5)) v = g; } else v = g;
      }
      const dx = x - sx - off;
      if (Math.abs(dx) < hw * segment && dither(x, y, 0.5) && (y + Math.floor(t * 4)) % 4 !== 0) v = ink;
      put(x, y, lut[v], CODE.sol);
    }
  }
  /* eau-miroir des docks : les fenêtres se reflètent, tramées à 25 % */
  if (Q.sol.eau) { const f = png(Q.cite + '-fenetres'), b = png(Q.cite); for (let dy = 1; dy < 16 && yh + dy < H; dy++) for (let x = 0; x < W; x++) { const v = f.getw(x - ox3 + Math.round(Math.sin(dy + t * 2)), b.h - dy); if (v !== T && dither(x, yh + dy, 0.5)) put(x, yh + dy, ambre, CODE.sol); } }
  if (o.q === 'ciel') dessineCite(yh + 1);

  /* P5 structures : rangée du quartier, période 768, base à 30 % de la hauteur du sol */
  const ox5 = -Math.round(0.60 * (o.cx - cxMid)), yb = yh + Math.round(0.30 * dyMax);
  if (o.q === 'ciel') { const nu = png('nuages-ciel'); const y0 = Math.round(yh * 0.38); for (let y = 0; y < nu.h; y++) for (let x = 0; x < W; x++) { const v = nu.getw(x - ox5, y); if (v !== T) put(x, y0 + y, v, CODE.structures); } }
  else if (Q.rangee) {
    const pl = png(Q.structures), tu = M.tuiles[o.q], beat = Math.floor(temps);
    for (let rep = -1; rep <= Math.ceil(W / 768) + 1; rep++) for (const p of Q.rangee.poses) {
      const d = tu.find(z => z.nom === p.tuile), X0 = rep * 768 + p.x + ox5, Y0 = yb - 63; if (X0 > W || X0 + d.w < 0) continue;
      for (let y = 0; y < 64; y++) for (let x = 0; x < d.w; x++) { const v = pl.d[y * pl.w + d.x + x]; if (v !== T) put(X0 + x, Y0 + y, v, CODE.structures); }
      for (const [bx, by, k] of d.balises) put(X0 + bx, Y0 + by, k === 'sang' ? M.cycleBalises[mod(beat + bx, 3)] : (beat & 1 ? ambre : sang), CODE.structures);
      for (const [fx, fy] of d.flammes) { const fl = png('flammes'), fk = Math.floor(temps * 2) & 3; for (let y = 0; y < fl.h; y++) for (let x = 0; x < 8; x++) { const v = fl.d[y * fl.w + fk * 8 + x]; if (v !== T) put(X0 + fx - 4 + x, Y0 + fy - fl.h + y, v, CODE.structures); } }
      for (const [px, py] of d.projecteurs) { const a = -Math.PI / 2 + 0.55 * Math.sin(2 * Math.PI * 0.2 * t + px + p.x); for (let r = 4; r < 160; r++) for (let w = -Math.floor(r * 0.1); w <= Math.floor(r * 0.1); w++) { const X = Math.round(X0 + px + Math.cos(a) * r - Math.sin(a) * w), Y = Math.round(Y0 + py + Math.sin(a) * r + Math.cos(a) * w); if (Y < yh && Y >= 0 && dither(X, Y, 0.12)) put(X, Y, os, CODE.structures); } }
    }
    if (Q.colosseMi) { const cm = png('colosse-mi'); const X0 = Math.round(W * 0.62) + ox5; for (let y = 0; y < cm.h; y++) for (let x = 0; x < cm.w; x++) { const v = cm.d[y * cm.w + x]; if (v !== T) put(X0 + x, yb - cm.h + y, v, CODE.structures); } }
  }

  /* PLATEAU (repère seulement) : points indigo tous les 16 px, lignes violet tramé à 25 % */
  if (o.plateau !== false) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + Math.round(o.cx), wy = y + Math.round(o.cy);
    if ((wx & 15) === 0 && (wy & 15) === 0) put(x, y, indigo, CODE.plateau);
    else if (((wx & 15) === 0 || (wy & 15) === 0) && dither(x, y, 0.25) && L[img.get(x, y)] < 0.03) put(x, y, violet, CODE.plateau);
  }

  /* P6 premier plan, dans les 12 % du haut et du bas */
  const ah = png('avant-haut'), ab = png('avant-bas'), ox6 = -Math.round(1.4 * o.cx);
  for (let y = 0; y < ah.h; y++) for (let x = 0; x < W; x++) { const v = ah.getw(x - ox6, y); if (v !== T) put(x, y, v, CODE.avant); const w = ab.getw(x - ox6, y); if (w !== T) put(x, H - ab.h + y, w, CODE.avant); }
  if (E.braises) for (let k = 0; k < 24; k++) { const X = mod(k * 97 + Math.round(t * 9 * (1 + (k % 3))), W), Y = mod(k * 53 + Math.round(t * 40 * (1 + (k % 2))), H); put(X, Y, brasier, CODE.avant); }

  return { img, own, yh, soleil: { x: sx, y: sy, r: D / 2 } };
}

/* ---- mesures sur le tampon (REFONTE § 5.2, critères du lot 2) ---- */
export function mesurer(r) {
  const { img, soleil } = r, n = img.w * img.h; let lum = 0, Ls = 0, vid = 0, cyan = 0, mag = 0;
  for (let i = 0; i < n; i++) { const v = img.d[i]; if (L[v] > 0.10) lum++; Ls += L[v]; if (v === vide) vid++; if (v === I.cyan || v === I.cyanPale) cyan++; if (v === I.magenta || v === I.rosePale) mag++; }
  let blocs = 0;
  for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
    if (Math.hypot(x - soleil.x, y - soleil.y) <= soleil.r + 2) continue;
    let plein = true; for (let j = -1; j <= 1 && plein; j++) for (let i = -1; i <= 1; i++) if (!VIF.has(img.get(x + i, y + j))) { plein = false; break; }
    if (plein) blocs++;
  }
  return { lumineux: lum / n, luminance: Ls / n, vide: vid / n, cyan, magenta: mag, blocs3x3: blocs };
}

/* ---- programme ---- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const X = +(arg('x') || 3), OUT = path.join(ICI, 'out'); fs.mkdirSync(OUT, { recursive: true });
  const ORIENT = { paysage: [422, 195], portrait: [195, 422], bureau: [360, 225] };
  const quartiers = arg('q') ? [arg('q')] : Object.keys(M.quartiers);
  const etats = arg('etat') ? [arg('etat')] : ['calme'];
  const lignes = [];
  let pire = 1;
  for (const q of quartiers) for (const etat of etats) for (const [or, [W, H]] of Object.entries(ORIENT)) {
    const r = composer({ q, etat, W, H, cx: (MONDE.w - W) / 2 + 40, cy: (MONDE.h - H) / 2, t: 1.0, eteintes: etat === 'colosse' ? 0.5 : 0 });
    const m = mesurer(r); if (or === 'paysage' && etat === 'calme') pire = Math.min(pire, m.lumineux);
    lignes.push(`${q.padEnd(9)} ${etat.padEnd(9)} ${or.padEnd(8)} lumineux ${(m.lumineux * 100).toFixed(1).padStart(5)} %  luminance ${m.luminance.toFixed(3)}  vide ${(m.vide * 100).toFixed(1).padStart(4)} %  cyan ${m.cyan}  magenta ${m.magenta}  blocs3x3 ${m.blocs3x3}`);
    ecrireCapture(path.join(OUT, `${q}-${etat}-${or}.png`), r.img, X);
  }
  console.log(lignes.join('\n'));
  /* planche : les sept quartiers en calme, paysage, l'un sous l'autre */
  if (!arg('q')) {
    const W = 422, H = 195, qs = Object.keys(M.quartiers), pl = new Img(W * 2 + 4, Math.ceil(qs.length / 2) * (H + 4), nuitProfonde);
    qs.forEach((q, k) => { const r = composer({ q, etat: etats[0], W, H, cx: (MONDE.w - W) / 2 + 40, cy: (MONDE.h - H) / 2, t: 1.0, eteintes: 0 }); pl.blit(r.img, (k & 1) * (W + 4), (k >> 1) * (H + 4)); });
    ecrireCapture(path.join(OUT, `planche-${etats[0]}.png`), pl, 2);
  }
}
