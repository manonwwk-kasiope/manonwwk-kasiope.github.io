/* tools/C/mesure-page.js — injecté dans la page d'essai par mesure.mjs (jamais dans le jeu).
   Tout est rendu HORS LIGNE par le moteur même du jeu (N.music.renderOffline) : rien ne sort sur les haut-parleurs.
   Les blocs sont décodés une fois ; chaque rendu repart de la même graine (N.rng.reset). */
(function () {
  var C = window.__C = {};
  var N = function () { return window.__N; };
  var BASE = '../../musique/';

  C.init = async function (base) {
    BASE = base || BASE;
    var P = await (await fetch(BASE + 'piste.json')).json();
    var oc = function () { return new OfflineAudioContext(2, 1, 44100); };
    var bufs = {};
    for (var i = 0; i < P.blocs.length; i++) bufs[i] = await oc().decodeAudioData(await (await fetch(BASE + P.blocs[i].fichier)).arrayBuffer());
    var orig = await oc().decodeAudioData(await (await fetch('/snake2030/neonvelocity-2.mp3')).arrayBuffer());
    C.P = P; C.bufs = bufs; C.orig = orig;
    return { blocs: P.blocs.length, origDuree: orig.duration, origSr: orig.sampleRate };
  };
  function interp(pts) { return function (t) { if (t <= pts[0][0]) return pts[0][1]; for (var i = 1; i < pts.length; i++) if (t <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0] || 1); } return pts[pts.length - 1][1]; }; }
  C.interp = interp;
  /* un rendu : dur s, tension (nombre ou points [[t, v], ...]), options { events, mute, sections, cues, couches, danger, sansPiste } */
  C.rend = async function (dur, tens, o) {
    o = o || {};
    var m = N().music;
    N().rng.reset(2975);
    var tf = typeof tens === 'number' ? function () { return tens; } : interp(tens);
    var opts = { sections: o.sections, cues: o.cues, couches: o.couches, danger: o.danger ? interp(o.danger) : null, brut: !!o.brut };
    if (!o.sansPiste) { opts.piste = C.P; opts.buffers = C.bufs; }
    var buf = await m.renderOffline(dur, tf, o.events || null, 44100, o.mute || null, opts);
    return { buf: buf, eng: m.lastEngine };
  };
  function mono(buf, a, c) {
    var sr = buf.sampleRate, i0 = Math.round(a * sr), i1 = Math.round(c * sr), n = i1 - i0, o = new Float32Array(n);
    var L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    for (var i = 0; i < n; i++) o[i] = (L[i0 + i] + R[i0 + i]) * 0.5;
    return o;
  }
  C.mono = mono;
  /* décalage (en échantillons, sous-échantillon) qui aligne y sur x ; x et y de même longueur n, y plus long de 2*M */
  function lagXcorr(x, y, M) {
    var n = x.length, best = -2, bl = 0, r = new Float64Array(2 * M + 1), ex = 0, i;
    for (i = 0; i < n; i++) ex += x[i] * x[i];
    for (var l = -M; l <= M; l++) {
      var s = 0, ey = 0;
      for (i = 0; i < n; i += 2) { var v = y[M + l + i]; s += x[i] * v; ey += v * v; }
      var rr = s / Math.sqrt((ex / 2) * ey + 1e-30);
      r[l + M] = rr; if (rr > best) { best = rr; bl = l; }
    }
    var k = bl + M, a = r[k - 1] || 0, b = r[k], c = r[k + 1] || 0, d = a - 2 * b + c, off = d ? 0.5 * (a - c) / d : 0;
    return { lag: bl + off, rho: best };
  }
  C.lagXcorr = lagXcorr;

  /* ---------------------------------------------------------------- jointures */
  C.jointures = async function () {
    var P = C.P, sr = 44100, beat = P.dureeTemps;
    var R = await C.rend(112, 0, { sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx', brut: true });
    var items = R.eng.itemLog(), buf = R.buf, out = [];
    var natural = 0, w = 0.02;
    var xm = mono(buf, 0, 112);
    function orig(t, it) { var b = P.blocs[it.bloc]; return P.premiereMesure + b.temps[0] * beat + (t - it.tCore + it.from); }
    var om = mono(C.orig, 0, C.orig.duration);
    for (var j = 1; j < items.length; j++) {
      var a = items[j - 1], b = items[j], J = b.tJoin;
      if (Math.abs(J - a.tEnd) > 0.002 || J + 0.6 > 110 || J < 3) continue;
      /* retard (échantillons) avant et après la jointure : fenêtres de 0,5 s de chaque côté, recherche ± 20 ms */
      var M = 882, W = Math.round(0.5 * sr);
      function lagAt(t0, it) {
        var xs = xm.subarray(Math.round(t0 * sr), Math.round(t0 * sr) + W);
        var o0 = Math.round((orig(t0, it)) * sr) - M;
        var ys = om.subarray(o0, o0 + W + 2 * M);
        return lagXcorr(xs, ys, M);
      }
      var before = lagAt(J - 0.55, a), after = lagAt(J + 0.05, b);
      var seg = xm.subarray(Math.round((J - w) * sr), Math.round((J + w) * sr)), mx = 0;
      for (var i = 1; i < seg.length; i++) { var d = Math.abs(seg[i] - seg[i - 1]); if (d > mx) mx = d; }
      out.push({ joint: +J.toFixed(3), de: P.blocs[a.bloc].fichier, vers: P.blocs[b.bloc].fichier, lagAvantMs: +(before.lag / sr * 1000).toFixed(3), lagApresMs: +(after.lag / sr * 1000).toFixed(3),
        ecartMs: +((after.lag - before.lag) / sr * 1000).toFixed(3), rhoAvant: +before.rho.toFixed(3), rhoApres: +after.rho.toFixed(3), piDerive: mx });
    }
    /* seuil fixé sur la piste d'origine : la plus grande dérive d'échantillon à échantillon de la piste d'origine, mise à l'échelle du rendu */
    var oMax = 0; for (var q = 1; q < om.length; q++) { var dd = Math.abs(om[q] - om[q - 1]); if (dd > oMax) oMax = dd; }
    var rr = 0, oo = 0, n1 = Math.round(8 * sr), n2 = Math.round(100 * sr);
    for (var s = n1; s < n2; s++) rr += xm[s] * xm[s];
    var t0 = Math.round((orig(8, items[1] || items[0])) * sr);
    for (var s2 = 0; s2 < n2 - n1; s2++) oo += om[t0 + s2] * om[t0 + s2];
    var ech = Math.sqrt(rr / oo);
    var thr = oMax * ech;
    return { joints: out, seuilClic: thr, derivePicOrigine: oMax, echelle: ech, maxPiJoint: Math.max.apply(null, out.map(function (x) { return x.piDerive; })), items: items.length };
  };

  /* ---------------------------------------------------------------- mixage */
  C.mixage = async function () {
    var AN = window.__AN, res = {};
    var palier = {};
    for (var v of [0.15, 0.4, 0.6, 0.8, 1.0]) {
      var R = await C.rend(44, v, { sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
      palier[v] = { telDB: +AN.rmsTel(R.buf, 14, 42, 350).toFixed(2), rmsDB: +AN.niveau(R.buf, 14, 42).dB.toFixed(2), creteDB: +AN.niveau(R.buf, 14, 42).creteDB.toFixed(2), centroide: AN.spectre(R.buf, 14, 42).centroide | 0 };
    }
    res.paliers = palier;
    /* trois minutes de partie : le niveau suit la tension (corrélation) */
    var prof = [[0, 0.15], [30, 0.15], [60, 0.6], [75, 0.35], [105, 1.0], [120, 0.4], [150, 0.8], [165, 1.0], [180, 1.0]];
    var R2 = await C.rend(180, prof, { sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
    var f = C.interp(prof), xs = [], ys = [];
    for (var t = 10; t + 10 <= 180; t += 10) { var tm = 0; for (var k = 0; k < 10; k++) tm += f(t + k + 0.5); xs.push(tm / 10); ys.push(AN.rmsTel(R2.buf, t, t + 10, 350)); }
    var mx = xs.reduce(function (a, b) { return a + b; }) / xs.length, my = ys.reduce(function (a, b) { return a + b; }) / ys.length, sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); }
    res.correlation = +(sxy / Math.sqrt(sxx * syy)).toFixed(3);
    res.fenetres = xs.map(function (x, i) { return [+x.toFixed(2), +ys[i].toFixed(1)]; });
    res.crete = AN.niveau(R2.buf, 0, 180).creteDB;
    res.blocsJoues = R2.eng.itemLog().map(function (i) { return P_name(i.bloc); });
    return res;
  };
  function P_name(i) { return C.P.blocs[i].fichier.replace('.mp3', '').replace('nv-', ''); }

  /* ---------------------------------------------------------------- sons */
  C.sons = async function () {
    var AN = window.__AN, ids = N().ids, noms = ids.sons.concat(ids.sonsAnciens), out = {};
    for (var nm of noms) {
      var R = await C.rend(4.5, 0, { sansPiste: true, mute: 'music', events: [{ t: 0.5, name: nm, opts: { pitch: 3, pan: 0, type: 'laser' } }] });
      var buf = R.buf, sr = buf.sampleRate, L = buf.getChannelData(0), end = 0.5;
      for (var i = buf.length - 1; i > 0; i--) if (Math.abs(L[i]) > 0.003) { end = i / sr; break; }
      var dur = Math.max(0.05, Math.min(3.5, end - 0.5));
      var x = AN.tout(buf, 0.5, 0.5 + Math.max(dur, 0.25));
      out[nm] = { dureeS: +dur.toFixed(2), part400: x.part400, creteDB: x.creteDB, momDB: +AN.momentane(buf, 0.5, 0.5 + Math.min(dur, 0.5), 0.02, false).toFixed(1),
        momTelDB: +AN.momentane(buf, 0.5, 0.5 + Math.min(dur, 0.5), 0.02, true).toFixed(1), centroide: x.centroide };
    }
    /* corrélation tirEnnemi / tir */
    async function wave(nm, o) { var R = await C.rend(1.5, 0, { sansPiste: true, mute: 'music', events: [{ t: 0.2, name: nm, opts: o }] }); return mono(R.buf, 0.2, 0.2 + 0.12); }
    var a = await wave('tir', { pitch: 2 }), b = await wave('tirEnnemi', {});
    var best = 0, ea = 0, eb = 0, k, l;
    for (k = 0; k < a.length; k++) ea += a[k] * a[k];
    for (k = 0; k < b.length; k++) eb += b[k] * b[k];
    for (l = -240; l <= 240; l++) {
      var sc = 0;
      for (k = 0; k < a.length; k++) { var kk = k + l; if (kk >= 0 && kk < b.length) sc += a[k] * b[kk]; }
      var r = Math.abs(sc) / Math.sqrt(ea * eb + 1e-30); if (r > best) best = r;
    }
    out.__correlationTirEnnemi = +best.toFixed(3);
    return out;
  };

  /* kill, coupe, mort contre la musique (aux tensions 0,15, 0,6, 1) ; tir contre kill ; esquive ; crête ; kills muets */
  C.niveauxSons = async function () {
    var AN = window.__AN, res = { contre: {} };
    var T = 6;
    for (var tv of [0.15, 0.6, 1.0]) {
      var Rm = await C.rend(T + 4, tv, { sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
      var base = AN.rmsTel(Rm.buf, T - 1, T - 0.75, 350);
      var par = {};
      for (var nm of ['kill', 'coupe', 'mort', 'tir', 'bigkill']) {
        var Rs = await C.rend(T + 4, 0, { sansPiste: true, mute: 'music', events: [{ t: T, name: nm, opts: { pitch: 3 } }] });
        var len = nm === 'mort' || nm === 'bigkill' ? 0.5 : 0.25;
        par[nm] = +(AN.rmsTel(Rs.buf, T, T + len, 350) - AN.rmsTel(Rm.buf, T, T + len, 350)).toFixed(2);
        par[nm + '_momTel'] = +(AN.momentane(Rs.buf, T, T + len, 0.02, true) - base).toFixed(2);
      }
      res.contre[tv] = par;
    }
    var Rk = await C.rend(3, 0, { sansPiste: true, mute: 'music', events: [{ t: 1, name: 'kill', opts: { pitch: 3 } }] });
    var Rt = await C.rend(3, 0, { sansPiste: true, mute: 'music', events: [{ t: 1, name: 'tir', opts: { pitch: 2 } }] });
    res.tirSousKill = +(AN.momentane(Rk.buf, 1, 1.25, 0.02, true) - AN.momentane(Rt.buf, 1, 1.12, 0.02, true)).toFixed(2);
    /* esquive de la musique sous un kill : g(t) = <musique+kill - kill, musique> / <musique, musique>, par fenêtres de 10 ms */
    var Rm2 = await C.rend(4, 0.6, { sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
    var Rmk = await C.rend(4, 0.6, { sections: [{ t: 0.1, nom: 'jeu' }], events: [{ t: 2, name: 'kill', opts: { pitch: 3 } }] });
    var Rk2 = await C.rend(4, 0, { sansPiste: true, mute: 'music', events: [{ t: 2, name: 'kill', opts: { pitch: 3 } }] });
    var sr = 44100, win = 441, g = [];
    var m0 = mono(Rm2.buf, 0, 4), mk = mono(Rmk.buf, 0, 4), kk = mono(Rk2.buf, 0, 4);
    for (var w0 = Math.round(1.9 * sr); w0 < Math.round(2.6 * sr); w0 += win) {
      var num = 0, den = 0;
      for (var i = w0; i < w0 + win; i++) { num += (mk[i] - kk[i]) * m0[i]; den += m0[i] * m0[i]; }
      g.push([+((w0 / sr) - 2).toFixed(3), +(num / (den + 1e-20)).toFixed(3)]);
    }
    var gmin = Math.min.apply(null, g.map(function (x) { return x[1]; }));
    var rel = null; for (var q = 0; q < g.length; q++) if (g[q][0] >= 0 && g[q][1] <= gmin + 0.001) { for (var q2 = q; q2 < g.length; q2++) if (g[q2][1] >= 1 - 0.1 * (1 - gmin)) { rel = g[q2][0] - g[q][0]; break; } break; }
    res.esquive = { profondeur: +(1 - gmin).toFixed(3), relachementMs: rel === null ? null : Math.round(rel * 1000), courbe: g.slice(0, 40) };
    /* kills muets : demandés = joués, même à 10 ms d'intervalle */
    var ev = []; for (var k = 0; k < 40; k++) ev.push({ t: 1 + k * (k % 3 === 0 ? 0.01 : 0.2), name: 'kill', opts: { pitch: k % 10 } });
    var Rkm = await C.rend(14, 0.5, { sansPiste: true, events: ev });
    var j = Rkm.eng.journal();
    res.kills = { demandes: j.demandes.kill, joues: j.joues.kill };
    return res;
  };

  /* la scène « charge » : 16 tourelles, kills, butin ; nœuds par seconde, crête, écrêtage */
  C.charge = async function () {
    var ev = [], t, i;
    for (t = 2; t < 62; t += 1 / 16) ev.push({ t: t, name: 'salve', opts: { pitch: (t * 3) | 0, pan: ((t * 5) % 2) - 1 } });   // 16 demandes par seconde : le module en garde 8
    for (t = 2; t < 62; t += 1 / 7) ev.push({ t: t, name: 'tir', opts: { pitch: (t * 7) | 0 } });
    for (t = 2.1; t < 62; t += 1 / 3) ev.push({ t: t, name: 'kill', opts: { pitch: ((t * 3) | 0) % 10, pan: Math.sin(t) } });
    for (t = 2.2; t < 62; t += 1 / 6) ev.push({ t: t, name: 'impact', opts: { pan: Math.cos(t) } });
    for (t = 2.3; t < 62; t += 1 / 4) ev.push({ t: t, name: 'butin', opts: {} });
    for (t = 2.4; t < 62; t += 1 / 5) ev.push({ t: t, name: 'tirEnnemi', opts: { pan: -Math.cos(t) } });
    for (t = 4; t < 62; t += 9) ev.push({ t: t, name: 'bigkill', opts: {} });
    var R = await C.rend(64, 0.95, { sections: [{ t: 0.1, nom: 'jeu' }], events: ev });
    var j = R.eng.journal(), AN = window.__AN, L = R.buf.getChannelData(0), Rr = R.buf.getChannelData(1), pk = 0, clip = 0, run = 0, maxRun = 0;
    for (var s = 0; s < L.length; s++) { var a = Math.max(Math.abs(L[s]), Math.abs(Rr[s])); if (a > pk) pk = a; if (a >= 0.999) { clip++; } }
    return { noeudsParSeconde: +(R.eng.nodesTotal() / 64).toFixed(1), noeudsTotal: R.eng.nodesTotal(), creteDB: +(20 * Math.log10(pk)).toFixed(2), echantillonsEcretes: clip,
      demandes: j.demandes, joues: j.joues, fusionnes: j.fusionnes, plafonnes: j.plafonnes, budget: j.budget, rmsTel: +AN.rmsTel(R.buf, 10, 60, 350).toFixed(1) };
  };

  /* ---------------------------------------------------------------- couches, accents, après la mort */
  C.grille = async function () {
    var prof = [[0, 0.15], [20, 0.15], [40, 0.9], [60, 0.55], [75, 0.9], [90, 0.2], [110, 1.0], [130, 0.62], [150, 0.9], [170, 0.4], [180, 0.4]];
    var R = await C.rend(180, prof, {
      sections: [{ t: 0.1, nom: 'jeu' }],
      cues: [{ t: 30.3, nom: 'stinger' }, { t: 50.7, nom: 'drop' }, { t: 80.2, nom: 'plongee' }, { t: 100.1, nom: 'vague' }, { t: 140.4, nom: 'stinger' }, { t: 160.2, nom: 'drop' }],
      couches: [{ t: 120.3, nom: 'inversion', on: true }, { t: 128.7, nom: 'inversion', on: false }],
      danger: [[0, 0], [135, 0], [140, 0.6], [150, 0.9], [160, 0.3], [165, 0], [180, 0]], mute: 'sfx'
    });
    var e = R.eng, items = e.itemLog(), P = C.P;
    function dist(t) {      // distance (s) à la barre la plus proche : grille des items, puis grille libre avant le premier
      var best = 1e9;
      items.forEach(function (it) { if (t >= it.tJoin - 0.05 && t <= it.tEnd + 0.05) { var k = Math.round((t - it.tJoin) / it.barD), d = Math.abs(t - (it.tJoin + k * it.barD)); if (d < best) best = d; } });
      if (best === 1e9) { var bd = P.dureeMesure; best = Math.abs(t - Math.round(t / bd) * bd); }
      return best;
    }
    function distBeat(t) { var best = 1e9; items.forEach(function (it) { if (t >= it.tJoin - 0.05 && t <= it.tEnd + 0.05) { var bt = it.barD / 4, k = Math.round((t - it.tJoin) / bt), d = Math.abs(t - (it.tJoin + k * bt)); if (d < best) best = d; } }); return best; }
    var L = e.layerLog().filter(function (x) { return x.t > 4; }).map(function (x) { return { l: x.l, on: x.on, t: +x.t.toFixed(3), ecartMs: +(dist(x.t) * 1000).toFixed(2) }; });
    var A = e.accLog().map(function (x) { return { nom: x.nom, t: +x.t.toFixed(3), ecartBarreMs: +(dist(x.t) * 1000).toFixed(2), ecartTempsMs: +(distBeat(x.t) * 1000).toFixed(2) }; });
    var bars = R.eng.barSigs();
    var run = 1, max = 1; for (var i = 1; i < bars.length; i++) { if (bars[i] === bars[i - 1]) { run++; if (run > max) max = run; } else run = 1; }
    return { couches: L, accents: A, couchesDansLes10ms: L.filter(function (x) { return x.ecartMs <= 10; }).length, couchesTotal: L.length,
      accentsDansLes10ms: A.filter(function (x) { return (x.nom === 'plongee' ? x.ecartTempsMs : x.ecartBarreMs) <= 10; }).length, accentsTotal: A.length,
      mesures: bars.length, consecutivesMax: max, blocs: items.map(function (x) { return P_name(x.bloc) + (x.from ? '@' + x.from.toFixed(1) : ''); }) };
  };
  C.mort = async function () {
    var R = await C.rend(40, 0.6, { sections: [{ t: 0.1, nom: 'jeu' }, { t: 24.5, nom: 'jeu' }], cues: [{ t: 22, nom: 'mort' }], mute: 'sfx' });
    var items = R.eng.itemLog();
    var avant = items.filter(function (i) { return i.tJoin < 22; }).pop(), apres = items.filter(function (i) { return i.tJoin >= 22; })[0];
    var AN = window.__AN;
    return { blocMort: avant ? P_name(avant.bloc) : null, blocReprise: apres ? P_name(apres.bloc) : null, repriseT: apres ? +apres.tJoin.toFixed(3) : null,
      premierBlocDeLaFamille: P_name(C.P.blocs.findIndex(function (b) { return b.section === 'PLATEAU'; })),
      niveauApresCoupure: +AN.niveau(R.buf, 22.3, 24.4).dB.toFixed(1), niveauAvant: +AN.niveau(R.buf, 20, 21.9).dB.toFixed(1), niveauReprise: +AN.niveau(R.buf, 28, 34).dB.toFixed(1) };
  };

  /* ---------------------------------------------------------------- répétition (critère 5) et repli */
  C.repetition = async function () {
    var HOP = 0.05, WIN = 4.0, STRIDE = 0.25;
    var prof = [[0, 0.5], [60, 0.7], [120, 0.9], [180, 0.6]];
    var R = await C.rend(180, prof, { sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
    var buf = R.buf, L = buf.getChannelData(0), Rr = buf.getChannelData(1), step = Math.round(buf.sampleRate * HOP), fr = Math.floor(buf.length / step), env = new Array(fr);
    for (var f = 0; f < fr; f++) { var s = 0; for (var i = f * step; i < (f + 1) * step; i++) { var v = (L[i] + Rr[i]) * 0.5; s += v * v; } env[f] = Math.sqrt(s / step); }
    var wf = Math.round(WIN / HOP), sf = Math.round(STRIDE / HOP), starts = [];
    for (var a = 0; a + wf <= env.length; a += sf) starts.push(a);
    var W = starts.map(function (a) { return env.slice(a, a + wf); }), NM = W.map(function (v) { var q = 0; v.forEach(function (x) { q += x * x; }); return Math.sqrt(q) || 1e-12; });
    var minD = Infinity, arg = null, n = 0, sous = 0;
    for (var p = 0; p < W.length; p++) for (var q = p + 1; q < W.length; q++) {
      if ((starts[q] - starts[p]) * HOP < WIN) continue;
      n++; var ss = 0; for (var k = 0; k < wf; k++) { var d = W[p][k] - W[q][k]; ss += d * d; }
      var dd = Math.sqrt(ss) / (0.5 * (NM[p] + NM[q]));
      if (dd < 0.01) sous++;
      if (dd < minD) { minD = dd; arg = [starts[p] * HOP, starts[q] * HOP]; }
    }
    var bars = R.eng.barSigs(), run = 1, max = 1;
    for (var b = 1; b < bars.length; b++) { if (bars[b] === bars[b - 1]) { run++; if (run > max) max = run; } else run = 1; }
    return { paires: n, distanceMin: +minD.toFixed(4), fenetres: arg, souslepourcent: sous, mesures: bars.length, consecutivesMax: max, blocs: R.eng.itemLog().map(function (x) { return P_name(x.bloc); }) };
  };
  C.repli = async function () {
    var AN = window.__AN, out = {};
    for (var v of [0.06, 0.5, 1.0]) {
      var R = await C.rend(40, v, { sansPiste: true, sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
      var x = AN.tout(R.buf, 6, 38);
      out[v] = { rmsDB: x.rmsDB, telDB: +AN.rmsTel(R.buf, 6, 38, 350).toFixed(1), centroide: x.centroide, creteDB: x.creteDB };
    }
    var R0 = await C.rend(4, 0.2, { sansPiste: true, sections: [{ t: 0.1, nom: 'jeu' }], mute: 'sfx' });
    var d = R0.buf.getChannelData(0), first = -1;
    for (var i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.002) { first = i / R0.buf.sampleRate; break; }
    out.premierSon = first;
    out.mesure = C.P.dureeMesure;
    return out;
  };
})();
