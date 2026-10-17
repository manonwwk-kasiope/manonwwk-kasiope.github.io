/* ===== 00-pal.js — la palette fermée, le tramage de Bayer, les conversions =====

   C'EST LE SEUL FICHIER DU PROTOTYPE OÙ UNE COULEUR EST ÉCRITE.
   Si tu as besoin d'une teinte, elle existe déjà ici sous un nom. Si elle n'existe pas, elle n'est
   pas dans la direction artistique : prends la plus proche, ou trame entre deux (N.pal.dither).

   Interface imposée par CONTRAT.md :
     N.pal.C            tableau de 16 chaînes '#rrggbb', index 0..15, ordre exact de DIRECTION.md
     N.pal.i(nom)       index par nom
     N.pal.dither(x,y,t)  -> true si le pixel (x,y) doit être posé pour une intensité t de 0 à 1

   Extras publiés en plus, pour que personne d'autre n'ait à écrire une couleur :
     N.pal.NAMES        les seize noms, dans l'ordre
     N.pal.R/G/B        Uint8Array(16) des composantes
     N.pal.U32          Uint32Array(16) prêt pour un ImageData (boutisme détecté)
     N.pal.LUM          Float32Array(16) luma 0..1 (pondération 0,299 / 0,587 / 0,114), pour l'ombrage
     N.pal.L            Float32Array(16) luminance relative WCAG de chaque encre, FIXÉE par REFONTE.md
                        § 5.1 (contrat 1.0) : c'est elle que mesurent les critères de lumière (R-11)
     N.pal.lumineux(i)  -> true si N.pal.L[i] > 0,10 : magenta, rose pâle, cyan, cyan pâle, ambre, jaune,
                        brasier, os, acier
     N.pal.css(ci)      '#rrggbb'
     N.pal.rgba(ci,a)   'rgba(r,g,b,a)'  — pour les voiles du post-traitement
     N.pal.near(r,g,b)  index de palette le plus proche (métrique pondérée)
     N.pal.shade(ci,k)  index le plus proche de la couleur ci multipliée par k (0..1) — ombrage SANS
                        sortir de la palette ; c'est la bonne façon d'assombrir quelque chose
     N.pal.mix(a,b,t)   index le plus proche du mélange de deux index
     N.pal.BAYER        la matrice 4x4 brute (valeurs 0..15)
     N.pal.CHAN         masques de canal pur, uniquement pour l'aberration chromatique de 20-crt.js
     N.pal.WHITE/BLACK  neutres de composition, uniquement pour les voiles de 20-crt.js
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ---- la table, dans l'ordre exact de DIRECTION.md ---- */
  var NAMES = [
    'vide',     /*  0  fond du monde                  */
    'nuit',     /*  1  voiles, profondeur             */
    'ardoise',  /*  2  structures mortes              */
    'violet',   /*  3  treillis, grille de sol        */
    'indigo',   /*  4  treillis proche                */
    'magenta',  /*  5  ENNEMIS, danger, télégraphes   */
    'rosePale', /*  6  éclats d'ennemi                */
    'cyan',     /*  7  LA JOUEUSE, et elle seule      */
    'cyanPale', /*  8  tête, reflets de la joueuse    */
    'ambre',    /*  9  butin, énergie                 */
    'jaune',    /* 10  score, récompense              */
    'brasier',  /* 11  explosions, cœur chaud         */
    'os',       /* 12  flash de frappe, texte         */
    'acier',    /* 13  interface neutre               */
    'sang',     /* 14  ombre des ennemis              */
    'nuitProfonde' /* 15 bordure d'arène, gaine des télégraphes */
  ];
  var C = [
    '#0d0221', '#190b28', '#241734', '#541388',
    '#2d1b69', '#ff2a6d', '#ff8fab', '#05d9e8',
    '#d1f7ff', '#ff9e00', '#ffd319', '#ff5714',
    '#fffce8', '#8a8fa3', '#8b0f3a', '#01012b'
  ];
  var NC = 16;

  /* ---- décomposition ---- */
  var R = new Uint8Array(NC), G = new Uint8Array(NC), B = new Uint8Array(NC);
  var LUM = new Float32Array(NC);
  for (var k = 0; k < NC; k++) {
    var v = parseInt(C[k].slice(1), 16);
    R[k] = (v >> 16) & 255; G[k] = (v >> 8) & 255; B[k] = v & 255;
    LUM[k] = (0.299 * R[k] + 0.587 * G[k] + 0.114 * B[k]) / 255;
  }

  /* ---- luminance relative WCAG, figée (REFONTE.md § 5.1) : vide 0,002 ; nuit 0,006 ; ardoise 0,012 ;
     violet 0,041 ; indigo 0,024 ; magenta 0,240 ; rose pâle 0,438 ; cyan 0,555 ; cyan pâle 0,873 ;
     ambre 0,457 ; jaune 0,679 ; brasier 0,281 ; os 0,967 ; acier 0,277 ; sang 0,061 ; nuit profonde 0,002.
     Une encre est « lumineuse » au-delà de 0,10. ---- */
  var LW = new Float32Array([0.002, 0.006, 0.012, 0.041, 0.024, 0.240, 0.438, 0.555,
    0.873, 0.457, 0.679, 0.281, 0.967, 0.277, 0.061, 0.002]);
  var SEUIL_LUMINEUX = 0.10;
  var LUMINEUX = new Uint8Array(NC);
  for (var lw = 0; lw < NC; lw++) LUMINEUX[lw] = LW[lw] > SEUIL_LUMINEUX ? 1 : 0;
  function lumineux(ci) { return LUMINEUX[i(ci) & 15] === 1; }

  var IDX = {};
  for (var n = 0; n < NC; n++) IDX[NAMES[n]] = n;
  function i(nom) {
    if (typeof nom === 'number') return nom | 0;
    var r = IDX[nom];
    return r === undefined ? 0 : r;
  }

  /* ---- mots de 32 bits prêts pour un ImageData : boutisme détecté une fois ---- */
  var LE = true;
  try {
    var probe = new ArrayBuffer(4);
    new Uint32Array(probe)[0] = 1;
    LE = new Uint8Array(probe)[0] === 1;
  } catch (e) { LE = true; }
  var U32 = new Uint32Array(NC);
  for (var u = 0; u < NC; u++) {
    U32[u] = LE
      ? (((255 << 24) | (B[u] << 16) | (G[u] << 8) | R[u]) >>> 0)
      : (((R[u] << 24) | (G[u] << 16) | (B[u] << 8) | 255) >>> 0);
  }

  /* ---- tramage ordonné de Bayer 4x4 : c'est lui qui donne l'époque ----
     Un dégradé se fait au tramage, jamais en interpolation. dither(x,y,t) est monotone :
     t <= 0 ne pose rien, t >= 1 pose tout, et un t qui monte n'éteint jamais un pixel déjà posé. */
  var BAYER = new Uint8Array([
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ]);
  function dither(x, y, t) {
    if (t >= 1) return true;
    if (!(t > 0)) return false;                      /* couvre 0, NaN et le négatif */
    return t * 16 > BAYER[(((y & 3) << 2) | (x & 3))];
  }

  /* ---- proximité : rester dans la palette même quand on calcule une couleur ---- */
  function near(r, g, b) {
    var best = 0, bd = Infinity;
    for (var p = 0; p < NC; p++) {
      var dr = r - R[p], dg = g - G[p], db = b - B[p];
      /* pondération perceptuelle : l'œil pèse le vert, pas le bleu */
      var d = 0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /* table d'ombrage précalculée : 17 niveaux de k, de 0 à 1 par seizièmes */
  var SL = 17;
  var SHADE = new Uint8Array(NC * SL);
  for (var si = 0; si < NC; si++) {
    for (var sj = 0; sj < SL; sj++) {
      var kk = sj / (SL - 1);
      SHADE[si * SL + sj] = near(R[si] * kk, G[si] * kk, B[si] * kk);
    }
  }
  function shade(ci, kq) {
    ci = i(ci) & 15;
    if (!(kq > 0)) return SHADE[ci * SL];
    if (kq >= 1) return ci;
    return SHADE[ci * SL + Math.round(kq * (SL - 1))];
  }

  function mix(a, b, t) {
    a = i(a) & 15; b = i(b) & 15;
    if (!(t > 0)) return a;
    if (t >= 1) return b;
    return near(R[a] + (R[b] - R[a]) * t, G[a] + (G[b] - G[a]) * t, B[a] + (B[b] - B[a]) * t);
  }

  function css(ci) { return C[i(ci) & 15]; }
  function rgba(ci, a) {
    var c = i(ci) & 15;
    return 'rgba(' + R[c] + ',' + G[c] + ',' + B[c] + ',' + a + ')';
  }

  N.pal = {
    C: C, NAMES: NAMES, N: NC,
    i: i, dither: dither,
    R: R, G: G, B: B, LUM: LUM, U32: U32, LE: LE,
    L: LW, SEUIL_LUMINEUX: SEUIL_LUMINEUX, LUMINEUX: LUMINEUX, lumineux: lumineux,
    BAYER: BAYER,
    css: css, rgba: rgba, near: near, shade: shade, mix: mix, SHADE: SHADE, SL: SL,

    /* Neutres et masques de canal. Ils ne servent QU'À la composition de 20-crt.js (voiles,
       multiplications, séparation des canaux) et ne doivent jamais apparaître comme encre d'un
       pixel de jeu : un pixel de jeu porte toujours un index de la table des seize. */
    WHITE: '#ffffff', BLACK: '#000000',
    CHAN: ['#ff0000', '#00ff00', '#0000ff']
  };
})();
