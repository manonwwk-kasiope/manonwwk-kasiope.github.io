// Assemble des captures PNG en une planche (colonnes), pour les regarder d'un coup.
import { decode, encode } from './png.mjs';
const [out, cols, ...files] = process.argv.slice(2);
const ims = files.map(f => decode(f)), C = +cols, w = Math.max(...ims.map(i => i.w)), h = Math.max(...ims.map(i => i.h)), g = 6;
const R = Math.ceil(ims.length / C), OW = C * (w + g), OH = R * (h + g), o = new Uint8Array(OW * OH * 4);
ims.forEach((im, k) => { const ox = (k % C) * (w + g), oy = Math.floor(k / C) * (h + g);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const s = (y * im.w + x) * 4, d = ((oy + y) * OW + ox + x) * 4; o[d] = im.rgba[s]; o[d + 1] = im.rgba[s + 1]; o[d + 2] = im.rgba[s + 2]; o[d + 3] = 255; } });
for (let i = 3; i < o.length; i += 4) o[i] = 255;
encode(out, OW, OH, o); console.log(out, OW + 'x' + OH);
