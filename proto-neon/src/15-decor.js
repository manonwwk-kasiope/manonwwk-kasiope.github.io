/* ===== 15-decor.js — le décor lumineux : plans de parallaxe, sol en perspective, quartiers, états =====

   REFONTE.md § 3.4 (les plans), § 3.5 (le sol ligne par ligne), § 3.6 (quartiers et états), § 5.2 (lumière),
   § 7.8 (interface), § 7.11 (budget : 1,5 ms par image, sol compris).

   LA LUMIÈRE VIENT DU DÉCOR. Un grand soleil en bandes (jaune, ambre, brasier), une cité dont les enseignes
   tournent et dont les étages sont allumés, une bande d'horizon embrasée, un sol qui reflète le soleil et la
   cité : au moins 25 % des pixels du tampon sont « lumineux » (luminance relative > 0,10, N.pal.L) dès la
   première seconde. Le décor se tait par la forme (grandes surfaces calmes, tramages) et par le contour, jamais
   en s'éteignant : le jeu qui passe devant est cyan, magenta et os, jamais jaune tramé à 50 %.
   En jeu, cette lumière reste au lointain ; les structures, le premier plan et le sol du plateau
   passent par une table nuit/ardoise, afin de réserver les encres chaudes aux acteurs (codex-01).

   Les plans, du plus loin au plus proche, avec leur facteur de parallaxe (fraction du déplacement de la caméra) :
       P0 ciel 0 / 0,02   P1 étoiles 0,03 / 0,05   P2 soleil et montagnes 0,08 / f_h   P3 cité 0,20 / f_h
       P4 brume 0,35 / 0,40 (+ dérive de 4 px/s)   P5 structures 0,60 / 0,60   SOL  f_h à 1,0 (de l'horizon au bas)
       PLATEAU 1 / 1   P6 premier plan 1,4 / 1,4
   f_h est le facteur vertical de l'horizon : y_h = ⌊h × (0,80 − 0,42 c)⌋ en paysage, ⌊h × (0,62 − 0,20 c)⌋ en
   portrait, c = position verticale de la caméra entre 0 et 1. Les images de plans sont préparées une fois par
   quartier (par tranches : preparer()) ; chaque image ne fait que copier des rangées (N.gfx.layer) avec une table
   de couleurs : le cyclage des enseignes, l'allumage des fenêtres par rangées et l'éclipse sont des tables.
   Les images portent des INDEX-ÉTIQUETTES (magenta, rose pâle, cyan, cyan pâle) que la table remplace avant
   l'écran : aucun de ces quatre index n'arrive jamais à l'écran depuis le décor (cyan interdit, magenta et rose
   pâle réservés aux murs du plateau).

   INTERFACE (N.decor) — rien ne s'appelle au chargement :
       build()                    branche les événements (vague, vol, inversion, phase) ; idempotent
       etat(nom)                  'calme'|'montee'|'chaos'|'inversion'|'colosse'|'victoire' ; sans argument : l'état
       quartier(nom)              'docks'|'artere'|'centrale'|'ciel'|'tours'|'coeur'|'eclipse' ; balayage tramé de 0,5 s
       preparer(nom)              précalcul par tranches (une par image) pendant LE VOL qui mène à ce quartier
       drawFar(cam)               P0..P5 et le sol, en ESPACE ÉCRAN (origine (0,0)) : à appeler après N.gfx.clear
       drawPlateau(cam)           grille holographique et murs, en espace MONDE (origine (cam.x, cam.y))
       drawFront(cam)             P6 et braises, en espace MONDE, avant les entités
       ondule(x,y,force)          la grille ondule autour d'une explosion        fenetres()  rangées de fenêtres allumées
       eclair()                   un éclair sur l'horizon                         eclipse(t)  0..1 : l'éclipse du CYCLOPE
       silhouette(nom,plan,x,y,k) silhouettes du CYCLOPE dans P2 et P5            horizon() -> rangée écran de l'horizon
       drawVol(o)                 le fond du VOL (voir 17-vol.js)                 masqueCite(nom) -> Uint8Array (tests)
       acceler(k)                 multiplie la vitesse du sol (la plongée) ; fixer(q,e) pose un quartier sans balayage (essais)
   Le temps est celui du jeu (N.horloge.t()) : pause et gel arrêtent le décor ; mouvement réduit : tout s'immobilise
   (prefers-reduced-motion, ou SECOUSSE à 0), sauf la lumière.
*/
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ les chiffres (→ N.R.decor) ================================ */
  function RD() { return (N.R && N.R.decor) || {}; }
  var CW = 640, CH = 96;                  // → N.R.decor.plans.P3.prolonge : la cité, bouclée à 640 px de large
  var SW = 448, SHT = 76;                 // les structures : une bande de 448 × 76
  var MW = 512, MH = 44;                  // les montagnes (512 de large, comme `horizon`)
  var MISTW = 512, MISTH = 30;
  var P6W = 512, P6H = 18;
  var K_SOL = 900;                        // → N.R.decor.sol.K
  var PAS_X = 32, PAS_Z = 24;             // → N.R.decor.sol.pasLongitudinal / pasTransversal
  var F_P2 = 0.08, F_P3 = 0.20, F_P4X = 0.35, F_P4Y = 0.40, F_P5 = 0.60, F_P6 = 1.4, F_P1X = 0.03, F_P1Y = 0.05;
  var MONDE_H = 512;                      // → N.R.monde.H
  var FOND = 14;                          // rangées de l'horizon embrasé (seize dans la spec : 14 + la ligne et la brume)

  /* ================================ la palette, résolue une fois ================================ */
  var C = null, lutCalmeJeu = null, lutLointainJeu = null, lutAccentJeu = null;
  function pal() {
    if (C) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    C = { V: I('vide'), NU: I('nuit'), AR: I('ardoise'), VI: I('violet'), IN: I('indigo'), MA: I('magenta'), RO: I('rosePale'),
      CY: I('cyan'), CP: I('cyanPale'), AM: I('ambre'), JA: I('jaune'), BR: I('brasier'), OS: I('os'), AC: I('acier'),
      SA: I('sang'), NP: I('nuitProfonde') };
    /* Deux crans au moins, et désaturation : jaune/ambre/os/acier → ardoise, brasier → nuit.
       Indigo/violet/sang → nuit, ardoise → nuit profonde. Pas d'alpha ni d'encre nouvelle. */
    lutCalmeJeu = new Uint8Array([C.V, C.NP, C.NP, C.NU, C.NU, C.AR, C.AR, C.AR,
      C.AR, C.AR, C.AR, C.NU, C.AR, C.AR, C.NU, C.NP]);
    /* Arbitrage Claude : le lointain baisse et se refroidit pendant le jeu. Acier remplace les
       grandes surfaces chaudes ; une braise sur seize garde la teinte du soleil, sans aplat chaud. */
    lutLointainJeu = mk();
    lutLointainJeu[C.JA] = lutLointainJeu[C.AM] = lutLointainJeu[C.BR] = lutLointainJeu[C.OS] = C.AC;
    lutAccentJeu = mk(lutLointainJeu);
    lutAccentJeu[C.JA] = C.AM; lutAccentJeu[C.AM] = C.BR; lutAccentJeu[C.BR] = C.BR;
    return true;
  }

  function enJeu() {
    if (!N.game || !N.game.etat) return false;
    var e = N.game.etat();
    return e === 'jeu' || e === 'nettoyage' || e === 'alerte' || e === 'boss' || e === 'reapparition' || e === 'mort';
  }

  /* ================================ outils ================================ */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function newImg(w, h) { return { w: w, h: h, data: new Uint8Array(w * h) }; }
  /* flux cosmétique à graine : N.rng.flux si le socle existe, sinon une suite locale. Jamais Math.random. */
  function flux(seed) {
    if (N.rng && N.rng.flux) { try { return N.rng.flux(seed | 0, 'decor'); } catch (e) { /* repli */ } }
    var s = ((seed | 0) >>> 0) || 1;
    var f = function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    return { f: f, i: function (a, b) { return a + ((f() * (b - a + 1)) | 0); }, r: function (a, b) { return a + (b - a) * f(); } };
  }
  /* poses dans une image avec bouclage en x */
  function fr(img, x, y, w, h, c) {
    var W = img.w, H = img.h, d = img.data;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (w <= 0 || h <= 0) return;
    var y0 = y < 0 ? 0 : y, y1 = y + h > H ? H : y + h;
    for (var yy = y0; yy < y1; yy++) { var o = yy * W; for (var xx = x; xx < x + w; xx++) d[o + (((xx % W) + W) % W)] = c; }
  }
  function fp(img, x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (y < 0 || y >= img.h) return;
    img.data[y * img.w + (((x % img.w) + img.w) % img.w)] = c;
  }
  /* rectangle tramé (la trame de Bayer ancrée à l'image) */
  function fd(img, x, y, w, h, c, t) {
    var B = N.pal.BAYER, lim = t * 16;
    for (var yy = Math.max(0, y); yy < Math.min(img.h, y + h); yy++)
      for (var xx = x; xx < x + w; xx++) if (lim > B[((yy & 3) << 2) | (xx & 3)]) fp(img, xx, yy, c);
  }
  function fline(img, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, g = dx + dy + 4;
    for (;;) {
      fp(img, x0, y0, c);
      if ((x0 === x1 && y0 === y1) || --g < 0) break;
      var e2 = err + err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function ffill(img, x, y, r, c) { for (var yy = -r; yy <= r; yy++) { var w = Math.round(Math.sqrt(r * r - yy * yy)); fr(img, x - w, y + yy, 2 * w + 1, 1, c); } }

  /* ================================ les quartiers (§ 3.6) ================================
     Chaque quartier change la silhouette de la cité (P3), les structures (P5), la hauteur du soleil, le ciel et une
     table de couleurs. sun : hauteur du soleil (1 = posé sur l'horizon, entier) ; ciel : intensité des tramages
     brasier/ambre/sang de l'horizon ; remap : table de couleurs des fenêtres (étiquettes 9 et 10). */
  var QU = {
    docks:    { nom: 'LES DOCKS', seed: 1101, sun: 1.12, ciel: { br: 0.6, am: 0.34, sa: 1.0, haut: 38 }, fen: 0.95, bande: 3, miroir: 0.9,
                ville: { wMin: 14, wMax: 38, env: [13, 13, 13, 13], ecartMin: -2, ecartMax: 3, toit: 'conteneurs', enseignes: 6 },
                struct: ['grue', 'portique', 'grue', 'conteneurs'], remap: { 9: 'AM', 10: 'JA' }, cyc: ['SA', 'BR', 'AM', 'JA'], montagnes: 0.6 },
    artere:   { nom: "L'ARTÈRE", seed: 2202, sun: 0.95, ciel: { br: 0.66, am: 0.42, sa: 1.1, haut: 40 }, fen: 0.95, bande: 3, miroir: 0.7,
                ville: { wMin: 10, wMax: 24, env: [62, 54, 12, 10], ecartMin: -1, ecartMax: 2, toit: 'tour', enseignes: 18, monorail: true },
                struct: ['pylone', 'panneau', 'pylone', 'panneau', 'rail'], remap: { 9: 'AM', 10: 'JA' }, cyc: ['SA', 'BR', 'AM', 'JA'], montagnes: 0.4 },
    centrale: { nom: 'LA CENTRALE', seed: 3303, sun: 0.88, ciel: { br: 0.86, am: 0.34, sa: 1.4, haut: 44 }, fen: 1.0, bande: 3, miroir: 0.8,
                ville: { wMin: 18, wMax: 40, env: [10, 10, 12, 60], ecartMin: 0, ecartMax: 5, toit: 'reacteur', enseignes: 8 },
                struct: ['cheminee', 'conduite', 'cheminee', 'cheminee', 'conduite'], remap: { 9: 'BR', 10: 'AM' }, cyc: ['SA', 'BR', 'BR', 'AM'], montagnes: 0.5 },
    ciel:     { nom: 'LE CIEL', seed: 4404, sun: 1.45, ciel: { br: 0.62, am: 0.55, sa: 0.8, haut: 36 }, fen: 0.45, bande: 2, miroir: 0.4, etoiles: 120,
                ville: { wMin: 6, wMax: 14, env: [5, 5, 5, 5], ecartMin: 0, ecartMax: 4, toit: 'plat', enseignes: 3 },
                struct: ['nuage', 'nuage', 'nuage', 'nuage', 'nuage', 'nuage', 'nuage', 'nuage', 'nuage'], remap: { 9: 'AM', 10: 'JA' }, cyc: ['SA', 'BR', 'AM', 'JA'], montagnes: 0.0 },
    tours:    { nom: 'LES TOURS', seed: 5505, sun: 0.78, ciel: { br: 0.7, am: 0.42, sa: 1.3, haut: 46 }, fen: 1.0, bande: 3, miroir: 0.7,
                ville: { wMin: 9, wMax: 20, env: [84, 88, 86, 82], ecartMin: -1, ecartMax: 2, toit: 'antenne', enseignes: 10 },
                struct: ['antenne', 'projecteur', 'antenne', 'projecteur'], remap: { 9: 'JA', 10: 'AM' }, cyc: ['SA', 'AM', 'JA', 'BR'], montagnes: 0.3 },
    coeur:    { nom: 'LE CŒUR', seed: 6606, sun: 0.62, ciel: { br: 0.85, am: 0.12, sa: 1.6, haut: 50 }, fen: 0.9, bande: 3, miroir: 0.9,
                ville: { wMin: 12, wMax: 30, env: [8, 12, 62, 8], ecartMin: -2, ecartMax: 2, toit: 'tour', enseignes: 12, centrale: true },
                struct: ['monolithe', 'monolithe', 'eclair', 'monolithe'], remap: { 9: 'BR', 10: 'AM' }, cyc: ['SA', 'BR', 'BR', 'AM'], montagnes: 0.5 },
    eclipse:  { nom: "L'ÉCLIPSE", seed: 7707, sun: 1.0, ciel: { br: 0.7, am: 0.0, sa: 1.8, haut: 50 }, fen: 0.7, bande: 3, miroir: 0.6,
                ville: { wMin: 6, wMax: 14, env: [26, 32, 28, 32], ecartMin: 8, ecartMax: 26, toit: 'tour', enseignes: 6 },
                struct: ['monolithe', 'cheminee', 'monolithe', 'cheminee'], remap: { 9: 'BR', 10: 'AM' }, cyc: ['SA', 'BR', 'SA', 'BR'], montagnes: 0.5 }
  };
  var QNOMS = ['docks', 'artere', 'centrale', 'ciel', 'tours', 'coeur', 'eclipse'];

  /* les états (§ 3.6) : ce que la tension change à l'intérieur d'un quartier */
  var ET = {
    calme:     { sun: 1.00, ciel: 1.00, avance: 1.0, signs: 1, fen: 1.00, lignes: 0, blink: 0, braises: 0, eclairs: 0, rank: 0 },
    montee:    { sun: 0.86, ciel: 1.30, avance: 1.0, signs: 2, fen: 1.12, lignes: 1, blink: 0, braises: 0, eclairs: 0, rank: 1 },
    chaos:     { sun: 0.62, ciel: 1.65, avance: 2.0, signs: 3, fen: 1.25, lignes: 2, blink: 1, braises: 1, eclairs: 1, rank: 2 },
    inversion: { sun: 0.96, ciel: 1.40, avance: 1.0, signs: 2, fen: 1.15, lignes: 1, blink: 0, braises: 0, eclairs: 0, rank: 1, pulse: 1 },
    colosse:   { sun: 1.00, ciel: 1.75, avance: 1.0, signs: 1, fen: 0.80, lignes: 1, blink: 0, braises: 1, eclairs: 0, rank: 2, eclipse: 1 },
    victoire:  { sun: 1.10, ciel: 1.05, avance: 0.5, signs: 1, fen: 1.00, lignes: 0, blink: 0, braises: 0, eclairs: 0, rank: 0 }
  };

  /* ================================ les images, par quartier ================================ */
  var cache = { ville: {}, struct: {}, mont: {}, sky: {}, floor: {}, mist: null, p6: null, cles: '' };
  var vueW = 0, vueH = 0;

  /* l'enveloppe des hauteurs d'un quartier : quatre points, interpolés, périodiques sur la largeur de la cité. Elle donne
     à chaque quartier sa silhouette (qui est haut, où) : deux quartiers n'ont jamais la même, IoU des masques < 0,5. */
  function envAt(env, x) {
    var p = (((x % CW) + CW) % CW) / CW * 4, i0 = Math.floor(p), f = p - i0;
    return env[i0 & 3] + (env[(i0 + 1) & 3] - env[i0 & 3]) * f;
  }
  /* ---- P3 : la cité, 640 × 96, bouclée ---- */
  function buildVille(q) {
    var Q = QU[q], V = Q.ville, r = flux(Q.seed), img = newImg(CW, CH), base = CH - 1;
    var fenP = Q.fen, band = Q.bande;
    /* une passe de fond (nuit), une passe de devant (ardoise) : deux profondeurs, la cité n'est pas un mur */
    for (var pass = 0; pass < 2; pass++) {
      var x = -r.i(0, 18);
      var corps = pass === 0 ? C.NU : C.AR;
      while (x < CW) {
        var w = r.i(V.wMin, V.wMax), h = Math.max(4, Math.round(envAt(V.env, x + (w >> 1)) * r.r(0.78, 1.22)));
        if (pass === 0) h = Math.round(h * 0.78) + 3;
        if (V.centrale && pass === 1 && x > CW / 2 - 70 && x < CW / 2 + 40) h = r.i(60, 90);
        h = Math.min(h, CH - 2);
        batiment(img, r, x, base, w, h, corps, pass, V, fenP, band);
        x += w + r.i(V.ecartMin, V.ecartMax);
      }
    }
    if (V.centrale) tourCentrale(img, r, (CW >> 1) - 12, base);
    if (V.monorail) { var ry = base - 22; fr(img, 0, ry, CW, 2, C.IN); fr(img, 0, ry + 2, CW, 1, C.VI);
      for (var px = 6; px < CW; px += 30) fr(img, px, ry + 3, 2, 12, C.IN); }
    return img;
  }
  function batiment(img, r, x, base, w, h, corps, pass, V, fenP, band) {
    var top = base - h + 1;
    fr(img, x, top, w, h, corps);
    fr(img, x + w - 1, top, 1, h, pass ? C.IN : C.AR);                   // arête éclairée : le côté droit
    fr(img, x, top, w, 1, pass ? C.VI : C.IN);                           // la ligne de toit
    var toit = V.toit;
    if (toit === 'conteneurs') {                                         // piles de conteneurs : bandes de couleurs sourdes
      for (var cy = top; cy < base; cy += 5) { var cc = ((cy + x) & 1) ? C.IN : C.AR; fr(img, x + 1, cy, w - 2, 4, pass ? cc : C.NU); fr(img, x + 1, cy + 4, w - 2, 1, C.NP); }
      if (r.f() < 0.5) fr(img, x + r.i(1, w - 3), top - 6, 2, 6, C.IN);
    } else if (toit === 'tour' || toit === 'antenne') {
      if (w > 12 && h > 30 && r.f() < 0.6) { fr(img, x + 3, top - 5, w - 6, 5, corps); fr(img, x + 3, top - 5, w - 6, 1, C.VI); }
      if (toit === 'antenne' || r.f() < 0.3) { var ax = x + (w >> 1), ah = r.i(8, 18); fr(img, ax, top - ah, 1, ah, C.VI); fp(img, ax, top - ah - 1, 6); }
    } else if (toit === 'reacteur') {
      if (w > 18) { ffill(img, x + (w >> 1), top, w >> 1, corps); fr(img, x, top, w, 1, C.NU); fr(img, x + (w >> 1) - 2, top - (w >> 1) - 1, 1, 1, C.VI); }
      if (r.f() < 0.4) { fr(img, x + w - 6, top - r.i(12, 26), 4, 40, C.IN); }
    } else if (toit === 'plat') { /* le CIEL : une cité lointaine, vue d'en haut, quasi plate */ }
    /* les étages allumés : trois rangées sur quatre, trame d'échiquier (50 %), piliers tous les 6 px */
    var litProb = fenP, ph = r.i(0, 3);
    for (var fy = top + 3; fy < base - 1; fy += 4) {
      for (var k = 0; k < band; k++) {
        var yy = fy + k; if (yy >= base) break;
        for (var xx = x + 1; xx < x + w - 1; xx++) {
          if (((xx - x + ph) % 6) === 5) continue;                       // pilier
          if (((xx + yy) & 1) !== 0) continue;                           // trame d'échiquier : 50 %, jamais un plein
          var cell = ((xx - x + ph) / 3) | 0;
          var u = ((Math.imul(cell + 1, 2654435761) ^ Math.imul(fy + 7, 40503) ^ Math.imul(x + 3, 9973)) >>> 0) / 4294967296;
          if (u > litProb) continue;
          var tag = u < litProb * 0.50 ? 9 : (u < litProb * 0.72 ? 10 : (u < litProb * 0.88 ? 7 : 8));
          fp(img, xx, yy, tag);
        }
      }
    }
    /* enseignes : bandes verticales de néon sur l'arête, étiquettes 5 et 6 (le cyclage les fait tourner) */
    if (pass === 1 && V.enseignes && r.f() < V.enseignes / 20 * 3) {
      var sh = r.i(8, Math.max(9, Math.min(h - 6, 28))), sx = x + (r.f() < 0.5 ? 0 : w - 2), st = r.i(top + 2, Math.max(top + 3, base - sh - 2));
      fr(img, sx, st, 2, sh, r.f() < 0.5 ? 5 : 6);
      if (r.f() < 0.4) fr(img, x + 2, top + 2, Math.max(3, w - 5), 2, r.f() < 0.5 ? 5 : 6);   // panneau en travers
    }
  }
  function tourCentrale(img, r, x, base) {                              // LE CŒUR : la tour d'`exterieur`, en grand
    var w = 26, h = 92, top = base - h + 1;
    fr(img, x, top, w, h, C.AR); fr(img, x + 3, top - 8, w - 6, 8, C.AR); fr(img, x + 8, top - 14, w - 16, 6, C.AR);
    fr(img, x, top, 1, h, C.VI); fr(img, x + w - 1, top, 1, h, C.IN); fr(img, x + 12, top - 22, 2, 8, C.VI);
    fr(img, x + 12, top - 25, 2, 2, 8);
    for (var fy = top + 2; fy < base; fy += 4) { for (var xx = x + 2; xx < x + w - 2; xx += 2) if (((xx + fy) & 3) === 0) fp(img, xx, fy, 9); fr(img, x + 12, fy, 2, 2, ((fy >> 2) & 1) ? 5 : 6); }
  }

  /* ---- P2 : les montagnes, 512 × 44 : deux chaînes, crêtes en sang ---- */
  function buildMont(q) {
    var Q = QU[q], r = flux(Q.seed + 17), img = newImg(MW, MH), amp = Q.montagnes;
    if (!(amp > 0)) return img;
    var p1 = r.r(0, 6.28), p2 = r.r(0, 6.28), p3 = r.r(0, 6.28);
    for (var x = 0; x < MW; x++) {
      var a = (Math.sin(x * 0.021 + p1) * 0.5 + 0.5) * 0.6 + (Math.sin(x * 0.067 + p2) * 0.5 + 0.5) * 0.4;
      var hb = Math.round((6 + a * 24) * amp + 4 * amp);
      var b = (Math.sin(x * 0.031 + p3) * 0.5 + 0.5) * 0.55 + (Math.sin(x * 0.11 + p1) * 0.5 + 0.5) * 0.45;
      var hf = Math.round((2 + b * 14) * amp);
      for (var y = 0; y < hb; y++) fp(img, x, MH - 1 - y, y === hb - 1 ? C.SA : C.IN);
      for (var y2 = 0; y2 < hf; y2++) fp(img, x, MH - 1 - y2, y2 === hf - 1 ? C.SA : C.NU);
    }
    return img;
  }

  /* ---- P4 : la brume, 512 × 30 : bandes de brouillard tramées à 25 % + reflets ambre tramés à 12 % ---- */
  function buildMist() {
    var r = flux(9090), img = newImg(MISTW, MISTH);
    for (var b = 0; b < 3; b++) {
      var y = 4 + b * 8 + r.i(-1, 1), x = r.i(0, MISTW - 1);
      for (var k = 0; k < 7; k++) { var w = r.i(26, 70); fd(img, x, y + r.i(0, 2), w, r.i(4, 8), C.NU, 0.25); x += w - r.i(0, 18); }
    }
    for (var s = 0; s < 14; s++) fd(img, r.i(0, MISTW - 20), MISTH - 12 + r.i(0, 6), r.i(14, 30), r.i(5, 9), C.AM, 0.12);
    return img;
  }

  /* ---- P5 : les structures du quartier, 448 × 76, posées sur le sol ---- */
  function buildStruct(q) {
    var Q = QU[q], r = flux(Q.seed + 31), img = newImg(SW, SHT), base = SHT - 1, list = Q.struct, n = list.length, slot = Math.floor(SW / n);
    var meta = { flammes: [], rails: [], proj: [] };
    for (var i = 0; i < n; i++) {
      var x = i * slot + r.i(6, Math.max(8, slot - 56)), t = list[i];
      if (t === 'grue') grue(img, r, x, base);
      else if (t === 'portique') portique(img, r, x, base);
      else if (t === 'conteneurs') conteneurs(img, r, x, base);
      else if (t === 'pylone') pylone(img, r, x, base);
      else if (t === 'panneau') panneau(img, r, x, base);
      else if (t === 'rail') { fr(img, x - 20, base - 40, 90, 2, C.IN); fr(img, x - 20, base - 38, 90, 1, C.VI); meta.rails.push(base - 41); for (var k = 0; k < 90; k += 18) fr(img, x - 20 + k, base - 37, 2, 38, C.IN); }
      else if (t === 'cheminee') { cheminee(img, r, x, base); meta.flammes.push({ x: x + 5, y: base - 58 }); }
      else if (t === 'conduite') conduite(img, r, x, base);
      else if (t === 'antenne') antenne(img, r, x, base);
      else if (t === 'projecteur') { fr(img, x, base - 8, 8, 8, C.IN); fr(img, x + 1, base - 10, 6, 2, C.AR); fp(img, x + 3, base - 11, 6); meta.proj.push(x + 4); }
      else if (t === 'nuage') nuage(img, r, x, base);
      else if (t === 'monolithe') monolithe(img, r, x, base);
      else if (t === 'eclair') { meta.eclairs = (meta.eclairs || 0) + 1; monolithe(img, r, x + 10, base); }
    }
    img.meta = meta;
    return img;
  }
  function grue(img, r, x, base) {
    var h = r.i(52, 70); fr(img, x, base - h, 3, h, C.IN); fr(img, x, base - h, 1, h, C.VI);
    fr(img, x - 8, base - h, 38, 2, C.AR); fr(img, x - 8, base - h, 38, 1, C.AC);
    fr(img, x - 10, base - h - 1, 5, 6, C.IN); fr(img, x + 28, base - h + 2, 1, 14, C.AC); fr(img, x + 26, base - h + 16, 5, 4, C.IN);
    fp(img, x + 1, base - h - 2, 6); fr(img, x - 3, base - 6, 9, 6, C.AR);
    for (var k = 4; k < h - 2; k += 6) fline(img, x, base - k, x + 2, base - k - 5, C.AR);
  }
  function portique(img, r, x, base) {
    var h = r.i(40, 54); fr(img, x, base - h, 3, h, C.IN); fr(img, x + 34, base - h, 3, h, C.IN); fr(img, x, base - h, 37, 3, C.AR);
    fr(img, x, base - h, 37, 1, C.AC); fr(img, x + 12, base - h + 3, 10, 8, C.AR); fr(img, x + 12, base - h + 3, 10, 1, C.VI);
    fp(img, x + 1, base - h - 1, 5); fp(img, x + 35, base - h - 1, 6);
  }
  function conteneurs(img, r, x, base) {
    for (var c = 0; c < 3; c++) for (var l = 0; l < 3 - c; l++) { var cx = x + c * 14, cy = base - (l + 1) * 9; fr(img, cx, cy, 13, 8, (c + l) & 1 ? C.AR : C.IN); fr(img, cx, cy, 13, 1, C.VI); fr(img, cx + 2, cy + 3, 9, 1, C.NU); }
  }
  function pylone(img, r, x, base) {
    var h = r.i(56, 70); fline(img, x, base, x + 8, base - h, C.VI); fline(img, x + 16, base, x + 8, base - h, C.VI);
    for (var k = 8; k < h; k += 9) { var hw = Math.round(8 * (1 - k / h)); fr(img, x + 8 - hw, base - k, hw * 2 + 1, 1, C.IN); fline(img, x + 8 - hw, base - k, x + 8 + hw, base - k - 8, C.AR); }
    fr(img, x + 1, base - h + 3, 15, 2, C.AC); fp(img, x + 1, base - h + 2, 6); fp(img, x + 15, base - h + 2, 5); fp(img, x + 8, base - h - 1, 6);
  }
  function panneau(img, r, x, base) {
    var w = r.i(24, 34), h = 14, y = base - 30; fr(img, x + 4, y + h, 2, 30 - h, C.IN); fr(img, x + w - 6, y + h, 2, 30 - h, C.IN);
    fr(img, x, y, w, h, C.AR); fr(img, x, y, w, 1, C.AC); fr(img, x, y + h - 1, w, 1, C.VI); fr(img, x + 2, y + 2, w - 4, h - 4, C.NU);
    for (var k = 0; k < w - 6; k += 4) fr(img, x + 3 + k, y + 3 + (k & 4 ? 1 : 0), 3, h - 8, (k >> 2) & 1 ? 5 : 6);
  }
  function cheminee(img, r, x, base) {
    var h = r.i(52, 60); fr(img, x, base - h, 11, h, C.IN); fr(img, x, base - h, 2, h, C.VI); fr(img, x + 10, base - h, 1, h, C.AR);
    for (var k = 6; k < h; k += 9) fr(img, x, base - k, 11, 2, C.AR); fr(img, x - 1, base - h, 13, 3, C.AR); fr(img, x - 1, base - h, 13, 1, C.AC);
    fp(img, x + 5, base - h - 2, 6);
  }
  function conduite(img, r, x, base) {
    fr(img, x, base - 18, 60, 5, C.IN); fr(img, x, base - 18, 60, 1, C.VI); fr(img, x + 12, base - 18, 3, 5, C.AR); fr(img, x + 38, base - 18, 3, 5, C.AR);
    fr(img, x + 8, base - 14, 4, 14, C.IN); fr(img, x + 46, base - 14, 4, 14, C.IN); fr(img, x + 20, base - 30, 12, 12, C.AR); fr(img, x + 20, base - 30, 12, 1, C.VI);
  }
  function antenne(img, r, x, base) {
    var h = r.i(60, 74); fr(img, x + 3, base - h, 1, h, C.VI); fr(img, x + 2, base - h + 8, 3, 1, C.AC); fr(img, x - 2, base - h + 20, 11, 1, C.AR);
    fr(img, x - 1, base - 10, 9, 10, C.IN); fp(img, x + 3, base - h - 1, 5); fp(img, x + 3, base - h + 20, 6);
  }
  function nuage(img, r, x, base) {
    var y = base - r.i(14, 46);
    for (var k = 0; k < 5; k++) fd(img, x + k * 14, y + r.i(-3, 3), r.i(30, 60), r.i(7, 13), C.AR, 0.5);
    for (var k2 = 0; k2 < 3; k2++) fd(img, x + k2 * 16 + 4, y + 8 + r.i(0, 3), r.i(18, 38), 4, C.AM, 0.12);
  }
  function monolithe(img, r, x, base) {
    var h = r.i(54, 70), w = 12; fr(img, x, base - h, w, h, C.AR); fr(img, x, base - h, 2, h, C.VI); fr(img, x + w - 1, base - h, 1, h, C.IN);
    ffill(img, x + (w >> 1), base - h + 14, 9, C.IN); ffill(img, x + (w >> 1) - 2, base - h + 11, 5, C.AR);
    fp(img, x + (w >> 1) + 3, base - h + 17, 10); fp(img, x + (w >> 1) + 4, base - h + 17, 9);
    for (var k = base - h + 30; k < base - 3; k += 6) fr(img, x + 3, k, 6, 1, C.VI);
    fp(img, x + (w >> 1), base - h - 1, 6);
  }

  /* ---- P0 : le ciel, une image par (quartier, état), accrochée à l'horizon (bas de l'image = l'horizon) ---- */
  function buildSky(q, e) {
    var Q = QU[q], E = ET[e], B = N.pal.BAYER, W = vueW, SH = Math.ceil(vueH * 0.82) + 6, img = newImg(W, SH), d = img.data;
    var ck = Q.ciel, kk = E.ciel;
    var brD = Math.min(0.62, ck.br * kk * 0.55), amD = Math.min(0.5, ck.am * kk * 0.42), saD = Math.min(0.95, ck.sa * kk);
    var haut = Math.round(ck.haut * 1.5 * (kk > 1.2 ? 1.25 : 1));
    for (var y = 0; y < SH; y++) {
      var dd = SH - 1 - y;                                       // distance au-dessus de l'horizon
      var nuT = clamp01(0.35 + dd / (SH * 0.45));                // vide en haut, nuit en bas
      var saT = clamp01(1 - dd / (haut * 1.8)) * saD;            // sang tramé, monte haut
      var brT = clamp01(1 - dd / FOND) * brD * 1.1 + clamp01(1 - dd / haut) * brD * 0.35;
      var amT = clamp01(1 - dd / (FOND * 0.7)) * amD + clamp01(1 - dd / (haut * 0.7)) * amD * 0.4 + clamp01(1 - dd / haut) * brD * 0.4 + clamp01(1 - dd / (SH * 0.95)) * Math.min(0.34, brD * 0.4);   // la longue traîne du ciel : de l'ambre tramé, plus clair que le magenta des ennemis
      if (E.eclipse) { saT = clamp01(1 - dd / (haut * 2.2)) * 1.0; amT *= 0.1; }
      var o = y * W, br = (y & 3) << 2, br2 = ((y + 2) & 3) << 2, br3 = ((y + 1) & 3) << 2;
      for (var x = 0; x < W; x++) {
        var c = C.V;
        if (nuT * 16 > B[br | (x & 3)]) c = C.NU;
        if (saT * 16 > B[br2 | ((x + 1) & 3)]) c = C.SA;
        if (brT * 16 > B[br3 | ((x + 2) & 3)]) c = C.BR;
        if (amT * 16 > B[br | ((x + 3) & 3)]) c = C.AM;
        d[o + x] = c;
      }
    }
    return img;
  }
  /* ---- le sol : fond (réflexion de l'horizon) ; les lignes se tracent par image ---- */
  function buildFloor(q, e) {
    var vol = (e === 'vol');                  // le sol du VOL : sombre, pour que sa grille se lise (Space Harrier)
    var Q = QU[q], E = ET[vol ? 'calme' : e], B = N.pal.BAYER, W = vueW, FH = vueH, img = newImg(W, FH), d = img.data;
    var kk = E.ciel, ck = Q.ciel;
    for (var dy = 0; dy < FH; dy++) {
      var inT = 0.12 + 0.28 * clamp01(dy / 90);
      var saT = clamp01(1 - dy / 22) * Math.min(0.9, ck.sa * kk * 0.7);
      var brT = clamp01(1 - dy / 40) * Math.min(0.7, ck.br * kk * 0.7);
      var amT = clamp01(1 - dy / 20) * Math.min(0.5, ck.am * kk * 0.9) + clamp01(1 - dy / (FH * 0.85)) * Math.min(0.30, 0.23 * ck.br * kk);
      if (E.eclipse) { amT = 0; brT *= 0.95; saT = clamp01(1 - dy / 40) * 0.9; }
      if (vol) { amT = clamp01(1 - dy / 6) * 0.4; brT = clamp01(1 - dy / 14) * 0.45; saT = clamp01(1 - dy / 30) * 0.5; inT = 0.1; }
      var jaT = dy === 0 ? 0.5 : 0;
      var o = dy * W, br = (dy & 3) << 2, br2 = ((dy + 2) & 3) << 2, br3 = ((dy + 1) & 3) << 2;
      for (var x = 0; x < W; x++) {
        var c = C.NU;
        if (inT * 16 > B[br | (x & 3)]) c = C.IN;
        if (saT * 16 > B[br2 | ((x + 1) & 3)]) c = C.SA;
        if (brT * 16 > B[br3 | ((x + 2) & 3)]) c = C.BR;
        if (amT * 16 > B[br | ((x + 3) & 3)]) c = C.AM;
        if (jaT * 16 > B[br | (x & 3)]) c = C.JA;
        d[o + x] = c;
      }
    }
    return img;
  }
  /* ---- P6 : poutrelles et câbles du premier plan (silhouettes de nuit profonde tramées à 50 %) ---- */
  function buildP6() {
    var r = flux(6060), img = newImg(P6W, P6H);
    fd(img, 0, 2, P6W, 4, C.NP, 0.5); fr(img, 0, 6, P6W, 1, C.NP);
    for (var x = 0; x < P6W; x += 24) { fline(img, x, 6, x + 12, 13, C.NP); fline(img, x + 12, 13, x + 24, 6, C.NP); }
    for (var s = 0; s < 5; s++) { var x0 = r.i(0, P6W - 80), ww = r.i(50, 90); for (var k = 0; k <= ww; k++) fp(img, x0 + k, 7 + Math.round(Math.sin(k / ww * 3.1416) * 4), C.NP); }
    return img;
  }

  /* ---- les caches, créés à la demande ---- */
  function res(kind, q, e) {
    var box = cache[kind], sub = box[q];
    if (!sub) sub = box[q] = {};
    var k = e || '_', im = sub[k];                      // deux niveaux d'objets : aucune chaîne construite par image
    if (im) return im;
    if (kind === 'ville') im = buildVille(q);
    else if (kind === 'struct') im = buildStruct(q);
    else if (kind === 'mont') im = buildMont(q);
    else if (kind === 'sky') im = buildSky(q, e);
    else if (kind === 'floor') im = buildFloor(q, e);
    return (sub[k] = im);
  }
  /* LE CIEL : une bande de nuages hauts, tramée, qui défile à 0,35 (la cité est loin sous l'horizon, le ciel vit) */
  function buildNuages() {
    var r = flux(4141), img = newImg(MISTW, 64);
    for (var k = 0; k < 14; k++) { var y = r.i(2, 50), x = r.i(0, MISTW - 1), w = r.i(40, 100); fd(img, x, y, w, r.i(7, 14), C.AR, 0.45); fd(img, x + 4, y + 7, w - 10, 3, C.AM, 0.16); }
    return img;
  }
  function nuages() { return cache.nuages || (cache.nuages = buildNuages()); }
  function mist() { return cache.mist || (cache.mist = buildMist()); }
  function p6img() { return cache.p6 || (cache.p6 = buildP6()); }
  function verifierVue() {
    var W = N.gfx.W | 0, H = N.gfx.H | 0;
    if (W === vueW && H === vueH) return;
    vueW = W; vueH = H;
    cache.sky = {}; cache.floor = {};                   // seules les images tributaires de la taille de la vue changent
  }

  /* ================================ l'état courant et les transitions ================================ */
  var cur = { q: 'docks', e: 'calme' };
  var trans = null, reduit = null;
  var avZ = 0, lastT = -1, tDecor = 0, yhRef = 0, yhLast = 0;
  var fenT = 0, eclairT = 0, eclairX = 0.5, eclipseK = 0, fenRanges = 0;
  var ondes = [{ x: 0, y: 0, f: 0, t: -9 }, { x: 0, y: 0, f: 0, t: -9 }, { x: 0, y: 0, f: 0, t: -9 }, { x: 0, y: 0, f: 0, t: -9 },
    { x: 0, y: 0, f: 0, t: -9 }, { x: 0, y: 0, f: 0, t: -9 }];
  var ondeN = 0;
  var scratch = null, tmpLut = null;
  var etapes = [], preparing = '';
  var branche = false, etatAvantInversion = null, accelK = 1;

  function reducedMotion() {
    if (reduit !== null) return reduit;
    reduit = false;
    try { if (typeof window !== 'undefined' && window.matchMedia) reduit = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    return reduit;
  }
  function mouvementCoupe() {
    var S = N.S, r = S && S.reglages;
    if (r && r.secousse === 0) return true;
    return reducedMotion();
  }
  /* le temps du décor : celui du jeu quand l'horloge tourne, sinon le temps de la boucle (essais, écrans) */
  function tempsJeu() {
    var h = N.horloge;
    if (h && typeof h.t === 'function' && h.pas && h.pas() > 0) return h.t();
    return ((N.S && N.S.t) || 0) / 1000;
  }
  var TEMPS = 60 / 144.6;                  // → N.R.horloge.dureeTemps

  function etat(nom) {
    if (nom === undefined) return cur.e;
    if (!ET[nom] || nom === cur.e) return cur.e;
    commencer({ q: cur.q, e: nom });
    return cur.e;
  }
  function quartier(nom) {
    if (nom === undefined) return cur.q;
    if (!QU[nom] || nom === cur.q) return cur.q;
    commencer({ q: nom, e: cur.e });
    return cur.q;
  }
  function commencer(vers) {
    if (!pal() || !N.gfx || !N.gfx.W) { cur.q = vers.q; cur.e = vers.e; return; }
    verifierVue();
    ensure(vers.q, vers.e);
    /* le balayage tramé de 0,5 s : de haut en bas, la matrice de Bayer comme fondu ; l'ancien décor continue de vivre dessous */
    var tr = (RD().transition) || 0.5;
    if (trans && trans.u < 1) trans = { de: trans.vers, vers: vers, t0: tDecor, dur: tr, u: 0 };
    else trans = { de: { q: cur.q, e: cur.e }, vers: vers, t0: tDecor, dur: tr, u: 0 };
    cur.q = vers.q; cur.e = vers.e;
    if (mouvementCoupe()) trans = null;
  }
  function ensure(q, e) { res('ville', q); res('struct', q); res('mont', q); res('sky', q, e); res('floor', q, e); mist(); p6img(); }

  /* précalcul par tranches : une par image (tâche de fond pendant LE VOL) */
  function preparer(q) {
    if (!QU[q] || !pal()) return;
    preparing = q;
    etapes.length = 0;
    etapes.push(function () { res('ville', q); }, function () { res('struct', q); }, function () { res('mont', q); },
      function () { if (vueW) res('sky', q, 'calme'); }, function () { if (vueW) res('floor', q, 'calme'); });
  }
  function tranche() { if (etapes.length) { var f = etapes.shift(); f(); } }

  /* ================================ la lumière du moment ================================ */
  var lutBase = null, lutLit = null, lutDark = null, lutFire = null, lutRows = null, lutP5 = null, lutP5Jeu = null;
  function mk(a) { var t = new Uint8Array(16); for (var i = 0; i < 16; i++) t[i] = a ? a[i] : i; return t; }
  function lumieres() {
    if (lutBase) return;
    lutBase = mk(); lutLit = mk(); lutDark = mk(); lutFire = mk(); lutP5 = mk(); lutP5Jeu = mk(); lutRows = new Array(CH);
    for (var i = 0; i < CH; i++) lutRows[i] = lutBase;
  }
  /* table de couleurs de la cité pour (q, e, t) : enseignes qui tournent, fenêtres qui clignotent */
  function majLuts(q, e, t) {
    lumieres();
    var Q = QU[q], E = ET[e], cyc = Q.cyc;
    var tm = t / TEMPS, ph = Math.floor(tm * E.signs * 0.5);
    if (mouvementCoupe()) ph = 0;
    var rapide = E.pulse ? 2 : 1;
    var a = C[cyc[(ph * rapide) & 3]], b = C[cyc[((ph * rapide) + 2) & 3]];
    var blink = (E.blink && !mouvementCoupe()) ? ((Math.floor(t * 5) & 1) ? C.JA : C.NU) : C.AM;
    var f9 = C[Q.remap[9]], f10 = C[Q.remap[10]];
    for (var i = 0; i < 16; i++) { lutBase[i] = i; lutLit[i] = i; lutDark[i] = i; lutFire[i] = i; lutP5[i] = i; }
    lutBase[5] = a; lutBase[6] = b; lutBase[7] = C.AR; lutBase[8] = E.blink ? blink : (mouvementCoupe() || (Math.floor(t * 1.4) & 1) ? f9 : C.AR); lutBase[9] = f9; lutBase[10] = f10;
    lutLit[5] = a; lutLit[6] = b; lutLit[7] = C.AM; lutLit[8] = C.JA; lutLit[9] = f9; lutLit[10] = f10;
    lutDark[5] = C.NU; lutDark[6] = C.NU; lutDark[7] = (!mouvementCoupe() && (Math.floor(t * 6) & 1)) ? C.BR : C.SA; lutDark[8] = (!mouvementCoupe() && (Math.floor(t * 4) & 1)) ? C.AM : C.BR;
    lutDark[9] = C.NU; lutDark[10] = C.NU; lutDark[12] = C.AR;      // la cité s'éteint ; restent les incendies (étiquettes 7 et 8)
    var mc = mouvementCoupe(), fa = (!mc && (Math.floor(t * 6) & 1)) ? C.BR : C.AM, fb = (!mc && (Math.floor(t * 5 + 1) & 1)) ? C.AM : C.BR;
    lutFire[5] = fa; lutFire[6] = fb; lutFire[7] = fa; lutFire[8] = fb; lutFire[9] = fb; lutFire[10] = fa; lutFire[12] = C.AR;   // les étages qui brûlent
    /* les balises des structures : sang / nuit à la noire, ambre / nuit à contretemps */
    var bt = mouvementCoupe() || (Math.floor(tm * 0.5) & 1) === 0;
    lutP5[5] = bt ? C.SA : C.NU; lutP5[6] = bt ? C.NU : C.AM; lutP5[9] = C.AM; lutP5[10] = C.JA;
    for (var j = 0; j < 16; j++) lutP5Jeu[j] = lutCalmeJeu[lutP5[j]];
    /* par rangée : les fenêtres allumées par les élites (fenetres()), l'éclipse qui éteint la cité rangée par rangée */
    var lit = fenT > 0 ? clamp01(fenT / 1.8) : 0;
    var ek = eclipseK > 0 ? eclipseK : (E.eclipse ? 1 : 0);
    var rowsDark = Math.floor(ek * CH * 1.05);
    for (var r = 0; r < CH; r++) {
      var L = lutBase;
      if (lit > 0 && ((r + fenRanges) % 7) < 3 + 3 * lit) L = lutLit;
      if (r < rowsDark) L = (((r * 3 + fenRanges) % 4) === 0) ? lutFire : lutDark;
      lutRows[r] = L;
    }
  }

  /* ================================ le sol ligne par ligne ================================ */
  /* proj : { sc, scMax, Kz, g0 } — s(dy) = min(dy × sc, scMax), z(dy) = Kz / dy ; g(dy) = g0 + (1 − g0) × min(1, dy / dyB) */
  var P = { sc: 1 / 80, scMax: 1.6, Kz: K_SOL, g0: 0.08, dyB: 80 };
  function sol(buf, W, H, yh, camX, av, e, q, sunX, t, lat, o) {
    var B = N.pal.BAYER, xf = W >> 1;
    var E = ET[e], lignes = E.lignes, pulse = E.pulse ? (((t / TEMPS) % 1) < 0.28) : false;
    var amb = C.AM, bra = C.BR, vio = C.VI, ind = C.IN;
    var rows = H - 1 - yh, rest = !(t > 0) || mouvementCoupe();
    for (var dy = 1; dy <= rows; dy++) {
      var y = yh + dy, ro = y * W;
      if (y >= H) break;
      var s = dy * P.sc; if (s > P.scMax) s = P.scMax;
      var g = P.g0 + (1 - P.g0) * (dy >= P.dyB ? 1 : dy / P.dyB);
      var ink, lim;
      if (dy < 24) { ink = amb; lim = (calmeLumiere(e) ? 0.52 : 0.62) * 16; if (E.eclipse) { ink = C.SA; lim = 0.7 * 16; } }
      else if (dy < 44) { ink = amb; lim = 0.4 * 16; if (lignes > 0) { ink = bra; lim = (0.3 + 0.1 * lignes) * 16; } if (E.eclipse) { ink = C.SA; lim = 0.5 * 16; } }
      else if (dy < 64) { ink = ind; lim = 16; }
      else { ink = vio; lim = 16; if (lignes > 0) { ink = bra; lim = (0.16 * lignes) * 16; } }
      if (pulse && dy > 20) { ink = bra; lim = 0.5 * 16; }
      if (o === 'vol') { ink = dy < 34 ? amb : (dy < 70 ? bra : vio); lim = (dy < 34 ? 0.7 : (dy < 70 ? 0.8 : 1)) * 16; }
      /* la grille transversale : (z + avance) mod 24 < épaisseur */
      if (dy >= 6) {
        var z = P.Kz / dy, ep = P.Kz / (dy * dy) * 1.15;
        if (ep < 0.62 * PAS_Z) {
          var ph = (z + av) % PAS_Z;
          if (ph < ep) {
            var tl = dy < 18 ? lim : 16, ci = dy < 18 ? ink : (dy < 36 ? ink : ink);
            if (dy < 18) tl = lim; else if (lim < 16) tl = lim;
            var br = (y & 3) << 2;
            for (var x = 0; x < W; x++) if (tl > B[br | (x & 3)]) buf[ro + x] = ci;
          }
        }
      }
      /* la grille longitudinale : des lignes du monde, qui convergent vers le point de fuite */
      var sp = PAS_X * s;
      if (sp >= 3.2) {
        var off = camX * g + (lat || 0) * s, n0 = Math.ceil((-xf + off) / sp), n1 = Math.floor((W - 1 - xf + off) / sp);
        var wide = s > 1.25 ? 2 : 1, br2 = (y & 3) << 2;
        for (var n = n0; n <= n1; n++) {
          var lx = Math.round(xf + n * sp - off);
          for (var k = 0; k < wide; k++) { var xx = lx + k; if (xx >= 0 && xx < W && lim > B[br2 | (xx & 3)]) buf[ro + xx] = ink; }
        }
      }
      /* le reflet du soleil : colonne de 24 à 44 px, décalée de ⌊2 sin(y × 0,7 + t × 3)⌉ par rangée */
      if (sunX > -60 && o !== 'vol') {
        if (((dy + Math.floor(rest ? 0 : t * 8)) & 3) !== 3 || dy < 5) {
          var sh = rest ? 0 : Math.round(2 * Math.sin(y * 0.7 + t * 3));
          var hw = 12 + Math.min(10, (dy * 0.34) | 0);
          var rc = E.eclipse ? C.SA : (dy < 14 ? C.JA : (dy < 34 ? amb : bra));
          var rl = (E.eclipse ? 0.45 : (dy < 14 ? 0.82 : (dy < 34 ? 0.66 : 0.44))) * 16;
          var xa = sunX + sh - hw, xb = sunX + sh + hw;
          if (xa < 0) xa = 0; if (xb > W - 1) xb = W - 1;
          var br3 = (y & 3) << 2;
          for (var xr = xa; xr <= xb; xr++) if (rl > B[br3 | (xr & 3)]) buf[ro + xr] = rc;
        }
      }
    }
  }
  function calmeLumiere(e) { return e === 'calme' || e === 'victoire'; }

  /* le reflet de la cité dans le sol : les fenêtres allumées se miroitent, de plus en plus tramées */
  function reflet(buf, W, H, yh, ville, shiftX, luts, k) {
    var B = N.pal.BAYER, rr = Math.min(30, H - 1 - yh), d = ville.data;
    for (var dy = 1; dy <= rr; dy++) {
      var sr = CH - 1 - Math.round(dy * 1.5); if (sr < 0) break;
      var L = luts[sr], y = yh + dy, ro = y * W, so = sr * CW, tl = 0.85 * k * (1 - dy / (rr + 1)) * 16, br = (y & 3) << 2;
      for (var x = 0; x < W; x++) {
        var v = d[so + ((x + shiftX) % CW)];
        if (v < 5) continue;
        var c = L[v];
        if (c === C.AM || c === C.JA || c === C.BR) { if (tl > B[br | (x & 3)]) buf[ro + x] = c; }
      }
    }
  }

  /* ================================ le soleil ================================ */
  var sunR = 0, sunHalf = null;
  function sunTable(R) {
    if (sunR === R && sunHalf) return;
    sunR = R; sunHalf = new Int16Array(2 * R + 1);
    for (var j = 0; j <= 2 * R; j++) { var dj = j - R; sunHalf[j] = Math.round(Math.sqrt(Math.max(0, R * R - dj * dj))); }
  }
  /* le disque en bandes : jaune au sommet, ambre au milieu, brasier en bas, rayures de nuit qui glissent */
  function soleil(buf, W, H, yh, sx, R, kHaut, t, eclipse, e) {
    sunTable(R);
    var B = N.pal.BAYER, cyD = yh - Math.round(R * kHaut), top = cyD - R, D = 2 * R;
    var shift = mouvementCoupe() ? 0 : Math.floor(t / (8 * TEMPS));    // une rangée toutes les 2 mesures (8 temps)
    for (var j = 0; j <= D; j++) {
      var y = top + j;
      if (y < 0) continue;
      if (y > yh) break;
      var hw = sunHalf[j], a = sx - hw, b = sx + hw;
      if (a < 0) a = 0; if (b > W - 1) b = W - 1;
      if (b < a) continue;
      var u = j / D, ro = y * W, c;
      if (eclipse) c = C.NP;
      else {
        if (u < 0.30) c = C.JA;
        else if (u < 0.40) c = (((y & 1) + (a & 1)) & 1) ? C.JA : C.AM;
        else if (u < 0.60) c = C.AM;
        else if (u < 0.70) c = ((y & 1) ? C.AM : C.BR);
        else c = C.BR;
        /* rayures de nuit : de plus en plus épaisses vers le bas, elles glissent d'une rangée toutes les 2 mesures */
        if (u > 0.44) {
          var th = 1 + Math.floor((u - 0.44) / 0.56 * 4), ph2 = ((j - shift) % 8 + 8) % 8;
          if (ph2 < th) c = C.NU;
        }
      }
      buf.fill(c, ro + a, ro + b + 1);
      if (eclipse) {                                                   // cerclé de brasier : le bord du disque
        var edgeL = sx - hw, edgeR = sx + hw;
        for (var k = 0; k < 3; k++) { if (edgeL + k >= 0 && edgeL + k < W) buf[ro + edgeL + k] = C.BR; if (edgeR - k >= 0 && edgeR - k < W) buf[ro + edgeR - k] = C.BR; }
        if (j < 3 || j > D - 3) buf.fill(C.BR, ro + a, ro + b + 1);
      }
    }
    /* la couronne : un anneau tramé autour du disque (halo) */
    var r1 = R + (eclipse ? 9 : 11), r0 = R + 1, lim = (eclipse ? 0.55 : (e === 'chaos' ? 0.6 : 0.45)) * 16, hc = eclipse ? C.BR : (e === 'chaos' ? C.BR : C.AM);
    for (var jj = -r1; jj <= r1; jj++) {
      var yy = cyD + jj; if (yy < 0) continue; if (yy > yh) break;
      var wo = Math.round(Math.sqrt(r1 * r1 - jj * jj)), wi = Math.abs(jj) <= r0 ? Math.round(Math.sqrt(Math.max(0, r0 * r0 - jj * jj))) : -1;
      var br = (yy & 3) << 2, rw = yy * W;
      for (var xx = sx - wo; xx <= sx + wo; xx++) {
        if (xx < 0 || xx >= W) continue;
        if (wi >= 0 && Math.abs(xx - sx) <= wi) continue;
        if (lim > B[br | (xx & 3)]) buf[rw + xx] = hc;
      }
    }
  }

  /* ================================ rendu d'un décor (q, e) ================================ */
  var YH = 0, fhY = 0.26, sunXLast = 0;
  function horizonY(H, camY, portrait) {
    var c = clamp01(camY / Math.max(1, MONDE_H - H));
    var a = portrait ? 0.62 : 0.80, b = portrait ? 0.20 : 0.42;
    var R = RD().horizon; if (R) { var p = portrait ? R.portrait : R.paysage; a = p[0]; b = p[1]; }
    fhY = b * H / Math.max(1, MONDE_H - H);
    return Math.floor(H * (a - b * c));
  }

  function rendreFar(q, e, camX, camY, t) {
    var g = N.gfx, buf = g.buf(), W = g.W, H = g.H, portrait = H > W;
    var Q = QU[q], E = ET[e];
    var yh = horizonY(H, camY, portrait); YH = yh;
    var sky = res('sky', q, e), ville = res('ville', q), mont = res('mont', q), st = res('struct', q), fl = res('floor', q, e);
    majLuts(q, e, t);
    /* P0 : le ciel (recopie de rangées, accroché à l'horizon) */
    g.layer(sky, { x: 0, y: yh - sky.h + 1, opaque: true });
    /* P1 : les étoiles, deux phases de scintillement */
    etoiles(buf, W, H, yh, camX, camY, t, q, e);
    /* P2 : le soleil en bandes (hors portrait : 80 px de diamètre ; portrait : 64) puis les montagnes */
    var R = portrait ? 32 : 40;
    var sx = Math.round(W * 0.62 - F_P2 * camX);
    sunXLast = sx;
    var kHaut = Q.sun * (0.20 + 0.80 * E.sun) * 1.0;
    if (yh - Math.round(R * kHaut) - R < -4) kHaut = (yh + R - 4) / R;      // le disque ne sort pas par le haut de plus de 4 px
    var ecl = E.eclipse ? 1 : (eclipseK > 0 ? 1 : 0);
    var eclP = eclipseK > 0 ? eclipseK : (E.eclipse ? 1 : 0);
    soleil(buf, W, H, yh, sx, R, kHaut, t, eclP > 0.55, e);
    g.layer(mont, { x: -Math.round(camX * F_P2), y: yh - MH + 1, wrapX: true });
    /* P3 : la cité, une table de couleurs par rangée (fenêtres, enseignes, éclipse) */
    g.layer(ville, { x: -Math.round(camX * F_P3), y: yh - CH + 1, wrapX: true, luts: lutRows });
    /* P4 : la brume, dérive de 4 px/s */
    var dr = mouvementCoupe() ? 0 : t * 4;
    g.layer(mist(), { x: -Math.round(camX * F_P4X + dr), y: yh - MISTH + 3, wrapX: true });
    if (q === 'ciel') g.layer(nuages(), { x: -Math.round(camX * F_P4X + dr * 1.5), y: yh - 118, wrapX: true });
    /* le sol : fond, reflet de la cité, lignes, reflet du soleil */
    g.layer(fl, { x: 0, y: yh, opaque: true });
    reflet(buf, W, H, yh, ville, Math.round(camX * F_P3), lutRows, Q.miroir * (e === 'chaos' ? 1.2 : 1));
    sol(buf, W, H, yh, camX, avZ, e, q, sx, t, 0, null);
    /* P5 : les structures, debout sur le sol, 0,60 */
    structures(buf, W, H, yh, camX, camY, t, st, e, q);
    /* l'éclair éventuel, sur l'horizon */
    if (eclairT > 0) eclairDraw(buf, W, H, yh);
  }

  function etoiles(buf, W, H, yh, camX, camY, t, q, e) {
    var n = QU[q].etoiles || 60; if (e === 'chaos') n = 40;
    var ny = Math.max(10, yh - 30);
    var ph = mouvementCoupe() ? 0 : Math.floor(t * 2);
    for (var i = 0; i < n; i++) {
      var h1 = Math.imul(i + 1, 2654435761) >>> 0, h2 = Math.imul(i + 7, 40503) >>> 0;
      var x = ((h1 >>> 8) % (W + 60)) - Math.round(camX * F_P1X) % (W + 60); x = ((x % (W + 60)) + W + 60) % (W + 60) - 10;
      var y = (h2 >>> 4) % ny - Math.round(camY * F_P1Y) % ny; y = ((y % ny) + ny) % ny;
      if (x < 0 || x >= W || y >= yh - 12) continue;
      var on = ((h1 + ph) & 3);
      if (on === 0) continue;
      buf[y * W + x] = (on & 1) ? C.OS : C.AC;
    }
  }

  function structures(buf, W, H, yh, camX, camY, t, st, e, q) {
    var g = N.gfx;
    /* base de la bande : sur le sol, juste sous l'horizon ; elle reste posée même quand la caméra monte (§ 3.4) */
    var base = yh + 12 + Math.round(fhRef() * 0);
    var x0 = -Math.round(camX * F_P5);
    g.layer(st, { x: x0, y: base - SHT + 1, wrapX: true, lut: enJeu() ? lutP5Jeu : lutP5 });
    var procheLut = enJeu() ? lutCalmeJeu : null;
    var meta = st.meta;
    if (!meta) return;
    /* les flammes des cheminées (LA CENTRALE), en brasier tramé qui ondule */
    if (meta.flammes.length && q === 'centrale') {
      var B = N.pal.BAYER;
      for (var i = 0; i < meta.flammes.length; i++) {
        var f = meta.flammes[i];
        for (var rep = -1; rep <= 1; rep++) {
          var fx = ((f.x + x0) % SW + SW) % SW + rep * SW;
          if (fx < -12 || fx > W + 12) continue;
          var fy = base - SHT + 1 + f.y;
          for (var k = 0; k < 14; k++) {
            var wob = mouvementCoupe() ? 0 : Math.round(Math.sin(t * 7 + k * 0.6 + i * 2) * (1 + k * 0.12));
            var lim = (1 - k / 14) * 0.9 * 16, hw = 3 - (k > 8 ? 1 : 0);
            var yy = fy - k; if (yy < 0 || yy >= H) continue;
            for (var xx = fx - hw + wob; xx <= fx + hw + wob; xx++) if (xx >= 0 && xx < W && lim > B[((yy & 3) << 2) | (xx & 3)]) buf[yy * W + xx] = procheLut ? procheLut[k < 5 ? C.JA : (k < 9 ? C.AM : C.BR)] : (k < 5 ? C.JA : (k < 9 ? C.AM : C.BR));
          }
        }
      }
    }
    /* les petits trains de lumière sur le rail (L'ARTÈRE) : points os et ambre qui glissent */
    if (meta.rails.length && !mouvementCoupe()) {
      for (var ri = 0; ri < meta.rails.length; ri++) {
        var ry = base - SHT + 1 + meta.rails[ri];
        for (var tr = 0; tr < 3; tr++) {
          var tx = Math.round(((t * (18 + tr * 7) + tr * 140) % (W + 40)) - 20);
          for (var wg = 0; wg < 5; wg++) { var wx = tx - wg * 3; if (wx >= 0 && wx < W && ry >= 0 && ry < H) buf[ry * W + wx] = procheLut ? procheLut[wg === 0 ? C.OS : C.AM] : (wg === 0 ? C.OS : C.AM); }
        }
      }
    }
    /* les projecteurs : deux faisceaux en os tramé à 12 % qui balaient le ciel à 0,2 Hz */
    if (q === 'tours' && !mouvementCoupe()) faisceaux(buf, W, H, yh, t, base);
    else if (q === 'tours') faisceaux(buf, W, H, yh, 0, base);
  }
  function fhRef() { return fhY; }
  function faisceaux(buf, W, H, yh, t, base) {
    var B = N.pal.BAYER, lim = 0.12 * 16, ink = enJeu() ? C.AR : C.OS;
    for (var b = 0; b < 2; b++) {
      var bx = b === 0 ? W * 0.28 : W * 0.72, ang = Math.sin(t * 6.2832 * 0.2 + b * 2.4) * 0.55;
      for (var y = base - 6; y >= 0; y -= 1) {
        var dy = base - 6 - y, cx = bx + Math.tan(ang) * dy, hw = 2 + dy * 0.05;
        var br = (y & 3) << 2;
        for (var x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) if (x >= 0 && x < W && lim * 1.0 > B[br | (x & 3)]) buf[y * W + x] = ink;
      }
    }
  }
  function eclairDraw(buf, W, H, yh) {
    /* un éclair : une ligne brisée d'os, et un voile d'ambre tramé à 12 % sur une petite aire (sous le limiteur) */
    var x = Math.round(W * (0.15 + 0.7 * eclairX)), y = 0, B = N.pal.BAYER, hs = (Math.floor(eclairX * 65536) | 0) + 1;
    var on = eclairT > 0.12;
    if (on) {                                                        // une ligne brisée, tirée d'un hachage de la position (pas de flux alloué)
      while (y < yh - 2) {
        hs = (Math.imul(hs, 1664525) + 1013904223) | 0; var seg = 4 + ((hs >>> 8) % 6);
        for (var k = 0; k < seg && y < yh; k++, y++) { buf[y * W + x] = C.OS; if (k & 1) buf[y * W + Math.min(W - 1, x + 1)] = C.JA; }
        hs = (Math.imul(hs, 1664525) + 1013904223) | 0; x += ((hs >>> 8) % 11) - 5; x = clamp(x, 2, W - 3);
      }
    }
    for (var yy = Math.max(0, yh - 22); yy < yh; yy++) for (var xx = Math.max(0, x - 26); xx < Math.min(W, x + 26); xx++) if (0.10 * 16 > B[((yy & 3) << 2) | (xx & 3)]) buf[yy * W + xx] = C.AM;
  }

  /* ================================ drawFar : tout le décor lointain ================================ */
  var iTrans = 0;
  function drawFar(cam) {
    if (!pal() || !N.gfx || !N.gfx.buf || !N.gfx.buf()) return;
    var g = N.gfx; g.origin(0, 0);
    verifierVue();
    if (!cam) cam = N.cam || { x: 0, y: 0 };
    var camX = cam.x | 0, camY = cam.y | 0;
    if (mouvementCoupe()) { camX = 300; camY = 160; }                  // mouvement réduit : tous les facteurs de P0 à P6 passent à 0
    var t = tempsJeu();
    var dt = lastT < 0 ? 0 : t - lastT; lastT = t; if (dt < 0) dt = 0; if (dt > 0.25) dt = 0.25;
    tDecor = t;
    ensureCur();
    tranche();
    /* le sol avance d'une case par temps de jeu (deux au chaos, six pendant LE VOL), plus vite en accélération */
    var E = ET[cur.e], mult = E.avance * accelK;
    if (N.S && N.S.input && N.S.input.boost) mult *= (RD().sol && RD().sol.avanceBoost) || 1.6;
    if (!mouvementCoupe()) avZ += dt * (PAS_Z / TEMPS) * mult;
    if (fenT > 0) fenT -= dt;
    if (eclairT > 0) eclairT -= dt;
    if (g.mask && g.mask()) g.mask().fill(8);
    if (trans && trans.u < 1) {
      trans.u = clamp01((t - trans.t0) / trans.dur);
      if (!mouvementCoupe()) {
        var W = g.W, H = g.H;
        rendreFar(trans.de.q, trans.de.e, camX, camY, t);
        scratch = g.copyTo(scratch);
        rendreFar(trans.vers.q, trans.vers.e, camX, camY, t);
        var front = trans.u * (H + 20), buf = g.buf(), B = N.pal.BAYER;
        for (var y = 0; y < H; y++) {
          var p = (front - y) / 16;
          if (p >= 1) continue;
          var o = y * W, br = (y & 3) << 2;
          if (p <= 0) { for (var x = 0; x < W; x++) buf[o + x] = scratch[o + x]; }
          else { var lim = p * 16; for (var x2 = 0; x2 < W; x2++) if (!(lim > B[br | (x2 & 3)])) buf[o + x2] = scratch[o + x2]; }
        }
        if (trans.u >= 1) trans = null;
        taireFondJeu(cam);
        return;
      }
      trans = null;
    }
    rendreFar(cur.q, cur.e, camX, camY, t);
    taireFondJeu(cam);
  }
  function taireFondJeu(cam) {
    if (!enJeu()) return;
    var g = N.gfx, b = g.buf(), w = N.world, B = N.pal.BAYER;
    /* Ciel, soleil, cité : garder les détails et les étoiles, baisser les encres chaudes et
       leur saturation. L'accent chaud est une trame spatiale fixe, sans scintillement. */
    for (var sy = 0; sy < YH; sy++) {
      var row = sy * g.W, br = (sy & 3) << 2;
      for (var sx = 0; sx < g.W; sx++) {
        var table = B[br | (sx & 3)] === 0 ? lutAccentJeu : lutLointainJeu;
        b[row + sx] = table[b[row + sx]];
      }
    }
    if (!w) return;
    /* Le plateau se déplace : ne taire que son intersection avec le sol écran.
       Les murs et les acteurs ne passent jamais dans cette table. */
    var cx = cam.x | 0, cy = cam.y | 0;
    var x0 = Math.max(0, w.x0 - cx), x1 = Math.min(g.W - 1, w.x1 - cx);
    var y0 = Math.max(YH, 0, w.y0 - cy), y1 = Math.min(g.H - 1, w.y1 - cy);
    for (var y = y0; y <= y1; y++) {
      var end = y * g.W + x1;
      for (var x = y * g.W + x0; x <= end; x++) b[x] = lutCalmeJeu[b[x]];
    }
  }
  function ensureCur() { var a = cache.sky[cur.q], b = cache.floor[cur.q]; if (!(a && a[cur.e] && b && b[cur.e])) ensure(cur.q, cur.e); }

  /* ================================ le plateau (espace monde) ================================ */
  function drawPlateau(cam) {
    if (!pal() || !N.gfx || !N.gfx.buf || !N.gfx.buf()) return;
    var g = N.gfx, buf = g.buf(), W = g.W, H = g.H, ox = g.ox(), oy = g.oy();
    if (!cam) cam = N.cam || { x: ox, y: oy, w: W, h: H };
    var cx = cam.x | 0, cy = cam.y | 0, Wd = N.world || { x0: 0, y0: 0, x1: 1024, y1: 512 };
    var t = tDecor, B = N.pal.BAYER;
    g.owner(8);
    var ax0 = Math.max(Wd.x0, cx), ax1 = Math.min(Wd.x1, cx + W - 1), ay0 = Math.max(Wd.y0, cy), ay1 = Math.min(Wd.y1, cy + H - 1);
    if (ax1 >= ax0 && ay1 >= ay0) {
      /* les lignes : violet tramé à 25 %, tous les 16 px, à travers lesquelles on voit la cité */
      var lim25 = 0.25 * 16, vi = C.VI, ind = C.IN;
      var gx0 = Math.ceil(ax0 / 16) * 16, gy0 = Math.ceil(ay0 / 16) * 16;
      for (var wx = gx0; wx <= ax1; wx += 16) {
        var sx = wx - cx;
        for (var sy = ay0 - cy; sy <= ay1 - cy; sy++) if (lim25 * 2 > B[((sy & 3) << 2) | (sx & 3)]) buf[sy * W + sx] = vi;
      }
      for (var wy = gy0; wy <= ay1; wy += 16) {
        var sy2 = wy - cy, ro = sy2 * W;
        for (var sx2 = ax0 - cx; sx2 <= ax1 - cx; sx2++) if (lim25 * 2 > B[((sy2 & 3) << 2) | (sx2 & 3)]) buf[ro + sx2] = vi;
      }
      /* les intersections : des points d'indigo, qui ondulent autour des explosions (Geometry Wars) et passent au violet sur la grosse caisse */
      var beat = N.horloge && N.horloge.franchi ? N.horloge.franchi().temps : false;
      var dotc = ind;
      for (var iy = gy0; iy <= ay1; iy += 16) for (var ix = gx0; ix <= ax1; ix += 16) {
        var dx = 0, dy = 0;
        for (var k = 0; k < 6; k++) {
          var o = ondes[k]; if (o.f <= 0) continue;
          var age = t - o.t; if (age < 0 || age > 1.2) continue;
          var ddx = ix - o.x, ddy = iy - o.y, dd = Math.sqrt(ddx * ddx + ddy * ddy) + 0.001, rr = age * 140;
          var amp = o.f * 6 * Math.exp(-Math.abs(dd - rr) / 14) * (1 - age / 1.2);
          dx += ddx / dd * amp; dy += ddy / dd * amp;
        }
        var px = ix - cx + Math.round(dx), py = iy - cy + Math.round(dy);
        if (px < 0 || py < 0 || px >= W - 1 || py >= H - 1) continue;
        var cc = (dx !== 0 || dy !== 0) ? C.VI : dotc;
        buf[py * W + px] = cc; buf[py * W + px + 1] = cc; buf[(py + 1) * W + px] = cc; buf[(py + 1) * W + px + 1] = cc;
      }
    }
    /* les murs : une bande de 3 px hachurée de magenta et de nuit profonde, dont les hachures défilent */
    var scroll = mouvementCoupe() ? 0 : Math.floor(t * 18), ma = C.MA, np = C.NP;
    mur(buf, W, H, cx, cy, Wd.x0 - 3, Wd.y0 - 3, Wd.x1 + 3, Wd.y1 + 3, Wd.x0, Wd.y0, Wd.x1, Wd.y1, scroll, ma, np);
    /* les murs ANNONCÉS (position finale d'un glissement), hachurés dès le premier instant */
    if (N.world && N.world.mursAnnonces) {
      var an = N.world.mursAnnonces();
      for (var a = 0; a < an.length; a++) annonce(buf, W, H, cx, cy, an[a], t);
    }
    /* l'alerte de proximité : à moins de 24 px, le pan proche de la tête s'allume en rose pâle tramé */
    var th = N.joueuse && N.joueuse.tete, us = N.cam && N.cam._tete;
    if (th && N.world && N.world.distMur) {
      var dm = N.world.distMur(th.x, th.y), al = (RD() && N.R && N.R.monde && N.R.monde.mur && N.R.monde.mur.alerte) || 24;
      if (dm.d < al) alerte(buf, W, H, cx, cy, Wd, dm, th, 1 - Math.max(0, dm.d) / al);
    }
  }
  function mur(buf, W, H, cx, cy, ex0, ey0, ex1, ey1, ix0, iy0, ix1, iy1, scroll, ma, np) {
    /* quatre bandes : gauche, droite, haut, bas ; on ne parcourt que la partie visible de chacune */
    function bande(x0, y0, x1, y1) {
      var sx0 = Math.max(0, x0 - cx), sx1 = Math.min(W - 1, x1 - cx - 1), sy0 = Math.max(0, y0 - cy), sy1 = Math.min(H - 1, y1 - cy - 1);
      for (var y = sy0; y <= sy1; y++) { var o = y * W; for (var x = sx0; x <= sx1; x++) buf[o + x] = (((x + cx) + (y + cy) + scroll) % 6 + 6) % 6 < 3 ? ma : np; }
    }
    bande(ex0, ey0, ix0, ey1); bande(ix1, ey0, ex1, ey1); bande(ix0, ey0, ix1, iy0); bande(ix0, iy1, ix1, ey1);
  }
  function annonce(buf, W, H, cx, cy, r, t) {
    var B = N.pal.BAYER, ma = C.MA, lim = 0.35 * 16;
    function seg(x0, y0, x1, y1) {
      var sx0 = Math.max(0, x0 - cx), sx1 = Math.min(W - 1, x1 - cx - 1), sy0 = Math.max(0, y0 - cy), sy1 = Math.min(H - 1, y1 - cy - 1);
      for (var y = sy0; y <= sy1; y++) for (var x = sx0; x <= sx1; x++) if (lim > B[((y & 3) << 2) | (x & 3)] && (((x + cx + y + cy) >> 1) & 1)) buf[y * W + x] = ma;
    }
    seg(r.x - 3, r.y - 3, r.x, r.y + r.h + 3); seg(r.x + r.w, r.y - 3, r.x + r.w + 3, r.y + r.h + 3);
    seg(r.x, r.y - 3, r.x + r.w, r.y); seg(r.x, r.y + r.h, r.x + r.w, r.y + r.h + 3);
  }
  function alerte(buf, W, H, cx, cy, Wd, dm, th, k) {
    var B = N.pal.BAYER, lim = (0.3 + 0.65 * k) * 16, ro = C.RO, half = 22 + Math.round(34 * k);
    var x0, y0, x1, y1;
    if (dm.pan === 'g') { x0 = Wd.x0 - 3; x1 = Wd.x0; y0 = th.y - half; y1 = th.y + half; }
    else if (dm.pan === 'd') { x0 = Wd.x1; x1 = Wd.x1 + 3; y0 = th.y - half; y1 = th.y + half; }
    else if (dm.pan === 'h') { y0 = Wd.y0 - 3; y1 = Wd.y0; x0 = th.x - half; x1 = th.x + half; }
    else { y0 = Wd.y1; y1 = Wd.y1 + 3; x0 = th.x - half; x1 = th.x + half; }
    var sx0 = Math.max(0, Math.round(x0 - cx)), sx1 = Math.min(W - 1, Math.round(x1 - cx) - 1), sy0 = Math.max(0, Math.round(y0 - cy)), sy1 = Math.min(H - 1, Math.round(y1 - cy) - 1);
    for (var y = sy0; y <= sy1; y++) for (var x = sx0; x <= sx1; x++) if (lim > B[((y & 3) << 2) | (x & 3)]) buf[y * W + x] = ro;
  }

  /* ================================ le premier plan P6 et les braises (espace monde) ================================ */
  function drawFront(cam) {
    if (!pal() || !N.gfx || !N.gfx.buf || !N.gfx.buf()) return;
    var g = N.gfx, buf = g.buf(), W = g.W, H = g.H;
    if (!cam) cam = N.cam || { x: 0, y: 0 };
    var cx = cam.x | 0, cy = cam.y | 0, t = tDecor, im = p6img(), d = im.data;
    g.owner(8);
    var bandH = Math.max(6, Math.round(H * 0.12)), procheLut = enJeu() ? lutCalmeJeu : null;
    /* les poutrelles : des silhouettes de nuit profonde tramées, à 1,4 × la caméra, SEULEMENT dans les 12 % du haut et du bas */
    var per = 150, px = -Math.round(cx * F_P6);
    for (var k = -1; k < 6; k++) {
      var wy = k * per + 20 - Math.round(cy * F_P6);                       // rangée écran de la poutre k
      var wyy = ((wy % (per * 2)) + per * 2) % (per * 2) - 30;
      for (var r = 0; r < P6H; r++) {
        var y = wyy + r; if (y < 0 || y >= H) continue;
        if (!(y < bandH || y >= H - bandH)) continue;
        var so = r * P6W, ro = y * W, s0 = ((px % P6W) + P6W) % P6W;
        for (var x = 0; x < W; x++) { var v = d[so + ((x + s0) % P6W)]; if (v) buf[ro + x] = procheLut ? procheLut[v] : v; }
      }
      break;                                                                // une poutre à la fois : le premier plan reste rare
    }
    /* les braises qui tombent au chaos : points de 1 px en brasier */
    var E = ET[cur.e];
    if (E.braises && !mouvementCoupe()) {
      for (var i = 0; i < 26; i++) {
        var h1 = Math.imul(i + 3, 2654435761) >>> 0, h2 = Math.imul(i + 11, 40503) >>> 0;
        var x2 = ((h1 >>> 7) % W), sp = 18 + (h2 % 24);
        var y2 = Math.floor(((h2 >>> 5) % H + t * sp) % H), xw = Math.round(Math.sin(t * 1.3 + i) * 3);
        var xx = x2 + xw; if (xx >= 0 && xx < W) buf[y2 * W + xx] = procheLut ? procheLut[(i & 3) ? C.BR : C.AM] : ((i & 3) ? C.BR : C.AM);
      }
    }
  }

  /* ================================ le reste de l'interface ================================ */
  function ondule(x, y, force) {
    var o = ondes[ondeN % 6]; ondeN++;
    o.x = x; o.y = y; o.f = clamp(+force || 1, 0, 4); o.t = tDecor;
  }
  function fenetres() { fenT = 1.8; fenRanges = (fenRanges + 2) % 7; }
  function eclair() { eclairT = 0.32; eclairX = ((Math.floor(tDecor * 1000) * 2654435761) >>> 0) / 4294967296; }
  function eclipse(t) { eclipseK = clamp01(+t || 0); }
  function horizon() { return YH; }
  /* multiplie la vitesse d'avance du sol (la plongée : les lignes accélèrent) ; 1 = normal */
  function acceler(k) { accelK = clamp(+k || 1, 0, 16); }

  /* silhouettes du CYCLOPE dans P2 (grande, loin) et P5 (plus près) : un disque de nuit profonde, un œil en brasier */
  function silhouette(nom, plan, x, y, k) {
    if (!pal() || !N.gfx || !N.gfx.buf()) return;
    var g = N.gfx, R = Math.round((plan === 'P5' ? 26 : 34) * clamp(k === undefined ? 1 : k, 0.05, 1.4));
    g.disc(x, y, 0, R, C.NP, 1);
    g.ring(x, y, R, C.BR, 1);
    g.disc(x, y, 0, Math.max(2, R >> 2), C.BR, 1);
    g.disc(x, y, 0, Math.max(1, R >> 4), C.JA, 1);
  }
  function masqueCite(nom) {
    var im = res('ville', nom), m = new Uint8Array(im.data.length);
    for (var i = 0; i < m.length; i++) m[i] = im.data[i] ? 1 : 0;
    return m;
  }

  /* ================================ le fond du VOL ================================ */
  function drawVol(o) {
    if (!pal() || !N.gfx || !N.gfx.buf || !N.gfx.buf()) return;
    var g = N.gfx; g.origin(0, 0); verifierVue();
    var buf = g.buf(), W = g.W, H = g.H, yh = o.horizon | 0, t = tempsJeu();
    var q = QU[o.vers] ? o.vers : cur.q, q0 = QU[o.depuis] ? o.depuis : cur.q, mont = clamp01(o.montee || 0);
    var e = 'montee';
    ensure(q0, e); ensure(q, e);
    majLuts(q, e, t);
    var skyQ = res('sky', q0, e);
    g.layer(skyQ, { x: 0, y: yh - skyQ.h + 1, opaque: true });
    etoiles(buf, W, H, yh, 0, 0, t, q0, e);
    var R = H > W ? 32 : 40, sx = Math.round(W * 0.5);
    soleil(buf, W, H, yh, sx, R, QU[q0].sun * 0.9, t, false, e);
    g.layer(res('mont', q0), { x: 0, y: yh - MH + 1, wrapX: true });
    /* la cité d'arrivée monte de l'horizon par rangées entières ; le sol la recouvre plus bas */
    var ville = res('ville', q), vy = yh - CH + 1 + Math.round((1 - mont) * (CH - 1));
    g.layer(ville, { x: 0, y: vy, wrapX: true, luts: lutRows });
    var fl = res('floor', q0, 'vol');
    g.layer(fl, { x: 0, y: yh, opaque: true });
    var sol0 = o.sol0 > yh ? o.sol0 : yh + Math.round((H - yh) * 0.4);
    var kz = (sol0 - yh) * ((N.R && N.R.vol && N.R.vol.Z0) || 64), keep = P.sc, km = P.scMax, kk = P.Kz, kg = P.g0, kd = P.dyB;
    P.sc = 1 / (sol0 - yh); P.scMax = 3.0; P.Kz = kz; P.g0 = 0.0; P.dyB = Math.max(1, sol0 - yh);
    sol(buf, W, H, yh, 0, o.avance || 0, 'montee', q0, sx, t, o.lat || 0, 'vol');
    P.sc = keep; P.scMax = km; P.Kz = kk; P.g0 = kg; P.dyB = kd;
    YH = yh;
  }

  /* ================================ les événements : le décor suit la partie ================================ */
  var etatParVague = { 1: 'calme', 2: 'montee', 3: 'montee', 4: 'chaos', 5: 'chaos' };
  function brancher() {
    if (branche || !N.ev || !N.ev.on) return;
    branche = true;
    var R = 40, qui = '15-decor';
    N.ev.on('vague', R, function (c) {
      if (!c) return;
      if (c.evt === 'entree') {
        if (QU[c.quartier]) { cur.q = cur.q; quartier(c.quartier); }
        etat(c.etape === 'defile' ? 'calme' : (etatParVague[c.n] || 'montee'));
      } else if (c.evt === 'pic') { etat(cur.e === 'montee' ? 'chaos' : cur.e); }
      else if (c.evt === 'nettoyee') etat('calme');
    }, qui);
    N.ev.on('vol', R, function (c) {
      if (!c) return;
      if (c.evt === 'debut' && QU[c.vers]) preparer(c.vers);
      else if (c.evt === 'fin' && QU[c.vers]) { quartier(c.vers); etat('calme'); }
    }, qui);
    N.ev.on('inversion', R, function (c) {
      if (!c) return;
      if (c.evt === 'debut') { etatAvantInversion = cur.e; etat('inversion'); }
      else if (c.evt === 'fin') { etat(etatAvantInversion || 'montee'); etatAvantInversion = null; }
    }, qui);
    N.ev.on('phase', R, function (c) {
      if (!c) return;
      if (c.evt === 'arrivee') { quartier('eclipse'); etat('colosse'); }
      else if (c.evt === 'mort') etat('victoire');
    }, qui);
  }
  function build() {
    if (!pal()) return;
    if (N.gfx && N.gfx.W) { verifierVue(); ensure(cur.q, cur.e); }
    brancher();
  }
  /* pose (quartier, état) sans balayage : essais et mesures */
  function fixer(q, e) {
    if (!pal() || !QU[q] || !ET[e]) return;
    if (N.gfx && N.gfx.W) { verifierVue(); ensure(q, e); }
    trans = null; cur.q = q; cur.e = e;
  }
  function reset() { accelK = 1; trans = null; avZ = 0; lastT = -1; fenT = 0; eclairT = 0; eclipseK = 0; cur.q = 'docks'; cur.e = 'calme'; etapes.length = 0; }

  N.decor = {
    build: build, reset: reset, fixer: fixer, etat: etat, quartier: quartier, preparer: preparer,
    drawFar: drawFar, drawPlateau: drawPlateau, drawFront: drawFront, drawVol: drawVol,
    acceler: acceler, ondule: ondule, fenetres: fenetres, eclair: eclair, silhouette: silhouette, eclipse: eclipse, horizon: horizon,
    masqueCite: masqueCite, QUARTIERS: QNOMS, ETATS: Object.keys(ET),
    transition: function () { return trans ? trans.u : 1; },
    soleilX: function () { return sunXLast; },
    prete: function (q) { return !!(cache.ville[q] && cache.ville[q]._ && cache.struct[q] && cache.struct[q]._); }
  };
})();
