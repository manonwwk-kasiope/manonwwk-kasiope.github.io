/* ===== 78-hud.js — N.hud : l'interface en jeu (score, vies, chaîne, vague, défi, boutons, bannières) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 8. Le HUD de la démo (70-game.js, réparti par le
   lot 0b) en est le repli : plaques de nuit profonde, score sur sept chiffres en jaune, vies, ligne du défi
   avec son progrès et la fenêtre de chaîne qui se vide, bouton du son en haut à droite, bannière posée
   dans le tiers opposé à la tête, gains flottants qui montent et clignotent avant de partir, repères
   magenta au bord de l'écran pour les ennemis proches hors champ.
   Ce qui change avec le contrat 1.0 : le score, la chaîne, les vies et les défis se lisent dans N.score ;
   la vague dans S.vague ; un bouton PAUSE rejoint le bouton du son (un toucher dessus lève
   S.input.pause, comme la touche P) ; le son passe par les réglages (N.score.profil.reglages).
   Interface : update(dt), draw(), banniere(texte, opts), toast(texte), tag(texte), pop(x, y, texte, opts)
   (x, y MONDE), codex(type) (la première rencontre d'un type). Consommateurs (rang 70) : apparition,
   vague, niveau, carte, defi, deblocage, mort. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '78-hud';
  var EN_JEU = { jeu: 1, nettoyage: 1, defile: 1, alerte: 1, boss: 1, reapparition: 1, vol: 1, mort: 1, attraction: 1, victoire: 1, cartes: 1, pause: 1 };

  function I(n) { return N.pal.i(n); }
  function G() { return N.gfx; }
  function pad(n, k) { var s = '' + Math.max(0, Math.floor(n)); while (s.length < k) s = '0' + s; return s; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function etat() { return N.game && N.game.etat ? N.game.etat() : 'jeu'; }

  /* ---- texte : la police 5 × 7 de N.spr ; sans elle, rien (repli : les plaques restent) ---- */
  var TXO = { ci: 0, contour: true, ombre: false, echelle: 1 }, MSO = { echelle: 1 };
  function txt(str, x, y, c, contour, sc) {
    sc = sc || 1;
    if (!N.spr || !N.spr.text) return str.length * 6 * sc;
    TXO.ci = c; TXO.contour = !!contour; TXO.echelle = sc;
    var s = N.spr.text(str, TXO);
    if (!s || !s.data) return 0;
    var m0 = contour ? sc : 0, top = s.top !== undefined ? s.top : 3 * sc + m0;
    G().blit(s, Math.round(x) - m0, Math.round(y) - top);
    return s.w - (contour ? 2 * sc : 0);
  }
  function larg(str, sc) {
    sc = sc || 1;
    if (N.spr && N.spr.measure) { MSO.echelle = sc; var m = N.spr.measure(str, MSO); if (m) return m.w; }
    return str.length * 6 * sc - sc;
  }
  function txtC(str, cx, y, c, contour, sc) { return txt(str, cx - larg(str, sc) / 2, y, c, contour, sc); }
  function plaque(x, y, w, h) { var g = G(); g.rect(x, y, w, h, I('nuitProfonde')); g.rect(x + 1, y + h, w - 2, 1, I('nuitProfonde')); }

  /* ================================ état ================================ */
  var BAN = [], TOASTS = [], TAGS = [], POPS = [], VUS = {};
  var BTN = { son: { x: 0, y: 0, w: 15, h: 13 }, pause: { x: 0, y: 0, w: 15, h: 13 } };
  var flashSon = 0;
  var SC = { x: 0, y: 0 };

  function banniere(texte, opts) {
    if (BAN.length > 3) BAN.shift();
    BAN.push({ lignes: String(texte).split('\n'), c: (opts && opts.ci !== undefined) ? opts.ci : I('jaune'), t: 0, d: (opts && opts.duree) || ((N.R && N.R.scene && N.R.scene.vague.duree) || 2.5) });
  }
  function toast(texte) { if (TOASTS.length > 3) TOASTS.shift(); TOASTS.push({ s: String(texte), t: 0, d: 1.6 }); }
  function tag(texte) { if (TAGS.length > 2) TAGS.shift(); TAGS.push({ s: String(texte), t: 0, d: 1 }); }
  function pop(x, y, texte, opts) { if (POPS.length > 24) POPS.shift(); POPS.push({ x: x, y: y, s: String(texte), c: (opts && opts.ci !== undefined) ? opts.ci : I('jaune'), t: 0 }); }
  function codex(type) {
    if (VUS[type]) return false;
    VUS[type] = 1;
    var E = N.R && N.R.ennemis && N.R.ennemis[type], nom = (N.ids && N.ids.nom) ? N.ids.nom(type) : String(type).toUpperCase();
    if (E && E.codex) toast(nom + ' : ' + E.codex);
    return true;
  }

  function update(dt) {
    var r = (N.horloge && N.horloge.H) || 1 / 120;          // le HUD s'anime en temps réel, même horloge arrêtée
    var i;
    if (BAN.length) { BAN[0].t += r; if (BAN[0].t >= BAN[0].d) BAN.shift(); }
    for (i = TOASTS.length - 1; i >= 0; i--) { TOASTS[i].t += r; if (TOASTS[i].t >= TOASTS[i].d) TOASTS.splice(i, 1); }
    for (i = TAGS.length - 1; i >= 0; i--) { TAGS[i].t += r; if (TAGS[i].t >= TAGS[i].d) TAGS.splice(i, 1); }
    for (i = POPS.length - 1; i >= 0; i--) { POPS[i].t += r; POPS[i].y -= r * 14; if (POPS[i].t > 0.8) POPS.splice(i, 1); }
    if (flashSon > 0) flashSon -= r;
    /* les boutons : un toucher dans leur cible */
    var s = N.S, T = s && s.input && s.input.taps;
    if (!T || !EN_JEU[etat()]) return;
    for (i = 0; i < T.length; i++) {
      if (dans(BTN.son, T[i].x, T[i].y)) basculerSon();
      else if (dans(BTN.pause, T[i].x, T[i].y) && s.input) s.input.pause = true;
    }
  }
  function dans(b, x, y) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }
  function basculerSon() {
    var g = N.S && N.S.reglages, on = g ? !(g.musique || g.effets) : false;
    if (N.score && N.score.profil && N.score.profil.reglages) N.score.profil.reglages({ musique: on, effets: on });
    flashSon = 0.35;
  }

  /* ================================ dessin ================================ */
  function draw() {
    var g = G(); if (!g || !N.pal || !EN_JEU[etat()]) return;
    var s = N.S || {}, sf = (s.view && s.view.safe) || { l: 0, t: 0, r: 0, b: 0 }, W = g.W, H = g.H, portrait = H > W;
    if (g.owner) g.owner(9);
    var l = (sf.l | 0) + 3, y = (sf.t | 0) + 2, sc = N.score || { score: 0, vies: 3, mult: function () { return 1; } };
    /* score et vies */
    var vies = Math.max(0, sc.vies | 0), sw0 = larg(pad(sc.score, 7), 1);
    plaque(l - 3, y - 2, sw0 + 6 + vies * 7 + 4, 11);
    var sw = txt(pad(sc.score, 7), l, y, I('jaune'), true, 1), lx = l + sw + 6;
    if (g.owner) g.owner(4);
    for (var i = 0; i < vies; i++) {
      var sv = N.spr && N.spr.get ? N.spr.get('vieMini', 0, 0) : null;
      if (sv && sv.data && sv.w > 0 && sv.w <= 7) g.blit(sv, lx + i * 7, y);
      else { g.rect(lx + i * 7, y + 1, 5, 5, I('nuitProfonde')); g.rect(lx + i * 7 + 1, y + 2, 3, 3, I('cyan')); }
    }
    if (g.owner) g.owner(9);
    /* chaîne : ×m et l'objectif écrit (« ×2 DANS 3 ») */
    var ob = sc.objectif ? sc.objectif() : { mult: 1, reste: 0 }, ly = y + 11;
    if (ob.mult > 1 || ob.reste > 0) {
      var tx = '×' + ob.mult + (ob.reste > 0 ? '  ×' + (ob.mult + 1) + ' DANS ' + ob.reste : '');
      plaque(l - 3, ly - 2, larg(tx, 1) + 6, 11); txt(tx, l, ly, ob.mult > 1 ? I('jaune') : I('acier'), true, 1);
    }
    /* la vague et son défi, au centre */
    var v = s.vague, dv = sc.defiVague;
    if (v && v.nom) {
      var cy = portrait ? y + 22 : y, nom = (v.etape === 'defile' ? '' : (v.n >= 6 ? '' : 'V' + v.n + ' ')) + v.nom;
      var nw = larg(nom, 1), x0 = Math.round(W / 2 - nw / 2);
      plaque(x0 - 3, cy - 2, nw + 6, 11); txt(nom, x0, cy, I('os'), true, 1);
      if (dv) {
        var dt2 = (dv.etat === 'reussi' ? '✓ ' : dv.etat === 'rate' ? '✗ ' : '') + dv.nom, dw = larg(dt2, 1), dx = Math.round(W / 2 - dw / 2);
        plaque(dx - 3, cy + 9, dw + 6, 11); txt(dt2, dx, cy + 11, dv.etat === 'reussi' ? I('jaune') : dv.etat === 'rate' ? I('rosePale') : I('acier'), true, 1);
      }
    }
    /* boutons : son et pause */
    var bx = W - (sf.r | 0) - 17, by = (sf.t | 0) + 1;
    BTN.son.x = bx; BTN.son.y = by; BTN.pause.x = bx - 18; BTN.pause.y = by;
    var reg = s.reglages, muet = reg ? !(reg.musique || reg.effets) : false;
    bouton(BTN.son, muet ? 'muet' : 'son', flashSon > 0);
    bouton(BTN.pause, 'pause', false);
    /* repères au bord : ennemis proches hors du champ (démo) */
    var cam = N.cam, L = s.enemies || [];
    if (cam) for (i = 0; i < L.length; i++) {
      var e = L[i]; if (e.etat === 'mort' || cam.visible(e.x, e.y, 0)) continue;
      cam.toScreen(e.x, e.y, SC);
      var mx = clamp(SC.x, 3, W - 4), my = clamp(SC.y, (sf.t | 0) + 14, H - 4);
      if ((mx - SC.x) * (mx - SC.x) + (my - SC.y) * (my - SC.y) > 60 * 60) continue;
      g.rect(mx - 2, my - 2, 5, 5, I('nuitProfonde')); g.rect(mx - 1, my - 1, 3, 3, I('magenta'));
    }
    /* gains flottants (MONDE → écran) */
    for (i = 0; cam && i < POPS.length; i++) {
      var p = POPS[i]; if (p.t > 0.6 && (((s.frame | 0) >> 2) & 1)) continue;
      cam.toScreen(p.x, p.y, SC); txtC(p.s, SC.x, SC.y, p.c, true, 1);
    }
    /* étiquettes près de la tête */
    var P = s.player;
    for (i = 0; cam && P && i < TAGS.length; i++) { cam.toScreen(P.x, P.y - 14 - i * 9, SC); txtC(TAGS[i].s, SC.x, SC.y, I('os'), true, 1); }
    /* bannière : une à la fois, dans le tiers opposé à la tête */
    if (BAN.length) {
      var b = BAN[0], wmax = 0, n = b.lignes.length;
      for (i = 0; i < n; i++) wmax = Math.max(wmax, larg(b.lignes[i], 2));
      var hh = n * 18 + 8, w = wmax + 16, hy = P && cam ? (P.y - cam.y) : H / 2;
      var yb = hy > H / 2 ? Math.round(H * 0.18) : Math.round(H * 0.62), k = clamp(b.t / 0.12, 0, 1), ww = Math.round(w * k), xb = Math.round(W / 2 - ww / 2);
      g.rect(xb - 1, yb - 1, ww + 2, hh + 2, I('nuitProfonde')); g.rect(xb, yb, ww, hh, I('nuit'));
      g.rect(xb, yb, ww, 1, b.c); g.rect(xb, yb + hh - 1, ww, 1, b.c);
      if (k >= 1) for (i = 0; i < n; i++) txtC(b.lignes[i], W / 2, yb + 6 + i * 18, i === 0 ? b.c : I('os'), false, 2);
    }
    /* toasts, en bas */
    for (i = 0; i < TOASTS.length; i++) {
      var tw = larg(TOASTS[i].s, 1), tx0 = Math.round(W / 2 - tw / 2), ty = H - (sf.b | 0) - 14 - i * 11;
      plaque(tx0 - 3, ty - 2, tw + 6, 11); txt(TOASTS[i].s, tx0, ty, I('os'), true, 1);
    }
    if (g.owner) g.owner(0);
  }
  function bouton(b, nom, flash) {
    var g = G();
    plaque(b.x, b.y, b.w, b.h);
    if (flash) g.rect(b.x, b.y, b.w, b.h, I('ardoise'));
    var s = N.spr && N.spr.get ? N.spr.get(nom, 0, 0) : null;
    if (s && s.data && s.w > 0) g.blit(s, b.x + ((b.w - s.w) >> 1), b.y + ((b.h - s.h) >> 1));
    else g.rect(b.x + 4, b.y + 3, 7, 7, I('acier'));
  }

  function abonner() {
    if (!N.ev) return;
    N.ev.on('apparition', 70, function (c) { codex(c.type); }, QUI);
    N.ev.on('vague', 70, function () { /* le nom de la vague se lit dans S.vague */ }, QUI);
    N.ev.on('niveau', 70, function (c) { toast('NIVEAU ' + c.niveau); }, QUI);
    N.ev.on('carte', 70, function (c) { tag((N.ids && N.ids.nom) ? N.ids.nom(c.id) : c.id); }, QUI);
    N.ev.on('defi', 70, function (c) { toast((c.ok ? '✓ DÉFI RÉUSSI' : '✗ DÉFI RATÉ') + (c.prime ? '  +' + c.prime : '')); }, QUI);
    N.ev.on('deblocage', 70, function (c) { toast('DÉBLOQUÉ : ' + ((N.ids && N.ids.nom) ? N.ids.nom(c.id) : c.id)); }, QUI);
    N.ev.on('mort', 70, function () { tag('-1 VIE'); }, QUI);
  }

  N.hud = {
    reset: function () { BAN.length = 0; TOASTS.length = 0; TAGS.length = 0; POPS.length = 0; abonner(); },
    update: update, draw: draw, banniere: banniere, toast: toast, tag: tag, pop: pop, codex: codex
  };
})();
