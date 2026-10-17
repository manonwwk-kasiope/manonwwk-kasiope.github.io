/* tools/contrat/tests.js — les tests de contrat comportementaux (contrat 1.0, lot 0a).

   Une seule suite, sans DOM, qui s'exécute :
     - dans une page, sur N'IMPORTE QUEL bundle (tools/contrat/contrat.mjs l'injecte et l'appelle) ;
     - dans Node, sur src/00-pal.js, 02-regles.js et 03-socle.js seuls (tools/contrat/socle.mjs).
   Elle publie  __testsContrat(N, opts) -> { ok, groupes:{nom:{ok, echecs, reussis, absents}}, resultats:[…] }.

   Groupes :
     socle    N.ev, N.rng, N.horloge, N.journal, N.ids (bloquant dès le lot 0a)
     regles   N.R : valeurs du plan, formules, cohérence avec N.ids (bloquant dès le lot 0a)
     palette  N.pal.L et N.pal.lumineux (bloquant dès le lot 0a)
     modules  contrat des autres modules, testé SEULEMENT quand le module publie l'interface 1.0
              (sinon « absent », qui n'échoue pas) : c'est ce qui permet aux squelettes du lot 0b et à
              chaque lot de se vérifier sur le même script.
   Les tests ne touchent jamais à l'état du jeu en cours : ils travaillent sur des instances neuves
   (N.ev.creer, N.rng.famille, N.horloge.creer, N.journal.creer), avec un signaleur local, pour que les
   erreurs provoquées exprès ne comptent pas dans __ERR. Les tests de modules (groupe « modules ») qui
   agissent sur le jeu (spawn, hit, tuer) le font sur une partie remise à zéro, puis remettent à zéro. */
(function (racine) {
  'use strict';

  function suite(N, opts) {
    opts = opts || {};
    var S = opts.S || N.S || null;
    var res = [];
    var groupe = 'socle';
    function test(nom, f) {
      var r = { groupe: groupe, nom: nom, ok: false, detail: '' };
      try {
        var v = f();
        if (v === 'absent') { r.ok = true; r.absent = true; r.detail = 'interface 1.0 absente : non testé'; }
        else if (v === true || v === undefined) r.ok = true;
        else r.detail = String(v);
      } catch (e) { r.detail = 'exception : ' + ((e && e.message) || e); }
      res.push(r);
    }
    function egal(a, b, quoi) { if (a !== b) throw new Error((quoi || '') + ' : ' + JSON.stringify(a) + ' au lieu de ' + JSON.stringify(b)); }
    function proche(a, b, tol, quoi) { if (!(Math.abs(a - b) <= tol)) throw new Error((quoi || '') + ' : ' + a + ' au lieu de ' + b + ' ± ' + tol); }
    function vrai(c, quoi) { if (!c) throw new Error(quoi || 'condition fausse'); }
    function memesListes(a, b, quoi) { egal(JSON.stringify(Array.prototype.slice.call(a)), JSON.stringify(b), quoi); }
    function chemin(o, p) { return p.split('.').reduce(function (x, k) { return x == null ? undefined : x[k]; }, o); }

    /* ============================================================================ socle : N.ev */
    groupe = 'socle';
    test('N.ev : interface', function () {
      ['on', 'off', 'emit', 'nouveauPas', 'consommateurs', 'verifier', 'stats', 'creer'].forEach(function (k) { vrai(typeof N.ev[k] === 'function', 'N.ev.' + k); });
    });
    function bus(o) { var sigs = []; o = o || {}; o.signaler = function (ou, e) { sigs.push(ou + ' ' + ((e && e.message) || e)); }; var J = N.journal.creer(64); J.actif(true); o.journal = o.journal || J; var b = N.ev.creer(o); b._sigs = sigs; b._J = o.journal; return b; }
    test('N.ev : par rang, puis par nom de fichier, puis par ordre d inscription', function () {
      var b = bus(), o = [];
      b.on('kill', 60, function () { o.push('60:79-scene'); }, '79-scene');
      b.on('kill', 20, function () { o.push('20:77-score'); }, '77-score');
      b.on('kill', 90, function () { o.push('90:03-socle'); }, '03-socle');
      b.on('kill', 20, function () { o.push('20:75-cartes'); }, '75-cartes');
      b.on('kill', 35, function () { o.push('35:70-joueuse'); }, '70-joueuse');
      b.on('kill', 20, function () { o.push('20:~a'); });
      b.on('kill', 20, function () { o.push('20:~b'); });
      b.emit('kill', {});
      memesListes(o, ['20:75-cartes', '20:77-score', '20:~a', '20:~b', '35:70-joueuse', '60:79-scene', '90:03-socle'], 'ordre');
      memesListes(b.consommateurs('kill').map(function (c) { return c.rang + ':' + c.qui; }), ['20:75-cartes', '20:77-score', '20:~', '20:~', '35:70-joueuse', '60:79-scene', '90:03-socle'], 'consommateurs');
    });
    test('N.ev : une nouvelle inscription du même (nom, rang, fichier) remplace l ancienne', function () {
      var b = bus(), n = 0;
      b.on('kill', 20, function () { n += 1; }, '77-score');
      b.on('kill', 20, function () { n += 10; }, '77-score');
      b.on('kill', 80, function () { n += 100; }, '77-score');
      b.emit('kill', {}); egal(n, 110, 'somme');
    });
    test('N.ev : un événement émis pendant un envoi passe après, dans l ordre d émission', function () {
      var b = bus(), o = [];
      b.on('kill', 20, function () { o.push('kill20'); b.emit('ramassage', 1); b.emit('coupe', 2); }, '77-score');
      b.on('kill', 60, function () { o.push('kill60'); b.emit('vague', 3); }, '79-scene');
      b.on('ramassage', 10, function (c) { o.push('ram' + c); b.emit('defi', 4); }, '70-joueuse');
      b.on('coupe', 20, function (c) { o.push('coupe' + c); }, '77-score');
      b.on('vague', 10, function (c) { o.push('vague' + c); }, '79-jeu');
      b.on('defi', 60, function (c) { o.push('defi' + c); }, '79-scene');
      var r = b.emit('kill', {});
      vrai(r === true, 'emit rend true');
      memesListes(o, ['kill20', 'kill60', 'ram1', 'coupe2', 'vague3', 'defi4'], 'file');
    });
    test('N.ev : chaque consommateur appelé une fois par émission, avec la charge et le nom', function () {
      var b = bus(), vus = [], ch = { id: 7 };
      b.on('kill', 20, function (c, nom) { vus.push([c, nom]); }, '77-score');
      b.emit('kill', ch); b.emit('kill', ch);
      egal(vus.length, 2, 'appels'); vrai(vus[0][0] === ch && vus[0][1] === 'kill', 'charge et nom');
    });
    test('N.ev : au-delà de 64 par pas, perte journalisée et signalée ; nouveauPas remet à zéro', function () {
      var b = bus(), n = 0, ok = 0;
      b.on('kill', 20, function () { n++; }, '77-score');
      for (var i = 0; i < 70; i++) if (b.emit('kill', {})) ok++;
      egal(ok, 64, 'acceptés'); egal(n, 64, 'envoyés'); egal(b.stats().perdus, 6, 'perdus');
      egal(b._J.lire('perdu').length, 6, 'journal perdu'); egal(b._sigs.length, 6, 'signalés');
      b.nouveauPas(); vrai(b.emit('kill', {}) === true, 'après nouveauPas');
      var ok2 = 0, b2 = bus({ max: 64 });
      b2.on('kill', 20, function () { b2.emit('coupe', {}); }, '77-score');
      for (var j = 0; j < 40; j++) if (b2.emit('kill', {})) ok2++;
      egal(ok2, 32, 'les événements émis en cascade comptent aussi');
    });
    test('N.ev : une exception est mise en quarantaine sans empêcher les suivants', function () {
      var b = bus(), o = [];
      b.on('kill', 20, function () { throw new Error('boum'); }, '77-score');
      b.on('kill', 60, function () { o.push('scene'); }, '79-scene');
      b.emit('kill', {}); b.emit('kill', {});
      memesListes(o, ['scene', 'scene'], 'suivants'); egal(b._sigs.length, 2, 'signalé à chaque fois');
      vrai(/ev:kill:77-score/.test(b._sigs[0]), 'signature');
    });
    test('N.ev : inscription et retrait pendant un envoi différés après la file', function () {
      var b = bus(), o = [];
      function g() { o.push('g'); }
      b.on('kill', 20, function () { o.push('f'); b.on('kill', 30, g, '75-cartes'); b.emit('coupe', {}); }, '77-score');
      b.on('coupe', 20, function () { o.push('c'); }, '77-score');
      b.emit('kill', {}); b.emit('kill', {});
      memesListes(o, ['f', 'c', 'f', 'g', 'c'], 'différé');
      b.off('kill', '75-cartes'); o.length = 0; b.emit('kill', {});
      memesListes(o, ['f', 'c'], 'retrait par module');
      b.off('kill', g);
    });
    test('N.ev : mode vérification (charge hors schéma, événement inconnu, consommateur non prévu)', function () {
      var b = bus(); b.verifier(true);
      b.on('kill', 20, function () {}, '77-score');            // prévu
      egal(b._sigs.length, 0, 'consommateur prévu accepté');
      b.on('kill', 25, function () {}, '77-score');            // rang non prévu
      b.on('kill', 20, function () {});                         // anonyme
      b.on('inexistant', 20, function () {}, '77-score');
      egal(b._sigs.length, 3, 'inscriptions signalées');
      b.emit('kill', { id: 1 });
      egal(b._sigs.length, 4, 'charge hors schéma signalée');
      b.emit('kill', EX_CHARGES.kill);
      egal(b._sigs.length, 4, 'charge conforme acceptée');
    });
    test('N.ev : le journal (rang 90, 03-socle) est inscrit sur les 21 événements du contrat', function () {
      N.ids.evenements.forEach(function (e) {
        var c = N.ev.consommateurs(e).filter(function (x) { return x.rang === 90 && x.qui === '03-socle'; });
        egal(c.length, 1, 'journal de ' + e);
      });
    });

    /* ============================================================================ socle : N.rng */
    test('N.rng : interface et flux nommés figés', function () {
      vrai(typeof N.rng === 'function', 'N.rng est une fonction');
      ['reset', 'graine', 'flux', 'famille', 'hash'].forEach(function (k) { vrai(typeof N.rng[k] === 'function', 'N.rng.' + k); });
      memesListes(N.ids.flux, ['dir', 'ennemis', 'arene', 'butin', 'cartes', 'arsenal', 'joueuse', 'vol', 'defis', 'decor', 'fx', 'music', 'pilote'], 'noms');
      var F = N.rng.famille(1)('dir');
      ['f', 'i', 'r', 'etat', 'reprendre'].forEach(function (k) { vrai(typeof F[k] === 'function', 'flux.' + k); });
    });
    test('N.rng : 1 000 tirages dans « ennemis » ne changent pas un seul tirage de « dir »', function () {
      var A = N.rng.famille(2975), B = N.rng.famille(2975), a = [], b = [];
      for (var i = 0; i < 200; i++) a.push(A('dir').f());
      for (var k = 0; k < 1000; k++) B('ennemis').f();
      for (var j = 0; j < 200; j++) { b.push(B('dir').f()); if (j % 7 === 0) B('fx').f(); }
      memesListes(b, a, 'suite de dir');
    });
    test('N.rng : deux reset de même graine donnent les mêmes suites, en place', function () {
      var A = N.rng.famille(11), F = A('arene'), G = A('butin');
      var s1 = [F.f(), F.f(), G.i(1, 6), F.r(-2, 2)];
      A.reset(11);
      var s2 = [F.f(), F.f(), G.i(1, 6), F.r(-2, 2)];
      memesListes(s2, s1, 'même graine');
      A.reset(12); vrai(F.f() !== s1[0], 'graine différente, suite différente');
      egal(A.graine(), 12, 'graine');
      vrai(A('dir') === A('dir'), 'le même flux est rendu');
    });
    test('N.rng : bornes, état, reprise, flux indépendant', function () {
      var F = N.rng.famille(3)('pilote'), mn = 9, mx = -9;
      for (var i = 0; i < 5000; i++) { var v = F.f(); vrai(v >= 0 && v < 1, 'f dans [0,1['); var k = F.i(-2, 3); if (k < mn) mn = k; if (k > mx) mx = k; }
      egal(mn, -2, 'i min inclus'); egal(mx, 3, 'i max inclus');
      var e = F.etat(), x = [F.f(), F.f()]; F.reprendre(e); memesListes([F.f(), F.f()], x, 'reprendre');
      var J1 = N.rng.flux(20261017, 'defis'), J2 = N.rng.flux(20261017, 'defis'), J3 = N.rng.flux(20261018, 'defis');
      egal(J1.f(), J2.f(), 'même jour, même tirage'); vrai(J3.f() !== J2.f(), 'autre jour');
      vrai(N.rng.famille(5)('dir').f() !== N.rng.famille(5)('ennemis').f(), 'deux noms, deux suites');
    });
    test('N.rng : même suite congruentielle que la démo', function () {
      var F = N.rng.famille(1)('dir'), e0 = F.etat(), att = (e0 * 1664525 + 1013904223) % 4294967296;
      proche(F.f(), att / 4294967296, 1e-15, 'pas LCG');
    });

    /* ============================================================================ socle : N.horloge */
    test('N.horloge : interface', function () {
      ['t', 'dtMonde', 'dtJoueuse', 'pas', 'temps', 'gele', 'geler', 'image', 'avancer', 'reset', 'franchi', 'prochainTemps', 'reel', 'arretee', 'creer'].forEach(function (k) {
        vrai(typeof N.horloge[k] === 'function', 'N.horloge.' + k);
      });
      proche(N.horloge.H, 1 / 120, 1e-12, 'H');
    });
    function hz(c) { c = c || {}; if (!c.k) c.k = function () { return 1; }; if (!c.kJoueuse) c.kJoueuse = function () { return 1; }; if (!c.arretee && !c.etat && !c.paused) c.arretee = function () { return false; }; return N.horloge.creer(c); }
    function rouler(h, dtImage, secondes, chaquePas) {
      var images = Math.round(secondes / dtImage);
      for (var i = 0; i < images; i++) { var n = h.image(dtImage); for (var k = 0; k < n; k++) { h.avancer(); if (chaquePas) chaquePas(h); } }
    }
    test('N.horloge : hitstop(6) gèle 0,1 s ± 1 pas à __DT 1/30, 1/60 et 1/120', function () {
      [1 / 30, 1 / 60, 1 / 120].forEach(function (dt) {
        var h = hz(), gelReel = 0;
        rouler(h, dt, 0.5);
        h.geler(6 / 60);
        rouler(h, dt, 0.5, function (x) { if (x.dtMonde() === 0) gelReel += x.H; });
        proche(gelReel, 0.1, 1 / 120 + 1e-9, 'gel à dt ' + dt.toFixed(4));
        proche(h.t(), 1.0 - 0.1, 1 / 120 + 1e-9, 't après gel à dt ' + dt.toFixed(4));
      });
    });
    test('N.horloge : au plus 4 pas par image, le reste passe à l image suivante', function () {
      var h = hz();
      egal(h.image(1 / 60), 2, '60 Hz'); egal(h.image(1 / 120), 1, '120 Hz'); egal(h.image(1 / 30), 4, '30 Hz');
      egal(h.image(0.1), 4, 'image de 100 ms : 4 pas'); vrai(h.image(0.001) >= 1, 'le reste passe à l image suivante');
      var tot = 0, h2 = hz();
      for (var i = 0; i < 100; i++) tot += h2.image(1 / 144);
      proche(tot, Math.floor(100 / 144 * 120), 1, 'cadence de 144 Hz : pas comptés juste');
    });
    test('N.horloge : t() en secondes de temps de jeu, ralenti compris ; dtJoueuse exemptée', function () {
      var k = 1, kj = 1, h = hz({ k: function () { return k; }, kJoueuse: function () { return kj; } });
      rouler(h, 1 / 60, 1.0); proche(h.t(), 1.0, 1e-9, '1 s');
      k = 0.5; kj = 1; var sj = 0;
      rouler(h, 1 / 60, 1.0, function (x) { sj += x.dtJoueuse(); });
      proche(h.t(), 1.5, 1e-9, 'ralenti 0,5'); proche(sj, 1.0, 1e-9, 'joueuse exemptée');
      proche(h.reel(), 2.0, 1e-9, 'temps réel'); egal(h.pas(), 240, 'pas');
    });
    test('N.horloge : temps() s arrête pendant le gel, la pause et les cartes', function () {
      var etat = 'jeu', pause = false;
      var h = hz({ paused: function () { return pause; }, etat: function () { return etat; } });
      rouler(h, 1 / 60, 1.0);
      var t0 = h.t(), m0 = JSON.stringify(h.temps());
      h.geler(0.5); rouler(h, 1 / 60, 0.4); egal(h.t(), t0, 'gel'); egal(JSON.stringify(h.temps()), m0, 'temps() pendant le gel');
      rouler(h, 1 / 60, 0.2);
      var t1 = h.t(); vrai(t1 > t0, 'reprend après le gel');
      pause = true; rouler(h, 1 / 60, 1); egal(h.t(), t1, 'pause'); vrai(h.arretee(), 'arretee() en pause'); pause = false;
      ['cartes', 'pause', 'panneau', 'fin', 'initiales', 'titre', 'briefing', 'ouverture', 'demarrage'].forEach(function (e) {
        etat = e; var a = h.t(); rouler(h, 1 / 60, 0.25); egal(h.t(), a, 'état ' + e);
      });
      ['jeu', 'nettoyage', 'vol', 'defile', 'alerte', 'boss', 'reapparition', 'victoire', 'attraction', 'plongee', 'mort'].forEach(function (e) {
        etat = e; var a = h.t(); rouler(h, 1 / 60, 0.25); vrai(h.t() > a, 'état ' + e + ' : l horloge avance');
      });
    });
    test('N.horloge : le gel ne s use pas quand l horloge est arrêtée ; le plus long gagne', function () {
      var arr = false, h = hz({ arretee: function () { return arr; } }), g = 0;
      h.geler(0.1); h.geler(0.05); proche(h.resteGel(), 0.1, 1e-12, 'pas de cumul, le plus long gagne');
      arr = true; rouler(h, 1 / 60, 1); proche(h.resteGel(), 0.1, 1e-12, 'gel intact pendant l arrêt'); arr = false;
      rouler(h, 1 / 60, 0.5, function (x) { if (x.gele()) g += x.H; });
      proche(g, 0.1, 1 / 120 + 1e-9, 'gel consommé après la reprise');
    });
    test('N.horloge : grille musicale de jeu à 144,6 BPM (temps(), franchi(), prochainTemps())', function () {
      var h = hz(), temps = 0, mesures = 0;
      rouler(h, 1 / 60, 10, function (x) { var f = x.franchi(); if (f.temps) temps++; if (f.mesure) mesures++; });
      var b = 10 * 144.6 / 60;
      proche(temps, Math.floor(b), 1, 'temps franchis en 10 s'); proche(mesures, Math.floor(b / 4), 1, 'mesures franchies');
      var tp = h.temps(); egal(tp.mesure, Math.floor(Math.floor(h.t() / (60 / 144.6)) / 4), 'mesure');
      vrai(tp.temps >= 0 && tp.temps <= 3 && tp.phase >= 0 && tp.phase < 1, 'temps 0..3, phase [0,1[');
      var p = h.prochainTemps(); vrai(p > h.t() && p - h.t() <= 60 / 144.6 + 1e-9, 'prochain temps');
      h.reset(); egal(h.t(), 0, 'reset t'); egal(h.pas(), 0, 'reset pas');
    });

    /* ============================================================================ socle : N.journal */
    test('N.journal : interface', function () {
      vrai(typeof N.journal === 'function', 'N.journal est une fonction');
      ['dump', 'lire', 'dernier', 'actif', 'vider', 'compte', 'taille', 'creer'].forEach(function (k) { vrai(typeof N.journal[k] === 'function', 'N.journal.' + k); });
      egal(N.journal.taille(), 65536, 'taille');
    });
    test('N.journal : l anneau garde les 65 536 dernières entrées, du plus ancien au plus récent', function () {
      var J = N.journal.creer(65536, hz()); J.actif(true);
      for (var i = 0; i < 70000; i++) J('kill', { n: i });
      var d = J.dump(); egal(d.length, 65536, 'longueur'); egal(d[0].d.n, 70000 - 65536, 'plus ancien'); egal(d[65535].d.n, 69999, 'plus récent');
      egal(J.compte(), 70000, 'compte'); egal(J.dernier('kill').d.n, 69999, 'dernier');
      J.dump({ vider: true }); egal(J.dump().length, 0, 'vidé');
    });
    test('N.journal : dump() rend du JSON valide, et des copies', function () {
      var hh = hz(); hh.avancer(); hh.avancer();
      var J = N.journal.creer(16, hh); J.actif(true);
      var src = { a: 1, nan: NaN, inf: Infinity, ta: new Float32Array([1.5, 2]), f: function () {}, u: undefined, o: { p: [1, { q: 2 }] } };
      J('lasso', src); src.a = 99; src.o.p[0] = 42;
      var d = J.dump(), s = J.dump({ json: true }), back = JSON.parse(s);
      egal(JSON.stringify(back), JSON.stringify(d), 'aller-retour JSON');
      var r = d[0]; egal(r.pas, 2, 'pas'); proche(r.t, 2 / 120, 1e-12, 't'); egal(r.type, 'lasso', 'type');
      egal(r.d.a, 1, 'copie à l écriture'); egal(r.d.o.p[0], 1, 'copie profonde'); egal(r.d.nan, null, 'NaN'); egal(r.d.inf, null, 'Infinity');
      memesListes(r.d.ta, [1.5, 2], 'tableau typé'); vrai(!('f' in r.d) && !('u' in r.d), 'fonction et undefined omis');
      vrai(['pas', 't', 'image', 'type', 'd'].every(function (k) { return k in r; }), 'champs de l enregistrement');
    });
    test('N.journal : hors journal complet, seuls coup, mort, kill, vague (et partie, perdu) sont gardés', function () {
      var J = N.journal.creer(64); J.actif(false);
      ['coup', 'mort', 'kill', 'vague', 'partie', 'perdu', 'apparition', 'tele', 'sfx', 'vue', 'lasso'].forEach(function (t) { J(t, {}); });
      memesListes(J.dump().map(function (r) { return r.type; }), ['coup', 'mort', 'kill', 'vague', 'partie', 'perdu'], 'gardés');
    });
    test('N.journal : chaque type du § 7.9 a son validateur, qui accepte l exemple et refuse le défaut', function () {
      var types79 = ['apparition', 'portail', 'armement', 'tele', 'tirEnnemi', 'coup', 'kill', 'lasso', 'coupe', 'mort', 'ramassage',
        'carte', 'niveau', 'vague', 'vol', 'inversion', 'arene', 'phase', 'defi', 'deblocage', 'geste', 'section', 'bloc', 'flash', 'sfx', 'vue', 'perf'];
      types79.forEach(function (t) { vrai(N.ids.journal.indexOf(t) >= 0, 'type ' + t + ' dans N.ids.journal'); });
      N.ids.journal.forEach(function (t) {
        var ex = EX_JOURNAL[t]; vrai(ex, 'exemple de ' + t + ' dans la suite');
        var rec = { pas: 3, t: 0.025, image: 1, type: t, d: ex };
        var e = N.ids.valider('journal:' + t, rec); vrai(e.length === 0, t + ' : ' + e.join(' ; '));
        var mauvais = { pas: 3, t: 0.025, image: 1, type: t, d: { zzz: 1 } };
        vrai(N.ids.valider('journal:' + t, mauvais).length > 0 || t === 'pilote', t + ' : un enregistrement vide doit être refusé');
        vrai(N.ids.valider('journal:' + t, { pas: -1, t: 0, image: 0, type: t, d: ex }).length > 0, t + ' : pas négatif refusé');
      });
    });
    test('N.journal : le consommateur 90 écrit apparition (avec la vue), armement, coup (tête et corps)', function () {
      var J = N.journal.creer(64); J.actif(true);
      var b = N.ev.creer({ journal: J, signaler: function () {} });
      N.socle.brancherJournal(b, J);
      b.emit('arme', EX_CHARGES.arme); b.emit('mort', EX_CHARGES.mort); b.emit('coup', EX_CHARGES.coup); b.emit('apparition', EX_CHARGES.apparition);
      var d = J.dump();
      memesListes(d.map(function (r) { return r.type; }), ['armement', 'mort', 'coup', 'coup', 'apparition'], 'enregistrements');
      d.forEach(function (r) { var e = N.ids.valider('journal:' + r.type, r); vrai(e.length === 0, r.type + ' : ' + e.join(' ; ')); });
      egal(d[2].d.partie, 'tete', 'coup de la mort'); egal(d[3].d.partie, EX_CHARGES.coup.partie, 'coup');
      N.ids.evenements.forEach(function (e) { egal(b.consommateurs(e).length, 1, 'branché sur ' + e); });
    });

    /* ============================================================================ socle : N.ids */
    test('N.ids : listes figées du § 7.5', function () {
      memesListes(N.ids.ennemis, ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'lame', 'ruche', 'sentinelle', 'rival', 'planeur', 'traqueur'], 'ennemis');
      memesListes(N.ids.armes, ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ'], 'armes');
      memesListes(N.ids.cartes, ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ', 'puissance', 'cadence', 'aimant', 'croissance',
        'reparation', 'bouclier', 'eperon', 'grappe', 'sangFroid', 'braise', 'traversee', 'ralenti', 'repli'], 'cartes');
      memesListes(N.ids.causes, ['mur', 'morsure', 'ennemi', 'tir', 'laser', 'souffle', 'convoi', 'traine'], 'causes');
      memesListes(N.ids.etats, ['demarrage', 'ouverture', 'titre', 'attraction', 'briefing', 'plongee', 'jeu', 'nettoyage', 'cartes', 'vol', 'defile',
        'alerte', 'panneau', 'boss', 'mort', 'reapparition', 'victoire', 'fin', 'initiales', 'pause'], 'états');
      memesListes(N.ids.sections, ['titre', 'attraction', 'briefing', 'jeu', 'repit', 'alerte', 'boss', 'victoire', 'defaite', 'initiales'], 'sections');
      memesListes(N.ids.quartiers, ['docks', 'artere', 'centrale', 'ciel', 'tours', 'coeur', 'eclipse'], 'quartiers');
      egal(N.ids.defis.length, 13, 'défis : finir et 12'); egal(N.ids.defis[0], 'finir', 'finir d abord');
      memesListes(N.ids.deblocages, ['ralenti', 'repli', 'styles', 'galerie', 'departV3'], 'déblocages');
      memesListes(N.ids.scenes, ['charge', 'v5', 'boss3', 'mur', 'morsure', 'lasso6', 'mortTir', 'cartes', 'fin', 'vol', 'inversion', 'convoi',
        'travelling', 'calme', 'montee', 'chaos', 'colosse'], 'scènes');
      memesListes(N.ids.pilotes, ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain', 'bon', 'expert', 'dieu'], 'pilotes');
      ['tir', 'salve', 'boostOn', 'boostOff', 'boostPanne', 'traversee', 'ralenti', 'repli', 'pouvoirPret', 'ultimePret', 'ultime', 'lasso', 'fermable',
        'vie', 'porte', 'devore', 'impact', 'impactBoss', 'ricochet', 'kill', 'bigkill', 'crash', 'explosion', 'colosseMort', 'tirEnnemi', 'arme',
        'portail', 'traqueur', 'convoi', 'travelling', 'warning', 'butin', 'noyau', 'pastille', 'coupe', 'mort', 'gameover', 'battement', 'palier',
        'levelup', 'carte', 'choix', 'vague', 'defi', 'defiRate', 'record', 'bip', 'clic'].forEach(function (s) { vrai(N.ids.sons.indexOf(s) >= 0, 'son ' + s); });
      egal(N.ids.sons.length, 48, 'sons du § 5.8');
      vrai(Object.isFrozen(N.ids) && Object.isFrozen(N.ids.ennemis) && Object.isFrozen(N.ids.tableEtats), 'gelé');
    });
    test('N.ids : table des états (§ 7.6) : horloge et section de chaque état', function () {
      var T = N.ids.tableEtats, arr = [];
      N.ids.etats.forEach(function (e) { vrai(T[e], 'état ' + e); if (T[e].horloge === 'arretee') arr.push(e); if (T[e].section) vrai(N.ids.sections.indexOf(T[e].section) >= 0, 'section de ' + e); });
      memesListes(arr.sort(), ['briefing', 'cartes', 'demarrage', 'fin', 'initiales', 'ouverture', 'panneau', 'pause', 'titre'], 'horloge arrêtée');
      egal(T.mort.horloge, 'ralentie', 'mort'); egal(T.defile.section, 'repit', 'défilé'); egal(T.boss.section, 'boss', 'boss');
      ['ouverture', 'briefing', 'panneau', 'fin', 'initiales'].forEach(function (e) { vrai(T[e].plein, e + ' couvre l écran'); });
    });
    test('N.ids : table des événements (§ 7.4) : rangs, émetteur, schéma de charge', function () {
      var R = N.ids.rangs;
      memesListes([R.regles, R.score, R.xp, R.apogee, R.butin, R.armes, R.scene, R.hud, R.defis, R.journal], [10, 20, 30, 35, 40, 50, 60, 70, 80, 90], 'rangs');
      N.ids.evenements.forEach(function (e) {
        var t = N.ids.tableEvenements[e]; vrai(t && t.emetteur && t.conso.length, 'événement ' + e);
        vrai(t.conso.some(function (c) { return c[0] === 90 && c[1] === '03-socle'; }), e + ' : journal au rang 90');
        var ex = EX_CHARGES[e]; vrai(ex, 'exemple de charge ' + e);
        var er = N.ids.valider('charge:' + e, ex); vrai(er.length === 0, e + ' : ' + er.join(' ; '));
        vrai(N.ids.valider('charge:' + e, {}).length > 0, e + ' : charge vide refusée');
      });
      memesListes(N.ids.tableEvenements.kill.conso.map(function (c) { return c[0]; }), [10, 20, 30, 35, 40, 50, 60, 70, 80, 90], 'kill : la chaîne du § 7.4');
    });
    test('N.ids.valider : chaque schéma accepte son exemple et refuse les défauts', function () {
      Object.keys(EX_SCHEMAS).forEach(function (g) {
        var e = N.ids.valider(g, EX_SCHEMAS[g]); vrai(e.length === 0, g + ' : ' + e.join(' ; '));
      });
      var en = JSON.parse(JSON.stringify(EX_SCHEMAS.ennemi));
      en._prive = 3; egal(N.ids.valider('ennemi', en).length, 0, 'champ privé « _ » permis');
      en.nouveau = 1; vrai(N.ids.valider('ennemi', en).length === 1, 'champ non prévu refusé');
      delete en.nouveau; en.type = 'cyan'; vrai(N.ids.valider('ennemi', en).length > 0, 'type inconnu refusé');
      en.type = 'fleche'; en.dir = 16; vrai(N.ids.valider('ennemi', en).length > 0, 'dir hors 0..15 refusé');
      en.dir = 3; en.vuDepuis = -0.5; vrai(N.ids.valider('ennemi', en).length > 0, 'vuDepuis -1 ou ≥ 0');
      en.vuDepuis = -1; en.type = 'cyclope'; vrai(N.ids.valider('ennemi', en).length > 0, 'cyclope sans boss refusé');
      en.boss = true; en.partie = 'oeil'; egal(N.ids.valider('ennemi', en).length, 0, 'partie du CYCLOPE');
      var d = JSON.parse(JSON.stringify(EX_SCHEMAS.death)); d.cause = 'chute'; vrai(N.ids.valider('death', d).length > 0, 'cause hors liste');
      var s = { genre: 'arme', type: 'tourelle', id: 1 }; vrai(N.ids.valider('src', s).length > 0, 'type de source incompatible avec le genre');
      var m = JSON.parse(JSON.stringify(EX_SCHEMAS.mods)); m.grappe = 3; vrai(N.ids.valider('mods', m).length > 0, 'grappe ≤ 2');
      var t = JSON.parse(JSON.stringify(EX_SCHEMAS.tele)); t.forme = 'cercle'; vrai(N.ids.valider('tele', t).length > 0, 'forme de télégraphe');
      vrai(N.ids.valider('inconnu', {}).length > 0, 'genre inconnu');
    });
    test('N.ids.texte : un nom pour chaque couple cause × auteur, et les exemples du plan', function () {
      egal(N.ids.texte('tir', 'tourelle'), 'TIR DE TOURELLE', 'tir de tourelle');
      egal(N.ids.texte('mur', 'murMobile'), 'MUR ARRIÈRE', 'mur arrière');
      egal(N.ids.texte('traine', 'rival'), 'TRAÎNÉE DU RIVAL', 'traînée');
      N.ids.causes.forEach(function (c) { N.ids.auteurs.forEach(function (a) { var x = N.ids.texte(c, a); vrai(typeof x === 'string' && x.length > 0 && x.length <= 30, c + '/' + a + ' : ' + x); }); });
    });
    test('N.ids : catalogue des sprites (§ 7.5, lots 6a et 6b)', function () {
      var C = N.ids.sprites, noms = N.ids.listeSprites;
      ['tete', 'tete:dos', 'corps', 'dard', 'larve', 'traqueur', 'pastille', 'noyau', 'fleche:armee', 'lance', 'rayon', 'portail', 'vieMini',
        'lame', 'lame:deployee', 'ruche', 'ruche:p1', 'ruche:p2', 'rival', 'rival:perle', 'planeur', 'fleche:elite', 'ruche:elite', 'plaque',
        'couronne', 'wagon', 'colosse:tronc', 'colosse:oeil', 'colosse:oeilFerme', 'colosse:main', 'colosse:plaque', 'colosse:carcasse',
        'colosseLoin', 'colosseMi', 'tourelleJ', 'drone', 'missile', 'mineJ', 'orbe'].forEach(function (n) { vrai(C[n], 'sprite ' + n); });
      N.ids.ennemis.forEach(function (t) { vrai(C['mini:' + t], 'mini:' + t); });
      N.ids.cartes.forEach(function (t) { vrai(C['carte:' + t] && C['carte:' + t].w === 16 && C['carte:' + t].h === 16, 'carte:' + t); });
      noms.forEach(function (n) { var s = C[n]; vrai(s.w > 0 && s.h > 0 && (s.dirs === 1 || s.dirs === 16) && s.images >= 1, n + ' bien formé'); });
      egal(C.colosseLoin.w, 48, 'silhouette lointaine'); egal(C.colosseMi.w, 80, 'silhouette intermédiaire'); egal(C['colosse:main'].w, 24, 'main');
      egal(C.wagon.w, 18, 'wagon'); egal(C.wagon.h, 14, 'wagon h');
    });
    test('N.ids.suivant et N.socle : identifiants, remise à zéro commune', function () {
      vrai(typeof N.socle.reset === 'function' && typeof N.socle.signaler === 'function' && N.socle.version === '1.0', 'N.socle');
      vrai(typeof N.ids.suivant === 'function' && typeof N.socle.brancherJournal === 'function', 'N.ids.suivant, N.socle.brancherJournal');
    });

    /* ============================================================================ palette */
    groupe = 'palette';
    test('N.pal.L : luminances WCAG du § 5.1, et encres lumineuses', function () {
      var att = [0.002, 0.006, 0.012, 0.041, 0.024, 0.240, 0.438, 0.555, 0.873, 0.457, 0.679, 0.281, 0.967, 0.277, 0.061, 0.002];
      vrai(N.pal && N.pal.L && N.pal.L.length === 16, 'N.pal.L');
      for (var i = 0; i < 16; i++) proche(N.pal.L[i], att[i], 1e-6, 'L[' + N.pal.NAMES[i] + ']');
      function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
      for (var j = 0; j < 16; j++) proche(0.2126 * lin(N.pal.R[j]) + 0.7152 * lin(N.pal.G[j]) + 0.0722 * lin(N.pal.B[j]), att[j], 0.0006, 'WCAG ' + N.pal.NAMES[j]);
      var lum = []; for (var k = 0; k < 16; k++) if (N.pal.lumineux(k)) lum.push(N.pal.NAMES[k]);
      memesListes(lum, ['magenta', 'rosePale', 'cyan', 'cyanPale', 'ambre', 'jaune', 'brasier', 'os', 'acier'], 'lumineuses');
      vrai(N.pal.lumineux('jaune') && !N.pal.lumineux('sang'), 'par nom');
    });

    /* ============================================================================ regles */
    groupe = 'regles';
    var R = N.R;
    test('N.R : présent, version 1.0, gelé en profondeur', function () {
      vrai(R && R.version === '1.0', 'version');
      var nonGeles = [];
      (function parc(o, p) { if (o && typeof o === 'object') { if (!Object.isFrozen(o)) nonGeles.push(p); for (var k in o) parc(o[k], p + '.' + k); } })(R, 'R');
      egal(nonGeles.length, 0, 'objets non gelés : ' + nonGeles.slice(0, 5).join(', '));
    });
    test('N.R : les clés du livrable (§ 8.3, lot 0a)', function () {
      ['joueuse', 'mort', 'butin', 'cartes', 'armes', 'passifs', 'pouvoirs', 'apogee', 'lasso', 'inversion', 'score', 'defis', 'deblocages',
        'camera', 'decor', 'vol', 'arene', 'ennemis', 'elites', 'colosse', 'secteurs', 'son', 'perf'].forEach(function (k) { vrai(R[k] !== undefined, 'N.R.' + k); });
      vrai(R.decor.quartiers && R.decor.lumiere, 'N.R.decor : quartiers et cibles de lumière');
      vrai(R.secteurs[0].vagues.length === 5 && R.formations && R.secteurs[0].defile, 'N.R.secteurs[0] : vagues, formations, événements');
    });
    test('N.R : les valeurs du plan (échantillon de contrôle, ligne par ligne)', function () {
      var faux = [];
      VALEURS.forEach(function (v) {
        var x = chemin(R, v[0]);
        var ok = (typeof v[1] === 'number') ? (typeof x === 'number' && Math.abs(x - v[1]) < 1e-9) : JSON.stringify(x) === JSON.stringify(v[1]);
        if (!ok) faux.push(v[0] + ' = ' + JSON.stringify(x) + ' au lieu de ' + JSON.stringify(v[1]) + ' (' + v[2] + ')');
      });
      vrai(faux.length === 0, faux.length + ' écarts : ' + faux.slice(0, 6).join(' | '));
    });
    test('N.R.f : les formules', function () {
      proche(R.f.traine(8), 1.36, 1e-9, 'traînée à 8'); proche(R.f.traine(40), 2.0, 1e-9, 'traînée à 40'); proche(R.f.traine(40, 2), 2.4, 1e-9, 'BRAISE ×2');
      egal(R.f.degatsLasso(8), 72, 'lasso à 8'); egal(R.f.degatsLasso(40, 2), 300, 'lasso à 40 BRAISE ×2');
      egal(R.f.mult(0), 1, 'mult 0'); egal(R.f.mult(4), 1, 'mult 4'); egal(R.f.mult(5), 2, 'mult 5'); egal(R.f.mult(99), 8, 'plafond');
      egal(R.f.objectif(11), 4, '« ×3 DANS 4 »'); egal(R.f.objectif(40), 0, 'au plafond');
      egal(R.f.longueurReapparition(30), 15, 'L / 2'); egal(R.f.longueurReapparition(9), 8, 'au moins 8'); egal(R.f.longueurReapparition(17), 9, 'arrondi au-dessus');
      egal(R.f.longueurCoupe(1), 3, 'max(3, k)'); egal(R.f.cellulesCoupe(20, 10), 5, 'une cellule pour deux segments');
      egal(R.f.horizon(195, 0, false), 156, 'horizon paysage c=0'); egal(R.f.horizon(195, 1, false), 74, 'horizon paysage c=1');
      egal(R.f.horizon(422, 1, true), 177, 'horizon portrait c=1');
      egal(R.f.bonusCyclope(70), 10000, 'bonus de temps'); egal(R.f.bonusCyclope(130), 0, 'jamais négatif');
      egal(R.f.devore(0), 200, 'dévoré 1'); egal(R.f.devore(5), 1600, 'dévoré 6');
      proche(R.f.virage(68), 68 / 11, 1e-9, 'virage');
      egal(R.f.deflexion(0.1), 0, 'zone morte'); egal(R.f.deflexion(0.8), 1, 'plein'); proche(R.f.deflexion(0.41), 0.5, 1e-9, 'proportionnel');
      egal(R.f.niveau(5), 0, 'niveau'); egal(R.f.niveau(6), 1, 'niveau 1'); egal(R.f.niveau(200), 10, 'niveau max');
      egal(R.f.tailleMain(1), 3, 'main'); egal(R.f.tailleMain(3), 5, 'main CHOISIS 3');
    });
    test('N.R : cohérence avec N.ids', function () {
      N.ids.cartes.forEach(function (c) { vrai(R.cartes.liste[c], 'carte ' + c); vrai(N.ids.raretes.indexOf(R.cartes.liste[c].rarete) >= 0, 'rareté de ' + c); });
      N.ids.armes.forEach(function (a) { vrai(R.armes[a] && R.armes[a].paliers.length === 4, 'arme ' + a + ' à 4 paliers'); });
      N.ids.passifs.forEach(function (p) { vrai(R.passifs[p], 'passif ' + p); });
      N.ids.pouvoirs.forEach(function (p) { vrai(R.pouvoirs[p] && R.pouvoirs[p].duree > 0 && R.pouvoirs[p].recharge > 0, 'pouvoir ' + p); });
      N.ids.ennemis.forEach(function (e) { vrai(R.ennemis[e] && R.ennemis[e].codex, 'ennemi ' + e); vrai(typeof R.score.base[e] === 'number', 'points de ' + e); });
      N.ids.defis.slice(1).forEach(function (d) { vrai(R.defis.reserve[d], 'défi ' + d); });
      var dv = []; for (var v = 1; v <= 5; v++) R.defis.vague.liste[v].forEach(function (x) { dv.push(x.id); });
      memesListes(dv, N.ids.defisVague, 'défis de vague');
      memesListes(R.deblocages.map(function (d) { return d.id; }), N.ids.deblocages, 'déblocages');
      memesListes(Object.keys(R.decor.quartiers), N.ids.quartiers, 'quartiers');
      N.ids.formations.forEach(function (f) { vrai(R.formations[f] && R.formations[f].nom, 'formation ' + f); });
      N.ids.elites.forEach(function (e) { vrai(R.elites[e] && N.ids.ennemis.indexOf(R.elites[e].type) >= 0, 'élite ' + e); });
      var mods = JSON.parse(JSON.stringify(R.passifs.mods)); var em = N.ids.valider('mods', mods); vrai(em.length === 0, 'mods initiaux : ' + em.join(';'));
      var rg = JSON.parse(JSON.stringify(R.reglages)); var er = N.ids.valider('reglages', rg); vrai(er.length === 0, 'réglages : ' + er.join(';'));
      R.secteurs[0].vagues.forEach(function (w) {
        vrai(N.ids.quartiers.indexOf(w.quartier) >= 0 && N.ids.etatsDecor.indexOf(w.etat) >= 0, 'vague ' + w.n + ' : quartier et état');
        w.formations.forEach(function (f) { vrai(R.formations[f.f], 'vague ' + w.n + ' : formation ' + f.f); vrai(f.t >= 0 && f.t < w.duree, 'vague ' + w.n + ' : instant'); });
        if (w.pic) { var p = w.pic.t / w.duree; vrai(p >= 0.55 && p <= 0.75, 'vague ' + w.n + ' : pic entre 55 et 75 %'); vrai(R.elites[w.pic.elite], 'élite du pic'); }
        egal(w.vitesse, R.joueuse.vitesse['v' + w.n], 'vague ' + w.n + ' : vitesse de croisière');
      });
      var pics = R.secteurs[0].vagues.map(function (w) { return w.plafond; });
      vrai(pics.every(function (x, i) { return i === 0 || x > pics[i - 1]; }), 'plafonds croissants');
      vrai(!R.secteurs[0].vagues[0].tirsEnnemis, 'aucun tir ennemi en V1');
      var tot = 0; for (var k in R.perf.budget) if (k !== 'total') tot += R.perf.budget[k];
      proche(tot, R.perf.budget.total, 1e-9, 'le budget de performance se somme à 11 ms');
      R.ecrans.conseils.forEach(function (c) { vrai(typeof c[1] === 'string' && c[1].length > 0, 'conseil ' + c[0]); });
    });

    /* ============================================================================ modules (si 1.0) */
    groupe = 'modules';
    test('N.game.etat() rend un état de N.ids.etats', function () {
      if (!N.game || typeof N.game.etat !== 'function') return 'absent';
      vrai(N.ids.etats.indexOf(N.game.etat()) >= 0, 'état : ' + N.game.etat());
    });
    test('90-boot alimente N.horloge (le pas avance avec le temps de jeu)', function () {
      if (!opts.pasAvant && opts.pasAvant !== 0) return 'absent';
      if (opts.pasApres <= opts.pasAvant) return 'absent';
      vrai(opts.pasApres > opts.pasAvant, 'pas');
    });
    test('N.fx.hitstop(n) pose un gel de n / 60 s sur N.horloge', function () {
      if (!N.fx || typeof N.fx.tele !== 'function' || typeof N.fx.hitstop !== 'function') return 'absent';
      var avant = N.horloge.resteGel(); N.fx.hitstop(6);
      proche(N.horloge.resteGel(), Math.max(avant, 0.1), 1e-9, 'gel');
    });
    test('S.enemies, S.shots, S.tele : objets au schéma du § 7.5', function () {
      if (!N.ennemis || typeof N.ennemis.spawn !== 'function' || !S) return 'absent';
      (S.enemies || []).forEach(function (e) { var er = N.ids.valider('ennemi', e); vrai(er.length === 0, er.join(';')); });
      (S.shots || []).forEach(function (t) { var er = N.ids.valider('tir', t); vrai(er.length === 0, er.join(';')); });
      (S.tele || []).forEach(function (t) { var er = N.ids.valider('tele', t); vrai(er.length === 0, er.join(';')); });
    });
    test('N.ennemis : spawn(fleche) au schéma ; hit jusqu à 0 PV émet kill une seule fois', function () {
      if (!N.ennemis || typeof N.ennemis.spawn !== 'function' || typeof N.ennemis.hit !== 'function') return 'absent';
      var J = N.journal, av = J.actif(); J.actif(true);
      var e = N.ennemis.spawn('fleche', 512, 256, {});
      vrai(e && N.ennemis.list.indexOf(e) >= 0, 'dans list');
      var er = N.ids.valider('ennemi', e); vrai(er.length === 0, er.join(';'));
      var n0 = J.compte(), src = { genre: 'arme', type: 'canon', id: -1 }, k = 0;
      while (e.pv > 0 && k++ < 100) N.ennemis.hit(e, 10, src);
      N.ennemis.hit(e, 10, src);
      var kills = J.dump().slice(-(J.compte() - n0)).filter(function (r) { return r.type === 'kill' && r.d.id === e.id; });
      egal(kills.length, 1, 'un seul kill');
      var ek = N.ids.valider('journal:kill', kills[0]); vrai(ek.length === 0, ek.join(';'));
      J.actif(av);
    });
    test('N.joueuse.tuer(cause, src) remplit S.death au schéma', function () {
      if (!N.joueuse || typeof N.joueuse.tuer !== 'function' || !S) return 'absent';
      if (N.game && N.game.dbg && typeof N.game.dbg.god === 'function') N.game.dbg.god(false);
      N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 });
      if (!S.death) return 'S.death absent après tuer';
      var er = N.ids.valider('death', S.death); vrai(er.length === 0, er.join(';'));
    });
    test('S.player, N.cartes.mods, S.reglages, S.input : au schéma', function () {
      var vu = false;
      if (S && S.player && 'angVise' in S.player) { vu = true; var a = N.ids.valider('player', S.player); vrai(a.length === 0, a.join(';')); }
      if (N.cartes && N.cartes.mods) { vu = true; var b = N.ids.valider('mods', N.cartes.mods); vrai(b.length === 0, b.join(';')); }
      if (S && S.reglages) { vu = true; var c = N.ids.valider('reglages', S.reglages); vrai(c.length === 0, c.join(';')); }
      if (S && S.input && S.input.gestes) { vu = true; var d = N.ids.valider('input', S.input); vrai(d.length === 0, d.join(';')); }
      return vu ? true : 'absent';
    });
    test('N.spr.catalogue() couvre le catalogue figé', function () {
      if (!N.spr || typeof N.spr.catalogue !== 'function') return 'absent';
      var c = N.spr.catalogue(), noms = {};
      (Array.isArray(c) ? c : Object.keys(c).map(function (k) { return c[k]; })).forEach(function (s) { noms[s.nom || s.name] = 1; });
      var manque = N.ids.listeSprites.filter(function (n) { return !noms[n]; });
      vrai(manque.length === 0, 'manquent : ' + manque.slice(0, 8).join(', '));
    });

    var groupes = {};
    res.forEach(function (r) {
      var g = groupes[r.groupe] || (groupes[r.groupe] = { ok: true, reussis: 0, echecs: 0, absents: 0 });
      if (r.absent) g.absents++; else if (r.ok) g.reussis++; else { g.echecs++; g.ok = false; }
    });
    var ok = Object.keys(groupes).every(function (g) { return groupes[g].ok; });
    return { ok: ok, groupes: groupes, resultats: res };
  }

  /* ---------------------------------------------------------------- exemples valides */
  var SRC = { genre: 'arme', type: 'canon', id: -1 };
  var DEATH = { cause: 'tir', auteur: 'tourelle', auteurId: 42, x: 300, y: 200, t: 127.5, vague: 3, quartier: 'centrale', visibleDepuis: 2.4, teleDuree: 0.75 };
  var EX_CHARGES = {
    kill: { id: 12, type: 'fleche', x: 100, y: 80, elite: false, boss: false, base: 50, src: SRC, distTete: 40, gen: 0 },
    coup: { partie: 'corps', k: 9, cause: 'tir', auteur: 'tourelle', auteurId: 42, x: 90, y: 70, absorbe: false, visibleDepuis: 1.2, teleDuree: 0.75 },
    coupe: { k: 9, perdus: 11, cause: 'tir', auteur: 'tourelle', x: 90, y: 70 },
    mort: DEATH,
    ramassage: { type: 'cellule', x: 10, y: 20, valeur: 1 },
    lasso: { n: 5, ids: [1, 2, 3, 4, 5], aire: 1800, x: 400, y: 300, poly: [1, 2, 3, 4, 5, 6] },
    niveau: { niveau: 2, enAttente: 1 },
    carte: { id: 'tourelles', niveau: 1 },
    vague: { n: 2, etape: 'vague', evt: 'entree', nom: 'MEUTE', quartier: 'artere' },
    vol: { evt: 'porte', parfait: false, vers: 'artere', portes: 3, mines: 0 },
    inversion: { evt: 'debut', dur: 6 },
    arene: { evt: 'convoiAnnonce', voie: 2, vx: 0 },
    phase: { n: 2, evt: 'entree' },
    apparition: { id: 31, type: 'dard', x: 700, y: 100, elite: false },
    portail: { type: 'dard', x: 700, y: 100, dur: 0.6, elite: false },
    arme: { id: 31, type: 'tourelle', forme: 'ligne', total: 0.75, cible: 'tete', shown: true, rallonge: false },
    pouvoir: { id: 'traversee', evt: 'debut' },
    apogee: { id: 'apogee', evt: 'debut' },
    boost: { id: 'boost', evt: 'on' },
    defi: { id: 'lasso6', ok: true, prime: 10000 },
    deblocage: { id: 'ralenti' }
  };
  var EX_JOURNAL = {
    apparition: { id: 31, type: 'dard', x: 700, y: 100, elite: false, vue: { x: 0, y: 0, w: 422, h: 195 }, anticipee: { x: 40, y: 0, w: 422, h: 195 }, distTete: 200 },
    portail: { type: 'dard', x: 700, y: 100, dur: 0.6, elite: false },
    armement: EX_CHARGES.arme,
    tele: { id: 5, forme: 'ligne', total: 0.6, cible: 'tete', par: { type: 'fleche', id: 12 } },
    tirEnnemi: { id: 77, src: { genre: 'ennemi', type: 'tourelle', id: 42 }, x: 10, y: 10 },
    coup: { partie: 'tete', k: 0, cause: 'tir', auteur: 'tourelle', auteurId: 42, visibleDepuis: 2.4, teleDuree: 0.75, absorbe: false },
    geste: { genre: 'toucher', doigt: 'action', duree: 0.12, deplacement: 3, action: 'pouvoir' },
    section: { nom: 'jeu' },
    bloc: { fichier: 'nv-03.mp3', t0: 12.5, decalage: 0.0011 },
    flash: { aire: 0.12, accepte: true },
    sfx: { nom: 'kill', demande: true, joue: true },
    vue: { x: 300, y: 120, w: 422, h: 195, devant: 131, teteX: 500, teteY: 210 },
    perf: { ms: 9.1, modules: { crt: 5.2 }, tube: 'riche' },
    perdu: { nom: 'kill', parPas: 65 },
    partie: { graine: 2975, mode: null },
    pilote: { nom: 'bon', evt: 'cap', vise: 1.2, bruit: 0, retard: 0.08 }
  };
  ['kill', 'lasso', 'coupe', 'mort', 'ramassage', 'carte', 'niveau', 'vague', 'vol', 'inversion', 'arene', 'phase', 'defi', 'deblocage',
    'pouvoir', 'apogee', 'boost'].forEach(function (t) { EX_JOURNAL[t] = EX_CHARGES[t]; });
  var EX_SCHEMAS = {
    src: { genre: 'ennemi', type: 'tourelle', id: 42 },
    ennemi: { id: 1, type: 'fleche', x: 10, y: 20, vx: 0, vy: 0, r: 5, ang: 0, pv: 20, pvMax: 20, etat: 'approche', etatT: 0.5, vuDepuis: -1,
      elite: false, mods: { blinde: false, rapide: false, instable: false }, boss: false, partie: null, tele: -1, img: 0, dir: 3 },
    tir: { id: 2, x: 1, y: 2, vx: 95, vy: 0, r: 2, vie: 1.2, src: { genre: 'ennemi', type: 'tourelle', id: 42 } },
    tele: { id: 3, forme: 'ligne', x0: 0, y0: 0, x1: 67, y1: 0, r: 2, a0: 0, a1: 0, reste: 0.3, total: 0.6, cible: 'tete', par: { type: 'fleche', id: 1 } },
    death: DEATH,
    player: { x: 1, y: 2, ang: 0, angVise: 0.2, vit: 68, len: 8, segs: new Float32Array(16), etat: 'vivant', boost: false, reserve: 100, apogee: 40, pouvoirPret: true },
    mods: { degats: 1.25, cadence: 1, aimant: 48, lenMax: 45, reparation: 1, bouclier: 0, eperon: false, grappe: 2, sangFroid: true, braise: 0 },
    reglages: { musique: true, effets: false, secousse: 0.5, flashs: true, ecran: 'sobre', texte: 2, manche: 1.25, actions: 'auto' },
    input: { x: 1, y: 0, mag: 0.8, boost: false, pouvoir: false, apogee: false, pause: false, valider: false, retour: false, chiffre: 0, car: '', any: true,
      pointer: { x: 0, y: 0, actif: false, boutons: 0 }, manette: { connectee: false, x: 0, y: 0, boutons: 0 },
      gestes: [{ genre: 'toucher', doigt: 'action', t0: 1, t1: 1.1, x: 10, y: 10, dx: 1, dy: 0 }], taps: [{ x: 3, y: 4, t0: 1, t1: 1.1, doigt: 'bouton' }] },
    butin: { id: 4, type: 'noyau', x: 3, y: 4, valeur: 5, vie: 8 },
    voie: { id: 5, y0: 150, y1: 170, etat: 'annonce', sens: 1, x: 0, reste: 1.2 },
    monde: { x0: 0, y0: 0, x1: 1024, y1: 512, vx: 0, vy: 0, mobile: false, annonce: [[100, 0, 676, 512]] },
    vue: { x: 300, y: 100, w: 422, h: 195 },
    ecran: { nom: 'cartes', depuis: 0.5, cartes: ['canon', 'aimant', 'traversee'], choix: 1, pret: true },
    vague: { n: 1, etape: 'vague', nom: 'ÉVEIL', quartier: 'docks', t: 3.5, evt: 'entree' },
    perf: { p50: 6, p90: 8, p95: 9, p99: 12, niveau: 'riche' },
    sprite: { w: 2, h: 2, data: new Uint8Array(4) }
  };

  /* ---------------------------------------------------------------- l'échantillon de contrôle de N.R
     [chemin, valeur attendue, référence du plan] : une ligne par chiffre du plan vérifié ici. La liste
     complète, ligne par ligne, est dans refonte/lots/L0a.md (produite par tools/contrat/liste-R.mjs). */
  var VALEURS = [
    ['temps.h', 1 / 120, '§ 7.2'], ['temps.pasMax', 4, '§ 7.2'], ['temps.bpm', 144.6, '§ 5.7'],
    ['monde.W', 1024, '§ 3.2'], ['monde.H', 512, '§ 3.2'], ['monde.aireVue', 82000, '§ 3.2'], ['monde.mur.epaisseur', 3, '§ 3.2'],
    ['monde.arenaCyclope.w', 448, '§ 3.2'], ['monde.arenaCyclope.h', 256, '§ 3.2'], ['monde.arenaCyclope.duree', 3, '§ 3.2'],
    ['monde.travelling.largeur', 576, '§ 3.2'],
    ['joueuse.dz', 0.12, '§ 2.1'], ['joueuse.rayonVirage', 11, '§ 2.1'], ['joueuse.deflexion.pleine', 0.7, '§ 2.1'], ['joueuse.chevron.ecartDeg', 20, '§ 2.1'],
    ['joueuse.chevron.taille', 7, '§ 2.1'], ['joueuse.souris.seuil', 24, '§ 2.1'], ['joueuse.souris.masqueApres', 1.5, '§ 2.1'], ['joueuse.deriveMaxDeg', 2, '§ 2.1'],
    ['joueuse.vitesse.v1', 68, '§ 2.2'], ['joueuse.vitesse.v2', 72, '§ 2.2'], ['joueuse.vitesse.v3', 76, '§ 2.2'], ['joueuse.vitesse.defile', 76, '§ 2.2'],
    ['joueuse.vitesse.v4', 80, '§ 2.2'], ['joueuse.vitesse.v5', 84, '§ 2.2'], ['joueuse.vitesse.cyclope', 86, '§ 2.2'], ['joueuse.vitesse.cyclopeEnrage', 90, '§ 2.2'],
    ['boost.seuilCourse', 0.85, '§ 2.2'], ['boost.ecartDeg', 15, '§ 2.2'], ['boost.maintien', 0.12, '§ 2.2'], ['boost.doigtTenu', 0.18, '§ 2.2'],
    ['boost.coupureDeg', 30, '§ 2.2'], ['boost.retourImages', 4, '§ 2.2'], ['boost.facteur', 1.6, '§ 2.2'], ['boost.reserve', 100, '§ 2.2'], ['boost.conso', 35, '§ 2.2'],
    ['boost.recharge', 22, '§ 2.2'], ['boost.delaiRecharge', 0.4, '§ 2.2'], ['boost.panne', 2, '§ 2.2'], ['boost.reprise', 25, '§ 2.2'], ['boost.reappui', 10, '§ 2.2'],
    ['boost.basculesMax', 2, '§ 2.2'], ['boost.monteeImages', 7, '§ 2.2'], ['boost.monteePart', 0.95, '§ 2.2'], ['boost.jauge.arcDeg', 270, '§ 2.2'], ['boost.jauge.alerte', 0.2, '§ 2.2'],
    ['boost.sillage.distance', 40, '§ 2.2'], ['boost.sillage.facteur', 1.4, '§ 2.2'],
    ['mort.rayonTete', 3, '§ 2.3'], ['mort.mur.grace', 0.06, '§ 2.3'], ['mort.mur.cosInterieur', 0.2, '§ 2.3'], ['mort.mur.alerte', 24, '§ 2.3'],
    ['mort.morsure.segMin', 6, '§ 2.3'], ['mort.morsure.rayon', 5.5, '§ 2.3'], ['mort.morsure.longueurSure', 9, '§ 2.3'], ['mort.ennemi.facteurRayon', 0.8, '§ 2.3'],
    ['mort.ennemi.apparition', 0.6, '§ 2.3'], ['mort.traineAgeMin', 0.15, '§ 2.3'], ['mort.coupe.rayonSegment', 3.5, '§ 2.3'], ['mort.coupe.expireCellules', 3, '§ 2.3'],
    ['mort.coupe.gelImages', 3, '§ 2.3'], ['mort.coupe.jolt', 3, '§ 2.3'],
    ['vies.depart', 3, '§ 2.4'], ['vies.seuilBonus', 80000, '§ 2.4'], ['vies.max', 4, '§ 2.4'], ['vies.reapparition.candidats', 16, '§ 2.4'],
    ['vies.reapparition.margeMurs', 40, '§ 2.4'], ['vies.reapparition.effaceTirs', 40, '§ 2.4'], ['vies.reapparition.figeRayon', 48, '§ 2.4'],
    ['vies.reapparition.figeDuree', 0.4, '§ 2.4'], ['vies.reapparition.invul', 1, '§ 2.4'], ['vies.reapparition.clignoteHz', 4, '§ 2.4'], ['vies.reapparition.ready', 0.6, '§ 2.4'],
    ['vies.continuer.parPartie', 1, '§ 2.4'],
    ['longueur.depart', 8, '§ 2.5'], ['longueur.espacement', 5, '§ 2.5'], ['longueur.max', 40, '§ 2.5'], ['longueur.parCroissance', 5, '§ 2.5'],
    ['butin.cellule.points', 10, '§ 2.6'], ['butin.noyau.points', 200, '§ 2.6'], ['butin.noyau.apogee', 20, '§ 2.6'], ['butin.noyau.xp', 5, '§ 2.6'],
    ['butin.prise', 8, '§ 2.6'], ['butin.aimant', [28, 48, 68], '§ 2.6'], ['butin.vitesseAimant', 220, '§ 2.6'], ['butin.cellule.expire', 9, '§ 2.6'],
    ['butin.pastille.expire', 12, '§ 2.6'], ['butin.fusion.distance', 10, '§ 2.6'], ['butin.largages.ordinaire', 0.45, '§ 2.6'], ['butin.largages.larve', 0.2, '§ 2.6'],
    ['butin.largages.vol', 24, '§ 2.6'], ['butin.largages.cyclopeParPhase', 8, '§ 2.6'],
    ['xp.seuils', [6, 16, 28, 42, 58, 76, 96, 118, 142, 168], '§ 2.6'],
    ['cartes.nettoyage', 2.5, '§ 2.7'], ['cartes.choixMax', 3, '§ 2.7'], ['cartes.ceremonie.ralenti', 0.15, '§ 2.7'], ['cartes.ceremonie.duree', 0.35, '§ 2.7'],
    ['cartes.main.armesMax', 4, '§ 2.7'], ['cartes.poids.ecole', 1.7, '§ 2.7'], ['cartes.poids.vierge', 0.6, '§ 2.7'], ['cartes.pitie.rare', 3, '§ 2.7'],
    ['cartes.pitie.epique', 7, '§ 2.7'], ['cartes.cibleMinPt', 44, '§ 2.7'], ['cartes.garde', 0.4, '§ 2.7'],
    ['armes.canon.paliers.0.cadence', 6.5, '§ 2.8'], ['armes.canon.paliers.0.portee', 130, '§ 2.8'], ['armes.canon.paliers.0.vitesse', 210, '§ 2.8'],
    ['armes.canon.paliers.1.cadence', 9, '§ 2.8'], ['armes.canon.paliers.2.cadence', 8, '§ 2.8'], ['armes.canon.paliers.2.degats', 12, '§ 2.8'],
    ['armes.canon.paliers.2.ecartAngle', 0.06, '§ 2.8'], ['armes.canon.paliers.3.tics', 15, '§ 2.8'], ['armes.canon.paliers.3.degats', 14, '§ 2.8'],
    ['armes.tourelles.paliers.3.max', 16, '§ 2.8'], ['armes.tourelles.paliers.0.viseeDeg', 25, '§ 2.8'], ['armes.tourelles.paliers.3.salveParTourelle', 0.03, '§ 2.8'],
    ['armes.arc.paliers.3.sauts', 8, '§ 2.8'], ['armes.arc.paliers.3.periode', 0.4, '§ 2.8'], ['armes.arc.paliers.2.paralyse', 0.3, '§ 2.8'],
    ['armes.missiles.paliers.0.periode', 2.4, '§ 2.8'], ['armes.missiles.paliers.3.missiles', 6, '§ 2.8'], ['armes.missiles.paliers.2.degatsSous', 8, '§ 2.8'],
    ['armes.drones.orbite', 16, '§ 2.8'], ['armes.drones.paliers.3.anneau', 24, '§ 2.8'], ['armes.drones.paliers.3.contact', 60, '§ 2.8'], ['armes.drones.paliers.2.filin', 30, '§ 2.8'],
    ['armes.minesQ.paliers.0.periode', 2.2, '§ 2.8'], ['armes.minesQ.max', 12, '§ 2.8'], ['armes.minesQ.paliers.3.degats', 80, '§ 2.8'], ['armes.minesQ.paliers.3.aspiration', 0.45, '§ 2.8'],
    ['armes.lisibilite.plafondCyan', 0.08, '§ 2.8'], ['armes.lisibilite.silenceTete', 3, '§ 2.8'], ['armes.retours.rayonMax', 19, '§ 2.8'], ['armes.ultimeSurCyclope', 1.5, '§ 2.8'],
    ['passifs.puissance.parPrise', 0.25, '§ 2.9'], ['passifs.cadence.parPrise', 0.2, '§ 2.9'], ['passifs.reparation.periodes', [6, 4], '§ 2.9'],
    ['passifs.bouclier.recharge', 20, '§ 2.9'], ['passifs.eperon.pvMax', 30, '§ 2.9'], ['passifs.eperon.cout', 15, '§ 2.9'], ['passifs.braise.dps', 20, '§ 2.9'],
    ['passifs.grappe.niveaux', [{ rayon: 16, degats: 15 }, { rayon: 22, degats: 25 }], '§ 2.9'],
    ['pouvoirs.traversee.duree', 1.4, '§ 2.10'], ['pouvoirs.traversee.recharge', 12, '§ 2.10'], ['pouvoirs.ralenti.monde', 0.35, '§ 2.10'],
    ['pouvoirs.ralenti.recharge', 16, '§ 2.10'], ['pouvoirs.repli.duree', 7, '§ 2.10'], ['pouvoirs.repli.degats', 1.8, '§ 2.10'], ['pouvoirs.repli.perle', 13, '§ 2.10'],
    ['apogee.charge.elite', 12, '§ 2.11'], ['apogee.anneaux.rayons', [30, 70, 110, 150, 200, 260], '§ 2.11'], ['apogee.anneaux.intervalle', 0.09, '§ 2.11'],
    ['apogee.ralentiDuree', 0.42, '§ 2.11'], ['apogee.cyclopeMaxPhase', 0.06, '§ 2.11'], ['apogee.glisse.distancePt', 24, '§ 2.11'],
    ['lasso.fermetureTraine', 7, '§ 2.12'], ['lasso.aireMin', 300, '§ 2.12'], ['lasso.intervalle', 0.8, '§ 2.12'], ['lasso.annonce', 14, '§ 2.12'], ['lasso.cyclopePhase', 0.1, '§ 2.12'],
    ['score.chaine.fenetre', 2.5, '§ 2.13'], ['score.mult.max', 8, '§ 2.13'], ['score.base.ruche', 400, '§ 2.13'], ['score.base.traqueur', 5000, '§ 2.13'],
    ['score.primes.frole.distance', 5, '§ 2.13'], ['score.primes.devore', [200, 400, 800, 1600], '§ 2.13'], ['score.primes.cyclope.mort', 25000, '§ 2.13'],
    ['score.affiche.chiffres', 7, '§ 2.13'],
    ['defis.finir.prime', 20000, '§ 2.14'], ['defis.reserve.sansFilet.prime', 12000, '§ 2.14'], ['defis.reserve.premierJet.destructions', 25, '§ 2.14'],
    ['defis.reserve.eclair.delai', 8, '§ 2.14'], ['defis.energieReserve', 20, '§ 2.14'], ['defis.vague.prime', 1000, '§ 2.14'],
    ['gestes.delaiAction', 0.15, '§ 2.16'], ['gestes.toucher.duree', 0.18, '§ 2.16'], ['gestes.glisse.duree', 0.22, '§ 2.16'], ['gestes.bordPt', 20, '§ 2.16'],
    ['gestes.auto.traversee', 0.25, '§ 2.16'], ['gestes.auto.apogeeEnnemis', 8, '§ 2.16'],
    ['inversion.distanceTete', 160, '§ 2.17'], ['inversion.apparition.3', 14, '§ 2.17'], ['inversion.duree.2', 6, '§ 2.17'], ['inversion.fuite', 0.8, '§ 2.17'],
    ['camera.avanceX', 0.3, '§ 3.3'], ['camera.avanceY', 0.42, '§ 3.3'], ['camera.amorti', 0.22, '§ 3.3'], ['camera.cadre.portraitMaxY', 0.72, '§ 3.3'],
    ['camera.devant.croisiere', 1.2, '§ 3.3'], ['camera.debord', 16, '§ 3.3'],
    ['decor.plans.P3.fx', 0.2, '§ 3.4'], ['decor.plans.P5.fx', 0.6, '§ 3.4'], ['decor.plans.P6.fx', 1.4, '§ 3.4'], ['decor.plans.P2.soleil', 80, '§ 3.4'],
    ['decor.ecartPlans', 1.7, '§ 3.4'], ['decor.sol.K', 900, '§ 3.5'], ['decor.sol.pasTransversal', 24, '§ 3.5'], ['decor.lumiere.chaos.part', 0.32, '§ 5.2'],
    ['decor.lumiere.calme.moyenne', 0.075, '§ 5.2'], ['decor.lumiere.decorSeul', [0.18, 0.28], '§ 5.2'],
    ['radar.w', 48, '§ 3.7'], ['radar.h', 24, '§ 3.7'], ['apparitions.anticipee', 1.15, '§ 3.8'], ['apparitions.distanceTete', 48, '§ 3.8'], ['apparitions.rallonge', 0.3, '§ 3.8'],
    ['vol.duree', 4, '§ 3.9'], ['vol.vitesse', 140, '§ 3.9'], ['vol.mines.ombreAvant', 1.2, '§ 3.9'], ['vol.portes.nombre', 6, '§ 3.9'], ['vol.parfait', 5000, '§ 3.9'],
    ['secteurs.0.vagues.0.quota', 24, '§ 4.2'], ['secteurs.0.vagues.1.quota', 48, '§ 4.2'], ['secteurs.0.vagues.2.quota', 54, '§ 4.2'],
    ['secteurs.0.vagues.3.quota', 60, '§ 4.2'], ['secteurs.0.vagues.4.quota', 80, '§ 4.2'], ['secteurs.0.vagues.4.plafond', 32, '§ 4.2'],
    ['secteurs.0.vagues.1.travelling.vx', 8, '§ 4.2'], ['secteurs.0.vagues.1.travelling.t', 12, '§ 4.2'], ['secteurs.0.vagues.3.pic.t', 30, '§ 4.2'],
    ['secteurs.0.traqueur.inaction', 7, '§ 4.2'], ['secteurs.0.vitessesFleches', [50, 55, 60, 65, 70], '§ 4.2'], ['secteurs.0.plafondDur.tirs', 80, '§ 4.2'],
    ['secteurs.0.duree.min', 320, '§ 4.1'], ['secteurs.0.duree.max', 390, '§ 4.1'], ['secteurs.0.soupape', 12, '§ 4.1'], ['secteurs.0.entree', 6, '§ 4.1'],
    ['formations.champMines.mines', 9, '§ 4.3'], ['formations.meute.fleches', 6, '§ 4.3'], ['formations.batterie.ecartTirs', 0.4, '§ 4.3'],
    ['ennemis.fleche.bond.longueur', 67, '§ 4.4'], ['ennemis.dard.fuseau.vitesse', 165, '§ 4.4'], ['ennemis.mine.cercle', 34, '§ 4.4'], ['ennemis.tourelle.balle', 95, '§ 4.4'],
    ['ennemis.lame.traverse.longueur', 190, '§ 4.4'], ['ennemis.ruche.pv', 240, '§ 4.4'], ['ennemis.sentinelle.longueur', 300, '§ 4.4'], ['ennemis.rival.traine', 1.5, '§ 4.4'],
    ['ennemis.traqueur.vitesse', 0.95, '§ 4.4'], ['ennemis.planeur.sortie', 8, '§ 4.4'],
    ['elites.pv', 3, '§ 4.5'], ['elites.gelImages', 5, '§ 4.5'], ['modificateurs.rapide.allure', 1.5, '§ 4.5'], ['modificateurs.instable.souffle', 34, '§ 4.5'],
    ['arene.convois.voies', [64, 160, 256, 352, 448], '§ 4.6'], ['arene.convois.vitesse', 240, '§ 4.6'], ['arene.convois.wagons', 6, '§ 4.6'], ['arene.travelling.cibleMouvement', 0.25, '§ 4.6'],
    ['defile.escadrilles', 5, '§ 4.7'], ['defile.intervalle', 4.5, '§ 4.7'], ['defile.parfait', 10000, '§ 4.7'],
    ['colosse.pvPhase', 1500, '§ 4.8'], ['colosse.pvMain', 300, '§ 4.8'], ['colosse.enrage.apres', 100, '§ 4.8'], ['colosse.mort.arretImages', 24, '§ 4.8'],
    ['colosse.phase1.rayon.balayageDeg', 100, '§ 4.8'], ['colosse.phase1.salve.balles', 14, '§ 4.8'], ['colosse.repit.duree', 7, '§ 4.8'], ['colosse.entree.total', 6.8, '§ 4.8'],
    ['pilotes.banc.graines', 50, '§ 4.10'], ['pilotes.bon.cyclope', [0.3, 0.6], '§ 4.10'], ['pilotes.expert.bat', [0.4, 0.7], '§ 4.10'], ['pilotes.inerte.premiereMortAvant', 8, '§ 4.10'],
    ['scene.kill.forceMax', 0.58, '§ 5.3'], ['scene.budgets.imagesSecouees', 0.12, '§ 5.3'], ['mortScene.gelImages', 10, '§ 5.4'], ['mortScene.duree', 1.3, '§ 5.4'],
    ['mortScene.sautDes', 0.5, '§ 5.4'], ['hud.partMax', 0.1, '§ 5.5'], ['hud.bouton.pt', 44, '§ 5.5'], ['ecrans.attraction.attente', 15, '§ 5.6'], ['ecrans.fin.garde', 0.45, '§ 5.6'],
    ['deblocages.4.seuil', 4000, '§ 5.6'], ['musique.blocs.mesures', 8, '§ 5.7'], ['musique.tension.filtre', [2500, 18000], '§ 5.7'], ['musique.etouffoirs.cartes', 900, '§ 5.7'],
    ['son.mix.chaosDbfs', -14, '§ 5.7'], ['son.salveParSeconde', 8, '§ 5.8'], ['son.noeudsParSeconde', 60, '§ 5.8'],
    ['reglages.actions', 'doigts', '§ 7.10'], ['persistance.cle', 'snake2975.v1', '§ 7.10'], ['socle.evParPas', 64, '§ 7.4'], ['socle.journal', 65536, '§ 7.9'],
    ['perf.budget.total', 11, '§ 7.11'], ['perf.budget.crt', 5.8, '§ 7.11'], ['perf.adaptatif.hysteresis', 45, '§ 7.11'], ['criteres.R08.part', 0.95, '§ 8.5'],
    ['surcharge.vitesse', 1.12, '§ 9']
  ];

  racine.__testsContrat = suite;
  racine.__testsContrat.VALEURS = VALEURS;
})(typeof window !== 'undefined' ? window : globalThis);
