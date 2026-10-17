/* ===== 75-cartes.js — N.cartes : l'expérience, les niveaux, les mains de cartes, les modificateurs =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 8. La démo avait UNE carte (le tir surchargé du
   défi) ; le repli, ce sont les « cartes v0 » de REFONTE.md § 8.3 : trois cartes à texte fixe, tirées dans
   un ordre fixe parmi celles qu'on peut encore prendre (CANON, PUISSANCE, CROISSANCE, puis CADENCE,
   AIMANT, TRAVERSÉE…). Ce qui est déjà au contrat :
     xp(n)                l'énergie ramassée donne de l'expérience ; les seuils de N.R.xp.seuils (N.R.f.niveau)
                          font monter de niveau : événement 'niveau' {niveau, enAttente} ;
     niveauxEnAttente()   les montées pas encore choisies ;
     main(n, opts)        une main de n cartes (ids de N.ids.cartes) ;
     choisir(id)          applique la carte : N.cartes.mods (seul écrivain), les prises ; émet 'carte' ;
                          l'arme ou le pouvoir sont appliqués par leurs consommateurs (74-arsenal, 70-joueuse) ;
     prises(), texte(id)  les prises par carte ; le texte (v0 : fixe ; le lot 8 le calcule depuis N.R) ;
     mods                 au schéma de CONTRAT.md § 7.
   Consommateurs : ramassage (30 : XP), deblocage (30 : vivier, repli inerte). Flux de hasard : 'cartes'. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '75-cartes';

  var ORDRE = ['canon', 'puissance', 'croissance', 'cadence', 'aimant', 'traversee', 'reparation', 'bouclier', 'tourelles', 'braise'];
  /* textes fixes des cartes v0 (deux lignes de 19 caractères au plus) */
  var TEXTES = {
    canon: 'TIR PLUS FORT', tourelles: 'CANONS SUR LE CORPS', arc: 'ARCS ÉLECTRIQUES', missiles: 'MISSILES GUIDÉS',
    drones: 'DRONES EN ORBITE', minesQ: 'MINES DE QUEUE', puissance: 'DÉGÂTS +25 %', cadence: 'CADENCE +20 %',
    aimant: 'AIMANT PLUS LARGE', croissance: 'LONGUEUR +4', reparation: 'RÉPARE LE CORPS', bouclier: 'UN COUP ABSORBÉ',
    eperon: 'LA TÊTE PERCE', grappe: 'EXPLOSIONS EN CHAÎNE', sangFroid: 'GARDE LA CHAÎNE', braise: 'TRAÎNÉE BRÛLANTE',
    traversee: 'TRAVERSE TON CORPS', ralenti: 'RALENTIT LE MONDE', repli: 'CORPS ÉPAIS'
  };
  var mods = { degats: 1, cadence: 1, aimant: 28, lenMax: 40, reparation: 0, bouclier: 0, eperon: false, grappe: 0, sangFroid: false, braise: 0 };
  var PRISES = {}, XP = 0, NIVEAU = 0, ATTENTE = 0, MAIN = [];

  function RP() { return (N.R && N.R.passifs) || null; }
  function maxPrises(id) { var L = N.R && N.R.cartes && N.R.cartes.liste && N.R.cartes.liste[id]; return (L && L.prises) || 1; }
  function prenable(id) {
    if ((PRISES[id] | 0) >= maxPrises(id)) return false;
    if (N.ids.pouvoirs.indexOf(id) >= 0) { for (var k = 0; k < N.ids.pouvoirs.length; k++) if (PRISES[N.ids.pouvoirs[k]]) return false; }
    return true;
  }
  function remettre() {
    var m = (RP() && RP().mods) || {};
    mods.degats = m.degats || 1; mods.cadence = m.cadence || 1; mods.aimant = m.aimant || 28; mods.lenMax = m.lenMax || 40;
    mods.reparation = 0; mods.bouclier = 0; mods.eperon = false; mods.grappe = 0; mods.sangFroid = false; mods.braise = 0;
  }
  function appliquer(id) {
    var P = RP() || {}, n = PRISES[id] | 0;
    switch (id) {
      case 'puissance': mods.degats = 1 + ((P.puissance && P.puissance.parPrise) || 0.25) * n; break;
      case 'cadence': mods.cadence = 1 + ((P.cadence && P.cadence.parPrise) || 0.2) * n; break;
      case 'aimant': mods.aimant = (P.aimant && P.aimant.rayons[Math.min(n, 2)]) || 28; break;
      case 'croissance': mods.lenMax = ((P.mods && P.mods.lenMax) || 40) + ((P.croissance && P.croissance.lenMax) || 5) * n; break;
      case 'reparation': mods.reparation = Math.min(2, n); break;
      case 'bouclier': mods.bouclier = Math.min(1, n); break;
      case 'eperon': mods.eperon = true; break;
      case 'grappe': mods.grappe = Math.min(2, n); break;
      case 'sangFroid': mods.sangFroid = true; break;
      case 'braise': mods.braise = Math.min(2, n); break;
      default: break;
    }
  }

  function xp(n) {
    XP += +n || 0;
    var niv = (N.R && N.R.f && N.R.f.niveau) ? N.R.f.niveau(XP) : NIVEAU;
    while (NIVEAU < niv) { NIVEAU++; ATTENTE++; if (N.ev) N.ev.emit('niveau', { niveau: NIVEAU, enAttente: ATTENTE }); }
    return XP;
  }
  function main(n) {
    n = n | 0 || 3;
    MAIN.length = 0;
    for (var i = 0; i < ORDRE.length && MAIN.length < n; i++) if (prenable(ORDRE[i])) MAIN.push(ORDRE[i]);
    for (i = 0; i < N.ids.cartes.length && MAIN.length < n; i++) if (MAIN.indexOf(N.ids.cartes[i]) < 0 && prenable(N.ids.cartes[i])) MAIN.push(N.ids.cartes[i]);
    return MAIN;
  }
  function choisir(id) {
    if (N.ids.cartes.indexOf(id) < 0 || !prenable(id)) return false;
    PRISES[id] = (PRISES[id] | 0) + 1;
    appliquer(id);
    if (ATTENTE > 0) ATTENTE--;
    var niv = N.ids.armes.indexOf(id) >= 0 && N.arsenal ? N.arsenal.niveau(id) + 1 : PRISES[id];
    if (N.ev) N.ev.emit('carte', { id: id, niveau: niv });
    return true;
  }
  function abonner() {
    if (!N.ev) return;
    N.ev.on('ramassage', 30, function (c) {
      var B = N.R && N.R.butin;
      xp(c.type === 'noyau' ? ((B && B.noyau.xp) || 5) : c.type === 'cellule' ? ((B && B.cellule.xp) || 1) : 0);
    }, QUI);
    N.ev.on('deblocage', 30, function () { /* le vivier s'ouvre (lot 8) */ }, QUI);
  }

  N.cartes = {
    reset: function () {
      for (var k in PRISES) delete PRISES[k];
      PRISES.canon = 1;                                    // le CANON est tenu dès le départ (palier I)
      XP = 0; NIVEAU = 0; ATTENTE = 0; MAIN.length = 0;
      remettre();
      abonner();
    },
    xp: xp,
    niveauxEnAttente: function () { return ATTENTE; },
    main: main, choisir: choisir,
    prises: function () { return PRISES; },
    texte: function (id) { return TEXTES[id] || ''; },
    mods: mods
  };
})();
