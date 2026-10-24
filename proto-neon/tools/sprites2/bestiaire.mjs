/* LE NOUVEAU BESTIAIRE — tout ce que REFONTE.md § 4.4, § 4.5, § 4.6 et § 3.7 prévoit et que 40-sprites.js n'a
   pas encore. Noms et tailles : ceux du catalogue figé N.ids.sprites (src/03-socle.js). Les tailles
   comprennent le contour d'un pixel en nuit profonde : une carte de 13 × 13 donne un sprite de 15 × 15.

   Les cartes des ennemis orientés sont dessinées POINTE EN HAUT (symétriques, plus faciles à lire), puis
   tournées vers la droite (direction 0) et dans les seize directions par RotSprite, puis ombrées (la lumière
   reste en haut à gauche), puis détourées. C'est exactement la chaîne de 40-sprites.js (genFleche). */
import { Img, carte, dir16, versDroite, ombre, contour, plaques, rotsprite,
  TR, NUIT, ARD, MAG, ROSE, AMBRE, JAUNE, BRAS, OS, SANG, NP, COQUE } from './commun.mjs';

export const SPRITES = [];
function def(nom, o) { SPRITES.push({ nom, ...o }); }

/* ennemi orienté : carte pointe en haut -> 16 directions, ombre, contour */
function oriente(cartes) {
  const bases = cartes.map(c => versDroite(c));
  return (k, f) => contour(ombre(dir16(bases[f % bases.length], k)));
}

/* ======================================================================================================
   DARD — le coupeur, qui vise où l'on va. Deux fourches avant, un fuseau court, une tuyère.
   La fourche ouverte vers l'avant est l'inverse exact de la flèche (pointe vers l'avant).
   ====================================================================================================== */
const DARD = [
  [
    '...m.....m...',
    '..mm.....mm..',
    '..mm.....mm..',
    '..mm.....mm..',
    '..mmm...mmm..',
    '..mmmmmmmmm..',
    '...mmmmmmm...',
    '....mosom....',
    '....morom....',
    '....mmomm....',
    '.....mmm.....',
    '.....mrm.....',
    '......r......'
  ],
  [
    '...m.....m...',
    '..mm.....mm..',
    '..mm.....mm..',
    '..mm.....mm..',
    '..mmm...mmm..',
    '..mmmmmmmmm..',
    '...mmmmmmm...',
    '....mosom....',
    '....morom....',
    '....mmomm....',
    '.....mmm.....',
    '.....mbm.....',
    '.....rbr.....'
  ]
].map(carte);
def('dard', { w: 15, h: 15, dirs: 16, images: 2, lot: '6a', famille: 'pointes', gen: oriente(DARD),
  role: 'DARD, le coupeur : deux fourches avant ouvertes (l inverse de la flèche), tuyère qui crache ; cœur sang' });

/* ======================================================================================================
   LARVE — la nuée. Un éclat à pattes : deux mandibles, un dos bombé, trois paires de pattes qui
   grouillent (deux images). 9 × 9 avec le contour.
   ====================================================================================================== */
const LARVE = [
  [
    '.m...m.',
    '..mrm..',
    'm.mmm.m',
    '.mmomm.',
    'm.mmm.m',
    '..mmm..',
    '.m.m.m.'
  ],
  [
    '..m.m..',
    '..mrm..',
    '.mmmmm.',
    'm.mom.m',
    '.mmmmm.',
    'm.mmm.m',
    '...m...'
  ]
].map(carte);
def('larve', { w: 9, h: 9, dirs: 16, images: 2, lot: '6a', famille: 'pattes', gen: oriente(LARVE),
  role: 'LARVE, la nuée : éclat à mandibles et pattes qui grouillent ; mord la queue' });

/* ======================================================================================================
   TRAQUEUR — contre l'attente. Disque à œil fendu (pupille verticale de chat), halo de huit pointillés
   rose pâle qui tourne d'un huitième de tour en quatre images. Le halo troué ne ressemble ni au RIVAL
   (perles en file), ni à la mine (piques), ni à la sentinelle (losange).
   ====================================================================================================== */
function traqueur(f) {
  const s = new Img(13, 13), c = 6.5;
  s.disc(c, c, 3.7, COQUE);
  /* l'œil fendu : amande rose pâle, pupille verticale nuit profonde */
  const oeil = [];
  for (let y = 4; y <= 8; y++) { const d = Math.abs(y - 6), l = d === 2 ? 0 : d === 1 ? 1 : 2; for (let x = 6 - l; x <= 6 + l; x++) oeil.push([x, y]); }
  const o = ombre(s);
  for (const [x, y] of oeil) o.set(x, y, Math.abs(x - 6) === 2 || Math.abs(y - 6) === 2 ? ROSE : OS);
  for (let y = 5; y <= 7; y++) o.set(6, y, NP);              /* la pupille fendue */
  /* le halo : 8 points à 6 px, décalés de 11,25° par image */
  for (let j = 0; j < 8; j++) {
    for (const da of [0, 9]) {
      const a = (j * 45 + f * 11.25 + da) * Math.PI / 180;
      o.set(Math.floor(c + 6 * Math.cos(a)), Math.floor(c + 6 * Math.sin(a)), da ? MAG : ROSE);
    }
  }
  return contour(o);
}
def('traqueur', { w: 15, h: 15, dirs: 1, images: 4, lot: '6a', famille: 'rondeurs', gen: (k, f) => traqueur(f),
  role: 'TRAQUEUR : petit disque tout en œil fendu (os, pupille verticale), halo de 8 tirets qui tourne (4 images, 1/8 de tour)' });

/* ======================================================================================================
   LAME — le trancheur. Trois lames courbes autour d'un noyau : au repos elles sont repliées en crochets
   (15 px), déployées elles fauchent large (21 px). L'arête qui attaque est rose pâle, le dos sang.
   Les seize directions sont seize positions de la faux : l'ennemi « tourne » en avançant.
   ====================================================================================================== */
function lame(n, R, courbe, f, ep0 = 1.9, rn = null) {
  const s = new Img(n, n), c = n / 2;
  /* lames : spirales de r0 à R, épaisseur qui s'amincit vers la pointe */
  for (let b = 0; b < 3; b++) {
    const a0 = -Math.PI / 2 + b * 2 * Math.PI / 3;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const r = 2 + (R - 2) * t, a = a0 + courbe * t, ep = ep0 * (1 - t) + 0.45;
      for (let e = -ep; e <= ep; e += 0.25) {
        /* l'épaisseur se prend en arrière de la courbe (le dos), l'arête est devant */
        const ae = a - e / Math.max(r, 2);
        s.set(Math.floor(c + r * Math.cos(ae)), Math.floor(c + r * Math.sin(ae)), e > ep - 0.6 ? ROSE : COQUE);
      }
    }
  }
  s.disc(c, c, rn ?? 3.6, COQUE);
  const o = ombre(s);
  /* le noyau : œil sombre, cœur qui bat (image 1 : rose pâle) */
  o.disc(c, c, 1.7, NP);
  o.set(Math.floor(c), Math.floor(c), f ? ROSE : SANG);
  return o;
}
function lameGen(n, R, courbe, ep0, rn) {
  const bases = [0, 1].map(f => lame(n, R, courbe, f, ep0, rn));
  return (k, f) => contour(dir16(bases[f], k));
}
def('lame', { w: 15, h: 15, dirs: 16, images: 2, lot: '6b', famille: 'pointes', gen: lameGen(13, 6.1, 2.5, 1.2, 2.7),
  role: 'LAME au repos : trois lames repliées en crochets autour d un noyau sombre' });
def('lame:deployee', { w: 21, h: 21, dirs: 16, images: 2, lot: '6b', famille: 'pointes', gen: lameGen(19, 9.2, 1.5),
  role: 'LAME déployée : trois faux qui fauchent large ; la direction fait tourner la faux' });

/* ======================================================================================================
   RUCHE — la source. Six pétales autour d'un cœur alvéolé ; ils s'ouvrent en trois états et le cœur
   blanchit quand la couvée est prête. RUCHE INSTABLE (élite) : 25 px, pétales hérissés d'épines,
   cœur en brasier qui bat.
   ====================================================================================================== */
function ellipse(cx, cy, a, rl, rw, n = 14) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const t = i * 2 * Math.PI / n, u = rl * Math.cos(t), v = rw * Math.sin(t);
    P.push([cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)]);
  }
  return P;
}
function ruche(n, etat, f, elite) {
  const c = n / 2;
  const G = [
    { d: 5.4, l: 4.6, w: 4.1, coeur: 2.6 },          /* fermée : un bouton rond */
    { d: 6.6, l: 4.3, w: 3.3, coeur: 3.6 },          /* mi-ouverte */
    { d: 7.6, l: 3.6, w: 2.5, coeur: 4.6 }           /* ouverte : cœur à nu */
  ][etat];
  const k = elite ? 1.08 : 1;
  const pl = [];
  for (let j = 0; j < 6; j++) {
    const a = (j * 60 - 90) * Math.PI / 180;
    pl.push({ p: ellipse(c + G.d * k * Math.cos(a), c + G.d * k * Math.sin(a), a, G.l * k, G.w * k), base: elite ? SANG : MAG, sym: false });
  }
  const s = plaques(n, n, pl, { sym: false });
  /* nervure de chaque pétale */
  for (let j = 0; j < 6; j++) {
    const a = (j * 60 - 90) * Math.PI / 180;
    for (let r = G.d * k - G.l * k * 0.4; r <= G.d * k + G.l * k * 0.5; r += 0.5) s.peint(Math.floor(c + r * Math.cos(a)), Math.floor(c + r * Math.sin(a)), elite ? BRAS : SANG);
  }
  if (elite) {
    /* épines entre les pétales */
    for (let j = 0; j < 6; j++) {
      const a = (j * 60 - 60) * Math.PI / 180;
      for (let r = G.d * k - 1; r <= c - 0.6; r += 0.4) s.set(Math.floor(c + r * Math.cos(a)), Math.floor(c + r * Math.sin(a)), r > c - 2.2 ? ROSE : MAG);
    }
  }
  /* le cœur alvéolé */
  const rc = G.coeur;
  s.disc(c, c, rc + 0.9, NP);
  s.disc(c, c, rc, elite ? SANG : MAG);
  if (etat >= 1) for (const [dx, dy] of [[-1.6, -1.2], [1.6, -1.2], [0, 1.8], [-1.6, 1.2], [1.6, 1.2], [0, -1.8]])
    if (Math.hypot(dx, dy) < rc - 0.8) s.set(Math.floor(c + dx), Math.floor(c + dy), elite ? BRAS : SANG);
  /* le cœur qui bat (image 1 plus clair), qui blanchit à l'état ouvert */
  const vif = elite ? [BRAS, JAUNE, OS] : etat === 2 ? [ROSE, OS, OS] : [SANG, ROSE, ROSE];
  const rr = f ? 1.6 : 1.1;
  s.disc(c, c, rr + (etat === 2 || elite ? 0.7 : 0), vif[0]);
  s.disc(c, c, rr, vif[1]);
  if (etat === 2 || elite) s.set(Math.floor(c), Math.floor(c), vif[2]);
  return contour(s);
}
for (const [nom, etat, role] of [['ruche', 0, 'RUCHE, pétales fermés : un bouton rond de six pétales magenta'],
  ['ruche:p1', 1, 'RUCHE, pétales mi-ouverts (0,7 s d ouverture) : le cœur alvéolé paraît'],
  ['ruche:p2', 2, 'RUCHE, pétales ouverts : le cœur blanchit, la couvée part']])
  def(nom, { w: 23, h: 23, dirs: 1, images: 2, lot: '6b', famille: 'petales', gen: (k, f) => ruche(21, etat, f, false), role });
def('ruche:elite', { w: 25, h: 25, dirs: 1, images: 2, lot: '6b', famille: 'petales', elite: true, gen: (k, f) => ruche(23, 1, f, true),
  role: 'RUCHE INSTABLE : pétales sang à nervure de brasier, six épines, cœur brasier et jaune qui bat' });
def('ruche:elite:p2', { w: 25, h: 25, dirs: 1, images: 2, lot: '6b', hors: true, famille: 'petales', elite: true, gen: (k, f) => ruche(23, 2, f, true),
  role: 'RUCHE INSTABLE, pétales ouverts (couvée)' });

/* ======================================================================================================
   RIVAL — l'autre serpent. Tête à mâchoires (qui claquent : deux images), perles en sang à cœur magenta.
   La mâchoire ouverte en V ne ressemble pas à la tête de la joueuse (coin plein à yeux en creux).
   ====================================================================================================== */
const RIVAL = [
  [
    '.m.....m.',
    'mm.....mm',
    'mm.....mm',
    'mmm...mmm',
    'mwmmmmmwm',
    '.mmmmmmm.',
    '..mmomm..',
    '..mmmmm..',
    '...mmm...'
  ],
  [
    '.........',
    '...m.m...',
    '..mm.mm..',
    '.mmm.mmm.',
    'mwmmmmmwm',
    '.mmmmmmm.',
    '..mmomm..',
    '..mmmmm..',
    '...mmm...'
  ]
].map(carte);
const rivalTete = oriente(RIVAL);
def('rival', { w: 11, h: 11, dirs: 16, images: 2, lot: '6b', famille: 'perles', gen: rivalTete,
  role: 'RIVAL, tête : mâchoires en V qui claquent, deux yeux os ; il porte la couronne' });
def('rival:coupe', { w: 11, h: 11, dirs: 16, images: 2, lot: '6b', hors: true, famille: 'perles',
  gen: (k, f) => rivalTete(k, f).remplace({ [MAG]: ROSE, [SANG]: MAG }),
  role: 'RIVAL, coupe-route annoncé 0,5 s : la tête passe au rose pâle (télégraphe)' });
const PERLE = [['.sss.', 'sMMMs', 'sMrMs', 'sMMMs', '.sss.'], ['.sss.', 'sMMMs', 'sMMMs', 'sMMMs', '.sss.']].map(carte);
def('rival:perle', { w: 7, h: 7, dirs: 1, images: 2, lot: '6b', famille: 'perles', gen: (k, f) => contour(PERLE[f]),
  role: 'RIVAL, perle du corps : sang à cœur magenta, éclat rose pâle qui coule (image = indice + compteur)' });

/* ======================================================================================================
   PLANEUR — la cible bonus du DÉFILÉ. Aile en chevron ouvert, rose pâle et sang, sans magenta : il ne
   blesse pas, il ne doit pas avoir l'air d'une menace pleine.
   ====================================================================================================== */
const PLANEUR = [
  ['...r...', '..rrr..', '.rrsrr.', 'rrsssrr', 'rss.ssr', 'rs...sr', 's.....s'],
  ['...r...', '..rrr..', '.rrsrr.', 'rrsssrr', 'rss.ssr', 'rs...sr', 'r.....r']
].map(carte);
def('planeur', { w: 9, h: 9, dirs: 16, images: 2, lot: '6b', famille: 'aile', gen: (k, f) => contour(dir16(versDroite(PLANEUR[f]), k)),
  role: 'PLANEUR : aile en chevron ouvert, rose pâle et sang, bouts d aile qui clignotent' });

/* ======================================================================================================
   FLÈCHE BLINDÉE — l'élite de V3 : la flèche agrandie et dessinée à la main (19 px), cinq pattes,
   visière, plaques de sang à rivets rose pâle sur le nez et les flancs. « :nue » : les plaques ont éclaté
   (à 50 % des PV) ; l'armature à nu est sombre, les pattes trottinent deux fois plus vite.
   ====================================================================================================== */
const ELITE = [
  '........r........',
  '.......mmm.......',
  '.......mmm.......',
  '......mmmmm......',
  '......msssm......',
  '.....mmsrsmm.....',
  '.....mmsssmm.....',
  '....mmmmmmmmm....',
  '....mrrrrrrrm....',
  '...mmmmmmmmmmm...',
  '...ssmmmmmmmss...',
  '..srsmmmmmmmsrs..',
  '..sssmmomommsss..',
  '.ssssmoomoommsss.',
  '.mmmmmmmmmmmmmmm.',
  '.m..m...m...m..m.',
  '.................'
];
function eliteCarte(f, nue) {
  const rows = ELITE.slice();
  if (f & 1) rows[15] = '..m.m...m...m.m..';
  if (nue) {
    for (let y = 0; y < rows.length; y++) rows[y] = rows[y].replace(/r(?=s)|(?<=s)r/g, 'o').replace(/s/g, 'o');
    rows[8] = '....mrrrrrrrm....';
    /* l'armature à nu : des trous sombres là où étaient les plaques ; les pattes plus écartées */
    rows[15] = f & 1 ? '.m...m.....m...m.' : '..m...m.m.m...m..';
  }
  const s = carte(rows);
  if (!nue) for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.get(x, y) === SANG && s.get(x, y - 1) === TR) s.set(x, y, MAG);
  return s;
}
const eliteBases = [[0, 1].map(f => versDroite(eliteCarte(f, false))), [0, 1].map(f => versDroite(eliteCarte(f, true)))];
def('fleche:elite', { w: 19, h: 19, dirs: 16, images: 2, lot: '6b', famille: 'pointes', elite: true,
  gen: (k, f) => contour(ombre(dir16(eliteBases[0][f], k))),
  role: 'FLÈCHE BLINDÉE : la flèche à 19 px, cinq pattes, visière, plaques de sang à rivets rose pâle' });
def('fleche:elite:nue', { w: 19, h: 19, dirs: 16, images: 2, lot: '6b', hors: true, famille: 'pointes', elite: true,
  gen: (k, f) => contour(ombre(dir16(eliteBases[1][f], k))),
  role: 'FLÈCHE BLINDÉE sans ses plaques (après 50 % des PV) : alvéoles sombres, pattes qui trottinent vite' });

/* ======================================================================================================
   MARQUES DES ÉLITES ET DES MODIFICATEURS
   ====================================================================================================== */
/* la couronne des élites : douze tirets rose pâle sur un cercle de 9,5 px, gainés de nuit profonde,
   qui tournent d'un tiers d'intervalle par image (quatre images bouclent sur 1/12 de tour) */
function couronne(f) {
  const s = new Img(21, 21), c = 10.5;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
    if (Math.abs(r - 9.3) > 0.62) continue;
    const ang = ((Math.atan2(dy, dx) * 180 / Math.PI - f * 7.5) % 30 + 30) % 30;
    if (ang < 13) s.set(x, y, ROSE);
  }
  return contour(s);
}
def('couronne', { w: 23, h: 23, dirs: 1, images: 4, lot: '6b', famille: 'marque', gen: (k, f) => couronne(f),
  role: 'couronne des élites (et du RIVAL) : 12 tirets rose pâle qui tournent ; posée SOUS le sprite, centrée' });

const PLAQUE = carte(['ssr', 'srs', 'sss']);
def('plaque', { w: 5, h: 5, dirs: 1, images: 1, lot: '6b', famille: 'marque',
  gen: () => { const s = PLAQUE.copie(); s.set(0, 0, MAG); s.set(1, 0, MAG); return contour(s); },
  role: 'plaque de BLINDÉ : sang à rivet rose pâle, arête haute magenta ; 2 à 4 par ennemi, puis débris 3 s au sol' });
def('plaque:debris', { w: 5, h: 5, dirs: 1, images: 4, lot: '6b', hors: true, famille: 'marque',
  gen: (k, f) => {
    const D = [['ss.', 's..', '...'], ['.s.', 'ss.', '...'], ['s..', '.s.', '..s'], ['.r.', 's..', '...']][f];
    return contour(carte(D));
  },
  role: 'éclats de plaque qui restent au sol 3 s (quatre formes, à tirer par ennemi)' });

/* INSTABLE : cœur de brasier qui bat d'autant plus vite que les PV baissent (le lot choisit la cadence) */
const COEURS = [['.s.', 'sbs', '.s.'], ['.b.', 'bjb', '.b.'], ['bjb', 'jwj', 'bjb'], ['.b.', 'bjb', '.b.']].map(carte);
def('instable', { w: 5, h: 5, dirs: 1, images: 4, lot: '6b', hors: true, famille: 'marque', gen: (k, f) => contour(COEURS[f]),
  role: 'marque INSTABLE : cœur de brasier qui bat (4 images : repos, montée, éclat, retombée), posé au centre' });

/* ======================================================================================================
   CONVOIS — wagons de 18 × 14 vus de dessus, roulant vers la droite (« :g » vers la gauche, miroir exact).
   Caisses en sang, arêtes magenta, nervures sombres ; le wagon de tête a un museau rose pâle qui pulse
   (deux images, à alterner sous 3 Hz) et deux phares.
   ====================================================================================================== */
function wagon(tete, f) {
  const s = new Img(16, 12);
  s.rect(0, 0, 16, 12, SANG);
  for (let x = 0; x < 16; x++) { s.set(x, 0, MAG); s.set(x, 11, MAG); }
  for (let y = 0; y < 12; y++) { s.set(0, y, MAG); s.set(15, y, MAG); }
  for (let x = 1; x < 15; x++) s.set(x, 1, ROSE);                       /* arête haute éclairée */
  for (let x = 1; x < 15; x++) s.set(x, 10, NP);                        /* ombre basse */
  for (const x of [5, 10]) for (let y = 2; y < 10; y++) s.set(x, y, NP); /* nervures */
  for (let x = 2; x < 14; x++) if (x !== 5 && x !== 10) s.set(x, 6, MAG);  /* faîte du toit */
  s.set(1, 0, TR); s.set(0, 0, TR); s.set(0, 11, TR); s.set(15, 0, TR); s.set(15, 11, TR);
  if (!tete) {
    /* attelages et feux de position qui alternent */
    s.set(0, 5, NP); s.set(0, 6, NP); s.set(15, 5, NP); s.set(15, 6, NP);
    s.set(2, 3, f ? ROSE : SANG); s.set(13, 8, f ? SANG : ROSE);
    return contour(s);
  }
  /* le museau : cabine à pare-brise sombre, coins coupés, pare-chocs qui pulse, deux phares */
  for (const [x, y] of [[15, 0], [15, 1], [14, 0], [15, 10], [15, 11], [14, 11]]) s.set(x, y, TR);
  for (let y = 2; y < 10; y++) { s.set(10, y, NP); s.set(15, y, f ? ROSE : MAG); }
  for (let y = 3; y < 9; y++) for (let x = 11; x < 14; x++) s.set(x, y, x === 11 ? NP : SANG);
  for (let y = 4; y < 8; y++) s.set(12, y, NP);
  for (let x = 11; x < 15; x++) { s.set(x, 1, ROSE); s.set(x, 10, NP); }
  s.set(14, 2, f ? OS : ROSE); s.set(14, 9, f ? OS : ROSE);           /* phares */
  s.set(0, 5, NP); s.set(0, 6, NP);
  return contour(s);
}
def('wagon', { w: 18, h: 14, dirs: 1, images: 2, lot: '6b', famille: 'convoi', gen: (k, f) => wagon(false, f),
  role: 'wagon de convoi vers la droite : caisse sang, arêtes magenta, nervures, feux qui alternent' });
def('wagon:tete', { w: 18, h: 14, dirs: 1, images: 2, lot: '6b', famille: 'convoi', gen: (k, f) => wagon(true, f),
  role: 'wagon de tête vers la droite : museau rose pâle qui pulse (sous 3 Hz), phares os' });
def('wagon:g', { w: 18, h: 14, dirs: 1, images: 2, lot: '6b', hors: true, famille: 'convoi', gen: (k, f) => wagon(false, f).miroir(),
  role: 'wagon roulant vers la gauche (miroir exact)' });
def('wagon:tete:g', { w: 18, h: 14, dirs: 1, images: 2, lot: '6b', hors: true, famille: 'convoi', gen: (k, f) => wagon(true, f).miroir(),
  role: 'wagon de tête roulant vers la gauche (miroir exact)' });

/* ======================================================================================================
   PORTAILS — le chevron de 7 px au bord de la zone sûre, qui pointe vers le point d'apparition ; double
   pour une élite, triple pour le CYCLOPE. Et l'ouverture du portail au point d'apparition (600 ms).
   ====================================================================================================== */
/* Un chevron de 5 px se casse sous RotSprite : on le trace directement dans chaque direction, en traits
   d'un pixel (pointe à 2 px du centre, branches à 2,4 px et ±135°), puis on le gaine. Le double et le triple
   empilent le même chevron tous les 3 px vers l'arrière. */
function chevron(k, n) {
  const m = [5, 9, 11][n - 1], s = new Img(m, m), c = m / 2, a = k * Math.PI / 8;
  const P = (r, b, du) => [Math.floor(c + r * Math.cos(b) + du * Math.cos(a)), Math.floor(c + r * Math.sin(b) + du * Math.sin(a))];
  for (let j = 0; j < n; j++) {
    const du = (j - (n - 1) / 2) * 3;
    const T = P(2, a, du), E1 = P(2.4, a + 3 * Math.PI / 4, du), E2 = P(2.4, a - 3 * Math.PI / 4, du);
    s.line(T[0], T[1], E1[0], E1[1], MAG); s.line(T[0], T[1], E2[0], E2[1], MAG);
    if (j === n - 1) s.set(T[0], T[1], ROSE);
  }
  return contour(s);
}
def('portail', { w: 7, h: 7, dirs: 16, images: 1, lot: '6a', famille: 'portail', gen: (k) => chevron(k, 1),
  role: 'chevron de portail : magenta à pointe rose pâle, pointe vers l apparition ; porte la mini-silhouette à côté' });
def('portail:double', { w: 11, h: 11, dirs: 16, images: 1, lot: '6a', hors: true, famille: 'portail', gen: (k) => chevron(k, 2),
  role: 'chevron double : portail d élite (et marqueur permanent de l élite et du RIVAL)' });
def('portail:triple', { w: 13, h: 13, dirs: 16, images: 1, lot: '6a', hors: true, famille: 'portail', gen: (k) => chevron(k, 3),
  role: 'chevron triple : portail du CYCLOPE, annoncé 1,4 s avant (et son marqueur hors champ)' });

/* l'ouverture au sol : une fente qui s'ouvre en anneau tramé, six images sur les 600 ms */
function ouverture(f, n) {
  const s = new Img(n, n), c = n / 2, R = (n / 2 - 0.5) * [0.25, 0.45, 0.65, 0.85, 1, 1][f];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
    if (d <= R && d > R - 1.3) s.set(x, y, f >= 4 && ((x + y + f) & 1) ? ROSE : MAG);
    else if (d <= R - 1.3 && d > R - 2.6 && (x + y) % 2 === 0) s.set(x, y, SANG);
  }
  if (f === 5) s.disc(c, c, 1.6, OS);
  else s.disc(c, c, 0.9, f >= 3 ? ROSE : MAG);
  return contour(s);
}
def('portail:sol', { w: 15, h: 15, dirs: 1, images: 6, lot: '6a', hors: true, famille: 'portail', gen: (k, f) => ouverture(f, 13),
  role: 'portail au point d apparition : anneau qui s ouvre en 600 ms (6 images de 100 ms), éclat os à la fin' });
def('portail:sol:elite', { w: 21, h: 21, dirs: 1, images: 6, lot: '6a', hors: true, famille: 'portail', gen: (k, f) => ouverture(f, 19),
  role: 'portail d élite, même rythme, plus grand' });

/* ======================================================================================================
   MINI-SILHOUETTES 5 × 5 (chevrons de portail, marqueurs) : une seule encre, rose pâle, sans contour
   (la plaque du HUD les gaine). Recolorer par blit({ci}) si besoin.
   ====================================================================================================== */
export const MINIS = {
  fleche:     ['..#..', '.###.', '.###.', '#####', '#.#.#'],
  dard:       ['#...#', '#...#', '##.##', '.###.', '..#..'],
  larve:      ['#...#', '.###.', '#####', '.###.', '#.#.#'],
  mine:       ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'],
  tourelle:   ['##.##', '#####', '#...#', '#.#.#', '#####'],
  lame:       ['#....', '.#.##', '..#..', '##.#.', '....#'],
  ruche:      ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
  sentinelle: ['..#..', '.###.', '##.##', '.###.', '..#..'],
  rival:      ['#.#..', '.##..', '..#..', '..##.', '...##'],
  planeur:    ['.....', '..#..', '.#.#.', '#...#', '.....'],
  traqueur:   ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'],
  cyclope:    ['#.#.#', '#####', '#.#.#', '#####', '#...#'],
  convoi:     ['.....', '####.', '#####', '####.', '.....']
};
/* le traqueur et la mine partageaient presque leur dessin : le traqueur garde son œil fendu */
MINIS.traqueur = ['#...#', '.###.', '.#.#.', '.###.', '#...#'];
for (const [t, rows] of Object.entries(MINIS)) {
  def('mini:' + t, { w: 5, h: 5, dirs: 1, images: 1, lot: '6a', famille: 'mini', mini: true,
    gen: () => { const s = new Img(5, 5); rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') s.set(x, y, ROSE); })); return s; },
    role: 'mini-silhouette ' + t + ' (5 × 5, rose pâle, sans contour)' });
}

/* ======================================================================================================
   MARQUEURS PERMANENTS HORS CHAMP (§ 3.7) : rond à cœur clignotant pour la mine, étoile jaune pour la
   PASTILLE, à deux tailles (7 px de près, 3 px de loin). L'élite, le RIVAL et le CYCLOPE prennent les
   chevrons double et triple.
   ====================================================================================================== */
def('marque:mine', { w: 7, h: 7, dirs: 1, images: 2, lot: '6a', hors: true, famille: 'marque',
  gen: (k, f) => contour(carte(['.MMM.', 'MsssM', 'Ms' + (f ? 'r' : 's') + 'sM', 'MsssM', '.MMM.'])),
  role: 'marqueur de mine armée hors champ, de près : rond à cœur qui clignote (2 Hz : image = cycle)' });
def('marque:mine:loin', { w: 3, h: 3, dirs: 1, images: 2, lot: '6a', hors: true, famille: 'marque',
  gen: (k, f) => { const s = new Img(3, 3); s.rect(0, 0, 3, 3, NP); s.set(1, 1, f ? ROSE : MAG); return s; },
  role: 'marqueur de mine, de loin (3 px)' });
def('marque:pastille', { w: 7, h: 7, dirs: 1, images: 2, lot: '6a', hors: true, famille: 'marque',
  gen: (k, f) => contour(carte(['..j..', '.jjj.', 'jj' + (f ? 'w' : 'j') + 'jj', '.jjj.', 'j...j'])),
  role: 'marqueur de la PASTILLE hors champ, de près : étoile jaune (cœur os qui bat à 2 Hz)' });
def('marque:pastille:loin', { w: 3, h: 3, dirs: 1, images: 2, lot: '6a', hors: true, famille: 'marque',
  gen: (k, f) => { const s = new Img(3, 3); s.rect(0, 0, 3, 3, NP); s.set(1, 1, f ? OS : JAUNE); return s; },
  role: 'marqueur de la PASTILLE, de loin (3 px)' });
