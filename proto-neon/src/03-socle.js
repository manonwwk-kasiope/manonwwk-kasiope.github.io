/* ===== 03-socle.js — le socle partagé : événements, hasard, horloge, journal, identifiants =====

   Contrat 1.0 (CONTRAT.md, REFONTE.md § 7.2 à 7.5 et § 7.9). Ce fichier est COMPLET dès le lot 0a : la
   version que les lots voient pendant la phase parallèle est la version finale. Son propriétaire est le
   GARDIEN du contrat ; on ne le modifie que par une demande (refonte/lots/demandes.md).

   Il publie :
     N.ev        le bus d'événements : un émetteur par événement, des consommateurs rangés
     N.rng       les flux de hasard nommés, à graine
     N.horloge   le temps de jeu : pas fixe, gel en temps réel, ralentis, grille musicale de jeu
     N.journal   le journal de mesure : un anneau de 65 536 entrées horodatées au pas
     N.ids       les identifiants figés, les schémas des objets partagés et leurs validateurs
     N.socle     version, remise à zéro commune, signalement d'erreur, copie sûre

   Aucun module n'appelle un autre au chargement : ce fichier ne lit N.S, N.fx, N.game ou N.cam que dans
   ses fonctions, et survit à leur absence. Il n'emploie ni Math.random, ni Date.now, ni performance.now,
   ni couleur, ni URL. Il n'alloue rien par image dans ses chemins chauds (emit, avancer, temps, f). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var W = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});

  var VERSION = '1.0';

  /* ================================================================================================
     Signalement d'erreur : même règle que la quarantaine de 90-boot.js (une trace console par
     signature, chaque occurrence comptée dans __ERR.count). Le socle ne crée pas __ERR au chargement :
     90-boot.js le possède ; à défaut (essai en Node), un compteur local en tient lieu.
     ================================================================================================ */
  var ERR_LOCAL = { count: 0, sigs: {} };
  function signaler(ou, e) {
    var E = W.__ERR || ERR_LOCAL;
    var msg = (e && e.message) || String(e);
    var sig = ou + '|' + msg;
    if (!E.sigs[sig]) { E.sigs[sig] = 0; try { console.error('[' + ou + ']', e); } catch (x) { /* rien */ } }
    E.sigs[sig]++; E.count++;
  }

  /* ================================================================================================
     Copie sûre (journal) : objets simples et tableaux jusqu'à 4 niveaux, tableaux typés en tableaux,
     nombres non finis en null, fonctions et undefined omis. Le résultat est toujours sérialisable en
     JSON et ne partage rien avec l'appelant (qui peut réutiliser ses objets d'une image à l'autre).
     ================================================================================================ */
  var COPIE_MAX_LISTE = 4096;
  function copier(v, prof) {
    if (v === null) return null;
    var t = typeof v;
    if (t === 'number') return isFinite(v) ? v : null;
    if (t === 'string' || t === 'boolean') return v;
    if (t !== 'object') return undefined;                       /* fonction, undefined, symbole */
    if (prof >= 4) return null;
    if (Array.isArray(v) || (ArrayBuffer.isView && ArrayBuffer.isView(v) && !(v instanceof DataView))) {
      var n = Math.min(v.length, COPIE_MAX_LISTE), a = new Array(n);
      for (var i = 0; i < n; i++) { var c = copier(v[i], prof + 1); a[i] = c === undefined ? null : c; }
      return a;
    }
    var o = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      var cv = copier(v[k], prof + 1);
      if (cv !== undefined) o[k] = cv;
    }
    return o;
  }

  function geler(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) geler(o[k]);
    }
    return o;
  }

  /* ================================================================================================
     N.ids — les identifiants figés (§ 7.5). Toute liste est gelée. Un identifiant nouveau passe par
     une demande au gardien, jamais en douce.
     ================================================================================================ */
  var L = {
    ennemis: ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'lame', 'ruche', 'sentinelle', 'rival', 'planeur', 'traqueur'],
    /* les parties du CYCLOPE vivent dans N.ennemis.list avec boss:true et ce type */
    ennemisBoss: ['cyclope'],
    armes: ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ'],
    passifs: ['puissance', 'cadence', 'aimant', 'croissance', 'reparation', 'bouclier', 'eperon', 'grappe', 'sangFroid', 'braise'],
    pouvoirs: ['traversee', 'ralenti', 'repli'],
    cartes: null,                                               /* armes + passifs + pouvoirs, voir plus bas */
    causes: ['mur', 'morsure', 'ennemi', 'tir', 'laser', 'souffle', 'convoi', 'traine'],
    /* une coupe du corps a la cause de ce qui l'a faite ; 'vol' = mine du VOL */
    causesCoupe: ['mur', 'ennemi', 'tir', 'souffle', 'convoi', 'traine', 'vol', 'morsure'],
    auteurs: null,                                              /* ennemis + auteursAutres */
    auteursAutres: ['mur', 'murMobile', 'corps', 'convoi', 'cyclope', 'cyclope:main', 'vol'],
    etats: ['demarrage', 'ouverture', 'titre', 'attraction', 'briefing', 'plongee', 'jeu', 'nettoyage', 'cartes', 'vol',
      'defile', 'alerte', 'panneau', 'boss', 'mort', 'reapparition', 'victoire', 'fin', 'initiales', 'pause'],
    sections: ['titre', 'attraction', 'briefing', 'jeu', 'repit', 'alerte', 'boss', 'victoire', 'defaite', 'initiales'],
    quartiers: ['docks', 'artere', 'centrale', 'ciel', 'tours', 'coeur', 'eclipse'],
    etatsDecor: ['calme', 'montee', 'chaos', 'inversion', 'colosse', 'victoire'],
    defis: ['finir', 'premierJet', 'lasso6', 'sansCoupe', 'chaine5', 'gloutonne', 'crash', 'broyeuse', 'parfait', 'rasante',
      'eclair', 'volParfait', 'sansFilet'],
    defisVague: ['v1Lasso', 'v1Mines', 'v1Rafle', 'v2Devore', 'v2Lasso', 'v2Meute', 'v3Cote', 'v3Eclair', 'v3Chaine',
      'v4Broie', 'v4Sillage', 'v4Rival', 'v5Mult', 'v5Ruche', 'v5Devore'],
    deblocages: ['ralenti', 'repli', 'styles', 'galerie', 'departV3'],
    sons: ['tir', 'salve', 'boostOn', 'boostOff', 'boostPanne', 'traversee', 'ralenti', 'repli', 'pouvoirPret', 'ultimePret',
      'ultime', 'lasso', 'fermable', 'vie', 'porte', 'devore',
      'impact', 'impactBoss', 'ricochet', 'kill', 'bigkill', 'crash', 'explosion', 'colosseMort',
      'tirEnnemi', 'arme', 'portail', 'traqueur', 'convoi', 'travelling', 'warning',
      'butin', 'noyau', 'pastille',
      'coupe', 'mort', 'gameover', 'battement',
      'palier', 'levelup', 'carte', 'choix', 'vague', 'defi', 'defiRate', 'record',
      'bip', 'clic'],
    /* noms de la démo, encore acceptés par 30-music.js pendant la transition (lot 7b les retire) */
    sonsAnciens: ['degat', 'intro'],
    voix: ['READY', 'GO', 'WARNING', 'DANGER', 'EXCELLENT', 'GAMEOVER'],
    cues: ['mort', 'gameover', 'stinger', 'drop', 'plongee', 'vague', 'inversion'],
    couches: ['inversion'],
    canauxSon: ['musique', 'effets'],
    scenes: ['charge', 'v5', 'boss3', 'mur', 'morsure', 'lasso6', 'mortTir', 'cartes', 'fin', 'vol', 'inversion', 'convoi',
      'travelling', 'calme', 'montee', 'chaos', 'colosse'],
    ecrans: ['titre', 'briefing', 'cartes', 'pause', 'reglages', 'fin', 'initiales', 'records', 'galerie'],
    pilotes: ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain', 'bon', 'expert', 'dieu'],
    flux: ['dir', 'ennemis', 'arene', 'butin', 'cartes', 'arsenal', 'joueuse', 'vol', 'defis', 'decor', 'fx', 'music', 'pilote'],
    fluxJeu: ['dir', 'ennemis', 'arene', 'butin', 'cartes', 'arsenal', 'joueuse', 'vol', 'defis'],
    fluxCosmetiques: ['decor', 'fx', 'music'],
    /* 'jeu' : alias N.rnd du code repris de la démo, interdit dans le code neuf */
    fluxAnciens: ['jeu'],
    formations: ['file', 'meute', 'nuee', 'duoMines', 'champMines', 'pince', 'batterie', 'essaim', 'duel', 'garde', 'escadrille'],
    elites: ['flecheBlindee', 'rival', 'rucheInstable'],
    modificateurs: ['blinde', 'rapide', 'instable'],
    raretes: ['commune', 'rare', 'epique', 'ultime'],
    etatsEnnemi: ['portail', 'approche', 'arme', 'attaque', 'recup', 'fuite', 'proie', 'mort'],
    etatsJoueuse: ['vivant', 'mort', 'reapparition', 'absent'],
    partiesBoss: ['oeil', 'main'],
    formesTele: ['ligne', 'disque', 'secteur', 'rect', 'losange', 'voie'],
    ciblesTele: ['tete', 'corps', 'tout'],
    genresSrc: ['arme', 'ennemi', 'arene', 'joueuse', 'decor'],
    typesButin: ['cellule', 'noyau', 'pastille'],
    etapes: ['vague', 'defile'],
    familles: ['canon', 'tourelles', 'arc', 'missiles', 'drones', 'minesQ', 'survie', 'puissance', 'pouvoir'],
    builds: ['TIREUSE', 'ARTILLEUSE', 'ORAGE', 'ESSAIM', 'POSEUSE', 'LASSO'],
    notes: ['S', 'A', 'B', 'C', 'D'],
    evenements: ['kill', 'coup', 'coupe', 'mort', 'ramassage', 'lasso', 'niveau', 'carte', 'vague', 'vol', 'inversion',
      'arene', 'phase', 'apparition', 'portail', 'arme', 'pouvoir', 'apogee', 'boost', 'defi', 'deblocage'],
    journal: null                                               /* voir TYPES_JOURNAL */
  };
  L.cartes = L.armes.concat(L.passifs, L.pouvoirs);
  L.auteurs = L.ennemis.concat(L.auteursAutres);

  /* les types de sources (§ 7.5), par genre */
  var SRC_TYPES = {
    arme: L.armes.concat(['lasso', 'apogee', 'grappe', 'eperon']),     /* minesQ est déjà une arme */
    ennemi: L.ennemis.concat(L.ennemisBoss),
    arene: ['convoi', 'murMobile'],
    joueuse: ['devore', 'lasso', 'apogee', 'tete'],
    decor: ['mur', 'purge', 'vol']                                           // purge : fin de vague, fin du CYCLOPE
  };

  /* les états du jeu (§ 7.6) : horloge, section musicale, plein écran (le monde n'est pas dessiné) */
  var ETATS = {
    demarrage:    { horloge: 'arretee', section: null, plein: true },
    ouverture:    { horloge: 'arretee', section: 'titre', plein: true },
    titre:        { horloge: 'arretee', section: 'titre', plein: false },
    attraction:   { horloge: 'avance', section: 'attraction', plein: false },
    briefing:     { horloge: 'arretee', section: 'briefing', plein: true },
    plongee:      { horloge: 'avance', section: 'jeu', plein: false },
    jeu:          { horloge: 'avance', section: 'jeu', plein: false },
    nettoyage:    { horloge: 'avance', section: 'jeu', plein: false },
    cartes:       { horloge: 'arretee', section: 'jeu', plein: false },
    vol:          { horloge: 'avance', section: 'jeu', plein: false },
    defile:       { horloge: 'avance', section: 'repit', plein: false },
    alerte:       { horloge: 'avance', section: 'alerte', plein: false },
    panneau:      { horloge: 'arretee', section: 'alerte', plein: true },
    boss:         { horloge: 'avance', section: 'boss', plein: false },
    mort:         { horloge: 'ralentie', section: null, plein: false },
    reapparition: { horloge: 'avance', section: 'jeu', plein: false },
    victoire:     { horloge: 'avance', section: 'victoire', plein: false },
    fin:          { horloge: 'arretee', section: null, plein: true },          /* 'defaite' ou 'victoire' */
    initiales:    { horloge: 'arretee', section: 'initiales', plein: true },
    pause:        { horloge: 'arretee', section: null, plein: false }          /* étouffoir 420 Hz */
  };

  /* les rangs des consommateurs (§ 7.4), communs à tous les événements */
  var RANGS = { regles: 10, score: 20, xp: 30, apogee: 35, butin: 40, decor: 40, armes: 50, scene: 60, hud: 70,
    defis: 80, journal: 90 };

  /* Le tableau des événements (§ 7.4) : émetteur unique et consommateurs prévus, [rang, module].
     En mode vérification (N.ev.verifier(true), bancs et tests), un consommateur inscrit hors de ce
     tableau, ou une charge hors schéma, est signalé comme une erreur. */
  var EVT = {
    kill: { emetteur: '72-ennemis', conso: [[10, '76-directeur'], [20, '77-score'], [30, '75-cartes'], [35, '70-joueuse'],
      [40, '71-butin'], [50, '74-arsenal'], [60, '79-scene'], [70, '78-hud'], [80, '77-score'], [90, '03-socle']] },
    coup: { emetteur: '70-joueuse', conso: [[60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    coupe: { emetteur: '70-joueuse', conso: [[20, '77-score'], [40, '71-butin'], [60, '79-scene'], [70, '78-hud'],
      [80, '77-score'], [90, '03-socle']] },
    mort: { emetteur: '70-joueuse', conso: [[10, '79-jeu'], [20, '77-score'], [50, '74-arsenal'], [60, '79-scene'],
      [70, '78-hud'], [80, '77-score'], [90, '03-socle']] },
    ramassage: { emetteur: '71-butin', conso: [[10, '70-joueuse'], [10, '72-ennemis'], [10, '76-directeur'], [20, '77-score'],
      [30, '75-cartes'], [35, '70-joueuse'], [60, '79-scene'], [80, '77-score'], [90, '03-socle']] },
    lasso: { emetteur: '70-joueuse', conso: [[20, '77-score'], [35, '70-joueuse'], [40, '71-butin'], [60, '79-scene'],
      [80, '77-score'], [90, '03-socle']] },
    niveau: { emetteur: '75-cartes', conso: [[60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    carte: { emetteur: '75-cartes', conso: [[10, '70-joueuse'], [50, '74-arsenal'], [70, '78-hud'], [90, '03-socle']] },
    vague: { emetteur: '76-directeur', conso: [[10, '79-jeu'], [20, '77-score'], [40, '15-decor'], [60, '30-music'], [60, '79-scene'],
      [70, '78-hud'], [80, '77-score'], [90, '03-socle']] },
    vol: { emetteur: '17-vol', conso: [[10, '79-jeu'], [20, '77-score'], [40, '15-decor'], [60, '79-scene'], [70, '78-hud'],
      [80, '77-score'], [90, '03-socle']] },
    inversion: { emetteur: '72-ennemis', conso: [[10, '76-directeur'], [40, '15-decor'], [60, '79-scene'], [70, '78-hud'],
      [80, '77-score'], [90, '03-socle']] },
    arene: { emetteur: '73-arene', conso: [[60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    phase: { emetteur: '73-colosse', conso: [[10, '79-jeu'], [20, '77-score'], [40, '15-decor'], [60, '79-scene'],
      [70, '78-hud'], [90, '03-socle']] },
    apparition: { emetteur: '72-ennemis', conso: [[70, '78-hud'], [90, '03-socle']] },
    portail: { emetteur: '76-directeur', conso: [[10, '79-jeu'], [60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    arme: { emetteur: '72-ennemis|73-colosse|73-arene', conso: [[60, '79-scene'], [90, '03-socle']] },
    pouvoir: { emetteur: '70-joueuse', conso: [[60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    apogee: { emetteur: '70-joueuse', conso: [[60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    boost: { emetteur: '70-joueuse', conso: [[60, '79-scene'], [90, '03-socle']] },
    defi: { emetteur: '77-score', conso: [[60, '79-scene'], [70, '78-hud'], [90, '03-socle']] },
    deblocage: { emetteur: '77-score', conso: [[30, '75-cartes'], [60, '79-scene'], [70, '78-hud'], [90, '03-socle']] }
  };

  /* le masque de propriété (§ 7.12) : code de qui a dessiné un pixel en dernier */
  var PROPRIETAIRES = { aucun: 0, tete: 1, corps: 2, arsenal: 3, vies: 4, ennemi: 5, butin: 6, effet: 7, decor: 8, hud: 9 };

  /* ---- les noms affichés (police 5 × 7 accentuée) ---- */
  var NOMS = {
    fleche: 'FLÈCHE', dard: 'DARD', larve: 'LARVE', mine: 'MINE', tourelle: 'TOURELLE', lame: 'LAME', ruche: 'RUCHE',
    sentinelle: 'SENTINELLE', rival: 'RIVAL', planeur: 'PLANEUR', traqueur: 'TRAQUEUR', cyclope: 'CYCLOPE',
    convoi: 'CONVOI', canon: 'CANON', tourelles: 'TOURELLES', arc: 'ARC', missiles: 'MISSILES', drones: 'DRONES',
    minesQ: 'MINES DE QUEUE', puissance: 'PUISSANCE', cadence: 'CADENCE', aimant: 'AIMANT', croissance: 'CROISSANCE',
    reparation: 'RÉPARATION', bouclier: 'BOUCLIER', eperon: 'ÉPERON', grappe: 'GRAPPE', sangFroid: 'SANG-FROID',
    braise: 'BRAISE', traversee: 'TRAVERSÉE', ralenti: 'RALENTI', repli: 'REPLI', apogee: 'APOGÉE', lasso: 'LASSO',
    docks: 'LES DOCKS', artere: "L'ARTÈRE", centrale: 'LA CENTRALE', ciel: 'LE CIEL', tours: 'LES TOURS',
    coeur: 'LE CŒUR', eclipse: "L'ÉCLIPSE",
    flecheBlindee: 'FLÈCHE BLINDÉE', rucheInstable: 'RUCHE INSTABLE'
  };
  /* le complément « de … » des textes de cause : 'TIR DE TOURELLE', 'RAYON DU CYCLOPE' */
  var DE = {
    fleche: 'DE FLÈCHE', dard: 'DE DARD', larve: 'DE LARVE', mine: 'DE MINE', tourelle: 'DE TOURELLE', lame: 'DE LAME',
    ruche: 'DE RUCHE', sentinelle: 'DE SENTINELLE', rival: 'DU RIVAL', planeur: 'DE PLANEUR', traqueur: 'DU TRAQUEUR',
    cyclope: 'DU CYCLOPE', 'cyclope:main': 'DU CYCLOPE'
  };

  /* N.ids.texte(cause, auteur) : le nom de la cause, affiché sous la mort et sur l'écran de fin, à la
     suite de « DÉTRUITE PAR : ». Toujours une chaîne non vide, même pour un couple imprévu. */
  function texte(cause, auteur) {
    switch (cause) {
      case 'mur': return auteur === 'murMobile' ? 'MUR ARRIÈRE' : 'MUR ÉLECTRIFIÉ';
      case 'morsure': return 'TA PROPRE QUEUE';
      case 'convoi': return 'CONVOI';
      case 'traine': return 'TRAÎNÉE DU RIVAL';
      case 'tir': return auteur === 'cyclope' ? 'SALVE DU CYCLOPE' : 'TIR ' + (DE[auteur] || 'ENNEMI');
      case 'laser': return auteur === 'cyclope' ? 'RAYON DU CYCLOPE' : 'LASER ' + (DE[auteur] || 'ENNEMI');
      case 'souffle':
        if (auteur === 'cyclope') return 'CHUTE DU CYCLOPE';
        if (auteur === 'mine') return 'SOUFFLE DE MINE';
        return 'SOUFFLE ' + (DE[auteur] ? DE[auteur] + ' INSTABLE' : 'ENNEMI');
      case 'ennemi':
        if (auteur === 'cyclope:main') return 'MAIN DU CYCLOPE';
        if (auteur === 'rival') return 'CORPS DU RIVAL';
        return NOMS[auteur] || 'ENNEMI';
      default: return 'SIGNAL PERDU';
    }
  }

  /* ---- le catalogue des sprites (§ 7.5, lots 6a et 6b) ----
     [nom, w, h, directions (1 ou 16), images d'animation, lot qui le livre, note]
     N.spr.get(nom, dir, img) les sert ; N.spr.catalogue() rend CE tableau, complété de ce que le module
     a réellement. Un nom absent rend le repli procédural. L'état est dans le nom ('fleche:armee') ; la
     direction ne l'est jamais (elle passe par dir). Tailles en px de jeu. */
  var SPRITES = [
    /* joueuse : cyan, cyan pâle, os ; gaine de nuit profonde */
    ['tete', 13, 13, 16, 3, 'demo', 'tête de la joueuse'],
    ['tete:dos', 13, 13, 1, 2, '6a', 'tête vue de dos, pour LE VOL (posée à l échelle 2)'],
    ['corps', 9, 9, 1, 3, 'demo', 'perle du corps'],
    ['corps:7', 7, 7, 1, 3, 'demo', 'perle vers la queue'],
    ['corps:5', 5, 5, 1, 3, 'demo', ''],
    ['corps:3', 3, 3, 1, 3, 'demo', 'dernier segment'],
    ['corps:repli', 13, 13, 1, 3, '6b', 'perle épaisse du REPLI'],
    ['chevron', 7, 7, 16, 1, 'demo', 'chevron du cap visé'],
    ['vie', 9, 9, 1, 1, 'demo', 'icône de vie'],
    ['vieVide', 9, 9, 1, 1, 'demo', 'vie perdue, acier'],
    ['vieMini', 5, 5, 1, 1, '6a', 'pastille de vie du HUD'],
    /* arsenal de la joueuse */
    ['tir', 7, 7, 16, 2, 'demo', 'CANON I et II : trait 1 × 3 à tête cyan pâle'],
    ['lance', 7, 7, 16, 2, '6a', 'CANON III : lance 1 × 5 à cœur cyan pâle'],
    ['rayon', 8, 3, 1, 2, '6a', 'CANON ULTIME : tronçon de rayon de 3 px, répété le long du rayon'],
    ['tourelleJ', 7, 7, 16, 1, '6b', 'module 3 × 3 et canon de 2 px (8 directions utiles)'],
    ['tourelleJ:double', 7, 7, 16, 1, '6b', 'TOURELLES III'],
    ['drone', 5, 5, 1, 2, '6b', 'satellite à œil cyan pâle'],
    ['missile', 5, 5, 16, 2, '6b', 'missile 3 × 5 à pointe cyan pâle'],
    ['mineJ', 5, 5, 1, 2, '6b', 'losange cyan, cœur qui bat à 2 Hz'],
    ['orbe', 3, 3, 1, 2, '6b', 'point du pouvoir prêt, qui orbite autour de la tête'],
    /* ennemis : magenta, rose pâle, sang ; contour de nuit profonde ; jamais de cyan */
    ['fleche', 15, 15, 16, 2, 'demo', ''],
    ['fleche:armee', 15, 15, 16, 2, '6a', 'gonflée d un pixel, cœur rose pâle'],
    ['fleche:elite', 19, 19, 16, 2, '6b', 'FLÈCHE BLINDÉE'],
    ['dard', 15, 15, 16, 2, '6a', 'deux fourches avant'],
    ['larve', 9, 9, 16, 2, '6a', 'éclat à pattes'],
    ['mine', 13, 13, 1, 2, 'demo', ''],
    ['mine:alerte', 13, 13, 1, 2, 'demo', 'cœur qui clignote'],
    ['tourelle', 15, 15, 16, 2, 'demo', 'canon orienté'],
    ['tourelle:charge', 15, 15, 16, 2, 'demo', 'canon allumé avant le tir'],
    ['lame', 15, 15, 16, 2, '6b', 'au repos'],
    ['lame:deployee', 21, 21, 16, 2, '6b', 'lames déployées'],
    ['ruche', 23, 23, 1, 2, '6b', 'pétales fermés'],
    ['ruche:p1', 23, 23, 1, 2, '6b', 'pétales mi-ouverts'],
    ['ruche:p2', 23, 23, 1, 2, '6b', 'pétales ouverts, cœur qui blanchit'],
    ['ruche:elite', 25, 25, 1, 2, '6b', 'RUCHE INSTABLE (écart : 25 px, la ruche ordinaire en fait déjà 23)'],
    ['sentinelle', 15, 15, 1, 4, 'demo', ''],
    ['rival', 11, 11, 16, 2, '6b', 'tête à mâchoires'],
    ['rival:perle', 7, 7, 1, 2, '6b', 'perle en sang à cœur magenta'],
    ['planeur', 9, 9, 16, 2, '6b', 'aile en chevron ouvert, rose pâle et sang'],
    ['traqueur', 15, 15, 1, 4, '6a', 'disque à œil fendu, halo de pointillés qui tourne'],
    ['plaque', 5, 5, 1, 1, '6b', 'plaque de BLINDÉ, sang à rivets rose pâle'],
    ['couronne', 23, 23, 1, 4, '6b', 'couronne de pointillés rose pâle des élites'],
    ['wagon', 18, 14, 1, 2, '6b', 'wagon de convoi'],
    ['wagon:tete', 18, 14, 1, 2, '6b', 'wagon de tête, museau rose pâle qui pulse'],
    ['tirEnnemi', 7, 7, 1, 2, 'demo', 'cœur 5 × 5, liseré sombre'],
    ['tirEnnemi:petit', 5, 5, 1, 2, 'demo', ''],
    ['tirEnnemi:gros', 9, 9, 1, 2, 'demo', ''],
    /* LE CYCLOPE, en pièces */
    ['colosse', 49, 49, 1, 2, 'demo', 'colosse de la démo, repli'],
    ['colosse:tronc', 96, 96, 1, 2, '6b', 'tronc'],
    ['colosse:tete', 40, 32, 1, 2, '6b', 'tête à œil unique'],
    ['colosse:oeil', 14, 10, 1, 2, '6b', 'œil ouvert'],
    ['colosse:oeilFerme', 14, 10, 1, 1, '6b', 'œil fermé'],
    ['colosse:main', 24, 24, 16, 2, '6b', 'main-lame'],
    ['colosse:plaque', 12, 12, 1, 1, '6b', ''],
    ['colosse:carcasse', 96, 64, 1, 1, '6b', ''],
    ['colosseLoin', 48, 48, 1, 1, '6b', 'silhouette lointaine, découpée dans boss.png, sang et nuit'],
    ['colosseMi', 80, 80, 1, 1, '6b', 'silhouette intermédiaire'],
    /* butin */
    ['butin', 9, 11, 1, 4, 'demo', 'cellule d énergie (synonyme : cellule)'],
    ['noyau', 11, 11, 1, 4, '6a', 'cœur jaune'],
    ['pastille', 11, 11, 1, 2, '6a', 'disque os à quatre rayons jaunes, bat à 2 Hz'],
    /* interface */
    ['portail', 7, 7, 16, 1, '6a', 'chevron de portail au bord de la zone sûre'],
    ['son', 11, 11, 1, 1, 'demo', ''], ['muet', 11, 11, 1, 1, 'demo', ''],
    ['pause', 11, 11, 1, 1, 'demo', ''], ['lecture', 11, 11, 1, 1, 'demo', ''],
    ['ok', 9, 8, 1, 1, 'demo', 'coche jaune'], ['ko', 9, 9, 1, 1, 'demo', 'croix magenta']
  ];
  /* mini-silhouettes 5 × 5 par type (chevrons et marqueurs) et icônes de cartes 16 × 16 */
  L.ennemis.concat(['cyclope', 'convoi']).forEach(function (t) { SPRITES.push(['mini:' + t, 5, 5, 1, 1, '6a', 'mini-silhouette']); });
  L.cartes.forEach(function (c) { SPRITES.push(['carte:' + c, 16, 16, 1, 1, '6b', 'icône de carte']); });
  var SPRITES_PAR_NOM = {};
  SPRITES.forEach(function (s) { SPRITES_PAR_NOM[s[0]] = { nom: s[0], w: s[1], h: s[2], dirs: s[3], images: s[4], lot: s[5], note: s[6] }; });

  /* ================================================================================================
     Les schémas (§ 7.5 et § 7.9) et leurs validateurs.
     Règle des champs : un champ listé est obligatoire ; un champ non listé est une ERREUR, sauf s'il
     commence par « _ » (état privé d'un module, que personne d'autre ne lit). Un champ nouveau partagé
     s'obtient par une demande au gardien.
     Types : 'n' nombre fini, 'n+' nombre fini ≥ 0, 'i' entier, 'i+' entier ≥ 0, 'b' booléen, 's' chaîne,
     '*' quelconque, 'nums' tableau (ou tableau typé) de nombres finis, '?x' x ou null,
     un(liste) valeur de la liste, obj(schéma) objet, liste(type) tableau, fn(f) contrôle libre.
     ================================================================================================ */
  function un(liste) { return { un: liste }; }
  function obj(s) { return { obj: s }; }
  function liste(t, min, max) { return { liste: t, min: min || 0, max: max === undefined ? Infinity : max }; }
  function fn(f, nom) { return { fn: f, nom: nom }; }
  function entre(a, b) { return fn(function (v) { return typeof v === 'number' && isFinite(v) && v >= a && v <= b; }, 'nombre de ' + a + ' à ' + b); }
  function entierEntre(a, b) { return fn(function (v) { return typeof v === 'number' && (v | 0) === v && v >= a && v <= b; }, 'entier de ' + a + ' à ' + b); }

  var SCH = {};
  SCH.src = obj({
    genre: un(L.genresSrc), type: 's', id: '?i',
    _ctl: fn(function (o) { var l = SRC_TYPES[o.genre]; return !l || l.indexOf(o.type) >= 0; }, 'type de source compatible avec son genre')
  });
  SCH.ennemi = obj({
    id: 'i', type: un(L.ennemis.concat(L.ennemisBoss)),
    x: 'n', y: 'n', vx: 'n', vy: 'n', r: 'n+', ang: 'n',
    pv: 'n', pvMax: 'n+',
    etat: un(L.etatsEnnemi), etatT: 'n+', vuDepuis: fn(function (v) { return typeof v === 'number' && isFinite(v) && (v === -1 || v >= 0); }, '-1 ou ≥ 0'),
    elite: 'b', mods: obj({ blinde: 'b', rapide: 'b', instable: 'b' }),
    boss: 'b', partie: un(['oeil', 'main', null]),
    tele: 'i', img: 'i+', dir: entierEntre(0, 15),
    _ctl: fn(function (o) { return (o.type === 'cyclope') === !!o.boss && (o.boss || o.partie === null); }, 'type cyclope si et seulement si boss ; partie null hors boss')
  });
  SCH.tir = obj({ id: 'i', x: 'n', y: 'n', vx: 'n', vy: 'n', r: 'n+', vie: 'n', src: SCH.src });
  SCH.tele = obj({
    id: 'i', forme: un(L.formesTele), x0: 'n', y0: 'n', x1: 'n', y1: 'n', r: 'n+', a0: 'n', a1: 'n',
    reste: 'n', total: 'n+', cible: un(L.ciblesTele), par: obj({ type: 's', id: '?i' })
  });
  SCH.death = obj({
    cause: un(L.causes), auteur: un(L.auteurs), auteurId: '?i', x: 'n', y: 'n', t: 'n+',
    vague: 'i+', quartier: un(L.quartiers), visibleDepuis: 'n', teleDuree: 'n+'
  });
  SCH.player = obj({
    x: 'n', y: 'n', ang: 'n', angVise: 'n', vit: 'n+', len: 'i+', segs: 'nums', etat: un(L.etatsJoueuse),
    boost: 'b', reserve: entre(0, 100), apogee: entre(0, 100), pouvoirPret: 'b',
    pouvoir: un(L.pouvoirs)                                     /* le pouvoir équipé (lot I, demande de codex-02) : lu par les pilotes */
  });
  SCH.mods = obj({
    degats: 'n+', cadence: 'n+', aimant: 'n+', lenMax: 'i+', reparation: entierEntre(0, 2), bouclier: entierEntre(0, 1),
    eperon: 'b', grappe: entierEntre(0, 2), sangFroid: 'b', braise: entierEntre(0, 2)
  });
  SCH.reglages = obj({
    musique: 'b', effets: 'b', secousse: un([1, 0.5, 0]), flashs: 'b', ecran: un(['riche', 'sobre', 'pur']),
    texte: un([1, 2]), manche: un([0.8, 1, 1.25]), actions: un(['doigts', 'auto'])
  });
  SCH.geste = obj({ genre: un(['toucher', 'glisse', 'tenu']), doigt: un(['action']), t0: 'n', t1: 'n', x: 'n', y: 'n', dx: 'n', dy: 'n' });
  SCH.tap = obj({ x: 'n', y: 'n', t0: 'n', t1: 'n', doigt: un(['manche', 'action', 'bouton']) });
  SCH.input = obj({
    x: 'n', y: 'n', mag: entre(0, 1), boost: 'b', pouvoir: 'b', apogee: 'b', pause: 'b', valider: 'b', retour: 'b',
    chiffre: entierEntre(0, 4), car: 's', any: 'b',
    pointer: obj({ x: 'n', y: 'n', actif: 'b', boutons: 'i+' }),
    manette: obj({ connectee: 'b', x: 'n', y: 'n', boutons: 'i+' }),
    gestes: liste(SCH.geste), taps: liste(SCH.tap),
    fire: '*', stick: '*'                                       /* champs de la démo, gardés pendant la transition */
  });
  /* objets ajoutés par le contrat 1.0 pour que pilotes et mesures n'aient à lire que S (§ 4.10) */
  SCH.butin = obj({ id: 'i', type: un(L.typesButin), x: 'n', y: 'n', valeur: 'n+', vie: 'n' });
  SCH.voie = obj({ id: 'i', y0: 'n', y1: 'n', etat: un(['annonce', 'passage']), sens: un([-1, 1]), x: 'n', reste: 'n' });
  SCH.monde = obj({ x0: 'n', y0: 'n', x1: 'n', y1: 'n', vx: 'n', vy: 'n', mobile: 'b', annonce: liste(liste('n', 4, 4)) });
  SCH.vue = obj({ x: 'n', y: 'n', w: 'n+', h: 'n+' });
  /* niveaux (lot I, demande de codex-02) : le palier que CHAQUE carte proposée donnerait si on la prenait (1 à 4 ; 4 = l'ULTIME d'une
     arme), publié par 80-ecrans en dictionnaire { idCarte: palier } ({} hors de l'écran des cartes), la forme que lit le pilote
     (S.ecran.niveaux[idCarte]). La forme « tableau parallèle à cartes » de l'exemple de tools/contrat/tests.js reste acceptée. */
  var NIVEAUX = fn(function (v) {
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) if (!(typeof v[i] === 'number' && (v[i] | 0) === v[i] && v[i] >= 0 && v[i] <= 4)) return false; return true; }
    if (!v || typeof v !== 'object') return false;
    for (var k in v) if (L.cartes.indexOf(k) < 0 || !(typeof v[k] === 'number' && (v[k] | 0) === v[k] && v[k] >= 0 && v[k] <= 4)) return false;
    return true;
  }, 'niveaux : { idCarte: palier 0 à 4 } ou tableau de paliers');
  SCH.ecran = obj({ nom: '?s', depuis: 'n+', cartes: liste(un(L.cartes)), niveaux: NIVEAUX, choix: 'i+', pret: 'b' });
  /* S.vol (lot I) : LE VOL vu par les pilotes, null hors du VOL. Les objets visibles seulement (rayon projeté ≥ 1), dans le plan de la
     tête : x, y = l'endroit où l'objet croisera la tête, dans le repère de `tete` ; z = sa profondeur actuelle ; r = son rayon dans le
     plan de la tête ; avant = les secondes avant qu'il croise la tête ; reste = les secondes qui restent au VOL. */
  SCH.volObjet = obj({ type: un(['cellule', 'porte', 'mine']), x: 'n', y: 'n', z: 'n+', r: 'n+', avant: 'n+' });
  SCH.vol = obj({ tete: obj({ x: 'n', y: 'n' }), objets: liste(SCH.volObjet), reste: 'n+' });
  SCH.vague = obj({ n: 'i+', etape: un(L.etapes), nom: 's', quartier: un(L.quartiers), t: 'n+', evt: un(['entree', 'pic', 'nettoyee', 'soupape']) });
  SCH.perf = obj({ p50: 'n+', p90: 'n+', p95: 'n+', p99: 'n+', niveau: 's' });
  SCH.sprite = obj({
    w: 'i+', h: 'i+', data: fn(function (d) { return d instanceof Uint8Array; }, 'Uint8Array'), cx: '*', cy: '*',
    _ctl: fn(function (o) { return o.data && o.data.length === o.w * o.h; }, 'data.length = w × h')
  });

  /* ---- les charges des événements (§ 7.4) ---- */
  var CH = {};
  CH.kill = obj({ id: 'i', type: un(L.ennemis.concat(L.ennemisBoss)), x: 'n', y: 'n', elite: 'b', boss: 'b', base: 'n+',
    src: SCH.src, distTete: 'n+', gen: 'i+' });
  CH.coup = obj({ partie: un(['tete', 'corps']), k: 'i+', cause: un(L.causes.concat(['vol'])), auteur: un(L.auteurs),
    auteurId: '?i', x: 'n', y: 'n', absorbe: 'b', visibleDepuis: 'n', teleDuree: 'n+' });
  CH.coupe = obj({ k: 'i+', perdus: 'i+', cause: un(L.causesCoupe), auteur: un(L.auteurs), x: 'n', y: 'n' });
  CH.mort = SCH.death;
  CH.ramassage = obj({ type: un(L.typesButin), x: 'n', y: 'n', valeur: 'n+' });
  CH.lasso = obj({ n: 'i+', ids: liste('i'), aire: 'n+', x: 'n', y: 'n', poly: 'nums' });
  CH.niveau = obj({ niveau: 'i+', enAttente: 'i+' });
  CH.carte = obj({ id: un(L.cartes), niveau: 'i+' });
  CH.vague = obj({ n: 'i+', etape: un(L.etapes), evt: un(['entree', 'pic', 'nettoyee', 'soupape']), nom: 's', quartier: un(L.quartiers) });
  CH.vol = obj({ evt: un(['debut', 'porte', 'mine', 'fin']), parfait: 'b', vers: un(L.quartiers), portes: 'i+', mines: 'i+' });
  CH.inversion = obj({ evt: un(['debut', 'fin']), dur: 'n+' });
  CH.arene = obj({ evt: un(['travellingAnnonce', 'travelling', 'convoiAnnonce', 'convoiPasse', 'fin']), voie: 'i', vx: 'n' });
  CH.phase = obj({ n: 'i+', evt: un(['arrivee', 'entree', 'repit', 'enrage', 'mort']) });
  CH.apparition = obj({ id: 'i', type: un(L.ennemis.concat(L.ennemisBoss)), x: 'n', y: 'n', elite: 'b' });
  CH.portail = obj({ type: un(L.ennemis.concat(L.ennemisBoss)), x: 'n', y: 'n', dur: 'n+', elite: 'b' });
  CH.arme = obj({ id: 'i', type: un(L.ennemis.concat(L.ennemisBoss, ['convoi'])), forme: un(L.formesTele), total: 'n+',
    cible: un(L.ciblesTele), shown: 'b', rallonge: 'b' });
  CH.pouvoir = obj({ id: un(L.pouvoirs), evt: un(['debut', 'fin', 'pret']) });
  CH.apogee = obj({ id: un(['apogee']), evt: un(['pleine', 'debut', 'fin']) });
  CH.boost = obj({ id: un(['boost']), evt: un(['on', 'off', 'panne']) });
  CH.defi = obj({ id: un(L.defis.concat(L.defisVague)), ok: 'b', prime: 'n+' });
  CH.deblocage = obj({ id: un(L.deblocages) });

  /* ---- les enregistrements du journal (§ 7.9) : {pas, t, image, type, d}, d au schéma du type ---- */
  var R4 = obj({ x: 'n', y: 'n', w: 'n+', h: 'n+' });
  var JR = {
    apparition: obj({ id: 'i', type: un(L.ennemis.concat(L.ennemisBoss)), x: 'n', y: 'n', elite: 'b', vue: '?' + 'o',
      anticipee: '?o', distTete: '?n' }),
    portail: obj({ type: 's', x: 'n', y: 'n', dur: 'n+', elite: 'b' }),
    armement: obj({ id: 'i', type: 's', forme: un(L.formesTele), total: 'n+', cible: un(L.ciblesTele), shown: 'b', rallonge: 'b' }),
    tele: obj({ id: 'i', forme: un(L.formesTele), total: 'n+', cible: un(L.ciblesTele), par: obj({ type: 's', id: '?i' }) }),
    tirEnnemi: obj({ id: 'i', src: SCH.src, x: 'n', y: 'n' }),
    coup: obj({ partie: un(['tete', 'corps']), k: 'i+', cause: un(L.causes.concat(['vol'])), auteur: un(L.auteurs),
      auteurId: '?i', visibleDepuis: 'n', teleDuree: 'n+', absorbe: 'b' }),
    geste: obj({ genre: un(['toucher', 'glisse', 'tenu', 'autre']), doigt: un(['manche', 'action', 'bouton']), duree: 'n+',
      deplacement: 'n+', action: un(['pouvoir', 'apogee', 'boost', 'aucune']) }),
    section: obj({ nom: un(L.sections) }),
    bloc: obj({ fichier: 's', t0: 'n', decalage: 'n' }),
    flash: obj({ aire: 'n+', accepte: 'b' }),
    sfx: obj({ nom: 's', demande: 'b', joue: 'b' }),
    vue: obj({ x: 'n', y: 'n', w: 'n+', h: 'n+', devant: 'n', teteX: 'n', teteY: 'n' }),
    perf: obj({ ms: 'n+', modules: '?o', tube: '?s' }),
    perdu: obj({ nom: 's', parPas: 'i+' }),
    partie: obj({ graine: 'i', mode: '?s' }),
    pilote: obj({ nom: un(L.pilotes), evt: 's', '*': '*' })
  };
  ['kill', 'lasso', 'coupe', 'mort', 'ramassage', 'carte', 'niveau', 'vague', 'vol', 'inversion', 'arene', 'phase', 'defi',
    'deblocage', 'pouvoir', 'apogee', 'boost'].forEach(function (t) { JR[t] = CH[t]; });
  L.journal = Object.keys(JR);

  /* ---- le moteur de validation ---- */
  function nomType(t) {
    if (typeof t === 'string') return t;
    if (t.un) return 'un de ' + JSON.stringify(t.un);
    if (t.obj) return 'objet';
    if (t.liste) return 'tableau';
    if (t.fn) return t.nom || 'contrôle';
    return '?';
  }
  function verifierType(t, v, chemin, err) {
    if (typeof t === 'string') {
      var opt = t.charAt(0) === '?';
      if (opt) { if (v === null || v === undefined) return; t = t.slice(1); }
      var ok;
      switch (t) {
        case '*': ok = true; break;
        case 'n': ok = typeof v === 'number' && isFinite(v); break;
        case 'n+': ok = typeof v === 'number' && isFinite(v) && v >= 0; break;
        case 'i': ok = typeof v === 'number' && (v | 0) === v; break;
        case 'i+': ok = typeof v === 'number' && (v | 0) === v && v >= 0; break;
        case 'b': ok = typeof v === 'boolean'; break;
        case 's': ok = typeof v === 'string'; break;
        case 'o': ok = v !== null && typeof v === 'object'; break;
        case 'nums':
          ok = (Array.isArray(v) || (ArrayBuffer.isView && ArrayBuffer.isView(v)));
          if (ok) for (var q = 0; q < v.length; q++) if (typeof v[q] !== 'number' || !isFinite(v[q])) { ok = false; break; }
          break;
        default: ok = false;
      }
      if (!ok) err.push(chemin + ' : attendu ' + (opt ? '?' : '') + t + ', reçu ' + apercu(v));
      return;
    }
    if (t.un) { if (t.un.indexOf(v) < 0) err.push(chemin + ' : ' + apercu(v) + ' hors de ' + JSON.stringify(t.un)); return; }
    if (t.fn) { var r = false; try { r = t.fn(v); } catch (e) { r = false; } if (!r) err.push(chemin + ' : ' + (t.nom || 'contrôle') + ', reçu ' + apercu(v)); return; }
    if (t.liste) {
      if (!(Array.isArray(v) || (ArrayBuffer.isView && ArrayBuffer.isView(v)))) { err.push(chemin + ' : tableau attendu, reçu ' + apercu(v)); return; }
      if (v.length < t.min || v.length > t.max) err.push(chemin + ' : longueur ' + v.length + ' hors de [' + t.min + ', ' + t.max + ']');
      for (var i = 0; i < v.length && err.length < 20; i++) verifierType(t.liste, v[i], chemin + '[' + i + ']', err);
      return;
    }
    if (t.obj) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) { err.push(chemin + ' : objet attendu, reçu ' + apercu(v)); return; }
      var s = t.obj, libre = s['*'] === '*';
      for (var k in s) {
        if (k === '_ctl' || k === '*') continue;
        if (!(k in v)) { if (s[k] === '*' || (typeof s[k] === 'string' && s[k].charAt(0) === '?')) continue; err.push(chemin + '.' + k + ' : champ manquant'); continue; }
        verifierType(s[k], v[k], chemin + '.' + k, err);
      }
      if (!libre) for (var c in v) {
        if (!Object.prototype.hasOwnProperty.call(v, c)) continue;
        if (c.charAt(0) === '_' || c in s) continue;
        err.push(chemin + '.' + c + ' : champ non prévu par le contrat (préfixe « _ » pour un champ privé, sinon demande au gardien)');
      }
      if (s._ctl && err.length === 0) verifierType(s._ctl, v, chemin, err);
    }
  }
  function apercu(v) {
    if (v === undefined) return 'undefined';
    try { var s = JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 57) + '…' : String(s); } catch (e) { return String(v); }
  }
  /* N.ids.valider(genre, objet) -> tableau d'erreurs (vide si l'objet est conforme).
     genre : 'ennemi','tir','src','tele','death','player','mods','reglages','input','butin','voie','monde','vue',
     'ecran','vol','vague','perf','sprite', 'charge:<événement>', 'journal:<type>' (enregistrement complet) */
  function valider(genre, o) {
    var err = [], t;
    if (genre.indexOf('charge:') === 0) t = CH[genre.slice(7)];
    else if (genre.indexOf('journal:') === 0) {
      var ty = genre.slice(8); t = JR[ty];
      if (!t) return ['type de journal inconnu : ' + ty];
      if (!o || typeof o !== 'object') return ['enregistrement attendu'];
      verifierType('i+', o.pas, 'pas', err); verifierType('n', o.t, 't', err); verifierType('i+', o.image, 'image', err);
      if (o.type !== ty) err.push('type : ' + apercu(o.type) + ' au lieu de ' + ty);
      verifierType(t, o.d, 'd', err);
      return err;
    } else t = SCH[genre];
    if (!t) return ['genre de schéma inconnu : ' + genre];
    verifierType(t, o, genre, err);
    return err;
  }

  /* ---- les identifiants d'objets : un compteur par partie, remis à zéro par N.socle.reset ---- */
  var prochainId = 1;
  function suivant() { return prochainId++; }

  var IDS = {
    version: VERSION,
    ennemis: L.ennemis, ennemisBoss: L.ennemisBoss, armes: L.armes, passifs: L.passifs, pouvoirs: L.pouvoirs, cartes: L.cartes,
    causes: L.causes, causesCoupe: L.causesCoupe, auteurs: L.auteurs, etats: L.etats, sections: L.sections,
    quartiers: L.quartiers, etatsDecor: L.etatsDecor, defis: L.defis, defisVague: L.defisVague, deblocages: L.deblocages,
    sons: L.sons, sonsAnciens: L.sonsAnciens, voix: L.voix, cues: L.cues, couches: L.couches, canauxSon: L.canauxSon,
    scenes: L.scenes, ecrans: L.ecrans, pilotes: L.pilotes, flux: L.flux, fluxJeu: L.fluxJeu, fluxCosmetiques: L.fluxCosmetiques,
    fluxAnciens: L.fluxAnciens, formations: L.formations, elites: L.elites, modificateurs: L.modificateurs, raretes: L.raretes,
    etatsEnnemi: L.etatsEnnemi, etatsJoueuse: L.etatsJoueuse, partiesBoss: L.partiesBoss, formesTele: L.formesTele,
    ciblesTele: L.ciblesTele, genresSrc: L.genresSrc, typesSrc: SRC_TYPES, typesButin: L.typesButin, etapes: L.etapes,
    familles: L.familles, builds: L.builds, notes: L.notes, evenements: L.evenements, journal: L.journal,
    tableEtats: ETATS, rangs: RANGS, tableEvenements: EVT, proprietaires: PROPRIETAIRES, noms: NOMS,
    sprites: SPRITES_PAR_NOM, listeSprites: SPRITES.map(function (s) { return s[0]; }),
    texte: texte, valider: valider,
    valide: function (genre, o) { return valider(genre, o).length === 0; },
    nom: function (id) { return NOMS[id] || String(id).toUpperCase(); },
    suivant: suivant,
    dans: function (nomListe, v) { var l = IDS[nomListe]; return Array.isArray(l) && l.indexOf(v) >= 0; }
  };
  geler(IDS.typesSrc); geler(ETATS); geler(RANGS); geler(EVT); geler(PROPRIETAIRES); geler(NOMS); geler(SPRITES_PAR_NOM);
  for (var kl in L) if (Array.isArray(L[kl])) Object.freeze(L[kl]);
  IDS.listeSprites = Object.freeze(IDS.listeSprites);
  N.ids = Object.freeze(IDS);

  /* ================================================================================================
     N.rng — des flux de hasard nommés (§ 7.3). Même suite congruentielle que la démo ; chaque flux a
     sa graine hash(graine de partie, nom). Tirer dans un flux ne change aucun autre flux.
       N.rng(nom)             -> le flux nommé de la partie : { f(), i(a,b), r(a,b), etat(), reprendre(e), nom }
       N.rng.reset(graine)    re-sème EN PLACE tous les flux (un module peut garder la référence)
       N.rng.graine()         la graine de la partie
       N.rng.flux(graine,nom) un flux indépendant, hors registre (défis du jour : flux(S.jour, 'defis'))
       N.rng.famille(graine)  un registre indépendant, même interface que N.rng (tests, outils)
       N.rng.hash(a, nom)     la graine dérivée, entier 32 bits non nul
     f() rend [0, 1[ ; i(a,b) un entier de a à b inclus ; r(a,b) un réel de [a, b[.
     ================================================================================================ */
  function hash(graine, nom) {
    var h = 2166136261 ^ (graine >>> 0);
    h = Math.imul(h, 16777619) >>> 0;
    var s = String(nom);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= graine >>> 16; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
    return (h >>> 0) || 1;
  }
  function creerFlux(nom, graine) {
    var s = hash(graine, nom);
    var F = {
      nom: nom,
      f: function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; },
      i: function (a, b) { return a + ((F.f() * (b - a + 1)) | 0); },
      r: function (a, b) { return a + (b - a) * F.f(); },
      etat: function () { return s; },
      reprendre: function (e) { s = (+e >>> 0); },
      _semer: function (g) { s = hash(g, nom); }
    };
    return F;
  }
  function creerFamille(graine0) {
    var reg = {}, graine = graine0 | 0, verif = false;
    function rng(nom) {
      var F = reg[nom];
      if (!F) {
        if (verif && L.flux.indexOf(nom) < 0 && L.fluxAnciens.indexOf(nom) < 0) signaler('rng', new Error('flux non figé : ' + nom));
        F = reg[nom] = creerFlux(nom, graine);
      }
      return F;
    }
    rng.reset = function (g) { graine = g | 0; for (var k in reg) reg[k]._semer(graine); };
    rng.graine = function () { return graine; };
    rng.noms = L.flux;
    rng.hash = hash;
    rng.flux = function (g, nom) { return creerFlux(nom, g | 0); };
    rng.famille = creerFamille;
    rng.verifier = function (b) { verif = !!b; };
    return rng;
  }
  N.rng = creerFamille(2975);

  /* ================================================================================================
     N.journal — l'anneau de mesure (§ 7.9). Un enregistrement : { pas, t, image, type, d }, où d est une
     COPIE de la charge (jamais une référence). Complet sous ?journal=1, dans les bancs et en mode simulé
     (N.journal.actif(true)) ; sinon seuls coup, mort, kill, vague, partie et perdu sont gardés.
       N.journal(type, d)           écrit (d : objet simple)
       N.journal.dump(opts)         -> tableau des enregistrements, du plus ancien au plus récent ;
                                       opts.json : la chaîne JSON ; opts.vider : vide l'anneau après
       N.journal.lire(type)         -> les enregistrements de ce type encore dans l'anneau
       N.journal.dernier(type)      -> le plus récent de ce type, ou null
       N.journal.actif(b)           journal complet oui / non ; sans argument, rend l'état
       N.journal.vider(), .compte() (total écrit depuis le chargement), .taille() (65 536)
       N.journal.creer(taille, horloge)  un anneau indépendant (tests)
     ================================================================================================ */
  var GARDES = { coup: 1, mort: 1, kill: 1, vague: 1, partie: 1, perdu: 1 };
  function creerJournal(taille, horloge) {
    var buf = new Array(taille), n = 0, complet = false;
    function ecrire(type, d) {
      if (!complet && !GARDES[type]) return;
      var h = horloge || N.horloge;
      var S = N.S;
      var rec = {
        pas: h ? h.pas() : 0,
        t: h ? h.t() : 0,
        image: (S && typeof S.frame === 'number') ? S.frame : ((W.__FRAME | 0) || 0),
        type: String(type),
        d: (d && typeof d === 'object') ? copier(d, 0) : {}
      };
      buf[n % taille] = rec; n++;
    }
    function tous() {
      var m = Math.min(n, taille), out = new Array(m), d0 = n - m;
      for (var i = 0; i < m; i++) out[i] = buf[(d0 + i) % taille];
      return out;
    }
    ecrire.dump = function (opts) {
      var a = tous();
      if (opts && opts.vider) { buf = new Array(taille); n = 0; }
      return (opts && opts.json) ? JSON.stringify(a) : a;
    };
    ecrire.lire = function (type) { return tous().filter(function (r) { return r.type === type; }); };
    ecrire.dernier = function (type) {
      var m = Math.min(n, taille);
      for (var i = 1; i <= m; i++) { var r = buf[(n - i) % taille]; if (r.type === type) return r; }
      return null;
    };
    ecrire.actif = function (b) { if (arguments.length) complet = !!b; return complet; };
    ecrire.vider = function () { buf = new Array(taille); n = 0; };
    ecrire.compte = function () { return n; };
    ecrire.taille = function () { return taille; };
    ecrire.creer = creerJournal;
    return ecrire;
  }
  N.journal = creerJournal(65536);
  try { if (W.location && /[?&]journal=1\b/.test(W.location.search || '')) N.journal.actif(true); } catch (e) { /* rien */ }

  /* ================================================================================================
     N.ev — le bus d'événements (§ 7.4).
       N.ev.on(nom, rang, fn, qui)   inscrit un consommateur ; qui = nom du fichier sans « .js »
                                     ('77-score'). Une nouvelle inscription du même (nom, rang, qui)
                                     REMPLACE l'ancienne : un module peut s'inscrire à chaque reset.
       N.ev.off(nom, fnOuQui)        retire par fonction, ou tous ceux d'un module
       N.ev.emit(nom, charge)        envoi synchrone, par rang puis par nom de fichier puis par ordre
                                     d'inscription. Émis pendant un envoi : mis en file, envoyé juste
                                     après, premier entré premier sorti. Au plus 64 par pas : au-delà,
                                     l'événement est perdu, journalisé ('perdu') et compté dans __ERR.
                                     Une exception dans un consommateur est mise en quarantaine
                                     (__ERR) sans empêcher les suivants. -> false si perdu.
       N.ev.nouveauPas()             remet le compteur par pas à zéro (appelé par N.horloge.avancer)
       N.ev.consommateurs(nom)       -> [{rang, qui}] dans l'ordre d'appel
       N.ev.verifier(b)              mode vérification : charge au schéma, nom connu, consommateur prévu
       N.ev.stats()                  -> {emis, perdus, parNom}
       N.ev.creer(opts)              un bus indépendant (tests) ; opts.max, opts.journal, opts.signaler
     ================================================================================================ */
  function creerBus(opts) {
    opts = opts || {};
    var MAX = opts.max || 64;
    var journal = opts.journal || null;
    var sig = opts.signaler || signaler;
    var table = {}, file = [], tete = 0, envoi = false, parPas = 0, ordre = 0, verif = false;
    var differes = [];
    var stats = { emis: 0, perdus: 0, parNom: {} };
    function cmp(a, b) { return (a.rang - b.rang) || (a.qui < b.qui ? -1 : a.qui > b.qui ? 1 : 0) || (a.ordre - b.ordre); }
    function inscrire(nom, rang, f, qui) {
      var l = table[nom] || (table[nom] = []);
      if (qui !== '~') for (var i = 0; i < l.length; i++) if (l[i].qui === qui && l[i].rang === rang) { l[i].fn = f; return; }
      for (var j = 0; j < l.length; j++) if (l[j].fn === f && l[j].rang === rang) return;
      l.push({ rang: rang, qui: qui, fn: f, ordre: ordre++ });
      l.sort(cmp);
    }
    function retirer(nom, cle) {
      var l = table[nom]; if (!l) return;
      for (var i = l.length - 1; i >= 0; i--) if (l[i].fn === cle || l[i].qui === cle) l.splice(i, 1);
    }
    function on(nom, rang, f, qui) {
      if (typeof f !== 'function') { sig('ev', new Error('on(' + nom + ') : fonction attendue')); return; }
      rang = +rang; if (!isFinite(rang)) rang = 50;
      qui = qui ? String(qui) : '~';
      if (verif) controleInscription(nom, rang, qui);
      if (envoi) differes.push(0, nom, rang, f, qui); else inscrire(nom, rang, f, qui);
    }
    function off(nom, cle) { if (envoi) differes.push(1, nom, 0, cle, ''); else retirer(nom, cle); }
    function controleInscription(nom, rang, qui) {
      var e = EVT[nom];
      if (!e) { sig('ev', new Error('événement inconnu du contrat : ' + nom)); return; }
      if (qui === '~') { sig('ev', new Error('consommateur anonyme de ' + nom + ' (passer le nom du fichier)')); return; }
      for (var i = 0; i < e.conso.length; i++) if (e.conso[i][0] === rang && e.conso[i][1] === qui) return;
      sig('ev', new Error('consommateur non prévu par le contrat : ' + nom + ' / ' + rang + ' / ' + qui));
    }
    function envoyer(nom, charge) {
      var l = table[nom];
      if (!l) return;
      for (var i = 0; i < l.length; i++) {
        try { l[i].fn(charge, nom); } catch (e) { sig('ev:' + nom + ':' + l[i].qui, e); }
      }
    }
    function emit(nom, charge) {
      if (++parPas > MAX) {
        stats.perdus++;
        var J = journal || N.journal;
        try { J('perdu', { nom: String(nom), parPas: parPas }); } catch (e) { /* rien */ }
        sig('ev', new Error('plus de ' + MAX + ' événements dans un pas : ' + nom + ' perdu'));
        return false;
      }
      stats.emis++; stats.parNom[nom] = (stats.parNom[nom] || 0) + 1;
      if (verif) {
        if (!EVT[nom]) sig('ev', new Error('événement inconnu du contrat : ' + nom));
        else { var er = valider('charge:' + nom, charge); if (er.length) sig('ev:schema:' + nom, new Error(er.slice(0, 3).join(' ; '))); }
      }
      file.push(nom, charge);
      if (envoi) return true;
      envoi = true;
      try {
        while (tete < file.length) { var n = file[tete], c = file[tete + 1]; file[tete] = file[tete + 1] = null; tete += 2; envoyer(n, c); }
      } finally {
        file.length = 0; tete = 0; envoi = false;
        if (differes.length) {
          var d = differes; differes = [];
          for (var k = 0; k < d.length; k += 5) { if (d[k] === 0) inscrire(d[k + 1], d[k + 2], d[k + 3], d[k + 4]); else retirer(d[k + 1], d[k + 3]); }
        }
      }
      return true;
    }
    return {
      on: on, off: off, emit: emit,
      nouveauPas: function () { parPas = 0; },
      parPas: function () { return parPas; },
      consommateurs: function (nom) { return (table[nom] || []).map(function (x) { return { rang: x.rang, qui: x.qui }; }); },
      verifier: function (b) { if (arguments.length) verif = !!b; return verif; },
      stats: function () { return { emis: stats.emis, perdus: stats.perdus, parNom: copier(stats.parNom, 0) }; },
      vider: function () { table = {}; },
      creer: creerBus
    };
  }
  N.ev = creerBus();

  /* le journal consomme tout au rang 90, en dernier (§ 7.4, § 7.9). brancherJournal(bus, J) inscrit ces
     consommateurs sur un bus ; le socle le fait une fois sur N.ev au chargement. */
  function rect(o) { return o && typeof o.x === 'number' ? { x: o.x, y: o.y, w: o.w, h: o.h } : null; }
  function brancherJournal(bus, J) {
    var VUE = { x: 0, y: 0, w: 0, h: 0 }, ANT = { x: 0, y: 0, w: 0, h: 0 };
    L.evenements.forEach(function (nom) {
      if (nom === 'apparition') {
        bus.on(nom, 90, function (c) {
          var d = { id: c.id, type: c.type, x: c.x, y: c.y, elite: c.elite, vue: null, anticipee: null, distTete: null };
          var cam = N.cam;
          if (cam && typeof cam.x === 'number') {
            VUE.x = cam.x; VUE.y = cam.y; VUE.w = cam.w; VUE.h = cam.h; d.vue = rect(VUE);
            if (typeof cam.anticipee === 'function') { try { d.anticipee = rect(cam.anticipee(1.15, ANT)); } catch (e) { d.anticipee = null; } }
          }
          var P = N.S && N.S.player;
          if (P && typeof P.x === 'number') d.distTete = Math.hypot(c.x - P.x, c.y - P.y);
          J('apparition', d);
        }, '03-socle');
      } else if (nom === 'arme') {
        bus.on(nom, 90, function (c) { J('armement', c); }, '03-socle');
      } else if (nom === 'mort') {
        bus.on(nom, 90, function (c) {
          J('mort', c);
          J('coup', { partie: 'tete', k: 0, cause: c && c.cause, auteur: c && c.auteur, auteurId: c ? c.auteurId : null,
            visibleDepuis: c ? c.visibleDepuis : 0, teleDuree: c ? c.teleDuree : 0, absorbe: false });
        }, '03-socle');
      } else if (nom === 'coup') {
        bus.on(nom, 90, function (c) {
          J('coup', { partie: c.partie, k: c.k, cause: c.cause, auteur: c.auteur, auteurId: c.auteurId,
            visibleDepuis: c.visibleDepuis, teleDuree: c.teleDuree, absorbe: c.absorbe });
        }, '03-socle');
      } else {
        bus.on(nom, 90, function (c) { J(nom, c); }, '03-socle');
      }
    });
  }
  brancherJournal(N.ev, N.journal);

  /* ================================================================================================
     N.horloge — le temps de jeu (§ 7.2).
     Le pas est fixe : H = 1/120 s. 90-boot.js, à chaque image :
         var n = N.horloge.image(dtReel);           // nombre de pas à faire (au plus 4)
         for (var k = 0; k < n; k++) { var dt = N.horloge.avancer(); S.t = N.horloge.t(); S.dt = dt;
                                       N.game.update(dt); N.fx.update(dt); N.cam.update(dt); }
     avancer() fait UN pas et rend dtMonde :
       - horloge ARRÊTÉE (S.paused, ou état du jeu à horloge 'arretee' : cartes, pause, panneau, fin,
         initiales, demarrage, ouverture, titre, briefing) : dtMonde = dtJoueuse = 0, le gel ne s'use pas ;
       - GEL (hitstop) en cours : dtMonde = dtJoueuse = 0 ; le gel s'use de H par pas (temps réel) ;
       - sinon : dtMonde = H × k, dtJoueuse = H × kJ, où k = N.fx.k() et kJ = N.fx.kJoueuse() (1 sans fx).
     t() est la somme des dtMonde : des secondes de TEMPS DE JEU (ralenti compris).
       N.horloge.geler(sec)      pose un gel de sec secondes de temps réel (le plus long gagne, pas de
                                 cumul) ; N.fx.hitstop(n) DOIT appeler geler(n / 60)
       N.horloge.t(), dtMonde(), dtJoueuse(), pas(), reel() (somme des pas, temps réel), gele(), arretee()
       N.horloge.temps()         -> {mesure, temps, phase} à 144,6 BPM, dérivé de t() (objet réutilisé :
                                 le lire, ne pas le garder) ; mesure ≥ 0, temps 0..3, phase [0, 1[
       N.horloge.franchi()       -> {temps, mesure} : le pas qui vient de se faire a-t-il franchi un temps,
                                 une mesure (objet réutilisé)
       N.horloge.prochainTemps() -> t() du prochain temps (apparitions « sur la grille »)
       N.horloge.reset()         t = 0, pas = 0, gel = 0, reste = 0 (appelé par N.socle.reset)
       N.horloge.creer(cfg)      une horloge indépendante (tests) ; cfg.arretee(), cfg.paused(), cfg.etat(),
                                 cfg.k() et cfg.kJoueuse() remplacent S.paused, N.game.etat() et N.fx
     ================================================================================================ */
  var H = 1 / 120, PAS_MAX = 4, BPM = 144.6, TEMPS = 60 / BPM, MESURE = 4 * TEMPS;
  function creerHorloge(cfg) {
    cfg = cfg || {};
    var global = !!cfg.global;
    var st = { t: 0, pas: 0, reel: 0, acc: 0, gel: 0, dtM: 0, dtJ: 0, gele: false, arretee: false };
    var TPS = { mesure: 0, temps: 0, phase: 0 }, FR = { temps: false, mesure: false };
    function estArretee() {
      if (cfg.arretee) return !!cfg.arretee();
      var S = N.S;
      if (cfg.paused ? cfg.paused() : (S && S.paused)) return true;
      var e = null, g = N.game;
      if (cfg.etat) e = cfg.etat();
      else if (g && typeof g.etat === 'function') { try { e = g.etat(); } catch (x) { e = null; } }
      var d = e && ETATS[e];
      return !!(d && d.horloge === 'arretee');
    }
    function facteur(nomF) {
      if (cfg.k && nomF === 'k') return cfg.k();
      if (cfg.kJoueuse && nomF === 'kJoueuse') return cfg.kJoueuse();
      var fx = N.fx;
      if (fx && typeof fx[nomF] === 'function') {
        var v = +fx[nomF]();
        if (isFinite(v)) return v < 0 ? 0 : (v > 1 ? 1 : v);
      }
      return 1;
    }
    var hz = {
      H: H, PAS_MAX: PAS_MAX, BPM: BPM, TEMPS: TEMPS, MESURE: MESURE,
      image: function (dtReel) {
        if (!(dtReel > 0)) return 0;
        st.acc += dtReel;
        var n = Math.floor(st.acc / H + 1e-6);
        if (n > PAS_MAX) n = PAS_MAX;
        st.acc -= n * H;
        if (st.acc < 0) st.acc = 0;
        if (st.acc > PAS_MAX * H) st.acc = PAS_MAX * H;     /* l'arriéré ne dépasse jamais une image pleine */
        return n;
      },
      avancer: function () {
        st.pas++;
        if (global && N.ev) N.ev.nouveauPas();
        var t0 = st.t;
        st.reel += H;
        st.arretee = estArretee();
        if (st.arretee) { st.dtM = st.dtJ = 0; st.gele = false; }
        else {
          if (st.gel > H * 1e-3) { st.gel -= H; st.dtM = st.dtJ = 0; st.gele = true; }
          else { st.gel = 0; st.gele = false; st.dtM = H * facteur('k'); st.dtJ = H * facteur('kJoueuse'); }
        }
        st.t += st.dtM;
        var b0 = Math.floor(t0 / TEMPS + 1e-9), b1 = Math.floor(st.t / TEMPS + 1e-9);
        FR.temps = b1 > b0; FR.mesure = Math.floor(b1 / 4) > Math.floor(b0 / 4);
        return st.dtM;
      },
      geler: function (sec) { sec = +sec; if (sec > st.gel) st.gel = sec; },
      t: function () { return st.t; },
      dtMonde: function () { return st.dtM; },
      dtJoueuse: function () { return st.dtJ; },
      pas: function () { return st.pas; },
      reel: function () { return st.reel; },
      gele: function () { return st.gele || st.gel > H * 1e-3; },
      arretee: function () { return st.arretee; },
      resteGel: function () { return st.gel; },
      temps: function () {
        var nb = st.t / TEMPS + 1e-9, fb = Math.floor(nb);
        TPS.mesure = Math.floor(fb / 4); TPS.temps = fb - TPS.mesure * 4; TPS.phase = nb - fb; if (TPS.phase < 0) TPS.phase = 0;
        return TPS;
      },
      franchi: function () { return FR; },
      prochainTemps: function () { return (Math.floor(st.t / TEMPS + 1e-9) + 1) * TEMPS; },
      reset: function () { st.t = 0; st.pas = 0; st.reel = 0; st.acc = 0; st.gel = 0; st.dtM = st.dtJ = 0; st.gele = false; st.arretee = false; FR.temps = FR.mesure = false; },
      etat: function () { return { t: st.t, pas: st.pas, reel: st.reel, gel: st.gel, dtMonde: st.dtM, dtJoueuse: st.dtJ, gele: st.gele, arretee: st.arretee }; },
      creer: function (c) { return creerHorloge(c || {}); }
    };
    return hz;
  }
  N.horloge = creerHorloge({ global: true });

  /* ================================================================================================
     N.socle — ce qui lie le tout.
       N.socle.reset(graine, mode)  à appeler par N.game.reset en premier : re-sème les flux, remet
                                    l'horloge et le compteur d'identifiants à zéro, journalise 'partie'
       N.socle.signaler(ou, e)      compte une erreur dans __ERR comme la quarantaine de 90-boot.js
       N.socle.brancherJournal(bus, J)  inscrit les consommateurs 90 du journal sur un bus (tests)
       N.socle.copier(v)            copie sûre et sérialisable
       N.socle.geler(o)             gel profond
       N.socle.version              '1.0'
     ================================================================================================ */
  N.socle = {
    version: VERSION,
    reset: function (graine, mode) {
      graine = graine | 0;
      N.rng.reset(graine);
      N.horloge.reset();
      prochainId = 1;
      N.ev.nouveauPas();
      N.journal('partie', { graine: graine, mode: mode ? String(mode) : null });
    },
    signaler: signaler,
    brancherJournal: brancherJournal,
    copier: function (v) { return copier(v, 0); },
    geler: geler
  };
})();
