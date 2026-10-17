# Contrat des modules du prototype

Les modules de `src/` sont concaténés par ordre de nom dans UNE SEULE fermeture par `build.mjs`. Il n'y a
ni `import` ni `export` : un module publie son interface sur l'objet global `N` et consomme celle des
autres par `N.<nom>`. Chaque module déclare `N.<nom> = { … }` UNE fois et ne touche à rien d'autre.

`boot()` est appelée en dernier par le bundle. C'est `90-boot.js` qui la définit.

## Qui possède quoi — un fichier, un propriétaire, aucun chevauchement

| fichier | publie | responsable de |
|---|---|---|
| `00-pal.js` | `N.pal` | la table des seize couleurs, le tramage de Bayer, les conversions |
| `10-gfx.js` | `N.gfx` | le tampon basse résolution, la mise à l'échelle, les primitives pixel |
| `20-crt.js` | `N.crt` | le balayage, l'aberration chromatique, le halo, la vignette |
| `30-music.js` | `N.music` | le moteur musical génératif et les sons |
| `40-sprites.js` | `N.spr` | les sprites procéduraux (joueuse, ennemis, butin, lettres) |
| `50-fx.js` | `N.fx` | explosions, éclats, secousse, gel d'image, traînées |
| `60-intro.js` | `N.intro` | la séquence d'ouverture et les transitions |
| `70-game.js` | `N.game` | l'état, la boucle, le défi, la montée en tension |
| `90-boot.js` | `boot`, `N.S` | la boucle d'images, l'horloge, le redimensionnement, les entrées |

## Interfaces imposées — à respecter à la lettre, les autres s'appuient dessus

```
N.pal.C          // tableau de 16 chaînes '#rrggbb', index 0..15, dans l'ordre de DIRECTION.md
N.pal.i(nom)     // index par nom : 'vide','nuit','ardoise','violet','indigo','magenta','rosePale',
                 // 'cyan','cyanPale','ambre','jaune','brasier','os','acier','sang','nuitProfonde'
N.pal.dither(x,y,t)  // -> true si le pixel (x,y) doit être posé pour une intensité t de 0 à 1

N.gfx.init(canvasSortie)     // crée le tampon ; à appeler avant tout dessin
N.gfx.resize(cssW,cssH)      // recalcule px et les dimensions du tampon ; -> {w,h,px}
N.gfx.W, N.gfx.H, N.gfx.PX   // dimensions du tampon en pixels de jeu, et taille apparente
N.gfx.clear(ci)              // remplit le tampon de la couleur d'index ci
N.gfx.px(x,y,ci)             // un pixel ; coordonnées arrondies par l'appelant
N.gfx.rect(x,y,w,h,ci)       // rectangle plein
N.gfx.line(x0,y0,x1,y1,ci)   // Bresenham
N.gfx.circ(x,y,r,ci)         // cercle plein
N.gfx.ring(x,y,r,ci,t)       // anneau d'épaisseur 1, tramé à l'intensité t
N.gfx.blit(sprite,x,y,opts)  // pose un sprite ; opts {flipX,flipY,ci} (ci remplace l'encre)
N.gfx.present()              // agrandit le tampon vers le canvas de sortie, voisin le plus proche

N.crt.apply(dt)              // post-traitement, appelé après present() ; lit N.S.shake et N.S.heat
N.music.init()               // crée le contexte ; à appeler sur un geste de la joueuse
N.music.start(), N.music.stop()
N.music.tension(v)           // v de 0 à 1 : pilote le nombre de couches actives
N.music.sfx(nom,opts)        // 'tir','kill','bigkill','degat','butin','intro','defi'
N.music.rms()                // niveau courant, pour les tests

N.spr.make(nom,graine)       // -> {w,h,data:Uint8Array} d'index de palette, 0 = transparent
N.spr.text(chaine)           // -> sprite du texte en police 5×7 maison
N.fx.boom(x,y,force,ci)      // explosion ; force 0 à 1 ; grosse si force > 0,6
N.fx.hitstop(images)         // gèle n images
N.fx.shake(amplitude)        // en pixels de jeu
N.fx.update(dt), N.fx.draw()

N.game.reset(graine), N.game.update(dt), N.game.draw(), N.game.tension()  // -> 0 à 1
N.S                          // état partagé : t, dt, phase, shake, heat, seed, score, enemies, …
```

## Crochets de test, obligatoires

Le bundle expose sur `window` : `__N` (l'objet N), `__S` (l'état), `__PAL` (la table),
`__ERR = {count, sigs}` (exceptions comptées une fois par signature), `__SEED` (graine imposée),
`__DT` (pas de temps imposé en secondes, jamais posé en jeu normal), `__FRAME` (compteur d'images).
Sans ces crochets les tests ne peuvent pas mesurer, et un module qui les casse fait échouer la vérification.

## Interdits

Aucun `import`, aucun `require`, aucune URL, aucune police web, aucun actif binaire.
Aucun `Math.random` — utiliser le générateur à graine de `N.S`. Aucun `Date.now` ni `performance.now`
hors de `90-boot.js`. Aucune couleur littérale hors `00-pal.js`. Aucun fichier touché hors de `proto-neon/`.
