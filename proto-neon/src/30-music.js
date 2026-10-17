/* 30-music.js — moteur musical generatif de SNAKE 2975.  Proprietaire unique de N.music.
   Aucun fichier audio : basse, batterie, nappe, lead et sons d'information sont synthetises.

   INTERFACE PUBLIQUE
     N.music.init()            cree le contexte audio ; sur un geste de la joueuse (90-boot.js)
     N.music.start(), stop()   la partition. start() apres stop() reprend sur une NOUVELLE mesure : la
                               composition continue la ou elle en etait, jamais de retour au debut (G-34)
     N.music.tension(v)        0 a 1, lue a chaque image : couches, tempo, niveau
     N.music.sfx(nom, opts)    un son d'information, voir la liste ; un nom inconnu joue le son neutre
     N.music.mute(v)           LA COUPURE DU SON (bouton de 70-game.js). Vrai : fondu de sortie court,
                               -30 dB en 60 ms ; faux : retour a 95 % en 120 ms. Pendant la coupure les
                               sons sont ignores (aucun ne s'empile pour ressortir au retour) et la
                               partition ne s'ordonnance plus ; elle reprend sur une mesure neuve. Valable
                               AVANT init() : la demande est retenue et appliquee a la creation du
                               contexte. Idempotent, rend l'etat. Il n'y avait pas d'equivalent avant :
                               70-game.js coupait par stop(), qui laisse passer les sons de 60-intro.js.
                               mute() suffit seul : inutile d'appeler aussi stop() et start().
     N.music.muted()           -> vrai si la coupure est active
     N.music.suspend()         arriere-plan (90-boot.js, visibilitychange) : fondu de 5 ms et contexte
                               suspendu ; plus aucune relance automatique tant que resume() n'est pas appele
     N.music.resume()          retour au premier plan, et chaque geste : relance un contexte 'suspended'
                               ou 'interrupted' (iPhone apres un appel, Siri, un verrouillage), fondu
                               d'entree, reprise sur une mesure neuve. Sans effet si tout joue deja.
     N.music.rms(), rmsSfx(), rmsOut(), info(), journal(), context(), renderOffline(...)   tests et preuve

   LES SONS D'INFORMATION — ce que chaque nom joue. Tous tombent dans la tonalite courante (G-33) :
     tir      souffle feutre qui retombe (triangle filtre a 1,7 kHz), une note de la pentatonique choisie par
              pitch 0-4 ; c'est le plus frequent (le tir automatique, plus de 7 par seconde), donc le plus
              discret, bien sous la musique
     kill     eclat tonal montant : la pentatonique monte d'un degre par palier d'enchainement (pitch
              0-9), avec un craquement medium et un coup sourd
     bigkill  l'explosion : chute de sub, coup dans les mediums pour les haut-parleurs de telephone,
              souffle filtre descendant, queue de reverberation ; la musique s'efface 0,8 s
     degat    grondement descendant de deux dents de scie desaccordees : le choc subi
     butin    tintement court, une note de la pentatonique qui monte avec pitch (la longueur), quinte douce
     intro    montee de souffle et de bourdon pendant 1,9 s, puis l'impact de bigkill
     defi     arpege MAJEUR sur la tonique : la reussite
     (autre)  son neutre : une note breve et douce de la gamme, plutot que rien
   Contre l'agacement, chaque appel passe par trois gardes : FUSION (deux appels du meme nom a moins
   de 22 a 400 ms ne font qu'un son), PLAFOND de voix simultanees par nom, USURE (le gain d'un nom baisse
   avec sa densite recente : g = 1/sqrt(1 + k (d - 1)), d compte les appels de la derniere seconde).
   Chaque appel tire en plus son propre desaccord et sa propre duree : deux sons ne sont jamais identiques.

   LA REGLE D'OR — rien ne se repete a l'identique plus de deux fois. Elle n'est pas obtenue par du
   bruit : chaque decision musicale est tiree d'une POCHE de motifs par pick(), qui refuse
   mecaniquement un troisieme tirage identique consecutif, et barGuard() interdit en plus qu'une
   mesure entiere (son empreinte complete) sorte trois fois de suite. La repetition est donc
   impossible par construction, pas improbable par chance.

   HORLOGE. Tout est cale sur ctx.currentTime, l'horloge audio. Aucune horloge murale, aucune horloge
   de performance, aucun setTimeout pour la justesse rythmique : setInterval ne sert qu'a reveiller
   l'ordonnanceur, qui place les evenements a l'avance sur l'horloge audio.

   ALEA. Toutes les decisions passent par le generateur de N (N.rnd, meme suite congruentielle), mais
   sur un ETAT PROPRE a la musique : mk() depose son etat dans N.S.rngState, appelle N.rnd, puis
   restaure l'etat du jeu. La musique ne puise donc jamais dans le flux du jeu (sa reproductibilite a
   graine fixe est intacte), et sa propre graine derive de N.S.seed. Trois sous-flux : les choix
   musicaux, le tampon de bruit (il depend de la frequence d'echantillonnage) et les sons d'information
   (leur instant depend du jeu : ils ne doivent pas deplacer la composition).

   MELANGE (mesures de tools/musique2/mesure.mjs sur une partie reelle rejouee hors ligne).
   musique -> esquive -> etouffoir -> master ; sons -> master ; master -> genou doux -> porte -> sortie.
   Le genou est lineaire (gain 1) jusqu'a -5 dBFS et plafonne les cretes a -1 dBFS : il ne colore rien
   en jeu normal. La porte porte la coupure et la mise en veille. L'etouffoir est un passe-bas sur la
   seule musique : la PAUSE (N.S.paused) et un gel d'image long (« boss stop ») la passent dessous (G-32).

   VEILLE. Aucun ecouteur DOM ici : 90-boot.js est seul autorise a toucher au DOM. pump(), appele a
   chaque image par tension() et par le reveil, relance un contexte 'suspended' ou 'interrupted' (sauf
   pendant suspend()), et se recale sur une mesure neuve si l'horloge a saute ou s'est figee. Aucune
   promesse de resume() ou suspend() n'est laissee sans traitement : un refus n'est pas une erreur.
*/

var N = (typeof window !== 'undefined' && window.__N) || {};
if (typeof window !== 'undefined') window.__N = N;

(function () {

  /* ================================ reglage du melange ================================
     Valeurs mesurees, pas devinees : voir tools/musique2/mesure.mjs. */
  var MIX = {
    master: 1.20,
    music: 0.58,        // niveau du bus musical a tension 0
    musicTension: 0.50, // ce que la tension ajoute : le RMS croit meme a nombre de couches egal
    sfx: 1.90,
    pad: 0.30, bass: 0.72, drum: 0.80, lead: 0.24,
    revSend: { drum: 0.26, lead: 0.28, sfx: 0.20, bass: 0.0, pad: 0.10 },
    duckKill: 0.10, duckBig: 0.45, duckHurt: 0.32, duckInfo: 0.22
  };
  var BPM_LOW = 112, BPM_HIGH = 128;
  var LOOKAHEAD = 0.26, PUMP_MS = 40;
  var ROOT_BASS = 33, ROOT_PAD = 57, ROOT_LEAD = 69;   /* la mineur : A1, A3, A4 */
  var FADE_OUT = 0.018, FADE_IN = 0.04;                /* constantes de temps de la porte, en s */

  /* ================================ outils ================================ */
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function noop() {}
  function settle(pr) { if (pr && typeof pr.then === 'function') pr.then(noop, noop); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  /* sous-flux : la suite de N.rnd, sur un etat qui n'est pas celui du jeu */
  function mk(seed) {
    var st = seed >>> 0;
    return function () {
      /* contrat 1.0 : N.rnd est devenu l'alias du flux 'jeu' ; la musique garde la MEME suite, en local,
         et ne consomme donc plus rien du hasard du jeu (lot 0b) */
      st = (st * 1664525 + 1013904223) % 4294967296;
      return st / 4294967296;
    };
  }
  function musicSeed() {
    var s = (N.S && (N.S.seed | 0)) || 2084;
    return (Math.imul(s, 2654435761) + 0x9E3779B9) >>> 0;
  }

  /* ================================ poches de motifs ================================
     Tout ce qui peut varier vit ici. Les masques font 16 pas (une mesure a 4/4, grille de double
     croche) : '.' silence, un chiffre = un role de hauteur. */

  /* grilles d'accords, 4 mesures chacune. d = demi-tons depuis la tonique, q = 0 mineur / 1 majeur */
  var GRIDS = [
    [[0, 0], [8, 1], [3, 1], [10, 1]],   /* i  VI III VII */
    [[0, 0], [10, 1], [8, 1], [10, 1]],  /* i  VII VI VII */
    [[0, 0], [5, 0], [8, 1], [7, 1]],    /* i  iv  VI  V  */
    [[8, 1], [10, 1], [0, 0], [0, 0]],   /* VI VII i   i  */
    [[0, 0], [3, 1], [10, 1], [5, 0]],   /* i  III VII iv */
    [[5, 0], [10, 1], [8, 1], [3, 1]]    /* iv VII VI  III */
  ];
  var HARM_RATE = [1, 1, 1, 2];                 /* accords par mesure, parfois tenus deux mesures */
  var KEYS = [0, 0, 0, 5, 3, -2, 7];            /* transposition, retiree toutes les 16 mesures */

  var BASS = [
    '1...1...1...1...',
    '1.1.1...1.1.1...',
    '1..1..1...1..1..',
    '11..1..211..1..3',
    '1...1..31...1.2.',
    '1.1.1.1.1.1.1.1.',
    '1..31..21..31.2.'
  ];
  /* energie de chaque motif de basse (somme des durees de note) : une basse plus dense joue chaque note
     un peu plus doucement, pour que la variete reste dans le rythme et non dans le niveau (critere 6) */
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
  var LEAD_SHAPE = [
    [0, 1, 2, 3], [3, 2, 1, 0], [0, 1, 2, 3, 2, 1], [0, 2, 1, 3],
    [0, 3, 1, 4], [0, 2, 4, 2], [0, 1, 2, 4, 3, 5], [2, 1, 0, 1, 2, 3]
  ];
  var LEAD_RHY = [
    '1.1.1.1.1.1.1.1.',
    '1111.1..1111.1..',
    '1..1..1.1..1..1.',
    '1.11.1.11.11.1..',
    '1...1.1.1...1.1.',
    '11.1..1.11.1..1.'
  ];
  var LEAD_OCT = [0, 0, 0, -12, -12];           /* jamais d'octave au-dessus : le lead reste sous 2 kHz */
  /* voicings de la nappe en ROLES : 'T' la tierce de l'accord (3 ou 4 selon sa qualite), 'U' la tierce
     a l'octave ; 7 la quinte, 12 l'octave, 14 la neuvieme, 19 la quinte a l'octave */
  var VOICING = [[0, 'T', 7, 12], [0, 7, 12, 'U'], [-12, 0, 'U', 19], [0, 7, 14, 'U'], [0, 'T', 7, 14]];
  var BASS_GHOST = ['none', 'none', 'off8', 'slide'];
  var PENTA = [0, 3, 5, 7, 10];                 /* pentatonique mineure : la gamme des sons */

  /* ================================ le moteur ================================
     build() construit un moteur complet sur un contexte quelconque. Le jeu en instancie un sur un
     AudioContext ; la preuve en instancie un second sur un OfflineAudioContext. Le code de synthese
     et de composition est le MEME : la preuve mesure donc bien ce qui est joue. */
  function build(ctx, offline, mute) {

    var sr = ctx.sampleRate;
    var muteMus = mute === 'music', muteSfx = mute === 'sfx';
    var mrnd = mk(musicSeed());                      /* choix musicaux */
    var nrnd = mk((musicSeed() ^ 0x5bf03635) >>> 0);  /* bruit : flux separe, voir l'entete */
    var srnd = mk((musicSeed() ^ 0x2c1b3c6d) >>> 0);  /* sons d'information : flux separe */

    /* ---- automation sans claquement ----
       hold() fige un parametre a l'instant t en gardant sa valeur : cancelScheduledValues seul annulerait
       aussi une rampe en cours, et la valeur sauterait. rampTo() enchaine les rampes de mesure en mesure
       SANS rien annuler : la rampe precedente finit exactement ou la suivante commence. */
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
    function glide(p, v, tc) {                 /* vers v, en exponentielle de constante tc, depuis maintenant */
      var now = ctx.currentTime;
      hold(p, now);
      if (tc > 0) p.setTargetAtTime(v, now, tc); else p.setValueAtTime(v, now);
    }

    /* ---- genou doux : lineaire jusqu'a T, plafond a C. Un gain de 0,5 en amont etend la courbe a
       +-2 : une crete jusqu'a +6 dB au-dessus de la pleine echelle est encore arrondie, pas ecretee. */
    function kneeCurve(n) {
      var c = new Float32Array(n), T = 0.56, C = 0.89;
      for (var i = 0; i < n; i++) {
        var x = ((i / (n - 1)) * 2 - 1) * 2, a = x < 0 ? -x : x;
        var y = a <= T ? a : T + (C - T) * Math.tanh((a - T) / (C - T));
        c[i] = x < 0 ? -y : y;
      }
      return c;
    }

    /* ---- bus ---- */
    var master = ctx.createGain(); master.gain.value = MIX.master * 0.5;
    var shaper = ctx.createWaveShaper();
    shaper.curve = kneeCurve(4097); shaper.oversample = '2x';
    var gate = ctx.createGain(); gate.gain.value = 1;          /* coupure et veille */
    master.connect(shaper); shaper.connect(gate); gate.connect(ctx.destination);

    var musicBus = ctx.createGain();        /* somme des quatre couches, sec */
    var musicLevel = ctx.createGain(); musicLevel.gain.value = muteMus ? 0 : MIX.music;
    var musicDuck = ctx.createGain(); musicDuck.gain.value = 1;
    var OPEN = Math.min(20000, sr * 0.45);
    var muffle = ctx.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = OPEN; muffle.Q.value = 0.6;
    musicBus.connect(musicLevel); musicLevel.connect(musicDuck); musicDuck.connect(muffle); muffle.connect(master);

    var sfxBus = ctx.createGain(); sfxBus.gain.value = muteSfx ? 0 : MIX.sfx;
    sfxBus.connect(master);

    var LAY = {};
    ['pad', 'bass', 'drum', 'lead'].forEach(function (k) {
      var g = ctx.createGain();
      g.gain.value = (k === 'pad' || k === 'bass') ? MIX[k] : 0;
      g.connect(musicBus); LAY[k] = g;
    });

    /* ---- reverberation : reseau de retards retroactifs. Pas de fichier d'impulsion, pas de
       convolution : quatre peignes passe-bas, c'est la grosse plaque de 1984 pour un cout negligeable
       sur telephone. Sa sortie passe par l'etouffoir : en pause, la queue s'assourdit avec la musique. ---- */
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
    /* ---- tampon de bruit : deux secondes, deterministe, flux dedie ---- */
    var noiseBuf = (function () {
      var n = Math.floor(sr * 2), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = nrnd() * 2 - 1;
      return b;
    })();
    function noise(t, dur, rng) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      var off = (rng || mrnd)() * 1.8;
      s.start(t, off, dur + 0.02); s.stop(t + dur + 0.02); return s;
    }

    /* ---- enveloppes ---- */
    function pluck(p, t, a, d, peak) {
      p.setValueAtTime(0.0001, t);
      p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
      p.exponentialRampToValueAtTime(0.0001, t + a + d);
    }

    /* ================================ nappe ================================
       Voix permanentes : deux dents de scie desaccordees par voix, retunees a chaque accord par
       setTargetAtTime — d'ou le glissando lent, signature du genre. Zero creation de noeud en jeu. */
    var padVoices = [], padFilter, padBase = 900;
    (function () {
      var mix = ctx.createGain(); mix.gain.value = 0.25;
      padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass';
      padFilter.frequency.value = padBase; padFilter.Q.value = 2.6;
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
      /* chorus : deux retards courts modules, ouvre le stereo sans rien couter */
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
      /* respiration du filtre : deux oscillateurs lents incommensurables, jamais le meme cycle */
      [[0.0371, 320], [0.0137, 180]].forEach(function (c) {
        var l = ctx.createOscillator(); l.type = 'sine'; l.frequency.value = c[0];
        var g = ctx.createGain(); g.gain.value = c[1];
        l.connect(g); g.connect(padFilter.frequency); l.start(0);
      });
    })();
    /* l'accord : fondamentale ramenee dans E3..D#4, tierce selon la qualite de l'accord */
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
    function bassNote(t, midi, dur, vel) {
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7;
      var f0 = 120 + 90 * vel, f1 = f0 + 1500 + 1700 * tSmooth;
      lp.frequency.setValueAtTime(f1, t);
      lp.frequency.exponentialRampToValueAtTime(f0, t + Math.min(0.26, dur * 0.9));
      var saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = hz(midi);
      /* le renfort sinusoidal a la MEME octave : un sub a l'octave du dessous (27 a 50 Hz) n'est
         rendu par aucun haut-parleur de telephone et ne faisait que manger la marge du master */
      var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = hz(midi);
      var sg = ctx.createGain(); sg.gain.value = 0.45;
      saw.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(g); g.connect(LAY.bass);
      pluck(g.gain, t, 0.006, dur, MIX.bass * vel);
      saw.start(t); sub.start(t); saw.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
    }

    /* ================================ batterie ================================ */
    function kick(t, vel) {
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(132, t);
      o.frequency.exponentialRampToValueAtTime(43, t + 0.085);
      var g = ctx.createGain(); o.connect(g); g.connect(LAY.drum);
      pluck(g.gain, t, 0.003, 0.26, MIX.drum * vel);
      var c = noise(t, 0.012), hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 1400;
      var cg = ctx.createGain(); c.connect(hp); hp.connect(cg); cg.connect(LAY.drum);
      pluck(cg.gain, t, 0.001, 0.014, MIX.drum * vel * 0.35);
      o.start(t); o.stop(t + 0.3);
      send(g, MIX.revSend.drum * 0.3);
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
      send(g, MIX.revSend.drum);          /* la grosse reverberation vit ici */
    }
    function hat(t, vel, open) {
      var d = open ? 0.19 : 0.038, n = noise(t, d);
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7600;
      var g = ctx.createGain(); n.connect(hp); hp.connect(g); g.connect(LAY.drum);
      pluck(g.gain, t, 0.001, d, MIX.drum * vel * (open ? 0.3 : 0.22));
      if (open) send(g, MIX.revSend.drum * 0.5);
    }
    function clap(t, vel) {
      for (var i = 0; i < 3; i++) {
        var tt = t + i * 0.011, n = noise(tt, 0.06);
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = 1150; bp.Q.value = 1.1;
        var g = ctx.createGain(); n.connect(bp); bp.connect(g); g.connect(LAY.drum);
        pluck(g.gain, tt, 0.001, i === 2 ? 0.1 : 0.03, MIX.drum * vel * 0.4);
        if (i === 2) send(g, MIX.revSend.drum * 1.2);
      }
    }
    function tom(t, vel, p) {
      var o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(p, t); o.frequency.exponentialRampToValueAtTime(p * 0.6, t + 0.14);
      var g = ctx.createGain(); o.connect(g); g.connect(LAY.drum);
      pluck(g.gain, t, 0.002, 0.16, MIX.drum * vel * 0.6);
      o.start(t); o.stop(t + 0.2);
      send(g, MIX.revSend.drum * 0.8);
    }

    /* ================================ lead ================================
       Dent de scie et triangle (plus de carre : ses harmoniques impaires piquaient entre 2 et 5 kHz),
       filtre qui se referme de 3 kHz a 1,1 kHz : le lead chante au chaos sans devenir criard. */
    var leadDelay, leadFb;
    (function () {
      leadDelay = ctx.createDelay(1.2); leadDelay.delayTime.value = 0.28;
      leadFb = ctx.createGain(); leadFb.gain.value = 0.34;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      leadDelay.connect(lp); lp.connect(leadFb); leadFb.connect(leadDelay);
      var p = ctx.createStereoPanner(); p.pan.value = 0.35;
      leadDelay.connect(p); p.connect(LAY.lead);
    })();
    function leadNote(t, midi, dur, vel) {
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.5;
      lp.frequency.setValueAtTime(3000, t);
      lp.frequency.exponentialRampToValueAtTime(1100, t + dur + 0.08);
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

    /* ================================ esquive ================================
       Les sons d'information passent AU-DESSUS : le bus musical sec plonge brievement. Que des
       setTargetAtTime, jamais d'annulation : deux esquives qui se chevauchent restent continues. */
    function duck(t, amt, rel) {
      if (!(amt > 0)) return;
      var p = musicDuck.gain;
      p.setTargetAtTime(Math.max(0.05, 1 - amt), t, 0.01);
      p.setTargetAtTime(1, t + 0.05, Math.max(0.02, rel / 3));
    }

    /* ================================ sons d'information ================================ */
    /* une note de la pentatonique mineure de la tonalite courante, ramenee a +-6 demi-tons de la */
    function keyNote(base, idx) {
      var k = ((keyOff % 12) + 12) % 12; if (k > 6) k -= 12;
      idx = idx < 0 ? 0 : idx | 0;
      return base + k + 12 * Math.floor(idx / 5) + PENTA[idx % 5];
    }
    function voice(t, type, f0, f1, gl, a, d, peak, lpf, out) {
      var o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + gl);
      var g = ctx.createGain(); pluck(g.gain, t, a, d, peak);
      if (lpf) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpf; lp.Q.value = 0.7; o.connect(lp); lp.connect(g); }
      else o.connect(g);
      g.connect(out || sfxBus);
      o.start(t); o.stop(t + a + d + 0.03);
      return g;
    }
    function burst(t, ftype, f, q, a, d, peak) {
      var n = noise(t, a + d, srnd), fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.value = f; fl.Q.value = q;
      var g = ctx.createGain(); pluck(g.gain, t, a, d, peak);
      n.connect(fl); fl.connect(g); g.connect(sfxBus);
      return g;
    }
    function vary(x) { return 1 + (srnd() - 0.5) * x; }

    /* chaque son rend sa duree ; g est le gain d'usure (1 pour un son isole) */
    var SFX = {
      tir: function (t, o, g) {
        var k = (o.pitch | 0) % 5; if (k < 0) k += 5;
        var f = hz(keyNote(69, [0, 2, 1, 3, 4][k])) * vary(0.012), d = 0.048 + srnd() * 0.016;
        voice(t, 'triangle', f, f * 0.42, d, 0.002, d, 0.08 * g, 1700);
        burst(t, 'bandpass', 1000 + srnd() * 300, 0.9, 0.001, 0.016, 0.027 * g);
        return d + 0.03;
      },
      kill: function (t, o, g) {
        var c = clamp(o.pitch | 0, 0, 9), f = hz(keyNote(57, 5 + c)) * vary(0.01);   /* la4 puis la gamme monte */
        var body = voice(t, 'triangle', f * 0.7, f, 0.03, 0.002, 0.18, 0.17 * g, 0);
        /* l'octave carree, filtree sous 1,8 kHz : la presence dans les mediums, ou le telephone porte */
        voice(t, 'square', f * 2, f * 2, 0, 0.002, 0.08, 0.06 * g, 1800);
        burst(t, 'bandpass', 1000 + srnd() * 250, 0.9, 0.001, 0.05, 0.17 * g);
        voice(t, 'sine', 160, 55, 0.08, 0.002, 0.1, 0.04 * g, 0);
        send(body, MIX.revSend.sfx, 's');
        duck(t, MIX.duckKill * g, 0.18);
        return 0.25;
      },
      bigkill: function (t, o, g) {
        var v = vary(0.12);
        voice(t, 'sine', 118 * v, 30, 0.9, 0.004, 1.05, 0.20 * g, 0);           /* chute de sub */
        voice(t, 'triangle', 260 * v, 90, 0.3, 0.003, 0.34, 0.30 * g, 0);       /* le coup, dans les mediums */
        var n = noise(t, 1.4, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9;
        lp.frequency.setValueAtTime(2000 * v, t); lp.frequency.exponentialRampToValueAtTime(110, t + 1.15);
        var ng = ctx.createGain(); pluck(ng.gain, t, 0.004, 1.25, 0.46 * g);
        n.connect(lp); lp.connect(ng); ng.connect(sfxBus);
        /* l'identite de l'explosion portee dans les mediums : un haut-parleur de telephone ne rend pas le sub */
        burst(t, 'bandpass', 650 * v, 0.7, 0.002, 0.22, 0.30 * g);
        var cr = voice(t, 'sawtooth', 240 * v, 42, 0.45, 0.002, 0.5, 0.14 * g, 1300);   /* le grincement */
        send(ng, MIX.revSend.sfx * 2.6, 's'); send(cr, MIX.revSend.sfx * 1.6, 's');
        duck(t, MIX.duckBig, 0.8);
        return 1.4;
      },
      degat: function (t, o, g) {
        var v = vary(0.1), gg = ctx.createGain(); pluck(gg.gain, t, 0.003, 0.36, 0.27 * g); gg.connect(sfxBus);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 2; lp.connect(gg);
        [-14, 14].forEach(function (dt) {
          var oo = ctx.createOscillator(); oo.type = 'sawtooth'; oo.detune.value = dt;
          oo.frequency.setValueAtTime(290 * v, t); oo.frequency.exponentialRampToValueAtTime(80 * v, t + 0.34);
          oo.connect(lp); oo.start(t); oo.stop(t + 0.42);
        });
        burst(t, 'bandpass', 700, 1, 0.001, 0.09, 0.18 * g);
        send(gg, MIX.revSend.sfx * 1.2, 's'); duck(t, MIX.duckHurt, 0.45);
        return 0.42;
      },
      butin: function (t, o, g) {
        var k = (o.pitch | 0) % 8; if (k < 0) k += 8;
        var f = hz(keyNote(69, k)) * vary(0.008);
        var a = voice(t, 'triangle', f, f, 0, 0.003, 0.13, 0.11 * g, 0);
        voice(t, 'sine', f * 1.5, f * 1.5, 0, 0.003, 0.09, 0.025 * g, 0);
        send(a, MIX.revSend.sfx, 's');
        return 0.16;
      },
      intro: function (t, o, g) {
        var n = noise(t, 2.0, srnd), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.6;
        lp.frequency.setValueAtTime(160, t); lp.frequency.exponentialRampToValueAtTime(2600, t + 1.9);
        var gg = ctx.createGain();
        gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.16 * g, t + 1.88);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
        n.connect(lp); lp.connect(gg); gg.connect(sfxBus);
        var root = ROOT_BASS + keyNote(0, 0);
        var dr = ctx.createOscillator(); dr.type = 'sawtooth';
        dr.frequency.setValueAtTime(hz(root - 12), t); dr.frequency.exponentialRampToValueAtTime(hz(root), t + 1.9);
        var dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 420;
        var dg = ctx.createGain();
        dg.gain.setValueAtTime(0.0001, t); dg.gain.linearRampToValueAtTime(0.2 * g, t + 1.85);
        dg.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
        dr.connect(dl); dl.connect(dg); dg.connect(sfxBus); dr.start(t); dr.stop(t + 2.4);
        send(gg, MIX.revSend.sfx * 1.6, 's');
        SFX.bigkill(t + 1.95, {}, g);
        return 3.4;
      },
      defi: function (t, o, g) {
        var base = keyNote(69, 0);           /* la tonique, en MAJEUR : la reussite */
        [[0, 0, 0.1], [4, 0.09, 0.1], [7, 0.18, 0.1], [12, 0.27, 0.42]].forEach(function (c) {
          var f = hz(base + c[0]);
          var a = voice(t + c[1], 'triangle', f, f, 0, 0.004, c[2], 0.185 * g, 0);
          voice(t + c[1], 'square', f, f, 0, 0.004, c[2], 0.038 * g, 2200);
          send(a, MIX.revSend.sfx * 1.4, 's');
        });
        duck(t, MIX.duckInfo, 0.6);
        return 0.75;
      },
      neutre: function (t, o, g) {
        var f = hz(keyNote(69, 3 + srnd() * 3));
        voice(t, 'triangle', f, f * 0.94, 0.08, 0.003, 0.09, 0.10 * g, 1600);
        return 0.12;
      }
    };
    /* fusion (s), plafond de voix, usure */
    var SCFG = {
      tir: { win: 0.035, cap: 3, usure: 0.30 },
      kill: { win: 0.022, cap: 4, usure: 0.35 },
      bigkill: { win: 0.12, cap: 2, usure: 0.50 },
      degat: { win: 0.08, cap: 2, usure: 0.40 },
      butin: { win: 0.045, cap: 3, usure: 0.25 },
      intro: { win: 0.40, cap: 2, usure: 0 },
      defi: { win: 0.30, cap: 1, usure: 0 },
      neutre: { win: 0.05, cap: 2, usure: 0.30 }
    };
    var sst = {}, jr = { joues: {}, fusionnes: 0, plafonnes: 0 };
    function play(name, t, o) {
      var key = has(SFX, name) ? name : 'neutre';
      var c = SCFG[key], s = sst[key] || (sst[key] = { last: -1e9, dens: 0, ends: [] });
      if (t - s.last < c.win) { jr.fusionnes++; return; }
      s.dens = s.dens * Math.exp(-(t - s.last)) + 1; s.last = t;
      var live = [];
      for (var i = 0; i < s.ends.length; i++) if (s.ends[i] > t) live.push(s.ends[i]);
      s.ends = live;
      if (live.length >= c.cap) { jr.plafonnes++; return; }
      var g = 1 / Math.sqrt(1 + c.usure * (s.dens - 1));
      var len = SFX[key](t, o || {}, g);
      s.ends.push(t + (len || 0.2));
      jr.joues[key] = (jr.joues[key] || 0) + 1;
    }

    /* ================================ anti-repetition ================================ */
    var mem = {};
    function pick(slot, pool) {
      var m = mem[slot] || (mem[slot] = { v: -1, n: 0 });
      for (var k = 0; k < 16; k++) {
        var i = (mrnd() * pool.length) | 0; if (i >= pool.length) i = pool.length - 1;
        if (i === m.v && m.n >= 2) continue;               /* deja deux fois : refuse */
        if (i === m.v) m.n++; else { m.v = i; m.n = 1; }
        return pool[i];
      }
      var j = (m.v + 1) % pool.length; m.v = j; m.n = 1; return pool[j];   /* poche trop petite */
    }
    var barMem = { sig: '', n: 0 }, barSigs = [];
    function barGuard(sig) {                 /* vrai s'il faut relancer un tirage */
      if (sig === barMem.sig) { if (barMem.n >= 2) return true; barMem.n++; return false; }
      barMem.sig = sig; barMem.n = 1; return false;
    }

    /* ================================ etat de composition ================================ */
    var cur = 0, step = 0, bar = 0;
    var tTarget = 0, tSmooth = 0, bpm = BPM_LOW, stepDur = 60 / BPM_LOW / 4;
    var keyOff = 0;
    var ph = null, bp = null;                /* parametres de phrase, de mesure */
    var onDrum = false, onLead = false;

    function newPhrase() {
      ph = {
        grid: pick('grid', GRIDS),
        rate: pick('rate', HARM_RATE),
        bass: pick('bass', BASS),
        bassNorm: 1,
        kick: pick('kick', KICK),
        snare: pick('snare', SNARE),
        hat: pick('hat', HAT),
        shape: pick('shape', LEAD_SHAPE),
        rhy: pick('rhy', LEAD_RHY),
        voice: pick('voice', VOICING),
        fill: pick('fill', FILLS),
        brk: pick('brk', BREAKS)
      };
      ph.bassNorm = BASS_NORM[BASS.indexOf(ph.bass)];
    }
    function newBar() {
      var inPhrase = bar % 4;
      if (inPhrase === 0 || !ph) newPhrase();
      if (bar % 16 === 0) keyOff = pick('key', KEYS);
      var tries = 0, sig;
      do {
        bp = {
          hatMut: pick('hatMut', HAT_MUT),
          ghost: pick('ghost', BASS_GHOST),
          leadOct: pick('leadOct', LEAD_OCT),
          openHat: mrnd() < 0.22 + 0.2 * tSmooth,
          clapOn: tSmooth > 0.55 && mrnd() < 0.45
        };
        sig = ph.bass + ph.kick + ph.snare + ph.hat + ph.rhy + bp.hatMut + bp.ghost + bp.leadOct +
          (GRIDS.indexOf(ph.grid)) + inPhrase + keyOff + (bp.openHat ? 'o' : '') + (bp.clapOn ? 'c' : '');
      } while (barGuard(sig) && ++tries < 6);
      barSigs.push(sig);
      if (!offline && barSigs.length > 256) barSigs.shift();
      /* accord de la mesure */
      var ci = ph.rate === 2 ? ((bar >> 1) % 4) : (bar % 4);
      bp.chord = ph.grid[ci];
      bp.third = bp.chord[1] ? 4 : 3;
      bp.fill = (inPhrase === 3) ? ph.fill : 'none';
      bp.brk = (inPhrase === 3) ? ph.brk : 'none';
      /* tempo et couches : une seule fois par mesure, jamais en cours de mesure (G-31) */
      tSmooth = tTarget;
      bpm = BPM_LOW + (BPM_HIGH - BPM_LOW) * tSmooth;
      stepDur = 60 / bpm / 4;
      var barDur = stepDur * 16;
      onDrum = tSmooth >= (onDrum ? 0.14 : 0.20);
      onLead = tSmooth >= (onLead ? 0.62 : 0.68);
      /* la batterie entre a 70 % et monte avec la tension : le niveau croit aussi entre deux entrees */
      rampTo(LAY.drum.gain, onDrum ? MIX.drum * (0.7 + 0.3 * tSmooth) : 0, cur, barDur);
      rampTo(LAY.lead.gain, onLead ? MIX.lead : 0, cur, barDur);
      rampTo(LAY.pad.gain, MIX.pad * (1 - 0.1 * tSmooth), cur, barDur);
      rampTo(LAY.bass.gain, MIX.bass * (0.85 + 0.15 * tSmooth), cur, barDur);
      if (!muteMus) rampTo(musicLevel.gain, MIX.music + MIX.musicTension * tSmooth, cur, barDur);
      leadDelay.delayTime.setTargetAtTime(stepDur * 3, cur, 0.1);
      padFilter.frequency.setTargetAtTime(padBase + 900 * tSmooth, cur, barDur * 0.4);
      padSet(ROOT_PAD + keyOff + bp.chord[0], bp.third, ph.voice, cur);
    }
    function wrapRoot(r, lo) { while (r >= lo + 12) r -= 12; while (r < lo) r += 12; return r; }

    /* ---- un pas de double croche ---- */
    function doStep() {
      var s = step, t = cur, hushed = false;
      /* silences : la respiration qui empeche la lassitude */
      if (bp.brk === 'beat' && s >= 12) hushed = true;
      if (bp.brk === 'twobeat' && s >= 8) hushed = true;
      if (bp.brk === 'stab' && s >= 13) hushed = true;
      if (bp.brk === 'stab' && s === 12) { kick(t, 1); snare(t, 0.9); }

      var root = wrapRoot(ROOT_BASS + keyOff + bp.chord[0], 33);   /* A1..G#2 */
      /* basse */
      if (!hushed) {
        var c = ph.bass.charCodeAt(s) - 48;
        if (c >= 1 && c <= 4) {
          var add = c === 2 ? 12 : c === 3 ? 7 : c === 4 ? 10 : 0;
          bassNote(t, root + add, stepDur * (c === 1 ? 2.6 : 1.5), (0.85 + 0.15 * tSmooth) * ph.bassNorm);
        } else if (bp.ghost === 'off8' && (s === 6 || s === 14)) {
          bassNote(t, root + 12, stepDur * 0.8, 0.4);
        } else if (bp.ghost === 'slide' && s === 15) {
          bassNote(t, root + bp.third, stepDur, 0.5);
        }
      }
      /* batterie */
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
          else if (bp.fill === 'snare') { snare(t, 0.6 + (s - 12) * 0.13); }
          else if (bp.fill === 'kick16') { kick(t, 0.85); if (s === 15) snare(t, 1); }
          /* 'hush' : on ne joue rien, c'est le silence avant la reprise */
        }
      }
      /* lead : fondamentale ramenee dans C4..B4, arpege jusqu'a la quinte de l'octave au plus */
      if (onLead && !hushed && ph.rhy.charCodeAt(s) === 49) {
        var tones = [0, bp.third, 7, 12, 12 + bp.third, 19];
        var idx = ph.shape[(leadStep++) % ph.shape.length];
        var m = wrapRoot(ROOT_LEAD + keyOff + bp.chord[0], 60) + tones[idx] + bp.leadOct;
        leadNote(t, m, stepDur * 1.6, 0.75 + 0.25 * tSmooth);
      }
      cur += stepDur;
      step++;
      if (step >= 16) { step = 0; bar++; newBar(); }
    }
    var leadStep = 0;

    /* ---- ordonnanceur : place les evenements a l'avance sur l'horloge audio ---- */
    var running = false, begun = false;
    function schedUntil(horizon) {
      var guard = 0;
      while (cur < horizon && guard++ < 20000) doStep();
    }
    /* une mesure neuve a l'instant t, la composition continue : apres une veille, une coupure, un
       arret ou une horloge figee. Les couches sont figees a leur valeur, puis repartent a la mesure. */
    function resync(t) {
      var now = ctx.currentTime;
      ['pad', 'bass', 'drum', 'lead'].forEach(function (k) { hold(LAY[k].gain, now); });
      if (!muteMus) hold(musicLevel.gain, now);
      cur = Math.max(t, now + 0.02); step = 0; bar++;
      newBar();
    }
    function startAt(t) {
      if (!begun) { begun = true; cur = t; step = 0; bar = 0; leadStep = 0; newBar(); }
      else resync(t);
      running = true;
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

    var muffleAt = 0;
    return {
      ctx: ctx,
      startAt: startAt,
      resync: resync,
      schedUntil: schedUntil,
      isRunning: function () { return running; },
      stop: function (t) {
        running = false;
        ['pad', 'bass', 'drum', 'lead'].forEach(function (k) {
          var p = LAY[k].gain;
          hold(p, t); p.linearRampToValueAtTime(0, t + 0.25); p.__v = 0;
        });
      },
      setTension: function (v) { tTarget = clamp(+v || 0, 0, 1); },
      sfx: function (name, o) { play(name, ctx.currentTime + 0.012, o); },
      sfxAt: function (name, t, o) { play(name, t, o); },
      /* la porte : v 0 ou 1, constante de temps tc (0 = immediat) */
      gate: function (v, tc) { glide(gate.gain, v, tc); },
      /* l'etouffoir : 0 ouvert, sinon frequence de coupure ; ne touche le parametre qu'au changement */
      muffle: function (f) {
        if (f === muffleAt) return;
        var down = f > 0 && (muffleAt === 0 || f < muffleAt);
        muffleAt = f;
        glide(muffle.frequency, f > 0 ? f : OPEN, down ? 0.06 : 0.25);
      },
      rms: rmsMusic, rmsSfx: rmsSfxF, rmsOut: rmsOutF,
      cursor: function () { return cur; },
      barSigs: function () { return barSigs; },
      journal: function () { return jr; },
      info: function () {
        return {
          bar: bar, step: step, bpm: bpm, tension: tSmooth, key: keyOff,
          layers: 2 + (onDrum ? 1 : 0) + (onLead ? 1 : 0),
          grid: GRIDS.indexOf(ph ? ph.grid : null), fill: bp ? bp.fill : '', brk: bp ? bp.brk : '',
          muffle: muffleAt, gate: gate.gain.value
        };
      }
    };
  }

  /* ================================ face publique ================================ */
  var E = null, timer = null, resumeTries = 0, stale = 0, lastClock = -1;
  var wantMute = false, sleeping = false, needResync = false;
  var J = { appels: {}, ignores: 0 };

  /* l'etouffoir de la musique : la pause, puis le gel d'image long (« boss stop »), lus sur l'etat */
  function muffleTarget() {
    var S = N.S;
    if (S && S.paused) return 420;
    if (N.fx && typeof N.fx.hitstopLeft === 'function') {
      var h = 0; try { h = N.fx.hitstopLeft(); } catch (e) { h = 0; }
      if (h >= 10) return 900;
    }
    return 0;
  }
  /* relance un contexte 'suspended' ou 'interrupted' ; vrai s'il joue. Quarante essais au plus d'affilee
     (une interruption d'iOS peut durer tout un appel) ; resume() les rearme. */
  function wake() {
    var ctx = E.ctx, st = ctx.state;
    if (st === 'running') { resumeTries = 0; return true; }
    if (st === 'closed') return false;
    if (resumeTries++ < 40 && ctx.resume) { try { settle(ctx.resume()); } catch (e) { /* refuse : on reessaiera */ } }
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
    if (!E.isRunning()) return;
    if (wantMute) { needResync = true; return; }          /* coupe : rien ne s'ordonnance */
    if (E.cursor() < now - 0.25) needResync = true;       /* on s'est fait doubler */
    if (needResync) { needResync = false; if (E.cursor() < now + 0.06) E.resync(now + 0.06); }
    E.schedUntil(now + LOOKAHEAD);
  }
  function init() {
    if (E) return true;
    var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    E = build(new AC({ latencyHint: 'interactive' }), false, null);
    if (wantMute || sleeping) E.gate(0, 0);
    return true;
  }

  N.music = {
    init: init,
    start: function () {
      if (!E && !init()) return;
      if (E.isRunning()) return;
      if (!sleeping) wake();
      E.startAt(E.ctx.currentTime + 0.08);
      pump();
      if (!timer && typeof setInterval === 'function') timer = setInterval(pump, PUMP_MS);
    },
    stop: function () {
      if (!E || !E.isRunning()) return;
      E.stop(E.ctx.currentTime);
      if (timer) { clearInterval(timer); timer = null; }
    },
    tension: function (v) { if (!E) return; E.setTension(v); pump(); },
    sfx: function (name, o) {
      var k = String(name);
      J.appels[k] = (J.appels[k] || 0) + 1;
      if (!E || wantMute || sleeping) { J.ignores++; return; }
      /* horloge arretee ou figee : un son pose maintenant ressortirait plus tard, en paquet */
      if (E.ctx.state !== 'running' || stale > 30) { J.ignores++; return; }
      E.sfx(k, o);
    },
    mute: function (v) {
      v = !!v;
      if (v === wantMute) return wantMute;
      wantMute = v;
      if (E) {
        E.gate(v || sleeping ? 0 : 1, v ? FADE_OUT : FADE_IN);
        if (!v) { needResync = true; pump(); }
      }
      return wantMute;
    },
    muted: function () { return wantMute; },
    suspend: function () {
      if (sleeping) return;
      sleeping = true;
      if (!E) return;
      E.gate(0, 0.005);
      try { settle(E.ctx.suspend()); } catch (e) { /* deja suspendu ou ferme */ }
    },
    resume: function () {
      var was = sleeping;
      sleeping = false;
      if (!E) return;
      if (!was && E.ctx.state === 'running') return;     /* chaque geste l'appelle : rien a faire */
      resumeTries = 0;
      wake();
      E.gate(wantMute ? 0 : 1, FADE_IN);
      needResync = true;
      pump();
    },
    rms: function () { return E ? E.rms() : 0; },
    rmsSfx: function () { return E ? E.rmsSfx() : 0; },
    rmsOut: function () { return E ? E.rmsOut() : 0; },
    info: function () {
      if (!E) return null;
      var r = E.info(); r.state = E.ctx.state; r.muted = wantMute; r.sleeping = sleeping; r.running = E.isRunning();
      return r;
    },
    /* pour les tests seulement : le contexte, pour simuler une interruption du systeme */
    context: function () { return E ? E.ctx : null; },
    /* pour la preuve : appels par nom (connus ou non), sons joues, fusionnes, plafonnes, ignores */
    journal: function () {
      var j = E ? E.journal() : { joues: {}, fusionnes: 0, plafonnes: 0 };
      return { appels: J.appels, ignores: J.ignores, joues: j.joues, fusionnes: j.fusionnes, plafonnes: j.plafonnes };
    },

    /* PREUVE. Rend la musique hors ligne avec le MEME moteur que le jeu, donc ce qui est mesure est ce
       qui est joue. events : [{t, name, opts}] pour les sons d'information ; mute : 'music' ou 'sfx'. */
    renderOffline: function (seconds, tensionFn, events, rate, mute) {
      var OC = (typeof window !== 'undefined') && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
      if (!OC) return null;
      var sr = rate || 44100, dur = seconds;
      var ctx = new OC(2, Math.ceil(sr * dur), sr);
      var e = build(ctx, true, mute);
      e.startAt(0);
      var slice = 0.25;                     /* la tension est relue comme en jeu, par tranches */
      var evs = (events || []).slice().sort(function (a, c) { return a.t - c.t; }), ei = 0;
      function feed(t) {                    /* comme en jeu : on ne cree que ce qui va sonner bientot */
        if (tensionFn) e.setTension(tensionFn(t));
        e.schedUntil(Math.min(dur, t + slice + LOOKAHEAD));
        while (ei < evs.length && evs[ei].t < t + slice + LOOKAHEAD) { e.sfxAt(evs[ei].name, evs[ei].t, evs[ei].opts); ei++; }
      }
      if (typeof ctx.suspend === 'function') {
        /* rendu par tranches : des milliers de sons crees d'un coup resteraient tous branches des
           l'instant zero et ecraseraient le rendu ; suspendre le contexte hors ligne a chaque tranche
           reproduit l'ordonnancement en direct, noeuds crees juste a temps et liberes apres usage */
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
        return buf;
      });
    }
  };
  /* ================================ contrat 1.0 (squelette du lot 0b ; lots 7a et 7b) ================================
     load({base})       retient MUSIQUE_BASE ; le repli ne charge rien : la piste en blocs vient au lot 7a ;
     section(nom)       appelée par 79-jeu seulement ; journalisée ; le repli génératif continue ;
     cue, couche, danger, voix : retenus, sans effet audible dans le repli ;
     beat()             la phase AUDIO ; sans piste, la grille de jeu (N.horloge.temps()) ;
     mute(canal, b)     'musique' | 'effets' ; mute(b) sans canal coupe les deux, comme avant ;
     piste()            {pret, bloc, mesure, section, repli} ; noeuds() : nœuds audio créés (repli : 0). */
  var CANAL = { musique: false, effets: false }, PISTE = { pret: false, bloc: null, mesure: 0, section: null, repli: true };
  var BEAT = { bar: 0, beat: 0, phase: 0 }, BASE = null, COUCHES = {}, DANGER = 0;
  var muteTout = N.music.mute, demarrer = N.music.start, arreter = N.music.stop, sonner = N.music.sfx;
  function canaux() {
    if (CANAL.musique && CANAL.effets) { muteTout(true); return; }
    muteTout(false);
    if (CANAL.musique) arreter(); else if (N.music.info && N.music.info()) demarrer();
  }
  N.music.mute = function (canal, b) {
    if (typeof canal === 'string') {
      if (canal !== 'musique' && canal !== 'effets') return false;
      b = !!b;
      if (CANAL[canal] !== b) { CANAL[canal] = b; canaux(); }
      return CANAL[canal];
    }
    CANAL.musique = CANAL.effets = !!canal;
    return muteTout(!!canal);
  };
  N.music.start = function () { if (CANAL.musique) return; demarrer(); };
  N.music.stop = function () { arreter(); };
  N.music.sfx = function (nom, o) { if (CANAL.effets) return; sonner(nom, o); };
  N.music.load = function (o) { BASE = (o && typeof o.base === 'string') ? o.base : (typeof MUSIQUE_BASE !== 'undefined' ? MUSIQUE_BASE : null); PISTE.repli = true; return BASE; };
  N.music.section = function (nom) {
    if (N.ids && N.ids.sections.indexOf(nom) < 0) return false;
    if (PISTE.section !== nom) { PISTE.section = nom; if (N.journal) N.journal('section', { nom: nom }); }
    return true;
  };
  N.music.cue = function (nom) { return !!(N.ids && N.ids.cues.indexOf(nom) >= 0); };
  N.music.couche = function (nom, b) { COUCHES[nom] = !!b; return COUCHES[nom]; };
  N.music.danger = function (v) { DANGER = Math.max(0, Math.min(1, +v || 0)); return DANGER; };
  N.music.beat = function () {
    var t = N.horloge && N.horloge.temps ? N.horloge.temps() : null;
    BEAT.bar = t ? t.mesure : 0; BEAT.beat = t ? t.temps : 0; BEAT.phase = t ? t.phase : 0;
    return BEAT;
  };
  N.music.voix = function (mot) { return !!(N.ids && N.ids.voix.indexOf(mot) >= 0); };
  N.music.piste = function () { var t = N.horloge && N.horloge.temps ? N.horloge.temps() : null; PISTE.mesure = t ? t.mesure : 0; return PISTE; };
  N.music.noeuds = function () { return 0; };
  N.music.canaux = function () { return CANAL; };


})();
