/* ===== 78-hud.js — N.hud : l'interface en jeu (score, vies, défi, boutons, bannières, gains, marqueurs) =====

   Tiré de 70-game.js (lot 0b) : drawHUD, drawSound, drawBanner, drawPops, drawGhost, drawEdgeTicks. Tout est écrit
   en police 5×7, rangé dans la zone sûre (S.view.safe), sur des plaques de nuit profonde. En ESPACE ÉCRAN : le
   monde se convertit en retranchant la vue (O.VUE) ; 90-boot.js l'appelle (N.hud.draw()) après avoir remis
   l'origine à zéro, et 79-jeu.js le fait à sa place tant que l'ancienne boucle de 90-boot.js est en place.

   CONSOMME : `kill` (rang 70, repli : le gain flottant), `vague` (70, repli de 79-scene : la bannière de la vague),
   `coupe` (70, repli : le tag), `niveau` (70 : toast « NIVEAU n · CARTE AU NETTOYAGE »), `deblocage` (70). Le lot F y ajoute le RADAR
   (48 × 24, § 3.7 : murs courants, vue, tête, ennemis, élites en 2 × 2, noyaux, PASTILLE et TRAQUEUR qui clignotent), les
   CHEVRONS des portails (600 ms avant l'apparition, double pour une élite, triple pour le CYCLOPE) et les marqueurs permanents.
   Interface (§ 7.8) : update(dt), draw(), banniere(texte, opts), toast(texte), tag(texte), pop(x, y, texte, opts),
   codex(type). Ajouts : boutons() (zones tactiles), toucher(x, y) -> 'son'|'pause'|null, reset(). */
N.hud = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var BTN = (R && R.hud && R.hud.bouton && R.hud.bouton.px) || 22;     // 22 px de jeu = 44 pt
  var S = null;
  var ban = null, file = [], toasts = [], tags = [], muteFlash = 0, tuto = { on: false, fade: 0, done: false, a0: 0 };
  var gains = O.pops;                                                  // la réserve de gains flottants de N.outils

  function reset() {
    S = N.S;
    ban = null; file.length = 0; toasts.length = 0; tags.length = 0; muteFlash = 0;
    var P = N.joueuse && N.joueuse.tete;
    var premiere = !(N.score && N.score.records && N.score.records.length);
    tuto = { on: premiere, fade: premiere ? 1 : 0, done: !premiere, a0: P ? P.ang : 0 };
  }

  /* ============================ ce qu'on affiche ============================ */
  var COUL = { jaune: 'JAUNE', rose: 'ROSE', magenta: 'MAGENTA', os: 'OS', acier: 'ACIER' };
  function couleur(c) { return typeof c === 'number' ? c : O[COUL[c] || 'OS']; }
  function banniere(texte, opts) {
    opts = opts || {};
    var b = { lines: Array.isArray(texte) ? texte : [String(texte)], c: couleur(opts.c || 'os'), icon: opts.icone || null, t: 0, d: opts.duree || 2, blink: !!opts.clignote };
    if (!ban) ban = b; else if (file.length < 3) file.push(b);
    return b;
  }
  function toast(texte) { toasts.length = 0; toasts.push({ s: String(texte), t: 0, d: 2.2 }); }
  function tag(texte) { tags.length = 0; tags.push({ s: String(texte), t: 0, d: 1.0 }); }
  function pop(x, y, texte, opts) { O.pop(x, y, texte, couleur((opts && opts.c) || 'jaune')); }
  function codex(type) { toast('NOUVEAU : ' + (N.ids ? N.ids.nom(type) : String(type).toUpperCase())); }

  function update(dt) {
    if (!S) S = N.S;
    if (ban) { ban.t += dt; if (ban.t >= ban.d) ban = file.length ? file.shift() : null; }
    var i;
    for (i = toasts.length - 1; i >= 0; i--) { toasts[i].t += dt; if (toasts[i].t >= toasts[i].d) toasts.splice(i, 1); }
    for (i = tags.length - 1; i >= 0; i--) { tags[i].t += dt; if (tags[i].t >= tags[i].d) tags.splice(i, 1); }
    if (muteFlash > 0) muteFlash -= dt;
    var P = N.joueuse && N.joueuse.tete;
    if (P && !tuto.done && Math.abs(O.wrapA(P.ang - tuto.a0)) > Math.PI / 4) tuto.done = true;
    if (tuto.done && tuto.fade > 0) tuto.fade -= dt * 2.5;
  }

  /* ============================ les boutons (zones tactiles en px de jeu) ============================ */
  var SB = { x: 0, y: 0, w: BTN + 1, h: BTN }, PB = { x: 0, y: 0, w: BTN + 1, h: BTN };
  function boutons() {
    var sf = O.geo.safe, W = O.geo.W;
    SB.x = W - (sf.r | 0) - SB.w; SB.y = sf.t | 0;
    PB.x = SB.x - PB.w - 2; PB.y = SB.y;
    return { son: SB, pause: PB };
  }
  function dans(b, x, y) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }
  function toucher(x, y) { boutons(); return dans(SB, x, y) ? 'son' : dans(PB, x, y) ? 'pause' : null; }
  function flashSon() { muteFlash = 0.35; }

  /* ============================ le dessin ============================ */
  function plate(x, y, w, h) { N.gfx.rect(x, y, w, h, O.NP); N.gfx.rect(x + 1, y + h, w - 2, 1, O.NP); }
  function ecran(x, y) { return { x: x - O.VUE.x, y: y - O.VUE.y }; }

  function drawBoutons() {
    boutons();
    var sf = O.geo.safe, muted = !!(S && S.muted);
    var cx = SB.x + SB.w - 8, y = SB.y + 1;
    plate(cx - 7, y - 1, 15, 13);
    if (muteFlash > 0) N.gfx.rect(cx - 7, y - 1, 15, 13, O.ARDOISE);
    O.put(O.sp(muted ? 'muet:acier' : 'son', 0), cx, y + 5);
    var px = PB.x + PB.w - 8;
    plate(px - 7, y - 1, 15, 13);
    O.put(O.sp('pause:acier', 0), px, y + 5);
  }

  function drawScore() {
    var sf = O.geo.safe, W = O.geo.W, portrait = O.geo.portrait;
    var l = (sf.l | 0) + 3, y = (sf.t | 0) + 2, sc = N.score, vies = sc ? sc.vies : 0, score = sc ? sc.score : 0;
    var VIES = (R && R.vies && R.vies.depart) || 3;
    var hw = O.textW('♥', 1) + 2, nh = Math.max(VIES, vies), sw0 = O.textW(O.pad(score, 7), 1);
    plate(l - 3, y - 2, sw0 + 6 + nh * hw + 4, 11);
    var sw = O.text(O.pad(score, 7), l, y, O.JAUNE, true, 1);
    var lx = l + sw + 6;
    for (var i = 0; i < nh; i++) O.text('♥', lx + i * hw, y, i < vies ? (i >= VIES ? O.JAUNE : O.OS) : O.ARDOISE, true, 1);
    var ligne = 1;                                   // les lignes sous le score : défi (portrait), vague, multiplicateur
    /* le défi : nom, progrès, et l'issue — à droite du radar quand il y tient, sinon sous le score */
    var d = sc ? sc.defi : null, rd = radarRect(), yb = rd.y + rd.h + 4;       // yb : la première ligne libre sous le radar (portrait)
    if (d) {
      var right = SB.x - PB.w - 8, left = rd.x + rd.w + 6;
      var col = d.etat === 'reussi' ? O.JAUNE : d.etat === 'rate' ? O.ACIER : O.OS;
      var tail = d.etat === 'actif' ? ' ' + d.prog + '/' + d.but : (d.etat === 'reussi' ? ' ✓' : ' ✗');
      var nw = O.textW(d.nom, 1), tw = nw + O.textW(tail, 1), cy = y, tx = left;
      if (portrait || tx + tw > right) { if (portrait) { cy = yb; yb += 11; } else cy = y + 11 * ligne++; tx = l; }
      plate(tx - 3, cy - 2, tw + 6, 11);
      O.text(d.nom, tx, cy, col, true, 1);
      O.text(tail, tx + nw, cy, d.etat === 'actif' ? (sc.chaine() > 0 ? O.JAUNE : O.ACIER) : (d.etat === 'reussi' ? O.JAUNE : O.ROSE), true, 1);
      if (d.etat === 'actif' && sc.chaine() > 0) {                  // la fenêtre de chaîne qui se vide
        var f = sc.fenetreRestante();
        N.gfx.rect(tx, cy + 8, Math.round(tw * f), 1, f > 0.3 ? O.JAUNE : O.ROSE);
      }
    }
    /* l'étiquette de vague, sous le radar, en acier */
    var w = N.dir && N.dir.info ? N.dir.info() : null;
    if (w && N.game && (N.game.etat() === 'jeu' || N.game.etat() === 'nettoyage')) {
      var et = 'V' + w.n + ' · ' + w.nom, ew = O.textW(et, 1), ex = portrait ? l : Math.round(W / 2 - ew / 2), ey = portrait ? yb : rd.y + rd.h + 3;
      plate(ex - 3, ey - 2, ew + 6, 11);
      O.text(et, ex, ey, O.ACIER, true, 1);
    }
    /* le multiplicateur de chaîne et son objectif */
    if (sc && sc.chaine() > 0) {
      var mu = sc.mult(), ob = sc.objectif(), txt = '×' + mu + (ob.reste > 0 ? '  ×' + ob.mult + ' DANS ' + ob.reste : ''), yy = y + 11 * ligne++;
      plate(l - 3, yy - 2, O.textW(txt, 1) + 6, 11);
      O.text(txt, l, yy, O.AMBRE, true, 1);
    }
  }

  function drawGains() {
    var g = O.pops;
    for (var i = 0; i < g.length; i++) {
      var p = g[i]; if (p.t > 0.6 && (Math.floor(O.T.ak * 15) & 1)) continue;
      var s = ecran(p.x, p.y); O.textC(p.s, s.x, s.y, p.c, true, 1);
    }
  }

  function drawBanner() {
    if (!ban) return;
    if (ban.blink && (Math.floor(ban.t * 3) & 1)) return;          // bat à 1,5 Hz (G-29)
    var wmax = 0, i, n = ban.lines.length, W = O.geo.W, A = O.A, P = N.joueuse.tete, g = N.gfx;
    for (i = 0; i < n; i++) wmax = Math.max(wmax, O.textW(ban.lines[i], 1));
    var iw = ban.icon ? 12 : 0, w = wmax + 16 + iw, h = n * 11 + 7;
    /* dans le tiers opposé à la tête */
    var pe = ecran(P.x, P.y), ay0 = A.y0 - O.VUE.y, ay1 = A.y1 - O.VUE.y;
    var y = pe.y > (ay0 + ay1) / 2 ? ay0 + 2 : ay1 - h - 2, k = O.clamp(ban.t / 0.12, 0, 1), ww = Math.round(w * k), x = Math.round(W / 2 - ww / 2);
    g.rect(x - 1, y - 1, ww + 2, h + 2, O.NP);
    g.rect(x, y, ww, h, O.NUIT);
    g.rect(x, y, ww, 1, ban.c); g.rect(x, y + h - 1, ww, 1, ban.c);
    if (k < 1) return;
    if (ban.icon) O.text(ban.icon, x + 7, y + Math.round(h / 2) - 3, ban.c, false, 1);
    for (i = 0; i < n; i++) O.textC(ban.lines[i], W / 2 + iw / 2, y + 5 + i * 11, i === 0 ? ban.c : (ban.c === O.JAUNE ? O.OS : O.ACIER), false, 1);
  }

  function drawToasts() {
    var sf = O.geo.safe, W = O.geo.W;
    for (var i = 0; i < toasts.length; i++) {
      var t = toasts[i], w = O.textW(t.s, 1), x = Math.round(W / 2 - w / 2), y = (sf.t | 0) + 26;
      plate(x - 3, y - 2, w + 6, 11);
      O.text(t.s, x, y, O.OS, true, 1);
    }
    for (i = 0; i < tags.length; i++) {
      var P = N.joueuse.tete, e = ecran(P.x, P.y), tw = O.textW(tags[i].s, 1);
      O.text(tags[i].s, Math.round(e.x - tw / 2), Math.round(e.y - 20), O.OS, true, 1);
    }
  }

  /* le pouce fantôme (J-14) : il mime le geste là où le pouce se pose, et s'efface au premier virage */
  function drawGhost() {
    if (!tuto.on || tuto.fade <= 0 || !N.game || N.game.etat() !== 'jeu') return;
    var k = O.clamp(tuto.fade, 0, 1), sf = O.geo.safe, W = O.geo.W, H = O.geo.H, g = N.gfx, t = O.T.t;
    var cx = Math.round(W / 2), cy = O.geo.portrait ? Math.round((O.A.y1 + H - (sf.b | 0)) / 2) : Math.round(H - (sf.b | 0) - 30);
    if (O.hasTouch()) {
      var ph = (t % 1.8) / 1.8, a = -Math.PI / 2 + Math.sin(ph * O.TAU) * 1.1, m = ph < 0.12 ? ph / 0.12 : 1;
      g.ring(cx, cy, 11, O.ACIER, 0.55 * k);
      for (var j = 1; j <= 3; j++) { var b = -Math.PI / 2 + Math.sin((ph - j * 0.025) * O.TAU) * 1.1; g.px(cx + Math.cos(b) * 11 * m, cy + Math.sin(b) * 11 * m, O.ACIER); }
      var px = cx + Math.cos(a) * 11 * m, py = cy + Math.sin(a) * 11 * m;
      g.ditherCirc(px, py, 3, O.OS, k); g.ditherCirc(px, py, 2, O.ACIER, k * 0.6);
    } else {
      /* sans écran tactile, aucun contrôle tactile : les quatre flèches du clavier (J-31) */
      var on = Math.floor(t / 0.6) % 4, keys = [[0, -9], [-9, 0], [0, 0], [9, 0]], lit = [0, 3, 2, 1][on];
      var glyphs = ['↑', '←', '↓', '→'];
      for (var q = 0; q < 4; q++) {
        var kx = cx + keys[q][0], ky = cy + keys[q][1];
        g.rect(kx - 4, ky - 4, 9, 9, O.NP); g.rect(kx - 3, ky - 3, 7, 7, q === lit ? O.ACIER : O.ARDOISE);
        if (k > 0.5) O.textC(glyphs[q], kx + 1, ky - 3, q === lit ? O.NP : O.ACIER, false, 1);
      }
    }
  }

  /* ============================ le radar, les chevrons et les marqueurs (§ 3.7) ============================ */
  var RAD = (R && R.hud && R.hud.radar) || [48, 24];
  var RR = { x: 0, y: 0, w: RAD[0], h: RAD[1] };
  function radarRect() {
    var sf = O.geo.safe; boutons();
    /* centré en haut ; en portrait, trop étroit pour le score : calé contre les boutons (écart assumé au § 3.7) */
    RR.x = O.geo.portrait ? PB.x - RR.w - 4 : Math.round(O.geo.W / 2 - RR.w / 2); RR.y = sf.t | 0;
    return RR;
  }
  function clig(hz) { return (Math.floor(O.T.ak * hz * 2) & 1) === 0; }
  var GROS = { ruche: 1, rival: 1, cyclope: 1 };
  function drawRadar() {
    var g = N.gfx, r = radarRect(), W = O.geo.W, H = O.geo.H, w = N.world, A = O.A, V = O.VUE;
    var wx = w && typeof w.W === 'number' ? 0 : 0, wy = 0, ww = w && w.W ? w.W : W, wh = w && w.H ? w.H : H;
    var ix = r.x + 1, iy = r.y + 1, iw = r.w - 2, ih = r.h - 2;
    function mx(x) { return ix + O.clamp(Math.round((x - wx) / ww * (iw - 1)), 0, iw - 1); }
    function my(y) { return iy + O.clamp(Math.round((y - wy) / wh * (ih - 1)), 0, ih - 1); }
    g.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, O.ACIER); g.rect(r.x, r.y, r.w, r.h, O.NP);
    /* les murs courants (qui bougent avec le TRAVELLING) et la vue, en ardoise */
    var ax0 = mx(A.x0), ax1 = mx(A.x1), ay0 = my(A.y0), ay1 = my(A.y1);
    g.rect(ax0, ay0, ax1 - ax0 + 1, 1, O.ACIER); g.rect(ax0, ay1, ax1 - ax0 + 1, 1, O.ACIER); g.rect(ax0, ay0, 1, ay1 - ay0 + 1, O.ACIER); g.rect(ax1, ay0, 1, ay1 - ay0 + 1, O.ACIER);
    var vx0 = mx(V.x), vx1 = mx(V.x + V.w), vy0 = my(V.y), vy1 = my(V.y + V.h);
    g.rect(vx0, vy0, vx1 - vx0 + 1, 1, O.ARDOISE); g.rect(vx0, vy1, vx1 - vx0 + 1, 1, O.ARDOISE); g.rect(vx0, vy0, 1, vy1 - vy0 + 1, O.ARDOISE); g.rect(vx1, vy0, 1, vy1 - vy0 + 1, O.ARDOISE);
    var i, L = N.ennemis ? N.ennemis.list : [], B = N.butin ? N.butin.list : [], e, b;
    for (i = 0; i < B.length; i++) {
      b = B[i];
      if (b.type === 'noyau') g.px(mx(b.x), my(b.y), O.AMBRE);
      else if (b.type === 'pastille' && clig(2)) g.rect(mx(b.x) - 1, my(b.y) - 1, 2, 2, O.JAUNE);
    }
    for (i = 0; i < L.length; i++) {
      e = L[i];
      if (e._dead) continue;
      if (e.etat === 'portail') { if (clig(2)) g.px(mx(e.x), my(e.y), O.MAGENTA); continue; }     // les portails en attente clignotent
      if (e.type === 'traqueur') { if (clig(2)) g.px(mx(e.x), my(e.y), O.ROSE); }
      else if (e.boss) { g.rect(mx(e.x) - 1, my(e.y) - 1, 3, 3, O.SANG); g.px(mx(e.x), my(e.y), O.MAGENTA); }
      else if (e.elite || GROS[e.type]) { g.rect(mx(e.x), my(e.y), 2, 2, O.MAGENTA); }
      else g.px(mx(e.x), my(e.y), O.MAGENTA);
    }
    var P = N.joueuse && N.joueuse.tete;
    if (P) g.rect(mx(P.x), my(P.y), 2, 1, O.CYANP);                                                // la tête : 2 × 1, en cyan
  }
  /* un chevron de 7 px au bord de la zone sûre, dirigé vers (ex, ey) ; k = 1 (simple), 2 (élite), 3 (CYCLOPE) */
  function chevron(ex, ey, k, c) {
    var g = N.gfx, W = O.geo.W, H = O.geo.H, sf = O.geo.safe, top = (sf.t | 0) + O.geo.hudH + 1;
    var x = O.clamp(ex, (sf.l | 0) + 4, W - (sf.r | 0) - 5), y = O.clamp(ey, top + 4, H - (sf.b | 0) - 5);
    var dx = ex - x, dy = ey - y, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, i, px, py;
    for (i = 0; i < k; i++) {
      px = x - ux * i * 4; py = y - uy * i * 4;
      g.line(px - uy * 3 - ux * 3, py + ux * 3 - uy * 3, px, py, c); g.line(px + uy * 3 - ux * 3, py - ux * 3 - uy * 3, px, py, c);
    }
  }
  /* marqueurs permanents (élites, RIVAL, mines armées, TRAQUEUR, PASTILLE, CYCLOPE) et chevrons des portails qui s'ouvrent */
  function drawMarqueurs() {
    var L = N.ennemis ? N.ennemis.list : [], B = N.butin ? N.butin.list : [], V = O.VUE, W = O.geo.W, H = O.geo.H, sf = O.geo.safe, top = (sf.t | 0) + O.geo.hudH + 1, g = N.gfx, P = N.joueuse && N.joueuse.tete;
    var i, e;
    function hors(x, y) { var ex = x - V.x, ey = y - V.y; return !(ex > 1 && ex < W - 1 && ey > 1 && ey < H - 1); }
    function marque(x, y, taille, c) {
      var ex = x - V.x, ey = y - V.y, px2 = O.clamp(ex, 4, W - 5), py2 = O.clamp(ey, top + 3, H - 5), h = (taille / 2) | 0;
      g.rect(px2 - h - 1, py2 - h - 1, taille + 2, taille + 2, O.NP); g.rect(px2 - h, py2 - h, taille, taille, c);
    }
    function proche(x, y) { return P ? (O.d2(x, y, P.x, P.y) < 200 * 200 ? 7 : 3) : 3; }          // la taille dit la distance
    for (i = 0; i < L.length; i++) {
      e = L[i];
      if (e._dead) continue;
      if (e.etat === 'portail') {
        if (e._portail > 0 && e._portail <= (e.boss ? 1.4 : 0.6) && hors(e.x, e.y)) chevron(O.clamp(e.x - V.x, 0, W), O.clamp(e.y - V.y, 0, H), e.boss ? 3 : e.elite ? 2 : 1, O.MAGENTA);
        continue;
      }
      if (!hors(e.x, e.y)) continue;
      var ex = e.x - V.x, ey = e.y - V.y;
      if (e.boss) { if (clig(3)) marque(e.x, e.y, 7, O.MAGENTA); chevron(O.clamp(ex, 0, W), O.clamp(ey, 0, H), 3, O.SANG); }
      else if (e.elite || e.type === 'rival') { if (clig(3)) { marque(e.x, e.y, proche(e.x, e.y), O.MAGENTA); } }
      else if (e.type === 'traqueur') { if (clig(3)) marque(e.x, e.y, proche(e.x, e.y), O.ROSE); }
      else if (e.type === 'mine' && e.etat === 'arme') { marque(e.x, e.y, 3, O.MAGENTA); }
      else {
        var x = O.clamp(ex, 3, W - 4), y = O.clamp(ey, top + 2, H - 4);
        if (O.d2(x, y, ex, ey) > 45 * 45) continue;
        g.rect(x - 2, y - 2, 5, 5, O.NP); g.rect(x - 1, y - 1, 3, 3, O.MAGENTA);
      }
    }
    for (i = 0; i < B.length; i++) if (B[i].type === 'pastille' && hors(B[i].x, B[i].y) && clig(3)) marque(B[i].x, B[i].y, proche(B[i].x, B[i].y), O.JAUNE);
  }

  function draw() {
    if (!S) S = N.S;
    if (!N.game) return;
    var et = N.game.etat();
    var jeu = et === 'jeu' || et === 'nettoyage' || et === 'defile' || et === 'alerte' || et === 'boss' || et === 'reapparition' || et === 'mort' || et === 'vol' || et === 'victoire' || et === 'cartes' || et === 'pause' || et === 'attraction' || et === 'plongee';
    if (!jeu) return;
    boutons();
    drawMarqueurs();
    drawRadar();
    drawGains();
    drawGhost();
    drawBanner();
    drawToasts();
    drawScore();
    drawBoutons();
  }

  /* ---- les consommateurs de repli (79-scene.js les remplace : il demande ses bannières à ce module) ---- */
  if (N.ev) {
    N.ev.on('kill', 70, function (c) {
      if (N.scene) return;
      var g = N.score && N.score.gain && N.score.gain();
      if (c.src && c.src.genre === 'decor') return;
      if (g && g.pts > 0 && g.x !== null && g.t === O.T.t) pop(c.x, c.y - 8, '+' + g.pts, { c: 'jaune' });
    }, '78-hud');
    N.ev.on('vague', 70, function (c) {
      if (N.scene || c.evt !== 'entree') return;
      banniere(['VAGUE ' + c.n, c.nom], { c: 'jaune', duree: 2.0 });
    }, '78-hud');
    N.ev.on('coupe', 70, function (c) { if (!N.scene) tag('-' + c.perdus); }, '78-hud');
    /* la montée de niveau n'ouvre aucun écran : elle s'annonce, et la carte vient au NETTOYAGE (§ 2.7) */
    N.ev.on('niveau', 70, function (c) { toast('NIVEAU ' + (c.niveau + 1) + ' · CARTE AU NETTOYAGE'); O.sfx('levelup'); }, '78-hud');
    N.ev.on('deblocage', 70, function (c) { toast('DÉBLOQUÉ : ' + String(c.id).toUpperCase()); }, '78-hud');
  }

  return { reset: reset, update: update, draw: draw, banniere: banniere, toast: toast, tag: tag, pop: pop, codex: codex, boutons: boutons, toucher: toucher, flashSon: flashSon };
})();
