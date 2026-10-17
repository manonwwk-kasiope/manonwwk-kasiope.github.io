/* ===== 40-sprites.js — sprites procéduraux : joueuse, ennemis, colosse, butin, tirs, icônes, police 5×7 =====

   Tout est posé pixel par pixel ici, par des cartes de caractères dessinées à la main ou par du code,
   dans les index de la palette fermée : aucune couleur n'est écrite dans ce fichier. Chaque sprite est
   construit une fois puis mis en cache : appeler make() ou text() à chaque image ne coûte qu'une
   recherche dans une table.

   FORMAT (CONTRAT.md) : {w, h, data: Uint8Array} d'index de palette, 0 = transparent. Chaque sprite porte
   en plus cx, cy : son pixel d'ancrage (le centre de l'objet), pour le poser par son centre :
       var s = N.spr.make('mine', k);  N.gfx.blit(s, x - s.cx, y - s.cy);
   ou, plus court :                    N.spr.draw('mine', k, x, y);

   ---------------------------------------------------------------------------------------------------
   N.spr.make(nom, graine)
     nom    : un nom de la liste ci-dessous, suivi au besoin de ':variante' et/ou de '*k' (agrandissement
              entier k = 2..4, 'pause*2'). Casse et accents indifférents ('Flèche' = 'fleche').
     graine : entier quelconque. Pour un sprite animé, l'image affichée est graine modulo le nombre
              d'images : passe un compteur, par exemple ((S.t / 120) | 0) + indice de l'objet pour
              désynchroniser une foule. Négatif ou absent = 0.
     Un nom inconnu rend un petit losange acier (jamais null) et le compte dans N.spr.unknown.

   DIRECTIONS : 'tete', 'tir', 'chevron' et 'fleche' existent en seize directions, 'nom:k' avec
     k = N.spr.dir(angle) (ou N.spr.dir(dx, dy)) : 0 = vers la droite, puis sens des aiguilles d'une montre
     à l'écran (y vers le bas) : 4 = bas, 8 = gauche, 12 = haut. Sans k, ces sprites regardent à droite.
     Ils sont DÉJÀ tournés (rotation RotSprite d'une carte dessinée à la main) et déjà détourés :
     ne les retourne pas et ne leur rajoute pas de contour, demande la direction voulue.

   LES NOMS ACCEPTÉS (N.spr.names() rend cette liste) — taille, images d'animation :
     joueuse, cyan et cyan pâle SEULEMENT (le cyan lui est réservé), sans contour sombre :
       'tete'          13×13 (tête de 11), 3 images de scintillement ; les yeux sont des trous
       'corps'         segment 9×9 ; 'corps:7', 'corps:5', 'corps:3' vers la queue ; 3 images.
                       Pose les segments de la queue vers la tête, la tête en dernier ; passe
                       graine = indice + compteur pour que les données coulent le long du corps
       'queue'         = 'corps:3', pour le dernier segment
       'tir'           tir de la joueuse 7×7, trait à tête pâle ; 2 images
       'chevron'       chevron de visée 7×7 (cap visé différent du cap réel) ; 1 image
       'vie'           icône de vie 9×9 (petite tête de la joueuse) ; 'vieVide' la case perdue, acier
     ennemis, magenta / sang / rose pâle, contour d'un pixel en nuit profonde, jamais de cyan :
       'fleche'        15×15, triangle à visière et trois pattes (la planche la montre pointe en haut :
                       'fleche:12') ; 2 images, les pattes trottinent
       'tourelle'      15×15, bloc blindé à deux oreilles, canon central, deux pattes ; 2 images ;
                       'tourelle:charge' le canon s'allume avant de tirer (télégraphe) ; 2 images
       'sentinelle'    15×15, losange, œil dans une étoile sombre ; 4 images, la pupille balaie
       'mine'          13×13, sphère à piques, cœur lumineux ; 2 images ; 'mine:alerte' cœur qui clignote
       'colosse'       49×49, le gros ennemi à l'œil unique ; 2 images, le cœur respire ;
                       'colosse:oeil' œil allumé (jaune, os et brasier comme sur le panneau) ; 2 images
       'tirEnnemi'     projectile 7×7 (cœur 5×5, liseré sombre) ; ':petit' 5×5 (cœur 3×3) ; ':gros' 9×9 ;
                       2 images
     butin, ambre / jaune / os, contour nuit profonde :
       'butin'         cellule d'énergie 9×11, éclair ; 4 images, un reflet la balaie
     interface, os sur liseré nuit profonde ; ':acier', ':jaune'… repeint l'encre ('pause:acier') :
       'son' son actif, 'muet' son coupé, 'pause', 'lecture' (reprendre) : 11×11
       'ok' coche jaune 9×8, 'ko' croix magenta 9×9 : défi réussi, défi raté
     synonymes acceptés : seg, segment -> corps ; cellule, energie -> butin ; balle, projectile ->
       tirEnnemi ; boss -> colosse ; coche -> ok ; croix -> ko ; reprendre -> lecture

   N.spr.frames(nom) -> nombre d'images de l'animation.
   N.spr.draw(nom, graine, x, y, opts) -> pose le sprite CENTRÉ en (x, y) ; opts comme N.gfx.blit.
   N.spr.rotate(sprite, k) -> un sprite à soi, orienté vers la droite, tourné dans la direction k.

   ---------------------------------------------------------------------------------------------------
   N.spr.text(chaine, opts) -> sprite du texte en police 5×7 maison, mis en page d'un bloc.
     Police de borne à chasse fixe (case de 5, avance de 6 : un score ne tremble pas, et poser les
     lettres une à une avec une avance de 6 donne le même dessin). Capitales A-Z, chiffres, . , : ; ! ? - / % + ' " ( ) « » # *
     = < > _ ° × … et l'espace, les capitales accentuées du français (É È Ê Ë À Â Ä Ç Ù Û Ü Ô Ö Î Ï Ÿ
     Œ Æ), et des signes d'interface : ✓ ✗ ★ ♥ ← ↑ → ↓. Les minuscules deviennent des capitales
     (é -> É) ; un signe inconnu perd ses accents, sinon devient « ? ». '\n' passe à la ligne.
     opts : une couleur (nom ou index), ou un objet :
       ci | encre | couleur   couleur des lettres (défaut 'os')
       ombre | shadow         ombre portée d'un pixel en bas à droite : true = nuit profonde, ou un nom
                              de couleur ; défaut false
       contour | outline      liseré d'un pixel tout autour des lettres : true = nuit profonde, ou un nom
                              de couleur ; défaut false. C'est lui qui rend un texte lisible sur
                              n'importe quel fond, explosions comprises
       echelle | scale        1 (défaut) à 4 : chaque pixel de police devient k×k pixels de jeu (V-07)
       align                  'gauche' (défaut), 'centre', 'droite', pour plusieurs lignes
     Change la couleur ICI plutôt que par blit({ci}) : blit repeindrait aussi l'ombre et le contour.
     Sans ombre ni contour, blit({ci}) recolore proprement.
   MÉTRIQUE, la même pour toutes les chaînes (deux textes posés à la même hauteur s'alignent, accents ou
   pas, et une lettre seule a la même hauteur qu'un mot) : 2 rangées réservées aux accents en haut,
   puis 7 rangées de capitales, puis l'ombre éventuelle ; seuls Ç et la virgule descendent de 2
   rangées sous la ligne de base. Le sprite porte top (première rangée des capitales, marges comprises),
   cap (hauteur des capitales) et lines, à l'échelle : blit(s, x, y - s.top) pose les capitales en y.
     Hauteur d'une ligne : 2 + 7 = 9 (10 avec ombre) ; interligne : 11 ; largeur : 6 × lettres - 1.
   N.spr.measure(chaine, opts) -> {w, h} sans rien construire.
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ---- index de palette par nom, dans l'ordre de CONTRAT.md : ce sont des index, pas des couleurs ---- */
  var NOMS = ['vide', 'nuit', 'ardoise', 'violet', 'indigo', 'magenta', 'rosePale', 'cyan', 'cyanPale',
    'ambre', 'jaune', 'brasier', 'os', 'acier', 'sang', 'nuitProfonde'];
  var K = {};
  for (var q = 0; q < 16; q++) { K[NOMS[q]] = q; K[NOMS[q].toLowerCase()] = q; }
  var VIDE = 0, NUIT = 1, MAG = 5, ROSE = 6, CYAN = 7, CYP = 8, AMBRE = 9, JAUNE = 10, BRAS = 11,
    OS = 12, ACIER = 13, SANG = 14, NP = 15;
  function ix(c, def) {
    if (c === undefined || c === null || c === true) return def;
    if (typeof c === 'number') return c & 15;
    var r = K[c];
    if (r === undefined && typeof c === 'string') r = K[c.toLowerCase()];
    return r === undefined ? def : r;
  }

  /* légende des cartes de caractères */
  var LEG = { '.': 0, ' ': 0, o: NP, n: NUIT, d: 2, v: 3, i: 4, m: MAG, r: ROSE, c: CYAN, p: CYP,
    a: AMBRE, j: JAUNE, b: BRAS, w: OS, g: ACIER, s: SANG };

  /* ---------------------------------------------------------------------------------------------- */
  /* outils de base                                                                                   */
  /* ---------------------------------------------------------------------------------------------- */
  function spr(w, h) { return { w: w, h: h, data: new Uint8Array(w * h), cx: (w - 1) >> 1, cy: (h - 1) >> 1 }; }

  function fromMap(rows) {
    var h = rows.length, w = 0, x, y;
    for (y = 0; y < h; y++) if (rows[y].length > w) w = rows[y].length;
    var s = spr(w, h);
    for (y = 0; y < h; y++) for (x = 0; x < rows[y].length; x++) s.data[y * w + x] = LEG[rows[y][x]] || 0;
    return s;
  }

  /* contour d'un pixel : agrandit le sprite d'un pixel de chaque côté et entoure tout pixel opaque.
     diag = true : voisinage de 8 (aucune fuite par un coin, c'est ce que demande la lisibilité au
     milieu d'une explosion) ; false : voisinage de 4 (formes rondes, petits projectiles). */
  function contour(s, ci, diag) {
    var w = s.w + 2, h = s.h + 2, o = spr(w, h), x, y;
    var src = new Uint8Array(w * h);
    for (y = 0; y < s.h; y++) for (x = 0; x < s.w; x++) src[(y + 1) * w + x + 1] = s.data[y * s.w + x];
    o.data.set(src);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      var hit = false;
      for (var dy = -1; dy <= 1 && !hit; dy++) for (var dx = -1; dx <= 1 && !hit; dx++) {
        if (!dx && !dy) continue;
        if (!diag && dx && dy) continue;
        var xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (src[yy * w + xx]) hit = true;
      }
      if (hit) o.data[y * w + x] = ci;
    }
    o.cx = s.cx + 1; o.cy = s.cy + 1;
    return o;
  }

  /* les huit symétries du carré : transposition, puis miroirs */
  function d4(s, t, fx, fy) {
    var w = t ? s.h : s.w, h = t ? s.w : s.h, o = spr(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var sx = fx ? w - 1 - x : x, sy = fy ? h - 1 - y : y;
      var ox = t ? sy : sx, oy = t ? sx : sy;
      o.data[y * w + x] = s.data[oy * s.w + ox];
    }
    return o;
  }

  function recolor(s, from, to) {
    var o = spr(s.w, s.h);
    o.cx = s.cx; o.cy = s.cy;
    for (var i = 0; i < s.data.length; i++) o.data[i] = s.data[i] === from ? to : s.data[i];
    return o;
  }

  function upscale(s, k) {
    var o = spr(s.w * k, s.h * k);
    for (var y = 0; y < o.h; y++) for (var x = 0; x < o.w; x++) o.data[y * o.w + x] = s.data[((y / k) | 0) * s.w + ((x / k) | 0)];
    o.cx = s.cx * k + ((k - 1) >> 1); o.cy = s.cy * k + ((k - 1) >> 1);
    return o;
  }

  /* ---- rotation des cartes dessinées à la main, façon RotSprite ----
     La carte est agrandie ×8 par trois passes de Scale2x (EPX : il ne fait que recopier des index
     voisins, il n'invente aucune couleur), tournée au plus proche, puis relue au centre de chaque
     pixel. Les quarts de tour, eux, sont des symétries exactes : la direction k = 4m + b est le quart
     de tour m de la rotation de base b (0°, 22,5°, 45°, 67,5°). Les seize directions d'un même objet
     sont donc toutes tirées d'UNE carte, et deux directions symétriques restent symétriques. */
  function scale2x(d, w, h) {
    var o = new Uint8Array(w * h * 4), W2 = w * 2;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var P = d[y * w + x];
      var A = y > 0 ? d[(y - 1) * w + x] : 0, D = y < h - 1 ? d[(y + 1) * w + x] : 0;
      var C = x > 0 ? d[y * w + x - 1] : 0, B = x < w - 1 ? d[y * w + x + 1] : 0;
      var e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      var o0 = 2 * y * W2 + 2 * x;
      o[o0] = e0; o[o0 + 1] = e1; o[o0 + W2] = e2; o[o0 + W2 + 1] = e3;
    }
    return o;
  }
  function rotsprite(s, a) {
    var w = s.w, h = s.h, d = s.data, k = 1;
    for (var n = 0; n < 3; n++) { d = scale2x(d, w * k, h * k); k *= 2; }
    var W8 = w * 8, H8 = h * 8, o = spr(w, h), ca = Math.cos(a), sa = Math.sin(a);
    var cx = s.cx + 0.5, cy = s.cy + 0.5;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var px = x + 0.5 - cx, py = y + 0.5 - cy;
      var sx = px * ca + py * sa + cx, sy = -px * sa + py * ca + cy;
      var X = Math.floor(sx * 8), Y = Math.floor(sy * 8);
      if (X < 0 || Y < 0 || X >= W8 || Y >= H8) continue;
      o.data[y * w + x] = d[Y * W8 + X];
    }
    o.cx = s.cx; o.cy = s.cy;
    return o;
  }
  /* quart de tour dans le sens des aiguilles d'une montre (à l'écran, y vers le bas) : droite -> bas */
  function rot90(s) {
    var w = s.w, h = s.h, o = spr(h, w);
    for (var y = 0; y < w; y++) for (var x = 0; x < h; x++) o.data[y * h + x] = s.data[(h - 1 - x) * w + y];
    o.cx = h - 1 - s.cy; o.cy = s.cx;
    return o;
  }
  /* seize directions tirées d'une carte orientée vers la droite ; mémorisées par carte */
  function dir16(base, k, memo) {
    if (memo[k]) return memo[k];
    var b = k & 3, m = k >> 2;
    var s = b ? rotsprite(base, b * Math.PI / 8) : base;
    for (var i = 0; i < m; i++) s = rot90(s);
    memo[k] = s;
    return s;
  }

  /* point dans un polygone (règle pair-impair), pour les plaques du colosse */
  function inPoly(P, x, y) {
    var c = false;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      var xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* LA JOUEUSE — cyan et cyan pâle seulement                                                         */
  /* ---------------------------------------------------------------------------------------------- */
  var A16 = Math.PI / 8;
  /* la tête, tournée vers la droite : un coin pâle cerclé de cyan, deux yeux vers l'avant, le museau
     au bout. Trois images : la même tête, et deux éclats de données qui courent sur le liseré. */
  /* Les yeux sont des TROUS (index 0) : sombres sur la tête pâle, ils se lisent à un pixel, et la tête
     ne pose pourtant que du cyan et du cyan pâle (G-11 : 100 % de ses pixels dessinés). Le trait
     cyan derrière chaque œil est la bande sombre des vipères. */
  var TETE = [
    '.............',
    '...cccc......',
    '..cppppcc....',
    '.cpppppppc...',
    '.cppppcc.pc..',
    '.cpppppppppc.',
    '.cppppppppppc',
    '.cpppppppppc.',
    '.cppppcc.pc..',
    '.cpppppppc...',
    '..cppppcc....',
    '...cccc......',
    '.............'
  ];
  var TETE_ECLATS = [[], [[4, 1], [9, 3], [2, 10]], [[1, 5], [11, 5], [5, 11]]];
  var teteBase = [], teteMemo = [{}, {}, {}];
  function genTete(k, f) {
    if (!teteBase[f]) {
      var s0 = fromMap(TETE), e = TETE_ECLATS[f];
      for (var i = 0; i < e.length; i++) s0.data[e[i][1] * s0.w + e[i][0]] = CYP;
      s0.cx = 6; s0.cy = 6;
      teteBase[f] = s0;
    }
    return dir16(teteBase[f], k, teteMemo[f]);
  }

  function discMask(d) {
    var r = d / 2, c = (d - 1) / 2, m = new Uint8Array(d * d);
    for (var y = 0; y < d; y++) for (var x = 0; x < d; x++) {
      var dx = x - c, dy = y - c;
      if (dx * dx + dy * dy <= r * r + (d === 3 ? -0.3 : 0.05)) m[y * d + x] = 1;
    }
    return m;
  }
  /* bits de données qui défilent dans un segment : tirets pâles, trois images */
  var BITS = {
    9: [[[2, 3], [3, 3], [5, 5], [6, 5]], [[4, 2], [5, 2], [2, 5], [3, 5], [5, 6]], [[3, 4], [4, 4], [6, 3], [5, 6], [6, 6]]],
    7: [[[2, 2], [3, 2], [4, 4]], [[3, 3], [4, 3], [2, 4]], [[2, 3], [4, 2], [3, 4], [4, 4]]],
    5: [[[2, 2]], [[1, 2], [2, 2]], [[2, 1]]],
    3: [[[1, 1]], [], [[1, 1]]]
  };
  function genCorps(d, f) {
    var m = discMask(d), s = spr(d, d), i;
    for (i = 0; i < d * d; i++) if (m[i]) s.data[i] = CYAN;
    var b = BITS[d][f % 3];
    for (i = 0; i < b.length; i++) { var j = b[i][1] * d + b[i][0]; if (m[j]) s.data[j] = CYP; }
    /* reflet en haut à gauche */
    if (d >= 7) s.data[1 * d + 2] = CYP;
    return s;
  }

  /* le tir de la joueuse : un trait de données, tête pâle devant, traîne cyan qui scintille */
  var TIR = [
    [
      '.......',
      '.......',
      '..ccpp.',
      'cccpppp',
      '..ccpp.',
      '.......',
      '.......'
    ],
    [
      '.......',
      '.......',
      '...cpp.',
      'c.cpppp',
      '...cpp.',
      '.......',
      '.......'
    ]
  ];
  var tirBase = [], tirMemo = [{}, {}];
  function genTir(k, f) {
    if (!tirBase[f]) { tirBase[f] = fromMap(TIR[f]); tirBase[f].cx = 3; tirBase[f].cy = 3; }
    return dir16(tirBase[f], k, tirMemo[f]);
  }

  /* le chevron de visée (cap visé différent du cap réel) : un « > » de cinq pixels, pointe pâle */
  var chevBase = null, chevMemo = {};
  function genChevron(k) {
    if (!chevBase) { chevBase = fromMap(['.......', '..c....', '...c...', '....p..', '...c...', '..c....', '.......']); chevBase.cx = 3; chevBase.cy = 3; }
    return dir16(chevBase, k, chevMemo);
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* LES ENNEMIS — magenta, sang, rose pâle ; contour nuit profonde ; jamais de cyan                  */
  /* ---------------------------------------------------------------------------------------------- */
  /* Ombrage d'une carte de MATIÈRES après rotation : la lumière reste en haut à gauche quelle que soit
     l'orientation. m = coque (arête haute rose pâle, basse et droite sang, cœur magenta), r = lumière (reste rose pâle),
     o = cavité (reste nuit profonde), s = coque déjà dans l'ombre (reste sang). */
  function shadeHull(s) {
    var w = s.w, h = s.h, d = s.data, o = spr(w, h);
    o.cx = s.cx; o.cy = s.cy;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = y * w + x, v = d[i];
      if (v !== MAG) { o.data[i] = v; continue; }
      var up = y > 0 ? d[i - w] : 0, dn = y < h - 1 ? d[i + w] : 0, rt = x < w - 1 ? d[i + 1] : 0;
      /* arête haute éclairée ; arêtes basse et droite dans l'ombre ; le reste magenta, qui doit dominer
         (V-09 : c'est la seule couleur de menace à 3:1 de tous les fonds) */
      o.data[i] = !up ? ROSE : (!dn || !rt) ? SANG : MAG;
    }
    return o;
  }

  /* la flèche, dessinée pointe en haut comme sur la planche : triangle, visière lumineuse, trois
     pattes ; deux images (les pattes trottinent) */
  var FLECHE = [
    [
      '.............',
      '......m......',
      '.....mmm.....',
      '.....mmm.....',
      '....mmmmm....',
      '....mmmmm....',
      '...mrrrrrm...',
      '...mmmmmmm...',
      '..mmmmmmmmm..',
      '..mmmomommm..',
      '..mmoomoomm..',
      '..m...m...m..',
      '.............'
    ],
    [
      '.............',
      '......m......',
      '.....mmm.....',
      '.....mmm.....',
      '....mmmmm....',
      '....mmmmm....',
      '...mrrrrrm...',
      '...mmmmmmm...',
      '..mmmmmmmmm..',
      '..mmmomommm..',
      '..mmoomoomm..',
      '...m..m..m...',
      '.............'
    ]
  ];
  var flecheE = [], flecheMemo = [{}, {}];
  function genFleche(k, f) {
    if (!flecheE[f]) { var up = fromMap(FLECHE[f]); up.cx = 6; up.cy = 6; flecheE[f] = rot90(up); }
    return contour(shadeHull(dir16(flecheE[f], k, flecheMemo[f])), NP, true);
  }

  /* la tourelle : bloc blindé à deux oreilles, canon central dans une cavité sombre, deux pattes.
     Vue de face comme sur la planche : le canon regarde la joueuse « hors de l'écran ». */
  var TOUR = [
    '.rrr.....rrr.',
    'rmmmr...rmmms',
    'rmmmmrrrmmmms',
    'rmmmmmmmmmmms',
    'rmmooooooomms',
    'rmmoorrrsomms',
    'rmmormmmsomms',
    'rmmormomsomms',
    'rmmoosssoomms',
    'rmmmooooommms',
    '.smmmmmmmmms.',
    '.rmms...rmms.',
    '.sss.....sss.'
  ];
  function genTourelle(variant, f) {
    var rows = TOUR.slice();
    if (f & 1) { rows[11] = '..rmms.rmms..'; rows[12] = '..sss...sss..'; }
    if (variant === 'charge') {
      /* télégraphe : la bouche du canon s'allume, puis tout le fût */
      rows[7] = 'rmmormrmsomms';
      if (f & 1) { rows[5] = 'rmmorrrrromms'; rows[6] = 'rmmorrrrromms'; rows[7] = 'rmmorrrrromms'; rows[8] = 'rmmoorrrsomms'; }
    }
    return contour(fromMap(rows), NP, true);
  }

  /* la sentinelle : losange, œil central dans une étoile sombre à quatre branches ; la pupille
     balaie de gauche à droite (quatre images), comme un veilleur */
  var SENT = [
    '......r......',
    '.....rmm.....',
    '....rmmmm....',
    '...rmmommm...',
    '..rmmmommmm..',
    '.rmmmorommmm.',
    'rmmoorxroomms',
    '.mmmmorommms.',
    '..mmmmommms..',
    '...mmmomss...',
    '....mmmss....',
    '.....mss.....',
    '......s......'
  ];
  function genSentinelle(f) {
    var rows = SENT.slice(), px = [6, 5, 6, 7][f & 3];
    /* x = la pupille ; l'anneau de l'œil est rose pâle, la pupille nuit profonde */
    var r6 = rows[6].split('');
    r6[5] = 'r'; r6[6] = 'r'; r6[7] = 'r';
    r6[px] = 'o';
    rows[6] = r6.join('');
    return contour(fromMap(rows), NP, true);
  }

  /* la mine : sphère à piques, cœur lumineux dans une coque sombre ; les piques tournent d'un
     huitième de tour d'une image à l'autre ; 'mine:alerte' fait clignoter le cœur en grand */
  var MINE = [
    [
      '.....r.....',
      '.r..rms..s.',
      '..rmmmmms..',
      '..mrmmmms..',
      '.rmmooomms.',
      'rmmmorommss',
      '.smmooomss.',
      '..smmmmss..',
      '..sssssss..',
      '.s..sss..s.',
      '.....s.....'
    ],
    [
      '...........',
      '...r.r.s...',
      '..rmmmmms..',
      '.rmrmmmmss.',
      '..mmooomm..',
      '.rmmorommss',
      '..mmooomm..',
      '.smmmmmsss.',
      '..sssssss..',
      '...s.s.s...',
      '...........'
    ]
  ];
  function genMine(variant, f) {
    var rows = MINE[f & 1].slice();
    if (variant === 'alerte' && !(f & 1)) {
      rows = MINE[0].slice();
      rows[4] = rows[4].slice(0, 4) + 'rrr' + rows[4].slice(7);
      rows[5] = rows[5].slice(0, 4) + 'rrr' + rows[5].slice(7);
      rows[6] = rows[6].slice(0, 4) + 'rrr' + rows[6].slice(7);
    } else if (variant === 'alerte') rows = MINE[0].slice();
    return contour(fromMap(rows), NP, true);
  }

  /* LE COLOSSE — d'après le panneau boss : géant mécanique, crête de lames, œil unique, épaulières
     hérissées, bras pendants terminés en griffes. Construit en PLAQUES d'armure : chaque plaque est un
     polygone (moitié gauche, symétrisée), posée dans l'ordre de profondeur ; un joint d'un pixel en nuit
     profonde sépare deux plaques, et chaque plaque est éclairée par le haut (arête haute rose pâle,
     arête basse sang). Puis les détails sont posés à la main : œil, cœur, évents, rivets. */
  var CW = 47, CH = 47;
  var PLAQUES = [
    /* [polygone, base, symétrique ?] — base : 'm' magenta (avant), 's' sang (en retrait) */
    [[[3, 21], [10.5, 21], [10.5, 29], [3, 29]], 's'],                                   /* bras */
    [[[0.5, 28.5], [11.5, 28.5], [12.5, 38.5], [0, 38.5]], 'm'],                           /* avant-bras */
    [[[0, 38], [12.5, 38], [11.5, 41], [10, 45], [8.5, 41], [7, 45], [5.5, 41], [4, 45], [2.5, 41], [1, 45], [0, 41]], 's'], /* griffes */
    [[[15.5, 40.5], [22, 40.5], [21.5, 47], [15, 47]], 's'],                              /* jambes */
    [[[13.5, 34.5], [23.5, 34.5], [23.5, 41], [15.5, 41.5]], 'm'],                         /* hanches */
    [[[14, 27], [23.5, 27], [23.5, 35], [16.5, 35]], 's'],                                 /* ventre */
    [[[11.5, 18.5], [23.5, 18.5], [23.5, 27.5], [14, 27.5], [11, 23]], 'm'],                /* poitrine */
    [[[3.5, 10], [6.5, 0.5], [9.5, 9]], 'm'],                                             /* grande lame d'épaule */
    [[[10, 10], [12.5, 3.5], [15, 10]], 'm'],                                              /* petite lame */
    [[[1, 12.5], [4, 7], [16, 8.5], [17.5, 13], [15.5, 20.5], [3, 21.5], [0.5, 17]], 'm'],  /* épaulière */
    [[[1.5, 15], [17, 13.5], [16.5, 16.5], [2, 18]], 's'],                                 /* bande d'épaulière */
    [[[16.5, 1.5], [19.5, 7], [18, 8], [16, 4]], 'm'],                                     /* lame de crête */
    [[[18.5, 17.5], [28.5, 17.5], [30, 20.5], [17, 20.5]], 's', 1],                        /* col */
    [[[16, 8.5], [19, 9], [19, 14.5], [16.5, 12.5]], 's'],                                 /* ailerons du casque */
    [[[19, 5.5], [28, 5.5], [29.5, 9], [28.5, 16], [26, 18.5], [21, 18.5], [18.5, 16], [17.5, 9]], 'm', 1], /* casque */
    [[[23.5, 0], [25.5, 6.5], [21.5, 6.5]], 'm', 1]                                        /* crête */
  ];
  var colosseBase = null;
  function buildColosse() {
    var id = new Int16Array(CW * CH).fill(-1), base = [], p, x, y, i;
    for (p = 0; p < PLAQUES.length; p++) {
      var poly = PLAQUES[p][0], polys = [poly];
      if (!PLAQUES[p][2]) polys.push(poly.map(function (v) { return [CW - v[0], v[1]]; }));
      for (var q = 0; q < polys.length; q++) {
        var pid = base.length; base.push(PLAQUES[p][1] === 's' ? SANG : MAG);
        var pl = polys[q], bx0 = CW, by0 = CH, bx1 = 0, by1 = 0;
        for (var e = 0; e < pl.length; e++) {
          bx0 = Math.min(bx0, Math.floor(pl[e][0])); bx1 = Math.max(bx1, Math.ceil(pl[e][0]));
          by0 = Math.min(by0, Math.floor(pl[e][1])); by1 = Math.max(by1, Math.ceil(pl[e][1]));
        }
        for (y = Math.max(0, by0); y < Math.min(CH, by1); y++) for (x = Math.max(0, bx0); x < Math.min(CW, bx1); x++)
          if (inPoly(pl, x + 0.5, y + 0.5)) id[y * CW + x] = pid;
      }
    }
    var s = spr(CW, CH), d = s.data;
    for (y = 0; y < CH; y++) for (x = 0; x < CW; x++) {
      i = y * CW + x; var v = id[i];
      if (v < 0) continue;
      var up = y > 0 ? id[i - CW] : -1, dn = y < CH - 1 ? id[i + CW] : -1, rt = x < CW - 1 ? id[i + 1] : -1;
      var lf = x > 0 ? id[i - 1] : -1;
      /* joint : la plaque du dessous (posée plus tôt) cède un pixel à celle du dessus */
      if ((dn >= 0 && dn > v) || (rt >= 0 && rt > v && x < 23) || (lf >= 0 && lf > v && x > 23) || (up >= 0 && up > v)) { d[i] = NP; continue; }
      var b = base[v];
      if (up !== v) d[i] = b === MAG ? ROSE : MAG;
      else if (dn !== v) d[i] = b === MAG ? SANG : NP;
      else d[i] = b;
    }
    /* détails posés à la main */
    function put(x0, y0, c) { if (x0 >= 0 && y0 >= 0 && x0 < CW && y0 < CH && d[y0 * CW + x0]) d[y0 * CW + x0] = c; }
    function sym(x0, y0, c) { put(x0, y0, c); put(CW - 1 - x0, y0, c); }
    /* orbite de l'œil : une fente sombre en travers du casque */
    for (y = 10; y <= 14; y++) for (x = 19 + (y > 12 ? y - 12 : 0); x <= 23; x++) sym(x, y, NP);
    /* arête du masque sous l'œil : une ligne claire, pas une bouche */
    for (x = 22; x <= 23; x++) sym(x, 16, ROSE);
    /* évents des avant-bras */
    for (x = 2; x <= 10; x++) { sym(x, 31, NP); sym(x, 34, NP); }
    /* côtes du ventre */
    for (x = 17; x <= 22; x++) { sym(x, 29, NP); sym(x, 32, NP); }
    /* rivets des épaulières */
    sym(4, 13, ROSE); sym(13, 12, ROSE); sym(6, 18, ROSE);
    /* le cœur de la poitrine : un losange sombre, allumé par image */
    sym(23, 21, NP); sym(22, 22, NP); sym(23, 22, NP); sym(21, 23, NP); sym(22, 23, NP); sym(23, 23, NP); sym(22, 24, NP); sym(23, 24, NP); sym(23, 25, NP);
    return s;
  }
  function genColosse(variant, f) {
    if (!colosseBase) colosseBase = buildColosse();
    var s = spr(CW, CH), w = CW;
    s.data.set(colosseBase.data);
    /* le cœur respire */
    var c1 = f & 1 ? ROSE : MAG, c2 = f & 1 ? MAG : SANG;
    s.data[22 * w + 23] = c1; s.data[23 * w + 22] = c2; s.data[23 * w + 23] = c1; s.data[23 * w + 24] = c2; s.data[24 * w + 23] = c2;
    /* l'œil unique, au centre de la fente */
    var ex = 23, ey = 12, lit = variant === 'oeil';
    var EYE = lit
      ? [[0, 0, OS], [-1, 0, JAUNE], [1, 0, JAUNE], [0, -1, JAUNE], [0, 1, JAUNE], [-2, 0, BRAS], [2, 0, BRAS],
        [-1, -1, BRAS], [1, -1, BRAS], [-1, 1, BRAS], [1, 1, BRAS]]
      : [[0, 0, ROSE], [-1, 0, SANG], [1, 0, SANG], [0, -1, MAG], [0, 1, SANG]];
    for (var i = 0; i < EYE.length; i++) s.data[(ey + EYE[i][1]) * w + ex + EYE[i][0]] = EYE[i][2];
    if (lit) {
      /* le reflet horizontal du panneau : une lame de lumière qui traverse la fente */
      var L = f & 1 ? 4 : 3;
      for (var k = 3; k <= L + 1; k++) { s.data[ey * w + ex - k] = k <= L ? BRAS : SANG; s.data[ey * w + ex + k] = k <= L ? BRAS : SANG; }
    }
    s.cx = 23; s.cy = 23;
    return contour(s, NP, true);
  }

  var TIRE = {
    petit: [['mrm', 'rrr', 'mrm'], ['rmr', 'mrm', 'rmr']],
    moyen: [['.mmm.', 'mrrrm', 'mrrrm', 'mrrrm', '.mmm.'], ['.mrm.', 'mrrrm', 'rrrrr', 'mrrrm', '.mrm.']],
    gros: [['..mmm..', '.mrrrm.', 'mrrrrrm', 'mrrrrrm', 'mrrrrrm', '.mrrrm.', '..mmm..'],
      ['..mrm..', '.mrrrm.', 'mrrrrrm', 'rrrrrrr', 'mrrrrrm', '.mrrrm.', '..mrm..']]
  };
  function genTirEnnemi(variant, f) {
    var rows = (TIRE[variant] || TIRE.moyen)[f & 1];
    return contour(fromMap(rows), NP, true);
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* LE BUTIN — cellule d'énergie, ambre / jaune / os                                                 */
  /* ---------------------------------------------------------------------------------------------- */
  var BUTIN = [
    '..www..',
    '.aaaaa.',
    'ajjjwja',
    'ajjwjja',
    'ajwwwja',
    'ajjwjja',
    'ajwjjja',
    'aajjjaa',
    '.aaaaa.'
  ];
  function genButin(f) {
    var s = fromMap(BUTIN), w = s.w;
    /* un reflet qui balaie la cellule, quatre images */
    var col = [1, 2, 4, 5][f & 3];
    for (var y = 2; y < 8; y++) { var i = y * w + col; if (s.data[i] === JAUNE && ((y + f) & 1)) s.data[i] = OS; }
    return contour(s, NP, true);
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* L'INTERFACE                                                                                      */
  /* ---------------------------------------------------------------------------------------------- */
  var ICO = {
    son: [
      '....w....',
      '...ww..w.',
      '..www...w',
      'wwwww.w.w',
      'wwwww.w.w',
      'wwwww.w.w',
      '..www...w',
      '...ww..w.',
      '....w....'
    ],
    muet: [
      '....w....',
      '...ww....',
      '..www....',
      'wwwww.w.w',
      'wwwww..w.',
      'wwwww.w.w',
      '..www....',
      '...ww....',
      '....w....'
    ],
    pause: [
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.',
      '.ww...ww.'
    ],
    lecture: [
      '.w.......',
      '.ww......',
      '.www.....',
      '.wwww....',
      '.wwwww...',
      '.wwww....',
      '.www.....',
      '.ww......',
      '.w.......'
    ]
  };
  /* vies : une petite tête de la joueuse (ses couleurs : ce sont SES vies), et la case vide */
  ICO.vie = [
    '.ccc...',
    'cpppcc.',
    'cpp.ppc',
    'cpppppc',
    'cpp.ppc',
    'cpppcc.',
    '.ccc...'
  ];
  ICO.vievide = [
    '.ggg...',
    'g...gg.',
    'g.....g',
    'g.....g',
    'g.....g',
    'g...gg.',
    '.ggg...'
  ];
  /* défi réussi, défi raté (G-23) : une coche jaune, une croix magenta, épaisses */
  ICO.ok = [
    '.....jj',
    '....jjj',
    'jj.jjj.',
    'jjjjj..',
    '.jjj...',
    '..j....'
  ];
  ICO.ko = [
    'rr...mm',
    'rmm.mmm',
    '.mmmmm.',
    '..mmm..',
    '.mmmmm.',
    'mmm.mms',
    'ms...ss'
  ];
  function genIcone(nom, variant) {
    var s = fromMap(ICO[nom]);
    var c = ix(variant, OS);
    if (c !== OS && c !== VIDE) s = recolor(s, OS, c);
    return contour(s, NP, true);
  }

  /* repli : un nom inconnu ne casse rien, il se voit */
  function genInconnu() {
    return contour(fromMap(['..g..', '.ggg.', 'gg.gg', '.ggg.', '..g..']), NP, false);
  }


  /* ---------------------------------------------------------------------------------------------- */
  /* LOT G — LE BESTIAIRE DU § 4.4 : dard, larve, traqueur, planeur, lame, ruche, rival, flèche armée     */
  /* Même règles : magenta, sang et rose pâle, contour d'un pixel en nuit profonde, jamais de cyan.       */
  /* ---------------------------------------------------------------------------------------------- */
  function disk(s, cx, cy, r, c) {
    for (var y = -Math.ceil(r); y <= Math.ceil(r); y++) for (var x = -Math.ceil(r); x <= Math.ceil(r); x++) {
      if (x * x + y * y <= r * r + r * 0.6) {
        var px = cx + x, py = cy + y;
        if (px >= 0 && py >= 0 && px < s.w && py < s.h) s.data[py * s.w + px] = c;
      }
    }
  }
  function setpx(s, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.data[y * s.w + x] = c; }
  function ln(s, x0, y0, x1, y1, c) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (var i = 0; i <= n; i++) setpx(s, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
  }
  /* un sprite dirigé, dessiné pointe en haut : les seize directions sortent d'une seule carte (comme la flèche) */
  var dirBase = {}, dirMemo = {};
  function genDir(key, rows, f, k, ombre) {
    var kk = key + f;
    if (!dirBase[kk]) { var up = fromMap(rows); up.cx = (up.w - 1) >> 1; up.cy = (up.h - 1) >> 1; dirBase[kk] = rot90(up); dirMemo[kk] = {}; }
    var s = dir16(dirBase[kk], k, dirMemo[kk]);
    return contour(ombre ? shadeHull(s) : s, NP, true);
  }

  /* LE DARD : le coupeur, un fuseau à deux fourches avant ; 15 × 15 ; 16 directions ; 2 images (les fourches battent) */
  var DARD = [
    [
      '.m.........m.',
      '.mm.......mm.',
      '.mrm.....mrm.',
      '..mmm...mmm..',
      '..smmm.mmms..',
      '...smmmmms...',
      '....mmrmm....',
      '....mmrmm....',
      '....smrms....',
      '.....mrm.....',
      '.....smm.....',
      '......m......',
      '......s......'
    ],
    [
      '..m.......m..',
      '.mm.......mm.',
      '.mmm.....mmm.',
      '..mmm...mmm..',
      '..smmm.mmms..',
      '...smmmmms...',
      '....mmrmm....',
      '....mmrmm....',
      '....smrms....',
      '.....mrm.....',
      '.....smm.....',
      '......m......',
      '......s......'
    ]
  ];
  function genDard(k, f) { return genDir('dard', DARD[f & 1], f & 1, k, true); }

  /* LA LARVE : un éclat à pattes, 9 × 9 ; 2 images (les pattes) */
  var LARVE = [
    ['.m...m.', '..mmm..', '.mmrmm.', 'mmmrmmm', '.mmmmm.', '..sss..', '.s...s.'],
    ['m.....m', '.mmmmm.', '.mmrmm.', 'mmmrmmm', '.mmmmm.', '..sss..', 's.....s']
  ];
  function genLarve(f) { return contour(shadeHull(fromMap(LARVE[f & 1])), NP, true); }

  /* LE TRAQUEUR : un disque à œil fendu, 15 × 15, dans un halo de pointillés qui tourne (4 images) ; jamais confondu avec le RIVAL */
  function genTraqueur(f) {
    var s = spr(13, 13), i, c = 6;
    disk(s, c, c, 3.2, SANG);
    disk(s, c, c, 2.4, MAG);
    for (i = -1; i <= 1; i++) setpx(s, c, c + i, i === 0 ? NP : ROSE);                  /* la fente de l'œil, verticale */
    setpx(s, c - 1, c - 2, ROSE); setpx(s, c + 1, c - 2, ROSE);
    for (i = 0; i < 8; i++) {                                                          /* le halo : huit points, un sur deux allumé, qui tournent */
      var a = (i + (f & 3) * 0.25) * Math.PI / 4;
      setpx(s, c + Math.cos(a) * 6, c + Math.sin(a) * 6, (i & 1) ? ROSE : MAG);
    }
    s.cx = c; s.cy = c;
    return contour(s, NP, true);
  }

  /* LE PLANEUR : la cible bonus du DÉFILÉ, une aile en chevron ouvert, rose pâle et sang ; 9 × 9 ; 2 images (battement) */
  var PLANEUR = [
    ['r.....r', 'rr...rr', '.rr.rr.', '..rwr..', '..rsr..', '...s...', '.......'],
    ['.......', 'r.....r', 'rr...rr', '.rrwrr.', '..rsr..', '...s...', '.......']
  ];
  function genPlaneur(f) { return contour(fromMap(PLANEUR[f & 1]), NP, true); }

  /* LA LAME : le trancheur. Au repos 15 × 15 (corps rond, quatre pointes) ; ':deployee' 21 × 21 (quatre lames qui tournent) ; 2 images */
  function genLame(variant, f) {
    var dep = variant === 'deployee', n = dep ? 19 : 13, c = (n - 1) / 2, s = spr(n, n), i, a, L = dep ? 9 : 6;
    var d = (f & 1) ? Math.PI / 4 : Math.PI / 4 + 0.0;       /* au repos : un X de lames repliées ; déployée : huit lames qui tournent */
    var nb = dep ? 8 : 4;
    for (i = 0; i < nb; i++) {
      a = (dep && (f & 1) ? Math.PI / 8 : 0) + d * (dep ? 0 : 1) + i * (dep ? Math.PI / 4 : Math.PI / 2);
      var l = dep ? (i & 1 ? L - 2 : L) : L;
      ln(s, c + Math.cos(a) * 2, c + Math.sin(a) * 2, c + Math.cos(a) * l, c + Math.sin(a) * l, ROSE);
      ln(s, c + Math.cos(a + 0.3) * 2, c + Math.sin(a + 0.3) * 2, c + Math.cos(a) * l, c + Math.sin(a) * l, MAG);
      if (dep) ln(s, c + Math.cos(a - 0.3) * 2, c + Math.sin(a - 0.3) * 2, c + Math.cos(a) * l, c + Math.sin(a) * l, SANG);
    }
    disk(s, c, c, 2.4, SANG); disk(s, c, c, 1.6, MAG);
    setpx(s, c, c, dep ? OS : ROSE);
    s.cx = c; s.cy = c;
    return contour(s, NP, true);
  }

  /* LA RUCHE : la source, 23 × 23 ; trois états de pétales (':p0' fermée, ':p1' à moitié ouverte, ':p2' ouverte) ; 2 images (le cœur blanchit) */
  function genRuche(variant, f) {
    var st = variant === 'p2' ? 2 : (variant === 'p1' ? 1 : 0), n = 21, c = 10, s = spr(n, n), i, a;
    var R = [6.5, 8, 9][st], pr = [3.4, 3.1, 2.8][st];
    disk(s, c, c, 6.5, SANG);
    for (i = 0; i < 8; i++) {
      a = i * Math.PI / 4 + Math.PI / 8;
      var px = c + Math.cos(a) * R, py = c + Math.sin(a) * R;
      disk(s, Math.round(px), Math.round(py), pr, SANG);
      disk(s, Math.round(px), Math.round(py), pr - 1, MAG);
      setpx(s, px - 0.5, py - 1, ROSE);
    }
    disk(s, c, c, 4.4, MAG);
    disk(s, c, c, 3.2, NP);
    disk(s, c, c, 2.2, (f & 1) ? OS : ROSE);
    setpx(s, c, c, (f & 1) ? OS : SANG);
    if (st >= 1) for (i = 0; i < 4; i++) { a = i * Math.PI / 2 + Math.PI / 4; setpx(s, c + Math.cos(a) * 5.4, c + Math.sin(a) * 5.4, ROSE); }
    s.cx = c; s.cy = c;
    return contour(s, NP, true);
  }

  /* LE RIVAL : l'autre serpent. Tête de 11 × 11 à mâchoires (16 directions, 2 images : les mâchoires battent) ; perles de 7 × 7 en sang à cœur magenta */
  var RIVALTETE = [
    ['..ssss...', '.smmmmm..', 'smmrrmmm.', 'smmormmmm', 'smmmmmm.s', 'smmormmmm', 'smmrrmmm.', '.smmmmm..', '..ssss...'],
    ['..ssss...', '.smmmmm..', 'smmrrmmmm', 'smmormmm.', 'smmmmmm.s', 'smmormmm.', 'smmrrmmmm', '.smmmmm..', '..ssss...']
  ];
  var rivBase = [], rivMemo = [{}, {}];
  function genRivalTete(k, f) {
    f &= 1;
    if (!rivBase[f]) { rivBase[f] = fromMap(RIVALTETE[f]); rivBase[f].cx = 4; rivBase[f].cy = 4; }
    return contour(dir16(rivBase[f], k, rivMemo[f]), NP, true);
  }
  function genPerle(f) { return contour(fromMap(['.sss.', 'ssmss', 'smmms', 'ssmss', '.sss.']), NP, true); }

  /* LA FLÈCHE ARMÉE : elle gonfle d'un pixel et son cœur passe de sang à rose pâle (§ 4.4) ; 16 directions */
  var FLECHE_ARMEE = [
    '......m......', '.....mmm.....', '....mmmmm....', '....mmmmm....', '...mmmmmmm...', '..mmrrrrrmm..', '..mrrrrrrrm..',
    '..mmmrrrmmm..', '.mmmmmmmmmmm.', '.mmmmomommmm.', '.mmmoommoomm.', '.mm..mm.mm.m.', '.............'
  ];
  var flecheA = null, flecheAMemo = {};
  function genFlecheArmee(k) {
    if (!flecheA) { var up = fromMap(FLECHE_ARMEE); up.cx = 6; up.cy = 6; flecheA = rot90(up); }
    return contour(shadeHull(dir16(flecheA, k, flecheAMemo)), NP, true);
  }
  /* LA FLÈCHE ÉLITE : 19 × 19, couronne de pointes (§ 4.5) : la flèche, agrandie, avec trois piques d'os sur le dos */
  function genFlecheElite(k, f) {
    var base = genFleche(k, f), o = spr(base.w + 4, base.h + 4), x, y;
    for (y = 0; y < base.h; y++) for (x = 0; x < base.w; x++) o.data[(y + 2) * o.w + x + 2] = base.data[y * base.w + x];
    o.cx = base.cx + 2; o.cy = base.cy + 2;
    var c = o.w >> 1;
    setpx(o, c, 0, ROSE); setpx(o, c - 5, 1, ROSE); setpx(o, c + 5, 1, ROSE); setpx(o, c, 1, SANG);
    return contour(o, NP, true);
  }

  /* LA PASTILLE : rayons jaunes autour d'un disque ambre (11 × 11, 4 images : les rayons passent des axes aux diagonales) ; NOYAU : butin de grappe, 11 × 11 */
  function genPastille(f) {
    var s = spr(9, 9), c = 4, i, a;
    disk(s, c, c, 2.6, AMBRE); disk(s, c, c, 1.6, JAUNE); setpx(s, c, c, OS); setpx(s, c - 1, c - 1, OS);
    for (i = 0; i < 4; i++) {
      a = i * Math.PI / 2 + ((f & 1) ? Math.PI / 4 : 0);
      var r = (f & 2) ? 4 : 3.4;
      ln(s, c + Math.cos(a) * 3.2, c + Math.sin(a) * 3.2, c + Math.cos(a) * r, c + Math.sin(a) * r, JAUNE);
    }
    s.cx = c; s.cy = c;
    return contour(s, NP, true);
  }
  function genNoyau(f) {
    var s = spr(9, 9), c = 4;
    disk(s, c, c, 3.7, AMBRE); disk(s, c, c, 2.6, JAUNE); disk(s, c, c, 1.2, OS);
    setpx(s, c, 0, JAUNE); setpx(s, c, 8, JAUNE); setpx(s, 0, c, JAUNE); setpx(s, 8, c, JAUNE);
    if (f & 1) { setpx(s, 2, 2, OS); setpx(s, 6, 6, OS); }
    s.cx = c; s.cy = c;
    return contour(s, NP, true);
  }

  /* LES MINI-SILHOUETTES de 5 × 5 (radar, codex), une par type ; et les PASTILLES DE VIE de 5 × 5 */
  var MINI = {
    fleche: ['..m..', '.mmm.', '.mrm.', 'mmmmm', 'm...m'], dard: ['m...m', 'mm.mm', '.mrm.', '..m..', '..s..'], larve: ['.m.m.', 'mmmmm', '.mrm.', 'mmmmm', 'm...m'],
    mine: ['m.m.m', '.mmm.', 'mmrmm', '.mmm.', 'm.m.m'], tourelle: ['mmmmm', 'mrrrm', 'mmrmm', 'mmmmm', 'm...m'], lame: ['r.m.r', '.mmm.', 'mmrmm', '.mmm.', 'r.m.r'],
    ruche: ['.mmm.', 'mmrmm', 'mrwrm', 'mmrmm', '.mmm.'], sentinelle: ['..m..', '.mrm.', 'mrorm', '.mrm.', '..m..'], rival: ['mm...', 'mrm..', '.mmm.', '..mmm', '...ms'],
    planeur: ['r...r', '.r.r.', '..r..', '..r..', '.....'], traqueur: ['.rrr.', 'rmomr', 'rmomr', 'rmmmr', '.rrr.']
  };
  function genMini(t) { var s = fromMap(MINI[t] || MINI.fleche); s.cx = 2; s.cy = 2; return s; }
  function genVie5(plein) {
    return fromMap(plein ? ['.rrr.', 'rwwwr', 'rwwwr', 'rwwwr', '.rrr.'] : ['.ggg.', 'g...g', 'g...g', 'g...g', '.ggg.']);
  }
  /* le chevron de bord d'écran pour les portails et les ennemis hors champ (16 directions) : magenta, pointe rose pâle */
  var chevP = null, chevPMemo = {};
  function genChevronP(k) {
    if (!chevP) { chevP = fromMap(['.......', '..m....', '...m...', '....r..', '...m...', '..m....', '.......']); chevP.cx = 3; chevP.cy = 3; }
    return contour(dir16(chevP, k, chevPMemo), NP, true);
  }

  /* LES MONTURES D'ARMES SUR LE CORPS (cyan : ce sont les siennes) : tourelle de queue, drone, missile (16 directions), mine de queue, orbe */
  function genTourelleJ(f) {
    var s = fromMap(['.ppp.', 'pcccp', 'pcwcp', 'pcccp', '.ppp.']);
    if (f & 1) { s.data[2 * 5 + 2] = OS; } else s.data[2 * 5 + 2] = CYP;
    s.cx = 2; s.cy = 2;
    return s;
  }
  function genDrone(f) {
    var s = fromMap((f & 1) ? ['c.p.c', '.ppp.', 'cpwpc', '.ppp.', 'c.p.c'] : ['.cpc.', 'cpppc', 'pcwcp', 'cpppc', '.cpc.']);
    s.cx = 2; s.cy = 2;
    return s;
  }
  var missBase = null, missMemo = {};
  function genMissile(k) {
    if (!missBase) { missBase = fromMap(['.......', '.ccp...', 'cppwpp.', '.ccp...', '.......']); missBase.cx = 3; missBase.cy = 2; }
    return dir16(missBase, k, missMemo);
  }
  function genMineJ(f) {
    var s = fromMap((f & 1) ? ['..p..', '.ccc.', 'pcwcp', '.ccc.', '..p..'] : ['p.p.p', '.ccc.', 'pcwcp', '.ccc.', 'p.p.p']);
    s.cx = 2; s.cy = 2;
    return s;
  }
  function genOrbe(f) {
    var s = fromMap(['..ccc..', '.cpppc.', 'cppwppc', 'cpwwwpc', 'cppwppc', '.cpppc.', '..ccc..']);
    if (f & 1) { s.data[1 * 7 + 3] = OS; s.data[5 * 7 + 3] = OS; }
    s.cx = 3; s.cy = 3;
    return s;
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* LE CYCLOPE EN GRAND (§ 4.8) : des PIÈCES à assembler (tronc et tête 40 × 32, mains 24 × 24, plaques 12 × 12), plus ses silhouettes */
  /* ---------------------------------------------------------------------------------------------- */
  /* le tronc et la tête : un cube blindé, l'œil unique dans une fente ; ':oeil' l'allume ; ':enrage' passe l'œil au brasier */
  function genCyclopeTronc(variant, f) {
    var w = 40, h = 32, s = spr(w, h), x, y, ex = 20, ey = 13;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var inTete = y < 20 && x >= 5 && x < 35 && (y > 1 || (x > 8 && x < 32));
      var inTronc = y >= 18 && x >= 2 && x < 38 && (y < 30 || (x > 6 && x < 34));
      if (!(inTete || inTronc)) continue;
      var c = MAG;
      if (inTete ? (y === 1 || y === 2 || x === 5 || x === 6) : (y === 18 || y === 19 || x === 2 || x === 3)) c = ROSE;
      else if (inTete ? (y >= 19 || x >= 33) : (y >= 28 || x >= 36)) c = SANG;
      s.data[y * w + x] = c;
    }
    for (x = 8; x < 32; x++) { s.data[3 * w + x] = SANG; s.data[17 * w + x] = SANG; }            /* joints du casque */
    for (x = 11; x < 30; x += 6) { setpx(s, x + 1, 0, ROSE); setpx(s, x, 0, MAG); setpx(s, x + 1, 1, MAG); }   /* la crête */
    for (x = 8; x < 32; x++) s.data[18 * w + x] = SANG;
    for (y = 22; y < 29; y += 3) for (x = 8; x < 32; x += 6) { s.data[y * w + x] = SANG; s.data[y * w + x + 1] = SANG; }    /* évents */
    for (y = 8; y <= 17; y++) for (x = 10; x <= 29; x++) s.data[y * w + x] = NP;                  /* la fente de l'œil */
    var lit = variant === 'oeil' || variant === 'enrage', hot = variant === 'enrage';
    disk(s, ex, ey, 3.6, lit ? (hot ? BRAS : JAUNE) : SANG);
    disk(s, ex, ey, 2.4, lit ? (hot ? JAUNE : OS) : ROSE);
    setpx(s, ex, ey, lit ? OS : NP);
    if (lit) { for (x = 11; x <= 28; x++) if (Math.abs(x - ex) > 4 && ((x + (f & 1)) & 1)) setpx(s, x, ey, hot ? BRAS : JAUNE); }
    s.cx = 20; s.cy = 16;
    return contour(s, NP, true);
  }
  /* une main : poing à trois doigts griffus, 24 × 24 ; 2 images (les griffes battent) ; ':ouverte' les allonge (charge en ciseaux) */
  function rct(s, x0, y0, w, h, c) { for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) setpx(s, x0 + x, y0 + y, c); }
  function genCyclopeMain(variant, f) {
    var s = spr(24, 24), i, ouv = (f & 1) || variant === 'ouverte';
    rct(s, 8, 0, 8, 4, SANG); rct(s, 9, 0, 6, 3, MAG);                                  /* le poignet */
    rct(s, 4, 3, 16, 10, MAG); rct(s, 4, 3, 16, 1, ROSE); rct(s, 4, 12, 16, 1, SANG); rct(s, 19, 3, 1, 10, SANG);   /* la paume, éclairée par le haut */
    rct(s, 6, 6, 2, 2, SANG); rct(s, 16, 6, 2, 2, SANG);                               /* rivets */
    for (i = 0; i < 3; i++) {
      var x0 = 5 + i * 5, len = ouv ? 10 : 7;
      rct(s, x0, 13, 4, len, MAG); rct(s, x0, 13, 1, len, ROSE); rct(s, x0 + 3, 13, 1, len, SANG);
      setpx(s, x0 + 1, 13 + len, ROSE); setpx(s, x0 + 2, 13 + len, ROSE); setpx(s, x0 + 1, 14 + len, SANG);   /* la griffe */
    }
    s.cx = 12; s.cy = 12;
    return contour(s, NP, true);
  }
  /* une plaque d'armure, 12 × 12 : tombe au sol à la phase 2 ; ':sol' la montre éteinte, en sang et ardoise */
  function genCyclopePlaque(variant) {
    var s = spr(12, 12), x, y, sol = variant === 'sol';
    for (y = 0; y < 12; y++) for (x = 0; x < 12; x++) {
      if (x + y < 2 || x + y > 20 || (x > 9 && y < 2)) continue;
      var c = sol ? 2 : MAG;
      if (!sol) { if (y < 2 || x < 2) c = ROSE; else if (y > 9 || x > 9) c = SANG; }
      else if (y > 9 || x > 9) c = 4;
      s.data[y * 12 + x] = c;
    }
    setpx(s, 5, 5, sol ? 4 : SANG); setpx(s, 6, 6, sol ? 4 : SANG);
    return contour(s, NP, true);
  }
  /* les silhouettes de décor (§ 4.8) : la forme du colosse de la planche, en deux tons (lumière à gauche et en haut, ombre à droite et en bas), à la taille voulue */
  function silhColosse(w, h, claire, sombre, oeil) {
    var b = genColosse('', 0), s = spr(w, h), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var sx = Math.floor(x * b.w / w), sy = Math.floor(y * b.h / h);
      if (b.data[sy * b.w + sx]) s.data[y * w + x] = (x > w * 0.72 || y > h * 0.88) ? sombre : claire;
    }
    if (oeil) setpx(s, Math.round(24 * w / b.w), Math.round(13 * h / b.h), oeil);
    s.cx = w >> 1; s.cy = h >> 1;
    return s;
  }
  /* le CYCLOPE ASSEMBLÉ, 98 × 128 : le colosse de la planche agrandi ×2 (épaulières hérissées, œil unique) posé sur deux jambes à genoux articulés ;
     la mise en scène l'emploie tel quel, le colosse réel pose ses pièces (tronc, mains, plaques) à part. ':oeil' allume l'œil. */
  function genCyclope(variant, f) {
    var W = 98, H = 128, top = upscale(genColosse(variant, f), 2), legs = spr(W, 42), s = spr(W, H), x, y, p, X, Y;
    for (p = 0; p < 2; p++) {
      var x0 = p ? 58 : 24;
      for (y = 2; y < 36; y++) for (x = 0; x < 16; x++) {
        var c = MAG;
        if (x < 2) c = ROSE; else if (x >= 14) c = SANG;
        if (y % 9 === 0) c = SANG;
        if (y % 9 === 1 && x > 2 && x < 13) c = ROSE;
        setpx(legs, x0 + x, y, c);
      }
      for (y = 34; y < 40; y++) for (x = -3; x < 19; x++) setpx(legs, x0 + x, y, y === 39 ? SANG : (y === 34 ? ROSE : MAG));
    }
    var lc = contour(legs, NP, true);
    for (y = 0; y < lc.h; y++) for (x = 0; x < lc.w; x++) { var v = lc.data[y * lc.w + x]; Y = 86 + y - 1; X = x - 1; if (v && X >= 0 && Y < H && X < W) s.data[Y * W + X] = v; }
    for (y = 0; y < top.h; y++) for (x = 0; x < top.w; x++) { var t = top.data[y * top.w + x]; if (t && x < W) s.data[y * W + x] = t; }
    s.cx = 49; s.cy = 64;
    return s;
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* registre                                                                                         */
  /* ---------------------------------------------------------------------------------------------- */
  function dirOf(v, def) {
    var t = String(v === undefined || v === null ? '' : v), q = t.lastIndexOf('/');
    if (q >= 0) t = t.slice(q + 1);
    var n = parseInt(t, 10);
    if (isNaN(n)) return def;
    return ((n % 16) + 16) % 16;
  }
  var REG = {
    tete: { fr: 3, gen: function (v, f) { return genTete(dirOf(v, 0), f); } },
    corps: { fr: 3, gen: function (v, f) { var d = parseInt(v, 10); if (!(d === 3 || d === 5 || d === 7 || d === 9)) d = 9; return genCorps(d, f); } },
    queue: { fr: 3, gen: function (v, f) { return genCorps(3, f); } },
    tir: { fr: 2, gen: function (v, f) { return genTir(dirOf(v, 0), f); } },
    chevron: { fr: 1, gen: function (v) { return genChevron(dirOf(v, 0)); } },
    fleche: { fr: 2, gen: function (v, f) { var p = String(v).split('/')[0]; return p === 'armee' ? genFlecheArmee(dirOf(v, 0)) : (p === 'elite' ? genFlecheElite(dirOf(v, 0), f) : genFleche(dirOf(v, 0), f)); } },
    dard: { fr: 2, gen: function (v, f) { return genDard(dirOf(v, 0), f); } },
    larve: { fr: 2, gen: function (v, f) { return genLarve(f); } },
    traqueur: { fr: 4, gen: function (v, f) { return genTraqueur(f); } },
    planeur: { fr: 2, gen: function (v, f) { return genPlaneur(f); } },
    lame: { fr: 2, gen: function (v, f) { return genLame(v, f); } },
    ruche: { fr: 2, gen: function (v, f) { return genRuche(v, f); } },
    rival: { fr: 2, gen: function (v, f) { return genRivalTete(dirOf(v, 0), f); } },
    perle: { fr: 1, gen: function (v, f) { return genPerle(f); } },
    pastille: { fr: 4, gen: function (v, f) { return genPastille(f); } },
    noyau: { fr: 2, gen: function (v, f) { return genNoyau(f); } },
    mini: { fr: 1, gen: function (v) { return genMini(v); } },
    vie5: { fr: 1, gen: function () { return genVie5(true); } },
    vie5vide: { fr: 1, gen: function () { return genVie5(false); } },
    chevronp: { fr: 1, gen: function (v) { return genChevronP(dirOf(v, 0)); } },
    tourellej: { fr: 2, gen: function (v, f) { return genTourelleJ(f); } },
    drone: { fr: 2, gen: function (v, f) { return genDrone(f); } },
    missile: { fr: 1, gen: function (v) { return genMissile(dirOf(v, 0)); } },
    minej: { fr: 2, gen: function (v, f) { return genMineJ(f); } },
    orbe: { fr: 2, gen: function (v, f) { return genOrbe(f); } },
    cyclope: { fr: 2, gen: function (v, f) { return genCyclope(v, f); } },
    colosseloin: { fr: 1, gen: function () { return silhColosse(48, 48, SANG, 4, ROSE); } },
    colossemi: { fr: 1, gen: function () { return silhColosse(80, 80, SANG, 1, MAG); } },
    tourelle: { fr: 2, gen: function (v, f) { return genTourelle(v, f); } },
    sentinelle: { fr: 4, gen: function (v, f) { return genSentinelle(f); } },
    mine: { fr: 2, gen: function (v, f) { return genMine(v, f); } },
    colosse: { fr: 2, gen: function (v, f) {
      if (v === 'tronc') return genCyclopeTronc('', f);
      if (v === 'troncoeil') return genCyclopeTronc('oeil', f);
      if (v === 'troncenrage') return genCyclopeTronc('enrage', f);
      if (v === 'main' || v === 'mainouverte') return genCyclopeMain(v === 'mainouverte' ? 'ouverte' : '', f);
      if (v === 'plaque' || v === 'plaquesol') return genCyclopePlaque(v === 'plaquesol' ? 'sol' : '');
      if (v === 'carcasse') return silhColosse(98, 98, 2, 1, 0);
      return genColosse(v, f);
    } },
    tirennemi: { fr: 2, gen: function (v, f) { return genTirEnnemi(v, f); } },
    butin: { fr: 4, gen: function (v, f) { return genButin(f); } },
    son: { fr: 1, gen: function (v) { return genIcone('son', v); } },
    muet: { fr: 1, gen: function (v) { return genIcone('muet', v); } },
    pause: { fr: 1, gen: function (v) { return genIcone('pause', v); } },
    lecture: { fr: 1, gen: function (v) { return genIcone('lecture', v); } },
    vie: { fr: 1, gen: function () { return genIcone('vie'); } },
    vievide: { fr: 1, gen: function () { return genIcone('vievide'); } },
    ok: { fr: 1, gen: function () { return genIcone('ok'); } },
    ko: { fr: 1, gen: function () { return genIcone('ko'); } }
  };
  /* les noms que d'autres modules emploient déjà, et les synonymes évidents */
  var ALIASN = { seg: 'corps', segment: 'corps', cellule: 'butin', energie: 'butin', balle: 'tirennemi',
    projectile: 'tirennemi', boss: 'colosse', joueuse: 'tete', coche: 'ok', croix: 'ko', reprendre: 'lecture',
    sonactif: 'son', soncoupe: 'muet', vievide: 'vievide' };
  /* la liste exacte, avec les variantes, pour les outils et le jury */
  var LISTE = ['tete', 'tete:0..15', 'corps', 'corps:9', 'corps:7', 'corps:5', 'corps:3', 'queue', 'tir', 'tir:0..15',
    'chevron', 'chevron:0..15', 'fleche', 'fleche:0..15', 'tourelle', 'tourelle:charge', 'sentinelle', 'mine', 'mine:alerte',
    'colosse', 'colosse:oeil', 'tirEnnemi', 'tirEnnemi:petit', 'tirEnnemi:gros', 'butin', 'son', 'muet', 'pause', 'lecture',
    'vie', 'vieVide', 'ok', 'ko',
    'fleche:armee/0..15', 'fleche:elite/0..15', 'dard', 'dard:0..15', 'larve', 'traqueur', 'planeur', 'lame', 'lame:deployee', 'ruche:p0', 'ruche:p1', 'ruche:p2',
    'rival', 'rival:0..15', 'perle', 'pastille', 'noyau', 'mini:<type>', 'vie5', 'vie5vide', 'chevronP', 'chevronP:0..15', 'tourelleJ', 'drone', 'missile:0..15', 'mineJ', 'orbe',
    'cyclope', 'colosse:tronc', 'colosse:troncoeil', 'colosse:troncenrage', 'colosse:main', 'colosse:mainouverte', 'colosse:plaque', 'colosse:plaquesol', 'colosse:carcasse', 'colosseLoin', 'colosseMi'];

  function norm(s) {
    s = String(s === undefined || s === null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/\s+/g, '');
  }

  /* Le nom est analysé UNE fois (normalisation, synonymes, variante, agrandissement) ; ensuite chaque
     appel ne fait qu'une recherche par nom et un accès par index d'image : le cache reste borné quelle
     que soit la graine passée (un compteur qui croît sans fin ne le fait pas gonfler). */
  var parsed = new Map(), unknown = {};
  function parse(nom) {
    var n = norm(nom), k = 1, star = n.indexOf('*');
    if (star >= 0) { k = parseInt(n.slice(star + 1), 10) || 1; if (k < 1) k = 1; if (k > 4) k = 4; n = n.slice(0, star); }
    var colon = n.indexOf(':'), base = colon >= 0 ? n.slice(0, colon) : n, variant = colon >= 0 ? n.slice(colon + 1) : '';
    if (ALIASN[base]) base = ALIASN[base];
    var R = REG[base];
    if (!R) unknown[nom] = (unknown[nom] || 0) + 1;
    return { R: R, variant: variant, k: k, fr: R ? R.fr : 1, img: [] };
  }
  function make(nom, graine) {
    var P = parsed.get(nom);
    if (!P) { P = parse(nom); if (parsed.size > 2000) parsed.clear(); parsed.set(nom, P); }
    var g = +graine;
    g = isFinite(g) ? Math.floor(g) : 0;
    var f = ((g % P.fr) + P.fr) % P.fr;
    var s = P.img[f];
    if (!s) {
      s = P.R ? P.R.gen(P.variant, f) : genInconnu();
      if (P.k > 1) s = upscale(s, P.k);
      P.img[f] = s;
    }
    return s;
  }

  /* PRÉCHAUFFAGE. Tout construire coûte une quarantaine de millisecondes sur un ordinateur : trop pour
     une seule image, rien du tout réparti. warm(n) construit au plus n sprites encore absents et rend
     le nombre qui reste ; le module s'appelle lui-même par petites tranches (setTimeout, sans lire
     l'horloge) dès son chargement, si bien que tout est prêt pendant l'ouverture et qu'aucune
     construction ne tombe en pleine partie. Un appel explicite reste possible, il ne fait que hâter. */
  var warmList = null, warmAt = 0;
  function warm(n) {
    if (!warmList) {
      warmList = [];
      var dirs = ['tete', 'fleche', 'tir', 'chevron'], plain = ['corps', 'corps:7', 'corps:5', 'corps:3', 'tourelle',
        'tourelle:charge', 'sentinelle', 'mine', 'mine:alerte', 'tirEnnemi', 'tirEnnemi:petit', 'tirEnnemi:gros', 'butin',
        'son', 'muet', 'pause', 'lecture', 'vie', 'vieVide', 'ok', 'ko', 'colosse', 'colosse:oeil'], i, k, fr;
      /* d'abord ce qui est à l'écran dès la première seconde de jeu, le colosse en dernier */
      for (i = 0; i < dirs.length; i++) for (fr = 0; fr < frames(dirs[i]); fr++) for (k = 0; k < 16; k++) warmList.push([dirs[i] + ':' + k, fr]);
      for (i = 0; i < plain.length; i++) for (fr = 0; fr < frames(plain[i]); fr++) warmList.push([plain[i], fr]);
    }
    n = n === undefined ? 1e9 : n;
    while (n-- > 0 && warmAt < warmList.length) { var it = warmList[warmAt++]; make(it[0], it[1]); }
    return warmList.length - warmAt;
  }
  function warmStep() { if (warm(2) > 0) setTimeout(warmStep, 16); }
  if (typeof setTimeout === 'function') setTimeout(warmStep, 100);

  function frames(nom) { var n = norm(nom), c = n.indexOf(':'), b = c >= 0 ? n.slice(0, c) : n; var R = REG[ALIASN[b] || b]; return R ? R.fr : 1; }

  function dir(a, b) {
    if (b !== undefined) a = Math.atan2(b, a);
    if (!isFinite(a)) return 0;
    return ((Math.round(a / A16) % 16) + 16) % 16;
  }

  function draw(nom, graine, x, y, opts) {
    var s = make(nom, graine);
    if (N.gfx && N.gfx.blit) N.gfx.blit(s, Math.round(x) - s.cx, Math.round(y) - s.cy, opts);
    return s;
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* LA POLICE 5×7                                                                                    */
  /* ---------------------------------------------------------------------------------------------- */
  /* chasse fixe, comme une borne : chaque signe est centré dans une case de 5, l'avance est de 6. Un texte
     posé lettre à lettre avec une avance de 6 a donc exactement le dessin du même texte posé d'un bloc. */
  var CAP = 7, ASC = 2, DESC = 2, LH = ASC + CAP + DESC, CELL = 5, ADV = 6;
  var G = {
    'A': '.###./#...#/#...#/#####/#...#/#...#/#...#',
    'B': '####./#...#/#...#/####./#...#/#...#/####.',
    'C': '.###./#...#/#..../#..../#..../#...#/.###.',
    'D': '####./#...#/#...#/#...#/#...#/#...#/####.',
    'E': '#####/#..../#..../####./#..../#..../#####',
    'F': '#####/#..../#..../####./#..../#..../#....',
    'G': '.###./#...#/#..../#.###/#...#/#...#/.###.',
    'H': '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    'I': '###/.#./.#./.#./.#./.#./###',
    'J': '....#/....#/....#/....#/#...#/#...#/.###.',
    'K': '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    'L': '#..../#..../#..../#..../#..../#..../#####',
    'M': '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    'N': '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',
    'O': '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    'P': '####./#...#/#...#/####./#..../#..../#....',
    'Q': '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    'R': '####./#...#/#...#/####./#.#../#..#./#...#',
    'S': '.####/#..../#..../.###./....#/....#/####.',
    'T': '#####/..#../..#../..#../..#../..#../..#..',
    'U': '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    'V': '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
    'W': '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.',
    'X': '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    'Y': '#...#/#...#/.#.#./..#../..#../..#../..#..',
    'Z': '#####/....#/...#./..#../.#.../#..../#####',
    '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
    '1': '..#../.##../..#../..#../..#../..#../.###.',
    '2': '.###./#...#/....#/...#./..#../.#.../#####',
    '3': '#####/...#./..#../...#./....#/#...#/.###.',
    '4': '...#./..##./.#.#./#..#./#####/...#./...#.',
    '5': '#####/#..../####./....#/....#/#...#/.###.',
    '6': '..##./.#.../#..../####./#...#/#...#/.###.',
    '7': '#####/....#/...#./..#../.#.../.#.../.#...',
    '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
    '9': '.###./#...#/#...#/.####/....#/...#./.##..',
    '.': '../../../../../##/##',
    ',': '../../../../../##/.#/#.',
    ':': '../##/##/../##/##/..',
    ';': '../##/##/../##/.#/#.',
    '!': '#/#/#/#/#/./#',
    '?': '.###./#...#/....#/...#./..#../...../..#..',
    '-': '...../...../...../#####/...../...../.....',
    '/': '....#/....#/...#./..#../.#.../#..../#....',
    '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
    '+': '...../..#../..#../#####/..#../..#../.....',
    "'": '#/#/./././././',
    '"': '#.#/#.#/.../.../.../.../...',
    '(': '..#/.#./#../#../#../.#./..#',
    ')': '#../.#./..#/..#/..#/.#./#..',
    '«': '..../..../.#.#/#.#./.#.#/..../....',
    '»': '..../..../#.#./.#.#/#.#./..../....',
    '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
    '*': '...../..#../#.#.#/.###./#.#.#/..#../.....',
    '=': '...../...../#####/...../#####/...../.....',
    '<': '...#/..#./.#../#.../.#../..#./...#',
    '>': '#.../.#../..#./...#/..#./.#../#...',
    '_': '...../...../...../...../...../...../#####',
    '°': '.#./#.#/.#./.../.../.../...',
    '×': '...../#...#/.#.#./..#../.#.#./#...#/.....',
    '…': '...../...../...../...../...../...../#.#.#',
    '✓': '...../....#/...##/#.##./###../.#.../.....',
    '✗': '...../#...#/.#.#./..#../.#.#./#...#/.....',
    '★': '..#../..#../#####/.###./.###./#...#/.....',
    '♥': '...../.#.#./#####/#####/.###./..#../.....',
    '←': '...../..#../.#.../#####/.#.../..#../.....',
    '→': '...../..#../...#./#####/...#./..#../.....',
    '↑': '..#../.###./#.#.#/..#../..#../..#../..#..',
    '↓': '..#../..#../..#../..#../#.#.#/.###./..#..',
    'Œ': '.####/#.#../#.#../#.###/#.#../#.#../.####',
    'Æ': '.####/#.#../#.#../#####/#.#../#.#../#.###',
    ' ': '...../...../...../...../...../...../.....'
  };
  /* signes diacritiques, posés dans les DEUX rangées réservées au-dessus des capitales (ou dessous). Deux et
     pas trois : un texte posé à deux pixels du haut de l'écran garde ses accents entiers (une troisième
     rangée tombait hors champ et changeait Î en Ï). L'accent touche donc la lettre, qui garde ses sept
     rangées : tous les mots ont la même hauteur de capitales (V-06) ; le tréma, d'une rangée, garde un vide. */
  var MARK = {
    aigu: { rows: ['.#', '#.'], x: function (gw) { return Math.ceil((gw - 2) / 2); } },
    grave: { rows: ['#.', '.#'], x: function (gw) { return Math.floor((gw - 2) / 2); } },
    circ: { rows: ['.#.', '#.#'], x: function (gw) { return Math.floor((gw - 3) / 2); } },
    trema: { rows: ['#.#', '...'], x: function (gw) { return Math.floor((gw - 3) / 2); } },
    cedille: { rows: ['.#', '#.'], x: function (gw) { return Math.floor((gw - 2) / 2) + 1; }, below: true }
  };
  var COMPOSE = {
    'É': ['E', 'aigu'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'Ë': ['E', 'trema'],
    'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ä': ['A', 'trema'], 'Á': ['A', 'aigu'],
    'Ù': ['U', 'grave'], 'Û': ['U', 'circ'], 'Ü': ['U', 'trema'], 'Ú': ['U', 'aigu'],
    'Ô': ['O', 'circ'], 'Ö': ['O', 'trema'], 'Ó': ['O', 'aigu'], 'Ò': ['O', 'grave'],
    'Î': ['I', 'circ'], 'Ï': ['I', 'trema'], 'Í': ['I', 'aigu'], 'Ì': ['I', 'grave'],
    'Ÿ': ['Y', 'trema'], 'Ç': ['C', 'cedille']
  };
  /* équivalences, par point de code pour ne laisser aucun caractère invisible dans la source :
     espaces insécables, apostrophes et guillemets typographiques, tirets, puce, coches, étoile, cœur */
  var ALIAS = {};
  [[0xa0, 32], [0x202f, 32], [0x2009, 32], [0x2019, 39], [0x2018, 39], [0x2bc, 39], [0x201c, 34], [0x201d, 34],
    [0x2013, 45], [0x2014, 45], [0x2212, 45], [0x2022, 42], [0xb7, 46], [0x2714, 0x2713], [0x2716, 0x2717],
    [0x2715, 0x2717], [0x2606, 0x2605], [0x2764, 0x2665]].forEach(function (p) {
    ALIAS[String.fromCharCode(p[0])] = String.fromCharCode(p[1]);
  });

  /* glyphe -> {w, px:[[x,y],...]} en coordonnées de police (rangée 0 = haut des capitales) */
  var GC = {};
  function parseGlyph(str) {
    var rows = str.split('/'), w = 0, px = [], y, x;
    for (y = 0; y < rows.length; y++) if (rows[y].length > w) w = rows[y].length;
    for (y = 0; y < rows.length; y++) for (x = 0; x < rows[y].length; x++) if (rows[y][x] === '#') px.push([x, y]);
    return { w: w, px: px, desc: rows.length > CAP };
  }
  function glyph(ch) {
    var g = GC[ch];
    if (g) return g;
    if (G[ch]) g = parseGlyph(G[ch]);
    else if (COMPOSE[ch]) {
      var base = glyph(COMPOSE[ch][0]), mk = MARK[COMPOSE[ch][1]], px = base.px.slice(), x0 = mk.x(base.w);
      for (var y = 0; y < mk.rows.length; y++) for (var x = 0; x < mk.rows[y].length; x++) {
        if (mk.rows[y][x] !== '#') continue;
        px.push([x0 + x, mk.below ? CAP + y : y - mk.rows.length - (ASC - mk.rows.length)]);
      }
      g = { w: base.w, px: px, desc: !!mk.below };
    } else return null;
    GC[ch] = g;
    return g;
  }
  function resolve(ch) {
    if (ALIAS[ch]) ch = ALIAS[ch];
    var g = glyph(ch);
    if (g) return g;
    var up = ch.toUpperCase();
    if (up !== ch && up.length === 1) { g = glyph(up); if (g) return g; }
    if (up.normalize) {
      var bare = up.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (bare.length === 1) { g = glyph(bare); if (g) return g; }
    }
    return glyph('?');
  }

  /* découpe en lignes de glyphes ; ß, œ et autres deviennent des capitales par toUpperCase */
  function layout(str) {
    var s = String(str === undefined || str === null ? '' : str);
    var lines = s.split('\n'), out = [];
    for (var l = 0; l < lines.length; l++) {
      var src = lines[l], up = src.toUpperCase(), chars = Array.from ? Array.from(up) : up.split('');
      var gl = [], w = 0, desc = false;
      for (var c = 0; c < chars.length; c++) {
        var g = resolve(chars[c]);
        gl.push(g);
        if (g.desc) desc = true;
      }
      w = gl.length ? gl.length * ADV - 1 : 0;
      out.push({ g: gl, w: w, desc: desc });
    }
    return out;
  }

  function textOpts(o) {
    var r = { ink: OS, shadow: 0, outline: 0, k: 1, align: 0 };
    if (o === undefined || o === null) return r;
    if (typeof o === 'number' || typeof o === 'string') { r.ink = ix(o, OS); return r; }
    var ink = o.ci !== undefined ? o.ci : o.encre !== undefined ? o.encre : o.couleur !== undefined ? o.couleur : o.color;
    r.ink = ix(ink, OS);
    var sh = o.ombre !== undefined ? o.ombre : o.shadow;
    r.shadow = !sh ? 0 : ix(sh, NP);
    var ol = o.contour !== undefined ? o.contour : o.outline;
    r.outline = !ol ? 0 : ix(ol, NP);
    var k = +(o.echelle !== undefined ? o.echelle : o.scale) || 1;
    r.k = Math.max(1, Math.min(4, Math.round(k)));
    var al = o.align;
    r.align = al === 'centre' || al === 'center' || al === 'c' ? 1 : al === 'droite' || al === 'right' || al === 'd' ? 2 : 0;
    return r;
  }

  var tcache = new Map();
  function text(str, opts) {
    var o = textOpts(opts);
    var key = str + '\u0001' + o.ink + ',' + o.shadow + ',' + o.outline + ',' + o.k + ',' + o.align;
    var hit = tcache.get(key);
    if (hit) { tcache.delete(key); tcache.set(key, hit); return hit; }
    var L = layout(str), k = o.k, i, l, c, p;
    var tw = 0;
    for (l = 0; l < L.length; l++) if (L[l].w > tw) tw = L[l].w;
    var last = L[L.length - 1];
    var th = (L.length - 1) * LH + ASC + CAP + (last.desc ? DESC : 0);
    var m0 = o.outline ? k : 0;                        /* marge haut/gauche */
    var m1 = Math.max(o.outline ? k : 0, o.shadow ? k : 0);   /* marge bas/droite */
    var W = Math.max(1, tw * k + m0 + m1), H = th * k + m0 + m1;
    var ink = new Uint8Array(W * H);
    for (l = 0; l < L.length; l++) {
      var line = L[l], x = o.align === 1 ? ((tw - line.w) >> 1) : o.align === 2 ? tw - line.w : 0;
      var y0 = l * LH + ASC;
      for (c = 0; c < line.g.length; c++) {
        var g = line.g[c], ox = x + ((CELL - g.w) >> 1);
        for (p = 0; p < g.px.length; p++) {
          var gx = (ox + g.px[p][0]) * k + m0, gy = (y0 + g.px[p][1]) * k + m0;
          for (var yy = 0; yy < k; yy++) for (var xx = 0; xx < k; xx++) {
            var X = gx + xx, Y = gy + yy;
            if (X >= 0 && Y >= 0 && X < W && Y < H) ink[Y * W + X] = 1;
          }
        }
        x += ADV;
      }
    }
    var s = spr(W, H), d = s.data, X2, Y2;
    if (o.outline) {
      for (Y2 = 0; Y2 < H; Y2++) for (X2 = 0; X2 < W; X2++) {
        if (ink[Y2 * W + X2]) continue;
        var near = false;
        for (var dy = -k; dy <= k && !near; dy++) for (var dx = -k; dx <= k && !near; dx++) {
          var ax = X2 + dx, ay = Y2 + dy;
          if (ax >= 0 && ay >= 0 && ax < W && ay < H && ink[ay * W + ax]) near = true;
        }
        if (near) d[Y2 * W + X2] = o.outline;
      }
    }
    if (o.shadow) {
      for (Y2 = 0; Y2 + k < H; Y2++) for (X2 = 0; X2 + k < W; X2++) {
        if (ink[Y2 * W + X2] && !ink[(Y2 + k) * W + X2 + k]) d[(Y2 + k) * W + X2 + k] = o.shadow;
      }
    }
    for (i = 0; i < W * H; i++) if (ink[i]) d[i] = o.ink;
    s.top = ASC * k + m0; s.cap = CAP * k; s.lines = L.length;
    tcache.set(key, s);
    if (tcache.size > 512) tcache.delete(tcache.keys().next().value);
    return s;
  }

  function measure(str, opts) {
    var o = textOpts(opts), L = layout(str), tw = 0, k = o.k;
    for (var l = 0; l < L.length; l++) if (L[l].w > tw) tw = L[l].w;
    var last = L[L.length - 1], th = (L.length - 1) * LH + ASC + CAP + (last.desc ? DESC : 0);
    var m0 = o.outline ? k : 0, m1 = Math.max(o.outline ? k : 0, o.shadow ? k : 0);
    return { w: Math.max(1, tw * k + m0 + m1), h: th * k + m0 + m1 };
  }

  /* N.spr.get(nom, dir, img) : le nom du § 7.5 (« fleche:armee », « lame:deployee », « ruche:p2 »), la direction 0..15 pour les sprites
     dirigés, l'image d'animation. Aucune allocation une fois le nom vu : les noms dirigés sont mémorisés par direction. */
  var DIRIGES = { tete: 1, tir: 1, chevron: 1, fleche: 1, dard: 1, rival: 1, chevronp: 1, missile: 1 };
  var GC = {};
  function get(nom, d, img) {
    if (d === undefined || d === null) return make(nom, img);
    var e = GC[nom];
    if (!e) {
      var n = norm(nom), c = n.indexOf(':'), b = c >= 0 ? n.slice(0, c) : n;
      b = ALIASN[b] || b;
      e = GC[nom] = { dirs: !!DIRIGES[b], base: b, v: c >= 0 ? n.slice(c + 1).split('/')[0] : '', noms: [] };
    }
    if (!e.dirs) return make(nom, img);
    var k = dirOf(d, 0), nm = e.noms[k];
    if (!nm) nm = e.noms[k] = e.base + ':' + (e.v ? e.v + '/' : '') + k;
    return make(nm, img);
  }
  var CATALOGUE = null;
  function catalogue() {
    if (CATALOGUE) return CATALOGUE;
    var noms = ['fleche', 'fleche:armee', 'fleche:elite', 'dard', 'larve', 'mine', 'mine:alerte', 'tourelle', 'tourelle:charge', 'lame', 'lame:deployee', 'ruche:p0', 'ruche:p1', 'ruche:p2',
      'sentinelle', 'rival', 'perle', 'planeur', 'traqueur', 'pastille', 'noyau', 'butin', 'tirEnnemi', 'tirEnnemi:petit', 'tirEnnemi:gros', 'tete', 'corps', 'queue', 'tir',
      'tourelleJ', 'drone', 'missile', 'mineJ', 'orbe', 'chevronP', 'vie5', 'vie5vide', 'colosse', 'colosse:oeil', 'colosse:tronc', 'colosse:troncoeil', 'colosse:main',
      'colosse:plaque', 'colosse:carcasse', 'colosseLoin', 'colosseMi', 'cyclope', 'mini:fleche', 'mini:ruche'];
    CATALOGUE = noms.map(function (nom) {
      var s = get(nom, DIRIGES[(ALIASN[norm(nom).split(':')[0]] || norm(nom).split(':')[0])] ? 0 : undefined, 0);
      return { nom: nom, w: s.w, h: s.h, images: frames(nom), dirs: !!DIRIGES[(ALIASN[norm(nom).split(':')[0]] || norm(nom).split(':')[0])] };
    });
    return CATALOGUE;
  }

  N.spr = {
    get: get, catalogue: catalogue,
    make: make, text: text, measure: measure, draw: draw, dir: dir, frames: frames, warm: warm,
    names: function () { return LISTE.slice(); },
    glyphs: function () { return Object.keys(G).concat(Object.keys(COMPOSE)); },
    unknown: unknown,
    CAP: CAP, ASC: ASC, LH: LH,
    /* outils exposés pour les autres modules, au besoin : contour d'un pixel, symétries, agrandissement */
    contour: contour, d4: d4, upscale: upscale,
    /* un sprite orienté vers la droite -> direction k (0..15), par la même rotation que la tête */
    rotate: function (s, k) {
      var b = { w: s.w, h: s.h, data: s.data, cx: s.cx === undefined ? (s.w - 1) >> 1 : s.cx, cy: s.cy === undefined ? (s.h - 1) >> 1 : s.cy };
      return dir16(b, ((k % 16) + 16) % 16, {});
    }
  };
})();
