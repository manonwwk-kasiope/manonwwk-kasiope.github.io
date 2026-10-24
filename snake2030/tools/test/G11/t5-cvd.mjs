/* G11 — test 5 : DALTONISME (acc-cvd.mjs corrigé).
   L'instrument d'origine codait en dur out['snake'] = '#00e5ff' ET
   out['pickup:energy'] = '#00e5ff' : lancé après G11 il aurait mesuré la
   palette d'AVANT pour la moitié des entrées. Ici :
     - les couleurs d'ennemis sont lues DANS LE JEU (window.__M.enemies.defs) ;
     - la couleur du serpent est lue DANS LE JEU (window.__M.ui.PCOL, la seule
       définition de la couleur d'identité de la joueuse) ;
     - les couleurs de butin sont lues dans la ligne de drawPickups de
       src/90-boot.js, c'est-à-dire à l'endroit exact où le jeu les choisit.
   LISTE FIGÉE (spec) : sans elle « <= 6 paires confondues » ne veut rien dire.
   Les paires de couleur IDENTIQUE sont écartées : deux ennemis d'une même
   famille portent volontairement la même couleur, les compter comme
   « confondus » n'aurait aucun sens.
   Seuils : protan <= 6 et deutan <= 6 paires à ΔE < 20 ; serpent contre chaque
   type d'ennemi ΔE >= 30 sous protan, deutan ET tritan. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchDesktop, save, finish, deadline } from '../lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..', '..', 'src');
deadline(120, 'G11-t5-cvd');

const LISTE = ['snake', 'pickup:energy', 'pickup:core', 'pickup:heal',
  'enemy:chaser', 'enemy:interceptor', 'enemy:mine', 'enemy:shooter', 'enemy:cutter',
  'enemy:spawner', 'enemy:mite', 'enemy:parasite', 'enemy:jammer', 'enemy:thief', 'enemy:mirror'];

const boot = fs.readFileSync(path.join(SRC, '90-boot.js'), 'utf8');
const mp = boot.match(/var col = p\.kind === 'core' \? '(#[0-9a-fA-F]{6})' : \(p\.kind === 'heal' \? '(#[0-9a-fA-F]{6})' : '(#[0-9a-fA-F]{6})'\);/);
if (!mp) { console.log(JSON.stringify({ test: 'G11-t5-cvd', pass: false, measured: { erreur: 'ligne de couleur des butins introuvable dans drawPickups' } })); process.exit(2); }

const ctx = await launchDesktop(1440, 900);
const live = await ctx.page.evaluate(() => {
  const M = window.__M, out = {};
  for (const k in M.enemies.defs) { const d = M.enemies.defs[k]; if (d && d.color) out['enemy:' + k] = d.color; }
  out.snake = (M.ui && M.ui.PCOL) || null;
  return out;
});
await ctx.close();
if (!live.snake) { console.log(JSON.stringify({ test: 'G11-t5-cvd', pass: false, measured: { erreur: 'couleur du serpent illisible dans le jeu' } })); process.exit(2); }

const pal = { ...live, 'pickup:core': mp[1], 'pickup:heal': mp[2], 'pickup:energy': mp[3] };
for (const k of LISTE) if (!pal[k]) { console.log(JSON.stringify({ test: 'G11-t5-cvd', pass: false, measured: { erreur: 'entrée manquante ' + k } })); process.exit(2); }

/* ------------------------------------ simulation Machado 2009, sévérité 1 */
const hexv = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
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
  return [116 * f(Y) - 16, 500 * (f(X / 0.95047) - f(Y)), 200 * (f(Y) - f(Z / 1.08883))];
};
const sim = (h, m) => { const l = hexv(h).map(lin), M2 = MAT[m]; return [0, 1, 2].map(i => M2[i][0] * l[0] + M2[i][1] * l[1] + M2[i][2] * l[2]); };
const dE = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const d = (x, y, m) => +dE(toLab(sim(pal[x], m)), toLab(sim(pal[y], m))).toFixed(1);

const paires = [];
for (let i = 0; i < LISTE.length; i++) for (let j = i + 1; j < LISTE.length; j++) {
  const a = LISTE[i], b = LISTE[j];
  if (pal[a].toLowerCase() === pal[b].toLowerCase()) continue;
  paires.push({ a, b, normal: d(a, b, 'normal'), protan: d(a, b, 'protan'), deutan: d(a, b, 'deutan'), tritan: d(a, b, 'tritan') });
}
const conf = m => paires.filter(p => p[m] < 20);
const types = LISTE.filter(k => k.startsWith('enemy:'));
const serpVsEnn = types.map(t => ({ type: t, protan: d('snake', t, 'protan'), deutan: d('snake', t, 'deutan'), tritan: d('snake', t, 'tritan'), normal: d('snake', t, 'normal') }));
const minSerp = Math.min(...serpVsEnn.map(x => Math.min(x.protan, x.deutan, x.tritan)));
const serpVsButin = ['pickup:energy', 'pickup:core', 'pickup:heal'].map(t => ({ couple: 'snake / ' + t, normal: d('snake', t, 'normal'), protan: d('snake', t, 'protan'), deutan: d('snake', t, 'deutan'), tritan: d('snake', t, 'tritan') }));

const nProtan = conf('protan').length, nDeutan = conf('deutan').length;
const okProtan = nProtan <= 6, okDeutan = nDeutan <= 6, okSerp = minSerp >= 30;
const pass = okProtan && okDeutan && okSerp;
const r = {
  test: 'G11-t5-cvd', pass,
  seuilsOk: { protan: okProtan, deutan: okDeutan, serpentEnnemis: okSerp },
  seuils: 'paires confondues (ΔE < 20) : protan ≤ 6 et deutan ≤ 6 ; serpent contre chaque type d’ennemi ΔE ≥ 30 sous protan, deutan et tritan',
  listeFigee: LISTE,
  palette: pal,
  sourceDesCouleurs: { ennemis: 'window.__M.enemies.defs (jeu)', serpent: 'window.__M.ui.PCOL (jeu)', butins: 'ligne de drawPickups, src/90-boot.js' },
  measured: {
    totalPaires: paires.length,
    confondues: { normal: conf('normal').length, protan: nProtan, deutan: nDeutan, tritan: conf('tritan').length },
    detailProtan: conf('protan'), detailDeutan: conf('deutan'), detailTritan: conf('tritan'),
    serpentVsEnnemis: serpVsEnn, serpentVsEnnemiMin: minSerp,
    serpentVsButin: serpVsButin,
    dixPlusProches: paires.slice().sort((x, y) => Math.min(x.protan, x.deutan) - Math.min(y.protan, y.deutan)).slice(0, 10),
  },
};
save('G11-t5-cvd.json', r);
finish(r.test, { pass, measured: r.measured, threshold: r.seuils });
