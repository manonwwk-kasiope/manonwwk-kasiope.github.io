/* ===== 75-cartes.js — N.cartes : expérience, vivier, tirages, pitié, mods, textes calculés (§ 2.7, 2.9) =====

   Le SEUL émetteur des événements `niveau` et `carte` (§ 7.4). Il CONSOMME `ramassage` (rang 30) : une cellule vaut
   1 XP, un noyau 5 (N.R.butin.<type>.xp). Les seuils d'expérience sont cumulés (N.R.xp.seuils). Une montée de
   niveau n'ouvre jamais d'écran : elle attend le NETTOYAGE de la vague (79-jeu → N.ui.ouvrir('cartes') → main()).

   LA MAIN. main(n, { trophee, vague, rareGarantie }) rend au plus n identifiants, tous différents. Règles : la première
   main contient une arme neuve, un pouvoir débloqué et une carte de survie ; la pitié garantit une rare au moins tous
   les 3 écrans et une épique tous les 7 ; la main trophée n'a aucune commune et propose l'ULTIME d'une arme à un palier
   près ; les poids favorisent l'école choisie (× 1,7) et freinent une famille vierge après la 6ᵉ carte (× 0,6). Au plus
   4 armes et 1 pouvoir équipés ; RALENTI et REPLI n'entrent dans le vivier qu'une fois débloqués (N.score.deblocages).
   Le tirage vient du flux 'cartes' (jamais Math.random).

   « CHOISIS n » : main() décide combien de cartes se prennent sur CET écran (1 + les montées en attente, 3 au plus,
   N.R.cartes.choixMax) et rend les montées restantes à l'écran suivant. choix() le dit à N.ui.

   LES TEXTES sont calculés de N.R (jamais écrits en dur) : texte(id) -> { nom, l1, l2, tag, rarete, palier, prises, max }.
   l1 et l2 tiennent en 19 caractères, le nom en 14 (N.R.cartes.texte).

   Interface (§ 7.8) : reset(), xp(n), niveauxEnAttente(), main(n, opts), choisir(id), prises(), texte(id), mods.
   Ajouts : niveau(), choix(), pouvoir(), armes() -> [{ id, palier }], palierDe(id), rarete(id), ecrans(), vivier(), pris().
   → demandes.md : ces ajouts attendent leur ligne dans CONTRAT.md. */
N.cartes = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var ARMES = ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ'];
  var POUVOIRS = ['traversee', 'ralenti', 'repli'];
  var ULTIMES = ['RAYON', 'BORDÉE', 'ORAGE', 'NUÉE', 'ANNEAU', 'SINGULARITÉ'];
  var S = null;
  var m = {                                       // l'état de la partie
    xp: 0, niveau: 0, attente: 0, prises: {}, equipees: ['canon'], pouvoir: null, nb: 0, ecrans: 0, sansRare: 0, sansEpique: 0,
    famille: {}, courante: [], choixEcran: 1, derniereVague: 0
  };
  var MODS = {};                                  // le même objet pour toute la partie, lu par les autres modules
  function cfg() { return R.cartes; }
  function liste(id) { return R.cartes.liste[id]; }
  function estArme(id) { return ARMES.indexOf(id) >= 0; }
  function estPouvoir(id) { return POUVOIRS.indexOf(id) >= 0; }

  /* ============================ la partie ============================ */
  function recalcMods() {
    var P = R.passifs, p = m.prises, base = P.mods, k;
    MODS.degats = 1 + P.puissance.parPrise * (p.puissance || 0);
    MODS.cadence = 1 + P.cadence.parPrise * (p.cadence || 0);
    k = Math.min(p.aimant || 0, P.aimant.rayons.length - 1);
    MODS.aimant = (p.aimant || 0) ? P.aimant.rayons[k] : base.aimant;
    MODS.lenMax = base.lenMax + ((R.longueur && R.longueur.parCroissance) || P.croissance.lenMax) * (p.croissance || 0);
    MODS.reparation = Math.min(2, p.reparation || 0);
    MODS.bouclier = Math.min(1, p.bouclier || 0);
    MODS.eperon = !!p.eperon;
    MODS.grappe = Math.min(2, p.grappe || 0);
    MODS.sangFroid = !!p.sangFroid;
    MODS.braise = Math.min(2, p.braise || 0);
  }
  function reset() {
    S = N.S;
    m.xp = 0; m.niveau = 0; m.attente = 0; m.prises = {}; m.equipees = ['canon']; m.pouvoir = null; m.nb = 0; m.ecrans = 0;
    m.sansRare = 0; m.sansEpique = 0; m.famille = {}; m.courante = []; m.choixEcran = 1; m.derniereVague = 0;
    recalcMods();
  }

  /* ============================ l'expérience ============================ */
  function xp(n) {
    if (!(n > 0)) return m.niveau;
    var seuils = R.xp.seuils, avant = m.niveau;
    m.xp += n;
    while (m.niveau < seuils.length && m.xp >= seuils[m.niveau]) {
      m.niveau++; m.attente++;
      if (N.ev) N.ev.emit('niveau', { niveau: m.niveau, enAttente: m.attente });
    }
    return m.niveau - avant;
  }
  function niveauxEnAttente() { return m.attente; }

  /* ============================ la rareté et les paliers ============================ */
  function prisesMax(id) { return liste(id).prises; }
  function palierDe(id) { return (m.prises[id] || 0) + (id === 'canon' ? 1 : 0); }        // palier actuel : 0 = pas encore pris
  /* le palier que la carte donnerait, de 0 (I) à 3 (ULTIME) dans R.armes.<id>.paliers */
  function indexSuivant(id) { return id === 'canon' ? (m.prises.canon || 0) + 1 : (m.prises[id] || 0); }   // 0..3 dans R.armes.<id>.paliers
  function rarete(id) {
    if (estArme(id)) return cfg().rareteArme[Math.min(3, indexSuivant(id))];
    return liste(id).rarete;
  }
  function rang(r) { return r === 'commune' ? 0 : r === 'rare' ? 1 : r === 'epique' ? 2 : 3; }

  /* ============================ le vivier ============================ */
  function debloque(id) {
    var d = N.score && N.score.deblocages ? N.score.deblocages : [];
    return d.indexOf(id) >= 0;
  }
  function eligible(id) {
    var k = m.prises[id] || 0;
    if (k >= prisesMax(id)) return false;
    if (estArme(id) && k === 0 && id !== 'canon' && m.equipees.length >= cfg().main.armesMax) return false;
    if (estPouvoir(id)) {
      if (m.pouvoir === id) return false;
      if ((id === 'ralenti' || id === 'repli') && !debloque(id)) return false;
    }
    return true;
  }
  function vivier() {
    var ids = (N.ids && N.ids.cartes) || Object.keys(cfg().liste), out = [];
    for (var i = 0; i < ids.length; i++) if (eligible(ids[i])) out.push(ids[i]);
    return out;
  }

  /* ============================ les tirages ============================ */
  function poids(id) {
    var c = cfg(), w = c.poids.rarete[rarete(id)], f = liste(id).famille, nf = m.famille[f] || 0;
    if (nf >= c.poids.ecoleCartes) w *= c.poids.ecole;
    else if (nf === 0 && m.nb > c.poids.viergeApres) w *= c.poids.vierge;
    return w;
  }
  function tirer(pool) {
    var tot = 0, i;
    for (i = 0; i < pool.length; i++) tot += poids(pool[i]);
    var r = O.rf('cartes') * tot;
    for (i = 0; i < pool.length; i++) { r -= poids(pool[i]); if (r <= 0) return i; }
    return pool.length - 1;
  }
  function retirer(pool, id) { var i = pool.indexOf(id); if (i >= 0) pool.splice(i, 1); }
  function tailleMain(choix) { return R.f && R.f.tailleMain ? R.f.tailleMain(choix) : Math.min(5, 2 + choix); }

  /* main(n, opts) : voir l'en-tête. n absent : la taille de la main pour le nombre de choix de cet écran. */
  function main(n, opts) {
    opts = opts || {};
    var c = cfg(), pool = vivier(), hand = [], i, id;
    m.choixEcran = Math.max(1, Math.min(c.choixMax, 1 + m.attente));
    m.attente -= m.choixEcran - 1;
    if (!(n > 0)) n = tailleMain(m.choixEcran);
    m.derniereVague = opts.vague || m.derniereVague;
    function prendre(id) { hand.push(id); retirer(pool, id); }
    function parmi(f) { var l = pool.filter(f); return l.length ? l[Math.min(l.length - 1, (O.rf('cartes') * l.length) | 0)] : null; }

    if (opts.trophee) {
      /* aucune commune ; l'ULTIME d'une arme à un palier près quand il y en a une */
      var ult = parmi(function (x) { return estArme(x) && rarete(x) === 'ultime'; });
      if (ult) prendre(ult);
      pool = pool.filter(function (x) { return rarete(x) !== 'commune'; });
    } else if (m.ecrans === 0) {
      /* la première main : une arme neuve, un pouvoir débloqué, une carte de survie */
      var a = parmi(function (x) { return estArme(x) && x !== 'canon' && !(m.prises[x] > 0); }); if (a) prendre(a);
      var p = parmi(function (x) { return estPouvoir(x); }); if (p) prendre(p);
      var sv = parmi(function (x) { return c.premiereMain.survie.indexOf(x) >= 0; }); if (sv) prendre(sv);
    }
    /* la pitié : une rare au moins tous les 3 écrans, une épique au moins tous les 7 */
    function aRare(r) { for (var j = 0; j < hand.length; j++) if (rang(rarete(hand[j])) >= r) return true; return false; }
    var forceEp = m.sansEpique >= c.pitie.epique - 1, forceRa = m.sansRare >= c.pitie.rare - 1 || !!opts.rareGarantie;
    if (forceEp && !aRare(2)) { id = parmi(function (x) { return rang(rarete(x)) >= 2; }); if (id) prendre(id); }
    if (forceRa && !aRare(1)) { id = parmi(function (x) { return rang(rarete(x)) >= 1; }); if (id) prendre(id); }
    while (hand.length < n && pool.length) prendre(pool[tirer(pool)]);
    if (hand.length > n) hand.length = n;
    /* l'ordre à l'écran est mélangé, pas celui du tirage (flux 'cartes') */
    for (i = hand.length - 1; i > 0; i--) { var j2 = (O.rf('cartes') * (i + 1)) | 0, t = hand[i]; hand[i] = hand[j2]; hand[j2] = t; }
    m.sansRare = aRare(1) ? 0 : m.sansRare + 1;
    m.sansEpique = aRare(2) ? 0 : m.sansEpique + 1;
    m.ecrans++;
    m.courante = hand.slice();
    return hand;
  }

  /* ============================ le choix ============================ */
  function choisir(id) {
    if (!id || !liste(id)) return null;
    var k = (m.prises[id] || 0) + 1;
    if (k > prisesMax(id)) return null;
    m.prises[id] = k; m.nb++;
    var f = liste(id).famille; m.famille[f] = (m.famille[f] || 0) + 1;
    if (estArme(id) && m.equipees.indexOf(id) < 0) m.equipees.push(id);
    if (estPouvoir(id)) m.pouvoir = id;
    recalcMods();
    if (N.ev) N.ev.emit('carte', { id: id, niveau: k });
    return k;
  }

  /* ============================ les textes, calculés de N.R ============================ */
  function f1(x) { return String(Math.round(x * 100) / 100).replace('.', ','); }
  function palierArme(id, i) { var p = R.armes[id].paliers; return p[Math.min(p.length - 1, i)]; }
  function cadenceCanon(niv) { var p = R.armes.canon.paliers[Math.max(0, Math.min(3, niv))]; return p.cadence || p.tics || 0; }
  function texteArme(id, i) {
    var p = palierArme(id, i), pr = i > 0 ? palierArme(id, i - 1) : null, a = R.armes[id], l1, l2;
    if (id === 'canon') {
      if (i === 1) { l1 = '2 BOUCHES ALTERNÉES'; l2 = f1(pr.cadence) + ' → ' + f1(p.cadence) + ' TIRS/S'; }
      else if (i === 2) { l1 = '2 LANCES PERÇANTES'; l2 = 'DÉGÂTS ' + pr.degats + ' → ' + p.degats; }
      else { l1 = 'RAYON CONTINU'; l2 = p.degats + ' DÉG · ' + p.tics + '/S'; }
    } else if (id === 'tourelles') {
      l1 = '1 TOUS LES ' + p.parSegments + ' SEG.'; l2 = p.max + ' AU PLUS · ' + f1(p.cadence) + '/S';
      if (i === 2) l1 = 'RAFALES DE ' + p.rafale + ' · 1/' + p.parSegments;
      if (i === 3) { l1 = '1 TOUS LES ' + p.parSegments + ' SEG.'; l2 = p.max + ' MAX · SALVE'; }
    } else if (id === 'arc') {
      l1 = p.arcs + (p.arcs > 1 ? ' ARCS · ' : ' ARC · ') + p.sauts + ' SAUTS'; l2 = p.degats + ' DÉG / ' + f1(p.periode) + ' S';
    } else if (id === 'missiles') {
      l1 = p.missiles + ' MISSILES' + (p.sousMunitions ? ' + ' + p.sousMunitions : ''); l2 = p.degats + ' DÉG / ' + f1(p.periode) + ' S';
    } else if (id === 'drones') {
      l1 = p.drones + (p.drones > 1 ? ' DRONES' : ' DRONE') + (p.interception ? ' · BOUCLIER' : ''); l2 = 'TIR ' + f1(a.cadence) + '/S · ' + a.degats + ' DÉG';
    } else {
      l1 = '1 MINE / ' + f1(p.periode) + ' S'; l2 = 'SOUFFLE ' + p.souffle + ' PX · ' + p.degats;
    }
    return [l1, l2];
  }
  function textePassif(id) {
    var P = R.passifs, k = m.prises[id] || 0, a = P[id], l1, l2, i = Math.min(k, (a && a.prises ? a.prises : 1) - 1);
    switch (id) {
      case 'puissance': l1 = 'DÉGÂTS DES ARMES'; l2 = '×' + f1(1 + a.parPrise * k) + ' → ×' + f1(1 + a.parPrise * (k + 1)); break;
      case 'cadence':
        var c0 = cadenceCanon((m.prises.canon || 0)); l1 = 'CADENCE'; l2 = f1(c0 * (1 + a.parPrise * k)) + ' → ' + f1(c0 * (1 + a.parPrise * (k + 1))) + ' TIRS/S'; break;
      case 'aimant': l1 = 'RAYON D\'AIMANT'; l2 = (k ? a.rayons[k] : P.mods.aimant) + ' → ' + a.rayons[Math.min(k + 1, a.rayons.length - 1)] + ' PX'; break;
      case 'croissance':
        var pc = (R.longueur && R.longueur.parCroissance) || a.segments;     // la valeur que 70-joueuse applique (→ demandes.md : le tableau § 2.9 dit +4)
        l1 = '+' + pc + ' SEGMENTS'; l2 = 'MAX ' + MODS.lenMax + ' → ' + (MODS.lenMax + a.lenMax); break;
      case 'reparation': l1 = 'REPOUSSE 1 SEGMENT PERDU'; l2 = 'TOUTES LES ' + a.periodes[i] + ' S'; break;
      case 'bouclier': l1 = 'ABSORBE UN COUP'; l2 = 'RECHARGE ' + a.recharge + ' S'; break;
      case 'eperon': l1 = 'EN ACCÉLÉRATION'; l2 = 'BROIE JUSQU\'À ' + a.pvMax + ' PV'; break;
      case 'grappe': l1 = 'KILL = EXPLOSION'; l2 = a.niveaux[i].rayon + ' PX · ' + a.niveaux[i].degats + ' DÉG'; break;
      case 'sangFroid': l1 = 'LA COUPE NE DIVISE'; l2 = 'PLUS LA CHAÎNE'; break;
      default: l1 = 'TRAÎNÉE QUI BRÛLE'; l2 = i ? '+' + f1(a.traine2) + ' S · LASSO ×' + f1(a.lasso2) : a.dps + ' DÉG / S'; break;
    }
    return [l1, l2];
  }
  function textePouvoir(id) {
    var a = R.pouvoirs[id];
    if (id === 'traversee') return [f1(a.duree) + ' S TRAVERSE TOUT', 'RECHARGE ' + a.recharge + ' S'];
    if (id === 'ralenti') return ['MONDE ×' + f1(a.monde) + ' · ' + f1(a.duree) + ' S', 'RECHARGE ' + a.recharge + ' S'];
    return ['LONGUEUR -' + Math.round(a.longueur * 100) + ' %', 'DÉGÂTS ×' + f1(a.degats) + ' · ' + a.duree + ' S'];
  }
  function romain(n) { return ['0', 'I', 'II', 'III', 'IV'][n] || String(n); }
  function texte(id) {
    var L = liste(id), k = m.prises[id] || 0, arme = estArme(id), pouv = estPouvoir(id), ls, tag, pal = 0;
    if (arme) {
      var i = indexSuivant(id); pal = i + 1;
      ls = texteArme(id, i);
      tag = (id !== 'canon' && k === 0) ? 'NOUVEAU' : (i >= 3 ? 'ULTIME' : 'NIV ' + romain(i + 1));
    } else if (pouv) { ls = textePouvoir(id); tag = m.pouvoir ? 'REMPLACE' : 'NOUVEAU'; pal = 1; }
    else { ls = textePassif(id); tag = k === 0 ? 'NOUVEAU' : 'NIV ' + (k + 1); pal = k + 1; }
    return { nom: N.ids.nom(id), l1: ls[0], l2: ls[1], tag: tag, rarete: rarete(id), palier: pal, prises: k, max: prisesMax(id),
      ultime: arme && indexSuivant(id) >= 3 ? ULTIMES[ARMES.indexOf(id)] : null, famille: L.famille };
  }

  /* ============================ les consommateurs ============================ */
  if (N.ev) {
    N.ev.on('ramassage', 30, function (c) {
      var b = R.butin && R.butin[c.type];
      if (b && b.xp) xp(b.xp);
    }, '75-cartes');
  }

  /* MODS : initialisé à la valeur de départ dès le chargement, pour être lisible avant le premier reset() */
  recalcMods();
  return {
    reset: reset, xp: xp, niveauxEnAttente: niveauxEnAttente, main: main, choisir: choisir, prises: function () { return m.prises; }, texte: texte,
    mods: MODS,
    niveau: function () { return m.niveau; }, choix: function () { return m.choixEcran; }, pouvoir: function () { return m.pouvoir; },
    armes: function () { return m.equipees.map(function (id) { return { id: id, palier: palierDe(id) }; }); },
    palierDe: palierDe, rarete: rarete, ecrans: function () { return m.ecrans; }, vivier: vivier, pris: function () { return m.nb; },
    courante: function () { return m.courante; }, xpTotal: function () { return m.xp; }
  };
})();
