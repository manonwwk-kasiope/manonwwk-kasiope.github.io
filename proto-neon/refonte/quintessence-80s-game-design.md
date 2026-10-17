# SNAKE 2975 — la quintessence du game design d'arcade (1976-1990)

Recherche du 17 octobre 2026 pour la refonte `proto-neon/`. Elle répond à la demande de la propriétaire : étudier les grands succès d'arcade des années 80, en tirer ce qui les rendait irrésistibles, et l'injecter dans SNAKE 2975. Elle passe après `refonte/RETOURS-PROPRIETAIRE.md`, qui fait autorité, et ne remplace ni `DIRECTION.md` ni `recherche/game-design-campagne.md`.

**Méthode et limites.**

- La recherche web a fonctionné (environ 25 requêtes). Les pages n'ont pas été ouvertes une à une : les faits viennent des extraits renvoyés par le moteur pour les pages citées. Plusieurs de ces pages sont des wikis de fans (StrategyWiki, TV Tropes, fandom) ; elles sont signalées comme telles quand un détail en dépend.
- Trois statuts, toujours distingués :
  - **un fait suivi d'un lien** a été retrouvé dans les extraits de la page citée ;
  - **un fait marqué [mémoire]** vient de ma connaissance de ces jeux. Il n'a pas été revérifié pendant cette recherche : à contrôler avant d'en faire une règle ;
  - **les paragraphes « Analyse » et « Pour SNAKE 2975 »** sont mon interprétation et mes propositions, pas des faits. Un chiffre marqué *(proposé)* est un réglage de départ, sans source.
- Quand deux sources se contredisent (dates, nombres), le désaccord est indiqué.
- Je n'ai trouvé aucun document de conception d'origine (Namco, Williams, Atari). Les intentions des auteurs ne sont données que quand une source les rapporte.
- Fichiers lus, non modifiés : `refonte/RETOURS-PROPRIETAIRE.md`, `DIRECTION.md`, `REPRISE.md`, `recherche/game-design-campagne.md` (survolé), `src/70-game.js` (survolé : tir automatique, trois vies, deux secondes d'invulnérabilité).

---

## 1. Ce qu'il faut retenir en douze lignes

1. Un succès d'arcade s'explique en cinq secondes et se maîtrise en des mois. La règle tient en une phrase, la profondeur vient de ce que les ennemis font de cette règle.
2. Chaque ennemi a un caractère qu'on lit à son mouvement : les quatre fantômes de Pac-Man, les deux soucoupes d'Asteroids, l'araignée, la puce et le scorpion de Centipede.
3. Rien ne laisse traîner : Bubble Bobble, Joust, Defender et Donkey Kong envoient une menace imbattable (ou un compte à rebours) à qui temporise.
4. Le risque volontaire rapporte le plus : se faire capturer exprès dans Galaga, manger les fantômes en chaîne dans Pac-Man, tuer l'araignée de près dans Centipede.
5. Le rapport de force se retourne un instant : la pastille de Pac-Man, le marteau de Donkey Kong, la smart bomb de Defender, le Superzapper de Tempest.
6. On protège quelqu'un : les humanoïdes de Defender, les six villes de Missile Command, la dernière famille de Robotron.
7. Grandir est une force et une charge : le serpent de Nibbler s'allonge à chaque point mangé et meurt en se heurtant ; le double vaisseau de Galaga tire deux fois mais offre une cible double.
8. Le monde dépasse l'écran : Defender a un radar, Moon Patrol trois plans en parallaxe, Out Run des embranchements.
9. La mort est instantanée, lisible, et c'est la faute de la joueuse : un seul tir tue dans Contra, et l'arme part avec.
10. La difficulté monte par la vitesse, la densité et le temps de répit, pas par des ennemis plus gros en points de vie.
11. Le rythme alterne vague, respiration et récompense : étapes bonus de Galaga, intermèdes de Pac-Man, quatre écrans de Donkey Kong.
12. Pour SNAKE 2975, cinq idées en sortent (section 5) : l'encerclement de lumière (Tron), les fugitifs à sauver sur radar (Defender), la barre d'armes avec options qui suivent la trace (Gradius), la surcharge qui retourne la chasse (Pac-Man) et la queue capturée à reprendre (Galaga).

---

## 2. Les fiches, jeu par jeu

Pour chaque jeu : la boucle, la tension, la courbe de difficulté, la mort, le score et le risque, les bonus, les boss et la variété, puis ce qui fait remettre une pièce. Les fiches vont à l'essentiel ; la section 3 croise les jeux.

### 2.1 Les ancêtres du serpent

#### Blockade (Gremlin, 1976)

- **Boucle.** Deux joueurs dirigent chacun une flèche qui laisse une traînée derrière elle ; on perd en heurtant un mur ou une traînée ([Wikipédia, Blockade](https://en.wikipedia.org/wiki/Blockade_(video_game))).
- **Tension.** L'espace libre rétrécit à chaque seconde, et c'est l'adversaire humain qui le referme.
- **Croissance.** Automatique : on n'avait rien à manger pour s'allonger dans Blockade et ses premiers clones ([Wikipédia, genre Snake](https://en.wikipedia.org/wiki/Snake_(video_game_genre))).
- **Héritage.** Bigfoot Bonkers (1976) ajoute des obstacles, The Surround suit en 1977, et l'essentiel des jeux de serpent descend de Blockade (même source).
- **Analyse.** L'idée-mère du genre n'est pas « manger et grandir » mais **enfermer l'autre avec sa propre trace**. SNAKE 2975 l'a perdue en route ; l'idée 5.1 la reprend.

#### Snake Byte (Sirius Software, 1982)

- **Boucle.** Le premier serpent qui mange des pommes pour grandir ; la difficulté monte à chaque bouchée ([Wikipédia, genre Snake](https://en.wikipedia.org/wiki/Snake_(video_game_genre)) ; [snakegame.net](https://www.snakegame.net/blog-posts/first-snake-game-to-eat-apples), site de passionnés).
- **Analyse.** La récompense (manger) et la punition (devenir plus long, donc plus gênant) sont **le même geste**. C'est la tension fondatrice du serpent moderne.

#### Nibbler (Rock-Ola, 1982)

- **Boucle.** Un serpent parcourt un labyrinthe pour manger tous les points ; chaque point l'allonge ; un compte à rebours court sur chaque labyrinthe ([MobyGames](https://www.mobygames.com/game/59918/rock-olas-nibbler/) ; [Arcade Club](https://www.arcadeclub.co.uk/games/nibbler/)).
- **Mort.** Se heurter à son propre corps, ou laisser le temps s'écouler avant d'avoir tout mangé (mêmes sources).
- **Difficulté.** La vitesse augmente à chaque niveau ; 32 labyrinthes selon StrategyWiki ([StrategyWiki](https://strategywiki.org/wiki/Nibbler)).
- **Score.** Premier jeu d'arcade à neuf chiffres capable de passer le milliard ; Tim McVey l'a franchi en janvier 1984 avec 1 000 042 270 points, au terme d'une partie de plus de 44 heures selon une source (les dates exactes divergent) ([Wikipédia, Nibbler](https://en.wikipedia.org/wiki/Nibbler_(video_game)) ; [Arcade Blogger](https://arcadeblogger.com/2016/07/01/nibbler-the-billion-point-arcade-game/)).
- **Remettre une pièce.** Une vie gagnée tous les quatre niveaux (MobyGames) et un compteur qui promettait l'infini.
- **Analyse.** Nibbler ajoute au serpent ce qui lui manquait : **un chronomètre qui pousse à prendre des risques** et une vitesse qui monte. Sans pression de temps, un serpent prudent tourne en rond pour toujours.

#### Tron (Bally Midway, 1982)

- **Boucle.** Quatre sous-jeux par niveau : Light Cycles, Grid Bugs, Tanks et le cône du MCP ; il faut finir les quatre pour passer au niveau suivant ([Wikipédia, Tron](https://en.wikipedia.org/wiki/Tron_(video_game))). Les sources divergent sur le choix du sous-jeu : tirage au hasard selon l'une, choix d'un quadrant (sans savoir lequel il cache) selon une autre.
- **Light Cycles.** C'est un Blockade solo contre des motos pilotées par la machine : chaque moto laisse un mur derrière elle, et il faut pousser l'adversaire à s'y écraser ([Wikipédia, genre Snake](https://en.wikipedia.org/wiki/Snake_(video_game_genre))).
- **Variété.** Quatre jeux en un : jamais deux minutes de la même chose.
- **Non vérifié.** L'idée que la borne aurait plus rapporté que le film ne repose que sur une copie ancienne de Wikipédia marquée « citation nécessaire » : à ne pas reprendre.
- **Analyse.** Le meilleur ennemi d'un serpent est **un autre serpent**, avec la même règle que la joueuse. On comprend ce qu'il va faire, parce qu'on ferait la même chose à sa place.

### 2.2 Les labyrinthes et les poursuites

#### Pac-Man (Namco, 1980)

- **Boucle.** Manger toutes les pastilles du labyrinthe en évitant quatre fantômes ; quatre grosses pastilles retournent la chasse un court instant.
- **Personnalités.** Chaque fantôme vise une case différente ([Game Developer, « The Pac-Man Dossier »](https://www.gamedeveloper.com/game-platforms/feature-the-i-pac-man-i-dossier) ; [Game Design Skills](https://gamedesignskills.com/game-design/pac-man-pathfinding/)) :
  - Blinky (rouge) vise Pac-Man lui-même ;
  - Pinky (rose) vise quatre cases devant lui, pour lui couper la route ;
  - Inky (cyan) vise un point calculé à partir de la position de Pac-Man et de celle de Blinky, d'où un comportement imprévisible ;
  - Clyde (orange) chasse quand il est loin (plus de 8 cases) et retourne dans son coin quand il est proche.
- **Rythme.** Les fantômes alternent entre « dispersion » (chacun file vers son coin) et « poursuite » ; selon une source, il n'y a plus que la poursuite après quatre dispersions dans une vie ou un niveau (détail non confirmé par les autres sources).
- **Difficulté.** La durée de la peur des fantômes raccourcit fortement avec les niveaux ; Blinky devient « Cruise Elroy » (aussi rapide que Pac-Man) quand il ne reste plus qu'un certain nombre de pastilles, seuil atteint de plus en plus tôt (il faut manger 224 pastilles au niveau 1, il n'en reste alors que 20 ; il suffit d'en manger 124 du niveau 19 au niveau 255) ([Pac-Man wiki, Cruise Elroy](https://pacman.fandom.com/wiki/Cruise_Elroy), wiki de fans ; [Grand Text Auto, à propos du Dossier](https://grandtextauto.soe.ucsc.edu/2009/02/19/the-fruit-of-the-tree-of-pac-man-knowledge/)). Pac-Man commence à 80 % de sa vitesse maximale et l'atteint au niveau 5 (même résumé du Dossier).
- **Mort.** Le contact d'un fantôme, instantané. Elle est acceptée parce que les quatre fantômes sont lisibles : on voit venir l'erreur.
- **Score et risque.** Manger les fantômes à la suite rapporte 200, 400, 800 puis 1 600 points [mémoire] : il faut aller les chercher pendant que la peur dure, donc s'exposer. Les fruits qui apparaissent au centre valent de plus en plus avec les niveaux [mémoire].
- **Intermèdes.** De courtes scènes comiques entre certains niveaux (après les niveaux 2, 5 et 9 [mémoire]). Un wiki de fans en fait les premières cinématiques du jeu vidéo ([80s Video Games wiki](https://80s-video-games.fandom.com/wiki/Pacman), à prendre avec prudence).
- **Fin.** Au niveau 256, le compteur de niveau déborde et la moitié droite du labyrinthe se corrompt ; Iwatani n'avait pas prévu de fin ([TechSpot](https://www.techspot.com/trivia/141-if-you-reach-level-256-game-pac-man)).
- **Remettre une pièce.** On a vu l'intermède suivant de loin, on a compris un fantôme de plus, on croit tenir un « parcours ».
- **Analyse.** Le génie de Pac-Man est que **quatre règles simples donnent un comportement d'ensemble riche** : Blinky pousse, Pinky coupe, Inky prend en tenaille. La joueuse apprend à lire une équipe, pas un ennemi.

#### Donkey Kong (Nintendo, 1981)

- **Boucle.** Grimper jusqu'en haut de l'écran en évitant tonneaux et flammes. Quatre écrans (25, 50, 75 et 100 m), chacun avec sa mécanique : poutres et tonneaux, tapis roulants, ascenseurs et ressorts, puis huit rivets à retirer pour faire tomber Kong ([Wikipédia, Donkey Kong](https://en.wikipedia.org/wiki/Donkey_Kong_(1981_video_game))).
- **Tension.** Un compteur de bonus fond pendant l'écran ; à zéro, Mario perd une vie, et ce qui reste s'ajoute au score à l'arrivée (même source ; [guide de fan](https://everynin.yolasite.com/donkey-kong.php)).
- **Retournement.** Le marteau brise tonneaux et flammes contre des points, mais seulement un temps, et il empêche de grimper [mémoire pour ce dernier point].
- **Difficulté.** Au premier niveau, on ne voit que deux écrans ; puis la boucle s'allonge jusqu'à six écrans par niveau [mémoire].
- **Variété.** Ce fut le jeu d'arcade le plus complexe sorti jusqu'alors, avec des cinématiques qui racontent et plusieurs écrans différents (Wikipédia).
- **Remettre une pièce.** On veut voir l'écran suivant, celui qu'on n'a jamais vu.

#### Gauntlet (Atari, 1985)

- **Boucle.** Jusqu'à quatre héros traversent des donjons pleins de monstres jusqu'à la sortie.
- **Tension.** La santé baisse seule avec le temps, ce qui crée une limite de temps ; sous 200 points de vie, le narrateur avertit : « Warrior needs food, badly » ([Wikipédia, Gauntlet](https://en.wikipedia.org/wiki/Gauntlet_(1985_video_game))).
- **Mort et pièce.** Une pièce ressuscite le héros sur place, santé pleine : même un joueur faible peut continuer indéfiniment s'il paie ; le score final est divisé par le nombre de crédits (même source). TV Tropes y voit un moyen de faire remettre des pièces : c'est une interprétation de wiki, pas une intention prouvée ([TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Gauntlet)).
- **Coopération.** Partager la nourriture décide souvent de la réussite (Wikipédia).
- **Génération.** Les monstres sortent de générateurs qu'il faut détruire en priorité [mémoire].
- **Analyse.** La **santé qui fuit** remplace le chronomètre et se lit sur le personnage. Les générateurs donnent une cible prioritaire claire au milieu du chaos.

### 2.3 Les tireurs fixes

#### Asteroids (Atari, 1979)

- **Boucle.** Un vaisseau à inertie brise des astéroïdes qui se fragmentent en plus petits ; le bord de l'écran est relié au bord opposé.
- **Tension sonore.** Un « battement de cœur » grave accélère à mesure que les astéroïdes disparaissent ([Wikipédia, Asteroids](https://en.wikipedia.org/wiki/Asteroids_(video_game)) ; [Giant Bomb](https://giantbomb.com/wiki/Games/Asteroids)).
- **Deux soucoupes, deux rôles.** Selon Ed Logg, la grande est de la chair à canon qui tire au hasard ; la petite arrive après trois grandes et vise beaucoup plus juste (Wikipédia ; Giant Bomb). Les crédits de conception diffèrent selon les sources (Lyle Rains et Ed Logg, ou Dominic Walsh et Ed Logg).
- **Risque.** Les joueurs ont appris à garder un dernier astéroïde en vie pour chasser les soucoupes à l'infini (« lurking ») ; Atari a durci la petite soucoupe dans une révision du jeu [mémoire].
- **Échappatoire.** L'hyperespace téléporte au hasard, parfois dans un rocher [mémoire, idée reprise par Defender].
- **Analyse.** Le son est une **jauge de tension**, et l'éditeur a dû corriger le jeu parce que les joueurs avaient trouvé comment ne jamais finir la vague. D'où le principe 3 : il faut une menace contre qui temporise.

#### Centipede (Atari, 1981)

- **Boucle.** Une boule de commande pilote un canon au bas de l'écran, contre un mille-pattes qui descend à travers un champ de champignons ([Wikipédia, Centipede](https://en.wikipedia.org/wiki/Centipede_(video_game))). Dona Bailey et Ed Logg en sont les auteurs ; Bailey est souvent présentée comme la première femme à avoir conçu un jeu d'arcade.
- **Le décor se bâtit en jouant.** Chaque segment touché laisse un champignon à sa place ; tirer au milieu du mille-pattes le coupe en deux, et chaque morceau a sa propre tête (même source).
- **Trois perturbateurs.** L'araignée rebondit en bas et mange les champignons ; la puce tombe d'en haut en semant des champignons ; le scorpion empoisonne les champignons, et un mille-pattes qui en touche un plonge tout droit vers le canon ([StrategyWiki](https://StrategyWiki.org/wiki/Centipede)).
- **Risque.** L'araignée rapporte plus quand on l'abat de près (300, 600 ou 900 points selon la distance) [mémoire].
- **Analyse.** Le meilleur Centipede pour un serpent : **couper un corps fait deux ennemis**, et chaque tir modifie le terrain du prochain passage. La joueuse fabrique elle-même ses futurs ennuis.

#### Missile Command (Atari, 1980)

- **Boucle.** Défendre six villes avec trois bases de missiles intercepteurs ; dix missiles par base selon arcade-history (une source moins fiable dit six) ([Wikipédia, Missile Command](https://en.wikipedia.org/wiki/Missile_Command) ; [arcade-history](https://www.arcade-history.com/game/1644/)).
- **Tension.** Les munitions comptées : chaque tir manqué se paie plus tard.
- **Mort.** On ne gagne jamais : on survit le plus longtemps possible, et la partie finit sur « THE END » en lettres rouges. Dave Theurer voulait transmettre la futilité et l'angoisse qu'il ressentait face à la menace nucléaire (Wikipédia).
- **Bonus.** Missiles inutilisés et villes intactes sont comptés en fin de vague ; une ville revient tous les 10 000 points [mémoire].
- **Analyse.** La joueuse ne meurt pas : **elle perd ce qu'elle protège**. Chaque ville tombée est une mort lente et visible.

#### Tempest (Atari, 1981)

- **Boucle.** Un tireur tourne sur le bord d'un tube vu en perspective ; les ennemis remontent le tube vers lui. Conçu et programmé par Dave Theurer ([Giant Bomb](https://giantbomb.com/wiki/Games/Tempest) ; [arcade-history](https://www.arcade-history.com/game/2865/)).
- **Bombe.** Le Superzapper : deux usages par niveau, le premier détruit tout, le second un seul ennemi au hasard ; il se recharge au niveau suivant (mêmes sources).
- **Fin de niveau.** On plonge dans le tube, et les pointes laissées par les ennemis tuent pendant cette descente : la vague passée vous menace encore (mêmes sources).
- **Difficulté choisie.** Skill-Step : on peut recommencer à un niveau déjà atteint, et Tempest fut le premier jeu à laisser choisir son niveau de départ ([arcade-history](https://www.arcade-history.com/game/2865/)). Commencer plus haut rapportait un bonus [mémoire].
- **Variété.** Une série de tubes de formes différentes, puis des couleurs qui changent [mémoire].
- **Analyse.** La bombe à deux étages (la première pleine, la seconde faible) dose la tentation. La plongée finale fait payer ce qu'on a laissé derrière soi : **la vague précédente laisse des traces dont on hérite**.

#### Galaga (Namco, 1981)

- **Boucle.** Des escadrilles entrent en formation en traçant des courbes, se rangent, puis plongent sur le vaisseau.
- **Capture.** Un Boss Galaga descend et déploie un rayon en éventail ; un vaisseau pris dedans est capturé. Abattre le boss libère le captif, qui revient se ranger à côté : double tir, mais cible double ([StrategyWiki](https://strategywiki.org/wiki/Galaga/Walkthrough) ; [Wikipédia, Galaga](https://Www.wikipedia.org/wiki/Galaga)).
- **Origine.** Selon Wikipédia, le sauvetage devait d'abord rendre une vie ; l'équipe en a fait un équipier qui combat aux côtés du joueur.
- **Risque.** Se faire capturer **exprès** pour gagner le double vaisseau : on sacrifie une vie dans l'espoir de la récupérer doublée. Tirer sur le vaisseau captif le détruit [mémoire].
- **Étapes bonus.** Les « Challenging Stages » : des formations qui ne tirent pas et qu'on abat pour un bonus, où le double vaisseau aide beaucoup ([StrategyWiki](https://strategywiki.org/wiki/Galaga/Walkthrough) ; [TrueAchievements](https://i1.trueachievements.com/game/ARCADE-GAME-SERIES-GALAGA/walkthrough/3)). Elles reviennent tous les quatre niveaux à partir du troisième, et 40 ennemis abattus sur 40 rapportent un bonus parfait [mémoire].
- **Remettre une pièce.** Le double vaisseau à reconquérir, et l'étape bonus parfaite qu'on a ratée d'un ennemi.

#### Joust (Williams, 1982)

- **Boucle.** Des chevaliers sur autruches s'affrontent : le plus haut au moment du choc gagne.
- **Œufs.** Un ennemi battu laisse un œuf qui éclot en chevalier plus coriace s'il n'est pas ramassé à temps ; les œufs valent 250, 500, 750 puis 1 000 points ([Wikipédia, Joust](https://en.wikipedia.org/wiki/Joust_(video_game)) ; [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Videogame/Joust)).
- **Contre le traînard.** Si la vague dure trop, un ptérodactyle arrive et chasse le joueur, puis d'autres ; il ne meurt que d'un coup de lance dans le bec ouvert, pour 1 000 points (mêmes sources).
- **Bonus de vague.** 3 000 points pour une vague sans mort ; en duo, des vagues « gladiateur » (le premier qui abat l'autre gagne 3 000 points) et des vagues « équipe » (3 000 points à chacun s'ils ne s'entretuent pas) (mêmes sources). Une source date la borne Atari de 1983 ; la borne Williams est de 1982 [mémoire].
- **Analyse.** L'œuf est un **butin qui devient menace** si on tarde : la joueuse doit aller le chercher, souvent en terrain dangereux.

#### Bubble Bobble (Taito, 1986)

- **Boucle.** Deux petits dragons enferment les monstres dans des bulles, puis les éclatent.
- **Contre le traînard.** Le baron von Blubba, invincible, arrive si on traîne et disparaît quand le dernier monstre est éclaté ([Lost in Translation, Bubble Bobble](https://www.exotica.org.uk/wiki/Lost_In_Translation/Bubble_Bobble) ; [manuel NES](https://archive.org/download/NESManuals/Bubble%20Bobble%20%28USA%29_text.pdf)). Avant lui, « HURRY UP! » s'affiche et les monstres s'énervent [mémoire].
- **Chaîne.** Éclater deux monstres ou plus d'un coup fait apparaître des bulles-lettres (une de moins que de monstres éclatés) ; les six lettres de EXTEND donnent une vie et font passer au niveau suivant ([Bubble Bobble wiki](https://bubblebobble.fandom.com/wiki/Extend_Bubble), wiki de fans).
- **Secrets.** Des salles secrètes, gardées elles aussi par un poursuivant si l'on s'y attarde (Lost in Translation). Cent niveaux, et une vraie fin réservée aux parties à deux [mémoire].
- **Analyse.** EXTEND transforme le score en **collection visible** : on sait à chaque instant ce qui manque, et la lettre qui manque fait remettre une pièce.

### 2.4 Le monde qui défile

#### Defender (Williams, 1981)

- **Boucle.** Un vaisseau survole une planète plus large que l'écran, qui défile horizontalement. Premier jeu vidéo d'Eugene Jarvis, venu du flipper ([Wikipédia, Defender](https://www.wikipedia.com/wiki/Defender_(game)) ; [shmup wiki](https://shmup.fandom.com/wiki/Defender)).
- **Radar.** Un scanner en haut de l'écran montre humanoïdes et aliens, parce que le monde dépasse l'écran (mêmes sources).
- **À sauver.** Les Landers enlèvent les humanoïdes ; s'ils atteignent le haut de l'écran, ils deviennent des Mutants rapides. On peut abattre le ravisseur et rattraper l'humain avant qu'il ne s'écrase (mêmes sources). Si tous les humanoïdes sont perdus, la planète explose et tous les ennemis deviennent mutants ; elle revient toutes les cinq vagues [mémoire].
- **Contre le traînard.** Les Baiters apparaissent si la vague dure trop, suivent le vaisseau à sa vitesse et tirent juste ; au réglage le plus dur, un toutes les deux ou trois secondes ([shmup wiki](https://shmup.fandom.com/wiki/Defender) ; [Set Side B](https://setsideb.com/tag/baiter/)).
- **Échappatoires.** Trois smart bombs qui détruisent tout ce qui est à l'écran, et l'hyperespace, qui peut vous déposer en plein danger (mêmes sources).
- **Commandes.** Cinq boutons, cités comme raison des débuts lents du jeu, qui a pourtant gardé un large public toute la décennie (Wikipédia).
- **Analyse.** Defender invente le trio qui manque à SNAKE 2975 : **un monde qui défile, un radar qui annonce ce qui se passe hors champ, et quelqu'un à sauver là-bas**. Le radar crée des décisions : « j'y vais ou pas ? ».

#### Robotron: 2084 (Williams / Vid Kidz, 1982)

- **Boucle.** Un écran fixe bondé de robots ; un manche pour se déplacer, un autre pour tirer dans n'importe quelle direction. Jarvis et Larry DeMar ont popularisé ce schéma à deux manches, déjà vu dans Space Dungeon de Taito ([Wikipédia, Robotron](https://en.wikipedia.org/wiki/Robotron:_2084)).
- **Vagues.** Une vague finit quand tous les ennemis destructibles sont détruits ; les suivantes sont plus rapides et plus nombreuses (même source).
- **À sauver.** Maman, Papa et Mikey : les toucher avant que les Hulks ou les Brains ne les tuent rapporte de 1 000 à 5 000 points, en progression qui repart à zéro à la mort ou au changement de vague (même source ; [StrategyWiki](https://strategywiki.org/wiki/Robotron:_2084)). Les Hulks sont indestructibles, les Brains changent les humains en Progs [mémoire].
- **Mort.** Instantanée, au moindre contact, plusieurs fois par minute pour un débutant. Elle est acceptée parce que la vague repart aussitôt et qu'on comprend toujours ce qui vous a tué.
- **Analyse.** Le **chaos à deux mains** : on fuit d'un côté et l'on tire de l'autre. Le sauvetage force à plonger dans la foule au lieu de rester au bord.

#### Moon Patrol (Irem, 1982)

- **Boucle.** Une jeep lunaire roule toujours vers la droite, saute les cratères et tire à la fois devant et vers le ciel [mémoire pour le double tir].
- **Parallaxe.** Trois plans de décor défilent à trois vitesses différentes ; Moon Patrol a popularisé la parallaxe (Jump Bug, en 1981, en avait une forme limitée) ([Wikipédia, Parallax scrolling](https://en.wikipedia.org/wiki/Parallax_scrolling) ; [Giant Bomb](https://giantbomb.com/wiki/Concepts/Parallax_Scrolling)).
- **Progression.** Des points de passage marqués de A à Z servent de points de reprise ; le score de section tient compte du temps mis à les atteindre (TV Tropes et MobyGames divergent sur leur nombre, 25 ou 26) ([TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/MoonPatrol) ; [MobyGames](https://www.mobygames.com/game/575?s=platform)).
- **Analyse.** C'est exactement le décor que demande la propriétaire (horizon lointain, structures au milieu, sol au premier plan). Et c'est un jeu où **l'on avance toujours**, comme le serpent : le danger vient du terrain autant que des ennemis.

#### Gradius (Konami, 1985)

- **Boucle.** Un vaisseau traverse des niveaux à défilement horizontal ; les capsules ramassées font avancer un curseur sur une barre d'améliorations, et la joueuse décide quand acheter la case éclairée ([arcade-history](https://www.arcade-history.com/game/996/) ; [Giant Bomb](https://giantbomb.com/wiki/Games/Gradius)).
- **La barre.** Vitesse, Missile, Double, Laser, Option, et « ? » qui est le bouclier ; Double et Laser s'excluent ; l'Option est une sphère qui suit le vaisseau et répète ses tirs, jusqu'à quatre ([Giant Bomb, Gradius II](https://www.giantbomb.com/games/3030-3623/) ; [miroir de Wikipédia](https://wikipedia2007.classicistranieri.com/g/r/a/Gradius_%28video_game%29.html)). Les Options suivent la trajectoire exacte du vaisseau, avec un temps de retard [mémoire].
- **Risque.** Prendre trop de vitesse rend le jeu plus dur ; ne pas tout acheter peut être le bon choix (arcade-history).
- **Mort.** Perdre une vie fait perdre les améliorations ; se refaire en plein niveau avancé est la vraie épreuve [mémoire].
- **Analyse.** La barre est **un choix, pas un tirage** : la joueuse compose son arme. Et les Options qui suivent la trace du vaisseau sont, littéralement, des segments de serpent.

#### R-Type (Irem, 1987)

- **La Force.** Un module indestructible qu'on attache à l'avant ou à l'arrière du vaisseau, ou qu'on détache pour qu'il combatte seul ; il bloque la plupart des petits projectiles et blesse ce qu'il touche ([Wikipédia, R-Type](https://en.wikipedia.org/wiki/R-Type) ; [shmups wiki](https://shmups.wiki/library/R-Type)).
- **Le tir chargé.** Maintenir le tir charge le Wave Cannon, plus gros et perçant selon la charge (mêmes sources) : tirer moins pour frapper plus fort.
- **Variété.** Chaque niveau a son idée, dont un niveau entier consacré à un seul cuirassé géant [mémoire] ; les boss se reconnaissent de loin.
- **Analyse.** La Force est **un bouclier qu'on place**, donc une décision de position. Le tir chargé crée un rythme : retenir, puis libérer.

#### Contra (Konami, 1987)

- **Boucle.** Un ou deux soldats courent et tirent à travers des niveaux remplis d'ennemis ; la borne est sortie le 20 février 1987 ([arcade-history](https://www.arcade-history.com/game/497/)).
- **Mort.** Un seul coup tue, et fait perdre l'arme en cours ([Wikipédia, série Contra](https://en.wikipedia.org/wiki/Contra_(series)) ; [StrategyWiki, Gryzor](https://strategywiki.org/wiki/Gryzor)).
- **Armes.** Le Spread Gun tire cinq balles en éventail (mêmes sources) ; on le ramasse sur des capsules volantes qu'il faut abattre [mémoire].
- **Analyse.** La mort en un coup est **juste** parce que tout est lisible et que l'arme perdue se retrouve vite. Elle fait peur sans dégoûter.

#### Space Harrier (Sega, 1985)

- **Boucle.** Le héros fonce vers l'horizon, sans jamais pouvoir s'arrêter, et tire sur ce qui arrive de face [mémoire pour la description].
- **Technique.** Le matériel « Super Scaler » de Sega agrandit les sprites à grande cadence ; certaines bornes avaient une cabine sur vérins qui basculait avec le manche ([Giant Bomb](https://giantbomb.com/wiki/Games/Space_Harrier) ; [Sega wiki](https://sega.fandom.com/wiki/Space_Harrier)). Les sources donnent octobre, novembre ou décembre 1985.
- **Analyse.** Le mouvement perpétuel vers l'avant, comme Moon Patrol et le serpent : **la vitesse elle-même est le spectacle**.

#### Out Run (Sega, 1986)

- **Boucle.** Conduire une décapotable contre la montre ; chaque point de contrôle rajoute du temps ; avant chacun, la route bifurque vers deux décors, celui de gauche plus facile, celui de droite plus dur ; plusieurs fins selon la route ([Giant Bomb](https://giantbomb.com/wiki/Games/OutRun) ; [TIME, All-Time 100](https://techland.time.com/2012/11/15/all-time-100-video-games/slide/out-run-1986/)).
- **Musique choisie.** On choisit sa « radio » au départ, parmi trois morceaux (mêmes sources).
- **Intention.** Yu Suzuki parle d'un jeu « de conduite », pas de course (Giant Bomb).
- **Analyse.** La bifurcation est **une difficulté choisie au volant**, sans menu. Chaque partie peut montrer un décor neuf, et c'est ce qui fait revenir.

---

## 3. La quintessence : quinze principes communs

Chaque principe donne ses exemples (renvoyant aux fiches), pourquoi il marche (analyse), et la façon précise de l'appliquer à SNAKE 2975 : un serpent qui avance toujours, tire seul vers l'avant, grandit, dans un monde qui défile en parallaxe, sur téléphone. Les chiffres *(proposés)* sont des réglages de départ, à ajuster en jouant.

### P1. Une règle en cinq secondes, une maîtrise en des mois

- **Exemples.** Pac-Man (« mange tout, évite les fantômes »), Asteroids, Joust (« le plus haut gagne »), Blockade. Nolan Bushnell, fondateur d'Atari, résumait l'idée par « facile à apprendre, difficile à maîtriser » [mémoire ; formule connue sous le nom de « loi de Bushnell »].
- **Pourquoi.** Dans une salle d'arcade, on regarde jouer quelqu'un dix secondes avant de mettre une pièce. Si l'on ne comprend pas ce qu'on regarde, on passe.
- **Pour SNAKE 2975.** Une seule phrase à l'écran-titre : « LA TÊTE MEURT, LE CORPS GRANDIT, TOUT LE RESTE SE DÉTRUIT ». Aucune mécanique nouvelle n'est introduite sans un écran où elle est seule (ennemi isolé, puis en groupe). La profondeur vient des combinaisons d'ennemis, pas d'un mode d'emploi.

### P2. Des ennemis à caractère, lisibles à leur mouvement

- **Exemples.** Les quatre visées des fantômes de Pac-Man ; les deux soucoupes d'Asteroids ; l'araignée, la puce et le scorpion de Centipede ; Hulks, Brains et Grunts de Robotron ; Landers, Mutants et Baiters de Defender.
- **Pourquoi.** Un ennemi = un verbe (poursuivre, couper, tenailler, fuir, semer). On apprend à lire chaque verbe, puis à lire une équipe. La difficulté devient une connaissance, et la mort une leçon.
- **Pour SNAKE 2975.** Donner à chaque ennemi **une règle de visée unique, décrite en trois mots**, et les faire travailler ensemble, comme les fantômes :
  - le **Chasseur** vise la tête (Blinky) ;
  - le **Coupeur** vise un point 4 longueurs de tête devant la tête (Pinky) : il force à virer ;
  - le **Tenailleur** vise le symétrique du Chasseur par rapport à la tête (Inky) : à deux, ils prennent en étau ;
  - le **Timide** fonce de loin et s'écarte quand il est près (Clyde) : il crée de fausses alertes ;
  - le **Semeur** dépose des mines sur la trajectoire prévue (la puce de Centipede).

  Chaque type a sa silhouette, et tous restent magenta, rose pâle ou sang (règle de `DIRECTION.md`).

### P3. Une menace pour qui temporise

- **Exemples.** Le baron von Blubba (Bubble Bobble), le ptérodactyle (Joust), les Baiters (Defender), le compteur de Donkey Kong, la santé qui fuit (Gauntlet), le chronomètre de Nibbler, la petite soucoupe corrigée d'Asteroids.
- **Pourquoi.** Sans elle, la stratégie optimale est d'attendre, et l'attente est ennuyeuse. Ces jeux ont tous trouvé le même remède : **une menace qu'on ne peut pas battre, mais qu'on peut faire disparaître en avançant**.
- **Pour SNAKE 2975.** Le **Traqueur** : si la joueuse ne tue rien et ne ramasse rien pendant 8 s *(proposé)*, « TRAQUEUR » s'annonce au bord de l'écran, puis un ennemi indestructible entre, aussi rapide que le serpent, et la suit jusqu'à la fin de la vague. Un deuxième vient 6 s *(proposé)* plus tard si elle temporise encore. Comme le baron, il disparaît quand la vague est nettoyée. Le monde qui défile (P8) pousse dans le même sens : le bord arrière de la zone avance.

### P4. Le risque volontaire rapporte le plus

- **Exemples.** Se faire capturer exprès (Galaga), manger les fantômes en chaîne avant la fin de la peur (Pac-Man), l'araignée tuée de près (Centipede), rattraper l'humain qui tombe (Defender), aller chercher l'œuf (Joust), chasser la petite soucoupe (Asteroids).
- **Pourquoi.** La joueuse prudente survit ; la joueuse audacieuse marque. Le score sépare les deux, et l'audace est un choix, jamais une obligation : chacune règle sa propre difficulté.
- **Pour SNAKE 2975.**
  - **Frôlement** : un tir ennemi qui passe à moins de 6 px de jeu de la tête *(proposé)* sans la toucher rapporte des points et un éclat jaune.
  - **Tuer de près** : une victime abattue à moins de 24 px de la tête *(proposé)* vaut le double, comme l'araignée.
  - **Chaîne** : chaque victime dans les 1,5 s *(proposé)* qui suivent la précédente fait monter un multiplicateur, ×2 puis ×4 puis ×8, plafonné à ×8 *(proposé)*. Le multiplicateur s'affiche près de la tête, pas dans un coin.

### P5. Le rapport de force se retourne, un instant

- **Exemples.** La grosse pastille (Pac-Man), le marteau (Donkey Kong), la smart bomb (Defender), le Superzapper (Tempest).
- **Pourquoi.** Le chassé devient chasseur : c'est le moment de joie le plus fort de ces jeux. Il est **bref, rare et visible venir**, et il raccourcit avec les niveaux (la peur des fantômes) : le jeu reprend peu à peu ce qu'il donnait.
- **Pour SNAKE 2975.** Voir l'idée 5.4 (Surcharge). Règle générale : un seul retournement par vague, annoncé par un objet visible sur le radar, de durée décroissante d'une zone à l'autre (6 s, puis 5, 4, 3 *(proposé)*).

### P6. On protège quelqu'un

- **Exemples.** Les humanoïdes (Defender), les six villes (Missile Command), la dernière famille (Robotron).
- **Pourquoi.** Un enjeu hors de soi crée des décisions. Défendre oblige à aller là où l'on ne serait pas allé, et une perte (une ville, un humain) fait mal sans finir la partie.
- **Pour SNAKE 2975.** Les **Fugitifs** (idée 5.2) : des survivants, en os et ambre (jamais cyan), que la joueuse ramasse et qui voyagent dans son corps.

### P7. Grandir est une force et une charge

- **Exemples.** Le serpent de Nibbler s'allonge à chaque point et meurt sur lui-même ; Snake Byte, où chaque bouchée rend le jeu plus dur ; le double vaisseau de Galaga, cible double ; les améliorations de Gradius, qu'il vaut parfois mieux ne pas prendre ; les champignons de Centipede, chaque tir bâtissant l'obstacle suivant.
- **Pourquoi.** Si la puissance n'avait aucun prix, la meilleure stratégie serait évidente. Le prix fait de chaque gain une décision.
- **Pour SNAKE 2975.** Le corps doit **servir et gêner** à la fois :
  - il sert : chaque tranche de 10 segments *(proposé)* ajoute un canon latéral, et un corps long peut encercler (idée 5.1) ;
  - il gêne : un tir ennemi qui touche le corps **le coupe** à cet endroit, et la partie arrière se détache. Elle tombe en débris ramassables pendant 3 s *(proposé)*, comme la Force de R-Type qu'on récupère ou le captif de Galaga ;
  - un corps long rend les virages serrés dangereux, parce que la tête qui heurte le corps meurt (Nibbler).

  Cela répond au retour n° 4 : aujourd'hui le corps absorbe les tirs sans conséquence.

### P8. Le monde dépasse l'écran, et le radar le raconte

- **Exemples.** La planète et le scanner de Defender ; les trois plans de Moon Patrol ; Out Run et Space Harrier qui foncent vers l'horizon ; R-Type et Gradius, des voyages entiers.
- **Pourquoi.** Un monde plus grand que l'écran crée **l'anticipation** : ce qui arrive est annoncé (radar, horizon), et la joueuse décide d'aller vers ou de fuir. La parallaxe donne la vitesse et la profondeur sans coûter de lisibilité.
- **Pour SNAKE 2975.** C'est le retour n° 3 de la propriétaire :
  - un monde de 3 × 3 écrans *(proposé)* par zone, que la caméra suit en avance sur la direction de la tête (la joueuse voit plus loin devant que derrière) ;
  - trois plans de décor comme Moon Patrol : horizon et cité à 10 % de la vitesse de caméra, structures à 40 %, grille de sol à 100 % *(proposé)* ;
  - un radar de Defender en bande de 6 px de haut *(proposé)* en haut de l'écran : un point cyan pour la tête, magenta pour les ennemis, os pour les Fugitifs, jaune pour le butin ;
  - les ennemis qui viennent de hors champ sont annoncés au bord de l'écran par une flèche magenta, au moins 500 ms avant leur entrée (règle G-13 déjà posée).

### P9. Une mort instantanée, lisible et juste

- **Exemples.** Un coup dans Contra, Robotron, Tempest, Pac-Man, Defender. Les auteurs offraient des vies, mais chaque mort coûtait vraiment : l'arme perdue (Contra, Gradius), le multiplicateur de la famille remis à zéro (Robotron).
- **Pourquoi la joueuse l'accepte.** Trois conditions, présentes dans tous ces jeux :
  1. **on a vu venir le danger** (ennemis lisibles, P2) ;
  2. **la cause est évidente** au moment de mourir ;
  3. **on rejoue tout de suite** : la vague repart, et la partie suivante dure le temps de remettre une pièce.
- **Pour SNAKE 2975.** C'est le retour n° 4.
  - La tête meurt d'un seul contact, de mur, de son propre corps, d'ennemi ou de tir. Plus de glissement le long des murs.
  - Le corps ne protège plus : il se coupe (P7).
  - À la mort, 400 ms de gel *(proposé)*, l'image s'assombrit sauf la cause (l'ennemi ou le tir fautif, entouré d'os), son nom s'affiche (« TUÉE PAR UN COUPEUR »), puis le serpent éclate segment par segment, de la tête vers la queue.
  - Relance en 2 s au plus (G-02 déjà posée).
  - Les vies : s'il en reste, 3 au départ et une gagnée par palier de score (P13), mais **sans invulnérabilité de deux secondes** : à la reprise, le serpent réapparaît à un point sûr, ennemis repoussés hors d'un rayon de 64 px *(proposé)*, et repart à la moitié de sa longueur. Mourir coûte la moitié de soi, comme Gradius coûte les améliorations.

### P10. La difficulté monte par la vitesse, la densité et le répit

- **Exemples.** Pac-Man accélère et raccourcit la peur ; Cruise Elroy se déclenche plus tôt ; Nibbler accélère à chaque niveau ; Robotron envoie plus d'ennemis, plus vite ; le battement d'Asteroids s'accélère.
- **Pourquoi.** Ces jeux ne gonflent presque jamais les points de vie des ennemis. Ils prennent du **temps de réaction** à la joueuse : la maîtrise se mesure, et on sent qu'on progresse.
- **Pour SNAKE 2975.** C'est le retour n° 2 (« trop facile »). D'une zone à l'autre :
  - vitesse du serpent : +6 % par zone, plafonnée à +30 % *(proposé)*, avec la vitesse des ennemis qui suit ;
  - densité : +25 % d'ennemis vivants simultanés par zone *(proposé)*, sous le plafond G-16 ;
  - durée des retournements : décroissante (P5) ;
  - un « Elroy » dans chaque vague : quand il reste moins de 20 % des ennemis, le dernier Chasseur accélère au niveau du serpent *(proposé)*, pour que la fin de vague ne soit jamais un nettoyage tranquille.

### P11. Le rythme alterne vague, respiration et récompense

- **Exemples.** Les étapes bonus de Galaga ; les intermèdes de Pac-Man ; le cycle de quatre écrans de Donkey Kong ; les vagues spéciales de Joust ; la plongée finale de Tempest.
- **Pourquoi.** La tension continue fatigue. Une respiration récompense, montre un spectacle, et fait attendre la suivante.
- **Pour SNAKE 2975.**
  - **Étape bonus** toutes les trois zones *(proposé)* : 30 s d'escadrilles qui ne tirent pas et tracent des courbes de Galaga ; 40 sur 40 abattus donne « PARFAIT » et un gros bonus ;
  - **intermède** de 4 s au plus après chaque boss (le serpent et un ennemi comique, sans texte), sautable d'un toucher ;
  - **plongée de fin de zone** : le serpent fonce vers le portail de la zone suivante en vue Space Harrier, 3 s pendant lesquelles il ramasse le butin restant et évite les mines laissées en route (Tempest).

### P12. L'arme se construit, et se perd

- **Exemples.** La barre de Gradius, la Force de R-Type, le Spread Gun de Contra, le double vaisseau de Galaga, le marteau de Donkey Kong.
- **Pourquoi.** La joueuse compose sa puissance par ses choix ; la perdre en mourant rend chaque vie précieuse, et la reconstruire est un plaisir en soi.
- **Pour SNAKE 2975.** Voir l'idée 5.3 (barre d'armes et Options qui suivent la trace). L'arme ne monte que par choix, jamais par tirage au hasard, et la mort fait redescendre la barre d'un cran par mort *(proposé)*, pas tout d'un coup : sur téléphone, la sanction de Gradius serait trop dure.

### P13. Un score qui raconte et qui promet

- **Exemples.** La chaîne 200-400-800-1 600 (Pac-Man) ; les lettres EXTEND (Bubble Bobble) ; les œufs à valeur croissante (Joust) ; la famille de 1 000 à 5 000 (Robotron) ; le compteur à neuf chiffres de Nibbler ; le temps restant compté en points (Donkey Kong).
- **Pourquoi.** Un score qui monte par paliers visibles **raconte la partie** (« j'ai fait ×8 ») et une collection incomplète (EXTEND) donne un but à court terme qu'on voit.
- **Pour SNAKE 2975.**
  - Les points des chaînes doublent à chaque victime : 100, 200, 400, 800, puis 1 600 et au-delà *(proposé)* ;
  - **N-É-O-N** : quatre lettres qui tombent des chaînes de 4 victimes ou plus ; le mot complet donne une vie et un bonus (EXTEND) ;
  - le temps restant de la zone s'ajoute au score à la sortie (Donkey Kong) ;
  - à l'écran de fin, le meilleur moment de la partie (« CHAÎNE ×8, ZONE 4 ») en plus du score.

### P14. Le son est une jauge de tension

- **Exemples.** Le battement d'Asteroids qui accélère ; la sirène de Pac-Man qui monte quand les pastilles se raréfient [mémoire] ; la marche de Space Invaders (1978) qui accélère à mesure que les envahisseurs tombent [mémoire] ; le narrateur de Gauntlet qui réclame à manger.
- **Pourquoi.** L'oreille lit la tension sans détourner les yeux. Le rythme qui accélère fait monter le pouls de la joueuse avec celui du jeu.
- **Pour SNAKE 2975.** La musique générée (`DIRECTION.md`) prend un **tempo qui suit la menace** : +4 BPM par tranche de 10 ennemis vivants *(proposé)* ; une basse en « battement » qui accélère quand il reste peu d'ennemis ; un signal vocal synthétique bref et unique pour TRAQUEUR et pour la Surcharge. Le jeu reste jouable sans le son (règle déjà posée).

### P15. Le spectacle promet l'écran suivant

- **Exemples.** Les quatre écrans de Donkey Kong ; les quatre jeux de Tron ; les bifurcations d'Out Run ; les niveaux de R-Type, chacun avec son idée ; les intermèdes de Pac-Man ; et le mode démonstration de toutes les bornes, qui montrait le meilleur du jeu.
- **Pourquoi.** On remet une pièce pour **voir ce qu'il y a après**. Chaque zone doit montrer quelque chose de neuf, et le jeu doit laisser entrevoir ce qu'on n'a pas encore vu.
- **Pour SNAKE 2975.**
  - chaque zone a **une idée de terrain** qui lui est propre (courants qui poussent le serpent, murs qui se referment, obscurité où seul le radar voit) ;
  - à la fin de chaque zone, **deux portails** à la manière d'Out Run, l'un sûr (à gauche, os) et l'autre dur (à droite, magenta), vers des zones différentes et des fins différentes ;
  - l'horizon de la parallaxe montre de loin la silhouette du boss de la zone dès son début ;
  - le mode démonstration de l'écran-titre joue une vraie partie automatique qui montre une chaîne, un encerclement et un boss (le pilote automatique de `tools/jeu/` existe déjà).

---

## 4. Ce que ces principes changent dans la démo actuelle

Lecture rapide de `src/70-game.js` et de `refonte/RETOURS-PROPRIETAIRE.md`, croisée avec les principes. C'est une analyse, à confirmer en jouant.

| Retour de la propriétaire | Ce que fait la démo | Principe qui répond |
|---|---|---|
| « triste, basique » | une seule idée de jeu sur deux minutes | P2 (ennemis à caractère), P11 (rythme), P15 (écran suivant) |
| « trop facile » | trois vies, deux secondes d'invulnérabilité, rien contre l'attente | P3 (Traqueur), P10 (vitesse et densité), P4 (le score pousse à risquer) |
| « parallaxe, plateau qui se déplace » | arène fixe de la taille de l'écran | P8 (monde, caméra, trois plans, radar) |
| « pouvoir mourir » | le serpent glisse le long des murs, le corps absorbe les tirs | P9 (mort lisible), P7 (le corps se coupe) |

---

## 5. Cinq idées de jeu fortes pour SNAKE 2975

Chacune vient directement d'un ou deux classiques, et chacune fait ce qu'un serpent fait mieux que tout autre héros.

### 5.1 L'Encerclement de lumière (Blockade, Tron, Centipede)

- **L'idée.** La queue laisse une traînée de lumière cyan pâle qui dure 1,5 s *(proposé)*. Si la tête recoupe sa propre traînée ou son corps et ferme une boucle, **tout ce qui est à l'intérieur explose** : ennemis, tirs, mines. Le butin à l'intérieur est aspiré.
- **Le risque.** Plus la boucle est grande, plus elle rapporte (×1 par ennemi enfermé, puis le multiplicateur de chaîne), mais une grande boucle demande un corps long et du temps, pendant que les Coupeurs (P2) visent devant la tête. Toucher la traînée avec la tête ne tue pas (c'est la fermeture), toucher son corps tue toujours.
- **Les rivaux.** Dès la zone 3 *(proposé)*, des **serpents-rivaux magenta** suivent la même règle que la joueuse, comme les motos de Tron : ils laissent eux aussi une traînée qui tue. On les bat en les faisant s'écraser sur la sienne. Ce sont les meilleurs ennemis possibles, parce qu'on comprend tout de suite ce qu'ils veulent.
- **Pourquoi c'est fort.** C'est la bombe du serpent : elle vient de son corps, pas d'un bouton. Elle retrouve l'idée-mère du genre (Blockade : enfermer avec sa trace).

### 5.2 Les Fugitifs (Defender, Robotron)

- **L'idée.** Dans le monde qui défile, des survivants os et ambre errent. Le radar les montre. Des **Ravisseurs** viennent les saisir et remontent vers le bord de la zone ; s'ils l'atteignent, le survivant devient un Mutant rapide.
- **Le sauvetage.** La tête qui touche un survivant le prend à bord : il devient un segment os dans le corps. On les ramène à une balise de sauvetage pour une prime croissante (1 000, 2 000, jusqu'à 5 000 *(proposé)*, comme la famille de Robotron), remise à zéro à la mort.
- **Le risque.** Un tir qui coupe le corps (P7) en arrière d'un survivant le fait tomber ; il faut le rattraper avant qu'il ne touche le sol (Defender). Plus le serpent porte de survivants, plus il a à perdre.
- **L'échec visible.** Si tous les survivants d'une zone sont perdus, la cité de l'horizon s'éteint dans la parallaxe et tous les Ravisseurs deviennent Mutants jusqu'à la zone suivante.
- **Pourquoi c'est fort.** Le radar crée des décisions (« j'y vais ? »), et l'enjeu oblige à plonger dans la foule au lieu de tourner au bord.

### 5.3 La barre d'armes et les Options qui suivent la trace (Gradius, R-Type)

- **L'idée.** Les capsules ambre font avancer un curseur sur une barre de six cases en bas de l'écran : VITESSE, MISSILE, DOUBLE, LASER, OPTION, BOUCLIER. Un double toucher n'importe où *(proposé)* achète la case éclairée et remet le curseur au début.
- **L'Option, née pour le serpent.** Une sphère cyan qui suit **exactement la trace de la tête**, à 20 segments de retard *(proposé)*, et répète chaque tir. Jusqu'à trois. Dans Gradius elle imitait un serpent ; ici elle en est un morceau.
- **Le choix.** DOUBLE et LASER s'excluent. VITESSE est un piège au-delà de deux niveaux (Gradius). Le BOUCLIER protège la tête de deux tirs, de face seulement (la Force de R-Type) : il oblige à faire face au danger.
- **La perte.** Chaque mort fait redescendre d'un cran l'amélioration la plus haute (P12).
- **Contrainte mobile.** Le double toucher doit rester compatible avec la règle « un pouce suffit » (G-19) ; à défaut, l'achat se fait automatiquement sur la case choisie à l'avance au briefing *(proposé)*. À trancher en jouant.
- **Pourquoi c'est fort.** La joueuse compose son serpent, et l'Option donne une raison de dessiner de belles trajectoires.

### 5.4 La Surcharge et le Traqueur (Pac-Man, Bubble Bobble, Joust)

- **La Surcharge.** Une ou deux grosses pastilles jaunes par zone, visibles sur le radar. Avalée, elle rend pour 6 s *(proposé, puis décroissant d'une zone à l'autre)* **tous les ennemis bleu nuit et fuyards**. La tête les dévore au contact : 200, 400, 800, 1 600 points, et chaque victime ajoute un segment. Ils clignotent os pendant la dernière seconde pour prévenir la fin.
- **Le Traqueur.** Si la joueuse ne tue rien et ne ramasse rien pendant 8 s *(proposé)*, un Traqueur indestructible entre et suit la tête à sa vitesse jusqu'à la fin de la vague (P3). La Surcharge est le seul moment où l'on peut le dévorer, pour 5 000 points *(proposé)* : un vrai pari, puisqu'il faut traîner pour le faire venir.
- **Pourquoi c'est fort.** La chasse inversée est le moment le plus joyeux de l'arcade, et pour un serpent qui avance toujours, foncer sur ce qui vous chassait est la libération parfaite. Le Traqueur règle d'un coup le « trop facile ».

### 5.5 La queue capturée et le Serpent jumeau (Galaga)

- **L'idée.** Une fois par zone *(proposé)*, un **Capteur** se place devant la trajectoire et déploie un rayon en éventail, annoncé 800 ms à l'avance. S'il prend la tête, il ne la tue pas : il **arrache la seconde moitié du corps** et l'emporte en orbite autour de lui.
- **La reconquête.** Abattre le Capteur pendant qu'il plonge rend la queue, qui revient se placer en **Serpent jumeau** parallèle à la joueuse : double tir, mais double cible, et le jumeau meurt d'un seul coup. Tirer sur la queue captive la détruit (Galaga).
- **Le pari.** Une joueuse sûre d'elle se jette dans le rayon pour gagner le jumeau. La prudente l'évite.
- **L'étape bonus.** Le jumeau prend tout son sens dans l'étape bonus de 40 ennemis (P11), où il double les chances du PARFAIT.
- **Pourquoi c'est fort.** C'est la seule capture de l'arcade qui joue avec le corps lui-même. Elle transforme une perte en objectif, ce qui donne une mort qui fait peur et une reconquête qui fait plaisir.

---

## 6. Points à vérifier avant d'en faire des règles

- Tous les faits marqués [mémoire], en particulier : les points de la chaîne de Pac-Man et les niveaux des intermèdes, la fréquence et le bonus parfait des étapes de Galaga, l'explosion de la planète dans Defender, les Hulks et les Brains de Robotron, les écrans de Donkey Kong par niveau, l'araignée de Centipede à 300/600/900, la révision d'Asteroids contre le « lurking ».
- Les nombres où les sources divergent : munitions de Missile Command (10 ou 6 par base), points de passage de Moon Patrol (25 ou 26), date de Space Harrier, date de la sortie de Nibbler.
- Les chiffres *(proposés)* de la section 3 et 5 : ce sont des points de départ pour les essais, pas des valeurs démontrées.
- La compatibilité de l'idée 5.3 avec le contrôle à un pouce (G-19).

## 7. Sources

Pages citées ci-dessus, lues par leurs extraits de recherche (17 octobre 2026) :

- Blockade et le genre : [Wikipédia, Blockade](https://en.wikipedia.org/wiki/Blockade_(video_game)) · [Wikipédia, Snake (genre)](https://en.wikipedia.org/wiki/Snake_(video_game_genre)) · [snakegame.net, Snake Byte](https://www.snakegame.net/blog-posts/first-snake-game-to-eat-apples)
- Nibbler : [Wikipédia](https://en.wikipedia.org/wiki/Nibbler_(video_game)) · [Arcade Blogger](https://arcadeblogger.com/2016/07/01/nibbler-the-billion-point-arcade-game/) · [MobyGames](https://www.mobygames.com/game/59918/rock-olas-nibbler/) · [Arcade Club](https://www.arcadeclub.co.uk/games/nibbler/) · [StrategyWiki](https://strategywiki.org/wiki/Nibbler)
- Tron : [Wikipédia](https://en.wikipedia.org/wiki/Tron_(video_game))
- Pac-Man : [Game Developer, Pac-Man Dossier](https://www.gamedeveloper.com/game-platforms/feature-the-i-pac-man-i-dossier) · [Game Design Skills](https://gamedesignskills.com/game-design/pac-man-pathfinding/) · [Pac-Man wiki, Cruise Elroy](https://pacman.fandom.com/wiki/Cruise_Elroy) · [Grand Text Auto](https://grandtextauto.soe.ucsc.edu/2009/02/19/the-fruit-of-the-tree-of-pac-man-knowledge/) · [TechSpot](https://www.techspot.com/trivia/141-if-you-reach-level-256-game-pac-man) · [80s Video Games wiki](https://80s-video-games.fandom.com/wiki/Pacman)
- Donkey Kong : [Wikipédia](https://en.wikipedia.org/wiki/Donkey_Kong_(1981_video_game)) · [guide de fan](https://everynin.yolasite.com/donkey-kong.php)
- Gauntlet : [Wikipédia](https://en.wikipedia.org/wiki/Gauntlet_(1985_video_game)) · [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Gauntlet)
- Asteroids : [Wikipédia](https://en.wikipedia.org/wiki/Asteroids_(video_game)) · [Giant Bomb](https://giantbomb.com/wiki/Games/Asteroids)
- Centipede : [Wikipédia](https://en.wikipedia.org/wiki/Centipede_(video_game)) · [StrategyWiki](https://StrategyWiki.org/wiki/Centipede)
- Missile Command : [Wikipédia](https://en.wikipedia.org/wiki/Missile_Command) · [arcade-history](https://www.arcade-history.com/game/1644/)
- Tempest : [Giant Bomb](https://giantbomb.com/wiki/Games/Tempest) · [arcade-history](https://www.arcade-history.com/game/2865/)
- Galaga : [StrategyWiki](https://strategywiki.org/wiki/Galaga/Walkthrough) · [Wikipédia](https://Www.wikipedia.org/wiki/Galaga) · [TrueAchievements](https://i1.trueachievements.com/game/ARCADE-GAME-SERIES-GALAGA/walkthrough/3)
- Joust : [Wikipédia](https://en.wikipedia.org/wiki/Joust_(video_game)) · [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Videogame/Joust)
- Bubble Bobble : [Lost in Translation](https://www.exotica.org.uk/wiki/Lost_In_Translation/Bubble_Bobble) · [manuel NES](https://archive.org/download/NESManuals/Bubble%20Bobble%20%28USA%29_text.pdf) · [Bubble Bobble wiki](https://bubblebobble.fandom.com/wiki/Extend_Bubble)
- Defender : [Wikipédia](https://www.wikipedia.com/wiki/Defender_(game)) · [shmup wiki](https://shmup.fandom.com/wiki/Defender) · [Set Side B](https://setsideb.com/tag/baiter/)
- Robotron: 2084 : [Wikipédia](https://en.wikipedia.org/wiki/Robotron:_2084) · [StrategyWiki](https://strategywiki.org/wiki/Robotron:_2084)
- Moon Patrol et parallaxe : [Wikipédia, Parallax scrolling](https://en.wikipedia.org/wiki/Parallax_scrolling) · [Giant Bomb](https://giantbomb.com/wiki/Concepts/Parallax_Scrolling) · [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/MoonPatrol) · [MobyGames](https://www.mobygames.com/game/575?s=platform)
- Gradius : [arcade-history](https://www.arcade-history.com/game/996/) · [Giant Bomb](https://giantbomb.com/wiki/Games/Gradius) · [Giant Bomb, Gradius II](https://www.giantbomb.com/games/3030-3623/) · [miroir de Wikipédia](https://wikipedia2007.classicistranieri.com/g/r/a/Gradius_%28video_game%29.html)
- R-Type : [Wikipédia](https://en.wikipedia.org/wiki/R-Type) · [shmups wiki](https://shmups.wiki/library/R-Type)
- Contra : [Wikipédia, série](https://en.wikipedia.org/wiki/Contra_(series)) · [arcade-history](https://www.arcade-history.com/game/497/) · [StrategyWiki, Gryzor](https://strategywiki.org/wiki/Gryzor)
- Space Harrier : [Giant Bomb](https://giantbomb.com/wiki/Games/Space_Harrier) · [Sega wiki](https://sega.fandom.com/wiki/Space_Harrier)
- Out Run : [Giant Bomb](https://giantbomb.com/wiki/Games/OutRun) · [TIME, All-Time 100](https://techland.time.com/2012/11/15/all-time-100-video-games/slide/out-run-1986/)
