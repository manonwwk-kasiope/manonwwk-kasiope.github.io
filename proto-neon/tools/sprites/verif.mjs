/* tools/sprites/verif.mjs — vérifie, sur TOUS les sprites (toutes images, variantes et directions), les
   règles de DIRECTION.md, CONTRAT.md et recherche/visuel-technique-mobile.md qui se mesurent sur le sprite :
     joueuse : cyan et cyan pâle seulement (G-11) ; ennemis : jamais de cyan, magenta dominant, au moins
     7×7, contour fermé d'un pixel en nuit profonde (V-05, V-11) ; colosse entre 40 et 64 ; projectiles
     ennemis : cœur d'au moins 3×3 et liseré sombre ; butin au moins 7×7 et sans cyan ; police : chaque
     signe annoncé existe, minuscules = capitales ; contrastes WCAG des couleurs principales (V-08, V-09).
   Usage : node tools/sprites/verif.mjs   (sortie 0 si tout tient, 1 sinon) */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ctx = { Math, Map, Uint8Array, Uint32Array, Float32Array, ArrayBuffer, Array, Object, String, parseInt, isNaN, isFinite };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['00-pal.js', '40-sprites.js']) vm.runInContext(fs.readFileSync(path.join(HERE, '..', '..', 'src', f), 'utf8'), ctx);
const N = ctx.__N, P = N.pal, S = N.spr, NM = P.NAMES;
const I = n => P.i(n);
let fails = 0, checks = 0;
const ko = (msg) => { fails++; console.log('  ÉCHEC', msg); };
const ok = (cond, msg) => { checks++; if (!cond) ko(msg); };

function variants(nom, dirs) {
  const out = [], fr = S.frames(nom);
  for (let f = 0; f < fr; f++) {
    if (dirs) for (let k = 0; k < 16; k++) out.push([nom + ':' + k, f]);
    else out.push([nom, f]);
  }
  return out;
}
function stats(s) {
  const cols = new Map(); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, cx0 = 1e9, cy0 = 1e9, cx1 = -1, cy1 = -1;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const v = s.data[y * s.w + x]; if (!v) continue;
    cols.set(v, (cols.get(v) || 0) + 1);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    if (v !== I('nuitProfonde')) { cx0 = Math.min(cx0, x); cy0 = Math.min(cy0, y); cx1 = Math.max(cx1, x); cy1 = Math.max(cy1, y); }
  }
  return { cols, bw: x1 - x0 + 1, bh: y1 - y0 + 1, cw: cx1 - cx0 + 1, ch: cy1 - cy0 + 1 };
}
/* contour fermé : aucun pixel opaque autre que nuit profonde ne touche (8-voisins) le transparent ou le bord */
function contourFerme(s) {
  const np = I('nuitProfonde');
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const v = s.data[y * s.w + x]; if (!v || v === np) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= s.w || Y >= s.h || !s.data[Y * s.w + X]) return [x, y];
    }
  }
  return null;
}
function base(s) { if (!(s && s.w > 0 && s.h > 0 && s.data && s.data.length === s.w * s.h)) return false; for (const v of s.data) if (v > 15) return false; return s.cx >= 0 && s.cy >= 0 && s.cx < s.w && s.cy < s.h; }

const ALL = [];
console.log('— joueuse : cyan et cyan pâle seulement');
const JOUEUSE = [...variants('tete', true), ...['corps:9', 'corps:7', 'corps:5', 'corps:3', 'queue'].flatMap(n => variants(n)), ...variants('tir', true), ...variants('chevron', true)];
for (const [n, f] of JOUEUSE) {
  const s = S.make(n, f), st = stats(s); ALL.push([n, f, s]);
  ok(base(s), n + '@' + f + ' format');
  for (const c of st.cols.keys()) ok(c === I('cyan') || c === I('cyanPale'), `${n}@${f} contient ${NM[c]}`);
}
console.log(`  ${JOUEUSE.length} sprites`);

console.log('— ennemis : magenta dominant, jamais de cyan, ≥ 7×7, contour nuit profonde fermé');
const PERMIS = new Set(['magenta', 'rosePale', 'sang', 'nuitProfonde'].map(I));
const OEIL = new Set(['jaune', 'os', 'brasier'].map(I));
const ENNEMIS = [...variants('fleche', true), ...variants('fleche'), ...variants('tourelle'), ...variants('tourelle:charge'), ...variants('sentinelle'),
  ...variants('mine'), ...variants('mine:alerte'), ...variants('colosse'), ...variants('colosse:oeil')];
for (const [n, f] of ENNEMIS) {
  const s = S.make(n, f), st = stats(s); ALL.push([n, f, s]);
  ok(base(s), n + '@' + f + ' format');
  for (const c of st.cols.keys()) ok(PERMIS.has(c) || (n === 'colosse:oeil' && OEIL.has(c)), `${n}@${f} contient ${NM[c]}`);
  let dom = -1, dn = 0; for (const [c, k] of st.cols) if (c !== I('nuitProfonde') && k > dn) { dn = k; dom = c; }
  ok(dom === I('magenta'), `${n}@${f} couleur dominante ${NM[dom]}`);
  ok(st.bw >= 7 && st.bh >= 7, `${n}@${f} mesure ${st.bw}×${st.bh}`);
  const fuite = contourFerme(s); ok(!fuite, `${n}@${f} contour ouvert en ${fuite}`);
}
const col = S.make('colosse', 0), cs = stats(col);
ok(cs.bw >= 40 && cs.bw <= 64 && cs.bh >= 40 && cs.bh <= 64, `colosse ${cs.bw}×${cs.bh} hors de 40..64`);
console.log(`  ${ENNEMIS.length} sprites ; colosse ${cs.bw}×${cs.bh}`);

console.log('— projectiles ennemis : cœur ≥ 3×3, liseré sombre fermé');
for (const n of ['tirEnnemi', 'tirEnnemi:petit', 'tirEnnemi:gros']) for (const [m, f] of variants(n)) {
  const s = S.make(m, f), st = stats(s); ALL.push([m, f, s]);
  ok(st.cw >= 3 && st.ch >= 3, `${m}@${f} cœur ${st.cw}×${st.ch}`);
  for (const c of st.cols.keys()) ok(PERMIS.has(c), `${m}@${f} contient ${NM[c]}`);
  const fuite = contourFerme(s); ok(!fuite, `${m}@${f} liseré ouvert en ${fuite}`);
}

console.log('— butin : ≥ 7×7, ambre / jaune / os, contour fermé, jamais de cyan ni de magenta');
for (const [n, f] of variants('butin')) {
  const s = S.make(n, f), st = stats(s); ALL.push([n, f, s]);
  ok(st.bw >= 7 && st.bh >= 7, `butin@${f} ${st.bw}×${st.bh}`);
  for (const c of st.cols.keys()) ok(['ambre', 'jaune', 'os', 'nuitProfonde'].map(I).includes(c), `butin@${f} contient ${NM[c]}`);
  const fuite = contourFerme(s); ok(!fuite, `butin@${f} contour ouvert en ${fuite}`);
}

console.log('— interface : contour fermé, aucune couleur d\'ennemi sur les icônes neutres');
for (const n of ['son', 'muet', 'pause', 'lecture', 'vie', 'vieVide', 'ok', 'ko', 'pause:acier', 'son:jaune']) {
  const s = S.make(n, 0); ALL.push([n, 0, s]);
  ok(base(s), n + ' format');
  const fuite = contourFerme(s); ok(!fuite, `${n} contour ouvert en ${fuite}`);
}

console.log('— noms : chaque nom annoncé rend un sprite connu');
const avant = JSON.stringify(S.unknown);
for (const n of S.names()) { const m = n.replace(':0..15', ':3'); S.make(m, 0); }
ok(JSON.stringify(S.unknown) === avant, 'nom annoncé inconnu : ' + JSON.stringify(S.unknown));

console.log('— police');
const q = S.text('?');
const same = (a, b) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i]);
const SIGNES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!-/%+\'"()«»#*=<>_°×ÉÈÊËÀÂÄÇÙÛÜÔÖÎÏŸŒÆ✓✗★♥←↑→↓';
let manquants = [];
for (const c of SIGNES) if (same(S.text(c), q)) manquants.push(c);
ok(!manquants.length, 'signes rendus comme « ? » : ' + manquants.join(''));
for (const [a, b] of [['é', 'É'], ['è', 'È'], ['à', 'À'], ['ç', 'Ç'], ['ù', 'Ù'], ['ô', 'Ô'], ['î', 'Î'], ['abc', 'ABC'], ['œ', 'Œ']]) ok(same(S.text(a), S.text(b)), `minuscule ${a} ≠ ${b}`);
const tE = S.text('E'), tEa = S.text('É'), tC = S.text('Ç');
ok(tE.h === tEa.h && tE.top === tEa.top, 'É et E n\'ont pas la même métrique');
ok(tE.top === 2 && tE.cap === 7, `métrique top=${tE.top} cap=${tE.cap}`);
const ombre = S.text('A', { ombre: true }), cont = S.text('A', { contour: true }), deux = S.text('A', { echelle: 2 });
ok(stats(ombre).cols.has(I('nuitProfonde')) && !stats(S.text('A')).cols.has(I('nuitProfonde')), 'ombre : option absente ou active par défaut');
ok(!contourFerme(cont), 'contour de texte ouvert');
ok(deux.cap === 14 && deux.w === 2 * S.text('A').w, 'échelle 2');
ok(stats(S.text('A', 'jaune')).cols.has(I('jaune')), 'couleur par chaîne');
ok(tC.h > tE.h, 'Ç ne descend pas');

console.log('— contrastes WCAG (annexe de la recherche)');
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = i => 0.2126 * lin(P.R[i]) + 0.7152 * lin(P.G[i]) + 0.0722 * lin(P.B[i]);
const CR = (a, b) => { const x = L(I(a)), y = L(I(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const fond of ['vide', 'nuit', 'ardoise', 'indigo']) ok(CR('magenta', fond) >= 3, `magenta/${fond} ${CR('magenta', fond).toFixed(2)}`);
for (const [t, fond] of [['os', 'vide'], ['jaune', 'vide'], ['acier', 'vide'], ['acier', 'ardoise'], ['ambre', 'nuit']]) ok(CR(t, fond) >= 4.5, `${t}/${fond} ${CR(t, fond).toFixed(2)}`);
console.log(`  magenta/vide ${CR('magenta', 'vide').toFixed(2)}, magenta/indigo ${CR('magenta', 'indigo').toFixed(2)}, magenta/nuitProfonde ${CR('magenta', 'nuitProfonde').toFixed(2)}, brasier/nuitProfonde ${CR('brasier', 'nuitProfonde').toFixed(2)}, os/nuitProfonde ${CR('os', 'nuitProfonde').toFixed(2)}`);

console.log(`\n${ALL.length} sprites passés au crible, ${checks} contrôles, ${fails} échec(s).`);
process.exit(fails ? 1 : 0);
