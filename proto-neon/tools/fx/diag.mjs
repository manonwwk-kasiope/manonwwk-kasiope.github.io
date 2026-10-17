/* tools/fx/diag.mjs — d'où viennent les transitions du pire champ de 10° (chaîne, bureau) */
import { build, lancer, ouvrir, attendre } from './commun.mjs';
build();
const browser = await lancer();
const profil = process.argv[2] || 'bureau', crt = process.argv[3] || 'riche', mode = process.argv[4] || 'chaine';
const { page } = await ouvrir(browser, profil, { crt });
const K0 = 30;
await page.evaluate(({ K0, mode }) => {
  const T = window.__FXT, g = window.__N.gfx, fx = window.__N.fx;
  T.markers = [[40, 40], [40, g.H - 44]];
  let s = 7; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  if (mode === 'chaine') {
    for (let i = 0; i < 15; i++) T.act[K0 + 8 * i] = () => { fx.boom(Math.round(g.W * (0.15 + 0.7 * r())), Math.round(g.H * (0.2 + 0.6 * r())), 0.65 + 0.35 * r(), 'magenta'); fx.hitstop(5); };
    for (let i = 0; i < 40; i++) { const k = K0 + 1 + 3 * i, prev = T.act[k]; T.act[k] = () => { if (prev) prev(); fx.boom(Math.round(g.W * r()), Math.round(g.H * r()), 0.2 + 0.25 * r(), 'magenta'); fx.hitstop(2); }; }
  } else if (mode === 'petites') {
    for (let i = 0; i < 40; i++) T.act[K0 + 1 + 3 * i] = () => { fx.boom(Math.round(g.W * r()), Math.round(g.H * r()), 0.2 + 0.25 * r(), 'magenta'); fx.hitstop(2); };
  } else if (mode === 'une') {
    T.act[K0] = () => { fx.boom(Math.round(g.W * 0.5), Math.round(g.H * 0.5), 1, 'magenta'); fx.hitstop(5); };
  } else if (mode === 'jeu') {
    /* une minute chargée, en plus dense : 3 kills par seconde (gel 2), un gros toutes les 3 s (gel 5) */
    for (let i = 0; i < 30; i++) T.act[K0 + 20 * i] = () => { fx.boom(Math.round(g.W * (0.1 + 0.8 * r())), Math.round(g.H * (0.15 + 0.7 * r())), 0.25 + 0.3 * r(), 'magenta'); fx.hitstop(2); };
    for (let i = 0; i < 4; i++) { const k = K0 + 10 + 180 * i, prev = T.act[k]; T.act[k] = () => { if (prev) prev(); fx.boom(Math.round(g.W * (0.3 + 0.4 * r())), Math.round(g.H * (0.3 + 0.4 * r())), 0.8 + 0.2 * r(), 'magenta'); fx.hitstop(5); }; }
  } else if (mode === 'secousse') {
    T.act[K0] = () => fx.boom(Math.round(g.W * 0.5), Math.round(g.H * 0.5), 1, 'magenta');
  }
  T.k = 0; T.on = true;
}, { K0, mode });
const KF = mode === 'jeu' ? 640 : 200;
await attendre(page, K0 + KF);
const log = await page.evaluate(() => window.__FXT.log);
await browser.close();
const rows = log.filter(r => r.k >= K0 - 5);
const nW = rows[0].means.length;
let best = null;
for (let w = 0; w < nW; w++) {
  const M = rows.map(r => r.means[w]); const tr = [];
  let dir = 0, hi = M[0], lo = M[0];
  for (let t = 1; t < M.length; t++) { const v = M[t];
    if (dir <= 0) { lo = Math.min(lo, v); if (v - lo >= 0.1) { tr.push(t); dir = 1; hi = v; continue; } }
    if (dir >= 0) { hi = Math.max(hi, v); if (hi - v >= 0.1) { tr.push(-t); dir = -1; lo = v; continue; } } }
  if (!best || tr.length > best.tr.length) best = { w, tr, M };
}
console.log('pire champ', best.w, 'transitions', best.tr.length);
for (const t of best.tr.slice(0, 40)) { const i = Math.abs(t); const r = rows[i];
  console.log(`${t > 0 ? 'monte ' : 'descend'} k=${r.k - K0} moyenne ${best.M[i - 1].toFixed(3)}→${best.M[i].toFixed(3)} secousse ${r.shake} crt ${JSON.stringify(r.crt)} gel ${r.frozen}`); }
