/* tools/sprites/rotessai.mjs — essaie des cartes orientées vers la droite dans les seize directions,
   par la même rotation que 40-sprites.js. Usage : node tools/sprites/rotessai.mjs cartes.mjs sortie.png [k]
   cartes.mjs exporte default = [carte, carte, ...] (tableaux de chaînes, légende de 40-sprites.js). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math, Map, Uint8Array, Uint32Array, Float32Array, ArrayBuffer, Array, Object, String, parseInt, isNaN, isFinite };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['00-pal.js', '40-sprites.js']) vm.runInContext(fs.readFileSync(path.join(HERE, '..', '..', 'src', f), 'utf8'), ctx);
const N = ctx.__N, P = N.pal;
const LEG = { '.': 0, ' ': 0, o: 15, n: 1, d: 2, v: 3, i: 4, m: 5, r: 6, c: 7, p: 8, a: 9, j: 10, b: 11, w: 12, g: 13, s: 14 };
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
const [mod, out, kS] = process.argv.slice(2);
const maps = (await import(pathToFileURL(path.resolve(mod)).href + '?t=' + Date.now())).default;
const K = +kS || 5, G = 2;
const sprites = maps.map(rows => { const w = rows[0].length, h = rows.length, d = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((c, x) => d[y * w + x] = LEG[c] || 0)); return { w, h, data: d, cx: (w - 1) >> 1, cy: (h - 1) >> 1 }; });
const cell = Math.max(...sprites.map(s => Math.max(s.w, s.h))) + G;
const W = 16 * cell + G, H = sprites.length * cell * 1 + G;
const buf = new Uint8Array(W * H).fill(0);
sprites.forEach((s, j) => { for (let k = 0; k < 16; k++) { const r = N.spr.rotate(s, k);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const v = r.data[y * r.w + x]; if (v) buf[(G + j * cell + y) * W + G + k * cell + x] = v; } } });
const OW = W * K, OH = H * K, rgb = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const v = buf[((y / K) | 0) * W + ((x / K) | 0)], o = (y * OW + x) * 3; rgb[o] = P.R[v]; rgb[o + 1] = P.G[v]; rgb[o + 2] = P.B[v]; }
fs.writeFileSync(out, png(OW, OH, rgb));
console.log('rotessai', out);
