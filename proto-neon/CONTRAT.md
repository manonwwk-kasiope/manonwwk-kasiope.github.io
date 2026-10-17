# Contrat des modules du prototype

Le jeu s'appelle **SNAKE 2975** (NEON 2084 n'est que le nom de code du dossier). Tout texte affiché dit
SNAKE 2975 et l'histoire se passe en 2975.

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
N.art.names()              // affiche, horizon, briefing, logo, exterieur, connexion, eveil, alerte, boss,
                           // victoire, defaite

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
N.game.drawTop()             // facultatif, appelé APRÈS N.fx.draw() : menaces, joueuse et interface
                             // y restent lisibles par-dessus les explosions
N.gfx.resize(cssW,cssH,sûreW,sûreH)  // 90-boot.js passe aussi la zone sûre, d'où se tire la taille du pixel
N.S                          // état partagé : t, dt, phase, shake, heat, seed, score, enemies, …
```

## Les illustrations générées — à employer, pas à refaire

Onze illustrations ont été générées (GPT Image 2.5 Sunburst) puis converties hors ligne en vrai pixel
art : réduites à la résolution du jeu, forcées dans la palette des seize avec le même tramage de Bayer
que le jeu. Elles sont dans `art/`, injectées par `build.mjs`, et servies par `N.art.get(nom)`.

| nom | taille | usage prévu |
|---|---|---|
| `affiche` | 384 x 216 | écran-titre : le serpent de données cyan devant un soleil en bandes et une cité de monolithes |
| `horizon` | 512 x 220 | fond de la séquence d ouverture et arrière-plan parallaxe du jeu ; plus large que l écran pour défiler |
| `briefing` | 384 x 216 | panneau de cinématique : salle de contrôle, écrans, opérateur de dos, porte de coffre |
| `logo` | 200 x 113 | logo SNAKE 2975 chromé sur deux lignes (SNAKE, puis 2975), liseré magenta en haut et cyan en bas, fond transparent |
| `exterieur` | 384 x 216 | panneau : la cité de monolithes la nuit, soleil en bandes, reflets sur la grille — sans cyan |
| `connexion` | 384 x 216 | panneau : une main gantée branche un câble, une étincelle cyan jaillit — la naissance du serpent |
| `eveil` | 384 x 216 | panneau : le serpent de données cyan se dresse, gueule ouverte, au-dessus de la grille |
| `alerte` | 384 x 216 | panneau : salle de contrôle rouge, écrans d alarme, opérateur de dos — sans cyan |
| `boss` | 384 x 216 | panneau : un colosse mécanique à l œil unique devant le soleil, débris en suspension — sans cyan |
| `victoire` | 384 x 216 | panneau : le serpent fracasse la grille, éclats de verre, soleil jaune |
| `defaite` | 384 x 216 | panneau : le serpent se dissout en pixels sur la grille, soleil rouge |

Elles sont plus belles que ce qu un générateur procédural produira. **60-intro.js doit les employer** :
`horizon` pour la grille et le soleil, `logo` pour le logo qui se construit (les pixels arrivent en
vagues vers leur place dans le sprite), `briefing` derrière le texte de mission, `affiche` pour
l écran-titre ou de fin. **70-game.js peut employer `horizon`** comme arrière-plan lointain, en
parallaxe lente et assombri, sans jamais nuire à la lisibilité des ennemis. Le procédural reste
indispensable pour tout ce qui bouge et tout ce qui est petit : sprites, explosions, police, effets.
Garde toujours un repli procédural quand `N.art.get` rend null.

### La cinématique : où va chaque panneau

Les sept panneaux forment une seule histoire, dans le même style. Ils sont fixes : c est à toi de leur
donner vie, à la manière des cinématiques d arcade, sans jamais les redessiner ni les lisser :
révélation par bandes de haut en bas comme un tube qui chauffe, apparition par seuil de Bayer qui monte
de 0 à 1, dérive verticale lente par pas entiers, ligne de balayage qui descend, scintillement des
pixels cyan entre `cyan` et `cyanPale` (un échange d index, pas une nouvelle couleur).

**Ouverture** (60-intro.js), sautable à tout instant, une douzaine de secondes au total :
`exterieur` (≈ 2 s) → `connexion` (≈ 1,5 s, l étincelle clignote) → `eveil` (≈ 2 s, petite secousse
à la fin) → `horizon` et le `logo` qui se construit (≈ 3 s) → `briefing` sous le texte de mission
(≈ 3 s) → transition vers le jeu.

**Interludes** : `N.intro.transition(nom)`, appelée par 70-game.js. Le jeu est gelé pendant
l interlude, qui dure au plus trois secondes et se saute d une touche ou d un toucher.
- `transition('boss')` à l annonce du gros ennemi : `alerte` (≈ 1,2 s, cadre magenta qui clignote,
  ALERTE en police 5×7) puis `boss` (≈ 1,8 s, révélation de bas en haut, le nom du colosse). Le
  télégraphe du gros ennemi commence au retour en jeu.
- `transition('victoire')` et `transition('defaite')` : en fond de l écran de fin, assombris d un cran
  sous le score et le défi, qui restent parfaitement lisibles. Victoire si la joueuse tient les deux
  minutes, défaite à la mort.

Le serpent cyan des panneaux `eveil`, `victoire`, `defaite`, `affiche` et l étincelle de `connexion`,
c est la joueuse elle-même : la règle du cyan y est appliquée, pas enfreinte. Le critère 3 de
DIRECTION.md se mesure sur les captures de jeu, pas sur les panneaux.

Pour un fond de la taille de l écran, recadre au centre ; pour un écran plus grand que l image,
répète-la ou centre-la sur le vide. Jamais d agrandissement non entier : un pixel d illustration doit
rester un carré net, exactement comme un pixel de sprite.

## Les cinématiques animées : `cine/*.mp4`

Neuf panneaux existent aussi en vidéo (générées par Kling 3.0 à partir des panneaux eux-mêmes, 384 x 216,
douze images par seconde, cinq secondes, sans son) : `affiche`, `briefing`, `victoire` et `defaite`
bouclent sans couture ; `exterieur`, `connexion`, `eveil`, `alerte` et `boss` se jouent une fois.
05-art.js les charge paresseusement et les convertit À LA VOLÉE en vrai pixel art : chaque image de la
vidéo est réduite au tampon, tramée par Bayer et forcée dans la palette des seize. Le critère de palette
fermée tient donc aussi pendant les cinématiques. L interface, pour 60-intro.js et 70-game.js :

```
N.art.play(nom)        // lance le clip depuis le début ; -> true si la vidéo va jouer, false sinon
N.art.stop(nom)        // l arrête ; N.art.get(nom) redevient le panneau fixe
N.art.get(nom)         // pendant la lecture : l image COURANTE du clip, même format {w,h,data} ;
                       // sinon le panneau fixe. Le même appel sert donc aux deux.
N.art.ended(nom)      // true quand un clip joué une fois est fini, ou n a pas pu jouer
```

Il suffit donc d appeler `N.art.play(nom)` en entrant dans un panneau, de poser `N.art.get(nom)` à
chaque image, et `N.art.stop(nom)` en sortant. Sans vidéo (fichier absent, lecture refusée, mode
économie d énergie de l iPhone), tout retombe sur le panneau fixe sans erreur : ne fais jamais dépendre
l enchaînement de la vidéo, cadence-le sur ton propre chronomètre. 90-boot.js déverrouille les vidéos
au premier geste, en même temps que le son.

## La planche des ennemis : `ref/ennemis-planche.png`

Ce n est PAS un actif du jeu, jamais chargé ni injecté : c est le modèle des silhouettes pour
40-sprites.js, la planche de concept générée réduite en pixel art à 16, 24 et 32 pixels (une colonne par
ennemi). Regarde-la avec l outil Read avant de dessiner. Les quatre types, de gauche à droite : la
**flèche** (triangle à visière lumineuse, trois pattes), la **tourelle** (bloc blindé au canon central,
deux pattes), la **sentinelle** (losange à œil central dans un croissant), la **mine** (sphère à piques,
cœur lumineux). Le gros ennemi reprend le colosse à l œil unique du panneau `boss`. Tous en magenta,
sang et rose pâle, jamais en cyan. À la taille du jeu, simplifie : une silhouette lisible d abord, un
détail lumineux ensuite.

## Entrées, orientation, son, pause : ce que 90-boot.js fait déjà, et ce que le jeu doit en faire

**Au doigt, un manche virtuel flottant** (le standard actuel, voir `recherche/jouabilite-mobile.md`) : il
naît là où le pouce se pose, n importe où sur l écran ; la direction est le vecteur depuis ce point ;
l origine suit le pouce au-delà du rayon, donc un demi-tour est immédiat ; un second doigt ne vole
jamais la direction. 90-boot.js remplit `S.input.x`, `S.input.y` (direction unitaire, gardée quand le
pouce s arrête), `S.input.mag` (0 à 1 ; 0 au repos et dans la zone morte) et dessine lui-même
l indicateur : ne dessine pas d autre manche. `S.input.stick` donne l origine et le pouce en pixels CSS.
Le tir est automatique au doigt. Au clavier : flèches ou ZQSD, Espace pour tirer.

**Portrait ET paysage.** Safari ne peut pas verrouiller l orientation : le jeu doit se jouer dans les
deux, l interface comprise, et survivre à une rotation en pleine partie.

**Le son joue même interrupteur silencieux enclenché** (`navigator.audioSession.type = 'playback'`,
posé par 90-boot.js au premier geste) : le jeu doit donc offrir une coupure du son visible, au doigt.
En arrière-plan, 90-boot.js appelle `N.music.suspend()` puis, au retour, `N.music.resume()` : 30-music.js
les publie (le contexte audio de l iPhone revient « interrupted » et doit être relancé).

**Pause.** Quand l application passe en arrière-plan, `S.paused` devient vrai et la boucle ne met plus
rien à jour ; la reprise se fait au premier geste. Tant que `S.paused` est vrai, 70-game.js affiche
PAUSE en police 5×7.

**La recherche fait autorité.** `recherche/jouabilite-mobile.md` (J-xx), `recherche/game-design-campagne.md`
(G-xx) et `recherche/visuel-technique-mobile.md` (V-xx) listent des exigences vérifiables : le jury
indépendant jugera le jeu sur elles autant que sur DIRECTION.md. Lis celles de ton domaine.

## Crochets de test, obligatoires

Le bundle expose sur `window` : `__N` (l'objet N), `__S` (l'état), `__PAL` (la table),
`__ERR = {count, sigs}` (exceptions comptées une fois par signature), `__SEED` (graine imposée),
`__DT` (pas de temps imposé en secondes, jamais posé en jeu normal), `__FRAME` (compteur d'images).
Sans ces crochets les tests ne peuvent pas mesurer, et un module qui les casse fait échouer la vérification.

## Interdits

Aucun `import`, aucun `require`, aucune URL (seul 05-art.js charge les clips `cine/*.mp4`), aucune police web. Aucun actif binaire hors de `art/`, qui est injecté par `build.mjs` : n en ajoute pas toi-même.
Aucun `Math.random` — utiliser le générateur à graine de `N.S`. Aucun `Date.now` ni `performance.now`
hors de `90-boot.js`. Aucune couleur littérale hors `00-pal.js`. Aucun fichier touché hors de `proto-neon/`.
