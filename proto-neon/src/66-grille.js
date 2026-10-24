/* ===== 66-grille.js — N.grille : l'époque 1993, LA PROFONDEUR =====

   refonte/VISION-PROGRESSION.md § 1 (1993 : les plans de parallaxe deviennent JOUABLES, un plan profond sous la grille,
   des scènes isométriques inclinées) et § 3 (les plans parallèles, le changement de hauteur) ; HISTOIRE.md (le film
   « profondeur » : elle plonge à travers la grille et découvre les étages de la ville ; il tombe à travers la grille et
   découvre les cavernes dorées). Le prototype jouable refonte/prototypes/la-grille.html est repris ici : la grille vue
   de biais, le serpent qui la suit case par case, le BOUCLIER et le RÉGÉNÉRATEUR.

   DEUX ÉTAGES EMPILÉS : LA GRILLE (l'étage du haut, d'où l'on vient) et LE PROFOND (dessous, vu à travers les jours
   entre les dalles). L'étage où se trouve la tête est en pleine lumière ; l'autre est dessiné derrière, décalé, plus
   petit s'il est dessous, plus grand s'il est dessus, et assombri par une table (un cran plus sombre, au tramage pendant
   les transitions). On change de hauteur par un ASCENSEUR (une case ouverte, un puits : le serpent y coule et ressort à
   l'autre étage, à la même case) ; dans la remontée, aussi d'un geste (Espace, ou toucher / glisser du second doigt).
   Chaque étage menace l'autre : les PROJECTEURS du profond tirent vers la grille (la case visée s'allume 1,3 s avant),
   les LARGUEURS de la grille lâchent des mines sur le profond (leur ombre en croix grandit 1,4 s avant).

   LE DÉROULÉ (environ 70 s ; aucune limite de temps, des aides si l'on traîne) :
     titre     3,8 s  les dalles tombent en place, le serpent tombe du ciel sur la grille ; « 1993 — LA PROFONDEUR »
     grille           allumer 5 balises (sentinelles sur la grille ; projecteurs du profond) ; puis L'ASCENSEUR S'OUVRE
     profond          on y descend : allumer 5 balises (rôdeurs qui chassent ; mines lâchées d'en haut)
     remontee         deux balises par étage, deux ascenseurs, le saut d'étage ; puis LA GRILLE S'OUVRE au centre
     sortie    5,6 s  la tête entre dans le puits de lumière, le serpent remonte vers le néon, les dalles s'écartent et
                      tombent ; puis surFin()
   RÈGLES DE SNAKE 2975 : le mur et les piliers tuent ; se mordre COUPE sans tuer ; un ennemi qui touche la tête tue, qui
   touche le corps le coupe (les segments perdus repoussent au régénérateur) ; le bouclier encaisse un coup ; le serpent
   avance sans arrêt, sur les doubles croches du tempo. Mourir ne fait rien perdre du déroulé : les balises allumées le
   restent, le serpent renaît sur son étage (invulnérable 2,2 s) et repousse.

   LA MUSIQUE est écrite ici, pour cette époque : « 16 bits naissant » — une basse FM à deux opérateurs (le timbre des
   consoles de 1990), un lead FM avec vibrato, des cloches FM en arpèges, une nappe de triangles, un écho à la façon des
   consoles (retard filtré, sans réverbération : celle-là est à 2975), un carré à 25 % qui rappelle 1982, une batterie de
   bruits filtrés. Ré mineur, la tête du motif de Neon Velocity (ré-fa-la-sol-fa). LE TEMPO EST MIS EN SCÈNE : 92 sur la
   grille ; quand l'ascenseur s'ouvre, une MESURE D'ANNONCE (roulement, toms qui descendent, balayage qui tombe) puis 76
   sur la barre suivante, basses lourdes en demi-temps ; à la remontée, une mesure d'annonce qui monte puis une
   ACCÉLÉRATION de 76 à 104 sur deux mesures. Le serpent suit le même tempo, sur le même découpage en mesures (le jeu tient
   sa propre horloge de mesures : le son ne change jamais la partie). Générateur à graine propre ; respecte N.music.muted.

   INTERFACE (N.grille), rien ne s'appelle au chargement :
       start({ surFin, graine, qui })   lance l'époque ; qui : 'elle' | 'lui' (sinon N.choix.personnage(), sinon 'elle')
       update(dt) / draw()               à appeler à la place du jeu tant que actif() ; draw remplit tout le tampon
       actif() phase()                   'titre' | 'grille' | 'profond' | 'remontee' | 'sortie' | 'fini'
       stop()   coupe tout sans surFin ;   skip()  PROGRESSIF : chaque appel avance d'une phase ; de 'sortie', il finit
                (surFin, une seule fois) ; après, il ne fait plus rien
       state()  instantané pour les essais et le pilote de tools/grille/

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; cyan et cyan pâle au serpent seul (et à ses morceaux) ; aucun
   Math.random (trois générateurs à graine : jeu, décor, musique) ; aucune horloge lue (dt, et le contexte audio pour la
   musique) ; flashs bornés (aucun aplat plein écran : éclats, anneaux, colonnes tramées). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages ================================ */
  var CFG = {
    titre: 3.8, sortie: 5.6, mort: 1.2, invuln: 2.2, longueurDepart: 5, longueurMax: 28,
    tempos: [92, 92, 76, 104, 104],                // par section musicale : 0 titre, 1 grille, 2 profond, 3 remontée, 4 sortie
    rampe: 32,                                       // l'accélération de la remontée : 76 → 104 en deux mesures (32 doubles croches)
    balises: [5, 5, 4], baliseAide: 14, baliseDelai: 1.6,  // par étape (la remontée : deux par étage) ; au-delà de 14 s sans l'allumer, la balise se rapproche
    rayon: { annonce: 1.3, feu: 0.3 }, mine: { annonce: 1.4, chute: 0.38, feu: 0.4 },
    cadence: [3.4, 3.0, 2.5],                        // secondes entre deux tirs d'un autre étage, par étape
    plongee: 1.2, suivi: [0.85, 0.35]                // recharge du saut d'étage ; suivi vertical de la caméra (paysage, portrait)
  };
  var PTS = { cellule: 10, balise: 250, ennemi: 150, regen: 50, bouclier: 50, etage: 100 };
  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];

  var P = null, SOMBRE = null, BAY = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), indigo: I('indigo'), violet: I('violet'), magenta: I('magenta'),
      rose: I('rosePale'), cyan: I('cyan'), cyanP: I('cyanPale'), ambre: I('ambre'), jaune: I('jaune'), brasier: I('brasier'),
      os: I('os'), acier: I('acier'), sang: I('sang'), np: I('nuitProfonde') };
    /* l'étage lointain : chaque encre glisse d'un cran vers le sombre ; le serpent garde son cyan */
    SOMBRE = new Uint8Array(16);
    for (var i = 0; i < 16; i++) SOMBRE[i] = i;
    var o = SOMBRE;
    o[P.vide] = P.np; o[P.nuit] = P.vide; o[P.ardoise] = P.nuit; o[P.indigo] = P.nuit; o[P.violet] = P.indigo; o[P.magenta] = P.sang;
    o[P.rose] = P.magenta; o[P.ambre] = P.brasier; o[P.jaune] = P.ambre; o[P.brasier] = P.sang; o[P.os] = P.acier; o[P.acier] = P.ardoise;
    o[P.sang] = P.nuit; o[P.np] = P.np;
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }

  /* trois générateurs locaux à graine : le jeu, le décor, la musique (ni le décor ni le son ne changent la partie) */
  var rs = 1993, rv = 93, ra = 19;
  function rnd() { rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296; }
  function rdv() { rv = (rv * 1103515245 + 12345) % 2147483648; return rv / 2147483648; }
  function rna() { ra = (ra * 69069 + 1) % 4294967296; return ra / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lisse(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function hash2(ix, iy, s) {
    var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* ================================ l'état ================================ */
  var T = {
    on: false, phase: 'fini', sec: 0, t: 0, pt: 0, qui: 'elle', graine: 1993, score: 0, morts: 0,
    W: 0, H: 0, C: 15, R: 8, safe: null, h: 0,
    snake: [], dir: 0, file: [], pousse: 0, perdu: 0, regen: 0, queue: null, vertical: -1, bouclier: false, invul: 0,
    mort: false, mortT: 0, longAvant: 0, plongeeT: 0, tenu: false, acc: 0, periode: 0.15, n: 0, u: 0,
    sol: [null, null], balises: [], asc: [], sortieG: null, items: [], E: [], M: [], parts: [], obj: null, baliseT: 0, feuT: 0,
    msg: '', msg2: '', msgT: 0, msgD: 2, petit: '', petitT: 9, choc: 0, hit: 0, TJ: null, ev: {}, montes: 0, toutMonte: -1,
    compte: null, journal: [], instants: {}, surFin: null, finAppele: false, ecranSerpent: [], teteEcran: [0, 0], aideT: 0
  };
  function compteNeuf() {
    return { mange: 0, balises: 0, coupes: 0, morsures: 0, boucliers: 0, regens: 0, rayons: 0, mines: 0, ascenseurs: 0, plongees: 0,
      detruits: 0, tempo: 0, aides: 0 };
  }
  function journal(e) { T.journal.push({ e: e, t: +T.t.toFixed(2) }); if (T.journal.length > 120) T.journal.shift(); }
  function dire(s, d, s2) { T.msg = s; T.msg2 = s2 || ''; T.msgT = 0; T.msgD = d || 2.2; journal('message ' + s); }
  function souffler(s) { T.petit = s; T.petitT = 0; }
  function marquer(nom) { if (T.instants[nom] === undefined) T.instants[nom] = +T.t.toFixed(2); }
  function accent() { return T.qui === 'lui' ? [P.jaune, P.ambre, P.brasier, P.sang] : [P.os, P.rose, P.magenta, P.violet]; }
  function couleurPilote() { return T.qui === 'lui' ? P.ambre : P.rose; }

  /* ================================ la grille : sol, piliers, cases ================================ */
  function dedans(x, y) { return x >= 0 && y >= 0 && x < T.C && y < T.R; }
  function pilier(f, x, y) { return T.sol[f][y * T.C + x] === 1; }
  function ascEn(x, y) { for (var i = 0; i < T.asc.length; i++) if (T.asc[i].x === x && T.asc[i].y === y) return T.asc[i]; return null; }
  function ascOuvert(x, y) { var a = ascEn(x, y); return !!(a && a.ouvert); }
  function estSortie(f, x, y) { return !!(T.sortieG && f === 0 && T.sortieG.x === x && T.sortieG.y === y); }
  function corpsEn(f, x, y, depuis) {
    for (var k = depuis || 0; k < T.snake.length; k++) { var s = T.snake[k]; if (s.x === x && s.y === y && s.f === f) return k; }
    return -1;
  }
  function ennemiEn(f, x, y, sauf) {
    for (var i = 0; i < T.E.length; i++) { var e = T.E[i]; if (e !== sauf && e.f === f && !e.canon && e.x === x && e.y === y) return e; }
    return null;
  }
  function objetEn(f, x, y) {
    for (var i = 0; i < T.items.length; i++) { var it = T.items[i]; if (it.f === f && it.x === x && it.y === y) return it; }
    for (i = 0; i < T.balises.length; i++) { var b = T.balises[i]; if (b.f === f && b.x === x && b.y === y) return b; }
    return null;
  }
  /* une case pour poser quelque chose : libre de tout, loin de la tête (dmin), à moins de dmax si on le demande */
  function caseLibre(f, dmin, dmax) {
    var h = T.snake[0] || { x: 0, y: 0, f: 0 }, best = null, n = 0;
    for (var essai = 0; essai < 260; essai++) {
      var x = Math.floor(rnd() * T.C), y = Math.floor(rnd() * T.R);
      if (pilier(f, x, y) || ascEn(x, y) || estSortie(f, x, y) || objetEn(f, x, y) || corpsEn(f, x, y) >= 0 || ennemiEn(f, x, y)) continue;
      var d = Math.abs(x - h.x) + Math.abs(y - h.y);
      if (h.f === f && d < dmin) continue;
      if (dmax && h.f === f && d > dmax) continue;
      best = { x: x, y: y }; n++;
      break;
    }
    return best;
  }
  /* les deux étages sont dessinés à la main : piliers isolés (la grille reste connexe), jamais à côté d'un ascenseur, de la
     sortie ou du départ */
  function construire() {
    var C = T.C, R = T.R, f, i;
    function rx(u) { return Math.round(u * (C - 1)); }
    function ry(v) { return Math.round(v * (R - 1)); }
    T.asc = [{ x: rx(0.28), y: ry(0.5), ouvert: false, t: 0, n: 0 }, { x: rx(0.74), y: ry(0.5), ouvert: false, t: 0, n: 0 }];
    T.porte = { x: rx(0.5), y: ry(0.5) };
    var plans = [
      [[0.18, 0.22], [0.82, 0.22], [0.18, 0.8], [0.82, 0.8], [0.5, 0.15], [0.5, 0.88]],
      [[0.4, 0.3], [0.62, 0.72], [0.1, 0.52], [0.9, 0.48], [0.4, 0.78], [0.62, 0.24], [0.26, 0.12], [0.76, 0.9]]
    ];
    for (f = 0; f < 2; f++) {
      T.sol[f] = new Uint8Array(C * R);
      for (i = 0; i < plans[f].length; i++) {
        var x = rx(plans[f][i][0]), y = ry(plans[f][i][1]);
        if (!pilierPermis(x, y)) continue;
        T.sol[f][y * C + x] = 1;
      }
    }
  }
  function pilierPermis(x, y) {
    var interdits = [T.asc[0], T.asc[1], T.porte];
    for (var i = 0; i < interdits.length; i++) if (Math.abs(interdits[i].x - x) <= 1 && Math.abs(interdits[i].y - y) <= 1) return false;
    if (y <= 1 || x <= 0 || x >= T.C - 1 || y >= T.R - 1) return false;       // la rangée de départ et les bords restent dégagés
    return true;
  }

  /* ================================ la caméra isométrique inclinée ================================ */
  var CAM = { S: 16, cx: 0, cy: 0, D: 60, suivi: 0.85, focus: 0, yaw: 0.42, pitch: 0.6, cs: 0, sn: 0, sp: 0, cp: 0, port: false };
  function layout() {
    var g = G(); T.W = g.W | 0; T.H = g.H | 0;
    var s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    T.safe = { l: sf.l | 0, t: sf.t | 0, r: sf.r | 0, b: sf.b | 0 };
    cadrer();
    fondNeuf();
  }
  function cadrer() {
    var port = T.H > T.W * 1.1, C = T.C, R = T.R;
    CAM.port = port; CAM.pitch = port ? 0.82 : 0.6; CAM.yaw = 0.42;
    CAM.cs = Math.cos(CAM.yaw); CAM.sn = Math.sin(CAM.yaw); CAM.sp = Math.sin(CAM.pitch); CAM.cp = Math.cos(CAM.pitch);
    CAM.suivi = port ? CFG.suivi[1] : CFG.suivi[0];
    /* l'étendue de la grille à l'échelle 1, de -0,35 (l'épaisseur du plateau) à +1 (les piliers) */
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, cs = [[0, 0], [C, 0], [C, R], [0, R]];
    for (var i = 0; i < 4; i++) for (var z = -0.35; z <= 1.01; z += 1.35) {
      var gx = cs[i][0] - C / 2, gy = cs[i][1] - R / 2, rx = gx * CAM.cs - gy * CAM.sn, ry = gx * CAM.sn + gy * CAM.cs, yy = ry * CAM.sp - z * CAM.cp;
      x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy);
    }
    var sf = T.safe, aw = T.W - sf.l - sf.r - 8, ah = T.H - sf.t - sf.b - 10, ex = x1 - x0, ey = y1 - y0;
    if (port) {
      /* en portrait, les deux étages tiennent l'un sous l'autre */
      var Sp = Math.min(aw / ex, (ah - 36) / (ey * 1.86));
      CAM.S = Sp; CAM.D = ey * Sp * 0.95;
      CAM.cx = sf.l + 4 + aw / 2 - (x0 + x1) / 2 * Sp;
      CAM.cy = sf.t + 30 + (ah - 36) / 2 - (y0 + y1) / 2 * Sp;
    } else {
      var Sl = Math.min(aw / ex, ah * 0.86 / ey);
      CAM.S = Sl; CAM.D = ey * Sl * 0.44;
      CAM.cx = sf.l + 4 + aw / 2 - (x0 + x1) / 2 * Sl;
      CAM.cy = sf.t + 5 + ah * 0.45 - (y0 + y1) / 2 * Sl;
    }
    /* le décalage de suivi : la caméra va de l'étage du haut (focus 0) à celui du bas (-1) ; au repos, l'écart est centré */
    CAM.cy += port ? 0 : CAM.D * (1 - CAM.suivi) * 0.5;
  }
  /* la vue d'un niveau l (0 = la grille, -1 = le profond, continu entre les deux) */
  var VS = 1, VCX = 0, VCY = 0, PX_ = 0, PY_ = 0;
  function vue(l) {
    var r = l - T.h, k = 1 + 0.14 * r;
    if (k < 0.55) k = 0.55;
    VS = CAM.S * k; VCX = CAM.cx; VCY = CAM.cy - (l - CAM.focus) * CAM.D;
  }
  function proj(x, y, z) {
    var gx = x - T.C * 0.5, gy = y - T.R * 0.5, rx = gx * CAM.cs - gy * CAM.sn, ry = gx * CAM.sn + gy * CAM.cs;
    PX_ = VCX + rx * VS; PY_ = VCY + (ry * CAM.sp - z * CAM.cp) * VS;
  }
  function prof(x, y) { var gx = x - T.C * 0.5, gy = y - T.R * 0.5; return gx * CAM.sn + gy * CAM.cs; }
  /* les quatre directions de la grille vues à l'écran (pour les commandes et le pilote) */
  var VD = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function directionsEcran() {
    for (var d = 0; d < 4; d++) {
      var x = DX[d] * CAM.cs - DY[d] * CAM.sn, y = (DX[d] * CAM.sn + DY[d] * CAM.cs) * CAM.sp, l = Math.sqrt(x * x + y * y) || 1;
      VD[d][0] = x / l; VD[d][1] = y / l;
    }
  }
  function dirEcran(x, y) {
    var best = -1, bd = -1e9;
    for (var d = 0; d < 4; d++) { var v = VD[d][0] * x + VD[d][1] * y; if (v > bd) { bd = v; best = d; } }
    return best;
  }

  /* ================================ le tampon et ses primitives ================================ */
  var B = null, BW = 0, BH = 0, TEINTE = 0;
  var QX = new Float64Array(16), QY = new Float64Array(16), XI = new Float64Array(16);
  /* un polygone convexe (ou non, pair-impair) déjà posé dans QX/QY ; c2 au tramage t ; TEINTE assombrit (0 à 1) */
  function poly(n, c, c2, t) {
    if (TEINTE >= 1) { c = SOMBRE[c]; c2 = SOMBRE[c2]; }
    var tq = (TEINTE > 0 && TEINTE < 1) ? TEINTE * 16 : 0, t16 = (t || 0) * 16;
    var y0 = 1e9, y1 = -1e9, i, j;
    for (i = 0; i < n; i++) { if (QY[i] < y0) y0 = QY[i]; if (QY[i] > y1) y1 = QY[i]; }
    var ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(BH - 1, Math.floor(y1 - 0.5));
    for (var y = ya; y <= yb; y++) {
      var yc = y + 0.5, k = 0;
      for (i = 0, j = n - 1; i < n; j = i++) {
        var ay = QY[j], by = QY[i];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) XI[k++] = QX[j] + (yc - ay) / (by - ay) * (QX[i] - QX[j]);
      }
      for (i = 1; i < k; i++) { var v = XI[i], m = i - 1; while (m >= 0 && XI[m] > v) { XI[m + 1] = XI[m]; m--; } XI[m + 1] = v; }
      var o = y * BW, row = (y & 3) << 2, row2 = ((y + 1) & 3) << 2;
      for (i = 0; i + 1 < k; i += 2) {
        var xa = Math.max(0, Math.ceil(XI[i] - 0.5)), xb = Math.min(BW - 1, Math.floor(XI[i + 1] - 0.5)), x;
        if (xb < xa) continue;
        if (!t16 && !tq) { B.fill(c, o + xa, o + xb + 1); continue; }
        for (x = xa; x <= xb; x++) {
          var col = (t16 && BAY[row | (x & 3)] < t16) ? c2 : c;
          if (tq && BAY[row2 | ((x + 2) & 3)] < tq) col = SOMBRE[col];
          B[o + x] = col;
        }
      }
    }
  }
  function px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= BW || y >= BH) return;
    if (TEINTE >= 1 || (TEINTE > 0 && BAY[(((y + 1) & 3) << 2) | ((x + 2) & 3)] < TEINTE * 16)) c = SOMBRE[c];
    B[y * BW + x] = c;
  }
  function rect(x, y, w, h, c, t) {
    x = Math.round(x); y = Math.round(y);
    var xa = Math.max(0, x), ya = Math.max(0, y), xb = Math.min(BW, x + w), yb = Math.min(BH, y + h);
    for (var yy = ya; yy < yb; yy++) { var o = yy * BW; for (var xx = xa; xx < xb; xx++) if (t === undefined || BAY[((yy & 3) << 2) | (xx & 3)] < t * 16) B[o + xx] = c; }
  }
  function ligne(x0, y0, x1, y1, c, on, off) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, k = 0, per = on ? on + off : 0, garde = dx + dy + 2;
    if (garde > 3000) return;
    for (;;) {
      if (!per || (k % per) < on) px(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || --garde < 0) break;
      var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
      k++;
    }
  }
  /* un quadrilatère au sol du niveau l : la case (x0,y0)-(x1,y1) à la hauteur z */
  function dalle(l, x0, y0, x1, y1, z, c, c2, t) {
    vue(l);
    proj(x0, y0, z); QX[0] = PX_; QY[0] = PY_; proj(x1, y0, z); QX[1] = PX_; QY[1] = PY_;
    proj(x1, y1, z); QX[2] = PX_; QY[2] = PY_; proj(x0, y1, z); QX[3] = PX_; QY[3] = PY_;
    poly(4, c, c2, t);
  }
  /* une boîte, du niveau l0 (hauteur z0) au niveau l1 (hauteur z1) : face avant (+y), flanc droit (+x), dessus.
     Avec l0 ≠ l1, c'est une colonne entre deux étages (le puits). */
  var BXa = new Float64Array(8), BYa = new Float64Array(8);
  function boite(x0, y0, x1, y1, l0, z0, l1, z1, top, front, side, tT, cT2, tF, cF2) {
    vue(l0);
    proj(x0, y0, z0); BXa[0] = PX_; BYa[0] = PY_; proj(x1, y0, z0); BXa[1] = PX_; BYa[1] = PY_;
    proj(x1, y1, z0); BXa[2] = PX_; BYa[2] = PY_; proj(x0, y1, z0); BXa[3] = PX_; BYa[3] = PY_;
    if (l1 !== l0) vue(l1);
    proj(x0, y0, z1); BXa[4] = PX_; BYa[4] = PY_; proj(x1, y0, z1); BXa[5] = PX_; BYa[5] = PY_;
    proj(x1, y1, z1); BXa[6] = PX_; BYa[6] = PY_; proj(x0, y1, z1); BXa[7] = PX_; BYa[7] = PY_;
    /* le flanc droit */
    QX[0] = BXa[1]; QY[0] = BYa[1]; QX[1] = BXa[2]; QY[1] = BYa[2]; QX[2] = BXa[6]; QY[2] = BYa[6]; QX[3] = BXa[5]; QY[3] = BYa[5];
    poly(4, side, P.np, 0.25);
    /* la face avant */
    QX[0] = BXa[3]; QY[0] = BYa[3]; QX[1] = BXa[2]; QY[1] = BYa[2]; QX[2] = BXa[6]; QY[2] = BYa[6]; QX[3] = BXa[7]; QY[3] = BYa[7];
    poly(4, front, cF2 === undefined ? front : cF2, cF2 === undefined ? 0 : (tF || 0.5));
    /* le dessus */
    QX[0] = BXa[4]; QY[0] = BYa[4]; QX[1] = BXa[5]; QY[1] = BYa[5]; QX[2] = BXa[6]; QY[2] = BYa[6]; QX[3] = BXa[7]; QY[3] = BYa[7];
    poly(4, top, cT2 === undefined ? top : cT2, cT2 === undefined ? 0 : (tT || 0.5));
  }
  function texte(str, x, y, c, k, contourC) {
    if (!N.spr || !N.spr.text) return null;
    var s = null;
    try { s = N.spr.text(str, { ci: c, echelle: k || 1, contour: contourC === undefined ? P.np : contourC }); } catch (e) { s = null; }
    if (!s || !s.data) return null;
    if (x !== null) G().blit(s, Math.round(x), Math.round(y));
    return s;
  }
  function texteCentre(str, cx, y, c, k, maxW) {
    k = k || 1;
    while (k > 1 && (str.length * 6 * k) > maxW) k--;
    var s = texte(str, null, 0, c, k);
    if (s) G().blit(s, Math.round(cx - s.w / 2), Math.round(y));
    return s;
  }

  /* ================================ le décor : ciel à bandes, soleil, puis les strates du dessous ================================ */
  var FOND = null, FW = 0, FH = 0, ETOILES = [];
  function fondNeuf() {
    FW = T.W; FH = T.H * 2;
    if (!FW || !FH) return;
    FOND = new Uint8Array(FW * FH);
    rv = (T.graine * 7 + 93) % 2147483647;
    var lui = T.qui === 'lui', H = T.H, W = T.W, x, y;
    var bandes = lui ? [P.np, P.nuit, P.indigo, P.sang, P.brasier, P.ambre] : [P.np, P.nuit, P.indigo, P.violet, P.sang, P.magenta];
    var yh = Math.round(H * 0.6);
    for (y = 0; y < FH; y++) {
      var o = y * FW, row = (y & 3) << 2;
      if (y < yh) {
        var u = y / yh, fq = Math.min(bandes.length - 1.001, u * u * (bandes.length - 1)), k = Math.floor(fq), r = fq - k;
        var a = bandes[k], b = bandes[Math.min(bandes.length - 1, k + 1)];
        for (x = 0; x < W; x++) FOND[o + x] = BAY[row | (x & 3)] < r * 16 ? b : a;
      } else if (y < H) {
        /* le sol lointain du néon, des lignes d'horizon qui se resserrent */
        var v = (y - yh) / (H - yh), l = Math.floor(Math.sqrt(v) * 9), lp = Math.floor(Math.sqrt(Math.max(0, (y - 1 - yh) / (H - yh))) * 9);
        for (x = 0; x < W; x++) FOND[o + x] = (l !== lp) ? (lui ? P.sang : P.indigo) : (BAY[row | (x & 3)] < (1 - v) * 5 ? P.nuit : P.np);
      } else {
        var yy = y - H, w = yy / H;
        for (x = 0; x < W; x++) {
          var c = P.np, q = BAY[row | (x & 3)] / 16;
          if (lui) {
            /* les cavernes dorées : strates tramées, veines de braise */
            var s1 = hash2(Math.floor(x / 9), Math.floor(yy / 5), 31), st = Math.sin(yy * 0.21 + Math.sin(x * 0.04) * 2.2 + s1 * 1.5);
            if (st > 0.55) c = q < 0.5 ? P.nuit : P.np;
            if (st > 0.86) c = q < 0.35 ? P.ardoise : P.nuit;
            if (Math.abs(st - 0.72) < 0.025 && hash2(x >> 2, yy >> 2, 7) > 0.7) c = q < 0.3 ? P.brasier : P.sang;
          } else {
            /* les étages de la ville : des façades, des fenêtres */
            var colx = Math.floor(x / 14), hb = hash2(colx, 3, 17), bord = (x % 14) === 0;
            if (w > 0.12 + hb * 0.25) c = bord ? P.np : (q < 0.4 ? P.nuit : P.np);
            if (c !== P.np && (x % 3) === 1 && (yy % 5) === 2 && hash2(x, yy, 5) > 0.82) c = hash2(x, yy, 9) > 0.6 ? P.rose : P.violet;
          }
          FOND[o + x] = c;
        }
      }
    }
    ETOILES = [];
    for (var i = 0; i < 40; i++) ETOILES.push([rdv() * W, rdv() * yh * 0.8, rdv()]);
  }
  function fond(f) {
    if (!FOND || FW !== BW) { B.fill(P.np); return; }
    var off = Math.round(clamp(-T.h, 0, 1) * T.H * 0.92), y;
    if (off + BH > FH) off = FH - BH;
    for (y = 0; y < BH; y++) B.set(FOND.subarray((y + off) * FW, (y + off) * FW + FW), y * BW);
    for (var i = 0; i < ETOILES.length; i++) {
      var s = ETOILES[i], sy = s[1] - off;
      if (sy < 0 || ((i * 7 + (f >> 4)) % 11) === 0) continue;
      px(s[0], sy, s[2] > 0.75 ? P.os : P.acier);
    }
    /* le soleil à bandes : rose pour elle, ambre pour lui */
    var lui = T.qui === 'lui', R = Math.round(Math.min(T.W, T.H) * 0.17), sx = Math.round(T.W * 0.5), sy0 = Math.round(T.H * 0.3) - off;
    if (sy0 + R < 0) return;
    var cs = lui ? [P.jaune, P.ambre, P.brasier] : [P.rose, P.magenta, P.sang];
    for (var yy = -R; yy <= R; yy++) {
      var yv = sy0 + yy; if (yv < 0 || yv >= BH) continue;
      var w = Math.sqrt(Math.max(0, R * R - yy * yy)), v = (yy + R) / (2 * R);
      if (v > 0.45 && ((yy + (f >> 3)) % 7 + 7) % 7 < 1 + v * 3) continue;
      var c = v < 0.35 ? cs[0] : v < 0.7 ? cs[1] : cs[2], o = yv * BW;
      for (var xx = Math.max(0, Math.round(sx - w)); xx <= Math.min(BW - 1, Math.round(sx + w)); xx++) B[o + xx] = c;
    }
  }

  /* ================================ le portrait du pilote ================================ */
  var PORT = null, PORT_ESSAI = 0;
  var VISAGE = { elle: [196, 48], lui: [172, 46] };
  function portrait() {
    if (PORT || PORT_ESSAI > 600) return PORT;
    PORT_ESSAI++;
    var img = null;
    try { img = N.art && N.art.get ? N.art.get('pilote-' + T.qui) : null; } catch (e) { img = null; }
    if (!img || !img.data || img.w < 200 || img.h < 120) return null;
    var c = VISAGE[T.qui] || VISAGE.elle, n = 22, pas = 2, x0 = c[0] - n, y0 = c[1] - n, d = new Uint8Array(n * n);
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var sx = clamp(x0 + x * pas, 0, img.w - 1), sy = clamp(y0 + y * pas, 0, img.h - 1), v = img.data[sy * img.w + sx] & 15;
      if (v === P.cyan || v === P.cyanP) v = P.acier;            // le câble cyan du portrait reste au serpent
      d[y * n + x] = v;
    }
    PORT = { w: n, h: n, data: d };
    journal('portrait ' + T.qui);
    return PORT;
  }

  /* ================================ la musique de 1993 ================================ */
  var A = { ctx: null, out: null, echo: null, bruit: null, onde25: null, next: 0, pas: 0, X: null, mes: 0, mesSec: 0,
    finJoue: false, notes: { fm: 0, lead: 0, cloche: 0, nappe: 0, perc: 0, puce: 0 }, var: 0, fondu: false };
  function audio() {
    if (A.ctx) return A.ctx;
    var c = null;
    try { c = N.music && N.music.context ? N.music.context() : null; } catch (e) { c = null; }
    if (!c || !c.createOscillator) return null;
    A.ctx = c;
    A.out = c.createGain(); A.out.gain.value = 0.7; A.out.connect(c.destination);
    /* l'écho des consoles : un retard filtré qui se répète, sans réverbération */
    A.echo = c.createDelay(1.0); A.echo.delayTime.value = 0.27;
    var fb = c.createGain(); fb.gain.value = 0.36; var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    var eg = c.createGain(); eg.gain.value = 0.5;
    A.echo.connect(lp); lp.connect(fb); fb.connect(A.echo); lp.connect(eg); eg.connect(A.out);
    var nb = Math.floor(c.sampleRate); A.bruit = c.createBuffer(1, nb, c.sampleRate);
    var bx = A.bruit.getChannelData(0); for (var k = 0; k < nb; k++) bx[k] = rna() * 2 - 1;
    try {
      var m = 32, re = new Float32Array(m), im = new Float32Array(m);
      for (var h = 1; h < m; h++) { re[h] = 2 / (h * Math.PI) * Math.sin(2 * Math.PI * h * 0.25); im[h] = 2 / (h * Math.PI) * (1 - Math.cos(2 * Math.PI * h * 0.25)); }
      A.onde25 = c.createPeriodicWave(re, im);
    } catch (e) { A.onde25 = null; }
    return c;
  }
  function muet(canal) { try { return !!(N.music && N.music.muted && (N.music.muted(canal || 'musique') || N.music.muted() === true)); } catch (e) { return false; } }
  function sonOk(canal) { var c = audio(); return !!(c && c.state === 'running' && !muet(canal) && T.on); }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function sortie(g, ech) {
    g.connect(A.out);
    if (ech) { var e = A.ctx.createGain(); e.gain.value = ech; g.connect(e); e.connect(A.echo); }
  }
  /* la FM à deux opérateurs : un modulateur (rapport, indice qui décroît de i0 à i1) sur la fréquence de la porteuse */
  function fm(t, m, d, v, ratio, i0, i1, ech, tenue, glisse) {
    var c = A.ctx, f = hz(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.setValueAtTime(f, t); mod.frequency.setValueAtTime(f * ratio, t);
    if (glisse) { car.frequency.exponentialRampToValueAtTime(f * Math.pow(2, glisse / 12), t + d); mod.frequency.exponentialRampToValueAtTime(f * ratio * Math.pow(2, glisse / 12), t + d); }
    mg.gain.setValueAtTime(i0 * f, t); mg.gain.exponentialRampToValueAtTime(Math.max(0.5, i1 * f), t + Math.max(0.03, d * 0.7));
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
    if (tenue) { g.gain.setValueAtTime(v, t + Math.max(0.01, d - 0.06)); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.04); }
    else g.gain.exponentialRampToValueAtTime(0.0008, t + d + 0.04);
    car.connect(g); sortie(g, ech);
    car.start(t); mod.start(t); car.stop(t + d + 0.08); mod.stop(t + d + 0.08);
  }
  function basse(t, m, d, v, lourde, glisse) {
    if (lourde) { fm(t, m, d, v, 0.5, 5.5, 0.6, 0, false, glisse); fm(t, m, d, v * 0.5, 1, 0.3, 0.1, 0, true, glisse); }
    else fm(t, m, d, v, 1, 2.8, 0.45, 0, false, glisse);
    A.notes.fm++;
  }
  function lead(t, m, d, v, sombre) {
    var c = A.ctx, l = c.createOscillator(), lg = c.createGain(), f = hz(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * (sombre ? 2 : 1);
    mg.gain.setValueAtTime(f * (sombre ? 1.2 : 2.2), t); mg.gain.linearRampToValueAtTime(f * (sombre ? 0.6 : 1.1), t + Math.min(0.25, d));
    l.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.01, t + Math.min(0.4, d));
    l.connect(lg); lg.connect(car.frequency); mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v * 0.85, t + Math.max(0.03, d - 0.06)); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.05);
    car.connect(g); sortie(g, 0.42);
    car.start(t); mod.start(t); l.start(t); car.stop(t + d + 0.1); mod.stop(t + d + 0.1); l.stop(t + d + 0.1);
    A.notes.lead++;
  }
  function cloche(t, m, d, v) { fm(t, m, d, v, 3.5, 3.2, 0.2, 0.55); A.notes.cloche++; }
  function puce(t, m, d, v) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    if (A.onde25) o.setPeriodicWave(A.onde25); else o.type = 'square';
    o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g); sortie(g, 0.5); o.start(t); o.stop(t + d + 0.03); A.notes.puce++;
  }
  function nappe(t, notes, d, v) {
    var c = A.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.35, d * 0.3));
    g.gain.setValueAtTime(v, t + d * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.2);
    f.connect(g); sortie(g, 0.2);
    for (var i = 0; i < notes.length; i++) for (var k = -1; k <= 1; k += 2) {
      var o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(notes[i]); o.detune.value = k * 6;
      o.connect(f); o.start(t); o.stop(t + d + 0.25);
    }
    A.notes.nappe++;
  }
  function bruitPerc(t, d, v, type, f0, f1, q, ech) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.bruit; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d); if (q) f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    s.connect(f); f.connect(g); sortie(g, ech || 0);
    s.start(t, (A.notes.perc * 0.173) % 0.8); s.stop(t + d + 0.02); A.notes.perc++;
  }
  function ton(t, f0, f1, d, v, type) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.7);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g); sortie(g, 0); o.start(t); o.stop(t + d + 0.02);
  }
  function kick(t, v) { ton(t, 160, 44, 0.32, v); bruitPerc(t, 0.01, v * 0.3, 'highpass', 3000); }
  function caisse(t, v) { bruitPerc(t, 0.16, v, 'bandpass', 2100, 1500, 0.9, 0.15); ton(t, 210, 160, 0.08, v * 0.5, 'triangle'); }
  function charley(t, v, ouvert) { bruitPerc(t, ouvert ? 0.18 : 0.04, v, 'highpass', 7800); }
  function tom(t, m, v) { ton(t, hz(m) * 1.6, hz(m), 0.28, v, 'sine'); bruitPerc(t, 0.03, v * 0.2, 'lowpass', 1200); }
  function cymbale(t, v) { bruitPerc(t, 1.4, v, 'highpass', 5600, 0, 0, 0.3); }
  function balayage(t, d, v, monte) { bruitPerc(t, d, v, 'bandpass', monte ? 280 : 5200, monte ? 6200 : 220, 1.6, 0.3); }
  function impact(t, v) { kick(t, v); bruitPerc(t, 1.1, v * 0.5, 'lowpass', 2400, 80); cymbale(t, v * 0.3); }

  /* la grille de mesures, commune au jeu et à la musique : une section voulue ; sur la barre, une mesure d'annonce si le
     tempo change, puis la section nouvelle (et, pour la remontée, l'accélération) */
  var ANNONCE = [0, 0, 1, 1, 0];
  function horlogeNeuve(sec) { return { sec: sec, annonce: 0, cible: sec, tempo: CFG.tempos[sec], rampe: 0 }; }
  function barre(X, voulu) {
    if (X.annonce) {
      X.annonce = 0; X.sec = X.cible;
      if (X.sec === 3) { X.tempo = CFG.tempos[2]; X.rampe = CFG.rampe; } else X.tempo = CFG.tempos[X.sec];
      return 'change';
    }
    if (voulu !== X.sec) {
      if (ANNONCE[voulu] && voulu > X.sec) { X.cible = voulu; X.annonce = 1; return 'annonce'; }
      X.sec = voulu; X.tempo = CFG.tempos[voulu]; X.rampe = 0;
      return 'change';
    }
    return null;
  }
  function doubleCroche(X) {
    if (X.rampe > 0) { X.rampe--; X.tempo = Math.min(CFG.tempos[3], X.tempo + (CFG.tempos[3] - CFG.tempos[2]) / CFG.rampe); }
  }
  function secVoulue() {
    if (T.phase === 'titre') return 0;
    if (T.phase === 'grille') return T.ev.ascOuvert ? 2 : 1;
    if (T.phase === 'profond') return 2;
    if (T.phase === 'remontee') return 3;
    return 4;
  }

  /* les accords : [racine de la basse, notes de la nappe] ; ré mineur partout */
  var PROG = [
    [[38, [62, 65, 69]], [38, [62, 65, 69]], [34, [62, 65, 70]], [36, [60, 64, 67]]],
    [[38, [62, 65, 69]], [34, [62, 65, 70]], [41, [60, 65, 69]], [36, [60, 64, 67]]],
    [[38, [50, 53, 57]], [43, [50, 55, 58]], [38, [50, 53, 57]], [45, [49, 52, 57]]],
    [[38, [62, 65, 69]], [36, [60, 64, 67]], [34, [58, 62, 65]], [33, [57, 61, 64]]]
  ];
  /* la tête du motif de Neon Velocity (ré, fa, la, sol, fa), en doubles croches : [pas, note, durée] */
  var MOTIF = [
    [[[0, 74, 4], [4, 77, 2], [6, 81, 4], [10, 79, 2], [12, 77, 4]], [[0, 76, 6], [6, 74, 2], [8, 70, 4], [12, 72, 4]],
      [[0, 74, 4], [4, 77, 2], [6, 81, 4], [10, 79, 2], [12, 84, 4]], [[0, 81, 6], [6, 79, 2], [8, 76, 4], [12, 74, 4]]],
    [[[0, 62, 8], [8, 65, 8]], [[0, 69, 6], [6, 67, 2], [8, 65, 8]], [[0, 62, 8], [8, 58, 4], [12, 60, 4]], [[0, 61, 12], [12, 64, 4]]],
    [[[0, 74, 2], [2, 77, 2], [4, 81, 2], [6, 79, 2], [8, 77, 2], [10, 81, 2], [12, 86, 4]], [[0, 84, 4], [4, 81, 2], [6, 79, 2], [8, 76, 4], [12, 79, 4]],
      [[0, 82, 4], [4, 81, 2], [6, 77, 2], [8, 74, 4], [12, 77, 4]], [[0, 76, 2], [2, 77, 2], [4, 79, 2], [6, 81, 2], [8, 85, 4], [12, 81, 4]]]
  ];
  var VAR3 = [[0, 79, 4], [4, 77, 4], [8, 76, 2], [10, 77, 2], [12, 74, 4]];
  function grilleEv(evs) { var g = []; for (var i = 0; i < evs.length; i++) g[evs[i][0]] = evs[i]; return g; }
  var GM = MOTIF.map(function (p) { return p.map(grilleEv); }), GV3 = grilleEv(VAR3);

  function pasMusique(t, d16) {
    var pos = A.pas % 16, X = A.X, i;
    if (pos === 0) {
      var r = barre(X, secVoulue());
      if (r === 'change') {
        A.mesSec = 0; A.var = Math.floor(rna() * 4);
        if (X.sec === 2 || X.sec === 3) impact(t, 0.55);
        journal('musique section ' + X.sec + ' tempo ' + Math.round(X.tempo));
      } else if (r === 'annonce') journal('musique annonce ' + X.cible);
      else if (A.mes > 0) A.mesSec++;
      A.mes++;
      if (A.mesSec % 4 === 0 && pos === 0) A.var = Math.floor(rna() * 4);
    }
    doubleCroche(X);
    if (X.sec === 4) return;
    if (X.annonce) { annonce(t, pos, d16, X.cible); return; }
    var sec = X.sec, b4 = A.mesSec % 4, prog = PROG[sec] || PROG[1], ac = prog[b4], rac = ac[0], notes = ac[1], mesD = d16 * 16;
    if (sec === 0) {
      if (pos === 0 && A.mesSec === 0) { basse(t, 38, mesD * 1.4, 0.15, true, -5); balayage(t, mesD, 0.12, false); nappe(t, [50, 57, 62, 65], mesD * 1.6, 0.03); kick(t, 0.5); }
      if (A.mesSec >= 1 && pos % 2 === 0) cloche(t, [74, 77, 81, 86][(pos >> 1) % 4] - (pos >= 8 ? 0 : 12), d16 * 1.5, 0.03);
      if (A.mesSec >= 1 && pos === 0) { basse(t, 38, d16 * 6, 0.12); kick(t, 0.5); }
      return;
    }
    /* la nappe */
    if (pos === 0) nappe(t, notes, mesD, sec === 3 ? 0.018 : 0.026);
    /* la basse FM */
    if (sec === 1) { if (pos % 2 === 0) basse(t, rac + ((pos % 4 === 2) ? 12 : 0) + (pos === 14 ? 7 : 0), d16 * 1.6, 0.11); }
    else if (sec === 2) {
      if (pos === 0) basse(t, rac, d16 * 6, 0.17, true);
      if (pos === 6) basse(t, rac, d16 * 2, 0.12, true);
      if (pos === 10) basse(t, rac + 7, d16 * 3, 0.11, true);
      if (pos === 14 && b4 === 3) basse(t, rac + 12, d16 * 2, 0.1, true, -12);
    } else if (sec === 3) basse(t, rac + (pos & 1 ? 12 : 0), d16 * 0.9, pos & 1 ? 0.07 : 0.1);
    /* la batterie */
    if (sec === 1) {
      if (pos === 0 || pos === 8 || pos === 6 && b4 === 1 || pos === 10 && b4 === 3) kick(t, 0.5);
      if (pos === 4 || pos === 12) caisse(t, 0.2);
      if (pos % 2 === 0) charley(t, pos % 4 === 2 ? 0.045 : 0.025, pos === 14);
      if (b4 === 3 && pos >= 12) tom(t, 52 - (pos - 12) * 3, 0.2);
    } else if (sec === 2) {
      if (pos === 0 || pos === 11) kick(t, 0.62);
      if (pos === 8) caisse(t, 0.26);
      if (pos % 4 === 2) charley(t, 0.03, false);
      if (pos === 0 && (A.mesSec & 1) === 0) tom(t, 38, 0.3);
      if (b4 === 3 && pos === 14) caisse(t, 0.1);
    } else if (sec === 3) {
      if (pos % 4 === 0) kick(t, 0.55);
      if (pos === 4 || pos === 12) caisse(t, 0.22);
      charley(t, pos % 2 ? 0.04 : 0.02, pos % 4 === 2 && pos === 14);
      if (A.mesSec % 4 === 0 && pos === 0) cymbale(t, 0.14);
    }
    /* les cloches et la puce en arpèges */
    var arp = [notes[0], notes[1], notes[2], notes[0] + 12], j;
    if (sec === 1 && A.mesSec >= 2 && pos % 2 === 1) { j = (pos >> 1) % 4; cloche(t, arp[[0, 1, 2, 3, 2, 1, 0, 2][(pos >> 1) % 8]] + 12, d16 * 1.2, 0.022); }
    if (sec === 2 && pos % 4 === 2) puce(t, arp[(pos >> 2) % 4] + 12, d16 * 1.5, 0.018);
    if (sec === 3) { j = A.var & 1 ? 3 - (pos % 4) : pos % 4; cloche(t, arp[j] + 24, d16 * 0.9, 0.018); }
    /* le lead : la phrase, à partir de la deuxième mesure */
    if (A.mesSec >= (sec === 2 ? 2 : 1)) {
      var g = GM[sec - 1][b4], ev = (sec === 1 && b4 === 3 && (A.var & 2)) ? GV3[pos] : g[pos];
      if (ev) {
        lead(t, ev[1], ev[2] * d16 * 0.95, sec === 2 ? 0.05 : 0.045, sec === 2);
        if (sec === 1 && ev[2] >= 4 && rna() < 0.3) puce(t + d16 * 2, ev[1] + 12, d16, 0.02);
      }
    }
  }
  /* la mesure d'annonce : toute la musique se tourne vers le changement de tempo */
  function annonce(t, pos, d16, cible) {
    var descend = cible === 2, mesD = d16 * 16;
    if (pos === 0) { cymbale(t, 0.2); balayage(t, mesD, 0.14, !descend); basse(t, 38, mesD * 0.95, 0.12, descend, descend ? -12 : 12); }
    if (pos >= 8 || !descend) caisse(t, 0.03 + pos * 0.009);
    if (descend && pos >= 8 && pos % 2 === 0) tom(t, 50 - (pos - 8) * 1.6, 0.26);
    if (!descend && pos % 4 === 0) tom(t, 40 + pos, 0.24);
    var tete = [74, 77, 81, 79, 77];
    if (pos < 10 && pos % 2 === 0) lead(t, tete[pos >> 1] - (descend ? (pos >> 1) * 2 : -((pos >> 1) * 2)), d16 * 1.8, 0.04, descend);
    if (pos === 15) kick(t, 0.4);
  }
  function finale(t) {
    impact(t, 0.8);
    var d = 60 / 76, tt = t + 0.6;
    nappe(tt, [50, 62, 66, 69, 74], 6.5, 0.045); basse(tt, 38, 5.5, 0.14, true); cymbale(tt, 0.2);
    var M = [[0, 74, 1.5], [1.5, 78, 0.5], [2, 81, 1.5], [3.5, 79, 0.5], [4, 78, 2.5]];
    for (var i = 0; i < M.length; i++) lead(tt + M[i][0] * d, M[i][1], M[i][2] * d * 0.95, 0.05, false);
    for (var k = 0; k < 8; k++) cloche(tt + 0.2 + k * d * 0.5, [74, 78, 81, 86][k % 4] + 12, d * 0.6, 0.02);
    journal('musique finale');
  }
  function ordonnancer() {
    var c = audio(); if (!c || c.state !== 'running' || T.phase === 'fini') return;
    if (muet()) { A.next = 0; return; }
    if (T.phase === 'sortie' && !A.finJoue) { A.finJoue = true; A.X.sec = 4; finale(c.currentTime + 0.03); }
    if (A.X.sec === 4) {
      if (!A.fondu && T.pt > CFG.sortie - 1.2) { A.fondu = true; try { A.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.5); } catch (e) { } }
      return;
    }
    if (A.next < c.currentTime) A.next = c.currentTime + 0.05;
    var garde = 0;
    while (A.next < c.currentTime + 0.15 && ++garde < 32) {
      var d16 = 60 / A.X.tempo / 4;
      pasMusique(A.next, d16);
      A.pas++; A.next += 60 / A.X.tempo / 4;
    }
  }
  function sfx(nom) {
    if (!sonOk('effets')) return;
    var t = A.ctx.currentTime + 0.01;
    if (nom === 'cellule') { fm(t, 88, 0.08, 0.05, 2, 1.5, 0.3); fm(t + 0.05, 93, 0.08, 0.04, 2, 1.5, 0.3); }
    else if (nom === 'balise') { for (var k = 0; k < 4; k++) cloche(t + k * 0.06, [74, 77, 81, 86][k] + 12, 0.25, 0.05); }
    else if (nom === 'coupe') { bruitPerc(t, 0.09, 0.14, 'highpass', 2200); ton(t, 700, 280, 0.16, 0.06, 'square'); }
    else if (nom === 'mort') { ton(t, 520, 60, 0.8, 0.1, 'sawtooth'); bruitPerc(t, 0.6, 0.25, 'lowpass', 1800, 100); }
    else if (nom === 'bouclier') { fm(t, 81, 0.3, 0.06, 1.5, 3, 0.2); fm(t + 0.08, 76, 0.3, 0.05, 1.5, 3, 0.2); }
    else if (nom === 'regen') { for (var j = 0; j < 3; j++) fm(t + j * 0.07, 69 + j * 5, 0.2, 0.05, 1, 1.2, 0.2); }
    else if (nom === 'ascenseur') { balayage(t, 0.7, 0.12, false); fm(t, 50, 0.6, 0.08, 0.5, 4, 0.5, 0, false, -12); }
    else if (nom === 'monte') { balayage(t, 0.7, 0.12, true); fm(t, 50, 0.6, 0.08, 0.5, 4, 0.5, 0, false, 12); }
    else if (nom === 'ouvre') { cymbale(t, 0.15); for (var q = 0; q < 3; q++) cloche(t + q * 0.12, 74 + q * 7, 0.4, 0.05); }
    else if (nom === 'charge') ton(t, 300, 900, 0.5, 0.025, 'sawtooth');
    else if (nom === 'rayon') { bruitPerc(t, 0.3, 0.16, 'bandpass', 1400, 500, 2); ton(t, 220, 110, 0.3, 0.08, 'sawtooth'); }
    else if (nom === 'chute') ton(t, 1600, 500, 0.38, 0.03, 'triangle');
    else if (nom === 'mine') { bruitPerc(t, 0.7, 0.3, 'lowpass', 2600, 90); ton(t, 90, 36, 0.6, 0.25); }
    else if (nom === 'refus') ton(t, 180, 150, 0.12, 0.05, 'square');
  }

  /* ================================ le serpent ================================ */
  function placerDepart() {
    var y = 1, x = Math.min(T.C - 3, CFG.longueurDepart);
    T.snake = [];
    for (var i = 0; i < CFG.longueurDepart; i++) T.snake.push({ x: x - i, y: y, f: 0 });
    T.dir = 0; T.file.length = 0; T.pousse = 0; T.queue = null; T.vertical = -1;
  }
  function consommerBouclier(x, y, f) {
    T.bouclier = false; T.choc = 0.5; T.compte.boucliers++;
    eclats(x, y, f, P.os, 14, 0.5);
    sfx('bouclier'); souffler('BOUCLIER !');
    journal('bouclier consommé');
  }
  /* le serpent est coupé au segment k : ce qui tombe, ce sont les bonus perdus (le régénérateur les fait repousser) */
  function couper(k, cause) {
    if (k < 2) k = 2;
    if (k >= T.snake.length) return false;
    if (cause !== 'morsure' && T.bouclier) { var s0 = T.snake[k]; consommerBouclier(s0.x, s0.y, s0.f); return true; }
    var tombe = T.snake.splice(k);
    for (var i = 0; i < tombe.length; i++) eclats(tombe[i].x, tombe[i].y, tombe[i].f, i % 2 ? P.cyan : P.cyanP, 3, 0.4, true);
    T.perdu += tombe.length; T.hit = 0.25; T.compte.coupes++; if (cause === 'morsure') T.compte.morsures++;
    sfx('coupe'); souffler((cause === 'morsure' ? 'MORSURE −' : 'TOUCHÉ −') + tombe.length);
    journal('coupe ' + cause + ' -' + tombe.length);
    if (!T.items.some(function (it) { return it.type === 'regen'; })) poserItem('regen', T.snake[0].f);
    return false;
  }
  function mourir(cause) {
    if (T.mort || T.invul > 0) return;
    T.morts++; T.mort = true; T.mortT = 0; T.longAvant = T.snake.length + T.pousse; T.vertical = -1; T.file.length = 0;
    var h = T.snake[0];
    eclats(h.x, h.y, h.f, P.os, 24, 0.5);
    for (var i = 0; i < T.snake.length; i++) eclats(T.snake[i].x, T.snake[i].y, T.snake[i].f, i & 1 ? P.cyan : P.cyanP, 3, 0.4, true);
    T.hit = 0.6; sfx('mort');
    journal('mort ' + T.morts + ' ' + cause);
  }
  /* la renaissance : la plus longue rangée libre de l'étage, loin des ennemis et des menaces */
  function renaitre() {
    var f = T.snake.length ? T.snake[0].f : 0, best = null, bs = -1e9, L = 4, x, y, s, k;
    for (y = 0; y < T.R; y++) for (x = 0; x < T.C; x++) for (s = 0; s < 2; s++) {
      var sens = s ? -1 : 1, ok = true;
      for (k = -2; k < L && ok; k++) {                          // deux cases libres devant, quatre derrière
        var xx = x - sens * k;
        if (!dedans(xx, y) || pilier(f, xx, y) || ascOuvert(xx, y) || estSortie(f, xx, y) || ennemiEn(f, xx, y) || menaceSur(f, xx, y)) ok = false;
      }
      if (!ok) continue;
      var dmin = 99;
      for (k = 0; k < T.E.length; k++) { var e = T.E[k]; if (e.f !== f || e.canon) continue; dmin = Math.min(dmin, Math.abs(e.x - x) + Math.abs(e.y - y)); }
      var sc = Math.min(dmin, 7) * 10 - Math.abs(y - T.R / 2) + hash2(x, y, T.morts) * 2;
      if (sc > bs) { bs = sc; best = { x: x, y: y, sens: sens }; }
    }
    if (!best) best = { x: 4, y: 1, sens: 1 };
    T.snake = [];
    for (k = 0; k < L; k++) T.snake.push({ x: best.x - best.sens * k, y: best.y, f: f });
    T.dir = best.sens > 0 ? 0 : 2; T.file.length = 0; T.queue = null; T.vertical = -1;
    T.pousse = clamp(Math.min(T.longAvant, CFG.longueurMax) - L, 0, 10);
    T.mort = false; T.invul = CFG.invuln;
    souffler('ENCORE');
    journal('renaissance');
  }
  /* un pas du serpent, sur une double croche */
  function pas() {
    T.n++;
    if ((T.n - 1) % 16 === 0) {
      var r = barre(T.TJ, secVoulue());
      if (r === 'annonce') { journal('tempo annonce ' + T.TJ.cible); marquer('annonce' + T.TJ.cible); }
      if (r === 'change') { T.compte.tempo++; journal('tempo ' + Math.round(T.TJ.tempo)); marquer('tempo' + T.TJ.sec); }
    }
    doubleCroche(T.TJ);
    majEnnemisPas();
    if (T.phase === 'sortie') { pasSortie(); return; }
    if (T.mort || T.phase === 'titre') return;
    var h = T.snake[0], nx, ny, nf, vertical = false;
    if (T.vertical >= 0) { nx = h.x; ny = h.y; nf = T.vertical; T.vertical = -1; vertical = true; }
    else {
      while (T.file.length) { var d = T.file.shift(); if ((d + 2) % 4 !== T.dir) { T.dir = d; break; } }
      nx = h.x + DX[T.dir]; ny = h.y + DY[T.dir]; nf = h.f;
      if (!dedans(nx, ny) || pilier(nf, nx, ny)) {
        if (T.bouclier || T.invul > 0) {
          if (T.bouclier) consommerBouclier(h.x, h.y, h.f);
          var d2 = tournerLibre(h);
          if (d2 < 0) { T.invul = 0; mourir('mur'); return; }
          T.dir = d2; nx = h.x + DX[d2]; ny = h.y + DY[d2];
        } else { mourir(dedans(nx, ny) ? 'pilier' : 'mur'); return; }
      }
    }
    var e = ennemiEn(nf, nx, ny);
    if (e && vertical) { detruire(e); e = null; }                   // le puits est à soi : ce qui l'encombre saute
    if (e) {
      if (T.bouclier) { consommerBouclier(nx, ny, nf); detruire(e); }
      else if (T.invul <= 0) { mourir('ennemi'); return; }
    }
    if (menaceFeu(nf, nx, ny) && T.invul <= 0) {
      if (T.bouclier) consommerBouclier(nx, ny, nf); else { mourir('feu'); return; }
    }
    /* se mordre coupe, ne tue pas */
    var lim = T.snake.length - (T.pousse > 0 ? 0 : 1);
    for (var k = 1; k < lim; k++) { var sg = T.snake[k]; if (sg.x === nx && sg.y === ny && sg.f === nf) { couper(k, 'morsure'); break; } }
    T.snake.unshift({ x: nx, y: ny, f: nf });
    if (T.pousse > 0 && T.snake.length <= CFG.longueurMax) { T.pousse--; T.queue = null; } else { T.queue = T.snake.pop(); if (T.pousse > 0) T.pousse--; }
    if (T.regen > 0 && T.perdu > 0) { T.regen--; T.perdu--; T.pousse++; var q = T.snake[T.snake.length - 1]; eclats(q.x, q.y, q.f, P.jaune, 2, 0.3); }
    traine();
    ramasser(nx, ny, nf, vertical);
    if (vertical) arrivee(h.f, nf);
  }
  function tournerLibre(h) {
    var ordre = [(T.dir + 1) % 4, (T.dir + 3) % 4, T.dir];
    for (var i = 0; i < ordre.length; i++) {
      var d = ordre[i], x = h.x + DX[d], y = h.y + DY[d];
      if (dedans(x, y) && !pilier(h.f, x, y) && corpsEn(h.f, x, y, 1) < 0) return d;
    }
    return -1;
  }
  function ramasser(x, y, f, vertical) {
    var i;
    for (i = T.items.length - 1; i >= 0; i--) {
      var it = T.items[i]; if (it.f !== f || it.x !== x || it.y !== y) continue;
      T.items.splice(i, 1);
      if (it.type === 'cellule') {
        T.pousse += 1; T.compte.mange++; T.score += PTS.cellule * (1 + (T.snake.length / 8 | 0)); eclats(x, y, f, P.ambre, 8, 0.5); sfx('cellule');
        if (T.compte.mange % 7 === 0 && !T.bouclier && !T.items.some(function (q) { return q.type === 'bouclier'; })) poserItem('bouclier', f);
      } else if (it.type === 'regen') {
        T.regen = T.perdu; T.score += PTS.regen; T.compte.regens++; eclats(x, y, f, P.jaune, 14, 0.6); sfx('regen'); souffler('RÉGÉNÉRATION');
      } else if (it.type === 'bouclier') {
        T.bouclier = true; T.score += PTS.bouclier; eclats(x, y, f, P.os, 14, 0.6); sfx('bouclier'); souffler('BOUCLIER ACTIF');
      }
    }
    for (i = 0; i < T.balises.length; i++) {
      var b = T.balises[i]; if (b.allume || b.f !== f || b.x !== x || b.y !== y) continue;
      b.allume = true; b.tA = T.t; T.score += PTS.balise; T.compte.balises++; T.obj.faits++;
      eclats(x, y, f, couleurPilote(), 22, 0.8); eclats(x, y, f, P.os, 8, 0.8);
      sfx('balise'); souffler('BALISE ' + T.obj.faits + '/' + T.obj.total);
      journal('balise ' + T.obj.faits + '/' + T.obj.total + ' étage ' + f);
      T.baliseT = CFG.baliseDelai;
    }
    if (!vertical && ascOuvert(x, y)) { T.vertical = 1 - f; T.compte.ascenseurs++; sfx(f === 0 ? 'ascenseur' : 'monte'); journal('ascenseur ' + f + ' → ' + (1 - f)); }
    if (estSortie(f, x, y) && T.phase === 'remontee') commencerSortie();
  }
  /* la tête vient de changer d'étage */
  function arrivee(de, vers) {
    T.score += PTS.etage;
    marquer('etage' + vers + '_' + T.phase);
    if (T.phase === 'grille' && vers === 1) debutProfond();
    else souffler(vers === 1 ? 'LE PROFOND' : 'LA GRILLE');
  }
  /* la traînée du pilote, au bout de la queue */
  function traine() {
    var q = T.snake[T.snake.length - 1], c = accent();
    for (var i = 0; i < 2; i++) {
      T.parts.push({ x: q.x + 0.5 + (rnd() - 0.5) * 0.5, y: q.y + 0.5 + (rnd() - 0.5) * 0.5, l: -q.f, z: 0.3, vx: (rnd() - 0.5) * 0.4, vy: (rnd() - 0.5) * 0.4,
        vz: 0.8 + rnd() * 0.6, c: c[0], vie: 0.9, vie0: 0.9, trace: true });
    }
  }
  function eclats(x, y, f, c, n, z, serpent) {
    for (var i = 0; i < n; i++) {
      var a = rnd() * 6.283, v = 1 + rnd() * 3;
      if (T.parts.length > 360) T.parts.shift();
      T.parts.push({ x: x + 0.5, y: y + 0.5, l: -f, z: z || 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 2 + rnd() * 3, c: c, vie: 0.5 + rnd() * 0.5, vie0: 1, serpent: !!serpent });
    }
  }

  /* ================================ les ennemis ================================ */
  function ajouterEnnemi(k, f) {
    var c = caseLibre(f, k === 'rodeur' ? 7 : 5);
    if (!c) return null;
    var axe = rnd() < 0.5 ? 0 : 1, e = { k: k, f: f, x: c.x, y: c.y, px: c.x, py: c.y, dx: axe ? 0 : 1, dy: axe ? 1 : 0, t0: T.n,
      pas: k === 'sentinelle' ? 2 : k === 'rodeur' ? 3 : 1, canon: k === 'projecteur' || k === 'largueur', cx: c.x, cy: c.y, charge: 0 };
    T.E.push(e);
    journal('ennemi ' + k + ' étage ' + f);
    return e;
  }
  function detruire(e) {
    var i = T.E.indexOf(e); if (i < 0) return;
    T.E.splice(i, 1); T.score += PTS.ennemi; T.compte.detruits++;
    eclats(e.x, e.y, e.f, P.magenta, 18, 0.5); eclats(e.x, e.y, e.f, P.os, 6, 0.5);
    T.ev.remplacer = (T.ev.remplacer || 0) + 1;
  }
  function bloque(e, x, y) {
    return !dedans(x, y) || pilier(e.f, x, y) || ascOuvert(x, y) || estSortie(e.f, x, y) || !!ennemiEn(e.f, x, y, e) || objetBalise(e.f, x, y);
  }
  function objetBalise(f, x, y) { for (var i = 0; i < T.balises.length; i++) { var b = T.balises[i]; if (b.f === f && b.x === x && b.y === y && !b.allume) return true; } return false; }
  function majEnnemisPas() {
    var h = T.snake[0];
    for (var i = 0; i < T.E.length; i++) {
      var e = T.E[i];
      if (e.canon) continue;
      if ((T.n - e.t0) < e.pas) continue;
      e.t0 = T.n; e.px = e.x; e.py = e.y;
      var tx = e.x + e.dx, ty = e.y + e.dy;
      if (e.k === 'rodeur') {
        /* le rôdeur chasse la tête quand elle est sur son étage ; sinon il erre */
        var cand = [], d, best = -1, bd = 1e9;
        for (d = 0; d < 4; d++) { var x = e.x + DX[d], y = e.y + DY[d]; if (!bloque(e, x, y)) cand.push(d); }
        if (!cand.length) continue;
        for (var j = 0; j < cand.length; j++) {
          d = cand[j];
          var dd = (h && h.f === e.f && !T.mort) ? Math.abs(e.x + DX[d] - h.x) + Math.abs(e.y + DY[d] - h.y) : rnd() * 4;
          if (DX[d] === -e.dx && DY[d] === -e.dy) dd += 0.6;          // il ne revient pas sur ses pas sans raison
          if (dd < bd) { bd = dd; best = d; }
        }
        e.dx = DX[best]; e.dy = DY[best]; tx = e.x + e.dx; ty = e.y + e.dy;
      } else if (bloque(e, tx, ty)) { e.dx = -e.dx; e.dy = -e.dy; continue; }
      e.x = tx; e.y = ty;
      if (T.mort || T.phase === 'sortie' || T.phase === 'titre') continue;
      if (h && h.f === e.f && h.x === tx && h.y === ty) {
        if (T.bouclier) { consommerBouclier(tx, ty, e.f); e.x = e.px; e.y = e.py; e.dx = -e.dx; e.dy = -e.dy; }
        else if (T.invul <= 0) mourir('ennemi');
        continue;
      }
      var k = corpsEn(e.f, tx, ty, 1);
      if (k >= 1 && T.invul <= 0) { if (couper(k, 'ennemi')) { e.x = e.px; e.y = e.py; e.dx = -e.dx; e.dy = -e.dy; } }
    }
  }

  /* ================================ les menaces d'un autre étage ================================ */
  /* un projecteur du profond tire vers la grille (une case) ; un largueur de la grille lâche une mine sur le profond (une croix) */
  function tirer() {
    var h = T.snake[0]; if (!h) return;
    var cible = 1 - h.f, src = null, i;
    for (i = 0; i < T.E.length; i++) { var e = T.E[i]; if (e.canon && e.f === cible && !e.charge) { if (!src || hash2(i, T.n, 3) > 0.5) src = e; } }
    if (!src) return;
    var mine = src.k === 'largueur', vise = (T.compte.rayons + T.compte.mines) % 2 === 0;
    var x = h.x, y = h.y;
    if (vise) { var av = mine ? 4 : 5; x = clamp(h.x + DX[T.dir] * av, 0, T.C - 1); y = clamp(h.y + DY[T.dir] * av, 0, T.R - 1); }
    if (pilier(h.f, x, y)) { x = h.x; y = h.y; }
    var m = { k: mine ? 'mine' : 'rayon', f: h.f, x: x, y: y, t: 0, d: mine ? CFG.mine.annonce : CFG.rayon.annonce, feu: false, ft: 0, src: src, cases: [] };
    m.cases.push([x, y]);
    if (mine) for (var d = 0; d < 4; d++) { var cx = x + DX[d], cy = y + DY[d]; if (dedans(cx, cy)) m.cases.push([cx, cy]); }
    src.charge = 1; src.tx = x; src.ty = y;
    T.M.push(m);
    if (mine) T.compte.mines++; else T.compte.rayons++;
    sfx('charge');
    journal((mine ? 'mine' : 'rayon') + ' visé ' + x + ',' + y);
  }
  function menaceSur(f, x, y) {
    for (var i = 0; i < T.M.length; i++) { var m = T.M[i]; if (m.f !== f) continue; for (var k = 0; k < m.cases.length; k++) if (m.cases[k][0] === x && m.cases[k][1] === y) return m; }
    return null;
  }
  function menaceFeu(f, x, y) { var m = menaceSur(f, x, y); return !!(m && m.feu); }
  function majMenaces(dt) {
    var i, e;
    /* les canons glissent sous (ou au-dessus de) la case qu'ils visent */
    for (i = 0; i < T.E.length; i++) {
      e = T.E[i]; if (!e.canon) continue;
      var tx = e.charge ? e.tx : e.x, ty = e.charge ? e.ty : e.y, k = Math.min(1, dt * 5);
      e.cx += (tx - e.cx) * k; e.cy += (ty - e.cy) * k;
      if (!e.charge) {
        e.errT = (e.errT || 0) - dt;
        if (e.errT <= 0) { e.errT = 1.5 + rnd() * 1.5; var c = caseLibre(e.f, 0); if (c) { e.x = c.x; e.y = c.y; } }
      }
    }
    for (i = T.M.length - 1; i >= 0; i--) {
      var m = T.M[i];
      m.t += dt;
      if (!m.feu && m.k === 'mine' && !m.chute && m.t >= m.d - CFG.mine.chute) { m.chute = true; sfx('chute'); }
      if (!m.feu && m.t >= m.d) {
        m.feu = true; m.ft = 0;
        sfx(m.k === 'mine' ? 'mine' : 'rayon');
        for (var k2 = 0; k2 < m.cases.length; k2++) {
          var cx2 = m.cases[k2][0], cy2 = m.cases[k2][1];
          eclats(cx2, cy2, m.f, m.k === 'mine' ? P.brasier : P.rose, m.k === 'mine' ? 6 : 10, 0.2);
          if (m.k === 'mine') eclats(cx2, cy2, m.f, P.jaune, 3, 0.2);
        }
        toucherMenace(m);
      }
      if (m.feu) {
        m.ft += dt;
        if (m.ft >= (m.k === 'mine' ? CFG.mine.feu : CFG.rayon.feu)) { T.M.splice(i, 1); if (m.src) m.src.charge = 0; }
      }
    }
  }
  function toucherMenace(m) {
    if (T.mort || T.phase === 'sortie') return;
    var h = T.snake[0], k, j;
    for (j = 0; j < m.cases.length; j++) {
      var x = m.cases[j][0], y = m.cases[j][1];
      if (h.f === m.f && h.x === x && h.y === y) {
        if (T.invul > 0) continue;
        if (T.bouclier) { consommerBouclier(x, y, m.f); return; }
        mourir(m.k); return;
      }
    }
    if (T.invul > 0) return;
    for (k = 1; k < T.snake.length; k++) {
      var s = T.snake[k]; if (s.f !== m.f) continue;
      for (j = 0; j < m.cases.length; j++) if (s.x === m.cases[j][0] && s.y === m.cases[j][1]) { couper(k, m.k); return; }
    }
  }

  /* ================================ les objets ================================ */
  function poserItem(type, f) {
    var c = caseLibre(f, 3);
    if (!c) return;
    T.items.push({ type: type, x: c.x, y: c.y, f: f, t: 0 });
  }
  function poserBalise(f, proche) {
    var c = proche ? caseLibre(f, 3, 6) : caseLibre(f, 7);
    if (!c) c = caseLibre(f, 4);
    if (!c) c = caseLibre(f, 2);
    if (!c) return null;
    var b = { x: c.x, y: c.y, f: f, allume: false, t: 0, age: 0, tA: -1 };
    T.balises.push(b);
    journal('balise posée ' + c.x + ',' + c.y + ' étage ' + f);
    return b;
  }
  function balisesEnAttente() { var n = 0; for (var i = 0; i < T.balises.length; i++) if (!T.balises[i].allume) n++; return n; }

  /* ================================ les étapes ================================ */
  function debutGrille() {
    T.phase = 'grille'; T.sec = 1; T.pt = 0; T.ev.ascOuvert = false;
    T.obj = { total: CFG.balises[0], faits: 0, f: 0 };
    T.baliseT = 1.0; T.feuT = 1.5;
    ajouterEnnemi('sentinelle', 0); ajouterEnnemi('sentinelle', 0);
    ajouterEnnemi('projecteur', 1); ajouterEnnemi('projecteur', 1);
    ajouterEnnemi('sentinelle', 1);
    dire('ALLUME ' + CFG.balises[0] + ' BALISES', 2.6, 'LA GRILLE — LE PREMIER ÉTAGE');
    marquer('grille'); journal('grille');
  }
  function ouvrirAscenseur() {
    T.ev.ascOuvert = true; T.asc[0].ouvert = true; T.asc[0].t = 0;
    var a = T.asc[0], o = objetEn(0, a.x, a.y); if (o) { var j = T.items.indexOf(o); if (j >= 0) T.items.splice(j, 1); }
    sfx('ouvre');
    dire("L'ASCENSEUR S'OUVRE", 2.8, 'DESCENDS DANS LE PROFOND');
    marquer('ascenseur'); journal('ascenseur ouvert');
  }
  function debutProfond() {
    T.phase = 'profond'; T.sec = 2; T.pt = 0;
    T.obj = { total: CFG.balises[1], faits: 0, f: 1 };
    T.baliseT = 1.4; T.feuT = 1.5;
    for (var i = T.items.length - 1; i >= 0; i--) if (T.items[i].f === 0 && T.items[i].type === 'cellule') T.items.splice(i, 1);
    ajouterEnnemi('rodeur', 1); ajouterEnnemi('rodeur', 1);
    ajouterEnnemi('largueur', 0); ajouterEnnemi('largueur', 0);
    dire('LE PROFOND', 2.6, 'ALLUME ' + CFG.balises[1] + ' BALISES — MINES D\'EN HAUT');
    marquer('profond'); journal('profond');
  }
  function debutRemontee() {
    T.phase = 'remontee'; T.sec = 3; T.pt = 0;
    T.obj = { total: CFG.balises[2], faits: 0, f: -1 };
    T.baliseT = 1.0; T.feuT = 1.5;
    T.asc[0].ouvert = true; T.asc[1].ouvert = true; T.asc[0].t = 0; T.asc[1].t = 0;
    for (var k = 0; k < 2; k++) { var o = objetEn(0, T.asc[k].x, T.asc[k].y) || objetEn(1, T.asc[k].x, T.asc[k].y); if (o && T.items.indexOf(o) >= 0) T.items.splice(T.items.indexOf(o), 1); }
    sfx('ouvre');
    dire('LA REMONTÉE', 2.6, 'DEUX BALISES PAR ÉTAGE');
    souffler('ESPACE / 2 DOIGTS : ÉTAGE'); T.petitT = -2.5;
    marquer('remontee'); journal('remontee');
  }
  function ouvrirSortie() {
    var p = T.porte;
    T.sortieG = { x: p.x, y: p.y, t: 0 };
    for (var i = T.items.length - 1; i >= 0; i--) if (T.items[i].f === 0 && T.items[i].x === p.x && T.items[i].y === p.y) T.items.splice(i, 1);
    for (i = 0; i < T.E.length; i++) { var e = T.E[i]; if (e.f === 0 && e.x === p.x && e.y === p.y) { e.x = e.px; e.y = e.py; } }
    sfx('ouvre');
    dire("LA GRILLE S'OUVRE", 3, 'REMONTE VERS LE NÉON');
    marquer('sortieOuverte'); journal('sortie ouverte');
  }
  function commencerSortie() {
    if (T.phase === 'sortie') return;
    T.phase = 'sortie'; T.sec = 4; T.pt = 0; T.montes = 0; T.toutMonte = -1; T.M.length = 0; T.vertical = -1; T.mort = false; T.invul = 0;
    for (var i = 0; i < T.E.length; i++) T.E[i].charge = 0;
    eclats(T.porte.x, T.porte.y, 0, P.os, 20, 0.4); eclats(T.porte.x, T.porte.y, 0, couleurPilote(), 20, 0.4);
    dire('1993 — LA PROFONDEUR', 3.6, 'FRANCHIE. VERS LE NÉON.');
    marquer('sortie'); journal('sortie');
  }
  function pasSortie() {
    var p = T.porte;
    if (!T.snake.length) return;
    T.snake.unshift({ x: p.x, y: p.y, f: 0, monte: true });
    T.queue = T.snake.pop();
    var n = 0; while (n < T.snake.length && T.snake[n].monte) n++;
    T.montes = n;
    if (n >= T.snake.length && T.toutMonte < 0) T.toutMonte = T.pt;
  }
  function majSection(dt) {
    var h = T.snake[0], i;
    if (T.phase === 'grille' || T.phase === 'profond' || T.phase === 'remontee') {
      /* les balises : une à la fois sur la grille et au profond, une par étage dans la remontée */
      if (T.obj.faits + balisesEnAttente() < T.obj.total) {
        T.baliseT -= dt;
        if (T.baliseT <= 0) {
          if (T.phase === 'remontee') {
            /* deux par étage, une à la fois sur chacun */
            for (var fe = 0; fe < 2; fe++) {
              var nAtt = 0, nTot = 0;
              for (i = 0; i < T.balises.length; i++) { var bb = T.balises[i]; if (bb.sec !== 3 || bb.f !== fe) continue; nTot++; if (!bb.allume) nAtt++; }
              if (!nAtt && nTot < T.obj.total / 2) { var nb = poserBalise(fe); if (nb) nb.sec = 3; }
            }
          } else if (!balisesEnAttente()) { var b0 = poserBalise(T.obj.f); if (b0) b0.sec = T.sec; }
          T.baliseT = 0.3;
        }
      }
      /* l'aide : une balise qu'on ne rejoint pas se rapproche */
      for (i = 0; i < T.balises.length; i++) {
        var b = T.balises[i]; if (b.allume) continue;
        b.age += dt;
        if (b.age > CFG.baliseAide && h && h.f === b.f && !T.mort) {
          var c = caseLibre(b.f, 3, 6); if (c) { b.x = c.x; b.y = c.y; b.t = 0; b.age = 0; T.compte.aides++; journal('aide balise'); }
        }
      }
      if (T.obj.faits >= T.obj.total) {
        if (T.phase === 'grille' && !T.ev.ascOuvert) ouvrirAscenseur();
        else if (T.phase === 'profond') debutRemontee();
        else if (T.phase === 'remontee' && !T.sortieG) ouvrirSortie();
      }
      /* les cellules : deux sur l'étage de la tête */
      if (h && !T.mort) {
        var nc = 0; for (i = 0; i < T.items.length; i++) if (T.items[i].type === 'cellule' && T.items[i].f === h.f) nc++;
        if (nc < 2) poserItem('cellule', h.f);
      }
      /* un bouclier par étape */
      if (!T.ev['bouc' + T.sec] && T.pt >= (T.sec === 1 ? 9 : 5) && !T.bouclier && h) { T.ev['bouc' + T.sec] = 1; poserItem('bouclier', h.f); }
      /* les tirs de l'autre étage */
      var att = T.sec === 1 ? 4 : T.sec === 2 ? 2.5 : 2;
      if (T.pt >= att && h && !T.mort && T.vertical < 0) {
        T.feuT -= dt;
        if (T.feuT <= 0) { T.feuT = CFG.cadence[T.sec - 1] * (0.85 + rnd() * 0.3); tirer(); }
      }
      /* un ennemi de plus, au milieu de chaque étape */
      if (T.phase === 'grille' && T.obj.faits >= 2 && !T.ev.sent3) { T.ev.sent3 = 1; ajouterEnnemi('sentinelle', 0); }
      if (T.phase === 'remontee' && !T.ev.rem) { T.ev.rem = 1; ajouterEnnemi('sentinelle', 1); }
      /* ce qu'un bouclier a détruit revient, plus loin */
      if (T.ev.remplacer > 0) { T.ev.remT = (T.ev.remT || 0) + dt; if (T.ev.remT > 4) { T.ev.remT = 0; T.ev.remplacer--; ajouterEnnemi(T.phase === 'grille' ? 'sentinelle' : 'rodeur', T.phase === 'grille' ? 0 : 1); } }
      /* l'ascenseur du profond se referme quand la queue l'a quitté */
      if (T.phase === 'profond' && T.asc[0].ouvert) {
        var dans = false; for (i = 0; i < T.snake.length; i++) if (T.snake[i].f === 0) dans = true;
        if (!dans && T.vertical < 0) { T.asc[0].ouvert = false; journal('ascenseur refermé'); }
      }
    }
    if (T.phase === 'sortie' && T.pt >= CFG.sortie) { T.phase = 'fini'; journal('fin'); finir(); }
  }

  /* ================================ les commandes ================================ */
  function entrees() {
    var I = S().input || {}, i;
    var action = !!(I.pouvoir || I.apogee), tient = !!I.boost;
    if (action || (tient && !T.tenu)) plonger();
    T.tenu = tient;
    if (T.phase === 'titre' || T.phase === 'sortie' || T.phase === 'fini' || T.mort) return;
    var d = -1;
    if (I.mag > 0.35 && (I.x || I.y)) d = dirEcran(I.x, I.y);
    if (I.taps) for (i = 0; i < I.taps.length; i++) {
      var tp = I.taps[i]; if (tp.doigt === 'action') continue;
      var vx = tp.x - T.teteEcran[0], vy = tp.y - T.teteEcran[1];
      if (vx * vx + vy * vy > 16) d = dirEcran(vx, vy);
    }
    if (d < 0) return;
    var der = T.file.length ? T.file[T.file.length - 1] : T.dir;
    if (d !== der && (d + 2) % 4 !== der && T.file.length < 2) T.file.push(d);
  }
  /* le saut d'étage, dans la remontée : la tête passe à l'autre étage, à la même case */
  function plonger() {
    if (T.phase !== 'remontee' || T.mort || T.vertical >= 0 || T.plongeeT > 0) return;
    var h = T.snake[0]; if (!h) return;
    if (T.snake.length > 1 && T.snake[1].f !== h.f) return;
    var f2 = 1 - h.f;
    if (pilier(f2, h.x, h.y)) { sfx('refus'); souffler('PILIER DESSOUS'); return; }
    T.vertical = f2; T.plongeeT = CFG.plongee; T.compte.plongees++;
    sfx(f2 === 1 ? 'ascenseur' : 'monte');
    journal('plongee ' + h.f + ' → ' + f2);
  }

  /* ================================ start, update ================================ */
  function start(o) {
    if (!pal() || !G()) return false;
    o = o || {};
    BAY = N.pal.BAYER || new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
    var q = o.qui;
    if (q !== 'elle' && q !== 'lui') { try { q = N.choix && N.choix.personnage ? N.choix.personnage() : null; } catch (e) { q = null; } }
    T.qui = (q === 'lui') ? 'lui' : 'elle';
    T.graine = (o.graine >>> 0) || 1993;
    rs = T.graine; rv = (T.graine * 7 + 93) % 2147483647; ra = (T.graine * 13 + 19) >>> 0;
    var g = G(); T.W = g.W | 0; T.H = g.H | 0;
    var port = T.H > T.W * 1.1;
    T.C = port ? 8 : 15; T.R = port ? 12 : 8;
    T.on = true; T.phase = 'titre'; T.sec = 0; T.t = 0; T.pt = 0; T.score = 0; T.morts = 0; T.h = 0;
    T.balises = []; T.items = []; T.E = []; T.M = []; T.parts = []; T.sortieG = null; T.obj = { total: 0, faits: 0, f: 0 };
    T.perdu = 0; T.regen = 0; T.bouclier = false; T.invul = 0; T.mort = false; T.plongeeT = 0; T.tenu = true; T.acc = 0; T.n = 0;
    T.msg = ''; T.msg2 = ''; T.msgT = 0; T.petit = ''; T.petitT = 9; T.choc = 0; T.hit = 0; T.ev = {}; T.montes = 0; T.toutMonte = -1;
    T.compte = compteNeuf(); T.journal = []; T.instants = {}; T.TJ = horlogeNeuve(0); T.periode = 60 / CFG.tempos[0] / 4;
    T.surFin = typeof o.surFin === 'function' ? o.surFin : null; T.finAppele = false;
    construire();
    placerDepart();
    layout();
    A.next = 0; A.pas = 0; A.mes = 0; A.mesSec = 0; A.X = horlogeNeuve(0); A.X.sec = -1; A.finJoue = false; A.fondu = false; A.var = 0;
    A.notes = { fm: 0, lead: 0, cloche: 0, nappe: 0, perc: 0, puce: 0 };
    if (A.out && A.ctx) { try { A.out.gain.cancelScheduledValues(A.ctx.currentTime); A.out.gain.setValueAtTime(0.7, A.ctx.currentTime); } catch (e) { } }
    PORT = null; PORT_ESSAI = 0;
    journal('debut ' + T.qui + ' ' + T.C + 'x' + T.R);
    return true;
  }
  function update(dt) {
    if (!T.on || !pal()) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    if (S().paused) return;
    if (G() && (G().W !== T.W || G().H !== T.H)) layout();
    T.t += dt; T.pt += dt; T.msgT += dt; T.petitT += dt;
    if (T.choc > 0) T.choc -= dt; if (T.hit > 0) T.hit -= dt;
    ordonnancer();
    entrees();
    /* la caméra suit l'étage de la tête (environ 0,6 s) */
    var h = T.snake[0], cible = (T.phase === 'sortie' || !h) ? 0 : -h.f;
    if (h && T.snake.length > 1 && T.snake[1].f !== h.f) cible = -h.f;
    T.h += (cible - T.h) * (1 - Math.exp(-dt * 6));
    if (Math.abs(cible - T.h) < 0.002) T.h = cible;
    if (T.phase === 'titre') {
      if (T.pt >= 1.0 && !T.ev.titre) { T.ev.titre = 1; marquer('titre'); }
      if (T.pt >= CFG.titre) debutGrille();
    }
    if (T.phase !== 'titre') {
      if (T.mort) { T.mortT += dt; if (T.mortT >= CFG.mort) renaitre(); }
      if (T.invul > 0) T.invul -= dt;
      if (T.plongeeT > 0) T.plongeeT -= dt;
    }
    /* les doubles croches : le serpent, les ennemis, les mesures */
    T.periode = 60 / T.TJ.tempo / 4;
    T.acc += dt;
    var garde = 0;
    while (T.acc >= T.periode && garde++ < 4) { T.acc -= T.periode; if (T.phase !== 'fini') pas(); T.periode = 60 / T.TJ.tempo / 4; }
    if (T.acc > T.periode) T.acc = 0;
    T.u = T.mort ? 1 : clamp(T.acc / T.periode, 0, 1);
    if (T.phase !== 'titre' && T.phase !== 'fini') { majMenaces(dt); majSection(dt); }
    majParticules(dt);
    for (var i = 0; i < T.balises.length; i++) T.balises[i].t += dt;
    for (i = 0; i < T.items.length; i++) T.items[i].t += dt;
    for (i = 0; i < T.asc.length; i++) T.asc[i].t += dt;
    if (T.sortieG) T.sortieG.t += dt;
  }
  function majParticules(dt) {
    for (var k = T.parts.length - 1; k >= 0; k--) {
      var p = T.parts[k]; p.vie -= dt;
      if (p.vie <= 0) { T.parts.splice(k, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.trace) { p.z += p.vz * dt; continue; }
      p.vz -= 9 * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.4; }
    }
  }
  function finir() {
    if (T.finAppele) return; T.finAppele = true;
    var f = T.surFin; T.on = false;
    if (f) { try { f(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('grille.surFin', e); } }
  }
  /* le saut progressif : une étape à la fois */
  function sauter() {
    if (!T.on) return false;
    T.M.length = 0; T.vertical = -1; T.file.length = 0;
    for (var i = 0; i < T.E.length; i++) T.E[i].charge = 0;
    if (T.mort) { T.mort = false; T.invul = CFG.invuln; }
    function allumer() { for (var k = 0; k < T.balises.length; k++) if (!T.balises[k].allume) { T.balises[k].allume = true; T.balises[k].tA = T.t; } }
    if (T.phase === 'titre') { journal('saut titre'); debutGrille(); return true; }
    if (T.phase === 'grille') {
      journal('saut grille'); allumer(); T.ev.ascOuvert = true;
      var a = T.asc[0];
      T.snake = [];
      for (var k = 0; k < 4; k++) T.snake.push({ x: Math.max(0, a.x - k), y: a.y, f: 1 });
      T.dir = 0; T.h = -1; T.asc[0].ouvert = false; T.invul = CFG.invuln;
      debutProfond(); return true;
    }
    if (T.phase === 'profond') { journal('saut profond'); allumer(); debutRemontee(); return true; }
    if (T.phase === 'remontee') {
      journal('saut remontee'); allumer();
      if (!T.sortieG) ouvrirSortie();
      var p = T.porte, n = Math.max(4, T.snake.length);
      T.snake = []; for (var j = 0; j < n; j++) T.snake.push({ x: Math.max(0, p.x - j), y: p.y, f: 0 });
      T.dir = 0; T.h = 0;
      commencerSortie(); return true;
    }
    if (T.phase === 'sortie') { journal('saut fin'); T.phase = 'fini'; finir(); return true; }
    return false;
  }

  /* ================================ le dessin ================================ */
  var DL = [], DLn = 0;
  function dl(d, k, o, a) {
    var e = DL[DLn];
    if (!e) { e = DL[DLn] = { d: 0, k: 0, o: null, a: 0 }; }
    e.d = d; e.k = k; e.o = o; e.a = a || 0; DLn++;
  }
  var TRI = [];
  function triDL(a, b) { return a.d - b.d; }
  function draw() {
    if (!T.on && T.phase !== 'fini') return;
    if (!pal() || !G() || !G().buf) return;
    var g = G();
    if (g.W !== T.W || g.H !== T.H) layout();
    B = g.buf(); BW = g.W; BH = g.H;
    if (!B || !BW) return;
    g.origin(0, 0);
    var f = Math.floor(T.t * 60);
    CAM.focus = T.h * CAM.suivi + (-0.5) * (1 - CAM.suivi);
    if (T.phase === 'sortie') CAM.focus = T.h * CAM.suivi + (-0.5) * (1 - CAM.suivi) + lisse((T.pt - 1.2) / 3) * 0.6;
    directionsEcran();
    TEINTE = 0;
    fond(f);
    T.ecranSerpent.length = 0;
    /* l'étage lointain d'abord, assombri ; puis celui de la tête */
    var d0 = Math.abs(0 - T.h), d1 = Math.abs(-1 - T.h), ordre = d0 >= d1 ? [0, 1] : [1, 0];
    for (var i = 0; i < 2; i++) {
      var fl = ordre[i];
      TEINTE = clamp(Math.abs(-fl - T.h), 0, 1);
      etage(fl, f);
    }
    TEINTE = 0;
    tubes(f);
    hud(f);
  }
  /* un étage : le plateau, les dalles (trouées aux ascenseurs), les télégraphes, puis les objets du fond vers l'avant */
  function etage(fl, f) {
    var l = -fl, C = T.C, R = T.R, i, j, k;
    var lui = T.qui === 'lui';
    var base = fl === 0 ? [P.np, P.nuit] : (lui ? [P.nuit, P.ardoise] : [P.nuit, P.np]);
    var onde = fl === 0 ? P.indigo : (lui ? P.sang : P.indigo), levre = fl === 0 ? P.violet : (lui ? P.sang : P.violet);
    var flanc = fl === 0 ? [P.violet, P.indigo] : (lui ? [P.sang, P.nuit] : [P.indigo, P.nuit]);
    var ti = T.phase === 'titre' ? T.pt : 99, so = T.phase === 'sortie' ? T.pt : -1;
    /* le plateau : ses deux flancs visibles */
    if (so < 0.3) {
      boiteFlancs(l, flanc, ti);
    }
    /* les dalles */
    for (j = 0; j < R; j++) for (i = 0; i < C; i++) {
      var z = 0, ox = 0, oy = 0;
      if (ti < 99) { var u = (ti - 0.15 - (i + j) * 0.035 - fl * 0.5) / 0.45; if (u < 0) continue; if (u < 1) z = (1 - u) * (1 - u) * 5; }
      if (so >= 0 && fl === 0) {
        var dd = Math.sqrt((i + 0.5 - T.porte.x - 0.5) * (i + 0.5 - T.porte.x - 0.5) + (j + 0.5 - T.porte.y - 0.5) * (j + 0.5 - T.porte.y - 0.5));
        var tau = so - 0.35 - dd * 0.09;
        if (tau > 0) { if (tau > 1.6) continue; var dx = (i + 0.5 - T.porte.x - 0.5) / (dd || 1), dy = (j + 0.5 - T.porte.y - 0.5) / (dd || 1); ox = dx * tau * tau * 2.2; oy = dy * tau * tau * 2.2; z = -tau * tau * 3; }
      }
      var a = ascEn(i, j);
      if (a && a.ouvert && so < 0) continue;                           // le puits : on voit dessous
      if (fl === 0 && T.sortieG && T.sortieG.x === i && T.sortieG.y === j) continue;
      var w = Math.sin(T.t * 2.2 - (i + j) * 0.45 - fl * 1.3), alt = (i + j) & 1;
      var c1 = base[alt], tt = w > 0.78 ? 0.5 : 0.12;
      if (z < -0.01) { c1 = P.np; tt = 0.3; }
      dalle(l, i + 0.07 + ox, j + 0.07 + oy, i + 0.93 + ox, j + 0.93 + oy, z, c1, onde, tt);
      /* la lèvre avant de la dalle : la ligne de néon de la grille */
      vue(l);
      proj(i + 0.07 + ox, j + 0.93 + oy, z); QX[0] = PX_; QY[0] = PY_; proj(i + 0.93 + ox, j + 0.93 + oy, z); QX[1] = PX_; QY[1] = PY_;
      proj(i + 0.93 + ox, j + 0.93 + oy, z - 0.12); QX[2] = PX_; QY[2] = PY_; proj(i + 0.07 + ox, j + 0.93 + oy, z - 0.12); QX[3] = PX_; QY[3] = PY_;
      poly(4, levre, flanc[1], 0.35);
      if (a && !a.ouvert) {                                          // l'ascenseur fermé : une trappe hachurée
        dalle(l, i + 0.2, j + 0.2, i + 0.8, j + 0.8, 0.01, P.ardoise, P.nuit, 0.5);
      }
    }
    /* les télégraphes et les ombres sur cet étage (au ras des dalles) */
    for (k = 0; k < T.M.length; k++) if (T.M[k].f === fl) telegraphe(T.M[k], f);
    DLn = 0;
    /* les objets */
    for (i = 0; i < C * R; i++) if (T.sol[fl][i] === 1) dl(prof(i % C + 0.5, (i / C | 0) + 0.5), 1, null, i);
    for (i = 0; i < T.balises.length; i++) if (T.balises[i].f === fl) dl(prof(T.balises[i].x + 0.5, T.balises[i].y + 0.5), 2, T.balises[i]);
    for (i = 0; i < T.items.length; i++) if (T.items[i].f === fl) dl(prof(T.items[i].x + 0.5, T.items[i].y + 0.5), 3, T.items[i]);
    for (i = 0; i < T.E.length; i++) { var e = T.E[i]; if (e.f === fl) dl(e.canon ? prof(e.cx + 0.5, e.cy + 0.5) + (e.k === 'largueur' ? 0.6 : -0.3) : prof(e.x + 0.5, e.y + 0.5), 4, e); }
    for (i = 0; i < T.asc.length; i++) if (T.asc[i].ouvert && T.phase !== 'sortie') dl(prof(T.asc[i].x + 0.5, T.asc[i].y + 0.5) - 0.45, 7, T.asc[i], fl);
    if (fl === 0 && T.sortieG && T.phase !== 'sortie') dl(prof(T.sortieG.x + 0.5, T.sortieG.y + 0.5) - 0.45, 11, T.sortieG);
    for (i = 0; i < T.M.length; i++) {
      var m = T.M[i];
      if (m.k === 'rayon' && m.feu && fl === 0) dl(prof(m.x + 0.5, m.y + 0.5) + 0.02, 8, m);
      if (m.k === 'mine' && fl === 1 && (m.chute || m.feu)) dl(prof(m.x + 0.5, m.y + 0.5) + 0.03, 9, m);
    }
    if (T.phase === 'sortie' && fl === 0) dl(prof(T.porte.x + 0.5, T.porte.y + 0.5) + 0.05, 10, null);
    serpentListe(fl);
    TRI.length = DLn;
    for (i = 0; i < DLn; i++) TRI[i] = DL[i];
    TRI.sort(triDL);
    for (i = 0; i < DLn; i++) objet(TRI[i], fl, f);
    particules(fl, f);
  }
  function boiteFlancs(l, flanc, ti) {
    if (ti < 99 && ti < 0.6) return;
    var C = T.C, R = T.R;
    vue(l);
    /* le flanc avant (y = R) et le flanc droit (x = C), de -0,35 à 0 */
    proj(0, R, 0); QX[0] = PX_; QY[0] = PY_; proj(C, R, 0); QX[1] = PX_; QY[1] = PY_;
    proj(C, R, -0.35); QX[2] = PX_; QY[2] = PY_; proj(0, R, -0.35); QX[3] = PX_; QY[3] = PY_;
    poly(4, flanc[0], P.np, 0.3);
    proj(C, 0, 0); QX[0] = PX_; QY[0] = PY_; proj(C, R, 0); QX[1] = PX_; QY[1] = PY_;
    proj(C, R, -0.35); QX[2] = PX_; QY[2] = PY_; proj(C, 0, -0.35); QX[3] = PX_; QY[3] = PY_;
    poly(4, flanc[1], P.np, 0.3);
    /* le liseré du bord, en haut des flancs */
    proj(0, R, 0); var ax = PX_, ay = PY_; proj(C, R, 0); ligne(ax, ay, PX_, PY_, flanc[0] === P.violet ? P.magenta : P.violet);
    proj(C, 0, 0); var bx = PX_, by = PY_; ligne(bx, by, PX_, PY_, flanc[0] === P.violet ? P.magenta : P.violet);
  }
  /* le télégraphe d'un tir venu de l'autre étage : la case (ou la croix) s'allume, le contour clignote */
  function telegraphe(m, f) {
    var l = -m.f, u = clamp(m.t / m.d, 0, 1), on = ((f >> 3) & 1) === 0, sauf = TEINTE;
    TEINTE = 0;
    for (var k = 0; k < m.cases.length; k++) {
      var x = m.cases[k][0], y = m.cases[k][1];
      if (m.feu) { dalle(l, x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0.02, m.k === 'mine' ? P.brasier : P.rose, P.os, 0.4); continue; }
      if (m.k === 'mine') dalle(l, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.02, P.np, P.vide, 0.2 + u * 0.4);
      else dalle(l, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.02, P.sang, P.magenta, 0.15 + u * 0.55);
      /* le contour */
      vue(l);
      var c = on ? P.magenta : P.os;
      proj(x + 0.04, y + 0.04, 0.03); var ax = PX_, ay = PY_; proj(x + 0.96, y + 0.04, 0.03); var bx = PX_, by = PY_;
      proj(x + 0.96, y + 0.96, 0.03); var cx = PX_, cy = PY_; proj(x + 0.04, y + 0.96, 0.03);
      ligne(ax, ay, bx, by, c); ligne(bx, by, cx, cy, c); ligne(cx, cy, PX_, PY_, c); ligne(PX_, PY_, ax, ay, c);
    }
    /* la ligne de visée, depuis le canon de l'autre étage */
    if (!m.feu && m.src) {
      var s = m.src;
      vue(-s.f); proj(s.cx + 0.5, s.cy + 0.5, s.k === 'largueur' ? 1.4 : 0.3); var sx = PX_, sy = PY_;
      vue(l); proj(m.x + 0.5, m.y + 0.5, 0.05);
      ligne(sx, sy, PX_, PY_, on ? P.magenta : P.rose, 2, 3);
    }
    TEINTE = sauf;
  }
  /* le serpent : un tube de boîtes le long du chemin des cases (en retard d'un pas, glissé par u) */
  var CH = [];
  function point(i, x, y, l) { var p = CH[i]; if (!p) p = CH[i] = { x: 0, y: 0, l: 0 }; p.x = x; p.y = y; p.l = l; }
  function serpentListe(fl) {
    if (T.mort || !T.snake.length) return;
    if (T.invul > 0 && ((Math.floor(T.t * 60) >> 2) & 1)) return;
    if (T.phase === 'titre') { for (var q = 0; q < T.snake.length; q++) if (fl === 0) dl(prof(T.snake[q].x + 0.5, T.snake[q].y + 0.5), 12, T.snake[q], q); return; }
    var s = T.snake, n = s.length, u = T.u, i, m = 0;
    if (T.phase === 'sortie') {
      /* ceux qui ne sont pas encore montés suivent le chemin */
      var debut = T.montes;
      if (debut >= n) return;
      if (fl === 0) {
        var a0 = s[debut - 1] || s[0];
        point(m++, a0.x + 0.5, a0.y + 0.5, 0);
        for (i = debut; i < n; i++) point(m++, s[i].x + 0.5, s[i].y + 0.5, -s[i].f);
        var qq = T.queue || s[n - 1];
        point(m++, qq.x + 0.5 + (s[n - 1].x - qq.x) * u, qq.y + 0.5 + (s[n - 1].y - qq.y) * u, -s[n - 1].f);
        aretes(m, fl, debut);
      }
      return;
    }
    var h0 = s[0], h1 = n > 1 ? s[1] : s[0];
    point(m++, h1.x + 0.5 + (h0.x - h1.x) * u, h1.y + 0.5 + (h0.y - h1.y) * u, -h1.f + (-h0.f + h1.f) * u);
    for (i = 1; i < n; i++) point(m++, s[i].x + 0.5, s[i].y + 0.5, -s[i].f);
    var Q = T.queue || s[n - 1], L = s[n - 1];
    point(m++, Q.x + 0.5 + (L.x - Q.x) * u, Q.y + 0.5 + (L.y - Q.y) * u, -Q.f + (-L.f + Q.f) * u);
    aretes(m, fl, 0);
    /* la tête */
    var hp = CH[0], couche = hp.l > -0.001 && hp.l < 0.001 ? 0 : hp.l < -0.999 ? 1 : 1;
    if (couche === fl) dl(prof(hp.x, hp.y) + 0.06, 6, hp, 0);
  }
  function aretes(m, fl, i0) {
    for (var k = 0; k + 1 < m; k++) {
      var a = CH[k], b = CH[k + 1];
      var vertical = Math.abs(a.l - b.l) > 0.001;
      var couche = vertical ? 1 : (a.l > -0.5 ? 0 : 1);
      if (couche !== fl) continue;
      var dd = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (!vertical && dd < 0.02 && k + 2 < m) continue;
      dl(prof((a.x + b.x) / 2, (a.y + b.y) / 2) + 0.004 * (m - k) / m, 5, a, k + i0);
    }
  }
  function objet(e, fl, f) {
    var o = e.o, l = -fl, k, x, y, z;
    switch (e.k) {
      case 1: {                                                       // un pilier
        x = e.a % T.C; y = e.a / T.C | 0;
        var tp = T.phase === 'titre' ? lisse((T.pt - 0.6 - fl * 0.5) / 0.6) : 1;
        if (tp <= 0) return;
        boite(x + 0.08, y + 0.08, x + 0.92, y + 0.92, l, 0, l, 1.25 * tp, P.acier, P.ardoise, P.nuit, 0.5, P.ardoise);
        boite(x + 0.28, y + 0.28, x + 0.72, y + 0.72, l, 1.25 * tp, l, 1.4 * tp, P.magenta, P.sang, P.sang);
        break;
      }
      case 2: balise(o, l, f); break;
      case 3: item(o, l, f); break;
      case 4: ennemi(o, l, f); break;
      case 5: arete(e.a, l); break;
      case 6: tete(o, l, f); break;
      case 7: puits(o, l, f); break;
      case 8: {                                                       // le rayon du profond : une colonne de lumière
        var sauf = TEINTE; TEINTE = 0;
        var w = 0.3 - o.ft * 0.5; if (w < 0.06) w = 0.06;
        boite(o.x + 0.5 - w, o.y + 0.5 - w, o.x + 0.5 + w, o.y + 0.5 + w, -1, 0, 0, 9, P.os, P.rose, P.magenta, 0.4, P.rose, 0.5, P.os);
        TEINTE = sauf; break;
      }
      case 9: {                                                       // la mine qui tombe, puis l'anneau d'impact
        var s9 = TEINTE; TEINTE = 0;
        if (!o.feu) {
          var uc = clamp((o.t - (o.d - CFG.mine.chute)) / CFG.mine.chute, 0, 1), src = o.src, sx = src ? src.cx : o.x, sy = src ? src.cy : o.y;
          var lx = sx + (o.x - sx) * uc, ly = sy + (o.y - sy) * uc, ll = -uc;
          boite(lx + 0.3, ly + 0.3, lx + 0.7, ly + 0.7, ll, 0.9 - uc * 0.6, ll, 1.3 - uc * 0.6, P.os, P.magenta, P.sang);
        } else {
          vue(-1); proj(o.x + 0.5, o.y + 0.5, 0.1);
          var r = (0.3 + o.ft * 4) * VS;
          for (var an = 0; an < 6.283; an += 0.12) px(PX_ + Math.cos(an) * r, PY_ + Math.sin(an) * r * CAM.sp, (an * 5 | 0) % 2 ? P.jaune : P.brasier);
        }
        TEINTE = s9; break;
      }
      case 10: colonneSortie(f); break;
      case 11: porte(o, f); break;
      case 12: {                                                      // le serpent qui tombe du ciel, au titre
        var q = e.a, s = o, zf = Math.max(0, (1.7 + q * 0.12 - T.pt)) * 9;
        if (T.pt < 1.0 + q * 0.12) return;
        var hd = q === 0, mm = hd ? 0.1 : 0.2;
        boite(s.x + mm, s.y + mm, s.x + 1 - mm, s.y + 1 - mm, l, zf, l, zf + (hd ? 0.75 : 0.5), hd ? P.cyanP : P.cyan, P.cyan, P.indigo, 0.3, P.cyanP, 0.4, P.indigo);
        pointSerpent(s.x + 0.5, s.y + 0.5, l, zf + 0.3);
        break;
      }
    }
  }
  function pointSerpent(x, y, l, z) {
    vue(l); proj(x, y, z || 0.3);
    T.ecranSerpent.push([Math.round(PX_), Math.round(PY_), Math.ceil(VS * 0.9)]);
  }
  function arete(k, l) {
    var a = CH[k - (T.phase === 'sortie' ? T.montes : 0)], b = CH[k - (T.phase === 'sortie' ? T.montes : 0) + 1];
    if (!a || !b) return;
    var w = 0.29, hz = 0.5 + 0.06 * Math.sin(T.t * 8 - k * 0.7), par = ((k - T.n) & 1) === 0;
    var top = par ? P.cyan : P.cyanP, tT = par ? 0.25 : 0.5;
    if (Math.abs(a.l - b.l) > 0.001) {
      /* le puits : une colonne entre les deux étages */
      var lb = Math.min(a.l, b.l), lh = Math.max(a.l, b.l);
      boite(a.x - w, a.y - w, a.x + w, a.y + w, lb, 0, lh, hz, top, P.cyan, P.indigo, tT, P.cyanP, 0.45, P.indigo);
      pointSerpent(a.x, a.y, lb, 0.3); pointSerpent(a.x, a.y, (lb + lh) / 2, 0.3); pointSerpent(a.x, a.y, lh, 0.3);
      return;
    }
    var x0 = Math.min(a.x, b.x) - w, x1 = Math.max(a.x, b.x) + w, y0 = Math.min(a.y, b.y) - w, y1 = Math.max(a.y, b.y) + w;
    /* son ombre, puis la boîte */
    dalle(l, x0 + 0.1, y0 + 0.1, x1 + 0.1, y1 + 0.1, 0.01, P.np, P.vide, 0.5);
    boite(x0, y0, x1, y1, l, 0, l, hz, top, P.cyan, P.indigo, tT, P.cyanP, 0.45, P.indigo);
    pointSerpent((a.x + b.x) / 2, (a.y + b.y) / 2, l, 0.3);
  }
  function tete(hp, l, f) {
    var w = 0.4, x = hp.x, y = hp.y, ll = hp.l, choc = T.bouclier && ((f >> 2) & 1);
    if (Math.abs(ll - Math.round(ll)) < 0.001) dalle(ll, x - w + 0.1, y - w + 0.1, x + w + 0.1, y + w + 0.1, 0.01, P.np, P.vide, 0.5);
    boite(x - w, y - w, x + w, y + w, ll, 0, ll, 0.74, choc ? P.os : P.cyanP, P.cyan, P.indigo, 0.25, P.cyan, 0.3, P.indigo);
    /* les yeux, du côté où il va ; le bouclier : un anneau d'os autour de la tête */
    var d = T.dir, ex = x + DX[d] * 0.22, ey = y + DY[d] * 0.22;
    vue(ll);
    proj(ex - DY[d] * 0.19, ey + DX[d] * 0.19, 0.75); var o1x = PX_, o1y = PY_;
    proj(ex + DY[d] * 0.19, ey - DX[d] * 0.19, 0.75);
    var e2 = VS > 18 ? 1 : 0;
    rect(o1x - e2 * 0.5, o1y - e2 * 0.5, 1 + e2, 1 + e2, P.vide); rect(PX_ - e2 * 0.5, PY_ - e2 * 0.5, 1 + e2, 1 + e2, P.vide);
    if (T.bouclier) {
      proj(x, y, 0.4); var R = VS * 0.62;
      for (var an = 0; an < 6.283; an += 0.16) px(PX_ + Math.cos(an + T.t * 3) * R, PY_ + Math.sin(an + T.t * 3) * R * 0.75, ((an * 6) | 0) % 2 ? P.cyanP : P.os);
    }
    vue(ll); proj(x, y, 0.4); T.teteEcran[0] = PX_; T.teteEcran[1] = PY_;
    pointSerpent(x, y, ll, 0.35);
  }
  function balise(b, l, f) {
    var x = b.x, y = b.y, ac = accent(), mont = lisse(b.t / 1.0), z0 = -1 + mont;
    if (!b.allume) {
      /* un anneau qui appelle, puis l'obélisque qui monte des dalles */
      vue(l); proj(x + 0.5, y + 0.5, 0.02);
      var R = VS * (0.55 + 0.12 * Math.sin(T.t * 6)), on = ((f >> 3) & 1) === 0;
      for (var an = 0; an < 6.283; an += 0.2) px(PX_ + Math.cos(an - T.t * 2) * R, PY_ + Math.sin(an - T.t * 2) * R * CAM.sp, (an * 5 | 0) % 2 ? ac[1] : (on ? P.os : ac[2]));
      boite(x + 0.3, y + 0.3, x + 0.7, y + 0.7, l, Math.max(0, z0), l, z0 + 0.8, P.acier, P.ardoise, P.nuit, 0.5, P.os);
      var zc = z0 + 1.05 + 0.08 * Math.sin(T.t * 4);
      boite(x + 0.36, y + 0.36, x + 0.64, y + 0.64, l, zc, l, zc + 0.28, on ? P.os : ac[1], ac[1], ac[2]);
    } else {
      /* allumée : le cristal à la couleur du pilote, et un faisceau qui monte à travers les étages */
      /* le faisceau monte haut 1,5 s, puis redescend à un moignon (la scène reste lisible) ; à la sortie, tous remontent */
      var age = T.t - b.tA, wb = 0.16 + (age < 0.5 ? (0.5 - age) * 0.5 : 0);
      var hb = T.phase === 'sortie' ? 1.4 + 6 * lisse((T.pt - 0.4) / 1.2) : 1.4 + 5.6 * (1 - lisse((age - 1.5) / 0.6));
      boite(x + 0.3, y + 0.3, x + 0.7, y + 0.7, l, 0, l, 0.8, ac[1], ac[2], ac[3], 0.5, ac[0]);
      boite(x + 0.5 - wb, y + 0.5 - wb, x + 0.5 + wb, y + 0.5 + wb, l, 0.8, l, 0.8 + hb, ac[0], ac[1], ac[2], 0.6, ac[1], 0.5, ac[2]);
    }
  }
  function item(it, l, f) {
    var x = it.x, y = it.y, z = 0.35 + Math.sin(it.t * 4) * 0.12;
    vue(l); proj(x + 0.5, y + 0.5, 0.01);
    rect(PX_ - 2, PY_ - 1, 5, 2, P.np);
    if (it.type === 'cellule') boite(x + 0.33, y + 0.33, x + 0.67, y + 0.67, l, z, l, z + 0.32, P.jaune, P.ambre, P.brasier);
    else if (it.type === 'regen') {
      var a = it.t * 3, cx = x + 0.5, cy = y + 0.5, r = 0.36, zz = z + 0.3;
      for (var k = 0; k < 4; k++) { proj(cx + Math.cos(a + k * 1.5708) * r, cy + Math.sin(a + k * 1.5708) * r, zz); QX[k] = PX_; QY[k] = PY_; }
      poly(4, P.jaune, P.os, 0.35 + 0.3 * Math.sin(it.t * 6));
      proj(cx, cy, zz);
      for (var q = -2; q <= 2; q++) { px(PX_ + q, PY_, P.brasier); px(PX_, PY_ + q, P.brasier); }
    } else {
      proj(x + 0.5, y + 0.5, z + 0.25);
      var R = VS * 0.34;
      for (var an = 0; an < 6.283; an += 0.1) px(PX_ + Math.cos(an + it.t) * R, PY_ + Math.sin(an + it.t) * R * 0.8, (an * 4 | 0) % 2 ? P.os : P.acier);
      rect(PX_ - 1, PY_ - 1, 3, 3, P.os);
    }
  }
  function ennemi(e, l, f) {
    var u = clamp(((T.n - e.t0) + T.u) / e.pas, 0, 1), x = e.px + (e.x - e.px) * u, y = e.py + (e.y - e.py) * u, sauf = TEINTE;
    if (T.phase === 'sortie') { var dd = T.pt - 0.5; if (dd > 0) { if (dd > 1.2) return; l -= dd * dd * 2; } }
    if (e.canon) {
      x = e.cx; y = e.cy;
      if (e.charge) TEINTE = 0;                                     // un canon qui vise se montre en pleine couleur
      var on = e.charge && ((f >> 2) & 1);
      if (e.k === 'projecteur') {
        boite(x + 0.18, y + 0.18, x + 0.82, y + 0.82, l, 0, l, 0.16, P.ardoise, P.nuit, P.np, 0.5, P.acier);
        boite(x + 0.34, y + 0.34, x + 0.66, y + 0.66, l, 0.16, l, 0.3, on ? P.os : P.magenta, P.sang, P.sang);
      } else {
        var zh = 1.3 + Math.sin(T.t * 3 + e.x) * 0.08;
        vue(l); proj(x + 0.5, y + 0.5, 0.01); rect(PX_ - 3, PY_ - 1, 7, 2, P.np, 0.5);
        boite(x + 0.16, y + 0.3, x + 0.84, y + 0.7, l, zh, l, zh + 0.22, P.acier, P.magenta, P.sang, 0.5, P.ardoise);
        boite(x + 0.38, y + 0.38, x + 0.62, y + 0.62, l, zh - 0.16, l, zh, on ? P.os : P.magenta, P.sang, P.sang);
      }
      TEINTE = sauf;
      return;
    }
    if (e.k === 'sentinelle') {
      boite(x + 0.14, y + 0.14, x + 0.86, y + 0.86, l, 0, l, 0.7, P.magenta, P.rose, P.sang, 0.5, ((f >> 3) & 1) ? P.sang : P.magenta);
      vue(l); proj(x + 0.5, y + 0.5, 0.71);
      var wv = Math.max(1, VS * 0.12);
      for (var q = -wv; q <= wv; q++) px(PX_ + q, PY_, P.os);
    } else {
      /* le rôdeur : bas, large, des pattes qui battent, deux yeux jaunes tournés vers la tête */
      var pt0 = (f >> 3) & 1;
      vue(l);
      for (var k = 0; k < 4; k++) {
        var lx = x + (k & 1 ? 0.92 : 0.08), ly = y + (k & 2 ? 0.92 : 0.08);
        proj(lx, ly, (k + pt0) & 1 ? 0.12 : 0); px(PX_, PY_, P.rose); px(PX_ + 1, PY_, P.rose);
      }
      boite(x + 0.12, y + 0.18, x + 0.88, y + 0.82, l, 0.08, l, 0.46, P.magenta, P.sang, P.sang, 0.4, P.rose);
      var h = T.snake[0], dx = 0, dy = 1;
      if (h && h.f === e.f) { dx = clamp(h.x - e.x, -1, 1); dy = clamp(h.y - e.y, -1, 1); }
      vue(l); proj(x + 0.5 + dx * 0.18 - 0.12, y + 0.5 + dy * 0.18, 0.47); rect(PX_, PY_, 2, 1, P.jaune);
      proj(x + 0.5 + dx * 0.18 + 0.12, y + 0.5 + dy * 0.18, 0.47); rect(PX_, PY_, 2, 1, P.jaune);
    }
  }
  /* l'ascenseur ouvert : un puits dans la dalle, un cadre, des chevrons qui disent où il mène */
  function puits(a, l, f) {
    var x = a.x, y = a.y, ac = accent(), vers = l === 0 ? 1 : -1, on = ((f >> 3) & 1) === 0;
    boite(x + 0.02, y + 0.02, x + 0.98, y + 0.14, l, -0.05, l, 0.12, P.os, P.acier, P.ardoise);
    boite(x + 0.02, y + 0.02, x + 0.14, y + 0.98, l, -0.05, l, 0.12, P.os, P.acier, P.ardoise);
    /* la lumière du puits, tramée */
    vue(l);
    for (var k = 0; k < 3; k++) {
      var ph = ((T.t * 1.4 + k / 3) % 1), zc = vers > 0 ? 0.9 - ph * 1.4 : -0.5 + ph * 1.4, c = k === 0 ? (on ? P.os : ac[0]) : ac[1];
      proj(x + 0.22, y + 0.5, zc); var ax = PX_, ay = PY_; proj(x + 0.5, y + 0.5, zc - vers * 0.25); var bx = PX_, by = PY_; proj(x + 0.78, y + 0.5, zc);
      ligne(ax, ay, bx, by, c); ligne(bx, by, PX_, PY_, c);
      ligne(ax, ay + 1, bx, by + 1, c); ligne(bx, by + 1, PX_, PY_ + 1, c);
    }
    boite(x + 0.86, y + 0.02, x + 0.98, y + 0.98, l, -0.05, l, 0.12, P.os, P.acier, P.ardoise);
    boite(x + 0.02, y + 0.86, x + 0.98, y + 0.98, l, -0.05, l, 0.12, P.os, P.acier, P.ardoise);
  }
  /* les ascenseurs ouverts : un tube de lumière en pointillé d'un étage à l'autre (comme la ligne de visée), par-dessus
     tout, pour qu'on voie où il mène même quand l'étage proche le cache */
  function tubes(f) {
    if (T.phase === 'sortie' || T.phase === 'titre') return;
    var ac = accent(), on = ((f >> 3) & 1) === 0;
    for (var i = 0; i < T.asc.length; i++) {
      var a = T.asc[i]; if (!a.ouvert) continue;
      var c1 = on ? ac[1] : ac[0], c2 = P.os;
      vue(0); proj(a.x + 0.06, a.y + 0.94, 0); var ax = PX_, ay = PY_; proj(a.x + 0.94, a.y + 0.06, 0); var bx = PX_, by = PY_;
      vue(-1); proj(a.x + 0.06, a.y + 0.94, 0); var cx = PX_, cy = PY_; proj(a.x + 0.94, a.y + 0.06, 0);
      ligne(ax, ay, cx, cy, c1, 2, 2); ligne(bx, by, PX_, PY_, c1, 2, 2);
      /* trois anneaux qui glissent vers le bas */
      for (var k = 0; k < 3; k++) {
        var u = ((T.t * 0.9 + k / 3) % 1), l = -u;
        vue(l);
        proj(a.x + 0.1, a.y + 0.1, 0); var p0x = PX_, p0y = PY_; proj(a.x + 0.9, a.y + 0.1, 0); var p1x = PX_, p1y = PY_;
        proj(a.x + 0.9, a.y + 0.9, 0); var p2x = PX_, p2y = PY_; proj(a.x + 0.1, a.y + 0.9, 0);
        var c = k === 0 ? c2 : c1;
        ligne(p0x, p0y, p1x, p1y, c, 1, 1); ligne(p1x, p1y, p2x, p2y, c, 1, 1); ligne(p2x, p2y, PX_, PY_, c, 1, 1); ligne(PX_, PY_, p0x, p0y, c, 1, 1);
      }
    }
  }
  /* la sortie : le puits de lumière vers le néon */
  function porte(s, f) {
    var x = s.x, y = s.y, ac = accent(), on = ((f >> 3) & 1) === 0, w = 0.2 + 0.05 * Math.sin(T.t * 5);
    boite(x + 0.5 - w, y + 0.5 - w, x + 0.5 + w, y + 0.5 + w, -1, 0, 0, 8, P.os, ac[0], ac[1], 0.5, ac[0], 0.5, ac[1]);
    vue(0); proj(x + 0.5, y + 0.5, 0.05);
    var R = VS * (0.6 + 0.1 * Math.sin(T.t * 4));
    for (var an = 0; an < 6.283; an += 0.14) px(PX_ + Math.cos(an + T.t * 2.5) * R, PY_ + Math.sin(an + T.t * 2.5) * R * CAM.sp, (an * 5 | 0) % 2 ? P.os : (on ? P.jaune : ac[1]));
    for (var k = 0; k < 3; k++) {
      var zc = ((T.t * 1.2 + k / 3) % 1) * 2.4 + 0.6;
      proj(x + 0.2, y + 0.5, zc); var ax = PX_, ay = PY_; proj(x + 0.5, y + 0.5, zc + 0.3); var bx = PX_, by = PY_; proj(x + 0.8, y + 0.5, zc);
      ligne(ax, ay, bx, by, P.os); ligne(bx, by, PX_, PY_, P.os);
    }
  }
  /* la sortie : les segments montés forment une colonne qui s'élève vers le néon */
  function colonneSortie(f) {
    var p = T.porte, ac = accent(), n = T.montes, monte = T.toutMonte >= 0 ? (T.pt - T.toutMonte) * 2.6 : 0, u = T.u;
    var w = 0.2 + 0.04 * Math.sin(T.t * 6);
    boite(p.x + 0.5 - w, p.y + 0.5 - w, p.x + 0.5 + w, p.y + 0.5 + w, -1, 0, 0, 12, ac[0], ac[1], ac[2], 0.5, P.os, 0.5, ac[1]);
    for (var j = n - 1; j >= 0; j--) {
      var z = (n - 1 - j + u) * 0.7 + monte, hd = j === 0, m = hd ? 0.1 : 0.2;
      if (z > 30) continue;
      boite(p.x + m, p.y + m, p.x + 1 - m, p.y + 1 - m, 0, z, 0, z + (hd ? 0.7 : 0.55), hd ? P.cyanP : (((j - T.n) & 1) ? P.cyan : P.cyanP), P.cyan, P.indigo, 0.3, P.cyanP, 0.4, P.indigo);
      pointSerpent(p.x + 0.5, p.y + 0.5, 0, z + 0.3);
    }
  }
  function particules(fl, f) {
    var ac = accent();
    for (var k = 0; k < T.parts.length; k++) {
      var p = T.parts[k], couche = p.l > -0.5 ? 0 : 1;
      if (couche !== fl) continue;
      vue(p.l); proj(p.x, p.y, p.z);
      var c = p.c;
      if (p.trace) { var u = 1 - p.vie / p.vie0; c = ac[Math.min(3, Math.floor(u * 4))]; if (u > 0.7 && ((k + f) & 1)) continue; px(PX_, PY_, c); continue; }
      if (p.serpent && p.vie < 0.35) c = P.acier;
      px(PX_, PY_, c); px(PX_ + 1, PY_, c); px(PX_, PY_ + 1, c); px(PX_ + 1, PY_ + 1, c);
    }
  }

  /* ---------------- l'interface ---------------- */
  function hud(f) {
    var sf = T.safe || { l: 0, t: 0, r: 0, b: 0 }, x0 = sf.l + 3, y0 = sf.t + 3, x1 = T.W - sf.r - 3, y1 = T.H - sf.b - 3, g = G(), k;
    var col = couleurPilote(), ac = accent(), cadre = T.hit > 0 && (f & 4) ? P.os : col, pw = 22;
    if (T.phase !== 'titre' || T.pt > 2.4) {
      /* le portrait du pilote, cadré de sa couleur */
      rect(x0, y0, pw + 4, pw + 4, P.np); rect(x0 + 1, y0 + 1, pw + 2, 1, cadre); rect(x0 + 1, y0 + pw + 2, pw + 2, 1, cadre);
      rect(x0 + 1, y0 + 1, 1, pw + 2, cadre); rect(x0 + pw + 2, y0 + 1, 1, pw + 2, cadre);
      var po = portrait();
      if (po) {
        for (var yy = 0; yy < pw; yy++) for (var xx = 0; xx < pw; xx++) { var X = x0 + 2 + xx, Y = y0 + 2 + yy; if (X >= 0 && Y >= 0 && X < BW && Y < BH) B[Y * BW + X] = po.data[yy * pw + xx]; }
      } else {
        g.circ(x0 + 2 + pw / 2, y0 + 2 + pw / 2 + 1, 8, P.ardoise); rect(x0 + 6, y0 + 10, pw - 8, 4, col); g.ring(x0 + 2 + pw / 2, y0 + 2 + pw / 2 + 1, 8, P.acier);
      }
      texte(T.qui === 'lui' ? 'LUI' : 'ELLE', x0 + 1, y0 + pw + 6, col, 1);
      texte(('0000000' + T.score).slice(-7), x0 + pw + 8, y0 + 1, P.jaune, 1);
      /* les balises de l'étape : allumées à la couleur du pilote */
      if (T.obj && T.obj.total && T.phase !== 'sortie') {
        var bx = x0 + pw + 8, by = y0 + 13;
        for (k = 0; k < T.obj.total; k++) {
          var cx = bx + k * 9 + 3, cy = by + 3, lit = k < T.obj.faits;
          for (var dy = -3; dy <= 3; dy++) { var hw = 3 - Math.abs(dy); for (var dx = -hw; dx <= hw; dx++) if (lit || Math.abs(dx) === hw) px(cx + dx, cy + dy, lit ? (Math.abs(dx) === hw ? ac[2] : ac[1]) : P.acier); }
        }
        if (T.bouclier) { var rx2 = bx + T.obj.total * 9 + 6; g.ring(rx2, by + 3, 3, P.os); px(rx2, by + 3, P.os); }
      }
      if (T.perdu > 0 && T.phase !== 'sortie') texte('À RÉGÉNÉRER ' + T.perdu, x0, y1 - 9, P.ambre, 1);
      /* l'année, et la jauge des étages : la grille en haut, le profond en bas ; le cyan où est la tête */
      var an = texte('1993', null, 0, P.os, 1); if (an) g.blit(an, x1 - an.w, y0 + 1);
      var gx = x1 - 10, gy = y0 + 14, hf = T.snake[0] ? T.snake[0].f : 0;
      for (k = 0; k < 2; k++) rect(gx - 3, gy + k * 8, 11, 2, k === hf ? P.acier : P.ardoise);
      var my = gy + Math.round(-T.h * 8);
      rect(gx - 7, my - 1, 3, 3, P.cyan);
    }
    /* la mesure d'annonce : quatre temps qui s'allument, le tempo qui va changer */
    if (T.TJ && T.TJ.annonce) {
      var pos = (T.n - 1) % 16, tps = Math.floor(pos / 4), cyb = T.H > T.W ? Math.round(T.H * 0.82) : y1 - 12, desc = T.TJ.cible === 2;
      var lab = texteCentre('TEMPO', T.W / 2 - 10, cyb - 11, P.os, 1, T.W);
      var axr = Math.round(T.W / 2 + 14), ayr = cyb - 7;
      for (k = 0; k < 4; k++) { var wk = desc ? 3 - k : k; rect(axr - wk, ayr + (desc ? k : 3 - k) - 2, wk * 2 + 1, 1, P.jaune); }
      for (k = 0; k < 4; k++) rect(Math.round(T.W / 2) - 22 + k * 12, cyb, 8, 4, k <= tps ? ((f >> 2) & 1 ? P.jaune : P.ambre) : P.ardoise);
    }
    /* le petit mot du moment (coupe, bouclier, étage) */
    if (T.petit && T.petitT < 1.5 && T.petitT > -3) {
      var py2 = T.H > T.W ? Math.round(T.H * 0.9) : y1 - 22;
      if (T.TJ && T.TJ.annonce) py2 -= 14;
      texteCentre(T.petit, T.W / 2, py2, P.jaune, 1, T.W - 8);
    }
    /* le titre, puis les messages */
    if (T.phase === 'titre') {
      var kk = T.H >= 300 && T.W >= 300 ? 5 : 4, my2 = Math.round(T.H * 0.2), nn = Math.min(4, Math.floor(Math.max(0, T.pt - 0.3) / 0.14) + 1);
      if (T.pt > 0.3) {
        rect(0, my2 - 6, T.W, kk * 7 + 50, P.np, 0.5);
        var s = texteCentre('1993'.slice(0, nn), T.W / 2 - (4 - nn) * 3 * kk, my2, P.jaune, kk, T.W - 10);
        if (T.pt > 1.1) texteCentre('LA PROFONDEUR', T.W / 2, my2 + (s ? s.h : 30) + 5, P.os, 2, T.W - 12);
        if (T.pt > 1.8) texteCentre(T.qui === 'lui' ? 'IL TOMBE À TRAVERS LA GRILLE' : 'ELLE PLONGE À TRAVERS LA GRILLE', T.W / 2, my2 + (s ? s.h : 30) + 26, P.acier, 1, T.W - 8);
      }
      return;
    }
    if (T.msg && T.msgT < T.msgD) {
      var big = T.phase === 'sortie', km = 2, my3 = Math.round(T.H * (T.H > T.W ? 0.12 : 0.17)) + (T.H > T.W ? 24 : 0);
      if (big) my3 = Math.round(T.H * 0.22);
      var sp = null;
      if (!(T.msgT > T.msgD - 0.4 && (f & 4))) sp = texteCentre(T.msg, T.W / 2, my3, big ? P.jaune : P.os, km, T.W - 12);
      if (T.msg2 && T.msgT > 0.35) texteCentre(T.msg2, T.W / 2, my3 + (sp ? sp.h : 16) + 4, big ? P.os : P.acier, 1, T.W - 8);
    }
  }

  /* ================================ l'interface publique ================================ */
  N.grille = {
    start: start, update: update, draw: draw,
    actif: function () { return T.on; },
    phase: function () { return T.phase; },
    stop: function () {
      T.on = false; T.phase = 'fini'; T.finAppele = true;
      if (A.out && A.ctx) { try { A.out.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.05); } catch (e) { } }
    },
    /* skip, progressif : titre → grille → profond → remontée → sortie → fin (surFin, une seule fois) ; après, rien */
    skip: function () { return sauter(); },
    state: function () {
      var i, e;
      var ens = [];
      for (i = 0; i < T.E.length; i++) { e = T.E[i]; ens.push({ k: e.k, f: e.f, x: e.x, y: e.y, dx: e.dx, dy: e.dy, pas: e.pas, t0: e.t0, canon: e.canon, charge: e.charge }); }
      var pil = [[], []];
      for (var fl = 0; fl < 2; fl++) if (T.sol[fl]) for (i = 0; i < T.sol[fl].length; i++) if (T.sol[fl][i]) pil[fl].push([i % T.C, i / T.C | 0]);
      return {
        phase: T.phase, t: +T.t.toFixed(2), pt: +T.pt.toFixed(2), section: T.sec, qui: T.qui, score: T.score, morts: T.morts,
        C: T.C, R: T.R, W: T.W, H: T.H, h: +T.h.toFixed(3), n: T.n, periode: +T.periode.toFixed(4), tempo: T.TJ ? +T.TJ.tempo.toFixed(1) : 0,
        annonce: !!(T.TJ && T.TJ.annonce), snake: T.snake.map(function (s) { return [s.x, s.y, s.f]; }), dir: T.dir, file: T.file.slice(),
        vertical: T.vertical, mort: T.mort, invul: T.invul > 0, bouclier: T.bouclier, perdu: T.perdu, pousse: T.pousse,
        piliers: pil, ennemis: ens,
        menaces: T.M.map(function (m) { return { k: m.k, f: m.f, x: m.x, y: m.y, cases: m.cases.slice(), reste: +(m.d - m.t).toFixed(2), feu: m.feu }; }),
        balises: T.balises.map(function (b) { return { x: b.x, y: b.y, f: b.f, allume: b.allume }; }),
        asc: T.asc.map(function (a) { return { x: a.x, y: a.y, ouvert: a.ouvert }; }),
        sortie: T.sortieG ? { x: T.sortieG.x, y: T.sortieG.y } : null,
        items: T.items.map(function (it) { return { type: it.type, x: it.x, y: it.y, f: it.f }; }),
        objectif: T.obj ? { total: T.obj.total, faits: T.obj.faits } : null, plongee: { pret: T.plongeeT <= 0 && T.phase === 'remontee' },
        dirsEcran: VD.map(function (v) { return [+v[0].toFixed(3), +v[1].toFixed(3)]; }), tete: [T.teteEcran[0], T.teteEcran[1]],
        serpentEcran: T.ecranSerpent.slice(), montes: T.montes,
        compte: JSON.parse(JSON.stringify(T.compte)), instants: JSON.parse(JSON.stringify(T.instants)),
        audio: !!A.ctx, musique: { section: A.X ? A.X.sec : -1, tempo: A.X ? +A.X.tempo.toFixed(1) : 0, annonce: !!(A.X && A.X.annonce), mesure: A.mes, notes: JSON.parse(JSON.stringify(A.notes)) },
        portrait: !!PORT, journal: T.journal.slice()
      };
    },
    CFG: CFG
  };
})();
