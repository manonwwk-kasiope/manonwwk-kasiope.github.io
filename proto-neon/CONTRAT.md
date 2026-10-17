# Contrat des modules du prototype

Les modules de `src/` sont concaténés par ordre de nom dans UNE SEULE fermeture par `build.mjs`. Il n'y a
ni `import` ni `export` : un module publie son interface sur l'objet global `N` et consomme celle des
autres par `N.<nom>`. Chaque module déclare `N.<nom> = { … }` UNE fois et ne touche à rien d'autre.

`boot()` est appelée en dernier par le bundle. C'est `90-boot.js` qui la définit.

## Qui possède quoi — un fichier, un propriétaire, aucun chevauchement

| fichier | publie | responsable de |
|---|---|---|
| `00-pal.js` | `N.pal` | la table des seize couleurs, le tramage de Bayer, les conversions |
| `05-art.js` | `N.art` | les illustrations générées, déjà converties en pixel art — **le pilote en est propriétaire, n y touche pas** |
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

N.art.load()               // lancé par 90-boot.js au démarrage ; rend une promesse
N.art.ready()              // true quand tout est décodé
N.art.get(nom)             // -> {w,h,data:Uint8Array} au MÊME format que N.spr.make (0 = transparent),
                           //    ou null tant que ce n est pas décodé : dessine alors ton repli procédural
N.art.names()              // affiche, horizon, briefing, logo

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

## Les illustrations générées — à employer, pas à refaire

Quatre illustrations ont été générées (GPT Image 2.5 Sunburst) puis converties hors ligne en vrai pixel
art : réduites à la résolution du jeu, forcées dans la palette des seize avec le même tramage de Bayer
que le jeu. Elles sont dans `art/`, injectées par `build.mjs`, et servies par `N.art.get(nom)`.

| nom | taille | usage prévu |
|---|---|---|
| `affiche` | 384 x 216 | écran-titre : le serpent de données cyan devant un soleil en bandes et une cité de monolithes |
| `horizon` | 512 x 220 | fond de la séquence d ouverture et arrière-plan parallaxe du jeu ; plus large que l écran pour défiler |
| `briefing` | 384 x 216 | panneau de cinématique : salle de contrôle, écrans, opérateur de dos, porte de coffre |
| `logo` | 200 x 113 | logo NEON 2084 chromé, liseré magenta en haut et cyan en bas, fond transparent |

Elles sont plus belles que ce qu un générateur procédural produira. **60-intro.js doit les employer** :
`horizon` pour la grille et le soleil, `logo` pour le logo qui se construit (les pixels arrivent en
vagues vers leur place dans le sprite), `briefing` derrière le texte de mission, `affiche` pour
l écran-titre ou de fin. **70-game.js peut employer `horizon`** comme arrière-plan lointain, en
parallaxe lente et assombri, sans jamais nuire à la lisibilité des ennemis. Le procédural reste
indispensable pour tout ce qui bouge et tout ce qui est petit : sprites, explosions, police, effets.
Garde toujours un repli procédural quand `N.art.get` rend null.

Pour un fond de la taille de l écran, recadre au centre ; pour un écran plus grand que l image,
répète-la ou centre-la sur le vide. Jamais d agrandissement non entier : un pixel d illustration doit
rester un carré net, exactement comme un pixel de sprite.

## Crochets de test, obligatoires

Le bundle expose sur `window` : `__N` (l'objet N), `__S` (l'état), `__PAL` (la table),
`__ERR = {count, sigs}` (exceptions comptées une fois par signature), `__SEED` (graine imposée),
`__DT` (pas de temps imposé en secondes, jamais posé en jeu normal), `__FRAME` (compteur d'images).
Sans ces crochets les tests ne peuvent pas mesurer, et un module qui les casse fait échouer la vérification.

## Interdits

Aucun `import`, aucun `require`, aucune URL, aucune police web. Aucun actif binaire hors de `art/`, qui est injecté par `build.mjs` : n en ajoute pas toi-même.
Aucun `Math.random` — utiliser le générateur à graine de `N.S`. Aucun `Date.now` ni `performance.now`
hors de `90-boot.js`. Aucune couleur littérale hors `00-pal.js`. Aucun fichier touché hors de `proto-neon/`.
