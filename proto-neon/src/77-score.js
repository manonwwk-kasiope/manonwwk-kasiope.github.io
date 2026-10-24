/* ===== 77-score.js — N.score : score, chaîne, vies, défi, statistiques, profil, records, réglages =====

   Tiré de 70-game.js (lot 0b) : mult, kill (points et chaîne), defiOk, defiRate, le record mémorisé. Le multiplicateur
   suit désormais la CHAÎNE (N.R.score.mult : +1 tous les 5 kills de la chaîne, jusqu'à ×8 ; la chaîne s'éteint 2,5 s
   après le dernier kill et est divisée par deux par une coupe du corps) au lieu de la longueur.

   SEUL ÉCRIVAIN de la persistance (§ 7.10) : localStorage['snake2975.v1'] = { v: 1, profil, records, reglages },
   toujours sous try/catch ; sans stockage tout vit le temps de la session. C'est aussi lui qui tient S.reglages.

   CONSOMME (jamais d'appel direct des effets, § 7.4) : `kill` rang 20 (points et chaîne) et 80 (défi), `ramassage`
   20 (points de la cellule), `coupe` 20 (chaîne ÷ 2), `mort` 20 (une vie de moins), `vague` 20 (prime de fin de
   vague). ÉMET `defi` : { id, ok, prime }.
   LE RÉSUMÉ (lot F) : terminer(victoire) range dans resume() tout ce que l'écran de fin affiche (cause, vague, quartier,
   heure, progression, écart à la partie précédente, record, build, bilan, note, défi, conseil du § 5.6.1, énergie gagnée,
   déblocages franchis, prochain déblocage avant / après), met l'énergie au profil (cellule 1, noyau 5, défi 20, FINIR 50),
   ouvre les déblocages (émet `deblocage`) et garde les dix records. Note : B si le CYCLOPE tombe, C s'il est atteint, sinon D.
   Interface (§ 7.8) : reset(), score, chaine(), mult(), objectif(), vies, defis, defiVague, stats, build(), energie,
   deblocages, prochain(), profil { charger, sauver, reglages(obj?) }, records. Ajout : defi (le défi courant,
   que 78-hud lit), gain (le dernier gain de points, pour les gains flottants), update(dt). */
N.score = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                    // Compatibilité du combat reçu ; chiffres dans N.R.defis.partie.legacy
    defiNom: R.defis.partie.legacy.nom, defiBut: R.defis.partie.legacy.but, defiPrime: R.defis.partie.legacy.prime, cle: 'snake2975.v1', cleAncienne: 'snake2975.record', ancienSon: 'snake2975.son'
  };
  var REG0 = R.reglages;
  var API = null;
  var S = null;
  var m = {                                       // l'état de la partie
    score: 0, chaine: 0, dernier: -99, vies: 3, bonus: false, defi: null, gain: null, stats: null, newRecord: false, resume: null, dv: null, dvFaits: 0
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
    // Le défaut une main ne remplace jamais un choix déjà mémorisé.
    if ((!disque.reglages || !Object.prototype.hasOwnProperty.call(disque.reglages, 'actions')) && O.hasTouch() && N.gfx.H > N.gfx.W) g.actions = 'auto';
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
    if (o) { for (var k in o) if (k in REG0) {
      var valeurs = R.reglagesValeurs[k];
      if (valeurs ? valeurs.indexOf(o[k]) >= 0 : typeof o[k] === 'boolean') disque.reglages[k] = o[k];
    } if (S) S.reglages = disque.reglages; sauver(); }
    return disque.reglages;
  }
  // La traversée du début est mémorisée dans le profil existant, jamais dans une seconde clé.
  function epoquesVues(b) {
    if (!lu) charger();
    if (b === true) { disque.profil.epoquesVues = true; sauver(); }
    return disque.profil.epoquesVues === true;
  }

  /* ============================ la partie ============================ */
  function nouveauDefi() { return { nom: CFG.defiNom, but: CFG.defiBut, prog: 0, meilleur: 0, etat: 'actif', t: -1, id: 'finir' }; }
  function reset() {
    S = N.S;
    if (!lu) charger();
    m.score = 0; m.chaine = 0; m.dernier = -99; m.vies = (R && R.vies && R.vies.depart) || 3; m.bonus = false; m.newRecord = false; m.gain = null;
    m.defi = nouveauDefi();
    m.stats = { kills: 0, killsBy: {}, morts: [], coupes: 0, maxChaine: 0, ramassages: 0, tirs: 0, t0: O.T.t, victoire: null, energie: 0, lassos: 0, maxLasso: 0 };
    m.scoreCombat = 0; m.sansMortDepuis = O.T.t; m.continuite = 0; m.continuiteDernier = -Infinity;
    m.activiteVague = { kills: 0, ramassages: 0 };
    m.lassoKills = {}; m.lassoTemps = -Infinity; m.stats.points = {};
    API.palier = null;
    m.resume = null; m.dv = null; m.dvFaits = 0; m.continuations = 0;
    API.score = 0; API.vies = m.vies; API.defi = m.defi; API.stats = m.stats;
    API.defis = defisDuJour(); API.defisVagues = []; API.defiVague = null;
    journalDefis('selection');
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

  function ajouter(pts, x, y, source, maitrise) {
    if (!(pts > 0)) return;
    m.score += pts;
    source = source || 'combat';
    m.stats.points[source] = (m.stats.points[source] || 0) + pts;
    // Le score reçu commandait aussi une vie. Les nouvelles primes restent purement comptables :
    // le même cumul de points de combat déclenche la même vie, au même pas qu'avant ce lot.
    if (!maitrise) m.scoreCombat += pts;
    if (maitrise && m.gain && m.gain.t === O.T.t && m.gain.x === x && m.gain.y === y) m.gain.pts += pts;
    else m.gain = { x: x, y: y, pts: pts, t: O.T.t };
    var seuil = (R && R.vies && R.vies.seuilBonus) || 80000, max = (R && R.vies && R.vies.max) || 4;
    if (!m.bonus && m.scoreCombat >= seuil) {
      m.bonus = true;
      if (m.vies < max) { m.vies++; if (N.hud && N.hud.banniere) N.hud.banniere('VIE BONUS', { c: 'jaune' }); O.sfx('vie'); }
    }
    publier();
  }

  /* Une continuité plus accueillante pour le score, sans modifier la chaîne publique de combat,
     ses effets, les primes de p12, ni le défi historique qui fournit une vie et la surcharge.
     On ne paie que le supplément au multiplicateur déjà reçu : aucune base comptée deux fois. */
  function recompensesKill(c, mu) {
    var cfg = R.score.maitrise, src = c.src;
    if (!src || (src.genre !== 'arme' && src.genre !== 'joueuse')) return;
    var t = O.T.t;
    m.continuite = t - m.continuiteDernier <= cfg.continuiteFenetre ? m.continuite + 1 : 1;
    m.continuiteDernier = t;
    var lie = R.f.mult(m.continuite);
    ajouter(c.base * Math.max(0, lie - mu), c.x, c.y, 'continuite', true);
    var palier = Math.min(cfg.survie.max, Math.floor(Math.max(0, t - m.sansMortDepuis) / cfg.survie.palier));
    ajouter(c.base * palier, c.x, c.y, 'survie', true);
    var J = N.joueuse, P = J && J.tete;
    if (P && J.etat === 'vivant' && !(J.invul && J.invul())) {
      var d = R.score.primes.boutPortant.distance, dx = c.x - P.x, dy = c.y - P.y;
      var mur = J.distMur && J.distMur(P.x, P.y);
      if (dx * dx + dy * dy < d * d || (mur && mur.d > 0 && mur.d < cfg.danger.mur))
        ajouter(c.base * mu * (R.score.primes.boutPortant.facteur - 1), c.x, c.y, 'risque', true);
    }
    // Les kills arrivent avant l'événement lasso de la fermeture. Mémoriser seulement ces morts,
    // pas les bases des survivants : refaire un lasso sur une cible vivante ne crée pas de rente.
    if (src.genre === 'joueuse' && src.type === 'lasso' && cfg.lasso) {
      if (m.lassoTemps !== t) m.lassoKills = {};
      m.lassoTemps = t; m.lassoKills[c.id] = { base: c.base, points: c.base * mu };
    }
  }

  /* ---- les défis (repli : DIX KILLS EN CHAÎNE) ---- */
  function defiOk() {
    var d = m.defi;
    d.etat = 'reussi'; d.t = O.T.t; d.prog = d.but;
    ajouter(CFG.defiPrime, null, null);
    m.stats.energie += R.defis.partie.legacy.energie;                                           // § 2.14 : un défi de la réserve vaut 20 énergie
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

  /* Trois objectifs publics : FINIR et deux du jour. Le flux autonome ne consomme
     jamais celui des vagues ; aucun effet sur les vies, armes, gardes ou trajectoires. */
  function defisDuJour() {
    var jour = Number(S && S.jour) || R.defis.partie.jourRepli;
    var flux = N.rng.flux(jour, 'defis'), pool = R.defis.partie.reserve.slice();
    var liste = [{ id: 'finir', nom: R.defis.partie.finirNom, but: R.defis.partie.finirBut,
      prog: 0, fait: false, etat: 'actif', prime: R.defis.finir.prime, jour: jour }];
    while (liste.length < R.defis.parPartie && pool.length) {
      var id = pool.splice(flux.i(0, pool.length - 1), 1)[0], d = R.defis.reserve[id];
      liste.push({ id: id, nom: d.nom, but: d.destructions || d.enfermes || d.mult ||
        (d.vagues ? d.vagues.length : R.defis.partie.finirBut), prog: 0, fait: false,
        etat: 'actif', prime: d.prime, jour: jour });
    }
    return liste;
  }
  function journalDefi(d, evt, portee) {
    if (N.journal) N.journal('defi', { id: d.id, ok: d.etat === 'reussi', prime: 0,
      evt: evt, portee: portee || 'partie', nom: d.nom || d.texte, etat: d.etat,
      fait: d.etat === 'reussi', prog: d.prog, but: d.but, jour: d.jour, vague: d.n });
  }
  function journalDefis(evt) { API.defis.forEach(function (d) { journalDefi(d, evt); }); }
  function etatDefi(d, etat) {
    if (d.etat !== 'actif' || etat === 'actif') return;
    d.etat = etat; d.fait = etat === 'reussi';
    if (d.fait) d.prog = d.but;
    journalDefi(d, 'bilan');
    if (N.hud && N.hud.toast) N.hud.toast((d.fait ? '✓ ' : '✗ ') + d.nom);
  }
  function suivreDefis(evt, c) {
    if (!m.stats || !Array.isArray(API.defis)) return;
    API.defis.forEach(function (d) {
      if (d.etat !== 'actif' || d.id === 'finir') return;
      var cfg = R.defis.reserve[d.id];
      if (d.id === 'premierJet') {
        if (O.T.t <= cfg.avant) d.prog = Math.min(d.but, m.stats.kills);
        if (d.prog >= d.but && O.T.t >= cfg.jamaisAvant && O.T.t <= cfg.avant) etatDefi(d, 'reussi');
        else if (O.T.t > cfg.avant) etatDefi(d, 'rate');
      } else if (d.id === 'lasso6' && evt === 'lasso') d.prog = Math.min(d.but, Math.max(d.prog, c.n));
      else if (d.id === 'chaine5') d.prog = Math.min(d.but, Math.max(d.prog, mult()));
      else if (d.id === 'sansCoupe') {
        if (evt === 'coupe' || evt === 'mort') etatDefi(d, 'rate');
        else if (evt === 'vague' && c.evt === 'nettoyee' && cfg.vagues.indexOf(c.n) >= 0) {
          d.vagues = d.vagues || []; if (d.vagues.indexOf(c.n) < 0) d.vagues.push(c.n); d.prog = d.vagues.length;
        }
      } else if (d.id === 'sansFilet') {
        if (evt === 'mort') etatDefi(d, 'rate');
        else if (evt === 'phase' && c.evt === 'entree') d.prog = d.but;
      }
      if (d.prog >= d.but && d.id !== 'premierJet') etatDefi(d, 'reussi');
    });
  }

  /* ---- le défi de vague (§ 2.14) : un objectif parmi trois, tiré par le flux 'defis' à l'entrée de chaque vague ;
     réussi : 1 000 × le numéro de la vague et 10 énergie. Seuls les objectifs que les événements mesurent aujourd'hui
     sont tirés (lassos, enfermés, cellules, mines, tourelles, broyés, multiplicateur) ; les autres attendent leurs événements. */
  function butDe(d) { return d.lassos || d.enfermes || d.cellules || d.mines || d.tourelles || d.mult || d.broyes || 0; }
  function tirerDefiVague(n, flux) {
    var V = R && R.defis && R.defis.vague, L = V && V.liste[n];
    if (!L) return null;
    var ok = L.filter(function (d) { return butDe(d) && !(n === R.accueilU1.premiereVague && !R.accueilU1.defiV1Lasso && d.lassos); });
    if (!ok.length) return null;
    var d = ok[Math.min(ok.length - 1, ((flux ? flux.f() : O.rf('defis')) * ok.length) | 0)];
    return { id: d.id, texte: d.texte, def: d, but: butDe(d), prog: 0, etat: 'actif', fait: false, n: n };
  }
  function apercuVague(n) {
    var flux = N.rng.flux(N.rng.graine(), 'defis');
    flux.reprendre(N.rng('defis').etat());
    return tirerDefiVague(n || R.secteurs[0].vagues[0].n, flux);
  }
  function avanceDv(champ, v, max) {
    var d = m.dv;
    if (!d || d.etat !== 'actif' || !d.def[champ]) return;
    d.prog = max ? Math.max(d.prog, v) : d.prog + v;
    if (d.prog >= d.but) dvOk();
  }
  function dvOk() {
    var d = m.dv, V = R.defis.vague, prime = V.prime * d.n;
    d.etat = 'reussi'; d.fait = true; d.prog = d.but; m.dvFaits++;
    journalDefi(d, 'bilan', 'vague');
    ajouter(prime, null, null);
    m.stats.energie += V.energie;
    O.sfx('defi');
    if (N.hud && N.hud.toast) N.hud.toast('✓ ' + d.texte + '  +' + prime);
    if (N.ev) N.ev.emit('defi', { id: d.id, ok: true, prime: prime });
  }

  /* ============================ les consommateurs ============================ */
  function estPurge(src) { return src && src.genre === 'decor' && src.type === 'purge'; }
  if (N.ev) {
    N.ev.on('kill', 20, function (c) {
      if (estPurge(c.src)) return;
      var t = O.T.t, st = m.stats, avant = mult();
      if (t - m.dernier <= fenetre()) m.chaine++; else m.chaine = 1;
      m.dernier = t;
      if (m.chaine > st.maxChaine) st.maxChaine = m.chaine;
      st.kills++; st.killsBy[c.type] = (st.killsBy[c.type] || 0) + 1;
      if (c.src && (c.src.genre === 'arme' || c.src.genre === 'joueuse')) m.activiteVague.kills++;
      var pts = c.base * mult();
      if (c.boss) pts += (R && R.score && R.score.primes && R.score.primes.cyclope && R.score.primes.cyclope.mort) || 25000;
      ajouter(pts, c.x, c.y);
      recompensesKill(c, mult());
      // État de présentation public : même si plusieurs kills arrivent avant le prochain dessin,
      // le HUD peut reconnaître le palier effectivement franchi, sans effet émis par le score.
      if (mult() > avant) API.palier = { mult: mult(), t: t };
    }, '77-score');
    N.ev.on('kill', 80, function (c) {
      if (estPurge(c.src)) return;
      if (c.src && c.src.genre === 'arene' && c.src.type === 'convoi') avanceDv('broyes', 1);        // BROIE n : ennemis broyés par un convoi
      if (c.type === 'mine') avanceDv('mines', 1);
      else if (c.type === 'tourelle') avanceDv('tourelles', 1);       // → N.R : l'angle de 45° (v3Cote) n'est pas mesuré
      var d = m.defi;
      if (d && d.etat === 'actif') { d.prog = m.chaine; if (m.chaine > d.meilleur) d.meilleur = m.chaine; if (m.chaine >= d.but) defiOk(); }
      suivreDefis('kill', c);
    }, '77-score');
    N.ev.on('ramassage', 20, function (c) {
      m.stats.ramassages++;
      m.activiteVague.ramassages++;
      if (c.type === 'cellule') avanceDv('cellules', 1);
      m.stats.energie += (R && R.butin && R.butin[c.type] && R.butin[c.type].energie) || 0;      // § 2.6 : 1 par cellule, 5 par noyau
      var pts = ((R && R.butin && R.butin[c.type] && R.butin[c.type].points) || 0) * mult();
      ajouter(pts, c.x, c.y);
    }, '77-score');
    N.ev.on('lasso', 20, function (c) {
      m.stats.lassos++; if (c.n > m.stats.maxLasso) m.stats.maxLasso = c.n;
      var bases = 0, deja = 0;
      (c.ids || []).forEach(function (id) {
        var k = m.lassoKills[id];
        if (k) { bases += k.base; deja += k.points; delete m.lassoKills[id]; }
      });
      ajouter(Math.max(0, bases * c.n * mult() - deja), c.x, c.y, 'lasso', true);
      avanceDv('lassos', 1); avanceDv('enfermes', c.n, true);
    }, '77-score');
    N.ev.on('coupe', 20, function () {
      m.stats.coupes++;
      if (!(N.cartes && N.cartes.mods && N.cartes.mods.sangFroid)) m.chaine = Math.floor(m.chaine / ((R && R.score && R.score.chaine && R.score.chaine.coupeDiviseur) || 2));
      if (!(N.cartes && N.cartes.mods && N.cartes.mods.sangFroid)) m.continuite = Math.floor(m.continuite / R.score.chaine.coupeDiviseur);
      if (m.defi && m.defi.etat === 'actif') m.defi.prog = m.chaine;
    }, '77-score');
    N.ev.on('mort', 20, function (d) {
      m.vies = Math.max(0, m.vies - 1);
      m.chaine = 0;
      m.continuite = 0; m.continuiteDernier = -Infinity; m.sansMortDepuis = O.T.t; m.lassoKills = {};
      m.stats.morts.push({ cause: d.cause, auteur: d.auteur, t: d.t, vague: d.vague, visibleDepuis: d.visibleDepuis, teleDuree: d.teleDuree });
      publier();
    }, '77-score');
    N.ev.on('mort', 80, function () { if (m.vies <= 0) defiRate(); suivreDefis('mort', {}); }, '77-score');
    N.ev.on('vague', 20, function (c) {
      if (c.evt === 'entree') {
        m.activiteVague = { kills: 0, ramassages: 0 };
        m.dv = tirerDefiVague(c.n); API.defiVague = m.dv;
        if (m.dv) { API.defisVagues.push(m.dv); journalDefi(m.dv, 'selection', 'vague'); }
        if (m.dv && N.hud && N.hud.toast) N.hud.toast('V' + c.n + ' : ' + m.dv.texte);
        return;
      }
      if (c.evt !== 'nettoyee') return;
      if (m.dv && m.dv.etat === 'actif') { m.dv.etat = 'rate'; journalDefi(m.dv, 'bilan', 'vague'); }
      var p = (R && R.score && R.score.primes && R.score.primes.vague && R.score.primes.vague.parVague) || 1000;
      if (m.activiteVague.kills >= R.accueilU1.primeKills || m.activiteVague.ramassages >= R.accueilU1.primeRamassages) ajouter(p * c.n, null, null);
    }, '77-score');
  }

  if (N.ev) ['ramassage', 'lasso', 'coupe', 'vague', 'phase'].forEach(function (evt) {
    N.ev.on(evt, evt === 'phase' ? N.ids.rangs.score : N.ids.rangs.defis, function (c) { suivreDefis(evt, c); }, '77-score');
  });

  function update(dt) {
    if (!m.stats) return;
    var t = O.T.t;
    if (t > m.lassoTemps) m.lassoKills = {};
    suivreDefis('temps', {});
    if (m.dv && m.dv.etat === 'actif' && m.dv.def.mult) avanceDv('mult', mult(), true);
    if (m.chaine > 0 && t - m.dernier > fenetre()) { m.chaine = 0; if (m.defi && m.defi.etat === 'actif') m.defi.prog = 0; }
  }

  /* fin de partie : le record, l'énergie, les déblocages, et le RÉSUMÉ que lit l'écran de fin ; `victoire` vrai si le colosse est tombé */
  function seuils() { return R.deblocages.map(function (d, i) { return { id: d.id, seuil: R.defis.retour.seuils[i] }; }); }
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
    if (m.resume) return { record: m.resume.record, nouveau: m.newRecord };
    m.stats.victoire = !!victoire;
    var primes = 0, energieDefis = 0;
    API.defis.forEach(function (d) {
      if (d.id === 'finir' && d.etat === 'actif' && victoire) etatDefi(d, 'reussi');
      if (d.etat === 'actif') etatDefi(d, 'rate');
      if (d.fait && !d.paye) { primes += d.prime; if (d.id !== 'finir') energieDefis += R.defis.energieReserve; d.paye = true; }
    });
    if (m.dv && m.dv.etat === 'actif') { m.dv.etat = 'rate'; journalDefi(m.dv, 'bilan', 'vague'); }
    // Bilan seulement : ne pas franchir un seuil de vie bonus pendant une partie.
    m.score += primes; m.stats.points.defisP12 = (m.stats.points.defisP12 || 0) + primes; publier();
    journalDefis('fin');
    var rec = disque.records.length ? Math.max.apply(null, disque.records) : 0, pr = disque.profil;
    m.newRecord = rec > 0 && m.score > rec;
    var dernier = pr.dernier || 0, avantE = pr.energie || 0;
    var tableau = classement();
    tableau.push({ score: m.score, marque: m.continuations ? 'C' : '' });
    tableau.sort(function (a, b) { return b.score - a.score; });
    var nbRec = (R && R.ecrans && R.ecrans.records && R.ecrans.records.nombre) || 10;
    if (tableau.length > nbRec) tableau.length = nbRec;
    disque.records = tableau.map(function (r) { return r.score; });
    disque.marquesRecords = tableau.map(function (r) { return r.marque; });
    if (!m.continuations) pr.parties++;
    var gagne = m.stats.energie + energieDefis + (victoire ? R.defis.finir.energie : 0), debloques = [], L = seuils(), i;      // FINIR vaut 50 énergie (§ 2.14)
    pr.energie = avantE + gagne; pr.dernier = m.score;
    for (i = 0; i < L.length; i++) if (pr.energie >= L[i].seuil && pr.deblocages.indexOf(L[i].id) < 0) {
      pr.deblocages.push(L[i].id); debloques.push(L[i].id);
      if (N.ev) N.ev.emit('deblocage', { id: L[i].id });
    }
    sauver();
    var d = (S && S.death) || m.stats.morts[m.stats.morts.length - 1] || null, dir = N.dir;
    var tot = dir && dir.nombreVagues ? dir.nombreVagues() : 5, vague = d && d.vague ? d.vague : (dir && dir.vague ? dir.vague() : 1);
    var boss = !!(dir && dir.phase && dir.phase() === 'boss') || vague > tot;
    var faits = API.defis.filter(function (d) { return d.fait; }).length;
    var note = victoire ? (faits === R.defis.parPartie && !m.stats.morts.length ? 'S' : faits > R.defis.partie.finirBut ? 'A' : 'B') : boss ? 'C' : 'D';
    m.resume = {
      victoire: !!victoire, score: m.score, marque: m.continuations ? 'C' : '', ecart: dernier > 0 ? m.score - dernier : null, record: Math.max(rec, m.score), nouveauRecord: m.newRecord,
      kills: m.stats.kills, maxChaine: m.stats.maxChaine, coupes: m.stats.coupes, lassos: m.stats.lassos, maxLasso: m.stats.maxLasso,
      pertes: m.stats.morts.length, defisVague: m.dvFaits, cause: d ? d.cause : null, auteur: d ? d.auteur : null, vague: vague, quartier: d ? d.quartier : null,
      temps: O.T.t, progression: victoire ? 1 : (dir && dir.progression ? dir.progression() : 0), boss: boss, note: note,
      build: build(), defi: m.defi ? { nom: m.defi.nom, etat: m.defi.etat, prog: m.defi.prog, but: m.defi.but, meilleur: m.defi.meilleur } : null,
      defis: API.defis.map(function (d) { return { id: d.id, nom: d.nom, etat: d.etat, fait: d.fait, prog: d.prog, but: d.but, jour: d.jour }; }),
      defisVagues: API.defisVagues.map(function (d) { return { id: d.id, nom: d.texte, n: d.n, etat: d.etat, fait: d.fait, prog: d.prog, but: d.but }; }),
      primesDefis: primes, energieGagnee: gagne, energie: pr.energie, avant: prochainPour(avantE), prochain: prochainPour(pr.energie), debloques: debloques,
      conseil: conseil(d ? d.cause : null, d ? d.auteur : null), cartes: N.cartes && N.cartes.prises ? N.cartes.prises() : {}
    };
    return { record: Math.max(rec, m.score), nouveau: m.newRecord };
  }
  function record() { if (!lu) charger(); return disque.records.length ? disque.records[0] : 0; }
  /* Les scores numériques restent compatibles ; la marque appartient à chaque rang, même en cas d'égalité.
     Les anciens profils sans marques se lisent sans migration destructive. */
  function classement() {
    if (!lu) charger();
    return disque.records.map(function (score, i) { return { score: score, marque: (disque.marquesRecords && disque.marquesRecords[i]) === 'C' ? 'C' : '' }; });
  }
  function continuerPossible() { return !!m.resume && !m.resume.victoire && m.continuations < R.vies.continuer.parPartie; }
  function continuer() {
    if (!continuerPossible()) return false;
    m.continuations++;
    m.score = R.vies.continuer.score; m.vies = R.vies.continuer.vies;
    m.scoreCombat = R.vies.continuer.score; m.stats.points = {}; m.continuite = 0;
    m.continuiteDernier = -Infinity; m.sansMortDepuis = O.T.t; m.lassoKills = {};
    m.chaine = 0; m.dernier = -Infinity; m.bonus = false; m.gain = null; m.newRecord = false;
    API.defis.forEach(function (d) { if (d.etat === 'rate' && d.id !== 'sansCoupe' && d.id !== 'sansFilet' && d.id !== 'premierJet') d.etat = 'actif'; });
    m.resume = null; m.stats.victoire = null; m.stats.energie = 0; API.palier = null;
    publier();
    return true;
  }

  API = {
    reset: reset, update: update, continuer: continuer, continuerPossible: continuerPossible, classement: classement,
    marque: function () { return m.continuations ? 'C' : ''; },
    palier: null, score: 0, chaine: function () { return m.chaine; }, mult: mult, objectif: objectif, vies: 0,
    defis: [], defisVagues: [], apercuVague: apercuVague, defiVague: null, defi: null, stats: null, gain: function () { return m.gain; },
    build: build, resume: function () { return m.resume; },
    energie: 0, deblocages: [], prochain: function () { if (!lu) charger(); return prochainPour(disque.profil.energie || 0); },
    profil: { charger: charger, sauver: sauver, reglages: reglages, epoquesVues: epoquesVues }, records: [],
    fenetreRestante: function () { return O.clamp(1 - (O.T.t - m.dernier) / fenetre(), 0, 1); },
    terminer: terminer, record: record, defiRate: defiRate, nouveauRecord: function () { return m.newRecord; },
    ajouter: function (pts, x, y) { ajouter(pts, x, y); },
    /* retirer des points (jamais sous zéro) : le VOLEUR de 2030 qui s'échappe avec son butin, en aventure seulement.
       Ne touche ni au cumul de combat (la vie bonus) ni au multiplicateur ; rend ce qui a été retiré. */
    retirer: function (pts, source) {
      if (!(pts > 0)) return 0;
      var r = Math.min(m.score, Math.round(pts));
      if (r <= 0) return 0;
      m.score -= r;
      source = source || 'perte';
      m.stats.points[source] = (m.stats.points[source] || 0) - r;
      publier();
      return r;
    }
  };
  /* records et déblocages : mêmes références que le disque une fois lu */
  Object.defineProperty(API, 'records', { get: function () { if (!lu) charger(); return disque.records; }, enumerable: true });
  Object.defineProperty(API, 'deblocages', { get: function () { if (!lu) charger(); return disque.profil.deblocages; }, enumerable: true });
  Object.defineProperty(API, 'energie', { get: function () { if (!lu) charger(); return disque.profil.energie; }, enumerable: true });
  return API;
})();
