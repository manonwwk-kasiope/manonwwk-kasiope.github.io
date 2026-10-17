/* tools/musique/decoupe.mjs — découpe « Neon Velocity » en blocs de 8 mesures (REFONTE.md § 5.7, lot 7a).
   Usage : node proto-neon/tools/musique/decoupe.mjs [--analyse] [--source <mp3>]
     --analyse   mesure seulement (tempo, grille, structure, tonalité), n'écrit rien
   Sans option : mesure, puis écrit proto-neon/musique/nv-NN.mp3 et proto-neon/musique/piste.json.

   Ce que l'outil fait, dans l'ordre :
     1. ffmpeg décode la piste en mono 44,1 kHz (lecture seule de la source) ;
     2. une enveloppe d'attaques (flux positif de l'énergie, pas de 5,8 ms) donne le tempo par ajustement
        de grille (période et phase), puis la dérive locale par fenêtres de 16 mesures ;
     3. la première mesure est choisie parmi les 4 phases possibles de la grille : celle dont la mesure 11
        est le plus nettement un « décollage » (saut de niveau), le plan donnant le décollage à la mesure 11 ;
     4. le niveau RMS de chaque mesure confirme (ou corrige) les sections du § 5.7 ;
     5. un chromagramme (corrélation avec les profils de Krumhansl) confirme la tonalité ;
     6. les blocs sont coupés SUR LES BARRES MESURÉES (pas calculées) avec une mesure de recouvrement de
        chaque côté, encodés MP3 112 kb/s 44,1 kHz stéréo sans pochette ni étiquette ;
     7. piste.json décrit tout : tempo, instant de la première mesure, tonalité, blocs, niveaux, durées de
        mesure mesurées, et, pour chaque bloc, l'instant de sa première attaque forte (le moteur s'en sert
        au chargement pour mesurer le décalage du décodeur). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');                       // proto-neon/
const FF = fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const args = process.argv.slice(2);
const ANALYSE = args.includes('--analyse');
const si = args.indexOf('--source');
const SRC = si >= 0 ? path.resolve(args[si + 1]) : path.resolve(ROOT, '..', 'snake2030', 'neonvelocity-2.mp3');
const OUT = path.join(ROOT, 'musique');
const SR = 44100;

function sh(cmd, argv, opts) {
  const r = spawnSync(cmd, argv, Object.assign({ maxBuffer: 1 << 29 }, opts || {}));
  if (r.status !== 0) { console.error(String(r.stderr || '')); throw new Error(cmd + ' a échoué (' + r.status + ')'); }
  return r.stdout;
}
function decode(file, start, dur) {                      // -> Float32Array mono 44,1 kHz
  const a = ['-v', 'error'];
  if (start != null) a.push('-ss', String(start));
  a.push('-i', file);
  if (dur != null) a.push('-t', String(dur));
  a.push('-ac', '1', '-ar', String(SR), '-f', 'f32le', '-');
  const b = sh(FF, a);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength - (b.byteLength % 4)));
}

/* ------------------------------------------------------------------ enveloppe d'attaques */
const HOP = 256, WIN = 1024;
function enveloppe(x) {
  const n = Math.floor((x.length - WIN) / HOP);
  const e = new Float32Array(n), eL = new Float32Array(n);
  /* bande grave (grosse caisse) : deux passe-bas à une pôle vers 180 Hz */
  const k = 1 - Math.exp(-2 * Math.PI * 180 / SR);
  const lo = new Float32Array(x.length);
  let a = 0, b = 0;
  for (let i = 0; i < x.length; i++) { a += k * (x[i] - a); b += k * (a - b); lo[i] = b; }
  for (let i = 0; i < n; i++) {
    let s = 0, sl = 0;
    for (let j = 0; j < WIN; j += 2) { const v = x[i * HOP + j]; s += v * v; const w = lo[i * HOP + j]; sl += w * w; }
    e[i] = Math.sqrt(s / (WIN / 2)); eL[i] = Math.sqrt(sl / (WIN / 2));
  }
  const flux = (v, comp) => {
    const f = new Float32Array(n);
    for (let i = 1; i < n; i++) { const d = Math.log(1 + comp * v[i]) - Math.log(1 + comp * v[i - 1]); f[i] = d > 0 ? d : 0; }
    return f;
  };
  const fa = flux(e, 60), fl = flux(eL, 60);
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = fa[i] + 1.5 * fl[i];
  return { f, fl, e, n };
}
const FPS = SR / HOP;                                              // images d'enveloppe par seconde

function lisse(f, w) {                                             // moyenne glissante centrée
  const n = f.length, o = new Float32Array(n), h = w >> 1;
  let s = 0;
  for (let i = 0; i < Math.min(n, h); i++) s += f[i];
  for (let i = 0; i < n; i++) {
    if (i + h < n) s += f[i + h];
    if (i - h - 1 >= 0) s -= f[i - h - 1];
    o[i] = s / w;
  }
  return o;
}
function at(f, t) {                                                // lecture interpolée à t secondes
  const p = t * FPS, i = Math.floor(p), r = p - i;
  if (i < 0 || i + 1 >= f.length) return 0;
  return f[i] * (1 - r) + f[i + 1] * r;
}

/* meilleure grille {t0 (phase dans [0,P)), P} : somme de l'enveloppe lissée sur tous les temps */
function ajuste(f, dur, pLo, pHi, pStep) {
  const fs_ = lisse(f, 3);
  let best = { s: -1 };
  for (let P = pLo; P <= pHi; P += pStep) {
    const nph = Math.round(P * FPS);
    for (let q = 0; q < nph; q++) {
      const ph = q / FPS;
      let s = 0;
      for (let t = ph; t < dur - 0.2; t += P) s += at(fs_, t);
      if (s > best.s) best = { s, P, ph };
    }
  }
  return { best, fs_ };
}

/* affine : régression linéaire des attaques les plus proches de la grille (temps k -> instant mesuré) */
function regression(f, grille, dur) {
  const fs_ = lisse(f, 3);
  const pts = [];
  for (let k = 0; ; k++) {
    const t = grille.ph + k * grille.P;
    if (t > dur - 0.3) break;
    let bi = -1, bv = 0;
    const lo = Math.round((t - 0.045) * FPS), hi = Math.round((t + 0.045) * FPS);
    for (let i = Math.max(1, lo); i <= hi && i < fs_.length - 1; i++) if (fs_[i] > bv && fs_[i] >= fs_[i - 1] && fs_[i] >= fs_[i + 1]) { bv = fs_[i]; bi = i; }
    if (bi >= 0) pts.push([k, bi / FPS, bv]);
  }
  /* seuls les temps les plus forts (médiane au-dessus) comptent */
  const vals = pts.map(p => p[2]).sort((a, b) => a - b), med = vals[vals.length >> 1];
  const fort = pts.filter(p => p[2] >= med);
  const n = fort.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [k, y] of fort) { sx += k; sy += y; sxx += k * k; sxy += k * y; }
  const P = (n * sxy - sx * sy) / (n * sxx - sx * sx), t0 = (sy - P * sx) / n;
  let res = 0;
  for (const [k, y] of fort) res = Math.max(res, Math.abs(y - (t0 + P * k)));
  return { P, t0, n, residuMax: res, pts: fort };
}

/* niveau RMS d'une mesure [a,b) en dB, sur le signal mono */
function rmsDB(x, a, b) {
  const i0 = Math.max(0, Math.round(a * SR)), i1 = Math.min(x.length, Math.round(b * SR));
  if (i1 <= i0) return -99;
  let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i];
  return 20 * Math.log10(Math.sqrt(s / (i1 - i0)) + 1e-9);
}

/* chromagramme -> tonalité (profils de Krumhansl-Kessler) */
function tonalite(x) {
  const N = 8192, chroma = new Float64Array(12);
  const re = new Float64Array(N), im = new Float64Array(N);
  const hann = new Float64Array(N); for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let l = 2; l <= n; l <<= 1) {
      const ang = -2 * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang), h = l >> 1;
      for (let i = 0; i < n; i += l) { let cr = 1, ci = 0; for (let k = 0; k < h; k++) { const a = i + k, b = a + h; const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
    }
  }
  for (let s = 0; s + N <= x.length; s += N * 2) {                 // une trame sur deux : assez, et rapide
    for (let i = 0; i < N; i++) { re[i] = x[s + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const f = k * SR / N; if (f < 65 || f > 2000) continue;
      const m = 12 * Math.log2(f / 440) + 69, pc = ((Math.round(m) % 12) + 12) % 12;
      chroma[pc] += re[k] * re[k] + im[k] * im[k];
    }
  }
  const tot = chroma.reduce((a, b) => a + b, 0), c = Array.from(chroma, v => v / tot);
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const corr = (p, r) => { const mp = p.reduce((a, b) => a + b) / 12, mc = c.reduce((a, b) => a + b) / 12; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < 12; i++) { const a = p[(i - r + 12) % 12] - mp, b = c[i] - mc; sxy += a * b; sx += a * a; sy += b * b; } return sxy / Math.sqrt(sx * sy); };
  const NOMS = ['do', 'do#', 'ré', 'ré#', 'mi', 'fa', 'fa#', 'sol', 'sol#', 'la', 'la#', 'si'];
  const cand = [];
  for (let r = 0; r < 12; r++) { cand.push({ tonique: NOMS[r], pc: r, mode: 'majeur', r: corr(MAJ, r) }); cand.push({ tonique: NOMS[r], pc: r, mode: 'mineur', r: corr(MIN, r) }); }
  cand.sort((a, b) => b.r - a.r);
  return { chroma: c.map(v => +v.toFixed(4)), noms: NOMS, meilleurs: cand.slice(0, 4).map(o => ({ tonique: o.tonique, mode: o.mode, r: +o.r.toFixed(3) })) };
}

/* ------------------------------------------------------------------ analyse */
console.log('source : ' + SRC);
const x = decode(SRC);
const dur = x.length / SR;
console.log('durée décodée : ' + dur.toFixed(3) + ' s');
const env = enveloppe(x);

/* 1. grille grossière autour de 144,6 BPM (± 5 BPM), puis fine */
const lo = ajuste(env.f, dur, 60 / 150, 60 / 139, 0.00012);
const fin = ajuste(env.f, dur, lo.best.P - 0.0006, lo.best.P + 0.0006, 0.00001);
const reg = regression(env.f, fin.best, dur);
const beat0 = reg.P, bar0 = beat0 * 4, bpm0 = 60 / beat0;
console.log('grille grossière : ' + (60 / lo.best.P).toFixed(2) + ' BPM ; fine : ' + (60 / fin.best.P).toFixed(3) + ' BPM');
console.log('régression sur ' + reg.n + ' temps forts : période de temps ' + beat0.toFixed(5) + ' s = ' + bpm0.toFixed(3) + ' BPM, mesure ' + bar0.toFixed(5) + ' s, résidu max ' + (reg.residuMax * 1000).toFixed(1) + ' ms');

/* 2. dérive locale : phase de la meilleure grille par fenêtre de 16 mesures, à période fixe */
const derive = [];
{
  const fs_ = lisse(env.f, 3);
  for (let w0 = 0; w0 + 16 * bar0 < dur; w0 += 8 * bar0) {
    let bs = -1, bp = 0;
    const k0 = Math.ceil((w0 - reg.t0) / beat0);
    for (let d = -0.08; d <= 0.08; d += 1 / FPS) {
      let s = 0;
      for (let k = k0; k < k0 + 64; k++) s += at(fs_, reg.t0 + k * beat0 + d);
      if (s > bs) { bs = s; bp = d; }
    }
    derive.push({ debut: +w0.toFixed(1), ecart_ms: +(bp * 1000).toFixed(1) });
  }
}
console.log('dérive locale (écart de phase par fenêtre de 16 mesures) : ' + derive.map(d => d.ecart_ms).join(' '));
const pente = (() => {                                             // dérive de période : pente de l'écart
  const n = derive.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
  derive.forEach(d => { sx += d.debut; sy += d.ecart_ms / 1000; sxx += d.debut * d.debut; sxy += d.debut * d.ecart_ms / 1000; });
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
})();
console.log('pente de la dérive : ' + (pente * 100).toFixed(4) + ' % (seuil de décision : 0,5 %)');

/* 3. REPÈRES DE SECTION. Le plan donne les sections par numéro de mesure sur une grille unique ; la mesure
   montre que cette grille n'existe pas : après le PONT, RESPIRATION et RETOUR sont décalés d'une demi-mesure
   (le RETOUR tombe au temps 410, soit la mesure 103,5 d'une grille continue). On cherche donc les quatre
   repères nets du morceau (décollage, entrée du PONT, entrée du RETOUR, entrée de l'OUTRO) par leurs sauts de
   niveau, on les place sur un nombre ENTIER de temps, et on ajuste (t0, P) par moindres carrés sur eux. */
function niveauTrames(x, pas) {                                    // dB par trame de `pas` s
  const n = Math.floor(x.length / (pas * SR)), o = new Float32Array(n), h = Math.round(pas * SR);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < h; j++) { const v = x[i * h + j]; s += v * v; } o[i] = 10 * Math.log10(s / h + 1e-12); }
  return o;
}
const PAS = 0.01, nv = niveauTrames(x, PAS);
function saut(i, w) {                                              // moyenne des w trames après - avant
  let a = 0, b = 0; for (let k = 1; k <= w; k++) { a += nv[i - k]; b += nv[i + k - 1]; } return (b - a) / w;
}
function repere(t0_, t1_, sens) {                                  // plus grand saut montant (+1) ou descendant (-1) dans [t0_, t1_]
  let bi = -1, bv = -1e9;
  for (let i = Math.round(t0_ / PAS); i < Math.round(t1_ / PAS); i++) { const v = sens * saut(i, 20); if (v > bv) { bv = v; bi = i; } }
  /* affinage : la trame de plus forte variation du niveau, dans ±250 ms (montée : maximum ; chute : minimum) */
  let t = bi * PAS, bd = -1e9;
  for (let i = Math.max(1, bi - 25); i < bi + 25; i++) { const d = sens * (nv[i] - nv[i - 1]); if (d > bd) { bd = d; t = i * PAS; } }
  return { t, saut: bv };
}
const REP = [
  { nom: 'decollage', ...repere(10, 25, +1) },
  { nom: 'pont', ...repere(105, 125, -1) },
  { nom: 'retour', ...repere(160, 180, +1) },
  { nom: 'outro', ...repere(245, 262, -1) }
];
const BEAT0 = 60 / 144.6;                                          // période du plan, pour numéroter les temps
REP.forEach(r => { r.temps = Math.round(r.t / reg.P); });
console.log('repères de section :');
REP.forEach(r => console.log('   ' + r.nom.padEnd(10) + ' t = ' + r.t.toFixed(3) + ' s  (saut ' + r.saut.toFixed(1) + ' dB)  = temps ' + (r.t / reg.P).toFixed(2) + ' -> ' + r.temps));
{
  let sx = 0, sy = 0, sxx = 0, sxy = 0; const n = REP.length;
  REP.forEach(r => { sx += r.temps; sy += r.t; sxx += r.temps * r.temps; sxy += r.temps * r.t; });
  var Pfit = (n * sxy - sx * sy) / (n * sxx - sx * sx), T0fit = (sy - Pfit * sx) / n;
}
console.log('ajustement sur les 4 repères : période de temps ' + Pfit.toFixed(5) + ' s = ' + (60 / Pfit).toFixed(3) + ' BPM ; temps 0 à ' + T0fit.toFixed(4) + ' s');
REP.forEach(r => { r.ecart = r.t - (T0fit + Pfit * r.temps); console.log('   résidu ' + r.nom.padEnd(10) + (r.ecart * 1000).toFixed(1) + ' ms'); });
const residuRep = Math.max.apply(null, REP.map(r => Math.abs(r.ecart)));
const beat = Pfit, bar = beat * 4, bpm = 60 / beat;
const t0 = T0fit;                                                   // instant du temps 0 (= début de la mesure 1)
const tpsT = k => t0 + k * beat;                                    // instant du temps k
const finTemps = Math.floor((dur - t0) / beat);                     // nombre de temps complets dans le fichier
const nBars = Math.floor(finTemps / 4);

/* 4. niveau par mesure de la grille unique (indicatif : le plan numérote ainsi les mesures 1 à 71) */
const niv = [];
for (let m = 1; m <= nBars; m++) niv.push(+rmsDB(x, tpsT((m - 1) * 4), tpsT(m * 4)).toFixed(1));
console.log('mesures de la grille unique : ' + nBars);
for (let m = 1; m <= nBars; m += 10) console.log('  ' + String(m).padStart(3) + '-' + String(Math.min(nBars, m + 9)).padEnd(3) + ' : ' + niv.slice(m - 1, m + 9).map(v => String(v).padStart(6)).join(''));

/* 5. tonalité */
const ton = tonalite(x);
console.log('tonalité (profils de Krumhansl) : ' + ton.meilleurs.map(o => o.tonique + ' ' + o.mode + ' r=' + o.r).join(' ; '));
console.log('chroma : ' + ton.noms.map((n, i) => n + '=' + ton.chroma[i]).join(' '));
const derivePct = Math.abs(pente) * 100;
const deriveMax = Math.max.apply(null, derive.map(d => Math.abs(d.ecart_ms))) / 1000;
const regulier = derivePct <= 0.5 && residuRep <= 0.03;
console.log('tempo ' + (regulier ? 'constant' : 'NON constant') + ' : dérive ' + derivePct.toFixed(4) + ' %, écart de phase max ' + (deriveMax * 1000).toFixed(1) + ' ms, résidu des repères ' + (residuRep * 1000).toFixed(1) + ' ms');
console.log('DÉCISION TEMPO : ' + bpm.toFixed(3) + ' BPM mesurés (le plan annonçait 144,6 : écart ' + (((60 / BEAT0) - bpm) / bpm * 100).toFixed(2) + ' %) ; mesure ' + bar.toFixed(5) + ' s');

if (ANALYSE) { console.log('--analyse : rien n\'est écrit.'); process.exit(0); }

/* ------------------------------------------------------------------ sections et blocs */
/* Les sections sont placées sur des temps ENTIERS de la grille ajustée ci-dessus. Les numéros de mesure sont
   ceux du plan (§ 5.7) : INTRO 1-10, PLATEAU 11-70, PONT 71, RESPIRATION 72-103, RETOUR 104-153, OUTRO 154-165.
   Alignement : PLATEAU sur 11 + 8k, RESPIRATION sur 72 + 8k, RETOUR sur 104 + 8k, INTRO et OUTRO entiers.
   Un dernier bloc plus court (PLATEAU 67-70, RESPIRATION 7,5 mesures, RETOUR 152-153) garde sa vraie durée :
   il est marqué `court` et ne sert jamais de tirage au sort. */
const temps = n => REP.find(r => r.nom === n).temps;
const T_DEC = temps('decollage'), T_PONT = temps('pont'), T_RET = temps('retour'), T_OUT = temps('outro');
const T_FIN = finTemps - (finTemps % 4);                           // fin de la dernière mesure complète
const PLAN = [
  { section: 'INTRO', b0: 0, b1: T_DEC, mesure: 1, entier: true },
  { section: 'PLATEAU', b0: T_DEC, b1: T_PONT, mesure: 11 },
  { section: 'PONT', b0: T_PONT, b1: T_PONT + 4, mesure: 71, pont: true },
  { section: 'RESPIRATION', b0: T_PONT + 4, b1: T_RET, mesure: 72 },
  { section: 'RETOUR', b0: T_RET, b1: T_OUT, mesure: 104 },
  { section: 'OUTRO', b0: T_OUT, b1: T_FIN, mesure: 154, entier: true }
];
const blocs = [];
for (const s of PLAN) {
  if (s.pont) continue;                                            // le PONT est la mesure d'entrée de RESPIRATION, pas un bloc
  if (s.entier) { blocs.push({ section: s.section, b0: s.b0, b1: s.b1, de: s.mesure, court: false }); continue; }
  for (let b = s.b0; b < s.b1; b += 32) {
    const e = Math.min(s.b1, b + 32);
    blocs.push({ section: s.section, b0: b, b1: e, de: s.mesure + (b - s.b0) / 4, court: e - b < 32 });
  }
}

/* Repère d'alignement d'un bloc : l'instant (en s, depuis le début du coeur) de la plus forte montée d'énergie
   dans [0 ; +0,30 s] après le début du coeur. Le MÊME calcul tourne dans 30-music.js sur le tampon décodé,
   dans une fenêtre élargie de 70 ms de chaque côté : l'écart donne le décalage du décodeur (le MP3 ajoute un
   retard d'encodeur que chaque navigateur retire ou non). */
function attaque(sig, sr, t, lo, hi) {
  const w = Math.round(0.003 * sr), h = Math.round(0.001 * sr);
  let best = -1, bi = 0, prev = 0;
  const a = Math.round((t + lo) * sr), b = Math.round((t + hi) * sr);
  for (let i = a; i + w < b; i += h) {
    let e = 0; for (let j = 0; j < w; j += 2) { const v = sig[i + j] || 0; e += v * v; }
    const d = e - prev; prev = e;
    if (i > a && d > best) { best = d; bi = i; }
  }
  return (bi - Math.round(t * sr)) / sr;
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^nv-\d+\.mp3$/.test(f)) fs.unlinkSync(path.join(OUT, f));

const info = [];
let octets = 0;
blocs.forEach((b, i) => {
  const nom = 'nv-' + String(i + 1).padStart(2, '0') + '.mp3';
  const avant = b.b0 >= 4 ? 4 : b.b0;                              // temps de recouvrement avant : une mesure
  const apresMax = b.b1 + 4 <= T_FIN ? 4 : 0;
  const tDeb = tpsT(b.b0 - avant);
  const tFin = apresMax ? tpsT(b.b1 + 4) : dur;                    // le dernier bloc va jusqu'au bout du fichier (queue de réverbération)
  const dd = tFin - tDeb;
  sh(FF, ['-v', 'error', '-y', '-ss', tDeb.toFixed(5), '-t', dd.toFixed(5), '-i', SRC, '-vn', '-map_metadata', '-1',
    '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '112k', '-id3v2_version', '0', '-write_id3v1', '0',
    path.join(OUT, nom)]);
  const taille = fs.statSync(path.join(OUT, nom)).size; octets += taille;
  const coeurDeb = tpsT(b.b0) - tDeb, coeurFin = tpsT(b.b1) - tDeb;
  /* repère d'alignement, relevé sur la SOURCE au coeur du bloc (mono 44,1 kHz) */
  const att = attaque(x, SR, tpsT(b.b0), 0, 0.30);
  const mesuresCoeur = (b.b1 - b.b0) / 4;
  const m0 = Math.floor(tpsT(b.b0) / bar) , niveau = +rmsDB(x, tpsT(b.b0), tpsT(b.b1)).toFixed(1);
  info.push({
    fichier: nom, section: b.section, court: b.court,
    mesures: [b.de, +(b.de + mesuresCoeur - 1).toFixed(1)], temps: [b.b0, b.b1], nMesures: mesuresCoeur,
    avant: avant / 4, apres: apresMax ? 1 : +(((dur - tpsT(b.b1)) / bar)).toFixed(3),    // mesures de recouvrement
    coeurDeb: +coeurDeb.toFixed(5), coeurFin: +coeurFin.toFixed(5), duree: +dd.toFixed(5),
    dureeMesure: +bar.toFixed(5), niveau, attaque: +att.toFixed(4), octets: taille
  });
  console.log(nom + '  ' + b.section.padEnd(11) + ' mesures ' + b.de + '-' + (b.de + mesuresCoeur - 1) + '  ' + dd.toFixed(2) + ' s  ' + niveau + ' dB  repère ' + (att * 1000).toFixed(1) + ' ms  ' + taille + ' o' + (b.court ? '  (court)' : ''));
});

const piste = {
  source: 'snake2030/neonvelocity-2.mp3', titre: 'Neon Velocity',
  bpm: +bpm.toFixed(3), bpmPlan: 144.6, dureeMesure: +bar.toFixed(5), dureeTemps: +beat.toFixed(5),
  premiereMesure: +t0.toFixed(5),
  tempoConstant: regulier, derivePct: +derivePct.toFixed(4), deriveMaxMs: +(deriveMax * 1000).toFixed(1), residuReperesMs: +(residuRep * 1000).toFixed(1),
  mesures: T_FIN / 4,
  tonalite: ton.meilleurs[0], tonaliteAlternatives: ton.meilleurs.slice(1),
  tonique: ton.meilleurs[0].pc, chroma: ton.chroma,
  sections: PLAN.map(s => ({ nom: s.section, de: s.mesure, a: s.mesure + (s.b1 - s.b0) / 4 - 1, temps: [s.b0, s.b1] })),
  pont: { mesure: 71, bloc: 'RESPIRATION' },
  boucles: { intro: { de: 3, a: 10, temps: [8, T_DEC] }, boss: { de: 136, a: 151 } },
  attaqueFenetre: [0, 0.30], attaqueMarge: 0.07,
  format: { codec: 'mp3', kbps: 112, hz: 44100, canaux: 2, pochette: false },
  niveauMesure: niv,
  blocs: info
};
fs.writeFileSync(path.join(OUT, 'piste.json'), JSON.stringify(piste, null, 1) + '\n');
console.log('\n' + info.length + ' blocs, ' + (octets / 1024 / 1024).toFixed(2) + ' Mo au total (' + octets + ' octets) → ' + path.relative(process.cwd(), OUT));
