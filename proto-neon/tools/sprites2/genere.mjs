/* node tools/sprites2/genere.mjs — fabrique le nouveau bestiaire et LE CYCLOPE, de façon reproductible.

   Écrit :
     art/sprites/<nom>.png      une planche par sprite : colonnes = images d'animation, rangées = directions
                                (0 à 15, 0 vers la droite, sens horaire à l'écran) ; PNG indexé dans la palette
                                exacte du jeu, index 0 transparent ; « : » du nom devient « - » dans le fichier
     art/sprites/catalogue.json nom, fichier, taille, ancre, directions, images, lot, rôle, points d'attache
     tools/sprites2/out/        planches de contrôle agrandies (couleur, niveaux de gris, scène à la taille du
                                jeu) et rapport des vérifications (palette, cyan, contour, silhouettes)
   Aucune dépendance. Rien n'est tiré au hasard. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { Img, RGB, LUM, TR, CYAN, CYP, NP, ecrirePNG, ecrireRGB, lirePNG, texte } from './commun.mjs';
import { SPRITES } from './bestiaire.mjs';
import { CYCLOPE, assemble, carcasse, fournir } from './cyclope.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../..');
const ART = path.join(RACINE, 'art/sprites');
const OUT = path.join(ICI, 'out');
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const TOUS = SPRITES.concat(CYCLOPE);
const fichier = nom => nom.replace(/:/g, '-') + '.png';

/* le catalogue figé, lu sans rien exécuter du jeu : on extrait le tableau SPRITES de 03-socle.js */
function catalogueFige() {
  const src = fs.readFileSync(path.join(RACINE, 'src/03-socle.js'), 'utf8');
  const m = src.match(/var SPRITES = \[([\s\S]*?)\n  \];/);
  const out = {};
  if (!m) return out;
  for (const l of m[1].matchAll(/\['([^']+)', (\d+), (\d+), (\d+), (\d+), '([^']*)'/g)) out[l[1]] = { w: +l[2], h: +l[3], dirs: +l[4], images: +l[5], lot: l[6] };
  for (const t of ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'lame', 'ruche', 'sentinelle', 'rival', 'planeur', 'traqueur', 'cyclope', 'convoi'])
    out['mini:' + t] = { w: 5, h: 5, dirs: 1, images: 1, lot: '6a' };
  return out;
}
const FIGE = catalogueFige();

/* ---- fabrication ---- */
const rapport = [], erreurs = [];
const cat = {};
const images = {};                         /* nom -> [dir][img] Img */
fournir(images);
for (const s of TOUS) {
  const grille = [];
  for (let k = 0; k < s.dirs; k++) {
    const rang = [];
    for (let f = 0; f < s.images; f++) {
      const im = s.gen(k, f);
      if (im.w !== s.w || im.h !== s.h) erreurs.push(`${s.nom} dir ${k} img ${f} : ${im.w}×${im.h} au lieu de ${s.w}×${s.h}`);
      rang.push(im);
    }
    grille.push(rang);
  }
  images[s.nom] = grille;
  const planche = new Img(s.w * s.images, s.h * s.dirs);
  for (let k = 0; k < s.dirs; k++) for (let f = 0; f < s.images; f++) planche.blit(grille[k][f], f * s.w, k * s.h);
  ecrirePNG(path.join(ART, fichier(s.nom)), planche);
  const fige = FIGE[s.nom];
  if (fige && (fige.w !== s.w || fige.h !== s.h || fige.dirs !== s.dirs || fige.images !== s.images))
    erreurs.push(`${s.nom} : ${s.w}×${s.h}, ${s.dirs} dir, ${s.images} img ; le catalogue figé dit ${fige.w}×${fige.h}, ${fige.dirs} dir, ${fige.images} img`);
  if (!fige && !s.hors) erreurs.push(`${s.nom} : absent du catalogue figé et pas marqué « hors »`);
  cat[s.nom] = {
    fichier: fichier(s.nom), w: s.w, h: s.h, cx: s.cx ?? ((s.w - 1) >> 1), cy: s.cy ?? ((s.h - 1) >> 1),
    dirs: s.dirs, images: s.images, lot: s.lot, catalogue: !!fige, role: s.role,
    ...(s.points ? { points: s.points } : {}), ...(s.ms ? { ms: s.ms } : {})
  };
}
const ASSEMBLAGE = assemble(images);
cat['colosse:assemblage'] = ASSEMBLAGE.description;
fs.writeFileSync(path.join(ART, 'catalogue.json'), JSON.stringify({
  format: 'planche PNG indexée : colonnes = images, rangées = directions ; index 0 transparent ; palette dans l ordre de 00-pal.js',
  genere: 'node tools/sprites2/genere.mjs', sprites: cat
}, null, 1) + '\n');

/* ---- vérifications ---- */
const MENACES = TOUS.filter(s => !s.mini && !['marque:pastille', 'marque:pastille:loin', 'marque:mine:loin'].includes(s.nom));
for (const s of TOUS) for (const rang of images[s.nom]) for (const im of rang) {
  for (const v of im.d) if (v === CYAN || v === CYP) { erreurs.push(`${s.nom} : CYAN dans un sprite ennemi`); break; }
}
for (const s of MENACES) {
  if (s.sansContour) continue;
  let fautes = 0, bord = 0;
  for (const rang of images[s.nom]) for (const im of rang) for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const v = im.get(x, y); if (v === TR) continue;
    let ext = x === 0 || y === 0 || x === im.w - 1 || y === im.h - 1;
    for (let dy = -1; dy <= 1 && !ext; dy++) for (let dx = -1; dx <= 1 && !ext; dx++) if ((dx || dy) && im.get(x + dx, y + dy) === TR) ext = true;
    if (ext) { bord++; if (v !== NP) fautes++; }
  }
  if (fautes) erreurs.push(`${s.nom} : ${fautes} pixels de bord sur ${bord} ne sont pas en nuit profonde`);
}

/* silhouettes : intersection sur union des masques binaires, centrés, deux à deux (lots 6a, 6b) */
function anciens() {
  const ctx = { globalThis: {}, console };
  ctx.window = undefined; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(RACINE, 'src/40-sprites.js'), 'utf8'), ctx);
  const N = ctx.__N; const r = {};
  for (const n of ['fleche', 'mine', 'tourelle', 'sentinelle']) { const s = N.spr.make(n, 0); const im = new Img(s.w, s.h); im.d.set(s.data); r[n] = im; }
  return r;
}
let ANC = {};
try { ANC = anciens(); } catch (e) { rapport.push('40-sprites.js illisible hors navigateur (' + e.message + ') : silhouettes comparées aux seuls nouveaux'); }
const TYPES = { ...ANC };
for (const n of ['dard', 'larve', 'lame', 'lame:deployee', 'ruche', 'rival', 'planeur', 'traqueur', 'fleche:elite', 'ruche:elite']) TYPES[n] = images[n][0][0];
/* gaine = true : le contour compte dans le masque ; false : seuls les pixels d'encre (ce qui se détache
   du fond sur la planche en niveaux de gris, où la nuit profonde se confond avec le noir) */
function iou(a, b, gaine) {
  const W = 40; let i = 0, u = 0;
  const m = (s, x, y) => { const v = s.get(x, y); return v !== TR && (gaine || v !== NP); };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const ax = x - 20 + a.cx, ay = y - 20 + a.cy, bx = x - 20 + b.cx, by = y - 20 + b.cy;
    const p = m(a, ax, ay), q = m(b, bx, by);
    if (p && q) i++; if (p || q) u++;
  }
  return i / u;
}
const noms = Object.keys(TYPES), DEMO = Object.keys(ANC);
for (const gaine of [false, true]) {
  const table = [];
  for (let i = 0; i < noms.length; i++) for (let j = i + 1; j < noms.length; j++) {
    if (noms[i] === 'lame' && noms[j] === 'lame:deployee') continue;     /* deux états du même type */
    table.push([noms[i], noms[j], iou(TYPES[noms[i]], TYPES[noms[j]], gaine)]);
  }
  table.sort((a, b) => b[2] - a[2]);
  const titre = gaine ? 'masques AVEC la gaine de nuit profonde' : 'masques d encre, SANS la gaine (planche en niveaux de gris)';
  rapport.push(`Silhouettes, ${titre} : pire paire ${table[0][0]}/${table[0][1]} à ${table[0][2].toFixed(2)} ; ` +
    `${table.filter(t => t[2] >= 0.6).length} paires sur ${table.length} à 0,6 ou plus` +
    (table[0][2] >= 0.6 ? ' : ' + table.filter(t => t[2] >= 0.6).map(([a, b, v]) => `${a}/${b} ${v.toFixed(2)}`).join(', ') : ''));
  if (!gaine) for (const [a, b, v] of table) if (v >= 0.6 && !(DEMO.includes(a) && DEMO.includes(b))) erreurs.push(`silhouettes trop proches (sans gaine) : ${a} / ${b} IoU ${v.toFixed(2)}`);
}

/* ---- planches de contrôle ---- */
function planche(fileName, liste, k, gris) {
  /* mise en page : une ligne par sprite ; ses images (dir 0) puis, s'il est orienté, ses 16 directions */
  const pad = 4, lignes = [];
  let W = 0, H = pad;
  for (const s of liste) {
    const cells = [];
    for (let f = 0; f < s.images; f++) cells.push(images[s.nom][0][f]);
    if (s.dirs > 1) for (let d = 1; d < s.dirs; d++) cells.push(images[s.nom][d][0]);
    const lw = 90 + cells.reduce((a, c) => a + (c.w * k) + pad, 0);
    lignes.push({ s, cells, y: H });
    W = Math.max(W, lw); H += Math.max(...cells.map(c => c.h)) * k + 8 + pad;
  }
  W += pad;
  const rgb = new Uint8Array(W * H * 3);
  const fond = gris ? [0, 0, 0] : RGB[0];
  for (let i = 0; i < W * H; i++) { rgb[i * 3] = fond[0]; rgb[i * 3 + 1] = fond[1]; rgb[i * 3 + 2] = fond[2]; }
  for (const { s, cells, y } of lignes) {
    texte(rgb, W, pad, y + 2, s.nom.slice(0, 22));
    texte(rgb, W, pad, y + 9, `${s.w}X${s.h} ${s.dirs}D ${s.images}I`);
    let x = 90;
    for (const c of cells) {
      for (let j = 0; j < c.h * k; j++) for (let i = 0; i < c.w * k; i++) {
        const v = c.get((i / k) | 0, (j / k) | 0), o = ((y + j) * W + x + i) * 3;
        if (v === TR) { if (((i / k | 0) + (j / k | 0)) & 1) { rgb[o] = fond[0] + 10; rgb[o + 1] = fond[1] + 8; rgb[o + 2] = fond[2] + 12; } continue; }
        const g = gris ? Math.round(255 * Math.pow(LUM[v], 1 / 2.2)) : -1;
        const col = gris ? [g, g, g] : RGB[v];
        rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
      }
      x += c.w * k + pad;
    }
  }
  ecrireRGB(path.join(OUT, fileName), W, H, rgb);
}
const ENNEMIS = SPRITES.filter(s => !['mini', 'portail', 'marque', 'convoi'].includes(s.famille));
const DIVERS = SPRITES.filter(s => ['mini', 'portail', 'marque', 'convoi'].includes(s.famille));
planche('planche-ennemis.png', ENNEMIS, 4, false);
planche('planche-ennemis-gris.png', ENNEMIS, 4, true);
planche('planche-marques.png', DIVERS, 4, false);
planche('planche-cyclope.png', CYCLOPE, 3, false);

/* scène à la taille du jeu : le CYCLOPE assemblé et le bestiaire posés sur un vrai fond (horizon.png),
   puis agrandis ×3 comme sur un iPhone (px = 2 ou 3) */
function scene(fileName, compose, kk = 3) {
  const W = 384, H = 216, fond = lirePNG(path.join(RACINE, 'art/horizon.png'));
  const idx = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) idx[y * W + x] = fond.ind ? fond.ind[Math.min(fond.h - 1, y) * fond.w + Math.min(fond.w - 1, x + 64)] : 0;
  const pose = (im, x, y) => { for (let j = 0; j < im.h; j++) for (let i = 0; i < im.w; i++) { const v = im.get(i, j); if (v !== TR && x + i >= 0 && x + i < W && y + j >= 0 && y + j < H) idx[(y + j) * W + x + i] = v; } };
  compose(pose);
  const rgb = new Uint8Array(W * kk * H * kk * 3);
  for (let y = 0; y < H * kk; y++) for (let x = 0; x < W * kk; x++) { const c = RGB[idx[((y / kk) | 0) * W + ((x / kk) | 0)]], o = (y * W * kk + x) * 3; rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2]; }
  ecrireRGB(path.join(OUT, fileName), W * kk, H * kk, rgb);
}
scene('scene-bestiaire.png', pose => {
  const L = [['dard', 2, 0], ['dard', 7, 1], ['larve', 3, 0], ['larve', 9, 1], ['larve', 13, 0], ['traqueur', 0, 1], ['lame', 5, 0], ['lame:deployee', 1, 1],
    ['ruche', 0, 0], ['ruche:p1', 0, 1], ['ruche:p2', 0, 0], ['ruche:elite', 0, 1], ['rival', 2, 0], ['planeur', 12, 0], ['planeur', 13, 1], ['planeur', 14, 0],
    ['fleche:elite', 6, 0], ['fleche:elite:nue', 10, 1]];
  L.forEach(([n, d, f], i) => { const im = images[n][Math.min(d, images[n].length - 1)][f]; pose(im, 14 + (i % 9) * 40, 110 + ((i / 9) | 0) * 46); });
  pose(images.couronne[0][0], 14 + 6 * 40 - 2, 110 + 46 - 2); pose(images['fleche:elite'][6][0], 14 + 6 * 40, 110 + 46);
  /* le RIVAL et ses perles, en file */
  for (let j = 9; j >= 1; j--) pose(images['rival:perle'][0][j & 1], 250 - j * 5, 80);
  pose(images.rival[0][0], 252, 78);
  /* un convoi */
  pose(images['wagon:tete'][0][0], 160, 20);
  for (let j = 1; j < 6; j++) pose(images.wagon[0][j & 1], 160 - j * 18, 20);
  pose(images.portail[0][0], 4, 60); pose(images['mini:dard'][0][0], 12, 61);
  pose(images['portail:double'][8][0], 360, 58); pose(images['mini:ruche'][0][0], 352, 60);
  pose(images['portail:sol'][0][3], 300, 60); pose(images['portail:sol:elite'][0][4], 320, 56);
});
/* le CYCLOPE assemblé, en PNG indexé, phase par phase (à regarder à la loupe avec voir.mjs) */
{
  const A = new Img(96 * 3 + 8, 128 + 70);
  A.blit(ASSEMBLAGE.image(1, 'oeil'), 0, 0); A.blit(ASSEMBLAGE.image(2, 'oeil:vise'), 100, 0); A.blit(ASSEMBLAGE.image(3, 'oeil:colere', 1), 200, 0);
  A.blit(carcasse(), 100, 132);
  ecrirePNG(path.join(OUT, 'cyclope-assemble.png'), A);
}
scene('scene-cyclope.png', pose => {
  pose(ASSEMBLAGE.image(1, 'oeil'), 40, 40);
  pose(ASSEMBLAGE.image(2, 'oeil'), 150, 40);
  pose(ASSEMBLAGE.image(3, 'oeil:colere'), 260, 40);
  pose(carcasse(), 150, 160);
});

/* ---- rapport ---- */
const n = TOUS.length, nf = TOUS.filter(s => FIGE[s.nom]).length;
rapport.unshift(`${n} sprites écrits dans art/sprites/ (${nf} du catalogue figé, ${n - nf} en plus, marqués « hors catalogue »)`);
const absents = Object.keys(FIGE).filter(k => FIGE[k].lot !== 'demo' && !cat[k] && /^(dard|larve|traqueur|lame|ruche|rival|planeur|fleche:elite|plaque|couronne|wagon|colosse:|portail|mini:)/.test(k));
if (absents.length) rapport.push('Du catalogue figé, pas fabriqués ici : ' + absents.join(', '));
fs.writeFileSync(path.join(OUT, 'rapport.txt'), rapport.concat(erreurs.length ? ['ERREURS :'].concat(erreurs) : ['Aucune erreur.']).join('\n') + '\n');
console.log(rapport.join('\n'));
if (erreurs.length) { console.log('ERREURS :\n' + erreurs.join('\n')); process.exitCode = 1; } else console.log('Aucune erreur.');

/* ---- LISEZMOI.md, écrit à partir du catalogue : il ne peut pas se désaccorder des planches ---- */
{
  const A = ASSEMBLAGE.description;
  const ligne = (nom, c) => `| \`${nom}\` | \`${c.fichier}\` | ${c.w} × ${c.h} | (${c.cx}, ${c.cy}) | ${c.dirs === 16 ? '16' : '1'} | ${c.images} | ${c.catalogue ? 'oui' : '**hors**'} | ${c.role}${c.points ? ' — attaches : ' + Object.entries(c.points).map(([k, v]) => k + ' ' + JSON.stringify(v)).join(', ') : ''} |`;
  const sections = [
    ['Ennemis', s => !['mini', 'portail', 'marque', 'convoi', 'cyclope'].includes(s.famille)],
    ['Marques des élites et des modificateurs', s => s.famille === 'marque' && !s.nom.startsWith('marque:')],
    ['Convois', s => s.famille === 'convoi'],
    ['Portails', s => s.famille === 'portail'],
    ['Mini-silhouettes du radar et des chevrons', s => s.famille === 'mini'],
    ['Marqueurs permanents hors champ', s => s.nom.startsWith('marque:')],
    ['LE CYCLOPE', s => s.famille === 'cyclope']
  ];
  const tete = '| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |\n|---|---|---|---|---|---|---|---|';
  const md = `# art/sprites — le nouveau bestiaire et LE CYCLOPE

*Fabriqué par \`node tools/sprites2/genere.mjs\` (aucune dépendance, aucun hasard : relancer donne les mêmes
octets). Ce fichier est écrit par le script : ne le corrigez pas à la main, corrigez le script. Les sources
du dessin sont \`tools/sprites2/bestiaire.mjs\` et \`tools/sprites2/cyclope.mjs\`.*

Ce sont des **actifs à brancher** par les lots 6a et 6b (\`40-sprites.js\`), 4a et 4b (\`72-ennemis.js\`) et 5b
(\`73-colosse.js\`). Rien dans \`src/\` ne les charge encore.

## Le format

- **Une planche PNG par sprite.** Colonnes = images d'animation (0, 1, …), rangées = directions. L'image
  \`(dir, img)\` est le rectangle \`x = img × w\`, \`y = dir × h\`, de taille \`w × h\`.
- **PNG indexé, palette exacte du jeu** : les 16 entrées de la PLTE sont les 16 encres de \`DIRECTION.md\` dans
  l'ordre de \`00-pal.js\` (vide, nuit, ardoise, violet, indigo, magenta, rose pâle, cyan, cyan pâle, ambre,
  jaune, brasier, os, acier, sang, nuit profonde). **L'index 0 est transparent** (tRNS), comme dans le format
  \`{w, h, data}\` de \`N.spr.make\` : l'index lu dans le PNG est directement l'index du jeu, sans conversion.
  L'encre « vide » n'est donc jamais posée dans un sprite.
- **Directions** : 0 = vers la droite, puis sens des aiguilles d'une montre à l'écran (4 = bas, 8 = gauche,
  12 = haut), comme \`N.spr.get(nom, dir, img)\`. Les seize directions sont **déjà tournées** (RotSprite, la
  même chaîne que \`genFleche\` de 40-sprites.js : carte pointe en haut, rotation, ombrage avec la lumière
  toujours en haut à gauche, puis contour) et **déjà détourées** : ne les retournez pas, ne leur ajoutez pas
  de contour. Un sprite à une seule rangée n'a pas d'orientation.
- **Ancre** \`(cx, cy)\` : le pixel qui se pose sur la position de l'objet : \`blit(s, x − cx, y − cy)\`. Pour les
  sprites orientés, c'est le centre de rotation.
- **Les tailles comprennent le contour** d'un pixel en nuit profonde (une carte de 13 × 13 fait un sprite de
  15 × 15), comme dans 40-sprites.js. Elles sont **celles du catalogue figé** \`N.ids.sprites\`
  (\`src/03-socle.js\`) : le script le relit et refuse tout écart.
- **« hors »** : un état ou une variante en plus du catalogue figé (l'état est dans le nom, comme le veut le
  contrat : \`fleche:elite:nue\`, \`colosse:oeil:vise\`). Le lot qui les branche demande leur entrée au gardien
  (\`N.ids.sprites\`) ; sans elle, \`N.spr.get\` rend le repli procédural, et rien ne casse.
- \`catalogue.json\` donne tout cela en machine : fichier, taille, ancre, directions, images, lot, rôle, points
  d'attache, et l'assemblage du CYCLOPE.
- **Le chargement** : \`build.mjs\` n'injecte que les PNG posés directement dans \`art/\`. Pour ces planches,
  le lot qui les branche choisit : les faire injecter (demande à l'intégrateur, qui tient \`build.mjs\`), ou
  recopier leurs index dans 40-sprites.js. Le script est la source : la recopie se régénère.

## Les règles tenues (vérifiées à chaque fabrication)

${rapport.map(l => '- ' + l).join('\n')}
- Aucun pixel cyan ni cyan pâle dans aucune planche ; 100 % des pixels dans la palette (l'écriture refuse
  tout index hors des seize).
- Contour : sur toutes les menaces, 100 % des pixels de bord (voisins d'un transparent, coins compris, ou
  sur le cadre) sont en nuit profonde, dans toutes les directions et toutes les images.
- **Silhouettes** : le critère des lots 6a et 6b se lit sur la planche en niveaux de gris, où la gaine de
  nuit profonde se confond avec le fond ; mesuré ainsi, aucune paire n'atteint 0,6. Compté AVEC la gaine,
  des sprites compacts de 13 à 15 px se recouvrent forcément : même les quatre sprites de la démo dépassent
  0,6 entre eux (flèche / mine 0,74). Les deux mesures sont dans \`tools/sprites2/out/rapport.txt\`.
- Rien n'est cyan ; le cyan reste à la joueuse. La forme dit la famille : pointes pour ceux qui foncent
  (dard, lame, flèche blindée), pattes pour la larve, pétales pour la ruche, perles pour le RIVAL, aile pour
  le planeur, disque à œil pour le traqueur.

## Ce qui n'est pas un fichier

- **La rémanence RAPIDE** n'est pas un sprite (contrat, § 7) : c'est le sprite du type posé en sang tramé
  (\`blit\` avec \`ci\` sang, une image sur deux en damier de Bayer à 50 %), deux fois, en retard de 1 et 2 images.
- **L'état \`proie\` de l'INVERSION** : ardoise pleine, contour rose pâle, gaine de nuit profonde. Se fait au
  vol sur n'importe quel sprite : tout pixel d'encre devient ardoise, sauf ceux qui touchent la gaine, qui
  deviennent rose pâle ; la gaine reste. Le dernier temps clignote en os (\`ci\`).
- **La LAME en récupération** (« corps rose pâle ») : \`blit\` de \`lame\` avec \`ci\` rose pâle sur les pixels
  d'encre (la gaine reste) ; ou la table magenta → rose pâle, sang → magenta.
- **Les silhouettes de décor du CYCLOPE** (\`colosseLoin\`, \`colosseMi\`) sont faites par le lot du décor :
  \`art/decor/colosse-loin.png\` et \`art/decor/colosse-mi.png\`.
- **Les télégraphes** (lignes, losanges, ombre de 40 px des BONDS, arcs du RAYON BALAYANT) sont dessinés par
  \`N.fx.tele\`, pas par des sprites.

## LE CYCLOPE, assemblé

Le corps mesure **${A.w} × ${A.h}** (REFONTE.md § 4.8). Dans ce cadre (origine = coin haut gauche du sprite
posé), du fond vers l'avant :

| pièce | sprite | position | remarque |
|---|---|---|---|
| tronc | \`colosse:tronc\` (phases 1 et 2), \`colosse:tronc:colere\` (phase 3) | (${A.tronc}) | 96 × 96 ; ses alvéoles de machinerie sont sous les plaques, ses douilles de poignet sous les mains |
| tête | \`colosse:tete\` | (${A.tete}) | 40 × 32 ; l'orbite est vide |
| œil | \`colosse:oeil\`, \`:oeilFerme\`, \`:oeil:vise\`, \`:oeil:charge\`, \`:oeil:colere\`, \`:oeil:mort\` | (${A.oeil}) | centre (${A.oeilCentre}) ; **seul point faible avec les mains** |
| mains | \`colosse:main\`, direction ${A.mainDirection} (elles pendent), image 0 | ${A.mains.map(p => '(' + p + ')').join(' et ')} | en phase 2 elles se détachent : image 1 (lame) dans la direction de la charge |
| plaques | \`colosse:plaque\` ×6 | ${A.plaques.map(p => '(' + p + ')').join(', ')} | épaulières, poitrine, tassettes ; tombent en phase 2 et restent au sol |

**Par phase** :

- **Entrée** (2,2 s du plan P5 au plateau, du sang au magenta) : l'assemblage de la phase 1 posé d'abord avec
  la table OMBRE (${A.remappages.OMBRE.replace(/^[^:]*: /, '')}), puis sans table.
- **Phase 1, LE REGARD** : tronc, tête, mains pendantes, six plaques. L'œil alterne \`oeilFerme\` → \`oeil:vise\`
  (0,9 s avant le RAYON) ou \`oeil:charge\` (0,8 s avant la SALVE) → \`oeil\` ouvert 1,4 s après chaque attaque.
- **Phase 2, LES MAINS** : les plaques tombent et restent au sol, posées avec la table SOL
  (${A.remappages.SOL.replace(/^[^:]*: /, '')}), et découvrent les alvéoles ;
  les mains quittent les poignets (les douilles brillent) et chargent en lame (\`colosse:main\`, image 1, dans
  la direction de la charge).
- **Phase 3, LA COLÈRE** : \`colosse:tronc:colere\` (fissures de brasier, alvéoles chauffées, cœur jaune) et
  \`oeil:colere\` quand il est ouvert ; c'est aussi l'œil de l'enragement (« LE CYCLOPE S'EMBALLE »).
- **Mort** : \`colosse:carcasse\` (96 × 64, ancre au milieu du bas du torse) tombe dans le plan des structures.
- Zones frappables : ${A.zonesFrappables.oeil} ; ${A.zonesFrappables.mains}.

${sections.map(([titre, f]) => `## ${titre}\n\n${tete}\n${TOUS.filter(f).map(s => ligne(s.nom, cat[s.nom])).join('\n')}\n`).join('\n')}
## Les planches de contrôle

\`tools/sprites2/out/\` (refaites à chaque fabrication) : \`planche-ennemis.png\` et \`planche-ennemis-gris.png\`
(×4 : images de la direction 0, puis les seize directions), \`planche-marques.png\`, \`planche-cyclope.png\`,
\`cyclope-assemble.png\` (phases 1, 2, 3 et carcasse, indexé), et deux scènes à la taille du jeu, agrandies
×3 comme sur iPhone, sur le vrai fond \`horizon.png\` : \`scene-bestiaire.png\` et \`scene-cyclope.png\`. Pour
regarder une planche à la loupe : \`node tools/sprites2/voir.mjs art/sprites/dard.png 10 /tmp/dard.png\`.
`;
  fs.writeFileSync(path.join(ART, 'LISEZMOI.md'), md);
}
