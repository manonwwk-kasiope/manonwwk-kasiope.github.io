/* tools/jeu/pilote.js — script injecté par le banc (jamais par le jeu). Trois pilotes déterministes,
   appelés par 70-game.js dans update() via window.__PILOT, avant la lecture des entrées :
     'inerte'  ne touche jamais l'écran (J-11)
     'simple'  va vers la cellule d'énergie la plus proche, rien d'autre (J-11)
     'expert'  évite menaces, tirs et télégraphes, chasse les ennemis, ramasse l'énergie
   Il fige aussi la boucle aux instants demandés (window.__HOLD), pour que le banc capture l'image exacte.
   Et il relève, autour de la mort du colosse, la part de pixels « brasier » et la secousse. */
(function () {
  /* boucle accélérée : requestAnimationFrame rappelé sans attendre l'écran ; __DT garde le pas de temps */
  window.__HOLD = false;
  window.requestAnimationFrame = function (cb) {
    setTimeout(function tick() { if (window.__HOLD) { setTimeout(tick, 15); return; } cb(performance.now()); }, 0);
    return 1;
  };
  window.__LOG = { boom: [], shots: [], held: null, frames: 0 };
  var cps = (window.__CHECK || []).slice(), deathF = -1, BR = -1;
  window.__PILOT = function (d) {
    var S = window.__S, P = d.P, inp = S.input, N = window.__N, L = window.__LOG;
    L.frames++;
    if (BR < 0) {
      BR = N.pal.i('brasier');
      /* mesure avant la couche du dessus du jeu : ce que 50-fx.js a posé seul */
      var g0 = N.game, dt0 = g0.drawTop;
      g0.drawTop = function () {
        if (window.__MESURE) { var bb = N.gfx.buf(), m = 0; for (var q = 0; q < bb.length; q++) if (bb[q] === BR) m++; window.__PRE = m / bb.length; }
        dt0();
      };
    }
    /* relevé de l'explosion du colosse : tampon de l'image précédente */
    if (d.stats.bossDeathT > 0) {
      if (deathF < 0) deathF = L.frames;
      window.__MESURE = true;
      if (L.frames - deathF <= 70) {
        var b = N.gfx.buf(), n = 0; for (var i = 0; i < b.length; i++) if (b[i] === BR) n++;
        L.boom.push({ f: L.frames - deathF, brasier: +(n / b.length).toFixed(4), fxSeul: +(window.__PRE || 0).toFixed(4), shake: +(S.shake || 0).toFixed(2), frozen: N.fx && N.fx.frozen ? N.fx.frozen() : null });
      }
    }
    /* critère 3 : part de cyan hors du masque de la joueuse (tête, corps, et à part ses tirs), toutes les 30 images */
    if (L.frames % 30 === 0 && d.st === 'jeu') {
      var CY = N.pal.i('cyan'), CP = N.pal.i('cyanPale'), bf = N.gfx.buf(), Wb = N.gfx.W, Hb = N.gfx.H, sg = d.segs(), nc = 0, out1 = 0, out2 = 0;
      var mask = new Uint8Array(Wb * Hb);
      function disk(cx, cy, r, v) { for (var yy = Math.floor(cy - r); yy <= cy + r; yy++) for (var xx = Math.floor(cx - r); xx <= cx + r; xx++) if (xx >= 0 && yy >= 0 && xx < Wb && yy < Hb && (xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) <= r * r) mask[yy * Wb + xx] |= v; }
      disk(P.x, P.y, 8, 1); for (var si = 0; si < sg.length; si++) disk(sg[si][0], sg[si][1], 6, 1);
      for (var pi = 0; pi < d.PB.length; pi++) disk(d.PB[pi].x, d.PB[pi].y, 5, 2);
      for (var q = 0; q < bf.length; q++) if (bf[q] === CY || bf[q] === CP) { nc++; if (!(mask[q] & 1)) { out1++; if (!(mask[q] & 2)) out2++; } }
      L.cyan = L.cyan || { n: 0, max1: 0, max2: 0, sum1: 0, sum2: 0 };
      var f1 = out1 / bf.length, f2 = out2 / bf.length; L.cyan.n++; L.cyan.sum1 += f1; L.cyan.sum2 += f2; if (f1 > L.cyan.max1) L.cyan.max1 = f1; if (f2 > L.cyan.max2) L.cyan.max2 = f2;
    }
    /* points de capture */
    if (cps.length && !window.__HOLD) {
      var c = cps[0], go = false;
      if (c.t !== undefined && d.t >= c.t) go = true;
      if (c.ev === 'bosstele' && d.bossPhase === 'tele' && !d.busy && d.bossT < 1.0) go = true;
      if (c.ev === 'boss' && d.boss && d.boss.st === 'actif' && d.boss.atk) go = true;
      if (c.ev === 'bossmort' && deathF > 0 && L.frames - deathF >= (c.f || 3)) go = true;
      if (go) { cps.shift(); window.__HOLD = true; L.held = c.name; }
    }
    var mode = window.__MODE || 'expert';
    if (mode === 'inerte') { inp.mag = 0; return; }
    var hx = P.x, hy = P.y, ax = 0, ay = 0, fx = 0, fy = 0, i, e;
    var cell = null, bd = 1e9;
    for (i = 0; i < d.CELLS.length; i++) { var c0 = d.CELLS[i]; if (c0.tele > 0) continue; var dd = Math.hypot(c0.x - hx, c0.y - hy); if (dd < bd) { bd = dd; cell = c0; } }
    if (mode === 'simple') {
      if (cell) { inp.x = (cell.x - hx) / bd; inp.y = (cell.y - hy) / bd; inp.mag = 1; } else inp.mag = 0;
      return;
    }
    /* menaces */
    for (i = 0; i < d.E.length; i++) {
      e = d.E[i]; if (e.dead) continue;
      var dx = hx - e.x, dy = hy - e.y, dist = Math.hypot(dx, dy) || 1;
      var R = e.k === 'colosse' ? 62 : e.k === 'mine' ? 30 : 34;
      if (dist < R) { var w = (R - dist) / R; fx += dx / dist * w * 5; fy += dy / dist * w * 5; }
      var line = (e.st === 'vise' && e.k !== 'mine') || (e.k === 'colosse' && e.atk === 'laser');
      if (line) {
        var a = e.aim, ca = Math.cos(a), sa = Math.sin(a);
        var along = (hx - e.x) * ca + (hy - e.y) * sa, perp = -(hx - e.x) * sa + (hy - e.y) * ca;
        var len = e.k === 'fleche' ? 80 : 2000;
        if (along > -6 && along < len && Math.abs(perp) < 16) { var sg = perp >= 0 ? 1 : -1; fx += -sa * sg * 7; fy += ca * sg * 7; }
      }
      if (e.k === 'mine' && e.st === 'arme' && dist < 36) { fx += dx / dist * 8; fy += dy / dist * 8; }
      if (e.k === 'colosse' && e.atk === 'radial' && dist < 70) { fx += dx / dist * 3; fy += dy / dist * 3; }
    }
    for (i = 0; i < d.EB.length; i++) {
      var b0 = d.EB[i], rx = b0.x - hx, ry = b0.y - hy, vx = b0.vx - Math.cos(P.ang) * 64, vy = b0.vy - Math.sin(P.ang) * 64;
      var vv = vx * vx + vy * vy || 1, tc = -(rx * vx + ry * vy) / vv;
      if (tc < 0 || tc > 0.7) continue;
      var qx = rx + vx * tc, qy = ry + vy * tc, md = Math.hypot(qx, qy);
      if (md < 11) {
        var nb = Math.hypot(b0.vx, b0.vy) || 1, px = -b0.vy / nb, py = b0.vx / nb;
        if (px * -qx + py * -qy < 0) { px = -px; py = -py; }
        var ww = (11 - md) / 11 * (1 - tc / 0.7) * 7; fx += px * ww; fy += py * ww;
      }
    }
    for (i = 0; i < d.BEAMS.length; i++) {
      var B = d.BEAMS[i], bx = B.x1 - B.x0, by = B.y1 - B.y0, bl = Math.hypot(bx, by) || 1, ux = bx / bl, uy = by / bl;
      var pp = -(hx - B.x0) * uy + (hy - B.y0) * ux;
      if (Math.abs(pp) < 14) { var s2 = pp >= 0 ? 1 : -1; fx += -uy * s2 * 8; fy += ux * s2 * 8; }
    }
    /* chasse : l'ennemi visible le plus proche, pour l'avoir dans l'axe du tir */
    var tgt = d.boss && d.boss.st === 'actif' ? d.boss : null, td = tgt ? Math.hypot(tgt.x - hx, tgt.y - hy) : 1e9;
    if (!tgt) for (i = 0; i < d.E.length; i++) {
      e = d.E[i]; if (e.dead || e.x < 4 || e.x > d.W - 4 || e.y < 4 || e.y > d.H - 4) continue;
      var de = Math.hypot(e.x - hx, e.y - hy); if (de > 40 && de < td) { td = de; tgt = e; }
    }
    if (tgt && td < 1e9) { var kk = tgt.k === 'colosse' ? (td > 75 ? 1.4 : 0.5) : (td < 130 ? 1.1 : 0.4); ax += (tgt.x - hx) / td * kk; ay += (tgt.y - hy) / td * kk; }
    if (cell) { var kc = bd < 50 ? 1.6 : 0.7; ax += (cell.x - hx) / bd * kc; ay += (cell.y - hy) / bd * kc; }
    var m0 = 24;
    if (hx < d.AL + m0) ax += 1.2; if (hx > d.AR - m0) ax -= 1.2; if (hy < d.AT + m0) ay += 1.2; if (hy > d.AB - m0) ay -= 1.2;
    var X = ax + fx, Y = ay + fy, M = Math.hypot(X, Y);
    if (M < 0.05) { inp.mag = 0; return; }
    inp.x = X / M; inp.y = Y / M; inp.mag = 1;
  };
})();
