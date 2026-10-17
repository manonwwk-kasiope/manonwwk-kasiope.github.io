/* ===== 15-decor.js — N.decor : parallaxe, sol, plateau, murs, quartiers, états =====

   SQUELETTE DU LOT 0b (contrat 1.0, CONTRAT.md § 10.2). Propriétaire : lot 2. Interface complète, replis
   procéduraux :
     - drawFar(cam)      en espace ÉCRAN : ciel tramé en bandes, soleil en bandes jaune, ambre et brasier,
                         deux rangées de silhouettes de cité à deux vitesses, sol en perspective dont les
                         rangées avancent sur la grille musicale de jeu (N.horloge.temps()) ;
     - drawPlateau(cam)  en coordonnées MONDE : treillis du plateau, hors-arène assombri, murs (violet, qui
                         virent au magenta quand la tête approche à moins de N.R.monde.mur.alerte), et
                         position annoncée des murs en pointillés ;
     - drawFront(cam)    P6 : rien dans le repli.
   Les quartiers changent la teinte du ciel et du soleil ; les états du décor ne changent ici que la densité
   des impulsions du treillis. Consommateurs (rang 40) : vague, vol, inversion, phase.
   Aucun cyan, aucune couleur littérale, aucun Math.random : tout vient de N.pal et de N.horloge. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '15-decor';

  function I(n) { return N.pal.i(n); }
  var P = null;
  function pal() {
    if (P || !N.pal || !N.pal.i) return P;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), violet: I('violet'), indigo: I('indigo'), magenta: I('magenta'),
      rose: I('rosePale'), ambre: I('ambre'), jaune: I('jaune'), brasier: I('brasier'), os: I('os'), acier: I('acier'),
      sang: I('sang'), np: I('nuitProfonde') };
    /* teintes par quartier : [ciel haut, ciel bas, soleil 1, soleil 2, soleil 3, cité] */
    THEMES = {
      docks: [P.nuit, P.violet, P.jaune, P.ambre, P.brasier, P.ardoise],
      artere: [P.nuit, P.indigo, P.jaune, P.ambre, P.brasier, P.ardoise],
      centrale: [P.nuit, P.sang, P.ambre, P.brasier, P.sang, P.ardoise],
      ciel: [P.indigo, P.violet, P.os, P.jaune, P.ambre, P.indigo],
      tours: [P.nuit, P.violet, P.jaune, P.brasier, P.sang, P.ardoise],
      coeur: [P.nuit, P.sang, P.brasier, P.sang, P.magenta, P.ardoise],
      eclipse: [P.np, P.nuit, P.ardoise, P.sang, P.np, P.nuit]
    };
    return P;
  }
  var THEMES = null;
  var ETAT = 'calme', QUARTIER = 'docks', ETAT_AVANT = 'calme', ECL = 0;
  var G = function () { return N.gfx; };

  function H() { return (N.horloge && N.horloge.t) ? N.horloge.t() : 0; }
  function temps() { return (N.horloge && N.horloge.temps) ? N.horloge.temps() : { mesure: 0, temps: 0, phase: 0 }; }
  function horizonY(h) {
    var cam = N.cam, k = 0.45;
    if (N.R && N.R.f && N.R.f.horizon && cam) {
      try { var v = N.R.f.horizon(h, (cam.y + cam.h / 2) / ((N.world && N.world.H) || 512), h > ((N.gfx && N.gfx.W) || 0)); if (isFinite(v)) return Math.round(v); } catch (e) { /* repli */ }
    }
    return Math.round(h * k);
  }

  /* ---- l'abonnement, refait à chaque build : une inscription du même (nom, rang, qui) remplace ---- */
  function abonner() {
    if (!N.ev) return;
    N.ev.on('vague', 40, function (c) { if (c.evt === 'entree') { decor.quartier(c.quartier); decor.etat(etatDeVague(c)); } }, QUI);
    N.ev.on('vol', 40, function (c) { if (c.evt === 'fin' && c.vers) decor.preparer(c.vers); }, QUI);
    N.ev.on('inversion', 40, function (c) { if (c.evt === 'debut') { ETAT_AVANT = ETAT; ETAT = 'inversion'; } else ETAT = ETAT_AVANT; }, QUI);
    N.ev.on('phase', 40, function (c) {
      if (c.evt === 'arrivee' || c.evt === 'entree') { decor.quartier('eclipse'); ETAT = 'colosse'; }
      if (c.evt === 'mort') ETAT = 'victoire';
    }, QUI);
  }
  function etatDeVague(c) {
    var sct = N.R && N.R.secteurs && N.R.secteurs[0];
    if (!sct) return 'calme';
    if (c.etape === 'defile') return (sct.defile && sct.defile.etat) || 'calme';
    var v = sct.vagues && sct.vagues[(c.n | 0) - 1];
    return (v && v.etat) || 'calme';
  }

  /* ================================ le lointain (écran) ================================ */
  function drawFar(cam) {
    if (!pal() || !G() || !G().buf) return;
    var g = G(), W = g.W, Hh = g.H, th = THEMES[QUARTIER] || THEMES.docks, hy = horizonY(Hh);
    var cx = cam ? cam.x : 0;
    if (g.owner) g.owner(8);
    /* ciel : bandes tramées du haut vers l'horizon */
    var n = 6, y, k;
    for (k = 0; k < n; k++) {
      var y0 = Math.round(hy * k / n), y1 = Math.round(hy * (k + 1) / n);
      g.rect(0, y0, W, y1 - y0, th[0]);
      g.ditherRect(0, y0, W, y1 - y0, th[1], (k + 1) / (n + 1));
    }
    /* soleil : un grand disque en bandes, coupé par des fentes horizontales (les années 80) */
    var sx = Math.round(W * 0.5 - cx * 0.02), sr = Math.round(Math.min(W, Hh) * 0.30), sy = hy - Math.round(sr * 0.35);
    if (ECL < 1) {
      g.circ(sx, sy, sr, th[4]);
      g.circ(sx, sy - Math.round(sr * 0.25), Math.round(sr * 0.82), th[3]);
      g.circ(sx, sy - Math.round(sr * 0.45), Math.round(sr * 0.6), th[2]);
      for (k = 0; k < 6; k++) { var fy = sy + Math.round(sr * (0.1 + k * 0.15)); g.rect(sx - sr, fy, 2 * sr + 1, 1 + (k >> 1), th[0]); }
    }
    if (ECL > 0) g.ditherCirc(sx, sy, sr + 1, P.np, ECL);
    /* cité lointaine : deux rangées de silhouettes, deux vitesses de parallaxe */
    rangee(W, hy, cx * 0.08, 7, 18, 34, th[5], 11);
    rangee(W, hy, cx * 0.2, 11, 10, 22, P.nuit, 23);
    /* fenêtres des tours proches, qui s'allument sur la mesure */
    var tp = temps(), lit = tp.mesure % 4;
    for (var i = 0; i < W; i += 23) {
      var bx = ((i - Math.round(cx * 0.2)) % (W + 23) + W + 23) % (W + 23);
      if (((i / 23) | 0) % 4 === lit) g.rect(bx + 4, hy - 9, 1, 1, P.ambre);
    }
    /* le sol en perspective : bandes de lignes qui avancent vers la joueuse, au tempo de jeu */
    g.rect(0, hy, W, Hh - hy, P.vide);
    g.rect(0, hy, W, 1, th[4]);
    var ph = tp.phase + tp.temps, rows = 8;
    for (k = 0; k < rows; k++) {
      var z = (k + 1 - (ph % 1)) / rows;
      var ry = hy + Math.round((Hh - hy) * z * z);
      if (ry > hy && ry < Hh) g.rect(0, ry, W, 1, k < 2 ? P.indigo : P.violet);
    }
    var vx = Math.round(W / 2 - cx * 0.4);
    for (k = -10; k <= 10; k++) g.line(vx + k * 6, hy + 1, vx + k * W / 6, Hh, P.indigo);
  }
  function rangee(W, hy, dx, pas, hmin, hmax, ci, graine) {
    var g = G(), off = Math.round(dx), period = pas * 40;
    for (var i = -1; i * pas < W + period; i++) {
      var x = i * pas - (off % pas);
      var idx = i + Math.floor(off / pas), hh = hmin + (((idx * 2654435761 + graine) >>> 0) % (hmax - hmin + 1));
      g.rect(x, hy - hh, pas - 1, hh, ci);
    }
  }

  /* ================================ le plateau (monde) ================================ */
  function drawPlateau(cam) {
    if (!pal() || !G() || !N.world) return;
    var g = G(), w = N.world, c = cam || N.cam || { x: 0, y: 0, w: g.W, h: g.H };
    var x0 = Math.floor(c.x / 32) * 32, y0 = Math.floor(c.y / 32) * 32, x, y;
    if (g.owner) g.owner(8);
    /* hors de l'arène : un voile de nuit profonde */
    g.ditherRect(c.x, c.y, Math.max(0, w.x0 - c.x), c.h, P.np, 0.5);
    g.ditherRect(w.x1, c.y, Math.max(0, c.x + c.w - w.x1), c.h, P.np, 0.5);
    g.ditherRect(c.x, c.y, c.w, Math.max(0, w.y0 - c.y), P.np, 0.5);
    g.ditherRect(c.x, w.y1, c.w, Math.max(0, c.y + c.h - w.y1), P.np, 0.5);
    /* treillis : une croix tous les 32 px, une ligne pointillée entre */
    for (y = y0; y <= c.y + c.h; y += 32) for (x = x0; x <= c.x + c.w; x += 32) {
      if (x < w.x0 || x > w.x1 || y < w.y0 || y > w.y1) continue;
      g.px(x, y, P.violet); g.px(x - 1, y, P.indigo); g.px(x + 1, y, P.indigo); g.px(x, y - 1, P.indigo); g.px(x, y + 1, P.indigo);
    }
    /* impulsions de données le long du treillis, plus nombreuses quand l'état monte */
    var nb = ETAT === 'chaos' ? 10 : ETAT === 'montee' ? 6 : 3, t = H();
    for (var i = 0; i < nb; i++) {
      var ly = Math.floor((c.y + (i * 97) % Math.max(32, c.h)) / 32) * 32, lx = c.x + ((t * (40 + i * 7) + i * 131) % (c.w + 20)) - 10;
      if (ly > w.y0 && ly < w.y1) for (var q = 0; q < 5; q++) g.px(lx - q, ly, q ? P.indigo : P.violet);
    }
    /* les murs, épaisseur N.R.monde.mur.epaisseur, gaine de nuit profonde à l'extérieur */
    var p = N.S && N.S.player, al = (N.R && N.R.monde && N.R.monde.mur && N.R.monde.mur.alerte) || 24, alerte = false;
    if (p && typeof p.x === 'number') { var dm = w.distMur(p.x, p.y); alerte = dm.d < al; }
    var cm = alerte ? P.magenta : P.violet;
    g.rect(w.x0 - 4, w.y0 - 4, w.x1 - w.x0 + 8, 1, P.np); g.rect(w.x0 - 4, w.y1 + 3, w.x1 - w.x0 + 8, 1, P.np);
    g.rect(w.x0 - 4, w.y0 - 4, 1, w.y1 - w.y0 + 8, P.np); g.rect(w.x1 + 3, w.y0 - 4, 1, w.y1 - w.y0 + 8, P.np);
    g.rect(w.x0 - 3, w.y0 - 3, w.x1 - w.x0 + 6, 3, cm); g.rect(w.x0 - 3, w.y1, w.x1 - w.x0 + 6, 3, cm);
    g.rect(w.x0 - 3, w.y0, 3, w.y1 - w.y0, cm); g.rect(w.x1, w.y0, 3, w.y1 - w.y0, cm);
    /* la position annoncée des murs, en pointillés */
    var A = w.mursAnnonces ? w.mursAnnonces() : [];
    for (var a = 0; a < A.length; a++) {
      var r = A[a];
      for (x = r[0]; x <= r[2]; x += 4) { g.px(x, r[1], P.rose); g.px(x, r[3], P.rose); }
      for (y = r[1]; y <= r[3]; y += 4) { g.px(r[0], y, P.rose); g.px(r[2], y, P.rose); }
    }
  }

  var decor = {
    build: function () { pal(); abonner(); QUARTIER = 'docks'; ETAT = 'calme'; ECL = 0; },
    etat: function (nom) { if (nom && N.ids && N.ids.etatsDecor.indexOf(nom) >= 0) ETAT = nom; return ETAT; },
    quartier: function (nom) { if (nom && N.ids && N.ids.quartiers.indexOf(nom) >= 0) QUARTIER = nom; return QUARTIER; },
    preparer: function (nom) { /* repli : rien à précalculer ; le lot 2 prépare le quartier par tranches */ return !!nom; },
    drawFar: drawFar,
    drawPlateau: drawPlateau,
    drawFront: function () { /* P6 : vide dans le repli */ },
    ondule: function () { /* repli : le treillis ne se déforme pas */ },
    fenetres: function () { /* repli : les fenêtres suivent la mesure */ },
    eclair: function () { /* repli : pas d'éclair */ },
    silhouette: function () { /* repli : pas de silhouette du CYCLOPE dans les plans */ },
    eclipse: function (t) { ECL = Math.max(0, Math.min(1, +t || 0)); },
    horizon: function () { var g = G(); return horizonY((g && g.H) || 180); }
  };
  N.decor = decor;
})();
