/* tools/L4a/construire.mjs — la page d'essai du lot 4a (Bestiaire I).

     node tools/L4a/construire.mjs            -> tools/L4a/index.html  (le bundle, tel que le jeu le construit)
                                              -> tools/L4a/bestiaire.html (le même, plus les planches de art/sprites/)

   index.html est la page d'essai réglementaire (worktree.sh essai L4a) : le bundle avec les replis des autres
   lots. bestiaire.html y ajoute, POUR L'ESSAI SEULEMENT, une cale qui sert les planches de art/sprites/
   (dard, larve, traqueur, couronne, portail…) par N.spr.get tant que 40-sprites.js (lot 6a) ne les livre
   pas : on y voit le bestiaire tel qu'il sera, avec ses vrais sprites. La cale ne touche à rien d'autre ; elle
   n'est jamais livrée (les pages d'essai ne sont pas recopiées par worktree.sh integrer).

   Puis : ?banc=bestiaire ouvre une scène de démonstration (chaque type isolé, en rangée, devant la tête). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lirePNG } from '../sprites2/commun.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(ICI, '..', '..');
const NODE = process.execPath;

execFileSync(NODE, [path.join(PROTO, 'build.mjs'), path.join(ICI, 'index.html')], { stdio: 'inherit' });

/* les planches de art/sprites/, en index de palette (l'index du PNG EST l'index du jeu, 0 transparent) */
const cat = JSON.parse(fs.readFileSync(path.join(PROTO, 'art/sprites/catalogue.json'), 'utf8')).sprites;
const VOULUS = ['dard', 'larve', 'traqueur', 'couronne', 'portail', 'mini:fleche', 'mini:dard', 'mini:larve', 'mini:mine',
  'mini:tourelle', 'mini:sentinelle', 'mini:traqueur', 'fleche:elite', 'plaque'];
const planches = {};
for (const nom of VOULUS) {
  const c = cat[nom]; if (!c) continue;
  const img = lirePNG(path.join(PROTO, 'art/sprites', c.fichier));
  planches[nom] = { w: c.w, h: c.h, cx: c.cx, cy: c.cy, dirs: c.dirs, images: c.images, W: img.w, data: Buffer.from(img.ind).toString('base64') };
}
const cale = `<script>
/* cale d'essai du lot 4a : sert les planches de art/sprites/ par N.spr.get (jamais livrée) */
(function () {
  var P = ${JSON.stringify(planches)}, cache = {};
  function decoupe(nom, d, img) {
    var p = P[nom]; if (!p) return null;
    var dir = p.dirs > 1 ? ((d | 0) % 16 + 16) % 16 : 0, im = ((img | 0) % p.images + p.images) % p.images, k = nom + '|' + dir + '|' + im;
    if (cache[k]) return cache[k];
    if (!p.bytes) { var s = atob(p.data); p.bytes = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) p.bytes[i] = s.charCodeAt(i); }
    var o = { w: p.w, h: p.h, cx: p.cx, cy: p.cy, data: new Uint8Array(p.w * p.h) };
    for (var y = 0; y < p.h; y++) for (var x = 0; x < p.w; x++) o.data[y * p.w + x] = p.bytes[(dir * p.h + y) * p.W + im * p.w + x];
    return (cache[k] = o);
  }
  var t = setInterval(function () {
    var N = window.__N; if (!N || !N.spr || !N.spr.get || N.spr.__cale) return;
    var get0 = N.spr.get;
    N.spr.get = function (nom, d, img) { return decoupe(String(nom), d, img) || get0(nom, d, img); };
    N.spr.__cale = true; clearInterval(t);
  }, 0);
})();
</script>`;
let html = fs.readFileSync(path.join(ICI, 'index.html'), 'utf8');
html = html.replace('<script>', cale + '\n<script>');
fs.writeFileSync(path.join(ICI, 'bestiaire.html'), html);
console.log('tools/L4a/index.html et tools/L4a/bestiaire.html construits (' + Object.keys(planches).length + ' planches de art/sprites/)');
