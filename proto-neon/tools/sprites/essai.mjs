/* tools/sprites/essai.mjs — banc d'essai de cartes de caractères avant de les graver dans 40-sprites.js.
   Usage : node tools/sprites/essai.mjs cartes.mjs sortie.png [k]
   cartes.mjs exporte default = { fond:'vide', lignes: [[carte, carte, ...], ...] } où une carte est un
   tableau de chaînes (légende de 40-sprites.js) ; chaque carte est montrée à 1x, à 2x (le téléphone), et
   l'ensemble est agrandi k fois. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(HERE, '..', '..', 'src', '00-pal.js'), 'utf8'), ctx);
const P = ctx.__N.pal;
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
const def = (await import(pathToFileURL(path.resolve(mod)).href + '?t=' + Date.now())).default;
const k = +kS || 6;
const G = 3;
let W = 0, H = G;
const put = [];
for (const ligne of def.lignes) {
  let x = G, rh = 0;
  for (const carte of ligne) {
    const fond = carte.fond, rows = carte.rows || carte;
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    for (const sc of [1, 2]) { put.push({ rows, x, y: H, sc, fond }); x += w * sc + G; }
    x += G; rh = Math.max(rh, h * 2);
  }
  W = Math.max(W, x); H += rh + G;
}
const buf = new Uint8Array(W * H).fill(P.i(def.fond || 'vide'));
for (const p of put) {
  const w = Math.max(...p.rows.map(r => r.length)), h = p.rows.length;
  if (p.fond) for (let y = -1; y <= h * p.sc; y++) for (let x = -1; x <= w * p.sc; x++) buf[(p.y + y) * W + p.x + x] = P.i(p.fond);
  for (let y = 0; y < h * p.sc; y++) for (let x = 0; x < w * p.sc; x++) {
    const c = (p.rows[(y / p.sc) | 0] || '')[(x / p.sc) | 0];
    const v = LEG[c] || 0;
    if (v) buf[(p.y + y) * W + p.x + x] = v;
  }
}
const OW = W * k, OH = H * k, rgb = Buffer.alloc(OW * OH * 3);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
  const v = buf[((y / k) | 0) * W + ((x / k) | 0)], o = (y * OW + x) * 3;
  rgb[o] = P.R[v]; rgb[o + 1] = P.G[v]; rgb[o + 2] = P.B[v];
}
fs.writeFileSync(out, png(OW, OH, rgb));
console.log('essai', out, W + 'x' + H);
