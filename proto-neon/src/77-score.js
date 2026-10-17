/* ===== 77-score.js — N.score : score, chaîne, vies, défi, statistiques, profil, records, réglages =====

   Tiré de 70-game.js (lot 0b) : mult, kill (points et chaîne), defiOk, defiRate, le record mémorisé. Le multiplicateur
   suit désormais la CHAÎNE (N.R.score.mult : +1 tous les 5 kills de la chaîne, jusqu'à ×8 ; la chaîne s'éteint 2,5 s
   après le dernier kill et est divisée par deux par une coupe du corps) au lieu de la longueur.

   SEUL ÉCRIVAIN de la persistance (§ 7.10) : localStorage['snake2975.v1'] = { v: 1, profil, records, reglages },
   toujours sous try/catch ; sans stockage tout vit le temps de la session. C'est aussi lui qui tient S.reglages.

   CONSOMME (jamais d'appel direct des effets, § 7.4) : `kill` rang 20 (points et chaîne) et 80 (défi), `ramassage`
   20 (points de la cellule), `coupe` 20 (chaîne ÷ 2), `mort` 20 (une vie de moins), `vague` 20 (prime de fin de
   vague). ÉMET `defi` : { id, ok, prime }.
   Interface (§ 7.8) : reset(), score, chaine(), mult(), objectif(), vies, defis, defiVague, stats, build(), energie,
   deblocages, prochain(), profil { charger, sauver, reglages(obj?) }, records. Ajout : defi (le défi courant,
   que 78-hud lit), gain (le dernier gain de points, pour les gains flottants), update(dt). */
N.score = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // → N.R : le défi de la démo (DIX KILLS EN CHAÎNE), absent de N.R.defis
    defiNom: 'DIX KILLS EN CHAÎNE', defiBut: 10, defiPrime: 5000, cle: 'snake2975.v1', cleAncienne: 'snake2975.record', ancienSon: 'snake2975.son'
  };
  var REG0 = { musique: true, effets: true, secousse: 1, flashs: true, ecran: 'riche', texte: 1, manche: 1, actions: 'doigts' };
  var API = null;
  var S = null;
  var m = {                                       // l'état de la partie
    score: 0, chaine: 0, dernier: -99, vies: 3, bonus: false, defi: null, gain: null, stats: null, newRecord: false, resume: null
  };
  var disque = { v: 1, profil: { energie: 0, deblocages: [], defisFaits: [], parties: 0, codex: [], gestesVus: [] }, records: [], reglages: null };
  var lu = false;

  /* ============================ la persistance ============================ */
  function charger() {
    lu = true;
    try {
      var raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CFG.cle) : null;
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.v === 1) { disque = o; if (!disque.profil) disque.profil = { energie: 0, deblocages: [], defisFaits: [], parties: 0, codex: [], gestesVus: [] }; if (!disque.records) disque.records = []; }
      } else {
        /* la démo mémorisait un record seul et la coupure du son : on les reprend une fois */
        var rec = +O.load(CFG.cleAncienne) || 0; if (rec > 0) disque.records = [rec];
        if (O.load(CFG.ancienSon) === '0') disque.reglages = { musique: false, effets: false };
      }
    } catch (e) { /* stockage refusé ou corrompu : on joue quand même */ }
    var g = {}, k;
    for (k in REG0) g[k] = REG0[k];
    if (disque.reglages) for (k in disque.reglages) if (k in REG0) g[k] = disque.reglages[k];
    disque.reglages = g;
    if (!S) S = N.S;
    if (S) S.reglages = g;
    return disque;
  }
  function sauver() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(CFG.cle, JSON.stringify(disque)); } catch (e) { /* refusé */ }
  }
  /* reglages(obj?) : lit (sans argument) ou change et mémorise les réglages ; S.reglages est TOUJOURS le même objet */
  function reglages(o) {
    if (!lu) charger();
    if (o) { for (var k in o) if (k in REG0) disque.reglages[k] = o[k]; if (S) S.reglages = disque.reglages; sauver(); }
    return disque.reglages;
  }

  /* ============================ la partie ============================ */
  function nouveauDefi() { return { nom: CFG.defiNom, but: CFG.defiBut, prog: 0, meilleur: 0, etat: 'actif', t: -1, id: 'finir' }; }
  function reset() {
    S = N.S;
    if (!lu) charger();
    m.score = 0; m.chaine = 0; m.dernier = -99; m.vies = (R && R.vies && R.vies.depart) || 3; m.bonus = false; m.newRecord = false; m.gain = null;
    m.defi = nouveauDefi();
    m.stats = { kills: 0, killsBy: {}, morts: [], coupes: 0, maxChaine: 0, ramassages: 0, tirs: 0, t0: O.T.t, victoire: null, energie: 0, lassos: 0, maxLasso: 0 };
    m.resume = null;
    API.score = 0; API.vies = m.vies; API.defi = m.defi; API.stats = m.stats;
    API.defis = { finir: m.defi }; API.defiVague = null;
    publier();
  }
  function publier() { if (!S) S = N.S; if (S) { S.score = m.score; S.lives = m.vies; S.challenge = m.defi; } API.score = m.score; API.vies = m.vies; }

  function mult() {
    var c = (R && R.score && R.score.mult) || { pas: 5, max: 8 };
    return Math.min(c.max, 1 + Math.floor(m.chaine / c.pas));
  }
  function objectif() {
    var c = (R && R.score && R.score.mult) || { pas: 5, max: 8 }, mu = mult();
    return mu >= c.max ? { mult: mu, reste: 0 } : { mult: mu + 1, reste: mu * c.pas - m.chaine };
  }
  function fenetre() { return (R && R.score && R.score.chaine && R.score.chaine.fenetre) || 2.5; }

  function ajouter(pts, x, y) {
    if (!(pts > 0)) return;
    m.score += pts;
    m.gain = { x: x, y: y, pts: pts, t: O.T.t };
    var seuil = (R && R.vies && R.vies.seuilBonus) || 80000, max = (R && R.vies && R.vies.max) || 4;
    if (!m.bonus && m.score >= seuil) {
      m.bonus = true;
      if (m.vies < max) { m.vies++; if (N.hud && N.hud.banniere) N.hud.banniere('VIE BONUS', { c: 'jaune' }); O.sfx('vie'); }
    }
    publier();
  }

  /* ---- les défis (repli : DIX KILLS EN CHAÎNE) ---- */
  function defiOk() {
    var d = m.defi;
    d.etat = 'reussi'; d.t = O.T.t; d.prog = d.but;
    ajouter(CFG.defiPrime, null, null);
    m.stats.energie += 20;                                           // § 2.14 : un défi de la réserve vaut 20 énergie
    if (N.arsenal && N.arsenal.surcharger) N.arsenal.surcharger(true);
    var max = (R && R.vies && R.vies.max) || 4; if (m.vies < max) m.vies++;
    O.sfx('defi');
    if (N.hud && N.hud.banniere) N.hud.banniere(['DÉFI RÉUSSI', d.nom, '+' + CFG.defiPrime + '  TIR SURCHARGÉ  +1 ♥'], { c: 'jaune', icone: '✓', duree: 2.8 });
    if (N.ev) N.ev.emit('defi', { id: 'finir', ok: true, prime: CFG.defiPrime });
    publier();
  }
  function defiRate() {
    var d = m.defi;
    if (d.etat !== 'actif') return;
    d.etat = 'rate'; d.t = O.T.t;
    O.sfx('degat');
    if (N.hud && N.hud.banniere) N.hud.banniere(['DÉFI RATÉ', d.nom], { c: 'rose', icone: '✗', duree: 2.4 });
    if (N.ev) N.ev.emit('defi', { id: 'finir', ok: false, prime: 0 });
  }

  /* ============================ les consommateurs ============================ */
  function estPurge(src) { return src && src.genre === 'decor' && src.type === 'purge'; }
  if (N.ev) {
    N.ev.on('kill', 20, function (c) {
      if (estPurge(c.src)) return;
      var t = O.T.t, st = m.stats;
      if (t - m.dernier <= fenetre()) m.chaine++; else m.chaine = 1;
      m.dernier = t;
      if (m.chaine > st.maxChaine) st.maxChaine = m.chaine;
      st.kills++; st.killsBy[c.type] = (st.killsBy[c.type] || 0) + 1;
      var pts = c.base * mult();
      if (c.boss) pts += (R && R.score && R.score.primes && R.score.primes.cyclope && R.score.primes.cyclope.mort) || 25000;
      ajouter(pts, c.x, c.y);
    }, '77-score');
    N.ev.on('kill', 80, function (c) {
      if (estPurge(c.src)) return;
      var d = m.defi;
      if (d && d.etat === 'actif') { d.prog = m.chaine; if (m.chaine > d.meilleur) d.meilleur = m.chaine; if (m.chaine >= d.but) defiOk(); }
    }, '77-score');
    N.ev.on('ramassage', 20, function (c) {
      m.stats.ramassages++;
      m.stats.energie += (R && R.butin && R.butin[c.type] && R.butin[c.type].energie) || 0;      // § 2.6 : 1 par cellule, 5 par noyau
      var pts = ((R && R.butin && R.butin[c.type] && R.butin[c.type].points) || 0) * mult();
      ajouter(pts, c.x, c.y);
    }, '77-score');
    N.ev.on('lasso', 20, function (c) {
      m.stats.lassos++; if (c.n > m.stats.maxLasso) m.stats.maxLasso = c.n;
    }, '77-score');
    N.ev.on('coupe', 20, function () {
      m.stats.coupes++;
      if (!(N.cartes && N.cartes.mods && N.cartes.mods.sangFroid)) m.chaine = Math.floor(m.chaine / ((R && R.score && R.score.chaine && R.score.chaine.coupeDiviseur) || 2));
      if (m.defi && m.defi.etat === 'actif') m.defi.prog = m.chaine;
    }, '77-score');
    N.ev.on('mort', 20, function (d) {
      m.vies = Math.max(0, m.vies - 1);
      m.chaine = 0;
      m.stats.morts.push({ cause: d.cause, auteur: d.auteur, t: d.t, vague: d.vague, visibleDepuis: d.visibleDepuis, teleDuree: d.teleDuree });
      publier();
    }, '77-score');
    N.ev.on('mort', 80, function () { if (m.vies <= 0) defiRate(); }, '77-score');
    N.ev.on('vague', 20, function (c) {
      if (c.evt !== 'nettoyee') return;
      var p = (R && R.score && R.score.primes && R.score.primes.vague && R.score.primes.vague.parVague) || 1000;
      ajouter(p * c.n, null, null);
    }, '77-score');
  }

  function update(dt) {
    if (!m.stats) return;
    var t = O.T.t;
    if (m.chaine > 0 && t - m.dernier > fenetre()) { m.chaine = 0; if (m.defi && m.defi.etat === 'actif') m.defi.prog = 0; }
  }

  /* fin de partie : le record, l'énergie, les déblocages, et le RÉSUMÉ que lit l'écran de fin ; `victoire` vrai si le colosse est tombé */
  function seuils() { return (R && R.deblocages) || []; }
  function prochainPour(e) {
    var L = seuils(), prec = 0;
    for (var i = 0; i < L.length; i++) { if (e < L[i].seuil) return { id: L[i].id, reste: L[i].seuil - e, part: O.clamp((e - prec) / (L[i].seuil - prec), 0, 1), seuil: L[i].seuil, prec: prec }; prec = L[i].seuil; }
    return null;
  }
  var FAMILLES = { canon: 'TIREUSE', tourelles: 'ARTILLEUSE', missiles: 'ARTILLEUSE', arc: 'ORAGE', drones: 'ESSAIM', minesQ: 'POSEUSE' };
  function build() {
    var armes = N.cartes && N.cartes.armes ? N.cartes.armes() : (N.arsenal ? N.arsenal.armes() : []), pal = {}, best = 'TIREUSE', top = -1, i;
    for (i = 0; i < armes.length; i++) {
      var a = armes[i], p = a.palier !== undefined ? a.palier : a.niveau || 1, f = FAMILLES[a.id] || 'TIREUSE';
      pal[f] = (pal[f] || 0) + p - (a.id === 'canon' ? 0.5 : 0);        // le canon seul ne l'emporte pas sur une arme prise
    }
    for (var k in pal) if (pal[k] > top) { top = pal[k]; best = k; }
    var lassoPart = m.stats && m.stats.kills ? 0 : 0;                   // → N.R : LASSO si plus de 30 % des destructions au lasso (non suivi : 70-joueuse ne l'émet pas par ennemi)
    return { nom: best, armes: armes, pouvoir: N.cartes && N.cartes.pouvoir ? N.cartes.pouvoir() : null, lasso: lassoPart };
  }
  function conseil(cause, auteur) {
    var L = (R && R.ecrans && R.ecrans.conseils) || [], clef = null, i;
    if (cause === 'mur') clef = 'mur'; else if (cause === 'morsure') clef = 'morsure'; else if (cause === 'convoi') clef = 'convoi'; else if (cause === 'traine') clef = 'traine';
    else if (auteur && { fleche: 1, dard: 1, tourelle: 1, lame: 1, mine: 1, sentinelle: 1, traqueur: 1 }[auteur]) clef = auteur;
    else if (m.stats && m.stats.lassos === 0) clef = 'aucunLasso';
    for (i = 0; i < L.length; i++) if (L[i][0] === clef) return L[i][1];
    return null;
  }
  function terminer(victoire) {
    if (!lu) charger();
    m.stats.victoire = !!victoire;
    var rec = disque.records.length ? Math.max.apply(null, disque.records) : 0, pr = disque.profil;
    m.newRecord = rec > 0 && m.score > rec;
    var dernier = pr.dernier || 0, avantE = pr.energie || 0;
    disque.records.push(m.score); disque.records.sort(function (a, b) { return b - a; });
    var nbRec = (R && R.ecrans && R.ecrans.records && R.ecrans.records.nombre) || 10;
    if (disque.records.length > nbRec) disque.records.length = nbRec;
    pr.parties++;
    var gagne = m.stats.energie + (victoire ? 50 : 0), debloques = [], L = seuils(), i;      // FINIR vaut 50 énergie (§ 2.14)
    pr.energie = avantE + gagne; pr.dernier = m.score;
    for (i = 0; i < L.length; i++) if (pr.energie >= L[i].seuil && pr.deblocages.indexOf(L[i].id) < 0) {
      pr.deblocages.push(L[i].id); debloques.push(L[i].id);
      if (N.ev) N.ev.emit('deblocage', { id: L[i].id });
    }
    sauver();
    var d = (S && S.death) || m.stats.morts[m.stats.morts.length - 1] || null, dir = N.dir;
    var tot = dir && dir.nombreVagues ? dir.nombreVagues() : 5, vague = d && d.vague ? d.vague : (dir && dir.vague ? dir.vague() : 1);
    var boss = !!(dir && dir.phase && dir.phase() === 'boss') || vague > tot;
    var note = victoire ? 'B' : boss ? 'C' : 'D';
    m.resume = {
      victoire: !!victoire, score: m.score, ecart: dernier > 0 ? m.score - dernier : null, record: Math.max(rec, m.score), nouveauRecord: m.newRecord,
      kills: m.stats.kills, maxChaine: m.stats.maxChaine, coupes: m.stats.coupes, lassos: m.stats.lassos, maxLasso: m.stats.maxLasso,
      pertes: m.stats.morts.length, cause: d ? d.cause : null, auteur: d ? d.auteur : null, vague: vague, quartier: d ? d.quartier : null,
      temps: O.T.t, progression: victoire ? 1 : (dir && dir.progression ? dir.progression() : 0), boss: boss, note: note,
      build: build(), defi: m.defi ? { nom: m.defi.nom, etat: m.defi.etat, prog: m.defi.prog, but: m.defi.but, meilleur: m.defi.meilleur } : null,
      energieGagnee: gagne, energie: pr.energie, avant: prochainPour(avantE), prochain: prochainPour(pr.energie), debloques: debloques,
      conseil: conseil(d ? d.cause : null, d ? d.auteur : null), cartes: N.cartes && N.cartes.prises ? N.cartes.prises() : {}
    };
    return { record: Math.max(rec, m.score), nouveau: m.newRecord };
  }
  function record() { if (!lu) charger(); return disque.records.length ? disque.records[0] : 0; }

  API = {
    reset: reset, update: update,
    score: 0, chaine: function () { return m.chaine; }, mult: mult, objectif: objectif, vies: 0,
    defis: {}, defiVague: null, defi: null, stats: null, gain: function () { return m.gain; },
    build: build, resume: function () { return m.resume; },
    energie: 0, deblocages: [], prochain: function () { if (!lu) charger(); return prochainPour(disque.profil.energie || 0); },
    profil: { charger: charger, sauver: sauver, reglages: reglages }, records: [],
    fenetreRestante: function () { return O.clamp(1 - (O.T.t - m.dernier) / fenetre(), 0, 1); },
    terminer: terminer, record: record, defiRate: defiRate, nouveauRecord: function () { return m.newRecord; },
    ajouter: function (pts, x, y) { ajouter(pts, x, y); }
  };
  /* records et déblocages : mêmes références que le disque une fois lu */
  Object.defineProperty(API, 'records', { get: function () { if (!lu) charger(); return disque.records; }, enumerable: true });
  Object.defineProperty(API, 'deblocages', { get: function () { if (!lu) charger(); return disque.profil.deblocages; }, enumerable: true });
  Object.defineProperty(API, 'energie', { get: function () { if (!lu) charger(); return disque.profil.energie; }, enumerable: true });
  return API;
})();
