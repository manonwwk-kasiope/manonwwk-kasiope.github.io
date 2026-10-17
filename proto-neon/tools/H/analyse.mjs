/* tools/H/analyse.mjs — mesure le tempo (par DEUX méthodes indépendantes), la phase des temps, la barre, la durée et
   les points de boucle des morceaux Suno de musique/morceaux/. Aucun son : ffmpeg décode vers un tube, tout se calcule
   dans ce script.
     Méthode A : enveloppe d'attaques (flux spectral large bande), autocorrélation, puis balayage fin « peigne » (tempo + phase)
                 sur tout le morceau.
     Méthode B : intervalles entre les attaques de la grosse caisse (bande < 150 Hz), histogramme, mode, affinage.
   Le piège connu (COORDINATION.md) : deux pulsations du même morceau, rapport 1,25 (143,8 contre 115). Le script rapporte,
   pour chaque morceau, les deux estimations, leur rapport, et le rapport des candidats de la méthode A ; il n'écrit rien
   tant que les deux méthodes ne tombent pas d'accord à 1 % près, à un facteur 2 ou 1/2 près ou à un rapport 1,25 / 1,5 près
   (signalé alors comme AMBIGU et laissé à l'écoute).
   Usage : node proto-neon/tools/H/analyse.mjs [--ecrire]   (--ecrire met à jour morceaux.json : bpm mesuré (bpmFiche garde l'ancien), bpmMin/bpmMax,
   duree, barres = la carte des barres en secondes de fichier, boucle {de, a}) */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(ICI, '../../musique/morceaux');
const FICHE = path.join(DIR, 'morceaux.json');
const ECRIRE = process.argv.includes('--ecrire');
const SR = 22050, N = 1024, HOP = 220, FPS = SR / HOP;       // 100,23 trames par seconde

function pcm(fichier) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', fichier, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-']);
    const parts = []; p.stdout.on('data', d => parts.push(d)); p.on('error', rej);
    p.on('close', c => { if (c) return rej(new Error('ffmpeg ' + c)); const b = Buffer.concat(parts); res(new Int16Array(b.buffer, b.byteOffset, b.length >> 1)); });
  });
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
/* flux spectral : large bande (30 Hz - 8 kHz) et grave (30 - 150 Hz), en log, redressé ; et énergie RMS par trame */
function enveloppes(x) {
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const nt = Math.floor((x.length - N) / HOP), full = new Float32Array(nt), low = new Float32Array(nt), rms = new Float32Array(nt);
  const re = new Float32Array(N), im = new Float32Array(N), kb = f => Math.round(f / SR * N);
  const b0 = kb(30), b1 = kb(8000), l1 = kb(150);
  let prev = new Float32Array(N / 2);
  for (let t = 0; t < nt; t++) {
    let e = 0; for (let i = 0; i < N; i++) { const v = x[t * HOP + i] / 32768; re[i] = v * win[i]; im[i] = 0; e += v * v; }
    rms[t] = Math.sqrt(e / N);
    fft(re, im);
    let f = 0, g = 0;
    for (let k = b0; k < b1; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]) / N * 8), d = m - prev[k];
      if (d > 0) { f += d; if (k <= l1) g += d; }
      prev[k] = m;
    }
    full[t] = f; low[t] = g;
  }
  return { full, low, rms };
}
function normaliser(a) {            // retire la moyenne glissante (1 s) et met à l'échelle
  const n = a.length, o = new Float32Array(n), w = Math.round(FPS), c = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) c[i + 1] = c[i] + a[i];
  let s = 0;
  for (let i = 0; i < n; i++) { const lo = Math.max(0, i - w), hi = Math.min(n, i + w); o[i] = Math.max(0, a[i] - (c[hi] - c[lo]) / (hi - lo)); s += o[i] * o[i]; }
  const k = 1 / Math.sqrt(s / n + 1e-12); for (let i = 0; i < n; i++) o[i] *= k;
  return o;
}
function interp(a, p) { const i = Math.floor(p); if (i < 0 || i + 1 >= a.length) return 0; const f = p - i; return a[i] * (1 - f) + a[i + 1] * f; }

/* méthode A : autocorrélation (candidats) puis balayage peigne fin (tempo et phase sur tout le morceau) */
function methodeA(env) {
  const n = env.length, cands = [];
  const acf = lag => { let s = 0; for (let i = 0; i + lag < n; i++) s += env[i] * env[i + lag]; return s / (n - lag); };
  const lo = Math.floor(FPS * 60 / 200), hi = Math.ceil(FPS * 60 / 70), A = [];
  for (let l = lo; l <= hi; l++) A[l] = acf(l);
  for (let l = lo + 1; l < hi; l++) if (A[l] > A[l - 1] && A[l] >= A[l + 1]) {
    const T = l / FPS; let sc = A[l]; for (const h of [2, 0.5]) { const ll = Math.round(l * h); if (ll >= lo && ll <= hi) sc += 0.5 * A[ll]; }
    cands.push({ bpm: 60 / T, force: sc });
  }
  cands.sort((a, b) => b.force - a.force);
  /* balayage peigne : pour chaque tempo, la somme de l'enveloppe sur les temps, maximisée sur la phase */
  function peigne(b, debut, fin) {
    const T = FPS * 60 / b; let best = -1, bph = 0;
    for (let ph = 0; ph < T; ph += 0.5) { let s = 0, c = 0; for (let p = debut + ph; p < fin; p += T) { s += interp(env, p); c++; } s /= Math.max(1, c); if (s > best) { best = s; bph = ph; } }
    return { score: best, phase: bph };
  }
  const resultats = [];
  for (const c of cands.slice(0, 4)) {
    let bestB = c.bpm, bestS = -1, bestP = 0;
    for (let b = c.bpm * 0.985; b <= c.bpm * 1.015; b += 0.02) { const r = peigne(b, 0, n); if (r.score > bestS) { bestS = r.score; bestB = b; bestP = r.phase; } }
    resultats.push({ bpm: bestB, score: bestS, phase: bestP / FPS, brut: c.bpm });
  }
  resultats.sort((a, b) => b.score - a.score);
  const top = resultats[0];
  /* dérive : le même tempo mesuré sur le premier et le dernier tiers */
  const tiers = [0, 1, 2].map(k => {
    let bs = -1, bb = top.bpm;
    for (let b = top.bpm * 0.99; b <= top.bpm * 1.01; b += 0.02) { const r = peigne(b, Math.floor(n * k / 3), Math.floor(n * (k + 1) / 3)); if (r.score > bs) { bs = r.score; bb = b; } }
    return bb;
  });
  return { bpm: top.bpm, phase: top.phase, score: top.score, candidats: resultats.map(r => +r.bpm.toFixed(2)), tiers: tiers.map(v => +v.toFixed(2)), derivePct: +(100 * (Math.max(...tiers) - Math.min(...tiers)) / top.bpm).toFixed(2) };
}
/* méthode B : attaques de grosse caisse (maxima locaux de l'enveloppe grave), histogramme des intervalles */
function methodeB(low) {
  const n = low.length, pics = [];
  let sd = 0; for (let i = 0; i < n; i++) sd += low[i]; sd /= n;
  for (let i = 2; i < n - 2; i++) if (low[i] > low[i - 1] && low[i] >= low[i + 1] && low[i] > 2.0 * sd && low[i] > low[i - 2] && low[i] >= low[i + 2]) pics.push(i);
  const H = new Float64Array(Math.round(FPS * 1.2) + 2);     // histogramme des intervalles de 0,2 à 1,2 s
  for (let a = 0; a < pics.length; a++) for (let b = a + 1; b < pics.length && b < a + 12; b++) {
    const d = pics[b] - pics[a]; if (d >= FPS * 0.2 && d < H.length) { H[d] += 1; H[d - 1] += 0.5; H[d + 1] += 0.5; }
  }
  /* le mode, puis son affinage : la moyenne des intervalles proches du mode, rapportés à un nombre entier de périodes */
  let m = Math.round(FPS * 0.2), best = 0; for (let d = m; d < H.length - 1; d++) if (H[d] > best) { best = H[d]; m = d; }
  const per = []; for (let a = 0; a < pics.length; a++) for (let b = a + 1; b < pics.length && b < a + 12; b++) {
    const d = pics[b] - pics[a], k = Math.round(d / m); if (k >= 1 && k <= 8 && Math.abs(d / k - m) < m * 0.06) per.push(d / k);
  }
  per.sort((u, v) => u - v);
  const med = per.length ? per[per.length >> 1] : m;
  return { bpm: 60 * FPS / med, attaques: pics.length, intervalles: per.length, picHisto: +(m / FPS).toFixed(3) };
}
function rapport(a, b) { return a > b ? a / b : b / a; }
function accord(a, b) {
  const r = rapport(a, b);
  if (Math.abs(r - 1) < 0.025) return 'identique';
  if (Math.abs(r - 2) < 0.02) return 'facteur 2 (double/moitié)';
  if (Math.abs(r - 1.5) < 0.02) return 'AMBIGU rapport 1,5';
  if (Math.abs(r - 1.25) < 0.02) return 'AMBIGU rapport 1,25';
  if (Math.abs(r - 4 / 3) < 0.02) return 'AMBIGU rapport 4/3';
  return 'DÉSACCORD rapport ' + r.toFixed(3);
}


/* suivi des temps (programmation dynamique, Ellis 2007) : les instants des temps, tempo local libre autour du tempo global.
   Les morceaux Suno ne sont pas calés sur une grille : le tempo y dérive de quelques millièmes à 1 %, ce qui fait 0,5 s d'écart
   en trois minutes pour une grille à tempo constant. Le jeu lit donc la carte des barres, pas un tempo unique. */
function suiviTemps(env, bpm) {
  const n = env.length, T = FPS * 60 / bpm, C = new Float64Array(n), P = new Int32Array(n).fill(-1), alpha = 120;
  for (let t = 0; t < n; t++) {
    let best = 0, bi = -1;
    const a = Math.max(0, Math.round(t - 2 * T)), z = Math.floor(t - 0.5 * T);
    for (let q = a; q <= z; q++) { const s = C[q] - alpha * Math.pow(Math.log((t - q) / T), 2); if (s > best) { best = s; bi = q; } }
    C[t] = env[t] + best; P[t] = bi;
  }
  let t = n - 1, bm = -1; for (let q = Math.max(0, n - Math.round(2 * T)); q < n; q++) if (C[q] > bm) { bm = C[q]; t = q; }
  const beats = []; while (t >= 0) { beats.push(t); t = P[t]; }
  return beats.reverse();
}
/* biais constant entre l'instant de trame et l'attaque réelle : la médiane, sur tous les temps, du maximum de montée de
   l'amplitude (fenêtre de 4 ms) dans ±40 ms ; mesuré en domaine temporel, à pleine résolution */
function biais(x, tempsS) {
  const w = Math.round(0.004 * SR), ds = [];
  const lisse = new Float32Array(x.length); let acc = 0;
  for (let i = 0; i < x.length; i++) { acc += Math.abs(x[i]); if (i >= w) acc -= Math.abs(x[i - w]); lisse[i] = acc / w; }
  for (const tb of tempsS) {
    const c = Math.round(tb * SR), a = Math.max(w, c - Math.round(0.04 * SR)), z = Math.min(x.length - w - 1, c + Math.round(0.04 * SR));
    let bd = -1, bi = c; for (let i = a; i < z; i++) { const d = lisse[i + 12] - lisse[i - 12]; if (d > bd) { bd = d; bi = i; } }
    ds.push((bi - c) / SR);
  }
  ds.sort((p, q) => p - q);
  return ds[ds.length >> 1] || 0;
}

/* lissage robuste des temps : régression linéaire locale (±12 temps), poids de Huber (sigma 15 ms). Efface la gigue d'une trame
   (10 ms) et les temps égarés des passages sans percussion, en gardant les vraies dérives (voix-plus-vite accélère de 4 %). */
function lisserTemps(t) {
  const out = new Array(t.length);
  for (let i = 0; i < t.length; i++) {
    const a = Math.max(0, i - 12), z = Math.min(t.length - 1, i + 12);
    let A = t[i], B = 0, w = [];
    for (let j = a; j <= z; j++) w[j - a] = 1;
    for (let it = 0; it < 4; it++) {
      let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let j = a; j <= z; j++) { const ww = w[j - a], x = j - i; sw += ww; sx += ww * x; sy += ww * t[j]; sxx += ww * x * x; sxy += ww * x * t[j]; }
      const den = sw * sxx - sx * sx; B = den ? (sw * sxy - sx * sy) / den : 0; A = (sy - B * sx) / sw;
      for (let j = a; j <= z; j++) { const r = t[j] - (A + B * (j - i)); w[j - a] = 1 / (1 + (r / 0.015) * (r / 0.015)); }
    }
    out[i] = A;
  }
  return out;
}

const fiche = JSON.parse(fs.readFileSync(FICHE, 'utf8'));
const sortie = [];
for (const m of fiche.morceaux) {
  const x = await pcm(path.join(DIR, m.fichier));
  const { full, low, rms } = enveloppes(x);
  const ef = normaliser(full), el = normaliser(low);
  const A = methodeA(ef), A2 = methodeA(el), B = methodeB(el);
  /* le tempo retenu : la méthode A large bande ; la méthode B et la méthode A sur le grave le contrôlent */
  const bpm = A.bpm;
  const T = 60 / bpm;
  /* temps : suivi dynamique autour du tempo de A, sur l'enveloppe large bande + grave ; barres = un temps sur 4,
     la phase de la barre étant celle où l'énergie grave est la plus forte */
  const env2 = new Float32Array(ef.length); for (let i = 0; i < env2.length; i++) env2[i] = ef[i] + el[i];
  const bt = suiviTemps(env2, bpm).map(f => (f * HOP + N * 0.5) / SR);
  const dec = biais(x, bt);
  const brutT = bt.map(v => v + dec), temps = lisserTemps(brutT);
  const ecartLissage = Math.max(...temps.map((v, i) => Math.abs(v - brutT[i])));
  const som = [0, 0, 0, 0];
  temps.forEach((tb, k) => { som[k % 4] += interp(el, (tb - N * 0.5 / SR - dec) * FPS); });
  const kBarre = som.indexOf(Math.max(...som));
  const barres = []; for (let k = kBarre; k < temps.length; k += 4) barres.push(+temps[k].toFixed(3));
  const debutBarre = barres[0], barD = (barres[barres.length - 1] - barres[0]) / (barres.length - 1);
  const dBar = barres.slice(1).map((v, i) => v - barres[i]), dMed = dBar.slice().sort((p, q) => p - q)[dBar.length >> 1];
  const bpmLoc = dBar.map(d => 240 / d);
  const ecartMax = Math.max(...dBar.map(d => Math.abs(d / dMed - 1)));
  const duree = x.length / SR;
  /* niveau par barre (RMS, dB) pour le plan du morceau et les points de boucle */
  const nBar = barres.length - 1, db = [];
  const rc = new Float64Array(rms.length + 1); for (let i = 0; i < rms.length; i++) rc[i + 1] = rc[i] + rms[i] * rms[i];
  for (let b = 0; b < nBar; b++) {
    const a = Math.max(0, Math.round(barres[b] * FPS)), z = Math.min(rms.length, Math.round(barres[b + 1] * FPS));
    db.push(10 * Math.log10((rc[z] - rc[a]) / Math.max(1, z - a) + 1e-12));
  }
  const tri = db.slice().sort((a, b) => a - b), med = tri[tri.length >> 1];
  /* boucle : de la première barre (multiple de 4) dont le niveau lissé sur 4 barres dépasse la médiane − 2 dB, à la dernière barre
     (multiple de 4) avant que le niveau lissé ne retombe sous la médiane − 3 dB pour de bon */
  const lis = db.map((_, i) => { let s = 0, c = 0; for (let j = i; j < Math.min(db.length, i + 4); j++) { s += db[j]; c++; } return s / c; });
  let b0 = 0; while (b0 < lis.length && lis[b0] < med - 2) b0++; b0 = Math.ceil(b0 / 4) * 4;
  let b1 = lis.length - 1; while (b1 > b0 && lis[b1] < med - 3) b1--; b1 = Math.floor((b1 + 1) / 4) * 4;
  const r = {
    id: m.id, declare: m.bpm, A: +A.bpm.toFixed(2), A_grave: +A2.bpm.toFixed(2), B: +B.bpm.toFixed(2),
    candidatsA: A.candidats, tiersA: A.tiers, derivePct: A.derivePct,
    accordAB: accord(A.bpm, B.bpm), accordAAgrave: accord(A.bpm, A2.bpm), accordDeclare: accord(A.bpm, m.bpm),
    phase: +A.phase.toFixed(3), biaisMs: +(dec * 1000).toFixed(1), kBarre, debutBarre, duree: +duree.toFixed(2), barD: +barD.toFixed(4), bpmMoyenBarres: +(240 / barD).toFixed(2), bpmBarresMin: +Math.min(...bpmLoc).toFixed(1), bpmBarresMax: +Math.max(...bpmLoc).toFixed(1), ecartBarreMaxPct: +(100 * ecartMax).toFixed(1), lissageMaxMs: +(1000 * ecartLissage).toFixed(0), barres,
    mesures: nBar, medianeDb: +med.toFixed(1), boucle: { deBarre: b0, aBarre: b1, de: barres[b0], a: barres[Math.min(b1, barres.length - 1)] },
    plan: db.map(v => Math.round(v))
  };
  sortie.push(r);
  console.log(JSON.stringify({ ...r, plan: undefined, barres: undefined, nbBarres: r.barres.length }));
  console.log('   plan (dB par barre) : ' + r.plan.join(' '));
}
fs.writeFileSync(path.join(ICI, 'analyse.json'), JSON.stringify(sortie, null, 1));
if (ECRIRE) {
  for (const r of sortie) {
    const m = fiche.morceaux.find(q => q.id === r.id);
    if (!/^identique|^facteur/.test(r.accordAB) && !/^identique/.test(r.accordAAgrave)) { console.log('NON ÉCRIT (méthodes en désaccord) : ' + r.id); continue; }
    if (m.bpmFiche === undefined) m.bpmFiche = m.bpm;                 // le tempo annoncé par la fiche d'origine, gardé pour mémoire
    m.bpm = +r.bpmMoyenBarres.toFixed(1); m.bpmMesure = m.bpm; m.bpmMin = r.bpmBarresMin; m.bpmMax = r.bpmBarresMax; m.duree = r.duree; m.barres = r.barres;
    m.boucle = { de: r.boucle.de, a: r.boucle.a };
  }
  fs.writeFileSync(FICHE, JSON.stringify(fiche, null, 2) + '\n');
  console.log('morceaux.json mis à jour');
}
