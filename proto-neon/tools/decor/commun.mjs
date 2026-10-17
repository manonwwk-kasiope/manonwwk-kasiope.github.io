/* Outils communs des plans de décor : palette fermée, tramage de Bayer, PNG indexé, image d'index, dessin.
   Aucune dépendance (zlib de node). La palette est recopiée de DIRECTION.md, dans l'ordre exact de 00-pal.js. */
import fs from 'node:fs';
import zlib from 'node:zlib';

export const NOMS = ['vide', 'nuit', 'ardoise', 'violet', 'indigo', 'magenta', 'rosePale', 'cyan', 'cyanPale',
  'ambre', 'jaune', 'brasier', 'os', 'acier', 'sang', 'nuitProfonde'];
export const HEX = ['0d0221', '190b28', '241734', '541388', '2d1b69', 'ff2a6d', 'ff8fab', '05d9e8', 'd1f7ff',
  'ff9e00', 'ffd319', 'ff5714', 'fffce8', '8a8fa3', '8b0f3a', '01012b'];
export const RGB = HEX.map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
/* luminance relative WCAG fixée par REFONTE.md § 5.1 */
export const L = [0.002, 0.006, 0.012, 0.041, 0.024, 0.240, 0.438, 0.555, 0.873, 0.457, 0.679, 0.281, 0.967, 0.277, 0.061, 0.002];
export const I = Object.fromEntries(NOMS.map((n, i) => [n, i]));
export const T = 16;                       // index transparent des PNG de décor
export const lumineux = c => c < 16 && L[c] > 0.10;
export const VIF = new Set([I.ambre, I.jaune, I.brasier, I.os, I.acier]);   // couleurs vives du décor
export const INTERDITS = new Set([I.cyan, I.cyanPale, I.magenta, I.rosePale]);

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/* vrai si le pixel (x, y) est posé pour une intensité t de 0 à 1 (même règle que N.pal.dither) */
export const dither = (x, y, t) => BAYER[((y & 3) << 2) | (x & 3)] < t * 16;

/* hasard à graine (mulberry32) : tout est rejouable */
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (a0, b0) => a0 + Math.floor(f() * (b0 - a0 + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  return f;
}

/* image d'index de palette ; T = transparent */
export class Img {
  constructor(w, h, fond = T) { this.w = w; this.h = h; this.d = new Uint8Array(w * h).fill(fond); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.d[y * this.w + x] : T; }
  set(x, y, c) { if (c !== T && this.in(x, y)) this.d[y * this.w + x] = c; }
  put(x, y, c) { if (this.in(x, y)) this.d[y * this.w + x] = c; }                       // pose aussi T
  setw(x, y, c) { if (c === T || y < 0 || y >= this.h) return; x = ((x % this.w) + this.w) % this.w; this.d[y * this.w + x] = c; }
  getw(x, y) { if (y < 0 || y >= this.h) return T; x = ((x % this.w) + this.w) % this.w; return this.d[y * this.w + x]; }
  rect(x, y, w, h, c, wrap = false) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) wrap ? this.setw(i, j, c) : this.set(i, j, c); }
  line(x0, y0, x1, y1, c, wrap = false, pat = null) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, k = 0;
    for (;;) { if (!pat || pat(x0, y0, k)) (wrap ? this.setw(x0, y0, c) : this.set(x0, y0, c)); k++; if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  /* polygone plein, règle pair-impair, sommets en coordonnées réelles */
  poly(pts, c, wrap = false, fn = null) {
    let y0 = Infinity, y1 = -Infinity; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) { const cc = fn ? fn(x, y) : c; wrap ? this.setw(x, y, cc) : this.set(x, y, cc); }
    }
  }
  disc(cx, cy, r, c, fn = null) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) this.set(x, y, fn ? fn(x, y, dx, dy) : c); } }
  /* colle src en (ox, oy), T de src ignoré */
  blit(src, ox, oy, wrap = false, lut = null) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { let c = src.d[y * src.w + x]; if (c === T) continue; if (lut) c = lut[c]; wrap ? this.setw(ox + x, oy + y, c) : this.set(ox + x, oy + y, c); } }
  copie() { const o = new Img(this.w, this.h); o.d.set(this.d); return o; }
  sous(x, y, w, h) { const o = new Img(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.d[j * w + i] = this.get(x + i, y + j); return o; }
  masque() { const m = new Uint8Array(this.w * this.h); for (let i = 0; i < m.length; i++) m[i] = this.d[i] !== T ? 1 : 0; return m; }
}

/* ---- PNG indexé : PLTE de 17 entrées (0..15 = palette du jeu, 16 = transparent), tRNS, profondeur 8 ---- */
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
export function ecrirePNG(file, img, opts = {}) {
  const transparent = opts.transparent !== false;
  for (const v of img.d) if (v > 16 || (v === 16 && !transparent)) throw new Error(file + ' : index hors palette ' + v);
  const n = transparent ? 17 : 16;
  const ih = Buffer.alloc(13); ih.writeUInt32BE(img.w, 0); ih.writeUInt32BE(img.h, 4); ih[8] = 8; ih[9] = 3;
  const plte = Buffer.alloc(n * 3); for (let i = 0; i < 16; i++) { plte[i * 3] = RGB[i][0]; plte[i * 3 + 1] = RGB[i][1]; plte[i * 3 + 2] = RGB[i][2]; }
  const raw = Buffer.alloc((img.w + 1) * img.h);
  for (let y = 0; y < img.h; y++) { raw[y * (img.w + 1)] = 0; Buffer.from(img.d.buffer, img.d.byteOffset + y * img.w, img.w).copy(raw, y * (img.w + 1) + 1); }
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('PLTE', plte)];
  if (transparent) { const tr = Buffer.alloc(17, 255); tr[16] = 0; parts.push(chunk('tRNS', tr)); }
  parts.push(chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  fs.writeFileSync(file, Buffer.concat(parts));
}
/* lit un PNG indexé (illustrations de art/ ou plans de art/decor/) en image d'index ; T si alpha nul */
export function lirePNG(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0, bd = 0, ct = 0, idat = [], trns = null;
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; } else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (ct !== 3 || bd !== 8) throw new Error(file + ' : PNG indexé 8 bits attendu');
  const raw = zlib.inflateSync(Buffer.concat(idat)), img = new Img(w, h); let prev = Buffer.alloc(w);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)], line = raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1)), cur = Buffer.alloc(w);
    for (let x = 0; x < w; x++) { const a = x ? cur[x - 1] : 0, up = prev[x], c = x ? prev[x - 1] : 0; let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c); }
      cur[x] = v & 255; }
    for (let x = 0; x < w; x++) img.d[y * w + x] = (trns && cur[x] < trns.length && trns[cur[x]] === 0) ? T : cur[x];
    prev = cur;
  }
  return img;
}
/* PNG RGBA agrandi k fois (captures de la maquette seulement) */
export function ecrireCapture(file, img, k = 1) {
  const W = img.w * k, H = img.h * k, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++) { let c = img.d[((y / k) | 0) * img.w + ((x / k) | 0)]; if (c === T) c = 0; const o = y * (W * 3 + 1) + 1 + x * 3; raw[o] = RGB[c][0]; raw[o + 1] = RGB[c][1]; raw[o + 2] = RGB[c][2]; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/* ---- contrôles ---- */
/* casse tout bloc 3 × 3 plein de couleur vive en posant `sub` sur un pixel sur deux (damier) ; rend le nombre de corrections */
export function garde3x3(img, sub, wrap = false) {
  let n = 0, again = true;
  while (again) { again = false;
    for (let y = 1; y < img.h - 1; y++) for (let x = wrap ? 0 : 1; x < (wrap ? img.w : img.w - 1); x++) {
      let plein = true; for (let j = -1; j <= 1 && plein; j++) for (let i = -1; i <= 1; i++) if (!VIF.has(wrap ? img.getw(x + i, y + j) : img.get(x + i, y + j))) { plein = false; break; }
      if (plein) { const xx = ((((x + y) & 1) ? x : x + 1) % img.w + img.w) % img.w; img.d[y * img.w + xx] = sub; n++; again = true; }
    } }
  return n;
}
export function compte3x3(img, exclu = null) {
  let n = 0;
  for (let y = 1; y < img.h - 1; y++) for (let x = 1; x < img.w - 1; x++) {
    if (exclu && exclu(x, y)) continue;
    let plein = true; for (let j = -1; j <= 1 && plein; j++) for (let i = -1; i <= 1; i++) if (!VIF.has(img.get(x + i, y + j))) { plein = false; break; }
    if (plein) n++;
  }
  return n;
}
