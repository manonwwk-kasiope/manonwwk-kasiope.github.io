/* tools/L7a/jointures.mjs — les jointures de blocs, mesurées hors ligne sur le code même du jeu
   (N.music.rendrePiste : rogner, brancher, finir). Trois suites : le morceau entier dans l'ordre (16
   jointures naturelles), une chaîne de sauts et de boucles (celle de tools/musique/LISEZMOI.md), et des
   coupures urgentes sur des barres internes (alerte, boss, décollage, demi-phrases).
   Pour chaque jointure : le décalage du rendu par rapport au bloc sortant (avant la barre) et au bloc entrant
   (après), par corrélation normalisée ; l'écart entre les deux doit rester sous 1 ms. Le clic : la plus forte
   dérivée dans ± 10 ms de la barre, comparée à 0,45 (le plus fort pic d'une vraie barre de la piste
   d'origine) et au contexte (± 200 ms autour, hors jointure) + 1 dB.
     node tools/L7a/jointures.mjs [url]  → tools/L7a/jointures.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] || 'http://127.0.0.1:8131/proto-neon/tools/L7a/index.html';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(URL);
await page.waitForFunction(() => window.__N.music.info === undefined || true);
await page.mouse.click(300, 200);
await page.waitForFunction(() => { const i = window.__N.music.info(); return i && i.piste === 'pret'; }, null, { timeout: 15000 });

const SUITES = {
  morceau: ['nv-01', 'nv-02', 'nv-03', 'nv-04', 'nv-05', 'nv-06', 'nv-07', 'nv-08', 'nv-09', 'nv-10', 'nv-11', 'nv-12', 'nv-13', 'nv-14', 'nv-15', 'nv-16', 'nv-17'].map(id => ({ id })),
  sauts: ['nv-01', 'nv-02', 'nv-05', 'nv-03', 'nv-03', 'nv-08', 'nv-09', 'nv-09', 'nv-11', 'nv-12', 'nv-16', 'nv-15', 'nv-16', 'nv-14', 'nv-15', 'nv-07', 'nv-17'].map(id => ({ id })),
  coupures: [
    { id: 'nv-01', de: 0, a: 8 }, { id: 'nv-01', de: 2, a: 8 }, { id: 'nv-01', de: 2, a: 5 },   /* l'INTRO, sa boucle, le décollage sur une barre */
    { id: 'nv-02', de: 0, a: 4 }, { id: 'nv-06', de: 0, a: 8 }, { id: 'nv-03', de: 0, a: 3 },    /* demi-phrase, puis coupure urgente */
    { id: 'nv-07', de: 7, a: 8 }, { id: 'nv-07', de: 7, a: 8 }, { id: 'nv-07', de: 7, a: 8 },    /* la boucle d'alerte */
    { id: 'nv-12', de: 0, a: 6 }, { id: 'nv-17', de: 0, a: 8 }, { id: 'nv-17', de: 0, a: 8 },    /* boss coupé, l'OUTRO et sa boucle */
    { id: 'nv-09', de: 0, a: 4 }, { id: 'nv-02', de: 0, a: 8 }
  ]
};
const R = { erreurs, suites: {} };
for (const [nom, suite] of Object.entries(SUITES)) {
  const r = await page.evaluate(async suite => {
    const m = window.__N.music, piste = await (await fetch('../../musique/piste.json')).json();
    const B = {}; for (const b of piste.blocs) B[b.id] = b;
    const out = await m.rendrePiste(suite, 44100), sr = out.sr;
    const a = out.buf.getChannelData(0), b = out.buf.getChannelData(1), x = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) x[i] = (a[i] + b[i]) * 0.5;
    /* les références : chaque bloc décodé seul, temps du fichier */
    const ref = {};
    for (const id of new Set(suite.map(s => s.id))) {
      const ab = await (await fetch('../../musique/' + B[id].fichier)).arrayBuffer();
      const d = await new OfflineAudioContext(2, 44100, sr).decodeAudioData(ab);
      const p = d.getChannelData(0), q = d.getChannelData(1), y = new Float32Array(p.length);
      for (let i = 0; i < p.length; i++) y[i] = (p[i] + q[i]) * 0.5;
      ref[id] = y;
    }
    function ncc(xi, y, yi, n) { let s = 0, e1 = 0, e2 = 0; for (let i = 0; i < n; i++) { const u = x[xi + i], v = y[yi + i]; s += u * v; e1 += u * u; e2 += v * v; } return s / Math.sqrt(e1 * e2 + 1e-12); }
    function lag(xi, y, yi, n) { let best = -2, bl = 0; for (let L = -300; L <= 300; L++) { if (xi + L < 0 || xi + L + n > x.length || yi < 0 || yi + n > y.length) continue; const v = ncc(xi + L, y, yi, n); if (v > best) { best = v; bl = L; } } return { L: bl, r: best }; }
    function deriv(i0, i1, y) { y = y || x; let mx = 0; for (let i = Math.max(1, i0); i < Math.min(y.length, i1); i++) { const d = Math.abs(y[i] - y[i - 1]); if (d > mx) mx = d; } return mx; }
    const res = [], n = Math.round(0.25 * sr), g = Math.round(0.012 * sr);
    for (let k = 0; k < out.joints.length; k++) {
      const J = out.joints[k], sa = out.segs[k], sb = out.segs[k + 1], T = J.T, iT = Math.round(T * sr);
      const fA = B[sa.id].barres[sa.a], fB = B[sb.id].barres[sb.de];
      const zA = lag(iT - g - n, ref[sa.id], Math.round(fA * sr) - g - n, n);
      const zB = lag(iT + g, ref[sb.id], Math.round(fB * sr) + g, n);
      const pic = deriv(iT - Math.round(0.01 * sr), iT + Math.round(0.01 * sr));
      /* les contextes naturels : la même barre jouée d'un tenant dans le bloc sortant (sa mesure d'après)
         et dans le bloc entrant (sa mesure d'avant, s'il en a une) */
      const w = Math.round(0.01 * sr), ia = Math.round(fA * sr), ib = Math.round(fB * sr);
      const cA = ia + w < ref[sa.id].length ? deriv(ia - w, ia + w, ref[sa.id]) : 0, cB = ib - w > 0 ? deriv(ib - w, ib + w, ref[sb.id]) : 0;
      const ctx = Math.max(cA, cB);
      res.push({ de: J.de, vers: J.vers, lagAvant: zA.L, rAvant: +zA.r.toFixed(5), lagApres: zB.L, rApres: +zB.r.toFixed(5), ecartMs: +((zB.L - zA.L) / sr * 1000).toFixed(3), pic: +pic.toFixed(4), contexte: +ctx.toFixed(4) });
    }
    return { duree: out.buf.duration, joints: res };
  }, suite);
  const ecartMax = Math.max(...r.joints.map(j => Math.max(Math.abs(j.ecartMs), Math.abs(j.lagAvant / 44.1), Math.abs(j.lagApres / 44.1))));
  const clics = r.joints.filter(j => j.pic > 0.45 || (j.contexte > 0 && j.pic > j.contexte * 1.122));
  const rMin = Math.min(...r.joints.map(j => Math.min(j.rAvant, j.rApres)));
  R.suites[nom] = { jointures: r.joints.length, ecartMaxMs: +ecartMax.toFixed(3), clics: clics.length, correlationMin: rMin, picMax: Math.max(...r.joints.map(j => j.pic)), detail: r.joints };
  console.log(nom, JSON.stringify({ jointures: r.joints.length, ecartMaxMs: +ecartMax.toFixed(3), clics: clics.length, correlationMin: rMin, picMax: R.suites[nom].picMax }));
  if (clics.length) console.log('  clics :', JSON.stringify(clics));
}
fs.writeFileSync(path.join(ICI, 'jointures.json'), JSON.stringify(R, null, 1));
await browser.close();
const ok = !erreurs.length && Object.values(R.suites).every(s => s.ecartMaxMs < 1 && s.clics === 0 && s.correlationMin > 0.99);
console.log(ok ? 'JOINTURES : tenu' : 'JOINTURES : ÉCHEC', erreurs.slice(0, 3));
process.exit(ok ? 0 : 1);
