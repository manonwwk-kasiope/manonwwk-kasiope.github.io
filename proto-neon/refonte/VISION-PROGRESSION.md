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

## 4. Ordre de construction conseillé

1. **L'horloge à pas fixe** dans `90-boot.js` : sans elle, ni warp ni ralenti (prérequis de tout le reste).
2. **L'époque 1976** : intégrer le mode grille de `la-grille.html` comme premier état de la partie, en palette
   réduite, avec des bips binaires ; puis la « fissure » vers 1982. C'est le premier moment de surprise, et le
   moins coûteux.
3. **Le WARP et le curseur cible**, d'abord sur le plan principal, avec les quatre armes.
4. **Les plans parallèles** et le changement de hauteur, en commençant par le plan haut (ombres portées).
5. **L'intergalactique** : décor spatial, armada, boss cosmique, intermèdes de transition.
6. À chaque étape : un intermède Higgsfield de transition d'époque, et le changement de musique et de tempo.

Chaque étape passe par `/mediateur` avant la suivante, et la propriétaire joue sur iPhone à la fin des étapes
2, 3 et 4.
