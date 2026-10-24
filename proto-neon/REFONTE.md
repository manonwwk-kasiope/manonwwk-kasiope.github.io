# SNAKE 2975 — plan de refonte

*Plan du directeur de jeu, 17 octobre 2026, deuxième version. Il s'appuie sur les retours de la
propriétaire (`refonte/RETOURS-PROPRIETAIRE.md`), les trois audits de la démo, les quatre inventaires de
SNAKE 2030, les leçons de son audit, la comparaison jouée, les deux études sur la quintessence des années
80 et les 115 exigences de `recherche/`. Cette version répond aux deux relectures indépendantes de la
première (notes 6,5 et 6 sur 10) : la section finale, « Réponses aux critiques », dit pour chaque point ce
qui a été fait, ou pourquoi il ne l'a pas été.*

**Ce document suffit pour construire le jeu.** Une équipe d'agents n'a besoin que de trois textes : ce
plan, `DIRECTION.md` et `CONTRAT.md`. Quand ce plan contredit l'un des deux autres, c'est ce plan qui
l'emporte. Le lot 0 reporte les amendements dans ces deux fichiers avant que le travail parallèle ne
commence (§ 0.2, § 7 et § 8).

**Ordre d'autorité.** On applique d'abord les retours de la propriétaire, y compris ceux qu'elle donnera
aux deux jalons de jeu (§ 8.4), puis ce plan, puis `DIRECTION.md` et `CONTRAT.md`, puis les exigences J-,
G- et V- de `recherche/`. Les quatre retours tiennent en une ligne : le jeu doit être moins triste et moins
basique, plus dur, avec une parallaxe et un plateau qui se déplace, et on doit pouvoir y mourir ; il doit
reprendre la majeure partie des idées de SNAKE 2030, en mieux.

**Unités et conventions.**

- Un « px » est un pixel de jeu, c'est-à-dire un pixel du tampon basse résolution : sur iPhone 13 en
  paysage, il vaut 2 points d'écran. Le « monde » se mesure lui aussi en px. Un « pt » est un point CSS.
- **Les durées sont en secondes de temps de jeu** (`N.horloge`, § 7.2). Quand un gel est donné « en
  images », c'est en images de référence de 1/60 s, converties en secondes : un gel de 6 images dure
  0,1 s, quelle que soit la cadence réelle.
- **Les segments sont numérotés à partir de 0** : la tête est le segment 0, le corps va de 1 à L − 1, où L
  est la longueur. « Segment 6 et plus » veut donc dire « le sixième segment derrière la tête, et au-delà ».
- Tous les chiffres sont des valeurs de départ : le lot 9 les règle avec les pilotes automatiques, sans
  jamais affaiblir un critère d'acceptation (§ 8.5). Les critères marqués **[U]** se vérifient sur la page
  d'essai du lot, seul ; ceux marqués **[I]** ne se vérifient qu'après intégration, par le lot 9.

---

## 0. Les décisions qui tranchent

### 0.1 Ce que la refonte change, en seize décisions

1. **On peut mourir.** La tête meurt au contact :
   - d'un mur, fixe ou mobile ;
   - de son propre corps (segment 6 et plus, sauf les trois derniers, qui ferment le LASSO) ;
   - d'un ennemi ;
   - d'un tir, d'un laser, d'un souffle, d'un convoi ou de la traînée du RIVAL.

   Il y a trois vies en tout, une seule vie bonus, et la vie perdue n'est suivie d'aucune onde de choc.
   Le corps ne protège plus : un tir qui le touche le coupe à cet endroit. Mourir coûte la moitié de sa
   longueur et un palier de sa meilleure arme.
2. **Le jeu est lumineux.** Le décor de jeu reprend la lumière de l'ouverture que la propriétaire a aimée :
   un grand soleil en bandes jaune, ambre et brasier, une cité dont les enseignes tournent, un sol qui
   reflète le soleil. **Au moins 25 % des pixels sont lumineux dès la première seconde**, et la part monte
   avec la partie (§ 5.2). Le décor se tait par la forme et par le contour, jamais par l'extinction.
3. **Le monde dépasse l'écran.** Il mesure 1 024 × 512 px, soit environ 2,4 × 2,6 écrans en paysage. Une
   caméra suit la tête et anticipe son cap. Derrière le plateau de jeu défilent six plans de parallaxe et un
   sol en perspective calculé ligne par ligne, construits à partir de `horizon`, `exterieur`, `affiche` et
   `boss`.
4. **Le plateau se déplace pour de vrai, dès la deuxième vague.** Le sol avance au tempo dès la première
   seconde. À partir de la vague 2, l'arène elle-même voyage : ses murs, mortels, glissent à travers le
   monde, et le mur arrière pousse la joueuse en avant (le TRAVELLING, § 4.6). En vague 4, des CONVOIS
   balaient des voies annoncées. Au CYCLOPE, les murs se resserrent.
5. **On vole.** Entre deux vagues, le serpent plonge vers le quartier suivant en vue de poursuite, à la
   Space Harrier, pendant 4 s : LE VOL (§ 3.9). Il passe des portes, ramasse l'énergie et évite les mines,
   tout en pixels entiers.
6. **Chaque vague a son quartier.** Docks, artère, centrale, ciel, tours, cœur : chaque vague change la
   silhouette de la cité, la lumière et la table de couleurs. C'est le changement d'ambiance de SNAKE 2030,
   en mieux, à l'intérieur d'un seul secteur.
7. **Un secteur complet et rejouable** d'environ 6 minutes : cinq vagues nommées, une étape bonus (LE
   DÉFILÉ) et un boss en trois phases, LE CYCLOPE. On gagne en détruisant le colosse.
8. **On fait des choix.** L'énergie donne de l'expérience, et chaque vague nettoyée donne une carte. Entre
   deux vagues, on choisit des cartes. L'arsenal compte six armes à quatre paliers, dix passifs et trois
   pouvoirs, en tout 19 cartes. Les armes se voient sur le corps.
9. **Le chassé devient chasseur.** Une fois par vague, une PASTILLE apparaît sur le radar. Avalée, elle
   retourne la chasse pendant quelques secondes : les ennemis fuient et la tête les dévore (l'INVERSION,
   § 2.17, d'après Pac-Man).
10. **Les verbes.** Diriger ; accélérer en poussant le manche droit devant soi ; déclencher un pouvoir et
    l'APOGÉE d'un second doigt ; et **encercler** : le LASSO est le verbe du serpent (§ 2.12). Les gestes
    ne se confondent jamais (§ 2.16).
11. **Le bestiaire.** Neuf ennemis ont des rôles distincts, dont le RIVAL, un serpent magenta qui suit les
    mêmes règles que la joueuse. S'y ajoutent le TRAQUEUR contre l'attente, les planeurs du DÉFILÉ, trois
    élites nommées avec trois modificateurs, et des formations annoncées.
12. **La musique de la propriétaire devient la musique du jeu.** C'est « Neon Velocity », à 144,6 BPM.
    Elle est découpée en blocs de 8 mesures et réenchaînée sur la mesure selon l'action. Le moteur génératif
    joue au-dessus pour les couches, les accents et les sons, et il prend la relève si la piste manque.
13. **La mort est un moment.** Elle dure 1,3 s : gel, cause entourée, désintégration, coupure de la
    musique, puis READY si une vie reste, ou extinction du tube et SIGNAL PERDU si c'était la dernière.
14. **On a une raison de revenir.** L'énergie ouvre des déblocages, et l'écran de fin montre le prochain
    avec sa barre. Les défis changent chaque jour, et chaque vague a le sien. L'écran de fin dit qui a tué,
    montre le build, la progression et l'écart. Un tableau des dix records avec initiales, et un seul
    CONTINUER par partie.
15. **La propriétaire joue deux fois avant la fin.** Une tranche jouable sur son iPhone après le premier
    tiers du travail (JALON A), puis le secteur complet avant le jury (JALON B). Son verdict passe avant la
    suite (§ 8.4).
16. **On mesure, et l'on assemble sur un contrat.** Huit pilotes automatiques à graine fixe jouent le jeu,
    et les critères du § 8.5 sont chiffrés. Un contrat d'intégration figé au lot 0 (événements, schémas,
    temps, hasard, journal, états) permet à huit agents de travailler en parallèle sans se marcher dessus
    (§ 7).

### 0.2 Amendements à DIRECTION.md (le lot 0 les y reporte)

| Article de DIRECTION.md | Nouvelle règle |
|---|---|
| « Deux minutes de jeu, une seule scène » | Un secteur de 5 min 20 à 6 min 30, de l'éveil à la mort du CYCLOPE, en six quartiers. Il faut pouvoir le rejouer et le perdre. |
| « La musique est générée, pas jouée. Aucun fichier audio » | La musique de jeu est la piste de la propriétaire (`snake2030/neonvelocity-2.mp3`), découpée en blocs MP3 sous `proto-neon/musique/` et chargée à la demande par `30-music.js`. Le moteur génératif reste en place pour les couches, les accents, les sons, la voix et le repli. La règle d'or devient : aucune **mesure complète, toutes couches confondues**, n'est identique trois fois de suite. |
| Interdits : « Un seul fichier » | Le jeu est un bundle HTML, plus deux dossiers chargés à la demande : `musique/` (blocs MP3 et `piste.json`) et `cine/` (clips). `node build.mjs --embed` produit le fichier unique, autonome, où tout est inline. Aucune dépendance externe, toujours. |
| Critère 3, « cyan réservé » | Le masque de la joueuse comprend son arsenal (tirs, tourelles, drones, missiles, mines de queue, lasso, traînée) et ses icônes de vie. Le masque est produit par le jeu lui-même (`__N.game.dbg.masque()`, § 7.12). |
| Critère 6, « montée monotone par tranches de 20 s » | Il est remplacé par trois exigences. Le pic d'ennemis vivants croît d'une vague à l'autre. Après chaque pic, les ennemis vivants restent sous 40 % de ce pic pendant au moins 8 s (G-17). La musique monte d'au moins 6 dB entre le calme et le chaos, avec une corrélation tension ↔ niveau d'au moins 0,5. |
| Critère 7, performance | La mesure se fait **avec** la parallaxe complète, sur la scène de référence la plus chargée (`charge`, § 7.12), au profil iPhone 13 ×1 sans qualité adaptative (p95 ≤ 11 ms en émulation), au profil processeur ×4 avec la qualité adaptative, et sur le vrai iPhone de la propriétaire aux jalons (§ 8.4). |
| Nouveau critère, « lumière » | En jeu, au moins 25 % des pixels du tampon ont une luminance relative supérieure à 0,10, et la part monte avec l'état du décor (§ 5.2). |
| Point 1 de « Ce que le prototype doit montrer » | L'ouverture garde ses panneaux. On ajoute devant un écran « TOUCHE POUR COMMENCER », et derrière une plongée dans le monde de jeu (§ 5.6). |
| Point 5, « un défi nommé » | Trois défis par partie, dont FINIR, et deux tirés chaque jour dans une réserve de douze ; plus un défi par vague (§ 2.14). |
| Écart J-17 (écran de fin en moins d'1 s) | La propriétaire demande une mort « qui fait peur » : la séquence dure 1,3 s, sautable dès 0,5 s. G-02 reste en vigueur : la joueuse peut avoir de nouveau le serpent en main moins de 2 s après l'impact. |

Le reste de `DIRECTION.md` est maintenu : gros pixels réels, palette fermée de seize couleurs, tramage de
Bayer, cyan réservé à la joueuse, 60 i/s sur iPhone 13, interdits, son forcé malgré l'interrupteur
silencieux au premier geste.

### 0.3 Écarts assumés aux exigences de `recherche/`

- **J-17** : la mort dure 1,3 s, voir ci-dessus.
- **J-07** (« aucune action n'exige deux doigts ») : le pouvoir et l'APOGÉE se déclenchent d'un second
  doigt, pour qu'aucun recentrage du pouce ne les lance par erreur (§ 2.16). L'esprit de J-07 et de G-19 est
  tenu de trois façons : le secteur se gagne en ne faisant que diriger ; l'accélération reste au pouce ; et
  le réglage ACTIONS AUTO déclenche pouvoir et APOGÉE à la place de la joueuse qui joue d'une main.
- **V-17** (choisir entre glisser et croix virtuelle) : on garde le seul manche flottant, que la démo fait
  bien. Sa taille est réglable, comme le demande J-32.
- **V-25** : le portrait est une vraie mise en page, il n'invite pas à tourner le téléphone. Cela suit J-12.
- **V-34 et J-20** (son muet en silencieux par défaut) : on garde l'écart déjà acté par `DIRECTION.md`.
- **V-36** (pas de fichier audio) : levé par le § 0.2.
- **G-18** (aide après trois morts) : reportée à la campagne (§ 9).
- **G-06, G-08, G-09, G-10, G-25 et G-38** relèvent de la campagne. Le prototype en pose les fondations
  (§ 9) et en livre quatre : la reprise au CYCLOPE (G-08), les défis du jour (G-09, sous une forme légère),
  le mode SURCHARGE après la victoire (G-10) et les déblocages par l'énergie (G-04, G-05).

### 0.4 L'ordre de priorité, si le temps manque

Un intégrateur seul doit pouvoir arbitrer. Tout ce qui est en P1 doit être là au JALON B ; ce qui est en P3
se coupe en premier.

| Priorité | Contenu |
|---|---|
| **P1, l'effet** | décor lumineux et parallaxe ; mort, coupe et réapparition ; LASSO ; gestes sûrs ; les cinq vagues et leurs quartiers ; TRAVELLING ; LE VOL ; INVERSION ; CONVOIS ; LE CYCLOPE ; la piste de la propriétaire et les sons de base ; cartes (au moins les 6 armes, 6 passifs et TRAVERSÉE) ; écran de fin avec cause, build et prochain déblocage |
| **P2, la profondeur** | LE RIVAL ; LE DÉFILÉ ; les 19 cartes ; défis du jour et défis de vague ; records et initiales au doigt ; déblocages complets ; SURCHARGE ; codex en jeu |
| **P3, l'écrin** | voix de la machine ; mode attraction ; galerie des ennemis ; styles de traînée ; saisie des initiales à la manette ; capuchons de touches au bureau |

---

## 1. La vision en dix lignes : la première partie, minute par minute

1. **0:00.** Un toucher, et le logo SNAKE 2975 s'allume sur l'intro calme du morceau de la propriétaire.
   L'ouverture raconte l'éveil du serpent en 12 s ; un toucher la saute.
2. La caméra plonge dans l'horizon : un soleil énorme en bandes jaune, ambre et brasier, les grues des
   DOCKS en contre-jour, un sol qui reflète l'or et file vers la joueuse au tempo. READY!, puis GO! tombe
   sur le décollage du morceau (mesure 11). Le monde déborde de l'écran de tous côtés, et l'écran est
   lumineux comme l'affiche.
3. **0:03.** Un pouce fantôme montre le geste. On tourne. Un chevron s'allume au bord, une FILE de trois
   flèches entre, le canon les fauche. Sous le score : « ×2 DANS 3 ».
4. **0:10.** Une NUÉE de larves arrive. On boucle autour d'elles, la traînée se referme, tout ce qui est
   dedans éclate : « LASSO ×5 ». À 0:14, deux mines s'arment sur la trajectoire ; à 0:17, deux dards
   viennent des flancs viser là où l'on va. Premier frisson.
5. **0:24.** VAGUE NETTOYÉE. Le bonus se compte ligne à ligne, puis vient la carte de vague (TOURELLES,
   TRAVERSÉE, CROISSANCE) : on choisit, et des canons poussent sur le corps. Puis **LE VOL** : 4 s de
   plongée vers l'horizon, des portes à traverser, de l'énergie à rafler, des mines à éviter, et L'ARTÈRE
   qui monte de l'horizon avec ses enseignes.
6. **0:32.** Des MEUTES en V, un CHAMP DE MINES, des dards. À 0:44, les murs se mettent en marche : **le
   plateau voyage**, le mur arrière pousse. À 0:52, la PASTILLE sur le radar : on la gobe, INVERSION, les ennemis
   virent à l'ardoise et fuient, la tête les dévore, 200, 400, 800, 1 600. Si l'on traîne, le TRAQUEUR
   arrive, et seul un lasso le tue.
7. **1:25.** LA CENTRALE et ses cheminées en flammes. Une BATTERIE de tourelles blindées de face, puis la
   FLÈCHE BLINDÉE annoncée en bannière. On meurt pour la première fois : gel, la tourelle fautive entourée,
   le serpent qui se désintègre, « −1 VIE », « CANON III → II », READY!
8. **2:20.** LE DÉFILÉ, au-dessus de la cité : quarante planeurs qui ne tirent pas, en courbes de Galaga.
   PARFAIT si l'on a tout eu. Puis LES TOURS : des CONVOIS balaient leurs voies, et rouler dans leur sillage
   donne une accélération gratuite. À 3:20, LE RIVAL : un serpent magenta qui veut couper la route ; on le
   fait s'écraser sur son propre corps.
9. **3:50.** LE CŒUR : tout à la fois, le ciel vire au sang. Vers 4:45, WARNING. Le soleil entre en
   éclipse, la cité s'éteint rangée par rangée, les murs du plateau se resserrent. Le CYCLOPE traverse les
   plans du décor jusqu'au plateau. Trois phases : le regard qui balaie, les mains-lames, la colère.
10. **6:00.** Arrêt sur le coup final, explosion qui remplit l'écran, carcasse qui s'effondre dans le décor,
    purge en chaîne. Viennent le bilan compté, le build, la note, les initiales, la barre « PROCHAIN
    DÉBLOCAGE : RALENTI DANS 112 ◆ », puis CONTINUER ? ou REJOUER. Un toucher, et l'on tient de nouveau le
    serpent en moins de 2 s.

C'est un jeu d'arcade haut de gamme : lumineux, dur et juste, spectaculaire, qui change d'air à chaque
vague et donne envie de relancer. On meurt souvent, mais toujours de ce qu'on a vu venir.

---

## 2. Les règles du jeu, chiffrées

Toutes ces valeurs vivent dans `02-regles.js` (`N.R`), source unique des chiffres (§ 7.1). Les noms entre
parenthèses sont les clés de `N.R`.

### 2.1 Le mouvement (`N.R.joueuse`)

| Règle | Valeur |
|---|---|
| Le serpent avance toujours ; le cap visé est la direction du manche (`S.input.x, y`) | — |
| Zone morte du manche (`dz`) | 0,12 de la course (5 px CSS sur 44) |
| Taux de virage maximal (`virage`) | V / 11 rad/s, soit un rayon de virage de 11 px (6,2 rad/s à 68 px/s ; quart de tour en 253 ms) |
| Taux de virage selon la déflexion | proportionnel entre 0,12 et 0,70 de course, plein au-delà : une petite poussée trace une courbe large |
| Clavier, croix de manette | taux plein |
| Latence | 1 image : le premier `requestAnimationFrame` après l'entrée change déjà le cap (J-05) |
| Doigt levé | cap et vitesse conservés, dérive inférieure à 2° (J-02) |
| Chevron du cap visé | si l'écart dépasse 20°, chevron cyan de 7 px devant la tête (J-33) |
| Souris (bureau) | au-delà de 24 px de la tête à l'écran, le cap visé est la direction du curseur ; réticule masqué après 1,5 s d'immobilité |
| Pas de simulation | fixe, 1/120 s, au plus 4 pas par image (J-29, V-28, § 7.2) |
| Contour | la tête et le corps portent une gaine d'un pixel en nuit profonde, pour se lire devant le soleil |

### 2.2 La vitesse et l'accélération

**La vitesse de croisière monte par paliers annoncés.** Chaque palier se signale par un trait de grille
qui accélère et un accent musical.

| Moment | V1 | V2 | V3 | DÉFILÉ | V4 | V5 | CYCLOPE | CYCLOPE enragé |
|---|---|---|---|---|---|---|---|---|
| Vitesse (px/s) | 68 | 72 | 76 | 76 | 80 | 84 | 86 | 90 |

**L'accélération (`boost`)**. Elle ne joue **jamais pendant un virage serré** : c'est ce qui sépare
« virer fort » et « accélérer ».

- **Au pouce : pousser droit devant soi.** L'accélération part quand le manche est poussé au-delà de
  **0,85** de sa course **et** que le cap visé est à moins de **15°** du cap réel, les deux pendant
  **120 ms**. Un virage serré sature la course mais crée un écart de cap : il n'accélère donc jamais.
- **D'un second doigt** : un second doigt tenu plus de 180 ms, n'importe où, accélère tant qu'il reste posé
  (§ 2.16). Au clavier, Espace tenue ; à la souris, clic gauche tenu ; à la manette, A ou gâchette droite.
- **Coupure en virage** : quel que soit le déclencheur, dès que l'écart entre cap visé et cap réel dépasse
  **30°**, l'accélération se suspend et la vitesse revient à la croisière en 4 images. Elle reprend seule
  quand l'écart repasse sous 15°, si le geste est toujours tenu. Le rayon de virage n'est donc jamais
  agrandi par l'accélération.
- **Effet** : vitesse × 1,6, en ligne droite.
- **Réserve** : 100 points. Elle se vide à 35 par seconde (2,9 s d'accélération) et se remplit à 22 par
  seconde après 0,4 s sans accélérer.
- **Panne franche** : sous 2 points, l'accélération s'arrête et un seul son de panne retentit. Elle reprend
  seule à 25 points, ou sur un nouvel appui à partir de 10. Un appui tenu produit au plus 2 bascules
  marche/arrêt (leçon A2). Les suspensions en virage ne comptent pas comme des bascules et ne font aucun son.
- **Montée** : 95 % de la vitesse en 7 images. Une traînée cyan pâle s'étire derrière la tête, la caméra
  avance davantage (§ 3.3) et le sol défile plus vite.
- **Jauge** : un arc de 270° d'un pixel autour de la tête, en ambre (brasier sous 20 %). Il n'est visible que
  si la réserve n'est pas pleine.
- **SILLAGE** : dans les 40 px derrière le dernier wagon d'un convoi, dans sa voie, l'accélération est
  gratuite (× 1,4, réserve non vidée, § 4.6).

### 2.3 La mort (`N.R.mort`)

La tête a un rayon qui tue de **3 px**, pour un sprite de 13 px, soit 46 % de sa largeur (G-15). Il y a
**huit causes de mort**, toutes à la tête. Leurs identifiants sont figés (§ 7.5).

| Cause | Condition | Clémence |
|---|---|---|
| `mur` | la tête est à moins de 3 px du mur courant (bord du monde, mur d'arène, mur du TRAVELLING) | **Grâce de 60 ms** : pendant la grâce, la tête est retenue sur la limite des 3 px (elle glisse le long du mur, elle ne le traverse pas). Si le cap repart vers l'intérieur (cosinus > 0,2) avant la fin de la grâce, pas de mort ; sinon la mort a lieu à la position retenue. Dès 24 px du mur, le pan de mur proche s'allume en rose pâle tramé et le battement de cœur part. |
| `morsure` | la tête touche un segment d'indice 6 ou plus qui n'est pas l'un des trois derniers (rayon 3 + 3,5 − 1 = 5,5 px) | Les segments 1 à 5 ne mordent jamais ; les trois derniers ferment le LASSO (§ 2.12). Un serpent de 9 segments ou moins ne peut donc pas se mordre. |
| `ennemi` | la tête touche un ennemi (rayon 3 + rayon de l'ennemi × 0,8), ou le corps du RIVAL | Un ennemi en apparition (600 ms) ne touche pas ; un ennemi en INVERSION se fait dévorer. |
| `tir` | un projectile ennemi touche la tête (3 + rayon du tir) | — |
| `laser` | un laser actif croise la tête (sentinelle, rayon du CYCLOPE) | Toujours télégraphié au moins 0,5 s (0,8 s pour le CYCLOPE). |
| `souffle` | la tête est dans le disque d'une mine armée, d'un INSTABLE ou d'un atterrissage du CYCLOPE | Le disque montré est exactement le disque qui tue. |
| `convoi` | un wagon de convoi recouvre la tête | Voie annoncée 1,5 s avant (§ 4.6). |
| `traine` | la tête touche la traînée magenta du RIVAL, âgée d'au moins 0,15 s | La traînée est visible par construction : elle est dessinée dès qu'elle tue. |

**Le corps ne tue pas : il se coupe.** Un tir, une lame, un souffle, un convoi, la traînée du RIVAL, le mur
arrière du TRAVELLING ou la morsure d'une larve qui touche le segment k (k ≥ 1, rayon de segment 3,5 px)
coupe le serpent à cet endroit :

- la longueur devient max(3, k) ;
- les segments détachés tombent en cellules d'énergie, une pour deux segments ; elles clignotent et
  expirent en 3 s ;
- la chaîne est divisée par deux, sauf avec SANG-FROID ;
- retours : gel de 3 images, poussée de caméra de 3 px, bande tramée en sang sur le bord de l'écran du côté
  du coup, son `coupe`.

Le tir qui coupe disparaît. Le corps n'absorbe plus jamais un tir sans conséquence : c'est le retour n° 4
de la propriétaire.

**Toute mort est journalisée** dans `S.death` et dans le journal (`N.journal('coup', …)`, § 7.9), avec :

- la cause et l'auteur (identifiants du § 7.5) ;
- la vague et l'heure ;
- **depuis combien de temps la source était visible**, et la durée de son télégraphe.

C'est ce qui nourrit l'écran de fin et le critère de justice R-08.

### 2.4 Les vies, la réapparition et le prix de la mort

- **Trois vies au départ**, soit deux en réserve affichées en petites têtes. **Une seule vie bonus**, à
  **80 000** points ; quatre vies au plus. Le HUD affiche « VIE À 80 000 » jusqu'à ce qu'elle tombe.
- **Pas d'onde de choc, pas d'invulnérabilité longue** : un coup qui ne tue pas, c'est-à-dire une coupe du
  corps, ne protège de rien.
- **Après une mort qui laisse une vie** (séquence au § 5.4) :
  - **où** : le serpent réapparaît au point sûr choisi parmi 16 candidats de la vue courante, à 40 px au
    moins des murs courants. On prend celui qui est le plus loin des ennemis, des tirs, des télégraphes et
    des voies de convoi annoncées ;
  - **cap** : vers le centre de l'arène ;
  - **ce qu'on perd** :
    - la longueur tombe à max(8, ⌈L / 2⌉), la chaîne et l'APOGÉE à zéro ;
    - **l'arme au plus haut palier perd un palier** (jamais sous I ; à égalité, la dernière montée). Une
      étiquette « CANON III → II » s'affiche 1 s à la réapparition. C'est le Gradius allégé : mourir coûte
      la moitié de soi et une part de son arme, et donne envie de reconstruire ;
    - les autres cartes sont gardées ;
  - **ce qu'on dégage** : les tirs ennemis à moins de 40 px du point de réapparition sont effacés, les
    ennemis à moins de 48 px sont figés 0,4 s ;
  - **invulnérabilité** : 1,0 s, contre les ennemis et les tirs seulement, jamais contre les murs, la
    morsure, les convois ni la traînée du RIVAL. Seul le contour clignote, à 4 Hz ;
  - **retour du son** : READY! s'affiche 0,6 s, puis la musique reprend sur la mesure suivante, sur un bloc
    différent de celui de la mort.
- **Game over** : extinction du tube, SIGNAL PERDU, écran de fin.
- **CONTINUER ?** n'est offert **qu'une fois par partie**. Il relance au début de la vague en cours, ou à
  l'entrée du CYCLOPE (G-08), avec les mêmes cartes, la longueur au début de cette vague, trois vies et le
  score remis à 0. La partie est alors marquée « C » au tableau.

### 2.5 La longueur

- On commence à **8 segments** (tête comprise), espacés de **5 px** le long de la trace de la tête (une
  perle de 9 × 9). Le maximum est de **40 segments** (+5 par carte CROISSANCE, deux prises au plus).
- **La longueur sert** :
  - les TOURELLES et les MINES DE QUEUE en dépendent ;
  - les dégâts du LASSO croissent avec elle, et sa traînée dure plus longtemps (§ 2.12) ;
  - au-delà du maximum, chaque cellule rapporte du score.
- **La longueur gêne** : un serpent long offre plus de cible aux coupes, au mur arrière du TRAVELLING et
  aux convois, et il se mord plus facilement. Grandir est une force et une charge (Nibbler).
- **Volume** : une rangée de cyan pâle sur le bord haut de chaque perle, une rangée de nuit profonde
  dessous, la gaine de nuit profonde autour. Un reflet court le long du corps par échange d'index, à
  environ 1 Hz.

### 2.6 Le butin et l'expérience (`N.R.butin`)

| Objet | Effet | Prise |
|---|---|---|
| **Cellule** (ambre, 9 × 11) | +1 segment (sous le maximum), +1 XP, +1 énergie, +10 × multiplicateur | à 8 px de la tête ; aimant à 28 px (puis 48 et 68 avec AIMANT) ; vole vers la tête à 220 px/s |
| **Noyau** (cœur jaune, 11 × 11) | +5 XP, +5 énergie, +20 APOGÉE, +2 segments, +200 × multiplicateur | idem |
| **Pastille** (disque os à quatre rayons jaunes, 11 × 11, qui bat à 2 Hz) | déclenche l'INVERSION (§ 2.17) | à 8 px de la tête ; jamais aimantée |

**Tout butin expire** : cellules et noyaux en 9 s, la pastille en 12 s. Ils clignotent pendant les 2
dernières secondes. Trois cellules à moins de 10 px les unes des autres fusionnent en une seule, qui garde
leur valeur cumulée. Le butin que le mur arrière du TRAVELLING dépasse est perdu.

**Les largages** :

| Source | Butin lâché |
|---|---|
| ennemi ordinaire | 1 cellule dans 45 % des cas (larve : 20 %) |
| ruche, élite | 6 cellules et 1 noyau |
| LASSO | 1 cellule par ennemi enfermé, et 1 noyau à partir de 4 |
| ennemi broyé par un convoi | comme un ennemi ordinaire |
| fin de vague | 3 cellules, plus 1 par numéro de vague |
| LE VOL | 24 cellules à ramasser en vol (§ 3.9) |
| CYCLOPE | 8 cellules par phase |

**Les seuils d'expérience** pour monter de niveau sont 6, 16, 28, 42, 58, 76, 96, 118, 142 et 168 XP.

### 2.7 Les cartes (`N.R.cartes`)

- **Quand.** Les cartes ne tombent jamais au milieu de l'action. Elles viennent pendant les 2,5 s de
  NETTOYAGE de chaque vague, et après LE DÉFILÉ. C'est la boutique de Brotato entre les vagues.
- **La carte de vague.** Chaque vague nettoyée donne **une carte**, même sans montée de niveau. Les montées
  de niveau acquises pendant la vague s'y ajoutent sur **le même écran** : « CHOISIS 2 » ou « CHOISIS 3 »
  au plus. Au-delà de trois, les montées restantes attendent l'écran suivant. Rien n'est perdu, et il n'y a
  jamais deux écrans de cartes de suite.
- **La cible du réglage** : 10 ± 2 cartes dans une partie gagnée ; au moins 4 pour une joueuse qui meurt
  pendant la vague 3 ; la première carte toujours à la fin de la vague 1, vers 0:24.
- **La cérémonie.** Au passage de niveau, le jeu ralentit à 0,15 pendant 350 ms. Un anneau tramé jaune part
  de la tête, le serpent pulse de la queue à la tête, et un arpège majeur joue dans la tonalité. L'écran de
  cartes, lui, n'ouvre qu'au NETTOYAGE.
- **La main.**
  - Au plus **4 armes** et **1 pouvoir** équipés. Choisir un autre pouvoir remplace le pouvoir équipé.
  - Les poids favorisent l'école choisie : × 1,7 pour une famille où la joueuse a déjà deux cartes, × 0,6
    pour une famille vierge après la 6ᵉ carte.
  - **Pitié de rareté** : une rare au moins tous les 3 écrans, une épique au moins tous les 7.
  - **La première main** contient toujours une arme neuve, un pouvoir débloqué et une carte de survie
    (CROISSANCE, BOUCLIER ou RÉPARATION).
  - **La main trophée**, après le CYCLOPE, ne contient aucune carte commune et propose l'ULTIME d'une arme
    à un palier près, quand il y en a une. La main qui suit un DÉFILÉ PARFAIT contient au moins une rare.
  - Les pouvoirs RALENTI et REPLI n'entrent dans le vivier qu'une fois débloqués (§ 5.6).
- **La rareté** se lit deux fois, par l'encre et par la forme : commune en acier avec 1 cran au coin, rare
  en os avec 2 crans, épique en ambre avec 3, ultime en jaune avec 4 et un reflet tramé qui passe moins de
  3 fois par seconde. Jamais en cyan ni en magenta.
- **Le texte** est calculé à partir des chiffres de `N.R`, par exemple « CADENCE 6,5 → 7,8 TIRS/S ». Un test
  compare le texte et l'effet mesuré (leçon C8).
- **Le choix.** Toute la carte est la cible, et elle mesure au moins 44 pt. Un toucher n'est accepté que
  s'il **commence après l'ouverture** de l'écran et au moins 400 ms plus tard. Au clavier, les touches 1 à 4.

### 2.8 Les armes (`N.R.armes`)

Toutes les armes sont **automatiques**. Les dégâts sont en points ; les PV des ennemis sont dix fois ceux
de la démo (§ 4.4). Chaque palier change le comportement **et** la silhouette, l'ULTIME vaut au moins
× 1,5 le palier III sur le CYCLOPE, et chaque arme se voit sur le serpent, en cyan. On ne reprend que
quatre paliers au lieu de six (leçon S2 de 2030), pour que l'ULTIME d'une arme tombe dans presque toutes
les parties. Les identifiants des armes sont figés (§ 7.5).

**CANON** (`canon`, devant). C'est l'arme de départ.

| Palier | Comportement | Cadence | Dégâts | Portée | Dessin |
|---|---|---|---|---|---|
| I | 1 tir | 6,5 tirs/s | 10 | 130 px à 210 px/s | trait 1 × 3, à tête cyan pâle |
| II | 2 bouches alternées à ± 2 px | 9 tirs/s | 10 | 130 px | idem |
| III | 2 lances perforantes (perce 2), écart 0,06 rad | 8 tirs/s | 12 | 150 px | lance 1 × 5 à cœur cyan pâle |
| ULTIME RAYON | rayon continu ; efface les tirs ennemis qu'il croise | 15 tics/s | 14 par ennemi traversé | 140 px | ligne de 3 px (centre cyan pâle, bords cyan), paquets d'os qui filent, part à 7 px devant la tête |

**TOURELLES** (`tourelles`, flancs). Leur nombre suit la longueur.

| Palier | Nombre | Tir | Dégâts | Dessin |
|---|---|---|---|---|
| I | 1 tous les 8 segments, 4 au plus ; deux flancs, visée assistée ± 25° | 2 tirs/s, portée 100 px | 10 | module 3 × 3 sur la perle, canon de 2 px en 8 directions |
| II | 1 tous les 6, 6 au plus | 2,5 tirs/s | 10 | idem |
| III | 1 tous les 4, 8 au plus | rafales de deux | 10 | canon double |
| ULTIME BORDÉE | 1 tous les 2, 16 au plus ; la salve court de la tête à la queue, 0,03 s par tourelle | 3 tirs/s | 10, + 3 éclats de 4 | lumière qui court le long du corps |

**ARC** (`arc`, à distance, en chaîne).

| Palier | Comportement | Fréquence | Dégâts | Portée |
|---|---|---|---|---|
| I | 1 arc, 3 sauts | toutes les 1,0 s | 14 | 60 px |
| II | 4 sauts | toutes les 0,85 s | 14 | 70 px |
| III | 2 arcs, 5 sauts, paralyse 0,3 s | toutes les 0,85 s | 14 | 70 px |
| ULTIME ORAGE | 4 arcs de 8 sauts, partis de la tête et de la queue | toutes les 0,4 s | 14 | 100 px |

L'arc est une ligne brisée de Bresenham, à cœur cyan pâle bordé de cyan, avec un nœud d'os de 3 × 3 à
chaque impact. Le son monte d'un degré de la gamme à chaque saut.

**MISSILES** (`missiles`, priorité : élites, ruches, RIVAL, œil du CYCLOPE).

| Palier | Comportement | Fréquence | Dégâts |
|---|---|---|---|
| I | 2 missiles autoguidés | toutes les 2,4 s | 30, + souffle de 14 px à 60 % |
| II | 3 missiles | toutes les 2,1 s | 30 |
| III | + 4 sous-munitions | toutes les 2,1 s | 30, + 4 × 8 |
| ULTIME NUÉE | 6 missiles, verrouillage de 6 cibles | toutes les 1,5 s | 30 |

Le missile mesure 3 × 5 px, avec une pointe cyan pâle et une traînée. Le verrouillage se montre par quatre
pixels cyan pâle qui tournent aux coins de la cible.

**DRONES** (`drones`, autour).

| Palier | Comportement | Tir |
|---|---|---|
| I | 1 drone en orbite à 16 px | 1,6 tir/s, 10, portée 90 px |
| II | 2 drones qui interceptent les tirs ennemis (+0,6 s de recharge après une interception) | idem |
| III | 3 drones reliés par un filin (30 de dégâts par seconde au contact) | idem |
| ULTIME ANNEAU | 6 drones, anneau fermé de 24 px (60 par seconde au contact), interception sans pénalité | idem |

Le drone est un satellite de 5 × 5 à œil cyan pâle ; le filin est un pointillé.

**MINES DE QUEUE** (`minesQ`, derrière).

| Palier | Comportement | Souffle | Dégâts |
|---|---|---|---|
| I | 1 mine posée à la queue toutes les 2,2 s, armée en 0,4 s, déclenchée à 8 px, vie 8 s, 12 au plus | 18 px | 40 |
| II | 1 mine toutes les 1,6 s | 22 px | 40 |
| III | chaque mine éclate en 3 sous-charges | 12 px chacune | 16 chacune |
| ULTIME SINGULARITÉ | aspiration de 0,45 s dans 30 px, puis souffle | 30 px | 80 |

La mine est un losange cyan de 5 × 5, dont le cœur bat à 2 Hz. Elle ne ressemble pas à la mine ennemie,
qui est une sphère magenta à piques (V-10).

**La lisibilité de l'arsenal.** Six armes automatiques, toutes cyan, pourraient noyer la tête comme la
surcharge de SNAKE 2030 (capture `d-52`). Trois règles la protègent :

- **les tirs sont fins** : 1 × 3 à 1 × 5 px, à cœur cyan pâle, jamais un aplat de plus de 3 × 3 sauf la
  mine de queue et le drone ;
- **la tête a son silence** : aucun tir, arc ou drone de la joueuse n'est dessiné à moins de 3 px du contour
  de la tête ; les tirs naissent à 7 px devant elle ; la tête et ses deux premiers segments sont dessinés en
  dernier, gaine comprise ;
- **un plafond mesuré** : au plus 8 % de pixels cyan et cyan pâle hors tête et corps, sur les captures de
  V5 avec le build maximal (R-37).

**Les retours d'arme.** Les explosions d'arme sont petites (force 0,3 au plus, 19 px de rayon au plus) et
dessinées en contour : le limiteur de flashs garde sa place pour les grosses. Les sons d'arme passent tous
par les gardes FUSION et USURE de `30-music.js` ; le `tir` reste discret, et les tirs des tourelles et des
drones fusionnent en un seul son `salve` (§ 5.8).

### 2.9 Les passifs (dix cartes)

Les effets des passifs sont calculés par un seul module, `75-cartes.js`, qui publie l'objet en lecture seule
`N.cartes.mods` (schéma au § 7.5). Chaque autre module lit le champ qui le concerne, sans jamais l'écrire.

| Carte (identifiant) | Rareté | Prises | Effet | Champ de `mods` | Module qui l'applique |
|---|---|---|---|---|---|
| PUISSANCE (`puissance`) | commune | 3 | dégâts des armes +25 % par prise | `degats` | `74-arsenal` |
| CADENCE (`cadence`) | commune | 3 | cadence des armes +20 % par prise | `cadence` | `74-arsenal` |
| AIMANT (`aimant`) | commune | 2 | rayon d'aimant 28 → 48 → 68 px | `aimant` | `71-butin` |
| CROISSANCE (`croissance`) | commune | 2 | +4 segments tout de suite, et +5 au maximum de longueur | `lenMax` ; +4 par l'événement `carte` | `70-joueuse` |
| RÉPARATION (`reparation`) | rare | 2 | +1 segment toutes les 6 s (toutes les 4 s à la 2ᵉ prise) | `reparation` | `70-joueuse` |
| BOUCLIER (`bouclier`) | épique | 1 | une charge absorbe un coup **à la tête**, puis se recharge en 20 s ; liseré cyan pâle autour de la tête quand elle est chargée | `bouclier` | `70-joueuse` |
| ÉPERON (`eperon`) | épique | 1 | en accélération, la tête détruit au contact les ennemis de 30 PV ou moins au lieu de mourir ; chaque destruction coûte 15 de réserve | `eperon` | `70-joueuse` (appelle `N.ennemis.hit`) |
| GRAPPE (`grappe`) | épique | 2 | toute mort d'ennemi explose : 16 px et 15 de dégâts, sur deux générations (22 px et 25 de dégâts à la 2ᵉ prise) ; ne blesse jamais la joueuse (G-30) | `grappe` | `74-arsenal`, consommateur de l'événement `kill` (§ 7.4) |
| SANG-FROID (`sangFroid`) | épique | 1 | une coupe ne divise plus la chaîne | `sangFroid` | `77-score`, consommateur de `coupe` |
| BRAISE (`braise`) | rare | 2 | la traînée du lasso brûle les ennemis qui la traversent (20 par seconde) ; à la 2ᵉ prise, la traînée dure 0,4 s de plus et les dégâts du lasso sont × 1,5 | `braise` | `70-joueuse` |

Aucune protection ne se cumule jusqu'à l'invulnérabilité : il y a une seule charge de BOUCLIER, et le
pilote « expert », avec la meilleure construction, doit encore perdre des vies (R-04).

### 2.10 Les pouvoirs

Un seul pouvoir est équipé à la fois. On le reçoit par une carte ; la première main en propose un.
TRAVERSÉE est disponible dès la première partie ; RALENTI et REPLI s'ouvrent par l'énergie (§ 5.6).

- **Déclenchement** : un **toucher bref d'un second doigt**, n'importe où, pendant que le pouce tient le
  manche (§ 2.16). Au clavier E, à la souris clic droit, à la manette X. Il part au relâcher du doigt, sans
  aucune attente.
- **Recharge** : un point qui orbite autour de la tête quand le pouvoir est prêt, plus un bip discret. Le
  nom du pouvoir et son geste (« 2ᵉ DOIGT : TOUCHE ») s'affichent une seule fois par profil, à la première
  recharge.

| Pouvoir | Durée | Recharge | Effet | Signe |
|---|---|---|---|---|
| TRAVERSÉE (`traversee`) | 1,4 s | 12 s | la tête et le corps traversent ennemis, tirs, lames et convois : rien ne coupe, rien ne tue, **sauf le mur et la morsure** | serpent tramé un pixel sur deux en cyan et cyan pâle, son `traversee` |
| RALENTI (`ralenti`) | 3,5 s | 16 s | le monde ralentit à 0,35, la joueuse garde sa vitesse | balayage indigo sur le décor, musique sous passe-bas à 1,2 kHz |
| REPLI (`repli`) | 7 s | 15 s | longueur −35 % (6 au moins), perles de 13 px, dégâts × 1,8, vitesse +12 % ; le corps épais ne peut pas être coupé (les tirs y meurent) ; les segments reviennent à la fin | la transformation se voit d'un coup |

### 2.11 L'ultime : l'APOGÉE

- **La jauge** monte jusqu'à 100 :

  | Source | Charge |
  |---|---|
  | ennemi ordinaire tué | +2 |
  | élite | +12 |
  | noyau | +20 |
  | chaque ennemi d'un LASSO | +3 |
  | ennemi dévoré pendant l'INVERSION | +2 |
  | accélération | rien |

  Pleine, elle devient un anneau de 8 points jaunes autour de la tête, qui bat à 2 Hz. Le mot APOGÉE et
  son geste (« GLISSE UN 2ᵉ DOIGT ») apparaissent la première fois seulement, avec le son `ultimePret`.
- **Déclenchement** : un **glissé vif d'un second doigt** (24 pt en moins de 220 ms), dans n'importe quelle
  direction, n'importe où (§ 2.16). Au clavier R, à la souris clic du milieu, à la manette Y. Le pouvoir et
  l'APOGÉE n'ont plus aucun geste en commun : aucune attente, aucun double toucher.
- **L'effet** :
  - le monde ralentit à 0,25 pendant 0,42 s, avec un gel de 6 images ;
  - **6 anneaux tramés** partent toutes les 90 ms, aux rayons 30, 70, 110, 150, 200 et 260 px ;
  - chaque anneau inflige 12 de dégâts à ce qu'il couvre et efface les tirs ennemis ;
  - sur le CYCLOPE, une APOGÉE ne retire au plus que 6 % de la phase en cours ;
  - un seul flash est compté par le limiteur.
- **La musique** plonge, puis revient en force sur le temps suivant.
- **Cible** : 3 ± 1 APOGÉE par partie gagnée chez le pilote expert.

### 2.12 Le LASSO, verbe central

Le lasso doit rester faisable au doigt quand le serpent grandit : grandir est une force, pas une raison de
rester court.

- **La traînée.** La queue laisse une traînée lumineuse d'un pixel, en cyan pâle tramé selon l'âge. Sa durée
  croît avec la longueur : **T = 1,2 s + 0,02 s × L** (1,36 s à 8 segments, 2,0 s à 40), plus 0,4 s avec
  BRAISE ×2.
- **La fermeture**, au choix de deux façons :
  - **sur la traînée** : la tête passe à moins de **7 px** d'un point de traînée âgé d'au moins 0,15 s ;
  - **sur la queue** : la tête touche (5,5 px) l'un des **trois derniers segments**. Ces trois segments ne
    mordent jamais : ils ferment.

  La boucle est faite de la traînée et du corps entre ce point et la tête. Toucher le **corps** ailleurs
  (segment 6 ou plus, hors des trois derniers) reste une morsure, donc une mort.
- **La fenêtre.** Une boucle valide est plus longue que le corps et plus courte que le corps plus la
  traînée. À 40 segments et 84 px/s, la traînée offre 168 px de cible, plus la queue elle-même : la
  fenêtre s'élargit avec la longueur au lieu de se resserrer.
- **Les limites.** Il faut une aire d'au moins 300 px², et il y a au plus un lasso toutes les 0,8 s.
- **L'annonce.** Quand la tête arrive à moins de 14 px d'un point refermable (traînée ou queue), ce point
  clignote en cyan pâle et le son `fermable` fait un petit tic.
- **L'effet** :
  - **40 + 4 × L** de dégâts à tout ennemi dont le centre est dans la boucle, élites comprises
    (BRAISE ×2 : × 1,5) ;
  - le TRAQUEUR enfermé meurt ; le RIVAL enfermé meurt ;
  - si l'œil du CYCLOPE est dedans, il perd 10 % de la phase, une fois par phase ;
  - les tirs ennemis dedans sont effacés et le butin dedans est aspiré ;
  - score : (somme des bases) × n × multiplicateur, avec n le nombre d'ennemis enfermés ;
  - texte « LASSO ×n ». À partir de 4 : un noyau et le mot EXCELLENT ;
  - l'aire se remplit en 3 images d'un tramage cyan puis os. Si `N.fx.flashGate(aire)` refuse le flash,
    seul le contour est dessiné.
- **La cible de jouabilité**, mesurée sur le pilote humain (120 ms de réaction, ± 10° d'erreur de cap) :
  au moins 50 % des lassos tentés réussissent jusqu'à 20 segments, au moins 40 % de 30 à 40 segments, et le
  nombre de lassos par minute à 30-40 segments vaut au moins 0,8 fois celui à 8-20 segments (R-34).

### 2.13 La chaîne et le score (`N.R.score`)

- **La chaîne** : chaque destruction l'augmente de 1. La fenêtre est de **2,5 s** depuis la destruction
  précédente, montrée par une barre qui se vide. Une coupe la divise par deux, une mort la remet à zéro.
- **Le multiplicateur** vaut 1 + ⌊chaîne / 5⌋, plafonné à **× 8**. L'objectif est écrit sous le score, en
  acier : « ×3 DANS 4 » (il manque 4 destructions). À chaque palier :
  - le chiffre passe deux images à l'échelle supérieure ;
  - la barre s'allume en jaune et le son `palier` joue ;
  - aux paliers × 3, × 5 et × 8, une onde tramée jaune parcourt toute la largeur et « ×5 » s'écrase en
    grand pendant 0,4 s.
- **Les points de base** :

| Cible | Points | Cible | Points |
|---|---|---|---|
| larve | 20 | tourelle | 150 |
| mine abattue | 40 | sentinelle | 200 |
| flèche | 50 | RIVAL | 300 |
| dard | 80 | ruche | 400 |
| lame | 120 | élite | 5 fois la base |
| planeur | 100 | TRAQUEUR (au lasso ou dévoré) | 5 000 |

- **Les primes** :
  - « À BOUT PORTANT » : une destruction à moins de 24 px de la tête vaut le double ;
  - « FRÔLÉ » : un tir ennemi qui passe à moins de 5 px de la tête sans la toucher vaut 50 × multiplicateur ;
  - « CRASH » : le RIVAL détruit en s'écrasant vaut le double ;
  - « BROYÉ ×n » : les ennemis broyés par un convoi comptent leur base, le double dans le SILLAGE ;
  - **dévoré** pendant l'INVERSION : 200, 400, 800, puis 1 600 pour chaque suivant (valeurs fixes, la
    chaîne monte quand même) ;
  - **cellule** : 10 × multiplicateur ;
  - **vague nettoyée** : 1 000 × numéro de vague, doublé (« PARFAIT ») si la vague s'est passée sans coupe
    ni mort ;
  - **LE VOL** : 500 par porte, 5 000 pour un VOL PARFAIT ;
  - **LE DÉFILÉ** : 10 000 pour 40 sur 40 ;
  - **CYCLOPE** : 3 000 par main, 5 000 par phase, 25 000 pour sa mort, plus un bonus de temps de
    max(0, 120 − durée du combat) × 200.
- **Le score affiché** a 7 chiffres en jaune. Quand il saute de plus de 1 000, les chiffres roulent pendant
  0,2 s.
- **Les gains flottants** : « +pts » en jaune au point de destruction, à l'échelle 2 à partir d'une chaîne de
  6. Ils restent dans l'écran, se décalent de 8 px s'ils se chevauchent, et les gains identiques fusionnent
  (« +2000 ×2 »).

### 2.14 Les défis (`N.R.defis`)

Les défis donnent un but à court terme qui change, pour ne pas répéter le défaut de la démo (« réussi à
36 s, puis plus rien à viser »). Leur réussite ou leur échec s'annonce en moins de 1 s par un bandeau (nom,
coche ou croix) et un son dédié, sans jamais couvrir la tête ni un télégraphe (G-23). Ils rapportent des
points, de l'énergie et des étoiles, **jamais une vie**.

**Les trois défis de la partie**, affichés au briefing et rappelés en pause :

- **FINIR** (détruire le CYCLOPE, 20 000, 50 énergie) est toujours l'un des trois ;
- **les deux autres sont tirés chaque jour** dans la réserve ci-dessous, par la graine du jour (`S.jour`,
  AAAAMMJJ, flux `N.rng('defis')`). Ils sont les mêmes pour toute la journée.

| Défi de la réserve | Condition | Prime |
|---|---|---|
| PREMIER JET | 25 destructions avant 1:00 de jeu | 5 000 |
| LASSO ×6 | enfermer 6 ennemis dans un seul lasso | 10 000 |
| SANS COUPE | finir V1 et V2 sans coupe ni mort | 8 000 |
| CHAÎNE ×5 | atteindre le multiplicateur × 5 | 6 000 |
| GLOUTONNE | dévorer 6 ennemis dans une même INVERSION | 8 000 |
| CRASH | détruire LE RIVAL en le faisant s'écraser | 10 000 |
| BROYEUSE | 4 ennemis broyés par un même convoi | 8 000 |
| PARFAIT | 40 planeurs sur 40 au DÉFILÉ | 10 000 |
| RASANTE | 10 FRÔLÉS dans la partie | 6 000 |
| ÉCLAIR | détruire la FLÈCHE BLINDÉE moins de 8 s après sa bannière | 8 000 |
| VOL PARFAIT | un VOL sans mine, toutes portes passées | 6 000 |
| SANS FILET | atteindre le CYCLOPE sans perdre de vie | 12 000 |

Chaque défi de la réserve vaut 20 énergie. Il doit être réussi par le pilote expert dans au moins 30 % des
graines et par le pilote bon dans 10 à 70 % (cible indicative). PREMIER JET n'est jamais réussi avant 0:30.

**Le défi de vague.** À l'entrée de chaque vague, un toast annonce un petit objectif, tiré parmi trois par la
graine de la partie (par exemple V1 : « 2 LASSO » ; V2 : « DÉVORE 4 » ; V3 : « ABATS 3 TOURELLES DE CÔTÉ » ;
V4 : « BROIE 3 ENNEMIS » ; V5 : « ×5 AVANT LA PURGE »). Réussi, il donne 1 000 × numéro de vague et 10
énergie, avec un bandeau. Il est rappelé en pause.

### 2.15 Les contrôles par appareil

| Action | Doigt | Clavier | Souris | Manette |
|---|---|---|---|---|
| Diriger | manche flottant né sous le premier doigt | flèches, ZQSD, WASD | curseur | stick gauche, croix |
| Accélérer | pousser le manche droit devant soi (au-delà de 0,85, cap à moins de 15°), ou second doigt tenu | Espace tenue | clic gauche tenu | A, gâchette droite |
| Pouvoir | toucher bref d'un second doigt, n'importe où | E | clic droit | X |
| APOGÉE | glissé vif d'un second doigt | R | clic du milieu | Y |
| Pause | bouton en haut à droite | P, Échap | — | Start |
| Valider, cartes | toucher la cible | Entrée, 1 à 4 | clic | A |
| Retour | bouton RETOUR | Échap, Retour arrière | — | B |

Tout le jeu se termine en ne faisant que diriger (G-19) : l'accélération, le pouvoir et l'APOGÉE sont des
bonus. Au bureau, aucun contrôle tactile n'est dessiné, la perte de focus met en pause, et des capuchons de
touches en 5 × 7 s'affichent pendant les trois premières parties (J-31, priorité P3). La règle de coupure en
virage (§ 2.2) vaut pour tous les appareils.

### 2.16 Les doigts : un geste, une action, aucune confusion (`90-boot.js`)

Au doigt, le manche flottant pose un problème réel : la joueuse lève et repose sans cesse le pouce pour se
recentrer, souvent en moins de 200 ms et sans bouger. Aucun geste du pouce qui tient le manche ne doit donc
déclencher autre chose que la direction et l'accélération droit devant. `90-boot.js` classe les touchers
ainsi, et publie le résultat dans `S.input` (§ 7.8) :

1. **Le manche** appartient au premier doigt posé (suivi par `identifier`, J-04). Un doigt posé alors
   qu'aucun manche n'est tenu devient le manche, **jamais** une action. Le toucher bref du doigt du manche
   ne fait rien d'autre que poser une origine.
2. **Un doigt d'action** est un doigt qui se pose alors que le manche est tenu **depuis au moins 150 ms**.
   Un doigt posé avant ce délai attend : si le manche se lève, c'est lui qui devient le manche ; sinon il
   n'est rien. Le recentrage d'un pouce pendant que l'autre se pose ne déclenche donc jamais d'action.
3. **Le geste du doigt d'action** est classé une seule fois, au premier des trois instants suivants :
   - **TOUCHER** : relevé en moins de 180 ms, déplacé de moins de 10 pt → **pouvoir**, au relâcher ;
   - **GLISSÉ** : déplacé de 24 pt ou plus en moins de 220 ms → **APOGÉE**, dès que le seuil est franchi ;
   - **TENU** : toujours posé à 180 ms, déplacé de moins de 24 pt → **accélération**, tant qu'il reste posé
     (avec la coupure en virage du § 2.2).
   Tout autre geste ne fait rien.
4. **Les boutons du HUD** (PAUSE, SON) prennent un toucher qui commence dans leur rectangle de 44 pt ; ce
   toucher n'est ni un manche ni une action.
5. **Les bords.** L'origine du manche ne naît jamais à moins de 20 pt des bords gauche, droit et bas de la
   zone sûre : un doigt posé plus près voit son origine décalée vers l'intérieur. La surface de jeu porte
   `touch-action: none`, `overscroll-behavior: none`, `-webkit-user-select: none` et
   `-webkit-touch-callout: none` ; `touchstart` et `touchmove` sont écoutés en non passif avec
   `preventDefault()` (J-28). Le balayage depuis le bord gauche ne fait donc plus « page précédente » dans
   Safari. La barre d'accueil reste au système, aucune page web ne peut la différer : le HUD et les
   apparitions restent hors de la bande du bas.
6. **Réglage ACTIONS** : `2 DOIGTS` (par défaut) ou `AUTO`. En AUTO, pour la joueuse qui joue d'une main, le
   pouvoir part seul quand un coup télégraphié frapperait la tête dans moins de 0,25 s (TRAVERSÉE), quand
   au moins 3 télégraphes sont actifs dans la vue (RALENTI) ou quand au moins 5 ennemis sont à moins de 60
   px (REPLI) ; l'APOGÉE part seule quand elle est pleine et qu'au moins 8 ennemis sont dans la vue. La
   première fois que l'APOGÉE est pleine en portrait, un toast le propose : « UNE MAIN ? RÉGLAGES →
   ACTIONS AUTO ».

### 2.17 L'INVERSION : la chasse retournée (`N.R.inversion`)

Le moment le plus joyeux de l'arcade, celui de la grosse pastille de Pac-Man, manquait. L'APOGÉE vide
l'écran, mais elle ne renverse pas la poursuite.

- **La pastille** apparaît une fois par vague, de V2 à V5, à un point de l'arène situé à 160 px au moins de
  la tête : à +20 s en V2, +14 s en V3, +18 s en V4, +22 s en V5. Elle est sur le radar en jaune, qui
  clignote. Elle expire en 12 s. Jamais pendant LE DÉFILÉ, LE VOL ni le CYCLOPE.
- **Avalée**, elle déclenche l'INVERSION pendant **6 s en V2, 5 s en V3, puis 4 s** :
  - tous les tirs ennemis en vol sont effacés, les télégraphes en cours sont annulés, les apparitions
    attendent ;
  - les ennemis ordinaires, le TRAQUEUR et les mines passent à l'état `proie` : ardoise pleine, contour
    rose pâle, gaine de nuit profonde. Ils fuient la tête à 0,8 fois sa vitesse, n'attaquent plus et ne
    blessent plus au contact ;
  - **la tête les dévore au contact** : 200, 400, 800, puis 1 600 pour chaque suivant, +1 segment, +2
    APOGÉE. Le TRAQUEUR dévoré vaut 5 000 ;
  - les élites et le RIVAL ne changent pas : ils restent dangereux ;
  - pendant la dernière seconde, les proies clignotent en os à 4 Hz ;
  - à la fin, les proies à moins de 32 px de la tête restent inoffensives 0,5 s de plus.
- **Les signes** : bannière « INVERSION ! », le décor passe sur sa table d'inversion (le soleil s'allume
  d'un cran, les enseignes tournent deux fois plus vite), la musique joue la couche INVERSION (arpège
  rapide, filtre ouvert), le son `devore` monte d'un degré à chaque proie.

---

## 3. Le monde et la caméra

### 3.1 La vue : un plateau holographique devant la cité

- **Le plateau.** Le plan de jeu est un plateau vertical, vu de face, à l'échelle 1. Le serpent et tout ce
  qui joue y vivent. Ses repères : des points d'intersection en indigo tous les 16 px, et des lignes en
  violet tramé à 25 %, à travers lesquelles on voit la cité.
- **Le décor.** Derrière, il est vu de profil : ciel, soleil, montagnes, cité, brume, structures et sol en
  perspective.
- **Monter et descendre.** Quand la caméra monte dans le monde, l'horizon descend et le ciel envahit
  l'écran ; quand elle descend, l'horizon remonte et le sol en perspective s'étale sous le plateau.
- **Les bornes.** Ni rotation, ni bascule, ni zoom non entier. **Aucun plan de décor ne se déplace plus
  vite que le plateau**, sauf le premier plan P6. La seule autre vue est celle du VOL (§ 3.9), qui reste en
  pixels entiers.

### 3.2 Le monde (`N.world`)

- **Taille.** **1 024 × 512 px**, indépendante de l'écran et de l'orientation.
  - Les écrans voient la même aire : paysage 422 × 195, portrait 195 × 422, bureau 360 × 225, soit environ
    82 000 px² dans les trois cas.
  - **Une rotation ne change que la fenêtre** : l'état du monde est identique avant et après.
- **Les murs.** Le mur courant est un mur électrifié : une bande de 3 px hachurée de magenta et de nuit
  profonde, dont les hachures défilent. Elle tue la tête et coupe le corps.
  - **À l'approche** (moins de 24 px), le pan proche de la tête s'allume en rose pâle tramé, d'autant plus
    fort qu'elle approche, et le battement de cœur part (§ 5.8). Pour un mur mobile, le pan s'allume aussi
    quand un segment du corps s'en approche.
  - **Au-delà du mur**, le plateau s'arrête et seul le décor continue.
- **Les murs qui bougent** passent tous par `N.world.arena(rect, durée)` et `N.world.travelling(opts)`
  (§ 7.8), avec la même règle : **la position finale est hachurée dès le premier instant**, les murs
  glissent en 2 s au moins, et une arène qui se met à voyager est annoncée 2 s avant son départ.
- **L'arène du CYCLOPE.** Pendant le WARNING, les murs glissent vers une arène de **448 × 256 px** en
  3,0 s. Elle est placée pour contenir la tête avec au moins 80 px de marge. En phase 3, elle se resserre de
  15 % en 2 s, avec le même télégraphe.
- **Le TRAVELLING** (V2, V3, V5) est décrit au § 4.6 : une arène de 576 px de large qui voyage à travers le
  monde.

### 3.3 La caméra (`N.cam`)

- **La cible** est la tête plus une **avance dans le sens du cap visé** :
  - à l'horizontale, 0,30 × la demi-largeur de la vue ;
  - à la verticale, 0,42 × la demi-hauteur ;
  - × 1,4 en accélération.
- **Le suivi** est un amorti critique de constante 0,22 s.
- **La tête est toujours entre 15 % et 85 % de la zone sûre**, sur les deux axes. En portrait, sa position
  verticale est bornée entre 15 % et 72 %, pour la garder hors du quart du pouce (J-09).
- **Ce qu'on voit devant**, mesuré le long du cap, de la tête au bord de la vue : au moins
  **min(1,2 s × v, d_mur + 16 px)** en croisière, et **min(0,8 s × v, d_mur + 16 px)** en accélération, où
  d_mur est la distance au mur courant dans le sens du cap. La géométrie le permet : en paysage, avec
  l'avance verticale, il reste environ 131 px devant la tête, pour 107 px demandés à V5 en accélération
  (115 px au CYCLOPE enragé) ; en portrait, 127 px à l'horizontale. C'est ce qui rend juste la mort au mur.
- **Les bornes.** La caméra est bornée au monde (ou à l'arène courante) avec **16 px de débord** : on voit le
  mur et un peu de décor au-delà. Elle est arrondie au pixel **une seule fois par image**.
- **L'image de retard.** La caméra est mise à jour après les ennemis : `shown` et `anticipee` lisent la vue
  de l'image précédente. La marge de 24 px des apparitions (§ 3.8) couvre ce retard, qui vaut au plus 2,4 px
  par image.
- **Pendant le CYCLOPE**, la cible vaut 0,7 × (tête + avance) + 0,3 × œil du colosse, pour garder les deux
  dans le cadre.
- **Les poussées.** `N.cam.jolt(dx, dy)` décale la caméra de 2 à 6 px, amortis en 0,15 s. On l'emploie à la
  coupe, dans le sens du coup, et au kill d'élite, à l'opposé du tir (G-27, H4). La secousse à trauma reste
  dans `20-crt.js`, en espace écran. Les deux sont multipliées par le réglage SECOUSSE.
- **Les cadrages scénarisés** passent par `N.cam.focus(x, y, durée)` : entrée du CYCLOPE, mort, plongée.
  Rien ne bouge au hasard (leçon A3).

### 3.4 Les plans de parallaxe (`N.decor`) : un décor lumineux

Ils sont dessinés du plus loin au plus proche, dans le tampon d'index, par `N.gfx.layer` (copie de
rangées, bouclage horizontal). Le facteur est la fraction du déplacement de la caméra appliquée au plan.
**La lumière vient du décor** : le soleil, les enseignes, le reflet sur le sol et l'horizon embrasé portent
l'essentiel des pixels lumineux. Le décor se tait par la forme (grandes surfaces calmes, tramages) et par
le contour (gaine de nuit profonde autour de tout ce qui joue), jamais en s'éteignant.

| Plan | Contenu | Facteur x / y | Couleurs | Source |
|---|---|---|---|---|
| P0 ciel | dégradé tramé du haut vers l'horizon ; **bande d'horizon embrasée** sur les 16 rangées du bas | 0 / 0,02 | vide puis nuit en haut ; sang puis brasier tramé à 25-50 % vers l'horizon ; sang tramé au chaos | procédural |
| P1 étoiles | 60 points, deux phases de scintillement | 0,03 / 0,05 | acier, os | procédural à graine |
| P2 soleil et montagnes | **soleil en bandes de 80 px de diamètre** en paysage (64 en portrait), deux chaînes de montagnes | 0,08 / f_h | soleil : **jaune en haut, ambre au milieu, brasier en bas**, bandes séparées par des rayures de nuit qui glissent ; montagnes en nuit et indigo, crêtes en sang | `horizon.png`, rangées au-dessus de l'horizon (512 px de large, qui couvrent sans boucler) ; disque refait à la taille voulue |
| P3 cité lointaine | silhouette du **quartier** courant (§ 3.6) et la tour centrale | 0,20 / f_h | nuit et ardoise ; fenêtres en ambre et jaune tramés, enseignes en cycle sang → brasier → ambre → jaune (5 à 8 % des pixels de l'écran) | silhouettes procédurales à graine, prolongées à 600 px, avec des éléments découpés dans `exterieur.png` et remappés (magenta → brasier, rose pâle → ambre) ; la tour cache la couture |
| P4 brume | bandes de brouillard tramées à 25 %, éclairées par la cité | 0,35 / 0,40, dérive 4 px/s | nuit ; reflets ambre tramés à 12 % sous les enseignes | procédural |
| P5 structures | éléments du quartier (grues, pylônes, cheminées, antennes), câbles, balises qui clignotent, projecteurs | 0,60 / 0,60 | ardoise et indigo, liseré violet, arêtes acier ; balises en sang et ambre ; faisceaux en os tramé à 12 % | tuiles procédurales de 32 × 64 par quartier ; monolithes à sphère découpés dans la bande gauche d'`affiche.png` et remappés |
| SOL | grille de fuite, calculée ligne par ligne | de f_h (horizon) à 1,0 (bas) | violet près, indigo au milieu, indigo tramé sur nuit vers l'horizon ; **reflet du soleil** en jaune, ambre et brasier tramés ; lignes proches en brasier tramé à partir de l'état `montee` | procédural, d'après le sol de `horizon` |
| PLATEAU | grille holographique, murs | 1 / 1 | indigo, violet tramé ; murs magenta et nuit profonde | procédural |
| P6 premier plan | poutrelles et câbles en silhouette, dans les 12 % du haut et du bas seulement ; braises qui tombent au chaos | 1,4 / 1,4 | nuit profonde tramée à 50 % ; braises de 1 px en brasier | procédural |

**Les règles des plans** :

- **L'horizon** se place à l'écran en y_h = ⌊h × (0,80 − 0,42 c)⌋ en paysage et au bureau, et en
  ⌊h × (0,62 − 0,20 c)⌋ en portrait, avec c = position verticale de la caméra entre 0 et 1.
  - **f_h** est le facteur qui en découle ; P2, P3 et l'horizon du sol l'emploient tous, pour que la cité
    reste posée sur l'horizon.
  - Les plans qui reposent sur le sol (P5) prennent le facteur de la rangée du sol où se trouve leur base.
- **Plans voisins.** L'écart entre deux plans voisins est d'au moins × 1,7, sinon l'œil ne les sépare pas.
- **P6** se dessine **avant** les entités : il ne couvre jamais la tête, une menace ni un télégraphe.
- **Le cyan** n'apparaît dans aucun plan. **Le magenta et le rose pâle** ne sont autorisés que sur les murs du
  plateau (G-12) : moins de 0,5 % du décor.
- **Les couleurs vives du décor** (jaune, ambre, brasier, os, acier) sont **tramées à 50 % au plus**, sauf
  dans le disque du soleil et ses bandes. Aucun motif de décor de 3 × 3 px plein en couleur vive ne se
  déplace plus vite que 1 px/s par rapport à son plan : ce qui bouge vite et brille, c'est le jeu.
- **Le soleil** est repeint au chargement par une table de remplacement d'index : magenta → brasier, rose
  pâle → ambre ; le jaune est gardé au sommet. C'est la signature synthwave : grand, saturé, en bandes.

### 3.5 Le sol ligne par ligne, et le plateau qui avance

Pour chaque rangée d'écran sous l'horizon, `dy = y − y_h` :

- **La profondeur** vaut z = K / dy, avec K ≈ 900.
- **La grille longitudinale** s'allume quand (camX + (x − x_fuite) × z / Z0) mod 32 est inférieur à la
  largeur de ligne à cette profondeur.
- **La grille transversale** s'allume quand (z + avance) mod 24 est inférieur à l'épaisseur. **L'avance
  croît d'une case par temps** (temps de jeu, § 7.2), de deux cases par temps au chaos, de six pendant LE VOL,
  et plus vite en accélération.
- **Le reflet du soleil** est une colonne de 24 à 44 px. Chaque rangée y est décalée de
  ⌊2 sin(y × 0,7 + t × 3)⌉ px.
- **Le coût** reste sous 0,5 ms par image : 34 000 tests simples, écrits directement en index.

### 3.6 Le décor qui raconte la partie : quartiers et états

**Chaque vague a son quartier.** Le quartier change la silhouette de la cité (P3), les éléments du plan des
structures (P5), la hauteur du soleil et une table de couleurs propre. On passe d'un quartier à l'autre
pendant LE VOL (§ 3.9), où le nouveau monte de l'horizon. C'est le « changement complet d'ambiance » de
SNAKE 2030, dans un seul secteur.

| Quartier | Moment | Cité (P3) | Structures (P5) | Lumière dominante |
|---|---|---|---|---|
| LES DOCKS | V1 | entrepôts bas, empilements de conteneurs | grues et portiques, eau-miroir au pied | aube : soleil haut, jaune et ambre, reflets d'or sur le sol |
| L'ARTÈRE | V2 | tours à enseignes, monorail | pylônes, panneaux, petits trains de lumière | néons ambre et jaune qui tournent vite |
| LA CENTRALE | V3 | réacteurs et cheminées | conduites, flammes en brasier tramé qui ondulent | brasier, fumées de nuit |
| LE CIEL | DÉFILÉ | cité vue d'en haut, au loin sous l'horizon | aucun ; nuages tramés | soleil haut et entier, étoiles nombreuses, calme |
| LES TOURS | V4 | gratte-ciel à fenêtres jaunes | antennes, projecteurs qui balaient | crépuscule ambre et sang |
| LE CŒUR | V5 | la tour centrale d'`exterieur`, en grand | monolithes à sphère d'`affiche`, éclairs | incendie : brasier et sang, éclairs lointains |
| L'ÉCLIPSE | CYCLOPE | la cité s'éteint rangée par rangée | silhouettes du CYCLOPE | soleil éclipsé, cerclé de brasier |

**Les états**, qui suivent la tension à l'intérieur d'un quartier :

| État (`N.decor.etat`) | Quand | Ciel | Soleil | Cité | Sol et plateau |
|---|---|---|---|---|---|
| `calme` | entrée de vague, DÉFILÉ | nuit, horizon embrasé | haut, plein | fenêtres et enseignes allumées | une case par temps, violet ; reflet d'or |
| `montee` | vague en cours, V2 et V3 | nuit, brume éclairée | un peu plus bas | enseignes en rotation rapide | lignes proches en brasier tramé à 25 % |
| `chaos` | V4 et V5 au plus fort | nuit tramée de sang, éclairs (petite aire, sous le limiteur) | brasier et sang, à l'horizon | fenêtres qui clignotent, incendies | deux cases par temps, lignes plus épaisses, braises en P6 |
| `inversion` | pendant l'INVERSION | idem, d'un cran plus clair | s'allume d'un cran | enseignes deux fois plus vite | grille qui pulse au temps |
| `colosse` | WARNING et combat | sang tramé | **éclipse** : disque de nuit profonde cerclé de brasier | éteinte, rangée par rangée | le reflet passe au sang ; incendies dans la cité |
| `victoire` | après la mort du CYCLOPE | nuit | le soleil revient, jaune plein | fenêtres en ambre | la grille ralentit |

- **La lumière monte avec l'état.** La part de pixels lumineux du tampon croît de `calme` à `montee` puis à
  `chaos` (§ 5.2, R-11).
- **Les transitions** se font par un balayage tramé de haut en bas en 0,5 s, avec la matrice de Bayer comme
  fondu.
- **Le cyclage de palette** (§ 5.2) suit le temps de jeu, et les accents de la musique quand elle joue.
- **Le décor sent l'action** : les fenêtres de la cité s'allument par rangées à chaque élite tuée, un éclair
  tombe sur l'horizon à chaque APOGÉE, des débris de la cité tombent au premier plan au chaos.
- **Mouvement réduit.** Avec `prefers-reduced-motion`, ou la secousse réglée à 0, tous les facteurs de P0
  à P6 passent à 0, le sol n'avance plus et le cyclage s'arrête. Le plateau, le radar et le jeu restent, et
  la lumière aussi.
- **Coût des quartiers.** Les silhouettes d'un quartier sont précalculées pendant LE VOL qui y mène, par
  tranches de 4 ms au plus par image : aucun à-coup.

### 3.7 Le radar et les marqueurs hors champ

- **Le radar**, à la façon du scanner de Defender, mesure **48 × 24 px**. Il est centré en haut de la zone
  sûre, sur une plaque de nuit profonde à cadre acier.
  - Il montre les murs courants (qui bougent avec le TRAVELLING), le rectangle de la vue en ardoise, la tête
    (cyan, 2 × 1) et les ennemis (points magenta).
  - Les élites, les ruches, le RIVAL et le CYCLOPE y sont en 2 × 2, ou 3 × 3 en sang et magenta.
  - Le TRAQUEUR est un point rose pâle qui clignote à 2 Hz ; les noyaux sont des points ambre ; la PASTILLE
    est un point jaune de 2 × 2 qui clignote à 2 Hz ; une voie de convoi annoncée y est une ligne magenta.
  - Les portails en attente clignotent au bord du radar.
- **Les portails** : 600 ms avant chaque apparition, un chevron de 7 px s'allume au bord de la zone sûre,
  dans la direction du point d'apparition.
  - Il porte la mini-silhouette du type (5 × 5), parce que la couleur ne peut pas dire le type.
  - Il est double pour une élite, triple et annoncé 1,4 s avant pour le CYCLOPE.
  - Un tic sonore part du côté de l'arrivée.
  - Une salve qui naît au même endroit s'étale en peigne le long du bord.
- **Les marqueurs permanents** restent au bord pour les élites, le RIVAL, les mines armées, le TRAQUEUR, la
  PASTILLE et le CYCLOPE hors champ.
  - Leur taille dit la distance : 7 px de près, 3 px de loin.
  - Leur forme dit le type : triple pour le colosse, double pour l'élite et le RIVAL, rond à cœur
    clignotant à 2 Hz pour la mine, étoile jaune pour la PASTILLE.
  - Ils clignotent à 6 Hz au plus, sur une aire minuscule (V-20).

### 3.8 Des apparitions justes (règles imposées à `76-directeur.js` et `72-ennemis.js`)

1. **Aucun ennemi ne naît dans la vue.**
   - Le point d'apparition est hors de la vue **courante** et hors de la vue **anticipée** (la tête avancée
     de 1,15 s de trajet), avec 24 px de marge.
   - Il est à plus de 48 px de la tête (G-14), et à au moins 16 px à l'intérieur des murs courants. Pendant
     un TRAVELLING, il est **devant** le mur arrière, jamais derrière.
   - Le point est revérifié toutes les quatre images pendant le portail. Faute de point valide, l'apparition
     attend.
2. **Tout s'annonce.** Tout ennemi passe par un portail de 600 ms (§ 3.7). Il ne blesse pas pendant ses 600
   premières millisecondes.
3. **On n'arme que sous les yeux de la joueuse.** Une attaque ne s'arme que si son auteur est **entièrement
   dans la vue, à 6 px au moins du bord** (`N.cam.shown`).
   - S'il sort du cadre pendant l'armement, il gagne une seule rallonge de 300 ms, avec un chevron
     clignotant à l'intersection de sa ligne d'attaque et du bord.
   - S'il est encore dehors au moment de tirer, il annule et recharge.
   - Le CYCLOPE n'attaque que si son œil est dans la vue.
4. **Un ennemi qui entre dans le champ** parce que la caméra avance n'est pas une apparition, mais il ne peut
   pas déjà être en train d'attaquer.
5. **La difficulté ne raccourcit jamais un télégraphe.** Le minimum est de 500 ms à l'endroit exact des
   dégâts, de 800 ms pour le CYCLOPE et de 1,5 s pour un convoi. Les modificateurs et l'enragement
   accélèrent l'attaque et la recharge, jamais l'annonce.
6. **En portrait**, les naissances par le bas de l'écran sont divisées par deux.

### 3.9 LE VOL : la plongée entre deux vagues (`17-vol.js`, `N.vol`)

C'est le moment « on vole » que la bascule en perspective donnait à SNAKE 2030, refait en pixels entiers :
la vue de poursuite de Space Harrier, et la plongée de fin de niveau de Tempest, où la vague passée vous
menace encore.

- **Quand** : après les cartes de V1, V2, V3 (vers LE CIEL), du DÉFILÉ (vers LES TOURS) et de V4. Cinq VOLS
  par partie gagnée, **4 s** chacun.
- **L'entrée** : un balayage de Bayer de 0,4 s fait passer de la vue de face à la vue de poursuite.
  L'horizon descend à 0,38 h, le sol prend les 62 % du bas et sa grille transversale défile six fois plus
  vite. Au loin, le quartier suivant monte de l'horizon par rangées entières.
- **Le serpent** est vu de dos : la tête est le sprite `tete:dos` (13 px) posé à l'échelle 2 ; le corps est
  une file d'anneaux cyan qui rapetissent vers l'horizon (rayons 5, 4, 3, 2, 1). Le manche le déplace dans
  un cadre de l'écran (15 à 85 % de la largeur, 55 à 90 % de la hauteur) à 140 px/s, sans inertie.
- **Ce qui arrive du point de fuite**, toujours dessiné **par des primitives à rayon entier** (anneaux,
  losanges, disques), dont le rayon vaut ⌊r0 × Z0 / z⌋ : jamais un sprite agrandi d'un facteur non entier.
  - **Cellules** : 24 losanges ambre, qui vont à la tête (+1 XP, +1 énergie, +10 × multiplicateur) ;
  - **Portes** : 6 anneaux jaunes jusqu'à 24 px de rayon ; traverser une porte rapporte 500 et 5 XP ;
  - **Mines** : 4 disques magenta à piques (8 au VOL qui mène à LE CŒUR), chacune visible et annoncée par
    son ombre sur le sol au moins **1,2 s** avant le contact. Une mine touchée **coupe** le serpent d'un
    quart de sa longueur (8 segments au moins restent) et divise la chaîne par deux. **On ne meurt jamais
    pendant LE VOL** : la profondeur est une lecture nouvelle, la justice passe avant la peur.
- **VOL PARFAIT** : toutes les portes, aucune mine : 5 000 et un bandeau.
- **La sortie** : un balayage de 0,4 s ramène à la vue de face, dans le nouveau quartier ; la bannière de la
  vague suivante tombe.
- **Le son** : un souffle qui monte, `porte` à chaque porte (une note de plus à chaque porte enchaînée), la
  musique continue sur le bloc en cours.
- **Le coût** reste sous 2 ms par image (sol plein écran, une quarantaine de primitives).

---

## 4. Le contenu du prototype refondu : SECTEUR 1, LA GRILLE

### 4.1 La structure d'une partie

| Moment | Durée visée (pilote bon) | Contenu | Musique (§ 5.7) | Quartier, état |
|---|---|---|---|---|
| Écran « TOUCHE POUR COMMENCER », puis ouverture (première visite) ou titre et briefing | 12 s, sautable | panneaux, logo, briefing en 3 lignes et 3 défis | INTRO | — |
| PLONGÉE, READY!, GO! | 1,4 s | la caméra descend de l'horizon dans le monde | décollage à la mesure 11 | DOCKS, `calme` |
| VAGUE 1, ÉVEIL | 22 s | flèches, nuée de larves, deux mines, une pince de dards ; aucun tir ennemi | PLATEAU, filtré | DOCKS, `calme` |
| NETTOYAGE et cartes | 2,5 s, plus le choix | bonus compté ; carte de vague | accent | — |
| VOL | 4 s | portes, cellules, mines | PLATEAU | vers L'ARTÈRE |
| VAGUE 2, MEUTE | 42 s | meutes, champ de mines, dards ; TRAVELLING lent ; PASTILLE ; TRAQUEUR actif | PLATEAU | ARTÈRE, `montee` |
| NETTOYAGE, cartes, VOL | 2,5 + 4 s | | | vers LA CENTRALE |
| VAGUE 3, BATTERIE | 44 s | tourelles en batterie ; TRAVELLING ; PASTILLE ; **PIC** : FLÈCHE BLINDÉE | PLATEAU | CENTRALE, `montee` |
| NETTOYAGE, cartes, VOL | 2,5 + 4 s | | | vers LE CIEL |
| LE DÉFILÉ (étape bonus) | 24 s | 40 planeurs qui ne tirent pas ; PARFAIT pour 40 sur 40 | RESPIRATION | CIEL, `calme` |
| cartes, VOL | 4 s | | | vers LES TOURS |
| VAGUE 4, ESSAIM | 48 s | ruches, larves, lames, sentinelles ; CONVOIS ; PASTILLE ; **PIC** : LE RIVAL | PLATEAU | TOURS, `chaos` |
| NETTOYAGE, cartes, VOL | 2,5 + 4 s | | | vers LE CŒUR |
| VAGUE 5, DÉFERLANTE | 50 s | tout combiné, au plafond de densité ; TRAVELLING rapide ; convois ; PASTILLE ; **PIC** : RUCHE INSTABLE | PLATEAU, couches pleines | CŒUR, `chaos` |
| NETTOYAGE et cartes | 2,5 s | | | |
| WARNING, panneau, entrée | 3 + 1,6 + 2,2 s | murs qui se resserrent, éclipse, silhouette | coupure, sirène, puis RETOUR | ÉCLIPSE, `colosse` |
| LE CYCLOPE | 55 à 90 s | 3 phases, 2 répits de 7 s | RETOUR | ÉCLIPSE, `colosse` |
| VICTOIRE | 6 s, sautable | arrêt sur le coup final, carcasse, purge, SECTEUR NETTOYÉ | OUTRO | `victoire` |
| Initiales, puis fin | — | bilan, build, note, défis, records, prochain déblocage | OUTRO, puis INTRO | — |

- **Durée totale** pour le pilote bon qui gagne : **5 min 20 à 6 min 30**.
- **REJOUER** ramène directement à la PLONGÉE, sans titre ni briefing : on tient le serpent moins de 2 s
  après le toucher, et la vague 1, resserrée à 22 s, n'ennuie pas à la relance.
- **La fin d'une vague.** Une vague se termine quand tout son quota est apparu et qu'il reste au plus 2
  ennemis vivants ; ces deux derniers explosent dans la purge de vague.
- **La soupape.** Si la vague n'est pas finie à sa durée nominale + 12 s, les survivants se replient : ils
  fuient hors champ, ne blessent plus, et il n'y a pas de bonus. Aucun ennemi n'est reporté à la vague
  suivante (leçon C3).
- **La respiration.** Chaque vague commence par une **entrée de 6 s** où seule sa première formation est
  lâchée. Avec le NETTOYAGE, les cartes et LE VOL, les ennemis vivants restent sous 40 % du pic précédent
  pendant au moins 8 s (G-17). Les planeurs du DÉFILÉ, inoffensifs, ne comptent pas comme ennemis vivants.
- **Le rythme.** Les apparitions de formation tombent sur la grille des temps de jeu (144,6 BPM, § 7.2), au
  plus tard au temps suivant (0,41 s).

### 4.2 Les vagues, chiffrées (`N.R.secteurs[0].vagues`)

| Vague | Quota | Durée nominale | Plafond d'ennemis vivants | Charges simultanées de flèches | Formations et événements (instant après l'entrée) |
|---|---|---|---|---|---|
| 1 ÉVEIL | 24 | 22 s | 10 | 1 | FILE à +0 et +5 ; **NUÉE à +10** ; **DUO DE MINES à +14** (2 mines sur la trajectoire anticipée, à 90 px au moins) ; **PINCE à +17** ; FILE pour remplir |
| 2 MEUTE | 48 | 42 s | 16 | 2 | MEUTE à +2, +14 et +28 ; CHAMP DE MINES à +8 et +30 ; PINCE à +18, +26 et +36 ; NUÉE à +10 et +22 ; **TRAVELLING à 8 px/s dès +12** ; PASTILLE à +20 |
| 3 BATTERIE | 54 | 44 s | 20 | 3 | BATTERIE à +4 et +24 ; MEUTE à +10 ; PINCE à +16 et +34 ; FILE pour remplir ; **TRAVELLING à 12 px/s dès +4** ; PASTILLE à +14 ; **PIC à +30 : FLÈCHE BLINDÉE et sa MEUTE**, avec bannière |
| DÉFILÉ | 40 planeurs | 24 s | — | — | 5 ESCADRILLES de 8, toutes les 4,5 s |
| 4 ESSAIM | 60 | 48 s | 24 | 3 | ESSAIM à +3 et +28 ; DUEL (lames) à +10 et +34 ; GARDE (sentinelles) à +20 ; CHAMP DE MINES à +40 ; MEUTE à +6 et +24 ; **CONVOIS dès +8, toutes les 9 ± 2 s** ; PASTILLE à +18 ; **PIC à +30 : LE RIVAL**, avec bannière |
| 5 DÉFERLANTE | 80 | 50 s | 32 | 4 | toutes les formations, deux à la fois ; 10 % des ennemis ordinaires portent RAPIDE ; **TRAVELLING à 14 px/s dès +6** ; **CONVOIS toutes les 14 s dès +12** ; PASTILLE à +22 ; **PIC à +32 : RUCHE INSTABLE**, avec bannière |

**Les règles transversales** :

- **Le premier ennemi**, à la toute première partie, arrive 3 s après le premier virage de plus de 45°, ou
  à 6 s au plus tard (J-14). Rien n'est dangereux pendant les 5 premières secondes. Aux parties suivantes,
  la première FILE entre à +1 s.
- **La première minute fait peur.** Les mines de +14 s et les dards de +17 s sont la première vraie menace,
  avant 0:20 ; le pilote bon prend au moins un coup en V1 dans 40 % des graines (§ 4.10).
- **Le TRAQUEUR**, de la vague 2 à la vague 5 :
  - il entre si la joueuse n'a **ni détruit ni ramassé** quoi que ce soit pendant **7 s** ;
  - il est annoncé 1,5 s avant (chevron, sirène, bannière TRAQUEUR) ;
  - un second suit 6 s plus tard si l'attente dure ;
  - tous fuient à la fin de la vague.
- **La traque de fin de vague**, à la façon de Cruise Elroy dans Pac-Man : quand il reste moins de 20 % du
  quota, les dernières flèches accélèrent de 30 %, pour que la fin de vague ne soit jamais un nettoyage
  tranquille.
- **Les vitesses d'approche** des flèches montent avec les vagues : 50, 55, 60, 65 puis 70 px/s. Les
  télégraphes ne changent pas.
- **Le plafond dur** est de 40 ennemis et 80 tirs ennemis au plus (G-16). Au plafond, les apparitions
  attendent.

### 4.3 Les formations (nommées, annoncées 1 s avant)

| Formation | Composition et entrée | Ce qu'elle enseigne |
|---|---|---|
| FILE | 3 flèches en ligne depuis un bord | le canon, la flèche |
| MEUTE | 6 flèches en V ; elles entrent en arc à la manière de Galaga | la pression et la chaîne |
| NUÉE | 6 à 8 larves en spirale | le LASSO |
| DUO DE MINES | 2 mines sur la trajectoire anticipée, à 90 px au moins ; marqueurs 1,5 s avant | le contournement, dès la vague 1 |
| CHAMP DE MINES | 9 mines en grille de 3 × 3 sur la trajectoire anticipée, à 100 px au moins ; marqueurs 1,5 s avant | le contournement |
| PINCE | 2 dards depuis les deux flancs | le changement de cap au dernier moment |
| BATTERIE | 3 tourelles en ligne, qui tirent à 0,4 s d'écart | les prendre de côté |
| ESSAIM | 1 ruche et 6 larves | la cible prioritaire |
| DUEL | 2 lames depuis des bords opposés | plier le serpent |
| GARDE | 1 sentinelle et 4 flèches | les lignes de laser |
| ESCADRILLE | 8 planeurs en courbe de Galaga (entrée par un bord, boucle, sortie en 8 s) | le LASSO sur une file qui passe |

Le nom d'une formation s'affiche en bannière à sa première rencontre dans le profil. Ensuite, ce n'est
plus qu'une étiquette d'une seconde.

### 4.4 Le bestiaire retenu (`N.R.ennemis`)

Tous les ennemis sont en magenta, rose pâle et sang, avec un contour d'un pixel en nuit profonde, jamais de
cyan. **La famille se lit à la forme** :

- des pointes pour ceux qui foncent ;
- des blocs à canon pour ceux qui tirent ;
- des rondeurs, des pattes et des pétales pour ceux qui dérèglent ;
- un corps en perles pour le RIVAL, le seul autre serpent.

**Le télégraphe a deux temps** : magenta en pointillés qui courent, qui dit QUI et OÙ ; puis rose pâle
plein pendant les 300 dernières ms, qui dit QUAND. Il est toujours gainé de nuit profonde et dessiné à
l'endroit exact des dégâts.

| Ennemi (identifiant) | Rôle | PV | Rayon | Comportement chiffré | Télégraphe | Contre | Sprite |
|---|---|---|---|---|---|---|---|
| **FLÈCHE** (`fleche`) | le chasseur, qui vise la tête | 20 | 5 | approche de 50 à 70 px/s ; à 40-110 px et rechargée, elle **se fige 0,6 s**, puis bondit à 160 px/s pendant 0,42 s (67 px) ; recharge 1,6 s ; **esquive latérale** de 0,25 s à 70 px/s si elle est dans l'axe de la tête (moins de 12°) à moins de 60 px sans charger (recharge 1,2 s) | ligne de **67 px exactement**, la flèche gonfle d'un pixel et son cœur passe de sang à rose pâle | s'écarter de sa ligne | existe (15 × 15), plus une image « armée » |
| **DARD** (`dard`) | le coupeur, qui vise où l'on va | 30 | 5 | croisière 60 px/s ; vise la tête + vitesse × min(d / 165, 1,0) ; verrouille 0,6 s, cible **gelée** ; fuseau à 165 px/s pendant 0,5 s (82 px) ; rebondit sur les murs en montrant la ligne de rebond ; recharge 2,0 s | ligne vers le point gelé et losange qui se resserre de 9 à 5 px | changer de cap au dernier moment | nouveau, 15 × 15, deux fourches avant |
| **LARVE** (`larve`) | la nuée | 10 | 3,5 | zigzag à 55 px/s ; en orbite à 30 px de la queue, elle **mord les 3 derniers segments** (coupe d'1 segment) ; morsure annoncée 0,5 s ; son contact avec la tête tue | anneau qui se resserre sur le segment visé | le LASSO, ou tourner court | nouveau, 9 × 9, éclat à pattes |
| **MINE** (`mine`) | le contrôle de zone | 20 | 5,5 | dérive à 4 px/s vers une station ; **cercle d'armement de 34 px toujours affiché** en violet tramé ; elle s'amorce quand la tête ou un segment y entre ; mèche de 0,8 s ; souffle de 30 px (tête : mort, corps : coupe) ; **abattue, elle explose sans blesser la joueuse** et blesse les ennemis (réaction en chaîne) | cercle qui passe au rose pâle, cœur qui bat de plus en plus vite, disque de souffle qui se remplit | l'abattre de loin, s'en servir comme bombe | existe (13 × 13) |
| **TOURELLE** (`tourelle`) | le tireur | 60 | 6,5 | orbite dans une bande de 120 ± 25 px autour de la tête, à 35 px/s ; vise 0,75 s ; balle à 95 px/s, portée 160 px ; 3 tirs puis elle change de bande ; **blindée de face** : un tir reçu dans ± 45° de sa face ricoche (étincelle et son `ricochet`) | ligne de tir sur la portée réelle et **crochet d'impact** : losange de 5 px, rose pâle s'il touchera la tête, magenta s'il touchera le corps | la prendre de côté | existe (15 × 15), canon orienté |
| **LAME** (`lame`) | le trancheur | 50 | 6 | approche à 45 px/s ; à moins de 150 px et dans la vue, elle **recule 0,6 s** pendant qu'un laser s'allonge sur toute sa trajectoire, puis traverse à 230 px/s pendant 0,82 s (190 px) ; elle coupe le corps (une fois par passage) et tue la tête ; **récupération** de 0,8 s : corps rose pâle, dégâts reçus × 2 | ligne de 190 px, recul et lames qui tournent | sortir de sa ligne, frapper pendant la récupération | nouveau, 15 px au repos et 21 px lames déployées |
| **RUCHE** (`ruche`) | la source, cible prioritaire | 240 | 11 | 25 px/s ; garde 90 px de la tête ; ses pétales s'ouvrent en 0,7 s, puis un portail de couvée de 0,6 s donne 3 larves, toutes les 3,5 s (12 larves de ruche au plus) ; arc de PV d'un pixel | pétales ouverts, cœur qui blanchit, anneaux concentriques | missiles, LASSO | nouveau, 23 × 23 |
| **SENTINELLE** (`sentinelle`) | le tireur d'élite | 60 | 6,5 | orbite à 80 px de la tête ; vise 0,85 s ; laser de 0,35 s qui traverse la vue (300 px) ; recharge 3 s ; 2 lasers au plus en même temps | ligne pâle sur toute la longueur, pupille qui se fixe | sortir de l'axe | existe (15 × 15) |
| **RIVAL** (`rival`), élite de V4 | l'autre serpent, à la façon des motos de Tron | tête : 180 ; corps invulnérable | tête 5,5, segments 3,5 | une tête et 10 segments espacés de 5 px ; vitesse 0,9 × celle de la joueuse ; rayon de virage 14 px ; vise un point 40 px devant la tête de la joueuse (comme Pinky) ; évite les murs à 24 px ; laisse une **traînée magenta d'un pixel qui dure 1,5 s** et qui tue la tête de la joueuse (cause `traine`) et coupe son corps ; **coupe-route** : quand il est à moins de 60 px devant la joueuse, il vire en travers de sa route ; **il meurt en s'écrasant** : sa tête touche un mur, sa propre traînée, son corps, ou **le corps ou la traînée de la joueuse** (prime CRASH) ; il meurt aussi au LASSO et sous les armes, qui ne touchent que sa tête (les tirs sur son corps disparaissent) | coupe-route annoncé 0,5 s : sa tête passe au rose pâle et un chevron marque le point visé ; la traînée est visible dès qu'elle tue | le pousser contre son propre corps, l'enfermer | nouveau : tête 11 × 11 à mâchoires, perles de 7 px en sang à cœur magenta |
| **PLANEUR** (`planeur`), du DÉFILÉ | la cible bonus | 10 | 4 | suit sa courbe d'ESCADRILLE ; ne tire pas, ne touche pas, sort de l'écran en 8 s | aucun (inoffensif) | tout abattre | nouveau, 9 × 9, aile en chevron ouvert, en rose pâle et sang |
| **TRAQUEUR** (`traqueur`) | contre l'attente (le baron de Bubble Bobble, les Baiters de Defender) | invulnérable aux armes | 6 | vitesse = 0,95 × celle du serpent (l'accélération le sème) ; il suit la tête ; il ne meurt que dans un LASSO, ou dévoré pendant l'INVERSION (5 000 × multiplicateur) ; il fuit à la fin de la vague | portail de 1,5 s, sirène, bannière TRAQUEUR, rose pâle qui clignote à 2 Hz sur le radar | agir, l'enfermer, ou le dévorer | nouveau, 15 × 15 : disque à œil fendu, halo de pointillés qui tourne (pour ne pas être confondu avec le RIVAL) |

**L'échelle des projectiles.** Le tir ennemi mesure 5 × 5 au moins, avec un liseré sombre d'un pixel, et
sa zone qui tue a un rayon de 2 px. Il a son propre son, `tirEnnemi`, qui ne ressemble pas au tir de la
joueuse (corrélation sous 0,5).

**La première rencontre.** Quand un type apparaît pour la première fois dans le profil, une carte de codex
s'affiche **sans geler le jeu**, pendant 2 s, dans le coin opposé à la tête, pendant l'entrée d'une vague :
le sprite à l'échelle 2, le nom en magenta et une ligne de caractère en acier. Les lignes sont :

| Ennemi | Ligne de caractère |
|---|---|
| FLÈCHE | SE FIGE, PUIS FONCE |
| DARD | VISE OÙ TU VAS |
| LARVE | MORD TA QUEUE |
| MINE | S'ARME QUAND TU ENTRES |
| TOURELLE | BLINDÉE DE FACE |
| LAME | RECULE PUIS TRAVERSE TOUT |
| RUCHE | PONDEUSE DE LARVES |
| SENTINELLE | LASER QUI TRAVERSE L'ÉCRAN |
| RIVAL | VEUT TE COUPER LA ROUTE |
| PLANEUR | NE TIRE PAS : ABATS-LES TOUS |
| TRAQUEUR | SEUL UN LASSO LE TUE |
| CONVOI | BALAIE SA VOIE |

### 4.5 Les élites et les modificateurs

- **Une élite** a trois fois les PV de son type et un sprite de 19 à 21 px dessiné à la main, jamais un
  agrandissement non entier.
  - Elle porte une **couronne** de pointillés rose pâle qui tourne.
  - Son nom passe en bannière : « FLÈCHE BLINDÉE », « LE RIVAL », « RUCHE INSTABLE ».
  - Sa mort est une **grosse explosion** (force supérieure à 0,6) avec un gel de 5 images.
  - Elle lâche 6 cellules et un noyau, et donne +12 à l'APOGÉE.
  - Il y a **un pic connu par vague**, de la vague 3 à la vague 5, entre 55 et 75 % de la durée (G-07) :
    la FLÈCHE BLINDÉE en V3, LE RIVAL en V4, la RUCHE INSTABLE en V5.
  - LE RIVAL est une élite par nature : il porte la couronne, mais garde ses PV du § 4.4.
- **Les trois modificateurs du secteur** :

| Modificateur | Effet | Signe visible |
|---|---|---|
| BLINDÉ | des plaques donnent × 2 PV en plus ; elles éclatent à 50 % et l'allure passe alors à × 1,4 | plaques de sang à rivets rose pâle ; leurs débris restent au sol 3 s ; les pattes trottinent deux fois plus vite une fois les plaques tombées |
| RAPIDE | allure × 1,5, recharges × 0,7 ; **jamais l'annonce** | deux rémanences tramées en sang |
| INSTABLE | à sa mort, il devient une mine amorcée : mèche de 0,8 s, souffle de 34 px qui blesse **tout le monde**, télégraphié comme une mine | cœur en brasier qui bat d'autant plus vite que ses PV baissent |

### 4.6 Les événements d'arène : le plateau qui se déplace (`73-arene.js`, `N.arene`)

**Le TRAVELLING** (V2, V3, V5), à la façon de Defender et de Moon Patrol : l'arène devient une fenêtre
de **576 × 512 px** (la hauteur du monde) qui voyage à travers le monde.

- **La mise en place** : les murs latéraux glissent des bords du monde jusqu'à l'arène en 3 s, positions
  finales hachurées dès le premier instant. L'arène est placée pour contenir la tête avec au moins 80 px de
  marge, et part vers le côté où il reste le plus de monde.
- **L'annonce du départ** : 2 s de chevrons qui battent sur le mur arrière, un grondement (`travelling`) et
  l'étiquette « LE PLATEAU AVANCE ». Puis l'arène se met en marche, à 8, 12 ou 14 px/s selon la vague.
- **Le mur arrière** tue la tête comme tout mur, et **coupe le corps qui traîne** à son contact : il faut
  rester devant avec toute sa longueur. Son pan s'allume quand la tête ou un segment s'en approche à moins
  de 24 px.
- **Ce qu'il dépasse est perdu** : le butin ; les ennemis, qui meurent sans butin ni score (source `mur`).
- **Les apparitions** naissent devant le mur arrière (§ 3.8). La caméra est bornée à l'arène qui voyage.
- **La fin** : quand l'arène atteint le bord du monde, elle s'arrête et le TRAVELLING de la vague prend
  fin ; au NETTOYAGE, les murs reviennent aux bords du monde en 2 s.
- **La cible** : l'arène est en mouvement pendant au moins 25 % du temps des vagues 2 à 5 (R-31).

**Les CONVOIS** (V4, V5), repris de l'autoroute de SNAKE 2030, mais annoncés et récompensés :

- **Les voies** : cinq voies horizontales de 20 px de haut, aux ordonnées 64, 160, 256, 352 et 448, qui
  traversent toute l'arène. Jamais deux fois de suite la même voie, jamais deux convois à la fois.
- **L'annonce, 1,5 s avant** : la voie se hachure de magenta tramé à 25 %, un cône de phares tramé avance
  depuis le bord d'arrivée, un chevron s'allume au bord de l'écran, le klaxon `convoi` part, panoramisé
  du côté d'arrivée. Aucune annonce ne commence dans les 3 s qui suivent la bannière d'une élite.
- **Le convoi** : 6 wagons de 18 × 14 px (caisses en sang, arêtes magenta, museau rose pâle qui pulse sous
  3 Hz, gaine de nuit profonde), à 240 px/s. Il tue la tête (`convoi`), coupe le corps et **broie les
  ennemis** qu'il traverse : ils comptent comme des destructions de la joueuse (chaîne, score, butin),
  « BROYÉ ×n ».
- **Le SILLAGE** : la tête dans les 40 px derrière le dernier wagon, dans la voie, accélère gratuitement
  (× 1,4 sans vider la réserve), et les ennemis broyés pendant ce temps comptent double. Rouler dans une
  voie rapporte enfin quelque chose : c'est un outil, pas seulement un piège.
- **La fréquence** : en V4, le premier à +8 s, puis toutes les 9 ± 2 s (flux `N.rng('arene')`) ; en V5,
  toutes les 14 s dès +12 s.

### 4.7 LE DÉFILÉ, étape bonus (à la place du répit passif)

L'ancien RÉPIT (une pluie de cellules et des cartes) était un temps mort. Il devient la « Challenging
Stage » de Galaga : une récompense qu'on joue.

- **Quand** : entre la vague 3 et la vague 4, dans le quartier LE CIEL, après un VOL. 24 s.
- **Quoi** : 5 ESCADRILLES de 8 planeurs entrent toutes les 4,5 s, par des bords alternés, en courbes de
  Galaga (entrée, boucle, sortie en 8 s). Ils ne tirent pas et ne blessent pas au contact. Les murs et la
  morsure tuent toujours.
- **Le score** : 100 × multiplicateur par planeur ; un LASSO sur une escadrille entière est le geste roi.
- **PARFAIT** : 40 sur 40 donne 10 000, un bandeau, et une rare garantie dans la main suivante. Le compteur
  « 31 / 40 » est affiché sous le radar pendant l'étape.
- **La musique** passe en RESPIRATION ; le décor est en état `calme`.

### 4.8 LE CYCLOPE, boss en trois phases

- **La taille.** Son corps mesure **96 × 128 px**, soit les deux tiers de la hauteur en paysage. Il est
  assemblé à partir de pièces :
  - un tronc et une tête à œil unique de 40 × 32 ;
  - deux mains de 24 × 24 ;
  - 6 plaques de 12 × 12 ;
  - une carcasse.
- **Ses silhouettes de décor** : une silhouette lointaine de 48 px et une silhouette intermédiaire de 80 px,
  en sang et en nuit, découpées dans `boss.png`. La silhouette lointaine se voit déjà devant le soleil dans
  LE CŒUR (V5), immobile, pour promettre ce qui vient.
- **Où on le frappe.** Il ne prend de dégâts **qu'à l'œil ouvert** et aux mains ; ailleurs, les tirs
  ricochent.
- **Ses PV.** **1 500 par phase**, soit 4 500 en tout, et **300 par main**.
- **Pas de vagues pendant le combat.** Il n'y a aucune vague ordinaire, seulement ses invocations.

**Entrée** (au total 6,8 s, dont 1,6 s gelées et sautables) :

1. **WARNING**, 3,0 s, sans gel, après le nettoyage de la vague 5 :
   - deux bandes « WARNING » magenta et nuit profonde, de 10 px de haut, défilent en sens inverse en haut et
     en bas de l'écran ;
   - la voix dit WARNING (P3 ; sinon le mot s'écrit), la musique se coupe 250 ms sur la mesure, puis la
     sirène monte ;
   - le soleil entre en éclipse et la cité s'éteint rangée par rangée ;
   - les murs se resserrent jusqu'à l'arène ;
   - la silhouette lointaine apparaît devant le soleil (P2), puis passe sur le plan des structures (P5).
2. **Le panneau `boss`** reste 1,6 s : jeu gelé, révélation de bas en haut, nom LE CYCLOPE. Il se saute d'un
   toucher (garde de 300 ms).
3. **L'arrivée** dure 2,2 s : il traverse du plan P5 au plateau, en passant du sang au magenta. Le monde
   ralentit à 0,3 mais la joueuse garde sa vitesse. Il est invulnérable pendant ce temps, et sa jauge en
   haut se **remplit en 0,9 s**, avec deux encoches de phase.

**Les phases** :

| Phase | Seuil | Attaques (télégraphe de 0,8 s au moins) | Ouverture de l'œil |
|---|---|---|---|
| 1, LE REGARD | 100 → 66 % | **RAYON BALAYANT** : l'œil vise 0,9 s (arc tramé sur tout le secteur balayé, plus la ligne de départ), puis un laser de 5 px balaie 100° en 1,2 s. **SALVE RADIALE** : un anneau se charge sur l'œil pendant 0,8 s, puis 14 balles partent à 70 px/s, deux salves décalées à 0,5 s d'écart. Tous les 3 cycles, il appelle une FILE de 3 flèches | 1,4 s après chaque attaque |
| 2, LES MAINS | 66 → 33 % | les plaques tombent et restent au sol ; les deux **MAINS** se détachent et chargent en ciseaux comme des lames (lignes croisées annoncées 0,8 s, coupent le corps et tuent la tête) ; SALVE RADIALE entre deux charges ; une MEUTE à l'entrée de la phase | 3 s à la destruction de chaque main ; 1,4 s après chaque salve |
| 3, LA COLÈRE | 33 → 0 % | **BONDS** : une ombre de 40 px est annoncée 1,0 s avant ; il retombe en écrasant, et 6 mines s'arment 0,6 s autour de l'atterrissage ; **SALVE DOUBLE** (2 × 14 balles en spirale) ; l'arène se resserre de 15 % | 1,4 s après chaque bond |

- **Entre deux phases**, un répit de 7 s : il se replie dans le plan des structures, où on ne peut pas le
  toucher. Il pleut 8 cellules, et la bannière annonce la phase suivante.
- **L'enragement.** Après 100 s de combat, son allure passe à × 1,3 et l'intervalle entre ses attaques à
  × 0,75, sans jamais raccourcir un télégraphe. La bannière dit LE CYCLOPE S'EMBALLE et l'œil passe au
  brasier.
- **Il n'y a pas de victoire au chronomètre.** On gagne en le détruisant.
- **Sa mort** :
  - **arrêt sur le coup final de 24 images** ;
  - 5 explosions en cascade en 0,66 s. La part de brasier dépasse 8 % de l'écran pendant au moins 4 images,
    et la caméra bouge d'au moins 6 px ;
  - **sa carcasse tombe dans le plan des structures** en 3 s, dans la poussière ;
  - puis vient la **PURGE** : tout ce qui reste explose dans l'ordre des distances, toutes les 45 ms ;
  - SECTEUR NETTOYÉ, et la main trophée.

**Les cibles de mesure** :

- le combat dure de **55 à 90 s** chez le pilote bon, et au moins **30 s** chez le kamikaze invulnérable ;
- le CYCLOPE inflige **au moins 35 %** des coups reçus pendant son combat [I] ;
- **100 % de ses attaques** sont télégraphiées au moins 800 ms avant.

### 4.9 Ce qui est retenu, en un coup d'œil

- **Ennemis** : FLÈCHE, DARD, LARVE, MINE, TOURELLE, LAME, RUCHE, SENTINELLE, RIVAL, PLANEUR, et le
  TRAQUEUR.
- **Élites** : FLÈCHE BLINDÉE, LE RIVAL, RUCHE INSTABLE. **Modificateurs** : BLINDÉ, RAPIDE, INSTABLE.
- **Événements d'arène** : TRAVELLING, CONVOIS et SILLAGE, PASTILLE et INVERSION. **Étapes** : LE VOL, LE
  DÉFILÉ.
- **Boss** : LE CYCLOPE, en trois phases.
- **Armes**, à quatre paliers chacune : CANON, TOURELLES, ARC, MISSILES, DRONES, MINES DE QUEUE.
- **Passifs** : PUISSANCE, CADENCE, AIMANT, CROISSANCE, RÉPARATION, BOUCLIER, ÉPERON, GRAPPE, SANG-FROID,
  BRAISE.
- **Pouvoirs** : TRAVERSÉE, RALENTI, REPLI. **Ultime** : APOGÉE. **Verbe** : LASSO.
- **Renvoyés à la campagne** (§ 9) : miroir, voleur, tique, brouilleur, faucheur, champs magnétiques,
  Fugitifs et Ravisseurs, Capteur et serpent jumeau, armes ONDE et SILLAGE, modificateurs SAUTEUR,
  RÉGÉNÈRE et GARDE.

### 4.10 La difficulté, chiffrée par des pilotes

**Le banc.** Les mesures de difficulté se font sur le profil iPhone 13 en paysage, avec `__DT = 1/60`, en
mode simulé sans dessin (`dbg.simuler`, § 7.12), en première partie (profil vierge), sans CONTINUER.
**Toute proportion se mesure sur 50 graines** (1 à 50) : sur 20, l'erreur type vaut ± 11 points autour de
50 %. Les autres profils ne servent qu'au zéro erreur (5 graines chacun). Les pilotes vivent dans
`85-pilote.js` ; ils lisent `S`, `S.tele` et les schémas du § 7.5, et écrivent `S.input`.

**Les pilotes sont spécifiés et gelés avant le réglage.** Le gardien du contrat écrit au lot 0 leur
spécification (`refonte/lots/pilotes.md`) : poids et rayons du champ de potentiel, temps de réaction, bruit,
ordre de préférence des cartes par identifiant, règles de LASSO, de pouvoir et d'APOGÉE. Le lot 9 règle
`N.R`, jamais les pilotes : sinon on règle un pilote pour qu'il tombe dans ses cibles, ce qui ne mesure
rien.

Chaque cible est **bloquante (B)** ou **indicative (i)**, et la colonne de droite dit quels paramètres de
`N.R` la règlent en premier.

| Pilote | Comportement | Cibles | Paramètres de réglage |
|---|---|---|---|
| **inerte** | ne touche à rien | perd ses 3 vies avant 0:35 dans 100 % des graines (B) ; première mort, au mur, en moins de 8 s (B) | — (conséquence des murs) |
| **tourneur** | manche fixé à 90° du cap : il tourne en rond | perd ses 3 vies avant 1:30 dans 100 % des graines (B) ; score inférieur à 10 % de celui du pilote bon (i) | délai du TRAQUEUR, TRAVELLING |
| **maladroit** | décide toutes les 0,7 s, vise la cellule ou l'ennemi le plus proche à ± 35° près, n'esquive pas, n'accélère pas, n'emploie ni pouvoir ni APOGÉE ; cartes au hasard (flux `pilote`) | game over médian entre 0:45 et 2:30 (B) ; n'atteint jamais le CYCLOPE (0 sur 50) (B) ; premier coup reçu avant 0:30 dans 80 % des graines au moins (i) | densité de V1 et V2, vitesses des flèches |
| **kamikaze** | fonce sur l'ennemi le plus proche, accélère au-delà de 40 px, pouvoir dès qu'il est prêt, APOGÉE dès qu'elle est pleine, n'esquive rien | game over avant le CYCLOPE dans 90 % des graines au moins (B) ; gagne au plus 2 fois sur 50 (B) | PV et rayon des ennemis, ÉPERON |
| **humain** | le pilote bon, avec 120 ms de réaction, ± 10° d'erreur de cap, des lassos tentés sans planification, et ACTIONS AUTO | game over médian entre 2:00 et 3:30 (B) ; atteint le CYCLOPE dans 10 à 35 % (i) ; le bat dans 2 à 12 % (i) ; au moins un coup reçu en V1 dans 50 % (i) ; LASSO réussi dans au moins 50 % des tentatives jusqu'à 20 segments et 40 % de 30 à 40 (B) | plafonds, tolérance de fermeture du LASSO, durée de traînée |
| **bon** | champ de potentiel : répulsion des zones de télégraphe (`S.tele`), des tirs, des ennemis, des murs (24 px), des voies annoncées et de son corps ; attraction vers les cellules, la PASTILLE et les ennemis à environ 60 px ; tente un LASSO quand au moins 4 ennemis sont groupés dans 60 px ; temps de réaction de 80 ms ; TRAVERSÉE si un coup télégraphié frappe dans moins de 0,2 s ; APOGÉE si elle est pleine avec au moins 8 ennemis en vue ; cartes dans l'ordre de préférence fixe | atteint le CYCLOPE dans **30 à 60 %** des graines (B) ; le bat dans **10 à 30 %** (B) ; au moins une mort avant le CYCLOPE dans 70 % au moins (i) ; **au moins un coup reçu en V1 dans 40 % au moins** (i) ; longueur maximale jamais atteinte avant 2:00 (médiane) (i) | quotas, plafonds, PV du CYCLOPE, vitesses de croisière |
| **expert** | bon, avec 50 ms de réaction, planification du LASSO, accélération pour fuir, choix de cartes optimisé | atteint le CYCLOPE dans 80 % au moins (i) ; le bat dans **40 à 70 %** (B) ; perd au moins une vie dans 80 % des parties (B) ; au moins 10 LASSO et 2 APOGÉE par partie (i) | dégâts sur le CYCLOPE, charge de l'APOGÉE |
| **dieu** | bon et invulnérable (`__N.game.dbg.god`) | finit le secteur entre 5:20 et 6:30 (B) ; combat du CYCLOPE de 55 à 90 s (B) ; zéro erreur (B) | durées de vague, PV du CYCLOPE |

**Les invariants de rythme**, mesurés avec le pilote bon :

- le pic d'ennemis vivants croît de vague en vague (médianes : V1 < V2 < V3 < V4 < V5) (B) ;
- après chaque pic, il y a au moins 8 s sous 40 % de ce pic (B) ;
- aucun tir ennemi avant la vague 2 (B) ;
- l'écart de score entre bon et kamikaze est au moins de × 1,3 (la finesse paie : leçon de l'audit D5) (i).

**Le temps de calcul.** En mode simulé, une partie de 6 minutes coûte environ 10 s de calcul. Une passe
complète (8 pilotes × 50 graines) tient donc en environ une heure, et le lot 9 peut itérer.

---

## 5. L'audiovisuel

### 5.1 Les couleurs et leurs rôles (palette fermée inchangée)

La luminance relative (WCAG) de chaque encre est fixée une fois pour toutes, parce que les critères du
§ 5.2 s'en servent : vide 0,002 ; nuit 0,006 ; ardoise 0,012 ; violet 0,041 ; indigo 0,024 ; magenta 0,240 ;
rose pâle 0,438 ; cyan 0,555 ; cyan pâle 0,873 ; ambre 0,457 ; jaune 0,679 ; brasier 0,281 ; os 0,967 ;
acier 0,277 ; sang 0,061 ; nuit profonde 0,002. **Une encre est « lumineuse » si sa luminance dépasse
0,10** : magenta, rose pâle, cyan, cyan pâle, ambre, jaune, brasier, os et acier.

| Rôle | Encres |
|---|---|
| Joueuse et arsenal | cyan, cyan pâle ; os à l'impact ; gaine de nuit profonde. Jamais posé sur la tête |
| Danger : ennemis, tirs, télégraphes, murs, convois | magenta, rose pâle, sang, avec la gaine en nuit profonde |
| Butin | ambre ; jaune pour le cœur des noyaux et les rayons de la PASTILLE |
| Score, récompense, APOGÉE pleine | jaune |
| Explosions, cœurs chauds | brasier, jaune, os ; refroidissement en sang |
| Décor | vide, nuit, ardoise, indigo, violet, sang ; **lumière** en jaune, ambre, brasier, os et acier : pleins dans le soleil, tramés à 50 % au plus ailleurs |
| Interface neutre | acier, sur vide, nuit ou ardoise seulement (V-08) ; le HUD est posé sur des plaques de nuit profonde |

Les paires fragiles (leçon E1) se règlent par la forme et le contour :

- **magenta et brasier** (1,14:1) : toute menace garde son contour d'un pixel en nuit profonde, même au
  milieu d'une explosion ou devant le soleil ;
- **le butin** se reconnaît à sa silhouette en éclair et à son mouvement ; l'or du décor, lui, ne bouge pas
  plus vite que son plan ;
- **la tête** se reconnaît à sa forme et à sa gaine : rien ne la fait clignoter en entier.

### 5.2 Le décor lumineux et vivant : le monde ne s'arrête jamais

La comparaison jouée mesurait 97 % de pixels sombres dans la démo pendant les 30 premières secondes, et
demandait au moins 25 % de pixels non sombres en jeu. C'est désormais un plancher, pas un plafond.

**Les cibles de lumière**, mesurées sur le tampon d'index (formules au § 8.5, R-11) :

| État | Pixels lumineux (luminance > 0,10), tampon complet en jeu | Luminance moyenne du tampon |
|---|---|---|
| `calme` (dès t = 1 s) | **au moins 25 %** | au moins 0,075 |
| `montee` | au moins 28 % | au moins 0,085 |
| `chaos` | au moins 32 % | au moins 0,095 |
| `colosse` | au moins 25 % | au moins 0,075 |

Pour repère, l'ouverture au titre, que la propriétaire a aimée, a une luminance moyenne de 0,089, et
l'`affiche` de 0,116 ; la démo en jeu avait 0,0155 à t = 1 s. Deux garde-fous complètent ces cibles :

- **le jeu reste devant** : le décor seul (sans entités ni HUD) a entre 18 et 28 % de pixels lumineux ;
- **on fait au moins aussi bien que SNAKE 2030** : à t = 30 s, au même profil, la part de pixels lumineux
  est au moins celle de SNAKE 2030 au même instant de son premier secteur.

**D'où vient la lumière**, en état `calme`, en paysage (ordre de grandeur, à confirmer par la mesure) :
le soleil et ses bandes (environ 6 % de l'écran), la bande d'horizon embrasée (3 %), les fenêtres et les
enseignes du quartier (5 à 8 %), le reflet du soleil sur le sol (2 %), les lignes du sol éclairées et les
faisceaux (2 à 3 %), soit 18 à 22 % pour le décor ; le serpent, les ennemis, le butin et le HUD ajoutent le
reste.

**Ce que la joueuse voit bouger, même quand elle ne fait rien** :

- **le sol** avance d'une case par temps ;
- **les bandes du soleil** glissent d'une rangée toutes les 2 mesures ;
- **la brume** dérive ;
- **les étoiles** scintillent en deux phases.

**Le cyclage de palette**, recalculé à chaque temps : les enseignes de la cité tournent en sang → brasier →
ambre → jaune, les balises des structures passent du sang à la nuit à la noire, et de petits trains de
lumières (points os et ambre) traversent la cité au loin.

**Les projecteurs des structures** : deux faisceaux tramés en os à 12 % balaient le ciel à 0,2 Hz.

**Ce qui réagit au jeu** :

- **la grille du plateau ondule** autour des explosions (§ 5.3), sur le modèle de Geometry Wars ;
- **les fenêtres de la cité** s'allument en ambre par rangées à chaque élite tuée (le limiteur les compte) ;
- **les intersections du plateau** passent de l'indigo au violet pendant 2 images sur la grosse caisse ;
- **un éclair** tombe sur l'horizon à chaque APOGÉE ; au chaos, des éclairs tombent au loin et des débris de
  la cité tombent au premier plan.

**Les autres objectifs mesurés** (§ 8.5) :

- moins de 30 % de vide à t = 1 s ;
- au moins 15 % de pixels changés en 0,5 s, en croisière, rien que par le défilement ;
- au moins 3 % de pixels changés en 1 s quand le serpent est immobile, au briefing ou dans la démo.

### 5.3 Les temps forts mis en scène (`79-scene.js` les orchestre, une voix à la fois)

`79-scene.js` est le seul module qui transforme un événement de jeu (§ 7.4) en explosion, gel, poussée de
caméra, son, voix et bannière. Les autres modules ne font que signaler.

| Événement | Image | Temps | Son | Mot |
|---|---|---|---|---|
| Kill ordinaire | explosion de force 0,32, ou 0,45 pour les tireurs, + 0,03 par destruction enchaînée (0,58 au plus) ; flash de frappe ; recul de caméra de 1 px | gel de 2 images, au plus toutes les 0,12 s | `kill`, qui monte d'un degré de la pentatonique par palier (aucun kill muet : empilement) | « +pts » |
| Palier de chaîne × 3, × 5, × 8 | onde jaune sur toute la largeur, « ×5 » en grand pendant 0,4 s | — | `palier` (accord) | voix EXCELLENT à × 8 |
| LASSO | remplissage tramé cyan puis os, onde de la boucle | gel de 4 images si n ≥ 4 | `lasso` (accord de n notes) | « LASSO ×n », voix EXCELLENT si n ≥ 4 |
| Coupe du corps | segments détachés en cellules qui clignotent, bande de bord en sang du côté du coup | gel de 3 images | `coupe` | — |
| Élite tuée | explosion de force supérieure à 0,6, secousse, grille qui ondule sur 48 px, fenêtres de la cité allumées | gel de 5 images | `bigkill` | nom barré dans la bannière |
| RIVAL écrasé | explosion d'élite au point du choc, la traînée magenta se dissout de la tête vers la queue | gel de 6 images | `crash` | « CRASH ! » |
| INVERSION | décor sur sa table d'inversion, proies en ardoise | — | cue `inversion`, `devore` qui monte à chaque proie | « INVERSION ! », puis « +1600 » |
| Convoi annoncé, puis passé | voie hachurée, phares ; au passage, poussée de caméra de 2 px | — | klaxon `convoi`, panoramisé | « BROYÉ ×n » |
| Départ du TRAVELLING | chevrons sur le mur arrière | — | `travelling` (grondement) | « LE PLATEAU AVANCE » |
| VOL | balayages d'entrée et de sortie, portes | — | souffle, `porte` qui monte | « VOL PARFAIT » |
| DÉFILÉ PARFAIT | onde jaune, compteur 40 / 40 qui bat | — | `defi` | « PARFAIT » |
| Vague nettoyée | purge des 2 derniers, onde depuis la tête, bonus compté ligne à ligne avec un bip | 2,5 s | stinger d'une mesure | « VAGUE 2 NETTOYÉE », PARFAIT si sans coupe |
| Montée de niveau | anneau jaune depuis la tête, pulsation de la queue à la tête | ralenti à 0,15 pendant 350 ms | `levelup` (arpège majeur) | — |
| APOGÉE | 6 anneaux tramés, monde ralenti, éclair sur l'horizon | gel de 6 images, puis 0,25 pendant 0,42 s | plongée de la musique puis retour en force | — |
| Pouvoir | onde propre au pouvoir autour de la tête | — | `traversee`, `ralenti` ou `repli` | étiquette d'1 s |
| Danger proche | bords tramés en sang qui battent à 1,2 Hz, pastilles de vie rose pâle et os | — | `battement` (lub-dub dans les médiums) | — |
| TRAQUEUR | chevron au bord, bannière | — | `traqueur` (sirène sur deux notes) | voix DANGER |
| Entrée du CYCLOPE | § 4.8 | ralenti à 0,3 pendant 2,2 s | coupure, sirène, `warning` | voix WARNING |
| Changement de phase du CYCLOPE | plaques qui tombent, repli dans le décor | 7 s | stinger | « PHASE 2 : LES MAINS » |
| Mort du CYCLOPE | § 4.8 | arrêt de 24 images | `colosseMort` (cadence majeure) | SECTEUR NETTOYÉ |
| Défi réussi ou raté | bandeau avec coche ou croix | — | `defi` ou `defiRate` | — |
| Vie bonus | pastille qui naît, en cyan pâle | — | `vie` | « VIE + 1 » |
| Mort | § 5.4 | — | — | — |

**Les budgets** (leçon D4), mesurés sur une partie complète :

- au plus 3 flashs par seconde au-delà du seuil d'aire (limiteur de `50-fx.js`) ;
- au plus 12 % d'images secouées ;
- une bannière toutes les 10 s au plus, hors événements du CYCLOPE ;
- jamais deux textes de bannière à la fois.

### 5.4 La mort mise en scène (`N.joueuse` la signale, `79-jeu.js` la séquence, `79-scene.js` la montre)

| Temps | Image | Son |
|---|---|---|
| 0 | **gel de 10 images** ; la tête passe en os ; le reste du monde est remappé en nuit et en ardoise par une table d'index, sauf la joueuse et la **cause, entourée d'un anneau magenta d'un pixel** qui clignote à 3 Hz (pour un mur, c'est le pan de mur ; pour un convoi, son wagon ; pour la traînée du RIVAL, le tronçon touché) ; le nom de la cause en bas (« TIR DE TOURELLE ») | `N.music.cue('mort')` : la musique est **coupée net** (15 ms), puis vient le son `mort` (glissando carré descendant d'une octave et demie en 0,9 s, avec une composante dans les médiums) |
| 0,17 → 0,9 s | ralenti à 0,25 ; **désintégration de la queue vers la tête**, un segment toutes les 2 images, chaque segment en anneau cyan pâle → cyan → nuit avec des éclats cyan ; à la fin, la tête explose en cyan (variante « joueuse » de `N.fx.boom`) | — |
| 0,9 → 1,3 s, s'il reste une vie | « −1 VIE · 1 RESTANTE », « CANON III → II », puis le serpent réapparaît, READY! pendant 0,6 s | voix READY (P3) ; la musique reprend sur la mesure suivante, sur un bloc différent |
| 0,9 → 1,3 s, game over | glitch de 0,3 s, puis **extinction du tube** : l'image s'écrase en une ligne, puis en un point (`N.crt.extinction(0,4)`) ; SIGNAL PERDU en magenta | voix GAME OVER (P3) ; jingle `gameover` sur le temps ; la piste passe à l'OUTRO sous passe-bas |

- **L'ordre de dessin** suit le crochet du § 7.7 : le monde entier, puis le remappage, puis la joueuse et la
  cause redessinées par-dessus.
- La séquence se saute d'un toucher **dès 0,5 s**.
- Le doigt posé au moment de la mort ne compte pas : seul un toucher qui commence après la mort est pris en
  compte.
- On peut avoir de nouveau le serpent en main moins de 2,0 s après l'impact (G-02). L'écran de fin arrive
  au plus 1,5 s après l'impact.

### 5.5 L'interface en jeu (`78-hud.js`)

Tout est écrit en police 5 × 7, à px ≥ 2 (14 pt au moins), et rangé dans `S.view.safe`. Le HUD couvre
au plus 10 % de l'écran (V-15), sur des plaques de nuit profonde.

| Élément | Paysage (422 × 195) | Portrait (195 × 422) |
|---|---|---|
| Score, 7 chiffres jaunes | haut à gauche | haut à gauche |
| Multiplicateur « ×4 » en ambre, avec sa barre de chaîne d'1 px et l'objectif « ×5 DANS 3 » en acier | à droite du score | sous le score |
| Vies (têtes cyan pâle de 5 × 5) et « VIE À 80 000 » | sous le score | sous le multiplicateur |
| Radar 48 × 24 | en haut au centre | en haut au centre |
| Étiquette de vague et de quartier (« V3 · BATTERIE · LA CENTRALE »), barre de secteur segmentée par vague | sous le radar, en acier | sous le radar |
| Compteur du DÉFILÉ (« 31 / 40 ») | à la place de l'étiquette | idem |
| Jauge du CYCLOPE (120 × 3, rose pâle et sang, encoches de phase) et son nom en magenta | à la place de l'étiquette de vague | idem |
| Boutons PAUSE et SON, 22 × 22 px (44 pt) chacun | en haut à droite | en haut à droite |
| Arcs autour de la tête : accélération, pouvoir prêt, APOGÉE pleine | dessinés par `N.joueuse`, dans le monde | idem |
| Bannières | 5 × 7 à l'échelle 4 en paysage, 3 en portrait ; entrée en deux images à l'échelle supérieure ; deux fantômes magenta et violet décalés de 2 px ; balayage d'une ligne d'os ; sortie par dissolution de Bayer en 0,25 s ; dans le tiers opposé à la tête, jamais sur un télégraphe ; file d'attente, une seule à la fois | idem |
| Toasts (règle d'une ligne, défi de vague, codex) | plaque à l'échelle 1 sous le HUD | idem |
| Pouce fantôme (première partie) | animé ; s'efface au premier virage de plus de 45° | idem |
| Gestes du second doigt (une fois par profil) | « 2ᵉ DOIGT : TOUCHE = POUVOIR » à la première recharge ; « GLISSE = APOGÉE » à la première APOGÉE pleine | idem |
| Capuchons de touches (bureau, trois premières parties, P3) | à côté des arcs, 6 s | — |

### 5.6 Les écrans (`80-ecrans.js`, `60-intro.js`)

**Au chargement.** Sur un fond vide, le logo statique et « TOUCHE POUR COMMENCER » clignotent à 1 Hz. Ce
premier toucher déverrouille le son (sur `touchend`, `pointerup`, `click` ou `keydown`, V-33) et lance le
chargement de la piste.

**À la première visite**, viennent ensuite l'ouverture (`60-intro.js`, gardée telle quelle : 12 s,
sautable, garde de 300 ms), puis la plongée et le jeu. **Deux touchers au plus** mènent au serpent (J-13).

**Le titre** (visites suivantes) :

- **Le décor** : `affiche` en fond, recadrée au centre, avec le logo qui se construit. Le ciel et le sol de
  `horizon` prolongent l'image, fondus par un tramage sur 12 à 16 rangées, sans limite franche (défaut V10,
  critère mesuré au § 8.5).
- **Les actions** : « TOUCHE POUR JOUER » en jaune ; un toucher n'importe où lance le jeu. Deux petits
  boutons en haut : RÉGLAGES et RECORDS ; GALERIE quand elle est débloquée ; DÉPART : V1 / V3 quand il l'est.
- **Les chiffres** : le record, l'énergie totale et les deux défis du jour, seulement après la première
  partie (G-05).
- **La musique** : l'INTRO du morceau, en boucle sur ses dernières mesures.

**Le mode attraction (P3).** Après **15 s sans toucher** sur le titre, une boucle de 35 s se lance :

| Étape | Durée | Contenu |
|---|---|---|
| Démo jouée | 20 s | le pilote expert sur la graine 2975, parallaxe complète, bandeau « DÉMO » en acier ; on y voit une chaîne, un LASSO, une INVERSION, une explosion d'élite et **une mort** |
| Galerie des ennemis | 6 s | à la façon de Pac-Man : chaque ennemi, son nom en magenta et sa ligne de caractère |
| Tableau des records | 5 s | les dix meilleurs |
| Invitation | 4 s | « TOUCHE L'ÉCRAN » en jaune, qui clignote à 1 Hz |

La musique y est réduite à deux couches, à −6 dB. Tout toucher ramène au titre. La démo joue une vraie
partie, sur ses propres flux de hasard (§ 7.3).

**Le briefing** dure 2 s et se saute d'un toucher ; il n'est montré qu'à la première partie de la session.
Sur le panneau `briefing`, il affiche « SECTEUR 1 · LA GRILLE », une consigne de 3 lignes au plus
(« ENCERCLE-LES. ÉVITE LE MUR. ÉVITE TA QUEUE. ») et les 3 défis. Il est suivi de la **plongée** (0,8 s,
sautable), qui fait passer d'un monde à l'autre comme dans Tempest :

- la caméra part de l'image `horizon` du titre et descend dans la grille, dont les lignes accélèrent ;
- l'horizon reste en place : il devient le ciel du jeu ;
- le serpent jaillit d'une étincelle cyan, puis READY! et GO! s'affichent.

**Les cartes** : 3 à 5 plaques de nuit gainées de nuit profonde.

- **Taille et place** : 120 × 80 px côte à côte en paysage (96 × 80 au-delà de trois) ; 180 × 48 px empilées
  dans la moitié centrale en portrait.
- **Contenu** : une icône de 16 × 16, le nom en os (14 caractères au plus), deux lignes de description en
  acier (19 caractères au plus) qui donnent les chiffres, et l'étiquette « NIV n », « NOUVEAU » ou
  « CARTE DE VAGUE ».
- **Entrée** : les cartes tombent du haut en pas entiers, à 55 ms d'écart, et rebondissent d'un pixel.
- **Pendant le choix**, la musique passe sous l'étouffoir à 900 Hz.

**La pause** se déclenche en arrière-plan, sur perte de focus, avec le bouton, P ou Échap. Elle affiche
REPRENDRE (gros), RÉGLAGES et QUITTER, les icônes de 8 × 8 des cartes prises, les 3 défis, le défi de vague
et leur état. La musique passe à 420 Hz. Au retour d'arrière-plan, « EN PAUSE » attend un toucher (J-18,
V-26).

**Les réglages** tiennent sur un seul écran de huit lignes, chacune avec sa description. Le schéma, le
module qui applique chaque ligne et la persistance sont au § 7.10.

| Ligne | Valeurs |
|---|---|
| MUSIQUE | oui / non |
| EFFETS | oui / non |
| SECOUSSE | 100 / 50 / 0 % |
| FLASHS | oui / non |
| ÉCRAN | RICHE / SOBRE / PUR |
| TEXTE | × 1 / × 2 |
| MANCHE | PETIT / MOYEN / GRAND |
| ACTIONS | 2 DOIGTS / AUTO |

Les valeurs par défaut viennent de `prefers-reduced-motion` et de `prefers-contrast` (V-22, V-23).

**L'écran de fin**, en défaite comme en victoire, est posé sur le panneau `defaite` ou `victoire`, assombri
d'un cran. L'encart occupe le tiers bas en paysage et la zone sous le bandeau en portrait, hors du point
focal. Les lignes se dévoilent dans cet ordre :

1. **Le titre** : SIGNAL PERDU ou SECTEUR NETTOYÉ, à l'échelle 3.
2. **La cause** : « DÉTRUITE PAR : TIR DE TOURELLE — VAGUE 3 · LA CENTRALE · 2:07 », avec la silhouette du
   coupable.
3. **La progression** : une barre « SECTEUR 62 % », ou « CYCLOPE À 40 % ».
4. **Le score** compté jusqu'à sa valeur, avec l'écart à la partie précédente (« +12 400 ») et le record.
5. **Le build** : son nom et ses icônes (« ARTILLEUSE — TOURELLES III, MISSILES II »). Le nom vient de la
   famille dominante : TIREUSE (canon), ARTILLEUSE (tourelles, missiles), ORAGE (arc), ESSAIM (drones),
   POSEUSE (mines de queue), LASSO (plus de 30 % des destructions au lasso).
6. **Le bilan**, compté ligne par ligne avec un bip : DÉTRUITS, CHAÎNE MAX, LASSO MAX, LONGUEUR MAX,
   DÉVORÉS, APOGÉES, et le meilleur moment (« CHAÎNE ×8 · V4 »).
7. **La note** en lettre, qui tombe avec une secousse :

   | Note | Condition |
   |---|---|
   | S | FINIR, les 2 autres défis et aucune vie perdue |
   | A | FINIR et au moins un autre défi |
   | B | FINIR |
   | C | CYCLOPE atteint |
   | D | sinon |

8. **Les trois défis**, en étoiles ambre, et les défis de vague réussis.
9. **UN conseil** (§ 5.6.1).
10. **L'énergie gagnée**, ajoutée au total (G-04), puis **« PROCHAIN DÉBLOCAGE : REPLI DANS 412 ◆ »** avec
    sa barre, qui se remplit sous les yeux de la joueuse. Si un seuil est franchi : « DÉBLOQUÉ : RALENTI »
    en jaune, avec le son `record`.
11. **Les boutons** : CONTINUER ? avec un compte à rebours de 9 à 0 (une seule fois par partie), REJOUER et
    TITRE, chacun de 44 pt au moins.

En victoire, un feu d'artifice d'explosions dorées passe par `N.fx.flashGate` et se dessine en espace écran
(`N.fx.drawEcran`), et l'écran affiche « SURCHARGE DÉBLOQUÉE » (§ 9). Un toucher accélère les comptes. La
garde est de 0,45 s : un toucher n'est accepté que s'il commence après l'ouverture de l'écran.

**Les déblocages par l'énergie** (G-04, G-05). L'énergie totale ouvre des options, jamais de la puissance
brute :

| Seuil d'énergie totale | Déblocage |
|---|---|
| 300 | le pouvoir RALENTI entre dans le vivier |
| 800 | le pouvoir REPLI entre dans le vivier |
| 1 500 | les STYLES DE TRAÎNÉE (pleine, pointillée, double ; toujours cyan pâle) |
| 2 500 | la GALERIE du codex, au titre |
| 4 000 | le DÉPART EN VAGUE 3 (le Skill-Step de Tempest) : la partie commence en V3 avec deux cartes tirées ; elle est marquée « 3 » au tableau |

La cible : le pilote bon ouvre le premier déblocage à la fin de sa première ou deuxième partie, et le
dernier entre sa 12ᵉ et sa 25ᵉ partie [I].

#### 5.6.1 Le conseil : la première règle qui s'applique

| Situation | Conseil affiché |
|---|---|
| mort au mur arrière du TRAVELLING | LE MUR ARRIÈRE AVANCE : RESTE DEVANT |
| mort au mur | LE MUR TUE. IL S'ALLUME QUAND TU APPROCHES |
| morsure | TOURNE PLUS LARGE QUE TON CORPS |
| tuée par un convoi | LA VOIE CLIGNOTE AVANT LE CONVOI |
| tuée par la traînée du RIVAL | FAIS-LE S'ÉCRASER SUR TON CORPS |
| tuée par une flèche | LA FLÈCHE SE FIGE AVANT DE FONCER |
| tuée par un dard | LE DARD VISE OÙ TU VAS : CHANGE DE CAP |
| tuée par une tourelle | PRENDS LA TOURELLE DE CÔTÉ |
| tuée par une lame | LA LAME RECULE PUIS TRAVERSE TOUT |
| tuée par une mine | LA MINE S'ARME DANS SON CERCLE |
| tuée par une sentinelle | QUITTE LA LIGNE PÂLE DU LASER |
| tuée par le TRAQUEUR | SEUL UN LASSO TUE LE TRAQUEUR |
| APOGÉE pleine et jamais employée | TON APOGÉE ÉTAIT PRÊTE À m:ss : GLISSE UN 2ᵉ DOIGT |
| PASTILLE jamais avalée | L'ÉTOILE JAUNE DU RADAR RETOURNE LA CHASSE |
| aucun LASSO | BOUCLE AUTOUR D'EUX : TOUT ÉCLATE |

**Les records et les initiales.** Le tableau garde les dix meilleurs scores, avec trois lettres, la note,
une étoile par défi réussi, et les marques « C » (continuée) et « 3 » (départ en V3).

- **La saisie** est une cérémonie. Trois colonnes de lettres : on fait défiler A-Z, 0-9 et l'espace en
  glissant vers le haut ou le bas, ou en poussant le manche ; on passe à la colonne suivante en touchant à
  droite ; puis OK. Au clavier, on tape les lettres (`S.input.car`) ; à la manette, P3.
- **Le tableau** : le rang 1 est en jaune, les autres en os. Le score qui vient d'entrer **clignote en
  cyan** : c'est la joueuse, la règle du cyan tient.
- **La musique** joue un thème propre, l'OUTRO en boucle.
- **La sauvegarde** passe par `77-score.js` (§ 7.10). Sans stockage, le tableau vit le temps de la session.

### 5.7 La musique : le morceau de la propriétaire, plus le moteur génératif

#### La piste

- **Le fichier** : `snake2030/neonvelocity-2.mp3`, « Neon Velocity » par manonwwk (Suno). On ne la lit
  qu'en lecture seule.
  - **Format mesuré** : 4 min 35 s, 48 kHz, stéréo, 196 kb/s, avec une pochette.
  - **Mesure** : 144,6 BPM, soit 1,6598 s par mesure.
  - **Tonalité estimée** par un chromagramme : centre tonal **ré**, mineur ou dorien. Le lot 7a la confirme.
- **La structure**, mesurée par le niveau RMS par mesure (calée sur t = 0, à affiner par une détection des
  attaques) :

| Section | Mesures | Temps | Niveau | Usage |
|---|---|---|---|---|
| INTRO | 1 à 10 | 0 à 16,6 s | −24 dB | titre, briefing, attraction (boucle sur les mesures 3 à 10) |
| PLATEAU | 11 à 70 | 16,6 à 116 s | −11 à −13 dB | les vagues et LE VOL ; décollage à la mesure 11 |
| PONT | 71 | — | −15 dB | transition vers le DÉFILÉ |
| RESPIRATION | 72 à 103 | 119 à 171 s | −28 puis −18 à −21 dB | LE DÉFILÉ, répits du CYCLOPE |
| RETOUR | 104 à 153 | 171 à 254 s | −11 à −13 dB | LE CYCLOPE |
| OUTRO | 154 à 165 | 254 à 274 s | −19 à −23 dB | victoire, game over, records |

#### Le découpage et la lecture

- **L'outil** : `tools/musique/decoupe.mjs` (ffmpeg) produit `proto-neon/musique/nv-NN.mp3`, des **blocs de 8
  mesures** (environ 13,3 s) alignés sur les phrases.
  - **Alignement** : PLATEAU sur 11 + 8k, RESPIRATION sur 72 + 8k, RETOUR sur 104 + 8k, INTRO et OUTRO
    entiers.
  - **Recouvrement** : chaque bloc garde **une mesure de plus** de chaque côté.
  - **Format** : MP3 à 112 kb/s, stéréo, 44,1 kHz, sans pochette. MP3 plutôt qu'AAC, parce que Chromium et
    Safari le décodent tous deux.
  - **Description** : `musique/piste.json` donne les BPM, l'instant de la première mesure, la tonalité et la
    liste des blocs (mesures, section, fichier, niveau, **durée de mesure mesurée**).
  - **Si le tempo n'est pas constant** (dérive de plus de 0,5 % le long du morceau, mesurée par la détection
    des attaques) : les blocs sont coupés sur les barres détectées, pas calculées, et chaque bloc porte sa
    propre durée de mesure. Le moteur génératif suit alors la mesure du bloc en cours.
- **Le chemin des fichiers.** `build.mjs` écrit dans le bundle `var MUSIQUE_BASE`, le chemin relatif du
  fichier produit jusqu'à `proto-neon/musique/` (`musique/` pour `index.html`, `../../musique/` pour une page
  d'essai `tools/<lot>/index.html`). `N.music.load()` le lit ; avec `--embed`, les blocs sont inline.
- **La lecture** : chaque bloc est décodé par `decodeAudioData` et joué par un `AudioBufferSourceNode`, à
  l'échantillon près.
  - **Mémoire** : au plus 4 blocs décodés à la fois, soit environ 20 Mo.
  - **Jointures** : le décalage de l'encodeur est mesuré au chargement, par corrélation sur la mesure
    partagée entre deux blocs voisins. Les jointures se font par un fondu de 10 ms posé sur la barre de
    mesure.
  - **Chargement** : à la demande. Le bloc d'INTRO vient au premier toucher, puis les deux blocs suivants
    sont toujours préchargés.
- **L'enchaînement horizontal** se fait sur la mesure. Chaque état du jeu demande une **section** (le
  tableau du § 7.6 dit laquelle), et le séquenceur choisit le bloc suivant à la fin du bloc en cours, ou à la
  mesure suivante pour une demande urgente :

| Section (`N.music.section`) | Bloc joué |
|---|---|
| `titre`, `attraction`, `briefing` | INTRO |
| `jeu` | PLATEAU, de bloc en bloc ; à la fin de la section, un bloc tiré parmi ceux qui n'ont pas joué depuis trois blocs |
| `repit` | RESPIRATION ; le PONT sert de levée |
| `alerte` | coupure de 250 ms sur la barre, puis la mesure 70 sous passe-bas à 300 Hz avec la sirène générative |
| `boss` | RETOUR ; en boucle sur les mesures 136 à 151 si le combat dure |
| `victoire` | OUTRO |
| `defaite` | OUTRO sous passe-bas à 1,2 kHz |
| `initiales` | OUTRO |

- **Après une mort**, la musique reprend sur un bloc différent, au début d'une mesure, jamais au début du
  morceau (G-34).
- **La tension pilote un filtre et un gain, pas la vitesse.** Le passe-bas de la piste va de 2,5 kHz à la
  tension 0,15 (VAGUE 1) à 18 kHz à partir de 0,6, et le gain de −3 dB à 0 dB. **La piste n'est jamais
  accélérée.**
- **Les états particuliers** :
  - pause : étouffoir à 420 Hz ;
  - cartes : 900 Hz ;
  - RALENTI : 1,2 kHz ;
  - INVERSION : filtre grand ouvert, couche INVERSION ;
  - danger proche : passe-bas à 2 kHz et percussion réduite au coup de grosse caisse.
- **L'horloge.** La musique vit sur l'horloge audio ; le jeu, sur son horloge de jeu (§ 7.2). Les
  apparitions et l'avance du sol suivent la grille de jeu à 144,6 BPM, jamais `AudioContext.currentTime`.
  Seuls les effets purement visuels (néons sur la grosse caisse) lisent la phase audio réelle. Après un gel,
  une pause ou les cartes, l'écart entre les deux grilles est sans conséquence de jeu.

#### Le moteur génératif (`30-music.js` existant, réaccordé)

- **Le calage.** Il est accordé à la tonalité de la piste et **recalé au début de chaque bloc**, sur le
  décalage mesuré de ce bloc : sa grille est relative au bloc en cours, pas une horloge libre à 144,6 BPM
  qui dériverait.
- **Les couches au-dessus de la piste**, qui entrent et sortent **à la mesure** (G-31) :
  - PERCU (charleston en doubles croches, clap en réverbération coupée), à partir de la tension 0,6 ;
  - ÉTINCELLES (arpège carré à 25 %, ré dorien, entre ré 5 et ré 6), à partir de 0,8 ;
  - INVERSION (arpège rapide en doubles croches, filtre ouvert), pendant l'INVERSION ;
  - BATTEMENT, piloté par `N.music.danger(v)`.
- **Les accents** :
  - **stinger** d'une mesure à chaque changement de phase ou de vague ;
  - **drop** de 250 ms au WARNING ;
  - **plongée** à l'APOGÉE (10 % en 90 ms, puis 128 % au temps suivant) ;
  - **coupure** à la mort.
- **Le repli.** Sans piste (chargement en cours, échec, fichier absent), le moteur joue **seul** un
  arrangement complet à quatre couches, au même tempo et dans la même tonalité.
  - Il a un **refrain** composé à la main : 8 notes sur deux mesures, joué tel quel, avec un arrangement qui
    varie autour.
  - Il suit les mêmes sections, et il est **éclairci** : centroïde de 900 Hz à 1,5 kHz au calme, lead entre
    la 4 et la 5, grosse caisse avec un punch et un clic.
  - On ne coupe le repli **qu'à la preuve que la piste sonne** (lecture effective), par un fondu sur la
    barre.
- **Le hasard** de la musique vient de son flux propre, `N.rng('music')` (§ 7.3).

#### Le mixage, visé pour un haut-parleur de téléphone

| Mesure | Cible |
|---|---|
| Musique au calme, en simulation de téléphone (passe-haut à 350 Hz) | −20 dBFS RMS au moins |
| Musique au chaos | −14 dBFS RMS |
| Écart calme → chaos | +6 dB au moins |
| Sons `kill`, `coupe` et `mort` | 3 à 6 dB au-dessus de la musique |
| Tir de la joueuse | au moins 6 dB sous le kill |
| Esquive de la musique sous un kill | 0,30, relâchée en 120 ms |
| Crête | −1 dBFS au plus, sans écrêtage (genou doux gardé) |

### 5.8 La banque de sons (`N.music.sfx(nom, {pan, pitch, type})`)

**Les règles** :

- un son par événement, distinct par classe de timbre ;
- au moins 25 % de l'énergie au-dessus de 400 Hz pour chacun ;
- tous dans la tonalité courante ;
- **sept positions de panoramique** calculées depuis la position à l'écran (réduites en portrait) ;
- aucun kill muet : les kills rapprochés s'empilent en notes qui montent d'un demi-ton ;
- trois sites d'appel au plus par nom ; les sons d'événement sont appelés par `79-scene.js` seulement ; les
  sons continus ou propres à un module (`tir`, `salve`, `boost*`, `fermable`, `porte`) par leur module ;
- les gardes FUSION, PLAFOND et USURE sont gardées, sauf pour `kill` ;
- **les tourelles et les drones** ne demandent pas un son par tir : leurs tirs d'une même image fusionnent en
  une seule demande `salve`, et `salve` joue au plus 8 fois par seconde. Seize tourelles à 3 tirs par
  seconde ne créent donc pas 48 sons par seconde, et le plafond de 60 nœuds créés par seconde tient.

| Classe | Noms et événements |
|---|---|
| Joueuse : timbres clairs | `tir` (discret, pentatonique), `salve` (tourelles et drones fusionnés), `boostOn`, `boostOff`, `boostPanne` (un seul clic grave), `traversee`, `ralenti`, `repli`, `pouvoirPret` (bip), `ultimePret`, `ultime`, `lasso` (accord de n notes), `fermable` (petit tic au point refermable), `vie`, `porte` (VOL), `devore` (escalier montant) |
| Impacts | `impact` (sur un ennemi), `impactBoss` (métallique), `ricochet` (blindage), `kill` (hauteur selon la chaîne), `bigkill`, `crash`, `explosion` (mines, chaînes), `colosseMort` |
| Ennemis et arène : médiums rêches | `tirEnnemi`, `arme` avec `opts.type` (une signature d'armement par type : bond, verrouillage, visée, recul, mèche qui accélère, laser qui charge, coupe-route), `portail` (tic panoramisé du côté de l'arrivée), `traqueur` (sirène sur deux notes), `convoi` (klaxon), `travelling` (grondement), `warning` (corne entre 1,3 et 1,8 kHz) |
| Ressources : cloches | `butin` (escalier : +1 demi-ton par ramassage dans les 1,2 s, jusqu'à +12), `noyau` (arpège), `pastille` (accord ouvert) |
| Danger : graves saturés avec composante médium | `coupe`, `mort`, `gameover` (jingle de 4 notes sur le temps), `battement` (lub-dub à 1 Hz, dont le tempo double au plus près) |
| Récompenses | `palier`, `levelup`, `carte` (ouverture), `choix`, `vague` (fin de vague), `defi`, `defiRate`, `record` |
| Interface | `bip` (texte, carré à 12,5 %, 30 ms), `clic` |

**La voix de la machine (P3)** (`N.music.voix(mot)`) est synthétisée par formants, à la manière de
Berzerk : source en dent de scie à 90-110 Hz, trois filtres passe-bande par voyelle, bruit filtré pour les
consonnes.

- **Le vocabulaire** est fermé, dans le jargon de borne : READY, GO, WARNING, DANGER, EXCELLENT, GAME OVER.
- **Les règles** : un mot toutes les 4 s au plus, posé sur un temps fort, avec son propre volume. Le texte à
  l'écran reste en français.
- Sans voix, les mots s'écrivent seulement : rien n'en dépend.

**Le jeu se joue sans le son** (G-35) : tout signal sonore utile a son équivalent visuel.

| Son | Équivalent visuel |
|---|---|
| armements | télégraphes |
| portail | chevron |
| battement | bords qui battent |
| sirène | bannière |
| klaxon de convoi | voie hachurée et phares |
| grondement du TRAVELLING | chevrons sur le mur arrière |

---

## 6. SNAKE 2030 : ce qu'on reprend, ce qu'on en fait de mieux, ce qu'on écarte

La propriétaire demande de reprendre **la majeure partie** des idées de SNAKE 2030, en mieux. Sur les 26
idées vues en jeu dans la comparaison jouée, 22 sont reprises dans le prototype, 2 sous une forme
transformée (la bascule en perspective devient LE VOL ; « la longueur est la vie » devient la coupe), et 2
seulement sont écartées : le zoom qui respire, qui casse les pixels carrés, et les crans de difficulté,
remplacés par la SURCHARGE et le départ en V3.

| Idée de SNAKE 2030 | Décision | Ce qu'on en fait de mieux dans 2975 | Pourquoi |
|---|---|---|---|
| Monde plus grand que l'écran, caméra qui suit et anticipe | **reprise** | caméra au pixel entier, avance vers le cap visé, tête bornée à 15-85 %, trajet visible devant garanti, radar façon Defender | retour n° 3 ; leçons A3 et A4 |
| Bascule 3D en perspective façon Tron (« on vole ») | **reprise, transformée** | LE VOL : 4 s de vue de poursuite à la Space Harrier entre deux vagues, en primitives à rayon entier, avec portes, énergie et mines | ce qui surprenait le plus dans 2030 ; sans rotation ni zoom non entier |
| Zoom qui respire, roulis | **écartés** | la parallaxe à 6 plans, le sol ligne par ligne, LE VOL et les cadrages pilotés par le jeu donnent le « waouh » | une rotation ou un zoom non entier casse les pixels carrés ; la bascule a coûté +21 % de coups et 21 % d'images sans la tête |
| Secteurs à palette et mécanique propres | **repris en quartiers** | six quartiers par partie, chacun avec sa cité, ses structures, sa lumière et sa table de couleurs ; mécaniques propres par vague (TRAVELLING, CONVOIS, DÉFILÉ) | le changement complet d'ambiance, sans attendre la campagne |
| Convois qui balaient les voies | **repris (V4, V5)** | annoncés 1,5 s, broient les ennemis au profit de la joueuse, SILLAGE qui accélère gratuitement | 2030 ne faisait que punir (16 % des coups, sans annonce) |
| Champ magnétique, surcharge à cycles | **campagne** et **mode SURCHARGE** | le champ magnétique au secteur 3 ; la SURCHARGE après la victoire (§ 9) | un système nouveau à la fois (G-05) |
| Treillis et rails à nœuds | **écartés** du prototype | campagne : une phase GRILLE où les virages sont mis en file, sans attente (§ 9) | 700 ms de latence médiane, bloquant (J-06) |
| La longueur EST la vie | **transformée** | la longueur est la puissance et le risque : la tête meurt, le corps se coupe, et mourir coûte la moitié de la longueur | retour n° 4 : il faut pouvoir mourir |
| Le corps profond absorbe les tirs | **écartée** | le tir coupe le corps ; seul le REPLI rend le corps épais, et pour 7 s | retour n° 4 |
| Bords qui font rebondir | **remplacés** | mur mortel avec grâce de 60 ms, alerte de proximité visuelle et sonore | retour n° 4 ; mort juste parce qu'annoncée |
| Coup encaissé lisible (source, vignette orientée, gel, ralenti) | **reprise** | appliquée à la coupe du corps ; la source sert à la mort | leçon D2 |
| Butin qui vient à la tête, expire, fusionne | **reprise** | cellule ambre, noyau jaune, fusion et expiration dès la première version, escalier sonore | leçon E5 |
| XP, montée de niveau mise en scène, 3 cartes | **reprise et améliorée** | une carte garantie par vague, montées regroupées sur le même écran (« CHOISIS 2 »), texte calculé depuis les chiffres | leçons C4 et C8 ; jamais un choix en plein danger, jamais trois écrans de suite |
| 53 cartes, 7 axes, 4 raretés, 6 paliers | **réduites** | 19 cartes, chacune visible et mesurée ; armes à 4 paliers ; pitié de rareté ; poids qui favorisent l'école | 40 cartes sur 53 étaient sans effet mesurable, 13 textes mentaient |
| Huit armes automatiques à rôles spatiaux, montées sur le corps | **reprise (6 sur 8)** | CANON, TOURELLES, ARC, MISSILES, DRONES, MINES DE QUEUE, en gros pixels et en cyan ; ONDE et SILLAGE reportées (le LASSO couvre leur rôle) | un serpent dont le corps s'arme |
| ENCERCLÉ (boucle de la queue, palier 3 du sillage) | **promue** | le LASSO devient le verbe de base dès la première seconde, fermé par la tête, annoncé, ses dégâts et sa traînée croissent avec la longueur | l'idée-mère du genre (Blockade, Tron) |
| Morts en chaîne (GRAPPE, DÉTONATION, RÉACTION…) | **reprise en une carte** | GRAPPE, écrite honnêtement : « toute mort explose » ; chaînes de mines ennemies | le meilleur rapport spectacle / décision |
| Build nommé en fin de partie | **repris** | « ARTILLEUSE — TOURELLES III, MISSILES II » sur l'écran de fin | on se souvient de sa partie |
| Boost à réserve et panne franche | **reprise** | sans bouton : pousser le manche droit devant soi, ou un second doigt tenu ; jamais en virage serré | leçon A2 ; J-08 |
| Trois pouvoirs, un bouton, débloqués aux kills | **reprise** | un pouvoir équipé choisi par carte ; toucher bref d'un second doigt ; RALENTI et REPLI ouverts par l'énergie | débloqués trop tard en 2030 ; bouton à aller chercher |
| APOGÉE, la vague qui vide l'écran | **reprise** | 6 anneaux tramés, glissé d'un second doigt, une par minute environ, plongée musicale | l'« explosion énorme » au moment choisi |
| Combo et multiplicateur visibles, objectif écrit (« 2 kills → ×1,5 »), divisé au coup | **repris** | × 8 au plus, objectif « ×3 DANS 4 » sous le score, paliers sonores et visuels | leçon C4 |
| Secteurs nommés à 5 phases, barre de progression | **repris en vagues à objectif** | 5 vagues nommées et un DÉFILÉ, barre de secteur, vague finie au nettoyage, entrée calme de 6 s, pics connus | leçons C1, C3, G-17 |
| Directeur de difficulté géométrique (PV × 2,6 par secteur) | **écarté** | la pression vient de la densité, des formations, des rôles, de la vitesse par paliers, du plateau qui avance et du TRAQUEUR | difficulté illisible par inflation des PV |
| Onze ennemis aux rôles distincts | **9 repris, plus le RIVAL** | FLÈCHE, DARD, LARVE, MINE, TOURELLE, LAME, RUCHE, SENTINELLE, TRAQUEUR ; le RIVAL, serpent de Tron ; miroir, voleur, tique et brouilleur en campagne | un secteur, une famille ; leçon C7 |
| Élites et 6 modificateurs | **3 repris** | BLINDÉ, RAPIDE, INSTABLE ; trois pics nommés et annoncés ; RAPIDE ne raccourcit jamais l'annonce | leçon B2 |
| Portails de 600 ms, armement dans la vue, marqueurs | **repris tels quels** | chevrons à mini-silhouette, peigne, marqueurs permanents, vue anticipée | leçon B1 : 0 % de mort de l'invisible |
| Crochet d'impact de l'artilleur | **repris et généralisé** | losange rose pâle (tête) ou magenta (corps) sur toute trajectoire de tir | lisibilité fine |
| Boss = élite renommée | **remplacé** | un CYCLOPE chorégraphié en 3 phases à attaques propres, qui inflige au moins 35 % des coups | leçon C5 |
| Entrée du boss mise en scène, jauge qui se remplit | **reprise** | en plus : silhouette qui traverse les plans de parallaxe, murs qui se resserrent, éclipse | le moment fort |
| Main trophée, purge de fin de secteur | **reprises** | purge en chaîne de la démo et main trophée sans commune | récompense qui se voit |
| Mort mise en scène (AV-9, jamais faite) | **faite** | gel, cause entourée, désintégration, coupure, extinction du tube | retour n° 4 |
| Écran de fin qui explique, « prochain déblocage dans 114 ◆ » | **repris, resserré** | cause, quartier, progression, écart, build, record, défis, conseil, note ; prochain déblocage et sa barre ; initiales ; CONTINUER ? | leçon C9 ; « une raison de rejouer » |
| Crédits et boutique de puissance plate | **remplacés** | l'énergie ouvre des options : pouvoirs, styles, galerie, départ en V3, puis les modes (SURCHARGE, campagne) | « trop facile » ; économie dégénérée |
| Crans de difficulté FACILE → SUICIDE | **écartés** | un seul jeu dur ; SURCHARGE après la victoire ; départ en V3 | crans indiscernables (leçon C2) |
| Réglages en 3 onglets, 18 lignes | **réduits** | 8 lignes, un écran | J-32 |
| Menu et interface en DOM, polices système, glyphes Unicode | **écartés** | tout en gros pixels, police 5 × 7, icônes dessinées | identité ; leçon E8 |
| Trois boutons tactiles fixes | **écartés** | gestes : poussée droit devant, toucher et glissé d'un second doigt | 62 % des images avaient un ennemi sous un contrôle |
| Musique MP3 lue en flux, couches décalées, vitesse × 1,06 | **reprise et corrigée** | blocs décodés calés sur la mesure, enchaînement horizontal par sections, couches recalées sur chaque bloc, jamais d'accélération de la piste | leçon S5 ; défaut J-06 de l'inventaire |
| Banque de 32 sons par classes, panoramiques, gains calibrés | **reprise** | dans la tonalité, avec escaliers de hauteur et empilement des kills | leçons S1 à S4 |
| Stinger, drop, esquive, plongée | **repris** | sur la mesure | G-31 et G-32 |
| Bannières, toasts, tags, une voix à la fois | **repris** | en 5 × 7, fantômes magenta et violet, dissolution de Bayer, budget d'une bannière toutes les 10 s | leçon E6 |
| Horloge à pas fixe, quarantaine des erreurs, qualité adaptative | **repris** | pas de 1/120 s ; repli du tube cathodique (halo, puis balayage) au profil lent seulement, jamais de la lisibilité | leçons P2, P3, P4 |
| Sauvegarde versionnée | **reprise** | une clé `snake2975.v1` | leçon M1 |
| Plein écran honnête (écran d'accueil sur iPhone) | **repris** | manifeste `standalone` et icône en gros pixels | J-26, V-37 |
| Vibrations | **gardées seulement si `navigator.vibrate` existe** | jamais nécessaires | J-25 |
| Codex de première rencontre (jamais fait) | **fait, sans geler** | carte de 2 s dans un coin, galerie au titre (débloquée) et dans le mode attraction | apprendre sans tutoriel |

---

## 7. L'architecture et le contrat d'intégration

Huit agents vont écrire en parallèle des modules qui se parlent. Ce chapitre fige **tout ce qu'ils
partagent** : qui possède quel fichier, le temps, le hasard, les événements et leur ordre, les schémas des
objets et les identifiants, les états du jeu, l'ordre de dessin, le journal de mesure, les réglages et le
budget de performance. Le lot 0a l'écrit dans `CONTRAT.md` et dans `03-socle.js`, avec des tests de contrat
qui vérifient des comportements, pas seulement des noms (§ 8.3).

### 7.1 Les modules de `src/` et leurs propriétaires

Chaque fichier a un seul propriétaire à chaque phase du travail et publie une seule interface. Les fichiers
sont concaténés par ordre de nom (`build.mjs`) ; aucun module n'appelle un autre au chargement, seulement
dans ses fonctions : l'ordre n'a donc pas d'importance pour l'exécution. Tout module survit à l'absence des
autres grâce à des replis procéduraux.

| Fichier | Publie | Responsable de | Lot | État |
|---|---|---|---|---|
| `00-pal.js` | `N.pal` | palette, Bayer, conversions, **table des luminances** | — | gardé (ajout de la table) |
| `02-regles.js` | `N.R` | **tous les chiffres** de ce plan, en lecture seule | gardien, puis 9 | nouveau |
| `03-socle.js` | `N.ev`, `N.rng`, `N.horloge`, `N.journal`, `N.ids` | bus d'événements, flux de hasard nommés, horloge de jeu, journal de mesure, identifiants figés | gardien | nouveau |
| `05-art.js` | `N.art` | illustrations, clips | — | gardé tel quel |
| `10-gfx.js` | `N.gfx` | tampon, primitives, **origine de dessin**, **plans**, **remappage**, **masque de propriété** | 1 | évolue |
| `12-cam.js` | `N.world`, `N.cam` | monde, murs et arènes mobiles, TRAVELLING, caméra | 1 | nouveau |
| `15-decor.js` | `N.decor` | plans de parallaxe, sol ligne par ligne, plateau, murs, quartiers, états, cyclage, ondulation, silhouettes lointaines | 2 | nouveau |
| `17-vol.js` | `N.vol` | LE VOL : vue de poursuite, portes, cellules et mines en vol | 2 | nouveau |
| `20-crt.js` | `N.crt` | tube cathodique, préréglage adaptatif, **extinction** | 1 | évolue |
| `30-music.js` | `N.music` | piste en blocs, séquenceur, génératif, sons, voix | 7a, 7b | évolue fortement |
| `40-sprites.js` | `N.spr` | tous les sprites et la police | 6a, 6b | évolue |
| `50-fx.js` | `N.fx` | explosions, gel, **ralentis**, **télégraphes**, ondes, lasso, glitch, vignette, désintégration, effets en espace écran | 6a, 6b | évolue |
| `60-intro.js` | `N.intro` | écran de démarrage, ouverture, titre (décor), attraction (séquencement), plongée, panneau du CYCLOPE, fonds de fin | 2 | évolue |
| `70-joueuse.js` | `N.joueuse` | serpent : mouvement, accélération, corps, collisions, mort, coupe, réapparition, pouvoirs, APOGÉE, lasso, traînée, arcs autour de la tête, ACTIONS AUTO | 3a, 3b | nouveau (tiré de `70-game.js`) |
| `71-butin.js` | `N.butin` | cellules, noyaux, pastille, aimant, fusion, expiration | 3a | nouveau |
| `72-ennemis.js` | `N.ennemis` | bestiaire, élites, modificateurs, RIVAL, TRAQUEUR, planeurs, tirs ennemis, armement dans la vue, visibilité, état `proie` | 4a, 4b | nouveau (tiré de `70-game.js`) |
| `73-arene.js` | `N.arene` | événements d'arène : ordres de TRAVELLING, voies et convois, SILLAGE | 5a, 5b | nouveau |
| `73-colosse.js` | `N.colosse` | LE CYCLOPE : entrée, phases, mains, arène, mort | 5b | nouveau |
| `74-arsenal.js` | `N.arsenal` | 6 armes à 4 paliers, tirs de la joueuse, montures sur le corps, GRAPPE, perte de palier | 3a, 3b | nouveau |
| `75-cartes.js` | `N.cartes` | XP, vivier, tirages, pitié, **`mods`**, textes calculés, cartes de vague | 8 | nouveau |
| `76-directeur.js` | `N.dir` | vagues, formations, points d'apparition, portails, plafonds, TRAQUEUR, PASTILLE, DÉFILÉ, tension | 5a, 5b | nouveau |
| `77-score.js` | `N.score` | score, chaîne, vies, primes, défis (du jour, de vague), statistiques, énergie, déblocages, profil, records, réglages persistés | 8 | nouveau |
| `78-hud.js` | `N.hud` | HUD, radar, chevrons et marqueurs, bannières et leur file, toasts, gains flottants, codex | 8 | nouveau |
| `79-jeu.js` | `N.game` | **machine d'états** (§ 7.6), ordre des mises à jour et des dessins, séquence de mort, crochets de debug, scènes de référence | gardien, puis 9 | remplace `70-game.js` |
| `79-scene.js` | `N.scene` | **mise en scène** : tout ce que le § 5.3 associe aux événements (explosions, gels, poussées, sons d'événement, voix, bannières demandées) | 6a, 6b | nouveau |
| `80-ecrans.js` | `N.ui` | titre (menu), briefing, cartes, pause, réglages, fin, initiales, records, déblocages | 8 | nouveau |
| `85-pilote.js` | `N.pilote` | les 8 pilotes, dans le bundle, pour l'attraction et les bancs | P | nouveau |
| `90-boot.js` | `boot`, `N.S` | boucle, pas fixe, entrées étendues et gestes, `S.perf`, affichage de performance, cycle de vie, verrou d'écran | 1 | évolue |

`70-game.js` est supprimé par le lot 0b, une fois son contenu réparti. Ses fonctions servent de modèle :
la flèche, la mine, la tourelle, la sentinelle, la purge, le flash de frappe, les télégraphes, le HUD et
l'écran de fin de la démo, qui deviennent les replis des squelettes.

### 7.2 Le temps (`N.horloge`, dans `03-socle.js`)

Le jeu doit être reproductible à graine égale (R-30), sous `__DT` comme dans la boucle accélérée des bancs.
Le temps obéit donc à six règles.

1. **Le pas.** `90-boot.js` accumule le temps réel et fait des pas fixes de **h = 1/120 s**, au plus 4 par
   image ; le reste passe à l'image suivante. À 60 Hz, il y a deux pas par image ; à 120 Hz, un.
2. **Le gel** (hitstop) se compte **en secondes de temps réel**, jamais en images : `N.fx.hitstop(n)`
   prend un nombre d'images de référence et gèle n / 60 s. Pendant un gel, chaque pas a
   **dtMonde = dtJoueuse = 0** : rien ne bouge, mais les entrées sont lues, et un virage demandé pendant le
   gel s'applique au premier pas qui suit (J-21). L'ancienne règle « dt × 0,08 » disparaît.
3. **Les ralentis.** Hors gel, dtMonde = h × k, où k est le ralenti le plus lent en cours
   (`N.fx.ralenti`, arbitré par `50-fx.js`) ; dtJoueuse = h si la joueuse en est exemptée (RALENTI, entrée
   du CYCLOPE), h × k sinon.
4. **La transmission.** `N.game.update(dt)` reçoit dtMonde. Chaque module qui en a besoin lit
   `N.horloge.dtJoueuse()` ; `N.joueuse.update` l'emploie pour elle-même. Personne d'autre ne calcule de
   pas.
5. **Les unités.** `N.horloge.t()` et `S.t` sont en **secondes de temps de jeu** (les millisecondes de la
   démo disparaissent). `S.frame` et `__FRAME` comptent les images, et ne servent qu'aux effets visuels et
   aux tests ; `N.horloge.pas()` compte les pas et horodate le journal.
6. **La grille musicale de jeu.** `N.horloge.temps()` rend `{mesure, temps, phase}` à 144,6 BPM, **dérivé
   du temps de jeu** : il s'arrête pendant les gels, la pause, les cartes et les cinématiques gelantes.
   Tout ce qui touche au jeu s'y cale (apparitions « sur la grille des temps », avance du sol, cyclage du
   décor). `N.music.beat()` rend la phase **audio** réelle, pour les seuls effets visuels qui doivent coller
   au son (néons sur la grosse caisse) ; sans audio, ou sous `__DT`, il rend la grille de jeu. Aucune
   règle de jeu ne lit `AudioContext.currentTime`.

Les états qui gèlent l'horloge de jeu sont listés au § 7.6 (`cartes`, `pause`, `panneau`, `fin`,
`initiales`). Pendant la séquence de mort, l'horloge avance au rythme du ralenti de la séquence.

### 7.3 Le hasard : des flux nommés (`N.rng`, dans `03-socle.js`)

Avec un seul flux global, chaque tirage ajouté dans un module change toute la suite des autres, et les
réglages du lot 9 deviendraient instables à chaque intégration. `30-music.js` contourne déjà le flux
partagé en échangeant `S.rngState`.

- **`N.rng(nom)`** rend un flux propre, créé au `reset` de la partie avec la graine
  hash(graine de partie, nom) : `{ f() → [0,1[, i(a, b), r(a, b), etat(), reprendre(e) }`. Même suite
  congruentielle que la démo.
- **Les noms figés** : `dir`, `ennemis`, `arene`, `butin`, `cartes`, `arsenal`, `joueuse`, `vol`, `defis`
  (graine du jour pour les défis du jour, graine de partie pour les défis de vague), `decor`, `fx`,
  `music`, `pilote`. Un module ne tire que dans ses flux.
- **Deux familles.** Les flux de jeu (`dir` à `defis`) ne sont tirés que dans les `update`. Les flux
  cosmétiques (`decor`, `fx`, `music`) peuvent être tirés au dessin et par l'audio : ils ne changent jamais
  le journal. Le flux `pilote` appartient aux pilotes.
- **L'attraction** joue une partie complète, remise à zéro avec la graine 2975, sur ses propres flux : elle
  ne consomme rien de la partie suivante.
- **`N.rnd`** reste un alias du flux `jeu` pour le code repris de la démo, et il est interdit dans le code
  neuf (vérifié par une recherche dans le banc de non-régression).

### 7.4 Les événements : un émetteur unique, des consommateurs dans un ordre fixe (`N.ev`)

Un kill doit produire, une seule fois chacun : score, chaîne, XP, APOGÉE, butin, GRAPPE, explosion, gel,
son, gain flottant, codex, défis, journal. Si chaque appelant (arsenal, lasso, mine, APOGÉE, convoi) les
déclenchait lui-même, on aurait des effets en double ou absents. La règle : **un événement a un seul
émetteur ; les appelants ne font que demander l'action à cet émetteur ; les effets sont tous des
consommateurs, inscrits avec un rang qui fixe leur ordre.**

- **L'interface** : `N.ev.on(nom, rang, fn)`, `N.ev.emit(nom, charge)`. L'envoi est synchrone et suit les
  rangs. Un événement émis pendant un envoi est mis en file et envoyé juste après (premier entré, premier
  sorti). Au plus 64 événements par pas ; au-delà, l'événement est journalisé comme perdu et `__ERR` compte
  une erreur.
- **Les rangs** sont communs à tous les événements : 10 règles de jeu (machine d'états, joueuse, ennemis,
  arène), 20 score et chaîne, 30 expérience et cartes, 35 APOGÉE, 40 butin et décor, 50 effets d'arme
  (GRAPPE, perte de palier, montée), 60 mise en scène (`79-scene`), 70 interface (HUD, codex), 80 défis,
  statistiques et énergie, 90 journal. Deux consommateurs de même rang sont appelés dans l'ordre des noms de
  fichier.
- **Exemple : un tir du canon tue une flèche.** `74-arsenal` appelle `N.ennemis.hit(e, 10, src)` et
  s'arrête là. `72-ennemis` retire les PV, voit qu'ils tombent à 0 et émet `kill`. Puis, dans l'ordre :
  `77-score` compte les points et la chaîne (20) ; `75-cartes` ajoute l'XP (30) ; `70-joueuse` ajoute +2
  APOGÉE (35) ; `71-butin` tire le largage (40) ; `74-arsenal` applique GRAPPE si `mods.grappe` (50),
  par `N.ennemis.zone(…)`, dont les kills seront mis en file ; `79-scene` fait l'explosion, le gel, la
  poussée, le son et le gain flottant (60) ; `78-hud` montre le codex si c'est une première (70) ;
  `77-score` avance les défis (80) ; `03-socle` journalise (90).

| Événement | Émetteur unique | Charge (champs figés au § 7.5) | Consommateurs, par rang |
|---|---|---|---|
| `kill` | `N.ennemis` (dans `hit`, `zone`, `devorer`, `purge`, broyage) | `{id, type, x, y, elite, boss, base, src, distTete, gen}` | 20 score ; 30 XP ; 35 APOGÉE ; 40 butin ; 50 GRAPPE ; 60 scène ; 70 codex ; 80 défis ; 90 journal |
| `coup` | `N.joueuse` (tir, contact, souffle… sur la tête protégée par le BOUCLIER, ou sur le corps avant `coupe`) | `{partie:'tete'\|'corps', k, cause, auteur, x, y, absorbe}` | 60 scène ; 70 HUD ; 90 journal |
| `coupe` | `N.joueuse` (`couper`) | `{k, perdus, cause, auteur, x, y}` | 20 chaîne ÷ 2 sauf SANG-FROID ; 40 butin (cellules) ; 60 scène ; 80 défis ; 90 journal |
| `mort` | `N.joueuse` (`tuer`) | copie de `S.death` | 10 machine d'états (séquence de mort) ; 20 vies et statistiques ; 50 perte de palier ; 60 scène (remappage, cue `mort`) ; 80 défis ; 90 journal |
| `ramassage` | `N.butin` | `{type:'cellule'\|'noyau'\|'pastille', x, y, valeur}` | 10 joueuse (grandir) et ennemis (pastille → `inverser`) ; 20 score ; 30 XP ; 35 APOGÉE ; 60 scène (escalier) ; 80 énergie et défis ; 90 journal |
| `lasso` | `N.joueuse`, **après** avoir appelé `N.ennemis.hit` sur chaque enfermé | `{n, ids, aire, x, y, poly}` | 20 prime du lasso ; 35 APOGÉE (+3 × n) ; 40 butin (aspiration, noyau si n ≥ 4) ; 60 scène ; 80 défis ; 90 journal |
| `niveau` | `N.cartes` | `{niveau, enAttente}` | 60 scène ; 90 journal |
| `carte` | `N.cartes` (`choisir`) | `{id, niveau}` | 10 joueuse (pouvoir, CROISSANCE) ; 50 arsenal (`monter`) ; 70 HUD ; 90 journal |
| `vague` | `N.dir` | `{n, evt:'entree'\|'pic'\|'nettoyee'\|'soupape', nom, quartier}` | 10 machine d'états (NETTOYAGE, cartes, VOL) ; 20 bonus de vague ; 40 décor (état, quartier) ; 60 scène (bannière, stinger, section) ; 80 défis ; 90 journal |
| `vol` | `N.vol` | `{evt:'debut'\|'porte'\|'mine'\|'fin', parfait}` | 10 machine d'états ; 20 score ; 40 décor (quartier suivant) ; 60 scène ; 80 défis ; 90 journal |
| `inversion` | `N.ennemis` | `{evt:'debut'\|'fin', dur}` | 40 décor ; 60 scène (cue, couche) ; 70 HUD ; 90 journal |
| `arene` | `N.arene` | `{evt:'travelling'\|'convoiAnnonce'\|'convoiPasse'\|'fin', voie, vx}` | 60 scène ; 70 HUD (radar) ; 90 journal |
| `phase` | `N.colosse` | `{n, evt:'entree'\|'repit'\|'enrage'\|'mort'}` | 10 machine d'états ; 20 score ; 40 décor ; 60 scène ; 90 journal |
| `apparition` | `N.ennemis` (`spawn`, à la fin du portail) | `{id, type, x, y, elite}` | 70 HUD (radar, marqueurs) ; 90 journal (avec la vue courante et anticipée) |
| `portail` | `N.dir` | `{type, x, y, dur, elite}` | 60 scène (tic) ; 70 HUD (chevron) ; 90 journal |
| `arme` | `N.ennemis`, `N.colosse`, `N.arene` (début d'un télégraphe) | `{id, type, forme, total, cible}` | 60 scène (son d'armement) ; 90 journal |
| `pouvoir`, `apogee`, `boost` | `N.joueuse` | `{id, evt}` | 60 scène ; 90 journal |
| `defi` | `N.score` | `{id, ok, prime}` | 60 scène (bandeau, son) ; 90 journal |
| `deblocage` | `N.score` | `{id}` | 30 cartes (vivier) ; 60 scène ; 90 journal |

**Ce qui n'est pas un événement** : les sons continus et propres à un module (`tir`, `salve`, `boost*`,
`fermable`, `porte`), et les appels de dessin. Les modules ne s'appellent directement que pour **demander
une action à son propriétaire** (`N.ennemis.hit`, `N.joueuse.couper`, `N.butin.lacher`,
`N.world.travelling`), jamais pour en produire les effets.

### 7.5 Les schémas des objets partagés et les identifiants figés (`N.ids`)

Ces formes sont lues par les pilotes, les mesures, le HUD, l'écran de fin et plusieurs lots. Un champ
nouveau s'ajoute par une demande au gardien (§ 8.1), jamais en douce.

```
// ---- un ennemi : élément de N.ennemis.list (et S.enemies, même tableau)
{ id, type,                    // type ∈ N.ids.ennemis
  x, y, vx, vy, r, ang,        // MONDE, px, rad
  pv, pvMax,
  etat,                        // 'portail'|'approche'|'arme'|'attaque'|'recup'|'fuite'|'proie'|'mort'
  etatT,                       // s écoulées dans l'état
  vuDepuis,                    // s depuis qu'il est entièrement dans la vue ; -1 s'il ne l'est pas
  elite, mods:{blinde, rapide, instable},
  boss, partie,                // partie ∈ 'oeil'|'main'|null ; les parties du CYCLOPE vivent dans list
  tele,                        // id du télégraphe en cours ou -1
  img, dir }                   // image d'animation et direction 0..15, pour le dessin

// ---- un tir ennemi : élément de N.ennemis.tirs (et S.shots)
{ id, x, y, vx, vy, r, vie, src }

// ---- une source : qui fait quoi
src = { genre:'arme'|'ennemi'|'arene'|'joueuse'|'decor', type, id }
     // genre 'arme'    : type ∈ N.ids.armes ∪ {'lasso','apogee','grappe','eperon','minesQ'}
     // genre 'ennemi'  : type ∈ N.ids.ennemis
     // genre 'arene'   : type ∈ {'convoi','murMobile'}
     // genre 'joueuse' : type ∈ {'devore'}
     // genre 'decor'   : type ∈ {'mur'}

// ---- un télégraphe : enregistré par N.fx.tele, lu par S.tele (pilotes) et le journal
{ id, forme:'ligne'|'disque'|'secteur'|'rect'|'losange'|'voie', x0, y0, x1, y1, r, a0, a1,
  reste, total, cible:'tete'|'corps'|'tout', par:{type, id} }

// ---- la mort
S.death = { cause, auteur, auteurId, x, y, t, vague, quartier, visibleDepuis, teleDuree }
     // cause  ∈ N.ids.causes = ['mur','morsure','ennemi','tir','laser','souffle','convoi','traine']
     // auteur ∈ N.ids.ennemis ∪ {'mur','murMobile','corps','convoi','cyclope','cyclope:main'}
     // N.ids.texte(cause, auteur) -> 'TIR DE TOURELLE', 'MUR ARRIÈRE', 'TRAÎNÉE DU RIVAL'…

// ---- la joueuse, pour les pilotes
S.player = { x, y, ang, angVise, vit, len, segs, etat, boost, reserve, apogee, pouvoirPret }

// ---- les modificateurs de cartes : écrits par N.cartes seulement, lus par tous
N.cartes.mods = { degats:1, cadence:1, aimant:28, lenMax:40, reparation:0, bouclier:0,
                  eperon:false, grappe:0, sangFroid:false, braise:0 }
```

**Les listes d'identifiants** (`N.ids`), figées par le lot 0a :

| Liste | Valeurs |
|---|---|
| `ennemis` | `fleche`, `dard`, `larve`, `mine`, `tourelle`, `lame`, `ruche`, `sentinelle`, `rival`, `planeur`, `traqueur` |
| `armes` | `canon`, `tourelles`, `arc`, `missiles`, `drones`, `minesQ` |
| `cartes` | les 6 armes, `puissance`, `cadence`, `aimant`, `croissance`, `reparation`, `bouclier`, `eperon`, `grappe`, `sangFroid`, `braise`, `traversee`, `ralenti`, `repli` |
| `causes` | `mur`, `morsure`, `ennemi`, `tir`, `laser`, `souffle`, `convoi`, `traine` |
| `etats` | ceux du § 7.6 |
| `sections` | `titre`, `attraction`, `briefing`, `jeu`, `repit`, `alerte`, `boss`, `victoire`, `defaite`, `initiales` |
| `quartiers` | `docks`, `artere`, `centrale`, `ciel`, `tours`, `coeur`, `eclipse` |
| `defis` | `finir` et les 12 de la réserve du § 2.14 |
| `deblocages` | `ralenti`, `repli`, `styles`, `galerie`, `departV3` |
| `sons` | les noms du § 5.8 |
| `scenes` | celles du § 7.12 |

**Les sprites** se demandent par `N.spr.get(nom, dir, img)` (dir de 0 à 15, image d'animation, état dans le
nom : `fleche:armee`, `lame:deployee`, `ruche:p2`). Le catalogue des noms, avec leur taille et leurs
paramètres, est publié par `N.spr.catalogue()` et figé par le lot 0a dès la liste du § 8.3 (lots 6a et 6b) ;
un nom absent rend le repli procédural du squelette.

### 7.6 Les états du jeu : qui met à jour, qui dessine, qui lit les entrées (`N.game.etat()`)

`N.game.etat()` fait foi. `S.phase` disparaît ; `90-boot.js` n'aiguille plus sur lui et appelle toujours
`N.game.update` et `N.game.draw`.

| État | Horloge de jeu | Mis à jour | Dessiné par | Entrées lues par | Section musicale |
|---|---|---|---|---|---|
| `demarrage` | arrêtée | — | `60-intro` (logo, TOUCHE POUR COMMENCER) | `90-boot` (déverrouillage), puis `79-jeu` | — |
| `ouverture` | arrêtée | `intro` | `60-intro` | `60-intro` (saut) | `titre` |
| `titre` | arrêtée | `decor` | `60-intro` (fond), puis `80-ecrans` (menu) | `80-ecrans` | `titre` |
| `attraction` | avance | tout le jeu, plus `pilote` | le monde, `78-hud`, puis `60-intro` (bandeau DÉMO, galerie) et `80-ecrans` (records) | `79-jeu` (tout toucher ramène au titre) | `attraction` |
| `briefing` | arrêtée | — | `60-intro` | `60-intro` (saut) | `briefing` |
| `plongee` | avance | `decor`, `cam` | `60-intro` sur le décor | `60-intro` (saut) | `jeu` |
| `jeu` | avance | `dir`, `arene`, `joueuse`, `arsenal`, `ennemis`, `colosse`, `butin`, `score`, `hud`, `scene` | le monde, puis `78-hud` | `70-joueuse` (manche, gestes) ; `78-hud` (boutons) | `jeu` |
| `nettoyage` | avance | comme `jeu`, sans apparition | idem | idem | `jeu` (stinger) |
| `cartes` | **arrêtée** | — | le monde figé, puis `80-ecrans` | `80-ecrans` | `jeu`, étouffoir 900 Hz |
| `vol` | avance | `vol`, `score`, `hud`, `scene` | `17-vol`, puis `78-hud` | `17-vol` (manche) | `jeu` |
| `defile` | avance | comme `jeu` | idem | idem | `repit` |
| `alerte` | avance | comme `jeu`, sans apparition, plus l'arène qui se resserre | le monde, bandes WARNING (`79-scene`), `78-hud` | `70-joueuse` | `alerte` |
| `panneau` | **arrêtée** | — | `60-intro` (panneau `boss`) | `60-intro` (saut) | `alerte` |
| `boss` | avance | comme `jeu`, avec `colosse` | idem | idem | `boss` |
| `mort` | ralentie par la séquence | `fx`, `scene`, `joueuse` (désintégration) | le monde, **remappage**, puis la joueuse et la cause (§ 7.7) | `79-jeu` (saut dès 0,5 s) | cue `mort` |
| `reapparition` | avance | comme `jeu` | idem | idem | `jeu` |
| `victoire` | avance | `fx`, `colosse` (carcasse), `ennemis` (purge), `butin` | le monde, `N.fx.drawEcran` | `79-jeu` (saut) | `victoire` |
| `fin` | **arrêtée** | `ui` | `60-intro` (fond `defaite` ou `victoire`), puis `80-ecrans` | `80-ecrans` | `defaite` ou `victoire` |
| `initiales` | **arrêtée** | `ui` | `80-ecrans` | `80-ecrans` | `initiales` |
| `pause` | **arrêtée** | — | le monde figé, puis `80-ecrans` | `80-ecrans` | pause, étouffoir 420 Hz |

Seul `79-jeu.js` change d'état et appelle `N.music.section` ; les autres modules demandent par un événement
(`vague`, `vol`, `phase`, `mort`). Pendant les états qui couvrent tout l'écran (`ouverture`, `briefing`,
`panneau`, `fin`, `initiales`), le monde et le décor ne sont **pas** dessinés.

### 7.7 La boucle d'images et l'ordre de dessin

`90-boot.js` déroule ces étapes à chaque image :

1. **Le temps** : les pas fixes du § 7.2.
2. **Les entrées** : il remplit `S.input` (§ 7.8), classe les gestes (§ 2.16), lit la manette par
   `navigator.getGamepads()`, puis vide `S.input.gestes` et `S.input.taps` après la mise à jour.
3. **Les mises à jour**, pour chaque pas : `N.game.update(dtMonde)`, qui appelle les modules de l'état
   courant dans l'ordre `dir`, `arene`, `joueuse`, `arsenal`, `ennemis`, `colosse`, `butin`, `score`,
   `hud`, `scene` et `ui` ; puis `N.fx.update(dtMonde)` et `N.cam.update(dtMonde)`. Une fois par image :
   `N.music.tension(N.game.tension())`. En mode simulé (`dbg.simuler`, `?nodraw`), la boucle s'arrête là :
   ni dessin, ni présentation, ni tube.
4. **Le décor lointain** : `N.gfx.clear(0)`, `N.gfx.origin(0, 0)`, puis `N.decor.drawFar(cam)` (P0 à P5 et
   le sol, en espace écran avec leur décalage propre). En état `vol`, `N.vol.draw()` remplace les étapes 4 à
   6.
5. **Le monde** : `N.gfx.origin(cam.x, cam.y)`, puis `N.game.draw()`, qui dessine le plateau et les murs, P6,
   le butin, les ennemis et leurs tirs, les tirs et montures de la joueuse ; puis `N.fx.draw()`
   (explosions) ; puis `N.game.drawTop()`, qui dessine les télégraphes (`N.fx.drawTele()`), le CYCLOPE, le
   serpent, le lasso et les arcs autour de la tête.
6. **Le crochet de mort** (état `mort` seulement) : `N.gfx.remap(LUT_MORT)` sur tout le tampon, puis
   `N.joueuse.drawTop()` et `N.scene.drawCause()` redessinent la joueuse et la cause entourée par-dessus.
7. **L'écran** : `N.gfx.origin(0, 0)`, puis `N.fx.drawEcran()` (feu d'artifice, explosions des écrans),
   `N.hud.draw()`, `N.ui.draw()` et `N.intro.draw()` quand une cinématique est en cours.
8. **La sortie** : quand le tube est actif, `N.gfx.present({ skipScale: true })` ne fait **rien** de plus
   que publier le tampon, et `N.crt.apply(dt)` compose seul ; sinon `N.gfx.present()` agrandit.

**Les espaces de coordonnées** : le monde est en px de jeu, avec l'origine fixe en haut à gauche ; l'écran
est en px du tampon (HUD, interface, cinématiques, VOL, entrées). On convertit **uniquement** par `N.cam`.

### 7.8 Les interfaces à ajouter ou à changer dans CONTRAT.md

Le lot 0a recopie ce bloc dans `CONTRAT.md`, section « Interfaces imposées ».

```
// ---- inchangées en signature, mais elles retranchent l'origine courante (coordonnées MONDE en jeu)
N.gfx.px/rect/line/circ/ring/blit/ditherRect/ditherCirc/disc
N.fx.boom(x,y,force,ci[,variante])    // x,y MONDE ; variante 'joueuse' : cœur qui refroidit en os → cyan pâle → cyan → indigo
N.gfx.resize(cssW,cssH,sûreW,sûreH)   // W,H = la VUE, plus le monde

// ---- 00-pal.js
N.pal.L[i]                             // luminance relative WCAG de chaque index (§ 5.1) ; N.pal.lumineux(i) -> L > 0,10

// ---- 03-socle.js
N.ev = { on(nom,rang,fn), off(nom,fn), emit(nom,charge) }          // § 7.4
N.rng(nom) -> { f(), i(a,b), r(a,b), etat(), reprendre(e) }         // § 7.3
N.horloge = { t(), dtMonde(), dtJoueuse(), pas(), temps() -> {mesure,temps,phase}, gele() }   // § 7.2
N.journal(type, donnees); N.journal.dump(); N.journal.actif(bool)   // § 7.9
N.ids = { ennemis, armes, cartes, causes, etats, sections, quartiers, defis, deblocages, sons, scenes, texte(cause,auteur) }

// ---- 10-gfx.js
N.gfx.origin(ox,oy)                    // toutes les primitives retranchent (ox,oy) ; origin(0,0) = écran
N.gfx.layer(img,{x,y,wrapX,opaque,lut})// pose un plan {w,h,data} par copie de rangées ; lut = table de 16 index (cyclage)
N.gfx.remap(lut[,rect])                // applique une table d'index au tampon (mort : monde en nuit et ardoise)
N.gfx.owner(code)                      // propriétaire des pixels dessinés ensuite (masque de test, coût nul hors test)
N.gfx.present({skipScale})             // skipScale : ni conversion, ni putImageData, ni agrandissement

// ---- 12-cam.js
N.world = { W:1024, H:512, x0,y0,x1,y1,           // murs courants
            arena(rect, dur), reset(),             // murs qui glissent, télégraphe inclus
            travelling({largeur, vx, depuis}) , stop(),   // l'arène qui voyage (§ 4.6)
            enMouvement(), mursAnnonces() -> [rect],
            distMur(x,y) -> {d, nx, ny, pan, mobile} }
N.cam = { x, y, w, h, update(dt), reset(x,y),
          toScreen(x,y,out), toWorld(sx,sy,out),
          visible(x,y,m),        // dans la vue, marge m (élimination, dessin)
          shown(x,y,m),          // ENTIÈREMENT dans la vue à m px du bord (armement)
          anticipee(sec,out),    // rectangle de la vue anticipée (apparitions)
          devant() -> px,        // distance visible devant la tête le long du cap (critère du § 3.3)
          jolt(dx,dy), focus(x,y,dur), mode('jeu'|'boss'|'libre') }

// ---- 15-decor.js
N.decor = { build(), etat(nom), quartier(nom), preparer(nom),    // preparer : précalcul par tranches pendant le VOL
            drawFar(cam), drawPlateau(cam), drawFront(cam),
            ondule(x,y,force), fenetres(), eclair(), silhouette(nom, plan, x, y, k), eclipse(t),
            horizon() -> y écran }

// ---- 17-vol.js
N.vol = { start(depuis, vers), update(dt), draw(), actif(), resultat() -> {portes, mines, parfait} }

// ---- 20-crt.js
N.crt.extinction(dur)                  // l'image s'écrase en une ligne puis en un point
N.crt.auto(bool)                       // préréglage piloté par S.perf (halo puis balayage) ; coupé au profil ×1 des bancs

// ---- 30-music.js (s'ajoute à l'existant)
N.music.load({base})                   // charge piste.json et les blocs à la demande ; base = MUSIQUE_BASE
N.music.section(nom)                   // appelée par 79-jeu seulement ; noms dans N.ids.sections
N.music.cue(nom)                       // 'mort' (coupe net), 'gameover', 'stinger', 'drop', 'plongee', 'vague', 'inversion'
N.music.couche(nom, bool)              // 'inversion'
N.music.danger(v)                      // 0..1 : battement et resserrement
N.music.beat() -> {bar, beat, phase}   // phase AUDIO, pour l'image seulement (§ 7.2)
N.music.sfx(nom,{pan,pitch,type})      // banque § 5.8
N.music.voix(mot)                      // READY, GO, WARNING, DANGER, EXCELLENT, GAMEOVER (P3)
N.music.mute(canal, bool)              // canal 'musique' | 'effets' ; l'ancien mute(v) coupe les deux
N.music.piste() -> {pret, bloc, mesure, section, repli}
N.music.noeuds() -> nœuds créés dans la dernière seconde (affichage de performance)

// ---- 40-sprites.js
N.spr.get(nom, dir, img), N.spr.catalogue(), N.spr.measure(texte, échelle) -> {w,h}

// ---- 50-fx.js (s'ajoute à l'existant)
N.fx.hitstop(images)                   // gel de images/60 s de temps réel (§ 7.2)
N.fx.tele(desc)        // ENREGISTRE un télégraphe pour l'image (S.tele) ; desc au schéma du § 7.5 ; dessiné par drawTele
N.fx.drawTele(), N.fx.drawEcran()
N.fx.onde(x,y,r0,r1,ci,dur)            // anneau seul, tramé, qui se troue
N.fx.pickup(x,y), N.fx.lasso(poly,n), N.fx.glitch(force,dur), N.fx.vignette(angle,force)
N.fx.ralenti(k,dur,{joueuse:false})    // arbitre : le plus lent gagne ; joueuse exemptée si demandé
N.fx.k(), N.fx.kJoueuse()              // facteurs courants, lus par N.horloge
N.fx.desintegre(points, dur)           // désintégration segment par segment (mort)
N.fx.boom(x,y,force,ci,{ecran:true})   // explosion en espace écran

// ---- 70-joueuse.js
N.joueuse = { reset(cfg), update(dt), draw(), drawTop(),
              tete:{x,y,ang,vit}, segs(), len(), etat,   // 'vivant'|'mort'|'reapparition'|'absent'
              hitTest(x,y,r) -> {part:'tete'|'corps'|'queue'|null, k},
              tuer(cause, src), couper(k, src), grandir(n),
              invul(), pouvoir, apogee, boost, traine() }

// ---- 71-butin.js
N.butin = { reset(), update(dt), draw(), lacher(x,y,n,{type}), aspirer(poly), pluie(n), list }

// ---- 72-ennemis.js
N.ennemis = { reset(), update(dt), draw(), spawn(type,x,y,opts), list, count(),
              hit(e,dmg,src) -> bool, zone(x,y,r,dmg,src) -> n, devorer(e),
              dans(poly) -> [], pres(x,y,r) -> [], tir(x,y,vx,vy,opts),
              tirs, effacerTirs(x,y,r), inverser(dur), fuir(), purge(ordre) }
S.enemies, S.shots                      // = N.ennemis.list et N.ennemis.tirs ; S.tele rempli par N.fx.tele

// ---- 73-arene.js
N.arene = { reset(), update(dt), draw(), travelling(vx, depuis), convois(cfg), voies() -> [],
            sillage(x,y) -> bool, actif() }

// ---- 73-colosse.js
N.colosse = { start(), update(dt), draw(), drawTop(), actif(), phase(), pv(), mort() }

// ---- 74-arsenal.js
N.arsenal = { reset(), update(dt), draw(), monter(arme), descendre() -> {arme, de, a},
              niveau(arme), armes(), tirs }

// ---- 75-cartes.js
N.cartes = { reset(), xp(n), niveauxEnAttente(), main(n,{trophee, vague, rareGarantie}),
             choisir(id), prises(), texte(id), mods }

// ---- 76-directeur.js
N.dir = { reset(secteur, opts), update(dt), vague(), phase(), tension(), progression(), entrees() }

// ---- 77-score.js
N.score = { reset(), score, chaine(), mult(), objectif() -> {mult, reste}, vies, defis, defiVague,
            stats, build() -> {nom, armes}, energie, deblocages, prochain() -> {id, reste, part},
            profil:{charger, sauver, reglages(obj?)}, records }

// ---- 78-hud.js
N.hud = { update(dt), draw(), banniere(texte,opts), toast(texte), tag(texte), pop(x,y,texte,opts), codex(type) }

// ---- 79-jeu.js (contrat de 90-boot.js inchangé)
N.game = { reset(graine,opts), update(dt), draw(), drawTop(), tension(), etat(),
           dbg:{ god(b), vague(n), boss(), input(o), etat(), scene(nom), simuler(sec) -> journal,
                 masque() -> Uint8Array } }

// ---- 79-scene.js
N.scene = { reset(), update(dt), drawCause() }      // tout le reste passe par N.ev

// ---- 80-ecrans.js
N.ui = { ouvrir(nom,opts), fermer(), actif(), update(dt), draw() }
// 'titre','briefing','cartes','pause','reglages','fin','initiales','records','galerie'

// ---- 85-pilote.js
N.pilote = { niveau(nom), activer(b), agir(dt) }   // 'inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'

// ---- 90-boot.js : S.input étendu
S.input = { x, y, mag,                 // manche : direction unitaire et course 0..1
            boost, pouvoir, apogee,    // vrais pendant UN pas, consommés par N.joueuse (boost : tant que tenu)
            pause, valider, retour,    // vrais pendant UN pas
            chiffre,                   // 1..4 ou 0
            car,                       // lettres tapées pendant l'image (initiales), chaîne
            any,
            pointer:{x, y, actif, boutons},           // souris, en px ÉCRAN
            manette:{connectee, x, y, boutons},       // lue par navigator.getGamepads()
            gestes:[{genre:'toucher'|'glisse'|'tenu', doigt:'action', t0, t1, x, y, dx, dy}],
            taps:[{x, y, t0, t1, doigt:'manche'|'action'|'bouton'}] }   // px ÉCRAN, pour N.ui
// Consommation : en état 'jeu' et voisins, N.joueuse consomme boost/pouvoir/apogee ; dans les écrans,
// N.ui consomme taps/valider/retour/chiffre/car. Un tap commencé avant l'ouverture d'un écran ne compte pas.
S.perf = { p50, p90, p95, p99, niveau }   S.jour = AAAAMMJJ (seule date permise)
S.reglages                                 // schéma au § 7.10
```

**Les interdits changent sur trois points** :

- **Les URL** : seuls `05-art.js` (clips `cine/*.mp4`) et `30-music.js` (`musique/piste.json` et
  `musique/*.mp3`, depuis `MUSIQUE_BASE`) chargent des fichiers.
- **Les écouteurs du DOM** n'existent que dans `90-boot.js`, qui publie tout dans `S.input`.
- **L'horloge** : `Date.now` et `performance.now` ne sont permis que dans `90-boot.js` ; `S.jour` est la
  seule date que le jeu voit.

Les crochets de test (`__N`, `__S`, `__ERR`, `__SEED`, `__DT`, `__FRAME`) sont gardés. S'y ajoutent
`__N.game.dbg`, `__N.pilote`, `__N.journal` et `__NODRAW`.

### 7.9 Le journal de mesure (`N.journal`)

Les scripts de mesure sont écrits contre ce format, avant que les modules n'existent. Chaque enregistrement
porte `{pas, t, image, type, …}` ; le journal est un anneau de 65 536 entrées, vidé par
`__N.journal.dump()`. Il est complet sous `?journal=1`, dans les bancs et en mode simulé ; en jeu normal,
seuls `coup`, `mort`, `kill` et `vague` sont gardés, pour l'écran de fin.

| Type | Champs | Écrit par |
|---|---|---|
| `apparition` | id, type, x, y, elite, vue {x,y,w,h}, anticipee {x,y,w,h}, distTete | consommateur 90 de `apparition` |
| `portail` | type, x, y, dur | consommateur 90 de `portail` |
| `armement` | id, type, debut, shown (bool), rallonge (bool) | `N.ennemis`, `N.colosse` |
| `tele` | id, forme, total, cible, par | `N.fx.tele` |
| `tirEnnemi` | id, src, x, y | `N.ennemis.tir` |
| `coup` | partie, k, cause, auteur, auteurId, visibleDepuis, teleDuree, absorbe | consommateur 90 de `coup`, `coupe` et `mort` |
| `kill`, `lasso`, `coupe`, `mort`, `ramassage`, `carte`, `niveau`, `vague`, `vol`, `inversion`, `arene`, `phase`, `defi`, `deblocage` | la charge de l'événement | consommateur 90 |
| `geste` | genre, doigt, duree, deplacement, action | `90-boot` |
| `section`, `bloc` | nom ; fichier, t0 audio, decalage | `30-music` |
| `flash` | aire, accepte | `N.fx.flashGate` |
| `sfx` | nom, demande, joue | `30-music` |
| `vue` | x, y, w, h, devant, teteX, teteY (toutes les 6 images) | `12-cam` |
| `perf` | ms de l'image, ms par module, préréglage du tube | `90-boot` |

### 7.10 Les réglages et la persistance

```
S.reglages = { musique:true, effets:true, secousse:1,        // 1 | 0.5 | 0
               flashs:true, ecran:'riche',                   // 'riche' | 'sobre' | 'pur'
               texte:1,                                      // 1 | 2
               manche:1,                                     // 0.8 | 1 | 1.25 (rayon de course)
               actions:'doigts' }                            // 'doigts' | 'auto'
```

| Ligne | Module qui l'applique | Comment |
|---|---|---|
| `musique`, `effets` | `30-music` | `N.music.mute('musique' \| 'effets', !v)` |
| `secousse` | `20-crt` (trauma), `12-cam` (`jolt`), `15-decor` (0 : mouvement réduit) | facteur multiplicatif |
| `flashs` | `50-fx` | non : aucun flash au-delà du seuil d'aire, les explosions restent en contour |
| `ecran` | `20-crt` | préréglage du tube |
| `texte` | `78-hud`, `80-ecrans` | échelle de la police |
| `manche` | `90-boot` | rayon du manche flottant |
| `actions` | `90-boot` (gestes) et `70-joueuse` (déclenchement AUTO) | § 2.16 |

**La persistance** n'a qu'un écrivain, `77-score.js`, sous la clé `localStorage['snake2975.v1']`, protégée
par try/catch : `{ v:1, profil:{energie, deblocages, defisFaits, parties, codex, gestesVus}, records:[…],
reglages:{…} }`. `80-ecrans.js` lit et modifie les réglages par `N.score.profil.reglages(obj)`. Sans
stockage, tout vit le temps de la session, sans erreur.

### 7.11 Le budget de performance

Le tube cathodique coûte déjà 7,7 ms au p95 en émulation iPhone (audit technique, § 3.1) : sans budget
global, la parallaxe et l'arsenal ne tiendront pas. Le budget est **par image** (deux pas de simulation à
60 Hz compris), au p95, au profil iPhone 13 paysage ×1 en émulation Chromium, tube en « riche », **qualité
adaptative coupée** :

| Poste | Budget p95 |
|---|---|
| `crt.apply` (après `skipScale` complet et tables préallouées) | 5,8 ms |
| décor : `drawFar`, `drawPlateau`, `drawFront`, sol compris | 1,5 ms |
| ennemis, tirs ennemis, télégraphes : mise à jour et dessin, à 40 ennemis | 1,0 ms |
| joueuse et arsenal : mise à jour et dessin, 160 tirs, 16 tourelles, drones, traînée | 1,0 ms |
| effets et mise en scène (`fx.draw`, `drawTele`, `scene`) | 0,7 ms |
| HUD, radar, écrans | 0,4 ms |
| butin, directeur, arène, colosse | 0,3 ms |
| musique : ordonnancement et sons | 0,2 ms |
| boucle, entrées, `present` | 0,1 ms |
| **Total** | **11,0 ms** |

- **R-20** tient au profil ×1 **sans** que la qualité adaptative descende : on ne remplit pas le critère en
  coupant le rendu. La qualité adaptative ne sert qu'au profil ×4 et aux téléphones plus lents.
- **Les trois mesures de l'audit (M5)** sont imposées au lot 1 :
  1. quand le tube est actif, `present({skipScale:true})` saute toute la composition : ni conversion en u32,
     ni `putImageData` du canevas interne, puisque `20-crt.js` relit `buf()` directement (environ 0,6 ms) ;
  2. au bureau, la toile de sortie mesure tampon × k, où k est le plus grand diviseur de px qui garde la
     largeur sous 1 280 ; le CSS agrandit d'un facteur entier px / k, sans lissage. Les pixels restent des
     carrés identiques ;
  3. les tables du tube sont préallouées au `resize`, jamais à la première image ; l'origine du pic de
     563 ms dans `crt.apply` est trouvée et corrigée.
- **Les cinématiques plein écran** ne dessinent ni le monde ni le décor dessous (§ 7.6).

### 7.12 Les outils de mesure intégrés

- **Les scènes de référence** : `__N.game.dbg.scene(nom)` met le jeu dans un état figé et reproductible,
  le même pour tous les lots :

  | Scène | Contenu |
  |---|---|
  | `charge` | phase 3 du CYCLOPE, 30 ennemis, 60 tirs ennemis, build maximal, parallaxe complète, quartier LE CŒUR en `chaos` |
  | `v5` | V5 au plafond (32 ennemis), TRAVELLING, un convoi annoncé, build maximal |
  | `boss3` | phase 3 du CYCLOPE seule |
  | `mur` | tête à 30 px d'un mur, cap droit dessus |
  | `morsure` | serpent de 30 segments en spirale serrée |
  | `lasso6` | 6 cibles fixes groupées, serpent de 20 segments |
  | `mortTir` | une tourelle qui tire sur la tête dans 0,5 s |
  | `cartes` | l'écran de cartes avec 4 cartes |
  | `fin` | l'écran de fin après une mort par tourelle en V3 |
  | `vol` | le milieu d'un VOL |
  | `inversion` | une INVERSION avec 12 proies |
  | `convoi` | un convoi qui passe, 6 ennemis dans sa voie |
  | `travelling` | V3, mur arrière à 40 px de la queue |
  | `calme`, `montee`, `chaos`, `colosse` | t = 3 s après l'entrée d'une vague de chaque état, pour R-11 |

- **Le mode simulé** : `__N.game.dbg.simuler(secondes)` (ou `?nodraw` avec `__NODRAW`) fait tourner la
  mise à jour seule, sans `clear`, `draw`, `present` ni tube, aussi vite que possible, et rend le journal.
- **Le masque de propriété** : `__N.game.dbg.masque()` rend un `Uint8Array` de la taille du tampon, où chaque
  pixel porte le code de qui l'a dessiné en dernier (`N.gfx.owner` : 1 tête, 2 corps, 3 arsenal, 4 icônes de
  vie, 5 ennemi, 6 butin, 7 effet, 8 décor, 9 HUD). Il n'est rempli que lorsqu'on le demande. C'est lui qui
  rend mesurables R-03 et R-37.
- **L'affichage de performance** : `?perf=1` affiche en 5 × 7, dans un coin, p50, p95 et p99 de l'image, le
  préréglage du tube et les nœuds audio créés par seconde. `?scene=charge` ouvre directement la scène de
  charge. La propriétaire lit ainsi le chiffre sur son propre téléphone aux jalons.

### 7.13 Ce qui se garde tel quel

- `00-pal.js` (on y ajoute seulement la table des luminances) et `05-art.js`, en entier.
- **Dans `10-gfx.js`** : le tampon d'index, `present`, les primitives (on ajoute l'origine, les plans, le
  remappage et le masque).
- **Dans `20-crt.js`** : la passe unique par tables, les préréglages, la caméra à ressort de la secousse.
- **Dans `30-music.js`** : le cycle de vie iPhone (porte, étouffoir, `pump()`, `resync()`, coupure mémorisée
  valable avant l'initialisation), l'ordonnancement sur l'horloge audio, `renderOffline`, le genou doux,
  les gardes FUSION, PLAFOND et USURE, les sons dans la tonalité.
- **Dans `40-sprites.js`** : les 16 directions par RotSprite, la police 5 × 7 accentuée, et les sprites
  existants (tête, corps, flèche, tourelle, sentinelle, mine, tirs, butin, icônes).
- **Dans `50-fx.js`** : les explosions en anneaux tramés, le limiteur de flashs WCAG, le flash de frappe
  limité par objet, la secousse à trauma. Le gel passe des images aux secondes (§ 7.2).
- **Dans `60-intro.js`** : l'ouverture et ses panneaux, le logo qui se construit, le briefing tapé, les
  fonds de fin, la garde de 300 ms.
- **Dans `90-boot.js`** : le manche flottant (doigt propriétaire, origine qui suit, cap gardé), la zone
  sûre, la taille du pixel, la pause en arrière-plan, la quarantaine des erreurs.
- **`build.mjs`** : son principe ne change pas. On ajoute la liste des blocs de `musique/`, l'écriture de
  `MUSIQUE_BASE` relative au fichier produit, et l'option `--embed`. Le chemin de sortie en argument existe
  déjà.

Le lot 0b prouve que ces acquis survivent : `tools/jeu/fumee.mjs` et `tools/jeu/cadence.mjs`, adaptés aux
nouveaux crochets, passent sur le bundle de squelettes.

---

## 8. Le travail : phases, lots parallèles, jalons de la propriétaire, critères

### 8.1 Les règles du travail parallèle

- **Une copie isolée par lot.** Un seul arbre de travail partagé ne marche pas : `build.mjs` concatène tout
  `src/` et écrit `proto-neon/index.html` par défaut, donc huit agents qui construisent en même temps
  embarqueraient les fichiers à moitié écrits des autres et s'écraseraient la même sortie. L'orchestrateur
  crée donc **un `git worktree` par lot**, depuis le commit qui fige le contrat :
  `tools/lots/worktree.sh L3a` fait `git worktree add ../wt/L3a -b lot/L3a <commit du contrat>`. Le lot ne
  travaille que dans sa copie, et construit sa page d'essai par `node build.mjs tools/L3a/index.html`, dans
  sa copie. Il ne voit des autres que les squelettes figés.
- **Un lot ne touche que ses fichiers** de `src/`, plus son dossier `tools/<lot>/` et son rapport
  `refonte/lots/<lot>.md`, qui liste les fichiers livrés. Il ne commite pas : l'orchestrateur copie ces
  fichiers dans l'arbre d'intégration et commite.
- **Le contrat est versionné et a un gardien.** Les interfaces, les schémas, les événements, les
  identifiants et `N.R` sont figés par le lot 0a (version 1.0 de `CONTRAT.md`). Un besoin nouveau s'écrit en
  une ligne dans `refonte/lots/demandes.md` (lot, demande, raison). **Le gardien** (l'agent du lot 0a, qui
  reste en poste jusqu'à la fin de la phase 2) les traite au fil de l'eau : il accepte ou refuse, publie une
  version 1.1, 1.2… et l'orchestrateur reporte les fichiers du contrat (`02-regles.js`, `03-socle.js`,
  `CONTRAT.md`, signatures des squelettes) dans toutes les copies. On ne modifie jamais le fichier d'un
  autre lot.
- **Le gardien relit chaque livraison avant intégration** : schémas respectés, événements émis par leur seul
  émetteur, aucun effet produit hors de son consommateur, aucun chiffre hors de `N.R`.
- **Chaque lot code contre les squelettes** du lot 0b et fournit une **page d'essai**
  (`tools/<lot>/index.html`) qui montre son travail seul, avec les replis des autres.
- **À chaque livraison** : `node build.mjs` passe ; **zéro erreur** (`__ERR.count = 0`, console vide) sur
  trois profils (iPhone 13 paysage, iPhone 13 portrait, bureau 1440 × 900) ; les tests de contrat passent ;
  aucun `Math.random`, aucun `N.rnd` dans le code neuf, aucune couleur littérale hors de `00-pal.js` ; aucune
  allocation par image dans les boucles chaudes (tas stable sur 60 s).
- **Les chiffres viennent de `N.R`.** Un lot qui a besoin d'un chiffre absent l'ajoute dans un objet local
  marqué `// → N.R` et le demande au gardien.

### 8.2 Les phases, en un coup d'œil

| Phase | Lots | Ce qui en sort |
|---|---|---|
| **0, le contrat** | 0a (contrat), puis 0b (squelettes) | `CONTRAT.md` 1.0, `03-socle.js`, `02-regles.js`, tests de contrat, squelettes qui tournent, outils de copie et de non-régression |
| **1, la tranche** | en parallèle : 1, 2, 3a, 4a, 5a, 6a, 7a (sept agents), plus le gardien | intégration A par le lot 9 : une **tranche jouable** (titre, plongée, V1, cartes, VOL, V2 avec TRAVELLING, PASTILLE et TRAQUEUR, mort, fin) |
| **JALON A** | la propriétaire, sur son iPhone, et deux juges | son verdict sur « triste », « facile », « plateau », « doigts » ; le plan et `N.R` amendés |
| **2, le secteur** | en parallèle : 3b, 4b, 5b, 6b, 7b, 8, P (sept agents), plus le gardien | intégration B par le lot 9, puis le réglage par les pilotes |
| **JALON B** | la propriétaire | son verdict sur le secteur complet, avant le jury |
| **3, le jugement** | 10 (jury), puis corrections | toutes les notes ≥ 8, aucun critère R bloquant en échec |

### 8.3 Les lots

#### LOT 0a — Le contrat (un agent, seul ; il devient ensuite le gardien)

**Livrables** :

1. `DIRECTION.md` et `CONTRAT.md` amendés (§ 0.2, § 7.8), `CONTRAT.md` en version 1.0.
2. **`03-socle.js` complet, pas en squelette** : `N.ev`, `N.rng`, `N.horloge`, `N.journal`, `N.ids` (§ 7.2 à
   7.5, § 7.9), avec des validateurs de schéma (`N.ids.valider(genre, objet)`) que les tests emploient.
3. `02-regles.js` : tous les chiffres des § 2 à 5, structurés comme `N.R.joueuse`, `N.R.mort`, `N.R.butin`,
   `N.R.cartes`, `N.R.armes`, `N.R.passifs`, `N.R.pouvoirs`, `N.R.apogee`, `N.R.lasso`, `N.R.inversion`,
   `N.R.score`, `N.R.defis`, `N.R.deblocages`, `N.R.camera`, `N.R.decor` (quartiers, cibles de lumière),
   `N.R.vol`, `N.R.arene`, `N.R.ennemis`, `N.R.elites`, `N.R.colosse`, `N.R.secteurs[0]` (vagues, formations,
   événements), `N.R.son` (cibles), `N.R.perf` (budgets).
4. Le catalogue des noms de sprites (§ 7.5) et la table des luminances dans `00-pal.js`.
5. **La spécification gelée des pilotes**, `refonte/lots/pilotes.md` (§ 4.10).
6. **Les tests de contrat comportementaux**, `tools/contrat/`, qui tournent sur n'importe quel bundle.
7. `refonte/lots/demandes.md`, vide, avec sa règle.

**Critères d'acceptation** [U] :

| Critère | Seuil |
|---|---|
| Bus d'événements | consommateurs appelés par rang, puis par nom de fichier ; un événement émis pendant un envoi passe après, dans l'ordre d'émission ; au-delà de 64 par pas, perte journalisée |
| Flux de hasard | ajouter 1 000 tirages dans `ennemis` ne change pas un seul tirage de `dir` ; deux `reset` de même graine donnent les mêmes suites |
| Horloge | `hitstop(6)` gèle 0,1 s ± 1 pas à `__DT` 1/30, 1/60 et 1/120 ; `temps()` s'arrête pendant le gel, la pause et les cartes ; `t()` en secondes |
| Journal | l'anneau garde les 65 536 dernières entrées ; `dump()` rend du JSON valide ; chaque type du § 7.9 a son validateur |
| `N.R` | contient chaque valeur chiffrée de ce plan : une liste de contrôle est jointe au rapport, ligne par ligne |

#### LOT 0b — Les squelettes (un agent, après 0a)

**Livrables** :

1. Les squelettes de tous les modules du § 7.1, chacun avec son interface complète et des replis
   procéduraux : carrés et cercles dans la palette, sons neutres.
2. **La répartition de `70-game.js`** dans les squelettes (code existant déplacé, pas réécrit), alignée sur
   les schémas du § 7.5, puis sa suppression. Le HUD, la carte unique et l'écran de fin de la démo
   deviennent les replis de `78-hud`, `75-cartes` et `80-ecrans` (cartes v0 : trois cartes à texte fixe).
3. **`79-jeu.js`** : la machine d'états complète du § 7.6, l'ordre des appels, la séquence de mort avec ses
   replis, les crochets `dbg` (`god`, `vague`, `boss`, `input`, `etat`, `scene`, `simuler`, `masque`) et les
   scènes de référence du § 7.12, en replis.
4. `build.mjs` : la liste de `musique/`, `MUSIQUE_BASE`, l'option `--embed`.
5. `tools/lots/worktree.sh` (copie isolée et page d'essai) et **`tools/nonreg/`**, la batterie de
   non-régression (§ 8.6).
6. `tools/jeu/fumee.mjs` et `tools/jeu/cadence.mjs` adaptés aux nouveaux crochets.

**Critères d'acceptation** [U] :

| Critère | Seuil |
|---|---|
| Bundle | se construit et tourne sur les trois profils avec zéro erreur |
| États | un script parcourt `demarrage → titre → plongee → jeu → nettoyage → cartes → vol → jeu → mort → reapparition → … → fin → plongee` avec les replis, sans erreur, en vérifiant `N.game.etat()` à chaque étape |
| Contrat, sur les squelettes | `spawn('fleche')` apparaît dans `list` avec un objet valide au schéma ; `hit` jusqu'à 0 PV émet `kill` une seule fois, et chaque consommateur inscrit est appelé une fois, dans l'ordre ; `tuer(cause, src)` remplit `S.death` valide ; `temps()` avance avec le temps de jeu et pas avec l'audio |
| Acquis | `fumee.mjs` et `cadence.mjs` passent sur le bundle de squelettes |
| Non-régression | la batterie tourne en moins de 10 minutes |

#### LE GARDIEN (l'agent du lot 0a, pendant les phases 1 et 2)

Il possède `02-regles.js`, `03-socle.js`, `79-jeu.js`, `CONTRAT.md`, `DIRECTION.md` et
`refonte/lots/pilotes.md`. Il traite `demandes.md`, publie les versions du contrat, fait évoluer
`79-jeu.js` (séquence de mort, temps forts d'état, scènes de référence réelles) et relit les livraisons. À
la phase de réglage, `02-regles.js` et `79-jeu.js` passent au lot 9.

#### LOT 1 — Moteur et mesure (`10-gfx.js`, `12-cam.js`, `20-crt.js`, `90-boot.js`, `tools/mesure/`)

**Livrables** :

- **Dans `10-gfx.js`** : l'origine de dessin, `layer` (bouclage, table de couleurs), `remap`, le masque de
  propriété (`owner`), et `present({skipScale})` qui saute toute la composition ; la toile de sortie
  plafonnée au bureau à un facteur entier (§ 7.11).
- **`12-cam.js`** : le monde, les arènes mobiles télégraphiées, le TRAVELLING, la caméra du § 3.3 et
  `devant()`.
- **Dans `90-boot.js`** :
  - le pas fixe de 1/120 s et l'alimentation de `N.horloge` ;
  - l'entrée étendue du § 7.8 : manche, classement des gestes du second doigt (§ 2.16), boutons du HUD,
    souris, manette, clavier (`valider`, `retour`, `chiffre`, `car`) ;
  - les gestes du système neutralisés et l'origine du manche tenue à 20 pt des bords (§ 2.16) ;
  - le déverrouillage du son sur `touchend`, `pointerup`, `click` ou `keydown` (V-33) ;
  - pause sur `blur` ; verrou d'écran ; `S.perf` ; l'affichage `?perf=1` ; `?scene=` ; le mode simulé ;
  - la nouvelle boucle du § 7.7 ;
  - l'initialisation de l'audio sans à-coup : graphe créé au chargement, le geste ne fait que `resume`.
- **Dans `20-crt.js`** : `extinction` ; le préréglage adaptatif (au-delà de 12 ms → « sobre », au-delà de
  15 ms → « coupe », retour sous 9 ms, avec hystérésis de 45 s), coupé au profil ×1 des bancs ; les tables
  préallouées au `resize` ; l'origine du pic de 563 ms trouvée et corrigée.
- **`tools/mesure/`** : un script par critère R du § 8.5 (Playwright, CDP, graines, profils), écrit contre
  le journal du § 7.9 et le masque, qui produit du JSON et des captures. La réunion des séries est en p95.

**Critères d'acceptation** [U] :

| Critère | Seuil |
|---|---|
| Dessin à l'origine | un `blit` à l'origine (100, 50) pose le sprite décalé de (−100, −50) ; un plan bouclé se raccorde sans couture (test au pixel) |
| Tête dans le cadre | entre 15 et 85 % de la zone sûre sur 100 % des images, sur un parcours scripté qui longe les quatre murs à la vitesse maximale et en accélération |
| Trajet visible devant | `devant()` ≥ min(1,2 s × v, d_mur + 16 px) en croisière et ≥ min(0,8 s × v, d_mur + 16 px) en accélération, sur 100 % des images de ce parcours, en paysage et en portrait |
| Caméra entière | arrondie une seule fois : aucun plan ne recule d'un pixel quand la caméra avance (monotonie sur 600 images) |
| Rotation | cinq rotations pendant une partie laissent l'état du monde identique (empreinte de `S`) ; zéro erreur |
| Pas fixe | à `__DT` 1/30, 1/60 et 1/120, la distance par seconde et le temps d'une vague diffèrent de moins de 1 % |
| Latence | 1 image entre l'événement tactile et le changement de cap (CDP) |
| Gestes du second doigt | 20 touchers → 20 pouvoirs, 0 APOGÉE, 0 accélération ; 20 glissés → 20 APOGÉE ; 20 appuis de 0,5 s → 20 accélérations de 0,32 s ± 1 image |
| Recentrages humains | 120 s de pouce levé et reposé toutes les 0,5 à 3 s, dont 30 % de reposés de moins de 200 ms sans mouvement, et 10 % où un autre doigt se pose moins de 150 ms après : **0** pouvoir, **0** APOGÉE, **0** accélération par le second doigt |
| Gestes du système | 50 balayages partant à moins de 10 px de chaque bord, en onglet et en web app : 0 navigation, 0 zoom, 0 sélection ; toutes les origines du manche à 20 pt au moins des bords |
| Parité clavier, souris, manette | chaque action du § 2.15 est déclenchée et journalisée |
| TRAVELLING | l'arène avance à vx ± 1 % ; ses positions sont annoncées dès le premier instant ; elle s'arrête au bord du monde |
| Performance | p95 ≤ 11 ms en iPhone 13 paysage ×1, qualité adaptative coupée, sur la scène `charge` en replis ; `skipScale` fait gagner au moins 0,5 ms ; aucune image au-delà de 50 ms pendant 10 redimensionnements ; au profil ×4, le préréglage descend en moins de 1 s sans perte de temps de jeu |
| Mode simulé | une partie de 6 min en moins de 15 s ; journal identique à celui de la même partie dessinée, à graine et entrées égales |
| Masque | sur la scène `charge`, 100 % des pixels dessinés par la joueuse, l'arsenal et les icônes de vie portent leur code |

#### LOT 2 — Décor et VOL (`15-decor.js`, `17-vol.js`, `60-intro.js`)

**Livrables** :

- les plans P0 à P6 lumineux, le sol ligne par ligne et le plateau avec ses murs et leur alerte de
  proximité (§ 3.4 à 3.6) ;
- les sept quartiers (cité, structures, soleil, table de couleurs) et leur précalcul par tranches ;
- les 6 états avec leurs balayages, le cyclage calé sur `N.horloge.temps()`, l'ondulation de la grille, les
  fenêtres qui réagissent, les éclairs, l'éclipse, les silhouettes du CYCLOPE en P2 et P5, la carcasse qui
  tombe ;
- le mouvement réduit ;
- **`17-vol.js`** en entier (§ 3.9), avec ses événements `vol` ;
- **Dans `60-intro.js`** : l'écran « TOUCHE POUR COMMENCER » ; le titre (`affiche`, logo, prolongement
  fondu) ; la plongée ; le panneau du CYCLOPE raccourci à 1,6 s ; les fonds de fin ; le séquencement de
  l'attraction (P3).

**Critères d'acceptation**, mesurés sur le tampon d'index, iPhone paysage, décor seul puis avec le jeu de
replis :

| Critère | Seuil |
|---|---|
| Lumière du décor seul [U] | entre 18 et 28 % de pixels lumineux dans chaque quartier en `calme` ; luminance moyenne du décor seul ≥ 0,06 |
| Lumière avec les replis [U], puis R-11 [I] | ≥ 25 % en `calme`, ≥ 28 % en `montee`, ≥ 32 % en `chaos` |
| Vide à t = 1 s [U] | moins de 30 % |
| Le décor se tait [U] | hors du disque du soleil, aucun bloc de 3 × 3 px plein en couleur vive ne se déplace de plus de 1 px/s par rapport à son plan (paire de captures, caméra fixe) |
| Pixels changés [U] | au moins 15 % en 0,5 s en croisière sans entité ; au moins 3 % en 1 s caméra immobile |
| Vitesses de parallaxe [U] | au moins **5** vitesses distinctes mesurées sur une paire de captures (déplacement = f × Δ ± 1 px) ; aucun plan plus rapide que le plateau, hors P6 |
| Couleurs interdites dans le décor [U] | **0** pixel cyan ; magenta et rose pâle du décor (hors murs) sous 0,5 % |
| Palette [U] | 100 % des pixels dans les seize, pendant le cyclage, les balayages et LE VOL |
| Quartiers distincts [U] | les silhouettes de cité (masques de P3) de deux quartiers quelconques ont une intersection sur union inférieure à 0,5 |
| Horizon [U] | entre 0,38 h et 0,80 h en paysage selon la caméra, entre 0,42 h et 0,62 h en portrait |
| Coût [U] | décor p95 ≤ 1,5 ms ; précalcul d'un quartier ≤ 4 ms par image ; VOL ≤ 2 ms |
| Mouvement réduit [U] | plans immobiles : moins de 0,5 % de pixels changés en 1 s, hors jeu |
| LE VOL [U] | 4 s ± 1 image ; tout objet est une primitive de rayon entier (contrôle du code et test au pixel) ; chaque mine visible au moins 1,2 s avant le contact dans 100 % des cas ; 0 mort ; VOL PARFAIT détecté ; balayages de 0,4 s |
| Cinématiques [U] | ouverture ≤ 12 s ; plongée ≤ 0,8 s ; panneau du CYCLOPE ≤ 1,6 s ; toutes sautables, avec une garde de 300 ms |
| Titre [U] | sur les rangées de jointure ciel-image, aucune rangée où plus de 60 % des pixels changent de classe de luminance (≤ 0,05 ; de 0,05 à 0,10 ; > 0,10) par rapport à la rangée du dessus |
| Attraction (P3) [U] | démarre après 15 s sans toucher ; se quitte au premier toucher |

#### LOT 3a — La joueuse (`70-joueuse.js`, `71-butin.js`, `74-arsenal.js` pour le CANON)

**Les collisions** : chaque menace teste elle-même la joueuse par `N.joueuse.hitTest` et appelle
`N.joueuse.tuer` ou `N.joueuse.couper` (les ennemis et leurs tirs dans `72-ennemis`, les convois dans
`73-arene`, le CYCLOPE dans `73-colosse`) ; les murs et la morsure sont testés par `70-joueuse`.
`tuer` et `couper` appliquent eux-mêmes l'invulnérabilité, le BOUCLIER et la TRAVERSÉE, et rendent `false`
quand le coup est absorbé.

**Livrables** :

- le mouvement et l'accélération (§ 2.1, 2.2), dont la poussée droit devant et la coupure en virage ;
- les huit morts avec la grâce au mur, la coupe du corps (§ 2.3) ; la réapparition et la perte de palier
  (§ 2.4) ; la longueur et son volume (§ 2.5) ;
- le butin, dont la PASTILLE (§ 2.6) ;
- TRAVERSÉE et l'APOGÉE (§ 2.10, 2.11) ; le LASSO et sa traînée (§ 2.12) ; ACTIONS AUTO (§ 2.16) ;
- les arcs autour de la tête, le chevron du cap visé, la gaine ;
- le CANON à 4 paliers (§ 2.8) ;
- la désintégration de la séquence de mort (§ 5.4, avec `N.fx`).

**Critères d'acceptation** [U] :

| Critère | Seuil |
|---|---|
| Commandes | J-02, J-03, J-05 et J-06 tenues au banc du lot 1 |
| Accélération | 10 poussées droit devant sur 10 l'enclenchent en 120 ms + 1 image ; un slalom scripté de virages serrés à pleine course pendant 60 s : **0** accélération, rayon de 11 px ± 1 ; un écart de cap de plus de 30° la suspend en 1 image ; au plus 2 bascules par appui tenu ; un seul son de panne ; 95 % de la vitesse en 7 images |
| Mort au mur | tout droit vers un mur, mort à l'instant calculé ± 1 image, la tête ne dépasse jamais la limite des 3 px ; virage vers l'intérieur dans les 60 ms, survie (10 cas sur 10) |
| Morsure | une spirale serrée scriptée mord à un segment ≥ 6 hors des trois derniers, jamais avant ; un serpent de 9 segments ou moins ne se mord jamais |
| Coupe | une balle au segment k laisse une longueur de max(3, k), et ⌊(L − k) / 2⌋ cellules qui expirent en 3 s |
| LASSO | un cercle scripté autour de 6 cibles fixes les détruit toutes ; une fermeture sur les trois derniers segments fait un lasso ; une fermeture sur le corps ailleurs tue ; une boucle de moins de 300 px² ne fait rien ; durée de traînée = 1,2 + 0,02 L ± 1 image |
| LASSO bruité | un cercle scripté avec ± 10° de bruit de cap et 120 ms de retard, autour de 6 cibles, réussit dans au moins 80 % de 50 graines à L = 8, 20 et 40 |
| Réapparition | point sûr à plus de 48 px de toute menace dans 100 % de 200 morts provoquées ; invulnérabilité de 1,0 s ± 1 image, jamais contre le mur ; perte d'un palier de la meilleure arme, avec son étiquette |
| Événements | `kill`, `coupe`, `mort`, `lasso`, `ramassage` émis une fois et une seule par occurrence (journal, 10 minutes de jeu scripté) |
| CANON | 4 paliers au comportement et au dessin distincts ; DPS sur cible fixe à ± 10 % du § 2.8 |
| Couleurs | joueuse en cyan, cyan pâle et os, avec la gaine ; la tête et ses deux premiers segments au-dessus de tout effet, 100 % de leurs pixels en cyan ou cyan pâle hors image de dégât (G-11) |
| Plafonds | aucune allocation par image |

#### LOT 4a — Bestiaire I (`72-ennemis.js`)

**Livrables** : FLÈCHE, MINE, TOURELLE et SENTINELLE (reprises de la démo et mises au schéma), DARD, LARVE
et TRAQUEUR ; les tirs ennemis ; la réaction en chaîne des mines ; l'armement dans la vue avec rallonge et
chevron (§ 3.8) ; `vuDepuis` ; les télégraphes par `N.fx.tele` ; les collisions avec la joueuse ; la mort,
`kill` et le butin ; l'état `proie`, `inverser` et `devorer` (§ 2.17) ; la purge et la fuite.

**Critères d'acceptation** [U], sur la page d'essai, chaque type isolé puis en groupe, 20 graines :

| Critère | Seuil |
|---|---|
| Télégraphes journalisés | durée ≥ 500 ms pour 100 % des attaques, sans exception sous RAPIDE ni en groupe |
| Le télégraphe montre la vraie zone | longueur de la ligne de la flèche = bond réel ± 2 px ; disque de la mine = souffle réel |
| Armement dans la vue | 0 armement commencé hors de la vue (`shown`) ; 0 tir parti hors de la vue |
| Contres | ricochet sur la face de la tourelle (100 % des tirs dans ± 45° ricochent) ; esquive latérale de la flèche déclenchée dans l'axe ; mine abattue sans blesser la joueuse (G-30) |
| TRAQUEUR | entre après 7 s ± 0,1 s d'inaction ; invulnérable aux armes ; meurt au LASSO ; dévorable ; fuit à la fin de la vague |
| INVERSION | après `inverser(5)` : 100 % des ennemis ordinaires en `proie` en 1 image, 0 tir en vol, 0 attaque commencée, 0 dégât au contact ; points dévorés 200, 400, 800, 1 600, 1 600 ; à la fin, 0 dégât pendant 0,5 s dans 32 px |
| Schéma | 100 % des objets de `list` et `tirs` valides au schéma du § 7.5, à chaque image |
| Plafonds | 40 ennemis et 80 tirs ennemis tenus ; coût de mise à jour et de dessin p95 ≤ 1,0 ms à 40 ennemis |

#### LOT 5a — Secteur I (`76-directeur.js`, `73-arene.js` pour le TRAVELLING)

**Livrables** : les vagues 1 et 2 et leurs formations, lues dans `N.R.secteurs[0]` (aucun chiffre en dur) ;
les points d'apparition justes et les portails (§ 3.8) ; l'entrée calme, le NETTOYAGE, la soupape ; le
TRAQUEUR ; la PASTILLE ; les ordres de TRAVELLING et leur annonce ; la tension ; les événements `vague` et
`arene`.

**Critères d'acceptation** [U] :

| Critère | Seuil |
|---|---|
| Apparitions dans la vue | **0** sur 20 graines × 3 profils (journal des apparitions avec l'état de la vue) |
| Portails | 600 ms annoncés pour au moins 99 % des apparitions |
| Distance à la tête | 0 apparition à moins de 48 px ; 0 apparition derrière le mur arrière |
| Respiration | après chaque pic, au moins 8 s sous 40 % de ce pic |
| Vague 1 | aucun tir ennemi ; première menace (mine ou dard) avant 0:20 dans 100 % des graines ; durée de 22 s ± 2 |
| TRAVELLING | annoncé 2 s avant ; démarre à +12 s en V2 ; l'arène contient la tête avec 80 px de marge à sa création |
| PASTILLE | posée à +20 s en V2, à 160 px au moins de la tête, dans l'arène |

#### LOT 6a — Image I (`40-sprites.js`, `50-fx.js`, `79-scene.js`)

**Livrables, côté sprites** : `dard`, `larve`, `traqueur`, `pastille`, `noyau`, `tete:dos`, une image
« armée » pour la flèche, les paliers du CANON (`lance`, rayon), les chevrons de portail en 16 directions,
les mini-silhouettes de 5 × 5 par type, les pastilles de vie de 5 × 5, et `N.spr.get` et `catalogue`.

**Livrables, côté effets** : le gel en secondes, `tele` et `drawTele` (le vocabulaire commun des
télégraphes du § 4.4), `onde`, `pickup`, `lasso`, `glitch`, `vignette`, `ralenti`, `k` et `kJoueuse`,
`desintegre`, la variante « joueuse » de `boom`, les effets en espace écran et `drawEcran`.

**Livrables, côté mise en scène** : `79-scene.js` pour les événements de la tranche (`kill`, `coupe`,
`mort`, `lasso`, `ramassage`, `niveau`, `carte`, `vague`, `vol`, `inversion`, `arene`, `portail`, `arme`,
`pouvoir`, `apogee`), d'après le § 5.3, et `drawCause`.

**Critères d'acceptation** [U] :

| Critère | Seuil |
|---|---|
| Tailles | V-05 : menaces et butin ≥ 7 × 7, tirs ≥ 3 × 3 |
| Couleurs | aucun cyan dans un sprite ennemi ; palette 100 % |
| Silhouettes | sur une planche en niveaux de gris, les masques binaires des types deux à deux, centrés, ont une intersection sur union inférieure à 0,6 |
| Limiteur de flashs | 0 dépassement sur une chaîne scriptée de 30 explosions en 2 s |
| Ralentis et gels | le plus lent gagne ; la joueuse est exemptée quand c'est demandé ; ralenti et gel ne se cumulent pas au-delà de 0,5 s ; un gel de 6 images dure 0,1 s à toute cadence |
| Télégraphes | gaine en nuit profonde sur 100 % des pixels de bord ; passage au rose pâle dans les 300 dernières ms, ± 1 image |
| Mise en scène | sur 50 événements scriptés, chaque effet attendu au § 5.3 est produit exactement une fois (journal des sons demandés et des explosions) |
| Coût | `fx.draw` + `drawTele` + `scene` p95 ≤ 0,7 ms avec 24 explosions et 30 télégraphes |

#### LOT 7a — La piste (`30-music.js`, première partie ; `tools/musique/` ; `musique/`)

**Livrables** : le découpage de la piste (§ 5.7) et `piste.json` vérifié par une détection des attaques et
un chromagramme, avec la décision sur le tempo ; le séquenceur par blocs et les sections ; les cues `mort`,
`stinger`, `drop` ; le chargement depuis `MUSIQUE_BASE` ; le repli génératif réaccordé avec son refrain,
recalé sur chaque bloc ; `mute(canal)` ; `beat()` en phase audio.

**Critères d'acceptation** [U], mesurés hors ligne et en partie réelle :

| Critère | Seuil |
|---|---|
| Démarrage | du son moins d'une mesure après le premier toucher (repli génératif) ; la piste prend la relève sur une barre, moins de 3 s après, sur réseau local |
| Chemin | la page d'essai `tools/L7a/index.html` trouve les blocs ; `--embed` produit un fichier autonome qui joue sans réseau |
| Jointures de blocs | écart < 1 ms mesuré par corrélation ; aucun clic (pic de dérivée < seuil fixé sur la piste d'origine) |
| Calage du génératif | sur 3 minutes, 100 % des entrées de couche à moins de 10 ms d'une barre du bloc en cours |
| Après une mort | jamais de reprise au début du morceau ; jamais le même bloc que celui de la mort |
| Robustesse | sans fichier de piste, le jeu complet tourne en génératif sans erreur ; coupure, suspension et reprise sous 1 s (J-19) ; mémoire audio décodée ≤ 25 Mo |

#### INTÉGRATION A, puis JALON A

Le lot 9 intègre dans l'ordre **1 → 6a → 2 → 3a → 4a → 5a → 7a**, avec la batterie de non-régression après
chaque étape (§ 8.6). La tranche contient : TOUCHE POUR COMMENCER, titre, plongée, V1 dans LES DOCKS, cartes
v0, VOL, V2 dans L'ARTÈRE avec TRAVELLING, PASTILLE, INVERSION et TRAQUEUR, mort et réapparition, puis un
écran « FIN DE LA TRANCHE » qui est l'écran de fin v0 avec sa cause. Deux juges neufs (une joueuse sur
iPhone, un directeur artistique) la notent sur R-08, R-10, R-11, R-22, R-31 et R-33, puis vient le JALON A
(§ 8.4).

#### LOT 3b — Arsenal et pouvoirs (`74-arsenal.js`, `70-joueuse.js`)

**Livrables** : les cinq autres armes à 4 paliers, avec montures et tirs (§ 2.8) ; les effets des passifs,
chacun lu dans `N.cartes.mods` selon le tableau du § 2.9 ; GRAPPE ; RALENTI et REPLI ; `descendre()` ; la
fusion des sons `salve`.

**Critères d'acceptation** :

| Critère | Seuil |
|---|---|
| Armes [U] | chacun des 24 paliers produit un comportement et un dessin distincts : sur un même scénario de 3 s, la capture d'un palier diffère de celle du palier précédent sur au moins 10 % des pixels de l'arsenal, et son DPS sur cible fixe est à ± 10 % du § 2.8 |
| Progression [I] | chaque palier strictement meilleur que le précédent sur l'œil du CYCLOPE ; ULTIME ≥ 1,5 × palier III |
| Passifs [U] | chaque carte produit l'effet mesuré de son texte (AIMANT 48 ± 1 px, CADENCE +20 % ± 2 %, etc.), test automatique sur les 10 |
| Lisibilité [U, puis R-37] | build maximal sur la scène `v5` en replis : cyan et cyan pâle hors tête et corps ≤ 8 % ; 0 pixel de l'arsenal à moins de 3 px du contour de la tête |
| Plafonds [U] | 160 tirs de la joueuse au plus, 12 mines de queue ; `salve` au plus 8 fois par seconde ; aucune allocation par image |

#### LOT 4b — Bestiaire II (`72-ennemis.js`)

**Livrables** : LAME, RUCHE, RIVAL, PLANEUR ; les élites FLÈCHE BLINDÉE et RUCHE INSTABLE ; les trois
modificateurs (§ 4.4, 4.5).

**Critères d'acceptation** :

| Critère | Seuil |
|---|---|
| Télégraphes [U] | ≥ 500 ms pour 100 % des attaques ; ligne de la lame = traversée réelle ± 2 px ; INSTABLE télégraphié avant de blesser ; coupe-route du RIVAL annoncé 0,5 s |
| RIVAL [U] | il meurt en s'écrasant dans les cinq cas (mur, sa traînée, son corps, le corps de la joueuse, la traînée de la joueuse), 10 fois sur 10 chacun ; sa traînée ne tue qu'à partir de 0,15 s d'âge ; les armes ne touchent que sa tête |
| PLANEUR [U] | 0 dégât au contact ; suit sa courbe ; sort en 8 s |
| Silhouettes [I] | avec les sprites du lot 6b, les 11 types et les 2 élites dessinées ont des masques deux à deux d'intersection sur union inférieure à 0,6 ; contour en nuit profonde sur 100 % des menaces au milieu d'une explosion |
| Plafonds [U] | coût p95 ≤ 1,0 ms à 40 ennemis de types mêlés |

#### LOT 5b — Secteur II et CYCLOPE (`76-directeur.js`, `73-arene.js`, `73-colosse.js`)

**Livrables** : les vagues 3 à 5, LE DÉFILÉ et leurs formations ; le TRAVELLING de V3 et V5 ; les CONVOIS et
le SILLAGE (§ 4.6) ; les pics ; LE CYCLOPE en entier (§ 4.8) : WARNING, entrée, arène, 3 phases, mains,
répits, enragement, mort, carcasse, purge.

**Critères d'acceptation** :

| Critère | Seuil |
|---|---|
| Apparitions dans la vue [U] | **0** sur 20 graines × 3 profils ; portails ≥ 99 % ; 1,4 s pour le CYCLOPE |
| Convois [U] | annonce de 1,5 s dans 100 % des cas ; jamais deux à la fois ; aucune annonce dans les 3 s d'une bannière d'élite ; ennemis broyés comptés à la joueuse ; SILLAGE détecté à 40 px ± 1 |
| DÉFILÉ [U] | 40 planeurs en 24 s ; PARFAIT détecté |
| CYCLOPE, télégraphes [U] | 100 % de ses attaques à ≥ 800 ms |
| Arène [U] | elle contient toujours la tête avec 80 px de marge à sa création ; aucune mort par un mur qui bouge sans son annonce |
| Pics croissants [I] | médianes V1 < V2 < V3 < V4 < V5 |
| Durées [I] | pilote dieu : secteur de 5:20 à 6:30 ; CYCLOPE de 55 à 90 s ; au moins 30 s face au kamikaze invulnérable |
| CYCLOPE, coups [I] | au moins 35 % des coups reçus pendant le combat viennent de lui (pilote bon) |
| CYCLOPE, chrono [U] | aucune victoire au chronomètre ; l'enragement se déclenche à 100 s |
| Explosion finale [I] | brasier > 8 % de l'écran pendant au moins 4 images, et caméra déplacée d'au moins 6 px (critère 4 de `DIRECTION.md`) |

#### LOT 6b — Image II (`40-sprites.js`, `50-fx.js`, `79-scene.js`)

**Livrables, côté sprites** : `lame` (repos et déployée), `ruche` (3 états de pétales), `rival` (tête et
perles, 16 directions), `planeur`, `fleche:elite`, `ruche:elite`, `plaques`, `couronne`, les rémanences
RAPIDE, les wagons de convoi ; le CYCLOPE en pièces (`colosse:tronc`, `colosse:oeil` ouvert et fermé,
`colosse:main`, `colosse:plaque`, `colosse:carcasse`) et `colosseLoin` (48 px) et `colosseMi` (80 px),
découpés dans `boss.png` et remappés ; l'arsenal (`tourelleJ`, `drone`, `missile` en 16 directions,
`mineJ`, `orbe`) ; les 19 icônes de cartes en 16 × 16 ; la police à l'échelle 1 à 4, avec `measure`.

**Livrables, côté effets et mise en scène** : l'explosion en cascade du CYCLOPE, et tout le § 5.3 dans
`79-scene.js`.

**Critères d'acceptation** [U] : ceux du lot 6a, sur les nouveaux sprites ; une planche en niveaux de gris
de tous les ennemis jointe au rapport ; les 19 icônes de cartes deux à deux d'intersection sur union
inférieure à 0,6.

#### LOT 7b — Le son (`30-music.js`, seconde partie)

**Livrables** : la banque du § 5.8, avec le panoramique et la fusion `salve` ; les couches PERCU,
ÉTINCELLES, INVERSION et BATTEMENT ; les accents ; le mixage ; la voix (P3) ; `renderOffline` étendu à la
piste, pour les preuves ; `noeuds()`.

**Critères d'acceptation** :

| Critère | Seuil |
|---|---|
| Couches et accents [U] | 100 % des changements à moins de 10 ms d'une barre (G-31) |
| Mixage [I] | cibles du § 5.7 (calme ≥ −20 dBFS en simulation de téléphone, +6 dB au chaos, corrélation tension ↔ niveau ≥ 0,5 sur 3 minutes de partie) |
| Sons [U] | chacun ≥ 25 % d'énergie au-dessus de 400 Hz ; `kill` 3 à 6 dB au-dessus de la musique ; `tirEnnemi` et `tir` corrélés à moins de 0,5 ; 0 kill muet (demandés = joués) |
| Répétition [I] | aucune fenêtre de 4 s identique à une autre à 1 % près sur 3 minutes (critère 5) ; aucune mesure complète identique trois fois de suite |
| Nœuds audio [U] | réserve de voix pour `tir` ; moins de 60 nœuds créés par seconde en moyenne sur la scène `charge` avec 16 tourelles |

#### LOT 8 — Interface et progression (`75-cartes.js`, `77-score.js`, `78-hud.js`, `80-ecrans.js`)

**Livrables** :

- l'expérience, le vivier, les tirages, la pitié, la carte de vague, « CHOISIS n », `mods` et les textes
  calculés (§ 2.7, 2.9) ;
- le score, la chaîne et son objectif écrit, les primes, la vie bonus, les défis du jour et de vague,
  l'énergie, les déblocages, le build, les statistiques, le profil, les records et les réglages persistés
  (§ 2.13, 2.14, 5.6, 7.10) ;
- le HUD, le radar, les chevrons et marqueurs, les bannières et leur file, les toasts, les gains flottants
  rangés, le codex (§ 3.7, 5.5) ;
- tous les écrans du § 5.6.

**Critères d'acceptation** :

| Critère | Seuil |
|---|---|
| HUD [U] | ≤ 10 % de l'écran sur 10 captures ; textes ≥ 5 × 7 à px ≥ 2 ; HUD dans la zone sûre dans les deux sens de paysage (V-14) |
| Cibles tactiles [U] | ≥ 44 pt ; garde de 400 ms des cartes et de 450 ms de la fin (un toucher commencé avant l'ouverture ne compte pas) |
| Textes de cartes [U] | égaux aux chiffres de `N.R` (test automatique sur les 19 cartes) ; « CHOISIS 2 » et « CHOISIS 3 » quand les montées attendent |
| Défis [U] | deux dates différentes donnent au moins un défi du jour différent, la même date les mêmes ; réussite ou échec annoncé en moins de 1 s, sans recouvrir la tête ni un télégraphe ; un défi de vague annoncé à chaque entrée de vague |
| Écran de fin [U] | affiche la cause, le quartier, l'heure, la vague, la progression, l'écart, le build, le record, les défis, la note, un conseil et le prochain déblocage avec sa barre, pour 100 % des morts journalisées |
| Records [U] | saisie des initiales au doigt et au clavier ; persistance, et stockage refusé sans erreur |
| Réglages [U] | les 8 lignes agissent (SECOUSSE 0 : la caméra ne bouge d'aucun pixel à la mort d'une élite ; MUSIQUE non : la piste se tait, les effets restent ; ACTIONS AUTO : le pouvoir part seul dans la scène `mortTir`) |
| Relance [U] | relance possible en moins de 2 s après l'impact (G-02) ; REJOUER rend le serpent en moins de 2 s, sans briefing ; deux touchers au plus du chargement au serpent (J-13) |
| Bannières [U] | jamais deux à la fois ; une toutes les 10 s au plus hors CYCLOPE ; placées dans le tiers opposé à la tête |

#### LOT P — Les pilotes (`85-pilote.js`)

**Livrables** : les 8 pilotes de la spécification gelée (`refonte/lots/pilotes.md`), qui ne lisent que `S`,
`S.tele` et les objets du § 7.5, n'écrivent que `S.input`, et ne tirent que dans le flux `pilote`.

**Critères d'acceptation** [U] : les 8 tournent 6 minutes sans erreur, en mode dessiné et en mode simulé ;
leur journal est identique à graine égale (deux exécutions) ; leur conformité à la spécification est testée
(temps de réaction et bruit mesurés dans le journal, ordre des cartes) ; une recherche dans le code montre
qu'ils ne lisent rien d'autre.

#### LOT 9 — Assemblage et réglage (un intégrateur, aux intégrations A et B, puis au réglage)

Il intègre dans l'ordre du § 8.6, lance la non-régression après chaque intégration, puis, à la phase de
réglage, possède `02-regles.js` et `79-jeu.js`. Il règle les chiffres de `N.R` avec les pilotes gelés, en
mode simulé, jusqu'aux cibles bloquantes du § 4.10, sans jamais modifier un pilote. Il fait passer toute la
batterie R-01 à R-38 du § 8.5, prépare le JALON B, puis écrit `refonte/assemblage.md` : les mesures, les
écarts et leurs raisons.

#### LOT 10 — Jury indépendant (après le JALON B)

Cinq juges qui n'ont rien construit et ne lisent aucun rapport des constructeurs : joueuse sur iPhone,
directeur artistique, game designer, ingénieur son, performance et robustesse. Ils notent sur 10 avec des
preuves, en s'appuyant sur le § 8.5, sur `recherche/` et sur les verdicts de la propriétaire. Les
corrections partent aux lots propriétaires ; on recommence tant qu'un juge note sous 8 ou qu'un critère R
bloquant échoue.

### 8.4 Les jalons de la propriétaire

Les pilotes ne remplacent pas une main humaine sur un écran de 6 pouces. La propriétaire est la seule
autorité ; elle joue donc deux fois avant la fin.

**Le protocole, aux deux jalons.**

1. L'orchestrateur construit un bundle autonome (`node build.mjs --embed`) et le met à une adresse que la
   propriétaire ouvre sur son iPhone, en onglet ou depuis l'écran d'accueil.
2. Il lui demande de jouer au moins trois parties, puis de répondre à six questions, avec ses mots :
   1. Le jeu est-il encore triste ? (lumière, couleurs, décor)
   2. Est-il encore trop facile ? Meurt-on de ce qu'on a vu venir ?
   3. Le plateau bouge-t-il assez ? LE VOL donne-t-il l'impression de voler ?
   4. Au doigt : diriger, accélérer, pouvoir, APOGÉE, lasso. Un geste raté, un faux départ ?
   5. Qu'est-ce qui donne, ou ne donne pas, envie de relancer ?
   6. Le chiffre « p95 » affiché par `?perf=1` sur son téléphone, sur la scène `?scene=charge`.
3. Ses réponses sont recopiées **telles quelles** à la suite de `refonte/RETOURS-PROPRIETAIRE.md`, sous un
   titre « Jalon A » ou « Jalon B ». Elles font autorité, comme les quatre premiers retours.
4. Le gardien en tire les amendements de ce plan et de `N.R`, avant la phase suivante. Chaque « non » de la
   propriétaire reçoit une correction ou une raison écrite (R-38).

**Le JALON A** vient après l'intégration A. **La phase 2 ne démarre qu'après son verdict.** Si la
propriétaire ne peut pas jouer dans les 48 heures, seuls les lots les moins exposés à son verdict démarrent
(7b, 8 et P) ; 3b, 4b, 5b et 6b attendent.

**Le JALON B** vient après l'intégration B et le réglage, avant le jury. Ce qu'elle refuse repart aux lots
avant le lot 10.

### 8.5 Les critères du jeu entier (le jury juge dessus)

| N° | Critère | Seuil | Mesure |
|---|---|---|---|
| R-01 | Pixels carrés | blocs de px × px identiques, zéro valeur intermédiaire sur un bord de sprite (avant tube) | capture agrandie |
| R-02 | Palette fermée | 100 % des pixels du tampon dans les seize, sur 10 captures de jeu, l'attraction, la mort, LE VOL, l'INVERSION, les cartes et la fin | `N.gfx.buf()` |
| R-03 | Cyan réservé | cyan et cyan pâle hors du masque joueuse + arsenal + icônes de vie (codes 1 à 4 de `dbg.masque()`) sous 0,5 % | 10 captures |
| R-04 | Difficulté | les 8 pilotes dans leurs cibles **bloquantes** du § 4.10 ; les cibles indicatives sont rapportées | 50 graines, mode simulé |
| R-05 | On peut mourir | les 8 causes de mort se produisent au moins une fois sur l'ensemble des parties des pilotes | journal |
| R-06 | Aucune apparition dans la vue | 0, et 0 armement hors de la vue | journal |
| R-07 | Télégraphes | 100 % ≥ 500 ms (CYCLOPE ≥ 800 ms, convois ≥ 1,5 s), à l'endroit des dégâts | `S.tele` + journal des coups |
| R-08 | Mort juste | au moins 95 % des morts ont une source visible depuis 600 ms ou plus (hors mur, morsure et traînée, visibles par construction) | journal, `visibleDepuis` |
| R-09 | Tête visible | tête dans le cadre (15-85 % de la zone sûre) sur 100 % des images ; trajet visible devant au § 3.3 ; tête et 2 segments au-dessus des effets (G-11) | captures, journal `vue` |
| R-10 | Monde et parallaxe | monde plus grand que l'écran ; au moins 5 vitesses de plan mesurées ; au moins 15 % de pixels changés en 0,5 s en croisière | captures appariées |
| R-11 | **Lumière, et décor qui se tait par la forme** | pixels lumineux (encres de luminance > 0,10, § 5.1) sur le tampon complet : ≥ 25 % en `calme` dès t = 1 s, ≥ 28 % en `montee`, ≥ 32 % en `chaos`, ≥ 25 % en `colosse` ; luminance moyenne (moyenne de `N.pal.L` sur le tampon) ≥ 0,075 / 0,085 / 0,095 / 0,075 ; décor seul (code 8 du masque) entre 18 et 28 % ; part lumineuse à t = 30 s au moins égale à celle de SNAKE 2030 au même instant, même profil ; vide < 30 % ; 0 cyan dans le décor ; magenta et rose pâle du décor < 0,5 % ; gaine des menaces sur 100 % de leurs pixels de bord | scènes `calme`, `montee`, `chaos`, `colosse`, et 10 captures par état des parties du pilote bon (médiane) |
| R-12 | Explosion | mort du CYCLOPE et des élites : brasier > 8 % pendant au moins 4 images, caméra ≥ 6 px | captures |
| R-13 | Photosensibilité | au plus 3 flashs par seconde au-delà du seuil, sur la minute la plus chargée (G-29, V-19) | analyse image par image |
| R-14 | Budgets d'effets | au plus 12 % d'images secouées ; au plus une bannière toutes les 10 s hors CYCLOPE | partie complète |
| R-15 | Rythme | vagues nommées et annoncées ; respirations (G-17) ; pics croissants ; un pic connu en V3, V4 et V5 (G-07) | journal |
| R-16 | Progression dans la partie | 10 ± 2 cartes par partie gagnée ; au moins 4 pour une mort en V3 ; première carte à la fin de V1 dans 100 % des parties ; 3 défis et un défi par vague annoncés | pilotes |
| R-17 | Mort mise en scène | séquence de 1,3 s (gel, cause entourée, désintégration, coupure de la musique) ; écran de fin ≤ 1,5 s après l'impact ; relance possible en moins de 2 s | chronométrage |
| R-18 | Écran de fin | cause, quartier, progression, écart, build, record, défis, note, conseil, prochain déblocage, initiales si top 10, CONTINUER ? une fois | captures |
| R-19 | Attraction (P3) | démo jouée après 15 s d'inaction, galerie, records, invitation | chronométrage |
| R-20 | Performance | p95 ≤ 11 ms en iPhone 13 paysage ×1, **qualité adaptative coupée**, sur les scènes `charge`, `v5` et `vol`, parallaxe complète, et meilleur que `snake2030` dans la même fenêtre ; au profil processeur ×4, p95 ≤ 25 ms avec la qualité adaptative et aucune perte de temps de jeu ; sur le vrai iPhone de la propriétaire, p95 ≤ 16,7 ms lu sur `?perf=1` aux deux jalons | banc, jalons |
| R-21 | Zéro erreur | `__ERR.count = 0` et console vide sur 3 profils × 8 pilotes × 5 graines, plus 50 graines en paysage, plus les rotations, la pause, la coupure du son et la suspension | journal |
| R-22 | Commandes | J-01 à J-06 tenues, J-07 au sens du § 0.3 ; une image de latence ; accélération droit devant et coupure en virage ; gestes du second doigt fiables (critères du lot 1) | CDP |
| R-23 | Un pouce | le secteur se gagne en ne faisant que diriger, sans second doigt ni accélération : pilote expert ≥ 15 % des graines ; avec ACTIONS AUTO et la poussée droit devant : ≥ 35 % | pilote |
| R-24 | Portrait et paysage | jeu complet dans les deux sens ; tête hors du quart bas sur au moins 95 % des images en portrait | captures |
| R-25 | Musique de la propriétaire | jouée en jeu, calée sur la mesure, jamais redémarrée au début après une mort ; repli génératif sans trou | journal audio |
| R-26 | Mixage | cibles du § 5.7 ; sons au-dessus de la musique ; ≥ 25 % d'énergie au-dessus de 400 Hz | rendu hors ligne |
| R-27 | Jouable sans le son | chaque signal sonore utile a son signe visuel (liste du § 5.8, vérifiée sur captures) | captures |
| R-28 | Mouvement réduit | `prefers-reduced-motion` : caméra et plans immobiles à la mort d'une élite, jeu complet, lumière gardée | captures |
| R-29 | Pause | arrière-plan pendant 10 s en plein chaos : même état, aucun dégât, son revenu en moins de 1 s | CDP |
| R-30 | Rejouabilité | deux parties de même graine et mêmes entrées donnent le même journal, en mode dessiné comme en mode simulé ; une partie de graine différente donne une suite de vagues différente dans le détail (positions, côtés, voies) | journal |
| R-31 | **Le plateau se déplace** | arène en mouvement pendant au moins 25 % du temps des vagues 2 à 5 (pilote bon) ; TRAVELLING en V2, V3 et V5 ; 5 VOLS par partie gagnée ; au moins 4 convois en V4 ; 0 mort par un mur mobile sans son annonce | journal |
| R-32 | **Variété** | 7 quartiers distincts (masques de cité deux à deux d'intersection sur union < 0,5) ; avant le CYCLOPE, aucune fenêtre de 60 s de jeu sans une première fois (nouvel ennemi, nouvelle mécanique ou nouveau quartier) dans la partie du pilote bon | journal, captures |
| R-33 | **Gestes sûrs** | recentrages humains : 0 action involontaire ; slalom serré : 0 accélération ; 20 sur 20 pour chaque geste du second doigt ; 50 balayages par bord : 0 navigation (critères du lot 1) | CDP |
| R-34 | **LASSO jouable** | pilote humain : au moins 50 % des lassos tentés réussis jusqu'à 20 segments, 40 % de 30 à 40 ; lassos par minute à 30-40 segments ≥ 0,8 fois ceux à 8-20 | pilote |
| R-35 | Relance | REJOUER rend le serpent en moins de 2 s, sans briefing ; V1 dure au plus 24 s (médiane, pilote bon) | chronométrage |
| R-36 | **Raison de revenir** | énergie et prochain déblocage sur 100 % des écrans de fin ; premier déblocage à la partie 1 ou 2 du pilote bon, dernier entre la 12ᵉ et la 25ᵉ ; défis du jour qui changent avec la date ; défi de vague annoncé à chaque vague | pilotes enchaînés sur un profil |
| R-37 | Lisibilité de l'arsenal | captures de V5 au build maximal : cyan et cyan pâle hors tête et corps ≤ 8 % ; tête reconnaissable sur 100 % des captures (pixels de la tête identiques au sprite, gaine complète) ; 0 pixel de l'arsenal à moins de 3 px du contour de la tête | masque, captures |
| R-38 | Verdict de la propriétaire | aux JALONS A et B, ses réponses sont recopiées et chaque « non » a reçu une correction ou une raison écrite avant la phase suivante | `RETOURS-PROPRIETAIRE.md` |

### 8.6 L'ordre d'assemblage et la non-régression

1. **Lot 0a**, seul, puis **lot 0b**. Rien ne démarre avant que le bundle de squelettes tourne avec zéro
   erreur et que les tests de contrat passent.
2. **Phase 1** : lots 1, 2, 3a, 4a, 5a, 6a, 7a en parallèle, chacun dans sa copie.
3. **Intégration A** par le lot 9 : 1 → 6a → 2 → 3a → 4a → 5a → 7a. Deux juges, puis le **JALON A**.
4. **Phase 2** : lots 3b, 4b, 5b, 6b, 7b, 8, P en parallèle, chacun dans sa copie, après le verdict.
5. **Intégration B** par le lot 9 : 4b → 6b → 3b → 5b → 8 → 7b → P.
6. **Réglage** des chiffres de `N.R` avec les pilotes gelés, en mode simulé, sur 50 graines ; la batterie
   complète R-01 à R-38 ; le rapport `refonte/assemblage.md`. Puis le **JALON B**.
7. **Lot 10, le jury.** Puis une boucle de corrections par les lots propriétaires et un nouveau jury de
   juges neufs, jusqu'à ce que toutes les notes soient ≥ 8 et qu'aucun critère R bloquant ne reste en échec.

**La batterie de non-régression** (`tools/nonreg/`) tourne **après chaque intégration**, et un échec
bloque l'intégration suivante : `node build.mjs` ; zéro erreur sur les 3 profils en fumée de 60 s ; tests
de contrat ; R-01, R-02, R-03 ; R-21 sur 5 graines ; coût p95 de la scène `charge` (pas plus de 0,5 ms de
plus que l'intégration précédente) ; recherche des interdits (`Math.random`, `N.rnd` dans le code neuf,
couleurs littérales, `Date.now`) ; `fumee.mjs` et `cadence.mjs`.

---

## 9. La campagne qui s'en déduira

Le prototype est construit **piloté par les données** : rien de propre au secteur 1 n'est écrit en dur
hors de `N.R.secteurs[0]`, des quartiers de `N.R.decor` et des modules de règles d'arène. Un secteur de
campagne se définit ainsi :

```
N.R.secteurs[n] = { nom, consigne (3 lignes), quartiers:[…], decor:{etats, lut, plans (illustrations), soleil, cite},
                    bestiaire (types permis), elites, modificateurs, formations, vagues[], vols[], etapeBonus,
                    regleArene (module), colosse:{variante, phases[]}, musique:{piste.json, sections},
                    defis[3] }
```

| Secteur | Nom | Règle d'arène (reprise de 2030, rendue « règle » et non décor) | Ennemis introduits | Modificateurs | Boss |
|---|---|---|---|---|---|
| 1 | LA GRILLE (le prototype) | murs mortels, TRAVELLING, CONVOIS et SILLAGE, PASTILLE et INVERSION ; LE VOL et LE DÉFILÉ | flèche, dard, larve, mine, tourelle, lame, ruche, sentinelle, RIVAL, planeur, TRAQUEUR | BLINDÉ, RAPIDE, INSTABLE | LE CYCLOPE, 3 phases |
| 2 | AUTOROUTE NÉON | réseau de voies sur tout le monde, carrefours, contresens annoncés ; le SILLAGE devient une chaîne | voleur, intercepteur en voies | + SAUTEUR | LE CYCLOPE aux deux lames (ciseaux, convois lancés) |
| 3 | ZONE MAGNÉTIQUE | attracteurs et répulseurs qui **capturent** et font **fronde** ; anneaux qui convergent ou divergent (jamais cyan ni ambre) ; les Fugitifs à sauver sur le radar (Defender) | tique, brouilleur, Ravisseur | + GARDE, RÉGÉNÈRE | NOYAU MAGNÉTIQUE, ancré, polarité inversée et annoncée |
| 4 | SURTENSION | carrefour des voies et des champs ; événements COUPURE et PLUIE DE MINES ; le Capteur et le serpent jumeau (Galaga) | miroir, tour tournante, Capteur | couples de modificateurs | rotation de 3 phases |
| 5 | LE NOYAU | tout, avec des événements cumulés ; phase GRILLE (Snake classique, virages en file sans attente, traînée Tron qui tue les ennemis) ; RIVAUX en meute | faucheur | tous | LE CYCLOPE final : une phase de chaque boss, puis une finale |

**Comment on passe du prototype à la campagne** :

- **Les niveaux.** Une **vague du prototype devient un niveau de campagne** de 2 min 30 (calme, montée,
  pic, répit, apogée, purge). Un secteur devient un chapitre de 4 niveaux plus un niveau de boss : 25
  niveaux et environ 1 h 06 de jeu, comme le propose `recherche/game-design-campagne.md`. LE VOL relie les
  niveaux, LE DÉFILÉ revient tous les trois niveaux.
- **La sauvegarde** se fait à chaque fin de niveau et à l'entrée de chaque boss (G-08), avec
  `navigator.storage.persist()` et un code d'export (V-40).
- **La construction** dure un chapitre. Les cartes sont sauvegardées à chaque niveau.
- **Les modes.** SURCHARGE (G-10) est déjà livré par le prototype pour le secteur 1 : vitesse × 1,12,
  densité × 1,3, score × 1,5, palettes qui tournent d'un quartier à l'autre, ouvert par la victoire. Les
  défis du jour deviennent le niveau du jour (graine `S.jour`, G-09). Les styles ouverts par l'énergie et
  les étoiles (G-04, G-25) s'étendent, et l'aide est proposée après 3 morts (G-18).
- **La musique.** Chaque secteur reçoit un morceau Suno de la propriétaire à **144,6 BPM** (ou 72,3 en
  demi-tempo), structuré en INTRO, PLATEAU, RESPIRATION, RETOUR et OUTRO. Il est découpé par le même outil
  et joué par le même séquenceur. `SUNO.md` sera réécrit dans ce sens par le lot 7b à la fin du prototype.
- **Les images.** Chaque secteur a ses quartiers et, si besoin, de nouveaux panneaux générés puis convertis
  comme ceux d'`art/`. Les entractes à la Pac-Man (4 à 6 s, muets, sautables) se placent entre les
  chapitres.

---

## Annexe — Un mot pour une seule chose

| Mot | Sens unique |
|---|---|
| VAGUE | un acte d'un secteur (5 par secteur) |
| QUARTIER | le décor d'une vague : cité, structures, lumière, table de couleurs |
| VOL | les 4 s de vue de poursuite entre deux vagues, vers le quartier suivant |
| PLONGÉE | la descente de la caméra dans le monde, au départ d'une partie |
| DÉFILÉ | l'étape bonus de 40 planeurs, entre V3 et V4 |
| TRAVELLING | l'arène qui voyage à travers le monde, mur arrière en tête |
| CONVOI | le train de wagons qui balaie une voie annoncée |
| SILLAGE | la zone derrière un convoi où l'accélération est gratuite |
| PASTILLE | l'objet jaune qui déclenche l'INVERSION |
| INVERSION | les quelques secondes où la tête dévore les ennemis |
| RIVAL | le serpent magenta, élite de V4 |
| RÉPIT | la respiration sans attaque entre les phases du CYCLOPE |
| PIC | le moment d'élite annoncé dans une vague |
| NETTOYAGE | les 2,5 s de bonus à la fin d'une vague |
| PURGE | tout explose en chaîne : fin du CYCLOPE, et les 2 derniers ennemis d'une vague |
| LASSO | encercler pour faire exploser ce qui est dedans |
| APOGÉE | l'ultime de la joueuse |
| POUVOIR | TRAVERSÉE, RALENTI ou REPLI |
| TRAQUEUR | l'ennemi qui punit l'attente |
| SURCHARGE | le mode rejoué plus vite après la victoire, et rien d'autre |
| SECTEUR | le niveau complet du prototype ; un chapitre en campagne |
| CHAÎNE | les destructions enchaînées ; MULTIPLICATEUR est ce qu'elle donne |
| ÉNERGIE | le total persistant des cellules ramassées et des primes, qui ouvre les déblocages |
| GARDIEN | l'agent qui possède le contrat pendant les phases 1 et 2 |
| JALON | une partie jouée par la propriétaire sur son iPhone, dont le verdict passe avant la suite |

---

## Réponses aux critiques

La première version de ce plan a été relue par deux relecteurs indépendants. Le premier jugeait le jeu
(6,5 sur 10), le second l'intégration, la mesurabilité et la performance (6 sur 10). Chaque point est repris
ci-dessous avec ce qui a été fait, ou pourquoi cela n'a pas été fait.

### Première relecture : le jeu (6,5 sur 10)

**Les bloquants**

1. **« Triste » : le plan inscrivait le sombre dans ses critères.** *Fait.* Le plafond de luminance de
   l'ancien R-11 devient un plancher. Au moins 25 % de pixels de luminance supérieure à 0,10 dès t = 1 s, et
   une part qui monte avec l'état : 25, 28 puis 32 %. S'y ajoutent une luminance moyenne minimale et une
   comparaison avec SNAKE 2030 au même instant (§ 5.2, R-11). La luminance de chaque encre est fixée au
   § 5.1, pour que la formule soit sans ambiguïté. Le soleil retrouve sa signature : 80 px de diamètre,
   bandes jaune, ambre et brasier (§ 3.4). Le décor se tait par la forme et par le contour : gaine de nuit
   profonde autour de tout ce qui joue, y compris la tête et le corps ; couleurs vives tramées hors du
   soleil ; rien de brillant ne bouge vite dans le décor. Le décor seul est borné à 28 % de pixels
   lumineux, pour que le jeu reste devant.
2. **« Reprendre la majeure partie de SNAKE 2030 » n'était pas tenu dans ce qu'elle jouera.** *Fait.*
   Trois ajouts répondent à ce qui surprenait dans 2030.
   - Le changement d'ambiance : chaque vague a son quartier, avec sa cité, sa lumière et ses couleurs, soit
     sept en tout (§ 3.6).
   - La bascule en perspective : LE VOL, une plongée de 4 s en vue Space Harrier entre deux vagues, en
     primitives à rayon entier, comme proposé (§ 3.9).
   - Les convois : ils reviennent en V4 et V5, annoncés, et récompensés par le SILLAGE (§ 4.6).

   Le secteur 1 a maintenant des règles d'arène (§ 9). Deux parties diffèrent par les voies, les côtés et
   les positions ; le critère R-32 exige une « première fois » au moins toutes les 60 s avant le boss. Les
   champs magnétiques et la surcharge à cycles restent pour plus tard : la surcharge revient sous la forme
   du mode SURCHARGE, les champs au secteur 3. Un système nouveau à la fois (G-05).
3. **« Le plateau qui se déplace » n'était pris qu'au sens faible.** *Fait.* Le TRAVELLING fait voyager
   l'arène dès la vague 2 (vers 0:44), puis en V3 et V5. Son mur arrière, mortel, avance, coupe le corps
   qui traîne et emporte le butin oublié : c'est l'idée P3 de l'étude (§ 4.6). R-31 exige que l'arène soit
   en mouvement au moins 25 % du temps des vagues 2 à 5.
4. **Conflit entre virer fort et accélérer.** *Fait, avec une autre solution que le second doigt seul.*
   L'accélération au pouce exige une poussée **droit devant**, cap visé à moins de 15° du cap réel pendant
   120 ms. Elle se suspend dès que l'écart dépasse 30°, quel que soit le déclencheur (§ 2.2). Un virage
   serré crée toujours un écart : il ne peut donc ni déclencher l'accélération, ni la subir. Le second doigt
   tenu accélère aussi. J'ai gardé la poussée au pouce, parce que J-07 et J-08 veulent un jeu jouable d'une
   seule main. Critère : 0 accélération sur un slalom serré scripté (lot 3a, R-33).
5. **Faux déclenchements des touchers brefs.** *Fait.* Le pouvoir et l'APOGÉE passent au second doigt,
   et seul un doigt posé alors que le manche est tenu depuis 150 ms peut agir (§ 2.16). Le pouce du
   manche ne déclenche jamais rien d'autre que la direction. Une différence avec la proposition : l'APOGÉE
   se déclenche par un **glissé** du second doigt, et non par un toucher à deux doigts. En paysage, la main
   droite tient le téléphone et n'a qu'un pouce libre. Le double toucher et l'attente de 250 ms
   disparaissent. Pour la joueuse qui joue d'une main, le réglage ACTIONS AUTO déclenche pouvoir et
   APOGÉE à sa place. Le test des recentrages humains est repris tel quel : 0,5 à 3 s, 30 % de moins de
   200 ms, et en plus un second doigt qui se pose pendant un recentrage (lot 1, R-33).
6. **Aucun essai de la propriétaire avant la fin.** *Fait.* Le JALON A arrive après une tranche verticale
   jouable : moteur, image, décor, joueuse, deux bestiaires, deux vagues et la piste, avec parallaxe, mort,
   mur, lasso, TRAVELLING et INVERSION. **La phase 2 ne démarre qu'après son verdict.** Le JALON B, sur le
   secteur complet, précède le jury. Ses réponses sont recopiées dans `RETOURS-PROPRIETAIRE.md`, et chaque
   « non » doit recevoir une suite écrite (§ 8.4, R-38).
7. **Le LASSO devenait injouable au doigt quand le serpent grandit.** *Fait, point par point* (§ 2.12) :
   - la traînée dure 1,2 s + 0,02 s par segment ;
   - la tolérance de fermeture passe à 7 px ;
   - les trois derniers segments ferment au lieu de mordre ;
   - le critère se mesure sur un nouveau pilote « humain » (120 ms de réaction, ± 10° d'erreur), avec un
     taux de réussite par tranche de longueur et un rapport long/court des lassos par minute (R-34).

   La fenêtre s'élargit donc avec la longueur.

**Les améliorations**

1. **Serpents-rivaux et chasse inversée.** *Faits tous les deux.*
   - LE RIVAL est l'élite de V4. Il suit la règle de la joueuse, sa traînée tue, et il meurt en s'écrasant,
     notamment sur le corps de la joueuse (§ 4.4).
   - La PASTILLE et l'INVERSION ont lieu une fois par vague, de V2 à V5, avec une durée qui décroît de 6 à
     4 s (§ 2.17).

   Les Fugitifs et le Capteur vont à la campagne, comme suggéré (§ 9).
2. **Donner un sens à l'énergie.** *Fait.* Cinq déblocages ouvrent dans l'ordre proposé : RALENTI, REPLI,
   styles de traînée, galerie du codex, départ en V3. L'écran de fin montre « PROCHAIN DÉBLOCAGE … DANS N »
   avec sa barre (§ 5.6, R-36). Une seule adaptation : la « couleur de traînée » devient un **style** de
   traînée, parce que le cyan reste réservé à la joueuse et qu'aucune autre encre ne peut la dessiner.
3. **Faire tourner les défis.** *Fait.* FINIR reste fixe ; les deux autres sont tirés chaque jour dans une
   réserve de douze, et chaque vague a son défi annoncé à l'entrée (§ 2.14).
4. **Rendre la mort plus coûteuse en build.** *Fait.* La meilleure arme perd un palier à chaque mort,
   jamais sous le palier I, et une étiquette le montre (§ 2.4).
5. **Resserrer la vague 1.** *Fait.* Elle dure 22 s ; la NUÉE arrive à +10 s, deux mines à +14 s et une
   pince de dards à +17 s, soit une première menace avant 0:20. La cible du pilote bon devient « au moins un
   coup reçu en V1 dans 40 % des graines » (§ 4.2, § 4.10).
6. **Limiter CONTINUER.** *Fait.* Une seule fois par partie. La vie bonus passe aussi de deux à une
   (à 80 000 points), avec quatre vies au plus (§ 2.4).
7. **Ne pas faire rejouer l'éveil en entier.** *Fait en partie.* REJOUER saute le titre et le briefing,
   et la vague 1 ne dure plus que 22 s (R-35). Le départ en V3 est un déblocage. Je n'ai pas retenu le
   départ automatique au dernier palier atteint : il retirerait la montée qui apprend le jeu, et le
   CONTINUER à l'entrée de la vague en cours en tient déjà lieu une fois par partie.
8. **Davantage de cartes pour la joueuse moyenne.** *Fait.* Une carte est garantie à chaque vague
   nettoyée, en plus des montées d'XP, et regroupée sur le même écran. La première carte tombe à la fin de
   V1, vers 0:24. Cibles : 10 ± 2 cartes pour une partie gagnée, au moins 4 pour une mort en V3 (§ 2.7,
   R-16). Je n'ai pas avancé la première carte à 20 s : la vague 1 se termine à 22 s, et une carte en
   pleine vague violerait la règle « jamais de choix au milieu de l'action ».
9. **Critères de lisibilité des armes.** *Faits tels quels* : au plus 8 % de cyan hors tête et corps, tête
   reconnaissable dans 100 % des captures de V5 au build maximal. S'y ajoutent trois règles de dessin
   (tirs fins, silence de 3 px autour de la tête, tête dessinée en dernier) (§ 2.8, R-37).
10. **Gestes système d'iOS.** *Fait* : `touch-action`, `overscroll-behavior`, écouteurs non passifs,
    origine du manche à 20 pt des bords, et test de 50 balayages par bord (§ 2.16, R-33). Une réserve, dite
    franchement : aucune page web ne peut différer le geste de la barre d'accueil. On le contourne en ne
    plaçant ni interface ni apparition dans la bande du bas.
11. **Réduire le périmètre au profit de l'effet.** *Fait sous forme de priorités écrites* (§ 0.4) : P1
    l'effet, P2 la profondeur, P3 l'écrin. La voix, le mode attraction, la galerie et la saisie des
    initiales à la manette passent en P3 et se coupent en premier. Je n'ai pas réduit le nombre de cartes ni
    de verbes. Les 19 cartes donnent déjà dix fois moins que les 53 de 2030. Les verbes sont désormais
    séparés par des gestes distincts, et le jeu se gagne en ne faisant que diriger. J'ai même ajouté du
    contenu (VOL, TRAVELLING, convois, INVERSION, RIVAL, DÉFILÉ), parce que ce sont des réponses aux
    bloquants 2 et 3 et aux retours de la propriétaire. La phase 2 n'est engagée qu'après son verdict sur la
    tranche.
12. **Le décor sent l'action, et une étape bonus remplace le répit passif.** *Fait.* Fenêtres qui
    s'allument à chaque élite, éclair à chaque APOGÉE, débris et braises au chaos (§ 3.6, § 5.2). LE DÉFILÉ
    remplace le RÉPIT entre V3 et V4 : 40 planeurs qui ne tirent pas, PARFAIT pour 40 sur 40 (§ 4.7).

### Seconde relecture : intégration, mesure et performance (6 sur 10)

**Les bloquants**

1. **B1, pas de contrat des événements.** *Fait.* `N.ev` a un émetteur unique par événement et des
   consommateurs rangés par rang fixe. Une file reçoit les événements émis pendant un envoi. Le tableau
   couvre dix-neuf événements, dont kill, coupe, mort, ramassage, lasso, niveau, vague, phase et défi. Un
   exemple déroule un kill de bout en bout (§ 7.4). Le lot 0a teste l'ordre et l'unicité (§ 8.3).
2. **B2, schémas non figés.** *Fait.* Les schémas d'un ennemi, d'un tir, d'une source, d'un télégraphe, de
   la mort, de `S.player` et de `N.cartes.mods` sont figés (§ 7.5). Les listes d'identifiants (ennemis,
   armes, cartes, causes, états, sections, quartiers, défis, déblocages, sons, scènes) sont figées aussi,
   avec `N.ids.texte(cause, auteur)` pour « TIR DE TOURELLE ». Les sprites se demandent par
   `N.spr.get(nom, dir, img)` et passent par un catalogue. Le lot 0a livre des validateurs.
3. **B3, passifs sans propriétaire.** *Fait.* `N.cartes.mods` a un seul écrivain. Le tableau du § 2.9 dit,
   pour chaque carte, le champ et le module qui l'applique : GRAPPE dans `74-arsenal`, en consommateur de
   `kill` ; SANG-FROID dans `77-score`, en consommateur de `coupe` ; ÉPERON, BOUCLIER, BRAISE, RÉPARATION et
   CROISSANCE dans `70-joueuse` ; AIMANT dans `71-butin`. Le chemin de `choisir(id)` passe par l'événement
   `carte`.
4. **B4, modèle du temps ambigu.** *Fait*, sur les cinq points (§ 7.2) :
   - le gel se compte en secondes de temps réel ;
   - pendant un gel, dtMonde = dtJoueuse = 0, et la règle « × 0,08 » disparaît ;
   - `dtJoueuse` se lit dans `N.horloge` ;
   - `S.t` est en secondes ;
   - surtout, une **grille musicale de jeu** dérivée du temps de jeu cadence les apparitions et le sol.
     `N.music.beat()` ne sert plus qu'aux effets visuels.

   Le squelette de `03-socle.js` est complet dès le lot 0a, donc identique à la version finale.
5. **B5, hasard non cloisonné.** *Fait.* `N.rng(nom)` fournit treize flux nommés, en deux familles (jeu et
   cosmétique). L'attraction a ses propres flux, et `N.rnd` est interdit dans le code neuf (§ 7.3). Un test
   vérifie que tirer dans un flux ne change pas un autre.
6. **B6, un seul arbre de travail.** *Fait.* Chaque lot a son `git worktree`, créé par
   `tools/lots/worktree.sh`, et construit sa page d'essai dans sa copie. L'orchestrateur copie ensuite les
   fichiers livrés dans l'arbre d'intégration (§ 8.1).
7. **B7, plusieurs propriétaires des écrans, et `79-jeu` sans propriétaire.** *Fait.* Le tableau des états
   (§ 7.6) dit, pour chacun, qui met à jour, qui dessine, qui lit les entrées, si l'horloge avance et quelle
   section joue. `N.game.etat()` fait foi et `S.phase` disparaît. Seul `79-jeu` appelle
   `N.music.section`. `79-jeu` a un propriétaire pendant toute la phase parallèle : le gardien.
8. **B8, l'ordre de dessin ne permettait pas la mort.** *Fait.* Un crochet de mort a été ajouté : remappage
   du tampon, puis joueuse et cause redessinées. `N.fx.drawEcran()` dessine en espace écran (§ 7.7).
9. **B9, critères infaisables ou sans formule.** *Fait.*
   - (a) Le trajet visible devant devient min(1,2 s × v, d_mur + 16) en croisière et
     min(0,8 s × v, d_mur + 16) en accélération. J'ai vérifié qu'il tient avec les avances de caméra
     imposées (§ 3.3).
   - (b) Le masque de propriété `dbg.masque()` existe et il est livré par le lot 1 (§ 7.12).
   - (c) Les formules sont écrites : luminance WCAG par encre (§ 5.1), encres lumineuses, silhouettes par
     intersection sur union inférieure à 0,6, paliers distincts à 10 % de pixels de l'arsenal, jointure du
     titre par classes de luminance rangée par rangée.
   - (d) Chaque critère est marqué [U] (vérifiable seul) ou [I] (d'intégration), et les critères qui
     dépendaient d'autres lots sont passés en [I].
10. **B10, pas de format de journal.** *Fait.* `N.journal(type, données)` est un anneau horodaté au pas. Le
    § 7.9 donne la liste des types, de leurs champs et de leur écrivain, et les scripts de `tools/mesure/`
    sont écrits contre ce format.

**Les améliorations**

1. **Scinder le lot 0, puis garder un gardien.** *Fait.* Le lot 0a écrit le contrat et les tests
   comportementaux ; le lot 0b écrit les squelettes et répartit `70-game.js`. Le gardien reste en poste
   pendant les phases 1 et 2, avec un contrat versionné et `demandes.md` traité au fil de l'eau (§ 8.1,
   § 8.3).
2. **Une intégration intermédiaire.** *Faite* : l'intégration A et la tranche du JALON A, au premier tiers
   (§ 8.6). Elle est plus large que la proposition (FLÈCHE, CANON, mur, décor, son), parce qu'elle sert aussi
   au verdict de la propriétaire.
3. **Schéma des réglages et `mute` par canal.** *Fait* : `S.reglages`, le module qui applique chaque ligne,
   `N.music.mute('musique' | 'effets', bool)`, et un seul écrivain de la persistance (`77-score`, clé
   `snake2975.v1`) (§ 7.10).
4. **Compléter `S.input`.** *Fait* : `valider`, `retour`, `chiffre`, `car`, boutons de la souris, manette
   lue dans `90-boot`, taps et gestes horodatés avec leur doigt, règle de consommation (§ 7.8).
   L'incohérence entre le double toucher et l'attente disparaît avec le double toucher lui-même. Le
   classement des gestes se fait dans `90-boot`, la décision de déclencher dans `70-joueuse` (§ 2.16).
5. **Conflit du manche entre virage et accélération.** *Fait*, voir le bloquant 4 de la première relecture.
   Le critère « 0 accélération involontaire sur un parcours de virages serrés » est repris (lot 3a, R-33).
6. **Budget de performance global, par image.** *Fait* : 11 ms au p95 au profil ×1, poste par poste,
   double pas compris (§ 7.11). R-20 doit tenir **sans** qualité adaptative ; celle-ci est réservée au
   profil ×4.
7. **Trois mesures de M5.** *Faites* : `skipScale` qui saute toute la composition, toile de sortie
   plafonnée, tables préallouées et pic de 563 ms traqué, monde non dessiné sous les cinématiques plein
   écran (§ 7.11). Une précision : la toile du bureau est plafonnée à un **facteur entier** du tampon, et non
   à 1 280 px exactement. Sinon le navigateur agrandirait d'un facteur non entier, et les pixels ne seraient
   plus des carrés identiques, ce que `DIRECTION.md` interdit.
8. **Une mesure sur un vrai iPhone.** *Faite* : `?perf=1`, `?scene=charge`, et le chiffre relevé par la
   propriétaire aux deux jalons. La marge en émulation est de p95 ≤ 11 ms (§ 7.12, R-20).
9. **Des scènes de référence communes.** *Fait* : dix-sept scènes dans `dbg.scene(nom)`, dont toutes celles
   proposées (§ 7.12).
10. **Un mode accéléré sans dessin.** *Fait* : `dbg.simuler(secondes)` et `?nodraw`. Une partie coûte
    environ 10 s de calcul, et une passe complète environ une heure (§ 4.10, § 7.12). Un critère vérifie
    que le journal est le même qu'en mode dessiné.
11. **Geler les pilotes, les sortir du lot 1, classer les cibles, 50 graines.** *Fait.*
    - La spécification des pilotes est gelée au lot 0a, et les pilotes forment un lot à part (P), en
      phase 2.
    - Le lot 9 règle `N.R`, jamais les pilotes.
    - Chaque cible est classée bloquante ou indicative, avec les paramètres qui la règlent.
    - Les proportions se mesurent sur 50 graines.

    Un pilote « humain » s'ajoute (§ 4.10).
12. **Petites incohérences.** *Toutes levées* :
    - indices en base 0, tête comprise ;
    - huit pilotes partout ;
    - règle « un seul fichier » amendée explicitement (§ 0.2) ;
    - tête retenue sur la limite pendant la grâce au mur (§ 2.3) ;
    - `S.t` en secondes ;
    - image de retard de la caméra dite et couverte par la marge de 24 px (§ 3.3).
13. **Précisions audio.** *Faites* (§ 5.7, § 5.8) :
    - `MUSIQUE_BASE` est écrit par `build.mjs` relativement au fichier produit ;
    - le génératif est recalé sur chaque bloc ;
    - la fusion `salve` des tourelles et des drones est plafonnée à 8 par seconde ;
    - si le tempo n'est pas constant, on coupe sur les barres détectées et chaque bloc porte sa durée de
      mesure.
14. **Preuve que les acquis survivent, et non-régression après chaque intégration.** *Fait* : `fumee.mjs`
    et `cadence.mjs` passent sur les squelettes (lot 0b). La batterie `tools/nonreg/` tourne après chaque
    intégration et bloque la suivante en cas d'échec : zéro erreur, R-01, R-02, R-03, R-21, coût p95 et
    interdits (§ 8.6).

