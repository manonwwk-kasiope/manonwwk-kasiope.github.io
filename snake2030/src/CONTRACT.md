# SNAKE 2030 — contrat d'interface entre modules

Tous les modules sont concaténés dans **une seule closure**, dans cet ordre :

```
10-core.js      (écrit par l'intégrateur — fournit tout ce qui suit)
20-fx.js        (S2030.fx)
21-audio.js     (S2030.audio)
22-enemies.js   (S2030.enemies)
23-weapons.js   (S2030.weapons)
24-upgrades.js  (S2030.upgrades)
25-levels.js    (S2030.levels)
26-ui.js        (S2030.ui)
90-boot.js      (écrit par l'intégrateur)
```

Chaque module écrit **un seul fichier** et n'y définit **qu'une seule affectation**
`S2030.<nom> = { ... }`, plus autant de fonctions/constantes locales qu'il veut,
préfixées pour éviter les collisions (ex. `_enemyHelper`).

- JavaScript classique, pas de `import`/`export`, pas de TypeScript.
- Ne jamais toucher au DOM sauf dans `26-ui.js`.
- Ne jamais appeler `Date.now()` : utiliser `S.t` (temps de jeu, ms).
- Ne jamais utiliser `Math.random()` : utiliser `rnd()` (générateur avec graine).
- Tout dessin se fait dans le repère **monde** (la caméra est déjà appliquée),
  sauf mention explicite d'écran.

---

## Repère et unités

Le monde fait `K.ARENA_W × K.ARENA_H` pixels-monde. La caméra suit la tête.
1 unité monde ≈ 1 pixel à l'échelle de référence. Les vitesses sont en
**unités par seconde**. Tous les `update(dt)` reçoivent `dt` en **secondes**
(déjà plafonné à 0.05).

---

## Globales fournies par le cœur

### État

```js
S = {
  t,              // temps de jeu écoulé, ms
  dt,             // delta de l'image courante, s
  phase,          // 'menu' | 'intro' | 'play' | 'cards' | 'boss' | 'dead' | 'warp'
  paused,
  cam: { x, y },  // centre de la caméra, monde
  view: { w, h }, // taille du viewport en unités monde
  snake: {
    x, y, ang,          // tête : position monde, cap en radians
    speed, baseSpeed,
    path: [],           // [{x,y}] du plus récent au plus ancien, pas ~4 u
    len,                // nombre de segments voulus
    segs: [],           // [{x, y, ang, slot}] recalculé chaque image, index 0 = juste derrière la tête
    hp, maxHp,
    boostE, boostMax, boosting,
    invuln,             // ms restantes
    ghost,              // >0 : traverse les ennemis
  },
  enemies: [], bullets: [], ebullets: [], pickups: [], drones: [],
  level, levelT, intensity,   // intensity 0..1, pilote musique et effets
  score, mult, multT, combo, kills,
  xp, xpNext, lvlUps,
  up: {},        // compteurs d'améliorations, ex. up.frontCannon = 3
  ult, ultMax, special, specialCd,
  coins,         // monnaie permanente gagnée dans la partie
  seed,
}

K = { ARENA_W, ARENA_H, SEG_SPACING, HEAD_R, ... }  // constantes
```

### Aides mathématiques et aléatoires

```js
rnd()              // 0..1, avec graine
rndR(a, b)         // réel dans [a,b)
rndI(a, b)         // entier dans [a,b]
pick(arr)
chance(p)          // true avec probabilité p
clamp(v, a, b)
lerp(a, b, t)
norm(a)            // ramène un angle dans -PI..PI
angTo(x1,y1,x2,y2) // atan2(y2-y1, x2-x1)
dist(x1,y1,x2,y2)
dist2(x1,y1,x2,y2) // distance au carré, préférer pour les comparaisons
```

### Actions de jeu

```js
spawnEnemy(type, x, y, mods)  // mods: {elite:true, mod:'armored'|'fast'|...}
addBullet(o)                  // projectile JOUEUR, voir forme ci-dessous
addEBullet(o)                 // projectile ENNEMI
addPickup(kind, x, y)         // 'energy' | 'core' | 'heal' | 'magnet'
damageEnemy(e, dmg, opts)     // opts: {x, y, type:'bullet'|'laser'|'shock', chain}
hurtSnake(dmg, x, y)          // retire des segments, gère l'invulnérabilité
addScore(n)                   // applique le multiplicateur
addXp(n)
enemiesNear(x, y, r)          // -> tableau d'ennemis dans le rayon
nearestEnemy(x, y, maxR)      // -> ennemi ou null
inView(x, y, marge)           // -> bool, pour ne dessiner que le visible
```

### Forme d'un projectile joueur

```js
{ x, y, vx, vy, r, dmg, life,     // life en secondes, décrémentée par le cœur
  color, kind,                     // kind sert au dessin, propre à weapons.js
  pierce, homing, target, aoe,     // optionnels
  onHit(e)                         // optionnel, appelé à l'impact
}
```

### Forme d'un projectile ennemi

Identique, sans `pierce`/`homing` obligatoires. `dmg` en segments (souvent 1).

### Forme d'un ennemi

Le cœur garantit ces champs après `spawnEnemy` :

```js
{ id, type, x, y, vx, vy, ang, r, hp, maxHp, dmg, speed,
  score, xp, elite, mod, dead, hitT,   // hitT : ms de flash blanc restantes
  t,                                    // âge en ms
  ...(champs libres ajoutés par la définition) }
```

---

## Modules

### `S2030.fx`

```js
{
  burst(x, y, color, n, power, opts),   // gerbe de particules
  ring(x, y, color, r0, speed),         // onde de choc
  flare(x, y, color, r),                // halo lumineux additif
  trail(x, y, ang, color),              // traînée courte
  shake(amount),                        // secousse caméra, unités monde
  hitstop(ms),                          // gel très bref
  text(x, y, str, color),               // texte flottant monde
  flash(color, a),                      // flash plein écran
  update(dt), draw(ctx), drawScreen(ctx, w, h), reset()
}
```

`update` et `draw` sont appelés par le cœur. `drawScreen` est appelé **après**
restauration du repère caméra, en coordonnées écran.

### `S2030.audio`

```js
{
  init(), start(), stop(), resume(),
  setIntensity(v),        // 0..1, fait apparaître/disparaître les couches
  setMusic(on), setSfx(on),
  sfx(name, opts),        // voir la liste des noms ci-dessous
  ultimate(),             // enchaînement sonore de l'ultime
  ready                   // bool
}
```

Noms d'effets attendus : `shoot`, `laser`, `hit`, `kill`, `bigkill`, `pickup`,
`core`, `hurt`, `boost`, `boostEnd`, `levelup`, `card`, `ultReady`, `ultFire`,
`bossIn`, `warp`, `click`, `dead`, `shock`, `zap`, `missile`, `explode`.

La musique est bâtie sur `neonvelocity.mp3` (fourni au cœur, décodé en
`S.musicBuf`, boucle de `K.MUSIC_LOOP` secondes) plus des couches synthétisées.

### `S2030.enemies`

```js
{
  defs: { chaser: {...}, shooter: {...}, ... },
  update(e, dt),      // déplacement + tir ; appelé pour chaque ennemi vivant
  draw(ctx, e),       // repère monde, centré libre
  onDeath(e),         // butin, effets, ennemis enfants
  mods: { armored:{...}, fast:{...}, ... }   // modificateurs d'élite
}
```

Une définition contient au minimum :
`{ hp, speed, r, dmg, score, xp, color, silhouette }`

### `S2030.weapons`

```js
{
  defs: { frontCannon:{ name, max, levels:[{...}] }, ... },
  update(dt),          // fait tirer toutes les armes possédées (lit S.up)
  drawBullet(ctx, b),  // dessin d'un projectile joueur
  drawMounts(ctx),     // tourelles, drones, modules visibles sur le corps
  reset()
}
```

### `S2030.upgrades`

```js
{
  pool: [ { id, name, desc, icon, rarity, max, weight, req(), apply() } ],
  roll(n),      // -> n cartes distinctes et éligibles
  apply(id)
}
```

`desc` : **une phrase courte maximum**, jamais un paragraphe.
`rarity` : `'common' | 'rare' | 'epic' | 'ultra'`.

### `S2030.levels`

```js
{
  defs: [ { n, name, palette:{...}, mech, spawns:[...], boss } ],
  start(n), update(dt),
  drawBack(ctx),    // décor, sous les entités
  drawFore(ctx),    // par-dessus les entités (brume, lasers d'arène…)
  hazards: []       // dangers d'arène, collision gérée par le module
}
```

### `S2030.ui`

Seul module autorisé à toucher au DOM. Expose :

```js
{
  build(root),        // crée toute l'interface dans #ui
  hud(),              // rafraîchit score, jauges, vie — appelé chaque image
  showCards(cards, cb),
  showScreen(name),   // 'menu' | 'over' | 'pause' | null
  toast(title, sub),
  banner(text),       // annonce plein écran brève (BOSS, NIVEAU 2…)
  setControls(cfg)
}
```
