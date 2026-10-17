# Audit indépendant : visuel, ambiance et mise en scène de la démo SNAKE 2975

Audit du 17 octobre 2026, fait sur le jeu tel qu'il tourne : http://127.0.0.1:8112/proto-neon/index.html (bundle `index.html` du 17/10, 16 h 39). L'auditeur n'a rien construit et ne s'appuie sur aucun rapport des constructeurs. Tout ce qui suit a été vu sur capture ou mesuré dans le tampon d'index de `N.gfx.buf()`.

- **Profils testés :** iPhone 13 paysage (844 × 390, tampon 422 × 195, px = 2), iPhone 13 portrait (390 × 844, tampon 195 × 422), bureau (1440 × 900, tampon 360 × 225, px = 4). Le toucher est émulé par CDP.
- **Parties jouées :**
  - une partie complète en temps réel sur iPhone paysage, de l'ouverture au colosse, avec 196 kills et 3 dégâts ;
  - deux parties accélérées (`__DT = 0.05`) pour atteindre la victoire et la défaite ;
  - une défaite en portrait ;
  - le début d'une partie de SNAKE 2030 pour comparer.
- **Erreurs :** zéro erreur JavaScript sur toutes les parties (`__ERR.count = 0`, console vide).
- **Captures :** `refonte/captures/audit-visuel/`. Les noms en `*-imgN.png` sont des instantanés du tampon, sans post-traitement cathodique, pris N images après l'événement. Les mesures brutes sont dans `*-mesures.json`.

Les retours de la propriétaire font autorité (`RETOURS-PROPRIETAIRE.md`). Ce domaine répond surtout au point 1 (« triste, basique ») et au point 3 (« scrollings parallaxes, le plateau qui se déplace »), et en partie au point 4 (« il faut pouvoir mourir », pour la mise en scène de la mort).

---

## Note : 4 / 10

| partie | note | en une phrase |
|---|---|---|
| Ouverture (11,5 s) | 7,5 | Riche, cohérente, bien animée : la meilleure part de la démo. |
| Interlude du colosse | 7 | Le panneau et le nom du colosse sont efficaces. |
| **Écran de jeu, soit 95 % du temps passé** | **2,5** | Un aplat presque noir quadrillé, immobile, sans profondeur ni décor. |
| Explosions et retours visuels | 6 | Belles formes, mais petites, uniformes, et une seule grosse explosion par partie. |
| Mort | 3 | Elle dure 0,28 s, sans peur ni lisibilité. |
| Écran de fin | 4 | Un encart figé posé sur une illustration qu'il cache, sans bilan. |

**Justification.** La démo a deux visages. L'ouverture tient la promesse des illustrations de `art/` : panneaux révélés au balayage, logo chromé qui se construit, soleil en bandes, grille qui file vers l'horizon. Puis, au premier toucher, on tombe sans transition dans **un écran vide à 84,7 %**, quatre fois plus sombre que l'ouverture. Le décor y reste identique de la première à la dernière seconde. Le jeu, qui est ce que la joueuse regarde 95 % du temps, n'utilise aucune des onze illustrations, aucune couleur chaude dans le décor, aucun plan de profondeur et aucun mouvement de caméra. Voilà pourquoi la démo « paraît triste ». Ce n'est pas un défaut de finition, c'est un manque de **scène**. Les fondations, elles, sont bonnes (vrais gros pixels, palette fermée, explosions tramées, lisibilité des menaces), donc le chantier est d'ajouter, pas de refaire.

---

## Les mesures qui fondent le diagnostic

Ces chiffres sont mesurés sur le tampon d'index, iPhone paysage. « Vide » est la part de pixels `#0d0221`. « Vives » est la part de magenta, rose pâle, cyan, cyan pâle, ambre, jaune, brasier et os. La luminance moyenne est la luminance relative WCAG moyenne de l'image.

| image | vide | vives | luminance moy. | pixels changés en 0,5 s |
|---|---|---|---|---|
| illustration `affiche` | 0 % | 21,1 % | 0,116 | — |
| illustration `victoire` | 0 % | 33,8 % | 0,171 | — |
| illustration `horizon` | 0 % | 7,1 % | 0,039 | — |
| ouverture, titre (7 s) | 0 % | 10,3 % | 0,089 | 12,3 % |
| ouverture, briefing (14 s) | 0 % | 6,0 % | 0,048 | 1,8 % |
| **jeu, t = 1 s** | **84,7 %** | **1,6 %** | **0,0155** | **1,1 %** |
| jeu, t = 25 s | 83,2 % | 2,9 % | 0,022 | 2,6 % |
| jeu, t = 58 s | 80,2 % | 5,4 % | 0,036 | 4,1 % |
| jeu, t = 87 s (colosse, 22 ennemis) | 75,4 % | 7,6 % | 0,043 | 4,6 % |
| écran de défaite (fin + 1,2 s) | 0 % | 3,0 % | 0,037 | 0,08 % |

Ce qu'on en tire :

- **Au pic du chaos, l'écran de jeu reste vide aux trois quarts.** Il est plus sombre que toutes les illustrations et 5,7 fois plus sombre que l'ouverture au titre (0,0155 contre 0,089 au début de la partie).
- **Le décor ne change jamais.** L'indigo occupe 3,61 % de l'écran à t = 1 s et 3,36 % à t = 91 s, le violet 0,75 % puis 0,75 %. Toute la « montée » visuelle vient des sprites, jamais du monde.
- **Au départ, rien ne bouge.** 1,1 % de pixels changés en une demi-seconde, et aucun ennemi pendant les six premières secondes.
- **Bureau et portrait donnent le même résultat :** 84,6 % de vide sur bureau à t = 1 s, 79 % en portrait.
- **La grille de sol est presque invisible.** Contraste indigo sur vide : 1,41 : 1. Nuit sur vide : 1,07 : 1. Violet sur vide : 1,74 : 1.

Captures de référence :

| ce qu'elle montre | fichier |
|---|---|
| l'écran de départ | `paysage-jeu-0.5s-jeu-t1.png` |
| milieu de partie | `paysage-jeu-045s-jeu-t43.png` |
| le chaos | `paysage-jeu-121s-jeu-t87.png` |
| ce que promettent les illustrations | `paysage-intro-0_5s.png`, `paysage-intro-8_5s.png` |
| la comparaison avec SNAKE 2030 | `s2030-jeu-c.png` |

**Sur SNAKE 2030.** Son niveau 1 est lui aussi sombre et quadrillé (`s2030-jeu-c.png`). Sa richesse est ailleurs :

- un monde de 2600 × 1600 suivi par une caméra inclinée en perspective (`snake2030/src/10-core.js`, `P.toScreen`, `K.ARENA_W`) ;
- une palette et une mécanique propres à chaque niveau : autoroute à convois, champ magnétique (`snake2030/src/25-levels.js`, `_lvDefs`) ;
- une poussière de données en parallaxe (`_lvDust`), des traits de vitesse, un cadre qui pulse en rouge au danger ;
- une interface qui raconte la partie : NIVEAU 1 — LA GRILLE, une barre de progression, des jauges BOOST et APOGÉE.

La démo a gardé le fond sombre de 2030, mais elle a perdu tout le reste.

---

## Les défauts

### V1 — BLOQUANT. Le décor de jeu est une grille plate sur un fond vide

- **Preuve.**
  - 84,7 % de vide à t = 1 s et encore 75,4 % au pic (tableau plus haut).
  - Dans le code, le fond se résume à `buildBG()` et `drawBG()` (`src/70-game.js`, lignes 1184 à 1222) : un treillis de 48 px en indigo, des sous-lignes tramées en nuit et quelques « impulsions » de 6 px.
  - Ces impulsions sont au plus 4 + 14 = 18, soit 108 pixels, ou 0,13 % de l'écran au maximum de la tension. Elles sont invisibles sur les captures.
  - L'illustration `horizon`, que `CONTRAT.md` autorise explicitement comme « arrière-plan lointain, en parallaxe lente et assombri », n'est jamais appelée par 70-game.js : `grep horizon src/70-game.js` ne renvoie rien.
  - Aucun soleil, aucune cité, aucun monolithe, aucun relief.
- **Pourquoi c'est bloquant.** C'est la cause n° 1 de « triste ». L'œil passe de l'univers des illustrations à un écran de veille.
- **Correction.** Remplacer le fond par une pile de plans, dessinés du plus loin au plus proche (le détail est en V2) :
  1. un **ciel** tramé de nuit vers violet, avec étoiles ;
  2. le **soleil en bandes** de `horizon`, assombri d'un cran (magenta devient sang, jaune devient ambre) pour ne jamais concurrencer les ennemis ;
  3. la **cité de monolithes** lointaine : silhouettes en ardoise et indigo, fenêtres en ambre qui clignotent à moins de 3 Hz ;
  4. des **structures intermédiaires** (pylônes, arches, monolithes brisés) en ardoise, avec un liseré violet ;
  5. le **sol de jeu** : une grille en perspective dont les lignes proches passent en violet et en magenta tramé à 25 %, et les lignes lointaines en indigo ;
  6. un **avant-plan** clairsemé (débris, câbles, poussière de données) qui passe devant tout sauf les menaces et la joueuse.

  **Règle de lisibilité à garder :** aucun cyan dans le décor ; le magenta du décor toujours tramé à 50 % au plus, ou assombri en sang ; chaque ennemi garde son contour d'un pixel en nuit profonde, comme aujourd'hui.

  **Objectif mesurable :** vide sous 35 % à t = 1 s, luminance moyenne entre 0,035 et 0,06 sans les sprites, couleurs vives du décor seul entre 3 % et 6 %.

### V2 — BLOQUANT. Pas de monde, pas de caméra, pas de parallaxe

- **Preuve.**
  - L'en-tête de 70-game.js le dit en toutes lettres : « L'ARÈNE EST L'ÉCRAN. Pas de caméra » (ligne 12).
  - La tête est bornée à l'arène par `P.x = clamp(P.x, AL, AR)` (ligne 502).
  - À t = 1 s, 1,1 % des pixels changent en 0,5 s : l'écran est presque une photo.
  - La propriétaire le demande en propres termes : « des scrollings parallaxes, le plateau qui se déplace » (retour n° 3).
- **Correction.**
  - **Le monde.** Un monde d'environ 3 × 2,5 écrans, soit à peu près 1260 × 500 pixels de jeu en paysage, et une caméra qui suit la tête avec une avance dans le sens de la marche, de 20 à 30 % de la demi-largeur, amortie. C'est le principe de `snake2030/src/10-core.js`, lignes 1086 à 1100.
  - **Le décor en perspective.** Pour garder une vue de dessus jouable tout en ayant un horizon, le plan de jeu devient un **sol vu en plongée inclinée**. L'horizon et la cité occupent une bande du haut (15 à 20 % de la hauteur en paysage, 25 % en portrait), et la grille de sol est en perspective dessous. C'est la technique « raster » de Space Harrier et Out Run : une échelle par rangée, très peu coûteuse dans un tampon de 422 × 195.
  - **Les vitesses de défilement, en fraction du déplacement de la caméra :**

    | plan | vitesse |
    |---|---|
    | ciel | 0 |
    | soleil | 0,03 |
    | cité lointaine | 0,12 |
    | structures moyennes | 0,35 |
    | sol | 1,0 |
    | avant-plan | 1,3 |

  - **Le bord du monde.** Un mur lumineux qui tue (retour n° 4), pas un bord d'écran.
  - **Une mini-carte de 40 × 16 px** en haut, à la manière du scanner de Defender : les ennemis hors champ en points magenta, le colosse en gros point qui bat. Elle remplace avantageusement les marques de bord actuelles (`drawEdgeTicks`).
  - **Côté technique.** Il faut un décalage de caméra partagé, par exemple `N.S.cam` lu par 50-fx.js et 70-game.js, car 50-fx.js écrit aujourd'hui directement dans le tampon aux coordonnées écran.
  - **Objectif mesurable :** à vitesse de croisière, au moins 15 % de pixels changés en 0,5 s rien que par le défilement du décor.

### V3 — MAJEUR. La coupure brutale entre l'ouverture et le jeu

- **Preuve.**
  - `finOuverture()` (`src/60-intro.js`, lignes 530 à 535) fait seulement `s.phase = 'play'` : aucune transition.
  - On passe d'une image à l'autre du briefing (0 % de vide, luminance 0,048, 11 couleurs) au jeu (84,7 % de vide, luminance 0,0155) : `paysage-intro-14s.png` puis `paysage-jeu-0.5s-jeu-t1.png`.
  - `DIRECTION.md` demande pourtant une « transition vers le jeu ».
- **Correction.** Faire une plongée d'environ 0,8 s, sautable, sur le modèle du « warp » de Tempest. La caméra part de l'image `horizon` du titre, descend dans la grille, et l'horizon reste en place : c'est lui qui devient le ciel du jeu (V1 et V2). Le serpent jaillit de l'étincelle cyan au centre. Ainsi l'ouverture et le jeu partagent le même monde.

### V4 — MAJEUR. Deux minutes dans un décor qui ne change pas

- **Preuve.**
  - Le décor est identique d'un bout à l'autre : indigo à 3,61 % puis 3,36 %, violet à 0,75 % puis 0,75 %, entre t = 1 s et t = 91 s.
  - La tension ne pilote que le nombre d'impulsions de la grille (70-game.js, ligne 1212).
  - Le colosse arrive sans que le monde réagisse.
- **Correction.** Trois actes visuels, branchés sur `tension()` :
  - **le calme**, de 0 à 40 s : nuit violette, soleil bas, grille froide ;
  - **la montée**, de 40 à 75 s : le soleil monte de quelques pixels, la grille chauffe (lignes proches en magenta tramé), les fenêtres de la cité s'allument et l'avant-plan s'agite ;
  - **le chaos**, de 75 à 120 s : ciel en sang tramé, éclairs ponctuels sur l'horizon (sous le limiteur de flashs), débris qui tombent au premier plan, cadre d'alarme pulsé, et la **silhouette du colosse dans le plan lointain pendant son télégraphe**, avant qu'il n'entre en jeu.

  Ajouter le **cyclage de palette** : faire tourner les index des lignes de sol, des fenêtres et des impulsions. C'est la technique d'animation des jeux à palette fermée des années 80. Elle ne coûte rien et respecte la règle des seize couleurs. Sa vitesse suit la tension.

### V5 — MAJEUR. La palette chaude est absente du jeu

- **Preuve.**
  - Couleurs vives : 1,6 % à t = 1 s, 9 % au pic. Les illustrations sont entre 21 % (`affiche`) et 34 % (`victoire`).
  - Dans le jeu, ambre, jaune et brasier ne viennent que des cellules d'énergie et des explosions.
  - Le magenta, la couleur signature de la synthwave, est réservé aux ennemis : le décor n'en a donc aucun, ni dégradé de coucher de soleil ni reflet.
- **Correction.** Elle passe par V1 et V4. Il faut en plus deux règles précises :
  - **les chaudes du décor sont toujours assombries d'un cran** (le soleil passe de jaune à ambre, de magenta à sang) et **tramées**, pour que le magenta plein et le jaune plein restent l'apanage des menaces et du butin ;
  - **le reflet** : sous le soleil, des bandes ambre et sang qui ondulent sur la grille, comme dans `exterieur` et `affiche`.

### V6 — MAJEUR. L'interface ne montre ni le temps ni la progression

- **Preuve.**
  - `drawHUD()` (70-game.js, lignes 1418 à 1444) affiche le score, les cœurs, le défi et le bouton son. Rien d'autre.
  - La mission annoncée au briefing est « TIENS 2 MINUTES », mais aucun chronomètre ni aucune barre n'indique où on en est.
  - SNAKE 2030 affiche le nom du niveau, une barre de progression, les jauges BOOST et APOGÉE, et le multiplicateur (`s2030-jeu-c.png`).
  - Le multiplicateur de score (`mult()`, jusqu'à × 8) n'est affiché nulle part.
- **Correction.**
  - Un chronomètre 1:47 en police 5 × 7 à l'échelle 2, centré en haut.
  - Sous le chronomètre, une barre de 6 segments de 20 s : chaque segment franchi clignote une fois et déclenche une annonce « PHASE 3 » à la manière de Galaga.
  - Le multiplicateur « × 4 » à côté du score, qui grossit d'un pixel à chaque palier.
  - Les 10 dernières secondes en jaune, avec un compte à rebours.
  - Le défi peut passer sur une deuxième ligne plus discrète.

### V7 — MAJEUR. La mort dure 0,28 s, ne se lit pas et ne fait pas peur

- **Preuve.**
  - `MORT_D = 0.28` (70-game.js, ligne 71).
  - `die()` (ligne 567) pose une explosion de force 0,7 et un gel de 4 images.
  - L'écran de fin se pose 0,2 s plus tard : la capture `paysage-defaite-a-mort-t85-finT0.0.png` est suivie de `…-b-fin-t85-finT0.2.png`.
  - La boule de l'explosion est orange (brasier), comme celle de n'importe quel ennemi : l'identité cyan de la joueuse disparaît au moment où elle meurt.
  - Pas de ralenti, pas de désaturation, pas de texte, pas de coupure du tube.
- **Correction.** Une séquence de 1,2 à 1,5 s, sautable après 0,5 s :
  - **de 0 à 0,15 s** : gel, silhouette du serpent en os, tout le reste du monde remappé en nuit et ardoise (une table d'index, sans nouvelle couleur) ;
  - **de 0,15 à 0,9 s** : ralenti au quart de la vitesse, le serpent se désagrège segment par segment en pixels cyan et cyan pâle qui s'envolent (les débris existent déjà), une explosion **cyan** centrée sur la tête ;
  - **de 0,9 à 1,3 s** : le tube s'éteint, l'image s'écrase en une ligne horizontale puis en un point, comme une vieille télé (20-crt.js sait déjà travailler sur la sortie), et SIGNAL PERDU s'affiche en magenta.

  La règle J-17 (fin en moins d'une seconde) est à revoir : la propriétaire demande une mort « qui fait peur », et elle prime.

### V8 — MAJEUR. L'écran de fin est figé, cache son illustration et ne fait aucun bilan

- **Preuve.**
  - 0,00 à 0,04 % de pixels changés par image sur la défaite (`paysage-defaite-mesures.json`), 0,08 % sur la victoire.
  - L'encart de 230 × 94 (`drawFinTop()`, lignes 1489 et suivantes) est posé au centre, pile sur le point focal du panneau : le serpent qui se dissout (`paysage-defaite-e-fin-t85-finT2.4.png`) et le serpent qui fracasse la grille (`paysage-victoire-f-fin-t120-finT0.9.png`).
  - Victoire et défaite partagent la même mise en page ; seule la couleur du titre change.
  - En portrait, l'écran est vide à 44,7 % (`portrait-defaite-c-fin-t78-finT3.1.png`).
  - Aucun chiffre de partie n'est montré : ni kills, ni plus longue chaîne, ni longueur maximale, ni temps tenu.
- **Correction.**
  - **Le placement.** Poser l'encart dans le tiers bas en paysage, et sous le bandeau en portrait, en prolongeant le panneau en haut et en bas avec le ciel et le sol de V1.
  - **Le bilan, compté ligne par ligne** comme en arcade, avec un bip à chaque ligne : KILLS 196, CHAÎNE MAX 23, LONGUEUR 64, COLOSSE ✓, puis une **note en lettre** (S, A, B, C) qui tombe avec une secousse.
  - **La victoire** : un feu d'artifice d'explosions dorées en boucle lente, passé par `N.fx.flashGate`.
  - **La défaite** : CONTINUER ? avec un compte à rebours de 9 à 0, le geste le plus iconique des bornes.
  - **Le record** : saisie de trois initiales façon borne, au doigt.

### V9 — MAJEUR. Le colosse est un jouet à côté de son panneau

- **Preuve.**
  - Le sprite fait 49 × 49 pixels de jeu, soit 2,9 % de l'écran et 25 % de la hauteur (mesure `N.spr.make('colosse')`). Voir `paysage-jeu-121s-jeu-t87.png`.
  - L'interlude (`paysage-jeu-095s-jeu-interlude-t76.png`) promet une montagne mécanique devant le soleil. Le jeu livre un robot compact à peine trois fois plus large qu'une tourelle de 15 px.
- **Correction.**
  - Un colosse de 120 à 160 pixels de jeu de haut, qui déborde de l'écran grâce à la caméra (V2).
  - Pendant son télégraphe, il **apparaît d'abord dans le plan lointain** comme silhouette devant le soleil, puis avance vers le sol de jeu, sur le modèle de R-Type et de Xevious.
  - L'œil est la cible et les plaques tombent à 75, 50 et 25 % de vie. Les débris tombés restent sur la grille.
  - À sa mort, l'explosion actuelle (`paysage-colosse-mort-img4.png`) est bonne et peut rester, mais il faut y ajouter la carcasse qui s'effondre en arrière-plan.

### V10 — MAJEUR. En portrait, un quart de l'écran est mort, et le titre a un défaut

- **Preuve.**
  - En jeu, le quart bas (zone du pouce, J-09) est une grille assombrie sans rien : `portrait-jeu-015s-jeu-t15.png`.
  - Les tirs traversent cette zone et sortent.
  - Au titre, un **rectangle tramé net** apparaît au-dessus du soleil, à la jointure entre le ciel prolongé et l'image `horizon` : `portrait-intro-8_5s.png`, entre environ 340 et 560 px CSS de hauteur. C'est le bord de l'illustration qui se voit.
- **Correction.**
  - En jeu, la zone du pouce devient le sol en perspective le plus proche (V2). Elle reste plus sombre, mais elle est vivante et défile.
  - Au titre, fondre le haut de `horizon` dans `ciel()` par un tramage progressif sur 12 à 16 rangées (`src/60-intro.js`, `scTitre` et `ciel`, lignes 663 et 469) au lieu d'une limite franche.

### V11 — MINEUR. Les explosions des kills sont petites et toutes pareilles

- **Preuve.**
  - `kill()` (ligne 914) appelle `boom` avec une force de 0,32 (flèche, mine) ou 0,45 (tourelle, sentinelle), soit un rayon de 20 à 27 px.
  - La secousse est d'environ 2 px.
  - La seule grosse explosion (force supérieure à 0,6) de la partie est celle du colosse.
  - L'enchaînement des kills n'a aucune traduction visuelle : `paysage-kill15-img4.png`, qui montre la chaîne 5/10, ressemble à `paysage-kill1-img4.png`.
- **Correction.**
  - Monter la force avec la chaîne : + 0,03 par kill enchaîné, plafonnée à 0,58, donc toujours sous le seuil « grosse » et sous le limiteur.
  - Au 5e, au 10e et au 15e kill enchaîné : une onde de choc de toute la largeur, en anneau jaune tramé, et le texte « × 5 » en grand qui écrase l'écran pendant 0,4 s.
  - Tourelle et sentinelle à 0,55.
  - Le limiteur de flashs reste le garde-fou.

### V12 — MINEUR. Les gains de score se chevauchent et sortent de l'écran

- **Preuve.** Dans `paysage-jeu-121s-jeu-t87.png`, « +800 » est coupé au bord droit. Dans `paysage-colosse-mort-img4.png`, « +2000 » et « +2000 » se superposent.
- **Correction.** Dans `pop()` (ligne 1005) et `drawPops()` :
  - borner x à [largeur / 2 + 2, W − largeur / 2 − 2] ;
  - décaler verticalement de 8 px tout gain qui chevauche un gain vivant ;
  - fusionner les gains identiques en « +2000 × 2 ».

### V13 — MINEUR. Les six premières secondes sont vides

- **Preuve.** Aucun ennemi à t = 1 s ni à t = 4 s, 1,1 % de mouvement (`paysage-jeu-003s-jeu-t4.png`). Le premier ennemi n'arrive qu'après le premier virage (ligne 509).
- **Correction.** Le décor vivant de V1, V2 et V4 comble déjà ce creux. Ajouter une **première vague chorégraphiée**, avec des flèches qui entrent en arc comme les formations de Galaga, à t = 2 s, inoffensives tant que la joueuse n'a pas tourné.

### V14 — MINEUR. Le serpent est un tube plat

- **Preuve.** Un aplat cyan à pois blancs, sans volume ni traînée (`paysage-jeu-015s-jeu-t15.png`). La tête de 13 × 13 se lit bien. Le corps de 9 × 9 se lit bien aussi, mais il est sans relief.
- **Correction.**
  - Une rangée de cyan pâle sur le bord exposé à la lumière du soleil (le haut), une rangée de nuit profonde dessous.
  - Un reflet qui court le long du corps par cyclage de palette, à environ 1 Hz.
  - Une traînée de 3 ou 4 pixels de données cyan qui s'éteignent derrière la queue, plus dense quand le serpent est long.

---

## Ce qui est bon, et qu'il faut garder

1. **Le pipeline de rendu.** Le tampon basse résolution est réel, avec un agrandissement en voisin le plus proche (`10-gfx.js`, `present()`). Les pixels sont nets sur les trois profils.
2. **La palette fermée de seize couleurs** et le tramage de Bayer. C'est ce qui donne l'époque, et c'est le support idéal du cyclage de palette proposé plus haut.
3. **L'ouverture** (`60-intro.js`) : la révélation par bandes, la dérive par pas entiers, la ligne de balayage, l'étincelle de `connexion`, l'éveil du serpent, le logo qui se construit, le briefing tapé lettre à lettre. Note : 7,5 / 10, à garder en entier.
4. **Le tube cathodique** (`20-crt.js`) : le balayage, le halo et une caméra-ressort qui recule à l'opposé du coup. C'est discret et juste, sans fantôme.
5. **Les explosions** (`50-fx.js`) : des formes tramées qui se trouent, des éclats et des étincelles, et le limiteur de flashs WCAG. La mort du colosse (`paysage-colosse-mort-img4.png`) et la purge de victoire (`paysage-victoire-b-purge-t120-finT0.0.png`) sont spectaculaires.
6. **La lisibilité des menaces.** Les télégraphes sont en pointillés magenta gainés de nuit profonde. Le cyan reste réservé à la joueuse : contraste de 11,5 : 1 sur le vide pour elle, 5,5 : 1 pour le magenta. Il faut garder ces règles quand on ajoutera le décor.
7. **L'interlude du colosse** (panneau `boss`, nom LE CYCLOPE), et les panneaux de fin comme fond.
8. **Les plaques d'interface en nuit profonde** et la police 5 × 7 avec accents.

---

## La quintessence des hits des années 1980, appliquée à SNAKE 2975

La propriétaire a demandé de se renseigner sur les hits des années 80 et d'en tirer l'essentiel. Voici, pour chaque jeu, ce qui le rendait vivant à l'écran et ce que SNAKE 2975 doit en reprendre.

| hit | ce qui le rendait vivant | à reprendre |
|---|---|---|
| **Moon Patrol** (Irem, 1982) | Souvent cité comme le premier jeu d'arcade à parallaxe complète : trois plans de décor qui défilent chacun à sa vitesse. | V2 : ciel, cité, structures, sol et avant-plan à des vitesses différentes. C'est exactement la demande n° 3 de la propriétaire. |
| **Scramble / Super Cobra** (Konami, 1981) | Un champ d'étoiles fixe sous un relief qui défile, et ce relief est lui-même un danger. | Le bord du monde comme mur qui tue, et des structures du décor qui deviennent des obstacles dans les phases tardives. |
| **Defender** (Williams, 1981) | Un monde plus large que l'écran, et un **scanner** en haut qui montre tout le monde à la fois. | La mini-carte de V2. |
| **Space Harrier** (Sega, 1985) et **Out Run** (Sega, 1986) | Un sol en damier ou une route qui file vers l'horizon : la vitesse se lit dans le sol. | La grille en perspective, avec le défilement « raster » une rangée à la fois. Elle coûte peu en 422 × 195. |
| **Tempest** (Atari, 1981) | Des néons vectoriels et une **plongée** entre deux niveaux. | La transition ouverture → jeu de V3. |
| **Robotron: 2084** (Williams, 1982) | La panique par saturation : des menaces qui arrivent de partout, des explosions en éclats multicolores. | V4 (chaos) et V11 (chaînes). Robotron restait sur un seul écran : c'est la densité qui fait la panique, pas la taille du monde. |
| **Galaga** (Namco, 1981) | Les vagues entrent en **chorégraphies**, et les annonces « STAGE n » rythment la partie. | Les vagues chorégraphiées de V13 et les annonces de phase de V6. |
| **Gradius** (Konami, 1985) | Chaque étape a son décor (volcans, Moaï), et la jauge d'armes est toujours visible. | Les trois actes visuels de V4 et la jauge de longueur et de multiplicateur de V6. |
| **R-Type** (Irem, 1987) et **Xevious** (Namco, 1982) | Des boss plus grands que l'écran, ou intégrés au décor (Andor Genesis). | Le colosse de V9, qui vient du plan lointain. |
| **Pac-Man** (Namco, 1980) | Le **mode attraction** (une démo qui se joue seule) et des intermèdes. | Sur l'écran d'invite, une démo jouée par le pilote automatique au bout de 10 s sans toucher. |
| Les bornes en général | Le cyclage de palette (animer sans dessiner), INSERT COIN qui clignote, la table des records à trois initiales, CONTINUE? 9…0. | Le cyclage (V4, V14), la table des records et le compte à rebours de CONTINUER (V8). |

En une phrase : **un hit des années 80 n'a jamais un écran immobile.** Le décor défile ou cycle en permanence, le monde déborde de l'écran, la partie est découpée en scènes annoncées, et chaque fin est un rituel : bilan, initiales, CONTINUE. La démo a le style de l'époque dans ses illustrations, mais pas encore son mouvement.

Sources : [Moon Patrol (Wikipédia)](https://en.wikipedia.org/wiki/Moon_Patrol), [Parallax scrolling (Wikipédia)](https://en.wikipedia.org/wiki/Parallax_scrolling), [Parallax Scrolling (Giant Bomb)](https://giantbomb.com/wiki/Concepts/Parallax_Scrolling), [Space Harrier (StrategyWiki)](https://StrategyWiki.org/wiki/Space_Harrier), [Space Harrier (Hardcore Gaming 101)](https://www.hardcoregaming101.net/space-harrier-2/), [The Development of Robotron (Arcade Blogger)](https://arcadeblogger.com/2020/06/27/the-development-of-robotron/), [Robotron: 2084 – Total Panic by Design](https://bitvint.com/pages/the-story-of-robotron-2084).

---

## Les 10 corrections prioritaires, classées

1. **Créer un monde plus grand que l'écran, avec une caméra qui suit et une parallaxe sur 5 ou 6 plans** (V2). La propriétaire l'exige, et tout le reste en découle. Il faut au préalable un décalage de caméra partagé par 70-game.js et 50-fx.js. *Objectif : au moins 15 % de pixels changés en 0,5 s à vitesse de croisière.*
2. **Remplacer la grille sur fond vide par un décor en couches tiré de `horizon`, `exterieur` et `affiche`** : ciel, soleil en bandes assombri, cité de monolithes, structures, sol en perspective, avant-plan (V1, V5). *Objectif : moins de 35 % de vide, luminance entre 0,035 et 0,06, aucun cyan, magenta du décor tramé ou assombri.*
3. **Faire évoluer le décor en trois actes selon la tension, avec cyclage de palette** (V4). Le colosse y apparaît d'abord en silhouette dans le plan lointain.
4. **Une mort de 1,2 à 1,5 s, lisible et effrayante** (V7) : gel en os, monde désaturé, ralenti, désagrégation cyan, extinction du tube, SIGNAL PERDU.
5. **Une plongée de 0,8 s de l'ouverture vers le jeu** (V3), dans laquelle l'horizon du titre devient le ciel du jeu.
6. **Un chronomètre, une barre de six phases avec annonces, et le multiplicateur dans l'interface** (V6).
7. **Un écran de fin vivant** (V8) : encart déplacé hors du point focal, bilan compté ligne par ligne, note en lettre, feu d'artifice à la victoire, CONTINUER ? 9…0 à la défaite, initiales du record.
8. **Un colosse à la hauteur de son panneau** (V9) : 120 à 160 px, qui vient de l'arrière-plan, dont les plaques tombent, avec une carcasse qui s'effondre.
9. **Le portrait** (V10) : la zone du pouce devient le sol proche et vivant, et le rectangle tramé du titre disparaît par un fondu tramé.
10. **Des explosions qui montent avec la chaîne, et des gains de score rangés** (V11, V12), puis une première vague chorégraphiée (V13) et un serpent avec du volume et une traînée (V14).
