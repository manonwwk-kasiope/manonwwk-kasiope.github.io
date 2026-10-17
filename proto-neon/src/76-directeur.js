/* ===== 76-directeur.js — N.dir : les vagues, les formations, les portails, la tension =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaires : lots 5a (V1, V2) et 5b (V3 à V5, DÉFILÉ). La démo
   avait un directeur à deux minutes (nombre d'ennemis visé croissant, naissance hors du champ à plus de
   80 px de la tête) ; le repli lit désormais LA GRILLE dans N.R.secteurs[0] :
     - l'ordre des étapes (v1, vol, v2, …, cyclope) ; une vague entre (vague/entree), lance ses formations
       à leurs instants (composition de N.R.formations), dure N.R.secteurs[0].vagues[i].duree ; ensuite,
       dès qu'il reste au plus finVague.vivantsMax ennemis, ou après la soupape, elle est nettoyée
       (purge, vague/nettoyee) ;
     - chaque apparition est annoncée par un portail (événement 'portail', N.R.apparitions.portail
       secondes), hors de la vue anticipée, à plus de N.R.apparitions.distanceTete de la tête, dans les
       murs ; puis N.ennemis.spawn ;
     - LE DÉFILÉ lance ses escadrilles de planeurs ; le CYCLOPE est séquencé par 79-jeu (alerte, panneau)
       et mené par 73-colosse ;
     - la PASTILLE est posée à son instant (N.butin.lacher type 'pastille'), le TRAVELLING commandé à
       73-arene à son instant. Le TRAQUEUR et les élites viennent aux lots 5a et 5b.
   L'étape suivante démarre quand 79-jeu revient à un état de jeu (après cartes et VOL).
   Consommateurs : kill (10), ramassage (10), inversion (10). Miroir : S.vague. Flux de hasard : 'dir'. */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});
  var QUI = '76-directeur';

  var CLES = { fleches: 'fleche', larves: 'larve', mines: 'mine', dards: 'dard', tourelles: 'tourelle', ruches: 'ruche',
    lames: 'lame', sentinelles: 'sentinelle', planeurs: 'planeur' };
  var JOUER = { jeu: 1, defile: 1, boss: 1, alerte: 1, reapparition: 1, attraction: 1 };

  function SCT() { return (N.R && N.R.secteurs && N.R.secteurs[0]) || null; }
  function rng() { return N.rng('dir'); }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

  var D = { i: -1, etape: null, phase: 'attente', t: 0, sched: [], idx: 0, kills: 0, pic: 0, nettoyee: false, pastille: false,
    travelling: false, defileN: 0, defileT: 0, premier: 0 };
  var PORT = [];                                            // portails en cours {type, x, y, reste, elite}
  var VG = { n: 0, etape: 'vague', nom: '', quartier: 'docks', t: 0, evt: 'entree' };
  var PROG = { i: 0, ordre: null, etape: null, suivante: null, apresVol: false, part: 0 };

  function vagueDe(etape) {
    var s = SCT(); if (!s) return null;
    if (etape === 'defile') return s.defile;
    if (etape && etape.charAt(0) === 'v') return s.vagues[(+etape.slice(1)) - 1] || null;
    return null;
  }
  function miroir(evt) {
    var s = N.S; if (!s) return;
    var o = s.vague;
    if (!o || typeof o !== 'object') o = s.vague = { n: 0, etape: 'vague', nom: '', quartier: 'docks', t: 0, evt: 'entree' };
    o.n = VG.n; o.etape = VG.etape; o.nom = VG.nom; o.quartier = VG.quartier; o.t = D.t; if (evt) o.evt = evt;
  }
  function emettre(evt) {
    VG.evt = evt; miroir(evt);
    if (N.ev) N.ev.emit('vague', { n: VG.n, etape: VG.etape, evt: evt, nom: VG.nom, quartier: VG.quartier });
  }

  /* ---- démarrer l'étape suivante de l'ordre (on saute les VOLS : 79-jeu les mène) ---- */
  function suivante() {
    var s = SCT(); if (!s) return;
    var i = D.i + 1;
    while (i < s.ordre.length && s.ordre[i] === 'vol') i++;
    if (i >= s.ordre.length) { D.phase = 'fini'; return; }
    demarrer(i);
  }
  function demarrer(i) {
    var s = SCT(), et = s.ordre[i], v = vagueDe(et);
    D.i = i; D.etape = et; D.t = 0; D.idx = 0; D.kills = 0; D.pic = 0; D.nettoyee = false; D.pastille = false; D.travelling = false;
    D.sched.length = 0; PORT.length = 0; D.defileN = 0; D.defileT = 0;
    if (et === 'cyclope') {
      D.phase = 'cyclope';
      VG.n = 6; VG.etape = 'vague'; VG.nom = 'LE CYCLOPE'; VG.quartier = (s.cyclope && s.cyclope.quartier) || 'eclipse';
      miroir('entree');
      return;
    }
    D.phase = 'combat';
    if (et === 'defile') { VG.n = 0; VG.etape = 'defile'; VG.nom = v.nom; VG.quartier = v.quartier; }
    else {
      VG.n = v.n; VG.etape = 'vague'; VG.nom = v.nom; VG.quartier = v.quartier;
      var F = v.formations || [];
      for (var k = 0; k < F.length; k++) D.sched.push({ t: F[k].t, f: F[k].f });
      /* LA DÉFERLANTE : toutes les formations, deux à la fois (N.R … melange) */
      if (v.melange && v.melange.toutes) {
        var noms = N.ids.formations.filter(function (f) { return f !== 'escadrille'; }), r = rng();
        for (var tt = 2; tt < v.duree - 4; tt += v.melange.intervalle) for (var q = 0; q < v.melange.parSalve; q++) D.sched.push({ t: tt, f: noms[r.i(0, noms.length - 1)] });
      }
      D.sched.sort(function (a, b) { return a.t - b.t; });
      /* rien avant N.R.secteurs[0].premierEnnemi.rienAvant en V1 */
      if (v.n === 1 && s.premierEnnemi) for (k = 0; k < D.sched.length; k++) if (D.sched[k].t < s.premierEnnemi.rienAvant) D.sched[k].t = s.premierEnnemi.rienAvant;
    }
    emettre('entree');
  }

  /* ---- un point d'apparition juste (REFONTE.md § 3.8, repli) ---- */
  var PT = { x: 0, y: 0 }, ANT = { x: 0, y: 0, w: 0, h: 0 };
  function point() {
    var A = N.R && N.R.apparitions, w = N.world, p = N.S && N.S.player, r = rng(), cam = N.cam;
    var marge = (A && A.marge) || 24, dt0 = (A && A.distanceTete) || 48, mi = (A && A.interieurMurs) || 16;
    var x0 = (w ? w.x0 : 0) + mi, x1 = (w ? w.x1 : 1024) - mi, y0 = (w ? w.y0 : 0) + mi, y1 = (w ? w.y1 : 512) - mi;
    var an = cam && cam.anticipee ? cam.anticipee((A && A.anticipee) || 1.15, ANT) : null;
    for (var k = 0; k < 24; k++) {
      var x = r.r(x0, x1), y = r.r(y0, y1);
      if (p && d2(x, y, p.x, p.y) < dt0 * dt0 * 4) continue;
      if (cam && cam.visible(x, y, marge)) continue;
      if (an && x > an.x - marge && x < an.x + an.w + marge && y > an.y - marge && y < an.y + an.h + marge) continue;
      PT.x = x; PT.y = y; return PT;
    }
    return null;                                            // pas de place sûre : on réessaiera
  }
  function portail(type, elite) {
    var v = vagueDe(D.etape), plaf = (v && v.plafond) || ((SCT() && SCT().plafondDur.ennemis) || 40);
    if (D.etape !== 'defile' && vivants() + PORT.length >= plaf) return false;     // le plafond de la vague
    var p = point(); if (!p) return false;
    var dur = (N.R && N.R.apparitions && N.R.apparitions.portail) || 0.6;
    PORT.push({ type: type, x: p.x, y: p.y, reste: dur, elite: !!elite });
    if (N.ev) N.ev.emit('portail', { type: type, x: p.x, y: p.y, dur: dur, elite: !!elite });
    return true;
  }
  function formation(nom) {
    var F = N.R && N.R.formations && N.R.formations[nom]; if (!F) return;
    var r = rng();
    for (var k in F) {
      var type = CLES[k]; if (!type) continue;
      var n = Array.isArray(F[k]) ? r.i(F[k][0], F[k][1]) : (F[k] | 0);
      for (var q = 0; q < n; q++) portail(type, false);
    }
  }

  function vivants() { return N.ennemis ? N.ennemis.count() : 0; }
  function update(dt) {
    var etat = N.game && N.game.etat ? N.game.etat() : 'jeu';
    if (D.phase === 'attente' || D.phase === 'nettoyee') { if (JOUER[etat] && D.phase !== 'fini') suivante(); return; }
    if (!(dt > 0) || D.phase === 'fini' || D.phase === 'cyclope') { miroir(); return; }
    D.t += dt;
    /* les portails qui s'achèvent font naître leur ennemi */
    for (var i = PORT.length - 1; i >= 0; i--) {
      var q = PORT[i]; q.reste -= dt;
      if (q.reste <= 0) { PORT.splice(i, 1); if (N.ennemis) N.ennemis.spawn(q.type, q.x, q.y, { elite: q.elite }); }
    }
    var s = SCT(), v = vagueDe(D.etape);
    if (!v) return;
    if (D.etape === 'defile') {
      D.defileT -= dt;
      if (D.defileN < (v.escadrilles || 5) && D.defileT <= 0) { D.defileN++; D.defileT = v.intervalle || 4.5; for (var k = 0; k < (v.parEscadrille || 8); k++) portail('planeur', false); }
    } else if (etat !== 'nettoyage') {
      while (D.idx < D.sched.length && D.sched[D.idx].t <= D.t) { formation(D.sched[D.idx].f); D.idx++; }
      /* remplissage : la vague garde au moins sa formation de fond tant qu'elle n'est pas à son plafond */
      if (v.remplissage && D.t > 6 && vivants() + PORT.length < Math.min(4, v.plafond) && D.t < v.duree) formation(v.remplissage);
      if (v.pastille && !D.pastille && D.t >= v.pastille && N.butin) {
        D.pastille = true;
        var pp = point(); if (pp) N.butin.lacher(pp.x, pp.y, 1, { type: 'pastille' });
      }
      if (v.travelling && !D.travelling && D.t >= v.travelling.t && N.arene) { D.travelling = true; N.arene.travelling(v.travelling.vx, 'gauche'); }
    }
    var n = vivants();
    if (n > D.pic) D.pic = n;
    /* la fin : durée passée et presque plus personne, ou la soupape */
    var fin = s && s.finVague ? s.finVague.vivantsMax : 2;
    if (!D.nettoyee && D.t >= v.duree && PORT.length === 0 && (n <= fin || D.t >= v.duree + ((s && s.soupape) || 12))) {
      D.nettoyee = true; D.phase = 'nettoyee';
      if (N.ennemis) N.ennemis.purge('distance');
      emettre('nettoyee');
      return;
    }
    miroir();
  }

  function abonner() {
    if (!N.ev) return;
    N.ev.on('kill', 10, function () { D.kills++; }, QUI);
    N.ev.on('ramassage', 10, function () { /* l'inaction du TRAQUEUR se mesure ici (lot 5a) */ }, QUI);
    N.ev.on('inversion', 10, function () { /* les apparitions attendent la fin de l'INVERSION (lot 5a) */ }, QUI);
  }

  N.dir = {
    /* secteur : N.R.secteurs[0] par défaut ; opts.depart : index dans l'ordre ou nom d'étape ('v3', 'cyclope') */
    reset: function (secteur, opts) {
      D.i = -1; D.etape = null; D.phase = 'attente'; D.t = 0; D.sched.length = 0; PORT.length = 0; D.pic = 0; D.kills = 0;
      VG.n = 0; VG.etape = 'vague'; VG.nom = ''; VG.quartier = 'docks';
      abonner();
      var s = SCT();
      if (s && opts && opts.depart !== undefined) {
        var i = typeof opts.depart === 'number' ? opts.depart : s.ordre.indexOf(opts.depart);
        if (i > 0) D.i = i - 1;
      }
      var o = N.S; if (o) { o.vague = null; miroir('entree'); }
    },
    update: update,
    vague: function () { return VG; },
    phase: function () { return D.phase; },
    tension: function () {
      var n = VG.n, base = n >= 6 ? 0.9 : n === 0 ? 0.3 : 0.1 + 0.15 * n;
      return Math.max(0, Math.min(1, base + vivants() / 80));
    },
    progression: function () {
      var s = SCT();
      PROG.i = D.i; PROG.ordre = s ? s.ordre : null; PROG.etape = D.etape;
      PROG.apresVol = !!(s && s.ordre[D.i + 1] === 'vol');
      var j = D.i + 1; while (s && j < s.ordre.length && s.ordre[j] === 'vol') j++;
      PROG.suivante = s && j < s.ordre.length ? s.ordre[j] : null;
      PROG.part = s ? Math.max(0, D.i) / (s.ordre.length - 1) : 0;
      return PROG;
    },
    entrees: function () { return PORT; }
  };
})();
