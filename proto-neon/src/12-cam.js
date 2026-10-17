/* ===== 12-cam.js — N.world et N.cam : le monde, ses murs, l'arène qui voyage, la caméra =====

   SQUELETTE DU LOT 0b (contrat 1.0, CONTRAT.md § 10.2). Propriétaire : lot 1. L'interface est complète ;
   le comportement est un repli simple, juste et sans erreur, que le lot 1 remplace :
     - le monde mesure N.R.monde.W × N.R.monde.H ; les murs courants sont un rectangle (x0, y0, x1, y1) ;
     - arena(rect, dur) fait glisser les murs vers rect en dur secondes ; la position d'arrivée est annoncée
       dès le premier instant (mursAnnonces) ;
     - travelling({largeur, vx, depuis}) fait voyager l'arène à vx px/s jusqu'au bord du monde ;
     - la caméra suit la tête avec une avance dans le cap (N.R.camera), arrondie une seule fois au pixel,
       bornée au monde (avec le débord de N.R.camera.debord).
   Miroirs tenus à chaque pas : S.monde et S.vue (CONTRAT.md § 7). Journal 'vue' toutes les 6 images.
   Aucun Math.random, aucune horloge lue, aucune couleur : ce module ne dessine rien. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  function R() { return N.R || {}; }
  function S() { return N.S || null; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ================================ le monde ================================ */
  var WW = 1024, WH = 512;
  var M = { x0: 0, y0: 0, x1: WW, y1: WH };                 // murs courants
  var GL = null;                                             // glissement en cours {de, vers, t, dur}
  var TR = null;                                             // travelling en cours {vx, largeur}
  var ANN = [];                                              // positions annoncées [[x0,y0,x1,y1]]
  var VX = 0, VY = 0;
  var DM = { d: 0, nx: 0, ny: 0, pan: 0, mobile: false };    // objet rendu par distMur (réutilisé)

  function taille() {
    var m = R().monde;
    if (m) { WW = m.W | 0 || 1024; WH = m.H | 0 || 512; }
    world.W = WW; world.H = WH;
  }
  function poser(x0, y0, x1, y1) { M.x0 = x0; M.y0 = y0; M.x1 = x1; M.y1 = y1; world.x0 = x0; world.y0 = y0; world.x1 = x1; world.y1 = y1; }

  var world = {
    W: 1024, H: 512, x0: 0, y0: 0, x1: 1024, y1: 512,
    reset: function () {
      taille();
      var ep = (R().monde && R().monde.mur && R().monde.mur.epaisseur) || 3;
      poser(ep, ep, WW - ep, WH - ep);
      GL = null; TR = null; ANN.length = 0; VX = 0; VY = 0;
      miroir();
    },
    /* rect = {x0, y0, x1, y1} ou [x0, y0, x1, y1] ; dur en secondes de temps de jeu */
    arena: function (rect, dur) {
      var r = Array.isArray(rect) ? { x0: rect[0], y0: rect[1], x1: rect[2], y1: rect[3] } : rect;
      if (!r) return;
      TR = null;
      var v = { x0: clamp(r.x0, 0, WW), y0: clamp(r.y0, 0, WH), x1: clamp(r.x1, 0, WW), y1: clamp(r.y1, 0, WH) };
      if (!(dur > 0)) { poser(v.x0, v.y0, v.x1, v.y1); GL = null; ANN.length = 0; return; }
      GL = { de: { x0: M.x0, y0: M.y0, x1: M.x1, y1: M.y1 }, vers: v, t: 0, dur: dur };
      ANN.length = 0; ANN.push([v.x0, v.y0, v.x1, v.y1]);
    },
    /* l'arène qui voyage (REFONTE.md § 4.6) : largeur px, vx px/s, depuis 'gauche'|'droite' ou un x */
    travelling: function (o) {
      o = o || {};
      var lg = o.largeur || (R().monde && R().monde.travelling && R().monde.travelling.largeur) || 576;
      var vx = +o.vx || 8, x0;
      if (typeof o.depuis === 'number') x0 = o.depuis;
      else if (o.depuis === 'droite') { x0 = WW - lg; vx = -Math.abs(vx); }
      else x0 = clamp(M.x0, 0, WW - lg);
      GL = null;
      poser(x0, M.y0, x0 + lg, M.y1);
      TR = { vx: vx, largeur: lg };
      ANN.length = 0;
    },
    stop: function () { TR = null; GL = null; VX = 0; VY = 0; ANN.length = 0; },
    enMouvement: function () { return !!(TR || GL); },
    mursAnnonces: function () { return ANN; },
    /* distance de (x, y) au mur le plus proche, vers l'intérieur ; nx, ny : normale vers l'intérieur */
    distMur: function (x, y) {
      var dl = x - M.x0, dr = M.x1 - x, dt = y - M.y0, db = M.y1 - y, d = dl, nx = 1, ny = 0;
      if (dr < d) { d = dr; nx = -1; ny = 0; }
      if (dt < d) { d = dt; nx = 0; ny = 1; }
      if (db < d) { d = db; nx = 0; ny = -1; }
      DM.d = d; DM.nx = nx; DM.ny = ny; DM.mobile = !!(TR || GL);
      DM.pan = clamp((x - (M.x0 + M.x1) / 2) / Math.max(1, (M.x1 - M.x0) / 2), -1, 1);
      return DM;
    },
    update: function (dt) {
      if (!(dt > 0)) { VX = 0; VY = 0; miroir(); return; }
      var ox = M.x0, oy = M.y0;
      if (GL) {
        GL.t += dt;
        var k = clamp(GL.t / GL.dur, 0, 1), a = GL.de, b = GL.vers;
        poser(a.x0 + (b.x0 - a.x0) * k, a.y0 + (b.y0 - a.y0) * k, a.x1 + (b.x1 - a.x1) * k, a.y1 + (b.y1 - a.y1) * k);
        if (k >= 1) { GL = null; ANN.length = 0; }
      } else if (TR) {
        var nx0 = M.x0 + TR.vx * dt, lg = M.x1 - M.x0;
        if (nx0 < 0) { nx0 = 0; TR = null; } else if (nx0 + lg > WW) { nx0 = WW - lg; TR = null; }
        poser(nx0, M.y0, nx0 + lg, M.y1);
      }
      VX = (M.x0 - ox) / dt; VY = (M.y0 - oy) / dt;
      miroir();
    }
  };

  function miroir() {
    var s = S(); if (!s) return;
    var m = s.monde;
    if (!m || typeof m !== 'object') m = s.monde = { x0: 0, y0: 0, x1: 0, y1: 0, vx: 0, vy: 0, mobile: false, annonce: [] };
    m.x0 = M.x0; m.y0 = M.y0; m.x1 = M.x1; m.y1 = M.y1; m.vx = VX; m.vy = VY; m.mobile = !!(TR || GL);
    m.annonce = ANN;
  }

  /* ================================ la caméra ================================ */
  var C = { fx: 0, fy: 0, jx: 0, jy: 0, focus: null, mode: 'jeu', img: -1 };
  var VUE = { x: 0, y: 0, w: 0, h: 0, devant: 0, teteX: 0, teteY: 0 };
  var ANT = { x: 0, y: 0, w: 0, h: 0 };

  function tete() { var s = S(); return s && s.player && typeof s.player.x === 'number' ? s.player : null; }
  function vueTaille() { var g = N.gfx; cam.w = (g && g.W) | 0 || 360; cam.h = (g && g.H) | 0 || 180; }

  function cible(out) {
    var p = tete(), RC = R().camera || {}, ax = RC.avanceX || 0.3, ay = RC.avanceY || 0.42;
    var tx = WW / 2, ty = WH / 2;
    if (C.focus) { tx = C.focus.x; ty = C.focus.y; }
    else if (p) {
      var k = p.boost ? (RC.avanceBoost || 1.4) : 1;
      tx = p.x + Math.cos(p.ang) * cam.w * ax * 0.5 * k;
      ty = p.y + Math.sin(p.ang) * cam.h * ay * 0.5 * k;
    }
    var deb = RC.debord || 16;
    out.x = clamp(tx - cam.w / 2, -deb, Math.max(-deb, WW + deb - cam.w));
    out.y = clamp(ty - cam.h / 2, -deb, Math.max(-deb, WH + deb - cam.h));
    if (cam.w > WW + 2 * deb) out.x = (WW - cam.w) / 2;
    if (cam.h > WH + 2 * deb) out.y = (WH - cam.h) / 2;
    return out;
  }
  var CB = { x: 0, y: 0 };

  var cam = {
    x: 0, y: 0, w: 360, h: 180,
    reset: function (x, y) {
      vueTaille();
      C.focus = null; C.jx = C.jy = 0; C.mode = 'jeu';
      if (typeof x === 'number') { C.fx = x - cam.w / 2; C.fy = y - cam.h / 2; }
      else { cible(CB); C.fx = CB.x; C.fy = CB.y; }
      arrondir();
    },
    update: function (dt) {
      world.update(dt);
      vueTaille();
      cible(CB);
      var am = (R().camera && R().camera.amorti) || 0.22;
      if (dt > 0) {
        var k = 1 - Math.pow(am * 0.01, dt);              // rattrapage exponentiel, indépendant de la cadence
        C.fx += (CB.x - C.fx) * k; C.fy += (CB.y - C.fy) * k;
        var jk = Math.pow(0.001, dt); C.jx *= jk; C.jy *= jk;
        if (Math.abs(C.jx) < 0.3) C.jx = 0; if (Math.abs(C.jy) < 0.3) C.jy = 0;
        if (C.focus) { C.focus.reste -= dt; if (C.focus.reste <= 0) C.focus = null; }
      }
      arrondir();
      var s = S();
      if (N.journal && N.journal.actif && N.journal.actif() && s && (s.frame | 0) !== C.img && (s.frame % 6) === 0) {
        C.img = s.frame | 0;
        var p = tete();
        VUE.x = cam.x; VUE.y = cam.y; VUE.w = cam.w; VUE.h = cam.h; VUE.devant = cam.devant();
        VUE.teteX = p ? p.x : 0; VUE.teteY = p ? p.y : 0;
        N.journal('vue', VUE);
      }
    },
    toScreen: function (x, y, out) { out = out || {}; out.x = x - cam.x; out.y = y - cam.y; return out; },
    toWorld: function (sx, sy, out) { out = out || {}; out.x = sx + cam.x; out.y = sy + cam.y; return out; },
    visible: function (x, y, m) { m = m || 0; return x >= cam.x - m && x <= cam.x + cam.w + m && y >= cam.y - m && y <= cam.y + cam.h + m; },
    /* ENTIÈREMENT dans la vue, à m px du bord (armement dans la vue, REFONTE.md § 3.8) */
    shown: function (x, y, m) { m = m || 0; return x >= cam.x + m && x <= cam.x + cam.w - m && y >= cam.y + m && y <= cam.y + cam.h - m; },
    anticipee: function (sec, out) {
      out = out || ANT;
      var p = tete(), v = p ? (p.vit || 0) : 0, a = p ? p.ang : 0;
      out.x = cam.x + Math.cos(a) * v * (sec || 0); out.y = cam.y + Math.sin(a) * v * (sec || 0); out.w = cam.w; out.h = cam.h;
      return out;
    },
    /* distance visible devant la tête, le long de son cap, jusqu'au bord de la vue */
    devant: function () {
      var p = tete(); if (!p) return 0;
      var c = Math.cos(p.ang), s = Math.sin(p.ang), d = 1e9;
      if (c > 1e-6) d = Math.min(d, (cam.x + cam.w - p.x) / c); else if (c < -1e-6) d = Math.min(d, (cam.x - p.x) / c);
      if (s > 1e-6) d = Math.min(d, (cam.y + cam.h - p.y) / s); else if (s < -1e-6) d = Math.min(d, (cam.y - p.y) / s);
      return d > 1e8 ? 0 : Math.max(0, d);
    },
    jolt: function (dx, dy) {
      var s = S(), k = (s && s.reglages && typeof s.reglages.secousse === 'number') ? s.reglages.secousse : 1;
      C.jx += (+dx || 0) * k; C.jy += (+dy || 0) * k;
    },
    focus: function (x, y, dur) { C.focus = { x: x, y: y, reste: dur > 0 ? dur : 1 }; },
    mode: function (m) { if (m) C.mode = m; return C.mode; }
  };

  function arrondir() {
    cam.x = Math.round(C.fx + C.jx); cam.y = Math.round(C.fy + C.jy);
    var s = S(); if (!s) return;
    var v = s.vue;
    if (!v || typeof v !== 'object') v = s.vue = { x: 0, y: 0, w: 0, h: 0 };
    v.x = cam.x; v.y = cam.y; v.w = cam.w; v.h = cam.h;
  }

  N.world = world;
  N.cam = cam;
})();
