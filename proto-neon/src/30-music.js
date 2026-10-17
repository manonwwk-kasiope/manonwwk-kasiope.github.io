/* 30-music.js — moteur musical generatif de NEON 2084.  Proprietaire unique de N.music.
   Aucun fichier audio : basse, batterie, nappe, lead et sons d'information sont synthetises.

   LA REGLE D'OR — rien ne se repete a l'identique plus de deux fois. Elle n'est pas obtenue par du
   bruit : chaque decision musicale est tiree d'une POCHE de motifs par pick(), qui refuse
   mecaniquement un troisieme tirage identique consecutif, et barGuard() interdit en plus qu'une
   mesure entiere (son empreinte complete) sorte trois fois de suite. La repetition est donc
   impossible par construction, pas improbable par chance.

   HORLOGE. Tout est cale sur ctx.currentTime, l'horloge audio. Aucun Date.now, aucun
   performance.now, aucun setTimeout pour la justesse rythmique : setInterval ne sert qu'a reveiller
   l'ordonnanceur, qui place les evenements a l'avance sur l'horloge audio.

   ALEA. Toutes les decisions passent par le generateur de N (N.rnd, meme suite congruentielle), mais
   sur un ETAT PROPRE a la musique : mk() depose son etat dans N.S.rngState, appelle N.rnd, puis
   restaure l'etat du jeu. Deux raisons :
     1. la musique est ordonnancee sur l'horloge audio, donc le nombre de tirages entre deux images
        varie d'une execution a l'autre ; si elle puisait dans le flux partage elle detruirait la
        reproductibilite a graine fixe du JEU (apparition des ennemis, criteres 6 et 2).
     2. la graine musicale derive de N.S.seed par une fonction fixe, donc a graine imposee la
        musique est rejouable a l'identique, independamment de ce que le jeu a tire avant.
   Deux sous-flux separes : les choix musicaux et le remplissage du tampon de bruit. Separes parce
   que le tampon depend de la frequence d'echantillonnage : sans cela, un telephone a 48 kHz et un
   bureau a 44,1 kHz ne joueraient pas la meme musique a graine egale.

   N.music.rms() rend le niveau de LA MUSIQUE (bus musical apres niveau et esquive), sons
   d'information exclus : c'est ce que demande le critere 6. rmsSfx() et rmsOut() completent.

   VEILLE. Aucun ecouteur DOM ici : 90-boot.js est seul autorise a toucher au DOM. La reprise se
   fait dans pump(), appele a chaque image par tension() et par le reveil : si le contexte est
   'suspended' ou 'interrupted' (iOS), on le relance ; si l'horloge a saute, on se recale sur une
   mesure au lieu de deverser les evenements manques.
*/

var N = (typeof window !== 'undefined' && window.__N) || {};
if (typeof window !== 'undefined') window.__N = N;

(function () {

  /* ================================ reglage du melange ================================
     Valeurs mesurees, pas devinees : voir tools/compositeur/preuve.mjs. */
  var MIX = {
    master: 0.90,
    music: 0.62,        // niveau du bus musical a tension 0
    musicTension: 0.40, // ce que la tension ajoute : le RMS croit meme a nombre de couches egal
    sfx: 1.00,
    pad: 0.30, bass: 0.72, drum: 0.80, lead: 0.34,
    revSend: { drum: 0.26, lead: 0.30, sfx: 0.20, bass: 0.0, pad: 0.10 },
    duckKill: 0.30, duckBig: 0.52, duckInfo: 0.16
  };
  var BPM_LOW = 112, BPM_HIGH = 128;
  var LOOKAHEAD = 0.26, PUMP_MS = 40;
  var ROOT_BASS = 33, ROOT_PAD = 48, ROOT_LEAD = 72;   /* la mineur : A1, A3, A5 */

  /* ================================ outils ================================ */
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* sous-flux : la suite de N.rnd, sur un etat qui n'est pas celui du jeu */
  function mk(seed) {
    var st = seed >>> 0;
    return function () {
      var S = N.S, v;
      if (S && N.rnd) {
        var keep = S.rngState; S.rngState = st; v = N.rnd(); st = S.rngState; S.rngState = keep;
      } else {                                     /* module isole : meme suite, en local */
        st = (st * 1664525 + 1013904223) % 4294967296; v = st / 4294967296;
      }
      return v;
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
  var LEAD_OCT = [0, 0, 0, 12, -12];
  var VOICING = [[0, 3, 7, 12], [0, 7, 12, 15], [-12, 0, 15, 19], [0, 3, 10, 19], [0, 7, 10, 12]];
  var BASS_GHOST = ['none', 'none', 'off8', 'slide'];

  /* ================================ le moteur ================================
     build() construit un moteur complet sur un contexte quelconque. Le jeu en instancie un sur un
     AudioContext ; la preuve en instancie un second sur un OfflineAudioContext. Le code de synthese
     et de composition est le MEME : la preuve mesure donc bien ce qui est joue. */
  function build(ctx, offline, mute) {

    var sr = ctx.sampleRate;
    var muteMus = mute === 'music', muteSfx = mute === 'sfx';
    var mrnd = mk(musicSeed());                      /* choix musicaux */
    var nrnd = mk((musicSeed() ^ 0x5bf03635) >>> 0);  /* bruit : flux separe, voir l'entete */

    /* ---- limiteur doux : borne les cretes sans comprimer la dynamique utile ----
       Un compresseur ecraserait l'ecart de 9 dB entre son d'information et musique. Une tangente
       hyperbolique est transparente sous -10 dBFS et ne fait que replier les cretes. */
    function softClipCurve(n) {
      var c = new Float32Array(n), k = 1.45, d = Math.tanh(k);
      for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / d; }
      return c;
    }

    /* ---- bus ---- */
    var master = ctx.createGain(); master.gain.value = MIX.master;
    var shaper = ctx.createWaveShaper();
    shaper.curve = softClipCurve(2048); shaper.oversample = '2x';
    master.connect(shaper); shaper.connect(ctx.destination);

    var musicBus = ctx.createGain();        /* somme des quatre couches, sec */
    var musicLevel = ctx.createGain(); musicLevel.gain.value = muteMus ? 0 : MIX.music;
    var musicDuck = ctx.createGain(); musicDuck.gain.value = 1;
    musicBus.connect(musicLevel); musicLevel.connect(musicDuck); musicDuck.connect(master);

    var sfxBus = ctx.createGain(); sfxBus.gain.value = muteSfx ? 0 : MIX.sfx;
    sfxBus.connect(master);

    var LAY = {};
    ['pad', 'bass', 'drum', 'lead'].forEach(function (k) {
      var g = ctx.createGain();
      g.gain.value = (k === 'pad' || k === 'bass') ? MIX[k] : 0;
      g.connect(musicBus); LAY[k] = g;
    });

    /* ---- reverberation : reseau de retards retroactifs. Pas de fichier d'impulsion, pas de
       convolution : quatre peignes passe-bas et deux passe-tout, c'est la grosse plaque de 1984
       pour un cout negligeable sur telephone. ---- */
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
      revOut.connect(master);
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
    function noise(t, dur) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      var off = mrnd() * 1.8;
      s.start(t, off, dur + 0.02); s.stop(t + dur + 0.02); return s;
    }

    /* ---- enveloppes ---- */
    function adsr(p, t, a, d, peak, sus, rel) {
      p.setValueAtTime(0.0001, t);
      p.linearRampToValueAtTime(peak, t + a);
      if (sus > 0) { p.linearRampToValueAtTime(peak * sus, t + a + d); p.setValueAtTime(peak * sus, t + a + d + rel); }
      p.exponentialRampToValueAtTime(0.0001, t + a + d + rel + 0.01);
    }
    function pluck(p, t, a, d, peak) {
      p.setValueAtTime(0.0001, t);
      p.linearRampToValueAtTime(peak, t + a);
      p.exponentialRampToValueAtTime(0.0001, t + a + d);
    }

    /* ================================ nappe ================================
       Voix permanentes : deux dents de scie desaccordees par voix, retunees a chaque accord par
       setTargetAtTime — d'ou le glissando lent, signature du genre. Zero creation de noeud en jeu. */
    var padVoices = [], padFilter, padBase = 760;
    (function () {
      var mix = ctx.createGain(); mix.gain.value = 0.25;
      padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass';
      padFilter.frequency.value = padBase; padFilter.Q.value = 3.2;
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
    function padSet(rootMidi, voicing, t) {
      for (var i = 0; i < 4; i++) {
        var f = hz(rootMidi + voicing[i]);
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
      var sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = hz(midi - 12);
      var sg = ctx.createGain(); sg.gain.value = 0.55;
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

    /* ================================ lead ================================ */
    var leadDelay, leadFb;
    (function () {
      leadDelay = ctx.createDelay(1.2); leadDelay.delayTime.value = 0.28;
      leadFb = ctx.createGain(); leadFb.gain.value = 0.36;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
      leadDelay.connect(lp); lp.connect(leadFb); leadFb.connect(leadDelay);
      var p = ctx.createStereoPanner(); p.pan.value = 0.35;
      leadDelay.connect(p); p.connect(LAY.lead);
    })();
    function leadNote(t, midi, dur, vel) {
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
      lp.frequency.setValueAtTime(5200, t);
      lp.frequency.exponentialRampToValueAtTime(1500, t + dur + 0.08);
      var a = ctx.createOscillator(), b = ctx.createOscillator();
      a.type = 'sawtooth'; b.type = 'square';
      a.frequency.value = hz(midi); b.frequency.value = hz(midi);
      a.detune.value = -7; b.detune.value = 8;
      var bg = ctx.createGain(); bg.gain.value = 0.4;
      a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g);
      g.connect(LAY.lead); g.connect(leadDelay);
      pluck(g.gain, t, 0.008, dur + 0.05, MIX.lead * vel);
      a.start(t); b.start(t); a.stop(t + dur + 0.1); b.stop(t + dur + 0.1);
      send(g, MIX.revSend.lead);
    }

    /* ================================ esquive ================================
       Les sons d'information passent AU-DESSUS : le bus musical sec plonge brievement. Un noeud
       dedie, pour ne jamais interferer avec la rampe de niveau pilotee par la tension. */
    function duck(t, amt, rel) {
      var p = musicDuck.gain;
      p.cancelScheduledValues(t);
      p.setValueAtTime(Math.max(0.0001, 1 - amt), t + 0.008);
      p.linearRampToValueAtTime(1, t + 0.008 + rel);
    }

    /* ================================ sons d'information ================================ */
    function sfxGain(peak, a, d, t) {
      var g = ctx.createGain(); g.connect(sfxBus);
      pluck(g.gain, t, a, d, peak); return g;
    }
    var SFX = {
      tir: function (t, o) {
        var g = sfxGain(0.30, 0.002, 0.075, t);
        var osc = ctx.createOscillator(); osc.type = 'square';
        var f = 1250 * Math.pow(2, ((o.pitch || 0) % 5) / 24);
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.075);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
        osc.connect(lp); lp.connect(g); osc.start(t); osc.stop(t + 0.1);
        var n = noise(t, 0.02), hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 3000;
        var ng = sfxGain(0.1, 0.001, 0.02, t); n.connect(hp); hp.connect(ng);
      },
      kill: function (t, o) {
        var st = clamp((o.pitch || 0), 0, 14);          /* un demi-ton par palier d'enchainement */
        var m = 79 + st, g = sfxGain(0.58, 0.002, 0.26, t);
        [0, 7].forEach(function (iv, i) {
          var osc = ctx.createOscillator(); osc.type = i ? 'triangle' : 'square';
          osc.frequency.setValueAtTime(hz(m + iv) * 0.6, t);
          osc.frequency.exponentialRampToValueAtTime(hz(m + iv), t + 0.045);
          var og = ctx.createGain(); og.gain.value = i ? 0.45 : 1;
          osc.connect(og); og.connect(g); osc.start(t); osc.stop(t + 0.3);
        });
        var n = noise(t, 0.05), hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 2600;
        var ng = sfxGain(0.22, 0.001, 0.05, t); n.connect(hp); hp.connect(ng);
        send(g, MIX.revSend.sfx, 's'); duck(t, MIX.duckKill, 0.22);
      },
      bigkill: function (t) {
        /* l'explosion : chute sub, souffle large a filtre descendant, queue de reverberation */
        var sub = ctx.createOscillator(); sub.type = 'sine';
        sub.frequency.setValueAtTime(138, t);
        sub.frequency.exponentialRampToValueAtTime(27, t + 1.0);
        var sg = sfxGain(0.95, 0.004, 1.15, t); sub.connect(sg);
        sub.start(t); sub.stop(t + 1.3);
        var n = noise(t, 1.5);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.5;
        lp.frequency.setValueAtTime(7200, t);
        lp.frequency.exponentialRampToValueAtTime(140, t + 1.2);
        var ng = sfxGain(0.62, 0.003, 1.3, t); n.connect(lp); lp.connect(ng);
        var cr = ctx.createOscillator(); cr.type = 'sawtooth';
        cr.frequency.setValueAtTime(420, t);
        cr.frequency.exponentialRampToValueAtTime(48, t + 0.5);
        var cg = sfxGain(0.3, 0.002, 0.55, t); cr.connect(cg);
        cr.start(t); cr.stop(t + 0.7);
        send(ng, MIX.revSend.sfx * 3.2, 's'); send(cg, MIX.revSend.sfx * 2, 's');
        duck(t, MIX.duckBig, 0.85);
      },
      degat: function (t) {
        var g = sfxGain(0.55, 0.003, 0.4, t);
        var o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(330, t);
        o.frequency.exponentialRampToValueAtTime(72, t + 0.38);
        var s = ctx.createOscillator(); s.type = 'square';
        s.frequency.setValueAtTime(165, t);
        s.frequency.exponentialRampToValueAtTime(36, t + 0.38);
        var sg2 = ctx.createGain(); sg2.gain.value = 0.5;
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
        o.connect(lp); s.connect(sg2); sg2.connect(lp); lp.connect(g);
        o.start(t); s.start(t); o.stop(t + 0.45); s.stop(t + 0.45);
        var n = noise(t, 0.09), ng = sfxGain(0.3, 0.001, 0.09, t);
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700;
        n.connect(bp); bp.connect(ng);
        send(g, MIX.revSend.sfx * 1.4, 's'); duck(t, MIX.duckBig * 0.8, 0.5);
      },
      butin: function (t, o) {
        var m = 84 + ((o.pitch || 0) % 4) * 2;
        [[0, 0], [4, 0.07]].forEach(function (c) {
          var g = sfxGain(0.34, 0.002, 0.16, t + c[1]);
          var osc = ctx.createOscillator(); osc.type = 'triangle';
          osc.frequency.value = hz(m + c[0]);
          var h = ctx.createOscillator(); h.type = 'sine';
          h.frequency.value = hz(m + c[0] + 12);
          var hg = ctx.createGain(); hg.gain.value = 0.3;
          osc.connect(g); h.connect(hg); hg.connect(g);
          osc.start(t + c[1]); h.start(t + c[1]);
          osc.stop(t + c[1] + 0.2); h.stop(t + c[1] + 0.2);
          send(g, MIX.revSend.sfx, 's');
        });
        duck(t, MIX.duckInfo, 0.18);
      },
      intro: function (t) {
        var n = noise(t, 2.2);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
        lp.frequency.setValueAtTime(180, t);
        lp.frequency.exponentialRampToValueAtTime(6500, t + 1.9);
        var g = ctx.createGain(); g.connect(sfxBus);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.4, t + 1.9);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.25);
        n.connect(lp); lp.connect(g);
        var dr = ctx.createOscillator(); dr.type = 'sawtooth';
        dr.frequency.setValueAtTime(hz(ROOT_BASS - 12), t);
        dr.frequency.exponentialRampToValueAtTime(hz(ROOT_BASS), t + 1.9);
        var dg = sfxGain(0.42, 1.85, 0.5, t);
        var dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 400;
        dr.connect(dlp); dlp.connect(dg); dr.start(t); dr.stop(t + 2.4);
        SFX.bigkill(t + 1.95);
        send(g, MIX.revSend.sfx * 2, 's');
      },
      defi: function (t) {
        [[0, 0], [7, 0.13], [12, 0.26]].forEach(function (c) {
          var tt = t + c[1], g = sfxGain(0.46, 0.004, c[1] > 0.2 ? 0.4 : 0.1, tt);
          var o = ctx.createOscillator(); o.type = 'square';
          o.frequency.value = hz(76 + keyOff + c[0]);
          var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600;
          o.connect(lp); lp.connect(g); o.start(tt); o.stop(tt + 0.5);
          send(g, MIX.revSend.sfx * 1.5, 's');
        });
        duck(t, MIX.duckInfo * 1.4, 0.45);
      }
    };

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
        kick: pick('kick', KICK),
        snare: pick('snare', SNARE),
        hat: pick('hat', HAT),
        shape: pick('shape', LEAD_SHAPE),
        rhy: pick('rhy', LEAD_RHY),
        voice: pick('voice', VOICING),
        fill: pick('fill', FILLS),
        brk: pick('brk', BREAKS)
      };
    }
    function newBar() {
      var inPhrase = bar % 4;
      if (inPhrase === 0) newPhrase();
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
      /* accord de la mesure */
      var ci = ph.rate === 2 ? ((bar >> 1) % 4) : (bar % 4);
      bp.chord = ph.grid[ci];
      bp.third = bp.chord[1] ? 4 : 3;
      bp.fill = (inPhrase === 3) ? ph.fill : 'none';
      bp.brk = (inPhrase === 3) ? ph.brk : 'none';
      /* tempo et couches : une seule fois par mesure, jamais en cours de mesure */
      tSmooth = tTarget;
      bpm = BPM_LOW + (BPM_HIGH - BPM_LOW) * tSmooth;
      stepDur = 60 / bpm / 4;
      var barDur = stepDur * 16;
      onDrum = tSmooth >= (onDrum ? 0.14 : 0.20);
      onLead = tSmooth >= (onLead ? 0.62 : 0.68);
      ramp(LAY.drum.gain, onDrum ? MIX.drum : 0, barDur);
      ramp(LAY.lead.gain, onLead ? MIX.lead : 0, barDur);
      ramp(LAY.pad.gain, MIX.pad * (1 - 0.25 * tSmooth), barDur);
      ramp(LAY.bass.gain, MIX.bass * (0.85 + 0.15 * tSmooth), barDur);
      if (!muteMus) ramp(musicLevel.gain, MIX.music + MIX.musicTension * tSmooth, barDur);
      leadDelay.delayTime.setTargetAtTime(stepDur * 3, cur, 0.1);
      padFilter.frequency.setTargetAtTime(padBase + 900 * tSmooth, cur, barDur * 0.4);
      padSet(ROOT_PAD + keyOff + bp.chord[0], ph.voice, cur);
    }
    function ramp(p, v, dur) {                /* fondu sur une mesure, jamais de claquement */
      p.cancelScheduledValues(cur);
      p.setValueAtTime(p.value, cur);
      p.linearRampToValueAtTime(v, cur + dur);
    }

    /* ---- un pas de double croche ---- */
    function doStep() {
      var s = step, t = cur, hushed = false;
      /* silences : la respiration qui empeche la lassitude */
      if (bp.brk === 'beat' && s >= 12) hushed = true;
      if (bp.brk === 'twobeat' && s >= 8) hushed = true;
      if (bp.brk === 'stab' && s >= 13) hushed = true;
      if (bp.brk === 'stab' && s === 12) { kick(t, 1); snare(t, 0.9); }

      var root = ROOT_BASS + keyOff + bp.chord[0];
      /* basse */
      if (!hushed) {
        var c = ph.bass.charCodeAt(s) - 48;
        if (c >= 1 && c <= 4) {
          var add = c === 2 ? 12 : c === 3 ? 7 : c === 4 ? 10 : 0;
          bassNote(t, root + add, stepDur * (c === 1 ? 2.6 : 1.5), 0.85 + 0.15 * tSmooth);
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
      /* lead */
      if (onLead && !hushed && ph.rhy.charCodeAt(s) === 49) {
        var tones = [0, bp.third, 7, 12, 12 + bp.third, 19];
        var idx = ph.shape[(leadStep++) % ph.shape.length];
        var m = ROOT_LEAD + keyOff + bp.chord[0] + tones[idx] + bp.leadOct;
        leadNote(t, m, stepDur * 1.6, 0.75 + 0.25 * tSmooth);
      }
      cur += stepDur;
      step++;
      if (step >= 16) { step = 0; bar++; newBar(); }
    }
    var leadStep = 0;

    /* ---- ordonnanceur : place les evenements a l'avance sur l'horloge audio ---- */
    var running = false;
    function schedUntil(horizon) {
      var guard = 0;
      while (cur < horizon && guard++ < 20000) doStep();
    }
    function startAt(t) {
      cur = t; step = 0; bar = 0; leadStep = 0;
      mem = {}; barMem = { sig: '', n: 0 };
      newBar();
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
    var rmsOutF = offline ? function () { return 0; } : tap(shaper);

    return {
      ctx: ctx,
      startAt: startAt,
      schedUntil: schedUntil,
      isRunning: function () { return running; },
      stop: function (t) {
        running = false;
        ['pad', 'bass', 'drum', 'lead'].forEach(function (k) {
          var p = LAY[k].gain;
          p.cancelScheduledValues(t); p.setValueAtTime(p.value, t);
          p.linearRampToValueAtTime(0, t + 0.25);
        });
      },
      setTension: function (v) { tTarget = clamp(v, 0, 1); },
      sfx: function (name, o) { var f = SFX[name]; if (f) f(ctx.currentTime + 0.012, o || {}); },
      sfxAt: function (name, t, o) { var f = SFX[name]; if (f) f(t, o || {}); },
      rms: rmsMusic, rmsSfx: rmsSfxF, rmsOut: rmsOutF,
      cursor: function () { return cur; },
      barSigs: function () { return barSigs; },
      info: function () {
        return {
          bar: bar, step: step, bpm: bpm, tension: tSmooth, key: keyOff,
          layers: 2 + (onDrum ? 1 : 0) + (onLead ? 1 : 0),
          grid: GRIDS.indexOf(ph ? ph.grid : null), fill: bp ? bp.fill : '', brk: bp ? bp.brk : ''
        };
      }
    };
  }

  /* ================================ face publique ================================ */
  var E = null, timer = null, resumeTries = 0, stale = 0, lastClock = -1;

  function pump() {
    if (!E) return;
    var ctx = E.ctx, st = ctx.state;
    if (st === 'suspended' || st === 'interrupted') {       /* retour de veille, iOS compris */
      if (resumeTries++ < 40 && ctx.resume) { try { ctx.resume(); } catch (e) {} }
      return;
    }
    resumeTries = 0;
    var now = ctx.currentTime;
    if (now === lastClock) { if (++stale > 240) { stale = 0; E.startAt(now + 0.06); } return; }
    lastClock = now; stale = 0;
    if (!E.isRunning()) return;
    if (E.cursor() < now - 0.25) E.startAt(now + 0.06);     /* on s'est fait doubler : on recale */
    E.schedUntil(now + LOOKAHEAD);
  }

  N.music = {
    init: function () {
      if (E) return true;
      var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      E = build(new AC({ latencyHint: 'interactive' }), false);
      return true;
    },
    start: function () {
      if (!E && !N.music.init()) return;
      if (E.isRunning()) return;
      if (E.ctx.state !== 'running' && E.ctx.resume) { try { E.ctx.resume(); } catch (e) {} }
      E.startAt(E.ctx.currentTime + 0.08);
      pump();
      if (!timer && typeof setInterval === 'function') timer = setInterval(pump, PUMP_MS);
    },
    stop: function () {
      if (!E) return;
      E.stop(E.ctx.currentTime);
      if (timer) { clearInterval(timer); timer = null; }
    },
    tension: function (v) { if (!E) return; E.setTension(v); pump(); },
    sfx: function (name, o) { if (!E) return; pump(); E.sfx(name, o); },
    rms: function () { return E ? E.rms() : 0; },
    rmsSfx: function () { return E ? E.rmsSfx() : 0; },
    rmsOut: function () { return E ? E.rmsOut() : 0; },
    info: function () { return E ? E.info() : null; },

    /* PREUVE. Rend la musique hors ligne avec le MEME moteur que le jeu, donc ce qui est mesure est
       ce qui est joue. events : [{t, name, opts}] pour les sons d'information. */
    renderOffline: function (seconds, tensionFn, events, rate, mute) {
      var OC = (typeof window !== 'undefined') && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
      if (!OC) return null;
      var sr = rate || 44100, dur = seconds;
      var ctx = new OC(2, Math.ceil(sr * dur), sr);
      var e = build(ctx, true, mute);
      e.startAt(0);
      var slice = 0.25;                     /* la tension est relue comme en jeu, par tranches */
      for (var t = 0; t < dur; t += slice) {
        if (tensionFn) e.setTension(tensionFn(t));
        e.schedUntil(Math.min(dur, t + slice));
      }
      if (events) for (var i = 0; i < events.length; i++) e.sfxAt(events[i].name, events[i].t, events[i].opts);
      N.music.lastBars = e.barSigs();      /* aide aux tests : empreinte de chaque mesure rendue */
      return ctx.startRendering();
    }
  };

})();
