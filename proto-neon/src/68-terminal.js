/* ===== 68-terminal.js — N.terminal : l'époque 1976, le snake « bidon » qui en a sous le talon =====

   refonte/VISION-PROGRESSION.md § 1 (époque 1976) et « La musique du début » : un snake de terminal, deux couleurs,
   case par case, bips binaires — mais troublant dès les premières secondes, pour que la joueuse ne quitte pas.
   Chaque cellule mangée ajoute UNE menace, à l'image et au son ; à six, la grille se fissure et le jeu se révèle.

     menace 1  la sous-basse : un grondement sous les bips, la grille tremble sur les temps
     menace 2  une ombre immense passe SOUS la grille (vue à travers les cases vides), le tempo accélère
     menace 3  glitchs : une bande d'image se déchire, la cellule clignote une image en magenta, les bips bégaient
     menace 4  l'ombre ouvre un œil ; une fente de néon (la vraie palette) passe une image en bas de l'écran
     menace 5  le terminal tape seul ; les notes de Neon Velocity percent sous les bips ; une grosse caisse étouffée
     6 cellules (ou 2 morts : « NON. PAS ENCORE. »)  LA FISSURE : la grille craque, les cases tombent, la couleur entre.

   RÈGLES DE CETTE ÉPOQUE : le mur tue ; se mordre COUPE (la règle du snake de 2975, même en 1976) ; mourir ne fait
   pas tout recommencer : la menace atteinte est gardée. Une partie de 1976 dure de 35 à 60 s.

   LA MUSIQUE est écrite ici, pour cette époque seulement (consigne : « une musique appropriée à chaque fois ») : une
   voix carrée, deux notes, 92 BPM, sur le contexte audio de N.music (N.music.context(), déjà débloqué au premier
   geste) et respectant sa coupure (N.music.muted). Le serpent avance sur les doubles croches : il respire avec elle,
   et le tempo monte avec la menace (92 → 104 → 116 → 128), puis la fissure lance une montée et un impact.

   INTERFACE (N.terminal), rien ne s'appelle au chargement :
       start({ surFin, graine })   lance l'époque (le jeu principal doit être à l'arrêt) ; surFin() à la fin
       update(dt) / draw()         à appeler à la place du jeu tant que actif() ; draw remplit tout le tampon
       actif() phase() menace()    'boot' | 'jeu' | 'mort' | 'fissure' | 'fini'
       stop()                      coupe tout, sans appeler surFin ;   skip()  saute à la fissure
       state()                     instantané pour les essais
   Le branchement dans la partie (79-jeu.js) et le silence de la piste principale pendant l'époque sont demandés à la
   cheffe d'orchestre (refonte/lots/demandes.md) : ce module ne touche à aucun autre fichier.

   RÈGLES TENUES ICI : couleurs par N.pal.i seulement ; deux couleurs (vide, cyan) hors des menaces voulues ; aucun
   Math.random (générateur local à graine) ; aucune horloge lue (le temps vient de dt, la musique de son contexte) ;
   flashs bornés : la fente de néon couvre moins de 6 % de l'écran, une image, au plus toutes les 2,2 s. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  /* ================================ réglages (→ N.R.terminal) ================================ */
  var CFG = {
    objectif: 6, mortsAvantFissure: 2, longueurDepart: 4, boot: 1.6, mort: 0.9, fissure: 2.8,
    tempos: [92, 92, 104, 116, 116, 128, 128],        // BPM selon la menace ; le serpent avance sur les doubles croches
    neonPeriode: 2.2, neonHauteur: 0.055
  };
  var MSG = { 2: '...?', 3: 'ÇA BOUGE SOUS LA GRILLE', 4: "TU N'ES PAS SEUL", 5: 'AN 2975. ILS ARRIVENT.' };

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

  /* générateur local à graine : le hasard de cette époque ne consomme pas celui du jeu */
  var rs = 1976;
  function rnd() { rs = (rs * 1664525 + 1013904223) % 4294967296; return rs / 4294967296; }

  /* ================================ l'état ================================ */
  var T = { on: false, phase: 'fini', t: 0, pt: 0, menace: 0, manges: 0, morts: 0, score: 0,
    cell: 10, cols: 30, rows: 14, ox: 0, oy: 0, W: 0, H: 0,
    snake: [], dir: 0, file: [], pousse: 0, food: null, acc: 0, pas: 0.16,
    msg: '', msgT: 0, ombre: { x: 0, y: 0, vx: 0, t: 0 }, tremble: 0, neonT: 0, glitchT: 0, foodMag: 0,
    cracks: [], frags: [], chute: false, surFin: null, finAppele: false, journal: [] };
  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  function journal(e) { T.journal.push({ e: e, t: +T.t.toFixed(2) }); if (T.journal.length > 64) T.journal.shift(); }

  function layout() {
    var g = G(), s = S(), sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 };
    var W = g.W | 0, H = g.H | 0, x0 = sf.l | 0, y0 = sf.t | 0, sw = W - x0 - (sf.r | 0), sh = H - y0 - (sf.b | 0);
    var cell = Math.max(7, Math.floor(Math.min(sw, sh) / 14));
    var top = cell + 4;                                             // une rangée pour le score, en haut
    var cols = Math.max(10, Math.floor((sw - 4) / cell)), rows = Math.max(8, Math.floor((sh - top - 4) / cell));
    var first = T.W === 0;
    T.W = W; T.H = H; T.cell = cell;
    if (first || cols !== T.cols || rows !== T.rows) { T.cols = cols; T.rows = rows; if (!first) placerSerpent(); }
    T.ox = x0 + Math.floor((sw - cols * cell) / 2);
    T.oy = y0 + top + Math.floor((sh - top - rows * cell) / 2);
  }
  function placerSerpent() {
    var y = Math.floor(T.rows / 2), x = Math.min(T.cols - 2, Math.max(CFG.longueurDepart + 1, Math.floor(T.cols / 3)));
    T.snake = []; for (var i = 0; i < CFG.longueurDepart; i++) T.snake.push([x - i, y]);
    T.dir = 0; T.file.length = 0; T.pousse = 0;
    if (!T.food || occupe(T.food[0], T.food[1])) poserFood();
  }
  function occupe(x, y) { for (var i = 0; i < T.snake.length; i++) if (T.snake[i][0] === x && T.snake[i][1] === y) return true; return false; }
  function poserFood() {
    var h = T.snake[0] || [0, 0];
    for (var k = 0; k < 300; k++) {
      var x = 1 + Math.floor(rnd() * (T.cols - 2)), y = 1 + Math.floor(rnd() * (T.rows - 2));
      if (!occupe(x, y) && Math.abs(x - h[0]) + Math.abs(y - h[1]) > 4) { T.food = [x, y]; return; }
    }
    T.food = [1, 1];
  }
  function dire(s) { T.msg = s; T.msgT = 0; journal('message ' + s); }

  /* ================================ la musique de 1976 ================================ */
  var A = { ctx: null, out: null, delay: null, next: 0, step: 0, t0: -1, montee: false };
  function audio() {
    if (A.ctx) return A.ctx;
    var c = null;
    try { c = N.music && N.music.context ? N.music.context() : null; } catch (e) { c = null; }
    if (!c || !c.createOscillator) return null;
    A.ctx = c;
    A.out = c.createGain(); A.out.gain.value = 0.9; A.out.connect(c.destination);
    /* l'écho n'entre en jeu qu'à la menace 5 : un retour de croche pointée */
    A.delay = c.createDelay(1); A.delay.delayTime.value = 0.24;
    var fb = c.createGain(); fb.gain.value = 0.32; A.delay.connect(fb); fb.connect(A.delay);
    A.echo = c.createGain(); A.echo.gain.value = 0; A.delay.connect(A.echo); A.echo.connect(A.out);
    return c;
  }
  function muet() { try { return !!(N.music && N.music.muted && (N.music.muted('musique') || N.music.muted() === true)); } catch (e) { return false; } }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function bip(t, m, d, v, type) {                       // une note carrée sèche, sans attaque douce : 1976
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(hz(m), t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.setValueAtTime(v, t + d * 0.8); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(A.out); if (T.menace >= 5) g.connect(A.delay);
    o.start(t); o.stop(t + d + 0.02);
  }
  function sousBasse(t, d, v) {                          // le moteur sous le plancher
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(41, t); o.frequency.linearRampToValueAtTime(37, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * 0.4); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(A.out); o.start(t); o.stop(t + d + 0.05);
  }
  function caisse(t, v) {                                // la grosse caisse étouffée, de l'autre côté du mur
    var c = A.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 220;
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
    o.connect(f); f.connect(g); g.connect(A.out); o.start(t); o.stop(t + 0.35);
  }
  function souffle(t, d, v, f0, f1) {                    // bruit filtré : montée de la fissure, impact
    var c = A.ctx, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < n; i++) x[i] = rnd() * 2 - 1;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(v, t); g.gain.linearRampToValueAtTime(0, t + d);
    s.connect(f); f.connect(g); g.connect(A.out); s.start(t); s.stop(t + d);
  }
  /* le motif : deux notes bêtes (do, sol) ; à partir de la menace 5, une mesure sur deux, les notes de Neon Velocity
     (ré mineur : ré, fa, la, sol) prennent la place des bips, un peu plus fort à chaque mesure */
  var BETE = [72, 0, 67, 0, 72, 0, 67, 67];
  var NEON = [74, 0, 77, 0, 81, 0, 79, 77];
  function noteDuPas(i) {
    var mesure = Math.floor(i / 8), k = i % 8;
    if (T.menace >= 5 && (mesure & 1)) return { m: NEON[k], v: 0.06 + Math.min(0.06, 0.01 * (mesure % 8)) };
    var m = BETE[k];
    if (T.menace >= 2 && k === 6 && (mesure % 4) === 3) m = 75;                   // une note de travers, de temps en temps
    return { m: m, v: 0.07 };
  }
  function ordonnancer() {
    var c = audio(); if (!c || c.state !== 'running' || muet() || T.phase === 'fini') return;
    var croche = 60 / tempo() / 2;
    if (A.next < c.currentTime) A.next = c.currentTime + 0.05;
    while (A.next < c.currentTime + 0.15) {
      var t = A.next, i = A.step;
      if (T.phase === 'fissure') {
        if (!A.montee) { A.montee = true; souffle(t, 1.4, 0.28, 300, 4200); for (var r = 0; r < 12; r++) bip(t + r * 0.11, 60 + r * 2, 0.09, 0.05 + r * 0.004); souffle(t + 1.45, 0.9, 0.5, 900, 80); caisse(t + 1.45, 0.9); sousBasse(t + 1.45, 1.6, 0.5); }
      } else {
        var n = noteDuPas(i);
        if (n.m) {
          bip(t, n.m, croche * 0.55, n.v);
          if (T.menace >= 3 && rnd() < 0.12) { bip(t + croche * 0.25, n.m + 12, croche * 0.2, n.v * 0.7); journal('begaiement'); }
        }
        if (T.menace >= 1 && i % 16 === 0) sousBasse(t, croche * 7, 0.18 + 0.05 * Math.min(4, T.menace));
        if (T.menace >= 5 && i % 4 === 0) caisse(t, 0.35);
        if (T.menace >= 5 && i % 32 === 16 && N.music && N.music.sfx) { try { N.music.sfx('battement'); } catch (e) {} }
      }
      if (i % 2 === 0) T.tremble = T.menace >= 1 ? 2 : 0;          // la grille tremble sur les temps (en images)
      A.step++; A.next += croche;
    }
    if (A.echo) A.echo.gain.value = T.menace >= 5 ? 0.5 : 0;
  }
  function tempo() { return CFG.tempos[Math.min(CFG.tempos.length - 1, T.menace)]; }

  /* ================================ le jeu ================================ */
  function start(o) {
    if (!pal()) return false;
    o = o || {};
    rs = (o.graine >>> 0) || 1976;
    T.on = true; T.phase = 'boot'; T.t = 0; T.pt = 0; T.menace = 0; T.manges = 0; T.morts = 0; T.score = 0;
    T.W = 0; T.food = null; T.chute = false; T.tremble = 0; T.acc = 0; T.cracks.length = 0; T.frags.length = 0; T.msg = ''; T.msgT = 0; T.neonT = 0; T.glitchT = 0; T.foodMag = 0;
    T.surFin = typeof o.surFin === 'function' ? o.surFin : null; T.finAppele = false; T.journal.length = 0;
    A.step = 0; A.next = 0; A.montee = false;
    layout(); placerSerpent();
    T.ombre = { x: -0.3, y: 0.55, vx: 0.035, t: 0 };
    dire('> RUN SNAKE.BAS');
    journal('debut');
    return true;
  }
  function entree() {
    var inp = S().input; if (!inp || !(inp.mag > 0.35)) return;
    var ax = Math.abs(inp.x), ay = Math.abs(inp.y), d;
    if (Math.max(ax, ay) < 0.5) return;
    d = ax >= ay ? (inp.x > 0 ? 0 : 2) : (inp.y > 0 ? 1 : 3);
    var der = T.file.length ? T.file[T.file.length - 1] : T.dir;
    if (d !== der && (d + 2) % 4 !== der && T.file.length < 2) T.file.push(d);
  }
  function pas() {
    while (T.file.length) { var d = T.file.shift(); if ((d + 2) % 4 !== T.dir) { T.dir = d; break; } }
    var h = T.snake[0], v = DIRS[T.dir], nx = h[0] + v[0], ny = h[1] + v[1];
    if (nx < 0 || ny < 0 || nx >= T.cols || ny >= T.rows) { mourir(); return; }
    /* se mordre coupe la queue au point mordu, sans tuer (la règle de SNAKE 2975) */
    for (var k = 1; k < T.snake.length - (T.pousse > 0 ? 0 : 1); k++) {
      if (T.snake[k][0] === nx && T.snake[k][1] === ny) {
        var tombe = T.snake.splice(k);
        for (var q = 0; q < tombe.length; q++) frag(tombe[q][0], tombe[q][1], P.cyan, 2);
        journal('morsure -' + tombe.length); break;
      }
    }
    T.snake.unshift([nx, ny]);
    if (T.pousse > 0) T.pousse--; else T.snake.pop();
    if (T.food && nx === T.food[0] && ny === T.food[1]) manger();
  }
  function manger() {
    T.manges++; T.pousse += 1; T.score += 10;
    T.menace = Math.min(5, Math.max(T.menace, T.manges));
    journal('mange ' + T.manges + ' menace ' + T.menace);
    if (MSG[T.menace]) dire(MSG[T.menace]);
    if (T.manges >= CFG.objectif) { fissure('objectif'); return; }
    poserFood();
  }
  function mourir() {
    T.morts++; T.phase = 'mort'; T.pt = 0;
    var h = T.snake[0]; frag(h[0], h[1], P.cyan, 6);
    journal('mort ' + T.morts);
    if (T.morts >= CFG.mortsAvantFissure) { dire('NON. PAS ENCORE.'); T.menace = 5; }
    else { dire('GAME OVER'); T.menace = Math.min(5, T.menace + 1); }
  }
  function fissure(pourquoi) {
    T.phase = 'fissure'; T.pt = 0; T.menace = 5;
    dire('LA GRILLE NE TIENT PLUS');
    journal('fissure ' + pourquoi);
    var h = T.snake[0] || [T.cols >> 1, T.rows >> 1];
    for (var i = 0; i < 7; i++) T.cracks.push({ x: h[0] + 0.5, y: h[1] + 0.5, a: i * 0.9 + rnd() * 0.6, pts: [[h[0] + 0.5, h[1] + 0.5]], c: [P.jaune, P.ambre, P.magenta, P.brasier][i & 3] });
  }
  function frag(cx, cy, c, n) {
    for (var i = 0; i < n; i++) {
      var a = rnd() * 6.283, v = 2 + rnd() * 6;
      T.frags.push({ x: cx + 0.5, y: cy + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, c: c, l: 0.6 + rnd() * 0.6 });
    }
  }

  function update(dt) {
    if (!T.on || !pal()) return;
    if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
    var s = S(); if (s.paused) return;
    T.t += dt; T.pt += dt; T.msgT += dt;
    if (G() && (G().W !== T.W || G().H !== T.H)) layout();
    ordonnancer();
    T.pas = 60 / tempo() / 4;
    if (T.phase === 'boot') { if (T.pt >= CFG.boot) { T.phase = 'jeu'; T.pt = 0; journal('jeu'); } }
    else if (T.phase === 'jeu') {
      entree();
      T.acc += dt;
      while (T.acc >= T.pas && T.phase === 'jeu') { T.acc -= T.pas; pas(); }
    } else if (T.phase === 'mort') {
      if (T.pt >= CFG.mort) {
        if (T.morts >= CFG.mortsAvantFissure) fissure('morts');
        else { placerSerpent(); T.phase = 'jeu'; T.pt = 0; T.acc = 0; }
      }
    } else if (T.phase === 'fissure') {
      majFissure(dt);
      if (T.pt >= CFG.fissure) { T.phase = 'fini'; journal('fin'); finir(); }
    }
    /* l'ombre sous la grille dérive lentement de gauche à droite, puis revient */
    if (T.menace >= 2) { T.ombre.x += T.ombre.vx * dt; T.ombre.t += dt; if (T.ombre.x > 1.3) { T.ombre.x = -0.3; T.ombre.y = 0.3 + rnd() * 0.5; } }
    for (var i = T.frags.length - 1; i >= 0; i--) {
      var f = T.frags[i]; f.l -= dt; if (f.l <= 0) { T.frags.splice(i, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 14 * dt;
    }
    if (T.tremble > 0 && T.menace < 1) T.tremble = 0;
  }
  function majFissure(dt) {
    for (var i = 0; i < T.cracks.length; i++) {
      var c = T.cracks[i]; if (T.pt > 1.4) continue;
      c.a += (rnd() - 0.5) * 1.2;
      c.x += Math.cos(c.a) * dt * 14; c.y += Math.sin(c.a) * dt * 14;
      c.pts.push([c.x, c.y]);
    }
    /* à 1,2 s, les cases du serpent et du bord se détachent et tombent, en couleur */
    if (T.pt >= 1.2 && !T.chute) {
      T.chute = true;
      var C = [P.magenta, P.ambre, P.jaune, P.violet, P.rose, P.brasier];
      for (var k = 0; k < T.snake.length; k++) frag(T.snake[k][0], T.snake[k][1], k === 0 ? P.cyan : C[k % C.length], 3);
      for (var x = 0; x < T.cols; x += 2) { frag(x, -1, C[x % C.length], 1); frag(x, T.rows, C[(x + 3) % C.length], 1); }
      T.snake.length = 0;
    }
  }
  function finir() {
    if (T.finAppele) return; T.finAppele = true;
    var f = T.surFin; T.on = false;
    if (f) { try { f(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('terminal.surFin', e); } }
  }

  /* ================================ le dessin ================================ */
  function txt(str, k, ci) {
    if (N.spr && N.spr.text) { try { return N.spr.text(str, { ci: ci, echelle: k }); } catch (e) {} }
    return null;
  }
  function ecrire(str, x, y, k, ci, n) {
    var s = txt(n === undefined ? str : str.slice(0, n), k, ci); if (s && s.data) G().blit(s, x, y);
    return s;
  }
  function largeur(str, k) { var s = txt(str, k, P.cyan); return s ? s.w : str.length * 6 * k; }
  function cellRect(x, y, inset, c, dx) {
    var C = T.cell; G().rect(T.ox + (dx | 0) + x * C + inset, T.oy + y * C + inset, C - 2 * inset, C - 2 * inset, c);
  }

  function draw() {
    if (!T.on && T.phase !== 'fini') return;
    if (!pal() || !G() || !G().buf) return;
    var g = G(), W = g.W, H = g.H, C = T.cell, f = Math.floor(T.t * 60);
    if (W !== T.W || H !== T.H) layout();
    var fis = T.phase === 'fissure' ? Math.min(1, T.pt / CFG.fissure) : 0;
    /* le fond : le vide ; pendant la fissure, la couleur monte par le tramage */
    g.rect(0, 0, W, H, P.vide);
    if (fis > 0.35) g.ditherRect(0, 0, W, H, fis > 0.7 ? P.violet : P.indigo, Math.min(1, (fis - 0.35) * 2.2));
    var dx = 0;
    if (T.tremble > 0) { dx = (f & 1) ? 1 : -1; T.tremble--; }
    if (T.phase === 'fissure' && T.pt < 1.4) dx = ((f >> 1) & 1) ? 2 : -2;

    /* l'ombre sous la grille : on ne la voit qu'à travers les cases vides (dessinée avant tout le reste) */
    if (T.menace >= 2 && T.phase !== 'fissure') {
      var sx = T.ombre.x * W, sy = T.oy + T.ombre.y * T.rows * C, R = Math.max(W, H) * 0.32;
      g.ditherCirc(sx, sy, R, P.nuit, 0.55);
      g.ditherCirc(sx, sy, R * 0.6, P.ardoise, 0.35);
      if (T.menace >= 4) {                                    // l'œil s'ouvre par moments
        var ouvert = Math.sin(T.ombre.t * 0.9) > 0.55;
        if (ouvert) { g.ditherCirc(sx, sy - R * 0.1, R * 0.12, P.sang, 0.6); g.ditherCirc(sx, sy - R * 0.1, R * 0.04, P.brasier, 0.4); }
      }
    }

    /* le cadre du terminal : un rang de blocs, en cyan */
    if (!T.chute) {
      var bx = T.ox + dx - 2, by = T.oy - 2, bw = T.cols * C + 4, bh = T.rows * C + 4;
      g.rect(bx, by, bw, 1, P.cyan); g.rect(bx, by + bh - 1, bw, 1, P.cyan); g.rect(bx, by, 1, bh, P.cyan); g.rect(bx + bw - 1, by, 1, bh, P.cyan);
      /* les points de phosphore aux coins des cases */
      for (var gy = 1; gy < T.rows; gy++) for (var gx = 1; gx < T.cols; gx++) if (((gx + gy) & 3) === 0) g.px(T.ox + dx + gx * C, T.oy + gy * C, P.nuit);
    }

    /* la cellule à manger : un carré qui clignote ; menace 3 : une image en magenta, de temps en temps */
    if (T.food && (T.phase === 'jeu' || T.phase === 'boot' || T.phase === 'mort')) {
      var mag = T.menace >= 3 && (f % 97) === 0;
      var plein = ((T.t * 2.5) | 0) & 1;
      if (plein) cellRect(T.food[0], T.food[1], 2, mag ? P.magenta : P.cyan, dx);
      else { cellRect(T.food[0], T.food[1], 2, mag ? P.magenta : P.cyan, dx); cellRect(T.food[0], T.food[1], 3, P.vide, dx); }
    }

    /* le serpent : des blocs cyan pleins ; à la mort, il clignote */
    var cache = T.phase === 'mort' && ((T.pt * 10) | 0) & 1;
    if (!cache) for (var i = T.snake.length - 1; i >= 0; i--) {
      var sg = T.snake[i];
      cellRect(sg[0], sg[1], 1, P.cyan, dx);
      if (i === 0) {                                           // deux yeux de vide, du côté où il va
        var v = DIRS[T.dir], cx = T.ox + dx + sg[0] * C + (C >> 1) + v[0] * (C >> 2), cy = T.oy + sg[1] * C + (C >> 1) + v[1] * (C >> 2);
        g.px(cx - v[1] * 2, cy + v[0] * 2, P.vide); g.px(cx + v[1] * 2, cy - v[0] * 2, P.vide);
      }
    }

    /* les fissures */
    for (var c = 0; c < T.cracks.length; c++) {
      var cr = T.cracks[c], pts = cr.pts;
      for (var p = 1; p < pts.length; p++) g.line(T.ox + dx + pts[p - 1][0] * C, T.oy + pts[p - 1][1] * C, T.ox + dx + pts[p][0] * C, T.oy + pts[p][1] * C, cr.c);
    }
    /* les éclats */
    for (var q = 0; q < T.frags.length; q++) { var fr = T.frags[q]; g.rect(T.ox + fr.x * C - 1, T.oy + fr.y * C - 1, Math.max(2, C >> 2), Math.max(2, C >> 2), fr.c); }

    /* le score et l'année, en haut, comme un terminal */
    var k = C >= 16 ? 2 : 1, ty = T.oy - C - 2;
    ecrire('SCORE ' + ('0000' + T.score).slice(-4), T.ox, Math.max(1, ty), k, P.cyan);
    var an = T.menace >= 5 && (f % 41) < 3 ? '2975' : '1976';           // l'année vacille
    ecrire(an, T.ox + T.cols * C - largeur(an, k), Math.max(1, ty), k, an === '2975' ? P.magenta : P.cyan);

    /* le message, tapé lettre à lettre au milieu ; à la menace 5, certaines lettres virent au magenta une image */
    if (T.msg) {
      var n = Math.min(T.msg.length, Math.floor(T.msgT / 0.05) + 1), mw = largeur(T.msg, k);
      var mx = Math.round(T.ox + (T.cols * C - mw) / 2), my = T.oy + Math.round(T.rows * C * 0.72);
      var visible = T.msgT < 3.2 || T.phase !== 'jeu';
      if (visible) {
        g.rect(mx - 3, my - 2, mw + 6, 7 * k + 4, P.vide);
        ecrire(T.msg, mx, my, k, (T.menace >= 5 && (f % 29) < 2) ? P.magenta : P.cyan, n);
      }
    }

    /* menace 3 : une bande de l'image se déchire (décalage de rangées), une image de temps en temps */
    if (T.menace >= 3 && T.phase === 'jeu' && (f % 53) === 0) dechirer(g, Math.floor(rnd() * (H - 12)), 4 + Math.floor(rnd() * 8), 3 + Math.floor(rnd() * 6));
    /* menace 4 : la fente de néon — une image de la vraie palette passe en bas de l'écran */
    if (T.menace >= 4 && T.phase === 'jeu') {
      T.neonT += 1 / 60;
      if (T.neonT >= CFG.neonPeriode) { T.neonT = 0; fente(g); journal('neon'); }
    }
  }
  function dechirer(g, y0, h, d) {
    var B = g.buf(), W = g.W, H = g.H;
    for (var y = y0; y < Math.min(H, y0 + h); y++) {
      var o = y * W;
      for (var x = W - 1; x >= d; x--) B[o + x] = B[o + x - d];
    }
  }
  function fente(g) {
    var W = g.W, H = g.H, h = Math.max(4, Math.round(H * CFG.neonHauteur)), y0 = H - h - 2;
    var img = N.art && N.art.get ? N.art.get('horizon') : null;
    if (img && img.data) {
      var B = g.buf(), sy0 = Math.max(0, Math.round(img.h * 0.45));
      for (var y = 0; y < h; y++) for (var x = 0; x < W; x++) {
        var c = img.data[Math.min(img.h - 1, sy0 + y) * img.w + (x % img.w)];
        if (c && c !== P.cyan && c !== P.cyanP) B[(y0 + y) * W + x] = c;
      }
    } else {
      var C = [P.magenta, P.ambre, P.jaune, P.violet];
      for (var b = 0; b < h; b++) g.rect(0, y0 + b, W, 1, C[b % C.length]);
    }
  }

  N.terminal = {
    start: start, update: update, draw: draw,
    actif: function () { return T.on; },
    phase: function () { return T.phase; },
    menace: function () { return T.menace; },
    stop: function () { T.on = false; T.phase = 'fini'; T.finAppele = true; },
    skip: function () { if (T.on && T.phase !== 'fissure' && T.phase !== 'fini') fissure('saut'); },
    state: function () {
      return { phase: T.phase, t: +T.t.toFixed(2), menace: T.menace, manges: T.manges, morts: T.morts, score: T.score,
        len: T.snake.length, dir: T.dir, tete: T.snake[0] ? T.snake[0].slice() : null, food: T.food ? T.food.slice() : null,
        cols: T.cols, rows: T.rows, cell: T.cell, tempo: tempo(), audio: !!A.ctx, journal: T.journal.slice() };
    },
    CFG: CFG
  };
})();
