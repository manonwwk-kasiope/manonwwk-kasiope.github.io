/* tools/sprites/lab.mjs — labo rapide, sans navigateur : charge 00-pal.js et 40-sprites.js dans Node,
   pose une liste de sprites sur un fond, agrandit au voisin le plus proche et écrit un PNG.
   Usage : node tools/sprites/lab.mjs sortie.png k fond "nom@graine nom@graine | ligne suivante ..."
     k = agrandissement, fond = nom de couleur de palette ; '|' passe à la ligne ;
     un élément "T:texte" pose un texte ; "F:couleur" change le fond de la case suivante. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', '..', 'src');
const ctx = { console, Math, Map, Uint8Array, Uint32Array, Float32Array, ArrayBuffer, Array, Object, String, parseInt, isNaN, isFinite };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['00-pal.js', '40-sprites.js']) vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f });
const N = ctx.__N;

export function png(w, h, rgb) {
  const crcT = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
  const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const [out, kS, fondS, spec] = process.argv.slice(2);
const k = +kS || 8, P = N.pal;
const rows = (spec || '').split('|').map(r => r.trim().split(/\s+/).filter(Boolean));
const items = rows.map(r => r.map(tok => {
  if (tok.startsWith('T:')) return { s: N.spr.text(tok.slice(2).replace(/_/g, ' ')) };
  if (tok.startsWith('F:')) return { fond: tok.slice(2) };
  const [n, g] = tok.split('@');
  return { s: N.spr.make(n, +(g || 0)), n };
}));
const GAP = 2;
let W = 0, H = GAP;
const placed = [];
for (const r of items) {
  let x = GAP, rh = 0, fond = null;
  for (const it of r) {
    if (it.fond) { fond = it.fond; continue; }
    placed.push({ s: it.s, x, y: H, fond }); fond = null;
    x += it.s.w + GAP; rh = Math.max(rh, it.s.h);
  }
  W = Math.max(W, x); H += rh + GAP;
}
const buf = new Uint8Array(W * H).fill(P.i(fondS || 'vide'));
for (const p of placed) {
  if (p.fond) for (let y = -1; y <= p.s.h; y++) for (let x = -1; x <= p.s.w; x++) { const X = p.x + x, Y = p.y + y; if (X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = P.i(p.fond); }
  for (let y = 0; y < p.s.h; y++) for (let x = 0; x < p.s.w; x++) { const v = p.s.data[y * p.s.w + x]; if (v) buf[(p.y + y) * W + p.x + x] = v; }
}
const OW = W * k, OH = H * k, rgb = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
  const v = buf[((y / k) | 0) * W + ((x / k) | 0)], o = (y * OW + x) * 3;
  let r = P.R[v], g = P.G[v], b = P.B[v];
  /* grille fine d'un pixel physique entre les pixels de jeu, pour compter (seulement si k >= 6) */
  if (k >= 6 && (x % k === 0 || y % k === 0)) { r = r * 0.8 + 10; g = g * 0.8 + 10; b = b * 0.8 + 10; }
  rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
}
fs.writeFileSync(out, png(OW, OH, rgb));
console.log('lab', out, W + 'x' + H, 'x' + k);
