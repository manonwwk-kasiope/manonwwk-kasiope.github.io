/* tools/musique2/analyse.js — injecte dans la page de mesure (jamais dans le jeu).
   Mesures sur les echantillons RENDUS par N.music.renderOffline, c'est-a-dire par le meme moteur que
   le jeu : RMS, crete, sonie integree BS.1770-4 (ponderation K, portes absolue et relative), part
   d'energie au-dessus de 4 kHz et dans la bande 2-5 kHz (la ou un haut-parleur de telephone est le
   plus sensible), centroide spectral. Rien n'est transporte hors de la page que des nombres. */
(function () {
  function fft(re, im) {                     /* radix 2 en place */
    var n = re.length, i, j, k, l;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { var tr = re[i]; re[i] = re[j]; re[j] = tr; var ti = im[i]; im[i] = im[j]; im[j] = ti; }
    }
    for (l = 2; l <= n; l <<= 1) {
      var ang = -2 * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang), h = l >> 1;
      for (i = 0; i < n; i += l) {
        var cr = 1, ci = 0;
        for (k = 0; k < h; k++) {
          var a = i + k, b = a + h;
          var xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          var t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  var NF = 4096, HANN = new Float32Array(NF);
  for (var q = 0; q < NF; q++) HANN[q] = 0.5 - 0.5 * Math.cos(2 * Math.PI * q / (NF - 1));

  /* spectre de puissance cumule sur [a, c) secondes, deux canaux */
  function spectre(buf, a, c) {
    var sr = buf.sampleRate, i0 = Math.max(0, Math.round(a * sr)), i1 = Math.min(buf.length, Math.round(c * sr));
    var P = new Float64Array(NF / 2), re = new Float32Array(NF), im = new Float32Array(NF);
    for (var ch = 0; ch < buf.numberOfChannels; ch++) {
      var d = buf.getChannelData(ch);
      for (var s = i0; s + NF <= i1; s += NF / 2) {
        for (var k = 0; k < NF; k++) { re[k] = d[s + k] * HANN[k]; im[k] = 0; }
        fft(re, im);
        for (k = 1; k < NF / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
      }
    }
    var bin = sr / NF, tot = 0, hf = 0, pres = 0, cen = 0, tel = 0;
    for (k = 1; k < NF / 2; k++) {
      var f = k * bin; tot += P[k]; cen += f * P[k];
      if (f >= 4000) hf += P[k];
      if (f >= 2000 && f < 5000) pres += P[k];
      if (f >= 300) tel += P[k];
    }
    /* part aigue rapportee a ce qu'un haut-parleur de telephone restitue (au-dessus de 300 Hz) */
    return { hf4k: tot ? hf / tot : 0, b2a5k: tot ? pres / tot : 0, centroide: tot ? cen / tot : 0,
      hf4kTel: tel ? hf / tel : 0, b2a5kTel: tel ? pres / tel : 0 };
  }
  /* niveau : RMS des deux canaux, crete d'echantillon */
  function niveau(buf, a, c) {
    var sr = buf.sampleRate, i0 = Math.max(0, Math.round(a * sr)), i1 = Math.min(buf.length, Math.round(c * sr));
    var s = 0, pk = 0, n = 0;
    for (var ch = 0; ch < buf.numberOfChannels; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = i0; i < i1; i++) { var v = d[i]; s += v * v; var x = v < 0 ? -v : v; if (x > pk) pk = x; }
      n += i1 - i0;
    }
    var rms = Math.sqrt(s / Math.max(1, n));
    return { rms: rms, dB: 20 * Math.log10(rms + 1e-12), crete: pk, creteDB: 20 * Math.log10(pk + 1e-12) };
  }
  /* modele de haut-parleur de telephone, NON SOURCE (aucune mesure publique trouvee, voir la
     recherche) : passe-haut de Butterworth d'ordre 4 a 300 Hz, deux biquads RBJ a 48 kHz */
  function hpCoefs(f0, Q) {
    var w = 2 * Math.PI * f0 / 48000, cw = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al;
    return [(1 + cw) / 2 / a0, -(1 + cw) / a0, (1 + cw) / 2 / a0, -2 * cw / a0, (1 - al) / a0];
  }
  var HP = [hpCoefs(300, 0.5412), hpCoefs(300, 1.3066)];
  function telFilter(d, i0, n) {
    var y = new Float64Array(n);
    for (var i = 0; i < n; i++) y[i] = d[i0 + i];
    for (var s = 0; s < 2; s++) {
      var c = HP[s], x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (i = 0; i < n; i++) {
        var x = y[i], v = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = v; y[i] = v;
      }
    }
    return y;
  }
  /* sonie integree BS.1770-4 ; coefficients de la ponderation K donnes pour 48 kHz : rendre a 48 kHz.
     tel : la meme mesure apres le modele de haut-parleur de telephone */
  function lufs(buf, a, c, tel) {
    if (buf.sampleRate !== 48000) return null;
    var sr = 48000, i0 = Math.max(0, Math.round(a * sr)), i1 = Math.min(buf.length, Math.round(c * sr)), n = i1 - i0;
    var blk = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), nb = Math.floor((n - blk) / hop) + 1;
    if (nb < 1) return null;
    var Z = new Float64Array(nb);
    for (var ch = 0; ch < buf.numberOfChannels; ch++) {
      var d = buf.getChannelData(ch), y = new Float64Array(n), src = tel ? telFilter(d, i0, n) : null;
      var x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, w1 = 0, w2 = 0;
      for (var i = 0; i < n; i++) {
        var x = src ? src[i] : d[i0 + i];
        var v = 1.53512485958697 * x - 2.69169618940638 * x1 + 1.19839281085285 * x2 + 1.69065929318241 * y1 - 0.73248077421585 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = v;
        var u = v - 2 * z1 + z2 + 1.99004745483398 * w1 - 0.99007225036621 * w2;
        z2 = z1; z1 = v; w2 = w1; w1 = u;
        y[i] = u * u;
      }
      var cum = new Float64Array(n + 1);
      for (i = 0; i < n; i++) cum[i + 1] = cum[i] + y[i];
      for (var b = 0; b < nb; b++) Z[b] += (cum[b * hop + blk] - cum[b * hop]) / blk;
    }
    var L = function (z) { return -0.691 + 10 * Math.log10(z + 1e-20); };
    var s = 0, m = 0, mx = -70;
    for (b = 0; b < nb; b++) if (L(Z[b]) > mx) mx = L(Z[b]);
    lufs.momentMax = mx;                     /* sonie momentanee maximale (400 ms) */
    for (b = 0; b < nb; b++) if (L(Z[b]) > -70) { s += Z[b]; m++; }
    if (!m) return -70;
    var rel = L(s / m) - 10; s = 0; m = 0;
    for (b = 0; b < nb; b++) { var lb = L(Z[b]); if (lb > -70 && lb > rel) { s += Z[b]; m++; } }
    return m ? L(s / m) : -70;
  }
  function tout(buf, a, c) {
    var nv = niveau(buf, a, c), sp = spectre(buf, a, c);
    var L = lufs(buf, a, c), LM = lufs.momentMax, T = lufs(buf, a, c, true), TM = lufs.momentMax;
    return { rmsDB: +nv.dB.toFixed(2), creteDB: +nv.creteDB.toFixed(2), lufs: L === null ? null : +L.toFixed(2),
      lufsTel: T === null ? null : +T.toFixed(2), momMax: +(+LM).toFixed(2), momMaxTel: +(+TM).toFixed(2),
      hf4k: +(sp.hf4k * 100).toFixed(2), b2a5k: +(sp.b2a5k * 100).toFixed(2), centroide: Math.round(sp.centroide),
      hf4kTel: +(sp.hf4kTel * 100).toFixed(2), b2a5kTel: +(sp.b2a5kTel * 100).toFixed(2) };
  }
  window.__AN = { spectre: spectre, niveau: niveau, lufs: lufs, tout: tout };
})();
