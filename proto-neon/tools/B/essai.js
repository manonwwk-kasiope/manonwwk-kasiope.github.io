/* Banc d'essai du lot B (monde, caméra, décor, VOL). Injecté après le bundle par construire.mjs.
   Il prend la place de N.game : le décor SEUL, une caméra qui suit une tête qui se promène dans le monde de
   1 024 × 512 px, le passage d'un quartier à l'autre, et LE VOL. Rien de ce fichier n'entre dans le jeu.

   Paramètres d'adresse :
     ?essai=decor (défaut) | vol | plongee   le banc
     &q=docks|artere|centrale|ciel|tours|coeur|eclipse    quartier de départ        &e=calme|montee|chaos|...
     &auto=0                              ne change pas de quartier tout seul (sinon un toutes les 7 s)
     &parcours=promenade|murs|fixe        la tête : promenade lente, le long des quatre murs, immobile
     &c=0..1                              (parcours=fixe) position verticale de la caméra
   Clavier : 1 à 7 le quartier, C M H I O V l'état (calme, montée, chaos, inversion, colosse, victoire), F éclair, W fenêtres, G grille, T travelling, Espace VOL.
   window.__B : q(nom), e(nom), tete, stats() — pour les mesures. */
(function () {
  'use strict';
  var N = window.__N, S = window.__S;
  if (!N || !S || !N.gfx || !N.decor) { try { console.error('essai.js : modules absents'); } catch (x) {} return; }
  var P = new URLSearchParams(location.search);
  var mode = P.get('essai') || 'decor';
  var auto = P.get('auto') !== '0';
  var parcours = P.get('parcours') || 'promenade';
  var QS = N.decor.QUARTIERS, ES = ['calme', 'montee', 'chaos', 'inversion', 'colosse', 'victoire'];
  var PARQ = { docks: 'calme', artere: 'montee', centrale: 'montee', ciel: 'calme', tours: 'chaos', coeur: 'chaos', eclipse: 'colosse' };

  S.phase = 'essai';
  if (N.intro && N.intro.stop) { try { N.intro.stop(); } catch (e) {} }
  var head = { x: 300, y: 250, ang: 0, vit: 68 };
  var T = 0, qi = Math.max(0, QS.indexOf(P.get('q') || 'docks')), tq = 0, hist = [];
  var cout = [], coutVol = [], label = null;
  var ui = document.getElementById('ui');
  if (ui) { label = document.createElement('div'); label.style.cssText = 'position:absolute;left:8px;top:6px;color:#fffce8;text-shadow:0 0 3px #01012b;font:11px ui-monospace,monospace;white-space:pre'; ui.appendChild(label); }

  function setQ(nom) { qi = Math.max(0, QS.indexOf(nom)); N.decor.quartier(QS[qi]); }
  function setE(nom) { N.decor.etat(nom); }

  function pos(t) {
    if (parcours === 'fixe') { var c = +(P.get('c') || 0.5); return { x: 512, y: 80 + c * 350 }; }
    if (parcours === 'murs') {
      /* le long des quatre murs, à 9 px, à la vitesse de croisière : le parcours du critère « tête dans le cadre » */
      var per = 2 * (1024 - 18) + 2 * (512 - 18), s = (t * 68) % per, m = 9;
      if (s < 1024 - 18) return { x: m + s, y: m };
      s -= 1024 - 18; if (s < 512 - 18) return { x: 1024 - m, y: m + s };
      s -= 512 - 18; if (s < 1024 - 18) return { x: 1024 - m - s, y: 512 - m };
      s -= 1024 - 18; return { x: m, y: 512 - m - s };
    }
    return { x: 512 + 400 * Math.sin(t * 0.23), y: 256 + 215 * Math.sin(t * 0.31 + 1) };
  }
  function avancer(dt) {
    T += dt;
    var a = pos(T), b = pos(T + 0.02);
    head.x = a.x; head.y = a.y;
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    head.ang = Math.atan2(dy, dx); head.vit = Math.min(140, d / 0.02);
    if (hist.length === 0 || (T - hist[hist.length - 1].t) > 0.05) { hist.push({ x: head.x, y: head.y, t: T }); if (hist.length > 40) hist.shift(); }
  }

  N.world.reset();
  N.decor.reset(); N.decor.build();
  setQ(QS[qi]); N.decor.quartier(QS[qi]); N.decor.etat(P.get('e') || PARQ[QS[qi]]);
  if (!N.joueuse) N.joueuse = { tete: head };          // l'alerte de proximité du plateau lit N.joueuse.tete
  N.cam.suit(head); N.cam.reset(512, 256);
  var phaseVol = 0, volPaire = 0;
  var PAIRES = [['docks', 'artere'], ['artere', 'centrale'], ['centrale', 'ciel'], ['ciel', 'tours'], ['tours', 'coeur']];

  function etatTexte() { return N.decor.quartier() + ' / ' + N.decor.etat() + '  cam ' + N.cam.x + ',' + N.cam.y + '  horizon ' + N.decor.horizon(); }

  N.game = {
    reset: function () {}, tension: function () { return 0; }, drawTop: function () {},
    etat: function () { return mode === 'vol' && N.vol && N.vol.actif && N.vol.actif() ? 'vol' : 'jeu'; },
    update: function (dt) {
      var n = N.horloge.image(dt);
      for (var k = 0; k < n; k++) {
        var d = N.horloge.avancer();
        if (mode === 'vol' && N.vol && N.vol.actif()) { N.vol.update(d); continue; }
        if (mode === 'plongee') { N.intro.plongee.update(d); continue; }
        avancer(d);
        N.cam.update(d);
      }
      if (mode === 'vol' && N.vol && !N.vol.actif() && N.horloge.t() > 0.3) {
        var pr = PAIRES[volPaire % PAIRES.length]; volPaire++;
        N.decor.quartier(pr[0]); N.vol.start(pr[0], pr[1]);
      }
      if (mode === 'plongee' && !N.intro.plongee.actif() && N.horloge.t() > 0.2) N.intro.plongee.start({ x: 300, y: 175 });
      tq += dt;
      if (mode === 'decor' && auto && tq > 7) { tq = 0; qi = (qi + 1) % QS.length; N.decor.quartier(QS[qi]); N.decor.etat(PARQ[QS[qi]]); }
    },
    draw: function () {
      var g = N.gfx, cam = N.cam;
      if (mode === 'vol' && N.vol && N.vol.actif()) { var t0v = performance.now(); N.vol.draw(); coutVol.push(performance.now() - t0v); if (coutVol.length > 600) coutVol.shift(); return; }
      if (mode === 'plongee') { g.clear(0); N.intro.plongee.draw(); return; }
      var t0 = performance.now();
      g.clear(0); g.origin(0, 0);
      N.decor.drawFar(cam);
      g.origin(cam.x, cam.y);
      N.decor.drawPlateau(cam);
      N.decor.drawFront(cam);
      cout.push(performance.now() - t0); if (cout.length > 600) cout.shift();
      /* la joueuse : un serpent cyan qui se promène (pour juger le contraste, jamais pour la mesure du décor) */
      var C = N.pal.i;
      for (var i = hist.length - 1; i >= 0; i -= 2) g.circ(hist[i].x, hist[i].y, 2, C('cyan'));
      g.circ(head.x, head.y, 3, C('cyanPale'));
      g.origin(0, 0);
      if (label) label.textContent = etatTexte();
    }
  };
  /* la boucle de 90-boot.js lit S.phase : 'essai' va au jeu (N.game) */
  window.addEventListener('keydown', function (ev) {
    var k = ev.key.toLowerCase();
    if (k >= '1' && k <= '7') { qi = +k - 1; N.decor.quartier(QS[qi]); N.decor.etat(PARQ[QS[qi]]); }
    else if (k === 'c') setE('calme'); else if (k === 'm') setE('montee'); else if (k === 'h') setE('chaos');
    else if (k === 'i') setE('inversion'); else if (k === 'o') setE('colosse'); else if (k === 'v') setE('victoire');
    else if (k === 'f') N.decor.eclair(); else if (k === 'w') N.decor.fenetres();
    else if (k === 'g') N.decor.ondule(head.x, head.y, 2);
    else if (k === 't') N.world.travelling({ largeur: 576, vx: 12 });
    else if (k === ' ' && N.vol && N.vol.start) { N.decor.quartier('docks'); N.vol.start('docks', 'artere'); mode = 'vol'; }
  });
  function p(a, q) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
  window.__B = {
    q: setQ, e: setE, tete: head, mode: function (m) { mode = m; }, auto: function (b) { auto = !!b; },
    parcours: function (m) { parcours = m; T = 0; hist.length = 0; },
    stats: function () { return { decorP50: p(cout, 0.5), decorP95: p(cout, 0.95), n: cout.length, volP95: p(coutVol, 0.95), nVol: coutVol.length }; },
    reset: function () { cout.length = 0; coutVol.length = 0; }
  };
})();
