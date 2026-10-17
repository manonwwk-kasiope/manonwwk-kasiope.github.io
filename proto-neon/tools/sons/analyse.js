/* tools/sons/analyse.js — les mesures d'un son rendu hors ligne (aucune dependance).
   Toutes les fonctions prennent un Float32Array mono et sa frequence d'echantillonnage.
     crete (dBFS), rms100 (le RMS le plus fort sur 100 ms), duree (de la premiere a la derniere
     amplitude au-dessus de crete - 40 dB), parts d'energie au-dessus de 400 Hz et de 4 kHz, entre
     1 et 4 kHz, centroide spectral, et les memes niveaux apres simulation d'un haut-parleur de
     telephone (passe-haut 350 Hz a 24 dB/octave, passe-bas 8 kHz). */
(function (racine) {
  'use strict';
  function db(x) { return x > 0 ? 20 * Math.log10(x) : -200; }

  function fft(re, im) {
    var n = re.length, i, j, k, m;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (m = 2; m <= n; m <<= 1) {
      var a = -2 * Math.PI / m, wr = Math.cos(a), wi = Math.sin(a);
      for (k = 0; k < n; k += m) {
        var cr = 1, ci = 0;
        for (j = 0; j < m / 2; j++) {
          var ur = re[k + j], ui = im[k + j];
          var vr = re[k + j + m / 2] * cr - im[k + j + m / 2] * ci, vi = re[k + j + m / 2] * ci + im[k + j + m / 2] * cr;
          re[k + j] = ur + vr; im[k + j] = ui + vi; re[k + j + m / 2] = ur - vr; im[k + j + m / 2] = ui - vi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }

  /* filtre biquadratique (RBJ) applique a un tableau, pour la simulation du telephone */
  function biquad(x, sr, type, f, q) {
    var w = 2 * Math.PI * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q), b0, b1, b2, a0, a1, a2;
    if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
    else { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
    a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
    var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) {
      var v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  function telephone(x, sr) {
    return biquad(biquad(biquad(x, sr, 'hp', 350, 0.7071), sr, 'hp', 350, 0.7071), sr, 'lp', 8000, 0.7071);
  }

  function crete(x) { var m = 0; for (var i = 0; i < x.length; i++) { var a = Math.abs(x[i]); if (a > m) m = a; } return m; }
  function rmsMax(x, sr, fen) {
    var w = Math.max(1, Math.round(sr * fen)), hop = Math.max(1, Math.round(sr * 0.005)), best = 0, s = 0, i;
    var c = new Float64Array(x.length + 1);
    for (i = 0; i < x.length; i++) { s += x[i] * x[i]; c[i + 1] = s; }
    for (i = 0; i + w <= x.length; i += hop) { var e = (c[i + w] - c[i]) / w; if (e > best) best = e; }
    if (x.length < w) best = c[x.length] / w;
    return Math.sqrt(best);
  }
  function rms(x, a, b) { var s = 0; a = a || 0; b = b || x.length; for (var i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); }
  function bornes(x, sr) {
    var p = crete(x), thr = Math.max(p * Math.pow(10, -40 / 20), 1e-5), a = -1, b = -1;
    for (var i = 0; i < x.length; i++) if (Math.abs(x[i]) > thr) { if (a < 0) a = i; b = i; }
    return { a: a < 0 ? 0 : a, b: b < 0 ? 0 : b, duree: a < 0 ? 0 : (b - a) / sr };
  }
  function spectre(x, sr, a, b) {
    var N = 4096, hop = 1024, P = new Float64Array(N / 2), win = new Float32Array(N), i, k;
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    var re = new Float64Array(N), im = new Float64Array(N);
    for (var s = Math.max(0, a - N / 2); s < b; s += hop) {
      for (i = 0; i < N; i++) { var j = s + i; re[i] = j < x.length ? x[j] * win[i] : 0; im[i] = 0; }
      fft(re, im);
      for (k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
    }
    return { P: P, df: sr / N };
  }
  function parts(S) {
    var tot = 0, s400 = 0, s4k = 0, s14 = 0, cen = 0;
    for (var k = 1; k < S.P.length; k++) {
      var f = k * S.df, e = S.P[k];
      tot += e; cen += e * f;
      if (f >= 400) s400 += e;
      if (f >= 4000) s4k += e;
      if (f >= 1000 && f < 4000) s14 += e;
    }
    tot = tot || 1;
    return { p400: s400 / tot, p4k: s4k / tot, p1a4k: s14 / tot, centroide: cen / tot };
  }

  /* toutes les mesures d'un son */
  function mesurer(x, sr) {
    var B = bornes(x, sr), S = parts(spectre(x, sr, B.a, B.b + 1)), tel = telephone(x, sr);
    return {
      crete: +db(crete(x)).toFixed(2),
      rms100: +db(rmsMax(x, sr, 0.1)).toFixed(2),
      duree: +B.duree.toFixed(3),
      p400: +S.p400.toFixed(3), p4k: +S.p4k.toFixed(3), p1a4k: +S.p1a4k.toFixed(3),
      centroide: Math.round(S.centroide),
      rms100Tel: +db(rmsMax(tel, sr, 0.1)).toFixed(2),
      rms30Tel: +db(rmsMax(tel, sr, 0.03)).toFixed(2),
      perteTel: +(db(rmsMax(x, sr, 0.1)) - db(rmsMax(tel, sr, 0.1))).toFixed(2)
    };
  }

  /* correlation croisee normalisee maximale (decalages de +- 20 ms), formes d'onde calees sur l'attaque */
  function correlation(x, y, sr) {
    var bx = bornes(x, sr), by = bornes(y, sr);
    var n = Math.min(Math.round(sr * 0.15), x.length - bx.a, y.length - by.a);
    var ex = 0, ey = 0, i;
    for (i = 0; i < n; i++) { ex += x[bx.a + i] * x[bx.a + i]; ey += y[by.a + i] * y[by.a + i]; }
    var lag = Math.round(sr * 0.02), best = 0;
    for (var L = -lag; L <= lag; L += 2) {
      var s = 0;
      for (i = 0; i < n; i++) { var j = i + L; if (j >= 0 && j < n) s += x[bx.a + i] * y[by.a + j]; }
      var c = Math.abs(s) / Math.sqrt(ex * ey || 1);
      if (c > best) best = c;
    }
    return +best.toFixed(3);
  }

  /* niveau d'une piste : RMS sur toute la duree, pleine bande et telephone */
  function niveauPiste(x, sr) { return { rms: db(rms(x)), rmsTel: db(rms(telephone(x, sr))) }; }

  var API = { mesurer: mesurer, correlation: correlation, niveauPiste: niveauPiste, telephone: telephone, db: db, spectre: spectre, bornes: bornes };
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  if (racine) racine.SONS_ANALYSE = API;
})(typeof window !== 'undefined' ? window : this);
