/* SNAKE 2975 — les pièces de l'interface (hors icônes de cartes) : cadres de cartes par rareté, jauges,
   radar, chevrons de portail et marqueurs hors champ, mini-silhouettes, bannières et toasts, chiffres de
   score et notes, boutons, étoiles, énergie, vies, causes de mort, pouce fantôme.
   Chaque fabrique rend une Img (0 = transparent) ou une liste d'Img (images d'animation, directions). */
import { Img, I, carte, contour, dither, repeint, miroirX, tourne90 } from './commun.mjs';

const { nuit, ardoise, violet, indigo, magenta, rosePale, cyan, cyanPale, ambre, jaune, brasier, os, acier, sang, nuitProfonde: NP } = I;

/* ================================================================================================ */
/* LES CADRES DE CARTES                                                                              */
/* La rareté se lit deux fois : par l'encre du cadre et par le nombre de crans au coin (REFONTE § 2.7).  */
/* ================================================================================================ */
export const RARETES = {
  commune: { encre: acier, crans: 1, ombre: ardoise },
  rare: { encre: os, crans: 2, ombre: acier },
  epique: { encre: ambre, crans: 3, ombre: brasier },
  ultime: { encre: jaune, crans: 4, ombre: ambre }
};
export const FORMATS_CARTE = { paysage: [120, 80], serre: [96, 80], portrait: [180, 48] };

/* un cadre de carte : gaine de nuit profonde, liseré de l'encre de rareté à coins coupés, plaque de nuit,
   biseau intérieur, crans en haut à droite, filet de séparation sous le nom (voir mise en page) */
export function cadreCarte(rar, w, h, { choisie = false } = {}) {
  const R = RARETES[rar], im = new Img(w, h), e = choisie ? os : R.encre;
  const coupe = 3;                                         // coins coupés en biais
  const dedans = (x, y, m) => { const xx = Math.min(x - m, w - 1 - m - x), yy = Math.min(y - m, h - 1 - m - y); return xx >= 0 && yy >= 0 && xx + yy >= coupe - m * 0; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!dedans(x, y, 0)) continue;
    let c = NP;
    if (dedans(x, y, 1)) c = e;
    if (dedans(x, y, 2)) c = NP;
    if (dedans(x, y, 3)) c = nuit;
    im.put(x, y, c);
  }
  /* biseau : reflet d'ardoise en haut et à gauche de la plaque, ombre de nuit profonde en bas */
  for (let x = 4; x < w - 4; x++) { if (dedans(x, 3, 3)) im.put(x, 3, ardoise); }
  for (let y = 4; y < h - 4; y++) if (dedans(3, y, 3)) im.put(3, y, ardoise);
  /* l'ombre portée du liseré, une rangée sous le liseré bas, dans l'encre d'ombre tramée */
  for (let x = 2; x < w - 2; x++) if (dither(x, h - 2, 0.5) && dedans(x, h - 2, 1) === false && dedans(x, h - 2, 0)) im.put(x, h - 2, R.ombre);
  /* crans : n petits blocs de 3 × 2 dans l'encre, posés sur le liseré haut, près du coin droit */
  for (let k = 0; k < R.crans; k++) { const x = w - 8 - k * 5; im.rect(x, 1, 3, 3, e); im.put(x + 1, 2, choisie ? jaune : R.ombre); }
  /* coin bas gauche : un petit talon dans l'encre, rappel de la rareté pour un œil qui balaie le bas */
  im.rect(5, h - 3, 6, 1, e);
  if (choisie) { /* la carte touchée : liseré doublé en os, coins en jaune */
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dedans(x, y, 2) && !dedans(x, y, 3)) im.put(x, y, os);
  }
  return im;
}

/* le reflet tramé de la carte ULTIME : une bande diagonale qui passe sur le liseré seulement, en 16 images
   (10 de passage, 6 de repos) : à 16 i/s, un passage par seconde, sous la limite de 3 par seconde */
export function refletUltime(w, h) {
  const base = cadreCarte('ultime', w, h), imgs = [];
  for (let f = 0; f < 16; f++) {
    const im = base.copie();
    if (f < 10) {
      const p = -20 + f * ((w + h + 40) / 9);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = im.get(x, y); if (c !== jaune && c !== ambre) continue;
        const d = x + y - p; if (d >= 0 && d < 8) im.put(x, y, d < 3 ? os : dither(x, y, 0.5) ? os : jaune);
      }
    }
    imgs.push(im);
  }
  return imgs;
}

/* ================================================================================================ */
/* LES JAUGES                                                                                        */
/* ================================================================================================ */
/* cadre d'une jauge de (w - 4) × (h - 4) : gaine de nuit profonde, liseré, fond nuit profonde, encoches */
export function cadreJauge(w, h, encre, encoches = []) {
  const im = new Img(w, h, NP);
  im.cadre(1, 1, w - 2, h - 2, encre);
  im.put(1, 1, NP); im.put(w - 2, 1, NP); im.put(1, h - 2, NP); im.put(w - 2, h - 2, NP);
  for (const f of encoches) { const x = 2 + Math.round(f * (w - 4)); im.put(x, 0, os); im.put(x, 1, os); im.put(x, h - 1, os); im.put(x, h - 2, os); }
  return im;
}
/* remplissage d'une jauge (bande de w × h que le code rogne à la valeur) : rangées éclairée, pleine, ombre */
export function pleinJauge(w, h, haut, coeur, bas) { const im = new Img(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) im.put(x, y, y === 0 ? haut : y === h - 1 ? bas : coeur); return im; }
export function videJauge(w, h, c, t = 0.5) { const im = new Img(w, h, NP); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (dither(x, y, t)) im.put(x, y, c); return im; }

/* la barre de secteur : 6 cases (V1 à V5, puis le CYCLOPE), 49 × 5 ; états des cases par le code */
export function cadreSecteur() {
  const w = 50, h = 5, im = new Img(w, h, NP);
  for (let k = 0; k < 6; k++) { const x = 1 + k * 8; im.cadre(x, 0, k === 5 ? 9 : 8, h, k === 5 ? sang : ardoise); }
  return im;
}
export const CASE_SECTEUR = {   // 6 × 3, posée en (2 + 8k, 1)
  faite: () => pleinJauge(6, 3, jaune, ambre, ambre),
  encours: () => { const im = new Img(6, 3); for (let x = 0; x < 6; x++) for (let y = 0; y < 3; y++) im.put(x, y, dither(x, y, 0.5) ? jaune : ardoise); return im; },
  avenir: () => new Img(6, 3, nuit),
  colosse: () => pleinJauge(7, 3, rosePale, magenta, sang)
};

/* ================================================================================================ */
/* LE RADAR                                                                                          */
/* 52 × 28 : intérieur 48 × 24 en (2, 2), à la façon du scanner de Defender                           */
/* ================================================================================================ */
export function plaqueRadar() {
  const w = 52, h = 28, im = new Img(w, h, NP);
  im.cadre(1, 1, w - 2, h - 2, acier);
  /* coins en équerre d'os */
  for (const [x, y, sx, sy] of [[1, 1, 1, 1], [w - 2, 1, -1, 1], [1, h - 2, 1, -1], [w - 2, h - 2, -1, -1]]) { im.put(x, y, os); im.put(x + sx, y, os); im.put(x + 2 * sx, y, os); im.put(x, y + sy, os); im.put(x, y + 2 * sy, os); }
  /* graduations tous les 8 px, en haut et en bas */
  for (let x = 2 + 8; x < w - 2; x += 8) { im.put(x, 0, acier); im.put(x, h - 1, acier); }
  /* ligne médiane du plateau, en indigo tramé, pour situer le haut et le bas du monde */
  for (let x = 3; x < w - 3; x++) if (x % 2) im.put(x, 13, indigo);
  /* un trait d'ardoise sous le cadre : la plaque se détache du décor */
  return im;
}

/* ================================================================================================ */
/* LES CHEVRONS DE PORTAIL ET LES MARQUEURS                                                          */
/* ================================================================================================ */
/* Chevrons dessinés à la main dans deux orientations (droite, diagonale bas-droite), puis tournés par
   quarts de tour : 8 directions nettes (0 = droite, sens horaire, pas de 45°). Le jeu prend
   k = Math.round(angle / (π / 4)) & 7. Une rastérisation à 22,5° donnait des formes bancales en 7 px. */
const CHEV = {
  droit: ['m......', 'mmm....', '.mmmm..', '.mrrrmm', '.mmmm..', 'mmm....', 'm......'],
  diag: ['......m', '.....mm', '....mmm', '...mmmm', '..mmmrm', '.mmmrrm', 'mmmmmmm']
};
function huit(base) {
  const d = carte(base.droit), g = carte(base.diag), out = [d, g];
  for (let k = 2; k < 8; k++) out.push(tourne90(out[k - 2]));
  return out;
}
/* n = 1 (ordinaire), 2 (élite, RIVAL), 3 (CYCLOPE) : n pointes en file le long de la direction, chacune
   gainée à part : la gaine de la pointe de devant découpe celle de derrière (« » » lisible en 7 px) */
export function chevrons(n) {
  const un = huit(CHEV), pas = 3, box = 9 + (n - 1) * pas, out = [];
  const lutTete = n === 3 ? [0, 0, 0, 0, 0, sang, magenta] : null;           // m -> sang, r -> magenta
  const lutDos = n === 3 ? [0, 0, 0, 0, 0, sang, sang] : [0, 0, 0, 0, 0, magenta, magenta];
  for (let k = 0; k < 8; k++) {
    const im = new Img(box, box), ang = k * Math.PI / 4, ux = Math.round(Math.cos(ang)), uy = Math.round(Math.sin(ang));
    const g0 = contour(un[k], NP, true, true);
    for (let j = n - 1; j >= 0; j--) {                           // j = 0 : la pointe de tête, posée en dernier
      const c = (n - 1) * pas / 2 - j * pas;                     // décalage le long de la direction
      im.blit(j === 0 ? (lutTete ? recolore(g0, lutTete) : g0) : recolore(g0, lutDos), Math.round((box - 9) / 2 + ux * c), Math.round((box - 9) / 2 + uy * c));
    }
    out.push(im);
  }
  return out;
}
const recolore = (im, lut) => { const o = im.copie(); for (let i = 0; i < o.d.length; i++) if (lut[o.d[i]]) o.d[i] = lut[o.d[i]]; return o; };

/* marqueurs permanents hors champ : la forme dit le type, la taille dit la distance (7, 5 ou 3 px + gaine) */
const MARQUES = {
  simple: { 7: ['...m...', '..mmm..', '.mmrmm.', 'mmrrrmm', '.mmrmm.', '..mmm..', '...m...'], 5: ['..m..', '.mrm.', 'mrrrm', '.mrm.', '..m..'], 3: ['.m.', 'mrm', '.m.'] },
  double: { 7: ['...m...', '..m.m..', '.m.r.m.', 'm.rrr.m', '.m.r.m.', '..m.m..', '...m...'], 5: ['..m..', '.m.m.', 'm.r.m', '.m.m.', '..m..'], 3: ['m.m', '.r.', 'm.m'] },
  triple: { 7: ['ggggggg', 'gmmmmmg', 'gmrrrmg', 'gmrbrmg', 'gmrrrmg', 'gmmmmmg', 'ggggggg'], 5: ['ggggg', 'gmmmg', 'gmrmg', 'gmmmg', 'ggggg'], 3: ['ggg', 'gmg', 'ggg'] },
  mine: { 7: ['.m.m.m.', 'm.mmm.m', '.mm.mm.', 'mm.r.mm', '.mm.mm.', 'm.mmm.m', '.m.m.m.'], 5: ['m.m.m', '.mmm.', 'mmrmm', '.mmm.', 'm.m.m'], 3: ['m.m', '.r.', 'm.m'] },
  pastille: { 7: ['...j...', '...j...', '..joj..', 'jjooojj', '..joj..', '...j...', '...j...'], 5: ['..j..', '.joj.', 'jjojj', '.joj.', '..j..'], 3: ['.j.', 'joj', '.j.'] },
  traqueur: { 7: ['..rrr..', '.r...r.', 'r..o..r', 'r.ooo.r', 'r..o..r', '.r...r.', '..rrr..'], 5: ['.rrr.', 'r...r', 'r.o.r', 'r...r', '.rrr.'], 3: ['rrr', 'r.r', 'rrr'] }
};
export function marque(forme, taille, allume = true) {
  let m = MARQUES[forme][taille].map(r => r.padEnd(taille, '.').slice(0, taille));
  if (!allume) m = m.map(r => r.replace(/[ro]/g, forme === 'pastille' ? 'a' : 'g'));
  return contour(carte(m), NP, true, true);
}

/* ================================================================================================ */
/* LES MINI-SILHOUETTES 5 × 5 (portées par les chevrons, le radar de l'attraction, l'écran de fin)    */
/* ================================================================================================ */
export const MINIS = {
  fleche: ['..#..', '.###.', '.###.', '#####', '#.#.#'],
  dard: ['#...#', '##.##', '.###.', '.###.', '..#..'],
  larve: ['#...#', '.###.', '#####', '.###.', '#...#'],
  mine: ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'],
  tourelle: ['..#..', '#.#.#', '#####', '#####', '#...#'],
  lame: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  ruche: ['.###.', '#####', '##.##', '#####', '.###.'],
  sentinelle: ['..#..', '.###.', '##.##', '.###.', '..#..'],
  rival: ['.###.', '#....', '.###.', '....#', '.###.'],
  planeur: ['..#..', '.###.', '##.##', '#...#', '.....'],
  traqueur: ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
  cyclope: ['#.#.#', '#####', '##.##', '#####', '#...#'],
  convoi: ['.....', '#####', '#.#.#', '#####', '.#.#.']
};
export function mini(type, encre = rosePale) {
  const m = MINIS[type].map(r => r.replace(/#/g, 'X'));
  return contour(carte(m, { '.': 0, X: encre }), NP, true, true);
}

/* ================================================================================================ */
/* BANNIÈRES ET TOASTS                                                                               */
/* Une bannière = gauche + milieu répété + droite. Le texte (police 5 × 7 à l'échelle 4 en paysage, 3 en */
/* portrait) se pose centré dans la bande intérieure : hauteur 36 (texte 28) ou 29 (texte 21).         */
/* ================================================================================================ */
export const TONS = {
  danger: { encre: magenta, ombre: sang, eclat: rosePale },
  gloire: { encre: jaune, ombre: ambre, eclat: os },
  info: { encre: acier, ombre: ardoise, eclat: os }
};
/* colonne x de la bande (x < 0 : capuchon gauche, de -L à -1 ; sinon milieu), hauteur h */
function colonneBanniere(im, x0, h, ton, xc, L) {
  const T = TONS[ton];
  for (let y = 0; y < h; y++) {
    let c = 0;
    if (y === 0 || y === h - 1) c = NP;
    else if (y === 1 || y === h - 2) c = T.encre;
    else if (y === 2 || y === h - 3) c = NP;
    else if (y === 3 || y === h - 4) c = dither(xc, y, 0.5) ? T.ombre : NP;
    else c = NP;
    im.put(x0, y, c);
  }
}
export function banniere(ton, h) {
  const T = TONS[ton], L = 14;
  /* milieu : une colonne répétable (le motif de trame a une période de 4 : on livre 4 colonnes) */
  const mil = new Img(4, h); for (let x = 0; x < 4; x++) colonneBanniere(mil, x, h, ton, x, L);
  /* capuchon gauche : des chevrons qui pointent vers le texte, puis la bande */
  const g = new Img(L, h), m = Math.floor(h / 2);
  for (let x = 0; x < L; x++) {
    for (let y = 0; y < h; y++) {
      const d = Math.abs(y + 0.5 - h / 2);              // distance au milieu
      const bord = x - (h / 2 - d) * 0.45;               // le capuchon est en biais
      if (x >= 8) { colonneBanniere(g, x, h, ton, x, L); continue; }
      /* trois chevrons pleins (encre) séparés de nuit profonde */
      const t = x + d * 0.5;
      const bande = Math.floor(t / 3) % 2 === 0;
      if (t < 9 && d < h / 2 - 1) g.put(x, y, bande ? (t < 3 ? T.eclat : T.encre) : NP);
      else if (d < h / 2 && t < 10) g.put(x, y, NP);
      void bord; void m;
    }
  }
  const dr = miroirX(g);
  return { gauche: g, milieu: mil, droite: dr };
}
/* une bannière assemblée de largeur w (pour les maquettes ; le jeu fait pareil) */
export function banniereLarge(ton, h, w) {
  const B = banniere(ton, h), im = new Img(w, h);
  for (let x = B.gauche.w; x < w - B.droite.w; x += 4) im.blit(B.milieu, x, 0);
  im.blit(B.gauche, 0, 0); im.blit(B.droite, w - B.droite.w, 0);
  return im;
}
/* toast : plaque d'une ligne (police à l'échelle 1), hauteur 11 ; capuchons de 3, milieu d'une colonne */
export function toast(ton) {
  const T = TONS[ton], h = 11;
  const g = carte(['.KKK', 'KKmm', 'Kmnn', 'Kmnn', 'Kmnn', 'Kmnn', 'Kmnn', 'Kmnn', 'Kmnn', 'KKmm', '.KKK'].map(r => r), { '.': 0, K: NP, m: T.encre, n: NP });
  const mil = carte(['K', 'm', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'm', 'K'], { K: NP, m: T.ombre, n: NP });
  return { gauche: g, milieu: mil, droite: miroirX(g), h };
}

/* ================================================================================================ */
/* LES CHIFFRES DE SCORE ET LES NOTES                                                                */
/* Chiffres d'arcade 7 × 11 à traits doubles, en trois tons du haut vers le bas, gainés (9 × 13).     */
/* ================================================================================================ */
export const GROS = {
  '0': ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  '1': ['...##..', '..###..', '.####..', '...##..', '...##..', '...##..', '...##..', '...##..', '...##..', '...##..', '.######'],
  '2': ['.#####.', '##...##', '.....##', '.....##', '....##.', '...##..', '..##...', '.##....', '##.....', '##.....', '#######'],
  '3': ['.#####.', '##...##', '.....##', '.....##', '..####.', '.....##', '.....##', '.....##', '.....##', '##...##', '.#####.'],
  '4': ['....##.', '...###.', '..####.', '.##.##.', '##..##.', '##..##.', '#######', '....##.', '....##.', '....##.', '....##.'],
  '5': ['#######', '##.....', '##.....', '######.', '.....##', '.....##', '.....##', '.....##', '.....##', '##...##', '.#####.'],
  '6': ['..####.', '.##....', '##.....', '##.....', '######.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  '7': ['#######', '.....##', '.....##', '....##.', '....##.', '...##..', '...##..', '..##...', '..##...', '..##...', '..##...'],
  '8': ['.#####.', '##...##', '##...##', '##...##', '.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  '9': ['.#####.', '##...##', '##...##', '##...##', '##...##', '.######', '.....##', '.....##', '.....##', '....##.', '.####..'],
  'x': ['.......', '.......', '.......', '##...##', '.##.##.', '..###..', '..###..', '.##.##.', '##...##', '.......', '.......'],
  '+': ['.......', '.......', '..##...', '..##...', '..##...', '######.', '######.', '..##...', '..##...', '..##...', '.......'],
  '-': ['.......', '.......', '.......', '.......', '.......', '######.', '######.', '.......', '.......', '.......', '.......'],
  '%': ['##...##', '##..##.', '....##.', '...##..', '...##..', '..##...', '..##...', '.##....', '.##..##', '##...##', '.......'],
  'S': ['.######', '##.....', '##.....', '##.....', '.#####.', '.....##', '.....##', '.....##', '.....##', '.....##', '######.'],
  'A': ['..###..', '.##.##.', '##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '##...##', '##...##'],
  'B': ['######.', '##...##', '##...##', '##...##', '######.', '##...##', '##...##', '##...##', '##...##', '##...##', '######.'],
  'C': ['.#####.', '##...##', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##...##', '.#####.'],
  'D': ['#####..', '##..##.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##..##.', '#####..']
};
/* tons : [reflet (rangées 0-1), corps haut (2-5), filet (6), corps bas (7-10)] */
export const TONS_GROS = {
  score: [os, jaune, os, ambre], S: [os, jaune, os, ambre], A: [os, jaune, jaune, ambre], B: [jaune, ambre, os, brasier],
  C: [os, os, acier, acier], D: [os, acier, os, acier], danger: [rosePale, magenta, rosePale, sang], energie: [jaune, ambre, os, brasier]
};
export function gros(ch, ton = 'score', k = 1) {
  const m = GROS[ch], T = TONS_GROS[ton], im = new Img(7 * k, 11 * k);
  for (let y = 0; y < 11 * k; y++) for (let x = 0; x < 7 * k; x++) {
    if (m[(y / k) | 0][(x / k) | 0] !== '#') continue;
    const r = y / k; im.put(x, y, r < 2 ? T[0] : r < 6 ? T[1] : r < 7 ? (k > 1 && y % k === k - 1 ? T[3] : T[2]) : T[3]);
  }
  /* une ombre portée d'un pixel en bas à droite, dans le ton le plus sombre, puis la gaine */
  const o = new Img(im.w + 1, im.h + 1);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.get(x, y)) o.put(x + 1, y + 1, k > 1 ? NP : T[3]);
  o.blit(im, 0, 0);
  return contour(o, NP, true, true);
}

/* ================================================================================================ */
/* BOUTONS, ÉTOILES, ÉNERGIE, VIES                                                                   */
/* ================================================================================================ */
const GLYPHES_BOUTON = {
  pause: ['...........', '..ooo.ooo..', '..oso.oso..', '..oso.oso..', '..oso.oso..', '..oso.oso..', '..oso.oso..', '..oso.oso..', '..ooo.ooo..', '...........', '...........'],
  son: ['.....o.....', '....oo..o..', '...oso...o.', 'oooss..o..o', 'osss.o..o.o', 'osss.o..o.o', 'oooss..o..o', '...oso...o.', '....oo..o..', '.....o.....', '...........'],
  muet: ['.....o.....', '....oo.....', '...oso.....', 'oooss.s...s', 'osss...s.s.', 'osss....s..', 'oooss..s.s.', '...oso.s..s', '....oo.....', '.....o.....', '...........'],
  reglages: ['....o.o....', '..o.ooo.o..', '...osssos..', '.oossssdoo.', '..os...sd..', '.oos...sdo.', '..os...sd..', '.oossssddo.', '...osddd...', '..o.ddd.o..', '....d.d....'],
  records: ['.ooooooooo.', 'oo.jjjjj.oo', 'o..jojjj..o', '.o.jojjj.o.', '..ojjjjao..', '....jja....', '.....a.....', '.....a.....', '....aaa....', '...ooooo...', '...sssss...'],
  galerie: ['...........', '...ooooo...', '.oo.....oo.', 'o...jjj...o', 'o..jooaj..o', 'o..jodaj..o', 'o...jjj...o', '.oo.....oo.', '...ooooo...', '...........', '...........'],
  retour: ['...........', '....o......', '...oo......', '..ooooooo..', '.ooooooooo.', '..ooooooo.o', '...oo....o.', '....o...o..', '.......o...', '...........', '...........'],
  lecture: ['...........', '...oo......', '...ooo.....', '...osoo....', '...ossoo...', '...osssoo..', '...ossoo...', '...osoo....', '...ooo.....', '...oo......', '...........']
};
/* bouton carré de 22 × 22 (44 pt à px = 2) : plaque de nuit profonde, liseré acier à coins coupés, glyphe d'os */
export function bouton(nom, enfonce = false) {
  const im = new Img(22, 22);
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
    const xx = Math.min(x, 21 - x), yy = Math.min(y, 21 - y); if (xx + yy < 3) continue;
    im.put(x, y, (xx === 0 || yy === 0 || xx + yy === 3) ? NP : (xx === 1 || yy === 1 || xx + yy === 4) ? (enfonce ? os : acier) : (enfonce ? ardoise : NP));
  }
  const g = carte(GLYPHES_BOUTON[nom]);
  im.blit(g, 6 - (g.w - 11 >> 1) - 1 + 1, 6);
  return im;
}
export const glypheBouton = nom => contour(carte(GLYPHES_BOUTON[nom]), NP, true, true);

/* bouton de texte (CONTINUER, REJOUER, TITRE, OK…) : gauche 5 + milieu répétable + droite 5, hauteur 22 */
export function boutonTexte(style) {
  const e = style === 'principal' ? jaune : style === 'danger' ? magenta : acier, f = style === 'principal' ? nuit : NP, h = 22;
  const g = new Img(5, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < 5; x++) {
    const yy = Math.min(y, h - 1 - y), xx = x; if (xx + yy < 3) continue;
    g.put(x, y, (xx === 0 || yy === 0 || xx + yy === 3) ? NP : (xx === 1 || yy === 1 || xx + yy === 4) ? e : f);
  }
  const mil = new Img(1, h); for (let y = 0; y < h; y++) mil.put(0, y, y === 0 || y === h - 1 ? NP : y === 1 || y === h - 2 ? e : f);
  /* un filet d'ombre sous le liseré bas, pour le relief */
  mil.put(0, h - 3, style === 'principal' ? ambre : ardoise);
  for (let x = 2; x < 5; x++) g.put(x, h - 3, style === 'principal' ? ambre : ardoise);
  return { gauche: g, milieu: mil, droite: miroirX(g) };
}
export function boutonTexteLarge(style, w) {
  const B = boutonTexte(style), im = new Img(w, 22);
  for (let x = 5; x < w - 5; x++) im.blit(B.milieu, x, 0);
  im.blit(B.gauche, 0, 0); im.blit(B.droite, w - 5, 0);
  return im;
}

export const etoile = plein => contour(carte(plein
  ? ['...j...', '..jjj..', 'jjjojjj', '.jjjja.', '..jaaa.', '.ja.aa.', '.a...a.']
  : ['...s...', '..s.s..', 'ss...ss', '.s...s.', '..s.s..', '.s.s.s.', '.s...s.']), NP, true, true);
export const energie = () => contour(carte(['..j..', '.jja.', 'jjoaa', 'joaaa', '.aab.', '..b..']), NP, true, true);
/* vies : petites têtes de la joueuse, 5 × 5, de face (cyan pâle) ; la case perdue en acier */
export const vie = pleine => contour(carte(pleine ? ['.CCC.', 'CKCKC', 'CCCCC', 'cCCCc', '.ccc.'] : ['.sss.', 's.s.s', 's...s', 's...s', '.sss.']), NP, true, true);

/* ================================================================================================ */
/* LES CAUSES DE MORT (écran de fin, cause entourée) pour ce qui n'est pas un ennemi : 13 × 13 gainé   */
/* Pour un ennemi ou son tir, l'écran de fin pose le sprite de l'ennemi lui-même (N.spr).            */
/* ================================================================================================ */
export const CAUSES = {
  mur: ['mmmmmmmmmmmmm', 'mrrrrrrrrrrrm', 'mgg..gg..gg.m', 'm..gg..gg..gm', 'mgg..gg..gg.m', 'm..gg..gg..gm', 'mgg..gg..gg.m', 'm..gg..gg..gm', 'mgg..gg..gg.m', 'm..gg..gg..gm', 'mgg..gg..gg.m', 'mrrrrrrrrrrrm', 'mmmmmmmmmmmmm'].map(r => r.replace(/\./g, 'n')),
  morsure: ['....ccccc....', '..cc.....cc..', '.c.........c.', '.c..........c', 'c...........c', 'c...........c', 'c...........c', 'CC.........c.', 'CKC.......c..', 'CCCoo...cc...', '.CCo.occc....', '..o.o........', '.............'],
  convoi: ['.............', '.............', 'rmmmmmmmmmmmr', 'mrrrrrrrrrrrm', 'mmgmmgmmgmmgm', 'mmgmmgmmgmmgm', 'mmmmmmmmmmmmm', 'ggggggggggggg', '.KgK.....KgK.', '.gKg.....gKg.', '..K.......K..', '.............', '.............'],
  traine: ['.........mmm.', '........mrrrm', '........mrKrm', '.......mmrrrm', '......mm.mmm.', '.....mm......', '....mm.......', '...mm........', '..mm.........', '.mm..........', 'mm...........', 'm............', '.............'],
  laser: ['......r......', '.....rmr.....', '....rmmmr....', '...rmmgmmr...', 'rrrrmgrgmrrrr', 'ooooooooooooo', 'rrrrmgrgmrrrr', '...rmmgmmr...', '....rmmmr....', '.....rmr.....', '......r......', '.............', '.............'],
  souffle: ['....m...m....', '.m...m.m...m.', '..m..rrr..m..', '....rbbbr....', '...rbjjjbr...', 'mm.rbjojbr.mm', '...rbjjjbr...', '....rbbbr....', '..m..rrr..m..', '.m...m.m...m.', '....m...m....', '.............', '.............']
};
export const cause = id => contour(carte(CAUSES[id]), NP, true, true);

/* ================================================================================================ */
/* LE POUCE FANTÔME (première partie) et les gestes du second doigt                                   */
/* ================================================================================================ */
const POUCE = ['....ooo....', '...o...o...', '..o.....o..', '..o.....o..', '..o.....o..', '..o.....o..', '..o.....o..', '.o.......o.', 'o.........o', 'o.........o', 'o.........o', 'o.........o', '.o.......o.', '..o.....o..', '..o.....o..', '..o.....o..'];
/* deux images : posé (trait plein) et levé (trait tramé) ; l'os est rendu une case sur deux en acier */
export function pouce() {
  const a = carte(POUCE), b = new Img(a.w, a.h);
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.get(x, y)) { a.put(x, y, (x + y) % 3 ? os : acier); if (dither(x, y, 0.5)) b.put(x, y, acier); }
  /* l'ongle */
  for (const im of [a]) { im.put(5, 2, acier); im.put(4, 3, acier); im.put(5, 3, acier); im.put(6, 3, acier); }
  return [contour(a, NP, true, true), contour(b, NP, true, true)];
}
export const GESTES = {
  touche: ['.....s.....', '...s...s...', '.s.......s.', '....ooo....', '...o...o...', 's..o.o.o..s', '...o...o...', '....ooo....', '.s.......s.', '...s...s...', '.....s.....'],
  glisse: ['...........', '...........', '...........', '........o..', '........oo.', 's.s.s.ooooo', '........oo.', '........o..', '...........', '...........', '...........']
};
export const geste = id => contour(carte(GESTES[id]), NP, true, true);
