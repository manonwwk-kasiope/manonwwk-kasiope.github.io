# Inventaire SNAKE 2030 — les ennemis et les niveaux, pour la refonte de SNAKE 2975

*Inventaire du 17 octobre 2026. Domaine : `snake2030/src/22-enemies.js` (2 252 lignes) et
`snake2030/src/25-levels.js` (2 235 lignes), lus en entier.*

**Lu en appui**, pour les chiffres que ces deux fichiers consomment sans les définir : `10-core.js`
(`spawnEnemy`, `damageEnemy`, `hurtSnake`, `collide`, `killEnemy`, `diffMul`, constantes `K`),
`90-boot.js` (`simStep`, `updateEnemies`, `openCards`), `26-ui.js` (marqueurs hors champ, jauge de boss,
« Détruit par »), `27-phases.js` (treillis), `23-weapons.js` (brouillage), et la section « Ennemis, boss et
niveaux » de `snake2030/docs/audit-2026-09.md`. **Côté SNAKE 2975** : `refonte/RETOURS-PROPRIETAIRE.md`,
`DIRECTION.md`, `CONTRAT.md`, `src/70-game.js` (lu en entier), `src/60-intro.js`, l'en-tête de
`src/40-sprites.js`, `recherche/game-design-campagne.md` (lu en entier), les exigences de
`recherche/jouabilite-mobile.md` et de `recherche/visuel-technique-mobile.md`, et trois captures de
`refonte/captures/` (b-17, d-09, d-10). L'inventaire voisin `refonte/inventaire-coeur.md` recoupe ce
domaine dans ses fiches C3, J1 à J3, K1 et K2 : je ne les répète pas, je les détaille côté ennemis et
niveaux.

**Statut des chiffres.** *code* : lu dans le code. *calcul* : dérivé des formules du code (montré en
annexe B), au cran NORMAL (multiplicateur 1,55, le cran par défaut) sauf mention. *audit* : mesure publiée
dans `docs/audit-2026-09.md`, souvent ANTÉRIEURE aux corrections G6 et G9 (je le précise chaque fois).
*proposé* : proposition de conception sans source, à régler au banc d'essai.

**Conventions.** « u » = unité monde de SNAKE 2030 ; « px » = pixel de jeu de SNAKE 2975. Chaque idée est
numérotée I-01 à I-59 et suit le même plan : **Quoi** · **Chiffres** · **Pourquoi c'est bien** ·
**Défauts** · **En mieux dans 2975**.

---

## 0. L'essentiel

1. SNAKE 2030 a 11 ennemis aux règles distinctes, 6 modificateurs d'élite, 4 boss, 4 secteurs (trois arènes
   à mécanique propre, puis une SURCHARGE sans fin à cycles), 5 phases par secteur, 7 motifs d'apparition,
   des portails de 600 ms, 5 crans de difficulté et un directeur de difficulté par secteur.
2. Son meilleur : des ennemis qui jouent avec ce qu'est un serpent. Son **corps** (le trancheur le coupe,
   le parasite s'y accroche, les balles y meurent), sa **trajectoire** (le miroir la rejoue 1,5 s plus tard),
   son **butin** (le voleur le prend). Et une règle d'or tenue partout : rien ne frappe sans annonce, rien
   n'arme hors de l'écran, rien ne naît sans portail.
3. Ses défauts mesurés (audit) : 73 % des apparitions sont trois fonceurs interchangeables (larve, traqueur,
   intercepteur), et les ennemis originaux pèsent moins de 2 % chacun. Les boss sont des élites renommées
   sans attaque propre (avant correction, 5 % des coups d'un climax venaient du boss). Les mécaniques
   d'arène sont des décors : le champ magnétique pèse 10 % du contrôle. Le calme n'est pas calme. Et la
   difficulté monte surtout par l'inflation des points de vie (× 2,6 par secteur).
4. Quatre défauts de code se voient à la lecture (annexe A) : l'alerte rouge est inversée sur trois
   télégraphes ; le liseré d'enragement du boss est dessiné hors de place ; le modificateur RAPIDE ramène
   des annonces à 312 et 360 ms (270 ms pour le boss DOUBLE LAME enragé) ; la ligne de bond du traqueur est
   deux fois plus longue que le bond.
5. La démo 2975 n'a ni élite, ni modificateur, ni phase, ni secteur, ni règle d'arène, ni portail annoncé,
   ni ennemi « systémique ». Elle a un seul boss à trois attaques. Elle fait pourtant mieux que 2030 sur
   trois points : un vrai gros ennemi (49 px, trois attaques télégraphiées, interlude d'alerte), un flash
   de coup sur la silhouette elle-même, une purge finale en chaîne.
6. La recette proposée tient en une ligne : un chapitre = une famille d'ennemis à rôles distincts + une
   règle d'arène + un boss chorégraphié qui emploie les deux. Le rythme suit montée, pic, respiration,
   apogée, purge. Les élites sont rares et nommées. Les familles se lisent à la FORME, puisque la palette
   fermée interdit les couleurs de famille. La pression vient du contenu et de la densité, pas de
   l'inflation des PV.

## 1. Ce que les retours de la propriétaire changent pour ce domaine

`refonte/RETOURS-PROPRIETAIRE.md` fait autorité sur toute la refonte, avant la recherche et avant la démo.
Ses quatre points, lus pour les ennemis et les niveaux :

1. **« Triste, basique. »** La démo a 4 ennemis simples, 1 boss, aucune élite, aucune phase, aucun
   secteur, aucune règle d'arène. Tout cela existe dans 2030 (sections 3 à 6).
2. **« Trop facile. »** La démo bride ses ennemis : deux flèches en charge au plus, aucune charge avant
   25 s, des mines qui attendent 15 s avant de s'armer seules, et un choc qui fait reculer et taire pendant
   0,7 s tout ce qui entoure la tête (`hurt`, 70-game.js). 2030 montre comment monter la pression : densité
   (plafonds de 14 à 70 par vague), cadence (intervalles × 0,69 au cran NORMAL), élites, modificateurs, ennemis qui
   prédisent ou qui coupent, directeur par secteur. Mais sa montée passe trop par les PV : en mieux, la
   faire monter par le contenu et la densité (section 7).
3. **« Un monde plus grand que l'écran, une caméra, des parallaxes. »** C'est la fin de l'arène égale à
   l'écran. Toute la boîte à outils « hors champ » de 2030 redevient nécessaire, et elle est mûre : armer
   seulement à l'écran, portails de 600 ms, vue anticipée, marqueurs au bord, arrivée pilotée du boss (I-02,
   I-28, I-40, I-41). Les mécaniques d'arène de 2030, pensées pour une arène de 2,0 × 2,7 écrans, se
   transposent alors presque telles quelles (section 9).
4. **« Il faut pouvoir mourir. »** La démo protège trop : le corps absorbe tous les tirs, il y a 3 vies et
   2 s d'invulnérabilité. Côté ennemis, cela demande des coups qui comptent. Je propose que chaque attaque
   dise par son télégraphe si elle vise la TÊTE (mortelle) ou le CORPS (qui se coupe au point touché),
   dans l'esprit du crochet d'impact de l'artilleur et de la coupe du trancheur (I-06). Cette règle est à
   arbitrer avec les fiches C1 à C5 de l'inventaire du cœur.

---

## 2. Les règles transversales du bestiaire (I-01 à I-08)

### I-01 · La règle d'or : tout ce qui tue s'annonce

- **Quoi.** En tête de `22-enemies.js` : « le joueur doit toujours comprendre pourquoi il meurt. Tout ce
  qui va tuer se télégraphie une demi-seconde avant. » Chaque attaque a un état d'armement à part, dessiné
  à l'endroit exact du coup. À plus de 300 ms de l'impact, le télégraphe porte la couleur de la famille de
  l'ennemi : il dit QUI prépare le coup. Dans les 300 dernières ms, il passe au rouge d'alerte `#ff2b2b` :
  il dit QUAND (`_enNear`, l. 1225-1228).
- **Chiffres (code).**

| Attaque | Annonce | Forme du télégraphe |
|---|---|---|
| bond du traqueur | 470 ms | ligne qui s'allonge jusqu'à 174 u ; l'ennemi se fige et gonfle jusqu'à × 1,3 |
| fuseau de l'intercepteur | 520 ms | ligne vers un point GELÉ et losange qui se resserre de 26 à 14 u |
| mine | cercle d'armement de 132 u toujours affiché, puis mèche de 800 ms | disque de souffle qui se remplit jusqu'à 140 u ; bips de 280 à 60 ms |
| tir d'artilleur | 950 ms | couloir tracé sur la portée réelle (506 u) et crochet d'impact sur le corps |
| traversée du trancheur | 600 ms | laser qui s'allonge de 260 à 1 160 u, bande claire, recul d'élan |
| nichée de la pondeuse | 640 ms au moins, portail de couvée à 600 ms | pétales qui s'ouvrent, cœur qui blanchit, anneau |
| morsure du parasite | 900 ms | anneau qui se resserre sur la bête accrochée |
| saut du modificateur SAUTEUR | 520 ms | losange de destination et pointillé |
| entrée d'un boss | 1 400 ms | chevron triple de 40 px au bord, qui clignote de 3 à 12 Hz |

- **Pourquoi c'est bien.** Un coup reçu devient une erreur qu'on comprend, et l'on apprend un ennemi en le
  lisant. La recherche en a fait l'exigence G-13 (500 ms, 800 ms pour le gros ennemi).
- **Défauts.**
  - Le modificateur RAPIDE multiplie par 0,6 l'annonce de l'intercepteur (312 ms, l. 660) et celle du
    trancheur (360 ms, l. 815). L'enragement du boss la multiplie encore par 0,75 : le boss DOUBLE LAME
    (deux trancheurs rapides) charge avec 360 ms d'annonce, puis 270 ms enragé (calcul).
  - Le traqueur n'annonce que 470 ms, sous les 500 ms de G-13.
  - L'alerte rouge est inversée pour le traqueur, l'intercepteur et la mine : elle s'allume au DÉBUT de
    l'armement au lieu de la fin (annexe A).
  - La ligne du traqueur promet 174 u pour un bond qui en parcourt environ 88 (calcul : 109,7 u/s × 2,1 ×
    0,38 s au cran NORMAL). Le télégraphe ment sur la portée.
  - Le rose des fonceurs (`#ff2e63`) et le rouge d'alerte (`#ff2b2b`) sont presque la même teinte : le
    passage « qui » → « quand » se voit mal.
- **En mieux dans 2975.**
  - Une table unique des annonces : 500 ms au moins pour tout ennemi, 800 ms pour le colosse (G-13). Aucun
    modificateur ne raccourcit une annonce : RAPIDE accélère l'attaque et la recharge, jamais l'annonce.
  - Le télégraphe dessine exactement la zone qui tue : la ligne a la longueur réelle du bond, le disque le
    rayon réel du souffle.
  - Deux temps lisibles sans couleur nouvelle, avec le vocabulaire que la démo emploie déjà (`teleLine`,
    `spawnMark`, disque tramé). D'abord du magenta en pointillés qui courent (qui, où). Puis, dans les
    300 dernières ms, du rose pâle plein (quand). Toujours une gaine d'un pixel de nuit profonde. Pas plus
    de 3 clignotements par seconde sur une grande surface (V-20).
  - Un son d'armement par type, comme 2030 (`boost` pour le bond, `zap` pour le fuseau, `click` pour la
    visée et la mèche, `laser` pour la traversée, `spawnTick` pour la couvée). Chaque son a son signe
    visuel, pour jouer sans le son (G-35).

### I-02 · Armer seulement sous les yeux de la joueuse

- **Quoi.** `_enShown` : une attaque ne s'arme que si l'ennemi est à 40 u À L'INTÉRIEUR du cadre ; sinon
  il continue d'approcher. S'il sort du cadre pendant l'armement, il gagne une seule rallonge de 300 ms
  (`holdX`), et un chevron de 22 px clignote à 6 Hz sur le bord, à l'intersection de la ligne d'attaque et
  du cadre (chevron double pour une élite). Un artilleur encore hors champ au moment du tir annule sa salve
  et repart en recharge. Les boss, les élites et les mines amorcées gardent un marqueur au bord de l'écran
  (`ui.offscreen` : 20 px du bord, 12 marqueurs au plus, boss d'abord, taille 11 000 / distance bornée de 8
  à 26 px).
- **Chiffres (audit, AVANT cette règle).** 37 à 76 % des charges de trancheur et 37 à 62 % des visées
  d'artilleur commençaient hors champ. 52 % de tous les coups étaient des balles d'artilleur. 38 coups de
  trancheur sur 199 venaient d'une source jamais vue.
- **Pourquoi c'est bien.** On ne meurt plus de ce qu'on ne voit pas. C'est la condition pour qu'une
  difficulté forte reste juste.
- **Défauts.** La règle a été ajoutée après coup, sur une caméra qui zoome, bascule et roule, d'où beaucoup
  de code de rattrapage (marges, cliquets, passes tardives). Sur bureau, la vue était plus étroite que sur
  iPhone (961 u contre 1 316 u de large) et produisait davantage d'attaques hors champ (audit).
- **En mieux dans 2975.** Le retour n° 3 (un monde plus grand que l'écran) rend cette règle indispensable
  dès le départ, avec une caméra plus simple (sans bascule 3D). La poser dans le contrat des ennemis :
  « un ennemi n'arme que s'il est entièrement dans la vue, à 6 px du bord ». Garder la rallonge de 300 ms
  et le chevron de bord (une flèche de 7 px qui porte la mini-silhouette du type et clignote à 3 Hz). Garder
  les marqueurs permanents pour le colosse, les élites et les mines armées.

### I-03 · Silhouettes pleines à liseré, familles de teinte, blanc réservé

- **Quoi.** `_enShell` remplit la silhouette avec la couleur de la famille à 88 % (éclaircie juste assez
  pour atteindre 0,20 de luminance), pose un voile sombre à 25 % et un liseré de 2 px presque noir, puis un
  trait néon (nappe additive et cœur clair). Quatre familles de teinte :
  - **rose-rouge `#ff2e63`** pour ceux qui foncent ou qui coupent : traqueur, intercepteur, trancheur, larve ;
  - **orange `#ff6a00`** pour ce qui explose ou qui tire : mine, artilleur, et tous les projectiles ennemis ;
  - **violet `#8a4dff`** pour ceux qui dérèglent : pondeuse, parasite, brouilleur, voleur ;
  - **chrome `#ffc3af`** pour le miroir.

  Le blanc pur est réservé à la tête du serpent : les reflets « chauds » des ennemis passent en rose très
  clair `#ffdce4`, et aucune couleur ennemie ne dépasse 232 sur les trois canaux. Sur un écran de moins de
  480 px CSS de haut, la silhouette est agrandie × 1,15, sans toucher aux collisions ni aux portées.
- **Pourquoi c'est bien.** On reconnaît le rôle d'un ennemi avant de voir ses détails, et le danger se lit
  d'un coup d'œil.
- **Défauts.** C'est la couleur qui porte l'information, ce que V-10 interdit (jamais la couleur seule). Le
  rose des fonceurs est presque le rouge d'alerte.
- **En mieux dans 2975.** La palette fermée interdit les teintes de famille : tout ce qui blesse est
  magenta, rose pâle ou sang (G-12). La famille passe donc dans la FORME, avec un langage stable *(proposé)* :
  - **pointes et triangles** pour les fonceurs (flèche, dard, lame, larve) ;
  - **blocs à canon** pour les tireurs (tourelle, sentinelle) ;
  - **rondeurs, pattes, pétales** pour les perturbateurs (ruche, tique, brouilleur, voleur) ;
  - **la tête de la joueuse en négatif** pour le miroir (magenta et sang, yeux de nuit profonde).

  Un contour d'un pixel de nuit profonde partout (DIRECTION.md). Test V-10 : sur des captures passées en
  niveaux de gris, une personne qui ne connaît pas le jeu classe tous les ennemis.

### I-04 · Retour de coup et arc de vie

- **Quoi.** Un ennemi touché garde un compteur de 90 ms (`hitT`) : un disque rose très clair opaque le
  couvre tant qu'il reste plus de 60 ms, puis fond en 30 ms. Quatre types portent un arc de vie de
  1,86 rad (artilleur, pondeuse, brouilleur, miroir), qui vire au rouge sous 34 % et ne s'affiche qu'une
  fois la cible entamée.
- **Pourquoi c'est bien.** On voit ce qu'on touche, et une grosse cible montre ses progrès.
- **Défauts.** Le flash est un disque, pas la silhouette. L'arc ne concerne que quatre types.
- **En mieux dans 2975.** La démo fait déjà mieux : son flash pose la silhouette elle-même en os en gardant
  le contour (`inner(s)`), avec un limiteur de 0,34 s par objet. Ajouter à toute cible de 4 PV et plus un
  arc d'un pixel qui se vide, comme celui du colosse (`drawEnemy`). Ajouter aux élites une variante de
  sprite « fêlée » à mi-vie.

### I-05 · Projectiles d'une seule couleur, et signés

- **Quoi.** Tous les projectiles ennemis sont orange (`_EN_EBULL`, « jamais autre »). Chaque balle emporte
  l'identité de son tireur (`owner`, `ownerName`, `ownerElite`). L'écran de fin dit donc « Détruit par
  ARTILLEUR D'ÉLITE — niveau 2 — 63 % du secteur — 1:42 ». Les dangers d'arène signent aussi : « UN
  CONVOI », « UN NŒUD ».
- **Pourquoi c'est bien.** La mort s'explique, et l'on sait quoi apprendre.
- **En mieux dans 2975.** La démo note déjà le coupable de chaque coup (`stats.hitLog`, champ `par`) sans
  l'afficher. Écrire « DÉTRUIT PAR LA TOURELLE » en police 5 × 7 sur l'écran de fin, avec la silhouette du
  coupable (G-03). Avec une vraie mort (retour n° 4), c'est ce qui la rend juste.

### I-06 · La tête, le corps, et le crochet d'impact

- **Quoi.** Règle du cœur (`collide`, 10-core.js) que les ennemis exploitent. Une balle qui touche la tête
  ou l'un des 8 premiers anneaux blesse. Au-delà, elle est absorbée : aucun dégât, aucune invulnérabilité,
  aucun combo perdu, +1 d'énergie de boost. Un ennemi ne blesse au contact que s'il touche la tête.
  L'artilleur pose un **crochet** (quatre traits) sur le point d'impact prédit de sa balle, recalculé toutes
  les 60 ms. Ce crochet est rouge si la balle atteindra la tête ou les 8 premiers anneaux (`hkHot`), orange
  si le corps l'absorbera.
- **Pourquoi c'est bien.** La longueur devient un bouclier qu'on place. Le crochet rend ce placement
  visible : on voit à l'avance si un tir est dangereux.
- **Défauts.**
  - La frontière du 8e anneau ne se voit pas.
  - Les règles diffèrent selon l'attaque : la lame, les souffles (mine, INSTABLE) et le convoi frappent tout
    le corps ; les balles seulement la tête et 8 anneaux ; le contact seulement la tête.
  - Un serpent long ne peut pas sortir 450 u de corps d'un souffle de 140 u en 0,8 s : la mine le punit
    toujours.
  - Le retour n° 4 range « le corps absorbe les tirs » parmi les protections de trop. La démo absorbe dès
    le 2e segment : c'est plus généreux encore que 2030.
- **En mieux dans 2975.** Une règle unique, écrite à l'écran au premier chapitre *(proposé, à arbitrer avec
  l'inventaire du cœur)* :
  - **TÊTE = mortelle.** Ce qui la touche tue, ou coûte très cher selon le modèle de vie retenu.
  - **CORPS = coupé.** Balle, lame, souffle ou morsure sectionne le serpent au segment touché. La queue
    détachée retombe en cellules d'énergie qui clignotent 3 s : on peut en reprendre une partie, comme le
    choc de la démo laisse tomber une cellule sur deux.

  Le crochet est généralisé à toute attaque à trajectoire (balle, fuseau, lame) : un losange de 5 px sur le
  point d'impact prévu, rose pâle s'il touchera la tête, magenta gainé de nuit s'il touchera le corps. La
  longueur reste précieuse, puisqu'elle fait la puissance de feu dans la démo (1, 2, 3 puis 5 canons) :
  être coupé fait peur sans être injuste.

### I-07 · Explosions en chaîne et tir ami

- **Quoi.** `_enBlast` pose un anneau, une gerbe, un halo et une secousse (0,06 × rayon, bornée de 2 à 14).
  Il inflige aux ENNEMIS `dmg × 9 × (0,4 + 0,6 f)` PV, soit 18 PV au centre d'une mine et 7,2 au bord. Les
  explosions s'enchaînent jusqu'à une profondeur de 3. La mine, le modificateur INSTABLE et les convois
  blessent aussi les ennemis : un convoi broie ce qu'il traverse (9 PV + 2 par cycle, 8 fois par seconde).
- **Pourquoi c'est bien.** Le décor et les ennemis se retournent contre les ennemis : on attire une meute
  sur un champ de mines, on abat l'INSTABLE au milieu de la foule. C'est du spectacle ET de la tactique.
- **Défauts.** Le même souffle blesse le serpent, corps compris. Une mine endormie qu'on abat fait encore un
  pétard de 105 u qui coûte 1 segment : la mort d'un ennemi punit celle qui tire.
- **En mieux dans 2975.** La recherche l'impose (G-30) : une explosion de mort d'ennemi ne blesse jamais la
  joueuse. La chaîne devient une pure récompense, en brasier, et sert la direction (« des explosions
  énormes »). Elle fonde un défi nommé, ARTIFICIER : 3 explosions en chaîne en moins de 2 s (recherche
  § 3.5). Seule la mine ARMÉE, dont la mèche est affichée, frappe la joueuse. La démo n'a aujourd'hui aucune
  réaction en chaîne : ses explosions sont visuelles.

### I-08 · Un butin propre à chaque type

- **Quoi (code).**
  - Énergie : `loot` (de 0 à 4 selon le type), + 3 pour une élite.
  - Noyau : probabilité `coreP` (de 0,01 pour la larve à 0,85 pour la pondeuse), + 0,55 pour une élite.
  - Soin : `healP` (0,015 par défaut, 0,3 pour la pondeuse, 0,12 pour le brouilleur, 0,1 pour le miroir),
    + 0,12 pour une élite.
  - À chaque mort : 1 crédit (5 pour une élite), et de l'ultime : 6 × √(12 / max(12, xpNext)), ou 22
    pour une élite.
  - Le voleur abattu rend tout en UN seul noyau, de valeur max(1, arrondi((objets + 8 s'il en portait au
    moins 2) / 8)).
- **Pourquoi c'est bien.** Chaque cible a une valeur lisible ; les grosses sont des piñatas.
- **En mieux dans 2975.** La démo a l'énergie ambre qui allonge le serpent. Varier par type *(proposé)* :
  une ruche lâche une gerbe de 8 cellules, une élite une grosse cellule jaune (bonus de multiplicateur), le
  voleur abattu rend une seule cellule pleine de tout ce qu'il portait (moins de bruit visuel, comme 2030).

---

## 3. Le bestiaire : onze ennemis (I-09 à I-19)

**Tableau de base (code, avant cran et secteur).** Au cran NORMAL : PV × 1,245 arrondis, allure × 1,055,
dégâts × 1,166 arrondis (1 reste 1, 2 reste 2). Parts d'apparition : audit, 30 832 apparitions simulées.

| Nom (code) | Silhouette | Famille | PV | Allure u/s | Rayon u | Dégâts | Score / XP | Énergie / p noyau / p soin | Attaque | Annonce | Part |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TRAQUEUR (`chaser`) | fer de lance | rose | 9 | 104 | 13 | 1 | 10 / 1 | 1 / 0,03 / 0,015 | bond | 470 ms | 28,4 % |
| INTERCEPTEUR (`interceptor`) | dard | rose | 14 | 120, fuseau 360 | 14 | 1 | 24 / 2 | 1 / 0,07 / 0,015 | fuseau vers le point prédit | 520 ms | 15,9 % |
| MINE (`mine`) | sphère à 6 piques | orange | 7 | 0 (dérive 5) | 15 | 2 | 14 / 2 | 1 / 0,05 / 0,015 | souffle de 140 u | 800 ms | — |
| ARTILLEUR (`shooter`) | hexagone à canon | orange | 18 | 66 | 16 | 1 | 28 / 3 | 2 / 0,09 / 0,015 | balle de 230 u/s, portée 506 u | 950 ms | — |
| TRANCHEUR (`cutter`) | losange à lames | rose | 12 | 92, traversée 540 | 12 | 2 | 32 / 3 | 1 / 0,08 / 0,015 | traversée de 443 u qui coupe le corps | 600 ms | — |
| PONDEUSE (`spawner`) | ruche à 6 pétales | violet | 100 | 32 | 27 | 2 | 95 / 11 | 4 / 0,85 / 0,3 | nichée de 2 larves | 640 ms | 1,1 % |
| LARVE (`mite`) | éclat | rose | 3 | 134 | 7 | 1 | 4 / 1 | 0 / 0,01 / 0,004 | contact | — | 28,9 % |
| PARASITE (`parasite`) | tique à crochets | violet | 9 | 170 | 10 | 1 | 20 / 2 | 1 / 0,06 / 0,015 | s'accroche, freine le virage, mord | 900 ms | — |
| BROUILLEUR (`jammer`) | disque à antennes | violet | 40 | 74 | 20 | 1 | 55 / 6 | 3 / 0,4 / 0,12 | champ de 200 u qui avale les tirs | permanent | 1,7 % |
| VOLEUR (`thief`) | coureur voûté | violet | 14 | 150, fuite 215 | 13 | 1 | 26 / 2 | 1 / 0,15 / 0,015 | vole le butin et fuit | « IL FUIT ! » | 1,1 % |
| MIROIR (`mirror`) | tête du serpent en chrome | chrome | 30 | 152 | 15 | 2 | 60 / 7 | 2 / 0,35 / 0,1 | rejoue ta trajectoire 1,5 s plus tard | — | 1,9 % |

Le reste des 30 832 apparitions (environ 21 %) se partage entre mine, artilleur, trancheur et parasite ;
l'audit ne donne pas leur part une à une.

### I-09 · TRAQUEUR, le fonceur qui bondit

- **Quoi.** Il fonce sur la tête en ondulant (sinusoïde d'environ 1,5 s de période, amplitude 0,55 rad
  au-delà de 170 u, 0,12 rad en deçà), virage 3,0 rad/s, première recharge tirée entre 0,2 et 1,2 s. À
  portée (entre 44 et 205 u) et recharge vide, il **arme** : il se fige (allure × 0,12), pivote vers la tête
  à 1,5 rad/s, gonfle jusqu'à × 1,3, son halo vire à l'alerte, sa ligne de bond s'allonge. Après 470 ms, il
  **bondit** en ligne droite pendant 380 ms à 2,1 fois son allure (encore × 2 en RAPIDE), en laissant une
  traînée. Puis il recharge 1,7 s (× 0,6 en RAPIDE).
- **Pourquoi c'est bien.** C'est l'ennemi qui apprend à lire : il se fige, donc il va bondir, donc on
  s'écarte de côté. Le gonflement se lit même sans la ligne.
- **Défauts.**
  - Il se confond avec la larve et l'intercepteur (audit : 7 types sur 11 sont des fonceurs).
  - 84 % des traqueurs meurent sans avoir attaqué, fauchés par le tir automatique (audit).
  - Annonce de 470 ms, ligne deux fois trop longue, alerte inversée (I-01).
- **En mieux dans 2975.** C'est la FLÈCHE de la démo, déjà bien réglée : elle se fige et tremble 0,6 s,
  puis fonce à 155 px/s pendant 0,42 s (environ 65 px pour une ligne de 72 px). Reprendre de 2030 le
  gonflement, avec une image « armée » d'un pixel plus large où le cœur passe de sang à rose pâle. Faire
  tracer à la ligne exactement le bond. RAPIDE double le bond sans toucher l'annonce. Lever les brides de la
  démo (deux charges au plus, aucune avant 25 s) au profit de la règle d'annonce (retour n° 2). Idée écrite
  dans 2030 mais jamais codée (ENN-13) : le bond laisse 1,5 s une ligne brûlante qui coupe le corps, un mur
  temporaire à contourner (pointillé magenta qui s'éteint au tramage).

### I-10 · INTERCEPTEUR, celui qui vise où tu vas

- **Quoi.** Il vise le point où la tête SERA : la tête plus sa vitesse multipliée par un temps d'avance
  `min(d / 360, 1,2) × 1,05`. Au repos, un petit cercle de 13 u marque ce point. Quand il est aligné (moins
  de 0,3 rad), entre 110 et 560 u, visible et rechargé, il **verrouille** pendant 520 ms : la cible est
  GELÉE, donc la ligne affichée est sa trajectoire exacte. Il ralentit (× 0,2) ; une ligne claire et un
  losange tournant qui se resserre (de 26 à 14 u) marquent le point. Puis il file en **fuseau** pendant
  520 ms à 360 u/s (environ 187 u), rebondit sur les murs, et recharge 2,1 s.
- **Pourquoi c'est bien.** Il punit la ligne droite et récompense le changement de cap au dernier moment.
  Il apprend qu'un ennemi peut viser là où l'on va, pas là où l'on est.
- **Défauts.** En RAPIDE, l'annonce tombe à 312 ms. Il fait 15,9 % des apparitions et se confond avec le
  traqueur.
- **En mieux dans 2975.** Un nouveau sprite, le **dard** (15 px, deux fourches avant). Le losange de visée
  sur le point prédit existe déjà dans le vocabulaire de la démo (marque d'apparition, croix du colosse).
  Fuseau à environ 155 px/s pendant 0,52 s *(calcul de conversion)*. Avec la caméra, garder le rebond sur
  les bords du monde et montrer la ligne de rebond : le dard ricoche en V. C'est l'ennemi qui rend la
  partie difficile sans la rendre injuste.

### I-11 · MINE, le contrôle de zone

- **Quoi.** Immobile, elle dérive de 5 u/s. Son cercle d'armement de 132 u est toujours affiché (pointillés
  sur une gaine sombre continue). Elle s'amorce dès que la tête OU un anneau sur deux entre dans ce cercle.
  La mèche dure 800 ms : bips de plus en plus serrés (intervalle de 280 à 60 ms), cœur et halo qui battent
  plus vite, disque de souffle qui se remplit jusqu'à 140 u. L'explosion coûte 2 segments au serpent (à
  tout le corps pris dans le disque) et fait 18 PV aux ennemis au centre, avec réaction en chaîne. Abattue
  endormie, elle ne fait qu'un pétard de 105 u à 1 segment. Au contact, elle se sacrifie.
- **Pourquoi c'est bien.** Du contrôle de zone et un risque calculé (passer à côté d'un champ de mines).
  C'est aussi un outil : on y attire les autres. En grappe (motif `pack`, 3 mines au secteur 1), on obtient
  de vrais champs de mines.
- **Défauts.**
  - Le corps entier est puni : un serpent long ne sort pas son corps du disque à temps.
  - Les cercles de 132 u et leurs voisins saturent l'écran ; le code a dû restreindre leur portée de
    dessin pour garder le contraste.
  - Abattre une mine endormie blesse encore.
  - Le souffle lit `blastDmg = 2`, que ni le cran ni le secteur ne modifient, alors que le contact suit le
    directeur (2 segments au secteur 1, 18 au secteur 5).
- **En mieux dans 2975.** La mine de la démo dérive vers une station, s'arme seule au bout de 15 s ou à
  34 px de la tête, avec 0,75 s d'annonce et un souffle de 28 px. Reprendre de 2030 :
  - le cercle d'armement toujours affiché, mais discret (un pixel violet tramé, rose pâle une fois armée) ;
  - les bips qui accélèrent, montrés par le cœur qui clignote (`mine:alerte`) ;
  - la réaction en chaîne entre mines voisines ;
  - la mine-outil : abattue, elle explose sans blesser la joueuse mais blesse les ennemis (G-30).

  Armée, son souffle obéit à la règle d'I-06 : la tête dans le disque meurt, le corps dans le disque est
  coupé.

### I-12 · ARTILLEUR, le tireur qui force à bouger

- **Quoi.** Il tient une bande de distance de 310 à 490 u (400 ± 90) en orbitant ; le sens de l'orbite
  change en moyenne toutes les 4 s (probabilité 0,004 par image). Il arme quand il est à moins de 700 u et
  visible : son cap se gèle sur la tête à cet instant (aucune prédiction), il ralentit (× 0,25) et la bouche
  du canon chauffe. La ligne de tir couvre la portée réelle (230 u/s × 2,2 s = 506 u) sur une gaine sombre,
  et le crochet d'impact se pose sur le corps (I-06). Après 950 ms, il tire une balle (trois en éventail de
  0,2 rad pour une élite), avec flash et recul, puis recharge 3,6 s. Il n'apparaît qu'après la première
  carte prise (I-43).
- **Pourquoi c'est bien.** C'est le seul tireur du jeu. Il oblige à bouger, à placer son corps et à ne pas
  rester sur une ligne. Le crochet rouge ou orange est l'idée de lisibilité la plus fine de 2030.
- **Défauts.** Avant correction, il causait 52 % des coups, souvent hors champ (audit). Rendu lisible, il
  était devenu rare (de 10,6 à 2,9 % de la population, puis remonté en G9). Sa balle de 6 u est petite.
- **En mieux dans 2975.** C'est la TOURELLE de la démo : elle va à une station, vise 0,65 s, tire une
  balle à 74 px/s, et change de place après 3 tirs. Reprendre de 2030 :
  - la bande de distance en orbite, plus vivante qu'une station fixe ;
  - la ligne de tir sur la portée réelle (environ 160 px) ;
  - le crochet d'impact ;
  - la salve en éventail pour l'élite.

  Deux idées écrites mais jamais codées : une salve de 3 en éventail de 0,35 rad à partir du chapitre 3
  (ENN-5), et la formation BATTERIE, trois tourelles en ligne qui tirent à 0,4 s d'écart (ENN-12).

### I-13 · TRANCHEUR, la lame qui traverse l'écran

- **Quoi.** Il approche. À moins de 620 u et visible, il **charge** 600 ms : il RECULE (allure × −0,35)
  pour prendre son élan, ses lames tournent à 22 rad/s, et un laser s'allonge de 260 à 1 160 u avec une
  bande claire large jusqu'à 1,6 fois son rayon. Puis il **traverse** 820 ms à 540 u/s (environ 443 u). Il
  coupe une seule fois par passage, pour 2 segments, sur la tête ou n'importe quel anneau, et s'arrête au
  bord de l'arène. Vient la **récupération**, 760 ms : il est lent (× 0,22), entouré d'un cercle vert
  pointillé qui marque la « fenêtre de vulnérabilité ». Puis il recommence. Sur le treillis, il prend les
  rails perpendiculaires au serpent.
- **Pourquoi c'est bien.** C'est l'attaque la plus spectaculaire : une lame traverse l'écran. Elle menace
  tout le corps et oblige à « plier » le serpent. Le recul avant la charge est un télégraphe de posture,
  lisible même sans la ligne.
- **Défauts.**
  - C'était l'attaque la plus rentable : 12 % des charges touchaient, 17 % de tous les coups, 35 % au
    niveau 2 (audit, avant correction).
  - En RAPIDE, l'annonce tombe à 360 ms.
  - La « fenêtre de vulnérabilité » ne change aucune règle : il prend autant de dégâts pendant sa charge.
- **En mieux dans 2975.** Un nouveau sprite, la **lame** : un losange dont les lames tournent (15 px au
  repos, 21 px lames déployées). Traversée à environ 230 px/s *(calcul)*, la ligne montrant toute la
  traversée. Faire de la récupération une vraie règle *(proposé)* : le corps s'entrouvre en rose pâle et
  chaque tir y compte double. Avec la règle d'I-06, sa coupe sectionne vraiment le serpent au point touché.
  C'est l'ennemi le plus « serpent » du bestiaire.

### I-14 · PONDEUSE, la source

- **Quoi.** Lente (32 u/s), elle garde 430 u de distance (elle fuit si la tête est plus près, sinon elle
  orbite) et tourne sur elle-même à 0,7 rad/s. Quand elle est rechargée (2,5 s), à moins de 900 u et
  visible, elle ouvre ses six pétales en 640 ms au moins (son allure tombe à × 0,35) et son cœur blanchit.
  À 600 ms de l'éjection, un portail de couvée s'allume (anneau et tic). Elle éjecte 2 larves en étoile
  (+ 2 pour une élite, 16 larves vivantes au plus) ; les larves sortent avec un élan de × 1,5 pendant
  environ 0,4 s. À sa mort, elle lâche 3 larves (+ 3 pour une élite) et un gros butin : 4 énergies, noyau
  à 85 %, soin à 30 %. Elle porte un arc de vie.
- **Pourquoi c'est bien.** Une cible prioritaire qui crée sa propre vague : tuer la source ou nettoyer les
  petits ? C'est la piñata du secteur.
- **Défauts.** Elle est rare (1,1 % des apparitions). Comme elle garde ses distances, on la poursuit. En
  boss (NOYAU MAGNÉTIQUE), elle n'était visible que 35 % du temps (audit, avant G9).
- **En mieux dans 2975.** Un gros sprite, la **ruche** (21 à 25 px), dont les pétales s'ouvrent en trois
  images, avec le portail de couvée en anneaux concentriques (`spawnMark`) et une nichée qui sort en
  spirale. Elle ne fuit plus : elle se protège derrière ses larves *(proposé)*. Distance gardée d'environ
  80 px dans la vue *(proposé)*.

### I-15 · LARVE, la nuée

- **Quoi.** Elle fonce en zigzag (amplitude 0,9 rad, période d'environ 0,8 s), vire à 3,8 rad/s, va vite
  (134 u/s), n'a que 3 PV et aucun butin. Elle naît d'une pondeuse ou en grappe (motif `pack`, 3 à 6).
- **Pourquoi c'est bien.** C'est la chair à canon : le plaisir de faucher une nuée et de faire monter le
  multiplicateur.
- **Défauts.** 28,9 % des apparitions ; 52 % meurent sans avoir été vues, 100 % sans avoir attaqué
  (audit). C'est du remplissage pur.
- **En mieux dans 2975.** Reprendre l'idée écrite mais jamais codée de l'essaim (ENN-13) : les larves
  orbitent à environ 30 px *(conversion de 90 u)* et ne mordent que les 3 derniers anneaux (1 segment par
  morsure, 500 ms d'annonce). La queue devient une ressource à protéger. Sprite de 7 à 9 px (V-05 : 7 px au
  moins), 1 PV, par grappes de 5 à 8 qui se déplacent en forme lisible (V ou spirale).

### I-16 · PARASITE, celui qui s'accroche au corps

- **Quoi.** Rapide (170 u/s). À moins de 260 u, il vise l'anneau le plus proche du serpent et s'y accroche
  de côté. Chaque parasite accroché retire 15 % de la vitesse de virage (plancher : 45 %). Il mord toutes les
  3,2 s pour 1 segment, et chaque morsure est annoncée 900 ms à l'avance par un anneau qui se resserre. Il
  faut le décrocher au tir ; il tombe aussi si le serpent rétrécit sous lui.
- **Pourquoi c'est bien.** Il s'attaque à ce qu'on est (le corps) et dérègle le contrôle. Il oblige à
  tourner sur soi-même pour se tirer dessus. Sa tension est lente (3,2 s), donc lisible.
- **Défauts.** 93 % meurent sans avoir attaqué, fauchés à l'approche (audit). Viser son propre corps avec
  un tir vers l'avant est malcommode.
- **En mieux dans 2975.** La **tique** (9 px) : accrochée, elle se voit comme un point magenta dans le cyan
  du corps (contraste franc). Morsure annoncée 900 ms. Pour la décrocher sans carte *(proposé)* : la tête
  qui repasse dessus l'écrase, ce qui fait faire une boucle, un geste de serpent. Le malus de virage se voit
  sur le chevron de cap de la tête (J-33).

### I-17 · BROUILLEUR, l'énigme qui coupe les armes

- **Quoi.** Il se tient à 230 u de la tête, juste hors de son propre champ de 200 u, qui respire de ± 5 %.
  Toute balle de la joueuse qui traverse la coque du champ (entre 78 % et 100 % du rayon) est avalée, avec
  un arc lumineux. Si la tête entre dans le champ, toutes les armes se taisent (et 180 ms encore après la
  sortie) ; l'image grésille et un choc sonne toutes les 340 ms. Seule la traînée de queue survit au
  brouillage (`23-weapons.js`, l. 1195) : c'est le contre prévu. À sa mort, le champ s'effondre en anneau
  inversé.
- **Pourquoi c'est bien.** C'est un ennemi-énigme qui casse l'habitude du tir automatique. Il sert de
  bouclier mobile aux autres : avec des artilleurs, il pose un vrai problème tactique.
- **Défauts.**
  - Sans la carte TRAÎNÉE DE QUEUE ou une arme de contact, il est presque intuable : ses propres tirs sont
    avalés.
  - Il est rare (1,7 % des apparitions) ; 47 % meurent sans avoir été vus (audit).
  - Un bug bloquant gelait le jeu tant que la tête restait dans le champ (audit ENN-1, corrigé depuis).
- **En mieux dans 2975.** Le contre doit exister sans construction *(proposé)* : le corps le détruit,
  qu'on l'encercle ou qu'on le traverse tête la première. Champ d'environ 40 px *(proposé)*, en anneau
  tramé violet qui vire au magenta quand la tête y entre, et une icône « tir coupé » dans l'interface. Sa
  règle s'annonce en une ligne à la première rencontre (I-58).

### I-18 · VOLEUR, celui qui prend ton butin

- **Quoi.** Toutes les 280 ms, il cherche le butin le plus proche, file dessus (150 u/s) et l'empoche à
  30 u ; un point de plus apparaît sur sa besace (jusqu'à 4). À 3 objets, ou quand il ne reste rien au sol,
  il crie « IL FUIT ! » et file vers le coin le plus proche à 215 u/s. S'il sort, « BUTIN VOLÉ » : − 40
  points par objet et aucune récompense. Abattu, « RÉCUPÉRÉ » : tout revient en un seul noyau, avec une
  prime s'il portait au moins 2 objets. Sans butin au sol, il chasse la tête à 0,85 fois son allure.
- **Pourquoi c'est bien.** Une cible chargée d'émotion (c'est MON butin), une course-poursuite, et un choix
  (le voleur ou la vague ?).
- **Défauts.** Rare (1,1 % des apparitions) ; 67 % meurent sans avoir été vus (audit). Il fuit vers
  n'importe quel coin, même hors de la vue.
- **En mieux dans 2975.** Il vole les cellules ambre, celles qui allongent le serpent : sa besace grossit
  visiblement (sprite à trois états). Reprendre l'idée écrite mais jamais codée (ENN-13) : il ne fuit que
  vers un bord visible, avec 2 s d'annonce et une ligne de fuite en pointillés. « BUTIN VOLÉ » en 5 × 7
  rose ; abattu, une grosse cellule jaune. Bon support de défi nommé *(proposé)* : RIEN NE FUIT (aucun
  voleur ne s'échappe du niveau).

### I-19 · MIROIR, ton passé qui te poursuit

- **Quoi.** Il rejoue la trajectoire de la tête 1,5 s plus tard. Un tampon de 256 positions, prises toutes
  les 25 ms, garde 6,4 s d'historique. Il roule à la vitesse enregistrée (au moins 0,9 fois la vitesse de
  base), accélère de × 1,22 s'il décroche de plus de 260 u, et vire à 5 rad/s. Sa silhouette est
  exactement la tête du joueur, en chrome, doublée d'une aberration chromatique (deux copies décalées, qui
  sautent toutes les 280 à 900 ms) ; ses yeux sont morts.
- **Pourquoi c'est bien.** C'est l'idée la plus forte du bestiaire : ton passé te poursuit. On ne peut plus
  revenir sur ses pas ; on le sème en tournant court. Le thème est parfait (données, copie, glitch).
- **Défauts.** Rare (1,9 % des apparitions) et tué à 100 % sans avoir attaqué (audit). Le commentaire du
  code promet qu'on peut « lui faire traverser ses propres alliés », mais aucun tir ami ne le touche, hormis
  les mines et les convois.
- **En mieux dans 2975.** Le **serpent en négatif** : une tête et trois segments en magenta et sang, jamais
  en cyan. L'aberration se fait par un décalage d'un pixel en rose pâle et en sang, simple échange d'index.
  À 1,5 s derrière, il suit à environ 96 px pour un serpent à 64 px/s. On le fait passer sur ses propres
  mines. Idée écrite mais jamais codée (ENN-13) : sa face chromée renvoie les balles, il n'est vulnérable
  que par l'arrière. Cela en fait un mini-boss de chapitre 5.

---

## 4. Élites et modificateurs (I-20 à I-26)

**Tableau des modificateurs (code).** Les poids viennent de l'audit : coups infligés par des ennemis portant
le modificateur, sur 1 192 coups.

| Modificateur | Couleur 2030 | PV | Allure | Autre effet | Ce qu'on voit | Poids |
|---|---|---|---|---|---|---|
| BLINDÉ (`armored`) | acier bleuté `#9fb6d0` | × 2,4 | × 0,78 | sous 50 % des PV, l'armure éclate et l'allure passe × 1,55 | 4 plaques qui tournent, éclats à la rupture | 27 |
| RAPIDE (`fast`) | jaune `#ffe45e` | × 0,7 | × 1,55 | rayon × 0,9, recharges et annonces × 0,6, bond du traqueur × 2 | rémanence néon | 27 |
| SAUTEUR (`teleporter`) | lilas `#b388ff` | × 1 | × 0,86 | se téléporte toutes les 2,2 à 3,2 s, destination annoncée 520 ms | losange de destination, anneaux d'entrée et de sortie | 14 |
| INSTABLE (`explosive`) | orange `#ff8a3d` | × 0,85 | × 1,1 | explose à sa mort : 150 u, 2 segments | cœur qui bat d'autant plus vite que les PV baissent | 38 |
| RÉGÉNÈRE (`regen`) | vert `#7CFFB2` | × 1,3 | × 0,95 | sans coup reçu pendant 1,5 s, regagne 7,5 % de ses PV par seconde | hexagone vert qui tourne, particules | 6 |
| GARDE (`shielded`) | bleu `#5b8cff` | × 1 | × 0,9 | arc de bouclier de 143° qui tourne et avale les tirs | arc qui pulse à chaque tir avalé | 7 |

### I-20 · L'élite

- **Quoi (code).** Une élite a des PV × 3,2, un score et de l'XP × 4, un rayon × 1,35. Elle porte une
  couronne : deux anneaux pointillés qui tournent en sens contraires et trois pointes. Son butin a 3
  énergies de plus, + 55 % de chance de noyau et + 12 % de soin ; elle rapporte 5 crédits et 22 d'ultime,
  et sa mort sonne `bigkill` avec une vibration. Son chevron d'apparition est double et son marqueur hors
  champ permanent. Toute élite porte un modificateur : dès qu'un secteur a une liste (et les quatre en ont),
  elle y pioche. Au secteur 1, la liste ne contient que BLINDÉ, donc toute élite y est blindée. En plus,
  10 % des ennemis ORDINAIRES portent un modificateur du secteur, + 2 % par cycle de surcharge. La chance
  d'élite est écrite par vague : de 5 à 14 %, + 3 % par cycle.
- **Pourquoi c'est bien.** Des pics de danger et de récompense, et une variété par combinaison (11 types ×
  6 modificateurs).
- **Défauts.** Les élites tombent au hasard, sans qu'on sache quand. La couronne était aussi celle des boss
  (qui étaient des élites renommées). Au secteur 1, « élite » et « blindée » veulent dire la même chose.
- **En mieux dans 2975.**
  - Un pic connu par niveau : une élite ou une horde entre 55 et 75 % de la durée (G-07).
  - L'élite annonce son nom dans un bandeau court (« FLÈCHE BLINDÉE »).
  - Un sprite de 19 à 21 px dessiné à la main (jamais un agrandissement non entier), et une couronne de
    pointillés rose pâle qui tourne.
  - Sa mort est une grosse explosion (force supérieure à 0,6, attendu n° 3 de DIRECTION.md).
  - Un modificateur au plus par ennemi ordinaire ; deux pour les élites des chapitres 4 et 5 seulement.

### I-21 · BLINDÉ

- **Quoi.** Voir le tableau. Les plaques éclatent à mi-vie (gerbe d'éclats, anneau, son) et la bête devient
  nerveuse (allure × 1,55). La carte des tirs spectraux brise l'armure d'emblée.
- **Pourquoi c'est bien.** Deux phases dans un seul ennemi, et la satisfaction de voir l'armure tomber.
- **Défauts.** Il pèse peu (27 coups sur 1 192).
- **En mieux dans 2975.** Des plaques de sang à rivets rose pâle (dans la palette), qui sautent en débris
  restant 3 s au sol (G-30). Le passage en « nerveux » se montre : les pattes trottinent deux fois plus
  vite.

### I-22 · RAPIDE

- **Quoi.** Voir le tableau.
- **Pourquoi c'est bien.** Un ennemi connu devient soudain pressant.
- **Défauts.** Il raccourcit des annonces sous la règle (I-01). Il pèse peu (27 coups).
- **En mieux dans 2975.** Il ne touche que l'allure et la recharge, jamais l'annonce. Deux copies tramées en
  sang le suivent en rémanence.

### I-23 · SAUTEUR

- **Quoi.** Première téléportation entre 1,2 et 2,4 s, puis toutes les 2,2 à 3,2 s. 520 ms avant le saut,
  il choisit une destination à une distance de 150 à 340 u en direction de la tête (± 0,9 rad), la marque
  d'un losange et d'un pointillé, et son cercle clignote. Il disparaît et réapparaît dans des anneaux,
  tourné vers la tête.
- **Pourquoi c'est bien.** Il triche avec l'espace, mais il annonce sa triche.
- **Défauts.** Il pèse peu (14 coups). Sur bureau, son marqueur de destination est mal placé pour sept
  types (annexe A).
- **En mieux dans 2975.** La destination apparaît en silhouette tramée qui se remplit en 520 ms au seuil de
  Bayer : la démo le fait déjà pour l'arrivée du colosse (`blitDither`). Jamais à moins de 48 px de la tête
  (G-14).

### I-24 · INSTABLE

- **Quoi.** Son cœur rouge bat de plus en plus vite à mesure que ses PV baissent (constante de temps de
  90 + 420 × PV / PV max ms : 510 ms à pleine vie, 90 ms à l'agonie). À sa mort, il explose : 150 u,
  2 segments au serpent (tout le corps) et des dégâts aux ennemis.
- **Pourquoi c'est bien.** C'est le modificateur qui pèse le plus (38 coups) et le plus tactique : on le
  tue loin de soi et près des autres.
- **Défauts.** Sa mort blesse celle qui tire, ce que G-30 interdit.
- **En mieux dans 2975.** Un cœur en brasier (« cœur chaud », dit DIRECTION.md) qui bat. À sa mort, le
  souffle ne blesse que les ennemis : c'est une bombe offerte. Pour garder un risque *(proposé)*, il peut
  devenir à sa mort une mine amorcée de 800 ms, donc télégraphiée.

### I-25 · RÉGÉNÈRE

- **Quoi.** Voir le tableau.
- **Pourquoi c'est bien.** Il punit la dispersion des tirs : il faut finir le travail.
- **Défauts.** Il ne pèse presque rien (6 coups). Son vert est aussi la couleur du butin et du soin dans
  2030, d'où une confusion.
- **En mieux dans 2975.** Une pulsation rose pâle, et l'arc de PV qui remonte à vue d'œil. À réserver aux
  grosses cibles (ruche, brouilleur, colosse), où il compte vraiment.

### I-26 · GARDE

- **Quoi.** Un arc de ± 1,25 rad (143°) tourne de 0,7 à 1,5 rad/s, dans un sens tiré au hasard. Il avale
  les tirs de la joueuse dans son secteur, entre 4 et 15 u au-delà du rayon. Il encaisse 5 tirs plus 30 %
  des PV max ; brisé, il se reforme au bout de 3,8 s. Les tirs spectraux le traversent.
- **Pourquoi c'est bien.** Il oblige à contourner ou à saturer, et récompense le placement (tirer dans le
  dos).
- **Défauts.** Il pèse peu (7 coups). Avec un tir automatique vers l'avant, contourner coûte cher.
- **En mieux dans 2975.** Un arc d'un pixel rose pâle de 143° qui tourne. Avec la caméra et un serpent qui
  tourne autour de ses proies, le contournement devient naturel. La brisure se montre par des éclats et une
  fenêtre de 3,8 s affichée.

---

## 5. Les boss (I-27 à I-35)

**Déroulé d'un climax dans 2030 (code).**

| Temps | Ce qui se passe |
|---|---|
| 0 s (entrée du climax) | bannière du nom du boss (2,2 s, seule à l'écran), flash de la couleur de danger, secousse de 16, glitch ; portail du boss de 1,4 s (chevron triple de 40 px, de 3 à 12 Hz) ; son `bossIn` et chute de la musique AU PORTAIL |
| 1,4 s | éclosion : le boss est repoussé hors champ (à 1,35 fois la demi-étendue visible), puis tiré vers le cadre en 1,8 s de jeu, invulnérable pendant ce trajet |
| première image où il est visible | le monde passe au ralenti × 0,3 pendant 2,2 s, la joueuse garde sa vitesse ; la jauge de boss se remplit |
| 3,4 s | fin du silence : première salve d'escorte ; les vagues ordinaires du climax reprennent (premières éclosions vers 4,0 s) |
| boss à 66 % puis 33 % de ses PV | deuxième puis troisième salve d'escorte |
| 45 s d'horloge de phase | enragement : allure × 1,3, recharges × 0,75, liseré blanc |
| mort de la dernière élite-boss | phase de nettoyage, secteur GAGNÉ (récompense, I-31) |
| durée nominale + 180 s | soupape : nettoyage SANS récompense (ne doit jamais arriver en jeu) |

### I-27 · Le boss qui ne se contourne pas

- **Quoi.** Au climax, le secteur ne finit qu'à la mort de toutes les élites-boss. La jauge passe au boss
  suivant encore debout. Une soupape de 180 s au-delà de la durée nominale évite le blocage si l'éclosion a
  échoué, sans récompense. Passé 45 s, le boss s'enrage.
- **Pourquoi c'est bien.** Un vrai combat, pas une attente : avant G9, un boss sur quatre ou cinq était
  « forfaité » au chrono, avec la même bannière et la même récompense qu'une victoire (audit).
- **Défauts.** Le liseré d'enragement est dessiné hors de place, et en blanc pur, contre la règle du blanc
  réservé (annexe A). Les vagues ordinaires continuent pendant le combat : avant correction, 48 % des coups
  reçus pendant un climax venaient des artilleurs, 5 % seulement du boss (audit).
- **En mieux dans 2975.** Pendant un boss, plus de vagues ordinaires : seules les invocations du boss
  lui-même *(proposé)*. La démo laisse aujourd'hui tourner son directeur pendant le colosse (18 à 26
  ennemis visés). L'enragement s'annonce par un bandeau (« LE CYCLOPE S'EMBALLE ») et par l'œil du colosse
  qui vire au brasier. Il nourrit un défi nommé, CHRONO : vaincre le colosse en moins de 90 s (recherche
  § 3.5).

### I-28 · L'entrée mise en scène

- **Quoi.** Voir le déroulé ci-dessus. L'arrivée suit une courbe douce, entrante et sortante
  (k³(6k² − 15k + 10)), vers 55 % de l'étendue visible, en repère caméra pour suivre une joueuse qui fuit.
  La projection est retenue dans [0,18 ; 0,82] de l'écran, avec 0,35 s de retenue après l'arrivée. Une
  vignette rouge reste au moins à 0,16 pendant tout le combat.
- **Pourquoi c'est bien.** C'est le moment fort du secteur : on voit le boss arriver, et l'on a le temps de
  le regarder.
- **Défauts.** Toute cette mécanique sert un boss qui n'est qu'un traqueur à couronne. Sur la capture
  d-10, PROTOTYPE ZÉRO est un petit triangle couronné, sans présence.
- **En mieux dans 2975.** La démo fait déjà mieux pour la présence : un interlude ALERTE puis le panneau du
  colosse (3 s, jeu gelé), un télégraphe de 2,4 s au retour (cible, croix qui bat à 2 Hz, silhouette qui se
  forme au tramage), et 0,6 s sans dégâts. Il lui manque :
  - le silence (rien d'autre ne naît pendant l'arrivée) ;
  - le ralenti au retour en jeu ;
  - la jauge nommée ;
  - un nom propre par boss : `N.intro.transition('boss', {nom})` l'accepte déjà, la démo ne s'en sert pas
    (tout boss s'appelle LE CYCLOPE) ;
  - avec la caméra (retour n° 3), l'arrivée pilotée de 2030, hors champ puis dans le cadre.

### I-29 · L'escorte en trois salves

- **Quoi.** Aucune escorte à l'entrée. Une salve quand le silence se lève (3,4 s), puis une à 66 % et une à
  33 % des PV du boss. La composition est propre au secteur.
- **Pourquoi c'est bien.** Le combat a des paliers lisibles, qu'on sent venir à la jauge.
- **En mieux dans 2975.** Chaque salve est la formation du chapitre (MEUTE, BATTERIE, ESSAIM, I-38).
  Entre deux phases du colosse, 7 s de respiration où il se replie et où l'énergie afflue (recherche
  § 3.4), plutôt qu'une salve de plus.

### I-30 · La laisse et le plancher d'allure

- **Quoi.** L'allure du boss vaut au moins 1,08 × 150 = 162 u/s, plus que le serpent en croisière. Au-delà
  de 300 u de la tête, un multiplicateur monte en ligne droite jusqu'à × 3,5 à 900 u, et retombe au
  contact.
- **Pourquoi c'est bien.** Le boss ne se sème pas, donc le combat a lieu.
- **Défauts.** C'est un élastique invisible : le boss accélère d'un coup, sans annonce, jusqu'à × 3,5. Il
  remplace une chorégraphie par une poursuite. Les mesures du code le disent : à 91 ou à 228 PV, le climax 1
  durait 52,8 et 52,9 s en médiane, la durée venant de la distance et non des PV.
- **En mieux dans 2975.** Une chorégraphie à la place de la laisse. Le colosse occupe une zone du monde et
  y amène la caméra *(proposé)*. La démo le fait déjà à sa façon : il se place à l'opposé de la joueuse, à
  17 px/s. La durée vient des phases et des PV.

### I-31 · La récompense de boss

- **Quoi.** Une carte TROPHÉE (aucune commune, au moins une épique ou ultra), + 60 crédits avec une
  bannière « + 60 ◆ », + 50 d'ultime, le compteur de boss abattus ; puis le butin de fin de secteur (un
  noyau de valeur 3 et un soin près de la tête).
- **Pourquoi c'est bien.** Battre le boss compte, et se voit.
- **En mieux dans 2975.** Le total persistant et l'étoile FINIR (G-04, G-25), l'ouverture de la Surcharge du
  chapitre (G-10), un « boss stop » de 20 à 30 images (G-26), et une explosion finale qui couvre plus de 8 %
  de l'écran de brasier pendant au moins 4 images (critère 4 de DIRECTION.md). La démo a déjà la cascade
  d'explosions et les 24 cellules ; il lui manque la récompense qui dure.

### I-32 · PROTOTYPE ZÉRO (secteur 1)

- **Quoi (code et calcul).** Un traqueur élite BLINDÉ, facteur de PV 1,55 : 130 PV au cran NORMAL. Allure
  162 u/s (plancher), × 1,55 quand l'armure tombe à mi-vie. Escorte : 5 traqueurs en anneau et 1 artilleur
  de flanc.
- **Défauts.** Avant G9, il mourait en 9,9 s médianes (audit). Il n'a aucune attaque propre : il bondit
  comme un traqueur.
- **Idée écrite mais jamais codée (ENN-2).** Trois phases. D'abord un triple bond en éventail de ± 25°,
  bonds espacés de 250 ms, annoncés 600 ms. Puis, armure tombée, une charge jusqu'au mur, un rebond et
  4 traqueurs appelés. Enfin le berserk : un bond toutes les 900 ms, allure × 1,3, une mine posée au bout de
  chaque bond.
- **En mieux dans 2975.** Le colosse du chapitre 1, à une phase (G-06) : bonds en éventail et mines à
  l'atterrissage. C'est le combat qui enseigne les deux ennemis du chapitre.

### I-33 · DOUBLE LAME (secteur 2)

- **Quoi (code et calcul).** Deux trancheurs élites RAPIDES, facteur de PV 14 : 476 PV chacun au cran
  NORMAL, 952 en tout. Charge annoncée 360 ms (270 ms enragés), traversée à 540 u/s. Escorte : 5
  intercepteurs dans les voies et 1 artilleur.
- **Défauts.** L'annonce passe sous la règle d'or. Avant le facteur 14, DOUBLE LAME mourait en 4,3 s
  médianes et 0,1 s au plus vite (audit). Le facteur a été réglé pour « tenir les bornes du test », pas pour
  le ressenti (commentaire de `_lvBossBorn`).
- **Idée écrite mais jamais codée (ENN-2).** Les deux lames chargent en ciseaux vers la position prédite de
  la tête (deux lignes annoncées 800 ms), puis prennent chacune une voie à la vitesse d'un convoi. À chaque
  croisement, un convoi est lancé. La survivante gagne + 50 % de PV et le modificateur RAPIDE.
- **En mieux dans 2975.** Un duo est une très bonne idée de boss : deux ennemis complémentaires, et la mort
  de l'un enrage l'autre. Pour garder le colosse unique de la direction artistique *(proposé)* : le colosse
  du chapitre 2 porte deux lames qu'il détache et relance en ciseaux.

### I-34 · NOYAU MAGNÉTIQUE (secteur 3)

- **Quoi (code et calcul).** Une pondeuse élite GARDE, facteur de PV 2,5 : 993 PV plus un bouclier de 124
  tirs au cran NORMAL. Allure 162 u/s. Escorte : 1 brouilleur et 3 parasites.
- **Défauts.** Visible 35 % du temps seulement, car il fuyait à 430 u (audit, avant G9). Des PV énormes.
- **Idée écrite mais jamais codée (ENN-2).** Il est ancré au centre et n'est vulnérable que lorsque la tête
  est dans son champ d'attraction (300 u). Toutes les 4 s, une impulsion inverse la polarité de tous les
  nœuds, annoncée par un fondu de 1 s. Il pond 4 larves en 3 salves. Sous 33 %, il devient répulseur et
  courbe les balles : il faut l'encercler.
- **En mieux dans 2975.** Un boss d'arène, ancré, dont les inversions sont annoncées : très lisible, et il
  réutilise la règle d'arène du chapitre.

### I-35 · SURCHARGE, le boss tournant (secteur 4 et suivants)

- **Quoi (code et calcul).** Une pondeuse élite dont le modificateur est tiré au hasard parmi les six. Un
  boss aux cycles 1, deux aux cycles 2 et 3, trois aux cycles 4 et 5, quatre dès le cycle 6. PV × (1 + 0,22
  × cycle) × 2,5, soit de 848 à 2 908 PV au cycle 1 selon le modificateur. Escorte : 2 miroirs, 2 trancheurs
  et 1 brouilleur.
- **Défauts.** C'est le même boss à chaque cycle (audit : 53 combats contre la même pondeuse).
- **Idée écrite mais jamais codée (ENN-2).** Une rotation fixe des couples de modificateurs (blindé et
  rapide, puis garde et régénère, puis sauteur et instable) et du type de boss (pondeuse, miroir géant à
  retard de 2,5 s, brouilleur à champ de 320 u), jamais deux fois le même type de suite.
- **En mieux dans 2975.** Le boss final du chapitre 5 enchaîne une phase de chacun des quatre boss
  précédents (« tout le système en même temps », dit le sous-titre du secteur SURCHARGE), puis une finale.

---

## 6. Les niveaux (I-36 à I-51)

### I-36 · Le secteur en cinq phases

- **Quoi.** `calm` → `rise` → `surge` → `climax` → `clear` (calme, montée, déferlante, apogée,
  nettoyage). Le climax est ouvert : il finit à la mort du boss. Entrée en montée : un flash léger. Entrée en
  déferlante : bannière « SURCHARGE DU SECTEUR », flash et glitch. L'objectif d'un secteur reste implicite
  (tenir, puis abattre le boss) ; il n'y a aucun objectif secondaire, et la barre de progression suit le
  temps.
- **Chiffres (code), durées en secondes.**

| Secteur | calme | montée | déferlante | apogée | nettoyage | total nominal |
|---|---|---|---|---|---|---|
| 1 LA GRILLE | 10 | 24 | 24 | 34 | 6 | 98 |
| 2 AUTOROUTE NÉON | 16 | 26 | 28 | 36 | 6 | 112 |
| 3 ZONE MAGNÉTIQUE | 18 | 28 | 30 | 40 | 6 | 122 |
| 4+ SURCHARGE | 12 | 22 | 30 | 42 | 5 | 111 |

  En surcharge, les phases autres que l'apogée et le nettoyage raccourcissent de 4 % par cycle (− 35 % au
  plus, 8 s au moins).
- **Pourquoi c'est bien.** Une courbe : on comprend, ça monte, ça déborde, le boss, la purge.
- **Défauts.**
  - Le calme n'est pas calme : 8 ennemis vivants en médiane (p90 18), 11 % seulement des secondes avec
    2 ennemis au plus (audit).
  - Le premier ennemi arrive 0,6 à 1,4 s après le début du secteur (calcul : minuterie de 0,02 à 0,8 s,
    plus le portail de 600 ms ; audit : 0,57 s en médiane).
  - Aucune respiration entre la déferlante et l'apogée, hors des 3,4 s de silence du boss : l'exigence G-17
    n'est pas tenue.
- **En mieux dans 2975.** Le déroulé de la recherche (§ 3.3) :
  - calme de 0:00 à 0:10, un seul type, aucun tir ennemi ;
  - montée jusqu'à 1:25 ;
  - pic de 1:25 à 1:40, élite ou horde ;
  - respiration de 1:40 à 1:50, sous 40 % du pic, énergie abondante ;
  - apogée de 1:50 à 2:20 ;
  - purge de 2:20 à 2:30.

  Le niveau de boss garde l'apogée-boss de 2030. Trois défis par niveau (G-21), dont certains liés aux
  ennemis *(proposé)* : ARTIFICIER, RIEN NE FUIT, DÉMINEUSE (6 mines sans être touchée), MATADOR (esquiver
  5 lames).

### I-37 · L'intensité pilotée

- **Quoi (code).** Valeur de base par phase : calme 0,20, montée 0,46, déferlante 0,76, apogée 0,94,
  nettoyage 0,22. S'y ajoutent :
  - + 0,12 au fil de la montée et de la déferlante, − 0,10 au fil du nettoyage ;
  - + 0,16 × min(1, ennemis vivants / 46) ;
  - + 0,06 tant qu'un boss vit ;
  - + min(0,10 ; 0,015 × cycle).

  La valeur est lissée, envoyée à la musique et au décor (grille, brume, poussière) ; un accent musical
  marque chaque changement de phase.
- **Pourquoi c'est bien.** La musique et le décor suivent ce qu'on voit, pas une horloge.
- **En mieux dans 2975.** `N.game.tension()` existe déjà, par tranches de 20 s. La nourrir avec la phase et
  la densité, à la manière de 2030, et changer de couche musicale à la mesure (G-31).

### I-38 · Des vagues écrites en table

- **Quoi (code).** Une vague est une ligne de table : `{ p : phase, every : intervalle en s, every0 et ramp
  : cadence de début de phase, jit : aléa, cap : plafond, g : [[type, nombre, motif]], eliteP, mods }`.
  - Chaque vague a sa minuterie ; l'intervalle est tiré à ± 35 % × `jit`.
  - La première salve de chaque phase part entre 0,2 et 1,4 s, moins les 600 ms du portail.
  - `every0` et `ramp` donnent une cadence plus lente en début de phase : les traqueurs de la montée du
    secteur 1 arrivent toutes les 5,0 s pendant 10 s, puis toutes les 3,6 s.
  - Au cran NORMAL, les intervalles sont multipliés par 0,689 et les plafonds par 1,273 (calcul).
- **Pourquoi c'est bien.** Des niveaux écrits à la main mais vivants (aléa borné), faciles à régler et à
  relire.
- **Défauts.** Les salves sont anonymes : rien ne se nomme, et l'on ne reconnaît aucune formation.
- **En mieux dans 2975.** Reprendre l'idée écrite mais jamais codée des formations nommées (ENN-12),
  annoncées 1 s avant par un bandeau court :
  - MEUTE : 6 fonceurs en V depuis un bord ;
  - BATTERIE : 3 tourelles en ligne qui tirent à 0,4 s d'écart ;
  - CHAMP DE MINES : 8 mines en grille de 3 × 3 devant la tête, marqueurs affichés 1,5 s ;
  - ESSAIM : une ruche et 8 larves ;
  - RAID : 2 voleurs et 1 miroir.

  Chaque chapitre a ses formations ; le dernier les combine deux à deux.

### I-39 · Sept motifs d'apparition

- **Quoi (code).**
  - `edge` : un angle au hasard ;
  - `ring` : un anneau régulier autour du serpent, dont l'origine tourne à 0,55 rad/s ;
  - `ahead` : devant, à ± 0,45 rad du cap ;
  - `flank` : sur les côtés (± 90°, en alternance, ± 0,28 rad) ;
  - `pack` : une grappe, à ± 70 u autour du premier point ;
  - `lane` : dans une voie de circulation, derrière le serpent ;
  - `corner` : un coin de l'arène.

  Tous tirent leur point à une distance d'au moins la demi-diagonale de la vue + 150 u, font cinq essais,
  puis se replient sur les bords et les coins de l'arène.
- **Pourquoi c'est bien.** La direction d'arrivée a un sens : devant, c'est un piège ; sur les flancs, une
  pince ; en anneau, un encerclement.
- **En mieux dans 2975.** Avec la caméra, ces motifs se reprennent tels quels, en pixels (portées ÷ 3,1,
  section 9). En portrait, éviter le bas de l'écran, où repose le pouce : la démo le fait déjà en divisant
  par deux les naissances par le bas.

### I-40 · Les portails de 600 ms

- **Quoi (code).** 600 ms avant chaque éclosion, un chevron de 24 px s'allume au bord, de la couleur du
  type (double pour une élite), et un tic `spawnTick` sonne (plus fort pour une élite). L'annonce est prise
  sur l'avance : la salve arrive à l'heure prévue. Si la caméra a bougé, le point est corrigé avant
  l'éclosion. Une petite déchirure en anneau marque l'arrivée. Les ennemis éclosent dans l'ordre où leurs
  chevrons se sont allumés. Tout est journalisé (`S.log`).
- **Chiffres (audit, AVANT).** 17 à 29 % des ennemis apparaissaient dans la vue.
- **Pourquoi c'est bien.** On sait QUI arrive et D'OÙ, avant qu'il soit là.
- **En mieux dans 2975.** La démo n'a que des carrés de 5 px pour les ennemis déjà sortis du tampon
  (`drawEdgeTicks`). Il faut un vrai portail : une flèche de 7 px au bord de la vue pendant 600 ms, avec la
  mini-silhouette du type (5 × 5), puisque la couleur ne peut pas dire le type. Double pour une élite,
  triple et 1,4 s pour le colosse, et un tic sonore.

### I-41 · Naître hors de vue, même de la vue qui vient

- **Quoi (code).** Le point d'apparition doit être caché de la vue ACTUELLE et de la vue ANTICIPÉE (la tête
  avancée de 1,15 s de course), avec 40 u de marge, et rester à 70 u des bords de l'arène. Pendant les
  600 ms du portail, une vérification toutes les quatre images le repousse si la caméra l'a rattrapé.
- **Pourquoi c'est bien.** Personne ne naît sous les yeux, même quand la caméra file.
- **En mieux dans 2975.** Indispensable avec la caméra demandée par le retour n° 3, et à combiner avec G-14
  (jamais à moins de 48 px de la tête). Bien plus simple qu'en 2030, faute de bascule 3D.

### I-42 · Les garde-fous de densité

- **Quoi (code).** Chaque vague a son plafond, qui compte les ennemis vivants ET les portails en vol. Tant
  que le serpent a moins de 12 segments, le plafond de la table est ramené à 22 (soit 28 au cran NORMAL) :
  moins d'ennemis quand on n'a encore rien pour s'en défaire. Un plafond dur de 130 ennemis, ouvert à 160 si
  la qualité automatique n'a retiré aucun cran.
- **Pourquoi c'est bien.** La densité monte sans jamais casser la cadence d'images.
- **En mieux dans 2975.** Une seule constante pour les ennemis et les projectiles, mesurée sur iPhone 13
  (G-16). Garder « serpent court = clémence », mais pour les premières secondes seulement : le retour n° 2
  demande de la pression.

### I-43 · Les portes d'entrée des types

- **Quoi (code).** Aucun artilleur avant la première carte prise (`S.cardsTaken ≥ 1`) : « tirer sur un
  serpent qui n'a encore aucune réponse n'apprend rien ».
- **Pourquoi c'est bien.** Chaque menace arrive quand on a de quoi y répondre.
- **En mieux dans 2975.** Généraliser : chaque type a sa porte d'entrée, un chapitre et une seconde
  d'arrivée (esquisse en section 9). La démo le fait déjà en petit (tourelle et sentinelle à la minute 2).

### I-44 · La fin de secteur

- **Quoi (code).** Au nettoyage (6 s) :
  - les portails en vol sont annulés et les ennemis restants soldés (score × 1, petite gerbe) ;
  - « SECTEUR NETTOYÉ », son de passage, flash, onde depuis la tête ;
  - un noyau de valeur 3 et un soin tombent près de la tête ;
  - ce qui naît ou survit encore fuit vers le bord le plus proche à 400 u/s, sans pouvoir blesser ;
  - aucun ennemi n'est reporté au secteur suivant (avant G9 : 6 en médiane, 59 au plus, audit) ;
  - puis le secteur suivant démarre : bannière « NIVEAU n — NOM » et bandeau du nom avec la consigne.
- **Pourquoi c'est bien.** Une vraie coupure, une récompense, et un départ propre.
- **Défauts.** Le solde efface les ennemis plus qu'il ne les fait exploser.
- **En mieux dans 2975.** La démo a mieux : la PURGE, où tout explose dans l'ordre des distances, toutes
  les 45 ms. La garder comme fin de chaque niveau, et y ajouter de 2030 la fuite des retardataires, la
  récompense, une carte de résultats de 2 s au plus (G-38) et l'enchaînement vers le niveau suivant.

### I-45 · L'identité d'un secteur

- **Quoi (code).** Un secteur, c'est : un nom (LA GRILLE) ; un sous-titre (SECTEUR D'ENTRAÎNEMENT) ; une
  consigne d'une ligne (« ÉVITE LE CONTACT, LE CANON TIRE SEUL ») ; une palette de 13 rôles de couleur ; un
  décor (taille de grille de 96 à 168 u, onde de balayage, voies, champ, bandes) ; une brume (de 0,10 à
  0,15) ; une mécanique ; une liste de modificateurs ; un boss.
- **Pourquoi c'est bien.** Chaque secteur a sa personnalité et sa règle, dites en une ligne.
- **En mieux dans 2975.**
  - Les noms de chapitre de la recherche (§ 3.2) : Amorçage, Trafic, Pare-feu, Surtension, Noyau.
  - Une consigne en trois lignes au briefing (DIRECTION.md).
  - Une variante de palette par échange d'index, qui garde les 16 couleurs (V-12) : grille en violet, puis
    en indigo, puis en ardoise.
  - Les plans de parallaxe demandés par le retour n° 3 (horizon et cité au loin, structures au milieu,
    grille au sol), propres à chaque chapitre.

### I-46 · LA GRILLE (secteur 1)

- **Quoi (code).** Une arène nue, grille bleue (cellules de 132 u, une ligne forte toutes les quatre) et
  une onde de balayage en diagonale (environ 160 u/s) qui allume les nœuds de la grille en trois paliers.
  Modificateur : BLINDÉ. Boss : PROTOTYPE ZÉRO.
- **Vagues (code).**

| Phase | Toutes les (s) | Composition et motif | Plafond | Élite |
|---|---|---|---|---|
| calme | 3,2 | 2 traqueurs, `edge` | 18 | — |
| calme | 9,0 | 1 mine, `ahead` | 14 | — |
| montée | 3,6 (5,0 les 10 premières s) | 3 traqueurs, `edge` | 30 | — |
| montée | 8,0 | 1 traqueur, `flank` | 28 | — |
| montée | 8,5 | 2 mines, `ahead` | 26 | — |
| montée | 6,5 | 1 artilleur, `flank` | 26 | — |
| déferlante | 3,0 | 4 traqueurs, `ring` | 44 | 8 % |
| déferlante | 5,0 | 2 intercepteurs, `flank` | 42 | 6 % |
| déferlante | 5,0 | 2 artilleurs et 1 traqueur, `edge` | 40 | — |
| déferlante | 9,0 | 3 mines, `pack` | 38 | — |
| apogée | 4,2 | 3 traqueurs, `edge` | 46 | — |
| apogée | 6,0 | 1 artilleur, `flank` | 46 | — |

- **Pourquoi c'est bien.** Un secteur d'apprentissage clair : un fonceur, une mine, puis un tireur.
- **En mieux dans 2975.** C'est le chapitre 1 ; la démo en est déjà proche. Lui ajouter la respiration, le
  pic, la formation MEUTE et le CHAMP DE MINES (esquisse en section 9).

### I-47 · AUTOROUTE NÉON (secteur 2) : les voies et les convois

- **Quoi (code).**
  - **Voies** : 5 voies horizontales, centrées à 13, 32,5, 50, 67,5 et 87 % de la hauteur de l'arène,
    hautes de 148 u, de sens alternés, chacune à une vitesse de 215 à 330 u/s.
  - **Nombre de convois** : 5 × facteur de phase (calme 0,4, montée 0,72, nettoyage 0,25, sinon 1),
    + 1,4 par cycle. Un convoi naît toutes les 0,5 à 1,5 s, divisé par (1 + intensité).
  - **Gabarit d'un convoi** : longueur de 176 à 356 u (+ 6 % par cycle), épaisseur de 60 à 84 % de la
    hauteur de la voie ; vitesse de la voie × 0,86 à 1,18, puis + 5 % par cycle et × (1 + 0,25 ×
    intensité). Un tiers sont chromés.
  - **Le convoi broie les ennemis** : 9 PV (+ 2 par cycle), 8 fois par seconde, s'il est à moins de 260 u
    de la vue.
  - **Il blesse la tête** : 1 segment, quel que soit le secteur. Il éjecte le serpent hors de son gabarit
    (60 u au plus), avec une onde et une secousse de 12. Une vignette rouge s'allume quand un convoi fonce
    vers la tête à moins de 400 u.
  - **Dessin** : tapis des voies, bords néon, médianes en pointillés qui défilent, ombre portée, phares
    projetés à 260 u devant, caisses à arêtes et nervures, museaux rouges qui pulsent (« le côté qui tue,
    jamais ambigu »), 26 traits de vitesse.
  - **Consigne** : « LES CONVOIS BALAIENT LES VOIES ». Modificateurs : RAPIDE, INSTABLE. Boss : DOUBLE LAME.
- **Vagues (code).**

| Phase | Toutes les (s) | Composition et motif | Plafond | Élite, modificateurs |
|---|---|---|---|---|
| calme | 4,2 | 2 traqueurs, `lane` | 20 | — |
| calme | 7,5 | 1 intercepteur, `ahead` | 18 | — |
| montée | 3,4 | 2 intercepteurs, `lane` | 34 | — |
| montée | 5,2 | 1 trancheur, `flank` | 32 | 5 %, RAPIDE |
| montée | 7,0 | 3 traqueurs, `edge` | 30 | — |
| montée | 6,5 | 1 artilleur, `flank` | 30 | — |
| déferlante | 2,9 | 3 intercepteurs (`lane`) et 2 traqueurs (`edge`) | 50 | 9 %, RAPIDE ou INSTABLE |
| déferlante | 4,6 | 2 trancheurs, `flank` | 48 | 8 %, RAPIDE |
| déferlante | 5,0 | 2 artilleurs (`ring`) et 1 intercepteur (`lane`) | 46 | — |
| déferlante | 8,0 | 1 voleur, `edge` | 44 | — |
| apogée | 3,8 | 3 intercepteurs (`lane`) et 2 mines (`ahead`) | 52 | — |
| apogée | 6,0 | 1 artilleur, `ring` | 52 | — |

- **Pourquoi c'est bien.** L'arène devient un lieu qui vit sans nous. Le décor tue ses propres ennemis, et
  traverser une voie devient une décision.
- **Défauts.**
  - Aucune annonce d'entrée : le champ `r.warn` est posé à 0 et jamais lu (l. 1141). Un convoi est visible
    depuis 2,2 s en médiane, mais depuis 0,77 s seulement au p10 (audit).
  - Le convoi causait 16 % des coups, 24 à 27 % aux niveaux 2 et 4 (audit).
  - La mécanique ne fait que punir : rouler dans une voie n'apporte rien.
- **Idée écrite mais jamais codée (ENN-7).** Annonce 1,2 s avant l'entrée : le bord de la voie clignote du
  côté d'arrivée, avec une flèche et un son. Le SILLAGE : rester dans les 40 u derrière un convoi donne un
  boost × 1,4 qui ne vide pas la réserve, + 0,5 au multiplicateur toutes les 2 s, et les ennemis broyés
  pendant ce temps comptent double. Et pas deux coups du même convoi à moins de 1,5 s d'écart.
- **En mieux dans 2975.** Le chapitre 2, avec annonce et SILLAGE, dans le monde plus grand que l'écran du
  retour n° 3 : 5 voies de 48 px dans un monde d'environ 520 px de haut *(conversion)*. Dans la palette :
  caisses en sang, arêtes magenta, museau rose pâle qui pulse sous 3 Hz, voies en indigo et violet. Les
  phares deviennent le télégraphe : un cône tramé magenta qui avance devant le convoi.

### I-48 · ZONE MAGNÉTIQUE (secteur 3) : attracteurs et répulseurs

- **Quoi (code).**
  - **Nœuds** : 4 nœuds, attracteurs et répulseurs en alternance (+ 1 tous les deux cycles, 9 au plus), de
    rayon 190 à 300 u (+ 3 % par cycle), de force 0,8 à 1,15. Ils dérivent à 26 u/s (× 0,6 à 1,4) et
    rebondissent sur les bords.
  - **Force** : (1 − d / r)² × signe × force, vers le nœud ou à l'opposé.
  - **Effets** : elle courbe le CAP du serpent (jamais sa position) à 1,55 rad/s au plus × l'intensité du
    champ. Elle courbe les balles de la joueuse (1 150 u/s², vitesse conservée) et celles des ennemis
    (820 u/s²). Elle fait dériver les ennemis à 62 u/s, tant qu'ils sont moins de 110.
  - **Cœur de l'attracteur** (0,15 r + rayon de la tête) : il brûle, 1 segment, et réoriente la tête vers
    l'extérieur. Une alerte s'allume à 0,4 r.
  - **Dessin** : de la limaille (un segment orienté par le champ à chaque nœud de la grille de 96 u, bleu
    pour attirer, ambre pour repousser), des anneaux qui se resserrent (attraction) ou s'ouvrent
    (répulsion), une couronne pleine pour l'attracteur et éclatée en trois arcs pour le répulseur, un liseré
    rouge quand la tête approche d'un cœur.
  - **Consigne** : « BLEU ATTIRE, AMBRE REPOUSSE ». Modificateurs : GARDE, SAUTEUR, RÉGÉNÈRE. Boss : NOYAU
    MAGNÉTIQUE.
- **Vagues (code).**

| Phase | Toutes les (s) | Composition et motif | Plafond | Élite, modificateurs |
|---|---|---|---|---|
| calme | 4,0 | 2 traqueurs, `ring` | 22 | — |
| calme | 8,0 | 1 parasite, `edge` | 20 | — |
| montée | 3,4 | 3 traqueurs (`ring`) et 1 parasite (`flank`) | 36 | — |
| montée | 5,6 | 1 parasite (`flank`) et 2 traqueurs (`ring`) | 34 | 5 %, GARDE |
| montée | 9,0 | 1 miroir, `ahead` | 32 | — |
| montée | 6,5 | 1 artilleur, `flank` | 32 | — |
| déferlante | 2,8 | 5 larves (`pack`) et 2 traqueurs (`edge`) | 54 | — |
| déferlante | 4,4 | 2 parasites (`flank`) et 2 mines (`ahead`) | 52 | — |
| déferlante | 6,0 | 1 brouilleur, `edge` | 50 | 10 %, GARDE ou RÉGÉNÈRE |
| déferlante | 7,4 | 1 miroir (`ring`) et 3 larves (`pack`) | 48 | 8 %, SAUTEUR |
| déferlante | 5,0 | 2 artilleurs, `ring` | 48 | 6 %, SAUTEUR |
| apogée | 3,6 | 6 larves (`pack`) et 2 parasites (`flank`) | 56 | — |

- **Pourquoi c'est bien.** Une arène qui courbe les règles, les tirs des deux camps compris. La limaille
  rend un champ invisible lisible en permanence.
- **Défauts (audit).**
  - C'est un décor, pas une règle : à mi-rayon, le champ tourne le serpent de 10° en 0,5 s, contre 264°/s
    de contrôle propre.
  - Les nœuds couvrent 15 à 18 % de l'arène et ne causent que 1 % des coups.
  - Au niveau 3, 79 % des coups étaient des balles.
- **Idée écrite mais jamais codée (ENN-8).**
  - Courbure de 2,4 rad/s à moins de 0,6 r d'un attracteur, balles courbées deux fois plus.
  - Le cœur ne blesse plus d'un coup : il **capture** (1 segment arraché toutes les 0,5 s, sortie en
    boostant).
  - Traverser la couronne d'un répulseur vers l'extérieur fait une **fronde** : vitesse × 1,6 pendant
    0,6 s, 0,3 s d'invulnérabilité.
  - Les ennemis exploitent le champ : les pondeuses s'ancrent aux répulseurs, les artilleurs tirent à
    travers les attracteurs, les mines dérivent vers eux.
  - Nouvelle consigne : « CYAN CAPTURE, AMBRE PROPULSE ».
- **En mieux dans 2975.** Le cyan est réservé à la joueuse et l'ambre au butin : les deux pôles ne peuvent
  plus se distinguer par la couleur. Seul le cœur de l'attracteur blesse, il est donc seul en magenta.
  Tout le reste du champ se dessine en violet et en indigo : anneaux qui convergent pour attirer, qui
  divergent pour repousser, couronne pleine ou éclatée, comme 2030. La consigne devient « LES ANNEAUX QUI
  RENTRENT ATTIRENT ». Prendre la version ENN-8 (capture, fronde), qui fait du champ une règle.

### I-49 · SURCHARGE (secteur 4 et suivants) : tout à la fois, sans fin

- **Quoi (code).**
  - 3 voies longitudinales (18, 50 et 82 %, hautes de 156 u, convois de 240 à 380 u/s) et des voies
    TRANSVERSALES (1 + 1 tous les deux cycles, 3 au plus) : l'arène devient un carrefour.
  - 3 nœuds (+ 1 tous les deux cycles), qui dérivent 1,5 fois plus vite.
  - Des bandes diagonales qui balaient le fond.
  - Une palette qui tourne à chaque cycle entre trois variantes (magenta, bleue, rouge-ambre).
  - Tous les modificateurs. Bannière « SURCHARGE n ». Boss SURCHARGE.
- **Vagues (code).**

| Phase | Toutes les (s) | Composition et motif | Plafond | Élite |
|---|---|---|---|---|
| calme | 3,4 | 3 traqueurs (`ring`) et 1 intercepteur (`lane`) | 26 | — |
| calme | 6,5 | 2 mines, `ahead` | 24 | — |
| montée | 3,0 | 3 intercepteurs (`lane`) et 1 trancheur (`flank`) | 44 | 8 % |
| montée | 5,0 | 2 parasites (`edge`) et 2 traqueurs (`ring`) | 42 | — |
| déferlante | 2,5 | 4 traqueurs (`ring`) et 4 larves (`pack`) | 64 | 12 % |
| déferlante | 3,8 | 2 trancheurs (`flank`) et 2 intercepteurs (`lane`) | 62 | 12 % |
| déferlante | 5,2 | 1 brouilleur, 1 miroir et 2 traqueurs | 60 | 14 % |
| déferlante | 4,6 | 2 artilleurs, `ring` | 60 | 14 % |
| déferlante | 7,0 | 1 pondeuse et 1 voleur, `edge` | 58 | — |
| apogée | 3,2 | 4 traqueurs (`ring`), 2 intercepteurs (`lane`), 4 larves (`pack`) | 70 | 10 % |
| apogée | 6,0 | 1 artilleur, `ring` | 70 | 10 % |

- **Pourquoi c'est bien.** La recombinaison de tout ce qu'on a appris : un mode sans fin pour les meilleures
  joueuses.
- **Défauts.** C'est le même secteur à chaque cycle, avec une montée surtout chiffrée (section 7) et le
  même boss.
- **En mieux dans 2975.** Le chapitre 4 (Surtension) pour la combinaison des règles d'arène, et le mode
  SURCHARGE ouvert par les boss (G-10). Il reprend les cycles de 2030 en y ajoutant les événements d'arène
  (I-57) et la rotation des boss (I-35).

### I-50 · Un décor qui suit l'intensité

- **Quoi (code).**
  - 5 halos de fond (rayon 340 à 640 u) qui respirent, plus forts avec l'intensité ;
  - une grille fine et une grille forte (une ligne sur quatre, de plus en plus visible) ;
  - une onde de balayage qui allume les nœuds (secteurs 1 et 4) ;
  - 150 grains de poussière en parallaxe (× 0,10) ;
  - une brume de la couleur du secteur (0,10 à 0,15 + 0,05 × intensité) ;
  - des traits de vitesse sur l'autoroute ;
  - de la limaille et 56 particules aimantées dans le champ ;
  - des bandes diagonales en surcharge.
- **Pourquoi c'est bien.** Le décor dit l'intensité sans un mot. C'est le contraire du « triste ».
- **Défauts.** Le décor de 2030 est un plan unique, plus une poussière à 10 % de parallaxe.
- **En mieux dans 2975.** Les plans de parallaxe du retour n° 3 : l'illustration `horizon` (512 px de large,
  faite pour défiler), une cité au loin, des structures au milieu, la grille au sol. Leur animation suit
  l'intensité : onde de balayage, impulsions de données plus nombreuses (la démo en a déjà sur sa grille).
  Le tout dans le respect de V-09 : derrière l'arène, seulement vide, nuit, ardoise et indigo, ou du violet
  tramé, pour que le magenta des menaces garde 3:1.

### I-51 · La vignette de danger

- **Quoi (code).** Un voile rouge pulsé s'allume sur les bords de l'écran quand un convoi fonce vers la
  tête à moins de 400 u, quand la tête approche d'un cœur d'attracteur (à 0,4 r), quand le serpent n'a plus
  que 3 segments, et au moins à 0,16 pendant tout combat de boss (opacité au plus 0,5).
- **Pourquoi c'est bien.** Une alerte de périphérie qui ne cache rien au centre.
- **En mieux dans 2975.** Un cadre tramé en sang qui s'épaissit d'un pixel par cran de danger, et qui bat
  sous 3 Hz (V-20). Avec une vraie mort (retour n° 4), il annonce le dernier avertissement.

---

## 7. Difficulté et progression (I-52 à I-55)

### I-52 · Cinq crans nommés

- **Quoi (code).** FACILE 1,25, NORMAL 1,55 (par défaut), DIFFICILE 1,90, BRUTAL 2,30, SUICIDE 2,75. Le cran
  m agit :
  - sur les ennemis : PV × m^0,5, dégâts × m^0,35, allure × (1 + 0,1 × (m − 1)) ;
  - sur les niveaux : intervalles des vagues ÷ m^0,85 (− 31 % au cran NORMAL), plafonds × m^0,55
    (+ 27 %).

  « La difficulté resserre les salves et relève le plafond : c'est là qu'elle se sent le plus, bien avant
  les points de vie. »
- **Pourquoi c'est bien.** La difficulté joue d'abord sur la densité, que l'on voit, et pas sur des
  chiffres cachés. L'échelle a été retaillée sur des survies mesurées.
- **En mieux dans 2975.** Pas de sélecteur avant de jouer (voir l'inventaire du cœur, K2). Garder la leçon :
  la pression passe d'abord par la densité et la cadence.

### I-53 · Le directeur de difficulté par secteur

- **Quoi (code, `10-core.js`).** Pour les ennemis ordinaires et les élites hors boss :
  - PV × 2,60^(secteur − 1) × (1 + 0,04 × cycle) ;
  - dégâts × (1 + 1,90 × (secteur − 1) + 0,10 × cycle) ;
  - allure × min(1,60 ; 1 + 0,16 × (secteur − 1) + 0,03 × cycle) ;
  - XP × (1 + 0,15 × (secteur − 1)).

  Calcul pour un traqueur au cran NORMAL : 11 PV au secteur 1, 29 au secteur 2, 74 au 3, 201 au 4, 543 au 5.
  Ses dégâts passent de 1 à 3, 5, 7 puis 9 segments.
- **Pourquoi c'est bien.** Il répond à une mesure : une pente de + 8 % par secteur « ne fait rien » face à
  une puissance de feu de 3 400 PV/s ; avec elle, dix parties sur dix atteignaient le plafond de 10 minutes.
  Le directeur fait basculer le bilan vers 550 s de partie.
- **Défauts.**
  - Une difficulté par inflation : des ennemis éponges et des chiffres qui ne disent rien à l'œil.
  - Des coups de 6 à 12 segments passé le secteur 4.
  - Une incohérence : les souffles (mine, INSTABLE) et les dangers d'arène (convoi, nœud) restent à 1 ou
    2 segments, alors que le contact monte jusqu'à 18.
- **En mieux dans 2975.** Le retour n° 2 demande « de vraies pressions, de vrais dangers, une maîtrise qui
  se mérite ». La pression vient donc de ce que la joueuse VOIT :
  - plus d'ennemis, avec des plafonds plus hauts que ceux de la démo ;
  - des types plus retors à chaque chapitre (dard, lame, tique, miroir) ;
  - des formations ;
  - des modificateurs combinés aux chapitres 4 et 5 ;
  - une règle d'impact où la tête est mortelle (I-06).

  Les PV ne montent que modérément, pour garder la sensation de puissance. La campagne s'équilibre par
  simulation à graine fixe (inventaire du cœur, J2).

### I-54 · Les cycles de surcharge

- **Quoi (code), par cycle.**
  - Cadence des vagues × max(0,30 ; 1 − 0,055 × cycle).
  - Plafonds + min(80 ; 6 × cycle).
  - Vagues plus nombreuses : + 1 ennemi au cycle 3, + 2 au cycle 6, + 3 dès le cycle 9.
  - Élites + 3 % ; modificateurs sur les ordinaires + 2 %.
  - Phases plus courtes : − 4 %.
  - Un boss de plus tous les deux cycles (4 au plus), PV des boss × (1 + 0,22 × cycle).
  - Plus de nœuds, plus de convois, plus de voies transversales.
  - Multiplicateur de score plafonné à 16 au lieu de 12.
- **Pourquoi c'est bien.** Une surenchère qui combine des règles connues au lieu d'en inventer.
- **En mieux dans 2975.** Les règles du mode SURCHARGE ouvert par chaque boss (G-10), complétées par des
  modificateurs NOMMÉS et choisis, qui multiplient la récompense (inventaire du cœur, K2).

### I-55 · Le score indexé sur le cran

- **Quoi (code).** Score × 0,8, 1, 1,25, 1,6 ou 2,0 selon le cran, et un record par cran.
- **En mieux dans 2975.** Indexer le score sur les modificateurs choisis du mode SURCHARGE plutôt que sur
  un cran.

---

## 8. Idées liées hors de ces deux fichiers, ou écrites mais jamais codées (I-56 à I-59)

### I-56 · Le treillis, vu par les ennemis (`27-phases.js`)

- **Quoi.** Pendant les phases de mise en scène, un treillis de rails (pas de 165 u, droit ou en
  diagonale) canalise serpent et ennemis sur quatre caps. Le trancheur choisit alors les rails
  perpendiculaires au serpent.
- **Défauts (audit).** Sur rails : + 28 % de coups reçus et − 25 % de kills, sans aucune règle nouvelle
  pour les ennemis ; un seul traqueur sur dix partageait le rail de la tête.
- **Idée écrite mais jamais codée (ENN-9).** Le duel Tron : tant que le treillis est actif, tout ennemi qui
  percute un anneau à partir du 4e est détruit (score × 2). Les traqueurs coupent la route 300 u devant la
  tête par les rails perpendiculaires.
- **En mieux dans 2975.** La recherche interdit les virages différés à un nœud (J-06). Garder l'idée sans
  les rails : un événement d'arène « CORPS-MUR » *(proposé)*, pendant lequel le corps tue les ennemis qui le
  percutent.

### I-57 · Les événements d'arène (ENN-14, jamais codé)

- **Quoi.** Un événement toutes les 30 à 40 s hors climax, annoncé 2 s avant par une bannière et le cadre
  qui clignote, et qui dure 12 à 18 s :
  - COUPURE : le fond s'éteint ; seuls la tête, les télégraphes et les balles restent lumineux ;
  - CONTRESENS : toutes les voies s'inversent, convois et sillage × 2 ;
  - INVERSION : la polarité de tous les nœuds s'inverse ;
  - GRAVITÉ : un attracteur géant au centre, tout s'agglutine, et les kills s'enchaînent ;
  - PLUIE DE MINES : 12 mines tombent sur une grille de marqueurs affichés 1,5 s autour de la tête.

  En surcharge, deux événements peuvent se cumuler à partir du cycle 3.
- **Pourquoi c'est bien.** Le niveau change de règle pendant qu'on le joue. C'est un remède direct à
  « basique ».
- **En mieux dans 2975.** COUPURE est faite pour les gros pixels et la palette fermée : tout le décor passe
  en nuit profonde, seuls le cyan et le magenta restent. PLUIE DE MINES fait un pic connu (G-07). Un
  événement par niveau au plus, aux chapitres 3 à 5.

### I-58 · Le codex et les trophées (ENN-15, jamais codé)

- **Quoi.** À la première rencontre d'un type, d'un modificateur ou d'un boss, le jeu ralentit à 0,5
  pendant 1,2 s et affiche deux lignes : la silhouette et la règle en une phrase (« TRANCHEUR — recule pour
  charger, vulnérable après sa traversée »). Un bestiaire, consultable depuis le menu, compte les rencontres,
  les kills et les coups reçus de chaque type. Chaque boss tué une première fois débloque une relique
  exclusive (LAME DU DOUBLE, NOYAU, PROTOTYPE).
- **Pourquoi c'est bien.** On apprend sans tutoriel, et une collection donne envie de revenir.
- **En mieux dans 2975.** Une carte de codex en gros pixels : sprite × 2 (échelle entière), nom en 5 × 7
  échelle 2, une ligne de règle (G-39 : trois lignes au plus, rien d'obligatoire pour jouer). Elle tombe
  dans une respiration, jamais au milieu d'un pic.

### I-59 · Ennemis et modificateurs proposés mais jamais codés (ENN-13)

- **Quoi.**
  - **SENTINELLE** (L2+, 60 PV, immobile) : un faisceau tourne sur 360° en 6 s, précédé de 1 s par une
    ligne pâle, et coupe le corps : il faut planifier son trajet.
  - **FAUCHEUR** (L3+, 40 PV) : il suit le chemin du serpent jusqu'à la queue et arrache 1 segment toutes
    les 1,2 s ; il meurt au contact de la tête, il faut donc se retourner.
  - **Modificateur MAGNÉTIQUE** : un champ de 120 u qui courbe les balles autour de lui ; il faut viser à
    côté.
  - **Modificateur SPECTRAL** : invisible, sauf pendant ses annonces et à moins de 150 u de la tête.
  - Plus le miroir réfléchissant, la larve-essaim et le traqueur à ligne brûlante, déjà cités (I-09, I-15,
    I-19).
  - Rééquilibrage : aucun type au-delà de 25 % des apparitions ; voleur, miroir et brouilleur à 5 % au
    moins chacun à partir du niveau 3.
- **Pourquoi c'est bien.** Ce sont des rôles qui manquaient : un danger fixe à contourner (sentinelle), une
  menace dans le dos (faucheur).
- **En mieux dans 2975.** La démo a déjà une SENTINELLE : elle orbite autour de la tête à 78 px, vise
  0,85 s, puis tire un laser de 0,35 s qui traverse l'écran. Garder les deux : la sentinelle de la démo
  (tireur d'élite), et la tour tournante d'ENN-13 comme obstacle de chapitre 4. Le FAUCHEUR fait un très
  bon ennemi « qui fait peur » (retour n° 4) : il menace la queue, hors du champ de tir. SPECTRAL ne se
  justifie que s'il reste lisible (annonces pleines).

---

## 9. Traduire en gros pixels : échelle, palette, téléphone

### 9.1 L'échelle

- **2030.** Arène de 2 600 × 1 600 u, caméra qui suit la tête, vue de 1 316 × 600 u sur iPhone 13 paysage
  (audit), zoom de base 1,30 qui respire (× 1,54 puis × 0,77), bascule 3D.
- **2975 aujourd'hui.** Tampon de 422 × 195 px (pixel de 2), arène égale à l'écran : environ 362 × 159 px
  en paysage, 181 × 258 px en portrait, le quart bas laissé au pouce (calcul d'après `geom()`, iPhone 13).
  Le retour n° 3 abandonne cette arène fixe.
- **Rapport.** Environ 3,1 u par px (1 316 / 422 = 3,12 ; 600 / 195 = 3,08). L'arène 2030, convertie,
  ferait environ 840 × 516 px : 2,0 × 2,7 écrans. C'est une bonne taille de monde pour la caméra demandée.
- **Règle de conversion *(proposée)*.**
  - Les **durées** restent identiques : c'est d'elles que dépend la lisibilité.
  - Les **portées** se divisent par 3,1.
  - Les **vitesses** : diviser aussi par 3,1 reproduit l'échelle exacte de 2030 (serpent à 48 px/s).
    Garder le serpent de la démo à 64 px/s et multiplier les vitesses ennemies par 0,43 (= 64 / 150) donne
    un jeu un tiers plus nerveux que 2030, ce qui va dans le sens du retour n° 2.

| Grandeur 2030 | Valeur | En px (÷ 3,1, ou × 0,43 pour une vitesse) | Repère dans la démo |
|---|---|---|---|
| portée de bond du traqueur | 205 u | 66 px | flèche : 80 px |
| bond du traqueur (vitesse) | 218 u/s | 93 px/s | flèche : 155 px/s |
| fuseau de l'intercepteur | 360 u/s | 154 px/s | — |
| traversée du trancheur | 540 u/s | 230 px/s | — |
| cercle d'armement / souffle de mine | 132 / 140 u | 43 / 45 px | 34 / 28 px |
| bande de l'artilleur | 400 ± 90 u | 129 ± 29 px | tourelle en station |
| portée de balle d'artilleur | 506 u | 163 px | — |
| balle d'artilleur | 230 u/s | 98 px/s | tourelle : 74 px/s |
| larve, parasite, voleur (fuite), miroir | 134, 170, 215, 152 u/s | 57, 73, 92, 65 px/s | — |
| champ du brouilleur | 200 u | 65 px | — |
| distance gardée par la pondeuse | 430 u | 139 px | — |
| rayon d'un nœud magnétique | 190 à 300 u | 61 à 97 px | — |
| hauteur d'une voie | 148 u | 48 px | — |
| convois | 215 à 330 u/s | 92 à 141 px/s | — |
| retard du miroir | 1,5 s | environ 96 px derrière | — |

### 9.2 La palette fermée

- Le danger s'écrit en magenta, rose pâle et sang, gainés de nuit profonde. Le brasier est réservé aux
  explosions et aux « cœurs chauds », l'os au flash de frappe et au texte, le jaune au score, l'ambre au
  butin, le cyan à la joueuse seule, l'acier à l'interface.
- Il n'y a donc plus de familles de teinte, plus de six couleurs de modificateur, plus de pôles bleu et
  ambre. Tout passe par la forme, l'animation et le rythme : langage de formes (I-03), mini-silhouettes
  dans les portails (I-40), surcouches de modificateurs (I-21 à I-26), anneaux qui convergent ou divergent
  (I-48).
- Le magenta sur violet est à la limite (3,18:1, V-09). Le décor derrière les ennemis se limite à vide,
  nuit, ardoise et indigo, ou à du violet tramé.
- Pas plus de 3 flashs par seconde au-delà d'environ 74 × 74 px (V-19). Le chevron de boss de 2030
  (3 à 12 Hz) ne passe que parce qu'il est petit.

### 9.3 Le téléphone d'abord

- **Un pouce, tir automatique** (G-19) : aucun ennemi ne doit exiger une visée fine. Les contres passent par
  le déplacement (contourner la GARDE, écraser la tique, encercler le brouilleur).
- **Portrait et paysage** (J-12) : les voies suivent le grand axe de l'écran, et peu d'ennemis naissent par
  le bas en portrait.
- **Jouable sans le son** (G-35) : les bips de la mine deviennent un cœur qui clignote, le tic du portail un
  chevron.
- **Des niveaux de 2 à 3 minutes** (G-01) : les secteurs de 2030 (98 à 122 s, plus le boss) y tiennent.

### 9.4 Esquisse de répartition en cinq chapitres *(proposée)*

Elle suit la recherche (§ 3.1 et 3.2 : 5 chapitres de 4 niveaux et un boss, une nouveauté à la fois) et
l'ordre des secteurs de 2030. Les sprites qui existent déjà dans la démo sont marqués d'un astérisque.

| Chapitre | Règle d'arène (2030) | Ennemis introduits, dans l'ordre | Modificateurs | Formations | Boss (colosse*, phases selon G-06) |
|---|---|---|---|---|---|
| 1 Amorçage | LA GRILLE : arène nue, onde de balayage | flèche*, larves (essaim), mine* | BLINDÉ | MEUTE, CHAMP DE MINES | PROTOTYPE ZÉRO, 1 phase : bonds en éventail, mines à l'atterrissage |
| 2 Trafic | AUTOROUTE : voies, convois annoncés, SILLAGE | dard, lame, voleur | RAPIDE, INSTABLE | RAID | DOUBLE LAME, 2 phases : lames en ciseaux, convois lancés |
| 3 Pare-feu | ZONE MAGNÉTIQUE : capture et fronde | tourelle* (crochet), tique, brouilleur | GARDE, RÉGÉNÈRE | BATTERIE | NOYAU MAGNÉTIQUE, 2 phases et renforts : ancré, inversions de polarité |
| 4 Surtension | carrefour (voies et champs) et événements (COUPURE, PLUIE DE MINES) | ruche et nichées, sentinelle*, tour tournante | SAUTEUR, couples | ESSAIM | SURCHARGE, 3 phases tournantes |
| 5 Noyau | tout, événements cumulés | miroir, faucheur | tous, par couples | toutes, deux à deux | LE CYCLOPE, 3 phases et une finale qui rappelle les quatre boss |

---

## 10. Les dix idées les plus importantes de ce domaine, classées

1. **Un bestiaire de rôles qui jouent avec le serpent** (I-09 à I-19, I-59) : la lame qui coupe le corps,
   la tique qui s'y accroche, le dard qui vise où l'on va, le miroir qui rejoue la trajectoire, le voleur qui
   prend le butin, la ruche qui fait sa propre vague, le brouilleur qui coupe les armes. C'est le premier
   remède à « basique ».
2. **Des boss mis en scène ET chorégraphiés, un par chapitre** (I-27 à I-35) : portail long, silence,
   arrivée pilotée, ralenti, jauge nommée, escorte par paliers, enragement, récompense, plus les patterns
   propres écrits pour 2030 et jamais codés.
3. **Des chapitres à identité et à règle d'arène** (I-45 à I-50, I-57) : voies et convois qui broient,
   champs qui courbent tout, carrefour, événements, décor qui suit l'intensité et plans de parallaxe.
4. **Le rythme en cinq phases, avec respiration et purge** (I-36, I-37, I-44) : calme, montée, pic,
   respiration, apogée, purge ; fin sur le plus haut pic.
5. **La pression par le contenu et la densité, pas par l'inflation** (I-38, I-42, I-52 à I-54) : plafonds,
   cadences, formations, combinaisons ; la réponse au retour « trop facile ».
6. **Élites et modificateurs** (I-20 à I-26) : la variété par combinaison et un pic connu par niveau,
   nommé, lisible à la forme.
7. **La lisibilité totale** (I-01, I-02, I-40, I-41) : annonce de 500 ms au moins que rien ne raccourcit,
   armement seulement dans la vue, portails de 600 ms, vue anticipée, marqueurs au bord. Indispensable avec
   la caméra et la vraie mort demandées.
8. **La tête mortelle, le corps qui se coupe, et le crochet d'impact** (I-06, I-12, I-13) : une mort
   « lisible et juste, qui fait peur » (retour n° 4), et la longueur qui reste précieuse.
9. **Les réactions en chaîne et le tir ami du décor** (I-07, I-11, I-24, I-47) : mines, instables et
   convois retournés contre les ennemis ; du spectacle qui est aussi une tactique.
10. **Des vagues écrites, avec formations nommées et motifs d'arrivée** (I-38, I-39) : MEUTE, BATTERIE,
    CHAMP DE MINES, ESSAIM, RAID ; devant, flanc, anneau, grappe, voie.

## 11. Ce que la démo actuelle de SNAKE 2975 n'a pas

Démo lue : `src/70-game.js` (jeu) et `src/60-intro.js` (ouverture, interludes). « Partiel » : la démo en a
une version réduite.

| Idée 2030 | Dans la démo | Ce qui manque |
|---|---|---|
| Bestiaire de rôles (11 types) | 4 types : flèche (bond), mine (station, souffle de 28 px), tourelle (3 tirs puis change de place), sentinelle (laser) | dard, lame, ruche et larves, tique, brouilleur, voleur, miroir |
| Élites et modificateurs | aucun | l'élite (× 3 PV, sprite plus grand, couronne, nom) et 6 modificateurs |
| Boss | partiel : un colosse à 76 s, 120 PV, cycle radial / laser / radial / appel / laser / radial, plus dur sous 50 % des PV ; interlude ALERTE et télégraphe de 2,4 s | un boss par chapitre, des phases propres, l'escorte par paliers, l'enragement annoncé, le silence pendant l'arrivée, le ralenti, la jauge nommée, le nom propre (`transition('boss', {nom})` est prêt), la récompense qui dure |
| Rythme en 5 phases | non : montée continue par tranches de 20 s (2 → 9 ennemis visés en minute 1, 15 → 26 en minute 2), le directeur tourne même pendant le colosse | calme vrai, pic connu, respiration, apogée ; seule la purge finale existe |
| Secteurs et biomes | non : une arène, une grille violette, un décor | nom, consigne, variante de palette, plans de parallaxe, mécanique propre |
| Règles d'arène | aucune | voies et convois, sillage, champs (capture, fronde), carrefour, événements d'arène |
| Portails d'apparition | partiel : carré de 5 px pour un ennemi déjà sorti du tampon | chevron de 600 ms avec mini-silhouette, double pour une élite, triple pour le colosse, tic sonore |
| Motifs et formations | partiel : 1 à 4 flèches en ligne par un bord, les autres seules | 7 motifs, formations nommées et annoncées |
| Réactions en chaîne | aucune : les explosions sont visuelles, une mine n'endommage aucun ennemi | mines, instables et convois qui blessent les ennemis ; défi ARTIFICIER |
| Tête et corps, crochet d'impact | partiel : le corps absorbe dès le 2e segment, un choc coupe 30 % de la queue | le crochet d'impact ; une règle où le corps se coupe et où la tête meurt (retour n° 4) |
| Ennemis qui jouent avec le corps, la trajectoire, le butin | aucun | lame, tique, miroir, voleur, faucheur |
| Lisibilité « hors champ » | sans objet tant que l'arène est l'écran | indispensable avec la caméra du retour n° 3 : armement dans la vue, rallonge de 300 ms, chevrons, marqueurs, vue anticipée |
| Mort expliquée | partiel : le coupable est noté (`hitLog`) mais pas affiché | « DÉTRUIT PAR … » avec la silhouette |
| Difficulté qui monte | non : une seule courbe de 2 minutes, et des brides (deux charges au plus, aucune charge avant 25 s, mines qui attendent 15 s, choc qui fait taire les ennemis) | chapitres de plus en plus durs, formations, combinaisons, mode SURCHARGE (retour n° 2) |
| Vignette de danger | partiel : un trait de dégât orienté pendant 0,55 s | une alerte de périphérie avant le coup (convoi, cœur, dernier avertissement) |
| Codex de première rencontre | aucun | une carte d'une ligne par type nouveau, dans une respiration |
| Récompense de fin de niveau ou de boss | partiel : défi + 5 000, colosse + 10 000 et 24 cellules, purge | trophée, total persistant, étoiles, ouverture de la Surcharge |

**Ce que la démo fait mieux que 2030, à garder.** Le colosse de 49 px et son interlude (une présence que
PROTOTYPE ZÉRO n'a jamais eue). Le flash de coup sur la silhouette elle-même. La purge finale en chaîne. Le
pouce fantôme et le premier ennemi qui n'arrive qu'après le premier virage (J-14). La séparation des
flèches pour qu'elles ne s'empilent pas. Le vocabulaire de télégraphes en pixels (pointillés qui courent,
gaine de nuit profonde, disque tramé, silhouette qui se forme au seuil de Bayer).

---

## Annexe A — Défauts de code relevés à la lecture de `22-enemies.js` et `25-levels.js`

Ce sont des lectures du code, non des mesures : à confirmer en jeu avant d'en tirer des conclusions sur
2030. Ils servent surtout à ne pas les reproduire.

1. **Alerte rouge inversée** (l. 1235, 1247, 1304). `_enNear(rest)` attend le temps RESTANT avant
   l'impact (`rest <= 300`). Le traqueur, l'intercepteur et la mine lui passent le temps ÉCOULÉ
   (`lungeWind − stT`, `windMs − stT`, `fuse − stT`), car `stT` décompte jusqu'à zéro. Le télégraphe est
   donc rouge pendant les 300 PREMIÈRES ms, puis reprend la couleur de famille juste avant le coup. Le
   parasite (`_enNear(e.biteT)`) et l'artilleur (`aimT <= 300`) sont justes.
2. **Liseré d'enragement hors de place** (l. 2115-2123). Il est tracé par `ctx.arc(e.x, e.y, …)` APRÈS
   `ctx.translate(e.x, e.y)` : il tombe au double des coordonnées de l'ennemi, en général hors de l'écran.
   Il est de plus en blanc pur `#ffffff`, contre la règle du blanc réservé à la tête.
3. **Marqueur du SAUTEUR tourné sur bureau.** `_enModDraw` dessine la destination en repère local non
   tourné. Or le dessin du traqueur, de l'intercepteur, de la mine, de la larve, du parasite, du voleur et
   du trancheur (hors repos) laisse sa rotation en place. Sur téléphone, le `save` / `restore` de
   l'agrandissement × 1,15 masque le problème ; sur bureau, le marqueur est tourné de l'angle de l'ennemi.
4. **Annonces raccourcies par RAPIDE** (l. 660, 815) : intercepteur 312 ms, trancheur 360 ms, puis 270 ms
   pour DOUBLE LAME enragé (`cdScale` 0,6 × 0,75). Le commentaire du traqueur (« le mod RAPIDE […] ne
   raccourcit plus l'annonce ») n'a été appliqué qu'à lui.
5. **Ligne de bond trompeuse** (l. 1233 et 607) : la ligne fait 0,85 × 205 = 174 u, le bond environ 88 u
   au cran NORMAL (271 u en RAPIDE).
6. **Annonce des convois jamais écrite** : le champ `r.warn` est remis à 0 (l. 1141) et jamais lu.
7. **Promesse du miroir** (l. 1036-1037) : « on lui fait traverser ses propres alliés », mais aucun contact
   entre ennemis n'inflige de dégâts ; seuls les mines et les convois le blessent.
8. **Souffles et dangers d'arène hors du directeur** : `blastDmg` et `expDmg` valent 2, convoi et nœud 1,
   à tout secteur, alors que le contact atteint 9 à 18 segments au secteur 5.

## Annexe B — Calculs

Cran NORMAL : m = 1,55. Facteurs : PV × m^0,5 = 1,2450 ; dégâts × m^0,35 = 1,1658 ; allure × 1,055 ;
intervalles des vagues ÷ m^0,85 = 1,4514 (soit × 0,689) ; plafonds × m^0,55 = 1,273. Arrondis comme le
code (`Math.round` à chaque étape).

| Boss | Chaîne de calcul (PV) | Résultat |
|---|---|---|
| PROTOTYPE ZÉRO | 9 × 1,245 = 11 → élite × 3,2 = 35 → BLINDÉ × 2,4 = 84 → facteur 1,55 | **130 PV** |
| DOUBLE LAME (chacun) | 12 × 1,245 = 15 → × 3,2 = 48 → RAPIDE × 0,7 = 34 → facteur 14 | **476 PV**, 952 pour les deux |
| NOYAU MAGNÉTIQUE | 100 × 1,245 = 124 → × 3,2 = 397 → GARDE : bouclier 5 + 119 = 124 tirs → facteur 2,5 | **993 PV et 124 tirs de bouclier** |
| SURCHARGE, cycle 1 | 397 → modificateur (BLINDÉ 953 · RAPIDE 278 · INSTABLE 337 · RÉGÉNÈRE 516 · autres 397) → × 1,22 → × 2,5 | **848 à 2 908 PV** ; 1 boss au cycle 1, 2 au cycle 2, 3 au cycle 4, 4 au cycle 6 |

| Type (cran NORMAL) | Secteur 1 | Secteur 2 | Secteur 3 | Secteur 4 (cycle 1) | Secteur 5 (cycle 2) |
|---|---|---|---|---|---|
| traqueur : PV / dégâts | 11 / 1 | 29 / 3 | 74 / 5 | 201 / 7 | 543 / 9 |
| artilleur : PV / dégâts | 22 / 1 | 57 / 3 | 149 / 5 | 402 / 7 | 1 086 / 9 |
| pondeuse : PV / dégâts | 124 / 2 | 322 / 6 | 838 / 10 | 2 267 / 14 | 6 120 / 18 |
| allure (tous) | × 1 | × 1,16 | × 1,32 | × 1,51 | × 1,60 (plafond) |

| Cycle de surcharge | 1 | 3 | 5 | 10 | 13 et plus |
|---|---|---|---|---|---|
| cadence des vagues | × 0,945 | × 0,835 | × 0,725 | × 0,45 | × 0,30 (plancher) |
| plafonds | + 6 | + 18 | + 30 | + 60 | + 78 à 80 |
| ennemis de plus par groupe | 0 | 1 | 1 | 3 | 3 |
| durée des phases (hors apogée et nettoyage) | × 0,96 | × 0,88 | × 0,80 | × 0,65 | × 0,65 |
| chance d'élite / de modificateur ordinaire | + 3 % / 12 % | + 9 % / 16 % | + 15 % / 20 % | + 30 % / 30 % | + 39 % / 36 % |

Autres calculs cités : bond du traqueur = 104 × 1,055 × 2,1 × 0,38 = 87,6 u ; fuseau de l'intercepteur =
360 × 0,52 = 187 u ; traversée du trancheur = 540 × 0,82 = 443 u ; portée de l'artilleur = 230 × 2,2 =
506 u ; conversion des vitesses = 64 / 150 = 0,427.
