/* LE CYCLOPE — boss du SECTEUR 1 (REFONTE.md § 4.8), en pièces articulées, d'après le panneau art/boss.png :
   un colosse d'armure verticale, lames dressées derrière les épaules, tête casquée à crête et cornes,
   un seul œil jaune traversé d'une lame de lumière horizontale.

   Assemblé, il mesure 96 × 128 px (deux tiers de la hauteur en paysage) :
     colosse:tete   40 × 32, posée en (28, 0)       ; son orbite est vide : l'œil se pose dedans
     colosse:oeil   14 × 10, centré en (48, 17)      ; seul point faible avec les mains
     colosse:tronc  96 × 96, posé en (0, 32)         ; épaulières, poitrine, cœur, bras, jambes
     colosse:main   24 × 24, ×2, aux poignets        ; en phase 1 elles pendent (direction 4, vers le bas)
     colosse:plaque 12 × 12, ×6                      ; épaulières, poitrine, tassettes ; tombent en phase 2
   Toutes les coordonnées d'attache sont publiées dans art/sprites/catalogue.json (« points »). */
import { Img, carte, dir16, versDroite, ombre, contour, contourDedans, plaques, rotsprite,
  TR, NUIT, ARD, MAG, ROSE, AMBRE, JAUNE, BRAS, OS, SANG, NP, COQUE } from './commun.mjs';

export const CYCLOPE = [];
function def(nom, o) { CYCLOPE.push({ nom, famille: 'cyclope', lot: '6b', ...o }); }

/* ======================================================================================================
   LE TRONC — 96 × 96, symétrique autour de x = 48. Plaques posées du fond vers l'avant.
   ====================================================================================================== */
const S = SANG, M = MAG;
const TRONC = [
  { p: [[7, 26], [9, 0], [13.5, 1.5], [15, 28]], base: S, arete: M, degrade: 0 },        /* lame dorsale extérieure */
  { p: [[16, 24], [19, 3], [23.5, 6], [24, 26]], base: S, arete: M, degrade: 0 },        /* lame dorsale intérieure */
  { p: [[5, 34], [19, 34], [20, 54], [6, 54]], base: S },                             /* bras */
  { p: [[2, 50], [22, 50], [24, 58], [22, 74], [6, 74], [1, 60]], base: M },          /* avant-bras, gantelet */
  { p: [[30, 64], [45, 64], [44, 84], [31, 84]], base: S },                           /* cuisse */
  { p: [[28, 80], [46, 80], [46.5, 90], [45, 96], [27, 96], [26, 88]], base: M },     /* genou, tibia, pied */
  { p: [[26, 56], [48, 56], [48, 66], [28, 66]], base: S },                           /* ceinture */
  { p: [[25, 62], [40, 62], [38.5, 76], [28, 78.5]], base: M },                       /* tassette */
  { p: [[31, 38], [48, 38], [48, 58], [33, 58]], base: S },                           /* ventre */
  { p: [[26, 10], [48, 12], [48, 41], [34, 43], [27, 35], [24, 20]], base: M },       /* poitrine */
  { p: [[36, 0], [48, 0], [48, 12.5], [34, 11]], base: S },                           /* col */
  { p: [[1, 24], [5, 13], [20, 9], [34, 13], [34.5, 24], [30, 36], [16, 40], [3, 37]], base: M }, /* épaulière */
  { p: [[2, 29], [32, 25], [31.5, 31], [4, 35]], base: S },                           /* bande d'épaulière */
  { p: [[3, 16], [5.5, 4], [9, 14]], base: M, degrade: 0 }                            /* corne d'épaulière */
];
/* les six plaques : coin haut gauche dans le tronc (gauche, puis le miroir à droite) */
export const PLAQUES_TRONC = [[12, 13], [32, 18], [27, 63]].flatMap(([x, y]) => [[x, y], [84 - x, y]]);
const POIGNETS = [[13, 84], [81, 84]];             /* ancres (cx, cy) des mains, dans le tronc : leurs cadres sont miroirs exacts */

function tronc(f, colere) {
  const s = plaques(96, 96, TRONC, { axe: 48, degrade: 0.45 });
  const sym = (x, y, c) => { s.peint(x, y, c); s.peint(95 - x, y, c); };
  const symS = (x, y, c) => { s.set(x, y, c); s.set(95 - x, y, c); };
  /* verticalité gothique : rainures des lames dorsales et de la poitrine */
  for (let y = 4; y < 26; y++) sym(11 + (y > 14 ? 1 : 0), y, NP);
  for (let y = 7; y < 24; y++) sym(20, y, NP);
  for (let y = 14; y < 38; y++) if (y < 18 || y > 29) sym(30 + ((y - 14) >> 3), y, NP);
  /* rainures verticales des épaulières et des gantelets : l'armure en dalles du panneau */
  for (let y = 26; y < 38; y++) { sym(8, y, NP); sym(25, y - 2, NP); }
  for (let y = 51; y < 73; y++) if (y < 56 || y > 70) { sym(8, y, NP); sym(16, y, NP); }
  for (let y = 66; y < 76; y++) sym(33, y, NP);
  /* ventre côtelé */
  for (const y of [43, 47, 51, 55]) for (let x = 34; x < 48; x++) sym(x, y, NP);
  for (const y of [44, 48, 52]) for (let x = 35; x < 47; x += 3) sym(x, y, MAG);
  /* évents du gantelet */
  for (const y of [57, 61, 65, 69]) for (let x = 5; x < 21; x++) sym(x, y, NP);
  for (const y of [58, 62, 66]) for (let x = 6; x < 20; x += 4) sym(x, y, colere ? BRAS : ROSE);
  /* le poignet : une douille sombre où brille le moteur de la main (visible quand elle part) */
  for (let y = 73; y < 77; y++) for (let x = 7; x < 20; x++) symS(x, y, NP);
  for (let x = 9; x < 18; x += 2) symS(x, 75, colere ? JAUNE : BRAS);
  for (let x = 10; x < 18; x += 2) symS(x, 74, SANG);
  /* rivets et arêtes */
  for (const [x, y] of [[5, 32], [17, 30], [28, 28], [33, 82], [40, 82], [11, 52], [19, 52], [29, 59], [44, 59]]) sym(x, y, ROSE);
  for (let y = 66; y < 83; y++) sym(37, y, NP);                       /* rainure de cuisse */
  for (let y = 86; y < 95; y++) sym(36, y, SANG);
  /* l'entrejambe : le fond reste ouvert entre les jambes */
  for (let y = 78; y < 96; y++) for (let x = 46; x < 50; x++) s.set(x, y, TR);
  /* alvéoles sous les plaques : la machinerie à nu (on la voit quand les plaques tombent) */
  for (const [x0, y0] of PLAQUES_TRONC) {
    for (let y = y0 + 1; y < y0 + 11; y++) for (let x = x0 + 1; x < x0 + 11; x++) s.set(x, y, NP);
    for (let y = y0 + 2; y < y0 + 10; y += 3) for (let x = x0 + 2; x < x0 + 10; x++) s.set(x, y, SANG);
    for (let x = x0 + 3; x < x0 + 10; x += 3) for (let y = y0 + 2; y < y0 + 10; y++) s.set(x, y, SANG);
    const c1 = colere ? JAUNE : BRAS, c2 = colere ? BRAS : SANG;
    s.set(x0 + 4, y0 + 4, c1); s.set(x0 + 7, y0 + 7, c1); s.set(x0 + 4, y0 + 7, c2); s.set(x0 + 7, y0 + 4, c2);
    if (f) { s.set(x0 + 5, y0 + 5, c1); s.set(x0 + 6, y0 + 6, c2); }
  }
  /* le cœur : losange entre les plaques de poitrine, qui respire */
  const cx = 47.5, cy = 26;
  for (let y = 18; y < 35; y++) for (let x = 42; x < 54; x++) {
    const d = Math.abs(x + 0.5 - 48) + Math.abs(y + 0.5 - cy) * 0.75;
    if (d < 5.2) s.set(x, y, d < 4.2 ? (d < 2.6 ? (f ? (colere ? OS : ROSE) : (colere ? JAUNE : MAG)) : (colere ? BRAS : SANG)) : NP);
  }
  if (colere) {
    /* LA COLÈRE : fissures de brasier sur les épaulières, la poitrine et les gantelets */
    const fissures = [[[3, 24], [8, 26], [10, 31], [15, 33]], [[25, 10], [28, 14], [27, 17]], [[30, 36], [33, 39], [37, 40]],
      [[3, 51], [6, 54], [8, 53], [12, 56]], [[29, 85], [33, 88], [32, 92]]];
    for (const fz of fissures) for (let i = 0; i + 1 < fz.length; i++) {
      s.line(fz[i][0], fz[i][1], fz[i + 1][0], fz[i + 1][1], 0, (x, y) => { sym(x, y, BRAS); return false; });
      sym(fz[i][0], fz[i][1], JAUNE);
    }
  }
  return contourDedans(s);
}
def('colosse:tronc', { w: 96, h: 96, dirs: 1, images: 2, gen: (k, f) => tronc(f, false), cx: 47, cy: 47,
  points: { tete: [28, -32], oeil: [48, -15], poignets: POIGNETS, plaques: PLAQUES_TRONC, coeur: [47, 26] },
  role: 'tronc du CYCLOPE (phases 1 et 2) : épaulières à lames dorsales, poitrine, cœur qui respire, gantelets, jambes ; alvéoles de machinerie sous les 6 plaques ; douilles des poignets' });
def('colosse:tronc:colere', { w: 96, h: 96, dirs: 1, images: 2, hors: true, gen: (k, f) => tronc(f, true), cx: 47, cy: 47,
  role: 'tronc en phase 3, LA COLÈRE : fissures de brasier, évents et alvéoles chauffés à blanc, cœur jaune' });

/* ======================================================================================================
   LA TÊTE — 40 × 32, symétrique autour de x = 20. Cornes dressées, crête centrale, casque, front,
   pommettes, menton ; une orbite horizontale vide où se pose l'œil.
   ====================================================================================================== */
const TETE = [
  { p: [[3, 23], [1.5, 5], [5.5, 0], [9, 13], [11.5, 22]], base: M },                /* cornes */
  { p: [[8, 12.5], [14, 6], [20, 5], [20, 30], [14, 30], [9, 24]], base: M },        /* casque */
  { p: [[17, 11], [18, 0], [20, 0], [20, 11]], base: M },                            /* crête */
  { p: [[9, 11], [20, 9.5], [20, 13.5], [10, 14.5]], base: S, arete: M },            /* front */
  { p: [[6, 16], [13, 17.5], [15, 29], [10.5, 31.5], [7, 26]], base: M },            /* pommettes */
  { p: [[14.5, 25], [20, 25], [20, 32], [15.5, 32]], base: S }                       /* menton */
];
export const OEIL_TETE = [20, 17];                 /* centre de l'œil, dans la tête */
function tete(f, colere) {
  const s = plaques(40, 32, TETE, { axe: 20, degrade: 0.4 });
  const sym = (x, y, c) => { s.peint(x, y, c); s.peint(39 - x, y, c); };
  for (let y = 2; y < 10; y++) sym(19, y, NP);                         /* rainure de la crête */
  for (let y = 5; y < 18; y++) sym(5 + (y > 11 ? 1 : 0), y, NP);       /* rainure des cornes */
  for (let y = 19; y < 30; y++) sym(11, y, NP);                        /* joue */
  for (const y of [27, 29]) for (let x = 16; x < 20; x++) sym(x, y, NP);   /* grille du menton */
  sym(4, 2, f ? ROSE : MAG); sym(18, 1, f ? MAG : ROSE);               /* éclats au bout des cornes */
  /* l'orbite : une fente sombre en travers du visage, plus large que l'œil */
  for (let y = 14; y < 21; y++) for (let x = 11; x < 29; x++) {
    const bord = (y === 14 || y === 20) && (x < 13 || x > 26);
    if (!bord) s.set(x, y, NP);
  }
  if (colere) { sym(12, 22, BRAS); sym(13, 23, BRAS); sym(8, 9, BRAS); sym(9, 10, BRAS); }
  return contourDedans(s);
}
def('colosse:tete', { w: 40, h: 32, dirs: 1, images: 2, gen: (k, f) => tete(f, false), cx: 20, cy: 17,
  points: { oeil: OEIL_TETE, ancreTronc: [-28, 32] },
  role: 'tête à œil unique : cornes, crête, casque, pommettes, menton ; orbite vide (l œil se pose en (20, 17)) ; éclats aux cornes' });

/* ======================================================================================================
   L'ŒIL — 14 × 10, centre (6, 4). Ouvert : amande de brasier, iris jaune, pupille os, lame de lumière
   horizontale comme sur le panneau. Fermé : volets blindés. Vise, charge, colère, mort : états des phases.
   ====================================================================================================== */
const OEIL = {
  ouvert: [
    ['....bbbb....', '..bbjjjjbb..', '.bjjjwwjjjb.', 'bbjjwwwwjjbb', 'bbjjwwwwjjbb', '.bjjjwwjjjb.', '..bbjjjjbb..', '....bbbb....'],
    ['....bbbb....', '..bbjjjjbb..', '.bjjwwwwjjb.', 'jjjwwwwwwjjj', 'jjjwwwwwwjjj', '.bjjwwwwjjb.', '..bbjjjjbb..', '....bbbb....']
  ],
  ferme: [['....ssss....', '..ssMMMMss..', '.sMMrrrrMMs.', 'sMMMMMMMMMMs', 'oooooooooooo', 'ssssssssssss', '.ssssssssss.', '..ssssssss..']],
  vise: [
    ['....bbbb....', '..bbrrrrbb..', '.brrrwwrrrb.', 'bbrrrwwrrrbb', 'bbrrrwwrrrbb', '.brrrwwrrrb.', '..bbrrrrbb..', '....bbbb....'],
    ['....bbbb....', '..bbrrrrbb..', '.brrrrwrrrb.', 'bbrrrrwrrrbb', 'bbrrrrwrrrbb', '.brrrrwrrrb.', '..bbrrrrbb..', '....bbbb....']
  ],
  charge: [
    ['....jjjj....', '..jjwwwwjj..', '.jwwwwwwwwj.', 'jjwwwjjwwwjj', 'jjwwwjjwwwjj', '.jwwwwwwwwj.', '..jjwwwwjj..', '....jjjj....'],
    ['....wwww....', '..wwwwwwww..', '.wwwwjjwwww.', 'wwwwjjjjwwww', 'wwwwjjjjwwww', '.wwwwjjwwww.', '..wwwwwwww..', '....wwww....']
  ],
  colere: [
    ['....ssss....', '..ssbbbbss..', '.sbbbjjbbbs.', 'ssbbjjjjbbss', 'ssbbjjjjbbss', '.sbbbjjbbbs.', '..ssbbbbss..', '....ssss....'],
    ['....ssss....', '..ssbbbbss..', '.sbbjjjjbbs.', 'bbbjjwwjjbbb', 'bbbjjwwjjbbb', '.sbbjjjjbbs.', '..ssbbbbss..', '....ssss....']
  ],
  mort: [['....oooo....', '..oodddddoo.', '.odddnnddddo', 'oddnnoonnddo', 'oddnnoonnddo', '.odddnnddddo', '..oodddddoo.', '....oooo....']]
};
const oeil = (etat, f) => contour(carte(OEIL[etat][f % OEIL[etat].length]));
def('colosse:oeil', { w: 14, h: 10, dirs: 1, images: 2, gen: (k, f) => oeil('ouvert', f), cx: 6, cy: 4,
  role: 'œil ouvert (point faible) : amande de brasier, iris jaune, pupille os ; image 1 = la lame de lumière s allonge' });
def('colosse:oeilFerme', { w: 14, h: 10, dirs: 1, images: 1, gen: () => oeil('ferme', 0), cx: 6, cy: 4,
  role: 'œil fermé : volets blindés magenta et sang, joint sombre ; les tirs ricochent' });
def('colosse:oeil:vise', { w: 14, h: 10, dirs: 1, images: 2, hors: true, gen: (k, f) => oeil('vise', f), cx: 6, cy: 4,
  role: 'l œil vise (RAYON BALAYANT, 0,9 s) : iris rose pâle, pupille qui se fixe en fente' });
def('colosse:oeil:charge', { w: 14, h: 10, dirs: 1, images: 2, hors: true, gen: (k, f) => oeil('charge', f), cx: 6, cy: 4,
  role: 'l œil se charge (SALVE RADIALE, 0,8 s) : os et jaune, image 1 à blanc' });
def('colosse:oeil:colere', { w: 14, h: 10, dirs: 1, images: 2, hors: true, gen: (k, f) => oeil('colere', f), cx: 6, cy: 4,
  role: 'œil enragé (LE CYCLOPE S EMBALLE, et phase 3) : l iris passe au brasier' });
def('colosse:oeil:mort', { w: 14, h: 10, dirs: 1, images: 1, hors: true, gen: () => oeil('mort', 0), cx: 6, cy: 4,
  role: 'œil éteint, pour la carcasse' });

/* ======================================================================================================
   LES MAINS — 24 × 24, seize directions : la main dessinée griffes en HAUT, tournée puis ombrée (la
   lumière reste en haut). Image 0 : griffes écartées (elle pend, phase 1) ; image 1 : griffes serrées en
   lame (charge en ciseaux, phase 2). Symétrique : la même main sert à gauche et à droite.
   ====================================================================================================== */
function mainCarte(serree) {
  const C = COQUE;
  const P = [
    { p: [[6, 17], [11, 17], [11, 22], [7, 22]], base: SANG },                                       /* manchette */
    { p: [[3, 8.5], [11, 7], [11, 18], [6, 18], [2.5, 13]], base: C },                                /* dos de la main */
    ...(serree
      ? [{ p: [[3, 9], [9.5, 1], [11, -1], [12.5, 1], [19, 9]], base: C, sym: false }]               /* les griffes fondues en lame */
      : [{ p: [[3, 9], [1, 1.5], [4.5, 0], [8, 8.5]], base: C },                                      /* griffes latérales, écartées */
        { p: [[8.5, 8], [10, 0], [12, 0], [13.5, 8]], base: C, sym: false }])                        /* griffe centrale */
  ];
  for (const pl of P) { pl.arete = pl.base; pl.ombre = pl.base; }
  const s = plaques(22, 22, P, { axe: 11 });
  /* le moteur du poignet, et les rivets */
  for (let x = 8; x < 14; x++) s.set(x, 20, NP);
  for (let x = 9; x < 13; x += 2) s.set(x, 20, BRAS);
  for (let x = 5; x < 17; x++) s.peint(x, 12, NP);                     /* jointure des phalanges */
  if (serree) for (let y = 2; y < 8; y++) s.peint(11, y, NP);            /* l'arête de la lame */
  s.set(7, 15, ROSE); s.set(14, 15, ROSE);
  return s;
}
const MAINS = [mainCarte(false), mainCarte(true)].map(versDroite);
def('colosse:main', { w: 24, h: 24, dirs: 16, images: 2,
  gen: (k, f) => contour(ombre(dir16(MAINS[f], k), ROSE, SANG, MAG, true)), cx: 11, cy: 11,
  role: 'main-lame : image 0 griffes écartées (direction 4 : elle pend au poignet), image 1 griffes serrées en lame (charge) ; même main à gauche et à droite' });

/* ======================================================================================================
   LA PLAQUE — 12 × 12 : écu d'armure magenta à arête rose pâle, rivets, joint en V. Elle tombe en phase 2
   et reste au sol (posée avec la table de remappage SOL : magenta -> sang, rose pâle -> magenta).
   ====================================================================================================== */
function plaque() {
  const s = new Img(10, 10);
  s.poly([[0, 1], [3, 0], [7, 0], [10, 1], [10, 7], [5, 10], [0, 7]], COQUE);
  const o = ombre(s);
  for (let y = 2; y < 8; y++) { o.set(4 + (y > 5 ? 0 : 0), y, NP); }
  for (const [x, y] of [[1, 2], [8, 2], [7, 6], [2, 6]]) o.set(x, y, ROSE);
  o.line(1, 4, 4, 7, 0, (x, y) => { o.peint(x, y, SANG); return false; });
  o.line(8, 4, 5, 7, 0, (x, y) => { o.peint(x, y, SANG); return false; });
  return contour(o);
}
def('colosse:plaque', { w: 12, h: 12, dirs: 1, images: 1, gen: plaque,
  role: 'plaque d armure (×6) : posée sur les alvéoles du tronc en phase 1, tombe en phase 2 et reste au sol (remappage SOL)' });

/* ======================================================================================================
   ASSEMBLAGE ET CARCASSE
   ====================================================================================================== */
export function assemble(images) {
  const place = {
    tete: [28, 0], tronc: [0, 32], oeil: [48 - 6, 17 - 4],
    mains: POIGNETS.map(([x, y]) => [x - 11, 32 + y - 11]),
    plaques: PLAQUES_TRONC.map(([x, y]) => [x, 32 + y])
  };
  function image(phase, oeilNom = 'oeil', f = 0) {
    const s = new Img(96, 128);
    s.blit(images[phase === 3 ? 'colosse:tronc:colere' : 'colosse:tronc'][0][f], place.tronc[0], place.tronc[1]);
    s.blit(images['colosse:tete'][0][f], place.tete[0], place.tete[1]);
    const oe = images['colosse:' + oeilNom] || images['colosse:oeil'];
    s.blit(oe[0][Math.min(f, oe[0].length - 1)], place.oeil[0], place.oeil[1]);
    if (phase === 1) {
      for (const [x, y] of place.mains) s.blit(images['colosse:main'][4][0], x, y);
      for (const [x, y] of place.plaques) s.blit(images['colosse:plaque'][0][0], x, y);
    }
    return s;
  }
  return {
    image,
    description: {
      role: 'assemblage du CYCLOPE (96 × 128), coordonnées dans ce cadre ; origine = coin haut gauche du sprite posé',
      w: 96, h: 128, tete: place.tete, tronc: place.tronc, oeilCentre: [48, 17], oeil: place.oeil,
      mains: place.mains, mainDirection: 4, plaques: place.plaques,
      ordre: 'tronc, tête, œil, mains, plaques (du fond vers l avant)',
      zonesFrappables: { oeil: 'rayon 6 autour de (48, 17), seulement œil ouvert', mains: 'rayon 10 autour du centre de chaque main' },
      remappages: {
        SOL: 'plaques tombées : magenta -> sang, rose pâle -> magenta, sang -> nuit',
        OMBRE: 'arrivée du plan P5 au plateau (sang -> magenta) : magenta -> sang, rose pâle -> sang, sang -> nuit, brasier/jaune/os gardés',
        PROIE: 'sans objet (le CYCLOPE n est jamais une proie)'
      }
    }
  };
}

/* la carcasse : le colosse à genoux, tronqué au ventre par les gravats, la tête tombée de côté (RotSprite
   d'un seizième de tour), l'œil éteint, l'armure refroidie (magenta -> sang, rose pâle -> magenta) avec
   des braises dans les fissures. 96 × 64. */
let IMAGES = null;
export function carcasse() {
  const im = IMAGES;
  const s = new Img(96, 64);
  const froid = { [MAG]: SANG, [ROSE]: MAG, [SANG]: NUIT, [JAUNE]: BRAS, [OS]: BRAS };
  /* le tronc, sans plaques ni mains, coupé à la ceinture et descendu */
  const tr = im['colosse:tronc:colere'][0][0].sous(0, 0, 96, 58).remplace(froid);
  s.blit(tr, 0, 18);
  /* la tête tombée sur l'épaule */
  const t = new Img(40, 40); t.blit(im['colosse:tete'][0][0], 0, 4); t.blit(im['colosse:oeil:mort'][0][0], 14, 17);
  const tt = rotsprite(t, Math.PI / 8).remplace(froid);
  s.blit(tt, 34, -4);
  /* gravats : une ligne brisée de blocs devant le ventre */
  for (let x = 0; x < 96; x++) {
    const h = 6 + ((x * 7) % 5) + ((x * 13) % 3) + (x > 20 && x < 76 ? 3 : 0);
    for (let y = 64 - h; y < 64; y++) s.set(x, y, ((x >> 2) + (y >> 2)) & 1 ? ARD : NUIT);
    s.set(x, 64 - h, (x % 7) === 3 ? SANG : NP);
  }
  /* braises */
  for (const [x, y] of [[20, 44], [28, 30], [70, 38], [61, 24], [48, 40], [12, 36], [83, 46], [40, 50], [56, 52]]) { s.peint(x, y, BRAS); s.peint(x + 1, y, AMBRE); }
  return contourDedans(s);
}
def('colosse:carcasse', { w: 96, h: 64, dirs: 1, images: 1, gen: () => carcasse(), cx: 47, cy: 40,
  role: 'carcasse : le colosse à genoux dans les gravats, tête tombée, œil éteint, armure refroidie, braises ; tombe dans le plan des structures en 3 s' });
/* la carcasse a besoin des autres pièces : genere.mjs les fabrique d'abord (elle est en dernier) */
export function fournir(images) { IMAGES = images; }
