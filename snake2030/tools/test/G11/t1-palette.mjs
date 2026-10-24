/* G11 — test 1 : PALETTE.
   Variante d'audit/av-palette.mjs, sur les SOURCES du build (src/*.js).
   La TABLE DES CATÉGORIES est figée ici et reproduite en tête du rapport :
   sans elle le compte de paires inter-catégories n'est pas défini.
   Seuils (spec G11, test 1) :
     - 0 paire inter-catégorie avec ΔE76 < 25 ;
     - 0 paire dont les DEUX couleurs sont chromatiques (C* >= 12) et qui échoue
       simultanément aux trois séparations Δteinte Lab >= 15°, ΔL* >= 18,
       ΔC* >= 25 (une couleur achromatique est exemptée de la règle de teinte :
       atan2 sur a*=b*=0 renvoie un angle de virgule flottante) ;
     - contraste WCAG du rail contre #00e5ff >= 3,0:1 ;
     - aucun littéral #00e5ff dans src/, hors drawSnake de 90-boot.js, hors
       26-ui.js, et hors les feuilles de style DOM de #fsb et #fshelp (exclues
       NOMMÉMENT : l'invariant de la joueuse interdit d'y toucher) ;
     - aucun littéral de teinte HSV 165-200° à S > 0,18 aux mêmes exclusions.
   VALEUR PLANCHER DU BALAYAGE DE TEINTE : V >= 0,45. Justification écrite dans
   le rapport (clé « planeurV ») et vérifiée : c'est le seuil qui reproduit
   EXACTEMENT l'énumération « aujourd'hui » de la spec (six littéraux), sans
   quoi le balayage attraperait aussi les fonds sombres bg/bg2/grid/bloom des
   niveaux, que le « quoi » ne demande nommément pas de changer. Les fonds
   sombres attrapés sont listés à part, non bloquants. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..', '..', 'src');
const OUT = path.resolve(HERE, '..', 'out');

/* ------------------------------------------------ table figée des catégories */
const TABLE = {
  'serpent':            ['#00e5ff', 'joueur'],
  'tête':               ['#ffffff', 'joueur'],
  'rail':               ['#2a55cc', 'rail'],
  'rail avertissement': ['#142c72', 'rail'],
  'contact':            ['#ff2e63', 'ennemi contact'],
  'balistique':         ['#ff6a00', 'ennemi balistique'],
  'contrôle':           ['#8a4dff', 'ennemi contrôle'],
  'MIROIR':             ['#ffc3af', 'ennemi miroir'],
  'butin énergie':      ['#64ff9a', 'butin'],
  'butin core':         ['#ffc94d', 'butin'],
  'butin soin':         ['#7cffb2', 'butin'],
  'tir joueur':         ['#fff3b0', 'tir joueur'],
  'alerte':             ['#ff2b2b', 'alerte'],
};

/* ------------------------------------------------------------ colorimétrie */
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const relLum = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const wcag = (a, b) => { const la = relLum(a), lb = relLum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
function lab(hexs) {
  const [r, g, b] = hex2rgb(hexs).map(lin);
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(X / 0.95047), fy = f(Y / 1), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE76 = (A, B) => Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2);
const chroma = L => Math.hypot(L[1], L[2]);
const hueDeg = L => { let a = Math.atan2(L[2], L[1]) * 180 / Math.PI; return a < 0 ? a + 360 : a; };
const dHue = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}

/* ------------------------------------------------------- paires de la table */
const noms = Object.keys(TABLE);
const paires = [];
for (let i = 0; i < noms.length; i++) for (let j = i + 1; j < noms.length; j++) {
  const A = TABLE[noms[i]], B = TABLE[noms[j]];
  if (A[1] === B[1]) continue;                       // même catégorie : hors règle
  const la = lab(A[0]), lb = lab(B[0]);
  const ca = chroma(la), cb = chroma(lb);
  const chromatique = ca >= 12 && cb >= 12;
  const dh = dHue(hueDeg(la), hueDeg(lb)), dL = Math.abs(la[0] - lb[0]), dC = Math.abs(ca - cb);
  const de = dE76(la, lb);
  paires.push({ a: noms[i], b: noms[j], hexA: A[0], hexB: B[0], catA: A[1], catB: B[1],
    dE: +de.toFixed(1), dHue: +dh.toFixed(1), dL: +dL.toFixed(1), dC: +dC.toFixed(1), chromatique,
    echecDE: de < 25, echecSep: chromatique && !(dh >= 15 || dL >= 18 || dC >= 25) });
}
const sousDE = paires.filter(p => p.echecDE);
const sepKO  = paires.filter(p => p.echecSep);

/* ------------------------------------------------------- contraste des rails */
const CY = hex2rgb('#00e5ff');
const crRail = +wcag(hex2rgb(TABLE['rail'][0]), CY).toFixed(2);
const crWarn = +wcag(hex2rgb(TABLE['rail avertissement'][0]), CY).toFixed(2);
const dLRail = +Math.abs(lab(TABLE['rail'][0])[0] - lab(TABLE['rail avertissement'][0])[0]).toFixed(1);

/* ------------------------------------------------- balayage des littéraux */
const V_FLOOR = 0.45;
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
function zonesExclues(nom, txt) {
  const z = [];
  if (nom === '26-ui.js') { z.push([0, txt.length]); return z; }        // module exclu en entier
  if (nom === '90-boot.js') {
    const i = txt.indexOf('function drawSnake()');
    if (i >= 0) { const j = txt.indexOf('\nfunction drawBoostArc', i); z.push([i, j > 0 ? j : txt.length]); }
    /* feuille de style DOM du bouton #fsb et de la carte #fshelp : exclue
       NOMMÉMENT par la spec — l'invariant de la joueuse interdit d'y toucher
       (le plein écran est impossible autrement sur iOS). C'est la fonction
       buildFullscreenButton() qui les pose, en lignes concaténées. */
    const s0 = txt.indexOf('function buildFullscreenButton()');
    if (s0 >= 0) { const s1 = txt.indexOf('\nfunction ', s0 + 10); z.push([s0, s1 > 0 ? s1 : txt.length]); }
  }
  return z;
}
/* Les COMMENTAIRES ne dessinent rien : un littéral cité dans un commentaire
   (« #5ef1ff donnait 1,14:1 ») n'est pas une couleur du jeu. On les blanchit
   avant le balayage, en gardant les positions pour que les numéros de ligne
   restent justes. */
function sansCommentaires(t) {
  let out = '', i = 0;
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '*') { const j = t.indexOf('*/', i + 2); const end = j < 0 ? t.length : j + 2; out += t.slice(i, end).replace(/[^\n]/g, ' '); i = end; continue; }
    if (c === '/' && d === '/') { const j = t.indexOf('\n', i); const end = j < 0 ? t.length : j; out += ' '.repeat(end - i); i = end; continue; }
    out += c; i++;
  }
  return out;
}
const dedans = (z, i) => z.some(([a, b]) => i >= a && i <= b);
const litCyan = [], litTeinte = [], fondsSombres = [];
const RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
for (const f of files) {
  const brut = fs.readFileSync(path.join(SRC, f), 'utf8');
  const txt = sansCommentaires(brut);
  const z = zonesExclues(f, brut);
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(txt))) {
    if (dedans(z, m.index)) continue;
    let rgb;
    if (m[0][0] === '#') rgb = hex2rgb(m[0]); else rgb = [+m[1], +m[2], +m[3]];
    const ligne = txt.slice(0, m.index).split('\n').length;
    const ref = { fichier: f, ligne, litteral: m[0] };
    if (rgb[0] === 0 && rgb[1] === 229 && rgb[2] === 255) litCyan.push(ref);
    const [h, sv, v] = rgb2hsv(rgb[0], rgb[1], rgb[2]);
    if (h >= 165 && h <= 200 && sv > 0.18) {
      if (v >= V_FLOOR) litTeinte.push({ ...ref, h: +h.toFixed(1), s: +sv.toFixed(2), v: +v.toFixed(2) });
      else fondsSombres.push({ ...ref, h: +h.toFixed(1), s: +sv.toFixed(2), v: +v.toFixed(2) });
    }
  }
}

const pass = sousDE.length === 0 && sepKO.length === 0 && crRail >= 3 && crWarn >= 3 &&
             litCyan.length === 0 && litTeinte.length === 0;
const r = {
  test: 'G11-t1-palette', pass,
  seuils: '0 paire inter-catégorie ΔE76 < 25 ; 0 paire chromatique échouant les 3 séparations (15° / 18 L* / 25 C*) ; rails ≥ 3,0:1 contre #00e5ff ; 0 littéral #00e5ff et 0 littéral de teinte 165-200° S>0,18 V≥0,45, hors drawSnake, hors 26-ui.js, hors feuilles de style #fsb/#fshelp',
  table: TABLE,
  planeurV: 'V >= 0,45 sur le balayage de teinte : c\'est le plancher qui reproduit exactement l\'énumération « aujourd\'hui » de la spec (6 littéraux). Les fonds sombres de la même bande de teinte sont listés dans fondsSombresNonBloquants : le « quoi » ne demande nommément pas de les changer (il nomme gridHot/accent/lane/pull/dust), et le masque du test 2 mesure ce que ces fonds pèsent réellement à l\'écran.',
  measured: {
    tablePairs: paires.length,
    pairesDeltaE_sous25: sousDE.length, detailDeltaE: sousDE,
    pairesSeparationEchouee: sepKO.length, detailSeparation: sepKO,
    railContraste: { rail: crRail, 'rail avertissement': crWarn }, railDeltaL: dLRail,
    litterauxCyan: litCyan.length, detailCyan: litCyan,
    litterauxTeinteCyan: litTeinte.length, detailTeinte: litTeinte,
    fondsSombresNonBloquants: fondsSombres.length, detailFondsSombres: fondsSombres,
    dixPlusProches: paires.slice().sort((x, y) => x.dE - y.dE).slice(0, 10),
  },
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'G11-t1-palette.json'), JSON.stringify(r, null, 1));
console.log(JSON.stringify({ test: r.test, pass, measured: { tablePairs: paires.length, sousDE: sousDE.length, sepKO: sepKO.length, crRail, crWarn, dLRail, litCyan: litCyan.length, litTeinte: litTeinte.length, fondsSombres: fondsSombres.length }, threshold: r.seuils }));
process.exit(pass ? 0 : 1);
