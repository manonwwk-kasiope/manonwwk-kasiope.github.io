/* ======
   SNAKE 2030 — coeur
   État, mathématiques, physique du serpent, caméra, collisions, entrées,
   boucle principale. Tout ce que les modules de contenu consomment.
   ====== */

var S2030 = {};

/* ------ constantes */
var K = {
  ARENA_W: 2600, ARENA_H: 1600,
  VIEW_H: 780,              // hauteur de vue en unités monde, identique partout
  SEG_SPACING: 15,
  HEAD_R: 16,
  PATH_STEP: 5,
  BASE_SPEED: 150,
  TURN_RATE: 4.6,           // rad/s à fond de manche
  BOOST_MUL: 1.9,
  BOOST_DRAIN: 34,          // par seconde
  BOOST_FILL: 22,           // par seconde : 0 → 100 en 4,5 s
  START_LEN: 9,
  MAX_LEN: 90,
  INVULN: 900,              // ms après un dégât
  MUSIC_LOOP: 259.074979,
  MUSIC_BPM: 144.6,
  GRID: 110,                // taille de cellule de la grille de collision
  /* DIRECTEUR DE DIFFICULTÉ (G9), trois pentes par SECTEUR (S.level), pour les
     ennemis ordinaires et les élites non-boss. La pente linéaire de la spec
     (+8 %/secteur) a été mesurée et ne fait rien : au secteur 6 elle vaut x 1,4
     quand le pilote d'esquive frappe déjà à 3 400 PV/s (mesuré : 418 kills/min
     sur des ennemis à 491 PV moyens au secteur 5). Il faut une pente
     géométrique pour que l'endurance suive la puissance de feu.
     - ENHP_LVL : endurance ;
     - ENDMG_LVL : ce que COÛTE un coup encaissé ;
     - ENSPD_LVL : l'allure, plafonnée — un pilote qui distance tout le monde
       n'est jamais touché, quelle que soit la foule.
     Réglage mesuré (dix parties dodge-greedy, cran STANDARD, plafond 900 s) :
     à la pente précédente (1,90 / 0,90 / 0,07) le bilan de la joueuse restait
     positif jusqu'au secteur 8 — 1 064 segments perdus contre 1 096 regagnés
     par les ramassages en 900 s, len moyen 70 sur 90 — et dix parties sur dix
     touchaient le plafond. Le basculement existait mais arrivait trop tard :
     au secteur 9, 13 coups en 72 s pour 8 segments chacun contre 26 rendus par
     minute, soit -80 segments/minute. Les pentes ci-dessous amènent ce même
     régime autour du secteur 6, c'est-à-dire vers 550 s de partie. */
  ENHP_LVL: 2.60,
  ENDMG_LVL: 1.90,
  ENSPD_LVL: 0.160,
  ENSPD_MAX: 1.60,
  SHIELD_CAP: 3            // segments qu'une charge de BOUCLIER encaisse
};

/* ------ bureau */
/* Bureau : aucun point de contact et pointeur fin. Ni manche ni boutons
   tactiles, ni plein écran forcé, toute fenêtre jouable. L'amorçage remet
   S.desktop à false au premier touchstart réel. */
function detectDesktop() {
  try {
    if (typeof navigator === 'undefined') return false;
    if (navigator.maxTouchPoints > 0) return false;
    if (typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches) return false;
    return true;
  } catch (e) { return false; }
}

/* ------ état */
var S = {
  t: 0, dt: 0,
  phase: 'menu', paused: false,
  cam: { x: 0, y: 0 },
  view: { w: 1280, h: 780 },
  shake: 0,
  snake: null,
  enemies: [], bullets: [], ebullets: [], pickups: [], drones: [], pools: [],
  level: 1, levelT: 0, levelProgress: 0, intensity: 0,
  score: 0, mult: 1, multT: 0, multTMax: 5000, combo: 0, kills: 0,
  xp: 0, xpNext: 6, lvlUps: 0, cardsTaken: 0,
  up: {},
  ult: 0, ultMax: 100, special: 0, specialCd: 0,
  coins: 0, seed: 1,
  musicBuf: null,
  input: { jx: 0, jy: 0, jmag: 0, jactive: false, boost: false, special: false, ult: false },
  opt: { reduceFlash: false, reduceShake: false, particles: 1, contrast: false,
         haptics: true, music: true, sfx: true, leftHanded: false,
         joyFloat: true, joySize: 1, joyAlpha: 1, sens: 1, uiScale: 1, diff: 1.55, px: 1.5, mouse: 'auto' },
  stats: { best: 0, coins: 0, runs: 0 },
  boss: null, bossHpMax: 0, bossBornT: 0, bossKills: 0, trophyNext: 0, headR: 16, pxEff: 1.5, partEff: 1,
  timeScale: 1,
  desktop: detectDesktop()
};

/* ------ aléatoire avec graine */
var _seedState = 123456789;
function seedRnd(n) { _seedState = (n >>> 0) || 1; }
function rnd() {
  // xorshift32 : rapide, déterministe, suffisant pour du jeu
  _seedState ^= _seedState << 13; _seedState >>>= 0;
  _seedState ^= _seedState >> 17;
  _seedState ^= _seedState << 5;  _seedState >>>= 0;
  return _seedState / 4294967296;
}
function rndR(a, b) { return a + rnd() * (b - a); }
function rndI(a, b) { return a + ((rnd() * (b - a + 1)) | 0); }
function pick(a) { return a[(rnd() * a.length) | 0]; }
function chance(p) { return rnd() < p; }

/* ------ mathématiques */
var TAU = Math.PI * 2;
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function norm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
function dist2(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
function dist(x1, y1, x2, y2) { return Math.sqrt(dist2(x1, y1, x2, y2)); }

/* ------ difficulté */
/* Le cran 2 est la référence : il vaut le double de l'ancien réglage, qui
   correspond désormais à « DÉTENDU ». Le multiplicateur ne s'applique pas
   uniformément — doubler les dégâts encaissés rendrait le jeu injouable
   alors que doubler la densité le rend simplement plus dense. */
/* Échelle retaillée sur des mesures de survie, non sur des multiplicateurs.
   L'ancienne donnait, pour un joueur passif : plus de 150 s / 88 / 90 / 62 /
   20 s — le premier cran ne finissait jamais, les deux du milieu étaient
   indiscernables, et le dernier tuait avant le premier contenu du jeu. */
/* Les libellés disaient le contraire de l'échelle : le cran par DÉFAUT (1,55)
   s'appelait SOUTENU, sous un STANDARD plus dur que lui. Multiplicateurs
   inchangés, seuls les noms bougent — et ils vivent ICI, dans le moteur, parce
   que le sélecteur des réglages les lit par DIFFS.map. */
var DIFFS = [
  { m: 1.25, nom: 'FACILE' },
  { m: 1.55, nom: 'NORMAL' },
  { m: 1.90, nom: 'DIFFICILE' },
  { m: 2.30, nom: 'BRUTAL' },
  { m: 2.75, nom: 'SUICIDE' }
];
function diffIdx() {
  var v = S.opt.diff, b = 2, bd = 1e9;
  for (var i = 0; i < DIFFS.length; i++) {
    var d = Math.abs(DIFFS[i].m - v);
    if (d < bd) { bd = d; b = i; }
  }
  return b;
}
function diffMul() { return DIFFS[diffIdx()].m; }
function diffNom() { return DIFFS[diffIdx()].nom; }

/* ------ le serpent */
/* Débattement de la tête par rapport au corps quand celui-ci est verrouillé
   sur un rail : assez large pour couvrir l'écart maximal à la diagonale
   (45°) et viser au-delà, assez étroit pour qu'on ne tire jamais en arrière. */
var RAIL_LOOK = 1.15;

/* Cap des canons : la tête, pas la trajectoire. */
function aimAng() { var s = S.snake; return s.aim === undefined ? s.ang : s.aim; }

function makeSnake() {
  var s = {
    x: K.ARENA_W * 0.3, y: K.ARENA_H * 0.5, ang: 0, aim: 0,
    speed: K.BASE_SPEED, baseSpeed: K.BASE_SPEED,
    path: [], p0: 0, pathLen: 0,
    len: K.START_LEN, segs: [],
    hp: K.START_LEN, maxHp: K.START_LEN,
    boostE: 100, boostMax: 100, boosting: false,
    invuln: 0, ghost: 0, slowmo: 0,
    shield: 0, shieldT: 0, regenT: 0,
    turnBoost: 1
  };
  // on amorce le chemin pour que le corps existe dès la première image
  for (var i = 0; i < 400; i++) {
    s.path.push({ x: s.x - i * K.PATH_STEP, y: s.y, d: -i * K.PATH_STEP });
  }
  s.path.reverse();
  for (var j = 0; j < s.path.length; j++) s.path[j].d = j * K.PATH_STEP;
  s.pathLen = (s.path.length - 1) * K.PATH_STEP;
  return s;
}

function pushPath() {
  var s = S.snake, p = s.path, last = p[p.length - 1];
  var d = dist(last.x, last.y, s.x, s.y);
  if (d < K.PATH_STEP) return;
  s.pathLen += d;
  p.push({ x: s.x, y: s.y, d: s.pathLen });
  // on jette ce qui est plus loin que la queue, avec de la marge
  var need = s.len * K.SEG_SPACING + 240;
  while (s.p0 < p.length - 2 && s.pathLen - p[s.p0 + 1].d > need) s.p0++;
  if (s.p0 > 600) { s.path = p.slice(s.p0); s.p0 = 0; }
}

/* Échantillonne le chemin pour placer les segments. Un seul parcours en
   arrière : les distances demandées sont croissantes, on garde un curseur. */
function buildSegs() {
  var s = S.snake, p = s.path, segs = s.segs;
  var n = s.len, i = p.length - 1;
  if (segs.length !== n) { segs.length = n; for (var q = 0; q < n; q++) if (!segs[q]) segs[q] = { x: 0, y: 0, ang: 0 }; }
  for (var k = 0; k < n; k++) {
    var want = s.pathLen - (K.HEAD_R * 0.7 + (k + 1) * K.SEG_SPACING);
    while (i > s.p0 && p[i].d > want) i--;
    var a = p[i], b = p[Math.min(i + 1, p.length - 1)];
    var span = b.d - a.d;
    var t = span > 0.0001 ? clamp((want - a.d) / span, 0, 1) : 0;
    var sg = segs[k];
    sg.x = lerp(a.x, b.x, t);
    sg.y = lerp(a.y, b.y, t);
    sg.ang = angTo(a.x, a.y, b.x, b.y);
  }
}

function updateSnake(dt) {
  var s = S.snake, inp = S.input;

  /* RALENTI D'ENTRÉE DE BOSS (G9) : le monde ralentit, pas la joueuse. Le pas
     de temps du serpent est redivisé par S.timeScale — qui vaut exactement le
     facteur ayant servi à fabriquer dt dans frame() — donc sa vitesse MONDE
     reste celle d'avant le ralenti. */
  var _bs = S2030.levels && S2030.levels.bossSlow && S2030.levels.bossSlow();
  if (_bs && S.timeScale > 0.01 && S.timeScale < 1) dt = dt / S.timeScale;

  var want = inp.jmag > 0.12 ? Math.atan2(inp.jy, inp.jx) : null;
  var rail = !!(S2030.phases && S2030.phases.railed());

  if (rail) {
    // treillis : le corps est verrouillé sur les rails ; on arrondit la direction DEMANDÉE
    // (arrondir le cap courant bloquerait le serpent sur son rail), le changement de rail est franc
    s.ang = S2030.phases.railSteer(s, want, s.speed * dt);
  } else if (want !== null) {
    // --- cap : virage analogique vers la direction du manche ---
    var diff = norm(want - s.ang);
    var rate = K.TURN_RATE * s.turnBoost * S.opt.sens * clamp(inp.jmag * 1.35, 0, 1);
    var step = clamp(diff, -rate * dt, rate * dt);
    s.ang = norm(s.ang + step);
  }

  // la tête reste libre : elle pivote dans un cône devant elle et c'est ce cap que suivent les canons

  var look = want;
  if (rail && look === null) {
    // manche au repos : on garde en joue l'ennemi le plus proche
    var tgt = nearestEnemy(s.x, s.y, 560);
    if (tgt) look = angTo(s.x, s.y, tgt.x, tgt.y);
  }
  s.aim = (rail && look !== null)
    ? norm(s.ang + clamp(norm(look - s.ang), -RAIL_LOOK, RAIL_LOOK))
    : s.ang;

  // --- boost ---
  // panne franche : réserve à zéro → s.boostDry et un seul 'boostDry', puis rien tant que le bouton
  // reste tenu ; reprise sur nouvel appui à ≥ 10 ou d'elle-même à ≥ 25
  var press = !!inp.boost, newPress = press && !s.boostPrev;
  if (!press) s.boostHeld = false;
  s.boostPrev = press;
  if (s.boostDry && s.boostE >= 25) s.boostDry = false;
  var wantBoost = s.boosting ? press : (!press || s.boostHeld) ? false : s.boostDry ? (newPress && s.boostE >= 10) : s.boostE > 1;
  var drain = K.BOOST_DRAIN * (1 - 0.16 * (S.up.f_boostDrain || 0));  // RÉSERVE
  if (wantBoost) {
    s.boostE -= drain * dt;
    if (!s.boosting) { s.boosting = true; s.boostKick = 3; S2030.audio && S2030.audio.sfx('boost'); haptic(12); }
    if (s.boostE < 1.5) {                              // panne, dans la même image (pas de boostEnd)
      s.boostE = 0; s.boosting = false; s.boostDry = true; s.boostDryT = S.t; s.boostHeld = press;
      S2030.audio && S2030.audio.sfx('boostDry'); haptic([10, 30, 10]);
    }
  } else {
    if (s.boosting) { s.boosting = false; S2030.audio && S2030.audio.sfx('boostEnd'); }
    s.boostE = Math.min(s.boostMax, s.boostE + K.BOOST_FILL * dt);
  }
  // PROPULSION : la vitesse de croisière monte avec les cartes
  s.baseSpeed = K.BASE_SPEED * (1 + 0.07 * (S.up.f_speed || 0));
  // le facteur du REPLI entre dans la CIBLE, pas dans la vitesse lissée (sinon il se composait à chaque image)
  var foldNow = S2030.phases ? S2030.phases.foldFactor() : 0;
  var target = s.baseSpeed * (s.boosting ? K.BOOST_MUL : 1) * (1 + 0.12 * foldNow);
  if (s.boostDry && press && s.boostHeld) s.speed = target;    // tenu à vide : vitesse de base, strictement
  // montée : 95 % de la vitesse de boost en 7 images (0,0002^dt en demandait 16, contrat ≤ 11) ; descente inchangée
  else s.speed = lerp(s.speed, target, 1 - Math.pow(target > s.speed ? 1e-9 : 0.002, dt));
  if (s.boosting && s.boostKick > 0 && S2030.fx && S2030.fx.trail) {   // départ : six traînées par image sur trois images
    s.boostKick--;
    for (var tk = 0; tk < 6; tk++) S2030.fx.trail(s.x - Math.cos(s.ang) * (6 + tk * 4), s.y - Math.sin(s.ang) * (6 + tk * 4), s.ang + Math.PI + (tk - 2.5) * 0.28, '#ffd166');
  }

  // --- avance ---
  s.x += Math.cos(s.ang) * s.speed * dt;
  s.y += Math.sin(s.ang) * s.speed * dt;

  // --- bords de l'arène : rebond amorti plutôt que mort sèche ---
  var m = K.HEAD_R;
  if (s.x < m) { s.x = m; s.ang = norm(Math.PI - s.ang); wallBump(); }
  if (s.x > K.ARENA_W - m) { s.x = K.ARENA_W - m; s.ang = norm(Math.PI - s.ang); wallBump(); }
  if (s.y < m) { s.y = m; s.ang = -s.ang; wallBump(); }
  if (s.y > K.ARENA_H - m) { s.y = K.ARENA_H - m; s.ang = -s.ang; wallBump(); }
  if (rail) {
    // normale rentrante du ou des bords touchés : c'est elle qui dit vers où
    // repartir, un cap simplement réfléchi repointant souvent dans le mur
    var nx = 0, ny = 0;
    if (s.x <= m) nx = 1; else if (s.x >= K.ARENA_W - m) nx = -1;
    if (s.y <= m) ny = 1; else if (s.y >= K.ARENA_H - m) ny = -1;
    if (nx || ny) {
      var nl = Math.sqrt(nx * nx + ny * ny);
      S2030.phases.railBounce(s, nx / nl, ny / nl);
    }
  }

  // la visée est ramenée dans son cône ±RAIL_LOOK une fois le cap définitif (le rebond le change après coup)
  if (s.aim !== undefined) {
    var ec = norm(s.aim - s.ang);
    if (ec > RAIL_LOOK) s.aim = norm(s.ang + RAIL_LOOK);
    else if (ec < -RAIL_LOOK) s.aim = norm(s.ang - RAIL_LOOK);
  }

  // REPLI : moins long, mais nettement plus épais — le corps et la boîte de
  // collision grossissent ensemble, sinon le joueur sentirait le mensonge
  var fold = foldNow;
  S.headR = K.HEAD_R * (1 + 0.5 * fold);

  // on ne quitte jamais sa droite : après l'avance, avant que le chemin ne
  // l'enregistre, pour que le corps suive exactement la même ligne
  if (rail) S2030.phases.railHold(s);

  pushPath();
  buildSegs();

  if (s.invuln > 0) s.invuln -= S.dt * 1000;
  if (s.ghost > 0) s.ghost -= S.dt * 1000;
  if (S.up.f_permGhost) s.ghost = Math.max(s.ghost, 40);   // SPECTRE permanent
  if (s.boosting) S.ult = Math.min(S.ultMax, S.ult + 3 * dt * (1 + 0.3 * (S.up.f_ultGain || 0)));

  // RÉPARATION : un segment revient toutes les N secondes
  if (S.up.f_regen) {
    s.regenT += dt;
    var every = 9 / S.up.f_regen;
    if (s.regenT >= every) { s.regenT = 0; if (s.len < s.maxHp) healSnake(1); }
  }
  // BOUCLIER : une charge se recharge lentement, jusqu'au maximum acheté
  if (S.up.f_shield) {
    s.shieldT += dt;
    /* f_shieldCd est en MILLISECONDES (9000 / 7000 / 5200, src/24-upgrades.js,
       et le contrat le dit) : « 11 - f_shieldCd » le lisait en secondes et
       rendait -8989, donc une charge rendue À CHAQUE IMAGE. Une seule carte
       BOUCLIER suffisait à rendre la joueuse définitivement intouchable —
       mesuré : zéro coup encaissé du secteur 4 jusqu'au plafond de 900 s sur
       les six parties du pilote d'esquive, 133 ennemis vivants en moyenne au
       secteur 8. C'est la cause première du « passé 60 s plus personne ne
       meurt » de G9 ; aucun réglage de cadence ni de PV ne pouvait la couvrir. */
    var cd = (S.up.f_shieldCd ? S.up.f_shieldCd / 1000 : 14);
    if (s.shieldT >= cd) {
      s.shieldT = 0;
      if (s.shield < S.up.f_shield) {
        s.shield++;
        S2030.fx && S2030.fx.ring(s.x, s.y, '#7CFFB2', 6, 400);
      }
    }
  }
  // SURSIS : le temps ralentit quand il ne reste presque plus rien
  var low = s.len <= 3;
  if (S.up.f_slowmo) {
    S.timeScale = low ? (1 - 0.18 * S.up.f_slowmo) : 1;
  }
  /* Il ne reste presque plus rien : un battement de coeur a 1 Hz. C'est la
     seule information de survie que l'oreille peut donner sans que le regard
     quitte le serpent. */
  if (low && !S.dead) { if (S.t - _lowHpT >= 1000) { _lowHpT = S.t; S2030.audio && S2030.audio.sfx('lowHp'); } }
  else _lowHpT = -9999;
  hurtSlowTick();
}

var _wallT = 0, _lowHpT = -9999;
function wallBump() {
  if (S.t - _wallT < 260) return;
  _wallT = S.t;
  S2030.fx && S2030.fx.shake(3);
  S2030.fx && S2030.fx.ring(S.snake.x, S.snake.y, '#ff5c8a', 8, 260);
  S2030.audio && S2030.audio.sfx('wallBump');
}

/* ------ dégâts joueur
   ARRÊT SUR IMAGE : 0,4 pendant 180 ms puis retour linéaire sur 120 ms.
   Compté en temps de jeu (S.t), donc insensible au ralenti qu'il pose. */
var _hurtSlowT = 0, _hurtPrevTs = -1;
var _hurtP0 = { x: 0, y: 0 }, _hurtP1 = { x: 0, y: 0 };
function hurtSlowTick() {
  if (_hurtSlowT <= 0) return;
  var el = S.t - _hurtSlowT, ts;
  if (el < 180) ts = 0.4;
  else if (el < 300) ts = 0.4 + 0.6 * (el - 180) / 120;
  else ts = 1;
  if (S.timeScale === _hurtPrevTs || S.timeScale > ts) S.timeScale = ts;
  _hurtPrevTs = ts;
  if (el >= 300) { _hurtSlowT = 0; _hurtPrevTs = -1; }
}

function hurtSnake(dmg, x, y, src) {
  var s = S.snake;
  if (s.invuln > 0 || S.phase !== 'play') return;
  dmg = Math.max(1, dmg | 0);

  // BLINDAGE : plafonne chaque coup à un seul segment
  if (S.up.f_capDamage) dmg = 1;

  /* BOUCLIER : une charge encaisse K.SHIELD_CAP segments. Jusqu'au secteur 3 un
     coup coûte 1 à 3 segments : la charge le prend en entier et la carte tient
     exactement la promesse d'avant. Passé le secteur 4 un coup en coûte 6 à 12
     et le surplus PASSE. C'est le point que la mesure a désigné : une charge qui
     absorbe un coup ENTIER quelle que soit sa taille annule le directeur de
     difficulté pour qui prend la carte — sur les parties brouillonnes qui
     touchaient le plafond de 600 s, 44 coups sur 95 étaient absorbés en entier
     (graine 5107, trois BOUCLIER), et le bilan segments perdus / segments
     regagnés restait à l'équilibre (616 contre 639) jusqu'au bout. */
  if (s.shield > 0) {
    s.shield--;
    if (dmg <= K.SHIELD_CAP) {
      s.invuln = K.INVULN + 400;
      S2030.fx && S2030.fx.ring(s.x, s.y, '#7CFFB2', 12, 700);
      S2030.fx && S2030.fx.flare(s.x, s.y, '#7CFFB2', 120);
      S2030.audio && S2030.audio.sfx('shock');
      haptic(16);
      return;
    }
    dmg -= K.SHIELD_CAP;
    S2030.fx && S2030.fx.ring(s.x, s.y, '#7CFFB2', 10, 560);
    S2030.audio && S2030.audio.sfx('shock');
  }

  s.len = Math.max(1, s.len - dmg);
  s.hp = s.len;
  // TEMPS MORT : chaque niveau allonge l'invulnérabilité
  s.invuln = K.INVULN + 220 * (S.up.f_iframes || 0);
  // ÉCHAPPÉE : on traverse brièvement après avoir été touché
  if (S.up.f_ghostOnHit) s.ghost = Math.max(s.ghost, 700 * S.up.f_ghostOnHit);
  // SANG-FROID : le multiplicateur survit au coup
  /* SANG-FROID garde tout ; sinon le combo est DIVISÉ PAR DEUX (et non remis
     à zéro) et le multiplicateur est recalculé dans la même image — sans ce
     recalcul le HUD afficherait ×4 avec un combo de 10 jusqu'au kill suivant */
  if (!S.up.f_multKeep) { S.combo = Math.floor(S.combo / 2); setMult(multOf(S.combo)); }
  var hx = x !== undefined ? x : s.x, hy = y !== undefined ? y : s.y;
  /* D'où vient le coup : angle MONDE pour le plateau, angle ÉCRAN pour la
     vignette (sous le roulis et la bascule les deux ne coïncident pas). */
  var wa = angTo(s.x, s.y, hx, hy);
  var sa = wa, P = S2030.phases;
  if (P && P.worldToScreen && (hx !== s.x || hy !== s.y)) {
    /* worldToScreen rend {sx, sy} (px du tampon), pas {x, y} : lire x/y
       renvoyait undefined et l'angle retombait silencieusement sur le monde. */
    var p0 = P.worldToScreen(s.x, s.y, _hurtP0), q0x = p0.sx, q0y = p0.sy;
    var p1 = P.worldToScreen(hx, hy, _hurtP1);
    if (p1.sx !== q0x || p1.sy !== q0y) sa = Math.atan2(p1.sy - q0y, p1.sx - q0x);
  }
  S2030.fx && S2030.fx.shake(8);
  /* Vignette du côté touché : le flash plein écran d'une image ne disait ni
     d'où venait le coup ni combien il coûtait. */
  S2030.fx && S2030.fx.flash('#ff2b52', 0.7, 'edge', sa);
  S2030.fx && S2030.fx.hitstop(4);
  _hurtSlowT = S.t; _hurtPrevTs = -1;
  P && P.jolt && P.jolt(src && src.boss ? 2 : (src && src.elite ? 1.5 : 0.6), wa);
  /* Gerbe : 12 éclats PROJETÉS depuis le point d'impact au lieu de 22 posés
     dessus. Un amas immobile de 22 points sur la tête éclairait le centre de
     l'écran, ce que la vignette est justement là pour éviter. */
  S2030.fx && S2030.fx.burst(hx, hy, '#ff2e63', 12, 210, { glow: true, ang: wa, spread: 1.1, life: 0.28, size: 1.8 });
  S2030.audio && S2030.audio.sfx('hurt');
  haptic([18, 30, 26]);
  if (s.len <= 1) die();
}

function healSnake(n) {
  var s = S.snake;
  s.len = Math.min(K.MAX_LEN, s.len + n);
  s.hp = s.len;
  if (s.len > s.maxHp) s.maxHp = s.len;
}

function die() {
  if (S.phase === 'dead') return;
  S.phase = 'dead';
  var s = S.snake;
  S2030.fx && S2030.fx.shake(30);
  S2030.fx && S2030.fx.hitstop(8);
  S2030.fx && S2030.fx.flash('#ffffff', 0.7);
  S2030.fx && S2030.fx.burst(s.x, s.y, '#00e5ff', 70, 3, { glow: true });
  S2030.fx && S2030.fx.ring(s.x, s.y, '#ffffff', 10, 700);
  for (var i = 0; i < s.segs.length; i += 2) {
    S2030.fx && S2030.fx.burst(s.segs[i].x, s.segs[i].y, '#00e5ff', 5, 1.4, { glow: true });
  }
  S2030.audio && S2030.audio.sfx('dead');
  S2030.audio && S2030.audio.stop();
  haptic([40, 60, 90]);
  releaseWake();
  setTimeout(function () { S2030.ui && S2030.ui.showScreen('over'); }, 900);
}

/* ------ entités : création */
var _eid = 1;
function spawnEnemy(type, x, y, mods) {
  var defs = S2030.enemies && S2030.enemies.defs;
  var d = defs && defs[type];
  if (!d) return null;
  // la difficulté joue surtout sur l'endurance et un peu sur l'allure ;
  // la cadence d'apparition, elle, est réglée côté niveaux
  var dm = diffMul();
  var e = {
    id: _eid++, type: type, x: x, y: y, vx: 0, vy: 0, ang: 0, t: 0,
    r: d.r || 14,
    hp: Math.round((d.hp || 10) * Math.pow(dm, 0.5)),
    maxHp: Math.round((d.hp || 10) * Math.pow(dm, 0.5)),
    dmg: Math.max(1, Math.round((d.dmg || 1) * Math.pow(dm, 0.35))),
    speed: (d.speed || 60) * (1 + (dm - 1) * 0.10),
    score: d.score || 10, xp: d.xp || 1,
    color: d.color || '#ff2e63', elite: false, mod: null, dead: false, hitT: 0
  };
  // champs propres à la définition
  for (var k in d) if (!(k in e)) e[k] = d[k];
  if (mods) {
    if (mods.elite) {
      e.elite = true;
      e.hp = e.maxHp = Math.round(e.hp * 3.2);
      e.score = Math.round(e.score * 4);
      e.xp = Math.round(e.xp * 4);
      e.r = e.r * 1.35;
    }
    if (mods.mod) {
      e.mod = mods.mod;
      var mdef = S2030.enemies.mods && S2030.enemies.mods[mods.mod];
      if (mdef && mdef.apply) mdef.apply(e);
    }
  }
  /* DIRECTEUR DE DIFFICULTÉ (G9) : les ennemis ordinaires et les élites
     NON-BOSS gagnent en endurance ET en mordant avec le NUMÉRO DE SECTEUR
     (S.level, écrit seulement par _lvStart) et avec le cycle de surcharge. Les
     boss en sont exclus — ils portent déjà leur propre facteur de cycle et le
     facteur de _lvBossBorn — sans quoi quatre facteurs s'empileraient. */
  if (!(mods && mods.boss)) {
    var sec = Math.max(0, (((S.level | 0) || 1) - 1)), cyc = enemyCycle();
    var lvF = Math.pow(K.ENHP_LVL, sec) * (1 + 0.04 * cyc);
    if (lvF !== 1) e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * lvF));
    var dgF = 1 + K.ENDMG_LVL * sec + 0.10 * cyc;
    if (dgF !== 1) e.dmg = Math.max(1, Math.round(e.dmg * dgF));
    var spF = Math.min(K.ENSPD_MAX, 1 + K.ENSPD_LVL * sec + 0.03 * cyc);
    if (spF !== 1) e.speed = e.speed * spF;
  }
  if (d.init) d.init(e);
  S.enemies.push(e);
  return e;
}
/* cycle de surcharge courant, 0 pour les secteurs 1 a 3 */
function enemyCycle() {
  var L = S2030.levels;
  return (L && L.cycle) ? (L.cycle() | 0) : 0;
}

function addBullet(o) {
  if (S.bullets.length > 700) return;
  if (o.life === undefined) o.life = 2.2;
  if (o.r === undefined) o.r = 4;
  if (o.dmg === undefined) o.dmg = 1;
  S.bullets.push(o);
  return o;
}
function addEBullet(o) {
  if (S.ebullets.length > 500) return;
  if (o.life === undefined) o.life = 4;
  if (o.r === undefined) o.r = 5;
  if (o.dmg === undefined) o.dmg = 1;
  S.ebullets.push(o);
  return o;
}
function addPickup(kind, x, y) {
  if (S.pickups.length > 400) return;
  S.pickups.push({ kind: kind, x: x, y: y, vx: rndR(-40, 40), vy: rndR(-40, 40), t: 0, r: kind === 'core' ? 11 : 7 });
}

/* ------ dégâts ennemis */
function damageEnemy(e, dmg, opts) {
  if (!e || e.dead) return;
  /* ARRIVÉE DE BOSS (G9) : tant qu'il est piloté vers le cadre et pendant sa
     bannière, il ne prend rien — on le voit venir, on ne le tue pas en chemin. */
  if (e.noDmg) return;
  // ÉLAN : les dégâts montent avec la vitesse quand on est en boost
  if (S.up.f_momentum && S.snake && S.snake.boosting) dmg *= 1 + 0.18 * S.up.f_momentum;
  if (S2030.phases && S2030.phases.foldFactor()) dmg *= 1.8;   // REPLI : frappe lourde
  e.hp -= dmg;
  e.hitT = 90;
  if (opts && opts.x !== undefined) {
    /* Un projectile joueur passe par fx.hit (gerbe + halo), les autres sources
       gardent la gerbe courte : sans cela l'impact non létal ne se voyait pas. */
    if (opts.type === 'bullet' && S2030.fx && S2030.fx.hit) S2030.fx.hit(opts.x, opts.y, e.color);
    else S2030.fx && S2030.fx.burst(opts.x, opts.y, e.color, 3, 0.7, { glow: true });
  }
  if (e.hp <= 0) killEnemy(e, opts);
  else if (S2030.audio) S2030.audio.sfx(e.boss ? 'bossHit' : 'hit', { x: e.x });
}

/* ------ multiplicateur
   Un SEUL chemin d'écriture : setMult(). Le multiplicateur se dérive du combo
   (un palier tous les 3 kills), il est plafonné à 12 — 16 en SURCHARGE de
   secteur — et chaque franchissement ASCENDANT d'un palier rond fait sonner
   'multUp'. Écrire S.mult ailleurs ferait taire le son ou mentir le HUD :
   c'était le cas de hurtSnake, qui remettait mult à 1 sans passer par ici. */
var _MULT_TIERS = [2, 4, 8, 12, 16];
function multCap() {
  var L = S2030.levels;
  return (L && L.cycle && L.cycle() > 0) ? 16 : 12;
}
function multOf(combo) { return Math.min(multCap(), 1 + Math.floor(combo / 3) * 0.5); }
function _multTierOf(m) {
  var n = 0;
  for (var i = 0; i < _MULT_TIERS.length; i++) if (m >= _MULT_TIERS[i] - 1e-9) n++;
  return n;
}
function setMult(m) {
  var a = _multTierOf(S.mult);
  S.mult = m;
  var b = _multTierOf(m);
  while (b > a) { a++; S2030.audio && S2030.audio.sfx('multUp'); }
}

function killEnemy(e, opts) {
  if (e.dead) return;
  e.dead = true;
  S.kills++;
  S.combo++;
  setMult(multOf(S.combo));
  /* la fenêtre s'allonge avec le multiplicateur : trois secondes deux dixièmes
     ne laissaient jamais le temps d'enchaîner hors d'une nuée */
  S.multT = S.multTMax = S.mult >= 3 ? 7000 : 5000;
  addScore(e.score);
  /* le revenu suit le SECTEUR (S.level = numéro de secteur, jamais un niveau
     de joueur) : +15 % par secteur, donc exactement 1,00 pendant le secteur 1 */
  addXp(e.xp * (1 + 0.15 * ((S.level || 1) - 1)));
  /* Mesuré : 0,13 point par seconde, soit 750 s pour une jauge pleine alors
     qu'une partie en dure 30 à 40. Le bouton pulsait « prêt » sans jamais
     l'être. Une partie ordinaire doit offrir une à deux surcharges. */
  /* charge par kill indexée sur le coût du niveau suivant : 6 au départ,
     ~0,7 à xpNext 1 000 — l'ultime reste rare quand la partie s'allonge */
  S.ult = Math.min(S.ultMax, S.ult + (e.elite ? 22 : 6 * Math.sqrt(12 / Math.max(12, S.xpNext))));
  S.coins += e.elite ? 5 : 1;
  /* Direction du tir qui l'a tué : le point d'impact est du côté du tireur,
     donc impact -> centre donne le sens de déplacement du projectile. Sans
     point d'impact utilisable, on retombe sur tête -> ennemi. */
  var ka;
  if (opts && opts.vx !== undefined && (opts.vx || opts.vy)) ka = Math.atan2(opts.vy, opts.vx);
  else if (opts && opts.x !== undefined && dist2(opts.x, opts.y, e.x, e.y) > 1)
    ka = angTo(opts.x, opts.y, e.x, e.y);
  else ka = angTo(S.snake.x, S.snake.y, e.x, e.y);
  e.killAng = ka;
  /* Score flottant : taille indexée sur le combo, ambre dès que le
     multiplicateur mord. Un kill = un texte, élite comprise. */
  if (S2030.fx && S2030.fx.text) {
    var cb = S.combo < 6 ? S.combo : 6;
    S2030.fx.text(e.x, e.y - e.r - 10, '+' + Math.round(e.score * S.mult),
                  S.mult > 1 ? '#ffb14a' : '#ffffff', { size: 13 + 2 * cb, vy: -60 });
  }
  S2030.enemies && S2030.enemies.onDeath && S2030.enemies.onDeath(e);
  /* Hauteur du son de kill : un demi-ton par palier de combo, douze au plus —
     une série se lit à l'oreille comme une montée, pas comme une répétition. */
  var kp = Math.pow(2, (S.combo < 12 ? S.combo : 12) / 12);
  S2030.audio && S2030.audio.sfx(e.elite ? 'bigkill' : 'kill', { x: e.x, pitch: kp });
  S2030.phases && S2030.phases.pulse(e.elite ? 0.09 : 0.035);
  if (e.elite) haptic(20);
  deathEffects(e);
}

/* Constructions explosive et électrique : ce qui se déclenche à la mort d'un
   ennemi. Regroupé ici pour que les cartes concernées aient un seul lecteur. */
var _chainDepth = 0;
function deathEffects(e) {
  var bomb = (S.up.f_deathBomb || 0) + (S.up.f_shockExplode || 0);
  var chain = S.up.f_chainExplode || 0;
  var pool = S.up.f_burnPool || 0;

  if (bomb || (chain && _chainDepth < 3)) {
    var r = 70 + 22 * (bomb + chain) + 16 * (S.up.f_blastDmg || 0);
    var dmg = (5 + 4 * bomb + 3 * chain) * (1 + 0.25 * (S.up.f_blastDmg || 0));
    S2030.fx && S2030.fx.ring(e.x, e.y, '#ffb14a', 8, 620);
    duckMusic(0.35, 0.5);
    S2030.fx && S2030.fx.flare(e.x, e.y, '#ffb14a', r);
    S2030.audio && S2030.audio.sfx('explode', { x: e.x });
    var list = enemiesNear(e.x, e.y, r);
    _chainDepth++;
    for (var i = 0; i < list.length; i++) if (list[i] !== e) damageEnemy(list[i], dmg, { x: list[i].x, y: list[i].y });
    _chainDepth--;
  }

  if (pool) {
    // FLAQUE : une zone brûlante subsiste quelques instants
    S.pools.push({ x: e.x, y: e.y, r: 60 + 14 * pool, dmg: 3 * pool, life: 2.2 + 0.5 * pool });
    if (S.pools.length > 40) S.pools.shift();
  }

  /* IMPLOSION : « les explosions aspirent pendant 0,18 s ». L'indicateur était
     posé par la carte et lu nulle part — la carte ne faisait rien. */
  if (S.up.f_implode && (bomb || chain)) {
    var pull = enemiesNear(e.x, e.y, 190);
    for (var q = 0; q < pull.length; q++) {
      var t = pull[q];
      if (t === e || t === S.boss) continue;
      var pa = angTo(t.x, t.y, e.x, e.y);
      t.vx = (t.vx || 0) + Math.cos(pa) * 420;
      t.vy = (t.vy || 0) + Math.sin(pa) * 420;
    }
    S2030.fx && S2030.fx.ring(e.x, e.y, '#b388ff', 6, 380);
  }

  /* ARC DE MORT : « toute mort relance un arc de 3 rebonds depuis le corps ». */
  if (S.up.f_deathArc && _chainDepth < 2) {
    var from = e, hop = 0;
    _chainDepth++;
    while (hop < 3) {
      var near = enemiesNear(from.x, from.y, 240);
      var cible = null;
      for (var z = 0; z < near.length; z++) {
        if (near[z] !== from && near[z] !== e && !near[z].dead) { cible = near[z]; break; }
      }
      if (!cible) break;
      S2030.fx && S2030.fx.bolt
        ? S2030.fx.bolt(from.x, from.y, cible.x, cible.y, '#7bdcff')
        : S2030.fx && S2030.fx.ring(cible.x, cible.y, '#7bdcff', 5, 260);
      damageEnemy(cible, 7, { x: cible.x, y: cible.y, type: 'shock' });
      from = cible; hop++;
    }
    _chainDepth--;
    if (hop) S2030.audio && S2030.audio.sfx('zap', { x: e.x });
  }
}

/* MUR DU SON : « pendant le boost, onde permanente de rayon 90 devant la
   tête ». L'indicateur n'était lu nulle part : la carte, la plus chère du
   paquet, ne produisait aucune sortie mesurable. */
function sonicTick(dt) {
  var s = S.snake;
  if (!S.up.f_sonicBoom || !s || !s.boosting) return;
  var fx = s.x + Math.cos(s.ang) * 74, fy = s.y + Math.sin(s.ang) * 74;
  var list = enemiesNear(fx, fy, 90);
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    damageEnemy(e, 26 * dt * 15, { x: e.x, y: e.y, type: 'blast' });
    var a = angTo(fx, fy, e.x, e.y);
    e.vx = (e.vx || 0) + Math.cos(a) * 260 * dt * 15;
    e.vy = (e.vy || 0) + Math.sin(a) * 260 * dt * 15;
  }
  if ((S.t | 0) % 6 === 0) S2030.fx && S2030.fx.ring(fx, fy, '#fff3b0', 5, 240);
}

/* Aura électrique passive (constructions conductrices). */
function auraTick(dt) {
  var n = (S.up.f_staticField || 0) + (S.up.f_conduct || 0) + (S.up.f_ionMark || 0);
  if (!n || !S.snake) return;
  var s = S.snake;
  var r = 100 + 26 * n;
  if ((S.t | 0) % 4 !== 0) return;      // on n'interroge la grille qu'une image sur quatre
  var list = enemiesNear(s.x, s.y, r);
  for (var i = 0; i < list.length; i++) {
    damageEnemy(list[i], 1.6 * n * dt * 15, { x: list[i].x, y: list[i].y, type: 'shock' });
  }
  if (list.length && chance(0.25)) S2030.fx && S2030.fx.ring(s.x, s.y, '#7bdcff', r * 0.7, 420);
}

/* Flaques brûlantes laissées par les morts. */
function poolsTick(dt) {
  for (var i = S.pools.length - 1; i >= 0; i--) {
    var p = S.pools[i];
    p.life -= dt;
    if (p.life <= 0) { S.pools.splice(i, 1); continue; }
    var list = enemiesNear(p.x, p.y, p.r);
    for (var j = 0; j < list.length; j++) damageEnemy(list[j], p.dmg * dt, { x: list[j].x, y: list[j].y });
  }
}

function drawPools(ctx) {
  for (var i = 0; i < S.pools.length; i++) {
    var p = S.pools[i];
    if (!inView(p.x, p.y, p.r)) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(p.life / 2.2, 0, 1) * 0.4;
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, '#ff8a3d'); g.addColorStop(1, 'rgba(255,138,61,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function addScore(n) { S.score += Math.round(n * S.mult); }
function addXp(n) {
  if (S.up.f_xp) n *= 1 + 0.25 * S.up.f_xp;   // SAVOIR : plus d'expérience
  S.xp += n;
  while (S.xp >= S.xpNext) {
    S.xp -= S.xpNext;
    S.lvlUps++;
    S.xpNext = Math.round(S.xpNext * 1.12 + 6);
  }
}

/* ------ requêtes spatiales */
var _grid = { cells: null, cols: 0, rows: 0 };
function rebuildGrid() {
  var cols = Math.ceil(K.ARENA_W / K.GRID), rows = Math.ceil(K.ARENA_H / K.GRID);
  if (!_grid.cells || _grid.cols !== cols || _grid.rows !== rows) {
    _grid.cols = cols; _grid.rows = rows;
    _grid.cells = new Array(cols * rows);
    for (var i = 0; i < _grid.cells.length; i++) _grid.cells[i] = [];
  }
  for (var c = 0; c < _grid.cells.length; c++) _grid.cells[c].length = 0;
  for (var j = 0; j < S.enemies.length; j++) {
    var e = S.enemies[j];
    if (e.dead) continue;
    var cx = (e.x / K.GRID) | 0, cy = (e.y / K.GRID) | 0;
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
    _grid.cells[cy * cols + cx].push(e);
  }
}
var _near = [];
function enemiesNear(x, y, r) {
  _near.length = 0;
  var c0 = Math.max(0, ((x - r) / K.GRID) | 0), c1 = Math.min(_grid.cols - 1, ((x + r) / K.GRID) | 0);
  var r0 = Math.max(0, ((y - r) / K.GRID) | 0), r1 = Math.min(_grid.rows - 1, ((y + r) / K.GRID) | 0);
  var rr = r * r;
  for (var cy = r0; cy <= r1; cy++) {
    for (var cx = c0; cx <= c1; cx++) {
      var cell = _grid.cells[cy * _grid.cols + cx];
      for (var i = 0; i < cell.length; i++) {
        var e = cell[i];
        if (!e.dead && dist2(x, y, e.x, e.y) <= rr) _near.push(e);
      }
    }
  }
  return _near;
}
function nearestEnemy(x, y, maxR) {
  var best = null, bd = (maxR || 900) * (maxR || 900);
  var list = enemiesNear(x, y, maxR || 900);
  for (var i = 0; i < list.length; i++) {
    var d = dist2(x, y, list[i].x, list[i].y);
    if (d < bd) { bd = d; best = list[i]; }
  }
  return best;
}
// visible = dans l'étendue réellement montrée (phases.visibleExtent : sous la bascule le tampon déborde l'écran)
function inView(x, y, m) {
  m = m || 60;
  var P = S2030.phases, V = (P && P.visibleExtent) ? P.visibleExtent() : null;
  if (V) return x > V.x0 - m && x < V.x1 + m && y > V.y0 - m && y < V.y1 + m;
  return x > S.cam.x - S.view.w / 2 - m && x < S.cam.x + S.view.w / 2 + m &&
         y > S.cam.y - S.view.h / 2 - m && y < S.cam.y + S.view.h / 2 + m;
}

/* ------ collisions */

/* Au-delà de cet indice d'anneau, une balle ennemie est absorbée par le corps :
   pas de dégât, pas d'invulnérabilité, pas de combo cassé. Les 8 premiers
   anneaux (0..7) et la tête blessent comme avant. */
var BODY_ABSORB = 8;
function absorbEBullet(b) {
  var s = S.snake;
  S2030.fx && S2030.fx.burst(b.x, b.y, '#00e5ff', 6, 170, { size: 1.5, life: 0.22, drag: 2.2 });
  s.boostE = Math.min(s.boostMax, s.boostE + 1);
  S2030.audio && S2030.audio.sfx('absorb', { vol: 0.8 });
}

function collide(dt) {
  var s = S.snake, i, j, e, b;

  rebuildGrid();

  // projectiles joueur contre ennemis
  for (i = S.bullets.length - 1; i >= 0; i--) {
    b = S.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.homing) {
      if (!b.target || b.target.dead) b.target = nearestEnemy(b.x, b.y, 520);
      if (b.target) {
        var wa = angTo(b.x, b.y, b.target.x, b.target.y);
        var ca = Math.atan2(b.vy, b.vx);
        var na = ca + clamp(norm(wa - ca), -5 * dt, 5 * dt);
        var sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
    }
    if (b.life <= 0 || b.x < -60 || b.y < -60 || b.x > K.ARENA_W + 60 || b.y > K.ARENA_H + 60) {
      S.bullets.splice(i, 1); continue;
    }
    var hits = enemiesNear(b.x, b.y, b.r + 26);
    for (j = 0; j < hits.length; j++) {
      e = hits[j];
      var rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;
      damageEnemy(e, b.dmg, { x: b.x, y: b.y, type: 'bullet', vx: b.vx, vy: b.vy });
      if (b.onHit) b.onHit(e);
      if (b.aoe) {
        var around = enemiesNear(b.x, b.y, b.aoe);
        for (var a = 0; a < around.length; a++) if (around[a] !== e) damageEnemy(around[a], b.dmg * 0.6, { x: b.x, y: b.y });
        S2030.fx && S2030.fx.ring(b.x, b.y, b.color || '#ffd166', 6, 520);
        S2030.audio && S2030.audio.sfx('hit', { vol: 0.8, x: b.x });
      }
      if (b.pierce && b.pierce > 0) { b.pierce--; }
      else { S.bullets.splice(i, 1); }
      break;
    }
  }

  // projectiles ennemis contre le serpent
  var segs = s.segs;
  for (i = S.ebullets.length - 1; i >= 0; i--) {
    b = S.ebullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -80 || b.y < -80 || b.x > K.ARENA_W + 80 || b.y > K.ARENA_H + 80) {
      S.ebullets.splice(i, 1); continue;
    }
    var hr = b.r + S.headR;
    if (s.invuln <= 0 && dist2(b.x, b.y, s.x, s.y) < hr * hr) {
      hurtSnake(b.dmg, b.x, b.y);
      S.ebullets.splice(i, 1); continue;
    }
    /* Anneaux : les 8 premiers d'abord (ils blessent et l'emportent sur le reste
       quand un serpent replié se croise), puis le corps profond, qui ENCAISSE —
       le coup ne blesse pas, il nourrit le boost. Le balayage profond garde le
       pas de 2 d'origine : même coût qu'avant l'absorption. */
    var sr = b.r + S.headR * 0.72, srr = sr * sr, ns = segs.length, bi = -1, bd = srr, dd;
    var lim = ns < BODY_ABSORB ? ns : BODY_ABSORB;
    for (j = 0; j < lim; j++) {                       // 8 premiers anneaux : un par un
      dd = dist2(b.x, b.y, segs[j].x, segs[j].y);
      if (dd < bd) { bd = dd; bi = j; }
    }
    if (bi >= 0) {                                    // un anneau proche blesserait : on vérifie TOUT le corps
      for (j = BODY_ABSORB; j < ns; j++) {
        dd = dist2(b.x, b.y, segs[j].x, segs[j].y);
        if (dd < bd) { bd = dd; bi = j; }
      }
    } else {                                          // cas courant (la balle ne touche rien près de la tête) : pas de 2
      for (j = BODY_ABSORB; j < ns; j += 2) {
        dd = dist2(b.x, b.y, segs[j].x, segs[j].y);
        if (dd < bd) { bd = dd; bi = j; }
      }
    }
    if (bi >= BODY_ABSORB) { absorbEBullet(b); S.ebullets.splice(i, 1); continue; }
    if (bi >= 0 && s.invuln <= 0) { hurtSnake(b.dmg, b.x, b.y); S.ebullets.splice(i, 1); }
  }

  // ennemis contre la tête et le corps
  if (s.ghost <= 0) {
    var close = enemiesNear(s.x, s.y, 260);
    for (i = 0; i < close.length; i++) {
      e = close[i];
      if (e.harmless) continue;          // il fuit le secteur : il ne blesse plus (G9)
      var cr = e.r + S.headR;
      if (dist2(s.x, s.y, e.x, e.y) < cr * cr) {
        if (S.up.f_ramDamage && s.boosting) {
          damageEnemy(e, S.up.f_ramDamage, { x: e.x, y: e.y });
          S2030.fx && S2030.fx.burst(e.x, e.y, '#fff3b0', 10, 1.4, { glow: true });
        } else if (s.invuln <= 0) {
          hurtSnake(e.dmg, e.x, e.y, e);   // hurtSnake fait piquer le plateau pour TOUTE blessure
          if (e.suicide) killEnemy(e);
        }
      } else if (S.up.f_thorns) {
        // RONCES : le corps blesse ce qui le frôle
        var tr = e.r + S.headR * 1.1;
        for (var sg = 0; sg < segs.length; sg += 3) {
          if (dist2(segs[sg].x, segs[sg].y, e.x, e.y) < tr * tr) {
            damageEnemy(e, S.up.f_thorns * 0.9 * dt * 60, { x: e.x, y: e.y });
            break;
          }
        }
      }
    }
  }

  // ramassage
  var magnetR = 120 + (S.up.f_magnet || 0) * 90;
  for (i = S.pickups.length - 1; i >= 0; i--) {
    var p = S.pickups[i];
    p.t += dt;
    /* Sans expiration ils s'accumulaient — 128 mesurés après trois minutes —
       jusqu'au plafond de 400, où le jeu cessait silencieusement de produire
       le moindre butin. Ils clignotent avant de partir. */
    if (p.t > 26) { S.pickups.splice(i, 1); continue; }
    var d = dist(p.x, p.y, s.x, s.y);
    if (d < magnetR) {
      var pull = (1 - d / magnetR) * 900;
      var pa = angTo(p.x, p.y, s.x, s.y);
      p.vx = lerp(p.vx, Math.cos(pa) * pull, 0.25);
      p.vy = lerp(p.vy, Math.sin(pa) * pull, 0.25);
    } else { p.vx *= 0.94; p.vy *= 0.94; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (d < S.headR + p.r + 4) {
      grabPickup(p);
      S.pickups.splice(i, 1);
    }
  }
}

function grabPickup(p) {
  if (p.kind === 'energy') {
    addXp(1); addScore(5);
    // GLOUTON : ramasser soigne plus souvent
    if (chance(0.35 + 0.18 * (S.up.f_pickHeal || 0))) healSnake(1);
    S2030.audio && S2030.audio.sfx('pickup');
  } else if (p.kind === 'core') {
    addXp(8); addScore(60);
    S.ult = Math.min(S.ultMax, S.ult + 20);
    healSnake(1);
    S2030.audio && S2030.audio.sfx('core');
    S2030.fx && S2030.fx.flare(p.x, p.y, '#ffd166', 90);
  } else if (p.kind === 'heal') {
    healSnake(3);
    S2030.audio && S2030.audio.sfx('core');
  }
  S2030.fx && S2030.fx.burst(p.x, p.y, p.kind === 'core' ? '#ffd166' : '#00e5ff', 6, 0.8, { glow: true });
  haptic(6);
}

/* ------ caméra */
// suivi avec avance ; sous la bascule 3D (écran plus petit que le tampon) : cible bornée sur l'étendue
// visible, avance en y réduite à 0,3 × vitesse au-delà de 10°, tête maintenue entre 12 % et 88 % de l'écran
var CAM_BAND = 0.12, _camP = { x: 0, y: 0 }, _camQ = { x: 0, y: 0 };
function updateCam(dt) {
  var s = S.snake, P = S2030.phases, V = (P && P.visibleExtent) ? P.visibleExtent() : null;
  var lead = s.speed * 0.55, leadY = (P && P.persp && P.persp() > 0.1745) ? s.speed * 0.3 : lead;
  var L = V ? V.left : S.view.w / 2, R = V ? V.right : L, T = V ? V.top : S.view.h / 2, B = V ? V.bottom : T;
  var tx = K.ARENA_W < L + R ? K.ARENA_W / 2 : clamp(s.x + Math.cos(s.ang) * lead, L, K.ARENA_W - R);
  var ty = K.ARENA_H < T + B ? K.ARENA_H / 2 : clamp(s.y + Math.sin(s.ang) * leadY, T, K.ARENA_H - B);
  var k = 1 - Math.pow(0.0015, dt);
  S.cam.x = lerp(S.cam.x, tx, k); S.cam.y = lerp(S.cam.y, ty, k);
  if (P && P.toScreen) camKeepHead(P, s);
}
// borne linéaire à plat, itération sur une dérivée locale sous la bascule
function camKeepHead(P, s) {
  var lo = CAM_BAND, hi = 1 - lo, b = 1 - 2 * lo, hw = S.view.w / 2, hh = S.view.h / 2, bx = (s.x - S.cam.x) / hw, by = (s.y - S.cam.y) / hh;
  if (!(P.persp && P.persp() > 0.001) && !(P.rot && P.rot())) {
    if (bx > b) S.cam.x = s.x - b * hw; else if (bx < -b) S.cam.x = s.x + b * hw;
    if (by > b) S.cam.y = s.y - b * hh; else if (by < -b) S.cam.y = s.y + b * hh;
    return;
  }
  if (bx > 0.95 || bx < -0.95 || by > 0.95 || by < -0.95) { S.cam.x = s.x; S.cam.y = s.y; }   // hors tampon : recentrage d'abord
  for (var it = 0; it < 4; it++) {
    var p = P.toScreen(s.x, s.y, _camP), ex = p.x < lo ? p.x - lo : p.x > hi ? p.x - hi : 0, ey = p.y < lo ? p.y - lo : p.y > hi ? p.y - hi : 0;
    if (!ex && !ey) return;
    if (ex) { var gx = P.toScreen(s.x + 1, s.y, _camQ).x - p.x; if (Math.abs(gx) > 1e-6) S.cam.x += ex / gx; }
    if (ey) { var gy = P.toScreen(s.x, s.y + 1, _camQ).y - p.y; if (Math.abs(gy) > 1e-6) S.cam.y += ey / gy; }
  }
}

/* ------ vibrations */
/* Fait plonger la musique un instant pour laisser passer une déflagration.
   Sans cela le morceau et l'explosion se disputent le même espace et
   l'explosion perd — alors que c'est elle qui doit frapper. */
var _duckT = 0;
function duckMusic(depth, secs) {
  if (!S2030.audio || !S2030.audio.duck) return;
  if (S.t - _duckT < 90) return;
  _duckT = S.t;
  S2030.audio.duck(depth, 0.05);
  setTimeout(function () { S2030.audio.duck(1, secs || 0.45); }, 140);
}

function haptic(p) {
  if (!S.opt.haptics || !navigator.vibrate) return;
  try { navigator.vibrate(p); } catch (e) {}
}

/* ------ verrou d'écran */
/* Une seule demande par période d'éveil (retour au premier plan, reprise) ; releaseWake() rouvre
   la porte (mort, abandon, arrière-plan, verrou lâché par le système). */
var _wake = null, _wakeAsked = false;
function requestWake() {
  if (_wakeAsked) return;
  try {
    if (!('wakeLock' in navigator)) return;
    _wakeAsked = true;
    navigator.wakeLock.request('screen').then(function (w) {
      _wake = w;
      try {
        w.addEventListener('release', function () { if (_wake === w) { _wake = null; _wakeAsked = false; } });
      } catch (e) {}
    }).catch(function () { _wake = null; });
  } catch (e) { _wake = null; }
}
function releaseWake() { try { _wake && _wake.release(); } catch (e) {} _wake = null; _wakeAsked = false; }
