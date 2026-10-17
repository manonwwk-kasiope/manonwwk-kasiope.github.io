/* ===== 60-intro.js — le metteur en scène : l'ouverture, les interludes, l'invite à jouer =====

   INTERFACE (N.intro), stable :

     N.intro.reset()            l'ouverture depuis le début ; S.phase = 'intro'. 90-boot.js l'appelle au
                                démarrage ; 70-game.js n'a pas à l'appeler.
     N.intro.update(dt)         avance ce qui est en cours. 90-boot.js l'appelle tant que S.phase vaut 'intro'.
     N.intro.draw()             le dessine, plein écran, dans le tampon. Avance seule son horloge si update()
                                n'a pas été appelée dans l'image : l'oublier ne fige rien.
     N.intro.transition(nom [, {nom: 'LE CYCLOPE'}])   -> true si l'interlude part
         'boss'      ALERTE (1,2 s) puis le colosse et son nom (1,8 s) : 3 s au plus, sautable.
                     L'INTERLUDE PREND LA MAIN : S.phase passe à 'intro', donc 90-boot.js appelle N.intro et
                     plus le jeu, qui est GELÉ DE FAIT (ni update, ni draw, ni drawTop) ; à la fin, S.phase
                     reprend la valeur qu'elle avait. Le télégraphe du colosse commence au retour en jeu.
                     La dernière image du jeu est figée pour le fondu ; les explosions en cours sont vidées
                     (N.fx.reset), sinon 90-boot.js les dessinerait par-dessus le panneau.
         'victoire' / 'defaite'   le FOND de l'écran de fin, assombri d'un cran : il ne gèle rien et ne
                     retarde rien (écran de fin en moins d'1 s, J-17). Révélation de 0,4 s au premier dessin.
     N.intro.busy()             -> true PENDANT L'INTERLUDE DU COLOSSE, où le jeu est gelé (S.phase vaut aussi
                                'intro'). C'est la façon de savoir si un interlude est en cours.
     N.intro.current()          -> 'boss' | 'victoire' | 'defaite' | null : le dernier interlude demandé, encore
                                à l'écran ; le fond de fin le reste jusqu'à N.intro.stop().
     N.intro.stop()             retire l'interlude ou le fond de fin (relance d'une partie). Rend la main au jeu.
     N.intro.skip()             saute ce qui est en cours, comme un toucher.
     N.intro.state(), .log      état et journal horodaté des étapes, pour les tests ; .ETAPES, .GARDE.

   CE QUE 70-game.js FAIT (et fait déjà) :

     N.intro.transition('boss');            // l'interlude prend la main : rien d'autre à faire. Une garde
                                            // « if (N.intro.busy()) { N.intro.update(dt); return; } » dans
                                            // update() reste correcte, elle n'est simplement plus atteinte.
     N.intro.transition(victoire ? 'victoire' : 'defaite');      // fin de partie, puis à chaque image :
     if (N.intro.current()) N.intro.draw(); // dans drawTop(), AVANT le score et le défi : le fond couvre le
                                            // monde et les explosions, l'écran de fin se pose par-dessus
     N.intro.stop();                        // à la relance

   L'ENTRÉE. Un toucher ou une touche saute tout ce qui est en cours. Le signal est S.input.any, que
   90-boot.js lève à chaque touche et à chaque toucher : ce module le remet à false au début de chaque
   séquence et pendant la garde, puis le lit. Garde de 300 ms (recherche/game-design-campagne.md, G-37) :
   un toucher reçu dans les 300 premières ms d'une séquence est ignoré, pour qu'un geste destiné au jeu
   ne saute pas une scène jamais vue. Le doigt qui saute l'ouverture devient le manche : le jeu part avec.

   L'OUVERTURE (≈ 11,5 s, puis l'invite attend) : exterieur 2 s → connexion 1,5 s → eveil 2 s →
   titre 3 s (horizon, grille qui défile vers l'horizon, logo construit par vagues de pixels) →
   briefing 3 s (AN 2975 / TU ES EN LIGNE / TIENS 2 MINUTES, tapées lettre à lettre) → invite « TOUCHE
   POUR JOUER » / « ESPACE POUR JOUER ». Au premier toucher ou à la première touche, S.phase passe de 'intro' à 'play'.

   LES PANNEAUX. Fixes (N.art.get), ou l'image courante de leur clip si la vidéo joue (N.art.play / get /
   stop) : la vidéo est un bonus, tout est cadencé sur l'horloge de ce module. Jamais redessinés ni
   agrandis : posés au pixel près, recadrés au centre (point focal propre à chaque panneau), animés à la
   manière des cinématiques d'arcade — révélation par bandes, seuil de Bayer, dérive par pas entiers,
   ligne de balayage, échange d'index cyan ↔ cyan pâle. En portrait, le panneau est un bandeau posé sur
   le vide, fondu au tramage en haut et en bas, et le texte va dessous. Sans illustration décodée, un
   décor procédural (ciel tramé, soleil en bandes, grille) prend le relais.

   RÈGLES TENUES ICI : aucune couleur écrite (tout passe par N.pal.i), aucun tirage aléatoire du navigateur (le bruit est un
   hachage local déterministe : N.rnd appartient au jeu et n'est jamais consommé, comme dans 20-crt.js),
   aucune horloge lue (le temps vient de dt). Du navigateur, deux lectures seulement : la préférence
   « réduire les animations » et la présence d'un écran tactile (TOUCHE ou ESPACE POUR JOUER). Flashs
   bornés (WCAG 2.3.1, V-19 à V-21) : l'alerte presse par le mouvement (rubans et pointillés qui courent,
   gyrophare étroit qui balaie), seul le mot ALERTE change de couleur à 2 Hz ; le scintillement cyan est
   une bande qui repasse sur chaque pixel moins de trois fois par seconde ; les deux seuls éclairs de
   grande surface (impact du logo, onde de l'étincelle) sont uniques, et l'impact du logo passe par le
   limiteur global N.fx.flashGate. « Réduire les animations » : ni secousse ni dérive, le logo se forme
   au tramage au lieu de voler.
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages ================================ */
  var GARDE = 0.3;                         // s : un toucher plus tôt est ignoré (G-37)
  var NOM_COLOSSE = 'LE CYCLOPE';
  var BRIEF = ['AN 2975', 'TU ES EN LIGNE', 'TIENS 2 MINUTES'];
  var LETTRE = 0.045, PAUSE_LIGNE = 0.18; // cadence de frappe du briefing
  var ETAPES = [
    { nom: 'exterieur', d: 2.0 },
    { nom: 'connexion', d: 1.5 },
    { nom: 'eveil', d: 2.0 },
    { nom: 'titre', d: 3.0 },
    { nom: 'briefing', d: 3.0 },
    { nom: 'invite', d: Infinity }
  ];
  var ALERTE_D = 1.2, BOSS_D = 1.8, FIN_REVELE = 0.4;
  /* point focal de chaque illustration (coordonnées de l'image) : ce que le recadrage garde en portrait */
  var FOCAL = {
    exterieur: [205, 108], connexion: [238, 122], eveil: [214, 100], horizon: [256, 110],
    briefing: [192, 108], alerte: [192, 108], boss: [207, 100], victoire: [176, 118], defaite: [204, 130],
    affiche: [176, 130]
  };
  var ETINCELLE = [262, 127];              // centre de l'étincelle dans « connexion »
  var OEIL = [210, 31];                    // l'œil du colosse dans « boss »
  var HORIZON_Y = 114;                     // rangée de l'horizon dans « horizon »

  /* ================================ outils ================================ */
  var P = null;                            // indices de palette par nom, résolus une fois
  var HOT = null, DARKA = null, DARKB = null, DARKT = null, IDENT = null, ALARM = null, SPARK1 = null, SPARK3 = null;
  var BAY = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = {
      vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), violet: I('violet'), indigo: I('indigo'),
      magenta: I('magenta'), rose: I('rosePale'), cyan: I('cyan'), cyanP: I('cyanPale'), ambre: I('ambre'),
      jaune: I('jaune'), brasier: I('brasier'), os: I('os'), acier: I('acier'), sang: I('sang'), np: I('nuitProfonde')
    };
    BAY = N.pal.BAYER || new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
    function table(pairs) { var t = new Uint8Array(16); for (var k = 0; k < 16; k++) t[k] = k; for (var n in pairs) t[P[n]] = P[pairs[n]]; return t; }
    IDENT = table({});
    /* un cran plus clair : ligne de balayage, front d'une révélation */
    HOT = table({ vide: 'nuit', nuit: 'ardoise', ardoise: 'indigo', indigo: 'violet', violet: 'magenta', magenta: 'rose',
      rose: 'os', cyan: 'cyanP', cyanP: 'os', ambre: 'jaune', jaune: 'os', brasier: 'ambre', acier: 'os', sang: 'magenta', np: 'nuit' });
    /* un cran plus sombre : DARKA si le tramage le veut (seuil DARKT), sinon DARKB — le cyan de la joueuse
       reste cyan sur un pixel sur deux au lieu de virer au gris */
    DARKA = table({ nuit: 'np', ardoise: 'nuit', violet: 'indigo', indigo: 'ardoise', magenta: 'sang', rose: 'magenta',
      cyan: 'cyan', cyanP: 'cyan', ambre: 'brasier', jaune: 'ambre', brasier: 'sang', os: 'acier', acier: 'acier', sang: 'sang' });
    DARKB = table({ nuit: 'np', ardoise: 'nuit', violet: 'indigo', indigo: 'ardoise', magenta: 'sang', rose: 'magenta',
      cyan: 'indigo', cyanP: 'cyan', ambre: 'brasier', jaune: 'ambre', brasier: 'sang', os: 'acier', acier: 'ardoise', sang: 'nuit' });
    DARKT = new Uint8Array(16); DARKT[P.cyan] = 8; DARKT[P.acier] = 8; DARKT[P.sang] = 8;
    /* l'alerte qui pulse : le rouge monte d'un cran */
    ALARM = table({ sang: 'magenta', magenta: 'rose', nuit: 'sang', ardoise: 'sang' });
    SPARK1 = table({ cyan: 'cyanP', cyanP: 'os' });
    SPARK3 = table({ cyan: 'indigo', cyanP: 'cyan' });
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }
  /* bruit local, déterministe, sans état : surtout pas N.rnd */
  function hash(a, b, c) {
    var h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function easeOut(v) { v = clamp01(v); var w = 1 - v; return 1 - w * w * w; }
  var reduit = null;
  function reduced() {
    if (reduit !== null) return reduit;
    reduit = false;
    try { if (typeof window !== 'undefined' && window.matchMedia) reduit = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    return reduit;
  }
  var tactile = null;
  function isTouch() {
    if (tactile !== null) return tactile;
    tactile = false;
    try { tactile = typeof navigator !== 'undefined' && ((navigator.maxTouchPoints | 0) > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window)); } catch (e) {}
    return tactile;
  }
  function art(nom) { try { return N.art && N.art.get ? N.art.get(nom) : null; } catch (e) { return null; } }
  function clipOn(nom) { try { if (N.art && N.art.play) N.art.play(nom); } catch (e) {} }
  function clipOff(nom) { try { if (N.art && N.art.stop) N.art.stop(nom); } catch (e) {} }
  function clipPrep(nom) { try { if (N.art && N.art.prepare) N.art.prepare(nom); } catch (e) {} }
  function sfx(nom, o) { try { if (N.music && N.music.sfx) N.music.sfx(nom, o); } catch (e) {} }
  function secousse(a) {
    if (reduced()) return;
    if (N.fx && N.fx.shake) { try { N.fx.shake(a); return; } catch (e) {} }
    var s = S(); if ((s.shake || 0) < a) s.shake = a;
  }

  /* ================================ géométrie de l'écran ================================ */
  var L = { W: 0, H: 0, x0: 0, y0: 0, x1: 0, y1: 0, sw: 0, sh: 0, portrait: false, px: 2 };
  function layout() {
    var g = G(), s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    L.W = g.W | 0; L.H = g.H | 0; L.px = g.PX | 0 || 2;
    L.x0 = sf.l | 0; L.y0 = sf.t | 0; L.x1 = L.W - (sf.r | 0); L.y1 = L.H - (sf.b | 0);
    if (L.x1 - L.x0 < 40) { L.x0 = 0; L.x1 = L.W; }
    if (L.y1 - L.y0 < 40) { L.y0 = 0; L.y1 = L.H; }
    L.sw = L.x1 - L.x0; L.sh = L.y1 - L.y0;
    L.portrait = L.H > L.W;
  }
  /* coin haut-gauche d'une image iw x ih pour un point focal (fx,fy), décalé de (dx,dy) ; en paysage
     l'image plus grande que l'écran est recadrée sans laisser voir ses bords ; en portrait le bandeau est
     posé à la hauteur by (rangée de l'écran où va le haut de l'image) */
  var POS = { x: 0, y: 0 };
  function cadre(iw, ih, f, dx, dy, by) {
    var W = L.W, H = L.H, x, y;
    if (iw <= W) x = ((W - iw) / 2) | 0;
    else { x = Math.round(W / 2 - f[0] + dx); if (x > 0) x = 0; if (x < W - iw) x = W - iw; }
    if (by !== undefined && by !== null) y = by + dy;
    else if (ih <= H) y = (((H - ih) / 2) | 0) + dy;
    else { y = Math.round(H / 2 - f[1] + dy); if (y > 0) y = 0; if (y < H - ih) y = H - ih; }
    POS.x = x; POS.y = y; return POS;
  }
  /* rangée du haut du bandeau en portrait : un peu au-dessus du centre, le texte va dessous */
  function bandeauY(ih) { return Math.max(L.y0 + 6, Math.round((L.H - ih) * 0.34)); }

  /* ================================ pose d'un panneau ================================
     Une seule boucle par pixel, écrite directement dans le tampon d'index (N.gfx.buf) : 384 x 216 pixels
     au plus par panneau, une table de 16 pour réindexer, et la révélation décidée par pixel.
       rv : 0 plein ; 1 bandes de haut en bas (p = rangée-front, ÉCRAN) ; 2 seuil de Bayer (p = 0..1) ;
            3 de bas en haut (p = rangée-front, ÉCRAN) ; 4 bande centrale qui s'ouvre (p = demi-hauteur)
       map  : réindexation (null = identité) ; dk : assombri d'un cran (tables DARK)
       shim : phase du scintillement cyan, -1 = aucun ; scan : rangée écran de la ligne de balayage (-1)
       fade : nombre de rangées fondues au tramage en haut et en bas de l'image (portrait) */
  function poser(img, ox, oy, rv, p, map, dk, shim, scan, fade, sansMiroirY) {
    var g = G(); if (!img || !img.data || !g || !g.buf) return;
    var B = g.buf(); if (!B) return;
    var W = g.W, H = g.H, iw = img.w, ih = img.h, d = img.data;
    var m = map || IDENT;
    /* Image plus petite que l'écran : elle est prolongée EN MIROIR, un cran plus sombre, plutôt que
       laissée sur des bandes vides (iPhone en paysage : 422 colonnes pour un panneau de 384). Chaque
       pixel prolongé est un pixel de l'image, à sa taille : rien n'est agrandi. Le bandeau du portrait
       (fade > 0) n'est prolongé que sur les côtés : le texte vit au-dessous. */
    var exX = iw < W, exY = !(fade > 0) && !sansMiroirY && ih < H;
    var x0 = exX ? 0 : (ox < 0 ? 0 : ox), x1 = exX ? W : (ox + iw > W ? W : ox + iw);
    var y0 = exY ? 0 : (oy < 0 ? 0 : oy), y1 = exY ? H : (oy + ih > H ? H : oy + ih);
    if (x1 <= x0 || y1 <= y0) return;
    var t16 = rv === 2 ? p * 16 : 16, cy = P.cyan, cp = P.cyanP, mid = oy + ih / 2;
    for (var y = y0; y < y1; y++) {
      var sy = y - oy, ey = false;
      if (sy < 0) { sy = -sy - 1; ey = true; if (sy >= ih) sy = ih - 1; }
      else if (sy >= ih) { sy = 2 * ih - sy - 1; ey = true; if (sy < 0) sy = 0; }
      if (rv === 1 && y > p) break;
      if (rv === 3 && y < p) continue;
      if (rv === 4 && Math.abs(y - mid) > p) continue;
      var front = (rv === 1 && y >= p - 1) || (rv === 3 && y <= p + 1) || (rv === 4 && Math.abs(y - mid) > p - 2);
      var mm = (y === scan || front) ? HOT : m;
      var ft = 16;
      if (fade > 0) { var e = sy < ih - 1 - sy ? sy : ih - 1 - sy; if (e < fade) ft = ((e + 0.5) / fade) * 16; }
      var thr = t16 < ft ? t16 : ft;
      var row = sy * iw, o = y * W, br = (y & 3) << 2;
      for (var x = x0; x < x1; x++) {
        var sx = x - ox, ex = ey;
        if (sx < 0) { sx = -sx - 1; ex = true; if (sx >= iw) sx = iw - 1; }
        else if (sx >= iw) { sx = 2 * iw - sx - 1; ex = true; if (sx < 0) sx = 0; }
        var c = d[row + sx];
        if (!c) continue;
        if (thr < 16 && !(BAY[br | (x & 3)] < thr)) continue;
        if (shim >= 0 && !ex && (c === cy || c === cp)) {
          var k = (x + (y >> 1) + shim) & 63;
          if (k < 3) c = c === cy ? cp : cy;
          else if (c === cy && hash(x, y, shim >> 3) < 0.025) c = cp;
        }
        if (dk || ex) c = BAY[br | (x & 3)] < DARKT[c] ? DARKA[c] : DARKB[c];
        else c = mm[c];
        B[o + x] = c;
      }
    }
  }

  /* ================================ décor de secours ================================
     Tant qu'une illustration n'est pas décodée (quelques millisecondes au démarrage) ou si elle manque :
     ciel tramé, soleil en bandes, grille en perspective — rien de cyan. */
  function decor(t, hz) {
    var g = G(), W = L.W, H = L.H; if (!g) return;
    var hy = hz || Math.round(H * 0.58);
    g.rect(0, 0, W, hy, P.vide);
    g.ditherRect(0, hy - 40, W, 40, P.nuit, 0.5); g.ditherRect(0, hy - 16, W, 16, P.indigo, 0.5);
    var sx = (W / 2) | 0, sr = Math.max(14, Math.min(46, (Math.min(W, H) * 0.22) | 0)), syc = hy - (sr * 0.45 | 0);
    for (var yy = -sr; yy <= 0 + (sr * 0.45 | 0); yy++) {
      var y = syc + yy; if (y >= hy) break;
      var band = (yy + sr) / (sr * 1.45); if (yy > -sr * 0.3 && ((y + ((t * 8) | 0)) & 3) === 0) continue;
      var dx = Math.sqrt(Math.max(0, sr * sr - yy * yy)) | 0;
      g.rect(sx - dx, y, dx * 2 + 1, 1, band < 0.35 ? P.jaune : band < 0.65 ? P.ambre : P.magenta);
    }
    g.rect(0, hy, W, H - hy, P.np);
    g.rect(0, hy, W, 1, P.magenta);
    for (var i = 0; i < 12; i++) {
      var z = 0.6 + ((i * 0.5 - t * 0.55) % 6 + 6) % 6, yl = hy + Math.round(70 / z);
      if (yl < H) g.rect(0, yl, W, 1, P.violet);
    }
    for (var k = -10; k <= 10; k++) g.line(sx, hy, sx + k * W / 8, H, P.violet);
  }

  /* ================================ texte (police 5 x 7) ================================
     N.spr.text (40-sprites.js) : police proportionnelle, accents, ombre, contour et échelle entière
     cuits dans le sprite, cache chez lui. La frappe lettre à lettre pose le PRÉFIXE de la chaîne : le
     préfixe a exactement la mise en page du début de la ligne complète, rien ne bouge. Tant que
     40-sprites.js manque, une police de secours de même gabarit (sans accents) prend le relais. */
  var FONT = {
    A: 'ehhvhhh', B: 'uhhuhhu', C: 'ehggghe', D: 'sihhhis', E: 'vgguggv', F: 'vgguggg', G: 'ehgnhhf',
    H: 'hhhvhhh', I: 'e44444e', J: '72222ic', K: 'hikokih', L: 'ggggggv', M: 'hrllhhh', N: 'hhpljhh',
    O: 'ehhhhhe', P: 'uhhuggg', Q: 'ehhhlid', R: 'uhhukih', S: 'fgge11u', T: 'v444444', U: 'hhhhhhe',
    V: 'hhhhha4', W: 'hhhllla', X: 'hha4ahh', Y: 'hha4444', Z: 'v12348v',
    '0': 'ehjlphe', '1': '4c4444e', '2': 'eh1248v', '3': 'v2421he', '4': '26aiv22',
    '5': 'vgu11he', '6': '68guhhe', '7': 'v124888', '8': 'ehhehhe', '9': 'ehhf12c',
    '.': '00000cc', ',': '0000c48', ':': '0cc0cc0', '!': '4444404', '?': 'eh12404', '-': '000v000',
    "'": '4480000', '/': '122488g', ' ': '0000000'
  };
  var secoursCache = {};
  function secours(str, k, ci, contour) {
    var key = str + '|' + k + '|' + ci + '|' + (contour ? 1 : 0), c = secoursCache[key];
    if (c) return c;
    var s = str.toUpperCase(); if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    var m0 = contour ? k : 0, m1 = k, tw = Math.max(1, s.length * 6 - 1);
    var W = tw * k + m0 + m1, H = 7 * k + m0 + m1, ink = new Uint8Array(W * H), d = new Uint8Array(W * H);
    for (var i = 0; i < s.length; i++) {
      var gl = FONT[s.charAt(i)] || FONT['?'];
      for (var r = 0; r < 7; r++) {
        var bits = parseInt(gl.charAt(r), 32) || 0;
        for (var b = 0; b < 5; b++) if (bits & (16 >> b))
          for (var yy = 0; yy < k; yy++) for (var xx = 0; xx < k; xx++) ink[(m0 + r * k + yy) * W + m0 + (i * 6 + b) * k + xx] = 1;
      }
    }
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (ink[y * W + x]) { d[y * W + x] = ci; continue; }
      if (y >= k && x >= k && ink[(y - k) * W + x - k]) d[y * W + x] = P.np;            // ombre portée
      else if (contour) {
        for (var dy = -k; dy <= k; dy++) for (var dx = -k; dx <= k; dx++) {
          var ax = x + dx, ay = y + dy;
          if (ax >= 0 && ay >= 0 && ax < W && ay < H && ink[ay * W + ax]) d[y * W + x] = P.np;
        }
      }
    }
    c = { w: W, h: H, data: d, top: m0, m0: m0 };
    secoursCache[key] = c;
    return c;
  }
  function txt(str, k, ci, contour) {
    if (N.spr && N.spr.text) {
      try { var sp = N.spr.text(str, { ci: ci, echelle: k, ombre: true, contour: !!contour }); if (sp && sp.data) { sp.m0 = contour ? k : 0; return sp; } } catch (e) {}
    }
    return secours(str, k, ci, contour);
  }
  /* largeur d'encre de la chaîne à l'échelle k (sans les marges d'ombre et de contour) */
  function largeur(str, k) { var sp = txt(str, k, P.os, false); return sp.w - k; }
  /* pose les n premières lettres de str : capitales en haut à (x,y), échelle entière k, encre ci */
  function ecrire(str, x, y, k, ci, n, contour) {
    var g = G(); if (!g || !g.blit) return 0;
    var s = (n === undefined || n >= str.length) ? str : str.slice(0, Math.max(0, n));
    if (!s) return 0;
    var sp = txt(s, k, ci, contour);
    g.blit(sp, Math.round(x) - (sp.m0 || 0), Math.round(y) - (sp.top !== undefined ? sp.top : 0));
    return sp.w - k - (sp.m0 || 0);
  }
  /* la plus grande échelle entière qui tienne dans la largeur sûre, plafonnée à kmax ; à px = 2 on vise
     des capitales de 28 px CSS (k = 2), jamais moins de 14 px (k = 1, J-30) */
  function echelle(strs, kmax, marge) {
    var k = Math.max(1, Math.min(kmax || 3, Math.round(28 / (7 * L.px))));
    var room = L.sw - 2 * (marge === undefined ? 6 : marge);
    for (; k > 1; k--) {
      var ok = true;
      for (var i = 0; i < strs.length; i++) if (largeur(strs[i], k) > room) { ok = false; break; }
      if (ok) break;
    }
    return k;
  }
  /* aplat sombre derrière un bloc de texte, bords tramés : lisible sur n'importe quel panneau (V-08) */
  function plaque(x, y, w, h) {
    var g = G(); if (!g) return;
    g.rect(x, y, w, h, P.np);
    if (g.ditherRect) { g.ditherRect(x, y - 2, w, 2, P.np, 0.5); g.ditherRect(x, y + h, w, 2, P.np, 0.5); }
  }

  /* ================================ le logo construit par vagues ================================ */
  var LOGO = null;                         // {src, w, h, n, sx, sy, ci, t0, dx, dy}
  function logoPrep(maxW) {
    var src = art('logo');
    if (!src) return null;
    if (LOGO && LOGO.src === src && LOGO.maxW === maxW) return LOGO;
    var w = src.w, h = src.h, d = src.data, keep = [];
    for (var x = 0; x < w; x++) keep.push(x);
    /* Plus étroit que le logo (portrait d'iPhone : 195 colonnes pour 200) : on retire les colonnes qui
       diffèrent le moins de leur voisine, jamais deux côte à côte. Rien n'est agrandi ni lissé : chaque
       pixel garde sa couleur et reste un carré du tampon ; il manque quelques colonnes presque jumelles. */
    var drop = w - maxW;
    if (drop > 0 && drop <= 24) {
      var cost = [];
      for (var cx = 2; cx < w - 2; cx++) {
        var diff = 0;
        for (var cy = 0; cy < h; cy++) if (d[cy * w + cx] !== d[cy * w + cx - 1]) diff++;
        cost.push([diff, cx]);
      }
      cost.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var gone = {}, n = 0;
      for (var i = 0; i < cost.length && n < drop; i++) {
        var c = cost[i][1];
        if (gone[c - 1] || gone[c + 1] || gone[c - 2] || gone[c + 2]) continue;
        gone[c] = 1; n++;
      }
      keep = keep.filter(function (x) { return !gone[x]; });
    } else if (drop > 24) {
      var cut = (drop / 2) | 0; keep = keep.slice(cut, cut + maxW);
    }
    var nw = keep.length, cnt = 0, top = h, bot = 0;
    for (var yy = 0; yy < h; yy++) for (var k = 0; k < nw; k++) if (d[yy * w + keep[k]]) { cnt++; if (yy < top) top = yy; if (yy > bot) bot = yy; }
    var o = { src: src, maxW: maxW, w: nw, h: h, top: top, bot: bot, n: cnt,
      sx: new Int16Array(cnt), sy: new Int16Array(cnt), ci: new Uint8Array(cnt), t0: new Float32Array(cnt),
      dx: new Int16Array(cnt), dy: new Int16Array(cnt) };
    var j = 0;
    for (var y2 = 0; y2 < h; y2++) for (var k2 = 0; k2 < nw; k2++) {
      var v = d[y2 * w + keep[k2]]; if (!v) continue;
      o.sx[j] = k2; o.sy[j] = y2; o.ci[j] = v;
      /* les vagues balaient le logo en diagonale, de gauche à droite ; chaque pixel part d'en bas */
      var wave = Math.floor((k2 + 0.5 * y2) / 22);
      o.t0[j] = 0.13 * wave + 0.10 * hash(k2, y2, 7);
      o.dx[j] = Math.round((hash(k2, y2, 11) - 0.5) * 44);
      o.dy[j] = Math.round(64 + 56 * hash(k2, y2, 13));
      j++;
    }
    o.fin = 0;
    for (var q = 0; q < cnt; q++) if (o.t0[q] > o.fin) o.fin = o.t0[q];
    o.fin += VOL;
    LOGO = o; return o;
  }
  var VOL = 0.42;                          // s : vol d'un pixel jusqu'à sa place
  /* u : temps depuis le début de la construction ; (lx, ly) : coin haut-gauche du logo à l'écran */
  function logoDraw(o, u, lx, ly, eclat) {
    var g = G(), B = g.buf(), W = g.W, H = g.H, red = reduced();
    var hotOs = P.os;
    var shine = u - o.fin;                 // après la pose : un reflet qui traverse le chrome
    for (var j = 0; j < o.n; j++) {
      var tx = lx + o.sx[j], ty = ly + o.sy[j], c = o.ci[j], x = tx, y = ty;
      var a = u - o.t0[j];
      if (red) {
        if (!(BAY[((ty & 3) << 2) | (tx & 3)] < clamp01(a / VOL) * 16)) continue;
      } else {
        if (a < 0) continue;
        if (a < VOL) {
          var e = easeOut(a / VOL);
          x = tx + Math.round(o.dx[j] * (1 - e)); y = ty + Math.round(o.dy[j] * (1 - e));
          c = a < VOL * 0.55 ? HOT[c] : c;
        } else if (a < VOL + 0.05) c = hotOs;      // l'éclat de l'arrivée
      }
      if (shine > 0 && shine < 0.5) {
        var band = (o.sx[j] + o.sy[j] * 0.6) - shine * 2.0 * o.w;
        if (band > -6 && band < 0) c = HOT[c];
      }
      if (eclat) c = HOT[HOT[c]];
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      B[y * W + x] = c;
    }
  }

  /* ================================ la grille qui défile vers l'horizon ================================
     Le sol de « horizon » est repris tel quel (fond tramé, lignes de fuite, reflet du soleil), mais ses
     lignes transversales, fixes dans l'image, sont remplacées par la rangée voisine ; des lignes
     transversales neuves, en perspective, viennent de l'horizon vers la joueuse. */
  var SOL = null;                          // {src, img} : l'horizon sans ses lignes transversales
  function solPrep() {
    var src = art('horizon'); if (!src) return null;
    if (SOL && SOL.src === src) return SOL;
    var w = src.w, h = src.h, d = src.data, out = new Uint8Array(d), line = new Uint8Array(h);
    for (var y = HORIZON_Y + 16; y < h; y++) {
      var dark = 0;
      for (var x = 0; x < w; x++) { var c = d[y * w + x]; if (c === P.nuit || c === P.ardoise || c === P.np) dark++; }
      if (dark < w * 0.04) line[y] = 1;
    }
    for (var y2 = HORIZON_Y + 16; y2 < h; y2++) {
      if (!line[y2]) continue;
      var s = y2 - 1; while (s > HORIZON_Y + 16 && line[s]) s--;
      out.set(d.subarray(s * w, s * w + w), y2 * w);
    }
    SOL = { src: src, img: { w: w, h: h, data: out } };
    return SOL;
  }
  function grille(ox, oy, iw, ih, u) {
    var g = G(), B = g.buf(), W = g.W, H = g.H;
    var A = 84.5, DZ = 0.5, NL = 12, v = reduced() ? 0 : 0.55;
    for (var i = 0; i < NL; i++) {
      var z = 0.72 + (((i * DZ - v * u) % (NL * DZ)) + NL * DZ) % (NL * DZ);
      var dd = A / z; if (dd < 17) continue;
      var y = oy + HORIZON_Y + Math.round(dd); if (y < 0 || y >= H || y >= oy + ih) continue;
      var x0 = ox < 0 ? 0 : ox, x1 = ox + iw > W ? W : ox + iw, o = y * W;
      var thick = dd > 48, far = dd < 28;
      for (var x = x0; x < x1; x++) {
        var c = B[o + x];
        if (c === P.magenta || c === P.rose) continue;            // les lignes de fuite passent devant
        if (far && !(BAY[((y & 3) << 2) | (x & 3)] < 11)) continue;
        B[o + x] = P.violet;
        if (thick && y + 1 < H && BAY[(((y + 1) & 3) << 2) | (x & 3)] < 8) { var c2 = B[o + W + x]; if (c2 !== P.magenta && c2 !== P.rose) B[o + W + x] = P.violet; }
      }
    }
  }
  /* ciel prolongé au-dessus d'un panneau trop court (portrait, ou bureau) : tramé, piqué d'étoiles */
  function ciel(y1, t) {
    var g = G(); if (!g || y1 <= 0) return;
    g.rect(0, 0, L.W, y1, P.np);
    if (g.ditherRect) { g.ditherRect(0, y1 - 24, L.W, 24, P.nuit, 0.5); g.ditherRect(0, y1 - 8, L.W, 8, P.nuit, 1); }
    var n = (L.W * y1 / 260) | 0;
    for (var i = 0; i < n; i++) {
      var sx = (hash(i, 3, 5) * L.W) | 0, sy = (hash(i, 9, 2) * (y1 - 10)) | 0;
      var tw = hash(i, (t * 3) | 0, 4) < 0.12;
      g.px(sx, sy, tw ? P.os : (hash(i, 1, 1) < 0.5 ? P.acier : P.violet));
    }
  }

  /* ================================ état ================================ */
  var O = { on: false, t: 0, k: 0, u: 0, clip: null, boom: false, flash: false, shook: false, typed: 0, bip: 0, eclat: false, eclatT: -1, attente: 0 };
  var I = { nom: null, t: 0, blk: false, label: NOM_COLOSSE, clip: null, phase2: false, typed: 0, bip: -1, prev: null, vu: false };
  var G_ = { t: 0, armed: false };         // garde de l'entrée
  var tick = { frame: -1 };
  var wasPaused = false;
  var LOG = [];

  function journal(quoi) {
    var s = S();
    LOG.push({ e: quoi, t: +(O.on ? O.t : I.t).toFixed(3), tb: +((s.t || 0) / 1000).toFixed(3), f: s.frame | 0 });
    if (LOG.length > 64) LOG.shift();
  }
  function garde() {                       // nouvelle séquence : on oublie les gestes déjà faits
    G_.t = 0; G_.armed = false;
    var s = S(); if (s.input) s.input.any = false;
  }
  /* un geste NEUF, après la garde ? 90-boot.js lève S.input.any à chaque touche et chaque toucher */
  function geste(dt) {
    var s = S(), inp = s.input; if (!inp) return false;
    G_.t += dt;
    if (G_.t < GARDE) { inp.any = false; return false; }
    if (!G_.armed) { G_.armed = true; inp.any = false; return false; }
    return !!inp.any;
  }

  /* ================================ l'ouverture ================================ */
  function reset() {
    pal();
    stopInterlude(true);
    O.on = true; O.t = 0; O.k = 0; O.u = 0; O.boom = false; O.flash = false; O.shook = false;
    O.typed = 0; O.bip = 0; O.eclat = false; O.eclatT = -1; O.attente = 0;
    LOG.length = 0;
    var s = S(); s.phase = 'intro';
    garde();
    entrer(0);
    journal('debut');
  }
  function entrer(k) {
    var e = ETAPES[k];
    if (O.clip) { clipOff(O.clip); O.clip = null; }
    var nom = e.nom === 'titre' ? null : (e.nom === 'invite' ? null : e.nom);
    if (nom && nom !== 'briefing') { clipOn(nom); O.clip = nom; }
    if (e.nom === 'briefing') { clipOn('briefing'); O.clip = 'briefing'; }
    if (e.nom === 'invite') O.clip = 'briefing';
    var nxt = ETAPES[k + 1]; if (nxt && nxt.nom !== 'titre' && nxt.nom !== 'invite') clipPrep(nxt.nom);
    O.k = k; O.u = 0;
    journal(e.nom);
  }
  function finOuverture(pourquoi) {
    if (!O.on) return;
    journal(pourquoi);
    O.on = false;
    if (O.clip) { clipOff(O.clip); O.clip = null; }
    var s = S(); s.phase = 'play';
  }
  function avanceOuverture(dt) {
    /* le tube reste éteint tant que le premier panneau n'est pas décodé (1,5 s au plus) : sinon le décor
       de secours passerait une fraction de seconde avant la cité, un faux départ */
    if (O.k === 0 && O.u === 0 && O.attente < 1.5 && !art(ETAPES[0].nom)) {
      O.attente += dt;
      if (geste(dt)) finOuverture('saut');
      return;
    }
    O.t += dt; O.u += dt;
    var e = ETAPES[O.k];
    if (O.u >= e.d && O.k < ETAPES.length - 1) { var reste = O.u - e.d; entrer(O.k + 1); O.u = reste; e = ETAPES[O.k]; }
    /* événements ponctuels, sur l'horloge de l'étape */
    if (e.nom === 'eveil' && !O.shook && O.u >= 1.62) { O.shook = true; secousse(4); }
    if (e.nom === 'titre' && !O.boom && O.u >= Math.max(0, 0.2 + (LOGO ? LOGO.fin : 1.95) - 1.95)) { O.boom = true; sfx('intro'); }
    if (e.nom === 'titre' && !O.flash && LOGO && O.u >= 0.2 + LOGO.fin) {
      O.flash = true; secousse(3); journal('logo pose');
      /* un éclat blanc de 3 images sur tout le logo : c'est un flash de grande surface (WCAG 2.3.1), il
         passe par le limiteur global de 50-fx.js quand il existe ; refusé, le logo se pose sans éclair */
      O.eclat = true;
      try { if (N.fx && N.fx.flashGate) O.eclat = !!N.fx.flashGate(LOGO.n); } catch (er) {}
      O.eclatT = O.u;
    }
    if (e.nom === 'briefing' || e.nom === 'invite') {
      var n = lettres(e.nom === 'invite' ? 99 : O.u);
      if (n > O.typed) { if (n - O.bip >= 2) { O.bip = n; sfx('tir', { pitch: n % 5 }); } O.typed = n; }
    }
    if (geste(dt)) { finOuverture('saut'); }
  }
  /* nombre de lettres tapées après u secondes de briefing */
  var BRIEF_T0 = 0.35;
  function lettres(u) {
    var t = u - BRIEF_T0, n = 0;
    for (var i = 0; i < BRIEF.length; i++) {
      var l = BRIEF[i].length, d = l * LETTRE;
      if (t <= 0) return n;
      if (t < d) return n + Math.floor(t / LETTRE) + 1;
      n += l; t -= d + PAUSE_LIGNE;
    }
    return n;
  }

  function drawOuverture() {
    var e = ETAPES[O.k], u = O.u;
    switch (e.nom) {
      case 'exterieur': scExterieur(u); break;
      case 'connexion': scConnexion(u); break;
      case 'eveil': scEveil(u); break;
      case 'titre': scTitre(u); break;
      default: scBriefing(e.nom === 'invite' ? 99 : u, e.nom === 'invite', O.t);
    }
    if (S().paused) pauseTexte();
  }

  /* dérive par pas entiers : un pixel tous les « pas » secondes, de a à b */
  function derive(u, pas, a, b) {
    if (reduced()) return Math.round((a + b) / 2);
    var n = Math.floor(u / pas), s = b >= a ? 1 : -1, m = Math.abs(b - a);
    return a + s * Math.min(m, n);
  }
  /* pose un panneau d'ouverture, recadré pour l'écran */
  function panneau(nom, u, dxp, dyp, rv, p, shim, scan) {
    var img = art(nom);
    if (!img) { decor(O.t + I.t, null); return; }
    var f = FOCAL[nom] || [img.w / 2, img.h / 2];
    var by = L.portrait ? bandeauY(img.h) : null;
    var pos = cadre(img.w, img.h, f, L.portrait ? dxp : 0, L.portrait ? 0 : dyp, by);
    var px = pos.x, py = pos.y;
    if (rv === 1 || rv === 3) p = py + p;           // le front est donné en rangées de l'image
    poser(img, px, py, rv, p, null, false, shim, scan, L.portrait ? 8 : 0);
  }

  function scExterieur(u) {
    var img = art('exterieur'), H = img ? img.h : L.H;
    if (!img && O.attente < 1.5 && u === 0) return;          // tube éteint : le tampon reste au vide
    var front = Math.floor(clamp01((u - 0.05) / 0.6) * (H + 8));       // le tube chauffe de haut en bas
    var rows = Math.floor(front / 6) * 6;
    var scan = Math.round(((u * 110) % (L.H + 30)) - 15);
    panneau('exterieur', u, derive(u, 0.09, -12, 12), derive(u, 0.2, 6, -4), u < 0.7 ? 1 : 0, rows, -1, scan);
  }
  function scConnexion(u) {
    var g = G();
    /* fondu de Bayer depuis l'extérieur, 0,25 s */
    if (u < 0.25) panneau('exterieur', 2 + u, derive(2 + u, 0.09, -12, 12), derive(2, 0.2, 6, -4), 0, 0, -1, -1);
    var dx = derive(u, 0.12, -6, 8), dy = derive(u, 0.25, -3, 3);
    var img = art('connexion');
    if (!img) { decor(O.t, null); return; }
    var by = L.portrait ? bandeauY(img.h) : null;
    var pos = cadre(img.w, img.h, FOCAL.connexion, L.portrait ? dx : 0, L.portrait ? 0 : dy, by);
    var st = Math.floor(u * 12) % 4;                // l'étincelle : douze états par seconde, petite surface
    poserEtincelle(img, pos.x, pos.y, u < 0.25 ? clamp01(u / 0.25) : 1, st);
    /* arcs électriques depuis l'étincelle, renouvelés toutes les trois images (après le fondu) */
    var cx = pos.x + ETINCELLE[0], cy = pos.y + ETINCELLE[1], seed = Math.floor(u * 20);
    if (u > 0.25) for (var a = 0; a < 3; a++) {
      if (hash(seed, a, 3) < 0.35) continue;
      var ang = hash(seed, a, 5) * 6.283, len = 8 + hash(seed, a, 9) * 22 + (u > 1.0 ? 14 : 0), x = cx, y = cy, nseg = 4;
      for (var s = 1; s <= nseg; s++) {
        var r = len * s / nseg, j = (hash(seed, a * 7 + s, 2) - 0.5) * 8;
        var nx = cx + Math.cos(ang) * r - Math.sin(ang) * j, ny = cy + Math.sin(ang) * r + Math.cos(ang) * j;
        g.line(x, y, nx, ny, s === 1 ? P.os : P.cyanP); x = nx; y = ny;
      }
    }
    /* l'étincelle éclate : un anneau tramé qui s'étend et se troue, un cœur blanc — c'est la naissance du
       serpent, et le passage vers « eveil ». Aire de l'anneau : moins de 3 000 pixels, un seul éclat. */
    if (u > 1.2) {
      var b = (u - 1.2) / 0.3, rr = Math.round(6 + easeOut(b) * Math.max(L.W, L.H) * 0.55);
      g.disc(cx, cy, Math.max(0, rr - 5), rr, P.cyanP, clamp01(1 - b) * 0.9 + 0.1);
      g.ring(cx, cy, Math.max(0, rr - 6), P.cyan, 0.5);
      if (b < 0.5) { g.ditherCirc(cx, cy, Math.round(10 - b * 12), P.os, 0.75); g.circ(cx, cy, 3, P.os); }
    }
  }
  /* « connexion » en entier, mais l'étincelle (les pixels cyan) suit son propre état */
  function poserEtincelle(img, ox, oy, rev, st) {
    var m = st === 1 ? SPARK1 : (st === 3 ? SPARK3 : IDENT);   // éclat, puis extinction
    poser(img, ox, oy, rev < 1 ? 2 : 0, rev, m, false, -1, -1, L.portrait ? 8 : 0);
  }
  function scEveil(u) {
    if (u < 0.35) panneau('connexion', 1.5, derive(1.5, 0.12, -6, 8), derive(1.5, 0.25, -3, 3), 0, 0, -1, -1);
    var shim = Math.floor(u * 70);
    var img = art('eveil');
    if (!img) { decor(O.t, null); return; }
    var by = L.portrait ? bandeauY(img.h) : null;
    var dy = derive(u, 0.14, -7, 7), dx = derive(u, 0.1, -8, 10);
    var pos = cadre(img.w, img.h, FOCAL.eveil, L.portrait ? dx : 0, L.portrait ? 0 : dy, by);
    var scan = Math.round(((u * 130) % (L.H + 30)) - 15);
    poser(img, pos.x, pos.y, u < 0.35 ? 2 : 0, clamp01(u / 0.35), null, false, shim, scan, L.portrait ? 8 : 0);
  }
  function scTitre(u) {
    var g = G(), sol = solPrep(), t0 = 0.2;
    var lw = Math.max(40, Math.min(L.sw - 2, 400));
    var lg = logoPrep(lw);
    var ox, oy, ih = 220, iw = 512;
    if (sol) { iw = sol.img.w; ih = sol.img.h; }
    /* l'horizon : en paysage vers 53 % de la hauteur ; en portrait, le sol touche le bas de l'écran */
    var hzy = L.portrait ? L.H - (ih - HORIZON_Y) : Math.max(Math.round(L.H * 0.53), (lg ? lg.bot - lg.top + 1 : 90) + L.y0 + 8);
    oy = hzy - HORIZON_Y; ox = Math.round((L.W - iw) / 2);
    var open = u < 0.22 ? Math.floor(clamp01(u / 0.22) * (ih / 2 + 2)) : -1;      // le tube s'allume
    if (sol) {
      if (oy > 0) ciel(oy, u);
      poser(sol.img, ox, oy, open >= 0 ? 4 : 0, open, null, false, -1, -1, 0, true);   // ciel et sol prolongés à part
      grille(ox, oy, iw, ih, u);
      if (oy + ih < L.H) g.rect(0, oy + ih, L.W, L.H - oy - ih, P.np);
    } else decor(u, hzy);
    if (open >= 0 && open < 3) g.rect(0, hzy - 1, L.W, 2, P.os);
    /* le logo : au-dessus de l'horizon, centré dans ce qu'il reste de ciel sûr */
    if (lg && u > t0) {
      var hgt = lg.bot - lg.top + 1;
      var skyTop = L.y0 + 2, skyBot = hzy - 4;
      var ly = Math.round(skyTop + Math.max(0, (skyBot - skyTop - hgt) / 2)) - lg.top;
      if (L.portrait) ly = Math.round(Math.max(skyTop, skyBot - hgt - Math.max(8, (skyBot - skyTop - hgt) * 0.45))) - lg.top;
      var lx = Math.round(L.x0 + (L.sw - lg.w) / 2);
      logoDraw(lg, u - t0, lx, ly, O.on && O.eclat && O.eclatT >= 0 && u - O.eclatT < 0.05 && u >= O.eclatT);
    }
  }
  function scBriefing(u, invite, tt) {
    var g = G();
    if (u < 0.3) scTitre(3 + u);
    var img = art('briefing');
    var dx = derive(tt, 0.11, -10, 10), dy = derive(tt, 0.3, -5, 5);
    var pos = null;
    if (img) {
      var by = L.portrait ? bandeauY(img.h) : null;
      pos = cadre(img.w, img.h, FOCAL.briefing, L.portrait ? dx : 0, L.portrait ? 0 : dy, by);
      var scan = Math.round(((tt * 90) % (L.H + 30)) - 15);
      poser(img, pos.x, pos.y, u < 0.3 ? 2 : 0, clamp01(u / 0.3), null, false, -1, scan, L.portrait ? 8 : 0);
    } else decor(tt, null);
    if (u < 0.3) return;                             // le fondu d'abord, le texte ensuite
    /* les trois lignes de mission, tapées lettre à lettre */
    var k = echelle(BRIEF, 2, 6), lh = 7 * k + 3 * k, n = lettres(u);
    var bw = 0; for (var i = 0; i < BRIEF.length; i++) bw = Math.max(bw, largeur(BRIEF[i], k));
    var bh = BRIEF.length * lh - 3 * k;
    var x = L.x0 + Math.max(4, Math.round((L.sw - bw) / 2)), y;
    var inv0 = invite2(), ph = inv0.lignes.length * 10 * inv0.k - 3 * inv0.k;   // place gardée pour l'invite :
    if (L.portrait && pos) y = Math.min(pos.y + (img ? img.h : 0) + 10, L.y1 - bh - ph - 24);   // le bloc ne saute pas
    else y = L.y1 - bh - 8 - (ph + 10);
    if (n > 0 || invite) plaque(x - 4 * k, y - 3 * k, bw + 8 * k, bh + 6 * k);
    var rest = n;
    for (var j = 0; j < BRIEF.length; j++) {
      var s = BRIEF[j], m = Math.max(0, Math.min(s.length, rest));
      var wd = m > 0 ? ecrire(s, x, y + j * lh, k, j === 0 ? P.jaune : P.os, m, false) : 0;
      if (m < s.length) {                            // la ligne en cours de frappe : un curseur bat à 3 Hz
        if (Math.floor(tt * 6) & 1) g.rect(x + wd + (m > 0 ? k : 0), y + j * lh, 4 * k, 7 * k, P.acier);
        break;
      }
      rest -= s.length;
    }
    /* l'invite : clignote à 1,25 Hz, jamais plus vite que trois fois par seconde */
    if (invite) {
      var inv = invite2(), on = ((tt * 1.25) % 1) < 0.7, il = inv.lignes, ik = inv.k, ilh = 10 * ik;
      var iy = L.portrait ? Math.min(L.y1 - il.length * ilh - 6, y + bh + 6 * k + 14) : L.y1 - il.length * ilh - 4;
      var iwm = 0; for (var q = 0; q < il.length; q++) iwm = Math.max(iwm, largeur(il[q], ik));
      plaque(Math.round(L.x0 + (L.sw - iwm) / 2) - 3 * ik, iy - 2 * ik, iwm + 6 * ik, il.length * ilh - 3 * ik + 4 * ik);
      if (on) for (var r = 0; r < il.length; r++) {
        var lw2 = largeur(il[r], ik);
        ecrire(il[r], Math.round(L.x0 + (L.sw - lw2) / 2), iy + r * ilh, ik, P.jaune, 99, false);
      }
    }
  }
  /* l'invite tient sur une ligne à l'échelle visée, sinon sur deux lignes à la même échelle */
  var INV = { key: '', v: null };
  function invite2() {
    var key = L.sw + '/' + L.px + '/' + isTouch() + '/' + !!(N.spr && N.spr.text);
    if (INV.key === key) return INV.v;
    INV.key = key; INV.v = invite2calc(); return INV.v;
  }
  function invite2calc() {
    var it = invTexte(), kv = Math.max(1, Math.min(2, Math.round(28 / (7 * L.px))));
    if (largeur(it, kv) <= L.sw - 12) return { lignes: [it], k: kv };
    var w = it.split(' '), best = null;
    for (var i = 1; i < w.length; i++) {
      var a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), m = Math.max(largeur(a, kv), largeur(b, kv));
      if (!best || m < best.m) best = { m: m, l: [a, b] };
    }
    if (best && best.m <= L.sw - 12) return { lignes: best.l, k: kv };
    return { lignes: [it], k: echelle([it], kv, 6) };
  }
  function invTexte() { return isTouch() ? 'TOUCHE POUR JOUER' : 'ESPACE POUR JOUER'; }
  function pauseTexte() {
    var k = echelle(['PAUSE'], 3, 6), w = largeur('PAUSE', k), x = Math.round(L.x0 + (L.sw - w) / 2), y = Math.round(L.H / 2 - 7 * k / 2);
    plaque(x - 4 * k, y - 3 * k, w + 8 * k, 7 * k + 6 * k);
    ecrire('PAUSE', x, y, k, P.os, 99, false);
  }

  /* ================================ les interludes ================================ */
  /* La dernière image du jeu, figée au moment de la transition : l'interlude fond par-dessus elle. Pendant
     l'interlude du colosse, 90-boot.js ne fait plus dessiner le jeu (S.phase vaut 'intro') : sans cette
     copie, le fondu partirait du noir. */
  var SNAP = { w: 0, h: 0, data: null };
  function figer() {
    var g = G(); if (!g || !g.buf || !g.buf()) { SNAP.w = 0; return; }
    var b = g.buf();
    if (!SNAP.data || SNAP.data.length !== b.length) SNAP.data = new Uint8Array(b.length);
    SNAP.data.set(b); SNAP.w = g.W; SNAP.h = g.H;
  }
  function transition(nom, opts) {
    if (nom !== 'boss' && nom !== 'victoire' && nom !== 'defaite') return false;
    if (!pal()) return false;
    var s = S(), prev = (I.nom === 'boss' && I.prev !== null) ? I.prev : s.phase;
    stopInterlude(false);
    I.nom = nom; I.t = 0; I.blk = nom === 'boss'; I.phase2 = false; I.typed = 0; I.bip = -1; I.vu = false;
    I.label = (opts && opts.nom) ? String(opts.nom).toUpperCase() : NOM_COLOSSE;
    figer();
    tick.frame = s.frame | 0;               // l'image de la demande ne compte pas : l'interlude part à 0
    /* les explosions et les débris en cours : 90-boot.js les dessinerait PAR-DESSUS le panneau */
    try { if (N.fx && N.fx.reset) N.fx.reset(); } catch (e) {}
    garde();
    if (nom === 'boss') {
      /* l'interlude prend la main : le jeu n'est plus ni mis à jour ni dessiné, il est gelé de fait */
      I.prev = prev; s.phase = 'intro';
      sfx('intro');                          // montée pendant ALERTE, impact à +1,95 s : le colosse est révélé
      clipOn('alerte'); I.clip = 'alerte'; clipPrep('boss');
    } else { I.prev = null; clipOn(nom); I.clip = nom; }
    journal('interlude ' + nom);
    return true;
  }
  function stopInterlude(silencieux) {
    if (I.clip) { clipOff(I.clip); I.clip = null; }
    if (I.nom && !silencieux) journal('fin ' + I.nom);
    var s = S();
    if (I.nom === 'boss' && I.prev !== null && s.phase === 'intro' && !O.on) s.phase = I.prev;   // le jeu reprend
    I.nom = null; I.blk = false; I.prev = null;
  }
  function finBoss(pourquoi) { journal(pourquoi + ' boss'); stopInterlude(true); }
  function avanceInterlude(dt) {
    I.t += dt;
    var sauter = geste(dt);
    if (I.nom === 'boss') {
      if (!I.phase2 && I.t >= ALERTE_D) { I.phase2 = true; if (I.clip) clipOff(I.clip); clipOn('boss'); I.clip = 'boss'; journal('colosse'); }
      if (I.t >= ALERTE_D + BOSS_D) { finBoss('fin'); return; }
      if (sauter) { finBoss('saut'); return; }
    } else if (!I.vu) {
      if (I.t >= FIN_REVELE || sauter) { I.vu = true; journal((sauter ? 'saut ' : 'revele ') + I.nom); if (sauter) I.t = Math.max(I.t, FIN_REVELE); }
    }
  }
  function drawInterlude() {
    var g = G(), t = I.nom === 'boss' ? (I.t < ALERTE_D ? clamp01(I.t / 0.12) : 1) : clamp01(I.t / FIN_REVELE);
    /* sous le fondu : la dernière image du jeu, figée */
    if (t < 1 && SNAP.data && SNAP.w === g.W && SNAP.h === g.H && g.buf().length === SNAP.data.length) g.buf().set(SNAP.data);
    /* l'interlude couvre tout l'écran : là où le panneau ne va pas (bandeau du portrait), un voile de vide
       au même seuil de Bayer que la révélation, pour que le jeu s'efface d'un seul geste */
    if (L.portrait && g.ditherRect) g.ditherRect(0, 0, L.W, L.H, P.vide, t);
    if (I.nom === 'boss') { if (I.t < ALERTE_D) scAlerte(I.t); else scBoss(I.t - ALERTE_D); }
    else scFin(I.nom, I.t);
    if (S().paused) pauseTexte();
  }
  function scAlerte(u) {
    var g = G(), img = art('alerte'), B = g.buf(), W = g.W, H = g.H;
    var beat = Math.floor(u * 4) & 1;                // 2 Hz, sur le seul texte : petite surface
    if (img) {
      var by = L.portrait ? bandeauY(img.h) : null;
      var pos = cadre(img.w, img.h, FOCAL.alerte, 0, derive(u, 0.2, -3, 3), by);
      poser(img, pos.x, pos.y, u < 0.12 ? 2 : 0, clamp01(u / 0.12), null, false, -1, -1, L.portrait ? 8 : 0);
      /* le gyrophare : une bande étroite qui balaie la salle et la rougit d'un cran. Elle bouge, elle ne
         clignote pas : sur une aire de 74 x 74 pixels, la luminance moyenne varie de moins de 0,1. */
      var bx = Math.round(((u * 300) % (W + 40)) - 20), y0 = L.portrait ? pos.y : 0, y1 = L.portrait ? pos.y + img.h : H;
      for (var x = bx; x < bx + 10; x++) {
        if (x < 0 || x >= W) continue;
        for (var y = Math.max(0, y0); y < Math.min(H, y1); y++) B[y * W + x] = ALARM[B[y * W + x]];
      }
    } else g.rect(0, 0, W, H, P.sang);
    /* rubans de danger en haut et en bas de la zone sûre, qui défilent par pas entiers */
    var rh = Math.max(4, Math.round(Math.min(L.sh, L.sw) * 0.05)), off = Math.floor(u * 40);
    ruban(L.y0 + 2, rh, off); ruban(L.y1 - 2 - rh, rh, -off);
    /* cadre en pointillés qui courent le long du bord : l'urgence par le mouvement, pas par l'éclair */
    var fx0 = L.x0 + 2, fy0 = L.y0 + rh + 5, fw = L.sw - 4, fh = L.sh - 2 * rh - 10, run = Math.floor(u * 60);
    cadreCourant(fx0, fy0, fw, fh, 2, run);
    var k = echelle(['ALERTE'], L.px >= 4 ? 3 : 4, 10), tw = largeur('ALERTE', k);
    var tx = Math.round(L.x0 + (L.sw - tw) / 2), ty = Math.round(L.y0 + (L.sh - 7 * k) / 2);
    if (L.portrait && img) ty = Math.min(L.y1 - rh - 7 * k - 16, Math.round(L.H * 0.34 + img.h + 14));
    plaque(tx - 4 * k, ty - 3 * k, tw + 8 * k, 13 * k);
    ecrire('ALERTE', tx, ty, k, beat ? P.os : P.magenta, 99, false);
  }
  /* un cadre de pointillés magenta et nuit profonde, épais de e, qui tournent autour du rectangle */
  function cadreCourant(x, y, w, h, e, run) {
    var g = G(), B = g.buf(), W = g.W, H = g.H, per = 2 * (w + h);
    for (var t = 0; t < per; t++) {
      var px, py, nx = 0, ny = 0;
      if (t < w) { px = x + t; py = y; ny = 1; }
      else if (t < w + h) { px = x + w - 1; py = y + (t - w); nx = -1; }
      else if (t < 2 * w + h) { px = x + w - 1 - (t - w - h); py = y + h - 1; ny = -1; }
      else { px = x; py = y + h - 1 - (t - 2 * w - h); nx = 1; }
      var c = ((t + run) % 14) < 9 ? P.magenta : P.np;
      for (var i = 0; i < e; i++) {
        var qx = px + nx * i, qy = py + ny * i;
        if (qx >= 0 && qy >= 0 && qx < W && qy < H) B[qy * W + qx] = c;
      }
    }
  }
  function ruban(y, h, off) {
    var g = G(), B = g.buf(), W = g.W, H = g.H;
    for (var yy = y; yy < y + h; yy++) {
      if (yy < 0 || yy >= H) continue;
      for (var x = 0; x < W; x++) B[yy * W + x] = (((x + yy + off) % 12 + 12) % 12) < 6 ? P.magenta : P.np;
    }
  }
  function scBoss(u) {
    var g = G(), img = art('boss');
    if (!img) { decor(u, null); return; }
    var by = L.portrait ? bandeauY(img.h) : null;
    var pos = cadre(img.w, img.h, FOCAL.boss, derive(u, 0.12, 6, -6), derive(u, 0.18, 4, -4), by);
    /* révélation de bas en haut, front brûlant, 0,7 s, sur le noir : le monde gelé ne transparaît pas */
    var front = Math.round(img.h - clamp01(u / 0.7) * (img.h + 2));
    if (u < 0.7) g.rect(0, 0, L.W, L.H, P.np);
    var scan = Math.round(((u * 120) % (L.H + 30)) - 15);
    poser(img, pos.x, pos.y, u < 0.7 ? 3 : 0, pos.y + front, null, false, -1, u < 0.7 ? -1 : scan, L.portrait ? 8 : 0);
    /* l'œil s'allume quand la révélation l'atteint, puis bat à 2,5 Hz sur une petite surface */
    if (front <= OEIL[1]) {
      var ex = pos.x + OEIL[0], ey = pos.y + OEIL[1], beat = (Math.floor(u * 5) & 1) === 0;
      g.ditherCirc(ex, ey, beat ? 7 : 5, P.ambre, 0.5); g.circ(ex, ey, beat ? 3 : 2, P.jaune); g.px(ex, ey, P.os);
      g.line(ex - (beat ? 22 : 14), ey, ex + (beat ? 22 : 14), ey, P.ambre);
    }
    /* le nom du colosse, lettre à lettre, sous l'image */
    if (u > 0.55) {
      var nom = I.label, k = echelle([nom], 3, 8), w = largeur(nom, k), n = Math.floor((u - 0.55) / 0.05) + 1;
      var x = Math.round(L.x0 + (L.sw - w) / 2), y = L.portrait ? Math.min(pos.y + img.h + 12, L.y1 - 7 * k - 8) : L.y1 - 7 * k - 10;
      plaque(x - 4 * k, y - 3 * k, w + 8 * k, 13 * k);
      ecrire(nom, x, y, k, P.os, n, false);
      var sub = 'COLOSSE', ks = Math.max(1, k - 1), sw = largeur(sub, ks);
      if (u > 0.9) ecrire(sub, Math.round(L.x0 + (L.sw - sw) / 2), y - 7 * ks - 3 * k - 4, ks, P.magenta, 99, true);
    }
  }
  function scFin(nom, u) {
    var img = art(nom);
    if (!img) { decor(u, null); return; }
    var by = L.portrait ? bandeauY(img.h) : null;
    var pos = cadre(img.w, img.h, FOCAL[nom], derive(u, 0.25, -8, 8), derive(u, 0.4, -3, 3), by);
    var shim = Math.floor(u * 45);
    poser(img, pos.x, pos.y, u < FIN_REVELE ? 2 : 0, clamp01(u / FIN_REVELE), null, true, shim, -1, L.portrait ? 8 : 0);
  }

  /* ================================ horloge et face publique ================================ */
  function avance(dt) {
    var s = S();
    tick.frame = s.frame | 0;
    if (s.paused) { wasPaused = true; return; }
    if (wasPaused) { wasPaused = false; garde(); }   // le toucher qui a repris ne saute rien
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    if (O.on) avanceOuverture(dt);
    else if (I.nom) avanceInterlude(dt);
  }
  function update(dt) { if (!pal()) return; avance(dt); }
  function draw() {
    if (!pal() || !G() || !G().buf) return;
    var s = S();
    if (tick.frame !== (s.frame | 0)) avance(s.dt || 0);      // personne n'a appelé update() : on avance seul
    layout();
    if (O.on) drawOuverture();
    else if (I.nom) drawInterlude();
  }

  N.intro = {
    reset: reset,
    update: update,
    draw: draw,
    transition: transition,
    busy: function () { return I.nom === 'boss'; },
    current: function () { return I.nom; },
    stop: function () { stopInterlude(false); },
    skip: function () { if (O.on) finOuverture('saut'); else if (I.nom === 'boss') finBoss('saut'); else if (I.nom) { I.vu = true; I.t = Math.max(I.t, FIN_REVELE); } },
    state: function () {
      return { mode: O.on ? 'ouverture' : (I.nom ? 'interlude' : null), etape: O.on ? ETAPES[O.k].nom : I.nom,
        t: O.on ? O.t : I.t, u: O.on ? O.u : I.t, guard: G_.t < GARDE, armed: G_.armed, typed: O.typed,
        busy: I.nom === 'boss', phase: S().phase };
    },
    log: LOG,
    ETAPES: ETAPES,
    GARDE: GARDE
  };
})();
