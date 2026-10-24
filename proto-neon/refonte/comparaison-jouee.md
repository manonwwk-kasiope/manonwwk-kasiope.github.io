# SNAKE 2975 contre SNAKE 2030 : la comparaison jouée

*17 octobre 2026. Les deux jeux ont été joués, pas lus : menus, parties complètes, morts, relances.*

## Comment j'ai joué

- **Serveur local**, Chromium sans écran (Playwright) avec le son autorisé. Deux profils : iPhone 13
  en paysage (844 × 390, toucher émulé par CDP `Input.dispatchTouchEvent`) et bureau 1440 × 900
  (clavier et souris).
- **Les mains** : un pilote qui lit l'état du jeu toutes les 70 ms et pose le doigt comme une joueuse
  appliquée. Il esquive les menaces, vise l'ennemi le plus proche et ramasse le butin. Pour mesurer
  la difficulté, j'ai ajouté deux joueuses « faibles » : une qui tourne en rond sans viser, une qui
  ne touche à rien.
- **Les parties jouées** :
  - SNAKE 2975 : 4 parties (iPhone et bureau, appliquée, maladroite, inerte), ouverture comprise.
  - SNAKE 2030 : 3 parties. La plus longue a duré **7 min 9 s de jeu** et a traversé les quatre
    secteurs et leurs quatre boss, avec 21 cartes choisies. Elle a été précédée d'un tour des menus
    (réglages, déblocages).
- **Les captures** sont dans `captures/` :
  - `n-*` : SNAKE 2975 sur iPhone ; `b-*` : SNAKE 2975 sur bureau ;
  - `s-*` : SNAKE 2030 sur iPhone ; `d-*` : SNAKE 2030 sur bureau ;
  - `i-*` : les joueuses inertes ; `u-*` : l'APOGÉE.

  Je les ai toutes regardées. Les chiffres de couleur ci-dessous sont mesurés sur ces captures.
- **Limites, dites franchement** :
  - **Le son.** Je ne l'entends pas. Je le décris par les journaux des moteurs audio
    (`N.music.journal()`, `S2030.audio.lastSfx()`) et par le code.
  - **Le pilote** a des réflexes réguliers ; une humaine est plus inégale.
  - **Deux raccourcis** pour voir deux choses que le pilote n'atteignait pas : j'ai rempli la jauge
    d'APOGÉE de SNAKE 2030 pour la capturer (`u-*`), et une joueuse inerte m'a servi à voir l'écran
    de mort de SNAKE 2030 (`i-01`, `i-02`).

---

## 1. SNAKE 2975 : une partie vue de la joueuse

### L'ouverture : 11 secondes superbes

1. **Les panneaux.** On ne touche à rien et un film commence :
   - la cité de monolithes devant un soleil rayé (`n-01`) ;
   - une main gantée qui branche un câble ;
   - un serpent cyan gueule ouverte, magnifique en vrai pixel art (`n-03`).
2. **Le logo.** SNAKE 2975 se construit en nuée de pixels devant le soleil (`n-04`).
3. **Le briefing.** Trois lignes tapées lettre à lettre dans une salle de contrôle : « AN 2975 / TU
   ES EN LIGNE / TIENS 2 MINUTES » (`n-05`), puis « TOUCHE POUR JOUER » (`n-07`).

C'est le meilleur moment de la démo. On a envie de jouer.

### La partie : 101 secondes, de l'écran vide à la défaite

- **0 s : le choc de la chute.**
  - Le film en couleur laisse place à un rectangle **noir violacé presque vide**, une grille
    violette à peine visible et un ruban cyan au milieu (`n-08`). **97 % des pixels sont
    sombres** (mesuré).
  - Au-dessus : un score à 7 chiffres, trois cœurs, « DIX KILLS EN CHAÎNE 0/10 » et un bouton son.
  - Six capsules ambre forment une ligne devant la tête ; un cercle pointillé montre le manche.
  - On tourne, on mange, le serpent s'allonge.
- **5 à 15 s.** Arrivent quelques flèches magenta, de jolies silhouettes nettes (`n-12`). Le tir
  part tout seul et les premières meurent en petites gerbes. Il ne se passe pas grand-chose : à
  15 s il y a **4 ennemis à l'écran** et l'écran est toujours à 97 % sombre.
- **30 s.** Le serpent mesure 33 perles et tire en éventail. Les flèches arrivent par paquets de
  quatre (`n-13`). C'est agréable mais **sans danger** : aucun tir ennemi, aucun coup reçu.
- **36 s : le défi est réussi.**
  - Bandeau jaune « DÉFI RÉUSSI / DIX KILLS EN CHAÎNE / +5000 TIR SURCHARGÉ +1 ♥ » (`n-14`).
    C'est le seul moment de récompense nommé de la partie.
  - **Après, il n'y a plus rien à viser.** Le défi est coché pour le reste de la partie.
- **45 à 60 s.**
  - Le serpent atteint sa **longueur maximale (64) vers 60 s**. À partir de là, manger ne sert plus
    à rien.
  - Les capsules non ramassées **s'accumulent** : 19 à l'écran à 60 s (`n-16`), 40 à 75 s
    (`n-18`), 55 à 90 s. Elles deviennent du bruit jaune.
  - Le score gonfle par paquets de « +600 », « +800 », « +2400 », jusqu'à 350 000 points
    qui ne veulent rien dire.
- **66 s : premier coup reçu de toute la partie.** C'est le laser d'une sentinelle. Explosion cyan,
  secousse, la queue est coupée de 30 % (`n-17`). **La joueuse appliquée n'a rien encaissé pendant
  66 secondes.**
- **75 s : les tourelles et les sentinelles sont là.** Ça s'anime enfin. Les explosions orange
  pleines sont très belles (`n-18`) et l'écran redescend à 88 % de pixels sombres.
- **76 s : le colosse arrive.** Interlude « ALERTE » rouge à bandes (`n-19`), puis le panneau
  « COLOSSE / LE CYCLOPE » (`n-20`). Le film coupe le jeu au moment le plus tendu, mais l'effet est
  réussi.
- **Le combat contre le colosse** (`n-22`, `n-25`).
  - Le colosse est un sprite magenta de 40 pixels qui marche dans l'arène. Il tire des lasers
    télégraphiés, puis des anneaux de balles.
  - Il meurt **en 16 secondes**.
  - Son explosion est le plus beau moment de jeu de la démo : un soleil de brasier tramé qui couvre
    un quart de l'écran, « +80000 » au centre (`n-26`).
- **101 s : la défaite.**
  - Deux flèches touchent la tête. Le serpent se dissout en pixels.
  - Écran « DÉFAITE » sur le panneau rouge illustré (`n-28`) : score, record, « DÉFI RÉUSSI »,
    « TOUCHE POUR REJOUER ».
  - Un toucher relance la partie en 1,5 s, **sans repasser par l'ouverture** (`n-29`).

### Ce qui surprend

- **Le contraste entre l'ouverture et le jeu.** On passe d'un film riche à un écran de calculatrice
  violette. L'ambiance des panneaux ne déborde jamais sur l'aire de jeu : ni horizon, ni cité, ni
  soleil derrière.
- **Les murs ne tuent pas.** Le serpent glisse le long des bords. Le corps absorbe les tirs.
- **Le colosse est petit et meurt vite**, alors que l'interlude l'annonce comme un titan.

### Ce qui ennuie

- **Les 60 premières secondes** : deux types d'ennemis, peu nombreux, et aucune pression.
- **Une fois la longueur maximale et le défi atteints, plus rien ne change dans ma façon de jouer.**
  Je fais la même chose qu'à 30 s, avec plus de bruit.

### La difficulté, mesurée

| joueuse | premier coup reçu | fin |
|---|---|---|
| appliquée (iPhone) | **66,8 s** | défaite à 101,7 s, 4 coups (avec la vie bonus du défi) |
| maladroite, tourne sans viser (bureau) | 57,5 s | défaite à 86,5 s |
| inerte, ne touche à rien (bureau) | 12,6 s | défaite à 28,3 s |

Le jeu n'est donc pas « facile » partout : on y meurt. Mais **il ne demande rien pendant une
minute**, puis il **frappe d'un coup** dans les 40 dernières secondes. La pression n'est pas
progressive, et la mort vient de flèches qu'on ne voyait plus dans le bruit jaune, pas d'une erreur
qu'on comprend.

### Le son (d'après les journaux)

- **La musique** est générative à 113 BPM : deux couches au calme, quatre au chaos.
- **Les effets** sont au nombre de **sept** : `tir`, `butin`, `kill`, `bigkill`, `degat`, `defi`,
  `intro`. Sur la partie maladroite, il y a eu 593 tirs et 57 butins contre 43 kills et 4 dégâts :
  **le tir automatique couvre tout le reste**.

---

## 2. SNAKE 2030 : une partie vue de la joueuse

### Les menus

- **Le menu principal** (`s-01`) : logo SNAKE chromé / 2030 rose, « ARCADE SURVIE — SURVIS À LA
  SURCHARGE », un gros JOUER cyan. Dessous :
  - RÉGLAGES et DÉBLOCAGES ;
  - le cran de difficulté (CRAN NORMAL 0) ;
  - « Première partie : les cartes tombent à 12 s » et le rappel des commandes.
- **Les réglages** (`s-02` à `s-04`), en trois onglets :
  - JEU : difficulté, qualité d'image, musique, effets ;
  - CONTRÔLES : manche fixe ou flottant, droitier ou gaucher ;
  - CONFORT.
- **Les déblocages** (`s-05`) : six bonus permanents à acheter en crédits gagnés en jouant.
  BIO-RALLONGE coûte 120, ORACLE 520.

C'est propre mais ça ressemble à une application web, pas à une borne d'arcade : police système,
cartes arrondies, aucune illustration.

### La partie : 7 minutes, 4 secteurs, 4 boss (bureau)

- **0 s : le premier secteur, LA GRILLE** (`s-06`).
  - Bannière « NIVEAU 1 — LA GRILLE / ÉVITE LE CONTACT, LE CANON TIRE SEUL ».
  - Le HUD est dense : score, multiplicateur, VIE 9 en barrettes, BOOST, APOGÉE, pause. Sur mobile
    s'ajoutent un manche à gauche et trois gros boutons à droite (APOGÉE, TRAVERSÉE, BOOST).
  - Le serpent est un tube cyan lumineux avec un cône de visée.
  - **Le monde est plus grand que l'écran** : la caméra suit, la grille défile, une flèche orange au
    bord montre ce qui arrive hors champ.
- **15 s.** Un artilleur à l'intérieur d'un grand cercle de portée (`s-08`). Les premiers fragments
  verts tombent.
- **12 à 20 s : la première carte** (`s-09`). Écran AMÉLIORATION / CHOISIS UNE CARTE avec trois
  cartes : PROPULSEURS, NANITES, AIMANT, chacune avec son icône, une phrase et sa rareté. **C'est le
  premier vrai choix**, et il arrive très tôt.
- **30 s : le plateau bascule.**
  - La grille passe en treillis diagonal (`s-10`). Le serpent devient violet pendant la TRAVERSÉE :
    il passe à travers les ennemis pendant 2 s.
  - Des chevrons rouges au bord annoncent les arrivées. Une jauge annonce « 1 kill → ×1,5 ».
- **45 à 60 s : la caméra plonge en perspective façon Tron** (`s-13`). La grille fuit vers
  l'horizon et le bord de l'arène est un pointillé rouge. On a l'impression de voler.
- **74 s : le boss PROTOTYPE ZÉRO.** Il a une barre de vie nommée en haut et une escorte
  (`s-16`, `s-17`).
- **Pendant le combat** :
  - le pouvoir RALENTI se déclenche (`d-16`) ;
  - l'APOGÉE, l'ultime, part en onde géante qui vide l'écran de ses 28 ennemis (`u-*`).
- **Le boss meurt.** Pluie de fragments, puis une **carte trophée** sans aucune carte commune.
  - Je prends MISSILES, puis MINES (`s-20`, `s-22`).
  - Les armes deviennent **visibles sur le corps** : tourelles le long du serpent, drone en orbite,
    mines qui tombent de la queue (`d-25`, `d-35`).
- **~100 s : NIVEAU 2 — AUTOROUTE NÉON** (`s-23`, `d-25`).
  - **Tout change** : palette rose et violette, voies de circulation en pointillé, convois-camions
    qui balaient les voies.
  - Des intercepteurs filent le long des voies avec des lignes de visée télégraphiées.
  - Le boss DOUBLE LAME est fait de deux trancheurs, avec des lasers croisés (`d-27`).
- **~190 s : NIVEAU 3 — ZONE MAGNÉTIQUE** (`d-35`, `d-38`).
  - Des nœuds bleus attirent et des nœuds ambre repoussent, dans de grands cercles qui courbent le
    serpent et les tirs.
  - Le boss NOYAU MAGNÉTIQUE arrive avec des parasites.
- **~300 s : NIVEAU 4 — SURCHARGE** (`d-43`).
  - Bannière « SURCHARGE 1 » : tout le système en même temps, en boucle infinie avec des palettes
    qui tournent.
  - À 400 s : 65 ennemis vivants, multiplicateur ×16, convois et champs mêlés, « RALENTI » plein
    écran (`d-49`).
  - Le boss SURCHARGE apparaît sur un écran saturé de pondeuses et de miroirs (`d-52`).
- **Où en était la partie à l'arrêt** :
  - 429 s de jeu, 931 ennemis détruits, 21 cartes ;
  - un build mélangé : canon, tourelles 4, drones 2, missiles, arc électrique, sillage, bouclier,
    épines, cadence, puissance, et le reste ;
  - la vie était à 64 et la partie aurait continué.

### La mort (joueuse inerte, `i-02`)

Le premier coup tombe à 18,8 s et la mort à 86,4 s. L'écran s'appelle « SIGNAL PERDU / NOUVEAU
RECORD » et il est très complet :

- la cause : « Détruit par TRAQUEUR — niveau 1 — 83 % du secteur — 1:24 » ;
- les statistiques : score, durée, niveau, progression, détruits, combo maximal ;
- l'arme, le record et les crédits gagnés (+6) ;
- le build (« TIREUR — CANON 1 ») et une astuce ;
- **« PROCHAIN DÉBLOCAGE : BIO-RALLONGE dans 114 ◆ »**, avec une barre ;
- REJOUER en rose géant.

On sait pourquoi on est mort, et on a une raison de rejouer.

### Ce qui surprend

- La bascule en perspective.
- Le changement complet d'ambiance à chaque secteur.
- Les armes qui poussent sur le corps.
- L'écran de mort qui explique la mort.

### Ce qui ennuie

- **Le premier secteur est lent**, surtout sur iPhone, où le cadrage est serré. Le monde est grand
  et les ennemis sont dispersés : 193 points à 60 s, 14 kills avant le boss.
- **Les cartes interrompent souvent** : 21 en 7 minutes, et trois coup sur coup après chaque boss.
- **La surcharge devient illisible** (`d-52`) : de petits ennemis pastel, des cercles et des lasers
  partout.
- **Sur iPhone, les boutons couvrent près d'un quart de l'écran.**
- **Le rendu vectoriel lisse est générique** : du néon flou, des polices système.
- **C'est lourd.** Dans le même Chromium sans GPU, au profil iPhone, SNAKE 2030 a joué 116 s de jeu
  en 370 s réelles. SNAKE 2975 tenait le temps réel. C'est une indication, pas un banc d'essai.

### Le son (d'après le code et le journal)

- **La musique** est une vraie piste composée, `neonvelocity.mp3` (deux versions), avec des couches
  synthétiques qui montent avec l'intensité.
- **La banque d'effets** compte **23 sons nommés** : `shoot`, `laser`, `hit`, `kill`, `bigkill`,
  `pickup`, `core`, `hurt`, `boost`, `boostEnd`, `boostDry`, `levelup`, `card`, `ultReady`,
  `ultFire`, `bossIn`, `warp`, `click`, `dead`, `shock`, `zap`, `missile`, `explode`.
- Chaque geste a son retour sonore : carte, montée de niveau, entrée de boss, ultime prêt, zoom.

---

## 3. La comparaison, sans complaisance

### Pourquoi SNAKE 2975 paraît triste et basique

| critère | SNAKE 2030 | SNAKE 2975 (démo) |
|---|---|---|
| **Couleur à l'écran pendant le jeu** | 88 à 93 % de pixels sombres au premier secteur ; grille bleue lumineuse, halos ; palette différente par secteur (bleu, rose, indigo, magenta) | **97 % de pixels sombres pendant les 30 premières secondes**, puis 88 % seulement quand le chaos arrive. Une seule ambiance violette du début à la fin. Le soleil, la cité et l'horizon de l'ouverture **disparaissent** du jeu |
| **Vie à l'écran** | caméra qui suit, zoom qui respire, roulis, bascule 3D, treillis animé, convois, champs magnétiques, flèches hors champ | arène fixe de la taille de l'écran, grille immobile, aucun décor, aucun danger d'arène |
| **Rythme** | 5 temps par secteur (calme, montée, déferlement, apogée, accalmie) avec barre de progression ; boss ; respiration ; secteur suivant | une rampe unique de 2 minutes : vide pendant 60 s, puis débordé, puis fin |
| **Variété** | 11 ennemis aux rôles distincts, 6 modificateurs d'élite, 4 boss, 3 mécaniques d'arène | 4 ennemis, aucun élite, 1 boss, 0 mécanique d'arène |
| **Récompenses** | cartes (≈ 50, 4 raretés, montées de niveau), carte trophée de boss, multiplicateur visible, crédits | longueur (plafonnée à 64 dès 60 s), score qui gonfle, un seul défi |
| **Progression** | dans la partie : build, armes visibles, secteurs. Entre les parties : crédits, 6 déblocages, crans de difficulté, record par cran | aucune, à part le record |
| **Choix** | une carte sur trois toutes les 20 à 30 s, boost, pouvoir, ultime, réglages de contrôle | **aucun choix**, à part la direction |
| **Verbes** | diriger, booster, traverser, ralentir, déclencher l'APOGÉE | diriger (et Espace accélère le tir au clavier) |
| **Sons** | piste composée, couches, 23 effets | musique générative, 7 effets, dominés par le tir |
| **Mort** | la vie, c'est la longueur ; les coups coupent des segments ; écran qui nomme le tueur | 3 vies, 2 s d'invulnérabilité, murs inoffensifs, corps-bouclier ; écran de fin sans cause |
| **Méta** | menu, réglages, déblocages, crans, « prochain déblocage dans 114 ◆ » | pas de menu : ouverture, puis jeu |

**En une phrase :** SNAKE 2975 est un très bel **emballage** (ouverture, interludes, écran de fin,
explosions) autour d'un **jeu d'une seule idée**. SNAKE 2030 est un **jeu riche** dans un emballage
quelconque.

### Ce que SNAKE 2975 fait déjà mieux, et qu'il faut garder

1. **L'identité.** Le vrai gros pixel, les 16 couleurs, la police 5 × 7 maison et le balayage
   cathodique donnent une époque et une signature. SNAKE 2030 ressemble à beaucoup de jeux néon.
2. **Les cinématiques.** L'ouverture de 11 s, le logo qui se construit, le briefing tapé,
   l'interlude ALERTE puis LE CYCLOPE, les fonds VICTOIRE et DÉFAITE illustrés. SNAKE 2030 n'a
   aucune image : rien que des bannières de texte.
3. **Les explosions.** La mort du colosse remplit un quart de l'écran d'anneaux de brasier tramés
   (`n-26`). Aucune explosion de SNAKE 2030 n'a ce poids.
4. **La lisibilité.**
   - Les silhouettes magenta à contour sombre, le cyan réservé à la joueuse et les télégraphes nets
     se lisent mieux que les petits ennemis pastel de la surcharge de SNAKE 2030.
   - Le HUD tient sur une ligne.
   - Le manche flottant se pose n'importe où, sans boutons qui mangent l'écran.
5. **La vitesse d'accès.** Un toucher et on joue ; un toucher et on rejoue en 1,5 s.
6. **Le plaisir immédiat du tir.** La volée passe de 1 à 2, 3 puis 5 canons avec la longueur, et les
   « +600 » jaunes pleuvent.
7. **Les performances.** Le tampon est neuf fois plus petit. La démo tient le temps réel là où
   SNAKE 2030 rame dans les mêmes conditions.
8. **Le défi nommé.** Le bandeau jaune avec la coche et la récompense est une très bonne forme ; il
   en faut simplement beaucoup plus.

---

## 4. Les idées de SNAKE 2030 à reprendre (inventaire)

Il y a **26 idées**, toutes vues en jeu. « En mieux » veut dire : en gros pixels, dans la palette,
avec la lisibilité et les cinématiques de SNAKE 2975.

### Le monde et la caméra

1. Un monde plus grand que l'écran, une caméra qui suit et des flèches pour ce qui est hors champ.
2. Un zoom qui respire (rapproché, puis recul) et qui recule quand on accélère.
3. Des phases de caméra : roulis, et bascule en perspective façon Tron pendant 22 s.
4. Des secteurs à palette et mécanique propres : grille nue, autoroute à convois, zone magnétique,
   surcharge infinie qui recombine tout.
5. Un rythme en cinq temps par secteur, avec une barre de progression du secteur.
6. Des dangers d'arène : des convois qui balaient les voies, des nœuds qui courbent les trajectoires.

### Les adversaires

7. Un boss nommé par secteur, avec barre de vie, escorte et ralenti d'entrée.
8. Une carte trophée à la mort du boss (jamais commune).
9. Onze ennemis aux rôles distincts : traqueur, intercepteur, mine, artilleur, trancheur, pondeuse,
   larve, parasite, brouilleur, voleur, miroir.
10. Six modificateurs d'élite : blindé, rapide, téléporteur, explosif, régénérant, bouclier.

### Le build

11. Des cartes d'amélioration : une sur trois, quatre si plusieurs montées sont en attente.
    Environ 50 cartes en 7 axes et 4 raretés, chacune avec ses niveaux.
12. Des armes montées et visibles sur le corps : tourelles, drones, missiles, mines de queue,
    sillage, arc électrique.
13. Des synergies : détonation en chaîne, napalm, grappe, singularité.
14. Un build nommé en fin de partie (« TIREUR — CANON 1 »).
15. Des fragments d'XP qui font monter de niveau.

### Les commandes et le score

16. Un boost à jauge.
17. Un pouvoir à recharge : TRAVERSÉE, RALENTI ou REPLI.
18. Un ultime chargé par l'action (APOGÉE), en onde qui vide l'écran.
19. Un multiplicateur de combo à jauge, avec l'objectif écrit (« 2 kills → ×1,5 »).
20. La longueur, c'est la vie : chaque coup coupe des segments.

### Autour de la partie

21. Des crédits gagnés, six déblocages permanents et le « prochain déblocage » affiché.
22. Des crans de difficulté (« rejouer au cran supérieur ») et un record par cran.
23. Un écran de mort qui nomme le tueur, le secteur, le pourcentage et le build.
24. Des bannières et des messages : NIVEAU, SURCHARGE 1, POUVOIR PRÊT, APOGÉE PRÊT.
25. Une vraie piste musicale sous des couches qui suivent l'intensité, et une vingtaine d'effets
    distincts.
26. Des réglages : difficulté, son et musique séparés, manche fixe ou flottant, gaucher, confort.

---

## 5. Les 10 manques les plus graves de SNAKE 2975, classés

### 1. Aucun choix, aucun build

On fait la même chose à 100 s qu'à 10 s. C'est la cause première du « basique ».

**À faire :**
- Des cartes d'amélioration en gros pixels : trois cartes illustrées dans la palette, avec un
  liseré de rareté et une phrase en police 5 × 7.
- Les fragments d'XP tombés des ennemis les déclenchent : la première carte vers 12 s, puis toutes
  les 20 à 30 s, et une carte trophée par boss.
- Les armes se voient sur le corps : tourelles en perles ambre, drone en orbite, mines lâchées par
  la queue.
- Après chaque boss, on choisit sur **un seul écran** : pas trois cartes coup sur coup comme dans
  SNAKE 2030.

### 2. Un plateau noir, fixe, de la taille de l'écran

97 % de pixels sombres pendant 30 s, et l'univers de l'ouverture absent du jeu. C'est la cause
première du « triste », et c'est aussi le retour n° 3 de la propriétaire.

**À faire :**
- Un monde de 3 à 4 écrans et une caméra qui suit la tête.
- Trois plans de parallaxe tirés des illustrations existantes :
  - au loin, `horizon` et `exterieur` avec le soleil rayé et la cité ;
  - au milieu, des monolithes et des pylônes ;
  - au premier plan, une grille au sol qui défile.
- Un zoom qui respire, et une **bascule en perspective en pixel** : la grille au sol projetée vers
  l'horizon, ce que 60-intro.js sait déjà dessiner.
- Viser au moins 25 % de pixels non sombres en jeu, en gardant les ennemis lisibles grâce à leur
  contour en nuit profonde.

### 3. Une seule arène, une seule rampe, deux minutes, puis fini

**À faire :**
- Des secteurs enchaînés, chacun avec une dominante de couleur prise dans les 16 (ambre et brasier,
  magenta et sang, indigo et cyan), une mécanique propre, cinq temps et un boss.
- Au moins trois secteurs et une surcharge infinie qui recombine tout.
- Entre deux secteurs, un interlude illustré de 2 s, comme celui du colosse, pour faire avancer
  l'histoire de 2975.

### 4. On ne peut pas vraiment mourir, et on n'a pas peur

Les murs glissent, le corps sert de bouclier, il y a 3 vies et 2 s d'invulnérabilité, le premier
ennemi arrive à 12 s et la joueuse appliquée ne prend son premier coup qu'à 67 s. Ce sont les
retours n° 2 et n° 4.

**À faire :**
- Une mort franche au mur : un télégraphe de bord rouge qui pulse quand la tête s'approche, comme le
  pointillé de SNAKE 2030.
- La longueur comme vie : un coup coupe des segments, et la mort survient quand il n'en reste plus.
  Ou bien une tête unique très fragile. Il faut trancher, mais pas de vies cumulées.
- De la pression dès 5 s, de vrais tirs ennemis dès la première minute, et des élites.
- Garder la justice de SNAKE 2975 (télégraphe ≥ 0,6 s, petite zone qui tue) et l'écran de mort qui
  nomme le tueur.

### 5. La variété des menaces est pauvre

Quatre ennemis, pas d'élites, pas de danger d'arène, et un colosse de 40 px qui meurt en 16 s.

**À faire :**
- Reprendre les onze rôles de SNAKE 2030 en silhouettes 16 à 32 px. Le voleur, la pondeuse, le
  miroir et les larves sont les plus neufs.
- Ajouter les six modificateurs d'élite, avec un liseré ou un halo tramé propre à chacun.
- Ajouter les dangers d'arène : convois sur voies, nœuds magnétiques.
- Des boss **énormes** (un tiers de l'écran, puisque la caméra le permet), en plusieurs phases,
  avec au moins 45 s de combat.

### 6. La récompense sature puis devient du bruit

La longueur plafonne à 64 vers 60 s. Ensuite les capsules s'empilent : 40 à l'écran à 75 s, 55 à
90 s. Le score gonfle à 350 000 sans repère.

**À faire :**
- Le butin nourrit l'XP, donc les cartes, au lieu d'une longueur plafonnée.
- Les capsules non ramassées s'éteignent vite ou sont aspirées.
- Un multiplicateur de combo visible sous le score, avec son objectif écrit.
- Des crédits gagnés en fin de partie.

### 7. Un seul verbe : diriger

**À faire :**
- Un boost à jauge ; au doigt, par un double toucher ou un second doigt n'importe où.
- Un pouvoir à recharge, au choix parmi TRAVERSÉE, RALENTI ou REPLI.
- Une APOGÉE chargée par les kills, qui part en anneaux concentriques tramés sur tout l'écran.
  C'est exactement ce que 50-fx.js sait faire, avec le gel et la secousse.
- Au doigt, ne pas reproduire les trois gros boutons de SNAKE 2030 : gestes ou boutons
  semi-transparents dans les coins seulement.

### 8. Aucune raison de revenir

Pas de menu, pas de crédits, pas de déblocages, pas de crans, pas de réglages. L'écran de fin ne
dit ni ce qui a tué, ni le build, ni les statistiques.

**À faire :**
- Un écran-titre jouable sur l'`affiche`, avec JOUER, DÉBLOCAGES et RÉGLAGES en 5 × 7.
- Des crédits, des déblocages permanents et des crans de difficulté avec un record par cran.
- Un écran de fin sur les panneaux VICTOIRE ou DÉFAITE qui ajoute :
  - « DÉTRUIT PAR … — SECTEUR … — … % » ;
  - le build ;
  - le prochain déblocage, avec sa barre.

### 9. Un seul défi, réussi à 36 s, puis plus rien à viser

**À faire :**
- Trois défis nommés par secteur (chaîne, sans dégât, boss en moins de N secondes, voleur abattu),
  affichés dans le même bandeau.
- Chaque réussite donne une récompense qui se voit : carte, crédits, vie.
- Un défi raté ne coupe pas le suivant.

### 10. Un son pauvre, dominé par le tir

Sept effets ; le tir pèse 593 appels contre 43 kills sur une partie.

**À faire :**
- Brancher les musiques Suno prévues (`SUNO.md`) au-dessus du moteur génératif, une par secteur et
  une par boss.
- Monter à une vingtaine d'effets distincts : carte, montée de niveau, entrée de boss, ultime prêt
  et ultime, boost, pouvoir, convoi, élite, mort, déblocage.
- Baisser le tir de 6 à 8 dB, l'espacer, et donner aux kills et au butin des notes qui montent
  avec la chaîne.
