/* SNAKE 2975 — fabrique des plans de parallaxe (REFONTE.md § 3.4 à 3.6, lot 2).
   Usage : /opt/node22/bin/node proto-neon/tools/decor/genere.mjs
   Écrit proto-neon/art/decor/*.png (PNG indexés : index 0..15 = palette du jeu, 16 = transparent)
   et proto-neon/art/decor/decor.json (le manifeste que 15-decor.js lit). Rejouable : graine fixe 2975.
   Contrôles à la fin : palette, zéro cyan, zéro magenta ni rose pâle, aucun bloc 3 × 3 plein de couleur vive
   hors du disque du soleil, quartiers distincts (intersection sur union des masques de cité < 0,5). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { I, T, Img, rng, dither, ecrirePNG, lirePNG, garde3x3, compte3x3, INTERDITS, VIF } from './commun.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(ICI, '..', '..');
const ART = path.join(PROTO, 'art');
const OUT = path.join(ART, 'decor');
fs.mkdirSync(OUT, { recursive: true });

const { vide, nuit, ardoise, violet, indigo, ambre, jaune, brasier, os, acier, sang, nuitProfonde } = I;
const GRAINE = 2975;
const fichiers = {};            // nom -> {w, h, ...} pour le manifeste
const aControler = [];          // [nom, img, exempt3x3]
function sauve(nom, img, meta = {}, exempt = null) {
  ecrirePNG(path.join(OUT, nom + '.png'), img);
  fichiers[nom] = Object.assign({ fichier: nom + '.png', w: img.w, h: img.h }, meta);
  aControler.push([nom, img, exempt]);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lisse = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* =====================================================================================================
   P0 — LE CIEL. Bande de 64 × 256 qui se répète en x (multiple de 4 : le Bayer boucle). La DERNIÈRE rangée
   touche l'horizon ; au-dessus de la rangée 0, on prolonge avec la rangée 0. d = distance à l'horizon.
   ===================================================================================================== */
const CIEL_H = 256, CIEL_W = 64;
function ciel(p) {
  const img = new Img(CIEL_W, CIEL_H, nuit);
  for (let r = 0; r < CIEL_H; r++) {
    const d = CIEL_H - 1 - r;
    for (let x = 0; x < CIEL_W; x++) {
      let c = nuit;
      /* zénith : vide tramé sur la nuit (au plus 50 % de vide) */
      if (d > p.zenith) { if (dither(x, r, 0.5 * lisse(p.zenith, p.zenith + 70, d))) c = vide; }
      /* voile du milieu (indigo, ou sang au chaos) */
      const tm = p.voile * (1 - lisse(p.voileH * 0.35, p.voileH, d)) * lisse(p.bande, p.bande + 18, d);
      if (dither(x + 1, r + 2, tm)) c = p.voileEncre;
      /* montée vers l'horizon : sang tramé, plein juste au-dessus de la bande */
      const ts = 1 - lisse(p.bande, p.bande + p.sangH, d);
      if (dither(x, r, ts)) c = sang;
      /* bande d'horizon embrasée : brasier tramé de 25 à 50 % (REFONTE § 3.4, P0) */
      if (d < p.bande) {
        c = sang;
        const tb = p.bas0 + (p.bas1 - p.bas0) * (1 - d / p.bande);
        if (dither(x, r, tb)) c = p.braise;
        if (p.eclat && d < 4 && dither(x, r, p.eclat)) c = p.eclatEncre;
      } else if (p.lueur && d < p.bande + (p.lueurH ?? 48) && dither(x, r, p.lueur * (1 - (d - p.bande) / (p.lueurH ?? 48)))) c = p.braise;
      /* étoffe propre à l'état (sang tramé sur tout le ciel du colosse) */
      if (p.voileTotal && d >= p.bande && dither(x + 2, r + 1, p.voileTotal)) c = sang;
      img.d[r * CIEL_W + x] = c;
    }
  }
  return img;
}
const CIELS = {
  calme:     { zenith: 150, voile: 0.5, voileH: 120, voileEncre: indigo, bande: 44, sangH: 30, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.38, eclat: 0.19, eclatEncre: ambre },
  montee:    { zenith: 160, voile: 0.5, voileH: 130, voileEncre: indigo, bande: 52, sangH: 34, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.44, eclat: 0.25, eclatEncre: ambre, lueurH: 56 },
  chaos:     { zenith: 170, voile: 0.5, voileH: 160, voileEncre: sang, bande: 60, sangH: 40, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.44, eclat: 0.25, eclatEncre: ambre, lueurH: 60 },
  inversion: { zenith: 190, voile: 0.75, voileH: 150, voileEncre: violet, bande: 50, sangH: 26, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.44, eclat: 0.25, eclatEncre: jaune },
  colosse:   { zenith: 200, voile: 0.25, voileH: 120, voileEncre: indigo, bande: 48, sangH: 34, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.44, voileTotal: 0.25, lueurH: 56 },
  victoire:  { zenith: 150, voile: 0.5, voileH: 110, voileEncre: indigo, bande: 46, sangH: 22, bas0: 0.31, bas1: 0.5, braise: ambre, lueur: 0.38, eclat: 0.25, eclatEncre: jaune },
  /* ciels propres à un quartier (son état calme) */
  docks:     { zenith: 140, voile: 0.5, voileH: 110, voileEncre: indigo, bande: 44, sangH: 24, bas0: 0.31, bas1: 0.5, braise: ambre, lueur: 0.32, eclat: 0.25, eclatEncre: jaune },
  centrale:  { zenith: 170, voile: 0.25, voileH: 100, voileEncre: indigo, bande: 48, sangH: 40, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.32, eclat: 0.25, eclatEncre: ambre },
  ciel:      { zenith: 120, voile: 0.75, voileH: 130, voileEncre: indigo, bande: 40, sangH: 20, bas0: 0.31, bas1: 0.5, braise: ambre, lueur: 0.38},
  tours:     { zenith: 160, voile: 0.5, voileH: 140, voileEncre: sang, bande: 54, sangH: 44, bas0: 0.31, bas1: 0.5, braise: ambre, lueur: 0.38, eclat: 0.19, eclatEncre: jaune },
  coeur:     { zenith: 180, voile: 0.5, voileH: 160, voileEncre: sang, bande: 54, sangH: 48, bas0: 0.31, bas1: 0.5, braise: brasier, lueur: 0.44, eclat: 0.25, eclatEncre: ambre },
};
for (const [nom, p] of Object.entries(CIELS)) sauve('ciel-' + nom, ciel(p), { plan: 'P0', boucleX: CIEL_W, ancre: 'bas sur la rangée au-dessus de l horizon ; prolonger la rangée 0 vers le haut' });

/* =====================================================================================================
   P1 — LES ÉTOILES : 60 points à graine dans un champ de 512 × 160 (y = 0 en haut du ciel).
   Encre = phase : acier = phase A, os = phase B. Le scintillement échange os et acier à chaque demi-temps.
   ===================================================================================================== */
{
  const R = rng(GRAINE + 1), img = new Img(512, 160), pts = [];
  for (let k = 0; k < 60; k++) {
    const x = R.int(0, 511), y = Math.floor(Math.pow(R(), 1.4) * 150) + 2, ph = k & 1, encre = ph ? os : acier;
    const croix = k % 9 === 0;
    img.setw(x, y, encre);
    if (croix) { img.setw(x - 1, y, acier); img.setw(x + 1, y, acier); img.set(x, y - 1, acier); img.set(x, y + 1, acier); }
    pts.push([x, y, ph, croix ? 1 : 0]);
  }
  sauve('etoiles', img, { plan: 'P1', boucleX: 512, points: pts, note: '[x, y, phase, croix] ; phase 0 = acier, 1 = os ; échanger os <-> acier à chaque demi-temps' });
}

/* P1 — LA VOIE LACTÉE, comme dans horizon.png : une écharpe diagonale de poussière en acier tramé (12 % au plus),
   nuit et indigo autour ; 512 × 160, même champ que les étoiles, immobile (elle ne scintille pas). */
{
  const W = 512, H = 160, img = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const axe = 132 - x * 0.22 + 10 * Math.sin(x / 40), d = Math.abs(y - axe), g = Math.exp(-(d * d) / (2 * 15 * 15));
    const grain = 0.5 + 0.5 * Math.sin(x * 0.31 + y * 0.17) * Math.sin(x * 0.07 - y * 0.23);
    const t = g * (0.6 + 0.4 * grain);
    if (dither(x, y, 0.16 * t)) img.put(x, y, acier);
    else if (dither(x + 2, y + 2, 0.5 * t)) img.put(x, y, indigo);
  }
  sauve('voie-lactee', img, { plan: 'P1', boucleX: W, note: 'même champ et même facteur que les étoiles ; dessinée avant elles' });
}

/* =====================================================================================================
   P2 — LE SOLEIL en bandes. Planche de 8 images côte à côte : l'image k décale les rayures de nuit de k rangées
   (une rangée toutes les 2 mesures). Diamètres 80 (paysage, bureau) et 64 (portrait).
   Jaune en haut, ambre au milieu, brasier en bas (REFONTE § 3.4). Variantes d'état.
   ===================================================================================================== */
const VAR_SOLEIL = {
  plein:     { bandes: [[0, jaune], [0.36, ambre], [0.66, brasier]], rayures: 0.48, gmax: 2.8 },
  chaos:     { bandes: [[0, brasier], [0.5, sang]], rayures: 0.30, gmax: 4.2, mixHaut: ambre },
  inversion: { bandes: [[0, os], [0.26, jaune], [0.6, ambre]], rayures: 0.48, gmax: 3 },
  victoire:  { bandes: [[0, jaune], [0.72, ambre]], rayures: 0.6, gmax: 1.5 },
};
function soleil(D, v, k) {
  const img = new Img(D, D), R = D / 2;
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - R, dy = y + 0.5 - R; if (dx * dx + dy * dy > R * R) continue;
    const t = y / (D - 1);
    let c = v.bandes[0][1];
    for (let b = 1; b < v.bandes.length; b++) {
      const [s, enc] = v.bandes[b];
      if (t >= s + 0.05) c = enc;
      else if (t >= s - 0.05 && dither(x, y, (t - (s - 0.05)) / 0.1)) c = enc;
    }
    if (v.mixHaut && t < 0.3 && dither(x + 1, y, 0.5 * (1 - t / 0.3))) c = v.mixHaut;
    /* rayures de nuit, de plus en plus épaisses vers le bas, qui glissent d'une rangée par image */
    if (t > v.rayures) {
      const g = Math.floor(1 + (t - v.rayures) / (1 - v.rayures) * v.gmax);
      if (((y - k) % 8 + 8) % 8 < g) c = nuit;
    }
    img.d[y * D + x] = c;
  }
  return img;
}
function eclipse(D, k) {
  const img = new Img(D, D), R = D / 2, Rk = rng(GRAINE + 30 + k);
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - R, dy = y + 0.5 - R, r = Math.hypot(dx, dy); if (r > R) continue;
    let c = nuitProfonde;
    if (r > R - 2) c = brasier;
    else if (r > R - 5) { c = dither(x, y, 0.5) ? jaune : brasier; }
    else if (r > R - 8) { c = dither(x, y, 0.5) ? brasier : sang; }
    else if (r > R - 11 && dither(x, y, 0.25)) c = sang;
    else if (r > R - 5 && dither(x + 1, y, 0.25)) c = sang;
    if (r > R - 5 && c !== sang && Rk() < 0.35) c = c === jaune ? brasier : jaune;           // la couronne crépite d'une image à l'autre
    img.d[y * D + x] = c;
  }
  return img;
}
function planche(D, fn) { const p = new Img(D * 8, D); for (let k = 0; k < 8; k++) p.blit(fn(k), k * D, 0); return p; }
for (const D of [80, 64]) {
  for (const [nom, v] of Object.entries(VAR_SOLEIL)) sauve(`soleil-${nom}-${D}`, planche(D, k => soleil(D, v, k)), { plan: 'P2', images: 8, imageW: D, diametre: D, note: 'image k = rayures décalées de k rangées ; avancer d une image toutes les 2 mesures' }, () => true);
  sauve(`soleil-eclipse-${D}`, planche(D, k => eclipse(D, k)), { plan: 'P2', images: 8, imageW: D, diametre: D, note: 'disque de nuit profonde cerclé de brasier ; avancer d une image à chaque temps : la couronne crépite' }, () => true);
}
/* halo autour du disque : sang tramé de 50 % à 0, brasier tramé à 25 % au plus près du bord */
function halo(D, fort) {
  const M = 30, S = D + 2 * M, img = new Img(S, S), R = D / 2, C = S / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.hypot(x + 0.5 - C, y + 0.5 - C); if (r <= R - 0.5 || r > R + M) continue;
    const u = (r - R) / M;
    if (u < 0.1 && dither(x, y, fort ? 0.5 : 0.31)) img.put(x, y, fort ? jaune : ambre);
    else if (dither(x, y, (fort ? 0.5 : 0.44) * (1 - u / (fort ? 0.85 : 0.6)))) img.put(x, y, brasier);
    else if (dither(x + 2, y + 1, (fort ? 0.6 : 0.5) * (1 - u))) img.put(x, y, sang);
  }
  return img;
}
for (const D of [80, 64]) { sauve(`halo-${D}`, halo(D, false), { plan: 'P2', marge: 30, note: 'centré sur le disque ; dessiné avant lui' }); sauve(`halo-eclipse-${D}`, halo(D, true), { plan: 'P2', marge: 30 }); }

/* =====================================================================================================
   P2 — LES MONTAGNES, deux chaînes, 512 × 56, bas posé sur l'horizon. Creux au milieu (x ≈ 256) pour le
   soleil, comme dans horizon.png. Lointaine : indigo tramé sur nuit, crête en sang. Proche : nuit, crête indigo,
   flanc tourné vers le soleil liseré de sang.
   ===================================================================================================== */
function crete(R, w, rugo) {
  let n = 1; while (n < w) n <<= 1; const h = new Float32Array(n + 1); h[0] = h[n] = 0;
  for (let pas = n, amp = 1; pas > 1; pas >>= 1, amp *= rugo) for (let i = pas >> 1; i < n; i += pas) h[i] = (h[i - (pas >> 1)] + h[i + (pas >> 1)]) / 2 + (R() * 2 - 1) * amp;
  return h;
}
{
  const W = 512, H = 56, img = new Img(W, H), R = rng(GRAINE + 2);
  const env = (x, a) => { const u = Math.abs(x - 256) / 256; return a * (0.12 + 0.88 * lisse(0.18, 0.62, u)); };
  const loin = crete(R, W, 0.56), pres = crete(R, W, 0.6);
  const hl = x => Math.round(clamp(env(x, 46) * (0.62 + 0.55 * loin[x]), 3, H - 2));
  const hp = x => Math.round(clamp(env((x + 70) % W, 26) * (0.55 + 0.6 * pres[x]), 2, H - 2));
  for (let x = 0; x < W; x++) {
    const a = hl(x), sl = hl(Math.min(W - 1, x + 1)) - hl(Math.max(0, x - 1)), face = (x < 256) ? sl < 0 : sl > 0;
    for (let y = H - a; y < H; y++) { let c = dither(x, y, 0.5) ? indigo : nuit; if (y === H - a) c = sang; else if (face && y < H - a + 4 && dither(x + 1, y, 0.5)) c = sang; img.put(x, y, c); }
  }
  for (let x = 0; x < W; x++) {
    const a = hp(x), sl = hp(Math.min(W - 1, x + 1)) - hp(Math.max(0, x - 1)), face = (x < 256) ? sl < 0 : sl > 0;
    for (let y = H - a; y < H; y++) { let c = dither(x, y, 0.25) ? nuitProfonde : nuit; if (y === H - a) c = face ? sang : indigo; else if (face && y === H - a + 1) c = dither(x, y, 0.5) ? sang : nuit; img.put(x, y, c); }
  }
  sauve('montagnes', img, { plan: 'P2', note: 'bas sur l horizon ; 512 px couvrent sans boucler au facteur 0,08 ; centrer x = 256 sous le soleil' });
}

/* =====================================================================================================
   P3 — LA CITÉ LOINTAINE, une par quartier. 600 × 100, bouclée en x (la tour centrale est à x = 0, sur la
   couture), bas sur l'horizon. Trois images par quartier :
     cite-<q>.png            silhouettes : nuit et ardoise (rang du fond voilé d'indigo), arêtes ardoise ;
     cite-<q>-fenetres.png   fenêtres allumées, ambre et jaune, 1 px (tramé : jamais de bloc plein) ;
     cite-<q>-enseignes.png  enseignes ; l'encre donne la phase du cycle sang -> brasier -> ambre -> jaune.
   ===================================================================================================== */
const CW = 600, CH = 100;
const CYCLE = [sang, brasier, ambre, jaune];
const ext = lirePNG(path.join(ART, 'exterieur.png'));
const aff = lirePNG(path.join(ART, 'affiche.png'));
const bos = lirePNG(path.join(ART, 'boss.png'));

/* remappe une encre d'illustration vers les encres permises du décor (magenta -> brasier, rose pâle -> ambre) */
const LUT_CITE = { [I.magenta]: brasier, [I.rosePale]: ambre, [I.cyan]: ardoise, [I.cyanPale]: acier, [vide]: nuit };
const remap = (c, lut) => (lut[c] !== undefined ? lut[c] : c);

/* La tour centrale d'exterieur.png : profil de toit relevé à la main sur l'illustration (x 146..231, y 8..),
   intérieur copié de l'illustration et remappé. Les pixels vifs vont dans la couche des enseignes. */
const TOUR = { x0: 146, y0: 8, w: 86, h: 100,
  toit: [[0, 40], [10, 34], [26, 14], [36, 5], [45, 1], [48, 5], [59, 10], [67, 26], [75, 36], [86, 36]] };
function toitTour(x) { const t = TOUR.toit; for (let i = 0; i < t.length - 1; i++) if (x >= t[i][0] && x < t[i + 1][0]) return t[i][1]; return t[t.length - 1][1]; }
function tourCentrale(red) {
  const w = Math.floor(TOUR.w / red), h = Math.floor(TOUR.h / red), base = new Img(w, h), ens = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x * red, sy = y * red; if (sy < toitTour(sx)) continue;
    let c = remap(ext.get(TOUR.x0 + sx, TOUR.y0 + sy), LUT_CITE);
    if (c === T) c = nuit;
    if (VIF.has(c)) { ens.put(x, y, c === jaune ? jaune : c === ambre ? ambre : brasier); c = nuit; }
    else if (c === violet) c = indigo;
    base.put(x, y, c);
  }
  /* arêtes du toit en ardoise, pour décoller la tour du ciel */
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (base.get(x, y) !== T) { base.put(x, y, ardoise); break; }
  return { base, ens };
}

class Cite {
  constructor(q) { this.q = q; this.base = new Img(CW, CH); this.fen = new Img(CW, CH); this.ens = new Img(CW, CH); }
  /* un immeuble : x gauche, largeur, hauteur, rang 0 = fond (voilé), 1 = devant */
  immeuble(R, x, w, h, o = {}) {
    const B = this.base, y0 = CH - h, rang = o.rang ?? 1;
    const corps = (xx, yy) => rang === 0 ? (dither(xx, yy, 0.5) ? indigo : nuit) : (dither(xx, yy, 0.12) ? ardoise : nuit);
    if (o.forme === 'pignon') { B.poly([[x, CH], [x, y0 + 4], [x + w / 2, y0], [x + w, y0 + 4], [x + w, CH]], 0, true, corps); }
    else if (o.forme === 'scie') { const n = Math.max(1, Math.round(w / 8)), s = w / n; B.rect(x, y0 + 4, w, h - 4, 0, true); for (let i = 0; i < n; i++) B.poly([[x + i * s, y0 + 4.01], [x + (i + 1) * s, y0], [x + (i + 1) * s, y0 + 4.01]], 0, true); for (let yy = y0; yy < CH; yy++) for (let xx = x; xx < x + w; xx++) if (B.getw(xx, yy) === 0) B.setw(xx, yy, corps(xx, yy)); }
    else if (o.forme === 'gradins') { B.rect(x, y0 + 8, w, h - 8, 0, true); B.rect(x + 2, y0 + 3, w - 4, 6, 0, true); B.rect(x + 4, y0, w - 8, 4, 0, true); for (let yy = y0; yy < CH; yy++) for (let xx = x; xx < x + w; xx++) if (B.getw(xx, yy) === 0) B.setw(xx, yy, corps(xx, yy)); }
    else if (o.forme === 'biseau') { B.poly([[x, CH], [x, y0 + (o.biais > 0 ? 0 : 6)], [x + w, y0 + (o.biais > 0 ? 6 : 0)], [x + w, CH]], 0, true, corps); }
    else if (o.forme === 'ruine') { const pts = [[x, CH]]; let yy = y0; for (let i = 0; i <= w; i += 2) { pts.push([x + i, y0 + R.int(0, 7) + (i > w / 2 ? R.int(0, 6) : 0)]); } pts.push([x + w, CH]); B.poly(pts, 0, true, corps); yy++; }
    else B.rect(x, y0, w, h, 0, true), (() => { for (let yy = y0; yy < CH; yy++) for (let xx = x; xx < x + w; xx++) B.setw(xx, yy, corps(xx, yy)); })();
    /* arête du toit et arête droite en ardoise (rang de devant) */
    if (rang === 1) for (let xx = x; xx < x + w; xx++) for (let yy = 0; yy < CH; yy++) { const c = B.getw(xx, yy); if (c !== T) { B.setw(xx, yy, ardoise); break; } }
    if (o.antenne) { const ax = x + Math.floor(w / 2); B.line(ax, y0 - o.antenne, ax, y0, ardoise, true); this.ens.setw(ax, y0 - o.antenne, sang); }
    /* fenêtres : grille, 1 px (ou 1 × 2), allumées avec la probabilité p */
    const f = o.fen;
    if (f && f.trame) {
      /* façade tramée : niveau de Bayer propre à l'immeuble, dalles d'étage éteintes, pans éteints par cases de 4 × 4 */
      const niv = f.trame[0] + R() * (f.trame[1] - f.trame[0]), eteint = new Map();
      for (let yy = y0 + 2; yy < CH - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
        if ((yy - y0) % 4 === 3 || B.getw(xx, yy) === T || B.getw(xx, yy - 1) === T || B.getw(xx - 1, yy) === T || B.getw(xx + 1, yy) === T) continue;
        const cle = ((xx - x) >> 2) + ',' + ((yy - y0) >> 2); if (!eteint.has(cle)) eteint.set(cle, R() < (f.off ?? 0.25));
        if (eteint.get(cle) || !dither(xx, yy, niv)) continue;
        this.fen.setw(xx, yy, R() < (f.jaune ?? 0.3) ? jaune : (R() < (f.os ?? 0) ? os : ambre));
      }
    } else if (f) {
      for (let yy = y0 + (f.haut ?? 3); yy < CH - (f.bas ?? 2); yy += f.dy) for (let xx = x + 1 + (f.ox ?? 1); xx < x + w - 1; xx += f.dx) {
        if (B.getw(xx, yy) === T || B.getw(xx, yy - 1) === T) continue;
        if (R() < f.p) { const enc = R() < (f.jaune ?? 0.3) ? jaune : (R() < (f.os ?? 0) ? os : ambre); this.fen.setw(xx, yy, enc); if (f.haute && B.getw(xx, yy + 1) !== T) this.fen.setw(xx, yy + 1, enc); }
      }
    }
    /* enseignes verticales de 2 px, encadrées de nuit profonde ; la phase descend le long de l'enseigne */
    for (const e of (o.enseignes || [])) {
      const ex = x + e.x, ey = y0 + e.y, ph0 = R.int(0, 3);
      for (let j = -1; j <= e.h; j++) for (let i = -1; i <= (e.w ?? 2); i++) if (B.getw(ex + i, ey + j) !== T) B.setw(ex + i, ey + j, nuitProfonde);
      for (let j = 0; j < e.h; j++) for (let i = 0; i < (e.w ?? 2); i++) { if ((e.w ?? 2) > 2 && ((i + j) & 1)) continue; this.ens.setw(ex + i, ey + j, CYCLE[(ph0 + ((j / (e.pas ?? 2)) | 0)) & 3]); }
    }
  }
  tour(red, x) { const t = tourCentrale(red); this.base.blit(t.base, x - (t.base.w >> 1), CH - t.base.h, true); this.ens.blit(t.ens, x - (t.base.w >> 1), CH - t.base.h, true); return t.base.w; }
  /* rang de fond : immeubles voilés d'indigo, sans détails */
  fond(R, hmin, hmax, wmin, wmax, densite = 1) { for (let x = 0; x < CW;) { const w = R.int(wmin, wmax), h = R.int(hmin, hmax); if (R() < densite) this.immeuble(R, x, w, h, { rang: 0, fen: { trame: [0.12, 0.31], off: 0.35, jaune: 0.2 } }); x += w + R.int(0, 6); } }
  fin() {
    /* les fenêtres et enseignes ne débordent jamais de la silhouette ; garde 3 × 3 sur les couches vives */
    for (const L of [this.fen, this.ens]) for (let i = 0; i < L.d.length; i++) if (L.d[i] !== T && this.base.d[i] === T) L.d[i] = T;
    garde3x3(this.fen, T, true); garde3x3(this.ens, T, true);
    /* les enseignes passent par des encres vives en cyclant : on garde aussi l'union fenêtres + enseignes */
    for (let i = 0; i < this.fen.d.length; i++) if (this.ens.d[i] !== T) this.fen.d[i] = T;
    const u = this.fen.copie(); for (let i = 0; i < u.d.length; i++) if (this.ens.d[i] !== T) u.d[i] = ambre;
    garde3x3(u, T, true);
    for (let i = 0; i < u.d.length; i++) if (u.d[i] === T) { this.fen.d[i] = T; this.ens.d[i] = T; }
    sauve(`cite-${this.q}`, this.base, { plan: 'P3', boucleX: CW, ancre: this.q === 'ciel' ? 'haut sur l horizon' : 'bas sur l horizon' });
    sauve(`cite-${this.q}-fenetres`, this.fen, { plan: 'P3', boucleX: CW, note: 'dessiner sur cite-' + this.q + ' ; s éteint rangée par rangée (éclipse), s allume par rangées (élite tuée)' });
    sauve(`cite-${this.q}-enseignes`, this.ens, { plan: 'P3', boucleX: CW, note: 'encre = phase : sang 0, brasier 1, ambre 2, jaune 3 ; afficher CYCLE[(phase + n) & 3]' });
    return this;
  }
}

const cites = {};
/* LES DOCKS : entrepôts bas à toits en scie, empilements de conteneurs, quelques bureaux */
{
  const R = rng(GRAINE + 10), c = new Cite('docks');
  c.tour(2, 0);
  for (let x = 26; x < CW - 24;) {
    const k = R();
    if (k < 0.5) { const w = R.int(26, 42); c.immeuble(R, x, w, R.int(10, 16), { forme: R() < 0.6 ? 'scie' : 'pignon', fen: { trame: [0.31, 0.5], jaune: 0.25 }, enseignes: R() < 0.5 ? [{ x: 3, y: 6, h: 2, w: 8, pas: 1 }] : [] }); x += w + R.int(1, 4); }
    else if (k < 0.85) { /* pile de conteneurs : blocs de 7 × 3, nuit, ardoise et indigo, joints de nuit profonde */
      const n = R.int(2, 4), w = 7 * n + n - 1; for (let i = 0; i < n; i++) { const hh = R.int(1, 4); for (let j = 0; j < hh; j++) { const enc = R.pick([ardoise, indigo, nuit, sang]); c.base.rect(x + i * 8, CH - 4 * (j + 1), 7, 3, enc, true); c.base.rect(x + i * 8, CH - 4 * (j + 1) + 3, 7, 1, nuitProfonde, true); if (R() < 0.3) c.fen.setw(x + i * 8 + R.int(1, 5), CH - 4 * (j + 1) + 1, ambre); } }
      x += w + R.int(2, 5); }
    else { const w = R.int(10, 14); c.immeuble(R, x, w, R.int(16, 24), { forme: 'plat', antenne: R() < 0.5 ? R.int(3, 7) : 0, fen: { trame: [0.31, 0.5], jaune: 0.35 }, enseignes: R() < 0.6 ? [{ x: w - 4, y: 4, h: R.int(6, 10) }] : [] }); x += w + R.int(2, 6); }
  }
  /* lampadaires du quai : points ambre sur poteaux */
  for (let x = 30; x < CW - 20; x += R.int(14, 30)) { c.base.line(x, CH - 9, x, CH - 1, nuit, true); c.fen.setw(x, CH - 10, R() < 0.5 ? jaune : ambre); }
  cites.docks = c.fin();
}
/* L'ARTÈRE : tours à enseignes, monorail */
{
  const R = rng(GRAINE + 11), c = new Cite('artere');
  c.fond(R, 30, 44, 8, 14);
  c.tour(2, 0);
  for (let x = 26; x < CW - 22;) {
    const w = R.int(10, 18), h = R.int(26, 46), ens = [{ x: R() < 0.5 ? 1 : w - 3, y: R.int(3, 8), h: R.int(10, Math.min(22, h - 14)) }];
    if (w > 13 && R() < 0.6) ens.push({ x: 3, y: R.int(2, 4), h: 2, w: w - 6, pas: 1 });
    c.immeuble(R, x, w, h, { forme: R() < 0.3 ? 'biseau' : 'plat', biais: R() < 0.5 ? 1 : -1, antenne: R() < 0.3 ? R.int(4, 9) : 0, fen: { trame: [0.25, 0.5], jaune: 0.3 }, enseignes: ens });
    x += w + R.int(1, 5);
  }
  /* le monorail : voie de 2 px à 24 px du sol, piles tous les 40 px, deux rames en points os et ambre */
  const yv = CH - 24;
  for (let x = 0; x < CW; x++) { c.base.setw(x, yv, ardoise); c.base.setw(x, yv + 1, nuitProfonde); }
  for (let x = 12; x < CW; x += 40) c.base.rect(x, yv + 2, 2, 22, nuit, true);
  for (const r0 of [140, 430]) for (let i = 0; i < 18; i++) { c.base.setw(r0 + i, yv - 1, nuit); c.base.setw(r0 + i, yv - 2, ardoise); if (i % 2 === 0) c.fen.setw(r0 + i, yv - 1, i % 4 ? ambre : os); }
  cites.artere = c.fin();
}
/* LA CENTRALE : réacteurs à dômes, tours de refroidissement, cheminées */
{
  const R = rng(GRAINE + 12), c = new Cite('centrale');
  c.tour(2, 0);
  const corps = (xx, yy) => dither(xx, yy, 0.12) ? ardoise : nuit;
  for (let x = 30; x < CW - 30;) {
    const k = R();
    if (k < 0.35) { /* tour de refroidissement : hyperboloïde */
      const wb = R.int(22, 30), h = R.int(26, 38), wt = wb - 8, wm = wb - 12;
      c.base.poly([[x, CH], [x + (wb - wm) / 2, CH - h * 0.6], [x + (wb - wt) / 2, CH - h], [x + (wb + wt) / 2, CH - h], [x + (wb + wm) / 2, CH - h * 0.6], [x + wb, CH]], 0, true, corps);
      for (let xx = x + (wb - wt) / 2; xx < x + (wb + wt) / 2; xx++) { c.base.setw(Math.round(xx), CH - h, ardoise); if (dither(Math.round(xx), 0, 0.5)) c.ens.setw(Math.round(xx), CH - h - 1, brasier); }
      /* panache de vapeur éclairée par le dessous : nuit et indigo tramés */
      for (let j = 1; j < 16; j++) for (let i = -2; i < wt + 2; i++) { const xx = Math.round(x + (wb - wt) / 2 + i + Math.sin(j * 0.5) * 2), yy = CH - h - 1 - j; if (dither(xx, yy, 0.5 * (1 - j / 16))) c.base.setw(xx, yy, j < 3 && dither(xx + 1, yy, 0.5) ? sang : indigo); }
      x += wb + R.int(6, 16);
    } else if (k < 0.6) { /* réacteur : base et dôme */
      const w = R.int(18, 26), hb = R.int(8, 14);
      c.immeuble(R, x, w, hb, { fen: { trame: [0.38, 0.5], jaune: 0.2 } });
      c.base.disc(x + w / 2, CH - hb, w / 2 - 1, 0, (xx, yy) => yy < CH - hb ? corps(xx, yy) : T);
      for (let i = 0; i < 3; i++) c.ens.setw(Math.round(x + w / 2 - 1 + i), CH - hb - Math.round(w / 2) + 1, i === 1 ? jaune : brasier);
      x += w + R.int(6, 14);
    } else if (k < 0.82) { /* cheminées : 3 à 4 px de large, très hautes, bagues de brasier, balise en sang */
      const n = R.int(1, 3); for (let i = 0; i < n; i++) { const h = R.int(44, 78), w = R.int(3, 4); c.base.rect(x, CH - h, w, h, nuit, true); c.base.rect(x, CH - h, w, 1, ardoise, true);
        for (let yy = CH - h + 6; yy < CH - 6; yy += 12) for (let xx = 0; xx < w; xx++) if ((xx + yy) & 1) c.ens.setw(x + xx, yy, brasier);
        c.ens.setw(x + 1, CH - h - 1, sang); x += w + R.int(3, 6); }
      x += R.int(2, 6);
    } else { const w = R.int(12, 20); c.immeuble(R, x, w, R.int(14, 24), { forme: 'gradins', fen: { trame: [0.31, 0.5], jaune: 0.25 } }); x += w + R.int(6, 14); }
  }
  /* conduites basses */
  for (let x = 0; x < CW; x++) if (c.base.getw(x, CH - 6) === T || true) { c.base.setw(x, CH - 7, ardoise); c.base.setw(x, CH - 6, nuit); }
  cites.centrale = c.fin();
}
/* LE CIEL : la cité vue d'en haut, au loin SOUS l'horizon (image accrochée par le haut à l'horizon) */
{
  const R = rng(GRAINE + 13), c = new Cite('ciel'), H0 = 30;
  /* on ne garde que les 30 rangées du haut : plaques d'îlots en perspective, rues de lumière */
  for (let y = 0; y < H0; y++) {
    const z = 1 + y * 0.18;                        // rangées plus espacées vers le bas (plus proches)
    for (let x = 0; x < CW; x++) if (dither(x, y, 0.5) || (y % Math.max(2, Math.round(3 * z)) === 0)) c.base.setw(x, y, (y & 3) === 0 ? ardoise : nuit);
    if (y % Math.max(2, Math.round(2 * z)) === 1) for (let x = R.int(0, 6); x < CW; x += R.int(2, 7)) c.fen.setw(x, y, R() < 0.3 ? jaune : (R() < 0.15 ? os : ambre));
  }
  /* avenues de lumière qui fuient vers l'horizon */
  for (let k = 0; k < 14; k++) { const x0 = R.int(0, CW - 1), pente = (R() * 2 - 1) * 1.6; for (let y = 1; y < H0; y += 1) { const xx = Math.round(x0 + pente * y); if (dither(xx, y, 0.5)) c.ens.setw(xx, y, CYCLE[(y >> 2) & 3]); } }
  /* la vraie hauteur de l'image reste CH ; seules les rangées 0..H0 servent */
  for (let y = 0; y < H0; y++) for (let x = 0; x < CW; x++) if (c.base.get(x, y) === T) c.base.put(x, y, dither(x, y, 0.25) ? vide : nuit);
  const b = new Img(CW, H0), f = new Img(CW, H0), e = new Img(CW, H0);
  b.blit(c.base.sous(0, 0, CW, H0), 0, 0); f.blit(c.fen.sous(0, 0, CW, H0), 0, 0); e.blit(c.ens.sous(0, 0, CW, H0), 0, 0);
  c.base = b; c.fen = f; c.ens = e;
  cites.ciel = c.fin();
}
/* LES TOURS : gratte-ciel à fenêtres jaunes, flèches */
{
  const R = rng(GRAINE + 14), c = new Cite('tours');
  c.tour(2, 0);
  for (let x = 28; x < CW - 26;) {
    const w = R.int(14, 24), h = R.int(58, 94);
    c.immeuble(R, x, w, h, { forme: R.pick(['plat', 'gradins', 'gradins', 'biseau']), biais: R() < 0.5 ? 1 : -1, antenne: R() < 0.55 ? R.int(5, 12) : 0, fen: { trame: [0.38, 0.5], off: 0.15, jaune: 0.7, os: 0.08 }, enseignes: R() < 0.25 ? [{ x: 2, y: 4, h: 2, w: w - 4, pas: 1 }] : [] });
    x += w + R.int(14, 30);
  }
  cites.tours = c.fin();
}
/* LE CŒUR : la tour centrale d'exterieur EN GRAND, immeubles en feu autour */
{
  const R = rng(GRAINE + 15), c = new Cite('coeur');
  c.fond(R, 8, 16, 10, 18, 0.9);
  const tw = c.tour(1, 0);
  for (let x = (tw >> 1) + 4; x < CW - (tw >> 1) - 10;) {
    const w = R.int(10, 18), h = R.int(12, 26);
    c.immeuble(R, x, w, h, { forme: R.pick(['plat', 'ruine', 'biseau']), biais: R() < 0.5 ? 1 : -1, fen: { trame: [0.25, 0.5], jaune: 0.2 }, enseignes: R() < 0.3 ? [{ x: 1, y: 4, h: R.int(6, 12) }] : [] });
    /* incendie sur le toit : brasier, ambre, jaune tramés, qui cyclent */
    if (R() < 0.85) { const fx = x + R.int(2, w - 6); for (let j = 0; j < 7; j++) for (let i = 0; i < 6 - (j >> 1); i++) { const xx = fx + i + (j >> 2), yy = CH - h - 1 - j + 2; c.base.setw(xx, yy, dither(xx, yy, 0.25) ? sang : nuit); if (dither(xx, yy, 0.5 - j * 0.05)) c.ens.setw(xx, yy, CYCLE[1 + ((i + j) % 3)]); } }
    x += w + R.int(2, 9);
  }
  cites.coeur = c.fin();
}
/* L'ÉCLIPSE : la cité en ruine, basse et déchiquetée, flèche couchée */
{
  const R = rng(GRAINE + 16), c = new Cite('eclipse');
  for (let x = 0; x < CW;) { const w = R.int(14, 30); c.immeuble(R, x, w, R.int(4, 12), { forme: 'ruine', rang: 0 }); x += w - 2; }
  for (let x = 20; x < CW - 20;) {
    const w = R.int(8, 16), h = R.int(10, 40);
    c.immeuble(R, x, w, h, { forme: 'ruine', fen: { dx: 2, dy: 3, p: 0.3, jaune: 0.1 } });
    if (R() < 0.8) { const fx = x + 1, fw = Math.max(4, w - 2); for (let j = 0; j < 8; j++) for (let i = 0; i < fw; i++) if (dither(fx + i, j, 0.5 - j * 0.04) && c.base.getw(fx + i, CH - h + j) !== T) c.ens.setw(fx + i, CH - h + j, CYCLE[1 + (i + j) % 3]); }
    x += w + R.int(10, 30);
  }
  /* deux flèches couchées */
  for (const [x0, l] of [[120, 46], [410, 38]]) { c.base.poly([[x0, CH - 3], [x0 + l, CH - 14], [x0 + l + 2, CH - 11], [x0 + 2, CH]], 0, true, (xx, yy) => dither(xx, yy, 0.12) ? ardoise : nuit); }
  cites.eclipse = c.fin();
}

/* =====================================================================================================
   P4 — LA BRUME : 256 × 32, bouclée en x. Nuit tramée à 25 % en bandes ondulées, reflets ambre à 12 %.
   ===================================================================================================== */
{
  const W = 256, H = 32, img = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b1 = 8 + 3 * Math.sin(x * 2 * Math.PI / 128), b2 = 22 + 3 * Math.sin(x * 2 * Math.PI / 64 + 1);
    const dans = Math.abs(y - b1) < 4 || Math.abs(y - b2) < 5;
    if (!dans) continue;
    if (Math.abs(y - b2) < 2 && Math.sin(x * 2 * Math.PI / 256 * 3) > 0.35 && dither(x + 1, y + 2, 0.12)) img.put(x, y, ambre);
    else if (dither(x, y, 0.25)) img.put(x, y, nuit);
  }
  sauve('brume', img, { plan: 'P4', boucleX: W, note: 'bas à 4 px sous l horizon ; dérive de 4 px/s' });
}

/* =====================================================================================================
   P5 — LES STRUCTURES, tuiles de 32 × 64 (les grandes en 64 × 64), une planche par quartier.
   Ardoise et indigo, liseré violet, arêtes acier tramées ; balises listées dans le manifeste (sang ou ambre).
   ===================================================================================================== */
const TUILES = {};       // q -> [{nom, x, y, w, h, balises, projecteurs, flammes}]
function treillis(img, x0, y0, x1, y1, larg, enc = ardoise, diag = indigo) {
  /* poutre en treillis entre deux points, vertical ou horizontal */
  if (x0 === x1) { for (let y = y0; y <= y1; y++) { img.set(x0, y, enc); img.set(x0 + larg - 1, y, enc); } for (let y = y0; y + larg <= y1; y += larg) { img.line(x0, y, x0 + larg - 1, y + larg - 1, diag); img.line(x0 + larg - 1, y, x0, y + larg - 1, diag); } }
  else { for (let x = x0; x <= x1; x++) { img.set(x, y0, enc); img.set(x, y0 + larg - 1, enc); } for (let x = x0; x + larg <= x1; x += larg) img.line(x, y0 + larg - 1, x + larg - 1, y0, diag); }
}
function liseres(img) {
  /* liseré violet en haut de chaque colonne pleine, arêtes droites en acier tramé à 50 % */
  const o = img.copie();
  for (let x = 0; x < img.w; x++) for (let y = 0; y < img.h; y++) if (o.get(x, y) !== T) { if (o.get(x, y - 1) === T) img.put(x, y, violet); break; }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (o.get(x, y) !== T && o.get(x + 1, y) === T && dither(x, y, 0.5) && o.get(x, y - 1) !== T) img.put(x, y, acier);
}
function planchePlans(q, defs) {
  const w = defs.reduce((s, d) => s + d.w, 0), img = new Img(w, 64), meta = []; let x = 0;
  for (const d of defs) { const t = new Img(d.w, 64), m = { nom: d.nom, x, y: 0, w: d.w, h: 64, balises: [], projecteurs: [], flammes: [] }; d.f(t, m); liseres(t); if (d.apres) d.apres(t, m); garde3x3(t, ardoise); img.blit(t, x, 0); meta.push(m); x += d.w; }
  TUILES[q] = meta;
  sauve('structures-' + q, img, { plan: 'P5', tuiles: meta.map(m => m.nom), note: 'tuiles posées sur le sol ; base = rangée 63 de la tuile' });
}
const corpsS = (x, y) => dither(x, y, 0.25) ? indigo : ardoise;
const lampadaire = (t, m, x = 16) => { t.rect(x, 22, 2, 42, ardoise); t.rect(x - 4, 20, 8, 2, ardoise); t.set(x - 4, 22, ambre); t.set(x + 3, 22, ambre); m.balises.push([x, 19, 'ambre']); };
planchePlans('docks', [
  { nom: 'grue', w: 64, f: (t, m) => { treillis(t, 10, 14, 10, 63, 5); treillis(t, 0, 10, 63, 10, 4); t.rect(4, 8, 8, 6, ardoise); t.rect(5, 9, 3, 2, ambre); t.line(12, 4, 0, 10, ardoise); t.line(12, 4, 62, 10, ardoise); t.line(12, 3, 12, 9, ardoise);
    t.line(52, 14, 52, 38, ardoise); t.rect(49, 38, 7, 3, indigo); t.rect(1, 14, 6, 6, nuit); m.balises.push([12, 2, 'sang'], [63, 10, 'sang']); } },
  { nom: 'portique', w: 64, f: (t, m) => { treillis(t, 3, 18, 3, 63, 4); treillis(t, 56, 18, 56, 63, 4); treillis(t, 0, 16, 63, 16, 5); t.rect(26, 21, 12, 5, ardoise); t.line(32, 26, 32, 44, ardoise); t.rect(24, 44, 17, 6, indigo); t.rect(24, 44, 17, 1, sang); m.balises.push([1, 15, 'sang'], [62, 15, 'ambre']); } },
  { nom: 'conteneurs', w: 32, f: (t) => { const c = [indigo, sang, ardoise, indigo, ardoise]; for (let j = 0; j < 5; j++) { const w = j % 2 ? 26 : 30, x = j % 2 ? 3 : 1; t.rect(x, 63 - 6 * (j + 1) + 1, w, 5, c[j]); for (let i = x + 2; i < x + w; i += 3) t.set(i, 63 - 6 * (j + 1) + 3, nuit); } } },
  { nom: 'lampadaire', w: 32, f: (t, m) => lampadaire(t, m) },
]);
planchePlans('artere', [
  { nom: 'pylone', w: 32, f: (t, m) => { t.poly([[6, 63], [14, 6], [18, 6], [26, 63]], 0, false, (x, y) => ((x + y) % 5 === 0 || (x - y + 64) % 5 === 0 || x <= Math.round(6 + (y - 63) * -8 / 57) + 1 || x >= Math.round(26 - (63 - y) * 8 / 57) - 1) ? ardoise : T);
    t.rect(4, 14, 24, 2, ardoise); t.rect(7, 26, 18, 2, ardoise); for (const x of [4, 27]) t.line(x, 16, x, 19, indigo); m.balises.push([16, 4, 'sang']); } },
  { nom: 'panneau', w: 64, f: (t, m) => { t.rect(14, 34, 3, 30, ardoise); t.rect(46, 34, 3, 30, ardoise); t.rect(4, 8, 56, 26, nuit); t.rect(4, 8, 56, 1, acier);
    /* l'affiche : un soleil en bandes et « 2975 » en barres, tramés à 50 % */
    for (let y = 10; y < 32; y++) for (let x = 6; x < 58; x++) { const dx = x - 20, dy = y - 24; if (dx * dx + dy * dy < 64 && y < 24 && (x + y) & 1) t.put(x, y, y < 18 ? jaune : (y % 3 ? ambre : nuit)); if (y > 25 && y < 30 && x > 6 && x < 56 && (x + y) & 1) t.put(x, y, sang); }
    const g = ['111001111100111', '111101111001111', '111001001001001', '111100111001111']; [[35, 13], [40, 13], [45, 13], [50, 13]].forEach(([gx, gy], k) => { for (let i = 0; i < 15; i++) if (g[k][i] === '1') t.put(gx + (i % 3), gy + Math.floor(i / 3), (i % 3 === 1 && Math.floor(i / 3) % 2) ? jaune : ambre); });
    m.projecteurs.push([16, 36], [48, 36]); } },
  { nom: 'pilier', w: 32, f: (t) => { t.rect(12, 18, 8, 46, ardoise); t.rect(0, 14, 32, 4, ardoise); t.rect(0, 18, 32, 1, nuitProfonde); for (let y = 22; y < 64; y += 6) t.rect(13, y, 6, 1, indigo); } },
  { nom: 'lampadaire', w: 32, f: (t, m) => lampadaire(t, m, 14) },
]);
planchePlans('centrale', [
  { nom: 'cheminee', w: 32, f: (t, m) => { t.poly([[11, 63], [13, 4], [19, 4], [21, 63]], 0, false, corpsS); for (let y = 10; y < 60; y += 10) t.rect(12, y, 9, 1, indigo); t.rect(12, 4, 8, 2, acier); m.balises.push([16, 8, 'sang'], [16, 30, 'sang']); m.flammes.push([16, 3]); } },
  { nom: 'conduites', w: 64, f: (t) => { for (const [y, h] of [[30, 5], [40, 4], [50, 6]]) { t.rect(0, y, 64, h, ardoise); t.rect(0, y, 64, 1, indigo); } for (const x of [6, 30, 54]) t.rect(x, 28, 3, 36, nuit); t.rect(18, 20, 10, 10, ardoise); t.disc(23, 25, 3, indigo); for (const x of [10, 40]) { t.rect(x, 36, 4, 3, indigo); } } },
  { nom: 'reservoir', w: 64, f: (t, m) => { for (const x of [16, 30, 46]) t.rect(x, 40, 2, 24, ardoise); t.disc(32, 30, 20, 0, (x, y, dx, dy) => { const r = Math.hypot(dx, dy); if (r > 18.5) return dx > 4 && dy < 0 ? (dither(x, y, 0.5) ? brasier : sang) : ardoise; if (dx > 6 && dy < -4 && r > 12 && dither(x, y, 0.5)) return sang; if (dx < -6 && dy < -8 && dither(x, y, 0.25)) return acier; return (Math.round(dy) % 6 === 0) ? indigo : (dither(x, y, 0.12) ? indigo : nuit); }); t.rect(12, 30, 40, 1, violet); for (let x = 14; x < 52; x += 4) t.set(x, 31, ambre); m.balises.push([32, 9, 'ambre']); } },
  { nom: 'torchere', w: 32, f: (t, m) => { t.rect(15, 14, 2, 50, ardoise); for (let y = 20; y < 64; y += 8) { t.line(10, y, 15, y - 4, indigo); t.line(21, y, 16, y - 4, indigo); } m.flammes.push([16, 13]); } },
]);
planchePlans('tours', [
  { nom: 'antenne', w: 32, f: (t, m) => { t.rect(15, 2, 2, 62, ardoise); t.line(16, 10, 2, 63, indigo); t.line(16, 10, 30, 63, indigo); t.line(16, 30, 6, 63, indigo); t.line(16, 30, 26, 63, indigo); for (const y of [12, 24, 36]) t.rect(12, y, 8, 1, ardoise); m.balises.push([16, 1, 'sang'], [16, 23, 'sang']); } },
  { nom: 'projecteur', w: 32, f: (t, m) => { t.rect(8, 48, 16, 16, ardoise); t.rect(10, 44, 12, 4, indigo); t.disc(16, 40, 5, 0, (x, y) => dither(x, y, 0.5) ? acier : ardoise); t.set(16, 38, os); m.projecteurs.push([16, 38]); } },
  { nom: 'chateau', w: 32, f: (t, m) => { t.poly([[6, 10], [26, 10], [24, 30], [8, 30]], 0, false, corpsS); t.poly([[4, 10], [16, 2], [28, 10]], ardoise); for (const x of [9, 22]) t.line(x, 30, x + (x < 16 ? -4 : 4), 63, ardoise); t.line(10, 40, 22, 52, indigo); t.line(22, 40, 10, 52, indigo); m.balises.push([16, 1, 'sang']); } },
  { nom: 'antenne-haute', w: 32, f: (t, m) => { treillis(t, 13, 6, 13, 63, 6); t.rect(10, 6, 12, 2, ardoise); t.disc(16, 16, 4, 0, (x, y) => dither(x, y, 0.5) ? acier : indigo); m.balises.push([16, 4, 'sang'], [16, 34, 'ambre']); } },
]);
/* LE CŒUR : monolithes à sphère d'après la bande gauche d'affiche.png (dalle + sphère, texture remappée) */
const LUT_STRUCT = { [vide]: nuit, [nuitProfonde]: nuit, [I.magenta]: violet, [I.rosePale]: acier, [sang]: indigo, [brasier]: ambre, [I.cyan]: ardoise, [I.cyanPale]: acier, [jaune]: ambre };
function monolithe(t, m, x0, w, haut, rs) {
  /* la dalle : texture de la bande gauche d'affiche.png, remappée, arêtes en acier tramé, liseré de brasier côté soleil */
  for (let y = haut; y < 64; y++) for (let x = x0; x < x0 + w; x++) {
    let c = remap(aff.get(4 + (x - x0) % 18, 30 + (y - haut) % 40), LUT_STRUCT); if (VIF.has(c)) c = (x + y) & 1 ? indigo : ardoise;
    if (c === violet || c === acier || c === indigo) c = dither(x, y, 0.25) ? indigo : ardoise; else c = nuit;
    if (x === x0 + w - 1) c = dither(x, y, 0.5) ? brasier : sang; else if (x === x0) c = nuit;
    t.put(x, y, c);
  }
  for (let x = x0; x < x0 + w; x++) t.put(x, haut, x < x0 + w - 2 ? violet : acier);
  /* la sphère, enchâssée dans le haut de la dalle et qui la déborde : nuit, reflet du soleil en sang et brasier */
  const cx = x0 + w / 2, cy = haut + rs + 3;
  t.disc(cx, cy, rs, 0, (x, y, dx, dy) => {
    const r = Math.hypot(dx, dy);
    if (r > rs - 1.2) return (dx > 0 && dy < rs * 0.3) ? (dither(x, y, 0.5) ? brasier : sang) : violet;
    if (dx > rs * 0.2 && dy < -rs * 0.1 && r > rs * 0.55 && dither(x, y, 0.5)) return sang;
    if (dx < -rs * 0.3 && dy < -rs * 0.3 && r < rs * 0.6 && r > rs * 0.3 && dither(x, y, 0.5)) return acier;
    return dither(x, y, 0.12) ? indigo : nuitProfonde;
  });
  t.rect(Math.round(cx) - rs - 2, Math.round(cy), 2, 1, ardoise); t.rect(Math.round(cx) + rs, Math.round(cy), 2, 1, ardoise);   // l'anneau qui la tient
  m.balises.push([Math.round(cx), haut - 1, 'ambre']);
}
planchePlans('coeur', [
  { nom: 'monolithe', w: 32, f: (t, m) => monolithe(t, m, 9, 14, 8, 8) },
  { nom: 'monolithe-large', w: 64, f: (t, m) => { monolithe(t, m, 5, 16, 20, 9); monolithe(t, m, 34, 22, 2, 12); } },
  { nom: 'paratonnerre', w: 32, f: (t, m) => { t.rect(15, 4, 2, 60, ardoise); for (let y = 12; y < 60; y += 12) t.rect(11, y, 10, 2, indigo); t.line(16, 4, 12, 0, acier); t.line(16, 4, 20, 0, acier); m.balises.push([16, 6, 'sang']); } },
  { nom: 'dalle', w: 32, f: (t) => { for (let y = 20; y < 64; y++) for (let x = 6; x < 26; x++) { let c = remap(aff.get(6 + (x - 6), 20 + (y - 20)), LUT_STRUCT); if (VIF.has(c) && ((x + y) & 1)) c = ardoise; t.put(x, y, c); } } },
]);
/* L'ÉCLIPSE : pylônes brisés, treillis effondré */
planchePlans('eclipse', [
  { nom: 'ruine', w: 32, f: (t, m) => { treillis(t, 12, 22, 12, 63, 6); t.line(12, 22, 6, 30, ardoise); t.line(17, 22, 26, 12, ardoise); t.line(26, 12, 28, 16, ardoise); m.balises.push([26, 11, 'sang']); } },
  { nom: 'effondre', w: 64, f: (t) => { for (let i = 0; i < 40; i++) { const x = 8 + i, y = 62 - Math.round(i * 0.55); t.set(x, y, ardoise); t.set(x, y - 4, ardoise); if (i % 4 === 0) t.line(x, y, x + 4, y - 4, indigo); } t.poly([[0, 63], [10, 54], [22, 57], [36, 50], [50, 58], [63, 55], [63, 63]], 0, false, corpsS); } },
]);
/* LE CIEL : pas de structures ; une bande de nuages en strates (512 × 64), fond plat, dessus éclairés par le
   soleil (ambre et brasier tramés à 25 % au plus), ventre en indigo et violet tramés */
{
  const W = 512, H = 64, img = new Img(W, H), R = rng(GRAINE + 20), bancs = [];
  for (let k = 0; k < 9; k++) bancs.push({ x: R.int(0, W - 1), y: R.int(18, 56), l: R.int(40, 110), e: R.int(4, 9), bosses: Array.from({ length: 5 }, () => [R() , R.int(2, 6)]) });
  for (const b of bancs) for (let i = -b.l / 2; i < b.l / 2; i++) {
    const u = i / (b.l / 2), env = Math.sqrt(Math.max(0, 1 - u * u));
    let haut = b.e * env; for (const [p, h] of b.bosses) { const dd = (u - (p * 2 - 1)) * 4; haut += h * Math.exp(-dd * dd) * env; }
    const x = b.x + i, y0 = Math.round(b.y - haut);
    for (let y = y0; y <= b.y; y++) {
      const v = (y - y0) / Math.max(1, b.y - y0);
      let c;
      if (y === y0 || (v < 0.25 && dither(x, y, 0.5))) c = dither(x, y, 0.5) ? (v < 0.1 ? ambre : brasier) : sang;
      else if (v < 0.55) c = dither(x, y, 0.5) ? violet : indigo;
      else c = dither(x, y, 0.5) ? indigo : nuit;
      if (y === b.y && dither(x, y, 0.5)) c = T;
      img.setw(x, y, c === T ? T : c);
    }
  }
  garde3x3(img, sang, true);
  sauve('nuages-ciel', img, { plan: 'P5', boucleX: W, note: 'structures du quartier LE CIEL : bande posée à mi-hauteur du ciel, facteur 0,60, dérive de 3 px/s' });
}
/* flammes de la centrale : 4 images de 8 × 14, brasier, ambre, jaune tramés, à poser sur m.flammes */
{
  const img = new Img(32, 14), R = rng(GRAINE + 21);
  for (let k = 0; k < 4; k++) for (let y = 0; y < 14; y++) { const v = y / 13, half = 1 + v * 2.6 + Math.sin(k * 1.7 + y * 0.9) * 0.8, cx = 4 + Math.sin(k * 2.1 + y * 0.6) * (1 - v) * 1.4;
    for (let x = 0; x < 8; x++) { const d = Math.abs(x + 0.5 - cx); if (d > half) continue; const c = v < 0.3 ? (dither(x, y + k, 0.5) ? brasier : T) : (d < half * 0.4 && v > 0.5 ? (dither(x + k, y, 0.5) ? jaune : ambre) : (dither(x + k, y, 0.5) ? brasier : sang)); if (c !== T) img.put(k * 8 + x, y, c); } }
  garde3x3(img, sang);
  sauve('flammes', img, { plan: 'P5', images: 4, imageW: 8, note: 'bas de l image sur le point m.flammes de la tuile ; une image par demi-temps' });
}

/* =====================================================================================================
   LES SILHOUETTES DU CYCLOPE (REFONTE § 4.8) : lointaine 48 px (devant le soleil, P2), intermédiaire 80 px (P5).
   Contour vectoriel relevé sur boss.png (cornes, œil unique, épaulières, bras), intérieur texturé par boss.png
   ramené à deux encres (sang et nuit), contour d'un pixel en sang, œil en brasier.
   ===================================================================================================== */
const CYCLOPE = [
  [[34, 22], [40, 10], [37, 0], [44, 8], [48, 3], [52, 8], [60, 1], [56, 10], [62, 22], [66, 50], [60, 80], [36, 80], [30, 50]],
  [[40, 20], [22, 15], [10, 23], [7, 34], [20, 31], [38, 30]],
  [[56, 20], [76, 13], [88, 21], [90, 34], [76, 30], [58, 30]],
  [[10, 30], [21, 30], [23, 56], [17, 72], [6, 70], [3, 50]],
  [[75, 30], [88, 30], [93, 50], [90, 70], [80, 72], [73, 56]],
  [[22, 64], [74, 64], [84, 80], [12, 80]],
];
function cyclope(H) {
  const k = H / 80, W = Math.ceil(96 * k), img = new Img(W, H);
  for (const p of CYCLOPE) img.poly(p.map(([x, y]) => [x * k, y * k]), nuit);
  /* texture : boss.png (x 112..300, y 0..170) échantillonné, vif -> sang, sombre -> nuit */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.get(x, y) !== T) {
    const c = bos.get(Math.round(112 + x / W * 188), Math.round(y / H * 170));
    img.put(x, y, (c === I.magenta || c === I.rosePale || c === brasier) && dither(x, y, 0.5) ? sang : nuit);
  }
  const o = img.copie();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o.get(x, y) !== T && (o.get(x - 1, y) === T || o.get(x + 1, y) === T || o.get(x, y - 1) === T)) img.put(x, y, sang);
  const ex = Math.round(48 * k), ey = Math.round(15 * k);
  img.put(ex - 1, ey, sang); img.put(ex, ey, brasier); img.put(ex + 1, ey, sang); if (H >= 64) { img.put(ex, ey - 1, sang); img.put(ex, ey + 1, sang); img.put(ex + 1, ey, brasier); }
  return img;
}
sauve('colosse-loin', cyclope(48), { plan: 'P2', note: 'silhouette lointaine, devant le soleil (LE CŒUR, puis WARNING) ; œil en (' + Math.round(48 * 0.6) + ', ' + Math.round(15 * 0.6) + ')' });
sauve('colosse-mi', cyclope(80), { plan: 'P5', note: 'silhouette intermédiaire (L ÉCLIPSE) ; œil en (48, 15)' });

/* =====================================================================================================
   P6 — LE PREMIER PLAN : poutrelles et câbles en nuit profonde tramée à 50 %, 256 × 24, bouclés en x.
   avant-haut : la rangée 0 colle au haut de l'écran ; avant-bas : la rangée 23 colle au bas.
   ===================================================================================================== */
{
  const W = 256, H = 24, haut = new Img(W, H), bas = new Img(W, H), R = rng(GRAINE + 22);
  const pose = (img, x, y) => { if (dither(x, y, 0.5)) img.setw(x, y, nuitProfonde); };
  for (let x = 0; x < W; x++) { for (const y of [0, 1, 7]) pose(haut, x, y); if (x % 8 < 1 || (x % 8) === (Math.abs(((x >> 3) & 1) ? 7 - (x % 8) : x % 8))) for (let y = 1; y < 7; y++) pose(haut, x, y); }
  for (let x = 0; x < W; x += 8) haut.line(x, 1, x + 7, 7, 0, true, (xx, yy) => { pose(haut, xx, yy); return false; });
  for (const [x0, l, s] of [[20, 90, 12], [140, 70, 9], [200, 50, 16]]) for (let i = 0; i <= l; i++) { const y = Math.round(8 + s * Math.sin(Math.PI * i / l)); pose(haut, x0 + i, y); }
  for (let x = 0; x < W; x++) { for (const y of [22, 23, 16]) pose(bas, x, y); }
  for (let x = 0; x < W; x += 10) bas.line(x, 22, x + 9, 16, 0, true, (xx, yy) => { pose(bas, xx, yy); return false; });
  for (let k = 0; k < 6; k++) { const x0 = R.int(0, W - 1), w = R.int(10, 26), h = R.int(3, 8); for (let x = 0; x < w; x++) for (let y = H - 1 - Math.round(h * Math.sin(Math.PI * x / w)); y < H; y++) pose(bas, x0 + x, y); }
  sauve('avant-haut', haut, { plan: 'P6', boucleX: W, note: 'dans les 12 % du haut ; dessiné AVANT les entités' });
  sauve('avant-bas', bas, { plan: 'P6', boucleX: W, note: 'dans les 12 % du bas ; dessiné AVANT les entités' });
}

/* =====================================================================================================
   LE MANIFESTE
   ===================================================================================================== */
const QUARTIERS = {
  docks:    { nom: 'LES DOCKS', ciel: 'ciel-docks', soleil: { haut: 46, variante: 'plein' }, cite: 'cite-docks', structures: 'structures-docks', lumiere: 'aube : reflets d or sur le sol', sol: { reflet: [jaune, ambre, ambre], grille: violet, eau: true }, lut: {}, enseignes: { tempo: 1 } },
  artere:   { nom: 'L ARTÈRE', ciel: 'ciel-calme', soleil: { haut: 48, variante: 'plein' }, cite: 'cite-artere', structures: 'structures-artere', lumiere: 'néons ambre et jaune qui tournent vite', sol: { reflet: [jaune, ambre, brasier], grille: violet }, lut: {}, enseignes: { tempo: 2 } },
  centrale: { nom: 'LA CENTRALE', ciel: 'ciel-centrale', soleil: { haut: 42, variante: 'plein' }, cite: 'cite-centrale', structures: 'structures-centrale', lumiere: 'brasier, fumées de nuit', sol: { reflet: [ambre, brasier, brasier], grille: violet }, lut: { [indigo]: sang }, enseignes: { tempo: 1 } },
  ciel:     { nom: 'LE CIEL', ciel: 'ciel-ciel', soleil: { haut: 50, variante: 'plein' }, cite: 'cite-ciel', structures: 'nuages-ciel', lumiere: 'soleil haut et entier, étoiles nombreuses, calme', sol: { reflet: [jaune, ambre, brasier], grille: indigo }, lut: {}, enseignes: { tempo: 2 }, etoiles: 2 },
  tours:    { nom: 'LES TOURS', ciel: 'ciel-tours', soleil: { haut: 34, variante: 'plein' }, cite: 'cite-tours', structures: 'structures-tours', lumiere: 'crépuscule ambre et sang', sol: { reflet: [ambre, brasier, sang], grille: violet }, lut: {}, enseignes: { tempo: 1 } },
  coeur:    { nom: 'LE CŒUR', ciel: 'ciel-coeur', soleil: { haut: 40, variante: 'plein' }, cite: 'cite-coeur', structures: 'structures-coeur', lumiere: 'incendie : brasier et sang, éclairs lointains', sol: { reflet: [brasier, brasier, sang], grille: violet }, lut: { [violet]: sang }, enseignes: { tempo: 2 }, colosseLoin: true },
  eclipse:  { nom: 'L ÉCLIPSE', ciel: 'ciel-colosse', soleil: { haut: 46, variante: 'eclipse' }, cite: 'cite-eclipse', structures: 'structures-eclipse', lumiere: 'soleil éclipsé, cerclé de brasier', sol: { reflet: [brasier, brasier, sang], grille: violet }, lut: {}, enseignes: { tempo: 2 }, colosseMi: true },
};
/* rangées de structures : une ligne par quartier, période 768 px, positions à graine */
const RANGEES = {};
for (const q of Object.keys(TUILES)) { const R = rng(GRAINE + 40 + q.length), t = TUILES[q], rang = []; for (let x = R.int(0, 40); x < 768 - 64;) { const tu = t[R.int(0, t.length - 1)]; rang.push({ tuile: tu.nom, x }); x += tu.w + R.int(50, 130); } RANGEES[q] = rang; }
for (const q of Object.keys(QUARTIERS)) if (RANGEES[q]) QUARTIERS[q].rangee = { periode: 768, poses: RANGEES[q] };

const ETATS = {
  calme:     { ciel: null, soleil: null, soleilBaisse: 0, sol: { cases: 1, braiseProche: 0 }, enseignes: 1 },
  montee:    { ciel: 'ciel-montee', soleil: null, soleilBaisse: 6, sol: { cases: 1, braiseProche: 0.25 }, enseignes: 2 },
  chaos:     { ciel: 'ciel-chaos', soleil: 'chaos', soleilBaisse: 'horizon', sol: { cases: 2, braiseProche: 0.25, epaisseur: 2 }, enseignes: 2, braises: true },
  inversion: { ciel: 'ciel-inversion', soleil: 'inversion', soleilBaisse: -4, sol: { cases: 1, braiseProche: 0, pulse: true }, enseignes: 2 },
  colosse:   { ciel: 'ciel-colosse', soleil: 'eclipse', soleilBaisse: 0, sol: { cases: 1, braiseProche: 0, reflet: [sang, sang, sang] }, enseignes: 0 },
  victoire:  { ciel: 'ciel-victoire', soleil: 'victoire', soleilBaisse: 0, sol: { cases: 0.5, braiseProche: 0 }, enseignes: 0.5 },
};
const manifeste = {
  version: 1,
  genere_par: 'proto-neon/tools/decor/genere.mjs (graine ' + GRAINE + ')',
  format: { indexes: '0..15 = palette du jeu dans l ordre de 00-pal.js ; 16 = transparent', images: 'planches horizontales : image k en x = k * imageW' },
  plans: {
    P0: { facteur: [0, 0.02] }, P1: { facteur: [0.03, 0.05] }, P2: { facteur: [0.08, 'f_h'] }, P3: { facteur: [0.20, 'f_h'] },
    P4: { facteur: [0.35, 0.40], derive: 4 }, P5: { facteur: [0.60, 0.60] }, SOL: { facteur: ['f_h', 1] }, PLATEAU: { facteur: [1, 1] }, P6: { facteur: [1.4, 1.4] },
  },
  cycleEnseignes: CYCLE, cycleBalises: [sang, nuit, nuitProfonde],
  quartiers: QUARTIERS, etats: ETATS, tuiles: TUILES, fichiers,
};
fs.writeFileSync(path.join(OUT, 'decor.json'), JSON.stringify(manifeste, null, 1).replace(/\[\s+([-\d.]+),\s+([-\d.]+)(,\s+([-\d.]+))?(,\s+([-\d."a-z]+))?\s+\]/g, (m) => m.replace(/\s+/g, '')));

/* =====================================================================================================
   CONTRÔLES
   ===================================================================================================== */
let erreurs = 0;
for (const [nom, img, exempt] of aControler) {
  let interdits = 0; for (const v of img.d) if (INTERDITS.has(v)) interdits++;
  const blocs = exempt ? 0 : compte3x3(img);
  if (interdits || blocs) { erreurs++; console.log(`ÉCHEC ${nom} : ${interdits} pixels interdits (cyan, magenta, rose pâle), ${blocs} blocs 3 × 3 vifs`); }
}
/* quartiers distincts : intersection sur union des masques de cité (même cadre : bas sur l'horizon) */
const masqueCite = q => { const b = cites[q].base, m = new Uint8Array(CW * 128); const oy = q === 'ciel' ? 64 : 64 - b.h; for (let y = 0; y < b.h; y++) for (let x = 0; x < CW; x++) if (b.d[y * CW + x] !== T) m[(oy + y) * CW + x] = 1; return m; };
const qs = Object.keys(cites); let iouMax = 0, paire = '';
for (let a = 0; a < qs.length; a++) for (let b = a + 1; b < qs.length; b++) {
  const A = masqueCite(qs[a]), B = masqueCite(qs[b]); let i = 0, u = 0; for (let k = 0; k < A.length; k++) { i += A[k] & B[k]; u += A[k] | B[k]; }
  const v = i / u; if (v > iouMax) { iouMax = v; paire = qs[a] + '/' + qs[b]; }
  process.stdout.write(`${qs[a]}/${qs[b]} ${v.toFixed(2)}  `);
  if (v >= 0.5) { erreurs++; console.log(`ÉCHEC quartiers ${qs[a]} et ${qs[b]} trop proches : IoU ${v.toFixed(2)}`); }
}
console.log(`decor : ${Object.keys(fichiers).length} images dans art/decor/, IoU maximale des cités ${iouMax.toFixed(2)} (${paire}), ${erreurs} échec(s)`);
process.exit(erreurs ? 1 : 0);
