/* ===== 71-butin.js — N.butin : cellules, noyaux, pastille (aimant, ramassage, expiration) =====

   Tiré de 70-game.js (lot 0b) : addCell, freeCell, updCells, drawCells. Chaque objet est au schéma `butin`
   (§ 7.5) : { id, type, x, y, valeur, vie } ; ce qui est propre au module est préfixé « _ ».

   ÉMET `ramassage` (seul émetteur) : { type, x, y, valeur }. Ses effets arrivent par N.ev (la joueuse grandit au
   rang 10, le score compte au rang 20, la mise en scène joue le son au rang 60), jamais par appel.
   CONSOMME `kill` (rang 40) : le largage de l'ennemi tué ; `coupe` (rang 40) : une cellule pour deux segments
   détachés ; `lasso` (rang 40) : l'aspiration des tués, quand N.joueuse l'émettra.

   PUBLIE S.butin = la liste vivante (même tableau que N.butin.list), republiée à reset() et à chaque update() (lot I).
   Interface : reset(), update(dt), draw(), lacher(x, y, n, {type, vie, libre, tele}), aspirer(poly), pluie(n),
   list. Chiffres : N.R.butin ; ceux de la démo qui manquent sont dans CFG, marqués « → N.R ».

   LE RÉGÉNÉRATEUR (chantier n° 4, comme 66-grille.js et refonte/prototypes/la-grille.html) : EN AVENTURE SEULEMENT
   (N.aventure.enCours() vrai : la partie lancée par JOUER depuis le titre). Après une coupe ou une mort qui a coûté des
   segments, un losange jaune à croix de brasier s'annonce (anneaux qui se resserrent, « RÉGÉNÉRATEUR »), puis attend
   sur le terrain ; il clignote avant de s'éteindre. Pris par la tête, il fait repousser les segments perdus un à un
   (N.joueuse.grandir, l'API publique). Au plus un à la fois. Son hasard vient de son propre générateur, semé par
   N.rng.hash(graine de la partie, 'regenerateur') : il ne tire dans aucun flux de la partie, ne lit aucune horloge,
   n'émet ni n'écoute aucun événement de plus (il se branche dans le consommateur `coupe` existant). Hors aventure
   (départs directs, pilotes, attraction), il ne fait RIEN : la partie est identique, tirage pour tirage.
   Ses chiffres sont dans REGEN ci-dessous (hors N.R : 02-regles.js est réservé). */
N.butin = (function () {
  'use strict';
  var O = N.outils, R = N.R;
  var CFG = {                                  // → N.R
    libreVie: 14,                              // une cellule libre dure 14 s dans la démo
    largage: { fleche: 1, mine: 1, tourelle: 2, sentinelle: 2, cyclope: 24 },
    vitesseLacher: 50, plafond: 140,
    pastilleMarge: 24, pastilleDist: 160            // la pastille naît à 160 px au moins de la tête (§ 2.17)
  };
  var L = [];
  var S = null;
  var XP = { total: 0, niveau: 0 };                 // l'expérience gagnée (75-cartes la dépense) : relevé de repli
  var PA = { vague: -1, t: 0, faite: false, auto: true };   // la pastille de la vague, tant que 76-directeur ne la demande pas
  var fusT = 0;

  /* ---- le régénérateur : ses réglages (→ N.R.butin.regenerateur, quand 02-regles.js sera libre) ---- */
  var REGEN = {
    seuil: 2,                  // il faut avoir perdu au moins 2 segments pour qu'il vienne
    delai: 1.2,                // s entre la perte et l'annonce (la coupe a sa propre mise en scène)
    annonce: 0.9,              // s d'annonce : des anneaux se resserrent sur le point, il n'est pas encore à prendre
    vie: 11,                   // s sur le terrain une fois allumé
    clignote: 3,               // il clignote pendant ses 3 dernières secondes
    recharge: 5,               // s d'attente après qu'il a été pris ou s'est éteint, avant le suivant
    rendreMax: 30,             // segments rendus au plus par ramassage
    pas: 0.09,                 // s entre deux segments rendus (la repousse se voit)
    prise: 10,                 // px : rayon de ramassage par la tête (il n'est pas aimanté)
    distMin: 60, distMax: 150, // px : là où il naît, par rapport à la tête
    marge: 18                  // px : loin des murs et des bords de la vue
  };
  /* son état : etat 'aucun' | 'attente' (perte notée, délai) | 'annonce' | 'pret' ; perdu = segments à rendre */
  var RG = { etat: 'aucun', t: 0, x: 0, y: 0, vie: 0, perdu: 0, rendre: 0, pasT: 0, repos: 0, graine: 1, lenVu: 0, mort: null,
    pris: 0, eteints: 0, rendus: 0, apparus: 0 };
  var RGP = [];                                        // ses éclats (son propre hasard, jamais le flux 'fx')

  function conf(type) { return (R && R.butin && R.butin[type]) || {}; }
  function prise() { return (R && R.butin && R.butin.prise) || 8; }
  function aimant() {
    if (N.cartes && N.cartes.mods && N.cartes.mods.aimant) return N.cartes.mods.aimant;
    return (R && R.butin && R.butin.aimant && R.butin.aimant[0]) || 28;
  }
  function vitAimant() { return (R && R.butin && R.butin.vitesseAimant) || 220; }

  function reset() {
    S = N.S;
    L.length = 0;
    XP.total = 0; XP.niveau = 0; PA.vague = -1; PA.t = 0; PA.faite = false; fusT = 0;
    regenReset();
    if (S) S.butin = L;                                            // la vue du contrat : la liste vivante (objets au schéma `butin`), lue par les pilotes
  }

  function lacher(x, y, n, opts) {
    opts = opts || {};
    var type = opts.type || 'cellule', c = conf(type), v = opts.libre ? 0 : CFG.vitesseLacher;
    for (var i = 0; i < (n | 0) && L.length < CFG.plafond; i++) {
      var vie = opts.vie || (opts.libre ? CFG.libreVie : c.expire || 9);
      L.push({
        id: N.ids.suivant(), type: type, x: x, y: y, valeur: c.energie || 1, vie: vie,
        _vx: v ? O.rr('butin', -v, v) : 0, _vy: v ? O.rr('butin', -v, v) : 0, _t: 0, _tele: opts.tele || 0,
        _libre: !!opts.libre, _f: L.length & 3, _aspire: false
      });
    }
  }

  /* des cellules libres : toujours un peu à prendre, loin de la tête */
  function libre(tele) {
    var A = O.A, V = O.VUE, J = N.joueuse && N.joueuse.tete;
    for (var k = 0; k < 10; k++) {
      var x0 = Math.max(A.x0, V.x) + 8, x1 = Math.min(A.x1, V.x + V.w) - 8, y0 = Math.max(A.y0, V.y) + 8, y1 = Math.min(A.y1, V.y + V.h) - 8;
      var x = O.rr('butin', x0, Math.max(x0 + 1, x1)), y = O.rr('butin', y0, Math.max(y0 + 1, y1));
      if (!J || O.d2(x, y, J.x, J.y) > 45 * 45) { lacher(x, y, 1, { libre: true, tele: tele || 0 }); return; }
    }
  }
  /* pastille(x, y) : l'objet ramassable qui déclenche l'INVERSION (§ 2.6, 2.17). Jamais aimantée, expire en 12 s.
     Sans position, 160 px au moins de la tête, dans l'arène. Rend l'objet. */
  function pastille(x, y) {
    var A = O.A, J = N.joueuse && N.joueuse.tete, k, m = CFG.pastilleMarge;
    if (typeof x !== 'number') {
      for (k = 0; k < 24; k++) {
        x = O.rr('butin', A.x0 + m, Math.max(A.x0 + m + 1, A.x1 - m)); y = O.rr('butin', A.y0 + m, Math.max(A.y0 + m + 1, A.y1 - m));
        if (!J || O.d2(x, y, J.x, J.y) >= CFG.pastilleDist * CFG.pastilleDist) break;
      }
    }
    var c = conf('pastille'), o = { id: N.ids.suivant(), type: 'pastille', x: x, y: y, valeur: 1, vie: c.expire || 12,
      _vx: 0, _vy: 0, _t: 0, _tele: 0, _libre: true, _f: 0, _aspire: false };
    L.push(o);
    return o;
  }
  /* la pastille de la vague, en repli : V2 à V5, à +20 / +14 / +18 / +22 s ; l'événement `vague` n'est pas consommé ici (hors tableau) */
  function pastilleAuto(dt) {
    var iv = R && R.inversion;
    if (!iv || !PA.auto || !N.dir || !N.dir.vague) return;
    if (N.dir.pastille) return;                                    // 76-directeur la demande lui-même
    var w = N.dir.vague(), n = (w && typeof w === 'object') ? (w.n | 0) : (w | 0);
    if (n !== PA.vague) { PA.vague = n; PA.t = 0; PA.faite = false; }
    if (PA.faite || iv.vagues.indexOf(n) < 0) return;
    var ph = N.dir.phase ? N.dir.phase() : '';
    if (ph === 'boss' || ph === 'vol' || ph === 'defile' || ph === 'nettoyage') return;
    PA.t += dt;
    if (PA.t >= iv.apparition[n]) { PA.faite = true; pastille(); }
  }
  function pluie(n) { for (var i = 0; i < (n | 0); i++) libre(0.5); }
  function nbLibres() { var n = 0; for (var i = 0; i < L.length; i++) if (L[i]._libre) n++; return n; }

  /* aspirer(poly) : les objets dans le polygone [x0, y0, x1, y1, ...] sont aspirés vers la tête (LASSO) */
  function aspirer(poly) {
    if (!poly || poly.length < 6) return 0;
    var n = 0;
    for (var i = 0; i < L.length; i++) {
      var o = L[i], dedans = false, nv = poly.length / 2;
      for (var a = 0, b = nv - 1; a < nv; b = a++) {
        var xa = poly[a * 2], ya = poly[a * 2 + 1], xb = poly[b * 2], yb = poly[b * 2 + 1];
        if (((ya > o.y) !== (yb > o.y)) && (o.x < (xb - xa) * (o.y - ya) / (yb - ya) + xa)) dedans = !dedans;
      }
      if (dedans) { o._aspire = true; n++; }
    }
    return n;
  }

  /* trois cellules à moins de 10 px les unes des autres fusionnent en une seule, qui garde leur valeur cumulée (§ 2.6) */
  function fusionner() {
    var f = (R && R.butin && R.butin.fusion) || { nombre: 3, distance: 10 }, d2m = f.distance * f.distance, i, j, k;
    for (i = 0; i < L.length; i++) {
      var a = L[i];
      if (a.type !== 'cellule' || a._tele > 0 || a._aspire) continue;
      var grp = null;
      for (j = i + 1; j < L.length; j++) {
        var b = L[j];
        if (b.type !== 'cellule' || b._tele > 0 || b._aspire || O.d2(a.x, a.y, b.x, b.y) > d2m) continue;
        if (!grp) grp = [];
        grp.push(j);
        if (grp.length >= f.nombre - 1) break;
      }
      if (grp && grp.length >= f.nombre - 1) {
        for (k = grp.length - 1; k >= 0; k--) { a.valeur += L[grp[k]].valeur; a.vie = Math.max(a.vie, L[grp[k]].vie); L.splice(grp[k], 1); }
        return;                                                    // une fusion par passage : l'indice des suivantes a bougé
      }
    }
  }

  function update(dt) {
    if (!S) S = N.S;
    if (S && S.butin !== L) S.butin = L;
    if (N.joueuse && N.joueuse.apres) O.safe('joueuse.apres', function () { N.joueuse.apres(dt); });     // après N.ennemis.update : l'INVERSION
    pastilleAuto(dt);
    fusT += dt; if (fusT >= 0.2) { fusT = 0; fusionner(); }
    var J = N.joueuse, T = J && J.tete, vivant = J && (J.etat === 'vivant' || J.etat === 'reapparition');
    var am = aimant(), pr = prise();
    for (var i = L.length - 1; i >= 0; i--) {
      var c = L[i];
      c._t += dt;
      if (c._tele > 0) { c._tele -= dt; continue; }
      c.vie -= dt;
      if (c.vie <= 0) { L.splice(i, 1); continue; }
      var f = Math.pow(0.05, dt); c._vx *= f; c._vy *= f;
      if (vivant && T) {
        var dd = O.d2(c.x, c.y, T.x, T.y);
        if (c.type !== 'pastille' && (dd < am * am || c._aspire)) {
          var d = Math.sqrt(dd) || 1, pull = c._aspire ? vitAimant() * 2 : 160 * (1 - Math.min(1, d / am)) + 40;
          c._vx += (T.x - c.x) / d * pull * dt * 6; c._vy += (T.y - c.y) / d * pull * dt * 6;
        }
        if (dd < pr * pr) {
          L.splice(i, 1);
          XP.total += conf(c.type).xp || 0; XP.niveau = R.f.niveau(XP.total);
          if (N.ev) N.ev.emit('ramassage', { type: c.type, x: c.x, y: c.y, valeur: c.valeur });
          continue;
        }
      }
      c.x += c._vx * dt; c.y += c._vy * dt;
      var A = O.A;
      c.x = O.clamp(c.x, A.x0 - 4, A.x1 + 4); c.y = O.clamp(c.y, A.y0 - 4, A.y1 + 4);
    }
    if (enAventure()) regenUpdate(dt);                             // hors aventure : rien de plus, pas même un tirage
  }

  function draw() {
    var f = Math.floor(O.T.ak * 8), g = N.gfx;
    for (var i = 0; i < L.length; i++) {
      var c = L[i];
      if (c._tele > 0) {                                    // une cellule libre s'allume, elle n'apparaît pas d'un coup
        var k = 1 - c._tele / 0.5;
        g.px(c.x, c.y, O.AMBRE); g.px(c.x - 3 * k, c.y, O.AMBRE); g.px(c.x + 3 * k, c.y, O.AMBRE); g.px(c.x, c.y - 3 * k, O.AMBRE); g.px(c.x, c.y + 3 * k, O.AMBRE);
        continue;
      }
      if (c.vie < ((R && R.butin && R.butin.clignoteAvant) || 2) && (f & 1)) continue;
      if (c.type === 'pastille') { drawPastille(c); continue; }
      O.put(O.sp(c.type === 'noyau' ? 'butin:noyau' : 'butin', f + c._f), c.x, c.y);
      if (c.valeur > 1 && c.type === 'cellule') g.ring(c.x, c.y, 5, O.AMBRE, 0.6);          // une cellule fusionnée se voit
    }
    if (RG.etat === 'annonce' || RG.etat === 'pret' || RGP.length) regenDraw();
  }

  /* la pastille : disque os à quatre rayons jaunes, qui bat à 2 Hz (§ 2.6) ; repli de N.spr */
  function drawPastille(c) {
    var g = N.gfx, bat = (Math.floor(O.T.ak * 4) & 1) ? 1 : 0, x = Math.round(c.x), y = Math.round(c.y), r = 3 + bat, i;
    g.circ(x, y, 3, O.OS);
    g.px(x, y, O.JAUNE);
    for (i = 4; i <= 5 + bat; i++) { g.px(x + i, y, O.JAUNE); g.px(x - i, y, O.JAUNE); g.px(x, y + i, O.JAUNE); g.px(x, y - i, O.JAUNE); }
    g.ring(x, y, r + 3, O.JAUNE, bat ? 1 : 0.5);
  }

  /* ============================ le régénérateur (aventure seulement) ============================ */
  function enAventure() { return !!(N.aventure && N.aventure.enCours && N.aventure.enCours()); }
  /* son générateur à lui : la suite congruentielle de N.rng, semée hors registre, jamais tirée ailleurs */
  function rgf() { RG.graine = (RG.graine * 1664525 + 1013904223) % 4294967296; return RG.graine / 4294967296; }
  function rgr(a, b) { return a + (b - a) * rgf(); }
  function regenReset() {
    var g = (N.rng && N.rng.graine) ? N.rng.graine() : 2975;
    RG.etat = 'aucun'; RG.t = 0; RG.vie = 0; RG.perdu = 0; RG.rendre = 0; RG.pasT = 0; RG.repos = 0; RG.lenVu = 0; RG.mort = (N.S && N.S.death) || null;
    RG.pris = 0; RG.eteints = 0; RG.rendus = 0; RG.apparus = 0;
    RG.graine = (N.rng && N.rng.hash) ? N.rng.hash(g, 'regenerateur') : ((g ^ 0x5e9e) >>> 0) || 1;
    RGP.length = 0;
  }
  /* une perte (coupe ou mort) : les segments s'ajoutent à rendre ; s'il n'y a pas de régénérateur, il viendra */
  function regenPerte(n) {
    if (!(n > 0)) return;
    RG.perdu += n;
    if (RG.etat === 'aucun' && RG.perdu >= REGEN.seuil) { RG.etat = 'attente'; RG.t = -Math.max(0, RG.repos); }
  }
  /* là où il naît : dans l'arène ET dans la vue, à bonne distance de la tête, loin des murs */
  function regenPlacer() {
    var A = O.A, V = O.VUE, J = N.joueuse && N.joueuse.tete, m = REGEN.marge, k, x = 0, y = 0;
    var x0 = Math.max(A.x0, V.x) + m, x1 = Math.min(A.x1, V.x + V.w) - m, y0 = Math.max(A.y0, V.y) + m, y1 = Math.min(A.y1, V.y + V.h) - m;
    if (x1 < x0) { x0 = x1 = (A.x0 + A.x1) / 2; } if (y1 < y0) { y0 = y1 = (A.y0 + A.y1) / 2; }
    for (k = 0; k < 24; k++) {
      x = rgr(x0, x1); y = rgr(y0, y1);
      if (!J) break;
      var d2 = O.d2(x, y, J.x, J.y);
      if (d2 >= REGEN.distMin * REGEN.distMin && d2 <= REGEN.distMax * REGEN.distMax) break;
    }
    RG.x = x; RG.y = y;
  }
  function regenEclats(x, y, n, v0, v1, vie) {
    for (var i = 0; i < n && RGP.length < 80; i++) {
      var a = rgr(0, O.TAU), v = rgr(v0, v1);
      RGP.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, d: rgr(vie * 0.6, vie), c: (i % 3) ? O.JAUNE : O.AMBRE });
    }
  }
  function regenTexte(s) { if (N.hud && N.hud.pop) O.safe('hud.pop', function () { N.hud.pop(RG.x, RG.y - 22, s, { c: O.JAUNE }); }); }
  function regenUpdate(dt) {
    var J = N.joueuse, T = J && J.tete, vivant = !!(J && (J.etat === 'vivant' || J.etat === 'reapparition')), i;
    /* la mort : ce que la réapparition a pris (la moitié de la longueur) compte aussi comme perte. N.butin n'est pas
       mis à jour pendant la mort ; on la reconnaît à S.death, un nouvel objet à chaque mort (70-joueuse, tuer) */
    if (J && J.len && vivant) {
      var n = J.len(), dm = S && S.death;
      if (dm && dm !== RG.mort) { RG.mort = dm; if (RG.lenVu > n) regenPerte(RG.lenVu - n); }
      RG.lenVu = n;
    }
    if (RG.repos > 0) RG.repos -= dt;
    if (RG.etat === 'attente') {
      if ((RG.t += dt) >= REGEN.delai && vivant) { regenPlacer(); RG.etat = 'annonce'; RG.t = 0; RG.apparus++; regenTexte('RÉGÉNÉRATEUR'); O.sfx('bip'); }
    } else if (RG.etat === 'annonce') {
      if ((RG.t += dt) >= REGEN.annonce) { RG.etat = 'pret'; RG.t = 0; RG.vie = REGEN.vie; regenEclats(RG.x, RG.y, 8, 20, 50, 0.35); }
    } else if (RG.etat === 'pret') {
      RG.t += dt;
      if ((RG.vie -= dt) <= 0) {                                 // pas pris : il s'éteint, et reviendra à la prochaine perte
        RG.etat = 'aucun'; RG.eteints++; RG.repos = REGEN.recharge; regenEclats(RG.x, RG.y, 6, 10, 30, 0.3);
        if (RG.perdu >= REGEN.seuil) { RG.etat = 'attente'; RG.t = -REGEN.recharge; }
      } else if (vivant && T && O.d2(RG.x, RG.y, T.x, T.y) < REGEN.prise * REGEN.prise) {
        RG.rendre += Math.min(RG.perdu, REGEN.rendreMax); RG.perdu -= Math.min(RG.perdu, REGEN.rendreMax);
        RG.etat = 'aucun'; RG.pris++; RG.repos = REGEN.recharge; RG.pasT = 0;
        regenEclats(RG.x, RG.y, 18, 30, 90, 0.6);
        regenTexte('RÉGÉNÉRATION +' + RG.rendre);
        O.sfx('vie');
        if (RG.perdu >= REGEN.seuil) { RG.etat = 'attente'; RG.t = -REGEN.recharge; }
      }
    }
    /* la repousse : un segment toutes les 0,09 s, une étincelle à la queue ; la mort l'interrompt (le reste attend) */
    if (RG.rendre > 0) {
      if (!vivant) { RG.perdu += RG.rendre; RG.rendre = 0; }
      else if ((RG.pasT += dt) >= REGEN.pas) {
        RG.pasT -= REGEN.pas;
        var avant = J.len();
        J.grandir(1);
        if (J.len() > avant) {
          RG.rendre--; RG.rendus++; RG.lenVu = J.len();
          if (J.segPos) {                                        // la queue s'allume là où le segment repousse
            var q = J.segPos(J.len());
            regenEclats(q.x, q.y, 3, 15, 45, 0.3);
            if (RGP.length < 80) RGP.push({ x: q.x, y: q.y, vx: 0, vy: 0, t: 0, d: 0.28, c: O.JAUNE, r: 6 });
          }
        } else RG.rendre = 0;                                    // la longueur maximale est atteinte
      }
    }
    for (i = RGP.length - 1; i >= 0; i--) {
      var p = RGP[i]; p.t += dt;
      if (p.t >= p.d) { RGP.splice(i, 1); continue; }
      var f = Math.pow(0.08, dt); p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  /* le dessin : un losange jaune qui tourne, une croix de brasier au cœur (le « soin » de la grille), un halo ambre ;
     l'annonce : deux anneaux qui se resserrent et un point qui s'allume. Jamais de cyan : il est au serpent. */
  function regenDraw() {
    var g = N.gfx, ak = O.T.ak, x = Math.round(RG.x), y = Math.round(RG.y), i, k;
    for (i = 0; i < RGP.length; i++) {
      var p = RGP[i];
      if (p.r) { g.ring(p.x, p.y, Math.round(p.r * (0.4 + 0.6 * p.t / p.d)), p.c, 1 - p.t / p.d); continue; }   // l'anneau de repousse
      if (p.t / p.d > 0.6 && !N.pal.dither(Math.round(p.x), Math.round(p.y), (1 - p.t / p.d) / 0.4)) continue;
      g.px(p.x, p.y, p.c);
    }
    if (RG.etat === 'annonce') {
      k = RG.t / REGEN.annonce;
      g.ring(x, y, Math.round(24 - 16 * k), O.JAUNE, 0.5 + 0.5 * k);
      g.ring(x, y, Math.round(34 - 22 * k), O.AMBRE, 0.3 + 0.5 * k);
      g.px(x, y, O.OS);
      if (k > 0.5) { g.px(x - 1, y, O.JAUNE); g.px(x + 1, y, O.JAUNE); g.px(x, y - 1, O.JAUNE); g.px(x, y + 1, O.JAUNE); }
      regenChevron();
      return;
    }
    if (RG.etat !== 'pret') return;
    if (RG.vie < REGEN.clignote && (Math.floor(ak * (RG.vie < 1 ? 12 : 6)) & 1)) return;   // il va s'éteindre
    var bat = (Math.floor(ak * 3) & 1), a = ak * 2.4, r = 6, X = [], Y = [];
    for (k = 0; k < 4; k++) { X.push(x + Math.round(Math.cos(a + k * Math.PI / 2) * r)); Y.push(y + Math.round(Math.sin(a + k * Math.PI / 2) * r)); }
    g.ring(x, y, 9 + bat, O.AMBRE, bat ? 0.7 : 0.4);
    for (k = 0; k < 4; k++) g.line(X[k], Y[k], X[(k + 1) & 3], Y[(k + 1) & 3], bat ? O.OS : O.JAUNE);
    for (k = 0; k < 4; k++) g.px(X[k], Y[k], O.OS);
    for (k = -2; k <= 2; k++) { g.px(x + k, y, O.BRASIER); g.px(x, y + k, O.BRASIER); }
    g.px(x, y, O.OS);
    regenChevron();
  }
  /* hors de la vue : un chevron jaune sur le bord, qui montre où il attend (comme ceux, magenta, des ennemis) */
  function regenChevron() {
    var g = N.gfx, V = O.VUE, k;
    if (V && V.w > 0 && !O.visible(RG.x, RG.y, -4)) {
      var cx = O.clamp(RG.x, V.x + 6, V.x + V.w - 7), cy = O.clamp(RG.y, V.y + 6, V.y + V.h - 7), an = Math.atan2(RG.y - cy, RG.x - cx);
      var c = Math.cos(an), s = Math.sin(an);
      for (k = 0; k < 4; k++) { g.px(cx + c * (2 - k) - s * k, cy + s * (2 - k) + c * k, O.JAUNE); g.px(cx + c * (2 - k) + s * k, cy + s * (2 - k) - c * k, O.JAUNE); }
      g.px(cx, cy, O.BRASIER);
    }
  }

  /* ---- les consommateurs ---- */
  if (N.ev) {
    N.ev.on('kill', 40, function (c) {
      if (c.src && c.src.genre === 'decor') return;               // la purge de fin de vague ne largue rien
      var lg = (R && R.butin && R.butin.largages) || {}, n;
      if (c.boss) n = CFG.largage.cyclope;
      else if (c.elite) { n = (lg.elite && lg.elite.cellules) || 6; if (!c.boss) lacher(c.x, c.y, (lg.elite && lg.elite.noyaux) || 1, { type: 'noyau' }); }
      else n = O.rf('butin') < ((c.type === 'larve' ? lg.larve : lg.ordinaire) || 0.45) ? 1 : 0;       // 1 cellule dans 45 % des cas
      if (c.boss) {                                         // le colosse éclate en couronne
        for (var k = 0; k < n; k++) {
          var a = k / n * O.TAU, v = O.rr('butin', 40, 90);
          if (L.length < CFG.plafond) L.push({ id: N.ids.suivant(), type: 'cellule', x: c.x, y: c.y, valeur: 1, vie: conf('cellule').expire || 9,
            _vx: Math.cos(a) * v, _vy: Math.sin(a) * v, _t: 0, _tele: 0, _libre: false, _f: L.length & 3, _aspire: false });
        }
      } else lacher(c.x, c.y, n, { type: 'cellule' });
    }, '71-butin');
    N.ev.on('lasso', 40, function (c) {
      /* 1 cellule par ennemi enfermé, et 1 noyau à partir de 4 : elles tombent au centre de la boucle et sont aspirées */
      var lg = (R && R.butin && R.butin.largages && R.butin.largages.lasso) || { parEnnemi: 1, noyauDes: 4 }, i, a, v, mark = L.length;
      for (i = 0; i < c.n * lg.parEnnemi; i++) lacher(c.x, c.y, 1, { type: 'cellule' });
      if (c.n >= lg.noyauDes) lacher(c.x, c.y, 1, { type: 'noyau' });
      for (i = mark; i < L.length; i++) { a = i * 2.4; v = O.rr('butin', 10, 30); L[i]._vx = Math.cos(a) * v; L[i]._vy = Math.sin(a) * v; L[i]._aspire = true; }
    }, '71-butin');
    N.ev.on('coupe', 40, function (c) {
      /* une cellule pour deux segments détachés, à l'endroit où ils étaient (la trace les garde encore) */
      var J = N.joueuse, cm = (R && R.mort && R.mort.coupe) || { segmentsParCellule: 2, expireCellules: 3 };
      if (!J || !J.segPos) return;
      var base = J.len();
      for (var i = 0; i < c.perdus; i += cm.segmentsParCellule) {
        var p = J.segPos(base + i);
        lacher(p.x, p.y, 1, { type: 'cellule', vie: cm.expireCellules });
      }
      if (enAventure()) regenPerte(c.perdus | 0);                  // le régénérateur viendra (aventure seulement)
    }, '71-butin');
  }

  return { reset: reset, update: update, draw: draw, lacher: lacher, aspirer: aspirer, pluie: pluie, libre: libre, nbLibres: nbLibres, pastille: pastille, xp: XP, fusionner: fusionner, list: L,
    /* le régénérateur, en lecture (bancs, tools/regen) : une copie, jamais l'état lui-même */
    regenerateur: function () { return { etat: RG.etat, x: RG.x, y: RG.y, vie: RG.vie, perdu: RG.perdu, rendre: RG.rendre, pris: RG.pris, eteints: RG.eteints,
      rendus: RG.rendus, apparus: RG.apparus, actif: enAventure() }; },
    regenReglages: REGEN };
})();
