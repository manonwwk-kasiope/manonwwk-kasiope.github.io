/* Outils communs du bestiaire et du CYCLOPE : palette fermée, images d'index, PNG indexé, RotSprite,
   ombrage des coques, contour, planches de contrôle. Aucune dépendance (zlib de node).

   Convention des SPRITES (CONTRAT.md, N.spr.make) : index de palette 0 à 15, et 0 = TRANSPARENT.
   L'encre « vide » (#0d0221, index 0) n'est donc jamais posée dans un sprite : c'est le fond du monde.
   Les PNG écrits ici ont une PLTE de 16 entrées dans l'ordre exact de 00-pal.js et un tRNS qui rend
   l'index 0 transparent : relus par 05-art.js ou par un décodeur quelconque, l'index lu EST l'index du jeu.

   Pendant le dessin, deux index de travail existent au-dessus de 15 et disparaissent avant l'écriture :
     COQUE (16) : matière ombrée après rotation (arête haute rose pâle, arêtes basse et droite sang,
                  cœur magenta), comme shadeHull de 40-sprites.js ;
     PLEIN (17) : réservé.                                                                           */
import fs from 'node:fs';
import zlib from 'node:zlib';

export const NOMS = ['vide', 'nuit', 'ardoise', 'violet', 'indigo', 'magenta', 'rosePale', 'cyan', 'cyanPale',
  'ambre', 'jaune', 'brasier', 'os', 'acier', 'sang', 'nuitProfonde'];
export const HEX = ['0d0221', '190b28', '241734', '541388', '2d1b69', 'ff2a6d', 'ff8fab', '05d9e8', 'd1f7ff',
  'ff9e00', 'ffd319', 'ff5714', 'fffce8', '8a8fa3', '8b0f3a', '01012b'];
export const RGB = HEX.map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
export const LUM = [0.002, 0.006, 0.012, 0.041, 0.024, 0.240, 0.438, 0.555, 0.873, 0.457, 0.679, 0.281, 0.967, 0.277, 0.061, 0.002];

export const TR = 0, NUIT = 1, ARD = 2, VIOLET = 3, INDIGO = 4, MAG = 5, ROSE = 6, CYAN = 7, CYP = 8,
  AMBRE = 9, JAUNE = 10, BRAS = 11, OS = 12, ACIER = 13, SANG = 14, NP = 15, COQUE = 16;

/* légende des cartes de caractères (la même que 40-sprites.js, plus « m » = coque ombrée et « M » =
   magenta posé tel quel) */
export const LEG = { '.': TR, ' ': TR, o: NP, n: NUIT, d: ARD, v: VIOLET, i: INDIGO, m: COQUE, M: MAG,
  r: ROSE, a: AMBRE, j: JAUNE, b: BRAS, w: OS, g: ACIER, s: SANG };

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const tram = (x, y, t) => BAYER[((y & 3) << 2) | (x & 3)] < t * 16;

/* ---------------------------------------------------------------------------------------------------- */
/* l'image d'index                                                                                      */
/* ---------------------------------------------------------------------------------------------------- */
export class Img {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h); this.cx = (w - 1) >> 1; this.cy = (h - 1) >> 1; }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.d[y * this.w + x] : TR; }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (this.in(x, y)) this.d[y * this.w + x] = c; }
  /* ne pose que sur un pixel déjà opaque */
  peint(x, y, c) { if (this.get(x, y) !== TR) this.set(x, y, c); }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  line(x0, y0, x1, y1, c, fn = null) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, k = 0;
    for (;;) { if (!fn || fn(x0, y0, k)) this.set(x0, y0, c); k++; if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  /* polygone plein (centres de pixels, règle pair-impair) ; fn(x, y) peut rendre la couleur */
  poly(pts, c, fn = null) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (dansPoly(pts, x + 0.5, y + 0.5)) this.set(x, y, fn ? fn(x, y) : c);
  }
  disc(cx, cy, r, c, fn = null) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) this.set(x, y, fn ? fn(x, y, dx, dy) : c);
    }
  }
  /* colle src en (ox, oy) ; l'index 0 de src est transparent ; lut optionnelle */
  blit(src, ox, oy, lut = null) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { let c = src.d[y * src.w + x]; if (c === TR) continue; if (lut) c = lut[c] ?? c; this.set(ox + x, oy + y, c); }
  }
  copie() { const o = new Img(this.w, this.h); o.d.set(this.d); o.cx = this.cx; o.cy = this.cy; return o; }
  sous(x0, y0, w, h) { const o = new Img(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o.d[y * w + x] = this.get(x0 + x, y0 + y); return o; }
  remplace(lut) { const o = this.copie(); for (let i = 0; i < o.d.length; i++) if (o.d[i] !== TR && lut[o.d[i]] !== undefined) o.d[i] = lut[o.d[i]]; return o; }
  miroir() { const o = new Img(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[y * this.w + x] = this.d[y * this.w + this.w - 1 - x]; o.cx = this.w - 1 - this.cx; o.cy = this.cy; return o; }
  /* symétrie gauche -> droite : la moitié gauche (x < w/2) est recopiée en miroir */
  symetrise() { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w >> 1; x++) this.d[y * this.w + this.w - 1 - x] = this.d[y * this.w + x]; return this; }
}

export function dansPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
  }
  return c;
}

export function carte(rows) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), s = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const v = LEG[rows[y][x]]; if (v === undefined) throw new Error('lettre inconnue « ' + rows[y][x] + ' » dans ' + rows[y]);
    s.d[y * w + x] = v;
  }
  return s;
}

/* ---------------------------------------------------------------------------------------------------- */
/* rotation façon RotSprite (même algorithme que 40-sprites.js : trois Scale2x, plus proche voisin)      */
/* ---------------------------------------------------------------------------------------------------- */
function scale2x(d, w, h) {
  const o = new Uint8Array(w * h * 4), W2 = w * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = d[y * w + x];
    const A = y > 0 ? d[(y - 1) * w + x] : 0, D = y < h - 1 ? d[(y + 1) * w + x] : 0;
    const C = x > 0 ? d[y * w + x - 1] : 0, B = x < w - 1 ? d[y * w + x + 1] : 0;
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== D && A !== B) e0 = A;
    if (A === B && A !== C && B !== D) e1 = B;
    if (D === C && D !== B && C !== A) e2 = C;
    if (B === D && B !== A && D !== C) e3 = D;
    const o0 = 2 * y * W2 + 2 * x;
    o[o0] = e0; o[o0 + 1] = e1; o[o0 + W2] = e2; o[o0 + W2 + 1] = e3;
  }
  return o;
}
export function rotsprite(s, a) {
  const w = s.w, h = s.h; let d = s.d, k = 1;
  for (let n = 0; n < 3; n++) { d = scale2x(d, w * k, h * k); k *= 2; }
  const W8 = w * 8, H8 = h * 8, o = new Img(w, h), ca = Math.cos(a), sa = Math.sin(a), cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5 - cx, py = y + 0.5 - cy;
    const sx = px * ca + py * sa + cx, sy = -px * sa + py * ca + cy;
    const X = Math.floor(sx * 8), Y = Math.floor(sy * 8);
    if (X < 0 || Y < 0 || X >= W8 || Y >= H8) continue;
    o.d[y * w + x] = d[Y * W8 + X];
  }
  o.cx = s.cx; o.cy = s.cy;
  return o;
}
/* quart de tour horaire à l'écran (droite -> bas) */
export function rot90(s) {
  const w = s.w, h = s.h, o = new Img(h, w);
  for (let y = 0; y < w; y++) for (let x = 0; x < h; x++) o.d[y * h + x] = s.d[(h - 1 - x) * w + y];
  o.cx = h - 1 - s.cy; o.cy = s.cx;
  return o;
}
/* direction k (0 = droite, 4 = bas, 8 = gauche, 12 = haut) d'une carte qui regarde vers la droite */
export function dir16(base, k) {
  const b = k & 3, m = k >> 2;
  let s = b ? rotsprite(base, b * Math.PI / 8) : base.copie();
  for (let i = 0; i < m; i++) s = rot90(s);
  return s;
}
/* une carte dessinée pointe en HAUT devient une carte qui regarde à droite */
export const versDroite = s => rot90(s);

/* ---------------------------------------------------------------------------------------------------- */
/* ombrage et contour                                                                                   */
/* ---------------------------------------------------------------------------------------------------- */
/* la coque : lumière en haut à gauche quelle que soit l'orientation (arête haute rose pâle, arêtes basse
   et droite sang, le reste magenta, qui doit dominer : V-09) */
/* joints = true : un joint de nuit profonde compte comme un bord (armure en plaques tournée) */
export function ombre(s, haut = ROSE, bas = SANG, coeur = MAG, joints = false) {
  const o = s.copie(), w = s.w, d = s.d;
  const vide = v => !v || (joints && v === NP);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (d[i] !== COQUE) continue;
    const up = y > 0 ? d[i - w] : 0, dn = y < s.h - 1 ? d[i + w] : 0, rt = x < w - 1 ? d[i + 1] : 0;
    o.d[i] = vide(up) ? haut : (vide(dn) || vide(rt)) ? bas : coeur;
  }
  return o;
}
/* contour d'un pixel en nuit profonde (voisinage de 8 : aucune fuite par un coin) ; agrandit de 2 */
export function contour(s, ci = NP, diag = true) {
  const w = s.w + 2, h = s.h + 2, o = new Img(w, h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.d[(y + 1) * w + x + 1] = s.d[y * s.w + x];
  const src = o.d.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (src[y * w + x]) continue;
    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1 && !hit; dx++) {
      if ((!dx && !dy) || (!diag && dx && dy)) continue;
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      if (src[yy * w + xx]) hit = true;
    }
    if (hit) o.d[y * w + x] = ci;
  }
  o.cx = s.cx + 1; o.cy = s.cy + 1;
  return o;
}
/* contour posé DANS le cadre (le sprite garde sa taille) : tout pixel transparent voisin d'un opaque */
export function contourDedans(s, ci = NP) {
  const o = s.copie(), w = s.w, h = s.h, src = s.d;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (src[y * w + x]) continue;
    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1 && !hit; dx++) {
      const xx = x + dx, yy = y + dy; if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      if (src[yy * w + xx]) hit = true;
    }
    if (hit) o.d[y * w + x] = ci;
  }
  /* et le bord du cadre : un pixel opaque posé sur le bord prend l'encre du contour */
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && o.d[y * w + x]) o.d[y * w + x] = ci;
  return o;
}

/* armure en PLAQUES (méthode du colosse de 40-sprites.js, agrandie) : chaque plaque est un polygone posé
   dans l'ordre de profondeur ; un joint d'un pixel en nuit profonde sépare deux plaques ; chaque plaque est
   éclairée par le haut. base : MAG (avant) ou SANG (en retrait) ; arete : encre de l'arête haute. */
export function plaques(w, h, liste, opts = {}) {
  const id = new Int16Array(w * h).fill(-1), info = [];
  const axe = opts.axe ?? (w / 2);
  for (const pl of liste) {
    const polys = [pl.p];
    if (pl.sym !== false && opts.sym !== false) polys.push(pl.p.map(([x, y]) => [2 * axe - x, y]));
    for (const P of polys) {
      const pid = info.length; info.push(pl);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dansPoly(P, x + 0.5, y + 0.5)) id[y * w + x] = pid;
    }
  }
  /* étendue verticale de chaque plaque, pour le dégradé tramé (opts.degrade) */
  const y0 = info.map(() => Infinity), y1 = info.map(() => -Infinity);
  for (let i = 0; i < id.length; i++) if (id[i] >= 0) { const y = (i / w) | 0; y0[id[i]] = Math.min(y0[id[i]], y); y1[id[i]] = Math.max(y1[id[i]], y); }
  const s = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = id[i]; if (v < 0) continue;
    const up = y > 0 ? id[i - w] : -1, dn = y < h - 1 ? id[i + w] : -1, rt = x < w - 1 ? id[i + 1] : -1, lf = x > 0 ? id[i - 1] : -1;
    /* joint : la plaque du dessous (posée plus tôt) cède un pixel à celle du dessus */
    if ((dn >= 0 && dn > v) || (up >= 0 && up > v) || (rt >= 0 && rt > v && x + 0.5 < axe) || (lf >= 0 && lf > v && x + 0.5 > axe)) { s.d[i] = NP; continue; }
    const pl = info[v], b = pl.base ?? MAG;
    if (up !== v) s.d[i] = pl.arete ?? (b === MAG ? ROSE : MAG);
    else if (dn !== v) s.d[i] = pl.ombre ?? (b === MAG ? SANG : NP);
    else if (pl.flanc && ((x + 0.5 < axe && lf !== v) || (x + 0.5 > axe && rt !== v))) s.d[i] = pl.flanc;
    else if (pl.fn) s.d[i] = pl.fn(x, y, b);
    else {
      /* volume : le bas de la plaque se trame vers l'ombre (magenta -> sang, sang -> nuit profonde) */
      const t = (y - y0[v]) / Math.max(1, y1[v] - y0[v]), dg = pl.degrade ?? opts.degrade ?? 0;
      const ombreB = b === MAG ? SANG : b === SANG ? NP : b;
      s.d[i] = dg && t > 1 - dg && tram(x, y, Math.min(0.75, (t - (1 - dg)) / dg * 0.9)) ? ombreB : b;
    }
  }
  s.id = id;
  return s;
}

/* ---------------------------------------------------------------------------------------------------- */
/* PNG                                                                                                  */
/* ---------------------------------------------------------------------------------------------------- */
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
/* PNG indexé, profondeur 8, PLTE des 16 encres dans l'ordre du jeu, tRNS : index 0 transparent */
export function ecrirePNG(file, img) {
  for (const v of img.d) if (v > 15) throw new Error(file + ' : index de travail ' + v + ' resté dans l image');
  const ih = Buffer.alloc(13); ih.writeUInt32BE(img.w, 0); ih.writeUInt32BE(img.h, 4); ih[8] = 8; ih[9] = 3;
  const plte = Buffer.alloc(48); for (let i = 0; i < 16; i++) { plte[i * 3] = RGB[i][0]; plte[i * 3 + 1] = RGB[i][1]; plte[i * 3 + 2] = RGB[i][2]; }
  const raw = Buffer.alloc((img.w + 1) * img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) raw[y * (img.w + 1) + 1 + x] = img.d[y * img.w + x];
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('PLTE', plte),
    chunk('tRNS', Buffer.from([0])), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
/* PNG en couleurs vraies (planches de contrôle) : rgb = Uint8Array w*h*3 */
export function ecrireRGB(file, w, h, rgb) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
/* lecteur PNG minimal (8 bits, indexé ou RGB/RGBA, non entrelacé) -> {w, h, ind (ou null), rgb, a, plte} */
export function lirePNG(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0, depth = 0, type = 0, plte = null, trns = null; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), t = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; }
    else if (t === 'PLTE') plte = d; else if (t === 'tRNS') trns = d; else if (t === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(file + ' : profondeur ' + depth + ' non prise en charge');
  const bpp = { 3: 1, 2: 3, 6: 4, 0: 1 }[type], raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)];
    for (let x = 0; x < st; x++) {
      const v = raw[y * (st + 1) + 1 + x], a = x >= bpp ? out[y * st + x - bpp] : 0, up = y ? out[(y - 1) * st + x] : 0, c = (x >= bpp && y) ? out[(y - 1) * st + x - bpp] : 0;
      let r = v;
      if (f === 1) r = v + a; else if (f === 2) r = v + up; else if (f === 3) r = v + ((a + up) >> 1);
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c); }
      out[y * st + x] = r & 255;
    }
  }
  const rgb = new Uint8Array(w * h * 3), al = new Uint8Array(w * h).fill(255); let ind = null;
  if (type === 3) { ind = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) { const k = out[i]; ind[i] = k; rgb[i * 3] = plte[k * 3]; rgb[i * 3 + 1] = plte[k * 3 + 1]; rgb[i * 3 + 2] = plte[k * 3 + 2]; if (trns && k < trns.length) al[i] = trns[k]; } }
  else for (let i = 0; i < w * h; i++) { rgb[i * 3] = out[i * bpp]; rgb[i * 3 + 1] = out[i * bpp + (bpp > 1 ? 1 : 0)]; rgb[i * 3 + 2] = out[i * bpp + (bpp > 1 ? 2 : 0)]; if (bpp === 4) al[i] = out[i * 4 + 3]; }
  return { w, h, ind, rgb, a: al, plte };
}

/* ---------------------------------------------------------------------------------------------------- */
/* petite police 3 × 5 pour étiqueter les planches de contrôle (jamais dans le jeu)                     */
/* ---------------------------------------------------------------------------------------------------- */
const F35 = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', ':': '000010000010000', '-': '000000111000000', '.': '000000000000010', '*': '000101010101000',
  '/': '001001010100100', ' ': '000000000000000', '(': '010100100100010', ')': '010001001001010'
};
export function texte(rgb, W, x0, y0, s, col = [138, 143, 163]) {
  s = s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (let n = 0; n < s.length; n++) {
    const g = F35[s[n]] || F35[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') {
      const x = x0 + n * 4 + i, y = y0 + j, k = (y * W + x) * 3; if (x < 0 || x >= W || k < 0 || k >= rgb.length) continue;
      rgb[k] = col[0]; rgb[k + 1] = col[1]; rgb[k + 2] = col[2];
    }
  }
}
