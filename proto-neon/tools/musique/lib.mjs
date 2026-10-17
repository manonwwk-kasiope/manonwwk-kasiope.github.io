/* tools/musique/lib.mjs — outils communs aux scripts de la piste (lot 7a).
   Decodage par ffmpeg en flottants 32 bits, FFT radix 2, ecriture WAV, petites statistiques.
   Jamais charge par le jeu. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const PROTO = path.resolve(ICI, '..', '..');               // proto-neon/
export const DEPOT = path.resolve(PROTO, '..');
export const SOURCE = path.join(DEPOT, 'snake2030', 'neonvelocity-2.mp3');
export const SORTIE = path.join(PROTO, 'musique');
export const SR = 44100;                                          // frequence de travail et de sortie

/* Decode un fichier audio en stereo 44,1 kHz (reechantillonnage soxr, 28 bits) : { L, R, n }. ffmpeg retire le retard de l'encodeur
   quand l'en-tete LAME/Xing le donne (c'est le cas de la source et de nos blocs). */
export function decode(fichier, { sr = SR, canaux = 2 } = {}) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', fichier, '-map', '0:a:0',
    '-af', `aresample=${sr}:resampler=soxr:precision=28`, '-ac', String(canaux), '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error('ffmpeg : ' + r.stderr.toString());
  const buf = r.stdout;
  const f = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength >> 2);
  const n = (f.length / canaux) | 0;
  if (canaux === 1) return { L: Float32Array.from(f), R: null, n };
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return { L, R, n };
}

export function mono(L, R) {
  const m = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) m[i] = 0.5 * (L[i] + (R ? R[i] : L[i]));
  return m;
}

/* WAV 32 bits flottants, stereo */
export function ecrisWav(fichier, L, R, sr = SR) {
  const n = L.length, ch = 2, octets = n * ch * 4;
  const b = Buffer.alloc(44 + octets);
  b.write('RIFF', 0); b.writeUInt32LE(36 + octets, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(3, 20); b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * ch * 4, 28); b.writeUInt16LE(ch * 4, 32); b.writeUInt16LE(32, 34);
  b.write('data', 36); b.writeUInt32LE(octets, 40);
  for (let i = 0, o = 44; i < n; i++, o += 8) { b.writeFloatLE(L[i], o); b.writeFloatLE(R[i], o + 4); }
  fs.writeFileSync(fichier, b);
}

/* FFT complexe radix 2 en place */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let l = 2; l <= n; l <<= 1) {
    const ang = -2 * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang), h = l >> 1;
    for (let i = 0; i < n; i += l) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const a = i + k, b = a + h;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

export function hann(n) { const w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n); return w; }

/* Spectrogramme de magnitude : trames centrees sur i*hop */
export function spectro(x, N, hop) {
  const w = hann(N), nT = Math.floor(x.length / hop), nb = N / 2 + 1;
  const re = new Float64Array(N), im = new Float64Array(N);
  const mag = new Array(nT);
  for (let t = 0; t < nT; t++) {
    const c = t * hop - N / 2;
    for (let i = 0; i < N; i++) { const k = c + i; re[i] = (k >= 0 && k < x.length) ? x[k] * w[i] : 0; im[i] = 0; }
    fft(re, im);
    const m = new Float32Array(nb);
    for (let k = 0; k < nb; k++) m[k] = Math.hypot(re[k], im[k]);
    mag[t] = m;
  }
  return mag;
}

export function rms(x, a = 0, b = x.length) {
  let s = 0; a = Math.max(0, a | 0); b = Math.min(x.length, b | 0);
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
}
export function rmsStereo(L, R, a, b) { return Math.sqrt(0.5 * (rms(L, a, b) ** 2 + rms(R, a, b) ** 2)); }
export const dB = v => 20 * Math.log10(Math.max(1e-9, v));
export const arr = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
export function mediane(a) { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; }
export function quantile(a, q) { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

/* Regression lineaire y = a + b x */
export function regression(xs, ys) {
  const n = xs.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
  return { a, b };
}

/* Correlation croisee normalisee : decalage d (en echantillons, |d| <= max) qui aligne y sur x,
   c'est-a-dire x[i] ~ y[i + d]. Affinee a la parabole. */
export function decalage(x, xa, y, ya, long, max) {
  let best = -2, bd = 0; const sc = [];
  for (let d = -max; d <= max; d++) {
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < long; i++) {
      const a = x[xa + i], b = y[ya + i + d] || 0;
      sxy += a * b; sxx += a * a; syy += b * b;
    }
    const c = sxy / Math.sqrt(sxx * syy + 1e-20);
    sc.push(c);
    if (c > best) { best = c; bd = d; }
  }
  const k = bd + max; let fin = bd;
  if (k > 0 && k < sc.length - 1) {
    const y0 = sc[k - 1], y1 = sc[k], y2 = sc[k + 1], den = y0 - 2 * y1 + y2;
    if (den < 0) fin = bd + 0.5 * (y0 - y2) / den;
  }
  return { d: fin, entier: bd, corr: best };
}

/* en-tete Xing/Info : l'extension LAME (chaine d'encodeur « LAME… » ou « Lavc… ») commence 120 octets apres
   « Info » quand les quatre champs sont presents ; retard de l'encodeur (12 bits) et bourrage final
   (12 bits) 21 octets plus loin. */
export function lameTag(buf) {
  const i = Math.max(buf.indexOf('Info'), buf.indexOf('Xing'));
  if (i < 0 || i > 64) return null;
  const drap = buf.readUInt32BE(i + 4);
  if ((drap & 15) !== 15) return null;
  const e = i + 120, enc = buf.toString('latin1', e, e + 9).replace(/\0.*$/, '');
  const o = e + 21, v = (buf[o] << 16) | (buf[o + 1] << 8) | buf[o + 2];
  return { encodeur: enc, retard: v >> 12, bourrage: v & 0xfff, trames: buf.readUInt32BE(i + 8) };
}
