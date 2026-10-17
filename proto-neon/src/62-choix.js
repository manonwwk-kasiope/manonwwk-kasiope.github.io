/* ===== 62-choix.js — N.choix : LA PILOTE ou LE PILOTE =====

   refonte/VISION-PROGRESSION.md § 6 : deux personnes de deux mondes parallèles, chacune reliée à son serpent.
   ELLE vit dans le monde de gauche (la ville au crépuscule, magenta et rose), LUI dans le monde de droite (les
   plateaux au soleil levant, ambre et jaune). Le serpent de chacun, cyan, s'enroule autour de son pilote.
   En paysage l'écran est coupé en deux par une faille lumineuse verticale ; en portrait les mondes s'empilent
   (ELLE en haut) et la faille est horizontale.

   CE QUI SE PASSE
     révélation   0,45 s : les deux mondes sortent de la faille, en bandes, avec un front plus clair
     choix        le personnage survolé (souris), pointé (flèches) s'anime : son clip joue s'il existe
                  (N.art.play), son serpent accélère, sa visière balaie ; l'autre s'assombrit d'un cran par
                  table de couleurs. Un toucher ou un clic choisit d'un coup ; Entrée ou Espace choisit le
                  personnage pointé. Garde de 300 ms : un geste destiné à l'écran précédent ne choisit rien.
     confirmation 0,6 s : une ligne de balayage descend sur l'élu, « EN LIGNE » se tape sous son nom, l'autre
                  monde s'éteint au tramage ; son N.music.sfx('pouvoirPret') ; puis surFin('elle' | 'lui').
   REJOUER SE VOIT : le profil local (N.outils.store / load, clé 'snake2975.pilotes', { elle: { fini }, lui: { fini } })
   marque « ★ FINIE » / « ★ FINI » sous un personnage déjà mené au bout ; quand les deux le sont, la faille s'ouvre
   sur l'espace entre les mondes et « LES DEUX MONDES SE TOUCHENT » s'écrit au centre.

   LES IMAGES. art/pilote-elle.png et art/pilote-lui.png (portraits, toute taille, recadrés au centre de leur moitié,
   point focal réglable dans FOCAL) et cine/pilote-elle.mp4, cine/pilote-lui.mp4 (lus par N.art.play / get / stop).
   Sans eux, une silhouette procédurale prend le relais : buste en contre-jour, visière allumée, cheveux au vent
   ou écharpe, serpent enroulé dont une moitié passe derrière le corps. Rien ne casse si tout manque.

   INTERFACE (N.choix), rien ne s'appelle au chargement :
     start({ surFin })      lance l'écran ; surFin(qui) une fois la confirmation jouée
     update(dt) / draw()    à appeler à la place du jeu tant que actif() ; draw remplit tout le tampon et garde
                            la dernière image après la fin
     actif() / state()      'revele' | 'choix' | 'confirme' | 'fini' ; instantané pour les essais
     stop()                 coupe tout, sans appeler surFin
     personnage()           le choix courant, 'elle' | 'lui', gardé pour la session ; null tant que rien n'est choisi
     marquerFini(qui)       retient dans le profil que ce personnage a été mené au bout
     lesDeuxFinis()         true quand les deux l'ont été ;   profil() -> { elle: { fini }, lui: { fini } }

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; le cyan n'appartient qu'aux deux serpents ; aucun
   Math.random (bruit par hachage local) ; aucune horloge lue (le temps vient de dt) ; flashs bornés : la ligne
   de balayage fait trois rangées, les étoiles et étincelles sont des pixels isolés, rien ne clignote en grand. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages ================================ */
  var CFG = { garde: 0.3, revele: 0.45, confirme: 0.6, ouverture: 1.4, faillePaysage: 26, faillePortrait: 18 };
  var CLE = 'snake2975.pilotes';
  var QUI = ['elle', 'lui'];
  var INFO = {
    elle: { nom: 'LA PILOTE', fini: '★ FINIE', art: 'pilote-elle' },
    lui: { nom: 'LE PILOTE', fini: '★ FINI', art: 'pilote-lui' }
  };
  /* point focal des portraits, en fraction de l'image : ce que le recadrage garde au centre de la moitié */
  var FOCAL = { 'pilote-elle': [0.56, 0.42], 'pilote-lui': [0.44, 0.42] };   // visages écartés du titre, serpents dans le cadre

  /* ================================ palette ================================ */
  var P = null, TH = null, HOT = null, DKA = null, DKB = null, DKT = null, BAY = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), violet: I('violet'), indigo: I('indigo'),
      magenta: I('magenta'), rose: I('rosePale'), cyan: I('cyan'), cyanP: I('cyanPale'), ambre: I('ambre'),
      jaune: I('jaune'), brasier: I('brasier'), os: I('os'), acier: I('acier'), sang: I('sang'), np: I('nuitProfonde') };
    BAY = N.pal.BAYER || new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);
    /* les deux mondes : aucune de ces encres n'est cyan */
    TH = {
      elle: { ciel: P.sang, horizon: P.magenta, soleil: [P.rose, P.magenta, P.sang], sol: P.magenta, solB: P.sang,
        decor: P.np, fenetre: P.rose, fenetreB: P.magenta, rim: P.rose, rimB: P.magenta, rimS: P.sang,
        visiere: P.magenta, visiereH: P.rose, meche: P.sang, nom: P.rose },
      lui: { ciel: P.brasier, horizon: P.ambre, soleil: [P.jaune, P.ambre, P.brasier], sol: P.ambre, solB: P.brasier,
        decor: P.ardoise, fenetre: P.ambre, fenetreB: P.brasier, rim: P.jaune, rimB: P.ambre, rimS: P.brasier,
        visiere: P.ambre, visiereH: P.jaune, meche: P.brasier, nom: P.jaune }
    };
    function table(pairs) { var t = new Uint8Array(16); for (var k = 0; k < 16; k++) t[k] = k; for (var n in pairs) t[P[n]] = P[pairs[n]]; return t; }
    /* un cran plus clair : la ligne de balayage, le front de la révélation */
    HOT = table({ vide: 'nuit', nuit: 'ardoise', ardoise: 'indigo', indigo: 'violet', violet: 'magenta', magenta: 'rose',
      rose: 'os', cyan: 'cyanP', cyanP: 'os', ambre: 'jaune', jaune: 'os', brasier: 'ambre', acier: 'os', sang: 'magenta', np: 'nuit' });
    /* un cran plus sombre, tramé entre deux tables : le serpent garde du cyan sur un pixel sur deux */
    DKA = table({ nuit: 'np', ardoise: 'nuit', violet: 'indigo', indigo: 'ardoise', magenta: 'sang', rose: 'magenta',
      cyan: 'cyan', cyanP: 'cyan', ambre: 'brasier', jaune: 'ambre', brasier: 'sang', os: 'acier', acier: 'acier', sang: 'sang' });
    DKB = table({ nuit: 'np', ardoise: 'nuit', violet: 'indigo', indigo: 'ardoise', magenta: 'sang', rose: 'magenta',
      cyan: 'indigo', cyanP: 'cyan', ambre: 'brasier', jaune: 'ambre', brasier: 'sang', os: 'acier', acier: 'ardoise', sang: 'nuit' });
    DKT = new Uint8Array(16); DKT[P.cyan] = 8; DKT[P.acier] = 8; DKT[P.sang] = 8;
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }
  /* bruit local, déterministe, sans état */
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
  function tactile() { try { return !!(N.outils && N.outils.hasTouch && N.outils.hasTouch()); } catch (e) { return false; } }
  function sfx(nom) { try { if (N.music && N.music.sfx) N.music.sfx(nom); } catch (e) {} }
  function art(nom) { try { return N.art && N.art.get ? N.art.get(nom) : null; } catch (e) { return null; } }
  function clipOn(nom) { try { return !!(N.art && N.art.play && N.art.play(nom)); } catch (e) { return false; } }
  function clipOff(nom) { try { if (N.art && N.art.stop) N.art.stop(nom); } catch (e) {} }
  function clipPrep(nom) { try { if (N.art && N.art.prepare) N.art.prepare(nom); } catch (e) {} }

  /* ================================ le profil ================================ */
  var MEMOIRE = null;                       // repli si N.outils manque : le profil vit le temps de la page
  function lireProfil() {
    var brut = null;
    try { brut = (N.outils && N.outils.load) ? N.outils.load(CLE) : MEMOIRE; } catch (e) { brut = MEMOIRE; }
    var o = null;
    try { o = brut ? JSON.parse(brut) : null; } catch (e) { o = null; }
    return { elle: { fini: !!(o && o.elle && o.elle.fini) }, lui: { fini: !!(o && o.lui && o.lui.fini) } };
  }
  function ecrireProfil(p) {
    var s = JSON.stringify(p);
    MEMOIRE = s;
    try { if (N.outils && N.outils.store) N.outils.store(CLE, s); } catch (e) {}
  }
  var SESSION = null;                       // le choix courant, gardé tant que la page vit

  /* ================================ l'état ================================ */
  var C = { on: false, phase: 'fini', t: 0, pt: 0, focus: null, choisi: null, via: null, surFin: null, finAppele: false,
    profil: null, deux: false, ouvert: 0, clip: null, clipJoue: false, dirPrec: null, ptrX: null, ptrY: null,
    gardes: 0, journal: [] };
  function journal(e) { C.journal.push({ e: e, t: +C.t.toFixed(2) }); if (C.journal.length > 64) C.journal.shift(); }

  /* ================================ géométrie ================================ */
  var L = { W: 0, H: 0, px: 2, portrait: false, mid: 0, sf: null, Z: { elle: { x: 0, y: 0, w: 0, h: 0 }, lui: { x: 0, y: 0, w: 0, h: 0 } } };
  function layout() {
    var g = G(), s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    L.W = g.W | 0; L.H = g.H | 0; L.px = g.PX | 0 || 2; L.sf = sf;
    L.portrait = L.H > L.W;
    var e = L.Z.elle, l = L.Z.lui;
    if (!L.portrait) {
      L.mid = L.W >> 1;
      e.x = 0; e.y = 0; e.w = L.mid; e.h = L.H;
      l.x = L.mid; l.y = 0; l.w = L.W - L.mid; l.h = L.H;
    } else {
      L.mid = L.H >> 1;
      e.x = 0; e.y = 0; e.w = L.W; e.h = L.mid;
      l.x = 0; l.y = L.mid; l.w = L.W; l.h = L.H - L.mid;
    }
  }
  /* côté de la lumière : vers la faille en paysage ; en portrait, ELLE éclairée à droite, LUI à gauche */
  function cote(qui) { return qui === 'elle' ? 1 : -1; }
  function zoneDe(x, y) {
    if (!(x >= 0 && y >= 0 && x < L.W && y < L.H)) return null;
    return (L.portrait ? y < L.mid : x < L.mid) ? 'elle' : 'lui';
  }

  /* ================================ tampon, découpé à une moitié ================================ */
  var B = null, BW = 0, BH = 0, CX0 = 0, CY0 = 0, CX1 = 0, CY1 = 0;
  function decoupe(r) {
    CX0 = Math.max(0, r.x); CY0 = Math.max(0, r.y); CX1 = Math.min(BW, r.x + r.w); CY1 = Math.min(BH, r.y + r.h);
  }
  function span(x0, x1, y, c) {
    y = Math.round(y); if (y < CY0 || y >= CY1) return;
    x0 = Math.round(x0); x1 = Math.round(x1);
    if (x0 < CX0) x0 = CX0; if (x1 > CX1) x1 = CX1; if (x1 <= x0) return;
    B.fill(c, y * BW + x0, y * BW + x1);
  }
  function spanD(x0, x1, y, c, t) {
    if (!(t > 0)) return; if (t >= 1) { span(x0, x1, y, c); return; }
    y = Math.round(y); if (y < CY0 || y >= CY1) return;
    x0 = Math.round(x0); x1 = Math.round(x1);
    if (x0 < CX0) x0 = CX0; if (x1 > CX1) x1 = CX1;
    var lim = t * 16, br = (y & 3) << 2, o = y * BW;
    for (var x = x0; x < x1; x++) if (lim > BAY[br | (x & 3)]) B[o + x] = c;
  }
  function dot(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < CX0 || y < CY0 || x >= CX1 || y >= CY1) return;
    B[y * BW + x] = c;
  }
  function disque(cx, cy, r, c, t) {
    cx = Math.round(cx); cy = Math.round(cy);
    for (var dy = -r; dy <= r; dy++) {
      var dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      if (t === undefined) span(cx - dx, cx + dx + 1, cy + dy, c); else spanD(cx - dx, cx + dx + 1, cy + dy, c, t);
    }
  }
  function ligne(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, n = 0;
    for (;;) {
      dot(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++n > 2000) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /* applique une table à un rectangle : un cran plus sombre (tramé entre DKA et DKB) ou une table simple */
  function assombrir(r) {
    var x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(BW, r.x + r.w), y1 = Math.min(BH, r.y + r.h);
    for (var y = y0; y < y1; y++) {
      var o = y * BW, br = (y & 3) << 2;
      for (var x = x0; x < x1; x++) { var c = B[o + x]; B[o + x] = BAY[br | (x & 3)] < DKT[c] ? DKA[c] : DKB[c]; }
    }
  }
  function remapRect(lut, x0, y0, x1, y1) {
    x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(BW, x1 | 0); y1 = Math.min(BH, y1 | 0);
    for (var y = y0; y < y1; y++) { var o = y * BW; for (var x = x0; x < x1; x++) B[o + x] = lut[B[o + x]]; }
  }
  function eteindre(r, t) {               // tramage vers la nuit profonde
    if (!(t > 0)) return;
    var x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(BW, r.x + r.w), y1 = Math.min(BH, r.y + r.h), lim = t * 16;
    for (var y = y0; y < y1; y++) { var o = y * BW, br = (y & 3) << 2; for (var x = x0; x < x1; x++) if (lim > BAY[br | (x & 3)]) B[o + x] = P.np; }
  }

  /* ================================ les deux mondes ================================ */
  function figureX(qui, r) { return r.x + Math.round(r.w * 0.5) - cote(qui) * Math.round(r.w * 0.04); }
  function monde(qui, r, t, vif) {
    var th = TH[qui], s = cote(qui), red = reduced(), seed = qui === 'elle' ? 11 : 29;
    decoupe(r);
    var hy = r.y + Math.round(r.h * 0.62), bas = r.y + r.h, cx = figureX(qui, r);
    var x0 = r.x, x1 = r.x + r.w, y;
    /* le ciel : vide en haut, la nuit puis la couleur du monde vers l'horizon, au tramage */
    for (y = r.y; y < hy; y++) {
      var v = (y - r.y) / Math.max(1, hy - r.y);
      span(x0, x1, y, P.vide);
      if (v > 0.18) spanD(x0, x1, y, P.nuit, (v - 0.18) / 0.3);
      if (v > 0.5) spanD(x0, x1, y, th.ciel, (v - 0.5) / 0.5 * 0.8);
      if (y >= hy - 3) spanD(x0, x1, y, th.horizon, 0.45);
    }
    /* les étoiles : des pixels isolés qui changent d'éclat à moins de deux hertz */
    for (var k = 0; k < 46; k++) {
      var sx = r.x + Math.floor(hash(k, 1, seed) * r.w), sy = r.y + Math.floor(hash(k, 2, seed) * (hy - r.y) * 0.55);
      var tw = hash(k, Math.floor(t * 1.4 + hash(k, 3, seed) * 9), seed);
      dot(sx, sy, tw > 0.82 ? P.os : tw > 0.35 ? P.acier : P.ardoise);
    }
    /* le soleil en bandes, à demi couché, du côté de la faille ; un halo tramé autour */
    var sr = Math.max(10, Math.round(Math.min(r.w, r.h) * 0.27));
    var scx = cx + s * Math.round(r.w * 0.2), scy = hy - Math.round(sr * 0.25);
    disque(scx, scy, Math.round(sr * 1.45), th.ciel, 0.3);
    var defile = red ? 0 : Math.floor(t * (vif ? 6 : 3));
    for (var yy = -sr; yy <= sr; yy++) {
      y = scy + yy; if (y >= hy) break;
      var f = (yy + sr) / (2 * sr);
      if (f > 0.42) { var gs = 1 + Math.floor((f - 0.42) * 7); if (((y - scy + 64 + defile) % 7) < gs) continue; }
      var dx = Math.floor(Math.sqrt(sr * sr - yy * yy));
      span(scx - dx, scx + dx + 1, y, f < 0.3 ? th.soleil[0] : f < 0.58 ? th.soleil[1] : th.soleil[2]);
    }
    if (qui === 'elle') ville(r, hy, t, th, seed); else plateaux(r, hy, th, seed);
    /* le sol : la grille en perspective, qui file vers l'horizon */
    for (y = hy; y < bas; y++) span(x0, x1, y, P.np);
    var vpx = scx, prof = bas - hy;
    for (var m = -9; m <= 9; m++) ligne(vpx, hy, vpx + m * r.w / 3.2, bas + prof, th.solB);
    var vit = red ? 0 : t * (vif ? 0.9 : 0.35);
    for (var i = 0; i < 14; i++) {
      var z = 0.5 + (((i - vit) % 14) + 14) % 14, yl = hy + Math.round(prof * 0.7 / z);
      if (yl < bas) span(x0, x1, yl, z < 2.5 ? th.sol : th.solB);
    }
    span(x0, x1, hy, th.horizon);
  }
  /* ELLE : une ville au crépuscule, tours en nuit profonde, fenêtres roses, balises qui battent lentement */
  function ville(r, hy, t, th, seed) {
    var x = r.x - 3, k = 0;
    while (x < r.x + r.w && k < 80) {
      var bw = 5 + Math.floor(hash(k, 5, seed) * 12), bh = Math.round(r.h * (0.04 + hash(k, 6, seed) * 0.2));
      for (var y = hy - bh; y < hy; y++) span(x, x + bw, y, th.decor);
      for (var wy = hy - bh + 2; wy < hy - 1; wy += 3)
        for (var wx = x + 1; wx < x + bw - 1; wx += 2)
          if (hash(k * 31 + wx, wy, seed) > 0.8) dot(wx, wy, hash(wx, wy, k) > 0.5 ? th.fenetre : th.fenetreB);
      if (hash(k, 8, seed) > 0.7 && bh > r.h * 0.12) {
        var ax = x + (bw >> 1), ah = 3 + Math.floor(hash(k, 9, seed) * 6);
        for (var a = 1; a <= ah; a++) dot(ax, hy - bh - a, th.decor);
        if ((Math.floor(t * 1.1 + k * 0.37) & 1) === 0) dot(ax, hy - bh - ah - 1, th.fenetreB);
      }
      x += bw + 1 + Math.floor(hash(k, 7, seed) * 3); k++;
    }
  }
  /* LUI : des plateaux de roche en ardoise, la crête allumée d'ambre par le soleil levant */
  function plateaux(r, hy, th, seed) {
    var M = [];
    for (var k = 0; k < 4; k++) M.push({ c: r.x + hash(k, 1, seed) * r.w, w: r.w * (0.06 + hash(k, 2, seed) * 0.12),
      h: r.h * (0.06 + hash(k, 3, seed) * 0.16), s: 3 + hash(k, 4, seed) * 8 });
    for (var x = r.x; x < r.x + r.w; x++) {
      var hgt = r.h * 0.025 + r.h * 0.012 * Math.sin(x * 0.11);
      for (var j = 0; j < M.length; j++) {
        var q = M[j], u = (q.w + q.s - Math.abs(x - q.c)) / q.s;
        if (u > 0) hgt = Math.max(hgt, q.h * Math.min(1, u));
      }
      var top = hy - Math.round(hgt);
      for (var y = top; y < hy; y++) dot(x, y, th.decor);
      dot(x, top, th.horizon);
      if ((x & 1) === 0) dot(x, top + 1, th.solB);
    }
  }

  /* ================================ la silhouette de repli ================================
     Un buste en contre-jour, à l'échelle de la moitié : tête, cou, épaules, en nuit profonde ; liseré de lumière
     du côté du soleil ; visière allumée ; ELLE a les cheveux au vent, LUI un col relevé et une écharpe. */
  function geo(qui, r) {
    var Hf = Math.min(r.h * 0.98, r.w * 1.45);
    return { Hf: Hf, cx: figureX(qui, r), yt: r.y + Math.round(r.h * 0.19), s: cote(qui) };
  }
  var TETE = { cy: 0.14, ry: 0.125 };
  function demiLargeur(qui, v) {
    var rx = qui === 'elle' ? 0.086 : 0.09, hw = 0;
    var q = (v - TETE.cy) / TETE.ry;
    if (q >= -1 && q <= 1) {
      hw = rx * Math.sqrt(1 - q * q);
      if (q > 0.3) hw *= 1 - 0.32 * (q - 0.3) / 0.7;            // le menton
      if (qui === 'lui' && q < -0.55) hw = Math.max(hw, rx * 0.74); // cheveux courts, sommet plus plat
    }
    var cou = qui === 'elle' ? 0.038 : 0.047, ep = qui === 'elle' ? 0.25 : 0.3;
    if (v > 0.24 && v <= 0.34) hw = Math.max(hw, cou);
    if (v > 0.34) {
      var u = Math.min(1, (v - 0.34) / 0.13);
      hw = Math.max(hw, cou + (ep - cou) * Math.pow(Math.sin(u * Math.PI / 2), 0.7) + Math.max(0, v - 0.47) * 0.07);
    }
    if (qui === 'lui' && v > 0.28 && v < 0.4) hw = Math.max(hw, 0.055 + (v - 0.28) * 0.25);   // col relevé
    return hw;
  }
  function cheveux(th, g, an) {
    var Hf = g.Hf, cx = g.cx, yt = g.yt, o = -g.s, y, v;
    for (y = Math.max(CY0, yt - Math.round(Hf * 0.03)); y < CY1; y++) {
      v = (y - yt) / Hf; if (v > 0.56) break;
      /* la calotte autour de la tête, puis la chevelure que le vent gonfle du côté de l'ombre */
      var q = (v - 0.13) / 0.15, cal = Math.abs(q) <= 1 ? 0.112 * Math.sqrt(1 - q * q) : 0;
      var vent = v > 0.08 ? 0.2 * Math.pow(Math.sin(Math.PI * clamp01((v - 0.08) / 0.48)), 0.8) : 0;
      var dehors = Math.max(cal, (v > 0.13 ? 0.112 : cal) + vent);
      dehors += Math.sin(an * 2.6 - v * 13) * 0.018 * clamp01((v - 0.08) / 0.3);
      var dedans = v < 0.13 ? -cal : (v < 0.4 ? -0.03 : (v - 0.4) / 0.16 * dehors);
      var xa = cx + o * dehors * Hf, xb = cx + o * dedans * Hf;
      var x0 = Math.min(xa, xb), x1 = Math.max(xa, xb) + 1;
      span(x0, x1, y, P.np);
      spanD(x0, x1, y, P.nuit, 0.5);
      /* trois mèches qui suivent l'onde, et un liseré : la forme se lit sur le ciel sombre */
      for (var m = 1; m <= 3; m++) dot(cx + o * (dedans + (dehors - dedans) * (0.2 + 0.22 * m)) * Hf, y, m === 3 ? th.rimS : th.meche);
      dot(xa, y, th.rimB);
    }
  }
  function silhouette(qui, r, t, vif) {
    var th = TH[qui], g = geo(qui, r), Hf = g.Hf, cx = g.cx, yt = g.yt, s = g.s, o = -s;
    var an = reduced() ? 0 : (vif ? t : t * 0.35), y, v;
    decoupe(r);
    if (qui === 'elle') cheveux(th, g, an);
    /* le corps */
    var lisere = Math.max(1, Math.round(Hf / 110));
    for (y = Math.max(CY0, yt); y < CY1; y++) {
      v = (y - yt) / Hf;
      var hw = demiLargeur(qui, v) * Hf; if (hw <= 0.4) continue;
      var a = Math.round(cx - hw), b = Math.round(cx + hw);
      span(a, b + 1, y, P.np);
      var lum = s > 0 ? b : a, omb = s > 0 ? a : b;
      for (var k = 0; k < lisere; k++) dot(lum - s * k, y, th.rim);
      /* le modelé : la lumière du soleil mord sur le visage et l'épaule, au tramage */
      var xr = lum - s * lisere, ep = v < 0.27 ? Math.round(Hf * 0.035) : 2;
      spanD(Math.min(xr, xr - s * ep), Math.max(xr, xr - s * ep) + 1, y, th.rimB, 0.45);
      if (v < 0.27) spanD(Math.min(xr - s * ep, xr - s * 2 * ep), Math.max(xr - s * ep, xr - s * 2 * ep) + 1, y, th.rimS, 0.3);
      if (((y + (omb & 1)) & 1) === 0) dot(omb, y, th.rimS);
      /* la couture lumineuse de la combinaison, parallèle au contour éclairé ; elle coule quand le pilote est pointé */
      if (v > 0.4 && v < 0.85) {
        var pas = ((y + Math.floor(an * 26)) % 15 + 15) % 15;
        dot(lum - s * Math.round(Hf * 0.035), y, pas < 3 && vif ? th.visiereH : th.visiere);
      }
      /* la visière, en bandeau sur les yeux, décalée vers la lumière (trois quarts) ; un reflet la balaie */
      if (v > 0.118 && v < 0.15) {
        var va = s > 0 ? a + 3 : a + 1, vb = s > 0 ? b : b - 2;
        span(va, vb, y, v < 0.127 ? th.visiereH : th.visiere);
        var lw = vb - va, gx = va + (Math.floor(an * 48) % (lw + 30));
        if (gx < vb) span(gx, Math.min(vb, gx + 3), y, v < 0.136 ? P.os : th.visiereH);
      }
    }
    /* l'insigne de poitrine : un chevron dans la couleur du monde */
    var ix = cx + s * Math.round(Hf * 0.1), iy = yt + Math.round(Hf * 0.62), iz = Math.max(2, Math.round(Hf / 60));
    for (var c = 0; c <= iz; c++) { dot(ix - c, iy + c, th.rim); dot(ix + c, iy + c, th.rim); }
    /* LUI : l'écharpe, nouée au cou, dont le pan flotte du côté de l'ombre, au-dessus de l'épaule */
    if (qui === 'lui') {
      for (y = yt + Math.round(Hf * 0.27); y < yt + Math.round(Hf * 0.33); y++) span(cx - Hf * 0.065, cx + Hf * 0.065 + 1, y, (y & 1) ? th.visiere : th.rimS);
      for (var e = 0; e < 15; e++) {
        var f = e / 14;
        var ex = cx + o * Hf * (0.04 + 0.32 * f), ey = yt + Hf * (0.3 - 0.05 * Math.sin(f * 2.6) + 0.06 * f) + Math.sin(an * 3.2 - e * 0.7) * Hf * 0.018 * f;
        var er = Math.max(1, Math.round(Hf * (0.02 - 0.009 * f)));
        disque(ex, ey, er, th.visiere);
        dot(ex, ey - er, th.visiereH); dot(ex, ey + er, th.rimS);
      }
    }
  }

  /* ================================ le serpent enroulé ================================
     Une spirale qui monte autour du buste, de la taille à l'épaule : les spires arrière passent derrière le corps,
     les spires avant devant ; le cou quitte la spirale et la tête se dresse près du visage, tournée vers la faille.
     Une onde parcourt le corps (plus vive quand le pilote est pointé). Cyan : c'est la joueuse, il porte seul cette
     encre ; un liseré de nuit profonde sépare les spires. */
  var SERP = { n: 72, tours: 1.75, fin: 0.86 };
  var SP = { x: new Float32Array(72), y: new Float32Array(72), r: new Float32Array(72), av: new Uint8Array(72) };
  function serpentCalcul(qui, r, t, vif) {
    var g = geo(qui, r), Hf = g.Hf, cx = g.cx, s = g.s, yt = g.yt, red = reduced();
    var n = SERP.n, R = Hf * 0.3, ry = Hf * 0.05, yb = yt + Hf * 0.63, yh = yt + Hf * 0.39;
    var r0 = Math.max(2, Hf * 0.024), w = red ? 0 : t * (vif ? 6 : 2.2);
    var hx = cx + s * Hf * 0.2 + (red ? 0 : Math.sin(t * (vif ? 2.1 : 0.9)) * Hf * 0.012);
    var hy = yt + Hf * 0.24 + (red ? 0 : Math.cos(t * (vif ? 1.7 : 0.7)) * Hf * 0.01);
    var px0 = 0, py0 = 0;
    for (var i = 0; i < n; i++) {
      var f = i / (n - 1), x, y, av;
      if (f <= SERP.fin) {
        /* la dernière spire finit devant, du côté de la faille (u = 2π + π/4) */
        var e = f / SERP.fin, u = Math.PI * 2.25 - (1 - e) * Math.PI * 2 * SERP.tours;
        var rr = R * (1 + 0.04 * Math.sin(e * 20 - w));
        x = cx + s * rr * Math.cos(u); y = yb + (yh - yb) * e + ry * Math.sin(u);
        av = Math.sin(u) > 0 ? 1 : 0;
        px0 = x; py0 = y;
      } else {
        /* le cou se dresse : courbe de la dernière spire vers la tête */
        var k = (f - SERP.fin) / (1 - SERP.fin), kk = k * k * (3 - 2 * k);
        x = px0 + (hx - px0) * kk + s * Math.sin(k * Math.PI) * Hf * 0.04;
        y = py0 + (hy - py0) * k - Math.sin(k * Math.PI) * Hf * 0.02;
        av = 1;
      }
      SP.x[i] = x; SP.y[i] = y; SP.av[i] = av;
      SP.r[i] = r0 * Math.min(1, 0.3 + f * 1.8);
    }
    return g;
  }
  /* le corps est tracé au pixel près : un disque par pixel le long de la courbe, d'abord le liseré, puis le cyan */
  function corps(a, liser) {
    for (var i = 0; i < SERP.n - 1; i++) {
      if (SP.av[i] !== a) continue;
      var dx = SP.x[i + 1] - SP.x[i], dy = SP.y[i + 1] - SP.y[i], m = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
      for (var j = 0; j < m; j++) {
        var f = j / m, rr = Math.round(SP.r[i] + (SP.r[i + 1] - SP.r[i]) * f);
        disque(SP.x[i] + dx * f, SP.y[i] + dy * f, liser ? rr + 1 : rr, liser ? P.np : P.cyan);
      }
    }
  }
  function serpent(qui, r, t, vif, devant) {
    var g = serpentCalcul(qui, r, t, vif), s = g.s, n = SERP.n, a = devant ? 1 : 0, i;
    decoupe(r);
    corps(a, true); corps(a, false);
    /* les écailles claires sur le dos, en chevrons espacés */
    for (i = 1; i < n - 3; i++) if (SP.av[i] === a && (i & 1)) {
      var rr = Math.round(SP.r[i]);
      dot(SP.x[i], SP.y[i] - rr + 1, P.cyanP);
      if (rr >= 3) { dot(SP.x[i] - 1, SP.y[i] - rr + 2, P.cyanP); dot(SP.x[i] + 1, SP.y[i] - rr + 2, P.cyanP); }
    }
    if (!devant) return;
    /* la tête : un museau allongé vers la faille, l'œil, la langue fourchue de temps en temps */
    var hx = SP.x[n - 1], hy = SP.y[n - 1], hr = Math.round(SP.r[n - 1]) + 1;
    disque(hx + s * hr * 0.7, hy + 1, hr, P.np); disque(hx, hy, hr + 1, P.np);
    disque(hx, hy, hr, P.cyan); disque(hx + s * hr * 0.7, hy + 1, hr - 1, P.cyan);
    dot(hx - s, hy - hr + 1, P.cyanP); dot(hx, hy - hr + 1, P.cyanP);
    dot(hx + s * Math.round(hr * 0.4), hy - 1, P.np); dot(hx + s * Math.round(hr * 0.4), hy - 2, P.cyanP);
    if ((Math.floor(t * 2.2) % 3) === 0) {
      var lx = hx + s * (hr * 1.7 + 1);
      dot(lx, hy + 1, P.cyanP); dot(lx + s, hy + 1, P.cyanP); dot(lx + 2 * s, hy, P.cyanP); dot(lx + 2 * s, hy + 2, P.cyanP);
    }
  }

  /* ================================ un portrait (illustration ou image du clip) ================================ */
  function portrait(nom, img, r) {
    var f = FOCAL[nom] || [0.5, 0.45], iw = img.w, ih = img.h, d = img.data;
    var ox = Math.round(r.x + r.w / 2 - f[0] * iw), oy = Math.round(r.y + r.h / 2 - f[1] * ih);
    if (iw >= r.w) { if (ox > r.x) ox = r.x; if (ox + iw < r.x + r.w) ox = r.x + r.w - iw; }
    if (ih >= r.h) { if (oy > r.y) oy = r.y; if (oy + ih < r.y + r.h) oy = r.y + r.h - ih; }
    var x0 = Math.max(r.x, ox, 0), x1 = Math.min(r.x + r.w, ox + iw, BW), y0 = Math.max(r.y, oy, 0), y1 = Math.min(r.y + r.h, oy + ih, BH);
    var bord = 6;
    for (var y = y0; y < y1; y++) {
      var sy = y - oy, row = sy * iw, o = y * BW, br = (y & 3) << 2;
      for (var x = x0; x < x1; x++) {
        var c = d[row + x - ox]; if (!c) continue;
        /* les bords d'une image plus petite que la moitié se fondent au tramage dans le monde procédural */
        var e = Math.min(x - ox, ox + iw - 1 - x, sy, ih - 1 - sy);
        if (e < bord && ((iw < r.w && (x - ox < bord || ox + iw - 1 - x < bord)) || (ih < r.h && (sy < bord || ih - 1 - sy < bord))))
          if (!(((e + 0.5) / bord) * 16 > BAY[br | (x & 3)])) continue;
        B[o + x] = c;
      }
    }
  }

  /* ================================ la faille ================================ */
  function faille(t) {
    var W = L.W, H = L.H, port = L.portrait, len = port ? W : H, mid = L.mid, red = reduced();
    var gmax = port ? CFG.faillePortrait : CFG.faillePaysage, gap = Math.round(easeOut(C.ouvert) * gmax), h = gap >> 1;
    var pas = red ? 0 : Math.floor(t * 3);
    function pose(a, c, ci) {                 // a le long de la faille, c en travers (négatif : côté ELLE)
      var x = port ? a : mid + c, y = port ? mid + c : a;
      if (x >= 0 && y >= 0 && x < W && y < H) B[y * BW + x] = ci;
    }
    function poseD(a, c, ci, tt) { var x = port ? a : mid + c, y = port ? mid + c : a; if (tt * 16 > BAY[((y & 3) << 2) | (x & 3)]) pose(a, c, ci); }
    for (var a = 0; a < len; a++) {
      var j = Math.round(Math.sin(a * 0.07 + (red ? 0 : t * 0.8)) * 1.4 + (hash(a >> 3, pas, 5) - 0.5) * 2.2);
      var cg = j - h, cd = j + h + (gap > 0 ? 1 : 0);
      if (gap > 0) {
        /* entre les mondes : l'espace, une nébuleuse violette tramée et des étoiles */
        for (var c = cg + 1; c < cd; c++) {
          pose(a, c, P.np);
          var nb = 0.25 + 0.25 * Math.sin(a * 0.05 + c * 0.3);
          poseD(a, c, P.violet, nb * Math.min(1, C.ouvert * 1.5) * 0.7);
          if (hash(a, c, 77) > 0.985) pose(a, c, hash(a, c, Math.floor(t * 1.5)) > 0.4 ? P.os : P.acier);
        }
      }
      pose(a, cg, P.os); pose(a, cd, P.os);
      pose(a, cg - 1, P.rose); pose(a, cd + 1, P.jaune);
      poseD(a, cg - 2, P.magenta, 0.65); poseD(a, cd + 2, P.ambre, 0.65);
      poseD(a, cg - 3, P.magenta, 0.3); poseD(a, cd + 3, P.ambre, 0.3);
      poseD(a, cg - 4, P.sang, 0.2); poseD(a, cd + 4, P.brasier, 0.2);
    }
    /* des étincelles qui remontent la faille : des pixels isolés */
    for (var k = 0; k < 7; k++) {
      var ak = Math.floor(((hash(k, 3, 9) * len + (red ? 0 : t * (14 + 9 * hash(k, 4, 9)) * (k & 1 ? 1 : -1))) % len + len) % len);
      var ck = (k & 1 ? h + 2 : -h - 2) + Math.round(Math.sin(t * 2 + k) * 1.5);
      pose(ak, ck, P.os);
    }
  }

  /* ================================ texte ================================ */
  function txt(str, k, ci) {
    if (!N.spr || !N.spr.text) return null;
    try { return N.spr.text(str, { ci: ci, echelle: k, contour: true }); } catch (e) { return null; }
  }
  function largeur(str, k) {
    if (N.spr && N.spr.measure) { try { return N.spr.measure(str, { echelle: k, contour: true }).w; } catch (e) {} }
    return str.length * 6 * k;
  }
  /* pose le texte centré sur cx, capitales en haut à y ; n premières lettres seulement si n est donné */
  function ecrireC(str, cx, y, k, ci, n) {
    var g = G(), w = largeur(str, k), s = txt(n === undefined ? str : str.slice(0, Math.max(0, n)), k, ci);
    if (s && s.data) g.blit(s, Math.round(cx - w / 2), Math.round(y) - (s.top || 0));
    return w;
  }
  function kTexte() { return Math.max(1, Math.min(3, Math.round(28 / (7 * L.px)))); }
  function kPour(str, kmax, room) { var k = kmax; while (k > 1 && largeur(str, k) > room) k--; return k; }
  function plaque(x, y, w, h) {
    var g = G(); g.rect(x, y, w, h, P.np);
    g.ditherRect(x, y - 2, w, 2, P.np, 0.5); g.ditherRect(x, y + h, w, 2, P.np, 0.5);
  }

  /* les noms, la marque de fin, le cadre du personnage pointé */
  function etiquette(qui, r, t, k) {
    var th = TH[qui], fini = C.profil && C.profil[qui].fini, sf = L.sf || { l: 0, t: 0, r: 0, b: 0 };
    var cap = 7 * k, marque = fini ? 7 + 4 : 0, cx = figureX(qui, r), elu = C.choisi === qui && C.phase !== 'choix';
    var enLigne = elu ? Math.round(easeOut(C.pt / 0.15) * 11) : 0;      // le nom monte pour laisser place à « EN LIGNE »
    if (C.phase === 'fini' && elu) enLigne = 11;
    var basZone = r.y + r.h - (r.y + r.h >= L.H ? (sf.b | 0) : 0);
    var marge = (L.portrait && qui === 'elle') ? 10 + (C.deux ? 8 : 0) : 8;
    var y = basZone - marge - cap - marque - enLigne;
    var g = G(), pointe = C.focus === qui;
    var w = ecrireC(INFO[qui].nom, cx, y, k, th.nom);
    if (pointe && C.phase === 'choix') {
      var bob = reduced() ? 0 : (Math.floor(t * 2.5) & 1);
      var fl1 = txt('→', k, th.nom), fl2 = txt('←', k, th.nom);
      if (fl1 && fl2) {
        g.blit(fl1, Math.round(cx - w / 2) - fl1.w - 2 + bob, Math.round(y) - (fl1.top || 0));
        g.blit(fl2, Math.round(cx + w / 2) + 2 - bob, Math.round(y) - (fl2.top || 0));
      }
    }
    if (fini) ecrireC(INFO[qui].fini, cx, y + cap + 4, 1, P.jaune);
    if (elu) {
      var mot = 'EN LIGNE', n = Math.floor(C.pt / 0.04);
      ecrireC(mot, cx, y + cap + 4 + marque, 1, P.os, Math.min(mot.length, n));
    }
    /* le cadre : quatre coins dans la couleur du monde */
    if (pointe) {
      var m = 4, l = Math.max(6, Math.round(Math.min(r.w, r.h) * 0.07)), ci = th.rim;
      var x0 = r.x + m + (r.x === 0 ? (sf.l | 0) : 0), x1 = r.x + r.w - m - 1 - (r.x + r.w >= L.W ? (sf.r | 0) : 0);
      var y0 = r.y + m + (r.y === 0 ? (sf.t | 0) : 0), y1 = basZone - m - 1;
      if (!L.portrait) { if (qui === 'elle') x1 -= 6; else x0 += 6; } else { if (qui === 'elle') y1 -= 6; else y0 += 6; }
      g.rect(x0, y0, l, 1, ci); g.rect(x0, y0, 1, l, ci);
      g.rect(x1 - l + 1, y0, l, 1, ci); g.rect(x1, y0, 1, l, ci);
      g.rect(x0, y1, l, 1, ci); g.rect(x0, y1 - l + 1, 1, l, ci);
      g.rect(x1 - l + 1, y1, l, 1, ci); g.rect(x1, y1 - l + 1, 1, l, ci);
    }
  }
  function entete(k) {
    var sf = L.sf || { l: 0, t: 0, r: 0, b: 0 }, room = L.W - (sf.l | 0) - (sf.r | 0) - 12;
    var titre = 'QUI SE CONNECTE ?', kt = kPour(titre, k, room), y = (sf.t | 0) + 5;
    var aide = tactile() ? 'TOUCHE TON PILOTE' : (L.portrait ? '↑ ↓ PUIS ENTRÉE, OU CLIQUE' : '← → PUIS ENTRÉE, OU CLIQUE');
    var ka = 1, wt = largeur(titre, kt), wa = largeur(aide, ka), w = Math.max(wt, wa) + 8;
    var cx = L.W >> 1;
    plaque(cx - (w >> 1), y - 3, w, 7 * kt + 7 * ka + 11);
    ecrireC(titre, cx, y, kt, P.os);
    if (C.phase === 'choix' || C.phase === 'revele') ecrireC(aide, cx, y + 7 * kt + 4, ka, P.acier);
  }
  function lesDeuxMondes(t) {
    var mot = 'LES DEUX MONDES SE TOUCHENT', n = Math.floor(Math.max(0, C.t - CFG.revele) / 0.035);
    if (n <= 0) return;
    var k = 1, w = largeur(mot, k), cx = L.W >> 1, cy = L.portrait ? L.mid : (L.H >> 1);
    var y = cy - ((7 * k) >> 1);
    plaque(cx - (w >> 1) - 4, y - 3, w + 8, 7 * k + 6);
    ecrireC(mot, cx, y, k, P.os, Math.min(mot.length, n));
  }

  /* la révélation : les mondes sortent de la faille, en bandes, avec un front plus clair */
  function reveler(p) {
    if (p >= 1) return;
    var port = L.portrait, d = Math.round(easeOut(p) * (L.mid + 2));
    for (var y = 0; y < BH; y++) {
      var o = y * BW;
      for (var x = 0; x < BW; x++) {
        var dist = port ? Math.abs(y - L.mid) : Math.abs(x - L.mid);
        if (dist > d) B[o + x] = P.np;
        else if (dist > d - 2) B[o + x] = HOT[B[o + x]];
      }
    }
  }

  /* ================================ la marche ================================ */
  function start(o) {
    if (!pal()) return false;
    o = o || {};
    C.on = true; C.phase = 'revele'; C.t = 0; C.pt = 0; C.choisi = null; C.via = null; C.finAppele = false;
    C.surFin = typeof o.surFin === 'function' ? o.surFin : null;
    C.profil = lireProfil(); C.deux = C.profil.elle.fini && C.profil.lui.fini; C.ouvert = 0;
    C.focus = (o.focus === 'elle' || o.focus === 'lui') ? o.focus : (tactile() ? null : SESSION);
    C.clip = null; C.clipJoue = false; C.dirPrec = null; C.ptrX = null; C.ptrY = null; C.gardes = 0;
    C.journal.length = 0;
    clipPrep(INFO.elle.art); clipPrep(INFO.lui.art);
    var s = S(); if (s.input) s.input.any = false;
    journal('debut' + (C.deux ? ' deux-finis' : ''));
    if (C.focus) viser(C.focus, 'reprise', true);
    return true;
  }
  /* pointer un personnage : son clip joue (s'il existe), l'autre s'arrête */
  function viser(qui, via, muet) {
    if (qui !== 'elle' && qui !== 'lui') return;
    var change = C.focus !== qui;
    C.focus = qui;
    if (C.clip && C.clip !== INFO[qui].art) { clipOff(C.clip); C.clip = null; C.clipJoue = false; }
    if (!C.clip) { C.clip = INFO[qui].art; C.clipJoue = clipOn(C.clip); }
    if (change || muet) journal('pointe ' + qui + ' (' + via + ')' + (C.clipJoue ? ' clip' : ''));
    if (change && !muet) sfx('fermable');
  }
  function choisir(qui, via) {
    viser(qui, via, true);
    C.choisi = qui; C.via = via; SESSION = qui;
    C.phase = 'confirme'; C.pt = 0;
    journal('choix ' + qui + ' (' + via + ')');
    sfx('pouvoirPret');
  }
  function directionDe(inp) {
    if (!inp || !(inp.mag > 0.5)) return null;
    if (inp.x < -0.5 || inp.y < -0.5) return 'elle';
    if (inp.x > 0.5 || inp.y > 0.5) return 'lui';
    return null;
  }
  function entrees() {
    var inp = S().input; if (!inp) return;
    var d = directionDe(inp), p = inp.pointer, taps = inp.taps;
    if (C.t < CFG.garde) {
      /* la garde : tout ce qui arrive maintenant était destiné à l'écran précédent */
      if ((taps && taps.length) || inp.valider) { C.gardes++; journal('garde'); }
      inp.any = false; C.dirPrec = d;
      if (p) { C.ptrX = p.x; C.ptrY = p.y; }
      return;
    }
    /* la souris qui bouge pointe le personnage survolé */
    if (p && (p.x !== C.ptrX || p.y !== C.ptrY)) {
      if (C.ptrX !== null) { var z = zoneDe(p.x, p.y); if (z) viser(z, 'souris'); }
      C.ptrX = p.x; C.ptrY = p.y;
    }
    /* un toucher ou un clic choisit le monde touché */
    if (taps) {
      for (var i = 0; i < taps.length; i++) { var q = zoneDe(taps[i].x, taps[i].y); if (q) { choisir(q, tactile() ? 'toucher' : 'souris'); inp.any = false; return; } }
    } else if (inp.any) {
      /* sans liste de touchers : le pointeur s'il est posé, sinon le personnage pointé */
      var qa = p && p.actif ? zoneDe(p.x, p.y) : C.focus;
      inp.any = false;
      if (qa) { choisir(qa, 'geste'); return; }
    }
    /* les flèches pointent, Entrée ou Espace choisit */
    if (d && d !== C.dirPrec) viser(d, 'clavier');
    C.dirPrec = d;
    if (inp.valider) {
      if (C.focus) choisir(C.focus, 'clavier');
      else viser(SESSION || 'elle', 'clavier');
    }
    inp.any = false;
  }
  function update(dt) {
    if (!C.on || !pal()) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    var s = S(); if (s.paused) return;
    C.t += dt; C.pt += dt;
    if (C.phase === 'revele' && C.pt >= CFG.revele) { C.phase = 'choix'; C.pt = 0; journal('choix ouvert'); }
    if (C.deux) C.ouvert = clamp01((C.t - CFG.revele * 0.5) / CFG.ouverture);
    if (C.phase === 'revele' || C.phase === 'choix') entrees();
    else if (C.phase === 'confirme' && C.pt >= CFG.confirme) finir();
  }
  function finir() {
    if (C.finAppele) return;
    C.finAppele = true; C.phase = 'fini'; C.on = false;
    if (C.clip) { clipOff(C.clip); C.clip = null; C.clipJoue = false; }
    journal('fin ' + C.choisi);
    var f = C.surFin;
    if (f) { try { f(C.choisi); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('choix.surFin', e); } }
  }

  /* ================================ le dessin ================================ */
  function draw() {
    if (!pal() || !G() || !G().buf) return;
    if (!C.on && C.phase !== 'fini') return;
    var g = G(); B = g.buf(); if (!B) return;
    BW = g.W; BH = g.H;
    layout();
    var t = C.t, k = kTexte();
    for (var i = 0; i < 2; i++) {
      var qui = QUI[i], r = L.Z[qui], vif = C.focus === qui;
      monde(qui, r, t, vif);
      var img = art(INFO[qui].art);
      if (img && img.data) portrait(INFO[qui].art, img, r);
      else { serpent(qui, r, t, vif, false); silhouette(qui, r, t, vif); serpent(qui, r, t, vif, true); }
    }
    for (var j = 0; j < 2; j++) etiquette(QUI[j], L.Z[QUI[j]], t, k);
    /* l'autre monde s'assombrit d'un cran ; à la confirmation, il s'éteint */
    var autre = C.focus === 'elle' ? 'lui' : C.focus === 'lui' ? 'elle' : null;
    if (autre) assombrir(L.Z[autre]);
    if (C.choisi && (C.phase === 'confirme' || C.phase === 'fini')) {
      var p = C.phase === 'fini' ? 1 : clamp01(C.pt / CFG.confirme), zc = L.Z[C.choisi], za = L.Z[C.choisi === 'elle' ? 'lui' : 'elle'];
      eteindre(za, Math.min(0.85, p * 1.2));
      if (C.phase === 'confirme') {
        var yb = zc.y + Math.round(easeOut(p) * zc.h);
        remapRect(HOT, zc.x, yb - 1, zc.x + zc.w, yb + 2);
      }
    }
    faille(t);
    entete(k);
    if (C.deux) lesDeuxMondes(t);
    if (C.phase === 'revele') reveler(C.pt / CFG.revele);
  }

  N.choix = {
    start: start, update: update, draw: draw,
    actif: function () { return C.on; },
    phase: function () { return C.phase; },
    stop: function () { if (C.clip) clipOff(C.clip); C.clip = null; C.on = false; C.phase = 'fini'; C.finAppele = true; },
    personnage: function () { return SESSION; },
    marquerFini: function (qui) {
      if (qui !== 'elle' && qui !== 'lui') return false;
      var p = lireProfil(); p[qui].fini = true; ecrireProfil(p);
      if (C.profil) { C.profil = p; }
      return true;
    },
    lesDeuxFinis: function () { var p = lireProfil(); return p.elle.fini && p.lui.fini; },
    profil: function () { return lireProfil(); },
    state: function () {
      var z = L.Z;
      return { phase: C.phase, actif: C.on, t: +C.t.toFixed(2), focus: C.focus, choisi: C.choisi, via: C.via,
        personnage: SESSION, deux: C.deux, ouvert: +C.ouvert.toFixed(2), clip: C.clip, clipJoue: C.clipJoue,
        gardes: C.gardes, portrait: L.portrait, W: L.W, H: L.H, px: L.px,
        art: { elle: !!art(INFO.elle.art), lui: !!art(INFO.lui.art) },
        profil: lireProfil(),
        zones: { elle: { x: z.elle.x, y: z.elle.y, w: z.elle.w, h: z.elle.h }, lui: { x: z.lui.x, y: z.lui.y, w: z.lui.w, h: z.lui.h } },
        journal: C.journal.slice() };
    },
    CFG: CFG, FOCAL: FOCAL
  };
})();
