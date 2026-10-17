/* ===== 79-jeu.js — N.game : la machine d'états, l'ordre des mises à jour et des dessins, la mort =====

   Contrat 1.0 (CONTRAT.md § 8 à 10, REFONTE.md § 7.6, 7.7 et 7.12). Propriétaire : le gardien du contrat,
   puis le lot 9 au réglage. Ce fichier remplace 70-game.js, que le lot 0b a réparti dans les squelettes.

   LA MACHINE D'ÉTATS. N.game.etat() fait foi ; seul ce module change d'état et appelle N.music.section.
   Les autres le demandent par un événement (rang 10, '79-jeu') :
     mort      → 'mort' (séquence de N.R.mortScene.duree, sautable dès sautDes), puis 'reapparition' s'il
                 reste une vie (N.score.vies), sinon 'fin' ;
     vague     nettoyee → 'nettoyage' (N.R.cartes.nettoyage s), puis 'cartes', puis 'vol' (si l'ordre du
                 secteur en met un) ou l'étape suivante ('jeu', 'defile', ou 'alerte' avant le CYCLOPE) ;
     vol       fin → l'étape suivante ;
     phase     mort → 'victoire', puis 'fin'.
   Le parcours : demarrage → (première visite : ouverture) ou titre → plongee → jeu → … → fin → plongee.
   Les écrans rendent la main par opts.retour (protocole de 80-ecrans.js) ; les cinématiques sont
   demandées à 60-intro par N.intro.transition(nom) — un nom qu'il ne connaît pas encore rend false, et ce
   module dessine alors un repli (logo et invite, fondu de la plongée).

   L'ORDRE DES MISES À JOUR, à chaque pas (dt = dtMonde) : pilote (s'il est actif), dir, arene, joueuse,
   arsenal, ennemis, colosse, butin, score, hud, scene, ui ; 90-boot.js appelle ensuite N.fx.update et
   N.cam.update. Les interfaces s'animent sur le temps réel (N.horloge.H par pas), même horloge arrêtée.

   L'ORDRE DE DESSIN (90-boot.js, CONTRAT.md § 9) : draw() pose le plateau et les murs, P6, le butin, les
   ennemis et leurs tirs, les tirs de la joueuse ; drawTop() les télégraphes, le CYCLOPE, le serpent.

   LES CROCHETS DE TEST : dbg.god(b), vague(n), boss(), input(o), etat(nom?), scene(nom), simuler(sec),
   masque(). Les scènes de référence (§ 7.12) sont ici en replis : même nom, contenu approché. */
N.game = (function () {
  'use strict';
  var QUI = '79-jeu';
  var ECRANS = { titre: 1, cartes: 1, fin: 1, initiales: 1, pause: 1 };
  var JEU = { jeu: 1, nettoyage: 1, defile: 1, alerte: 1, boss: 1, reapparition: 1 };
  var MONDE = { plongee: 1, jeu: 1, nettoyage: 1, cartes: 1, defile: 1, alerte: 1, boss: 1, mort: 1, reapparition: 1, victoire: 1, pause: 1, attraction: 1 };

  function S() { return N.S || null; }
  function R() { return N.R || {}; }
  function I(n) { return N.pal.i(n); }
  function H() { return (N.horloge && N.horloge.H) || 1 / 120; }
  function sct() { return R().secteurs && R().secteurs[0]; }
  function f(mod, fn) { var m = N[mod]; return m && typeof m[fn] === 'function' ? m : null; }
  function appel(mod, fn, a, b) { var m = f(mod, fn); if (m) return m[fn](a, b); return undefined; }

  var ETAT = 'demarrage', T = 0, TJ = 0, PREC = 'jeu', SECTION = null, SEED = 2975, INTRO = false, FIN_V = false, FIN_FAIT = false;
  var ATT_NETTOYAGE = false;
  var HIST = [];                                              // les transitions, pour les tests : {etat, pas, t}

  /* ================================ une nouvelle partie ================================ */
  function nouvellePartie(graine, opts) {
    opts = opts || {};
    SEED = (graine === undefined || graine === null) ? ((S() && S().seed) | 0 || 2975) : (graine | 0);
    if (N.socle) N.socle.reset(SEED, opts.mode || null);
    var s = S(); if (s) { s.seed = SEED; s.t = 0; s.death = null; }
    appel('world', 'reset');
    appel('joueuse', 'reset', opts.joueuse || {});
    appel('cam', 'reset');
    appel('ennemis', 'reset');
    appel('butin', 'reset');
    appel('arsenal', 'reset');
    appel('cartes', 'reset');
    appel('score', 'reset');
    appel('dir', 'reset', sct(), opts);
    appel('arene', 'reset');
    appel('colosse', 'reset');
    appel('hud', 'reset');
    appel('scene', 'reset');
    appel('decor', 'build');
    appel('fx', 'reset');
    FIN_FAIT = false; ATT_NETTOYAGE = false;
    abonner();
  }

  function abonner() {
    if (!N.ev) return;
    N.ev.on('mort', 10, function () {
      if (ETAT === 'attraction') { aller('titre'); return; }
      if (JEU[ETAT]) { PREC = ETAT === 'reapparition' ? PREC : ETAT; aller('mort'); }
    }, QUI);
    N.ev.on('vague', 10, function (c) {
      if (c.evt !== 'nettoyee') return;
      if (ETAT === 'mort' || ETAT === 'reapparition') { ATT_NETTOYAGE = true; return; }
      if (JEU[ETAT]) aller('nettoyage');
    }, QUI);
    N.ev.on('vol', 10, function (c) { if (c.evt === 'fin' && ETAT === 'vol') apresVol(); }, QUI);
    N.ev.on('phase', 10, function (c) { if (c.evt === 'mort' && (JEU[ETAT] || ETAT === 'mort')) aller('victoire'); }, QUI);
  }

  /* ================================ les états ================================ */
  function sectionDe(nom, opts) {
    var d = N.ids && N.ids.tableEtats[nom];
    if (nom === 'fin') return opts && opts.victoire ? 'victoire' : 'defaite';
    return d ? d.section : null;
  }
  function etatDe(etape) { return etape === 'defile' ? 'defile' : etape === 'cyclope' ? 'alerte' : 'jeu'; }
  function transition(nom, opts) { INTRO = !!(N.intro && N.intro.transition && N.intro.transition(nom, opts)); return INTRO; }

  function aller(nom, opts) {
    if (!N.ids || N.ids.etats.indexOf(nom) < 0) return false;
    opts = opts || {};
    /* la fin de partie se compte une fois ; un score du top 10 passe d'abord par les initiales */
    if (nom === 'fin' && !FIN_FAIT) {
      FIN_FAIT = true; FIN_V = !!opts.victoire;
      if (N.score && N.score._fin) N.score._fin(FIN_V);
      if (N.score && N.score._entreRecords && N.score._entreRecords() && N.ui) nom = 'initiales';
    }
    var avant = ETAT;
    ETAT = nom; T = 0; TJ = 0;
    if (HIST.length >= 256) HIST.shift();
    HIST.push({ etat: nom, pas: N.horloge ? N.horloge.pas() : 0, t: N.horloge ? N.horloge.t() : 0 });
    var sec = sectionDe(nom, opts);
    if (sec && sec !== SECTION && N.music && N.music.section) { SECTION = sec; N.music.section(sec); }
    if (opts.reprise) return true;
    var s = S(), inp = s && s.input;
    if (N.ui && N.ui.actif() && !ECRANS[nom]) N.ui.fermer();      // un écran ne survit pas à un état qui n'est pas le sien
    switch (nom) {
      case 'demarrage': transition('demarrage'); break;
      case 'ouverture': if (N.intro && N.intro.reset) N.intro.reset(); else aller('plongee'); break;
      case 'titre':
        if (N.pilote) N.pilote.activer(false);
        transition('titre');
        if (N.ui) N.ui.ouvrir('titre', { retour: function () { aller('plongee'); } }); else aller('plongee');
        break;
      case 'attraction':
        nouvellePartie(((R().ecrans && R().ecrans.attraction.graine) || 2975), { mode: 'attraction' });
        if (N.pilote) { N.pilote.niveau('bon'); N.pilote.activer(true); }
        if (N.joueuse && N.joueuse._god) N.joueuse._god(false);
        break;
      case 'briefing': transition('briefing'); break;
      case 'plongee':
        if (opts.nouvelle !== false) nouvellePartie(opts.graine !== undefined ? opts.graine : (avant === 'demarrage' || avant === 'titre' || avant === 'ouverture' || avant === 'briefing' ? SEED : SEED + 1));
        if (N.ui && N.ui.actif()) N.ui.fermer();
        transition('plongee');
        break;
      case 'cartes': {
        var att = N.cartes ? N.cartes.niveauxEnAttente() : 0, choix = Math.min((R().cartes && R().cartes.choixMax) || 3, 1 + att);
        if (!N.ui || !N.cartes || !N.cartes.main(1).length) { apresCartes(); break; }
        N.ui.ouvrir('cartes', { choix: choix, vague: true, retour: apresCartes });
        break;
      }
      case 'vol': {
        var p = N.dir ? N.dir.progression() : null, v = s && s.vague, vers = quartierDe(p && p.suivante);
        if (!N.vol) { apresVol(); break; }
        N.vol.start(v ? v.quartier : 'docks', vers);
        break;
      }
      case 'panneau': if (!transition('boss', { nom: 'LE CYCLOPE' })) aller('boss'); break;
      case 'boss': if (N.colosse && !N.colosse.actif()) N.colosse.start(); break;
      case 'mort': if (N.fx && N.fx.ralenti) N.fx.ralenti((R().mortScene && R().mortScene.desintegre.ralenti) || 0.25, (R().mortScene && R().mortScene.duree) || 1.3, { joueuse: true }); break;
      case 'reapparition': {
        appel('joueuse', 'reset', { reapparition: true });
        var P = s && s.player;
        if (P && N.ennemis) N.ennemis.effacerTirs(P.x, P.y, (R().vies && R().vies.reapparition.effaceTirs) || 40);
        break;
      }
      case 'victoire': if (N.ennemis) N.ennemis.purge('distance'); break;
      case 'fin':
        transition(FIN_V ? 'victoire' : 'defaite');
        if (N.ui) N.ui.ouvrir('fin', { victoire: FIN_V, retour: function () { aller('plongee'); } });
        break;
      case 'initiales':
        if (N.ui) N.ui.ouvrir('initiales', { retour: function () { aller('fin', { victoire: FIN_V }); } }); else aller('fin', { victoire: FIN_V });
        break;
      case 'pause':
        if (N.ui) N.ui.ouvrir('pause', { retour: function () { if (s) s.paused = false; aller(PREC, { reprise: true }); } });
        break;
      default: break;
    }
    if (inp) inp.any = false;
    return true;
  }
  function quartierDe(etape) {
    var s = sct(); if (!s || !etape) return 'artere';
    if (etape === 'defile') return s.defile.quartier;
    if (etape === 'cyclope') return (s.cyclope && s.cyclope.quartier) || 'eclipse';
    var v = s.vagues[(+etape.slice(1)) - 1]; return v ? v.quartier : 'artere';
  }
  function apresCartes() {
    var p = N.dir ? N.dir.progression() : null;
    if (p && p.apresVol) { aller('vol'); return; }
    aller(etatDe(p && p.suivante));
  }
  function apresVol() { var p = N.dir ? N.dir.progression() : null; aller(etatDe(p && p.suivante)); }

  /* ================================ le pas ================================ */
  function jouer(dt) {
    appel('dir', 'update', dt);
    appel('arene', 'update', dt);
    appel('joueuse', 'update', dt);
    appel('arsenal', 'update', dt);
    appel('ennemis', 'update', dt);
    if (N.colosse && N.colosse.actif()) N.colosse.update(dt);
    appel('butin', 'update', dt);
    appel('score', 'update', dt);
    appel('hud', 'update', dt);
    appel('scene', 'update', dt);
    appel('ui', 'update', dt);
  }
  function neuf() {
    var s = S(), inp = s && s.input; if (!inp) return false;
    return !!(inp.any || inp.valider || (inp.taps && inp.taps.length));
  }

  function update(dt) {
    var s = S(); if (!s) return;
    if (!(dt > 0)) dt = 0;
    var h = H(), inp = s.input;
    if (N.pilote && N.pilote.actif && N.pilote.actif()) N.pilote.agir(dt);
    T += h; TJ += dt;
    /* l'arrière-plan et la touche pause mettent le jeu en pause (CONTRAT.md § 16) */
    if (JEU[ETAT] && (s.paused || (inp && inp.pause))) { PREC = ETAT; if (inp) inp.pause = false; aller('pause'); return; }
    var RS = sct() && sct().structure, RE = R().ecrans || {};
    switch (ETAT) {
      case 'demarrage':
        if (neuf()) aller(premiereVisite() ? 'ouverture' : 'titre');
        break;
      case 'ouverture':
        if (N.intro && N.intro.update) N.intro.update(h);
        if (!N.intro || !N.intro.state || N.intro.state().mode !== 'ouverture') aller('plongee');
        break;
      case 'titre':
        if (INTRO && N.intro.update) N.intro.update(h);
        appel('ui', 'update', h);
        if (ETAT === 'titre' && T >= ((RE.attraction && RE.attraction.attente) || 15)) aller('attraction');
        break;
      case 'attraction':
        jouer(dt);
        if (T > 0.3 && neuf()) { aller('titre'); break; }
        if (T >= ((RE.attraction && RE.attraction.boucle) || 35)) aller('titre');
        break;
      case 'briefing':
        if (INTRO && N.intro.update) N.intro.update(h);
        if (T >= ((RE.briefing && RE.briefing.duree) || 2) || (T > 0.3 && neuf())) aller('plongee', { nouvelle: false });
        break;
      case 'plongee':
        if (INTRO && N.intro.update) N.intro.update(h);
        if (T >= ((RE.plongee && RE.plongee.duree) || 0.8)) aller('jeu');
        break;
      case 'jeu': case 'defile': case 'boss':
        jouer(dt);
        break;
      case 'nettoyage':
        jouer(dt);
        if (ETAT === 'nettoyage' && T >= ((R().cartes && R().cartes.nettoyage) || 2.5)) aller('cartes');
        break;
      case 'alerte':
        jouer(dt);
        if (ETAT === 'alerte' && T >= ((RS && RS.warning) || 3)) aller('panneau');
        break;
      case 'reapparition':
        jouer(dt);
        if (ETAT === 'reapparition' && T >= ((R().vies && R().vies.reapparition.ready) || 0.6)) {
          if (ATT_NETTOYAGE) { ATT_NETTOYAGE = false; aller('nettoyage'); } else aller(PREC, { reprise: true });
        }
        break;
      case 'cartes': appel('ui', 'update', h); appel('hud', 'update', 0); break;
      case 'vol':
        appel('vol', 'update', dt); appel('hud', 'update', dt); appel('scene', 'update', dt);
        break;
      case 'panneau':
        if (N.intro && N.intro.update) N.intro.update(h);
        if (!N.intro || !N.intro.busy || !N.intro.busy()) aller('boss');
        break;
      case 'mort': {
        appel('joueuse', 'update', dt); appel('scene', 'update', dt); appel('hud', 'update', dt);
        var M = R().mortScene || { duree: 1.3, sautDes: 0.5 };
        if (T >= M.duree || (T >= M.sautDes && neuf())) suiteMort();
        break;
      }
      case 'victoire':
        appel('ennemis', 'update', dt); appel('butin', 'update', dt);
        if (N.colosse && N.colosse.actif()) N.colosse.update(dt);
        appel('scene', 'update', dt); appel('hud', 'update', dt);
        if (T >= ((RS && RS.victoire) || 6)) aller('fin', { victoire: true });
        break;
      case 'fin': case 'initiales': case 'pause':
        if (INTRO && ETAT !== 'pause' && N.intro.update) N.intro.update(h);   // le fond de fin se révèle en temps réel
        appel('ui', 'update', h);
        break;
      default: break;
    }
  }
  function suiteMort() {
    var vies = N.score ? N.score.vies : 0;
    if (vies > 0) aller('reapparition'); else aller('fin', { victoire: false });
  }
  function premiereVisite() {
    var d = N.score && N.score.profil && N.score.profil.donnees ? N.score.profil.donnees() : null;
    return !!(d && d.profil && d.profil.parties === 0);
  }

  /* ================================ le dessin ================================ */
  function draw() {
    var g = N.gfx; if (!g || !N.pal) return;
    if (!MONDE[ETAT]) { if (!INTRO || ETAT === 'demarrage') ecranRepli(); return; }
    var cam = N.cam;
    appel('decor', 'drawPlateau', cam);
    appel('decor', 'drawFront', cam);
    appel('butin', 'draw');
    appel('ennemis', 'draw');
    appel('arsenal', 'draw');
    appel('colosse', 'draw');
  }
  function drawTop() {
    var g = N.gfx; if (!g || !N.pal || !MONDE[ETAT]) return;
    appel('fx', 'drawTele');
    appel('colosse', 'drawTop');
    appel('joueuse', 'draw');
    appel('joueuse', 'drawTop');
    /* la plongée, sans 60-intro : un fondu qui découvre le monde */
    if (ETAT === 'plongee' && !INTRO) {
      var k = Math.max(0, 1 - T / ((R().ecrans && R().ecrans.plongee && R().ecrans.plongee.duree) || 0.8)), cam = N.cam;
      if (g.origin) g.origin(0, 0);
      g.ditherRect(0, 0, g.W, g.H, I('vide'), k);
      if (g.origin && cam) g.origin(cam.x, cam.y);
    }
  }
  /* les écrans plein écran que 60-intro ne sait pas encore faire : logo et invite (DIRECTION.md, point 1) */
  var TXO = { ci: 0, contour: true, echelle: 1 };
  function ecranRepli() {
    var g = N.gfx; if (!g || !N.spr || !N.spr.text) return;
    if (g.origin) g.origin(0, 0);
    var W = g.W, Hh = g.H, cx = W / 2, l = [];
    if (ETAT === 'demarrage') l = [['SNAKE 2975', 'jaune', 3, 0.36], [toucheTexte() + ' POUR COMMENCER', ((T * ((R().ecrans && R().ecrans.demarrage.clignoteHz) || 1)) % 1) < 0.6 ? 'os' : 'acier', 1, 0.66]];
    else if (ETAT === 'briefing') l = [['AN 2975', 'os', 2, 0.3], [(sct() && sct().nom) || 'LA GRILLE', 'jaune', 2, 0.5]];
    for (var i = 0; i < l.length; i++) {
      TXO.ci = I(l[i][1]); TXO.echelle = l[i][2];
      var s = N.spr.text(l[i][0], TXO);
      if (s && s.data) g.blit(s, Math.round(cx - s.w / 2), Math.round(Hh * l[i][3]));
    }
  }
  function toucheTexte() { try { return (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ? 'TOUCHE' : 'CLIQUE'; } catch (e) { return 'TOUCHE'; } }

  function tension() {
    if (JEU[ETAT] || ETAT === 'mort' || ETAT === 'vol' || ETAT === 'attraction') return N.dir && N.dir.tension ? N.dir.tension() : 0.3;
    if (ETAT === 'fin') return 0.12;
    return 0.06;
  }

  /* ================================ les crochets de test ================================ */
  function simuler(sec) {
    var s = S(), J = N.journal; if (!s || !N.horloge) return [];
    if (J) J.actif(true);
    var t0 = N.horloge.t(), lim = Math.ceil((+sec || 0) * 120 * 6) + 600, k = 0, inp = s.input;
    while (N.horloge.t() - t0 < sec && k++ < lim) {
      var dt = N.horloge.avancer();
      s.t = N.horloge.t(); s.dt = dt;
      update(dt);
      if (N.fx && N.fx.update) N.fx.update(dt);
      if (N.cam && N.cam.update) N.cam.update(dt);
      if (inp) { inp.pouvoir = inp.apogee = inp.pause = inp.valider = inp.retour = false; inp.chiffre = 0; inp.car = ''; inp.any = false; if (inp.taps) inp.taps.length = 0; if (inp.gestes) inp.gestes.length = 0; }
    }
    return J ? J.dump() : [];
  }
  /* le masque de propriété : une passe de dessin complète avec le masque armé (N.gfx.masque) */
  function masque() {
    var g = N.gfx; if (!g || !g.buf || !g.buf()) return new Uint8Array(0);
    if (!g.masque) return new Uint8Array(g.W * g.H);
    g.masque(true);
    try {
      var cam = N.cam || { x: 0, y: 0 };
      g.clear(0); if (g.origin) g.origin(0, 0);
      var d = N.ids.tableEtats[ETAT];
      if (ETAT === 'vol') appel('vol', 'draw');
      else if (!d.plein) appel('decor', 'drawFar', cam);
      if (ETAT !== 'vol') {
        if (g.origin) g.origin(cam.x, cam.y);
        draw(); appel('fx', 'draw'); drawTop();
      }
      if (g.origin) g.origin(0, 0);
      appel('fx', 'drawEcran'); appel('hud', 'draw'); appel('ui', 'draw');
    } catch (e) { if (N.socle) N.socle.signaler('79-jeu.masque', e); }
    var out = new Uint8Array(g.masque());
    g.masque(false);
    return out;
  }

  function scene(nom) {
    if (!N.ids || N.ids.scenes.indexOf(nom) < 0) return null;
    var s = S(), dep = { calme: 'v1', montee: 'v2', chaos: 'v4', colosse: 'cyclope', charge: 'cyclope', boss3: 'cyclope', v5: 'v5',
      inversion: 'v2', convoi: 'v4', travelling: 'v3', fin: 'v3', mortTir: 'v3', mur: 'v1', morsure: 'v1', lasso6: 'v1', cartes: 'v1', vol: 'v1' }[nom] || 'v1';
    nouvellePartie(SEED, { depart: dep, mode: 'scene:' + nom });
    var mortelle = nom === 'mur' || nom === 'mortTir' || nom === 'morsure';
    if (N.joueuse && N.joueuse._god) N.joueuse._god(!mortelle);
    if (N.ui && N.ui.actif()) N.ui.fermer();
    if (N.pilote) N.pilote.activer(false);
    var w = N.world, P = s && s.player, k;
    function entourer(n, types) {
      for (k = 0; k < n; k++) {
        var a = k / n * Math.PI * 2, r = 70 + (k % 3) * 30;
        if (N.ennemis && P) N.ennemis.spawn(types[k % types.length], P.x + Math.cos(a) * r, P.y + Math.sin(a) * r * 0.7, {});
      }
    }
    function buildMax() { if (N.arsenal) for (var a in { canon: 1, tourelles: 1, arc: 1, missiles: 1, drones: 1, minesQ: 1 }) for (var q = 0; q < 4; q++) N.arsenal.monter(a); }
    switch (nom) {
      case 'calme': case 'montee': case 'chaos': aller('jeu'); simuler(3); break;
      case 'colosse': aller('boss'); simuler(3); break;
      case 'charge':
        aller('boss'); buildMax(); entourer(30, ['fleche', 'mine', 'tourelle', 'sentinelle', 'dard', 'larve']);
        if (N.ennemis && P) for (k = 0; k < 60; k++) { var b = k / 60 * Math.PI * 2; N.ennemis.tir(P.x + Math.cos(b) * 90, P.y + Math.sin(b) * 60, -Math.cos(b) * 10, -Math.sin(b) * 10, { vie: 30 }); }
        appel('decor', 'quartier', 'coeur'); appel('decor', 'etat', 'chaos');
        break;
      case 'boss3': aller('boss'); if (N.ennemis) for (k = 0; k < N.ennemis.list.length; k++) if (N.ennemis.list[k].boss) N.ennemis.list[k].pv = N.ennemis.list[k].pvMax * 0.3; break;
      case 'v5': aller('jeu'); buildMax(); entourer(32, ['fleche', 'tourelle', 'sentinelle', 'ruche', 'lame', 'dard']); if (N.arene) N.arene.travelling(14, 'gauche'); break;
      case 'mur':
        aller('jeu');
        if (N.joueuse && w) N.joueuse.reset({ x: w.x1 - 30, y: (w.y0 + w.y1) / 2, ang: 0 });
        break;
      case 'morsure':
        aller('jeu');
        if (N.joueuse && w) { N.joueuse.reset({ len: 30, x: (w.x0 + w.x1) / 2, y: (w.y0 + w.y1) / 2 }); N.joueuse._god(true); }
        if (s && s.input) { s.input.x = 0; s.input.y = 1; s.input.mag = 1; }
        for (k = 0; k < 8; k++) { var a2 = k * Math.PI / 2; if (s && s.input) { s.input.x = Math.cos(a2); s.input.y = Math.sin(a2); } simuler(0.25); }
        if (N.joueuse) N.joueuse._god(false);
        break;
      case 'lasso6':
        aller('jeu');
        if (N.joueuse) N.joueuse.reset({ len: 20 });
        P = s && s.player;
        if (N.ennemis && P) for (k = 0; k < 6; k++) N.ennemis.spawn('mine', P.x + 90 + (k % 3) * 12, P.y - 12 + ((k / 3) | 0) * 24, {});
        break;
      case 'mortTir':
        aller('jeu');
        if (N.ennemis && P) N.ennemis.spawn('tourelle', P.x + 80, P.y, {});
        break;
      case 'cartes': aller('cartes'); if (N.ui && N.ui.actif() !== 'cartes') N.ui.ouvrir('cartes', { choix: 2, retour: apresCartes }); break;
      case 'fin':
        aller('jeu');
        if (N.score) N.score.vies = 1;
        if (N.joueuse) { N.joueuse._god(false); N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null }); }
        aller('fin', { victoire: false });
        break;
      case 'vol': aller('vol'); simuler(2); break;
      case 'inversion': aller('jeu'); entourer(12, ['fleche', 'dard', 'larve']); if (N.ennemis) N.ennemis.inverser(6); break;
      case 'convoi': aller('jeu'); entourer(6, ['fleche', 'tourelle']); break;
      case 'travelling': aller('jeu'); if (N.arene) N.arene.travelling(12, 'gauche'); simuler(2.5); break;
      default: aller('jeu');
    }
    return nom;
  }

  var dbg = {
    god: function (b) { return N.joueuse && N.joueuse._god ? N.joueuse._god(b !== false) : false; },
    vague: function (n) {
      n = n | 0;
      nouvellePartie(SEED, { depart: n === 0 ? 'defile' : 'v' + Math.max(1, Math.min(5, n)) });
      aller(n === 0 ? 'defile' : 'jeu');
      return ETAT;
    },
    boss: function () { nouvellePartie(SEED, { depart: 'cyclope' }); aller('alerte'); return ETAT; },
    input: function (o) { var s = S(); if (s && s.input && o) for (var k in o) s.input[k] = o[k]; return s ? s.input : null; },
    etat: function (nom, opts) { if (nom) aller(nom, opts); return { etat: ETAT, t: T, tJeu: TJ, prec: PREC, section: SECTION, intro: INTRO }; },
    scene: scene,
    simuler: simuler,
    historique: function () { return HIST; },
    masque: masque
  };

  return {
    reset: function (graine, opts) { nouvellePartie(graine, opts); if (opts && opts.etat) aller(opts.etat); },
    update: update, draw: draw, drawTop: drawTop, tension: tension,
    etat: function () { return ETAT; },
    dbg: dbg
  };
})();
