/* ===== tools/rendu/mire.js — mire de démonstration du rendu =====

   À QUOI ÇA SERT. Montrer, à l'écran et en vrai, tout ce que 00-pal.js, 10-gfx.js et 20-crt.js
   mettent à disposition. Si tu écris 40-sprites.js, 50-fx.js, 60-intro.js ou 70-game.js, regarde
   cette mire avant d'inventer quoi que ce soit : chaque primitive y est dessinée, étiquetée, avec
   la ligne de code qui la produit juste en dessous dans ce fichier.

   CE N'EST PAS UN MODULE. Il ne vit pas dans src/, il n'est pas dans le bundle, il ne commande rien.
   Il s'injecte dans la page déjà démarrée et prend la place du dessin d'intro le temps de regarder.

   COMMENT LA VOIR :
     cd proto-neon && /opt/node22/bin/node tools/rendu/voir.mjs
       -> écrit tools/rendu/out/*.png (bureau et iPhone, tube actif et tube coupé)
       -> écrit tools/rendu/mire.html, page autonome à ouvrir directement
     ou, dans la console de la page : coller ce fichier puis window.__MIRE.install()

   Touches dans la page : ESPACE gèle l'animation, FLÈCHES changent de régime de tube.
*/
(function () {
  'use strict';
  var W = (typeof window !== 'undefined') ? window : globalThis;
  var N = W.__N || (W.__N = {});

  /* ---------- police 5x7 locale ----------
     Elle existe UNIQUEMENT pour étiqueter la mire. La vraie police du jeu est N.spr.text, qui
     appartient à 40-sprites.js. Si ce module existe, la mire l'utilise à la place de celle-ci. */
  var F = {
    'A': [14, 17, 17, 31, 17, 17, 17], 'B': [30, 17, 17, 30, 17, 17, 30], 'C': [14, 17, 16, 16, 16, 17, 14],
    'D': [30, 17, 17, 17, 17, 17, 30], 'E': [31, 16, 16, 30, 16, 16, 31], 'F': [31, 16, 16, 30, 16, 16, 16],
    'G': [14, 17, 16, 19, 17, 17, 14], 'H': [17, 17, 17, 31, 17, 17, 17], 'I': [31, 4, 4, 4, 4, 4, 31],
    'J': [7, 2, 2, 2, 2, 18, 12], 'K': [17, 18, 20, 24, 20, 18, 17], 'L': [16, 16, 16, 16, 16, 16, 31],
    'M': [17, 27, 21, 17, 17, 17, 17], 'N': [17, 25, 21, 19, 17, 17, 17], 'O': [14, 17, 17, 17, 17, 17, 14],
    'P': [30, 17, 17, 30, 16, 16, 16], 'Q': [14, 17, 17, 17, 21, 18, 13], 'R': [30, 17, 17, 30, 20, 18, 17],
    'S': [15, 16, 16, 14, 1, 1, 30], 'T': [31, 4, 4, 4, 4, 4, 4], 'U': [17, 17, 17, 17, 17, 17, 14],
    'V': [17, 17, 17, 17, 17, 10, 4], 'W': [17, 17, 17, 21, 21, 27, 17], 'X': [17, 17, 10, 4, 10, 17, 17],
    'Y': [17, 17, 10, 4, 4, 4, 4], 'Z': [31, 1, 2, 4, 8, 16, 31],
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 31], '2': [14, 17, 1, 2, 4, 8, 31],
    '3': [30, 1, 1, 14, 1, 1, 30], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
    '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 4, 4, 4], '8': [14, 17, 17, 14, 17, 17, 14],
    '9': [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
    ':': [0, 12, 12, 0, 12, 12, 0], '/': [1, 2, 2, 4, 8, 8, 16], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '%': [17, 18, 2, 4, 8, 18, 17], '!': [4, 4, 4, 4, 4, 0, 4],
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], ',': [0, 0, 0, 0, 0, 4, 8],
    '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '*': [0, 10, 4, 31, 4, 10, 0]
  };

  function txt(s, x, y, ci) {
    var g = N.gfx;
    s = String(s).toUpperCase();
    for (var k = 0; k < s.length; k++) {
      var rows = F[s.charAt(k)];
      if (!rows) { continue; }
      for (var r = 0; r < 7; r++) {
        var bits = rows[r];
        for (var c = 0; c < 5; c++) if (bits & (16 >> c)) g.px(x + k * 6 + c, y + r, ci);
      }
    }
    return x + s.length * 6;
  }

  /* ---------- un sprite procédural, pour montrer blit ----------
     Format imposé par CONTRAT.md : {w,h,data:Uint8Array d'index de palette}, 0 = transparent. */
  function spriteEnnemi() {
    var p = N.pal, m = p.i('magenta'), s = p.i('sang'), r = p.i('rosePale'), o = p.i('os');
    var A = [
      '.m...m.',
      '..mmm..',
      '.mmmmm.',
      'mmomomm',
      'mmmrmmm',
      '.ssmss.',
      's.s.s.s'
    ];
    var key = { '.': 0, 'm': m, 's': s, 'r': r, 'o': o };
    var d = new Uint8Array(7 * 7);
    for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
      var ch = A[y].charAt(x) || '.';
      d[y * 7 + x] = key[ch] === undefined ? 0 : key[ch];
    }
    return { w: 7, h: 7, data: d };
  }

  /* Un quart de disque plein : c'est le motif du critère (a). Son bord est courbe, donc si quoi que
     ce soit lissait, on verrait des valeurs intermédiaires exactement ici. */
  function spriteBord(r) {
    var p = N.pal, ci = p.i('cyanPale');
    var d = new Uint8Array(r * r);
    for (var y = 0; y < r; y++) for (var x = 0; x < r; x++) {
      d[y * r + x] = (x * x + y * y) <= r * r ? ci : 0;
    }
    return { w: r, h: r, data: d };
  }

  var ENN = null, BORD = null;
  var T = 0, boomT = 1.4, boomX = 0, boomY = 0, boomN = 0, gele = false;
  var REGIMES = ['riche', 'sobre', 'pur', 'coupe'];
  var regime = 0, lastDir = 0;

  function update(dt) {
    if (gele) dt = 0;
    T += dt;

    /* rendre la secousse et le halo mesurables : une explosion toutes les 1,6 s */
    boomT -= dt;
    if (boomT <= 0) {
      boomT = 1.6;
      boomN++;
      var g = N.gfx;
      boomX = (g.W * (0.30 + 0.40 * ((boomN * 0.37) % 1))) | 0;
      boomY = (g.H * 0.74) | 0;
      if (N.S) { N.S.shake = 9; N.S.heat = 1; }
      if (N.fx && N.fx.boom) N.fx.boom(boomX, boomY, 0.9, N.pal.i('brasier'));
    }

    /* régime de tube au clavier, sans dépendre d'un écouteur à nous */
    var inp = N.S && N.S.input;
    if (inp) {
      var dir = inp.x | 0;
      if (dir && dir !== lastDir) {
        regime = (regime + (dir > 0 ? 1 : REGIMES.length - 1)) % REGIMES.length;
        if (N.crt && N.crt.preset) N.crt.preset(REGIMES[regime]);
      }
      lastDir = dir;
      gele = !!inp.fire;
    }
  }

  function draw() {
    var g = N.gfx, p = N.pal;
    if (!g || !p || !g.W) return;
    if (!ENN) { ENN = spriteEnnemi(); BORD = spriteBord(13); }
    var W = g.W, H = g.H, PX = g.PX;
    var os = p.i('os'), ac = p.i('acier'), cy = p.i('cyan'), cyp = p.i('cyanPale');
    var mg = p.i('magenta'), am = p.i('ambre'), ja = p.i('jaune'), br = p.i('brasier');
    var vi = p.i('violet'), ind = p.i('indigo'), np = p.i('nuitProfonde');

    g.clear(p.i('vide'));

    /* ---- fond : grille de sol en fuite, pour que le néon ait quelque chose à mordre ---- */
    var hz = (H * 0.40) | 0;
    for (var gi = 1; gi <= 9; gi++) {
      var yy = hz + ((H - hz) * (gi * gi) / 81) | 0;
      g.line(0, yy, W - 1, yy, gi > 6 ? ind : vi);
    }
    for (var gx = -6; gx <= 6; gx++) {
      g.line((W >> 1) + gx * 7, hz, (W >> 1) + gx * ((W / 7) | 0), H - 1, gx === 0 ? ind : vi);
    }
    g.rect(0, hz - 1, W, 1, np);

    var y = 1;

    /* ---- titre ---- */
    txt('NEON 2084  MIRE DE RENDU', 2, y, os);
    txt('PX=' + PX + ' BUF=' + W + 'X' + H + ' TUBE=' + (REGIMES[regime]), 2, y + 8, ac);
    y += 18;

    /* ---- 1. la table des seize ----  N.pal.C / N.pal.i(nom) */
    var sw = ((W - 4) / 16) | 0, sh = 13;
    for (var c = 0; c < 16; c++) {
      g.rect(2 + c * sw, y, sw - 1, sh, c);                   /* ci = l'index lui-même */
      var lab = c < 10 ? ('0' + c) : String(c);
      txt(lab, 2 + c * sw + ((sw - 13) >> 1), y + 3, p.LUM[c] > 0.45 ? np : os);
    }
    txt('16 COULEURS  PAL.C  PAL.I(NOM)', 2, y + sh + 1, ac);
    y += sh + 10;

    /* ---- 2. tramage de Bayer contre ombrage de palette ----
       en haut  : g.ditherRect(..., t)      un dégradé se FAIT au tramage
       en bas   : p.shade(ci, k)            assombrir SANS sortir de la table */
    var rh = 7;
    for (var i = 0; i < W - 4; i++) {
      var t = i / (W - 5);
      g.ditherRect(2 + i, y, 1, rh, mg, t);
      g.rect(2 + i, y + rh + 1, 1, rh, p.shade(cy, t));
    }
    txt('DITHER(X,Y,T)', 3, y + 1, os);
    txt('SHADE(CI,K)', 3, y + rh + 2, np);
    y += rh * 2 + 3;

    /* ---- 3. les primitives, une par une ---- */
    var bx = 4, by = y + 2, cell = 30;
    function etiq(n, s) { txt(s, bx + n * cell, by + 27, ac); }

    g.rect(bx + 4, by + 4, 18, 18, ind); etiq(0, 'RECT');

    for (var a = 0; a < 7; a++) {
      g.line(bx + cell + 14, by + 22, bx + cell + 2 + a * 4, by + 3, a & 1 ? cy : cyp);
    }
    etiq(1, 'LINE');

    g.circ(bx + cell * 2 + 14, by + 13, 9, am); etiq(2, 'CIRC');

    g.ring(bx + cell * 3 + 14, by + 13, 11, ja, 1);
    g.ring(bx + cell * 3 + 14, by + 13, 8, ja, 0.6);
    g.ring(bx + cell * 3 + 14, by + 13, 5, ja, 0.25);
    etiq(3, 'RING T');

    g.ditherCirc(bx + cell * 4 + 14, by + 13, 11, br, 0.55); etiq(4, 'DCIRC');

    g.disc(bx + cell * 5 + 14, by + 13, 6, 11, br, 0.7);
    g.disc(bx + cell * 5 + 14, by + 13, 0, 4, p.i('os'), 1);
    etiq(5, 'DISC');

    /* blit : normal, miroir X, miroir Y, encre remplacée */
    var bxx = bx + cell * 6;
    if (bxx + 30 < W) {
      g.blit(ENN, bxx + 2, by + 4);
      g.blit(ENN, bxx + 11, by + 4, { flipX: true });
      g.blit(ENN, bxx + 2, by + 13, { flipY: true });
      g.blit(ENN, bxx + 11, by + 13, { ci: 'cyan' });
      etiq(6, 'BLIT');
    }

    /* le motif du critère (a) : un bord courbe, à une position connue et notée en haut à gauche */
    var ex = W - 18, ey = by + 2;
    if (ex > bxx + 24) {
      g.blit(BORD, ex, ey, { flipX: true });
      txt('BORD', ex - 4, ey + 16, ac);
    }
    y = by + 36;

    /* ---- 4. texte, et l'explosion animée ---- */
    if (y + 10 < H) {
      txt('CYAN = LA JOUEUSE, ET ELLE SEULE', 2, y, cy);
      y += 9;
    }

    /* explosion : des anneaux concentriques tramés qui s'étendent et se trouent.
       En gros pixels une explosion est une FORME, pas un flou. */
    var age = 1.6 - boomT;
    if (boomN > 0 && age < 0.85) {
      var k = age / 0.85;
      var rmax = Math.min(W, H) * 0.42;
      var r0 = rmax * k;
      g.disc(boomX, boomY, r0 * 0.55, r0, br, 1 - k * 0.85);
      g.disc(boomX, boomY, r0 * 0.28, r0 * 0.6, p.i('ambre'), 0.8 - k * 0.7);
      g.ditherCirc(boomX, boomY, r0 * 0.3 * (1 - k), p.i('os'), 1 - k);
      g.ring(boomX, boomY, r0 * 1.12, p.i('jaune'), 0.5 * (1 - k));
    }

    /* ---- pied : ce qu'il faut savoir ---- */
    var fy = H - 8;
    txt('FLECHES=TUBE  ESPACE=GEL  BOOM ' + boomN, 2, fy, p.shade(os, 0.8));
  }

  var MIRE = {
    install: function () {
      N.intro = { reset: function () { }, update: update, draw: draw };
      if (N.S) N.S.phase = 'intro';
      if (N.crt && N.crt.preset) N.crt.preset(REGIMES[regime]);
      W.__MIRE_ON = true;
      return true;
    },
    regime: function (nom) {
      var k = REGIMES.indexOf(nom);
      if (k >= 0) { regime = k; if (N.crt && N.crt.preset) N.crt.preset(nom); }
      return REGIMES[regime];
    },
    gel: function (v) { gele = !!v; },
    temps: function (v) { T = v; boomT = 1.6 - v; boomN = 1; },
    update: update, draw: draw, txt: txt,
    spriteEnnemi: spriteEnnemi, spriteBord: spriteBord
  };
  W.__MIRE = MIRE;
})();
