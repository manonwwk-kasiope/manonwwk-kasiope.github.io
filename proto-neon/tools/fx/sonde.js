/* tools/fx/sonde.js — injecté dans la page de test, jamais dans le jeu.
   Remplace N.game par une scène neutre (fond quadrillé + repères os), planifie des appels à N.fx image
   par image, et après chaque N.crt.apply lit le canvas de SORTIE (getImageData) : tout ce qui est mesuré
   l'est sur les pixels affichés, pas sur l'état interne. */
(function () {
  var N = window.__N, S = window.__S;
  var LIN = new Float32Array(256);
  for (var i = 0; i < 256; i++) { var c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var P = N.pal;
  var T = window.__FXT = { k: 0, on: false, log: [], shots: {}, act: {}, shotAt: {}, refAt: {}, ref: null, markers: [], grid: true, lum: null, cu: 0, cd: 0, dt: 0 };

  /* scène neutre : vide, treillis violet/indigo, repères 4x4 en os pour lire le déplacement de la caméra */
  N.game = {
    reset: function () {}, tension: function () { return 0; },
    update: function (dt) { T.k++; T.dt = dt; var a = T.act[T.k]; if (a) a(); },
    draw: function () {
      var g = N.gfx; g.clear(0);
      if (T.grid) {
        for (var x = 6; x < g.W; x += 12) g.rect(x, 0, 1, g.H, 3);
        for (var y = 6; y < g.H; y += 12) g.rect(0, y, g.W, 1, 4);
      }
      for (var m = 0; m < T.markers.length; m++) g.rect(T.markers[m][0], T.markers[m][1], 4, 4, 12);
    },
    drawTop: function () {}
  };
  S.phase = 'jeu';

  /* chronométrage des effets, dans la page de test seulement */
  var fu = N.fx.update, fd = N.fx.draw;
  N.fx.update = function (dt) { var t0 = performance.now(); fu(dt); T.cu = performance.now() - t0; };
  N.fx.draw = function () { var t0 = performance.now(); fd(); T.cd = performance.now() - t0; };
  var orig = N.crt.apply;
  N.crt.apply = function (dt) { orig.call(N.crt, dt); if (T.on) probe(); };

  /* nombre de pixels de jeu par fenêtre de 10° : 341 x 256 px CSS (WCAG G176) */
  function probe() {
    var g = N.gfx, c = g.canvas(), PX = g.PX, W = g.W, H = g.H;
    var d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    var CW = c.width;
    if (!T.lum || T.lum.length !== W * H) T.lum = new Float32Array(W * H);
    var L = T.lum, nBr = 0, nBrNear = 0, nBright = 0, nOs = 0;
    var bR = P.R[11], bG = P.G[11], bB = P.B[11];
    var inv = 1 / (PX * PX);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var r = 0, gg = 0, b = 0, exact = true;
        for (var sy = 0; sy < PX; sy++) {
          var o = ((y * PX + sy) * CW + x * PX) * 4;
          for (var sx = 0; sx < PX; sx++, o += 4) {
            r += d[o]; gg += d[o + 1]; b += d[o + 2];
            if (d[o] !== bR || d[o + 1] !== bG || d[o + 2] !== bB) exact = false;
          }
        }
        r *= inv; gg *= inv; b *= inv;
        if (exact) nBr++;
        var lum = 0.2126 * LIN[r | 0] + 0.7152 * LIN[gg | 0] + 0.0722 * LIN[b | 0];
        L[y * W + x] = lum;
        if (lum >= 0.1) nBright++;
        if (lum >= 0.8) nOs++;
        if (P.near(r, gg, b) === 11) nBrNear++;
      }
    }
    /* déplacement de la caméra : où est passé chaque repère (recherche à ±16 pixels de jeu) */
    var disp = [];
    for (var m = 0; m < T.markers.length; m++) {
      var mx = T.markers[m][0], my = T.markers[m][1], best = -1, bx = 0, by = 0;
      for (var oy = -16; oy <= 16; oy++) for (var ox = -16; ox <= 16; ox++) {
        var s = 0, X = mx + ox, Y = my + oy;
        if (X < 0 || Y < 0 || X + 4 > W || Y + 4 > H) continue;
        for (var j = 0; j < 4; j++) for (var i2 = 0; i2 < 4; i2++) s += L[(Y + j) * W + X + i2];
        if (s > best) { best = s; bx = ox; by = oy; }
      }
      disp.push([bx, by]);
    }
    /* luminance moyenne de chaque champ de 10° (341 x 256 px CSS), au demi-pas, bords compris */
    var ww = Math.min(W, Math.max(4, Math.round(341 / PX))), wh = Math.min(H, Math.max(4, Math.round(256 / PX)));
    var means = [];
    function pos(dim, size) { var r = [], st = Math.max(1, size >> 1); for (var p = 0; p + size < dim; p += st) r.push(p); r.push(dim - size); return r; }
    var PXs = pos(W, ww), PYs = pos(H, wh);
    for (var a1 = 0; a1 < PYs.length; a1++) for (var a2 = 0; a2 < PXs.length; a2++) {
      var acc = 0, wy = PYs[a1], wx = PXs[a2];
      for (var yy = wy; yy < wy + wh; yy++) { var oo = yy * W; for (var xx = wx; xx < wx + ww; xx++) acc += L[oo + xx]; }
      means.push(+(acc / (ww * wh)).toFixed(4));
    }
    /* pixels nouvellement allumés : hausse de luminance d'au moins 0,1 depuis l'image de référence */
    if (T.refAt[T.k]) { if (!T.ref || T.ref.length !== L.length) T.ref = new Float32Array(L.length); T.ref.set(L); }
    var lit = 0;
    if (T.ref) for (var q = 0; q < L.length; q++) if (L[q] - T.ref[q] >= 0.1) lit++;
    var st = N.fx && N.fx.stats ? N.fx.stats : {};
    T.log.push({ f: S.frame, k: T.k, lit: lit, cu: T.cu, cd: T.cd, dt: T.dt, nBr: nBr, nBrNear: nBrNear, nBright: nBright, nOs: nOs, disp: disp,
      shake: +(S.shake || 0).toFixed(2), heat: +(S.heat || 0).toFixed(3), frozen: N.fx.frozen ? N.fx.frozen() : false,
      hs: N.fx.hitstopLeft ? N.fx.hitstopLeft() : 0, live: st.live, ex: st.ex, means: means, crt: N.crt.stats ? [N.crt.stats.ox, N.crt.stats.oy] : null });
    if (T.shotAt[T.k]) T.shots[T.k] = c.toDataURL('image/png');
  }
  T.geom = function () { var g = N.gfx; return { W: g.W, H: g.H, PX: g.PX, cw: g.canvas().width, ch: g.canvas().height, thr: N.fx.flashThreshold ? N.fx.flashThreshold() : null }; };
})();
