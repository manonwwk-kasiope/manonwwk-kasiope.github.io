/* ===== 70-joueuse.js — N.joueuse : le serpent, ses collisions, sa mort, sa coupe, sa réapparition =====

   SQUELETTE DU LOT 0b (contrat 1.0, CONTRAT.md § 10.2). Propriétaire : lots 3a et 3b. Le code du serpent
   vient de la démo (70-game.js, réparti par le lot 0b) : la trace d'un point par pixel parcouru, les
   segments posés le long de la trace, le virage borné vers le cap visé, le cap gardé quand le doigt se lève
   (J-02), le chevron du cap visé (J-33), les sprites de 40-sprites.js avec leur repli procédural.
   Ce qui change avec le contrat 1.0 :
     - les chiffres viennent de N.R (vitesse par moment, virage = v / rayon, longueur de départ, espacement) ;
     - le monde fait 1 024 × 512 : coordonnées MONDE, murs de N.world ;
     - ON PEUT MOURIR (REFONTE.md § 2.3) : le mur tue (après la grâce de N.R.mort.mur.grace), la morsure tue
       (segment ≥ N.R.mort.morsure.segMin, hors des derniers qui ferment le lasso) ; tuer(cause, src) remplit
       S.death et émet 'mort' ; couper(k, src) coupe le corps et émet 'coupe' ;
     - le pas de la joueuse est N.horloge.dtJoueuse() (exemptée des ralentis quand c'est demandé).
   Replis : pas de lasso, pas de pouvoir, pas d'APOGÉE (la jauge se remplit seulement), accélération simple
   tenue au doigt ou à Espace, avec sa réserve. Événements émis : mort, coupe, coup, boost.
   Consommateurs : ramassage (10 : grandir ; 35 : APOGÉE), carte (10 : CROISSANCE), kill (35 : APOGÉE +2),
   lasso (35). Miroirs : S.player, S.death. Flux de hasard : 'joueuse' (aucun tirage dans le repli). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '70-joueuse', TAU = Math.PI * 2;

  function R() { return N.R; }
  function S() { return N.S || null; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrapA(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
  function turnTo(a, want, m) { var d = wrapA(want - a); return wrapA(a + (d > m ? m : d < -m ? -m : d)); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  function dir16(a) { var k = Math.round(a / (Math.PI / 8)); return ((k % 16) + 16) % 16; }
  function I(n) { return N.pal.i(n); }

  /* ================================ état ================================ */
  var P = { x: 512, y: 256, ang: 0, vise: 0, vit: 68, len: 8, etat: 'absent', invul: 0, boost: false, reserve: 100,
    apogee: 0, gone: 0, murT: 0, god: false, t: 0, boostT: 0, panne: 0 };
  var SEGS = new Float32Array(16);
  var DEATH = null;

  /* ---- la trace : un point par pixel parcouru (repris de la démo) ---- */
  var TN = 4096, TX = new Float32Array(TN), TY = new Float32Array(TN), th = 0, tn = 0, tlx = 0, tly = 0;
  function tpush(x, y) { th = (th + 1) % TN; TX[th] = x; TY[th] = y; if (tn < TN) tn++; tlx = x; tly = y; }
  function esp() { return (R() && R().longueur && R().longueur.espacement) || 5; }
  function lenMax() { var m = N.cartes && N.cartes.mods; return (m && m.lenMax) || (R() && R().longueur && R().longueur.max) || 40; }
  function trailReset(x, y, a, len) {
    th = 0; tn = 0;
    var need = (len + 3) * esp() + 2, c = Math.cos(a), s = Math.sin(a);
    for (var i = need; i >= 0; i--) tpush(x - c * i, y - s * i);
  }
  function trailStep(x, y) {
    var dx = x - tlx, dy = y - tly, d = Math.sqrt(dx * dx + dy * dy), g = 0;
    while (d >= 1 && g++ < 400) { tpush(tlx + dx / d, tly + dy / d); dx = x - tlx; dy = y - tly; d = Math.sqrt(dx * dx + dy * dy); }
  }
  var SPX = 0, SPY = 0;
  function segAt(k) { var b = Math.round(k * esp()); if (b >= tn) b = tn - 1; var j = (th - b + TN) % TN; SPX = TX[j]; SPY = TY[j]; }

  /* ---- la vitesse du moment (N.R.joueuse.vitesse), d'après la vague ---- */
  function vitesse() {
    var V = R() && R().joueuse && R().joueuse.vitesse, s = S(), v = s && s.vague, m = 'v1';
    if (v) { if (v.etape === 'defile') m = 'defile'; else if (v.n >= 6) m = 'cyclope'; else if (v.n >= 1) m = 'v' + v.n; }
    return (V && V[m]) || 68;
  }

  /* ================================ miroirs ================================ */
  function miroir() {
    var s = S(); if (!s) return;
    if (SEGS.length !== P.len * 2) SEGS = new Float32Array(P.len * 2);
    for (var k = 0; k < P.len; k++) { if (k === 0) { SPX = P.x; SPY = P.y; } else segAt(k); SEGS[2 * k] = SPX; SEGS[2 * k + 1] = SPY; }
    var o = s.player;
    if (!o || typeof o !== 'object' || !('angVise' in o)) o = s.player = { x: 0, y: 0, ang: 0, angVise: 0, vit: 0, len: 0, segs: SEGS, etat: 'absent',
      boost: false, reserve: 100, apogee: 0, pouvoirPret: false, pouvoir: null };
    o.x = P.x; o.y = P.y; o.ang = P.ang; o.angVise = P.vise; o.vit = P.vit; o.len = P.len; o.segs = SEGS; o.etat = P.etat;
    o.boost = P.boost; o.reserve = clamp(P.reserve, 0, 100); o.apogee = clamp(P.apogee, 0, 100); o.pouvoirPret = false; o.pouvoir = joueuse.pouvoir;
    joueuse.tete.x = P.x; joueuse.tete.y = P.y; joueuse.tete.ang = P.ang; joueuse.tete.vit = P.vit;
    joueuse.etat = P.etat; joueuse.apogee = P.apogee; joueuse.boost = P.boost;
  }

  /* ================================ la mort et la coupe ================================ */
  function auteurDe(cause, src) {
    if (cause === 'morsure') return 'corps';
    if (!src) return cause === 'mur' ? 'mur' : 'mur';
    if (src.genre === 'ennemi') return (N.ids && N.ids.auteurs.indexOf(src.type) >= 0) ? src.type : 'cyclope';
    if (src.genre === 'arene') return src.type === 'convoi' ? 'convoi' : 'murMobile';
    if (src.genre === 'decor') return (N.world && N.world.enMouvement && N.world.enMouvement()) ? 'murMobile' : 'mur';
    return 'mur';
  }
  function vagueCourante() { var s = S(), v = s && s.vague; return v ? { n: v.n | 0, q: v.quartier || 'docks' } : { n: 1, q: 'docks' }; }
  function auteurObj(src) {
    if (!src || src.id === null || src.id === undefined || src.id < 0 || !N.ennemis || !N.ennemis.list) return null;
    var L = N.ennemis.list;
    for (var i = 0; i < L.length; i++) if (L[i].id === src.id) return L[i];
    return null;
  }
  function protege() { return P.god || P.invul > 0 || P.etat !== 'vivant'; }

  function tuer(cause, src) {
    if (protege()) return false;
    if (!N.ids || N.ids.causes.indexOf(cause) < 0) cause = 'ennemi';
    var s = S(), v = vagueCourante(), e = auteurObj(src), t = (N.horloge && N.horloge.t) ? N.horloge.t() : 0;
    var vis = cause === 'mur' || cause === 'morsure' || cause === 'traine' ? 0 : (e && e.vuDepuis >= 0 ? e.vuDepuis : 0);
    var tele = 0;
    if (e && e.tele >= 0 && s && s.tele) for (var i = 0; i < s.tele.length; i++) if (s.tele[i].id === e.tele) tele = s.tele[i].total;
    DEATH = { cause: cause, auteur: auteurDe(cause, src), auteurId: (src && typeof src.id === 'number' && src.id >= 0) ? src.id : null,
      x: P.x, y: P.y, t: t, vague: v.n, quartier: v.q, visibleDepuis: vis, teleDuree: tele };
    if (s) s.death = DEATH;
    P.etat = 'mort'; P.gone = 0; P.boost = false;
    miroir();
    if (N.ev) N.ev.emit('mort', N.socle ? N.socle.copier(DEATH) : DEATH);
    return true;
  }

  function couper(k, src) {
    k = k | 0;
    if (protege() || k < 1 || k >= P.len) return false;
    var garde = (R() && R().f && R().f.longueurCoupe) ? R().f.longueurCoupe(k) : Math.max(3, k);
    var reste = Math.min(P.len, garde), perdus = P.len - reste;
    if (perdus <= 0) return false;
    segAt(k);
    var x = SPX, y = SPY, cause = (src && src._cause) || causeDe(src);
    var aut = auteurDe(cause, src), e = auteurObj(src);
    if (N.ev) N.ev.emit('coup', { partie: 'corps', k: k, cause: cause, auteur: aut, auteurId: e ? e.id : null, x: x, y: y, absorbe: false,
      visibleDepuis: e && e.vuDepuis >= 0 ? e.vuDepuis : 0, teleDuree: 0 });
    P.len = reste;
    miroir();
    if (N.ev) N.ev.emit('coupe', { k: k, perdus: perdus, cause: cause, auteur: aut, x: x, y: y });
    return true;
  }
  function causeDe(src) {
    if (!src) return 'ennemi';
    if (src.genre === 'arene') return src.type === 'convoi' ? 'convoi' : 'mur';
    if (src.genre === 'decor') return 'mur';
    return 'ennemi';
  }

  /* ================================ le pas ================================ */
  function update(dt) {
    var dj = (N.horloge && N.horloge.dtJoueuse) ? N.horloge.dtJoueuse() : dt;
    if (!(dj > 0)) { consommer(); miroir(); return; }
    P.t += dj;
    if (P.etat === 'mort') { P.gone += dj * 60 / 2; miroir(); return; }   // désintégration : un segment toutes les 2 images
    if (P.etat === 'absent') { miroir(); return; }
    var s = S(), inp = s && s.input, RB = (R() && R().boost) || {};
    if (inp && inp.mag > 0 && (inp.x || inp.y)) P.vise = Math.atan2(inp.y, inp.x);     // mag 0 : le cap est gardé (J-02)
    /* l'accélération : tenue (doigt tenu, Espace) tant qu'il reste de la réserve */
    var veut = !!(inp && inp.boost) && P.panne <= 0;
    if (veut && P.reserve > 0) { if (!P.boost) { P.boost = true; evt('boost', 'on'); } }
    else if (P.boost) { P.boost = false; evt('boost', 'off'); }
    if (P.boost) { P.reserve -= (RB.conso || 35) * dj; if (P.reserve <= 0) { P.reserve = 0; P.boost = false; P.panne = RB.panne || 2; evt('boost', 'panne'); } }
    else { if (P.panne > 0) P.panne -= dj; P.reserve = Math.min(RB.reserve || 100, P.reserve + (RB.recharge || 22) * dj); }
    var v = vitesse() * (P.boost ? (RB.facteur || 1.6) : 1);
    P.vit = v;
    var vir = (R() && R().f && R().f.virage) ? R().f.virage(vitesse()) : 6.2;
    P.ang = turnTo(P.ang, P.vise, vir * dj);
    P.x += Math.cos(P.ang) * v * dj; P.y += Math.sin(P.ang) * v * dj;
    trailStep(P.x, P.y);
    if (P.invul > 0) P.invul -= dj;
    if (P.etat === 'reapparition' && P.invul <= 0) P.etat = 'vivant';
    consommer();
    collisions(dj);
    miroir();
  }
  function consommer() { var s = S(), inp = s && s.input; if (inp) { inp.pouvoir = false; inp.apogee = false; } }
  function evt(nom, e) { if (N.ev) N.ev.emit(nom, { id: nom, evt: e }); }

  function collisions(dj) {
    if (!N.world || P.etat === 'mort' || P.etat === 'absent') return;
    var rt = (R() && R().mort && R().mort.rayonTete) || 3, w = N.world;
    /* le mur : la tête meurt après la grâce, si elle est sortie de l'arène */
    var dehors = P.x < w.x0 + rt || P.x > w.x1 - rt || P.y < w.y0 + rt || P.y > w.y1 - rt;
    if (dehors) {
      P.murT += dj;
      if (P.murT >= ((R() && R().mort && R().mort.mur && R().mort.mur.grace) || 0.06)) {
        tuer('mur', { genre: 'decor', type: 'mur', id: null });
        /* protégée (invulnérable, réapparition, dbg.god) : retenue au mur, jamais dehors */
        if (P.etat !== 'mort') { P.x = clamp(P.x, w.x0 + rt, w.x1 - rt); P.y = clamp(P.y, w.y0 + rt, w.y1 - rt); }
      }
    } else P.murT = 0;
    if (P.etat !== 'vivant') return;
    /* la morsure : segment ≥ segMin, hors des derniers qui ferment le lasso */
    var RM = (R() && R().mort && R().mort.morsure) || { segMin: 6, derniersFermant: 3, rayon: 5.5, longueurSure: 9 };
    if (P.len > RM.longueurSure) {
      var r2 = RM.rayon * RM.rayon;
      for (var k = RM.segMin; k < P.len - RM.derniersFermant; k++) { segAt(k); if (d2(SPX, SPY, P.x, P.y) < r2) { tuer('morsure', null); return; } }
    }
  }

  /* ================================ le test de collision des autres ================================ */
  var HT = { part: null, k: -1 };
  function hitTest(x, y, r) {
    HT.part = null; HT.k = -1;
    if (P.etat === 'absent' || P.etat === 'mort') return HT;
    var rt = (R() && R().mort && R().mort.rayonTete) || 3, rs = (R() && R().mort && R().mort.coupe && R().mort.coupe.rayonSegment) || 3.5;
    r = r || 0;
    if (d2(x, y, P.x, P.y) < (r + rt) * (r + rt)) { HT.part = 'tete'; HT.k = 0; return HT; }
    var rr = (r + rs) * (r + rs);
    for (var k = 1; k < P.len; k++) {
      segAt(k);
      if (d2(x, y, SPX, SPY) < rr) { HT.part = k >= P.len - 3 ? 'queue' : 'corps'; HT.k = k; return HT; }
    }
    return HT;
  }

  /* ================================ remise à zéro et réapparition ================================ */
  function reset(cfg) {
    cfg = cfg || {};
    var RL = (R() && R().longueur) || { depart: 8 }, w = N.world, cx = w ? (w.x0 + w.x1) / 2 : 512, cy = w ? (w.y0 + w.y1) / 2 : 256;
    if (cfg.reapparition) {
      /* point sûr : le candidat le plus loin des menaces (REFONTE.md § 2.4, repli simple) */
      var best = null, bd = -1, L = (N.ennemis && N.ennemis.list) || [], marge = (R() && R().vies && R().vies.reapparition.margeMurs) || 40;
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * TAU, px = clamp(cx + Math.cos(a) * 120 * ((i & 1) + 0.5), (w ? w.x0 : 0) + marge, (w ? w.x1 : 1024) - marge);
        var py = clamp(cy + Math.sin(a) * 80 * ((i & 1) + 0.5), (w ? w.y0 : 0) + marge, (w ? w.y1 : 512) - marge), dm = 1e9;
        for (var j = 0; j < L.length; j++) if (L[j].etat !== 'mort') dm = Math.min(dm, d2(px, py, L[j].x, L[j].y));
        if (dm > bd) { bd = dm; best = [px, py]; }
      }
      var lr = (R() && R().f && R().f.longueurReapparition) ? R().f.longueurReapparition(P.len) : 8;
      P.x = best ? best[0] : cx; P.y = best ? best[1] : cy; P.len = Math.min(lenMax(), lr);
      P.invul = (R() && R().vies && R().vies.reapparition.invul) || 1; P.etat = 'reapparition';
    } else {
      P.x = typeof cfg.x === 'number' ? cfg.x : cx; P.y = typeof cfg.y === 'number' ? cfg.y : cy;
      P.len = cfg.len || RL.depart || 8; P.invul = 0; P.etat = cfg.etat || 'vivant';
      P.apogee = 0; P.reserve = (R() && R().boost && R().boost.reserve) || 100;
      DEATH = null; var s = S(); if (s) s.death = null;
    }
    P.ang = typeof cfg.ang === 'number' ? cfg.ang : 0; P.vise = P.ang; P.vit = vitesse();
    P.gone = 0; P.murT = 0; P.boost = false; P.panne = 0;
    trailReset(P.x, P.y, P.ang, 64);
    joueuse.pouvoir = null;
    abonner();
    miroir();
  }

  function abonner() {
    if (!N.ev) return;
    N.ev.on('ramassage', 10, function (c) {
      var B = R() && R().butin, n = c.type === 'noyau' ? ((B && B.noyau.segments) || 2) : c.type === 'cellule' ? ((B && B.cellule.segments) || 1) : 0;
      if (n > 0) grandir(n);
    }, QUI);
    N.ev.on('ramassage', 35, function (c) { if (c.type === 'noyau') P.apogee = Math.min(100, P.apogee + ((R() && R().butin.noyau.apogee) || 20)); }, QUI);
    N.ev.on('kill', 35, function () { if (P.etat !== 'mort') P.apogee = Math.min(100, P.apogee + 2); }, QUI);
    N.ev.on('lasso', 35, function (c) { P.apogee = Math.min(100, P.apogee + 3 * (c.n | 0)); }, QUI);
    N.ev.on('carte', 10, function (c) {
      if (c.id === 'croissance') grandir((R() && R().passifs && R().passifs.croissance.segments) || 4);
      if (N.ids && N.ids.pouvoirs.indexOf(c.id) >= 0) joueuse.pouvoir = c.id;
    }, QUI);
  }
  function grandir(n) { P.len = Math.min(lenMax(), P.len + (n | 0)); }

  /* ================================ le dessin (repris de la démo) ================================ */
  var OPT = { ci: 0 };
  function sp(nom, dir, img) {
    if (N.spr && N.spr.get) { var s = N.spr.get(nom, dir, img); if (s && s.data && s.w > 0) return s; }
    return null;
  }
  function put(s, x, y, ink) {
    var cx = s.cx !== undefined ? s.cx : (s.w - 1) >> 1, cy = s.cy !== undefined ? s.cy : (s.h - 1) >> 1;
    if (ink !== undefined) { OPT.ci = ink; N.gfx.blit(s, Math.round(x) - cx, Math.round(y) - cy, OPT); }
    else N.gfx.blit(s, Math.round(x) - cx, Math.round(y) - cy);
  }
  function anim() { var s = S(); return s ? (s.frame | 0) : 0; }
  function draw() {
    if (!N.gfx || !N.pal || P.etat === 'absent') return;
    var g = N.gfx, f = (anim() / 8) | 0, k, blink = P.invul > 0 && ((anim() >> 2) & 1);
    if (g.owner) g.owner(2);
    var debut = P.etat === 'mort' ? Math.floor(P.gone) : 1;
    for (k = P.len - 1; k >= Math.max(1, debut); k--) {
      if (blink && k > 2 && (k & 1)) continue;
      segAt(k);
      var q = P.len - 1 - k, nm = q < 1 ? 'corps:3' : q < 2 ? 'corps:5' : q < 4 ? 'corps:7' : 'corps', s = sp(nm, 0, f + k);
      if (s) put(s, SPX, SPY);
      else g.circ(SPX, SPY, q < 2 ? 1 : 3, I('cyan'));
    }
  }
  function drawTop() {
    if (!N.gfx || !N.pal || P.etat === 'absent') return;
    if (P.etat === 'mort' && P.gone >= 1) return;
    var g = N.gfx;
    if (g.owner) g.owner(1);
    var s = sp('tete', dir16(P.ang), (anim() / 12) | 0);
    if (s) put(s, P.x, P.y); else { g.circ(P.x, P.y, 5, I('cyan')); g.circ(P.x + Math.cos(P.ang) * 2, P.y + Math.sin(P.ang) * 2, 2, I('cyanPale')); }
    /* le cap visé, quand il diffère du cap réel de plus de N.R.joueuse.chevron.ecartDeg (J-33) */
    var ec = ((R() && R().joueuse && R().joueuse.chevron && R().joueuse.chevron.ecartDeg) || 20) * Math.PI / 180;
    if (P.etat !== 'mort' && Math.abs(wrapA(P.vise - P.ang)) > ec) {
      var c = sp('chevron', dir16(P.vise), 0), cx = P.x + Math.cos(P.vise) * 11, cy = P.y + Math.sin(P.vise) * 11;
      if (c) put(c, cx, cy); else g.px(cx, cy, I('cyanPale'));
    }
    if (g.owner) g.owner(0);
  }

  var joueuse = {
    reset: reset, update: update, draw: draw, drawTop: drawTop,
    tete: { x: 512, y: 256, ang: 0, vit: 68 },
    segs: function () { miroir(); return SEGS; },
    len: function () { return P.len; },
    etat: 'absent',
    hitTest: hitTest,
    tuer: tuer, couper: couper, grandir: grandir,
    invul: function () { return P.god || P.invul > 0; },
    pouvoir: null, apogee: 0, boost: false,
    traine: function () { return null; },
    /* crochet du gardien (N.game.dbg.god) : rien ne la tue, elle est retenue au mur */
    _god: function (b) { P.god = !!b; return P.god; }
  };
  N.joueuse = joueuse;
})();
