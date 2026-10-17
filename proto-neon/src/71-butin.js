/* ===== 71-butin.js — N.butin : cellules, noyaux, pastille (aimant, ramassage, expiration) =====

   Tiré de 70-game.js (lot 0b) : addCell, freeCell, updCells, drawCells. Chaque objet est au schéma `butin`
   (§ 7.5) : { id, type, x, y, valeur, vie } ; ce qui est propre au module est préfixé « _ ».

   ÉMET `ramassage` (seul émetteur) : { type, x, y, valeur }. Ses effets arrivent par N.ev (la joueuse grandit au
   rang 10, le score compte au rang 20, la mise en scène joue le son au rang 60), jamais par appel.
   CONSOMME `kill` (rang 40) : le largage de l'ennemi tué ; `coupe` (rang 40) : une cellule pour deux segments
   détachés ; `lasso` (rang 40) : l'aspiration des tués, quand N.joueuse l'émettra.

   Interface : reset(), update(dt), draw(), lacher(x, y, n, {type, vie, libre, tele}), aspirer(poly), pluie(n),
   list. Chiffres : N.R.butin ; ceux de la démo qui manquent sont dans CFG, marqués « → N.R ». */
N.butin = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                  // → N.R
    libreVie: 14,                              // une cellule libre dure 14 s dans la démo
    largage: { fleche: 1, mine: 1, tourelle: 2, sentinelle: 2, cyclope: 24 },
    vitesseLacher: 50, plafond: 140
  };
  var L = [];
  var S = null;

  function conf(type) { return (R && R.butin && R.butin[type]) || {}; }
  function prise() { return (R && R.butin && R.butin.prise) || 8; }
  function aimant() {
    if (N.cartes && N.cartes.mods && N.cartes.mods.aimant) return N.cartes.mods.aimant;
    return (R && R.butin && R.butin.aimant && R.butin.aimant[0]) || 28;
  }
  function vitAimant() { return (R && R.butin && R.butin.vitesseAimant) || 220; }

  function reset() {
    S = N.S;
    L.length = 0;
  }

  function lacher(x, y, n, opts) {
    opts = opts || {};
    var type = opts.type || 'cellule', c = conf(type), v = opts.libre ? 0 : CFG.vitesseLacher;
    for (var i = 0; i < (n | 0) && L.length < CFG.plafond; i++) {
      var vie = opts.vie || (opts.libre ? CFG.libreVie : c.expire || 9);
      L.push({
        id: N.ids.suivant(), type: type, x: x, y: y, valeur: c.energie || 1, vie: vie,
        _vx: v ? O.rr('butin', -v, v) : 0, _vy: v ? O.rr('butin', -v, v) : 0, _t: 0, _tele: opts.tele || 0,
        _libre: !!opts.libre, _f: L.length & 3, _aspire: false
      });
    }
  }

  /* des cellules libres : toujours un peu à prendre, loin de la tête */
  function libre(tele) {
    var A = O.A, V = O.VUE, J = N.joueuse && N.joueuse.tete;
    for (var k = 0; k < 10; k++) {
      var x0 = Math.max(A.x0, V.x) + 8, x1 = Math.min(A.x1, V.x + V.w) - 8, y0 = Math.max(A.y0, V.y) + 8, y1 = Math.min(A.y1, V.y + V.h) - 8;
      var x = O.rr('butin', x0, Math.max(x0 + 1, x1)), y = O.rr('butin', y0, Math.max(y0 + 1, y1));
      if (!J || O.d2(x, y, J.x, J.y) > 45 * 45) { lacher(x, y, 1, { libre: true, tele: tele || 0 }); return; }
    }
  }
  function pluie(n) { for (var i = 0; i < (n | 0); i++) libre(0.5); }
  function nbLibres() { var n = 0; for (var i = 0; i < L.length; i++) if (L[i]._libre) n++; return n; }

  /* aspirer(poly) : les objets dans le polygone [x0, y0, x1, y1, ...] sont aspirés vers la tête (LASSO) */
  function aspirer(poly) {
    if (!poly || poly.length < 6) return 0;
    var n = 0;
    for (var i = 0; i < L.length; i++) {
      var o = L[i], dedans = false, nv = poly.length / 2;
      for (var a = 0, b = nv - 1; a < nv; b = a++) {
        var xa = poly[a * 2], ya = poly[a * 2 + 1], xb = poly[b * 2], yb = poly[b * 2 + 1];
        if (((ya > o.y) !== (yb > o.y)) && (o.x < (xb - xa) * (o.y - ya) / (yb - ya) + xa)) dedans = !dedans;
      }
      if (dedans) { o._aspire = true; n++; }
    }
    return n;
  }

  function update(dt) {
    if (!S) S = N.S;
    var J = N.joueuse, T = J && J.tete, vivant = J && (J.etat === 'vivant' || J.etat === 'reapparition');
    var am = aimant(), pr = prise();
    for (var i = L.length - 1; i >= 0; i--) {
      var c = L[i];
      c._t += dt;
      if (c._tele > 0) { c._tele -= dt; continue; }
      c.vie -= dt;
      if (c.vie <= 0) { L.splice(i, 1); continue; }
      var f = Math.pow(0.05, dt); c._vx *= f; c._vy *= f;
      if (vivant && T) {
        var dd = O.d2(c.x, c.y, T.x, T.y);
        if (c.type !== 'pastille' && (dd < am * am || c._aspire)) {
          var d = Math.sqrt(dd) || 1, pull = c._aspire ? vitAimant() * 2 : 160 * (1 - Math.min(1, d / am)) + 40;
          c._vx += (T.x - c.x) / d * pull * dt * 6; c._vy += (T.y - c.y) / d * pull * dt * 6;
        }
        if (dd < pr * pr) {
          L.splice(i, 1);
          if (N.ev) N.ev.emit('ramassage', { type: c.type, x: c.x, y: c.y, valeur: c.valeur });
          continue;
        }
      }
      c.x += c._vx * dt; c.y += c._vy * dt;
      var A = O.A;
      c.x = O.clamp(c.x, A.x0 - 4, A.x1 + 4); c.y = O.clamp(c.y, A.y0 - 4, A.y1 + 4);
    }
  }

  function draw() {
    var f = Math.floor(O.T.ak * 8), g = N.gfx;
    for (var i = 0; i < L.length; i++) {
      var c = L[i];
      if (c._tele > 0) {                                    // une cellule libre s'allume, elle n'apparaît pas d'un coup
        var k = 1 - c._tele / 0.5;
        g.px(c.x, c.y, O.AMBRE); g.px(c.x - 3 * k, c.y, O.AMBRE); g.px(c.x + 3 * k, c.y, O.AMBRE); g.px(c.x, c.y - 3 * k, O.AMBRE); g.px(c.x, c.y + 3 * k, O.AMBRE);
        continue;
      }
      if (c.vie < 2 && (f & 1)) continue;
      O.put(O.sp(c.type === 'noyau' ? 'butin:noyau' : 'butin', f + c._f), c.x, c.y);
    }
  }

  /* ---- les consommateurs ---- */
  if (N.ev) {
    N.ev.on('kill', 40, function (c) {
      if (c.src && c.src.genre === 'decor') return;               // la purge de fin de vague ne largue rien
      var n = c.boss ? CFG.largage.cyclope : (CFG.largage[c.type] || 1);
      if (c.boss) {                                         // le colosse éclate en couronne
        for (var k = 0; k < n; k++) {
          var a = k / n * O.TAU, v = O.rr('butin', 40, 90);
          if (L.length < CFG.plafond) L.push({ id: N.ids.suivant(), type: 'cellule', x: c.x, y: c.y, valeur: 1, vie: conf('cellule').expire || 9,
            _vx: Math.cos(a) * v, _vy: Math.sin(a) * v, _t: 0, _tele: 0, _libre: false, _f: L.length & 3, _aspire: false });
        }
      } else lacher(c.x, c.y, n, { type: 'cellule' });
    }, '71-butin');
    N.ev.on('coupe', 40, function (c) {
      /* une cellule pour deux segments détachés, à l'endroit où ils étaient (la trace les garde encore) */
      var J = N.joueuse, cm = (R && R.mort && R.mort.coupe) || { segmentsParCellule: 2, expireCellules: 3 };
      if (!J || !J.segPos) return;
      var base = J.len();
      for (var i = 0; i < c.perdus; i += cm.segmentsParCellule) {
        var p = J.segPos(base + i);
        lacher(p.x, p.y, 1, { type: 'cellule', vie: cm.expireCellules });
      }
    }, '71-butin');
  }

  return { reset: reset, update: update, draw: draw, lacher: lacher, aspirer: aspirer, pluie: pluie, libre: libre, nbLibres: nbLibres, list: L };
})();
