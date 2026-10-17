/* SNAKE 2975 — les icônes des 19 cartes, dessinées à la main en 14 × 14, puis gainées d'un pixel de nuit
   profonde (16 × 16), et leur réduction en 8 × 8 pour la pause et le build de l'écran de fin.

   Lettres : K nuit profonde, n nuit, d ardoise, v violet, i indigo, m magenta, r rose pâle, c cyan,
   C cyan pâle, a ambre, j jaune, b brasier, o os, s acier, g sang, . transparent.

   Règles de dessin :
   - la lumière vient d'en haut à gauche : os pour le reflet, acier pour le corps, ardoise pour l'ombre ;
   - le cyan n'est qu'un accent (le tir, l'œil, l'énergie de la joueuse), jamais un aplat : le cyan
     appartient à la joueuse et l'écran de cartes est compté dans la règle « cyan réservé » (R-03) ;
   - jamais de magenta ni de rose pâle : ce sont les ennemis ;
   - chaque famille a sa silhouette, pour que deux icônes ne se confondent pas même en niveaux de gris
     (critère du lot 6b : intersection sur union des masques inférieure à 0,6). */
import { carte, contour, Img, I } from './commun.mjs';

/* une icône dessinée par du code, dans une case de 14 × 14 */
const dessine = f => { const im = new Img(14, 14); f(im); return im; };

export const ICONES = {
  /* ---------------- les six armes ---------------- */
  /* CANON : la bouche à feu, devant, qui crache deux traits */
  canon: [
    '..............',
    '..............',
    '..............',
    '.oos..........',
    'osssd.j.......',
    'ossssojo.cccCC',
    'osssdj.j......',
    'osssd.jj......',
    'ossssojo.cccCC',
    'dsssd.j.......',
    '.ddd..........',
    '..............',
    '..............',
    '..............'],
  /* TOURELLES : trois perles du corps, chacune portant son module à canon */
  tourelles: [
    '...o.....o....',
    '..oso...oso...',
    '.ossso.ossso..',
    '.sdddd.sdddd..',
    '..............',
    '..ccc...ccc...',
    '.cCiic.cCiic..',
    '.ciiicccciiic.',
    '.ciiic.ciiic..',
    '..ccc...ccc...',
    '..............',
    '..............',
    '..............',
    '..............'],
  /* ARC : l'éclair brisé qui saute d'un nœud à l'autre */
  arc: [
    '.........oo...',
    '.........oo...',
    '........Cc....',
    '.......Cc.....',
    '......CCCCC...',
    '.........cc...',
    '........Cc....',
    '.......Cc.....',
    '...oo.CCCCC...',
    '...oo....cc...',
    '........Cc....',
    '.......cc.....',
    '......oo......',
    '......oo......'],
  /* MISSILES : deux fusées qui montent, flammes ambre */
  missiles: [
    '...C.......C..',
    '..oCo.....oCo.',
    '..oso.....oso.',
    '..oso.....oso.',
    '..oso.....oso.',
    '.ssssd...ssssd',
    '.s.s.d...s.s.d',
    '...j.......j..',
    '..jaj.....jaj.',
    '...a.......a..',
    '...b.......b..',
    '..............',
    '..............',
    '..............'],
  /* DRONES : le satellite à œil, sur son orbite pointillée */
  drones: [
    '.....s.s.s....',
    '...s.......s..',
    '..s.........s.',
    '.s....ooo....s',
    '.....osCso....',
    's....oCcCo...s',
    '.....oscso....',
    '.s....sss....s',
    '..s.........s.',
    '...s.......s..',
    '.....s.s.s....',
    '..............',
    '..............',
    '..............'],
  /* MINES DE QUEUE : le losange cyan posé au bout de la queue */
  minesQ: [
    '.........o....',
    '........oCo...',
    '.......oCiCo..',
    '......oCiCiCo.',
    '.....oCiCoCiCo',
    '......oCiCiCo.',
    '.......oCiCo..',
    '........oCo...',
    '.........o....',
    '..............',
    '...cc.........',
    '..cCcc........',
    '.ccc..........',
    'cc............'],

  /* ---------------- les dix passifs ---------------- */
  /* PUISSANCE : l'impact qui éclate */
  puissance: [
    '......j.......',
    '......j.......',
    '..j...j...j...',
    '...j.ojo.j....',
    '....oojoo.....',
    '...ojjojjo....',
    'jjjjoooooojjjj',
    '...ojjojjo....',
    '....oojoo.....',
    '...j.ojo.j....',
    '..j...j...j...',
    '......j.......',
    '......j.......',
    '..............'],
  /* CADENCE : trois chevrons qui se pressent */
  cadence: [
    '..............',
    '..............',
    'oo...oo...oo..',
    '.oo...oo...oo.',
    '..oo...oo...oo',
    '...oo...oo...o',
    '....oo...oo...',
    '...oo...oo...o',
    '..oo...oo...oo',
    '.oo...oo...oo.',
    'oo...oo...oo..',
    '..............',
    '..............',
    '..............'],
  /* AIMANT : le fer à cheval qui tire les cellules */
  aimant: [
    '..............',
    '...bbbbbb.....',
    '..bbbbbbbb....',
    '.bbb....bbb...',
    '.bb......bb...',
    '.bb......bb...',
    '.bb......bb...',
    '.oo......oo...',
    '.oo......oo...',
    '..............',
    '..a.......a...',
    '..............',
    '.ajj.....ajj..',
    '..a.......a...'],
  /* CROISSANCE : trois perles qui grandissent, et le plus */
  croissance: () => dessine((im) => {
    /* trois perles du corps qui grandissent de gauche à droite, posées sur une ligne, et le plus */
    const perle = (cx, cy, r) => { im.disc(cx, cy, r, I.cyan); if (r > 2) im.disc(cx, cy, r - 1.3, I.indigo); im.put(Math.floor(cx - r * 0.45), Math.floor(cy - r * 0.45), I.cyanPale); im.put(Math.floor(cx - r * 0.45) + 1, Math.floor(cy - r * 0.45), I.cyanPale); };
    perle(1.5, 11.5, 1.5); perle(5.5, 10.5, 2.6); perle(10.5, 9.5, 3.6);
    im.hline(0, 4, 3, I.jaune); im.vline(2, 1, 5, I.jaune); im.put(2, 3, I.os);
  }),
  /* RÉPARATION : la clé de serrage */
  reparation: [
    '........oo..o.',
    '.......oss..so',
    '.......oss..sd',
    '.......osssssd',
    '......ossssdd.',
    '.....osssd....',
    '....osssd.....',
    '...osssd......',
    '..osssd.......',
    '.osssd....j...',
    'osssd....jjj..',
    'ossd......j...',
    '.dd...........',
    '..............'],
  /* BOUCLIER : l'écu, liseré de cyan pâle comme autour de la tête chargée */
  bouclier: [
    '.oooooooooooo.',
    '.oooooooooooo.',
    '.oosssssssdoo.',
    '.oosssssssdoo.',
    '.oosssCsssdoo.',
    '.oossCCCosdoo.',
    '.oosssCsssdoo.',
    '..oossssdddo..',
    '..oosssdddoo..',
    '...oossddoo...',
    '....ooddoo....',
    '.....oooo.....',
    '......oo......',
    '..............'],
  /* ÉPERON : la pointe qui fend, lancée */
  eperon: () => dessine((im) => {
    for (let y = 1; y <= 11; y++) { const k = Math.abs(y - 6), x1 = 13 - Math.round(k * 8 / 5); for (let x = 5; x <= x1; x++) im.put(x, y, I.acier); im.put(x1, y, y < 6 ? I.os : y > 6 ? I.ardoise : I.os); }
    for (let x = 5; x <= 13; x++) { /* arête haute en os, ombre basse */ }
    for (let y = 1; y <= 11; y++) { const k = Math.abs(y - 6); if (y <= 6) im.put(5 + Math.round((5 - k) ? 0 : 0), y, I.os); }
    im.vline(5, 1, 6, I.os); im.vline(5, 7, 11, I.ardoise); im.hline(6, 12, 6, I.os); im.put(13, 6, I.os);
    im.hline(0, 3, 3, I.acier); im.hline(1, 3, 6, I.os); im.hline(0, 3, 9, I.acier);
  }),
  /* GRAPPE : trois explosions en chaîne */
  grappe: [
    '..............',
    '.....j........',
    '...j.b.j......',
    '....bjb.......',
    '..jbjojbj.....',
    '....bjb.......',
    '...j.b.j..j...',
    '.....j...jbj..',
    '..j.....jbobj.',
    '.jbj.....jbj..',
    'jbobj.....j...',
    '.jbj..........',
    '..j...........',
    '..............'],
  /* SANG-FROID : le cristal de givre */
  sangFroid: [
    '......o.......',
    '....o.o.o.....',
    '.....ooo......',
    '.o....o....o..',
    '..o...o...o...',
    'o..o..o..o..o.',
    '.oooososooo...',
    'o..o..o..o..o.',
    '..o...o...o...',
    '.o....o....o..',
    '.....ooo......',
    '....o.o.o.....',
    '......o.......',
    '..............'],
  /* BRAISE : la flamme */
  braise: [
    '......b.......',
    '.....bb.......',
    '.....bbb......',
    '....bbab...b..',
    '...bbaab..bb..',
    '..bbaaabbbab..',
    '..baajaaaab...',
    '.bbaajjaaabb..',
    '.baajjjjaaab..',
    '.baajjojjaab..',
    '.bbaajoojabb..',
    '..bbajooaab...',
    '...bbaaaab....',
    '.....bbbb.....'],

  /* ---------------- les trois pouvoirs ---------------- */
  /* TRAVERSÉE : la flèche tramée qui passe à travers le mur */
  traversee: [
    '.....so.......',
    '.....so.......',
    '.....so.......',
    '.....so....C..',
    '.....so....cC.',
    'c.c.c.C.c.CcCC',
    '.c.c.c.c.cCcCc',
    '.....so....cc.',
    '.....so....c..',
    '.....so.......',
    '.....so.......',
    '.....so.......',
    '..............',
    '..............'],
  /* RALENTI : le sablier */
  ralenti: [
    '.oooooooooo...',
    '..s......d....',
    '..s......d....',
    '...s.aa.d.....',
    '....s..d......',
    '.....sd.......',
    '.....sd.......',
    '....s..d......',
    '...s.a..d.....',
    '..s.aaaa.d....',
    '..saaaaaad....',
    '.oooooooooo...',
    '..............',
    '..............'],
  /* REPLI : le corps qui se ramasse, épais, entre deux flèches */
  repli: [
    '..............',
    '..............',
    '..............',
    'o....cccc....o',
    'oo..cCiiic..oo',
    'ooo.ciiiic.ooo',
    'ooo.ciiiic.ooo',
    'oo..ciiiic..oo',
    'o....cccc....o',
    '..............',
    '..............',
    '..............',
    '..............',
    '..............']
};

export const ORDRE = ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ', 'puissance', 'cadence', 'aimant',
  'croissance', 'reparation', 'bouclier', 'eperon', 'grappe', 'sangFroid', 'braise', 'traversee', 'ralenti', 'repli'];

/* 16 × 16 gainé */
export function icone16(id) {
  const m = ICONES[id]; if (!m) throw new Error('icône inconnue ' + id);
  const src = typeof m === 'function' ? m() : carte(m);
  if (src.w !== 14 || src.h !== 14) throw new Error(id + ' : ' + src.w + ' × ' + src.h + ' au lieu de 14 × 14');
  return contour(centre(src), I.nuitProfonde, true, true);
}

/* recentre le dessin dans sa case (à un pixel près, vers le haut-gauche) */
export function centre(src) {
  let x0 = src.w, y0 = src.h, x1 = -1, y1 = -1;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (src.d[y * src.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const o = new Img(src.w, src.h), dx = Math.floor((src.w - (x1 - x0 + 1)) / 2) - x0, dy = Math.floor((src.h - (y1 - y0 + 1)) / 2) - y0;
  o.blit(src, dx, dy); return o;
}

/* ---------------- les mêmes en 8 × 8 (6 × 6 gainés), pour la pause et le build de l'écran de fin ---------------- */
export const PETITES = {
  canon: ['......', 'os.cCC', 'ssj...', 'ssj...', 'os.cCC', '......'],
  tourelles: ['.o..o.', 'sd.sd.', '......', 'cC.cC.', 'cccccc', '.c..c.'],
  arc: ['....o.', '...C..', '..CCC.', '...C..', '..C...', '.o....'],
  missiles: ['..C...', '.oso..', '.oso..', 'sssss.', '..j...', '..a...'],
  drones: ['.s..s.', 's.oo.s', '.oCco.', '.occo.', 's.oo.s', '.s..s.'],
  minesQ: ['...o..', '..oCo.', '.oCcCo', '..oCo.', 'c..o..', 'cc....'],
  puissance: ['j.j.j.', '.jjj..', 'jjojj.', '.jjj..', 'j.j.j.', '......'],
  cadence: ['o..o..', '.o..o.', '..o..o', '.o..o.', 'o..o..', '......'],
  aimant: ['.bbbb.', 'bb..bb', 'b....b', 'o....o', '......', 'a....a'],
  croissance: ['....cc', '...cCc', '...ccc', '.cc.j.', 'cCcjjj', 'cc..j.'],
  reparation: ['...o.o', '...oso', '..oss.', '.oss..', 'oss...', 'ss....'],
  bouclier: ['oooooo', 'ossssd', 'osCsdd', 'ossddo', '.osdo.', '..oo..'],
  eperon: ['..o...', 's.oos.', '..ssso', 's.sdd.', '..d...', '......'],
  grappe: ['.j....', 'jbj.j.', '.j.jbj', '.j..j.', 'jbj...', '.j....'],
  sangFroid: ['o.o.o.', '.sos..', 'oosoo.', '.sos..', 'o.o.o.', '......'],
  braise: ['..b...', '.bb.b.', '.baab.', 'bajjab', 'bajoab', '.bbbb.'],
  traversee: ['..so..', '..so.c', 'c.c.cC', '..so.c', '..so..', '......'],
  ralenti: ['oooooo', '.s..d.', '..sd..', '..sd..', '.saad.', 'oooooo'],
  repli: ['......', 'o.cc.o', 'ocCico', 'ociico', 'o.cc.o', '......']
};
export function icone8(id) {
  const src = carte(PETITES[id]);
  if (src.w !== 6 || src.h !== 6) throw new Error(id + ' (8 × 8) : ' + src.w + ' × ' + src.h);
  return contour(centre(src), I.nuitProfonde, true, true);
}
