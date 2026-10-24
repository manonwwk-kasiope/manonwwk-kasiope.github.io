# SNAKE 2975 — les leçons de l'audit de SNAKE 2030

Document de travail pour la refonte de SNAKE 2975, 17 octobre 2026.

## Sources et mode d'emploi

**Ce qui a été lu.** L'audit entier, `snake2030/docs/audit-2026-09.md` (591 lignes, 270 Ko) : la vision,
la feuille de route G1 → G14, les propositions écartées et les sept audits (bureau, sensations de jeu,
ennemis et niveaux, progression, accueil, audiovisuel, robustesse), constats et propositions. Pour savoir
ce qui a vraiment été corrigé : les messages de livraison des quatorze objectifs, tous livrés (commits
`d84c20a` à `e838d01`), `snake2030/tools/test/CONTEXTE-CHAINE.md` et la relecture des spécifications
(`snake2030/tools/test/AVIS-PILOTE-specs-vague3.md`). Pour savoir ce que SNAKE 2975 doit en faire :
`proto-neon/DIRECTION.md`, `proto-neon/REPRISE.md`, les sources de la démo, et surtout
`proto-neon/refonte/RETOURS-PROPRIETAIRE.md`, qui fait autorité sur toute la refonte : « triste,
basique », « trop facile », « des scrollings parallaxes, le plateau qui se déplace », « il faut pouvoir
mourir ». Là où une leçon de 2030 contredit ces retours, ce sont les retours qui gagnent ; la leçon est
alors réinterprétée, jamais copiée.

**Format d'une leçon.**
- **Constat** : ce que l'audit a mesuré, avant correction.
- **Correction** : ce qui a été fait, et la valeur mesurée à la livraison quand elle existe.
- **Reste** : ce qui n'a pas été fait ou pas atteint.
- **Pour SNAKE 2975** : ce que la refonte doit en faire.

Unités : u = unité du monde de 2030 ; px CSS = pixel de l'écran ; « pixel de jeu » = pixel du tampon
basse résolution de 2975. Les identifiants entre parenthèses (G7, ENN-5, AV-9…) renvoient à l'audit.

**Une précaution.** L'audit contient des erreurs, corrigées depuis par la mesure (leçon M4). Avant de
citer un de ses chiffres comme référence, relancer son instrument sur le build courant
(`snake2030/tools/test/audit/README.md`).

## Où en est la démo face à ces leçons

**Déjà retenu de 2030** (vérifié dans `DIRECTION.md` et dans les sources de `proto-neon/src/`) :
- le gel d'image compté en images, jamais dans l'image qui le pose (`50-fx.js`) ;
- un limiteur de flashs (WCAG 2.3.1), plus strict que celui de 2030 ;
- le cyan réservé à la joueuse (DIRECTION, critère 3) ;
- rien ne naît dans le champ sans télégraphe, et toute attaque s'annonce au moins 0,6 s avant
  (`70-game.js`) ;
- la hauteur du son de kill qui monte avec la chaîne, celle du butin avec la longueur ;
- un record annoncé seulement s'il existait un record à battre ;
- la source de chaque coup journalisée (`stats.hitLog`) ;
- un pilote automatique déterministe, aucun hasard hors de la graine ;
- « jouer rapporte, ne rien faire non ».

**Ce qui manque, ou qui est allé trop loin** :
- la protection : le corps absorbe tous les tirs, trois vies, deux secondes d'invulnérabilité après
  chaque coup, un choc qui éteint les tirs et repousse les ennemis, des murs qui font glisser ;
- la mort : le coup mortel gèle 8 images, comme un coup ordinaire (la demande de 4 images de la mort ne
  prolonge pas un gel en cours), le serpent se dissout en 0,28 s, et l'écran de fin ne dit pas qui a tué ;
- le contenu : quatre ennemis et un colosse sans phases, un seul défi ; ni cartes, ni pouvoirs, ni
  ultime, ni niveaux, ni mécanique d'arène, ni multiplicateur lisible ;
- le son : sept noms de sons dans le module de jeu (`degat`, `kill`, `bigkill`, `tir`, `butin`, `defi`,
  `intro`), contre 32 bruitages dans 2030 ;
- la caméra : il n'y en a pas, l'arène est l'écran, et la propriétaire demande l'inverse ;
- les finitions (REPRISE.md) : le recul de caméra est prêt mais le jeu n'écrit pas encore `S.shakeX` et
  `S.shakeY` ; une image d'à-coup au démarrage du son ; la musique n'est pas finie.

## Sommaire

- A. Pilotage, caméra, plateformes : A1 à A6
- B. Équité, mourir de ce qu'on a vu : B1 à B4
- C. Courbe, rythme et contenu : C1 à C9
- D. Impact et mise en scène : D1 à D5
- E. Lisibilité et interface : E1 à E8
- S. Sons et musique : S1 à S5
- P. Performance et robustesse : P1 à P5
- M. Méthode : M1 à M4
- Ce qui reste de SNAKE 2030
- Les principes à ne jamais perdre
- Les dix leçons les plus importantes, classées

---

## A. Pilotage, caméra, plateformes

### A1 — Le serpent répond en une image, partout (G5, FEEL-1)

- **Constat.** En pilotage libre : 1 image de latence au clavier comme au doigt, 90° en 19 à 21 images.
  Mais 68 % (bureau) à 87 % (iPhone) du temps de jeu se passait sur les rails du treillis, où un virage
  attendait le nœud suivant (pas de 330 u) : latence médiane de 42 à 61 images selon la mesure,
  maximum de 111 à 125 images (près de 2 s), 13 demandes sur 20 au-delà de 500 ms, demi-tour refusé,
  aucun indicateur. « Le jeu donne l'impression d'ignorer le joueur pendant l'essentiel de la partie. »
- **Correction.** Pas de 165 u ; le virage part au nœud qu'on vient de franchir (fenêtre de retour) ;
  un disque pulsé et une flèche fantôme marquent le nœud d'attente dès l'image qui suit l'entrée ;
  demi-tour en deux quarts. **Livré** : latence médiane 69 → 5 images, p90 31, max 35 ; 20 virages sur
  20 détectés (10 avant) ; demi-tour en 19 images.
- **Pour SNAKE 2975.** Acquis en pilotage libre (virage dès l'image suivante à 5,9 rad/s, cap mémorisé).
  Toute contrainte de trajectoire reprise de 2030 (rails, champ magnétique, voie de convoi) doit naître
  avec : une attente de 0,5 s au plus à vitesse de base, le rattrapage du point tout juste franchi, un
  indicateur de ce que la contrainte fera de l'entrée, et le demi-tour. Test à reprendre de
  `rail2.mjs` : 20 virages, p90 ≤ 40 images, aucune demande au-delà de 700 ms.

### A2 — Une ressource tenue ne bégaie pas (G5, FEEL-3, FEEL-14)

- **Constat.** Boost tenu à vide : 147 à 165 bascules marche/arrêt et autant de sons en 4 s (il se
  réengageait dès 1 % de réserve pendant que la recharge continuait), vitesse oscillant entre 179 et
  285 u/s ; 2,9 s de boost pour 6,7 s de recharge ; jauge à 690 px de la tête.
- **Correction.** Hystérésis (réengagement à 25 %, ou relâcher puis 10 %), un seul son de panne,
  clignotement rouge, recharge plus rapide, départ sec, arc de jauge autour de la tête. **Livré** :
  2 bascules par appui contre 165, un seul son de panne, recharge en 4,5 s, 95 % de la vitesse en
  7 images.
- **Pour SNAKE 2975.** La démo n'a pas de boost. Toute ressource tenue que la refonte ajoute (boost, tir
  chargé, bouclier) naît avec une hystérésis, un seul signal d'épuisement et une jauge près de la tête
  (un arc d'un pixel de jeu suffit), jamais seulement dans un coin du HUD.

### A3 — La caméra ne cache jamais la tête ni ce qui arrive (G5, FEEL-4 ; FEEL-12 et ENN-10 non faits)

- **Constat.** Pendant la bascule 3D, la tête sortait de l'écran sur 21,4 % des images (iPhone, bascule
  forcée) et 11,5 % en partie réelle : la caméra était bornée sur l'étendue du canevas, pas sur ce que
  l'écran montrait. Le zoom changeait au hasard toutes les 20 à 32 s (de 0,66 à 1,82), sans lien avec le
  jeu. La bascule rétrécissait les silhouettes du fond à 61 % et coïncidait avec +21 % de coups par
  minute.
- **Correction.** `phases.visibleExtent()` donne l'étendue réellement visible ; la caméra est bornée
  dessus, la tête garantie dans [0,12 ; 0,88] des deux axes, aucune apparition dans la bande rognée.
  **Livré** : tête à l'écran sur 100 % des images.
- **Reste.** Caméra qui s'ouvre du côté où l'on va et zoom piloté par le jeu (FEEL-12) ; bascule
  compensée (ENN-10).
- **Pour SNAKE 2975.** Cette leçon change de poids avec la demande de la propriétaire (un monde plus
  grand que l'écran, une caméra qui suit, des plans en parallaxe) : la caméra devient la première cause
  possible de mort injuste. Dès la première version :
  1. la tête jamais hors de [0,15 ; 0,85] de la zone sûre ;
  2. une avance de caméra dans la direction du cap (2030 : 61 u, soit 539 u visibles devant contre 417
     derrière), pour qu'au moins une seconde de trajet à la vitesse courante soit visible devant la tête,
     y compris dans l'axe court de l'écran — c'est vital si les murs tuent ;
  3. aucun mouvement de caméra au hasard : zoom et recadrage ne bougent que sur un événement de jeu ;
  4. une échelle constante (dézoomer pour montrer plus de monde réduisait les tirs de 2030 à 2,5 px) ;
  5. un seul plan de jeu : seuls les plans de décor défilent à d'autres vitesses ; entités,
     télégraphes et murs vivent sur le plan de la joueuse, sinon les distances perçues mentent ;
  6. le défilement de chaque plan arrondi au pixel de jeu (règle des gros pixels).

  Test à reprendre de `dive-head.mjs` : tête dans le cadre sur 100 % des images d'un parcours qui longe
  les bords du monde.

### A4 — Tous les écrans voient le même jeu (G2, DESK-2, ENN-16)

- **Constat.** Bureau 1440×900 : 961×601 u visibles, contre 1316×600 sur iPhone ; on voyait moins sur
  bureau, donc plus d'attaques hors champ (visées d'artilleur commencées hors champ : 44 à 62 % sur
  bureau, 29 à 42 % sur iPhone). Ultra-large 3440×1440 : 34 % de monde en plus. Fenêtre haute 960×1040 :
  450 à 585 u de large.
- **Correction.** Largeur de vue bornée à [1000 ; 1600] u, zoom de base 1,05 sur bureau ; les bandes
  noires (DESK-2) ont été écartées au profit de cette borne. **Livré** : 1189×743 u à 1440×900 ;
  960×1040 jouable ; 1525 u à 3440×1440.
- **Pour SNAKE 2975.** Avec la règle de DIRECTION, `px = max(2, ⌊min(l/360, h/180)⌋)`, le tampon fait
  422×195 pixels de jeu sur iPhone 13 paysage, et (calcul fait ici, sans marges de zone sûre sur bureau)
  360×225 sur 1440×900, 430×180 sur 3440×1440. Dans l'arène-écran de la démo, c'est l'arène qui changeait
  de forme ; dans un monde qui défile, c'est le champ de vision. Le borner en largeur ET en hauteur
  (minimum et maximum en pixels de jeu), exprimer apparitions et armement par rapport à l'étendue
  affichée, et vérifier l'équité sur trois formats : part des attaques armées hors champ égale à ±5
  points près.

### A5 — Le bureau n'est pas un téléphone dans une fenêtre (G2, G3, G4)

- **Constat.** Bloquant, et demandé explicitement : sur 1440×900 sans écran tactile, manche et boutons
  tactiles affichés, plein écran forcé à chaque JOUER, Entrée, Espace et P inertes, souris inerte, aucune
  navigation clavier dans les menus, les cartes, la pause et la fin, 41 boutons sans `aria-label`, aucune
  touche indiquée nulle part ; une fenêtre plus haute que large affichait « Tourne ton téléphone » et
  rendait JOUER incliquable ; Cmd+R lançait l'ultime avant de recharger la page.
- **Correction.** Détection du bureau (pas de tactile, pointeur fin, remise à faux au premier toucher) ;
  plus de contrôles tactiles ni de plein écran forcé ; P et Échap pausent, F bascule le plein écran,
  modificateurs et répétitions filtrés, directions lues sur `e.code` (ZQSD et WASD physiques) ; souris
  analogique (zone morte de 24 px, magnitude = distance/120), clic gauche boost, droit pouvoir, molette
  ultime, réticule masqué après 1,5 s ; focus visible et raccourcis sur chaque écran (cartes au 1/2/3),
  verrou de 600 ms sur l'écran de fin, légende des touches et capuchons pendant les trois premières
  parties. **Livré** : Entrée au menu → jeu en 13 ms ; latence clavier 1 image ; 32 Tab sans focus hors
  écran.
- **Reste.** Manette (DESK-6) et remappage des touches (DESK-9).
- **Pour SNAKE 2975.** Reprendre G2 à G4 comme une liste de tests prête à l'emploi. La manette (Gamepad
  API) est l'ajout le moins cher : elle tombe sur les mêmes champs d'entrée. Invariant : rien de ce
  qu'on fait pour le bureau ne retire quoi que ce soit à l'iPhone.

### A6 — Le cycle de vie ne trahit pas la partie (G2, G13, ROB-7, ROB-9 ; ROB-2 non fait)

- **Constat.** Alt-Tab sans pause et touche « collée » (le relâchement part vers une autre fenêtre) ;
  verrou d'écran jamais redemandé au retour ; état audio `interrupted` de Safari jamais relancé ; 1 050
  erreurs de console en 150 s sur tablette (`preventDefault` sur des touchers non annulables) ; 60
  réallocations du canevas pour 60 événements `resize` ; hoquet de 350 à 533 ms au clic JOUER (audio,
  plein écran et remise à zéro dans la même image) ; un rechargement perdait la partie.
- **Correction.** Perte de focus : entrées vidées et pause distincte (« FENÊTRE INACTIVE ») ; verrou
  d'écran redemandé ; `resume()` dès que l'état n'est pas `running` ; `preventDefault` seulement si
  l'événement est annulable ; un seul minuteur de redimensionnement ; armement étalé sur trois images,
  dégradés et tampons pré-créés au démarrage. **Livré** : pause 0,5 ms après la perte de focus ; 0 erreur
  de console sur tablette ; 0 réallocation pour 60 événements ; aucune image > 100 ms dans les 3 s qui
  suivent JOUER.
- **Reste.** Sauvegarde continue et bouton REPRENDRE (ROB-2).
- **Pour SNAKE 2975.** REPRISE.md signale « un à-coup d'une image quand le son démarre » : c'est le
  hoquet de 2030, même remède. Reprendre les contrôles de `lifecycle.mjs`. Pour une campagne en niveaux
  de deux à trois minutes, reprendre au début du niveau en cours suffit.

---

## B. Équité : mourir de ce qu'on a vu

### B1 — Rien ne naît ni ne s'arme hors du champ (G6, ENN-6, ENN-11, AV-12)

- **Constat.** 17 à 29 % des ennemis apparaissaient dans le champ (le motif « flanc » tirait à 420-600 u
  du centre pour une demi-largeur de vue de 480 à 658 u) ; 37 à 76 % des charges de trancheur et 37 à 62 % des visées
  d'artilleur démarraient hors champ ; 38 coups de trancheur sur 199 venaient d'une source jamais vue ;
  le boss apparaissait hors champ et n'était visible que 25 à 50 % de son combat. « Le joueur meurt de
  ce qu'il ne peut pas voir, ce qui rend toute courbe de difficulté illisible. »
- **Correction.** Apparition au-delà de la demi-diagonale de la vue plus 150 u, revérifiée hors champ ;
  portail de 600 ms avant chaque apparition (chevron de bord de 24 px à la couleur du type, double pour
  les élites, tic sonore) ; les quatre types qui arment n'arment que dans le champ, avec 300 ms de plus
  et un chevron clignotant si leur source sort du cadre ; marqueurs permanents pour boss, élites et mines
  armées. **Livré** (60 parties sur 3 formats) : apparitions dans le champ 12,5 % → 0 % (0 sur 24 561) ;
  annonces hors champ 39,7 % → 0 % (0 sur 5 142) ; ruées « surprise » 24,4 % → 0 % ; portail sur 98,8 %
  des apparitions.
- **Reste.** Un coût de 3 à 7 % de temps d'image. Le boss naît toujours hors champ : par arbitrage écrit,
  la garantie l'emporte sur la mise en scène, et le critère devient « la joueuse voit le boss arriver et
  comprend que c'en est un ».
- **Pour SNAKE 2975.** La démo applique la règle à son arène-écran (naissance hors du tampon à plus de
  80 px de la tête, télégraphe ≥ 0,9 s pour ce qui naît dans le champ). Dans un monde qui défile, il faut
  la recalculer à chaque image sur l'étendue affichée : un ennemi posé peut ENTRER dans le champ parce
  que la caméra avance ; ce n'est pas une apparition, mais il ne doit pas être déjà en train d'attaquer.
  Chevrons de bord (le sprite existe), portail d'au moins 600 ms, marqueurs pour boss et élites, armement
  journalisé avec son état « dans le champ » (le journal `dbg().stats.spawns` existe déjà).

### B2 — Toute attaque s'annonce, et la difficulté ne raccourcit jamais l'annonce (G6, G11, ENN-13, AV-15)

- **Constat.** Le code de 2030 disait « tout ce qui va tuer se télégraphie une demi-seconde avant ».
  Mesuré : 317 ms pour le traqueur, 183 ms avec le mod « rapide ». Sur iPhone, les cercles d'armement des
  mines étaient tracés à 10 % d'opacité sur 0,6 px, les lignes de visée à 18 % : invisibles. Et le boss
  « enragé » prévu raccourcissait ses annonces de 25 %.
- **Correction.** Annonce d'au moins 450 ms même en « rapide » (le mod accélère le bond, pas l'annonce) ;
  opacités de 0,35 à 0,85, traits d'au moins 2 px CSS, une couleur d'alerte unique, télégraphes dessinés
  en dernière passe, gainés, sans composition additive. **Livré** : annonce du traqueur 317 et 183 ms →
  483 ms.
- **Pour SNAKE 2975.** La recherche de 2975 est plus exigeante (G-13 : 0,6 s à l'endroit exact des
  dégâts) : en faire un plancher absolu. La propriétaire veut un jeu plus dur : la difficulté monte par
  le nombre, la combinaison des rôles et la vitesse d'exécution, jamais par la suppression du préavis.
  En gros pixels, un télégraphe fait au moins un pixel de jeu plein, magenta gainé de nuit profonde ; pas
  de pointillés clairsemés (en 2030, des pointillés couvrant 42 à 59 % du tracé faisaient échouer les
  sondes de lisibilité).

### B3 — Ne pas être puni par ce qu'on ne regarde pas, mais pouvoir mourir (G6, ENN-5)

- **Constat.** Sur 1 192 coups attribués, 52 % étaient des balles d'artilleur (65 % au niveau 1, 79 % au
  niveau 3) ; 48 % de ces balles touchaient le corps, à 423 u de la tête en médiane, souvent tirées hors
  champ (portée de 819 u pour une demi-vue de 300 à 480 u) : « ce n'est pas un bullet hell, c'est un tir
  à l'aveugle dans un corps long ». Sur le treillis, une seule charge de trancheur coûtait deux coups au
  corps aligné sur le rail.
- **Correction.** Un projectile qui touche au-delà du 8e anneau est absorbé (gerbe, +1 % de boost, sans
  dégât ni remise à zéro du combo) ; portée de l'artilleur ramenée à 506 u ; crochet de visée posé sur le
  point d'impact prédit, rouge s'il vise les huit premiers anneaux ; trancheur perpendiculaire aux rails.
  **Livré** : coups par balle 74,8 % → 15,6 % (mesure du médiateur) ; balles sur les anneaux lointains
  447 → 0. **Effet de bord mesuré** : l'exposition à l'artilleur divisée par 4,3 et la survie du pilote
  en hausse de 63 % ; il a fallu le directeur de difficulté de G9 pour rendre la pression.
- **Pour SNAKE 2975.** La démo est allée beaucoup plus loin : le corps entier absorbe les tirs, trois
  vies, deux secondes d'invulnérabilité après chaque coup, un choc qui éteint les tirs proches et
  repousse les ennemis, des murs qui font glisser. La propriétaire : « La démo protège trop […] Il faut
  une vraie mort, lisible et juste, qui fait peur. » La leçon de 2030 n'est pas « rendre le corps
  invulnérable », c'est « ne punir que ce qui a été vu et annoncé ». Donc :
  - rendre des conséquences au corps (par exemple la queue tranchée au point d'impact : la longueur est
    la puissance, la perdre se sent), réservées aux menaces vues (B1) et annoncées (B2), avec un
    indicateur du segment visé comme le crochet de 2030 ;
  - la tête reste la zone qui tue ;
  - des murs qui tuent, à condition qu'ils se voient venir (A3) et s'annoncent à l'approche ;
  - une invulnérabilité après coup ramenée au temps de comprendre le coup (gel et recul), et mesurée ;
  - critère : au moins 95 % des morts ont une source visible depuis 600 ms ou plus (le journal `hitLog`
    de la démo enregistre déjà la source ; il faut y ajouter depuis quand elle était visible).

### B4 — Toute protection est plafonnée et dit la vérité (G9, G14, PROG-8)

- **Constat.** BOUCLIER ×3 : 0 coup reçu en 150 s, sur 4 parties sur 4 ; le plus long intervalle sans
  coup atteignait 536 s. PARE-CHOCS annonçait « une seconde d'invulnérabilité » et donnait une charge de
  bouclier. AMORTISSEURS ×3, CITADELLE, PHASE ×3, DÉSYNCHRO, MARCHE DU VIDE : aucun effet mesurable.
  CROISSANCE ×6 augmentait de 50 % les coups reçus : un serpent plus long est une cible plus grande.
- **Correction.** G9 plafonne l'absorption du bouclier ; G14 aligne le texte de PARE-CHOCS sur son effet
  (« Absorbe un coup par partie »). **Reste** : le rééquilibrage des cartes défensives (PROG-8).
- **Pour SNAKE 2975.** Chaque protection (vies, invulnérabilité, bouclier, choc) a un plafond vérifié par
  le pilote parfait : aucun cumul ne doit rendre invulnérable. Chaque texte de carte ou de bonus décrit
  l'effet mesuré, et un test compare les deux. La longueur reste un risque autant qu'une force : c'est
  l'âme du snake.

---

## C. Courbe, rythme et contenu

### C1 — La première minute apprend avant de tuer (G7, PROG-1, PROG-2, ACC-1)

- **Constat.** 7 parties réelles sur 7 mortes au niveau 1, entre 29 et 97 s ; pilote humain imparfait
  mort à 41,9 s en médiane ; 30 à 70 % des parties mortes sans avoir vu une carte ; les coups reçus
  passaient de 6,7 par minute (10-15 s) à 23,3 (20-25 s), et les ennemis à l'écran de 2 à 43 entre 0 et
  45 s, pour un serpent de 9 segments et un canon de niveau 1. Un joueur qui ne touchait jamais l'écran marquait 439 points, contre 121 à 160 pour celui
  qui pilotait. L'ultime n'était prêt qu'à 49-53 s, au moment de mourir, et aucun bot ne s'en est servi.
- **Correction.** Calme de 10 s, première carte avancée, premier écran garanti avec au moins une carte de
  survie et au plus une arme neuve, montée en deux temps, plafond de 22 ennemis tant que le serpent est
  court, artilleurs seulement après la première carte. **Livré** : première carte 46,0 → 22,3 s (pilote
  bruité, graines identiques) ; premier écran conforme 40 % → 100 %.
- **Reste.** La carte à 12-15 s n'a pas été atteinte (démontré inatteignable avec cette courbe d'XP pour
  ce pilote) ; le tutoriel scénarisé de 45 s (ACC-1) a été écarté au profit de l'apprentissage par le
  jeu.
- **Pour SNAKE 2975.** La démo est conçue pour se comprendre en cinq secondes, et jouer y rapporte :
  garder. Mais
  « trop facile » ne se corrige pas par un mur précoce : 2030 a montré qu'un mur tue avant que la
  joueuse ait reçu un outil. Par niveau : un seul élément nouveau dans les 10 à 15 premières secondes, un
  premier choix avant la première vraie vague, et deux contrôles chiffrés — le pilote passif meurt
  (sinon c'est trop facile), mais après le pilote actif (sinon jouer ne sert à rien).

### C2 — Une courbe, pas un mur puis un plateau (G9, PROG-3)

- **Constat.** Passé 60 s, plus personne ne mourait : 100 % des pilotes d'esquive au plafond de 10 min
  sur quatre crans sur cinq ; 90 segments (le maximum) atteints à 172 s ; PV ennemis constants alors que
  les kills par minute passaient de 101 à 471 ; niveaux enchaînés à horaire fixe quel que soit le cran
  (niveau 2 à 80 s, niveau 3 à 170 s…) ; cinq crans indiscernables (pilote passif : 26,8 s au cran par
  défaut, 21,5 s au plus dur). « Le jeu n'a pas de courbe, il a un mur puis un plateau. »
- **Correction.** PV et mordant indexés sur le secteur et le cycle de surcharge, cadence et plafond
  d'ennemis relevés (seulement si la cadence d'image le permet), élites modifiées, boss supplémentaires,
  bouclier plafonné. Cible de la vision : le joueur moyen vit 2 à 4 min, l'excellent meurt entre 6 et
  12 min. **Livré** : 0 % des parties d'esquive au plafond de 900 s (contre 100 %), survie médiane 488 s ;
  temps passé à la longueur maximale après 120 s : 65 % → 20,7 %.
- **Pour SNAKE 2975.** C'est la réponse au « trop facile ». Fixer les cibles avant de régler, et les
  mesurer par pilotes : par niveau, une part de réussite visée pour le pilote bruité (par exemple 40 à
  70 % au premier essai d'un niveau ordinaire, à décider), un pilote parfait qui peut échouer aux niveaux
  de boss, aucune stratégie dégénérée gagnante (rester immobile, tourner en rond, longer un bord). Un cran
  de difficulté, s'il existe, doit changer le résultat de façon mesurable.

### C3 — Une respiration n'existe que si elle est mesurée (G9, ENN-12)

- **Constat.** La phase « calme » comptait 8 ennemis vivants en médiane (p90 18) et 11 % seulement de
  secondes à deux ennemis ou moins ; un niveau commençait avec 6 ennemis reportés du précédent en médiane
  (59 au maximum), la première apparition 0,57 s après son début ; « SECTEUR NETTOYÉ » s'affichait au
  milieu d'une dizaine d'ennemis.
- **Correction.** G9 purge le secteur à la mort du boss (les survivants fuient, 0 ennemi reporté).
- **Reste.** Les silences écrits du calme et les formations nommées annoncées une seconde avant
  (MEUTE, BATTERIE, CHAMP DE MINES, ESSAIM, RAID ; ENN-12).
- **Pour SNAKE 2975.** La montée monotone par tranches de 20 s était la règle du prototype de deux
  minutes ; DIRECTION prévoit des respirations pour la campagne. Les mesurer comme 2030 voulait le faire :
  au moins 30 % de secondes à deux ennemis ou moins dans un calme, un silence d'au moins 3 s par calme,
  0 ennemi reporté, première apparition au moins 3,5 s après le début du niveau. La tension est un
  contraste : un niveau qui ne fait que monter se lit plat. ENN-12 est un cahier des charges prêt.

### C4 — Les récompenses gardent leur cadence du début à la fin (G7, PROG-4, PROG-5, PROG-10)

- **Constat.** Cartes : 25 s de disette, puis 5 cartes en 30 s, puis une par minute (4,1 par minute en
  minute 1, 0,9 en minute 10) ; 8 % des écrans de cartes enchaînés en moins de 2 s. Ultime : un toutes
  les 40 s au début, un toutes les 0,7 s après 5 min (charge fixe par kill, alors que les kills par
  minute étaient multipliés par 4,7). Multiplicateur à ×1 pendant 67 à 87 % du temps (remis à zéro à
  chaque coup, fenêtre de 3,2 s), puis bloqué à ×12 pendant 6 minutes chez le pilote parfait.
- **Correction.** Croissance d'XP adoucie et revenu indexé sur le secteur ; un seul écran de quatre
  cartes quand deux sont dues ; charge d'ultime indexée sur la progression (6·√(12/xpNext)) et vague plus
  lourde ; multiplicateur à palier tous les 3 kills, fenêtre de 5 s (7 s au-delà de ×3), un coup divise
  le combo par deux, décompte « N kills → ×M » au HUD, son à chaque palier. **Livré** : enchaînements de
  cartes 8 % → 0 % ; multiplicateur au-dessus de ×1 sur 78,7 % des images.
- **Reste.** Le plafond « au plus 2 ultimes par minute » s'est révélé contradictoire : les élites seules
  en chargent davantage en fin de partie.
- **Pour SNAKE 2975.** La démo n'a qu'un multiplicateur de longueur et un défi « dix kills en chaîne ».
  Si la refonte reprend cartes, ultime et combo (une grande part de ce qui rendait 2030 « pas basique »),
  elle reprend aussi leurs formules corrigées et leurs tests de cadence : 1,5 à 3,5 récompenses par
  minute sur toute la partie, une charge d'ultime jamais fixe par kill, un multiplicateur qui pardonne
  (divisé, pas remis à zéro) et qui se lit (décompte affiché).

### C5 — Un boss est un événement, pas une élite renommée (G9, ENN-2, ENN-3, ENN-4, PROG-9)

- **Constat.** Les boss étaient des élites renommées (le code des ennemis ne lisait jamais `e.boss`) :
  5 % des coups d'un climax venaient du boss ; DOUBLE LAME mourait en 4,3 s médianes (0,1 s au minimum) ;
  PROTOTYPE ZÉRO et NOYAU étaient « forfaités » au chronomètre dans 20 à 25 % des cas, avec la même
  bannière SECTEUR NETTOYÉ et la même récompense qu'une victoire ; 14 entrées de niveau sur 100 avec
  l'ancien boss encore vivant ; une bannière de 1,2 s écrasée par d'autres ; un boss hors champ
  (première vue p90 à 7,2 s et 30,6 s) ; une récompense de 3 cœurs et un soin.
- **Correction.** Plus de victoire par le temps (soupape à +180 s), PV indexés sur le secteur,
  enragement à 45 s, escorte en deux salves à 66 % et 33 % de PV, purge du secteur, trophée (cartes non
  communes dont une épique, +60 crédits, +50 d'ultime) ; entrée : portail de 1,4 s, chevron triple,
  arrivée pilotée de 1,8 s, ralenti à 0,3 pendant 2,2 s, jauge qui se remplit, bannières en file.
  **Livré** : climax médian 43,6 s au secteur 1 et 34,6 s au secteur 2 (contre 8,6 et 3,6) ; 27,6 % des
  coups infligés par le boss lui-même.
- **Reste.** Les boss chorégraphiés à trois phases (ENN-2, effort 5), que l'audit désigne comme « la
  phase 2 la plus rentable » : PROTOTYPE ZÉRO (triple bond, charge de mur, berserk), DOUBLE LAME
  (charges en ciseaux, convois lancés à chaque croisement), NOYAU MAGNÉTIQUE (vulnérable seulement quand
  la tête est dans son champ, inversion de polarité), SURCHARGE (rotation déterministe des types et des
  modificateurs). Jamais faits.
- **Pour SNAKE 2975.** Le colosse de la démo est déjà mis en scène (annoncé à 1 min 16, télégraphe de
  2,4 s, explosion énorme). Il lui manque ce qui manquait aux boss de 2030 : des attaques qui n'existent
  nulle part ailleurs, des phases à 100, 66 et 33 % de PV, une part de coups significative (cible écrite
  par l'audit : au moins 35 % des coups du combat), aucune issue par le temps, une récompense propre. Les
  quatre boss d'ENN-2 sont un cahier des charges à réécrire en gros pixels.

### C6 — Une mécanique d'arène est une règle, pas un décor (ENN-7, ENN-8, ENN-9, ENN-10, ENN-14 ; non faits)

- **Constat.** Champ magnétique du niveau 3 : 10° de rotation en 0,5 s contre 264° par seconde de
  contrôle propre ; 1 % des coups. Treillis : +28 % de coups et −25 % de kills, sans qu'aucun ennemi
  utilise la grille (la « file indienne » attendue : 12 % des échantillons). Bascule 3D : purement
  visuelle, +21 % de coups par minute. Convois : 16 % des coups, aucune pré-annonce, rien à gagner à
  rouler dans une voie. « Les trois arènes se ressemblent en pratique. »
- **Correction.** Aucune en 2030, hors la réactivité des rails (G5) et le trancheur perpendiculaire (G6).
- **Reste.** Tout : convois annoncés 1,2 s avant et « sillage » qui récompense (ENN-7) ; champ qui pèse,
  avec fronde et capture (ENN-8) ; treillis en duel Tron où le corps tue les ennemis (ENN-9) ; bascule
  compensée (ENN-10) ; événements d'arène annoncés de 12 à 18 s — COUPURE, CONTRESENS, INVERSION,
  GRAVITÉ, PLUIE DE MINES (ENN-14).
- **Pour SNAKE 2975.** C'est le principal gisement du « en mieux ». Reprendre ces idées, chacune avec une
  règle qui change la façon de jouer et un test qui le prouve (ENN-8 : rotation d'au moins 25° en 0,5 s
  à mi-rayon ; ENN-9 : kills par minute sur rail au moins égaux aux kills libres), et chacune avec
  quelque chose à gagner : en 2030, convois et treillis ne faisaient que punir. Les plans de parallaxe
  portent le décor ; le plan de jeu porte les règles.

### C7 — Un bestiaire de rôles, pas de fonceurs (ENN-13 ; non fait)

- **Constat.** 7 types sur 11 fonçaient sur la tête ; larve, traqueur et intercepteur faisaient 73 % des
  apparitions, voleur, pondeuse, brouilleur et miroir moins de 2 % chacun ; tués sans avoir jamais
  attaqué : larve, miroir, brouilleur et voleur 100 %, traqueur 84 % (l'auto-visée les fauchait à
  l'arrivée) ; voleur tué sans avoir été vu 67 % ; trois modificateurs sur six ne pesaient rien.
- **Correction.** Aucune, hors annonces (G6) et familles de couleur (G11).
- **Reste.** ENN-13 : des rôles distincts (la larve ne mord que la queue, le miroir renvoie les balles
  de face, SENTINELLE au laser tournant, FAUCHEUR qui remonte le corps), deux modificateurs nouveaux,
  aucun type au-dessus de 25 % des apparitions.
- **Pour SNAKE 2975.** Quatre ennemis et un colosse dans la démo. Les ajouter un à un en vérifiant pour
  chacun : un rôle qui impose une décision différente (fuir, se retourner, protéger la queue, planifier
  un trajet), au moins 5 % des apparitions là où il existe, et une part mesurable d'ennemis qui attaquent
  avant de mourir. Sinon c'est une cible, pas un ennemi.

### C8 — Peu de cartes, toutes mesurées, qui forment des constructions (G7, G14 ; PROG-6, PROG-7, PROG-8 non faits)

- **Constat.** 18 cartes par partie dispersées sur 6 axes (axe dominant : 33 %), 0 épique en médiane,
  jamais d'ultra ; 13 cartes sur 53 offertes dans moins de 1 % des écrans, dont 5 jamais. Au labo, 13
  cartes changeaient la partie (ARC ×6 : +64 % de kills, TOURELLES +46 %, ONDE +45 %…) et 40 restaient
  dans le bruit (CADENCE ×5 : +4 %, PORTÉE ×4 : 0 %, OGIVE ×4 : −1 %) ; deux cartes posaient le même
  drapeau ; la première main proposait des armes à un serpent de 5 segments ; l'axe vitesse sans arme
  tuait le pilote parfait avant 40 s une partie sur deux.
- **Correction.** G7 garantit une carte de survie au premier écran ; G14 nomme le build à l'écran de fin.
- **Reste.** Pitié de rareté, écoles de build nommées, rééquilibrage et fusion des doublons.
- **Pour SNAKE 2975.** Si la refonte reprend les cartes, partir de peu de cartes, chacune passée au labo
  (au moins +20 % d'effet à son maximum, sinon elle sort), sans doublon, avec des familles nommées qui
  convergent et une pitié de rareté. Cinquante-trois cartes dont quarante inertes donnaient une
  impression de richesse sans profondeur.

### C9 — La fin de partie dit pourquoi et donne la prochaine marche (G14, PROG-11, PROG-12 ; PROG-13 non fait)

- **Constat.** L'écran de fin ne disait ni qui avait tué (la fonction de dégât n'avait pas de source),
  ni quoi changer, ni la distance au prochain déblocage ; « NOUVEAU RECORD » dès la première partie ; un
  seul record, sans cran (563 k au cran le plus facile contre 691 k au plus dur, pour ×2,2 de
  difficulté) ; une économie dégénérée : 6 articles pour 1 780 crédits, 5 à 75 crédits par partie pour un
  débutant (25 à 250 parties avant le premier achat), 3 000 à 5 000 pour un bon joueur (tout en une
  partie).
- **Correction.** Source du dernier coup portée par chaque ennemi, balle, convoi et nœud ; écran de fin
  « Détruit par TRAQUEUR — niveau 1 — 62 % du secteur », progression, combo max, build, écart avec la
  partie précédente et le record du cran, une phrase-conseil (« Ton ultime était prêt à 0:49 et n'a pas
  servi »), barre PROCHAIN DÉBLOCAGE ; record seulement après une première partie et par cran ; score
  multiplié par le cran (2,33 fois plus au plus dur, à kills égaux).
- **Reste.** Méta-progression de contenu, missions, défi du jour (PROG-13) ; partage du score (ACC-8).
- **Pour SNAKE 2975.** La démo garde la source de chaque coup dans `stats.hitLog`, mais son écran de fin
  ne la montre pas : à brancher. Avec une vraie mort, l'écran de fin devient le moment le plus lu du
  jeu : qui a tué, ce qui l'aurait évité, où l'on en était, la prochaine marche. La campagne de 25
  niveaux est la méta que 2030 n'a jamais eue : calibrer son économie par pilotes (premier déblocage en
  3 parties au plus, dernier en 25 au moins, comme le demandait PROG-13).

---

## D. Impact et mise en scène

### D1 — Le gel d'image se compte en images (G8, FEEL-2)

- **Constat.** Un gel de 12 ms posé sur chaque kill gelait 0 image (consommé dans l'image même) ; 55 ms
  en gelaient 2 ; et le résultat dépendait de la machine : une élite gelait 3 images à 60 im/s et une
  seule à 30.
- **Correction.** Un compte en images, décrémenté après lecture et jamais dans l'image de pose : kill 2,
  élite 5, blessure 4, mort 8, identiques à 60 et à 30 im/s ; plafond de 6 images cumulées hors mort. La
  version en millisecondes (AV-8) a été écartée pour cette raison.
- **Pour SNAKE 2975.** Acquis dans `50-fx.js`. Un écart : un coup reçu gèle 8 images et le coup mortel
  aussi (la demande de 4 images de la mort ne prolonge pas un gel en cours), là où 2030 donnait 4 à la
  blessure et 8 à la mort. Avec une vraie mort, la mort doit être le gel le plus long et le plus lisible.

### D2 — Le kill et la blessure se sentent (G8, FEEL-5, FEEL-6, FEEL-7, AV-8)

- **Constat.** Kill : son à hauteur fixe, aucun score flottant, secousse de 1,2 px sur iPhone, luminance
  locale inchangée en zoom large. Impact non létal : +2,5 à +5 points de luminance, et la fonction
  d'impact `fx.hit` jamais appelée. Blessure : un flash rouge plein écran d'une image (+82 à +113 % de
  luminance globale), sans gel, sans ralenti, sans direction ; la vignette directionnelle existait et
  n'était jamais appelée.
- **Correction.** Score flottant dont la taille suit le combo ; son de kill monté d'un demi-ton par kill
  de combo ; secousse de 4,5 u ; recul de caméra de 3 u opposé au tir ; silhouette blanche 60 ms et six
  éclats ; silhouette pleine blanche à chaque impact ; blessure en vignette du côté du coup, gel de
  4 images, ralenti à 0,4 pendant 180 ms, secousse directionnelle. **Livré** : à la blessure, bord touché
  +117 % de luminance, centre +0,06 %, bord opposé +9 %.
- **Reste.** Le recul des ennemis touchés (FEEL-7).
- **Pour SNAKE 2975.** La hauteur du kill monte déjà avec la chaîne. Le recul de caméra existe (ressort
  amorti de `20-crt.js`) mais le jeu n'écrit pas encore `S.shakeX` et `S.shakeY` : à brancher. Ajouter le
  score flottant à chaque kill, la blessure lue sur le bord touché (une vignette tramée du côté du coup,
  pas un aplat plein écran), et vérifier que le flash de frappe (`N.fx.hit`) est appelé à chaque impact :
  en 2030, la fonction existait sans appelant.

### D3 — Les moments forts sont mis en scène et signalés (G8, G9, FEEL-8, ACC-6)

- **Constat.** Montée de niveau : un son, puis l'écran de cartes à l'image suivante, sur un jeu figé.
  Ultime prêt : un libellé de 7 px qui clignote sur un bouton à 26 % d'opacité ; le son « prêt » était
  écrit et jamais appelé ; aucun bot ne s'est servi de l'ultime avant de mourir. Entrée de boss : une
  bannière de 1,2 s, sans ralenti, boss hors champ.
- **Correction.** Montée de niveau en 350 ms de ralenti à 0,15, flash léger, onde depuis la tête,
  invulnérabilité pendant la séquence ; son et toast « ULTIME PRÊT » et « POUVOIR PRÊT » avec la touche ;
  entrée de boss au ralenti (C5).
- **Pour SNAKE 2975.** Chaque événement qui compte (palier de combo, carte, pouvoir prêt, boss, défi
  réussi ou raté) a son moment : un son dédié, un signal près de la tête, et jamais deux à la fois (file).
  Les signaux « prêt » sont le premier tutoriel : en 2030, l'ultime existait et personne ne s'en servait.

### D4 — Un budget de flashs, de secousses et de bannières (G8, G10, AV-10)

- **Constat.** 72 flashs plein écran en 193 s (un toutes les 2,4 à 2,7 s), 120 en 5 min ; secousse sur
  26 à 30 % des images ; une bannière de 76 px toutes les 3,9 s ; luminance moyenne d'écran jusqu'à
  209/255.
- **Correction.** Au plus un flash plein écran toutes les 4 s (les suivants deviennent des vignettes),
  flash d'ultime réduit de moitié, secousse plafonnée ; cibles : 30 flashs au plus en 5 min, 12 %
  d'images secouées au plus, luminance maximale 140/255 ; « Réduire les mouvements » pré-coché si le
  système le demande.
- **Pour SNAKE 2975.** Le limiteur de `50-fx.js` est déjà plus strict que 2030 sur les flashs. Il manque
  un budget mesuré de secousse et de bannières sur une partie longue : la demande d'« explosions
  énormes » ne doit pas ramener 30 % d'images secouées. Une énorme explosion par moment fort, pas à
  chaque kill.

### D5 — La mort est un moment (AV-9 ; non fait)

- **Constat.** À la mort : flash blanc, puis gel instantané du monde, écran de fin à 900 ms, ni ralenti
  ni zoom ; 500 ms après, le corps était encore dessiné, sans trace de l'explosion.
- **Correction.** G8 pose 8 images de gel, G12 redessine le son de mort.
- **Reste.** La mort mise en scène d'AV-9 : ralenti à 0,15 pendant 700 ms, zoom ×1,5 sur la tête,
  désintégration segment par segment de la queue vers la tête en 500 ms, vignette rouge, musique qui
  s'effondre, son qui chute de 800 à 60 Hz.
- **Pour SNAKE 2975.** « Une vraie mort, lisible et juste, qui fait peur » : AV-9 est la spécification à
  reprendre en gros pixels (désintégration en brasier et éclats cyan, musique qui chute), dans la limite
  de la recherche (J-17 : écran de fin en moins d'une seconde) et avec une relance immédiate (REJOUER en
  moins de 600 ms, verrou contre le double appui). La peur vient de l'enjeu (B3, C2), pas de la durée.

---

## E. Lisibilité et interface

### E1 — Le cyan à la seule joueuse, et une palette vérifiée par le calcul avant d'être adoptée (G11, AV-1)

- **Constat.** Le cyan du serpent était aussi celui des rails (contraste 1,14:1), du décor, du butin
  (jusqu'à 137 disques cyan à l'écran) et d'un modificateur d'élite : 28 paires de catégories différentes
  à ΔE = 0. Le tir du joueur avait la couleur du butin. Six ennemis tenaient dans une bande de teinte de
  34°. 17 paires étaient confondues en protanopie et 15 en deutéranopie. Et la palette corrective écrite
  par l'audit échouait à son propre test (16 paires en défaut) : ses six couleurs chaudes tenaient dans
  un arc de 78°, si bien qu'un écart de 40° entre chacune était géométriquement impossible, et la teinte
  du blanc n'a pas de sens.
- **Correction.** Cyan réservé au serpent et à l'interface ; rails bleus (4,18:1 contre le corps) ;
  butin d'énergie vert à glyphe losange ; onze ennemis en quatre familles ; critères de palette réécrits
  avant l'implémentation (la relecture recommandait de juger les couleurs presque neutres sur leur seule
  clarté, et la couleur de rail est devenue une contrainte de contraste plutôt qu'un hexadécimal).
- **Pour SNAKE 2975.** La règle du cyan est déjà dans DIRECTION (critère 3 : moins de 0,5 % de cyan hors
  de la joueuse). Mais la palette fermée concentre les rôles chauds dans un arc de teinte de 85° (rose
  pâle 5°, sang 10°, magenta 12°, brasier 47°, ambre 71°, jaune 90°) : le piège de G11 se reproduit.
  Calcul fait ici avec les formules exactes des outils de 2030 (ΔE76 en Lab ; simulation de Machado 2009,
  sévérité 1 ; confusion sous ΔE 20, seuil d'`acc-cvd.mjs`) :

| Paire de rôles | ΔE normal | protan | deutan | tritan | contraste | lecture |
|---|---|---|---|---|---|---|
| magenta (ennemis) / brasier (explosions) | 51,9 | 58,2 | 42,9 | **2,6** | **1,14:1** | même luminance : en niveaux de gris et en tritanopie, la menace se fond dans l'explosion |
| ambre (butin) / brasier (explosions) | 38,3 | 23,1 | **14,2** | 39,2 | 1,53:1 | le butin se perd dans les explosions (deutéranopie) |
| ambre (butin) / jaune (score) | 30,6 | **19,7** | **11,8** | 28,9 | 1,44:1 | confondus en protanopie et deutéranopie (même famille « gain », moins grave) |
| cyan (joueuse) / rose pâle (éclats d'ennemi) | 86,9 | **18,5** | 33,1 | 96,5 | 1,24:1 | des éclats peuvent passer pour la joueuse (protanopie) |
| cyan pâle (tête) / os (flash, texte) | **20,0** | **16,0** | **19,6** | 20,6 | 1,10:1 | proches pour tout le monde |
| cyan (joueuse) / acier (interface) | 45,7 | 23,4 | 21,4 | 47,2 | 1,85:1 | à la limite en protanopie et deutéranopie |
| cyan (joueuse) / magenta (ennemis) | 124,2 | 39,9 | 52,2 | 137,9 | 2,08:1 | conforme à la cible de 2030 (ΔE ≥ 30 dans les trois simulations) |

  Écarts de teinte sous la règle de 40° de 2030 : magenta/brasier 35°, ambre/brasier 23°, ambre/jaune 19°.
  Et un ennemi magenta sur la grille violette n'est qu'à 3,18:1 (contre 5,5:1 sur le vide). Ce que la
  refonte doit en faire :
  1. magenta et brasier ont presque la même luminance : la gaine d'un pixel en nuit profonde exigée par
     DIRECTION autour de chaque menace est indispensable, à tester au milieu d'une explosion ;
  2. le butin ambre se reconnaît à sa forme et à son mouvement, pas à sa couleur, surtout près des
     explosions ;
  3. jamais de rose pâle sur un objet qui pourrait passer pour la joueuse (projectile, ennemi entier) ;
  4. la tête se distingue par sa forme, pas par sa couleur ;
  5. le tir surchargé de la démo est ambre et jaune, couleurs du butin et du score : c'est exactement la
     collision « tir du joueur = butin » de 2030 ;
  6. avec un seul magenta, les familles d'ennemis passent par la silhouette, l'animation et un accent
     (œil, cœur) plutôt que par trois teintes ; à décider, puis à tester ;
  7. les plans de parallaxe clairs (violet, indigo) restent rares sous le plan de jeu.

### E2 — Silhouettes pleines, contour sombre, tête reconnaissable (G11, AV-2, AV-3)

- **Constat.** Contraste rendu cœur/contour sous 3:1 la moitié du temps (artilleur 61 % des relevés,
  traqueur 54 %, miroir 44 %) ; tête noyée dans son propre halo (64 % des relevés sous 3:1) ; sur un rail
  cyan, le point le plus faible tombait à 1,0-1,6:1.
- **Correction.** Silhouettes remplies sur un liseré sombre extérieur, halos ramenés à 1,6 rayon, tête en
  triangle blanc avec œil et liseré, cône de visée, en invulnérabilité seul le liseré clignote, plancher
  de 2 px CSS pour tout trait ; effets et serpent sortis de la composition additive.
- **Reste.** Le test « une seule tache blanche, autour de la tête » n'a pas été tenu (8 composantes non
  attribuées sur 320 images).
- **Pour SNAKE 2975.** Les gros pixels suppriment les halos flous, pas le problème : garder le contour
  d'un pixel de jeu en nuit profonde autour de chaque menace (DIRECTION), une tête de forme unique qui ne
  clignote jamais entière, et mesurer le contraste sur les captures rendues. C'est la mesure rendue, pas
  la table de couleurs, qui a trouvé le défaut en 2030.

### E3 — Des tailles plancher sur téléphone (G11, AV-2)

- **Constat.** Sur iPhone : tirs 2,6 px CSS, traqueur 6,4 à 7,3 px, tête 8 à 9 px, butin 3,6 px, trait
  néon 1,2 px, ligne de visée 0,9 px ; en zoom large (44 % du temps), tir ennemi 2,5 px. Sur bureau, les
  mêmes objets étaient environ trois fois plus grands.
- **Correction.** Plancher de 2 px CSS pour tout trait ; rayons dessinés ×1,35 sous 480 px de haut (pas
  les rayons de collision) ; cible traqueur ≥ 9 px CSS sur iPhone.
- **Pour SNAKE 2975.** En gros pixels, la taille se raisonne en pixels de jeu (à px = 2, 5 pixels de jeu
  font 10 px CSS). Fixer un plancher par rôle et le tester sur iPhone : la démo a des tirs ennemis de 5×5
  à 9×9 avec cœur et liseré et une tête de 13 px, c'est le bon ordre de grandeur ; ne jamais le perdre par
  un dézoom.

### E4 — Rien ne se cache sous le pouce ni sous le HUD (AV-14 ; non fait)

- **Constat.** iPhone : 62 % des images avec au moins un ennemi sous un contrôle tactile ou sous le HUD ;
  14,1 % des ennemis visibles sous le manche ou les boutons, 18,2 % sous la barre de 37 px ; la tête
  sous un contrôle sur 4,5 % des images.
- **Correction.** G2 retire les contrôles sur bureau ; le reste (caméra décalée, contrôles qui
  s'effacent, HUD latéral) a été renvoyé « à remesurer ».
- **Pour SNAKE 2975.** Avec un manche flottant et une caméra qui suit, placer la tête hors de la zone du
  pouce (la démo le fait déjà en portrait) et garder le HUD aux bords de la zone sûre. Reprendre la
  mesure `av-occl` ; cibles écrites par l'audit : au plus 6 % des ennemis sous un contrôle, 8 % sous le
  HUD, 25 % des images avec une occlusion.

### E5 — Le butin ne noie pas l'écran (G13, AV-4)

- **Constat.** Jusqu'à 137 butins à l'écran (p50 43), 299 vivants en partie longue (expiration 26 s),
  tous de la couleur du joueur ; un dégradé alloué par butin et par image ; un ramassage à son fixe.
- **Correction.** Expiration 10 s avec clignotement, aimant de 200 u, fusion des pièces proches, voleur
  et fin de secteur en un seul noyau de valeur cumulée, couleur dédiée, hauteur qui monte sur les
  ramassages enchaînés. **Livré** : sur une averse de 200 butins, un objet vivant au plus contre 53, pour
  la même XP.
- **Pour SNAKE 2975.** Le butin ambre allonge le serpent et sa hauteur monte déjà avec la longueur :
  ajouter fusion et expiration dès la première version. C'est l'un des retours les moins chers et les
  plus agréables.

### E6 — Une voix à la fois, un mot pour une chose, un texte lisible (G10, ACC-4, ACC-5, AV-11, DESK-7)

- **Constat.** Textes de 7 px sur iPhone (HUD, fin, rareté), 15 encore sous 11 px au réglage maximal ;
  interface figée en pixels de téléphone de 1280×720 à 3440×1440 (3 000 px de vide) ; bannière « NIVEAU 2
  — AUTOROUTE NÉON » débordant de 278 px ; quatre bannières plein écran en 22 s qui n'étaient que des
  noms de phases de caméra ; trois textes simultanés au changement de niveau ; « SURCHARGE » nommait trois
  choses (l'ultime, une phase, un niveau) ; le cran par défaut s'appelait SOUTENU et se lisait plus dur
  que STANDARD, placé au-dessus.
- **Correction.** Échelle d'interface qui suit la hauteur de la fenêtre, plancher de 11 px sur téléphone
  et 12 px sur bureau, bannière plafonnée à la largeur, une seule à la fois et exclusive des toasts, noms
  de phases réduits à une étiquette, ultime renommé (APOGÉE à la livraison), réglages en trois onglets
  décrits, crans FACILE → SUICIDE.
- **Pour SNAKE 2975.** La police 5×7 à px = 2 donne des capitales de 14 px CSS : au-dessus du plancher,
  à vérifier sur le plus petit texte. Garder une file de bannières, un mot pour une seule chose, aucune
  bannière pour un événement purement visuel, et une largeur calculée sur le tampon.

### E7 — Les commandes sont nommées et disent quand elles sont prêtes (G4, G8, G14, ACC-6)

- **Constat.** Boutons ◈ et ★ sans nom, à 26 % d'opacité ; abréviations SEG, BST, ULT de 7 px jamais
  expliquées ; aucune touche indiquée sur bureau.
- **Correction.** Étiquettes de 11 px (BOOST, nom du pouvoir, ultime), opacité 0,45 au repos et 0,90
  quand prêt, compte à rebours en secondes, VIE en pastilles (rouges et pulsantes sous 4), légende des
  touches, toasts « prêt ».
- **Pour SNAKE 2975.** Tout pouvoir ajouté par la refonte naît nommé, avec sa touche affichée et son
  signal « prêt ». Les vies (ou la longueur) se lisent sans chiffre.

### E8 — Une signature, et des noms d'univers (AV-1, AV-13 ; non faits en 2030)

- **Constat.** Aucune police chargée (celles que citait le code ne l'étaient jamais), une palette néon
  interchangeable avec n'importe quelle autre, des icônes en glyphes Unicode, des noms de phases
  techniques (GRILLE, ESPACE, ROULIS, PERSPECTIVE).
- **Pour SNAKE 2975.** C'est ce que 2975 a déjà mieux fait : gros pixels réels, palette fermée, police
  5×7, illustrations converties, cinématiques. Le « triste, basique » ne vient donc pas de l'identité
  visuelle, mais du contenu, du rythme et de la mise en scène (C3 à C8, D3 à D5). Garder la règle
  d'AV-1 : les noms appartiennent à l'univers, jamais à la technique.

---

## S. Sons et musique

### S1 — Les sons d'information passent au-dessus de la musique (G12, AV-6)

- **Constat.** Tir du joueur à −29 dBFS effectifs sous une musique à −20 dB ; impact à −25,7 dBFS sur
  30 ms ; kill à peine 4 dB au-dessus de la musique.
- **Correction.** Cibles de crête par classe (tir −12, impact −14, kill −8, gros kill −4, blessure −4,
  entrée de boss −3, interface de −16 à −10 dBFS), bus de musique baissé ; cibles d'équilibre : tir au
  moins 9 dB, kill au moins 10 dB, impact au moins 3 dB au-dessus de la musique. **Livré** : les 32
  bruitages à ±2 dB de leur cible.
- **Pour SNAKE 2975.** Écrire ces cibles pour `N.music.sfx` et les mesurer hors ligne. La consigne
  « mixage doux » de REPRISE.md reste compatible, à condition que doux ne veuille pas dire sous la
  musique.

### S2 — Chaque son s'entend sur un haut-parleur de téléphone (G12, AV-6)

- **Constat.** 11 bruitages sur 22 avaient plus de 70 % de leur énergie sous 400 Hz, quasi muets sur
  iPhone : entrée de boss 100 % (centroïde à 68 Hz), mort 97 %, kill 91 %.
- **Correction.** Au moins 25 % d'énergie au-dessus de 400 Hz pour chaque son. **Livré** : aucun son
  au-delà de 75 % sous 400 Hz ; entrée de boss à 81 % entre 600 et 2 000 Hz.
- **Pour SNAKE 2975.** La propriétaire joue sur iPhone, mode silencieux contourné, donc souvent sur le
  haut-parleur : même règle pour chaque son et pour la musique générative. Une montée portée par la
  basse est inaudible ; elle doit aussi se faire au-dessus de 400 Hz.

### S3 — Un son par événement, jamais le même pour la joueuse et l'ennemi (G12, AV-17)

- **Constat.** L'artilleur jouait le même son de tir que le joueur, trois fois plus fort ; un même son
  servait à 8 événements différents (warp), d'autres à 5 ou 7 ; le rebond de mur jouait le son d'un
  ennemi touché.
- **Correction.** Tir ennemi dédié (corrélation 0,000 avec celui du joueur), chaque nom de son à trois
  sites d'appel au plus, sons ajoutés : palier de multiplicateur, coup sur le boss, vie basse (battement
  à 1 Hz), mur, téléportation, vol, absorption, tic d'apparition ; 32 bruitages en tout.
- **Pour SNAKE 2975.** Le module de jeu de la démo demande sept sons : c'est le « basique » à l'oreille.
  Un son par événement de jeu, distinct par classe (centroïdes écartés d'au moins 20 %), et la règle
  générative de DIRECTION (rien ne se répète à l'identique plus de deux fois) appliquée aussi aux
  bruitages fréquents.

### S4 — Aucun son perdu, et les rafales montent (G12, AV-7)

- **Constat.** La garde anti-saturation avalait 20 à 25 % des kills et 11 tirs sur 12 (fenêtre de
  90 ms).
- **Correction.** Un kill dans la fenêtre d'un autre ne rejoue pas le corps grave mais ajoute une note
  brève qui monte d'un demi-ton par kill de combo. **Livré** : 63 kills demandés, 63 joués en trois
  minutes.
- **Pour SNAKE 2975.** La hauteur qui monte avec la chaîne est acquise. Compter sons demandés et joués
  dans chaque test de partie : l'écart doit être nul.

### S5 — La musique suit vraiment l'action et démarre tout de suite (G12, AV-5, AV-16)

- **Constat.** L'« intensité » ne changeait le niveau que de 1,8 dB (couches synthétisées 11 à 25 dB sous
  la piste) ; corrélation intensité ↔ niveau de la musique : 0,09 en partie ; un pic de 18 ennemis de plus
  en 5 s faisait même baisser le niveau, qui suivait l'arrangement du MP3 ; chaque chargement rejouait
  15 s d'intro à −32 dB ; la seconde piste n'était presque jamais entendue.
- **Correction.** Gain de piste piloté par l'intensité, couches remixées, accent d'une mesure à chaque
  changement de phase, silence de 250 ms puis plein gain à l'entrée du boss, entrée dans le morceau à
  18 s ou sur l'autre piste, reprise calée sur la mesure. **Livré** : +8,0 dB entre calme et chaos.
- **Pour SNAKE 2975.** Le moteur génératif est la bonne réponse au défaut de fond : une piste figée ne
  peut pas suivre l'action. Reprendre les cibles mesurables : au moins +6 dB entre calme et chaos,
  corrélation intensité ↔ niveau d'au moins 0,5 sur trois minutes de partie, un pic de +4 dB en moins de
  300 ms à chaque changement de phase, une chute à l'entrée du boss, du son moins de 2 s après le geste.
  Si les morceaux de `SUNO.md` entrent, ils rapportent les défauts de 2030 (poids, intro, arrangement
  aveugle à l'action) : une couche au-dessus du moteur, jamais à sa place.

---

## P. Performance et robustesse

### P1 — Le coût est en pixels, pas en logique (G13, ROB-4, ROB-5)

- **Constat.** Le JavaScript ne coûtait qu'environ 1,2 ms par image, même avec 60 ennemis : tout le coût
  était dans le remplissage. En 1080p sur canevas logiciel, 94 à 96 % des images dépassaient 33 ms, et
  déjà 95,5 % sur une scène VIDE (le fond plein écran y suffisait) ; le même moteur à taille iPhone
  tenait 59-60 im/s. 106 à 433 dégradés alloués par image (butins, tirs ennemis) ; 100 ennemis = 2 600 à
  3 500 appels de canevas et 240 à 315 changements de mode de composition par image.
- **Correction.** Sprites pré-rendus posés par `drawImage` (0 dégradé par image contre 61 dans la même
  scène), butin fusionné, crans de résolution sous 1, palier « léger », fond rendu une fois.
- **Pour SNAKE 2975.** C'est la justification chiffrée du tampon basse résolution de DIRECTION (neuf fois
  moins de pixels sur iPhone). La parallaxe demandée est du remplissage plein écran, plan par plan :
  chaque plan pré-rendu une fois (en tuiles) et posé par `drawImage`, aucun dessin procédural par image,
  un budget d'appels par image mesuré comme `rp-calls.mjs`. Le critère reste celui de DIRECTION — p95 sous
  16,7 ms sur iPhone 13 paysage et meilleur que `snake2030` dans la même fenêtre — mais sur une scène
  chargée : ennemis, explosions et tous les plans.

### P2 — Une qualité qui ne clignote pas (G13, ROB-5)

- **Constat.** 20 changements de netteté en 5 min sur iPhone (un saut visible toutes les 15 s), alors que
  98,7 % des images étaient sous 33 ms.
- **Correction.** Baisse rapide, remontée seulement après 45 s saines et au plus une par 90 s, cran
  mémorisé par appareil. **Livré** : 4 changements en 300 s.
- **Pour SNAKE 2975.** La taille de pixel est entière et fixée par l'écran : pas de cran de résolution.
  Le repli porte sur le contenu (particules, plans de parallaxe, tramage), avec la même hystérésis lente
  et la même mémoire.

### P3 — Une horloge à pas fixe (G13, ROB-11)

- **Constat.** Le pas de temps plafonné à 50 ms faisait perdre 6,4 % du temps de jeu à 24 im/s (37 s en
  10 min), pendant que la musique restait en temps réel.
- **Correction.** Pas fixe de 1/120 s, au plus 4 pas par image, rattrapage borné à 33 ms, temps abandonné
  compté, déterminisme conservé.
- **Pour SNAKE 2975.** La démo est déjà rejouable à graine fixe : ajouter le pas fixe, pour que la même
  graine donne la même partie à 60 et à 30 im/s et que jeu et musique ne dérivent pas l'un de l'autre —
  indispensable si la musique suit l'action à la mesure près.

### P4 — Une exception ne gèle jamais le jeu (G1, ROB-1)

- **Constat.** Un appel sans paramètre sous brouillage levait une exception à chaque image (51 à 77 par
  2 s, 494 sur une partie de 10 min) : plus de rendu (0 sur 327 images), plus de collisions, plus de
  cartes, un serpent à l'aveugle et invulnérable — et toute mesure au-delà du niveau 3 en était faussée.
- **Correction.** Le bug, et surtout la quarantaine : chaque étape de la boucle protégée, une entité
  fautive retirée, l'erreur journalisée une fois par signature (`window.__ERR`), rendu et HUD exécutés
  quoi qu'il arrive ; une partie « dieu » de 10 min entre dans la batterie. **Livré** : 0 erreur de page
  sur 10 min ; une seule entrée au journal pour une entité qui lève à chaque image.
- **Pour SNAKE 2975.** La démo protège déjà ses appels entre modules. Ajouter la quarantaine par étape et
  par entité, `__ERR`, et une partie « dieu » qui traverse tous les niveaux de la campagne : en 2030, le
  défaut n'apparaissait qu'au niveau 3, après trois minutes de jeu.

### P5 — Hors ligne, installation, poids (ACC-9, ROB-3, ROB-8 ; non faits)

- **Constat.** Aucun service worker (page blanche hors ligne malgré un manifest installable), manifest
  sans icône, pas d'icône d'écran d'accueil iOS ; 9,9 Mo de MP3 et 15,5 s de retard de la musique après
  JOUER en 3G.
- **Pour SNAKE 2975.** Un seul fichier sans audio externe : déjà bien placé. Sur iPhone, « Sur l'écran
  d'accueil » donne le seul vrai plein écran : icônes et service worker sont à faire une fois pour
  toutes. Si des MP3 arrivent, ré-encodage léger et chargement en tâche de fond.

---

## M. Méthode

### M1 — Mesurer la sortie réelle, par le chemin que le jeu emprunte

- **Constat.** La question du gel d'image a changé deux fois de réponse. L'audit mesurait 0 image gelée ;
  le pilote de la chaîne a conclu « une image » en posant le gel entre deux images, depuis l'extérieur
  de la boucle ; l'implémenteur a rejoué le protocole de la spécification (pose depuis la mise à jour des
  armes, au milieu de l'image) sur le build d'avant : 0 image, l'audit avait raison. Ailleurs, une capture
  lue à une autre image que l'API a produit un faux écart de 104 px ; et le cinquième argument d'une
  fonction d'onde était une vitesse, pas un rayon : la « correction » demandée aurait réduit l'onde de
  520 à 152 u.
- **Principe.** Mesurer les pixels rendus, les images écoulées, le DOM réel ; relever l'API et le pixel
  dans la même image ; un protocole écrit fait partie du seuil ; « une lecture n'est pas une mesure, et un
  doute n'est pas un écart ».
- **Pour SNAKE 2975.** DIRECTION juge déjà « sur les pixels rendus, pas sur l'état interne » : appliquer
  cette règle à chaque leçon de ce document.

### M2 — Des pilotes automatiques de niveaux différents, à graine fixe

- **Constat.** Le mur et le plateau n'ont été vus que par la simulation : pilotes passif, bruité (±25°,
  4 décisions par seconde), esquive parfaite et « dieu » ; 30 832 apparitions, 1 192 coups attribués à
  leur source, 2 229 écrans de cartes. Les parties humaines courtes ne montraient que le mur.
- **Pour SNAKE 2975.** La démo a un pilote déterministe ; il en faut au moins trois de niveaux différents
  pour répondre à « trop facile » par des chiffres, et un journal des coups attribués (source, depuis
  quand elle est visible, partie du corps touchée).

### M3 — Une batterie de non-régression et des invariants vérifiés à chaque étape

- **Constat.** Chaque objectif a été validé par ses tests ET par la batterie rejouée (diagnostic de
  partie, son sur iOS, rails, banc d'essai). Les promesses faites à la joueuse (bouton et notice de plein
  écran sur iOS, manche tactile, zoom, musique en flux, réglages persistés, difficulté par défaut) sont
  devenues des tests : « une vérification qui dépend de quelqu'un qui pense à la faire est un rappel, pas
  une vérification ». Le banc d'essai a dû être réparé deux fois (un p95 pris dans une seule série de 300
  images donnait un faux écart de 1,217 à build identique ; la dispersion restante, environ 13 % pour
  15 % de tolérance, a conduit G13 à calculer le p95 sur la réunion des 2 400 images d'un côté) ; deux
  mesures lancées ensemble se polluent ; le banc compare désormais le build courant au précédent, dans la
  même fenêtre, scène figée.
- **Reste.** Toutes les mesures « iPhone » de 2030 sont des émulations Chromium : Firefox et WebKit, le
  moteur de Safari, n'ont jamais pu être installés.
- **Pour SNAKE 2975.** Écrire dès la première étape les invariants de la joueuse de SNAKE 2975 (gros
  pixels réels, palette fermée, cyan réservé, 60 im/s sur iPhone 13, son malgré l'interrupteur
  silencieux, coupure du son mémorisée, manche flottant, pause en arrière-plan, rien de perdu sur
  iPhone) comme tests rejoués à chaque objectif, avec un banc apparié (build courant contre build
  précédent dans la même fenêtre, scène figée) et une seule mesure à la fois sur machine calme. Prévoir
  une vérification sous WebKit ou sur un vrai iPhone : Safari est le jeu de la propriétaire.

### M4 — Ne jamais affaiblir un seuil ; l'audit lui-même se trompe

- **Constat.** La relecture des spécifications de la vague 3 a trouvé douze pièges bloquants sur 81
  points : le boss du niveau 1 avait 84 PV et non 36 (l'audit se contredit d'une section à l'autre) ; un
  contour à +60 de luminance était impossible sur un cœur déjà à 224 ; la palette prescrite échouait à
  son propre test ; `S.level` désignait le secteur et `S.t` l'horloge de la page ; « au plus un coup de
  trancheur, au moins 38 anneaux » alors qu'un coup en coûte deux, ce qui a coûté trois tentatives ;
  « 7 ennemis sur 11 dans 34° » étaient 6. Les seuils démontrés impossibles ont été réécrits avec leur
  démonstration, jamais abaissés en silence ; un seuil absolu supprimé par un correcteur a été rétabli ;
  trois seuils tombés de G7 sont rapportés tels quels.
- **Pour SNAKE 2975.** Avant de reprendre un chiffre de ce document, relancer son instrument sur le build
  courant ; vérifier par le calcul les prémisses de chaque spécification avant d'implémenter ; versionner
  spécifications et instruments ; rapporter un échec avec sa valeur mesurée.

---

## Ce qui reste de SNAKE 2030

Les objectifs G1 à G14 sont tous livrés. Ce qui suit n'a jamais été fait : les propositions que le
médiateur a renvoyées en « phase 2 », puis les réserves laissées par les livraisons. Pour la refonte,
c'est à la fois une liste de pièges connus et le gisement des idées « en mieux ».

### Propositions jamais réalisées

| Idée (audit) | Raison du report en 2030 | Pour SNAKE 2975 |
|---|---|---|
| Boss chorégraphiés à trois phases (ENN-2) | effort 5, après G9 | **Prioritaire** : le contenu qui manquait le plus (C5) |
| Vagues écrites, formations nommées, silences (ENN-12) | dépendait de G6 et G9 | **Prioritaire** : le rythme d'un niveau (C3) |
| Mort mise en scène (AV-9) | finition | **Prioritaire** : demande de la propriétaire (D5) |
| Caméra vers l'intention, zoom piloté par le jeu (FEEL-12) | finition sans preuve de coups causés | **Prioritaire** avec un monde qui défile (A3) |
| Mécaniques d'arène qui pèsent : convois et sillage, champ qui capture et propulse, treillis Tron, bascule compensée (ENN-7, ENN-8, ENN-9, ENN-10) | niveau 3 rarement atteint, dépendances | Une règle par chapitre, chacune mesurée (C6) |
| Événements d'arène annoncés (ENN-14) | contenu de phase 2 | Un par chapitre de campagne (C6) |
| Bestiaire à rôles : SENTINELLE, FAUCHEUR, mods MAGNÉTIQUE et SPECTRAL (ENN-13) | contenu, après G11 | Étendre les quatre ennemis de la démo par rôles (C7) |
| Codex des menaces à la première rencontre, trophées de boss (ENN-15) | dépendait d'ENN-2 et de la méta | Apprentissage par le jeu, méta de campagne |
| Pitié de rareté, écoles de build, rééquilibrage des cartes (PROG-6, PROG-7, PROG-8) | dépendait de la cadence de G7 | Si les cartes reviennent, les écrire ainsi d'emblée (C8) |
| Méta de contenu, missions, défi du jour (PROG-13) | effort 5 | La campagne en tient lieu ; défi du jour à graine du jour |
| HUD de progression lisible (PROG-15) | après G10 | Avec la campagne |
| Décor au tempo (AV-18) | coût de remplissage | Plans de parallaxe et grille calés sur le temps fort, pré-rendus (P1) |
| Occlusion tactile : caméra décalée, contrôles qui s'effacent, HUD latéral (AV-14) | à remesurer | À mesurer avec la caméra qui suit (E4) |
| Identité typographique et logo (AV-13) | identité, pas jouabilité | Fait par 2975 (police 5×7, logo) |
| Recul des ennemis touchés, fil d'aimantation du butin (FEEL-7, FEEL-9) | trajectoires sur rails, budget d'appels | Options d'impact |
| Tutoriel scénarisé de 45 s (ACC-1) | couvert par G7, G4, G8 et G14 | D'abord les signaux « prêt » et un premier niveau qui apprend (C1, D3) |
| Manette, remappage des touches (DESK-6, DESK-9) | après clavier et souris | Manette peu chère (A5) |
| Sauvegarde continue, hors ligne, installation, musique allégée (ROB-2, ROB-3, ACC-9, ROB-8) | ne changeait pas la jouabilité | Icônes et service worker une fois pour toutes (P5) |
| Partage du score et aperçus de lien (ACC-8) | hors jouabilité | Sur l'écran de fin |
| Version anglaise (ACC-12) | environ 250 chaînes en dur dans 7 modules | Une table de chaînes dès le départ coûte moins cher |
| Tables de substitution daltoniennes (ACC-11) | seulement si la palette robuste ne suffisait pas | Mesurer d'abord la palette fermée (E1) |
| Mode démonstration derrière le menu, compte à rebours à la reprise (ACC-13, ACC-14) | rendu permanent ; contredisait la reprise immédiate | Options |
| Dessin des ennemis par couches (ROB-6) | seulement si le coût d'image restait trop haut | À mesurer : la palette opaque change la donne |

### Réserves laissées par les livraisons

- **G7** : première carte à 22,3 s et non à 12-15 s ; trois seuils tombés, démontrés non discriminants ou
  contradictoires, rapportés tels quels.
- **G9** : le boss naît hors champ (arbitrage : la garantie de G6 passe avant la mise en scène).
- **G11** : le test « une seule tache blanche, autour de la tête » n'est pas tenu (8 composantes non
  attribuées sur 320 images).
- **G6** : chevrons, portails et marqueurs coûtent 3 à 7 % de temps d'image.
- **G1** : partie iPhone non strictement déterministe ; batterie bureau sans limiteur de cadence.
- **Banc d'essai** : avant G13, dispersion du p95 iPhone d'environ 13 % pour 15 % de tolérance sur le
  régime le plus chargé ; G13 a changé le calcul (réunion des séries), sans mesure publiée de la
  dispersion nouvelle. Un rapport proche du seuil se relit plutôt qu'il ne se croit.
- **Plateformes** : aucune mesure sous Firefox ni sous WebKit.

---

## Les principes à ne jamais perdre

1. Le serpent répond en une image, partout ; toute contrainte de trajectoire montre ce qu'elle fera de
   l'entrée.
2. Rien ne naît, ne s'arme ni ne tire hors du champ ; tout ce qui tue s'annonce à l'endroit de ses
   dégâts, au moins 0,6 s avant, et la difficulté ne raccourcit jamais l'annonce.
3. On ne meurt que de ce qu'on a vu — et on peut vraiment mourir.
4. La caméra ne cache jamais la tête ni ce qui arrive devant, et ne bouge jamais au hasard.
5. Le cyan n'appartient qu'à la joueuse ; chaque menace garde son contour sombre ; aucune entité sous le
   plancher de taille.
6. Une voix à la fois ; un mot pour une seule chose ; un texte de carte décrit l'effet mesuré.
7. Les sons d'information passent au-dessus de la musique, s'entendent sur un haut-parleur de
   téléphone, et aucun ne se perd ; la musique suit l'action d'au moins 6 dB.
8. L'impact se compte en images ; flashs, secousses et bannières ont un budget.
9. Chaque mécanique, carte, ennemi ou boss change la façon de jouer, mesurée, ou il sort.
10. L'écran de fin dit qui a tué et quelle est la prochaine marche ; le record ne ment pas.
11. Rien de ce qu'on fait pour le bureau ne retire quoi que ce soit à l'iPhone.
12. Le coût est en pixels : aucune allocation par image ; une exception ne gèle jamais la boucle ; zéro
    erreur.
13. On mesure la sortie réelle, par le chemin du jeu, à chaque étape, et on n'affaiblit jamais un seuil.

---

## Les dix leçons les plus importantes, classées

Classement fait pour la refonte, à la lumière des quatre retours de la propriétaire.

### 1. Une mort juste avant une mort fréquente (B1, B2, B3, A3)

La propriétaire veut une vraie mort et un monde plus grand que l'écran ; l'audit de 2030 pose qu'une
courbe de difficulté reste illisible tant qu'on meurt de ce qu'on ne voit pas. **Chiffres** : 17 à 29 %
d'apparitions dans le champ, 37 à 76 % d'armements hors champ, 52 % des coups venus de balles
d'artilleur souvent tirées hors champ dans un corps long ; après G6, 0 % d'apparitions dans le champ,
0 % d'annonces hors champ et 15,6 % de coups par balle. **À faire** : apparitions et armement calculés à
chaque image sur l'étendue affichée, portails de 600 ms, annonces d'au moins 0,6 s jamais raccourcies,
au moins 95 % des morts avec une source visible depuis 600 ms — puis retirer les protections excessives
de la démo (corps qui absorbe tout, trois vies, deux secondes d'invulnérabilité, murs qui font glisser).

### 2. Une difficulté qui monte vraiment, réglée par des pilotes et non à l'impression (C1, C2, B4, M2)

**Chiffres** : 7 parties réelles sur 7 mortes au niveau 1, puis 100 % des pilotes d'esquive au plafond
de 10 min ; après G9, 0 % au plafond et une survie médiane de 488 s ; un bouclier ×3 suffisait à ne plus
jamais être touché. **À faire** : des cibles par niveau écrites avant le réglage, trois pilotes (passif,
bruité, parfait), toutes les protections plafonnées, aucune stratégie dégénérée gagnante, et une
première minute de niveau qui apprend avant de tuer.

### 3. Ne reprendre une idée de 2030 qu'avec la règle qui la fait peser (C5, C6, C7, C8)

Le « en mieux » est là : en 2030, beaucoup d'idées étaient du décor. **Chiffres** : champ magnétique à
10° contre 264° par seconde de contrôle ; treillis à +28 % de coups et −25 % de kills sans règle
nouvelle ; bascule 3D à +21 % de coups ; 40 cartes sur 53 sans effet mesurable ; 7 ennemis sur 11 qui
foncent ; des boss qui infligeaient 5 % des coups de leur combat et se « gagnaient » au chronomètre.
**À faire** : chaque mécanique avec une règle, un gain et un test ; les spécifications ENN-2, ENN-7,
ENN-8, ENN-9, ENN-12, ENN-13 et ENN-14, jamais construites, sont prêtes à être réécrites.

### 4. Avec un monde qui défile, la caméra est un mécanisme de jeu (A3, A4, E3, E4)

**Chiffres** : tête hors écran sur 21 % des images en bascule 3D (0 % après G5) ; une vue plus petite
sur bureau donnait plus d'attaques hors champ ; un dézoom réduisait les tirs à 2,5 px ; 62 % des images
avaient un ennemi sous le pouce ou sous le HUD. **À faire** : tête bornée dans la zone sûre, avance de
caméra vers le cap, échelle constante, un seul plan de jeu sous les plans de parallaxe, un champ de
vision borné identique d'un écran à l'autre, un défilement au pixel de jeu entier.

### 5. Le boss, les moments forts et la mort sont des événements mis en scène (C5, D3, D5, C9)

**Chiffres** : un boss tué en 4 s ou gagné par le temps, un ultime jamais utilisé faute de signal, une
montée de niveau réduite à un son, une mort en gel sec ; après G9, des combats de boss de 35 à 44 s en
médiane où le boss inflige 27,6 % des coups. **À faire** : un colosse à phases et à attaques propres ;
chaque moment fort avec son son, son signal et sa place dans la file ; une mort mise en scène (AV-9,
jamais faite) suivie d'un écran de fin qui dit qui a tué (`hitLog` existe, l'écran ne l'affiche pas).

### 6. L'impact se compte en images et se rationne (D1, D2, D4)

**Chiffres** : un gel de 12 ms ne gelait rien ; 120 flashs plein écran et 30 % d'images secouées en
5 min ; une blessure lue comme un flash rouge plein écran ; après G8, 2, 5, 4 et 8 images de gel, un
flash plein écran toutes les 4 s au plus, une vignette du côté du coup. **À faire** : la démo compte déjà
en images et limite les flashs ; donner à la mort le gel le plus long (il est aujourd'hui égal à celui
d'un coup ordinaire), un budget de secousse face aux « explosions énormes », et brancher le recul de
caméra.

### 7. Lisible d'abord : couleur réservée, contour sombre, taille plancher, une voix à la fois (E1, E2, E3, E6)

**Chiffres** : 28 paires de couleurs de rôles différents identiques, un contraste rendu sous 3:1 la
moitié du temps, des textes de 7 px, quatre bannières en 22 s ; même la palette corrective échouait à
son propre test. **À faire** : la palette fermée recrée le piège des couleurs chaudes — magenta et
brasier à 1,14:1 de contraste (ΔE 2,6 en tritanopie), ambre et brasier confondus en deutéranopie, cyan
et rose pâle en protanopie — donc contours, formes, et tests sur les captures rendues.

### 8. Le son informe d'abord, la musique suit vraiment l'action (S1 à S5)

**Chiffres** : tir du joueur à −29 dBFS sous une musique à −20, 11 sons sur 22 muets sur un téléphone,
le tir ennemi identique à celui du joueur, 20 à 25 % des kills sans son, une musique qui ne montait que
de 1,8 dB (corrélation 0,09) ; après G12, cibles tenues à ±2 dB, 63 kills sur 63 entendus, +8 dB entre
calme et chaos. **À faire** : le moteur génératif est la bonne base ; lui écrire ces cibles mesurables
et passer de sept sons à un son par événement.

### 9. Le coût est en pixels, et la boucle ne doit jamais geler (P1, P3, P4, A6)

**Chiffres** : 1,2 ms de JavaScript par image, mais une scène vide déjà à 95,5 % d'images longues en
1080p logiciel ; 106 à 433 dégradés alloués par image ; une seule exception a gelé le rendu au niveau 3
(494 en 10 min) ; l'horloge dérivait de 6,4 %. **À faire** : le tampon basse résolution est le bon pari ;
plans de parallaxe pré-rendus, aucune allocation par image, pas de temps fixe, quarantaine de la boucle,
et 60 im/s mesurées sur iPhone avec la scène la plus chargée.

### 10. Mesurer la sortie réelle, par le chemin du jeu, à chaque étape, sans jamais affaiblir un seuil (M1 à M4)

**Chiffres** : deux revirements sur le gel d'image, un faux écart de 104 px, douze pièges bloquants
dans les spécifications (dont un boss à 84 PV et non 36 et une palette qui échouait à son propre test),
un banc d'essai réparé deux fois, et aucune mesure sous WebKit. **À faire** : les invariants de la
joueuse de 2975 en tests dès la première étape, trois pilotes à graine fixe, une batterie et un banc
apparié rejoués à chaque objectif, les instruments relancés avant de citer un chiffre, et une
vérification sous Safari.
