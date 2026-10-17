/* ===== 69-arcade.js — N.arcade : l'époque 1982, la grille brisée =====

   refonte/VISION-PROGRESSION.md § 1 (époque 1982) et § 4 (« 8 bits début ») : la fissure de 1976 a brisé la grille.
   Quatre couleurs, gros pixels (un pixel de 1982 = 2 × 2 pixels du tampon), sprites à deux images. Le serpent quitte
   les cases : il tourne librement, à virage borné (pas de demi-tour sec), et il TIRE TOUT SEUL devant lui, sur le temps.

   UNE VAGUE, UNE NOUVEAUTÉ TOUTES LES 15 SECONDES (temps de vague, arrêté pendant une mort) :
     0 s   le cadre cyan de 1976 se déroule et devient le serpent ; une formation d'envahisseurs descend
     15 s  LES FLÈCHES : elles visent la tête (télégraphe en pointillé), puis foncent ; les envahisseurs lâchent des bombes
     30 s  LA SOUCOUPE : une coupure dans la musique, le tempo monte ; abattue (ou écrasée) : la première grosse explosion
     45 s  LA CELLULE D'OR : la manger donne le tir triple, puis le passage ; sinon le passage vient seul à 57 s
   LE PASSAGE vers 1987 (3,6 s) : tout ce qui vit explose en chaîne, la palette s'ouvre (le néon entre par le tramage),
   les pixels s'affinent (4, puis 2, puis 1), « 1987 » s'écrit ; puis surFin().

   RÈGLES DE SNAKE 2975, tenues ici : le mur tue ; se mordre COUPE le serpent au point mordu sans tuer (un ennemi qui
   touche le corps le coupe aussi ; qui touche la tête tue) ; mourir garde la progression (temps de vague, score,
   ennemis) ; deux morts forcent le passage. Les ennemis sont propres à ce module : aucun lien avec 72-ennemis.js.

   LA MUSIQUE est écrite ici, pour cette époque seulement : une puce à trois voix sur N.music.context() — un carré pulsé
   (50 %, puis 25 %, puis 12,5 % selon la section) pour le motif, un triangle pour la basse en octaves, un bruit à
   registre (15 bits, comme les consoles) pour la batterie. La mineur, la–fa–do–sol. Tempo 132, puis une mesure coupée et
   152 (un ton plus haut) à la soucoupe, puis une mesure en demi-temps et 168 à la cellule d'or. Respecte N.music.muted.

   INTERFACE (N.arcade), rien ne s'appelle au chargement :
       start({ surFin, graine })   lance l'époque (le jeu principal à l'arrêt) ; surFin() à la fin du passage
       update(dt) / draw()         à appeler à la place du jeu tant que actif() ; draw remplit tout le tampon
       actif() phase()             'boot' | 'jeu' | 'mort' | 'passage' | 'fini'
       stop()                      coupe tout, sans appeler surFin ;   skip()  saute au passage
       state()                     instantané pour les essais (et le pilote de tools/arcade/)
   Le branchement après N.terminal dans 79-jeu.js est demandé à la cheffe d'orchestre : ce module ne touche à rien d'autre.

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; quatre couleurs (vide ; cyan pour le serpent seul ; magenta pour
   les ennemis et le mur ; jaune pour les cellules, les tirs, le texte), sauf pendant le passage ; aucun Math.random
   (générateurs locaux à graine : un pour le jeu, un pour la musique, pour que le son ne change pas la partie) ; aucune
   horloge lue (dt, et le contexte audio pour la musique) ; flashs bornés : une seule grosse explosion à la fois,
   tramée, jamais d'aplat plein écran. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages (→ N.R.arcade) ================================ */
  var CFG = {
    K: 2, boot: 2.0, mort: 1.4, passage: 3.6, frenesie: 3.5, invuln: 1.8,
    nouveautes: [15, 30, 45], finMax: 57, mortsAvantFin: 2,
    tempos: [132, 132, 152, 168],                  // BPM par section ; le serpent va avec : vitesse × tempo / 132
    vitesse: 46, virage: 4.2, ecart: 4, longueurDepart: 6, longueurMax: 40, mordDes: 5,
    balle: 150, flecheV: 105, bombeV: 28, telegraphe: 0.8, soucoupeV: 30, soucoupeVie: 3, plancher: 0.5
  };
  var PTS = { inv: 20, fleche: 50, bombe: 5, souc: 300, cellule: 50, dore: 500 };
  var MSG = { 1: 'FLÈCHES !', 2: 'SOUCOUPE !', 3: "CELLULE D'OR" };

  var P = null;
  function pal() {
    if (P) return true;
    if (!N.pal || !N.pal.i) return false;
    var I = N.pal.i;
    P = { vide: I('vide'), nuit: I('nuit'), ardoise: I('ardoise'), indigo: I('indigo'), violet: I('violet'), magenta: I('magenta'),
      rose: I('rosePale'), cyan: I('cyan'), cyanP: I('cyanPale'), ambre: I('ambre'), jaune: I('jaune'), brasier: I('brasier'),
      os: I('os'), sang: I('sang'), np: I('nuitProfonde') };
    return true;
  }
  function G() { return N.gfx; }
  function S() { return N.S || {}; }

  /* deux générateurs locaux à graine : le jeu, et la musique (le son ne doit pas changer la partie) */
  var rs = 1982, ra = 82;
  function rnd() { rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296; }
  function rna() { ra = (ra * 1103515245 + 12345) % 2147483648; return ra / 2147483648; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }

  /* ================================ les sprites (deux images, 1982) ================================ */
  function spr(rows) {
    var p = [];
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) if (rows[y].charAt(x) === 'X') p.push(x, y);
    return { w: rows[0].length, h: rows.length, p: p };
  }
  var INV = [
    [spr(['..X..X..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X']),
     spr(['..X..X..', 'X.XXXX.X', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X....X.'])],
    [spr(['...XX...', '..XXXX..', '.X.XX.X.', 'XXXXXXXX', '..X..X..', '.X.XX.X.']),
     spr(['...XX...', '..XXXX..', '.X.XX.X.', 'XXXXXXXX', '.X.XX.X.', 'X......X'])]
  ];
  var SOUC = spr(['.....XXXXXX.....', '...XXXXXXXXXX...', '.XX.XX.XX.XX.XX.', 'XXXXXXXXXXXXXXXX', '..XXX..XX..XXX..', '...X........X...']);
  var SOUC_FEUX = [[3, 2], [6, 2], [9, 2], [12, 2]];
  var CELL = [spr(['.X.', 'XXX', '.X.']), spr(['.X.', 'X.X', '.X.'])];
  var DORE = spr(['...X...', '..XXX..', '.XX.XX.', 'XX.X.XX', '.XX.XX.', '..XXX..', '...X...']);
  var BOMBE = [spr(['X.', '.X', 'X.']), spr(['.X', 'X.', '.X'])];
  var IW = 8, IH = 6, PASX = 11, PASY = 9, SW = 16, SH = 6;

  /* ================================ l'état ================================ */
  var T = { on: false, phase: 'fini', t: 0, pt: 0, vt: 0, sec: 0, score: 0, morts: 0,
    W: 0, H: 0, LW: 0, LH: 0, X0: 0, Y0: 0, X1: 0, Y1: 0, ix0: 0, iy0: 0, ix1: 0, iy1: 0,
    hx: 0, hy: 0, cap: 0, vise: 0, aVise: false, sens: 1, trail: [], nseg: 6, corde: 0, invul: 0,
    acc16: 0, p16: 0, anim: 0, balles: [], F: null, formT: 0, vagues: 0, fleches: [], flecheT: 0, bombes: [],
    souc: null, soucT: -1, soucVue: false, food: null, dore: null, fren: 0, expl: [], frags: [], chaine: [],
    msg: '', msgT: 0, msgDuree: 2.2, shake: 0, gel: 0, an: 1976,
    compte: { tues: 0, mange: 0, coupes: 0, grosses: 0, tirs: 0 }, nouv: [], premiereExplosion: -1,
    surFin: null, finAppele: false, journal: [] };

  function journal(e) { T.journal.push({ e: e, t: +T.t.toFixed(2) }); if (T.journal.length > 80) T.journal.shift(); }
  function dire(s, d) { T.msg = s; T.msgT = 0; T.msgDuree = d || 2.2; journal('message ' + s); }

  /* le même cadre que 1976 (68-terminal.js, layout) : on part exactement de là où la fissure s'est faite */
  var L = null;
  function layout() {
    var g = G(), s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 }, K = CFG.K;
    var W = g.W | 0, H = g.H | 0, x0 = sf.l | 0, y0 = sf.t | 0, sw = W - x0 - (sf.r | 0), sh = H - y0 - (sf.b | 0);
    var cell = Math.max(7, Math.floor(Math.min(sw, sh) / 14)), top = cell + 4;
    var cols = Math.max(10, Math.floor((sw - 4) / cell)), rows = Math.max(8, Math.floor((sh - top - 4) / cell));
    var ox = x0 + Math.floor((sw - cols * cell) / 2), oy = y0 + top + Math.floor((sh - top - rows * cell) / 2);
    var avant = T.W ? { x: T.ix0, y: T.iy0, w: T.ix1 - T.ix0, h: T.iy1 - T.iy0 } : null;
    T.W = W; T.H = H; T.LW = Math.ceil(W / K); T.LH = Math.ceil(H / K);
    if (!L || L.length !== T.LW * T.LH) L = new Uint8Array(T.LW * T.LH);
    /* le cadre de 1976 en pixels de 1982 : un trait d'un pixel, aux murs */
    T.X0 = Math.floor((ox - 2) / K); T.Y0 = Math.floor((oy - 2) / K);
    T.X1 = Math.floor((ox - 2 + cols * cell + 3) / K); T.Y1 = Math.floor((oy - 2 + rows * cell + 3) / K);
    T.ix0 = T.X0 + 1; T.iy0 = T.Y0 + 1; T.ix1 = T.X1; T.iy1 = T.Y1;            // l'intérieur : [ix0, ix1) × [iy0, iy1)
    if (avant && (avant.w !== T.ix1 - T.ix0 || avant.h !== T.iy1 - T.iy0)) recadrer(avant);
  }
  /* l'écran a tourné : tout ce qui vit est ramené à la même place relative de la nouvelle arène */
  function recadrer(a) {
    var nw = T.ix1 - T.ix0, nh = T.iy1 - T.iy0;
    function rx(x) { return T.ix0 + (x - a.x) * nw / a.w; }
    function ry(y) { return T.iy0 + (y - a.y) * nh / a.h; }
    var dx = rx(T.hx) - T.hx, dy = ry(T.hy) - T.hy;
    T.hx += dx; T.hy += dy;
    for (var i = 0; i < T.trail.length; i++) { T.trail[i][0] += dx; T.trail[i][1] += dy; }
    if (T.food) { T.food.x = rx(T.food.x); T.food.y = ry(T.food.y); }
    if (T.dore) { T.dore.x = rx(T.dore.x); T.dore.y = ry(T.dore.y); }
    if (T.F) { T.F.x = T.ix0 + 2; T.F.y = Math.max(T.iy0 + 2, Math.min(T.F.y, T.iy0 + nh * 0.3)); T.F.yc = T.iy0 + 4; }
    T.fleches.length = 0; T.bombes.length = 0; T.balles.length = 0;
    if (T.souc) T.souc.yb = T.iy0 + nh * 0.42;
    T.hx = clamp(T.hx, T.ix0 + 6, T.ix1 - 6); T.hy = clamp(T.hy, T.iy0 + 6, T.iy1 - 6);
    journal('recadrage');
  }

  /* ================================ le dessin en gros pixels ================================ */
  var CX0 = 0, CY0 = 0, CX1 = 0, CY1 = 0;
  function clip(x0, y0, x1, y1) { CX0 = Math.max(0, x0); CY0 = Math.max(0, y0); CX1 = Math.min(T.LW, x1); CY1 = Math.min(T.LH, y1); }
  function clipTout() { clip(0, 0, T.LW, T.LH); }
  function R0(v) { return Math.floor(v + 0.5); }
  function lpx(x, y, c) { x = R0(x); y = R0(y); if (x < CX0 || y < CY0 || x >= CX1 || y >= CY1) return; L[y * T.LW + x] = c; }
  function lrect(x, y, w, h, c) {
    x = R0(x); y = R0(y); var xa = Math.max(CX0, x), ya = Math.max(CY0, y), xb = Math.min(CX1, x + w), yb = Math.min(CY1, y + h);
    for (var yy = ya; yy < yb; yy++) { var o = yy * T.LW; for (var xx = xa; xx < xb; xx++) L[o + xx] = c; }
  }
  function lline(x0, y0, x1, y1, c, pas) {
    x0 = R0(x0); y0 = R0(y0); x1 = R0(x1); y1 = R0(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, k = 0, garde = dx + dy + 2;
    for (;;) {
      if (!pas || (k % pas) === 0) lpx(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || --garde < 0) break;
      var e2 = 2 * err; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
      k++;
    }
  }
  /* disque ou couronne tramés, en pixels de 1982 : la trame de Bayer est donc deux fois plus grosse, comme il faut */
  function ldisc(x, y, r0, r1, c, t) {
    if (t === undefined) t = 1; if (!(t > 0) || r1 <= 0) return;
    x = R0(x); y = R0(y); var R = Math.ceil(r1), D = N.pal.dither;
    for (var dy = -R; dy <= R; dy++) {
      var yy = y + dy; if (yy < CY0 || yy >= CY1) continue;
      for (var dx = -R; dx <= R; dx++) {
        var xx = x + dx; if (xx < CX0 || xx >= CX1) continue;
        var d2 = dx * dx + dy * dy; if (d2 > r1 * r1 || d2 < r0 * r0) continue;
        if (t >= 1 || D(xx, yy, t)) L[yy * T.LW + xx] = c;
      }
    }
  }
  function lspr(s, x, y, c) { x = R0(x); y = R0(y); for (var i = 0; i < s.p.length; i += 2) lpx(x + s.p[i], y + s.p[i + 1], c); }
  function ltexte(str, x, y, c, k) {
    if (!N.spr || !N.spr.text) return 0;
    var s = null; try { s = N.spr.text(str, { ci: c, echelle: k || 1 }); } catch (e) { s = null; }
    if (!s || !s.data) return 0;
    x = R0(x); y = R0(y);
    for (var j = 0; j < s.h; j++) for (var i = 0; i < s.w; i++) { var v = s.data[j * s.w + i]; if (v) lpx(x + i, y + j, v); }
    return s.w;
  }
  function largeur(str, k) { return str.length * 6 * (k || 1) - (k || 1); }

  /* ================================ la musique de 1982 ================================ */
  var A = { ctx: null, out: null, next: 0, step: 0, sec: 0, casse: 0, demi: 0, passage: false, leadFin: 0, ondes: {}, bL: null, bC: null,
    notes: { pulse: 0, tri: 0, bruit: 0 } };
  function audio() {
    if (A.ctx) return A.ctx;
    var c = null;
    try { c = N.music && N.music.context ? N.music.context() : null; } catch (e) { c = null; }
    if (!c || !c.createOscillator) return null;
    A.ctx = c;
    A.out = c.createGain(); A.out.gain.value = 0.8; A.out.connect(c.destination);
    /* le carré pulsé : trois rapports cycliques, par séries de Fourier */
    var rap = [0.5, 0.25, 0.125];
    for (var r = 0; r < rap.length; r++) {
      var n = 40, re = new Float32Array(n), im = new Float32Array(n), d = rap[r];
      for (var k = 1; k < n; k++) { re[k] = 2 / (k * Math.PI) * Math.sin(2 * Math.PI * k * d); im[k] = 2 / (k * Math.PI) * (1 - Math.cos(2 * Math.PI * k * d)); }
      try { A.ondes[d] = c.createPeriodicWave(re, im); } catch (e) { A.ondes[d] = null; }
    }
    /* le bruit : un registre à décalage de 15 bits (mode long : bits 0 et 1 ; mode court, métallique : bits 0 et 6) */
    A.bL = registre(c, 1, 1); A.bC = registre(c, 6, 2);
    return c;
  }
  function registre(c, bit, tenue) {
    var sr = c.sampleRate, n = Math.floor(sr), b = c.createBuffer(1, n, sr), x = b.getChannelData(0), reg = 1, v = 1;
    for (var i = 0; i < n; i++) {
      if (i % tenue === 0) { var fb = (reg ^ (reg >> bit)) & 1; reg = (reg >> 1) | (fb << 14); v = (reg & 1) ? -1 : 1; }
      x[i] = v * 0.8;
    }
    return b;
  }
  function muet(canal) { try { return !!(N.music && N.music.muted && (N.music.muted(canal || 'musique') || N.music.muted() === true)); } catch (e) { return false; } }
  function sonOk(canal) { var c = audio(); return !!(c && c.state === 'running' && !muet(canal) && T.on); }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function pulse(t, m, d, v, rap, glisse) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain(), w = A.ondes[rap || 0.5];
    if (w) o.setPeriodicWave(w); else o.type = 'square';
    o.frequency.setValueAtTime(hz(m), t);
    if (glisse) o.frequency.linearRampToValueAtTime(hz(m + glisse), t + d);
    if (d > 0.28 && !glisse) {                                   // un vibrato sur les notes tenues, après l'attaque
      var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = hz(m) * 0.007;
      l.connect(lg); lg.connect(o.frequency); l.start(t + 0.12); l.stop(t + d + 0.03);
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.setValueAtTime(v, t + d * 0.3);
    g.gain.linearRampToValueAtTime(v * 0.65, t + d * 0.9); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(A.out); o.start(t); o.stop(t + d + 0.03); A.notes.pulse++;
  }
  function tri(t, m, d, v, glisse) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(hz(m), t);
    if (glisse) o.frequency.exponentialRampToValueAtTime(hz(m + glisse), t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.setValueAtTime(v, t + d * 0.85); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(A.out); o.start(t); o.stop(t + d + 0.03); A.notes.tri++;
  }
  function bruit(t, d, v, court, type, f0, f1) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = court ? A.bC : A.bL; s.loop = true;
    f.type = type || 'highpass'; f.frequency.setValueAtTime(f0 || 1000, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
    s.connect(f); f.connect(g); g.connect(A.out);
    s.start(t, (A.notes.bruit * 0.137) % 0.9); s.stop(t + d + 0.02); A.notes.bruit++;
  }
  function kick(t, v) { tri(t, 52, 0.16, v, -26); bruit(t, 0.03, v * 0.25, false, 'lowpass', 900); }
  function caisse(t, v) { bruit(t, 0.14, v, false, 'highpass', 1200); tri(t, 50, 0.06, v * 0.6, -7); }
  function charleston(t, v, ouvert) { bruit(t, ouvert ? 0.09 : 0.03, v, true, 'highpass', 6500); }

  /* le motif : quatre mesures (la mineur, fa, do, sol), en doubles croches : [pas, note MIDI, durée en pas] */
  var MOTIF = [
    [[0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 81, 1], [7, 79, 1], [8, 76, 3], [11, 74, 1], [12, 76, 4]],
    [[0, 77, 2], [2, 76, 2], [4, 72, 2], [6, 69, 2], [8, 72, 2], [10, 74, 1], [11, 76, 1], [12, 72, 4]],
    [[0, 79, 2], [2, 76, 2], [4, 72, 2], [6, 79, 1], [7, 81, 1], [8, 79, 3], [11, 76, 1], [12, 79, 2], [14, 84, 2]],
    [[0, 83, 3], [3, 81, 1], [4, 79, 2], [6, 74, 2], [8, 71, 2], [10, 74, 2], [12, 76, 4]]
  ];
  var MOTIF_B = [[0, 83, 3], [3, 81, 1], [4, 79, 2], [6, 74, 2], [8, 71, 2], [10, 74, 1], [11, 76, 1], [12, 81, 2], [14, 79, 1], [15, 76, 1]];
  var BASSES = [45, 41, 48, 43], ACCORDS = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
  function grille(evs) { var g = []; for (var i = 0; i < evs.length; i++) g[evs[i][0]] = evs[i]; return g; }
  var GM = [grille(MOTIF[0]), grille(MOTIF[1]), grille(MOTIF[2]), grille(MOTIF[3])], GB = grille(MOTIF_B);
  var RAPPORTS = [0.5, 0.25, 0.125, 0.25];

  function tempo() { return CFG.tempos[T.sec]; }
  function tempoMus() { return CFG.tempos[A.sec]; }
  function pasMusique(t, i, d16) {
    var bar = Math.floor(i / 16), pos = i % 16, b4 = bar % 4, phrase = Math.floor(bar / 4);
    if (pos === 0 && T.sec !== A.sec) {                         // les sections changent sur la barre de mesure
      if (T.sec === 2) A.casse = 1;
      if (T.sec === 3) A.demi = 1;
      A.sec = T.sec;
    }
    var sec = A.sec, tr = sec >= 2 ? 2 : 0, mort = T.phase === 'mort';
    if (A.casse > 0) {                                          // la mesure coupée : un roulement qui monte, la sirène
      caisse(t, 0.05 + pos * 0.012);
      if (pos === 0) pulse(t, 84, d16 * 15, 0.035, 0.125, 7);
      if (pos === 15) A.casse--;
      return;
    }
    if (A.demi > 0) {                                           // la mesure en demi-temps : tout s'étire, puis repart
      if (pos === 0) { kick(t, 0.55); tri(t, BASSES[0] + tr, d16 * 15, 0.24); pulse(t, 81 + tr, d16 * 7.5, 0.08, 0.25); }
      if (pos === 8) { caisse(t, 0.2); pulse(t, 84 + tr, d16 * 7.5, 0.08, 0.25); }
      if (pos === 15) A.demi--;
      return;
    }
    /* la batterie, au bruit */
    if (pos === 0 || pos === 8 || (sec >= 2 && pos === 10) || (sec === 3 && b4 === 3 && pos === 14)) kick(t, 0.5);
    if (sec >= 1 && (pos === 4 || pos === 12)) caisse(t, 0.17);
    if (sec >= 1 && b4 === 3 && phrase % 2 === 1 && pos >= 13) caisse(t, 0.1);
    if (sec === 0 ? pos % 4 === 2 : sec === 1 ? pos % 2 === 0 && pos % 4 !== 0 : pos % 2 === 1 || pos % 4 === 2) charleston(t, sec >= 2 ? 0.035 : 0.05, pos === 14 && sec >= 1);
    /* la basse, au triangle : des croches en octaves, une quinte avant la mesure suivante */
    if (pos % 2 === 0) {
      var r = BASSES[b4] + tr, m = (pos % 4 === 2) ? r + 12 : r;
      if (pos === 14 && sec >= 1) m = r + 7;
      tri(t, m, d16 * 1.7, mort ? 0.12 : 0.2);
    }
    /* le motif, au carré pulsé ; muet pendant une mort */
    if (mort) return;
    var ev = (b4 === 3 && (phrase & 1)) ? GB[pos] : GM[b4][pos], v = sec >= 2 ? 0.075 : 0.085, haut = (sec === 3 && (phrase & 1)) ? 12 : 0;
    if (ev) {
      var mm = ev[1] + tr + haut;
      pulse(t, mm, ev[2] * d16 * 0.92, v, RAPPORTS[sec]);
      A.leadFin = t + ev[2] * d16 * 0.92;
      if (sec >= 1 && ev[2] >= 3 && rna() < 0.35) pulse(t + d16 * 2, mm + 12, d16 * 0.8, v * 0.6, 0.125);    // un écho d'octave
    } else if (sec === 3 && t >= A.leadFin) {                   // les silences du motif se remplissent d'arpèges
      var ac = ACCORDS[b4], n = BASSES[b4] + tr + 24 + ac[i % 3] + (pos & 4 ? 12 : 0);
      pulse(t, n, d16 * 0.7, v * 0.5, 0.125);
    }
  }
  function ordonnancer() {
    var c = audio(); if (!c || c.state !== 'running' || muet() || T.phase === 'fini') return;
    if (T.phase === 'passage') { if (!A.passage) { A.passage = true; montee(c.currentTime + 0.03); } return; }
    var d16 = 60 / tempoMus() / 4;
    if (A.next < c.currentTime) A.next = c.currentTime + 0.05;
    while (A.next < c.currentTime + 0.15) {
      pasMusique(A.next, A.step, d16);
      A.step++; A.next += d16; d16 = 60 / tempoMus() / 4;
    }
  }
  /* le passage : une montée (bruit qui s'ouvre, arpège de ré mineur qui accélère), puis l'impact quand les pixels s'affinent */
  function montee(t) {
    bruit(t, 1.8, 0.16, false, 'bandpass', 300, 5200);
    var D = [62, 65, 69, 74, 77, 81, 86, 89], tt = t;
    for (var k = 0; k < 24; k++) { var d = Math.max(0.035, 0.11 - k * 0.0035); pulse(tt, D[k % 8] + (k >= 16 ? 12 : 0), d * 0.9, 0.05 + k * 0.002, 0.125); tt += d; }
    tri(t, 38, 1.8, 0.2, 12);
    var ti = t + 1.9;
    kick(ti, 0.8); bruit(ti, 1.1, 0.4, false, 'lowpass', 3000, 120); tri(ti, 38, 1.3, 0.3);
    pulse(ti, 74, 1.2, 0.07, 0.25); pulse(ti + 0.02, 81, 1.1, 0.04, 0.5);
  }
  /* les bruitages : joués tout de suite, sur la même sortie */
  function sfx(nom) {
    if (!sonOk('effets')) return;
    var t = A.ctx.currentTime + 0.01;
    if (nom === 'tir') pulse(t, 96, 0.05, 0.022, 0.125, -24);
    else if (nom === 'pop') bruit(t, 0.2, 0.2, false, 'lowpass', 2400, 300);
    else if (nom === 'boum') { bruit(t, 1.0, 0.5, false, 'lowpass', 2600, 90); tri(t, 40, 0.7, 0.4, -14); }
    else if (nom === 'mange') { pulse(t, 84, 0.035, 0.06, 0.25); pulse(t + 0.035, 88, 0.035, 0.06, 0.25); pulse(t + 0.07, 91, 0.05, 0.06, 0.25); }
    else if (nom === 'or') { for (var k = 0; k < 8; k++) pulse(t + k * 0.04, 81 + k * 3, 0.045, 0.07, 0.25); }
    else if (nom === 'mort') { pulse(t, 72, 0.7, 0.08, 0.5, -36); bruit(t, 0.5, 0.25, false, 'lowpass', 1800, 100); }
    else if (nom === 'fleche') { pulse(t, 100, 0.03, 0.04, 0.125); pulse(t + 0.06, 100, 0.03, 0.04, 0.125); }
    else if (nom === 'sirene') { pulse(t, 86, 0.25, 0.03, 0.125, 5); pulse(t + 0.25, 91, 0.25, 0.03, 0.125, -5); }
    else if (nom === 'touche') pulse(t, 60, 0.06, 0.07, 0.5, -5);
    else if (nom === 'coupe') { bruit(t, 0.08, 0.15, true, 'highpass', 2000); pulse(t, 79, 0.15, 0.05, 0.5, -12); }
  }

  /* ================================ le jeu ================================ */
  function vitesse() { return CFG.vitesse * tempo() / 132; }
  function virage() { return CFG.virage * tempo() / 132; }
  function seg(i) { if (i <= 0) return [T.hx, T.hy]; var k = Math.min(T.trail.length - 1, i * CFG.ecart); return T.trail[k] || [T.hx, T.hy]; }

  function start(o) {
    if (!pal() || !G()) return false;
    o = o || {};
    rs = (o.graine >>> 0) || 1982; ra = (rs % 2147483647) || 82;
    T.on = true; T.phase = 'boot'; T.t = 0; T.pt = 0; T.vt = 0; T.sec = 0; T.score = 0; T.morts = 0;
    T.W = 0; layout();
    T.balles.length = 0; T.fleches.length = 0; T.bombes.length = 0; T.expl.length = 0; T.frags.length = 0; T.chaine.length = 0;
    T.F = null; T.formT = 0; T.vagues = 0; T.flecheT = 0; T.souc = null; T.soucT = -1; T.soucVue = false; T.food = null; T.dore = null; T.fren = 0;
    T.acc16 = 0; T.p16 = 0; T.anim = 0; T.msgBoot = 0; T.msg = ''; T.msgT = 0; T.shake = 0; T.gel = 0; T.an = 1976; T.invul = 0;
    T.compte = { tues: 0, mange: 0, coupes: 0, grosses: 0, tirs: 0 }; T.nouv = []; T.premiereExplosion = -1;
    T.surFin = typeof o.surFin === 'function' ? o.surFin : null; T.finAppele = false; T.journal.length = 0;
    A.step = 0; A.next = 0; A.sec = 0; A.casse = 0; A.demi = 0; A.passage = false; A.leadFin = 0;
    A.notes = { pulse: 0, tri: 0, bruit: 0 };
    naitreDuCadre();
    journal('debut');
    return true;
  }
  /* le serpent naît du cadre de 1976 : sa traîne est le périmètre, qui se rétracte pendant que la tête entre */
  function naitreDuCadre() {
    var hs = T.X0 + Math.round((T.X1 - T.X0) * 0.3), y = T.Y1, x, tr = [];
    tr.push([hs, y]);
    for (x = hs - 1; x >= T.X0; x--) tr.push([x, T.Y1]);
    for (y = T.Y1 - 1; y >= T.Y0; y--) tr.push([T.X0, y]);
    for (x = T.X0 + 1; x <= T.X1; x++) tr.push([x, T.Y0]);
    for (y = T.Y0 + 1; y <= T.Y1; y++) tr.push([T.X1, y]);
    for (x = T.X1 - 1; x > hs; x--) tr.push([x, T.Y1]);
    T.trail = tr; T.corde = tr.length; T.perimetre = tr.length;
    T.hx = hs; T.hy = T.Y1; T.cap = -Math.PI / 2; T.vise = T.cap; T.aVise = false; T.sens = 1;
    T.nseg = CFG.longueurDepart;
  }
  function trainer() {
    var p = T.trail[0], dx = T.hx - p[0], dy = T.hy - p[1], d = Math.sqrt(dx * dx + dy * dy), garde = 400;
    while (d >= 1 && --garde > 0) {
      var nx = p[0] + dx / d, ny = p[1] + dy / d;
      T.trail.unshift([nx, ny]); p = T.trail[0];
      dx = T.hx - nx; dy = T.hy - ny; d = Math.sqrt(dx * dx + dy * dy);
    }
    var max = Math.max(T.nseg * CFG.ecart + 2, T.corde | 0);
    if (T.trail.length > max) T.trail.length = max;
  }
  function placerSerpent() {
    var iw = T.ix1 - T.ix0, ih = T.iy1 - T.iy0;
    T.hx = T.ix0 + Math.max(26, iw * 0.25); T.hy = T.iy0 + ih * 0.78; T.cap = 0; T.vise = 0; T.aVise = false;
    T.nseg = CFG.longueurDepart; T.corde = 0; T.trail = [];
    for (var k = 0; k <= T.nseg * CFG.ecart + 2; k++) T.trail.push([T.hx - k, T.hy]);
    T.invul = CFG.invuln;
  }
  function libre(dmin) {
    var iw = T.ix1 - T.ix0, ih = T.iy1 - T.iy0, bb = boiteFormation();
    for (var k = 0; k < 200; k++) {
      var x = T.ix0 + 7 + rnd() * (iw - 14), y = T.iy0 + 7 + rnd() * (ih - 14);
      var dx = x - T.hx, dy = y - T.hy;
      if (dx * dx + dy * dy < dmin * dmin) continue;
      if (bb && x > bb.x0 - 6 && x < bb.x1 + 6 && y > bb.y0 - 6 && y < bb.y1 + 8) continue;
      if (bb && y < bb.y1 + 4) continue;
      return { x: x, y: y };
    }
    return { x: T.ix0 + iw / 2, y: T.iy0 + ih * 0.7 };
  }

  /* la formation : des envahisseurs qui marchent, et descendent d'un cran à chaque bord */
  function nouvelleFormation() {
    var iw = T.ix1 - T.ix0, ih = T.iy1 - T.iy0;
    var cols = clamp(Math.floor((iw - 18) / PASX), 4, 8), rows = clamp(1 + Math.floor(ih / 70) + T.vagues, 2, 4);
    var F = { cols: cols, rows: rows, x: T.ix0 + Math.floor((iw - (cols * PASX - 3)) / 2), y: T.iy0 - rows * PASY, yc: T.iy0 + 4,
      dir: (T.vagues & 1) ? -1 : 1, vivant: [], n: cols * rows, type: T.vagues & 1 };
    for (var k = 0; k < cols * rows; k++) F.vivant.push(1);
    T.F = F; T.vagues++;
    journal('formation ' + T.vagues + ' (' + cols + 'x' + rows + ')');
  }
  function posInv(F, k) { return { x: F.x + (k % F.cols) * PASX, y: F.y + Math.floor(k / F.cols) * PASY }; }
  function boiteFormation() {
    var F = T.F; if (!F || !F.n) return null;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var k = 0; k < F.vivant.length; k++) if (F.vivant[k]) {
      var p = posInv(F, k); if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x + IW > x1) x1 = p.x + IW; if (p.y + IH > y1) y1 = p.y + IH;
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function marcher() {
    var F = T.F; if (!F || !F.n || F.y < F.yc) return;
    var bb = boiteFormation(), pas = F.n > 8 ? 1 : F.n > 3 ? 1.5 : 2.5;
    if ((F.dir > 0 && bb.x1 + pas >= T.ix1 - 1) || (F.dir < 0 && bb.x0 - pas <= T.ix0 + 1)) {
      F.dir = -F.dir;
      if (bb.y1 + 3 < T.iy0 + (T.iy1 - T.iy0) * CFG.plancher) F.y += 3;
    } else F.x += F.dir * pas;
  }

  function tirer() {
    var dirs = T.fren > 0 ? [-0.26, 0, 0.26] : [0];
    for (var i = 0; i < dirs.length; i++) {
      var a = T.cap + dirs[i];
      T.balles.push({ x: T.hx + Math.cos(a) * 4, y: T.hy + Math.sin(a) * 4, vx: Math.cos(a) * CFG.balle, vy: Math.sin(a) * CFG.balle });
    }
    T.compte.tirs++;
    sfx('tir');
  }
  function lacherBombe() {
    var F = T.F; if (!F || !F.n || F.y < F.yc) return;
    var c = Math.floor(rnd() * F.cols);
    for (var tries = 0; tries < F.cols; tries++, c = (c + 1) % F.cols) {
      for (var r = F.rows - 1; r >= 0; r--) {
        var k = r * F.cols + c;
        if (F.vivant[k]) { var p = posInv(F, k); T.bombes.push({ x: p.x + 3, y: p.y + IH, t: 0 }); return; }
      }
    }
  }
  function lancerFleche() {
    var iw = T.ix1 - T.ix0, ih = T.iy1 - T.iy0, p = null;
    for (var k = 0; k < 12; k++) {
      var b = Math.floor(rnd() * 3), q;
      if (b === 0) q = { x: T.ix0 + 2, y: T.iy0 + ih * (0.35 + rnd() * 0.6) };
      else if (b === 1) q = { x: T.ix1 - 3, y: T.iy0 + ih * (0.35 + rnd() * 0.6) };
      else q = { x: T.ix0 + 4 + rnd() * (iw - 8), y: T.iy1 - 3 };
      var dx = q.x - T.hx, dy = q.y - T.hy;
      if (dx * dx + dy * dy > 30 * 30) { p = q; break; }
    }
    if (!p) return;
    var v = vitesse(), tx = T.hx + Math.cos(T.cap) * v * 0.5, ty = T.hy + Math.sin(T.cap) * v * 0.5;
    var ddx = tx - p.x, ddy = ty - p.y, d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
    T.fleches.push({ x: p.x, y: p.y, dx: ddx / d, dy: ddy / d, etat: 'vise', t: 0 });
    sfx('fleche'); journal('fleche');
  }
  function lancerSoucoupe() {
    var ih = T.iy1 - T.iy0;
    T.souc = { x: T.ix0 - SW - 2, y: T.iy0 + ih * 0.42, yb: T.iy0 + ih * 0.42, dir: 1, vie: CFG.soucoupeVie, passes: 0, t: 0, flash: 0, etat: 'vole', vy: 0 };
    T.soucVue = true; journal('soucoupe');
  }

  function boum(x, y, gros, c) {
    T.expl.push({ x: x, y: y, t: 0, gros: !!gros });
    var n = gros ? 28 : 6;
    for (var i = 0; i < n; i++) {
      var a = rnd() * 6.283, v = (gros ? 20 : 12) + rnd() * (gros ? 50 : 24);
      T.frags.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c !== undefined ? c : (i & 1 ? P.jaune : P.magenta), l: 0.3 + rnd() * (gros ? 0.8 : 0.35) });
    }
    if (gros) {
      T.shake = 3; T.gel = 0.12; T.compte.grosses++;
      if (T.premiereExplosion < 0) T.premiereExplosion = +T.vt.toFixed(2);
      journal('grosse explosion'); sfx('boum');
    } else { T.shake = Math.max(T.shake, 1); sfx('pop'); }
  }
  function couper(i, pourquoi) {
    if (i < 3) i = 3; if (i >= T.nseg) return;
    for (var k = i; k < T.nseg; k++) { var p = seg(k); T.frags.push({ x: p[0], y: p[1], vx: (rnd() - 0.5) * 30, vy: -10 - rnd() * 20, c: P.cyan, l: 0.5 + rnd() * 0.4 }); }
    journal('coupe ' + pourquoi + ' -' + (T.nseg - i));
    T.nseg = i; T.compte.coupes++;
    T.trail.length = Math.min(T.trail.length, T.nseg * CFG.ecart + 2);
    sfx('coupe');
  }
  function mourir(pourquoi) {
    T.morts++; T.phase = 'mort'; T.pt = 0;
    for (var k = 0; k < T.nseg; k++) { var p = seg(k); T.frags.push({ x: p[0], y: p[1], vx: (rnd() - 0.5) * 40, vy: -20 - rnd() * 25, c: P.cyan, l: 0.7 + rnd() * 0.5 }); }
    boum(T.hx, T.hy, false, P.jaune);
    T.fleches.length = 0; T.bombes.length = 0; T.balles.length = 0;
    journal('mort ' + T.morts + ' ' + pourquoi);
    sfx('mort');
    if (T.morts >= CFG.mortsAvantFin) dire('PAS ENCORE.', 3); else dire('GAME OVER', 1.3);
  }
  function nouveaute(n) {
    T.nouv.push({ n: n, t: +T.vt.toFixed(2) });
    dire(MSG[n]); journal('nouveaute ' + n);
    if (n === 1) T.flecheT = 0.9;
    if (n === 2) { T.soucT = 1.6; sfx('sirene'); }
    if (n === 3) { T.dore = libre(30); T.dore.t = 0; sfx('or'); }
  }
  function passage(pourquoi) {
    if (T.phase === 'passage' || T.phase === 'fini') return;
    T.phase = 'passage'; T.pt = 0; T.fren = 0;
    journal('passage ' + pourquoi);
    /* la chaîne : tout ce qui vit saute, l'un après l'autre */
    T.chaine.length = 0;
    var F = T.F, k, d = 0;
    if (F) for (k = 0; k < F.vivant.length; k++) if (F.vivant[k]) { var p = posInv(F, k); T.chaine.push({ x: p.x + 4, y: p.y + 3, at: 0.08 + d * 0.06, fait: false }); d++; F.vivant[k] = 0; }
    if (F) F.n = 0;
    for (k = 0; k < T.fleches.length; k++) T.chaine.push({ x: T.fleches[k].x, y: T.fleches[k].y, at: 0.05 + k * 0.05, fait: false });
    if (T.souc) T.chaine.push({ x: T.souc.x + 8, y: T.souc.y + 3, at: 0.3, fait: false, gros: true });
    for (k = 0; k < T.chaine.length; k++) T.chaine[k].at = Math.min(0.85, T.chaine[k].at);
    T.fleches.length = 0; T.bombes.length = 0; T.souc = null; T.food = null; T.dore = null;
    T.dernier82 = null;
  }

  function update(dt) {
    if (!T.on || !pal()) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    var s = S(); if (s.paused) return;
    T.t += dt; T.pt += dt; T.msgT += dt;
    if (G() && (G().W !== T.W || G().H !== T.H)) layout();
    ordonnancer();
    if (T.gel > 0) { T.gel -= dt; return; }                    // le gel d'image d'une grosse explosion
    if (T.phase === 'boot') majBoot(dt);
    else if (T.phase === 'jeu') majJeu(dt);
    else if (T.phase === 'mort') {
      if (T.pt >= CFG.mort) {
        if (T.morts >= CFG.mortsAvantFin) passage('morts');
        else { placerSerpent(); T.phase = 'jeu'; T.pt = 0; dire('CONTINUE', 1.4); }
      }
    } else if (T.phase === 'passage') majPassage(dt);
    majEffets(dt);
  }
  function majBoot(dt) {
    var p = T.pt;
    T.an = 1976 + Math.min(6, Math.floor(p / 0.15));
    if (p >= 0.35) {
      /* la corde (le cadre) se rétracte ; la tête monte, puis tourne vers la droite */
      var u = clamp((p - 0.35) / 1.25, 0, 1), e = u * u * (3 - 2 * u);
      T.corde = Math.round(T.perimetre * (1 - e));
      if (p > 0.85) { var d = angDiff(0, T.cap), m = virage() * dt; T.cap += clamp(d, -m, m); }
      var v = vitesse() * 0.85;
      T.hx += Math.cos(T.cap) * v * dt; T.hy += Math.sin(T.cap) * v * dt;
      trainer();
    }
    if (p >= 0.9 && !T.F) nouvelleFormation();
    if (T.F && T.F.y < T.F.yc) T.F.y = Math.min(T.F.yc, T.F.y + 22 * dt);
    if (p >= 0.4 && !T.msgBoot) { T.msgBoot = 1; dire('1982', 1.1); }
    if (p >= 1.5 && T.msgBoot === 1) { T.msgBoot = 2; dire('JOUEUR 1  PRÊT', 1.5); }
    if (p >= CFG.boot) { T.phase = 'jeu'; T.pt = 0; T.corde = 0; T.msgBoot = 0; T.an = 1982; T.food = libre(20); journal('jeu'); }
  }
  function majJeu(dt) {
    T.vt += dt;
    while (T.sec < 3 && T.vt >= CFG.nouveautes[T.sec]) { T.sec++; nouveaute(T.sec); }
    if (T.vt >= CFG.finMax && T.fren <= 0) { passage('temps'); return; }
    if (T.invul > 0) T.invul -= dt;
    /* la direction : le manche donne un cap ; le serpent y tourne à vitesse bornée (un demi-tour fait une boucle) */
    var inp = S().input;
    if (inp && inp.mag > 0.3 && (inp.x || inp.y)) { T.vise = Math.atan2(inp.y, inp.x); T.aVise = true; }
    if (T.aVise) {
      var d = angDiff(T.vise, T.cap), m = virage() * dt;
      if (Math.abs(d) > 2.9) d = T.sens * Math.abs(d); else if (Math.abs(d) > 0.02) T.sens = d > 0 ? 1 : -1;
      T.cap += clamp(d, -m, m);
      if (T.cap > Math.PI) T.cap -= 6.2832; if (T.cap < -Math.PI) T.cap += 6.2832;
    }
    var v = vitesse();
    T.hx += Math.cos(T.cap) * v * dt; T.hy += Math.sin(T.cap) * v * dt;
    trainer();
    /* l'horloge des doubles croches : le tir, la marche, les bombes vont sur le temps */
    T.acc16 += dt;
    var d16 = 60 / tempo() / 4;
    while (T.acc16 >= d16) { T.acc16 -= d16; pas16(); if (T.phase !== 'jeu') return; }
    if (T.fren > 0) { T.fren -= dt; if (T.fren <= 0) { passage('dore'); return; } }
    if (T.F && T.F.y < T.F.yc) T.F.y = Math.min(T.F.yc, T.F.y + 22 * dt);
    if (T.F && !T.F.n) { T.F = null; T.formT = 1.2; }
    if (!T.F && T.formT > 0) { T.formT -= dt; if (T.formT <= 0) nouvelleFormation(); }
    if (T.sec >= 1 && T.fren <= 0) { T.flecheT -= dt; if (T.flecheT <= 0) { lancerFleche(); T.flecheT = T.sec === 1 ? 3.4 : 2.6; } }
    if (T.soucT > 0) { T.soucT -= dt; if (T.soucT <= 0) { T.soucT = -1; lancerSoucoupe(); } }
    majEntites(dt);
    collisions();
  }
  function pas16() {
    T.p16++;
    var temps = T.p16 % 4 === 0;
    if (temps) { T.anim ^= 1; tirer(); if (T.sec >= 1 && T.fren <= 0 && rnd() < (T.sec === 1 ? 0.2 : 0.3)) lacherBombe(); }
    else if (T.fren > 0 && T.p16 % 2 === 0) tirer();
    marcher();
    if (T.souc && T.p16 % 16 === 0) sfx('sirene');
  }
  function majEntites(dt) {
    var i;
    for (i = T.balles.length - 1; i >= 0; i--) {
      var b = T.balles[i]; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < T.ix0 || b.y < T.iy0 || b.x >= T.ix1 || b.y >= T.iy1) T.balles.splice(i, 1);
    }
    for (i = T.bombes.length - 1; i >= 0; i--) {
      var o = T.bombes[i]; o.y += CFG.bombeV * dt; o.t += dt;
      if (o.y >= T.iy1 - 3) { T.bombes.splice(i, 1); T.frags.push({ x: o.x, y: T.iy1 - 1, vx: 0, vy: -12, c: P.magenta, l: 0.2 }); }
    }
    for (i = T.fleches.length - 1; i >= 0; i--) {
      var f = T.fleches[i]; f.t += dt;
      if (f.etat === 'vise') { if (f.t >= CFG.telegraphe) { f.etat = 'fonce'; f.t = 0; } }
      else {
        f.x += f.dx * CFG.flecheV * dt; f.y += f.dy * CFG.flecheV * dt;
        if (f.x < T.ix0 - 4 || f.y < T.iy0 - 4 || f.x > T.ix1 + 4 || f.y > T.iy1 + 4) T.fleches.splice(i, 1);
      }
    }
    var sc = T.souc;
    if (sc) {
      sc.t += dt; if (sc.flash > 0) sc.flash -= dt;
      if (sc.etat === 'vole') {
        sc.x += sc.dir * CFG.soucoupeV * dt; sc.y = sc.yb + Math.sin(sc.t * 2.2) * 5;
        if ((sc.dir > 0 && sc.x > T.ix1 + 2) || (sc.dir < 0 && sc.x + SW < T.ix0 - 2)) {
          sc.passes++;
          if (sc.passes >= 2) { sc.etat = 'chute'; sc.x = clamp(sc.x, T.ix0 + 4, T.ix1 - SW - 4); sc.vy = 6; journal('soucoupe tombe'); }
          else { sc.dir = -sc.dir; sc.yb = T.iy0 + (T.iy1 - T.iy0) * 0.3; }
        }
      } else {
        sc.vy += 34 * dt; sc.y += sc.vy * dt; sc.x += (T.ix0 + (T.ix1 - T.ix0) / 2 - SW / 2 - sc.x) * dt * 0.8;
        if (sc.y + SH >= T.iy1 - 1) { boum(sc.x + SW / 2, T.iy1 - 4, true); T.souc = null; journal('soucoupe ecrasee'); }
      }
    }
    if (T.dore) T.dore.t += dt;
  }
  function touche(px, py, x, y, w, h, m) { return px >= x - m && px < x + w + m && py >= y - m && py < y + h + m; }
  function collisions() {
    var i, k, F = T.F, b, p;
    /* les tirs */
    for (i = T.balles.length - 1; i >= 0; i--) {
      b = T.balles[i]; var mort = false;
      if (F && F.n) for (k = 0; k < F.vivant.length && !mort; k++) if (F.vivant[k]) {
        p = posInv(F, k);
        if (touche(b.x, b.y, p.x, p.y, IW, IH, 0.5)) { F.vivant[k] = 0; F.n--; mort = true; T.score += PTS.inv; T.compte.tues++; boum(p.x + 4, p.y + 3, false); }
      }
      for (k = T.fleches.length - 1; k >= 0 && !mort; k--) {
        var f = T.fleches[k], dx = b.x - f.x, dy = b.y - f.y;
        if (dx * dx + dy * dy < 12) { T.fleches.splice(k, 1); mort = true; T.score += PTS.fleche; T.compte.tues++; boum(f.x, f.y, false); }
      }
      for (k = T.bombes.length - 1; k >= 0 && !mort; k--) {
        var o = T.bombes[k];
        if (touche(b.x, b.y, o.x, o.y, 2, 3, 1)) { T.bombes.splice(k, 1); mort = true; T.score += PTS.bombe; T.frags.push({ x: o.x, y: o.y, vx: 0, vy: -10, c: P.jaune, l: 0.2 }); }
      }
      var sc = T.souc;
      if (!mort && sc && touche(b.x, b.y, sc.x, sc.y, SW, SH, 0.5)) {
        mort = true; sc.vie--; sc.flash = 0.12; sfx('touche');
        if (sc.vie <= 0) { boum(sc.x + SW / 2, sc.y + 3, true); T.score += PTS.souc; T.compte.tues++; T.souc = null; journal('soucoupe abattue'); }
      }
      if (mort) T.balles.splice(i, 1);
    }
    /* le mur tue */
    if (T.hx < T.ix0 + 1 || T.hy < T.iy0 + 1 || T.hx > T.ix1 - 2 || T.hy > T.iy1 - 2) { mourir('mur'); return; }
    /* manger */
    if (T.food) { var fx = T.food.x - T.hx, fy = T.food.y - T.hy; if (fx * fx + fy * fy < 16) {
      T.score += PTS.cellule; T.compte.mange++; T.nseg = Math.min(CFG.longueurMax, T.nseg + 1);
      for (k = 0; k < 4; k++) T.frags.push({ x: T.food.x, y: T.food.y, vx: Math.cos(k * 1.57) * 18, vy: Math.sin(k * 1.57) * 18, c: P.jaune, l: 0.25 });
      sfx('mange'); journal('mange ' + T.compte.mange); T.food = libre(20);
    } }
    if (T.dore) { var gx = T.dore.x - T.hx, gy = T.dore.y - T.hy; if (gx * gx + gy * gy < 30) {
      T.score += PTS.dore; T.nseg = Math.min(CFG.longueurMax, T.nseg + 2); T.fren = CFG.frenesie;
      for (k = 0; k < 12; k++) T.frags.push({ x: T.dore.x, y: T.dore.y, vx: Math.cos(k * 0.52) * 30, vy: Math.sin(k * 0.52) * 30, c: P.jaune, l: 0.5 });
      T.dore = null; T.bombes.length = 0; dire('TIR TRIPLE', 2); sfx('or'); journal('dore');
    } }
    /* se mordre coupe */
    for (k = CFG.mordDes; k < T.nseg; k++) { p = seg(k); var mx = p[0] - T.hx, my = p[1] - T.hy; if (mx * mx + my * my < 7) { couper(k, 'morsure'); break; } }
    if (T.invul > 0) return;
    /* les ennemis : la tête touchée tue, le corps touché est coupé */
    if (F && F.n) for (k = 0; k < F.vivant.length; k++) if (F.vivant[k]) {
      p = posInv(F, k);
      if (touche(T.hx, T.hy, p.x, p.y, IW, IH, 1.5)) { F.vivant[k] = 0; F.n--; boum(p.x + 4, p.y + 3, false); mourir('envahisseur'); return; }
      var cs = coupeCorps(p.x, p.y, IW, IH, 1);
      if (cs) { F.vivant[k] = 0; F.n--; boum(p.x + 4, p.y + 3, false); couper(cs, 'envahisseur'); }
    }
    for (k = T.fleches.length - 1; k >= 0; k--) {
      var fl = T.fleches[k]; if (fl.etat !== 'fonce') continue;
      if (touche(T.hx, T.hy, fl.x - 2, fl.y - 2, 4, 4, 1.5)) { T.fleches.splice(k, 1); boum(fl.x, fl.y, false); mourir('fleche'); return; }
      var c2 = coupeCorps(fl.x - 2, fl.y - 2, 4, 4, 0.5);
      if (c2) { T.fleches.splice(k, 1); boum(fl.x, fl.y, false); couper(c2, 'fleche'); }
    }
    for (k = T.bombes.length - 1; k >= 0; k--) {
      var bo = T.bombes[k];
      if (touche(T.hx, T.hy, bo.x, bo.y, 2, 3, 1.5)) { T.bombes.splice(k, 1); mourir('bombe'); return; }
      var c3 = coupeCorps(bo.x, bo.y, 2, 3, 0.5);
      if (c3) { T.bombes.splice(k, 1); couper(c3, 'bombe'); }
    }
    var s2 = T.souc;
    if (s2) {
      if (touche(T.hx, T.hy, s2.x, s2.y, SW, SH, 1.5)) { mourir('soucoupe'); return; }
      var c4 = coupeCorps(s2.x, s2.y, SW, SH, 1); if (c4) couper(c4, 'soucoupe');
    }
  }
  function coupeCorps(x, y, w, h, m) {
    for (var i = 1; i < T.nseg; i++) { var p = seg(i); if (touche(p[0], p[1], x, y, w, h, m + 1)) return Math.max(3, i); }
    return 0;
  }
  function majPassage(dt) {
    var p = T.pt;
    for (var k = 0; k < T.chaine.length; k++) {
      var c = T.chaine[k]; if (c.fait || p < c.at) continue;
      c.fait = true; T.score += PTS.inv; boum(c.x, c.y, !!c.gros);
    }
    if (p >= 0.9) T.an = Math.min(1987, 1982 + Math.floor((p - 0.9) / 0.2));
    if (p >= CFG.passage) { T.phase = 'fini'; T.an = 1987; journal('fin'); finir(); }
  }
  function majEffets(dt) {
    var i;
    for (i = T.expl.length - 1; i >= 0; i--) { var e = T.expl[i]; e.t += dt; if (e.t >= (e.gros ? 1.0 : 0.32)) T.expl.splice(i, 1); }
    for (i = T.frags.length - 1; i >= 0; i--) {
      var f = T.frags[i]; f.l -= dt; if (f.l <= 0) { T.frags.splice(i, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 40 * dt;
    }
    if (T.shake > 0) T.shake = Math.max(0, T.shake - dt * 5);
  }
  function finir() {
    if (T.finAppele) return; T.finAppele = true;
    var f = T.surFin; T.on = false;
    if (f) { try { f(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('arcade.surFin', e); } }
  }

  /* ================================ le dessin ================================ */
  function draw() {
    if (!T.on && T.phase !== 'fini') return;
    if (!pal() || !G() || !G().buf) return;
    var g = G();
    if (g.W !== T.W || g.H !== T.H) layout();
    if (T.phase === 'fini') { scene87(g, CFG.passage); return; }
    dessiner82();
    agrandir(g);
    if (T.phase === 'passage' && T.pt >= 0.9) melanger(g);
  }
  function dessiner82() {
    var f = Math.floor(T.t * 60), k, p;
    L.fill(P.vide);
    clipTout();
    /* le mur : le cadre de 1976, devenu magenta (le cyan est parti avec le serpent) */
    if (T.phase !== 'passage' || T.pt < 0.9) {
      lrect(T.X0, T.Y0, T.X1 - T.X0 + 1, 1, P.magenta); lrect(T.X0, T.Y1, T.X1 - T.X0 + 1, 1, P.magenta);
      lrect(T.X0, T.Y0, 1, T.Y1 - T.Y0 + 1, P.magenta); lrect(T.X1, T.Y0, 1, T.Y1 - T.Y0 + 1, P.magenta);
      /* des plots de borne aux coins, en jaune */
      lrect(T.X0, T.Y0, 2, 2, P.jaune); lrect(T.X1 - 1, T.Y0, 2, 2, P.jaune); lrect(T.X0, T.Y1 - 1, 2, 2, P.jaune); lrect(T.X1 - 1, T.Y1 - 1, 2, 2, P.jaune);
    }
    /* le message, sous le jeu : le serpent et les menaces passent devant */
    if (T.msg && T.msgT < T.msgDuree) {
      var gros = T.msg === '1982', kk = gros ? 2 : 1, mw = largeur(T.msg, kk), mx = Math.round((T.X0 + T.X1 + 1 - mw) / 2);
      var my = Math.round(T.Y0 + (T.Y1 - T.Y0) * (gros ? 0.36 : 0.56));
      if (!(T.phase === 'jeu' && ((T.msgT * 5) | 0) % 4 === 3)) {
        lrect(mx - 2, my + 1, mw + 4, 7 * kk + 3, P.vide);
        ltexte(T.msg, mx, my, P.jaune, kk);
      }
    }
    clip(T.ix0, T.iy0, T.ix1, T.iy1);
    /* les cellules */
    if (T.food) lspr(CELL[((T.t * 4) | 0) & 1], T.food.x - 1, T.food.y - 1, P.jaune);
    if (T.dore) {
      var d = T.dore, pul = 7 + Math.sin(d.t * 6) * 1.5;
      lspr(DORE, d.x - 3, d.y - 3, P.jaune);
      for (k = 0; k < 4; k++) { var a = d.t * 2.5 + k * 1.5708; lpx(d.x + Math.cos(a) * pul, d.y + Math.sin(a) * pul, P.jaune); }
      if (((d.t * 3) | 0) & 1) ldisc(d.x, d.y, pul + 2, pul + 3, P.jaune, 0.25);
    }
    /* la formation */
    var F = T.F;
    if (F) for (k = 0; k < F.vivant.length; k++) if (F.vivant[k]) {
      p = posInv(F, k); var ty = (F.type + Math.floor(k / F.cols)) & 1;
      lspr(INV[ty][T.anim], p.x, p.y, P.magenta);
    }
    /* les bombes, les flèches (et leur télégraphe en pointillé), la soucoupe */
    for (k = 0; k < T.bombes.length; k++) lspr(BOMBE[((T.bombes[k].t * 8) | 0) & 1], T.bombes[k].x, T.bombes[k].y, P.magenta);
    for (k = 0; k < T.fleches.length; k++) {
      var fl = T.fleches[k];
      if (fl.etat === 'vise') {
        if (((fl.t * 10) | 0) & 1) lline(fl.x, fl.y, fl.x + fl.dx * 40, fl.y + fl.dy * 40, P.magenta, 3);
        fleche(fl, ((fl.t * 8) | 0) & 1 ? P.jaune : P.magenta);
      } else { fleche(fl, P.magenta); lline(fl.x - fl.dx * 4, fl.y - fl.dy * 4, fl.x - fl.dx * 9, fl.y - fl.dy * 9, P.magenta, 2); }
    }
    if (T.souc) {
      var sc = T.souc, cs = sc.flash > 0 ? P.jaune : P.magenta;
      lspr(SOUC, sc.x, sc.y, cs);
      for (k = 0; k < SOUC_FEUX.length; k++) if (((k + T.anim) & 1) === 0) lpx(sc.x + SOUC_FEUX[k][0], sc.y + SOUC_FEUX[k][1], P.jaune);
    }
    /* les tirs */
    for (k = 0; k < T.balles.length; k++) { var b = T.balles[k], bl = 1 / CFG.balle; lpx(b.x, b.y, P.jaune); lpx(b.x - b.vx * bl, b.y - b.vy * bl, P.jaune); }
    /* le serpent (et, au début, la corde qui était le cadre de 1976) */
    clip(T.X0, T.Y0, T.X1 + 1, T.Y1 + 1);
    serpent(f);
    clip(T.ix0, T.iy0, T.ix1, T.iy1);
    /* les explosions : une petite est une étoile de pixels ; une grosse, des anneaux tramés qui s'étendent et se trouent */
    for (k = 0; k < T.expl.length; k++) {
      var e = T.expl[k];
      if (e.gros) {
        var u = e.t / 1.0, r = 4 + u * 34;
        ldisc(e.x, e.y, 0, r * 0.45, P.jaune, Math.max(0, 0.7 - u));
        ldisc(e.x, e.y, r - 3, r, u < 0.5 ? P.jaune : P.magenta, 1 - u);
        ldisc(e.x, e.y, r * 0.62 - 2, r * 0.62, P.magenta, 0.9 - u);
      } else {
        var rr = 1 + e.t * 14, c = e.t < 0.12 ? P.jaune : P.magenta;
        for (var q = 0; q < 8; q++) { var aa = q * 0.7854; lpx(e.x + Math.cos(aa) * rr, e.y + Math.sin(aa) * rr, c); }
        if (e.t < 0.12) { lpx(e.x, e.y, P.jaune); lpx(e.x - 1, e.y, P.jaune); lpx(e.x + 1, e.y, P.jaune); lpx(e.x, e.y - 1, P.jaune); lpx(e.x, e.y + 1, P.jaune); }
      }
    }
    for (k = 0; k < T.frags.length; k++) lpx(T.frags[k].x, T.frags[k].y, T.frags[k].c);
    /* l'interface : le score, les crédits, l'année ; le message au milieu */
    clipTout();
    var hy = Math.max(0, T.Y0 - 9), up = (((T.t * 2) | 0) & 1) || T.phase !== 'jeu';
    var wsc = 0;
    if (up) ltexte('1UP', T.X0, hy, P.jaune);
    wsc = largeur('1UP ') + ltexte(('000000' + T.score).slice(-6), T.X0 + largeur('1UP '), hy, P.jaune);
    var an = String(T.an), wan = largeur(an), xan = T.X1 + 1 - wan;
    ltexte(an, xan, hy, P.jaune);
    var vies = CFG.mortsAvantFin - T.morts, xv = xan - 6 - vies * 5;
    if (xv > T.X0 + wsc + 4) for (k = 0; k < vies; k++) { lrect(xv + k * 5, hy + 4, 3, 3, P.cyan); lpx(xv + k * 5 + 2, hy + 5, P.vide); }
  }
  function fleche(f, c) {
    var tx = f.x + f.dx * 3, ty = f.y + f.dy * 3, nx = -f.dy, ny = f.dx;
    lline(tx, ty, f.x - f.dx * 1.5 + nx * 2.5, f.y - f.dy * 1.5 + ny * 2.5, c);
    lline(tx, ty, f.x - f.dx * 1.5 - nx * 2.5, f.y - f.dy * 1.5 - ny * 2.5, c);
    lline(tx, ty, f.x - f.dx * 3, f.y - f.dy * 3, c);
  }
  function perle(x, y, s, c) {
    var x0 = R0(x - s / 2), y0 = R0(y - s / 2);
    lrect(x0, y0, s, s, c);
    if (s >= 4) { lpx(x0, y0, P.vide); lpx(x0 + s - 1, y0, P.vide); lpx(x0, y0 + s - 1, P.vide); lpx(x0 + s - 1, y0 + s - 1, P.vide); }
  }
  function serpent(f) {
    if (T.phase === 'mort') return;
    if (T.phase === 'passage' && T.pt >= 0.9) return;
    if (T.invul > 0 && ((f >> 2) & 1)) return;
    var k, n = T.nseg;
    /* la corde : le reste de la traîne, un pixel de large */
    if (T.corde > 0) for (k = (n - 1) * CFG.ecart + 1; k < T.trail.length; k++) lpx(T.trail[k][0], T.trail[k][1], P.cyan);
    for (k = n - 1; k >= 1; k--) { var p = seg(k), s = k === n - 1 ? 3 : 4; perle(p[0], p[1], s, P.cyan); }
    /* la tête : un bloc de 6 aux coins coupés, deux yeux de vide du côté où il va */
    var hx = T.hx, hy = T.hy, x0 = R0(hx - 3), y0 = R0(hy - 3);
    lrect(x0, y0 + 1, 6, 4, P.cyan); lrect(x0 + 1, y0, 4, 6, P.cyan);
    var cx = Math.cos(T.cap), cy = Math.sin(T.cap);
    lpx(hx + cx * 1.2 - cy * 1.6 - 0.5, hy + cy * 1.2 + cx * 1.6 - 0.5, P.vide);
    lpx(hx + cx * 1.2 + cy * 1.6 - 0.5, hy + cy * 1.2 - cx * 1.6 - 0.5, P.vide);
  }
  /* les gros pixels : chaque pixel de 1982 devient K × K pixels du tampon ; la secousse décale d'un pixel de 1982 */
  function agrandir(g) {
    var B = g.buf(), W = g.W, H = g.H, K = CFG.K, LW = T.LW, f = Math.floor(T.t * 60);
    var s = Math.round(T.shake), ox = s ? ((f & 1) ? s : -s) : 0, oy = s ? (((f >> 1) & 1) ? s >> 1 : -(s >> 1)) : 0;
    for (var y = 0; y < H; y++) {
      var ly = Math.floor(y / K) - oy, o = y * W;
      if (ly < 0 || ly >= T.LH) { for (var x0 = 0; x0 < W; x0++) B[o + x0] = P.vide; continue; }
      var lo = ly * LW;
      for (var x = 0; x < W; x++) { var lx = Math.floor(x / K) - ox; B[o + x] = (lx >= 0 && lx < LW) ? L[lo + lx] : P.vide; }
    }
  }

  /* ================================ le passage vers 1987 ================================ */
  var A82 = null;
  function melanger(g) {
    var B = g.buf(), W = g.W, H = g.H, n = W * H, p = T.pt;
    if (!A82 || A82.length !== n) A82 = new Uint8Array(n);
    A82.set(B);
    scene87(g, p);
    var t = clamp((p - 0.9) / 0.8, 0, 1), D = N.pal.dither;
    if (t >= 1) return;
    for (var y = 0; y < H; y++) { var o = y * W; for (var x = 0; x < W; x++) if (!D(x, y, t)) B[o + x] = A82[o + x]; }
  }
  /* 1987 : un ciel en bandes tramées, un soleil à rayures, une grille de néon qui défile, le serpent qui y entre.
     La palette entière s'ouvre ; les pixels s'affinent : par blocs de 4, puis de 2, puis 1. */
  function scene87(g, p) {
    var W = g.W, H = g.H, hz = Math.round(H * 0.56), i, y;
    g.rect(0, 0, W, H, P.vide);
    var bandes = [[P.vide, P.nuit, 0.5], [P.nuit, P.nuit, 1], [P.nuit, P.indigo, 0.5], [P.indigo, P.indigo, 1], [P.indigo, P.violet, 0.5], [P.violet, P.magenta, 0.25]];
    for (i = 0; i < bandes.length; i++) {
      var y0 = Math.round(hz * i / bandes.length), y1 = Math.round(hz * (i + 1) / bandes.length);
      g.rect(0, y0, W, y1 - y0, bandes[i][0]); g.ditherRect(0, y0, W, y1 - y0, bandes[i][1], bandes[i][2]);
    }
    /* le soleil */
    var R = Math.round(Math.min(W, H) * 0.24), cx = W >> 1, cy = hz - Math.round(R * 0.3);
    for (var yy = -R; yy <= R; yy++) {
      y = cy + yy; if (y >= hz) break;
      var dx = Math.floor(Math.sqrt(R * R - yy * yy)), c = yy < -R * 0.35 ? P.jaune : yy < R * 0.05 ? P.ambre : P.brasier;
      if (yy > -R * 0.2) { var ep = 1 + Math.floor((yy + R * 0.2) / (R * 0.28)); if (((yy + 4096) % 6) < ep) continue; }
      g.rect(cx - dx, y, 2 * dx + 1, 1, c);
    }
    /* le sol et sa grille */
    g.rect(0, hz, W, H - hz, P.np);
    var off = (p * 1.2) % 1, nl = 9;
    for (i = 0; i < nl; i++) { var fr = (i + off) / nl; y = hz + Math.round((H - hz) * fr * fr); g.rect(0, y, W, 1, i < 2 ? P.magenta : P.violet); }
    for (i = -9; i <= 9; i++) g.line(cx + i * 4, hz, cx + i * Math.round(W / 7), H, P.violet);
    g.rect(0, hz, W, 1, P.rose);
    /* le serpent : il file vers l'horizon, de plus en plus petit */
    var n = 14;
    for (i = n - 1; i >= 0; i--) {
      var u = i / n, z = 0.15 + u * 0.85;
      var sx = cx + Math.sin(p * 3 + u * 5) * W * 0.12 * z, sy = hz + (H - hz) * (0.12 + 0.9 * z * z) - (p - 0.9) * 6;
      g.circ(sx, sy, Math.max(1, Math.round(1 + z * 5)), i === 0 ? P.cyanP : P.cyan);
    }
    /* « 1987 » */
    if (p >= 2.2 && N.spr && N.spr.text) {
      var k = H >= 300 ? 4 : 3, s = null;
      try { s = N.spr.text('1987', { ci: P.rose, echelle: k, contour: P.np }); } catch (e) { s = null; }
      var nn = Math.min(4, Math.floor((p - 2.2) / 0.12) + 1);
      if (s && s.data) {
        var x0 = Math.round((W - s.w) / 2), y2 = Math.max(3, Math.round(hz * (H >= 300 ? 0.18 : 0.03))), wv = Math.round(s.w * nn / 4);
        for (var j = 0; j < s.h; j++) for (var q = 0; q < wv; q++) { var v = s.data[j * s.w + q]; if (v) g.px(x0 + q, y2 + j, v); }
      }
    }
    /* les pixels s'affinent */
    var bloc = p < 1.35 ? 4 : p < 1.9 ? 2 : 1;
    if (bloc > 1) mosaique(g, bloc);
  }
  function mosaique(g, b) {
    var B = g.buf(), W = g.W, H = g.H;
    for (var y = 0; y < H; y += b) for (var x = 0; x < W; x += b) {
      var c = B[y * W + x], ye = Math.min(H, y + b), xe = Math.min(W, x + b);
      for (var yy = y; yy < ye; yy++) { var o = yy * W; for (var xx = x; xx < xe; xx++) B[o + xx] = c; }
    }
  }

  N.arcade = {
    start: start, update: update, draw: draw,
    actif: function () { return T.on; },
    phase: function () { return T.phase; },
    stop: function () { T.on = false; T.phase = 'fini'; T.finAppele = true; },
    skip: function () { if (T.on && (T.phase === 'boot' || T.phase === 'jeu' || T.phase === 'mort')) passage('saut'); },
    state: function () {
      var F = T.F, bb = boiteFormation(), sc = T.souc;
      return { phase: T.phase, t: +T.t.toFixed(2), pt: +T.pt.toFixed(2), vt: +T.vt.toFixed(2), section: T.sec, tempo: tempo(), score: T.score,
        morts: T.morts, nseg: T.nseg, tete: [T.hx, T.hy], cap: T.cap, vitesse: vitesse(), invul: T.invul > 0,
        arene: { x0: T.ix0, y0: T.iy0, x1: T.ix1, y1: T.iy1 }, K: CFG.K,
        food: T.food ? { x: T.food.x, y: T.food.y } : null, dore: T.dore ? { x: T.dore.x, y: T.dore.y } : null, frenesie: T.fren > 0,
        soucoupe: sc ? { x: sc.x, y: sc.y, w: SW, h: SH, vie: sc.vie, etat: sc.etat, vx: sc.etat === 'vole' ? sc.dir * CFG.soucoupeV : 0, vy: sc.etat === 'vole' ? 0 : sc.vy } : null,
        sens: T.sens,
        formation: F ? { n: F.n, boite: bb } : null,
        fleches: T.fleches.map(function (f) { return { x: f.x, y: f.y, dx: f.dx, dy: f.dy, etat: f.etat }; }),
        bombes: T.bombes.map(function (b) { return { x: b.x, y: b.y }; }),
        compte: { tues: T.compte.tues, mange: T.compte.mange, coupes: T.compte.coupes, grosses: T.compte.grosses, tirs: T.compte.tirs, formations: T.vagues },
        nouveautes: T.nouv.slice(), premiereExplosion: T.premiereExplosion,
        audio: !!A.ctx, musique: { section: A.sec, pas: A.step, notes: { pulse: A.notes.pulse, tri: A.notes.tri, bruit: A.notes.bruit } },
        journal: T.journal.slice() };
    },
    CFG: CFG
  };
})();
