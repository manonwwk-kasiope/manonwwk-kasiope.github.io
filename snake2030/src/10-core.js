/* ============================================================================
   SNAKE 2030 — coeur
   État, mathématiques, physique du serpent, caméra, collisions, entrées,
   boucle principale. Tout ce que les modules de contenu consomment.
   ========================================================================== */

var S2030 = {};

/* ---------------------------------------------------------------- constantes */
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
  BOOST_FILL: 15,
  START_LEN: 9,
  MAX_LEN: 90,
  INVULN: 900,              // ms après un dégât
  MUSIC_LOOP: 259.074979,
  MUSIC_BPM: 144.6,
  GRID: 110                 // taille de cellule de la grille de collision
};

/* --------------------------------------------------------------------- état */
var S = {
  t: 0, dt: 0,
  phase: 'menu', paused: false,
  cam: { x: 0, y: 0 },
  view: { w: 1280, h: 780 },
  shake: 0,
  snake: null,
  enemies: [], bullets: [], ebullets: [], pickups: [], drones: [], pools: [],
  level: 1, levelT: 0, levelProgress: 0, intensity: 0,
  score: 0, mult: 1, multT: 0, combo: 0, kills: 0,
  xp: 0, xpNext: 12, lvlUps: 0,
  up: {},
  ult: 0, ultMax: 100, special: 0, specialCd: 0,
  coins: 0, seed: 1,
  musicBuf: null,
  input: { jx: 0, jy: 0, jmag: 0, jactive: false, boost: false, special: false, ult: false },
  opt: { reduceFlash: false, reduceShake: false, particles: 1, contrast: false,
         haptics: true, music: true, sfx: true, leftHanded: false,
         joyFloat: true, joySize: 1, joyAlpha: 1, sens: 1, uiScale: 1, diff: 1.5, px: 1.5 },
  stats: { best: 0, coins: 0, runs: 0 },
  boss: null, bossHpMax: 0, headR: 16, pxEff: 1.5,
  timeScale: 1
};

/* ------------------------------------------------- aléatoire avec graine */
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

/* ----------------------------------------------------------- mathématiques */
var TAU = Math.PI * 2;
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function norm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); }
function dist2(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
function dist(x1, y1, x2, y2) { return Math.sqrt(dist2(x1, y1, x2, y2)); }

/* ------------------------------------------------------------- difficulté */
/* Le cran 2 est la référence : il vaut le double de l'ancien réglage, qui
   correspond désormais à « DÉTENDU ». Le multiplicateur ne s'applique pas
   uniformément — doubler les dégâts encaissés rendrait le jeu injouable
   alors que doubler la densité le rend simplement plus dense. */
/* Échelle retaillée sur des mesures de survie, non sur des multiplicateurs.
   L'ancienne donnait, pour un joueur passif : plus de 150 s / 88 / 90 / 62 /
   20 s — le premier cran ne finissait jamais, les deux du milieu étaient
   indiscernables, et le dernier tuait avant le premier contenu du jeu. */
var DIFFS = [
  { m: 1.25, nom: 'DÉTENDU' },
  { m: 1.55, nom: 'SOUTENU' },
  { m: 1.90, nom: 'STANDARD' },
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

/* -------------------------------------------------------------- le serpent */
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

  var want = inp.jmag > 0.12 ? Math.atan2(inp.jy, inp.jx) : null;
  var rail = !!(S2030.phases && S2030.phases.railed());

  if (rail) {
    /* --- treillis : le corps est verrouillé sur les rails ---
       On arrondit la direction demandée, pas le cap courant. Arrondir le cap
       courant bloquerait le serpent sur son rail : le virage progressif ne
       franchit jamais la moitié du quadrant, la diagonale la plus proche
       reste la même, et le manche a beau désigner l'autre rail, on y revient
       à chaque image. Ici le changement de rail est franc, comme il doit
       l'être sur un treillis. */
    var tgt = S2030.phases.railAng(want === null ? s.ang : want);
    // demi-tour refusé : on ne repique pas dans son propre corps
    if (Math.abs(norm(tgt - s.ang)) > Math.PI * 0.75) tgt = S2030.phases.railAng(s.ang);
    s.ang = tgt;
  } else if (want !== null) {
    // --- cap : virage analogique vers la direction du manche ---
    var diff = norm(want - s.ang);
    var rate = K.TURN_RATE * s.turnBoost * S.opt.sens * clamp(inp.jmag * 1.35, 0, 1);
    var step = clamp(diff, -rate * dt, rate * dt);
    s.ang = norm(s.ang + step);
  }

  /* La tête, elle, reste libre : elle pivote dans un cône devant elle pour
     garder ses cibles en joue, et c'est ce cap-là que suivent les canons.
     Ce que le joueur perd en trajectoire, il le récupère en visée. */

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
  var wantBoost = inp.boost && s.boostE > 1;
  var drain = K.BOOST_DRAIN * (1 - 0.16 * (S.up.f_boostDrain || 0));  // RÉSERVE
  if (wantBoost) {
    s.boostE = Math.max(0, s.boostE - drain * dt);
    if (!s.boosting) { s.boosting = true; S2030.audio && S2030.audio.sfx('boost'); haptic(12); }
  } else {
    if (s.boosting) { s.boosting = false; S2030.audio && S2030.audio.sfx('boostEnd'); }
    s.boostE = Math.min(s.boostMax, s.boostE + K.BOOST_FILL * dt);
  }
  // PROPULSION : la vitesse de croisière monte avec les cartes
  s.baseSpeed = K.BASE_SPEED * (1 + 0.07 * (S.up.f_speed || 0));
  var target = s.baseSpeed * (s.boosting ? K.BOOST_MUL : 1);
  s.speed = lerp(s.speed, target, 1 - Math.pow(0.002, dt));

  // --- avance ---
  s.x += Math.cos(s.ang) * s.speed * dt;
  s.y += Math.sin(s.ang) * s.speed * dt;

  // --- bords de l'arène : rebond amorti plutôt que mort sèche ---
  var m = K.HEAD_R;
  if (s.x < m) { s.x = m; s.ang = norm(Math.PI - s.ang); wallBump(); }
  if (s.x > K.ARENA_W - m) { s.x = K.ARENA_W - m; s.ang = norm(Math.PI - s.ang); wallBump(); }
  if (s.y < m) { s.y = m; s.ang = -s.ang; wallBump(); }
  if (s.y > K.ARENA_H - m) { s.y = K.ARENA_H - m; s.ang = -s.ang; wallBump(); }

  /* La visée est bornée à ±RAIL_LOOK autour du cap ; le rebond change le cap
     après coup, et la tête comme les canons partaient jusqu'à l'opposé du
     corps. On la ramène dans son cône une fois le cap définitif. */
  if (s.aim !== undefined) {
    var ec = norm(s.aim - s.ang);
    if (ec > RAIL_LOOK) s.aim = norm(s.ang + RAIL_LOOK);
    else if (ec < -RAIL_LOOK) s.aim = norm(s.ang - RAIL_LOOK);
  }

  // REPLI : moins long, mais nettement plus épais — le corps et la boîte de
  // collision grossissent ensemble, sinon le joueur sentirait le mensonge
  var fold = S2030.phases ? S2030.phases.foldFactor() : 0;
  S.headR = K.HEAD_R * (1 + 0.5 * fold);
  if (fold) s.speed *= 1.12;

  // aimantation sur le rail : après l'avance, avant que le chemin ne
  // l'enregistre, pour que le corps suive exactement la même ligne
  if (rail) S2030.phases.railSnap(s, dt);

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
    var cd = (S.up.f_shieldCd ? 11 - S.up.f_shieldCd : 14);
    if (s.shieldT >= cd) {
      s.shieldT = 0;
      if (s.shield < S.up.f_shield) {
        s.shield++;
        S2030.fx && S2030.fx.ring(s.x, s.y, '#7CFFB2', 6, 400);
      }
    }
  }
  // SURSIS : le temps ralentit quand il ne reste presque plus rien
  if (S.up.f_slowmo) {
    var low = s.len <= 3;
    S.timeScale = low ? (1 - 0.18 * S.up.f_slowmo) : 1;
  }
}

var _wallT = 0;
function wallBump() {
  if (S.t - _wallT < 260) return;
  _wallT = S.t;
  S2030.fx && S2030.fx.shake(5);
  S2030.fx && S2030.fx.ring(S.snake.x, S.snake.y, '#ff5c8a', 8, 260);
  S2030.audio && S2030.audio.sfx('hit');
}

/* ------------------------------------------------------------- dégâts joueur */
function hurtSnake(dmg, x, y) {
  var s = S.snake;
  if (s.invuln > 0 || S.phase !== 'play') return;
  dmg = Math.max(1, dmg | 0);

  // BLINDAGE : plafonne chaque coup à un seul segment
  if (S.up.f_capDamage) dmg = 1;

  // BOUCLIER : une charge absorbe le coup entier
  if (s.shield > 0) {
    s.shield--;
    s.invuln = K.INVULN + 400;
    S2030.fx && S2030.fx.ring(s.x, s.y, '#7CFFB2', 12, 700);
    S2030.fx && S2030.fx.flare(s.x, s.y, '#7CFFB2', 120);
    S2030.audio && S2030.audio.sfx('shock');
    haptic(16);
    return;
  }

  s.len = Math.max(1, s.len - dmg);
  s.hp = s.len;
  // TEMPS MORT : chaque niveau allonge l'invulnérabilité
  s.invuln = K.INVULN + 220 * (S.up.f_iframes || 0);
  // ÉCHAPPÉE : on traverse brièvement après avoir été touché
  if (S.up.f_ghostOnHit) s.ghost = Math.max(s.ghost, 700 * S.up.f_ghostOnHit);
  // SANG-FROID : le multiplicateur survit au coup
  if (!S.up.f_multKeep) { S.mult = 1; S.combo = 0; }
  S2030.fx && S2030.fx.shake(14);
  S2030.fx && S2030.fx.flash('#ff2e63', 0.35);
  S2030.fx && S2030.fx.burst(x !== undefined ? x : s.x, y !== undefined ? y : s.y, '#ff2e63', 22, 1.5, { glow: true });
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

/* ------------------------------------------------------- entités : création */
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
  if (d.init) d.init(e);
  S.enemies.push(e);
  return e;
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

/* ------------------------------------------------------------ dégâts ennemis */
function damageEnemy(e, dmg, opts) {
  if (!e || e.dead) return;
  // ÉLAN : les dégâts montent avec la vitesse quand on est en boost
  if (S.up.f_momentum && S.snake && S.snake.boosting) dmg *= 1 + 0.18 * S.up.f_momentum;
  if (S2030.phases && S2030.phases.foldFactor()) dmg *= 1.8;   // REPLI : frappe lourde
  e.hp -= dmg;
  e.hitT = 90;
  if (opts && opts.x !== undefined) {
    S2030.fx && S2030.fx.burst(opts.x, opts.y, e.color, 3, 0.7, { glow: true });
  }
  if (e.hp <= 0) killEnemy(e, opts);
  else if (S2030.audio) S2030.audio.sfx('hit');
}

function killEnemy(e, opts) {
  if (e.dead) return;
  e.dead = true;
  S.kills++;
  S.combo++;
  S.multT = 3200;
  S.mult = Math.min(12, 1 + Math.floor(S.combo / 4) * 0.5);
  addScore(e.score);
  addXp(e.xp);
  /* Mesuré : 0,13 point par seconde, soit 750 s pour une jauge pleine alors
     qu'une partie en dure 30 à 40. Le bouton pulsait « prêt » sans jamais
     l'être. Une partie ordinaire doit offrir une à deux surcharges. */
  S.ult = Math.min(S.ultMax, S.ult + (e.elite ? 22 : 4.5));
  S.coins += e.elite ? 5 : 1;
  S2030.enemies && S2030.enemies.onDeath && S2030.enemies.onDeath(e);
  S2030.audio && S2030.audio.sfx(e.elite ? 'bigkill' : 'kill', { x: e.x });
  S2030.phases && S2030.phases.pulse(e.elite ? 0.05 : 0.012);
  if (e.elite) { S2030.fx && S2030.fx.shake(9); haptic(20); }
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
    S.xpNext = Math.round(S.xpNext * 1.28 + 4);
  }
}

/* ------------------------------------------------------- requêtes spatiales */
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
function inView(x, y, m) {
  m = m || 60;
  return x > S.cam.x - S.view.w / 2 - m && x < S.cam.x + S.view.w / 2 + m &&
         y > S.cam.y - S.view.h / 2 - m && y < S.cam.y + S.view.h / 2 + m;
}

/* ------------------------------------------------------------- collisions */
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
      damageEnemy(e, b.dmg, { x: b.x, y: b.y, type: 'bullet' });
      if (b.onHit) b.onHit(e);
      if (b.aoe) {
        var around = enemiesNear(b.x, b.y, b.aoe);
        for (var a = 0; a < around.length; a++) if (around[a] !== e) damageEnemy(around[a], b.dmg * 0.6, { x: b.x, y: b.y });
        S2030.fx && S2030.fx.ring(b.x, b.y, b.color || '#ffd166', 6, 520);
        S2030.audio && S2030.audio.sfx('explode');
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
    if (s.invuln > 0) continue;
    var hr = b.r + S.headR;
    if (dist2(b.x, b.y, s.x, s.y) < hr * hr) {
      hurtSnake(b.dmg, b.x, b.y);
      if (S2030.phases && b.dmg >= 2) S2030.phases.jolt(1.2, angTo(s.x, s.y, b.x, b.y));
      S.ebullets.splice(i, 1); continue;
    }
    var hitSeg = false;
    for (j = 0; j < segs.length; j += 2) {
      var sr = b.r + S.headR * 0.72;
      if (dist2(b.x, b.y, segs[j].x, segs[j].y) < sr * sr) { hitSeg = true; break; }
    }
    if (hitSeg) { hurtSnake(b.dmg, b.x, b.y); S.ebullets.splice(i, 1); }
  }

  // ennemis contre la tête et le corps
  if (s.ghost <= 0) {
    var close = enemiesNear(s.x, s.y, 260);
    for (i = 0; i < close.length; i++) {
      e = close[i];
      var cr = e.r + S.headR;
      if (dist2(s.x, s.y, e.x, e.y) < cr * cr) {
        if (S.up.f_ramDamage && s.boosting) {
          damageEnemy(e, S.up.f_ramDamage, { x: e.x, y: e.y });
          S2030.fx && S2030.fx.burst(e.x, e.y, '#fff3b0', 10, 1.4, { glow: true });
        } else if (s.invuln <= 0) {
          hurtSnake(e.dmg, e.x, e.y);
          // un adversaire lourd fait piquer le plateau : le coup se voit
          if (S2030.phases && (e.elite || e.boss || e.dmg >= 2)) {
            S2030.phases.jolt(e.boss ? 2 : (e.elite ? 1.5 : 1), angTo(s.x, s.y, e.x, e.y));
          }
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
    addXp(6); addScore(60);
    S.ult = Math.min(S.ultMax, S.ult + 12);
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

/* ------------------------------------------------------------------ caméra */
function updateCam(dt) {
  var s = S.snake;
  var lead = s.speed * 0.55;
  var tx = clamp(s.x + Math.cos(s.ang) * lead, S.view.w / 2, K.ARENA_W - S.view.w / 2);
  var ty = clamp(s.y + Math.sin(s.ang) * lead, S.view.h / 2, K.ARENA_H - S.view.h / 2);
  if (K.ARENA_W < S.view.w) tx = K.ARENA_W / 2;
  if (K.ARENA_H < S.view.h) ty = K.ARENA_H / 2;
  var k = 1 - Math.pow(0.0015, dt);
  S.cam.x = lerp(S.cam.x, tx, k);
  S.cam.y = lerp(S.cam.y, ty, k);
}

/* -------------------------------------------------------------- vibrations */
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

/* --------------------------------------------------------- verrou d'écran */
var _wake = null;
function requestWake() {
  try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (w) { _wake = w; }).catch(function () {}); } catch (e) {}
}
function releaseWake() { try { _wake && _wake.release(); } catch (e) {} _wake = null; }
