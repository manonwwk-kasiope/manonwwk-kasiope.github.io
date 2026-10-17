/* ===== 73-arene.js — N.arene : le plateau qui voyage, les convois, le sillage (lot D-vagues) =====

   REFONTE.md § 4.6 (le texte fait loi), § 3.8 (apparitions justes), § 7.8 (interface), § 2.3 (mort).

   LE TRAVELLING (V2, V3, V5). L'arène devient une fenêtre de 576 × 512 px qui traverse le monde. Ce module CHOISIT la place
   (la tête reste à 80 px au moins des murs, la fenêtre part du côté où il reste le plus de monde), ANNONCE (2 s avant le
   départ : chevrons qui battent sur le mur arrière, son `travelling`, bannière « LE PLATEAU AVANCE »), puis pilote N.world
   (travelling, stop, arena). Le monde fait la mise en place (3 s) et l'avance ; les murs courants sont lus dans N.world.
   Le mur arrière : la tête qu'il touche est tuée par la joueuse (distMur) ; ICI on coupe le corps qui traîne derrière lui
   (`couper`, cause `mur`), on tue sans score ni butin les ennemis qu'il dépasse (source decor/mur), on expire le butin et on
   efface les tirs ennemis qui passent derrière. Son pan s'allume quand la tête ou un segment est à moins de 24 px.
   Les murs qui glissent pendant la mise en place (3 s) et le retour (2 s) suivent les mêmes règles tant qu'ils avancent.

   LES CONVOIS (V4, V5). Cinq voies horizontales (ordonnées de N.R.arene.convois.voies), jamais deux fois de suite la même,
   jamais deux convois à la fois, aucune annonce dans les 3 s qui suivent la bannière d'une élite (`pic`, retenu à l'instant
   où le directeur nous prévient). Annonce 1,5 s avant : voie hachurée de magenta tramé à 25 %, cône de phares tramé qui
   avance depuis le bord d'arrivée, chevron au bord de la vue, klaxon `convoi` panoramisé, événements `arene` (convoiAnnonce)
   et `arme` (forme voie). Le convoi : 6 wagons de 18 × 14 px à 240 px/s. Il tue la tête (`tuer('convoi')`, sauf
   invulnérabilité de réapparition), coupe le corps (`couper(k, …, 'convoi')`, au plus près de la tête, ce qui rend la
   coupe idempotente) et broie les ennemis (jamais un boss) : « BROYÉ ×n ».
   CHOIX DE LA SOURCE DU BROYAGE : {genre:'arene', type:'convoi', id:-1}. 77-score ne retient hors score que la purge
   (decor/purge) et 71-butin que le genre `decor` : la chaîne, le score et le butin comptent donc comme une destruction de la
   joueuse, et l'attribution reste lisible dans les statistiques (une source joueuse/devore ferait croire à une morsure).

   LE SILLAGE. sillage(x, y) : vrai si le point est dans la voie d'un convoi en passage, derrière le dernier wagon, à moins
   de 40 px. Tant que la tête y est : × 1,4 gratuit, sans toucher à la réserve, et les ennemis broyés comptent double.
   N.joueuse n'offre AUCUN point d'accroche (pas de multiplicateur de vitesse) : demande écrite dans demandes.md ; en
   attendant, on pousse la tête de (facteur − 1) × vitesse × dt le long de son cap quand c'est sûr (l'arrivée reste à plus
   de 8 px des murs), la trace de la joueuse rattrape le déplacement au pas suivant. Le « compte double » est servi par
   N.score.ajouter(base × mult) en plus de l'écriture normale du `kill` (si N.score.ajouter n'existe pas : laissé simple).

   INTERFACE (§ 7.8) : reset(), update(dt), draw(), travelling(vx, depuis), convois(cfg), voies() -> [], sillage(x, y) -> bool,
   actif().  Ajouts : entree(vague) / pic() / nettoyee() (le directeur 76-directeur les APPELLE : aucun écouteur `vague`
   ici, le contrat n'en prévoit pas pour ce module), murArriere() -> {x, sens, actif} | null (pour les apparitions, § 3.8),
   etat() (instantané pour les tests).
     travelling(vx, depuis) : vx signé (le signe choisit le sens), absent -> sens et vitesse automatiques ; depuis = abscisse
        du bord gauche de départ. Même séquence que dans une vague (mise en place, annonce, départ).
     convois(cfg) : { voie: 0..4, sens: ±1 } lance un convoi tout de suite avec son annonce ; { t, periode, alea } programme
        la suite (chronomètre de vague). -> true si lancé.

   ÉMET (seul émetteur) `arene` { evt: travellingAnnonce | travelling | convoiAnnonce | convoiPasse | fin, voie, vx }
   (voie 0..4 pour un convoi, −1 pour le plateau ; vx signé) et `arme` { id, type:'convoi', forme:'voie', total:1.5,
   cible:'tout', shown:true, rallonge:false } à l'annonce d'un convoi.
   CONSOMME : aucun événement. Il est appelé par 76-directeur (entree, pic, nettoyee) et par 79-jeu (reset, update).
   Il LIT : N.world (travelling, arena, stop, enMouvement, mursAnnonces, x0…y1), N.outils (A, VUE, T, sp, put, mk, hasard
   du flux 'arene'), N.joueuse (tete, segs, etat, couper, tuer, invul, distMur), N.ennemis (list, tirs, hit), N.butin.list,
   N.score (ajouter, mult), N.hud (banniere, tag, pop), N.cam.jolt, N.dir.info (repli de entree()).
   IL ÉCRIT : N.S.monde (schéma `monde`), créé s'il manque ; N.S.voies (schéma `voie`, la voie du convoi), à chaque pas de jeu.
   IL DEMANDE aux autres (demandes.md) : 70-joueuse.js, un multiplicateur de vitesse externe (le sillage) ;
   76-directeur / 72-ennemis, de naître devant le mur arrière en lisant murArriere() (§ 3.8).
   REPLIS : sans N.world, le travelling est ignoré (les convois fonctionnent sur O.A) ; sans N.dir.info ni argument,
   entree() ne programme rien ; sans N.hud.banniere, la bannière devient un tag, puis rien ; sans N.score.ajouter, le
   sillage ne double pas le score ; sans N.spr, les chevrons et la bannière passent par les replis de N.outils.
   Chiffres : N.R.arene ; ce qui manque est dans CFG, marqué « → N.R ». Zéro Math.random (flux 'arene'), zéro Date.now,
   aucune couleur littérale (palette par N.outils), aucune allocation par image dans les boucles chaudes. */
N.arene = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var RA = (R && R.arene) || {}, RT = RA.travelling || {}, RC = RA.convois || {}, RS = RC.sillage || {};
  var CFG = {
    largeur: RT.largeur || 576, miseEnPlace: RT.miseEnPlace || 3, marge: RT.marge || 80, annonceTrav: RT.annonce || 2,
    vitesses: RT.vitesses || { 2: 8, 3: 12, 5: 14 }, alerte: RT.alerte || 24, retour: RT.retour || 2,
    voies: RC.voies || [64, 160, 256, 352, 448], hauteurVoie: RC.hauteurVoie || 20, annonceConvoi: RC.annonce || 1.5,
    hachure: RC.hachure || 0.25, silenceElite: RC.silenceApresElite || 3, wagons: RC.wagons || 6,
    wagon: RC.wagon || [18, 14], vitesse: RC.vitesse || 240, museauHz: Math.min(RC.museauHzMax || 3, 2.5),
    sillageDistance: RS.distance || 40, sillageFacteur: RS.facteur || 1.4,
    jolt: RC.joltPassage || 2,
    ecartWagons: 2,                     // → N.R : espace entre deux wagons, en px
    margeFin: 4,                        // → N.R : le convoi est fini quand son dernier wagon a quitté l'arène de 4 px
    coupeSegMin: 2,                     // → N.R : un segment collé à la tête (k < 2) est l'affaire de la tête
    murSur: 8,                          // → N.R : le sillage ne pousse jamais la tête à moins de 8 px d'un mur
    avantFin: 4,                        // → N.R : plus d'annonce de convoi dans les 4 dernières secondes d'une vague
    v4: RC.v4 || { debut: 8, periode: 9, alea: 2 }, v5: RC.v5 || { debut: 12, periode: 14, alea: 0 }
  };
  var SRC_CV = { genre: 'arene', type: 'convoi', id: -1 };
  var SRC_MUR = { genre: 'arene', type: 'murMobile', id: -1 };
  var SRC_DEC = { genre: 'decor', type: 'mur', id: -1 };

  /* ---- l'état ---- */
  var vagueOn = false, tw = 0, duree = 45, nVague = 0, tvAt = -1, tvVx = 0, tvDone = false, eliteT = -99;
  var touche = false;          // ce module a déplacé les murs : il doit les rendre
  var tv = { ph: 'off', t: 0, vx: 0, depuis: 0, ann: false, appele: false, annAt: 0, callAt: 0, departAt: 0 };   // ph : off | mise | marche | arret
  var CV = { ph: 'off', voie: 0, cy: 0, sens: 1, t: 0, xf: 0, bx0: 0, bx1: 0, broyes: 0, tag: false };           // ph : off | annonce | passage
  var cv = { next: -1, periode: 9, alea: 2, derniere: -1 };
  var dtc = 0, frame = 0, inWake = false, panD = 99;
  var QS = null, QN = -1;
  var OUT_MUR = { x: 0, y0: 0, y1: 0, sens: 0, actif: false };

  /* ---- petits outils gardés ---- */
  function mondeW() { var w = N.world; return (w && w.W) || 1024; }
  function mondeH() { var w = N.world; return (w && w.H) || 512; }
  function monde() { var w = N.world; return (w && typeof w.arena === 'function' && typeof w.travelling === 'function') ? w : null; }
  function vivante() { var J = N.joueuse, e = J && J.etat; return e === 'vivant' || e === 'reapparition'; }
  function qsegs() { if (QN !== frame) { QS = N.joueuse.segs(); QN = frame; } return QS; }
  function emitArene(evt, voie, vx) { if (N.ev) N.ev.emit('arene', { evt: evt, voie: voie | 0, vx: +vx || 0 }); }
  function vitesseVague(n) { return (CFG.vitesses && CFG.vitesses[n]) || 12; }

  /* ============================ le TRAVELLING ============================ */
  /* place la fenêtre : contient la tête (et sa position dans 1,5 s) avec la marge, part du côté qui a le plus de monde */
  function choisirPlace(vxAbs, sensForce) {
    var Wd = mondeW(), L = CFG.largeur, P = N.joueuse && N.joueuse.tete, x = P ? P.x : Wd / 2;
    var sens = sensForce || ((Wd - x) > x ? 1 : -1);
    var xp = P ? x + Math.cos(P.ang) * (P.vit || 68) * (CFG.miseEnPlace / 2) : x;
    var lo = Math.max(x, xp) + CFG.marge - L, hi = Math.min(x, xp) - CFG.marge;
    var d = sens > 0 ? x - 200 : x - L + 200;
    if (lo <= hi) d = O.clamp(d, lo, hi); else d = (x + xp) / 2 - L / 2;
    tv.depuis = O.clamp(d, 0, Wd - L);
    tv.vx = sens * vxAbs;
  }
  function lancerTrav(vxAbs, depuis, sensForce) {
    var w = monde();
    if (!w || (tv.ph !== 'off' && tv.ph !== 'arret')) return false;
    choisirPlace(vxAbs || 12, sensForce);
    if (typeof depuis === 'number') tv.depuis = O.clamp(depuis, 0, mondeW() - CFG.largeur);
    tv.ph = 'mise'; tv.t = 0; tv.ann = false; tv.appele = false;
    var deja = Math.abs((w.x1 - w.x0) - CFG.largeur) < 1 && Math.abs(w.x0 - tv.depuis) < 1 && w.y0 <= 0.5 && w.y1 >= mondeH() - 0.5;
    if (deja) { tv.annAt = 0; tv.callAt = CFG.annonceTrav; tv.departAt = CFG.annonceTrav; }
    else { tv.callAt = 0; tv.annAt = Math.max(0, CFG.miseEnPlace - CFG.annonceTrav); tv.departAt = CFG.miseEnPlace; }
    return true;
  }
  function annoncerTrav() {
    tv.ann = true;
    O.sfx('travelling', { pan: 0 });
    var H = N.hud;
    if (H && typeof H.banniere === 'function') H.banniere('LE PLATEAU AVANCE', { c: 'magenta', duree: CFG.annonceTrav });
    else if (H && typeof H.tag === 'function') H.tag('LE PLATEAU AVANCE');
    emitArene('travellingAnnonce', -1, tv.vx);
  }
  function majTrav(dt) {
    if (vagueOn && tvAt >= 0 && !tvDone && tw >= tvAt) { tvDone = true; lancerTrav(tvVx); }
    if (tv.ph === 'off' || tv.ph === 'arret') return;
    var w = monde();
    if (!w) { tv.ph = 'off'; return; }
    tv.t += dt;
    if (!tv.ann && tv.t >= tv.annAt) annoncerTrav();
    if (!tv.appele && tv.t >= tv.callAt) {
      tv.appele = true; touche = true;
      w.travelling({ largeur: CFG.largeur, vx: tv.vx, depuis: tv.depuis });
    }
    if (tv.ph === 'mise' && tv.t >= tv.departAt) { tv.ph = 'marche'; emitArene('travelling', -1, tv.vx); }
    if (tv.ph === 'marche' && tv.t > tv.departAt + 0.25 && !w.enMouvement()) { tv.ph = 'arret'; emitArene('fin', -1, 0); }
  }

  /* le mur arrière : celui d'où l'arène s'éloigne. Avant le départ, la position FINALE (celle que le décor hachure). */
  function murArriere() {
    var w = monde();
    if (!w || (tv.ph !== 'mise' && tv.ph !== 'marche')) return null;
    var s = tv.vx > 0 ? 1 : -1, avant = tv.ph === 'mise' && tv.t < tv.departAt;
    OUT_MUR.sens = s; OUT_MUR.actif = tv.ph === 'marche';
    OUT_MUR.x = avant ? (s > 0 ? tv.depuis : tv.depuis + CFG.largeur) : (s > 0 ? w.x0 : w.x1);
    OUT_MUR.y0 = w.y0; OUT_MUR.y1 = w.y1;
    return OUT_MUR;
  }

  /* ce que les murs en marche dépassent : corps coupé, ennemis et butin perdus, tirs effacés, pan allumé */
  function effetsMurs() {
    panD = 99;
    var w = monde();
    if (!w || (tv.ph !== 'mise' && tv.ph !== 'marche') || !w.enMouvement()) return;
    var x0 = w.x0, x1 = w.x1, y0 = w.y0, y1 = w.y1, i, e, L, c, k;
    L = N.ennemis && N.ennemis.list;
    if (L && N.ennemis.hit) for (i = 0; i < L.length; i++) {
      e = L[i];
      if (!e || e._dead || e.boss || e.etat === 'mort' || e.etat === 'portail' || e._st === 'naissance') continue;
      if (e.x >= x0 && e.x <= x1 && e.y >= y0 && e.y <= y1) { e._arDedans = true; continue; }
      if (e._arDedans && (e.x < x0 - 2 || e.x > x1 + 2)) N.ennemis.hit(e, 9999, SRC_DEC);     // sans score ni butin
    }
    L = N.butin && N.butin.list;
    if (L) for (i = 0; i < L.length; i++) { c = L[i]; if (c && (c.x < x0 - 2 || c.x > x1 + 2)) c.vie = 0; }
    L = N.ennemis && N.ennemis.tirs;
    if (L) for (i = 0; i < L.length; i++) { c = L[i]; if (c && !c._dead && (c.x < x0 - 4 || c.x > x1 + 4)) c._dead = true; }
    if (!vivante()) return;
    var q = qsegs(), n = q.length >> 1, kCut = -1, sx, sy, d, s = tv.vx > 0 ? 1 : -1;
    for (k = 0; k < n; k++) {
      sx = q[k * 2]; sy = q[k * 2 + 1];
      if (tv.ph === 'marche') { d = s > 0 ? sx - x0 : x1 - sx; if (d < panD) panD = d; }
      if (kCut < 0 && k >= 1 && (sx < x0 - 0.5 || sx > x1 + 0.5 || sy < y0 - 0.5 || sy > y1 + 0.5)) kCut = k;
    }
    if (kCut > 0) N.joueuse.couper(kCut, SRC_MUR, 'mur');           // la longueur minimale de N.R est appliquée par couper()
  }

  /* ============================ les CONVOIS ============================ */
  function tirerVoie() {
    var n = CFG.voies.length, i;
    if (cv.derniere < 0) i = O.ri('arene', 0, n - 1);
    else { i = O.ri('arene', 0, n - 2); if (i >= cv.derniere) i++; }
    return i;
  }
  function longueur() { return CFG.wagons * CFG.wagon[0] + (CFG.wagons - 1) * CFG.ecartWagons; }
  function majBloc() {
    var Ln = longueur();
    if (CV.sens > 0) { CV.bx1 = CV.xf; CV.bx0 = CV.xf - Ln; } else { CV.bx0 = CV.xf; CV.bx1 = CV.xf + Ln; }
  }
  function lancerConvoi(voie, sens) {
    if (CV.ph !== 'off') return false;
    voie = O.clamp(voie | 0, 0, CFG.voies.length - 1);
    CV.ph = 'annonce'; CV.t = 0; CV.voie = voie; CV.cy = CFG.voies[voie]; CV.sens = sens > 0 ? 1 : -1; CV.broyes = 0; CV.tag = false;
    cv.derniere = voie;
    O.sfx('convoi', { pan: CV.sens > 0 ? -0.8 : 0.8 });                    // le klaxon vient du côté d'arrivée
    emitArene('convoiAnnonce', voie, CV.sens * CFG.vitesse);
    if (N.ev && N.ids) N.ev.emit('arme', { id: N.ids.suivant(), type: 'convoi', forme: 'voie', total: CFG.annonceConvoi, cible: 'tout', shown: true, rallonge: false });
    return true;
  }
  function stopConvoi() {
    if (CV.ph === 'off') return;
    var v = CV.voie, s = CV.sens;
    CV.ph = 'off'; inWake = false;
    emitArene('convoiPasse', v, s * CFG.vitesse);
  }
  /* quand lancer le prochain : après son heure, sans convoi en cours, hors du silence d'une élite, assez tôt dans la vague */
  function majPlan() {
    if (!vagueOn || cv.next < 0 || tw < cv.next || CV.ph !== 'off' || !vivante()) return;
    if (tw > duree - CFG.avantFin) { cv.next = -1; return; }
    if (tw < eliteT + CFG.silenceElite) return;
    lancerConvoi(tirerVoie(), O.rf('arene') < 0.5 ? 1 : -1);
    cv.next = tw + cv.periode + (cv.alea ? O.rr('arene', -cv.alea, cv.alea) : 0);
  }

  function sillage(x, y) {
    if (CV.ph !== 'passage') return false;
    if (Math.abs(y - CV.cy) > CFG.hauteurVoie / 2) return false;
    var D = CFG.sillageDistance;
    return CV.sens > 0 ? (x <= CV.bx0 && x >= CV.bx0 - D) : (x >= CV.bx1 && x <= CV.bx1 + D);
  }

  function broyer(e) {
    var x = e.x, y = e.y, base = (R && R.score && R.score.base && R.score.base[e.type]) || 0;
    if (!N.ennemis.hit(e, 9999, SRC_CV)) return;
    CV.broyes++;
    O.spark(x, y, O.ROSE, 6); O.debris(x, y, O.SANG, 3);
    if (inWake && base > 0 && N.score && typeof N.score.ajouter === 'function') N.score.ajouter(base * (typeof N.score.mult === 'function' ? N.score.mult() : 1), x, y);
    var t = 'BROYÉ ×' + CV.broyes;
    if (N.hud && typeof N.hud.pop === 'function') N.hud.pop(x, y - 6, t, { c: 'rose' }); else O.pop(x, y - 6, t, O.ROSE);
  }

  function majConvoi(dt) {
    if (CV.ph === 'off') return;
    var A = O.A;
    if (CV.ph === 'annonce') {
      CV.t += dt;
      if (CV.t < CFG.annonceConvoi) return;
      CV.ph = 'passage'; CV.t = 0; CV.xf = CV.sens > 0 ? A.x0 : A.x1; CV.tag = false;
      majBloc();
      if (N.cam && typeof N.cam.jolt === 'function') N.cam.jolt(CV.sens * CFG.jolt, 0);
      return;
    }
    CV.t += dt;
    CV.xf += CV.sens * CFG.vitesse * dt;
    majBloc();
    var hy = CFG.wagon[1] / 2, P = N.joueuse && N.joueuse.tete, rt = (R && R.mort && R.mort.rayonTete) || 3, i, e, m, L;
    if (P && vivante() && !N.joueuse.invul()) {
      if (P.x > CV.bx0 - rt && P.x < CV.bx1 + rt && Math.abs(P.y - CV.cy) < hy + rt) N.joueuse.tuer('convoi', SRC_CV);
      if (vivante()) {                                           // le corps : le segment touché le plus proche de la tête
        var rc = (R && R.mort && R.mort.coupe && R.mort.coupe.rayonSegment) || 3.5, q = qsegs(), n = q.length >> 1, k, sx, sy;
        for (k = CFG.coupeSegMin; k < n; k++) {
          sx = q[k * 2]; sy = q[k * 2 + 1];
          if (sx > CV.bx0 - rc && sx < CV.bx1 + rc && Math.abs(sy - CV.cy) < hy + rc) { N.joueuse.couper(k, SRC_CV, 'convoi'); break; }
        }
      }
    }
    L = N.ennemis && N.ennemis.list;
    if (L && N.ennemis.hit) for (i = 0; i < L.length; i++) {
      e = L[i];
      if (!e || e._dead || e.boss || e.etat === 'mort' || e.etat === 'portail' || e._st === 'naissance') continue;
      m = e.r * 0.8;
      if (e.x > CV.bx0 - m && e.x < CV.bx1 + m && Math.abs(e.y - CV.cy) < hy + m) broyer(e);
    }
    var rear = CV.sens > 0 ? CV.bx0 : CV.bx1;
    if ((CV.sens > 0 && rear > A.x1 + CFG.margeFin) || (CV.sens < 0 && rear < A.x0 - CFG.margeFin) || CV.t > 14) stopConvoi();
  }

  /* le sillage : × 1,4 sans vider la réserve (poussée le long du cap, voir l'en-tête) */
  function majSillage(dt) {
    if (!inWake) { CV.tag = CV.tag && CV.ph === 'passage'; return; }
    var P = N.joueuse.tete;
    if (!CV.tag) { CV.tag = true; if (N.hud && typeof N.hud.tag === 'function') N.hud.tag('SILLAGE'); }
    var d = (P.vit || 68) * (CFG.sillageFacteur - 1) * Math.min(0.05, O.dtJ(dt)), nx = P.x + Math.cos(P.ang) * d, ny = P.y + Math.sin(P.ang) * d;
    var m = N.joueuse.distMur ? N.joueuse.distMur(nx, ny) : null;
    if (m && m.d < CFG.murSur) return;
    P.x = nx; P.y = ny;
  }

  /* ============================ S.monde ============================ */
  var ANNP = [[0, 0, 0, 0], [0, 0, 0, 0]];
  function majMonde() {
    var S = N.S, w = N.world;
    if (!S || !w) return;
    var M = S.monde;
    if (!M || typeof M !== 'object') M = S.monde = { x0: 0, y0: 0, x1: 0, y1: 0, vx: 0, vy: 0, mobile: false, annonce: [] };
    M.x0 = w.x0; M.y0 = w.y0; M.x1 = w.x1; M.y1 = w.y1;
    M.vx = tv.ph === 'marche' ? tv.vx : 0; M.vy = 0;
    M.mobile = !!(w.enMouvement && w.enMouvement());
    if (!M.annonce) M.annonce = [];
    M.annonce.length = 0;
    var an = w.mursAnnonces ? w.mursAnnonces() : null;
    if (an) for (var i = 0; i < an.length && i < ANNP.length; i++) {
      var a = ANNP[i], r = an[i];
      a[0] = r.x; a[1] = r.y; a[2] = r.x + r.w; a[3] = r.y + r.h;
      M.annonce.push(a);
    }
  }

  /* ============================ pas de jeu ============================ */
  function pas() {
    var dt = dtc, P = N.joueuse && N.joueuse.tete;
    if (vagueOn) tw += dt;
    inWake = !!(P && CV.ph === 'passage' && vivante() && sillage(P.x, P.y));
    majTrav(dt);
    majPlan();
    majConvoi(dt);
    effetsMurs();
    majSillage(dt);
    majMonde();
    publierVoies();
  }
  function update(dt) {
    if (!(dt > 0)) return;
    dtc = dt; frame++;
    O.safe('arene.update', pas);
  }

  /* ============================ entrées du directeur ============================ */
  /* la vague commence (n'importe quand : dbg.vague(n) relance à tout instant) */
  function restaurer(duree_) {
    var w = monde();
    if (w && touche) w.arena({ x: 0, y: 0, w: mondeW(), h: mondeH() }, duree_ || CFG.retour);
    touche = false;
  }
  function entree(info) {
    if (!info && N.dir && typeof N.dir.info === 'function') info = N.dir.info();
    stopConvoi();
    if (tv.ph !== 'off') { tv.ph = 'off'; }
    restaurer(CFG.retour);
    vagueOn = true; tw = 0; eliteT = -99; cv.derniere = -1; cv.next = -1; tvAt = -1; tvDone = false; panD = 99;
    nVague = info ? (info.n | 0) : 0;
    duree = (info && info.duree) || 45;
    if (info && info.travelling) {
      tvAt = +info.travelling.t >= 0 ? +info.travelling.t : 0;
      tvVx = Math.abs(+info.travelling.vx) || vitesseVague(nVague);
    }
    if (info && info.convois) {
      var c = info.convois, d = nVague >= 5 ? CFG.v5 : CFG.v4;
      cv.periode = +c.periode > 0 ? +c.periode : d.periode;
      cv.alea = +c.alea >= 0 ? +c.alea : d.alea;
      cv.next = +c.t >= 0 ? +c.t : d.debut;
    }
  }
  function pic() { eliteT = tw; }
  function nettoyee() {
    vagueOn = false; tvAt = -1; cv.next = -1;
    stopConvoi();
    var fin = tv.ph === 'mise' || tv.ph === 'marche';
    if (fin) emitArene('fin', -1, 0);
    tv.ph = 'off';
    restaurer(CFG.retour);                    // les murs reviennent aux bords du monde en 2 s
  }
  function reset() {
    var w = monde();
    if (w && (tv.ph === 'mise' || tv.ph === 'marche') && typeof w.stop === 'function') w.stop();
    tv.ph = 'off'; tv.t = 0; tv.ann = false; tv.appele = false;
    CV.ph = 'off'; CV.broyes = 0; CV.tag = false;
    cv.next = -1; cv.derniere = -1; cv.periode = 9; cv.alea = 2;
    vagueOn = false; tw = 0; tvAt = -1; tvDone = false; eliteT = -99; touche = false; inWake = false; panD = 99; frame = 0; QN = -1;
    publierVoies();
  }

  /* ============================ appels à la main (débogage) ============================ */
  function travelling(vx, depuis) {
    var s = vx ? (vx > 0 ? 1 : -1) : 0;
    return lancerTrav(Math.abs(+vx) || vitesseVague(nVague) || 12, depuis, s || undefined);
  }
  function convois(c) {
    c = c || {};
    if (+c.periode > 0) { cv.periode = +c.periode; cv.alea = +c.alea || 0; cv.next = typeof c.t === 'number' ? tw + c.t : tw + cv.periode; return true; }
    if (CV.ph !== 'off') return false;
    var v = typeof c.voie === 'number' ? c.voie : tirerVoie();
    var s = c.sens ? (c.sens > 0 ? 1 : -1) : (O.rf('arene') < 0.5 ? 1 : -1);
    return lancerConvoi(v, s);
  }
  var VO = { id: 0, y0: 0, y1: 0, etat: 'annonce', sens: 1, x: 0, reste: 0 }, VOL = [];
  function voies() {
    VOL.length = 0;
    if (CV.ph === 'off') return VOL;
    var A = O.A, h = CFG.hauteurVoie / 2;
    VO.id = CV.voie; VO.y0 = CV.cy - h; VO.y1 = CV.cy + h; VO.etat = CV.ph; VO.sens = CV.sens;
    if (CV.ph === 'annonce') { VO.x = CV.sens > 0 ? A.x0 : A.x1; VO.reste = Math.max(0, CFG.annonceConvoi - CV.t); }
    else {
      VO.x = CV.xf;
      var rear = CV.sens > 0 ? CV.bx0 : CV.bx1;
      VO.reste = Math.max(0, (CV.sens > 0 ? A.x1 + CFG.margeFin - rear : rear - (A.x0 - CFG.margeFin)) / CFG.vitesse);
    }
    VOL.push(VO);
    return VOL;
  }
  /* S.voies (lot I) : la voie du convoi annoncé ou en passage (au schéma `voie`), la même liste réutilisée que voies() ;
     republiée à chaque pas de jeu et vidée à reset() */
  function publierVoies() { var s = N.S; if (s) s.voies = voies(); }
  function actif() { return tv.ph === 'mise' || tv.ph === 'marche' || CV.ph !== 'off'; }
  function etat() {
    return { tw: tw, vague: nVague, vagueOn: vagueOn, tv: tv.ph, tvT: tv.t, vx: tv.vx, depuis: tv.depuis, cv: CV.ph, voie: CV.voie, sens: CV.sens,
      xf: CV.xf, broyes: CV.broyes, prochain: cv.next, derniere: cv.derniere, eliteT: eliteT, sillage: inWake, panD: panD };
  }

  /* ============================ dessin (coordonnées MONDE, l'origine est posée) ============================ */
  var WAG = {};
  function wagonSpr(sens, museau) {          // museau : 0 aucun, 1 sombre, 2 allumé
    var key = (sens > 0 ? 'd' : 'g') + museau, sp = WAG[key];
    if (sp) return sp;
    var w = CFG.wagon[0], h = CFG.wagon[1], m = O.mk(w, h), d = m.data, x, y, c;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) c = O.NP;                 // la gaine de nuit profonde
      else if (x === 1 || x === w - 2 || y === 1 || y === h - 2) c = O.MAGENTA;      // les arêtes
      else {
        c = O.SANG;                                                                   // la caisse
        if (x === 6 || x === 11) c = O.NP;
        else if ((x === 3 || x === 8 || x === 14) && (y === 3 || y === h - 4)) c = O.MAGENTA;
      }
      if (museau && x >= w - 5 && x <= w - 3 && y >= 3 && y <= h - 4) c = museau === 2 ? O.ROSE : O.MAGENTA;
      d[y * w + x] = c;
    }
    if (sens < 0) for (y = 0; y < h; y++) for (x = 0; x < (w >> 1); x++) { var a = y * w + x, b = y * w + (w - 1 - x), t = d[a]; d[a] = d[b]; d[b] = t; }
    m.cx = w >> 1; m.cy = h >> 1;
    WAG[key] = m;
    return m;
  }

  function drawVoie() {
    var G = N.gfx, A = O.A, V = O.VUE, s = CV.sens, hh = CFG.hauteurVoie, y0 = CV.cy - hh / 2;
    var x0 = Math.max(A.x0, V.x - 2), x1 = Math.min(A.x1, V.x + V.w + 2), x, k;
    if (x1 <= x0) return;
    if (CV.ph === 'annonce') {
      k = CV.t / CFG.annonceConvoi;
      G.ditherRect(x0, y0, x1 - x0, hh, O.MAGENTA, CFG.hachure);                    // la voie hachurée, magenta tramé à 25 %
      var off = ((O.T.ak * 30 * s) % 8 + 8) % 8;
      for (x = x0 - 8 + off; x < x1; x += 8) {                                       // les tirets des bords
        var xa = Math.max(x, x0), xb = Math.min(x + 4, x1);
        if (xb > xa) { G.rect(xa, y0, xb - xa, 1, O.MAGENTA); G.rect(xa, y0 + hh - 1, xb - xa, 1, O.MAGENTA); }
      }
      /* le cône de phares : il avance depuis le bord d'arrivée */
      var front = s > 0 ? A.x0 + k * (A.x1 - A.x0) * 0.6 : A.x1 - k * (A.x1 - A.x0) * 0.6, j, cx2;
      for (j = 0; j < 26; j++) {
        cx2 = front + s * j * 2;
        if (cx2 < V.x - 2 || cx2 > V.x + V.w + 2 || cx2 < A.x0 || cx2 > A.x1) continue;
        var hj = Math.min(hh / 2, 2 + j * 0.3);
        G.ditherRect(cx2, CV.cy - hj, 2, hj * 2, O.ROSE, 0.5 * (1 - j / 26));
      }
      chevronBord();
    } else G.ditherRect(x0, y0, x1 - x0, hh, O.MAGENTA, CFG.hachure * 0.5);        // la voie reste marquée pendant le passage
  }
  function chevronBord() {
    if (!((Math.floor(O.T.ak * 6) & 1) === 0 || CV.t > CFG.annonceConvoi - 0.35)) return;
    var A = O.A, V = O.VUE, s = CV.sens, y = CV.cy, vert = 0, bx;
    bx = s > 0 ? Math.max(A.x0, V.x) + 7 : Math.min(A.x1, V.x + V.w) - 7;
    bx += s * ((Math.floor(O.T.ak * 8) & 3) * 2);
    bx = O.clamp(bx, V.x + 7, V.x + V.w - 7);
    if (y < V.y + 6) { y = V.y + 7; vert = -1; } else if (y > V.y + V.h - 6) { y = V.y + V.h - 7; vert = 1; }
    O.putInk(O.sp('chevron:' + (vert ? (vert > 0 ? 4 : 12) : (s > 0 ? 0 : 8)), 0), bx, y, O.ROSE);
  }
  function drawConvoi() {
    var G = N.gfx, V = O.VUE, s = CV.sens, w = CFG.wagon[0], gap = CFG.ecartWagons, k, cx;
    if (CV.bx1 < V.x - 50 || CV.bx0 > V.x + V.w + 50) return;
    var pulse = Math.sin(O.T.ak * Math.PI * 2 * CFG.museauHz) > 0;                   // le museau pulse sous 3 Hz
    /* les phares devant, le sillage derrière */
    var fr = s > 0 ? CV.bx1 : CV.bx0, rear = s > 0 ? CV.bx0 : CV.bx1;
    G.ditherRect(s > 0 ? fr : fr - 36, CV.cy - 6, 36, 12, O.ROSE, 0.22);
    G.ditherRect(s > 0 ? fr : fr - 18, CV.cy - 3, 18, 6, O.ROSE, 0.3);
    var D = CFG.sillageDistance, seg = D / 5, j;
    for (j = 0; j < 5; j++) G.ditherRect(s > 0 ? rear - (j + 1) * seg : rear + j * seg, CV.cy - 9, seg, 18, inWake ? O.CYANP : O.CYAN, (inWake ? 0.4 : 0.26) * (1 - j / 5));
    for (k = 0; k < CFG.wagons; k++) {
      cx = s > 0 ? CV.xf - w / 2 - k * (w + gap) : CV.xf + w / 2 + k * (w + gap);
      if (cx < V.x - w || cx > V.x + V.w + w) continue;
      O.put(wagonSpr(s, k === 0 ? (pulse ? 2 : 1) : 0), cx, CV.cy);
    }
  }
  function drawTrav() {
    var G = N.gfx, A = O.A, V = O.VUE, mur = murArriere();
    if (!mur) return;
    var s = mur.sens, y, j, f = Math.floor(O.T.ak * 8);
    if (tv.ann && tv.t < tv.departAt + 0.4) {                                        // les chevrons qui battent sur le mur arrière
      var sp = O.sp('chevron:' + (s > 0 ? 0 : 8), 0), ya = Math.max(mur.y0 + 12, Math.floor((V.y - 8) / 20) * 20 + 12), yb = Math.min(mur.y1 - 8, V.y + V.h + 8);
      for (y = ya; y < yb; y += 20) for (j = 0; j < 4; j++) {
        if (j > (f & 3)) continue;
        O.putInk(sp, mur.x + s * (7 + j * 6), y, j === (f & 3) ? O.ROSE : O.MAGENTA);
      }
    }
    if (mur.actif && panD < CFG.alerte) {                                             // le pan s'allume
      var a = O.clamp(1 - panD / CFG.alerte, 0.25, 1) * ((f & 1) ? 0.9 : 0.6);
      G.ditherRect(s > 0 ? mur.x : mur.x - 5, mur.y0, 5, mur.y1 - mur.y0, O.ROSE, a);
    }
  }
  function drawIn() {
    if (CV.ph !== 'off') { drawVoie(); if (CV.ph === 'passage') drawConvoi(); }
    if (tv.ph === 'mise' || tv.ph === 'marche') drawTrav();
  }
  function draw() { if (CV.ph !== 'off' || tv.ph === 'mise' || tv.ph === 'marche') O.safe('arene.draw', drawIn); }

  return {
    reset: reset, update: update, draw: draw, travelling: travelling, convois: convois, voies: voies, sillage: sillage, actif: actif,
    entree: entree, pic: pic, nettoyee: nettoyee, murArriere: murArriere, etat: etat
  };
})();
