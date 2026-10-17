# La quintessence audiovisuelle des succès d'arcade des années 80, appliquée à SNAKE 2975

Étude du 17 octobre 2026, écrite pour la refonte demandée dans `refonte/RETOURS-PROPRIETAIRE.md`
(« triste, basique, trop facile » ; parallaxe, plateau qui se déplace, vraie mort).

**Statut des sources.** La recherche web a fonctionné. Chaque affirmation porte une marque :

- **[S]** : établi, vérifié pendant cette étude ; la source est donnée en lien (liste complète à la fin) ;
- **[C]** : connaissance largement répandue que je n'ai **pas** revérifiée cette fois-ci ; à confirmer avant
  de la citer ailleurs ;
- **[A]** : mon analyse ou ma recommandation, pas un fait.

Aucun chiffre ni aucune source n'est inventé. Quand les sources se contredisent, je le dis.

---

## 0. Pourquoi la démo paraît « triste », du point de vue audiovisuel [A]

La démo a déjà beaucoup d'éléments justes (palette fermée, gros pixels réels, explosions en anneaux,
musique générative à quatre couches). Ce qui manque, ce n'est pas de la matière, c'est de la
**mise en scène** :

1. **Le monde ne bouge pas.** Une arène fixe de la taille de l'écran : l'œil n'a aucune profondeur, aucun
   ailleurs. Les grands succès donnent toujours l'impression qu'il existe un monde au-delà du cadre
   (Defender, Moon Patrol, Gradius, Out Run).
2. **La machine ne parle pas.** Pas de « READY! », pas de voix, pas de « WARNING », pas d'annonce du
   colosse : les moments forts ne sont pas encadrés.
3. **Il n'y a pas d'enjeu affiché.** Pas de tableau des records, pas d'initiales, pas de score qui
   appartient à quelqu'un.
4. **Le danger ne s'entend pas assez.** Le tempo musical ne va que de 112 à 128 BPM (`30-music.js`,
   `BPM_LOW`, `BPM_HIGH`) : à l'oreille, c'est presque un palier. Space Invaders a prouvé qu'une
   accélération franche du rythme suffit à faire monter le cœur.
5. **La mort n'existe pas** (retour 4 de la propriétaire), donc il n'y a ni peur, ni spectacle de la mort,
   ni relance qui donne envie de « une dernière ».

Les quinze principes du chapitre 3 répondent chacun à au moins un de ces manques.

---

## 1. Panorama : ce que faisaient les grands succès

### 1.1 L'écran-titre et le mode attraction (attract mode)

Une borne d'arcade passait l'essentiel de sa vie **sans joueur**. Le mode attraction était sa publicité :
il devait arrêter un passant à trois mètres et lui apprendre le jeu en quelques secondes.

- **Defender (Williams, 1981)** : la veille du salon où il devait être présenté, Eugene Jarvis s'aperçoit
  que le jeu n'a pas de mode attraction, la démo qui montre aux acheteurs à quoi ressemble le jeu en
  action ; l'équipe le code dans la nuit [S, Wikipedia *Defender*]. Preuve que l'industrie le jugeait
  indispensable à la vente.
- **Pac-Man (Namco, 1980)** : le mode attraction **présente les personnages** un par un, avec leur
  « vrai » nom et leur surnom : Shadow « Blinky », Speedy « Pinky », Bashful « Inky », Pokey « Clyde »
  [S, retrododo, SmashWiki]. Les noms des fantômes viennent de là. Il enchaîne ensuite une démo jouée
  par la machine [C].
- La structure classique, commune à presque toutes les bornes [C] : écran-titre → démo jouée par la
  machine → tableau des records → écran « INSERT COIN » qui clignote → retour au titre. Chaque étape dure
  quelques secondes ; la boucle complète, de l'ordre de la demi-minute.

**Ce que ça enseigne [A]** : le premier contact se fait par le **mouvement** (la démo), pas par le texte ;
on montre les ennemis par leur nom ; on montre qu'on peut mourir ; on montre les meilleurs scores.

### 1.2 Le tableau des records et les initiales

- **Star Fire (Exidy, 1979)** est crédité comme le premier jeu où le meilleur joueur peut inscrire ses
  initiales au tableau des records [S, Wikipedia *Star Fire*, Den of Geek]. Space Invaders, avant lui,
  ne retenait que le meilleur score, sans nom [S, Den of Geek]. La date exacte de Star Fire varie selon les
  sources (fin 1978 ou 1979).
- Les **trois lettres** sont devenues la norme du genre [C] ; Star Fire contenait déjà des œufs de Pâques
  sur des codes de trois lettres (« DBR » affiche « HI DAVE ») [S, Wikipedia].
- **Out Run (Sega, 1986)** a une musique **réservée** à la saisie du nom au tableau, « Last Wave »
  [S, exotica.org.uk] : la récompense est aussi sonore.

**Ce que ça enseigne [A]** : le score n'est intéressant que s'il appartient à quelqu'un. Le moment de la
saisie des initiales est une cérémonie (musique propre, temps suspendu), pas un formulaire.

### 1.3 Les intermissions de Pac-Man

- Pac-Man insère de courtes scènes comiques entre certains tableaux (« coffee breaks ») : la première
  après le tableau 2, la deuxième après le 5, la troisième après les tableaux 9, 13 et 17 [S, StrategyWiki].
- Elles racontent une mini-histoire en trois actes : Blinky poursuit Pac-Man ; son « drap » se déchire sur
  un clou et il regarde les dégâts ; il repasse, recousu de façon visible [S pour les deux premiers actes,
  Pac-Man Wiki *Coffee Break* ; la description du troisième est C].
- Taito avait introduit de brèves scènes comiques entre les niveaux dès *Space Invaders Part II* (1979)
  [S, résultat de recherche citant l'historique des cinématiques].

**Ce que ça enseigne [A]** : une intermission est une **récompense** (elle arrive parce qu'on a réussi),
elle est **courte** (quelques secondes), **muette ou presque** (gags visuels lisibles sans texte), et
elle fait des ennemis des **personnages**. Elle donne aussi un rythme respiratoire à la partie.

### 1.4 Le défilement parallaxe

- **Moon Patrol (Irem, 1982)** est généralement crédité comme le premier jeu d'arcade à **parallaxe
  complète** : trois plans de décor qui défilent à des vitesses différentes [S, Wikipedia *Moon Patrol*,
  Giant Bomb]. Des formes plus limitées existaient avant : *Jump Bug* (1981), *Scramble* et *Super Cobra*
  (1981), avec deux plans dont un ciel étoilé fixe [S, Wikipedia, Giant Bomb]. *Jungle King* (Taito) sort
  un mois après Moon Patrol, lui aussi avec parallaxe [S, Wikipedia].
- **Defender (1981)** n'est pas l'exemple canonique de la parallaxe, mais celui du **monde plus grand que
  l'écran** : on y vole dans les deux sens au-dessus d'un territoire bien plus large que la fenêtre, et un
  **radar** (la mini-carte en haut) montre où l'on est et où sont les ennemis [S, Wikipedia, Mental Floss].
- **Gradius (Konami, 1985)** : défilement forcé ; le décor se déplace sans attendre la joueuse et l'oblige
  à composer avec le terrain [C]. C'est le « plateau qui se déplace ».
- **Shadow of the Beast (Psygnosis / Reflections, Amiga, 1989)** : jusqu'à **douze plans** de parallaxe dans
  les scènes extérieures [S, Wikipedia, Generation Amiga]. Le chiffre d'environ 128 couleurs à l'écran vient
  surtout du discours promotionnel de l'époque [S : l'article le donne avec « reportedly »].
- **Le défilement ligne par ligne (raster / line scroll)** : la Mega Drive peut décaler chaque ligne de
  l'écran indépendamment. Dans *Thunder Force IV* (1992, hors décennie mais héritier direct), l'eau
  défile ligne par ligne, **plus vite en bas qu'en haut**, ce qui crée une forte impression de profondeur ;
  les nuages, eux, simulent de nombreux plans avec seulement deux couches et un jeu de vitesses et de
  priorités [S, rasterscroll.com]. La même idée fait la route d'Out Run et le sol de Space Harrier [C].

**Ce que ça enseigne [A]** : trois plans suffisent pour « faire de la profondeur » (Moon Patrol) ; le
spectaculaire vient de la **multiplication** des plans et surtout du **sol en défilement ligne par ligne**,
qui donne une vraie perspective avec une technique 2D. Et le monde plus grand que l'écran exige un radar.

### 1.5 Couleurs et palettes des bornes

- **Galaxian (Namco, 1979)** : matériel en couleur RVB, sprites multicolores et décors en tuiles
  [S, Wikipedia *Sprite*, Codex Gamicus]. C'est le saut qui rend possibles les personnages colorés de
  Pac-Man.
- **Pac-Man** : chaque fantôme a **une** couleur, qui est aussi son caractère ; fond noir, labyrinthe bleu,
  pastilles claires [C]. Les fantômes vulnérables changent de couleur (bleu, puis clignotent blanc avant de
  redevenir dangereux) : le changement de couleur **est** l'information de jeu [C].
- **Downwell (Moppin, 2015)**, héritier moderne : une palette de quatre emplacements seulement (fond,
  primaire, secondaire, tertiaire réservé aux cas spéciaux), noir, blanc et rouge par défaut ; d'autres
  palettes se débloquent en accumulant des gemmes [S, Wikipedia, Downwell Wiki, Giant Bomb]. Une revue
  parle de trois couleurs [S, Gaming Nexus] : la différence vient de ce qu'on compte ou non le fond.
- **La rotation de palette (color cycling)** : sur les machines à couleurs indexées (Amiga, PC EGA/VGA),
  on animait l'eau, le feu ou les néons en **faisant tourner les couleurs d'une rampe** sans redessiner
  un seul pixel ; Deluxe Paint (1985) en a fait un outil d'artiste [C].

**Ce que ça enseigne [A]** : une palette courte n'est pas une pauvreté, c'est une **grammaire**. Le
code couleur porte l'information (qui est dangereux, qui est vulnérable, qui est moi), et un changement
de palette suffit à changer l'ambiance d'un tableau entier.

### 1.6 Lisibilité des sprites

- Pac-Man : des silhouettes **identiques** (les quatre fantômes ont la même forme), distinguées par la
  seule couleur et le comportement ; les yeux indiquent la direction [C].
- Galaga, Galaxian : les ennemis ont des silhouettes nettement différentes par rang, avec une couleur par
  type [C].
- Defender, Robotron : fond noir, objets peu nombreux et saturés, aucun décor derrière l'action [C].

**Ce que ça enseigne [A]** : à basse résolution, la lisibilité vient de **trois** canaux redondants :
silhouette, couleur, mouvement. Et surtout du contraste avec un fond **qui ne concurrence pas**.

### 1.7 Explosions et morts spectaculaires

- **Mort de Pac-Man** : une animation entièrement dédiée, où le personnage se replie sur lui-même sur un son
  descendant ; Toru Iwatani en a montré le dessin préparatoire dans sa conférence rétrospective à la GDC
  [S pour l'existence du dessin, Engadget ; description de l'animation C].
- **Missile Command (Atari, 1980)** : la partie ne finit pas par « GAME OVER » mais par « THE END », dans une
  grande explosion — peut-être un clin d'œil à l'apocalypse nucléaire [S, Silverball Museum, TV Tropes].
- **Defender, Robotron: 2084 (Williams, 1981-1982)** : explosions en gerbes de fragments, écran qui flashe
  à la bombe intelligente [C].
- **Hotline Miami (Dennaton, 2012)** : on meurt d'un seul coup, comme les ennemis ; la mort arrive vite, la
  relance encore plus vite ; après un étage nettoyé, le jeu ralentit pour montrer le carnage [S, Engadget,
  games.gg].
- **Resogun (Housemarque, 2013)** : ennemis et décors faits de centaines de milliers de voxels qui volent en
  éclats en temps réel [S, Housemarque, Giant Bomb].
- **« Juice It or Lose It »** (Martin Jonasson et Petri Purho) montre un casse-briques transformé par la
  couleur, l'accélération, l'étirement, le son, les secousses et les flashs ; **« The Art of Screenshake »**
  (Jan Willem Nijman, Vlambeer) est la conférence de référence sur la secousse [S, rpgplayground, itch.io].

**Ce que ça enseigne [A]** : une mort est un **moment de cinéma** de une à deux secondes, avec son
propre son et sa propre image ; ensuite, la relance doit être instantanée. Et une explosion est une
**forme** (fragments, anneaux, éclats), pas un flou.

### 1.8 L'annonce vocale et le texte crié

- **Pac-Man** affiche « READY! » en jaune au centre du labyrinthe avant chaque vie [C].
- **Berzerk (Stern, 1980)** : un des premiers jeux à synthèse vocale, sur une puce LPC dédiée ; les robots
  parlent, et « Intruder alert! Intruder alert! » annonce l'arrivée d'Evil Otto ; trente mots de
  vocabulaire, à un coût estimé à environ 1 000 dollars par mot [S, Wikipedia, arcade-history].
- **Sinistar (Williams, 1982)** : voix numérisée ; quand le Sinistar est assemblé, il annonce
  « Beware, I live » puis harcèle le joueur (« I hunger! ») [S, Wikipedia, PopMatters].
- **Gauntlet (Atari, 1985)** : un narrateur (puce TMS5220C, voix d'Ernie Fosselius) répète les règles et
  l'urgence : « Warrior needs food, badly », « Valkyrie is about to die » sous 200 points de vie
  [S, Wikipedia ; la formulation exacte varie selon les sources].
- **Darius (Taito, 1986)** : l'écran « WARNING! A HUGE BATTLESHIP … IS APPROACHING FAST » avant chaque boss
  [C]. **Space Harrier (Sega, 1985)** : « Welcome to the Fantasy Zone. Get ready! » [C].
- **Super Hexagon (Terry Cavanagh, 2012)** : une annonceuse (la journaliste Jenn Frank) au ton
  « légèrement moqueur » ; Cavanagh avait d'abord une voix de synthèse et dit ne plus pouvoir imaginer le
  jeu sans elle [S, Giant Bomb, MCV]. **Resogun** : la voix annonce « Save the last remaining humans » au
  début de chaque étape [S, revue citée par la recherche].

**Ce que ça enseigne [A]** : la voix sert à **trois** choses : encadrer (début, fin), **annoncer un danger
avant qu'il arrive**, et **donner une personnalité à l'ennemi** (Sinistar). Elle est rare, courte, et
toujours liée à un enjeu.

### 1.9 La musique

- **Out Run (Sega, 1986)** : la joueuse **choisit** sa musique au départ parmi trois morceaux, « Magical
  Sound Shower », « Passing Breeze » et « Splash Wave », présentés comme des stations de radio FM captées
  par l'autoradio de la Testarossa ; « Last Wave » accompagne la saisie du score [S, exotica.org.uk,
  Wikipedia]. Compositeur : Hiroshi Kawaguchi (une vieille copie d'encyclopédie dit Miyauchi, c'est
  vraisemblablement une erreur) [S]. Son : YM2151 stéréo et Sega PCM [S, une seule source].
- **Gradius (Konami, 1985)** : musique de Miki Higashino, entrée chez Konami à seize ans ; des mélodies
  joyeuses qui planent au-dessus d'un accompagnement en arpèges, malgré une puce modeste [S, Giant Bomb,
  Square Enix Music Online]. La carte GX400 sur laquelle tourne Gradius associe, selon les jeux, deux
  AY-3-8910 (PSG) ou un YM2151 (FM), une puce de voix VLM5030 et le K005289 de Konami [S, au niveau de la
  carte et non du jeu].
- **Pac-Man** : le son est produit par la WSG de Namco, synthétiseur à table d'onde de **trois voix**,
  formes d'onde de 32 échantillons sur 4 bits [S, vgmrips, documentation Furnace].
- **Les familles de puces [S/C]** : PSG (AY-3-8910, SN76489) = ondes carrées et bruit, d'où les arpèges
  rapides pour simuler des accords ; FM (YM2151, YM2203, YM2612) = timbres métalliques, basses et cuivres
  qui « claquent » ; échantillons (Sega PCM) = batteries et voix. La couleur sonore des années 80 vient
  autant de ces **contraintes** que des compositions.

**Ce que ça enseigne [A]** : (1) une musique d'arcade a un **thème qu'on fredonne** ; (2) la contrainte de
voix produit un style reconnaissable (arpèges, basse FM, bruit en batterie) ; (3) **donner le choix**
(Out Run) transforme la musique en appartenance.

### 1.10 Les sons qui deviennent iconiques

- Le « waka waka » de Pac-Man, la sirène qui monte, la mort qui descend, les points des fantômes mangés
  qui doublent à chaque fantôme d'une même énergisation (200, 400, 800, 1 600) [C].
- **Galaga** : un tableau bonus, le « Challenging Stage », où 40 ennemis passent sans tirer ; tous les abattre
  rapporte 10 000 points [S, exotica.org.uk, TrueAchievements]. La musique de ce tableau est elle-même
  devenue culte [C].
- **Tetris Effect (Resonair, 2018)**, dans la lignée de Rez et Lumines de Tetsuya Mizuguchi : chaque
  rotation et chaque pose de pièce **ajoute une note à la musique** ; les sons sont superposés à la piste
  de façon à ce que l'ensemble reste de la musique [S, wccftech, Gaming Nexus, Wikipedia *Mizuguchi*].

**Ce que ça enseigne [A]** : un son devient iconique quand il est **court, unique à un événement,
répété souvent, et qu'il change avec l'enjeu** (la hauteur qui monte avec la série).

### 1.11 Le rythme qui s'accélère avec le danger

- **Space Invaders (Taito, 1978)** : moins il reste d'envahisseurs, plus ils vont vite, et le son de leur
  marche accélère avec eux. C'était à l'origine une conséquence du matériel (moins d'objets à déplacer,
  donc des boucles plus courtes) ; Tomohiro Nishikado l'a gardée parce qu'elle rendait le jeu plus prenant
  [S, IEEE Spectrum, Looper, Giant Bomb].
- **Pac-Man** : Blinky reçoit une forte accélération quand il ne reste plus qu'un certain nombre de
  pastilles (« Cruise Elroy ») [S, StrategyWiki] ; la sirène de fond accélère au fil du tableau [C].
- **Asteroids (Atari, 1979)** : deux notes graves alternées, comme un battement de cœur, dont le tempo
  s'accélère au fil de la vague [C ; ma recherche n'a pas trouvé de source fiable].
- **Hotline Miami** : bande-son synthwave à quatre temps, choisie par les développeurs, qui a fait découvrir
  la synthwave à toute une génération de joueurs [S, Engadget, Laced Records].

**Ce que ça enseigne [A]** : le meilleur indicateur de danger n'est pas une jauge, c'est un **tempo**. Le
corps le comprend avant la tête.

### 1.12 Ce qu'en ont tiré les néo-rétro

| jeu | ce qu'il a pris aux années 80 | ce qu'il a ajouté | fait |
|---|---|---|---|
| Geometry Wars: Retro Evolved (Bizarre Creations, 2005) | vecteurs néon, arène, score | une **grille de fond qui se déforme** sous les joueurs, les ennemis et les bombes, dont l'onde de choc fait onduler la grille | [S] Wikipedia, Giant Bomb |
| Resogun (Housemarque, 2013) | Defender (humains à sauver, monde qui boucle) | explosions en voxels, annonceur vocal | [S] Housemarque, Giant Bomb |
| Hotline Miami (Dennaton, 2012) | vue de dessus, mort en un coup | synthwave, relance instantanée, ralenti après le carnage, image qui scintille comme une vieille cassette | [S] Engadget, games.gg |
| Downwell (Moppin, 2015) | palette minuscule, score | palettes à débloquer, jeu vertical pensé pour le téléphone | [S] Wikipedia, Giant Bomb |
| Tetris Effect (Resonair, 2018) | Tetris | chaque geste joue une note ; les décors pulsent avec les entrées | [S] wccftech, Gaming Nexus |
| Super Hexagon (Terry Cavanagh, 2012) | arcade pure, score au centième | annonceuse vocale, rotation de l'arène, difficulté brutale sur téléphone | [S] Giant Bomb, MCV |

**Le point commun [A]** : aucun ne copie l'image des années 80 ; tous gardent la **grammaire** (contraste,
code couleur, tempo, mort rapide, score) et poussent un seul curseur jusqu'à l'excès (la grille de Geometry
Wars, les voxels de Resogun, la musique de Tetris Effect).

---

## 2. La quintessence en une phrase [A]

> Une borne des années 80 est **une petite pièce de théâtre qui recommence toutes les trente secondes** :
> elle appelle le passant (attraction), présente ses personnages (fantômes nommés), annonce le danger
> avant qu'il arrive (voix, WARNING), fait monter le tempo jusqu'à la peur (Space Invaders), offre une mort
> spectaculaire et brève (Pac-Man), récompense par un entracte (coffee break) et grave un nom au tableau
> (initiales). Le tout avec une grammaire de couleurs et de sons si stricte qu'on la lit sans y penser.

---

## 3. Les quinze principes, et comment les appliquer à SNAKE 2975

Chaque principe : **chez eux** (exemples), **pourquoi ça marche** [A], **dans SNAKE 2975** [A], avec des
valeurs précises compatibles avec `DIRECTION.md` (gros pixels réels, palette fermée de seize couleurs,
cyan réservé à la joueuse, tramage de Bayer, aucun fichier audio, iPhone d'abord).

### Principe 1 — La machine joue toute seule : un mode attraction qui vend le jeu

- **Chez eux** : Defender (mode attraction jugé indispensable la veille du salon), Pac-Man (présentation des
  fantômes puis démo) [S].
- **Pourquoi** : on comprend un jeu en le **regardant** jouer, et on a envie d'en être capable.
- **Dans SNAKE 2975** : après 20 s sans toucher sur l'écran-titre, boucle d'attraction de 30 s :
  1. logo SNAKE 2975 sur `horizon` avec la grille qui défile (déjà dans `60-intro.js`), 5 s ;
  2. **démo jouée** par le pilote automatique déterministe existant (`tools/`), à graine fixe, avec la
     parallaxe complète : un enchaînement de kills, une explosion de gros ennemi, puis **une mort**
     (montrer qu'on peut mourir est un argument), 15 s ;
  3. tableau des records, 5 s ;
  4. « TOUCHE L'ÉCRAN » en jaune qui clignote à 1 Hz (sous le limiteur de flashs, petite surface), 5 s.
  Bandeau « DÉMO » en acier en haut pendant la démo. Musique en mode deux couches, volume -6 dB. Tout
  toucher quitte la boucle vers le titre.

### Principe 2 — Le score est un nom : records et initiales

- **Chez eux** : Star Fire (premières initiales), Out Run (musique « Last Wave » réservée à la saisie) [S].
- **Pourquoi** : un chiffre seul n'a pas d'histoire ; trois lettres, si.
- **Dans SNAKE 2975** : tableau des dix meilleurs, trois lettres, saisie **au doigt** : trois molettes
  verticales (glisser vers le haut ou le bas fait défiler A-Z, 0-9, espace), un bouton « OK ». La police
  5×7 accentuée existe déjà (`40-sprites.js`). Le rang 1 est en jaune, les autres en os, le score de la
  partie qui vient de finir **clignote en cyan** (c'est la joueuse : la règle du cyan reste vraie). Thème
  musical propre, plus lent, majeur, uniquement pendant la saisie. Stockage local entouré de try/catch : sans
  stockage, le tableau vit le temps de la session et rien ne casse. On y ajoute une colonne « défi réussi »
  (une étoile ambre).

### Principe 3 — Présenter les ennemis par leur nom

- **Chez eux** : le mode attraction de Pac-Man nomme chaque fantôme et lui donne un caractère [S].
- **Pourquoi** : un ennemi nommé est un personnage ; on le craint, on s'en souvient, on en parle.
- **Dans SNAKE 2975** : la **première** apparition de chaque type d'ennemi dans une partie déclenche une
  carte de présentation de 0,8 s : gel de l'action, cadre nuit profonde, le sprite agrandi ×3 (en gros
  pixels, donc multiple entier), son nom en magenta (c'est un ennemi), une ligne de caractère en acier
  (« FONCE TOUT DROIT », « TE TOURNE AUTOUR »). Une seule fois par partie et par type, sautable d'un toucher.
  Le même défilé de cartes sert dans le mode attraction.

### Principe 4 — Une couleur, un rôle ; la silhouette d'abord

- **Chez eux** : Pac-Man (une couleur par fantôme, un changement de couleur = un changement d'état), Galaxian
  (sprites multicolores par rang) [S/C].
- **Pourquoi** : en un dixième de seconde, l'œil trie par couleur ; la silhouette confirme.
- **Dans SNAKE 2975** : la règle existe déjà (cyan = joueuse, magenta = ennemis, ambre = butin, jaune =
  score, brasier = explosions). À ajouter :
  - **un ennemi = une silhouette distincte reconnaissable à 8×8 pixels de jeu**, testée en niveaux de gris ;
  - **chaque changement d'état est un changement de couleur** : un ennemi qui va tirer passe de magenta à
    rose pâle sur ses bords pendant le télégraphe ; un ennemi vulnérable passe en ardoise avec contour
    rose pâle ;
  - **les murs tuent, donc les murs sont magenta** (bandes de danger magenta et nuit profonde, tramées) :
    puisque la mort contre un bord revient (retour 4), le bord doit se lire comme une menace.

### Principe 5 — Le décor se tait, le jeu crie

- **Chez eux** : Defender et Robotron (fond noir, objets saturés), Gradius (décors sombres, tirs clairs) [C].
- **Pourquoi** : la lisibilité est une question de **valeur** (clair contre sombre) plus que de teinte.
  Si le décor est aussi lumineux que les ennemis, la parallaxe devient du bruit.
- **Dans SNAKE 2975** : on sépare la palette en deux bandes de valeur :
  - **décor** : vide, nuit, ardoise, indigo, violet, sang, nuit profonde, plus de l'ambre et du brasier
    **seulement en petites touches** (fenêtres, soleil) et **toujours tramés à 50 % au plus** sur les
    plans lointains ;
  - **jeu** : cyan, cyan pâle, magenta, rose pâle, ambre, jaune, brasier, os, en aplats pleins.
  Règle mesurable : sur une capture, aucun pixel de décor n'est cyan, et la part de magenta dans les plans
  de décor est sous 0,5 % (le soleil de `horizon.png` est magenta : voir § 4.4 pour le repeindre).

### Principe 6 — La profondeur par plans : la parallaxe

- **Chez eux** : Moon Patrol (trois plans), Shadow of the Beast (jusqu'à douze), Thunder Force IV (sol et eau
  ligne par ligne) [S].
- **Pourquoi** : la parallaxe fait croire à un monde réel avec une technique plate ; le cerveau lit la
  vitesse relative comme une distance.
- **Dans SNAKE 2975** : six plans plus un sol ligne par ligne. **Recette complète au chapitre 4.**

### Principe 7 — Le monde est plus grand que l'écran, et on le sait

- **Chez eux** : Defender (monde large, radar en haut d'écran) [S], Resogun (monde cylindrique) [S].
- **Pourquoi** : un ailleurs invisible crée l'attente et la peur ; le radar transforme la peur en décision.
- **Dans SNAKE 2975** : arène d'environ **3 écrans de large sur 2 de haut** (au tampon de 422×195 de
  l'iPhone 13 paysage : à peu près 1 270 × 390 pixels de jeu). Caméra qui suit la tête du serpent avec une
  **avance** de 40 pixels dans la direction du mouvement (on voit ce qui arrive) et un amorti de 0,12 par
  image. **Radar** dans une bande de 8 pixels en haut de la zone sûre : fond nuit profonde, cadre acier, la
  joueuse en cyan (2×1 pixels), les ennemis en points magenta, les gros ennemis en 2×2, le butin en ambre,
  le rectangle de vue en ardoise. Une flèche magenta clignotante au bord de l'écran signale chaque menace
  hors champ à moins d'un demi-écran.

### Principe 8 — Le tempo, c'est la peur

- **Chez eux** : Space Invaders (la marche accélère), Pac-Man (Cruise Elroy, sirène), Asteroids
  (battement de cœur) [S/C].
- **Pourquoi** : le rythme agit sur le corps avant la réflexion ; c'est la montée la plus « honnête ».
- **Dans SNAKE 2975** :
  - élargir l'écart de tempo : de **108 BPM** au calme à **144 BPM** au chaos (au lieu de 112-128), par
    paliers de mesure, jamais en glissando (sinon on entend l'artifice) ;
  - **un battement de cœur** (deux coups sourds, sub et coup médium pour les haut-parleurs de téléphone)
    quand la tête est à moins de 24 pixels d'un mur ou d'un ennemi, dont le tempo double au plus proche ;
  - **tout ce qui défile suit le tempo** : la grille du sol avance d'une case par temps, les néons du décor
    pulsent sur la grosse caisse (rotation de palette, § 4.6) ; quand la musique accélère, le monde
    accélère ;
  - le critère 6 de `DIRECTION.md` (RMS et ennemis monotones par tranches de 20 s) reste vrai.

### Principe 9 — Une explosion est une forme, et elle se sent

- **Chez eux** : Robotron et Defender (gerbes de fragments), Geometry Wars (la grille ondule), Resogun (les
  voxels volent), « Juice It or Lose It » et « The Art of Screenshake » [S/C].
- **Pourquoi** : une forme se lit en gros pixels, un flou non ; la secousse et le gel donnent du poids.
- **Dans SNAKE 2975** (les anneaux, le gel et la secousse existent dans `50-fx.js`) :
  - **éclats qui ont une profondeur** : 30 % des fragments partent « vers l'arrière » et sont dessinés sur
    le plan des structures (facteur 0,6) en sang et ardoise, 20 % partent « vers l'avant » et passent sur
    le premier plan en nuit profonde ; une explosion traverse alors les plans ;
  - **la grille du plateau ondule** (Geometry Wars) : pendant 0,5 s, les lignes de la grille de jeu dans un
    rayon de 48 pixels sont décalées de 1 à 3 pixels entiers en s'éloignant du centre, en anneau ;
  - **la secousse dépend du plan** : décalage × 0,2 pour le ciel, × 0,6 pour les structures, × 1 pour le jeu,
    × 1,4 pour le premier plan ; la profondeur se ressent au choc ;
  - **la cité réagit** : les fenêtres de la cité lointaine passent en ambre pendant deux images au
    bigkill (compté par le limiteur de flashs).

### Principe 10 — La mort est courte, spectaculaire, juste ; la relance est immédiate

- **Chez eux** : Pac-Man (animation et son de mort dédiés), Missile Command (« THE END »), Hotline Miami
  (mort en un coup, relance plus rapide encore) [S/C].
- **Pourquoi** : la mort doit faire peur et être comprise ; puis on doit pouvoir se venger aussitôt.
- **Dans SNAKE 2975** (en réponse au retour 4) :
  1. **image 0** : gel de 10 images, la tête du serpent passe en os (flash de frappe), **la cause est
     entourée** d'un anneau magenta d'un pixel (le mur, l'ennemi ou le tir qui a tué) : la mort est
     lisible et juste ;
  2. **0,2 s à 1,2 s** : la musique **coupe net** (un silence est le son le plus fort qui existe), puis le
     serpent se désintègre **de la tête vers la queue**, un segment toutes les 2 images, chaque segment en
     anneau cyan pâle → cyan → nuit ; un son descendant (glissando d'une octave, onde carrée, hommage à
     Pac-Man) ;
  3. **1,2 s** : la voix de la machine dit « GAME OVER » (principe 11), le mot s'écrit en gros (police ×3)
     en os sur bande nuit profonde, le score monte jusqu'à sa valeur ;
  4. **relance** : un toucher n'importe où relance en moins d'une seconde (Hotline Miami) ; un appui long
     ouvre le tableau des records si le score y entre.
  Pas d'écran de chargement, pas de menu entre deux parties.

### Principe 11 — La voix de la machine

- **Chez eux** : Berzerk (synthèse LPC, « Intruder alert! »), Sinistar (« Beware, I live »), Gauntlet (« needs
  food, badly »), Super Hexagon, Resogun [S].
- **Pourquoi** : la voix encadre, annonce, et donne un caractère au jeu.
- **Dans SNAKE 2975** : **aucun fichier audio** n'est permis, donc une **voix synthétisée** dans le moteur
  musical, à la manière de Berzerk : un synthétiseur à formants (source en dents de scie à 90-110 Hz,
  trois filtres passe-bande sur les formants de chaque voyelle, bruit filtré pour les consonnes « s », « t »,
  « k »), avec un **vocabulaire fermé de douze mots** à phonèmes écrits à la main : READY, GO, GAME OVER,
  WARNING, DANGER, EXCELLENT, CHAIN, PERFECT, NEW RECORD, BOSS, LEVEL, CLEAR. Tous les mots tombent sur un
  temps fort de la musique (la voix est rythmée). Règles : au plus **un mot toutes les 4 s**, jamais
  pendant un autre mot, et la voix a son propre réglage de volume. En parallèle, le **texte crié** façon
  Pac-Man : « READY! » en jaune au centre au début de chaque vie, 1 s, puis « GO! ». (La synthèse vocale du
  navigateur existe, mais sa voix change d'un appareil à l'autre et n'a rien d'une borne : à éviter.)

### Principe 12 — Une musique qu'on choisit, avec un refrain

- **Chez eux** : Out Run (trois stations de radio au départ), Gradius (mélodies qu'on fredonne), Hotline
  Miami (bande-son choisie) [S].
- **Pourquoi** : on s'attache à ce qu'on choisit ; on retient ce qui revient.
- **Dans SNAKE 2975** :
  - **trois « stations » au départ**, sur l'écran de briefing, choisies d'un geste : chacune est une graine
    et un jeu de réglages du moteur génératif (tonalité, gabarit rythmique, timbre du lead : carré 25 %,
    FM « cuivre », table d'onde « verre ») ; le nom de la station s'affiche en jaune comme une enseigne de
    radio ;
  - **un refrain par station** : un motif de 8 notes qui revient toutes les 16 mesures. La règle d'or (rien
    d'identique plus de deux fois) reste tenue : le refrain revient **transformé** (transposé, rythme
    décalé, octave, harmonisé) ; c'est exactement ce que faisait la variation classique ;
  - **une « puce virtuelle »** pour la couleur d'époque : lead en onde carrée à rapport cyclique variable
    (PSG), basse en FM à deux opérateurs (`OscillatorNode` qui module la fréquence d'un autre), batterie en
    bruit filtré (PSG) et en coups synthétisés, accords en **arpèges rapides** à 1/32 plutôt qu'en nappes
    tenues pour la station la plus « arcade ».

### Principe 13 — Des sons-signatures, musicaux et progressifs

- **Chez eux** : les points doublés des fantômes de Pac-Man, le Challenging Stage de Galaga, chaque
  geste qui joue une note dans Tetris Effect [S/C].
- **Pourquoi** : un son répété des milliers de fois devient un réflexe ; s'il monte avec la série, il
  devient une récompense.
- **Dans SNAKE 2975** : le moteur le fait déjà en partie (`kill` monte d'un degré de pentatonique par
  palier, tout est dans la tonalité courante). À ajouter : **un son unique par événement** et pas de son
  neutre en jeu ; à la fin d'une chaîne, un **arpège qui rejoue toute la chaîne** en accéléré (la
  joueuse « entend » son score) ; les **points affichés doublent** comme chez Pac-Man (100, 200, 400, 800,
  1 600 au fil de la chaîne), avec le chiffre qui jaillit en jaune et grossit d'un cran à chaque palier.

### Principe 14 — L'entracte récompense et raconte

- **Chez eux** : coffee breaks de Pac-Man, Challenging Stage de Galaga, fin d'Out Run [S].
- **Pourquoi** : la respiration rend la tension suivante plus forte ; l'humour fait aimer les personnages.
- **Dans SNAKE 2975** : entre deux niveaux (et après le colosse), un **entracte de 4 à 6 s**, muet, sautable,
  joué **en gros pixels dans le moteur** : le serpent et un ennemi dans une saynète comique (l'ennemi poursuit
  le serpent hors champ ; il revient poursuivi par un serpent devenu énorme : clin d'œil direct au premier
  coffee break). Les panneaux de `art/` (`eveil`, `connexion`, `exterieur`, `victoire`) servent de toile de
  fond, assombris d'un cran par `N.pal.shade` pour que les personnages ressortent. Tous les trois niveaux, un
  **tableau bonus** à la Galaga : 30 s sans danger, une vague d'ennemis inoffensifs à abattre en
  enchaînement ; « PERFECT » à la voix et 10 000 points si tout tombe.

### Principe 15 — Annoncer le grand danger avant qu'il arrive

- **Chez eux** : Berzerk (« Intruder alert! »), Sinistar (« Beware, I live »), Darius (« WARNING! ») [S/C].
- **Pourquoi** : l'attente fait la peur ; un boss annoncé est un événement, un boss surprise est une injustice.
- **Dans SNAKE 2975** : 4 s avant le colosse (1 min 16 dans la démo actuelle) :
  1. la musique tombe à la basse seule, une sirène à deux tons monte (respecter le limiteur : la sirène est
     sonore, l'image ne flashe qu'en bandes minces) ;
  2. deux bandes « WARNING » magenta et nuit profonde défilent en sens inverse en haut et en bas d'écran
     (chacune 10 pixels de haut, soit bien moins de 6,6 % de l'écran par bande) ; la voix dit « WARNING » ;
  3. le décor **change de palette** : le soleil passe en éclipse (disque nuit profonde, couronne brasier),
     le ciel se trame de sang ; la cité éteint ses fenêtres rangée par rangée ;
  4. le panneau `alerte.png` peut s'intercaler 1,5 s (option, sautable) ;
  5. le colosse entre **par le décor** : il apparaît d'abord en silhouette sur le plan des structures
     (facteur 0,6, en sang), traverse vers le plan de jeu, et devient magenta en y arrivant : la parallaxe
     **met en scène** son arrivée.

---

## 4. Construire une parallaxe en gros pixels qui en met plein la vue

### 4.1 Le choix de vue : un plateau holographique devant la cité [A]

Le serpent se joue **vu de face sur un plan vertical**, comme les vaisseaux de Defender ou de Gradius :
le plateau de jeu est une grille holographique tendue devant le paysage, et le décor est vu **de profil**
(ciel, soleil, cité, sol en perspective). C'est ce qui permet d'avoir exactement ce que demande la
propriétaire : « horizon et cité au loin, structures au milieu, grille au sol au premier plan »,
avec les illustrations existantes (`horizon.png` est déjà un ciel, un soleil, des montagnes et un sol en
grille vu de profil ; `exterieur.png` est une cité de profil). La caméra se déplace dans les deux axes ;
le déplacement vertical fait monter et descendre l'horizon, ce qui donne une vraie sensation d'altitude.

### 4.2 Les plans, de l'arrière vers l'avant

Facteur = fraction du déplacement de la caméra appliquée au plan (1 = le plan du jeu).
Valeurs pour l'iPhone 13 paysage (tampon 422×195, monde ~1 270×390).

| # | plan | facteur x / y | contenu | couleurs | source |
|---|---|---|---|---|---|
| P0 | ciel | 0 / 0,02 | dégradé tramé du haut vers l'horizon | vide → nuit (Bayer) ; au boss, sang tramé | procédural |
| P1 | étoiles | 0,03 / 0,03 | ~60 points d'un pixel, deux phases de scintillement | acier, os (rares) | procédural à graine |
| P2 | soleil et montagnes | 0,08 / 0,06 | disque à bandes, chaînes de montagnes | jaune, ambre, brasier, sang (pas de magenta) ; montagnes nuit et indigo | `horizon.png`, rangées au-dessus de l'horizon, soleil repeint (§ 4.4) |
| P3 | cité lointaine | 0,2 / 0,1 | silhouette d'immeubles, fenêtres, la tour de `exterieur` comme repère unique | nuit, ardoise ; fenêtres sang et ambre (3 % des pixels au plus) | procédural à graine + tour découpée dans `exterieur.png` |
| P4 | brume | 0,35 / 0,15 + dérive propre de 4 px/s | bandes de brouillard tramées à 25 % | nuit | procédural |
| P5 | structures | 0,6 / 0,5 | pylônes, poutres, câbles, balises qui clignotent | ardoise, indigo ; balises sang et ambre | procédural (tuiles 32×64) |
| SOL | sol en perspective | ligne par ligne, de 0,1 (horizon) à 1,0 (bas) | grille de fuite, reflet du soleil | violet près, indigo loin, tramé vers nuit à l'horizon ; reflet ambre et brasier | procédural, d'après le sol de `horizon` |
| JEU | plateau | 1 / 1 | grille holographique, serpent, ennemis, butin, tirs | couleurs de jeu en aplats | moteur |
| P6 | premier plan | 1,4 / 1,4 | poutrelles et câbles en silhouette, seulement dans les 12 % du haut et du bas | nuit profonde uniquement | procédural |

Pourquoi ces facteurs [A] : ils suivent à peu près une loi en 1/distance ; l'écart entre deux plans
voisins est d'au moins ×1,7, sinon l'œil ne sépare pas les plans. Le plan JEU est le seul à 1 : la
joueuse juge toujours ses distances sur un plan qui ne glisse pas.

**Taille de chaque plan.** Un plan de facteur f doit mesurer `largeur_vue + (largeur_monde - largeur_vue) × f`.
Avec 422 et 1 270 : P2 à 0,08 → 490 pixels, et `horizon.png` en fait 512 : **pas besoin de le faire boucler**.
P3 à 0,2 → 592 pixels : générer une silhouette procédurale de 600 pixels (ou boucler sur un motif de 300
avec une couture cachée par la tour). P5 et P6 sont des tuiles qui bouclent.

### 4.3 Le sol ligne par ligne : la pièce maîtresse

C'est la technique d'Out Run et de Thunder Force IV [S pour Thunder Force IV], refaite en logiciel, en
gros pixels, dans la palette.

Pour chaque rangée d'écran `y` sous l'horizon (`dy = y - yHorizon > 0`) :

- profondeur `z = K / dy` (K ≈ 900 pour un sol d'environ 80 rangées) ;
- une colonne d'écran `x` correspond à la position de sol `xs = camX × 1 + (x - xFuite) × z / Z0` ;
  la grille longitudinale est allumée quand `xs mod 32 < largeur(z)` ; la rangée tire donc son décalage de
  sa propre profondeur : les rangées du bas suivent la caméra presque comme le jeu, celles du haut presque
  pas ;
- la grille transversale est allumée quand `(z + avance) mod 24 < épaisseur(z)` ; **`avance` croît avec le
  temps au tempo de la musique** : le sol fuit vers la joueuse, une case par temps. C'est **le plateau qui
  se déplace** sans changer les règles de déplacement du serpent ;
- couleur par profondeur : violet sur le tiers bas, indigo au milieu, indigo tramé sur nuit vers
  l'horizon (`N.pal.dither(x, y, t)` avec t qui baisse avec z) : c'est le brouillard d'époque ;
- **reflet du soleil** : sous le soleil, une colonne de 20 à 40 pixels en ambre et brasier tramés, dont
  chaque rangée est décalée de `round(2 × sin(y × 0,7 + temps × 3))` pixels : l'eau de Thunder Force IV
  sur une dalle de néon.

Coût : environ 80 rangées × 422 colonnes ≈ 34 000 tests simples par image, écrits dans un `Uint32Array`
via `N.pal.U32` puis un seul `putImageData` dans une toile hors écran : négligeable devant 16,7 ms.

### 4.4 Rester dans la palette et dans les rôles

- **Tout est indexé** : les plans sont pré-rendus une fois en index de palette (`{w, h, data}` comme
  `N.art.get`), puis copiés dans des toiles hors écran. Aucune interpolation, aucun mélange alpha : la
  transparence est l'index 0, la demi-transparence est un tramage.
- **Le soleil de `horizon.png` est magenta** : or le magenta est la couleur des ennemis. Le repeindre au
  chargement par une table de remplacement d'index : magenta → brasier, rose pâle → ambre, en gardant les
  bandes horizontales ; on garde jaune au centre. Le soleil des années 80 reste un dégradé chaud, et le
  magenta redevient un signal pur.
- **Rien de cyan dans le décor**, même dans les fenêtres ou les reflets (critère 3 de `DIRECTION.md`).
- Le **texte** reste en acier seulement sur vide, nuit ou ardoise : prévoir une bande nuit profonde sous
  l'interface en haut, qui passe par-dessus P6.

### 4.5 La grille holographique du plateau (le plan JEU)

- Points d'intersection en indigo toutes les 16 pixels, lignes en violet tramées à 25 % : on voit la cité
  **à travers** le plateau, mais la joueuse a des repères de distance fixes.
- **Bord du monde** : bande de 3 pixels, motif de hachures magenta et nuit profonde (le mur tue) ; au-delà,
  le plateau s'arrête et seul le décor continue.
- **Réaction** : sur la grosse caisse, les intersections passent d'indigo à violet pendant 2 images ; à
  l'explosion, la grille ondule (principe 9).

### 4.6 La rotation de palette, l'arme secrète d'une palette fermée

Avec seize couleurs fixes, on ne peut pas inventer de teinte, mais on peut **changer quelle couleur un
pixel affiche**. Les plans sont dessinés en « index logiques » (enseigne 0 à 3, balise 0 à 1, fenêtre…)
et une petite table, recalculée à chaque temps de musique, dit quel index réel de la palette chaque index
logique affiche :

- enseignes de la cité : rampe sang → brasier → ambre → jaune qui tourne d'un cran par temps ;
- balises des structures : sang / nuit, à la noire ;
- bandes du soleil : glissent d'une rangée vers le bas toutes les deux mesures.

Coût : nul (on re-copie un plan pré-rendu avec une autre table quand elle change). Effet : tout le décor
**respire avec la musique**, ce qui relie les principes 6, 8 et 12. Le limiteur de flashs de `50-fx.js`
doit compter ces changements quand ils touchent plus de 6,6 % de l'écran.

### 4.7 Le décor raconte la montée en tension

Quatre états du décor, liés à la tension que `70-game.js` envoie déjà à la musique :

| tension | ciel | soleil | cité | sol |
|---|---|---|---|---|
| calme | vide/nuit | jaune et ambre, haut | quelques fenêtres ambre | défile lentement, violet |
| montée | nuit, brume plus dense | ambre et brasier, plus bas | enseignes allumées, rotation rapide | une case par temps |
| chaos | nuit tramée de sang | brasier et sang, à l'horizon | fenêtres qui clignotent en sang | deux cases par temps, lignes plus épaisses |
| colosse | sang tramé | éclipse : nuit profonde cerclée de brasier | éteinte, rangée par rangée | le reflet devient sang |

Chaque passage se fait par un **balayage tramé** de haut en bas en 0,5 s (la matrice de Bayer sert de
fondu), jamais par un fondu continu.

### 4.8 Mise en œuvre et coût, téléphone d'abord

- Pré-rendre P0 à P6 au démarrage et au changement d'orientation, dans des toiles hors écran à la
  résolution du tampon.
- Par image : la caméra est arrondie **une seule fois** au pixel du tampon ; pour chaque plan,
  `ox = Math.floor(camX × f) mod largeur` puis un ou deux `drawImage` (deux quand le plan boucle). Les plans
  lents bougent alors d'un pixel entier de temps en temps : c'est voulu, c'est le rendu des bornes.
- Estimation : six copies plein écran + le sol ≈ 7 × 82 000 pixels ≈ 0,6 million de pixels par image au
  tampon, soit moins que ce que l'ancien rendu haute résolution dessinait pour **un seul** plan (1 266×585 ≈
  0,74 million). Le budget de `DIRECTION.md` (p95 sous 16,7 ms sur iPhone 13) reste tenable ; à mesurer
  sur le banc d'essai existant.
- **Portrait** : l'horizon descend à 35 % de la hauteur, le sol prend plus de place, les plans P3 et P5
  sont générés plus hauts (immeubles et pylônes plus élancés) ; facteurs inchangés.
- **Réduire les animations** (`prefers-reduced-motion`, déjà exigé par `recherche/visuel-technique-mobile.md`) :
  tous les facteurs de P0 à P6 passent à 0, le sol cesse d'avancer, la rotation de palette s'arrête ; le
  plan JEU et le radar restent. Le jeu reste entièrement jouable.

### 4.9 Squelette de code

```js
// Dans le module de rendu du décor. Aucune couleur écrite : uniquement des index de N.pal.
var PLANS = [ // facteur x, facteur y, toile pré-rendue, boucle ?
  { fx: 0.00, fy: 0.02, img: ciel,      loop: false },
  { fx: 0.03, fy: 0.03, img: etoiles,   loop: true  },
  { fx: 0.08, fy: 0.06, img: soleil,    loop: false },
  { fx: 0.20, fy: 0.10, img: cite,      loop: true  },
  { fx: 0.35, fy: 0.15, img: brume,     loop: true, derive: 4 },
  { fx: 0.60, fy: 0.50, img: structures, loop: true },
];
function decor(ctx, cam, t, secousse) {
  var cx = Math.round(cam.x), cy = Math.round(cam.y);       // une seule fois
  for (var i = 0; i < PLANS.length; i++) {
    var p = PLANS[i], w = p.img.width;
    var ox = Math.floor(cx * p.fx + (p.derive || 0) * t + secousse.x * (0.2 + p.fx));
    var oy = Math.floor(cy * p.fy + secousse.y * (0.2 + p.fx));
    ox = ((ox % w) + w) % w;
    ctx.drawImage(p.img, -ox, -oy);
    if (p.loop) ctx.drawImage(p.img, w - ox, -oy);
  }
  solLigneParLigne(ctx, cx, cy, t);   // § 4.3 : Uint32Array + putImageData dans une toile hors écran
}
```

### 4.10 Comment vérifier que ça « en met plein la vue », sur les pixels rendus

Dans l'esprit des critères automatiques de `DIRECTION.md` :

1. **Parallaxe réelle** : deux captures à 60 images d'intervalle avec la caméra déplacée de Δ ; pour
   chaque plan (masques connus), le déplacement mesuré vaut `f × Δ` à un pixel près.
2. **Profondeur visible** : au moins cinq vitesses distinctes mesurées sur une même paire de captures.
3. **Décor qui se tait** : aucun pixel cyan hors joueuse ; magenta dans le décor sous 0,5 % ; la luminance
   moyenne du décor reste sous celle de chaque couleur de jeu.
4. **Palette fermée** : 100 % des pixels dans les seize, tolérance zéro, y compris pendant la rotation de
   palette et les balayages.
5. **Le monde bouge même à l'arrêt** : serpent immobile, la différence entre deux captures à 1 s d'écart
   dépasse 3 % des pixels (sol qui avance, brume qui dérive, enseignes).
6. **Performance** : p95 sous 16,7 ms sur le banc iPhone 13 paysage, parallaxe complète, au plus fort du
   chaos.

---

## 5. Par où commencer (ordre d'impact) [A]

1. **Parallaxe et sol ligne par ligne, monde plus grand, radar** (principes 6, 7 ; chapitre 4) : c'est la
   demande explicite et le plus gros gain visuel.
2. **Vraie mort mise en scène et relance immédiate** (principe 10) : demande explicite, et c'est elle qui
   donne du sens à tout le reste.
3. **Tempo élargi, battement de cœur, décor qui suit le tempo** (principes 8, 4.6, 4.7).
4. **READY! / GAME OVER / WARNING**, en texte puis en voix synthétisée (principes 11, 15).
5. **Records et initiales, mode attraction** (principes 1, 2).
6. **Cartes d'ennemis, entractes, tableau bonus, stations de musique** (principes 3, 12, 13, 14).

---

## Sources consultées

- Pac-Man : [Wikipedia](https://en.wikipedia.org/wiki/Pac-Man) ;
  [StrategyWiki, gameplay](https://strategywiki.org/wiki/Pac-Man/Gameplay) ;
  [Pac-Man Wiki, Coffee Break](https://pacman.fandom.com/wiki/Coffee_Break) ;
  [Retrododo, les fantômes](https://retrododo.com/all-pac-man-ghosts/) ;
  [SmashWiki, Ghosts](https://www.ssbwiki.com/Ghosts) ;
  [Engadget, Iwatani à la GDC](https://www.engadget.com/2011-03-03-pac-man-creator-reminisces-about-classic-game-design-calls-for.html) ;
  [Giant Bomb, revue](https://giantbomb.com/user-reviews/id/129850/play-this-milestone-of-classic-arcade-gaming)
- Namco WSG : [vgmrips](https://vgmrips.net/wiki/Namco_WSG) ;
  [documentation Furnace](https://tildearrow.org/furnace/doc/latest/7-systems/namco.html)
- Galaxian et sprites : [Wikipedia, Sprite](https://en.wikipedia.org/wiki/Sprite_(computer_graphics)) ;
  [Codex Gamicus, Namco Galaxian](https://gamicus.fandom.com/wiki/Namco_Galaxian)
- Star Fire et records : [Wikipedia](https://en.wikipedia.org/wiki/Star_Fire) ;
  [Den of Geek](https://www.denofgeek.com/games/first-video-game-high-score-invented-history)
- Space Invaders : [IEEE Spectrum](https://spectrum.ieee.org/space-invaders) ;
  [Looper](https://www.looper.com/293293/details-you-didnt-know-about-space-invaders/) ;
  [Wikipedia](https://en.wikipedia.org/wiki/Space_Invaders) ;
  [Giant Bomb](https://giantbomb.com/wiki/Games/Space_Invaders)
- Moon Patrol et parallaxe : [Wikipedia, Moon Patrol](https://en.wikipedia.org/wiki/Moon_Patrol) ;
  [Giant Bomb, Parallax Scrolling](https://giantbomb.com/wiki/Concepts/Parallax_Scrolling) ;
  [Wikipedia, Parallax scrolling](https://en.wikipedia.org/wiki/Parallax_scrolling)
- Défilement ligne par ligne : [rasterscroll.com, line scrolling](https://rasterscroll.com/mdgraphics/graphical-effects/line-scrolling/)
- Shadow of the Beast : [Wikipedia](https://en.wikipedia.org/wiki/Shadow_of_the_Beast_(1989_video_game)) ;
  [Generation Amiga](https://www.generationamiga.com/2026/08/20/shadow-of-the-beast-how-the-amiga-displayed-128-colours-and-12-parallax-layers/)
- Defender : [Wikipedia](https://en.wikipedia.org/wiki/Defender_(1981_video_game)) ;
  [Mental Floss](https://www.mentalfloss.com/article/91082/facts-about-defender)
- Robotron: 2084 : [StrategyWiki](https://strategywiki.org/wiki/Robotron:_2084)
- Xevious : [Wikipedia](https://en.wikipedia.org/wiki/Xevious)
- Out Run : [exotica.org.uk](https://www.exotica.org.uk/wiki/Lost_In_Translation/Out_Run) ;
  [Wikipedia](https://wikipedia.com/wiki/OutRun)
- Gradius : [Wikipedia](https://en.wikipedia.org/wiki/Gradius_(video_game)) ;
  [Wikipedia, Konami GX400](https://www.wikipedia.com/wiki/Konami_GX400) ;
  [Giant Bomb, Miki Higashino](https://giantbomb.com/wiki/People/Miki_Higashino) ;
  [Square Enix Music Online](https://squareenixmusic.com/reviews/chris/gradiusarcade.shtml)
- Berzerk : [Wikipedia](https://en.wikipedia.org/wiki/Berzerk_(video_game)) ;
  [arcade-history](https://www.arcade-history.com/game/236/)
- Sinistar : [Wikipedia](https://en.wikipedia.org/wiki/Sinistar) ;
  [PopMatters](https://popmatters.com/post/181282-beware-i-live-the-voice-of-antagonism-the-voice-of-the-arcade)
- Gauntlet : [Wikipedia](https://en.wikipedia.org/wiki/Gauntlet_(1985_video_game))
- Missile Command : [Silverball Museum](https://silverballmuseum.com/product/missle-command/)
- Galaga : [exotica.org.uk](https://www.exotica.org.uk/wiki/Lost_In_Translation/Galaga) ;
  [TrueAchievements](https://www.trueachievements.com/game/Galaga/walkthrough)
- Geometry Wars : [Wikipedia](https://en.wikipedia.org/wiki/Geometry_Wars:_Retro_Evolved) ;
  [Giant Bomb](https://giantbomb.com/wiki/Games/Geometry_Wars_Retro_Evolved)
- Resogun : [Housemarque](https://housemarque.com/games/resogun) ;
  [Giant Bomb, revue](https://giantbomb.com/reviews/resogun-review/1900-604/)
- Hotline Miami : [Engadget](https://www.engadget.com/2012-08-17-hotline-miami-drives-the-art-of-violence.html) ;
  [games.gg](https://games.gg/hotline-miami/) ;
  [Laced Records](https://lacedrecords.com/blogs/news/filthwave-15-four-to-the-floor-bangers-from-video-game-soundtracks)
- Downwell : [Wikipedia](https://en.wikipedia.org/wiki/Downwell_(video_game)) ;
  [Giant Bomb](https://giantbomb.com/wiki/Games/Downwell) ;
  [Gaming Nexus](https://www.gamingnexus.com/Article/5149/Downwell)
- Tetris Effect et Mizuguchi : [wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/) ;
  [Gaming Nexus](https://www.gamingnexus.com/Article/5847/Tetris-Effect/) ;
  [Wikipedia, Tetsuya Mizuguchi](https://en.wikipedia.org/wiki/Tetsuya_Mizuguchi)
- Super Hexagon : [Giant Bomb](https://giantbomb.com/wiki/Games/Super_Hexagon) ;
  [MCV](https://mcvuk.com/super-hexagon-doesnt-hate-you-cavanagh-tells-mcv/)
- « Juice » et secousse : [rpgplayground, Making a juicy game](https://rpgplayground.com/?p=3339) ;
  [recréation de « The Art of Screenshake »](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog)

**À confirmer avant toute citation (marqués [C])** : « READY! » de Pac-Man, la sirène et les points
doublés des fantômes ; le battement de cœur d'Asteroids ; l'écran « WARNING » de Darius ; la voix de
Space Harrier ; les explosions de Defender et Robotron ; la rotation de palette de Deluxe Paint ; le
défilement forcé de Gradius ; la musique du Challenging Stage de Galaga.
