/* Essais de N.gfx (lot B) en Node pur : origine de dessin, plan bouclé sans couture, remappage, fondu de Bayer.
   Usage : node proto-neon/tools/B/gfx.mjs */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src') + path.sep;
const ctx = { console, Math, Object, Uint8Array, Uint32Array, ArrayBuffer }; ctx.globalThis = ctx; ctx.__N = {}; vm.createContext(ctx);
for (const f of ['00-pal.js', '10-gfx.js']) vm.runInContext(fs.readFileSync(SRC + f, 'utf8'), ctx, { filename: f });
const g = ctx.__N.gfx; g.resize(422, 195, 422, 195);
const W = g.W, H = g.H, B = g.buf(); let ok = 0, ko = 0;
const t = (nom, cond) => { if (cond) ok++; else { ko++; console.log('ÉCHEC', nom); } };
// origine : un blit à (110, 60) avec l'origine (100, 50) tombe en (10, 10)
g.clear(0); g.origin(100, 50); g.blit({ w: 2, h: 2, data: new Uint8Array([7, 7, 7, 7]) }, 110, 60); g.origin(0, 0);
t('blit décalé', B[10 * W + 10] === 7 && B[11 * W + 11] === 7 && B[60 * W + 110] === 0);
g.clear(0); g.origin(100, 50); g.rect(100, 50, 3, 3, 5); g.px(103, 53, 6); g.line(100, 60, 105, 60, 8); g.circ(150, 100, 3, 9); g.origin(0, 0);
t('rect/px/line/circ décalés', B[0] === 5 && B[2 * W + 2] === 5 && B[3 * W + 3] === 6 && B[10 * W + 5] === 8 && B[50 * W + 50] === 9);
// plan bouclé : 8 colonnes distinctes, posé à x = -3 : la colonne 0 de l'écran porte la colonne 3 du plan, etc., sans couture
const img = { w: 8, h: 2, data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8]) };
g.clear(0); g.layer(img, { x: -3, y: 4, wrapX: true, opaque: true });
let seam = true; for (let x = 0; x < W; x++) if (B[4 * W + x] !== ((x + 3) % 8) + 1) seam = false;
t('plan bouclé sans couture', seam && B[5 * W + 9] === ((9 + 3) % 8) + 1);
// plan avec table de couleurs par rangée
const lut = new Uint8Array(16); for (let i = 0; i < 16; i++) lut[i] = 15 - i; const luts = [null, lut];
g.clear(0); g.layer(img, { x: 0, y: 0, opaque: true, luts: [new Uint8Array([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]), lut] });
t('luts par rangée', B[0] === 9 && B[1] === 9 && B[W + 1] === 13);
// transparence du plan (index 0) et remap
g.clear(3); g.layer({ w: 2, h: 1, data: new Uint8Array([0, 5]) }, { x: 4, y: 4 });
t('index 0 transparent', B[4 * W + 4] === 3 && B[4 * W + 5] === 5);
g.remap(lut); t('remap', B[4 * W + 4] === 12 && B[4 * W + 5] === 10);
// fondu de Bayer : p = 0 ne change rien, p = 1 prend tout, p = 0,5 environ la moitié
const src = new Uint8Array(W * H).fill(7); g.clear(1); g.mixBayer(src, 0); t('mix 0', B.every(v => v === 1));
g.mixBayer(src, 0.5); let n7 = 0; for (let i = 0; i < B.length; i++) if (B[i] === 7) n7++; t('mix 0,5 ≈ moitié', Math.abs(n7 / B.length - 0.5) < 0.02);
g.mixBayer(src, 1); t('mix 1', B.every(v => v === 7));
// copyTo, masque de propriété
const cp = g.copyTo(null); t('copyTo', cp.length === B.length && cp[100] === 7);
g.masque(true); g.owner(3); g.clear(0); g.rect(2, 2, 2, 2, 5); g.owner(9); g.px(10, 10, 5);
const M = g.mask(); t('masque', M[2 * W + 2] === 3 && M[3 * W + 3] === 3 && M[10 * W + 10] === 9 && M[0] === 0);
g.masque(false); t('masque coupé', g.mask() === null);
console.log(ko === 0 ? `gfx : ${ok} contrôles passés` : `gfx : ${ko} échec(s)`); process.exit(ko ? 1 : 0);
