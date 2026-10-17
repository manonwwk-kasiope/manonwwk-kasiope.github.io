/* tools/musique/analyse.mjs — analyse precise de « Neon Velocity » (lot 7a).
   node tools/musique/analyse.mjs [source.mp3] [sortie.json]
   Ecrit tools/musique/analyse.json : tempo, premier temps fort, grille des mesures detectees,
   derive, mesures (niveau, bandes, attaques, chroma), tonalite, sections.
   Methode :
   1. enveloppe d'attaque (flux spectral log, bande pleine et bande grave 30-160 Hz), pas de 256 ;
   2. tempo : repliement de l'enveloppe modulo la periode, de 120 a 170 BPM puis au millieme ;
   3. temps fort : parmi les 4 phases, celle ou la grosse caisse et les ruptures de niveau tombent ;
   4. chaque barre est recalee sur l'attaque reelle (montee de l'enveloppe grave a 1 ms pres,
      fenetre de +-25 ms), puis une regression donne BPM, origine et residus (derive) ;
   5. chromagramme (fenetre 8192) et profils de Krumhansl, test dorien (si naturel contre si bemol) ;
   6. sections : niveau RMS par mesure et nouveaute sur la matrice d'auto-similarite. */
import fs from 'node:fs';
import path from 'node:path';
import { ICI, SOURCE, SR, decode, mono, spectro, rmsStereo, dB, arr, regression, mediane, quantile } from './lib.mjs';

const src = process.argv[2] || SOURCE;
const out = process.argv[3] || path.join(ICI, 'analyse.json');
const t0 = Date.now();
const { L, R, n } = decode(src);
const x = mono(L, R);
const duree = n / SR;
console.log('decode', arr(duree, 3), 's', Date.now() - t0, 'ms');

/* ---------- 1. enveloppes d'attaque ---------- */
const N = 2048, HOP = 256, FR = SR / HOP;
const mag = spectro(x, N, HOP);
const nT = mag.length, nb = N / 2 + 1, hz = SR / N;
const kG0 = Math.round(30 / hz), kG1 = Math.round(160 / hz);
const env = new Float32Array(nT), envG = new Float32Array(nT), envA = new Float32Array(nT);
let prev = null;
for (let t = 0; t < nT; t++) {
  const m = mag[t], lg = new Float32Array(nb);
  for (let k = 0; k < nb; k++) lg[k] = Math.log1p(1000 * m[k]);
  if (prev) {
    let f = 0, g = 0, a = 0;
    for (let k = 1; k < nb; k++) {
      const d = lg[k] - prev[k];
      if (d > 0) { f += d; if (k >= kG0 && k <= kG1) g += d; if (k * hz > 4000) a += d; }
    }
    env[t] = f; envG[t] = g; envA[t] = a;
  }
  prev = lg;
}
/* retire la tendance lente (moyenne glissante sur 0,5 s) et garde le positif */
function blanchit(e) {
  const w = Math.round(0.25 * FR), o = new Float32Array(e.length);
  let s = 0; const c = [0]; for (let i = 0; i < e.length; i++) { s += e[i]; c.push(s); }
  for (let i = 0; i < e.length; i++) {
    const a = Math.max(0, i - w), b = Math.min(e.length, i + w + 1);
    o[i] = Math.max(0, e[i] - (c[b] - c[a]) / (b - a));
  }
  return o;
}
const onset = blanchit(env), onsetG = blanchit(envG), onsetA = blanchit(envA);

/* ---------- 2. tempo par repliement ---------- */
function nettete(e, bpm, bins = 96, deb = 0, fin = e.length) {
  const P = 60 / bpm * FR, h = new Float64Array(bins);
  let tot = 0;
  for (let t = deb; t < fin; t++) {
    const v = e[t]; if (!v) continue;
    const ph = ((t / P) % 1) * bins, i0 = Math.floor(ph), f = ph - i0;
    h[i0 % bins] += v * (1 - f); h[(i0 + 1) % bins] += v * f; tot += v;
  }
  let best = 0, bi = 0;
  for (let i = 0; i < bins; i++) {                                 /* lissage sur 3 cases */
    const s = h[(i + bins - 1) % bins] + h[i] + h[(i + 1) % bins];
    if (s > best) { best = s; bi = i; }
  }
  return { score: best / (tot / bins * 3 + 1e-9), phase: bi / bins, h };
}
/* le repliement sur tout le morceau est trop selectif pour un balayage grossier (0,05 BPM d'erreur
   etalent la phase de 0,12 s sur 275 s) : on prend d'abord le pic d'autocorrelation de l'enveloppe
   entre 80 et 160 BPM, puis on affine par repliement au millieme de BPM. */
function autocorr(e, lagMin, lagMax) {
  let m = 0; for (const v of e) m += v; m /= e.length;
  const r = [];
  for (let lag = lagMin; lag <= lagMax; lag++) { let s = 0; for (let i = 0; i + lag < e.length; i++) s += (e[i] - m) * (e[i + lag] - m); r.push([lag, s / (e.length - lag)]); }
  return r;
}
const ac = autocorr(env, Math.floor(60 / 160 * FR), Math.ceil(60 / 80 * FR));
const pics = ac.filter((v, i) => i > 0 && i < ac.length - 1 && v[1] > ac[i - 1][1] && v[1] >= ac[i + 1][1]).sort((a, b) => b[1] - a[1]);
const grossier = pics.slice(0, 5).map(([l, s]) => [60 * FR / l, s]);
const bpm0 = grossier[0][0];
let fin = [];
for (let b = bpm0 * 0.99; b <= bpm0 * 1.01; b += 0.001) fin.push([b, nettete(onset, b, 192).score]);
fin.sort((a, b) => b[1] - a[1]);
const bpmRepli = fin[0][0];
console.log('tempo autocorrelation', arr(bpm0, 2), 'repliement', arr(bpmRepli, 3), 'candidats', grossier.map(g => arr(g[0], 2)));

/* ---------- 3. grille des temps et choix du temps fort ---------- */
const Pb = 60 / bpmRepli;                                            /* periode du temps, s */
const ph = nettete(onsetG, bpmRepli, 192);
let tBeat0 = ph.phase * Pb;                                         /* premier temps (grave) */
/* centre de trame : la trame t est centree sur t*HOP ; une attaque se lit au plus tot a sa trame */
const nBeats = Math.floor((duree - tBeat0) / Pb);
/* force grave et rupture de niveau par phase de mesure */
function valA(e, t) { const i = Math.round(t * FR); let m = 0; for (let k = i - 3; k <= i + 3; k++) if (e[k] > m) m = e[k]; return m; }
const forcePh = [0, 0, 0, 0], ruptPh = [0, 0, 0, 0];
const rmsBeat = [];
for (let b = 0; b < nBeats; b++) {
  const t = tBeat0 + b * Pb;
  rmsBeat.push(dB(rmsStereo(L, R, t * SR, (t + Pb) * SR)));
}
for (let b = 0; b < nBeats; b++) {
  forcePh[b % 4] += valA(onsetG, tBeat0 + b * Pb);
  if (b >= 4 && b + 4 <= nBeats) {
    const av = (rmsBeat[b - 1] + rmsBeat[b - 2] + rmsBeat[b - 3] + rmsBeat[b - 4]) / 4;
    const ap = (rmsBeat[b] + rmsBeat[b + 1] + rmsBeat[b + 2] + rmsBeat[b + 3]) / 4;
    ruptPh[b % 4] += Math.abs(ap - av) > 3 ? Math.abs(ap - av) : 0;
  }
}
const totF = forcePh.reduce((a, b) => a + b), totR = ruptPh.reduce((a, b) => a + b) || 1;
const scorePh = forcePh.map((f, i) => f / totF + ruptPh[i] / totR);
const phFort = scorePh.indexOf(Math.max(...scorePh));
console.log('phases (grave, ruptures)', forcePh.map(v => arr(v / totF, 3)), ruptPh.map(v => arr(v / totR, 3)), '-> temps fort phase', phFort);

/* ---------- 4. recalage de chaque temps sur l'attaque reelle ---------- */
/* enveloppe grave fine (1 ms) : energie filtree passe-bas 160 Hz par un simple biquad */
function passeBas(sig, fc) {
  const w = 2 * Math.PI * fc / SR, q = Math.SQRT1_2, al = Math.sin(w) / (2 * q), c = Math.cos(w);
  const b0 = (1 - c) / 2, b1 = 1 - c, b2 = b0, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const y = new Float32Array(sig.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < sig.length; i++) {
    const v = (b0 * sig[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = sig[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const grave = passeBas(passeBas(x, 160), 160);
const MS = SR / 1000, nMs = Math.floor(n / MS);
const envMs = new Float32Array(nMs);
for (let i = 0; i < nMs; i++) { const a = Math.floor(i * MS), b = Math.floor((i + 1) * MS); let s = 0; for (let k = a; k < b; k++) { const v = grave[k]; s += v * v; } envMs[i] = Math.sqrt(s / (b - a)); }
function attaque(t) {                       /* instant de plus forte montee (en log) a +-25 ms de t */
  const c = Math.round(t * 1000); let best = 0, bi = -1;
  for (let i = c - 25; i <= c + 25; i++) {
    if (i < 4 || i >= nMs) continue;
    const d = Math.log(envMs[i] + 1e-6) - Math.log(envMs[i - 4] + 1e-6);
    if (d > best) { best = d; bi = i; }
  }
  return bi < 0 ? null : { t: (bi - 2) / 1000, force: best, niv: envMs[Math.min(nMs - 1, bi + 10)] };
}
const nivMed = mediane(Array.from(envMs).filter(v => v > 1e-4));
const temps = [];
for (let b = 0; b < nBeats; b++) {
  const t = tBeat0 + b * Pb, a = attaque(t);
  temps.push({ b, t, a: a && a.force > 0.8 && a.niv > 0.3 * nivMed ? a.t : null });
}
const fiables = temps.filter(v => v.a !== null);
let reg = regression(fiables.map(v => v.b), fiables.map(v => v.a));
/* deux passes en ecartant les residus > 12 ms (contretemps, ghost notes) */
for (let pass = 0; pass < 2; pass++) {
  const ok = fiables.filter(v => Math.abs(v.a - (reg.a + reg.b * v.b)) < 0.012);
  reg = regression(ok.map(v => v.b), ok.map(v => v.a));
}
const okF = fiables.filter(v => Math.abs(v.a - (reg.a + reg.b * v.b)) < 0.012);
const residus = okF.map(v => v.a - (reg.a + reg.b * v.b));
const bpm = 60 / reg.b;
console.log('regression : BPM', arr(bpm, 4), 'origine', arr(reg.a, 4), 'temps fiables', okF.length, '/', nBeats,
  'residu p50', arr(quantile(residus.map(Math.abs), 0.5) * 1000, 2), 'ms p95', arr(quantile(residus.map(Math.abs), 0.95) * 1000, 2), 'ms');

/* derive : regression locale par fenetre de 32 temps */
const derive = [];
for (let w = 0; w + 32 <= nBeats; w += 16) {
  const p = okF.filter(v => v.b >= w && v.b < w + 32);
  if (p.length < 12) continue;
  const r = regression(p.map(v => v.b), p.map(v => v.a));
  derive.push({ temps: w, t: arr(reg.a + reg.b * w, 2), bpm: arr(60 / r.b, 3), ecartMs: arr((r.a + r.b * (w + 16) - (reg.a + reg.b * (w + 16))) * 1000, 2) });
}
const bpmsLoc = derive.map(d => d.bpm);
const deriveMax = Math.max(...bpmsLoc.map(v => Math.abs(v - bpm) / bpm * 100));
const ecartMax = Math.max(...derive.map(d => Math.abs(d.ecartMs)));
console.log('derive locale max', arr(deriveMax, 3), '% ; ecart de phase max', ecartMax, 'ms');

/* ---------- grille des mesures ---------- */
const P = reg.b;                                                    /* periode du temps, s */
let bFort = ((phFort - Math.round((reg.a - tBeat0) / P)) % 4 + 4) % 4; /* index de temps du 1er temps fort */
const tPremier = reg.a + bFort * P;                                 /* premier temps fort de la grille >= origine */
/* la mesure 1 commence au premier temps fort dont le niveau est audible ; s'il y a des temps avant
   (levee), ils restent hors grille (mesure 0) */
let m1 = tPremier;
while (m1 - 4 * P > -0.02) m1 -= 4 * P;
const nMes = Math.floor((duree - m1) / (4 * P) + 1e-6);
const barres = []; for (let m = 0; m <= nMes; m++) barres.push(m1 + m * 4 * P);
/* barre detectee : attaque reelle du temps fort quand elle est fiable, sinon la grille */
const barresDet = barres.map((tb, m) => { const a = attaque(tb); return a && a.force > 0.8 && Math.abs(a.t - tb) < 0.012 ? a.t : null; });
console.log('mesure 1 a', arr(m1, 4), 's ; mesures completes', nMes, '; duree de mesure', arr(4 * P, 5), 's');

/* ---------- 5. mesures : niveau, bandes, attaques, chroma ---------- */
const NC = 8192, HC = 2048;
const magC = spectro(x, NC, HC), hzC = SR / NC;
const chromaT = magC.map(m => {
  const c = new Float64Array(12);
  for (let k = Math.ceil(55 / hzC); k < Math.min(m.length, 2000 / hzC); k++) {
    const midi = 69 + 12 * Math.log2(k * hzC / 440), pc = ((Math.round(midi) % 12) + 12) % 12;
    c[pc] += m[k] * m[k];
  }
  return c;
});
function bandes(ta, tb) {                                         /* parts d'energie grave/medium/aigu */
  const i0 = Math.max(0, Math.floor(ta * FR)), i1 = Math.floor(tb * FR); const e = [0, 0, 0];
  for (let t = i0; t < i1 && t < nT; t++) {
    const m = mag[t];
    for (let k = 1; k < nb; k++) { const f = k * hz, v = m[k] * m[k]; e[f < 250 ? 0 : f < 4000 ? 1 : 2] += v; }
  }
  const s = e[0] + e[1] + e[2] + 1e-12; return e.map(v => v / s);
}
const NOMS = ['do', 'do#', 're', 'mib', 'mi', 'fa', 'fa#', 'sol', 'lab', 'la', 'sib', 'si'];
const mesures = [];
for (let m = 0; m < nMes; m++) {
  const ta = barres[m], tb = barres[m + 1];
  const niv = dB(rmsStereo(L, R, ta * SR, tb * SR));
  const i0 = Math.max(0, Math.floor(ta * FR)), i1 = Math.floor(tb * FR);
  let att = 0, attA = 0; for (let t = i0; t < i1; t++) { att += onset[t]; attA += onsetA[t]; }
  const c = new Float64Array(12);
  for (let t = Math.max(0, Math.floor(ta * SR / HC)); t < Math.floor(tb * SR / HC) && t < chromaT.length; t++) for (let k = 0; k < 12; k++) c[k] += chromaT[t][k];
  const cs = c.reduce((a, b) => a + b) || 1;
  /* crete et niveau sur la premiere et la derniere double croche (pour les jointures) */
  const q = P / 4;
  mesures.push({
    m: m + 1, t: arr(ta, 4), tDet: barresDet[m] === null ? null : arr(barresDet[m], 4),
    niveau: arr(niv, 2), bandes: bandes(ta, tb).map(v => arr(v, 3)),
    attaques: arr(att / (i1 - i0), 3), aigus: arr(attA / (i1 - i0), 3),
    chroma: Array.from(c, v => arr(v / cs, 3)),
    debutDb: arr(dB(rmsStereo(L, R, ta * SR, (ta + q) * SR)), 1),
    finDb: arr(dB(rmsStereo(L, R, (tb - q) * SR, tb * SR)), 1),
  });
}

/* tonalite : profils de Krumhansl-Kessler sur le chroma pondere par le niveau */
const KM = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const Km = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const tot = new Float64Array(12);
for (const me of mesures) { const w = 10 ** (me.niveau / 20); me.chroma.forEach((v, k) => tot[k] += v * w); }
const ts = tot.reduce((a, b) => a + b); const chromaG = Array.from(tot, v => v / ts);
function pearson(a, b) { const n = a.length, ma = a.reduce((s, v) => s + v) / n, mb = b.reduce((s, v) => s + v) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); }
const cles = [];
for (let r = 0; r < 12; r++) {
  const rot = p => p.map((_, i) => p[(i - r + 12) % 12]);
  cles.push({ nom: NOMS[r] + ' majeur', r: pearson(chromaG, rot(KM)) });
  cles.push({ nom: NOMS[r] + ' mineur', r: pearson(chromaG, rot(Km)) });
}
cles.sort((a, b) => b.r - a.r);
/* mode : sixte de la tonique mineure (si pour re) naturelle (dorien) ou bemol (eolien) */
const rac = NOMS.indexOf(cles[0].nom.split(' ')[0]);
const sixteMaj = chromaG[(rac + 9) % 12], sixteMin = chromaG[(rac + 8) % 12];
const secondeMaj = chromaG[(rac + 2) % 12], secondeMin = chromaG[(rac + 1) % 12];
console.log('tonalite', cles.slice(0, 4).map(c => c.nom + ' ' + arr(c.r, 3)).join(', '), '; sixte majeure/mineure', arr(sixteMaj, 3), arr(sixteMin, 3));

/* accord dominant de chaque mesure : gabarits de triades majeures et mineures sur le chroma */
const TRI = [];
for (let r = 0; r < 12; r++) { TRI.push({ nom: NOMS[r], notes: [r, (r + 4) % 12, (r + 7) % 12] }); TRI.push({ nom: NOMS[r] + 'm', notes: [r, (r + 3) % 12, (r + 7) % 12] }); }
for (const me of mesures) {
  let best = -1, bn = '';
  for (const tr of TRI) {
    const tmpl = new Array(12).fill(0); tr.notes.forEach((k, i) => tmpl[k] = i === 0 ? 1.2 : 1);
    const r = pearson(me.chroma, tmpl); if (r > best) { best = r; bn = tr.nom; }
  }
  me.accord = bn; me.accordR = arr(best, 2);
}
console.log('accords', mesures.map(me => me.m + ':' + me.accord).join(' '));

/* ---------- 6. sections : nouveaute sur l'auto-similarite (niveau, bandes, chroma) ---------- */
function vecteur(me) { return [me.niveau / 6, me.bandes[0] * 4, me.bandes[1] * 4, me.bandes[2] * 8, me.attaques * 2, me.aigus * 4, ...me.chroma.map(v => v * 6)]; }
const V = mesures.map(vecteur);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const nouveaute = mesures.map((_, m) => {
  const K = 4; let s = 0, c = 0;
  for (let i = Math.max(0, m - K); i < m; i++) for (let j = m; j < Math.min(mesures.length, m + K); j++) { s += dist(V[i], V[j]); c++; }
  return c ? s / c : 0;
});
mesures.forEach((me, i) => me.nouveaute = arr(nouveaute[i], 3));
const seuilNv = quantile(nouveaute, 0.9);
const ruptures = mesures.filter((me, i) => i > 0 && nouveaute[i] >= seuilNv && nouveaute[i] >= nouveaute[i - 1] && nouveaute[i] >= (nouveaute[i + 1] || 0)).map(me => me.m);
console.log('ruptures (nouveaute, decile superieur)', ruptures.join(' '));

const res = {
  source: { fichier: path.relative(path.resolve(ICI, '..', '..', '..'), src), duree: arr(duree, 4), sr: SR },
  methode: 'flux spectral log (2048/256), autocorrelation 80-160 BPM puis repliement au millieme, recalage des temps sur l attaque grave a 1 ms, regression lineaire',
  tempo: {
    bpm: arr(bpm, 4), bpmRepli: arr(bpmRepli, 3), periodeTemps: arr(P, 6), periodeMesure: arr(4 * P, 6),
    tempsFiables: okF.length, tempsTotal: nBeats,
    residuMs: { p50: arr(quantile(residus.map(Math.abs), 0.5) * 1000, 2), p95: arr(quantile(residus.map(Math.abs), 0.95) * 1000, 2), max: arr(Math.max(...residus.map(Math.abs)) * 1000, 2) },
    deriveMaxPct: arr(deriveMax, 4), ecartPhaseMaxMs: ecartMax, derive,
    constant: deriveMax < 0.5,
  },
  tempsFort: { phase: phFort, scores: scorePh.map(v => arr(v, 3)) },
  premiereMesure: arr(m1, 5), nMesures: nMes,
  barres: barres.map(v => arr(v, 5)),
  tonalite: { candidats: cles.slice(0, 6).map(c => ({ nom: c.nom, r: arr(c.r, 3) })), chroma: chromaG.map(v => arr(v, 4)), noms: NOMS,
    sixteMajeure: arr(sixteMaj, 4), sixteMineure: arr(sixteMin, 4), secondeMajeure: arr(secondeMaj, 4), secondeMineure: arr(secondeMin, 4) },
  ruptures, mesures,
  /* attaques retenues (temps n, instant), pour que decoupe.mjs mesure la mesure de chaque bloc */
  attaques: okF.map(v => [v.b, arr(v.a, 5)]),
};
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log('ecrit', out, Date.now() - t0, 'ms');
