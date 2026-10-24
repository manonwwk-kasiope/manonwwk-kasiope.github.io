# SNAKE 2975 — la vision : de 1976 à l'intergalactique

> **L'état d'esprit du jeu, en une phrase (la propriétaire) : « un snake qui traverse l'univers ».**
> Tout ce qui suit en découle : le serpent part d'un écran de terminal de 1976 et finit entre les galaxies.
> Chaque décision de conception se juge à cette aune : est-ce que ça fait sentir le voyage ?

Décision de la propriétaire (18 octobre 2026), à mettre en œuvre par la cheffe d'orchestre (session Claude du
Mac) et les agents qu'elle pilote. Ses mots :

> « Parfois aussi, le jeu ralentit, façon warp, et un curseur cible se déplace, permettant de lancer des
> missiles, bombes, mines, tirs de laser sur des vaisseaux ou ennemis. Ça peut être décisif si les ennemis sont
> super rapides. Je veux des ennemis sur des plans parallèles, plus profonds et au-dessus de nous. On doit aussi
> pouvoir changer de "hauteur" de niveau. Ce jeu doit être une dinguerie. Je veux que tout ça arrive
> progressivement afin de montrer la profondeur infernale du jeu. Commencer par un snake tout bidon genre années
> 1970 avec des musiques binaires, et finir dans l'univers intergalactique. »

Décisions déjà prises qui s'y rattachent : le tempo **change** pendant la partie pour surprendre (COORDINATION.md,
chantier 1) ; des scènes en **3D isométrique inclinée** et des scènes où le serpent **suit la grille**
(prototype `refonte/prototypes/la-grille.html`) ; des **mini-films 8 bits** entre les moments (INTERMEDES.md) ;
**BOUCLIER** et **RÉPARATION** pour protéger et régénérer les bonus (fait).

## 1. Le principe : chaque époque ajoute UNE dimension

Le joueur ne doit jamais tout voir d'un coup. Il commence dans un jeu qu'il croit connaître — le snake le plus
pauvre qui soit — et chaque époque lui retire un mur : la couleur, puis la liberté de mouvement, puis la
profondeur, puis le temps, puis l'espace. La surprise vient de ce que **le jeu se révèle plus grand qu'il n'en
avait l'air**, une couche à la fois. Chaque passage d'époque est un intermède (film 8 bits Higgsfield), un
changement de musique ET de tempo, et l'introduction d'une seule mécanique nouvelle, apprise sans texte.

| époque | ce qu'on voit | ce qu'on entend | la mécanique qui arrive | durée |
|---|---|---|---|---|
| **1976 — LE TERMINAL** | grille, 2 couleurs (vide + cyan, à la rigueur os), gros carrés, rien ne bouge que le serpent | bips binaires en onde carrée, un seul canal, tempo lent | le snake d'origine : case par case, manger, grandir, le mur tue, se mordre coupe | 45-60 s |
| **1982 — L'ARCADE** | la grille se fissure, 4 couleurs, premiers ennemis simples (flèches) | chiptune 3 voix, tempo plus vif | **la grille se brise** : le serpent tourne librement ; il tire tout seul | 1 vague |
| **1987 — LE NÉON** | le jeu actuel : 16 couleurs, synthwave, parallaxe, TRAVELLING | Neon Velocity | LASSO, INVERSION, cartes, VOL, BOUCLIER, RÉPARATION — ce qui existe aujourd'hui | 3 vagues |
| **1993 — LA PROFONDEUR** | les plans de parallaxe deviennent **jouables** : un plan profond sous la grille, un plan haut au-dessus ; scènes isométriques inclinées | électro Suno, basses plus lourdes | **ennemis sur des plans parallèles** et **changement de hauteur** (§ 3) | 2 vagues |
| **2001 — LE WARP** | ralentis bleutés, traînées, le monde qui s'étire | la musique passe en demi-temps au warp, puis repart | **le WARP et le curseur cible** : missiles, bombes, mines, laser sur tous les plans (§ 2) ; ennemis ultra-rapides | 2 vagues |
| **2975 — L'INTERGALACTIQUE** | l'espace : planètes, flottes, anneaux, plusieurs plans de profondeur à la fois | Suno épique, tempo changeant à chaque phase | tout ensemble, contre une armada et un boss cosmique ; le CYCLOPE n'était que l'avant-garde | final |

La palette fermée de seize couleurs reste la règle : les époques anciennes en utilisent un **sous-ensemble**
(2, puis 4, puis 16), elles n'en ajoutent pas. Le cyan reste à la joueuse. L'iPhone reste la plateforme de
référence à chaque époque.

### La musique du début : bidon, mais menaçante

Consigne de la propriétaire (18 octobre) : « musiques vraiment bidons au début, mais qui laissent transparaître que
ça va tout pulvériser ensuite ». En 1976, la musique est un **bip binaire** à une voix, onde carrée, deux ou trois
notes, presque ridicule. Mais sous elle, de plus en plus, des signes que quelque chose d'énorme arrive :

- une **sous-basse** presque inaudible qui gronde par moments, comme un moteur qui chauffe sous le plancher ;
- des **notes du motif de Neon Velocity** cachées dans les bips, de plus en plus reconnaissables ;
- des **glitchs** : un bip qui se dédouble, une mesure qui saute, une seconde de distorsion ;
- un **compte à rebours implicite** : à chaque objectif atteint, une couche s'ajoute (un deuxième bip, un écho,
  un battement de grosse caisse étouffé), jusqu'à la « fissure » où tout explose dans la musique de 1982.

À l'image, la même menace : la grille qui tremble au rythme de la sous-basse, une case qui clignote en couleur
une image sur deux cents, un reflet de néon qui passe sous l'écran (petite surface, jamais un flash plein écran).

### Une musique créée pour chaque époque

Consigne de la propriétaire (18 octobre) : « crée à chaque fois des musiques appropriées ». Chaque époque a SA
musique, composée pour elle, jamais un morceau d'une autre époque recyclé : 1976 un bip carré à une voix (écrit
dans `src/68-terminal.js`, avec ses menaces), 1982 une puce à trois voix, 1987 Neon Velocity, 1993 l'électro Suno,
2001 le warp en demi-temps, 2975 l'épique Suno ; et un thème propre à chaque personnage (§ 6). Chaque passage
d'époque change la musique ET le tempo.

## 2. Le WARP et le curseur cible

- **Quand** : par moments choisis (pas au hasard) — jauge de warp pleine, pick-up WARP, ou automatiquement
  quand une escadrille ultra-rapide entre (annoncée 1 s avant : sirène, chevrons). C'est décisif face aux
  ennemis trop rapides pour le serpent.
- **Ce qui se passe** : le monde tombe à environ 0,15 de sa vitesse pendant 3 à 4 s (vrai ralenti du temps de
  jeu : il exige que l'horloge à pas fixe soit branchée, cause commune n° 1 de `couverture-snake2030.md`) ; la
  musique passe en demi-temps ; un **curseur cible** apparaît et se déplace.
- **Le curseur sur iPhone** : il balaie l'écran tout seul (comme une lunette) et le second doigt **verrouille**
  la cible sous lui ; on peut aussi le guider en glissant le second doigt. Sur bureau : la souris, ou les
  touches. Chaque verrou ajoute une cible ; à la fin du warp, ou au relâcher, **tout part**.
- **Les armes du warp** (une par verrou, choisie selon la cible ou par les cartes) : **missiles** à tête
  chercheuse (vaisseaux, cibles mobiles), **bombes** (zone, groupes), **mines** posées sur une trajectoire
  annoncée, **laser** (ligne, traverse plusieurs ennemis et plusieurs plans).
- Le warp peut viser **les autres plans** (§ 3) : c'est le seul moyen de toucher ce qui est au-dessous ou
  au-dessus sans changer de hauteur.

## 3. Les plans parallèles et le changement de hauteur

- Trois plans de jeu, empilés : **le profond** (sous la grille, vu à travers elle, plus petit et plus sombre),
  **le principal** (celui d'aujourd'hui), **le haut** (au-dessus, plus grand, dont on voit les ombres portées
  sur la grille avant de voir les ennemis).
- Des ennemis vivent sur chaque plan. Ceux d'un autre plan **menacent sans toucher** : ils tirent quand ils
  sont alignés (télégraphe visible), larguent des mines qui tombent sur notre plan, ou montent et descendent.
- **Changer de hauteur** : par des portails d'ascenseur sur la grille (on les traverse), et par un geste
  (balayage à deux doigts vers le haut ou le bas sur iPhone ; touches dédiées au bureau). Transition d'environ
  0,6 s : la caméra plonge ou s'élève, l'échelle change, la musique fait une transition sur la barre de mesure.
- Les scènes en **isométrique inclinée** (prototype `la-grille.html`) sont la manière de montrer ces plans en
  même temps : la grille vue de biais, les plans empilés visibles.

## 4. L'image monte avec le voyage : de 8 bits à 16 bits

Décision de la propriétaire (18 octobre) : « on peut aussi passer du 8 bits au 16 bits ». La finesse de l'image
est une dimension du voyage, comme la couleur et la profondeur : elle s'élève avec les époques.

| époques | génération | pixels | palette | ce qui change à l'œil |
|---|---|---|---|---|
| 1976 | « 1 bit » | très gros pixels (une case = un bloc) | 2 couleurs | rien ne bouge, sauf le serpent |
| 1982 | 8 bits début | gros pixels | 4 couleurs | premiers sprites à 2 images |
| 1987 | 8 bits plein | la résolution actuelle (environ 422 × 195 en paysage) | les 16 couleurs actuelles | parallaxe, tramages, intermèdes |
| 1993 → 2001 | **16 bits** | pixels deux fois plus fins (résolution interne doublée) | palette fermée élargie, environ 64 couleurs, toujours en tables | sprites plus grands et plus animés, dégradés sans tramage, rotations et zooms façon « mode 7 », transparences par tables |
| 2975 | 16 bits poussé | la même finesse, plus de plans à la fois | la palette 16 bits, avec des cycles de couleurs | l'espace : étoiles en couches, nébuleuses, flottes |

Règles qui ne bougent pas : une palette **fermée** par époque (définie à l'avance, jamais de couleur hors table),
des pixels **entiers** à l'écran, le **cyan réservé à la joueuse** dans toutes les générations, et l'iPhone comme
référence (le passage en 16 bits ne doit pas coûter plus que le budget d'image du tube adaptatif).
Le changement de génération est lui-même un spectacle : la résolution « se dédouble » à l'écran pendant un
intermède, comme une console qu'on change.

Conséquences techniques : `00-pal.js` porte une palette par génération ; `10-gfx.js` sait changer de résolution
interne en cours de partie ; `05-art.js` convertit illustrations et films avec la palette de l'époque en cours ;
`DIRECTION.md` est amendé (la règle des seize couleurs devient « une palette fermée par génération »).

## 5. Beaucoup d'animations : le plan de production

Chaque époque a besoin de ses animations : le serpent (tête, corps, mue d'une génération à l'autre), chaque
ennemi (repos, armement, attaque, mort), les vaisseaux, les explosions, les armes du warp, les portails
d'ascenseur, les décors qui vivent, et un intermède de transition par époque. Trois sources, par ordre de coût :

1. **Procédurales** (`40-sprites.js`, `50-fx.js`) : tout ce qui se dessine en code — serpent, effets,
   explosions, lasers, curseur cible. Pas de limite de quantité ; c'est la source principale en 8 bits.
2. **Générées sur Higgsfield puis converties** : pour les grands sprites 16 bits et les vaisseaux, on génère
   des planches d'images (poses clés) et de courts clips vidéo (Kling) ; un outil de conversion les réduit à la
   taille du sprite, les force dans la palette de l'époque, en extrait les images et produit une planche
   (`art/sprites/<epoque>/<nom>.png` + `.json` des images et des durées). Le même chemin que les intermèdes,
   appliqué aux sprites.
3. **Intermèdes** (`cine/`) : un film 8 bits ou 16 bits par passage d'époque, et pour les grands moments
   (premier warp, première montée de plan, arrivée dans l'espace).

À chaque époque, une **liste d'animations** chiffrée (nom, taille, nombre d'images, cadence, palette) est écrite
avant la production, puis vérifiée image par image (capture, palette fermée, lisibilité sur iPhone).

## 6. Deux personnages, deux aventures, une fin

Décisions de la propriétaire (18 octobre) :

> « On peut choisir une femme ou un homme au début. Tout le reste de l'aventure aura donc des vidéos d'animation
> adaptées, histoire de vouloir rejouer pour voir les animations avec l'autre personnage. Il faut que chaque
> animation soit propre à chaque personnage. »
>
> « Il faut aussi finir les deux personnages depuis le début afin de voir une end scene grandiose où les deux
> personnages de mondes parallèles se retrouvent pour de nouvelles aventures, à deux cette fois-ci. Puis teaser
> vers SNAKE 3019. »

- **Le choix** : à l'écran-titre, LA PILOTE ou LE PILOTE — deux personnes de deux **mondes parallèles**, chacune
  reliée à son serpent (l'ouverture « TU ES EN LIGNE » prend tout son sens : c'est elle ou lui qui se connecte).
  Le serpent reste cyan, la règle de lecture ne change pas ; ce qui change, c'est qui le pilote et ce qu'on voit.
- **Des films propres à chaque personnage, pas des doublons** : chaque intermède et chaque passage d'époque
  existe en deux versions qui ne se contentent pas d'échanger un visage — décor, action, cadrage, émotion propres
  à chaque personnage et à son monde. Rejouer avec l'autre, c'est voir une autre histoire du même voyage.
  Production : un personnage de référence par pilote sur Higgsfield (fiche de personnage, pour un visage et une
  silhouette constants d'un film à l'autre), puis images clés et clips Kling, convertis comme les intermèdes ;
  un **thème musical** par personnage, décliné à chaque époque.
- **Les deux fins** : chaque personnage a sa propre fin. Le profil (`77-score`, persistance) retient qui a été
  mené au bout.
- **La scène finale grandiose** : quand LES DEUX ont été finis, une fin supplémentaire se débloque — les deux
  mondes parallèles se touchent, les deux pilotes et leurs deux serpents se retrouvent dans l'espace, et partent
  ensemble « pour de nouvelles aventures, à deux cette fois-ci ». Le film le plus long et le plus soigné du jeu.
- **Le teaser SNAKE 3019** : après la scène finale, un court teaser de la suite (titre, une image, une date,
  la promesse du jeu à deux) — et un écran qui donne envie d'y revenir.
- Rejouer doit se sentir : sur l'écran-titre, la silhouette du personnage déjà fini est marquée ; une fois les
  deux finis, l'écran-titre lui-même change (les deux mondes côte à côte).

Volume de films à prévoir (ordre de grandeur) : environ 15 intermèdes et passages d'époque × 2 personnages, plus
2 fins, la scène finale et le teaser — soit environ 35 films. À 7,5 crédits le clip Kling de 5 s (plusieurs
clips pour les longs films), il faut compter environ 400 à 600 crédits Higgsfield, dans le budget autorisé
(environ 2 960, dont environ 315 dépensés).

## 7. Ordre de construction conseillé

1. **L'horloge à pas fixe** dans `90-boot.js` : sans elle, ni warp ni ralenti (prérequis de tout le reste).
2. **L'époque 1976** (palette à 2 couleurs, très gros pixels) : intégrer le mode grille de `la-grille.html` comme premier état de la partie, en palette
   réduite, avec des bips binaires ; puis la « fissure » vers 1982. C'est le premier moment de surprise, et le
   moins coûteux.
3. **Le WARP et le curseur cible**, d'abord sur le plan principal, avec les quatre armes.
4. **Les plans parallèles** et le changement de hauteur, en commençant par le plan haut (ombres portées).
5. **L'intergalactique** : décor spatial, armada, boss cosmique, intermèdes de transition.
6. **Le passage en 16 bits** : palette élargie, résolution doublée, à l'entrée de l'époque 1993 ; puis les
   animations 16 bits par le chemin Higgsfield (§ 5).
7. À chaque étape : un intermède Higgsfield de transition d'époque, le changement de musique et de tempo, et la
   liste d'animations de l'époque.
8. **Les deux personnages** : écran de choix, fiches de personnage Higgsfield, puis chaque film en deux versions
   au fur et à mesure des étapes ; les deux fins, la scène finale à deux, le teaser SNAKE 3019 en dernier.

Chaque étape passe par `/mediateur` avant la suivante, et la propriétaire joue sur iPhone à la fin des étapes
2, 3 et 4.
