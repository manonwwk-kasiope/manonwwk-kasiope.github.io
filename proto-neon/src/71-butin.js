/* ===== 71-butin.js — N.butin : cellules, noyaux, PASTILLE, aimant, expiration =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 3a. Le code des cellules vient de la démo
   (70-game.js, réparti par le lot 0b) : largage avec élan freiné, aimant vers la tête, prise, clignotement
   avant expiration, apparition qui s'allume au lieu de surgir. Ce qui change : coordonnées MONDE, chiffres
   de N.R.butin, objets au schéma de S.butin ({id, type, x, y, valeur, vie}, état privé préfixé « _ »),
   rayon d'aimant lu dans N.cartes.mods.aimant, et la prise émet 'ramassage' (seul émetteur).
   Consommateurs : kill (40 : largage), coupe (40 : cellules de la coupe), lasso (40 : aspiration).
   Flux de hasard : 'butin'. Miroir : S.butin (= N.butin.list, même tableau). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '71-butin', TAU = Math.PI * 2, MAX = 160;

  function RB() { return (N.R && N.R.butin) || null; }
  function rng() { return N.rng('butin'); }
  function I(n) { return N.pal.i(n); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var list = [];

  function valeur(type) {
    var B = RB();
    if (type === 'noyau') return (B && B.noyau.xp) || 5;
    if (type === 'pastille') return 0;
    return (B && B.cellule.xp) || 1;
  }
  function vie(type) {
    var B = RB();
    if (type === 'noyau') return (B && B.noyau.expire) || 9;
    if (type === 'pastille') return (B && B.pastille.expire) || 12;
    return (B && B.cellule.expire) || 9;
  }
  function ajouter(type, x, y, vx, vy, duree, tele) {
    if (list.length >= MAX) return null;
    var o = { id: N.ids.suivant(), type: type, x: x, y: y, valeur: valeur(type), vie: duree > 0 ? duree : vie(type),
      _vx: vx || 0, _vy: vy || 0, _tele: tele || 0, _f: list.length & 3 };
    list.push(o);
    return o;
  }

  function lacher(x, y, n, opts) {
    var type = (opts && opts.type) || 'cellule', r = rng(), k, out = 0;
    n = n | 0; if (n < 1) n = 1;
    for (k = 0; k < n; k++) {
      var a = r.r(0, TAU), v = n > 1 ? r.r(20, 60) : 0;
      if (ajouter(type, x, y, Math.cos(a) * v, Math.sin(a) * v, opts && opts.vie, opts && opts.tele)) out++;
    }
    return out;
  }
  /* aspiration : tout le butin dans le polygone (tableau plat [x0,y0,x1,y1…]) est ramassé */
  function dedans(poly, x, y) {
    var c = false, n = poly.length / 2;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = poly[2 * i], yi = poly[2 * i + 1], xj = poly[2 * j], yj = poly[2 * j + 1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) c = !c;
    }
    return c;
  }
  function aspirer(poly) {
    if (!poly || poly.length < 6) return 0;
    var n = 0;
    for (var i = list.length - 1; i >= 0; i--) if (dedans(poly, list[i].x, list[i].y)) { prendre(i); n++; }
    return n;
  }
  /* une pluie de cellules dans l'arène, loin de la tête */
  function pluie(n) {
    var w = N.world, r = rng(), p = N.S && N.S.player, out = 0;
    for (var k = 0; k < (n | 0); k++) {
      for (var t = 0; t < 10; t++) {
        var x = r.r((w ? w.x0 : 0) + 12, (w ? w.x1 : 1024) - 12), y = r.r((w ? w.y0 : 0) + 12, (w ? w.y1 : 512) - 12);
        if (!p || d2(x, y, p.x, p.y) > 45 * 45) { if (ajouter('cellule', x, y, 0, 0, 14, 0.5)) out++; break; }
      }
    }
    return out;
  }

  function prendre(i) {
    var o = list[i];
    list.splice(i, 1);
    if (N.ev) N.ev.emit('ramassage', { type: o.type, x: o.x, y: o.y, valeur: o.valeur });
  }

  function update(dt) {
    if (!(dt > 0)) return;
    var B = RB(), p = N.S && N.S.player, vivant = p && (p.etat === 'vivant' || p.etat === 'reapparition');
    var mods = N.cartes && N.cartes.mods, ra = (mods && mods.aimant) || (B && B.aimant[0]) || 28, rp = (B && B.prise) || 8;
    var w = N.world;
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if (c._tele > 0) { c._tele -= dt; continue; }
      c.vie -= dt;
      if (c.vie <= 0) { list.splice(i, 1); continue; }
      var f = Math.pow(0.05, dt); c._vx *= f; c._vy *= f;
      if (vivant && c.type !== 'pastille') {            // la PASTILLE n'est pas aimantée (N.R.butin.pastille)
        var dd = d2(c.x, c.y, p.x, p.y);
        if (dd < ra * ra) {
          var d = Math.sqrt(dd) || 1, pull = ((B && B.vitesseAimant) || 220) * (1 - d / ra) + 40;
          c._vx += (p.x - c.x) / d * pull * dt * 6; c._vy += (p.y - c.y) / d * pull * dt * 6;
        }
      }
      if (vivant && d2(c.x, c.y, p.x, p.y) < rp * rp) { prendre(i); continue; }
      c.x += c._vx * dt; c.y += c._vy * dt;
      if (w) { c.x = clamp(c.x, w.x0 + 4, w.x1 - 4); c.y = clamp(c.y, w.y0 + 4, w.y1 - 4); }
    }
  }

  function draw() {
    var g = N.gfx; if (!g || !N.pal) return;
    var s0 = N.S, fr = s0 ? (s0.frame | 0) : 0, f = (fr / 8) | 0, cl = (RB() && RB().clignoteAvant) || 2;
    if (g.owner) g.owner(6);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (N.cam && !N.cam.visible(c.x, c.y, 8)) continue;
      if (c._tele > 0) {                                     // une cellule s'allume, elle n'apparaît pas d'un coup
        var k = 1 - c._tele / 0.5; g.px(c.x, c.y, I('ambre')); g.px(c.x - 3 * k, c.y, I('ambre')); g.px(c.x + 3 * k, c.y, I('ambre'));
        continue;
      }
      if (c.vie < cl && ((fr >> 2) & 1)) continue;
      var nom = c.type === 'cellule' ? 'butin' : c.type, s = (N.spr && N.spr.get) ? N.spr.get(nom, 0, f + c._f) : null;
      if (s && s.data && s.w > 0) g.blit(s, Math.round(c.x) - (s.cx !== undefined ? s.cx : s.w >> 1), Math.round(c.y) - (s.cy !== undefined ? s.cy : s.h >> 1));
      else {
        var ci = c.type === 'noyau' ? I('jaune') : c.type === 'pastille' ? I('os') : I('ambre');
        g.circ(c.x, c.y, c.type === 'cellule' ? 3 : 5, I('nuitProfonde')); g.circ(c.x, c.y, c.type === 'cellule' ? 2 : 4, ci);
      }
    }
    if (g.owner) g.owner(0);
  }

  function abonner() {
    if (!N.ev) return;
    N.ev.on('kill', 40, function (c) {
      if (c.src && c.src.genre === 'decor') return;                       // ni butin ni score (CONTRAT.md § 6)
      var L = RB() && RB().largages, r = rng();
      if (c.elite) { lacher(c.x, c.y, (L && L.elite.cellules) || 6); lacher(c.x, c.y, 1, { type: 'noyau' }); return; }
      if (c.boss) { lacher(c.x, c.y, 24); return; }
      if (r.f() < ((L && L.ordinaire) || 0.45)) lacher(c.x, c.y, 1);
    }, QUI);
    N.ev.on('coupe', 40, function (c) {
      var n = Math.floor((c.perdus | 0) / ((N.R && N.R.mort.coupe.segmentsParCellule) || 2));
      if (n > 0) lacher(c.x, c.y, n, { vie: (N.R && N.R.mort.coupe.expireCellules) || 3 });
    }, QUI);
    N.ev.on('lasso', 40, function (c) {
      if (c.poly) aspirer(c.poly);
      if ((c.n | 0) >= ((RB() && RB().largages.lasso.noyauDes) || 4)) lacher(c.x, c.y, 1, { type: 'noyau' });
    }, QUI);
  }

  var butin = {
    reset: function () {
      list.length = 0;
      abonner();
      var s = N.S; if (s) s.butin = list;
      /* l'énergie de départ : une ligne devant la tête (on comprend où aller), quelques cellules ailleurs */
      var p = s && s.player;
      if (p && typeof p.x === 'number') for (var k = 1; k <= 6; k++) ajouter('cellule', p.x + Math.cos(p.ang) * (16 + k * 13), p.y + Math.sin(p.ang) * (16 + k * 13), 0, 0, 14, 0);
      pluie(4);
    },
    update: update, draw: draw, lacher: lacher, aspirer: aspirer, pluie: pluie, list: list
  };
  N.butin = butin;
})();
