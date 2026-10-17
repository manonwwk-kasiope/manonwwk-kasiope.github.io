/* node tools/sprites2/voir.mjs <planche.png> <k> <sortie.png> [x0 y0 w h]
   Loupe : agrandit ×k une planche indexée (ou une partie) sur un damier sombre, pour regarder les sprites. */
import { lirePNG, ecrireRGB } from './commun.mjs';
const [f, k0, out, x0 = 0, y0 = 0, w0, h0] = process.argv.slice(2);
const p = lirePNG(f), k = +k0, w = +(w0 ?? p.w), h = +(h0 ?? p.h);
const o = new Uint8Array(w * k * h * k * 3);
for (let y = 0; y < h * k; y++) for (let x = 0; x < w * k; x++) {
  const sx = +x0 + (x / k | 0), sy = +y0 + (y / k | 0), i = sy * p.w + sx, d = (y * w * k + x) * 3;
  const dedans = sx < p.w && sy < p.h;
  const c = dedans && p.a[i] ? [p.rgb[i * 3], p.rgb[i * 3 + 1], p.rgb[i * 3 + 2]] : (((sx + sy) & 1) ? [40, 30, 64] : [70, 60, 96]);
  o[d] = c[0]; o[d + 1] = c[1]; o[d + 2] = c[2];
}
ecrireRGB(out, w * k, h * k, o);
