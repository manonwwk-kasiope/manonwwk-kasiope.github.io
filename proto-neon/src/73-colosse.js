/* ===== 73-colosse.js — N.colosse : LE CYCLOPE, boss en trois phases (REFONTE § 4.8, lot 5b) =====

   Remplace le cyclope de repli de 72-ennemis.js (updBoss). Le corps (96 × 128) est assemblé ici de pièces
   dessinées avec N.outils.mk : tronc 96 × 96, tête 40 × 32 à œil unique, deux mains 24 × 24 (en lames),
   six plaques 12 × 12, carcasse. L'ŒIL et les MAINS sont des objets du schéma `ennemi` (type 'cyclope',
   boss:true, partie 'oeil' | 'main') posés dans N.ennemis.list avec ext:true : 72-ennemis ne les déplace pas,
   ne les dessine pas, ne leur donne aucune IA ; les armes les visent, la joueuse les touche (contact : rayon
   3 + r × 0,8). Les dégâts passent par N.colosse.touche(e, dmg, src) -> dégâts EFFECTIFS (0 = ricochet).

   INTERFACE : start(), reset(), update(dt), draw() (corps, sous la joueuse), drawTop() (télégraphes, jauge,
   éclat de brasier), actif(), phase() 0..3, pv() 0..1, mort(), oeil() -> {x,y}|null (la caméra la lit),
   estOeil(id), touche(e, dmg, src), surKill(c) (appelé par 76-directeur, rang 10 de `kill`, pour TOUT kill),
   publierTele(ajouter) : transmet ses zones à l'agrégateur public de N.ennemis (aucune écriture dans son pool).

   ÉMET : `phase` {n, evt: arrivee | entree | repit | enrage | mort} ; `arme` {id, type:'cyclope', forme, total,
   cible, shown, rallonge} au début de chaque télégraphe. N'ÉCOUTE AUCUN événement (aucun N.ev.on : la mort de
   l'œil et des mains arrive par surKill).
   DEMANDE à 72-ennemis : spawn(type, x, y, {portail, ext:true, st, stT}) ; hit(e, dmg, src) doit appeler
   N.colosse.touche(e, dmg, src) pour e.boss && e._ext ; tir(), rayon(x0,y0,x1,y1,dur,w,src) (sinon repli :
   le laser est poussé dans N.ennemis.lasers à la main), effacerTirs(), purge('proche'), fuir(), lasers, list.
   À 76-directeur : formation('file' | 'meute') ; à 71-butin : pluie(8) ; à 78-hud : banniere(lignes, opts) ;
   à 12-cam : world.arena(rect, dur), cam.shown, cam.secousse, cam.focus ; à 15-decor : ondule (facultatif).

   REPLIS (tout appel externe est gardé par typeof) :
   - ralenti du monde à 0,3 pendant l'arrivée : PAS fait ici (c'est 79-scene qui ralentit) ; l'arrivée est
     comptée en temps RÉEL (N.horloge.reel()) pour durer 2,2 s à l'écran, sinon en temps de jeu.
   - silhouette de décor (N.decor.silhouette) : non utilisée ; l'arrivée fait venir le corps du fond par un
     fondu tramé en sang, puis en magenta.
   - le tronc n'est pas un objet de N.ennemis.list : les tirs de la joueuse le traversent ; seule la zone de
     l'œil (r 14) rebondit quand l'œil est fermé (ricochet + étincelle).
   - si 72-ennemis n'a pas encore la version ext, spawn() rend quand même un objet ; ses champs sont forcés
     (_ext, partie, boss) mais le vieux updBoss de 72 le déplacerait : la version ext de 72 est requise.
   Aucun Math.random (flux 'ennemis' via O.rr/ri/rf), aucune couleur littérale (palette via O.*), aucun Date.now. */
N.colosse = (function () {
  'use strict';
  var O = N.outils, R = N.R, TAU = O.TAU, PI = Math.PI;
  var TP = R.publicationTele;
  var NP = O.NP, MAG = O.MAGENTA, SANG = O.SANG, ROSE = O.ROSE, OS = O.OS, BRA = O.BRASIER, ARD = O.ARDOISE;

  /* ------------------------------------------------------------------------------------------------
     Les chiffres : N.R.colosse (lus à start()), sinon les valeurs par défaut de § 4.8.
     CFG : ce que N.R ne porte pas encore.                                                    → N.R */
  var CFG = {
    dTete: 48,                 // l'œil est 48 px au-dessus du centre du corps (tête en haut du tronc)
    rOeil: 14, rMain: 10,      // rayons des objets (contact tête : 3 + r × 0,8)
    epaule: 66, flotte: 2, deriveVit: 14, mainAncre: 170,
    rayonLong: 560, rayonDepart: 25,           // le secteur démarre 25° avant la tête
    gap: 0.6,                                  // pause entre la fin de l'œil ouvert et l'attaque suivante
    ligneDemi: 11, mainVit: 240, mainLigneMax: 330, mainCut: 0.5,
    bondHaut: 70, bondMonte: 0.5, bondChute: 0.12, bondApres: 0.4, mineRayon: 58, minesMax: 12,
    spiralePas: 0.45, spiraleDt: 0.03,
    arriveeZ: 150, purgeInt: 0.045, formMax: 9,
    mortCascade: [[-30, -24], [26, 6], [-14, 34], [36, -34], [0, -48]],
    noms: [null, 'LE REGARD', 'LES MAINS', 'LA COLÈRE']
  };
  var K = {};
  function lire() {
    var r = (R && R.colosse) || {}, en = r.entree || {}, p1 = r.phase1 || {}, ra = p1.rayon || {}, sa = p1.salve || {};
    var p2 = r.phase2 || {}, p3 = r.phase3 || {}, rp = r.repit || {}, eg = r.enrage || {}, mo = r.mort || {};
    var mn = (R && R.monde) || {}, am = mn.arenaCyclope || {};
    K.pvPhase = r.pvPhase || 1500; K.pvTotal = r.pvTotal || 4500; K.pvMain = r.pvMain || 300;
    K.teleMin = r.teleMin || 0.8;
    K.arrivee = en.arrivee || 2.2; K.jauge = en.jauge || 0.9;
    K.rayonVise = ra.vise || 0.9; K.rayonW = ra.largeur || 5; K.rayonDeg = ra.balayageDeg || 100; K.rayonDur = ra.duree || 1.2;
    K.charge = sa.charge || 0.8; K.balles = sa.balles || 14; K.salveVit = sa.vitesse || 70; K.salves = sa.salves || 2; K.ecart = sa.ecart || 0.5;
    K.appelCycles = (p1.appel && p1.appel.cycles) || 3; K.appelForm = (p1.appel && p1.appel.formation) || 'file';
    K.oeil1 = p1.oeil || 1.4;
    K.ciseaux = p2.annonceCiseaux || 0.8; K.oeilMain = p2.oeilMain || 3; K.oeilSalve = p2.oeilSalve || 1.4; K.entree2 = p2.entree || 'meute';
    K.salveDouble = p3.salveDouble || 2; K.ombre = p3.ombre || 40; K.annonceBond = p3.annonceBond || 1.0; K.mines = p3.mines || 6; K.armMines = p3.armementMines || 0.6;
    K.poseMines = Math.max(r.minesPosees.armement, K.teleMin);
    K.balles3 = p3.balles || 14; K.resserre = p3.resserre || 0.15; K.oeil3 = p3.oeil || 1.4;
    K.repit = rp.duree || 7; K.cellules = rp.cellules || 8;
    K.enrApres = eg.apres || 100; K.enrAllure = eg.allure || 1.3; K.enrInt = eg.intervalle || 0.75;
    K.mArret = mo.arretImages || 24; K.mExpl = mo.explosions || 5; K.mCascade = mo.cascade || 0.66;
    K.mBrasierImg = mo.brasierImages || 4; K.mCam = mo.camera || 6; K.mCarcasse = mo.carcasse || 3;
    K.purgeInt = mo.purge || CFG.purgeInt;
    K.aw = am.w || 448; K.ah = am.h || 256; K.aDur = am.duree || 3; K.aMarge = am.marge || 80;
    K.aRes = am.resserre || K.resserre; K.aResDur = am.resserreDuree || 2;
    K.mondeW = mn.W || 1024; K.mondeH = mn.H || 512;
    K.rTete = (R && R.mort && R.mort.rayonTete) || 3;
  }
  lire();

  /* ============================ les pièces : dessinées ici, jamais de couleur littérale ============================ */
  var SPR = null, HANDS = [];
  function mkS(w, h) { var s = O.mk(w, h); s.cx = (w - 1) >> 1; s.cy = (h - 1) >> 1; return s; }
  function dotS(s, x, y, c) { if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.data[y * s.w + x] = c; }
  function outlineS(s, c) {
    var w = s.w + 2, h = s.h + 2, o = mkS(w, h), od = o.data, sd = s.data, x, y;
    for (y = 0; y < s.h; y++) for (x = 0; x < s.w; x++) if (sd[y * s.w + x]) od[(y + 1) * w + x + 1] = sd[y * s.w + x];
    function opq(px, py) { px -= 1; py -= 1; return px >= 0 && py >= 0 && px < s.w && py < s.h && sd[py * s.w + px] !== 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (!od[y * w + x] && (opq(x - 1, y) || opq(x + 1, y) || opq(x, y - 1) || opq(x, y + 1))) od[y * w + x] = c;
    return o;
  }
  function rotS(s, a) {
    var sz = Math.ceil(Math.sqrt(s.w * s.w + s.h * s.h)) | 1, o = mkS(sz, sz);
    var c = Math.cos(a), si = Math.sin(a), cx = (s.w - 1) / 2, cy = (s.h - 1) / 2, oc = (sz - 1) / 2;
    for (var y = 0; y < sz; y++) for (var x = 0; x < sz; x++) {
      var dx = x - oc, dy = y - oc, sx = Math.round(cx + dx * c + dy * si), sy = Math.round(cy - dx * si + dy * c);
      if (sx >= 0 && sy >= 0 && sx < s.w && sy < s.h) { var v = s.data[sy * s.w + sx]; if (v) o.data[y * sz + x] = v; }
    }
    return o;
  }
  function bTronc() {
    var w = 96, h = 96, s = mkS(w, h), x, y;
    for (y = 0; y < h; y++) {
      var hw = y < 24 ? 34 + y * 0.58 : y < 70 ? 48 : 48 - (y - 70) * 0.85;
      for (x = 0; x < w; x++) {
        var dx = Math.abs(x - 47.5);
        if (dx > hw) continue;
        var ed = hw - dx, c = MAG;
        if (ed < 2.5 || y > h - 3) c = SANG;
        else if (y % 12 === 5 && dx < hw - 5) c = SANG;
        else if (ed < 7 && ((x + y) & 3) === 0) c = SANG;
        else if (dx < 1.6 && y > 10 && (y < 38 || y > 62)) c = SANG;
        dotS(s, x, y, c);
      }
    }
    for (y = -9; y <= 9; y++) for (x = -9; x <= 9; x++) {            // le cœur de brasier du colosse
      var q = x * x + y * y;
      if (q <= 81) dotS(s, 48 + x, 50 + y, q > 64 ? NP : q > 30 ? SANG : q > 5 ? BRA : OS);
    }
    return s;
  }
  function bTete() {
    var w = 40, h = 32, s = mkS(w, h), x, y;
    for (y = 0; y < h; y++) {
      var u = (y - 17) / 16, hw = 19.5 * Math.sqrt(Math.max(0, 1 - u * u * 0.9));
      for (x = 0; x < w; x++) {
        var dx = Math.abs(x - 19.5);
        if (dx > hw) continue;
        var ed = hw - dx, c = MAG;
        if (ed < 2.2 || y > h - 3) c = SANG;
        else if (y < 7 && dx < 2.5) c = ROSE;
        else if (ed < 5 && ((x + y) % 3) === 0) c = SANG;
        dotS(s, x, y, c);
      }
    }
    for (y = 8; y <= 26; y++) for (x = 6; x <= 33; x++) {            // l'orbite : le trou de nuit où l'œil s'ouvre
      var v = ((x - 19.5) / 12.5) * ((x - 19.5) / 12.5) + ((y - 17) / 9) * ((y - 17) / 9);
      if (v <= 1) dotS(s, x, y, v > 0.8 ? SANG : NP);
    }
    return s;
  }
  function bMain() {
    var s = mkS(24, 24), x, y;                                       // une lame qui pointe vers la droite
    for (x = 0; x < 24; x++) {
      var ht = x < 5 ? 2.5 + x * 0.5 : x < 15 ? 5 + (x - 5) * 0.35 : Math.max(0.6, 8.5 - (x - 15) * 1.0);
      for (y = 0; y < 24; y++) {
        var dy = y - 11.5;
        if (Math.abs(dy) > ht) continue;
        var c = MAG;
        if (x < 5) c = SANG;
        else if (Math.abs(dy) > ht - 1.4) c = dy < 0 ? ROSE : SANG;
        else if (x > 8 && x < 20 && Math.abs(dy) < 0.8) c = SANG;
        dotS(s, x, y, c);
      }
    }
    return s;
  }
  function bPlaque() {
    var s = mkS(12, 12), x, y;
    for (y = 0; y < 12; y++) for (x = 0; x < 12; x++) {
      var b = x === 0 || y === 0 || x === 11 || y === 11, c = b ? SANG : MAG;
      if ((x === 2 || x === 9) && (y === 2 || y === 9)) c = ROSE;
      dotS(s, x, y, c);
    }
    return s;
  }
  function bCarcasse(tr) {
    var s = mkS(96, 64), x, y;
    for (y = 0; y < 64; y++) for (x = 0; x < 96; x++) {
      var v = tr.data[(y + 32) * 96 + x];
      if (!v) continue;
      if (y < 4 + ((x * 7) % 5)) continue;                           // le haut déchiqueté
      dotS(s, x, y, v === MAG || v === ROSE || v === BRA || v === OS ? SANG : NP);
    }
    return s;
  }
  function bati() {
    if (SPR) return SPR;
    var tr = bTronc();
    SPR = { tronc: outlineS(tr, NP), tete: outlineS(bTete(), NP), plaque: outlineS(bPlaque(), NP), main0: bMain(), carcasse: outlineS(bCarcasse(tr), NP) };
    return SPR;
  }
  function main16(k) {
    k = ((k % 16) + 16) % 16;
    if (!HANDS[k]) HANDS[k] = outlineS(rotS(bati().main0, k * PI / 8), NP);
    return HANDS[k];
  }
  /* La gaine porte sur les pixels réellement visibles, APRÈS rotation, tramage et flash.
     Couche locale réutilisée : aucune lecture du décor, du masque de mesure ou d'un autre
     module. Le pinceau reprend les primitives entières de gfx ; seul le dessin passe ici.
     Les trous du Bayer et les extrémités des télégraphes ont ainsi aussi leur nuit profonde. */
  var couche = null, gainee = null, menacesVue = null, dessinMonde = true, gx0, gy0, gx1, gy1;
  function ouvrirDessin() {
    var g = N.gfx;
    if (!couche || couche.w !== g.W || couche.h !== g.H) {
      couche = O.mk(g.W, g.H); gainee = O.mk(g.W, g.H); menacesVue = new Uint8Array(g.W * g.H);
    }
    couche.data.fill(0); gx0 = g.W; gy0 = g.H; gx1 = gy1 = -1;
  }
  function pointDessin(x, y, ci) {
    var g = N.gfx;
    x = Math.round(x) - g.ox(); y = Math.round(y) - g.oy();
    if (x < 0 || y < 0 || x >= couche.w || y >= couche.h) return;
    couche.data[y * couche.w + x] = ci;
    gx0 = Math.min(gx0, x); gy0 = Math.min(gy0, y); gx1 = Math.max(gx1, x); gy1 = Math.max(gy1, y);
  }
  function rectangleDessin(x, y, w, h, ci) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) pointDessin(x + i, y + j, ci);
  }
  function ligneDessin(x0, y0, x1, y1, ci) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    for (;;) {
      pointDessin(x0, y0, ci);
      if (x0 === x1 && y0 === y1) break;
      var e2 = err + err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function cercleDessin(x, y, r, ci, t) {
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    var g = N.gfx;
    for (var j = -r; j <= r; j++) {
      var dx = (Math.sqrt(r * r - j * j) + 0.5) | 0;
      for (var i = -dx; i <= dx; i++) if (t === undefined || t >= 1 || N.pal.dither(x + i - g.ox(), y + j - g.oy(), t)) pointDessin(x + i, y + j, ci);
    }
  }
  function anneauDessin(x, y, r, ci, t) {
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    if (r < 0 || (t !== undefined && !(t > 0))) return;
    var g = N.gfx;
    function pt(px, py) { if (t === undefined || t >= 1 || N.pal.dither(px - g.ox(), py - g.oy(), t)) pointDessin(px, py, ci); }
    var ox = r, oy = 0, err = 1 - r;
    while (ox >= oy) {
      pt(x + ox, y + oy); pt(x - ox, y + oy); pt(x + ox, y - oy); pt(x - ox, y - oy);
      pt(x + oy, y + ox); pt(x - oy, y + ox); pt(x + oy, y - ox); pt(x - oy, y - ox);
      oy++;
      if (err < 0) err += 2 * oy + 1; else { ox--; err += 2 * (oy - ox) + 1; }
    }
  }
  var pinceau = { px: pointDessin, rect: rectangleDessin, line: ligneDessin, circ: cercleDessin,
    ring: anneauDessin, ditherCirc: cercleDessin };
  function fermerDessin() {
    if (gx1 < gx0) return;
    var g = N.gfx, w = couche.w, h = couche.h, d = couche.data, b = gainee.data, ep = R.lisibiliteP10.teteGaine;
    b.fill(0);
    // Dilatation cardinale de l'encre, sans épaissir les gaines déjà présentes.
    for (var y = gy0; y <= gy1; y++) for (var x = gx0; x <= gx1; x++) {
      var i = y * w + x, v = d[i];
      if (!v || v === NP) continue;
      for (var k = 1; k <= ep; k++) {
        if (x >= k && !d[i - k]) b[i - k] = NP;
        if (x + k < w && !d[i + k]) b[i + k] = NP;
        if (y >= k && !d[i - k * w]) b[i - k * w] = NP;
        if (y + k < h && !d[i + k * w]) b[i + k * w] = NP;
      }
    }
    for (var yy = gy0; yy <= gy1; yy++) for (var xx = gx0; xx <= gx1; xx++) {
      var at = yy * w + xx, c = d[at];
      // Au bord du cadre, la gaine se replie vers l'intérieur plutôt que sortir du tampon.
      if (c) b[at] = xx < ep || yy < ep || xx >= w - ep || yy >= h - ep ? NP : c;
    }
    if (dessinMonde) for (var p = 0; p < b.length; p++) if (b[p]) menacesVue[p] = b[p];
    g.blit(gainee, g.ox(), g.oy());
  }
  /* une pièce à la densité k (1 = pleine), en gardant ses couleurs ; le flash de frappe la blanchit */
  function dp(s, x, y, k, flash, encre) {
    if (!(k > 0)) return;
    var x0 = Math.round(x) - s.cx, y0 = Math.round(y) - s.cy, D = N.pal.dither, g = pinceau, d = s.data, w = s.w;
    for (var j = 0; j < s.h; j++) for (var i = 0; i < w; i++) {
      var v = d[j * w + i];
      if (v && (k >= 1 || D(x0 + i, y0 + j, k))) g.px(x0 + i, y0 + j, v === NP ? NP : flash ? OS : encre === undefined ? v : encre);
    }
  }

  /* ============================ l'état ============================ */
  var st = neuf();
  var POS = { x: 0, y: 0 };
  function neuf() {
    return {
      on: false, fini: false, mort: false, mode: '', t: 0, ph: 0, tComb: 0, enrage: false,
      oeil: null, mains: [null, null], mflash: [0, 0],
      cx: 0, cy: 0, bx: 0, by: 0, z: 0, fl: 0, sol: false,
      atk: null, cd: 0, oeilT: 0, cyc: 0,
      arrT: 0, jaugeT: 0, lastReel: 0, repT: 0, repBan: false,
      mortT: 0, nExpl: 0, carcasse: false, purge: false, purgeT: 0, nPurge: 0, clr: 0, poussiere: 0,
      flashO: 0, ricT: -9, brasierT: 0, vue: false,
      plaques: [], arene: null, mur: null, arriveeZ: 0, aleaDx: 0, aleaDy: 0
    };
  }
  function reset() {
    st = neuf();
    rafraichirTele();
  }
  function al() { return st.enrage ? K.enrAllure : 1; }
  function ivl() { return st.enrage ? K.enrInt : 1; }
  function srcOeil() { return { genre: 'ennemi', type: 'cyclope', id: st.oeil ? st.oeil.id : -1 }; }
  function emitPhase(n, evt) {
    if (N.ev && N.ev.emit) O.safe('colosse.phase', function () { N.ev.emit('phase', { n: n, evt: evt }); });
  }
  // Toutes les échéances appartiennent au transport public, pas au temps ralenti du monde.
  function calerAttaque(a, minimum) {
    if (!N.rythme) return;
    var v = N.rythme.lire(), annonce = N.rythme.annonce(Math.max(K.teleMin, minimum), false);
    a.morceau = v.id; a.debut = v.t; a.dernier = v.t;
    a.tele = annonce.duree; a.t = 0; a.horaires = [];
    var due = annonce.t, n = a.k === 'salve' ? K.salves : a.k === 'salve2' ? a.n : 0;
    for (var i = 0; i < n; i++) {
      if (i > 0) due = N.rythme.subdivision(due + (a.k === 'salve' ? K.ecart : CFG.spiraleDt), a.k === 'salve' ? R.rythme.subdivisions : R.rythme.partition.divisionsSon, false);
      a.horaires.push(due);
    }
    if (N.journal) N.journal('rythme-annonce', { id: st.oeil.id, type: 'cyclope', attaque: a.k, minimum: minimum, total: a.tele, debut: v.t, fin: annonce.t });
  }
  if (N.rythme) N.rythme.on('transport', function () { if (st && st.atk) st.atk.recaler = true; });
  function emitArme(forme, total, cible) {
    if (st.atk) { calerAttaque(st.atk, total); total = st.atk.tele; }
    if (N.ev && N.ev.emit && st.oeil) O.safe('colosse.arme', function () {
      N.ev.emit('arme', { id: st.oeil.id, type: 'cyclope', forme: forme, total: total, cible: cible, shown: visible(), rallonge: false });
    });
  }
  function ban(lignes, c, d) { if (N.hud && typeof N.hud.banniere === 'function') O.safe('hud.banniere', function () { N.hud.banniere(lignes, { c: c || 'rose', duree: d || 2.2 }); }); }
  function visible() {
    var e = st.oeil;
    if (!e) return false;
    if (N.cam && typeof N.cam.shown === 'function') return !!N.cam.shown(e.x, e.y, 6);
    return O.visible(e.x, e.y, -6);
  }
  function dtReel(dt) {
    var h = N.horloge;
    if (h && typeof h.reel === 'function') {
      var r = h.reel(), d = r - st.lastReel;
      st.lastReel = r;
      if (d > 0 && d < 1) return d;
    }
    return dt;
  }
  function nbMains() { var n = 0; for (var i = 0; i < 2; i++) if (st.mains[i] && !st.mains[i]._dead) n++; return n; }
  function pvFloor() { return st.ph >= 3 ? 0 : (3 - st.ph) * K.pvPhase; }

  /* ============================ la naissance des objets ============================ */
  function creer(partie, x, y, pv, r) {
    var o = null;
    if (N.ennemis && typeof N.ennemis.spawn === 'function') o = O.safe('ennemis.spawn', function () { return N.ennemis.spawn('cyclope', x, y, { portail: 0, ext: true }); });
    if (!o) return null;
    o._ext = true; o.boss = true; o.type = 'cyclope'; o.partie = partie; o.r = r; o.pv = pv; o.pvMax = pv;
    o._dead = false; o._st = 'naissance'; o.etat = 'approche'; o._atk = null; o._portail = 0;
    o._m = 'idle'; o._u = 0; o._cutT = 0; o._lx0 = 0; o._ly0 = 0; o._lx1 = 0; o._ly1 = 0; o._len = 1; o._fin = false;
    return o;
  }
  function retirer(o) { if (o) { o._dead = true; o.etat = 'mort'; o.x = -9999; o.y = -9999; } }

  /* R-31 : garde réelle AVANT les glissements propres au CYCLOPE. Les zones et
     le dessin existent dès la demande, pas seulement au premier mouvement. */
  function annoncerArene(rect, duree, ids) {
    st.mur = { rect: rect, duree: duree, ids: ids, t: 0, parti: false };
  }
  function majMurs(dt) {
    var m = st.mur;
    if (!m) return;
    m.t += dt;
    if (!m.parti && m.t >= R.arene.travelling.annonce) {
      m.parti = true;
      if (N.world && typeof N.world.arena === 'function') N.world.arena(m.rect, m.duree);
    }
    // Garder l'attribution jusqu'au dernier pas réellement mobile (caméra mise à jour après nous).
    if (m.parti && N.world && !N.world.enMouvement()) st.mur = null;
  }
  function teleMurs(ajouter) {
    var m = st.mur, w = N.world;
    if (!m || !w) return;
    var rest = Math.max(0, R.arene.travelling.annonce - m.t);
    function cadre(x, y, l, h, reste) {
      ajouter(m.ids[0], 'ligne', x, y, x, y + h, 0, reste, R.arene.travelling.annonce, 'tout', 'murMobile');
      ajouter(m.ids[1], 'ligne', x + l, y, x + l, y + h, 0, reste, R.arene.travelling.annonce, 'tout', 'murMobile');
      ajouter(m.ids[2], 'ligne', x, y, x + l, y, 0, reste, R.arene.travelling.annonce, 'tout', 'murMobile');
      ajouter(m.ids[3], 'ligne', x, y + h, x + l, y + h, 0, reste, R.arene.travelling.annonce, 'tout', 'murMobile');
    }
    cadre(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, rest);
    cadre(m.rect.x, m.rect.y, m.rect.w, m.rect.h, Math.max(0, R.arene.travelling.annonce + m.duree - m.t));
  }
  function dessinerMurs() {
    var m = st.mur;
    if (!m) return;
    var v = O.VUE, a = m.rect, g = pinceau, bord = R.apparitions.naissance.bord;
    // Les cibles hors cadre ont un repère au bord : l'annonce reste visible sur téléphone.
    var x0 = O.clamp(a.x, v.x + bord, v.x + v.w - bord), x1 = O.clamp(a.x + a.w, v.x + bord, v.x + v.w - bord);
    // Le repère projeté doit rester sous les plaques du score et du radar.
    var haut = v.y + (O.geo.safe.t | 0) + (O.geo.portrait ? R.colosse.gaineP32.hautPortrait : R.hud.tempsForts.banniere.hautReserve);
    var y0 = O.clamp(a.y, haut, v.y + v.h - bord), y1 = O.clamp(a.y + a.h, haut, v.y + v.h - bord);
    g.line(x0, y0, x0, y1, MAG); g.line(x1, y0, x1, y1, MAG);
    g.line(x0, y0, x1, y0, MAG); g.line(x0, y1, x1, y1, MAG);
  }

  /* ============================ start / entrée de phase ============================ */
  function start() {
    lire();
    reset();
    bati();
    var P = N.joueuse && N.joueuse.tete, A = O.A;
    st.on = true; st.mode = 'arrivee'; st.t = 0; st.ph = 0;
    st.lastReel = (N.horloge && typeof N.horloge.reel === 'function') ? N.horloge.reel() : 0;
    /* l'arène du combat : 448 × 256 centrée sur la tête, à 80 px au moins du bord du monde */
    var w = K.aw, h = K.ah, mx = P ? P.x : (A.x0 + A.x1) / 2, my = P ? P.y : (A.y0 + A.y1) / 2;
    var xlo = K.aMarge, xhi = K.mondeW - K.aMarge - w, ylo = K.aMarge, yhi = K.mondeH - K.aMarge - h;
    var ax = xhi >= xlo ? O.clamp(mx - w / 2, xlo, xhi) : (K.mondeW - w) / 2;
    var ay = yhi >= ylo ? O.clamp(my - h / 2, ylo, yhi) : (K.mondeH - h) / 2;
    if (!(N.world && typeof N.world.arena === 'function')) { ax = A.x0; ay = A.y0; w = A.x1 - A.x0; h = A.y1 - A.y0; }
    st.arene = { x: ax, y: ay, w: w, h: h };
    annoncerArene(st.arene, K.aDur, R.colosse.entreeHorsVue.mursEntree);
    st.cx = ax + w / 2; st.cy = ay + h / 2;
    st.bx = st.cx; st.by = st.cy;
    st.arriveeZ = Math.max(CFG.arriveeZ, st.cy + R.colosse.corps[1] / 2 - O.VUE.y + R.apparitions.marge + R.apparitions.naissance.bord);
    st.z = st.arriveeZ; st.sol = false;
    st.oeil = creer('oeil', st.cx, st.cy - CFG.dTete - st.z, K.pvTotal, CFG.rOeil);
    for (var i = 0; i < 6; i++) st.plaques.push({ ox: PLQ[i][0], oy: PLQ[i][1], s: 0, t: 0, gx: 0, gy: 0, sx: 0, sy: 0 });
    emitPhase(1, 'arrivee');
    O.sfx('impactBoss');
    rafraichirTele();
    return st.oeil;
  }
  var PLQ = [[-30, -20], [30, -20], [-34, 6], [34, 6], [-26, 32], [26, 32]];

  function finArrivee() {
    st.mode = 'combat'; st.z = 0; st.sol = true;
    O.boom(st.bx, st.by + 40, 0.7, MAG); O.shake(6); O.sfx('impactBoss');
    if (N.cam && typeof N.cam.secousse === 'function') O.safe('cam.secousse', function () { N.cam.secousse(5, 0, 1); });
    entreePhase(1);
  }
  function entreePhase(n) {
    var i, A = O.A;
    st.ph = n; st.mode = 'combat'; st.cyc = 0; st.atk = null; st.cd = 1.2; st.oeilT = 0; st.sol = true; st.z = 0;
    emitPhase(n, 'entree');
    if (n === 1) ban(['PHASE 1', CFG.noms[1]], 'rose', 2.2);
    if (n === 2) {
      var mi = [CFG.rMain, CFG.rMain];
      for (i = 0; i < 2; i++) {
        var marge = Math.ceil(Math.sqrt(R.colosse.main[0] * R.colosse.main[0] + R.colosse.main[1] * R.colosse.main[1])) / 2 + R.apparitions.marge + R.apparitions.naissance.bord;
        var x = i ? O.VUE.x + O.VUE.w + marge : O.VUE.x - marge;
        var m = creer('main', x, st.by - 4, K.pvMain, mi[i]);
        if (m) { m._m = 'idle'; m.ang = PI / 2; }
        st.mains[i] = m;
      }
      for (i = 0; i < 6; i++) {                                      // les plaques tombent et restent au sol
        var p = st.plaques[i], a = O.rr('ennemis', 0, TAU), d = O.rr('ennemis', 50, 92);
        p.s = 1; p.t = 0; p.sx = st.bx + p.ox; p.sy = st.by + p.oy;
        p.gx = O.clamp(st.bx + Math.cos(a) * d, A.x0 + 10, A.x1 - 10); p.gy = O.clamp(st.by + 30 + Math.sin(a) * d * 0.55, A.y0 + 10, A.y1 - 10);
      }
      if (N.dir && typeof N.dir.formation === 'function') O.safe('dir.formation', function () { N.dir.formation(K.entree2, {}); });
    }
    if (n === 3) {
      var ar = st.arene;
      if (ar) {
        var nw = ar.w * (1 - K.aRes), nh = ar.h * (1 - K.aRes), nx = ar.x + (ar.w - nw) / 2, ny = ar.y + (ar.h - nh) / 2;
        st.arene = { x: nx, y: ny, w: nw, h: nh };
        annoncerArene(st.arene, K.aResDur, R.colosse.entreeHorsVue.mursPhase3);
      }
    }
  }

  /* ============================ l'ouverture de l'œil et les dégâts ============================ */
  function oeilVulnerable() { return st.on && st.mode === 'combat' && st.sol && st.oeilT > 0; }
  function ricochet(e) {
    if (O.T.ak - st.ricT < 0.06) return;
    st.ricT = O.T.ak;
    O.sfx('ricochet');
    O.spark(e.x + O.rr('fx', -4, 4), e.y + O.rr('fx', -4, 4), ROSE, 2);
  }
  function indexMain(e) { return st.mains[0] === e ? 0 : st.mains[1] === e ? 1 : -1; }
  function touche(e, dmg, src) {
    if (!st.on || !e) return 0;
    if (e === st.oeil) {
      if (!oeilVulnerable()) { ricochet(e); return 0; }
      var eff = Math.min(dmg, Math.max(0, e.pv - pvFloor()));
      if (eff > 0) { st.flashO = 0.07; O.spark(e.x, e.y, ROSE, 2); }
      return eff;
    }
    var i = indexMain(e);
    if (i >= 0 && st.mode === 'combat' && st.ph === 2 && st.sol) { st.mflash[i] = 0.07; O.spark(e.x, e.y, ROSE, 2); return dmg; }
    ricochet(e);
    return 0;
  }
  function estOeil(id) { return !!st.oeil && st.oeil.id === id; }
  function surKill(c) {
    if (!st.on || !c) return;
    if (st.oeil && c.id === st.oeil.id) { if (st.mode !== 'mort') debutMort(); return; }
    for (var i = 0; i < 2; i++) if (st.mains[i] && c.id === st.mains[i].id) { mainDetruite(i); return; }
  }
  function mainDetruite(i) {
    var m = st.mains[i];
    O.boom(m.x, m.y, 0.5, MAG); O.debris(m.x, m.y, MAG, 8); O.sfx('explosion');
    st.mains[i] = null;
    st.oeilT = Math.max(st.oeilT, K.oeilMain);
    st.cd = Math.max(st.cd, st.oeilT + CFG.gap * ivl());
    if (st.atk && st.atk.k !== 'ciseaux') st.cd = Math.max(st.cd, 0);
    if (st.atk && st.atk.k === 'ciseaux' && !nbMains()) finAtk();
  }

  /* ============================ la dérive du corps ============================ */
  function derive(dt, P, v) {
    var A = O.A, mx = (A.x0 + A.x1) / 2, my = (A.y0 + A.y1) / 2;
    var tx = mx + (P ? O.clamp((P.x - mx) * 0.3, -60, 60) : 0), ty = my, lo, hi;
    lo = A.x0 + 52; hi = A.x1 - 52; tx = lo <= hi ? O.clamp(tx, lo, hi) : mx;
    lo = A.y0 + 56; hi = A.y1 - 56; ty = lo <= hi ? O.clamp(ty, lo, hi) : my;
    var dx = tx - st.cx, dy = ty - st.cy, d = Math.sqrt(dx * dx + dy * dy), s = v * dt;
    if (d > 0.01) { var m = Math.min(d, s); st.cx += dx / d * m; st.cy += dy / d * m; }
  }

  /* ============================ les tirs et le rayon ============================ */
  function tirer(a, v, big) {
    if (!N.ennemis || typeof N.ennemis.tir !== 'function') return;
    N.ennemis.tir(st.bx + Math.cos(a) * TP.cyclopeTirDepart, st.oeil.y + Math.sin(a) * TP.cyclopeTirDepart, Math.cos(a) * v, Math.sin(a) * v, { r: 2, big: true, src: srcOeil(), rythmeDivision: st.atk && st.atk.k === 'salve2' ? R.rythme.partition.divisionsSon : R.rythme.subdivisions });
  }
  function laser(x0, y0, x1, y1, dur, w) {
    var src = srcOeil(), z = null;
    if (N.ennemis && typeof N.ennemis.rayon === 'function') z = O.safe('ennemis.rayon', function () { return N.ennemis.rayon(x0, y0, x1, y1, dur, w, src); });
    if (!z && N.ennemis && N.ennemis.lasers) { z = { x0: x0, y0: y0, x1: x1, y1: y1, t: 0, d: dur, w: w, src: src, _dead: false }; N.ennemis.lasers.push(z); }
    return z;
  }
  function viderLasers() {
    var L = N.ennemis && N.ennemis.lasers;
    if (!L) return;
    for (var i = 0; i < L.length; i++) if (L[i].src && L[i].src.type === 'cyclope') L[i]._dead = true;
  }
  function effacer(r) { if (N.ennemis && typeof N.ennemis.effacerTirs === 'function') O.safe('ennemis.effacerTirs', function () { N.ennemis.effacerTirs(st.bx, st.by, r); }); }

  /* ============================ les attaques ============================ */
  function choix() {
    var n = st.cyc++;
    if (st.ph === 1) return (n % 2 === 0) ? 'rayon' : 'salve';
    if (st.ph === 2) return (nbMains() && n % 2 === 0) ? 'ciseaux' : 'salve';
    return (n % 2 === 0) ? 'bond' : 'salve2';
  }
  function clip(x, y, ux, uy) {                                      // la droite (x,y,u) découpée à l'arène, marge 8
    var A = O.A, t0 = -CFG.mainLigneMax, t1 = CFG.mainLigneMax, m = 8;
    function bord(p, u, lo, hi) {
      if (Math.abs(u) < 1e-6) return;
      var a = (lo - p) / u, b = (hi - p) / u;
      if (a > b) { var s = a; a = b; b = s; }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
    }
    bord(x, ux, A.x0 + m, A.x1 - m); bord(y, uy, A.y0 + m, A.y1 - m);
    if (t1 < t0) { t0 = -20; t1 = 20; }
    return { x0: x + ux * t0, y0: y + uy * t0, x1: x + ux * t1, y1: y + uy * t1 };
  }
  function lancer(P) {
    var k = choix(), a = { k: k, t: 0, phase: 0, tele: K.teleMin }, A = O.A, i;
    st.atk = a; st.oeilT = 0;
    O.sfx('arme');
    if (k === 'rayon') {
      var ang = P ? Math.atan2(P.y - st.oeil.y, P.x - st.bx) : 0;
      a.dir = O.rf('ennemis') < 0.5 ? -1 : 1;
      a.a0 = ang - a.dir * CFG.rayonDepart * PI / 180; a.sweep = K.rayonDeg * PI / 180;
      a.tele = Math.max(K.teleMin, K.rayonVise); a.dur = K.rayonDur / al(); a.las = null;
      emitArme('secteur', a.tele, 'tout');
    } else if (k === 'salve') {
      a.tele = Math.max(K.teleMin, K.charge); a.fired = 0; a.base = O.rr('ennemis', 0, TAU / K.balles);
      emitArme('disque', a.tele, 'tout');
    } else if (k === 'salve2') {
      a.tele = Math.max(K.teleMin, K.charge); a.n = K.salveDouble * K.balles3; a.fired = 0; a.base = O.rr('ennemis', 0, TAU);
      emitArme('disque', a.tele, 'tout');
    } else if (k === 'ciseaux') {
      a.tele = Math.max(K.teleMin, K.ciseaux, 0.9); a.lignes = [];
      var X = P ? P.x : st.cx, Y = P ? P.y : st.cy;
      X = O.clamp(X, A.x0 + 20, A.x1 - 20); Y = O.clamp(Y, A.y0 + 20, A.y1 - 20);
      var al0 = O.rr('ennemis', 0, PI), al1 = al0 + PI / 2 + O.rr('ennemis', -0.35, 0.35), n = 0;
      for (i = 0; i < 2; i++) {
        var m = st.mains[i];
        if (!m || m._dead) { a.lignes.push(null); continue; }
        var ag = (n === 0) ? al0 : al1, L = clip(X, Y, Math.cos(ag), Math.sin(ag));
        var d0 = O.d2(m.x, m.y, L.x0, L.y0), d1 = O.d2(m.x, m.y, L.x1, L.y1);
        if (d1 < d0) { var tx = L.x0, ty = L.y0; L.x0 = L.x1; L.y0 = L.y1; L.x1 = tx; L.y1 = ty; }
        m._lx0 = L.x0; m._ly0 = L.y0; m._lx1 = L.x1; m._ly1 = L.y1;
        m._len = Math.max(1, Math.sqrt(O.d2(L.x0, L.y0, L.x1, L.y1))); m._u = 0; m._m = 'va'; m._cutT = 0; m._fin = false;
        a.lignes.push(L); n++;
      }
      emitArme('ligne', a.tele, 'tout');
    } else if (k === 'bond') {
      a.tele = Math.max(K.teleMin, K.annonceBond);
      var lx = P ? P.x : st.cx, ly = P ? P.y : st.cy;
      a.lx = O.clamp(lx, A.x0 + 52, Math.max(A.x0 + 52, A.x1 - 52)); a.ly = O.clamp(ly, A.y0 + 56, Math.max(A.y0 + 56, A.y1 - 56));
      a.sx = st.cx; a.sy = st.cy; a.apres = 0;
      emitArme('disque', a.tele, 'tout');
    }
  }
  function finAtk() {
    var a = st.atk, win = 0;
    st.atk = null;
    if (!a) return;
    if (st.ph === 1) win = K.oeil1;
    else if (st.ph === 2 && a.k === 'salve') win = K.oeilSalve;
    if (win > 0) st.oeilT = Math.max(st.oeilT, win);
    st.cd = Math.max(st.oeilT, 0) + CFG.gap * ivl();
    if (st.ph === 1 && st.cyc % K.appelCycles === 0 && N.dir && typeof N.dir.formation === 'function'
        && (!N.ennemis || typeof N.ennemis.count !== 'function' || N.ennemis.count() < CFG.formMax)) {
      O.safe('dir.formation', function () { N.dir.formation(K.appelForm, {}); });
    }
  }
  function ease(u) { u = O.clamp(u, 0, 1); return u * u * (3 - 2 * u); }

  function salvo(a, idx) {                                           // une salve radiale
    var n = K.balles, off = a.base + idx * PI / n;
    for (var j = 0; j < n; j++) tirer(off + j * TAU / n, K.salveVit);
    O.sfx('explosion'); O.shake(2);
  }
  function majAtk(dt, P) {
    var a = st.atk, i, e = st.oeil;
    a.t += dt;
    if (N.rythme) {
      var v = N.rythme.lire();
      if (a.recaler || a.morceau !== v.id || v.t < a.dernier) {
        a.recaler = false;
        // Un nouveau curseur annonce à nouveau la partie qui reste à tirer.
        if (a.phase === 0 || a.k === 'salve' || a.k === 'salve2') {
          calerAttaque(a, a.phase === 0 ? Math.max(K.teleMin, a.tele - a.t) : K.teleMin);
          a.phase = 0;
        }
      }
      a.dernier = v.t;
      if (a.phase === 0 || a.k === 'salve' || a.k === 'salve2') a.t = Math.max(0, v.t - a.debut);
    }
    if (a.phase === 0 && a.t >= a.tele && (a.k === 'salve' || a.k === 'salve2')) a.phase = 1;
    if (a.k === 'rayon') {
      if (a.phase === 0 && a.t >= a.tele) {
        a.phase = 1; a.t = 0;
        var c0 = Math.cos(a.a0), s0 = Math.sin(a.a0);
        a.las = laser(st.bx + c0 * TP.cyclopeRayonDepart, e.y + s0 * TP.cyclopeRayonDepart, st.bx + c0 * CFG.rayonLong, e.y + s0 * CFG.rayonLong, a.dur + 0.3, K.rayonW);
        O.sfx('explosion'); O.shake(3);
      } else if (a.phase === 1) {
        var an = a.a0 + a.dir * a.sweep * O.clamp(a.t / a.dur, 0, 1), c = Math.cos(an), s = Math.sin(an), z = a.las;
        if (z) { z.x0 = st.bx + c * TP.cyclopeRayonDepart; z.y0 = e.y + s * TP.cyclopeRayonDepart; z.x1 = st.bx + c * CFG.rayonLong; z.y1 = e.y + s * CFG.rayonLong; z.t = Math.min(z.t, z.d - 0.05); }
        if (a.t >= a.dur) { if (z) z._dead = true; finAtk(); }
      }
    } else if (a.k === 'salve') {
      while (a.fired < K.salves && (a.horaires ? N.rythme.lire().t + R.rythme.epsilon >= a.horaires[a.fired] : a.t >= a.tele + a.fired * K.ecart)) { salvo(a, a.fired); a.fired++; }
      if (a.fired >= K.salves && a.t >= (a.horaires ? a.horaires[K.salves - 1] - a.debut : a.tele + (K.salves - 1) * K.ecart) + 0.25) finAtk();
    } else if (a.k === 'salve2') {
      var per = K.balles3;
      while (a.fired < a.n) {
        var s2 = (a.fired / per) | 0, i2 = a.fired % per, tt = a.tele + s2 * K.ecart + i2 * CFG.spiraleDt;
        if (a.horaires ? N.rythme.lire().t + R.rythme.epsilon < a.horaires[a.fired] : a.t < tt) break;
        tirer(a.base + (s2 ? -1 : 1) * i2 * CFG.spiralePas + s2 * TP.cyclopeSpiraleDecalage, K.salveVit);
        a.fired++;
      }
      if (a.fired >= a.n && a.t >= (a.horaires ? a.horaires[a.n - 1] - a.debut : a.tele + (K.salveDouble - 1) * K.ecart + per * CFG.spiraleDt) + 0.2) finAtk();
    } else if (a.k === 'ciseaux') majCiseaux(a, dt);
    else if (a.k === 'bond') majBond(a, dt, P);
  }

  /* ---- les ciseaux ---- */
  function majCiseaux(a, dt) {
    var i, m, vivants = 0, vit = CFG.mainVit * al();
    if (!nbMains()) { finAtk(); return; }
    if (a.phase === 0) {
      for (i = 0; i < 2; i++) {
        m = st.mains[i];
        if (!m || m._dead || m._m !== 'va') continue;
        var dx = m._lx0 - m.x, dy = m._ly0 - m.y, d = Math.sqrt(dx * dx + dy * dy), rest = Math.max(0.12, a.tele - a.t);
        var sp = Math.min(420, d / rest) * dt;
        if (d > 0.5) { var mv = Math.min(d, sp); m.x += dx / d * mv; m.y += dy / d * mv; }
        m.ang = Math.atan2(m._ly1 - m._ly0, m._lx1 - m._lx0);
      }
      if (a.t >= a.tele) {
        a.phase = 1; a.t = 0;
        for (i = 0; i < 2; i++) { m = st.mains[i]; if (m && !m._dead && m._m === 'va') { m._m = 'charge'; m.x = m._lx0; m.y = m._ly0; m._u = 0; } }
        O.sfx('explosion'); O.shake(2);
      }
    } else if (a.phase === 1) {
      var P = N.joueuse && N.joueuse.tete;
      for (i = 0; i < 2; i++) {
        m = st.mains[i];
        if (!m || m._dead || m._m !== 'charge') continue;
        vivants++;
        var ox = m.x, oy = m.y;
        m._u += vit * dt / m._len;
        if (m._u >= 1) { m._u = 1; m._m = 'idle'; }
        m.x = m._lx0 + (m._lx1 - m._lx0) * m._u; m.y = m._ly0 + (m._ly1 - m._ly0) * m._u;
        m.ang = Math.atan2(m._ly1 - m._ly0, m._lx1 - m._lx0);
        if (m._cutT > 0) m._cutT -= dt;
        else couperLame(m, ox, oy);
        if (N.fx && typeof N.fx.trail === 'function') N.fx.trail(ox, oy, m.x, m.y, ROSE);
      }
      if (!vivants) { a.phase = 2; a.t = 0; }
    } else if (a.t > 0.9 || mainsRentrees()) finAtk();
  }
  function ancre(i) { return i ? st.bx + CFG.epaule : st.bx - CFG.epaule; }
  function mainsRentrees() {
    for (var i = 0; i < 2; i++) { var m = st.mains[i]; if (m && !m._dead && O.d2(m.x, m.y, ancre(i), st.by - 4) > 36) return false; }
    return true;
  }
  /* la lame coupe le corps : les segments de la joueuse contre la ligne balayée (ce qui est annoncé est ce qui coupe) */
  function couperLame(m, ox, oy) {
    var J = N.joueuse;
    if (!J || typeof J.segs !== 'function' || typeof J.couper !== 'function' || J.etat === 'mort') return;
    if (typeof J.invul === 'function' && J.invul()) return;
    var sg = J.segs(), n = typeof J.len === 'function' ? J.len() : 0, hw2 = CFG.ligneDemi * CFG.ligneDemi;
    for (var k = 2; k < n; k++) {
      if (O.segDist2(sg[2 * k], sg[2 * k + 1], ox, oy, m.x, m.y) < hw2) {
        if (J.couper(k, { genre: 'ennemi', type: 'cyclope', id: m.id }, 'ennemi')) { m._cutT = CFG.mainCut; O.sfx('explosion'); O.spark(sg[2 * k], sg[2 * k + 1], ROSE, 4); }
        return;
      }
    }
  }
  /* ---- le bond ---- */
  function majBond(a, dt, P) {
    if (a.phase === 0) {
      var u = a.t / a.tele, up = O.clamp(a.t / CFG.bondMonte, 0, 1), dn = O.clamp((a.t - (a.tele - CFG.bondChute)) / CFG.bondChute, 0, 1);
      st.sol = false;
      st.z = CFG.bondHaut * ease(up) * (1 - ease(dn));
      var mv = ease(O.clamp((a.t - 0.1) / (a.tele - CFG.bondChute - 0.1), 0, 1));
      st.cx = a.sx + (a.lx - a.sx) * mv; st.cy = a.sy + (a.ly - a.sy) * mv;
      if (a.t >= a.tele) {                                           // il retombe en écrasant
        a.phase = 1; a.t = 0; st.z = 0; st.cx = a.lx; st.cy = a.ly; st.sol = true;
        impact(a);
      }
    } else {
      a.apres += dt;
      if (a.apres >= CFG.bondApres) finAtk();
    }
  }
  function impact(a) {
    var J = N.joueuse, P = J && J.tete, rs = K.ombre + K.rTete, i;
    O.boom(a.lx, a.ly, 0.9, BRA); O.shake(9); O.hitstop(3); O.sfx('impactBoss'); O.ringFx(a.lx, a.ly, K.ombre + 8, MAG, 0.4);
    if (N.cam && typeof N.cam.secousse === 'function') O.safe('cam.secousse', function () { N.cam.secousse(8, 0, 1); });
    if (N.decor && typeof N.decor.ondule === 'function') O.safe('decor.ondule', function () { N.decor.ondule(a.lx, a.ly, 1); });
    if (P && J.etat !== 'mort' && !(typeof J.invul === 'function' && J.invul())) {
      if (O.d2(P.x, P.y, a.lx, a.ly) < rs * rs) { J.tuer('ennemi', srcOeil()); }
      else if (typeof J.segs === 'function' && typeof J.couper === 'function') {
        var sg = J.segs(), n = typeof J.len === 'function' ? J.len() : 0, r2 = (K.ombre + 3.5) * (K.ombre + 3.5);
        for (i = 2; i < n; i++) if (O.d2(sg[2 * i], sg[2 * i + 1], a.lx, a.ly) < r2) { J.couper(i, srcOeil(), 'ennemi'); break; }
      }
    }
    st.oeilT = K.oeil3;
    if (!N.ennemis || typeof N.ennemis.spawn !== 'function') return;
    var vivantes = 0, L = N.ennemis.list;
    for (i = 0; i < L.length; i++) if (L[i].type === 'mine' && !L[i]._dead) vivantes++;
    var A = O.A, a0 = O.rr('ennemis', 0, TAU);
    for (i = 0; i < K.mines && vivantes < CFG.minesMax; i++, vivantes++) {
      var ag = a0 + i * TAU / K.mines, mx = O.clamp(a.lx + Math.cos(ag) * CFG.mineRayon, A.x0 + 10, A.x1 - 10), my = O.clamp(a.ly + Math.sin(ag) * CFG.mineRayon, A.y0 + 10, A.y1 - 10);
      O.safe('ennemis.spawn', function () { N.ennemis.spawn('mine', mx, my, { portail: K.poseMines, annoncePose: true, st: 'arme', stT: K.armMines }); });
    }
  }

  /* ============================ les mains au repos ============================ */
  function updMains(dt) {
    for (var i = 0; i < 2; i++) {
      var m = st.mains[i];
      if (!m || m._dead) continue;
      if (st.mflash[i] > 0) st.mflash[i] -= dt;
      if (m._m !== 'idle') continue;
      var tx = ancre(i), ty = st.by - 4 + Math.sin(st.fl * 2 + i * 2) * 3, dx = tx - m.x, dy = ty - m.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.3) { var mv = Math.min(d, CFG.mainAncre * al() * dt); m.x += dx / d * mv; m.y += dy / d * mv; }
      m.ang = O.turnTo(m.ang, PI / 2 + (i ? -0.35 : 0.35), 6 * dt);
    }
  }

  /* ============================ le combat, le répit, l'enragement ============================ */
  function majCombat(dt, P) {
    st.tComb += dt;
    if (!st.enrage && st.tComb >= K.enrApres) mettreEnrage();
    var e = st.oeil;
    if (st.ph < 3 && e.pv <= pvFloor() + 0.5) { debutRepit(); return; }
    if (!(st.atk && st.atk.k === 'bond')) derive(dt, P, CFG.deriveVit * al());
    if (st.oeilT > 0) st.oeilT -= dt;
    majPlaques(dt);
    updMains(dt);
    if (st.atk) majAtk(dt, P);
    else if (st.cd > 0) st.cd -= dt;
    else if (st.oeilT <= 0 && P && visible()) lancer(P);
    if (!st.atk) st.sol = true;
  }
  function mettreEnrage() {
    st.enrage = true;
    if (N.music && N.music.sceneTempo) N.music.sceneTempo('cyclope-enrage');
    ban(["LE CYCLOPE S'EMBALLE"], 'magenta', 2.4);
    emitPhase(st.ph, 'enrage');
    O.sfx('warning');
  }
  function majPlaques(dt) {
    for (var i = 0; i < 6; i++) {
      var p = st.plaques[i];
      if (p.s === 1) {
        p.t += dt;
        if (p.t >= 0.7) { p.s = 2; O.debris(p.gx, p.gy, MAG, 3); }
      }
    }
  }
  function debutRepit() {
    var n = st.ph;
    st.mode = 'repit'; st.repT = 0; st.repBan = false; st.atk = null; st.oeilT = 0; st.z = 0; st.sol = false;
    viderLasers(); effacer(900);
    for (var i = 0; i < 2; i++) if (st.mains[i]) { O.boom(st.mains[i].x, st.mains[i].y, 0.4, MAG); retirer(st.mains[i]); st.mains[i] = null; }
    emitPhase(n, 'repit');
    O.boom(st.bx, st.by - CFG.dTete, 0.6, MAG); O.shake(6); O.sfx('impactBoss');
    if (N.cam && typeof N.cam.secousse === 'function') O.safe('cam.secousse', function () { N.cam.secousse(6, 0, 1); });
    if (N.butin && typeof N.butin.pluie === 'function') O.safe('butin.pluie', function () { N.butin.pluie(K.cellules); });
    ban(['PHASE ' + (n + 1), CFG.noms[n + 1]], n + 1 === 3 ? 'magenta' : 'rose', 2.4);
  }
  function majRepit(dt, P) {
    st.repT += dt;
    derive(dt, P, 40);
    majPlaques(dt);
    if (st.repT >= K.repit) entreePhase(st.ph + 1);
  }

  /* ============================ sa mort ============================ */
  function debutMort() {
    var e = st.oeil, i, L = N.ennemis && N.ennemis.list;
    st.mode = 'mort'; st.mortT = 0; st.atk = null; st.oeilT = 0; st.sol = false; st.nExpl = 0; st.carcasse = false; st.purge = false; st.z = 0;
    viderLasers(); effacer(2000);
    for (i = 0; i < 2; i++) if (st.mains[i]) { retirer(st.mains[i]); st.mains[i] = null; }
    if (L) for (i = 0; i < L.length; i++) if (L[i].type === 'mine' && !L[i]._dead) { O.boom(L[i].x, L[i].y, 0.3, MAG); L[i]._dead = true; L[i].etat = 'mort'; }
    if (N.ennemis && typeof N.ennemis.fuir === 'function') O.safe('ennemis.fuir', function () { N.ennemis.fuir(); });
    O.hitstop(K.mArret); O.shake(12); O.sfx('colosseMort');
    if (N.cam && typeof N.cam.focus === 'function') O.safe('cam.focus', function () { N.cam.focus(st.bx, st.by - 20, K.mCarcasse + 2); });
    st.deadX = e ? e.x : st.bx; st.deadY = e ? e.y : st.by - CFG.dTete;
  }
  function majMort(dt) {
    st.mortT += dt;
    var t = st.mortT, T = K.mCascade, pas = T / Math.max(1, K.mExpl - 1);
    st.clr -= dt;
    if (st.clr <= 0) { st.clr = 0.25; effacer(2000); viderLasers(); }
    while (st.nExpl < K.mExpl && t >= st.nExpl * pas) {
      var c = CFG.mortCascade[st.nExpl % CFG.mortCascade.length], x = st.bx + c[0], y = st.by + c[1], f = st.nExpl === K.mExpl - 1 ? 1 : 0.7 + 0.05 * st.nExpl;
      O.boom(x, y, f, st.nExpl % 2 ? BRA : MAG); O.debris(x, y, OS, 8); O.ringFx(x, y, 30 + st.nExpl * 6, BRA, 0.4); O.sfx(st.nExpl === K.mExpl - 1 ? 'bigkill' : 'explosion');
      O.shake(8 + st.nExpl * 1.2);
      if (N.cam && typeof N.cam.secousse === 'function') O.safe('cam.secousse', function () { N.cam.secousse(K.mCam + 2, st.nExpl % 2 ? 1 : -1, 0.5); });
      if (st.nExpl === 2 || st.nExpl === K.mExpl - 1) st.brasierT = (K.mBrasierImg + 1) / 60;
      st.nExpl++;
    }
    if (t >= T + 0.15) {
      if (!st.carcasse) { st.carcasse = true; st.poussiere = 0; }
      st.poussiere -= dt;
      if (st.poussiere <= 0 && t < T + 0.15 + K.mCarcasse) {
        st.poussiere = 0.1;
        O.debris(st.bx + O.rr('fx', -42, 42), st.by + 52 + O.rr('fx', 0, 10), O.rf('fx') < 0.5 ? ARD : OS, 2);
      }
    }
    if (!st.purge && t >= T + 0.15 + K.mCarcasse) {
      st.purge = true; st.purgeT = 0; st.nPurge = 0;
      if (N.ennemis && typeof N.ennemis.purge === 'function') st.nPurge = O.safe('ennemis.purge', function () { return N.ennemis.purge('proche'); }) | 0;
    }
    if (st.purge) {
      st.purgeT += dt;
      if (st.purgeT >= 0.25 + st.nPurge * K.purgeInt + 0.5) finMort();
    }
  }
  function finMort() {
    if (st.oeil) { st.oeil._dead = true; st.oeil.etat = 'mort'; }
    var n = st.ph || 3;
    st.on = false; st.mort = true; st.fini = true; st.mode = 'fini';
    emitPhase(n, 'mort');
  }

  /* ============================ mise à jour ============================ */
  function arrivee(dt) {
    var d = dtReel(dt);
    st.arrT += d; st.jaugeT += d;
    var u = O.clamp(st.arrT / K.arrivee, 0, 1);
    st.z = (1 - ease(u)) * st.arriveeZ; st.sol = false;
    if (st.arrT >= K.arrivee) finArrivee();
  }
  function update(dt) {
    if (!st.on || !(dt > 0)) return;
    var P = N.joueuse && N.joueuse.tete;
    st.t += dt; st.fl += dt;
    majMurs(dt);
    if (st.flashO > 0) st.flashO -= dt;
    if (st.brasierT > 0) st.brasierT -= dt;
    if (st.mode === 'arrivee') arrivee(dt);
    else if (st.mode === 'combat') majCombat(dt, P);
    else if (st.mode === 'repit') majRepit(dt, P);
    else if (st.mode === 'mort') majMort(dt);
    if (st.on) place(dt, P);
    // 79 met 72 à jour AVANT 73 : republier après déplacements/créations/suppressions du boss.
    // Le pilote du pas suivant voit ainsi les zones du même état que les vrais dangers.
    rafraichirTele();
  }

  function rafraichirTele() {
    if (N.ennemis && N.ennemis.publierTele) N.ennemis.publierTele();
  }
  /* Vue géométrique uniquement : ne déclenche ni RNG, ni son, ni événement, ni dégât.
     Les tirs déjà partis et les lasers actifs appartiennent à 72 ; ici restent les attaques à venir.
     Un secteur est orienté positivement de a0 à a1, quel que soit le sens de balayage.
     Les deux capsules de bord portent la demi-largeur du laser (un secteur seul perdrait ses bords).
     Plusieurs zones peuvent avoir le même id d'attaque ; par.id reste l'id de l'auteur des dégâts. */
  function publierTele(ajouter) {
    var a = st.atk, e = st.oeil, i, j, L, m;
    if (st.on) teleMurs(ajouter);
    if (!st.on || st.mode !== 'combat' || !a || !e || e._dead) return;
    var rest = a.phase === 0 ? Math.max(0, a.tele - a.t) : 0;
    function zone(forme, x0, y0, x1, y1, r, cible, id, rste, total, a0, a1) {
      ajouter(id === undefined ? e.id : id, forme, x0, y0, x1, y1, r,
        rste === undefined ? rest : rste, total === undefined ? a.tele : total, cible, 'cyclope', a0, a1);
    }
    function prevoirTir(ang, delai) {
      var c = Math.cos(ang), s = Math.sin(ang), portee = TP.cyclopeTirDepart + K.salveVit * TP.tirVie;
      zone('ligne', st.bx + c * TP.cyclopeTirDepart, e.y + s * TP.cyclopeTirDepart,
        st.bx + c * portee, e.y + s * portee, R.ennemis.tir.rayon, 'tout', e.id,
        Math.max(0, a.tele + delai - a.t), a.tele + delai);
    }
    if (a.k === 'rayon') {
      var fin = a.a0 + a.dir * a.sweep, lo = Math.min(a.a0, fin), hi = Math.max(a.a0, fin), hw = K.rayonW / 2;
      zone('secteur', st.bx, e.y, st.bx, e.y, CFG.rayonLong + hw, 'tete', e.id, undefined, undefined, lo, hi);
      for (i = 0; i < 2; i++) {
        var ang = i ? fin : a.a0, c = Math.cos(ang), s = Math.sin(ang);
        zone('ligne', st.bx + c * TP.cyclopeRayonDepart, e.y + s * TP.cyclopeRayonDepart, st.bx + c * CFG.rayonLong, e.y + s * CFG.rayonLong, hw, 'tete');
      }
    } else if (a.k === 'salve') {
      for (i = a.fired; i < K.salves; i++) for (j = 0; j < K.balles; j++)
        prevoirTir(a.base + i * PI / K.balles + j * TAU / K.balles, a.horaires ? a.horaires[i] - a.debut - a.tele : i * K.ecart);
    } else if (a.k === 'salve2') {
      for (i = a.fired; i < a.n; i++) {
        var salve = (i / K.balles3) | 0, balle = i % K.balles3;
        prevoirTir(a.base + (salve ? -1 : 1) * balle * CFG.spiralePas + salve * TP.cyclopeSpiraleDecalage,
          a.horaires ? a.horaires[i] - a.debut - a.tele : salve * K.ecart + balle * CFG.spiraleDt);
      }
    } else if (a.k === 'ciseaux' && a.phase <= 1) {
      for (i = 0; i < a.lignes.length; i++) {
        L = a.lignes[i]; m = st.mains[i];
        if (L && m && !m._dead && (a.phase === 0 || m._m === 'charge')) {
          zone('ligne', L.x0, L.y0, L.x1, L.y1, CFG.ligneDemi, 'tout', m.id);
          m.tele = m.id;
        }
      }
    } else if (a.k === 'bond' && a.phase === 0) {
      zone('disque', a.lx, a.ly, a.lx, a.ly, K.ombre, 'tout');
    }
  }
  /* pose les objets du schéma sur le corps : positions, états, lisibilité (-1 ou durée de visibilité) */
  function place(dt, P) {
    var bobx = Math.round(Math.sin(st.fl * 0.9 + 1.2) * 1.5), boby = Math.round(Math.sin(st.fl * 1.6) * CFG.flotte);
    st.bx = st.cx + bobx; st.by = st.cy + boby;
    var e = st.oeil, letal = st.mode === 'combat' && st.sol, i, m;
    if (e && !e._dead) {
      e.x = st.bx; e.y = st.by - CFG.dTete - st.z; e.r = CFG.rOeil;
      e._st = letal ? 'actif' : 'naissance';
      e.etat = st.mode === 'repit' ? 'fuite' : st.atk ? (st.atk.phase === 0 ? 'arme' : 'attaque') : 'approche';
      if (P) e.ang = Math.atan2(P.y - e.y, P.x - e.x);
      e.dir = O.dir16(e.ang); e.img = (e.img + 1) | 0;
      var vis = visible();
      e.vuDepuis = vis ? (e.vuDepuis < 0 ? 0 : e.vuDepuis + dt) : -1;
      if (st.atk && st.atk.phase === 0) e.tele = st.oeil.id; else e.tele = -1;
    }
    for (i = 0; i < 2; i++) {
      m = st.mains[i];
      if (!m || m._dead) continue;
      m._fant = m._m === 'va' || (m._m === 'idle' && O.d2(m.x, m.y, ancre(i), st.by - 4) > 900);   // en route vers sa ligne ou de retour : ni létale ni visable
      m._st = (letal && st.ph === 2 && !m._fant) ? 'actif' : 'naissance';
      m.etat = m._m === 'charge' ? 'attaque' : m._m === 'va' ? 'arme' : 'approche';
      m.dir = O.dir16(m.ang); m.img = (m.img + 1) | 0;
      m.vuDepuis = O.visible(m.x, m.y, -m.r) ? (m.vuDepuis < 0 ? 0 : m.vuDepuis + dt) : -1;
    }
  }

  /* ============================ le dessin du corps (sous la joueuse) ============================ */
  function oeilDessin(x, y, mode) {
    var g = pinceau, P = N.joueuse && N.joueuse.tete;
    if (mode === 'ferme') { g.rect(x - 6, y, 13, 1, SANG); g.rect(x - 5, y + 1, 11, 1, NP); return; }
    if (mode === 'vise') {                                           // fente : il charge
      var on = (Math.floor(O.T.ak * 14) & 1) === 0;
      g.rect(x - 7, y - 1, 15, 3, NP); g.rect(x - 6, y, 13, 1, on ? ROSE : MAG); g.rect(x - 1, y, 3, 1, OS);
      return;
    }
    var ox = 0, oy = 0;
    if (P) { var a = Math.atan2(P.y - y, P.x - x); ox = Math.round(Math.cos(a) * 2); oy = Math.round(Math.sin(a) * 2); }
    g.circ(x, y, 9, SANG); g.circ(x, y, 8, NP); g.circ(x + ox, y + oy, 5, st.enrage ? BRA : ROSE); g.circ(x + ox, y + oy, 2, OS);
    g.px(x + ox - 1, y + oy - 1, OS);
  }
  function vkArrivee() {                                             // le fondu d'arrivée : sang tramé, puis magenta
    return O.clamp(st.arrT / K.arrivee, 0, 1);
  }
  function corps() {
    var S = bati(), bx = st.bx, by = st.by - st.z, e = st.oeil, k = 1, sil = false, i, p;
    if (st.mode === 'arrivee') { var u = vkArrivee(); if (u < 0.45) { sil = true; k = 0.3 + u; } else k = O.clamp((u - 0.45) / 0.4, 0, 1); }
    else if (st.mode === 'repit') {
      var r = st.repT, rr = K.repit;
      k = r < 0.8 ? 1 - 0.82 * (r / 0.8) : r > rr - 0.8 ? 0.18 + 0.82 * ((r - (rr - 0.8)) / 0.8) : 0.18;
      by -= 14 * (1 - (k - 0.18) / 0.82);
    }
    var tremble = st.mode === 'mort' ? ((Math.floor(O.T.ak * 30) & 1) ? 1 : -1) : 0;
    bx += tremble;
    if (st.mode === 'mort' && st.carcasse) {                         // la carcasse tombe dans la poussière
      var uc = O.clamp((st.mortT - K.mCascade - 0.15) / K.mCarcasse, 0, 1);
      dp(S.carcasse, bx, by + 32 + uc * uc * 66, 1 - uc * 0.95, false);
      return;
    }
    /* les plaques tombées restent au sol, sous le corps */
    for (i = 0; i < 6; i++) {
      p = st.plaques[i];
      if (p.s === 1) { var f = O.clamp(p.t / 0.7, 0, 1); dp(S.plaque, p.sx + (p.gx - p.sx) * f, p.sy + (p.gy - p.sy) * f * f + (1 - f) * -6, 1, false); }
      else if (p.s === 2) dp(S.plaque, p.gx, p.gy, 1, false);
    }
    var fl = st.flashO > 0 && (st.mode === 'combat');
    var hy = by - CFG.dTete, ty = by + 16;
    if (sil) {
      dp(S.tronc, bx, ty, k, false, SANG); dp(S.tete, bx, hy, k, false, SANG);
      return;
    }
    if (st.ph === 1 || st.mode === 'arrivee') {                      // les mains encore au corps
      dp(main16(4), bx - CFG.epaule, by - 4, k, false); dp(main16(4), bx + CFG.epaule, by - 4, k, false);
    }
    dp(S.tronc, bx, ty, k, false);
    if (st.ph < 2 && st.mode !== 'mort') for (i = 0; i < 6; i++) dp(S.plaque, bx + st.plaques[i].ox, by + st.plaques[i].oy, k, false);
    dp(S.tete, bx, hy, k, fl);
    if (k >= 0.5 && st.mode !== 'mort') {
      var eo = (st.mode === 'combat' && oeilVulnerable()) ? 'ouvert' : (st.atk && st.atk.phase === 0) ? 'vise' : (st.atk && st.atk.k === 'rayon') ? 'vise' : 'ferme';
      if (eo === 'ouvert' && st.oeilT < 0.4 && (Math.floor(O.T.ak * 16) & 1)) eo = 'ferme';
      if (fl && eo === 'ouvert') { pinceau.circ(bx, hy + 1, 8, OS); } else oeilDessin(bx, hy + 1, eo);
    } else if (st.mode === 'mort') oeilDessin(bx, hy + 1, 'vise');
  }
  function draw() {
    if (!st.on) return;
    ouvrirDessin();
    dessinMonde = true; menacesVue.fill(0);
    O.safe('colosse.corps', corps);
    /* les mains détachées (phase 2) : lames orientées dans le sens de leur course */
    if (st.ph === 2 && st.mode === 'combat') {
      for (var i = 0; i < 2; i++) {
        var m = st.mains[i];
        if (!m || m._dead) continue;
        dp(main16(O.dir16(m.ang)), m.x, m.y, m._fant ? 0.6 : 1, st.mflash[i] > 0);
      }
    }
    fermerDessin();
  }

  /* ============================ les télégraphes (monde) et la jauge (écran) ============================ */
  function trait(x0, y0, x1, y1, plein) {                           // pointillés qui courent, gainés de nuit profonde ; plein et rose sur la fin
    var g = pinceau, dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) | 0, i, x, y;
    if (L < 1) return;
    var c = dx / L, s = dy / L, nx = -s, ny = c, ph = (O.T.ak * 30) | 0, V = O.VUE;
    for (i = 0; i < L; i++) {
      x = x0 + c * i; y = y0 + s * i;
      if (x < V.x - 2 || y < V.y - 2 || x > V.x + V.w + 2 || y > V.y + V.h + 2) continue;
      g.px(x + nx, y + ny, NP); g.px(x - nx, y - ny, NP);
      if (plein) g.px(x, y, ROSE); else if (((i + 6000 - ph) % 6) < 3) g.px(x, y, MAG);
    }
  }
  function bande(x0, y0, x1, y1, hw, plein) {                       // la bande exacte de la lame : bords en pointillés, fond tramé
    var g = pinceau, dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) | 0, i, j;
    if (L < 1) return;
    var c = dx / L, s = dy / L, nx = -s, ny = c, D = N.pal.dither, V = O.VUE;
    for (i = 0; i < L; i += 1) {
      var x = x0 + c * i, y = y0 + s * i;
      if (x < V.x - 14 || y < V.y - 14 || x > V.x + V.w + 14 || y > V.y + V.h + 14) continue;
      for (j = -hw + 1; j < hw; j += 2) {
        var px = Math.round(x + nx * j), py = Math.round(y + ny * j);
        if (D(px, py, plein ? 0.4 : 0.16)) g.px(px, py, plein ? ROSE : MAG);
      }
    }
    trait(x0 + nx * hw, y0 + ny * hw, x1 + nx * hw, y1 + ny * hw, plein);
    trait(x0 - nx * hw, y0 - ny * hw, x1 - nx * hw, y1 - ny * hw, plein);
  }
  function anneaux(x, y, k, r0, plein) {
    var g = pinceau;
    for (var j = 0; j < 3; j++) {
      var r = r0 * (1 - k) + 12 + j * 5;
      g.ring(x, y, r + 1, NP, 1); g.ring(x, y, r, plein ? ROSE : MAG, 0.5 + 0.5 * k);
    }
  }
  function teles() {
    var a = st.atk, e = st.oeil, g = pinceau, i, plein;
    if (!a || a.phase !== 0 || !e) return;
    plein = a.tele - a.t <= 0.3;
    var k = O.clamp(a.t / a.tele, 0, 1), ex = e.x, ey = e.y;
    if (a.k === 'rayon') {
      var an1 = a.a0 + a.dir * a.sweep, Lr = Math.min(CFG.rayonLong, (O.VUE.w + O.VUE.h) * 0.6);
      trait(ex, ey, ex + Math.cos(a.a0) * Lr, ey + Math.sin(a.a0) * Lr, plein);
      trait(ex, ey, ex + Math.cos(an1) * Lr, ey + Math.sin(an1) * Lr, plein);
      for (i = 1; i < 25; i++) {                                    // l'arc tramé sur tout le secteur balayé
        var ai = a.a0 + a.dir * a.sweep * i / 25, ca = Math.cos(ai), sa = Math.sin(ai);
        for (var r = 12; r < Lr; r += 3) {
          var px = Math.round(ex + ca * r), py = Math.round(ey + sa * r);
          if (px < O.VUE.x || py < O.VUE.y || px > O.VUE.x + O.VUE.w || py > O.VUE.y + O.VUE.h) break;
          if (((px + py) & 1) === 0 && N.pal.dither(px, py, plein ? 0.5 : 0.28)) g.px(px, py, plein ? ROSE : MAG);
        }
      }
      anneaux(ex, ey, k, 24, plein);
    } else if (a.k === 'salve' || a.k === 'salve2') {
      anneaux(ex, ey, k, 40, plein);
      var n = a.k === 'salve' ? K.balles : K.balles3, off = a.base;
      for (i = 0; i < n; i++) {                                     // les directions exactes de la première salve
        var ag = off + i * TAU / n, c = Math.cos(ag), s = Math.sin(ag);
        g.line(ex + c * 14, ey + s * 14, ex + c * 26, ey + s * 26, NP);
        g.line(ex + c * 15, ey + s * 15, ex + c * 25, ey + s * 25, plein ? ROSE : MAG);
      }
    } else if (a.k === 'ciseaux') {
      for (i = 0; i < a.lignes.length; i++) { var L = a.lignes[i]; if (L) bande(L.x0, L.y0, L.x1, L.y1, CFG.ligneDemi, plein); }
    } else if (a.k === 'bond') {
      var rr0 = K.ombre;
      g.ditherCirc(a.lx, a.ly, rr0, MAG, 0.08 + 0.3 * k);
      g.ring(a.lx, a.ly, rr0 + 1, NP, 1); g.ring(a.lx, a.ly, rr0, plein ? ROSE : MAG, 1);
      g.ring(a.lx, a.ly, rr0 * (1 + 1.2 * (1 - k)) + 2, MAG, 0.5);
      g.line(a.lx - 4, a.ly, a.lx + 4, a.ly, plein ? ROSE : MAG); g.line(a.lx, a.ly - 4, a.lx, a.ly + 4, plein ? ROSE : MAG);
    }
  }
  var SEUILS = [0.66, 0.33];
  function jauge() {
    var g = pinceau, geo = O.geo, W = geo.W, sf = geo.safe || { l: 0, t: 0 };
    var w = Math.max(60, Math.min(W - 2 * (sf.l | 0) - 40, 240)) | 0, x = ((W - w) / 2) | 0, y = (sf.t | 0) + geo.hudH + 3, h = 5;
    // Gainer les seules pièces réellement dessinées sous la jauge, sans plaque opaque
    // supplémentaire sur le décor. menacesVue est notre propre couche, pas le masque de test.
    var marge = R.colosse.gaineP32.plaqueMarge, reel = N.gfx, owner = reel.owner();
    reel.owner(N.ids.proprietaires.ennemi);
    for (var py = Math.max(0, y - marge); py < Math.min(reel.H, y - marge + R.colosse.gaineP32.plaqueHauteur); py++) {
      for (var px = Math.max(0, x - marge); px < Math.min(reel.W, x + w + marge); px++) if (menacesVue[py * reel.W + px]) reel.px(px, py, NP);
    }
    reel.owner(owner);
    var fill = st.mode === 'arrivee' ? O.clamp(st.jaugeT / K.jauge, 0, 1) : 1;
    var fr = O.clamp(pv(), 0, 1) * fill, fw = Math.round(w * fr);
    g.rect(x - 1, y - 1, w + 2, h + 2, NP);
    g.rect(x, y, w, h, SANG);
    if (fw > 0) g.rect(x, y, fw, h, st.flashO > 0 ? OS : st.enrage ? BRA : MAG);
    if (fw > 0) g.rect(x, y, fw, 1, ROSE);
    for (var i = 0; i < SEUILS.length; i++) g.rect(x + Math.round(w * SEUILS[i]), y - 2, 1, h + 4, OS);
    var nom = CFG.noms[st.ph] || 'LE CYCLOPE';
    fermerDessin();
    O.textC(nom, W / 2, y + h + 3, OS, true, 1);
    ouvrirDessin();
  }
  function drawTop() {
    if (!st.on) return;
    var g = pinceau;
    ouvrirDessin();
    dessinMonde = true;
    O.safe('colosse.murs', dessinerMurs);
    O.safe('colosse.teles', teles);
    if (st.mode === 'mort' && st.brasierT > 0 && (!N.fx || typeof N.fx.flashGate !== 'function' || N.fx.flashGate(15000))) {
      g.ditherCirc(st.bx, st.by - 20, 74, BRA, 0.75);
    }
    fermerDessin();
    O.origine(0, 0);
    ouvrirDessin();
    dessinMonde = false;
    // La jauge et son libellé sont de l'interface, comme le score et le radar.
    var owner = N.gfx.owner(); N.gfx.owner(N.ids.proprietaires.hud);
    O.safe('colosse.jauge', jauge);
    N.gfx.owner(owner);
    fermerDessin();
    O.origineMonde();
  }

  /* ============================ l'interface publiée ============================ */
  function pv() { return st.oeil ? O.clamp(st.oeil.pv / K.pvTotal, 0, 1) : 0; }
  return {
    start: start, reset: reset, update: update, draw: draw, drawTop: drawTop,
    actif: function () { return !!st.on; },
    phase: function () { return st.on || st.mort ? st.ph : 0; },
    pv: pv,
    mort: function () { return !!st.mort; },
    oeil: function () {
      if (!st.on || !st.oeil || st.mode === 'repit') return null;
      POS.x = st.oeil.x; POS.y = st.oeil.y;
      return POS;
    },
    estOeil: estOeil, touche: touche, surKill: surKill, publierTele: publierTele
  };
})();
