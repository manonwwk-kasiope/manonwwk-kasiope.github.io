/* ===== 20-crt.js — le tube cathodique : balayage, aberration, halo, vignette, secousse =====

   Appelé par 90-boot.js APRÈS N.gfx.present(). Il travaille en pixels d'ÉCRAN, et c'est volontaire :
   un balayage vit ENTRE les deux rangs d'un gros pixel, et une frange de chrominance vit SOUS le gros
   pixel. Les faire dans le tampon coûterait la moitié de la résolution verticale.

   COMMENT, ET POURQUOI COMME ÇA — l'histoire est dans les mesures, profil iPhone 13 paysage, budget 2 ms :
     1. composition de canvas (copie, masque de canal, addition, voile multiplicatif) ... 7,1 ms.
        Treize opérations pleine surface à environ 0,47 ms chacune en rastérisation logicielle.
     2. une passe par pixel avec des multiplications flottantes ........................ 2,1 ms.
     3. la même passe, mais par TABLES ENTIÈRES, et l'aberration seulement là où un vrai tube en a,
        c'est-à-dire sur les bords ..................................................... voir banc.mjs.
   Donc : UNE passe qui régénère le canvas de sortie depuis le tampon de jeu. Le balayage, la grille
   d'ouverture, la vignette et l'atténuation sont encodés dans des tables indexées par
   (sous-rang, sous-colonne, niveau de vignette, index de palette) ; l'échantillonnage d'une rangée est
   amorti sur ses px sous-rangs ; il reste UNE opération de composition par image, pour le halo.

   DEUX RÉGIMES, ET LA RAISON ARITHMÉTIQUE QUI LES SÉPARE :

   - « riche » (défaut). Tables à vraie atténuation, séparation des canaux sur les bords, halo additif.
     C'est le rendu à regarder. Il MÉLANGE : « magenta » atténué à 56 % ne tombe sur aucune des seize
     entrées, et une frange de chrominance prend le rouge d'un pixel et le bleu du voisin. Le critère 2
     de DIRECTION.md (100 % des pixels dans la table, tolérance zéro) ne peut donc PAS être tenu avec
     ce régime actif : un mélange de deux couleurs d'une table de seize n'appartient presque jamais à
     cette table. Ce n'est pas un arbitrage de goût, c'est de l'arithmétique.

   - « pur » (N.crt.pure = true). Même passe, mais les tables SNAPPENT chaque atténuation sur la palette
     (N.pal.shade) et la séparation des canaux est coupée. Balayage et vignette sont donc rendus en
     vraies couleurs de la table : 100 % des pixels restent dans les seize AVEC le post-traitement
     actif. C'est le régime où le critère 2 se mesure sans rien couper, et c'est au passage un vrai
     look de moniteur d'arcade à faible luminosité.

   N.crt.off = true coupe tout et laisse intacte la sortie de present().
   Réglages de 0 à 1 : scan, grille, vig, ab, bloom.  N.crt.preset('riche'|'sobre'|'pur'|'coupe').
   N.crt.stats décrit la dernière image, pour les mesures.

   LA SECOUSSE EST UNE CAMÉRA, PAS UN TIRAGE. N.S.shake (pixels de jeu, écrit par 50-fx.js) en donne
   l'amplitude, inchangée ici. La caméra est une masse sur un ressort amorti (5,2 Hz, amortissement 0,32)
   qui suit une cible lisse : un bruit de valeur à deux octaves, mis à l'échelle de l'amplitude. Un coup,
   c'est-à-dire une montée de N.S.shake d'une image à l'autre, LANCE la caméra de la hauteur de la montée ;
   le ressort la ramène en un rebond franc, puis presque rien. Elle ne sort jamais du disque de rayon
   N.S.shake : quand l'amplitude retombe à zéro, la caméra est exactement au repos. Le décalage est arrondi
   au pixel de jeu, et il décale le halo comme l'image : aucun fantôme.
   Le temps de la caméra est le temps réel, gel d'image compris, comme le trauma de 50-fx.js.

   DIRECTION FACULTATIVE : N.S.shakeX, N.S.shakeY, vecteur unitaire écrit par qui secoue (le jeu, les
   explosions) au moment du coup, juste avant ou après N.fx.shake : la direction d'un tir, ou celle qui va
   de la joueuse vers un impact. La caméra part À L'OPPOSÉ (recul), l'image glisse donc dans le sens du
   vecteur. C'est un ÉVÉNEMENT : 20-crt.js le remet à zéro dès qu'un coup l'a employé, ou au bout de
   0,12 s s'il n'a servi à aucun coup. Sans direction, chaque coup part à plus de 90° du précédent.
   N.crt.stats.ox, .oy : le décalage de la caméra appliqué à la dernière image, en pixels de jeu
   (x positif : la caméra est partie à droite, l'image à gauche).

   Rien ici ne lit l'horloge (le temps arrive par dt), rien n'écrit de couleur (tout vient de N.pal),
   et le générateur partagé N.rnd n'est jamais consommé : la secousse a son propre bruit local, pour
   ne pas perturber la reproductibilité du jeu à graine fixe.
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  var VIGN = 16;                 /* niveaux de vignette */
  var AOP = 0xff000000;          /* alpha opaque */

  var out = null, octx = null;
  var OW = 0, OH = 0, PX = 0, GW = 0, GH = 0;
  var img = null, u32 = null;    /* l'image de sortie, régénérée à chaque appel */
  var TA = null;                 /* table compacte : la couleur entière, quand aucun canal ne bouge */
  var TR = null, TG = null, TB = null;   /* un canal atténué chacun, pour la séparation */
  var SB = null;                 /* base de table par (sous-rang, sous-colonne) */
  var VGg = null;                /* niveau de vignette par pixel de JEU, déjà multiplié par 16 */
  var ABD = null;                /* 1 si cette colonne de jeu subit l'aberration, 0 sinon */
  var DRt = null, DBt = null;    /* décalage en colonnes de jeu, par (décalage, sous-colonne) */
  var KM = null, KL = null, KR = null;   /* une rangée échantillonnée, amortie sur les sous-rangs */
  var glow = null, gctx = null, gimg = null, g32 = null, gw = 0, gh = 0;
  var HCA = null, HCB = null;    /* colonnes du tampon lues par chaque texel de halo, décalage compris (-1 : dehors) */
  var GL = null, GWT = null;     /* couleur et poids de halo par index de palette */
  var VIDEI = 15;                /* « nuitProfonde » : ce que la secousse découvre */
  var key = '';

  /* bruit local déterministe : surtout pas N.rnd, qui appartient au jeu */
  var nseed = 2084 >>> 0;
  function nrnd() { nseed = (nseed * 1664525 + 1013904223) >>> 0; return nseed / 4294967296; }

  /* ================= la caméra de la secousse ================= */
  var CAM_F = 5.2;               /* fréquence propre du ressort, Hz : un rebond lisible, pas un frisson */
  var CAM_Z = 0.32;              /* amortissement (1 = critique) : un retour franc, un rebond à 35 %, puis rien */
  var CAM_N = 0.3;               /* la cible lisse, en fraction de l'amplitude : un grondement sous les coups, pas plus */
  var CAM_NF = 3.6;              /* nœuds du bruit lisse par seconde ; une octave à x2,3 */
  var CAM_HIT = 0.3;             /* une montée de N.S.shake de plus que ça d'une image à l'autre est un coup */
  var DIR_TTL = 0.12;            /* une direction qu'aucun coup n'a employée s'efface après ce délai, s */
  var HS_SLOW = 0.08;            /* 90-boot.js multiplie dt par 0,08 pendant un gel : on retrouve le temps réel */
  var cam = { x: 0, y: 0, vx: 0, vy: 0, a: 0, t: 0, ka: 0, dx: 0, dy: 0, dAge: 0, ox: 0, oy: 0 };

  /* bruit de valeur 1D, raccord quintique (dérivées première et seconde continues), dans [-1, 1] */
  function hash1(i, s) {
    var v = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(s + 1, 0x9e3779b1);
    v ^= v >>> 15; v = Math.imul(v, 0x85ebca6b); v ^= v >>> 13; v = Math.imul(v, 0xc2b2ae35); v ^= v >>> 16;
    return (v >>> 0) / 4294967296;
  }
  function vnoise(t, s) {
    var i = Math.floor(t), f = t - i, a = hash1(i, s), b = hash1(i + 1, s);
    f = f * f * f * (f * (f * 6 - 15) + 10);
    return (a + (b - a) * f) * 2 - 1;
  }
  function lisse(t, s) { return 0.7 * vnoise(t * CAM_NF, s) + 0.3 * vnoise(t * CAM_NF * 2.3, s + 7); }

  /* avance la caméra de dt et range dans cam.ox, cam.oy le décalage entier de cette image */
  function camera(dt, S) {
    var rdt = +dt || 0;
    if (rdt < 0) rdt = 0;
    if (rdt > 0 && N.fx && N.fx.frozen) { try { if (N.fx.frozen()) rdt /= HS_SLOW; } catch (e) { /* 50-fx absent */ } }
    if (rdt > 0.05) rdt = 0.05;
    var A = +S.shake || 0;
    if (!(A > 0)) A = 0;
    if (A > 64) A = 64;

    /* la direction facultative : on note quand elle change, pour effacer celle qu'aucun coup n'emploie */
    var sx = +S.shakeX || 0, sy = +S.shakeY || 0, sl = Math.sqrt(sx * sx + sy * sy), used = false;
    if (!(sl > 0.01 && sl < 1e6)) sl = 0;
    if (sl === 0) { cam.dx = 0; cam.dy = 0; cam.dAge = 0; }
    else if (sx !== cam.dx || sy !== cam.dy) { cam.dx = sx; cam.dy = sy; cam.dAge = 0; }
    else cam.dAge += rdt;

    /* le ressort, vers une cible lisse ; pas de 1/240 s au plus, intégration semi-implicite */
    cam.t += rdt;
    var tx = A * CAM_N * lisse(cam.t, 1), ty = A * CAM_N * lisse(cam.t, 2);
    var w = 6.2831853 * CAM_F, w2 = w * w, z2 = 2 * CAM_Z * w;
    var n = Math.ceil(rdt * 240), h = n ? rdt / n : 0;
    for (var i = 0; i < n; i++) {
      cam.vx += (w2 * (tx - cam.x) - z2 * cam.vx) * h;
      cam.vy += (w2 * (ty - cam.y) - z2 * cam.vy) * h;
      cam.x += cam.vx * h; cam.y += cam.vy * h;
    }

    /* un coup : la caméra est lancée de la hauteur de la montée, dans la direction du coup, en partant
       au moins du centre ; la vitesse qu'elle avait le long de cet axe est oubliée. Posé APRÈS le pas de
       ressort : l'image de l'impact montre la poussée entière, le retour commence à la suivante. */
    if (A > cam.a + CAM_HIT) {
      var kx, ky;
      if (sl > 0) { kx = -sx / sl; ky = -sy / sl; cam.ka = Math.atan2(ky, kx); used = true; }
      else { cam.ka += 1.5707963 + nrnd() * 3.1415927; kx = Math.cos(cam.ka); ky = Math.sin(cam.ka); }
      var along = cam.x * kx + cam.y * ky, push = (along > 0 ? along : 0) + (A - cam.a);
      cam.x += (push - along) * kx; cam.y += (push - along) * ky;
      var va = cam.vx * kx + cam.vy * ky;
      cam.vx -= va * kx; cam.vy -= va * ky;
    }
    if (sl > 0 && (used || cam.dAge > DIR_TTL)) { S.shakeX = 0; S.shakeY = 0; cam.dx = 0; cam.dy = 0; cam.dAge = 0; }

    /* jamais plus loin que l'amplitude écrite par 50-fx.js : la paroi absorbe la vitesse sortante */
    var r = Math.sqrt(cam.x * cam.x + cam.y * cam.y);
    if (r > A) {
      if (A <= 0) { cam.x = 0; cam.y = 0; cam.vx = 0; cam.vy = 0; }
      else {
        var ux = cam.x / r, uy = cam.y / r, vr = cam.vx * ux + cam.vy * uy;
        cam.x = ux * A; cam.y = uy * A;
        if (vr > 0) { cam.vx -= vr * ux; cam.vy -= vr * uy; }
      }
    }
    if (cam.x !== cam.x || cam.y !== cam.y || cam.vx !== cam.vx || cam.vy !== cam.vy) { cam.x = 0; cam.y = 0; cam.vx = 0; cam.vy = 0; }
    cam.a = A;
    cam.ox = Math.round(cam.x); cam.oy = Math.round(cam.y);
  }

  function mk(w, h) {
    if (typeof document !== 'undefined' && document.createElement) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
    }
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    return null;
  }
  function c01(v) { return v > 1 ? 1 : (v > 0 ? v : 0); }

  /* ---- profils ----
     Le dernier sous-rang du gros pixel est la ligne morte entre deux balayages ; à px = 2 on obtient
     un rang clair et un rang sombre, le motif d'arcade canonique. La grille d'ouverture fait la même
     chose en vertical, bien plus discrètement. */
  function scanF(sub, px, k) {
    if (px <= 1) return 1;
    if (sub === px - 1) return 1 - 0.44 * k;
    if (sub === 0) return 1 - 0.06 * k;
    return 1;
  }
  function grilleF(sub, px, k) {
    if (px <= 1) return 1;
    return sub === px - 1 ? 1 - 0.12 * k : 1;
  }

  /* ---- halo : QUI rayonne est un choix d'auteur, pas un seuil de luminance ----
     La joueuse et les explosions rayonnent. Le treillis de sol, jamais : c'est lui qui ferait une
     tache blanche en se cumulant sur toute la surface. */
  var GLOW = {
    cyan: 0.85, cyanPale: 1.00, os: 1.00, jaune: 0.90, brasier: 1.00,
    ambre: 0.80, rosePale: 0.60, magenta: 0.55
  };

  var BAY1 = [0, 2, 1, 3];       /* tramage à une dimension, pour la montée de l'aberration */

  function buildTables() {
    var P = N.pal;
    VIDEI = P.i('nuitProfonde');
    var ks = c01(CRT.scan), kg = c01(CRT.grille), kv = c01(CRT.vig), pure = !!CRT.pure;

    var n = PX * PX * VIGN * 16;
    TA = new Uint32Array(n);
    TR = new Uint32Array(n); TG = new Uint32Array(n); TB = new Uint32Array(n);
    SB = new Int32Array(PX * PX);
    for (var sy = 0; sy < PX; sy++) {
      for (var sx = 0; sx < PX; sx++) {
        var sbi = sy * PX + sx;
        SB[sbi] = sbi * VIGN * 16;
        var fs = scanF(sy, PX, ks) * grilleF(sx, PX, kg);
        for (var vl = 0; vl < VIGN; vl++) {
          /* le niveau 15 est le plein éclat, le 0 le coin le plus sombre */
          var fv = 1 - (1 - vl / (VIGN - 1)) * 0.58 * kv;
          var f = fs * fv;
          var o = SB[sbi] + vl * 16;
          for (var ci = 0; ci < 16; ci++) {
            var r, g, b;
            if (pure) {
              /* SNAP : l'atténuation retombe sur une vraie entrée de la table des seize */
              var sc = P.shade(ci, f);
              r = P.R[sc]; g = P.G[sc]; b = P.B[sc];
            } else {
              r = (P.R[ci] * f) | 0; g = (P.G[ci] * f) | 0; b = (P.B[ci] * f) | 0;
            }
            TR[o + ci] = r;
            TG[o + ci] = g << 8;
            TB[o + ci] = b << 16;
            TA[o + ci] = (AOP | (b << 16) | (g << 8) | r) >>> 0;
          }
        }
      }
    }

    /* ---- décalages de canal : floor((gx*px + sub + s)/px) - gx = floor((sub+s)/px).
            s est borné à px, donc le décalage vaut toujours -1, 0 ou +1. ---- */
    DRt = new Int8Array(PX * PX); DBt = new Int8Array(PX * PX);
    for (var dd = 1; dd <= PX; dd++) {
      for (var s2 = 0; s2 < PX; s2++) {
        DRt[(dd - 1) * PX + s2] = Math.floor((s2 + dd) / PX);
        DBt[(dd - 1) * PX + s2] = Math.floor((s2 - dd) / PX);
      }
    }

    /* ---- où l'aberration a lieu ----
       Dans un tube, le faisceau frappe le masque de biais : la frange est nulle au centre et maximale
       au bord. Le centre est donc net, et la montée est TRAMÉE colonne par colonne pour qu'aucune
       couture ne se voie entre la zone nette et la zone franchée. Au passage, cela ne fait travailler
       la voie lente que sur un quart des colonnes. */
    ABD = new Uint8Array(GW);
    var ex = GW > 1 ? GW - 1 : 1;
    for (var x = 0; x < GW; x++) {
      var u = (x / ex) * 2 - 1; if (u < 0) u = -u;
      var t = (u - 0.45) / 0.55;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      ABD[x] = (t * 4 > BAY1[x & 3]) ? 1 : 0;
    }

    /* ---- vignette par pixel de JEU : lisse, donc inutile de la calculer par pixel d'écran ---- */
    VGg = new Uint8Array(GW * GH);
    var ey = GH > 1 ? GH - 1 : 1;
    for (var y = 0; y < GH; y++) {
      var ny = (y / ey) * 2 - 1;
      for (var xx = 0; xx < GW; xx++) {
        var nx = (xx / ex) * 2 - 1;
        var rr = Math.sqrt(nx * nx + ny * ny);
        var tv = (rr - 0.62) / 0.80;
        tv = tv < 0 ? 0 : (tv > 1 ? 1 : tv);
        VGg[y * GW + xx] = Math.round((1 - tv * tv) * (VIGN - 1)) * 16;
      }
    }

    KM = new Int32Array(GW); KL = new Int32Array(GW); KR = new Int32Array(GW);

    /* ---- tables du halo ---- */
    GL = new Uint32Array(16); GWT = new Uint8Array(16);
    for (var gi = 0; gi < 16; gi++) {
      var w = GLOW[P.NAMES[gi]] || 0;
      GWT[gi] = Math.round(w * 255);
      GL[gi] = (AOP | (((P.B[gi] * w) | 0) << 16) | (((P.G[gi] * w) | 0) << 8) | ((P.R[gi] * w) | 0)) >>> 0;
    }
  }

  function sizeCheck() {
    var g = N.gfx;
    if (!g || !g.canvas || !g.buf) return false;
    var c = g.canvas();
    if (!c || !g.buf()) return false;
    if (c !== out) { out = c; octx = g.context ? g.context() : c.getContext('2d', { alpha: false }); }
    if (!octx) return false;
    var k = CRT.scan + '/' + CRT.grille + '/' + CRT.vig + '/' + (CRT.pure ? 1 : 0);
    if (c.width === OW && c.height === OH && (g.PX | 0) === PX && g.W === GW && g.H === GH && k === key) return true;

    OW = c.width | 0; OH = c.height | 0; PX = (g.PX | 0) || 2; GW = g.W | 0; GH = g.H | 0;
    key = k;
    if (OW < 2 || OH < 2 || GW < 1 || GH < 1) return false;

    var tmp = mk(1, 1);           /* createImageData ne dépend pas de la taille du canvas */
    var tctx = tmp ? tmp.getContext('2d') : null;
    if (!tctx) return false;
    img = tctx.createImageData(OW, OH);
    u32 = new Uint32Array(img.data.buffer);

    gw = Math.max(2, Math.ceil(GW / 2)); gh = Math.max(2, Math.ceil(GH / 2));
    glow = mk(gw, gh); gctx = glow ? glow.getContext('2d') : null;
    if (gctx) { gimg = gctx.createImageData(gw, gh); g32 = new Uint32Array(gimg.data.buffer); }
    HCA = new Int32Array(gw); HCB = new Int32Array(gw);

    buildTables();
    return !!(u32 && TA && VGg);
  }

  /* ================= la passe unique =================
     Hors du tampon (la secousse découvre un bord), on échantillonne « nuitProfonde », la bordure
     d'arène : elle traverse les mêmes tables, donc elle reçoit le balayage et la vignette comme le
     reste, et en régime pur elle reste une vraie couleur de la table. */
  function pass(buf, ox, oy, d) {
    var W = GW, H = GH, px = PX, ow = OW, U = u32;
    var T_A = TA, T_R = TR, T_G = TG, T_B = TB, S_B = SB, VG = VGg;
    var Km = KM, Kl = KL, Kr = KR, AB = ABD, vide = VIDEI;
    var ab = d > 0;
    var dbase = ab ? (d - 1) * px : 0;
    var two = (px === 2);

    for (var gy = 0; gy < H; gy++) {
      var sy = gy + oy;
      var inRow = sy >= 0 && sy < H;
      var srow = sy * W, vgRow = gy * W, gx;

      /* --- échantillonnage de la rangée, fait UNE fois pour les px sous-rangs --- */
      if (!inRow) {
        for (gx = 0; gx < W; gx++) {
          var vv = VG[vgRow + gx] + vide;
          Km[gx] = vv; if (ab) { Kl[gx] = vv; Kr[gx] = vv; }
        }
      } else if (ox === 0) {
        for (gx = 0; gx < W; gx++) {
          var vg = VG[vgRow + gx], cm = buf[srow + gx];
          Km[gx] = vg + cm;
          if (ab) {
            Kl[gx] = vg + (gx > 0 ? buf[srow + gx - 1] : cm);
            Kr[gx] = vg + (gx < W - 1 ? buf[srow + gx + 1] : cm);
          }
        }
      } else {
        for (gx = 0; gx < W; gx++) {
          var vg2 = VG[vgRow + gx], cx = gx + ox;
          var cm2 = (cx >= 0 && cx < W) ? buf[srow + cx] : vide;
          Km[gx] = vg2 + cm2;
          if (ab) {
            var a1 = cx - 1, a2 = cx + 1;
            Kl[gx] = vg2 + ((a1 >= 0 && a1 < W) ? buf[srow + a1] : vide);
            Kr[gx] = vg2 + ((a2 >= 0 && a2 < W) ? buf[srow + a2] : vide);
          }
        }
      }

      /* --- écriture des px sous-rangs --- */
      for (var sub = 0; sub < px; sub++) {
        var oi = (gy * px + sub) * ow, sbRow = sub * px;
        if (!ab) {
          if (two) {
            var b0 = S_B[sbRow], b1 = S_B[sbRow + 1];
            for (gx = 0; gx < W; gx++) { var k2 = Km[gx]; U[oi] = T_A[b0 + k2]; U[oi + 1] = T_A[b1 + k2]; oi += 2; }
          } else {
            for (gx = 0; gx < W; gx++) {
              var k3 = Km[gx];
              for (var s = 0; s < px; s++) U[oi + s] = T_A[S_B[sbRow + s] + k3];
              oi += px;
            }
          }
        } else {
          for (gx = 0; gx < W; gx++) {
            var km = Km[gx];
            if (!AB[gx]) {
              for (var s4 = 0; s4 < px; s4++) U[oi + s4] = T_A[S_B[sbRow + s4] + km];
            } else {
              var kl = Kl[gx], kr = Kr[gx];
              for (var s5 = 0; s5 < px; s5++) {
                var L = S_B[sbRow + s5];
                var qr = DRt[dbase + s5], qb = DBt[dbase + s5];
                U[oi + s5] = (AOP
                  | T_B[L + (qb === 0 ? km : (qb > 0 ? kr : kl))]
                  | T_G[L + km]
                  | T_R[L + (qr === 0 ? km : (qr > 0 ? kr : kl))]) >>> 0;
              }
            }
            oi += px;
          }
        }
      }
    }
  }

  /* ---- halo : construit depuis le TAMPON, donc on choisit qui rayonne, et agrandi en lissé pour
          obtenir un vrai étalement. Une seule opération de composition par image.
          Il lit le tampon AVEC LE DÉCALAGE DE LA CAMÉRA, exactement comme pass() : un texel de halo
          couvre les pixels d'écran (2x..2x+1, 2y..2y+1), qui montrent le tampon en (+ox, +oy). Construit
          sur le tampon non décalé, il laissait pendant une secousse un fantôme lumineux de l'interface et
          du serpent à leur place d'origine. Hors du tampon, c'est la bordure, qui ne rayonne pas.
          Il est posé à l'échelle exacte 2·px (le surplus d'un texel tombe hors du canvas) : un
          agrandissement à OW x OH le comprimait d'une fraction de pixel quand W ou H est impair. ---- */
  function halo(buf, ox, oy, heat, k) {
    if (!g32 || !HCA) return 0;
    var W = GW, H = GH, G = GL, GWt = GWT, V = VIDEI, CA = HCA, CB = HCB, x;
    for (x = 0; x < gw; x++) {
      var xa = x * 2, xb = xa + 1 < W ? xa + 1 : xa;
      xa += ox; xb += ox;
      CA[x] = (xa >= 0 && xa < W) ? xa : -1;
      CB[x] = (xb >= 0 && xb < W) ? xb : -1;
    }
    for (var y = 0; y < gh; y++) {
      var ya = y * 2, yb = ya + 1 < H ? ya + 1 : ya;
      ya += oy; yb += oy;
      var r0 = (ya >= 0 && ya < H) ? ya * W : -1, r1 = (yb >= 0 && yb < H) ? yb * W : -1, o = y * gw;
      if (r0 < 0 && r1 < 0) { for (x = 0; x < gw; x++) g32[o + x] = AOP; continue; }
      for (x = 0; x < gw; x++) {
        var ca = CA[x], cb = CB[x];
        /* le plus rayonnant des quatre : une ligne d'un seul pixel de jeu ne doit pas clignoter */
        var i1 = (r0 >= 0 && ca >= 0) ? buf[r0 + ca] : V, i2 = (r0 >= 0 && cb >= 0) ? buf[r0 + cb] : V;
        var i3 = (r1 >= 0 && ca >= 0) ? buf[r1 + ca] : V, i4 = (r1 >= 0 && cb >= 0) ? buf[r1 + cb] : V;
        var best = i1, bw = GWt[i1];
        if (GWt[i2] > bw) { best = i2; bw = GWt[i2]; }
        if (GWt[i3] > bw) { best = i3; bw = GWt[i3]; }
        if (GWt[i4] > bw) { best = i4; bw = GWt[i4]; }
        g32[o + x] = bw ? G[best] : AOP;
      }
    }
    gctx.putImageData(gimg, 0, 0);
    octx.globalCompositeOperation = 'lighter';
    octx.globalAlpha = (0.17 + 0.15 * heat) * k;
    octx.imageSmoothingEnabled = true;
    octx.drawImage(glow, 0, 0, gw, gh, 0, 0, gw * 2 * PX, gh * 2 * PX);
    octx.imageSmoothingEnabled = false;
    octx.globalAlpha = 1;
    octx.globalCompositeOperation = 'source-over';
    return 1;
  }

  var ST = { ops: 0, ox: 0, oy: 0, a: 0, d: 0, mode: 'riche' };

  function apply(dt) {
    if (CRT.off) { ST.ops = 0; ST.mode = 'coupe'; return; }
    if (!sizeCheck()) return;
    var g = N.gfx, S = N.S || {};
    var buf = g.buf();
    if (!buf) return;
    var pure = !!CRT.pure, ops = 0;

    /* ---- secousse : N.S.shake est en pixels de JEU. La caméra (plus haut) donne un décalage ENTIER
            de l'ÉCHANTILLONNAGE du tampon, ce qui vaut ox*px pixels d'écran et garde les blocs exactement
            sur la grille ; l'image et son halo le reçoivent tous deux. ---- */
    camera(dt, S);
    var ox = cam.ox, oy = cam.oy;
    ST.ox = ox; ST.oy = oy; ST.a = cam.a;

    var heat = c01(+S.heat || 0);
    var d = 0;
    if (!pure && CRT.ab > 0) {
      d = PX <= 2 ? 1 : 2;
      if (heat > 0.55 && PX > 3) d = 3;
      if (d > PX) d = PX;
    }
    ST.d = d;

    pass(buf, ox, oy, d);
    octx.putImageData(img, 0, 0); ops++;

    var bl = pure ? 0 : c01(CRT.bloom);
    if (bl > 0) ops += halo(buf, ox, oy, heat, bl);

    ST.ops = ops; ST.mode = pure ? 'pur' : 'riche';
  }

  var CRT = {
    off: false, pure: false,
    scan: 1, grille: 1, ab: 1, bloom: 1, vig: 1,
    apply: apply, stats: ST,
    preset: function (nom) {
      if (nom === 'pur') { CRT.off = false; CRT.pure = true; CRT.scan = 1; CRT.grille = 1; CRT.vig = 1; }
      else if (nom === 'coupe') { CRT.off = true; }
      else if (nom === 'sobre') { CRT.off = false; CRT.pure = false; CRT.ab = 0; CRT.bloom = 0.6; CRT.grille = 0; CRT.scan = 0.75; CRT.vig = 0.8; }
      else { CRT.off = false; CRT.pure = false; CRT.scan = 1; CRT.grille = 1; CRT.ab = 1; CRT.bloom = 1; CRT.vig = 1; }
      key = '';
      return nom || 'riche';
    }
  };
  N.crt = CRT;
})();
