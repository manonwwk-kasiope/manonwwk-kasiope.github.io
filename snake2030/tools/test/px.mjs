// Pixels (G5) : décodage PNG sans dépendance (zlib de Node), capture d'une zone d'écran par CDP et statistiques de
// couleur/luminance. Toutes les positions passées aux aides sont en pixels de l'IMAGE ; une capture rend `pr`
// (pixels d'image par pixel CSS : 1 sur bureau, 3 sur iPhone 13) pour convertir depuis les coordonnées CSS.
import zlib from 'node:zlib';

/** PNG 8 bits non entrelacé (types de couleur 0, 2, 4, 6 — ce que produit Chromium) → { w, h, data: RGBA Uint8Array }. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('pas un PNG');
  let p = 8, w = 0, h = 0, depth = 8, ctype = 6, interlace = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; interlace = d[12]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error('PNG non géré : profondeur ' + depth + ', entrelacé ' + interlace);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (!ch) throw new Error('type de couleur PNG non géré : ' + ctype);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], o = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i++) {
      const x = raw[o + i], a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4, s = x * ch;
      if (ch >= 3) { out[q] = cur[s]; out[q + 1] = cur[s + 1]; out[q + 2] = cur[s + 2]; out[q + 3] = ch === 4 ? cur[s + 3] : 255; }
      else { out[q] = out[q + 1] = out[q + 2] = cur[s]; out[q + 3] = ch === 2 ? cur[s + 1] : 255; }
    }
    const t = prev; prev = cur; cur = t;
  }
  return { w, h, data: out };
}

/** Capture d'une zone du viewport (clip en pixels CSS, entiers) en pixels PHYSIQUES → { w, h, data, clip, pr } ;
 *  pr = w / clip.width (1 sur bureau, 3 sur iPhone 13). Passe par page.screenshot : un Page.captureScreenshot CDP
 *  avec clip remet l'émulation mobile à 800×600 / dpr 1 (mesuré : resize, canvas redimensionné) — jamais ça. Sous
 *  horloge factice en pause, chaque capture reflète l'image que le jeu vient de dessiner (≈ 30 ms bureau, 60 ms iPhone). */
export async function shotClip(ctx, clip) {
  const c = { x: Math.round(clip.x), y: Math.round(clip.y), width: Math.round(clip.width), height: Math.round(clip.height) };
  const buf = await ctx.page.screenshot({ type: 'png', clip: c, scale: 'device', caret: 'initial', animations: 'allow' });
  const img = decodePng(buf);
  img.clip = c; img.pr = img.w / c.width;
  return img;
}

/** Luminance Rec. 709 (0..255). */
export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export function px(img, x, y) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return null;
  const q = (y * img.w + x) * 4; return [img.data[q], img.data[q + 1], img.data[q + 2]];
}
/** Interpolation bilinéaire (positions fractionnaires, pixels d'image) → [r, g, b] ou null hors image. */
export function bilinear(img, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const a = px(img, x0, y0), b = px(img, x0 + 1, y0), c = px(img, x0, y0 + 1), d = px(img, x0 + 1, y0 + 1);
  if (!a || !b || !c || !d) return null;
  const o = [0, 0, 0];
  for (let k = 0; k < 3; k++) o[k] = (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) + (c[k] * (1 - fx) + d[k] * fx) * fy;
  return o;
}
/** Moyenne (r, g, b, l) des pixels d'une boîte pour lesquels pred(x, y, r, g, b) est vrai. */
export function meanWhere(img, x0, y0, x1, y1, pred) {
  let sr = 0, sg = 0, sb = 0, sl = 0, n = 0;
  const X0 = Math.max(0, Math.floor(x0)), Y0 = Math.max(0, Math.floor(y0)), X1 = Math.min(img.w - 1, Math.ceil(x1)), Y1 = Math.min(img.h - 1, Math.ceil(y1));
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const q = (y * img.w + x) * 4, r = img.data[q], g = img.data[q + 1], b = img.data[q + 2];
    if (!pred(x, y, r, g, b)) continue;
    sr += r; sg += g; sb += b; sl += lum(r, g, b); n++;
  }
  return n ? { r: +(sr / n).toFixed(2), g: +(sg / n).toFixed(2), b: +(sb / n).toFixed(2), l: +(sl / n).toFixed(2), n } : { r: 0, g: 0, b: 0, l: 0, n: 0 };
}
/** Moyenne sur un disque de centre (cx, cy) et rayon r (pixels d'image). */
export function meanDisc(img, cx, cy, r) {
  return meanWhere(img, cx - r, cy - r, cx + r, cy + r, (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r);
}
/** Moyenne sur un rectangle [x0, x1] × [y0, y1] (pixels d'image). */
export function meanRect(img, x0, y0, x1, y1) { return meanWhere(img, x0, y0, x1, y1, () => true); }
/** Moyenne sur un anneau [r0, r1] limité au secteur d'angles [a0, a1] (radians, sens écran : x à droite, y en bas).
 *  a0 > a1 n'est pas géré : passer des secteurs ne franchissant pas ±π ou utiliser sectorMeans. */
export function meanAnnulus(img, cx, cy, r0, r1, a0 = -Math.PI, a1 = Math.PI) {
  return meanWhere(img, cx - r1, cy - r1, cx + r1, cy + r1, (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy;
    if (d2 < r0 * r0 || d2 > r1 * r1) return false;
    const a = Math.atan2(dy, dx); return a >= a0 && a < a1;
  });
}
/** Moyennes par secteur angulaire (nb secteurs réguliers, secteur 0 centré sur l'angle 0) sur l'anneau [r0, r1]. */
export function sectorMeans(img, cx, cy, r0, r1, nb = 24) {
  const acc = Array.from({ length: nb }, () => ({ r: 0, g: 0, b: 0, l: 0, n: 0 }));
  const X0 = Math.max(0, Math.floor(cx - r1)), Y0 = Math.max(0, Math.floor(cy - r1)), X1 = Math.min(img.w - 1, Math.ceil(cx + r1)), Y1 = Math.min(img.h - 1, Math.ceil(cy + r1));
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy;
    if (d2 < r0 * r0 || d2 > r1 * r1) continue;
    let k = Math.round(Math.atan2(dy, dx) / (2 * Math.PI) * nb); k = ((k % nb) + nb) % nb;
    const q = (y * img.w + x) * 4, r = img.data[q], g = img.data[q + 1], b = img.data[q + 2];
    const a = acc[k]; a.r += r; a.g += g; a.b += b; a.l += lum(r, g, b); a.n++;
  }
  return acc.map(a => a.n ? { r: +(a.r / a.n).toFixed(2), g: +(a.g / a.n).toFixed(2), b: +(a.b / a.n).toFixed(2), l: +(a.l / a.n).toFixed(2), n: a.n } : { r: 0, g: 0, b: 0, l: 0, n: 0 });
}
/** Profil radial de luminance le long d'un rayon (angle a) : r de r0 à r1 par pas `step` (pixels d'image), bilinéaire. */
export function radialProfile(img, cx, cy, a, r0, r1, step = 0.5) {
  const out = [];
  for (let r = r0; r <= r1; r += step) {
    const c = bilinear(img, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    out.push(c ? lum(c[0], c[1], c[2]) : NaN);
  }
  return out;
}
/** Largeur à mi-hauteur (en pas) du pic d'un profil (valeurs déjà diminuées du fond) ; null si pic < minPeak. */
export function fwhm(prof, minPeak = 10) {
  let im = -1, pm = -Infinity;
  for (let i = 0; i < prof.length; i++) if (prof[i] > pm) { pm = prof[i]; im = i; }
  if (im < 0 || pm < minPeak) return null;
  const half = pm / 2;
  let lo = im, hi = im;
  while (lo > 0 && prof[lo - 1] >= half) lo--;
  while (hi < prof.length - 1 && prof[hi + 1] >= half) hi++;
  // interpolation linéaire aux deux flancs
  const fl = lo > 0 ? (prof[lo] - half) / Math.max(1e-6, prof[lo] - prof[lo - 1]) : 0;
  const fh = hi < prof.length - 1 ? (prof[hi] - half) / Math.max(1e-6, prof[hi] - prof[hi + 1]) : 0;
  return { width: (hi - lo) + fl + fh, peak: pm, at: im };
}
