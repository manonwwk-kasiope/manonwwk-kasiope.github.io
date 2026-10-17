/* 30-music.js — la musique de SNAKE 2975.  Propriétaire unique de N.music.   (REFONTE.md § 5.7, 5.8, 7.6, 7.8)

   DEUX MOTEURS, UN SEUL BUS.
     1. LA PISTE : « Neon Velocity » (143,76 BPM mesurés ; le plan annonçait 144,6), découpée par
        tools/musique/decoupe.mjs en 21 blocs MP3 de musique/ (piste.json les décrit). Chaque bloc est décodé à
        la demande, joué par un AudioBufferSourceNode à l'échantillon près, et enchaîné SUR LA MESURE par le
        séquenceur selon la section demandée (N.music.section). La piste n'est jamais accélérée : la tension
        pilote un filtre passe-bas et un gain.
     2. LE MOTEUR GÉNÉRATIF (l'ancien, réaccordé en ré, à 143,76 BPM) : au-dessus de la piste il joue des COUCHES
        (PERCU, ÉTINCELLES, INVERSION, BATTEMENT) et des ACCENTS (stinger, drop, plongée, coupure) recalés sur la
        barre de chaque bloc ; sans piste (chargement en cours, échec, fichier absent) il joue SEUL un arrangement
        complet à quatre couches, avec son refrain, dans la même tonalité et au même tempo. On ne coupe le repli
        qu'à la preuve que la piste sonne.

   3. LES MORCEAUX LONGS (lot H) : six morceaux Suno de plusieurs minutes (musique/morceaux/, morceaux.json), joués
        en flux par des éléments audio (blob) branchés dans la MÊME chaîne que la piste (filtre de tension, gain,
        sourdine, esquive). PROGRAMME, à la lettre : vagues 1 et 2 la piste en blocs ; vague 3 electro-calme ;
        vague 4 voix-machine puis electro-tension s'il finit avant la vague ; vague 5 voix-plus-vite ; section
        alerte puis boss : voix-duo (« Warning, Titan approaching ») puis electro-titan en boucle. Repit, titre,
        briefing, victoire, défaite, initiales : la piste en blocs, comme avant ; cartes et pause : le morceau est
        étouffé comme la piste, puis reprend où il en était. Fondu enchaîné de 1,5 s posé sur une barre de ce qui
        joue (carte des barres mesurée, morceaux.json). Pendant un morceau : PERCU et ÉTINCELLES coupées,
        INVERSION et BATTEMENT gardés, accent de mort inchangé. Chaque morceau garde SON tempo (115 à 128 BPM) :
        la grille (barres, accents, couches gardées) suit le morceau en cours. Niveau : gainDb + gainJeuDb, réglé
        par tools/H/niveau.mjs pour égaler la sonie de la piste à tension égale. Tout échec (404, décodage, lecture
        refusée, fichier autonome --embed) laisse la piste en blocs, sans erreur.

   INTERFACE PUBLIQUE (§ 7.8). Rien n'est appelé au chargement ; tout survit à l'absence des autres modules.
     N.music.init()                    crée le contexte audio ; sur un geste de la joueuse (90-boot.js)
     N.music.start(), stop()           la partition. start() après stop() reprend sur une NOUVELLE mesure
     N.music.load({base}) -> Promise   lit piste.json (base = MUSIQUE_BASE par défaut, ou le bundle --embed) ;
                                       les blocs viennent à la demande ; appelé par init() si personne ne l'a fait
     N.music.section(nom)              titre, attraction, briefing, jeu, repit, alerte, boss, victoire, defaite,
                                       initiales ; un nom inconnu est ignoré. Enchaîne à la fin du bloc, ou à la
                                       mesure suivante quand la famille de blocs change
     N.music.cue(nom)                  mort (coupe net), gameover, stinger, drop, plongee, vague, inversion
     N.music.couche(nom, bool)         'inversion'
     N.music.tension(v)                0 à 1, lue à chaque image : filtre et gain de la piste, couches
     N.music.danger(v)                 0 à 1 : BATTEMENT, passe-bas 2 kHz et percussion réduite à la grosse caisse
     N.music.beat() -> {bar, beat, phase}   phase AUDIO, pour l'image seulement (§ 7.2)
     N.music.sfx(nom, {pan, pitch, type})   la banque du § 5.8 ; un nom inconnu joue le son neutre
     N.music.voix(mot)                 READY, GO, WARNING, DANGER, EXCELLENT, GAMEOVER (P3)
     N.music.mute(bool)                coupe tout (bouton de 70-game.js) ; mute('musique'|'effets', bool) par canal
     N.music.muted([canal])            -> bool
     N.music.suspend(), resume()       arrière-plan (90-boot.js) ; reprise sur une mesure neuve
     N.music.piste() -> {pret, bloc, mesure, section, repli, morceau}
     N.music.morceau() -> {id, t, duree} | null     le morceau long qui sonne (t en s dans le fichier), sinon null
     N.music.tempo() -> BPM                         le tempo de ce qui joue : celui du morceau long, sinon de la piste
     N.music.morceaux()                            diagnostic : catalogue, emplacements, programme, échecs
     N.music.noeuds()                  nœuds audio créés dans la dernière seconde
     N.music.rms(), rmsSfx(), rmsOut(), info(), journal(), context(), renderOffline(...)   tests et preuves

   HORLOGE. Tout est calé sur ctx.currentTime ; setInterval ne sert qu'à réveiller l'ordonnanceur, qui place
   les événements à l'avance. Le jeu vit sur son horloge de jeu (§ 7.2) : il n'écoute pas celle-ci.
   HASARD. Les choix musicaux viennent de N.rng('music') ; le bruit et les sons, d'un flux dérivé hors registre
   (leur instant dépend du jeu : ils ne doivent pas déplacer la composition). Aucun Math.random.
   MIXAGE (haut-parleur de téléphone) : pas d'aigus perçants (étagère douce au-dessus de 6 kHz), la basse est
   doublée à l'octave pour exister sans grave, les sons d'information passent AU-DESSUS de la musique (esquive
   de 0,30 relâchée en 120 ms sous un kill), genou doux à −1 dBFS.
   LA RÈGLE D'OR — aucune mesure complète, toutes couches confondues, n'est identique trois fois de suite :
   barGuard() la tient pour le moteur génératif, et la piste tire ses blocs hors des trois derniers joués. */

var N = (typeof window !== 'undefined' && window.__N) || {};
if (typeof window !== 'undefined') window.__N = N;

(function () {

  /* ================================ réglage du mélange ================================
     Valeurs mesurées par tools/C/mesure.mjs, pas devinées. */
  var MIX = {
    master: 1.20,
    music: 0.62,        // niveau du bus génératif à tension 0
    musicTension: 0.95, // ce que la tension ajoute
    track: 1.7,         // niveau de la piste (après le compresseur, avant le gain de tension)
    sfx: 1.90,
    pad: 0.22, bass: 0.42, drum: 0.80, lead: 0.85,
    perc: 0.55, spark: 0.20, inv: 0.20, heart: 0.9,
    revSend: { drum: 0.26, lead: 0.28, sfx: 0.20, bass: 0.0, pad: 0.10 },
    duckKill: 0.30, duckBig: 0.45, duckHurt: 0.32, duckInfo: 0.22
  };
  var BPM = 143.759;                              /* tempo mesuré de la piste (piste.json le confirme au chargement) */
  var LOOKAHEAD = 0.26, PUMP_MS = 40, TRACK_AHEAD = 1.1;
  var ROOT_BASS = 38, ROOT_PAD = 62, ROOT_LEAD = 74;   /* ré : D2, D4, D5 */
  var FADE_OUT = 0.018, FADE_IN = 0.04;           /* constantes de temps de la porte, en s */
  var XF = 0.010;                                 /* fondu de jointure de la piste : 10 ms, posé SUR la barre */
  var MAX_BLOCS = 4, MAX_OCTETS = 24500000;   /* au plus quatre blocs décodés, 24,5 Mo */
  var NODE_BUDGET = 58;                           /* nœuds créés par seconde au plus (sons de basse priorité coupés au-delà) */
  var FONDU_MZ = 1.5;                             /* fondu enchaîné d'un morceau long, en s, posé sur une barre de ce qui joue */
  var LEAD_MZ = 0.35;                             /* le morceau reçoit play() 0,35 s avant sa barre : le temps de démarrer, au silence */
  var MZ_TIQUE = 0.04;                            /* la preuve de lecture se fait 40 ms avant la barre : après, il est trop tard pour annuler */

  /* ================================ outils ================================ */
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function noop() {}
  function settle(pr) { if (pr && typeof pr.then === 'function') pr.then(noop, noop); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function rid(s) { return String(s || '').toLowerCase().replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/[^a-z0-9]/g, ''); }

  /* hasard : le flux de la musique (N.rng('music')), et un flux dérivé pour le bruit et les sons */
  function localRng(seed) {
    var st = (seed >>> 0) || 1;
    return function () { st = (st * 1664525 + 1013904223) % 4294967296; return st / 4294967296; };
  }
  var _localMus = localRng(2975 ^ 0x6d75);
  function mrnd() {
    var r = (typeof N.rng === 'function') ? N.rng('music') : null;
    return r ? r.f() : _localMus();
  }
  function derivedRng(nom) {
    if (typeof N.rng === 'function' && N.rng.flux && N.rng.graine) return N.rng.flux(N.rng.graine(), nom).f;
    return localRng(0x5bf03635 ^ nom.length * 977);
  }

  /* ================================ poches de motifs ================================
     Tout ce qui peut varier vit ici. Les masques font 16 pas (une mesure à 4/4, grille de double croche) :
     '.' silence, un chiffre = un rôle de hauteur. */

  /* grilles d'accords en ré dorien, 4 mesures chacune. d = demi-tons depuis la tonique, q = 0 mineur / 1 majeur */
  var GRIDS = [
    [[0, 0], [3, 1], [5, 1], [10, 1]],   /* Dm  F   G   C  */
    [[0, 0], [10, 1], [5, 1], [10, 1]],  /* Dm  C   G   C  */
    [[0, 0], [5, 1], [3, 1], [5, 1]],    /* Dm  G   F   G  */
    [[0, 0], [7, 0], [5, 1], [10, 1]],   /* Dm  Am  G   C  */
    [[0, 0], [2, 0], [3, 1], [5, 1]],    /* Dm  Em  F   G  */
    [[5, 1], [10, 1], [0, 0], [0, 0]]    /* G   C   Dm  Dm */
  ];
  var HARM_RATE = [1, 1, 1, 2];                 /* accords par mesure, parfois tenus deux mesures */

  var BASS = [
    '1...1...1...1...',
    '1.1.1...1.1.1...',
    '1..1..1...1..1..',
    '11..1..211..1..3',
    '1...1..31...1.2.',
    '1.1.1.1.1.1.1.1.',
    '1..31..21..31.2.'
  ];
  var BASS_NORM = BASS.map(function (m) {
    var e = 0;
    for (var i = 0; i < m.length; i++) { var c = m.charCodeAt(i) - 48; if (c === 1) e += 2.6; else if (c >= 2 && c <= 4) e += 1.5; }
    return Math.sqrt(15 / e);
  });
  var KICK = [
    '1.......1.......',
    '1.....1...1.....',
    '1.......1..1....',
    '1..1....1.......',
    '1.......1.....1.',
    '1.1.....1.......'
  ];
  var SNARE = [
    '....1.......1...',
    '....1.......1..1',
    '....1..1....1...',
    '....1.......11..',
    '..1.1.......1...'
  ];
  var HAT = [
    '..1...1...1...1.',
    '1.1.1.1.1.1.1.1.',
    '..1..1..1..1..1.',
    '..1...1...1.1.1.',
    '..1...1...1...11',
    '.1.1.1.1.1.1.1.1'
  ];
  var HAT_MUT = ['none', 'none', 'sixteen', 'drop', 'tail'];
  var FILLS = ['none', 'none', 'tom', 'snare', 'kick16', 'hush'];
  var BREAKS = ['none', 'none', 'none', 'beat', 'twobeat', 'stab'];
  var LEAD_SHAPE = [                             /* index dans [0, tierce, quinte, octave] : le lead reste entre la 4 et la 5 */
    [0, 1, 2, 3], [3, 2, 1, 0], [0, 1, 2, 1], [0, 2, 1, 3],
    [0, 3, 1, 2], [0, 2, 3, 2], [0, 1, 2, 3, 2, 1], [2, 1, 0, 1, 2, 3]
  ];
  var LEAD_RHY = [
    '1.1.1.1.1.1.1.1.',
    '1111.1..1111.1..',
    '1..1..1.1..1..1.',
    '1.11.1.11.11.1..',
    '1...1.1.1...1.1.',
    '11.1..1.11.1..1.'
  ];
  var LEAD_OCT = [0, 0, 0, -12, -12];
  var VOICING = [[0, 'T', 7, 12], [0, 7, 12, 'U'], [-12, 0, 'U', 19], [0, 7, 14, 'U'], [0, 'T', 7, 14]];
  var BASS_GHOST = ['none', 'none', 'off8', 'slide'];
  /* La gamme des sons ET des couches : ré, mi, sol, la, si (pentatonique de sol majeur à partir de ré). Elle évite
     la tierce et la septième : la piste hésite entre fa et fa dièse (chromagramme), cette gamme tombe juste dans
     les deux modes. Degrés en demi-tons depuis ré. */
  var PENTA = [0, 2, 5, 7, 9];
  /* Le REFRAIN du repli, composé à la main : huit notes sur deux mesures (pas de double croche 0 à 31), jouées
     telles quelles. ré dorien, entre la 4 et la 5. */
  var REFRAIN = [[0, 74], [3, 77], [6, 81], [8, 79], [16, 76], [19, 74], [22, 77], [24, 72]];
  /* ÉTINCELLES : arpège carré à 25 %, entre ré 5 et ré 6, sur la gamme sûre */
  var SPARK_SEQ = [[0, 2, 3, 4, 3, 2], [4, 3, 2, 0, 2, 3, 4, 5], [0, 3, 2, 4, 3, 5, 4, 2], [5, 4, 3, 2, 0, 2, 3, 4]];
  var SPARK_MASK = ['1.1.1.1.1.1.1.1.', '1.11.1.11.11.1.1', '1..1.1..1..1.1..', '11.1.11.1.11.1..'];
  var INV_SEQ = [[0, 1, 2, 3, 2, 1], [0, 2, 1, 3, 2, 4], [4, 3, 2, 1, 2, 3]];

  /* les profils du repli par section : la tension est remontée ou plafonnée, le filtre de section s'y ajoute */
  var PROFIL = {
    titre: { t: 0.12 }, attraction: { t: 0.16 }, briefing: { t: 0.18 },
    jeu: { t: -1 }, repit: { t: 0.24, cap: 0.3 }, alerte: { t: 0.5, siren: 1, lp: 300 },
    boss: { t: -1, floor: 0.72 }, victoire: { t: 0.55 }, defaite: { t: 0.1, lp: 1200 }, initiales: { t: 0.2 }
  };
  /* famille de blocs de la piste par section */
  var SEC_FAM = { titre: 'intro', attraction: 'intro', briefing: 'intro', jeu: 'plateau', repit: 'respiration',
    alerte: 'alerte', boss: 'retour', victoire: 'outro', defaite: 'outro', initiales: 'outro' };
  var SEC_LP = { alerte: 300, defaite: 1200 };            /* passe-bas de section sur la piste */
  var FAM_LEAD = { plateau: 1, respiration: 1, retour: 1 };   /* entrée par la mesure de levée (PONT, dernière mesure d'avant) */
  var FAM_SECTION = { intro: 'INTRO', plateau: 'PLATEAU', respiration: 'RESPIRATION', retour: 'RETOUR', outro: 'OUTRO' };

  /* ================================ le moteur ================================
     build() construit un moteur complet sur un contexte quelconque. Le jeu en instancie un sur un AudioContext ;
     la preuve en instancie un second sur un OfflineAudioContext. Le code de synthèse, de composition et de
     séquençage de la piste est le MÊME : la preuve mesure donc bien ce qui est joué. */
  function build(ctx, offline, mute, brut) {

    var sr = ctx.sampleRate;
    var muteMus = mute === 'music', muteSfx = mute === 'sfx';
    var nrnd = derivedRng('music.bruit');            /* bruit */
    var srnd = derivedRng('music.sons');             /* sons d'information */

    /* ---- compteur de nœuds : N.music.noeuds() et la réserve de voix des sons de basse priorité ---- */
    var nodeLog = [], nodeHead = 0, nodeTotal = 0, sfxLog = [], sfxHead = 0, inSfx = false;
    ['createGain', 'createOscillator', 'createBufferSource', 'createBiquadFilter', 'createStereoPanner', 'createDelay',
      'createWaveShaper', 'createChannelMerger', 'createAnalyser', 'createDynamicsCompressor'].forEach(function (nm) {
      var f = ctx[nm]; if (typeof f !== 'function') return;
      ctx[nm] = function (a, b, c) { nodeLog.push(ctx.currentTime); if (inSfx) sfxLog.push(ctx.currentTime); nodeTotal++; return f.call(ctx, a, b, c); };
    });
    function nodesLast(win) {
      var t = ctx.currentTime - (win || 1);
      while (nodeHead < nodeLog.length && nodeLog[nodeHead] < t) nodeHead++;
      if (nodeHead > 4096) { nodeLog = nodeLog.slice(nodeHead); nodeHead = 0; }
      return nodeLog.length - nodeHead;
    }
    function sfxNodesLast(win) {                       /* les nœuds des sons seuls : le budget des sons ne se paie pas sur la musique */
      var t = ctx.currentTime - (win || 1);
      while (sfxHead < sfxLog.length && sfxLog[sfxHead] < t) sfxHead++;
      if (sfxHead > 4096) { sfxLog = sfxLog.slice(sfxHead); sfxHead = 0; }
      return sfxLog.length - sfxHead;
    }

    /* ---- automation sans claquement ---- */
    function hold(p, t) {
      if (typeof p.cancelAndHoldAtTime === 'function') {
        try { p.cancelAndHoldAtTime(t); p.__v = undefined; return; } catch (e) { /* repli ci-dessous */ }
      }
      var v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); p.__v = v;
    }
    function rampTo(p, v, t, dur) {
      var from = p.__v === undefined ? p.value : p.__v;
      p.setValueAtTime(from, t);
      p.linearRampToValueAtTime(v, t + dur);
      p.__v = v;
    }
    function glide(p, v, tc) {
      var now = ctx.currentTime;
      hold(p, now);
      if (tc > 0) p.setTargetAtTime(v, now, tc); else p.setValueAtTime(v, now);
    }

    /* ---- genou doux : linéaire jusqu'à T, plafond à C (−1 dBFS) ---- */
    function kneeCurve(n) {
      var c = new Float32Array(n), T = 0.56, C = 0.88;
      for (var i = 0; i < n; i++) {
        var x = ((i / (n - 1)) * 2 - 1) * 2, a = x < 0 ? -x : x;
        var y = a <= T ? a : T + (C - T) * Math.tanh((a - T) / (C - T));
        c[i] = x < 0 ? -y : y;
      }
      return c;
    }

    /* ---- bus ----
       gen : couches génératives -> musicBus -> musicLevel -+
       piste : items -> trackBus -> étagère -> passe-bas -> trackLevel -+-> musicDuck -> musicCut -> musicChan -> secLP -> muffle -> master
       sons : sfxBus -> master                                                                     (esquive : musicDuck) */
    var master = ctx.createGain(); master.gain.value = MIX.master * 0.5;
    var shaper = ctx.createWaveShaper();
    shaper.curve = kneeCurve(4097); shaper.oversample = 'none';   /* pas de suréchantillonnage : il faisait déborder le plafond de 2 dB sur les aigus */
    var gate = ctx.createGain(); gate.gain.value = 1;
    master.connect(shaper); shaper.connect(gate); gate.connect(ctx.destination);

    var musicBus = ctx.createGain();
    var musicLevel = ctx.createGain(); musicLevel.gain.value = MIX.music;
    var musicDuck = ctx.createGain(); musicDuck.gain.value = 1;
    var musicCut = ctx.createGain(); musicCut.gain.value = 1;            /* la coupure à la mort */
    var secLP = ctx.createBiquadFilter(); secLP.type = 'lowpass'; secLP.frequency.value = Math.min(20000, sr * 0.45); secLP.Q.value = 0.5;   /* filtre de section : alerte 300 Hz, défaite 1,2 kHz */
    var musicChan = ctx.createGain(); musicChan.gain.value = muteMus ? 0 : 1;   /* mute('musique') */
    var OPEN = Math.min(20000, sr * 0.45);
    var muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = OPEN; muffle.Q.value = 0.6;
    var genHP = ctx.createBiquadFilter(); genHP.type = 'highpass'; genHP.frequency.value = 460; genHP.Q.value = 0.8;   /* repli éclairci : pas de grave sous 460 Hz (le haut-parleur d'un téléphone ne les rend pas) */
    musicBus.connect(genHP); genHP.connect(musicLevel); musicLevel.connect(musicDuck); musicDuck.connect(musicCut);
    musicCut.connect(musicChan); musicChan.connect(secLP); secLP.connect(muffle); muffle.connect(master);

    var trackBus = ctx.createGain(); trackBus.gain.value = 1;
    var trackShelf = ctx.createBiquadFilter(); trackShelf.type = 'highshelf'; trackShelf.frequency.value = 6000; trackShelf.gain.value = -3;
    var trackLP = ctx.createBiquadFilter(); trackLP.type = 'lowpass'; trackLP.frequency.value = OPEN; trackLP.Q.value = 0.5;
    var trackLevel = ctx.createGain(); trackLevel.gain.value = MIX.track;
    /* haut-parleur de téléphone : le grave (< 130 Hz) n'existe pas, il ne fait que manger la marge de crête ; un
       compresseur doux relève le niveau moyen sans relever les crêtes */
    var trackHP = ctx.createBiquadFilter(); trackHP.type = 'highpass'; trackHP.frequency.value = 130; trackHP.Q.value = 0.7;
    var trackComp = ctx.createDynamicsCompressor();
    trackComp.threshold.value = -26; trackComp.knee.value = 18; trackComp.ratio.value = 4; trackComp.attack.value = 0.005; trackComp.release.value = 0.12;
    var trackLP2 = ctx.createBiquadFilter(); trackLP2.type = 'lowpass'; trackLP2.frequency.value = OPEN; trackLP2.Q.value = 1.3;   /* avec trackLP : Butterworth d'ordre 4 */
    trackLP.Q.value = 0.54;
    /* les morceaux longs (Suno) entrent dans LA MÊME chaîne que la piste : passe-haut, compresseur, étagère, passe-bas de
       tension, niveau, puis esquive, coupure de mort, canal, étouffoir. trkFade est le fondu enchaîné de la piste en blocs
       (1 : elle sonne, 0 : un morceau long tient l'antenne) ; mzBus reçoit les trois emplacements de lecture. */
    var trkFade = ctx.createGain(); trkFade.gain.value = 1;
    var mzBus = ctx.createGain(); mzBus.gain.value = 1;
    if (brut) { trackBus.gain.value = 0.1; trackBus.connect(trkFade); trkFade.connect(musicDuck); mzBus.connect(musicDuck); }   /* preuve des jointures : la piste seule, sans traitement */
    else {
      trackBus.connect(trkFade); trkFade.connect(trackHP); mzBus.connect(trackHP);
      trackHP.connect(trackComp); trackComp.connect(trackShelf);
      trackShelf.connect(trackLP); trackLP.connect(trackLP2); trackLP2.connect(trackLevel); trackLevel.connect(musicDuck);
    }

    var sfxChan = ctx.createGain(); sfxChan.gain.value = muteSfx ? 0 : 1;
    var sfxBus = ctx.createGain(); sfxBus.gain.value = MIX.sfx;
    sfxBus.connect(sfxChan); sfxChan.connect(master);

    var LAY = {};
    ['pad', 'bass', 'drum', 'lead', 'perc', 'spark', 'inv', 'heart'].forEach(function (k) {
      var g = ctx.createGain();
      g.gain.value = (k === 'pad' || k === 'bass') ? MIX[k] : 0;
      g.connect(musicBus); LAY[k] = g;
    });

    /* ---- réverbération : réseau de retards rétroactifs (quatre peignes passe-bas) ---- */
    var revIn = ctx.createGain(), revOut = ctx.createGain(); revOut.gain.value = 1.0;
    var revMusIn = ctx.createGain(); revMusIn.gain.value = muteMus ? 0 : 1;
    var revSfxIn = ctx.createGain(); revSfxIn.gain.value = muteSfx ? 0 : 1;
    revMusIn.connect(revIn); revSfxIn.connect(revIn);
    (function () {
      var pre = ctx.createDelay(0.2); pre.delayTime.value = 0.018;
      revIn.connect(pre);
      var merge = ctx.createChannelMerger(2);
      var combs = [[0.0431, 0.80], [0.0537, 0.787], [0.0719, 0.773], [0.0977, 0.761]];
      for (var i = 0; i < combs.length; i++) {
        var d = ctx.createDelay(0.3); d.delayTime.value = combs[i][0];
        var fb = ctx.createGain(); fb.gain.value = combs[i][1];
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
        pre.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d);
        var pan = ctx.createStereoPanner(); pan.pan.value = (i % 2) ? 0.55 : -0.55;
        d.connect(pan); pan.connect(merge, 0, i % 2);
      }
      var tilt = ctx.createBiquadFilter(); tilt.type = 'highpass'; tilt.frequency.value = 180;
      merge.connect(tilt); tilt.connect(revOut);
      revOut.connect(muffle);
    })();
    function send(from, amt, dom) {
      if (amt <= 0) return null;
      var g = ctx.createGain(); g.gain.value = amt; from.connect(g);
      g.connect(dom === 's' ? revSfxIn : revMusIn); return g;
    }

    /* ---- tampons de bruit : blanc, et blanc passe-haut pour les charlestons (deux nœuds au lieu de trois) ---- */
    var noiseBuf = (function () {
      var n = Math.floor(sr * 2), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = nrnd() * 2 - 1;
      return b;
    })();
    var hatBuf = (function () {                     /* dérivée seconde : pente de +12 dB par octave, tout dans les aigus */
      var n = noiseBuf.length, b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), s = noiseBuf.getChannelData(0);
      for (var i = 2; i < n; i++) d[i] = (s[i] - 2 * s[i - 1] + s[i - 2]) * 0.3;
      return b;
    })();
    function noise(t, dur, rng, buf) {
      var s = ctx.createBufferSource(); s.buffer = buf || noiseBuf; s.loop = true;
      var off = (rng || mrnd)() * 1.8;
      s.start(t, off, dur + 0.02); s.stop(t + dur + 0.02); return s;
    }
    /* onde carrée à 25 % (ÉTINCELLES) et à 12,5 % (bip) */
    function pulseWave(d) {
      var n = 24, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
      for (var k = 1; k <= n; k++) { re[k] = Math.sin(2 * k * Math.PI * d) / (k * Math.PI); im[k] = 2 * Math.pow(Math.sin(k * Math.PI * d), 2) / (k * Math.PI); }
      return ctx.createPeriodicWave(re, im);
    }
    var WAVE25 = pulseWave(0.25), WAVE125 = pulseWave(0.125);

    function pluck(p, t, a, d, peak) {
      p.setValueAtTime(0.0001, t);
      p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
      p.exponentialRampToValueAtTime(0.0001, t + a + d);
    }

    /* ================================ nappe (repli) ================================ */
    var padVoices = [], padFilter, padBase = 2300;
    (function () {
      var mix = ctx.createGain(); mix.gain.value = 0.25;
      padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass';
      padFilter.frequency.value = padBase; padFilter.Q.value = 2.2;
      mix.connect(padFilter);
      for (var i = 0; i < 4; i++) {
        var vg = ctx.createGain(); vg.gain.value = 0.25; vg.connect(mix);
        var a = ctx.createOscillator(), b = ctx.createOscillator();
        a.type = 'sawtooth'; b.type = 'sawtooth';
        a.detune.value = -11; b.detune.value = 11;
        a.frequency.value = hz(ROOT_PAD); b.frequency.value = hz(ROOT_PAD);
        a.connect(vg); b.connect(vg); a.start(0); b.start(0);
        padVoices.push({ g: vg, a: a, b: b });
      }
      var mg = ctx.createChannelMerger(2);
      [[0.0112, -0.8, 0.071], [0.0171, 0.8, 0.053]].forEach(function (c, i) {
        var d = ctx.createDelay(0.05); d.delayTime.value = c[0];
        var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = c[2];
        var la = ctx.createGain(); la.gain.value = 0.0032;
        lfo.connect(la); la.connect(d.delayTime); lfo.start(0);
        var p = ctx.createStereoPanner(); p.pan.value = c[1];
        padFilter.connect(d); d.connect(p); p.connect(mg, 0, i);
      });
      padFilter.connect(LAY.pad); mg.connect(LAY.pad);
      send(padFilter, MIX.revSend.pad);
      [[0.0371, 320], [0.0137, 180]].forEach(function (c) {
        var l = ctx.createOscillator(); l.type = 'sine'; l.frequency.value = c[0];
        var g = ctx.createGain(); g.gain.value = c[1];
        l.connect(g); g.connect(padFilter.frequency); l.start(0);
      });
    })();
    function padSet(root, third, voicing, t) {
      while (root > 63) root -= 12;
      while (root < 52) root += 12;
      for (var i = 0; i < 4; i++) {
        var v = voicing[i], iv = v === 'T' ? third : v === 'U' ? third + 12 : v;
        var f = hz(root + iv);
        padVoices[i].a.frequency.setTargetAtTime(f, t, 0.055);
        padVoices[i].b.frequency.setTargetAtTime(f, t, 0.075);
      }
    }

    /* ================================ basse ================================ */
    var tSmooth = 0;
    function bassNote(t, midi, dur, vel) {
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7;
      var f0 = 120 + 90 * vel, f1 = f0 + 1500 + 1700 * tSmooth;
      lp.frequency.setValueAtTime(f1, t);
      lp.frequency.exponentialRampToValueAtTime(f0, t + Math.min(0.26, dur * 0.9));
      var saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = hz(midi);
      var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = hz(midi);
      var sg = ctx.createGain(); sg.gain.value = 0.45;
      saw.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(g); g.connect(LAY.bass);
      pluck(g.gain, t, 0.006, dur, MIX.bass * vel);
      saw.start(t); sub.start(t); saw.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
    }

    /* ================================ batterie ================================ */
    function kick(t, vel, out) {                     /* punch (chute de 150 à 42 Hz) et clic : quatre nœuds */
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.075);
      var g = ctx.createGain(); o.connect(g); g.connect(out || LAY.drum);
      pluck(g.gain, t, 0.002, 0.24, (out ? 1 : MIX.drum) * vel);
      var c = noise(t, 0.012, null, hatBuf), cg = ctx.createGain(); c.connect(cg); cg.connect(out || LAY.drum);
      pluck(cg.gain, t, 0.001, 0.012, (out ? 1 : MIX.drum) * vel * 0.7);
      o.start(t); o.stop(t + 0.28);
      if (!out) send(g, MIX.revSend.drum * 0.3);
    }
    function snare(t, vel) {
      var n = noise(t, 0.2), bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1750; bp.Q.value = 0.7;
      var g = ctx.createGain(); n.connect(bp); bp.connect(g); g.connect(LAY.drum);
      pluck(g.gain, t, 0.002, 0.15, MIX.drum * vel * 0.85);
      var b = ctx.createOscillator(); b.type = 'triangle';
      b.frequency.setValueAtTime(205, t); b.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      var bg = ctx.createGain(); b.connect(bg); bg.connect(LAY.drum);
      pluck(bg.gain, t, 0.002, 0.07, MIX.drum * vel * 0.5);
      b.start(t); b.stop(t + 0.12);
      send(g, MIX.revSend.drum);
    }
    function hat(t, vel, open, lay) {
      var d = open ? 0.19 : 0.036, n = noise(t, d, null, hatBuf);
      var g = ctx.createGain(); n.connect(g); g.connect(lay || LAY.drum);
      pluck(g.gain, t, 0.001, d, (lay ? 1 : MIX.drum) * vel * (open ? 0.5 : 0.36));
      if (open && !lay) send(g, MIX.revSend.drum * 0.5);
    }
    function clap(t, vel, lay) {                     /* trois claquements sur une seule enveloppe : trois nœuds */
      var n = noise(t, 0.16), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 1.0;
      var g = ctx.createGain(); n.connect(bp); bp.connect(g); g.connect(lay || LAY.drum);
      var p = g.gain, k = (lay ? 1 : MIX.drum) * vel * 0.4;
      p.setValueAtTime(0.0001, t);
      for (var i = 0; i < 3; i++) {
        var tt = t + i * 0.011;
        p.linearRampToValueAtTime(k, tt + 0.001);
        p.exponentialRampToValueAtTime(i === 2 ? 0.0001 : k * 0.25, tt + (i === 2 ? 0.12 : 0.010));
      }
      if (!lay) send(g, MIX.revSend.drum * 1.2);
    }
    function tom(t, vel, p) {
      var o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(p, t); o.frequency.exponentialRampToValueAtTime(p * 0.6, t + 0.14);
      var g = ctx.createGain(); o.connect(g); g.connect(LAY.drum);
      pluck(g.gain, t, 0.002, 0.16, MIX.drum * vel * 0.6);
      o.start(t); o.stop(t + 0.2);
      send(g, MIX.revSend.drum * 0.8);
    }

    /* ================================ lead (repli) : éclairci ================================ */
    var leadDelay, leadFb;
    (function () {
      leadDelay = ctx.createDelay(1.2); leadDelay.delayTime.value = 0.28;
      leadFb = ctx.createGain(); leadFb.gain.value = 0.32;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      leadDelay.connect(lp); lp.connect(leadFb); leadFb.connect(leadDelay);
      var p = ctx.createStereoPanner(); p.pan.value = 0.35;
      leadDelay.connect(p); p.connect(LAY.lead);
    })();
    function leadNote(t, midi, dur, vel) {
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.0;
      lp.frequency.setValueAtTime(7500, t);
      lp.frequency.exponentialRampToValueAtTime(3600, t + dur + 0.08);
      var a = ctx.createOscillator(), b = ctx.createOscillator();
      a.type = 'sawtooth'; b.type = 'triangle';
      a.frequency.value = hz(midi); b.frequency.value = hz(midi);
      a.detune.value = -7; b.detune.value = 8;
      var bg = ctx.createGain(); bg.gain.value = 0.6;
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g);
      g.connect(LAY.lead); g.connect(leadDelay);
      pluck(g.gain, t, 0.008, dur + 0.05, MIX.lead * vel);
      a.start(t); b.start(t); a.stop(t + dur + 0.1); b.stop(t + dur + 0.1);
      send(g, MIX.revSend.lead);
    }
    /* ÉTINCELLES et INVERSION : deux nœuds (oscillateur et enveloppe), le filtre vit sur le bus */
    function sparkNote(t, midi, dur, vel) {
      var o = ctx.createOscillator(); o.setPeriodicWave(WAVE25); o.frequency.value = hz(midi);
      var g = ctx.createGain(); o.connect(g); g.connect(LAY.spark);
      pluck(g.gain, t, 0.003, dur, vel);
      o.start(t); o.stop(t + dur + 0.05);
    }
    function invNote(t, midi, dur, vel) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(midi);
      var g = ctx.createGain(); o.connect(g); g.connect(LAY.inv);
      pluck(g.gain, t, 0.002, dur, vel);
      o.start(t); o.stop(t + dur + 0.05);
    }
    /* la sirène d'ALERTE : un balayage montant par temps */
    function siren(t, dur) {
      var o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(980, t + dur * 0.5); o.frequency.linearRampToValueAtTime(620, t + dur);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
      var g = ctx.createGain(); o.connect(lp); lp.connect(g); g.connect(sfxBus);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.02); g.gain.setValueAtTime(0.11, t + dur - 0.03); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    }
    /* le battement : lub-dub, deux coups graves saturés avec composante médium (deux nœuds chacun) */
    function heartbeat(t, vel, out) {
      [[0, 78, 0.9], [0.17, 66, 0.7]].forEach(function (c) {
        var o = ctx.createOscillator(); o.type = 'sawtooth';           /* dent de scie filtrée : le grave a sa composante médium */
        o.frequency.setValueAtTime(c[1] * 2.6, t + c[0]); o.frequency.exponentialRampToValueAtTime(c[1], t + c[0] + 0.08);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 1;
        var g = ctx.createGain(); o.connect(lp); lp.connect(g); g.connect(out || LAY.heart);
        pluck(g.gain, t + c[0], 0.004, 0.16, vel * c[2] * 0.7);
        o.start(t + c[0]); o.stop(t + c[0] + 0.22);
        var n = noise(t + c[0], 0.05, null, hatBuf), ng = ctx.createGain(); n.connect(ng); ng.connect(out || LAY.heart);
        pluck(ng.gain, t + c[0], 0.002, 0.05, vel * c[2] * 0.5);
      });
    }

    /* ================================ esquive ================================ */
    function duck(t, amt, rel) {
      if (!(amt > 0)) return;
      var p = musicDuck.gain;
      p.setTargetAtTime(Math.max(0.05, 1 - amt), t, 0.01);
      p.setTargetAtTime(1, t + 0.05, Math.max(0.02, rel / 3));
    }

    /* ================================ la banque de sons (§ 5.8) ================================
       Tous tombent dans la tonalité (ré, gamme PENTA), au moins 25 % de leur énergie au-dessus de 400 Hz, sept
       positions de panoramique. Contre l'agacement, chaque appel passe par trois gardes : FUSION (deux appels du
       même nom à moins de quelques ms ne font qu'un son), PLAFOND de voix simultanées par nom, USURE (le gain
       d'un nom baisse avec sa densité récente) ; sauf `kill`, qu'on n'ôte jamais (les kills rapprochés
       s'empilent en notes qui montent d'un demi-ton). Un nom inconnu joue le son neutre, jamais d'erreur. */
    var OUT = sfxBus;                                  /* sortie du son en cours de création (panoramique) */
    var gridApi = { snap: function (t) { return t; }, bd: function () { return 60 / BPM; } };   /* la grille de la mesure, branchée plus bas */
    function keyNote(base, idx) {
      idx = idx < 0 ? 0 : idx | 0;
      return base + 12 * Math.floor(idx / 5) + PENTA[idx % 5];
    }
    function voice(t, type, f0, f1, gl, a, d, peak, lpf, out) {
      var o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + gl);
      var g = ctx.createGain(); pluck(g.gain, t, a, d, peak);
      if (lpf) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf; lp.Q.value = 0.7; o.connect(lp); lp.connect(g); }
      else o.connect(g);
      g.connect(out || OUT);
      o.start(t); o.stop(t + a + d + 0.03);
      return g;
    }
    function burst(t, ftype, f, q, a, d, peak, out) {
      var n = noise(t, a + d, srnd), fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q;
      var g = ctx.createGain(); pluck(g.gain, t, a, d, peak);
      n.connect(fl); fl.connect(g); g.connect(out || OUT);
      return g;
    }
    function sweepNoise(t, f0, f1, q, dur, peak, a) {   /* souffle filtré dont la fréquence glisse */
      var n = noise(t, dur, srnd), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var g = ctx.createGain(); pluck(g.gain, t, a || 0.01, dur, peak);
      n.connect(bp); bp.connect(g); g.connect(OUT); return g;
    }
    function vary(x) { return 1 + (srnd() - 0.5) * x; }
    /* une suite de notes de la gamme : [degré, ...] à partir d'une base ré, un pas de `sp` secondes */
    function run(t, base, degs, sp, type, dur, peak, lpf) {
      for (var i = 0; i < degs.length; i++) voice(t + i * sp, type, hz(keyNote(base, degs[i])), 0, 0, 0.003, dur, peak, lpf || 0);
      return degs.length * sp + dur;
    }

    var killStack = 0, killLast = -9, butinStack = 0, butinLast = -9;
    var ARMES = { bond: 1, verrouillage: 2, visee: 3, recul: 4, meche: 5, laser: 6, coupe: 7, coupeRoute: 7 };
    function armeKey(s) {
      s = rid(s);
      if (!s) return 0;
      if (s.indexOf('bond') >= 0 || s.indexOf('saut') >= 0) return 1;
      if (s.indexOf('verrou') >= 0 || s.indexOf('lock') >= 0) return 2;
      if (s.indexOf('vis') >= 0 || s.indexOf('aim') >= 0) return 3;
      if (s.indexOf('recul') >= 0) return 4;
      if (s.indexOf('mech') >= 0 || s.indexOf('fuse') >= 0) return 5;
      if (s.indexOf('laser') >= 0) return 6;
      if (s.indexOf('coupe') >= 0 || s.indexOf('route') >= 0) return 7;
      return 0;
    }

    /* chaque son rend sa durée ; g est le gain d'usure (1 pour un son isolé) */
    var SFX = {
      /* ---- la joueuse : timbres clairs ---- */
      tir: function (t, o, g) {
        var k = (o.pitch | 0) % 5; if (k < 0) k += 5;
        var f = hz(keyNote(74, [0, 2, 1, 3, 4][k])) * vary(0.012), d = 0.05 + srnd() * 0.016;
        voice(t, 'triangle', f * 1.1, f * 0.7, d, 0.002, d, 0.085 * g, 2600);
        return d + 0.03;
      },
      salve: function (t, o, g) {
        var f = hz(keyNote(74, 1 + ((o.pitch | 0) % 3))) * vary(0.02);
        voice(t, 'triangle', f * 1.3, f * 0.7, 0.07, 0.002, 0.08, 0.085 * g, 2400);
        return 0.12;
      },
      boostOn: function (t, o, g) {
        sweepNoise(t, 500, 2400, 1.1, 0.30, 0.20 * g, 0.03);
        voice(t, 'sawtooth', hz(50), hz(62), 0.3, 0.02, 0.28, 0.06 * g, 1400);
        return 0.34;
      },
      boostOff: function (t, o, g) {
        sweepNoise(t, 2200, 450, 1.1, 0.26, 0.17 * g, 0.01);
        voice(t, 'sawtooth', hz(62), hz(46), 0.26, 0.005, 0.24, 0.05 * g, 1400);
        return 0.3;
      },
      boostPanne: function (t, o, g) {                /* un seul clic grave */
        voice(t, 'triangle', 260, 100, 0.04, 0.001, 0.05, 0.04 * g, 0);
        burst(t, 'bandpass', 1100, 0.9, 0.001, 0.035, 0.85 * g);
        return 0.14;
      },
      traversee: function (t, o, g) {
        sweepNoise(t, 700, 2600, 1.4, 0.36, 0.22 * g, 0.02);
        voice(t + 0.05, 'sine', hz(keyNote(86, 0)), hz(keyNote(86, 2)), 0.25, 0.02, 0.25, 0.04 * g, 0);
        return 0.42;
      },
      ralenti: function (t, o, g) {                    /* le temps qui s'étire : glissando descendant */
        var a = voice(t, 'triangle', hz(74), hz(62), 0.55, 0.01, 0.55, 0.15 * g, 1800);
        voice(t, 'triangle', hz(74) * 1.5, hz(62) * 1.5, 0.55, 0.01, 0.5, 0.06 * g, 1800);
        sweepNoise(t, 2000, 500, 1.0, 0.5, 0.06 * g, 0.01);
        send(a, MIX.revSend.sfx, 's'); return 0.6;
      },
      repli: function (t, o, g) {                      /* la carapace : deux notes montantes et un souffle sourd */
        voice(t, 'triangle', hz(62), hz(62), 0, 0.005, 0.2, 0.15 * g, 1900);
        voice(t + 0.11, 'triangle', hz(69), hz(69), 0, 0.005, 0.28, 0.15 * g, 1900);
        burst(t + 0.08, 'bandpass', 700, 0.8, 0.01, 0.22, 0.1 * g);
        return 0.42;
      },
      pouvoirPret: function (t, o, g) {                /* bip */
        [880, 1320].forEach(function (f, i) {
          var oo = ctx.createOscillator(); oo.setPeriodicWave(WAVE25); oo.frequency.value = f;
          var gg = ctx.createGain(); oo.connect(gg); gg.connect(OUT);
          pluck(gg.gain, t + i * 0.09, 0.002, 0.07, 0.07 * g);
          oo.start(t + i * 0.09); oo.stop(t + i * 0.09 + 0.1);
        });
        return 0.22;
      },
      ultimePret: function (t, o, g) {
        var d = run(t, 74, [0, 1, 3, 5], 0.07, 'triangle', 0.18, 0.11 * g, 2800);
        var a = voice(t + 0.28, 'triangle', hz(86), hz(86), 0, 0.01, 0.5, 0.12 * g, 3000);
        send(a, MIX.revSend.sfx * 1.5, 's'); duck(t, MIX.duckInfo, 0.5); return d + 0.5;
      },
      ultime: function (t, o, g) {                     /* la montée puis l'APOGÉE */
        sweepNoise(t, 300, 3200, 0.9, 0.45, 0.2 * g, 0.2);
        voice(t, 'sawtooth', hz(50), hz(74), 0.45, 0.2, 0.3, 0.07 * g, 2200);
        SFX.explosion(t + 0.46, { pan: 0 }, g);
        return 1.1;
      },
      lasso: function (t, o, g) {                      /* un accord de n notes */
        var n = clamp((o.n | 0) || ((o.pitch | 0) + 3), 2, 8);
        for (var i = 0; i < n; i++) {
          var f = hz(keyNote(74, i));
          var a = voice(t + i * 0.05, 'triangle', f, f, 0, 0.004, i === n - 1 ? 0.4 : 0.14, 0.11 * g, 3000);
          if (i === n - 1) send(a, MIX.revSend.sfx * 1.4, 's');
        }
        return n * 0.05 + 0.4;
      },
      fermable: function (t, o, g) {                   /* petit tic au point refermable */
        voice(t, 'square', 1900, 1900, 0, 0.001, 0.02, 0.045 * g, 2400);
        return 0.04;
      },
      vie: function (t, o, g) {
        var d = run(t, 74, [0, 3, 5, 6], 0.08, 'triangle', 0.22, 0.13 * g, 3000);
        send(voice(t + 0.3, 'triangle', hz(86), hz(86), 0, 0.005, 0.5, 0.11 * g, 3000), MIX.revSend.sfx * 1.5, 's');
        duck(t, MIX.duckInfo, 0.5); return d + 0.4;
      },
      porte: function (t, o, g) {                      /* le VOL : une porte franchie, plus aiguë à chaque porte */
        var f = hz(keyNote(74, (o.pitch | 0) % 10));
        voice(t, 'triangle', f * 0.8, f * 1.25, 0.07, 0.002, 0.14, 0.12 * g, 0);
        burst(t, 'bandpass', 2200, 1.2, 0.001, 0.05, 0.05 * g);
        return 0.18;
      },
      devore: function (t, o, g) {                     /* un escalier montant */
        var n = clamp(3 + (o.pitch | 0), 3, 9);
        for (var i = 0; i < n; i++) voice(t + i * 0.04, 'square', hz(keyNote(74, i)), 0, 0, 0.002, 0.08, 0.05 * g, 2400);
        return n * 0.04 + 0.1;
      },

      /* ---- impacts ---- */
      impact: function (t, o, g) {
        burst(t, 'bandpass', 1100 + srnd() * 300, 0.9, 0.001, 0.045, 0.36 * g);
        voice(t, 'sine', 210, 95, 0.04, 0.001, 0.05, 0.035 * g, 0);
        return 0.08;
      },
      impactBoss: function (t, o, g) {                 /* métallique */
        voice(t, 'square', 520, 505, 0, 0.001, 0.2, 0.06 * g, 3000);
        voice(t, 'square', 777, 760, 0, 0.001, 0.18, 0.05 * g, 3000);
        burst(t, 'bandpass', 1800, 1.1, 0.001, 0.04, 0.12 * g);
        voice(t, 'sine', 150, 70, 0.08, 0.001, 0.14, 0.1 * g, 0);
        return 0.26;
      },
      ricochet: function (t, o, g) {                   /* blindage : un ping qui retombe */
        voice(t, 'triangle', 1750, 1050, 0.08, 0.001, 0.1, 0.09 * g, 0);
        burst(t, 'bandpass', 2000, 1.5, 0.001, 0.03, 0.06 * g);
        return 0.14;
      },
      kill: function (t, o, g) {
        var c = clamp(o.pitch | 0, 0, 9);
        killStack = (t - killLast < 0.14) ? Math.min(12, killStack + 1) : 0; killLast = t;   /* rapprochés : +1 demi-ton */
        var f = Math.min(2300, hz(keyNote(62, 3 + c) + killStack) * vary(0.01));
        var body = voice(t, 'triangle', f * 0.7, f, 0.03, 0.002, 0.18, 0.32 * g, 0);
        voice(t, 'square', f * 2, f * 2, 0, 0.002, 0.08, 0.1 * g, 1900);
        burst(t, 'bandpass', 1000 + srnd() * 250, 0.9, 0.001, 0.05, 0.32 * g);
        send(body, MIX.revSend.sfx, 's');
        duck(t, MIX.duckKill, 0.12);
        return 0.25;
      },
      bigkill: function (t, o, g) {
        var v = vary(0.12);
        voice(t, 'sine', 118 * v, 30, 0.9, 0.004, 1.05, 0.20 * g, 0);
        voice(t, 'triangle', 260 * v, 90, 0.3, 0.003, 0.34, 0.30 * g, 0);
        var n = noise(t, 1.4, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9;
        lp.frequency.setValueAtTime(2000 * v, t); lp.frequency.exponentialRampToValueAtTime(110, t + 1.15);
        var ng = ctx.createGain(); pluck(ng.gain, t, 0.004, 1.25, 0.46 * g);
        n.connect(lp); lp.connect(ng); ng.connect(OUT);
        burst(t, 'bandpass', 650 * v, 0.7, 0.002, 0.22, 0.30 * g);
        var cr = voice(t, 'sawtooth', 240 * v, 42, 0.45, 0.002, 0.5, 0.14 * g, 1300);
        send(ng, MIX.revSend.sfx * 2.6, 's'); send(cr, MIX.revSend.sfx * 1.6, 's');
        duck(t, MIX.duckBig, 0.8);
        return 1.4;
      },
      crash: function (t, o, g) {                      /* la tête contre un mur : choc sec */
        var n = noise(t, 0.6, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
        lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.5);
        var ng = ctx.createGain(); pluck(ng.gain, t, 0.002, 0.55, 0.34 * g);
        n.connect(lp); lp.connect(ng); ng.connect(OUT);
        voice(t, 'triangle', 220, 60, 0.18, 0.002, 0.3, 0.26 * g, 0);
        voice(t, 'square', 330, 120, 0.1, 0.002, 0.12, 0.05 * g, 1800);
        duck(t, MIX.duckHurt, 0.4); return 0.7;
      },
      explosion: function (t, o, g) {                  /* mines, chaînes */
        var v = vary(0.14);
        voice(t, 'sine', 140 * v, 36, 0.4, 0.003, 0.5, 0.17 * g, 0);
        voice(t, 'triangle', 300 * v, 100, 0.2, 0.003, 0.22, 0.24 * g, 0);
        var n = noise(t, 0.8, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9;
        lp.frequency.setValueAtTime(2200 * v, t); lp.frequency.exponentialRampToValueAtTime(140, t + 0.65);
        var ng = ctx.createGain(); pluck(ng.gain, t, 0.003, 0.7, 0.34 * g);
        n.connect(lp); lp.connect(ng); ng.connect(OUT);
        burst(t, 'bandpass', 700 * v, 0.7, 0.002, 0.16, 0.22 * g);
        send(ng, MIX.revSend.sfx * 1.6, 's'); duck(t, MIX.duckBig * 0.7, 0.5);
        return 0.85;
      },
      colosseMort: function (t, o, g) {                /* le colosse s'effondre : trois explosions en cascade et un grondement */
        SFX.bigkill(t, o, g);
        SFX.explosion(t + 0.42, { pan: -0.4 }, g); SFX.explosion(t + 0.8, { pan: 0.4 }, g);
        var n = noise(t, 2.2, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.8;
        var ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.22 * g, t + 0.3); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
        n.connect(lp); lp.connect(ng); ng.connect(OUT);
        voice(t, 'sawtooth', 130, 38, 1.8, 0.01, 1.9, 0.08 * g, 900);
        return 2.4;
      },

      /* ---- ennemis et arène : médiums rêches ---- */
      tirEnnemi: function (t, o, g) {
        var f = 380 * vary(0.03);
        voice(t, 'sawtooth', f, f * 2.2, 0.14, 0.004, 0.16, 0.085 * g, 2000);
        burst(t, 'bandpass', 1500, 1.4, 0.004, 0.09, 0.09 * g);
        return 0.2;
      },
      arme: function (t, o, g) {                       /* une signature par type d'armement */
        var k = armeKey(o.type), i;
        if (k === 1) {                                 /* bond : un saut qui monte */
          voice(t, 'sawtooth', 200, 700, 0.09, 0.004, 0.1, 0.1 * g, 1800); burst(t, 'bandpass', 1000, 1, 0.002, 0.05, 0.1 * g); return 0.16;
        } else if (k === 2) {                          /* verrouillage : deux bips aigus serrés */
          voice(t, 'square', 1500, 1500, 0, 0.002, 0.05, 0.05 * g, 2200); voice(t + 0.09, 'square', 1500, 1500, 0, 0.002, 0.05, 0.05 * g, 2200); return 0.2;
        } else if (k === 3) {                          /* visée : un trait qui monte en tremblant */
          voice(t, 'triangle', 800, 1700, 0.28, 0.01, 0.28, 0.1 * g, 2400); voice(t, 'square', 90, 90, 0, 0.01, 0.28, 0.0, 0); return 0.32;
        } else if (k === 4) {                          /* recul : un coup sourd */
          voice(t, 'sine', 300, 80, 0.07, 0.002, 0.12, 0.17 * g, 0); burst(t, 'bandpass', 800, 0.8, 0.001, 0.07, 0.15 * g); return 0.16;
        } else if (k === 5) {                          /* mèche : des tics qui accélèrent */
          var tt = t, dd = 0.13;
          for (i = 0; i < 7; i++) { voice(tt, 'square', 1300 + i * 70, 0, 0, 0.001, 0.025, 0.05 * g, 2400); tt += dd; dd *= 0.8; }
          return tt - t + 0.05;
        } else if (k === 6) {                          /* laser qui charge */
          var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
          var oo = ctx.createOscillator(); oo.type = 'sawtooth'; oo.frequency.setValueAtTime(220, t); oo.frequency.exponentialRampToValueAtTime(1100, t + 0.5);
          var gg = ctx.createGain(); pluck(gg.gain, t, 0.3, 0.2, 0.09 * g);
          oo.connect(lp); lp.connect(gg); gg.connect(OUT); oo.start(t); oo.stop(t + 0.56); return 0.56;
        } else if (k === 7) {                          /* coupe-route : double klaxon */
          voice(t, 'square', 660, 660, 0, 0.004, 0.11, 0.06 * g, 1700); voice(t + 0.14, 'square', 880, 880, 0, 0.004, 0.14, 0.06 * g, 1700); return 0.3;
        }
        voice(t, 'sawtooth', 500, 380, 0.08, 0.003, 0.1, 0.07 * g, 1500); return 0.14;
      },
      portail: function (t, o, g) {                    /* tic du côté de l'arrivée */
        burst(t, 'bandpass', 1900, 1.4, 0.001, 0.02, 0.1 * g);
        voice(t, 'triangle', 1250, 900, 0.03, 0.001, 0.05, 0.075 * g, 0);
        return 0.08;
      },
      traqueur: function (t, o, g) {                   /* sirène sur deux notes */
        for (var i = 0; i < 4; i++) voice(t + i * 0.15, 'sawtooth', hz(i % 2 ? 81 : 74), 0, 0, 0.01, 0.14, 0.07 * g, 1900);
        return 0.65;
      },
      convoi: function (t, o, g) {                     /* klaxon */
        [0, 0.26].forEach(function (d) {
          voice(t + d, 'sawtooth', hz(62), 0, 0, 0.01, 0.2, 0.08 * g, 1500); voice(t + d, 'sawtooth', hz(69), 0, 0, 0.01, 0.2, 0.08 * g, 1500);
        });
        return 0.6;
      },
      travelling: function (t, o, g) {                 /* grondement */
        var n = noise(t, 1.0, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(220, t); lp.frequency.linearRampToValueAtTime(700, t + 0.5); lp.frequency.linearRampToValueAtTime(260, t + 1.0);
        var ng = ctx.createGain(); pluck(ng.gain, t, 0.3, 0.7, 0.24 * g);
        n.connect(lp); lp.connect(ng); ng.connect(OUT);
        voice(t, 'sawtooth', 82, 74, 0.9, 0.3, 0.7, 0.09 * g, 1700);
        burst(t, 'bandpass', 850, 0.9, 0.3, 0.7, 0.22 * g);
        return 1.1;
      },
      warning: function (t, o, g) {                    /* corne entre 1,3 et 1,8 kHz */
        for (var i = 0; i < 3; i++) {
          voice(t + i * 0.24, 'square', 1300, 1300, 0, 0.004, 0.1, 0.055 * g, 2000);
          voice(t + i * 0.24 + 0.1, 'square', 1800, 1800, 0, 0.004, 0.1, 0.055 * g, 2400);
        }
        return 0.8;
      },

      /* ---- ressources : cloches ---- */
      butin: function (t, o, g) {                      /* escalier : +1 demi-ton par ramassage dans les 1,2 s, jusqu'à +12 */
        butinStack = (t - butinLast < 1.2) ? Math.min(12, butinStack + 1) : 0; butinLast = t;
        var f = hz(74 + butinStack) * vary(0.006);
        voice(t, 'triangle', f, f, 0, 0.003, 0.14, 0.12 * g, 0);
        return 0.18;
      },
      noyau: function (t, o, g) {                      /* arpège */
        var d = run(t, 74, [0, 2, 3, 5], 0.055, 'triangle', 0.2, 0.1 * g, 3200);
        send(voice(t + 0.2, 'sine', hz(86) * 1.5, hz(86) * 1.5, 0, 0.005, 0.3, 0.03 * g, 0), MIX.revSend.sfx, 's'); return d + 0.2;
      },
      pastille: function (t, o, g) {                   /* accord ouvert */
        [74, 81, 88].forEach(function (m, i) {
          var a = voice(t + i * 0.02, 'triangle', hz(m), hz(m), 0, 0.02, 0.6, 0.1 * g, 3000);
          if (i === 2) send(a, MIX.revSend.sfx * 1.6, 's');
        });
        duck(t, MIX.duckInfo, 0.5); return 0.7;
      },

      /* ---- danger : graves saturés avec composante médium ---- */
      coupe: function (t, o, g) {
        voice(t, 'sawtooth', 300, 70, 0.2, 0.002, 0.28, 0.5 * g, 2200);
        burst(t, 'bandpass', 800, 0.8, 0.001, 0.12, 0.55 * g);
        voice(t, 'square', 520, 180, 0.12, 0.002, 0.16, 0.1 * g, 1800);
        voice(t, 'sine', 150, 50, 0.1, 0.002, 0.18, 0.07 * g, 0);
        duck(t, MIX.duckHurt, 0.3); return 0.4;
      },
      mort: function (t, o, g) {
        var v = vary(0.08), gg = ctx.createGain(); pluck(gg.gain, t, 0.003, 0.9, 0.3 * g); gg.connect(OUT);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 2; lp.connect(gg);
        [-16, 16].forEach(function (dt) {
          var oo = ctx.createOscillator(); oo.type = 'sawtooth'; oo.detune.value = dt;
          oo.frequency.setValueAtTime(330 * v, t); oo.frequency.exponentialRampToValueAtTime(42, t + 0.85);
          oo.connect(lp); oo.start(t); oo.stop(t + 0.95);
        });
        burst(t, 'bandpass', 650, 0.8, 0.001, 0.16, 0.24 * g);
        voice(t, 'sine', 120, 32, 0.6, 0.002, 0.7, 0.16 * g, 0);
        send(gg, MIX.revSend.sfx * 1.4, 's'); duck(t, MIX.duckBig, 0.8); return 1.0;
      },
      gameover: function (t, o, g) {                   /* jingle de quatre notes, posé sur le temps */
        var t0 = gridApi.snap(t), bd = gridApi.bd();
        [[74, 0], [69, 1], [67, 2], [62, 3]].forEach(function (c, i) {
          var f = hz(c[0]);
          voice(t0 + i * bd, 'sawtooth', f, f * 0.99, 0, 0.005, i === 3 ? 0.9 : 0.3, 0.12 * g, 1600);
          voice(t0 + i * bd, 'triangle', f, f, 0, 0.005, i === 3 ? 0.9 : 0.3, 0.1 * g, 0);
        });
        burst(t0 + 3 * bd, 'bandpass', 700, 0.7, 0.002, 0.2, 0.1 * g);
        duck(t, MIX.duckBig, 1.2); return 4 * bd + 0.9;
      },
      battement: function (t, o, g) {                  /* lub-dub */
        heartbeat(t, 0.5 * g, OUT); return 0.35;
      },

      /* ---- récompenses ---- */
      palier: function (t, o, g) {
        var d = run(t, 74, [0, 3, 5], 0.07, 'triangle', 0.2, 0.13 * g, 3000);
        run(t, 74, [0, 3, 5], 0.07, 'square', 0.1, 0.03 * g, 2400); return d;
      },
      levelup: function (t, o, g) {
        var d = run(t, 74, [0, 1, 2, 3, 4, 5], 0.06, 'triangle', 0.22, 0.12 * g, 3000);
        send(voice(t + 0.36, 'triangle', hz(86), hz(86), 0, 0.005, 0.6, 0.12 * g, 3000), MIX.revSend.sfx * 1.5, 's');
        sweepNoise(t, 1200, 3000, 1.2, 0.5, 0.05 * g, 0.1); duck(t, MIX.duckInfo, 0.6); return d + 0.6;
      },
      carte: function (t, o, g) {                      /* ouverture */
        sweepNoise(t, 400, 2600, 1.1, 0.26, 0.15 * g, 0.03);
        send(voice(t + 0.2, 'triangle', hz(86), hz(86), 0, 0.004, 0.4, 0.12 * g, 3200), MIX.revSend.sfx * 1.4, 's'); return 0.6;
      },
      choix: function (t, o, g) {
        burst(t, 'bandpass', 1800, 1.2, 0.001, 0.02, 0.08 * g);
        voice(t, 'triangle', hz(76), hz(76), 0, 0.003, 0.14, 0.12 * g, 3000); return 0.2;
      },
      vague: function (t, o, g) {                      /* fin de vague : quatre notes */
        var d = run(t, 74, [0, 0, 3, 5], 0.1, 'triangle', 0.26, 0.13 * g, 3000);
        run(t, 74, [0, 0, 3, 5], 0.1, 'sawtooth', 0.2, 0.03 * g, 1800); duck(t, MIX.duckInfo, 0.6); return d + 0.1;
      },
      defi: function (t, o, g) {                       /* arpège MAJEUR sur la tonique : la réussite */
        var base = 74;
        [[0, 0, 0.1], [4, 0.09, 0.1], [7, 0.18, 0.1], [12, 0.27, 0.42]].forEach(function (c) {
          var f = hz(base + c[0]);
          var a = voice(t + c[1], 'triangle', f, f, 0, 0.004, c[2], 0.185 * g, 0);
          voice(t + c[1], 'square', f, f, 0, 0.004, c[2], 0.038 * g, 2200);
          send(a, MIX.revSend.sfx * 1.4, 's');
        });
        duck(t, MIX.duckInfo, 0.6); return 0.75;
      },
      defiRate: function (t, o, g) {                   /* deux notes qui retombent */
        voice(t, 'triangle', hz(79), hz(79), 0, 0.005, 0.2, 0.14 * g, 3000);
        voice(t, 'square', hz(79), hz(79), 0, 0.005, 0.2, 0.03 * g, 2400);
        voice(t + 0.17, 'triangle', hz(72), hz(70), 0.2, 0.005, 0.3, 0.14 * g, 3000);
        voice(t + 0.17, 'square', hz(72), hz(70), 0.2, 0.005, 0.3, 0.03 * g, 2400); return 0.5;
      },
      record: function (t, o, g) {                     /* fanfare */
        var d = run(t, 74, [0, 2, 3, 5, 7, 8], 0.085, 'triangle', 0.26, 0.14 * g, 3200);
        run(t, 74, [0, 2, 3, 5, 7, 8], 0.085, 'sawtooth', 0.2, 0.035 * g, 2000);
        [86, 93, 98].forEach(function (m) { send(voice(t + 0.52, 'triangle', hz(m), hz(m), 0, 0.01, 0.8, 0.08 * g, 3200), MIX.revSend.sfx * 1.5, 's'); });
        duck(t, MIX.duckInfo, 0.8); return d + 0.9;
      },

      /* ---- interface ---- */
      bip: function (t, o, g) {                        /* texte : carré à 12,5 %, 30 ms */
        var oo = ctx.createOscillator(); oo.setPeriodicWave(WAVE125); oo.frequency.value = 1180 * vary(0.02);
        var gg = ctx.createGain(); oo.connect(gg); gg.connect(OUT);
        pluck(gg.gain, t, 0.001, 0.03, 0.045 * g);
        oo.start(t); oo.stop(t + 0.06); return 0.05;
      },
      clic: function (t, o, g) {
        burst(t, 'bandpass', 2000, 1.2, 0.001, 0.012, 0.09 * g);
        voice(t, 'sine', 900, 700, 0.02, 0.001, 0.025, 0.05 * g, 0); return 0.05;
      },

      /* ---- noms de la démo, acceptés pendant la transition ---- */
      degat: function (t, o, g) {
        var v = vary(0.1), gg = ctx.createGain(); pluck(gg.gain, t, 0.003, 0.36, 0.27 * g); gg.connect(OUT);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 2; lp.connect(gg);
        [-14, 14].forEach(function (dt) {
          var oo = ctx.createOscillator(); oo.type = 'sawtooth'; oo.detune.value = dt;
          oo.frequency.setValueAtTime(290 * v, t); oo.frequency.exponentialRampToValueAtTime(80 * v, t + 0.34);
          oo.connect(lp); oo.start(t); oo.stop(t + 0.42);
        });
        burst(t, 'bandpass', 800, 1, 0.001, 0.12, 0.32 * g);
        send(gg, MIX.revSend.sfx * 1.2, 's'); duck(t, MIX.duckHurt, 0.45);
        return 0.42;
      },
      intro: function (t, o, g) {
        var n = noise(t, 2.0, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.6;
        lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(3600, t + 1.9);
        var gg = ctx.createGain();
        gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.30 * g, t + 1.88);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
        n.connect(lp); lp.connect(gg); gg.connect(OUT);
        var dr = ctx.createOscillator(); dr.type = 'sawtooth';
        dr.frequency.setValueAtTime(hz(ROOT_BASS - 12), t); dr.frequency.exponentialRampToValueAtTime(hz(ROOT_BASS), t + 1.9);
        var dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 420;
        var dg = ctx.createGain();
        dg.gain.setValueAtTime(0.0001, t); dg.gain.linearRampToValueAtTime(0.2 * g, t + 1.85);
        dg.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
        dr.connect(dl); dl.connect(dg); dg.connect(OUT); dr.start(t); dr.stop(t + 2.4);
        send(gg, MIX.revSend.sfx * 1.6, 's');
        SFX.bigkill(t + 1.95, {}, g);
        return 3.4;
      },
      neutre: function (t, o, g) {                     /* un nom inconnu : une note brève et douce de la gamme */
        var f = hz(keyNote(74, 1 + ((srnd() * 3) | 0)));
        voice(t, 'triangle', f, f * 0.94, 0.08, 0.003, 0.09, 0.09 * g, 2400);
        return 0.12;
      }
    };
    /* gardes : fusion (s), plafond de voix, usure.  basse : coupé quand le budget de nœuds est dépassé */
    var SCFG = {
      tir: { win: 0.035, cap: 3, usure: 0.30, basse: 2 },
      salve: { win: 0.12, cap: 2, usure: 0.20, basse: 1 },
      kill: { nofuse: true, cap: 99, usure: 0 },
      bigkill: { win: 0.12, cap: 2, usure: 0.50 },
      colosseMort: { win: 0.5, cap: 1, usure: 0 },
      degat: { win: 0.08, cap: 2, usure: 0.40 },
      mort: { win: 0.4, cap: 1, usure: 0 }, coupe: { win: 0.1, cap: 2, usure: 0.3 }, crash: { win: 0.1, cap: 2, usure: 0.4 },
      explosion: { win: 0.06, cap: 4, usure: 0.4 },
      impact: { win: 0.03, cap: 3, usure: 0.35, basse: 1 }, impactBoss: { win: 0.06, cap: 2, usure: 0.4, basse: 1 },
      ricochet: { win: 0.05, cap: 2, usure: 0.4, basse: 1 },
      tirEnnemi: { win: 0.05, cap: 3, usure: 0.4, basse: 1 },
      butin: { nofuse: true, cap: 4, usure: 0.2, basse: 1 },
      bip: { win: 0.03, cap: 2, usure: 0.2, basse: 1 }, clic: { win: 0.04, cap: 2, usure: 0.2, basse: 1 },
      intro: { win: 0.40, cap: 2, usure: 0 }, defi: { win: 0.30, cap: 1, usure: 0 },
      neutre: { win: 0.05, cap: 2, usure: 0.30, basse: 1 }
    };
    var DEFCFG = { win: 0.04, cap: 3, usure: 0.3 };
    var sst = {}, jr = { joues: {}, demandes: {}, fusionnes: 0, plafonnes: 0, budget: 0, inconnus: 0 };
    function quantPan(p) { p = +p || 0; return Math.round(clamp(p, -1, 1) * 3) / 3; }   /* sept positions */
    function play(name, t, o) {
      o = o || {};
      var known = has(SFX, name), key = known ? name : 'neutre';
      jr.demandes[name] = (jr.demandes[name] || 0) + 1;
      if (!known) jr.inconnus++;
      var c = SCFG[key] || DEFCFG, s = sst[key] || (sst[key] = { last: -1e9, dens: 0, ends: [] });
      if (!c.nofuse && t - s.last < c.win) { jr.fusionnes++; return; }
      if (c.basse) {                                    /* le budget de nœuds : tir a sa réserve, les autres lâchent d'abord */
        /* le budget compte les nœuds des sons seuls. Avec la piste, la musique n'en crée que 3 à 5 par seconde ; sans piste (repli),
           le moteur génératif en crée 55 à 61 : les sons y reçoivent alors une part plus petite, mais réelle, au lieu d'être coupés. */
        var cap = (nodesLast(1) - sfxNodesLast(1)) > 30 ? 40 : NODE_BUDGET - 6;
        var lim = key === 'tir' ? cap : cap - 8;
        if (sfxNodesLast(1) > lim) { jr.budget++; return; }
      }
      s.dens = s.dens * Math.exp(-(t - s.last)) + 1; s.last = t;
      var live = [];
      for (var i = 0; i < s.ends.length; i++) if (s.ends[i] > t) live.push(s.ends[i]);
      s.ends = live;
      if (live.length >= c.cap) { jr.plafonnes++; return; }
      var g = 1 / Math.sqrt(1 + c.usure * (s.dens - 1));
      var pn = quantPan(o.pan);
      if (pn !== 0) { var pp = ctx.createStereoPanner(); pp.pan.value = pn; pp.connect(sfxBus); OUT = pp; } else OUT = sfxBus;
      var len = 0.2;
      inSfx = true;
      try { len = SFX[key](t, o, g); } finally { OUT = sfxBus; inSfx = false; }
      s.ends.push(t + (len || 0.2));
      jr.joues[key] = (jr.joues[key] || 0) + 1;
    }

    /* ---- la voix de la machine (P3) : source en dent de scie à 100 Hz, trois filtres passe-bande par voyelle ---- */
    var VOY = { a: [800, 1150, 2900], e: [450, 1900, 2600], i: [300, 2200, 2900], o: [500, 900, 2500], u: [350, 700, 2500], eu: [450, 1400, 2400] };
    var MOTS = {
      READY: [['r', 'e'], ['d', 'i']], GO: [['g', 'o']], WARNING: [['w', 'o'], ['n', 'i'], ['ng', 'i']],
      DANGER: [['d', 'e'], ['nj', 'eu']], EXCELLENT: [['e', 'e'], ['ks', 'e'], ['l', 'a'], ['nt', 'e']], GAMEOVER: [['g', 'e'], ['m', 'o'], ['v', 'eu']]
    };
    var lastVoix = -9;
    function say(mot, t) {
      var syl = MOTS[mot]; if (!syl) return false;
      if (t - lastVoix < 4) return false;               /* un mot toutes les 4 s au plus */
      lastVoix = t;
      var t0 = gridApi.snap(t), x = t0;
      syl.forEach(function (s) {
        var fo = VOY[s[1]], d = 0.17;
        if (s[0] !== 'g' && s[0] !== 'd' && s[0] !== 'w' && s[0] !== 'm' && s[0] !== 'v' && s[0] !== 'l' && s[0] !== 'r') burst(x, 'bandpass', 3000, 2, 0.003, 0.05, 0.05, sfxBus);   /* consonne */
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, x); o.frequency.linearRampToValueAtTime(92, x + d);
        var mix = ctx.createGain(); pluck(mix.gain, x, 0.015, d, 0.20); mix.connect(sfxBus);
        fo.forEach(function (f, i) {
          var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 7;
          var gg = ctx.createGain(); gg.gain.value = i === 0 ? 1 : i === 1 ? 0.6 : 0.3;
          o.connect(bp); bp.connect(gg); gg.connect(mix);
        });
        o.start(x); o.stop(x + d + 0.03);
        x += d;
      });
      return true;
    }

    /* ================================ anti-répétition ================================ */
    var mem = {};
    function pick(slot, pool) {
      var m = mem[slot] || (mem[slot] = { v: -1, n: 0 });
      for (var k = 0; k < 16; k++) {
        var i = (mrnd() * pool.length) | 0; if (i >= pool.length) i = pool.length - 1;
        if (i === m.v && m.n >= 2) continue;               /* déjà deux fois : refusé */
        if (i === m.v) m.n++; else { m.v = i; m.n = 1; }
        return pool[i];
      }
      var j = (m.v + 1) % pool.length; m.v = j; m.n = 1; return pool[j];
    }
    var barMem = { sig: '', n: 0 }, barSigs = [];
    function barGuard(sig) {                 /* vrai s'il faut relancer un tirage */
      if (sig === barMem.sig) { if (barMem.n >= 2) return true; barMem.n++; return false; }
      barMem.sig = sig; barMem.n = 1; return false;
    }

    /* ================================ état de composition ================================ */
    var cur = 0, step = 0, bar = 0;
    var tTarget = 0, bpm = BPM, stepDur = 60 / BPM / 4, barDurCur = stepDur * 16, barT0 = 0;
    var ph = null, bp = null;
    var overMode = false;                    /* vrai : la piste joue, seules les couches de dessus sonnent */
    var onDrum = false, onLead = false, onPerc = false, onSpark = false, onInv = false, onHeart = false;
    var invWant = false, dangerV = 0, sirenWant = false;
    var wantNom = 'titre', wantSet = false;
    var anchors = [];                        /* jointures à venir : {t, over, dur} ; le moteur s'y recale */
    var hooks = {};                          /* appels vers la couche publique (morceaux longs) : section(nom) */
    var heartNext = 0, leadStep = 0, sparkStep = 0, invStep = 0;
    var layerLog = [], itemLog = [], percJust = false;   /* entrées et sorties de couche : {l, on, t} (preuve G-31) ; tous les items de la piste */
    var accLog = [];                         /* accents : {nom, t} */

    function effT() {                        /* la tension du repli : la section la remonte ou la plafonne */
      var p = PROFIL[wantNom] || PROFIL.jeu, t = tTarget;
      if (p.t >= 0) t = p.t;
      if (p.cap != null) t = Math.min(t, p.cap);
      if (p.floor != null) t = Math.max(t, p.floor);
      return t;
    }
    function newPhrase() {
      ph = {
        grid: pick('grid', GRIDS), rate: pick('rate', HARM_RATE), bass: pick('bass', BASS), bassNorm: 1,
        kick: pick('kick', KICK), snare: pick('snare', SNARE), hat: pick('hat', HAT),
        shape: pick('shape', LEAD_SHAPE), rhy: pick('rhy', LEAD_RHY), voice: pick('voice', VOICING),
        fill: pick('fill', FILLS), brk: pick('brk', BREAKS),
        spark: pick('spark', SPARK_SEQ), sparkMask: pick('sparkMask', SPARK_MASK), inv: pick('inv', INV_SEQ)
      };
      ph.bassNorm = BASS_NORM[BASS.indexOf(ph.bass)];
    }
    function setLayer(name, on, t) {
      var cur_ = name === 'perc' ? onPerc : name === 'spark' ? onSpark : name === 'inv' ? onInv : name === 'heart' ? onHeart : name === 'drum' ? onDrum : onLead;
      if (cur_ !== on) layerLog.push({ l: name, on: on, t: t });
    }
    function newBar() {
      var inPhrase = bar % 4;
      if (inPhrase === 0 || !ph) newPhrase();
      var tries = 0, sig;
      do {
        bp = {
          hatMut: pick('hatMut', HAT_MUT), ghost: pick('ghost', BASS_GHOST), leadOct: pick('leadOct', LEAD_OCT),
          openHat: mrnd() < 0.22 + 0.2 * tTarget, clapOn: tTarget > 0.5 && mrnd() < 0.5
        };
        sig = ph.bass + ph.kick + ph.snare + ph.hat + ph.rhy + bp.hatMut + bp.ghost + bp.leadOct +
          (GRIDS.indexOf(ph.grid)) + inPhrase + (bp.openHat ? 'o' : '') + (bp.clapOn ? 'c' : '') + (overMode ? 'P' : 'R') +
          (onPerc ? 'p' : '') + (onSpark ? 's' : '') + (onInv ? 'i' : '');
      } while (barGuard(sig) && ++tries < 6);
      barSigs.push(sig);
      if (!offline && barSigs.length > 256) barSigs.shift();
      var ci = ph.rate === 2 ? ((bar >> 1) % 4) : (bar % 4);
      bp.chord = ph.grid[ci];
      bp.third = bp.chord[1] ? 4 : 3;
      bp.fill = (inPhrase === 3) ? ph.fill : 'none';
      bp.brk = (inPhrase === 3) ? ph.brk : 'none';
      bp.refrain = (inPhrase < 2);
      /* couches : une seule fois par mesure, jamais en cours de mesure (G-31) */
      tSmooth = overMode ? tTarget : effT();
      var ts = tSmooth, bd = barDurCur;
      rampTo(musicLevel.gain, overMode ? MIX.music + 0.5 * MIX.musicTension : MIX.music + MIX.musicTension * ts, cur, bd);
      dangerBar = dangerV;
      var cutL = mzCoupe(cur);        /* un morceau long sonne : PERCU et ÉTINCELLES (au tempo de la piste) se taisent, les sons, la mort et le BATTEMENT restent */
      if (overMode) {
        var nPerc = !cutL && ts >= (onPerc ? 0.55 : 0.60), nSpark = !cutL && ts >= (onSpark ? 0.75 : 0.80);
        var nHeart = dangerV >= (onHeart ? 0.12 : 0.2);
        setLayer('perc', nPerc, cur); setLayer('spark', nSpark, cur); setLayer('heart', nHeart, cur);
        if (nPerc && !onPerc) percJust = true;
        if (nHeart && !onHeart) heartNext = cur;
        onPerc = nPerc; onSpark = nSpark; onHeart = nHeart; onDrum = false; onLead = false;
        ['pad', 'bass', 'drum', 'lead'].forEach(function (k) { rampTo(LAY[k].gain, 0, cur, 0.30); });
      } else {
        var nDrum = ts >= (onDrum ? 0.14 : 0.20), nLead = true;     /* le lead est toujours là, plus ou moins fort */
        var nSpark2 = !cutL && ts >= (onSpark ? 0.75 : 0.80), nHeart2 = dangerV >= (onHeart ? 0.12 : 0.2);
        setLayer('drum', nDrum, cur); setLayer('lead', nLead, cur); setLayer('spark', nSpark2, cur); setLayer('heart', nHeart2, cur);
        if (nHeart2 && !onHeart) heartNext = cur;
        onDrum = nDrum; onLead = nLead; onSpark = nSpark2; onHeart = nHeart2; onPerc = false;
        rampTo(LAY.drum.gain, onDrum ? MIX.drum * (0.7 + 0.3 * ts) : 0, cur, bd);
        rampTo(LAY.lead.gain, MIX.lead * (0.75 + 0.5 * ts), cur, bd);
        rampTo(LAY.pad.gain, MIX.pad * (1 - 0.1 * ts), cur, bd);
        rampTo(LAY.bass.gain, MIX.bass * (0.85 + 0.15 * ts), cur, bd);
        leadDelay.delayTime.setTargetAtTime(stepDur * 3, cur, 0.1);
        padFilter.frequency.setTargetAtTime(padBase + 900 * ts, cur, bd * 0.4);
        padSet(ROOT_PAD + bp.chord[0], bp.third, ph.voice, cur);
      }
      var nInv = invWant;
      setLayer('inv', nInv, cur); onInv = nInv;
      rampTo(LAY.perc.gain, MIX.perc, cur, 0.01);
      rampTo(LAY.spark.gain, MIX.spark, cur, 0.01);
      rampTo(LAY.inv.gain, MIX.inv, cur, 0.01);
      rampTo(LAY.heart.gain, MIX.heart * clamp(0.35 + dangerV, 0, 1.3), cur, 0.05);
      /* le passe-bas et le gain de la piste suivent la tension ; le danger ferme à 2 kHz */
      trackTone();
      sirenWant = !!(PROFIL[wantNom] && PROFIL[wantNom].siren) && !cutL;
    }
    var dangerBar = 0;
    function wrapRoot(r, lo) { while (r >= lo + 12) r -= 12; while (r < lo) r += 12; return r; }

    /* ---- un pas de double croche ---- */
    function doStep() {
      var s = step, t = cur;
      if (overMode) stepOver(s, t); else stepFull(s, t);
      /* ÉTINCELLES, INVERSION, sirène, battement : communs aux deux modes */
      if (s === 0) { if (onSpark) toneBar(t, 'spark'); if (onInv) toneBar(t, 'inv'); }
      if (sirenWant && s === 0) siren(t, barDurCur / 2);
      if (sirenWant && s === 8) siren(t, barDurCur / 2);
      if (onHeart) {
        while (heartNext < t + stepDur * 0.999) {
          if (heartNext >= t - 1e-6) heartbeat(heartNext, 1);
          heartNext += dangerV >= 0.85 ? 0.5 : dangerV >= 0.55 ? 0.75 : 1.0;
        }
      }
      cur += stepDur;
      step++;
      if (step >= 16) { step = 0; bar++; barT0 = cur; newBar(); }
    }
    /* PERCU : charleston en doubles croches et clap, réduits à la grosse caisse en danger. Toute la mesure est
       synthétisée dans UN tampon (deux nœuds par mesure, pas deux par charleston : le budget de nœuds du § 5.8). */
    function stepOver(s, t) {
      if (s === 0 && onPerc) percBar(t);
    }
    function percBar(t) {
      var bd = barDurCur, n = Math.ceil((bd + 0.3) * sr), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      var h = hatBuf.getChannelData(0), z = noiseBuf.getChannelData(0), hl = h.length, s, i;
      var reduce = dangerV > 0.5, first = percJust; percJust = false;
      function addHat(at, len, amp) { var o = Math.floor(at * sr), off = (mrnd() * (hl - len - 4)) | 0, tau = len / 4; for (var k = 0; k < len && o + k < n; k++) d[o + k] += h[off + k] * amp * Math.exp(-k / tau); }
      function addKick(at, amp) {
        var o = Math.floor(at * sr), ph_ = 0, len = Math.floor(0.26 * sr);
        for (var k = 0; k < len && o + k < n; k++) { var tt = k / sr, f = 42 + 108 * Math.exp(-tt / 0.03); ph_ += 2 * Math.PI * f / sr; d[o + k] += Math.sin(ph_) * amp * Math.exp(-tt / 0.07); }
        var cl = Math.floor(0.012 * sr); for (var k2 = 0; k2 < cl && o + k2 < n; k2++) d[o + k2] += h[k2 + 100] * amp * 1.4 * Math.exp(-k2 / (cl / 3));
      }
      function addClap(at, amp) {                                   /* trois claquements dans une bande médium, le dernier plus long */
        var w = 2 * Math.PI * 1150 / sr, al = Math.sin(w) / 2, a0 = 1 + al, b0 = al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
        var y1 = 0, y2 = 0, x1 = 0, x2 = 0, o0 = Math.floor(at * sr), off = (mrnd() * (z.length - 9000)) | 0;
        for (var c = 0; c < 3; c++) {
          var oc = o0 + Math.floor(c * 0.011 * sr), len = Math.floor((c === 2 ? 0.13 : 0.016) * sr);
          for (var k = 0; k < len && oc + k < n; k++) {
            var x = z[off + c * 1000 + k], y = b0 * (x - x2) - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
            d[oc + k] += y * amp * 2.4 * Math.exp(-k / (len / (c === 2 ? 3.2 : 2.5)));
          }
        }
      }
      if (first) { addHat(0, Math.floor(0.19 * sr), 0.9); addClap(0, 0.7); }   /* l'entrée de la couche tombe sur la barre */
      for (s = 0; s < 16; s++) {
        var at = s * stepDur;
        if (reduce) { if (s % 4 === 0) addKick(at, 0.9); continue; }
        var hm = ph.hat.charCodeAt(s) === 49;
        if (bp.hatMut === 'sixteen' || tSmooth > 0.8) hm = true;
        if (bp.hatMut === 'drop' && (s === 4 || s === 12)) hm = false;
        if (hm && !(first && s === 0)) addHat(at, Math.floor((bp.openHat && s === 10 ? 0.19 : 0.036) * sr), bp.openHat && s === 10 ? 0.5 : 0.85);
        if ((s === 4 || s === 12) && bp.clapOn) addClap(at, 0.8);
      }
      var src = ctx.createBufferSource(); src.buffer = b;
      var g = ctx.createGain(); g.gain.value = 1;
      src.connect(g); g.connect(LAY.perc); src.start(t);
    }
    function stepFull(s, t) {                 /* le repli : un arrangement complet à quatre couches */
      var hushed = false;
      if (bp.brk === 'beat' && s >= 12) hushed = true;
      if (bp.brk === 'twobeat' && s >= 8) hushed = true;
      if (bp.brk === 'stab' && s >= 13) hushed = true;
      if (bp.brk === 'stab' && s === 12) { kick(t, 1); snare(t, 0.9); }
      var root = wrapRoot(ROOT_BASS + bp.chord[0], 36);   /* D2..C#3 */
      if (!onDrum && s % 2 === 0) hat(t, 1.0, false, LAY.perc);   /* le chuintement du repli : l'air, même sans batterie */
      if (!hushed) {
        var c = ph.bass.charCodeAt(s) - 48;
        if (c >= 1 && c <= 4) {
          var add = c === 2 ? 12 : c === 3 ? 7 : c === 4 ? 10 : 0;
          bassNote(t, root + add, stepDur * (c === 1 ? 2.6 : 1.5), (0.85 + 0.15 * tSmooth) * ph.bassNorm);
        } else if (bp.ghost === 'off8' && (s === 6 || s === 14)) bassNote(t, root + 12, stepDur * 0.8, 0.4);
        else if (bp.ghost === 'slide' && s === 15) bassNote(t, root + bp.third, stepDur, 0.5);
      }
      if (onDrum && !hushed) {
        var fillZone = bp.fill !== 'none' && s >= 12;
        if (!fillZone) {
          if (ph.kick.charCodeAt(s) === 49) kick(t, 1);
          if (ph.snare.charCodeAt(s) === 49) { snare(t, 0.95); if (bp.clapOn) clap(t, 0.8); }
          var hm = ph.hat.charCodeAt(s) === 49;
          if (bp.hatMut === 'sixteen' && tSmooth > 0.45) hm = (s % 2 === 0) || hm;
          if (bp.hatMut === 'drop' && (s === 4 || s === 12)) hm = false;
          if (bp.hatMut === 'tail' && s >= 14) hm = true;
          if (hm) hat(t, 0.9, bp.openHat && s === 10);
        } else {
          if (bp.fill === 'tom') tom(t, 0.9, 230 - (s - 12) * 38);
          else if (bp.fill === 'snare') snare(t, 0.6 + (s - 12) * 0.13);
          else if (bp.fill === 'kick16') { kick(t, 0.85); if (s === 15) snare(t, 1); }
        }
      }
      if (onLead && !hushed) {
        if (bp.refrain) {                                  /* le refrain composé à la main : huit notes sur deux mesures */
          var pos = (bar % 2) * 16 + s;
          for (var r = 0; r < REFRAIN.length; r++) if (REFRAIN[r][0] === pos) leadNote(t, REFRAIN[r][1], stepDur * 2.2, 0.95);
        } else if (ph.rhy.charCodeAt(s) === 49) {
          var tones = [0, bp.third, 7, 12];
          var idx = ph.shape[(leadStep++) % ph.shape.length];
          var m = wrapRoot(ROOT_LEAD + bp.chord[0], 57) + tones[Math.min(idx, 3)] + (bp.leadOct < 0 ? 0 : 0);
          leadNote(t, m, stepDur * 1.6, 0.75 + 0.25 * tSmooth);
        }
      }
    }

    /* ÉTINCELLES (arpège carré à 25 %) et INVERSION (arpège rapide en dents de scie) : toute la mesure est écrite
       dans UN tampon par lecture d'une table à bande limitée (pas de nœud par note : budget de nœuds du § 5.8) */
    var TAB = (function () {
      var n = 1024, pulse = new Float32Array(n), saw = new Float32Array(n);
      for (var h = 1; h <= 12; h++) for (var i = 0; i < n; i++) {
        var a = 2 * Math.PI * h * i / n;
        pulse[i] += (2 / (h * Math.PI)) * Math.sin(h * Math.PI * 0.25) * Math.cos(a - h * Math.PI * 0.25);
        saw[i] += Math.sin(a) / h * 0.6;
      }
      return { n: n, spark: pulse, inv: saw };
    })();
    function toneBar(t, kind) {
      var bd = barDurCur, n = Math.ceil((bd + 0.4) * sr), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), tab = TAB[kind], N_ = TAB.n;
      var isSpark = kind === 'spark', sq = isSpark ? ph.spark : ph.inv, st = isSpark ? sparkStep : invStep, any = false;
      for (var s = 0; s < 16; s++) {
        if (isSpark && ph.sparkMask.charCodeAt(s) !== 49) continue;
        var idx = sq[(st++) % sq.length], midi = isSpark ? keyNote(74, idx) : keyNote(74, idx + 1);
        var o = Math.floor(s * stepDur * sr), len = Math.floor((isSpark ? 1.5 : 1.15) * stepDur * sr + 0.05 * sr);
        var inc = hz(midi) / sr * N_, ph_ = 0, att = Math.floor(0.003 * sr), tau = (len / sr) / 5 * sr, amp = isSpark ? 0.9 : 0.8;
        for (var k = 0; k < len && o + k < n; k++) {
          var ip = ph_ | 0, fr = ph_ - ip, v = tab[ip & (N_ - 1)] * (1 - fr) + tab[(ip + 1) & (N_ - 1)] * fr;
          d[o + k] += v * amp * (k < att ? k / att : Math.exp(-(k - att) / tau));
          ph_ += inc; if (ph_ >= N_) ph_ -= N_;
        }
        any = true;
      }
      if (isSpark) sparkStep = st; else invStep = st;
      if (!any) return;
      var src = ctx.createBufferSource(); src.buffer = b;
      var g = ctx.createGain(); g.gain.value = 1;
      src.connect(g); g.connect(isSpark ? LAY.spark : LAY.inv); src.start(t);
    }

    /* ---- ordonnanceur ---- */
    var running = false, begun = false;
    function doAnchor(a) {
      cur = a.t; step = 0; bar++;
      barDurCur = a.dur; stepDur = a.dur / 16; barT0 = a.t; overMode = a.over;
      newBar();
    }
    function schedUntil(horizon) {
      mzAncres(horizon);
      trackPump(horizon);
      var guard = 0;
      while (cur < horizon && guard++ < 20000) {
        var a = anchors[0];
        if (a && cur >= a.t - 0.0004) { anchors.shift(); doAnchor(a); continue; }
        if (a && cur + stepDur * 0.55 > a.t) { cur = a.t; continue; }   /* ne pas déborder sur la jointure */
        doStep();
      }
    }
    function resync(t) {
      var now = ctx.currentTime;
      ['pad', 'bass', 'drum', 'lead'].forEach(function (k) { hold(LAY[k].gain, now); });
      anchors.length = 0; overMode = false;
      trackLost();                                 /* la piste a pu être doublée par l'horloge : on se réengage */
      M.G.forEach(function (sg) { sg.ia = null; });   /* un morceau long tient l'antenne : ses ancres sont reposées, et le repli reste muet */
      if (mzCoupe(Math.max(t, now))) overMode = true;
      cur = Math.max(t, now + 0.02); step = 0; bar++; barT0 = cur;
      newBar();
    }
    function startAt(t) {
      if (!begun) { begun = true; cur = t; step = 0; bar = 0; barT0 = t; leadStep = 0; heartNext = t; newBar(); }
      else resync(t);
      running = true;
    }

    /* ================================ la piste : le séquenceur horizontal ================================ */
    var P = null;                              /* piste.json */
    var T = {
      bufs: [], offs: [], suspect: [], decOff: 0, items: [], last: null, tNext: 0, mode: 'off',
      fam: null, want: null, pos: {}, recent: [], loopI: 0, introPlayed: false,
      cut: false, afterDeath: false, deathBloc: -1, deathAt: -1e9, resumeReq: false,
      alertSpec: null, proofAt: 0, proofDone: true, failed: 0, FAMS: {}, engagedOnce: false
    };
    var trackTap = null;
    function trackTone() {
      /* passe-bas : 2,5 kHz à la tension 0,15 (VAGUE 1), 18 kHz à partir de 0,6, en échelle logarithmique ;
         gain : de −7,2 dB à 0,15 à 0 dB à partir de 0,6 (le plan disait −3 dB : mesuré au téléphone, il ne donne que
         2 dB d'écart calme -> chaos, et le tableau du mixage exige 6). La piste n'est JAMAIS accélérée. */
      var u = clamp((tTarget - 0.15) / 0.45, 0, 1);
      var f = 2500 * Math.pow(18000 / 2500, u);
      var sp = PROFIL[wantNom];
      if (dangerV > 0.5) f = Math.min(f, 2000 + (1 - dangerV) * 8000);
      if (invWant) f = Math.max(f, 14000);
      f = Math.min(f, OPEN);
      var db = -7.2 * (1 - u);      /* mesuré : −3 dB ne donnait que 2 dB d'écart au téléphone ; le tableau du mixage exige +6 dB */
      var gl = MIX.track * Math.pow(10, db / 20);
      var now = ctx.currentTime;
      trackLP.frequency.cancelScheduledValues(now); trackLP.frequency.setTargetAtTime(f, now, 0.08);
      trackLP2.frequency.cancelScheduledValues(now); trackLP2.frequency.setTargetAtTime(f, now, 0.08);
      trackLevel.gain.cancelScheduledValues(now); trackLevel.gain.setTargetAtTime(gl, now, 0.08);
      /* l'ALERTE ferme tout à 300 Hz pour la sirène ; sous un morceau long, cela étoufferait « Warning, Titan approaching » */
      var spl = sp && sp.lp ? sp.lp : OPEN;
      if (M.hold && wantNom === 'alerte') spl = OPEN;
      secLP.frequency.cancelScheduledValues(now); secLP.frequency.setTargetAtTime(spl, now, 0.05);
    }
    function setPiste(p) {
      P = p;
      var F = T.FAMS = {};
      var idx = { INTRO: 'intro', PLATEAU: 'plateau', RESPIRATION: 'respiration', RETOUR: 'retour', OUTRO: 'outro' };
      p.blocs.forEach(function (b, i) {
        var f = idx[b.section]; if (!f) return;
        var o = F[f] || (F[f] = { order: [], full: [] });
        o.order.push(i); if (!b.court) o.full.push(i);
      });
      if (F.intro) F.intro.loopFrom = 8 * (p.dureeTemps || 60 / BPM);                 /* la boucle reprend à la mesure 3 */
      if (F.outro) F.outro.loopFrom = 16 * (p.dureeTemps || 60 / BPM);                /* et l'OUTRO bouclé repart de la mesure 158 */
      if (F.plateau) F.plateau.rand = F.plateau.full;
      if (F.respiration) F.respiration.rand = F.respiration.full;
      if (F.retour) { F.retour.loop = F.retour.order.slice(4, 6); F.retour.order = F.retour.order.slice(0, 4); }
      if (p.bpm) { bpm = p.bpm; }
    }
    function measureOffset(i, buf) {
      /* décalage du décodeur : l'attaque la plus forte du début du coeur, comparée à celle relevée sur la source */
      var b = P.blocs[i], sr_ = buf.sampleRate, d0 = buf.getChannelData(0), d1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : d0;
      var w = Math.round(0.003 * sr_), h = Math.round(0.001 * sr_), best = -1, bi = 0, prev = 0;
      var marge = P.attaqueMarge || 0.07, win = P.attaqueFenetre || [0, 0.3];
      var a = Math.max(0, Math.round((b.coeurDeb + win[0] - marge) * sr_)), z = Math.min(buf.length - w, Math.round((b.coeurDeb + win[1] + marge) * sr_));
      for (var k = a; k < z; k += h) {
        var e = 0; for (var j = 0; j < w; j += 2) { var v = (d0[k + j] + d1[k + j]) * 0.5; e += v * v; }
        var dd = e - prev; prev = e;
        if (k > a && dd > best) { best = dd; bi = k; }
      }
      var found = bi / sr_ - b.coeurDeb, off = found - b.attaque;
      if (Math.abs(off) > 0.06) { T.suspect[i] = off; return 0; }
      T.suspect[i] = 0; return off;
    }
    /* Le retard du décodeur est une propriété du décodeur et du fichier, la même pour tous les blocs (même encodeur,
       mêmes réglages). Chaque bloc donne une mesure ; l'attaque la plus forte peut être une autre que celle de la
       source, la médiane des mesures plausibles écarte ces erreurs et s'affine à chaque bloc décodé. */
    var offSamples = [];
    function setBuffer(i, buf) {
      T.bufs[i] = buf;
      if (P && buf) {
        var o = measureOffset(i, buf);
        if (T.suspect[i] === 0) offSamples.push(o);
        if (offSamples.length) {
          var srt = offSamples.slice().sort(function (a, c) { return a - c; });
          T.decOff = srt[srt.length >> 1];
        }
      }
    }
    function dropBuffer(i) { T.bufs[i] = null; }
    function ready(i) { return !!(P && T.bufs[i]); }

    /* ================================ les morceaux longs : la grille et le fondu ================================
       Un morceau long (Suno) a SON tempo, et il dérive (voix-plus-vite accélère de 4 %) : la grille n'est donc pas un tempo
       constant mais la CARTE DES BARRES mesurée (morceaux.json, `barres`, en secondes de fichier). Chaque morceau qui sonne
       est un segment {from, to, bars, off} : off = horloge audio - horloge du fichier, relevé en continu par la couche
       publique (lecture en flux : on ne peut pas poser son départ à l'échantillon). Pendant un segment, les barres, les
       temps, le tempo publié, les accents (stinger, drop) et les couches gardées (INVERSION, BATTEMENT) suivent ce segment ;
       PERCU, ÉTINCELLES et la sirène, calées sur la piste, se taisent. */
    var M = { G: [], hold: false, layersFin: 1e12, killAt: 0, bpm: 0 };
    function mzSeg(t) {                              /* le segment dont la grille règne à l'instant t */
      for (var i = M.G.length - 1; i >= 0; i--) { var sg = M.G[i]; if (t >= sg.from - 1e-3 && t < sg.to - 1e-3) return sg; }
      return null;
    }
    function mzCoupe(t) { return !!M.sansCouches || (M.G.length > 0 && t >= M.G[0].from - 1e-3 && t < M.layersFin); }
    function segTime(sg, i) {                        /* début de la barre i (extrapolée au-delà des extrémités de la carte) */
      var B = sg.bars, n = B.length, o = sg.off();
      if (i < 0) return o + B[0] + i * (B[1] - B[0]);
      if (i >= n) return o + B[n - 1] + (i - n + 1) * (B[n - 1] - B[n - 2]);
      return o + B[i];
    }
    function segIdx(sg, t) {                         /* indice de la première barre qui commence à t ou après */
      var B = sg.bars, n = B.length, u = t - sg.off() - 1e-6;
      if (u <= B[0]) return Math.ceil((u - B[0]) / (B[1] - B[0]));
      if (u > B[n - 1]) return n - 1 + Math.ceil((u - B[n - 1]) / (B[n - 1] - B[n - 2]));
      var lo = 0, hi = n - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (B[mid] >= u) hi = mid; else lo = mid + 1; }
      return lo;
    }
    function segBarAfter(sg, t) { return segTime(sg, segIdx(sg, t)); }
    function segBeatAfter(sg, t) {
      var i = segIdx(sg, t), t1 = segTime(sg, i);
      if (t1 - t < 1e-6) return t1;
      var t0 = segTime(sg, i - 1), bt = (t1 - t0) / 4, k = Math.ceil((t - t0) / bt - 1e-6);
      return t0 + k * bt;
    }
    function segTempo(sg, t) { var i = segIdx(sg, t); return 240 / Math.max(0.2, segTime(sg, i + 1) - segTime(sg, i)); }
    function eqp(p, v0, v1, t, dur) {                /* fondu à puissance constante : sinus en montée, cosinus en descente */
      var n = 48, a = new Float32Array(n);
      for (var i = 0; i < n; i++) { var x = i / (n - 1) * Math.PI / 2; a[i] = v1 > v0 ? v0 + (v1 - v0) * Math.sin(x) : v1 + (v0 - v1) * Math.cos(x); }
      try { p.cancelScheduledValues(t); p.setValueAtTime(v0, t); p.setValueCurveAtTime(a, t + 1e-4, Math.max(0.05, dur)); } catch (e) { p.setValueAtTime(v1, t); }
    }
    function mzSlot() {                              /* un emplacement de lecture : source -> niveau -> fondu -> mzBus */
      var en = ctx.createGain(), fo = ctx.createGain();
      fo.gain.value = 0; en.connect(fo); fo.connect(mzBus);
      return { entree: en, fondu: fo, sonde: offline ? null : tap(en) };
    }
    function tempoCourant() {                        /* le BPM de ce qui joue : le morceau long (tempo local de sa carte), sinon la piste */
      var sg = mzSeg(ctx.currentTime);
      return sg ? segTempo(sg, ctx.currentTime) : bpm;
    }
    function mzPret() { var f = famFirst(T.want); return !!(P && T.want && f >= 0 && ready(f)); }
    function mzAncres(horizon) {                     /* repose la grille du moteur sur le morceau : une ancre toutes les 8 barres */
      if (!M.G.length) return;
      var now = ctx.currentTime;
      for (var gi = 0; gi < M.G.length; gi++) {
        var sg = M.G[gi], guard = 0;
        if (sg.ia == null) sg.ia = segIdx(sg, Math.max(sg.from, cur));
        while (guard++ < 4) {
          var ta = segTime(sg, sg.ia);
          if (ta >= sg.to - 1e-3 || ta > horizon + 0.5) break;
          if (ta >= cur - 1e-4) {
            anchors.push({ t: ta, over: true, dur: Math.max(0.2, segTime(sg, sg.ia + 1) - ta), sg: sg });
            anchors.sort(function (x, y) { return x.t - y.t; });
            sg.ia += 8;
          } else sg.ia = segIdx(sg, cur) ;
        }
      }
      if (M.killAt && now >= M.killAt) {             /* le fondu est fini : la piste en blocs se tait pour de bon */
        M.killAt = 0;
        T.items.forEach(killItem); T.items = []; T.last = null; T.mode = 'off'; T.fam = null; T.nextPlanned = null;
        anchors = anchors.filter(function (a) { return a.sg; });
      }
      if (M.G.length && !M.hold && now > M.layersFin + 0.5) { M.G = []; M.layersFin = 1e12; }    /* retour aux blocs achevé */
    }
    /* un morceau prend l'antenne à tb, par un fondu de dur secondes. sl : son emplacement ; sg : {id, bars, off, from, to} ;
       sortant : l'emplacement du morceau qui s'efface (null : c'est la piste en blocs qui s'efface) */
    function mzEntrer(tb, dur, sl, sg, sortant) {
      var now = ctx.currentTime;
      sg.from = tb; sg.to = 1e12; sg.ia = null; sg.restaure = [];
      M.G.forEach(function (o) { if (o.to > tb) { sg.restaure.push([o, o.to]); o.to = tb; } });
      M.G = M.G.filter(function (o) { return o.to > now - 5 || o === sg; });
      M.G.push(sg);
      if (!M.hold) M.layersFin = 1e12;
      M.hold = true;
      eqp(sl.fondu.gain, 0, 1, tb, dur);
      if (sortant) eqp(sortant.fondu.gain, 1, 0, tb, dur);
      else {
        /* la piste en blocs continue sous le fondu : qu'aucun bloc ne s'arrête avant la fin du fondu */
        var guard = 0;
        while (T.last && !T.last.dead && T.last.tEnd < tb + dur + 0.05 && guard++ < 3) {
          var sp = followSpec(T.fam); if (!sp || !ready(sp.bloc)) break;
          var l0 = T.last; startItem(sp, l0.tEnd); T.nextPlanned = l0;
        }
        eqp(trkFade.gain, 1, 0, tb, dur);
        M.killAt = tb + dur + 0.1;
      }
      anchors = anchors.filter(function (a) { return a.sg || a.t < tb - 1e-3; });   /* les ancres des blocs d'après le fondu n'ont plus lieu d'être */
      trackTone();
      return true;
    }
    /* l'entrée est annulée avant ou pendant son début : tout revient comme avant (la piste, ses couches) */
    function mzAnnuler(sg, sl, sortant) {
      var now = ctx.currentTime;
      M.G = M.G.filter(function (o) { return o !== sg; });
      (sg.restaure || []).forEach(function (r) { r[0].to = r[1]; r[0].ia = null; });
      anchors = anchors.filter(function (a) { return a.sg !== sg; });
      try { sl.fondu.gain.cancelScheduledValues(now); sl.fondu.gain.setTargetAtTime(0, now, 0.03); } catch (e) { /* ignoré */ }
      if (sortant) { try { sortant.fondu.gain.cancelScheduledValues(now); sortant.fondu.gain.setTargetAtTime(1, now, 0.03); } catch (e2) { /* ignoré */ } }
      else { try { trkFade.gain.cancelScheduledValues(now); trkFade.gain.setTargetAtTime(1, now, 0.03); } catch (e3) { /* ignoré */ } M.killAt = 0; }
      if (!M.G.length) { M.hold = false; M.layersFin = 1e12; }
      else M.hold = true;
      trackTone();
    }
    /* le morceau cède l'antenne à la piste en blocs à tb ; rend faux si le bloc d'entrée n'est pas décodé */
    function mzRetour(tb, dur, sortant) {
      if (!mzPret()) return false;
      var now = ctx.currentTime;
      anchors = anchors.filter(function (a) { return !a.sg || a.t < tb - 1e-3; });
      M.G.forEach(function (o) { if (o.to > tb) o.to = tb; });
      M.hold = false; M.layersFin = tb + dur;
      var ok = switchTo(T.want, now, tb);
      if (!ok) { M.hold = true; M.layersFin = 1e12; M.G.forEach(function (o) { if (o.to === tb) o.to = 1e12; o.ia = null; }); return false; }
      eqp(sortant.fondu.gain, 1, 0, tb, dur);
      eqp(trkFade.gain, 0, 1, tb, dur);
      M.killAt = 0;
      trackTone();
      return true;
    }
    function mzSnap(sl, sortant) {                   /* le fondu en cours est conclu d'un coup (mort, arrière-plan) */
      var now = ctx.currentTime;
      try {
        sl.fondu.gain.cancelScheduledValues(0); sl.fondu.gain.setValueAtTime(1, now);
        if (sortant) { sortant.fondu.gain.cancelScheduledValues(0); sortant.fondu.gain.setValueAtTime(0, now); }
        else { trkFade.gain.cancelScheduledValues(0); trkFade.gain.setValueAtTime(0, now); M.killAt = now; }
      } catch (e) { /* ignoré */ }
    }
    function mzFinir() {                             /* tout est rendu à la piste */
      M.G = []; M.hold = false; M.layersFin = 1e12; M.killAt = 0;
      try { trkFade.gain.cancelScheduledValues(0); trkFade.gain.setValueAtTime(1, ctx.currentTime); } catch (e) { /* ignoré */ }
      trackTone();
    }

    /* grille de barres : celle de l'item qui couvre t, sinon la grille libre du moteur */
    function barAfter(t) {
      var sg = mzSeg(t); if (sg) return segBarAfter(sg, t);
      for (var i = T.items.length - 1; i >= 0; i--) {
        var it = T.items[i];
        if (it.tJoin - 1e-3 <= t && t < it.tEnd + 1e-3) {
          var k = Math.ceil((t - it.tJoin) / it.barD - 1e-6);
          return Math.min(it.tJoin + k * it.barD, it.tEnd);
        }
      }
      var k2 = Math.ceil((t - barT0) / barDurCur - 1e-6);
      return barT0 + Math.max(0, k2) * barDurCur;
    }
    function beatAfter(t) {
      var sg = mzSeg(t); if (sg) return segBeatAfter(sg, t);
      var bd = barDurCur / 4;
      for (var i = T.items.length - 1; i >= 0; i--) {
        var it = T.items[i];
        if (it.tJoin - 1e-3 <= t && t < it.tEnd + 1e-3) { var bt = it.barD / 4, k = Math.ceil((t - it.tJoin) / bt - 1e-6); return Math.min(it.tJoin + k * bt, it.tEnd); }
      }
      var k2 = Math.ceil((t - barT0) / bd - 1e-6);
      return barT0 + Math.max(0, k2) * bd;
    }
    gridApi.snap = function (t) { return beatAfter(t); };
    gridApi.bd = function () { var sg = mzSeg(ctx.currentTime); return sg ? 60 / segTempo(sg, ctx.currentTime) : 60 / BPM; };

    function famSpec(fam, afterDeath) {       /* premier item en entrant dans une famille */
      var F = T.FAMS[fam]; if (!F || !F.order.length) return null;
      T.loopI = 0;
      if (afterDeath) {                        /* après une mort : un autre bloc, jamais le premier de la famille ni celui de la mort */
        var cand = F.order.filter(function (b, k) { return b !== T.deathBloc && k > 0 && !P.blocs[b].court; });
        if (!cand.length) cand = F.order.filter(function (b) { return b !== T.deathBloc; });
        if (cand.length) {
          var c = cand[Math.min(cand.length - 1, (mrnd() * cand.length) | 0)];
          T.pos[fam] = F.order.indexOf(c) + 1;
          return { bloc: c, fromRel: 0, lead: false, fam: fam };
        }
      }
      if (fam === 'intro') {
        if (!T.introPlayed) { T.introPlayed = true; return { bloc: F.order[0], fromRel: 0, fam: fam }; }
        return { bloc: F.order[0], fromRel: F.loopFrom, fam: fam };
      }
      if (fam === 'outro') return { bloc: F.order[0], fromRel: 0, fam: fam };
      T.pos[fam] = 1;
      return { bloc: F.order[0], fromRel: 0, lead: !!FAM_LEAD[fam], fam: fam };
    }
    function randomBloc(F) {                   /* hors des trois derniers blocs joués ; sinon le plus ancien */
      var rec = T.recent.slice(-3), pool = F.rand.filter(function (b) { return rec.indexOf(b) < 0; });
      if (!pool.length) {
        var oldest = F.rand[0], at = 1e9;
        F.rand.forEach(function (b) { var k = T.recent.lastIndexOf(b); if (k < at) { at = k; oldest = b; } });
        return oldest;
      }
      return pool[Math.min(pool.length - 1, (mrnd() * pool.length) | 0)];
    }
    function followSpec(fam) {                 /* l'item d'après, sans changer de famille */
      var F = T.FAMS[fam];
      if (fam === 'alerte') return T.alertSpec ? { bloc: T.alertSpec.bloc, fromRel: T.alertSpec.fromRel, toRel: T.alertSpec.toRel, fam: fam } : null;
      if (!F) return null;
      if (fam === 'intro' || fam === 'outro') return { bloc: F.order[0], fromRel: F.loopFrom, fam: fam };
      var p = T.pos[fam] || 0;
      if (p < F.order.length) { T.pos[fam] = p + 1; return { bloc: F.order[p], fromRel: 0, fam: fam }; }
      if (F.loop && F.loop.length) { var b = F.loop[T.loopI++ % F.loop.length]; return { bloc: b, fromRel: 0, fam: fam }; }
      if (F.rand && F.rand.length) return { bloc: randomBloc(F), fromRel: 0, fam: fam };
      return { bloc: F.order[F.order.length - 1], fromRel: 0, fam: fam };
    }

    function startItem(spec, tJoin) {
      var b = P.blocs[spec.bloc], buf = T.bufs[spec.bloc];
      if (!buf) return null;
      var barD = b.dureeMesure, coreLen = b.coeurFin - b.coeurDeb, off = T.offs[spec.bloc] || 0;
      var from = spec.fromRel || 0, to = spec.toRel != null ? spec.toRel : coreLen;
      var leadD = spec.lead ? Math.min(b.avant, 1) * barD : 0;
      var tCore = tJoin + leadD, tEnd = tCore + (to - from);
      var fileStart = b.coeurDeb + off + from - leadD - XF, tSrc = tJoin - XF;
      if (fileStart < 0) { tSrc -= fileStart; fileStart = 0; }
      var len = (tEnd + XF + 0.02) - tSrc;
      var src = ctx.createBufferSource(); src.buffer = buf;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, tSrc);
      g.gain.linearRampToValueAtTime(1, Math.max(tSrc + 0.001, tJoin));        /* fondu d'entrée de 10 ms, posé sur la barre */
      g.gain.setValueAtTime(1, tEnd - XF);
      g.gain.linearRampToValueAtTime(0, tEnd);                                  /* fondu de sortie, posé sur la barre */
      src.connect(g); g.connect(trackBus);
      src.start(tSrc, fileStart, len);
      var it = { bloc: spec.bloc, fam: spec.fam, spec: spec, tJoin: tJoin, tCore: tCore, tEnd: tEnd, barD: barD, src: src, g: g, from: from, to: to, leadD: leadD };
      T.items.push(it); T.last = it; T.tNext = tEnd; T.fam = spec.fam; T.mode = 'on';
      itemLog.push({ bloc: spec.bloc, fam: spec.fam, tJoin: tJoin, tCore: tCore, tEnd: tEnd, barD: barD, from: from, to: to, lead: leadD > 0 });
      T.recent.push(spec.bloc); if (T.recent.length > 12) T.recent.shift();
      anchors.push({ t: tJoin, over: true, dur: barD });
      anchors.sort(function (x, y) { return x.t - y.t; });
      return it;
    }
    function trimItem(it, tb) {                 /* l'item finit à tb, fondu posé sur la barre */
      if (tb >= it.tEnd - 1e-3) return;
      try {
        it.g.gain.cancelScheduledValues(tb - XF - 1e-4);
        it.g.gain.setValueAtTime(1, tb - XF);
        it.g.gain.linearRampToValueAtTime(0, tb);
      } catch (e) { /* item déjà fini */ }
      it.tEnd = tb;
    }
    function killItem(it) {
      try { it.g.gain.cancelScheduledValues(0); it.g.gain.setValueAtTime(0, ctx.currentTime); } catch (e) { /* ignoré */ }
      try { it.src.stop(0); } catch (e2) { /* ignoré */ }
      it.dead = true;
    }
    function gcItems(now) {
      T.items = T.items.filter(function (it) {
        if (it.dead || it.tEnd + 0.1 < now) { try { it.src.disconnect(); it.g.disconnect(); } catch (e) { /* ignoré */ } return false; }
        return true;
      });
      if (T.last && T.last.dead) T.last = T.items.length ? T.items[T.items.length - 1] : null;
    }
    function trackLost() {                      /* l'horloge nous a doublés, ou resync : plus rien de la piste n'est fiable */
      T.items.forEach(killItem); T.items = []; T.last = null; T.mode = 'off'; T.fam = null; T.tNext = 0;
    }

    /* passer à une famille : à la prochaine barre de la grille en cours (ou de la grille libre) */
    function switchTo(fam, now, tbForce) {
      var after = T.afterDeath;
      var spec = fam === 'alerte' ? alertSpecNew() : famSpec(fam, after);
      if (!spec) return false;
      if (!ready(spec.bloc)) return false;                    /* le chargement a été demandé ; on réessaiera à la pompe suivante */
      var tb = tbForce != null ? tbForce : barAfter(now + 0.07), gap = 0;
      if (T.mode === 'on') {
        T.items.forEach(function (it) {
          if (it.tJoin >= tb - 1e-3) killItem(it);
          else if (it.tEnd > tb) trimItem(it, tb);
        });
        anchors = anchors.filter(function (a) { return a.t < tb - 1e-3; });
      }
      if (fam === 'alerte') gap = 0.25;                       /* coupure de 250 ms sur la barre */
      if (T.cut) { /* reprise après la mort : la coupure se lève sur ce début de mesure */
        musicCut.gain.cancelScheduledValues(0); musicCut.gain.setValueAtTime(1, Math.max(now, tb - 0.02)); T.cut = false;
      }
      var it = startItem(spec, tb + gap);
      if (!it) return false;
      if (gap > 0) { accLog.push({ nom: 'coupure', t: tb }); }
      T.afterDeath = false; T.nextPlanned = null;
      T.proofAt = tb + gap + 0.4; T.proofDone = offline;
      return true;
    }
    function alertSpecNew() {
      var F = T.FAMS.plateau; if (!F) return null;
      var bi = F.order[F.order.length - 1], b = P.blocs[bi];                /* le dernier bloc du PLATEAU : mesures 67 à 70 */
      var coreLen = b.coeurFin - b.coeurDeb;
      T.alertSpec = { bloc: bi, fromRel: coreLen - b.dureeMesure, toRel: coreLen };
      return { bloc: bi, fromRel: T.alertSpec.fromRel, toRel: T.alertSpec.toRel, fam: 'alerte', lead: false };
    }

    /* la pompe de la piste : appelée par schedUntil() */
    function trackPump(horizon) {
      if (!P || !T.want) return;
      var now = ctx.currentTime;
      gcItems(now);
      if (M.hold) {                              /* un morceau long tient l'antenne : la piste ne planifie plus rien ; la coupure de mort se lève ci-dessous */
        if (T.cut && T.resumeReq) { T.resumeReq = false; T.afterDeath = false; musicCut.gain.cancelScheduledValues(0); musicCut.gain.setTargetAtTime(1, now, 0.01); T.cut = false; }
        return;
      }
      if (T.cut) { if (T.resumeReq && ready(famFirst(T.want))) { T.resumeReq = false; switchTo(T.want, now); } return; }
      /* la preuve que la piste sonne (lecture effective) : sinon on revient au repli */
      if (!T.proofDone && now >= T.proofAt) {
        T.proofDone = true;
        var r = trackTap ? trackTap() : 1;
        if (r < 0.0003 && ctx.state === 'running') { T.failed++; trackLost(); anchors.push({ t: barAfter(now + 0.1), over: false, dur: barDurCur }); T.want = null; return; }
      }
      if (T.mode === 'off') {
        if (T.failed > 2) return;
        var spec = null;
        if (ready(famFirst(T.want))) switchTo(T.want, now);
        return;
      }
      /* piste en cours : changement de famille demandé ? */
      if (T.want !== T.fam) { if (ready(famFirst(T.want))) switchTo(T.want, now); }
      /* la suite : planifier le prochain item quand on approche de la fin du dernier */
      var last = T.last;
      if (last && !last.dead && last.tEnd - now < TRACK_AHEAD && T.nextPlanned !== last) {
        var sp = followSpec(T.fam);
        if (!sp) return;
        if (!ready(sp.bloc)) {
          if (last.tEnd - now < 0.12) {          /* le bloc suivant n'est pas arrivé : le repli prend la relève de la jointure */
            anchors.push({ t: last.tEnd, over: false, dur: last.barD });
            T.mode = 'off'; T.fam = null; T.last = null;
          }
          return;
        }
        startItem(sp, last.tEnd);
        T.nextPlanned = last;
      }
    }
    function famFirst(fam) {                    /* le bloc dont on a besoin pour entrer dans la famille */
      if (fam === 'alerte') { var F0 = T.FAMS.plateau; return F0 ? F0.order[F0.order.length - 1] : -1; }
      var F = T.FAMS[fam]; return F && F.order.length ? F.order[0] : -1;
    }
    /* les blocs à garder décodés : le bloc en cours, les deux suivants, l'entrée de la famille voulue */
    function needs() {
      var set = [], i;
      T.items.forEach(function (it) { if (set.indexOf(it.bloc) < 0) set.push(it.bloc); });
      if (!P) return set;
      if (T.want) {
        var f0 = famFirst(T.want);
        if (f0 >= 0 && set.indexOf(f0) < 0) set.unshift(f0);
        if (M.hold) return set;                       /* un morceau long sonne : seul le bloc d'entrée du retour est gardé (budget mémoire du téléphone) */
        if (f0 >= 0 && (T.want === T.fam || T.mode === 'off')) {   /* deux blocs d'avance sur l'ordre de la famille */
          var F = T.FAMS[T.want === 'alerte' ? 'plateau' : T.want];
          if (F && T.want !== 'alerte') {
            var p = T.pos[T.want] || 1;
            for (i = 0; i < 2; i++) {
              var nb = p + i < F.order.length ? F.order[p + i] : (F.loop && F.loop.length ? F.loop[(T.loopI + i) % F.loop.length] : -1);
              if (nb >= 0 && set.indexOf(nb) < 0) set.push(nb);
            }
            if (p >= F.order.length && F.rand && F.rand.length) {   /* tirage au sort : on charge deux candidats */
              var rec = T.recent.slice(-3), pool = F.rand.filter(function (b) { return rec.indexOf(b) < 0; });
              for (i = 0; i < Math.min(2, pool.length); i++) if (set.indexOf(pool[i]) < 0) set.push(pool[i]);
            }
          }
        }
      }
      return set;
    }

    /* ---- section, accents, couches ---- */
    function section(nom) {
      var fam = SEC_FAM[nom];
      if (!fam) { jr.sectionsInconnues = (jr.sectionsInconnues || 0) + 1; return false; }
      wantNom = nom; wantSet = true;
      T.want = fam;
      var now = ctx.currentTime;
      if (T.cut) { T.resumeReq = true; T.afterDeath = (fam === 'plateau' || fam === 'retour' || fam === 'respiration') && T.deathBloc >= 0 && fam === T.deathFam; }
      trackTone();
      if (hooks.section) hooks.section(nom);                  /* un morceau long peut prendre ou rendre l'antenne (couche publique) */
      if (!P || T.cut) return true;
      if (M.hold) return true;                                /* un morceau long tient l'antenne : le retour aux blocs est décidé par la couche publique */
      if (T.mode === 'on' && fam === T.fam) return true;       /* même famille : seul le filtre de section change */
      if (ready(famFirst(fam))) switchTo(fam, now);
      return true;
    }
    function cut(t) {                           /* la mort : la musique s'arrête net (15 ms) */
      var now = Math.max(ctx.currentTime, t || 0);
      musicCut.gain.cancelScheduledValues(now); musicCut.gain.setTargetAtTime(0, now, 0.004);
      T.cut = true; T.deathAt = now; T.deathBloc = T.last ? T.last.bloc : -1; T.deathFam = T.fam;
      T.items.forEach(killItem); T.items = []; T.last = null; T.mode = 'off'; T.fam = null; anchors.length = 0;
      T.resumeReq = false;
      // sans nouvelle demande de section, la musique reprend d'elle-même après 2,2 s (voir pump)
    }
    function resumeAfterCut() {
      if (!T.cut) return;
      T.resumeReq = true;
      T.afterDeath = T.deathBloc >= 0 && !!T.want && T.want === T.deathFam;
      if (!P || !T.want) {                      /* repli seul : on lève la coupure sur une mesure neuve */
        musicCut.gain.cancelScheduledValues(0); musicCut.gain.setTargetAtTime(1, ctx.currentTime, 0.01); T.cut = false;
      }
    }
    function stinger(nom) {
      var tb = barAfter(ctx.currentTime + 0.05), bd = barDurCur, k = 0;
      accLog.push({ nom: nom, t: tb });
      var big = nom === 'vague';
      /* une mesure : accord de ré (ré, la, ré) sur le premier temps, puis une montée de quatre notes, un temps chacune */
      [62, 69, 74].forEach(function (m) { voice(tb, 'sawtooth', hz(m), hz(m), 0, 0.006, bd * 0.28, 0.1, 2200, sfxBus); });
      voice(tb, 'triangle', hz(50), hz(38), 0.25, 0.005, 0.4, 0.2, 900, sfxBus);
      var deg = big ? [0, 2, 3, 4] : [0, 1, 2, 4];
      for (k = 0; k < 4; k++) voice(tb + k * bd / 4, 'triangle', hz(keyNote(74, deg[k])), hz(keyNote(74, deg[k])), 0, 0.004, bd / 4 * 0.9, 0.12, 3000, sfxBus);
      sweepNoise(tb, 500, 3000, 0.9, bd * 0.9, 0.08, bd * 0.5);
    }
    function dropAccent() {                     /* 250 ms de vide au WARNING, posés sur la barre */
      var tb = barAfter(ctx.currentTime + 0.05);
      accLog.push({ nom: 'drop', t: tb });
      var p = musicDuck.gain;
      p.cancelScheduledValues(tb - 0.01); p.setValueAtTime(1, tb - 0.01); p.linearRampToValueAtTime(0.05, tb);
      p.setValueAtTime(0.05, tb + 0.24); p.linearRampToValueAtTime(1, tb + 0.26);
      voice(tb, 'sine', 130, 38, 0.24, 0.002, 0.5, 0.3, 0, sfxBus);
      sweepNoise(tb + 0.02, 1800, 300, 0.8, 0.22, 0.12, 0.005);
    }
    function plongee() {                        /* APOGÉE : 10 % en 90 ms, puis 128 % au temps suivant */
      var now = ctx.currentTime, tb = beatAfter(now + 0.1);
      accLog.push({ nom: 'plongee', t: tb });
      var p = musicDuck.gain;
      p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0.10, now + 0.09);
      p.setValueAtTime(0.10, tb - 0.004); p.linearRampToValueAtTime(1.28, tb); p.linearRampToValueAtTime(1, tb + 0.45);
    }
    function cue(nom) {
      if (nom === 'mort') { cut(); return; }
      if (nom === 'gameover') { play('gameover', ctx.currentTime + 0.012, {}); return; }
      if (nom === 'stinger' || nom === 'vague') { stinger(nom); return; }
      if (nom === 'drop') { dropAccent(); return; }
      if (nom === 'plongee') { plongee(); return; }
      if (nom === 'inversion') { sweepNoise(ctx.currentTime + 0.01, 400, 3600, 1.0, 0.35, 0.18, 0.02); voice(ctx.currentTime + 0.01, 'sawtooth', hz(50), hz(86), 0.3, 0.02, 0.3, 0.07, 2400, sfxBus); }
    }

    /* ---- mesure du niveau ---- */
    function tap(node) {
      var an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
      node.connect(an);
      var z = ctx.createGain(); z.gain.value = 0; an.connect(z); z.connect(ctx.destination);
      var buf = new Float32Array(an.fftSize);
      return function () {
        an.getFloatTimeDomainData(buf);
        var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        return Math.sqrt(s / buf.length);
      };
    }
    var rmsMusic = offline ? function () { return 0; } : tap(musicDuck);
    var rmsSfxF = offline ? function () { return 0; } : tap(sfxBus);
    var rmsOutF = offline ? function () { return 0; } : tap(gate);
    trackTap = offline ? null : tap(trackBus);
    nodeLog.length = 0; nodeHead = 0; nodeTotal = 0;   /* le graphe permanent ne compte pas dans les nœuds créés par seconde */

    var muffleAt = 0, beatOut = { bar: 0, beat: 0, phase: 0 };
    return {
      ctx: ctx,
      startAt: startAt, resync: resync, schedUntil: schedUntil,
      isRunning: function () { return running; },
      stop: function (t) {
        running = false;
        ['pad', 'bass', 'drum', 'lead'].forEach(function (k) { var p = LAY[k].gain; hold(p, t); p.linearRampToValueAtTime(0, t + 0.25); p.__v = 0; });
        T.items.forEach(killItem); T.items = []; T.last = null; T.mode = 'off'; T.fam = null; anchors.length = 0;
      },
      setTension: function (v) { tTarget = clamp(+v || 0, 0, 1); },
      setDanger: function (v) { dangerV = clamp(+v || 0, 0, 1); },
      couche: function (nom, on) { if (nom === 'inversion') { invWant = !!on; trackTone(); } },
      section: section, cue: cue, cut: cut, resumeAfterCut: resumeAfterCut,
      cutState: function () { return { cut: T.cut, at: T.deathAt, want: T.want }; },
      setPiste: setPiste, setBuffer: setBuffer, dropBuffer: dropBuffer, needs: needs, hasBuffer: function (i) { return !!T.bufs[i]; },
      /* les morceaux longs */
      hooks: hooks, tempo: tempoCourant,
      mzSlot: mzSlot, mzEntrer: mzEntrer, mzAnnuler: mzAnnuler, mzRetour: mzRetour, mzFinir: mzFinir, mzPret: mzPret, mzSnap: mzSnap,
      mzBarre: function (t) { return barAfter(t); },
      mzTenu: function () { return M.hold; },
      mzCoupe: function (t) { return mzCoupe(t == null ? ctx.currentTime : t); },
      mzGrille: function () { return M.G.map(function (g) { return { id: g.id, from: g.from, to: g.to, off: g.off() }; }); },
      mzAncresEnAttente: function () { return anchors.length; },
      mzSansCouches: function (b) { M.sansCouches = !!b; },   /* mesure du niveau de la piste seule, sans les couches du moteur */
      sfx: function (name, o) { play(name, ctx.currentTime + 0.012, o); },
      sfxAt: function (name, t, o) { play(name, t, o); },
      voix: function (mot) { return say(mot, ctx.currentTime + 0.012); },
      /* la porte : v 0 ou 1, constante de temps tc (0 = immédiat) */
      gate: function (v, tc) { glide(gate.gain, v, tc); },
      channel: function (c, off) {
        if (c === 'musique') { musicChan.gain.setTargetAtTime(off ? 0 : 1, ctx.currentTime, 0.01); revMusIn.gain.setTargetAtTime(off ? 0 : 1, ctx.currentTime, 0.01); }
        else { sfxChan.gain.setTargetAtTime(off ? 0 : 1, ctx.currentTime, 0.01); revSfxIn.gain.setTargetAtTime(off ? 0 : 1, ctx.currentTime, 0.01); }
      },
      muffle: function (f) {
        if (f === muffleAt) return;
        var down = f > 0 && (muffleAt === 0 || f < muffleAt);
        muffleAt = f;
        glide(muffle.frequency, f > 0 ? f : OPEN, down ? 0.06 : 0.25);
      },
      rms: rmsMusic, rmsSfx: rmsSfxF, rmsOut: rmsOutF,
      cursor: function () { return cur; },
      barSigs: function () { return barSigs; },
      layerLog: function () { return layerLog; }, accLog: function () { return accLog; }, itemLog: function () { return itemLog; },
      journal: function () { return jr; },
      nodes: function () { return nodesLast(1); }, nodesTotal: function () { return nodeTotal; },
      beat: function () {
        var t = ctx.currentTime - Math.min(0.2, (ctx.outputLatency || 0) + (ctx.baseLatency || 0)), g0 = barT0, bd = barDurCur;
        var sg = mzSeg(t);
        if (sg) {                                    /* un morceau long : la carte de ses barres */
          var i0 = segIdx(sg, t); if (segTime(sg, i0) > t + 1e-6) i0--;
          var t0 = segTime(sg, i0), t1 = segTime(sg, i0 + 1), kk = Math.max(0, (t - t0) / ((t1 - t0) / 4));
          beatOut.bar = i0 < 0 ? 0 : i0; beatOut.beat = Math.min(3, Math.floor(kk)); beatOut.phase = Math.min(1, kk - Math.floor(kk));
          return beatOut;
        }
        for (var i = T.items.length - 1; i >= 0; i--) { var it = T.items[i]; if (it.tJoin - 1e-3 <= t && t < it.tEnd + 1e-3) { g0 = it.tJoin; bd = it.barD; break; } }
        var k = (t - g0) / (bd / 4); if (k < 0) k = 0;
        beatOut.bar = Math.floor(k / 4); beatOut.beat = Math.floor(k) % 4; beatOut.phase = k - Math.floor(k);
        return beatOut;
      },
      piste: function () {
        var now = ctx.currentTime, it = null;
        for (var i = T.items.length - 1; i >= 0; i--) if (T.items[i].tJoin - 1e-3 <= now && now < T.items[i].tEnd + 1e-3) { it = T.items[i]; break; }
        var r = { pret: !!P, bloc: it ? P.blocs[it.bloc].fichier : null, mesure: 0, section: wantNom, repli: !it, famille: T.fam, mode: T.mode };
        if (it) { var b = P.blocs[it.bloc]; r.mesure = Math.floor(b.mesures[0] + Math.max(0, (now - it.tCore + it.from) / it.barD)); }
        return r;
      },
      trackState: function () { return { decOff: T.decOff, items: T.items.map(function (it) { return { bloc: it.bloc, fam: it.fam, tJoin: it.tJoin, tCore: it.tCore, tEnd: it.tEnd, barD: it.barD }; }), mode: T.mode, fam: T.fam, want: T.want, offs: T.offs.slice(), suspect: T.suspect.slice(), failed: T.failed, recent: T.recent.slice() }; },
      trackRms: function () { return trackTap ? trackTap() : 0; },
      info: function () {
        return {
          bar: bar, step: step, bpm: tempoCourant(), tension: tSmooth, key: 0, over: overMode, morceau: M.hold,
          layers: 2 + (onDrum ? 1 : 0) + (onLead ? 1 : 0), perc: onPerc, spark: onSpark, inv: onInv, heart: onHeart,
          grid: GRIDS.indexOf(ph ? ph.grid : null), fill: bp ? bp.fill : '', brk: bp ? bp.brk : '',
          muffle: muffleAt, gate: gate.gain.value, section: wantNom, mode: T.mode
        };
      }
    };
  }

  /* ================================ face publique ================================ */
  var E = null, timer = null, resumeTries = 0, stale = 0, lastClock = -1;
  var wantMute = false, sleeping = false, needResync = false;
  var chanMute = { musique: false, effets: false };
  var J = { appels: {}, ignores: 0 };
  var pend = { tension: 0, danger: 0, inversion: false, section: null };
  function bpmPiste() { return (LD.piste && LD.piste.bpm) || BPM; }
  var autoSec = true, autoCur = null;                      /* tant que personne n'a demandé de section : titre, ou jeu dès que la tension monte */

  /* ---- le chargement de la piste : piste.json, puis les blocs à la demande ---- */
  var LD = { promise: null, piste: null, base: '', state: 'idle', error: null, loading: {}, dec: {}, fail: {}, concurrent: 0, loaded: 0, t0: 0 };
  function getBase(o) {
    if (o && o.base != null) return String(o.base);
    return (typeof MUSIQUE_BASE !== 'undefined') ? MUSIQUE_BASE : '';
  }
  function embedded() { return (typeof MUSIQUE_EMBED !== 'undefined' && MUSIQUE_EMBED && MUSIQUE_EMBED.piste) ? MUSIQUE_EMBED : null; }
  function b64ToBuf(uri) {                                  /* data:audio/mpeg;base64,... -> ArrayBuffer */
    var s = atob(uri.slice(uri.indexOf(',') + 1)), n = s.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = s.charCodeAt(i);
    return u.buffer;
  }
  function load(o) {
    if (LD.promise) return LD.promise;
    LD.base = getBase(o); LD.state = 'meta';
    var emb = embedded();
    var pr;
    if (emb) pr = Promise.resolve(emb.piste);
    else if (typeof fetch === 'function') pr = fetch(LD.base + 'piste.json').then(function (r) { if (!r.ok) throw new Error('piste.json : ' + r.status); return r.json(); });
    else pr = Promise.reject(new Error('fetch absent'));
    LD.promise = pr.then(function (p) {
      if (!p || !p.blocs || !p.blocs.length) throw new Error('piste.json vide');
      LD.piste = p; LD.state = 'prete';
      if (E) E.setPiste(p);
      return true;
    }).then(null, function (err) { LD.state = 'absente'; LD.error = String(err && err.message || err); return false; });
    return LD.promise;
  }
  function decodeAB(ab) {
    return new Promise(function (res, rej) {
      var p = E.ctx.decodeAudioData(ab, res, rej);
      if (p && typeof p.then === 'function') p.then(res, rej);
    });
  }
  function startLoad(i) {
    if (!E || !LD.piste || LD.loading[i] || LD.concurrent >= 2) return;
    var f = LD.fail[i]; if (f && (f.n >= 3 || E.ctx.currentTime < f.at)) return;
    var b = LD.piste.blocs[i]; if (!b) return;
    LD.loading[i] = true; LD.concurrent++;
    var emb = embedded(), src;
    if (emb && emb.blocs && emb.blocs[b.fichier]) { try { src = Promise.resolve(b64ToBuf(emb.blocs[b.fichier])); } catch (e) { src = Promise.reject(e); } }
    else src = fetch(LD.base + b.fichier).then(function (r) { if (!r.ok) throw new Error(b.fichier + ' : ' + r.status); return r.arrayBuffer(); });
    src.then(decodeAB).then(function (buf) {
      LD.concurrent--; LD.loading[i] = false;
      if (!E) return;
      E.setBuffer(i, buf);
      LD.dec[i] = { bytes: buf.length * buf.numberOfChannels * 4, at: E.ctx.currentTime };
      LD.loaded++; evict();
    }, function (err) {
      LD.concurrent--; LD.loading[i] = false;
      var q = LD.fail[i] || (LD.fail[i] = { n: 0, at: 0 }); q.n++; q.at = (E ? E.ctx.currentTime : 0) + 4 * q.n; LD.error = String(err && err.message || err);
    });
  }
  function decodedBytes() { var s = 0; for (var k in LD.dec) s += LD.dec[k].bytes; return s; }
  function evict() {                                        /* au plus quatre blocs décodés, 25 Mo : on lâche les moins utiles */
    var keep = E.needs(), ks = Object.keys(LD.dec).map(Number);
    while ((ks.length > MAX_BLOCS || decodedBytes() > MAX_OCTETS) && ks.length) {
      var victim = -1, at = 1e12;
      ks.forEach(function (k) { if (keep.indexOf(k) < 0 && LD.dec[k].at < at) { at = LD.dec[k].at; victim = k; } });
      if (victim < 0) {                                      /* tout est utile : on sacrifie le plus éloigné dans la liste */
        victim = ks.filter(function (k) { return keep.indexOf(k) >= 0; }).sort(function (a, c) { return keep.indexOf(c) - keep.indexOf(a); })[0];
        if (victim === undefined) break;
      }
      E.dropBuffer(victim); delete LD.dec[victim]; ks = Object.keys(LD.dec).map(Number);
    }
  }
  function ensureBlocs() {
    if (!E || !LD.piste) return;
    var want = E.needs();
    for (var i = 0; i < want.length && i < MAX_BLOCS; i++) if (!E.hasBuffer(want[i])) startLoad(want[i]);
  }

  /* ================================ les morceaux longs (Suno) : la couche publique ================================
     Des refrains chantés par une femme, des voix cybernétiques, de l'électro française : six morceaux de 2 min 30 à 3 min 30,
     lus EN FLUX par un HTMLAudioElement branché (createMediaElementSource) dans la chaîne de la piste, pour ne pas décoder
     trois minutes en mémoire. Trois emplacements de lecture : celui qui sonne, celui qui entre, celui qui attend (le morceau
     suivant, préchargé dès la vague d'avant). Les octets d'un morceau sont reçus par fetch() puis lus depuis un blob : la
     lecture ne dépend ni d'un serveur qui sait les requêtes d'intervalle (Safari l'exige), ni d'une précharge que l'iPhone
     ignore, et un 404 se voit tout de suite. Le décodage, lui, reste progressif, dans l'élément.
     LE PROGRAMME (à la lettre) : vagues 1 et 2 la piste en blocs ; vague 3 electro-calme ; vague 4 voix-machine, puis
     electro-tension si elle se termine avant la fin de la vague ; vague 5 voix-plus-vite ; ALERTE puis CYCLOPE voix-duo,
     puis electro-titan en boucle si le combat dure. Titre, attraction, briefing, répit, victoire, défaite, initiales : la
     piste en blocs (le morceau s'efface par un fondu de 1,5 s). Cartes et pause : l'étouffoir, comme la piste.
     LE FONDU de 1,5 s (puissance constante) est posé sur une barre de ce qui joue, lue sur la CARTE des barres du morceau
     (son tempo dérive) ou sur la grille de la piste. Mort : le morceau s'arrête sur place et reprend où il était.
     Tout échec (fichier absent, décodage refusé, lecture bloquée, élément muet) laisse la piste en blocs, sans erreur. */
  var PROG = {
    jeu3: ['electro-calme'],
    jeu4: ['voix-machine', 'electro-tension'],
    jeu5: ['voix-plus-vite'],
    boss: ['voix-duo', 'electro-titan!']                       /* « ! » : en boucle tant que le combat dure */
  };
  var Z = {
    etat: 'repos',            /* repos | catalogue | pret | absent | embarque | sansLecteur */
    cat: {}, slots: [], cur: null, plan: null, erreur: null,
    sec: null, vague: 0, boss: false, cle: null, rang: 0, hist: [],
    ko: {}, blobs: {}, charge: null, lat: 0.12, enPause: false, pauses: [], dernierEval: 0, dernierPre: 0, stats: { entrees: 0, annulees: 0, boucles: 0, fins: 0, retours: 0 }
  };
  function zSafe(f) { try { return f(); } catch (e) { Z.erreur = String(e && e.message || e); J.ignores++; return undefined; } }
  function zNum(a, b) { return a - b; }
  function zFiche(m) {
    var bars = (m.barres && m.barres.length > 8) ? m.barres.slice() : null, i, d;
    if (!bars) {                                              /* sans carte des barres : une grille à tempo constant */
      var b0 = +m.bpmMesure || +m.bpm || 120, d0 = 240 / b0, t = +m.debut || 0, fin = +m.duree || 180;
      bars = []; for (i = 0; t < fin; i++, t += d0) bars.push(+t.toFixed(3));
    }
    d = +m.duree || bars[bars.length - 1] + 4;
    var bo = null;
    if (m.boucle && +m.boucle.a > +m.boucle.de) {
      var ia = 0, ide = 0, ea = 1e9, ed = 1e9;
      for (i = 0; i < bars.length; i++) { if (Math.abs(bars[i] - m.boucle.a) < ea) { ea = Math.abs(bars[i] - m.boucle.a); ia = i; } if (Math.abs(bars[i] - m.boucle.de) < ed) { ed = Math.abs(bars[i] - m.boucle.de); ide = i; } }
      if (ia > ide) bo = { de: bars[ide], a: bars[ia], ide: ide, ia: ia };
    }
    return { id: m.id, fichier: m.fichier, url: LD.base + 'morceaux/' + m.fichier, gainDb: (+m.gainDb || 0) + (+m.gainJeuDb || 0),
      bars: bars, duree: d, boucle: bo, bpm: +m.bpmMesure || +m.bpm || 0 };
  }
  function zCatalogue() {
    if (Z.etat !== 'repos') return;
    if (embedded()) { Z.etat = 'embarque'; return; }                    /* le fichier autonome joue hors ligne : jamais de morceau long, jamais de requête */
    if (typeof fetch !== 'function' || typeof Audio === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) { Z.etat = 'sansLecteur'; return; }
    Z.etat = 'catalogue';
    var base = LD.base;
    fetch(base + 'morceaux/morceaux.json').then(function (r) {
      if (!r.ok) throw new Error('morceaux.json : ' + r.status);
      return r.json();
    }).then(function (j) {
      var cat = {};
      ((j && j.morceaux) || []).forEach(function (m) { if (m && m.id && m.fichier) cat[m.id] = zFiche(m); });
      Z.cat = cat; Z.etat = Object.keys(cat).length ? 'pret' : 'absent';
      zSafe(zEval);
    }).then(null, function (err) { Z.etat = 'absent'; Z.erreur = String(err && err.message || err); });
  }
  /* trois emplacements, créés au premier geste : l'iPhone n'autorise la lecture d'un élément que s'il a été lancé par un geste,
     chaque emplacement joue donc un instant de silence ici, avant de servir */
  function zSilence() {
    var n = 2205, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), i;
    function s4(o, t) { for (var k = 0; k < 4; k++) v.setUint8(o + k, t.charCodeAt(k)); }
    s4(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s4(8, 'WAVE'); s4(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s4(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function zSlots() {
    if (Z.slots.length) return true;
    if (embedded()) return false;                                  /* fichier autonome : aucun morceau long, donc aucun élément audio à débloquer */
    if (!E || typeof Audio === 'undefined' || typeof E.ctx.createMediaElementSource !== 'function') return false;
    var silence = null;
    try { silence = zSilence(); } catch (e0) { silence = null; }
    for (var i = 0; i < 3; i++) {
      var el = new Audio(), node = null, sl = null;
      try { el.preload = 'auto'; el.loop = false; el.setAttribute('playsinline', ''); node = E.ctx.createMediaElementSource(el); sl = E.mzSlot(); node.connect(sl.entree); }
      catch (e) { Z.slots = []; return false; }
      var s = { i: i, el: el, node: node, sl: sl, id: null, url: null, occupe: null, ring: [], off: 0, joue: false, vu: false, fini: false, erreur: null, maxRms: 0, tPlay: 0, depart: 0, pos0: 0 };
      (function (q) {
        q.el.addEventListener('ended', function () { q.fini = true; });
        q.el.addEventListener('error', function () { q.erreur = (q.el.error && q.el.error.message) || 'lecture refusée'; });
      })(s);
      if (silence) {                                                    /* le déblocage : un instant de silence, dans le geste */
        try { el.src = silence; var pr = el.play(); if (pr && pr.then) pr.then(function () { }, noop); } catch (e2) { /* refusé : sans geste, la suite le dira */ }
        (function (q) { setTimeout(function () { if (!q.id) { try { q.el.pause(); q.el.removeAttribute('src'); q.el.load(); } catch (e3) { /* ignoré */ } q.erreur = null; } }, 250); })(s);
      }
      Z.slots.push(s);
    }
    if (silence) setTimeout(function () { try { URL.revokeObjectURL(silence); } catch (e4) { /* ignoré */ } }, 3000);
    return true;
  }
  function zPret(s) { return !!(s && s.id && !s.erreur && s.el.readyState >= 3); }
  function zSlotAvec(id, libre) {
    for (var i = 0; i < Z.slots.length; i++) { var s = Z.slots[i]; if (s.id === id && !s.erreur && (!libre || !s.occupe)) return s; }
    return null;
  }
  function zLibere(s) {                                                 /* l'emplacement ne sert plus : lecture arrêtée, il garde ce qu'il a chargé */
    try { s.el.pause(); } catch (e) { /* ignoré */ }
    s.joue = false; s.vu = false; s.occupe = null; s.ring.length = 0;
    try { s.sl.fondu.gain.cancelScheduledValues(0); s.sl.fondu.gain.setValueAtTime(0, E.ctx.currentTime); } catch (e2) { /* ignoré */ }
  }
  function zUtiles() {                                                  /* à ne pas écraser : ce qui sonne, ce qui est voulu, ce qui vient ensuite */
    var k = zCle(), u = {};
    if (Z.cur) u[Z.cur.id] = 1;
    if (k) { var r = k === Z.cle ? Z.rang : 0; if (r < PROG[k].length) u[PROG[k][r].replace('!', '')] = 1; }
    zProchains().forEach(function (id) { u[id] = 1; });
    return u;
  }
  function zVider(s) {                                                  /* l'emplacement rend ses octets (le blob est révoqué quand plus personne ne le lit) */
    zLibere(s);
    if (s.id) { var ob = Z.blobs[s.id]; if (ob && --ob.n <= 0) { try { URL.revokeObjectURL(ob.url); } catch (e) { /* ignoré */ } delete Z.blobs[s.id]; } }
    s.id = null; s.url = null; s.erreur = null; s.fini = false;
    try { s.el.removeAttribute('src'); s.el.load(); } catch (e2) { /* ignoré */ }
  }
  function zAffecter(id) {                                              /* range les octets déjà reçus dans un emplacement libre */
    var b = Z.blobs[id], m = Z.cat[id];
    if (!b || !m || zSlotAvec(id, true)) return null;
    var s = null, i, u = zUtiles();
    for (i = 0; i < Z.slots.length && !s; i++) if (!Z.slots[i].occupe && !Z.slots[i].id) s = Z.slots[i];
    for (i = 0; i < Z.slots.length && !s; i++) if (!Z.slots[i].occupe && !u[Z.slots[i].id]) s = Z.slots[i];   /* sinon un emplacement libre dont le morceau ne sert plus */
    if (!s) return null;
    if (s.id) zVider(s);
    s.id = id; s.url = b.url; b.n++; s.erreur = null; s.fini = false; s.joue = false; s.vu = false; s.ring.length = 0; s.maxRms = 0;
    try { s.el.pause(); s.el.src = s.url; s.el.load(); s.sl.entree.gain.value = Math.pow(10, m.gainDb / 20); } catch (e2) { s.erreur = String(e2 && e2.message || e2); }
    return s;
  }
  function zCharger(id) {
    var m = Z.cat[id];
    if (!m || (Z.ko[id] || 0) >= 2 || zSlotAvec(id)) return;
    if (Z.blobs[id]) { zAffecter(id); return; }
    if (Z.charge) return;                                                /* une seule réception à la fois : le téléphone n'a pas de quoi en tenir deux */
    Z.charge = id;
    fetch(m.url).then(function (r) {
      if (!r.ok) throw new Error(m.fichier + ' : ' + r.status);
      return r.arrayBuffer();
    }).then(function (ab) {
      Z.charge = null;
      if (!ab || !ab.byteLength) throw new Error(m.fichier + ' : vide');
      Z.blobs[id] = { url: URL.createObjectURL(new Blob([ab], { type: 'audio/mpeg' })), n: 0 };
      zAffecter(id);
    }).then(null, function (err) { Z.charge = null; Z.ko[id] = (Z.ko[id] || 0) + 1; Z.erreur = String(err && err.message || err); });
  }

  /* ---- le programme ---- */
  function zCle() {
    /* la section « jeu » revient pendant le CYCLOPE à chaque réapparition (ETATS.reapparition) : le combat reste le combat jusqu'à une autre section ou une nouvelle vague */
    if (Z.boss || Z.sec === 'alerte' || Z.sec === 'boss') return 'boss';
    if (Z.sec === 'jeu') { var k = 'jeu' + Z.vague; return PROG[k] ? k : null; }
    return null;
  }
  function zNoter(type, id, raison) { Z.hist.push({ t: +(E ? E.ctx.currentTime : 0).toFixed(2), type: type, id: id, raison: raison || null }); if (Z.hist.length > 40) Z.hist.shift(); }
  function zSouhait() {                                                 /* le morceau voulu maintenant, ou null : la piste en blocs */
    var k = zCle();
    if (k !== Z.cle) { Z.cle = k; Z.rang = 0; }
    if (!k || Z.rang >= PROG[k].length) return null;
    return PROG[k][Z.rang].replace('!', '');
  }
  function zEnBoucle() { var k = Z.cle; return !!(k && Z.rang < PROG[k].length && PROG[k][Z.rang].slice(-1) === '!'); }
  function zProchains() {                                               /* à précharger : la suite du morceau, puis le premier de la vague d'après */
    var l = [], k = Z.cle, v = Z.vague;
    if (k && Z.rang + 1 < PROG[k].length) l.push(PROG[k][Z.rang + 1].replace('!', ''));
    if (Z.sec === 'jeu' || Z.sec === null || Z.sec === 'repit') {
      var kn = 'jeu' + (v + 1);
      if (PROG[kn]) l.push(PROG[kn][0]); else if (v >= 5) l.push(PROG.boss[0]);
    } else if (k === 'boss' && Z.rang === 0) l.push(PROG.boss[1].replace('!', ''));
    return l;
  }

  /* ---- les transitions ---- */
  function zOK() {
    return !!(E && Z.etat === 'pret' && Z.slots.length && !sleeping && !wantMute && E.ctx.state === 'running' && E.isRunning());
  }
  function zEval() {
    if (!zOK() || Z.plan || Z.enPause) return;
    var voulu = zSouhait(), c = Z.cur;
    if (c && c.id === voulu) return;
    if (voulu) {
      if ((Z.ko[voulu] || 0) >= 2 || !Z.cat[voulu]) return;
      var s = zSlotAvec(voulu, true);
      if (!zPret(s)) { zCharger(voulu); return; }
      zArmerEntree(voulu, s, 'entree', 0, null, FONDU_MZ);
    } else if (c) zArmerRetour(1.5);
  }
  /* tb : la barre de ce qui joue, au moins 0,6 s devant ; l'emplacement reçoit play() à tb - LEAD_MZ, au silence ; si, 40 ms
     avant la barre, il ne joue pas ou ne sonne pas, tout est annulé et la piste continue comme avant */
  function zArmerEntree(id, s, type, depart, tbImpose, dur) {
    var m = Z.cat[id], now = E.ctx.currentTime, c = Z.cur;
    var tb = tbImpose != null ? tbImpose : E.mzBarre(now + LEAD_MZ + 0.3);
    dur = dur || FONDU_MZ;
    s.depart = depart; s.off = tb - depart; s.ring.length = 0; s.joue = false; s.vu = false; s.fini = false; s.maxRms = 0;
    try { s.el.pause(); s.el.currentTime = Math.max(0, depart - LEAD_MZ + Z.lat); } catch (e) { /* ignoré */ }
    var sg = { id: id, bars: m.bars, off: function () { return s.off; } };
    s.occupe = 'entrant'; if (c) c.slot.occupe = 'sortant';
    Z.plan = { type: type, id: id, slot: s, tb: tb, dur: dur, sg: sg, sortant: c ? c.slot : null, joue: false, valide: false, mi: false, depart: depart, t0: now };
    E.mzEntrer(tb, dur, s.sl, sg, c ? c.slot.sl : null);
    Z.stats.entrees++; zNoter(type, id, 'tb ' + tb.toFixed(2));
  }
  function zArmerRetour(dur, brusque) {
    var c = Z.cur; if (!c) return;
    if (!E.mzPret()) return;                                            /* le bloc d'entrée n'est pas encore décodé : le morceau continue */
    var now = E.ctx.currentTime, tb = E.mzBarre(now + (brusque ? 0.08 : 0.3));
    if (!E.mzRetour(tb, dur, c.slot.sl)) return;
    c.slot.occupe = 'sortant';
    Z.plan = { type: 'retour', id: null, slot: null, tb: tb, dur: dur, sortant: c.slot, valide: true, mi: false, t0: now };
    Z.stats.retours++; zNoter('retour', c.id, 'tb ' + tb.toFixed(2));
  }
  function zAbort(p, raison) {                                          /* la lecture n'est pas là : on garde la piste */
    var ko = p.slot;
    E.mzAnnuler(p.sg, p.slot.sl, p.sortant ? p.sortant.sl : null);
    zLibere(p.slot);
    if (p.sortant) p.sortant.occupe = 'cur';
    Z.plan = null; Z.stats.annulees++;
    var poids = raison === 'interrompue' ? 0 : (raison === 'attente' || raison === 'en retard') ? 0.5 : 1;     /* interrompue par la mort ou l'arrière-plan : ce n'est pas une panne */
    if (poids) Z.ko[p.id] = (Z.ko[p.id] || 0) + poids;
    Z.erreur = 'entrée de ' + p.id + ' annulée : ' + raison; zNoter('annule', p.id, raison);
    if (ko.erreur) zVider(ko);
  }
  function zPlan(now) {
    var p = Z.plan; if (!p) return;
    var s = p.slot;
    if (p.type === 'retour') {
      if (!p.mi && now >= p.tb + p.dur * 0.5) { p.mi = true; Z.cur = null; }
      if (now >= p.tb + p.dur + 0.05) { zLibere(p.sortant); Z.cur = null; Z.plan = null; }
      return;
    }
    if (!p.joue && now >= p.tb - LEAD_MZ) {
      p.joue = true; s.tPlay = now; s.joue = true; s.vu = false;
      var pr = null;
      try { s.pos0 = s.el.currentTime; pr = s.el.play(); } catch (e) { s.erreur = String(e && e.message || e); }
      if (pr && pr.then) pr.then(noop, function (err) { s.erreur = 'play refusé : ' + (err && err.name || err); s.joue = false; });
    }
    if (p.joue && !p.valide) {
      if (s.erreur) { zAbort(p, s.erreur); return; }
      if (now >= p.tb - MZ_TIQUE) {
        if (s.vu && s.maxRms > 0.0004) p.valide = true;
        else { zAbort(p, s.vu ? 'muet (sonde ' + s.maxRms.toFixed(5) + ')' : 'attente'); return; }
      }
    }
    if (p.valide) {
      if (!p.mi && now >= p.tb + p.dur * 0.5) {
        p.mi = true; Z.cur = { id: p.id, slot: s, duree: Z.cat[p.id].duree, arme: false }; zNoter('sonne', p.id, 'off ' + s.off.toFixed(3));
        if (p.sortant) zLibere(p.sortant);                              /* l'ancien est à −3 dB et descend : il a fini de compter */
      }
      if (now >= p.tb + p.dur + 0.05) { s.occupe = 'cur'; if (p.sortant) zLibere(p.sortant); Z.plan = null; }
    } else if (now > p.tb + 0.1) zAbort(p, 'en retard');
  }
  /* un morceau finit : le suivant du programme, la boucle, ou la piste en blocs */
  function zSurveiller(now) {
    var c = Z.cur; if (!c || Z.plan || Z.enPause) return;
    var s = c.slot, m = Z.cat[c.id], el = s.el;
    if (s.fini || s.erreur) {                                           /* il s'est arrêté de lui-même ou a rompu : la piste reprend vite */
      if (s.erreur) Z.ko[c.id] = (Z.ko[c.id] || 0) + 1;
      Z.rang++; Z.stats.fins++;
      zArmerRetourBrusque(c);
      return;
    }
    var dur = m.duree, pos = el.currentTime, fin = s.off + dur, bd = 240 / Math.max(60, m.bpm || 120);
    if (zEnBoucle() && m.boucle && !c.arme) {
      var tA = s.off + m.boucle.a;
      if (tA - now < 1.4 && tA - now > -3) {
        var sl2 = zSlotAvec(c.id, true);
        if (!sl2 || sl2 === s) sl2 = zAffecter(c.id);
        if (!sl2 || !zPret(sl2)) return;
        c.arme = true;
        var tb = E.mzBarre(Math.max(now + LEAD_MZ + 0.3, tA - 0.01)), d = tb - tA;
        var ib = m.boucle.ide + Math.round(d / bd);
        var depart = ib < m.bars.length ? m.bars[ib] : m.boucle.de + d;
        zArmerEntree(c.id, sl2, 'boucle', depart, tb, FONDU_MZ);
        Z.stats.boucles++;
      }
      return;
    }
    if (!zEnBoucle() && !c.arme && isFinite(dur) && dur > 0) {
      var tbC = E.mzBarre(fin - FONDU_MZ - bd);
      if (tbC - now < 1.2) {
        c.arme = true; Z.rang++;
        var suiv = zSouhait();
        if (suiv && (Z.ko[suiv] || 0) < 2 && zPret(zSlotAvec(suiv, true))) {
          var tb2 = Math.max(tbC, E.mzBarre(now + LEAD_MZ + 0.3));
          zArmerEntree(suiv, zSlotAvec(suiv, true), 'chaine', 0, tb2, Math.max(0.4, Math.min(FONDU_MZ, fin - tb2)));
        } else {
          if (suiv) zCharger(suiv);
          var tb3 = Math.max(tbC, E.mzBarre(now + 0.3)), dd = Math.max(0.4, Math.min(FONDU_MZ, fin - tb3));
          if (E.mzPret() && E.mzRetour(tb3, dd, s.sl)) {
            s.occupe = 'sortant';
            Z.plan = { type: 'retour', id: null, slot: null, tb: tb3, dur: dd, sortant: s, valide: true, mi: false, t0: now };
            Z.stats.retours++; zNoter('retour', c.id, 'fin du morceau, tb ' + tb3.toFixed(2));
          }
        }
      }
    }
  }
  function zArmerRetourBrusque(c) {                                     /* le morceau s'est tu : la piste revient sans attendre la barre */
    var now = E.ctx.currentTime;
    if (E.mzPret()) { var tb = E.mzBarre(now + 0.08); if (E.mzRetour(tb, 0.3, c.slot.sl)) { c.slot.occupe = 'sortant'; Z.plan = { type: 'retour', id: null, slot: null, tb: tb, dur: 0.3, sortant: c.slot, valide: true, mi: false, t0: now }; Z.cur = null; return; } }
    zLibere(c.slot); Z.cur = null; E.mzFinir();
  }
  /* mort, arrière-plan, coupure du son : le morceau s'arrête sur place ; la reprise le relance d'où il était */
  function zSnapPlan() {
    var p = Z.plan; if (!p) return;
    if (p.type === 'retour') { zLibere(p.sortant); Z.cur = null; Z.plan = null; E.mzFinir(); return; }
    if (!p.valide) { zAbort(p, 'interrompue'); return; }
    E.mzSnap(p.slot.sl, p.sortant ? p.sortant.sl : null);
    p.slot.occupe = 'cur';
    if (p.sortant) zLibere(p.sortant);
    Z.cur = { id: p.id, slot: p.slot, duree: Z.cat[p.id].duree, arme: false };
    Z.plan = null;
  }
  function zPauser(raison) {
    if (Z.enPause) return;
    zSnapPlan();
    Z.enPause = raison; Z.pauses = [];
    Z.slots.forEach(function (s) { if (s.joue && !s.el.paused) { Z.pauses.push(s); try { s.el.pause(); } catch (e) { /* ignoré */ } } });
  }
  function zReprendre() {
    if (!Z.enPause || sleeping || wantMute || !E || E.cutState().cut) return;
    var l = Z.pauses; Z.enPause = false; Z.pauses = [];
    l.forEach(function (s) {
      s.ring.length = 0; s.vu = false;
      var pr = null; try { pr = s.el.play(); } catch (e) { s.erreur = String(e && e.message || e); }
      if (pr && pr.then) pr.then(noop, function (err) { s.erreur = 'reprise refusée : ' + (err && err.name || err); });
    });
  }
  function zSync(s, now) {                                              /* horloge audio - horloge du fichier, médiane des 21 derniers relevés */
    var el = s.el;
    if (!s.joue || el.paused || el.ended || el.readyState < 2) return;
    var ct = el.currentTime;
    if (!s.vu) { if (!(ct > (s.pos0 || 0) + 0.012)) return; s.vu = true; if (s.tPlay) Z.lat = clamp(0.6 * Z.lat + 0.4 * (now - s.tPlay), 0.04, 0.5); }
    var smp = now - ct, r = s.ring;
    if (r.length && Math.abs(smp - s.off) > 0.35 && r.length > 3) r.length = 0;        /* un saut (déplacement, calage) : on repart */
    r.push(smp); if (r.length > 21) r.shift();
    var a = r.slice().sort(zNum); s.off = a[a.length >> 1];
    if (s.sl.sonde) { var v = s.sl.sonde(); if (v > s.maxRms) s.maxRms = v; }
  }
  function zPrecharger(now) {
    if (now - Z.dernierPre < 0.5) return; Z.dernierPre = now;
    var l = zProchains();
    for (var i = 0; i < l.length; i++) {
      var id = l[i];
      if (!Z.cat[id] || (Z.ko[id] || 0) >= 2 || zSlotAvec(id)) continue;
      zCharger(id); break;
    }
  }
  function zTick(now) {
    if (!E || Z.etat !== 'pret' || !Z.slots.length) return;
    var cs = E.cutState();
    if ((cs.cut && now - cs.at > 0.04) || wantMute) zPauser(cs.cut ? 'mort' : 'son');
    else if (Z.enPause && !sleeping) zReprendre();
    Z.slots.forEach(function (s) { zSync(s, now); });
    zPlan(now);
    zSurveiller(now);
    zPrecharger(now);
    if (now - Z.dernierEval > 0.2) { Z.dernierEval = now; zEval(); }
  }

  /* l'étouffoir de la musique : pause 420 Hz, cartes 900 Hz, RALENTI 1,2 kHz, gel d'image long 900 Hz */
  function muffleTarget() {
    var S = N.S, f = 0, et = null;
    if (S && S.paused) f = 420;
    if (N.game && typeof N.game.etat === 'function') { try { et = N.game.etat(); } catch (e) { et = null; } }
    if (et === 'pause') f = 420;
    else if (et === 'cartes' && (!f || f > 900)) f = 900;
    if (N.fx && typeof N.fx.k === 'function') { var k = 1; try { k = N.fx.k(); } catch (e2) { k = 1; } if (k < 0.9 && (!f || f > 1200)) f = 1200; }
    if (N.fx && typeof N.fx.hitstopLeft === 'function') {
      var h = 0; try { h = N.fx.hitstopLeft(); } catch (e3) { h = 0; }
      if (h >= 10 && (!f || f > 900)) f = 900;
    }
    return f;
  }
  function wake() {
    var ctx = E.ctx, st = ctx.state;
    if (st === 'running') { resumeTries = 0; return true; }
    if (st === 'closed') return false;
    if (resumeTries++ < 40 && ctx.resume) { try { settle(ctx.resume()); } catch (e) { /* refusé : on réessaiera */ } }
    needResync = true;
    return false;
  }
  function pump() {
    if (!E || sleeping) return;
    if (!wake()) return;
    var now = E.ctx.currentTime;
    if (now === lastClock) { if (++stale > 240) { stale = 0; needResync = true; } return; }
    lastClock = now; stale = 0;
    E.muffle(muffleTarget());
    ensureBlocs();
    var cs = E.cutState();
    if (cs.cut && now - cs.at > 2.2) E.resumeAfterCut();   /* personne n'a redemandé de section : la musique reprend seule */
    if (!E.isRunning()) return;
    zSafe(function () { zTick(now); });
    if (wantMute) { needResync = true; return; }
    if (E.cursor() < now - 0.25) needResync = true;
    if (needResync) { needResync = false; if (E.cursor() < now + 0.06) E.resync(now + 0.06); }
    E.schedUntil(now + LOOKAHEAD);
  }
  function init() {
    if (E) return true;
    var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    var ctx = null;
    try { ctx = new AC({ latencyHint: 'interactive', sampleRate: 44100 }); }       /* 44,1 kHz : les blocs se décodent sans rééchantillonnage */
    catch (e) { try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e2) { return false; } }
    E = build(ctx, false, null);
    E.hooks.section = function (nom) {
      if (nom === 'alerte' || nom === 'boss') Z.boss = true; else if (nom !== 'jeu') Z.boss = false;
      Z.sec = nom; if (nom !== 'jeu' && nom !== 'alerte' && nom !== 'boss' && nom !== 'repit') Z.vague = 0;
      zSafe(zEval);
    };
    zSafe(zSlots);                                           /* dans le geste : les trois emplacements de lecture sont débloqués ici */
    if (wantMute || sleeping) E.gate(0, 0);
    if (chanMute.musique) E.channel('musique', true);
    if (chanMute.effets) E.channel('effets', true);
    E.setTension(pend.tension); E.setDanger(pend.danger); if (pend.inversion) E.couche('inversion', true);
    if (LD.piste) E.setPiste(LD.piste);
    if (pend.section) { E.section(pend.section); }
    else if (autoSec) { autoCur = pend.tension > 0.12 ? 'jeu' : 'titre'; E.section(autoCur); }
    load();                                                  /* piste.json (et, plus bas, les blocs) : sans cet appel, rien ne vient */
    zSafe(zCatalogue);                                       /* morceaux/morceaux.json : absent, la piste en blocs joue seule */
    return true;
  }

  /* le numéro de vague arrive par le bus (émetteur : 76-directeur). Inscrit au chargement : N.ev existe (03-socle), la vérification du
     contrat n'est pas encore active ; le contrat (EVT.vague.conso de 03-socle.js) devrait lister [60, '30-music']. */
  function zVague(c) {
    if (!c || c.evt !== 'entree') return;
    Z.vague = c.n | 0; Z.boss = false;                       /* une vague commence : le combat contre le CYCLOPE est fini */
    if (E) zSafe(zEval);
  }
  if (typeof N.ev === 'object' && N.ev && typeof N.ev.on === 'function') { try { N.ev.on('vague', 60, zVague, '30-music'); } catch (e) { /* le bus est absent : sans lui, la piste en blocs seule */ } }

  N.music = {
    init: init,
    load: load,
    start: function () {
      if (!E && !init()) return;
      if (E.isRunning()) return;
      if (!sleeping) wake();
      E.startAt(E.ctx.currentTime + 0.08);
      zSafe(zReprendre);
      pump();
      if (!timer && typeof setInterval === 'function') timer = setInterval(pump, PUMP_MS);
    },
    stop: function () {
      if (!E || !E.isRunning()) return;
      zSafe(function () { zPauser('stop'); });
      E.stop(E.ctx.currentTime);
      if (timer) { clearInterval(timer); timer = null; }
    },
    tension: function (v) {
      pend.tension = clamp(+v || 0, 0, 1);
      if (!E) return;
      E.setTension(pend.tension);
      if (autoSec) {                                         /* personne n'a encore demandé de section : le jeu de la démo ne l'appelle pas */
        var s = pend.tension > 0.12 ? 'jeu' : 'titre';
        if (s !== autoCur) { autoCur = s; E.section(s); }
      }
      pump();
    },
    danger: function (v) { pend.danger = clamp(+v || 0, 0, 1); if (E) E.setDanger(pend.danger); },
    section: function (nom) {
      var k = String(nom);
      J.appels['section:' + k] = (J.appels['section:' + k] || 0) + 1;
      autoSec = false; pend.section = k;
      if (!E) return has(SEC_FAM, k);
      var okSec = E.section(k);
      if (okSec) { Z.sec = k; }
      return okSec;
    },
    cue: function (nom) {
      var k = String(nom);
      J.appels['cue:' + k] = (J.appels['cue:' + k] || 0) + 1;
      if (!E || wantMute || sleeping) return;
      try { E.cue(k); } catch (e) { J.ignores++; }
    },
    couche: function (nom, on) {
      if (nom !== 'inversion') return;
      pend.inversion = !!on;
      if (E) E.couche(nom, !!on);
    },
    beat: function () { return E ? E.beat() : { bar: 0, beat: 0, phase: 0 }; },
    sfx: function (name, o) {
      var k = String(name);
      J.appels[k] = (J.appels[k] || 0) + 1;
      if (!E || wantMute || sleeping || chanMute.effets) { J.ignores++; return; }
      /* horloge arrêtée ou figée : un son posé maintenant ressortirait plus tard, en paquet */
      if (E.ctx.state !== 'running' || stale > 30) { J.ignores++; return; }
      try { E.sfx(k, o); } catch (e) { J.ignores++; }       /* un son ne fait jamais tomber le jeu */
    },
    voix: function (mot) {
      if (!E || wantMute || sleeping || chanMute.effets || E.ctx.state !== 'running') return false;
      try { return E.voix(String(mot).toUpperCase().replace(/[^A-Z]/g, '')); } catch (e) { return false; }
    },
    mute: function (a, b) {
      if (a === 'musique' || a === 'effets') {               /* par canal : la piste se tait, les effets restent (ou l'inverse) */
        var c = !!b; chanMute[a] = c;
        if (E) E.channel(a, c);
        return c;
      }
      var v = !!a;                                           /* l'ancien mute(v) coupe les deux */
      if (v === wantMute) return wantMute;
      wantMute = v;
      if (E) {
        if (v) zSafe(function () { zPauser('son'); }); else if (!sleeping) zSafe(zReprendre);
        E.gate(v || sleeping ? 0 : 1, v ? FADE_OUT : FADE_IN);
        if (!v) { needResync = true; pump(); }
      }
      return wantMute;
    },
    muted: function (canal) { return (canal === 'musique' || canal === 'effets') ? chanMute[canal] : wantMute; },
    suspend: function () {
      if (sleeping) return;
      sleeping = true;
      if (!E) return;
      zSafe(function () { zPauser('arriere-plan'); });
      E.gate(0, 0.005);
      try { settle(E.ctx.suspend()); } catch (e) { /* déjà suspendu ou fermé */ }
    },
    resume: function () {
      var was = sleeping;
      sleeping = false;
      if (!E) return;
      if (!was && E.ctx.state === 'running') return;         /* chaque geste l'appelle : rien à faire */
      resumeTries = 0;
      wake();
      E.gate(wantMute ? 0 : 1, FADE_IN);
      needResync = true;
      if (!wantMute) zSafe(zReprendre);
      pump();
    },
    piste: function () {
      if (E) { var r = E.piste(); r.morceau = Z.cur ? Z.cur.id : null; r.etat = LD.state; r.blocsDecodes = Object.keys(LD.dec).length; r.octetsDecodes = decodedBytes(); return r; }
      return { pret: false, bloc: null, mesure: 0, section: pend.section || 'titre', repli: true, etat: LD.state };
    },
    /* les morceaux longs */
    morceau: function () {                                   /* { id, t, duree } du morceau qui sonne (le plus audible), ou null */
      var c = Z.cur; if (!c || !c.slot) return null;
      var t = 0; try { t = c.slot.el.currentTime; } catch (e) { t = 0; }
      return { id: c.id, t: +t.toFixed(3), duree: Z.cat[c.id] ? Z.cat[c.id].duree : 0 };
    },
    tempo: function () { return E ? E.tempo() : bpmPiste(); },     /* le BPM de ce qui joue : le tempo local du morceau long, sinon celui de la piste */
    morceaux: function () {                                  /* diagnostic : catalogue, emplacements, programme, échecs */
      return {
        etat: Z.etat, erreur: Z.erreur, ids: Object.keys(Z.cat), vague: Z.vague, section: Z.sec, cle: Z.cle, rang: Z.rang, ko: Z.ko, stats: Z.stats,
        latence: +Z.lat.toFixed(3), enPause: Z.enPause || false, charge: Z.charge,
        historique: Z.hist, boss: Z.boss,
        plan: Z.plan ? { type: Z.plan.type, id: Z.plan.id, tb: Z.plan.tb, joue: Z.plan.joue, valide: Z.plan.valide } : null,
        emplacements: Z.slots.map(function (s) { return { i: s.i, id: s.id, occupe: s.occupe, pret: zPret(s), joue: s.joue, vu: s.vu, t: +s.el.currentTime.toFixed(2), off: +s.off.toFixed(3), maxRms: +s.maxRms.toFixed(5), erreur: s.erreur }; }),
        grille: E ? E.mzGrille() : []
      };
    },
    /* pour les essais seulement : un relevé instantané (horloge audio, horloge du fichier, niveau avant le fondu, décalage retenu) */
    morceauSonde: function () {
      var c = Z.cur; if (!c || !c.slot) return null;
      return { ctx: E.ctx.currentTime, ct: c.slot.el.currentTime, rms: c.slot.sl.sonde ? c.slot.sl.sonde() : 0, off: c.slot.off };
    },
    /* pour les essais seulement : saute dans le morceau qui sonne (près de sa fin, pour voir l'enchaînement ou la boucle) */
    morceauSaut: function (t) {
      var c = Z.cur; if (!c) return false;
      try { c.slot.el.currentTime = +t; c.slot.ring.length = 0; c.arme = false; return true; } catch (e) { return false; }
    },
    noeuds: function () { return E ? E.nodes() : 0; },
    rms: function () { return E ? E.rms() : 0; },
    rmsSfx: function () { return E ? E.rmsSfx() : 0; },
    rmsOut: function () { return E ? E.rmsOut() : 0; },
    info: function () {
      if (!E) return null;
      var r = E.info(); r.state = E.ctx.state; r.muted = wantMute; r.sleeping = sleeping; r.running = E.isRunning();
      return r;
    },
    /* pour les tests seulement : le contexte, pour simuler une interruption du système */
    context: function () { return E ? E.ctx : null; },
    moteur: function () { return E; },
    chargeur: function () { return { etat: LD.state, erreur: LD.error, decodes: Object.keys(LD.dec).map(Number), octets: decodedBytes(), charges: LD.loaded, echecs: LD.fail, base: LD.base }; },
    /* pour la preuve : appels par nom (connus ou non), sons joués, fusionnés, plafonnés, ignorés */
    journal: function () {
      var j = E ? E.journal() : { joues: {}, fusionnes: 0, plafonnes: 0, budget: 0, demandes: {} };
      return { appels: J.appels, ignores: J.ignores, joues: j.joues, demandes: j.demandes, fusionnes: j.fusionnes, plafonnes: j.plafonnes, budget: j.budget, inconnus: j.inconnus };
    },
    noms: Object.keys(SEC_FAM),

    /* PREUVE. Rend la musique hors ligne avec le MÊME moteur que le jeu, donc ce qui est mesuré est ce qui est
       joué. events : [{t, name, opts}] pour les sons d'information ; mute : 'music' ou 'sfx'.
       opts (la piste) : { piste: piste.json, buffers: {indice: AudioBuffer}, sections: [{t, nom}], cues: [{t, nom}],
       couches: [{t, nom, on}], danger: f(t) }. */
    renderOffline: function (seconds, tensionFn, events, rate, mute, opts) {
      var OC = (typeof window !== 'undefined') && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
      if (!OC) return null;
      opts = opts || {};
      var sr = rate || 44100, dur = seconds;
      var ctx = new OC(2, Math.ceil(sr * dur), sr);
      var e = build(ctx, true, mute, !!opts.brut);
      if (opts.sansCouches) e.mzSansCouches(true);
      if (opts.morceau) {                   /* un morceau long décodé, par la même chaîne que la piste (la preuve de niveau) */
        var mo = opts.morceau, ms = e.mzSlot(), mb = ctx.createBufferSource();
        ms.entree.gain.value = Math.pow(10, (mo.gainDb || 0) / 20);
        mb.buffer = mo.buffer; mb.connect(ms.entree); mb.start(0, mo.depart || 0);
        e.mzEntrer(0, 0.05, ms, { id: 'essai', bars: mo.bars || [0, 2, 4], off: function () { return -(mo.depart || 0); } }, null);
      }
      if (opts.piste) {
        e.setPiste(opts.piste);
        for (var k in (opts.buffers || {})) e.setBuffer(+k, opts.buffers[k]);
      }
      e.startAt(0);
      var slice = 0.25;                     /* la tension est relue comme en jeu, par tranches */
      var evs = (events || []).slice().sort(function (a, c) { return a.t - c.t; }), ei = 0;
      var tl = [];
      (opts.sections || []).forEach(function (x) { tl.push({ t: x.t, f: function () { e.section(x.nom); } }); });
      (opts.cues || []).forEach(function (x) { tl.push({ t: x.t, f: function () { e.cue(x.nom); } }); });
      (opts.couches || []).forEach(function (x) { tl.push({ t: x.t, f: function () { e.couche(x.nom, x.on); } }); });
      tl.sort(function (a, c) { return a.t - c.t; });
      var ti = 0;
      function feed(t) {                    /* comme en jeu : on ne cree que ce qui va sonner bientot */
        if (tensionFn) e.setTension(tensionFn(t));
        if (opts.danger) e.setDanger(opts.danger(t));
        while (ti < tl.length && tl[ti].t <= t + 1e-9) { tl[ti].f(); ti++; }
        e.schedUntil(Math.min(dur, t + slice + LOOKAHEAD));
        while (ei < evs.length && evs[ei].t < t + slice + LOOKAHEAD) { e.sfxAt(evs[ei].name, evs[ei].t, evs[ei].opts); ei++; }
      }
      if (typeof ctx.suspend === 'function') {
        feed(0);
        for (var t = slice; t < dur; t += slice) {
          (function (tt) { ctx.suspend(tt).then(function () { feed(tt); ctx.resume(); }); })(t);
        }
      } else {
        for (var t2 = 0; t2 < dur; t2 += slice) feed(t2);
        while (ei < evs.length) { e.sfxAt(evs[ei].name, evs[ei].t, evs[ei].opts); ei++; }
      }
      return ctx.startRendering().then(function (buf) {
        N.music.lastBars = e.barSigs();    /* aide aux tests : empreinte de chaque mesure rendue */
        N.music.lastJournal = e.journal();
        N.music.lastEngine = e;
        return buf;
      });
    }
  };

})();
