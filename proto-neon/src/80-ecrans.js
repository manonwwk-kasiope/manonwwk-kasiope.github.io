/* ===== 80-ecrans.js — N.ui : les écrans (démarrage, titre, cartes, pause, fin) =====

   Tiré de 70-game.js (lot 0b) : drawPause, drawFinBG, drawFinTop. Les écrans de repli du squelette : le démarrage
   « TOUCHE POUR COMMENCER », le titre, les CARTES v0 (trois cartes à texte fixe), la pause, l'écran de fin
   (score, record, défi, et la cause de la mort, N.ids.texte(cause, auteur)).

   Ce module ne change JAMAIS l'état du jeu : il lit les touchers (N.outils.taps, remplis par 79-jeu.js), dessine,
   et dépose une SORTIE que 79-jeu.js reprend : sortie() -> { ecran, action, index, id } ou null.
   Un toucher commencé avant l'ouverture d'un écran ne compte pas (la garde `garde`).

   Interface (§ 7.8) : ouvrir(nom, opts), fermer(), actif(), update(dt), draw(). Ajouts : sortie(), ecran(). */
N.ui = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = { garde: 0.45 };                      // → N.R : la garde de l'écran de fin de la démo (J-17)
  var CARTES = [                                  // cartes v0 : trois cartes à texte fixe
    { id: 'canon', nom: 'CANON', texte: 'PALIER SUIVANT' },
    { id: 'croissance', nom: 'CROISSANCE', texte: '+5 SEGMENTS' },
    { id: 'cadence', nom: 'CADENCE', texte: 'TIR PLUS VITE' }
  ];
  var cur = null, T = 0, out = null, choix = 0, pret = false;
  var DARK = null, FINBUF = null;

  function ouvrir(nom, opts) {
    cur = nom; T = 0; out = null; pret = false; choix = 0;
    cur_opts = opts || {};
  }
  var cur_opts = {};
  function fermer() { cur = null; out = null; }
  function actif() { return cur !== null; }
  function ecran() { return cur; }
  function sortie() { var o = out; out = null; return o; }

  function update(dt) {
    if (!cur) return;
    T += dt;
    var taps = O.taps, g = O.garde || 0, i, W = O.geo.W;
    for (i = 0; i < taps.length; i++) {
      var q = taps[i];
      if (q.key === 'KeyM' || (q.key === null && q.bouton === 'son')) continue;         // le bouton son est au HUD
      if (cur === 'demarrage' || cur === 'titre') { if (T >= 0.15) out = { ecran: cur, action: 'jouer' }; }
      else if (cur === 'pause') { if (q.key !== 'Tab') out = { ecran: cur, action: 'reprendre' }; }
      else if (cur === 'fin') { if (T >= CFG.garde && q.key !== 'Tab' && q.key !== 'Escape') out = { ecran: cur, action: 'rejouer' }; }
      else if (cur === 'cartes') {
        var n = CARTES.length, k = -1;
        if (q.key && /^Digit[1-9]$/.test(q.key)) k = (+q.key.slice(5)) - 1;
        else if (q.key === 'ArrowLeft') choix = (choix + n - 1) % n;
        else if (q.key === 'ArrowRight') choix = (choix + 1) % n;
        else if (q.key === 'Enter' || q.key === 'Space') k = choix;
        else if (q.key === null) { var r = rectCarte(0, n); for (var c = 0; c < n; c++) { var rc = rectCarte(c, n); if (q.x >= rc.x && q.x < rc.x + rc.w && q.y >= rc.y && q.y < rc.y + rc.h) { k = c; break; } } }
        if (k >= 0 && k < n && T >= 0.25) out = { ecran: cur, action: 'carte', index: k, id: CARTES[k].id };
      }
    }
  }

  /* ============================ dessin ============================ */
  function veil() { N.gfx.ditherRect(0, 0, O.geo.W, O.geo.H, O.NP, 0.5); }
  function pause() {
    var W = O.geo.W, H = O.geo.H, g = N.gfx, bw = Math.min(W - 8, 160), bh = 42, x = Math.round((W - bw) / 2), y = Math.round(H / 2 - bh / 2);
    veil();
    g.rect(x - 1, y - 1, bw + 2, bh + 2, O.NP); g.rect(x, y, bw, bh, O.NUIT); g.rect(x, y, bw, 1, O.ACIER);
    O.textC('PAUSE', W / 2, y + 7, O.OS, false, 2);
    O.textC(O.hasTouch() ? 'TOUCHE POUR REPRENDRE' : 'ESPACE POUR REPRENDRE', W / 2, y + 28, O.ACIER, false, 1);
  }
  function rectCarte(i, n) {
    var W = O.geo.W, H = O.geo.H, port = O.geo.portrait, gap = 4, w, h, x, y;
    if (port) { w = Math.min(W - 16, 150); h = 40; x = Math.round((W - w) / 2); y = Math.round(H / 2 - (n * (h + gap) - gap) / 2) + i * (h + gap); }
    else { w = Math.min(Math.floor((W - 16 - gap * (n - 1)) / n), 120); h = 70; x = Math.round(W / 2 - (n * w + (n - 1) * gap) / 2) + i * (w + gap); y = Math.round(H / 2 - h / 2); }
    return { x: x, y: y, w: w, h: h };
  }
  function cartes() {
    var W = O.geo.W, g = N.gfx, n = CARTES.length;
    veil();
    O.textC('CHOISIS UNE CARTE', W / 2, Math.max(O.geo.safe.t | 0, 0) + 14, O.JAUNE, true, 1);
    for (var i = 0; i < n; i++) {
      var r = rectCarte(i, n), sel = i === choix;
      g.rect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, O.NP); g.rect(r.x, r.y, r.w, r.h, O.NUIT);
      g.rect(r.x, r.y, r.w, 1, sel ? O.JAUNE : O.ACIER); g.rect(r.x, r.y + r.h - 1, r.w, 1, sel ? O.JAUNE : O.ACIER);
      O.textC(String(i + 1), r.x + r.w / 2, r.y + 6, O.ACIER, false, 1);
      O.textC(CARTES[i].nom, r.x + r.w / 2, r.y + Math.round(r.h / 2) - 7, O.OS, false, 1);
      O.textC(CARTES[i].texte, r.x + r.w / 2, r.y + Math.round(r.h / 2) + 5, O.ACIER, false, 1);
    }
  }
  function demarrage() {
    var W = O.geo.W, H = O.geo.H, hz = (R && R.ecrans && R.ecrans.demarrage && R.ecrans.demarrage.clignoteHz) || 1;
    O.textC('SNAKE 2975', W / 2, Math.round(H / 2 - 24), O.OS, false, 4);
    if ((T * hz) % 1 < 0.7) O.textC(O.hasTouch() ? 'TOUCHE POUR COMMENCER' : 'ESPACE POUR COMMENCER', W / 2, Math.round(H / 2 + 10), O.ACIER, false, 1);
  }
  function titre() {
    var W = O.geo.W, H = O.geo.H, a = N.art && N.art.get ? O.safe('art.get', function () { return N.art.get('affiche'); }) : null;
    if (a && a.data) fond(a, 0.7);
    O.textC('SNAKE 2975', W / 2, Math.round(H * 0.28), O.OS, true, 4);
    var rec = N.score ? N.score.record() : 0;
    if (rec > 0) O.textC('RECORD ' + O.pad(rec, 7), W / 2, Math.round(H * 0.28 + 38), O.JAUNE, true, 1);
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
  function fin() {
    var W = O.geo.W, H = O.geo.H, g = N.gfx, o = cur_opts, v = !!o.victoire, sc = N.score, S = N.S;
    /* le fond : celui de 60-intro.js quand il est là (N.intro.current), sinon le panneau de N.art */
    if (!O.current()) {
      var a = N.art && N.art.get ? O.safe('art.get', function () { return N.art.get(v ? 'victoire' : 'defaite'); }) : null;
      if (a && a.data) fond(a, 0.6);
    }
    var cx = W / 2, bw = Math.min(W - 10, 230), x = Math.round(cx - bw / 2), bh = 104, y = Math.round(H / 2 - bh / 2);
    if (O.geo.portrait) y = Math.round(H * 0.62 - bh / 2);            // sous le bandeau du panneau en portrait
    var c0 = v ? O.JAUNE : O.ROSE;
    g.ditherRect(x - 3, y - 3, bw + 6, bh + 6, O.NP, 0.6);
    g.rect(x, y, bw, bh, O.NUIT); g.rect(x, y, bw, 1, c0); g.rect(x, y + bh - 1, bw, 1, c0);
    O.textC(v ? 'VICTOIRE' : 'SIGNAL PERDU', cx, y + 6, v ? O.JAUNE : O.MAGENTA, false, 2);
    var score = sc ? sc.score : 0;
    var w1 = O.textW('SCORE ', 1), w2 = O.textW(O.pad(score, 7), 1), x1 = Math.round(cx - (w1 + w2) / 2);
    O.text('SCORE ', x1, y + 26, O.ACIER, false, 1); O.text(O.pad(score, 7), x1 + w1, y + 26, O.JAUNE, false, 1);
    var nr = sc && sc.nouveauRecord();
    O.textC(nr ? 'NOUVEAU RECORD' : 'RECORD ' + O.pad(sc ? sc.record() : 0, 7), cx, y + 37, nr ? O.JAUNE : O.ACIER, false, 1);
    var d = sc ? sc.defi : null, ok = d && d.etat === 'reussi';
    if (d) {
      O.textC(ok ? '✓ DÉFI RÉUSSI' : '✗ DÉFI RATÉ', cx, y + 51, ok ? O.JAUNE : O.ROSE, false, 1);
      O.textC(d.nom + (ok ? '' : '  ' + d.meilleur + '/' + d.but), cx, y + 62, O.ACIER, false, 1);
    }
    /* la cause de la mort, nommée (§ 2.3 : S.death) */
    if (!v && S && S.death) O.textC('DÉTRUITE PAR : ' + N.ids.texte(S.death.cause, S.death.auteur), cx, y + 74, O.MAGENTA, false, 1);
    /* estompé pendant la garde (le doigt posé à la mort ne relance pas), franc ensuite, avec un battement lent */
    var rj = O.hasTouch() ? 'TOUCHE POUR REJOUER' : 'ESPACE POUR REJOUER';
    O.textC(rj, cx, y + 90, T < CFG.garde ? O.ARDOISE : ((T * 1.25) % 1 < 0.8 ? O.OS : O.ACIER), false, 1);
  }

  function draw() {
    if (!cur) return;
    if (cur === 'pause') pause();
    else if (cur === 'cartes') cartes();
    else if (cur === 'demarrage') demarrage();
    else if (cur === 'titre') titre();
    else if (cur === 'fin') fin();
  }

  return { ouvrir: ouvrir, fermer: fermer, actif: actif, update: update, draw: draw, sortie: sortie, ecran: ecran, cartes: CARTES, veil: veil };
})();
