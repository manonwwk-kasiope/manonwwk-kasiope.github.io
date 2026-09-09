/* ======
   SNAKE 2030 — 25-levels.js
   S2030.levels : les arènes, leur décor animé, leurs dangers, et la montée
   en intensité (vagues, phases, élites, transitions).

   Trois arènes distinctes puis une surcharge infinie :
     1. LA GRILLE       — bleu électrique, arène dégagée, aucune mécanique.
     2. AUTOROUTE NÉON  — rose/violet/chrome, voies de circulation balayées
                          par des convois qui traversent l'arène.
     3. ZONE MAGNÉTIQUE — cyan/ambre, noeuds d'attraction et de répulsion qui
                          courbent le serpent ET les projectiles.
     4+ SURCHARGE       — recombinaison des mécaniques, montée sans fin.

   Rythme de chaque niveau : calm → rise → surge → climax → clear.
   S.intensity (0..1) est piloté par la phase et la densité (lu par l'audio).
   S.levelProgress (0..1) est lu par l'UI.

   Contraintes tenues : aucune allocation dans les boucles chaudes (tampons
   et pools préalloués, dégradés mis en cache), aucun Math.random, aucun
   Date.now, aucun accès au DOM.
   ====== */

/* ------ constantes */

var _LV_PHASES = ['calm', 'rise', 'surge', 'climax', 'clear'];
var _LV_HARDCAP = 130;          // plafond absolu d'ennemis vivants, garde-fou perf
/* G9 : le plafond ne s'ouvre à 160 que si la qualité automatique n'a retiré
   AUCUN cran (_qStep === 0, 90-boot.js) — c'est-à-dire si la machine tient la
   cadence. autoQuality ne calcule aucune moyenne d'images/s : elle compte la
   part d'images longues, et _qStep est sa seule sortie. */
function _lvHardcap() { return (typeof _qStep === 'number' && _qStep === 0) ? 160 : _LV_HARDCAP; }
var _LV_MARGIN = 70;            // marge d'apparition par rapport aux bords
var _LV_ALLMODS = ['armored', 'fast', 'teleporter', 'explosive', 'regen', 'shielded'];

/* Palettes de la surcharge : on tourne dessus, cycle après cycle. */
var _LV_OVERPAL = [
  { bg: '#12030f', bg2: '#3a0736', grid: '#5d1246', gridHot: '#ff2e9a',
    accent: '#ff4fd8', warm: '#ffd166', danger: '#ff2b2b', bloom: '#8a1060',
    pull: '#00e5ff', push: '#ffb43c', lane: '#ff2e9a', chrome: '#cfe9ff' },
  { bg: '#030f12', bg2: '#06343a', grid: '#0b4a52', gridHot: '#00e5ff',
    accent: '#00e5ff', warm: '#ffe45e', danger: '#ff2b2b', bloom: '#0a5f6b',
    pull: '#7CFFB2', push: '#ff8a3d', lane: '#00e5ff', chrome: '#cfe9ff' },
  { bg: '#10060a', bg2: '#3d0d12', grid: '#5a1420', gridHot: '#ff5c3a',
    accent: '#ffb43c', warm: '#fff3b0', danger: '#ff2b2b', bloom: '#7a1418',
    pull: '#b388ff', push: '#ff5c3a', lane: '#ffb43c', chrome: '#e6d2ff' }
];

/* ======
   DÉFINITIONS DES NIVEAUX
   Une vague : { p:phase, every:s, jit:0..1, cap:plafond, g:[[type,n,motif]],
                 eliteP:probabilité, mods:[modificateurs] }
   Les motifs d'apparition : edge, ring, ahead, flank, pack, lane, corner.
   ====== */

var _lvDefs = [

  /* ------ 1 : GRILLE */
  {
    n: 1,
    name: 'LA GRILLE',
    sub: 'SECTEUR D\'ENTRAÎNEMENT',
    hint: 'ÉVITE LE CONTACT, LE CANON TIRE SEUL',
    mech: 'none',
    palette: {
      bg: '#03060f', bg2: '#071433', grid: '#0f2e63', gridHot: '#2f7fff',
      accent: '#00e5ff', warm: '#7df9ff', danger: '#ff2e63', bloom: '#0b3f8f',
      dust: '#4f9bff', chrome: '#cfe9ff', lane: '#2f7fff', pull: '#00e5ff', push: '#ffb43c'
    },
    back: { grid: 1, cell: 132, scan: 1, lanes: 0, field: 0, overload: 0 },
    fore: { fog: 0.10, streaks: 0 },
    dur: { calm: 10, rise: 24, surge: 24, climax: 34, clear: 6 },
    rigs: 0, nodes: 0, fieldTurn: 0,
    mods: ['armored'],
    boss: { name: 'PROTOTYPE ZÉRO', type: 'chaser', mod: 'armored', n: 1, hpF: 1.55,
            escort: [['chaser', 5, 'ring'], ['shooter', 1, 'flank']] },
    spawns: [
      { p: 'calm',  every: 3.2, jit: 0.9, cap: 18, g: [['chaser', 2, 'edge']] },
      { p: 'calm',  every: 9.0, jit: 0.6, cap: 14, g: [['mine', 1, 'ahead']] },

      { p: 'rise',  every: 3.6, every0: 5.0, ramp: 10, jit: 0.8, cap: 30, g: [['chaser', 3, 'edge']] },
      { p: 'rise',  every: 8.0, jit: 0.8, cap: 28, g: [['chaser', 1, 'flank']] },
      { p: 'rise',  every: 8.5, jit: 0.7, cap: 26, g: [['mine', 2, 'ahead']] },
      /* G9 — l'ARTILLEUR retrouve sa place : G6 l'avait raréfié (10,6 % de la
         population -> 2,9 %) en le rendant lisible. Il reste derrière la porte
         de la première carte, mais il revient plus tôt et en nombre. */
      { p: 'rise',  every: 6.5, jit: 0.7, cap: 26, g: [['shooter', 1, 'flank']] },

      { p: 'surge', every: 3.0, jit: 0.7, cap: 44, g: [['chaser', 4, 'ring']], eliteP: 0.08 },
      { p: 'surge', every: 5.0, jit: 0.7, cap: 42, g: [['interceptor', 2, 'flank']], eliteP: 0.06 },
      { p: 'surge', every: 5.0, jit: 0.6, cap: 40, g: [['shooter', 2, 'edge'], ['chaser', 1, 'edge']] },
      { p: 'surge', every: 9.0, jit: 0.5, cap: 38, g: [['mine', 3, 'pack']] },

      { p: 'climax', every: 4.2, jit: 0.6, cap: 46, g: [['chaser', 3, 'edge']] },
      { p: 'climax', every: 6.0, jit: 0.6, cap: 46, g: [['shooter', 1, 'flank']] }
    ]
  },

  /* ------ 2 : AUTOROUTE */
  {
    n: 2,
    name: 'AUTOROUTE NÉON',
    sub: 'ARTÈRE 7 — TRAFIC DENSE',
    hint: 'LES CONVOIS BALAIENT LES VOIES',
    mech: 'lanes',
    palette: {
      bg: '#0a0316', bg2: '#26063f', grid: '#3a0d5e', gridHot: '#b388ff',
      accent: '#ff2e9a', warm: '#ffd166', danger: '#ff2b2b', bloom: '#5c0f7a',
      dust: '#d18cff', chrome: '#cfe9ff', lane: '#ff2e9a', pull: '#00e5ff', push: '#ffb43c'
    },
    back: { grid: 1, cell: 168, scan: 0, lanes: 1, field: 0, overload: 0 },
    fore: { fog: 0.13, streaks: 1 },
    dur: { calm: 16, rise: 26, surge: 28, climax: 36, clear: 6 },
    rigs: 5, nodes: 0, fieldTurn: 0,
    laneY: [0.13, 0.325, 0.5, 0.675, 0.87],
    laneH: 148,
    rigSpd: [215, 330],
    mods: ['fast', 'explosive'],
    boss: { name: 'DOUBLE LAME', type: 'cutter', mod: 'fast', n: 2, hpF: 14.0,
            escort: [['interceptor', 5, 'lane'], ['shooter', 1, 'ring']] },
    spawns: [
      { p: 'calm',  every: 4.2, jit: 0.8, cap: 20, g: [['chaser', 2, 'lane']] },
      { p: 'calm',  every: 7.5, jit: 0.7, cap: 18, g: [['interceptor', 1, 'ahead']] },

      { p: 'rise',  every: 3.4, jit: 0.8, cap: 34, g: [['interceptor', 2, 'lane']] },
      { p: 'rise',  every: 5.2, jit: 0.7, cap: 32, g: [['cutter', 1, 'flank']], eliteP: 0.05, mods: ['fast'] },
      { p: 'rise',  every: 7.0, jit: 0.6, cap: 30, g: [['chaser', 3, 'edge']] },
      { p: 'rise',  every: 6.5, jit: 0.7, cap: 30, g: [['shooter', 1, 'flank']] },

      { p: 'surge', every: 2.9, jit: 0.6, cap: 50, g: [['interceptor', 3, 'lane'], ['chaser', 2, 'edge']], eliteP: 0.09, mods: ['fast', 'explosive'] },
      { p: 'surge', every: 4.6, jit: 0.6, cap: 48, g: [['cutter', 2, 'flank']], eliteP: 0.08, mods: ['fast'] },
      { p: 'surge', every: 5.0, jit: 0.6, cap: 46, g: [['shooter', 2, 'ring'], ['interceptor', 1, 'lane']] },
      { p: 'surge', every: 8.0, jit: 0.5, cap: 44, g: [['thief', 1, 'edge']] },

      { p: 'climax', every: 3.8, jit: 0.5, cap: 52, g: [['interceptor', 3, 'lane'], ['mine', 2, 'ahead']] },
      { p: 'climax', every: 6.0, jit: 0.6, cap: 52, g: [['shooter', 1, 'ring']] }
    ]
  },

  /* ------ 3 : MAGNÉTIQUE */
  {
    n: 3,
    name: 'ZONE MAGNÉTIQUE',
    sub: 'RÉACTEUR ORBITAL — CHAMPS INSTABLES',
    hint: 'CYAN ATTIRE, AMBRE REPOUSSE',
    mech: 'field',
    palette: {
      bg: '#020a0e', bg2: '#04292f', grid: '#0a3d45', gridHot: '#00e5ff',
      accent: '#00e5ff', warm: '#ffb43c', danger: '#ff2b2b', bloom: '#06555f',
      dust: '#6fe8ff', chrome: '#cfe9ff', lane: '#00e5ff', pull: '#00e5ff', push: '#ffb43c'
    },
    back: { grid: 1, cell: 96, scan: 0, lanes: 0, field: 1, overload: 0 },
    fore: { fog: 0.11, streaks: 0 },
    dur: { calm: 18, rise: 28, surge: 30, climax: 40, clear: 6 },
    rigs: 0, nodes: 4, fieldTurn: 1.55,
    nodeR: [190, 300], nodeDrift: 26,
    mods: ['shielded', 'teleporter', 'regen'],
    boss: { name: 'NOYAU MAGNÉTIQUE', type: 'spawner', mod: 'shielded', n: 1, hpF: 2.50,
            escort: [['jammer', 1, 'edge'], ['parasite', 3, 'ring']] },
    spawns: [
      { p: 'calm',  every: 4.0, jit: 0.8, cap: 22, g: [['chaser', 2, 'ring']] },
      { p: 'calm',  every: 8.0, jit: 0.6, cap: 20, g: [['parasite', 1, 'edge']] },

      { p: 'rise',  every: 3.4, jit: 0.8, cap: 36, g: [['chaser', 3, 'ring'], ['parasite', 1, 'flank']] },
      { p: 'rise',  every: 5.6, jit: 0.7, cap: 34, g: [['parasite', 1, 'flank'], ['chaser', 2, 'ring']], eliteP: 0.05, mods: ['shielded'] },
      { p: 'rise',  every: 9.0, jit: 0.6, cap: 32, g: [['mirror', 1, 'ahead']] },
      { p: 'rise',  every: 6.5, jit: 0.7, cap: 32, g: [['shooter', 1, 'flank']] },

      { p: 'surge', every: 2.8, jit: 0.6, cap: 54, g: [['mite', 5, 'pack'], ['chaser', 2, 'edge']] },
      { p: 'surge', every: 4.4, jit: 0.6, cap: 52, g: [['parasite', 2, 'flank'], ['mine', 2, 'ahead']] },
      { p: 'surge', every: 6.0, jit: 0.6, cap: 50, g: [['jammer', 1, 'edge']], eliteP: 0.10, mods: ['shielded', 'regen'] },
      { p: 'surge', every: 7.4, jit: 0.5, cap: 48, g: [['mirror', 1, 'ring'], ['mite', 3, 'pack']], eliteP: 0.08, mods: ['teleporter'] },
      { p: 'surge', every: 5.0, jit: 0.5, cap: 48, g: [['shooter', 2, 'ring']], eliteP: 0.06, mods: ['teleporter'] },

      { p: 'climax', every: 3.6, jit: 0.5, cap: 56, g: [['mite', 6, 'pack'], ['parasite', 2, 'flank']] }
    ]
  },

  /* ------ 4+ SURCHARGE */
  {
    n: 4,
    name: 'SURCHARGE',
    sub: 'TOUT LE SYSTÈME EN MÊME TEMPS',
    hint: 'CONVOIS ET CHAMPS COMBINÉS',
    mech: 'overload',
    palette: _LV_OVERPAL[0],
    back: { grid: 1, cell: 120, scan: 1, lanes: 1, field: 1, overload: 1 },
    fore: { fog: 0.15, streaks: 1 },
    dur: { calm: 12, rise: 22, surge: 30, climax: 42, clear: 5 },
    rigs: 5, nodes: 3, fieldTurn: 1.35,
    laneY: [0.18, 0.5, 0.82],
    laneH: 156,
    rigSpd: [240, 380],
    nodeR: [180, 280], nodeDrift: 34,
    mods: _LV_ALLMODS,
    boss: { name: 'SURCHARGE', type: 'spawner', mod: null, n: 1, hpF: 2.50,
            escort: [['mirror', 2, 'ring'], ['cutter', 2, 'flank'], ['jammer', 1, 'edge']] },
    spawns: [
      { p: 'calm',  every: 3.4, jit: 0.7, cap: 26, g: [['chaser', 3, 'ring'], ['interceptor', 1, 'lane']] },
      { p: 'calm',  every: 6.5, jit: 0.6, cap: 24, g: [['mine', 2, 'ahead']] },

      { p: 'rise',  every: 3.0, jit: 0.7, cap: 44, g: [['interceptor', 3, 'lane'], ['cutter', 1, 'flank']], eliteP: 0.08 },
      { p: 'rise',  every: 5.0, jit: 0.6, cap: 42, g: [['parasite', 2, 'edge'], ['chaser', 2, 'ring']] },

      { p: 'surge', every: 2.5, jit: 0.6, cap: 64, g: [['chaser', 4, 'ring'], ['mite', 4, 'pack']], eliteP: 0.12 },
      { p: 'surge', every: 3.8, jit: 0.6, cap: 62, g: [['cutter', 2, 'flank'], ['interceptor', 2, 'lane']], eliteP: 0.12 },
      { p: 'surge', every: 5.2, jit: 0.5, cap: 60, g: [['jammer', 1, 'edge'], ['mirror', 1, 'ahead'], ['chaser', 2, 'ring']], eliteP: 0.14 },
      { p: 'surge', every: 4.6, jit: 0.5, cap: 60, g: [['shooter', 2, 'ring']], eliteP: 0.14 },
      { p: 'surge', every: 7.0, jit: 0.5, cap: 58, g: [['spawner', 1, 'edge'], ['thief', 1, 'edge']] },

      { p: 'climax', every: 3.2, jit: 0.5, cap: 70, g: [['chaser', 4, 'ring'], ['interceptor', 2, 'lane'], ['mite', 4, 'pack']], eliteP: 0.10 },
      { p: 'climax', every: 6.0, jit: 0.6, cap: 70, g: [['shooter', 1, 'ring']], eliteP: 0.10 }
    ]
  }
];

/* ======
   ÉTAT D'EXÉCUTION
   ====== */

var _lvHaz = [];            // dangers vivants, exposés par l'API
var _lvHazPool = [];        // recyclage, aucune allocation en régime établi

var _lvDef = null;          // définition du niveau courant
var _lvPal = null;          // palette courante (peut être une variante de surcharge)
var _lvCycle = 0;           // 0 pour les niveaux 1..3, 1..n pour la surcharge
var _lvN = 1;

var _lvPhaseI = 0;
var _lvPhaseT = 0;
var _lvPhaseDur = 1;
var _lvPhaseRaw = 1;        // durée nominale, sert à la barre de progression
var _lvTotalDur = 1;
var _lvBefore = 0;          // durée cumulée des phases précédentes

var _lvWaveT = [];          // minuteries des vagues, indexées comme spawns
var _lvElites = [];         // élites du climax, pour savoir quand il tombe
var _lvBoss = null;

var _lvLanes = [];          // voies de circulation
var _lvRigT = 0;            // minuterie d'apparition des convois
var _lvMag = [];            // noeuds magnétiques (référencés aussi dans _lvHaz)

var _lvDanger = 0;          // 0..1, pulsation rouge du cadre
var _lvIntens = 0;          // intensité lissée
var _lvRingA = 0;           // rotation du motif d'apparition en anneau

/* Tampons de dessin, jamais réalloués */
var _lvDust = null;                       // poussière de données, parallaxe
var _lvMote = null;                       // particules du champ magnétique
var _lvStreak = null;                     // traits de vitesse de l'autoroute
var _lvFilA = new Float32Array(2800);     // limaille : segments « attraction »
var _lvFilB = new Float32Array(2800);     // limaille : segments « répulsion »
var _lvFilNA = 0, _lvFilNB = 0;
var _lvNear = [];                         // copie locale de enemiesNear

/* Sorties de fonctions, pour ne rien allouer */
var _lvPX = 0, _lvPY = 0;
var _lvFFX = 0, _lvFFY = 0;
var _lvHitOpt = { x: 0, y: 0, type: 'shock' };

/* Caches de dégradés */
var _lvBloomG = [];
var _lvBloomP = [];
var _lvVigG = null, _lvVigKey = '';
var _lvDngG = null, _lvDngKey = '';
var _lvGradW = 0, _lvGradH = 0;

/* ======
   PETITES AIDES
   ====== */

var _lvRgbC = {};
function _lvRgb(hex) {
  var v = _lvRgbC[hex];
  if (v) return v;
  var h = hex.charAt(0) === '#' ? hex.substring(1) : hex;
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  var n = parseInt(h, 16);
  v = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  _lvRgbC[hex] = v;
  return v;
}
/* Uniquement pour les arrêts de dégradés, construits une fois puis mis en cache. */
function _lvRgba(hex, a) { return 'rgba(' + _lvRgb(hex) + ',' + a + ')'; }

function _lvHazGet(kind) {
  var h = _lvHazPool.pop();
  if (!h) {
    h = { kind: '', x: 0, y: 0, vx: 0, vy: 0, w2: 0, h2: 0, r: 0, r2: 0,
          pull: 0, str: 0, ax: 0, dir: 1, lane: 0, warn: 0, life: 0, ph: 0, col: '#ffffff' };
  }
  h.kind = kind; h.vx = 0; h.vy = 0; h.warn = 0; h.life = 0; h.ph = rnd() * TAU;
  _lvHaz.push(h);
  return h;
}
function _lvHazDrop(i) {
  var h = _lvHaz[i];
  _lvHaz.splice(i, 1);
  if (_lvHazPool.length < 64) _lvHazPool.push(h);
}
function _lvHazClear() {
  while (_lvHaz.length) _lvHazDrop(_lvHaz.length - 1);
  _lvMag.length = 0;
}

function _lvSay(title, dur) {
  if (S.phase !== 'play') return;
  if (S2030.ui && S2030.ui.banner) S2030.ui.banner(title, dur);
}
function _lvHint(title, sub) {
  if (S.phase !== 'play') return;
  if (S2030.ui && S2030.ui.toast) S2030.ui.toast(title, sub);
}

/* enemiesNear renvoie un tampon partagé par le cœur : on le recopie avant
   d'infliger des dégâts, car une mort peut relancer une requête imbriquée. */
function _lvCollect(x, y, r) {
  var l = enemiesNear(x, y, r);
  _lvNear.length = 0;
  for (var i = 0; i < l.length; i++) _lvNear.push(l[i]);
  return _lvNear;
}

/* ======
   POINTS D'APPARITION
   Remplit _lvPX / _lvPY. Toujours dans l'arène, de préférence hors champ.
   ====== */

var _lvVisW = 640, _lvVisH = 390;
/* demi-étendue à couvrir : le plus grand du tampon caméra et de l'étendue
   réellement montrée (phases.visibleExtent) — R part de là, +150 u */
var _lvAntX = 0, _lvAntY = 0;
function _lvVisHalf() {
  var P = S2030.phases, V = (P && P.visibleExtent) ? P.visibleExtent() : null, s = S.snake;
  _lvVisW = S.view.w * 0.5; _lvVisH = S.view.h * 0.5;
  // caméra anticipée : pendant les 600 ms du portail elle avance d'environ
  // 0,6 s de course plus son avance (0,55 s) — un point tout juste caché
  // maintenant serait dans le champ à l'éclosion
  _lvAntX = s ? s.x + Math.cos(s.ang) * s.speed * 1.15 : S.cam.x;
  _lvAntY = s ? s.y + Math.sin(s.ang) * s.speed * 1.15 : S.cam.y;
  if (V) {
    if (V.left > _lvVisW) _lvVisW = V.left;
    if (V.right > _lvVisW) _lvVisW = V.right;
    if (V.top > _lvVisH) _lvVisH = V.top;
    if (V.bottom > _lvVisH) _lvVisH = V.bottom;
  }
}

/* Un point d'apparition n'est bon que s'il est DANS l'arène et HORS de tout
   ce que le joueur peut voir : ni l'étendue montrée (inView, marge 40), ni le
   cadre brut de la caméra, qui la déborde sous certaines bascules. */
function _lvHidden(x, y) {
  if (x < _LV_MARGIN || x > K.ARENA_W - _LV_MARGIN || y < _LV_MARGIN || y > K.ARENA_H - _LV_MARGIN) return false;
  if (inView(x, y, 40)) return false;
  return Math.abs(x - S.cam.x) > S.view.w * 0.5 + 40 || Math.abs(y - S.cam.y) > S.view.h * 0.5 + 40;
}
/* même test, contre la caméra anticipée : sert au choix du point, pas à l'éclosion */
function _lvHiddenSoon(x, y) {
  if (!_lvHidden(x, y)) return false;
  return Math.abs(x - _lvAntX) > S.view.w * 0.5 + 40 || Math.abs(y - _lvAntY) > S.view.h * 0.5 + 40;
}

/* Repli déterministe : bords et coins de l'arène. Le monde (2600x1600) est
   toujours plus grand que la vue, donc l'un d'eux est caché. */
var _LV_FBX = [0, 0, -1, 1, -1, -1, 1, 1], _LV_FBY = [-1, 1, 0, 0, -1, 1, -1, 1];
function _lvFallback() {
  var s = S.snake, lo = _LV_MARGIN + 20;
  for (var k = 0; k < 8; k++) {
    var x = _LV_FBX[k] ? (_LV_FBX[k] < 0 ? lo : K.ARENA_W - lo) : clamp(s.x, lo, K.ARENA_W - lo);
    var y = _LV_FBY[k] ? (_LV_FBY[k] < 0 ? lo : K.ARENA_H - lo) : clamp(s.y, lo, K.ARENA_H - lo);
    if (_lvHiddenSoon(x, y)) { _lvPX = x; _lvPY = y; return true; }
  }
  _lvClampPoint();
  return false;
}

/* Tous les motifs tirent à R >= max(view.w, view.h)/2 + 150 et revérifient
   !inView(x, y, 40) ; cinq essais, puis repli. */
function _lvPoint(pat, i, n) {
  var s = S.snake;
  if (!s) { _lvPX = K.ARENA_W * 0.5; _lvPY = K.ARENA_H * 0.5; return; }
  _lvVisHalf();
  /* Rayon : la DIAGONALE de la demi-vue, pas son plus grand côté. Le point le
     plus éloigné réellement visible est le COIN, à hypot(w, h) / 2 ; sur une
     fenêtre presque carrée (rendue jouable par G2) max(w, h) / 2 + 150 ne le
     domine pas, et le roulis de la caméra achève de faire naître l'ennemi sous
     les yeux. hypot(demi-w, demi-h) + 150 domine le coin par construction,
     quelle que soit la forme de la fenêtre et quel que soit le roulis ; il
     reste >= max(view.w, view.h) / 2 + 150, la borne exigée. */
  var off = Math.sqrt(_lvVisW * _lvVisW + _lvVisH * _lvVisH) + 150;
  var a, R, k, ln;

  if (pat === 'corner') {
    _lvPX = (i % 2) ? K.ARENA_W - _LV_MARGIN * 2 : _LV_MARGIN * 2;
    _lvPY = (((i / 2) | 0) % 2) ? K.ARENA_H - _LV_MARGIN * 2 : _LV_MARGIN * 2;
    if (!_lvHiddenSoon(_lvPX, _lvPY)) _lvFallback();
    return;
  }

  // grappe : le point de bord est tiré une fois par salve, les suivants collent
  if (pat === 'pack' && i > 0) {
    for (k = 0; k < 5; k++) {
      _lvPX = _lvPackX + rndR(-70, 70);
      _lvPY = _lvPackY + rndR(-70, 70);
      if (_lvHiddenSoon(_lvPX, _lvPY)) return;
    }
    _lvPX = _lvPackX; _lvPY = _lvPackY;
    if (!_lvHiddenSoon(_lvPX, _lvPY)) _lvFallback();
    return;
  }

  for (k = 0; k < 5; k++) {
    if (pat === 'lane' && _lvLanes.length) {
      ln = _lvLanes[rndI(0, _lvLanes.length - 1)];
      if (ln.ax === 0) {
        _lvPX = s.x - ln.dir * (off + rndR(0, 240));
        _lvPY = ln.pos + rndR(-ln.h * 0.32, ln.h * 0.32);
      } else {
        _lvPY = s.y - ln.dir * (off + rndR(0, 240));
        _lvPX = ln.pos + rndR(-ln.h * 0.32, ln.h * 0.32);
      }
    } else {
      if (pat === 'ahead') { a = s.ang + rndR(-0.45, 0.45); R = off + rndR(0, 190); }
      else if (pat === 'flank') { a = s.ang + ((i & 1) ? 1 : -1) * (Math.PI * 0.5) + rndR(-0.28, 0.28); R = off + rndR(0, 300); }
      else if (pat === 'ring') { a = _lvRingA + (i / Math.max(1, n)) * TAU + (k ? rndR(-0.35, 0.35) : 0); R = off + rndR(0, 160); }
      else { a = rnd() * TAU; R = off + rndR(0, 240); }          // 'edge' et tout le reste
      _lvPX = s.x + Math.cos(a) * R;
      _lvPY = s.y + Math.sin(a) * R;
    }
    if (_lvHiddenSoon(_lvPX, _lvPY)) { if (pat === 'pack') { _lvPackX = _lvPX; _lvPackY = _lvPY; } return; }
  }
  _lvFallback();
  if (pat === 'pack') { _lvPackX = _lvPX; _lvPackY = _lvPY; }
}
var _lvPackX = 0, _lvPackY = 0;

function _lvClampPoint() {
  _lvPX = clamp(_lvPX, _LV_MARGIN, K.ARENA_W - _LV_MARGIN);
  _lvPY = clamp(_lvPY, _LV_MARGIN, K.ARENA_H - _LV_MARGIN);
}

/* ======
   PORTAILS D'APPARITION
   Rien n'arrive sans prévenir : 600 ms avant chaque apparition, un chevron de
   bord de la couleur du type (double pour une élite), un tic sonore, et une
   ligne dans S.log si un test l'écoute.
   ====== */

var _LV_PORTAL = 600;
/* G9 — mise en scène du boss : préavis long, chevron triple de taille 40,
   clignotement qui s'accélère, son bossIn AU PORTAIL (et non à l'éclosion). */
var _LV_BOSS_PORTAL = 1400;      // ms de préavis pour un boss
var _LV_BOSS_SILENCE = 3.4;      // s de climax sans aucun portail non-boss
var _LV_BOSS_ARRIVE = 1.8;       // s de temps de jeu d'arrivée pilotée
var _LV_BOSS_SLOW = 2200;        // ms d'horloge S.t de ralenti à l'entrée en vue
var _LV_BOSS_SLOWTS = 0.3;       // facteur de ralenti
var _LV_BOSS_RAGE = 45;          // s d'horloge de phase avant l'enragement
var _lvPend = [], _lvPendPool = [], _lvPortalId = 0;

function _lvLog(o) { if (S.log && S.log.push && S.log.length < 20000) S.log.push(o); }

function _lvColorOf(type) {
  var D = S2030.enemies && S2030.enemies.defs, d = D && D[type];
  return (d && d.color) || '#ffffff';
}

function _lvPortal(type, x, y, elite, mod, boss) {
  var p = _lvPendPool.length ? _lvPendPool.pop() : {};
  p.type = type; p.x = x; p.y = y; p.elite = !!elite; p.mod = mod || null; p.boss = !!boss;
  p.lead = p.boss ? _LV_BOSS_PORTAL : _LV_PORTAL;
  p.t = S.t + p.lead; p.t0 = S.t; p.color = _lvColorOf(type); p.id = ++_lvPortalId;
  _lvPend.push(p);
  if (p.boss) S2030.audio && S2030.audio.sfx('bossIn', { x: x });
  else S2030.audio && S2030.audio.sfx('spawnTick', { x: x, vol: elite ? 1 : 0.8 });
  _lvPortalMark(p);
  _lvLog({ t: S.t, kind: 'portal', ev: 'portal', type: type, elite: p.elite, mod: p.mod,
           boss: p.boss, x: Math.round(x), y: Math.round(y), lead: p.lead, edge: 1, pid: p.id });
  return p;
}

/* chevron du cadre : triple et grand pour un boss, cadence de clignotement
   croissante à mesure que l'échéance approche (3 Hz -> 12 Hz) */
function _lvPortalMark(p) {
  if (!S2030.fx) return;
  if (!p.boss) { S2030.fx.edge(p.x, p.y, p.color, { dbl: p.elite, size: 24 }); return; }
  var k = clamp((S.t - p.t0) / Math.max(1, p.lead), 0, 1);
  S2030.fx.edge(p.x, p.y, p.color, { dbl: 1, tri: 1, size: 40, blink: 1, blinkHz: 3 + 9 * k });
}

/* La caméra a bougé pendant les 600 ms d'annonce : si le point est entré dans
   le champ, on le repousse vers l'extérieur avant de faire éclore. */
function _lvHatchFix(p) {
  if (_lvHidden(p.x, p.y)) return;
  _lvVisHalf();
  var a = angTo(S.cam.x, S.cam.y, p.x, p.y), k;
  for (k = 0; k < 10; k++) {
    p.x = clamp(p.x + Math.cos(a) * 80, _LV_MARGIN, K.ARENA_W - _LV_MARGIN);
    p.y = clamp(p.y + Math.sin(a) * 80, _LV_MARGIN, K.ARENA_H - _LV_MARGIN);
    if (_lvHidden(p.x, p.y)) return;
  }
  var sx = _lvPX, sy = _lvPY;
  if (_lvFallback()) { p.x = _lvPX; p.y = _lvPY; }
  _lvPX = sx; _lvPY = sy;
}

function _lvHatch(p) {
  _lvHatchFix(p);
  var m = null;
  if (p.elite || p.mod || p.boss) { m = _lvMods; m.elite = p.elite; m.mod = p.mod; m.boss = p.boss; }
  var e = spawnEnemy(p.type, p.x, p.y, m);
  if (!e) return;
  _lvLog({ t: S.t, kind: 'spawn', ev: 'spawn', type: p.type, elite: p.elite, boss: p.boss,
           id: e.id, x: Math.round(p.x), y: Math.round(p.y), pid: p.id });
  // brève déchirure d'arrivée, aux couleurs de l'ennemi
  if (S2030.fx) S2030.fx.ring(p.x, p.y, e.color, 4, 340, { w: 2, life: 0.3 });
  if (p.boss) _lvBossBorn(e);
}

/* Éclosion dans l'ORDRE D'ANNONCE : une salve arrive dans l'ordre où ses
   chevrons se sont allumés (et la composition d'une vague reste celle du
   tableau de niveau). */
var _lvPortalF = 0;
function _lvPortalTick() {
  var i = 0;
  /* G9 : pendant 'clear' plus rien n'éclôt — un ennemi né en fin de secteur
     n'aurait pas le temps de fuir et serait reporté au secteur suivant. */
  if (_LV_PHASES[_lvPhaseI] === 'clear') return;
  _lvPortalF++;
  while (i < _lvPend.length) {
    var p = _lvPend[i];
    // le point corrigé est mémorisé dans p : une vérification sur quatre suffit
    // pour suivre la caméra (elle avance de ~9 u par image), et l'éclosion la
    // refait toujours. C'est ce qui évitait des salves de travail par image.
    if (((_lvPortalF + p.id) & 3) === 0) _lvHatchFix(p);
    if (S.t < p.t || (!p.boss && _LV_PHASES[_lvPhaseI] === 'climax' && _lvPhaseT < _LV_BOSS_SILENCE + 0.6)) {
      _lvPortalMark(p);
      i++; continue;
    }
    _lvPend.splice(i, 1);
    _lvHatch(p);
    if (_lvPendPool.length < 48) _lvPendPool.push(p);
  }
}

function _lvPendClear() {
  while (_lvPend.length) { var p = _lvPend.pop(); if (_lvPendPool.length < 48) _lvPendPool.push(p); }
}

/* ======
   VAGUES
   ====== */

function _lvSpawnGroup(type, n, pat, eliteP, mods) {
  for (var i = 0; i < n; i++) {
    if (S.enemies.length + _lvPend.length >= _lvHardcap()) return;
    _lvPoint(pat, i, n);
    var el = false, md = null;
    if (eliteP && chance(eliteP)) {
      el = true;
      /* dès le cycle 2, une élite porte TOUJOURS un modificateur : si la table
         du secteur n'en propose pas, on pioche dans la liste complète */
      md = (mods && mods.length) ? pick(mods) : (_lvCycle >= 2 ? pick(_LV_ALLMODS) : null);
    } else if (mods && mods.length && chance(0.10 + _lvCycle * 0.02)) {
      md = pick(mods);
    }
    _lvPortal(type, _lvPX, _lvPY, el, md, false);
  }
}
var _lvMods = { elite: false, mod: null, boss: false };   // objet de mods réutilisé

function _lvFireWave(w) {
  var mods = w.mods || _lvDef.mods;
  var eliteP = (w.eliteP || 0) + _lvCycle * 0.03;
  for (var i = 0; i < w.g.length; i++) {
    var g = w.g[i];
    /* Les artilleurs n'entrent qu'une fois la première carte prise : tirer sur
       un serpent qui n'a encore aucune réponse n'apprend rien. Vrai pour tous
       les secteurs ; au secteur 1 le premier 'shooter' est en surge, la porte
       n'y mord donc qu'à partir de t = 34 s. */
    if (g[0] === 'shooter' && (S.cardsTaken | 0) < 1) continue;
    var n = g[1];
    if (_lvCycle > 0) n = Math.min(n + ((_lvCycle / 3) | 0), n + 3);
    _lvSpawnGroup(g[0], n, g[2], eliteP, mods);
  }
}

function _lvWaves(dt) {
  var ph = _LV_PHASES[_lvPhaseI];
  if (ph === 'clear') return;
  /* G9 : au climax, AUCUN portail non-boss avant 3,4 s de phase. Sans cette
     clause le premier chaser éclôt vers 0,62 s (l'amorce des minuteries tombe
     un tirage sur trois sur son plancher de 0,02 s) et masque l'entrée du
     boss. Les minuteries de vagues sont GELÉES pendant ce silence (l'appel sort
     avant leur décompte) : elles repartent à 3,4 s, et le portail de 600 ms
     reporte la première éclosion non-boss à 4,0 s. */
  if (ph === 'climax' && _lvPhaseT < _LV_BOSS_SILENCE) return;
  var sp = _lvDef.spawns;
  /* SURCHARGE DU SECTEUR : plancher de cadence 0,55 -> 0,30 et capB 46 -> 80,
     indexés sur le CYCLE DE SURCHARGE comme le veut la spec. Les indexer aussi
     sur le numéro de secteur (essai mesuré) triple la cadence du secteur 6 par
     rapport au secteur 3 et fait sauter le critère « kills/min du secteur 6
     <= 1,5 x celui du secteur 3 » : 2,19 mesuré sur dix parties. La montée
     d'après 60 s est portée par les PV et par le mordant des ennemis. */
  var rate = _lvCycle > 0 ? Math.max(0.30, 1 - _lvCycle * 0.055) : 1;
  var capB = _lvCycle > 0 ? Math.min(80, _lvCycle * 6) : 0;
  // la difficulté resserre les salves et relève le plafond simultané : c'est
  // là qu'elle se sent le plus, bien avant les points de vie des ennemis
  var dm = diffMul();
  rate /= Math.pow(dm, 0.85);
  var capM = Math.pow(dm, 0.55);

  for (var i = 0; i < sp.length; i++) {
    var w = sp[i];
    if (w.p !== ph) continue;
    _lvWaveT[i] -= dt;
    if (_lvWaveT[i] > 0) continue;
    /* Montée en deux temps : une vague peut annoncer une cadence de début de
       phase (every0) tenue pendant « ramp » secondes. Le rise du secteur 1
       ouvre ainsi à 5,0 s avant de reprendre ses 3,6 s. */
    var ev = (w.every0 && _lvPhaseT < (w.ramp || 0)) ? w.every0 : w.every;
    _lvWaveT[i] = ev * rate * rndR(1 - (w.jit || 0.5) * 0.35, 1 + (w.jit || 0.5) * 0.35);
    /* Tant que le serpent est intact (9 segments au départ, 13 après la
       première CROISSANCE), le plafond simultané de la table est ramené à 22 :
       moins de corps à l'écran quand on n'a encore rien pour s'en défaire. */
    var wcap = w.cap;
    if (S.snake && S.snake.len < 12 && wcap > 22) wcap = 22;
    var cap = Math.min(_lvHardcap(), Math.round((wcap + capB) * capM));
    if (S.enemies.length + _lvPend.length >= cap) continue;
    _lvFireWave(w);
  }
}

/* ======
   PHASES
   ====== */

function _lvEnterPhase(idx) {
  _lvPhaseI = idx;
  _lvPhaseT = 0;
  var ph = _LV_PHASES[idx];
  _lvPhaseRaw = _lvDef.dur[ph] || 10;
  _lvPhaseDur = _lvPhaseRaw;
  if (_lvCycle > 0 && ph !== 'climax' && ph !== 'clear') {
    _lvPhaseDur = Math.max(8, _lvPhaseDur * (1 - Math.min(0.35, _lvCycle * 0.04)));
  }
  _lvBefore = 0;
  for (var i = 0; i < idx; i++) _lvBefore += _lvDef.dur[_LV_PHASES[i]] || 10;

  // amorce des minuteries de la phase : la première salve part tout de suite
  for (var w = 0; w < _lvDef.spawns.length; w++) {
    if (_lvDef.spawns[w].p === ph) _lvWaveT[w] = Math.max(0.02, rndR(0.2, 1.4) - _LV_PORTAL / 1000);
  }

  if (ph === 'rise') {
    if (S2030.fx) S2030.fx.flash(_lvPal.accent, 0.10);
  } else if (ph === 'surge') {
    _lvSay('SURCHARGE DU SECTEUR');
    if (S2030.fx) { S2030.fx.flash(_lvPal.gridHot, 0.16); S2030.fx.glitch(0.4); }
    if (S2030.audio) S2030.audio.sfx('zap');
  } else if (ph === 'climax') {
    _lvClimax();
  } else if (ph === 'clear') {
    _lvClearPhase();
  }
}

function _lvClimax() {
  var b = _lvDef.boss;
  _lvElites.length = 0;
  _lvBoss = null;
  if (!b) return;

  _lvSay(b.name, 2200);                 // bannière du boss : 2,2 s, seule à l'écran
  if (S2030.fx) { S2030.fx.flash(_lvPal.danger, 0.30); S2030.fx.shake(16); S2030.fx.glitch(0.7); }

  var count = b.n + ((_lvCycle / 2) | 0);
  if (count > 4) count = 4;
  _lvBossName = b.name || '';
  for (var i = 0; i < count; i++) {
    _lvPoint('ring', i, count);
    _lvPortal(b.type, _lvPX, _lvPY, true, b.mod || pick(_lvDef.mods || _LV_ALLMODS), true);
  }
  /* ESCORTE : plus rien au moment de l'entrée. Une salve d'entrée quand le
     silence de 3,4 s se lève, puis deux salves de renfort à 66 % et 33 % des
     PV du boss — trois salves au total. */
  _lvEsc = 0;
}

var _lvEsc = 0;                 // nombre de salves d'escorte déjà tirées
function _lvEscort() {
  var b = _lvDef && _lvDef.boss;
  if (!b || !b.escort) return;
  for (var k = 0; k < b.escort.length; k++) {
    var g = b.escort[k];
    _lvSpawnGroup(g[0], g[1], g[2], 0, null);
  }
  _lvEsc++;
}

function _lvClearPhase() {
  /* Le secteur se referme : on annule les portails en attente et on solde les
     ennemis restants (score simple, gerbe). Ce qui survit ensuite — une couvée
     tardive, une entrée par la soupape — fuit vers le bord dans _lvLate. */
  _lvPendClear();
  var won = _lvWon, killed = 0, i;
  for (i = 0; i < _lvElites.length; i++) if (_lvElites[i].dead) killed++;
  for (i = 0; i < S.enemies.length; i++) {
    var e = S.enemies[i];
    if (e.dead) continue;
    e.dead = true; e.noDmg = 1;
    S.score += (e.score || 0);          // score x 1 : la purge n'est pas une série de kills
    S2030.fx && S2030.fx.burst(e.x, e.y, e.color, 6, 0.9, { glow: true });
  }
  S.boss = null;
  _lvBoss = null;
  _lvElites.length = 0;
  var s = S.snake;
  if (!s) return;
  _lvSay('SECTEUR NETTOYÉ');
  if (won) {
    /* Un boss abattu se paie : une carte de TROPHÉE, soixante crédits, la
       moitié d'une jauge d'ultime. Le forfait par soupape ne paie rien. */
    S.bossKills = (S.bossKills | 0) + (killed || 1);
    S.lvlUps = (S.lvlUps | 0) + 1;
    S.trophyNext = 1;
    S.coins = (S.coins | 0) + 60;
    S.ult = Math.min(S.ultMax, S.ult + 50);
    _lvSay('+60 \u25c6');
  }
  _lvWon = 0;
  if (S2030.audio) S2030.audio.sfx('warp');
  if (S2030.fx) {
    S2030.fx.flash(_lvPal.accent, 0.22);
    S2030.fx.ring(s.x, s.y, _lvPal.accent, 20, 1100, { w: 7, life: 0.9 });
  }
  // récompense de fin de secteur : de quoi souffler avant la suite
  for (var i = 0; i < 3; i++) {
    var a = rnd() * TAU, r = rndR(70, 150);
    addPickup('core', clamp(s.x + Math.cos(a) * r, 40, K.ARENA_W - 40),
                      clamp(s.y + Math.sin(a) * r, 40, K.ARENA_H - 40));
  }
  addPickup('heal', clamp(s.x + rndR(-90, 90), 40, K.ARENA_W - 40),
                    clamp(s.y + rndR(-90, 90), 40, K.ARENA_H - 40));
}

/* Une élite de climax franchit son portail : elle rejoint le groupe et, si la
   place est libre, prend la jauge de boss. */
var _lvBossName = '';
function _lvBossBorn(e) {
  e.name = _lvBossName || e.name;
  e.boss = 1;
  if (_lvCycle > 0) { e.hp = e.maxHp = Math.round(e.maxHp * (1 + _lvCycle * 0.22)); }
  /* Facteur de PV PAR BOSS, porté par la définition de secteur (_lvDefs[].boss.hpF),
     appliqué APRÈS l'élite et après le modificateur : le bouclier de GARDE, posé
     par le modificateur, reste calculé sur la valeur d'avant. Un facteur unique
     de 2,5 ne pouvait pas tenir les deux bornes du test 3 à la fois — un boss
     seul de 228 PV au secteur 1 et DEUX boss de 95 PV au secteur 2 ne se
     combattent pas au même rythme. */
  var _bf = (_lvDef && _lvDef.boss && _lvDef.boss.hpF) || 2.5;
  e.hp = e.maxHp = Math.round(e.maxHp * _bf);
  /* POURSUITE. Mesuré sur six climax du secteur 1 à 96 PV : la durée n'est pas
     portée par les PV mais par la DISTANCE. 62 % du temps sous 400 u -> 12,1 s ;
     44 % -> 77,1 s ; 2 % -> 65,2 s avec une distance moyenne de 1 110 u. Un boss
     plus lent que le serpent (137 u/s mesurés contre 150 de croisière) ne
     rattrape jamais un pilote qui le fuit : il n'y a pas de combat, il y a une
     course, et c'est elle qui a donné les 61 s de médiane du secteur 1. On pose
     donc un PLANCHER D'ALLURE juste au-dessus de la vitesse de croisière du
     serpent : le boss vient à la joueuse, et la durée redevient une affaire de
     points de vie — ce que le test 3 mesure. */
  if (e.speed < K.BASE_SPEED * 1.08) e.speed = K.BASE_SPEED * 1.08;
  e.bandM = 1;
  /* ARRIVÉE PILOTÉE : de l'éclosion à +1,8 s de temps de jeu, le boss n'a pas
     son comportement propre — il est tiré vers le cadre par _lvLate, et rien
     ne peut le toucher pendant ce trajet ni pendant sa bannière. */
  /* Le point de naissance n'est garanti que HORS du champ, à quarante unités
     près (_lvHatchFix). Quarante unités, c'est cinq images de caméra : le boss
     entrait dans le cadre avant même d'avoir commencé son approche. On l'écarte
     d'abord à 1,35 fois les demi-étendues visibles dans SA direction — toujours
     hors champ, et cette fois avec une vraie distance à parcourir. */
  _lvBossPush(e);
  /* Point de départ MÉMORISÉ RELATIVEMENT À LA CAMÉRA, et non en monde absolu.
     La caméra suit la joueuse qui fuit : sur 1,8 s d'arrivée, ralenti compris,
     elle parcourt trois à cinq cents unités. Avec une origine fixée en monde,
     le reste d'interpolation (14 % à f = 0,86) se mesure sur un vecteur qui
     s'allonge d'autant et rejette le boss hors du cadre — mesuré sy 0,913 et
     0,930, sx 0,841, quatre essais sur quarante. En repère caméra, l'origine
     suit le cadre : le boss reste hors champ au début et tombe exactement sur
     la cible à l'échéance, quelle que soit la course de la caméra. */
  e.arrT = 0; e.arrDX = e.x - S.cam.x; e.arrDY = e.y - S.cam.y;
  e.noDmg = 1; e.seen = 0; e.arrS = 1;
  _lvArr.push(e);
  _lvElites.push(e);
  if (S2030.fx) {
    S2030.fx.ring(e.x, e.y, _lvPal.danger, 12, 620, { w: 6, life: 0.6 });
    S2030.fx.flare(e.x, e.y, _lvPal.danger, 150, { life: 0.5, a: 0.9 });
  }
  if (!_lvBoss || _lvBoss.dead) {
    _lvBoss = e;
    S.boss = _lvBoss;
    S.bossHpMax = _lvBoss.maxHp;
    S.bossBornT = S.t;
  }
}

/* ======
   ARRIVÉE DE BOSS, RALENTI, FUITE DE FIN DE SECTEUR
   Tout ce bloc tourne dans levels.late(dt), APRÈS updateEnemies : le boss garde
   sa mise à jour normale (les sondes la voient), mais c'est nous qui avons le
   dernier mot sur sa position. S.timeScale y est écrit après updateSnake, donc
   après DILATATION et après le ralenti de blessure : le ralenti de boss gagne.
   ====== */
var _lvArr = [];                 // boss en cours d'arrivée
var _lvSlowT = -1;               // fin de la fenêtre de ralenti, en S.t
var _lvWon = 0;                  // le climax a-t-il été gagné (et non soldé par la soupape)

function _lvBossPush(e) {
  var P = S2030.phases, V = (P && P.visibleExtent) ? P.visibleExtent() : null;
  if (!V) return;
  var ax = e.x - S.cam.x, ay = e.y - S.cam.y;
  var hx = V.left || 1, hy = (ay < 0 ? V.top : V.bottom) || 1;
  var kx = Math.abs(ax) / hx, ky = Math.abs(ay) / hy;
  var m = kx > ky ? kx : ky;
  if (!(m > 0.01) || m >= 1.35) return;
  /* on prend le plus grand écartement encore CACHÉ : près d'un bord de l'arène,
     1,35 n'entre pas et il faut redescendre plutôt que renoncer */
  for (var f = 1.35; f > 1.0; f -= 0.05) {
    if (f / m <= 1) break;
    var nx = clamp(S.cam.x + ax * (f / m), _LV_MARGIN, K.ARENA_W - _LV_MARGIN);
    var ny = clamp(S.cam.y + ay * (f / m), _LV_MARGIN, K.ARENA_H - _LV_MARGIN);
    if (_lvHidden(nx, ny)) { e.x = nx; e.y = ny; return; }
  }
}

function _lvBossTarget(e, out) {
  var P = S2030.phases, V = (P && P.visibleExtent) ? P.visibleExtent() : null;
  var dx = e.arrDX, dy = e.arrDY;
  var sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  /* COMPOSANTE PAR COMPOSANTE, jamais un rayon : un rayon fixe de 0,8 x la
     demi-diagonale vaut 1,5 fois la demi-hauteur sur bureau et 1,9 sur iPhone,
     il ne tomberait dans le cadre que pour une minorité de directions. On prend
     l'étendue du BON côté (top au-dessus, bottom en dessous). */
  var hw = V ? V.left : S.view.w * 0.5;
  var hh = V ? (sy < 0 ? V.top : V.bottom) : S.view.h * 0.5;
  var ox = 0.55 * hw * e.arrS, oy = 0.55 * hh * e.arrS;
  /* visibleExtent() ignore le ROULIS et la bascule déforme le bas du cadre :
     0,55 de l'étendue peut encore se projeter sur un bord. On resserre alors la
     cible jusqu'à ce que la PROJECTION RÉELLE tombe dans [0,15 ; 0,85] — c'est
     la sortie mesurée, pas une grandeur interne, et sur une caméra à plat le
     premier essai passe, donc la règle des 0,55 reste la règle. */
  if (P && P.toScreen) {
    /* [0,22 ; 0,78] et non [0,10 ; 0,90] : la marge restante couvre le seul
       déplacement qui suive encore cette écriture — aucun, puisque _lvLate
       tourne maintenant APRÈS updateCam et phases.update. Elle ne sert donc
       plus qu'à absorber le pas de la caméra de l'image SUIVANTE si le boss
       sort de l'arrivée sur cette image-là. */
    for (var k = 0; k < 12; k++) {
      var q = P.toScreen(S.cam.x + sx * ox, S.cam.y + sy * oy, _lvTS);
      if (isFinite(q.x) && isFinite(q.y) && q.x > 0.22 && q.x < 0.78 && q.y > 0.22 && q.y < 0.78) break;
      ox *= 0.85; oy *= 0.85;
      /* CLIQUET : le resserrement ne se relâche jamais. Sans lui, une image sur
         deux repartait de 0,55 et la cible sautait de cent cinquante unités
         d'une image à l'autre — l'arrivée tremblait au lieu de glisser. */
      e.arrS *= 0.85;
    }
  }
  out.x = S.cam.x + sx * ox;
  out.y = S.cam.y + sy * oy;
  return out;
}
var _lvBT = { x: 0, y: 0 }, _lvTS = { x: 0, y: 0 };

function _lvArrTick(dt) {
  for (var i = _lvArr.length - 1; i >= 0; i--) {
    var e = _lvArr[i];
    if (e.dead) { _lvArr.splice(i, 1); continue; }
    e.arrT += dt;
    var k = e.arrT / _LV_BOSS_ARRIVE;
    if (k > 1) k = 1;
    /* fondu ENTRANT ET SORTANT (k³(6k²−15k+10)) : un fondu purement sortant
       avançait de 2,8 % de la distance dès la PREMIÈRE image — jusqu'à 42 u,
       de quoi franchir la marge de 40 u qui sépare le point de naissance du
       champ et faire entrer le boss en vue avant qu'on l'ait vu venir. */
    var f = k * k * k * (k * (k * 6 - 15) + 10);
    if (k < 1) {
      _lvBossTarget(e, _lvBT);
      var o0x = S.cam.x + e.arrDX, o0y = S.cam.y + e.arrDY;   // origine en repère caméra
      e.x = o0x + (_lvBT.x - o0x) * f;
      e.y = o0y + (_lvBT.y - o0y) * f;
    }
    /* SUR LA SORTIE, PAS SUR LA CIBLE. Le cliquet de _lvBossTarget juge la
       projection du POINT VISÉ ; ce qui est mesuré, c'est la projection du BOSS,
       et sur la seconde moitié du trajet les deux diffèrent encore de ce qui
       reste d'interpolation. Passé la mi-course on ramène donc le boss lui-même
       vers la caméra tant que sa PROPRE projection sort de [0,18 ; 0,82] —
       mesuré sy 0,994 / 1,015 / 1,114 sur trois essais bureau sur vingt sans
       cette passe. La bande laisse 0,08 de marge sous le seuil de la spec
       ([0,10 ; 0,90]) pour le pas de caméra de l'image suivante. */
    if (f > 0.5 && S2030.phases && S2030.phases.toScreen && !e.dead) {
      for (var g = 0; g < 24; g++) {
        var qq = S2030.phases.toScreen(e.x, e.y, _lvTS);
        if (isFinite(qq.x) && isFinite(qq.y) && qq.x > 0.18 && qq.x < 0.82 && qq.y > 0.18 && qq.y < 0.82) break;
        e.x = S.cam.x + (e.x - S.cam.x) * 0.85;
        e.y = S.cam.y + (e.y - S.cam.y) * 0.85;
      }
    }
    if (k < 1) { e.vx = 0; e.vy = 0; }
    if (S2030.fx && (_lvPortalF & 1) === 0) S2030.fx.burst(e.x, e.y, e.color, 2, 0.5, { glow: true });
    if (!e.seen && inView(e.x, e.y, 0)) {
      /* PREMIÈRE image où le boss est en vue : le monde ralentit 2,2 s. */
      e.seen = 1;
      if (_lvSlowT < S.t) _lvSlowT = S.t + _LV_BOSS_SLOW;
    }
    /* RETENUE DE 0,35 s APRÈS L'ARRIVÉE : le boss reprend sa marche propre dès
       que k atteint 1 (on ne force plus sa position), mais la passe de cadrage
       ci-dessus continue de le retenir dans le cadre pendant une poignée
       d'images. Sans elle, l'image où l'échéance de 1,8 s est relevée pouvait
       tomber une image APRÈS la dernière image corrigée, et deux essais sur
       quarante s'y échappaient par un bord (sx 0,066 ; sy 0,017). */
    if (k >= 1) { e.noDmg = 0; if (e.arrT >= _LV_BOSS_ARRIVE + 0.35) _lvArr.splice(i, 1); }
  }
  if (_lvSlowT > S.t) S.timeScale = _LV_BOSS_SLOWTS;
  else if (_lvSlowT > 0) { _lvSlowT = -1; if (S.timeScale === _LV_BOSS_SLOWTS) S.timeScale = 1; }
}

/* Entrée d'un secteur : ce qui reste vivant pendant 'clear' fuit vers le bord
   le plus proche à 400 u/s et disparaît. Zéro ennemi reporté. */
function _lvFlee(dt) {
  for (var i = S.enemies.length - 1; i >= 0; i--) {
    var e = S.enemies[i];
    if (e.dead) continue;
    if (!e.flee) {
      e.flee = 1; e.noDmg = 1; e.harmless = 1;
      var dx = Math.min(e.x, K.ARENA_W - e.x), dy = Math.min(e.y, K.ARENA_H - e.y);
      e.fa = dx < dy ? (e.x < K.ARENA_W * 0.5 ? Math.PI : 0) : (e.y < K.ARENA_H * 0.5 ? -Math.PI / 2 : Math.PI / 2);
    }
    e.x += Math.cos(e.fa) * 400 * dt;
    e.y += Math.sin(e.fa) * 400 * dt;
    if (e.x < -60 || e.x > K.ARENA_W + 60 || e.y < -60 || e.y > K.ARENA_H + 60) e.dead = true;
  }
}

/* LAISSE DE POURSUITE. Mesuré : à 91 PV la médiane du climax du secteur 1 vaut
   52,8 s, à 228 PV elle vaut 52,9 s — la durée ne dépend PAS des points de vie,
   elle dépend de la distance. Quand le boss est tenu sous 400 u, le même boss
   tombe en 12 à 19 s ; quand le pilote le sème (2 % du temps sous 400 u, 1 110 u
   de distance moyenne), le climax dure 65 à 108 s. Un plancher d'allure ne suffit
   pas : porté à 1,22 x la vitesse de croisière il a AGGRAVÉ la médiane (64,6 s),
   parce qu'un boss plus rapide fait fuir le pilote plus fort et ne passe jamais
   devant ses canons. Ce qu'il faut, c'est que le boss ne puisse pas être SEMÉ
   sans pour autant coller au serpent : il accélère à mesure que l'écart grandit
   et retrouve son allure propre dès qu'il est au contact. Le multiplicateur est
   posé en RELATIF (e.bandM), pour ne pas effacer la nervosité que le blindage
   rompu donne à la bête (e.speed *= 1,55, src/22-enemies.js). */
var _LV_LEASH_D0 = 300, _LV_LEASH_D1 = 900, _LV_LEASH_MAX = 3.5;
function _lvLeash() {
  var s = S.snake;
  if (!s) return;
  for (var i = 0; i < _lvElites.length; i++) {
    var e = _lvElites[i];
    if (!e || e.dead || !e.boss || e.noDmg) continue;
    var d = Math.sqrt(dist2(e.x, e.y, s.x, s.y));
    var m = 1;
    if (d > _LV_LEASH_D0) {
      m = 1 + (_LV_LEASH_MAX - 1) * Math.min(1, (d - _LV_LEASH_D0) / (_LV_LEASH_D1 - _LV_LEASH_D0));
    }
    var prev = e.bandM || 1;
    if (m !== prev) { e.speed = e.speed / prev * m; e.bandM = m; }
  }
}

function _lvLate(dt) {
  if (dt > 0.05) dt = 0.05;
  if (_lvArr.length || _lvSlowT > 0) _lvArrTick(dt);
  if (_LV_LEASH_MAX > 1 && _LV_PHASES[_lvPhaseI] === 'climax') _lvLeash();
  if (_LV_PHASES[_lvPhaseI] === 'clear') _lvFlee(dt);
}

/* lu par updateSnake : la joueuse garde sa vitesse monde pendant le ralenti */
function _lvBossSlow() { return _lvSlowT > S.t; }

function _lvPhaseTick(dt) {
  _lvPhaseT += dt;
  var ph = _LV_PHASES[_lvPhaseI];

  if (ph === 'climax') {
    // le climax tombe quand les élites tombent — la soupape de temps est très longue
    var alive = 0;
    for (var i = 0; i < _lvElites.length; i++) if (!_lvElites[i].dead) alive++;
    /* ENRAGEMENT : passé 45 s d'horloge de PHASE (celle qui avance au dt
       ralenti, pas S.t), le boss accélère de 30 %, ses annonces raccourcissent
       d'un quart et il prend un liseré blanc. */
    if (_lvPhaseT >= _LV_BOSS_RAGE) {
      for (var r = 0; r < _lvElites.length; r++) {
        var er = _lvElites[r];
        if (er.dead || er.enraged) continue;
        er.enraged = 1;
        er.speed = (er.speed || 60) * 1.3;
        er.cdScale = (er.cdScale || 1) * 0.75;
      }
    }
    /* ESCORTE : salve d'entrée quand le silence se lève, renforts à 66 % et
       33 % des PV du boss. */
    if (_lvDef.boss && _lvDef.boss.escort) {
      if (_lvEsc === 0 && _lvPhaseT >= _LV_BOSS_SILENCE) _lvEscort();
      else if (_lvEsc > 0 && _lvBoss && !_lvBoss.dead && S.bossHpMax > 0) {
        var q = _lvBoss.hp / S.bossHpMax;
        if ((_lvEsc === 1 && q <= 0.66) || (_lvEsc === 2 && q <= 0.33)) _lvEscort();
      }
    }
    if (_lvBoss && _lvBoss.dead) {
      // on relaie sur l'élite suivante encore debout, pour la jauge de l'UI
      _lvBoss = null;
      for (var j = 0; j < _lvElites.length; j++) {
        if (!_lvElites[j].dead) { _lvBoss = _lvElites[j]; break; }
      }
      S.boss = _lvBoss;
      S.bossHpMax = _lvBoss ? _lvBoss.maxHp : 0;
    }
    /* Plus de « && !_lvPend.length » : un portail encore en vol retardait la
       sortie du climax de tout son préavis — 550 ms mesurées entre la mort du
       boss et la bannière, pour un seuil de 200 ms — alors que _lvClearPhase
       purge justement _lvPend à l'entrée. */
    if (_lvElites.length && alive === 0) {
      _lvWon = 1;                       // le secteur est gagné, pas soldé au chrono
      _lvEnterPhase(4);
    } else if (_lvPhaseT > _lvPhaseDur + 180) {
      /* SOUPAPE. Ce n'est plus un forfait : 180 s de rabiot, jamais atteintes
         en jeu, mais une sortie reste si _lvBossBorn n'a pas pu être appelé
         (spawnEnemy peut rendre null) — sans quoi la partie se bloquerait. */
      _lvWon = 0;
      _lvEnterPhase(4);
    }
    return;
  }

  if (_lvPhaseT >= _lvPhaseDur) {
    if (_lvPhaseI >= 4) _lvStart(_lvN + 1);
    else _lvEnterPhase(_lvPhaseI + 1);
  }
}

/* ======
   INTENSITÉ ET PROGRESSION
   ====== */

var _LV_BASE_INT = { calm: 0.20, rise: 0.46, surge: 0.76, climax: 0.94, clear: 0.22 };

function _lvIntensity(dt) {
  var ph = _LV_PHASES[_lvPhaseI];
  var target = _LV_BASE_INT[ph];

  // la montée à l'intérieur d'une phase compte aussi
  var f = clamp(_lvPhaseT / Math.max(0.001, _lvPhaseDur), 0, 1);
  if (ph === 'rise' || ph === 'surge') target += f * 0.12;
  if (ph === 'clear') target -= f * 0.10;

  // densité : ce que l'on voit vraiment à l'écran
  var dens = S.enemies.length / 46;
  if (dens > 1) dens = 1;
  target += dens * 0.16;
  if (_lvBoss && !_lvBoss.dead) target += 0.06;
  if (_lvCycle > 0) target += Math.min(0.10, _lvCycle * 0.015);

  target = clamp(target, 0, 1);
  var k = 1 - Math.pow(0.06, dt);
  _lvIntens = lerp(_lvIntens, target, k);
  S.intensity = _lvIntens;

  S.levelProgress = clamp((_lvBefore + f * _lvPhaseRaw) / _lvTotalDur, 0, 1);
  S.levelPhase = ph;
}

/* ======
   MÉCANIQUE 2 — VOIES DE CIRCULATION
   ====== */

function _lvBuildLanes() {
  _lvLanes.length = 0;
  var d = _lvDef;
  if (!d.laneY) return;
  for (var i = 0; i < d.laneY.length; i++) {
    _lvLanes.push({
      ax: 0,
      pos: d.laneY[i] * K.ARENA_H,
      h: d.laneH,
      dir: (i & 1) ? -1 : 1,
      spd: rndR(d.rigSpd[0], d.rigSpd[1])
    });
  }
  // la surcharge ajoute du trafic transversal : l'arène devient un carrefour
  if (d.back.overload) {
    var nv = Math.min(3, 1 + ((_lvCycle / 2) | 0));
    for (var v = 0; v < nv; v++) {
      _lvLanes.push({
        ax: 1,
        pos: K.ARENA_W * (0.22 + 0.28 * v),
        h: d.laneH * 0.86,
        dir: (v & 1) ? -1 : 1,
        spd: rndR(d.rigSpd[0], d.rigSpd[1]) * 0.9
      });
    }
  }
}

function _lvRigTarget() {
  var d = _lvDef;
  if (!d.rigs) return 0;
  var ph = _LV_PHASES[_lvPhaseI];
  var f = ph === 'calm' ? 0.4 : ph === 'rise' ? 0.72 : ph === 'clear' ? 0.25 : 1;
  return Math.round(d.rigs * f) + ((_lvCycle * 1.4) | 0);
}

function _lvSpawnRig() {
  if (!_lvLanes.length) return;
  var ln = _lvLanes[rndI(0, _lvLanes.length - 1)];
  var r = _lvHazGet('rig');
  var long = rndR(88, 178) * (1 + _lvCycle * 0.06);
  var thick = ln.h * rndR(0.30, 0.42);
  var spd = ln.spd * rndR(0.86, 1.18) * (1 + _lvCycle * 0.05) * (1 + _lvIntens * 0.25);
  r.ax = ln.ax;
  r.dir = ln.dir;
  r.lane = ln.pos;
  if (ln.ax === 0) {
    r.w2 = long; r.h2 = thick;
    r.x = ln.dir > 0 ? -long - 20 : K.ARENA_W + long + 20;
    r.y = ln.pos + rndR(-ln.h * 0.22, ln.h * 0.22);
    r.vx = ln.dir * spd; r.vy = 0;
  } else {
    r.w2 = thick; r.h2 = long;
    r.y = ln.dir > 0 ? -long - 20 : K.ARENA_H + long + 20;
    r.x = ln.pos + rndR(-ln.h * 0.22, ln.h * 0.22);
    r.vy = ln.dir * spd; r.vx = 0;
  }
  r.col = chance(0.34) ? _lvPal.chrome : _lvPal.lane;
  r.warn = 0;
}

function _lvRigs(dt) {
  var d = _lvDef;
  if (!d.rigs) return;
  var want = _lvRigTarget();
  var live = 0, i;
  for (i = 0; i < _lvHaz.length; i++) if (_lvHaz[i].kind === 'rig') live++;

  _lvRigT -= dt;
  if (_lvRigT <= 0) {
    _lvRigT = rndR(0.5, 1.5) / (1 + _lvIntens);
    if (live < want) _lvSpawnRig();
  }

  var s = S.snake;
  for (i = _lvHaz.length - 1; i >= 0; i--) {
    var r = _lvHaz[i];
    if (r.kind !== 'rig') continue;
    r.x += r.vx * dt;
    r.y += r.vy * dt;

    // sortie d'arène
    if (r.ax === 0) {
      if ((r.dir > 0 && r.x - r.w2 > K.ARENA_W + 40) || (r.dir < 0 && r.x + r.w2 < -40)) { _lvHazDrop(i); continue; }
    } else {
      if ((r.dir > 0 && r.y - r.h2 > K.ARENA_H + 40) || (r.dir < 0 && r.y + r.h2 < -40)) { _lvHazDrop(i); continue; }
    }

    if (!s) continue;

    // le convoi ne fait pas de quartier : il broie aussi les ennemis.
    // Cadencé à 8 Hz : la casse reste spectaculaire sans noyer l'écran.
    r.life -= dt;
    if (r.life <= 0 && inView(r.x, r.y, 260)) {
      r.life = 0.125;
      var rad = (r.w2 > r.h2 ? r.w2 : r.h2) + 18;
      var list = _lvCollect(r.x, r.y, rad);
      for (var k = 0; k < list.length; k++) {
        var e = list[k];
        if (e.dead) continue;
        var qx = clamp(e.x, r.x - r.w2, r.x + r.w2);
        var qy = clamp(e.y, r.y - r.h2, r.y + r.h2);
        var er = e.r + 2;
        if (dist2(e.x, e.y, qx, qy) < er * er) {
          _lvHitOpt.x = qx; _lvHitOpt.y = qy;
          damageEnemy(e, 9 + _lvCycle * 2, _lvHitOpt);
          if (S2030.fx) S2030.fx.burst(qx, qy, _lvPal.warm, 3, 190, { life: 0.2, size: 1.6 });
        }
      }
    }

    // collision avec la tête du serpent
    var cx = clamp(s.x, r.x - r.w2, r.x + r.w2);
    var cy = clamp(s.y, r.y - r.h2, r.y + r.h2);
    var hr = K.HEAD_R * 0.92;
    if (dist2(s.x, s.y, cx, cy) < hr * hr) {
      if (s.invuln <= 0) {
        hurtSnake(1, cx, cy);
        if (S2030.fx) {
          S2030.fx.ring(cx, cy, _lvPal.danger, 10, 640, { w: 5, life: 0.5 });
          S2030.fx.shake(12);
        }
      }
      // éjection minimale hors du gabarit : jamais deux coups d'affilée
      var px = s.x < r.x ? (r.x - r.w2 - hr - 2) - s.x : (r.x + r.w2 + hr + 2) - s.x;
      var py = s.y < r.y ? (r.y - r.h2 - hr - 2) - s.y : (r.y + r.h2 + hr + 2) - s.y;
      if (Math.abs(px) < Math.abs(py)) s.x += clamp(px, -60, 60);
      else s.y += clamp(py, -60, 60);
      s.x = clamp(s.x, K.HEAD_R, K.ARENA_W - K.HEAD_R);
      s.y = clamp(s.y, K.HEAD_R, K.ARENA_H - K.HEAD_R);
    }

    // pulsation rouge quand un convoi arrive vraiment sur nous
    var ahead = (r.x - s.x) * r.vx + (r.y - s.y) * r.vy;
    if (ahead < 0) {
      var dd = dist2(r.x, r.y, s.x, s.y);
      if (dd < 400 * 400) {
        var g = 1 - Math.sqrt(dd) / 400;
        if (g > _lvDanger) _lvDanger = g;
      }
    }
  }
}

/* ======
   MÉCANIQUE 3 — CHAMPS MAGNÉTIQUES
   ====== */

function _lvBuildNodes() {
  var d = _lvDef;
  if (!d.nodes) return;
  var n = d.nodes + ((_lvCycle / 2) | 0);
  if (n > 9) n = 9;
  for (var i = 0; i < n; i++) _lvAddNode(i & 1 ? -1 : 1);
}

function _lvAddNode(pull) {
  var d = _lvDef;
  var h = _lvHazGet(pull > 0 ? 'pull' : 'push');
  h.r = rndR(d.nodeR[0], d.nodeR[1]) * (1 + _lvCycle * 0.03);
  h.r2 = h.r * h.r;
  h.pull = pull;
  h.str = rndR(0.8, 1.15);
  h.x = rndR(h.r * 0.6, K.ARENA_W - h.r * 0.6);
  h.y = rndR(h.r * 0.6, K.ARENA_H - h.r * 0.6);
  var a = rnd() * TAU;
  var sp = d.nodeDrift * rndR(0.6, 1.4);
  h.vx = Math.cos(a) * sp;
  h.vy = Math.sin(a) * sp;
  h.col = pull > 0 ? _lvPal.pull : _lvPal.push;
  _lvMag.push(h);
  return h;
}

/* Force au point (x,y), écrite dans _lvFFX / _lvFFY. Normalisée : la somme
   des contributions vaut au plus ~1 par noeud, décroissance quadratique. */
function _lvFieldAt(x, y) {
  _lvFFX = 0; _lvFFY = 0;
  for (var i = 0; i < _lvMag.length; i++) {
    var nd = _lvMag[i];
    var dx = nd.x - x, dy = nd.y - y;
    var d2 = dx * dx + dy * dy;
    if (d2 > nd.r2) continue;
    var d = Math.sqrt(d2);
    if (d < 6) d = 6;
    var f = 1 - d / nd.r;
    f = f * f * nd.pull * nd.str;
    _lvFFX += (dx / d) * f;
    _lvFFY += (dy / d) * f;
  }
}

function _lvNodes(dt) {
  if (!_lvMag.length) return;
  var s = S.snake, i;
  var wob = _lvDef.back.overload ? 1.5 : 1;

  for (i = 0; i < _lvMag.length; i++) {
    var nd = _lvMag[i];
    nd.x += nd.vx * dt * wob;
    nd.y += nd.vy * dt * wob;
    var m = nd.r * 0.45;
    if (nd.x < m) { nd.x = m; nd.vx = -nd.vx; }
    if (nd.x > K.ARENA_W - m) { nd.x = K.ARENA_W - m; nd.vx = -nd.vx; }
    if (nd.y < m) { nd.y = m; nd.vy = -nd.vy; }
    if (nd.y > K.ARENA_H - m) { nd.y = K.ARENA_H - m; nd.vy = -nd.vy; }

    if (!s) continue;
    // coeur brûlant de l'attracteur : la seule partie qui blesse
    if (nd.pull > 0) {
      var cr = nd.r * 0.15 + K.HEAD_R;
      if (dist2(s.x, s.y, nd.x, nd.y) < cr * cr) {
        if (s.invuln <= 0) {
          hurtSnake(1, nd.x, nd.y);
          if (S2030.fx) S2030.fx.ring(nd.x, nd.y, _lvPal.danger, 12, 620, { w: 5, life: 0.5 });
        }
        var a = angTo(nd.x, nd.y, s.x, s.y);
        s.ang = norm(a);
      } else {
        var dd = dist2(s.x, s.y, nd.x, nd.y);
        var warnR = nd.r * 0.4;
        if (dd < warnR * warnR) {
          var g = 1 - Math.sqrt(dd) / warnR;
          if (g > _lvDanger) _lvDanger = g;
        }
      }
    }
  }
}

/* Applique le champ : cap du serpent, courbure des projectiles, dérive des
   ennemis. Un seul passage, sans allocation. */
function _lvFieldApply(dt) {
  if (!_lvMag.length) return;
  var s = S.snake, i, b, sp, ns, mag;

  // --- serpent : on courbe le cap, jamais la position ---
  if (s) {
    _lvFieldAt(s.x, s.y);
    if (_lvFFX || _lvFFY) {
      mag = Math.sqrt(_lvFFX * _lvFFX + _lvFFY * _lvFFY);
      if (mag > 1) mag = 1;
      var want = Math.atan2(_lvFFY, _lvFFX);
      var diff = norm(want - s.ang);
      var rate = _lvDef.fieldTurn * (1 + _lvCycle * 0.06) * mag;
      s.ang = norm(s.ang + clamp(diff, -rate * dt, rate * dt));
    }
  }

  // --- projectiles joueur : trajectoire courbée, vitesse conservée ---
  var accP = 1150;
  for (i = 0; i < S.bullets.length; i++) {
    b = S.bullets[i];
    _lvFieldAt(b.x, b.y);
    if (!_lvFFX && !_lvFFY) continue;
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp < 1) continue;
    b.vx += _lvFFX * accP * dt;
    b.vy += _lvFFY * accP * dt;
    ns = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (ns > 1) { b.vx = b.vx / ns * sp; b.vy = b.vy / ns * sp; }
  }

  // --- projectiles ennemis : idem, un peu moins sensibles ---
  var accE = 820;
  for (i = 0; i < S.ebullets.length; i++) {
    b = S.ebullets[i];
    _lvFieldAt(b.x, b.y);
    if (!_lvFFX && !_lvFFY) continue;
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp < 1) continue;
    b.vx += _lvFFX * accE * dt;
    b.vy += _lvFFY * accE * dt;
    ns = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (ns > 1) { b.vx = b.vx / ns * sp; b.vy = b.vy / ns * sp; }
  }

  // --- ennemis : simple dérive, ils luttent contre le champ ---
  if (S.enemies.length < 110) {
    var drift = 62;
    for (i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (e.dead) continue;
      _lvFieldAt(e.x, e.y);
      if (!_lvFFX && !_lvFFY) continue;
      e.x += _lvFFX * drift * dt;
      e.y += _lvFFY * drift * dt;
    }
  }
}

/* ======
   PARTICULES DE DÉCOR (poussière, limaille, traits de vitesse)
   ====== */

function _lvBuildDust() {
  if (!_lvDust) {
    _lvDust = new Array(150);
    for (var i = 0; i < _lvDust.length; i++) _lvDust[i] = { x: 0, y: 0, s: 1, p: 0 };
  }
  for (var j = 0; j < _lvDust.length; j++) {
    var d = _lvDust[j];
    d.x = rndR(0, K.ARENA_W);
    d.y = rndR(0, K.ARENA_H);
    d.s = rndR(1, 2.8);
    d.p = rnd() * TAU;
  }
}

function _lvBuildMotes() {
  if (!_lvMote) {
    _lvMote = new Array(56);
    for (var i = 0; i < _lvMote.length; i++) _lvMote[i] = { x: 0, y: 0, vx: 0, vy: 0, l: 0, c: 0 };
  }
  for (var j = 0; j < _lvMote.length; j++) { _lvMote[j].l = 0; }
}

function _lvMotes(dt) {
  if (!_lvMag.length || !_lvMote) return;
  var hw = S.view.w * 0.5 + 60, hh = S.view.h * 0.5 + 60;
  for (var i = 0; i < _lvMote.length; i++) {
    var m = _lvMote[i];
    m.l -= dt;
    if (m.l <= 0 || m.x < S.cam.x - hw || m.x > S.cam.x + hw || m.y < S.cam.y - hh || m.y > S.cam.y + hh) {
      m.x = S.cam.x + rndR(-hw, hw);
      m.y = S.cam.y + rndR(-hh, hh);
      m.vx = rndR(-24, 24); m.vy = rndR(-24, 24);
      m.l = rndR(1.1, 3.0);
      continue;
    }
    _lvFieldAt(m.x, m.y);
    m.c = _lvFFX * _lvFFX + _lvFFY * _lvFFY;
    m.vx = (m.vx + _lvFFX * 900 * dt) * 0.94;
    m.vy = (m.vy + _lvFFY * 900 * dt) * 0.94;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
  }
}

function _lvBuildStreaks() {
  if (!_lvStreak) {
    _lvStreak = new Array(26);
    for (var i = 0; i < _lvStreak.length; i++) _lvStreak[i] = { x: 0, y: 0, v: 0, len: 0, ax: 0, l: 0 };
  }
  for (var j = 0; j < _lvStreak.length; j++) _lvStreak[j].l = 0;
}

function _lvStreaks(dt) {
  if (!_lvStreak || !_lvLanes.length) return;
  var hw = S.view.w * 0.5 + 120, hh = S.view.h * 0.5 + 120;
  for (var i = 0; i < _lvStreak.length; i++) {
    var t = _lvStreak[i];
    t.l -= dt;
    if (t.l <= 0) {
      var ln = _lvLanes[rndI(0, _lvLanes.length - 1)];
      t.ax = ln.ax;
      t.v = ln.dir * ln.spd * rndR(1.4, 2.6);
      t.len = rndR(50, 190);
      t.l = rndR(0.5, 1.4);
      var sg = t.v < 0 ? -1 : 1;
      if (ln.ax === 0) {
        t.x = S.cam.x - sg * hw;
        t.y = ln.pos + rndR(-ln.h * 0.42, ln.h * 0.42);
      } else {
        t.y = S.cam.y - sg * hh;
        t.x = ln.pos + rndR(-ln.h * 0.42, ln.h * 0.42);
      }
      continue;
    }
    if (t.ax === 0) t.x += t.v * dt; else t.y += t.v * dt;
  }
}

/* ======
   DÉMARRAGE D'UN NIVEAU
   ====== */

function _lvStart(n) {
  n = n || 1;
  _lvN = n;
  S.level = n;
  S.levelT = 0;
  S.levelProgress = 0;
  S.boss = null;
  S.bossHpMax = 0;

  if (n <= 3) {
    _lvDef = _lvDefs[n - 1];
    _lvCycle = 0;
    _lvPal = _lvDef.palette;
  } else {
    _lvDef = _lvDefs[3];
    _lvCycle = n - 3;
    _lvPal = _LV_OVERPAL[(_lvCycle - 1) % _LV_OVERPAL.length];
  }

  /* Deux compteurs de module survivaient à resetRun et repartaient, d'une
     partie à l'autre, avec un décalage qui dépendait du nombre d'images jouées
     par la partie PRÉCÉDENTE : _lvPortalF cadence _lvHatchFix (une image sur
     quatre, `(_lvPortalF + p.id) & 3`) et _lvPortalId décale p.id. Deux
     exécutions des mêmes graines ne donnaient donc pas les mêmes parties —
     climax1Med 41,6 s puis 50,0 s sur le même build. Ils sont remis à zéro à
     l'entrée du premier secteur, avec le reste de l'état de partie. */
  if (n === 1) { _lvPortalF = 0; _lvPortalId = 0; }
  _lvHazClear();
  _lvPendClear();
  _lvElites.length = 0;
  _lvArr.length = 0;
  _lvSlowT = -1;
  _lvEsc = 0;
  _lvWon = 0;
  _lvBoss = null;
  _lvDanger = 0;
  _lvRigT = rndR(0.3, 1.2);
  _lvRingA = rnd() * TAU;

  _lvWaveT.length = _lvDef.spawns.length;
  // le préavis du portail est pris SUR L'AVANCE, pas ajouté au calendrier :
  // la salve s'annonce 600 ms plus tôt et l'ennemi arrive à l'heure prévue
  for (var i = 0; i < _lvWaveT.length; i++) _lvWaveT[i] = Math.max(0.02, rndR(0.3, 2.2) - _LV_PORTAL / 1000);

  _lvTotalDur = 0;
  for (var p = 0; p < _LV_PHASES.length; p++) _lvTotalDur += _lvDef.dur[_LV_PHASES[p]] || 10;

  _lvBuildLanes();
  _lvBuildNodes();
  _lvBuildDust();
  _lvBuildMotes();
  _lvBuildStreaks();

  // caches de dessin : la palette a changé
  _lvBloomG.length = 0;
  _lvBloomP.length = 0;
  _lvVigG = null; _lvVigKey = '';
  _lvDngG = null; _lvDngKey = '';
  for (var b = 0; b < 5; b++) {
    _lvBloomP.push({
      x: K.ARENA_W * (0.12 + 0.19 * b),
      y: K.ARENA_H * (b & 1 ? 0.24 : 0.76),
      r: rndR(340, 640),
      ph: rnd() * TAU
    });
  }

  _lvIntens = 0.12;
  S.intensity = _lvIntens;
  S.levelName = _lvDef.name;
  S.levelPhase = 'calm';
  _lvEnterPhase(0);

  if (S.phase === 'play') {
    _lvSay(_lvCycle > 0 ? (_lvDef.name + ' ' + _lvCycle) : ('NIVEAU ' + n + ' — ' + _lvDef.name));
    _lvHint(_lvDef.name, _lvDef.hint);
    if (S2030.fx) { S2030.fx.flash(_lvPal.accent, 0.26); S2030.fx.glitch(0.5); }
    if (S2030.audio) S2030.audio.sfx('warp');
  }
}

/* ======
   MISE À JOUR
   ====== */

function _lvUpdate(dt) {
  if (!_lvDef) _lvStart(S.level || 1);
  if (dt > 0.05) dt = 0.05;

  _lvRingA += dt * 0.55;
  _lvDanger *= Math.pow(0.02, dt);   // décroissance rapide, réarmée par les dangers

  _lvPhaseTick(dt);
  _lvPortalTick();
  _lvWaves(dt);
  _lvRigs(dt);
  _lvNodes(dt);
  _lvFieldApply(dt);
  _lvMotes(dt);
  _lvStreaks(dt);
  _lvIntensity(dt);
}

/* ======
   DESSIN — FOND
   ====== */

function _lvViewRect() {
  _lvVX = S.cam.x - S.view.w * 0.5 - 60;
  _lvVY = S.cam.y - S.view.h * 0.5 - 60;
  _lvVW = S.view.w + 120;
  _lvVH = S.view.h + 120;
}
var _lvVX = 0, _lvVY = 0, _lvVW = 0, _lvVH = 0;

function _lvDrawBlooms(ctx) {
  for (var i = 0; i < _lvBloomP.length; i++) {
    var p = _lvBloomP[i];
    if (!inView(p.x, p.y, p.r)) continue;
    var g = _lvBloomG[i];
    if (!g) {
      g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, _lvRgba(_lvPal.bloom, 0.55));
      g.addColorStop(0.55, _lvRgba(_lvPal.bloom, 0.16));
      g.addColorStop(1, _lvRgba(_lvPal.bloom, 0));
      _lvBloomG[i] = g;
    }
    ctx.globalAlpha = 0.5 + Math.sin(S.t * 0.0004 + p.ph) * 0.22 + _lvIntens * 0.2;
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  ctx.globalAlpha = 1;
}

function _lvDrawDust(ctx) {
  if (!_lvDust) return;
  // parallaxe : la poussière glisse par rapport au monde, ça creuse la profondeur
  var ox = S.cam.x * 0.10, oy = S.cam.y * 0.10;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = _lvPal.dust || _lvPal.accent;
  ctx.globalAlpha = 0.30 + _lvIntens * 0.18;
  ctx.beginPath();
  for (var i = 0; i < _lvDust.length; i++) {
    var d = _lvDust[i];
    var x = d.x + ox, y = d.y + oy;
    if (!inView(x, y, 20)) continue;
    var s = d.s * (0.7 + 0.3 * Math.sin(S.t * 0.002 + d.p));
    ctx.rect(x, y, s, s);
  }
  ctx.fill();
  ctx.restore();
}

function _lvDrawGrid(ctx) {
  var cell = _lvDef.back.cell;
  var x0 = Math.floor(_lvVX / cell) * cell;
  var y0 = Math.floor(_lvVY / cell) * cell;
  var x1 = _lvVX + _lvVW, y1 = _lvVY + _lvVH;
  var x, y;

  // trame fine : un seul tracé, un seul stroke
  ctx.lineWidth = 1;
  ctx.strokeStyle = _lvPal.grid;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  for (x = x0; x < x1; x += cell) { ctx.moveTo(x, _lvVY); ctx.lineTo(x, y1); }
  for (y = y0; y < y1; y += cell) { ctx.moveTo(_lvVX, y); ctx.lineTo(x1, y); }
  ctx.stroke();

  // trame forte : une ligne sur quatre
  var big = cell * 4;
  ctx.lineWidth = 2;
  ctx.strokeStyle = _lvPal.gridHot;
  ctx.globalAlpha = 0.20 + _lvIntens * 0.16;
  ctx.beginPath();
  for (x = Math.floor(_lvVX / big) * big; x < x1; x += big) { ctx.moveTo(x, _lvVY); ctx.lineTo(x, y1); }
  for (y = Math.floor(_lvVY / big) * big; y < y1; y += big) { ctx.moveTo(_lvVX, y); ctx.lineTo(x1, y); }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // onde de balayage en diagonale : les noeuds s'allument au passage.
  // Trois paliers d'intensité, donc trois remplissages, quel que soit le
  // nombre de noeuds à l'écran.
  if (_lvDef.back.scan) {
    var span = K.ARENA_W + K.ARENA_H;
    var sw = (S.t * 0.16 + _lvIntens * 400) % span;
    var base = 0.55 + _lvIntens * 0.35;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = _lvPal.gridHot;
    for (var band = 0; band < 3; band++) {
      ctx.globalAlpha = base * (band + 1) / 3;
      ctx.beginPath();
      var any = false;
      for (y = y0; y < y1; y += cell) {
        for (x = x0; x < x1; x += cell) {
          var k = (x + y) - sw;
          if (k < -240 || k > 240) continue;
          var a = 1 - (k < 0 ? -k : k) / 240;
          a = a * a;
          var bk = (a * 3) | 0; if (bk > 2) bk = 2;
          if (bk !== band) continue;
          var sz = 3 + a * 5;
          ctx.rect(x - sz * 0.5, y - sz * 0.5, sz, sz);
          any = true;
        }
      }
      if (any) ctx.fill();
    }
    ctx.restore();
  }
}

/* Une voie n'est dessinée que si sa bande croise réellement la vue. */
function _lvLaneVisible(ln) {
  var h2 = ln.h * 0.5 + 4;
  if (ln.ax === 0) return ln.pos + h2 > _lvVY && ln.pos - h2 < _lvVY + _lvVH;
  return ln.pos + h2 > _lvVX && ln.pos - h2 < _lvVX + _lvVW;
}

function _lvDrawLanes(ctx) {
  if (!_lvLanes.length) return;
  var i, ln, h2, any = false;
  ctx.save();

  // 1. tapis des voies : un seul remplissage pour toutes
  ctx.globalAlpha = 0.16 + _lvIntens * 0.08;
  ctx.fillStyle = _lvPal.bg2;
  ctx.beginPath();
  for (i = 0; i < _lvLanes.length; i++) {
    ln = _lvLanes[i];
    if (!_lvLaneVisible(ln)) continue;
    h2 = ln.h * 0.5;
    if (ln.ax === 0) ctx.rect(_lvVX, ln.pos - h2, _lvVW, ln.h);
    else ctx.rect(ln.pos - h2, _lvVY, ln.h, _lvVH);
    any = true;
  }
  if (any) ctx.fill();
  if (!any) { ctx.restore(); return; }

  // 2. bords néon : un seul tracé
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = _lvPal.lane;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (i = 0; i < _lvLanes.length; i++) {
    ln = _lvLanes[i];
    if (!_lvLaneVisible(ln)) continue;
    h2 = ln.h * 0.5;
    if (ln.ax === 0) {
      ctx.moveTo(_lvVX, ln.pos - h2); ctx.lineTo(_lvVX + _lvVW, ln.pos - h2);
      ctx.moveTo(_lvVX, ln.pos + h2); ctx.lineTo(_lvVX + _lvVW, ln.pos + h2);
    } else {
      ctx.moveTo(ln.pos - h2, _lvVY); ctx.lineTo(ln.pos - h2, _lvVY + _lvVH);
      ctx.moveTo(ln.pos + h2, _lvVY); ctx.lineTo(ln.pos + h2, _lvVY + _lvVH);
    }
  }
  ctx.stroke();

  // 3. médianes animées : le décalage dépend de la voie, un tracé chacune,
  //    mais seulement pour celles qu'on voit vraiment.
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = _lvPal.chrome;
  ctx.lineWidth = 3;
  ctx.setLineDash(_LV_DASH);
  for (i = 0; i < _lvLanes.length; i++) {
    ln = _lvLanes[i];
    if (!_lvLaneVisible(ln)) continue;
    ctx.lineDashOffset = -ln.dir * (S.t * 0.001) * ln.spd;
    ctx.beginPath();
    if (ln.ax === 0) { ctx.moveTo(_lvVX, ln.pos); ctx.lineTo(_lvVX + _lvVW, ln.pos); }
    else { ctx.moveTo(ln.pos, _lvVY); ctx.lineTo(ln.pos, _lvVY + _lvVH); }
    ctx.stroke();
  }
  ctx.setLineDash(_LV_NODASH);
  ctx.globalAlpha = 1;
  ctx.restore();
}
var _LV_DASH = [30, 34];
var _LV_NODASH = [];

/* Limaille magnétique : chaque intersection de la trame porte un segment
   orienté par le champ. C'est le seul dessin qui parle du champ en continu. */
function _lvDrawFilings(ctx) {
  if (!_lvMag.length) return;
  var step = _lvDef.back.cell;
  var x0 = Math.floor(_lvVX / step) * step;
  var y0 = Math.floor(_lvVY / step) * step;
  var x1 = _lvVX + _lvVW, y1 = _lvVY + _lvVH;
  var maxA = _lvFilA.length - 4, maxB = _lvFilB.length - 4;
  _lvFilNA = 0; _lvFilNB = 0;

  for (var y = y0; y < y1; y += step) {
    for (var x = x0; x < x1; x += step) {
      _lvFieldAt(x, y);
      var m2 = _lvFFX * _lvFFX + _lvFFY * _lvFFY;
      if (m2 < 0.0006) continue;
      var m = Math.sqrt(m2);
      var len = step * 0.30 * (0.4 + (m > 1 ? 1 : m) * 0.9);
      var ux = (_lvFFX / m) * len, uy = (_lvFFY / m) * len;
      // le signe dominant décide de la couleur : cyan attire, ambre repousse
      if (_lvFieldSign(x, y) > 0) {
        if (_lvFilNA > maxA) continue;
        _lvFilA[_lvFilNA++] = x - ux; _lvFilA[_lvFilNA++] = y - uy;
        _lvFilA[_lvFilNA++] = x + ux; _lvFilA[_lvFilNA++] = y + uy;
      } else {
        if (_lvFilNB > maxB) continue;
        _lvFilB[_lvFilNB++] = x - ux; _lvFilB[_lvFilNB++] = y - uy;
        _lvFilB[_lvFilNB++] = x + ux; _lvFilB[_lvFilNB++] = y + uy;
      }
    }
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.44 + _lvIntens * 0.16;
  var i;
  if (_lvFilNA) {
    ctx.strokeStyle = _lvPal.pull;
    ctx.beginPath();
    for (i = 0; i < _lvFilNA; i += 4) { ctx.moveTo(_lvFilA[i], _lvFilA[i + 1]); ctx.lineTo(_lvFilA[i + 2], _lvFilA[i + 3]); }
    ctx.stroke();
  }
  if (_lvFilNB) {
    ctx.strokeStyle = _lvPal.push;
    ctx.beginPath();
    for (i = 0; i < _lvFilNB; i += 4) { ctx.moveTo(_lvFilB[i], _lvFilB[i + 1]); ctx.lineTo(_lvFilB[i + 2], _lvFilB[i + 3]); }
    ctx.stroke();
  }
  ctx.restore();
}

/* Quel noeud domine en ce point ? Sert uniquement à choisir la couleur. */
function _lvFieldSign(x, y) {
  var best = 0, bp = 1;
  for (var i = 0; i < _lvMag.length; i++) {
    var nd = _lvMag[i];
    var dx = nd.x - x, dy = nd.y - y;
    var d2 = dx * dx + dy * dy;
    if (d2 > nd.r2) continue;
    var w = (1 - Math.sqrt(d2) / nd.r) * nd.str;
    if (w > best) { best = w; bp = nd.pull; }
  }
  return bp;
}

/* Anneaux doux autour des noeuds, sous les entités.
   Les anneaux battent en phase pour tout le champ : ça se lit mieux, et ça
   permet de tout empiler en 8 tracés au maximum, quel que soit le nombre de
   noeuds — l'attracteur aspire ses anneaux, le répulseur les crache. */
function _lvDrawNodeBack(ctx) {
  if (!_lvMag.length) return;
  var t = S.t * 0.00035;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 1.5;
  for (var pol = 0; pol < 2; pol++) {
    var pull = pol === 0 ? 1 : -1;
    ctx.strokeStyle = pull > 0 ? _lvPal.pull : _lvPal.push;
    for (var k = 0; k < 4; k++) {
      var f = ((t * (pull > 0 ? -1 : 1) + k * 0.25) % 1 + 1) % 1;
      ctx.globalAlpha = (pull > 0 ? f : 1 - f) * 0.30;
      if (ctx.globalAlpha < 0.02) continue;
      ctx.beginPath();
      var any = false;
      for (var i = 0; i < _lvMag.length; i++) {
        var nd = _lvMag[i];
        if (nd.pull !== pull) continue;
        if (!inView(nd.x, nd.y, nd.r)) continue;
        var rr = pull > 0 ? nd.r * (1 - f) : nd.r * f;
        if (rr < 6) continue;
        ctx.moveTo(nd.x + rr, nd.y);
        ctx.arc(nd.x, nd.y, rr, 0, TAU);
        any = true;
      }
      if (any) ctx.stroke();
    }
  }
  ctx.restore();
}

/* Bandes de surcharge : diagonales balayantes, marque de fabrique du mode. */
function _lvDrawOverload(ctx) {
  var span = _lvVW + _lvVH;
  var o0 = _lvVX + _lvVY;
  var step = 300;
  var shift = (S.t * 0.09) % step;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = _lvPal.gridHot;
  ctx.lineWidth = 30;
  ctx.globalAlpha = 0.035 + _lvIntens * 0.05;
  ctx.beginPath();
  for (var o = o0 - shift; o < o0 + span; o += step) {
    ctx.moveTo(_lvVX, o - _lvVX);
    ctx.lineTo(_lvVX + _lvVW, o - _lvVX - _lvVW);
  }
  ctx.stroke();
  ctx.restore();
}

function _lvDrawBack(ctx) {
  if (!_lvDef) return;
  _lvViewRect();
  var b = _lvDef.back;

  // on part d'un état de contexte propre : les modules voisins écrivent dans
  // le même ctx, un alpha oublié ailleurs effacerait tout le décor
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = _lvPal.bg;
  ctx.fillRect(_lvVX, _lvVY, _lvVW, _lvVH);

  _lvDrawBlooms(ctx);
  if (b.grid) _lvDrawGrid(ctx);
  if (b.overload) _lvDrawOverload(ctx);
  if (b.lanes) _lvDrawLanes(ctx);
  if (b.field) { _lvDrawNodeBack(ctx); _lvDrawFilings(ctx); }
  _lvDrawDust(ctx);
  if (b.lanes) _lvDrawRigShadows(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* Recense les convois visibles une fois par image, pour que toutes les
   passes de dessin travaillent sur la même liste sans la recalculer. */
var _lvRigVis = [];
function _lvRigsVisible() {
  _lvRigVis.length = 0;
  for (var i = 0; i < _lvHaz.length; i++) {
    var r = _lvHaz[i];
    if (r.kind !== 'rig') continue;
    if (!inView(r.x, r.y, r.w2 + r.h2 + 140)) continue;
    _lvRigVis.push(r);
  }
  return _lvRigVis.length;
}

/* Ombre portée et halo au sol : le convoi a du poids avant même d'être vu. */
function _lvDrawRigShadows(ctx) {
  if (!_lvRigsVisible()) return;
  var i, r;
  ctx.save();

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  for (i = 0; i < _lvRigVis.length; i++) {
    r = _lvRigVis[i];
    ctx.rect(r.x - r.w2 + 8, r.y - r.h2 + 10, r.w2 * 2, r.h2 * 2);
  }
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16;
  for (var pass = 0; pass < 2; pass++) {
    var col = pass === 0 ? _lvPal.lane : _lvPal.chrome;
    ctx.fillStyle = col;
    ctx.beginPath();
    var any = false;
    for (i = 0; i < _lvRigVis.length; i++) {
      r = _lvRigVis[i];
      if (r.col !== col) continue;
      if (r.ax === 0) ctx.rect(r.x - r.w2 * 2.2, r.y - r.h2 * 1.7, r.w2 * 4.4, r.h2 * 3.4);
      else ctx.rect(r.x - r.w2 * 1.7, r.y - r.h2 * 2.2, r.w2 * 3.4, r.h2 * 4.4);
      any = true;
    }
    if (any) ctx.fill();
  }
  ctx.restore();
}

/* ======
   DESSIN — PREMIER PLAN
   ====== */

/* Sept passes au total, quel que soit le nombre de convois à l'écran. */
function _lvDrawRigs(ctx) {
  if (!_lvRigsVisible()) return;
  var pulse = 0.55 + Math.sin(S.t * 0.012) * 0.45;
  var i, r, x, y, w, h, any;
  ctx.save();

  // 1. faisceaux de tête, additifs
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.10 + _lvIntens * 0.05;
  ctx.fillStyle = _lvPal.warm;
  ctx.beginPath();
  for (i = 0; i < _lvRigVis.length; i++) {
    r = _lvRigVis[i];
    if (r.ax === 0) {
      ctx.rect(r.dir > 0 ? r.x + r.w2 : r.x - r.w2 - 260, r.y - r.h2 * 1.5, 260, r.h2 * 3);
    } else {
      ctx.rect(r.x - r.w2 * 1.5, r.dir > 0 ? r.y + r.h2 : r.y - r.h2 - 260, r.w2 * 3, 260);
    }
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // 2. caisses
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = '#0b0d1a';
  ctx.beginPath();
  for (i = 0; i < _lvRigVis.length; i++) {
    r = _lvRigVis[i];
    ctx.rect(r.x - r.w2, r.y - r.h2, r.w2 * 2, r.h2 * 2);
  }
  ctx.fill();

  // 3-6. arêtes néon puis nervures, groupées par teinte de carrosserie
  for (var pass = 0; pass < 2; pass++) {
    var col = pass === 0 ? _lvPal.lane : _lvPal.chrome;
    ctx.strokeStyle = col;

    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 3;
    ctx.beginPath(); any = false;
    for (i = 0; i < _lvRigVis.length; i++) {
      r = _lvRigVis[i];
      if (r.col !== col) continue;
      ctx.rect(r.x - r.w2 + 1.5, r.y - r.h2 + 1.5, r.w2 * 2 - 3, r.h2 * 2 - 3);
      any = true;
    }
    if (!any) continue;
    ctx.stroke();

    ctx.globalAlpha = 0.30;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (i = 0; i < _lvRigVis.length; i++) {
      r = _lvRigVis[i];
      if (r.col !== col) continue;
      x = r.x - r.w2; y = r.y - r.h2; w = r.w2 * 2; h = r.h2 * 2;
      if (r.ax === 0) {
        for (var k = x + 26; k < x + w - 10; k += 32) { ctx.moveTo(k, y + 5); ctx.lineTo(k, y + h - 5); }
      } else {
        for (var k2 = y + 26; k2 < y + h - 10; k2 += 32) { ctx.moveTo(x + 5, k2); ctx.lineTo(x + w - 5, k2); }
      }
    }
    ctx.stroke();
  }

  // 7. museaux rouges pulsants : le côté qui tue, jamais ambigu
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.fillStyle = _lvPal.danger;
  ctx.beginPath();
  for (i = 0; i < _lvRigVis.length; i++) {
    r = _lvRigVis[i];
    x = r.x - r.w2; y = r.y - r.h2; w = r.w2 * 2; h = r.h2 * 2;
    if (r.ax === 0) ctx.rect(r.dir > 0 ? x + w - 12 : x + 2, y + 3, 10, h - 6);
    else ctx.rect(x + 3, r.dir > 0 ? y + h - 12 : y + 2, w - 6, 10);
  }
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/* Coeurs des noeuds, par-dessus les entités. Quatre passes par polarité,
   toutes les instances empilées dans le même tracé. */
function _lvDrawNodeFore(ctx) {
  if (!_lvMag.length) return;
  var s = S.snake;
  var pulse = 0.6 + Math.sin(S.t * 0.006) * 0.4;
  var rot = S.t * 0.0012;
  var i, nd, cr, any;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (var pol = 0; pol < 2; pol++) {
    var pull = pol === 0 ? 1 : -1;
    var col = pull > 0 ? _lvPal.pull : _lvPal.push;

    // halo
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.16 + pulse * 0.10;
    ctx.beginPath(); any = false;
    for (i = 0; i < _lvMag.length; i++) {
      nd = _lvMag[i];
      if (nd.pull !== pull || !inView(nd.x, nd.y, nd.r * 0.6)) continue;
      cr = nd.r * 0.15;
      ctx.moveTo(nd.x + cr * 3.4, nd.y);
      ctx.arc(nd.x, nd.y, cr * 3.4, 0, TAU);
      any = true;
    }
    if (any) ctx.fill(); else continue;

    // coeur plein
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (i = 0; i < _lvMag.length; i++) {
      nd = _lvMag[i];
      if (nd.pull !== pull || !inView(nd.x, nd.y, nd.r * 0.6)) continue;
      cr = nd.r * 0.15 * (pull > 0 ? 0.55 + pulse * 0.2 : 0.5);
      ctx.moveTo(nd.x + cr, nd.y);
      ctx.arc(nd.x, nd.y, cr, 0, TAU);
    }
    ctx.fill();

    // couronne : pleine pour l'attracteur, éclatée pour le répulseur
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (i = 0; i < _lvMag.length; i++) {
      nd = _lvMag[i];
      if (nd.pull !== pull || !inView(nd.x, nd.y, nd.r * 0.6)) continue;
      cr = nd.r * 0.15;
      if (pull > 0) {
        ctx.moveTo(nd.x + cr, nd.y);
        ctx.arc(nd.x, nd.y, cr, 0, TAU);
      } else {
        for (var k = 0; k < 3; k++) {
          var a0 = rot + nd.ph + k * (TAU / 3);
          ctx.moveTo(nd.x + Math.cos(a0) * cr, nd.y + Math.sin(a0) * cr);
          ctx.arc(nd.x, nd.y, cr, a0, a0 + 0.75);
        }
      }
    }
    ctx.stroke();
  }

  // le coeur de l'attracteur blesse : liseré rouge quand la tête s'approche
  if (s) {
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.strokeStyle = _lvPal.danger;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); any = false;
    for (i = 0; i < _lvMag.length; i++) {
      nd = _lvMag[i];
      if (nd.pull < 0) continue;
      cr = nd.r * 0.15;
      var wr = cr + K.HEAD_R + 90;
      if (dist2(s.x, s.y, nd.x, nd.y) > wr * wr) continue;
      var dr = cr + K.HEAD_R * 0.9;
      ctx.moveTo(nd.x + dr, nd.y);
      ctx.arc(nd.x, nd.y, dr, 0, TAU);
      any = true;
    }
    if (any) ctx.stroke();
  }
  ctx.restore();
}

function _lvDrawMotes(ctx) {
  if (!_lvMote || !_lvMag.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  for (var pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? _lvPal.pull : _lvPal.push;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    var any = false;
    for (var i = 0; i < _lvMote.length; i++) {
      var m = _lvMote[i];
      if (m.l <= 0) continue;
      var sign = _lvFieldSign(m.x, m.y);
      if ((pass === 0) !== (sign > 0)) continue;
      if (!inView(m.x, m.y, 20)) continue;
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 0.05, m.y - m.vy * 0.05);
      any = true;
    }
    if (any) ctx.stroke();
  }
  ctx.restore();
}

function _lvDrawStreaks(ctx) {
  if (!_lvStreak || !_lvLanes.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = _lvPal.chrome;
  ctx.globalAlpha = 0.16 + _lvIntens * 0.12;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (var i = 0; i < _lvStreak.length; i++) {
    var t = _lvStreak[i];
    if (t.l <= 0) continue;
    if (!inView(t.x, t.y, t.len + 40)) continue;
    var sg = t.v < 0 ? -1 : 1;
    if (t.ax === 0) { ctx.moveTo(t.x, t.y); ctx.lineTo(t.x - sg * t.len, t.y); }
    else { ctx.moveTo(t.x, t.y); ctx.lineTo(t.x, t.y - sg * t.len); }
  }
  ctx.stroke();
  ctx.restore();
}

/* Nappe et vignette : dessinées dans un repère calé sur la vue, avec des
   dégradés mis en cache. Aucune création de dégradé par image. */
function _lvOverlay(ctx, hex, alpha, inner, cacheDng) {
  var w = S.view.w, h = S.view.h;
  var key = hex + '|' + (w | 0) + 'x' + (h | 0) + '|' + inner;
  var g = cacheDng ? _lvDngG : _lvVigG;
  var k = cacheDng ? _lvDngKey : _lvVigKey;
  if (!g || k !== key) {
    var cx = w * 0.5, cy = h * 0.5;
    var outer = Math.sqrt(w * w + h * h) * 0.52;
    g = ctx.createRadialGradient(cx, cy, h * inner, cx, cy, outer);
    g.addColorStop(0, _lvRgba(hex, 0));
    g.addColorStop(0.62, _lvRgba(hex, 0.28));
    g.addColorStop(1, _lvRgba(hex, 1));
    if (cacheDng) { _lvDngG = g; _lvDngKey = key; }
    else { _lvVigG = g; _lvVigKey = key; }
  }
  ctx.save();
  ctx.translate(S.cam.x - w * 0.5, S.cam.y - h * 0.5);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function _lvDrawFore(ctx) {
  if (!_lvDef) return;
  _lvViewRect();
  var f = _lvDef.fore;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (_lvDef.back.lanes) { _lvDrawRigs(ctx); if (f.streaks) _lvDrawStreaks(ctx); }
  if (_lvDef.back.field) { _lvDrawMotes(ctx); _lvDrawNodeFore(ctx); }

  // brume d'ambiance aux couleurs du secteur
  _lvOverlay(ctx, _lvPal.bloom, f.fog + _lvIntens * 0.05, 0.30, false);

  // vignette de danger : pulsation rouge quand ça se joue à rien
  var s = S.snake;
  var dng = _lvDanger;
  if (s && s.len <= 3) dng = Math.max(dng, 0.5 + Math.sin(S.t * 0.008) * 0.3);
  if (_lvBoss && !_lvBoss.dead) dng = Math.max(dng, 0.16);
  if (dng > 0.02) {
    var pulse = 0.7 + Math.sin(S.t * 0.014) * 0.3;
    _lvOverlay(ctx, _lvPal.danger, Math.min(0.5, dng * 0.5 * pulse), 0.34, true);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/* ======
   API
   ====== */

S2030.levels = {
  defs: _lvDefs,
  start: _lvStart,
  update: _lvUpdate,
  drawBack: _lvDrawBack,
  drawFore: _lvDrawFore,
  hazards: _lvHaz,

  /* Lectures pratiques pour les autres modules (facultatif). */
  fieldAt: function (x, y, out) {
    _lvFieldAt(x, y);
    if (out) { out.x = _lvFFX; out.y = _lvFFY; }
    return _lvFFX;
  },
  late: _lvLate,
  bossSlow: _lvBossSlow,
  phaseName: function () { return _LV_PHASES[_lvPhaseI]; },
  phaseT: function () { return _lvPhaseT; },
  pend: function () { return _lvPend.length; },
  cycle: function () { return _lvCycle; },
  hardcap: _lvHardcap,
  palette: function () { return _lvPal; }
};
