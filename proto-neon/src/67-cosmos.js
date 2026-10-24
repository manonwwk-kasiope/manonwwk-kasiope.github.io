/* ===== 67-cosmos.js — N.cosmos : l'époque 2975, l'intergalactique, le final du voyage =====

   refonte/VISION-PROGRESSION.md § 1 (2975), § 2 (le WARP), § 3 (les plans), § 4 (« 16 bits poussé ») ; HISTOIRE.md (le
   film « espace » : sur la tête de son serpent, elle ou lui crève le ciel vers une armada). Le serpent cyan crève
   l'atmosphère de son monde et entre dans l'espace profond. Vue de dessus, mouvement libre, la caméra le suit ; pixels
   de 1 (le tampon tel quel), seize couleurs et leurs tramages : nébuleuse tramée, trois couches d'étoiles en parallaxe,
   une planète annelée au loin (et, pour ELLE, une galaxie spirale), l'armada sur le plan profond.

   LE DÉROULÉ (temps du MONDE, que le warp ralentit ; environ 65 s de voyage, 30 s d'amiral, 11 s de fin) :
     0 s     LA BRÈCHE : les bandes du ciel de son monde (magenta pour elle, ambre pour lui) glissent sous le serpent ;
             le bouclier de rentrée flambe autour de la tête ; « 2975 » s'écrit
     6 s     L'ARMADA : des silhouettes sur le plan profond, plus petites et plus sombres, qui ne touchent pas
     12 s    LES CHASSEURS : des vagues qui frôlent la tête et tirent ; les croiseurs du fond lancent des obus (cercle annoncé)
     18 s    ESCADRILLE : sirène et chevrons 1,1 s avant ; trop rapide pour le corps — le WARP part tout seul
     26 s    LES DÉBRIS : astéroïdes et épaves qui coupent le corps ; 33 s, deuxième escadrille dans les débris
     40 s    ILS DESCENDENT : le plan profond monte sur le nôtre (3,5 s) ; les silhouettes deviennent des frégates
     44 s    LE PLAN DE COMBAT : frégates à rayon annoncé, chasseurs ; 50 s, troisième escadrille
     57 s    LE VAISSEAU AMIRAL : son ombre d'abord (il descend du plan haut), puis lui, plus grand que l'écran.
             Phase 1 : quatre points faibles (deux canons à rayon, un hangar, un réacteur à anneaux), un par un.
             Une mesure de silence ; phase 2 : le cœur s'ouvre, la coque tourne, le rayon balaie, l'escorte sort
             (quatrième warp : trois verrous sur le cœur). Puis l'explosion en chaîne et la détonation (anneaux tramés).
     fin     L'ÉPILOGUE (3,8 s) puis surFin().
   RÈGLES DU JEU : un coup sur la tête tue, sur le corps COUPE ; se mordre coupe sans tuer. Mourir ne fait rien perdre
   du déroulé : le serpent renaît (invulnérable 2,2 s) et chaque mort rend les coups un peu plus forts contre l'amiral (+20 %, quatre fois au plus).
   Le serpent tire tout seul devant lui sur les croches du tempo, avec une aide à la visée (cône de 0,42 rad).

   LE WARP : à chaque escadrille, et au cœur de l'amiral. Si N.warp existe, N.warp.declencher('escadrille') et le temps du
   monde suit N.warp.facteur() (le module appelle N.warp.update lui-même si personne ne l'a fait pour cette image) ;
   sinon un ralenti interne, même courbe (0,3 s d'entrée, 3,4 s à 0,15, 0,45 s de sortie). Le curseur est le nôtre (les
   cibles de cette époque ne sont pas dans N.ennemis) : une lunette qui balaie seule les cibles, accroche ce qu'elle
   survole 0,24 s, verrouille au toucher (second doigt), au clic, à Espace tenu (elle peint). À la fin, la salve : un
   missile à tête chercheuse par verrou.

   LA MUSIQUE est écrite ici, pour cette époque : épique, en ré mineur (la tête du motif de Neon Velocity, ré-fa-la-sol-fa),
   sur N.music.context() — nappes larges (scies désaccordées, filtre qui s'ouvre, réverbération générée), basse, arpèges
   en écho, lead, percussions synthétiques (grosse caisse, caisse claire, charleston, timbales, cymbale). Les tempos sont
   mis en scène : 92 pour la brèche et l'armada, 120 à la chasse, 128 sur le plan de combat ; DEMI-TEMPS pendant chaque
   warp (et le son s'étouffe) ; ACCÉLÉRATION de 128 à 144 sur deux mesures à l'arrivée de l'amiral ; une MESURE DE SILENCE
   avant sa seconde phase, qui repart à 152 ; à la détonation, tout s'arrête, puis un accord de ré MAJEUR. Générateur à
   graine propre (le son ne change pas la partie) ; respecte N.music.muted.

   INTERFACE (N.cosmos), rien ne s'appelle au chargement :
       start({ surFin, graine, qui })   lance l'époque ; qui : 'elle' | 'lui' (sinon N.choix.personnage(), sinon 'elle')
       update(dt) / draw()               dt RÉEL (le module applique lui-même le facteur du warp) ; draw remplit le tampon
       actif() phase()                   'entree' | 'voyage' | 'boss' | 'explosion' | 'epilogue' | 'fini'
       stop()   coupe tout sans surFin ;   skip()  saute à l'amiral (jamais par-dessus la fin)
       state()  instantané pour les essais et le pilote de tools/cosmos/

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; cyan et cyan pâle au serpent seul (et à ses morceaux) ; aucun
   Math.random (trois générateurs à graine : jeu, décor, musique) ; aucune horloge lue (dt, et le contexte audio pour la
   musique) ; flashs bornés : explosions en anneaux tramés et éclats, au plus deux grosses par seconde, la détonation
   finale en anneaux fins et en tramage, jamais un aplat plein écran. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages ================================ */
  var CFG = {
    vitesse: 80, virage: 4.2, ecart: 3, longueurDepart: 18, longueurMax: 44, mordDes: 7, invuln: 2.2, mort: 1.6,
    balle: 240, porteeBalle: 1.05, assist: 0.42, assistPortee: 240,
    entree: 5.6, explosion: 6.8, epilogue: 3.8,
    armada: 6.2, chasse: 12, esc1: 18, debris: 26, esc2: 33, descente: 40, plan: 44, esc3: 50, amiral: 57,
    tempos: [92, 92, 120, 120, 120, 128, 144, 144, 152, 76],
    warp: { facteur: 0.15, annonce: 1.1, entree: 0.3, visee: 3.4, sortie: 0.45, verrous: 8, attente: 0.24, peinture: 0.1, capture: 12, doigt: 22 },
    missile: { v0: 110, vmax: 340, accel: 900, virage: 8.5, vie: 2.6, degats: 5 },
    boss: { pvFaible: 7, pvCoeur: 44, arrivee: 4.2, transition: 2.6, aide: 12 }
  };
  var PTS = { chasseur: 100, eclair: 150, roc: 20, epave: 30, fregate: 400, cellule: 50, faible: 1500, coeur: 5000, obus: 0 };

  var P = null, LUT_VOILE = null, LUT_OMBRE = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), indigo: I('indigo'), violet: I('violet'), magenta: I('magenta'),
      rose: I('rosePale'), cyan: I('cyan'), cyanP: I('cyanPale'), ambre: I('ambre'), jaune: I('jaune'), brasier: I('brasier'),
      os: I('os'), acier: I('acier'), sang: I('sang'), np: I('nuitProfonde') };
    /* le voile froid du warp : les fonds sombres glissent vers la nuit profonde, les encres vives ne bougent pas */
    LUT_VOILE = new Uint8Array(16); LUT_OMBRE = new Uint8Array(16);
    for (var i = 0; i < 16; i++) { LUT_VOILE[i] = i; LUT_OMBRE[i] = i; }
    LUT_VOILE[P.vide] = P.np; LUT_VOILE[P.nuit] = P.np; LUT_VOILE[P.ardoise] = P.indigo; LUT_VOILE[P.violet] = P.indigo;
    /* l'ombre portée de ce qui descend du plan haut : chaque encre glisse vers une plus sombre (le serpent reste) */
    var o = LUT_OMBRE;
    o[P.vide] = P.np; o[P.nuit] = P.vide; o[P.ardoise] = P.nuit; o[P.indigo] = P.nuit; o[P.violet] = P.indigo; o[P.magenta] = P.sang;
    o[P.rose] = P.magenta; o[P.ambre] = P.brasier; o[P.jaune] = P.ambre; o[P.brasier] = P.sang; o[P.os] = P.acier; o[P.acier] = P.ardoise;
    o[P.sang] = P.nuit; o[P.np] = P.vide;
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }

  /* trois générateurs locaux à graine : le jeu, le décor, la musique (ni le décor ni le son ne changent la partie) */
  var rs = 2975, rv = 75, ra = 29;
  function rnd() { rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296; }
  function rdv() { rv = (rv * 1103515245 + 12345) % 2147483648; return rv / 2147483648; }
  function rna() { ra = (ra * 69069 + 1) % 4294967296; return ra / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lisse(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 6.283185307; while (d < -Math.PI) d += 6.283185307; return d; }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function segD2(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy, u = l > 0 ? ((px - x0) * dx + (py - y0) * dy) / l : 0;
    u = clamp(u, 0, 1);
    return d2(px, py, x0 + dx * u, y0 + dy * u);
  }

  /* ================================ l'état ================================ */
  var T = {
    on: false, phase: 'fini', t: 0, pt: 0, vt: 0, mt: 0, f: 1, sec: 0, score: 0, morts: 0, qui: 'elle',
    W: 0, H: 0, cx: 0, cy: 0, cvx: 0, cvy: 0, derive: 0, shake: 0, gel: 0,
    hx: 0, hy: 0, cap: 0, vise: 0, aVise: false, sens: 1, trail: [], nseg: 14, invul: 0, mort: false, mortT: 0,
    acc8: 0, p8: 0, balles: [], E: [], EB: [], obus: [], rayons: [], mis: [], expl: [], frags: [], sillage: [], prof: [],
    cellules: [], boss: null, desc: 0, descT: -1, ev: {}, vagueT: 0, rocT: 0, epaveT: 0, obusT: 0, fregT: 0, celT: 0,
    msg: '', msgT: 0, msgD: 2, msg2: '', grosses: [], detone: false, flashT: 0, hit: 0,
    compte: null, journal: [], surFin: null, finAppele: false, premiereExplosion: -1, instants: {}
  };
  /* Le lecteur appartient au cosmos seulement entre jouer et surFin. Aucun temps
     du monde, warp, hasard ni ordonnanceur musical n'avance pendant cet intervalle. */
  var filmAmiralVu = false, filmAmiralOn = false;
  function filmActif() { return filmAmiralOn; }
  function gainFilm(valeur) {
    if (A.out && A.ctx) {
      try {
        A.out.gain.cancelScheduledValues(A.ctx.currentTime);
        A.out.gain.setTargetAtTime(valeur, A.ctx.currentTime, N.R.filmAmiral.fonduMusique);
      } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('cosmos.film.audio', e); }
    }
  }
  function finirFilm() {
    filmAmiralOn = false;
    /* Le temps audio est réel : recaler le prochain pas sans perdre sa place dans
       la mesure, la section et le demi-temps conservés. */
    A.next = 0;
    gainFilm(N.R.filmAmiral.gainMusique);
  }
  function arreterFilmAmiral() {
    if (!filmAmiralOn) return;
    if (N.film && N.film.stop) N.film.stop();
    finirFilm();
  }
  function jouerAmiral() {
    if (filmAmiralVu) return;
    filmAmiralVu = true;
    /* Les départs contractuels ne passent pas par le voyage. S'ils appellent
       néanmoins ce module, conserver la même politique : aucun film ajouté. */
    if (N.pilote && N.pilote.actif && N.pilote.actif()) return;
    if (!N.film || !N.film.jouer) return;
    var nom = 'amiral-' + T.qui;
    filmAmiralOn = N.film.jouer(nom, { duree: N.R.filmAmiral.duree,
      garde: N.R.filmAmiral.garde, surFin: finirFilm });
    if (filmAmiralOn) gainFilm(0);
  }
  function compteNeuf() {
    return { tues: 0, mange: 0, coupes: 0, morsures: 0, tirs: 0, verrous: 0, missiles: 0, touchesMissile: 0, warps: 0, warpsExternes: 0,
      grosses: 0, obus: 0, faibles: 0, rocs: 0 };
  }
  function journal(e) { T.journal.push({ e: e, t: +T.t.toFixed(2), vt: +T.vt.toFixed(2) }); if (T.journal.length > 120) T.journal.shift(); }
  function dire(s, d, s2) { T.msg = s; T.msg2 = s2 || ''; T.msgT = 0; T.msgD = d || 2.2; journal('message ' + s); }
  function marquer(nom) { if (T.instants[nom] === undefined) T.instants[nom] = +T.t.toFixed(2); }

  /* ================================ le dessin : tampon, origine, primitives ================================ */
  var B = null, BW = 0, BH = 0, OX = 0, OY = 0;
  var BAY = null;
  function origine(ox, oy) { OX = ox | 0; OY = oy | 0; G().origin(OX, OY); }
  function tr(x, y, t) { return t >= 1 || BAY[((y & 3) << 2) | (x & 3)] < t * 16; }
  function pt(x, y, c) { x = Math.round(x) - OX; y = Math.round(y) - OY; if (x >= 0 && y >= 0 && x < BW && y < BH) B[y * BW + x] = c; }
  function ptT(x, y, c, t) { x = Math.round(x) - OX; y = Math.round(y) - OY; if (x >= 0 && y >= 0 && x < BW && y < BH && tr(x, y, t)) B[y * BW + x] = c; }
  function rectT(x, y, w, h, c, t) {
    x = Math.round(x) - OX; y = Math.round(y) - OY;
    var xa = Math.max(0, x), ya = Math.max(0, y), xb = Math.min(BW, x + w), yb = Math.min(BH, y + h);
    for (var yy = ya; yy < yb; yy++) { var o = yy * BW; for (var xx = xa; xx < xb; xx++) if (t === undefined || tr(xx, yy, t)) B[o + xx] = c; }
  }
  /* une ligne (monde), pleine ou en pointillé : on pixels posés, off sautés, à partir de la phase ph */
  function ligne(x0, y0, x1, y1, c, on, off, ph) {
    x0 = Math.round(x0) - OX; y0 = Math.round(y0) - OY; x1 = Math.round(x1) - OX; y1 = Math.round(y1) - OY;
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, k = ph || 0, per = on ? on + off : 0;
    var garde = dx + dy + 2;
    if (garde > 4000) return;
    for (;;) {
      if (!per || (k % per) < on) { if (x0 >= 0 && y0 >= 0 && x0 < BW && y0 < BH) B[y0 * BW + x0] = c; }
      if ((x0 === x1 && y0 === y1) || --garde < 0) break;
      var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
      k++;
    }
  }
  /* un polygone (monde) rempli par balayage, pair-impair ; t : tramage ; lut : remplace l'encre en place (ombres, voiles) */
  var QX = new Float64Array(64), QY = new Float64Array(64), XI = new Float64Array(64);
  function poly(n, c, t, lut) {
    var y0 = 1e9, y1 = -1e9, i, j;
    for (i = 0; i < n; i++) { QX[i] -= OX; QY[i] -= OY; if (QY[i] < y0) y0 = QY[i]; if (QY[i] > y1) y1 = QY[i]; }
    if (t === undefined) t = 1;
    var ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(BH - 1, Math.floor(y1 - 0.5)), t16 = t * 16;
    for (var y = ya; y <= yb; y++) {
      var yc = y + 0.5, k = 0;
      for (i = 0, j = n - 1; i < n; j = i++) {
        var ay = QY[j], by = QY[i];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) XI[k++] = QX[j] + (yc - ay) / (by - ay) * (QX[i] - QX[j]);
      }
      for (i = 1; i < k; i++) { var v = XI[i], m = i - 1; while (m >= 0 && XI[m] > v) { XI[m + 1] = XI[m]; m--; } XI[m + 1] = v; }
      var o = y * BW, row = (y & 3) << 2;
      for (i = 0; i + 1 < k; i += 2) {
        var xa = Math.max(0, Math.ceil(XI[i] - 0.5)), xb = Math.min(BW - 1, Math.floor(XI[i + 1] - 0.5)), x;
        if (xb < xa) continue;
        if (lut) { for (x = xa; x <= xb; x++) if (t >= 1 || BAY[row | (x & 3)] < t16) B[o + x] = lut[B[o + x]]; }
        else if (t >= 1) B.fill(c, o + xa, o + xb + 1);
        else for (x = xa; x <= xb; x++) if (BAY[row | (x & 3)] < t16) B[o + x] = c;
      }
    }
  }
  /* le contour d'un polygone déjà posé dans QX/QY (coordonnées monde, avant poly) */
  var CX_ = new Float64Array(64), CY_ = new Float64Array(64);
  function garderContour(n) { for (var i = 0; i < n; i++) { CX_[i] = QX[i]; CY_[i] = QY[i]; } }
  function contour(n, c, cLumiere) {
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var col = c;
      if (cLumiere !== undefined) { var nx = CY_[i] - CY_[j], ny = CX_[j] - CX_[i]; if (nx + ny * 1.4 < 0) col = cLumiere; }
      ligne(CX_[j], CY_[j], CX_[i], CY_[i], col);
    }
  }
  /* un petit vaisseau : des points (u, v) en unités, tournés de a, à l'échelle k, posés en (x, y) */
  function forme(pts, x, y, a, k) {
    var ca = Math.cos(a) * k, sa = Math.sin(a) * k, n = pts.length >> 1;
    for (var i = 0; i < n; i++) { var u = pts[2 * i], v = pts[2 * i + 1]; QX[i] = x + u * ca - v * sa; QY[i] = y + u * sa + v * ca; }
    return n;
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

  /* ================================ le décor généré : nébuleuse, étoiles, planète, galaxie ================================ */
  var NEB = null, NEB_L = 0, NEB_N = 512, NEB_M = 511, NEB_SH = 9;
  var ETOILES = null, PLANETE = null, GALAXIE = null, LUNE = null;
  function hash2(ix, iy, s) {
    var h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  /* bruit de valeur bouclé sur la période per (en cellules) */
  function bruit(x, y, per, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var x0 = ((ix % per) + per) % per, y0 = ((iy % per) + per) % per, x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
    var a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, s) {
    var v = 0, amp = 0.5, tot = 0;
    for (var o = 0; o < 4; o++) { var cell = 128 >> o, per = NEB_N / cell; v += bruit(x / cell, y / cell, per, s + o * 31) * amp; tot += amp; amp *= 0.5; }
    return v / tot;
  }
  /* la nébuleuse se construit par bandes de 16 rangées, une bande par image, pendant la brèche (le ciel la cache) */
  function nebuleuseBande() {
    if (!NEB || NEB_L >= NEB_N) return;
    var chaud = T.qui === 'lui' ? 0.52 : 0.64, g = 9100 + (T.graine | 0);
    for (var y = NEB_L; y < Math.min(NEB_N, NEB_L + 16); y++) {
      for (var x = 0; x < NEB_N; x++) {
        var n = fbm(x, y, g), w = fbm(x + 77, y + 131, g + 500), c = P.vide, r = BAY[((y & 3) << 2) | (x & 3)] / 16;
        n = (n - 0.5) * 1.8 + 0.47;
        if (n > 0.5) {
          if (n < 0.58) c = (n - 0.5) / 0.08 > r ? P.nuit : P.vide;
          else if (n < 0.68) c = (n - 0.58) / 0.1 * 0.7 > r ? (w > chaud ? P.ardoise : P.indigo) : P.nuit;
          else if (n < 0.8) c = (n - 0.68) / 0.12 * 0.6 > r ? (w > chaud ? P.sang : P.violet) : (w > chaud ? P.ardoise : P.indigo);
          else c = (n - 0.9) / 0.1 * 0.25 > r ? (w > chaud + 0.06 ? P.brasier : P.rose) : (w > chaud ? P.sang : P.violet);
        }
        NEB[(y << NEB_SH) | x] = c;
      }
    }
    NEB_L += 16;
  }
  function etoilesNeuves() {
    ETOILES = [];
    var defs = [[150, 0.06, 0], [80, 0.22, 1], [34, 0.6, 2]];
    for (var l = 0; l < defs.length; l++) {
      var n = defs[l][0], L = { p: defs[l][1], k: defs[l][2], x: new Float32Array(n), y: new Float32Array(n), c: new Uint8Array(n), b: new Uint8Array(n) };
      for (var i = 0; i < n; i++) {
        L.x[i] = rdv() * 512; L.y[i] = rdv() * 512;
        var q = rdv();
        if (l === 0) L.c[i] = q < 0.5 ? P.ardoise : q < 0.85 ? P.acier : P.violet;
        else if (l === 1) L.c[i] = q < 0.55 ? P.acier : q < 0.8 ? P.os : q < 0.9 ? P.rose : P.jaune;
        else L.c[i] = q < 0.7 ? P.os : q < 0.85 ? P.jaune : P.rose;
        L.b[i] = (l === 2 && rdv() < 0.35) || (l === 1 && rdv() < 0.08) ? 1 : 0;
      }
      ETOILES.push(L);
    }
  }
  /* une planète annelée, ombrée au tramage ; 255 = transparent */
  function planeteNeuve(R, chaude) {
    var rx = Math.round(R * 2.3), ry = Math.round(R * 0.62), w = rx * 2 + 4, h = Math.max(R * 2 + 4, ry * 2 + 4), cx = w >> 1, cy = h >> 1;
    var d = new Uint8Array(w * h), i, x, y;
    for (i = 0; i < d.length; i++) d[i] = 255;
    var bandes = chaude ? [P.jaune, P.ambre, P.brasier, P.ambre, P.sang, P.brasier] : [P.rose, P.violet, P.indigo, P.violet, P.magenta, P.indigo];
    var anneau = chaude ? [P.ambre, P.jaune, P.os] : [P.acier, P.os, P.rose];
    var inc = -0.32, ci = Math.cos(inc), si = Math.sin(inc);
    function anneauPx(x, y, devant) {
      var ux = (x - cx) * ci + (y - cy) * si, uy = -(x - cx) * si + (y - cy) * ci, e = (ux * ux) / (rx * rx) + (uy * uy) / (ry * ry);
      if (e < 0.5 || e > 1) return -1;
      if (devant !== (uy > 0)) return -1;
      var k = Math.floor((e - 0.5) / 0.5 * 7);
      if (k === 3) return -1;                                  // la division de l'anneau
      var c = anneau[k % 3], r = BAY[((y & 3) << 2) | (x & 3)] / 16;
      return (k === 0 || k === 6) ? (r < 0.5 ? c : -1) : c;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var a = anneauPx(x, y, false); if (a >= 0) d[y * w + x] = a; }
    for (y = -R; y <= R; y++) for (x = -R; x <= R; x++) {
      var q = x * x + y * y; if (q > R * R) continue;
      var nz = Math.sqrt(R * R - q) / R, nx = x / R, ny = y / R, lum = clamp(-0.55 * nx - 0.5 * ny + 0.65 * nz, 0, 1);
      var lat = (y + Math.sin(x * 0.18) * 1.6) / R, b = bandes[Math.floor((lat + 1) * 3.2 + bruit(x * 0.08 + 9, y * 0.4, 64, 7) * 1.5) % bandes.length];
      var r2 = BAY[(((y + cy) & 3) << 2) | ((x + cx) & 3)] / 16, c = b;
      if (lum < 0.18) c = lum / 0.18 > r2 ? P.nuit : P.vide;
      else if (lum < 0.42) c = (lum - 0.18) / 0.24 > r2 ? b : P.nuit;
      if (lum > 0.9 && r2 < 0.5) c = chaude ? P.jaune : P.os;
      if (q > (R - 1.2) * (R - 1.2) && lum > 0.45) c = chaude ? P.jaune : P.rose;  // le limbe éclairé
      d[(y + cy) * w + (x + cx)] = c;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var a2 = anneauPx(x, y, true); if (a2 >= 0) d[y * w + x] = a2; }
    return { w: w, h: h, data: d };
  }
  /* la galaxie spirale d'ELLE : deux bras logarithmiques tramés, un bulbe d'os */
  function galaxieNeuve(R) {
    var w = R * 2 + 2, h = Math.round(R * 1.2) + 2, cx = w >> 1, cy = h >> 1, d = new Uint8Array(w * h), inc = 0.5, rot = 0.4;
    for (var i = 0; i < d.length; i++) d[i] = 255;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var px = (x - cx), py = (y - cy) / inc, ux = px * Math.cos(rot) + py * Math.sin(rot), uy = -px * Math.sin(rot) + py * Math.cos(rot);
      var r = Math.sqrt(ux * ux + uy * uy) / R; if (r > 1) continue;
      var th = Math.atan2(uy, ux), bras = 0.5 + 0.5 * Math.cos(2 * (th - 4.2 * Math.log(r + 0.05)));
      var v = Math.pow(bras, 3) * (1 - r) * 1.5 + Math.max(0, 0.35 - r) * 3, q = BAY[((y & 3) << 2) | (x & 3)] / 16;
      var c = -1;
      if (v > 0.9) c = q < 0.6 ? P.os : P.rose;
      else if (v > 0.55) c = q < (v - 0.55) / 0.35 ? P.rose : P.violet;
      else if (v > 0.28) c = q < (v - 0.28) / 0.27 ? P.violet : P.indigo;
      else if (v > 0.12) c = q < (v - 0.12) / 0.16 * 0.6 ? P.indigo : -1;
      if (c >= 0) d[y * w + x] = c;
    }
    return { w: w, h: h, data: d };
  }
  function poserSprite(s, x, y) {
    if (!s) return;
    x = Math.round(x) - OX; y = Math.round(y) - OY;
    var xa = Math.max(0, x), ya = Math.max(0, y), xb = Math.min(BW, x + s.w), yb = Math.min(BH, y + s.h), d = s.data;
    for (var yy = ya; yy < yb; yy++) {
      var o = yy * BW, so = (yy - y) * s.w - x;
      for (var xx = xa; xx < xb; xx++) { var v = d[so + xx]; if (v !== 255) B[o + xx] = v; }
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
      d[y * n + x] = v;
    }
    PORT = { w: n, h: n, data: d };
    journal('portrait ' + T.qui);
    return PORT;
  }

  /* ================================ la musique de 2975 ================================ */
  var A = { ctx: null, out: null, etouf: null, rev: null, dly: null, bruit: null, onde25: null,
    next: 0, pas: 0, mes: 0, mesSec: 0, sec: -1, tempo: 92, demi: false, finJoue: false, rampe: 0,
    phrase: null, phraseVar: [], arp: 0, accord: null, notes: { nappe: 0, basse: 0, arp: 0, lead: 0, perc: 0 } };
  function audio() {
    if (A.ctx) return A.ctx;
    var c = null;
    try { c = N.music && N.music.context ? N.music.context() : null; } catch (e) { c = null; }
    if (!c || !c.createOscillator) return null;
    A.ctx = c;
    A.etouf = c.createBiquadFilter(); A.etouf.type = 'lowpass'; A.etouf.frequency.value = 18000; A.etouf.Q.value = 0.5;
    A.out = c.createGain(); A.out.gain.value = 0.62;
    A.etouf.connect(A.out); A.out.connect(c.destination);
    /* la réverbération : une réponse de 2,6 s générée à la graine (deux canaux, décroissance exponentielle) */
    try {
      var sr = c.sampleRate, n = Math.floor(sr * 2.6), ir = c.createBuffer(2, n, sr);
      for (var ch = 0; ch < 2; ch++) { var x = ir.getChannelData(ch); for (var i = 0; i < n; i++) x[i] = (rna() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
      A.rev = c.createConvolver(); A.rev.buffer = ir;
      var rg = c.createGain(); rg.gain.value = 0.34; A.rev.connect(rg); rg.connect(A.etouf);
    } catch (e) { A.rev = null; }
    /* l'écho des arpèges */
    A.dly = c.createDelay(1.0); A.dly.delayTime.value = 0.375;
    var fb = c.createGain(); fb.gain.value = 0.32; var dg = c.createGain(); dg.gain.value = 0.42;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    A.dly.connect(lp); lp.connect(fb); fb.connect(A.dly); lp.connect(dg); dg.connect(A.etouf);
    /* le bruit des percussions : une seconde, à la graine */
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
  function env(g, t, v, att, d, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att);
    g.gain.setValueAtTime(v, t + Math.max(att, d - rel)); g.gain.linearRampToValueAtTime(0.0001, t + d);
  }
  function envoyer(noeud, sec, rev, dly) {
    noeud.connect(A.etouf);
    if (rev && A.rev) { var g = A.ctx.createGain(); g.gain.value = rev; noeud.connect(g); g.connect(A.rev); }
    if (dly) { var g2 = A.ctx.createGain(); g2.gain.value = dly; noeud.connect(g2); g2.connect(A.dly); }
  }
  /* la nappe : deux scies désaccordées par note, un filtre qui s'ouvre, une attaque lente */
  function nappe(t, notes, d, v, clair) {
    var c = A.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(clair ? 1400 : 600, t); f.frequency.linearRampToValueAtTime(clair ? 3200 : 1500, t + d * 0.6);
    env(g, t, v, Math.min(clair ? 0.04 : 0.5, d * 0.3), d + 0.5, clair ? d * 0.4 : 0.7);
    f.connect(g); envoyer(g, 0, 0.7, 0);
    for (var i = 0; i < notes.length; i++) for (var k = -1; k <= 1; k += 2) {
      var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(notes[i]); o.detune.value = k * 7;
      o.connect(f); o.start(t); o.stop(t + d + 0.6);
    }
    A.notes.nappe++;
  }
  function basse(t, m, d, v) {
    var c = A.ctx, o = c.createOscillator(), s = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), gs = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(m); s.type = 'sine'; s.frequency.value = hz(m - 12);
    f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(240, t + Math.max(0.06, d * 0.8));
    env(g, t, v, 0.006, d, Math.min(0.08, d * 0.3)); env(gs, t, v * 0.9, 0.006, d, Math.min(0.08, d * 0.3));
    o.connect(f); f.connect(g); s.connect(gs); envoyer(g, 0, 0, 0); envoyer(gs, 0, 0, 0);
    o.start(t); o.stop(t + d + 0.05); s.start(t); s.stop(t + d + 0.05); A.notes.basse++;
  }
  function arpege(t, m, d, v) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    if (A.onde25) o.setPeriodicWave(A.onde25); else o.type = 'square';
    o.frequency.value = hz(m);
    env(g, t, v, 0.004, d, d * 0.5);
    o.connect(g); envoyer(g, 0, 0.2, 0.9);
    o.start(t); o.stop(t + d + 0.03); A.notes.arp++;
  }
  function lead(t, m, d, v) {
    var c = A.ctx, f = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    f.type = 'lowpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(1200, t); f.frequency.linearRampToValueAtTime(2800, t + Math.min(0.2, d));
    env(g, t, v, 0.03, d, Math.min(0.15, d * 0.4));
    l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(hz(m) * 0.012, t + Math.min(0.5, d));
    l.connect(lg);
    for (var k = -1; k <= 1; k += 2) {
      var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = k * 9;
      lg.connect(o.frequency); o.connect(f); o.start(t); o.stop(t + d + 0.05);
    }
    l.start(t); l.stop(t + d + 0.05);
    f.connect(g); envoyer(g, 0, 0.45, 0.15); A.notes.lead++;
  }
  function bruitPerc(t, d, v, type, f0, f1, q, rev) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.bruit; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d); if (q) f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    s.connect(f); f.connect(g); envoyer(g, 0, rev || 0, 0);
    s.start(t, (A.notes.perc * 0.173) % 0.8); s.stop(t + d + 0.02); A.notes.perc++;
  }
  function ton(t, f0, f1, d, v, type, rev) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.6);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    o.connect(g); envoyer(g, 0, rev || 0, 0); o.start(t); o.stop(t + d + 0.02);
  }
  function kick(t, v) { ton(t, 150, 42, 0.38, v); bruitPerc(t, 0.012, v * 0.3, 'highpass', 2500); }
  function caisse(t, v) { bruitPerc(t, 0.2, v, 'bandpass', 1900, 1500, 0.8, 0.3); ton(t, 190, 150, 0.1, v * 0.5, 'triangle'); }
  function charley(t, v, ouvert) { bruitPerc(t, ouvert ? 0.2 : 0.045, v, 'highpass', 7600); }
  function timbale(t, m, v) { ton(t, hz(m) * 1.5, hz(m), 0.9, v, 'sine', 0.5); bruitPerc(t, 0.05, v * 0.25, 'lowpass', 900); }
  function cymbale(t, v) { bruitPerc(t, 1.8, v, 'highpass', 5200, 0, 0, 0.5); }
  function montee(t, d, v) { bruitPerc(t, d, v, 'bandpass', 300, 6000, 1.5, 0.4); }
  function impact(t, v) { kick(t, v); bruitPerc(t, 1.6, v * 0.7, 'lowpass', 2200, 70, 0, 0.6); ton(t, 70, 38, 1.6, v * 0.8); cymbale(t, v * 0.25); }

  /* les accords : [basse, [notes de la nappe]] ; ré mineur, Si bémol, Fa, Do ; ré, sol, Si bémol, La ; ré, Do, Si bémol, La */
  var PROG = {
    A: [[38, [50, 62, 65, 69]], [34, [50, 62, 65, 70]], [41, [53, 60, 65, 69]], [36, [52, 60, 64, 67]]],
    B: [[38, [50, 62, 65, 69]], [43, [50, 62, 67, 70]], [34, [50, 62, 65, 70]], [33, [49, 61, 64, 69]]],
    C: [[38, [50, 62, 65, 69]], [36, [48, 60, 64, 67]], [34, [46, 62, 65, 70]], [33, [45, 61, 64, 69]]]
  };
  /* la tête du motif de Neon Velocity (ré, fa, la, sol, fa) en quatre variantes de deux mesures : [pas, note, durée] */
  var MOTIFS = [
    [[[0, 74, 6], [6, 77, 2], [8, 81, 6], [14, 79, 2]], [[0, 77, 8], [8, 76, 4], [12, 74, 4]]],
    [[[0, 74, 6], [6, 77, 2], [8, 81, 6], [14, 79, 2]], [[0, 77, 4], [4, 79, 4], [8, 77, 2], [10, 76, 2], [12, 74, 4]]],
    [[[0, 74, 4], [4, 77, 2], [6, 81, 2], [8, 86, 6], [14, 84, 2]], [[0, 81, 8], [8, 79, 4], [12, 77, 4]]],
    [[[0, 74, 3], [3, 77, 3], [6, 81, 4], [10, 79, 2], [12, 77, 4]], [[0, 76, 6], [6, 77, 2], [8, 74, 8]]]
  ];
  var RYTHMES = [[[0, 4], [4, 2], [6, 2], [8, 4], [12, 4]], [[0, 2], [2, 2], [4, 4], [8, 6], [14, 2]], [[0, 6], [6, 2], [8, 2], [10, 2], [12, 4]], [[0, 3], [3, 3], [6, 2], [8, 8]]];
  var GAMME = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81, 82, 84];
  function progDe(sec) { return sec === 3 || sec === 5 ? PROG.B : sec >= 6 && sec <= 8 ? ((sec === 8 && (A.mesSec >> 2) & 1) ? PROG.A : PROG.C) : PROG.A; }
  /* une phrase de quatre mesures : deux du motif (variante tirée, jamais trois fois la même de suite), deux composées */
  function phraseNeuve(prog) {
    var v = Math.floor(rna() * MOTIFS.length), h = A.phraseVar;
    if (h.length >= 2 && h[h.length - 1] === v && h[h.length - 2] === v) v = (v + 1) % MOTIFS.length;
    h.push(v); if (h.length > 4) h.shift();
    var ph = [MOTIFS[v][0], MOTIFS[v][1]];
    for (var b = 2; b < 4; b++) {
      var acc = prog[b][1], ry = RYTHMES[Math.floor(rna() * RYTHMES.length)], ev = [], prec = 77;
      for (var i = 0; i < ry.length; i++) {
        var choix = [], k;
        for (k = 1; k < acc.length; k++) { var n = acc[k]; while (n < 70) n += 12; while (n > 86) n -= 12; choix.push(n); }
        if (i % 2 === 1) for (k = 0; k < GAMME.length; k++) if (Math.abs(GAMME[k] + 12 - prec) <= 2 && GAMME[k] + 12 <= 86) choix.push(GAMME[k] + 12);
        var best = choix[0], bd = 1e9;
        for (k = 0; k < choix.length; k++) { var dd = Math.abs(choix[k] - prec) + rna() * 6; if (dd < bd) { bd = dd; best = choix[k]; } }
        if (b === 3 && i === ry.length - 1) best = acc[1] + 12 > 86 ? acc[1] : acc[1] + 12;
        ev.push([ry[i][0], best, ry[i][1]]); prec = best;
      }
      ph.push(ev);
    }
    return ph;
  }
  function grille(evs) { var g = []; for (var i = 0; i < evs.length; i++) g[evs[i][0]] = evs[i]; return g; }

  /* la section voulue par le jeu : 0 brèche, 1 armada, 2 chasse, 3 débris, 4 descente, 5 plan, 6 amiral, 7 silence, 8 cœur, 9 fin */
  function secVoulue() {
    if (T.phase === 'entree') return 0;
    if (T.phase === 'voyage') return T.sec;
    if (T.phase === 'boss' && T.boss) { var e = T.boss.etat; return e === 'transition' ? 7 : e === 'p2' ? 8 : 6; }
    return 9;
  }
  function warpEnCours() { return W.phase === 'entree' || W.phase === 'visee' || W.phase === 'sortie'; }
  function pasMusique(t, d16) {
    var pos = A.pas % 16, c = A.ctx, i;
    if (pos === 0) {
      var w = secVoulue(), avant = A.sec;
      if (A.sec === 7) { A.sec = 8; A.mesSec = 0; A.tempo = CFG.tempos[8]; impact(t, 0.75); journal('musique coeur'); }
      else if (w !== A.sec && w !== 9) {
        if (w === 7 && A.sec !== 6) w = 8;
        A.sec = w; A.mesSec = 0;
        if (w !== 6) A.tempo = CFG.tempos[w];
        else A.rampe = CFG.tempos[6];
        if (w === 2 || w === 5) { impact(t, 0.6); }
        if (w === 6) { cymbale(t, 0.3); timbale(t, 38, 0.5); }
        journal('musique section ' + w + ' (' + avant + ')');
      } else if (A.mes > 0) A.mesSec++;
      A.mes++;
      var prog = progDe(A.sec);
      A.accord = prog[A.mesSec % 4];
      if (A.mesSec % 4 === 0 || !A.phrase) { A.phrase = phraseNeuve(prog).map(grille); }
      if (A.mesSec % 2 === 0) A.arp = Math.floor(rna() * 4);
    }
    /* l'accélération de l'amiral : deux mesures, de 128 à 144 */
    if (A.sec === 6 && A.tempo < A.rampe) A.tempo = Math.min(A.rampe, A.tempo + 0.5);
    var sec = A.sec, ac = A.accord || PROG.A[0], racine = ac[0], notes = ac[1], ph = A.phrase, mesD = d16 * 16;
    var plein = sec === 2 || sec === 3 || sec === 5 || sec === 6 || sec === 8;
    if (sec === 7) {                                            // la mesure de silence : rien, qu'une aspiration à la fin
      if (pos === 10) montee(t, d16 * 6, 0.12);
      if (pos === 14) { ton(t, 60, 120, d16 * 2, 0.15, 'sawtooth'); }
      return;
    }
    if (sec === 9) return;
    /* la nappe : une par mesure ; à l'amiral, des accords frappés en plus */
    if (pos === 0) nappe(t, notes, mesD, sec <= 1 ? 0.032 : 0.026, false);
    if ((sec === 6 || sec === 8) && (pos === 0 || pos === 6 || pos === 12)) nappe(t, notes.slice(1).map(function (n) { return n + 12; }), d16 * 2.5, 0.03, true);
    /* la basse */
    if (sec === 0) { if (pos === 0) basse(t, racine, mesD * 0.95, 0.09); }
    else if (sec === 1) { if (pos === 0 || pos === 8) basse(t, racine, d16 * 7.5, 0.1); }
    else if (sec === 4) basse(t, 33, d16 * 0.9, 0.06 + (A.mesSec & 1) * 0.02 + pos * 0.002);
    else if (sec === 5 || sec >= 6) { if (pos % 4 !== 1) basse(t, racine + (pos === 14 ? 12 : 0), d16 * 0.9, 0.085); }
    else if (pos % 2 === 0) basse(t, racine + (pos % 8 === 4 ? 12 : 0) + (pos === 14 ? 7 : 0), d16 * 1.8, 0.09);
    /* la batterie */
    if (sec === 0) { if (A.mesSec === 1 && pos === 0) montee(t, mesD * 2, 0.1); if (pos === 0 && A.mesSec >= 2) timbale(t, 38, 0.35); }
    else if (sec === 1) {
      if (pos === 0) timbale(t, 38, 0.5); if (pos === 8) timbale(t, 33, 0.38);
      if (A.mesSec % 4 === 3 && (pos === 12 || pos === 14)) timbale(t, pos === 12 ? 41 : 45, 0.3);
      if (pos % 4 === 2) charley(t, 0.025, false);
    } else if (sec === 4) {
      var roul = A.mesSec === 0 ? pos % 2 === 0 : true;
      if (roul) caisse(t, 0.05 + 0.012 * pos + 0.08 * Math.min(1, A.mesSec));
      if (pos === 0 && A.mesSec === 0) { montee(t, mesD * 2, 0.16); kick(t, 0.6); }
    } else if (plein) {
      var k4 = sec >= 5;
      if (pos === 0 || pos === 8 || (k4 && (pos === 4 || pos === 12)) || (!k4 && pos === 6) || (sec === 8 && (pos === 7 || pos === 15)) || (sec === 6 && pos === 14)) kick(t, 0.55);
      if (pos === 4 || pos === 12) caisse(t, 0.22);
      if (sec === 8 && pos === 14) caisse(t, 0.08);
      if (sec >= 3 ? true : pos % 2 === 0) charley(t, pos % 4 === 2 ? 0.05 : 0.03, pos === 14 || (sec === 8 && pos % 4 === 2));
      if (A.mesSec % 4 === 3 && pos >= 12) timbale(t, 50 - (pos - 12) * 3, 0.28);
      if (A.mesSec % 8 === 0 && pos === 0) cymbale(t, 0.16);
    }
    /* les arpèges : croches à l'armada, doubles croches ensuite, deux octaves au cœur */
    if (sec >= 1 && sec !== 4) {
      var pas = sec === 1 ? 2 : 1;
      if (pos % pas === 0) {
        var ton3 = [notes[1], notes[2], notes[3], notes[1] + 12], j = (pos / pas) | 0, motif;
        if (A.arp === 0) motif = j % 4; else if (A.arp === 1) motif = 3 - (j % 4); else if (A.arp === 2) motif = [0, 1, 2, 3, 2, 1][j % 6]; else motif = [0, 2, 1, 3][j % 4];
        var m = ton3[motif] + 12 + (sec === 8 && (j & 4) ? 12 : 0);
        arpege(t, m, d16 * pas * 0.8, sec === 1 ? 0.02 : 0.017);
      }
    }
    /* le lead : la phrase, à partir de la troisième mesure de l'armada */
    if (ph && sec >= 1 && sec !== 4 && !(sec === 1 && A.mesSec < 2)) {
      var ev = ph[A.mesSec % 4][pos];
      if (ev) lead(t, ev[1] + (sec === 8 ? 12 : 0) - (sec === 1 ? 12 : 0), ev[2] * d16 * 0.95, sec === 1 ? 0.03 : 0.04);
    }
  }
  /* la fin : la détonation, puis l'accord de ré majeur et le motif, lent */
  function finale(t) {
    impact(t, 0.95); cymbale(t + 0.05, 0.4);
    var d = 60 / 76, tt = t + 2.2;
    nappe(tt, [50, 62, 66, 69, 74], 7.5, 0.04, false); basse(tt, 38, 6.5, 0.1); timbale(tt, 38, 0.5);
    var M = [[0, 74, 1.5], [1.5, 78, 0.5], [2, 81, 1.5], [3.5, 79, 0.5], [4, 78, 3]];
    for (var i = 0; i < M.length; i++) lead(tt + M[i][0] * d, M[i][1], M[i][2] * d * 0.95, 0.045);
    journal('musique finale');
  }
  function ordonnancer() {
    var c = audio(); if (!c || c.state !== 'running' || T.phase === 'fini') return;
    if (muet()) { A.next = 0; return; }
    if (T.detone && !A.finJoue) { A.finJoue = true; A.sec = 9; finale(c.currentTime + 0.02); }
    if (A.sec === 9) return;
    /* l'étouffoir suit le warp */
    var w = warpEnCours(), cible = w ? 900 : 18000;
    if (A.etoufCible !== cible) { A.etoufCible = cible; A.etouf.frequency.cancelScheduledValues(c.currentTime); A.etouf.frequency.setTargetAtTime(cible, c.currentTime, w ? 0.08 : 0.25); }
    if (A.next < c.currentTime) A.next = c.currentTime + 0.05;
    var garde = 0;
    while (A.next < c.currentTime + 0.15 && ++garde < 32) {
      if (A.pas % 4 === 0) A.demi = w;                        // le demi-temps commence et finit sur un temps
      var d16 = 60 / A.tempo / 4 * (A.demi ? 2 : 1);
      pasMusique(A.next, d16);
      A.pas++; A.next += d16;
    }
  }
  function sfx(nom, v) {
    if (!sonOk('effets')) return;
    var t = A.ctx.currentTime + 0.01; v = v || 1;
    if (nom === 'tir') ton(t, 1700, 900, 0.05, 0.018 * v, 'square');
    else if (nom === 'pop') { bruitPerc(t, 0.22, 0.16 * v, 'lowpass', 2600, 300); ton(t, 220, 80, 0.15, 0.08 * v, 'triangle'); }
    else if (nom === 'boum') { bruitPerc(t, 1.1, 0.4 * v, 'lowpass', 2600, 90, 0, 0.4); ton(t, 90, 36, 0.9, 0.35 * v); }
    else if (nom === 'coupe') { bruitPerc(t, 0.09, 0.14, 'highpass', 2200); ton(t, 700, 300, 0.16, 0.06, 'square'); }
    else if (nom === 'mort') { ton(t, 520, 60, 0.8, 0.1, 'sawtooth'); bruitPerc(t, 0.6, 0.25, 'lowpass', 1800, 100); }
    else if (nom === 'mange') { ton(t, 880, 1320, 0.08, 0.05, 'square'); ton(t + 0.06, 1320, 1760, 0.08, 0.04, 'square'); }
    else if (nom === 'sirene') { for (var k = 0; k < 3; k++) ton(t + k * 0.32, 700, 1150, 0.3, 0.05, 'sawtooth'); }
    else if (nom === 'verrou') ton(t, 1900, 2400, 0.06, 0.05, 'square');
    else if (nom === 'salve') { bruitPerc(t, 0.5, 0.18, 'bandpass', 600, 4000, 1.2); }
    else if (nom === 'ralenti') { ton(t, 400, 90, 0.6, 0.12, 'sawtooth'); bruitPerc(t, 0.6, 0.1, 'lowpass', 3000, 200); }
    else if (nom === 'touche') ton(t, 260, 200, 0.06, 0.06, 'square');
    else if (nom === 'rayon') { ton(t, 300, 900, 0.9, 0.04, 'sawtooth'); }
    else if (nom === 'tirRayon') { bruitPerc(t, 0.35, 0.18, 'bandpass', 1200, 400, 2); ton(t, 180, 90, 0.35, 0.1, 'sawtooth'); }
    else if (nom === 'obus') ton(t, 1400, 500, 0.5, 0.03, 'triangle');
    else if (nom === 'faible') { impact(t, 0.6); }
  }

  /* ================================ le warp (le nôtre, calé sur N.warp quand il existe) ================================ */
  var W = { phase: 'repos', pt: 0, t: 0, f: 1, raison: '', ext: false, extT: -1, cur: { x: 0, y: 0 }, off: { x: 0, y: 0 }, cadre: null,
    verrous: [], sous: null, sousT: 0, tenu: false, peintT: 0, salveT: -1, file: [], n: 0, souris: false, p0: { x: -1, y: -1 }, k: 0, stries: [], cote: 0 };
  function wcfg() { return CFG.warp; }
  function warpExterne() { return !!(N.warp && N.warp.declencher && N.warp.facteur && N.warp.state); }
  function annoncer(raison, cote) {
    if (W.phase !== 'repos') return false;
    W.phase = 'annonce'; W.pt = 0; W.raison = raison; W.cote = cote;
    sfx('sirene'); journal('annonce ' + raison);
    return true;
  }
  function entrerWarp() {
    W.phase = 'entree'; W.pt = 0; W.n++; T.compte.warps++;
    W.verrous.length = 0; W.sous = null; W.sousT = 0; W.off.x = 0; W.off.y = 0; W.cur.x = T.W / 2; W.cur.y = T.H / 2;
    var I = S().input; W.tenu = !!(I && (I.boost || I.fire)); W.p0.x = I && I.pointer ? I.pointer.x : -1; W.p0.y = I && I.pointer ? I.pointer.y : -1; W.souris = false;
    W.ext = false;
    if (warpExterne()) {
      var ok = false;
      try { ok = N.warp.declencher('escadrille', { duree: wcfg().visee }) !== false; } catch (e) { ok = false; }
      if (ok) { W.ext = true; W.extUse = true; W.extT = -1; T.compte.warpsExternes++; }
    }
    W.stries.length = 0;
    for (var i = 0; i < 26; i++) W.stries.push({ a: rdv() * 6.2832, r: 0.25 + rdv() * 0.75, v: 0.05 + rdv() * 0.1 });
    sfx('ralenti'); journal('warp ' + W.raison + (W.ext ? ' (N.warp)' : ' (interne)'));
    marquer('warp' + W.n);
  }
  /* N.warp n'avance que si quelqu'un l'appelle : si personne ne l'a fait pour cette image, on le fait (jusqu'au bout de
     sa sortie et de sa recharge — l'état arrondit la recharge, d'où un appel à chaque image —, sinon il refuserait le
     warp suivant) */
  function tickExterne(dt) {
    try {
      var st = N.warp.state();
      if (st.t === W.extT) { N.warp.update(dt); st = N.warp.state(); }
      W.extT = st.t;
    } catch (e) { W.extUse = false; }
  }
  function facteurInterne() {
    var c = wcfg();
    if (W.phase === 'entree') return 1 + (c.facteur - 1) * lisse(W.pt / c.entree);
    if (W.phase === 'visee') return c.facteur;
    if (W.phase === 'sortie') return c.facteur + (1 - c.facteur) * lisse(W.pt / c.sortie);
    return 1;
  }
  function majWarp(dt) {
    var c = wcfg();
    W.t += dt;
    if (W.extUse) tickExterne(dt);
    if (W.phase === 'repos') { T.f = 1; W.k = 0; majSalve(dt); return; }
    W.pt += dt;
    if (W.phase === 'annonce') { if (W.pt >= c.annonce) { lancerEscadrille(W.raison, W.cote); entrerWarp(); } T.f = 1; W.k = 0; return; }
    if (W.phase === 'entree' && W.pt >= c.entree) { W.phase = 'visee'; W.pt = 0; journal('visee'); }
    else if (W.phase === 'visee' && W.pt >= c.visee) salve('fin');
    else if (W.phase === 'sortie' && W.pt >= c.sortie) { W.phase = 'repos'; W.pt = 0; journal('fin du warp'); }
    if (W.phase === 'entree' || W.phase === 'visee') entreesWarp(dt);
    var f = facteurInterne();
    if (W.ext) {
      try {
        var st = N.warp.state();
        if (N.warp.actif() && !(st.phase === 'sortie' && W.phase === 'visee')) f = N.warp.facteur();
        else if (W.phase === 'visee' || W.phase === 'entree') { W.ext = false; journal('N.warp rendu : ralenti interne'); }
      } catch (e) { W.ext = false; }
    }
    T.f = clamp(f, 0.05, 1);
    W.k = clamp((1 - T.f) / (1 - c.facteur), 0, 1);
    for (var i = W.verrous.length - 1; i >= 0; i--) if (!vivant(W.verrous[i].e)) W.verrous.splice(i, 1);
    majSalve(dt);
  }
  /* les cibles du warp : tout ce qui vit sur notre plan, à l'écran (les points faibles de l'amiral compris) */
  function cibles() {
    var L = [], i, e, m = 6;
    for (i = 0; i < T.E.length; i++) { e = T.E[i]; if (e.mort || e.k === 'roc' || e.k === 'epave') continue; var s = ecran(e.x, e.y); if (s.x > -m && s.y > -m && s.x < T.W + m && s.y < T.H + m) L.push(e); }
    var b = T.boss;
    if (b && (b.etat === 'p1' || b.etat === 'p2')) for (i = 0; i < b.parts.length; i++) { e = b.parts[i]; if (!vivant(e)) continue; var s2 = ecran(e.x, e.y); if (s2.x > -m && s2.y > -m && s2.x < T.W + m && s2.y < T.H + m) L.push(e); }
    return L;
  }
  function vivant(e) { return !!e && !e.mort && (e.k !== 'faible' || (e.actif && T.boss && (T.boss.etat === 'p1' || T.boss.etat === 'p2'))); }
  function verrousSur(e) { var n = 0; for (var i = 0; i < W.verrous.length; i++) if (W.verrous[i].e === e) n++; return n; }
  function plafond(e) { return e.k === 'faible' ? (e.type === 'coeur' ? 3 : 2) : e.k === 'fregate' ? 2 : 1; }
  function plusProche(sx, sy, rayon) {
    var L = cibles(), best = null, bd = rayon * rayon;
    for (var i = 0; i < L.length; i++) {
      var e = L[i]; if (verrousSur(e) >= plafond(e)) continue;
      var s = ecran(e.x, e.y), rr = rayon + (e.r || 4), dd = d2(sx, sy, s.x, s.y);
      if (dd < rr * rr && dd < bd + (e.r || 4) * (e.r || 4)) { bd = dd; best = e; }
    }
    return best;
  }
  function verrouiller(sx, sy, rayon) {
    if (W.verrous.length >= wcfg().verrous) return false;
    var e = plusProche(sx, sy, rayon || wcfg().capture);
    if (!e) return false;
    W.verrous.push({ e: e, age: 0 }); T.compte.verrous++;
    sfx('verrou'); journal('verrou ' + (e.type || e.k));
    return true;
  }
  function entreesWarp(dt) {
    var I = S().input || {}, p = I.pointer, i, c = wcfg();
    if (p) {
      if (W.p0.x < 0) { W.p0.x = p.x; W.p0.y = p.y; }
      else if (!W.souris && (p.x !== W.p0.x || p.y !== W.p0.y)) W.souris = true;
    }
    /* la lunette balaie seule une courbe de Lissajous sur le cadre des cibles ; elle hésite sur une cible */
    var L = cibles(), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < L.length; i++) { var s = ecran(L[i].x, L[i].y); x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); }
    if (!L.length) { x0 = T.W * 0.2; x1 = T.W * 0.8; y0 = T.H * 0.25; y1 = T.H * 0.75; }
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ax = Math.max(24, (x1 - x0) / 2 + 6), ay = Math.max(17, (y1 - y0) / 2 + 6);
    var lent = W.sous ? 0.4 : 1;
    W.th = (W.th || 0) + dt * lent;
    var tx = mx + ax * Math.sin(W.th * 6.2832 / 2.6), ty = my + ay * Math.sin(W.th * 6.2832 / 1.9 + 0.7);
    if (W.souris && p) { tx = p.x; ty = p.y; }
    tx += W.off.x; ty += W.off.y;
    /* l'aimant : une cible à 26 px attire la lunette */
    var att = plusProche(tx, ty, 26);
    if (att) { var sa = ecran(att.x, att.y); tx += (sa.x - tx) * 0.5; ty += (sa.y - ty) * 0.5; }
    var k = Math.min(1, dt * 9);
    W.cur.x += (clamp(tx, 4, T.W - 4) - W.cur.x) * k; W.cur.y += (clamp(ty, 4, T.H - 4) - W.cur.y) * k;
    /* ce qui est sous la lunette : accroché au bout de 0,24 s */
    var sous = plusProche(W.cur.x, W.cur.y, c.capture);
    if (sous !== W.sous) { W.sous = sous; W.sousT = 0; }
    else if (sous) { W.sousT += dt; if (W.sousT >= c.attente) { verrouiller(W.cur.x, W.cur.y); W.sousT = -0.2; } }
    if (I.gestes) for (i = 0; i < I.gestes.length; i++) { var g = I.gestes[i]; if (g.genre === 'glisse' && g.doigt === 'action') { var px = (G() && G().PX) || 1; W.off.x += (g.dx || 0) / px * 1.6; W.off.y += (g.dy || 0) / px * 1.6; } }
    if (I.taps) for (i = 0; i < I.taps.length; i++) {
      var tp = I.taps[i]; if (tp.doigt && tp.doigt !== 'action') continue;
      if (!verrouiller(W.cur.x, W.cur.y, c.capture)) verrouiller(tp.x, tp.y, c.doigt);
    }
    var tient = !!(I.boost || I.fire);
    if (tient && !W.tenu) { W.tenu = true; W.peintT = 0; verrouiller(W.cur.x, W.cur.y); }
    else if (tient) { W.peintT += dt; if (W.peintT >= c.peinture) { W.peintT = 0; verrouiller(W.cur.x, W.cur.y); } }
    else if (W.tenu) { W.tenu = false; if (W.verrous.length && W.phase === 'visee' && W.pt > 0.6) salve('relache'); }
    for (i = 0; i < W.verrous.length; i++) W.verrous[i].age += dt;
  }
  function salve(raison) {
    var n = 0;
    for (var i = 0; i < W.verrous.length; i++) { var v = W.verrous[i]; if (!vivant(v.e)) continue; W.file.push({ d: n * 0.06, e: v.e }); n++; }
    W.verrous.length = 0;
    if (n) sfx('salve');
    journal('salve ' + raison + ' ' + n);
    W.phase = 'sortie'; W.pt = 0;
  }
  function majSalve(dt) {
    for (var i = W.file.length - 1; i >= 0; i--) {
      var q = W.file[i]; q.d -= dt;
      if (q.d <= 0) { W.file.splice(i, 1); if (vivant(q.e)) lancerMissile(q.e); }
    }
  }
  function lancerMissile(e) {
    var c = CFG.missile, a = Math.atan2(e.y - T.hy, e.x - T.hx), cote = (T.compte.missiles & 1) ? 1 : -1;
    T.mis.push({ x: T.hx, y: T.hy, a: a + cote * (0.9 + rnd() * 0.6), v: c.v0, e: e, vie: c.vie, tr: [] });
    T.compte.missiles++;
  }

  /* ================================ la caméra et l'écran ================================ */
  var ECR = { x: 0, y: 0 };
  function ecran(wx, wy) { ECR.x = wx - T.cx + T.W / 2; ECR.y = wy - T.cy + T.H / 2; return ECR; }
  function layout() {
    var g = G(); T.W = g.W | 0; T.H = g.H | 0;
    var s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    T.safe = { l: sf.l | 0, t: sf.t | 0, r: sf.r | 0, b: sf.b | 0 };
  }
  function majCamera(dt) {
    var look = Math.min(T.W, T.H) * 0.22, tx = T.hx + Math.cos(T.cap) * look, ty = T.hy + Math.sin(T.cap) * look, b = T.boss;
    if (b && T.phase === 'boss') { var kb = b.etat === 'arrivee' ? 0.45 : 0.28; tx = tx * (1 - kb) + b.x * kb; ty = ty * (1 - kb) + b.y * kb; }
    if (b && T.phase === 'explosion') { tx = T.hx * 0.35 + b.coeur.x * 0.65; ty = T.hy * 0.35 + b.coeur.y * 0.65; }
    if (T.phase === 'entree') { tx = T.hx; ty = T.hy - T.H * 0.12; }
    var k = 1 - Math.exp(-dt * 3.2), ox = T.cx, oy = T.cy;
    T.cx += (tx - T.cx) * k; T.cy += (ty - T.cy) * k;
    /* la tête ne sort jamais de l'écran (sauf pendant l'explosion, où la caméra regarde l'amiral) */
    if (T.phase === 'explosion') { T.cvx = dt > 0 ? (T.cx - ox) / dt : 0; T.cvy = dt > 0 ? (T.cy - oy) / dt : 0; return; }
    var mx = T.W * 0.5 - 14, my = T.H * 0.5 - 14;
    if (T.hx - T.cx > mx) T.cx = T.hx - mx; if (T.cx - T.hx > mx) T.cx = T.hx + mx;
    if (T.hy - T.cy > my) T.cy = T.hy - my; if (T.cy - T.hy > my) T.cy = T.hy + my;
    T.cvx = dt > 0 ? (T.cx - ox) / dt : 0; T.cvy = dt > 0 ? (T.cy - oy) / dt : 0;
  }

  /* ================================ le serpent ================================ */
  function tempoJeu() { return CFG.tempos[Math.min(5, T.sec)] || 120; }
  function seg(i) { if (i <= 0) return [T.hx, T.hy]; var k = Math.min(T.trail.length - 1, i * CFG.ecart); return T.trail[k] || [T.hx, T.hy]; }
  function trainer() {
    var p = T.trail[0], dx = T.hx - p[0], dy = T.hy - p[1], d = Math.sqrt(dx * dx + dy * dy), garde = 400;
    while (d >= 1 && --garde > 0) {
      var nx = p[0] + dx / d, ny = p[1] + dy / d;
      T.trail.unshift([nx, ny]); p = T.trail[0];
      dx = T.hx - nx; dy = T.hy - ny; d = Math.sqrt(dx * dx + dy * dy);
    }
    var max = T.nseg * CFG.ecart + 2;
    if (T.trail.length > max) T.trail.length = max;
  }
  function placerSerpent(x, y, cap) {
    T.hx = x; T.hy = y; T.cap = cap; T.vise = cap; T.aVise = false;
    T.nseg = CFG.longueurDepart; T.trail = [];
    for (var k = 0; k <= T.nseg * CFG.ecart + 2; k++) T.trail.push([x - Math.cos(cap) * k, y - Math.sin(cap) * k]);
  }
  function piloter(dm) {
    var inp = S().input;
    if (inp && inp.mag > 0.3 && (inp.x || inp.y)) { T.vise = Math.atan2(inp.y, inp.x); T.aVise = true; }
    var b = T.boss;
    /* l'arène de l'amiral : au-delà, un courant ramène la tête */
    if (b && T.phase === 'boss') {
      var dx = T.hx - b.x, dy = T.hy - b.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > b.arene) { T.vise = Math.atan2(-dy, -dx); T.aVise = true; }
    }
    if (T.aVise) {
      var d = angDiff(T.vise, T.cap), m = CFG.virage * dm;
      if (Math.abs(d) > 2.9) d = T.sens * Math.abs(d); else if (Math.abs(d) > 0.02) T.sens = d > 0 ? 1 : -1;
      T.cap += clamp(d, -m, m);
      if (T.cap > Math.PI) T.cap -= 6.2832; if (T.cap < -Math.PI) T.cap += 6.2832;
    }
    var v = CFG.vitesse * (T.phase === 'entree' ? 1.1 : 1);
    T.hx += Math.cos(T.cap) * v * dm; T.hy += Math.sin(T.cap) * v * dm;
    /* la coque de l'amiral repousse la tête (le blindage) */
    if (b && b.etat !== 'arrivee' && b.etat !== 'mort') for (var i = 0; i < b.coque.length; i++) {
      var c = b.coque[i], ex = T.hx - c.x, ey = T.hy - c.y, r = c.r + 3, q = ex * ex + ey * ey;
      if (q < r * r) {
        var l = Math.sqrt(q) || 1, nx = ex / l, ny = ey / l;
        T.hx = c.x + nx * r; T.hy = c.y + ny * r;
        var na = Math.atan2(ny, nx), dc = angDiff(T.cap, na);
        if (Math.abs(dc) > 1.2) T.cap = na + (dc > 0 ? 1.2 : -1.2);
        if (T.t - (T.etincT || 0) > 0.08) { T.etincT = T.t; for (var k = 0; k < 3; k++) frag(T.hx - nx * 2, T.hy - ny * 2, nx * 30 + (rnd() - 0.5) * 40, ny * 30 + (rnd() - 0.5) * 40, P.os, 0.25); }
      }
    }
    trainer();
    /* la traînée du personnage : rose pour elle, ambre pour lui */
    var qq = seg(T.nseg - 1), nb = T.f < 0.5 ? 0 : 1;
    T.silT = (T.silT || 0) + dm * 45;
    while (T.silT >= 1 && nb) { T.silT -= 1; T.sillage.push({ x: qq[0] + (rnd() - 0.5) * 3, y: qq[1] + (rnd() - 0.5) * 3, vx: (rnd() - 0.5) * 8 - Math.cos(T.cap) * 6, vy: (rnd() - 0.5) * 8 - Math.sin(T.cap) * 6, l: 0, d: 0.7 + rnd() * 0.5 }); }
    if (T.sillage.length > 90) T.sillage.splice(0, T.sillage.length - 90);
  }
  function tirer() {
    var a = T.cap, best = null, bs = CFG.assist, i, e, L = cibles();
    for (i = 0; i < L.length; i++) {
      e = L[i]; var dx = e.x - T.hx, dy = e.y - T.hy, dd = dx * dx + dy * dy;
      if (dd > CFG.assistPortee * CFG.assistPortee || dd < 16) continue;
      var da = Math.abs(angDiff(Math.atan2(dy, dx), T.cap)) - (e.k === 'faible' ? 0.3 : 0);
      if (da < bs) { bs = da; best = e; }
    }
    if (best) {
      var tt = Math.sqrt(d2(best.x, best.y, T.hx, T.hy)) / CFG.balle;
      a = Math.atan2(best.y + (best.vy || 0) * tt - T.hy, best.x + (best.vx || 0) * tt - T.hx);
    }
    T.balles.push({ x: T.hx + Math.cos(a) * 4, y: T.hy + Math.sin(a) * 4, vx: Math.cos(a) * CFG.balle, vy: Math.sin(a) * CFG.balle, t: 0 });
    T.compte.tirs++;
    if ((T.compte.tirs & 1) === 0) sfx('tir');
  }
  function couper(i, pourquoi) {
    if (i < 3) i = 3; if (i >= T.nseg) return;
    for (var k = i; k < T.nseg; k += 1) { var p = seg(k); frag(p[0], p[1], (rnd() - 0.5) * 40, (rnd() - 0.5) * 40, (k & 1) ? P.cyan : P.cyanP, 0.5 + rnd() * 0.4); }
    journal('coupe ' + pourquoi + ' -' + (T.nseg - i));
    T.nseg = i; T.compte.coupes++; if (pourquoi === 'morsure') T.compte.morsures++;
    T.trail.length = Math.min(T.trail.length, T.nseg * CFG.ecart + 2);
    T.hit = 0.25;
    sfx('coupe');
  }
  function mourir(pourquoi) {
    if (T.mort || T.invul > 0) return;
    T.morts++; T.mort = true; T.mortT = 0;
    for (var k = 0; k < T.nseg; k++) { var p = seg(k); frag(p[0], p[1], (rnd() - 0.5) * 60, (rnd() - 0.5) * 60, (k & 1) ? P.cyan : P.cyanP, 0.7 + rnd() * 0.6); }
    boum(T.hx, T.hy, 1, P.jaune);
    W.verrous.length = 0;
    if (W.phase === 'entree' || W.phase === 'visee') salve('mort');
    journal('mort ' + T.morts + ' ' + pourquoi);
    sfx('mort');
    T.hit = 0.6;
  }
  function renaitre() {
    T.mort = false; T.invul = CFG.invuln;
    var b = T.boss, x = T.cx, y = T.cy + T.H * 0.15, cap = -Math.PI / 2;
    if (b && T.phase === 'boss') { var dx = T.cx - b.x, dy = T.cy - b.y, l = Math.sqrt(dx * dx + dy * dy) || 1; x = b.x + dx / l * b.arene * 0.7; y = b.y + dy / l * b.arene * 0.7; cap = Math.atan2(-dy, -dx); }
    placerSerpent(x, y, cap);
    /* les menaces trop proches s'écartent */
    for (var i = T.EB.length - 1; i >= 0; i--) if (d2(T.EB[i].x, T.EB[i].y, x, y) < 60 * 60) T.EB.splice(i, 1);
    dire('ENCORE', 1.2);
    journal('renaissance');
  }

  /* ================================ les effets ================================ */
  function frag(x, y, vx, vy, c, l) { if (T.frags.length < 420) T.frags.push({ x: x, y: y, vx: vx, vy: vy, c: c, l: l, l0: l }); }
  /* taille : 0 petite, 1 moyenne, 2 grosse ; au plus deux grosses par seconde (les suivantes deviennent moyennes) */
  function boum(x, y, taille, c) {
    if (taille >= 2) {
      var n = 0; for (var i = 0; i < T.grosses.length; i++) if (T.t - T.grosses[i] < 1) n++;
      if (n >= 2) taille = 1; else { T.grosses.push(T.t); if (T.grosses.length > 6) T.grosses.shift(); }
    }
    var d = taille === 2 ? 1.1 : taille === 1 ? 0.55 : 0.3, r = taille === 2 ? 34 : taille === 1 ? 15 : 6;
    T.expl.push({ x: x, y: y, t: 0, d: d, r: r, taille: taille });
    var nf = taille === 2 ? 36 : taille === 1 ? 12 : 5;
    for (var k = 0; k < nf; k++) {
      var a = rnd() * 6.2832, v = (taille === 2 ? 30 : 15) + rnd() * (taille === 2 ? 90 : 40);
      frag(x, y, Math.cos(a) * v, Math.sin(a) * v, c !== undefined && k % 3 === 0 ? c : (k % 3 === 1 ? P.brasier : k % 3 === 2 ? P.jaune : P.ambre), 0.3 + rnd() * (taille === 2 ? 0.9 : 0.4));
    }
    if (taille === 2) { T.shake = Math.max(T.shake, 4); T.gel = Math.max(T.gel, 0.07); T.compte.grosses++; if (T.premiereExplosion < 0) T.premiereExplosion = +T.t.toFixed(2); sfx('boum'); }
    else if (taille === 1) { T.shake = Math.max(T.shake, 2); sfx('pop'); }
    else sfx('pop', 0.5);
  }
  function majEffets(dm, dt) {
    var i;
    for (i = T.expl.length - 1; i >= 0; i--) { var e = T.expl[i]; e.t += dm; if (e.t >= e.d) T.expl.splice(i, 1); }
    for (i = T.frags.length - 1; i >= 0; i--) {
      var f = T.frags[i]; f.l -= dm; if (f.l <= 0) { T.frags.splice(i, 1); continue; }
      f.x += f.vx * dm; f.y += f.vy * dm; f.vx *= (1 - dm * 1.2); f.vy *= (1 - dm * 1.2);
    }
    for (i = T.sillage.length - 1; i >= 0; i--) { var s = T.sillage[i]; s.l += dm; if (s.l >= s.d) { T.sillage.splice(i, 1); continue; } s.x += s.vx * dm; s.y += s.vy * dm; }
    if (T.shake > 0) T.shake = Math.max(0, T.shake - dt * 6);
    if (T.hit > 0) T.hit -= dt;
  }

  /* ================================ les ennemis ================================ */
  /* les formes, en unités (le nez vers +u) */
  var F_CHASSEUR = [5, 0, -3, 3.5, -1.5, 0, -3, -3.5];
  var F_COCKPIT = [2.5, 0, 0, 1, 0, -1];
  var F_ECLAIR = [6, 0, -4, 2.5, -2, 0, -4, -2.5];
  var F_FREGATE = [17, 0, 11, 4, -6, 6, -15, 5, -17, 2, -17, -2, -15, -5, -6, -6, 11, -4];
  var F_FREG_PONT = [6, 0, 2, 2.5, -8, 2.5, -10, 0, -8, -2.5, 2, -2.5];
  var F_CROISEUR = [26, 0, 18, 5, 4, 7, -12, 9, -24, 6, -26, 0, -24, -6, -12, -9, 4, -7, 18, -5];
  var F_PORTE = [30, 2, 22, 9, -20, 11, -32, 6, -32, -6, -20, -11, 22, -9, 30, -2];
  var ROCS = [];
  function rocsNeufs() {
    ROCS = [];
    for (var f = 0; f < 6; f++) { var p = []; for (var i = 0; i < 9; i++) { var a = i / 9 * 6.2832, r = 0.72 + rdv() * 0.38; p.push(Math.cos(a) * r, Math.sin(a) * r); } ROCS.push(p); }
  }
  /* un point juste hors de l'écran, plutôt du côté où va le serpent */
  function bordHors(marge) {
    var cote = Math.floor(rnd() * 4);
    if (rnd() < 0.5) { var c = Math.cos(T.cap), s = Math.sin(T.cap); cote = Math.abs(c) > Math.abs(s) ? (c > 0 ? 1 : 3) : (s > 0 ? 2 : 0); }
    var hw = T.W / 2 + marge, hh = T.H / 2 + marge, u = rnd() * 2 - 1;
    if (cote === 0) return { x: T.cx + u * hw, y: T.cy - hh, cote: 0 };
    if (cote === 1) return { x: T.cx + hw, y: T.cy + u * hh, cote: 1 };
    if (cote === 2) return { x: T.cx + u * hw, y: T.cy + hh, cote: 2 };
    return { x: T.cx - hw, y: T.cy + u * hh, cote: 3 };
  }
  function vagueChasseurs(n, x, y) {
    var p = x === undefined ? bordHors(14) : { x: x, y: y };
    var a = Math.atan2(T.hy - p.y, T.hx - p.x);
    for (var i = 0; i < n; i++) {
      var o = (i - (n - 1) / 2) * 12;
      T.E.push({ k: 'chasseur', x: p.x - Math.sin(a) * o - Math.cos(a) * Math.abs(o) * 0.6, y: p.y + Math.cos(a) * o - Math.sin(a) * Math.abs(o) * 0.6,
        a: a, v: 92, vx: 0, vy: 0, r: 4, pv: 1, t: 0, tirT: 1.5 + rnd() * 2, tel: 0, libre: 0 });
    }
    journal('chasseurs ' + n);
  }
  function lancerEscadrille(raison, cote) {
    var n = raison === 'amiral' ? 6 : 7, hw = T.W / 2 + 30, hh = T.H / 2 + 30, x, y;
    if (cote === 0) { x = T.cx; y = T.cy - hh; } else if (cote === 1) { x = T.cx + hw; y = T.cy; } else if (cote === 2) { x = T.cx; y = T.cy + hh; } else { x = T.cx - hw; y = T.cy; }
    var a = Math.atan2(T.hy - y, T.hx - x);
    for (var i = 0; i < n; i++) {
      var r = Math.ceil(i / 2), sgn = (i & 1) ? 1 : -1, o = r * sgn;
      T.E.push({ k: 'eclair', x: x - Math.cos(a) * r * 10 - Math.sin(a) * o * 9, y: y - Math.sin(a) * r * 10 + Math.cos(a) * o * 9,
        a: a, v: 300, vx: 0, vy: 0, r: 4, pv: 1, t: 0, passes: 0, cx: T.hx + (rnd() - 0.5) * 30, cy: T.hy + (rnd() - 0.5) * 30, hist: [] });
    }
    journal('escadrille ' + raison + ' ' + n);
  }
  function lancerRoc(gros) {
    var p = bordHors(20), r = gros ? 7 + rnd() * 7 : 3 + rnd() * 4, a = Math.atan2(T.cy - p.y, T.cx - p.x) + (rnd() - 0.5) * 0.9, v = 18 + rnd() * 26;
    T.E.push({ k: 'roc', x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: r, a: rnd() * 6.28, va: (rnd() - 0.5) * 1.6, pv: Math.ceil(r / 4), forme: Math.floor(rnd() * ROCS.length) });
  }
  function lancerEpave() {
    var p = bordHors(16), a = Math.atan2(T.cy - p.y, T.cx - p.x) + (rnd() - 0.5) * 0.7, v = 55 + rnd() * 40;
    T.E.push({ k: 'epave', x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 4, l: 5 + rnd() * 6, a: rnd() * 6.28, va: (rnd() - 0.5) * 6, pv: 1 });
  }
  function lancerCellule() {
    var a = T.cap + (rnd() - 0.5) * 2.2, d = Math.min(T.W, T.H) * (0.35 + rnd() * 0.3);
    T.cellules.push({ x: T.hx + Math.cos(a) * d, y: T.hy + Math.sin(a) * d, t: rnd() * 3 });
  }
  /* le plan profond : des silhouettes qui croisent, à la parallaxe 0,5, deux fois plus petites */
  var PARA_P = 0.5;
  function lancerProfond() {
    var paysage = T.W >= T.H, dir = rnd() < 0.5 ? 1 : -1, type = rnd() < 0.3 ? 'porte' : rnd() < 0.6 ? 'croiseur' : 'escorteur';
    var qx, qy, vx, vy, mx = T.W / 2 + 40, my = T.H / 2 + 40, bx = T.cx * PARA_P, by = T.cy * PARA_P;
    if (paysage) { qx = bx - dir * mx; qy = by + (rnd() - 0.5) * T.H * 0.8; vx = dir * (14 + rnd() * 10); vy = (rnd() - 0.5) * 5; }
    else { qy = by - dir * my; qx = bx + (rnd() - 0.5) * T.W * 0.8; vy = dir * (14 + rnd() * 10); vx = (rnd() - 0.5) * 5; }
    T.prof.push({ type: type, qx: qx, qy: qy, vx: vx, vy: vy, a: Math.atan2(vy, vx), t: rnd() * 5, obus: 2 + rnd() * 3, z: 0 });
  }
  function echType(t) { return t === 'porte' ? 1.5 : t === 'croiseur' ? 1.2 : 1; }
  function formeType(t) { return t === 'porte' ? F_PORTE : t === 'croiseur' ? F_CROISEUR : F_FREGATE; }
  function profEcran(s) { return { x: T.W / 2 + s.qx - T.cx * PARA_P, y: T.H / 2 + s.qy - T.cy * PARA_P }; }
  function lancerObus() {
    var vu = [];
    for (var i = 0; i < T.prof.length; i++) { var e = profEcran(T.prof[i]); if (e.x > 0 && e.x < T.W && e.y > 0 && e.y < T.H) vu.push(T.prof[i]); }
    if (!vu.length) return;
    var s = vu[Math.floor(rnd() * vu.length)], av = 1.3 * CFG.vitesse * 0.8;
    T.obus.push({ x: T.hx + Math.cos(T.cap) * av + (rnd() - 0.5) * 24, y: T.hy + Math.sin(T.cap) * av + (rnd() - 0.5) * 24, t: 0, d: 1.35, src: s });
    T.compte.obus++; sfx('obus');
  }
  /* la descente : les silhouettes du fond deviennent des frégates de notre plan */
  function commencerDescente() {
    T.descT = 0;
    while (T.prof.length < 4) lancerProfond();
    for (var i = 0; i < T.prof.length; i++) {
      var s = T.prof[i], e = profEcran(s);
      if (e.x < -60 || e.x > T.W + 60 || e.y < -60 || e.y > T.H + 60) { s.qx = T.cx * PARA_P + (rnd() - 0.5) * T.W * 0.8; s.qy = T.cy * PARA_P + (rnd() - 0.5) * T.H * 0.8; e = profEcran(s); }
      /* la place sur notre plan : la même à l'écran au début de la descente, un peu écartée du centre */
      s.wx = T.cx + (e.x - T.W / 2) * 1.15; s.wy = T.cy + (e.y - T.H / 2) * 1.15;
      if (d2(s.wx, s.wy, T.hx, T.hy) < 50 * 50) { s.wx += (s.wx - T.hx) * 0.8 + 40; s.wy += (s.wy - T.hy) * 0.8; }
    }
    journal('descente');
  }
  function finirDescente() {
    for (var i = 0; i < T.prof.length; i++) {
      var s = T.prof[i];
      var ech = echType(s.type);
      T.E.push({ k: 'fregate', x: s.wx, y: s.wy, a: s.a, vx: s.vx * 0.8, vy: s.vy * 0.8, r: Math.round(9 * ech), pv: Math.round(8 * ech), t: 0, tirT: 1.2 + i * 1.1, type: s.type, ech: ech, pts: formeType(s.type) });
    }
    T.prof.length = 0; T.descT = -1;
    journal('plan de combat');
  }
  function lancerFregate() {
    var p = bordHors(30), a = Math.atan2(T.cy - p.y, T.cx - p.x) + (rnd() - 0.5) * 0.5, v = 16;
    T.E.push({ k: 'fregate', x: p.x, y: p.y, a: a, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 9, pv: 8, t: 0, tirT: 2 + rnd() * 2, type: 'escorteur', ech: 1, pts: F_FREGATE });
  }
  /* un rayon : depuis un point (suivi d'une source), télégraphe pointillé, puis le trait ; il tue la tête, coupe le corps */
  function rayon(src, a, longueur, tel, act, largeur, balaye) {
    T.rayons.push({ src: src, a: a, l: longueur, tel: tel, act: act, w: largeur || 3, t: 0, balaye: balaye || 0, x: src.x, y: src.y, son: false });
    sfx('rayon');
  }
  function tirEnnemi(x, y, a, v) { T.EB.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 }); }
  function anneauBalles(x, y, n, v, a0) { for (var i = 0; i < n; i++) tirEnnemi(x, y, a0 + i / n * 6.2832, v); }

  function majEnnemis(dm) {
    var i, e, lim = Math.max(T.W, T.H) * 1.25;
    for (i = T.E.length - 1; i >= 0; i--) {
      e = T.E[i]; e.t += dm;
      if (e.k === 'chasseur') {
        var want = Math.atan2(T.hy - e.y, T.hx - e.x), dd = d2(e.x, e.y, T.hx, T.hy);
        if (!e.cote) e.cote = rnd() < 0.5 ? -1 : 1;
        var px2 = T.hx - Math.sin(want) * 46 * e.cote, py2 = T.hy + Math.cos(want) * 46 * e.cote;
        if (dd < 60 * 60 && e.libre <= 0) { e.libre = 1.3; e.cote = -e.cote; }
        if (e.libre > 0) e.libre -= dm; else { var dA = angDiff(Math.atan2(py2 - e.y, px2 - e.x), e.a), m = 2.0 * dm; e.a += clamp(dA, -m, m); }
        e.vx = Math.cos(e.a) * e.v; e.vy = Math.sin(e.a) * e.v; e.x += e.vx * dm; e.y += e.vy * dm;
        e.tirT -= dm;
        if (e.tirT <= 0.35 && e.tel <= 0 && dd < 170 * 170) e.tel = 0.35;
        if (e.tel > 0) { e.tel -= dm; if (e.tel <= 0) { tirEnnemi(e.x, e.y, want, 82); e.tirT = 2.4 + rnd() * 1.5; } }
        if (e.tirT < -1) e.tirT = 2;
      } else if (e.k === 'eclair') {
        var cx = e.cx, cy = e.cy, wa = Math.atan2(cy - e.y, cx - e.x), dc = d2(e.x, e.y, cx, cy);
        if (e.passes < 3) {
          var dA2 = angDiff(wa, e.a), m2 = 2.1 * dm; e.a += clamp(dA2, -m2, m2);
          if (dc < 26 * 26 || (Math.abs(dA2) > 1.6 && dc < 90 * 90)) { e.passes++; e.cx = T.hx + (rnd() - 0.5) * 40; e.cy = T.hy + (rnd() - 0.5) * 40; }
        }
        e.vx = Math.cos(e.a) * e.v; e.vy = Math.sin(e.a) * e.v; e.x += e.vx * dm; e.y += e.vy * dm;
        e.hist.push(e.x, e.y); if (e.hist.length > 12) e.hist.splice(0, 2);
        if (e.passes >= 3 && d2(e.x, e.y, T.cx, T.cy) > lim * lim) { T.E.splice(i, 1); continue; }
      } else if (e.k === 'roc' || e.k === 'epave') {
        e.x += e.vx * dm; e.y += e.vy * dm; e.a += e.va * dm;
      } else if (e.k === 'fregate') {
        /* elle croise, et revient vers la tête si elle s'éloigne trop */
        var dist = Math.sqrt(d2(e.x, e.y, T.hx, T.hy));
        if (dist > Math.max(T.W, T.H) * 0.6) { var wa2 = Math.atan2(T.hy - e.y, T.hx - e.x); e.vx += Math.cos(wa2) * 10 * dm; e.vy += Math.sin(wa2) * 10 * dm; }
        var sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy); if (sp > 22) { e.vx *= 22 / sp; e.vy *= 22 / sp; }
        e.x += e.vx * dm; e.y += e.vy * dm;
        if (sp > 2) { var dA3 = angDiff(Math.atan2(e.vy, e.vx), e.a); e.a += clamp(dA3, -0.6 * dm, 0.6 * dm); }
        e.tirT -= dm;
        if (e.tirT <= 0 && dist < Math.max(T.W, T.H) * 0.7) {
          e.tirT = 4.2 + rnd() * 1.5;
          var ax = T.hx + Math.cos(T.cap) * 20, ay = T.hy + Math.sin(T.cap) * 20;
          rayon(e, Math.atan2(ay - e.y, ax - e.x), Math.max(T.W, T.H) * 0.9, 1.0, 0.32, 3);
        }
      }
      if (e.k !== 'fregate' && e.k !== 'eclair' && d2(e.x, e.y, T.cx, T.cy) > lim * lim * 1.6) T.E.splice(i, 1);
      else if (e.k === 'fregate' && d2(e.x, e.y, T.cx, T.cy) > lim * lim * 4) T.E.splice(i, 1);
    }
    for (i = T.EB.length - 1; i >= 0; i--) { var b = T.EB[i]; b.t += dm; b.x += b.vx * dm; b.y += b.vy * dm; if (b.t > 6) T.EB.splice(i, 1); }
    for (i = T.obus.length - 1; i >= 0; i--) {
      var o = T.obus[i]; o.t += dm;
      if (o.t >= o.d) { T.obus.splice(i, 1); boum(o.x, o.y, 1, P.magenta); toucheZone(o.x, o.y, 13, 'obus'); }
    }
    for (i = T.rayons.length - 1; i >= 0; i--) {
      var r = T.rayons[i]; r.t += dm;
      if (r.src) { if (r.src.mort) { T.rayons.splice(i, 1); continue; } r.x = r.src.x; r.y = r.src.y; }
      if (r.t >= r.tel && !r.son) { r.son = true; sfx('tirRayon'); }
      if (r.t >= r.tel && r.balaye) r.a += r.balaye * dm;
      if (r.t >= r.tel + r.act) T.rayons.splice(i, 1);
    }
    for (i = T.prof.length - 1; i >= 0; i--) {
      var s = T.prof[i]; s.qx += s.vx * dm; s.qy += s.vy * dm; s.t += dm;
      if (T.descT < 0) { var pe = profEcran(s); if (pe.x < -120 || pe.x > T.W + 120 || pe.y < -120 || pe.y > T.H + 120) T.prof.splice(i, 1); }
      else { s.wx += s.vx * 0.8 * dm; s.wy += s.vy * 0.8 * dm; }
    }
    for (i = T.cellules.length - 1; i >= 0; i--) { var c = T.cellules[i]; c.t += dm; if (d2(c.x, c.y, T.cx, T.cy) > lim * lim * 2.5) T.cellules.splice(i, 1); }
    /* les missiles du warp, dans le temps du monde */
    var M = CFG.missile;
    for (i = T.mis.length - 1; i >= 0; i--) {
      var q = T.mis[i];
      if (!vivant(q.e)) {
        q.e = null; var L = cibles(), bd = 90 * 90;
        for (var k = 0; k < L.length; k++) { var dk = d2(q.x, q.y, L[k].x, L[k].y); if (dk < bd) { bd = dk; q.e = L[k]; } }
      }
      if (q.e) { var da = angDiff(Math.atan2(q.e.y - q.y, q.e.x - q.x), q.a), mm = M.virage * dm; q.a += clamp(da, -mm, mm); }
      q.v = Math.min(M.vmax, q.v + M.accel * dm);
      q.tr.push(q.x, q.y); if (q.tr.length > 16) q.tr.splice(0, 2);
      q.x += Math.cos(q.a) * q.v * dm; q.y += Math.sin(q.a) * q.v * dm; q.vie -= dm;
      if (q.e && d2(q.x, q.y, q.e.x, q.e.y) < (q.e.r + 3) * (q.e.r + 3)) {
        T.compte.touchesMissile++;
        frapper(q.e, M.degats, 'missile'); boum(q.x, q.y, 0, P.os);
        T.mis.splice(i, 1); continue;
      }
      if (q.vie <= 0) { frag(q.x, q.y, 0, 0, P.ambre, 0.3); T.mis.splice(i, 1); }
    }
  }
  /* un coup porté : ennemis ou points faibles ; renvoie vrai si la cible meurt */
  function frapper(e, dmg, src) {
    if (!e || e.mort) return false;
    if (e.k === 'faible') return frapperFaible(e, dmg, src);
    e.pv -= dmg; e.flash = 0.08;
    if (e.pv > 0) { if (e.k === 'fregate') sfx('touche'); return false; }
    e.mort = true;
    var idx = T.E.indexOf(e); if (idx >= 0) T.E.splice(idx, 1);
    T.compte.tues++; T.score += PTS[e.k] || 10;
    if (e.k === 'roc') {
      T.compte.rocs++;
      if (e.r >= 7) for (var k = 0; k < 2; k++) {
        var a = rnd() * 6.28, r2 = e.r * 0.6;
        T.E.push({ k: 'roc', x: e.x + Math.cos(a) * r2, y: e.y + Math.sin(a) * r2, vx: e.vx + Math.cos(a) * 20, vy: e.vy + Math.sin(a) * 20, r: r2, a: a, va: (rnd() - 0.5) * 3, pv: Math.ceil(r2 / 4), forme: Math.floor(rnd() * ROCS.length) });
      }
      for (var j = 0; j < 6; j++) frag(e.x, e.y, (rnd() - 0.5) * 50, (rnd() - 0.5) * 50, j & 1 ? P.acier : P.ardoise, 0.5);
      sfx('pop', 0.6);
    } else boum(e.x, e.y, e.k === 'fregate' ? 2 : 0, P.magenta);
    return true;
  }
  /* une zone (obus, souffle) : la tête dedans meurt, le corps dedans est coupé */
  function toucheZone(x, y, r, pourquoi) {
    if (T.mort) return;
    if (d2(x, y, T.hx, T.hy) < (r + 2) * (r + 2)) { if (T.invul <= 0) mourir(pourquoi); return; }
    if (T.invul > 0) return;
    for (var k = 3; k < T.nseg; k++) { var p = seg(k); if (d2(x, y, p[0], p[1]) < r * r) { couper(k, pourquoi); return; } }
  }
  function premierSegment(x, y, r) {
    for (var k = 2; k < T.nseg; k++) { var p = seg(k); if (d2(x, y, p[0], p[1]) < r * r) return Math.max(3, k); }
    return 0;
  }
  function collisions() {
    var i, k, e, b;
    /* nos tirs */
    for (i = T.balles.length - 1; i >= 0; i--) {
      b = T.balles[i]; var fini = false;
      for (k = T.E.length - 1; k >= 0 && !fini; k--) {
        e = T.E[k];
        if (e.k === 'fregate') {
          var ca = Math.cos(e.a), sa = Math.sin(e.a), lu = (b.x - e.x) * ca + (b.y - e.y) * sa, lv = -(b.x - e.x) * sa + (b.y - e.y) * ca;
          if (Math.abs(lu) < e.pts[0] * e.ech && Math.abs(lv) < 6 * e.ech) { frapper(e, 1, 'tir'); fini = true; frag(b.x, b.y, -b.vx * 0.1, -b.vy * 0.1, P.os, 0.15); }
        } else if (d2(b.x, b.y, e.x, e.y) < (e.r + 1.5) * (e.r + 1.5)) { frapper(e, 1, 'tir'); fini = true; }
      }
      if (!fini && T.boss) fini = balleBoss(b);
      if (fini) T.balles.splice(i, 1);
    }
    if (T.mort) return;
    /* manger */
    for (i = T.cellules.length - 1; i >= 0; i--) {
      var c = T.cellules[i];
      if (d2(c.x, c.y, T.hx, T.hy) < 7 * 7) {
        T.cellules.splice(i, 1); T.score += PTS.cellule; T.compte.mange++; T.nseg = Math.min(CFG.longueurMax, T.nseg + 2);
        for (k = 0; k < 6; k++) frag(c.x, c.y, Math.cos(k * 1.05) * 26, Math.sin(k * 1.05) * 26, k & 1 ? P.jaune : P.ambre, 0.35);
        sfx('mange');
      }
    }
    /* se mordre coupe */
    for (k = CFG.mordDes; k < T.nseg; k++) { var p = seg(k); if (d2(p[0], p[1], T.hx, T.hy) < 2.5 * 2.5) { couper(k, 'morsure'); break; } }
    if (T.invul > 0) return;
    /* les menaces : la tête touchée meurt, le corps touché est coupé */
    for (i = T.E.length - 1; i >= 0; i--) {
      e = T.E[i];
      var r = e.k === 'epave' ? e.l * 0.5 : e.r;
      if (e.k === 'fregate') {
        var ca2 = Math.cos(e.a), sa2 = Math.sin(e.a), hu = (T.hx - e.x) * ca2 + (T.hy - e.y) * sa2, hv = -(T.hx - e.x) * sa2 + (T.hy - e.y) * ca2;
        if (Math.abs(hu) < e.pts[0] * e.ech + 1 && Math.abs(hv) < 6 * e.ech + 1) { mourir('fregate'); return; }
        for (k = 2; k < T.nseg; k += 2) {
          var q = seg(k), qu = (q[0] - e.x) * ca2 + (q[1] - e.y) * sa2, qv = -(q[0] - e.x) * sa2 + (q[1] - e.y) * ca2;
          if (Math.abs(qu) < e.pts[0] * e.ech && Math.abs(qv) < 6 * e.ech) { couper(Math.max(3, k), 'fregate'); break; }
        }
        continue;
      }
      if (d2(e.x, e.y, T.hx, T.hy) < (r + 2.5) * (r + 2.5)) { var nom = e.k; if (e.k !== 'roc') frapper(e, 99, 'choc'); mourir(nom); return; }
      var cs = premierSegment(e.x, e.y, r + 2);
      if (cs) { couper(cs, e.k); if (e.k !== 'roc') frapper(e, 99, 'choc'); }
    }
    for (i = T.EB.length - 1; i >= 0; i--) {
      b = T.EB[i];
      if (d2(b.x, b.y, T.hx, T.hy) < 4.5 * 4.5) { T.EB.splice(i, 1); mourir('balle'); return; }
      var cb = premierSegment(b.x, b.y, 3.2); if (cb) { T.EB.splice(i, 1); couper(cb, 'balle'); }
    }
    for (i = 0; i < T.rayons.length; i++) {
      var ry = T.rayons[i]; if (ry.t < ry.tel) continue;
      var x1 = ry.x + Math.cos(ry.a) * ry.l, y1 = ry.y + Math.sin(ry.a) * ry.l, w = ry.w * 0.5 + 2;
      if (segD2(T.hx, T.hy, ry.x, ry.y, x1, y1) < w * w) { mourir('rayon'); return; }
      for (k = 3; k < T.nseg; k += 1) { var s = seg(k); if (segD2(s[0], s[1], ry.x, ry.y, x1, y1) < (w - 1) * (w - 1)) { couper(k, 'rayon'); break; } }
    }
  }

  /* ================================ le vaisseau amiral ================================ */
  /* la coque, en morceaux (unités : u le long de l'axe, de -1 à 1 ; v en travers, de -1 à 1) */
  var COQUE = [
    { nom: 'proue', p: [1, 0, 0.7, 0.2, 0.3, 0.3, 0.3, -0.3, 0.7, -0.2] },
    { nom: 'centre', p: [0.3, 0.3, -0.05, 0.46, -0.32, 0.46, -0.32, -0.46, -0.05, -0.46, 0.3, -0.3] },
    { nom: 'babord', p: [0.05, 0.42, -0.2, 0.86, -0.62, 0.98, -0.78, 0.72, -0.62, 0.4, -0.3, 0.38] },
    { nom: 'tribord', p: [0.05, -0.42, -0.3, -0.38, -0.62, -0.4, -0.78, -0.72, -0.62, -0.98, -0.2, -0.86] },
    { nom: 'poupe', p: [-0.3, 0.42, -0.72, 0.4, -0.95, 0.24, -1, 0, -0.95, -0.24, -0.72, -0.4, -0.3, -0.42] }
  ];
  var PONT = [-0.42, 0.12, -0.42, -0.12, -0.6, -0.16, -0.68, 0, -0.6, 0.16];
  var EPINE = [0.85, 0, 0.5, 0.06, -0.5, 0.08, -0.85, 0.05, -0.85, -0.05, -0.5, -0.08, 0.5, -0.06];
  var COQUE_CERCLES = [[0.78, 0, 0.22], [0.45, 0, 0.3], [0.1, 0, 0.44], [-0.25, 0, 0.44], [-0.6, 0, 0.42], [-0.86, 0, 0.26], [-0.4, 0.6, 0.2], [-0.4, -0.6, 0.2]];
  var FAIBLES = [
    { type: 'canon', u: 0.5, v: 0.3, nom: 'CANON' }, { type: 'canon', u: 0.5, v: -0.3, nom: 'CANON' },
    { type: 'hangar', u: -0.56, v: 0.84, nom: 'HANGAR' }, { type: 'reacteur', u: -0.56, v: -0.84, nom: 'RÉACTEUR' }
  ];
  function lancerBoss() {
    var paysage = T.W >= T.H, L = Math.round(Math.max(T.W, T.H) * 1.18), Wd = Math.round(L * (paysage ? 0.3 : 0.34));
    var cx = T.hx, cy = T.hy - (T.H * 0.5 + Wd * 0.45 + 30);
    var b = { x: cx, y: cy, xF: cx, yF: cy, x0: cx, y0: cy - Wd * 0.6, a: paysage ? 0 : -Math.PI / 2, va: 0, L: L, Wd: Wd, s: 1.35, etat: 'arrivee', t: 0, pt: 0,
      arene: L * 0.5 + Math.min(T.W, T.H) * 0.55, parts: [], coque: [], morceaux: [], aide: 1, attT: 2, attN: 0, escorte: 0, fissures: [], chaine: [],
      rayonT: 3, anneauT: 2, tour: 0, details: [] };
    /* les superstructures : des blocs posés sur l'épine et les nacelles, tirés au décor */
    for (var g = 0; g < 46; g++) {
      var gu = -0.85 + rdv() * 1.6, gv = (rdv() - 0.5) * (gu > 0.3 ? 0.35 : gu < -0.3 && gu > -0.75 ? 1.4 : 0.75);
      b.details.push({ u: gu, v: gv, w: 0.03 + rdv() * 0.06, h: 0.05 + rdv() * 0.12, c: rdv() < 0.25 ? 1 : 0, m: Math.abs(gv) > 0.5 ? 2 : (gu < -0.3 ? 4 : gu > 0.3 ? 0 : 1) });
    }
    for (var i = 0; i < FAIBLES.length; i++) {
      var f = FAIBLES[i];
      b.parts.push({ k: 'faible', type: f.type, nom: f.nom, u: f.u, v: f.v, x: cx, y: cy, r: 9, pv: CFG.boss.pvFaible, pvMax: CFG.boss.pvFaible, mort: false, actif: true, flash: 0, tel: 0, t: rnd() * 2, cd: 2.5 + i * 0.9 });
    }
    b.coeur = { k: 'faible', type: 'coeur', nom: 'CŒUR', u: -0.06, v: 0, x: cx, y: cy, r: 12, pv: CFG.boss.pvCoeur, pvMax: CFG.boss.pvCoeur, mort: false, actif: false, flash: 0, tel: 0, t: 0, cd: 3 };
    b.parts.push(b.coeur);
    for (i = 0; i < COQUE.length; i++) b.morceaux.push({ dx: 0, dy: 0, da: 0, vx: 0, vy: 0, va: 0 });
    for (i = 0; i < COQUE_CERCLES.length; i++) b.coque.push({ x: 0, y: 0, r: 0 });
    T.boss = b; T.phase = 'boss'; T.pt = 0; T.sec = 6;
    /* l'arène se vide */
    for (i = T.E.length - 1; i >= 0; i--) { var ei = T.E[i]; if (ei.k === 'fregate' || ei.k === 'chasseur') boum(ei.x, ei.y, ei.k === 'fregate' ? 1 : 0, P.magenta); T.E.splice(i, 1); }
    T.obus.length = 0;
    placerBoss(b);
    dire('LE VAISSEAU AMIRAL', 3.2, 'IL DESCEND DU PLAN HAUT');
    marquer('boss'); journal('amiral');
    jouerAmiral();
  }
  function local(b, u, v, s) { var hl = b.L * 0.5 * s, hw = b.Wd * 0.5 * s, ca = Math.cos(b.a), sa = Math.sin(b.a); return { x: b.x + u * hl * ca - v * hw * sa, y: b.y + u * hl * sa + v * hw * ca }; }
  function placerBoss(b) {
    var i, q;
    for (i = 0; i < b.parts.length; i++) { q = local(b, b.parts[i].u, b.parts[i].v, b.s); b.parts[i].x = q.x; b.parts[i].y = q.y; }
    for (i = 0; i < COQUE_CERCLES.length; i++) { var c = COQUE_CERCLES[i]; q = local(b, c[0], c[1], b.s); b.coque[i].x = q.x; b.coque[i].y = q.y; b.coque[i].r = c[2] * b.Wd * 0.5 * b.s; }
  }
  function frapperFaible(p, dmg, src) {
    var b = T.boss; if (!b || !p.actif || p.mort) return false;
    var mult = (1 + 0.2 * Math.min(4, T.morts)) * b.aide;
    p.pv -= dmg * mult; p.flash = 0.07; T.score += 10;
    if (src !== 'missile' && (T.compte.tirs % 3 === 0)) sfx('touche');
    if (p.pv > 0) return false;
    p.mort = true; p.actif = false;
    boum(p.x, p.y, 2, P.jaune);
    for (var k = 0; k < 16; k++) frag(p.x, p.y, (rnd() - 0.5) * 120, (rnd() - 0.5) * 120, k % 2 ? P.acier : P.brasier, 0.6 + rnd() * 0.6);
    if (p.type === 'coeur') { T.score += PTS.coeur; mortBoss(); return true; }
    T.score += PTS.faible; T.compte.faibles++;
    sfx('faible');
    var reste = 0; for (var i = 0; i < 4; i++) if (!b.parts[i].mort) reste++;
    journal('point faible ' + p.type + ' (reste ' + reste + ')');
    if (reste === 0) { b.etat = 'transition'; b.pt = 0; T.rayons.length = 0; T.EB.length = 0; dire("IL S'OUVRE", 2.6, 'LE CŒUR'); marquer('transition'); journal('amiral transition'); }
    else dire(p.nom + ' DÉTRUIT', 1.4, reste + (reste > 1 ? ' RESTANTS' : ' RESTANT'));
    return true;
  }
  function balleBoss(bl) {
    var b = T.boss; if (!b || b.etat === 'arrivee' || b.etat === 'mort') return false;
    for (var i = 0; i < b.parts.length; i++) {
      var p = b.parts[i]; if (!p.actif || p.mort) continue;
      if (d2(bl.x, bl.y, p.x, p.y) < (p.r + 1.5) * (p.r + 1.5)) { frapper(p, 1, 'tir'); frag(bl.x, bl.y, -bl.vx * 0.1, -bl.vy * 0.1, P.os, 0.12); return true; }
    }
    for (i = 0; i < b.coque.length; i++) {
      if (b.etat === 'p2' && (i === 2 || i === 3)) continue;        // les plaques du centre ont sauté : le cœur est à nu
      var c = b.coque[i];
      if (d2(bl.x, bl.y, c.x, c.y) < c.r * c.r) { frag(bl.x, bl.y, -bl.vx * 0.15 + (rnd() - 0.5) * 30, -bl.vy * 0.15 + (rnd() - 0.5) * 30, P.acier, 0.18); return true; }
    }
    return false;
  }
  function majBoss(dm, dt) {
    var b = T.boss; if (!b) return;
    b.t += dm; b.pt += dm;
    var C = CFG.boss, i, p;
    if (b.etat === 'arrivee') {
      /* il descend du plan haut : d'abord son ombre sur notre plan, puis lui, plus grand, qui se pose */
      var q = lisse(clamp((b.pt - 1.2) / (C.arrivee - 1.2), 0, 1));
      b.x = b.x0 + (b.xF - b.x0) * q; b.y = b.y0 + (b.yF - b.y0) * q;
      b.s = 1.35 - 0.35 * lisse(clamp((b.pt - 1.6) / (C.arrivee - 1.6), 0, 1));
      if (b.pt >= C.arrivee) { b.etat = 'p1'; b.pt = 0; b.s = 1; b.x = b.xF; b.y = b.yF; dire('DÉTRUIS SES POINTS FAIBLES', 2.4); journal('amiral p1'); marquer('p1'); }
    } else if (b.etat === 'p1') {
      if (b.pt > C.aide) b.aide = 1.5; if (b.pt > C.aide + 10) b.aide = 2.2;
      for (i = 0; i < 4; i++) {
        p = b.parts[i]; if (p.mort) continue;
        p.t += dm; if (p.flash > 0) p.flash -= dm; p.cd -= dm;
        if (p.type === 'canon' && p.cd <= 0) {
          p.cd = 4.2 + rnd() * 1.2;
          var ax = T.hx + Math.cos(T.cap) * 16, ay = T.hy + Math.sin(T.cap) * 16;
          rayon(p, Math.atan2(ay - p.y, ax - p.x), Math.max(T.W, T.H), 1.05, 0.3, 4);
        } else if (p.type === 'hangar' && p.cd <= 0) {
          p.cd = 6.5; p.tel = 0.6;
        } else if (p.type === 'reacteur' && p.cd <= 0) {
          p.cd = 3.6; p.tel = 0.7;
        }
        if (p.tel > 0) {
          p.tel -= dm;
          if (p.tel <= 0) {
            if (p.type === 'hangar') { var cE = 0; for (var k = 0; k < T.E.length; k++) if (T.E[k].k === 'chasseur') cE++; if (cE < 6) vagueChasseurs(3, p.x, p.y); }
            else anneauBalles(p.x, p.y, 10, 52, b.t);
          }
        }
      }
      /* une frégate d'escorte de temps en temps, pour garder la pression */
    } else if (b.etat === 'transition') {
      b.coeur.flash = 0.05;
      if (b.pt < 1.6 && T.t - (b.eclT || 0) > 0.2) { b.eclT = T.t; var pp = pointCoque(b); boum(pp.x, pp.y, 1, P.brasier); T.shake = Math.max(T.shake, 2); }
      if (b.pt >= C.transition) {
        b.etat = 'p2'; b.pt = 0; b.coeur.actif = true; b.va = 0.1; b.rayonT = 2.5; b.anneauT = 1.2; b.escorte = 1;
        journal('amiral p2'); marquer('p2'); dire('LE CŒUR', 1.6);
      }
    } else if (b.etat === 'p2') {
      if (b.pt > 10) b.aide = 1.8; if (b.pt > 18) b.aide = 3;
      var co = b.coeur; co.t += dm; if (co.flash > 0) co.flash -= dm;
      b.a += b.va * dm;
      if (b.escorte === 1 && b.pt > 1.0) { b.escorte = 2; annoncer('amiral', T.W >= T.H ? 1 : 0); }
      if (b.escorte === 2 && b.pt > 18 && W.phase === 'repos') { b.escorte = 3; annoncer('amiral', T.W >= T.H ? 3 : 2); }
      b.rayonT -= dm;
      if (b.rayonT <= 0) {
        b.rayonT = 7.5; b.tour++;
        var a0 = Math.atan2(T.hy - co.y, T.hx - co.x) - (b.tour & 1 ? 0.9 : -0.9);
        rayon(co, a0, b.L * 0.95, 1.25, 2.3, 5, (b.tour & 1) ? 0.75 : -0.75);
      }
      b.anneauT -= dm;
      if (b.anneauT <= 0) { b.anneauT = 2.8; co.tel = 0.5; }
      if (co.tel > 0) { co.tel -= dm; if (co.tel <= 0) anneauBalles(co.x, co.y, 14, 50, b.t * 0.7); }
      b.attT -= dm; if (b.attT <= 0) { b.attT = 8; vagueChasseurs(2, co.x, co.y); }
    } else if (b.etat === 'mort') {
      majMortBoss(dm, dt);
    }
    placerBoss(b);
  }
  function pointCoque(b) {
    var m = COQUE[Math.floor(rnd() * COQUE.length)].p, n = m.length >> 1, i = Math.floor(rnd() * n), j = (i + 1 + Math.floor(rnd() * (n - 1))) % n, u = rnd();
    return local(b, (m[2 * i] + (m[2 * j] - m[2 * i]) * u) * 0.85, (m[2 * i + 1] + (m[2 * j + 1] - m[2 * i + 1]) * u) * 0.85, b.s);
  }
  /* la mort : une chaîne d'explosions sur la coque, des fissures, puis la détonation du cœur ; les morceaux s'écartent */
  function mortBoss() {
    var b = T.boss; b.etat = 'mort'; b.pt = 0; b.va *= 0.3;
    T.rayons.length = 0; T.EB.length = 0; T.obus.length = 0;
    W.verrous.length = 0; if (W.phase === 'annonce') { W.phase = 'repos'; }
    for (var i = 0; i < 22; i++) b.chaine.push({ at: 0.15 + i * 0.13 + rnd() * 0.08, fait: false });
    for (i = 0; i < 9; i++) { var a = rnd() * 6.28; b.fissures.push({ a: a, l: 0, v: 0.5 + rnd() * 0.6, u0: -0.06, v0: 0 }); }
    T.phase = 'explosion'; T.pt = 0; T.invul = 99;
    dire('', 0); marquer('explosion'); journal('amiral abattu');
  }
  function majMortBoss(dm, dt) {
    var b = T.boss, i;
    for (i = 0; i < b.chaine.length; i++) {
      var c = b.chaine[i]; if (c.fait || b.pt < c.at) continue;
      c.fait = true; var p = pointCoque(b); boum(p.x, p.y, i % 5 === 4 ? 2 : 1, i & 1 ? P.brasier : P.jaune); T.shake = Math.max(T.shake, 3);
    }
    for (i = 0; i < b.fissures.length; i++) b.fissures[i].l = Math.min(1, b.fissures[i].l + b.fissures[i].v * dm);
    /* les ennemis qui restent sautent avec lui */
    if (b.pt > 0.4 && T.E.length && T.t - (b.eT || 0) > 0.09) { b.eT = T.t; var e = T.E.pop(); if (e.k !== 'roc') boum(e.x, e.y, 0, P.magenta); }
    if (b.pt >= 3.2 && !T.detone) {
      T.detone = true; T.detT = 0; marquer('detonation'); journal('detonation');
      boum(b.coeur.x, b.coeur.y, 2, P.jaune);
      T.shake = 7; T.gel = 0.12;
      for (i = 0; i < 4; i++) T.anneaux.push({ x: b.coeur.x, y: b.coeur.y, t: -i * 0.16, c: [P.jaune, P.brasier, P.magenta, P.sang][i] });
      for (i = 0; i < b.morceaux.length; i++) {
        var m = b.morceaux[i], cp = centreMorceau(i), dx = cp.x - b.coeur.x, dy = cp.y - b.coeur.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
        m.vx = dx / l * (22 + rnd() * 18); m.vy = dy / l * (22 + rnd() * 18); m.va = (rnd() - 0.5) * 0.5;
      }
      for (i = 0; i < 140; i++) { var a = rnd() * 6.2832, v = 40 + rnd() * 200; frag(b.coeur.x, b.coeur.y, Math.cos(a) * v, Math.sin(a) * v, [P.jaune, P.brasier, P.os, P.ambre, P.rose][i % 5], 0.6 + rnd() * 1.4); }
    }
    if (T.detone) {
      T.detT += dm;
      for (i = 0; i < b.morceaux.length; i++) { var mm = b.morceaux[i]; mm.dx += mm.vx * dm; mm.dy += mm.vy * dm; mm.da += mm.va * dm; }
      if (T.detT < 2.4 && T.t - (b.e2T || 0) > 0.11) { b.e2T = T.t; var pc = pointCoque(b), k = Math.floor(rnd() * b.morceaux.length); boum(pc.x + b.morceaux[k].dx, pc.y + b.morceaux[k].dy, 1, P.brasier); }
    }
  }
  function centreMorceau(i) {
    var m = COQUE[i].p, n = m.length >> 1, u = 0, v = 0;
    for (var k = 0; k < n; k++) { u += m[2 * k]; v += m[2 * k + 1]; }
    return local(T.boss, u / n, v / n, T.boss.s);
  }

  /* ================================ start, update ================================ */
  function start(o) {
    if (!pal() || !G()) return false;
    o = o || {};
    arreterFilmAmiral(); filmAmiralVu = false;
    BAY = N.pal.BAYER || new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
    var q = o.qui;
    if (q !== 'elle' && q !== 'lui') { try { q = N.choix && N.choix.personnage ? N.choix.personnage() : null; } catch (e) { q = null; } }
    T.qui = (q === 'lui') ? 'lui' : 'elle';
    T.graine = (o.graine >>> 0) || 2975;
    rs = T.graine; rv = (T.graine * 7 + 75) % 2147483647; ra = (T.graine * 13 + 29) >>> 0;
    layout();
    T.on = true; T.phase = 'entree'; T.t = 0; T.pt = 0; T.vt = 0; T.mt = 0; T.f = 1; T.sec = 0; T.score = 0; T.morts = 0;
    T.cx = 0; T.cy = 0; T.cvx = 0; T.cvy = 0; T.derive = 0; T.shake = 0; T.gel = 0; T.hit = 0;
    T.balles.length = 0; T.E.length = 0; T.EB.length = 0; T.obus.length = 0; T.rayons.length = 0; T.mis.length = 0; T.expl.length = 0;
    T.frags.length = 0; T.sillage.length = 0; T.prof.length = 0; T.cellules.length = 0; T.boss = null; T.descT = -1; T.ev = {};
    T.vagueT = 1; T.rocT = 3; T.epaveT = 2; T.obusT = 4; T.fregT = 3; T.celT = 2; T.acc8 = 0; T.p8 = 0;
    T.msg = ''; T.msg2 = ''; T.msgT = 0; T.grosses.length = 0; T.detone = false; T.detT = 0; T.anneaux = []; T.invul = 0; T.mort = false;
    T.compte = compteNeuf(); T.journal.length = 0; T.instants = {}; T.premiereExplosion = -1;
    T.surFin = typeof o.surFin === 'function' ? o.surFin : null; T.finAppele = false;
    placerSerpent(0, T.H * 0.3, -Math.PI / 2);
    T.cx = 0; T.cy = 0;
    W.phase = 'repos'; W.pt = 0; W.verrous.length = 0; W.file.length = 0; W.n = 0; W.ext = false; T.f = 1;
    A.next = 0; A.pas = 0; A.mes = 0; A.mesSec = 0; A.sec = -1; A.tempo = CFG.tempos[0]; A.demi = false; A.finJoue = false; A.phrase = null; A.phraseVar = []; A.etoufCible = 0;
    A.notes = { nappe: 0, basse: 0, arp: 0, lead: 0, perc: 0 };
    if (A.out && A.ctx) { try { A.out.gain.cancelScheduledValues(A.ctx.currentTime); A.out.gain.setValueAtTime(0.62, A.ctx.currentTime); } catch (e) { } }
    if (!NEB || T.nebG !== T.graine + T.qui) { NEB = NEB || new Uint8Array(NEB_N * NEB_N); NEB.fill(P.vide); NEB_L = 0; T.nebG = T.graine + T.qui; }
    etoilesNeuves(); rocsNeufs();
    var R = Math.round(Math.min(T.W, T.H) * (T.qui === 'lui' ? 0.26 : 0.15));
    PLANETE = planeteNeuve(Math.max(10, R), T.qui === 'lui');
    GALAXIE = T.qui === 'elle' ? galaxieNeuve(Math.max(24, Math.round(Math.min(T.W, T.H) * 0.22))) : null;
    LUNE = T.qui === 'lui' ? planeteLune(Math.max(5, Math.round(R * 0.22))) : null;
    PORT = null; PORT_ESSAI = 0;
    journal('debut ' + T.qui);
    return true;
  }
  function planeteLune(r) {
    var w = r * 2 + 2, d = new Uint8Array(w * w); for (var i = 0; i < d.length; i++) d[i] = 255;
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      var l = clamp((-x - y) / (r * 1.4) + 0.4, 0, 1), q = BAY[(((y + r) & 3) << 2) | ((x + r) & 3)] / 16;
      d[(y + r + 1) * w + x + r + 1] = l > 0.7 ? P.os : l > q + 0.2 ? P.acier : l > q * 0.6 ? P.ardoise : P.nuit;
    }
    return { w: w, h: w, data: d };
  }
  function update(dt) {
    if (!T.on || !pal()) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    if (S().paused) return;
    if (filmAmiralOn) { N.film.update(dt); return; }
    if (G() && (G().W !== T.W || G().H !== T.H)) layout();
    T.t += dt; T.pt += dt; T.msgT += dt;
    nebuleuseBande();
    if (T.phase === 'voyage' || T.phase === 'boss') majWarp(dt); else { T.f = 1; W.k = 0; }
    ordonnancer();
    if (T.gel > 0) { T.gel -= dt; return; }
    var dm = dt * T.f;
    T.mt += dm; T.derive += dm * 26;
    if (T.phase === 'entree') majEntree(dm, dt);
    else if (T.phase === 'voyage') majVoyage(dm, dt);
    else if (T.phase === 'boss') majJeu(dm, dt);
    else if (T.phase === 'explosion') { majJeu(dm, dt); if (T.pt >= CFG.explosion) epilogue(); }
    else if (T.phase === 'epilogue') {
      T.vise = -Math.PI / 2; T.aVise = true; piloter(dm); majCamera(dt); majEffets(dm, dt);
      if (A.out && A.ctx && T.pt > CFG.epilogue - 1.2 && !T.fondu) { T.fondu = true; try { A.out.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.6); } catch (e) { } }
      if (T.pt >= CFG.epilogue) { T.phase = 'fini'; journal('fin'); finir(); }
    }
  }
  function majEntree(dm, dt) {
    T.vt += dm;
    if (T.pt > 1.2) { var inp = S().input; if (inp && inp.mag > 0.3) { T.vise = Math.atan2(inp.y, inp.x); T.aVise = true; } }
    if (!T.aVise) { T.vise = -Math.PI / 2; T.aVise = true; }
    piloter(dm);
    majCamera(dt);
    if (T.pt > 4.2 && T.prof.length < 2 && rnd() < dm * 2) lancerProfond();
    majEnnemis(dm); majEffets(dm, dt);
    if (T.pt >= 2.2 && !T.ev.titre) { T.ev.titre = 1; dire('2975', 3.0, "L'INTERGALACTIQUE"); marquer('titre'); }
    if (T.pt >= CFG.entree) { T.phase = 'voyage'; T.pt = 0; T.sec = 0; T.fondu = false; journal('voyage'); marquer('voyage'); }
  }
  function majVoyage(dm, dt) {
    T.vt += dm;
    var ev = T.ev, vt = T.vt;
    if (!ev.armada && vt >= CFG.armada) { ev.armada = 1; T.sec = 1; dire("L'ARMADA", 2.6, 'AU LOIN, SUR LE PLAN PROFOND'); marquer('armada'); }
    if (!ev.chasse && vt >= CFG.chasse) { ev.chasse = 1; T.sec = 2; T.vagueT = 0.4; dire('CHASSEURS !', 1.8); marquer('chasse'); }
    if (!ev.esc1 && vt >= CFG.esc1) { ev.esc1 = 1; if (annoncer('escadrille', T.W >= T.H ? 1 : 0)) dire('ESCADRILLE !', 1.6, 'TROP RAPIDE : WARP'); }
    if (!ev.debris && vt >= CFG.debris) { ev.debris = 1; T.sec = 3; dire('CHAMP DE DÉBRIS', 2, 'ILS COUPENT LE CORPS'); marquer('debris'); }
    if (!ev.esc2 && vt >= CFG.esc2) { ev.esc2 = 1; if (annoncer('escadrille', T.W >= T.H ? 3 : 2)) dire('ESCADRILLE !', 1.6); }
    if (!ev.descente && vt >= CFG.descente) { ev.descente = 1; T.sec = 4; commencerDescente(); dire('ILS DESCENDENT !', 2.6, 'SUR NOTRE PLAN'); marquer('descente'); }
    if (T.descT >= 0) { T.descT += dm; if (T.descT >= 3.5) finirDescente(); }
    if (!ev.plan && vt >= CFG.plan && T.descT < 0) { ev.plan = 1; T.sec = 5; dire('PLAN DE COMBAT', 1.8); marquer('plan'); }
    if (!ev.esc3 && vt >= CFG.esc3) { ev.esc3 = 1; if (annoncer('escadrille', T.W >= T.H ? 1 : 2)) dire('ESCADRILLE !', 1.6); }
    if (vt >= CFG.amiral && W.phase === 'repos' && T.descT < 0 && !T.mort) { lancerBoss(); return; }
    /* les apparitions, selon la section */
    var s = T.sec, n, i;
    if (s >= 1 && s <= 3) { var cible = [0, 4, 5, 6][s]; if (T.prof.length < cible && rnd() < dm * 1.2) lancerProfond(); }
    if (s >= 2 && s !== 4) {
      T.vagueT -= dm;
      if (T.vagueT <= 0) { n = 0; for (i = 0; i < T.E.length; i++) if (T.E[i].k === 'chasseur') n++; if (n < 7) vagueChasseurs(s >= 5 ? 4 : 3); T.vagueT = s === 3 ? 7 : s >= 5 ? 5.5 : 5; }
    }
    var rocRythme = s === 3 ? 0.42 : s === 2 || s === 5 ? 2.4 : s === 1 ? 4 : 0;
    if (rocRythme) { T.rocT -= dm; if (T.rocT <= 0) { T.rocT = rocRythme * (0.7 + rnd() * 0.6); lancerRoc(s === 3 ? rnd() < 0.45 : rnd() < 0.25); } }
    if (s === 3 || s === 5) { T.epaveT -= dm; if (T.epaveT <= 0) { T.epaveT = s === 3 ? 1.2 : 2.2; lancerEpave(); } }
    if (s === 2 || s === 3) { T.obusT -= dm; if (T.obusT <= 0) { T.obusT = s === 2 ? 4.8 : 3.4; lancerObus(); } }
    if (s === 5) { T.fregT -= dm; if (T.fregT <= 0) { T.fregT = 4; n = 0; for (i = 0; i < T.E.length; i++) if (T.E[i].k === 'fregate') n++; if (n < 3) lancerFregate(); } }
    majJeu(dm, dt);
  }
  function majJeu(dm, dt) {
    if (T.invul > 0 && T.invul < 50) T.invul -= dm;
    if (T.mort) { T.mortT += dt; if (T.mortT >= CFG.mort) renaitre(); }
    else {
      piloter(dm);
      /* le tir, sur les croches du tempo */
      T.acc8 += dm; var d8 = 60 / tempoJeu() / 2;
      if (T.phase !== 'explosion') while (T.acc8 >= d8) { T.acc8 -= d8; T.p8++; tirer(); }
      else T.acc8 = 0;
    }
    majCamera(dt);
    for (var i = T.balles.length - 1; i >= 0; i--) { var b = T.balles[i]; b.t += dm; b.x += b.vx * dm; b.y += b.vy * dm; if (b.t > CFG.porteeBalle) T.balles.splice(i, 1); }
    /* les cellules d'énergie */
    T.celT -= dm; if (T.celT <= 0) { T.celT = 2.5; if (T.cellules.length < (T.phase === 'boss' ? 2 : 3)) lancerCellule(); }
    majEnnemis(dm);
    if (T.boss) majBoss(dm, dt);
    collisions();
    majEffets(dm, dt);
    if (T.anneaux) for (var k = T.anneaux.length - 1; k >= 0; k--) { T.anneaux[k].t += dm; if (T.anneaux[k].t > 2.2) T.anneaux.splice(k, 1); }
  }
  function epilogue() {
    T.phase = 'epilogue'; T.pt = 0; T.fondu = false;
    if (!T.detone) { T.detone = true; T.detT = 3; }
    dire("L'ARMADA EST TOMBÉE", 4.2, T.qui === 'lui' ? 'LE PILOTE A TRAVERSÉ L\'UNIVERS' : 'LA PILOTE A TRAVERSÉ L\'UNIVERS');
    marquer('epilogue'); journal('epilogue');
  }
  function finir() {
    if (T.finAppele) return; T.finAppele = true;
    var f = T.surFin; T.on = false;
    if (f) { try { f(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('cosmos.surFin', e); } }
  }
  function sauter() {
    if (!T.on || (T.phase !== 'entree' && T.phase !== 'voyage')) return false;
    T.E.length = 0; T.EB.length = 0; T.obus.length = 0; T.rayons.length = 0; T.prof.length = 0; T.descT = -1; T.mis.length = 0;
    W.phase = 'repos'; W.verrous.length = 0; W.file.length = 0; T.f = 1;
    T.ev = { titre: 1, armada: 1, chasse: 1, esc1: 1, debris: 1, esc2: 1, descente: 1, plan: 1, esc3: 1 };
    if (T.mort) { T.mort = false; placerSerpent(T.cx, T.cy, -Math.PI / 2); }
    T.vt = CFG.amiral; T.phase = 'voyage';
    journal('saut');
    lancerBoss();
    return true;
  }

  /* ================================ le dessin ================================ */
  function draw() {
    if (!T.on && T.phase !== 'fini') return;
    if (!pal() || !G() || !G().buf) return;
    if (filmAmiralOn) { N.film.draw(); return; }
    var g = G();
    if (g.W !== T.W || g.H !== T.H) layout();
    B = g.buf(); BW = g.W; BH = g.H;
    if (!B || !BW) return;
    var f = Math.floor(T.t * 60), s = Math.round(T.shake);
    var sx = s ? ((f & 1) ? s : -s) : 0, sy = s ? (((f >> 1) & 1) ? (s >> 1) + 1 : -(s >> 1) - 1) : 0;
    var ox = Math.round(T.cx - T.W / 2) + sx, oy = Math.round(T.cy - T.H / 2) + sy;
    origine(0, 0);
    fond(ox, oy, f);
    profond(ox, oy, f);
    origine(ox, oy);
    if (T.phase === 'entree' || (T.phase === 'voyage' && T.pt < 0.5)) atmosphere(f, ox, oy);
    if (T.boss && T.boss.etat === 'arrivee') ombreBoss(T.boss);
    telegraphesSol(f);
    cellules(f);
    ennemis(f);
    if (T.boss) dessinerBoss(T.boss, f);
    rayons(f);
    ballesEnnemies(f);
    tirs(f);
    serpent(f);
    explosions(f);
    origine(0, 0);
    if (W.k > 0) voile(f);
    origine(ox, oy);
    if (W.phase === 'entree' || W.phase === 'visee' || W.phase === 'sortie') lunetteMonde(f);
    origine(0, 0);
    hud(f);
    origine(0, 0);
  }

  /* le fond : la nébuleuse (parallaxe 0,08), la galaxie et la planète (0,03), trois couches d'étoiles */
  function fond(ox, oy, f) {
    var i, x, y;
    var nx = Math.floor(ox * 0.08 + T.derive * 0.08 * 0.3) | 0, ny = Math.floor(oy * 0.08 - T.derive * 0.08) | 0;
    if (NEB) {
      for (y = 0; y < BH; y++) {
        var ry = ((y + ny) & NEB_M) << NEB_SH, o = y * BW;
        for (x = 0; x < BW; x++) B[o + x] = NEB[ry | ((x + nx) & NEB_M)];
      }
    } else B.fill(P.vide);
    /* les astres lointains */
    var pc = 0.03, dx = -ox * pc, dy = -oy * pc + T.derive * 0.02;
    if (GALAXIE) poserSprite(GALAXIE, mod(T.W * 0.7 + dx, T.W + GALAXIE.w * 2) - GALAXIE.w, mod(T.H * 0.16 + dy, T.H + GALAXIE.h * 2) - GALAXIE.h);
    if (PLANETE) {
      var px = mod(T.W * (T.qui === 'lui' ? 0.3 : 0.04) + dx * 1.4, T.W + PLANETE.w * 2) - PLANETE.w, py = mod(T.H * (T.qui === 'lui' ? 0.45 : 0.5) + dy * 1.4, T.H + PLANETE.h * 2) - PLANETE.h;
      poserSprite(PLANETE, px, py);
      if (LUNE) poserSprite(LUNE, px - LUNE.w * 3, py + PLANETE.h * 0.75);
    }
    /* les étoiles */
    var vit = Math.sqrt(T.cvx * T.cvx + T.cvy * T.cvy), strie = W.k > 0.2 ? W.k : 0;
    for (var l = 0; l < ETOILES.length; l++) {
      var L = ETOILES[l], p = L.p, ex = -(ox * p) - T.derive * p * 0.3, ey = -(oy * p) + T.derive * p, n = L.x.length;
      var lx = -T.cvx * p * 0.05, ly = -T.cvy * p * 0.05 + 26 * p * 0.05;
      for (i = 0; i < n; i++) {
        x = Math.floor(mod(L.x[i] + ex, 512)); y = Math.floor(mod(L.y[i] + ey, 512));
        for (var ty = y; ty < BH; ty += 512) for (var tx = x; tx < BW; tx += 512) {
          if (l === 0 && ((i * 7 + (f >> 4)) % 13) === 0) continue;
          var c = L.c[i];
          var etire = l === 2 && (vit > 120 || strie);
          if (etire) {
            var k = strie ? 6 + strie * 10 : Math.min(5, vit / 40);
            ligne(tx, ty, tx - lx * k / Math.max(1, Math.abs(lx) + Math.abs(ly)) * 2, ty - ly * k / Math.max(1, Math.abs(lx) + Math.abs(ly)) * 2, l === 2 ? P.acier : c);
          }
          B[ty * BW + tx] = c;
          if (L.b[i] && !etire) {
            if (tx > 0) B[ty * BW + tx - 1] = P.ardoise === c ? c : (l === 2 ? P.acier : c);
            if (tx + 1 < BW) B[ty * BW + tx + 1] = l === 2 ? P.acier : c;
            if (ty > 0) B[(ty - 1) * BW + tx] = l === 2 ? P.acier : c;
            if (ty + 1 < BH) B[(ty + 1) * BW + tx] = l === 2 ? P.acier : c;
          }
        }
      }
    }
  }
  function mod(a, n) { return ((a % n) + n) % n; }

  /* le plan profond : silhouettes sombres ; pendant la descente, elles grandissent et prennent leurs couleurs */
  function profond(ox, oy, f) {
    if (!T.prof.length) return;
    origine(0, 0);
    var z = T.descT >= 0 ? lisse(T.descT / 3.5) : 0;
    for (var i = 0; i < T.prof.length; i++) {
      var s = T.prof[i], e = profEcran(s), x = e.x, y = e.y;
      if (T.descT >= 0) { var m = ecran(s.wx, s.wy); x = e.x + (m.x - e.x) * z; y = e.y + (m.y - e.y) * z; }
      var k = (0.5 + 0.5 * z) * echType(s.type) * (z < 1 ? 1.25 : 1);
      var pts = formeType(s.type);
      vaisseauProfond(pts, x, y, s.a, k, z, s.t, f);
    }
    /* la descente : un pli du plan balaie l'écran, les étoiles proches s'étirent vers les bords */
    if (T.descT >= 0) {
      var u = T.descT / 3.5, yb = Math.round(-20 + (T.H + 40) * lisse(u * 1.2));
      rectT(0, yb - 3, T.W, 7, P.indigo, 0.35); rectT(0, yb, T.W, 1, P.violet, 0.75);
      for (var r = 0; r < 18; r++) {
        var a = r / 18 * 6.2832 + 0.2, r0 = Math.min(T.W, T.H) * (0.25 + 0.6 * ((u * 2 + r * 0.37) % 1)), l = 10 + 16 * z;
        ligne(T.W / 2 + Math.cos(a) * r0, T.H / 2 + Math.sin(a) * r0, T.W / 2 + Math.cos(a) * (r0 + l), T.H / 2 + Math.sin(a) * (r0 + l), r & 1 ? P.indigo : P.acier, 2, 1);
      }
    }
  }
  function vaisseauProfond(pts, x, y, a, k, z, t, f) {
    var n = forme(pts, x, y, a, k);
    garderContour(n);
    poly(n, P.ardoise);
    n = forme(pts, x, y, a, k * 0.72); poly(n, z < 0.5 ? P.nuit : P.indigo, z < 0.5 ? 0.5 : 0.75);
    contour(pts.length >> 1, P.np, z > 0.6 ? P.acier : P.violet);
    n = forme(F_FREG_PONT, x - Math.cos(a) * pts[0] * k * 0.3, y - Math.sin(a) * pts[0] * k * 0.3, a, k); poly(n, z < 0.5 ? P.nuit : P.sang);
    /* les rangées de hublots : l'échelle de la flotte */
    var c0 = Math.cos(a) * k, s0 = Math.sin(a) * k, L0 = pts[0];
    for (var h = 0; h < 7; h++) { var hu = L0 * (0.55 - h * 0.17); if (((h * 3 + (f >> 4)) % 5) === 0) continue; pt(x + hu * c0 - 2 * s0, y + hu * s0 + 2 * c0, z > 0.5 ? P.jaune : P.ambre); }
    /* les feux : sang au fond, magenta qui clignote ; les tuyères, ambre */
    var ca = Math.cos(a) * k, sa = Math.sin(a) * k, nb = Math.max(2, Math.round(pts[0] / 8));
    for (var i = 0; i < nb; i++) {
      var u = pts[0] * (0.7 - i * 1.4 / nb), lx = x + u * ca, ly = y + u * sa;
      var on = ((f >> 3) + i) % 4 === 0;
      if (on) pt(lx, ly, z > 0.4 ? P.magenta : P.sang);
    }
    var ux = x - pts[0] * ca * 0.98, uy = y - pts[0] * sa * 0.98;
    pt(ux, uy, (f >> 2) & 1 ? P.ambre : P.brasier);
    if (k > 0.8) pt(ux - sa * 2, uy + ca * 2, P.brasier);
  }

  /* la brèche : les bandes du ciel du monde du pilote glissent sous le serpent ; le bouclier de rentrée flambe */
  function atmosphere(f, ox0, oy0) {
    origine(0, 0);
    var p = T.phase === 'entree' ? T.pt : CFG.entree + T.pt, u = lisse((p - 0.5) / 3.2), bord = Math.round(-T.H * 0.2 + (T.H * 1.35) * u);
    var elle = T.qui !== 'lui';
    var bandes = elle ? [P.nuit, P.violet, P.magenta, P.rose] : [P.sang, P.brasier, P.ambre, P.jaune], dense = elle ? P.magenta : P.ambre;
    var hb = Math.max(10, Math.round(T.H / 7)), D = 22;
    for (var y = Math.max(0, bord); y < BH; y++) {
      var d = y - bord, k = Math.min(bandes.length - 1, Math.floor(d / hb)), c = bandes[k], c2 = k > 0 ? bandes[k - 1] : P.vide;
      var tb = (d % hb) / hb, o = y * BW, row = (y & 3) << 2;
      for (var x = 0; x < BW; x++) {
        if (d < D && BAY[row | (x & 3)] >= d / D * 16) continue;          // le haut du ciel s'effiloche dans l'espace
        var cc = (tb < 0.35 && BAY[row | (x & 3)] >= tb / 0.35 * 16) ? c2 : c;
        if (k === bandes.length - 1 && BAY[row | (x & 3)] >= 8) cc = dense;     // le bas du ciel, tramé : pas d'aplat clair
        B[o + x] = cc;
      }
    }
    /* des traînées de nuages qui filent vers le bas (le serpent monte vite) */
    for (var i = 0; i < 26; i++) {
      var x0 = (i * 97 + 13) % Math.max(1, T.W), sp = 220 + (i % 5) * 60, yy = bord + mod(i * 53 + p * sp, T.H * 1.3) - 10, l = 8 + (i % 4) * 9;
      if (yy < bord + 4) continue;
      var kk = Math.min(bandes.length - 1, Math.floor((yy - bord) / hb));
      ligne(x0, yy, x0, yy + l, kk >= 3 ? P.os : bandes[Math.min(bandes.length - 1, kk + 1)]);
    }
    /* le bouclier de rentrée autour de la tête, tant qu'elle est dans le ciel */
    var h = ecran(T.hx, T.hy);
    if (h.y > bord - 6 && T.phase === 'entree') {
      var ca = Math.cos(T.cap), sa = Math.sin(T.cap), fl = 0.6 + 0.4 * ((f >> 1) & 1);
      for (var r = 0; r < 3; r++) {
        var cc = [P.os, P.jaune, P.brasier][r], rr = 5 + r * 2;
        for (var a = -1.3; a <= 1.3; a += 0.12) { var aa = T.cap + a; ptT(h.x + Math.cos(aa) * rr, h.y + Math.sin(aa) * rr, cc, fl - r * 0.15); }
      }
      for (var j = 0; j < 10; j++) {
        var lj = 10 + ((j * 7 + f) % 14), oj = (j - 4.5) * 1.3;
        ligne(h.x - ca * 4 - sa * oj, h.y - sa * 4 + ca * oj, h.x - ca * lj - sa * oj * 1.6, h.y - sa * lj + ca * oj * 1.6, j % 3 === 0 ? P.jaune : P.brasier, 2, 1, f);
      }
    }
    origine(ox0, oy0);
  }

  /* les obus annoncés : un cercle pointillé qui se resserre, un fil qui remonte vers le croiseur du fond */
  function telegraphesSol(f) {
    for (var i = 0; i < T.obus.length; i++) {
      var o = T.obus[i], u = o.t / o.d, r = 26 - 14 * u, n = 20, c = u > 0.7 && (f & 2) ? P.jaune : P.magenta;
      for (var k = 0; k < n; k++) { var a = k / n * 6.2832 + u * 2; pt(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, c); }
      G().ring(o.x, o.y, 13, P.magenta, 0.25 + 0.5 * u);
      pt(o.x, o.y, P.os);
      var e = profEcran(o.src), sx = e.x + OX, sy = e.y + OY;
      if (u < 0.6) ligne(sx, sy, o.x, o.y, P.sang, 1, 4, Math.floor(T.t * 30));
    }
  }
  function cellules(f) {
    for (var i = 0; i < T.cellules.length; i++) {
      var c = T.cellules[i], r = 3 + Math.sin(c.t * 5) * 0.8;
      G().circ(c.x, c.y, 2, P.ambre); pt(c.x, c.y, P.jaune); pt(c.x - 1, c.y - 1, P.os);
      for (var k = 0; k < 3; k++) { var a = c.t * 3 + k * 2.094; pt(c.x + Math.cos(a) * (r + 2), c.y + Math.sin(a) * (r + 2), P.jaune); }
    }
  }
  function ennemis(f) {
    for (var i = 0; i < T.E.length; i++) {
      var e = T.E[i], n, fl = e.flash > 0;
      if (e.flash > 0) e.flash -= 1 / 60;
      if (e.k === 'chasseur') {
        n = forme(F_CHASSEUR, e.x, e.y, e.a, 1.15); garderContour(n); poly(n, fl ? P.os : P.magenta); contour(n, P.np);
        n = forme(F_COCKPIT, e.x, e.y, e.a, 1.15); poly(n, e.tel > 0 && (f & 2) ? P.os : P.rose);
        pt(e.x - Math.cos(e.a) * 4, e.y - Math.sin(e.a) * 4, (f & 2) ? P.ambre : P.brasier);
      } else if (e.k === 'eclair') {
        var h = e.hist;
        for (var k = 0; k + 3 < h.length; k += 2) ligne(h[k], h[k + 1], h[k + 2], h[k + 3], k < h.length / 2 ? P.sang : P.magenta);
        n = forme(F_ECLAIR, e.x, e.y, e.a, 1.1); garderContour(n); poly(n, P.magenta); contour(n, P.np);
        pt(e.x + Math.cos(e.a) * 2, e.y + Math.sin(e.a) * 2, P.os);
      } else if (e.k === 'roc') {
        n = forme(ROCS[e.forme], e.x, e.y, e.a, e.r); garderContour(n); poly(n, P.ardoise);
        n = forme(ROCS[e.forme], e.x - e.r * 0.15, e.y - e.r * 0.15, e.a, e.r * 0.72); poly(n, P.acier, 0.4);
        contour(ROCS[e.forme].length >> 1, P.sang, P.acier);
        if (e.r > 5) { pt(e.x + e.r * 0.2, e.y + e.r * 0.25, P.nuit); pt(e.x - e.r * 0.4, e.y + e.r * 0.1, P.nuit); }
        pt(e.x - e.r * 0.45, e.y - e.r * 0.45, P.os);
        if (fl) G().ring(e.x, e.y, e.r, P.os);
      } else if (e.k === 'epave') {
        var ca = Math.cos(e.a) * e.l * 0.5, sa = Math.sin(e.a) * e.l * 0.5;
        ligne(e.x - ca, e.y - sa, e.x + ca, e.y + sa, P.acier); ligne(e.x - ca + 1, e.y - sa, e.x + ca + 1, e.y + sa, P.ardoise);
        pt(e.x + ca, e.y + sa, (f & 4) ? P.brasier : P.ambre); pt(e.x - ca, e.y - sa, P.sang);
      } else if (e.k === 'fregate') {
        var ek = e.ech, ep = e.pts, L0 = ep[0] * ek;
        n = forme(ep, e.x, e.y, e.a, ek); garderContour(n); poly(n, fl ? P.acier : P.ardoise);
        n = forme(ep, e.x, e.y, e.a, ek * 0.72); poly(n, P.indigo, 0.6);
        contour(ep.length >> 1, P.np, P.acier);
        n = forme(F_FREG_PONT, e.x - Math.cos(e.a) * L0 * 0.25, e.y - Math.sin(e.a) * L0 * 0.25, e.a, ek); poly(n, P.sang);
        var c2 = Math.cos(e.a), s2 = Math.sin(e.a);
        for (var j = -2; j <= 2; j++) pt(e.x + c2 * (j * L0 * 0.25) - s2 * 4.5 * ek, e.y + s2 * (j * L0 * 0.25) + c2 * 4.5 * ek, ((f >> 3) + j) & 1 ? P.magenta : P.sang);
        pt(e.x + c2 * (L0 - 1), e.y + s2 * (L0 - 1), P.magenta);
        for (var tq = -1; tq <= 1; tq++) pt(e.x - c2 * (L0 + 1) - s2 * tq * 2 * ek, e.y - s2 * (L0 + 1) + c2 * tq * 2 * ek, tq === 0 && (f & 2) ? P.jaune : (f & 2) ? P.ambre : P.brasier);
        /* la jauge de vie, en pointillés sous la coque */
        for (var v = 0; v < e.pv; v++) pt(e.x - 8 + v * 2, e.y + 11, P.rose);
      }
    }
  }
  function rayons(f) {
    for (var i = 0; i < T.rayons.length; i++) {
      var r = T.rayons[i], x1 = r.x + Math.cos(r.a) * r.l, y1 = r.y + Math.sin(r.a) * r.l;
      if (r.t < r.tel) {
        /* le télégraphe : un pointillé qui s'accélère, la bouche qui se charge */
        var u = r.t / r.tel, ph = Math.floor(T.mt * (20 + u * 50));
        ligne(r.x, r.y, x1, y1, u > 0.75 && (f & 2) ? P.jaune : P.magenta, 2, 3, ph);
        if (r.balaye) {
          for (var k = 1; k <= 8; k++) { var aa = r.a + r.balaye * r.act * k / 8; pt(r.x + Math.cos(aa) * r.l * 0.35, r.y + Math.sin(aa) * r.l * 0.35, P.magenta); }
        }
        G().ring(r.x, r.y, Math.max(2, Math.round(9 - 7 * u)), P.jaune, 0.5 + u * 0.5);
      } else {
        var w = r.w, nx = -Math.sin(r.a), ny = Math.cos(r.a);
        for (var j = -Math.floor(w / 2); j <= Math.floor(w / 2); j++) ligne(r.x + nx * j, r.y + ny * j, x1 + nx * j, y1 + ny * j, Math.abs(j) < w / 2 - 1 ? P.os : P.magenta);
        ligne(r.x + nx * (w / 2 + 1), r.y + ny * (w / 2 + 1), x1 + nx * (w / 2 + 1), y1 + ny * (w / 2 + 1), P.np);
        ligne(r.x - nx * (w / 2 + 1), r.y - ny * (w / 2 + 1), x1 - nx * (w / 2 + 1), y1 - ny * (w / 2 + 1), P.np);
        G().circ(r.x, r.y, 3, P.os);
      }
    }
  }
  function ballesEnnemies(f) {
    for (var i = 0; i < T.EB.length; i++) {
      var b = T.EB[i];
      pt(b.x - 1, b.y, P.np); pt(b.x + 1, b.y, P.np); pt(b.x, b.y - 1, P.np); pt(b.x, b.y + 1, P.np);
      pt(b.x - 1, b.y - 1, P.magenta); pt(b.x + 1, b.y + 1, P.magenta); pt(b.x + 1, b.y - 1, P.magenta); pt(b.x - 1, b.y + 1, P.magenta);
      pt(b.x, b.y, (f >> 2) & 1 ? P.os : P.rose);
    }
  }
  function tirs(f) {
    var i;
    for (i = 0; i < T.balles.length; i++) { var b = T.balles[i], k = 1 / CFG.balle; ligne(b.x - b.vx * k * 4, b.y - b.vy * k * 4, b.x, b.y, P.ambre); pt(b.x, b.y, P.jaune); }
    for (i = 0; i < T.mis.length; i++) {
      var q = T.mis[i], t = q.tr;
      for (var j = 0; j + 3 < t.length; j += 2) ligne(t[j], t[j + 1], t[j + 2], t[j + 3], j < t.length / 3 ? P.acier : j < t.length * 2 / 3 ? P.ambre : P.jaune);
      pt(q.x, q.y, P.os); pt(q.x - Math.cos(q.a), q.y - Math.sin(q.a), P.jaune);
    }
  }
  /* le serpent : perles cyan, épine dorsale cyan pâle, tête à crête ; la traînée du personnage derrière */
  function serpent(f) {
    var i, c = T.qui === 'lui' ? [P.jaune, P.ambre, P.brasier, P.sang] : [P.os, P.rose, P.magenta, P.violet];
    for (i = 0; i < T.sillage.length; i++) {
      var s = T.sillage[i], u = s.l / s.d, k = Math.min(3, Math.floor(u * 4));
      if (u > 0.75 && ((i + f) & 1)) continue;
      pt(s.x, s.y, c[k]);
    }
    if (T.mort || T.phase === 'fini') return;
    if (T.invul > 0 && T.invul < 50 && ((f >> 2) & 1)) return;
    var n = T.nseg, p, r;
    for (i = n - 1; i >= 1; i--) { p = seg(i); G().circ(p[0], p[1], i > n - 4 ? 2 : 3, P.np); }
    var hx = T.hx, hy = T.hy, ca = Math.cos(T.cap), sa = Math.sin(T.cap);
    G().circ(hx, hy, 4, P.np); G().circ(hx + ca * 1.5, hy + sa * 1.5, 3, P.np);
    for (i = n - 1; i >= 1; i--) {
      p = seg(i); r = i > n - 4 ? 1 : 2;
      G().circ(p[0], p[1], r, P.cyan);
      if (i % 3 === 0 && r === 2) { pt(p[0], p[1], P.cyanP); pt(p[0] - 1, p[1] - 1, P.cyanP); }
    }
    G().circ(hx, hy, 3, P.cyan);
    G().circ(hx + ca * 1.5, hy + sa * 1.5, 2, P.cyan);
    ligne(hx - ca * 2, hy - sa * 2, hx + ca * 3, hy + sa * 3, P.cyanP);
    pt(hx + ca * 1.2 - sa * 2, hy + sa * 1.2 + ca * 2, P.vide); pt(hx + ca * 1.2 + sa * 2, hy + sa * 1.2 - ca * 2, P.vide);
    pt(hx + ca * 4.6, hy + sa * 4.6, (f >> 3) & 1 ? P.cyanP : P.cyan);
  }
  function explosions(f) {
    var i, g = G();
    for (i = 0; i < T.expl.length; i++) {
      var e = T.expl[i], u = e.t / e.d, r = e.r * (0.25 + 0.75 * Math.sqrt(u));
      if (e.taille === 0) {
        var rr = 1 + u * e.r, cc = u < 0.3 ? P.jaune : P.brasier;
        for (var q = 0; q < 8; q++) { var aa = q * 0.785; pt(e.x + Math.cos(aa) * rr, e.y + Math.sin(aa) * rr, cc); }
        if (u < 0.3) g.circ(e.x, e.y, 1, P.os);
      } else {
        g.ditherCirc(e.x, e.y, r * 0.55 * (1 - u), u < 0.25 ? P.os : P.jaune, Math.max(0, 0.9 - u));
        g.disc(e.x, e.y, Math.max(0, r - 3), r, u < 0.4 ? P.jaune : u < 0.7 ? P.brasier : P.sang, Math.max(0, 1 - u));
        g.disc(e.x, e.y, Math.max(0, r * 0.62 - 2), r * 0.62, P.brasier, Math.max(0, 0.85 - u));
        if (u < 0.5) g.ring(e.x, e.y, r + 1, P.np, 0.6);
      }
    }
    /* les anneaux de la détonation : fins, tramés, qui s'étendent au-delà de l'écran */
    if (T.anneaux) for (i = 0; i < T.anneaux.length; i++) {
      var a = T.anneaux[i]; if (a.t < 0) continue;
      var R = 8 + a.t * Math.max(T.W, T.H) * 0.62, tt = Math.max(0, 1 - a.t / 2.2);
      g.disc(a.x, a.y, R - 4, R, a.c, tt * 0.75);
      g.ring(a.x, a.y, R + 2, P.np, tt * 0.5);
    }
    for (i = 0; i < T.frags.length; i++) { var fr = T.frags[i]; if (fr.l < fr.l0 * 0.3 && ((i + f) & 1)) continue; pt(fr.x, fr.y, fr.c); }
  }

  /* ---------------- l'amiral, dessiné ---------------- */
  function pointsBoss(b, pts, s, mi, k) {
    var m = mi >= 0 ? b.morceaux[mi] : null, hl = b.L * 0.5 * s * (k || 1), hw = b.Wd * 0.5 * s * (k || 1), ca = Math.cos(b.a), sa = Math.sin(b.a), n = pts.length >> 1;
    var cx = 0, cy = 0, i;
    if (m && (m.da || m.dx || m.dy)) { var cm = centreMorceau(mi); cx = cm.x; cy = cm.y; }
    var cr = m ? Math.cos(m.da) : 1, sr = m ? Math.sin(m.da) : 0;
    for (i = 0; i < n; i++) {
      var lx = pts[2 * i] * hl, ly = pts[2 * i + 1] * hw, x = b.x + lx * ca - ly * sa, y = b.y + lx * sa + ly * ca;
      if (m) { if (m.da) { var rx = x - cx, ry = y - cy; x = cx + rx * cr - ry * sr; y = cy + rx * sr + ry * cr; } x += m.dx; y += m.dy; }
      QX[i] = x; QY[i] = y;
    }
    return n;
  }
  function ombreBoss(b) {
    var u = clamp(b.pt / 1.2, 0, 1), off = (1 - lisse(b.pt / CFG.boss.arrivee)) * 40 + 8;
    for (var i = 0; i < COQUE.length; i++) {
      var n = pointsBoss(b, COQUE[i].p, 1.05, -1);
      for (var k = 0; k < n; k++) { QX[k] += b.xF - b.x + off * 0.6; QY[k] += b.yF - b.y + off; }
      poly(n, 0, Math.min(1, 0.4 + u * 0.6), LUT_OMBRE);
    }
  }
  function dessinerBoss(b, f) {
    var i, n, mort = b.etat === 'mort', reste = mort && T.detone ? Math.max(0, 1 - (T.detT - 1.2) / 1.8) : 1;
    if (reste <= 0) return;
    var vis = b.etat === 'arrivee' ? clamp((b.pt - 1.4) / 1.6, 0, 1) : 1, s = b.s;
    if (vis <= 0) return;
    var t = Math.min(vis, reste);
    /* les tuyères : trois flammes tramées derrière la poupe */
    if (!mort) for (i = -1; i <= 1; i++) {
      var lf = 0.16 + 0.04 * Math.sin(T.t * 23 + i * 2), q0 = local(b, -0.98, i * 0.18, s), q1 = local(b, -0.98 - lf, i * 0.18, s);
      for (var r = 0; r < 3; r++) {
        var cc = [P.sang, P.brasier, P.jaune][r], ww = (3 - r) * 0.06 * b.Wd * 0.5 * s;
        n = flamme(q0, q1, ww, 1 - r * 0.22); poly(n, cc, t * (r === 2 ? 1 : 0.8));
      }
    }
    for (i = 0; i < COQUE.length; i++) {
      var mi = mort && T.detone ? i : -1;
      n = pointsBoss(b, COQUE[i].p, s, mi); garderContour(n); poly(n, P.ardoise, t);
      n = pointsBoss(b, COQUE[i].p, s, mi); retrecir(n, 0.78); poly(n, P.indigo, t * 0.5);
      if (t >= 0.95) contour(COQUE[i].p.length >> 1, P.np, P.acier);
    }
    /* les coutures des plaques, en travers de l'épine et des nacelles */
    if (t >= 0.5 && !(mort && T.detone)) {
      for (var su = -0.85; su < 0.8; su += 0.11) {
        var sv0 = su > 0.3 ? 0.18 : 0.38, q1 = local(b, su, sv0, s), q2 = local(b, su, sv0 + 0.1, s), q3 = local(b, su, -sv0, s), q4 = local(b, su, -sv0 - 0.1, s);
        ligne(q1.x, q1.y, q2.x, q2.y, P.np); ligne(q3.x, q3.y, q4.x, q4.y, P.np);
      }
      for (i = 0; i < b.details.length; i++) {
        var dd = b.details[i], du = dd.w, dv = dd.h, mi2 = mort && T.detone ? dd.m : -1;
        var pq = [dd.u + du, dd.v + dv, dd.u - du, dd.v + dv, dd.u - du, dd.v - dv, dd.u + du, dd.v - dv];
        n = pointsBoss(b, pq, s, mi2); garderContour(n); poly(n, dd.c ? P.indigo : P.ardoise, t);
        ligne(CX_[1], CY_[1], CX_[2], CY_[2], P.acier); ligne(CX_[0], CY_[0], CX_[1], CY_[1], P.acier);
        ligne(CX_[2], CY_[2], CX_[3], CY_[3], P.np); ligne(CX_[3], CY_[3], CX_[0], CY_[0], P.np);
      }
    }
    /* les feux de position : un chenillard magenta qui court le long des bords */
    if (!mort && t >= 0.95) for (i = 0; i < COQUE.length; i++) {
      var cp = COQUE[i].p, cn = cp.length >> 1, tick = Math.floor(T.t * 12);
      for (var e1 = 0; e1 < cn; e1++) {
        var e2 = (e1 + 1) % cn, qa = local(b, cp[2 * e1] * 0.96, cp[2 * e1 + 1] * 0.93, s), qb = local(b, cp[2 * e2] * 0.96, cp[2 * e2 + 1] * 0.93, s);
        var lg = Math.sqrt(d2(qa.x, qa.y, qb.x, qb.y)), nk = Math.floor(lg / 7);
        for (var kq = 0; kq < nk; kq++) { if (((kq + tick + e1 * 3) % 6) > 1) continue; var uq = kq / nk; pt(qa.x + (qb.x - qa.x) * uq, qa.y + (qb.y - qa.y) * uq, ((kq + tick) % 6) === 0 ? P.rose : P.magenta); }
      }
    }
    /* l'épine, le pont, les rangées de hublots (l'échelle) */
    var m0 = mort && T.detone ? 1 : -1;
    n = pointsBoss(b, EPINE, s, m0); poly(n, P.violet, t * 0.7);
    n = pointsBoss(b, PONT, s, mort && T.detone ? 4 : -1); garderContour(n); poly(n, P.acier, t * 0.85); if (t >= 0.95) contour(PONT.length >> 1, P.np);
    if (!mort || !T.detone) {
      for (var row = -1; row <= 1; row += 2) for (var k = 0; k < 18; k++) {
        var uu = 0.62 - k * 0.075, q = local(b, uu, row * 0.2, s);
        if (((k * 5 + (f >> 4)) % 7) !== 0) ptT(q.x, q.y, k % 4 === 0 ? P.ambre : P.jaune, t);
      }
      for (k = 0; k < 6; k++) { var ql = local(b, 0.95 - k * 0.1, 0, s); if (((f >> 3) + k) % 6 === 0) pt(ql.x, ql.y, P.magenta); }
      var bord = [[0.98, 0], [-0.62, 0.98], [-0.62, -0.98], [-1, 0.24], [-1, -0.24]];
      for (k = 0; k < bord.length; k++) { var qb = local(b, bord[k][0], bord[k][1], s); if (((f >> 4) + k) & 1) G().circ(qb.x, qb.y, 1, P.magenta); }
    }
    /* les fissures de la mort : des traits brûlants qui partent du cœur */
    if (mort) for (i = 0; i < b.fissures.length; i++) {
      var fi = b.fissures[i], c0 = b.coeur, lfi = fi.l * b.Wd * 0.45;
      ligne(c0.x, c0.y, c0.x + Math.cos(fi.a) * lfi, c0.y + Math.sin(fi.a) * lfi, (f >> 1) & 1 ? P.os : P.brasier);
      ligne(c0.x + 1, c0.y, c0.x + 1 + Math.cos(fi.a) * lfi * 0.7, c0.y + Math.sin(fi.a) * lfi * 0.7, P.jaune);
    }
    if (vis < 1) return;
    /* les points faibles */
    for (i = 0; i < b.parts.length; i++) {
      var p = b.parts[i];
      if (p.type === 'coeur') { coeur(b, p, f); continue; }
      if (p.mort) {
        G().circ(p.x, p.y, 5, P.nuit); G().ditherCirc(p.x, p.y, 5, P.brasier, 0.25 + 0.15 * ((f >> 3) & 1)); pt(p.x, p.y, P.sang);
        if ((f & 7) === 0 && !mort) frag(p.x + (rnd() - 0.5) * 6, p.y, (rnd() - 0.5) * 6, -12, (f & 8) ? P.acier : P.ardoise, 0.7);
        continue;
      }
      var fl = p.flash > 0, pul = 0.5 + 0.5 * Math.sin(p.t * 5);
      G().circ(p.x, p.y, p.r + 1, P.np); G().circ(p.x, p.y, p.r, P.sang);
      G().ring(p.x, p.y, p.r, fl ? P.os : P.magenta);
      if (p.type === 'canon') {
        var ac = Math.atan2(T.hy - p.y, T.hx - p.x);
        ligne(p.x, p.y, p.x + Math.cos(ac) * (p.r + 4), p.y + Math.sin(ac) * (p.r + 4), P.acier);
        ligne(p.x + 1, p.y, p.x + 1 + Math.cos(ac) * (p.r + 4), p.y + Math.sin(ac) * (p.r + 4), P.acier);
      } else if (p.type === 'hangar') {
        var ou = p.tel > 0 ? 1 : 0; rectT(p.x - 3, p.y - 2 - ou, 7, 5 + ou * 2, ou ? P.jaune : P.ardoise);
      } else {
        for (var kk = 0; kk < 6; kk++) { var ar = p.t * 2 + kk * 1.047; pt(p.x + Math.cos(ar) * (p.r - 2), p.y + Math.sin(ar) * (p.r - 2), p.tel > 0 ? P.jaune : P.rose); }
      }
      G().circ(p.x, p.y, 3, fl ? P.os : (p.tel > 0 && (f & 2)) ? P.os : P.magenta);
      pt(p.x, p.y, pul > 0.5 ? P.jaune : P.os);
      /* la jauge du point faible : un arc qui se vide */
      var fr = clamp(p.pv / p.pvMax, 0, 1);
      for (var j = 0; j < 12 * fr; j++) { var aj = -Math.PI / 2 + j / 12 * 6.2832; pt(p.x + Math.cos(aj) * (p.r + 3), p.y + Math.sin(aj) * (p.r + 3), P.jaune); }
      if (p.tel > 0) G().ring(p.x, p.y, p.r + 6 - p.tel * 6, P.jaune, 0.8);
    }
  }
  /* rapproche les points posés dans QX/QY de leur centre (les plaques intérieures d'un morceau) */
  function retrecir(n, k) {
    var cx = 0, cy = 0, i;
    for (i = 0; i < n; i++) { cx += QX[i]; cy += QY[i]; }
    cx /= n; cy /= n;
    for (i = 0; i < n; i++) { QX[i] = cx + (QX[i] - cx) * k; QY[i] = cy + (QY[i] - cy) * k; }
  }
  function flamme(q0, q1, w, l) {
    var dx = q1.x - q0.x, dy = q1.y - q0.y, d = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / d * w, ny = dx / d * w;
    QX[0] = q0.x + nx; QY[0] = q0.y + ny; QX[1] = q0.x + dx * l; QY[1] = q0.y + dy * l; QX[2] = q0.x - nx; QY[2] = q0.y - ny;
    return 3;
  }
  function coeur(b, p, f) {
    if (b.etat === 'p1' || b.etat === 'arrivee') {
      /* fermé : des plaques blindées en croix, une lueur qui filtre */
      G().circ(p.x, p.y, p.r, P.ardoise); G().ring(p.x, p.y, p.r, P.acier);
      ligne(p.x - p.r, p.y, p.x + p.r, p.y, P.np); ligne(p.x, p.y - p.r, p.x, p.y + p.r, P.np);
      if ((f >> 4) & 1) pt(p.x + 1, p.y + 1, P.brasier);
      return;
    }
    if (b.etat === 'mort' && T.detone) return;
    var o = b.etat === 'transition' ? lisse(b.pt / CFG.boss.transition) : 1, r = p.r * (0.5 + 0.5 * o), fl = p.flash > 0;
    G().circ(p.x, p.y, r + 3, P.np);
    G().ditherCirc(p.x, p.y, r + 2, P.brasier, 0.5 + 0.3 * Math.sin(T.t * 8));
    G().circ(p.x, p.y, r, fl ? P.os : P.sang);
    G().circ(p.x, p.y, r * 0.72, P.magenta);
    var ia = Math.atan2(T.hy - p.y, T.hx - p.x), ix = p.x + Math.cos(ia) * r * 0.25, iy = p.y + Math.sin(ia) * r * 0.25;
    G().circ(ix, iy, r * 0.38, p.tel > 0 && (f & 2) ? P.os : P.jaune);
    G().circ(ix, iy, Math.max(1, r * 0.16), P.vide);
    if (b.etat === 'p2') {
      var fr = clamp(p.pv / p.pvMax, 0, 1);
      for (var j = 0; j < 24 * fr; j++) { var aj = -Math.PI / 2 + j / 24 * 6.2832; pt(p.x + Math.cos(aj) * (r + 5), p.y + Math.sin(aj) * (r + 5), P.jaune); }
    }
  }

  /* le voile froid du warp : les fonds sombres glissent vers la nuit profonde, tramé à l'entrée et à la sortie */
  function voile(f) {
    var t = W.k, t16 = t * 16;
    for (var y = 0; y < BH; y++) {
      var o = y * BW, row = (y & 3) << 2;
      for (var x = 0; x < BW; x++) if (t >= 1 || BAY[row | (x & 3)] < t16) B[o + x] = LUT_VOILE[B[o + x]];
    }
    /* les stries : le monde s'étire depuis le centre */
    for (var i = 0; i < W.stries.length; i++) {
      var s = W.stries[i], r0 = Math.min(T.W, T.H) * (0.3 + ((s.r + W.t * s.v) % 0.7)), l = 6 + 18 * t;
      ligne(T.W / 2 + Math.cos(s.a) * r0, T.H / 2 + Math.sin(s.a) * r0, T.W / 2 + Math.cos(s.a) * (r0 + l), T.H / 2 + Math.sin(s.a) * (r0 + l), i % 3 ? P.indigo : P.acier);
    }
  }
  /* les verrous, dessinés sur leurs cibles (monde) */
  function lunetteMonde(f) {
    for (var i = 0; i < W.verrous.length; i++) {
      var v = W.verrous[i], e = v.e, r = (e.r || 4) + 4 + (verrousAvant(i) * 3), rot = v.age * 4;
      for (var k = 0; k < 4; k++) {
        var a = rot + k * 1.5708, cx = e.x + Math.cos(a) * r, cy = e.y + Math.sin(a) * r;
        ligne(cx, cy, cx + Math.cos(a + 2.4) * 3, cy + Math.sin(a + 2.4) * 3, P.jaune);
        ligne(cx, cy, cx + Math.cos(a - 2.4) * 3, cy + Math.sin(a - 2.4) * 3, P.jaune);
      }
    }
    /* les cibles verrouillables : un petit losange acier */
    if (W.phase === 'visee' || W.phase === 'entree') {
      var L = cibles();
      for (i = 0; i < L.length; i++) { var c = L[i], rr = (c.r || 4) + 2; if (verrousSur(c)) continue; pt(c.x, c.y - rr, P.acier); pt(c.x, c.y + rr, P.acier); pt(c.x - rr, c.y, P.acier); pt(c.x + rr, c.y, P.acier); }
    }
  }
  function verrousAvant(i) { var e = W.verrous[i].e, n = 0; for (var k = 0; k < i; k++) if (W.verrous[k].e === e) n++; return n; }

  /* ---------------- l'interface ---------------- */
  function hud(f) {
    var sf = T.safe || { l: 0, t: 0, r: 0, b: 0 }, x0 = sf.l + 3, y0 = sf.t + 3, x1 = T.W - sf.r - 3, y1 = T.H - sf.b - 3, g = G();
    /* le portrait du pilote, cadré de sa couleur */
    var col = T.qui === 'lui' ? P.ambre : P.rose, cadre = T.hit > 0 && (f & 4) ? P.os : (W.k > 0.3 ? P.jaune : col), pw = 22;
    rectT(x0, y0, pw + 4, pw + 4, P.np); rectT(x0 + 1, y0 + 1, pw + 2, 1, cadre); rectT(x0 + 1, y0 + pw + 2, pw + 2, 1, cadre);
    rectT(x0 + 1, y0 + 1, 1, pw + 2, cadre); rectT(x0 + pw + 2, y0 + 1, 1, pw + 2, cadre);
    var po = portrait();
    if (po) {
      for (var yy = 0; yy < pw; yy++) for (var xx = 0; xx < pw; xx++) {
        var v = po.data[yy * pw + xx], X = x0 + 2 + xx, Y = y0 + 2 + yy;
        if (X >= 0 && Y >= 0 && X < BW && Y < BH) B[Y * BW + X] = (W.k > 0.3 && ((yy + (f >> 1)) & 3) === 0) ? LUT_VOILE[v] : v;
      }
    } else {
      /* repli sans image : un casque stylisé */
      g.circ(x0 + 2 + pw / 2, y0 + 2 + pw / 2 + 1, 8, P.ardoise); rectT(x0 + 6, y0 + 10, pw - 8, 4, col); g.ring(x0 + 2 + pw / 2, y0 + 2 + pw / 2 + 1, 8, P.acier);
    }
    texte(T.qui === 'lui' ? 'LUI' : 'ELLE', x0 + 1, y0 + pw + 6, col, 1);
    /* le score, l'année */
    texte(('0000000' + T.score).slice(-7), x0 + pw + 8, y0 + 1, P.jaune, 1);
    var an = texte('2975', null, 0, P.os, 1); if (an) g.blit(an, x1 - an.w, y0 + 1);
    /* la jauge des plans : HAUT, NOTRE PLAN, PROFOND ; le serpent sur le plan du milieu, l'armada là où elle est */
    var gx = x1 - 4, gy = y0 + 12, pz = T.phase === 'boss' ? (T.boss && T.boss.etat === 'arrivee' ? 1 - lisse(T.boss.pt / CFG.boss.arrivee) : 0) : T.descT >= 0 ? -1 + lisse(T.descT / 3.5) : (T.sec >= 5 ? 0 : (T.sec >= 1 ? -1 : -2));
    for (var k = -1; k <= 1; k++) rectT(gx - 3, gy + (k + 1) * 6, 7, 1, k === 0 ? P.acier : P.ardoise);
    pt(gx - 5, gy + 6, P.cyan); pt(gx - 6, gy + 6, P.cyan);
    if (pz > -1.5) { var my = gy + 6 - Math.round(pz * 6); rectT(gx + 5, my - 1, 2, 3, (f >> 3) & 1 ? P.magenta : P.rose); }
    /* l'amiral : sa jauge */
    var b = T.boss;
    if (b && (b.etat === 'p1' || b.etat === 'p2' || b.etat === 'transition')) {
      var tot = 0, rest = 0;
      for (k = 0; k < b.parts.length; k++) { var p = b.parts[k]; if (b.etat === 'p1' ? p.type !== 'coeur' : p.type === 'coeur') { tot += p.pvMax; rest += Math.max(0, p.pv); } }
      var etroit = T.W < 320, bw = etroit ? x1 - x0 - pw - 22 : Math.min(150, Math.round(T.W * 0.42)), bx = etroit ? x0 + pw + 8 : Math.round((T.W - bw) / 2), by = etroit ? y0 + 12 : y0 + 1;
      var lb = etroit ? null : texte('AMIRAL', null, 0, P.os, 1);
      if (lb) g.blit(lb, bx - lb.w - 3, by);
      rectT(bx - 1, by - 1, bw + 2, 9, P.np); rectT(bx, by, bw, 7, P.sang, 0.5);
      var fw = Math.round(bw * (tot ? rest / tot : 0));
      rectT(bx, by, fw, 7, b.etat === 'p2' ? P.jaune : P.magenta); rectT(bx, by + 5, fw, 2, b.etat === 'p2' ? P.ambre : P.sang);
      for (k = 1; k < 4 && b.etat === 'p1'; k++) rectT(bx + Math.round(bw * k / 4), by, 1, 7, P.np);
      /* les flèches vers les points faibles hors de l'écran */
      for (k = 0; k < b.parts.length; k++) {
        var q = b.parts[k]; if (!vivant(q)) continue;
        var e = ecran(q.x, q.y), ex = e.x, ey = e.y;
        if (ex >= 6 && ey >= 6 && ex < T.W - 6 && ey < T.H - 6) continue;
        var ax = clamp(ex, x0 + 8, x1 - 8), ay = clamp(ey, y0 + 30, y1 - 8), aa = Math.atan2(ey - ay, ex - ax);
        fleche(ax, ay, aa, (f >> 3) & 1 ? P.magenta : P.rose);
      }
    }
    /* l'annonce d'une escadrille : chevrons au bord d'où elle vient */
    if (W.phase === 'annonce') {
      var cote = W.cote, on = ((f >> 3) & 1) === 0;
      for (k = 0; k < 3; k++) {
        var c2 = on ? P.magenta : P.jaune, d = 6 + k * 6, cx = cote === 1 ? x1 - d : cote === 3 ? x0 + d : T.W / 2 + (k - 1) * 10, cy = cote === 0 ? y0 + 30 + d : cote === 2 ? y1 - d : T.H / 2;
        if (cote === 0 || cote === 2) cx = T.W / 2 + (k - 1) * 12;
        if (cote === 1 || cote === 3) cy = T.H / 2;
        fleche(cx, cy, cote === 0 ? Math.PI / 2 : cote === 1 ? Math.PI : cote === 2 ? -Math.PI / 2 : 0, c2);
      }
    }
    /* le warp : la lunette et le compteur */
    if (W.phase === 'entree' || W.phase === 'visee') {
      var lx = W.cur.x, ly = W.cur.y, rr = 7 + (W.sous ? Math.max(0, 1 - W.sousT / CFG.warp.attente) * 4 : 3), rot = W.t * 2;
      for (k = 0; k < 4; k++) {
        var a = rot + k * 1.5708, px = lx + Math.cos(a) * rr, py = ly + Math.sin(a) * rr;
        ligne(px, py, px + Math.cos(a + 2.2) * 4, py + Math.sin(a + 2.2) * 4, W.sous ? P.jaune : P.os);
        ligne(px, py, px + Math.cos(a - 2.2) * 4, py + Math.sin(a - 2.2) * 4, W.sous ? P.jaune : P.os);
      }
      pt(lx, ly, P.os); pt(lx - 3, ly, P.acier); pt(lx + 3, ly, P.acier); pt(lx, ly - 3, P.acier); pt(lx, ly + 3, P.acier);
      var lab = 'WARP  ' + W.verrous.length + '/' + CFG.warp.verrous, tw = lab.length * 6;
      var cy2 = T.H > T.W ? Math.round(T.H * 0.78) : y1 - 9;
      texte(lab, Math.round(T.W / 2 - tw / 2), cy2, W.verrous.length ? P.jaune : P.os, 1);
      var jw = 60, jx = Math.round(T.W / 2 - jw / 2), rest2 = W.phase === 'visee' ? 1 - W.pt / CFG.warp.visee : 1;
      rectT(jx, cy2 - 3, Math.round(jw * rest2), 1, P.acier);
    }
    /* le message du moment, avec sa ligne de sous-titre */
    if (T.msg && T.msgT < T.msgD) {
      var big = T.msg === '2975', kk = big ? (T.H >= 300 ? 5 : 4) : 2, my2 = Math.round(T.H * (big ? 0.26 : 0.3));
      var sp = null;
      if (big) {
        var nn = Math.min(4, Math.floor(T.msgT / 0.12) + 1), sub = '2975'.slice(0, nn);
        sp = texteCentre(sub, T.W / 2 - (4 - nn) * 3 * kk, my2, P.jaune, kk, T.W - 10);
      } else if (!(T.msgT > T.msgD - 0.4 && (f & 4))) sp = texteCentre(T.msg, T.W / 2, my2, P.os, kk, T.W - 12);
      if (T.msg2 && T.msgT > 0.35) texteCentre(T.msg2, T.W / 2, my2 + (sp ? sp.h : 7 * kk + 2) + 5, big ? P.os : P.acier, 1, T.W - 8);
    }
  }
  function fleche(x, y, a, c) {
    var ca = Math.cos(a), sa = Math.sin(a);
    QX[0] = x + ca * 4; QY[0] = y + sa * 4; QX[1] = x - ca * 3 - sa * 4; QY[1] = y - sa * 3 + ca * 4; QX[2] = x - ca * 1; QY[2] = y - sa * 1; QX[3] = x - ca * 3 + sa * 4; QY[3] = y - sa * 3 - ca * 4;
    garderContour(4); poly(4, c); contour(4, P.np);
  }

  /* ================================ l'interface publique ================================ */
  N.cosmos = {
    start: start, update: update, draw: draw,
    actif: function () { return T.on; },
    filmActif: filmActif,
    phase: function () { return T.phase; },
    stop: function () {
      arreterFilmAmiral();
      T.on = false; T.phase = 'fini'; T.finAppele = true;
      if (A.out && A.ctx) { try { A.out.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.05); } catch (e) { } }
    },
    /* skip, progressif : avant l'amiral → l'amiral ; pendant l'amiral → son explosion ; pendant l'explosion →
       l'épilogue ; pendant l'épilogue → la fin (surFin, une seule fois) ; après, rien */
    skip: function () {
      if (!T.on) return false;
      if (filmAmiralOn) return false; // un saut d'époque ne franchit pas le film
      if (T.phase === 'entree' || T.phase === 'voyage') return sauter();
      if (T.phase === 'boss') {
        var b = T.boss; if (!b) return false;
        if (b.etat === 'arrivee') { b.s = 1; b.x = b.xF; b.y = b.yF; placerBoss(b); }
        if (b.etat !== 'mort') { W.phase = 'repos'; W.file.length = 0; T.f = 1; journal('saut explosion'); mortBoss(); }
        return true;
      }
      if (T.phase === 'explosion') { journal('saut epilogue'); epilogue(); return true; }
      if (T.phase === 'epilogue') { T.phase = 'fini'; journal('saut fin'); finir(); return true; }
      return false;
    },
    state: function () {
      var b = T.boss, i, e;
      var ens = [];
      for (i = 0; i < T.E.length; i++) { e = T.E[i]; ens.push({ k: e.k, x: +e.x.toFixed(1), y: +e.y.toFixed(1), vx: +(e.vx || 0).toFixed(1), vy: +(e.vy || 0).toFixed(1), r: e.k === 'epave' ? e.l * 0.5 : e.r, a: e.a, pv: e.pv }); }
      var segs = []; for (i = 1; i < T.nseg; i += 2) { var p = seg(i); segs.push([+p[0].toFixed(1), +p[1].toFixed(1)]); }
      return {
        phase: T.phase, t: +T.t.toFixed(2), pt: +T.pt.toFixed(2), vt: +T.vt.toFixed(2), section: T.sec, qui: T.qui, score: T.score, morts: T.morts,
        f: +T.f.toFixed(3), tete: [T.hx, T.hy], cap: T.cap, vitesse: CFG.vitesse, virage: CFG.virage, nseg: T.nseg, segments: segs, mort: T.mort, invul: T.invul > 0,
        cam: [T.cx, T.cy], W: T.W, H: T.H,
        ennemis: ens, balles: T.EB.map(function (q) { return [q.x, q.y, q.vx, q.vy]; }),
        obus: T.obus.map(function (o) { return { x: o.x, y: o.y, reste: o.d - o.t }; }),
        rayons: T.rayons.map(function (r) { return { x: r.x, y: r.y, a: r.a, l: r.l, w: r.w, actif: r.t >= r.tel, reste: r.tel - r.t, balaye: r.balaye, act: r.act }; }),
        cellules: T.cellules.map(function (c) { return [c.x, c.y]; }),
        profond: T.prof.length, descente: T.descT,
        boss: b ? { etat: b.etat, pt: +b.pt.toFixed(2), x: b.x, y: b.y, a: b.a, L: b.L, arene: b.arene, aide: b.aide,
          parts: b.parts.map(function (p) { return { type: p.type, x: p.x, y: p.y, r: p.r, pv: +p.pv.toFixed(1), mort: p.mort, actif: p.actif }; }),
          coque: b.coque.map(function (c) { return [c.x, c.y, c.r]; }) } : null,
        warp: { phase: W.phase, externe: W.ext, k: +W.k.toFixed(2), verrous: W.verrous.length, cur: [W.cur.x, W.cur.y], n: W.n, file: W.file.length },
        missiles: T.mis.length, detone: T.detone,
        compte: JSON.parse(JSON.stringify(T.compte)), premiereExplosion: T.premiereExplosion, instants: JSON.parse(JSON.stringify(T.instants)),
        audio: !!A.ctx, musique: { section: A.sec, tempo: +A.tempo.toFixed(1), demi: A.demi, mesure: A.mes, notes: JSON.parse(JSON.stringify(A.notes)) },
        portrait: !!PORT, nebuleuse: NEB_L >= NEB_N,
        journal: T.journal.slice()
      };
    },
    CFG: CFG
  };
})();
