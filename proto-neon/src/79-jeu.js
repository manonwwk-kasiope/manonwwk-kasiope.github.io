/* ===== 79-jeu.js — N.game : la machine d'états, l'ordre des mises à jour et des dessins, la mort en séquence =====

   REMPLACE 70-game.js (lot 0b). Ce fichier ne contient plus les règles : il aiguille. Son propriétaire est le
   GARDIEN du contrat, puis le lot 9. Il applique REFONTE.md § 7.6 (les états), § 7.7 (la boucle d'images et l'ordre
   de dessin), § 5.4 (la mort mise en scène, version simple) et § 7.12 (les crochets de test).

   LES ÉTATS (N.game.etat(), tous dans N.ids.etats) : demarrage, ouverture, titre, attraction, briefing, plongee,
   jeu, nettoyage, cartes, vol, defile, alerte, panneau, boss, mort, reapparition, victoire, fin, initiales, pause.
   Seul ce module change d'état et appelle N.music.section ; les autres demandent par un événement (`vague`,
   `vol`, `phase`, `mort`). Les modules qui MANQUENT sont remplacés par des REPLIS (arène fixe de la taille de l'écran
   quand N.world / N.cam n'existent pas, décor de grille quand N.decor manque, VOL de 2,5 s, CARTES v0 à texte fixe,
   mise en scène de repli quand N.scene manque…) : le jeu se joue de bout en bout, comme la démo.

   COMPATIBILITÉ DES DEUX BOUCLES. Tant que 90-boot.js est celui de la démo (il aiguille sur S.phase, n'appelle
   N.game.update qu'une fois l'ouverture passée, ne dessine ni HUD ni écrans), ce module dessine lui-même l'interface
   dans drawTop et lance la partie dès que S.phase vaut 'play'. Dès que l'horloge avance (N.horloge.pas() > 0 : la boucle
   du lot 1), il laisse boot dessiner N.hud, N.ui et N.intro et attend un toucher à l'écran de démarrage.

   LES TOUCHERS. La boucle du lot 1 publie S.input.taps, valider, retour, pause, chiffre. Avant elle, ce module écoute
   pointerdown et keydown lui-même (transitoire, retiré avec l'ancien 90-boot.js). Tout est ramené à N.outils.taps :
   [{ x, y, key, bouton }] que N.hud (boutons son et pause) et N.ui lisent.

   LE PILOTE (lot I). window.__PILOT (85-pilote.js, les bancs) est appelé au début de CHAQUE pas de update(), dans tous les états,
   avant ramasserTaps() ; et dbg.simuler donne le pas réel aux écrans à horloge arrêtée (cartes, panneaux, films, fin).
   Interface (§ 7.8, contrat de 90-boot.js inchangé) : reset(graine, opts), update(dt), draw(), drawTop(), tension(),
   etat(), dbg { god(b), vague(n), boss(), input(o), etat(nom?), scene(nom), simuler(sec), masque() }. dbg est aussi
   appelable : dbg() rend l'instantané de la démo, lu par les bancs de tools/jeu. */
N.game = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var S = null;
  var CFG = {                                    // → N.R : durées de repli (la démo n'en avait pas ou les avait en dur)
    plongee: 0.8, nettoyage: 2.5, alerte: 1.2, vol: 2.5, victoire: 2.2, graineSuite: 1,
    mort: { dissolution: 0.73, fin: 1.13, sautDes: 0.33 }       // en secondes de temps de jeu (le gel de 10 images précède)
  };
  var JOUE = { jeu: 1, nettoyage: 1, defile: 1, alerte: 1, boss: 1, reapparition: 1, attraction: 1 };
  var PLEIN = { demarrage: 1, ouverture: 1, briefing: 1, panneau: 1, fin: 1, initiales: 1 };

  var et = 'demarrage', etT = 0, etatJeu = 'jeu', avant = 'jeu', seed = 2975, partieN = 0;
  var muted = false, muteTick = 0;
  var finV = false, finClip = null, fin = { victoire: false };
  var vieuxLast = { w: 0, h: 0 };
  var god = false, simulant = false, departExplicite = false;
  var timers = [];
  var QT = [];
  var BG = null, bgKey = '';
  var reprise = null; // point d'entrée de vague/CYCLOPE, jamais l'état à la mort
  var mortInfo = { chute: null, annonce: false, etat: 0 };
  /* les intermèdes (refonte/INTERMEDES.md) : un mini-film 8 bits de N.intro gèle le jeu (état `panneau`), puis
     `suiteFilm` reprend ; le même ne revient jamais dans une partie. filmDemande : demandé pendant un pas de jeu
     (par un événement), lancé à la fin du pas. */
  var filmsVus = {}, suiteFilm = null, filmDemande = null, filmMuet = false, secCourante = null;

  function S_() { return S || (S = N.S); }
  function appel(nom, fn) { try { fn(); } catch (e) { if (N.socle && N.socle.signaler) N.socle.signaler('game→' + nom, e); } }
  function modOk(m, f) { return m && typeof m[f] === 'function'; }

  /* ============================ le son : coupure mémorisée ============================ */
  function reglagesSon() { var rg = N.score && N.score.profil ? N.score.profil.reglages() : null; return rg ? !(rg.musique && rg.effets) : false; }
  function applyMute() {
    if (!N.music) return;
    if (N.music.piste && N.music.mute) { N.music.mute('musique', muted); N.music.mute('effets', muted); return; }   // l'interface 1.0
    if (N.music.mute) {
      if (!N.music.muted || N.music.muted() !== muted) appel('music.mute', function () { N.music.mute(muted); });
      return;
    }
    if (muted && N.music.stop) appel('music.stop', function () { N.music.stop(); });
  }
  function toggleMute() {
    muted = !muted;
    if (N.score && N.score.profil) N.score.profil.reglages({ musique: !muted, effets: !muted });
    if (S_()) S.muted = muted;
    if (N.music && !N.music.mute && N.music.start && !muted && N.music.info && N.music.info()) appel('music.start', function () { N.music.start(); });
    applyMute();
    if (N.hud && N.hud.flashSon) N.hud.flashSon();
  }

  /* ============================ les toucher : une seule file pour tous ============================ */
  var listening = false;
  function listen() {
    var s = S_();
    if (listening || !s || (s.input && 'taps' in s.input) || typeof window === 'undefined' || !window.addEventListener) return;
    listening = true;
    window.addEventListener('pointerdown', function (ev) {
      var S2 = N.S; if (!S2 || S2.phase === 'intro' || O.busy()) return;
      var c = N.gfx.canvas ? N.gfx.canvas() : null, r = c && c.getBoundingClientRect ? c.getBoundingClientRect() : { left: 0, top: 0 }, p = N.gfx.PX || 1;
      QT.push({ x: (ev.clientX - r.left) / p, y: (ev.clientY - r.top) / p, key: null });
      if (QT.length > 8) QT.shift();
    }, { passive: true });
    window.addEventListener('keydown', function (ev) {
      var S2 = N.S; if (!S2 || S2.phase === 'intro' || O.busy() || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      QT.push({ x: -1, y: -1, key: ev.code });
      if (QT.length > 8) QT.shift();
    }, { passive: true });
  }
  function ramasserTaps() {
    var T = O.taps, s = S_(), inp = s && s.input, i;
    T.length = 0;
    while (QT.length) T.push(QT.shift());
    if (inp && inp.taps) for (i = 0; i < inp.taps.length; i++) T.push({ x: inp.taps[i].x, y: inp.taps[i].y, key: null, t0: inp.taps[i].t0, t1: inp.taps[i].t1, bouton: inp.taps[i].doigt === 'bouton' ? 'bouton' : null });
    if (inp) {
      if (inp.valider) T.push({ x: -1, y: -1, key: 'Enter' });
      if (inp.retour) T.push({ x: -1, y: -1, key: 'Escape' });
      if (inp.pause) T.push({ x: -1, y: -1, key: 'KeyP' });
      if (inp.chiffre) T.push({ x: -1, y: -1, key: 'Digit' + inp.chiffre });
    }
    /* les boutons du HUD et les touches de commodité : traités ici, le reste va à N.ui */
    for (i = T.length - 1; i >= 0; i--) {
      var q = T[i], b = (q.key === null && modOk(N.hud, 'toucher') && JOUE_OU_PAUSE()) ? N.hud.toucher(q.x, q.y) : null;
      if (q.key === 'KeyM' || b === 'son') { toggleMute(); T.splice(i, 1); }
      else if (b === 'pause' || ((q.key === 'KeyP' || q.key === 'Escape') && (JOUE[et] || et === 'pause'))) { basculerPause(); T.splice(i, 1); }
    }
  }
  function JOUE_OU_PAUSE() { return !!JOUE[et] || et === 'pause' || et === 'cartes' || et === 'vol' || et === 'mort'; }
  function basculerPause() {
    if (et === 'pause') { aller(avant); if (modOk(N.ui, 'fermer')) N.ui.fermer(); }
    else if (JOUE[et]) { avant = et; aller('pause'); }
  }

  /* ============================ les transitions ============================ */
  function sectionDe(nom) { var d = N.ids.tableEtats[nom]; return d ? d.section : null; }
  function aller(nom) {
    if (N.ids.etats.indexOf(nom) < 0) return false;
    var ancienne = secCourante, prev = et;
    et = nom; etT = 0;
    if (JOUE[nom] && nom !== 'attraction') etatJeu = nom === 'reapparition' ? etatJeu : nom;
    var sec = filmMuet ? null : sectionDe(nom);
    if (sec) secCourante = sec;
    if (sec && sec !== ancienne && modOk(N.music, 'section')) appel('music.section', function () { N.music.section(sec); });
    if (sec && sec !== ancienne && N.journal && N.ids.sections.indexOf(sec) >= 0) N.journal('section', { nom: sec });
    var u = N.ui;
    if (u) {
      if (nom === 'demarrage' || nom === 'titre' || nom === 'cartes' || nom === 'pause') u.ouvrir(nom);
      else if (nom === 'fin') u.ouvrir('fin', { victoire: fin.victoire });
      else if (u.actif() && (prev === 'demarrage' || prev === 'titre' || prev === 'cartes' || prev === 'pause' || prev === 'fin')) u.fermer();
    }
    return true;
  }

  /* ============================ la partie : tout remis à zéro ============================ */
  function partie(graine) {
    seed = graine | 0;
    if (N.socle && N.socle.reset) N.socle.reset(seed);
    if (N.decor && N.decor.build) appel('decor.build', function () { N.decor.build(); });
    O.geom();
    O.T.t = 0; O.T.ak = 0; timers.length = 0;
    O.fxReset();
    reprise = null;
    filmsVus = {}; suiteFilm = null; filmDemande = null;
    if (N.fx && N.fx.reset) appel('fx.reset', function () { N.fx.reset(); });
    var ordre = ['butin', 'ennemis', 'arsenal', 'score', 'dir', 'hud'];
    if (N.world && N.world.reset) appel('world.reset', function () { N.world.reset(); });
    if (N.cam && N.cam.reset) appel('cam.reset', function () { N.cam.reset(); });
    N.joueuse.reset();
    N.butin.reset(); N.ennemis.reset(); N.arsenal.reset(); N.score.reset(); N.dir.reset(0, {}); N.hud.reset();
    if (N.arene && N.arene.reset) appel('arene.reset', function () { N.arene.reset(); });
    if (N.cartes && N.cartes.reset) appel('cartes.reset', function () { N.cartes.reset(); });
    if (N.scene && N.scene.reset) appel('scene.reset', function () { N.scene.reset(); });
    var s = S_();
    if (s) { s.death = null; s.paused = false; }
    muted = reglagesSon(); if (s) s.muted = muted; applyMute();
    BG = null; etatJeu = 'jeu'; finClip = null; mortInfo.chute = null; mortInfo.annonce = false;
    /* la liste branchée sur S pour les pilotes et les mesures */
    if (s) { s.enemies = N.ennemis.list; s.shots = N.ennemis.tirs; }
  }
  function reset(graine, opts) {
    /* Départs publics de test : refuser une faute AVANT de toucher la partie courante. */
    var departs = ['demarrage', 'ouverture', 'titre', 'briefing', 'plongee', 'jeu'];
    if (opts && opts.depart !== undefined && departs.indexOf(opts.depart) < 0) return false;
    S = N.S;
    opts = opts || {};
    departExplicite = opts.depart !== undefined;
    listen();
    var s = (graine === undefined || graine === null) ? (S.seed | 0) : (graine | 0);
    muted = false;
    partie(s);
    muted = reglagesSon(); S.muted = muted; applyMute();
    fin.victoire = false; partieN = 0;
    aller('demarrage');
    if (opts.depart !== undefined) {
      if (opts.depart === 'ouverture') { if (modOk(N.intro, 'reset')) N.intro.reset(); aller('ouverture'); }
      else if (opts.depart !== 'demarrage') {
        /* skip() termine aussi l'ouverture (stop() ne termine que les interludes). */
        if (modOk(N.intro, 'skip')) N.intro.skip();
        if (modOk(N.intro, 'stop')) N.intro.stop();
        if (opts.depart === 'jeu') lancerVague(R.secteurs[0].vagues[0].n);
        else aller(opts.depart);
      }
    } else if (opts.direct) lancer(false);
    return true;
  }
  /* lancer() : la plongée dans la partie ; `nouvelle` remet tout à zéro (sauf au premier lancement du reset) */
  function lancer(nouvelle) {
    if (N.intro && N.intro.stop) appel('intro.stop', function () { N.intro.stop(); });
    if (finClip && N.art && N.art.stop) { var f = finClip; appel('art.stop', function () { N.art.stop(f); }); }
    finClip = null;
    partie(nouvelle === false ? seed : seed + CFG.graineSuite);
    partieN++;
    aller('plongee');
  }
  function film(nom, suite, opts) {
    if (filmsVus[nom] || !(N.intro && N.intro.transition)) { suite(); return; }
    filmsVus[nom] = 1;
    var ok = !!O.safe('intro.transition', function () { return N.intro.transition(nom, opts); });
    if (!ok) { suite(); return; }
    suiteFilm = suite; filmMuet = true; aller('panneau'); filmMuet = false;     // la musique garde sa section pendant le film
  }
  function lancerVague(n) {
    N.dir.demarrer(n);
    aller('jeu');
  }

  /* ============================ la mise en scène de repli (si 79-scene.js manque) ============================
     Chaque consommateur se met en retrait dès que N.scene existe. Rang 60, nom '79-scene' : le tableau du § 7.4. */
  var hsCd = 0;
  var SC = 'scene';
  if (N.ev) {
    N.ev.on('kill', 60, function (c) {
      if (N.scene) return;
      if (c.src && c.src.genre === 'decor') { O.boom(c.x, c.y, c.boss ? 1 : 0.36, O.MAGENTA); return; }
      if (c.boss) {
        O.boom(c.x, c.y, 1, O.MAGENTA); O.hitstop(26); O.shake(12); O.sfx('bigkill');
        [[-18, -9, 0.1], [15, 11, 0.22], [-7, 16, 0.36], [13, -15, 0.5], [0, 2, 0.66]].forEach(function (o) {
          timers.push({ left: o[2], fn: function () { O.boom(c.x + o[0], c.y + o[1], 0.5, O.MAGENTA); } });
        });
        if (N.ennemis) N.ennemis.effacerTirs(c.x, c.y, 120);
        return;
      }
      var big = c.type === 'tourelle' || c.type === 'sentinelle';
      O.boom(c.x, c.y, big ? 0.45 : 0.32, O.MAGENTA);
      O.sfx('kill', { pitch: Math.min(14, (N.score ? N.score.chaine() : 1) - 1) });
      if (hsCd <= 0) { O.hitstop(big ? 3 : 2); hsCd = 0.12; }
    }, '79-scene');
    N.ev.on('ramassage', 60, function (c) {
      if (N.scene) return;
      O.sfx('butin', { pitch: N.joueuse ? N.joueuse.len() : 8 }); O.spark(c.x, c.y, O.JAUNE, 3);
    }, '79-scene');
    N.ev.on('coupe', 60, function (c) {
      if (N.scene) return;
      var cm = (R && R.mort && R.mort.coupe) || { gelImages: 3, jolt: 3 };
      O.hitstop(cm.gelImages); O.shake(cm.jolt); O.sfx('degat'); O.debris(c.x, c.y, O.CYAN, 6);
      if (N.cam && N.cam.jolt) N.cam.jolt(0, cm.jolt);
    }, '79-scene');
    N.ev.on('mort', 60, function (d) {
      if (N.scene) return;
      O.sfx('bigkill');
    }, '79-scene');

    /* ---- les règles de la machine d'états (rang 10) ---- */
    N.ev.on('mort', 10, function (d) { debutMort(d); }, '79-jeu');
    N.ev.on('vague', 10, function (c) {
      if (c.evt === 'entree') memoriserReprise(false);
      if (c.evt === 'nettoyee') finDeVague(c);
    }, '79-jeu');
    N.ev.on('vol', 10, function (c) { if (c.evt === 'fin' && et === 'vol') apresVol(); }, '79-jeu');
    N.ev.on('portail', 10, function (c) { if (c.type === 'rival' && JOUE[et]) filmDemande = 'rival'; }, '79-jeu');
    N.ev.on('phase', 10, function (c) { if (c.evt === 'mort' && (et === 'boss' || et === 'jeu')) debutVictoire(); }, '79-jeu');
  }

  /* ============================ les enchaînements ============================ */
  function finDeVague(c) {
    if (!JOUE[et]) return;
    aller('nettoyage');
    N.ennemis.purge('proche');
    var bu = (R && R.butin && R.butin.largages && R.butin.largages.finVague) || { base: 3, parVague: 1 };
    N.butin.pluie(bu.base + bu.parVague * c.n);
    O.sfx('defi');
  }
  function suiteNettoyage() {
    var n = N.dir.vague(), total = N.dir.nombreVagues();
    if (n < total) { if (n === 1) film('chasse', function () { aller('cartes'); }); else aller('cartes'); }
    else { aller('alerte'); if (N.hud) N.hud.banniere('ALERTE', { c: 'magenta', duree: CFG.alerte, clignote: true }); O.sfx('intro'); }
  }
  function apresCarte(index, id) {
    if (N.cartes && N.cartes.choisir) N.cartes.choisir(id);
    else if (N.ev) {
      N.ev.emit('carte', { id: id, niveau: 1 });                       // un seul émetteur : N.cartes ; en son absence, ce repli
    }
    demarrerVol();
  }
  function demarrerVol() { film('plongee', vol); }
  function vol() {
    aller('vol');
    var n = N.dir.vague();
    if (N.vol && N.vol.start) appel('vol.start', function () { N.vol.start(n, n + 1); });
    else if (N.hud) N.hud.banniere('PLONGÉE', { c: 'jaune', duree: CFG.vol - 0.3 });
  }
  function apresVol() { lancerVague(N.dir.vague() + 1); }
  function lancerBoss() {
    memoriserReprise(true);
    aller('boss');
    if (N.cam && N.cam.mode) appel('cam.mode', function () { N.cam.mode('boss'); });
    N.dir.lancerBoss();
  }
  function memoriserReprise(boss) {
    reprise = { vague: N.dir.vague(), boss: boss, longueur: N.joueuse.len(),
      armes: N.arsenal.armes(), pouvoir: N.joueuse.pouvoir.id };
  }
  function continuer() {
    if (et !== 'fin' || !reprise || !N.ui.finActions().disponible || !N.score.continuer()) return false;
    var r = reprise, s = S_();
    if (modOk(N.intro, 'stop')) N.intro.stop();
    if (finClip && modOk(N.art, 'stop')) N.art.stop(finClip);
    finClip = null; timers.length = 0; suiteFilm = null; filmDemande = null;
    if (modOk(N.colosse, 'reset')) N.colosse.reset();
    if (modOk(N.arene, 'reset')) N.arene.reset();
    /* world.reset est actuellement un reset caméra (double déclaration dans 12-cam).
       Rendre les murs par l'interface publique, avant de reconstituer la trace. */
    if (modOk(N.world, 'stop')) N.world.stop();
    if (modOk(N.world, 'arena')) {
      N.world.arena({ x: 0, y: 0, w: N.world.W, h: N.world.H }, R.monde.mobile.glissementMin);
      N.cam.update(R.monde.mobile.glissementMin);
    }
    O.geom(); N.joueuse.reset({ len: r.longueur });
    if (modOk(N.joueuse, 'equiper')) N.joueuse.equiper(r.pouvoir);
    N.butin.reset(); N.ennemis.reset(); N.arsenal.reset();
    r.armes.forEach(function (a) {
      for (var k = N.arsenal.niveau(a.id); k < a.niveau; k++) N.arsenal.monter(a.id);
    });
    N.hud.reset(); O.fxReset();
    if (modOk(N.fx, 'reset')) N.fx.reset();
    if (modOk(N.scene, 'reset')) N.scene.reset();
    if (modOk(N.cam, 'reset')) N.cam.reset();
    s.death = null; s.paused = false; fin.victoire = false;
    N.dir.demarrer(r.vague);
    if (r.boss) lancerBoss(); else aller('jeu');
    return true;
  }
  function debutVictoire() {
    if (et === 'victoire' || et === 'fin') return;
    aller('victoire');
    N.ennemis.purge('proche');
    O.sfx('bigkill');
  }
  function terminer(victoire) {
    fin.victoire = !!victoire;
    var r = N.score.terminer(victoire);
    if (N.intro && N.intro.transition) appel('intro.transition', function () { N.intro.transition(victoire ? 'victoire' : 'defaite'); });
    aller('fin');
  }

  /* ---- la mort mise en scène (§ 5.4, version simple) ---- */
  function debutMort(d) {
    if (!JOUE[et]) return;
    avant = et === 'reapparition' ? etatJeu : et;
    aller('mort');
    mortInfo.chute = null; mortInfo.annonce = false;
    var rm = (R && R.mortScene) || { gelImages: 10 };
    O.hitstop(rm.gelImages);
    if (modOk(N.music, 'cue')) appel('music.cue', function () { N.music.cue('mort'); });
    else if (modOk(N.music, 'sfx')) O.sfx('bigkill');
    O.boom(d.x, d.y, 0.45, O.CYAN);
    O.shake(7);
  }
  function majMort(dt) {
    var m = CFG.mort, J = N.joueuse;
    var n = Math.floor(etT / m.dissolution * (J.len() + 2));
    J.desintegre(n);
    if (etT >= m.dissolution && !mortInfo.annonce) {
      mortInfo.annonce = true;
      var restantes = N.score.vies;
      if (restantes > 0) {
        if (N.hud) {
          N.hud.banniere(['-1 VIE', restantes + (restantes > 1 ? ' RESTANTES' : ' RESTANTE')], { c: 'rose', duree: 0.9 });
          var ch = N.arsenal && N.arsenal.chute ? N.arsenal.chute() : null;
          if (ch && ch.a < ch.de) N.hud.tag(ch.arme.toUpperCase() + ' ' + palier(ch.de) + ' → ' + palier(ch.a));
        }
      } else {
        if (N.crt && N.crt.extinction) appel('crt.extinction', function () { N.crt.extinction(0.4); });
        if (N.hud) N.hud.banniere('SIGNAL PERDU', { c: 'magenta', duree: 0.9 });
      }
    }
    var saut = false, T = O.taps;
    for (var i = 0; i < T.length; i++) if (T[i].key !== 'Tab') saut = true;
    if (saut && etT >= m.sautDes) etT = Math.max(etT, m.fin);
    if (etT >= m.fin) {
      J.desintegre(J.len() + 3);
      if (N.score.vies > 0) {
        J.reapparaitre();
        aller('reapparition');
        if (N.hud) N.hud.banniere('READY!', { c: 'jaune', duree: (R && R.vies && R.vies.reapparition && R.vies.reapparition.ready) || 0.6 });
        if (modOk(N.music, 'voix')) appel('music.voix', function () { N.music.voix('READY'); });
      } else terminer(false);
    }
  }
  function palier(n) { return ['', 'I', 'II', 'III', 'IV'][n | 0] || String(n); }

  /* ============================ la mise à jour ============================ */
  function update(dt) {
    var s = S_();
    if (!s) return;
    if (!(dt >= 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;
    O.geom();
    redimensionne();
    appelerPilote();                                  // AVANT ramasserTaps, à CHAQUE pas et dans TOUS les états (cartes, VOL, mort, panneaux…)
    ramasserTaps();
    var nouveau = O.bootNouveau();
    /* l'ancienne boucle ne remet pas le compteur d'événements par pas à zéro : on le fait à sa place */
    if (!nouveau && N.ev && N.ev.nouveauPas) N.ev.nouveauPas();
    /* l'ancienne boucle n'appelle ce module qu'une fois l'ouverture passée : la partie démarre alors */
    if (!nouveau && !departExplicite && s.phase !== undefined && s.phase !== 'intro' && (et === 'demarrage' || et === 'ouverture' || et === 'titre')) lancer(false);
    /* un interlude en cours (panneau du CYCLOPE) : le monde est gelé, c'est lui qui avance */
    if (O.busy() && (et === 'panneau' || JOUE[et])) {
      if (et !== 'panneau') aller('panneau');
      appel('intro.update', function () { N.intro.update(dt); });
      return;
    }
    if (et === 'panneau' && !O.busy()) { var suite = suiteFilm || lancerBoss; suiteFilm = null; suite(); }

    if (et === 'demarrage') {
      if (modOk(N.ui, 'update')) N.ui.update(dt);
      if (nouveau) { var a = N.ui.sortie(); if (a && a.action === 'jouer') aller('titre'); } else N.ui.sortie();
      etT += dt; return;
    }
    if (et === 'ouverture' || et === 'briefing') { etT += dt; if (etT > 0.5) aller('titre'); return; }
    if (et === 'titre') {
      N.ui.update(dt); etT += dt;
      var b = N.ui.sortie(); if (b && b.action === 'jouer') lancer(false);
      return;
    }
    if (hsCd > 0) hsCd -= dt;
    etT += dt;
    /* la caméra suit la tête à chaque pas de jeu (le mode simulé l'avance lui-même) */
    if (!simulant && N.cam && N.cam.update) appel('cam.update', function () { N.cam.update(dt); });

    if (JOUE[et]) {
      O.T.t += dt; O.T.ak += dt;
      pas(dt);
      if (et === 'nettoyage' && etT >= CFG.nettoyage && !N.ennemis.purgeEnCours()) suiteNettoyage();
      else if (et === 'alerte' && etT >= CFG.alerte) {
        film('reveil', function () {
          var tr = N.intro && N.intro.transition ? !!O.safe('intro.transition', function () { return N.intro.transition('boss'); }) : false;
          if (tr) { suiteFilm = lancerBoss; aller('panneau'); } else lancerBoss();
        }, { nom: 'LE CYCLOPE' });
      } else if (et === 'reapparition' && N.joueuse.etat === 'vivant') aller(etatJeu === 'reapparition' ? 'jeu' : etatJeu);
      if (N.dir.bossMort && N.dir.bossMort() && (et === 'boss' || et === 'jeu')) debutVictoire();
    } else if (et === 'plongee') {
      O.T.ak += dt;
      appel('decor', function () { if (N.decor && N.decor.update) N.decor.update(dt); });
      majHud(dt);
      if (etT >= CFG.plongee) lancerVague(1);
    } else if (et === 'cartes') {
      N.ui.update(dt);
      var c = N.ui.sortie(); if (c && c.action === 'carte') apresCarte(c.index, c.id);
    } else if (et === 'vol') {
      O.T.ak += dt;
      if (N.vol && N.vol.update) appel('vol.update', function () { N.vol.update(dt); });
      majHud(dt);
      O.fxUpdate(dt);
      if (!(N.vol && N.vol.actif && N.vol.actif()) && etT >= CFG.vol) apresVol();
    } else if (et === 'mort') {
      O.T.ak += dt;
      appel('joueuse', function () { N.joueuse.update(dt); });
      O.fxUpdate(dt);
      if (N.scene && N.scene.update) appel('scene.update', function () { N.scene.update(dt); });
      majHud(dt);
      majMort(dt);
    } else if (et === 'victoire') {
      O.T.ak += dt; O.T.t += dt;
      N.ennemis.update(dt); N.butin.update(dt); O.fxUpdate(dt); majHud(dt);
      if (etT >= CFG.victoire && !N.ennemis.purgeEnCours()) film('apotheose', function () { terminer(true); });
    } else if (et === 'fin') {
      O.T.ak += dt;
      N.ui.update(dt);
      var f = N.ui.sortie();
      if (f && f.action === 'continuer') continuer();
      else if (f && f.action === 'rejouer') lancer(true);
    } else if (et === 'pause') {
      N.ui.update(dt);
      var p = N.ui.sortie(); if (p && p.action === 'reprendre') basculerPause();
    }
    /* les minuteries de la mise en scène de repli */
    for (var i = timers.length - 1; i >= 0; i--) { timers[i].left -= dt; if (timers[i].left <= 0) { var fn = timers[i].fn; timers.splice(i, 1); fn(); } }
    if (filmDemande && JOUE[et] && et !== 'alerte') { var fd = filmDemande, reprise = et; filmDemande = null; film(fd, function () { aller(reprise); }); }
    publier();
  }
  function majHud(dt) { if (N.hud) N.hud.update(dt); }

  /* le crochet des pilotes automatiques (85-pilote.js, les bancs) : window.__PILOT, appelé au début de chaque pas, quel que soit
     l'état, pour que le pilote lise S tel que le pas précédent l'a laissé et écrive S.input avant que ramasserTaps() le consomme
     (le pilote décide lui-même quoi faire dans un état qui n'est pas du combat : cartes, VOL, rien). Le cliché de dbg() ne sert
     qu'aux anciens bancs (tools/jeu) ; s'il ne peut pas être construit, le pilote est appelé quand même. */
  function appelerPilote() {
    if (typeof window === 'undefined' || typeof window.__PILOT !== 'function') return;
    var d = null;
    try { d = dbg(); } catch (x) { d = null; }
    try { window.__PILOT(d); } catch (x2) { /* pilote de test */ }
  }

  /* l'ordre des mises à jour d'une image de jeu (§ 7.7) */
  function pas(dt) {
    var sansApparition = et === 'nettoyage' || et === 'alerte';
    if (!sansApparition) appel('dir', function () { N.dir.update(dt); });
    if (N.arene && N.arene.update) appel('arene', function () { N.arene.update(dt); });
    appel('joueuse', function () { N.joueuse.update(dt); });
    appel('arsenal', function () { N.arsenal.update(dt); });
    appel('ennemis', function () { N.ennemis.update(dt); });
    if (N.colosse && N.colosse.update && N.colosse.actif && N.colosse.actif()) appel('colosse', function () { N.colosse.update(dt); });
    appel('butin', function () { N.butin.update(dt); });
    appel('score', function () { N.score.update(dt); });
    appel('hud', function () { N.hud.update(dt); });
    if (N.scene && N.scene.update) appel('scene', function () { N.scene.update(dt); });
    if (N.ui && N.ui.actif()) appel('ui', function () { N.ui.update(dt); });
    O.fxUpdate(dt);
  }

  /* une rotation en pleine partie (repli, arène de la taille de l'écran) : la tête reste dans l'arène et la partie
     se met en pause (J-12). Avec N.world, le monde ne dépend plus de la vue : rien à faire. */
  function redimensionne() {
    var g = O.geo;
    if (g.W === vieuxLast.w && g.H === vieuxLast.h) return;
    var avait = vieuxLast.w > 0;
    vieuxLast.w = g.W; vieuxLast.h = g.H;
    if (!avait || g.monde) return;
    BG = null;
    if (N.joueuse && N.joueuse.clampRepli) N.joueuse.clampRepli();
    if (JOUE[et] && S_()) S.paused = true;
  }

  function publier() {
    var s = S_();
    if (!s) return;
    s.score = N.score.score; s.lives = N.score.vies; s.enemies = N.ennemis.list; s.shots = N.ennemis.tirs;
    s.challenge = N.score.defi;
  }

  /* ============================ la tension : elle pilote la musique ============================ */
  function tension() {
    if ((++muteTick % 60) === 1) applyMute();
    if (!N.dir) return 0.06;
    if (et === 'fin' || et === 'initiales') return 0.12;
    if (et === 'demarrage' || et === 'titre' || et === 'ouverture' || et === 'briefing') return 0.06;
    return N.dir.tension();
  }

  /* ============================ le dessin ============================ */
  function buildBG() {
    var A = O.A, g = O.geo, W = g.W, H = g.H, port = g.portrait;
    var s = O.mk(W, H), d = s.data, x, y;
    var ox = Math.round(((A.x0 + A.x1) / 2) % 48), oy = Math.round(((A.y0 + A.y1) / 2) % 48);
    for (y = 0; y < H; y++) {
      var zone = port && y > A.y1;
      for (x = 0; x < W; x++) {
        var mx = ((x - ox) % 48 + 48) % 48, my = ((y - oy) % 48 + 48) % 48, c = 0;
        if (mx === 0 || my === 0) c = zone ? O.NUIT : O.INDIGO;
        else if ((mx % 12 === 0 || my % 12 === 0) && ((x + y) & 1) === 0) c = O.NUIT;
        if (mx === 0 && my === 0) c = zone ? O.INDIGO : O.VIOLET;
        if (zone && c === 0 && ((x + y) & 3) === 0) c = O.NP;
        d[y * W + x] = c;
      }
    }
    return s;
  }
  function drawBG() {
    var A = O.A, g = O.geo, key = g.W + 'x' + g.H + ':' + A.x0 + ',' + A.x1 + ',' + A.y0 + ',' + A.y1;
    if (!BG || bgKey !== key) { BG = buildBG(); bgKey = key; }
    N.gfx.blit(BG, O.VUE.x, O.VUE.y);
    /* impulsions de données le long du treillis : plus nombreuses quand la tension monte */
    var ox = Math.round(((A.x0 + A.x1) / 2) % 48), oy = Math.round(((A.y0 + A.y1) / 2) % 48), W = g.W, H = g.H;
    var n = 4 + Math.floor(tension() * 14), nx = Math.ceil(W / 48) + 1, ny = Math.ceil(H / 48) + 1, ak = O.T.ak;
    for (var i = 0; i < n; i++) {
      var horiz = i & 1, spd = 30 + (i * 13) % 40, ph = (ak * spd + i * 97) % (horiz ? W + 20 : H + 20) - 10;
      for (var k = 0; k < 6; k++) {
        var c = k === 0 ? O.VIOLET : O.INDIGO;
        if (horiz) { var yy = oy + ((i * 5) % ny) * 48; if (yy < H && !(g.portrait && yy > A.y1)) N.gfx.px(O.VUE.x + ph - k, O.VUE.y + yy, c); }
        else { var xx = ox + ((i * 3) % nx) * 48, y2 = ph - k; if (xx < W && !(g.portrait && y2 > A.y1)) N.gfx.px(O.VUE.x + xx, O.VUE.y + y2, c); }
      }
    }
  }
  /* les murs : une bande hachurée de 3 px (N.R.monde.mur) ; le pan proche s'allume en rose pâle tramé dès 24 px */
  function drawMurs() {
    var A = O.A, gf = N.gfx, ep = (R && R.monde && R.monde.mur && R.monde.mur.epaisseur) || 3, x, y;
    var pan = N.joueuse ? N.joueuse.distMur(N.joueuse.tete.x, N.joueuse.tete.y) : null;
    var al = (R && R.monde && R.monde.mur && R.monde.mur.alerte) || 24, k = pan && pan.d < al ? 1 - Math.max(0, pan.d) / al : 0, pn = pan ? pan.pan : '';
    function bande(x0, y0, w, h, pa) {
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        var px = x0 + xx, py = y0 + yy;
        gf.px(px, py, (px + py) % 4 < 2 ? O.VIOLET : O.NP);
      }
      if (k > 0 && pn === pa) gf.ditherRect(x0, y0, w, h, O.ROSE, 0.2 + 0.7 * k);
    }
    bande(A.x0 - ep, A.y0 - ep, A.x1 - A.x0 + 2 * ep, ep, 'h');
    bande(A.x0 - ep, A.y1, A.x1 - A.x0 + 2 * ep, ep, 'b');
    bande(A.x0 - ep, A.y0, ep, A.y1 - A.y0, 'g');
    bande(A.x1, A.y0, ep, A.y1 - A.y0, 'd');
  }

  function fondEcran() { return PLEIN[et] === 1; }

  function draw() {
    var s = S_();
    if (!s) return;
    O.geom();
    if (fondEcran() || et === 'titre') return;
    if (et === 'vol' && N.vol && N.vol.actif && N.vol.actif()) return;                 // le VOL dessine à la place (§ 7.7)
    /* § 7.7 : le lointain en espace écran, puis le plateau et tout ce qui vit dans le monde sous l'origine de la caméra */
    O.origine(0, 0);
    if (N.decor && N.decor.drawFar && O.geo.cam) appel('decor.drawFar', function () { N.decor.drawFar(N.cam); });
    O.origineMonde();
    if (N.decor && N.decor.drawPlateau) appel('decor.drawPlateau', function () { N.decor.drawPlateau(N.cam); }); else drawBG();
    if (N.decor && N.decor.drawFront && O.geo.cam) appel('decor.drawFront', function () { N.decor.drawFront(N.cam); });
    drawMurs();
    appel('butin.draw', function () { N.butin.draw(); });
    appel('ennemis.draw', function () { N.ennemis.draw(); });
    appel('arsenal.draw', function () { N.arsenal.draw(); });
    appel('joueuse.draw', function () { N.joueuse.draw(); });
    O.fxDraw();
  }

  var LUT = null;
  function remapMort() {
    var b = N.gfx.buf && N.gfx.buf();
    if (!b) return;
    if (N.gfx.remap) {
      if (!LUT) { LUT = new Uint8Array(16); for (var i = 1; i < 16; i++) LUT[i] = N.pal.L[i] > 0.1 ? O.ARDOISE : O.NUIT; }
      N.gfx.remap(LUT); return;
    }
    if (!LUT) { LUT = new Uint8Array(16); for (var j = 1; j < 16; j++) LUT[j] = N.pal.L[j] > 0.1 ? O.ARDOISE : O.NUIT; }
    for (var k = 0; k < b.length; k++) b[k] = LUT[b[k]];
  }
  /* la cause entourée d'un anneau magenta qui clignote à 3 Hz, son nom en bas (§ 5.4) */
  function drawCause() {
    var s = S_(), d = s && s.death;
    if (!d) return;
    var g = N.gfx, x = d.x, y = d.y, r = 9, e = null, i, L = N.ennemis;
    if (d.cause === 'mur') {
      var m = N.joueuse.distMur(d.x, d.y), A = O.A;
      if (m.pan === 'g') g.rect(A.x0 - 3, d.y - 12, 3, 24, O.MAGENTA); else if (m.pan === 'd') g.rect(A.x1, d.y - 12, 3, 24, O.MAGENTA);
      else if (m.pan === 'h') g.rect(d.x - 12, A.y0 - 3, 24, 3, O.MAGENTA); else g.rect(d.x - 12, A.y1, 24, 3, O.MAGENTA);
    } else if (d.cause === 'morsure') { x = d.x; y = d.y; }
    else if (d.auteurId !== null && d.auteurId !== undefined) {
      for (i = 0; i < L.list.length; i++) if (L.list[i].id === d.auteurId) e = L.list[i];
      if (e) { x = e.x; y = e.y; r = Math.round(e.r + 4); }
    }
    if (d.cause !== 'mur' && (Math.floor(etT * 3 * 2) & 1) === 0) g.ring(x, y, r, O.MAGENTA, 1);
  }
  function drawNomCause() {
    var s = S_(), d = s && s.death;
    if (!d) return;
    var txt = N.ids.texte(d.cause, d.auteur), W = O.geo.W, H = O.geo.H, y = H - (O.geo.safe.b | 0) - 14;
    O.textC(txt, W / 2, y, O.OS, true, 1);
  }

  function drawTop() {
    var s = S_();
    if (!s) return;
    if (fondEcran() && et !== 'fin') return;
    if (et === 'fin') { ecranVieux(); return; }
    if (et === 'titre') { ecranVieux(); return; }
    if (et === 'vol' && N.vol && N.vol.actif && N.vol.actif()) { ecranVieux(); return; }
    O.origineMonde();
    if (N.fx && N.fx.drawTele) appel('fx.drawTele', function () { N.fx.drawTele(); }); else appel('ennemis.drawTele', function () { N.ennemis.drawTele(); });
    if (N.colosse && N.colosse.drawTop && N.colosse.actif && N.colosse.actif()) appel('colosse.drawTop', function () { N.colosse.drawTop(); });
    if (et === 'mort') {
      remapMort();
      appel('joueuse.drawTop', function () { N.joueuse.drawTop(); });
      if (N.scene && N.scene.drawCause) appel('scene.drawCause', function () { N.scene.drawCause(); }); else drawCause();
      O.origine(0, 0);
      drawNomCause();
    } else appel('joueuse.drawTop', function () { N.joueuse.drawTop(); });
    ecranVieux();
  }
  /* l'interface : dessinée ici tant que 90-boot.js n'appelle pas N.hud.draw / N.ui.draw / N.intro.draw lui-même */
  function ecranVieux() {
    var s = S_();
    O.origine(0, 0);
    if (O.bootNouveau()) return;
    var intro = O.current();
    if (intro && N.intro && N.intro.draw) { appel('intro.draw', function () { N.intro.draw(); }); if (O.busy()) return; }
    if (JOUE_OU_PAUSE() && et !== 'mort') appel('hud.draw', function () { N.hud.draw(); });
    else if (et === 'mort') appel('hud.draw', function () { N.hud.draw(); });
    /* La pause d'application est une surimpression du boot : aucune UI remplacée ni main retirée. */
    if (N.ui && N.ui.actif()) appel('ui.draw', function () { N.ui.draw(); });
  }

  /* ============================ pour les tests : N.game.dbg ============================ */
  function instantane() {
    var P = N.joueuse.tete, s = S_(), A = O.A;
    var J = { x: P.x, y: P.y, ang: P.ang, len: N.joueuse.len(), lives: N.score.vies, invul: N.joueuse.invul() ? 1 : 0, etat: N.joueuse.etat, vit: P.vit };
    var d = N.dir.info();
    return {
      t: O.T.t, st: et, P: J, E: N.ennemis.list, EB: N.ennemis.tirs, PB: N.arsenal.tirs, CELLS: N.butin.list, BEAMS: N.ennemis.lasers,
      boss: bossObj(), bossPhase: N.dir.phase(), bossT: 0, AL: A.x0, AR: A.x1, AT: A.y0, AB: A.y1, W: O.geo.W, H: O.geo.H,
      score: N.score.score, kills: N.score.stats ? N.score.stats.kills : 0, chain: N.score.chaine(), defi: N.score.defi,
      stats: { spawns: N.dir.stats.spawns, inView: N.dir.stats.inView, minDistSpawn: N.dir.stats.minDistSpawn, kills: N.score.stats ? N.score.stats.kills : 0,
        killsBy: N.score.stats ? N.score.stats.killsBy : {}, bossDeathT: -1, morts: N.score.stats ? N.score.stats.morts : [] },
      muted: muted, finT: etT, seed: seed, busy: O.busy(), vague: N.dir.vague(), etat: et,
      segs: function () { var o = [], q = N.joueuse.segs(); for (var k = 0; k + 1 < q.length; k += 2) o.push([q[k], q[k + 1]]); return o; }
    };
  }
  function bossObj() { var L = N.ennemis.list; for (var i = 0; i < L.length; i++) if (L[i].boss) return L[i]; return null; }

  function dbg() { return instantane(); }
  dbg.god = function (b) { god = b === undefined ? !god : !!b; if (N.joueuse && N.joueuse.god) N.joueuse.god(god); return god; };
  dbg.vague = function (n) {
    n = n | 0;
    if (!JOUE[et] && et !== 'plongee') { if (et === 'demarrage' || et === 'titre' || et === 'fin') lancer(false); }
    N.ennemis.reset(); N.arsenal.reset();
    N.dir.demarrer(n);
    aller('jeu');
    return N.dir.vague();
  };
  dbg.boss = function () {
    if (!JOUE[et]) { if (et === 'demarrage' || et === 'titre' || et === 'fin') lancer(false); }
    N.ennemis.reset();
    N.dir.demarrer(N.dir.nombreVagues());
    lancerBoss();
    return bossObj();
  };
  dbg.input = function (o) {
    var s = S_(); if (!s || !o) return s && s.input;
    for (var k in o) s.input[k] = o[k];
    if (o.x !== undefined || o.y !== undefined) { if (o.mag === undefined) s.input.mag = (s.input.x || s.input.y) ? 1 : 0; }
    return s.input;
  };
  dbg.etat = function (nom) {
    if (nom === undefined) return et;
    if (nom === 'jeu' && (et === 'demarrage' || et === 'titre' || et === 'fin')) { lancer(false); N.dir.demarrer(1); }
    if (nom === 'cartes' && !JOUE[et]) { lancer(false); N.dir.demarrer(1); }
    return aller(nom);
  };
  /* le mode simulé : la mise à jour seule, aussi vite que possible, sans dessin ; rend le journal */
  dbg.simuler = function (sec) {
    /* La simulation est elle-même une entrée du pas fixe : elle ne dépend pas d'une
       première image déjà dessinée. avancer() amorce le socle avant update(). */
    var n = Math.round((sec || 1) / (R && R.temps ? R.temps.h : 1 / 120)), h = R && R.temps ? R.temps.h : 1 / 120, nouveau = !!(N.horloge && N.horloge.avancer);
    simulant = true;
    for (var i = 0; i < n; i++) {
      var dt = nouveau ? N.horloge.avancer() : h;
      /* les écrans à horloge arrêtée (cartes, panneaux, films, fin) reçoivent le pas réel : leurs gardes (0,45 s des cartes, durée d'un
         film) avancent comme dans la boucle de 90-boot.js, qui leur donne S.dt, sans valider ni saut. Le monde, lui, reste figé :
         ces états n'ont aucune mise à jour du monde, et le temps de jeu N.horloge.t() n'avance pas. */
      if (nouveau && dt === 0 && N.horloge.arretee() && !(N.S && N.S.paused)) dt = h;
      N.game.update(dt);
      if (N.fx && N.fx.update) N.fx.update(dt);
      if (N.cam && N.cam.update) N.cam.update(dt);
    }
    simulant = false;
    return N.journal.dump();
  };
  /* les scènes de référence (§ 7.12) : celles que les replis savent figer */
  dbg.scene = function (nom) {
    if (nom === 'charge' || nom === 'v5' || nom === 'lasso6' || nom === 'inversion' || nom === 'convoi' || nom === 'travelling' || nom === 'boss3') return sceneReference(nom);
    var P = N.joueuse.tete;
    function jeuNeuf() { if (!JOUE[et] || et === 'reapparition') { lancer(false); } O.geom(); lancerVague(1); N.ennemis.reset(); }
    if (nom === 'mur') { jeuNeuf(); N.joueuse.force({ x: O.A.x0 + 30, y: (O.A.y0 + O.A.y1) / 2, ang: Math.PI, trace: true }); return true; }
    if (nom === 'morsure') {
      jeuNeuf();
      var cx = (O.A.x0 + O.A.x1) / 2, cy = (O.A.y0 + O.A.y1) / 2;
      N.joueuse.force({ x: cx, y: cy, ang: 0, len: 30, trace: true });
      return true;
    }
    if (nom === 'mortTir') { jeuNeuf(); var e = N.ennemis.spawn('tourelle', P.x + 60, P.y); e._st = 'pose'; e._cd = 0.1; e._tx = e.x; e._ty = e.y; return true; }
    if (nom === 'cartes') { if (!JOUE[et]) lancer(false); aller('cartes'); return true; }
    if (nom === 'fin') { if (!JOUE[et]) lancer(false); N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: -1 }); terminer(false); return true; }
    if (nom === 'vol') { if (!JOUE[et]) lancer(false); demarrerVol(); return true; }
    if (nom === 'calme' || nom === 'montee' || nom === 'chaos') { jeuNeuf(); N.dir.demarrer(nom === 'calme' ? 1 : nom === 'montee' ? 3 : 5); aller('jeu'); return true; }
    if (nom === 'colosse' || nom === 'boss3') { dbg.boss(); return true; }
    return false;
  };
  /* Fixtures construites par les interfaces des vraies mécaniques, sans champ privé ni faux événement. */
  function sceneReference(nom) {
    var C = R.tests.scenes, E = N.ennemis, J = N.joueuse, A = N.arene, W = N.world;
    if (!(modOk(W, 'arena') && modOk(N.cam, 'update') && modOk(N.cam, 'reset') && modOk(N.decor, 'reset'))) return false;
    if ((nom === 'charge' || nom === 'boss3') && !(modOk(N.colosse, 'start') && modOk(N.colosse, 'touche'))) return false;
    if ((nom === 'v5' || nom === 'convoi') && !modOk(A, 'convois')) return false;
    if ((nom === 'v5' || nom === 'travelling') && !(modOk(A, 'travelling') && modOk(W, 'travelling'))) return false;
    if (nom === 'inversion' && !modOk(J, 'inversionDebut')) return false;
    if (modOk(N.pilote, 'arreter')) N.pilote.arreter();
    /* partie() garde la compatibilité du jeu normal ; une fixture neutralise d'abord l'ancien
       cadrage, y compris après une autre fixture de boss ou de travelling. */
    if (modOk(N.colosse, 'reset')) N.colosse.reset();
    /* 12-cam déclare deux fonctions reset : world.reset est actuellement le reset caméra.
       Rétablir réellement le monde par son interface d'arène, sans corriger ce module ici. */
    W.arena({ x: 0, y: 0, w: W.W, h: W.H }, R.monde.mobile.glissementMin);
    N.cam.update(R.monde.mobile.glissementMin); N.cam.reset(); N.decor.reset(); O.geom();
    reset(seed, { depart: 'jeu' });
    dbg.input({ x: 0, y: 0, mag: 0, fire: false, boost: false, pouvoir: false, apogee: false });
    N.horloge.avancer();                 // même amorçage que le protocole officiel des parties
    var v = R.secteurs[0].vagues, last = v[v.length - 1], i;
    if (nom === 'v5' || nom === 'charge' || nom === 'boss3') N.dir.demarrer(last.n);
    if (nom === 'travelling') N.dir.demarrer(C.travelling.vague);
    if (nom === 'inversion') N.dir.demarrer(C.inversion.vague);
    E.reset();

    if (nom === 'charge' || nom === 'boss3') {
      lancerBoss();
      /* Passer les phases par les dégâts et leurs fenêtres, avec les vrais répits. La joueuse est
         tenue au centre pendant la préparation uniquement ; aucune vulnérabilité n'est falsifiée. */
      var ancienGod = J.god(), h = R.temps.h, src = { genre: 'arme', type: 'canon', id: 0 };
      J.god(true);
      for (i = 0; i < C.boss.preparationMax / h && N.colosse.phase() < C.boss.phase; i++) {
        var centre = W.rect();
        J.force({ x: centre.x + centre.w / 2, y: centre.y + centre.h / 2, trace: true });
        dbg.simuler(h);
        if (N.colosse.phase() >= C.boss.phase) break;
        E.list.slice().forEach(function (e) { if (e.boss && e.etat !== 'mort') E.hit(e, R.colosse.pvPhase, src); });
      }
      J.god(ancienGod);
      if (N.colosse.phase() !== C.boss.phase) return false;
      /* Purger les renforts de préparation via la vraie source décor (sans score/butin). */
      E.list.slice().forEach(function (e) { if (!e.boss) E.hit(e, e.pv, { genre: 'decor', type: 'purge', id: 0 }); });
      E.effacerTirs(W.W / 2, W.H / 2, W.W + W.H); E.update(0);
      N.butin.reset(); N.fx.reset(); N.hud.reset();
      if (nom === 'boss3') { N.cam.reset(); publier(); return true; }
      buildMax();
      groupe(C.charge.ennemis);
      for (i = 0; i < C.charge.tirs; i++) {
        var a = i / C.charge.tirs * O.TAU;
        E.tir(J.tete.x + Math.cos(a) * C.groupe.devant, J.tete.y + Math.sin(a) * C.groupe.devant,
          Math.cos(a) * R.ennemis.tourelle.balle, Math.sin(a) * R.ennemis.tourelle.balle);
      }
      N.decor.fixer(last.quartier, last.etat);
    } else if (nom === 'v5' || nom === 'travelling') {
      if (nom === 'v5') buildMax();
      var depuis = C.travelling.depuis;
      J.reset({ x: depuis + C.travelling.queueMur + J.len() * R.longueur.espacement,
        y: W.H / 2, ang: 0, len: J.len() });
      if (!A.travelling(R.arene.travelling.vitesses[N.dir.vague()] * C.travelling.sens, depuis)) return false;
      /* Mise en place et annonce réelles ; avancer l'arène et la caméra, pas une partie pilotée. */
      for (i = 0; i <= (R.arene.travelling.miseEnPlace + R.arene.travelling.annonce) / R.temps.h && A.etat().tv !== 'marche'; i++) {
        N.horloge.avancer(); A.update(R.temps.h); N.cam.update(R.temps.h);
      }
      if (A.etat().tv !== 'marche') return false;
      J.reset({ x: W.x0 + C.travelling.queueMur + J.len() * R.longueur.espacement,
        y: W.H / 2, ang: 0, len: J.len() });
      O.geom();
      if (nom === 'v5') { groupe(last.plafond); if (!A.convois({ voie: C.convoi.voie, sens: C.convoi.sens })) return false; }
    } else if (nom === 'lasso6') {
      J.reset({ x: J.tete.x, y: J.tete.y, ang: J.tete.ang, len: C.lasso6.longueur });
      groupe(C.lasso6.cibles, true);
    } else if (nom === 'inversion') {
      groupe(C.inversion.proies, false, true); J.inversionDebut();
    } else if (nom === 'convoi') {
      var voie = R.arene.convois.voies[C.convoi.voie];
      J.reset({ x: W.W / 2, y: voie + R.arene.convois.hauteurVoie + C.groupe.marge, len: J.len() });
      if (!A.convois({ voie: C.convoi.voie, sens: C.convoi.sens })) return false;
      for (i = 0; i < (R.arene.convois.annonce + C.convoi.avance) / R.temps.h; i++) {
        N.horloge.avancer(); A.update(R.temps.h); N.cam.update(R.temps.h);
      }
      for (i = 0; i < C.convoi.cibles; i++) E.spawn('mine', W.W / 2 + i * C.groupe.ecart, voie, { st: 'pose' });
    }
    N.cam.reset(); O.geom(); publier();
    return true;

    function buildMax() {
      O.geom();
      J.reset({ x: O.A.x0 + R.longueur.max * R.longueur.espacement + C.groupe.marge,
        y: (O.A.y0 + O.A.y1) / 2, ang: 0, len: R.longueur.max });
      N.ids.armes.forEach(function (arme) {
        for (var k = N.arsenal.niveau(arme); k < R.armes.paliers; k++) N.arsenal.monter(arme);
      });
    }
    function groupe(n, fixe, proies) {
      N.cam.reset(); O.geom();
      var V = O.VUE, m = C.groupe.marge, c = fixe ? C.lasso6 : C.groupe;
      var cols = Math.max(1, Math.min(c.colonnes, n, Math.floor((V.w - m * 2) / c.ecart))), rows = Math.ceil(n / cols);
      var cx = J.tete.x + C.groupe.devant, cy = J.tete.y;
      cx = O.clamp(cx, V.x + m + cols * c.ecart / 2, V.x + V.w - m - cols * c.ecart / 2);
      cy = O.clamp(cy, V.y + m + rows * c.ecart / 2, V.y + V.h - m - rows * c.ecart / 2);
      var types = proies ? N.ids.ennemis.filter(function (t) { return t !== 'traqueur' && t !== 'planeur' && t !== 'rival'; }) : N.ids.ennemis;
      for (var k = 0; k < n; k++) E.spawn(fixe ? 'tourelle' : types[k % types.length],
        O.clamp(cx + ((k % cols) - (cols - 1) / 2) * c.ecart, O.A.x0 + m, O.A.x1 - m),
        O.clamp(cy + (Math.floor(k / cols) - (rows - 1) / 2) * c.ecart, O.A.y0 + m, O.A.y1 - m), fixe ? { st: 'pose' } : {});
    }
  }

  /* Instrumentation installée au premier appel seulement : zéro emballage de dessin en jeu normal.
     Les portées de dessin disent QUI écrit ; les sprites distinguent tête/corps, le glyphe ♥ les vies.
     Les écritures directes au tampon passent par gfx.suivre, sans estimation géométrique ni chromatique. */
  var masqueInstalle = false, masqueRestaurations = [];
  function instrumenterMasque() {
    if (masqueInstalle) return;
    masqueInstalle = true;
    var g = N.gfx, ids = N.ids.proprietaires, sprites = new WeakMap();
    function remplacer(obj, nom, fn) {
      var original = obj[nom]; obj[nom] = fn;
      masqueRestaurations.push(function () { if (obj[nom] === fn) obj[nom] = original; });
    }
    function envelopper(obj, nom, code) {
      if (!modOk(obj, nom)) return;
      var original = obj[nom];
      remplacer(obj, nom, function () { return g.suivre(code, original, this, arguments); });
    }
    [['decor', ids.decor], ['ennemis', ids.ennemi], ['colosse', ids.ennemi], ['arene', ids.ennemi],
      ['butin', ids.butin], ['arsenal', ids.arsenal], ['joueuse', ids.corps], ['fx', ids.effet],
      ['hud', ids.hud], ['ui', ids.hud], ['intro', ids.decor], ['vol', ids.effet], ['warp', ids.arsenal]].forEach(function (a) {
      ['draw', 'drawTop', 'drawFar', 'drawPlateau', 'drawFront', 'drawTele', 'drawEnemies', 'drawEcran'].forEach(function (f) { envelopper(N[a[0]], f, a[1]); });
    });
    var sp = O.sp, blit = g.blit, text = O.text, rect = g.rect;
    remplacer(O, 'sp', function (nom) {
      var s = sp.apply(this, arguments);
      if (s && (nom === 'tete' || nom.indexOf('tete:') === 0)) sprites.set(s, ids.tete);
      return s;
    });
    remplacer(g, 'blit', function (s) {
      var code = g.owner();
      return g.suivre(code === ids.corps && sprites.has(s) ? sprites.get(s) : code, blit, this, arguments);
    });
    remplacer(O, 'text', function (str) { return g.suivre(g.owner() === ids.hud && str === '♥' ? ids.vies : g.owner(), text, this, arguments); });
    /* Le radar dessine une représentation de la tête. Identifier sa primitive par sa position
       projetée et ses dimensions contractuelles, jamais par son encre (un cyan de décor reste décor). */
    remplacer(g, 'rect', function (x, y, w, h) {
      var code = g.owner(), r = R.radar, b = R.tests.masque.radar, V = O.geo;
      if (code === ids.hud && w === r.tete[0] && h === r.tete[1] && g.ox() === 0 && g.oy() === 0 && N.world && N.hud.boutons) {
        var rx = V.portrait ? N.hud.boutons().pause.x - r.w - b.retraitBouton : Math.round(V.W / 2 - r.w / 2);
        var iw = r.w - b.bord * 2, ih = r.h - b.bord * 2, P = N.joueuse.tete;
        var mx = rx + b.bord + O.clamp(Math.round(P.x / N.world.W * (iw - b.bord)), 0, iw - b.bord);
        var my = (V.safe.t | 0) + b.bord + O.clamp(Math.round(P.y / N.world.H * (ih - b.bord)), 0, ih - b.bord);
        if (x === mx && y === my) code = ids.tete;
      }
      return g.suivre(code, rect, this, arguments);
    });
  }
  dbg.masque = function (actif) {
    if (actif === false) {
      while (masqueRestaurations.length) masqueRestaurations.pop()();
      masqueInstalle = false;
      return N.gfx.masque(false);
    }
    instrumenterMasque();
    /* Le premier appel arme la PROCHAINE image. Les lectures suivantes rendent le masque de
       la dernière image dessinée, sans dessiner, avancer l'état ou déduire les codes après coup. */
    return N.gfx.masque(true);
  };

  function etatCourant() { return et; }

  return {
    reset: reset, update: update, draw: draw, drawTop: drawTop, tension: tension, etat: etatCourant, dbg: dbg,
    /* ajouts : pour 80-ecrans / les outils */
    aller: aller, lancer: lancer
  };
})();
