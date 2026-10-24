import { decode, encode, zoom } from './png.mjs';
const im = decode(new URL('../../art/logo.png', import.meta.url).pathname);
const col = x => { let s = ''; for (let y = 0; y < im.h; y++) { const i = (y * im.w + x) * 4; s += im.rgba[i + 3] < 128 ? '_' : im.rgba[i] + ',' + im.rgba[i + 1] + ',' + im.rgba[i + 2] + ';'; } return s; };
let dup = [], cols = []; for (let x = 0; x < im.w; x++) cols.push(col(x));
for (let x = 1; x < im.w; x++) if (cols[x] === cols[x - 1]) dup.push(x);
const empty = cols.map((c, x) => /^_+$/.test(c) ? x : -1).filter(x => x >= 0);
console.log('colonnes identiques à la précédente :', dup.length, dup.join(' '));
console.log('colonnes vides :', empty.length, empty.join(' '));
// colonnes par nombre de pixels opaques aux bords
for (const x of [0, 1, 2, 3, 196, 197, 198, 199]) console.log('col', x, 'opaques', (cols[x].match(/;/g) || []).length);
encode(new URL('logo-x4.png', import.meta.url).pathname, ...Object.values(zoom(im, 4)));
