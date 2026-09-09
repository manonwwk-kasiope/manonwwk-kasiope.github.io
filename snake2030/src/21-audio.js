/* ======
   SNAKE 2030 — 21-audio.js
   S2030.audio : musique dynamique en couches + banque d'effets.

   Musique  : base = S.musicBuf (AudioBuffer décodé par le cœur, bouclé sur
              K.MUSIC_LOOP s) + couches synthétisées empilées par intensité.
              Si S.musicBuf est absent, une base entièrement synthétisée
              prend le relais, et bascule toute seule sur la piste si le
              cœur la fournit plus tard.
   Effets   : 100 % synthétisés, aucun fichier, aucune requête réseau.

   Notes de conformité :
   - aucun Date.now() / performance.now() : l'horloge est celle du moteur
     audio (ctx.currentTime), indispensable pour planifier des échantillons ;
     le temps de jeu S.t n'a pas la précision requise.
   - aucun Math.random() : le bruit et les micro-variations utilisent un
     générateur LOCAL (_audRnd), volontairement séparé de rnd() pour ne pas
     consommer la graine du jeu depuis un ordonnanceur asynchrone, ce qui
     désynchroniserait les parties à graine fixe. Il est initialisé depuis
     S.seed quand il existe, donc reproductible lui aussi.
   ====== */

/* ------ générateur pseudo-aléatoire local (jamais Math.random) ------- */
var _audSeed = 0x9e3779b9;
function _audRnd(){
  _audSeed = (Math.imul(_audSeed, 1664525) + 1013904223) >>> 0;
  return _audSeed / 4294967296;
}
function _audRR(a, b){ return a + (b - a) * _audRnd(); }

/* ------ table MIDI -> Hz (remplie à l'init, zéro Math.pow en boucle) - */
var _audHzTab = null;
function _audHz(m){
  m |= 0;
  if(m < 0) m = 0; else if(m > 127) m = 127;
  return _audHzTab[m];
}

/* ------ nœuds et état ------ */
var _audCtx = null, _audOk = false;
var _audMaster = null, _audComp = null;          // bus commun
var _audMusicBus = null, _audDuck = null;        // musique
var _audBaseIn = null, _audBaseFilt = null;      // base (piste ou secours)
var _audTrackComp = null, _audTrackMk = null;    // lissage de la piste (avant le gain d'intensite)
var _audTrackG = null, _audBaseG = null;
var _audSfxIn = null, _audSfxComp = null;        // effets
var _audStingIn = null;                          // accent de phase (hors compresseur d'effets)
var _audNoiseBuf = null, _audDriveCurve = null;
var _audPans = null;                             // panoramiques préalloués

var _audTrackNode = null, _audTrackBuf = null, _audLead = 0;
var _audPlaying = false, _audMusicOn = true, _audSfxOn = true;
var _audMuteAt = 1e9;                            // arrêt différé de la piste

var _audTimer = null, _audStopTO = null;
var _audStepI = 0, _audNextT = 0, _audStepsLoop = 64;
var _audBpm = 112, _audLoopSec = 0, _audBar = 60 / 112 * 4;
var _audRate = 1, _audInt = 0, _audIntApplied = -1, _audIntT = -9;

var _audLay = null;        // couches synthétiques
var _audLayBus = null, _audLayComp = null;   // bus des couches + compression
var _audLayMk = null;                        // rattrapage apres compression des couches
var _audTrackOnly = 0;                       // 1 = couches seules (prise de mesure)
var _audBaseSynth = true;  // true tant que la piste n'est pas lancée

/* ------ motifs musicaux (alloués une fois) ------ */
/* progression 4 mesures : Am – F – C – G, seizièmes, 16 pas par mesure     */
var _audROOTS  = [33, 29, 36, 31];
var _audCH0    = [57, 60, 64];
var _audCH1    = [53, 57, 60];
var _audCH2    = [52, 55, 60];
var _audCH3    = [50, 55, 59];
var _audCHORDS = [_audCH0, _audCH1, _audCH2, _audCH3];
var _audARP    = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 2];
var _audARPO   = [0, 0, 12, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 12, 12];
var _audLEAD   = [69, -1, 72, -1, 74, -1, 72, -1, 69, -1, 76, -1, 74, 72, 69, -1];
var _audTRANS  = [0, -4, -5, -2];
var _audBASSP  = [0, 0, 12, 0, 0, 0, 7, 0];   /* offsets, un pas sur deux */

/* ------ garde anti-saturation ------ */
var _audGuard = {};
var _audBudgetT = -9, _audBudgetN = 0;
var _audFxMax = {
  shoot: 1, hit: 3, laser: 2, zap: 3, shock: 2, kill: 99, pickup: 3,
  bigkill: 2, explode: 1, missile: 2, hurt: 1, dead: 1, bossIn: 1,
  ultFire: 1, ultReady: 1, warp: 1, levelup: 1, card: 2, core: 2,
  boost: 1, boostEnd: 1, boostDry: 1, click: 3,
  spawnTick: 3, absorb: 3, multUp: 6,   /* 10-core.js franchit plusieurs paliers dans la MEME image (boucle while) : a 1, la garde avalait le 2e et le 3e — mesure av-garde, 3 demandes, 2 joues */
  eshoot: 3, bossHit: 3, lowHp: 1, wallBump: 2, teleport: 2, steal: 1
};

/* Correction de niveau par son, appliquee juste avant la synthese.
   Elle est CALIBREE PAR LA MESURE (tools/test/G12/calibre.mjs) : chaque
   valeur est le facteur qui amene la crete reelle en sortie maitre sur la
   cible dBFS de la spec. Ne pas la retoucher a la main sans remesurer. */
var _audFxGain = { shoot: 2.073, hit: 1.681, pickup: 1.976, core: 2.240, kill: 1.379, bigkill: 2.667, explode: 1.848, hurt: 2.500, bossIn: 2.516, dead: 3.033, click: 1.690, card: 1.283, levelup: 2.545, boost: 1.393, boostEnd: 1.493, boostDry: 1.167, warp: 1.333, eshoot: 0.880, laser: 1.096, missile: 1.657, shock: 1.208, zap: 1.422, wallBump: 1.847, spawnTick: 0.481, absorb: 0.726, multUp: 1.914, ultReady: 2.269, ultFire: 1.947, bossHit: 1.052, lowHp: 1.109, teleport: 2.015, steal: 1.981 };
/* Fenetre de garde propre a certains sons. Le tir automatique part jusqu'a
   plusieurs fois par seconde, tourelles comprises : au pas commun de 40 ms il
   passait vingt-cinq fois par seconde, ce qui donne une mitraillette de
   jouet plutot qu'une arme. Un tir toutes les 90 ms suffit a porter la
   cadence sans la marteler. */
var _audFxWin = { shoot: 0.06, hit: 0.055, zap: 0.06 };
var _audPlayed = {};
/* Dernier effet REELLEMENT joue : nom, fondamentale annoncee par le son
   (0 quand il n'en declare pas) et date du contexte audio. Sonde de test. */
var _audF0 = 0;
var _audLast = { name: '', f0: 0, t: 0 };
var _audKillT = 0, _audKillN = 0;
var _audPickT = -9, _audPickN = 0;
function _audAllow(name, t){
  var g = _audGuard[name];
  if(!g){ g = { t0: t, n: 0 }; _audGuard[name] = g; }
  var win = _audFxWin[name] === undefined ? 0.04 : _audFxWin[name];
  if(t - g.t0 > win){ g.t0 = t; g.n = 0; }
  var mx = _audFxMax[name];
  if(g.n >= (mx === undefined ? 2 : mx)) return false;
  if(t - _audBudgetT > 0.04){ _audBudgetT = t; _audBudgetN = 0; }
  if(_audBudgetN >= 28) return false;
  g.n++; _audBudgetN++; _audPlayed[name] = (_audPlayed[name] || 0) + 1;
  return true;
}

/* ------ utilitaires de paramètres ------ */
function _audRamp(p, v, s, t0){
  var t = t0 === undefined ? _audCtx.currentTime : t0;
  try{ p.cancelScheduledValues(t); }catch(e){}
  try{ p.setValueAtTime(p.value, t); }catch(e){}
  p.linearRampToValueAtTime(v, t + s);
}

/* ------ voix élémentaires ------ */
/* Signatures positionnelles : aucune allocation d'objet d'options par appel. */

/* oscillateur + filtre passe-bas optionnel (lp -> lp2 balayé sur la durée) */
function _audTone(t, type, f0, f1, dur, peak, atk, lp, lp2, q, dest, detune){
  if(!_audOk || peak <= 0.0004) return;
  var o = _audCtx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if(f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1 < 10 ? 10 : f1, t + dur);
  if(detune) o.detune.value = detune;
  var node = o;
  if(lp){
    var f = _audCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lp, t);
    if(lp2 && lp2 !== lp) f.frequency.exponentialRampToValueAtTime(lp2 < 40 ? 40 : lp2, t + dur);
    f.Q.value = q || 0.9;
    o.connect(f);
    node = f;
  }
  var g = _audCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + (atk || 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  node.connect(g);
  g.connect(dest || _audSfxIn);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/* bruit filtré : f0 -> f1 balayé sur la durée */
function _audNoise(t, ftype, f0, f1, dur, peak, q, dest){
  if(!_audOk || peak <= 0.0004 || !_audNoiseBuf) return;
  var s = _audCtx.createBufferSource();
  s.buffer = _audNoiseBuf;
  s.loop = true;
  s.playbackRate.value = 0.7 + _audRnd() * 0.6;
  var f = _audCtx.createBiquadFilter();
  f.type = ftype || 'bandpass';
  f.frequency.setValueAtTime(f0, t);
  if(f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1 < 30 ? 30 : f1, t + dur);
  f.Q.value = q || 1;
  var g = _audCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || _audSfxIn);
  s.start(t);
  s.stop(t + dur + 0.03);
}

/* corps grave percussif (kick, boum, sub) */
function _audSub(t, f0, f1, dur, peak, dest){
  if(!_audOk || peak <= 0.0004) return;
  var o = _audCtx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1 < 12 ? 12 : f1, t + dur * 0.75);
  var g = _audCtx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest || _audSfxIn);
  o.start(t);
  o.stop(t + dur + 0.03);
}

/* ------ panoramique : 7 nœuds préalloués, zéro allocation ------ */
function _audDestFor(x){
  if(!_audPans || x === undefined || x === null) return _audSfxIn;
  if(typeof S === 'undefined' || !S || !S.cam || !S.view) return _audSfxIn;
  var half = S.view.w * 0.5;
  if(!half) return _audSfxIn;
  var p = (x - S.cam.x) / half;
  if(p < -1) p = -1; else if(p > 1) p = 1;
  var i = Math.round((p * 0.85 + 1) * 3);
  if(i < 0) i = 0; else if(i > 6) i = 6;
  return _audPans[i] || _audSfxIn;
}

/* ======
   Banque d'effets — chaque son : (t, v, d, o)
   v = volume relatif, d = destination (panoramique), o = options
   Code sonore : joueur = timbres clairs/chauds, ennemi = médium rêche,
   ressources = cloches cristallines, danger = graves saturés.
   ====== */
var _audFx = {

  /* --- tirs joueur : clair, court, jamais fatigant ------ */
  shoot: function(t, v, d, o){
    var p = (o && o.pitch) ? o.pitch : 1;
    _audF0 = 540 * p;
    /* C'est l'attaque qui fait lire un tir, pas la hauteur. Un carre qui
       glisse de 900 a 250 Hz, repete, s'entend comme un jouet ; on garde
       donc un souffle court filtre, un corps triangulaire discret et un
       coup de grave. Le desaccord aleatoire evite que la repetition ne
       forme un peigne. */
    _audNoise(t, 'bandpass', 3000 * p, 1600 * p, 0.030, 0.075 * v, 1.4, d);
    _audTone(t, 'square', 900 * p, 300 * p, 0.045, 0.085 * v, 0.002, 3600, 1100, 1.2, d, _audRR(-70, 70));
    _audTone(t, 'triangle', 1800 * p, 700 * p, 0.030, 0.045 * v, 0.002, 0, 0, 0, d, 0);
    _audSub(t, 150 * p, 62, 0.04, 0.030 * v, d);
  },
  /* Tir ENNEMI : jamais le meme son que celui du joueur. Dent de scie a
     380 Hz filtree en passe-bande autour de 1,2 kHz, 120 ms : rugueux,
     medium, il perce le haut-parleur du telephone sans imiter le tir joueur. */
  eshoot: function(t, v, d){
    _audF0 = 380;
    _audTone(t, 'sawtooth', 380, 300, 0.12, 0.10 * v, 0.006, 1200, 1200, 6, d, 0);
    _audNoise(t, 'bandpass', 1200, 1600, 0.11, 0.05 * v, 3.0, d);
    _audTone(t + 0.012, 'sawtooth', 190, 150, 0.10, 0.035 * v, 0.008, 900, 700, 4, d, 9);
  },
  laser: function(t, v, d, o){
    var p = (o && o.pitch) ? o.pitch : 1;
    _audF0 = 1500 * p;
    _audTone(t, 'sawtooth', 1500 * p, 380 * p, 0.20, 0.075 * v, 0.003, 5200, 700, 6, d, 6);
    _audTone(t, 'sawtooth', 1500 * p, 380 * p, 0.20, 0.05 * v, 0.003, 4200, 600, 6, d, -9);
    _audNoise(t, 'bandpass', 5600, 1800, 0.16, 0.10 * v, 3.2, d);
  },
  missile: function(t, v, d){
    /* Le souffle du missile porte son timbre : sa bande part de 1500 Hz et non
       de 700, et la composante aigue dure autant que le corps. Sous 700 Hz il
       se confondait avec le tir joueur (centroides a 11 % d'ecart au lieu des
       20 % exiges) ; la traine grave reste, mais courte. */
    _audNoise(t, 'bandpass', 1400, 4200, 0.30, 0.17 * v, 1.4, d);
    _audTone(t, 'triangle', 300, 900, 0.22, 0.032 * v, 0.01, 2600, 3600, 1, d, 0);
    _audNoise(t, 'highpass', 2800, 5400, 0.18, 0.075 * v, 0.8, d);
    _audSub(t, 120, 48, 0.10, 0.050 * v, d);
  },
  shock: function(t, v, d){
    _audNoise(t, 'highpass', 4200, 1800, 0.05, 0.10 * v, 0.9, d);
    _audNoise(t + 0.035, 'highpass', 5600, 2400, 0.05, 0.07 * v, 0.9, d);
    _audNoise(t + 0.075, 'highpass', 3400, 1200, 0.07, 0.05 * v, 0.9, d);
    _audTone(t, 'square', 2400, 420, 0.09, 0.045 * v, 0.001, 6000, 1200, 8, d, 0);
  },
  zap: function(t, v, d){
    _audTone(t, 'square', 1800, 190, 0.10, 0.06 * v, 0.001, 5000, 900, 5, d, _audRR(-40, 40));
    _audNoise(t, 'bandpass', 6200, 800, 0.11, 0.06 * v, 2.4, d);
  },

  /* --- impacts et morts ------ */
  hit: function(t, v, d){
    _audNoise(t, 'bandpass', 1600, 1100, 0.060, 0.075 * v, 1.6, d);
    _audTone(t, 'square', 1500, 900, 0.055, 0.045 * v, 0.001, 4000, 1800, 1.4, d, 0);
    _audTone(t, 'triangle', 420, 190, 0.05, 0.030 * v, 0.001, 3000, 1200, 1, d, 0);
  },
  /* Le mur : coup mat et sourd, mais pas grave — il doit se distinguer du
     'hit' inflige a un ennemi, que le joueur entend cent fois par minute. */
  wallBump: function(t, v, d){
    _audF0 = 260;
    _audNoise(t, 'bandpass', 790, 470, 0.075, 0.15 * v, 1.1, d);
    _audTone(t, 'triangle', 480, 240, 0.065, 0.075 * v, 0.002, 1700, 850, 1.2, d, 0);
    _audTone(t, 'triangle', 260, 130, 0.075, 0.028 * v, 0.002, 1400, 600, 1.2, d, 0);
    _audNoise(t, 'highpass', 2200, 1500, 0.020, 0.012 * v, 0.8, d);
  },
  /* La hauteur monte avec le combo (opts.pitch) : une serie de kills se lit
     comme une montee. Le grave ne suit qu'a la racine, sinon la basse part
     dans l'aigu et la frappe perd son poids. */
  kill: function(t, v, d, o){
    var p = (o && o.pitch) ? o.pitch : 1, ps = Math.sqrt(p);
    _audF0 = 320 * p;
    _audNoise(t, 'bandpass', 2400 * p, 1000 * p, 0.10, 0.26 * v, 1.0, d);
    _audNoise(t, 'bandpass', 2200 * p, 700 * p, 0.16, 0.07 * v, 0.8, d);
    _audTone(t, 'square', 800 * p, 340 * p, 0.08, 0.12 * v, 0.001, 4200, 1900, 1.6, d, 0);
    _audTone(t, 'square', 320 * p, 80 * p, 0.17, 0.05 * v, 0.002, 1800, 400, 2, d, 0);
    _audSub(t, 140 * ps, 55 * ps, 0.15, 0.055 * v, d);
  },
  bigkill: function(t, v, d, o){
    var p = (o && o.pitch) ? o.pitch : 1, ps = Math.sqrt(p);
    _audF0 = 520 * p;
    _audNoise(t, 'bandpass', 3400 * p, 1300 * p, 0.16, 0.26 * v, 1.0, d);
    _audNoise(t, 'bandpass', 5200 * p, 700 * p, 0.34, 0.11 * v, 0.7, d);
    _audSub(t, 190 * ps, 60 * ps, 0.34, 0.10 * v, d);
    _audTone(t, 'sawtooth', 1040 * p, 300 * p, 0.22, 0.10 * v, 0.003, 6000, 2000, 2, d, -12);
    _audTone(t, 'sawtooth', 520 * p, 70 * p, 0.40, 0.06 * v, 0.004, 2600, 300, 2, d, -12);
    _audNoise(t + 0.10, 'bandpass', 2400 * p, 1100 * p, 0.30, 0.14 * v, 1.1, d);
  },
  explode: function(t, v, d){
    _audNoise(t, 'bandpass', 2800, 1100, 0.20, 0.28 * v, 0.9, d);
    _audNoise(t, 'bandpass', 3800, 500, 0.34, 0.13 * v, 0.6, d);
    _audSub(t, 150, 50, 0.26, 0.075 * v, d);
    _audNoise(t, 'highpass', 5200, 1800, 0.14, 0.22 * v, 0.7, d);
  },

  /* --- ressources : cristallin, cyan/vert ------ */
  pickup: function(t, v, d, o){
    var p = (o && o.pitch) ? o.pitch : 1;
    _audF0 = 720 * p;
    _audTone(t, 'triangle', 1080 * p, 1620 * p, 0.09, 0.075 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.05, 'sine', 2160 * p, 2430 * p, 0.10, 0.055 * v, 0.002, 0, 0, 0, d, 0);
  },
  core: function(t, v, d){
    _audTone(t, 'sine', _audHz(76), 0, 0.16, 0.08 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.06, 'sine', _audHz(83), 0, 0.16, 0.07 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.12, 'sine', _audHz(88), 0, 0.26, 0.07 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.12, 'triangle', _audHz(100), 0, 0.20, 0.025 * v, 0.004, 0, 0, 0, d, 5);
  },

  /* --- joueur en danger : grave, rêche ------ */
  hurt: function(t, v, d){
    _audTone(t, 'square', 1200, 380, 0.14, 0.13 * v, 0.001, 5200, 1600, 2, d, 0);
    _audTone(t, 'square', 300, 62, 0.28, 0.09 * v, 0.001, 1400, 220, 3, d, 0);
    _audNoise(t, 'bandpass', 1800, 700, 0.16, 0.14 * v, 1.2, d);
    _audNoise(t, 'lowpass', 2400, 220, 0.24, 0.07 * v, 0.9, d);
    _audSub(t, 90, 34, 0.26, 0.11 * v, d);
  },
  dead: function(t, v, d){
    _audTone(t, 'sawtooth', 1320, 220, 0.55, 0.13 * v, 0.004, 6000, 900, 3, d, 0);
    _audTone(t, 'sawtooth', 440, 55, 1.30, 0.10 * v, 0.01, 2600, 180, 4, d, 0);
    _audTone(t, 'sawtooth', 660, 130, 0.85, 0.07 * v, 0.01, 3200, 900, 4, d, 11);
    _audNoise(t, 'bandpass', 2400, 800, 0.45, 0.16 * v, 1.0, d);
    _audNoise(t, 'bandpass', 2200, 600, 0.80, 0.09 * v, 0.7, d);
    _audSub(t + 0.05, 110, 45, 0.55, 0.06 * v, d);
  },

  /* --- déplacement ------ */
  boost: function(t, v, d){
    _audNoise(t, 'highpass', 260, 5200, 0.34, 0.11 * v, 0.9, d);
    _audTone(t, 'sawtooth', 180, 760, 0.30, 0.06 * v, 0.02, 900, 4200, 2, d, 0);
  },
  boostEnd: function(t, v, d){
    _audNoise(t, 'lowpass', 4200, 380, 0.26, 0.08 * v, 0.8, d);
    _audTone(t, 'triangle', 620, 200, 0.20, 0.04 * v, 0.006, 2400, 500, 1, d, 0);
  },
  // panne de boost : clic grave 90 ms, passe-bas 900 Hz, crete -16 dBFS (un seul, a la panne)
  boostDry: function(t, v, d){
    _audTone(t, 'square', 260, 130, 0.075, 0.055 * v, 0.002, 1200, 900, 1.1, d, 0);
    _audNoise(t, 'bandpass', 1500, 900, 0.06, 0.10 * v, 1.6, d);
    _audTone(t, 'square', 700, 300, 0.035, 0.045 * v, 0.001, 3000, 1400, 1.2, d, 0);
  },
  warp: function(t, v, d){
    _audNoise(t, 'bandpass', 260, 6400, 0.85, 0.20 * v, 1.3, d);
    _audTone(t, 'sawtooth', 330, 2200, 0.80, 0.10 * v, 0.05, 900, 6000, 3, d, 0);
    _audTone(t, 'sine', 1760, 110, 0.80, 0.07 * v, 0.05, 0, 0, 0, d, 0);
    _audNoise(t + 0.60, 'bandpass', 3000, 1500, 0.30, 0.20 * v, 1.2, d);
    _audSub(t + 0.62, 180, 70, 0.26, 0.055 * v, d);
  },

  /* Tic de portail : une apparition se prepare. 40 ms a 2 kHz, crete -18 dBFS
     (0,16 avant le bus effets a 0,9 et le master a 0,88). */
  spawnTick: function(t, v, d){
    _audTone(t, 'sine', 2000, 2000, 0.04, 0.16 * v, 0.003, 0, 0, 0, d, 0);
    _audTone(t, 'sine', 4000, 4000, 0.02, 0.05 * v, 0.002, 0, 0, 0, d, 0);
  },

  /* Le corps encaisse une balle au-dela du 8e anneau : bruit mat, tres court. */
  absorb: function(t, v, d){
    _audTone(t, 'sine', 430, 250, 0.05, 0.17 * v, 0.002, 0, 0, 0, d, 0);
    _audNoise(t, 'bandpass', 720, 330, 0.045, 0.06 * v, 1.4, d);
  },

  /* Coup porte au boss : metallique, medium, il doit se distinguer du 'hit'
     ordinaire pour qu'on sache qu'on entame la bonne cible. */
  bossHit: function(t, v, d){
    _audF0 = 1100;
    _audTone(t, 'square', 1100, 820, 0.090, 0.11 * v, 0.001, 3200, 2000, 5, d, 0);
    _audTone(t, 'square', 1650, 1230, 0.070, 0.06 * v, 0.001, 4200, 2600, 5, d, 9);
    _audNoise(t, 'bandpass', 2600, 1400, 0.055, 0.07 * v, 2.2, d);
  },
  /* Vie basse : un battement de coeur a 1 Hz, deux coups rapproches. Jamais
     grave au point d'etre inaudible sur telephone. */
  lowHp: function(t, v, d){
    _audF0 = 220;
    _audTone(t, 'triangle', 1250, 625, 0.09, 0.100 * v, 0.004, 3600, 1700, 1.2, d, 0);
    _audTone(t, 'triangle', 220, 110, 0.10, 0.020 * v, 0.004, 1200, 500, 1.2, d, 0);
    _audNoise(t, 'bandpass', 1850, 1200, 0.08, 0.095 * v, 1.4, d);
    _audTone(t + 0.16, 'triangle', 1080, 540, 0.11, 0.070 * v, 0.004, 3200, 1500, 1.2, d, 0);
    _audNoise(t + 0.16, 'bandpass', 1600, 1080, 0.09, 0.070 * v, 1.4, d);
  },
  /* Teleportation : repli de l'espace, glissando descendant puis remontee. */
  teleport: function(t, v, d){
    _audF0 = 1400;
    _audTone(t, 'sine', 1400, 320, 0.14, 0.09 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.10, 'sine', 480, 2200, 0.16, 0.075 * v, 0.004, 0, 0, 0, d, 0);
    _audNoise(t, 'bandpass', 1800, 4200, 0.20, 0.06 * v, 2.0, d);
  },
  /* Butin vole : une chute, moqueuse, deux notes qui descendent. */
  steal: function(t, v, d){
    _audF0 = 1046;
    _audTone(t, 'square', 1046, 1046, 0.10, 0.09 * v, 0.002, 3400, 2200, 2, d, 0);
    _audTone(t + 0.10, 'square', 784, 784, 0.12, 0.09 * v, 0.002, 3000, 1800, 2, d, 0);
    _audTone(t + 0.22, 'square', 523, 415, 0.26, 0.085 * v, 0.002, 2400, 900, 2, d, 0);
    _audNoise(t + 0.22, 'bandpass', 1600, 700, 0.16, 0.045 * v, 1.4, d);
  },

  /* --- interface et jalons ------ */
  click: function(t, v, d){
    _audTone(t, 'square', 3200, 2400, 0.018, 0.055 * v, 0.001, 9000, 7000, 1, d, 0);
    _audTone(t, 'square', 1600, 1100, 0.014, 0.015 * v, 0.001, 5200, 3600, 1, d, 0);
  },
  levelup: function(t, v, d){
    _audTone(t, 'triangle', _audHz(69), 0, 0.13, 0.08 * v, 0.003, 0, 0, 0, d, 0);
    _audTone(t + 0.09, 'triangle', _audHz(73), 0, 0.13, 0.08 * v, 0.003, 0, 0, 0, d, 0);
    _audTone(t + 0.18, 'triangle', _audHz(76), 0, 0.13, 0.08 * v, 0.003, 0, 0, 0, d, 0);
    _audTone(t + 0.27, 'triangle', _audHz(81), 0, 0.42, 0.09 * v, 0.003, 0, 0, 0, d, 0);
    _audTone(t + 0.27, 'sawtooth', _audHz(81), 0, 0.40, 0.03 * v, 0.02, 2200, 5200, 2, d, 8);
  },
  /* Palier de multiplicateur : accord montant de 120 ms, clair et court —
     il doit passer SOUS le son de kill qui le déclenche, jamais devant.
     Provisoire, affiné en G12. */
  multUp: function(t, v, d){
    _audF0 = _audHz(76);
    _audTone(t,         'triangle', _audHz(64), 0, 0.09, 0.060 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.040, 'triangle', _audHz(68), 0, 0.09, 0.060 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.080, 'triangle', _audHz(71), 0, 0.14, 0.065 * v, 0.002, 0, 0, 0, d, 0);
    _audTone(t + 0.080, 'sine',     _audHz(83), 0, 0.12, 0.030 * v, 0.004, 0, 0, 0, d, 6);
  },
  card: function(t, v, d){
    _audTone(t, 'sine', _audHz(84), 0, 0.55, 0.06 * v, 0.01, 0, 0, 0, d, 0);
    _audTone(t, 'sine', _audHz(91), 0, 0.50, 0.045 * v, 0.02, 0, 0, 0, d, 6);
    _audNoise(t, 'highpass', 6800, 3800, 0.30, 0.03 * v, 0.8, d);
  },
  ultReady: function(t, v, d){
    _audTone(t, 'sawtooth', _audHz(57), 0, 0.30, 0.08 * v, 0.006, 900, 5200, 3, d, -8);
    _audTone(t, 'sawtooth', _audHz(64), 0, 0.30, 0.07 * v, 0.006, 900, 5200, 3, d, 8);
    _audTone(t + 0.22, 'sawtooth', _audHz(69), 0, 0.55, 0.09 * v, 0.006, 1200, 6800, 3, d, 0);
    _audNoise(t + 0.22, 'highpass', 3200, 7200, 0.35, 0.05 * v, 0.9, d);
  },
  ultFire: function(t, v, d){
    _audNoise(t, 'lowpass', 8000, 150, 0.80, 0.18 * v, 0.7, d);
    _audNoise(t, 'bandpass', 3200, 1400, 0.30, 0.30 * v, 0.9, d);
    _audSub(t, 210, 26, 0.75, 0.22 * v, d);
    _audTone(t, 'sawtooth', 1400, 120, 0.60, 0.11 * v, 0.003, 6000, 400, 3, d, -14);
    _audTone(t, 'sawtooth', 1400, 120, 0.60, 0.09 * v, 0.003, 5200, 400, 3, d, 14);
    _audNoise(t + 0.18, 'bandpass', 1200, 220, 0.55, 0.10 * v, 1.2, d);
  },
  bossIn: function(t, v, d){
    _audSub(t, 70, 30, 1.10, 0.14 * v, d);
    _audTone(t, 'sawtooth', _audHz(33), 0, 1.25, 0.07 * v, 0.25, 260, 3400, 4, d, -11);
    _audTone(t, 'sawtooth', _audHz(40), 0, 1.25, 0.055 * v, 0.25, 260, 3000, 4, d, 11);
    /* corne d'alarme : c'est elle qui porte l'annonce sur un haut-parleur de
       telephone — plus de 30 % de l'energie entre 600 et 2000 Hz */
    _audTone(t, 'square', 1750, 1340, 1.15, 0.19 * v, 0.06, 3200, 2500, 3, d, 0);
    _audTone(t + 0.05, 'square', 1960, 1470, 1.05, 0.13 * v, 0.06, 3100, 2400, 3, d, 7);
    _audNoise(t, 'bandpass', 1950, 1500, 1.10, 0.16 * v, 1.6, d);
    _audTone(t + 0.9, 'square', 1450, 950, 0.55, 0.10 * v, 0.01, 2900, 1800, 3, d, 0);
  }
};

/* ======
   Couches synthétiques calées sur le tempo du morceau
   ====== */
function _audMkLayer(thr, vol){
  var g = _audCtx.createGain();
  g.gain.value = 0;
  return { g: g, thr: thr, vol: vol, amt: 0 };
}

function _audCurve(k){
  var n = 1024, c = new Float32Array(n), i, x;
  for(i = 0; i < n; i++){
    x = i * 2 / n - 1;
    c[i] = (1 + k) * x / (1 + k * (x < 0 ? -x : x));
  }
  return c;
}

/* un pas = une double croche */
function _audStepDur(){
  return 60 / (_audBpm * _audRate) / 4;
}

/* pose les notes du pas i à l'instant t */
function _audStep(i, t, sd){
  /* Mode allégé : quand le téléphone peine, chaque note synthétisée coûte
     plusieurs noeuds WebAudio et c'est ce qui fait hoqueter le fil audio.
     On ne joue plus qu'une croche sur deux et on coupe les couches les plus
     denses. La piste enregistrée, elle, n'est pas concernée. */
  if (typeof S !== 'undefined' && S && S.opt && S.opt.audioLite && (i & 1)) return;
  var s = i & 15;
  var bar = (i >> 4) & 3;
  var chord = _audCHORDS[bar], root = _audROOTS[bar];
  var L = _audLay, n, f;

  /* ---- base de secours (pas de piste) : kick, basse, accords ------ */
  if(_audBaseSynth){
    if(s === 0 || s === 4 || s === 8 || s === 12){
      _audSub(t, 150, 44, 0.16, 0.55, _audBaseG);
      _audNoise(t, 'highpass', 5200, 2600, 0.03, 0.05, 0.8, _audBaseG);
    }
    if((s & 1) === 0){
      n = root + _audBASSP[(s >> 1) & 7];
      _audTone(t, 'sawtooth', _audHz(n), 0, sd * 1.7, 0.13, 0.004, 480, 260, 4, _audBaseG, 0);
    }
    if(s === 2 || s === 10 || s === 14){
      _audTone(t, 'square', _audHz(chord[0] + 12), 0, sd * 1.2, 0.045, 0.006, 2400, 900, 2, _audBaseG, -7);
      _audTone(t, 'square', _audHz(chord[2] + 12), 0, sd * 1.2, 0.038, 0.006, 2400, 900, 2, _audBaseG, 7);
    }
  }

  if(!L) return;

  /* ---- v > 0.15 : percussion additionnelle (charleston + clap) -------- */
  if(L.perc.amt > 0.01){
    if((s & 1) === 0){
      _audNoise(t, 'highpass', 7600, 5200, (s & 3) === 2 ? 0.045 : 0.028, (s & 3) === 2 ? 0.13 : 0.08, 0.8, L.perc.g);
    }
    if(s === 14){
      _audNoise(t, 'highpass', 6200, 3600, 0.22, 0.10, 0.7, L.perc.g);
    }
    if(s === 4 || s === 12){
      _audNoise(t, 'bandpass', 1500, 1100, 0.09, 0.20, 1.4, L.perc.g);
      _audNoise(t + 0.012, 'bandpass', 1900, 900, 0.13, 0.14, 1.2, L.perc.g);
    }
    if(s === 7 || s === 15){
      _audNoise(t, 'bandpass', 3200, 2000, 0.05, 0.07, 2.0, L.perc.g);
    }
  }

  /* ---- v > 0.35 : arpège ------ */
  if(L.arp.amt > 0.01){
    n = chord[_audARP[s]] + _audARPO[s];
    _audTone(t, 'square', _audHz(n + 12), 0, sd * 1.25, 0.10, 0.002, 3400, 1100, 3, L.arp.g, _audRR(-6, 6));
    if((s & 3) === 0){
      _audTone(t, 'triangle', _audHz(n + 24), 0, sd * 0.9, 0.04, 0.002, 0, 0, 0, L.arp.g, 0);
    }
  }

  /* ---- v > 0.55 : nappe (un accord par mesure, attaque lente) ------ */
  if(L.pad.amt > 0.01 && s === 0){
    var dur = sd * 16.6;
    _audTone(t, 'sawtooth', _audHz(chord[0]), 0, dur, 0.075, dur * 0.28, 900, 2600, 1.4, L.pad.g, -9);
    _audTone(t, 'sawtooth', _audHz(chord[1]), 0, dur, 0.065, dur * 0.30, 900, 2400, 1.4, L.pad.g, 5);
    _audTone(t, 'sawtooth', _audHz(chord[2]), 0, dur, 0.060, dur * 0.32, 900, 2200, 1.4, L.pad.g, 12);
    _audTone(t, 'sine', _audHz(chord[0] - 12), 0, dur, 0.05, dur * 0.25, 0, 0, 0, L.pad.g, 0);
  }

  /* ---- v > 0.75 : lead agressif (passe par la saturation) ------ */
  if(L.lead.amt > 0.01){
    n = _audLEAD[s];
    if(n > 0){
      f = _audHz(n + _audTRANS[bar]);
      _audTone(t, 'sawtooth', f, 0, sd * 2.1, 0.085, 0.004, 1200, 5200, 4, L.lead.g, -11);
      _audTone(t, 'sawtooth', f, 0, sd * 2.1, 0.075, 0.004, 1100, 4600, 4, L.lead.g, 11);
    }
  }

  /* ---- v > 0.90 : climax ------ */
  if(L.clim.amt > 0.01){
    if((s & 3) === 0){
      _audSub(t, 170, 40, 0.18, 0.5, L.clim.g);
    }
    if(s === 6 || s === 15){
      _audTone(t, 'sawtooth', _audHz(chord[0] + 24), _audHz(chord[0] + 12), sd * 1.1, 0.10, 0.002, 6000, 1600, 5, L.clim.g, 0);
    }
    if(bar === 3 && s === 0){
      _audNoise(t, 'bandpass', 400, 7200, sd * 15.5, 0.13, 1.1, L.clim.g);
    }
    if(bar === 3 && s === 12){
      _audNoise(t, 'highpass', 3000, 6800, sd * 3.6, 0.10, 0.8, L.clim.g);
    }
  }
}

/* ordonnanceur : anticipe 0.2 s, appelé toutes les 25 ms */
function _audTick(){
  if(!_audOk) return;
  var now = _audCtx.currentTime;

  /* arrêt différé de la piste après un fondu de coupure : vrai silence */
  if(!_audMusicOn && _audTrackNode && now > _audMuteAt){
    _audStopTrack();
  }

  if(!_audPlaying) return;

  /* la piste arrive en cours de partie : on bascule en fondu croisé */
  if(_audMusicOn && !_audTrackNode && typeof S !== 'undefined' && S && S.musicBuf){
    _audStartTrack(now + 0.08);
  }

  if(!_audMusicOn) return;

  var sd = _audStepDur();
  var horizon = now + 0.60;
  if(_audNextT < now) _audNextT = now + 0.03;
  var guard = 0;
  while(_audNextT < horizon && guard++ < 160){
    _audStep(_audStepI, _audNextT, sd);
    _audNextT += sd;
    _audStepI++;
    if(_audStepI >= _audStepsLoop) _audStepI = 0;
  }
}

/* ------ piste de base ------ */
function _audMeasureLead(buf){
  if(_audTrackBuf === buf) return _audLead;
  _audTrackBuf = buf;
  _audLead = 0;
  try{
    var d = buf.getChannelData(0);
    var max = Math.min(d.length, (buf.sampleRate * 1) | 0);
    var i = 0;
    while(i < max && d[i] < 0.002 && d[i] > -0.002) i++;
    if(i < max) _audLead = i / buf.sampleRate;
  }catch(e){ _audLead = 0; }
  return _audLead;
}

/* ====== liste de lecture
   Deux pistes de plus de quatre minutes décodées en mémoire coûteraient près
   de deux cents mégaoctets de PCM — impraticable sur téléphone. On les diffuse
   donc en flux, l'une après l'autre, chacune jouée en entier : la mémoire ne
   dépend plus de la durée, seulement du tampon de lecture. */
var _audList = [], _audListI = 0, _audEl = null, _audListOn = false, _audBufNext = null;
var _audListErr = 0, _audListFail = null;

function _audPlaylist(urls, onfail){
  if(!_audOk || !urls || !urls.length || _audList.length) return false;
  _audListFail = onfail || null;
  /* Safari sur iPhone ne joue pas de manière fiable un élément média resté
     hors du document, et refuse la lecture sans « playsinline ». On les
     attache donc pour de bon, en les gardant invisibles. */
  var box = document.getElementById('s2music');
  if(!box){
    box = document.createElement('div');
    box.id = 's2music';
    box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none';
    document.body.appendChild(box);
  }
  for(var i = 0; i < urls.length; i++){
    var a = document.createElement('audio');
    a.setAttribute('playsinline', '');
    a.setAttribute('webkit-playsinline', '');
    a.preload = i ? 'metadata' : 'auto';
    a.loop = false;
    a.src = urls[i];
    a.addEventListener('ended', _audEnded);
    a._id = 'p' + i;
    (function (el) { el.addEventListener('error', function () { _audLache(el); }); })(a);
    box.appendChild(a);
    _audList.push(a);
  }
  _audListOn = true;
  /* Chaque chargement rejouait les quinze premieres secondes d'intro, a
     -32 dBFS mesure : la musique n'existait pas au moment ou la partie
     commence. On entre donc DANS le morceau — soit a 18 s de la premiere
     piste (cale sur une mesure), soit sur la seconde, tiree au sort. */
  var _tir = 0;
  try{ _tir = ((parseInt(localStorage.getItem('snake2030.mus'), 10) || 0) + 1) | 0;
       localStorage.setItem('snake2030.mus', String(_tir & 1023)); }catch(e){}
  _tir ^= (_audSeed >>> 5) ^ ((_audRnd() * 4096) | 0);
  _audListI = (_tir & 1) && _audList.length > 1 ? 1 : 0;
  return true;
}

/* debut de lecture : 18 s cales sur une mesure pour la piste 1 */
function _audEntree(){ return Math.ceil(18 / _audBar) * _audBar; }

function _audEnded(){ _audEchecs = {}; _audListErr = 0; _audAdvance(); }

/* Une source refusée — fichier manquant, ou politique de sécurité qui
   interdit les URI de données sur un élément média — ne doit pas faire
   tourner la liste à vide. Quand toutes ont échoué, on rend la main pour que
   l'appelant retombe sur le décodage en mémoire. */
var _audEchecs = {};
function _audErr(a){
  if(!_audListOn) return;
  // un même élément qui échoue plusieurs fois ne compte qu'une panne
  if(a){ if(_audEchecs[a._id]) return; _audEchecs[a._id] = 1; }
  _audListErr = 0;
  for(var q in _audEchecs) _audListErr++;
  if(_audListErr >= _audList.length){
    _audListOn = false; _audEl = null;
    for(var i = 0; i < _audList.length; i++){
      try{ _audList[i].pause(); _audList[i].removeAttribute('src'); _audList[i].load(); }catch(e){}
      if(_audList[i].parentNode) _audList[i].parentNode.removeChild(_audList[i]);
    }
    _audList.length = 0;
    var f = _audListFail; _audListFail = null;
    if(f) try{ f(); }catch(e){}
    return;
  }
  _audAdvance();
}

function _audAdvance(){
  if(!_audListOn) return;
  if(_audEl){ try{ _audEl.pause(); }catch(e){} _audEl = null; }
  _audListI = (_audListI + 1) % _audList.length;
  if(_audPlaying && _audMusicOn) _audStartStream(_audCtx ? _audCtx.currentTime : 0);
}

function _audStartStream(t0){
  if(!_audOk || !_audListOn) return false;
  if(_audEl) return true;                 // déjà en train de jouer
  var a = _audList[_audListI];
  if(!a) return false;
  // le noeud de source ne peut être créé qu'une fois par élément
  if(!a._node){
    try{ a._node = _audCtx.createMediaElementSource(a); }catch(e){ return false; }
    a._node.connect(_audTrackG);
  }
  // aucune autre piste ne doit rester en lecture : c'est la seule garantie
  // contre deux morceaux superposés
  for(var k = 0; k < _audList.length; k++){
    if(_audList[k] !== a){ try{ _audList[k].pause(); }catch(e){} }
  }
  try{ a.playbackRate = _audRate; }catch(e){}
  /* Premiere lecture : on entre dans le morceau. Reprise (apres une mort,
     une pause) : on recale sur un DEBUT DE MESURE, sinon la musique repart
     au milieu d'un temps et tout le morceau sonne decale. */
  try{
    if(!a._begun){ a._begun = 1; if(_audListI === 0) a.currentTime = _audEntree(); }
    else if(a.currentTime > 0.2){ a.currentTime = Math.round(a.currentTime / _audBar) * _audBar; }
  }catch(e){}
  a._ok = false; a._pauseVoulue = 0;
  a.addEventListener('playing', function(){ _audConfirme(a); });
  a.addEventListener('timeupdate', function(){ if(a.currentTime > 0.05) _audConfirme(a); });
  var pr;
  try{ pr = a.play(); }catch(e){ _audLache(a); return false; }
  /* Un refus de lecture ne doit surtout pas être avalé : c'est le cas
     habituel sur iPhone, et le silence qui suit est indiscernable d'une
     musique qui marche si l'on se contente de regarder l'élément. */
  /* Une AbortError vient de notre propre pause() — pause du jeu, coupure de
     la musique, abandon volontaire — et n'est pas une panne de lecture. */
  if(pr && pr['catch']) pr['catch'](function(err){
    if(a._lache || a._pauseVoulue) return;
    if(err && err.name === 'AbortError') return;
    _audLache(a);
  });
  _audEl = a;
  _audWatch(a);
  // la suivante se met en tampon pendant que celle-ci joue : l'enchaînement
  // ne doit pas s'entendre
  var nx = _audList[(_audListI + 1) % _audList.length];
  if(nx && nx !== a && nx.preload !== 'auto'){ try{ nx.preload = 'auto'; nx.load(); }catch(e){} }
  return true;
}

/* Chien de garde, troisième version.

   Deuxième version : on surveillait « buffered » en croyant y lire la
   progression du chargement. Mesuré, c'est faux : avant les métadonnées,
   buffered reste VIDE alors que l'élément reçoit des mégaoctets — à 4 Mb/s,
   1,40 Mo en 5,4 s, un « progress » toutes les 380 ms, networkState LOADING,
   aucune erreur, et pourtant readyState 0 et buffered vide. La garde était
   donc restée un délai fixe déguisé, et sous 4,5 Mb/s elle abandonnait
   systématiquement une piste parfaitement saine.

   On écoute donc les signaux que le navigateur émet vraiment : « progress »
   pendant le téléchargement, « loadedmetadata », « canplay », « playing ».
   Tant qu'il en arrive, on attend. On n'abandonne que sur une erreur franche
   ou un silence total de trente secondes. */
var _audWatchTO = null;

function _audWatch(a){
  if(_audWatchTO) clearTimeout(_audWatchTO);
  a._vu = _audNow();
  if(!a._sondes){
    a._sondes = 1;
    var vivant = function(){ a._vu = _audNow(); };
    a.addEventListener('progress', vivant);
    a.addEventListener('loadedmetadata', vivant);
    a.addEventListener('loadeddata', vivant);
    a.addEventListener('canplay', vivant);
    a.addEventListener('suspend', vivant);
  }
  function controle(){
    _audWatchTO = null;
    if(!_audListOn || _audEl !== a) return;
    if(a.currentTime > 0.05 && !a.paused){ _audConfirme(a); return; }   // ça joue
    if(a.error){ _audLache(a); return; }
    // trente secondes sans le moindre signe de vie : là seulement on renonce
    if(_audNow() - a._vu > 30000){ _audLache(a); return; }
    _audWatchTO = setTimeout(controle, 900);
  }
  _audWatchTO = setTimeout(controle, 900);
}

function _audNow(){
  return (_audCtx ? _audCtx.currentTime * 1000 : 0);
}

/* Abandon franc : on coupe la source pour de bon, sinon l'élément se met à
   jouer quand ses données finissent par arriver. Le drapeau est posé AVANT
   la mise en pause : cette pause fait rejeter la promesse play() de
   l'élément avec une AbortError, et sans le drapeau ce rejet était compté
   comme une seconde panne — deux pannes suffisaient à démonter toute la
   liste, y compris la piste qui venait de démarrer correctement. */
function _audLache(a){
  if(a._lache) return;
  a._lache = 1;
  try{ a.pause(); }catch(e){}
  try{ a.removeAttribute('src'); a.load(); }catch(e){}
  if(_audEl === a) _audEl = null;
  _audErr(a);
}

/* Preuve que du son sort : c'est seulement là qu'on éteint la base
   synthétisée. L'éteindre au moment du play() laissait de longues secondes
   de silence complet quand l'élément faisait semblant de jouer. */
function _audConfirme(a){
  if(a._ok) return;
  a._ok = true;
  _audEchecs = {};
  if(!_audCtx) return;
  var t = _audCtx.currentTime;
  _audRamp(_audTrackG.gain, 1, 0.6, t);
  _audRamp(_audBaseG.gain, 0, 0.9, t);
  _audBaseSynth = false;
}

function _audStartTrack(t0){
  if(_audListOn) return _audStartStream(t0);
  if(!_audOk || _audTrackNode) return false;
  var buf = (typeof S !== 'undefined' && S) ? S.musicBuf : null;
  if(!buf || !buf.duration) return false;
  /* on démarre au prochain pas déjà libre : pas de notes jouées deux fois */
  if(_audNextT > t0) t0 = _audNextT;
  var lead = _audMeasureLead(buf);
  var src;
  try{
    src = _audCtx.createBufferSource();
    src.buffer = buf;
  }catch(e){ return false; }
  /* En repli mémoire, on alterne comme le flux : une piste entière, puis
     l'autre. Un seul tampon décodé à la fois — deux feraient deux cents
     mégaoctets de PCM. Sans relais déclaré, on boucle comme avant. */
  if(_audBufNext){
    src.loop = false;
    /* Un stop() programmé — pause, coupure, changement d'écran — déclenche
       lui aussi « ended ». Sans distinguer les deux, chaque pause était prise
       pour une fin de morceau : la liste avançait, la musique repartait
       toute seule par-dessus le silence attendu, et la piste demandée en
       premier n'était jamais entendue. */
    src.onended = function(){
      _audTrackNode = null;
      if(src._arret) return;
      var f = _audBufNext; if(f) f();
    };
  } else {
    src.loop = true;
    src.loopStart = lead;
    var loopLen = _audLoopSec > 0 ? _audLoopSec : (buf.duration - lead);
    src.loopEnd = Math.min(lead + loopLen, buf.duration);
  }
  try{ src.playbackRate.value = _audRate; }catch(e){}
  src.connect(_audTrackG);
  try{ src.start(t0, lead); }catch(e){ try{ src.start(0, lead); }catch(e2){ return false; } }
  _audTrackNode = src;

  /* la base synthétique s'efface en une seconde, la piste entre en fondu */
  _audRamp(_audTrackG.gain, 1, 0.9, t0);
  _audRamp(_audBaseG.gain, 0, 0.9, t0);
  _audBaseSynth = false;

  /* on recale les couches sur le départ de la boucle */
  _audStepI = 0;
  _audNextT = t0;
  return true;
}

function _audStopTrack(){
  // en flux, on met en pause : la reprise repart où on s'était arrêté
  if(_audListOn && _audEl){
    // pause voulue : le rejet de play() qui suit ne doit pas tuer la piste
    _audEl._pauseVoulue = 1;
    try{ _audEl.pause(); }catch(e){}
    _audEl = null;
  }
  if(_audTrackNode){
    _audTrackNode._arret = 1;            // arrêt voulu, pas une fin de piste
    try{ _audTrackNode.stop(); }catch(e){}
    try{ _audTrackNode.disconnect(); }catch(e){}
    _audTrackNode = null;
  }
  _audBaseSynth = true;
  var on = _audPlaying && _audMusicOn;
  if(_audTrackG){ try{ _audTrackG.gain.cancelScheduledValues(_audCtx.currentTime); }catch(e){} _audTrackG.gain.value = 1; }
  if(_audBaseG){ try{ _audBaseG.gain.cancelScheduledValues(_audCtx.currentTime); }catch(e){} _audBaseG.gain.value = on ? 1 : 0; }
}

/* coupure : le fondu court a déjà eu lieu, on éteint pour de bon */
function _audHardStop(){
  _audStopTO = null;
  if(!_audOk) return;
  _audStopTrack();
  if(_audPlaying) return;
  var L = _audLay, k;
  for(k in L){
    try{ L[k].g.gain.cancelScheduledValues(_audCtx.currentTime); }catch(e){}
    L[k].g.gain.value = 0;
    L[k].amt = 0;
  }
}

/* ------ application de l'intensité ------ */
function _audApplyInt(v, fade){
  var L = _audLay, k, l, a;
  for(k in L){
    l = L[k];
    a = (v - l.thr) / 0.12;
    if(a < 0) a = 0; else if(a > 1) a = 1;
    l.amt = a;
    _audRamp(l.g.gain, a * l.vol, fade);
  }
  /* Gain de PISTE : -7 dB quand rien ne se passe, 0 dB des que v >= 0,8.
     C'est ce qui fait que la musique suit l'action au lieu de rester un
     tapis constant — le passe-bas seul ne changeait le RMS que de 0,04 dB
     (mesure de prémisse), parce que la piste est deja pauvre en aigu. */
  var vb = v / 0.8; if(vb > 1) vb = 1;
  /* +1,2 dB de plancher qui s'efface quand l'action monte : la joueuse doit
     entendre la musique DES le clic sur JOUER (intensite ~0,21 a cet instant,
     bus mesure a -25,4 dBFS pour un seuil de -24), sans rien ajouter a v = 1
     ou le maitre doit garder la place de l'accent de phase. */
  var bg = Math.pow(10, (-7 + 7 * vb + 0.8 * (1 - vb)) / 20);
  if(_audTrackOnly) bg = 0;
  _audRamp(_audBaseIn.gain, bg, 1.0);
  /* filtre de la base : ~700 Hz fermé, grand ouvert à fond */
  var cut = 700 * Math.pow(25.7, v);
  if(cut > 18000) cut = 18000;
  _audRamp(_audBaseFilt.frequency, cut, fade * 0.8);
  /* vitesse de lecture 1.00 -> 1.06 */
  _audRate = 1 + 0.06 * v;
  if(_audTrackNode){
    try{ _audRamp(_audTrackNode.playbackRate, _audRate, 1.5); }catch(e){}
  }
  if(_audEl){ try{ _audEl.playbackRate = _audRate; }catch(e){} }
}

/* ======
   Module
   ====== */
S2030.audio = {
  /* Fait plonger la musique pour laisser passer une déflagration. Agit sur le
     bus musique uniquement : les effets, eux, gardent toute leur place. */
  duck: function (target, secs) {
    if (!_audDuck || !_audCtx) return;
    var t = _audCtx.currentTime, g = _audDuck.gain;
    try {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(Math.max(0, Math.min(1, target)), t + Math.max(0.01, secs || 0.2));
    } catch (e) {}
  },

  /* Décode un mp3 dans S.musicBuf. La double forme (callback + promesse) est
     nécessaire : Safari n'implémente que la forme à callbacks. */
  /* Prise de mesure. Sans elle, aucune vérification ne peut distinguer
     « la piste avance » de « du son sort » — c'est exactement cette
     confusion qui a laissé passer une musique muette. */
  tap: function (node, quoi) {
    if (!_audOk) return false;
    var src = quoi === 'musique' ? _audMusicBus : _audMaster;
    if (!src) return false;
    try { src.connect(node); } catch (e) { return false; }
    return true;
  },

  /* Liste de lecture : chaque piste est jouée en entier, puis la suivante,
     puis on recommence. Rien n'est décodé en mémoire. */
  playlist: function (urls, onfail) { return this.init() ? _audPlaylist(urls, onfail) : false; },
  playing: function () { return _audEl ? { i: _audListI, src: _audEl.currentSrc,
    t: _audEl.currentTime, dur: _audEl.duration } : null; },
  nextTrack: function () { _audAdvance(); },
  /* Position dans la piste courante, en secondes. Les éléments média vivent
     hors du document : sans cette prise, rien ne peut les atteindre. */
  seek: function (t) { if (_audEl) { try { _audEl.currentTime = t; } catch (e) {} } },
  /* Relais de fin de piste en repli mémoire : l'appelant décode la suivante. */
  onTrackEnd: function (fn) { _audBufNext = fn || null; },

  decode: function (ab) {
    var self = this;
    if (!ab) return Promise.resolve(null);
    try { self.init(); } catch (e) {}
    // init() garde le contexte dans _audCtx sans le publier : on le récupère
    var c = self.ctx || _audCtx;
    self.ctx = c;
    if (!c) return Promise.resolve(null);
    return new Promise(function (res) {
      var done = false;
      function ok(buf) { if (done) return; done = true; S.musicBuf = buf; res(buf); }
      function ko() { if (done) return; done = true; res(null); }
      try {
        var pr = c.decodeAudioData(ab, ok, ko);
        if (pr && pr.then) pr.then(ok, ko);
      } catch (e) { ko(); }
    });
  },


  ready: false,
  ctx: null,          /* exposé pour que le cœur décode S.musicBuf ici */

  init: function(){
    if(_audCtx) return _audOk;
    var AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if(!AC) return false;
    try{ _audCtx = new AC({ latencyHint: 'playback' }); }
    catch(e){ try{ _audCtx = new AC(); }catch(e2){ _audCtx = null; return false; } }

    /* graine locale dérivée de la graine du jeu, sans la consommer */
    if(typeof S !== 'undefined' && S && S.seed) _audSeed = (S.seed >>> 0) ^ 0x9e3779b9;
    if(!_audSeed) _audSeed = 0x9e3779b9;

    /* table MIDI -> Hz */
    _audHzTab = new Float32Array(128);
    for(var m = 0; m < 128; m++) _audHzTab[m] = 440 * Math.pow(2, (m - 69) / 12);

    /* constantes musicales du cœur, avec repli */
    if(typeof K !== 'undefined' && K){
      if(K.MUSIC_BPM) _audBpm = K.MUSIC_BPM;
      if(K.MUSIC_LOOP) _audLoopSec = K.MUSIC_LOOP;
    }
    _audBar = 60 / _audBpm * 4;                 /* une mesure = 4 temps */
    if(1){
    }
    var sd1 = 60 / _audBpm / 4;
    _audStepsLoop = _audLoopSec > 0 ? Math.max(16, Math.round(_audLoopSec / sd1 / 16) * 16) : 64;

    /* --- sortie commune : compresseur puis gain maître ------ */
    _audComp = _audCtx.createDynamicsCompressor();
    _audComp.threshold.value = -13;
    _audComp.knee.value = 24;
    _audComp.ratio.value = 5;
    _audComp.attack.value = 0.004;
    _audComp.release.value = 0.18;

    _audMaster = _audCtx.createGain();
    _audMaster.gain.value = 0.88;
    _audComp.connect(_audMaster);
    _audMaster.connect(_audCtx.destination);

    /* --- bus musique ------ */
    _audDuck = _audCtx.createGain();
    _audDuck.gain.value = 1;
    _audDuck.connect(_audComp);

    _audMusicBus = _audCtx.createGain();
    _audMusicBus.gain.value = 0.42;   // la musique laisse la place aux impacts
    _audMusicBus.connect(_audDuck);

    _audBaseFilt = _audCtx.createBiquadFilter();
    _audBaseFilt.type = 'lowpass';
    _audBaseFilt.frequency.value = 700;
    _audBaseFilt.Q.value = 0.8;
    _audBaseFilt.connect(_audMusicBus);

    _audBaseIn = _audCtx.createGain();
    _audBaseIn.gain.value = 1;
    _audBaseIn.connect(_audBaseFilt);

    /* Lissage de la PISTE, en amont du gain d'intensite : le mp3 a ses propres
       creux et ses propres cretes, qui n'ont rien a voir avec ce que fait la
       joueuse. Sans ce lissage, le RMS du bus musique est domine par le
       contenu du morceau et non par l'intensite (correlation mesuree a 0,46 -
       0,52 pour un seuil de 0,50), et un passage creux du morceau fait tomber
       le demarrage a -27,4 dBFS. Place AVANT _audBaseIn, il ne touche pas a la
       reponse a l'intensite : son taux de reduction ne depend pas de v. */
    _audTrackMk = _audCtx.createGain();
    _audTrackMk.gain.value = 1.03;                 /* rattrapage : le niveau du bus a v = 1 reste celui deja valide (-19,8 dBFS) */
    _audTrackMk.connect(_audBaseIn);

    _audTrackComp = _audCtx.createDynamicsCompressor();
    _audTrackComp.threshold.value = -18;
    _audTrackComp.knee.value = 12;
    _audTrackComp.ratio.value = 4;
    _audTrackComp.attack.value = 0.015;
    _audTrackComp.release.value = 0.28;
    _audTrackComp.connect(_audTrackMk);

    _audTrackG = _audCtx.createGain();
    _audTrackG.gain.value = 1;
    _audTrackG.connect(_audTrackComp);

    _audBaseG = _audCtx.createGain();
    _audBaseG.gain.value = 1;
    _audBaseG.connect(_audTrackComp);

    /* --- bus effets : compresseur dédié puis compresseur commun --------- */
    _audSfxComp = _audCtx.createDynamicsCompressor();
    _audSfxComp.threshold.value = -18;
    _audSfxComp.knee.value = 20;
    _audSfxComp.ratio.value = 8;
    _audSfxComp.attack.value = 0.002;
    _audSfxComp.release.value = 0.12;
    _audSfxComp.connect(_audComp);

    _audSfxIn = _audCtx.createGain();
    _audSfxIn.gain.value = 0.9;
    _audSfxIn.connect(_audSfxComp);

    /* L'accent de phase est un evenement MUSICAL, pas un bruitage : il entre
       dans le compresseur commun sans passer par celui des effets (seuil -18,
       rapport 8), qui l'ecrasait au moment precis ou il doit s'entendre —
       quand l'action bat son plein. Sans ce contournement, l'accent ne
       depassait le plancher que de 0,7 dB. */
    _audStingIn = _audCtx.createGain();
    _audStingIn.gain.value = 1;
    _audStingIn.connect(_audComp);

    /* panoramiques préalloués (aucune allocation dans la boucle chaude) */
    if(_audCtx.createStereoPanner){
      _audPans = [];
      for(var p = 0; p < 7; p++){
        var pn = _audCtx.createStereoPanner();
        pn.pan.value = (p - 3) / 3 * 0.85;
        pn.connect(_audSfxIn);
        _audPans.push(pn);
      }
    }

    /* bruit blanc réutilisable (2 s, bouclé) — générateur local */
    var len = (_audCtx.sampleRate * 2) | 0;
    _audNoiseBuf = _audCtx.createBuffer(1, len, _audCtx.sampleRate);
    var nd = _audNoiseBuf.getChannelData(0);
    for(var i = 0; i < len; i++) nd[i] = _audRnd() * 2 - 1;

    /* --- couches ------ */
    _audLay = {
      perc: _audMkLayer(0.07, 1.85),   /* entre des le calme : c'est elle qui porte le demarrage */
      arp:  _audMkLayer(0.35, 1.27),
      pad:  _audMkLayer(0.55, 0.99),
      lead: _audMkLayer(0.75, 0.99),
      clim: _audMkLayer(0.90, 1.27)
    };
    /* Les couches passent par leur propre bus, compresse doucement : elles
       montent a un niveau ou elles s'entendent vraiment sans que leur somme
       ne fasse pomper la piste. */
    _audLayComp = _audCtx.createDynamicsCompressor();
    /* Compression FERME des couches : elles sont percussives (doubles-croches),
       et leur RMS par fenetres de 93 ms sautait d'une fenetre a l'autre bien
       plus que ne le fait l'intensite. C'est ce bruit-la qui noyait la
       correlation intensite / RMS du bus musique (mesuree entre 0,32 et 0,73
       d'une partie a l'autre pour un seuil de 0,50). Les serrer rend leur
       niveau representatif de leur AMPLEUR, donc de v. */
    _audLayComp.threshold.value = -26;
    _audLayComp.knee.value = 14;
    _audLayComp.ratio.value = 6;
    _audLayComp.attack.value = 0.006;
    _audLayComp.release.value = 0.20;
    /* Rattrapage : serrer les couches leur coute 1,6 dB de RMS (mesure :
       couches seules a v = 1, -23,69 dBFS avant, -25,34 apres, pour un
       plancher de spec a -24). On le rend, pas plus. */
    _audLayMk = _audCtx.createGain();
    _audLayMk.gain.value = 1.29;
    _audLayMk.connect(_audMusicBus);
    _audLayComp.connect(_audLayMk);
    _audLayBus = _audCtx.createGain();
    _audLayBus.gain.value = 1;
    _audLayBus.connect(_audLayComp);
    _audLay.perc.g.connect(_audLayBus);
    _audLay.arp.g.connect(_audLayBus);
    _audLay.pad.g.connect(_audLayBus);
    _audLay.clim.g.connect(_audLayBus);

    /* le lead passe par une saturation douce */
    var sh = _audCtx.createWaveShaper();
    _audDriveCurve = _audCurve(9);
    sh.curve = _audDriveCurve;
    sh.oversample = '2x';
    _audLay.lead.g.connect(sh);
    sh.connect(_audLayBus);

    _audOk = true;
    this.ready = true;
    this.ctx = _audCtx;
    _audApplyInt(0, 0.01);
    return true;
  },

  start: function(){
    if(!this.init()) return;
    /* tout état autre que 'running' : 'suspended', mais aussi 'interrupted'
       (Safari après un appel ou un changement de sortie) */
    if(_audCtx.state !== 'running'){ try{ var _rp = _audCtx.resume(); if(_rp && _rp['catch']) _rp['catch'](function(){}); }catch(e){} }
    var now = _audCtx.currentTime;
    _audPlaying = true;
    _audMuteAt = 1e9;
    if(_audStopTO){ clearTimeout(_audStopTO); _audStopTO = null; }
    if(_audMusicOn){
      _audRamp(_audMusicBus.gain, 0.40, 0.4);
      _audRamp(_audDuck.gain, 1, 0.2);
      if(!_audTrackNode && !_audStartTrack(now + 0.06)){
        /* pas de piste : base entièrement synthétisée */
        _audBaseSynth = true;
        _audBaseG.gain.value = 1;
        _audStepI = 0;
        _audNextT = now + 0.08;
      }
    }
    if(!_audTimer) _audTimer = setInterval(_audTick, 45);
  },

  stop: function(){
    _audPlaying = false;
    if(_audTimer){ clearInterval(_audTimer); _audTimer = null; }
    if(!_audOk) return;
    var now = _audCtx.currentTime;
    /* coupure = vrai silence : fondu court, puis arrêt réel des sources */
    _audRamp(_audMusicBus.gain, 0, 0.18, now);
    _audRamp(_audBaseG.gain, 0, 0.18, now);
    var L = _audLay, k;
    for(k in L){ _audRamp(L[k].g.gain, 0, 0.18, now); L[k].amt = 0; }
    if(_audStopTO) clearTimeout(_audStopTO);
    _audStopTO = setTimeout(_audHardStop, 240);
    _audIntApplied = -1;
    _audIntT = -9;
  },

  resume: function(){
    if(!this.init()) return;
    /* tout état autre que 'running' : 'suspended', mais aussi 'interrupted'
       (Safari après un appel ou un changement de sortie) */
    if(_audCtx.state !== 'running'){ try{ var _rp = _audCtx.resume(); if(_rp && _rp['catch']) _rp['catch'](function(){}); }catch(e){} }
    if(_audPlaying){
      if(_audStopTO){ clearTimeout(_audStopTO); _audStopTO = null; }
      if(!_audTimer) _audTimer = setInterval(_audTick, 45);
    }
  },

  setIntensity: function(v){
    if(!_audOk) return;
    v = v < 0 ? 0 : (v > 1 ? 1 : v);
    _audInt = v;
    var now = _audCtx.currentTime;
    if(now - _audIntT < 0.12) return;                 /* 8 réglages/s au plus */
    var d = v - _audIntApplied;
    if(d < 0) d = -d;
    if(d < 0.004) return;
    _audIntT = now;
    _audIntApplied = v;
    _audApplyInt(v, 1.0);                              /* fondus d'environ 1 s */
  },

  setMusic: function(on){
    _audMusicOn = !!on;
    if(!_audOk) return;
    var now = _audCtx.currentTime;
    if(_audMusicOn){
      _audMuteAt = 1e9;
      if(_audStopTO){ clearTimeout(_audStopTO); _audStopTO = null; }
      _audRamp(_audMusicBus.gain, 0.40, 0.3, now);
      if(_audPlaying){
        if(!_audTrackNode && !_audStartTrack(now + 0.06)){
          _audBaseSynth = true;
          _audRamp(_audBaseG.gain, 1, 0.3, now);
          _audStepI = 0;
          _audNextT = now + 0.08;
        }
        if(!_audTimer) _audTimer = setInterval(_audTick, 45);
      }
      _audIntApplied = -1; _audIntT = -9;
      _audApplyInt(_audInt, 0.5);
    }else{
      _audRamp(_audMusicBus.gain, 0, 0.25, now);
      _audMuteAt = now + 0.3;                          /* arrêt réel ensuite */
      if(_audStopTO) clearTimeout(_audStopTO);
      _audStopTO = setTimeout(_audHardStop, 320);
    }
  },

  setSfx: function(on){
    _audSfxOn = !!on;
    if(!_audOk) return;
    _audRamp(_audSfxIn.gain, _audSfxOn ? 0.9 : 0, 0.12);
  },

  /* sondes de mise au point : nombre de sons reellement joues */
  stats: function(){ return JSON.parse(JSON.stringify(_audPlayed)); },
  resetStats: function(){ _audPlayed = {}; },

  sfx: function(name, opts){
    if(!_audOk || !_audSfxOn) return;
    var fn = _audFx[name];
    if(!fn) return;
    var t = _audCtx.currentTime + 0.002;
    var v = 1, d = _audSfxIn;
    if(opts){
      if(opts.vol !== undefined && opts.vol !== null) v = opts.vol;
      if(opts.x !== undefined && opts.x !== null) d = _audDestFor(opts.x);
    }
    if(v <= 0) return;
    if(v > 2) v = 2;

    /* --- KILL : aucune voix perdue -------------------------------------
       Un kill qui tombe dans les 40 ms d'un autre ne rejoue pas le corps
       grave (qui s'empilerait en boue) mais AJOUTE une note courte, un
       demi-ton plus haut par kill de combo et 1 dB plus fort. Elle est
       posee au moins 12 ms apres la precedente : huit kills demandes dans
       la meme image restent huit attaques distinctes, ce qu'un seul
       instant de depart ne permettrait pas. Le compte est tenu ici, donc
       aucun kill ne peut etre avale par la garde. */
    if(name === 'kill' || name === 'bigkill'){
      if(t - _audKillT < 0.040 && _audKillT > 0){
        var tk = _audKillT + 0.012; if(tk < t) tk = t;
        _audKillN++; if(_audKillN > 12) _audKillN = 12;
        var pk = Math.pow(2, _audKillN / 12);
        var vk = v * Math.pow(10, _audKillN / 20) * 0.55 * (_audFxGain[name] || 1);
        _audF0 = 640 * pk;
        _audTone(tk, 'square', 640 * pk, 420 * pk, 0.030, 0.13 * vk, 0.001, 5200, 2200, 1.5, d, 0);
        _audNoise(tk, 'bandpass', 2400 * pk, 1400 * pk, 0.026, 0.07 * vk, 1.8, d);
        _audKillT = tk;
        _audPlayed[name] = (_audPlayed[name] || 0) + 1;
        _audLast.name = name; _audLast.f0 = _audF0; _audLast.t = tk;
        return;
      }
      _audKillT = t; _audKillN = 0;
      _audPlayed[name] = (_audPlayed[name] || 0) + 1;
    } else if(!_audAllow(name, t)) return;

    /* --- PICKUP : la hauteur monte sur les ramassages consecutifs ------ */
    if(name === 'pickup'){
      if(t - _audPickT < 1.2){ _audPickN++; if(_audPickN > 12) _audPickN = 12; }
      else _audPickN = 0;
      _audPickT = t;
      if(!opts) opts = {};
      opts.pitch = Math.pow(2, _audPickN / 12);
    }

    v *= (_audFxGain[name] || 1);
    _audF0 = 0;
    fn(t, v, d, opts);
    _audLast.name = name; _audLast.f0 = _audF0; _audLast.t = t;
  },

  lastSfx: function(){ return { name: _audLast.name, f0: _audLast.f0, t: _audLast.t }; },

  /* Accent d'une mesure (4 temps au tempo du morceau) : la musique MARQUE
     le changement de phase de niveau au lieu de le laisser passer. */
  stinger: function(force){
    if(!_audOk || !_audSfxOn) return;
    var t = _audCtx.currentTime + 0.002, b = 60 / (_audBpm * _audRate);
    /* Facteur 6 : mesure de la courbe de saturation du maitre (compresseur
       seuil -13, rapport 5). Dans un plancher d'action a -17,4 dBFS, l'accent
       au facteur 1 ne depasse que de 2,0 dB, a 2 de 4,0, a 3 de 5,6, a 4,5
       d'environ 7, a 6 de 7,6 : le maitre sature ensuite. On prend 6. La
       spec demande +4 dB sur la seconde precedente ; le pire passage mesure en
       partie (climax -> clear) part d'un plancher a -15,6 dBFS. */
    var d = _audStingIn || _audSfxIn, v = (force ? force : 1) * 6;
    _audNoise(t, 'highpass', 3000, 7600, 0.32, 0.30 * v, 0.8, d);
    _audTone(t, 'sawtooth', _audHz(69), 0, 0.30, 0.17 * v, 0.003, 1600, 5200, 3, d, -9);
    _audTone(t, 'sawtooth', _audHz(76), 0, 0.30, 0.15 * v, 0.003, 1600, 5200, 3, d, 9);
    _audSub(t, 160, 46, 0.26, 0.26 * v, d);
    _audTone(t + b,     'square', _audHz(81), 0, 0.10, 0.10 * v, 0.002, 4200, 2200, 2, d, 0);
    _audTone(t + b * 2, 'square', _audHz(83), 0, 0.10, 0.10 * v, 0.002, 4200, 2200, 2, d, 0);
    _audTone(t + b * 3, 'square', _audHz(88), 0, 0.24, 0.13 * v, 0.002, 4600, 2400, 2, d, 0);
    _audNoise(t + b * 3, 'highpass', 4200, 8000, 0.26, 0.16 * v, 0.8, d);
    _audPlayed.stinger = (_audPlayed.stinger || 0) + 1;
  },

  /* Chute : 250 ms de silence, puis tout revient d'un coup. Reservee a
     l'entree du boss — c'est le seul moment ou le jeu a le droit de se
     taire. */
  drop: function(){
    if(!_audOk || !_audMusicBus) return;
    var t = _audCtx.currentTime, g = _audMusicBus.gain;
    try{
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.0001, t + 0.03);
      g.setValueAtTime(0.0001, t + 0.25);
      g.linearRampToValueAtTime(_audMusicOn ? 0.40 : 0, t + 0.30);
    }catch(e){}
    _audPlayed.drop = (_audPlayed.drop || 0) + 1;
  },

  /* Prise de mesure : coupe la PISTE pour n'entendre que les couches. Sans
     elle, aucune verification ne peut dire si les couches s'entendent, la
     piste couvrant tout. */
  layersOnly: function(on){
    _audTrackOnly = on ? 1 : 0;
    if(!_audOk) return;
    _audIntApplied = -1; _audIntT = -9;
    _audApplyInt(_audInt, 0.05);
  },

  /* Duree d'une mesure, en secondes — la reprise apres une mort s'y cale. */
  bar: function(){ return _audBar; },

  /* plongeon bref, battement grave, retour explosif */
  ultimate: function(){
    if(!_audOk) return;
    var t = _audCtx.currentTime + 0.002;
    var g = _audDuck.gain;

    /* 1. la musique plonge */
    try{ g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }catch(e){}
    g.linearRampToValueAtTime(0.10, t + 0.09);

    /* 2. battement grave + montée inversée */
    _audSub(t + 0.02, 74, 26, 0.46, 0.75, _audSfxIn);
    _audSub(t + 0.30, 58, 20, 0.42, 0.60, _audSfxIn);
    _audNoise(t + 0.05, 'bandpass', 260, 5400, 0.62, 0.14, 1.3, _audSfxIn);
    _audTone(t + 0.05, 'sawtooth', 90, 900, 0.62, 0.05, 0.3, 400, 5200, 3, _audSfxIn, 0);

    /* 3. retour explosif */
    var te = t + 0.68;
    _audNoise(te, 'lowpass', 9000, 160, 0.85, 0.32, 0.7, _audSfxIn);
    _audSub(te, 200, 28, 0.80, 0.65, _audSfxIn);
    _audTone(te, 'sawtooth', 1500, 150, 0.55, 0.12, 0.003, 6800, 380, 3, _audSfxIn, -14);
    _audTone(te, 'sawtooth', 1500, 150, 0.55, 0.10, 0.003, 6000, 380, 3, _audSfxIn, 14);
    g.setValueAtTime(0.10, te - 0.02);
    g.linearRampToValueAtTime(1.28, te + 0.10);
    g.linearRampToValueAtTime(1.00, te + 0.70);
  }
};
