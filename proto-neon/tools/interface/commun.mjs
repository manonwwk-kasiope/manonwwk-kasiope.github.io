/* SNAKE 2975 — outils communs de l'interface : palette fermée, image d'index, PNG indexé (lecture et
   écriture), contour, police 5 × 7 (copie conforme de celle de src/40-sprites.js, pour les maquettes).
   Aucune dépendance : node et son zlib.

   CONVENTION DES PNG DE art/interface/ (la même que les sprites du jeu, CONTRAT.md « {w, h, data} ») :
     PLTE = les seize encres de DIRECTION.md, dans l'ordre exact de src/00-pal.js (index 0 à 15) ;
     tRNS = un seul octet, 0 : l'index 0 est TRANSPARENT. L'encre « vide » n'est donc jamais posée dans un
     sprite d'interface : on prend « nuit profonde » (15), presque identique. Un octet du PNG est donc
     directement l'index de palette du jeu, et 0 veut dire « rien ».
   Les maquettes (écrans complets) sont des PNG indexés de la même palette, SANS tRNS : là, 0 est le vide. */
import fs from 'node:fs';
import zlib from 'node:zlib';

export const NOMS = ['vide', 'nuit', 'ardoise', 'violet', 'indigo', 'magenta', 'rosePale', 'cyan', 'cyanPale',
  'ambre', 'jaune', 'brasier', 'os', 'acier', 'sang', 'nuitProfonde'];
export const HEX = ['0d0221', '190b28', '241734', '541388', '2d1b69', 'ff2a6d', 'ff8fab', '05d9e8', 'd1f7ff',
  'ff9e00', 'ffd319', 'ff5714', 'fffce8', '8a8fa3', '8b0f3a', '01012b'];
export const RGB = HEX.map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
export const L = [0.002, 0.006, 0.012, 0.041, 0.024, 0.240, 0.438, 0.555, 0.873, 0.457, 0.679, 0.281, 0.967, 0.277, 0.061, 0.002];
export const I = Object.fromEntries(NOMS.map((n, i) => [n, i]));
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const dither = (x, y, t) => BAYER[((y & 3) << 2) | (x & 3)] < t * 16;

/* lettres des cartes de pixels dessinées à la main (icônes, pièces) */
export const LEGENDE = {
  '.': 0, ' ': 0, K: 15, n: 1, d: 2, v: 3, i: 4, m: 5, r: 6, c: 7, C: 8, a: 9, j: 10, b: 11, o: 12, s: 13, g: 14, V: 0
};

/* image d'index de palette. En sprite, 0 = transparent ; sur une toile de maquette, 0 = vide. */
export class Img {
  constructor(w, h, fond = 0) { this.w = w; this.h = h; this.d = new Uint8Array(w * h).fill(fond); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.d[y * this.w + x] : 0; }
  set(x, y, c) { if (c > 0 && this.in(x, y)) this.d[y * this.w + x] = c; }
  put(x, y, c) { if (this.in(x, y)) this.d[y * this.w + x] = c; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, c); }
  cadre(x, y, w, h, c) { for (let i = x; i < x + w; i++) { this.put(i, y, c); this.put(i, y + h - 1, c); } for (let j = y; j < y + h; j++) { this.put(x, j, c); this.put(x + w - 1, j, c); } }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.put(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.put(x, y, c); }
  /* tramage de Bayer d'une encre sur un rectangle, à l'intensité t */
  trame(x, y, w, h, c, t) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (dither(i, j, t)) this.put(i, j, c); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { this.put(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  disc(cx, cy, r, c) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) this.put(x, y, c); } }
  /* colle src en (ox, oy) ; 0 de src = transparent ; lut optionnelle ; k = agrandissement entier */
  blit(src, ox, oy, lut = null, k = 1) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      let c = src.d[y * src.w + x]; if (!c) continue; if (lut) c = lut[c]; if (!c) continue;
      for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) this.put(ox + x * k + a, oy + y * k + b, c);
    }
  }
  /* remappe chaque pixel par une table (assombrir un fond, par exemple) */
  remap(lut, x = 0, y = 0, w = this.w, h = this.h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.in(i, j)) this.d[j * this.w + i] = lut[this.d[j * this.w + i]]; }
  copie() { const o = new Img(this.w, this.h); o.d.set(this.d); return o; }
  sous(x, y, w, h) { const o = new Img(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.d[j * w + i] = this.get(x + i, y + j); return o; }
}

/* une carte de pixels (tableau de chaînes) en Img */
export function carte(rows, leg = LEGENDE) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), im = new Img(w, h);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = leg[r[x]]; if (c === undefined) throw new Error('lettre inconnue « ' + r[x] + ' » dans ' + r); im.d[y * w + x] = c; } });
  return im;
}

/* contour d'un pixel autour de tout ce qui est posé ; huit = aussi les diagonales. Agrandit de 1 de chaque côté si marge. */
export function contour(src, c = I.nuitProfonde, huit = true, marge = true) {
  const m = marge ? 1 : 0, o = new Img(src.w + 2 * m, src.h + 2 * m);
  o.blit(src, m, m);
  const plein = (x, y) => src.get(x - m, y - m) > 0;
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
    if (plein(x, y)) continue;
    let v = false;
    for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; if (!huit && dx && dy) continue; if (plein(x + dx, y + dy)) { v = true; break; } }
    if (v) o.put(x, y, c);
  }
  return o;
}

/* repeint une encre en une autre */
export function repeint(src, de, vers) { const o = src.copie(); for (let i = 0; i < o.d.length; i++) if (o.d[i] === de) o.d[i] = vers; return o; }
export function tourne90(src) { const o = new Img(src.h, src.w); for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) o.d[x * o.w + (src.h - 1 - y)] = src.d[y * src.w + x]; return o; }
export function miroirX(src) { const o = new Img(src.w, src.h); for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) o.d[y * o.w + (src.w - 1 - x)] = src.d[y * src.w + x]; return o; }
/* planche horizontale d'images de même taille */
export function bande(imgs) { const w = imgs[0].w, h = imgs[0].h, o = new Img(w * imgs.length, h); imgs.forEach((im, k) => o.blit(im, k * w, 0)); return o; }

/* ---------------------------------------------------------------------------------------------- */
/* PNG                                                                                              */
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
/* écrit un PNG indexé 8 bits ; transparent = l'index 0 est transparent (sprites) ; k = agrandissement entier */
export function ecrirePNG(file, img, { transparent = true, k = 1 } = {}) {
  for (const v of img.d) if (v > 15) throw new Error(file + ' : index hors palette ' + v);
  const W = img.w * k, H = img.h * k;
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 3;
  const plte = Buffer.alloc(48); for (let i = 0; i < 16; i++) { plte[i * 3] = RGB[i][0]; plte[i * 3 + 1] = RGB[i][1]; plte[i * 3 + 2] = RGB[i][2]; }
  const raw = Buffer.alloc((W + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W + 1)] = 0; for (let x = 0; x < W; x++) raw[y * (W + 1) + 1 + x] = img.d[((y / k) | 0) * img.w + ((x / k) | 0)]; }
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('PLTE', plte)];
  if (transparent) parts.push(chunk('tRNS', Buffer.from([0])));
  parts.push(chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)));
  fs.writeFileSync(file, Buffer.concat(parts));
}

/* index de palette le plus proche (distance pondérée), pour lire les panneaux de art/ */
export function proche(r, g, b) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < 16; i++) { const [R, G, B] = RGB[i], rm = (r + R) / 2, dr = r - R, dg = g - G, db = b - B; const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
  return best;
}
/* lit un PNG indexé 8 bits ou RGB(A) 8 bits non entrelacé ; rend une Img d'index de palette du jeu.
   transp : index rendu pour un pixel transparent (défaut 0). */
export function lirePNG(file, transp = 0) {
  const b = fs.readFileSync(file); let p = 8, w, h, bd, ct, plte = null, trns = null; const idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; } else if (type === 'PLTE') plte = d; else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d); }
  if (bd !== 8) throw new Error(file + ' : profondeur ' + bd + ' non gérée');
  const bpp = ct === 3 ? 1 : ct === 2 ? 3 : ct === 6 ? 4 : 0; if (!bpp) throw new Error(file + ' : type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, px = Buffer.alloc(st * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], s = raw.subarray(y * (st + 1) + 1, (y + 1) * (st + 1));
    for (let x = 0; x < st; x++) { const a = x >= bpp ? px[y * st + x - bpp] : 0, u = y ? px[(y - 1) * st + x] : 0, c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0;
      let v = s[x]; if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1; else if (f === 4) { const q = a + u - c, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      px[y * st + x] = v & 255; } }
  const im = new Img(w, h);
  if (ct === 3) { const map = []; for (let i = 0; i < plte.length / 3; i++) map[i] = (trns && i < trns.length && trns[i] === 0) ? transp : proche(plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2]); for (let i = 0; i < w * h; i++) im.d[i] = map[px[i]]; }
  else for (let i = 0; i < w * h; i++) { const o = i * bpp; im.d[i] = (bpp === 4 && px[o + 3] < 128) ? transp : proche(px[o], px[o + 1], px[o + 2]); }
  return im;
}

/* ---------------------------------------------------------------------------------------------- */
/* LA POLICE 5 × 7 — copie conforme de src/40-sprites.js (chasse fixe : case de 5, avance de 6), pour
   composer les maquettes avec la vraie lettre du jeu. Le jeu, lui, se sert de N.spr.text.
   UNE PROPOSITION en plus : le point médian « · » (2 × 2 au milieu de la case). REFONTE.md l'emploie
   partout (« V3 · BATTERIE · LA CENTRALE ») et 40-sprites.js le rend aujourd'hui par un point bas.  */
const CAP = 7, ASC = 2, ADV = 6;
const G = {
  'A': '.###./#...#/#...#/#####/#...#/#...#/#...#', 'B': '####./#...#/#...#/####./#...#/#...#/####.',
  'C': '.###./#...#/#..../#..../#..../#...#/.###.', 'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
  'E': '#####/#..../#..../####./#..../#..../#####', 'F': '#####/#..../#..../####./#..../#..../#....',
  'G': '.###./#...#/#..../#.###/#...#/#...#/.###.', 'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  'I': '###/.#./.#./.#./.#./.#./###', 'J': '....#/....#/....#/....#/#...#/#...#/.###.',
  'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#', 'L': '#..../#..../#..../#..../#..../#..../#####',
  'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', 'N': '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',
  'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.', 'P': '####./#...#/#...#/####./#..../#..../#....',
  'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', 'R': '####./#...#/#...#/####./#.#../#..#./#...#',
  'S': '.####/#..../#..../.###./....#/....#/####.', 'T': '#####/..#../..#../..#../..#../..#../..#..',
  'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.', 'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  'W': '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.', 'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..', 'Z': '#####/....#/...#./..#../.#.../#..../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####', '3': '#####/...#./..#../...#./....#/#...#/.###.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.', '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.', '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.', '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  '.': '../../../../../##/##', '·': '../../../##/##/../..', ',': '../../../../../##/.#/#.', ':': '../##/##/../##/##/..', ';': '../##/##/../##/.#/#.',
  '!': '#/#/#/#/#/./#', '?': '.###./#...#/....#/...#./..#../...../..#..', '-': '...../...../...../#####/...../...../.....',
  '/': '....#/....#/...#./..#../.#.../#..../#....', '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  '+': '...../..#../..#../#####/..#../..#../.....', "'": '#/#/./././././', '"': '#.#/#.#/.../.../.../.../...',
  '(': '..#/.#./#../#../#../.#./..#', ')': '#../.#./..#/..#/..#/.#./#..',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.', '*': '...../..#../#.#.#/.###./#.#.#/..#../.....',
  '=': '...../...../#####/...../#####/...../.....', '<': '...#/..#./.#../#.../.#../..#./...#', '>': '#.../.#../..#./...#/..#./.#../#...',
  '_': '...../...../...../...../...../...../#####', '°': '.#./#.#/.#./.../.../.../...',
  '×': '...../#...#/.#.#./..#../.#.#./#...#/.....', '…': '...../...../...../...../...../...../#.#.#',
  '✓': '...../....#/...##/#.##./###../.#.../.....', '✗': '...../#...#/.#.#./..#../.#.#./#...#/.....',
  '★': '..#../..#../#####/.###./.###./#...#/.....', '♥': '...../.#.#./#####/#####/.###./..#../.....',
  '←': '...../..#../.#.../#####/.#.../..#../.....', '→': '...../..#../...#./#####/...#./..#../.....',
  '↑': '..#../.###./#.#.#/..#../..#../..#../..#..', '↓': '..#../..#../..#../..#../#.#.#/.###./..#..',
  'Œ': '.####/#.#../#.#../#.###/#.#../#.#../.####', ' ': '...../...../...../...../...../...../.....'
};
const MARK = {
  aigu: { rows: ['.#', '#.'], x: gw => Math.ceil((gw - 2) / 2) }, grave: { rows: ['#.', '.#'], x: gw => Math.floor((gw - 2) / 2) },
  circ: { rows: ['.#.', '#.#'], x: gw => Math.floor((gw - 3) / 2) }, trema: { rows: ['#.#', '...'], x: gw => Math.floor((gw - 3) / 2) },
  cedille: { rows: ['.#', '#.'], x: gw => Math.floor((gw - 2) / 2) + 1, below: true }
};
const COMPOSE = { 'É': ['E', 'aigu'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'Ë': ['E', 'trema'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'],
  'Ù': ['U', 'grave'], 'Û': ['U', 'circ'], 'Ô': ['O', 'circ'], 'Î': ['I', 'circ'], 'Ï': ['I', 'trema'], 'Ç': ['C', 'cedille'] };
const GC = {};
function parse(str) { const rows = str.split('/'); let w = 0; const px = []; rows.forEach((r, y) => { w = Math.max(w, r.length); for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([x, y]); }); return { w, px }; }
function glyphe(ch) {
  if (GC[ch]) return GC[ch]; let g;
  if (G[ch]) g = parse(G[ch]);
  else if (COMPOSE[ch]) { const base = glyphe(COMPOSE[ch][0]), mk = MARK[COMPOSE[ch][1]], px = base.px.slice(), x0 = mk.x(base.w);
    mk.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push([x0 + x, mk.below ? CAP + y : y - mk.rows.length - (ASC - mk.rows.length)]); });
    g = { w: base.w, px }; }
  else g = glyphe('?');
  return (GC[ch] = g);
}
/* équivalences typographiques, comme ALIAS dans 40-sprites.js */
const alias = s => String(s).replace(/[\u00a0\u202f\u2009]/g, ' ').replace(/[\u2019\u2018\u02bc]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014\u2212]/g, '-').replace(/\u2022/g, '*');
/* largeur en pixels d'un texte à l'échelle k */
export const mesure = (s, k = 1) => (Array.from(alias(s)).length * ADV - 1) * k;
/* écrit s ; (x, y) = coin haut-gauche des capitales. o = { ci, contour, ombre, k, align: 'g'|'c'|'d' } */
export function texte(img, s, x, y, o = {}) {
  const k = o.k || 1, ci = o.ci === undefined ? I.os : o.ci, chars = Array.from(alias(s).toUpperCase());
  x = Math.round(x); y = Math.round(y);
  if (o.align === 'c') x -= Math.floor(mesure(s, k) / 2); else if (o.align === 'd') x -= mesure(s, k);
  const pts = [];
  chars.forEach((ch, n) => { const g = glyphe(ch), ox = n * ADV + Math.floor((5 - g.w) / 2); for (const [a, b] of g.px) pts.push([ox + a, b]); });
  const pose = (dx, dy, c) => { for (const [a, b] of pts) for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) img.put(x + a * k + i + dx, y + b * k + j + dy, c); };
  if (o.contour !== undefined) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) pose(dx, dy, o.contour);
  if (o.ombre !== undefined) pose(k, k, o.ombre);
  pose(0, 0, ci);
  return mesure(s, k);
}
