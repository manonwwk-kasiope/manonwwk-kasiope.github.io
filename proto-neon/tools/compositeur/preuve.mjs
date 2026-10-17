/* PREUVE du moteur musical. Tout est mesure sur la sortie rendue, jamais sur l'etat interne.
   Le rendu hors ligne utilise le MEME build() que le jeu : ce qui est mesure est ce qui est joue.
     (a) non-repetition : aucune fenetre de 4 s identique a une autre a moins de 1 % pres
     (b) le RMS croit avec la tension
     (c) ecart en dB entre un son d'information et la musique
     (d) reproductibilite a graine fixe : deux rendus identiques au bit
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HOP = 0.05;              // enveloppe RMS a 20 Hz
const WIN = 4.0;               // fenetre de comparaison
const STRIDE = 0.25;           // pas de glissement des fenetres
const only = process.argv[2] || 'tout';

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
/* on mesure index.html si il demarre ; sinon le banc, qui est le meme bundle plus la ligne
   de prologue absente de 05-art.js (voir banc.mjs). Dans les deux cas : sources reelles. */
let URL_JEU = 'http://127.0.0.1:8112/proto-neon/index.html';
await p.goto(URL_JEU, { waitUntil: 'load' });
let ok = await p.evaluate(() => typeof (window.__N || {}).reseed === 'function');
if (!ok) {
  console.log('!! index.html ne demarre pas (05-art.js, non ma propriete) — mesure sur le banc equivalent');
  errs.length = 0;
  URL_JEU = 'http://127.0.0.1:8112/proto-neon/tools/compositeur/banc.html';
  await p.goto(URL_JEU, { waitUntil: 'load' });
  ok = await p.evaluate(() => typeof (window.__N || {}).reseed === 'function');
  if (!ok) { console.log('le banc non plus : arret'); await b.close(); process.exit(2); }
}
console.log('mesure sur ' + URL_JEU);
await p.evaluate(() => { window.__N.reseed(2084); });

/* enveloppe RMS calculee dans la page : on ne transporte pas 16 M d'echantillons */
await p.evaluate(() => {
  window.__env = async function (sec, tenSrc, events, mute, hop) {
    let ten = null;
    if (tenSrc !== null && tenSrc !== undefined) {
      const v = (typeof tenSrc === 'number') ? tenSrc : eval(tenSrc);
      ten = (typeof v === 'function') ? v : (() => v);
    }
    const buf = await window.__N.music.renderOffline(sec, ten, events, 44100, mute);
    const bars = (window.__N.music.lastBars || []).slice();
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const n = buf.length, step = Math.round(buf.sampleRate * hop), frames = Math.floor(n / step);
    const env = new Array(frames); let peak = 0, tot = 0;
    for (let f = 0; f < frames; f++) {
      let s = 0;
      for (let i = f * step; i < (f + 1) * step; i++) {
        const v = (L[i] + R[i]) * 0.5; s += v * v;
        const a = Math.abs(v); if (a > peak) peak = a;
      }
      env[f] = Math.sqrt(s / step); tot += s;
    }
    return { env, peak, rms: Math.sqrt(tot / (frames * step)), sr: buf.sampleRate, bars };
  };
  /* RMS sur une tranche de temps, mesure sur les echantillons rendus */
  window.__slice = async function (sec, tenSrc, events, mute, a, c) {
    let ten = null;
    if (tenSrc !== null && tenSrc !== undefined) {
      const v = (typeof tenSrc === 'number') ? tenSrc : eval(tenSrc);
      ten = (typeof v === 'function') ? v : (() => v);
    }
    const buf = await window.__N.music.renderOffline(sec, ten, events, 44100, mute);
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const i0 = Math.round(a * buf.sampleRate), i1 = Math.min(buf.length, Math.round(c * buf.sampleRate));
    let s = 0, pk = 0;
    for (let i = i0; i < i1; i++) { const v = (L[i] + R[i]) * 0.5; s += v * v; const q = Math.abs(v); if (q > pk) pk = q; }
    return { rms: Math.sqrt(s / (i1 - i0)), peak: pk };
  };
  window.__raw = async function (sec, tenSrc) {
    const ten = tenSrc === null ? null : (() => tenSrc);
    const buf = await window.__N.music.renderOffline(sec, ten, null, 44100, null);
    return Array.from(buf.getChannelData(0).slice(0, 400000));
  };
});

const norm = v => { const n = Math.hypot(...v) || 1e-12; return n; };
function pearson(a, c) {
  const n = a.length; let ma = 0, mc = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mc += c[i]; } ma /= n; mc /= n;
  let sa = 0, sc = 0, sac = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = c[i] - mc; sa += x * x; sc += y * y; sac += x * y; }
  return sac / (Math.sqrt(sa * sc) || 1e-12);
}
/* deux fenetres sont "identiques a moins de 1 % pres" si la distance L2 relative de leurs
   enveloppes est sous 0,01. On ne compare que des fenetres DISJOINTES : deux fenetres qui se
   chevauchent partagent leurs echantillons et seraient correlees sans rien prouver. */
function analyse(env, label) {
  const wf = Math.round(WIN / HOP), sf = Math.round(STRIDE / HOP);
  const starts = [];
  for (let f = 0; f + wf <= env.length; f += sf) starts.push(f);
  const W = starts.map(f => env.slice(f, f + wf));
  const NM = W.map(norm);
  let minD = Infinity, maxR = -Infinity, argD = null, argR = null, nPairs = 0, under1 = 0;
  for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) {
    if ((starts[j] - starts[i]) * HOP < WIN) continue;          // disjointes seulement
    nPairs++;
    let s = 0; const A = W[i], B = W[j];
    for (let k = 0; k < wf; k++) { const d = A[k] - B[k]; s += d * d; }
    const d = Math.sqrt(s) / (0.5 * (NM[i] + NM[j]));
    if (d < 0.01) under1++;
    if (d < minD) { minD = d; argD = [starts[i] * HOP, starts[j] * HOP]; }
    const r = pearson(A, B);
    if (r > maxR) { maxR = r; argR = [starts[i] * HOP, starts[j] * HOP]; }
  }
  return { label, fenetres: W.length, paires: nPairs, distMin: minD, distMinA: argD,
           sous1pc: under1, corrMax: maxR, corrMaxA: argR };
}
function barStats(bars) {
  const seen = new Map(); let maxRun = 1, run = 1;
  for (let i = 0; i < bars.length; i++) {
    seen.set(bars[i], (seen.get(bars[i]) || 0) + 1);
    if (i && bars[i] === bars[i - 1]) { run++; if (run > maxRun) maxRun = run; } else run = 1;
  }
  let maxOcc = 0, maxSig = '';
  for (const [k, v] of seen) if (v > maxOcc) { maxOcc = v; maxSig = k; }
  return { mesures: bars.length, distinctes: seen.size, repetitionsConsecutivesMax: maxRun,
           occurrenceMaxDUneEmpreinte: maxOcc };
}

const R = {};
if (only === 'tout' || only === 'a') {
  const cas = [
    ['tension 0,00 constante (2 couches : le cas le plus pauvre)', '0'],
    ['tension 1,00 constante (4 couches : le cas le plus dense)', '1'],
    ['montee de jeu : 0 a 1 en 120 s puis tenue', '(t)=>Math.min(1,t/120)']
  ];
  for (const [label, src] of cas) {
    const r = await p.evaluate(([s, src, hop]) => window.__env(s, src, null, null, hop), [180, src, HOP]);
    const A = analyse(r.env, label);
    const B = barStats(r.bars);
    R[label] = { ...A, ...B, rmsGlobal: r.rms, creteGlobale: r.peak };
    console.log('\n(a) ' + label);
    console.log('    fenetres de 4 s comparees : ' + A.fenetres + ' -> ' + A.paires + ' paires disjointes');
    console.log('    distance L2 relative MINIMALE : ' + (A.distMin * 100).toFixed(2) + ' %   (seuil : > 1 %)  a t=' + A.distMinA.map(x => x.toFixed(2)).join(' s et t=') + ' s');
    console.log('    paires sous 1 % : ' + A.sous1pc);
    console.log('    correlation de Pearson MAXIMALE : ' + A.corrMax.toFixed(4) + '   a t=' + A.corrMaxA.map(x => x.toFixed(2)).join(' s et t=') + ' s');
    console.log('    mesures : ' + B.mesures + ', empreintes distinctes : ' + B.distinctes +
      ', repetitions consecutives max : ' + B.repetitionsConsecutivesMax +
      ', occurrence max d\'une empreinte : ' + B.occurrenceMaxDUneEmpreinte);
    console.log('    RMS global ' + r.rms.toFixed(4) + '  crete ' + r.peak.toFixed(4));
  }
}

if (only === 'tout' || only === 'b') {
  console.log('\n(b) le RMS croit avec la tension — rendus separes de 16 s, mesure sur [4 s, 16 s]');
  const out = [];
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    const r = await p.evaluate(([v]) => window.__slice(16, v, null, null, 4, 16), [v]);
    out.push({ tension: v, rms: r.rms, dBFS: 20 * Math.log10(r.rms), crete: r.peak });
    console.log('    tension ' + v.toFixed(2) + '  RMS ' + r.rms.toFixed(5) +
      '  (' + (20 * Math.log10(r.rms)).toFixed(2) + ' dBFS)  crete ' + r.peak.toFixed(4));
  }
  let mono = true; for (let i = 1; i < out.length; i++) if (out[i].rms <= out[i - 1].rms) mono = false;
  console.log('    monotone croissante : ' + (mono ? 'OUI' : 'NON'));
  R.tension = { out, monotone: mono };

  console.log('    montee continue, RMS par tranches de 20 s (critere 6) :');
  const r2 = await p.evaluate(([hop]) => window.__env(120, '(t)=>Math.min(1,t/100)', null, null, hop), [HOP]);
  const tr = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.round(k * 20 / HOP), c = Math.round((k + 1) * 20 / HOP);
    let s = 0; for (let i = a; i < c; i++) s += r2.env[i] * r2.env[i];
    tr.push(Math.sqrt(s / (c - a)));
  }
  let m2 = true; for (let i = 1; i < tr.length; i++) if (tr[i] <= tr[i - 1]) m2 = false;
  console.log('      ' + tr.map(x => x.toFixed(4)).join('  ') + '  -> monotone : ' + (m2 ? 'OUI' : 'NON'));
  R.tranches20s = { tr, monotone: m2 };
}

if (only === 'tout' || only === 'c') {
  console.log('\n(c) ecart en dB : son d\'information contre musique, tension 1,00 (musique au plus fort)');
  const lignes = [];
  for (const [nom, dur, opts] of [['kill', 0.30, { pitch: 0 }], ['bigkill', 1.30, {}],
    ['tir', 0.10, {}], ['butin', 0.28, {}], ['degat', 0.45, {}], ['defi', 0.70, {}]]) {
    const ev = [{ t: 6.0, name: nom, opts }];
    const a = 6.0, c = 6.0 + dur;
    const mus = await p.evaluate(([a, c]) => window.__slice(10, 1, null, 'sfx', a, c), [a, c]);
    const duck = await p.evaluate(([ev, a, c]) => window.__slice(10, 1, ev, 'sfx', a, c), [ev, a, c]);
    const son = await p.evaluate(([ev, a, c]) => window.__slice(10, 1, ev, 'music', a, c), [ev, a, c]);
    const gBus = 20 * Math.log10(son.rms / mus.rms);
    const gEff = 20 * Math.log10(son.rms / duck.rms);
    const dDuck = 20 * Math.log10(duck.rms / mus.rms);
    lignes.push({ nom, gBus, gEff, dDuck, rmsSon: son.rms, rmsMus: mus.rms });
    console.log('    ' + nom.padEnd(8) + ' musique ' + mus.rms.toFixed(4) + '  son ' + son.rms.toFixed(4) +
      '  -> ecart ' + gBus.toFixed(2) + ' dB   (esquive ' + dDuck.toFixed(2) + ' dB, ecart percu ' + gEff.toFixed(2) + ' dB)');
  }
  R.ecarts = lignes;
  console.log('    kill monte d\'un demi-ton par palier :');
  for (const q of [0, 1, 2, 5]) {
    const ev = [{ t: 6.0, name: 'kill', opts: { pitch: q } }];
    const s = await p.evaluate(([ev]) => window.__slice(10, 1, ev, 'music', 6.0, 6.3), [ev]);
    console.log('      palier ' + q + ' : RMS ' + s.rms.toFixed(4));
  }
}

if (only === 'tout' || only === 'd') {
  console.log('\n(d) reproductibilite a graine fixe');
  const d = await p.evaluate(async () => {
    const a = await window.__raw(20, 1), c = await window.__raw(20, 1);
    let m = 0; for (let i = 0; i < a.length; i++) { const q = Math.abs(a[i] - c[i]); if (q > m) m = q; }
    return { n: a.length, max: m };
  });
  console.log('    deux rendus consecutifs, ' + d.n + ' echantillons : ecart max ' + d.max);
  const d2 = await p.evaluate(async () => {
    window.__N.reseed(777); const a = await window.__raw(8, 1);
    window.__N.reseed(2084); const c = await window.__raw(8, 1);
    let m = 0, n = Math.min(a.length, c.length);
    for (let i = 0; i < n; i++) { const q = Math.abs(a[i] - c[i]); if (q > m) m = q; }
    return m;
  });
  console.log('    graine 777 contre graine 2084 : ecart max ' + d2.toFixed(4) + ' (doit etre non nul)');
  await p.evaluate(() => window.__N.reseed(2084));
  R.repro = { identique: d.max === 0, graineDifferente: d2 > 0 };
}

console.log('\nerreurs de console pendant toute la campagne : ' + (errs.length ? JSON.stringify(errs) : '0'));
await b.close();
