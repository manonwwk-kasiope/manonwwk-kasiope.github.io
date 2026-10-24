/* ===== 80-ecrans.js — N.ui : les écrans (démarrage, titre, cartes, pause, fin) =====

   Tiré de 70-game.js (lot 0b) : drawPause, drawFinBG, drawFinTop. Le lot F y ajoute : l'ÉCRAN DES CARTES au doigt (§ 2.7,
   5.6 : 3 à 5 plaques, rareté lue par l'encre et par les crans, chute à 55 ms d'écart, « CHOISIS n », un toucher n'est
   accepté qu'après la garde de N.R.cartes.garde), la PAUSE (REPRENDRE, cartes prises, défi) et l'ÉCRAN DE FIN (§ 5.6 :
   cause de la mort, progression, score et écart, build, bilan, note, défi, conseil, énergie et PROCHAIN DÉBLOCAGE avec sa
   barre, CONTINUER et REJOUER). Les données de la fin viennent de N.score.resume() ; la main des cartes, de N.cartes.main().

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
  var niv = {}, NIV_VIDE = {};                       // S.ecran.niveaux : { idCarte: palier que la carte donnerait } (1 à 4 ; 4 = l'ULTIME d'une arme)
  var retourReglages = 'titre', pageReglages = 0, retourToucher = null;
  var OPTIONS = [
    ['actions', 'ACTIONS', ['DOIGTS', 'AUTO']], ['manche', 'MANCHE', ['PETIT', 'NORMAL', 'GRAND']],
    ['secousse', 'SECOUSSES', ['PLEINES', 'DOUCES', 'NON']], ['flashs', 'FLASHS', ['OUI', 'NON']],
    ['ecran', 'ÉCRAN', ['RICHE', 'SOBRE', 'PUR']], ['texte', 'TEXTE', ['NORMAL', 'GRAND']],
    ['musique', 'MUSIQUE', ['OUI', 'NON']], ['effets', 'EFFETS', ['OUI', 'NON']]
  ];

  function garde() { return (R && R.cartes && R.cartes.garde) || 0.4; }
  function ouvrir(nom, opts) {
    if (nom !== 'titre') duo(false);
    cur = nom; T = 0; out = null; choix = 0; bruit = false;
    cur_opts = opts || {};
    if (nom === 'fin') choix = 1; // Entrée/Espace garde REJOUER par défaut (R-35).
    if (nom === 'cartes') {
      /* la main du tirage ; sans N.cartes, le repli v0 */
      if (N.cartes && N.cartes.main) {
        main = O.safe('cartes.main', function () { return N.cartes.main(null, { vague: N.dir && N.dir.vague ? N.dir.vague() : 0, trophee: !!cur_opts.trophee, rareGarantie: !!cur_opts.rareGarantie }); }) || [];
        nChoix = Math.max(1, N.cartes.choix());
      } else { main = CARTES.map(function (c) { return c.id; }); nChoix = 1; }
      niv = {};
      for (var q = 0; q < main.length; q++) {
        var tx = (N.cartes && N.cartes.texte) ? O.safe('cartes.texte', function () { return N.cartes.texte(main[q]); }) : null;
        niv[main[q]] = (tx && typeof tx.palier === 'number') ? Math.max(0, Math.min(4, tx.palier | 0)) : 1;
      }
      restant = nChoix; gardeJ = garde();
      if (!main.length) out = { ecran: 'cartes', action: 'carte', index: 0, id: null };      // vivier vide : on passe
      O.sfx('carte');
    }
    publier();
  }
  function fermer() { duo(false); cur = null; out = null; publier(); }
  function actif() { return cur !== null; }
  function ecran() { return cur; }
  function sortie() { var o = out; out = null; return o; }
  function publier() {
    var s = N.S; if (!s) return;
    s.ecran = { nom: cur, depuis: T, cartes: cur === 'cartes' ? main.slice() : [], niveaux: cur === 'cartes' ? niv : NIV_VIDE, choix: choix, pret: T >= (cur === 'cartes' ? gardeJ : CFG.garde) };
    if (cur === 'fin') s.ecran.fin = finActions();
  }

  /* ============================ les entrées ============================ */
  function update(dt) {
    if (!cur) return;
    T += dt;
    if (retourToucher) { retourToucher.t -= dt; if (retourToucher.t <= 0) retourToucher = null; }
    var taps = O.taps, i;
    for (i = 0; i < taps.length; i++) {
      var q = taps[i];
      if (q.key === 'KeyM' || (q.key === null && q.bouton === 'son')) continue;         // le bouton son est au HUD
      if (cur === 'reglages') entreeReglages(q);
      else if (cur === 'titre' || cur === 'pause') {
        var rb = boutonReglages();
        if (T >= R.accueilU1.garde && (q.key === 'KeyR' || dedans(q, rb))) {
          retourReglages = cur; pageReglages = 0; ouvrir('reglages');
        } else if (cur === 'titre' && T >= R.accueilU1.garde) out = { ecran: cur, action: 'jouer' };
        else if (cur === 'pause' && q.key !== 'Tab') out = { ecran: cur, action: 'reprendre' };
      }
      else if (cur === 'demarrage') { if (T >= R.accueilU1.garde) out = { ecran: cur, action: 'jouer' }; }
      else if (cur === 'fin') entreeFin(q);
      else if (cur === 'cartes') entreeCartes(q);
    }
    publier();
  }
  function dedans(q, b) { return q.key === null && q.x >= b.x && q.x < b.x + b.w && q.y >= b.y && q.y < b.y + b.h; }
  function tailleTitre() {
    var sf = O.geo.safe, disponible = O.geo.W - Math.ceil(sf.l) - Math.ceil(sf.r) - R.accueilU1.marge * 2;
    var k = R.accueilU1.titreMax;
    while (k > 1 && O.textW('SNAKE 2975', k) + k * 2 > disponible) k--;
    return k;
  }
  function boutonReglages() {
    var C = R.accueilU1, sf = O.geo.safe;
    var h = Math.max(Math.ceil(C.ciblePt / px()), C.entete);
    return { x: Math.ceil(sf.l) + C.marge, y: O.geo.H - Math.ceil(sf.b) - C.marge - h,
      w: O.geo.W - Math.ceil(sf.l) - Math.ceil(sf.r) - C.marge * 2, h: h };
  }
  function boutonUI(b, lib, actif, sc) {
    var C = R.accueilU1, g = N.gfx;
    g.rect(b.x, b.y, b.w, b.h, actif ? O.INDIGO : O.ARDOISE);
    g.rect(b.x, b.y, b.w, 1, actif ? O.JAUNE : O.ACIER);
    O.textC(lib, b.x + b.w / 2, b.y + Math.ceil((b.h - C.texteH * sc) / 2) + sc, O.OS, false, sc);
  }
  function peindreBoutonReglages() {
    var b = boutonReglages(); boutonUI(b, 'RÉGLAGES', false, R.accueilU1.echelle);
    if (N.S.ecran) N.S.ecran.reglagesBouton = b;
  }
  function modeleReglages() {
    O.geom();
    var C = R.accueilU1, sf = O.geo.safe, g = N.score.profil.reglages();
    var sc = g.texte === R.reglagesValeurs.texte[1] ? C.grandTexte : C.echelle;
    var x = Math.ceil(sf.l) + C.marge, y = Math.ceil(sf.t) + C.marge;
    var w = O.geo.W - Math.ceil(sf.r) - C.marge - x, bas = O.geo.H - Math.ceil(sf.b) - C.marge;
    var cols = O.geo.portrait ? 1 : C.colonnes, cw = Math.floor((w - C.ecart * (cols - 1)) / cols);
    // Le grand texte passe sur davantage de pages, jamais dans une cible réduite.
    var rh = Math.max(Math.ceil(C.ciblePt / px()), C.ligneReglage, C.texteH * sc * 2 + C.padding * 3);
    var rows = Math.max(1, Math.floor((bas - y - C.entete - C.pied - C.ecart) / (rh + C.ecart)));
    var nb = rows * cols, pages = Math.ceil(OPTIONS.length / nb);
    pageReglages = Math.min(pageReglages, pages - 1);
    var boutons = [];
    OPTIONS.slice(pageReglages * nb, (pageReglages + 1) * nb).forEach(function (o, i) {
      var vals = R.reglagesValeurs[o[0]] || [true, false], k = vals.indexOf(g[o[0]]);
      var b = { x: x + Math.floor(i / rows) * (cw + C.ecart), y: y + C.entete + (i % rows) * (rh + C.ecart), w: cw, h: rh,
        id: o[0], label: o[1], valeur: o[2][Math.max(0, k)], echelle: sc };
      while (b.echelle > 1 && Math.max(O.textW(b.label, b.echelle), O.textW(b.valeur, b.echelle)) > cw - C.padding * 2) b.echelle--;
      boutons.push(b);
    });
    var bw = Math.floor((w - C.ecart) / C.colonnes), by = bas - C.pied;
    return { x: x, y: y, w: w, bas: bas, page: pageReglages, pages: pages, boutons: boutons,
      retour: { x: x, y: by, w: pages > 1 ? bw : w, h: C.pied }, suite: { x: x + bw + C.ecart, y: by, w: bw, h: C.pied } };
  }
  function entreeReglages(q) {
    if (T < R.accueilU1.garde) return;
    var m = modeleReglages();
    if (q.key === 'Escape' || q.key === 'KeyR' || dedans(q, m.retour)) { ouvrir(retourReglages); return; }
    if (q.key === 'Tab' || dedans(q, m.suite) && m.pages > 1) { pageReglages = (pageReglages + 1) % m.pages; choix = 0; return; }
    if (q.key === 'ArrowDown' || q.key === 'ArrowRight') { choix = (choix + 1) % m.boutons.length; return; }
    if (q.key === 'ArrowUp' || q.key === 'ArrowLeft') { choix = (choix + m.boutons.length - 1) % m.boutons.length; return; }
    m.boutons.forEach(function (b, i) {
      if (!(dedans(q, b) || i === choix && (q.key === 'Enter' || q.key === 'Space'))) return;
      var vals = R.reglagesValeurs[b.id] || [true, false], g = N.score.profil.reglages(), o = {};
      o[b.id] = vals[(vals.indexOf(g[b.id]) + 1) % vals.length]; N.score.profil.reglages(o);
      retourToucher = { id: b.id, t: R.accueilU1.retourVisible }; choix = i;
      if (N.journal) N.journal('reglage', { id: b.id, valeur: o[b.id] });
    });
  }
  function reglages() {
    var m = modeleReglages(), C = R.accueilU1, g = N.gfx;
    g.rect(0, 0, O.geo.W, O.geo.H, O.NUIT);
    O.textC('RÉGLAGES', m.x + m.w / 2, m.y + C.padding, O.JAUNE, false, C.echelle);
    m.boutons.forEach(function (b, i) {
      var actif = retourToucher && retourToucher.id === b.id;
      g.rect(b.x, b.y, b.w, b.h, actif ? O.INDIGO : O.ARDOISE);
      g.rect(b.x, b.y, b.w, 1, actif || i === choix ? O.JAUNE : O.ACIER);
      O.text(b.label, b.x + C.padding, b.y + C.padding + b.echelle, O.OS, false, b.echelle);
      O.text(b.valeur, b.x + C.padding, b.y + b.h - C.texteH * b.echelle - C.padding, O.JAUNE, false, b.echelle);
    });
    boutonUI(m.retour, 'RETOUR', false, C.echelle);
    if (m.pages > 1) boutonUI(m.suite, (m.page + 1) + '/' + m.pages + ' >', false, C.echelle);
    if (N.S.ecran) N.S.ecran.reglages = m;
  }
  function finActions() {
    var f = R.ecrans.fin, a = f.actions, sf = (N.S && N.S.safe) || O.geo.safe, W = O.geo.W, H = O.geo.H;
    var x0 = (sf.l | 0) + a.marge, x1 = W - (sf.r | 0) - a.marge;
    var h = Math.max(R.ecrans.retour.texteH + R.ecrans.retour.padding * 2, Math.ceil(Math.max(f.boutonPt, R.ecrans.retour.boutonPt) / px()));
    var port = O.geo.portrait, w = port ? x1 - x0 : Math.floor(Math.min(Math.max(a.largeurMax, O.textW('CONTINUER ? ' + f.continuer.de, R.ecrans.retour.echelle) + R.ecrans.retour.padding * 2), (x1 - x0 - a.ecart) / 2));
    var x = Math.round((x0 + x1 - w * 2 - a.ecart) / 2), y = H - (sf.b | 0) - a.marge - h;
    var age = Math.floor(Math.max(0, T - f.garde)), c = f.continuer;
    var propose = !cur_opts.victoire && !!(N.score && N.score.continuerPossible && N.score.continuerPossible());
    if (port) x = x0;
    return { bilan: cibleBilan(), continuer: { x: x, y: port ? y - h - a.ecart : y, w: w, h: h }, rejouer: { x: port ? x : x + w + a.ecart, y: y, w: w, h: h },
      propose: propose, disponible: propose && age <= c.de - c.a, restant: Math.max(c.a, c.de - age), pret: T >= f.garde };
  }
  function entreeFin(q) {
    if (out) return;
    // La date de début vient de boot ; un doigt déjà posé pendant la garde ne valide rien au relâcher.
    if (q.key === null && typeof q.t0 === 'number' && typeof q.t1 === 'number' && T - (q.t1 - q.t0) / R.ecrans.fin.actions.msParSeconde < R.ecrans.fin.garde) return;
    var a = finActions(), action = null;
    var cb = a.bilan;
    if (a.pret && (q.key === 'Tab' || (q.key === null && q.x >= cb.x && q.x < cb.x + cb.w && q.y >= cb.y && q.y < cb.y + cb.h))) { cur_opts.bilan = !cur_opts.bilan; cur_opts.pageBilan = 0; return; }
    if (cur_opts.bilan && a.pret && (q.key === 'ArrowRight' || q.key === 'ArrowDown' || (q.key === null && q.y >= cb.y + cb.h && q.y < Math.min(a.continuer.y, a.rejouer.y)))) { cur_opts.pageBilan = (cur_opts.pageBilan || 0) + 1; return; }
    if (q.key === 'ArrowLeft' || q.key === 'ArrowUp') choix = a.disponible ? 0 : 1;
    else if (q.key === 'ArrowRight' || q.key === 'ArrowDown') choix = 1;
    else if (q.key === 'Digit1') action = 'continuer';
    else if (q.key === 'Digit2') action = 'rejouer';
    else if (q.key === 'Enter' || q.key === 'Space') action = choix === 0 ? 'continuer' : 'rejouer';
    else if (q.key === null) {
      ['continuer', 'rejouer'].forEach(function (nom) {
        var r = a[nom]; if (q.x >= r.x && q.x < r.x + r.w && q.y >= r.y && q.y < r.y + r.h) action = nom;
      });
    }
    if (a.pret && action && (action !== 'continuer' || a.disponible)) out = { ecran: cur, action: action };
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
  function pause() { veil(); peindreRetour('pause'); peindreBoutonReglages(); }

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
    O.textC('SNAKE 2975', W / 2, Math.round(H / 2 - 24), O.OS, false, tailleTitre());
    if ((T * hz) % 1 < 0.7) O.textC(O.hasTouch() ? 'TOUCHE POUR COMMENCER' : 'ESPACE POUR COMMENCER', W / 2, Math.round(H / 2 + 10), O.ACIER, false, 1);
  }
  /* l'affiche des deux pilotes dos à dos (art/affiche-duo.png, son film en boucle s'il est dans cine/) ;
     sans elle, l'affiche d'origine */
  var duoVive = false;
  function duo(on) {
    if (!N.art || !N.art.play) return;
    if (on && !duoVive) { duoVive = true; O.safe('art.play', function () { N.art.play('affiche-duo'); }); }
    else if (!on && duoVive) { duoVive = false; O.safe('art.stop', function () { N.art.stop('affiche-duo'); }); }
  }
  function titre() {
    var W = O.geo.W, H = O.geo.H, a = N.art && N.art.get ? O.safe('art.get', function () { return N.art.get('affiche-duo'); }) : null;
    if (a && a.data) duo(true);
    else a = N.art && N.art.get ? O.safe('art.get', function () { return N.art.get('affiche'); }) : null;
    if (a && a.data) fond(a, 0.7);
    O.textC('SNAKE 2975', W / 2, Math.round(H * R.accueilU1.titreY), O.OS, true, tailleTitre());
    var rec = N.score ? N.score.record() : 0, y = Math.round(H * 0.28 + 38);
    if (rec > 0) {
      var cr = N.score.classement ? N.score.classement()[0] : null;
      O.textC('RECORD ' + O.pad(rec, 7) + (cr && cr.marque ? ' ' + cr.marque : ''), W / 2, y, O.JAUNE, true, 1);
      var e = N.score.energie | 0, p = N.score.prochain ? N.score.prochain() : null;
      if (e > 0) O.textC('ÉNERGIE ' + e + (p ? '  ·  ' + (DEBNOMS[p.id] || p.id) + ' DANS ' + p.reste : ''), W / 2, y + 11, O.ACIER, true, 1);
    }
    if ((T * 1.25) % 1 < 0.8) O.textC(O.hasTouch() ? 'TOUCHE POUR JOUER' : 'ESPACE POUR JOUER', W / 2, Math.round(H * 0.72), O.OS, true, 1);
    peindreBoutonReglages();
  }
  /* La partie demeure pilotée ; les volets de la borne ne touchent ni le score ni le profil. */
  function attraction() {
    var A = R.ecrans.attraction, C = R.ecrans.retour, sf = O.geo.safe;
    var W = O.geo.W, H = O.geo.H, t = T % A.boucle;
    var x = Math.ceil(sf.l) + C.marge, y = Math.ceil(sf.t) + C.marge;
    var w = W - Math.ceil(sf.r) - C.marge - x, lignes = [];
    function ajout(texte, encre) {
      coupe(texte, w / C.echelle).forEach(function (txt) {
        lignes.push({ texte: txt, x: x, y: y, w: O.textW(txt, C.echelle), h: C.texteH, echelle: C.echelle, encre: encre });
        y += C.ligne;
      });
    }
    var volet = t < A.demo ? 'demo' : t < A.demo + A.galerie ? 'galerie' : t < A.demo + A.galerie + A.records ? 'records' : 'invitation';
    if (volet !== 'demo') N.gfx.rect(x - C.padding, y - C.padding, w + C.padding * 2, H - Math.ceil(sf.b) - y, O.NUIT);
    ajout(volet === 'galerie' ? 'GALERIE' : volet === 'records' ? 'RECORDS' : 'DÉMO', O.JAUNE);
    if (volet === 'galerie') R.ecrans.attraction.presentation.ennemis.forEach(function (type) {
      var sprite = O.sp(type, 0);
      if (sprite) N.gfx.blit(sprite, x, y);
      var reserve = R.ecrans.attraction.presentation.spriteW;
      lignes.push({ texte: String(type).toUpperCase(), x: x + reserve, y: y, w: O.textW(String(type).toUpperCase(), C.echelle), h: C.texteH, echelle: C.echelle, encre: O.OS });
      y += C.ligne + C.padding;
    });
    if (volet === 'records') {
      var records = N.score && N.score.classement ? N.score.classement() : [];
      if (!records.length) ajout('À TOI DE JOUER', O.OS);
      records.slice(0, R.ecrans.attraction.presentation.recordsMax).forEach(function (r) { ajout(String(r.score) + (r.marque ? ' ' + r.marque : ''), O.OS); });
    }
    var inviteY = H - Math.ceil(sf.b) - C.marge - C.texteH;
    // Une invite stable : aucun clignotement ajouté à la partie.
    var invite = O.hasTouch() ? "TOUCHE L'ÉCRAN" : 'UNE TOUCHE';
    lignes.push({ texte: invite, x: x, y: inviteY, w: O.textW(invite, C.echelle), h: C.texteH, echelle: C.echelle, encre: O.OS });
    lignes.forEach(function (l) { N.gfx.rect(l.x - C.padding, l.y - C.padding, l.w + C.padding * 2, l.h + C.padding * 2, O.NUIT); O.text(l.texte, l.x, l.y, l.encre, false, l.echelle); });
    if (N.S && N.S.ecran) N.S.ecran.retour = { nom: 'attraction', volet: volet, t: T, lignes: lignes };
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
  /* Bilan resserré : tous les objectifs et le prochain seuil restent à l'écran.
     Géométrie publiée pour contrôler les textes réellement peints dans le tampon. */
  function cibleBilan() {
    var C = R.ecrans.retour, sf = (N.S && N.S.safe) || O.geo.safe;
    var largeur = O.geo.W - Math.ceil(sf.l) - Math.ceil(sf.r) - C.marge * 2;
    return { x: Math.ceil(sf.l) + C.marge, y: Math.ceil(sf.t) + C.marge,
      w: O.geo.portrait ? largeur : Math.floor((largeur - C.ecart) / C.colonnes),
      h: Math.max(C.texteH + C.padding * 2, Math.ceil(C.boutonPt / px())) };
  }
  /* Le résumé principal garde les informations de la mort à l'écran. Les détails
     paginés restent accessibles par le titre ; ils ne remplacent pas le résumé.
     Même police entière que p17, avec un pas calculé entre texteH et ligne. */
  function finResumeModele() {
    O.geom();
    var C = R.ecrans.retour, U = R.accueilU1, sf = (N.S && N.S.safe) || O.geo.safe, actions = finActions();
    var x = Math.ceil(sf.l) + C.marge, y = Math.ceil(sf.t) + C.marge;
    var w = O.geo.W - Math.ceil(sf.r) - C.marge - x;
    var bas = Math.min(actions.continuer.y, actions.rejouer.y) - C.padding;
    var score = N.score, r = score && score.resume ? score.resume() : null;
    var v = r ? r.victoire : !!cur_opts.victoire, lignes = [], yy = y;
    function ajouter(t, ink) {
      coupe(t, w / C.echelle).forEach(function (txt) {
        var h = C.texteH, top = 0;
        if (N.spr && N.spr.text) {
          var s = N.spr.text(txt, { ci: ink, echelle: C.echelle, contour: false, ombre: false });
          h = s.h; top = s.top;
        }
        // Le y publié est la ligne de base attendue par O.text. Chaque sprite a sa propre boîte.
        lignes.push({ texte: txt, x: x, y: yy + top, w: O.textW(txt, C.echelle), h: h, echelle: C.echelle, encre: ink });
        yy += Math.max(C.ligne, h + U.ecart);
      });
    }
    ajouter(v ? 'GAGNÉ · BILAN' : 'PERDU · BILAN', v ? O.JAUNE : O.ROSE);
    ajouter('SCORE ' + (r ? r.score : score ? score.score : 0) + (r && r.marque ? ' C' : ''), O.JAUNE);
    if (r) {
      ajouter('V' + r.vague + ' · ' + mmss(r.temps) + (r.cause ? ' · ' + N.ids.texte(r.cause, r.auteur).replace(/ INSTABLE$/, '') : ''), O.OS);
      if (r.conseil) ajouter(r.conseil, O.OS);
    }
    return { nom: 'fin', x: x, y: y, w: w, bas: bas, port: O.geo.portrait, lignes: lignes, barres: [], actions: actions,
      debloques: r ? r.debloques.slice() : [] };
  }
  function retourModele(nom) {
    if (nom === 'fin' && !cur_opts.bilan) return finResumeModele();
    O.geom();
    var C = R.ecrans.retour, sf = (N.S && N.S.safe) || O.geo.safe, W = O.geo.W, H = O.geo.H;
    var x = Math.ceil(sf.l) + C.marge, y = Math.ceil(sf.t) + C.marge;
    var w = W - Math.ceil(sf.r) - C.marge - x;
    var port = O.geo.portrait, col = port ? w : Math.floor((w - C.ecart) / C.colonnes);
    var actions = nom === 'fin' ? finActions() : null;
    var bas = actions ? Math.min(actions.continuer.y, actions.rejouer.y) - C.padding : H - Math.ceil(sf.b) - C.marge;
    var lignes = [], barres = [];
    function ligne(t, xx, yy, ink, largeur) {
      var ls = coupe(t, (largeur || col) / C.echelle);
      ls.forEach(function (txt) {
        lignes.push({ texte: txt, x: xx, y: yy, w: O.textW(txt, C.echelle), h: C.texteH, echelle: C.echelle, encre: ink });
        yy += C.ligne;
      });
      return yy;
    }
    var score = N.score, r = score && score.resume ? score.resume() : null;
    var v = r ? r.victoire : !!cur_opts.victoire, yy = y;
    var blocs = [], debut = lignes.length;
    if (nom === 'fin') {
      yy = ligne(v ? 'GAGNÉ · BILAN' : 'PERDU · BILAN', x, yy, v ? O.JAUNE : O.ROSE);
      yy = ligne('SCORE' + (r && r.marque ? ' C' : '') + ' ' + (r ? r.score : score ? score.score : 0), x, yy, O.JAUNE);
      // La cause reste lisible ; le temps et le libellé complet sont aussi dans BILAN.
      if (r) yy = ligne(r.cause ? N.ids.texte(r.cause, r.auteur).replace(/ INSTABLE$/, '') : 'V' + r.vague + ' · ' + mmss(r.temps), x, yy, O.OS);
    } else {
      yy = ligne(nom === 'pause' ? 'PAUSE' : 'OBJECTIFS', x, yy, O.JAUNE);
      if (nom === 'pause') yy = ligne('POUR REPRENDRE', x, yy, O.OS);
      yy = ligne(nom === 'pause' ? "TOUCHE L'ÉCRAN" : 'FINIR', x, yy, O.OS);
      if (nom !== 'pause') yy = ligne(R.defis.duJour + ' DÉFIS', x, yy, O.AMBRE);
    }
    blocs.push({ debut: debut, fin: lignes.length, y: y, bas: yy, barre: null });
    yy += C.ecart; debut = lignes.length;
    var py = yy, p = nom === 'fin' && r ? r.prochain : score && score.prochain ? score.prochain() : null;
    yy = ligne('ÉNERGIE ' + (nom === 'fin' && r ? r.energie : score ? score.energie : 0), x, yy, O.AMBRE);
    if (p) {
      // Le prochain palier et son reste forment UNE expression, sans titre orphelin.
      yy = ligne(C.finNoms[p.id] + ' +' + p.reste, x, yy, O.JAUNE);
      barres.push({ x: x, y: yy, w: col, h: C.barreH, part: p.part }); yy += C.barreH + C.padding;
    } else {
      var tout = score && R.deblocages.every(function (d) { return score.deblocages.indexOf(d.id) >= 0; });
      yy = ligne(tout ? 'TOUT DÉBLOQUÉ' : 'AUCUN PALIER', x, yy, tout ? O.JAUNE : O.ACIER);
    }
    blocs.push({ debut: debut, fin: lignes.length, y: py, bas: yy, barre: barres[0] || null });
    if (nom === 'fin' && cur_opts.bilan && r) {
      lignes = []; barres = []; yy = y;
      function detail(t, ink) { yy = ligne(t, x, yy, ink || O.OS, w); }
      detail('< OBJECTIFS', O.JAUNE);
      var recs = score.classement ? score.classement() : [], marque = recs.length && recs[0].marque ? ' ' + recs[0].marque : '';
      detail('RECORD ' + r.record + marque + (r.nouveauRecord ? ' NOUVEAU' : ''), O.JAUNE);
      if (r.ecart !== null) detail('ÉCART ' + (r.ecart >= 0 ? '+' : '') + r.ecart);
      detail('V' + r.vague + ' · ' + mmss(r.temps));
      if (r.cause) detail(N.ids.texte(r.cause, r.auteur), O.ROSE);
      detail((r.victoire ? 'SECTEUR NETTOYÉ' : 'SECTEUR ' + Math.round(r.progression * 100) + ' %') + ' · NOTE ' + r.note);
      if (r.build) {
        detail(r.build.nom, O.AMBRE);
        detail((r.build.armes || []).map(function (a) { return String(a.id).toUpperCase() + ' ' + romain(a.palier !== undefined ? a.palier : a.niveau); }).join(' · '));
      }
      detail('DÉTRUITS ' + r.kills + ' · CHAÎNE ' + r.maxChaine);
      detail('COUPES ' + r.coupes + ' · LASSO ' + r.maxLasso);
      detail('VAGUES RÉUSSIES ' + r.defisVague, O.AMBRE);
      (r.defis || []).forEach(function (d) { detail((d.fait ? '✓ ' : '· ') + d.nom + ' ' + d.prog + '/' + d.but, O.AMBRE); });
      (r.defisVagues || []).forEach(function (d) { detail('V' + d.n + ' ' + d.nom + ' ' + d.prog + '/' + d.but, O.ACIER); });
      detail('ÉNERGIE +' + r.energieGagnee + ' · TOTAL ' + r.energie, O.AMBRE);
      if (r.prochain) detail('PROCHAIN ' + C.finNoms[r.prochain.id] + ' +' + r.prochain.reste, O.JAUNE);
      if (r.debloques.length) detail('OUVERT : ' + r.debloques.map(function (id) { return C.finNoms[id]; }).join(', '), O.JAUNE);
      if (r.conseil) detail(r.conseil, O.ACIER);
      var corps = lignes.slice(1), capacite = Math.max(1, Math.floor((bas - y) / C.ligne) - C.paginationReserve);
      var pages = Math.ceil(corps.length / capacite), page = (cur_opts.pageBilan || 0) % pages;
      lignes = lignes.slice(0, 1).concat(corps.slice(page * capacite, (page + 1) * capacite));
      lignes.forEach(function (l, i) { l.y = y + i * C.ligne; });
      yy = y + lignes.length * C.ligne;
      ligne('BILAN ' + (page + 1) + '/' + pages + ' >', x, yy, O.JAUNE, w);
      return { nom: nom, bilan: true, page: page, pages: pages, x: x, y: y, w: w, bas: bas, port: port, lignes: lignes, barres: barres, actions: actions, debloques: r.debloques.slice() };
    }
    var dx = port ? x : x + col + C.ecart, dy = port ? yy + C.ecart : y;
    debut = lignes.length;
    var defis = r && nom === 'fin' ? r.defis : score && score.defis;
    dy = ligne('DÉFIS DU JOUR', dx, dy, O.AMBRE);
    // Même bord droit et même réserve de largeur pour TOUS les compteurs.
    var dv = score && score.defiVague;
    if (!dv && nom === 'briefing' && score && score.apercuVague) dv = score.apercuVague();
    var compteW = 0;
    (defis || []).concat(dv ? [dv] : []).forEach(function (d) { compteW = Math.max(compteW, O.textW(d.prog + '/' + d.but, C.echelle)); });
    function defi(d, nomDefi, court) {
      var ink = d.fait ? O.JAUNE : O.OS, compte = d.prog + '/' + d.but;
      var nx = dx + C.finition.marqueW, cx = dx + col - O.textW(compte, C.echelle);
      var place = col - C.finition.marqueW - compteW - C.padding;
      var lib = O.textW(nomDefi, C.echelle) <= place ? nomDefi : court;
      ligne(d.fait ? '✓' : '·', dx, dy, ink);
      ligne(lib, nx, dy, ink, place);
      ligne(compte, cx, dy, d.fait ? O.AMBRE : O.ACIER, compteW);
      dy += C.ligne;
    }
    (defis || []).forEach(function (d) { defi(d, d.nom, C.finition.defisCourts[d.id] || d.nom); });
    if (dv) {
      dy = ligne('VAGUE ' + dv.n, dx, dy + C.padding, O.AMBRE);
      var d = dv.def, lib = d.lassos ? 'LASSO' : d.enfermes ? 'ENFERMÉS' : d.cellules ? 'CELLULES' : d.mines ? 'MINES' : d.tourelles ? 'TOURELLES' : d.mult ? 'MULTI' : d.devores ? 'DÉVORÉS' : 'BROYÉS';
      defi(dv, lib, lib);
    }
    if (nom === 'briefing') {
      var departY = Math.max(yy, dy) + C.ecart;
      dy = ligne('DÉPART AUTO', port ? x : dx, departY, O.JAUNE);
    }
    if (port) {
      blocs.push({ debut: debut, fin: lignes.length, y: yy + C.ecart, bas: dy, barre: null });
      var hauteur = blocs.reduce(function (h, b) { return h + b.bas - b.y; }, 0);
      var gap = Math.max(C.ecart, Math.floor((bas - y - hauteur) / (blocs.length - 1)));
      // Le briefing groupe ses blocs : le blanc restant encadre l'ensemble.
      if (nom === 'briefing') gap = C.ecart;
      var by = nom === 'briefing' ? y + Math.max(0, Math.floor((bas - y - hauteur - gap * (blocs.length - 1)) / C.colonnes)) : y;
      blocs.forEach(function (b) {
        var delta = by - b.y;
        for (var i = b.debut; i < b.fin; i++) lignes[i].y += delta;
        if (b.barre) b.barre.y += delta;
        by += b.bas - b.y + gap;
      });
    }
    return { nom: nom, x: x, y: y, w: w, bas: bas, port: port, lignes: lignes, barres: barres, actions: actions,
      debloques: r && nom === 'fin' ? r.debloques.slice() : [] };
  }

  function peindreRetour(nom) {
    var m = retourModele(nom), C = R.ecrans.retour, g = N.gfx;
    g.rect(m.x - C.padding, m.y - C.padding, m.w + C.padding * 2, m.bas - m.y + C.padding, O.NUIT);
    m.lignes.forEach(function (l) {
      if (!l.phrase || !N.spr || !N.spr.text) { O.text(l.texte, l.x, l.y, l.encre, false, l.echelle); return; }
      // Une seule phrase source compose les lignes du conseil. Le même sprite
      // fournit les glyphes de chaque ligne, sans rogner les accents.
      var s = N.spr.text(l.phrase, { ci: l.encre, echelle: l.echelle, contour: false, ombre: false });
      var debut = O.textW(l.prefixe + l.texte, l.echelle) - l.w, bout = O.mk(l.w, s.h);
      for (var yy = 0; yy < s.h; yy++) for (var xx = 0; xx < l.w; xx++) bout.data[yy * l.w + xx] = s.data[yy * s.w + debut + xx];
      g.blit(bout, l.x, l.y - s.top);
    });
    m.barres.forEach(function (b) { g.rect(b.x, b.y, b.w, b.h, O.ARDOISE); g.rect(b.x, b.y, Math.round(b.w * b.part), b.h, O.AMBRE); });
    if (N.S && N.S.ecran) N.S.ecran.retour = m;
    return m;
  }
  function fin() {
    var m = peindreRetour('fin'), actions = m.actions, C = R.ecrans.retour;
    if (m.debloques.length && !bruit) { bruit = true; O.sfx('record'); }
    ['continuer', 'rejouer'].forEach(function (nom, i) {
      var rc = actions[nom], ok = actions.pret && (nom !== 'continuer' || actions.disponible);
      var label = nom === 'rejouer' ? 'REJOUER' : actions.propose ? 'CONTINUER ? ' + actions.restant : 'CONTINUER ?';
      N.gfx.rect(rc.x, rc.y, rc.w, rc.h, O.ARDOISE);
      N.gfx.rect(rc.x, rc.y, rc.w, 1, ok ? O.JAUNE : O.ACIER);
      O.textC(label, rc.x + rc.w / 2, rc.y + Math.floor((rc.h - C.texteH) / 2), ok ? O.OS : O.ACIER, false, C.echelle);
    });
  }
  function briefing() { peindreRetour('briefing'); }

  function draw() {
    if (!cur) return;
    if (cur === 'reglages') reglages();
    else if (cur === 'pause') pause();
    else if (cur === 'cartes') cartes();
    else if (cur === 'demarrage') demarrage();
    else if (cur === 'titre') titre();
    else if (cur === 'attraction') attraction();
    else if (cur === 'fin') fin();
    else if (cur === 'briefing') briefing();
  }

  return { ouvrir: ouvrir, fermer: fermer, actif: actif, update: update, draw: draw, sortie: sortie, ecran: ecran, cartes: CARTES, veil: veil, icone: icone,
    rect: function (i) { return rectCarte(i, main.length); }, main: function () { return main.slice(); }, bouton: function () { return { h: cible() }; }, finActions: finActions, retourModele: retourModele,
    modeleReglages: modeleReglages, boutonReglages: boutonReglages, tailleTitre: tailleTitre };
})();
