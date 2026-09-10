/* ======
   SNAKE 2030 — 24-upgrades.js
   S2030.upgrades : les cartes d'amélioration.

   API du contrat : { pool, roll(n), apply(id) }

   Une carte = { id, name, desc, icon, rarity, max, weight, req(), apply() }
   Champs additionnels, ignorables par l'interface :
     axis  : 'elec'|'laser'|'explo'|'speed'|'fort'|'ghost'|'core'
     tint  : couleur néon de l'axe (pour teinter la carte)
     wt(c) : poids dynamique optionnel (sinon `weight`)
     dyn(c): recalcule `desc` au moment du tirage (paliers d'armes)

   COMPTEURS
   `S.up[<id de carte>]` = nombre de fois que la carte a été prise.
   Pour les huit cartes d'ARME, l'id de carte EST l'id d'arme : `S.up.frontCannon`
   vaut donc directement le niveau de l'arme, exactement ce que lit weapons.js.

   Conventions internes : tout identifiant de niveau fichier est préfixé
   `_up` / `_UP` pour ne heurter aucun autre module.

   ======
   DRAPEAUX — RÉFÉRENCE COMPLÈTE
   ======
   Tous les drapeaux vivent dans `S.up` et sont préfixés `f_`. Ils valent 0
   quand la carte n'a pas été prise : lire systématiquement `(S.up.f_x || 0)`.
   Les cinq premiers existaient déjà, les autres sont posés par ce module.

   --- déjà consommés par le moteur ------
   f_damage      (0..5) weapons : dégâts × (1 + 0.15 × n)
   f_rate        (0..5) weapons : cadence ÷ (1 + 0.10 × n)
   f_range       (0..4) weapons : portée × (1 + 0.12 × n)
   f_ramDamage   (dégâts) coeur : dégâts d'éperonnage pendant le boost
   f_magnet      (0..3)  coeur  : rayon d'aimantation +90 par point

   --- électrique ------
   f_conduct     (0..3) le corps est conducteur : un arc peut naître de
                        n'importe quel segment, et n bornes de départ de plus.
   f_chainPlus   (0..3) +1 rebond de chaîne et +8 % de portée d'arc par point.
   f_ionMark     (0..3) une cible touchée par un arc est ionisée 3 s ;
                        elle subit +12 % de dégâts par point, toutes sources.
                        Marqueur suggéré sur l'ennemi : e.ionT (ms restantes).
   f_shockExplode(0..2) un ennemi tué par un dégât de type 'shock' explose :
                        rayon 60 + 40 n, dégâts 10 + 14 n, type 'shock'.
   f_staticField (0..2) aura électrique permanente autour de la tête :
                        rayon 70 + 45 n, 6 + 5 n dégâts/s, type 'shock'.
   f_deathArc    (0|1)  toute mort relance un arc de 3 rebonds depuis le corps.

   --- laser ------
   f_pierce      (0..3) +1 perforation sur tout projectile joueur créé.
   f_ricochet    (0..2) un projectile à bout de perforation ricoche vers
                        l'ennemi le plus proche dans 260 u, n fois.
   f_bulletSpeed (0..3) +15 % de vitesse de projectile joueur par point.
   f_rearTurrets (0|1)  les tourelles latérales couvrent aussi l'arrière.
   f_crit        (0..3) 9 % × n de chance qu'un coup inflige le triple.
   f_phaseShot   (0|1)  les tirs joueur ignorent le mod 'armored' et tout
                        bouclier ennemi.

   --- explosif ------
   f_blast       (0..4) +22 % de rayon sur TOUTE explosion (aoe, mines,
                        missiles, onde de choc, blast() de enemies).
   f_blastDmg    (0..4) +20 % de dégâts sur toute explosion.
   f_chainExplode(0..2) une explosion peut en déclencher d'autres : chaque
                        ennemi tué par explosion relance un blast à 60 %,
                        n propagations en cascade au maximum.
   f_deathBomb   (0..3) un ennemi tué par explosion lâche une sous-charge :
                        rayon 55, dégâts 8 + 6 n.
   f_burnPool    (0..2) toute explosion laisse une flaque incandescente 2 s :
                        rayon 0.7 × blast, 6 + 4 n dégâts/s.
   f_implode     (0|1)  les explosions aspirent (force 420) pendant 0.18 s
                        avant de détoner.

   --- vitesse ------
   f_speed       (0..5) compteur informatif — l'effet est DÉJÀ appliqué sur
                        S.snake.baseSpeed par la carte.
   f_boostDrain  (0..3) consommation de boost × (1 − 0.18 n) : le coeur doit
                        multiplier K.BOOST_DRAIN par ce facteur.
   f_momentum    (0..2) dégâts × (1 + 0.25 n × f) où f = (vitesse − base) /
                        (base × (BOOST_MUL − 1)), borné 0..1.
   f_sonicBoom   (0|1)  pendant le boost : onde permanente de rayon 90 devant
                        la tête, 14 dégâts/s, efface les tirs ennemis touchés.
   f_trailWide   (0..2) +30 % de largeur et de durée du sillage de queue.

   --- forteresse ------
   f_shield      (0..3) nombre maximum de charges de bouclier.
   f_shieldCd    (ms)   délai de recharge d'une charge de bouclier.
   S.snake.shield(int)  charges disponibles — posé plein par la carte,
                        entretenu par le coeur : hurtSnake doit consommer une
                        charge AVANT de retirer des segments (et déclencher
                        l'invulnérabilité normale).
   f_regen       (0..3) régénère 1 segment toutes les (15 − 3.5 n) secondes.
   f_thorns      (dégâts) tout ennemi qui touche la tête ou le corps encaisse
                        cette valeur (type 'shock'), avec ou sans invulnérabilité.
   f_pickHeal    (0..2) chaque ressource ramassée a 18 % × n de rendre
                        1 segment, en plus du comportement normal.
   f_iframes     (0..3) +220 ms d'invulnérabilité après un coup.
   f_capDamage   (0|1)  aucun coup ne peut retirer plus d'un segment.

   --- spectral ------
   f_ghostTime   (0..3) +900 ms de traversée sur le spécial (useSpecial).
   f_ghostOnHit  (0..2) après un dégât subi : S.snake.ghost = 900 × n ms.
   f_slowmo      (0..2) si un ennemi est à moins de 90 u de la tête,
                        S.timeScale descend à (1 − 0.18 n).
   f_echo        (0..2) un fantôme du serpent, retardé de 0.9 s, rejoue les
                        tirs du canon frontal à 45 % de dégâts, n fantômes.
   f_permGhost   (0|1)  traversée permanente (la carte pose déjà un
                        S.snake.ghost très long) au prix d'1 segment / 15 s.

   --- transversal ------
   f_xp          (0..3) +20 % d'XP par point dans addXp.
   f_ultGain     (0..3) +25 % de charge d'ultime par point (la carte abaisse
                        déjà S.ultMax, ce drapeau est le bonus supplémentaire).
   f_multKeep    (0|1)  hurtSnake ne remet plus S.mult et S.combo à zéro.
   ====== */

/* ------ palette */
var _UP_ELEC  = '#9fc2ff';
var _UP_LASER = '#fff3b0';
var _UP_EXPLO = '#ffb347';
var _UP_SPEED = '#ff6ad5';
var _UP_FORT  = '#7dffb0';
var _UP_GHOST = '#b388ff';
var _UP_CORE  = '#dfe9f5';

/* ======
   AIDES
   ====== */

var _UP_WPN = ['frontCannon', 'sideTurrets', 'tailLaser', 'arcLightning',
               'missiles', 'drones', 'shockwave', 'tailMines'];

/* niveau / nombre de prises d'une carte */
function _upN(id) { var v = S.up[id] | 0; return v < 0 ? 0 : v; }

/* drapeau, toujours lisible même absent */
function _upF(name) { return S.up[name] || 0; }

/* incrémente un drapeau entier */
function _upBump(name, n) { S.up[name] = (S.up[name] || 0) + (n === undefined ? 1 : n); }

/* nombre d'armes possédées */
function _upGuns() {
  var n = 0;
  for (var i = 0; i < _UP_WPN.length; i++) if (_upN(_UP_WPN[i]) > 0) n++;
  return n;
}

/* possède au moins une source de projectiles dirigés */
function _upHasGun() {
  return _upN('frontCannon') > 0 || _upN('sideTurrets') > 0 || _upN('drones') > 0;
}

/* poids explosif cumulé : sert de condition aux cartes de l'axe explosif */
function _upExplo() {
  return _upN('missiles') + _upN('tailMines') + _upN('shockwave');
}

/* Palier maximum réel d'une arme, demandé à weapons quand il est là. */
function _upWpnMax(id) {
  var w = S2030.weapons;
  if (w && w.maxLevel) { var m = w.maxLevel(id); if (m > 0) return m; }
  return 6;
}

/* Description dynamique d'une carte d'arme : le texte du PALIER SUIVANT. */
function _upWpnDesc(c) {
  var w = S2030.weapons;
  if (w && w.nextDesc) { var d = w.nextDesc(c.id); if (d) return d; }
  return c.desc;
}

/* Poids dynamique d'une carte d'arme : on pousse fort une arme neuve tant que
   l'arsenal est maigre, on calme le jeu quand tout est déjà branché. */
function _upWpnWt(c) {
  var lv = _upN(c.id);
  if (lv <= 0) return c.weight * (_upGuns() < 4 ? 1.9 : 0.85);
  if (lv >= _upWpnMax(c.id) - 1) return c.weight * 1.3;   // le palier ULTIME appelle
  return c.weight;
}

/* Montée de palier d'arme, bornée. Le compteur a déjà été incrémenté par
   `apply(id)` : on se contente de le plafonner et de fêter le palier ultime. */
function _upWpnStep(id) {
  var m = _upWpnMax(id);
  if (_upN(id) > m) S.up[id] = m;
  if (_upN(id) === m) {
    var fx = S2030.fx, s = S.snake;
    if (fx && s) {
      fx.flash && fx.flash('#ffffff', 0.4);
      fx.ring && fx.ring(s.x, s.y, '#e6f0ff', 18, 900);
    }
  }
}

/* Rend `n` segments et garde maxHp cohérent. */
function _upGrow(n) {
  var s = S.snake;
  if (!s) return;
  s.maxHp += n;
  if (typeof healSnake === 'function') healSnake(n);
  else { s.len += n; s.hp = s.len; }
  if (s.maxHp < s.len) s.maxHp = s.len;
}

/* Retour visuel au moment du choix : bref, teinté par l'axe. */
function _upFeedback(c) {
  var fx = S2030.fx, s = S.snake;
  if (!fx || !s) return;
  fx.flare && fx.flare(s.x, s.y, c.tint, 140);
  fx.ring && fx.ring(s.x, s.y, c.tint, 16, 560);
  fx.text && fx.text(s.x, s.y - 36, c.name, c.tint);
  fx.burst && fx.burst(s.x, s.y, c.tint, 14, 1.2, { glow: true });
}

/* Barèmes fixes : pas de calcul flottant surprise, pas d'allocation. */
var _UP_RAM = [0, 12, 26, 46, 72];
var _UP_THORNS = [0, 10, 24, 42];
var _UP_SHIELDCD = [0, 9000, 7000, 5200];

/* ======
   LE POOL
   Six axes, des synergies explicites : une carte « epic » d'un axe suppose
   toujours qu'on a investi dans cet axe, et change la façon de jouer.
   ====== */

var _upPool = [

  /* ======
     AXE ÉLECTRIQUE — l'arc saute, le corps conduit, les cadavres claquent.
     ====== */

  { id: 'arcLightning', name: 'ARC', icon: '⚡', axis: 'elec', tint: _UP_ELEC,
    desc: 'La foudre saute d\'ennemi en ennemi.',
    rarity: 'common', max: 6, weight: 84, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('arcLightning') < _upWpnMax('arcLightning'); },
    apply: function () { _upWpnStep('arcLightning'); } },

  { id: 'conduct', name: 'CONDUCTEURS', icon: '≈', axis: 'elec', tint: _UP_ELEC,
    desc: 'Tout le corps devient conducteur : la foudre part de n\'importe quel segment.',
    rarity: 'rare', max: 3, weight: 50,
    req: function () { return _upN('arcLightning') >= 1; },
    apply: function () { _upBump('f_conduct'); } },

  { id: 'chainPlus', name: 'SURTENSION', icon: '✳', axis: 'elec', tint: _UP_ELEC,
    desc: 'Un rebond de plus et des arcs qui portent plus loin.',
    rarity: 'common', max: 3, weight: 60,
    req: function () { return _upN('arcLightning') >= 1; },
    apply: function () { _upBump('f_chainPlus'); } },

  { id: 'ionMark', name: 'IONISATION', icon: '⊕', axis: 'elec', tint: _UP_ELEC,
    desc: 'Les cibles foudroyées restent ionisées et encaissent tout plus mal.',
    rarity: 'rare', max: 3, weight: 46,
    req: function () { return _upN('arcLightning') >= 2; },
    apply: function () { _upBump('f_ionMark'); } },

  { id: 'shockExplode', name: 'DÉTONATION', icon: '💥', axis: 'elec', tint: _UP_ELEC,
    desc: 'Tout ennemi tué par la foudre explose sur ses voisins.',
    rarity: 'epic', max: 2, weight: 20,
    req: function () { return _upN('arcLightning') >= 2; },
    apply: function () { _upBump('f_shockExplode'); } },

  { id: 'staticField', name: 'CHAMP TESLA', icon: '⊗', axis: 'elec', tint: _UP_ELEC,
    desc: 'Une aura électrique permanente grille ce qui s\'approche.',
    rarity: 'epic', max: 2, weight: 18,
    req: function () { return _upN('arcLightning') >= 3; },
    apply: function () { _upBump('f_staticField'); } },

  { id: 'deathArc', name: 'CAPACITEUR', icon: '🌩', axis: 'elec', tint: _UP_ELEC,
    desc: 'Chaque mort relâche un nouvel éclair depuis le cadavre.',
    rarity: 'ultra', max: 1, weight: 6,
    req: function () { return _upN('arcLightning') >= 4 && _upF('f_conduct') >= 1; },
    apply: function () { S.up.f_deathArc = 1; } },

  /* ======
     AXE LASER — canons, tourelles, perforation, réflexion.
     ====== */

  { id: 'frontCannon', name: 'CANON', icon: '▲', axis: 'laser', tint: _UP_LASER,
    desc: 'Tire droit devant, sans relâche.',
    rarity: 'common', max: 6, weight: 88, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('frontCannon') < _upWpnMax('frontCannon'); },
    apply: function () { _upWpnStep('frontCannon'); } },

  { id: 'sideTurrets', name: 'TOURELLES', icon: '⊥', axis: 'laser', tint: _UP_LASER,
    desc: 'Des tourelles montées le long du corps.',
    rarity: 'common', max: 6, weight: 80, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('sideTurrets') < _upWpnMax('sideTurrets'); },
    apply: function () { _upWpnStep('sideTurrets'); } },

  { id: 'pierce', name: 'PERFORATION', icon: '➔', axis: 'laser', tint: _UP_LASER,
    desc: 'Tes tirs traversent une cible de plus.',
    rarity: 'rare', max: 3, weight: 48,
    req: function () { return _upN('frontCannon') >= 2 || _upN('sideTurrets') >= 2; },
    apply: function () { _upBump('f_pierce'); } },

  { id: 'ricochet', name: 'PRISME', icon: '◇', axis: 'laser', tint: _UP_LASER,
    desc: 'Un tir épuisé rebondit vers la cible suivante.',
    rarity: 'epic', max: 2, weight: 19,
    req: function () { return _upF('f_pierce') >= 1; },
    apply: function () { _upBump('f_ricochet'); } },

  { id: 'bulletSpeed', name: 'ACCÉLÉRATEUR', icon: '⇉', axis: 'laser', tint: _UP_LASER,
    desc: 'Des projectiles nettement plus rapides et plus durs à esquiver.',
    rarity: 'common', max: 3, weight: 56,
    req: function () { return _upHasGun(); },
    apply: function () { _upBump('f_bulletSpeed'); } },

  { id: 'rearTurrets', name: 'BORDÉE ARRIÈRE', icon: '⊤', axis: 'laser', tint: _UP_LASER,
    desc: 'Tes tourelles couvrent aussi tes arrières.',
    rarity: 'rare', max: 1, weight: 34,
    req: function () { return _upN('sideTurrets') >= 2; },
    apply: function () { S.up.f_rearTurrets = 1; } },

  { id: 'crit', name: 'POINT FAIBLE', icon: '🎯', axis: 'laser', tint: _UP_LASER,
    desc: 'Tes coups peuvent frapper au triple.',
    rarity: 'rare', max: 3, weight: 44,
    req: function () { return _upHasGun(); },
    apply: function () { _upBump('f_crit'); } },

  /* ======
     AXE EXPLOSIF — missiles, mines, réactions en chaîne, zone.
     ====== */

  { id: 'missiles', name: 'MISSILES', icon: '➤', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Rares, autoguidés sur le plus dangereux.',
    rarity: 'rare', max: 6, weight: 66, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('missiles') < _upWpnMax('missiles'); },
    apply: function () { _upWpnStep('missiles'); } },

  { id: 'tailMines', name: 'MINES', icon: '◈', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Semées sur ta trajectoire passée.',
    rarity: 'rare', max: 6, weight: 64, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('tailMines') < _upWpnMax('tailMines'); },
    apply: function () { _upWpnStep('tailMines'); } },

  { id: 'blast', name: 'OGIVE', icon: '⊙', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Toutes tes explosions s\'élargissent franchement.',
    rarity: 'common', max: 4, weight: 56,
    req: function () { return _upExplo() >= 1; },
    apply: function () { _upBump('f_blast'); } },

  { id: 'blastDmg', name: 'CHARGE CREUSE', icon: '▣', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Tes explosions frappent beaucoup plus fort.',
    rarity: 'common', max: 4, weight: 54,
    req: function () { return _upExplo() >= 1; },
    apply: function () { _upBump('f_blastDmg'); } },

  { id: 'chainExplode', name: 'RÉACTION', icon: '🎆', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Une explosion en déclenche d\'autres, de proche en proche.',
    rarity: 'epic', max: 2, weight: 20,
    req: function () { return _upN('missiles') >= 2 || _upN('tailMines') >= 2; },
    apply: function () { _upBump('f_chainExplode'); } },

  { id: 'deathBomb', name: 'GRAPPE', icon: '∴', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Les victimes d\'explosion lâchent une sous-charge en mourant.',
    rarity: 'rare', max: 3, weight: 42,
    req: function () { return _upExplo() >= 1; },
    apply: function () { _upBump('f_deathBomb'); } },

  { id: 'burnPool', name: 'NAPALM', icon: '🔥', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Chaque explosion laisse une flaque incandescente.',
    rarity: 'rare', max: 2, weight: 38,
    req: function () { return _upExplo() >= 1; },
    apply: function () { _upBump('f_burnPool'); } },

  { id: 'implode', name: 'SINGULARITÉ', icon: '🌀', axis: 'explo', tint: _UP_EXPLO,
    desc: 'Tes explosions aspirent tout au centre avant de détoner.',
    rarity: 'ultra', max: 1, weight: 6,
    req: function () { return _upExplo() >= 3 && _upF('f_blast') >= 1; },
    apply: function () { S.up.f_implode = 1; } },

  /* ======
     AXE VITESSE — aller vite EST une arme.
     ====== */

  { id: 'tailLaser', name: 'SILLAGE', icon: '∿', axis: 'speed', tint: _UP_SPEED,
    desc: 'Ta queue laisse une traînée brûlante.',
    rarity: 'common', max: 6, weight: 76, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('tailLaser') < _upWpnMax('tailLaser'); },
    apply: function () { _upWpnStep('tailLaser'); } },

  { id: 'speed', name: 'PROPULSEURS', icon: '»', axis: 'speed', tint: _UP_SPEED,
    desc: 'Vitesse de croisière nettement supérieure.',
    rarity: 'common', max: 5, weight: 72,
    req: function () { return true; },
    apply: function () {
      var s = S.snake;
      if (s) s.baseSpeed *= 1.09;
      _upBump('f_speed');
    } },

  { id: 'agility', name: 'AGILITÉ', icon: '↻', axis: 'speed', tint: _UP_SPEED,
    desc: 'Des virages beaucoup plus mordants.',
    rarity: 'common', max: 4, weight: 64,
    req: function () { return true; },
    apply: function () {
      var s = S.snake;
      if (s) s.turnBoost = (s.turnBoost || 1) + 0.2;
    } },

  { id: 'capacity', name: 'RÉSERVE', icon: '▮', axis: 'speed', tint: _UP_SPEED,
    desc: 'Un réservoir de boost bien plus profond.',
    rarity: 'common', max: 4, weight: 60,
    req: function () { return true; },
    apply: function () {
      var s = S.snake;
      if (!s) return;
      s.boostMax += 40;
      s.boostE = s.boostMax;
    } },

  { id: 'boostDrain', name: 'POSTCOMBUSTION', icon: '≫', axis: 'speed', tint: _UP_SPEED,
    desc: 'Le boost consomme beaucoup moins.',
    rarity: 'rare', max: 3, weight: 44,
    req: function () { return _upF('f_speed') >= 1 || _upN('capacity') >= 1; },
    apply: function () { _upBump('f_boostDrain'); } },

  { id: 'ram', name: 'ÉPERON', icon: '△', axis: 'speed', tint: _UP_SPEED,
    desc: 'Percuter un ennemi en boost le déchire au lieu de te blesser.',
    rarity: 'rare', max: 4, weight: 50,
    req: function () { return _upF('f_speed') >= 1 || _upN('capacity') >= 1; },
    apply: function () {
      var n = _upN('ram');
      if (n > 4) n = 4;
      S.up.f_ramDamage = _UP_RAM[n];
    } },

  { id: 'momentum', name: 'INERTIE', icon: '⇗', axis: 'speed', tint: _UP_SPEED,
    desc: 'Plus tu vas vite, plus tout ce que tu touches souffre.',
    rarity: 'epic', max: 2, weight: 19,
    req: function () { return _upF('f_speed') >= 2; },
    apply: function () { _upBump('f_momentum'); } },

  { id: 'trailWide', name: 'PLASMA ÉPAIS', icon: '≋', axis: 'speed', tint: _UP_SPEED,
    desc: 'Le sillage de queue frappe plus fort et bien plus loin.',
    rarity: 'rare', max: 2, weight: 40,
    req: function () { return _upN('tailLaser') >= 2; },
    apply: function () { _upBump('f_damage'); _upBump('f_range'); } },

  { id: 'sonicBoom', name: 'MUR DU SON', icon: '💨', axis: 'speed', tint: _UP_SPEED,
    desc: 'En boost, une onde permanente broie tout devant toi.',
    rarity: 'ultra', max: 1, weight: 6,
    req: function () { return _upF('f_speed') >= 3 && _upF('f_ramDamage') > 0; },
    apply: function () { S.up.f_sonicBoom = 1; } },

  /* ======
     AXE FORTERESSE — long, blindé, réparé, intouchable.
     ====== */

  { id: 'drones', name: 'DRONES', icon: '◎', axis: 'fort', tint: _UP_FORT,
    desc: 'Ils orbitent, tirent et encaissent pour toi.',
    rarity: 'rare', max: 6, weight: 66, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('drones') < _upWpnMax('drones'); },
    apply: function () { _upWpnStep('drones'); } },

  { id: 'shockwave', name: 'ONDE', icon: '◉', axis: 'fort', tint: _UP_FORT,
    desc: 'Une impulsion qui repousse et blesse tout autour.',
    rarity: 'rare', max: 6, weight: 64, wt: _upWpnWt, dyn: _upWpnDesc,
    req: function () { return _upN('shockwave') < _upWpnMax('shockwave'); },
    apply: function () { _upWpnStep('shockwave'); } },

  { id: 'growth', name: 'CROISSANCE', icon: '▬', axis: 'fort', tint: _UP_FORT,
    desc: 'Quatre segments de plus, immédiatement.',
    rarity: 'common', max: 6, weight: 74,
    req: function () { return true; },
    apply: function () { _upGrow(4); } },

  { id: 'shield', name: 'BOUCLIER', icon: '🛡', axis: 'fort', tint: _UP_FORT,
    desc: 'Un bouclier encaisse un coup entier, puis se recharge.',
    rarity: 'rare', max: 3, weight: 46,
    req: function () { return true; },
    apply: function () {
      var n = _upN('shield');
      if (n > 3) n = 3;
      S.up.f_shield = n;
      S.up.f_shieldCd = _UP_SHIELDCD[n];
      if (S.snake) S.snake.shield = n;
    } },

  { id: 'regen', name: 'RÉPARATION', icon: '✚', axis: 'fort', tint: _UP_FORT,
    desc: 'Ton corps se recoud tout seul avec le temps.',
    rarity: 'rare', max: 3, weight: 44,
    req: function () { return true; },
    apply: function () { _upBump('f_regen'); _upGrow(1); } },

  { id: 'thorns', name: 'ÉPINES', icon: '✖', axis: 'fort', tint: _UP_FORT,
    desc: 'Qui touche ton corps se déchire dessus.',
    rarity: 'rare', max: 3, weight: 42,
    req: function () { return true; },
    apply: function () {
      var n = _upN('thorns');
      if (n > 3) n = 3;
      S.up.f_thorns = _UP_THORNS[n];
    } },

  { id: 'pickHeal', name: 'NANITES', icon: '❖', axis: 'fort', tint: _UP_FORT,
    desc: 'Les ressources ramassées réparent ton corps.',
    rarity: 'common', max: 2, weight: 50,
    req: function () { return true; },
    apply: function () { _upBump('f_pickHeal'); } },

  { id: 'iframes', name: 'AMORTISSEURS', icon: '⏱', axis: 'fort', tint: _UP_FORT,
    desc: 'Une invulnérabilité bien plus longue après un coup.',
    rarity: 'common', max: 3, weight: 52,
    req: function () { return true; },
    apply: function () { _upBump('f_iframes'); } },

  { id: 'capDamage', name: 'CITADELLE', icon: '⬢', axis: 'fort', tint: _UP_FORT,
    desc: 'Aucun coup ne peut plus te coûter plus d\'un segment.',
    rarity: 'ultra', max: 1, weight: 6,
    req: function () { return _upN('growth') >= 3 || _upF('f_shield') >= 2; },
    apply: function () { S.up.f_capDamage = 1; _upGrow(3); } },

  /* ======
     AXE SPECTRAL — traverser, ralentir le temps, ignorer la matière.
     ====== */

  { id: 'ghostTime', name: 'PHASE', icon: '◐', axis: 'ghost', tint: _UP_GHOST,
    desc: 'Ta traversée spectrale dure bien plus longtemps.',
    rarity: 'common', max: 3, weight: 52,
    req: function () { return true; },
    apply: function () { _upBump('f_ghostTime'); } },

  { id: 'ghostOnHit', name: 'DÉSYNCHRO', icon: '◑', axis: 'ghost', tint: _UP_GHOST,
    desc: 'Encaisser un coup te fait passer à travers tout.',
    rarity: 'rare', max: 2, weight: 40,
    req: function () { return true; },
    apply: function () { _upBump('f_ghostOnHit'); } },

  { id: 'slowmo', name: 'DILATATION', icon: '⏳', axis: 'ghost', tint: _UP_GHOST,
    desc: 'Le temps se fige dès qu\'un ennemi te frôle.',
    rarity: 'epic', max: 2, weight: 20,
    req: function () { return true; },
    apply: function () { _upBump('f_slowmo'); } },

  { id: 'phaseShot', name: 'TIRS SPECTRAUX', icon: '○', axis: 'ghost', tint: _UP_GHOST,
    desc: 'Tes tirs ignorent blindages et boucliers.',
    rarity: 'rare', max: 1, weight: 34,
    req: function () { return _upHasGun(); },
    apply: function () { S.up.f_phaseShot = 1; } },

  { id: 'echo', name: 'DÉPHASAGE', icon: '👥', axis: 'ghost', tint: _UP_GHOST,
    desc: 'Encaisser un coup te fait traverser la matière un instant.',
    rarity: 'epic', max: 2, weight: 18,
    req: function () { return _upN('frontCannon') >= 2; },
    apply: function () { _upBump('f_ghostOnHit'); } },

  { id: 'permGhost', name: 'MARCHE DU VIDE', icon: '👻', axis: 'ghost', tint: _UP_GHOST,
    desc: 'Traversée permanente, au prix d\'un segment toutes les quinze secondes.',
    rarity: 'ultra', max: 1, weight: 6,
    req: function () { return _upF('f_ghostTime') >= 2 && S.snake && S.snake.len >= 12; },
    apply: function () {
      S.up.f_permGhost = 1;
      // effet immédiat sans attendre le coeur : une traversée pratiquement infinie
      if (S.snake) S.snake.ghost = 900000000;
    } },

  /* ======
     TRANSVERSAL — le socle qui fait tenir toutes les constructions.
     ====== */

  { id: 'power', name: 'PUISSANCE', icon: '⬆', axis: 'core', tint: _UP_CORE,
    desc: 'Toutes tes armes frappent plus fort.',
    rarity: 'common', max: 5, weight: 82,
    req: function () { return true; },
    apply: function () { _upBump('f_damage'); } },

  { id: 'rate', name: 'CADENCE', icon: '≡', axis: 'core', tint: _UP_CORE,
    desc: 'Toutes tes armes tirent plus vite.',
    rarity: 'common', max: 5, weight: 78,
    req: function () { return true; },
    apply: function () { _upBump('f_rate'); } },

  { id: 'range', name: 'PORTÉE', icon: '↔', axis: 'core', tint: _UP_CORE,
    desc: 'Tes armes accrochent leurs cibles de bien plus loin.',
    rarity: 'common', max: 4, weight: 62,
    req: function () { return true; },
    apply: function () { _upBump('f_range'); } },

  { id: 'magnet', name: 'AIMANT', icon: '🧲', axis: 'core', tint: _UP_CORE,
    desc: 'Les ressources viennent à toi de bien plus loin.',
    rarity: 'common', max: 3, weight: 58,
    req: function () { return true; },
    apply: function () { _upBump('f_magnet'); } },

  { id: 'xp', name: 'ANALYSE', icon: '★', axis: 'core', tint: _UP_CORE,
    desc: 'Chaque fragment rapporte davantage d\'expérience.',
    rarity: 'common', max: 3, weight: 50,
    req: function () { return true; },
    apply: function () { _upBump('f_xp'); } },

  { id: 'ultGain', name: 'RÉACTEUR', icon: '☆', axis: 'core', tint: _UP_CORE,
    desc: 'Ta surcharge se recharge beaucoup plus vite.',
    rarity: 'rare', max: 3, weight: 40,
    req: function () { return true; },
    apply: function () {
      _upBump('f_ultGain');
      // effet direct : le seuil de l'ultime descend
      S.ultMax = Math.max(55, S.ultMax - 12);
      if (S.ult > S.ultMax) S.ult = S.ultMax;
    } },

  { id: 'multKeep', name: 'SANG-FROID', icon: '∞', axis: 'core', tint: _UP_CORE,
    desc: 'Prendre un coup ne casse plus ton multiplicateur.',
    rarity: 'epic', max: 1, weight: 16,
    req: function () { return true; },
    apply: function () { S.up.f_multKeep = 1; } }
];

/* index par identifiant, construit une seule fois */
var _upById = {};
(function () {
  for (var i = 0; i < _upPool.length; i++) _upById[_upPool[i].id] = _upPool[i];
})();

/* ======
   TIRAGE
   Échantillonnage pondéré sans remise. Tampons réutilisés : le seul tableau
   alloué est celui que l'on rend à l'interface (trois éléments, très rare).
   ====== */

var _upCand = [];      // cartes éligibles
var _upWts = [];       // poids de base correspondants
var _upTmp = [];       // poids corrigés de la passe courante
var _upAxisN = { elec: 0, laser: 0, explo: 0, speed: 0, fort: 0, ghost: 0, core: 0 };

function _upEligible(c) {
  if (_upN(c.id) >= c.max) return false;
  if (c.req) {
    var ok = false;
    try { ok = !!c.req(); } catch (e) { ok = false; }
    if (!ok) return false;
  }
  return true;
}

/* ORACLE, l'article le plus cher de la boutique, promettait « meilleures
   chances de cartes rares » et ne touchait rien : f_luck était posé mais
   jamais lu ici. Mesuré avant correction : 61,9 / 36,5 / 1,7 / 0,0 % contre
   61,6 / 36,4 / 2,0 / 0,0 % — l'écart tenait au bruit. */
var _UP_RARE = { common: 1, rare: 1.6, epic: 2.4, ultra: 3.2 };
function _upWeight(c) {
  var w = c.wt ? c.wt(c) : c.weight;
  if (!(w > 0)) w = 0.001;
  if (S.up.f_luck) {
    var r = _UP_RARE[c.rarity || 'common'];
    w *= r === undefined ? 1 : r;
  }
  return w;
}

/* rafraîchit ce qui doit l'être juste avant l'affichage */
function _upRefresh(c) {
  if (c.dyn) {
    var d = c.dyn(c);
    if (d) c.desc = d;
  }
}

/* ======
   PREMIÈRE MAIN
   La toute première main d'une partie (S.cardsTaken === 0) obéit à deux règles
   qui ne valent que pour elle : au moins une carte de la LISTE DE SURVIE, et au
   plus UNE arme neuve. « Arme » = un des huit identifiants d'arme (DRONES et
   ONDE en font partie, même si leur axe est 'fort' : ce ne sont jamais des
   cartes de survie) ; « neuve » = jamais prise, ce qui exclut d'office CANON,
   posé à 1 ou 2 par resetRun. CITADELLE n'est pas dans la liste : son req()
   (CROISSANCE ≥ 3 ou BOUCLIER ≥ 2) l'interdit au premier écran.
   ====== */
var _UP_SURV = ['growth', 'shield', 'regen', 'iframes', 'pickHeal'];
var _UP_WPN = ['frontCannon', 'sideTurrets', 'tailLaser', 'arcLightning',
               'missiles', 'drones', 'shockwave', 'tailMines'];
function _upIsSurv(c) { return _UP_SURV.indexOf(c.id) >= 0; }
function _upIsNewWpn(c) { return _UP_WPN.indexOf(c.id) >= 0 && (S.up[c.id] | 0) === 0; }

/* Signature étendue (G9) : roll(n, opts). opts.trophy = main de TROPHÉE d'un
   boss abattu — aucune carte commune, et au moins une carte dans {epic, ultra}
   ('epic' n'est PAS la rareté maximale : le vivier compte 20 common, 20 rare,
   8 epic et 5 ultra). Sans opts, le comportement est celui d'avant. */
var _UP_TROPHY = { rare: 1, epic: 1, ultra: 1 };
var _UP_TOP = { epic: 1, ultra: 1 };
function _upRoll(n, opts) {
  var out = [];
  n = n | 0;
  if (n <= 0) return out;
  var first = (S.cardsTaken | 0) === 0;   // première main de la partie
  var trophy = !!(opts && opts.trophy);
  var needTop = trophy;                   // au moins une carte {epic, ultra}

  _upCand.length = 0;
  _upWts.length = 0;
  for (var i = 0; i < _upPool.length; i++) {
    var c = _upPool[i];
    if (!_upEligible(c)) continue;
    if (trophy && !_UP_TROPHY[c.rarity]) continue;
    _upCand.push(c);
    _upWts.push(_upWeight(c));
  }
  if (trophy && !_upCand.length) return _upRoll(n);   // vivier épuisé : main ordinaire
  if (!_upCand.length) return out;   // plus rien d'éligible : main vide, jamais d'erreur

  for (var k in _upAxisN) _upAxisN[k] = 0;

  while (out.length < n && _upCand.length) {
    // pondération de la passe : on étouffe (sans interdire) un troisième
    // choix dans un axe déjà servi deux fois, pour garder des mains lisibles.
    /* dernière place d'une main de TROPHÉE sans epic/ultra servie : on
       restreint le tirage à ces deux raretés, la garantie n'est pas un vœu */
    var forceTop = needTop && (out.length === n - 1 || _upCand.length === 1);
    var tot = 0, j;
    for (j = 0; j < _upCand.length; j++) {
      var w = _upWts[j];
      if ((_upAxisN[_upCand[j].axis] | 0) >= 2) w *= 0.12;
      if (forceTop && !_UP_TOP[_upCand[j].rarity]) w = 0;
      _upTmp[j] = w;
      tot += w;
    }
    var sel = _upCand.length - 1;
    if (tot > 0) {
      var r = rnd() * tot, acc = 0;
      for (j = 0; j < _upCand.length; j++) {
        acc += _upTmp[j];
        if (r < acc) { sel = j; break; }
      }
    } else {
      sel = (rnd() * _upCand.length) | 0;
      if (sel >= _upCand.length) sel = _upCand.length - 1;
    }

    var card = _upCand[sel];
    _upCand.splice(sel, 1);
    _upWts.splice(sel, 1);
    _upAxisN[card.axis] = (_upAxisN[card.axis] | 0) + 1;
    _upRefresh(card);
    out.push(card);
    if (needTop && _UP_TOP[card.rarity]) needTop = false;

    // première main : une arme neuve sortie, les autres quittent le tirage
    if (first && _upIsNewWpn(card)) {
      for (j = _upCand.length - 1; j >= 0; j--) {
        if (_upIsNewWpn(_upCand[j])) { _upCand.splice(j, 1); _upWts.splice(j, 1); }
      }
    }
  }

  // première main : garantie de survie, par substitution d'une carte tirée
  if (first && out.length) {
    var has = false, i2;
    for (i2 = 0; i2 < out.length; i2++) if (_upIsSurv(out[i2])) { has = true; break; }
    if (!has) {
      var sc = [], sw = [], tot2 = 0;
      for (i2 = 0; i2 < _upPool.length; i2++) {
        var c2 = _upPool[i2];
        if (!_upIsSurv(c2) || !_upEligible(c2)) continue;
        sc.push(c2); var w2 = _upWeight(c2); sw.push(w2); tot2 += w2;
      }
      if (sc.length) {
        var k2 = sc.length - 1;
        if (tot2 > 0) {
          var r2 = rnd() * tot2, acc2 = 0;
          for (i2 = 0; i2 < sc.length; i2++) { acc2 += sw[i2]; if (r2 < acc2) { k2 = i2; break; } }
        }
        var slot = (rnd() * out.length) | 0;
        if (slot >= out.length) slot = out.length - 1;
        _upRefresh(sc[k2]);
        out[slot] = sc[k2];
      }
    }
  }
  return out;
}

/* ======
   APPLICATION
   Le compteur est incrémenté ICI, avant l'effet : chaque `apply()` de carte
   peut donc lire `S.up[son id]` pour connaître son propre palier.
   ====== */

function _upApply(id) {
  var c = _upById[id];
  if (!c) return false;
  S.up[id] = (S.up[id] | 0) + 1;
  if (c.apply) {
    try { c.apply(c); } catch (e) {}
  }
  _upFeedback(c);
  return true;
}

/* ======
   API DU MODULE
   ====== */

S2030.upgrades = {
  pool: _upPool,
  roll: _upRoll,
  apply: _upApply,

  /* --- extras lisibles par l'interface et par le coeur ------ */

  /** Carte par identifiant, ou null. */
  byId: function (id) { return _upById[id] || null; },

  /** Nombre de fois qu'une carte a été prise (= niveau, pour une arme). */
  taken: function (id) { return _upN(id); },

  /** Valeur d'un drapeau, 0 s'il n'a jamais été posé. */
  flag: function (name) { return _upF(name); },

  /** Couleur de l'axe d'une carte, pour teinter l'interface. */
  tint: function (id) { var c = _upById[id]; return c ? c.tint : _UP_CORE; },

  /** true si au moins une carte reste tirable. */
  any: function () {
    for (var i = 0; i < _upPool.length; i++) if (_upEligible(_upPool[i])) return true;
    return false;
  }
};
