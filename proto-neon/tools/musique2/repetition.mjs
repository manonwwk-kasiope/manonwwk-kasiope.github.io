/* tools/musique2/repetition.mjs — la regle d'or et la montee, sur la sortie rendue par le meme moteur.
   (5) trois minutes hors ligne : aucune fenetre de 4 s identique a une autre a moins de 1 % pres
       (distance L2 relative des enveloppes RMS a 20 Hz, fenetres disjointes seulement), et jamais plus
       de deux mesures consecutives de meme empreinte ; tension 0 (le cas le plus pauvre), 1, et montee.
   (6) RMS de la musique par tranches de 20 s sur la courbe de tension REELLE de flux.json, trois graines.
   (r) reproductibilite : deux rendus a graine egale identiques a l'echantillon pres.
   Usage : node tools/musique2/repetition.mjs */
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HERE = new URL('.', import.meta.url).pathname;
const F = JSON.parse(fs.readFileSync(HERE + 'flux.json', 'utf8'));
const HOP = 0.05, WIN = 4.0, STRIDE = 0.25;

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.goto('http://127.0.0.1:8112/proto-neon/tools/musique2/index.html', { waitUntil: 'load' });
await p.waitForFunction(() => window.__N && window.__N.music && window.__N.reseed);
await p.evaluate(() => {
  window.__env = async function (sec, ten, seed, hop) {
    window.__N.reseed(seed);
    const buf = await window.__N.music.renderOffline(sec, ten, null, 44100, 'sfx');
    const L = buf.getChannelData(0), R = buf.getChannelData(1), step = Math.round(buf.sampleRate * hop), fr = Math.floor(buf.length / step);
    const env = new Array(fr);
    for (let f = 0; f < fr; f++) { let s = 0; for (let i = f * step; i < (f + 1) * step; i++) { const v = (L[i] + R[i]) * 0.5; s += v * v; } env[f] = Math.sqrt(s / step); }
    return { env, bars: (window.__N.music.lastBars || []).slice() };
  };
});

function analyse(env) {
  const wf = Math.round(WIN / HOP), sf = Math.round(STRIDE / HOP), starts = [];
  for (let f = 0; f + wf <= env.length; f += sf) starts.push(f);
  const W = starts.map(f => env.slice(f, f + wf)), NM = W.map(v => Math.hypot(...v) || 1e-12);
  let minD = Infinity, arg = null, n = 0, sous = 0;
  for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) {
    if ((starts[j] - starts[i]) * HOP < WIN) continue;
    n++; let s = 0; for (let k = 0; k < wf; k++) { const d = W[i][k] - W[j][k]; s += d * d; }
    const d = Math.sqrt(s) / (0.5 * (NM[i] + NM[j]));
    if (d < 0.01) sous++;
    if (d < minD) { minD = d; arg = [starts[i] * HOP, starts[j] * HOP]; }
  }
  return { paires: n, distMin: minD, arg, sous1pc: sous };
}
function barres(bars) {
  let run = 1, max = 1; const seen = new Map();
  for (let i = 0; i < bars.length; i++) { seen.set(bars[i], (seen.get(bars[i]) || 0) + 1); if (i && bars[i] === bars[i - 1]) { run++; if (run > max) max = run; } else run = 1; }
  return { mesures: bars.length, distinctes: seen.size, consecutivesMax: max };
}

let ok = true;
console.log('(5) non-repetition sur 180 s, graine 2084');
for (const [label, src] of [['tension 0 constante (2 couches)', '0'], ['tension 1 constante (4 couches)', '1'], ['montee 0 -> 1 en 120 s', 'm']]) {
  const r = await p.evaluate(([src, hop]) => window.__env(180, src === 'm' ? (t => Math.min(1, t / 120)) : (() => +src), 2084, hop), [src, HOP]);
  const a = analyse(r.env), m = barres(r.bars);
  const pass = a.sous1pc === 0 && a.distMin > 0.01 && m.consecutivesMax <= 2;
  ok = ok && pass;
  console.log('  ' + label.padEnd(32) + a.paires + ' paires disjointes, distance minimale ' + (a.distMin * 100).toFixed(1) + ' % (t=' + a.arg.map(x => x.toFixed(1)).join(' s / ') + ' s), sous 1 % : ' + a.sous1pc +
    ' ; mesures ' + m.mesures + ', empreintes distinctes ' + m.distinctes + ', consecutives identiques max ' + m.consecutivesMax + (pass ? '  OK' : '  ECHEC'));
}

console.log('(6) RMS de la musique par tranches de 20 s, courbe de tension reelle de la partie enregistree');
const f0 = F.gameF0, ten = F.log.tension.filter(x => x.f >= f0).map(x => [(x.f - f0) / 60, x.v]);
const dur = Math.min(120, Math.floor((F.frame - f0) / 60));
for (const seed of [2084, 7, 31337]) {
  const r = await p.evaluate(async ([ten, dur, seed, hop]) => {
    const tf = t => { let v = ten[0][1]; for (const [a, x] of ten) { if (a > t) break; v = x; } return v; };
    return window.__env(dur, tf, seed, hop);
  }, [ten, dur, seed, HOP]);
  const tr = [];
  for (let k = 0; (k + 1) * 20 <= dur; k++) {
    const a = Math.round(k * 20 / HOP), c = Math.round((k + 1) * 20 / HOP); let s = 0;
    for (let i = a; i < c; i++) s += r.env[i] * r.env[i];
    tr.push(20 * Math.log10(Math.sqrt(s / (c - a))));
  }
  let mono = true, minStep = Infinity;
  for (let i = 1; i < tr.length; i++) { const d = tr[i] - tr[i - 1]; if (d <= 0) mono = false; if (d < minStep) minStep = d; }
  ok = ok && mono;
  console.log('  graine ' + String(seed).padEnd(6) + tr.map(x => x.toFixed(2)).join('  ') + ' dBFS  -> monotone ' + (mono ? 'OUI' : 'NON') + ', plus petit pas ' + minStep.toFixed(2) + ' dB');
}

console.log('(r) reproductibilite a graine fixe');
const rep = await p.evaluate(async () => {
  const one = async (s) => { window.__N.reseed(s); const b = await window.__N.music.renderOffline(12, () => 0.8, [{ t: 2, name: 'kill', opts: { pitch: 2 } }, { t: 3, name: 'tir', opts: {} }], 44100, null); return b.getChannelData(0); };
  const a = await one(2084), c = await one(2084), d = await one(7);
  let m = 0, m2 = 0; for (let i = 0; i < a.length; i++) { m = Math.max(m, Math.abs(a[i] - c[i])); m2 = Math.max(m2, Math.abs(a[i] - d[i])); }
  return { memeGraine: m, autreGraine: m2 };
});
ok = ok && rep.memeGraine === 0 && rep.autreGraine > 0;
console.log('  meme graine : ecart max ' + rep.memeGraine + ' ; graine 7 contre 2084 : ecart max ' + rep.autreGraine.toFixed(4));
console.log('erreurs de console : ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : '0'));
console.log(ok && !errs.length ? 'BILAN OK' : 'BILAN ECHEC');
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
