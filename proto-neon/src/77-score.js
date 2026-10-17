/* ===== 77-score.js — N.score : score, chaîne, vies, défis, énergie, déblocages, profil, records =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 8. Ce qui vient de la démo (70-game.js, réparti
   par le lot 0b) : les points par kill multipliés, la chaîne et sa fenêtre, le record mémorisé, le stockage
   protégé par try/catch (on joue quand même si le navigateur le refuse). Ce qui change avec le contrat 1.0 :
     - chiffres de N.R.score (bases par type, chaîne de N.R.score.chaine.fenetre s, mult = N.R.f.mult) ;
     - les vies (N.R.vies) : −1 à chaque 'mort', une vie bonus à N.R.vies.seuilBonus ;
     - les défis : FINIR et deux défis du jour tirés dans N.rng.flux(S.jour, 'defis'), un défi par vague
       tiré dans N.rng('defis') ; le repli en juge quelques-uns (FINIR, CHAÎNE ×5, PREMIER JET, SANS FILET,
       RAMASSE 15 CELLULES, ABATS LES 2 MINES) et annonce chaque issue par l'événement 'defi' ;
     - l'énergie (une par cellule, cinq par noyau) et les déblocages de N.R.deblocages ('deblocage') ;
     - LA PERSISTANCE, seul écrivain : localStorage['snake2975.v1'] = {v, profil, records, reglages} ;
     - S.reglages, au schéma de CONTRAT.md § 11 ; profil.reglages(obj) les change et les applique en
       demandant à leurs propriétaires (N.music.mute, N.fx.setShake / setFlash, N.crt.preset).
   Consommateurs : rang 20 (kill, coupe, mort, ramassage, lasso, vague, vol, phase) et rang 80 (kill, coupe,
   mort, ramassage, lasso, vague, vol, inversion). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '77-score';

  function R() { return N.R; }
  function H() { return (N.horloge && N.horloge.t) ? N.horloge.t() : 0; }

  var C = { score: 0, chaine: 0, dernier: -99, kills: 0, vieBonus: false, morts: 0, cellules: 0, energie: 0, vagueKills: {}, vagueCellules: 0 };
  var DEFIS = [], DEFIV = null;
  var STATS = { kills: 0, parType: {}, cellules: 0, noyaux: 0, coupes: 0, morts: 0, lassos: 0, vagueMax: 0, quartier: 'docks', duree: 0, victoire: false };
  var OBJ = { mult: 1, reste: 0 }, BUILD = { nom: 'TIREUSE', armes: [] }, PROCH = { id: null, reste: 0, part: 1 };

  /* ================================ la persistance (seul écrivain) ================================ */
  var DONNEES = { v: 1, profil: { energie: 0, deblocages: [], defisFaits: [], parties: 0, codex: [], gestesVus: [] }, records: [], reglages: null };
  function cle() { return (R() && R().persistance && R().persistance.cle) || 'snake2975.v1'; }
  function charger() {
    try {
      if (typeof localStorage === 'undefined') return DONNEES;
      var t = localStorage.getItem(cle());
      if (t) {
        var o = JSON.parse(t);
        if (o && o.v === 1) {
          if (o.profil) for (var k in DONNEES.profil) {
            if (!(k in o.profil)) continue;
            var v = o.profil[k], dst = DONNEES.profil[k];
            if (Array.isArray(dst)) { if (Array.isArray(v)) { dst.length = 0; for (var q = 0; q < v.length; q++) dst.push(v[q]); } }
            else if (typeof v === typeof dst) DONNEES.profil[k] = v;
          }
          if (Array.isArray(o.records)) { DONNEES.records.length = 0; for (var r = 0; r < o.records.length && r < 10; r++) DONNEES.records.push(o.records[r]); }
          if (o.reglages) DONNEES.reglages = o.reglages;
        }
      }
    } catch (e) { /* stockage refusé ou illisible : tout vit le temps de la session */ }
    return DONNEES;
  }
  function sauver() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(cle(), JSON.stringify(DONNEES)); } catch (e) { /* refusé : sans erreur */ }
  }
  /* S.reglages : les défauts de N.R.reglages, corrigés par ce qui est mémorisé */
  var REG = null;
  function reglages(obj) {
    var s = N.S;
    if (!REG) {
      var d = (R() && R().reglages) || { musique: true, effets: true, secousse: 1, flashs: true, ecran: 'riche', texte: 1, manche: 1, actions: 'doigts' };
      REG = {}; for (var k in d) REG[k] = d[k];
      if (DONNEES.reglages) for (k in REG) if (k in DONNEES.reglages) REG[k] = DONNEES.reglages[k];
      if (N.ids && N.ids.valider('reglages', REG).length) { REG = {}; for (k in d) REG[k] = d[k]; }
    }
    if (obj && typeof obj === 'object') {
      for (var c in obj) if (c in REG) REG[c] = obj[c];
      if (N.ids && N.ids.valider('reglages', REG).length) { /* valeur hors contrat : on garde les défauts de la ligne */
        var d2 = (R() && R().reglages) || {}; var er = N.ids.valider('reglages', REG);
        for (c in obj) if (er.join(' ').indexOf('.' + c) >= 0) REG[c] = d2[c];
      }
      DONNEES.reglages = REG; sauver();
    }
    if (s) s.reglages = REG;
    appliquer();
    return REG;
  }
  function appliquer() {
    var g = REG; if (!g) return;
    try {
      if (N.music && N.music.mute) { N.music.mute('musique', !g.musique); N.music.mute('effets', !g.effets); }
      if (N.fx && N.fx.setShake) N.fx.setShake(g.secousse);
      if (N.fx && N.fx.setFlash) N.fx.setFlash(g.flashs);
    } catch (e) { if (N.socle) N.socle.signaler('77-score.reglages', e); }
  }

  /* ================================ les défis ================================ */
  function nomDefi(id) {
    var D = R() && R().defis; if (!D) return id;
    if (id === 'finir') return 'FINIR';
    if (D.reserve[id]) return D.reserve[id].nom;
    for (var v in D.vague.liste) { var L = D.vague.liste[v]; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i].texte; }
    return id;
  }
  function primeDe(id) {
    var D = R() && R().defis; if (!D) return 0;
    if (id === 'finir') return D.finir.prime;
    if (D.reserve[id]) return D.reserve[id].prime;
    return D.vague.prime;
  }
  function tirerDefis() {
    DEFIS.length = 0;
    DEFIS.push({ id: 'finir', nom: nomDefi('finir'), etat: 'actif', prime: primeDe('finir') });
    var res = (R() && R().defis) ? Object.keys(R().defis.reserve) : [], s = N.S, jour = (s && s.jour) || 20261017;
    var f = N.rng && N.rng.flux ? N.rng.flux(jour, 'defis') : null;
    var pris = {};
    for (var k = 0; k < ((R() && R().defis.duJour) || 2) && res.length; k++) {
      var i = f ? f.i(0, res.length - 1) : k, g = 0;
      while (pris[res[i]] && g++ < 20) i = (i + 1) % res.length;
      pris[res[i]] = 1;
      DEFIS.push({ id: res[i], nom: nomDefi(res[i]), etat: 'actif', prime: primeDe(res[i]) });
    }
  }
  function issue(d, ok) {
    if (!d || d.etat !== 'actif') return;
    d.etat = ok ? 'reussi' : 'rate';
    if (ok) C.score += d.prime;
    if (N.ev) N.ev.emit('defi', { id: d.id, ok: !!ok, prime: ok ? d.prime : 0 });
    if (ok && DONNEES.profil.defisFaits.indexOf(d.id) < 0) DONNEES.profil.defisFaits.push(d.id);
  }
  function defi(id) { for (var i = 0; i < DEFIS.length; i++) if (DEFIS[i].id === id) return DEFIS[i]; return null; }
  function defiVague(n) {
    var L = R() && R().defis && R().defis.vague.liste[n];
    if (!L || !L.length) { DEFIV = null; return; }
    var e = L[N.rng('defis').i(0, L.length - 1)];
    DEFIV = { id: e.id, nom: e.texte, etat: 'actif', prime: primeDe(e.id), n: n, _def: e };
    C.vagueKills = {}; C.vagueCellules = 0;
  }
  function jugerVague() {
    var d = DEFIV; if (!d || d.etat !== 'actif') return;
    var e = d._def, ok = false;
    if (e.cellules) ok = C.vagueCellules >= e.cellules;
    else if (e.mines) ok = (C.vagueKills.mine | 0) >= e.mines;
    else if (e.tourelles) ok = (C.vagueKills.tourelle | 0) >= e.tourelles;
    issue(d, ok);
  }

  /* ================================ les consommateurs ================================ */
  function mult() { return (R() && R().f && R().f.mult) ? R().f.mult(C.chaine) : 1; }
  function fenetre() { return (R() && R().score && R().score.chaine.fenetre) || 2.5; }
  function points(n) {
    var avant = C.score; C.score += n;
    var V = R() && R().vies;
    if (V && !C.vieBonus && avant < V.seuilBonus && C.score >= V.seuilBonus) { C.vieBonus = true; score.vies = Math.min(V.max || 4, score.vies + (V.bonus || 1)); }
    score.score = C.score;
  }
  function abonner() {
    var on = N.ev && N.ev.on;
    if (!on) return;
    on('kill', 20, function (c) {
      if (c.src && c.src.genre === 'decor') return;                      // dépassé par le mur, purge : ni score ni chaîne
      var t = H();
      C.chaine = (t - C.dernier <= fenetre()) ? C.chaine + 1 : 1; C.dernier = t;
      points((c.base || 0) * mult());
    }, QUI);
    on('kill', 80, function (c) {
      if (c.src && c.src.genre === 'decor') return;
      STATS.kills++; STATS.parType[c.type] = (STATS.parType[c.type] | 0) + 1; C.vagueKills[c.type] = (C.vagueKills[c.type] | 0) + 1;
      var pj = defi('premierJet'), PJ = R() && R().defis.reserve.premierJet;
      if (pj && pj.etat === 'actif' && PJ) { if (H() > PJ.avant) issue(pj, false); else if (STATS.kills >= PJ.destructions) issue(pj, true); }
      var c5 = defi('chaine5'); if (c5 && mult() >= ((R() && R().defis.reserve.chaine5.mult) || 5)) issue(c5, true);
    }, QUI);
    on('coupe', 20, function () { var sf = N.cartes && N.cartes.mods && N.cartes.mods.sangFroid; if (!sf) C.chaine = Math.floor(C.chaine / ((R() && R().score.chaine.coupeDiviseur) || 2)); }, QUI);
    on('coupe', 80, function () { STATS.coupes++; var sc = defi('sansCoupe'); if (sc) issue(sc, false); }, QUI);
    on('mort', 20, function () { score.vies = Math.max(0, score.vies - 1); C.chaine = 0; C.morts++; STATS.morts++; }, QUI);
    on('mort', 80, function () { var sf = defi('sansFilet'); if (sf) issue(sf, false); }, QUI);
    on('ramassage', 20, function (c) {
      var B = R() && R().butin;
      points(c.type === 'noyau' ? ((B && B.noyau.points) || 200) : c.type === 'cellule' ? ((B && B.cellule.points) || 10) * mult() : 0);
    }, QUI);
    on('ramassage', 80, function (c) {
      var B = R() && R().butin, e = c.type === 'noyau' ? ((B && B.noyau.energie) || 5) : c.type === 'cellule' ? ((B && B.cellule.energie) || 1) : 0;
      C.energie += e; score.energie = C.energie; C.vagueCellules += c.type === 'cellule' ? 1 : 0;
      if (c.type === 'cellule') STATS.cellules++; if (c.type === 'noyau') STATS.noyaux++;
    }, QUI);
    on('lasso', 20, function (c) { points(100 * (c.n | 0) * mult()); }, QUI);
    on('lasso', 80, function (c) { STATS.lassos++; var l6 = defi('lasso6'); if (l6 && (c.n | 0) >= 6) issue(l6, true); }, QUI);
    on('vague', 20, function (c) {
      if (c.evt === 'nettoyee') points(((R() && R().score.primes.vague.parVague) || 1000) * Math.max(1, c.n));
      if (c.evt === 'entree') { STATS.vagueMax = Math.max(STATS.vagueMax, c.n); STATS.quartier = c.quartier; }
    }, QUI);
    on('vague', 80, function (c) {
      if (c.evt === 'entree' && c.etape === 'vague') defiVague(c.n);
      if (c.evt === 'nettoyee') jugerVague();
    }, QUI);
    on('vol', 20, function (c) { var V = R() && R().score.primes.vol; if (c.evt === 'porte') points((V && V.porte) || 500); if (c.evt === 'fin' && c.parfait) points((V && V.parfait) || 5000); }, QUI);
    on('vol', 80, function (c) { var vp = defi('volParfait'); if (vp && c.evt === 'fin' && c.parfait) issue(vp, true); }, QUI);
    on('phase', 20, function (c) {
      var P = R() && R().score.primes.cyclope;
      if (c.evt === 'entree' && c.n > 1) points((P && P.phase) || 5000);
      if (c.evt === 'mort') { points((P && P.mort) || 25000); STATS.victoire = true; issue(defi('finir'), true); var sf = defi('sansFilet'); if (sf) issue(sf, C.morts === 0); }
    }, QUI);
    on('inversion', 80, function () { /* GLOUTONNE, DÉVORE n : lot 8 */ }, QUI);
  }

  /* ---- la fin de partie : les défis encore ouverts sont ratés, l'énergie et les records sont gardés ---- */
  function finPartie(victoire) {
    STATS.duree = H(); STATS.victoire = !!victoire;
    for (var i = 0; i < DEFIS.length; i++) if (DEFIS[i].etat === 'actif') issue(DEFIS[i], false);
    var avant = DONNEES.profil.energie;
    DONNEES.profil.energie = avant + C.energie; DONNEES.profil.parties++;
    var L = (R() && R().deblocages) || [];
    for (i = 0; i < L.length; i++) if (avant < L[i].seuil && DONNEES.profil.energie >= L[i].seuil && DONNEES.profil.deblocages.indexOf(L[i].id) < 0) {
      DONNEES.profil.deblocages.push(L[i].id);
      if (N.ev) N.ev.emit('deblocage', { id: L[i].id });
    }
    sauver();
  }
  function entreRecords(sc) {
    var R10 = DONNEES.records, n = (R() && R().ecrans && R().ecrans.records.nombre) || 10;
    return sc > 0 && (R10.length < n || sc > R10[R10.length - 1].score);
  }
  function inscrire(initiales) {
    var n = (R() && R().ecrans && R().ecrans.records.nombre) || 10;
    DONNEES.records.push({ score: C.score, initiales: String(initiales || 'AAA').slice(0, 3), vague: STATS.vagueMax, jour: (N.S && N.S.jour) || 0 });
    DONNEES.records.sort(function (a, b) { return b.score - a.score; });
    if (DONNEES.records.length > n) DONNEES.records.length = n;
    sauver();
  }

  var score = {
    reset: function () {
      C.score = 0; C.chaine = 0; C.dernier = -99; C.kills = 0; C.vieBonus = false; C.morts = 0; C.energie = 0; C.vagueKills = {}; C.vagueCellules = 0;
      score.score = 0; score.energie = 0;
      score.vies = (R() && R().vies && R().vies.depart) || 3;
      for (var k in STATS.parType) delete STATS.parType[k];
      STATS.kills = STATS.cellules = STATS.noyaux = STATS.coupes = STATS.morts = STATS.lassos = STATS.vagueMax = STATS.duree = 0; STATS.victoire = false; STATS.quartier = 'docks';
      DEFIV = null; score.defiVague = null;
      charger(); reglages();
      tirerDefis();
      abonner();
    },
    score: 0,
    chaine: function () { if (H() - C.dernier > fenetre()) C.chaine = 0; return C.chaine; },
    mult: function () { score.chaine(); return mult(); },
    objectif: function () { score.chaine(); OBJ.mult = mult(); OBJ.reste = (R() && R().f && R().f.objectif) ? R().f.objectif(C.chaine) : 0; return OBJ; },
    vies: 3,
    defis: DEFIS,
    defiVague: null,
    stats: STATS,
    build: function () {
      var A = N.arsenal ? N.arsenal.armes() : [], best = null;
      for (var i = 0; i < A.length; i++) if (!best || A[i].niveau > best.niveau) best = A[i];
      var noms = { canon: 'TIREUSE', tourelles: 'ARTILLEUSE', missiles: 'ARTILLEUSE', arc: 'ORAGE', drones: 'ESSAIM', minesQ: 'POSEUSE' };
      BUILD.nom = (best && noms[best.id]) || 'TIREUSE'; BUILD.armes = A;
      return BUILD;
    },
    energie: 0,
    deblocages: DONNEES.profil.deblocages,
    prochain: function () {
      var L = (R() && R().deblocages) || [], e = DONNEES.profil.energie + C.energie, prev = 0;
      for (var i = 0; i < L.length; i++) {
        if (DONNEES.profil.deblocages.indexOf(L[i].id) < 0) { PROCH.id = L[i].id; PROCH.reste = Math.max(0, L[i].seuil - e); PROCH.part = Math.min(1, (e - prev) / Math.max(1, L[i].seuil - prev)); return PROCH; }
        prev = L[i].seuil;
      }
      PROCH.id = null; PROCH.reste = 0; PROCH.part = 1; return PROCH;
    },
    profil: { charger: charger, sauver: sauver, reglages: reglages, donnees: function () { return DONNEES; } },
    records: DONNEES.records,
    /* appelés par 79-jeu à la fin de la partie (demandes d'action à leur propriétaire) */
    _fin: finPartie, _entreRecords: function () { return entreRecords(C.score); }, _inscrire: inscrire
  };
  /* le défi de vague courant, lisible sans appel */
  Object.defineProperty(score, 'defiVague', { get: function () { return DEFIV; }, set: function () {}, enumerable: true });
  N.score = score;
})();
