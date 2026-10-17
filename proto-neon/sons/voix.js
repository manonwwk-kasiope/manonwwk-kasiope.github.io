/* sons/voix.js — LA VOIX DE LA MACHINE de SNAKE 2975.
   Une voix de borne d'arcade des années 80 (Berzerk, Sinistar, Gauntlet), synthétisée par formants en
   Web Audio : aucun fichier audio, aucune dépendance, aucune URL.

   Le principe (REFONTE.md § 5.8, CONTRAT.md : son.voix.source [90,110], son.voix.formants 3) :
   - SOURCE : une dent de scie entre 90 et 110 Hz (hauteur de la voix), doublée d'une dent de scie à
     l'octave inférieure (le poids) et d'une troisième, désaccordée de 9 cents (l'épaisseur métallique) ;
   - CONDUIT : trois résonateurs en cascade (F1, F2, F3, les formants de chaque phonème, automatisés),
     suivis d'un quatrième formant fixe et d'une présence (étagère aiguë) pour le haut-parleur du téléphone ;
   - CONSONNES : un bruit blanc qui excite le conduit (aspiration : h, p, t, k) ou passe par un passe-bande
     propre (friction : s, ch, f, v ; explosions des occlusives) ;
   - MÉTAL : un peigne à réinjection de quelques millisecondes (la caisse de la borne), une saturation douce
     (la puce qui sature, et du niveau sur un petit haut-parleur), un écho à la croche du morceau
     (144,6 BPM).
   Chaque mot est une RECETTE : une suite de phonèmes écrits à la main (durée en ms, accent, hauteur).
   La fonction pure `pistes()` en tire les courbes de paramètres ; `construire()` les pose sur un graphe
   Web Audio (25 nœuds environ, pour la durée du mot) ; `rendre()` précalcule le mot dans un
   OfflineAudioContext et le normalise à sa crête visée (chemin conseillé : un seul nœud à la lecture).

   Utilisation, dans n'importe quel contexte audio :
     const buf = await VOIX_2975.rendre('WARNING');            // AudioBuffer mono, crête à −3 dBFS
     const s = ctx.createBufferSource(); s.buffer = buf; s.connect(bus); s.start(temps - VOIX_2975.appui('WARNING'));
   ou en direct :
     VOIX_2975.construire(ctx, bus, 'READY', temps - VOIX_2975.appui('READY'));
   `appui(mot)` est le décalage, en secondes, entre le début du mot et l'attaque de sa voyelle accentuée :
   on pose l'attaque sur le temps fort, pas le début du souffle.

   Script ordinaire (pas de module) : il déclare `var VOIX_2975` et l'exporte aussi pour Node. Il tient
   dans la fermeture du bundle de build.mjs comme dans une balise <script>. */
var VOIX_2975 = (function () {
  'use strict';

  /* ---------------------------------------------------------------------------------------------
     LES PHONÈMES. Formants d'un homme adulte en anglais américain (Hillenbrand 1995, Klatt 1980),
     avant mise à l'échelle par `taille`. t : V voyelle, D diphtongue (f → f2), G glissante ou liquide,
     N nasale, S occlusive, F fricative, A affriquée, H aspirée, X battement (le « d » de READY), _ silence.
     f : [F1, F2, F3] Hz ; b : largeurs de bande [B1, B2, B3] Hz ; av : niveau de voisement en dB ;
     af : niveau de friction en dB ; ff, qf : centre et Q du passe-bande de friction ;
     locus : formants pendant l'occlusion ; burst : [centre, Q, dB] de l'explosion ; asp : aspiration (s).
     'vel' : le lieu vélaire suit le F2 de la voyelle voisine (k, g), et F3 s'en rapproche ('vel3', le
     « pincement » vélaire) ; l'explosion vélaire est compacte, entre les deux, et dure ~22 ms (bd). */
  var PH = {
    iy: { t: 'V', f: [300, 2300, 3000], b: [55, 110, 180] },
    ih: { t: 'V', f: [430, 2000, 2650], b: [60, 100, 170] },
    ey: { t: 'D', f: [480, 1950, 2600], f2: [340, 2250, 2850], b: [60, 100, 170] },
    eh: { t: 'V', f: [580, 1800, 2600], b: [65, 100, 170] },
    ae: { t: 'V', f: [660, 1750, 2550], b: [70, 110, 170] },
    aa: { t: 'V', f: [760, 1250, 2550], b: [80, 90, 160] },
    ao: { t: 'V', f: [650, 1000, 2550], b: [75, 90, 150] },
    ow: { t: 'D', f: [530, 1130, 2400], f2: [420, 850, 2420], b: [70, 80, 150] },
    uh: { t: 'V', f: [470, 1120, 2430], b: [65, 90, 150] },
    uw: { t: 'V', f: [360, 1100, 2300], b: [55, 90, 150] },
    ah: { t: 'V', f: [620, 1200, 2550], b: [75, 90, 150] },
    ax: { t: 'V', f: [500, 1400, 2450], b: [70, 100, 170], av: -2 },
    er: { t: 'V', f: [470, 1330, 1650], b: [70, 90, 120] },
    w: { t: 'G', f: [300, 650, 2200], b: [60, 90, 150], av: -5 },
    y: { t: 'G', f: [270, 2150, 3000], b: [50, 150, 250], av: -4 },
    r: { t: 'G', f: [340, 1100, 1450], b: [70, 100, 120], av: -3 },
    l: { t: 'G', f: [340, 1050, 2700], b: [60, 110, 250], av: -5 },
    el: { t: 'G', f: [430, 850, 2600], b: [70, 100, 200], av: -4 },
    m: { t: 'N', f: [270, 1050, 2200], b: [90, 450, 500], av: -7, zn: 1100 },
    n: { t: 'N', f: [270, 1700, 2600], b: [90, 450, 500], av: -7, zn: 1600 },
    ng: { t: 'N', f: [270, 2050, 2700], b: [90, 450, 500], av: -8, zn: 2600 },
    dx: { t: 'X', f: [300, 1700, 2600], b: [80, 120, 200], av: -9 },
    b: { t: 'S', voise: 1, locus: [230, 900, 2150], burst: [900, 0.7, -14], asp: 0.012 },
    d: { t: 'S', voise: 1, locus: [230, 1700, 2600], burst: [3600, 1.3, -9], asp: 0.014 },
    g: { t: 'S', voise: 1, locus: [250, 'vel', 'vel3'], burst: ['vel', 2.4, -8], asp: 0.018, bd: 0.022 },
    p: { t: 'S', locus: [230, 900, 2150], burst: [1200, 0.7, -9], asp: 0.055 },
    t: { t: 'S', locus: [230, 1700, 2600], burst: [4300, 1.2, -4], asp: 0.05 },
    k: { t: 'S', locus: [260, 'vel', 'vel3'], burst: ['vel', 2.4, -3], asp: 0.06, bd: 0.024 },
    s: { t: 'F', ff: 5400, qf: 2.4, af: -9 },
    sh: { t: 'F', ff: 2900, qf: 2.6, af: -9 },
    f: { t: 'F', ff: 5200, qf: 0.9, af: -21 },
    v: { t: 'F', voise: 1, f: [260, 1100, 2300], b: [80, 150, 200], av: -9, ff: 4200, qf: 1, af: -22 },
    zh: { t: 'F', voise: 1, f: [280, 1800, 2500], b: [80, 150, 200], av: -10, ff: 2800, qf: 2.6, af: -15 },
    ch: { t: 'A', ff: 3000, qf: 2.6, af: -4, locus: [260, 1850, 2600], burst: [3400, 1.6, -2] },
    jh: { t: 'A', voise: 1, f: [280, 1850, 2500], b: [80, 150, 200], av: -10, ff: 2900, qf: 2.6, af: -13,
      locus: [250, 1850, 2600], burst: [3200, 1.6, -12] },
    h: { t: 'H', af: -12 },
    _: { t: '_' }
  };

  /* ---------------------------------------------------------------------------------------------
     LE VOCABULAIRE. Chaque segment : [phonème, durée en ms, options]. Options : '!' accent (+2 dB, la
     voyelle d'appui), p: hauteur en Hz au milieu du segment, p0 / p1 : au début / à la fin.
     Le débit est celui d'une annonce : lent, détaché, la voyelle accentuée tenue.
     `role` : à quoi sert le mot (REFONTE.md § 5.3). `contrat` : le mot fait partie de N.R.voix.
     `niveau` : crête visée en dBFS, après normalisation. */
  var MOTS = {
    READY: {
      contrat: 1, role: 'nouvelle vie, après READY! écrit (§ 5.3)', niveau: -3,
      ph: [['r', 105, { p0: 98 }], ['eh', 175, { a: 1, p: 109 }], ['dx', 32], ['iy', 250, { p0: 101, p1: 90 }]]
    },
    GO: {
      contrat: 1, role: 'départ, après READY', niveau: -2,
      ph: [['g', 70], ['ow', 400, { a: 1, p0: 110, p1: 91 }]]
    },
    WARNING: {
      contrat: 1, role: 'entrée du CYCLOPE (§ 4.8)', niveau: -2,
      ph: [['w', 95, { p0: 102 }], ['ao', 175, { a: 1, p: 110 }], ['r', 85, { p: 104 }], ['n', 75, { p: 98 }],
        ['ih', 125, { p: 99 }], ['ng', 190, { p0: 96, p1: 90 }]]
    },
    DANGER: {
      contrat: 1, role: 'TRAQUEUR, menace hors champ', niveau: -3,
      ph: [['d', 65], ['ey', 230, { a: 1, p0: 108, p1: 110 }], ['n', 70, { p: 103 }], ['jh', 115, { p: 98 }],
        ['er', 270, { p0: 97, p1: 90 }]]
    },
    EXCELLENT: {
      contrat: 1, role: 'palier × 8, LASSO de 4 et plus', niveau: -3,
      ph: [['eh', 165, { a: 1, p0: 107, p1: 110 }], ['k', 75], ['s', 125], ['ax', 70, { p: 102 }], ['l', 80, { p: 100 }],
        ['ax', 70, { p: 97 }], ['n', 85, { p: 94 }], ['t', 70]]
    },
    GAMEOVER: {
      contrat: 1, role: 'game over, extinction du tube', niveau: -2, texte: 'GAME OVER',
      ph: [['g', 75], ['ey', 240, { a: 1, p0: 102, p1: 104 }], ['m', 120, { p: 98 }], ['ow', 270, { a: 1, p0: 103, p1: 100 }],
        ['v', 80, { p: 96 }], ['er', 380, { p0: 95, p1: 90 }]]
    },
    /* les six mots que la quintessence (principe 11) ajoute au vocabulaire ; hors contrat pour l'instant */
    CHAIN: {
      role: 'chaîne lancée, palier × 3', niveau: -3,
      ph: [['ch', 120], ['ey', 240, { a: 1, p0: 108, p1: 104 }], ['n', 170, { p0: 98, p1: 90 }]]
    },
    PERFECT: {
      role: 'tableau bonus tout abattu, vague sans coup', niveau: -3,
      ph: [['p', 85], ['er', 190, { a: 1, p0: 108, p1: 104 }], ['f', 105], ['ih', 105, { p: 96 }], ['k', 70], ['t', 70]]
    },
    NEWRECORD: {
      role: 'record battu', niveau: -3, texte: 'NEW RECORD',
      ph: [['n', 75, { p: 100 }], ['uw', 170, { p0: 103, p1: 100 }], ['r', 85, { p: 102 }], ['eh', 160, { a: 1, p: 110 }],
        ['k', 85], ['er', 210, { p0: 99, p1: 93 }], ['d', 60]]
    },
    BOSS: {
      role: 'panneau du CYCLOPE, mi-combat', niveau: -2,
      ph: [['b', 65], ['ao', 290, { a: 1, p0: 106, p1: 94 }], ['s', 230]]
    },
    LEVEL: {
      role: 'montée de niveau, ouverture des cartes', niveau: -3,
      ph: [['l', 95, { p0: 100 }], ['eh', 170, { a: 1, p: 109 }], ['v', 75, { p: 102 }], ['ax', 55, { p: 98 }],
        ['el', 200, { p0: 96, p1: 90 }]]
    },
    CLEAR: {
      role: 'vague nettoyée', niveau: -3,
      ph: [['k', 85], ['l', 70, { p: 106 }], ['ih', 190, { a: 1, p: 109 }], ['er', 240, { p0: 100, p1: 90 }]]
    }
  };

  /* ---------------------------------------------------------------------------------------------
     LE TIMBRE (réglages par défaut ; chaque appel peut en surcharger une partie). */
  var DEFAUT = {
    hauteur: 1,        // facteur sur f0 (la recette reste dans 90-110 Hz à 1)
    taille: 0.97,      // facteur sur les formants : < 1 = conduit plus long, voix plus grande (0,93 : les voyelles glissent vers leurs voisines)
    vitesse: 1,        // facteur sur les durées : > 1 = plus lent
    largeur: 0.8,      // facteur sur les largeurs de bande : < 1 = résonances plus étroites, plus métalliques
    octave: 0.32,      // gain de la dent de scie à l'octave inférieure (le poids)
    chorus: 0.28,      // gain de la dent de scie désaccordée de `chorusCents`
    chorusCents: 9,
    souffle: 0.035,    // bruit mêlé au voisement (râpe de la puce)
    f4: 3300, b4: 250, // formants fixes F4 et F5 (Hz) et leurs largeurs de bande
    f5: 3850, b5: 300,
    souffleSourd: 1,   // facteur sur le souffle de friction pendant l'aspiration des sourdes (0 = sans)
    prevoise: true,    // murmure voisé dans l'occlusion des b, d, g en attaque
    nasal: 18,         // profondeur (dB) de l'anti-formant des nasales
    presence: 7,       // dB d'étagère aiguë à 1,6 kHz (le haut-parleur du téléphone)
    metal: 0.34,       // réinjection du peigne (0 = sans)
    metalMs: 3.4,      // délai du peigne en ms (≥ 2,9 ms : une boucle Web Audio retarde d'au moins 128 images)
    grain: 1.8,        // pente de la saturation douce (tanh)
    pre: 1,            // attaque de la saturation : 1 = crêtes vers 0,5 à son entrée (saturation douce)
    echo: 0.2,         // niveau de l'écho (0 = sans)
    echoS: 60 / 144.6 / 2, // une croche du morceau
    echoFb: 0.28,
    echoHz: 2400,      // passe-bas de l'écho
    pan: 0,
    niveau: null       // crête visée en dBFS ; null = celle du mot
  };

  /* Gains de calibrage du chemin direct (`construire`), mesurés par tools/voix/mesure.mjs --calibre :
     ils amènent la crête du mot, avec les réglages par défaut, à son `niveau`. `rendre()` n'en a pas
     besoin : il normalise à la mesure. Ne pas retoucher à la main sans remesurer. */
  /*CAL*/
  var CAL = {};
  /*FIN CAL*/

  /* --------------------------------------------------------------------------------------------- */
  function fusion(a, b) { var r = {}, k; for (k in a) r[k] = a[k]; if (b) for (k in b) if (b[k] !== undefined) r[k] = b[k]; return r; }
  function db(x) { return Math.pow(10, x / 20); }
  function cle(mot) { return String(mot).toUpperCase().replace(/[^A-Z]/g, ''); }

  /* une piste : suite de points [t, v] ; `aller` rampe depuis la valeur courante, `poser` saute */
  function Piste(v0) { this.pts = [[0, v0]]; this.v = v0; }
  Piste.prototype.der = function () { return this.pts[this.pts.length - 1][0]; };
  Piste.prototype.aller = function (t, v, dt) {
    t = Math.max(t, this.der()); dt = Math.max(dt || 0, 0.001);
    this.pts.push([t, this.v], [t + dt, v]); this.v = v;
  };
  Piste.prototype.poser = function (t, v) { t = Math.max(t, this.der()); this.pts.push([t, this.v], [t, v]); this.v = v; };
  Piste.prototype.tenir = function (t) { t = Math.max(t, this.der()); this.pts.push([t, this.v]); };
  Piste.prototype.val = function (t) {
    var p = this.pts, i;
    if (t <= p[0][0]) return p[0][1];
    for (i = 1; i < p.length; i++) if (p[i][0] >= t) {
      var a = p[i - 1], b = p[i]; if (b[0] === a[0]) return b[1];
      return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
    }
    return p[p.length - 1][1];
  };

  var SONORE = { V: 1, D: 1, G: 1, N: 1, X: 1 };
  /* un phonème, avec les surcharges d'essai éventuelles (opts.ph = { l: { f: [...] } }) */
  function phon(ph, o) {
    if (!PH[ph]) throw new Error('voix : phonème inconnu ' + ph);
    return o && o.ph && o.ph[ph] ? fusion(PH[ph], o.ph[ph]) : PH[ph];
  }

  /* les cibles formantiques d'un phonème (avec 'vel' résolu et l'échelle `taille`) */
  function formants(ph, voisinF2, o) {
    var P = phon(ph, o), f = (P.f || P.locus).slice();
    for (var i = 0; i < 3; i++) if (f[i] === 'vel') f[i] = Math.min(2300, Math.max(1400, voisinF2 * 1.25));
    if (f[2] === 'vel3') f[2] = f[1] + 700;
    return f.map(function (x) { return x * o.taille; });
  }
  function largeurs(ph, o) {
    var b = phon(ph, o).b || [90, 130, 200];
    return b.map(function (x) { return x * o.largeur; });
  }

  /* ---------------------------------------------------------------------------------------------
     pistes(mot, opts) : la partition du mot. Pure, sans Web Audio : sert au graphe, à la page d'écoute
     (formants prévus dessinés sur le spectrogramme) et aux mesures (où sont les voyelles). */
  function pistes(mot, opts) {
    var k = cle(mot), W = (opts && opts.mots && opts.mots[k]) || MOTS[k];
    if (!W) throw new Error('voix : mot inconnu ' + mot);
    var o = fusion(DEFAUT, fusion(W.reglages || {}, opts || {}));
    var segs = [], t = 0.03, i;                       // 30 ms d'amorce : aucune rampe ne commence à 0
    for (i = 0; i < W.ph.length; i++) {
      var s = W.ph[i], d = s[1] / 1000 * o.vitesse;
      segs.push({ ph: s[0], P: phon(s[0], o), d: d, t: t, op: s[2] || {} });
      t += d;
    }
    var fin = t;
    /* le F2 de la voyelle voisine, pour le lieu vélaire */
    function f2voisin(j) {
      for (var a = j + 1; a < segs.length; a++) if (segs[a].P.t === 'V' || segs[a].P.t === 'D') return segs[a].P.f[1];
      for (a = j - 1; a >= 0; a--) if (segs[a].P.t === 'V' || segs[a].P.t === 'D') return segs[a].P.f[1];
      return 1500;
    }
    function prochainSonore(j) { for (var a = j + 1; a < segs.length; a++) if (SONORE[segs[a].P.t]) return a; return -1; }

    var premier = prochainSonore(-1), f0 = formants(segs[premier].ph, 1500, o), b0 = largeurs(segs[premier].ph, o);
    var T = {
      F1: new Piste(f0[0]), F2: new Piste(f0[1]), F3: new Piste(f0[2]),
      B1: new Piste(b0[0]), B2: new Piste(b0[1]), B3: new Piste(b0[2]),
      AV: new Piste(0), AH: new Piste(0), AF: new Piste(0), FF: new Piste(4000), QF: new Piste(1),
      ZF: new Piste(1500), ZG: new Piste(0)
    };
    function versF(t0, f, b, dt) {
      T.F1.aller(t0, f[0], dt); T.F2.aller(t0, f[1], dt); T.F3.aller(t0, f[2], dt);
      if (b) { T.B1.aller(t0, b[0], dt); T.B2.aller(t0, b[1], dt); T.B3.aller(t0, b[2], dt); }
    }
    var appui = null, voyelles = [];
    for (i = 0; i < segs.length; i++) {
      var g = segs[i], P = g.P, s0 = g.t, d0 = g.d, prec = segs[i - 1], suiv = segs[i + 1];
      var precT = prec ? prec.P.t : '_';
      var acc = g.op.a ? 2 : 0;
      if (g.op.a && appui === null) appui = s0;
      if (SONORE[P.t]) {
        var f = formants(g.ph, f2voisin(i), o), b = largeurs(g.ph, o);
        var tr = P.t === 'N' || precT === 'N' ? 0.018 : (precT === 'S' || precT === 'A' ? 0.045 : (P.t === 'G' ? 0.06 : 0.05));
        tr = Math.min(tr, d0 * 0.5);
        if (P.t === 'X') {                                    // battement : un creux bref du voisement
          versF(s0, f, b, 0.012);
          T.AV.aller(s0, db(P.av), 0.01); T.AH.aller(s0, 0, 0.01); T.AF.aller(s0, 0, 0.01);
          continue;
        }
        versF(s0, f, b, tr);
        if (P.t === 'N') { T.ZF.poser(s0, P.zn * o.taille); T.ZG.aller(s0, -o.nasal, 0.012); }
        else T.ZG.aller(s0, 0, 0.015);
        if (P.t === 'D') {                                    // la diphtongue glisse vers sa seconde cible
          var f2 = P.f2.map(function (x) { return x * o.taille; });
          versF(s0 + d0 * 0.35, f2, null, d0 * 0.5);
        }
        var montee = precT === '_' && !prec ? 0.022 : (precT === 'S' ? 0.008 : 0.016);
        T.AV.aller(s0, db((P.av || 0) + acc), montee);
        T.AH.aller(s0, 0, precT === 'S' ? 0.02 : 0.012);
        T.AF.aller(s0, 0, precT === 'A' || precT === 'F' ? 0.018 : 0.01);
        if (P.t === 'V' || P.t === 'D') voyelles.push({ ph: g.ph, t0: s0, t1: s0 + d0, accent: !!g.op.a });
      } else if (P.t === 'S' || P.t === 'A') {
        var j = prochainSonore(i), finale = j < 0 || segs[j].t > s0 + d0 + 0.001 && !SONORE[segs[i + 1] ? segs[i + 1].P.t : '_'] && j < 0;
        var loc = formants(g.ph, f2voisin(i), o);
        var bu = P.burst.slice(); if (bu[0] === 'vel') bu[0] = (loc[1] + loc[2]) / 2; else bu[0] *= o.taille;
        var bd = P.bd || 0.012;
        var friction = P.t === 'A' ? d0 * 0.55 : 0;
        var asp = P.t === 'A' ? 0 : (suiv && SONORE[suiv.P.t] ? P.asp : (suiv ? 0 : 0.03));
        var ferme = Math.max(0.02, d0 - (P.bd || 0.012) - asp - friction);
        var voixBarre = P.voise && prec && SONORE[precT];
        T.AV.aller(s0, voixBarre ? db(-22) : 0, 0.014);
        T.ZG.aller(s0, 0, 0.012);
        T.AH.aller(s0, 0, 0.01);
        T.AF.aller(s0, 0, 0.012);
        versF(s0, loc, null, Math.min(0.04, ferme));
        if (P.voise && !voixBarre && o.prevoise) T.AV.aller(s0 + ferme * 0.35, db(-24), 0.012);   // prévoisement : marque la voisée
        var tb = s0 + ferme;                                  // l'explosion
        T.FF.poser(tb - 0.002, bu[0]); T.QF.poser(tb - 0.002, bu[1]);
        T.AF.aller(tb, db(bu[2]), 0.0015); T.AF.aller(tb + 0.0015, P.t === 'A' ? db(P.af) * 0.7 : 0, P.t === 'A' ? 0.006 : bd - 0.001);
        if (P.t === 'A') {                                    // la friction de l'affriquée
          T.FF.aller(tb + 0.004, P.ff * o.taille, 0.01); T.QF.aller(tb + 0.004, P.qf, 0.01);
          T.AF.aller(tb + 0.012, db(P.af), 0.015);
          if (P.voise) {
            var fz = formants(g.ph, 1800, o);
            versF(tb, fz, largeurs(g.ph, o), 0.02);
            T.AV.aller(tb + 0.01, db(P.av), 0.02);
          }
          T.AF.tenir(s0 + d0 - 0.02);
        } else if (asp > 0) {                                 // l'aspiration (ou le VOT bref des voisées)
          var ga = P.voise ? db(-20) : db(-3);
          T.AH.aller(tb + bd * 0.5, ga, 0.008);
          /* les transitions de lieu se poursuivent dans la voyelle : ~55 ms après une voisée */
          if (suiv && SONORE[suiv.P.t]) versF(tb + bd * 0.5, formants(suiv.ph, f2voisin(i + 1), o), null, Math.max(asp + 0.02, P.voise ? 0.055 : 0.045));
          T.AH.tenir(s0 + d0);
          if (!suiv) T.AH.aller(s0 + d0, 0, 0.02);
          if (!P.voise && o.souffleSourd) {                  // le souffle large bande des sourdes (k-h, t-h, p-h)
            T.FF.poser(tb + bd, bu[0]); T.QF.poser(tb + bd, 0.8);
            T.AF.aller(tb + bd, db(P.afa !== undefined ? P.afa : -12) * o.souffleSourd, 0.006);
            T.AF.aller(s0 + d0 - 0.012, 0, 0.012);
          }
        }
      } else if (P.t === 'F') {
        T.FF.poser(s0, P.ff * o.taille); T.QF.poser(s0, P.qf);
        T.AF.aller(s0, db(P.af), 0.025);
        T.AH.aller(s0, 0, 0.012);
        if (P.voise) {
          versF(s0, formants(g.ph, 1500, o), largeurs(g.ph, o), 0.03);
          T.AV.aller(s0, db(P.av), 0.02);
        } else {
          T.AV.aller(s0, 0, precT === 'S' ? 0.008 : 0.02);
          var js = prochainSonore(i);
          if (js >= 0) versF(s0, formants(segs[js].ph, f2voisin(js), o), null, d0);
        }
        T.AF.tenir(s0 + d0 - 0.018);
      } else if (P.t === 'H') {
        var jh = prochainSonore(i);
        if (jh >= 0) versF(s0, formants(segs[jh].ph, 1500, o), largeurs(segs[jh].ph, o), 0.02);
        T.AV.aller(s0, 0, 0.015); T.AF.aller(s0, 0, 0.01); T.AH.aller(s0, db(P.af), 0.02);
      } else {
        T.AV.aller(s0, 0, 0.02); T.AH.aller(s0, 0, 0.02); T.AF.aller(s0, 0, 0.02);
      }
    }
    /* la chute : 70 ms, pour ne jamais claquer */
    T.ZG.aller(fin, 0, 0.02); T.AV.aller(fin, 0, 0.07); T.AH.aller(fin, 0, 0.05); T.AF.aller(fin, 0, 0.03);
    for (var n in T) T[n].tenir(fin + 0.08);

    /* la hauteur : points posés par la recette, interpolés ; déclinaison douce par défaut */
    var F0 = [], dernier = 100;
    segs.forEach(function (g) {
      if (g.op.p0 !== undefined) F0.push([g.t, g.op.p0]);
      if (g.op.p !== undefined) F0.push([g.t + g.d / 2, g.op.p]);
      if (g.op.p1 !== undefined) F0.push([g.t + g.d, g.op.p1]);
    });
    F0.sort(function (a, b) { return a[0] - b[0]; });
    if (!F0.length) F0.push([0, 100]);
    dernier = F0[F0.length - 1][1];
    F0.unshift([0, F0[0][1]]); F0.push([fin + 0.08, dernier]);
    var pf = new Piste(F0[0][1] * o.hauteur); pf.pts = F0.map(function (x) { return [x[0], x[1] * o.hauteur]; });
    T.F0 = pf;

    return {
      mot: k, o: o, pistes: T, segments: segs.map(function (g) { return { ph: g.ph, t0: g.t, t1: g.t + g.d }; }),
      voyelles: voyelles, appui: appui === null ? 0.03 : appui, fin: fin + 0.08,
      queue: o.echo > 0 ? Math.min(1.2, o.echoS * Math.log(0.001) / Math.log(Math.max(0.05, o.echoFb))) : 0.02
    };
  }

  /* ---------------------------------------------------------------------------------------------
     LE GRAPHE. */
  var bruits = typeof WeakMap === 'function' ? new WeakMap() : null;
  function bruit(ctx) {
    var b = bruits && bruits.get(ctx);
    if (b) return b;
    var n = Math.floor(ctx.sampleRate * 1.3), buf = ctx.createBuffer(1, n, ctx.sampleRate), x = buf.getChannelData(0);
    var a = 2975;                                           // graine fixe : rendu reproductible
    for (var i = 0; i < n; i++) {
      a |= 0; a = a + 0x6D2B79F5 | 0; var z = Math.imul(a ^ a >>> 15, 1 | a);
      z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z; x[i] = (((z ^ z >>> 14) >>> 0) / 4294967296) * 2 - 1;
    }
    if (bruits) bruits.set(ctx, buf);
    return buf;
  }
  var courbes = {};
  function courbe(k) {
    var c = courbes[k]; if (c) return c;
    c = new Float32Array(2048);
    for (var i = 0; i < c.length; i++) { var x = i / (c.length - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return (courbes[k] = c);
  }
  function poser(param, pts, T0, f) {
    f = f || function (v) { return v; };
    param.cancelScheduledValues(0);
    param.setValueAtTime(f(pts[0][1]), T0 + pts[0][0]);
    for (var i = 1; i < pts.length; i++) {
      var t = T0 + pts[i][0], v = f(pts[i][1]);
      if (pts[i][0] === pts[i - 1][0]) param.setValueAtTime(v, t); else param.linearRampToValueAtTime(v, t);
    }
  }
  function qdb(F, B) { return function (i) { return 0; }; }

  /* construire(ctx, dest, mot, t0, opts) : pose le mot sur le graphe, à l'instant t0 (temps du contexte).
     Renvoie { debut, appui, fin, noeuds, arreter() }. */
  function construire(ctx, dest, mot, t0, opts) {
    var R = pistes(mot, opts), o = R.o, T = R.pistes;
    var T0 = t0 === undefined || t0 === null ? ctx.currentTime + 0.03 : t0;
    var noeuds = 0;
    function G(v) { var g = ctx.createGain(); g.gain.value = v; noeuds++; return g; }
    function F(type, f, q) { var x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q !== undefined) x.Q.value = q; noeuds++; return x; }
    var sources = [];
    function O(mult) {
      var x = ctx.createOscillator(); x.type = 'sawtooth'; noeuds++;
      poser(x.frequency, T.F0.pts, T0, function (v) { return v * mult; });
      sources.push(x); return x;
    }
    /* la source : trois dents de scie */
    var somme = G(1);
    O(1).connect(somme);
    if (o.octave > 0) { var go = G(o.octave); O(0.5).connect(go); go.connect(somme); }
    if (o.chorus > 0) { var gc = G(o.chorus); O(Math.pow(2, o.chorusCents / 1200)).connect(gc); gc.connect(somme); }
    var av = G(0); somme.connect(av); poser(av.gain, T.AV.pts, T0);
    /* le bruit */
    var nz = ctx.createBufferSource(); nz.buffer = bruit(ctx); nz.loop = true; noeuds++; sources.push(nz);
    var ah = G(0); nz.connect(ah); poser(ah.gain, T.AH.pts, T0);
    /* le conduit : trois résonateurs en cascade (passe-bas résonants : gain unité sous F, pic de F/B) */
    var r1 = F('lowpass', 500), r2 = F('lowpass', 1500), r3 = F('lowpass', 2500);
    [[r1, T.F1, T.B1], [r2, T.F2, T.B2], [r3, T.F3, T.B3]].forEach(function (z) {
      poser(z[0].frequency, z[1].pts, T0);
      var pq = [];                                          // Q en dB = 20 log10(F / B), échantillonné sur la piste F
      z[1].pts.forEach(function (p) { pq.push([p[0], 20 * Math.log10(Math.max(1.2, p[1] / Math.max(20, z[2].val(p[0]))))]); });
      poser(z[0].Q, pq, T0);
    });
    /* F4 et F5 fixes (Klatt 1980) : ce sont eux qui portent l'énergie au-dessus de 3 kHz */
    var r4 = F('lowpass', o.f4 * o.taille, 20 * Math.log10(o.f4 / (o.b4 * o.largeur)));
    var r5 = F('lowpass', o.f5 * o.taille, 20 * Math.log10(o.f5 / (o.b5 * o.largeur)));
    var pres = F('highshelf', 1600, undefined); pres.gain.value = o.presence;
    var hp = F('highpass', 70, 0.7);
    /* l'anti-formant des nasales : un creux qui s'ouvre pendant m, n, ng */
    var zn = F('peaking', 1500, 1.4); poser(zn.frequency, T.ZF.pts, T0); poser(zn.gain, T.ZG.pts, T0);
    av.connect(r1); ah.connect(r1);
    if (o.souffle > 0) { var gs = G(o.souffle); nz.connect(gs); gs.connect(av); }
    r1.connect(r2); r2.connect(r3); r3.connect(r4); r4.connect(r5); r5.connect(zn); zn.connect(pres); pres.connect(hp);
    /* la friction, en parallèle */
    var bp = F('bandpass', 4000, 1); poser(bp.frequency, T.FF.pts, T0); poser(bp.Q, T.QF.pts, T0);
    var af = G(0); nz.connect(bp); bp.connect(af); poser(af.gain, T.AF.pts, T0);
    /* le métal : peigne à réinjection, puis saturation douce */
    var cuve = G(o.pre * 0.1); hp.connect(cuve); af.connect(cuve);
    if (o.metal > 0) {
      var cd = ctx.createDelay(0.05); cd.delayTime.value = Math.max(0.0029, o.metalMs / 1000); noeuds++;
      var cf = G(o.metal); cuve.connect(cd); cd.connect(cf); cf.connect(cuve);
    }
    var sat = ctx.createWaveShaper(); sat.curve = courbe(o.grain); sat.oversample = '2x'; noeuds++;
    cuve.connect(sat);
    if (o.sonde === 'cuve') { cuve.connect(dest); }      // banc : le signal avant saturation, brut
    /* la sortie, l'écho à la croche */
    var cal = CAL[R.mot] || 1;
    var niv = o.niveau === null || o.niveau === undefined ? (MOTS[R.mot].niveau || -3) : o.niveau;
    var sortie = G(cal * db(niv + 3) * db(-3));
    sat.connect(sortie);
    if (o.echo > 0) {
      var ed = ctx.createDelay(1.5); ed.delayTime.value = o.echoS; noeuds++;
      var el = F('lowpass', o.echoHz, 0.5), efb = G(o.echoFb), ew = G(o.echo);
      sat.connect(ed); ed.connect(el); el.connect(efb); efb.connect(ed); el.connect(ew); ew.connect(sortie);
    }
    var fin = T0 + R.fin + R.queue;
    var dernier = sortie;
    if (o.pan && ctx.createStereoPanner) { var pn = ctx.createStereoPanner(); pn.pan.value = o.pan; noeuds++; sortie.connect(pn); dernier = pn; }
    if (o.sonde !== 'cuve') dernier.connect(dest);
    sources.forEach(function (s) { s.start(T0); s.stop(T0 + R.fin + 0.01); });
    /* le graphe se défait seul : les sources s'arrêtent, l'écho s'éteint, puis on débranche */
    var fini = false;
    function arreter() {
      if (fini) return; fini = true;
      try { sources.forEach(function (s) { try { s.stop(); } catch (e) { } }); dernier.disconnect(); } catch (e) { }
    }
    if (typeof setTimeout === 'function' && ctx.constructor && ctx.constructor.name !== 'OfflineAudioContext' && ctx.currentTime !== undefined) {
      var ms = (fin - ctx.currentTime + 0.2) * 1000;
      setTimeout(arreter, Math.max(0, ms));
    }
    return { debut: T0, appui: T0 + R.appui, fin: fin, noeuds: noeuds, arreter: arreter, partition: R };
  }

  /* rendre(mot, opts, sr) : le mot précalculé, mono, normalisé à sa crête visée. Promesse d'AudioBuffer. */
  var cache = {};
  function rendre(mot, opts, sr) {
    var k = cle(mot), R = pistes(k, opts), o = R.o;
    sr = sr || 48000;
    var cleCache = k + '|' + sr + '|' + JSON.stringify(opts || {});
    if (cache[cleCache]) return cache[cleCache];
    var OAC = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : (typeof webkitOfflineAudioContext !== 'undefined' ? webkitOfflineAudioContext : null);
    if (!OAC) return Promise.reject(new Error('voix : pas d’OfflineAudioContext'));
    var n = Math.ceil((R.fin + R.queue + 0.05) * sr);
    var oc = new OAC(1, n, sr);
    var sansPan = fusion(opts || {}, { pan: 0 });
    construire(oc, oc.destination, k, 0, sansPan);
    var p = new Promise(function (ok, ko) {
      var r = oc.startRendering(); if (r && r.then) r.then(ok, ko); else oc.oncomplete = function (e) { ok(e.renderedBuffer); };
    }).then(function (buf) {
      var x = buf.getChannelData(0), m = 0, i;
      for (i = 0; i < x.length; i++) { var a = Math.abs(x[i]); if (a > m) m = a; }
      var niv = o.niveau === null || o.niveau === undefined ? (MOTS[k].niveau || -3) : o.niveau;
      var g = m > 0 ? db(niv) / m : 1;
      for (i = 0; i < x.length; i++) x[i] *= g;
      buf.voix = { mot: k, appui: R.appui, fin: R.fin, gain: g };
      return buf;
    });
    cache[cleCache] = p;
    return p;
  }

  function appui(mot, opts) { return pistes(mot, opts).appui; }
  function duree(mot, opts) { var R = pistes(mot, opts); return R.fin + R.queue; }

  return {
    version: '1.0',
    PH: PH, MOTS: MOTS, DEFAUT: DEFAUT, CAL: CAL,
    contrat: Object.keys(MOTS).filter(function (k) { return MOTS[k].contrat; }),
    mots: Object.keys(MOTS),
    pistes: pistes, construire: construire, rendre: rendre, appui: appui, duree: duree,
    texte: function (mot) { var k = cle(mot); return (MOTS[k] && MOTS[k].texte) || k; }
  };
})();
if (typeof module === 'object' && module && module.exports) module.exports = VOIX_2975;
