/* ===== 70-joueuse.js — N.joueuse : le serpent (mouvement, corps, collisions, mort, coupe, réapparition) =====

   Tiré de 70-game.js (lot 0b) : la trace d'un point par pixel, le cap mémorisé, le virage borné, le dessin de
   la tête et des perles. CE QUI CHANGE par rapport à la démo, pour les retours n° 3 et 4 de la propriétaire
   (refonte/RETOURS-PROPRIETAIRE.md) :
     - le mur TUE (mur courant, grâce de 60 ms, REFONTE.md § 2.3) au lieu de laisser glisser ;
     - le corps ne tue pas et n'absorbe plus : un tir, un souffle ou la traînée COUPE le serpent au segment
       touché (`couper`) ; seule la tête tue ;
     - la tête a un rayon qui tue de 3 px (N.R.mort.rayonTete) ; la morsure compte à partir du segment 6.

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
    lenDepart: 8
  };
  var ESP = (R && R.longueur && R.longueur.espacement) || 5;
  var P = { x: 0, y: 0, ang: 0, vit: 0 };         // N.joueuse.tete : la même référence toute la partie
  var st = {
    etat: 'absent', target: 0, a0: 0, len: 8, rate: 1, invul: 0, grace: -1, pulse: -1, gone: 0,
    god: false, vitBase: 68, ready: 0, spawnT: 0, mortT: 0
  };
  var S = null;
  var SEGS = [];                                 // positions à plat [x0, y0, x1, y1, ...], tête comprise

  /* ============================ la trace : un point par pixel parcouru ============================ */
  var TN = 4096, TX = new Float32Array(TN), TY = new Float32Array(TN), th = 0, tn = 0, tlx = 0, tly = 0;
  function tpush(x, y) { th = (th + 1) % TN; TX[th] = x; TY[th] = y; if (tn < TN) tn++; tlx = x; tly = y; }
  function trailReset(x, y, a, len) {
    th = 0; tn = 0;
    var need = (len + 3) * ESP + 2, c = Math.cos(a), s = Math.sin(a);
    for (var i = need; i >= 0; i--) tpush(x - c * i, y - s * i);
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
    st.target = P.ang; st.a0 = a0; st.len = (cfg && cfg.len) || CFG.lenDepart; st.rate = 1; st.invul = 0; st.grace = -1;
    st.pulse = -1; st.gone = 0; st.etat = 'vivant'; st.ready = 0; st.vitBase = P.vit;
    trailReset(P.x, P.y, P.ang, 40);
    N.joueuse.etat = 'vivant';
    publier();
  }

  function publier() {
    if (!S) S = N.S;
    if (!S) return;
    var p = S.player;
    if (!p || p === N.joueuse.tete) p = S.player = {};
    p.x = P.x; p.y = P.y; p.ang = P.ang; p.angVise = st.target; p.vit = P.vit; p.len = st.len;
    p.segs = segs(); p.etat = st.etat; p.boost = false; p.reserve = 100; p.apogee = N.joueuse.apogee || 0; p.pouvoirPret = false;
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
  function infoSource(src) {
    var e = src && src.genre === 'ennemi' ? trouver(src.id) : null;
    return { vu: e ? (e.vuDepuis > 0 ? e.vuDepuis : 0) : 0, tele: e && e._teleTotal > 0 ? e._teleTotal : 0, e: e };
  }

  /* ============================ la mort ============================
     tuer() remplit S.death (schéma § 7.5), passe en 'mort' et émet `mort`. C'est 79-jeu.js qui séquence la
     suite (gel, ralenti, désintégration, réapparition ou fin) à partir de cet événement. */
  function tuer(cause, src) {
    if (!S) S = N.S;
    if (st.etat === 'mort' || st.god) return false;
    var I = infoSource(src), vague = 0, quartier = 'docks';
    if (N.dir && N.dir.vague) { var w = N.dir.vague(); vague = (w && typeof w === 'object') ? (w.n | 0) : (w | 0); }
    var vs = R && R.secteurs && R.secteurs[0] && R.secteurs[0].vagues;
    if (vs && vs[Math.max(0, vague - 1)]) quartier = vs[Math.max(0, vague - 1)].quartier;
    if (N.decor && N.decor.quartier && N.decor.quartierCourant) quartier = N.decor.quartierCourant();
    var d = {
      cause: cause, auteur: auteurDe(src, I.e), auteurId: src && src.id >= 0 ? src.id : null,
      x: P.x, y: P.y, t: O.T.t, vague: vague, quartier: quartier, visibleDepuis: I.vu, teleDuree: I.tele
    };
    st.etat = 'mort'; N.joueuse.etat = 'mort'; st.mortT = 0; st.gone = 0; st.pulse = -1;
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
    k = k | 0;
    var cm = (R && R.mort && R.mort.coupe) || { longueurMin: 3, segmentsParCellule: 2, expireCellules: 3 };
    if (k < 1 || k >= st.len) return 0;
    var I = infoSource(src), perdus, nouvelle = Math.max(cm.longueurMin, k), i, auteur = auteurDe(src, I.e);
    cause = cause || causeDe(src);
    perdus = st.len - nouvelle;
    if (perdus <= 0) return 0;
    segAt(k);
    var cx = SPX, cy = SPY;
    if (N.ev) N.ev.emit('coup', { partie: 'corps', k: k, cause: cause, auteur: auteur, auteurId: src && src.id >= 0 ? src.id : null,
      x: cx, y: cy, absorbe: false, visibleDepuis: I.vu, teleDuree: I.tele });
    st.len = nouvelle;                       // les cellules tombent par le consommateur de `coupe` de 71-butin (rang 40)
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
    var seg = (R && R.butin && R.butin[c.type] && R.butin[c.type].segments);
    grandir(seg === undefined ? (c.type === 'noyau' ? 2 : c.type === 'cellule' ? 1 : 0) : seg);
  }, '70-joueuse');

  /* la carte CROISSANCE (+5 segments) : N.cartes l'émet, la joueuse la prend (rang 10) */
  if (N.ev) N.ev.on('carte', 10, function (c) {
    if (c.id === 'croissance') grandir((R && R.longueur && R.longueur.parCroissance) || 5);
  }, '70-joueuse');

  /* ============================ mise à jour ============================ */
  function update(dt) {
    if (!S) S = N.S;
    if (!S) return;
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
    P.vit = vitesse();
    var V = P.vit, virage = V / (jz.rayonVirage || 11);
    P.ang = O.turnTo(P.ang, st.target, virage * st.rate * dt);
    P.x += Math.cos(P.ang) * V * dt; P.y += Math.sin(P.ang) * V * dt;
    trailStep(P.x, P.y);
    if (st.invul > 0) { st.invul -= dt; if (st.invul <= 0) { st.invul = 0; if (st.etat === 'reapparition') { st.etat = 'vivant'; N.joueuse.etat = 'vivant'; } } }
    if (st.ready > 0) st.ready -= dt;
    if (st.pulse >= 0) { st.pulse += dt * 60; if (st.pulse > st.len + 4) st.pulse = -1; }

    collisions(dt);
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
    /* 2. la morsure : un segment d'indice 6 ou plus qui n'est pas l'un des trois derniers */
    var ms = mort.morsure || { segMin: 6, derniersFermant: 3, rayon: 5.5 };
    var kmax = st.len - ms.derniersFermant;
    for (k = ms.segMin; k < kmax; k++) {
      segAt(k);
      if (O.d2(P.x, P.y, SPX, SPY) < ms.rayon * ms.rayon) { tuer('morsure', { genre: 'joueuse', type: 'devore', id: -1 }); return; }
    }
    var L = N.ennemis, protege = st.invul > 0;
    if (!L) return;
    /* 3. les ennemis : rayon 3 + r × 0,8 ; ni en apparition ni sous invulnérabilité de réapparition */
    var fr = (mort.ennemi && mort.ennemi.facteurRayon) || 0.8, lst = L.list;
    for (i = 0; i < lst.length; i++) {
      var e = lst[i];
      if (e.etat === 'mort' || e.etat === 'portail' || e._st === 'naissance') continue;
      var rr2 = rt + e.r * fr;
      if (!protege && O.d2(P.x, P.y, e.x, e.y) < rr2 * rr2) { tuer('ennemi', { genre: 'ennemi', type: e.type, id: e.id }); return; }
    }
    /* 4. les tirs : la tête tue, le corps se coupe (et le tir disparaît) */
    var ts = L.tirs, rc = (mort.coupe && mort.coupe.rayonSegment) || 3.5;
    for (i = 0; i < ts.length; i++) {
      var b = ts[i];
      if (b._dead) continue;
      if (!protege && O.d2(P.x, P.y, b.x, b.y) < (rt + b.r) * (rt + b.r)) { b._dead = true; tuer('tir', b.src); return; }
      for (k = 1; k < st.len; k++) {
        segAt(k);
        if (O.d2(b.x, b.y, SPX, SPY) < (rc + b.r) * (rc + b.r)) {
          if (k <= 1) break;                                     // collé à la tête : c'est la tête qui compte
          b._dead = true; couper(k, b.src, 'tir'); break;
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
    st.len = Math.max(ru.longueurMin, Math.ceil(st.len * ru.longueurPart));
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
  function draw() { /* rien sous les ennemis : le serpent se dessine dans drawTop (§ 7.7) */ }
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
    var blink = st.invul > 0 && (Math.floor(ak * 4 * 2) & 1);
    for (k = st.len; k >= 1; k--) {
      if (blink && k > 2 && (k & 1)) continue;
      segAt(k);
      var q = st.len - k, nm = q < 1 ? 'corps:3' : q < 2 ? 'corps:5' : q < 4 ? 'corps:7' : 'corps';
      var s = sp(nm, f + k);
      if (st.pulse >= 0 && Math.abs(k - st.pulse) < 2) putInk(s, SPX, SPY, O.CYANP); else put(s, SPX, SPY);
    }
    put(sp('tete:' + O.dir16(P.ang), Math.floor(ak * 5)), P.x, P.y);
    /* le cap visé, quand il diffère du cap réel de plus de 20° (J-33) */
    var d = O.wrapA(st.target - P.ang), ch = (R && R.joueuse && R.joueuse.chevron && R.joueuse.chevron.ecartDeg) || 20;
    if (Math.abs(d) > ch * Math.PI / 180) put(sp('chevron:' + O.dir16(st.target), 0), P.x + Math.cos(st.target) * 11, P.y + Math.sin(st.target) * 11);
  }

  return {
    reset: reset, update: update, draw: draw, drawTop: drawTop,
    tete: P, segs: segs, len: function () { return st.len; }, etat: 'absent',
    hitTest: hitTest, tuer: tuer, couper: couper, grandir: grandir,
    invul: function () { return st.invul > 0; },
    pouvoir: null, apogee: 0, boost: false, traine: function () { return false; },
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
