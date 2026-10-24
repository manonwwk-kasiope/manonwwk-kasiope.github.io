// Palette du jeu vue par un daltonien (simulation Machado 2009, sévérité 1) :
// distance perceptuelle (ΔE76 en Lab) entre couleurs qui DOIVENT se distinguer.
import { launch } from './acc-lib.mjs';
const { browser, page } = await launch('desk');
const pal = await page.evaluate(() => {
  const M = window.__M; const out = {};
  for (const k in M.enemies.defs) { const d = M.enemies.defs[k]; if (d && d.color) out['enemy:' + k] = d.color; }
  out['snake'] = '#00e5ff'; out['snake:ghost'] = '#b388ff'; out['pickup:energy'] = '#00e5ff'; out['pickup:core'] = '#ffd166'; out['pickup:heal'] = '#7CFFB2';
  out['ui:mg'] = '#ff2e63'; out['ui:am'] = '#ffd166'; out['ui:li'] = '#7cffb2'; out['ui:vi'] = '#b388ff';
  return out;
});
await browser.close();
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const MAT = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const toLab = (rgbLin) => {
  const [r, g, b] = rgbLin.map(v => Math.min(1, Math.max(0, v)));
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(X / 0.95047), fy = f(Y / 1), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const sim = (h, m) => { const l = hex(h).map(lin); const M2 = MAT[m]; return [0, 1, 2].map(i => M2[i][0] * l[0] + M2[i][1] * l[1] + M2[i][2] * l[2]); };
const dE = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const names = Object.keys(pal);
console.log('PALETTE', JSON.stringify(pal));
const pairs = [];
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const a = names[i], b = names[j];
  // ne comparer que ce qui doit se distinguer : ennemis entre eux, ennemis vs bonus/serpent, bonus entre eux
  const kindA = a.split(':')[0], kindB = b.split(':')[0];
  if (kindA === 'ui' || kindB === 'ui') continue;
  if (pal[a].toLowerCase() === pal[b].toLowerCase()) continue;
  const row = { a, b };
  for (const m of Object.keys(MAT)) row[m] = +dE(toLab(sim(pal[a], m)), toLab(sim(pal[b], m))).toFixed(1);
  pairs.push(row);
}
pairs.sort((x, y) => Math.min(x.protan, x.deutan) - Math.min(y.protan, y.deutan));
console.log('PIRES PAIRES (ΔE normal / protan / deutan / tritan) — seuil de confusion ~ 20 :');
for (const p of pairs.slice(0, 22)) console.log(`${p.a.padEnd(24)} vs ${p.b.padEnd(24)} ${String(p.normal).padStart(6)} ${String(p.protan).padStart(6)} ${String(p.deutan).padStart(6)} ${String(p.tritan).padStart(6)}`);
const conf = m => pairs.filter(p => p[m] < 20).length;
console.log('PAIRES CONFONDUES (<20):', JSON.stringify({ total: pairs.length, normal: conf('normal'), protan: conf('protan'), deutan: conf('deutan'), tritan: conf('tritan') }));
