/* ===== 73-colosse.js — N.colosse : LE CYCLOPE, boss en trois phases (REFONTE.md § 4.8) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 5b. Le repli reprend le colosse de la démo
   (70-game.js, réparti par le lot 0b) : il se poste à l'opposé de la tête, alterne une salve radiale et un
   laser visé, tous deux télégraphiés (N.fx.tele, ≥ N.R.colosse.teleMin), et sa vie se lit sur un arc.
   Ce qui change avec le contrat 1.0 : il vit dans N.ennemis.list (type 'cyclope', boss, partie 'oeil'),
   ses PV sont N.R.colosse.pvTotal, ses phases suivent N.R.colosse.seuils et s'annoncent par l'événement
   'phase' (arrivee, entree n, enrage, mort). Son contact tue (cause 'ennemi', auteur 'cyclope') ; ses tirs
   passent par N.ennemis.tir avec la source du CYCLOPE. La mort n'est pas un consommateur de 'kill' : le
   module voit ses PV tomber à zéro et émet phase/mort. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var TAU = Math.PI * 2;

  function RC() { return (N.R && N.R.colosse) || { pvTotal: 4500, seuils: [1, 0.66, 0.33, 0], teleMin: 0.8, enrage: { apres: 100 } }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function segDist2(px, py, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy, u = l > 0 ? ((px - x0) * dx + (py - y0) * dy) / l : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return d2(px, py, x0 + dx * u, y0 + dy * u);
  }
  function I(n) { return N.pal.i(n); }

  var C = { actif: false, e: null, phase: 0, t: 0, atk: null, atkT: 0, atkD: 1, cd: 1.4, cyc: 0, aim: 0, enrage: false, mort: false, laser: 0 };
  var TD = { id: 0, forme: 'disque', x0: 0, y0: 0, x1: 0, y1: 0, r: 0, a0: 0, a1: 0, reste: 0, total: 0, cible: 'tout', par: { type: 'cyclope', id: -1 } };
  var CYCLE = ['radial', 'laser', 'radial', 'laser'];

  function emettre(n, evt) { if (N.ev) N.ev.emit('phase', { n: n, evt: evt }); }
  function src() { return { genre: 'ennemi', type: 'cyclope', id: C.e ? C.e.id : null }; }

  var colosse = {
    start: function () {
      var w = N.world, p = N.S && N.S.player, cx = w ? (w.x0 + w.x1) / 2 : 512, cy = w ? (w.y0 + w.y1) / 2 : 256;
      var x = p && p.x > cx ? cx - 140 : cx + 140;
      C.actif = true; C.mort = false; C.phase = 1; C.t = 0; C.atk = null; C.cd = 1.4; C.cyc = 0; C.enrage = false; C.laser = 0;
      emettre(0, 'arrivee');
      C.e = N.ennemis ? N.ennemis.spawn('cyclope', x, cy, { partie: 'oeil', pv: RC().pvTotal }) : null;
      emettre(1, 'entree');
    },
    update: function (dt) {
      if (!C.actif || !(dt > 0)) return;
      var e = C.e, p = N.S && N.S.player, R = RC();
      if (!e) return;
      C.t += dt;
      if (e.etat === 'mort' || e.pv <= 0) { C.actif = false; C.mort = true; C.atk = null; emettre(C.phase, 'mort'); return; }
      /* les phases, par les seuils de PV */
      var f = e.pv / e.pvMax, ph = f > R.seuils[1] ? 1 : f > R.seuils[2] ? 2 : 3;
      if (ph > C.phase) { C.phase = ph; emettre(ph, 'entree'); }
      if (!C.enrage && C.t >= ((R.enrage && R.enrage.apres) || 100)) { C.enrage = true; emettre(C.phase, 'enrage'); }
      if (!p) return;
      /* il se poste à l'opposé de la tête (démo) */
      var w = N.world, cx = w ? (w.x0 + w.x1) / 2 : 512, cy = w ? (w.y0 + w.y1) / 2 : 256;
      var ax = clamp(cx + (cx - p.x) * 0.45, (w ? w.x0 : 0) + 40, (w ? w.x1 : 1024) - 40), ay = clamp(cy + (cy - p.y) * 0.45, (w ? w.y0 : 0) + 40, (w ? w.y1 : 512) - 40);
      var sp0 = C.atk ? 7 : 17, dx = ax - e.x, dy = ay - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) { e.x += dx / d * Math.min(d, sp0 * dt); e.y += dy / d * Math.min(d, sp0 * dt); }
      var k, tm = Math.max(R.teleMin || 0.8, 0.9);
      if (!C.atk) {
        C.cd -= dt * (C.enrage ? 1.3 : 1);
        if (C.cd <= 0) {
          C.atk = CYCLE[C.cyc % CYCLE.length]; C.cyc++;
          C.atkD = C.atk === 'laser' ? tm + 0.25 : tm; C.atkT = C.atkD; C.aim = Math.atan2(p.y - e.y, p.x - e.x);
          TD.id = N.ids.suivant(); TD.forme = C.atk === 'laser' ? 'ligne' : 'disque'; TD.total = C.atkD; TD.par.id = e.id;
          e.tele = TD.id; e.etat = 'arme';
          if (N.ev) N.ev.emit('arme', { id: e.id, type: 'cyclope', forme: TD.forme, total: C.atkD, cible: 'tout', shown: !N.cam || N.cam.visible(e.x, e.y, 0), rallonge: false });
        }
      } else {
        C.atkT -= dt;
        if (C.atk === 'laser') { TD.x0 = e.x; TD.y0 = e.y; TD.x1 = e.x + Math.cos(C.aim) * 1100; TD.y1 = e.y + Math.sin(C.aim) * 1100; TD.r = 3; }
        else { TD.x0 = TD.x1 = e.x; TD.y0 = TD.y1 = e.y; TD.r = 48; }
        TD.reste = C.atkT;
        if (N.fx && N.fx.tele) N.fx.tele(TD);
        if (C.atkT <= 0) {
          if (C.atk === 'radial') {
            var nb = C.phase >= 2 ? 14 : 10, off = C.cyc * 0.21, v = C.phase >= 3 ? 80 : 70;
            for (k = 0; k < nb; k++) { var aa = off + k / nb * TAU; if (N.ennemis) N.ennemis.tir(e.x + Math.cos(aa) * 14, e.y + Math.sin(aa) * 14, Math.cos(aa) * v, Math.sin(aa) * v, { src: src(), r: 2.5, vie: 6 }); }
            if (N.fx && N.fx.shake) N.fx.shake(2);
          } else C.laser = 0.4;
          C.atk = null; C.cd = C.phase >= 2 ? 1.0 : 1.5; e.tele = -1; e.etat = 'approche';
        }
      }
      if (C.laser > 0) {
        C.laser -= dt;
        if (p.etat === 'vivant' && N.joueuse && segDist2(p.x, p.y, e.x, e.y, e.x + Math.cos(C.aim) * 1100, e.y + Math.sin(C.aim) * 1100) < 36) N.joueuse.tuer('laser', src());
      }
      /* le contact tue */
      if (p.etat === 'vivant' && N.joueuse && d2(e.x, e.y, p.x, p.y) < (e.r + 3) * (e.r + 3)) N.joueuse.tuer('ennemi', src());
    },
    draw: function () { /* le corps est dessiné par N.ennemis (sprite 'colosse') */ },
    drawTop: function () {
      var e = C.e, g = N.gfx; if (!C.actif || !e || !g || !N.pal) return;
      if (g.owner) g.owner(5);
      if (C.laser > 0) {
        var c = Math.cos(C.aim), s = Math.sin(C.aim);
        for (var i = 12; i < 600; i++) { var x = e.x + c * i, y = e.y + s * i; if (N.cam && !N.cam.visible(x, y, 3)) continue; g.px(x - s * 2, y + c * 2, I('nuitProfonde')); g.px(x + s * 2, y - c * 2, I('nuitProfonde')); g.px(x, y, I('os')); g.px(x - s, y + c, I('rosePale')); g.px(x + s, y - c, I('rosePale')); }
      }
      /* sa vie se lit sur lui-même : un arc qui se vide (démo) */
      var fr = clamp(e.pv / e.pvMax, 0, 1), n = Math.ceil(fr * 72);
      for (var j = 0; j < n; j++) { var b = -Math.PI / 2 + j / 72 * TAU; g.px(e.x + Math.cos(b) * 29, e.y + Math.sin(b) * 29, j % 9 === 8 ? I('nuitProfonde') : I('rosePale')); }
      if (g.owner) g.owner(0);
    },
    actif: function () { return C.actif; },
    phase: function () { return C.phase; },
    pv: function () { return C.e ? Math.max(0, C.e.pv) : 0; },
    mort: function () { return C.mort; },
    reset: function () { C.actif = false; C.e = null; C.phase = 0; C.mort = false; C.atk = null; C.laser = 0; }
  };
  N.colosse = colosse;
})();
