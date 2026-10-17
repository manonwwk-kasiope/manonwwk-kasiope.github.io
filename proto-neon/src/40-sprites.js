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
  /* registre                                                                                         */
  /* ---------------------------------------------------------------------------------------------- */
  function dirOf(v, def) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return def;
    return ((n % 16) + 16) % 16;
  }
  var REG = {
    tete: { fr: 3, gen: function (v, f) { return genTete(dirOf(v, 0), f); } },
    corps: { fr: 3, gen: function (v, f) { var d = parseInt(v, 10); if (!(d === 3 || d === 5 || d === 7 || d === 9)) d = 9; return genCorps(d, f); } },
    queue: { fr: 3, gen: function (v, f) { return genCorps(3, f); } },
    tir: { fr: 2, gen: function (v, f) { return genTir(dirOf(v, 0), f); } },
    chevron: { fr: 1, gen: function (v) { return genChevron(dirOf(v, 0)); } },
    fleche: { fr: 2, gen: function (v, f) { return genFleche(dirOf(v, 0), f); } },
    tourelle: { fr: 2, gen: function (v, f) { return genTourelle(v, f); } },
    sentinelle: { fr: 4, gen: function (v, f) { return genSentinelle(f); } },
    mine: { fr: 2, gen: function (v, f) { return genMine(v, f); } },
    colosse: { fr: 2, gen: function (v, f) { return genColosse(v, f); } },
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
    'vie', 'vieVide', 'ok', 'ko'];

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

  /* ================================ contrat 1.0 (squelette du lot 0b ; lots 6a et 6b) ================================
     N.spr.get(nom, dir, img) : le sprite du catalogue figé (N.ids.sprites), dir 0..15, img = image d'animation,
     l'état dans le nom ('fleche:armee'). Les noms que la démo dessine déjà passent par make() ; un nom du
     catalogue qu'aucun lot n'a encore livré rend un REPLI PROCÉDURAL à sa taille (carré ou losange dans la
     palette, contour de nuit profonde pour les menaces, jamais de cyan hors de la joueuse) ; un nom hors du
     catalogue rend aussi le repli, de 7 × 7, compté dans N.spr.unknown.
     N.spr.catalogue() : le catalogue figé, chaque entrée complétée de reel (dessiné pour de vrai ici).
     N.spr.measure(texte, échelle) accepte une échelle numérique. */
  var DEMO = { tete: 1, corps: 1, 'corps:7': 1, 'corps:5': 1, 'corps:3': 1, tir: 1, chevron: 1, fleche: 1, tourelle: 1, 'tourelle:charge': 1,
    sentinelle: 1, mine: 1, 'mine:alerte': 1, colosse: 1, 'colosse:oeil': 1, tirEnnemi: 1, 'tirEnnemi:petit': 1, 'tirEnnemi:gros': 1,
    butin: 1, son: 1, muet: 1, pause: 1, lecture: 1, vie: 1, vieVide: 1, ok: 1, ko: 1 };
  var DIRS = { tete: 1, tir: 1, chevron: 1, fleche: 1 };
  /* repli des variantes pas encore dessinées : la forme de base de la démo */
  var VERS_DEMO = { 'fleche:armee': 'fleche', 'fleche:elite': 'fleche' };
  var REPLI = typeof Map !== 'undefined' ? new Map() : null;
  function categorie(nom) {
    var b = nom.split(':')[0];
    if (/^(tete|corps|vie|vieMini|lance|rayon|tourelleJ|drone|missile|mineJ|orbe)$/.test(b)) return 'joueuse';
    if (/^(butin|noyau|pastille)$/.test(b)) return 'butin';
    if (/^(portail|son|muet|pause|lecture|ok|ko|carte)$/.test(b)) return 'interface';
    return 'menace';
  }
  function repli(nom) {
    var o = REPLI && REPLI.get(nom);
    if (o) return o;
    var C = (N.ids && N.ids.sprites && N.ids.sprites[nom]) || null, w = C ? C.w : 7, h = C ? C.h : 7, cat = categorie(nom);
    var NPi = N.pal.i('nuitProfonde'), enc = cat === 'joueuse' ? N.pal.i('cyan') : cat === 'butin' ? N.pal.i('ambre') : cat === 'interface' ? N.pal.i('acier') : N.pal.i('magenta');
    var coeur = cat === 'joueuse' ? N.pal.i('cyanPale') : cat === 'butin' ? N.pal.i('jaune') : cat === 'interface' ? N.pal.i('os') : N.pal.i('rosePale');
    o = { w: w, h: h, data: new Uint8Array(w * h), cx: (w - 1) >> 1, cy: (h - 1) >> 1 };
    var cx = (w - 1) / 2, cy = (h - 1) / 2, r = Math.max(1, Math.min(w, h) / 2 - 1);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var d = Math.abs(x - cx) + Math.abs(y - cy);               // un losange : la forme du repli
      if (d <= r - 1) o.data[y * w + x] = d <= r / 3 ? coeur : enc;
      else if (d <= r && cat !== 'joueuse') o.data[y * w + x] = NPi;
    }
    if (REPLI) REPLI.set(nom, o);
    return o;
  }
  function get(nom, d, img) {
    nom = String(nom);
    var base = VERS_DEMO[nom] || nom;
    if (DEMO[base]) return make(DIRS[base] ? base + ':' + (((d | 0) % 16) + 16) % 16 : base, img | 0);
    if (nom === 'cellule') return make('butin', img | 0);
    if (!(N.ids && N.ids.sprites && N.ids.sprites[nom])) unknown[nom] = (unknown[nom] || 0) + 1;
    return repli(nom);
  }
  var CATA = null;
  function catalogue() {
    if (!CATA) {
      CATA = [];
      var L = (N.ids && N.ids.listeSprites) || [];
      for (var i = 0; i < L.length; i++) { var c = N.ids.sprites[L[i]]; CATA.push({ nom: c.nom, w: c.w, h: c.h, dirs: c.dirs, images: c.images, lot: c.lot, reel: !!DEMO[c.nom] }); }
    }
    return CATA;
  }
  function measure1(str, o) { return measure(str, typeof o === 'number' ? { echelle: o } : o); }

  N.spr = {
    get: get, catalogue: catalogue,
    make: make, text: text, measure: measure1, draw: draw, dir: dir, frames: frames, warm: warm,
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
