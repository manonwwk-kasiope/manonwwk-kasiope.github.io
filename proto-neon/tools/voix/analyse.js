/* tools/voix/analyse.js — les mesures de la voix, sur un rendu hors ligne. Script ordinaire, sans dépendance :
   déclare window.VOIX_AN (page d'écoute et banc tools/voix/mesure.mjs).
   - niveaux : crête, RMS sur la partie active, RMS en simulation de téléphone (passe-haut 350 Hz d'ordre 2,
     passe-bas 7 kHz), durée active (au-dessus de −40 dB sous la crête, par trames de 10 ms) ;
   - spectre : part d'énergie au-dessus de 4 kHz, au-dessus de 400 Hz, dans 2-5 kHz, centroïde ;
   - voyelles : f0 par autocorrélation, formants F1 F2 F3 par prédiction linéaire (LPC d'ordre 14 à 12 kHz,
     racines du polynôme), comparés aux cibles de la partition ;
   - un indice d'intelligibilité acoustique (voir `indice`). */
(function (G) {
  'use strict';
  function fft(re, im) {
    var n = re.length, i, j, k, l;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (l = 2; l <= n; l <<= 1) {
      var a = -2 * Math.PI / l, wr = Math.cos(a), wi = Math.sin(a);
      for (i = 0; i < n; i += l) {
        var cr = 1, ci = 0;
        for (k = 0; k < l / 2; k++) {
          var ur = re[i + k], ui = im[i + k], vr = re[i + k + l / 2] * cr - im[i + k + l / 2] * ci, vi = re[i + k + l / 2] * ci + im[i + k + l / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + l / 2] = ur - vr; im[i + k + l / 2] = ui - vi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  function biquad(x, sr, type, f, q) {
    var w = 2 * Math.PI * f / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), b0, b1, b2, a0, a1, a2;
    if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
    var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) { var v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function telephone(x, sr) { return biquad(biquad(biquad(x, sr, 'hp', 350, 0.707), sr, 'hp', 350, 0.707), sr, 'lp', 7000, 0.707); }
  function dB(v) { return v > 0 ? 20 * Math.log10(v) : -150; }

  /* trames de 10 ms : RMS */
  function enveloppe(x, sr) {
    var h = Math.round(sr * 0.01), r = [];
    for (var i = 0; i + h <= x.length; i += h) { var s = 0; for (var j = i; j < i + h; j++) s += x[j] * x[j]; r.push(Math.sqrt(s / h)); }
    return r;
  }
  function niveaux(x, sr) {
    var crete = 0, i; for (i = 0; i < x.length; i++) crete = Math.max(crete, Math.abs(x[i]));
    var env = enveloppe(x, sr), em = Math.max.apply(null, env), seuil = em * Math.pow(10, -40 / 20);
    var a = env.findIndex(function (v) { return v > seuil; }), b = env.length - 1; while (b > 0 && env[b] <= seuil) b--;
    var s = 0, n = 0; for (i = a; i <= b; i++) if (env[i] > em * 0.01) { s += env[i] * env[i]; n++; }
    var ph = telephone(x, sr), ep = enveloppe(ph, sr), sp = 0;
    for (i = a; i <= b; i++) if (env[i] > em * 0.01) sp += ep[i] * ep[i];
    var cp = 0; for (i = 0; i < ph.length; i++) cp = Math.max(cp, Math.abs(ph[i]));
    return {
      creteDb: +dB(crete).toFixed(2), rmsDb: +dB(Math.sqrt(s / Math.max(1, n))).toFixed(2),
      rmsTelDb: +dB(Math.sqrt(sp / Math.max(1, n))).toFixed(2), creteTelDb: +dB(cp).toFixed(2),
      debut: +(a * 0.01).toFixed(3), fin: +((b + 1) * 0.01).toFixed(3), duree: +((b + 1 - a) * 0.01).toFixed(3)
    };
  }
  /* spectre moyen, Hann 2048, pas de 512 */
  function spectre(x, sr, t0, t1) {
    var N = 2048, H = 512, a = Math.max(0, Math.floor((t0 || 0) * sr)), b = Math.min(x.length, Math.floor((t1 || x.length / sr) * sr));
    var P = new Float64Array(N / 2), win = new Float64Array(N), i, k;
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    var re = new Float64Array(N), im = new Float64Array(N);
    for (var p = a; p + N <= b; p += H) {
      for (i = 0; i < N; i++) { re[i] = x[p + i] * win[i]; im[i] = 0; }
      fft(re, im);
      for (k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
    }
    var tot = 0, h4 = 0, h400 = 0, b25 = 0, c = 0, df = sr / N;
    for (k = 1; k < N / 2; k++) { var f = k * df; tot += P[k]; c += P[k] * f; if (f >= 4000) h4 += P[k]; if (f >= 400) h400 += P[k]; if (f >= 2000 && f < 5000) b25 += P[k]; }
    return { au4k: +(h4 / tot).toFixed(4), au400: +(h400 / tot).toFixed(3), bande2a5k: +(b25 / tot).toFixed(3), centroide: Math.round(c / tot), P: P, df: df };
  }
  /* décimation par 4 (48 kHz -> 12 kHz) après un passe-bas en sinus cardinal fenêtré */
  function decime(x, sr) {
    var M = 4, L = 95, fc = 5200 / sr, h = new Float64Array(L), s = 0, i, j;
    for (i = 0; i < L; i++) { var m = i - (L - 1) / 2; h[i] = (m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m)) * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (L - 1))); s += h[i]; }
    var y = new Float64Array(Math.floor(x.length / M));
    for (i = 0; i < y.length; i++) { var a = 0, c = i * M; for (j = 0; j < L; j++) { var q = c - j + (L >> 1); if (q >= 0 && q < x.length) a += x[q] * h[j]; } y[i] = a / s; }
    return { x: y, sr: sr / M };
  }
  function lpc(seg, ordre) {
    var n = seg.length, r = new Float64Array(ordre + 1), i, j;
    for (i = 0; i <= ordre; i++) { var s = 0; for (j = i; j < n; j++) s += seg[j] * seg[j - i]; r[i] = s; }
    r[0] *= 1.0001;
    var a = new Float64Array(ordre + 1), e = r[0]; a[0] = 1;
    for (i = 1; i <= ordre; i++) {
      var k = r[i]; for (j = 1; j < i; j++) k += a[j] * r[i - j]; k = -k / e;
      var b = a.slice(); for (j = 1; j < i; j++) a[j] = b[j] + k * b[i - j]; a[i] = k; e *= 1 - k * k;
    }
    return a;
  }
  /* racines d'un polynôme (Durand-Kerner), coefficients a[0] z^n + ... */
  function racines(a) {
    var n = a.length - 1, zr = [], zi = [], i, it;
    for (i = 0; i < n; i++) { var ang = 2 * Math.PI * i / n + 0.4; zr.push(0.9 * Math.cos(ang)); zi.push(0.9 * Math.sin(ang)); }
    for (it = 0; it < 500; it++) {
      var dmax = 0;
      for (i = 0; i < n; i++) {
        var pr = 1, pi = 0, k;                              // p(z) par Horner, normalisé a[0] = 1
        for (k = 1; k <= n; k++) { var t = pr * zr[i] - pi * zi[i] + a[k]; pi = pr * zi[i] + pi * zr[i]; pr = t; }
        var qr = 1, qi = 0;
        for (k = 0; k < n; k++) if (k !== i) { var dr = zr[i] - zr[k], di = zi[i] - zi[k], u = qr * dr - qi * di; qi = qr * di + qi * dr; qr = u; }
        var den = qr * qr + qi * qi || 1e-30, cr = (pr * qr + pi * qi) / den, ci = (pi * qr - pr * qi) / den;
        zr[i] -= cr; zi[i] -= ci; dmax = Math.max(dmax, Math.abs(cr) + Math.abs(ci));
      }
      if (dmax < 1e-12) break;
    }
    return zr.map(function (r, i) { return [r, zi[i]]; });
  }
  function formantsLPC(xd, srd, t, larg) {
    var N = Math.round((larg || 0.03) * srd), c = Math.round(t * srd), a0 = Math.max(1, c - (N >> 1)), seg = new Float64Array(N);
    for (var i = 0; i < N; i++) { var q = a0 + i; var v = q < xd.length ? xd[q] - 0.94 * xd[q - 1] : 0; seg[i] = v * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1))); }
    var A = lpc(seg, 14), R = racines(Array.prototype.slice.call(A)), F = [];
    R.forEach(function (z) {
      if (z[1] <= 0) return;
      var f = Math.atan2(z[1], z[0]) * srd / (2 * Math.PI), m = Math.hypot(z[0], z[1]), bw = -Math.log(m) * srd / Math.PI;
      if (f > 180 && f < 5000 && bw < 450) F.push({ f: Math.round(f), b: Math.round(bw) });
    });
    F.sort(function (p, q) { return p.f - q.f; });
    return F;
  }
  /* f0 par autocorrélation normalisée, 60-200 Hz */
  function f0(x, sr, t0, t1) {
    var a = Math.floor(t0 * sr), b = Math.floor(t1 * sr), n = b - a, best = 0, lag = 0;
    if (n < sr * 0.03) return null;
    for (var L = Math.floor(sr / 200); L <= Math.floor(sr / 60); L++) {
      var s = 0, e1 = 0, e2 = 0;
      for (var i = a; i + L < b; i += 2) { s += x[i] * x[i + L]; e1 += x[i] * x[i]; e2 += x[i + L] * x[i + L]; }
      var r = s / Math.sqrt(e1 * e2 + 1e-20);
      if (r > best + 0.02) { best = r; lag = L; }
    }
    return lag ? { hz: +(sr / lag).toFixed(1), clarte: +best.toFixed(2) } : null;
  }
  /* les voyelles de la partition : f0, formants mesurés contre la cible au même instant */
  function voyelles(x, sr, R) {
    var d = decime(x, sr), out = [];
    R.voyelles.forEach(function (v) {
      var diph = R.segments && v.ph && /ey|ow/.test(v.ph), tm = v.t0 + (v.t1 - v.t0) * (diph ? 0.3 : 0.5);
      var F = formantsLPC(d.x, d.sr, tm, Math.min(0.035, (v.t1 - v.t0) * 0.6));
      var cible = [R.pistes.F1.val(tm), R.pistes.F2.val(tm), R.pistes.F3.val(tm)];
      /* appariement : pour chaque cible, le formant mesuré le plus proche (en écart relatif) */
      var mes = cible.map(function (c) { var m = null, e = 9; F.forEach(function (p) { var q = Math.abs(p.f - c) / c; if (q < e) { e = q; m = p.f; } }); return { cible: Math.round(c), mesure: m, ecart: m ? +((m - c) / c).toFixed(3) : null }; });
      var h = f0(x, sr, tm - 0.03, tm + 0.03);
      out.push({ ph: v.ph, t: +tm.toFixed(3), accent: v.accent, f0: h, F: mes, brut: F.slice(0, 5).map(function (p) { return p.f; }) });
    });
    return out;
  }
  /* indice d'intelligibilité acoustique, de 0 à 1 : part des formants F1 et F2 des voyelles retrouvés à
     12 % de leur cible (ce qui distingue les voyelles), pondérée par la clarté du voisement. Ce n'est
     pas une écoute : la reconnaissance vocale (tools/voix/reconnait.py) en est la contre-épreuve. */
  function indice(V) {
    var ok = 0, n = 0;
    V.forEach(function (v) { [0, 1].forEach(function (i) { n++; if (v.F[i].ecart !== null && Math.abs(v.F[i].ecart) <= 0.12) ok += v.f0 ? Math.min(1, v.f0.clarte + 0.2) : 0.5; }); });
    return n ? +(ok / n).toFixed(2) : 0;
  }
  function tout(x, sr, R) {
    var N = niveaux(x, sr), S = spectre(x, sr), V = R ? voyelles(x, sr, R) : [];
    var f0s = V.map(function (v) { return v.f0 && v.f0.hz; }).filter(Boolean);
    return {
      niveaux: N, spectre: { au4k: S.au4k, au400: S.au400, bande2a5k: S.bande2a5k, centroide: S.centroide },
      f0: f0s.length ? { min: Math.min.apply(null, f0s), max: Math.max.apply(null, f0s) } : null,
      voyelles: V, indice: indice(V)
    };
  }
  /* spectrogramme en décibels : tableau de colonnes (pas de 5 ms, Hann 1024), jusqu'à fmax */
  function spectrogramme(x, sr, fmax) {
    var N = 1024, H = Math.round(sr * 0.005), cols = [], win = new Float64Array(N), i, k, kmax = Math.floor((fmax || 8000) / (sr / N));
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    var re = new Float64Array(N), im = new Float64Array(N);
    for (var p = 0; p + N <= x.length; p += H) {
      for (i = 0; i < N; i++) { re[i] = (x[p + i] - (p + i > 0 ? 0.95 * x[p + i - 1] : 0)) * win[i]; im[i] = 0; }
      fft(re, im);
      var c = new Float32Array(kmax); for (k = 0; k < kmax; k++) c[k] = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-12);
      cols.push(c);
    }
    return { cols: cols, df: sr / N, dt: H / sr, t0: N / 2 / sr };
  }
  G.VOIX_AN = { fft: fft, niveaux: niveaux, spectre: spectre, voyelles: voyelles, indice: indice, tout: tout, telephone: telephone, spectrogramme: spectrogramme, formantsLPC: formantsLPC, decime: decime, f0: f0 };
})(typeof window !== 'undefined' ? window : globalThis);
