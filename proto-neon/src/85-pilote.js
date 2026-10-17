/* ===== 85-pilote.js — N.pilote : les pilotes automatiques (refonte/lots/pilotes.md) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaire : lot P, qui implémente la spécification gelée
   (refonte/lots/pilotes.md) telle quelle. Le repli respecte déjà ses règles d'accès : il ne lit que S,
   N.R, N.ids, N.game.etat() et N.horloge ; il n'écrit que S.input (x, y, mag, boost, pouvoir, apogee,
   chiffre, valider) ; il ne tire que dans le flux 'pilote' ; il journalise par N.journal('pilote', …).
     'inerte'    ne touche à rien (mag = 0) ;
     'tourneur'  tourne en rond, à cap qui avance régulièrement ;
     les autres  un repli commun et prudent : s'écarter des murs (S.monde), fuir le plus proche ennemi
                 à moins de 60 px, sinon viser le butin le plus proche ; prendre la première carte ;
                 valider l'écran de fin. Les vrais pilotes, avec leur retard et leur bruit, sont au lot P.
   N.pilote.agir(dt) est appelé par 79-jeu au début de chaque pas quand le pilote est actif. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  var P = { nom: 'inerte', actif: false, cap: 0, t: 0, opts: null };
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

  function ecrire(inp, a, mag) { inp.x = Math.cos(a); inp.y = Math.sin(a); inp.mag = mag; }

  function agir(dt) {
    if (!P.actif) return;
    var S = N.S, inp = S && S.input; if (!inp) return;
    var etat = N.game && N.game.etat ? N.game.etat() : 'jeu', E = S.ecran;
    P.t += dt > 0 ? dt : 0;
    inp.boost = false;
    /* les écrans : la première carte, puis valider la fin et le titre */
    if (E && E.nom && E.pret) {
      if (E.nom === 'cartes') inp.chiffre = 1;
      else if (E.nom === 'fin' || E.nom === 'titre' || E.nom === 'initiales') inp.valider = true;
      return;
    }
    if (P.nom === 'inerte') { inp.mag = 0; return; }
    var p = S.player; if (!p || p.etat === 'mort' || p.etat === 'absent') { inp.mag = 0; return; }
    if (P.nom === 'tourneur') { P.cap += 2.4 * (dt > 0 ? dt : 0); ecrire(inp, P.cap, 0.8); return; }
    if (etat === 'vol' && S.vol) { var o = S.vol.objets, best = null, bd = 1e9; for (var q = 0; q < o.length; q++) if (o[q].type !== 'mine') { var dq = d2(o[q].x, o[q].y, S.vol.tete.x, S.vol.tete.y); if (dq < bd) { bd = dq; best = o[q]; } } if (best) ecrire(inp, Math.atan2(best.y - S.vol.tete.y, best.x - S.vol.tete.x), 0.8); return; }
    /* le repli commun : murs, menaces, butin */
    var M = S.monde, a = p.ang, mx = 0, my = 0, marge = 40;
    if (M) {
      if (p.x - M.x0 < marge) mx += 1; if (M.x1 - p.x < marge) mx -= 1;
      if (p.y - M.y0 < marge) my += 1; if (M.y1 - p.y < marge) my -= 1;
    }
    if (mx || my) { ecrire(inp, Math.atan2(my, mx), 0.8); return; }
    var L = S.enemies || [], pr = null, pd = 60 * 60;
    for (var i = 0; i < L.length; i++) { if (L[i].etat === 'mort' || L[i].etat === 'proie') continue; var d = d2(L[i].x, L[i].y, p.x, p.y); if (d < pd) { pd = d; pr = L[i]; } }
    if (pr) { ecrire(inp, Math.atan2(p.y - pr.y, p.x - pr.x), 0.8); return; }
    var B = S.butin || [], bb = null, bdd = 1e12;
    for (i = 0; i < B.length; i++) { var db = d2(B[i].x, B[i].y, p.x, p.y); if (db < bdd) { bdd = db; bb = B[i]; } }
    if (bb) a = Math.atan2(bb.y - p.y, bb.x - p.x);
    ecrire(inp, a, 0.8);
  }

  N.pilote = {
    niveau: function (nom, opts) {
      if (N.ids && N.ids.pilotes.indexOf(nom) >= 0) P.nom = nom;
      P.opts = opts || null; P.t = 0; P.cap = 0;
      if (N.journal) N.journal('pilote', { nom: P.nom, evt: 'niveau' });
      return P.nom;
    },
    activer: function (b) { P.actif = !!b; if (!P.actif && N.S && N.S.input) N.S.input.mag = 0; return P.actif; },
    agir: agir,
    actif: function () { return P.actif; },
    nom: function () { return P.nom; }
  };
})();
