/* ===== 80-ecrans.js — N.ui : les écrans (démarrage, titre, cartes, pause, fin) =====

   Tiré de 70-game.js (lot 0b) : drawPause, drawFinBG, drawFinTop. Le lot F y ajoute : l'ÉCRAN DES CARTES au doigt (§ 2.7,
   5.6 : 3 à 5 plaques, rareté lue par l'encre et par les crans, chute à 55 ms d'écart, « CHOISIS n », un toucher n'est
   accepté qu'après la garde de N.R.cartes.garde), la PAUSE (REPRENDRE, cartes prises, défi) et l'ÉCRAN DE FIN (§ 5.6 :
   cause de la mort, progression, score et écart, build, bilan, note, défi, conseil, énergie et PROCHAIN DÉBLOCAGE avec sa
   barre, REJOUER). Les données de la fin viennent de N.score.resume() ; la main des cartes, de N.cartes.main().

   Ce module ne change JAMAIS l'état du jeu : il lit les touchers (N.outils.taps, remplis par 79-jeu.js), dessine,
   et dépose une SORTIE que 79-jeu.js reprend : sortie() -> { ecran, action, index, id } ou null. Seule entorse : sur un
   écran « CHOISIS 2 » ou « CHOISIS 3 », les premiers choix passent par N.cartes.choisir ici même et seul le dernier est
   rendu en sortie (79-jeu l'applique puis lance LE VOL).
   Un toucher commencé avant l'ouverture d'un écran ne compte pas (la garde `garde`).

   Interface (§ 7.8) : ouvrir(nom, opts), fermer(), actif(), update(dt), draw(). Ajouts : sortie(), ecran(), cartes (le repli v0), icone(id, x, y, c), rect(i) (la plaque i, px de jeu), main(). */
N.ui = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = { garde: 0.45, rev: 0.22, chute: 0.055, tombe: 0.2, haut: 70 };   // → N.R : garde de la fin (R.ecrans.fin.garde), chute des cartes (R.ecrans.cartes.entree)
  var CARTES = [                                  // repli sans N.cartes : trois cartes à texte fixe
    { id: 'canon', nom: 'CANON', texte: 'PALIER SUIVANT' },
    { id: 'croissance', nom: 'CROISSANCE', texte: '+5 SEGMENTS' },
    { id: 'cadence', nom: 'CADENCE', texte: 'TIR PLUS VITE' }
  ];
  var DEBNOMS = { ralenti: 'RALENTI', repli: 'REPLI', styles: 'STYLES DE TRAÎNÉE', galerie: 'GALERIE', departV3: 'DÉPART EN V3' };
  var cur = null, T = 0, out = null, choix = 0, cur_opts = {};
  var DARK = null, FINBUF = null;
  var main = [], restant = 1, nChoix = 1, gardeJ = 0, bruit = false;

  function garde() { return (R && R.cartes && R.cartes.garde) || 0.4; }
  function ouvrir(nom, opts) {
    cur = nom; T = 0; out = null; choix = 0; bruit = false;
    cur_opts = opts || {};
    if (nom === 'cartes') {
      /* la main du tirage ; sans N.cartes, le repli v0 */
      if (N.cartes && N.cartes.main) {
        main = O.safe('cartes.main', function () { return N.cartes.main(null, { vague: N.dir && N.dir.vague ? N.dir.vague() : 0, trophee: !!cur_opts.trophee, rareGarantie: !!cur_opts.rareGarantie }); }) || [];
        nChoix = Math.max(1, N.cartes.choix());
      } else { main = CARTES.map(function (c) { return c.id; }); nChoix = 1; }
      restant = nChoix; gardeJ = garde();
      if (!main.length) out = { ecran: 'cartes', action: 'carte', index: 0, id: null };      // vivier vide : on passe
      O.sfx('carte');
    }
    publier();
  }
  function fermer() { cur = null; out = null; publier(); }
  function actif() { return cur !== null; }
  function ecran() { return cur; }
  function sortie() { var o = out; out = null; return o; }
  function publier() {
    var s = N.S; if (!s) return;
    s.ecran = { nom: cur, depuis: T, cartes: cur === 'cartes' ? main.slice() : [], choix: choix, pret: T >= (cur === 'cartes' ? gardeJ : CFG.garde) };
  }

  /* ============================ les entrées ============================ */
  function update(dt) {
    if (!cur) return;
    T += dt;
    var taps = O.taps, i;
    for (i = 0; i < taps.length; i++) {
      var q = taps[i];
      if (q.key === 'KeyM' || (q.key === null && q.bouton === 'son')) continue;         // le bouton son est au HUD
      if (cur === 'demarrage' || cur === 'titre') { if (T >= 0.15) out = { ecran: cur, action: 'jouer' }; }
      else if (cur === 'pause') { if (q.key !== 'Tab') out = { ecran: cur, action: 'reprendre' }; }
      else if (cur === 'fin') { if (T >= CFG.garde && q.key !== 'Tab' && q.key !== 'Escape') out = { ecran: cur, action: 'rejouer' }; }
      else if (cur === 'cartes') entreeCartes(q);
    }
    publier();
  }
  function entreeCartes(q) {
    var n = main.length, k = -1;
    if (!n || out) return;
    if (q.key && /^Digit[1-9]$/.test(q.key)) k = (+q.key.slice(5)) - 1;
    else if (q.key === 'ArrowLeft' || q.key === 'ArrowUp') choix = (choix + n - 1) % n;
    else if (q.key === 'ArrowRight' || q.key === 'ArrowDown') choix = (choix + 1) % n;
    else if (q.key === 'Enter' || q.key === 'Space') k = choix;
    else if (q.key === null) {
      for (var c = 0; c < n; c++) { var rc = rectCarte(c, n); if (q.x >= rc.x && q.x < rc.x + rc.w && q.y >= rc.y && q.y < rc.y + rc.h) { k = c; break; } }
    }
    if (k >= 0 && k < n && T >= gardeJ) prendre(k);
  }
  function prendre(k) {
    var id = main[k];
    if (restant <= 1) { out = { ecran: 'cartes', action: 'carte', index: k, id: id }; return; }
    if (N.cartes && N.cartes.choisir) O.safe('cartes.choisir', function () { N.cartes.choisir(id); });
    O.sfx('choix');
    main.splice(k, 1); restant--; choix = Math.min(choix, main.length - 1); gardeJ = T + 0.3;      // l'écran se re-range, un second toucher accidentel est ignoré
  }

  /* ============================ outils de dessin ============================ */
  function veil() { N.gfx.ditherRect(0, 0, O.geo.W, O.geo.H, O.NP, 0.5); }
  function px() { return (N.gfx && N.gfx.PX) || 2; }
  function cible() { return Math.max(14, Math.ceil(((R && R.cartes && R.cartes.cibleMinPt) || 44) / px())); }      // 44 pt en pixels de jeu
  function encre(r) { var e = R.cartes.encres[r]; return e === 'jaune' ? O.JAUNE : e === 'ambre' ? O.AMBRE : e === 'os' ? O.OS : O.ACIER; }
  function coupe(str, maxW) {
    var mots = String(str).split(' '), lignes = [], cour = '';
    for (var i = 0; i < mots.length; i++) {
      var essai = cour ? cour + ' ' + mots[i] : mots[i];
      if (O.textW(essai, 1) <= maxW || !cour) cour = essai; else { lignes.push(cour); cour = mots[i]; }
    }
    if (cour) lignes.push(cour);
    return lignes;
  }
  /* les deux lignes d'une carte, chacune coupée à la largeur de la plaque */
  function lignesCarte(t, w) { return coupe(t.l1, w).concat(t.l2 ? coupe(t.l2, w) : []); }
  function droite(str, xd, y, c, sc) { return O.text(str, xd - O.textW(str, sc || 1), y, c, false, sc || 1); }
  function romain(n) { return ['', 'I', 'II', 'III', 'IV'][n] || String(n); }

  /* l'icône d'une carte, 15 × 15 autour de (cx, cy) : le sprite de 40-sprites.js quand il le livre, sinon un signe tracé */
  function icone(id, cx, cy, c) {
    var g = N.gfx, cat = N.spr && N.spr.catalogue ? O.safe('spr.catalogue', function () { return N.spr.catalogue(); }) : null;
    if (cat && cat['carte:' + id]) { O.put(O.sp('carte:' + id, 0), cx, cy); return; }
    var i, a;
    switch (id) {
      case 'canon': g.rect(cx - 1, cy - 6, 3, 9, c); g.rect(cx - 4, cy + 3, 9, 3, c); break;
      case 'tourelles': g.circ(cx, cy, 3, c); g.rect(cx - 6, cy - 1, 3, 3, c); g.rect(cx + 4, cy - 1, 3, 3, c); g.rect(cx - 1, cy - 6, 3, 3, c); break;
      case 'arc': g.line(cx - 6, cy + 4, cx - 2, cy - 4, c); g.line(cx - 2, cy - 4, cx + 1, cy + 3, c); g.line(cx + 1, cy + 3, cx + 6, cy - 5, c); break;
      case 'missiles': g.line(cx - 3, cy + 3, cx, cy - 6, c); g.line(cx + 3, cy + 3, cx, cy - 6, c); g.line(cx - 3, cy + 3, cx + 3, cy + 3, c); g.rect(cx - 1, cy + 4, 3, 3, O.AMBRE); break;
      case 'drones': g.ring(cx, cy, 5, c, 1); g.rect(cx - 1, cy - 1, 3, 3, c); break;
      case 'minesQ': g.line(cx, cy - 5, cx + 5, cy, c); g.line(cx + 5, cy, cx, cy + 5, c); g.line(cx, cy + 5, cx - 5, cy, c); g.line(cx - 5, cy, cx, cy - 5, c); g.rect(cx - 1, cy - 1, 3, 3, c); break;
      case 'puissance': g.line(cx, cy - 6, cx, cy + 5, c); g.line(cx - 4, cy - 2, cx, cy - 6, c); g.line(cx + 4, cy - 2, cx, cy - 6, c); break;
      case 'cadence': g.rect(cx - 6, cy, 3, 6, c); g.rect(cx - 1, cy - 3, 3, 9, c); g.rect(cx + 4, cy - 6, 3, 12, c); break;
      case 'aimant': g.rect(cx - 5, cy - 5, 3, 9, c); g.rect(cx + 3, cy - 5, 3, 9, c); g.rect(cx - 5, cy + 3, 11, 3, c); break;
      case 'croissance': g.rect(cx - 6, cy - 1, 13, 3, c); g.rect(cx - 1, cy - 6, 3, 13, c); break;
      case 'reparation': g.ring(cx, cy, 5, c, 1); g.rect(cx - 1, cy - 3, 3, 7, c); g.rect(cx - 3, cy - 1, 7, 3, c); break;
      case 'bouclier': g.rect(cx - 5, cy - 5, 11, 6, c); g.rect(cx - 4, cy + 1, 9, 2, c); g.rect(cx - 2, cy + 3, 5, 2, c); g.px(cx, cy + 5, c); break;
      case 'eperon': g.rect(cx - 6, cy - 1, 8, 3, c); g.line(cx + 2, cy - 5, cx + 6, cy, c); g.line(cx + 6, cy, cx + 2, cy + 5, c); g.line(cx + 2, cy - 5, cx + 2, cy + 5, c); break;
      case 'grappe': for (i = 0; i < 8; i++) { a = i * Math.PI / 4; g.line(cx, cy, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, c); } g.rect(cx - 1, cy - 1, 3, 3, O.OS); break;
      case 'sangFroid': g.line(cx - 5, cy, cx + 5, cy, c); g.line(cx, cy - 5, cx, cy + 5, c); g.line(cx - 4, cy - 4, cx + 4, cy + 4, c); g.line(cx + 4, cy - 4, cx - 4, cy + 4, c); break;
      case 'braise': g.circ(cx, cy + 2, 4, c); g.line(cx, cy - 6, cx - 2, cy, c); g.line(cx, cy - 6, cx + 2, cy, c); g.rect(cx - 1, cy + 1, 3, 3, O.JAUNE); break;
      case 'traversee': g.rect(cx - 1, cy - 6, 3, 13, O.ARDOISE); g.rect(cx - 6, cy - 1, 3, 3, c); g.rect(cx - 1, cy - 1, 3, 3, c); g.rect(cx + 4, cy - 1, 3, 3, c); break;
      case 'ralenti': g.line(cx - 4, cy - 5, cx + 4, cy - 5, c); g.line(cx - 4, cy + 5, cx + 4, cy + 5, c); g.line(cx - 4, cy - 5, cx + 4, cy + 5, c); g.line(cx + 4, cy - 5, cx - 4, cy + 5, c); break;
      case 'repli': g.line(cx - 6, cy, cx - 1, cy, c); g.line(cx + 6, cy, cx + 1, cy, c); g.line(cx - 3, cy - 3, cx - 1, cy, c); g.line(cx - 3, cy + 3, cx - 1, cy, c); g.line(cx + 3, cy - 3, cx + 1, cy, c); g.line(cx + 3, cy + 3, cx + 1, cy, c); break;
      default: g.rect(cx - 3, cy - 3, 7, 7, c);
    }
  }
  function infoCarte(id) {
    if (N.cartes && N.cartes.texte) { var t = O.safe('cartes.texte', function () { return N.cartes.texte(id); }); if (t) return t; }
    for (var i = 0; i < CARTES.length; i++) if (CARTES[i].id === id) return { nom: CARTES[i].nom, l1: CARTES[i].texte, l2: '', tag: 'NOUVEAU', rarete: 'commune' };
    return { nom: String(id), l1: '', l2: '', tag: '', rarete: 'commune' };
  }

  /* ============================ la pause ============================ */
  function pause() {
    var W = O.geo.W, H = O.geo.H, g = N.gfx, bw = Math.min(W - 8, 190), x = Math.round((W - bw) / 2);
    var pr = N.cartes && N.cartes.prises ? N.cartes.prises() : {}, ids = [], k;
    for (k in pr) if (pr[k] > 0) ids.push(k);
    var d = N.score && N.score.defi, ch = cible();
    var bh = 32 + ch + (ids.length ? 24 : 0) + (d ? 14 : 0), y = Math.round(H / 2 - bh / 2);
    veil();
    g.rect(x - 1, y - 1, bw + 2, bh + 2, O.NP); g.rect(x, y, bw, bh, O.NUIT); g.rect(x, y, bw, 1, O.ACIER);
    O.textC('PAUSE', W / 2, y + 6, O.OS, false, 2);
    /* REPRENDRE : une cible de 44 pt, et tout l'écran la valide */
    var cw = Math.min(bw - 16, 120), cx = Math.round(W / 2 - cw / 2), cy = y + 24;
    g.rect(cx - 1, cy - 1, cw + 2, ch + 2, O.NP); g.rect(cx, cy, cw, ch, O.ARDOISE); g.rect(cx, cy, cw, 1, O.JAUNE); g.rect(cx, cy + ch - 1, cw, 1, O.JAUNE);
    O.textC(O.hasTouch() ? 'REPRENDRE' : 'ESPACE : REPRENDRE', W / 2, cy + Math.round(ch / 2) - 3, O.OS, false, 1);
    var yy = cy + ch + 6;
    if (ids.length) {
      var gap = 18, x0 = Math.round(W / 2 - (ids.length * gap - 2) / 2);
      for (var i = 0; i < ids.length; i++) {
        icone(ids[i], x0 + i * gap + 7, yy + 7, N.cartes && N.cartes.rarete ? O.OS : O.OS);
        if (pr[ids[i]] > 1) O.text(String(pr[ids[i]]), x0 + i * gap + 11, yy + 13, O.JAUNE, true, 1);
      }
      yy += 24;
    }
    if (d) O.textC((d.etat === 'reussi' ? '✓ ' : '') + d.nom + (d.etat === 'actif' ? ' ' + d.prog + '/' + d.but : ''), W / 2, yy, d.etat === 'reussi' ? O.JAUNE : O.ACIER, false, 1);
  }

  /* ============================ les cartes ============================ */
  /* la disposition : paysage = plaques côte à côte (120 × 80 ; plus étroites et plus hautes au-delà de trois) ; portrait = plaques empilées 180 × 48 */
  function dims(n) {
    var W = O.geo.W, H = O.geo.H, sf = O.geo.safe, port = O.geo.portrait, gap = 4, w, lh = 9, top = (sf.t | 0) + (port ? 46 : 26), bas = H - (sf.b | 0) - 6;
    var d = { w: 0, h: 0, gap: gap, port: port, top: top, bas: bas }, i;
    if (port) {
      w = Math.min(W - 12, 180); d.w = w;
      var besoin = 48;
      for (i = 0; i < main.length; i++) {
        var t = infoCarte(main[i]), l = 1 + lignesCarte(t, w - 30).length;
        besoin = Math.max(besoin, 8 + l * lh + 4);
      }
      d.h = Math.min(besoin, Math.floor((bas - top - gap * (n - 1)) / n));
    } else {
      w = n <= 3 ? Math.min(120, Math.floor((W - 16 - gap * (n - 1)) / n)) : Math.floor((W - 16 - gap * (n - 1)) / n);
      d.w = w;
      var haut = 80;
      for (i = 0; i < main.length; i++) {
        var u = infoCarte(main[i]), nn = coupe(u.nom, w - 6).length, dd = lignesCarte(u, w - 6).length;
        haut = Math.max(haut, 11 + 16 + 4 + (nn + dd) * lh + 5);
      }
      d.h = Math.min(haut, bas - top);
    }
    return d;
  }
  function rectCarte(i, n) {
    var W = O.geo.W, d = dims(n), x, y;
    if (d.port) { x = Math.round((W - d.w) / 2); y = Math.round(d.top + Math.max(0, (d.bas - d.top - (n * d.h + (n - 1) * d.gap)) / 2)) + i * (d.h + d.gap); }
    else { x = Math.round(W / 2 - (n * d.w + (n - 1) * d.gap) / 2) + i * (d.w + d.gap); y = Math.round(d.top + Math.max(0, (d.bas - d.top - d.h) / 2)); }
    return { x: x, y: y, w: d.w, h: d.h };
  }
  function carte(i, n, id) {
    var g = N.gfx, r = rectCarte(i, n), t = infoCarte(id), ink = encre(t.rarete), sel = i === choix, port = O.geo.portrait;
    /* la chute : à 55 ms d'écart, en pas entiers, avec un rebond d'un pixel */
    var tt = T - i * CFG.chute, dy;
    if (tt < 0) return;
    if (tt < CFG.tombe) { var u = tt / CFG.tombe; dy = -Math.round((1 - u * u) * CFG.haut); }
    else dy = (tt < CFG.tombe + 0.07 ? -1 : 0);
    var x = r.x, y = r.y + dy;
    g.rect(x - 1, y - 1, r.w + 2, r.h + 2, O.NP); g.rect(x, y, r.w, r.h, O.NUIT);
    var bord = sel ? O.JAUNE : ink;
    g.rect(x, y, r.w, 1, bord); g.rect(x, y + r.h - 1, r.w, 1, bord);
    if (sel) { g.rect(x, y, 1, r.h, bord); g.rect(x + r.w - 1, y, 1, r.h, bord); }
    var cr = R.cartes.crans[t.rarete] || 1;
    for (var c = 0; c < cr; c++) g.rect(x + r.w - 5 - c * 4, y + 3, 2, 2, ink);                         // la rareté se lit par l'encre ET par les crans
    if (t.rarete === 'ultime') {                                                                          // le reflet tramé, moins de 3 passages par seconde
      var bx = x + Math.round(((T * 2.5) % 1) * (r.w + 12)) - 8;
      for (var yy = y + 1; yy < y + r.h - 1; yy++) for (var xx = bx; xx < bx + 4; xx++) if (xx > x && xx < x + r.w - 1 && ((xx + yy) & 1)) g.px(xx, yy, O.OS);
    }
    var kb = (i < 4 && !O.hasTouch()) ? String(i + 1) + ' ' : '';
    if (port) {
      icone(id, x + 13, y + Math.round(r.h / 2), ink);
      var lx = x + 26, tw = r.w - 30;
      O.text(kb + t.nom, lx, y + 4, O.OS, false, 1);
      droite(t.tag, x + r.w - 6 - cr * 4, y + 4, ink, 1);
      var ls = lignesCarte(t, tw);
      for (var a = 0; a < ls.length; a++) O.text(ls[a], lx, y + 14 + a * 9, O.ACIER, false, 1);
    } else {
      O.text(kb + t.tag, x + 4, y + 3, ink, false, 1);
      icone(id, x + Math.round(r.w / 2), y + 20, ink);
      var nm = coupe(t.nom, r.w - 6), ty = y + 32;
      for (var b = 0; b < nm.length; b++) { O.textC(nm[b], x + r.w / 2, ty, O.OS, false, 1); ty += 9; }
      var ds = lignesCarte(t, r.w - 6);
      for (var e = 0; e < ds.length; e++) { O.textC(ds[e], x + r.w / 2, ty + 2, O.ACIER, false, 1); ty += 9; }
    }
  }
  function cartes() {
    var W = O.geo.W, n = main.length, sf = O.geo.safe;
    veil();
    var y0 = (sf.t | 0) + (O.geo.portrait ? 24 : 5);                       // sous le HUD en portrait (score et défi sur deux lignes)
    O.textC(nChoix > 1 ? 'CHOISIS ' + restant : 'CARTE DE VAGUE', W / 2, y0, O.JAUNE, true, 2);
    if (nChoix > 1) O.textC('CARTE DE VAGUE + ' + (nChoix - 1) + (nChoix > 2 ? ' NIVEAUX' : ' NIVEAU'), W / 2, y0 + 16, O.ACIER, true, 1);
    for (var i = 0; i < n; i++) carte(i, n, main[i]);
  }

  /* ============================ démarrage et titre ============================ */
  function demarrage() {
    var W = O.geo.W, H = O.geo.H, hz = (R && R.ecrans && R.ecrans.demarrage && R.ecrans.demarrage.clignoteHz) || 1;
    O.textC('SNAKE 2975', W / 2, Math.round(H / 2 - 24), O.OS, false, 4);
    if ((T * hz) % 1 < 0.7) O.textC(O.hasTouch() ? 'TOUCHE POUR COMMENCER' : 'ESPACE POUR COMMENCER', W / 2, Math.round(H / 2 + 10), O.ACIER, false, 1);
  }
  function titre() {
    var W = O.geo.W, H = O.geo.H, a = N.art && N.art.get ? O.safe('art.get', function () { return N.art.get('affiche'); }) : null;
    if (a && a.data) fond(a, 0.7);
    O.textC('SNAKE 2975', W / 2, Math.round(H * 0.28), O.OS, true, 4);
    var rec = N.score ? N.score.record() : 0, y = Math.round(H * 0.28 + 38);
    if (rec > 0) {
      O.textC('RECORD ' + O.pad(rec, 7), W / 2, y, O.JAUNE, true, 1);
      var e = N.score.energie | 0, p = N.score.prochain ? N.score.prochain() : null;
      if (e > 0) O.textC('ÉNERGIE ' + e + (p ? '  ·  ' + (DEBNOMS[p.id] || p.id) + ' DANS ' + p.reste : ''), W / 2, y + 11, O.ACIER, true, 1);
    }
    if ((T * 1.25) % 1 < 0.8) O.textC(O.hasTouch() ? 'TOUCHE POUR JOUER' : 'ESPACE POUR JOUER', W / 2, Math.round(H * 0.72), O.OS, true, 1);
  }
  /* le fond d'un panneau (affiche, défaite, victoire), assombri d'un cran */
  function fond(a, ombre) {
    var W = O.geo.W, H = O.geo.H;
    if (!DARK) { DARK = new Uint8Array(16); for (var c = 0; c < 16; c++) DARK[c] = N.pal.shade ? N.pal.shade(c, ombre) : c; DARK[0] = 0; }
    if (!FINBUF || FINBUF.w !== a.w || FINBUF.h !== a.h) FINBUF = O.mk(a.w, a.h);
    var src = a.data, dst = FINBUF.data;
    for (var i = 0; i < src.length; i++) dst[i] = DARK[src[i]];
    N.gfx.blit(FINBUF, Math.floor((W - a.w) / 2), Math.floor((H - a.h) / 2));
  }

  /* ============================ l'écran de fin ============================ */
  function mmss(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function espace(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function barre(x, y, w, part, c) {
    var g = N.gfx;
    g.rect(x - 1, y - 1, w + 2, 6, O.NP); g.rect(x, y, w, 4, O.ARDOISE);
    var f = Math.round(w * O.clamp(part, 0, 1)); if (f > 0) g.rect(x, y, f, 4, c);
  }
  function fin() {
    var W = O.geo.W, H = O.geo.H, g = N.gfx, o = cur_opts, sf = O.geo.safe, r = N.score && N.score.resume ? N.score.resume() : null;
    var v = r ? r.victoire : !!o.victoire;
    if (!O.current()) {
      var a = N.art && N.art.get ? O.safe('art.get', function () { return N.art.get(v ? 'victoire' : 'defaite'); }) : null;
      if (a && a.data) fond(a, 0.6);
    }
    var port = O.geo.portrait, x0 = (sf.l | 0) + 5, x1 = W - (sf.r | 0) - 5, y0 = (sf.t | 0) + 4, y1 = H - (sf.b | 0) - 4, bord = v ? O.JAUNE : O.ROSE;
    g.ditherRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6, O.NP, 0.75);
    g.rect(x0, y0, x1 - x0, y1 - y0, O.NUIT); g.rect(x0, y0, x1 - x0, 1, bord); g.rect(x0, y1 - 1, x1 - x0, 1, bord);
    var cw = port ? x1 - x0 - 10 : Math.floor((x1 - x0 - 18) / 2), cx0 = x0 + 5, cx1 = port ? cx0 : cx0 + cw + 8;      // deux colonnes en paysage, une en portrait
    var yl = y0 + 6, bloc = 0;
    function vu() { return T >= (bloc++) * CFG.rev; }                                 // chaque bloc se dévoile à son tour
    var ink = v ? O.JAUNE : O.MAGENTA;
    /* 1. le titre */
    if (vu()) O.text(v ? 'SECTEUR NETTOYÉ' : 'SIGNAL PERDU', cx0, yl + 3, ink, false, 2);
    yl += 19;
    /* 2. la cause, nommée, avec le quartier, la vague et l'heure */
    if (r && !v && r.cause) {
      if (vu()) {
        O.text('DÉTRUITE PAR', cx0, yl, O.ACIER, false, 1);
        var cs = coupe(N.ids.texte(r.cause, r.auteur), cw), cy = yl + 10, i;
        for (i = 0; i < cs.length; i++) { O.text(cs[i], cx0, cy, O.MAGENTA, false, 1); cy += 9; }
        var ls = coupe('VAGUE ' + r.vague + (r.quartier ? ' · ' + N.ids.nom(r.quartier) : '') + ' · ' + mmss(r.temps), cw);
        for (i = 0; i < ls.length; i++) { O.text(ls[i], cx0, cy, O.ACIER, false, 1); cy += 9; }
      }
      yl += 38;
    } else if (v) { if (vu()) O.text('SURCHARGE DÉBLOQUÉE', cx0, yl, O.JAUNE, false, 1); yl += 14; }
    /* 3. la progression */
    if (r) {
      if (vu()) {
        O.text(v ? 'SECTEUR 100 %' : r.boss ? 'CYCLOPE ATTEINT' : 'SECTEUR ' + Math.round(r.progression * 100) + ' %', cx0, yl, O.ACIER, false, 1);
        barre(cx0, yl + 10, cw, r.progression, v ? O.JAUNE : O.OS);
      }
      yl += 20;
    }
    /* 4. le score compté jusqu'à sa valeur, l'écart à la partie précédente et le record */
    var sc = r ? r.score : (N.score ? N.score.score : 0);
    if (vu()) {
      var k = O.clamp((T - (bloc - 1) * CFG.rev) / 0.9, 0, 1), aff = Math.round(sc * (1 - (1 - k) * (1 - k))), w1 = O.textW('SCORE ', 1);
      O.text('SCORE ', cx0, yl, O.ACIER, false, 1); O.text(O.pad(aff, 7), cx0 + w1, yl, O.JAUNE, false, 1);
      if (r && r.ecart !== null && k >= 1) droite((r.ecart >= 0 ? '+' : '') + espace(r.ecart), cx0 + cw, yl, r.ecart >= 0 ? O.JAUNE : O.ACIER, 1);
      var nr = r ? r.nouveauRecord : false;
      O.text(nr ? 'NOUVEAU RECORD' : 'RECORD ' + O.pad(r ? r.record : (N.score ? N.score.record() : 0), 7), cx0, yl + 10, nr ? O.JAUNE : O.ACIER, false, 1);
    }
    yl += 24;
    /* 5. le build : son nom et ses icônes */
    if (r && r.build) {
      if (vu()) {
        O.text(r.build.nom, cx0, yl, O.OS, false, 1);
        var bi = r.build.armes || [], xi = cx0 + 7;
        for (var q = 0; q < bi.length; q++) {
          icone(bi[q].id, xi, yl + 20, O.CYANP);
          O.textC(romain(bi[q].palier !== undefined ? bi[q].palier : bi[q].niveau), xi, yl + 30, O.ACIER, false, 1); xi += 19;
        }
        if (r.build.pouvoir) icone(r.build.pouvoir, xi + 3, yl + 20, O.JAUNE);
      }
      yl += 42;
    }
    /* la colonne de droite (en portrait, la suite de la colonne) */
    var cx = cx1, y = port ? yl : y0 + 6;
    /* 6. le bilan, ligne à ligne */
    if (r && vu()) {
      var lignes = [['DÉTRUITS', r.kills], ['CHAÎNE MAX', r.maxChaine], ['COUPES', r.coupes]];
      if (r.lassos) lignes.splice(2, 0, ['LASSO MAX', r.maxLasso]);
      for (var m = 0; m < lignes.length; m++) {
        if (T < (bloc - 1) * CFG.rev + m * 0.12) break;
        O.text(lignes[m][0], cx, y + m * 9, O.ACIER, false, 1); droite(String(lignes[m][1]), cx + cw, y + m * 9, O.OS, 1);
      }
    }
    y += 38;
    /* 7. la note, qui tombe, et le défi */
    if (r && vu()) {
      var dy = Math.round((1 - O.clamp((T - (bloc - 1) * CFG.rev) / 0.2, 0, 1)) * -10);
      O.text('NOTE', cx, y + 4, O.ACIER, false, 1);
      O.text(r.note, cx + 30, y + dy, r.note === 'D' ? O.ACIER : O.JAUNE, false, 3);
      if (r.defi) {
        var ok = r.defi.etat === 'reussi', dl = coupe((ok ? '✓ ' : '✗ ') + r.defi.nom + (ok ? '' : ' ' + r.defi.meilleur + '/' + r.defi.but), cw - 52);
        for (var dd = 0; dd < dl.length; dd++) O.text(dl[dd], cx + 52, y + 1 + dd * 9, ok ? O.AMBRE : O.ACIER, false, 1);
      }
    }
    y += 26;
    /* 8. UN conseil */
    if (r && r.conseil) {
      var cl = coupe(r.conseil, cw);
      if (vu()) for (var z = 0; z < cl.length; z++) O.text(cl[z], cx, y + z * 9, O.OS, false, 1);
      y += cl.length * 9 + 5;
    }
    /* 9. l'énergie gagnée et le prochain déblocage, avec sa barre qui se remplit sous les yeux */
    if (r) {
      if (vu()) {
        var t9 = T - (bloc - 1) * CFG.rev;
        O.text('ÉNERGIE +' + r.energieGagnee, cx, y, O.OS, false, 1);
        if (r.debloques.length) {
          O.text('DÉBLOQUÉ : ' + (DEBNOMS[r.debloques[0]] || r.debloques[0]), cx, y + 10, O.JAUNE, false, 1);
          barre(cx, y + 20, cw, 1, O.JAUNE);
          if (!bruit) { bruit = true; O.sfx('record'); }
        } else if (r.prochain) {
          var from = r.avant && r.avant.id === r.prochain.id ? r.avant.part : 0;
          O.text('PROCHAIN : ' + (DEBNOMS[r.prochain.id] || r.prochain.id) + ' DANS ' + r.prochain.reste, cx, y + 10, O.ACIER, false, 1);
          barre(cx, y + 20, cw, from + (r.prochain.part - from) * O.clamp(t9 / 0.9, 0, 1), O.AMBRE);
        }
      }
    }
    /* 10. REJOUER : une cible de 44 pt au bas de la colonne ; tout l'écran la valide, une fois la garde passée */
    var ch = cible(), bw = Math.min(cw, 130), bx = cx + (port ? Math.round((cw - bw) / 2) : cw - bw), by = y1 - ch - 5;
    var pret = T >= CFG.garde, cb = pret ? (((T * 1.25) % 1 < 0.8) ? O.OS : O.ACIER) : O.ARDOISE;
    g.rect(bx - 1, by - 1, bw + 2, ch + 2, O.NP); g.rect(bx, by, bw, ch, O.ARDOISE);
    g.rect(bx, by, bw, 1, pret ? O.JAUNE : O.ACIER); g.rect(bx, by + ch - 1, bw, 1, pret ? O.JAUNE : O.ACIER);
    O.textC('REJOUER', bx + bw / 2, by + Math.round(ch / 2) - 3, cb, false, 1);
    if (!O.hasTouch() && pret) O.textC('ESPACE', bx + bw / 2, by - 9, O.ACIER, false, 1);
  }

  function draw() {
    if (!cur) return;
    if (cur === 'pause') pause();
    else if (cur === 'cartes') cartes();
    else if (cur === 'demarrage') demarrage();
    else if (cur === 'titre') titre();
    else if (cur === 'fin') fin();
  }

  return { ouvrir: ouvrir, fermer: fermer, actif: actif, update: update, draw: draw, sortie: sortie, ecran: ecran, cartes: CARTES, veil: veil, icone: icone,
    rect: function (i) { return rectCarte(i, main.length); }, main: function () { return main.slice(); }, bouton: function () { return { h: cible() }; } };
})();
