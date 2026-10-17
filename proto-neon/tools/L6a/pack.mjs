/* tools/L6a/pack.mjs — recopie les planches de art/sprites/ et de art/interface/ dans src/40-sprites.js.

   build.mjs n'injecte que les PNG posés directement dans art/ ; les LISEZMOI de ces deux dossiers proposent
   de recopier leurs index dans 40-sprites.js, ce que fait ce script (lot 6a). Aucun décodage asynchrone en
   jeu : chaque planche devient une chaîne RLE en base64, décodée à la première demande.

   Format d'une entrée : [W, H, w, h, cx, cy, dirs, images, mode, données]
     W, H     taille de la planche ; w, h taille d'une image ; (cx, cy) l'ancre ;
     mode 0   art/sprites : image (d, k) en x = k × w, y = d × h ;
     mode 1   art/interface : image (d, k) en x = (d × images + k) × w, y = 0 ;
     données  RLE en octets (encre << 4 | longueur − 1), longueurs de 1 à 16, en base64.
   Les noms de art/sprites sont gardés tels quels ; ceux de art/interface prennent le préfixe « ui: ».

     node tools/L6a/pack.mjs           réécrit le bloc entre les marques ACTIFS de src/40-sprites.js
     node tools/L6a/pack.mjs --verifier  décode tout et compare pixel à pixel avec les PNG (sortie 1 si écart)

   Aucune dépendance, aucun hasard : relancer redonne les mêmes octets. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lirePNG } from '../sprites2/commun.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PN = path.resolve(HERE, '../..');
const SRC = path.join(PN, 'src/40-sprites.js');
const DEBUT = '/* <<< ACTIFS : généré par tools/L6a/pack.mjs depuis art/sprites/ et art/interface/, ne pas éditer à la main */';
const FIN = '/* >>> ACTIFS */';

function rle(d) {
  const out = [];
  for (let i = 0; i < d.length;) {
    const c = d[i]; let n = 1;
    while (i + n < d.length && d[i + n] === c && n < 16) n++;
    if (c > 15) throw new Error('index hors palette : ' + c);
    out.push((c << 4) | (n - 1)); i += n;
  }
  return Buffer.from(out).toString('base64');
}
function derle(b64, n) {
  const b = Buffer.from(b64, 'base64'), o = new Uint8Array(n); let j = 0;
  for (const v of b) { const c = v >> 4, k = (v & 15) + 1; o.fill(c, j, j + k); j += k; }
  if (j !== n) throw new Error('longueur ' + j + ' ≠ ' + n);
  return o;
}

const entrees = [];
/* art/sprites : le bestiaire, les marques, les portails, LE CYCLOPE */
{
  const cat = JSON.parse(fs.readFileSync(path.join(PN, 'art/sprites/catalogue.json'), 'utf8')).sprites;
  for (const nom of Object.keys(cat).sort()) {
    const s = cat[nom]; if (!s || !s.fichier) continue;
    const p = lirePNG(path.join(PN, 'art/sprites', s.fichier));
    if (p.w !== s.w * s.images || p.h !== s.h * s.dirs) throw new Error(nom + ' : planche ' + p.w + '×' + p.h + ' inattendue');
    entrees.push([nom, [p.w, p.h, s.w, s.h, s.cx, s.cy, s.dirs, s.images, 0, rle(p.ind)], p.ind]);
  }
}
/* art/interface : icônes de cartes, cadres, jauges, radar, chevrons, marqueurs, bannières, chiffres, boutons… */
{
  const cat = JSON.parse(fs.readFileSync(path.join(PN, 'art/interface/interface.json'), 'utf8')).sprites;
  for (const nom of Object.keys(cat).sort()) {
    const s = cat[nom]; if (!s || !s.fichier) continue;
    const p = lirePNG(path.join(PN, 'art/interface', s.fichier)), dirs = s.directions || 1, im = s.images || 1;
    if (p.w !== s.w * im * dirs || p.h !== s.h) throw new Error(nom + ' : planche ' + p.w + '×' + p.h + ' inattendue');
    const a = s.ancre || [(s.w - 1) >> 1, (s.h - 1) >> 1];
    entrees.push(['ui:' + nom, [p.w, p.h, s.w, s.h, a[0], a[1], dirs, im, 1, rle(p.ind)], p.ind]);
  }
}

if (process.argv.includes('--verifier')) {
  let ecarts = 0;
  for (const [nom, e, ind] of entrees) {
    const d = derle(e[9], e[0] * e[1]);
    for (let i = 0; i < d.length; i++) if (d[i] !== ind[i]) { ecarts++; console.log('écart', nom, i); break; }
  }
  console.log(entrees.length + ' planches vérifiées, ' + ecarts + ' écart(s)');
  process.exit(ecarts ? 1 : 0);
}

const lignes = entrees.map(([nom, e]) => '    ' + JSON.stringify(nom) + ': ' + JSON.stringify(e));
const bloc = DEBUT + '\n  var ACTIFS = {\n' + lignes.join(',\n') + '\n  };\n  ' + FIN;
let src = fs.readFileSync(SRC, 'utf8');
const a = src.indexOf(DEBUT), b = src.indexOf(FIN);
if (a < 0 || b < 0) throw new Error('marques ACTIFS absentes de src/40-sprites.js');
src = src.slice(0, a) + bloc + src.slice(b + FIN.length);
fs.writeFileSync(SRC, src);
const octets = lignes.reduce((t, l) => t + l.length, 0);
console.log('pack : ' + entrees.length + ' planches, ' + octets + ' octets dans src/40-sprites.js');
