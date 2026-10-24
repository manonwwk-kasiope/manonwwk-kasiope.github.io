/* tools/sprites/serpent.mjs — le serpent assemblé (tête + segments le long d'un chemin), comme 70-game.js
   le posera, sur trois fonds (vide, grille violette, explosion), à 1x et agrandi.
   Usage : node tools/sprites/serpent.mjs sortie.png [k] [espacement] */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math, Map, Uint8Array, Uint32Array, Float32Array, ArrayBuffer, Array, Object, String, parseInt, isNaN, isFinite };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['00-pal.js', '40-sprites.js']) vm.runInContext(fs.readFileSync(path.join(HERE, '..', '..', 'src', f), 'utf8'), ctx);
const N = ctx.__N, P = N.pal;
function png(w, h, rgb) {
  const T = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; }
  const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
const [out, kS, spS] = process.argv.slice(2);
const K = +kS || 4, SP = +spS || 4.5;
const W = 300, H = 150, buf = new Uint8Array(W * H);
const blit = (s, x, y) => { x = Math.round(x) - s.cx; y = Math.round(y) - s.cy;
  for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const v = s.data[j * s.w + i]; const X = x + i, Y = y + j; if (v && X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = v; } };
// fonds : vide | grille violette | brasier tramé (explosion)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let v = 0;
  if (x >= 100 && x < 200) v = (x % 12 === 0 || y % 12 === 0) ? 3 : 1;
  if (x >= 200) { const d = Math.hypot(x - 250, y - 75); v = d < 30 ? (P.dither(x, y, 1 - d / 40) ? 11 : 10) : d < 60 ? (P.dither(x, y, 1 - (d - 30) / 30) ? 11 : 0) : 0; }
  buf[y * W + x] = v;
}
/* trois serpents : une onde, une diagonale, une boucle serrée */
function serpent(pts, frame) {
  const n = pts.length;
  for (let i = n - 1; i >= 1; i--) { const d = i < 7 ? 9 : i < 15 ? 7 : i < 21 ? 5 : 3; blit(N.spr.make('corps:' + d, i + frame), pts[i][0], pts[i][1]); }
  const a = Math.atan2(pts[0][1] - pts[1][1], pts[0][0] - pts[1][0]);
  blit(N.spr.make('tete:' + N.spr.dir(a), frame), pts[0][0], pts[0][1]);
}
function chemin(f, n) { const pts = []; let t = 0; let [x, y] = f(0); pts.push([x, y]);
  while (pts.length < n && t < 50) { t += 0.002; const [nx, ny] = f(t); if (Math.hypot(nx - pts[pts.length - 1][0], ny - pts[pts.length - 1][1]) >= SP) pts.push([nx, ny]); }
  return pts; }
for (let b = 0; b < 3; b++) {
  const ox = b * 100;
  serpent(chemin(t => [ox + 92 - t * 60, 30 + Math.sin(t * 5) * 10], 26), b);
  serpent(chemin(t => [ox + 20 + t * 55, 60 + t * 55], 22), b + 1);
  serpent(chemin(t => [ox + 50 + Math.cos(t * 4) * 18 - t * 4, 125 + Math.sin(t * 4) * 14], 24), b + 2);
}
const OW = W * K, OH = H * K, rgb = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const v = buf[((y / K) | 0) * W + ((x / K) | 0)], o = (y * OW + x) * 3; rgb[o] = P.R[v]; rgb[o + 1] = P.G[v]; rgb[o + 2] = P.B[v]; }
fs.writeFileSync(out, png(OW, OH, rgb));
console.log('serpent', out);
