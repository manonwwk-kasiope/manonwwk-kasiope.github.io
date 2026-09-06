/* ============================================================================
   SNAKE 2030 — 23-weapons.js
   S2030.weapons : arsenal entièrement automatique.

   Le joueur ne vise jamais, n'appuie sur aucun bouton de tir. Tout se
   déclenche seul ; le talent est dans le placement et la trajectoire.

   Huit armes, six paliers chacune (5 niveaux + un palier ultime). Chaque
   palier change le comportement ET la silhouette de l'arme.

   Code couleur strict :
     - projectiles joueur : blanc, crème, or, ambre  (JAMAIS de rouge)
     - ressources         : cyan / vert / jaune      (gérées ailleurs)
     - rouge / orange vif : réservé aux ennemis

   Conventions internes : tout identifiant de niveau fichier est préfixé
   `_wpn` / `_WPN` pour ne heurter aucun autre module.
   ========================================================================== */

/* ------------------------------------------------------------- palette */
var _WPN_WHITE = '#ffffff';
var _WPN_CREAM = '#fff3b0';
var _WPN_GOLD = '#ffd166';
var _WPN_AMBER = '#ffb347';
var _WPN_PLASMA = '#fff7d6';
var _WPN_CHROME = '#dfe9f5';

/* ============================================================================
   DÉFINITIONS
   Chaque niveau porte ses propres paramètres : le code de tir lit l'objet
   de niveau, jamais un numéro. Ajouter un palier = ajouter une ligne.
   ========================================================================== */

var _wpnDefs = {

  frontCannon: {
    name: 'CANON FRONTAL', icon: '▲', color: _WPN_CREAM, max: 6,
    tag: 'Tire droit devant, sans relâche.',
    levels: [
      { d: 'Salve simple vers l\'avant', cd: 0.34, dmg: 5, n: 1, spd: 660, r: 5, spread: 0, len: 16 },
      { d: 'Deux bouches alternées, cadence doublée', cd: 0.20, dmg: 5, n: 1, spd: 700, r: 5, spread: 0.02, twin: 1, len: 17 },
      { d: 'Tir double perforant', cd: 0.19, dmg: 6, n: 2, spd: 720, r: 5.5, spread: 0.11, twin: 1, pierce: 1, len: 20 },
      { d: 'Lances perforantes hypervéloces', cd: 0.16, dmg: 8, n: 2, spd: 860, r: 6, spread: 0.06, twin: 1, pierce: 3, len: 30 },
      { d: 'Obus explosifs à fragmentation', cd: 0.25, dmg: 11, n: 2, spd: 760, r: 7.5, spread: 0.09, twin: 1, pierce: 1, aoe: 80, len: 18, orb: 1 },
      { d: 'ULTIME — rayon continu qui transperce tout', beam: 1, hz: 15, dmg: 7, len: 520, w: 22 }
    ]
  },

  sideTurrets: {
    name: 'TOURELLES LATÉRALES', icon: '⊥', color: _WPN_GOLD, max: 6,
    tag: 'Montées sur le corps : plus long, mieux couvert.',
    levels: [
      { d: 'Tourelles de bordée, tir alterné', cd: 0.85, dmg: 5, spd: 520, spacing: 4, cap: 3, len: 14, r: 4.5 },
      { d: 'Bordée des deux côtés à la fois', cd: 0.80, dmg: 5, spd: 540, spacing: 3.5, cap: 5, both: 1, len: 14, r: 4.5 },
      { d: 'Visée assistée, plus de tourelles', cd: 0.70, dmg: 5, spd: 560, spacing: 3, cap: 7, both: 1, aim: 0.7, len: 15, r: 5 },
      { d: 'Canons jumelés, rafale de deux', cd: 0.62, dmg: 5, spd: 600, spacing: 2.6, cap: 9, both: 1, aim: 0.85, burst: 2, bgap: 0.09, len: 16, r: 5 },
      { d: 'Obus de flak à fragmentation', cd: 0.58, dmg: 6, spd: 620, spacing: 2.2, cap: 12, both: 1, aim: 1.0, burst: 2, bgap: 0.08, flak: 3, len: 16, r: 5.5 },
      { d: 'ULTIME — chaque segment tire, bordée en vague', cd: 0.42, dmg: 7, spd: 680, spacing: 1.6, cap: 18, both: 1, aim: 1.2, burst: 3, bgap: 0.07, flak: 4, rip: 0.028, len: 18, r: 5.5 }
    ]
  },

  tailLaser: {
    name: 'TRAÎNÉE DE QUEUE', icon: '∿', color: _WPN_AMBER, max: 6,
    tag: 'La queue laisse un sillage brûlant.',
    levels: [
      { d: 'Sillage énergétique court', life: 0.9, w: 9, r: 15, dmg: 3, tick: 0.16 },
      { d: 'Sillage long et large', life: 1.5, w: 12, r: 18, dmg: 4, tick: 0.14 },
      { d: 'Englue, et boucler la boucle détone', life: 1.9, w: 14, r: 20, dmg: 5, tick: 0.12, slow: 0.78, loop: 1, loopDmg: 18 },
      { d: 'Plasma incandescent, gerbes d\'étincelles', life: 2.4, w: 17, r: 23, dmg: 7, tick: 0.11, slow: 0.72, spark: 1, loop: 1, loopDmg: 30 },
      { d: 'L\'encerclement devient une déflagration', life: 2.9, w: 20, r: 25, dmg: 8, tick: 0.10, slow: 0.66, spark: 1, loop: 1, loopDmg: 52 },
      { d: 'ULTIME — mur de plasma qui avale les tirs', life: 3.5, w: 25, r: 29, dmg: 11, tick: 0.09, slow: 0.55, spark: 1, loop: 1, loopDmg: 90, block: 1 }
    ]
  },

  arcLightning: {
    name: 'ARC ÉLECTRIQUE', icon: '⚡', color: _WPN_PLASMA, max: 6,
    tag: 'La foudre saute d\'ennemi en ennemi.',
    levels: [
      { d: 'L\'éclair rebondit sur 2 cibles', cd: 1.20, dmg: 6, range: 230, chain: 2 },
      { d: 'Portée accrue, 3 cibles', cd: 1.00, dmg: 7, range: 285, chain: 3 },
      { d: '4 cibles, l\'arc paralyse', cd: 0.85, dmg: 8, range: 315, chain: 4, stun: 1 },
      { d: 'Double décharge, 5 cibles', cd: 0.75, dmg: 9, range: 335, chain: 5, stun: 1, forks: 2 },
      { d: 'La queue devient une seconde borne', cd: 0.62, dmg: 10, range: 365, chain: 6, stun: 1, forks: 2, tail: 1 },
      { d: 'ULTIME — champ Tesla permanent, ionisation', cd: 0.26, dmg: 9, range: 430, chain: 8, stun: 1, forks: 3, tail: 1, ion: 34 }
    ]
  },

  missiles: {
    name: 'MISSILES', icon: '➤', color: _WPN_GOLD, max: 6,
    tag: 'Rares, autoguidés sur le plus dangereux.',
    levels: [
      { d: 'Un missile autoguidé', cd: 2.8, n: 1, dmg: 16, aoe: 70, spd: 340 },
      { d: 'Salve de deux', cd: 2.5, n: 2, dmg: 16, aoe: 82, spd: 360 },
      { d: 'Départ en spirale, ogive lourde', cd: 2.3, n: 2, dmg: 20, aoe: 96, spd: 385, spiral: 1 },
      { d: 'Ogives à sous-munitions', cd: 2.1, n: 3, dmg: 22, aoe: 100, spd: 405, spiral: 1, split: 4 },
      { d: 'Quatre missiles, priorité aux élites', cd: 1.9, n: 4, dmg: 26, aoe: 115, spd: 435, spiral: 1, split: 4, prio: 1 },
      { d: 'ULTIME — nuée de six, verrouillage total', cd: 1.5, n: 6, dmg: 30, aoe: 132, spd: 470, spiral: 1, split: 6, prio: 1, swarm: 1 }
    ]
  },

  drones: {
    name: 'DRONES', icon: '◎', color: _WPN_CHROME, max: 6,
    tag: 'Orbitent, tirent, encaissent.',
    levels: [
      { d: 'Un drone en orbite', n: 1, R: 54, cd: 0.62, dmg: 5, spd: 620, range: 330 },
      { d: 'Deux drones opposés', n: 2, R: 60, cd: 0.62, dmg: 5, spd: 630, range: 350 },
      { d: 'Trois drones : ils bloquent les tirs', n: 3, R: 68, cd: 0.68, dmg: 5, spd: 650, range: 370, block: 1 },
      { d: 'Canons jumelés, orbite respirante', n: 3, R: 76, cd: 0.54, dmg: 5, spd: 670, range: 390, block: 1, twin: 1, breathe: 1 },
      { d: 'Quatre drones reliés par un filin', n: 4, R: 82, cd: 0.46, dmg: 6, spd: 690, range: 410, block: 1, twin: 1, breathe: 1, tether: 1, tdmg: 6 },
      { d: 'ULTIME — six drones, anneau de plasma fermé', n: 6, R: 94, cd: 0.30, dmg: 7, spd: 720, range: 450, block: 2, twin: 1, breathe: 1, tether: 1, tdmg: 11, ring: 1 }
    ]
  },

  shockwave: {
    name: 'ONDE DE CHOC', icon: '◉', color: _WPN_CREAM, max: 6,
    tag: 'Impulsion qui repousse et blesse.',
    levels: [
      { d: 'Impulsion répulsive périodique', cd: 3.4, r: 110, dmg: 7, push: 280 },
      { d: 'Plus large, efface les tirs ennemis', cd: 2.9, r: 142, dmg: 9, push: 320, clear: 1 },
      { d: 'L\'onde freine tout ce qu\'elle touche', cd: 2.5, r: 172, dmg: 11, push: 360, clear: 1, slow: 0.6 },
      { d: 'Charge télégraphiée, noyau dévastateur', cd: 2.2, r: 196, dmg: 14, push: 420, clear: 1, slow: 0.6, tell: 1, core: 2.2 },
      { d: 'Les tirs effacés deviennent de l\'énergie', cd: 2.0, r: 226, dmg: 17, push: 470, clear: 1, slow: 0.55, tell: 1, core: 2.4, harvest: 1 },
      { d: 'ULTIME — aura permanente + vague déferlante', cd: 1.7, r: 250, dmg: 20, push: 520, clear: 1, slow: 0.5, tell: 1, core: 2.6, harvest: 1, wave: 1, wdmg: 16, aura: 5 }
    ]
  },

  tailMines: {
    name: 'MINES DE SILLAGE', icon: '◈', color: _WPN_GOLD, max: 6,
    tag: 'Semées sur la trajectoire passée.',
    levels: [
      { d: 'Une mine de proximité régulière', cd: 2.2, dmg: 14, blast: 70, arm: 0.45, life: 9, trig: 30 },
      { d: 'Charges plus denses et plus larges', cd: 1.9, dmg: 17, blast: 88, arm: 0.40, life: 9, trig: 32 },
      { d: 'Les mines aimantent leurs victimes', cd: 1.7, dmg: 20, blast: 102, arm: 0.36, life: 10, trig: 34, pull: 1 },
      { d: 'Éclatent en trois sous-charges', cd: 1.5, dmg: 22, blast: 112, arm: 0.32, life: 10, trig: 36, pull: 1, split: 3 },
      { d: 'Grappe de deux, cratère incandescent', cd: 1.3, dmg: 25, blast: 126, arm: 0.30, life: 11, trig: 38, pull: 1, split: 3, n: 2, burn: 1.6 },
      { d: 'ULTIME — charges à singularité : implosion', cd: 1.1, dmg: 34, blast: 152, arm: 0.26, life: 12, trig: 42, pull: 2, split: 4, n: 2, burn: 2.0, sing: 0.45 }
    ]
  }
};

var _WPN_IDS = ['frontCannon', 'sideTurrets', 'tailLaser', 'arcLightning',
                'missiles', 'drones', 'shockwave', 'tailMines'];

/* ============================================================================
   ÉTAT LOCAL — tout est préalloué, aucune allocation par image.
   ========================================================================== */

var _wpnFrame = 0;      // compteur d'images, sert aux étalements de charge
var _wpnMark = 1;       // marqueur de passe (évite les doubles dégâts)

/* Copie de travail des listes d'ennemis : `enemiesNear` renvoie un tableau
   partagé par tout le jeu, et tuer un ennemi peut relancer une requête via
   `onDeath`. On recopie donc avant toute passe qui inflige des dégâts. */
var _WPN_BUFN = 320;
var _wpnBuf = new Array(_WPN_BUFN);
function _wpnGrab(list) {
  var n = list.length;
  if (n > _WPN_BUFN) n = _WPN_BUFN;
  for (var i = 0; i < n; i++) _wpnBuf[i] = list[i];
  return n;
}

/* objet d'options réutilisé pour damageEnemy / addBullet */
var _wpnHit = { x: 0, y: 0, type: 'bullet', chain: 0 };
var _wpnO = { life: 2, pierce: 0, aoe: 0, homing: 0, target: null, onHit: null,
              split: 0, sdmg: 0, seed: 0, w: 1 };

function _wpnOpt() {
  var o = _wpnO;
  o.life = 2; o.pierce = 0; o.aoe = 0; o.homing = 0; o.target = null;
  o.onHit = null; o.split = 0; o.sdmg = 0; o.seed = 0; o.w = 1;
  return o;
}

/* --- canon frontal --- */
var _wpnFront = { t: 0, side: 1, kick: 0, beamOn: 0, beamP: 0, beamT: 0,
                  hx: 0, hy: 0, hit: 0, sfx: 0 };

/* --- tourelles --- */
var _WPN_MOUNTN = 20;
var _wpnMounts = [];
var _wpnSide = { t: 0, count: 0, phase: 0 };
(function () {
  for (var i = 0; i < _WPN_MOUNTN; i++) {
    _wpnMounts.push({ x: 0, y: 0, ang: 0, side: 1, fl: 0, wait: 0, pend: 0, spin: 0 });
  }
})();

/* --- traînée de queue --- */
var _WPN_TAILN = 256;
var _wpnTailA = [];
var _wpnTail = { h: 0, c: 0, t: 0, off: 0, lx: 0, ly: 0, loopCd: 0, boom: 0,
                 bx: 0, by: 0, br: 0 };
(function () {
  for (var i = 0; i < _WPN_TAILN; i++) _wpnTailA.push({ x: 0, y: 0, l: 0, ml: 1 });
})();

/* --- arcs électriques --- */
var _WPN_ARCN = 8, _WPN_ARCP = 10;
var _wpnArcs = [];
var _wpnArc = { t: 0, i: 0 };
(function () {
  for (var i = 0; i < _WPN_ARCN; i++) {
    var a = { on: 0, n: 0, l: 0, ml: 0.24, seed: 0, w: 3, xs: [], ys: [] };
    for (var j = 0; j < _WPN_ARCP; j++) { a.xs.push(0); a.ys.push(0); }
    _wpnArcs.push(a);
  }
})();

/* --- missiles --- */
var _wpnMis = { t: 0, lock: 0 };

/* --- drones --- */
var _wpnDrone = { spin: 0, breathe: 0 };

/* --- onde de choc --- */
var _WPN_WAVEN = 4;
var _wpnWaves = [];
var _wpnShock = { t: 0, cd: 1, flashT: 0, auraT: 0, uid: 1 };
(function () {
  for (var i = 0; i < _WPN_WAVEN; i++) {
    _wpnWaves.push({ on: 0, x: 0, y: 0, r: 0, mr: 0, sp: 0, dmg: 0, uid: 0 });
  }
})();

/* --- mines --- */
var _WPN_MINEN = 72;
var _wpnMines = [];
var _wpnMine = { t: 0, i: 0 };
(function () {
  for (var i = 0; i < _WPN_MINEN; i++) {
    _wpnMines.push({ on: 0, x: 0, y: 0, t: 0, arm: 0, life: 0, dmg: 0, blast: 0,
                     trig: 0, pull: 0, split: 0, burn: 0, sing: 0, singT: 0,
                     mini: 0, seed: 0 });
  }
})();

/* --- zones incandescentes laissées par les mines --- */
var _WPN_BURNN = 12;
var _wpnBurns = [];
(function () {
  for (var i = 0; i < _WPN_BURNN; i++) {
    _wpnBurns.push({ on: 0, x: 0, y: 0, r: 0, l: 0, ml: 1, dmg: 0, tk: 0 });
  }
})();

/* ============================================================================
   AIDES
   ========================================================================== */

function _wpnLvl(id) {
  var v = S.up[id] | 0;
  if (v < 0) v = 0;
  var d = _wpnDefs[id];
  if (v > d.levels.length) v = d.levels.length;
  return v;
}
function _wpnL(id) {
  var v = _wpnLvl(id);
  return v > 0 ? _wpnDefs[id].levels[v - 1] : null;
}

/* modificateurs globaux optionnels posés par le module d'améliorations */
function _wpnDmg(v) {
  var d = v * (1 + 0.15 * (S.up.f_damage || 0));
  // CRITIQUE : une part des tirs frappe beaucoup plus fort
  var c = S.up.f_crit || 0;
  if (c && rnd() < 0.08 * c) d *= 2.2;
  return d;
}
function _wpnCd(v) { return v / (1 + 0.10 * (S.up.f_rate || 0)); }
function _wpnRange(v) { return v * (1 + 0.12 * (S.up.f_range || 0)); }

/* RICOCHET : à l'impact, le tir repart vers une autre cible proche. */
function _wpnRicochet(e) {
  var n = S.up.f_ricochet || 0;
  if (!n) return;
  var alt = nearestEnemy(e.x, e.y, 240);
  if (!alt || alt === e) return;
  var a = angTo(e.x, e.y, alt.x, alt.y);
  var b = addBullet({
    x: e.x, y: e.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
    r: 4, dmg: _wpnDmg(3) * 0.7, life: 0.7, color: '#fff3b0', kind: 'shard', bounced: 1
  });
  if (b) S2030.fx && S2030.fx.trail(e.x, e.y, a, '#fff3b0');
}

/* Crée un projectile joueur. `o` = _wpnOpt() rempli, ou null. */
function _wpnShot(x, y, ang, spd, dmg, r, color, kind, o) {
  // ACCÉLÉRATEUR : les projectiles vont plus vite et portent plus loin
  if (S.up.f_bulletSpeed) spd *= 1 + 0.14 * S.up.f_bulletSpeed;
  var b = addBullet({
    x: x, y: y,
    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
    r: r, dmg: dmg, life: o ? o.life : 2,
    color: color, kind: kind, ang: ang, w: o ? o.w : 1, seed: 0
  });
  if (!b) return null;
  b.seed = (_wpnFrame * 7 + S.bullets.length * 13) % 997;
  // PERFORATION : les tirs traversent des ennemis supplémentaires
  if (S.up.f_pierce) b.pierce = (b.pierce || 0) + S.up.f_pierce;
  // SOUFFLE : chaque impact devient une petite explosion
  if (S.up.f_blast) b.aoe = Math.max(b.aoe || 0, 34 + 14 * S.up.f_blast);
  // RICOCHET : le tir rebondit sur une cible voisine
  if (S.up.f_ricochet && !b.bounced) {
    b.bounced = 0;
    b.onHit = _wpnRicochet;
  }
  if (o) {
    if (o.pierce) b.pierce = (b.pierce || 0) + o.pierce;
    if (o.aoe) b.aoe = Math.max(b.aoe || 0, o.aoe);
    if (o.homing) { b.homing = 1; b.target = o.target; }
    if (o.split) { b.split = o.split; b.sdmg = o.sdmg; }
    if (o.onHit) b.onHit = o.onHit;
  }
  return b;
}

/* Dégâts sans gerbe : pour les sources à répétition (traînée, rayon, aura) */
function _wpnDot(e, dmg) { damageEnemy(e, dmg); }

/* Dégâts localisés avec impact visuel */
function _wpnBoom(e, dmg, x, y, type) {
  var h = _wpnHit;
  h.x = x; h.y = y; h.type = type || 'bullet'; h.chain = 0;
  damageEnemy(e, dmg, h);
}

/* Repousse un ennemi sans casser la logique du module ennemis :
   on déplace la position ET on pousse la vitesse. */
function _wpnPush(e, cx, cy, force, dt) {
  var dx = e.x - cx, dy = e.y - cy;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) { dx = 1; dy = 0; d = 1; }
  var k = force / d;
  e.vx += dx * k; e.vy += dy * k;
  var st = force * 0.06 * (dt || 1);
  e.x += dx / d * st; e.y += dy / d * st;
}

function _wpnSlow(e, k) { e.vx *= k; e.vy *= k; }

/* Position de la queue (dernier segment) */
function _wpnTailX() {
  var g = S.snake.segs;
  return g.length ? g[g.length - 1].x : S.snake.x;
}
function _wpnTailY() {
  var g = S.snake.segs;
  return g.length ? g[g.length - 1].y : S.snake.y;
}

/* Note de danger d'un ennemi, pour le verrouillage des missiles */
function _wpnThreat(e, x, y) {
  var v = e.maxHp * 0.6 + (e.dmg || 1) * 26 + (e.elite ? 260 : 0) + (e.boss ? 900 : 0);
  return v - Math.sqrt(dist2(x, y, e.x, e.y)) * 0.35;
}

/* ============================================================================
   1. CANON FRONTAL
   ========================================================================== */

function _wpnUpFront(dt, L) {
  var s = S.snake;
  if (_wpnFront.kick > 0) _wpnFront.kick -= dt * 6;
  if (_wpnFront.hit > 0) _wpnFront.hit -= dt;

  /* --- palier ultime : rayon continu --- */
  if (L.beam) {
    _wpnFront.beamOn = 1;
    _wpnFront.beamP = _wpnFront.beamP < 1 ? _wpnFront.beamP + dt * 3.2 : 1;
    _wpnFront.beamT -= dt;
    if (_wpnFront.beamT > 0) return;
    _wpnFront.beamT += 1 / L.hz;
    if (_wpnFront.beamT < 0) _wpnFront.beamT = 0;

    var _a = aimAng();
    var ca = Math.cos(_a), sa = Math.sin(_a);
    var len = _wpnRange(L.len), dmg = _wpnDmg(L.dmg);
    var mark = ++_wpnMark;
    var hitD = -1;
    var step = 42, i, j;
    for (var d0 = K.HEAD_R; d0 <= len; d0 += step) {
      var px = s.x + ca * d0, py = s.y + sa * d0;
      var cnt = _wpnGrab(enemiesNear(px, py, 32));
      for (i = 0; i < cnt; i++) {
        var e = _wpnBuf[i];
        if (e.dead || e._wMark === mark) continue;
        e._wMark = mark;
        _wpnDot(e, dmg);
        if (hitD < 0) { hitD = d0; _wpnFront.hx = e.x; _wpnFront.hy = e.y; _wpnFront.hit = 0.12; }
      }
    }
    /* le rayon vaporise aussi les tirs ennemis qui le croisent */
    for (j = S.ebullets.length - 1; j >= 0; j--) {
      var eb = S.ebullets[j];
      var rx = eb.x - s.x, ry = eb.y - s.y;
      var along = rx * ca + ry * sa;
      if (along < 0 || along > len) continue;
      var perp = rx * -sa + ry * ca;
      if (perp < -L.w || perp > L.w) continue;
      S2030.fx.burst(eb.x, eb.y, _WPN_CREAM, 3, 120, { life: 0.16, size: 1.4 });
      S.ebullets.splice(j, 1);
    }
    _wpnFront.sfx -= 1 / L.hz;
    if (_wpnFront.sfx <= 0) { _wpnFront.sfx = 0.22; S2030.audio.sfx('laser', { vol: 0.32, x: s.x }); }
    S2030.fx.trail(s.x + ca * 20, s.y + sa * 20, s.ang, _WPN_CREAM);
    return;
  }

  _wpnFront.beamOn = 0;
  _wpnFront.beamP = 0;

  /* --- paliers à projectiles --- */
  _wpnFront.t -= dt;
  if (_wpnFront.t > 0) return;
  _wpnFront.t += _wpnCd(L.cd);
  if (_wpnFront.t < 0) _wpnFront.t = 0;

  var _a = aimAng();
  var c = Math.cos(_a), sn = Math.sin(_a);
  var nx = -sn, ny = c;
  var lat = L.twin ? 7 : 0;
  var muzzle = K.HEAD_R * 1.4;
  var dmg2 = _wpnDmg(L.dmg);
  var o = _wpnOpt();
  o.life = 1.9;
  o.pierce = L.pierce || 0;
  o.aoe = L.aoe || 0;
  o.w = L.len / 16;

  var n = L.n | 0;
  for (var k = 0; k < n; k++) {
    var off = n === 1 ? 0 : (k - (n - 1) / 2);
    var ang = _a + off * L.spread;
    var side = L.twin ? (n === 1 ? _wpnFront.side : (k * 2 - 1)) : 0;
    var ox = s.x + c * muzzle + nx * lat * side;
    var oy = s.y + sn * muzzle + ny * lat * side;
    _wpnShot(ox, oy, ang, L.spd, dmg2, L.r, L.orb ? _WPN_GOLD : _WPN_CREAM,
             L.orb ? 'orb' : 'bolt', o);
    S2030.fx.flare(ox, oy, _WPN_CREAM, 16, { life: 0.09, a: 0.55 });
  }
  _wpnFront.side = -_wpnFront.side;
  _wpnFront.kick = 1;
  S2030.audio.sfx('shoot', { vol: L.orb ? 0.5 : 0.34, x: s.x });
}

/* ============================================================================
   2. TOURELLES LATÉRALES
   ========================================================================== */

function _wpnMountPlaces(L) {
  var segs = S.snake.segs, n = segs.length;
  var count = (n / L.spacing) | 0;
  if (count > L.cap) count = L.cap;
  if (count > _WPN_MOUNTN) count = _WPN_MOUNTN;
  if (count < 1) count = 1;
  if (count > n) count = n;
  _wpnSide.count = count;
  for (var i = 0; i < count; i++) {
    var idx = ((i + 0.7) * n / count) | 0;
    if (idx > n - 1) idx = n - 1;
    var sg = segs[idx], m = _wpnMounts[i];
    m.x = sg.x; m.y = sg.y; m.ang = sg.ang;
    m.side = (i & 1) ? 1 : -1;
    m.i = i;
  }
}

function _wpnTurretFire(m, L) {
  var dmg = _wpnDmg(L.dmg);
  /* BORDÉE ARRIÈRE : « tes tourelles couvrent aussi tes arrières ». La carte
     posait un indicateur que rien ne lisait : une tourelle sur deux tire
     désormais vers l'arrière, les autres gardent leur flanc. */
  var base = m.ang + m.side * Math.PI * 0.5;
  if (S.up.f_rearTurrets && (m.i & 1)) base = m.ang + Math.PI;
  var ang = base;
  if (L.aim) {
    var e = nearestEnemy(m.x, m.y, _wpnRange(360));
    if (e) {
      var want = angTo(m.x, m.y, e.x, e.y);
      var diff = norm(want - base);
      if (diff > L.aim) diff = L.aim; else if (diff < -L.aim) diff = -L.aim;
      ang = base + diff;
    }
  }
  var ox = m.x + Math.cos(ang) * 9, oy = m.y + Math.sin(ang) * 9;
  var o = _wpnOpt();
  o.life = 1.25;
  o.w = 1;
  if (L.flak) { o.split = L.flak; o.sdmg = dmg * 0.45; o.onHit = _wpnFlakHit; }
  _wpnShot(ox, oy, ang, L.spd, dmg, L.r, _WPN_GOLD, L.flak ? 'flak' : 'shard', o);
  m.fl = 1;
  m.spin += 0.9;
  S2030.fx.flare(ox, oy, _WPN_GOLD, 12, { life: 0.08, a: 0.5 });
}

function _wpnFlakHit(e) {
  if (!this.split) return;
  var n = this.split; this.split = 0;
  var a0 = Math.atan2(this.vy, this.vx) + Math.PI;
  var o = _wpnOpt();
  o.life = 0.5;
  for (var i = 0; i < n; i++) {
    var a = a0 + (i - (n - 1) / 2) * 0.55 + rndR(-0.12, 0.12);
    _wpnShot(this.x, this.y, a, 380, this.sdmg, 3, _WPN_CREAM, 'frag', o);
  }
  S2030.fx.ring(this.x, this.y, _WPN_GOLD, 4, 260, { w: 2, life: 0.22 });
}

function _wpnUpSide(dt, L) {
  _wpnMountPlaces(L);
  var i, m, count = _wpnSide.count;

  _wpnSide.t -= dt;
  if (_wpnSide.t <= 0) {
    _wpnSide.t += _wpnCd(L.cd);
    if (_wpnSide.t < 0) _wpnSide.t = 0;
    _wpnSide.phase ^= 1;
    var rip = L.rip || 0;
    for (i = 0; i < count; i++) {
      m = _wpnMounts[i];
      if (!L.both && ((i & 1) !== _wpnSide.phase)) continue;
      m.pend = L.burst || 1;
      m.wait = rip * i;
    }
    S2030.audio.sfx('shoot', { vol: 0.26, x: S.snake.x });
  }

  for (i = 0; i < count; i++) {
    m = _wpnMounts[i];
    if (m.fl > 0) m.fl -= dt * 7;
    if (m.pend > 0) {
      m.wait -= dt;
      if (m.wait <= 0) {
        _wpnTurretFire(m, L);
        m.pend--;
        m.wait = L.bgap || 0.08;
      }
    }
  }
}

/* ============================================================================
   3. TRAÎNÉE DE QUEUE
   ========================================================================== */

function _wpnTailPush(L) {
  if (!L) return;
  var tx = _wpnTailX(), ty = _wpnTailY();
  var dx = tx - _wpnTail.lx, dy = ty - _wpnTail.ly;
  if (dx * dx + dy * dy < 64) return;
  _wpnTail.lx = tx; _wpnTail.ly = ty;
  var nd = _wpnTailA[_wpnTail.h];
  nd.x = tx; nd.y = ty; nd.l = nd.ml = L.life;
  _wpnTail.h = (_wpnTail.h + 1) % _WPN_TAILN;
  if (_wpnTail.c < _WPN_TAILN) _wpnTail.c++;

  /* --- fermeture de boucle : on encercle, ça détone --- */
  if (!L.loop || _wpnTail.loopCd > 0) return;
  var found = -1, k;
  for (k = 22; k < _wpnTail.c; k++) {
    var oi = (_wpnTail.h - 1 - k + _WPN_TAILN * 2) % _WPN_TAILN;
    var o = _wpnTailA[oi];
    if (o.l <= 0) break;
    if (dist2(o.x, o.y, tx, ty) < 900) { found = k; break; }
  }
  if (found < 0) return;
  _wpnTail.loopCd = 1.1;

  /* centre et rayon de la boucle */
  var cx = 0, cy = 0, cnt = 0;
  for (k = 0; k <= found; k++) {
    var ii = (_wpnTail.h - 1 - k + _WPN_TAILN * 2) % _WPN_TAILN;
    cx += _wpnTailA[ii].x; cy += _wpnTailA[ii].y; cnt++;
  }
  cx /= cnt; cy /= cnt;
  var rad = 0;
  for (k = 0; k <= found; k++) {
    var jj = (_wpnTail.h - 1 - k + _WPN_TAILN * 2) % _WPN_TAILN;
    var dd = dist2(cx, cy, _wpnTailA[jj].x, _wpnTailA[jj].y);
    if (dd > rad) rad = dd;
  }
  rad = Math.sqrt(rad) + 18;

  var dmg = _wpnDmg(L.loopDmg);
  var cnt = _wpnGrab(enemiesNear(cx, cy, rad));
  for (k = 0; k < cnt; k++) _wpnBoom(_wpnBuf[k], dmg, _wpnBuf[k].x, _wpnBuf[k].y, 'shock');
  _wpnTail.boom = 0.55; _wpnTail.bx = cx; _wpnTail.by = cy; _wpnTail.br = rad;
  S2030.fx.ring(cx, cy, _WPN_AMBER, rad * 0.35, rad * 2.2, { w: 7, life: 0.5 });
  S2030.fx.ring(cx, cy, _WPN_WHITE, rad * 0.15, rad * 3.0, { w: 3, life: 0.35 });
  S2030.fx.burst(cx, cy, _WPN_GOLD, 26, 320, { life: 0.5, size: 2.4 });
  S2030.fx.shake(10);
  S2030.fx.text(cx, cy - 20, 'ENCERCLÉ', _WPN_GOLD);
  S2030.audio.sfx('explode', { vol: 0.8, x: cx });
}

function _wpnUpTail(dt, L) {
  if (!L) return;
  var i, nd;
  if (_wpnTail.loopCd > 0) _wpnTail.loopCd -= dt;
  if (_wpnTail.boom > 0) _wpnTail.boom -= dt;

  /* vieillissement */
  for (i = 0; i < _WPN_TAILN; i++) {
    nd = _wpnTailA[i];
    if (nd.l > 0) nd.l -= dt;
  }
  while (_wpnTail.c > 0) {
    var oldest = (_wpnTail.h - _wpnTail.c + _WPN_TAILN * 2) % _WPN_TAILN;
    if (_wpnTailA[oldest].l > 0) break;
    _wpnTail.c--;
  }

  _wpnTailPush(L);

  /* --- dégâts périodiques, un nœud sur trois, décalage tournant --- */
  _wpnTail.t -= dt;
  if (_wpnTail.t <= 0) {
    _wpnTail.t += L.tick;
    if (_wpnTail.t < 0) _wpnTail.t = 0;
    _wpnTail.off = (_wpnTail.off + 1) % 3;
    var mark = ++_wpnMark;
    var dmg = _wpnDmg(L.dmg);
    var r = L.r;
    for (i = _wpnTail.off; i < _wpnTail.c; i += 3) {
      var ii = (_wpnTail.h - 1 - i + _WPN_TAILN * 2) % _WPN_TAILN;
      nd = _wpnTailA[ii];
      if (nd.l <= 0) continue;
      if (!inView(nd.x, nd.y, 120)) continue;
      var cnt = _wpnGrab(enemiesNear(nd.x, nd.y, r));
      for (var j = 0; j < cnt; j++) {
        var e = _wpnBuf[j];
        if (e.dead || e._wMark === mark) continue;
        e._wMark = mark;
        _wpnDot(e, dmg);
        if (L.slow) _wpnSlow(e, L.slow);
      }
      if (L.spark && (i & 7) === 0 && chance(0.25)) {
        S2030.fx.trail(nd.x, nd.y, rndR(-3.14, 3.14), _WPN_AMBER);
      }
    }
  }

  /* --- palier ultime : le mur avale les projectiles ennemis --- */
  if (!L.block) return;
  for (i = S.ebullets.length - 1; i >= 0; i--) {
    var b = S.ebullets[i];
    if (!inView(b.x, b.y, 40)) continue;
    var hit = 0;
    for (var k = 0; k < _wpnTail.c; k += 2) {
      var ki = (_wpnTail.h - 1 - k + _WPN_TAILN * 2) % _WPN_TAILN;
      var n2 = _wpnTailA[ki];
      if (n2.l <= 0) continue;
      var rr = L.w * 0.8 + b.r;
      if (dist2(n2.x, n2.y, b.x, b.y) < rr * rr) { hit = 1; break; }
    }
    if (hit) {
      S2030.fx.burst(b.x, b.y, _WPN_AMBER, 4, 140, { life: 0.18, size: 1.5 });
      S.ebullets.splice(i, 1);
    }
  }
}

/* ============================================================================
   4. ARC ÉLECTRIQUE
   ========================================================================== */

function _wpnArcNext() {
  var a = _wpnArcs[_wpnArc.i];
  _wpnArc.i = (_wpnArc.i + 1) % _WPN_ARCN;
  return a;
}

function _wpnArcFire(ox, oy, L, mark) {
  // CHAÎNE : l'électricité saute vers plus d'ennemis, et plus loin
  if (S.up.f_chainPlus) {
    L = { chain: (L.chain || 1) + S.up.f_chainPlus,
          range: (L.range || 200) * (1 + 0.15 * S.up.f_chainPlus),
          dmg: L.dmg, cd: L.cd, w: L.w, color: L.color, arc: L.arc };
  }
  var range = _wpnRange(L.range);
  var first = null, best = -1e9, i;
  var list = enemiesNear(ox, oy, range);
  for (i = 0; i < list.length; i++) {
    var e = list[i];
    if (e._wMark === mark) continue;
    var sc = (e.elite ? 200 : 0) + e.hp - Math.sqrt(dist2(ox, oy, e.x, e.y));
    if (sc > best) { best = sc; first = e; }
  }
  if (!first) return 0;

  var arc = _wpnArcNext();
  arc.on = 1; arc.l = arc.ml = 0.26; arc.n = 0;
  arc.seed = (_wpnFrame * 37) % 1000;
  arc.w = 2.2 + L.chain * 0.16;
  arc.xs[0] = ox; arc.ys[0] = oy; arc.n = 1;

  var cur = first, cx = ox, cy = oy;
  var dmg = _wpnDmg(L.dmg);
  var links = L.chain;
  for (var c = 0; c < links && cur && arc.n < _WPN_ARCP; c++) {
    cur._wMark = mark;
    arc.xs[arc.n] = cur.x; arc.ys[arc.n] = cur.y; arc.n++;
    _wpnHit.x = cur.x; _wpnHit.y = cur.y; _wpnHit.type = 'shock'; _wpnHit.chain = c;
    damageEnemy(cur, dmg * (1 - c * 0.06), _wpnHit);
    if (L.stun) { cur.vx *= 0.35; cur.vy *= 0.35; }
    if (L.ion) {
      var cnt = _wpnGrab(enemiesNear(cur.x, cur.y, L.ion));
      for (i = 0; i < cnt; i++) {
        if (!_wpnBuf[i].dead && _wpnBuf[i]._wMark !== mark) _wpnDot(_wpnBuf[i], dmg * 0.3);
      }
    }
    cx = cur.x; cy = cur.y;
    /* saut suivant */
    var nx = null, bd = 1e9;
    var l2 = enemiesNear(cx, cy, range * 0.72);
    for (i = 0; i < l2.length; i++) {
      var e2 = l2[i];
      if (e2._wMark === mark) continue;
      var d2 = dist2(cx, cy, e2.x, e2.y);
      if (d2 < bd) { bd = d2; nx = e2; }
    }
    cur = nx;
  }
  S2030.fx.flare(arc.xs[arc.n - 1], arc.ys[arc.n - 1], _WPN_WHITE, 26, { life: 0.14, a: 0.8 });
  return 1;
}

function _wpnUpArc(dt, L) {
  var i;
  for (i = 0; i < _WPN_ARCN; i++) {
    var a = _wpnArcs[i];
    if (a.on) { a.l -= dt; if (a.l <= 0) a.on = 0; }
  }
  _wpnArc.t -= dt;
  if (_wpnArc.t > 0) return;
  _wpnArc.t += _wpnCd(L.cd);
  if (_wpnArc.t < 0) _wpnArc.t = 0;

  var s = S.snake;
  var mark = ++_wpnMark;
  var fired = 0;
  var forks = L.forks || 1;
  for (i = 0; i < forks; i++) fired += _wpnArcFire(s.x, s.y, L, mark);
  if (L.tail) fired += _wpnArcFire(_wpnTailX(), _wpnTailY(), L, mark);
  if (fired) S2030.audio.sfx('zap', { vol: 0.5, x: s.x });
}

/* ============================================================================
   5. MISSILES
   ========================================================================== */

function _wpnMissileHit(e) {
  if (!this.split) return;
  var n = this.split; this.split = 0;
  var o = _wpnOpt();
  o.life = 0.9;
  o.aoe = 44;
  o.homing = 1;
  for (var i = 0; i < n; i++) {
    var a = i * TAU / n + rndR(-0.2, 0.2);
    o.target = null;
    _wpnShot(this.x, this.y, a, 300, this.sdmg, 4.5, _WPN_GOLD, 'sub', o);
  }
  S2030.fx.ring(this.x, this.y, _WPN_GOLD, 8, 420, { w: 3, life: 0.3 });
}

function _wpnUpMissile(dt, L) {
  _wpnMis.t -= dt;
  if (_wpnMis.lock > 0) _wpnMis.lock -= dt;
  if (_wpnMis.t > 0) return;
  _wpnMis.t += _wpnCd(L.cd);
  if (_wpnMis.t < 0) _wpnMis.t = 0;

  var s = S.snake;
  var range = _wpnRange(720);
  var list = enemiesNear(s.x, s.y, range);
  if (!list.length) { _wpnMis.t = 0.35; return; }

  /* cible principale = la plus dangereuse */
  var main = null, best = -1e9, i;
  for (i = 0; i < list.length; i++) {
    var sc = L.prio ? _wpnThreat(list[i], s.x, s.y)
                    : -Math.sqrt(dist2(s.x, s.y, list[i].x, list[i].y));
    if (sc > best) { best = sc; main = list[i]; }
  }
  /* on garde deux ou trois cibles distinctes sans conserver le tableau partagé */
  var t2 = null, b2 = -1e9;
  for (i = 0; i < list.length; i++) {
    if (list[i] === main) continue;
    var sc2 = L.prio ? _wpnThreat(list[i], s.x, s.y)
                     : -Math.sqrt(dist2(s.x, s.y, list[i].x, list[i].y));
    if (sc2 > b2) { b2 = sc2; t2 = list[i]; }
  }

  var dmg = _wpnDmg(L.dmg);
  var n = L.n | 0;
  var o = _wpnOpt();
  o.life = 3.4;
  o.aoe = _wpnRange(L.aoe);
  o.homing = 1;
  if (L.split) { o.split = L.split; o.sdmg = dmg * 0.35; o.onHit = _wpnMissileHit; }

  for (i = 0; i < n; i++) {
    var side = (i & 1) ? 1 : -1;
    var lat = L.spiral ? 0.9 + (i >> 1) * 0.32 : 0.35;
    var ang = s.ang + side * lat;
    var ox = s.x - Math.cos(s.ang) * 6 - Math.sin(s.ang) * 10 * side;
    var oy = s.y - Math.sin(s.ang) * 6 + Math.cos(s.ang) * 10 * side;
    o.target = (i % 2 && t2) ? t2 : main;
    var b = _wpnShot(ox, oy, ang, L.spd * (L.swarm ? 0.85 : 1), dmg, 6, _WPN_GOLD, 'missile', o);
    if (b) b.w = 1 + (L.swarm ? 0.35 : 0);
    S2030.fx.burst(ox, oy, _WPN_CREAM, 5, 130, { life: 0.2, size: 1.6, ang: ang + Math.PI, spread: 0.6 });
  }
  _wpnMis.lock = 0.9;
  S2030.audio.sfx('missile', { vol: 0.55, x: s.x });
}

/* ============================================================================
   6. DRONES
   ========================================================================== */

function _wpnDroneSync(L) {
  var want = L.n | 0, d;
  while (S.drones.length > want) S.drones.pop();
  while (S.drones.length < want) {
    d = { x: S.snake.x, y: S.snake.y, ang: 0, ph: 0, cool: 0, fl: 0,
          shield: 0, orb: L.R, hit: 0, tw: 0 };
    S.drones.push(d);
  }
  for (var i = 0; i < S.drones.length; i++) S.drones[i].ph = i * TAU / want;
}

function _wpnUpDrones(dt, L) {
  var s = S.snake, i, j, d;
  if (S.drones.length !== (L.n | 0)) _wpnDroneSync(L);

  _wpnDrone.spin += dt * 1.15;
  _wpnDrone.breathe += dt * 2.2;
  var br = L.breathe ? 1 + Math.sin(_wpnDrone.breathe) * 0.16 : 1;
  var R = L.R * br;

  for (i = 0; i < S.drones.length; i++) {
    d = S.drones[i];
    var a = _wpnDrone.spin + d.ph;
    var tx = s.x + Math.cos(a) * R;
    var ty = s.y + Math.sin(a) * R;
    var k = 1 - Math.pow(0.0006, dt);
    d.x += (tx - d.x) * k;
    d.y += (ty - d.y) * k;
    d.ang = a + Math.PI * 0.5;
    if (d.fl > 0) d.fl -= dt * 7;
    if (d.shield > 0) d.shield -= dt * 4;
    if (d.hit > 0) d.hit -= dt * 3;

    /* tir */
    d.cool -= dt;
    if (d.cool <= 0) {
      var e = nearestEnemy(d.x, d.y, _wpnRange(L.range));
      if (e) {
        var ang = angTo(d.x, d.y, e.x, e.y);
        var o = _wpnOpt();
        o.life = 1.1;
        var dmg = _wpnDmg(L.dmg);
        if (L.twin) {
          var px = -Math.sin(ang) * 4, py = Math.cos(ang) * 4;
          _wpnShot(d.x + px, d.y + py, ang, L.spd, dmg, 3.4, _WPN_CHROME, 'dbolt', o);
          _wpnShot(d.x - px, d.y - py, ang, L.spd, dmg, 3.4, _WPN_CHROME, 'dbolt', o);
        } else {
          _wpnShot(d.x, d.y, ang, L.spd, dmg, 3.6, _WPN_CHROME, 'dbolt', o);
        }
        d.cool = _wpnCd(L.cd) * (1 + i * 0.06);
        d.fl = 1;
        d.ang = ang;
      } else {
        d.cool = 0.18;
      }
    }
  }

  /* --- interception des projectiles ennemis --- */
  if (L.block) {
    for (j = S.ebullets.length - 1; j >= 0; j--) {
      var b = S.ebullets[j];
      for (i = 0; i < S.drones.length; i++) {
        d = S.drones[i];
        if (d.shield > 0.6) continue;
        var rr = b.r + 13;
        if (dist2(b.x, b.y, d.x, d.y) > rr * rr) continue;
        S2030.fx.ring(b.x, b.y, _WPN_CHROME, 3, 260, { w: 2.4, life: 0.24 });
        S2030.fx.burst(b.x, b.y, _WPN_WHITE, 5, 150, { life: 0.2, size: 1.4 });
        S.ebullets.splice(j, 1);
        d.shield = 1;
        if (L.block < 2) d.cool += 0.15;
        S2030.audio.sfx('hit', { vol: 0.3, x: d.x });
        break;
      }
    }
  }

  /* --- filin / anneau de plasma entre drones --- */
  if (!L.tether || S.drones.length < 2) return;
  var pairs = L.ring ? S.drones.length : S.drones.length - 1;
  var mark = ++_wpnMark;
  var tdmg = _wpnDmg(L.tdmg) * dt * 6;
  for (i = 0; i < pairs; i++) {
    var a1 = S.drones[i], a2 = S.drones[(i + 1) % S.drones.length];
    for (var t = 1; t <= 3; t++) {
      var f = t / 4;
      var mx = a1.x + (a2.x - a1.x) * f, my = a1.y + (a2.y - a1.y) * f;
      var cnt = _wpnGrab(enemiesNear(mx, my, 20));
      for (j = 0; j < cnt; j++) {
        var e2 = _wpnBuf[j];
        if (e2.dead || e2._wMark === mark) continue;
        e2._wMark = mark;
        _wpnDot(e2, tdmg);
        if (chance(0.12)) S2030.fx.trail(e2.x, e2.y, rndR(-3.14, 3.14), _WPN_CHROME);
      }
    }
  }
}

/* ============================================================================
   7. ONDE DE CHOC
   ========================================================================== */

function _wpnWaveSpawn(x, y, r, sp, dmg) {
  var w = null;
  for (var i = 0; i < _WPN_WAVEN; i++) if (!_wpnWaves[i].on) { w = _wpnWaves[i]; break; }
  if (!w) w = _wpnWaves[0];
  w.on = 1; w.x = x; w.y = y; w.r = r * 0.4; w.mr = r; w.sp = sp; w.dmg = dmg;
  w.uid = _wpnShock.uid++;
}

function _wpnPulse(L) {
  var s = S.snake, i;
  var r = _wpnRange(L.r);
  var dmg = _wpnDmg(L.dmg);
  var cnt = _wpnGrab(enemiesNear(s.x, s.y, r));
  for (i = 0; i < cnt; i++) {
    var e = _wpnBuf[i];
    if (e.dead) continue;
    var d = Math.sqrt(dist2(s.x, s.y, e.x, e.y));
    var f = 1 - d / (r + 1);
    var mul = (L.core && d < r * 0.42) ? L.core : 1;
    _wpnBoom(e, dmg * (0.45 + f * 0.55) * mul, e.x, e.y, 'shock');
    _wpnPush(e, s.x, s.y, L.push * (0.4 + f * 0.6), 1);
    if (L.slow) _wpnSlow(e, L.slow);
  }
  if (L.clear) {
    for (i = S.ebullets.length - 1; i >= 0; i--) {
      var b = S.ebullets[i];
      if (dist2(b.x, b.y, s.x, s.y) > r * r) continue;
      if (L.harvest && chance(0.35)) addPickup('energy', b.x, b.y);
      S2030.fx.burst(b.x, b.y, _WPN_CREAM, 4, 150, { life: 0.2, size: 1.4 });
      S.ebullets.splice(i, 1);
    }
  }
  if (L.wave) _wpnWaveSpawn(s.x, s.y, r * 2.4, 460, _wpnDmg(L.wdmg));
  _wpnShock.flashT = 0.34;
  S2030.fx.ring(s.x, s.y, _WPN_CREAM, r * 0.25, r * 2.6, { w: 6, life: 0.42 });
  S2030.fx.ring(s.x, s.y, _WPN_WHITE, r * 0.1, r * 3.4, { w: 2.5, life: 0.3 });
  S2030.fx.flare(s.x, s.y, _WPN_CREAM, r * 0.7, { life: 0.2, a: 0.55 });
  S2030.fx.shake(4 + L.r * 0.02);
  S2030.audio.sfx('shock', { vol: 0.6, x: s.x });
}

function _wpnUpShock(dt, L) {
  var i, w;
  _wpnShock.cd = _wpnCd(L.cd);
  if (_wpnShock.flashT > 0) _wpnShock.flashT -= dt;
  _wpnShock.t -= dt;
  if (_wpnShock.t <= 0) {
    _wpnShock.t += _wpnShock.cd;
    if (_wpnShock.t < 0) _wpnShock.t = 0;
    _wpnPulse(L);
  }

  /* aura permanente du palier ultime */
  if (L.aura) {
    _wpnShock.auraT -= dt;
    if (_wpnShock.auraT <= 0) {
      _wpnShock.auraT += 0.2;
      var s = S.snake;
      var ra = _wpnRange(L.r) * 0.42;
      var cnt = _wpnGrab(enemiesNear(s.x, s.y, ra));
      var mk = ++_wpnMark;
      for (i = 0; i < cnt; i++) {
        var ea = _wpnBuf[i];
        if (ea.dead || ea._wMark === mk) continue;
        ea._wMark = mk;
        _wpnDot(ea, _wpnDmg(L.aura));
        _wpnPush(ea, s.x, s.y, 40, 1);
      }
    }
  }

  /* vagues déferlantes */
  for (i = 0; i < _WPN_WAVEN; i++) {
    w = _wpnWaves[i];
    if (!w.on) continue;
    w.r += w.sp * dt;
    if (w.r > w.mr) { w.on = 0; continue; }
    var band = 26;
    var cw = _wpnGrab(enemiesNear(w.x, w.y, w.r + band));
    for (var j = 0; j < cw; j++) {
      var e = _wpnBuf[j];
      if (e.dead || e._wWave === w.uid) continue;
      var d = Math.sqrt(dist2(w.x, w.y, e.x, e.y));
      if (d < w.r - band) continue;
      e._wWave = w.uid;
      _wpnBoom(e, w.dmg, e.x, e.y, 'shock');
      _wpnPush(e, w.x, w.y, 300, 1);
    }
  }
}

/* ============================================================================
   8. MINES DE SILLAGE
   ========================================================================== */

function _wpnMineFree() {
  for (var i = 0; i < _WPN_MINEN; i++) if (!_wpnMines[i].on) return _wpnMines[i];
  var oldest = _wpnMines[0];
  for (i = 1; i < _WPN_MINEN; i++) if (_wpnMines[i].life < oldest.life) oldest = _wpnMines[i];
  return oldest;
}

function _wpnMineDrop(x, y, L, mini) {
  var m = _wpnMineFree();
  m.on = 1; m.x = x; m.y = y; m.t = 0;
  m.arm = mini ? 0.12 : L.arm;
  m.life = mini ? 3.2 : L.life;
  m.dmg = _wpnDmg(mini ? L.dmg * 0.4 : L.dmg);
  m.blast = mini ? L.blast * 0.55 : L.blast;
  m.trig = mini ? L.trig * 0.7 : L.trig;
  m.pull = mini ? 0 : (L.pull || 0);
  m.split = mini ? 0 : (L.split || 0);
  m.burn = mini ? 0 : (L.burn || 0);
  m.sing = mini ? 0 : (L.sing || 0);
  m.singT = 0;
  m.mini = mini ? 1 : 0;
  m.seed = (_wpnFrame * 17) % 628;
  return m;
}

function _wpnBurnAdd(x, y, r, dur, dmg) {
  var b = null;
  for (var i = 0; i < _WPN_BURNN; i++) if (!_wpnBurns[i].on) { b = _wpnBurns[i]; break; }
  if (!b) b = _wpnBurns[0];
  b.on = 1; b.x = x; b.y = y; b.r = r; b.l = b.ml = dur; b.dmg = dmg; b.tk = 0;
}

function _wpnMineBoom(m, L) {
  m.on = 0;
  var i;
  var cnt = _wpnGrab(enemiesNear(m.x, m.y, m.blast));
  for (i = 0; i < cnt; i++) {
    var e = _wpnBuf[i];
    if (e.dead) continue;
    var d = Math.sqrt(dist2(m.x, m.y, e.x, e.y));
    var f = 1 - d / (m.blast + 1);
    _wpnBoom(e, m.dmg * (0.5 + f * 0.5), e.x, e.y, 'shock');
    _wpnPush(e, m.x, m.y, 260 * f, 1);
  }
  if (m.split) {
    for (i = 0; i < m.split; i++) {
      var a = i * TAU / m.split + rndR(-0.3, 0.3);
      var dd = m.blast * 0.45;
      _wpnMineDrop(m.x + Math.cos(a) * dd, m.y + Math.sin(a) * dd, L, 1);
    }
  }
  if (m.burn) _wpnBurnAdd(m.x, m.y, m.blast * 0.7, m.burn, m.dmg * 0.16);
  S2030.fx.ring(m.x, m.y, _WPN_GOLD, m.blast * 0.25, m.blast * 3.2, { w: m.mini ? 3 : 6, life: 0.4 });
  S2030.fx.burst(m.x, m.y, _WPN_CREAM, m.mini ? 8 : 20, m.mini ? 190 : 320, { life: 0.42, size: 2.2 });
  S2030.fx.flare(m.x, m.y, _WPN_WHITE, m.blast * 0.6, { life: 0.16, a: 0.7 });
  if (!m.mini) { S2030.fx.shake(6); S2030.audio.sfx('explode', { vol: 0.6, x: m.x }); }
}

function _wpnUpMines(dt, L) {
  var i, m;
  _wpnMine.t -= dt;
  if (_wpnMine.t <= 0) {
    _wpnMine.t += _wpnCd(L.cd);
    if (_wpnMine.t < 0) _wpnMine.t = 0;
    var n = L.n || 1;
    var tx = _wpnTailX(), ty = _wpnTailY();
    for (i = 0; i < n; i++) {
      var off = n === 1 ? 0 : (i - (n - 1) / 2) * 22;
      var ta = S.snake.segs.length ? S.snake.segs[S.snake.segs.length - 1].ang : S.snake.ang;
      _wpnMineDrop(tx - Math.sin(ta) * off, ty + Math.cos(ta) * off, L, 0);
    }
    S2030.audio.sfx('click', { vol: 0.22, x: tx });
  }

  var slot = _wpnFrame % 5;
  for (i = 0; i < _WPN_MINEN; i++) {
    m = _wpnMines[i];
    if (!m.on) continue;
    m.t += dt;
    m.life -= dt;
    if (m.life <= 0) { m.on = 0; continue; }

    /* implosion en cours (palier ultime) */
    if (m.singT > 0) {
      m.singT -= dt;
      var ls = enemiesNear(m.x, m.y, m.blast * 1.5);
      for (var q = 0; q < ls.length; q++) {
        var es = ls[q];
        var ax = m.x - es.x, ay = m.y - es.y;
        var ad = Math.sqrt(ax * ax + ay * ay) || 1;
        es.x += ax / ad * 260 * dt; es.y += ay / ad * 260 * dt;
        es.vx *= 0.86; es.vy *= 0.86;
      }
      if (m.singT <= 0) _wpnMineBoom(m, L);
      continue;
    }

    if (m.t < m.arm) continue;
    if ((i % 5) !== slot) continue;

    /* aimantation légère */
    if (m.pull) {
      var lp = enemiesNear(m.x, m.y, m.blast * 1.1);
      for (var p = 0; p < lp.length; p++) {
        var ep = lp[p];
        var px = m.x - ep.x, py = m.y - ep.y;
        var pd = Math.sqrt(px * px + py * py) || 1;
        var pf = 26 * m.pull * dt * 5;
        ep.x += px / pd * pf; ep.y += py / pd * pf;
      }
    }
    var trig = enemiesNear(m.x, m.y, m.trig);
    if (!trig.length) continue;
    if (m.sing) {
      m.singT = m.sing;
      S2030.fx.ring(m.x, m.y, _WPN_WHITE, m.blast * 1.4, -m.blast * 2.2, { w: 3, life: m.sing });
      S2030.audio.sfx('warp', { vol: 0.35, x: m.x });
    } else {
      _wpnMineBoom(m, L);
    }
  }

  /* cratères incandescents */
  for (i = 0; i < _WPN_BURNN; i++) {
    var b = _wpnBurns[i];
    if (!b.on) continue;
    b.l -= dt;
    if (b.l <= 0) { b.on = 0; continue; }
    b.tk -= dt;
    if (b.tk > 0) continue;
    b.tk = 0.18;
    var cnt = _wpnGrab(enemiesNear(b.x, b.y, b.r));
    var mk = ++_wpnMark;
    for (var k = 0; k < cnt; k++) {
      var eb = _wpnBuf[k];
      if (eb.dead || eb._wMark === mk) continue;
      eb._wMark = mk;
      _wpnDot(eb, b.dmg);
    }
  }
}

/* ============================================================================
   MISE À JOUR GÉNÉRALE
   ========================================================================== */

function _wpnUpdate(dt) {
  // brouilleur : tant que la tête baigne dans le champ, les armes se taisent
  if (S2030.enemies && S2030.enemies.isJammed && S2030.enemies.isJammed()) {
    var L = _wpnL('tailLaser'); if (L) _wpnUpTail(dt, L); return;   // le sillage de queue n'est pas une arme
  }
  if (!S.snake) return;
  _wpnFrame++;
  var L;

  L = _wpnL('frontCannon');  if (L) _wpnUpFront(dt, L);   else { _wpnFront.beamOn = 0; }
  L = _wpnL('sideTurrets');  if (L) _wpnUpSide(dt, L);    else _wpnSide.count = 0;
  L = _wpnL('tailLaser');    if (L) _wpnUpTail(dt, L);
  L = _wpnL('arcLightning'); if (L) _wpnUpArc(dt, L);
  L = _wpnL('missiles');     if (L) _wpnUpMissile(dt, L);
  L = _wpnL('drones');       if (L) _wpnUpDrones(dt, L);  else if (S.drones.length) S.drones.length = 0;
  L = _wpnL('shockwave');    if (L) _wpnUpShock(dt, L);
  L = _wpnL('tailMines');    if (L) _wpnUpMines(dt, L);
}

/* ============================================================================
   DESSIN DES PROJECTILES
   Un seul passage groupé par image : le cœur appelle drawBullet pour chaque
   projectile visible, on ne travaille que sur le premier appel de l'image et
   on trace un chemin par famille. Coût : quelques stroke() au lieu de mille.
   ========================================================================== */

var _WPN_KINDS = ['frag', 'shard', 'flak', 'dbolt', 'bolt', 'sub', 'orb'];
var _WPN_STYLE = {
  bolt:  { core: _WPN_WHITE, glow: _WPN_CREAM, w: 5.0, len: 22, ga: 0.30 },
  shard: { core: _WPN_WHITE, glow: _WPN_GOLD,  w: 4.4, len: 15, ga: 0.28 },
  flak:  { core: _WPN_WHITE, glow: _WPN_GOLD,  w: 5.4, len: 12, ga: 0.30 },
  frag:  { core: _WPN_WHITE, glow: _WPN_CREAM, w: 3.0, len: 8,  ga: 0.26 },
  dbolt: { core: _WPN_WHITE, glow: _WPN_CHROME,w: 3.6, len: 17, ga: 0.30 },
  sub:   { core: _WPN_WHITE, glow: _WPN_GOLD,  w: 4.6, len: 12, ga: 0.30 },
  orb:   { core: _WPN_WHITE, glow: _WPN_GOLD,  w: 7.5, len: 0,  ga: 0.34, round: 1 }
};

var _wpnDrawT = -1;

function _wpnSeg(ctx, b, len) {
  var vx = b.vx, vy = b.vy;
  var m = Math.sqrt(vx * vx + vy * vy);
  if (m < 0.001) m = 1;
  var l = len * (b.w || 1);
  var dx = vx / m * l * 0.5, dy = vy / m * l * 0.5;
  ctx.moveTo(b.x - dx, b.y - dy);
  ctx.lineTo(b.x + dx, b.y + dy);
}

function _wpnDrawAll(ctx) {
  var n = S.bullets.length;
  if (!n) return;
  var i, b, k, st, any;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (k = 0; k < _WPN_KINDS.length; k++) {
    var kind = _WPN_KINDS[k];
    st = _WPN_STYLE[kind];
    any = 0;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      b = S.bullets[i];
      if (b.kind !== kind) continue;
      if (!inView(b.x, b.y, 44)) continue;
      any = 1;
      if (st.round) {
        var rr = b.r * (0.9 + Math.sin(S.t * 0.02 + b.seed) * 0.12);
        ctx.moveTo(b.x + rr, b.y);
        ctx.arc(b.x, b.y, rr, 0, TAU);
      } else {
        _wpnSeg(ctx, b, st.len);
      }
    }
    if (!any) continue;
    ctx.strokeStyle = st.glow;
    ctx.globalAlpha = st.ga; ctx.lineWidth = st.w * 2.5; ctx.stroke();
    ctx.globalAlpha = st.ga * 2 > 1 ? 1 : st.ga * 2; ctx.lineWidth = st.w * 1.15; ctx.stroke();
    ctx.strokeStyle = st.core;
    ctx.globalAlpha = 1; ctx.lineWidth = st.w * 0.42; ctx.stroke();
  }

  /* missiles : peu nombreux, dessinés un par un */
  ctx.globalAlpha = 1;
  for (i = 0; i < n; i++) {
    b = S.bullets[i];
    if (b.kind !== 'missile') continue;
    if (!inView(b.x, b.y, 60)) continue;
    var a = Math.atan2(b.vy, b.vx);
    var ca = Math.cos(a), sa = Math.sin(a);
    var w = 4.4 * (b.w || 1);
    var fl = 12 + Math.sin(S.t * 0.05 + b.seed) * 5;
    /* flamme */
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = _WPN_GOLD; ctx.lineWidth = w * 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x - ca * 6, b.y - sa * 6);
    ctx.lineTo(b.x - ca * (6 + fl), b.y - sa * (6 + fl));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = _WPN_WHITE; ctx.lineWidth = w * 0.55;
    ctx.beginPath();
    ctx.moveTo(b.x - ca * 6, b.y - sa * 6);
    ctx.lineTo(b.x - ca * (6 + fl * 0.55), b.y - sa * (6 + fl * 0.55));
    ctx.stroke();
    /* corps */
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = _WPN_CREAM; ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(b.x - ca * 5, b.y - sa * 5);
    ctx.lineTo(b.x + ca * 8, b.y + sa * 8);
    ctx.stroke();
    /* ailerons */
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(b.x - ca * 4 - sa * 5, b.y - sa * 4 + ca * 5);
    ctx.lineTo(b.x - ca * 7 + sa * 5, b.y - sa * 7 - ca * 5);
    ctx.stroke();
    /* verrouillage sur la cible */
    if (b.target && !b.target.dead && inView(b.target.x, b.target.y, 40)) {
      var tr = b.target.r + 8 + Math.sin(S.t * 0.012) * 3;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = _WPN_GOLD; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (var q = 0; q < 4; q++) {
        var qa = q * TAU / 4 + S.t * 0.002;
        ctx.moveTo(b.target.x + Math.cos(qa) * tr, b.target.y + Math.sin(qa) * tr);
        ctx.lineTo(b.target.x + Math.cos(qa + 0.5) * tr, b.target.y + Math.sin(qa + 0.5) * tr);
      }
      ctx.stroke();
    }
  }

  /* filet de sécurité : familles inconnues (autre module) */
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  any = 0;
  for (i = 0; i < n; i++) {
    b = S.bullets[i];
    if (_WPN_STYLE[b.kind] || b.kind === 'missile') continue;
    if (!inView(b.x, b.y, 40)) continue;
    any = 1;
    ctx.moveTo(b.x + b.r, b.y);
    ctx.arc(b.x, b.y, b.r, 0, TAU);
  }
  if (any) { ctx.fillStyle = _WPN_CREAM; ctx.fill(); }

  ctx.restore();
}

function _wpnDrawBullet(ctx, b) {
  /* un seul passage groupé par image */
  if (_wpnDrawT === S.t) return;
  _wpnDrawT = S.t;
  _wpnDrawAll(ctx);
}

/* ============================================================================
   DESSIN DES MODULES VISIBLES SUR LE CORPS
   ========================================================================== */

/* bruit déterministe, sans consommer le générateur du jeu */
function _wpnNoise(a) {
  var v = Math.sin(a * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function _wpnDrawTrail(ctx, L) {
  var c = _wpnTail.c;
  if (!c) return;
  var i, nd, seg, drawn;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* trois tranches d'âge : donne le dégradé sans coût */
  for (seg = 0; seg < 3; seg++) {
    var i0 = ((c * seg / 3) | 0), i1 = ((c * (seg + 1) / 3) | 0);
    if (i1 <= i0) continue;
    drawn = 0;
    ctx.beginPath();
    for (i = i0; i < i1; i++) {
      var ii = (_wpnTail.h - 1 - i + _WPN_TAILN * 2) % _WPN_TAILN;
      nd = _wpnTailA[ii];
      if (nd.l <= 0) { drawn = 0; continue; }
      if (!inView(nd.x, nd.y, 90)) { drawn = 0; continue; }
      if (!drawn) { ctx.moveTo(nd.x, nd.y); drawn = 1; }
      else ctx.lineTo(nd.x, nd.y);
    }
    var a = 1 - seg * 0.32;
    var w = L.w * (1 - seg * 0.22);
    ctx.strokeStyle = _WPN_AMBER;
    ctx.globalAlpha = 0.20 * a; ctx.lineWidth = w * 1.9; ctx.stroke();
    ctx.globalAlpha = 0.38 * a; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = L.block ? _WPN_WHITE : _WPN_CREAM;
    ctx.globalAlpha = 0.75 * a; ctx.lineWidth = w * 0.34; ctx.stroke();
  }

  /* halo de détonation de boucle */
  if (_wpnTail.boom > 0) {
    var f = _wpnTail.boom / 0.55;
    ctx.globalAlpha = 0.22 * f;
    ctx.strokeStyle = _WPN_GOLD;
    ctx.lineWidth = 4 + 10 * (1 - f);
    ctx.beginPath();
    ctx.arc(_wpnTail.bx, _wpnTail.by, _wpnTail.br * (0.7 + 0.5 * (1 - f)), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function _wpnDrawTurrets(ctx, L) {
  var n = _wpnSide.count;
  if (!n) return;
  var i, m, a, ca, sa, rec, bx, by, any = 0, fl = 0;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1;

  /* socles : un seul chemin pour tout le corps */
  ctx.beginPath();
  for (i = 0; i < n; i++) {
    m = _wpnMounts[i];
    if (!inView(m.x, m.y, 40)) continue;
    any = 1;
    if (m.fl > 0) fl = 1;
    ctx.moveTo(m.x + 6.2, m.y);
    ctx.arc(m.x, m.y, 6.2, 0, TAU);
  }
  if (!any) { ctx.restore(); return; }
  ctx.fillStyle = '#0b1626'; ctx.fill();
  ctx.strokeStyle = _WPN_GOLD; ctx.lineWidth = 1.6; ctx.stroke();

  /* canons */
  ctx.beginPath();
  for (i = 0; i < n; i++) {
    m = _wpnMounts[i];
    if (!inView(m.x, m.y, 40)) continue;
    a = m.ang + m.side * Math.PI * 0.5;
    ca = Math.cos(a); sa = Math.sin(a);
    rec = m.fl > 0 ? m.fl * 3 : 0;
    bx = m.x - ca * rec; by = m.y - sa * rec;
    if (L.burst) {
      var px = -sa * 2.1, py = ca * 2.1;
      ctx.moveTo(bx + px, by + py); ctx.lineTo(bx + ca * 11 + px, by + sa * 11 + py);
      ctx.moveTo(bx - px, by - py); ctx.lineTo(bx + ca * 11 - px, by + sa * 11 - py);
    } else {
      ctx.moveTo(bx, by); ctx.lineTo(bx + ca * 12, by + sa * 12);
    }
  }
  ctx.strokeStyle = _WPN_CHROME; ctx.lineWidth = L.burst ? 2.6 : 3.2; ctx.stroke();

  /* éclairs de bouche */
  if (fl) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      m = _wpnMounts[i];
      if (m.fl <= 0 || !inView(m.x, m.y, 40)) continue;
      a = m.ang + m.side * Math.PI * 0.5;
      ca = Math.cos(a); sa = Math.sin(a);
      bx = m.x - ca * m.fl * 3; by = m.y - sa * m.fl * 3;
      ctx.moveTo(bx + ca * 10, by + sa * 10);
      ctx.lineTo(bx + ca * (14 + m.fl * 9), by + sa * (14 + m.fl * 9));
    }
    ctx.strokeStyle = _WPN_CREAM; ctx.lineWidth = 5; ctx.stroke();
  }
  ctx.restore();
}

function _wpnDrawDrones(ctx, L) {
  var n = S.drones.length;
  if (!n) return;
  var i, d;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* filin / anneau */
  if (L.tether && n > 1) {
    ctx.globalCompositeOperation = 'lighter';
    var pairs = L.ring ? n : n - 1;
    ctx.beginPath();
    for (i = 0; i < pairs; i++) {
      var a1 = S.drones[i], a2 = S.drones[(i + 1) % n];
      ctx.moveTo(a1.x, a1.y);
      var mx = (a1.x + a2.x) * 0.5, my = (a1.y + a2.y) * 0.5;
      var bul = Math.sin(S.t * 0.004 + i) * 5;
      ctx.quadraticCurveTo(mx - (a2.y - a1.y) * 0.06 + bul, my + (a2.x - a1.x) * 0.06,
                           a2.x, a2.y);
    }
    ctx.strokeStyle = _WPN_CHROME;
    ctx.globalAlpha = 0.22; ctx.lineWidth = L.ring ? 7 : 5; ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /* boucliers : rares, tracés individuellement */
  for (i = 0; i < n; i++) {
    d = S.drones[i];
    if (d.shield <= 0 || !inView(d.x, d.y, 50)) continue;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * Math.min(1, d.shield);
    ctx.strokeStyle = _WPN_CHROME; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(d.x, d.y, 15 + (1 - Math.min(1, d.shield)) * 6, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  /* coques hexagonales : un seul chemin */
  var vis = 0, fl = 0;
  ctx.beginPath();
  for (i = 0; i < n; i++) {
    d = S.drones[i];
    if (!inView(d.x, d.y, 50)) continue;
    vis = 1;
    if (d.fl > 0) fl = 1;
    for (var k = 0; k < 6; k++) {
      var a = d.ang + k * TAU / 6;
      var px = d.x + Math.cos(a) * 8.2, py = d.y + Math.sin(a) * 8.2;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  if (!vis) { ctx.restore(); return; }
  ctx.fillStyle = '#0d1a2b'; ctx.fill();
  ctx.strokeStyle = _WPN_CHROME; ctx.lineWidth = 1.8; ctx.stroke();

  /* yeux */
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.9;
  for (var pass = 0; pass < 2; pass++) {
    var got = 0;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      d = S.drones[i];
      if (!inView(d.x, d.y, 50)) continue;
      if ((d.fl > 0 ? 1 : 0) !== pass) continue;
      got = 1;
      var cx = d.x + Math.cos(d.ang) * 3, cy = d.y + Math.sin(d.ang) * 3;
      var er = pass ? 3.6 : 2.4;
      ctx.moveTo(cx + er, cy);
      ctx.arc(cx, cy, er, 0, TAU);
    }
    if (!got) continue;
    ctx.fillStyle = pass ? _WPN_WHITE : _WPN_GOLD;
    ctx.fill();
  }

  /* éclairs de bouche */
  if (fl) {
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      d = S.drones[i];
      if (d.fl <= 0 || !inView(d.x, d.y, 50)) continue;
      var dc = Math.cos(d.ang), ds = Math.sin(d.ang);
      ctx.moveTo(d.x + dc * 8, d.y + ds * 8);
      ctx.lineTo(d.x + dc * (12 + d.fl * 8), d.y + ds * (12 + d.fl * 8));
    }
    ctx.strokeStyle = _WPN_WHITE; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
}

function _wpnDrawArcs(ctx) {
  var i, a, k;
  var live = 0;
  for (i = 0; i < _WPN_ARCN; i++) if (_wpnArcs[i].on) { live = 1; break; }
  if (!live) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (var pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    var drew = 0;
    for (i = 0; i < _WPN_ARCN; i++) {
      a = _wpnArcs[i];
      if (!a.on || a.n < 2) continue;
      drew = 1;
      ctx.moveTo(a.xs[0], a.ys[0]);
      for (k = 1; k < a.n; k++) {
        var x0 = a.xs[k - 1], y0 = a.ys[k - 1], x1 = a.xs[k], y1 = a.ys[k];
        var dx = x1 - x0, dy = y1 - y0;
        var dl = Math.sqrt(dx * dx + dy * dy);
        if (dl < 0.001) dl = 1;
        var nx = -dy / dl, ny = dx / dl;
        /* deux brisures par saut, gigue déterministe animée */
        for (var q = 1; q <= 3; q++) {
          var f = q / 4;
          var jr = _wpnNoise(a.seed + k * 7.7 + q * 3.1) - 0.5;
          var sh = Math.sin(S.t * 0.03 + k * 2.1 + q + a.seed) * 0.5;
          var amp = (jr + sh) * 9;
          ctx.lineTo(x0 + dx * f + nx * amp, y0 + dy * f + ny * amp);
        }
        ctx.lineTo(x1, y1);
      }
    }
    if (!drew) break;
    if (pass === 0) {
      ctx.strokeStyle = _WPN_GOLD; ctx.globalAlpha = 0.28; ctx.lineWidth = 9;
    } else {
      ctx.strokeStyle = _WPN_WHITE; ctx.globalAlpha = 0.95; ctx.lineWidth = 2.2;
    }
    ctx.stroke();
  }

  /* nœuds lumineux */
  ctx.beginPath();
  for (i = 0; i < _WPN_ARCN; i++) {
    a = _wpnArcs[i];
    if (!a.on) continue;
    for (k = 1; k < a.n; k++) {
      ctx.moveTo(a.xs[k] + 5, a.ys[k]);
      ctx.arc(a.xs[k], a.ys[k], 5, 0, TAU);
    }
  }
  ctx.fillStyle = _WPN_PLASMA; ctx.globalAlpha = 0.55; ctx.fill();
  ctx.restore();
}

function _wpnDrawBeam(ctx, L) {
  var s = S.snake;
  var p = _wpnFront.beamP;
  if (p <= 0) return;
  var len = _wpnRange(L.len) * (0.5 + p * 0.5);
  var _a = aimAng();
  var ca = Math.cos(_a), sa = Math.sin(_a);
  var x0 = s.x + ca * K.HEAD_R, y0 = s.y + sa * K.HEAD_R;
  var x1 = s.x + ca * len, y1 = s.y + sa * len;
  var puls = 1 + Math.sin(S.t * 0.045) * 0.16;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.strokeStyle = _WPN_GOLD;
  ctx.globalAlpha = 0.22 * p;
  ctx.lineWidth = L.w * 2.1 * puls;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = _WPN_CREAM;
  ctx.globalAlpha = 0.55 * p;
  ctx.lineWidth = L.w * puls;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = _WPN_WHITE;
  ctx.globalAlpha = 1;
  ctx.lineWidth = L.w * 0.3 * puls;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

  /* stries de charge qui remontent le rayon */
  ctx.globalAlpha = 0.5 * p;
  ctx.strokeStyle = _WPN_WHITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < 5; i++) {
    var f = ((S.t * 0.0016 + i * 0.2) % 1);
    var px = x0 + (x1 - x0) * f, py = y0 + (y1 - y0) * f;
    var w = L.w * (1 - f) * 0.8;
    ctx.moveTo(px - sa * w, py + ca * w);
    ctx.lineTo(px + sa * w, py - ca * w);
  }
  ctx.stroke();

  /* impact */
  if (_wpnFront.hit > 0) {
    ctx.globalAlpha = Math.min(1, _wpnFront.hit * 8);
    ctx.fillStyle = _WPN_WHITE;
    ctx.beginPath();
    ctx.arc(_wpnFront.hx, _wpnFront.hy, 10 + Math.sin(S.t * 0.06) * 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function _wpnDrawShock(ctx, L) {
  var s = S.snake;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  /* aura permanente */
  if (L.aura) {
    var ra = _wpnRange(L.r) * 0.42;
    ctx.globalAlpha = 0.10 + Math.sin(S.t * 0.006) * 0.03;
    ctx.strokeStyle = _WPN_CREAM;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(s.x, s.y, ra, 0, TAU); ctx.stroke();
  }

  /* télégraphe : anneau qui se resserre juste avant l'impulsion */
  if (L.tell) {
    var left = _wpnShock.t;
    if (left < 0.6) {
      var f = left / 0.6;
      ctx.globalAlpha = 0.16 + (1 - f) * 0.3;
      ctx.strokeStyle = _WPN_CREAM;
      ctx.lineWidth = 2 + (1 - f) * 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, _wpnRange(L.r) * (0.25 + f * 0.95), 0, TAU);
      ctx.stroke();
    }
  }

  /* halo de l'impulsion */
  if (_wpnShock.flashT > 0) {
    var g = _wpnShock.flashT / 0.34;
    ctx.globalAlpha = 0.30 * g;
    ctx.strokeStyle = _WPN_WHITE;
    ctx.lineWidth = 3 + 8 * g;
    ctx.beginPath(); ctx.arc(s.x, s.y, _wpnRange(L.r) * (1 - g * 0.5), 0, TAU); ctx.stroke();
  }

  /* vagues déferlantes */
  for (var i = 0; i < _WPN_WAVEN; i++) {
    var w = _wpnWaves[i];
    if (!w.on) continue;
    var t = 1 - w.r / w.mr;
    ctx.globalAlpha = 0.42 * t;
    ctx.strokeStyle = _WPN_CREAM;
    ctx.lineWidth = 7 * t + 2;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.8 * t;
    ctx.strokeStyle = _WPN_WHITE;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function _wpnDrawMines(ctx) {
  var i, m, any = 0;
  for (i = 0; i < _WPN_MINEN; i++) if (_wpnMines[i].on) { any = 1; break; }
  var anyB = 0;
  for (i = 0; i < _WPN_BURNN; i++) if (_wpnBurns[i].on) { anyB = 1; break; }
  if (!any && !anyB) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  /* cratères incandescents */
  for (i = 0; i < _WPN_BURNN; i++) {
    var b = _wpnBurns[i];
    if (!b.on || !inView(b.x, b.y, b.r + 30)) continue;
    var f = b.l / b.ml;
    ctx.globalAlpha = 0.18 * f;
    ctx.fillStyle = _WPN_AMBER;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.8 + 0.2 * f), 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.4 * f;
    ctx.strokeStyle = _WPN_GOLD; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.8 + 0.2 * f), 0, TAU); ctx.stroke();
  }

  /* mines : deux groupes (amorcée / en cours d'amorçage), chemins fusionnés */
  for (var grp = 0; grp < 2; grp++) {
    var got = 0;
    /* halos */
    ctx.beginPath();
    for (i = 0; i < _WPN_MINEN; i++) {
      m = _wpnMines[i];
      if (!m.on || !inView(m.x, m.y, 60)) continue;
      if ((m.t >= m.arm ? 1 : 0) !== grp) continue;
      got = 1;
      var pl = 0.5 + 0.5 * Math.sin(S.t * (grp ? 0.012 : 0.004) + m.seed);
      var hr = (m.mini ? 4.5 : 7) * 3.4 * (0.82 + pl * 0.18);
      ctx.moveTo(m.x + hr, m.y);
      ctx.arc(m.x, m.y, hr, 0, TAU);
    }
    if (!got) continue;
    ctx.globalAlpha = grp ? 0.26 : 0.11;
    ctx.fillStyle = _WPN_GOLD;
    ctx.fill();

    /* coques : losanges qui tournent */
    ctx.beginPath();
    for (i = 0; i < _WPN_MINEN; i++) {
      m = _wpnMines[i];
      if (!m.on || !inView(m.x, m.y, 60)) continue;
      if ((m.t >= m.arm ? 1 : 0) !== grp) continue;
      var r = m.mini ? 4.5 : 7;
      var a0 = S.t * 0.0015 + m.seed;
      for (var k = 0; k < 4; k++) {
        var a = a0 + k * TAU / 4;
        var px = m.x + Math.cos(a) * r, py = m.y + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = grp ? _WPN_WHITE : _WPN_GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();

    /* portée d'amorçage, discrète */
    if (!grp) continue;
    ctx.beginPath();
    for (i = 0; i < _WPN_MINEN; i++) {
      m = _wpnMines[i];
      if (!m.on || m.t < m.arm || !inView(m.x, m.y, 60)) continue;
      var pl2 = 0.5 + 0.5 * Math.sin(S.t * 0.012 + m.seed);
      var tr = m.trig * (0.85 + pl2 * 0.15);
      ctx.moveTo(m.x + tr, m.y);
      ctx.arc(m.x, m.y, tr, 0, TAU);
    }
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = _WPN_CREAM;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  /* implosions : rares, tracées individuellement */
  for (i = 0; i < _WPN_MINEN; i++) {
    m = _wpnMines[i];
    if (!m.on || m.singT <= 0 || !inView(m.x, m.y, 90)) continue;
    var sf = m.singT / (m.sing || 1);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = _WPN_WHITE;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.blast * 1.4 * sf, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = _WPN_WHITE;
    ctx.beginPath(); ctx.arc(m.x, m.y, 7 * (1 + (1 - sf) * 2), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function _wpnDrawMounts(ctx) {
  if (!S.snake) return;
  var L;
  L = _wpnL('tailLaser');    if (L) _wpnDrawTrail(ctx, L);
  L = _wpnL('tailMines');    if (L || _wpnMines[0].on) _wpnDrawMines(ctx);
  L = _wpnL('shockwave');    if (L) _wpnDrawShock(ctx, L);
  L = _wpnL('sideTurrets');  if (L) _wpnDrawTurrets(ctx, L);
  L = _wpnL('drones');       if (L) _wpnDrawDrones(ctx, L);
  _wpnDrawArcs(ctx);
  L = _wpnL('frontCannon');  if (L && L.beam && _wpnFront.beamOn) _wpnDrawBeam(ctx, L);
}

/* ============================================================================
   RÉINITIALISATION
   ========================================================================== */

function _wpnReset() {
  var i;
  _wpnFrame = 0; _wpnMark = 1; _wpnDrawT = -1;

  _wpnFront.t = 0; _wpnFront.side = 1; _wpnFront.kick = 0;
  _wpnFront.beamOn = 0; _wpnFront.beamP = 0; _wpnFront.beamT = 0;
  _wpnFront.hit = 0; _wpnFront.sfx = 0;

  _wpnSide.t = 0; _wpnSide.count = 0; _wpnSide.phase = 0;
  for (i = 0; i < _WPN_MOUNTN; i++) {
    var m = _wpnMounts[i];
    m.fl = 0; m.wait = 0; m.pend = 0; m.spin = 0;
  }

  for (i = 0; i < _WPN_TAILN; i++) { _wpnTailA[i].l = 0; }
  _wpnTail.h = 0; _wpnTail.c = 0; _wpnTail.t = 0; _wpnTail.off = 0;
  _wpnTail.loopCd = 0; _wpnTail.boom = 0;
  _wpnTail.lx = S.snake ? S.snake.x : 0;
  _wpnTail.ly = S.snake ? S.snake.y : 0;

  for (i = 0; i < _WPN_ARCN; i++) { _wpnArcs[i].on = 0; _wpnArcs[i].n = 0; }
  _wpnArc.t = 0; _wpnArc.i = 0;

  _wpnMis.t = 0.6; _wpnMis.lock = 0;

  _wpnDrone.spin = 0; _wpnDrone.breathe = 0;
  if (S.drones) S.drones.length = 0;

  for (i = 0; i < _WPN_WAVEN; i++) _wpnWaves[i].on = 0;
  _wpnShock.t = 1.2; _wpnShock.flashT = 0; _wpnShock.auraT = 0; _wpnShock.uid = 1;

  for (i = 0; i < _WPN_MINEN; i++) { _wpnMines[i].on = 0; _wpnMines[i].singT = 0; }
  for (i = 0; i < _WPN_BURNN; i++) _wpnBurns[i].on = 0;
  _wpnMine.t = 0.8;
}

/* ============================================================================
   API DU MODULE
   ========================================================================== */

S2030.weapons = {
  defs: _wpnDefs,
  update: _wpnUpdate,
  drawBullet: _wpnDrawBullet,
  drawMounts: _wpnDrawMounts,
  reset: _wpnReset,

  /* extras destinés au module d'améliorations et à l'interface */
  ids: _WPN_IDS,
  maxLevel: function (id) { return _wpnDefs[id] ? _wpnDefs[id].levels.length : 0; },
  level: _wpnLvl,
  /* texte du PROCHAIN palier : idéal pour la description d'une carte */
  nextDesc: function (id) {
    var d = _wpnDefs[id];
    if (!d) return '';
    var l = _wpnLvl(id);
    if (l >= d.levels.length) return '';
    return d.levels[l].d;
  },
  levelDesc: function (id, lvl) {
    var d = _wpnDefs[id];
    if (!d || lvl < 1 || lvl > d.levels.length) return '';
    return d.levels[lvl - 1].d;
  },
  isUltimate: function (id) {
    var d = _wpnDefs[id];
    return !!d && _wpnLvl(id) >= d.levels.length;
  }
};
