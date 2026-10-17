/* ===== 80-ecrans.js — N.ui : les écrans (titre, briefing, cartes, pause, réglages, fin, initiales…) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot 8. Le repli reprend l'écran de fin et l'écran de
   pause de la démo (70-game.js, réparti par le lot 0b) : une plaque de nuit sur un voile tramé, le titre
   en grand, le score, le record, le défi, « TOUCHE POUR REJOUER » estompé pendant la garde puis battant.
   S'y ajoutent les cartes v0 (trois plaques à texte fixe, au doigt ou aux chiffres 1 à 4), un titre, des
   initiales au clavier, les records, les réglages et la galerie en simple liste.
   Le protocole avec 79-jeu (seul à changer d'état) : ouvrir(nom, opts) avec opts.retour(choix), que l'écran
   appelle quand la joueuse a choisi ('jouer', 'reprendre', 'rejouer', 'fini', les initiales…). Un toucher
   commencé avant l'ouverture, ou pendant la garde, ne compte pas. L'écran ne demande qu'à son propriétaire
   ce qu'il faut faire (N.cartes.choisir, N.score._inscrire) et tient le miroir S.ecran. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  function I(n) { return N.pal.i(n); }
  function G() { return N.gfx; }
  function pad(n, k) { var s = '' + Math.max(0, Math.floor(n)); while (s.length < k) s = '0' + s; return s; }
  function reel() { return (N.horloge && N.horloge.reel) ? N.horloge.reel() : 0; }
  function touche() { try { return !!((typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || (typeof window !== 'undefined' && 'ontouchstart' in window)); } catch (e) { return false; } }

  var TXO = { ci: 0, contour: false, ombre: false, echelle: 1 }, MSO = { echelle: 1 };
  function txt(str, x, y, c, sc, contour) {
    sc = sc || 1;
    if (!N.spr || !N.spr.text) return 0;
    TXO.ci = c; TXO.contour = !!contour; TXO.echelle = sc;
    var s = N.spr.text(str, TXO); if (!s || !s.data) return 0;
    var m0 = contour ? sc : 0, top = s.top !== undefined ? s.top : 3 * sc + m0;
    G().blit(s, Math.round(x) - m0, Math.round(y) - top);
    return s.w;
  }
  function larg(str, sc) { sc = sc || 1; if (N.spr && N.spr.measure) { MSO.echelle = sc; var m = N.spr.measure(str, MSO); if (m) return m.w; } return str.length * 6 * sc - sc; }
  function txtC(str, cx, y, c, sc, contour) { return txt(str, cx - larg(str, sc) / 2, y, c, sc, contour); }

  var U = { nom: null, opts: null, depuis: 0, sel: 0, init: '', plaques: [] };
  var EC = { nom: null, depuis: 0, cartes: [], niveaux: [], choix: 0, pret: false };

  function garde() {
    var R = N.R && N.R.ecrans, n = U.nom;
    if (n === 'cartes') return (N.R && N.R.cartes && N.R.cartes.garde) || 0.4;
    if (n === 'fin') return (R && R.fin.garde) || 0.45;
    return (R && R.ouverture && R.ouverture.garde) || 0.3;
  }
  function pret() { return U.nom !== null && reel() - U.depuis >= garde(); }
  function miroir() {
    var s = N.S; if (!s) return;
    EC.nom = U.nom; EC.depuis = Math.max(0, reel() - U.depuis); EC.pret = pret();
    if (U.nom !== 'cartes') { EC.cartes.length = 0; EC.niveaux.length = 0; EC.choix = 0; }
    s.ecran = EC;
  }
  function main() {
    var o = U.opts || {}, n = (N.R && N.R.f && N.R.f.tailleMain) ? N.R.f.tailleMain(EC.choix) : 3;
    var M = N.cartes && N.cartes.main ? N.cartes.main(o.taille || n, o) : [];
    EC.cartes.length = 0; EC.niveaux.length = 0;
    for (var i = 0; i < M.length; i++) {
      EC.cartes.push(M[i]);
      var arme = N.ids && N.ids.armes.indexOf(M[i]) >= 0, pr = N.cartes && N.cartes.prises ? (N.cartes.prises()[M[i]] | 0) : 0;
      EC.niveaux.push(arme && N.arsenal ? N.arsenal.niveau(M[i]) + 1 : pr + 1);
    }
  }
  function retour(choix) {
    var f = U.opts && U.opts.retour;
    ui.fermer();
    if (typeof f === 'function') f(choix);
  }
  /* un toucher, une touche de validation : seulement neufs, après la garde */
  function geste() {
    var s = N.S, inp = s && s.input; if (!inp || !pret()) return null;
    if (inp.valider) return { x: -1, y: -1 };
    var T = inp.taps || [];
    for (var i = 0; i < T.length; i++) if (T[i].t0 >= U.depuis + garde() - 1e-6) return T[i];
    return null;
  }

  function update() {
    if (!U.nom) { miroir(); return; }
    var s = N.S, inp = s && s.input, g = geste(), k;
    switch (U.nom) {
      case 'cartes':
        if (!pret()) break;
        var choisi = -1;
        if (inp && inp.chiffre >= 1 && inp.chiffre <= EC.cartes.length) choisi = inp.chiffre - 1;
        else if (g && g.x >= 0) for (k = 0; k < U.plaques.length; k++) { var P = U.plaques[k]; if (g.x >= P.x && g.x < P.x + P.w && g.y >= P.y && g.y < P.y + P.h) choisi = k; }
        else if (g) choisi = U.sel;
        if (choisi >= 0 && EC.cartes[choisi]) {
          if (N.cartes && N.cartes.choisir) N.cartes.choisir(EC.cartes[choisi]);
          EC.choix--;
          if (EC.choix > 0) { main(); U.depuis = reel(); } else { retour('fini'); return; }
        }
        break;
      case 'initiales':
        if (inp && inp.car) U.init = (U.init + inp.car.toUpperCase().replace(/[^A-Z]/g, '')).slice(0, 3);
        if (inp && inp.retour && U.init.length) U.init = U.init.slice(0, -1);
        if (g) { var ini = (U.init + 'AAA').slice(0, 3); if (N.score && N.score._inscrire) N.score._inscrire(ini); retour(ini); return; }
        break;
      case 'pause':
        if (g || (inp && (inp.pause || inp.retour) && pret())) { retour('reprendre'); return; }
        break;
      case 'titre': if (g) { retour('jouer'); return; } break;
      case 'fin': if (g) { retour('rejouer'); return; } break;
      default: if (g || (inp && inp.retour && pret())) { retour('fini'); return; }
    }
    miroir();
  }

  /* ================================ dessin ================================ */
  function voile() { var g = G(); g.ditherRect(0, 0, g.W, g.H, I('nuitProfonde'), 0.5); }
  function cadre(x, y, w, h, c) { var g = G(); g.rect(x - 1, y - 1, w + 2, h + 2, I('nuitProfonde')); g.rect(x, y, w, h, I('nuit')); g.rect(x, y, w, 1, c); g.rect(x, y + h - 1, w, 1, c); }
  function battement() { return pret() ? (((reel() * 1.25) % 1) < 0.8 ? I('os') : I('acier')) : I('ardoise'); }
  function invite(mot) { return (touche() ? 'TOUCHE POUR ' : 'ENTRÉE POUR ') + mot; }

  function draw() {
    var g = G(); if (!g || !N.pal || !U.nom) return;
    var W = g.W, H = g.H, cx = W / 2, k;
    if (g.owner) g.owner(9);
    switch (U.nom) {
      case 'titre':
        txtC('SNAKE 2975', cx, Math.round(H * 0.3), I('jaune'), 3, true);
        txtC(invite('JOUER'), cx, Math.round(H * 0.62), battement(), 1, true);
        var rec = N.score && N.score.records && N.score.records[0];
        if (rec) txtC('RECORD ' + pad(rec.score, 7) + ' ' + rec.initiales, cx, Math.round(H * 0.72), I('acier'), 1, true);
        break;
      case 'cartes': {
        voile();
        var n = EC.cartes.length, portrait = H > W, pw = portrait ? Math.min(W - 16, 180) : Math.min(120, Math.floor((W - 16) / Math.max(1, n)) - 6), ph = portrait ? 44 : 80;
        txtC(EC.choix > 1 ? 'CHOISIS ' + EC.choix : 'CHOISIS UNE CARTE', cx, portrait ? 14 : Math.round(H * 0.12), I('os'), 2, true);
        U.plaques.length = 0;
        for (k = 0; k < n; k++) {
          var x = portrait ? Math.round(cx - pw / 2) : Math.round(cx - (n * (pw + 6) - 6) / 2 + k * (pw + 6));
          var y = portrait ? 34 + k * (ph + 6) : Math.round(H * 0.3);
          U.plaques.push({ x: x, y: y, w: pw, h: ph });
          var id = EC.cartes[k], arme = N.ids.armes.indexOf(id) >= 0;
          cadre(x, y, pw, ph, arme ? I('jaune') : I('acier'));
          txt((k + 1) + '', x + 4, y + 4, I('acier'), 1);
          txtC((N.ids.nom ? N.ids.nom(id) : id), x + pw / 2, y + (portrait ? 8 : 18), I('os'), 1);
          txtC(arme ? 'PALIER ' + EC.niveaux[k] : (N.cartes && N.cartes.texte ? N.cartes.texte(id) : ''), x + pw / 2, y + (portrait ? 24 : 40), arme ? I('jaune') : I('acier'), 1);
        }
        break;
      }
      case 'pause': {
        voile();
        var bw = Math.min(W - 8, 160), bh = 42, x0 = Math.round((W - bw) / 2), y0 = Math.round(H / 2 - bh / 2);
        cadre(x0, y0, bw, bh, I('acier'));
        txtC('PAUSE', cx, y0 + 7, I('os'), 2);
        txtC(invite('REPRENDRE'), cx, y0 + 28, I('acier'), 1);
        break;
      }
      case 'fin': finDraw(W, H); break;
      case 'initiales':
        voile();
        txtC('NOUVEAU RECORD', cx, Math.round(H * 0.3), I('jaune'), 2, true);
        txtC('INITIALES : ' + (U.init + '___').slice(0, 3), cx, Math.round(H * 0.5), I('os'), 2, true);
        txtC(invite('VALIDER'), cx, Math.round(H * 0.68), battement(), 1, true);
        break;
      default: {
        voile();
        txtC(String(U.nom).toUpperCase(), cx, Math.round(H * 0.2), I('os'), 2, true);
        if (U.nom === 'records') { var L = (N.score && N.score.records) || []; for (k = 0; k < L.length; k++) txtC((k + 1) + '. ' + L[k].initiales + ' ' + pad(L[k].score, 7), cx, Math.round(H * 0.32) + k * 10, I('acier'), 1); }
        if (U.nom === 'reglages') { var Rg = (N.S && N.S.reglages) || {}, j = 0; for (var c in Rg) txtC(c.toUpperCase() + ' : ' + String(Rg[c]).toUpperCase(), cx, Math.round(H * 0.32) + (j++) * 10, I('acier'), 1); }
        txtC(invite('REVENIR'), cx, H - 20, battement(), 1, true);
      }
    }
    if (g.owner) g.owner(0);
  }
  /* l'écran de fin de la démo : le fond est celui de 60-intro (transition 'victoire' ou 'defaite') */
  function finDraw(W, H) {
    var g = G(), o = U.opts || {}, v = !!o.victoire, cx = W / 2, bw = Math.min(W - 10, 240), x = Math.round(cx - bw / 2), bh = 104, y = Math.round(H / 2 - bh / 2);
    if (H > W) y = Math.round(H * 0.6 - bh / 2);
    var c0 = v ? I('jaune') : I('rosePale');
    g.ditherRect(x - 3, y - 3, bw + 6, bh + 6, I('nuitProfonde'), 0.6);
    cadre(x, y, bw, bh, c0);
    txtC(v ? 'VICTOIRE' : 'SIGNAL PERDU', cx, y + 6, v ? I('jaune') : I('os'), 2);
    var d = N.S && N.S.death;
    if (!v && d && N.ids && N.ids.texte) txtC('DÉTRUITE PAR : ' + N.ids.texte(d.cause, d.auteur), cx, y + 24, I('rosePale'), 1);
    var sc = N.score || { score: 0 };
    txtC('SCORE ' + pad(sc.score, 7), cx, y + 36, I('jaune'), 1);
    var rec = sc.records && sc.records[0];
    txtC(rec ? 'RECORD ' + pad(Math.max(rec.score, sc.score), 7) : 'PREMIER RECORD', cx, y + 47, I('acier'), 1);
    var D = sc.defis || [];
    for (var k = 0; k < D.length && k < 3; k++) txtC((D[k].etat === 'reussi' ? '✓ ' : '✗ ') + D[k].nom, cx, y + 59 + k * 9, D[k].etat === 'reussi' ? I('jaune') : I('acier'), 1);
    var pr = sc.prochain ? sc.prochain() : null;
    if (pr && pr.id) {
      var bx = x + 20, bww = bw - 40, by = y + 88;
      txtC('PROCHAIN : ' + (N.ids.nom ? N.ids.nom(pr.id) : pr.id) + ' DANS ' + pr.reste, cx, by - 2, I('ambre'), 1);
      g.rect(bx, by + 8, bww, 2, I('ardoise')); g.rect(bx, by + 8, Math.round(bww * pr.part), 2, I('ambre'));
    }
    txtC(invite('REJOUER'), cx, y + bh + 6, battement(), 1, true);
  }

  var ui = {
    ouvrir: function (nom, opts) {
      if (N.ids && N.ids.ecrans.indexOf(nom) < 0) return false;
      U.nom = nom; U.opts = opts || {}; U.depuis = reel(); U.sel = 0; U.init = ''; U.plaques.length = 0;
      if (nom === 'cartes') { EC.choix = Math.max(1, (U.opts.choix | 0) || 1); main(); }
      miroir();
      return true;
    },
    fermer: function () { U.nom = null; U.opts = null; miroir(); },
    actif: function () { return U.nom; },
    update: update,
    draw: draw
  };
  N.ui = ui;
})();
