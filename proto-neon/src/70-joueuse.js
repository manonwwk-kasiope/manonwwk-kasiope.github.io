/* ===== 70-joueuse.js — N.joueuse : le serpent (mouvement, corps, collisions, mort, coupe, réapparition) =====

   Tiré de 70-game.js (lot 0b) : la trace d'un point par pixel, le cap mémorisé, le virage borné, le dessin de
   la tête et des perles. CE QUI CHANGE par rapport à la démo, pour les retours n° 3 et 4 de la propriétaire
   (refonte/RETOURS-PROPRIETAIRE.md) :
     - le mur TUE (mur courant, grâce de 60 ms, REFONTE.md § 2.3) au lieu de laisser glisser ;
     - le corps ne tue pas et n'absorbe plus : un tir, un souffle ou la traînée COUPE le serpent au segment
       touché (`couper`) ; seule la tête tue ;
     - la tête a un rayon qui tue de 3 px (N.R.mort.rayonTete) ; la morsure compte à partir du segment 6 ;
     - se mordre COUPE le serpent au segment mordu (la queue tombe en cellules), sans tuer : la règle du snake
       (N.R.mort.morsure.effet = 'coupe' ; 'mort' rend l'ancienne règle).

   INTERFACE (§ 7.8) : reset(cfg), update(dt), draw(), drawTop(), tete {x,y,ang,vit}, segs(), len(), etat,
   hitTest(x,y,r), tuer(cause, src), couper(k, src), grandir(n), invul(), pouvoir, apogee, boost, traine().
   Ajouts de 79-jeu : reapparaitre(), desintegre(n), pointSur(), god(b).

   QUI APPELLE QUI. N.joueuse DEMANDE à N.ennemis (tirs, lasers, liste) de lui dire ce qu'ils touchent,
   mais ne les modifie que pour retirer le tir qui l'a frappée. Elle ÉMET `coup`, `coupe` et `mort` ;
   `ramassage` (grandir) et `kill` (APOGÉE) arrivent par N.ev, jamais par appel direct.
   Le pas est celui de la joueuse : N.horloge.dtJoueuse() quand 90-boot.js fait avancer l'horloge, sinon dt.
   Les chiffres viennent de N.R (joueuse, mort, longueur, vies) ; ce qui manque est dans CFG, marqué « → N.R ». */
N.joueuse = (function () {
  'use strict';
  var O = N.outils;
  var R = N.R;
  var CFG = {                                   // → N.R (valeurs de la démo, absentes de N.R)
    lenDepart: 8,
    anneauDuree: 0.30,                            // un anneau d'APOGÉE atteint son rayon en 0,30 s
    polyPas: 3,                                   // le polygone du LASSO garde un point sur 3 de la trace
    contactDevore: 3,                             // marge de contact (px) pour dévorer une proie
    repliDegats: 1.8, repliVitesse: 0.12,
    boostTau: 0.0389, boostTauRetour: 0.0217      // 95 % de la vitesse en 7 images ; retour en 4 images
  };
  var RAD = Math.PI / 180;
  var ESP = (R && R.longueur && R.longueur.espacement) || 5;
  var P = { x: 0, y: 0, ang: 0, vit: 0 };         // N.joueuse.tete : la même référence toute la partie
  var st = {
    etat: 'absent', target: 0, a0: 0, len: 8, rate: 1, invul: 0, grace: -1, pulse: -1, gone: 0,
    god: false, vitBase: 68, ready: 0, spawnT: 0, mortT: 0,
    /* accélération (§ 2.2) */
    res: 100, bOn: false, bk: 0, geste: false, pousseT: 0, veutPrev: false, susp: false, panne: false, bas: 0, sansBoost: 9, nouveau: false,
    /* pouvoirs (§ 2.10) */
    trav: 0, repli: 0, lenAvant: 0,
    /* APOGÉE (§ 2.11) */
    apo: 0, apoT: -1, apoN: 0, apoS: 0, rings: [],
    /* LASSO (§ 2.12) */
    lassoCd: 0, annonce: null, annonceCd: 0, lassoFx: null, lassos: 0,
    /* INVERSION (§ 2.17) */
    inv: null, inoff: 0,
    /* BOUCLIER et RÉPARATION (cartes de survie, N.R.passifs) : la charge du bouclier, sa recharge, l'éclat d'un
       coup absorbé ; les segments perdus (coupes, morts) que la RÉPARATION fait repousser un à un */
    bcl: 0, bclArme: false, bclRech: 0, bclFx: -1, perdu: 0, repT: 0, pvAttente: null
  };
  var clk = 0;                                   // horloge de la joueuse (somme des dt joueuse), pour l'âge de la traînée
  var PV = { id: 'traversee', etat: 'pret', reste: 0, dur: 0, recharge: 0 };   // N.joueuse.pouvoir (même référence)
  var S = null;
  var SEGS = [];                                 // positions à plat [x0, y0, x1, y1, ...], tête comprise
  var mediaReduit = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduit() { return !!(mediaReduit && mediaReduit.matches); }
  function critique() { return vivante() && st.len <= R.longueur.critique.seuil; }

  // Deux filets ouverts, attachés à la tête : ni projectile rond ni particule autonome.
  // Géométrie fixe même en mouvement réduit, aucune alternance d'encre.
  function drawBoost() {
    if (!N.joueuse.boost || !vivante()) return;
    var c = R.boost.trainee, dx = Math.cos(P.ang), dy = Math.sin(P.ang), g = N.gfx;
    for (var i = 0; i < c.branches; i++) {
      var signe = i ? 1 : -1;
      g.line(P.x - dx * c.recul - dy * c.demiLargeur * signe,
        P.y - dy * c.recul + dx * c.demiLargeur * signe,
        P.x - dx * (c.recul + c.longueur) - dy * c.demiLargeur * signe,
        P.y - dy * (c.recul + c.longueur) + dx * c.demiLargeur * signe, O.AMBRE);
    }
  }
  function drawCritique() {
    if (!critique()) return;
    var c = R.longueur.critique;
    var v = reduit() || (S.reglages && S.reglages.flashs === false) ? 0 : (1 - Math.cos(O.T.ak * c.hz * O.TAU)) / 2;
    // Une respiration par seconde, petite couronne cyan ; indépendante de la distance au mur.
    N.gfx.ring(P.x, P.y, c.rayon + Math.round(c.amplitude * v), O.CYANP, c.trameMin + (1 - c.trameMin) * v);
  }

  /* ============================ la trace : un point par pixel parcouru ============================ */
  var TN = 4096, TX = new Float32Array(TN), TY = new Float32Array(TN), TT = new Float64Array(TN), th = 0, tn = 0, tlx = 0, tly = 0;
  function tpush(x, y) { th = (th + 1) % TN; TX[th] = x; TY[th] = y; TT[th] = clk; if (tn < TN) tn++; tlx = x; tly = y; }
  function trailReset(x, y, a, len) {
    th = 0; tn = 0;
    var need = (len + 3) * ESP + 2, c = Math.cos(a), s = Math.sin(a), horloge = clk;
    clk = -1e6;                                                   // la trace de départ est « ancienne » : jamais allumée, jamais refermable
    for (var i = need; i >= 0; i--) tpush(x - c * i, y - s * i);
    clk = horloge;
  }
  function trailStep(x, y) {
    var dx = x - tlx, dy = y - tly, d = Math.sqrt(dx * dx + dy * dy), g = 0;
    while (d >= 1 && g++ < 400) { tpush(tlx + dx / d, tly + dy / d); dx = x - tlx; dy = y - tly; d = Math.sqrt(dx * dx + dy * dy); }
  }
  var SPX = 0, SPY = 0;
  function segAt(k) { var b = Math.round(k * ESP); if (b >= tn) b = tn - 1; var j = (th - b + TN) % TN; SPX = TX[j]; SPY = TY[j]; }
  function segs() {
    var n = st.len + 1, i = 0;
    SEGS.length = 0;
    for (var k = 0; k < n; k++) { segAt(k); SEGS[i++] = SPX; SEGS[i++] = SPY; }
    return SEGS;
  }

  /* ============================ réglages lus dans N.R ============================ */
  function vitesse() {
    var v = (R && R.joueuse && R.joueuse.vitesse) || {}, n = 1;
    if (N.dir && N.dir.vague) { var w = N.dir.vague(); n = (w && typeof w === 'object') ? (w.n | 0) : (w | 0); }
    var cle = n >= 1 && n <= 5 ? 'v' + n : 'v1';
    return v[cle] || 68;
  }
  function lenMax() { return (N.cartes && N.cartes.mods && N.cartes.mods.lenMax) || (R && R.longueur && R.longueur.max) || 40; }
  function rayonTete() { return (R && R.mort && R.mort.rayonTete) || 3; }

  /* ============================ remise à zéro ============================ */
  function reset(cfg) {
    S = N.S;
    O.geom();
    var A = O.A, cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2, portrait = O.geo.portrait;
    var a0 = portrait ? -Math.PI / 2 : 0;
    var at = cfg && typeof cfg.x === 'number';
    P.x = at ? cfg.x : (portrait ? cx : A.x0 + (A.x1 - A.x0) * 0.38);
    P.y = at ? cfg.y : (portrait ? A.y0 + (A.y1 - A.y0) * 0.62 : cy);
    P.ang = at && typeof cfg.ang === 'number' ? cfg.ang : a0;
    P.vit = vitesse();
    st.target = P.ang; st.a0 = a0; st.len = (cfg && cfg.len) || CFG.lenDepart; st.rate = 1; st.invul = 0; st.grace = -1; st.mordT = 0;
    st.bcl = 0; st.bclArme = false; st.bclRech = 0; st.bclFx = -1; st.perdu = 0; st.repT = 0; st.pvAttente = null;
    st.pulse = -1; st.gone = 0; st.etat = 'vivant'; st.ready = 0; st.vitBase = P.vit;
    annoncesMurs = {};
    clk = 0; trailReset(P.x, P.y, P.ang, 40);
    st.res = 100; st.bOn = false; st.bk = 0; st.geste = false; st.pousseT = 0; st.veutPrev = false; st.susp = false; st.panne = false; st.bas = 0;
    st.sansBoost = 9; st.nouveau = false; st.trav = 0; st.repli = 0; st.lenAvant = 0;
    st.apo = 0; st.apoT = -1; st.apoN = 0; st.rings.length = 0; st.lassoCd = 0; st.annonce = null; st.annonceCd = 0; st.lassoFx = null; st.lassos = 0;
    if (st.inv) finInversion(true);
    st.inv = null; st.inoff = 0;
    PV.id = 'traversee';                                           // chaque partie repart avec TRAVERSÉE ; les cartes de pouvoir l'échangent
    PV.etat = 'pret'; PV.reste = 0; PV.recharge = 0;
    N.joueuse.etat = 'vivant'; N.joueuse.boost = false; N.joueuse.apogee = 0; N.joueuse.degatsMul = 1;
    publier();
  }

  function publier() {
    if (!S) S = N.S;
    if (!S) return;
    var p = S.player;
    if (!p || p === N.joueuse.tete) p = S.player = {};
    p.x = P.x; p.y = P.y; p.ang = P.ang; p.angVise = st.target; p.vit = P.vit; p.len = st.len;
    N.joueuse.apogee = st.apo; p.segs = segs(); p.etat = st.etat; p.boost = st.bOn && !st.susp; p.reserve = st.res; p.apogee = st.apo; p.pouvoirPret = PV.etat === 'pret'; p.pouvoir = PV.id;
  }

  /* ============================ murs : distance, normale, alerte ============================ */
  var DM = { d: 0, nx: 1, ny: 0, pan: 'g', mobile: false };
  function distMur(x, y) {
    if (N.world && N.world.distMur) { var w = N.world.distMur(x, y); if (w) return w; }
    var A = O.A;
    DM.d = x - A.x0; DM.nx = 1; DM.ny = 0; DM.pan = 'g'; DM.mobile = false;
    if (A.x1 - x < DM.d) { DM.d = A.x1 - x; DM.nx = -1; DM.ny = 0; DM.pan = 'd'; }
    if (y - A.y0 < DM.d) { DM.d = y - A.y0; DM.nx = 0; DM.ny = 1; DM.pan = 'h'; }
    if (A.y1 - y < DM.d) { DM.d = A.y1 - y; DM.nx = 0; DM.ny = -1; DM.pan = 'b'; }
    return DM;
  }

  /* ============================ la source d'un coup : cause -> auteur ============================ */
  function auteurDe(src, ennemi) {
    if (!src) return 'mur';
    switch (src.genre) {
      case 'ennemi': return (ennemi && ennemi.partie === 'main') ? 'cyclope:main' : src.type;
      case 'arene': return src.type;
      case 'joueuse': return 'corps';
      case 'decor': return 'mur';
      default: return 'mur';
    }
  }
  function trouver(id) {
    var L = N.ennemis && N.ennemis.list;
    if (!L || id === undefined || id < 0) return null;
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    return null;
  }
  // Métadonnées de mort seulement : durée réellement observée dans S.tele.
  // Un total promis, ou une zone découverte déjà active, ne prouve aucune annonce préalable.
  var annoncesMurs = {};
  function observerAnnoncesMurs() {
    var zones = S && S.tele || [], groupes = {}, maintenant = N.horloge.t(), i, z, a;
    for (i = 0; i < zones.length; i++) {
      z = zones[i];
      if (!z.par || z.par.type !== 'murMobile') continue;
      a = groupes[z.id];
      if (!a || z.reste < a.reste) groupes[z.id] = z;
    }
    for (var id in annoncesMurs) if (!groupes[id]) delete annoncesMurs[id];
    for (id in groupes) {
      z = groupes[id]; a = annoncesMurs[id];
      if (!a || z.reste > a.reste) a = annoncesMurs[id] = { depuis: maintenant, annonce: z.reste > 0 };
      a.reste = z.reste;
    }
  }
  function annonceMurMortel() {
    var w = N.world, zones = S && S.tele || [], duree = 0;
    if (!w || !w.enMouvement()) return duree;
    var pan = distMur(P.x, P.y).pan;
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i], a = annoncesMurs[z.id];
      if (!z.par || z.par.type !== 'murMobile' || z.reste > 0 || !a || !a.annonce) continue;
      var bord = pan === 'g' ? z.x0 === w.x0 && z.x1 === w.x0
        : pan === 'd' ? z.x0 === w.x1 && z.x1 === w.x1
        : pan === 'h' ? z.y0 === w.y0 && z.y1 === w.y0 : z.y0 === w.y1 && z.y1 === w.y1;
      if (bord) duree = Math.max(duree, Math.min(z.total, Math.max(0, N.horloge.t() - a.depuis)));
    }
    return duree;
  }
  function infoSource(src) {
    var e = src && src.genre === 'ennemi' ? trouver(src.id) : null;
    return { vu: e ? (e.vuDepuis > 0 ? e.vuDepuis : 0) : 0, tele: src && src.genre === 'arene' && src.type === 'murMobile' ? annonceMurMortel() : e && e._teleTotal > 0 ? e._teleTotal : 0, e: e };
  }

  /* ============================ la mort ============================
     tuer() remplit S.death (schéma § 7.5), passe en 'mort' et émet `mort`. C'est 79-jeu.js qui séquence la
     suite (gel, ralenti, désintégration, réapparition ou fin) à partir de cet événement. */
  /* ============================ BOUCLIER et RÉPARATION ============================
     BOUCLIER (N.R.passifs.bouclier) : une charge qui absorbe UN coup — coupe du corps ou coup mortel à la tête —
     puis se recharge en 20 s. Le mur et la morsure ne s'absorbent pas : le mur tue toujours, se mordre est une
     faute de pilotage. Un coup absorbé émet `coup` avec absorbe: true, et donne 0,4 s de répit.
     RÉPARATION (N.R.passifs.reparation) : les segments perdus — coupes et moitié perdue à la mort — repoussent
     un à un, toutes les 6 s (4 s à la 2ᵉ prise). Sans perte, rien ne pousse : la carte rend ce qu'on t'a pris. */
  function mods() { return (N.cartes && N.cartes.mods) || {}; }
  function absorber(partie, k, cause, src, x, y) {
    if (!(mods().bouclier > 0) || st.bcl <= 0) return false;
    var I = infoSource(src);
    st.bcl = 0; st.bclRech = ((R && R.passifs && R.passifs.bouclier && R.passifs.bouclier.recharge) || 20);
    st.bclFx = 0; st.invul = Math.max(st.invul, 0.4);
    if (N.ev) N.ev.emit('coup', { partie: partie, k: k, cause: cause, auteur: auteurDe(src, I.e), auteurId: src && src.id >= 0 ? src.id : null,
      x: x, y: y, absorbe: true, visibleDepuis: I.vu, teleDuree: I.tele });
    O.sfx('verrou');
    texte(P.x, P.y - 10, 'BOUCLIER', O.CYANP);
    return true;
  }
  function survie(dt) {
    var m = mods();
    if (m.bouclier > 0) {
      if (!st.bclArme) { st.bclArme = true; st.bcl = 1; }                      // la carte prise : chargé tout de suite
      if (st.bcl <= 0 && (st.bclRech -= dt) <= 0) { st.bcl = 1; st.bclRech = 0; O.sfx('pouvoirPret'); }
    }
    if (st.bclFx >= 0 && (st.bclFx += dt) > 0.35) st.bclFx = -1;
    var n = Math.min(2, m.reparation | 0);
    if (n > 0 && st.perdu > 0 && st.len < lenMax()) {
      var per = (R && R.passifs && R.passifs.reparation && R.passifs.reparation.periodes) || [6, 4];
      if ((st.repT += dt) >= per[n - 1]) { st.repT = 0; st.perdu--; grandir(1); }
    } else st.repT = 0;
  }

  function tuer(cause, src) {
    if (!S) S = N.S;
    if (st.etat === 'mort' || st.god) return false;
    if ((st.invul > 0 || st.trav > 0) && cause !== 'mur' && cause !== 'morsure') return false;     // le mur et la morsure restent mortels
    if (cause !== 'mur' && cause !== 'morsure' && absorber('tete', 0, cause, src, P.x, P.y)) return false;
    var I = infoSource(src), vague = 0, quartier = 'docks';
    if (N.dir && N.dir.vague) { var w = N.dir.vague(); vague = (w && typeof w === 'object') ? (w.n | 0) : (w | 0); }
    var vs = R && R.secteurs && R.secteurs[0] && R.secteurs[0].vagues;
    if (vs && vs[Math.max(0, vague - 1)]) quartier = vs[Math.max(0, vague - 1)].quartier;
    if (N.decor && N.decor.quartier) quartier = N.decor.quartier() || quartier;
    var d = {
      cause: cause, auteur: auteurDe(src, I.e), auteurId: src && src.id >= 0 ? src.id : null,
      x: P.x, y: P.y, t: O.T.t, vague: vague, quartier: quartier, visibleDepuis: I.vu, teleDuree: I.tele
    };
    st.etat = 'mort'; N.joueuse.etat = 'mort'; st.mortT = 0; st.gone = 0; st.pulse = -1;
    st.bOn = false; st.bk = 0; st.geste = false; st.trav = 0; st.apoT = -1; st.rings.length = 0;
    if (st.repli > 0) { st.repli = 0; if (st.lenAvant) st.len = Math.max(st.len, st.lenAvant); }
    PV.etat = PV.etat === 'actif' ? 'recharge' : PV.etat; if (PV.etat === 'recharge' && PV.recharge <= 0) PV.recharge = pvConf().recharge;
    if (st.inv) finInversion(true);
    if (S) S.death = d;
    if (N.journal && N.journal.actif && S) { /* le journal « mort » est écrit par le consommateur 90 de 03-socle */ }
    if (N.ev) N.ev.emit('mort', d);
    publier();
    return true;
  }

  /* couper(k, src) : le serpent est coupé au segment k (k >= 1). Les segments détachés tombent en cellules
     d'énergie (une pour deux) qui expirent en 3 s ; `coup` puis `coupe` sont émis, la chaîne est divisée par
     deux par 77-score (rang 20). Le tir qui coupe disparaît (c'est l'appelant qui le retire). */
  function couper(k, src, cause) {
    if (st.etat !== 'vivant' && st.etat !== 'reapparition') return 0;
    if (st.trav > 0 || st.repli > 0) return 0;                    // TRAVERSÉE : rien ne coupe ; REPLI : le corps épais ne se coupe pas
    k = k | 0;
    var cm = (R && R.mort && R.mort.coupe) || { longueurMin: 3, segmentsParCellule: 2, expireCellules: 3 };
    if (k < 1 || k >= st.len) return 0;
    var I = infoSource(src), perdus, nouvelle = Math.max(cm.longueurMin, k), i, auteur = auteurDe(src, I.e);
    cause = cause || causeDe(src);
    if (N.cartes && N.cartes.repitActif && N.cartes.repitActif(cause)) return 0;
    perdus = st.len - nouvelle;
    if (perdus <= 0) return 0;
    segAt(k);
    var cx = SPX, cy = SPY;
    if (cause !== 'morsure' && absorber('corps', k, cause, src, cx, cy)) return 0;
    st.perdu += perdus;
    if (N.ev) N.ev.emit('coup', { partie: 'corps', k: k, cause: cause, auteur: auteur, auteurId: src && src.id >= 0 ? src.id : null,
      x: cx, y: cy, absorbe: false, visibleDepuis: I.vu, teleDuree: I.tele });
    st.len = nouvelle;                       // les cellules tombent par le consommateur de `coupe` de 71-butin (rang 40)
    if (N.cartes && N.cartes.apresCoupe) N.cartes.apresCoupe();
    if (N.ev) N.ev.emit('coupe', { k: k, perdus: perdus, cause: causeCoupe(cause), auteur: auteur, x: cx, y: cy });
    publier();
    return perdus;
  }
  function causeDe(src) {
    if (!src) return 'tir';
    if (src.genre === 'arene') return src.type === 'convoi' ? 'convoi' : 'mur';
    if (src.genre === 'decor') return 'mur';
    return 'tir';
  }
  function causeCoupe(c) { return N.ids.causesCoupe.indexOf(c) >= 0 ? c : 'tir'; }

  function grandir(n) {
    var m = lenMax();
    st.len = Math.min(m, st.len + (n | 0));
    st.pulse = 0;
  }

  /* ============================ ramassage : le butin allonge le serpent (rang 10) ============================ */
  if (N.ev) N.ev.on('ramassage', 10, function (c) {
    if (st.etat !== 'vivant' && st.etat !== 'reapparition') return;
    if (c.type === 'pastille') { inversionDebut(); return; }                 // la pastille ne fait pas grandir : elle renverse la chasse
    var seg = (R && R.butin && R.butin[c.type] && R.butin[c.type].segments);
    seg = seg === undefined ? (c.type === 'noyau' ? 2 : c.type === 'cellule' ? 1 : 0) : seg;
    if (c.type === 'cellule' && c.valeur > 1) seg *= (c.valeur | 0);          // une cellule fusionnée garde la valeur cumulée
    grandir(seg);
  }, '70-joueuse');
  /* APOGÉE (rang 35) : ce qui la charge arrive par N.ev, jamais par appel */
  if (N.ev) {
    N.ev.on('kill', 35, function (c) {
      var sr = c.src || {};
      if (sr.genre === 'decor' || c.boss) return;
      var ch = (R && R.apogee && R.apogee.charge) || { ordinaire: 2, elite: 12, devore: 2, lasso: 0 };
      if (sr.type === 'lasso') return;                                       // +3 par ennemi au consommateur `lasso`
      apogeeAdd(sr.type === 'devore' ? ch.devore : c.elite ? ch.elite : ch.ordinaire);
    }, '70-joueuse');
    N.ev.on('ramassage', 35, function (c) {
      if (c.type === 'noyau') apogeeAdd((R && R.apogee && R.apogee.charge && R.apogee.charge.noyau) || 20);
    }, '70-joueuse');
    N.ev.on('lasso', 35, function (c) {
      apogeeAdd(c.n * ((R && R.apogee && R.apogee.charge && R.apogee.charge.lasso) || 3));
    }, '70-joueuse');
  }

  /* la carte CROISSANCE (+5 segments) : N.cartes l'émet, la joueuse la prend (rang 10) */
  if (N.ev) N.ev.on('carte', 10, function (c) {
    if (c.id === 'croissance') grandir((R && R.longueur && R.longueur.parCroissance) || 5);
    /* une carte de pouvoir (RALENTI, REPLI…) remplace le pouvoir équipé ; s'il est actif, au prochain pas où il ne l'est plus */
    else if (N.ids.pouvoirs.indexOf(c.id) >= 0 && !equiper(c.id)) st.pvAttente = c.id;
  }, '70-joueuse');

  /* ============================ mise à jour ============================ */
  function update(dt) {
    if (!S) S = N.S;
    if (!S) return;
    observerAnnoncesMurs();
    dt = O.dtJ(dt);
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;
    if (st.etat === 'mort' || st.etat === 'absent') { st.mortT += dt; publier(); return; }
    var inp = S.input, jz = (R && R.joueuse) || {};
    var dz = jz.dz || 0.12, pleine = (jz.deflexion && jz.deflexion.pleine) || 0.7;
    var mag = inp ? inp.mag : 0;
    if (inp && mag > 0 && (inp.x || inp.y)) {
      st.target = Math.atan2(inp.y, inp.x);                       // mag 0 : on garde le cap (J-02)
      st.rate = O.clamp((mag - dz) / (pleine - dz), 0.18, 1);     // petite poussée : courbe large
    }
    clk += dt;
    entrees(dt, inp);                                              // accélération, pouvoir, APOGÉE (gestes du § 2.16, ACTIONS AUTO)
    var mul = 1 + (((R && R.boost && R.boost.facteur) || 1.6) - 1) * st.bk;
    if (st.repli > 0) mul *= 1 + CFG.repliVitesse;
    P.vit = vitesse() * mul;
    var V = P.vit, virage = V / (jz.rayonVirage || 11);           // le rayon de virage (11 px) ne grandit jamais avec la vitesse
    P.ang = O.turnTo(P.ang, st.target, virage * st.rate * dt);
    P.x += Math.cos(P.ang) * V * dt; P.y += Math.sin(P.ang) * V * dt;
    trailStep(P.x, P.y);
    if (st.invul > 0) { st.invul -= dt; if (st.invul <= 0) { st.invul = 0; if (st.etat === 'reapparition') { st.etat = 'vivant'; N.joueuse.etat = 'vivant'; } } }
    if (st.ready > 0) st.ready -= dt;
    if (st.pulse >= 0) { st.pulse += dt * 60; if (st.pulse > st.len + 4) st.pulse = -1; }
    if (st.inoff > 0) st.inoff -= dt;
    if (st.pvAttente && equiper(st.pvAttente)) st.pvAttente = null;
    pouvoirMaj(dt);
    apogeeMaj(dt);
    survie(dt);

    collisions(dt);
    if (st.etat !== 'mort') { lasso(dt); if (st.lassoFx) { st.lassoFx.t += dt; if (st.lassoFx.t > 0.5) st.lassoFx = null; } }
    publier();
  }

  /* ---- les huit causes de mort, toutes à la tête (§ 2.3) ---- */
  function collisions(dt) {
    var mort = (R && R.mort) || {}, rt = rayonTete(), i, k, d;
    /* 1. le mur : grâce de 60 ms pendant laquelle la tête est retenue sur la limite */
    var m = distMur(P.x, P.y);
    if (m.d < rt) {
      P.x += m.nx * (rt - m.d); P.y += m.ny * (rt - m.d);
      var cos = Math.cos(P.ang) * m.nx + Math.sin(P.ang) * m.ny;
      if (cos > ((mort.mur && mort.mur.cosInterieur) || 0.2)) st.grace = -1;
      else if (st.grace < 0) st.grace = (mort.mur && mort.mur.grace) || 0.06;
      else {
        st.grace -= dt;
        if (st.grace <= 0) { st.grace = -1; tuer('mur', { genre: m.mobile ? 'arene' : 'decor', type: m.mobile ? 'murMobile' : 'mur', id: -1 }); return; }
      }
    } else st.grace = -1;
    /* 2. la morsure : un segment d'indice 6 ou plus qui n'est pas l'un des trois derniers. Elle coupe la queue à
       partir du segment mordu ; puis 0,4 s sans nouvelle morsure, le temps que la tête sorte du corps. */
    var ms = mort.morsure || { segMin: 6, derniersFermant: 3, rayon: 5.5, effet: 'coupe', recharge: 0.4 };
    var kmax = st.len - ms.derniersFermant;
    if (st.mordT > 0) st.mordT -= dt;
    else for (k = ms.segMin; k < kmax; k++) {
      segAt(k);
      if (O.d2(P.x, P.y, SPX, SPY) < ms.rayon * ms.rayon) {
        if (ms.effet === 'mort') { tuer('morsure', { genre: 'joueuse', type: 'devore', id: -1 }); return; }
        if (couper(k, { genre: 'joueuse', type: 'devore', id: -1 }, 'morsure') > 0) st.mordT = ms.recharge || 0.4;
        break;
      }
    }
    var L = N.ennemis, protege = st.invul > 0 || st.trav > 0;
    if (!L) return;
    /* 3. les ennemis : rayon 3 + r × 0,8 ; ni en apparition ni sous invulnérabilité de réapparition */
    var fr = (mort.ennemi && mort.ennemi.facteurRayon) || 0.8, lst = L.list;
    for (i = 0; i < lst.length; i++) {
      var e = lst[i];
      if (e.etat === 'mort' || e.etat === 'portail' || e._st === 'naissance') continue;
      if (e._proie || e._inoff > 0) continue;                    // une proie ne blesse plus (§ 2.17) ; elle est dévorée par apres()
      var rr2 = rt + e.r * fr;
      if (!protege && O.d2(P.x, P.y, e.x, e.y) < rr2 * rr2) {
        if (N.arsenal && N.arsenal.percuter && N.arsenal.percuter(e)) {
          st.res = Math.max(0, st.res - R.passifs.eperon.cout);
          continue;
        }
        tuer('ennemi', { genre: 'ennemi', type: e.type, id: e.id }); return;
      }
    }
    /* 4. les tirs : la tête tue, le corps se coupe (et le tir disparaît) */
    var ts = L.tirs, rc = (mort.coupe && mort.coupe.rayonSegment) || 3.5;
    for (i = 0; i < ts.length; i++) {
      var b = ts[i];
      if (b._dead) continue;
      if (st.trav > 0) continue;                                // TRAVERSÉE : les tirs passent
      if (!protege && O.d2(P.x, P.y, b.x, b.y) < (rt + b.r) * (rt + b.r)) { b._dead = true; tuer('tir', b.src); return; }
      for (k = 1; k < st.len; k++) {
        segAt(k);
        if (O.d2(b.x, b.y, SPX, SPY) < (rc + b.r) * (rc + b.r)) {
          if (k <= 1) break;                                     // collé à la tête : c'est la tête qui compte
          b._dead = true; if (st.repli <= 0) couper(k, b.src, 'tir'); break;     // REPLI : le tir meurt sur le corps épais
        }
      }
    }
    /* 5. les lasers actifs croisent la tête */
    var lz = L.lasers;
    if (lz) for (i = 0; i < lz.length; i++) {
      var z = lz[i];
      if (z._dead || protege) continue;
      var hw = z.w / 2 + rt;
      if (O.segDist2(P.x, P.y, z.x0, z.y0, z.x1, z.y1) < hw * hw) { tuer('laser', z.src); return; }
    }
  }

  /* ============================ petits outils d'émission et de texte ============================ */
  function emit(nom, ch) { if (N.ev) N.ev.emit(nom, ch); }
  function texte(x, y, s, c) {
    if (N.hud && N.hud.pop) O.safe('hud.pop', function () { N.hud.pop(x, y, s, { c: c }); });
    else O.pop(x, y, s, c);
  }
  function vagueNum() {
    if (!N.dir || !N.dir.vague) return 1;
    var w = N.dir.vague();
    return (w && typeof w === 'object') ? (w.n | 0) : (w | 0);
  }
  function vivante() { return st.etat === 'vivant' || st.etat === 'reapparition'; }

  /* ============================ l'accélération (§ 2.2) ============================
     Deux déclencheurs : un second doigt tenu / Espace / clic gauche (`S.input.boost`, tenu par 90-boot) ou, au pouce,
     le manche poussé droit devant (course ≥ 0,85, cap visé à moins de 15° du cap réel) pendant 120 ms. Jamais en
     virage : au-delà de 30° d'écart elle se suspend (sans son, sans compter de bascule) et reprend sous 15°. */
  function majBoost(dt, inp) {
    var B = (R && R.boost) || { seuilCourse: 0.85, ecartDeg: 15, maintien: 0.12, coupureDeg: 30, repriseDeg: 15, conso: 35, recharge: 22,
      delaiRecharge: 0.4, panne: 2, reprise: 25, reappui: 10, basculesMax: 2 };
    var ecart = Math.abs(O.wrapA(st.target - P.ang));
    var stk = inp && inp.stick && inp.stick.active;
    var haut = stk && inp.mag >= (st.geste ? B.seuilCourse - 0.05 : B.seuilCourse);
    if (haut && (st.geste || ecart < B.ecartDeg * RAD)) { st.pousseT += dt; if (st.pousseT >= B.maintien) st.geste = true; }
    else { st.pousseT = 0; if (!haut) st.geste = false; }
    var veut = !!(inp && inp.boost) || st.geste;
    st.nouveau = veut && !st.veutPrev;
    st.veutPrev = veut;
    if (st.nouveau) { st.bas = 0; st.susp = false; }
    if (veut) { if (ecart > B.coupureDeg * RAD) st.susp = true; else if (ecart < B.repriseDeg * RAD) st.susp = false; }
    else { st.susp = false; st.bas = 0; }
    var veutOn = veut && !st.susp && vivante();
    if (st.bOn) {
      if (!veut || !vivante()) { st.bOn = false; emit('boost', { id: 'boost', evt: 'off' }); O.sfx('boostOff'); }
      else if (st.res < B.panne) { st.bOn = false; st.panne = true; st.bas++; emit('boost', { id: 'boost', evt: 'panne' }); O.sfx('boostPanne'); }
    } else if (veutOn) {
      var seuil = st.panne ? (st.nouveau ? B.reappui : B.reprise) : B.panne + 0.01;
      if (st.res >= seuil && (st.nouveau || !st.panne || st.bas < B.basculesMax)) {
        if (st.panne && !st.nouveau) st.bas++;
        st.bOn = true; st.panne = false; emit('boost', { id: 'boost', evt: 'on' }); O.sfx('boostOn');
      }
    }
    var actif = st.bOn && !st.susp;
    if (actif) { st.res = Math.max(0, st.res - B.conso * dt); st.sansBoost = 0; }
    else { st.sansBoost += dt; if (st.sansBoost >= B.delaiRecharge) st.res = Math.min(100, st.res + B.recharge * dt); }
    var cible = actif ? 1 : 0, tau = cible > st.bk ? CFG.boostTau : CFG.boostTauRetour;
    st.bk += (cible - st.bk) * (1 - Math.exp(-dt / tau));
    if (st.bk < 0.001 && !cible) st.bk = 0;
    N.joueuse.boost = actif;
  }

  /* ============================ les gestes du § 2.16 et ACTIONS AUTO ============================ */
  function entrees(dt, inp) {
    majBoost(dt, inp);
    if (!vivante()) return;
    var auto = S && S.reglages && S.reglages.actions === 'auto';
    if (inp && inp.pouvoir) pouvoirActiver();
    if (inp && inp.apogee) apogeeLancer();
    if (auto) {
      var L = N.ennemis, i, e, n = 0, vue = 0, V = O.VUE;
      if (L && PV.etat === 'pret') {
        var a = (R.score && R.score.auto) || { traversee: 0.25, repliEnnemis: 5, repliRayon: 60 };
        if (PV.id === 'traversee') {
          for (i = 0; i < L.tirs.length; i++) { var b = L.tirs[i]; if (!b._dead && O.d2(b.x, b.y, P.x, P.y) < Math.pow(a.traversee * 140 + 6, 2)) { pouvoirActiver(); break; } }
        } else if (PV.id === 'repli') {
          for (i = 0; i < L.list.length; i++) if (!L.list[i]._dead && O.d2(L.list[i].x, L.list[i].y, P.x, P.y) < a.repliRayon * a.repliRayon) n++;
          if (n >= a.repliEnnemis) pouvoirActiver();
        }
      }
      if (L && st.apo >= 100) {
        for (i = 0; i < L.list.length; i++) { e = L.list[i]; if (!e._dead && e.x >= V.x && e.x <= V.x + V.w && e.y >= V.y && e.y <= V.y + V.h) vue++; }
        if (vue >= ((R.score && R.score.auto && R.score.auto.apogeeEnnemis) || 8)) apogeeLancer();
      }
    }
  }

  /* ============================ les pouvoirs (§ 2.10) ============================ */
  function pvConf() { return (R && R.pouvoirs && R.pouvoirs[PV.id]) || { duree: 1.4, recharge: 12 }; }
  function equiper(id) {
    if (N.ids.pouvoirs.indexOf(id) < 0 || PV.etat === 'actif') return false;
    PV.id = id; PV.etat = 'pret'; PV.reste = 0; PV.recharge = 0;
    publier();                                                   // S.player.pouvoir suit tout de suite (les pilotes le lisent)
    return true;
  }
  function pouvoirActiver() {
    if (PV.etat !== 'pret' || !vivante()) return false;
    var c = pvConf();
    PV.etat = 'actif'; PV.reste = c.duree; PV.dur = c.duree;
    if (PV.id === 'traversee') st.trav = c.duree;
    else if (PV.id === 'ralenti') { if (N.fx && N.fx.ralenti) O.safe('fx.ralenti', function () { N.fx.ralenti(c.monde, c.duree, { joueuse: false, long: true }); }); }
    else if (PV.id === 'repli') {
      st.lenAvant = st.len; st.len = Math.max(c.longueurMin, Math.round(st.len * (1 - c.longueur))); st.repli = c.duree;
      N.joueuse.degatsMul = c.degats || CFG.repliDegats;
    }
    O.sfx(PV.id);
    emit('pouvoir', { id: PV.id, evt: 'debut' });
    return true;
  }
  function pouvoirMaj(dt) {
    if (PV.etat === 'actif') {
      PV.reste -= dt;
      if (st.trav > 0) st.trav = Math.max(0, st.trav - dt);
      if (st.repli > 0) st.repli = Math.max(0, st.repli - dt);
      if (PV.reste <= 0) {
        if (PV.id === 'repli' && st.lenAvant) { st.len = Math.min(lenMax(), Math.max(st.len, st.lenAvant)); st.lenAvant = 0; st.pulse = 0; }
        st.trav = 0; st.repli = 0; N.joueuse.degatsMul = 1;
        PV.etat = 'recharge'; PV.recharge = pvConf().recharge;
        emit('pouvoir', { id: PV.id, evt: 'fin' });
      }
    } else if (PV.etat === 'recharge') {
      PV.recharge -= dt;
      if (PV.recharge <= 0) { PV.etat = 'pret'; PV.recharge = 0; O.sfx('pouvoirPret'); emit('pouvoir', { id: PV.id, evt: 'pret' }); }
    }
  }

  /* ============================ l'APOGÉE (§ 2.11) ============================ */
  var SRC_APO = { genre: 'joueuse', type: 'apogee', id: -1 };
  function apogeeAdd(n) {
    if (st.apo >= 100 || !vivante()) return;
    st.apo = Math.min(100, st.apo + n); N.joueuse.apogee = st.apo;
    if (st.apo >= 100) { emit('apogee', { id: 'apogee', evt: 'pleine' }); O.sfx('ultimePret'); }
  }
  function apogeeLancer() {
    if (st.apo < 100 || !vivante() || st.apoT >= 0) return false;
    var A = R.apogee;
    st.apo = 0; N.joueuse.apogee = 0; st.apoT = 0; st.apoN = 0; st.apoS++; st.rings.length = 0;
    emit('apogee', { id: 'apogee', evt: 'debut' });
    O.sfx('ultime');
    if (N.fx && N.fx.ralenti) O.safe('fx.ralenti', function () { N.fx.ralenti(A.ralenti, A.ralentiDuree, { joueuse: false }); });
    O.hitstop(A.gelImages);
    return true;
  }
  function apogeeMaj(dt) {
    if (st.apoT < 0) return;
    var A = R.apogee.anneaux, E = N.ennemis, i, j, r;
    st.apoT += dt;
    while (st.apoN < A.nombre && st.apoT >= st.apoN * A.intervalle) { st.rings.push({ r: 0, R: A.rayons[st.apoN], bit: 1 << st.apoN }); st.apoN++; }
    var fini = st.apoN >= A.nombre;
    for (i = 0; i < st.rings.length; i++) {
      r = st.rings[i];
      if (r.r >= r.R) continue;
      fini = false;
      r.r = Math.min(r.R, r.r + r.R / CFG.anneauDuree * dt);
      if (!E) continue;
      E.effacerTirs(P.x, P.y, r.r);
      for (j = 0; j < E.list.length; j++) {
        var e = E.list[j];
        if (e._dead || e.etat === 'portail' || e._st === 'naissance') continue;
        if (e._apoS !== st.apoS) { e._apoS = st.apoS; e._apoM = 0; }
        if ((e._apoM & r.bit) || O.d2(e.x, e.y, P.x, P.y) > (r.r + e.r * 0.5) * (r.r + e.r * 0.5)) continue;
        if (e.boss && e._apoM) continue;                           // le CYCLOPE ne prend qu'un anneau par APOGÉE (≤ 6 % de la phase)
        e._apoM |= r.bit;
        E.hit(e, A.degats, SRC_APO);
      }
    }
    if (fini) { st.apoT = -1; st.rings.length = 0; emit('apogee', { id: 'apogee', evt: 'fin' }); }
  }

  /* ============================ le LASSO (§ 2.12) ============================
     La traînée est la trace elle-même, au-delà de la queue : un point y reste allumé T = 1,2 + 0,02 L secondes après
     le passage de la queue. La boucle se ferme quand la tête passe à 7 px d'un point de traînée d'au moins 0,15 s, ou
     à 5,5 px d'un des trois derniers segments : le polygone est le chemin de la tête jusqu'à ce point. */
  var LP = [];
  function backXY(b) { b = b | 0; if (b >= tn) b = tn - 1; if (b < 0) b = 0; var j = (th - b + TN) % TN; SPX = TX[j]; SPY = TY[j]; }
  function polyDe(bHit) {
    LP.length = 0;
    for (var b = 0; b < bHit; b += CFG.polyPas) { backXY(b); LP.push(SPX, SPY); }
    backXY(bHit); LP.push(SPX, SPY);
    return LP;
  }
  function aireDe(p) {
    var a = 0, n = p.length / 2, i, j;
    for (i = 0, j = n - 1; i < n; j = i++) a += (p[j * 2] + p[i * 2]) * (p[j * 2 + 1] - p[i * 2 + 1]);
    return Math.abs(a / 2);
  }
  function lasso(dt) {
    var la = R.lasso, bodyB = st.len * ESP, k, m, best = -1, bd = 1e12, annB = -1, annD = 1e12;
    st.lassoCd -= dt; st.annonceCd -= dt; st.annonce = null;
    if (!vivante() || tn < bodyB + 4) return;
    var T = R.f.traine(st.len, 0), r1 = la.fermetureTraine, r2 = la.fermetureQueue, an = la.annonce, dd;
    for (k = Math.max(3, st.len - la.derniers + 1); k <= st.len; k++) {         // la queue : les trois derniers segments ferment
      backXY(k * ESP); dd = O.d2(P.x, P.y, SPX, SPY);
      if (dd < r2 * r2 && dd < bd) { bd = dd; best = k * ESP; }
      if (dd < an * an && dd < annD) { annD = dd; annB = k * ESP; }
    }
    var mMax = tn - 1 - bodyB;
    for (m = 0; m < mMax; m++) {                                              // la traînée : des points déjà éteints en queue
      var age = clk - TT[(th - m + TN) % TN];
      if (age > T) break;
      if (age < la.ageMin) continue;
      backXY(bodyB + m); dd = O.d2(P.x, P.y, SPX, SPY);
      if (dd < r1 * r1 && dd < bd) { bd = dd; best = bodyB + m; }
      if (dd < an * an && dd < annD) { annD = dd; annB = bodyB + m; }
    }
    if (best >= 0 && st.lassoCd <= 0) {
      var p = polyDe(best), aire = aireDe(p);
      if (aire >= la.aireMin) { lassoFermer(p, aire); return; }
    }
    if (annB >= 0 && st.lassoCd <= 0) {
      var pa = polyDe(annB);
      if (aireDe(pa) >= la.aireMin) {
        backXY(annB); st.annonce = { x: SPX, y: SPY };
        if (st.annonceCd <= 0) { st.annonceCd = 0.35; O.sfx('fermable'); }
      }
    }
  }
  var SRC_LASSO = { genre: 'joueuse', type: 'lasso', id: -1 };
  function lassoFermer(p, aire) {
    var la = R.lasso, E = N.ennemis, dmg = R.f.degatsLasso(st.len, 0), i, cx = 0, cy = 0, nv = p.length / 2;
    st.lassoCd = la.intervalle; st.lassos++;
    var poly = p.slice();
    for (i = 0; i < nv; i++) { cx += poly[i * 2]; cy += poly[i * 2 + 1]; }
    cx /= nv; cy /= nv;
    var ids = [], n = 0;
    if (E) {
      var dedans = E.dans(poly);
      for (i = 0; i < dedans.length; i++) {
        var e = dedans[i];
        if (e.boss || e.etat === 'portail' || e._st === 'naissance') continue;           // l'œil du CYCLOPE : N.colosse (10 % de la phase, une fois)
        ids.push(e.id); n++;
        E.hit(e, (e.type === 'traqueur' || e.type === 'rival') ? 1e6 : dmg, SRC_LASSO);
      }
      for (i = 0; i < E.tirs.length; i++) {                                              // les tirs ennemis dedans sont effacés
        var b = E.tirs[i];
        if (!b._dead && pointDans(poly, b.x, b.y)) { b._dead = true; O.spark(b.x, b.y, O.ROSE, 2); }
      }
    }
    if (N.butin && N.butin.aspirer) N.butin.aspirer(poly);
    var gate = !(N.fx && N.fx.flashGate) || !!O.safe('fx.flashGate', function () { return N.fx.flashGate(aire); });
    st.lassoFx = { poly: poly, t: 0, plein: gate };
    O.sfx('lasso', { pitch: Math.min(n, 6) });
    if (n > 0) {                                                   // le gel d'image est celui de 79-scene (R.scene.lasso), sur l'événement
      emit('lasso', { n: n, ids: ids, aire: aire, x: cx, y: cy, poly: poly });
      texte(cx, cy - 6, 'LASSO ×' + n, O.JAUNE);
      if (n >= la.excellent) texte(cx, cy + 4, 'EXCELLENT', O.CYANP);
    }
  }
  function pointDans(poly, x, y) {
    var dedans = false, nv = poly.length / 2;
    for (var a = 0, b = nv - 1; a < nv; b = a++) {
      var xa = poly[a * 2], ya = poly[a * 2 + 1], xb = poly[b * 2], yb = poly[b * 2 + 1];
      if (((ya > y) !== (yb > y)) && (x < (xb - xa) * (y - ya) / (yb - ya) + xa)) dedans = !dedans;
    }
    return dedans;
  }

  /* ============================ l'INVERSION (§ 2.17) ============================
     La PASTILLE avalée renverse la chasse. Si 72-ennemis sait déjà jouer l'état `proie` (N.ennemis.inversionActive existe),
     il fuit et émet `inversion` lui-même ; sinon la joueuse fait le repli : état `proie`, fuite à 0,8 × sa vitesse, les
     tirs ennemis effacés, et `apres(dt)` (appelée après N.ennemis.update) les déplace et les dévore au contact. */
  function externe() { return !!(N.ennemis && typeof N.ennemis.inversionActive === 'function'); }
  function inversionDebut() {
    var iv = R.inversion, n = vagueNum(), dur = iv.duree[n] || iv.duree[5] || 4, E = N.ennemis;
    st.inv = { t: dur, dur: dur, rang: 0, tot: 0, k: -1 };
    if (E) {
      if (E.effacerTirs) E.effacerTirs(P.x, P.y, 1e4);
      if (E.inverser) E.inverser(dur);
      for (var i = 0; i < E.list.length; i++) {                  // les proies sont désignées tout de suite : plus aucun contact ne tue
        var e = E.list[i];
        if (e._dead || e.boss || e.elite || e.type === 'rival' || e.etat === 'portail' || e._st === 'naissance') continue;
        e._proie = true; e.etat = 'proie';
      }
    }
    if (!externe()) emit('inversion', { evt: 'debut', dur: dur });
    O.sfx('pastille');
    if (N.music) {
      if (N.music.couche) O.safe('music.couche', function () { N.music.couche('inversion', true); });
      if (N.music.cue) O.safe('music.cue', function () { N.music.cue('inversion'); });
    }
    if (N.hud && N.hud.banniere) O.safe('hud.banniere', function () { N.hud.banniere('INVERSION !', { c: O.JAUNE, duree: 1.2, clignote: true }); });
  }
  function finInversion(silencieux) {
    var E = N.ennemis, iv = R.inversion, i, e, fin = iv.finInoffensives || { rayon: 32, duree: 0.5 };
    if (E) for (i = 0; i < E.list.length; i++) {
      e = E.list[i];
      if (!e._proie) continue;
      e._proie = false; e._pxp = undefined;
      if (!silencieux && O.d2(e.x, e.y, P.x, P.y) < fin.rayon * fin.rayon) e._inoff = fin.duree;
    }
    st.inv = null;
    if (!externe()) emit('inversion', { evt: 'fin', dur: 0 });
    if (N.music && N.music.couche) O.safe('music.couche', function () { N.music.couche('inversion', false); });
  }
  function devore(e) {
    var iv = st.inv, d = R.inversion.devore, pts = e.type === 'traqueur' ? d.traqueur : R.f.devore(iv.rang), x = e.x, y = e.y, base = (R.score.base && R.score.base[e.type]) || 0;
    if (!N.ennemis.devorer(e)) return;
    iv.rang++; iv.tot++;
    grandir(d.segments);
    var sc = N.score;
    if (sc && sc.ajouter && !sc.devoreGere) {                       // 77-score compte base × mult sur `kill` : on complète jusqu'à la valeur fixe
      var comp = pts - base * (sc.mult ? sc.mult() : 1);
      if (comp > 0) sc.ajouter(comp, x, y);
    }
    O.sfx('devore', { pitch: Math.min(iv.rang - 1, 6) });
    O.spark(x, y, O.OS, 6);
    texte(x, y - 4, '+' + pts, O.JAUNE);
  }
  /* apres(dt) : après N.ennemis.update (79-jeu devrait l'appeler ; à défaut 71-butin.update, qui passe juste après). Une fois par image. */
  var aprK = -1;
  function apres(dt) {
    if (!S) S = N.S;
    var iv = st.inv, E = N.ennemis, i, e;
    if (!iv || !E || !vivante()) return;
    var pk = N.horloge && N.horloge.pas ? N.horloge.pas() : 0;      // un seul passage par pas, que 79-jeu ou 71-butin l'appelle
    if (pk > 0 && pk === aprK) return;
    aprK = pk;
    observerAnnoncesMurs();
    dt = O.dtJ(dt);
    if (!(dt > 0)) return;
    iv.t -= dt;
    var ext = externe(), vf = P.vit * R.inversion.fuite, A = O.A, rt = rayonTete(), fr = (R.mort.ennemi && R.mort.ennemi.facteurRayon) || 0.8;
    var clig = iv.t < R.inversion.clignoteFin.duree, kc = Math.floor(clk * R.inversion.clignoteFin.hz * 2);
    for (i = E.list.length - 1; i >= 0; i--) {
      e = E.list[i];
      if (e._dead || e.boss || e.elite || e.type === 'rival' || e.etat === 'portail' || e._st === 'naissance') continue;
      e._proie = true;
      if (!ext) {
        if (e._pxp !== undefined) { e.x = e._pxp; e.y = e._pyp; }
        var dx = e.x - P.x, dy = e.y - P.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        e.x = O.clamp(e.x + dx / d * vf * dt, A.x0 + e.r, A.x1 - e.r); e.y = O.clamp(e.y + dy / d * vf * dt, A.y0 + e.r, A.y1 - e.r);
        e._pxp = e.x; e._pyp = e.y; e.etat = 'proie'; e._stun = 0.08;
      }
      if (clig && iv.k !== kc) O.flash(e);
      var rr2 = rt + CFG.contactDevore + e.r * fr;
      if (O.d2(P.x, P.y, e.x, e.y) < rr2 * rr2) devore(e);
    }
    if (clig) iv.k = kc;
    if (iv.t <= 0) finInversion(false);
  }

  /* ============================ dessin du LASSO, de l'APOGÉE, de la jauge et du pouvoir ============================ */
  function remplir(poly, ci, k) {                                // balayage par rangées, tramage de Bayer
    var nv = poly.length / 2, y0 = 1e9, y1 = -1e9, i, j, y, xs = [], g = N.gfx;
    for (i = 0; i < nv; i++) { y0 = Math.min(y0, poly[i * 2 + 1]); y1 = Math.max(y1, poly[i * 2 + 1]); }
    for (y = Math.floor(y0); y <= y1; y++) {
      xs.length = 0;
      for (i = 0, j = nv - 1; i < nv; j = i++) {
        var ya = poly[j * 2 + 1], yb = poly[i * 2 + 1];
        if ((ya > y) !== (yb > y)) xs.push(poly[j * 2] + (y - ya) * (poly[i * 2] - poly[j * 2]) / (yb - ya));
      }
      xs.sort(function (a, b) { return a - b; });
      for (i = 0; i + 1 < xs.length; i += 2) for (var x = Math.ceil(xs[i]); x <= xs[i + 1]; x++) if (N.pal.dither(x, y, k)) g.px(x, y, ci);
    }
  }
  function drawTraine() {
    if (!vivante() || tn < st.len * ESP + 4) return;
    var T = R.f.traine(st.len, 0), bodyB = st.len * ESP, mMax = tn - 1 - bodyB, m, g = N.gfx;
    for (m = 0; m < mMax; m += 1) {
      var age = clk - TT[(th - m + TN) % TN];
      if (age > T) break;
      backXY(bodyB + m);
      if (N.pal.dither(Math.round(SPX), Math.round(SPY), 1 - age / T)) g.px(SPX, SPY, O.CYANP);
    }
    if (st.annonce && (Math.floor(O.T.ak * 8) & 1)) { g.px(st.annonce.x, st.annonce.y, O.OS); g.ring(st.annonce.x, st.annonce.y, 3, O.CYANP, 1); }
  }
  function drawLassoFx() {
    var f = st.lassoFx, g = N.gfx, nv, i;
    if (!f) return;
    nv = f.poly.length / 2;
    if (f.plein && f.t < 0.1) remplir(f.poly, f.t < 0.05 ? O.CYAN : O.OS, f.t < 0.05 ? 0.5 : 0.35);       // 3 images : tramage cyan puis os
    for (i = 0; i < nv; i++) { var j = (i + 1) % nv; g.line(f.poly[i * 2], f.poly[i * 2 + 1], f.poly[j * 2], f.poly[j * 2 + 1], f.t < 0.1 ? O.OS : O.CYANP); }
  }
  function drawJauge() {
    if (st.res >= 99.5 || !vivante()) return;
    var g = N.gfx, n = Math.round(st.res / 100 * 24), c = st.res < 20 ? O.BRASIER : O.AMBRE, a0 = P.ang + Math.PI * 0.75;
    for (var i = 0; i < n; i++) { var a = a0 + (i / 24) * (Math.PI * 1.5); g.px(P.x + Math.cos(a) * 9, P.y + Math.sin(a) * 9, c); }
  }
  function drawPouvoir() {
    if (!vivante()) return;
    var g = N.gfx, a = O.T.ak * 4;
    if (PV.etat === 'pret') g.px(P.x + Math.cos(a) * 8, P.y + Math.sin(a) * 8, O.CYANP);
    if (st.apo >= 100) for (var i = 0; i < 8; i++) { var b = i / 8 * O.TAU + O.T.ak * 2; g.px(P.x + Math.cos(b) * 12, P.y + Math.sin(b) * 12, O.JAUNE); }
    var E = N.ennemis;
    if (E && st.inv) for (var q = 0; q < E.list.length; q++) {                       // les proies : contour rose pâle qui bat
      var e = E.list[q];
      if (e._proie && !e._dead) g.ring(e.x, e.y, e.r + 2, O.ROSE, (Math.floor(O.T.ak * 6) & 1) ? 1 : 0.6);
    }
    for (var k = 0; k < st.rings.length; k++) { var r = st.rings[k]; g.ring(P.x, P.y, r.r, k & 1 ? O.OS : O.JAUNE, Math.max(0.25, 1 - r.r / r.R * 0.7)); }
  }

  /* ============================ interrogation : qu'est-ce qui touche ce disque ? ============================ */
  function hitTest(x, y, r) {
    r = r || 0;
    var rt = rayonTete() + r;
    if (O.d2(x, y, P.x, P.y) < rt * rt) return { part: 'tete', k: 0 };
    var rc = 3.5 + r;
    for (var k = 1; k < st.len; k++) {
      segAt(k);
      if (O.d2(x, y, SPX, SPY) < rc * rc) return { part: k >= st.len - 3 ? 'queue' : 'corps', k: k };
    }
    return { part: null, k: -1 };
  }

  /* ============================ réapparition (appelée par 79-jeu après la séquence de mort) ============================
     Où : le point sûr parmi 16 candidats de la vue, à 40 px au moins des murs, le plus loin des ennemis, des tirs
     et des lasers. Cap vers le centre. Longueur max(8, ⌈L / 2⌉). Invulnérabilité de 1,0 s (ennemis et tirs). */
  function pointSur() {
    var ru = (R && R.vies && R.vies.reapparition) || { candidats: 16, margeMurs: 40 }, A = O.A, V = O.VUE;
    var x0 = Math.max(A.x0, V.x) + ru.margeMurs, x1 = Math.min(A.x1, V.x + V.w) - ru.margeMurs;
    var y0 = Math.max(A.y0, V.y) + ru.margeMurs, y1 = Math.min(A.y1, V.y + V.h) - ru.margeMurs;
    if (x1 < x0) { x0 = x1 = (A.x0 + A.x1) / 2; }
    if (y1 < y0) { y0 = y1 = (A.y0 + A.y1) / 2; }
    var best = null, bd = -1, n = ru.candidats | 0 || 16, i, j, rows = 4, cols = Math.max(1, Math.ceil(n / rows));
    for (i = 0; i < n; i++) {
      var cx = x0 + (x1 - x0) * (((i % cols) + 0.5) / cols), cy = y0 + (y1 - y0) * ((((i / cols) | 0) + 0.5) / rows);
      var dmin = 1e9, L = N.ennemis;
      if (L) {
        for (j = 0; j < L.list.length; j++) { if (L.list[j].etat === 'mort') continue; dmin = Math.min(dmin, Math.sqrt(O.d2(cx, cy, L.list[j].x, L.list[j].y)) - L.list[j].r); }
        for (j = 0; j < L.tirs.length; j++) dmin = Math.min(dmin, Math.sqrt(O.d2(cx, cy, L.tirs[j].x, L.tirs[j].y)));
        if (L.lasers) for (j = 0; j < L.lasers.length; j++) dmin = Math.min(dmin, Math.sqrt(O.segDist2(cx, cy, L.lasers[j].x0, L.lasers[j].y0, L.lasers[j].x1, L.lasers[j].y1)));
      }
      if (dmin > bd) { bd = dmin; best = { x: cx, y: cy }; }
    }
    return best || { x: (A.x0 + A.x1) / 2, y: (A.y0 + A.y1) / 2 };
  }
  function reapparaitre(pos) {
    var ru = (R && R.vies && R.vies.reapparition) || { longueurMin: 8, longueurPart: 0.5, invul: 1.0, effaceTirs: 40, figeRayon: 48, figeDuree: 0.4 };
    var A = O.A, p = pos || pointSur();
    P.x = p.x; P.y = p.y;
    P.ang = Math.atan2((A.y0 + A.y1) / 2 - P.y, (A.x0 + A.x1) / 2 - P.x); st.target = P.ang; st.rate = 1;
    var lenAvant = st.len;
    st.len = Math.max(ru.longueurMin, Math.ceil(st.len * ru.longueurPart));
    st.perdu += Math.max(0, lenAvant - st.len);                 // la RÉPARATION fera repousser ce que la mort a pris
    st.bclFx = -1;
    st.invul = ru.invul; st.etat = 'reapparition'; N.joueuse.etat = 'reapparition'; st.gone = 0; st.pulse = -1; st.grace = -1; st.ready = (ru.ready || 0.6);
    trailReset(P.x, P.y, P.ang, 40);
    /* ce qu'on dégage : tirs à moins de 40 px effacés, ennemis à moins de 48 px figés 0,4 s */
    var L = N.ennemis;
    if (L) {
      if (L.effacerTirs) L.effacerTirs(P.x, P.y, ru.effaceTirs);
      for (var i = 0; i < L.list.length; i++) {
        var e = L.list[i];
        if (e.boss) continue;
        if (O.d2(e.x, e.y, P.x, P.y) < ru.figeRayon * ru.figeRayon) e._stun = ru.figeDuree;
      }
    }
    publier();
  }
  /* la désintégration de la mort : n segments de plus, de la queue vers la tête (§ 5.4, version simple) */
  function desintegre(n) {
    var tot = st.len + 1;
    while (st.gone < n && st.gone < tot) {
      var k = st.len - st.gone;
      segAt(k);
      O.debris(SPX, SPY, st.gone % 3 ? O.CYAN : O.CYANP, 3);
      if (st.gone % 7 === 3) O.boom(SPX, SPY, 0.2, O.CYAN);
      st.gone++;
    }
    return st.gone >= tot;
  }

  /* ============================ dessin ============================ */
  function draw() {                                // le serpent se dessine dans drawTop (§ 7.7) ; ici la traînée du LASSO et son remplissage
    if (!S) S = N.S;
    if (!S || st.etat === 'absent') return;
    drawTraine();
    drawLassoFx();
  }
  function drawTop() {
    if (!S) S = N.S;
    if (!S || st.etat === 'absent') return;
    var ak = O.T.ak, f = Math.floor(ak * 8), k, sp = O.sp, put = O.put, putInk = O.putInk;
    var mort = st.etat === 'mort';
    if (mort) {
      /* la séquence de mort : la tête en os, les perles qui restent, la désintégration de la queue vers la tête */
      for (k = st.len - st.gone; k >= 1; k--) { segAt(k); put(sp(k > st.len - 3 ? 'corps:5' : 'corps', f + k), SPX, SPY); }
      if (st.gone <= st.len) putInk(sp('tete:' + O.dir16(P.ang), 0), P.x, P.y, O.OS);
      return;
    }
    var blink = (st.invul > 0 && (Math.floor(ak * 4 * 2) & 1)) || st.trav > 0;
    for (k = st.len; k >= 1; k--) {
      if (blink && k > 2 && (k & 1)) continue;
      segAt(k);
      var q = st.len - k, nm = q < 1 ? 'corps:3' : q < 2 ? 'corps:5' : q < 4 ? 'corps:7' : 'corps';
      var s = sp(nm, f + k);
      if (st.pulse >= 0 && Math.abs(k - st.pulse) < 2) putInk(s, SPX, SPY, O.CYANP); else put(s, SPX, SPY);
      if (st.repli > 0) N.gfx.ring(SPX, SPY, 5, O.CYAN, 1);                       // REPLI : les perles épaisses
    }
    drawJauge(); drawPouvoir();
    drawBoost();
    put(sp('tete:' + O.dir16(P.ang), Math.floor(ak * 5)), P.x, P.y);
    drawCritique();
    /* le BOUCLIER chargé : un anneau pâle qui respire autour de la tête ; un coup absorbé : l'anneau éclate */
    if (st.bcl > 0) N.gfx.ring(P.x, P.y, 7 + (Math.floor(ak * 3) & 1), O.CYANP, 1);
    if (st.bclFx >= 0) N.gfx.ring(P.x, P.y, Math.round(8 + st.bclFx * 40), (Math.floor(st.bclFx * 20) & 1) ? O.CYANP : O.OS, 1);
    /* le cap visé, quand il diffère du cap réel de plus de 20° (J-33) */
    var d = O.wrapA(st.target - P.ang), ch = (R && R.joueuse && R.joueuse.chevron && R.joueuse.chevron.ecartDeg) || 20;
    if (Math.abs(d) > ch * Math.PI / 180) put(sp('chevron:' + O.dir16(st.target), 0), P.x + Math.cos(st.target) * 11, P.y + Math.sin(st.target) * 11);
  }

  return {
    reset: reset, update: update, draw: draw, drawTop: drawTop,
    tete: P, segs: segs, len: function () { return st.len; }, etat: 'absent',
    hitTest: hitTest, tuer: tuer, couper: couper, grandir: grandir,
    invul: function () { return st.invul > 0; }, critique: critique,
    pouvoir: PV, apogee: 0, boost: false, degatsMul: 1, traine: function () { return st.etat === 'vivant' || st.etat === 'reapparition'; },
    equiper: equiper, apres: apres, reserve: function () { return st.res; }, lassos: function () { return st.lassos; },
    inversion: function () { return st.inv ? { actif: true, t: st.inv.t, dur: st.inv.dur, devores: st.inv.tot } : { actif: false, t: 0, dur: 0, devores: 0 }; },
    apogeeAjouter: apogeeAdd, apogeeLancer: apogeeLancer, pouvoirActiver: pouvoirActiver, inversionDebut: inversionDebut,
    reapparaitre: reapparaitre, desintegre: desintegre, pointSur: pointSur,
    god: function (b) { if (b !== undefined) st.god = !!b; return st.god; },
    cap: function () { return st.target; },
    pret: function () { return st.ready; },
    distMur: distMur,
    segPos: function (k) { segAt(k); return { x: SPX, y: SPY }; },
    /* pour 79-jeu : rotation d'une fenêtre (repli, arène de l'écran) et réglage du cap en essai */
    force: function (o) {
      if (!o) return;
      if (typeof o.x === 'number') P.x = o.x; if (typeof o.y === 'number') P.y = o.y;
      if (typeof o.ang === 'number') { P.ang = o.ang; st.target = o.ang; }
      if (typeof o.len === 'number') st.len = o.len | 0;
      if (o.trace) trailReset(P.x, P.y, P.ang, 40);
    },
    clampRepli: function () {
      var A = O.A;
      P.x = O.clamp(P.x, A.x0 + 1, A.x1 - 1); P.y = O.clamp(P.y, A.y0 + 1, A.y1 - 1);
      trailStep(P.x, P.y);
    }
  };
})();
