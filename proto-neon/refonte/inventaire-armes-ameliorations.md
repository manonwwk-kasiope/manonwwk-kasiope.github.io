# Inventaire SNAKE 2030 — les armes et les améliorations

Domaine : `snake2030/src/23-weapons.js` (1 936 lignes) et `snake2030/src/24-upgrades.js` (818 lignes),
**lus en entier**. Pour suivre chaque drapeau de carte jusqu'à son effet réel : les passages qui les lisent
dans `10-core.js` (boost, dégâts, morts en chaîne, auras, butin, XP), `22-enemies.js` (butin, brouilleur,
blindages, parasites), `25-levels.js` (récompense de boss), `26-ui.js` (cartes, boutique, écran de fin),
`27-phases.js` (pouvoirs) et `90-boot.js` (montée de niveau, ultime, remise à zéro, sauvegarde). Mesures
historiques : `snake2030/docs/audit-2026-09.md`. Côté SNAKE 2975 : `DIRECTION.md`, `CONTRAT.md`,
`REPRISE.md`, les trois recherches, `src/70-game.js` lu en entier, les interfaces de `src/50-fx.js`,
`src/30-music.js`, `src/10-gfx.js` et `src/40-sprites.js`, et `refonte/RETOURS-PROPRIETAIRE.md`.

**Méthode.** Les chiffres viennent du code tel qu'il est aujourd'hui (lignes citées). Les DPS sont des
valeurs **nominales calculées** depuis les tables (cible unique, sans perforation, zone, critique ni carte),
pas des mesures en jeu. Les fréquences de cartes viennent de **20 000 tirages** exécutés dans un bac à sable
Node qui charge `24-upgrades.js` sans le modifier. Les mesures « audit » datent de septembre 2026 ;
plusieurs cartes ont été corrigées depuis (le code le dit en commentaire) : elles sont citées comme
historiques. Ce qui est marqué *proposition* est une piste, pas une décision. Les défauts marqués
*d'après le code* ont été trouvés à la lecture, pas observés en jeu.

**Unités.** u = unité monde de 2030 (la vue fait ≈ 780 u de haut). px = pixel de jeu de 2975 (iPhone 13,
px = 2 : tampon 422 × 195 en paysage, 195 × 422 en portrait). Le petit côté de l'écran (195 px) porte les
780 u de 2030 : **1 px ≈ 4 u**, rapport utilisé pour toutes les conversions (l'inventaire du cœur,
`inventaire-coeur.md`, donne 3 à 4 u ; c'est le même ordre de grandeur).

**Noms.** Les noms de cartes sont ceux que la joueuse voit (`24-upgrades.js`). Les commentaires de
`10-core.js` en emploient d'autres pour les mêmes drapeaux : GLOUTON = NANITES, TRANSE = PHASE,
SAVOIR = ANALYSE, RONCES = ÉPINES, ÉCHAPPÉE = DÉSYNCHRO, SURSIS = DILATATION, BLINDAGE = CITADELLE,
TEMPS MORT = AMORTISSEURS, ÉLAN = INERTIE, SPECTRE = MARCHE DU VIDE.

---

## 1. L'essentiel

- **Un arsenal entièrement automatique** : huit armes, six paliers chacune (cinq plus un palier ULTIME),
  qui couvrent chacune une direction autour d'un serpent qui ne s'arrête jamais : devant (canon), les
  flancs (tourelles), derrière (sillage, mines), autour (drones, onde de choc), à distance et à la
  poursuite (arc, missiles). « Le talent est dans le placement et la trajectoire » (23-weapons.js:5-6).
- **Le serpent porte ses armes** : tourelles posées sur les segments (leur nombre suit la longueur,
  jusqu'à 18), drones en orbite, sillage et mines à la queue, rayon qui part de la tête.
- **53 cartes** sur sept axes et quatre raretés (20 communes, 20 rares, 8 épiques, 5 ultras), trois par
  montée de niveau ; la première main garantit une carte de survie, le boss abattu donne une main de
  trophée.
- **Les meilleures idées sont propres au serpent** : boucler sa trajectoire fait détoner tout ce qui est
  dedans (ENCERCLÉ) ; le corps absorbe les tirs au-delà du 8e anneau et nourrit le boost ; percuter en
  boost déchire ; toute mort peut exploser en chaîne ; le corps entier peut devenir une lame (ÉPINES).
- **Mais le vivier ment** : 13 textes de carte sur 53 ne disent pas ce que fait la carte (3 la
  sous-vendent), DÉPHASAGE double DÉSYNCHRO, trois cartes électriques nourrissent le même compteur, un
  bogue efface AGILITÉ, DILATATION annule le ralenti de l'ultime.
- **Le tirage étouffe les constructions** (×0,12 pour une troisième carte du même axe dans une main) ;
  les épiques font 1,6 à 3 % des cartes offertes, les ultras presque 0 % ; six paliers, c'est trop long
  (l'audit mesurait une arme au palier ultime dans 9 % des parties).
- **Les écarts de puissance sont énormes** : 5,7 DPS pour MISSILES 1, 900 pour TOURELLES 6 sur un long
  corps ; certains paliers « ultimes » sont à peine meilleurs que le précédent (canon : 100 → 105).
- **La progression entre parties est plate** : six bonus achetables (1 780 crédits au total), aucun
  contenu nouveau.
- **SNAKE 2975 n'a rien de tout cela** : une seule arme dont seule la longueur change le motif (1, 2, 3
  puis 5 tirs), aucune décision, aucun pouvoir, aucune monnaie ; 50-fx et 30-music n'ont ni les effets ni
  les sons d'un arsenal.
- **La reprise en mieux** : un vivier plus court et honnête (chaque carte dit son chiffre), quatre
  paliers pour voir l'ultime à chaque partie, chaque arme dessinée en gros pixels sur le serpent et en
  cyan (la couleur de la joueuse), tout le jeu à un pouce, des explosions d'arme pensées sous le
  limiteur de flashs, un arsenal qui ne rend pas la joueuse intouchable (RETOURS-PROPRIETAIRE.md :
  « trop facile », « il faut pouvoir mourir »), et une progression de contenu plutôt que de bonus plats.

---

## 2. Le socle de l'arsenal

### S1. Huit armes automatiques, chacune avec un rôle spatial
- **Quoi.** `_wpnDefs` (23-weapons.js:58-163) : CANON FRONTAL, TOURELLES LATÉRALES, TRAÎNÉE DE QUEUE,
  ARC ÉLECTRIQUE, MISSILES, DRONES, ONDE DE CHOC, MINES DE SILLAGE. `update(dt)` les fait toutes tirer
  dans un ordre fixe (l. 1193-1210). Aucune ne demande d'appui : la joueuse ne vise jamais.
- **Pourquoi c'est bien.** Chaque arme couvre une zone que les autres laissent : devant, flancs,
  derrière, autour, à distance. Un serpent qui avance sans cesse a donc toujours une raison de choisir sa
  trajectoire (amener les traqueurs dans son sillage, présenter le flanc à une nuée, contourner pour que
  les mines restent derrière). C'est exactement J-10 (« viser, c'est diriger »).
- **Défauts.** Rien n'explique le rôle d'une arme en jeu : la carte donne une phrase, le serpent se
  couvre de modules, mais la zone couverte n'est jamais montrée.
- **En mieux dans 2975.** Garder les huit rôles. Montrer la zone d'une arme au moment où on la prend :
  pendant 1 s, un tramage cyan léger dessine son champ (cône du canon, flancs, sillage, cercle de l'onde)
  autour du serpent. Le monde redevient plus grand que l'écran (RETOURS-PROPRIETAIRE.md, point 3) : les
  portées se pensent donc par rapport à la **vue**, comme en 2030.

### S2. Six paliers qui changent le comportement ET la silhouette
- **Quoi.** « Chaque palier change le comportement ET la silhouette de l'arme » (l. 8-9). Le code de tir
  lit l'objet du palier, jamais un numéro : « Ajouter un palier = ajouter une ligne » (l. 54-55). Le
  niveau d'une arme est le nombre de fois que sa carte a été prise (`S.up.frontCannon`,
  24-upgrades.js:15-17). Le palier 6 est un ULTIME : rayon continu, bordée en vague, mur de plasma, champ
  Tesla, nuée, anneau de drones, vague déferlante, singularité. Atteindre l'ultime fête l'arme : flash
  blanc 0,4 et anneau de 900 (24-upgrades.js:183-193).
- **Pourquoi c'est bien.** Progression visible : on voit son arme grandir. Le palier ultime est un moment
  de puissance que la joueuse vise ; le poids de tirage de la carte monte ×1,3 juste avant (l. 177).
- **Défauts.** Six paliers, c'est cinq cartes de la même arme : l'audit (septembre, avant G7) mesurait une
  arme au palier 6 dans **9 %** des parties seulement ; le contenu le plus spectaculaire du jeu restait
  invisible. Les paliers ne sont pas réglés entre eux (§ 4).
- **En mieux.** **Quatre paliers** (base, +, ++, ULTIME), pour que l'ultime d'au moins une arme tombe
  dans presque chaque partie, y compris une démo de deux minutes. L'ultime annoncé d'avance sur la carte
  (« ENCORE 1 → RAYON »). Garder le format de données « un palier = une ligne », en pixels de jeu et en
  secondes.

### S3. Les modificateurs globaux, lus par toutes les armes
- **Quoi.** 23-weapons.js:287-341, effets réels (n = nombre de prises de la carte) :

| Modificateur | Carte | Effet réel |
|---|---|---|
| Dégâts | PUISSANCE | × (1 + 0,15 n) sur les dégâts des armes ; pas sur les sources du cœur (explosions de mort, auras, épines, éperon, ultime, flaques) |
| Critique | POINT FAIBLE | 8 % × n de chances de × 2,2 (tiré par `rnd()`, donc sur le flux du jeu) |
| Cadence | CADENCE | recharges ÷ (1 + 0,10 n) ; ni le tic du sillage ni la fréquence du rayon |
| Portée | PORTÉE | × (1 + 0,12 n) : rayon, arcs, recherche et zone des missiles, drones, onde, recherche des tourelles ; pas les mines ni le sillage |
| Vitesse | ACCÉLÉRATEUR | × (1 + 0,14 n) sur la vitesse des projectiles, durée inchangée (portée + 14 %) |
| Perforation | PERFORATION | + n ennemis traversés par tout projectile créé par une arme |
| Souffle | OGIVE | toute balle gagne une zone de 34 + 14 n u (48 à 90) à 60 % de ses dégâts |
| Ricochet | PRISME | à chaque impact, un éclat de ≈ 2,1 dégâts part vers l'ennemi le plus proche à 240 u ; un seul rebond |

- **Pourquoi c'est bien.** Une seule carte renforce tout l'arsenal : les choix « transversaux » restent
  utiles quelle que soit la construction.
- **Défauts.** Les pourcentages sont petits et l'audit les mesurait dans le bruit (PUISSANCE ×5 : +14 % de
  kills ; CADENCE ×5 : +4 % ; PORTÉE ×4 : 0 % ; POINT FAIBLE ×3 : −12 % ; ACCÉLÉRATEUR ×3 : −9 %). Le
  ricochet est écrasé par les obus de flak et les missiles, qui posent leur propre `onHit` (l. 329-338).
  Les dégâts du ricochet sont fixes (2,1) : inutiles passé le premier secteur. La documentation en tête
  de 24-upgrades.js (l. 22-114) contredit le code sur une douzaine de valeurs (critique « 9 %, triple »,
  vitesse « +15 % », rebond « +8 % », souffle « +22 % de rayon sur toute explosion »…).
- **En mieux.** Moins de cartes de pourcentage, des pas plus gros (+25 % au lieu de +10 %), et **le texte
  de la carte calculé depuis ses chiffres** (« CADENCE 6,5 → 8,1 TIRS/S ») : une seule source de vérité.
  Les tirages des armes (critiques, dispersions) sur un générateur propre, comme 50-fx.js et
  30-music.js le font déjà, pour ne pas déplacer les apparitions d'ennemis.

### S4. La visée : le cap, sauf dans un cône
- **Quoi.** `aimAng()` (10-core.js:161) : la visée du canon et du rayon est le cap de la tête, sauf sur les
  rails du treillis, où la tête pivote dans un cône de ± 1,15 rad (66°) vers le manche ou vers l'ennemi le
  plus proche à 560 u (l. 240-250), et à la souris sur bureau. Les tourelles corrigent seules leur angle
  (± 40° à ± 69° selon le palier), drones, arcs et missiles choisissent leurs cibles.
- **Pourquoi c'est bien.** Une seule arme demande de viser par la trajectoire (le canon) ; toutes les
  autres pardonnent.
- **En mieux.** En 2975 (16 directions de sprite), une petite aide de visée du canon (± 10° vers l'ennemi
  le plus proche dans le cône avant, *proposition*) évite les tirs qui frôlent ; le reste à l'identique.

### S5. Le brouilleur fait taire l'arsenal
- **Quoi.** Tant que la tête est dans le champ d'un BROUILLEUR (200 u) et 180 ms après, toutes les armes se
  taisent, sauf le sillage, « qui n'est pas une arme » (23-weapons.js:1194-1197 ; 22-enemies.js:947-971) ;
  la coque du champ avale aussi les projectiles joueur qui la traversent (entre 78 et 100 % du rayon).
- **Pourquoi c'est bien.** Un ennemi qui force à bouger autrement : on sort du champ ou on le tue au
  contact. Une vraie variété tactique.
- **Défauts.** *D'après le code* : pendant le brouillage, `drawMounts` dessine encore les tourelles et les
  drones aux positions de la dernière image active (elles ne sont plus recalculées) : ils restent
  suspendus en l'air pendant que le serpent s'éloigne ; les éclairs restent figés à l'écran (leur durée
  n'est décomptée que dans `_wpnUpArc`) ; le rayon de l'ultime du canon reste dessiné sans infliger de
  dégâts. Avant correction, cet appel levait une exception à chaque image (audit : 51 851 en une
  campagne, partie gelée au niveau 3).
- **En mieux.** Montrer le brouillage sur les armes elles-mêmes : les modules passent en `acier` et
  `ardoise` (« éteints »), un tramage de parasites court sur le corps, puis ils se rallument un par un. Une
  règle simple : tout se tait, sillage compris, ou bien la carte le dit.

### S6. Tout est préalloué, le dessin est groupé
- **Quoi.** 20 tourelles, 256 nœuds de sillage, 8 arcs de 10 points, 4 vagues, 72 mines, 12 cratères
  (l. 168-269) ; 700 projectiles joueur au plus (10-core.js:580) ; projectiles dessinés en un seul passage
  par famille (l. 1212-1345). L'audit a poussé 691 projectiles sans une exception.
- **En mieux.** Même discipline : 2975 plafonne déjà à 400 particules, 24 explosions, 160 tirs joueur et
  140 tirs ennemis (50-fx.js:94-95 ; 70-game.js:528, 782). Chaque arme doit apporter ses propres réservoirs
  fixes et ne rien allouer par image.

### S7. Le code couleur des tirs
- **Quoi.** « Projectiles joueur : blanc, crème, or, ambre (JAMAIS de rouge) » (l. 11-14). Après G11, toutes
  les couches d'arme sont en composition normale : en additif, les balles écrivaient du blanc pur sur le
  corps cyan et se confondaient avec la tête (l. 21-43).
- **Défauts.** L'audit mesurait des cœurs presque identiques pour les tirs joueur et ennemis (231,231,216
  contre 247,245,241) et le même son `shoot`, trois fois plus fort chez l'ennemi.
- **En mieux.** 2975 a une règle plus nette : « le cyan appartient à la joueuse » (DIRECTION.md). **Tout ce
  qui appartient à l'arsenal est `cyan` / `cyanPale`** (projectiles, modules, drones, mines, zones), avec
  `os` pour l'éclair d'impact ; le danger reste `magenta` / `rosePale` / `sang` ; le butin `ambre` /
  `jaune`. À trancher avant d'écrire une ligne : le critère 3 de DIRECTION.md (moins de 0,5 % de cyan hors
  du masque de la joueuse) doit compter **les armes dans ce masque**, sinon un arsenal cyan l'enfreint
  mécaniquement. Et G-11 : la tête et ses deux premiers segments sont dessinés au-dessus des armes.

---

## 3. Les huit armes

Chaque tableau reprend les paliers tels que le code les définit. « Recharge » est en secondes.

### A1. CANON FRONTAL ▲ — devant (23-weapons.js:60-71, 383-470)

| Palier | Texte de la carte | Recharge | Tirs | Dégâts | Vitesse (u/s) | Particularité | DPS nominal |
|---|---|---|---|---|---|---|---|
| 1 | Salve simple vers l'avant | 0,34 | 1 | 5 | 660 | — | 14,7 |
| 2 | Deux bouches alternées, cadence doublée | 0,20 | 1, alterné à ± 7 u | 5 | 700 | — | 25 |
| 3 | Tir double perforant | 0,19 | 2 (écart 0,11 rad) | 6 | 720 | perce 1 | 63,2 |
| 4 | Lances perforantes hypervéloces | 0,16 | 2 (0,06 rad) | 8 | 860 | perce 3, traits de 30 u | 100 |
| 5 | Obus explosifs à fragmentation | 0,25 | 2 (0,09 rad) | 11 | 760 | perce 1, zone 80 u à 60 %, orbes or | 88 + zone |
| 6 | ULTIME — rayon continu qui transperce tout | 15 tics/s | rayon 520 u | 7 par tic | — | touche chaque ennemi de la ligne, vaporise les tirs ennemis qu'il croise | 105 par ennemi |

- **Comment.** Projectiles de 1,9 s (1 250 à 1 630 u de portée), bouche à 1,4 rayon de tête, éclair de
  bouche, son `shoot` (0,34 ; 0,5 pour les orbes). Le rayon monte en 0,31 s, frappe les ennemis à 32 u de
  points espacés de 42 u, efface les tirs ennemis à ± 22 u de son axe, se dessine en halo or, corps crème,
  cœur blanc et stries qui remontent ; son `laser` toutes les 0,22 s. C'est l'arme de départ (palier 1, ou
  2 avec le déblocage CANON LOURD).
- **Pourquoi c'est bien.** Elle enseigne le tir automatique sans tutoriel (« on démarre armé »,
  90-boot.js:1376). Chaque palier se lit autrement : bouches alternées, tir double, longues lances, orbes
  explosives, rayon. Le rayon est le moment « je suis invincible devant moi » et un outil défensif.
- **Défauts.** Le palier 5 baisse la cadence et le DPS sur cible unique (100 → 88) : sur un boss, c'est un
  recul. L'ultime ne vaut que 105 contre 100 au palier 4 : il change de nature, pas de puissance. Le rayon
  partait de la tête et la masquait (corrigé en G11).
- **En mieux dans 2975.** Le palier 1 est la démo actuelle (sprite `tir` 7 × 7 cyan à tête pâle, 6,5 tirs/s,
  210 px/s, 1,4 s : 70-game.js:66, 529). Paliers en formes de pixels : deux bouches à ± 2 px, puis une
  lance de 1 × 5 px à cœur `cyanPale` qui perce, puis une orbe 3 × 3 à cœur `os` qui éclate en petite
  explosion (force ≤ 0,2), et l'ULTIME : une ligne de 3 px (centre `cyanPale`, bords `cyan`, frange tramée
  d'un pixel) longue de ≈ 130 px, parcourue de paquets `os` qui filent vers l'avant, partant 7 px devant
  la tête pour ne jamais la couvrir. Chaque palier strictement meilleur que le précédent sur un boss ;
  l'ultime au moins × 1,5. Le son `tir` de 30-music.js (pentatonique, conçu pour plus de 7 par seconde)
  convient déjà.

### A2. TOURELLES LATÉRALES ⊥ — les flancs, et la longueur (l. 73-84, 472-566)

| Palier | Texte | Recharge | Une tourelle tous les… (plafond) | Rafale | Visée | Dégâts | DPS à 20 / 40 segments |
|---|---|---|---|---|---|---|---|
| 1 | Tourelles de bordée, tir alterné | 0,85 | 4 segments (3) | 1, un flanc sur deux | angle droit | 5 | 8,8 / 8,8 |
| 2 | Bordée des deux côtés à la fois | 0,80 | 3,5 (5) | 1 | angle droit | 5 | 31,3 / 31,3 |
| 3 | Visée assistée, plus de tourelles | 0,70 | 3 (7) | 1 | ± 40° vers l'ennemi le plus proche (360 u) | 5 | 42,9 / 50 |
| 4 | Canons jumelés, rafale de deux | 0,62 | 2,6 (9) | 2, à 0,09 s | ± 49° | 5 | 112,9 / 145,2 |
| 5 | Obus de flak à fragmentation | 0,58 | 2,2 (12) | 2, à 0,08 s | ± 57°, flak : 3 éclats à 45 % | 6 | 186,2 / 248,3 |
| 6 | ULTIME — chaque segment tire, bordée en vague | 0,42 | 1,6 (18) | 3, à 0,07 s | ± 69°, 0,028 s de décalage par tourelle, flak 4 | 7 | 600 / 900 |

- **Comment.** Tourelle i posée au segment (i + 0,7) × n / nombre, côtés alternés ; bouche à 9 u ;
  projectiles de 1,25 s. Le flak se brise à l'impact en éclats renvoyés vers l'arrière (écart 0,55 rad,
  380 u/s, 0,5 s). Dessin : socle sombre cerclé d'or, canon chrome (double au palier 4), éclair de bouche,
  recul de 3 u ; son `shoot` à 0,26 par salve.
- **Pourquoi c'est bien.** La longueur devient puissance de feu **visible** : le corps se hérisse de
  canons. Les flancs, point faible d'un serpent, deviennent sa force. La bordée en vague de l'ultime est
  le plus beau tir du jeu.
- **Défauts.** Le palier 1 ne tire qu'à angle droit et une tourelle sur deux : 8,8 DPS, il rate presque
  tout. Puis l'ultime monte à 900 : le plus grand écart du jeu (× 100). BORDÉE ARRIÈRE fait tirer une
  tourelle sur deux vers l'arrière, mais son canon reste dessiné de côté (l. 1449). Suspendues en l'air
  pendant le brouillage (S5). Même son que l'artilleur ennemi.
- **En mieux.** Une tourelle = un module 3 × 3 sur la perle de 9 × 9 : creux `nuitProfonde` et canon de
  deux pixels `cyanPale` orienté en 8 directions vers sa cible. La bordée en vague devient une lumière qui
  court le long du corps, comme les données qui « coulent » déjà sur les perles (40-sprites.js). Visée de
  ± 25° et les deux flancs dès le palier 1 ; l'ultime à × 3 ou × 4 du palier 3, pas × 20 ; plafond de
  16 tourelles. Quand un choc coupe la queue (70-game.js:556-563), les modules perdus tombent en débris :
  la perte de puissance se voit. Son : petits pincements dans la tonalité, laissés aux gardes FUSION et
  USURE de 30-music.js (sinon 16 tourelles × 3 tirs noient tout).

### A3. TRAÎNÉE DE QUEUE ∿ (SILLAGE) — derrière, et le lasso (l. 86-97, 568-687)

| Palier | Texte | Durée | Rayon | Dégâts / tic | DPS dans la traînée | Ralenti par tic | Boucle |
|---|---|---|---|---|---|---|---|
| 1 | Sillage énergétique court | 0,9 s | 15 u | 3 / 0,16 s | 18,8 | — | — |
| 2 | Sillage long et large | 1,5 s | 18 u | 4 / 0,14 s | 28,6 | — | — |
| 3 | Englue, et boucler la boucle détone | 1,9 s | 20 u | 5 / 0,12 s | 41,7 | × 0,78 | 18 |
| 4 | Plasma incandescent, gerbes d'étincelles | 2,4 s | 23 u | 7 / 0,11 s | 63,6 | × 0,72 | 30 |
| 5 | L'encerclement devient une déflagration | 2,9 s | 25 u | 8 / 0,10 s | 80 | × 0,66 | 52 |
| 6 | ULTIME — mur de plasma qui avale les tirs | 3,5 s | 29 u | 11 / 0,09 s | 122,2 | × 0,55 | 90, et le mur détruit les tirs ennemis |

- **Comment.** Un nœud tous les 8 u parcourus par la **queue** (anneau de 256) ; à chaque tic, un nœud sur
  trois (décalage tournant) blesse les ennemis dans son rayon, une fois par tic, seulement à l'écran.
  **Boucle (paliers 3 à 6)** : quand la queue revient à moins de 30 u d'un nœud vieux d'au moins
  22 nœuds (≈ 176 u de trajet), toutes les 1,1 s au plus : centre = moyenne des nœuds de la boucle,
  rayon = plus grande distance + 18 u ; tout ennemi dedans encaisse les dégâts de boucle ; anneaux,
  gerbe de 26 éclats, secousse 10, texte « ENCERCLÉ », son `bigkill` (l. 583-620). Dessin en trois
  tranches d'âge, halo ambre et cœur crème (blanc à l'ultime). Le sillage continue sous brouillage.
- **Pourquoi c'est bien.** L'arme la plus « serpent » : la moto de lumière de Tron. **La boucle est la
  mécanique de maîtrise du jeu** : tracer un lasso autour d'un groupe donne une détonation nommée et
  récompense la trajectoire, pas la chance. L'ultime fait de la queue un mur défensif.
- **Défauts.** C'est la trace de la QUEUE qui ferme la boucle, invisible en tant que telle : la tête ne
  compte pas, la joueuse ne sait pas ce qui déclenche ; 22 nœuds et 30 u de tolérance cachés ; rien
  n'annonce qu'une boucle va se fermer ; les dégâts ne dépendent pas du nombre d'ennemis encerclés ; et
  l'idée la plus originale de l'arsenal n'existe qu'à partir du palier 3. PLASMA ÉPAIS promet un sillage
  plus fort et plus long, et donne en fait +1 PUISSANCE et +1 PORTÉE à tout l'arsenal (la portée n'agit pas
  sur le sillage).
- **En mieux.** **Faire du lasso le verbe central de SNAKE 2975** (*proposition*). À 64 px/s et
  5,9 rad/s (70-game.js:60-61), un tour complet prend ≈ 1,07 s et un cercle peut descendre à ≈ 11 px de
  rayon : boucler est facile et rapide. Fermeture par **la tête** qui recroise sa trace ou son corps (le
  corps ne blesse pas la tête dans la démo). Annonce : quand la tête approche à moins de 12 px d'une
  partie fermable, le point de fermeture clignote `cyanPale`. Fermeture : l'aire enclose se remplit d'un
  tramage `cyan` → `os` en trois images, chaque ennemi dedans prend les dégâts, « ENCERCLÉ × n » avec n
  ennemis pris, score × n, un défi nommé tout trouvé (« LASSO : 5 D'UN COUP »). Disponible dès le
  palier 1 ; les paliers allongent, élargissent, ralentissent, puis bloquent les tirs. Rendu : la démo
  garde déjà un point par pixel de trajet (`TX`/`TY`, 4 096 points, 70-game.js:399) ; une trace d'un pixel
  dont l'intensité de Bayer baisse avec l'âge donne le dégradé « au tramage » qu'exige DIRECTION.md.
  Une grande boucle peut dépasser le seuil de flash (un disque de 42 px de rayon) : demander
  `N.fx.flashGate(aire)` et, refusé, ne dessiner que le contour. Rayon 15-29 u → 4-7 px.

### A4. ARC ÉLECTRIQUE ⚡ — à distance, en chaîne (l. 99-110, 689-772)

| Palier | Texte | Recharge | Dégâts | Portée | Rebonds | Arcs par décharge | DPS total nominal |
|---|---|---|---|---|---|---|---|
| 1 | L'éclair rebondit sur 2 cibles | 1,20 | 6 | 230 u | 2 | 1 | 9,7 |
| 2 | Portée accrue, 3 cibles | 1,00 | 7 | 285 u | 3 | 1 | 19,7 |
| 3 | 4 cibles, l'arc paralyse | 0,85 | 8 | 315 u | 4 | 1, freine × 0,35 | 34,3 |
| 4 | Double décharge, 5 cibles | 0,75 | 9 | 335 u | 5 | 2 | 105,6 |
| 5 | La queue devient une seconde borne | 0,62 | 10 | 365 u | 6 | 2 + 1 depuis la queue | 246,8 |
| 6 | ULTIME — champ Tesla permanent, ionisation | 0,26 | 9 | 430 u | 8 | 3 + queue, éclaboussure 30 % à 34 u par saut | 875,1 |

- **Comment.** Première cible : le meilleur score de (élite + 200) + PV − distance, donc la plus solide à
  portée ; saut suivant vers l'ennemi non touché le plus proche à 0,72 × portée ; − 6 % par saut ; les arcs
  d'une décharge partagent une marque (cibles différentes) ; SURTENSION ajoute un rebond et 15 % de
  portée par point. Dessin : zigzag de trois points de gigue par saut (bruit déterministe animé), halo or
  et cœur blanc, nœuds lumineux, 0,26 s de vie ; son `zap`.
- **Pourquoi c'est bien.** Elle choisit les cibles dangereuses, adore les foules, et la queue comme
  seconde borne donne de la puissance aux deux bouts du serpent. L'ultime fait de l'écran un orage.
- **Défauts.** Le plus faible départ des armes directes (9,7) pour le plus fort palier final (875) :
  l'audit mesurait ARC ×6 à + 64 % de kills, la meilleure arme, mais une montée longue et terne. La
  paralysie est une multiplication de vitesse unique, presque invisible. « Ionisation » du palier 6 n'a
  rien à voir avec la carte IONISATION.
- **En mieux.** L'arme qui sera la plus belle en gros pixels : polyligne de Bresenham à deux points de
  gigue par saut, cœur d'un pixel `cyanPale` bordé de `cyan`, nœud `os` 3 × 3 à chaque impact, quatre
  images de vie puis extinction au tramage. Portée 230-430 u → 58-108 px. Une hauteur qui monte d'un degré
  de la pentatonique à chaque saut (comme `kill`). Paralysie lisible : l'ennemi s'arrête 0,3 s et clignote
  une image en `os`. Départ à 3 sauts, fin à × 6 du départ, pas × 90. Aucune question de flash : un éclair
  est une ligne.

### A5. MISSILES ➤ — la priorité (l. 112-123, 774-842)

| Palier | Texte | Recharge | Missiles | Dégâts | Zone (60 %) | Vitesse | DPS direct nominal |
|---|---|---|---|---|---|---|---|
| 1 | Un missile autoguidé | 2,8 | 1 | 16 | 70 u | 340 | 5,7 |
| 2 | Salve de deux | 2,5 | 2 | 16 | 82 u | 360 | 12,8 |
| 3 | Départ en spirale, ogive lourde | 2,3 | 2 | 20 | 96 u | 385 | 17,4 |
| 4 | Ogives à sous-munitions | 2,1 | 3 | 22 | 100 u | 405 | 75,4 (4 sous-munitions de 7,7) |
| 5 | Quatre missiles, priorité aux élites | 1,9 | 4 | 26 | 115 u | 435 | 131,4 |
| 6 | ULTIME — nuée de six, verrouillage total | 1,5 | 6 | 30 | 132 u | 470 × 0,85 | 372 (6 sous-munitions) |

- **Comment.** Recherche à 720 u (toute la vue), sinon nouvel essai dans 0,35 s. Cible principale : la plus
  proche, ou dès le palier 5 la plus « dangereuse » (0,6 × PV max + 26 × dégâts + 260 si élite + 900 si boss
  − 0,35 × distance) ; un missile sur deux part vers la deuxième cible. Départ à ± 0,35 rad (en spirale dès
  le palier 3), virage 5 rad/s, vie 3,4 s, nouvelle cible si la sienne meurt. Sous-munitions à l'impact :
  en étoile, 300 u/s, 0,9 s, zone 44 u, autoguidées. Dessin : flamme, corps crème, ailerons, et quatre
  crochets tournants sur la cible verrouillée ; son `missile`.
- **Pourquoi c'est bien.** Ils règlent seuls le problème de la menace prioritaire (élites, boss), montrent
  leur intention (verrouillage) et paient en grosse détonation.
- **Défauts.** Le palier 1 est la pire carte de l'arsenal au moment de la prendre (5,7 DPS : 16 dégâts
  toutes les 2,8 s), un piège pour un premier choix ; la priorité aux élites, leur identité, n'arrive
  qu'au palier 5 ; OGIVE et CHARGE CREUSE, cartes de l'axe explosif, ne les touchent pas (§ 6). Le son
  `missile` a 99 % de son énergie sous 400 Hz (audit) : muet sur un haut-parleur de téléphone.
- **En mieux.** Sprite 3 × 5 `cyan` à pointe `cyanPale`, traînée par `N.fx.trail` (déjà là, 0,15 s), et un
  verrouillage en quatre pixels `cyanPale` aux coins de la cible, qui tournent d'un quart toutes les
  quatre images : la marque de la joueuse sur un ennemi n'est jamais magenta. Deux missiles et la priorité
  aux élites dès le palier 1. Explosions petites (force 0,2 à 0,3, rayon 14 à 19 px), arrivées étalées par
  la spirale pour ne pas épuiser les trois flashs par seconde (§ 11). Son : souffle montant dans les
  médiums, départ calé sur le temps.

### A6. DRONES ◎ — autour, et défense (l. 125-136, 844-946)

| Palier | Texte | Drones | Orbite | Recharge | Dégâts | Portée | Spécial | DPS de tir nominal |
|---|---|---|---|---|---|---|---|---|
| 1 | Un drone en orbite | 1 | 54 u | 0,62 | 5 | 330 u | — | 8,1 |
| 2 | Deux drones opposés | 2 | 60 u | 0,62 | 5 | 350 u | — | 15,7 |
| 3 | Trois drones : ils bloquent les tirs | 3 | 68 u | 0,68 | 5 | 370 u | interception (+ 0,15 s de recharge) | 20,9 |
| 4 | Canons jumelés, orbite respirante | 3 | 76 u ± 16 % | 0,54 | 5 × 2 | 390 u | — | 52,5 |
| 5 | Quatre drones reliés par un filin | 4 | 82 u | 0,46 | 6 × 2 | 410 u | filin : 36 DPS au contact | 96,1 |
| 6 | ULTIME — six drones, anneau de plasma fermé | 6 | 94 u | 0,30 | 7 × 2 | 450 u | interception sans pénalité, anneau fermé 66 DPS | 245,4 |

- **Comment.** Orbite à 1,15 rad/s, phases régulières, lissage ; chaque drone tire sur l'ennemi le plus
  proche à portée, recharge × (1 + 0,06 i) pour désynchroniser ; interception : un tir ennemi à moins de
  r + 13 u d'un drone est détruit (anneau, éclats, son `hit`) ; le filin blesse en trois points par lien.
  Dessin : coques hexagonales, yeux or (blancs au tir), boucliers, filins en courbes.
- **Pourquoi c'est bien.** Des compagnons lisibles et attachants, qui **encaissent pour toi** ; l'anneau
  fermé est un rempart ; le filin, une arme de contact qu'on promène dans la foule.
- **Défauts.** Figés pendant le brouillage ; l'anneau ne blesse que ce qui le croise ; à 94 u, l'orbite
  recouvre le feu des tourelles.
- **En mieux.** Satellite 5 × 5 `cyan` à œil `cyanPale` tourné vers sa cible, orbite de 14 à 24 px, filin en
  pointillé de Bresenham (un pixel sur deux) : très « borne d'arcade ». Interception = anneau `os` de 5 px
  une image. La démo n'a aucun compagnon.

### A7. ONDE DE CHOC ◉ — autour, contrôle (l. 138-149, 948-1041)

| Palier | Texte | Recharge | Rayon | Dégâts (45 → 100 % vers le centre) | Poussée | Spécial |
|---|---|---|---|---|---|---|
| 1 | Impulsion répulsive périodique | 3,4 | 110 u | 7 | 280 | — |
| 2 | Plus large, efface les tirs ennemis | 2,9 | 142 u | 9 | 320 | efface les tirs dans le rayon |
| 3 | L'onde freine tout ce qu'elle touche | 2,5 | 172 u | 11 | 360 | freine × 0,6 |
| 4 | Charge télégraphiée, noyau dévastateur | 2,2 | 196 u | 14, × 2,2 dans les 42 % centraux | 420 | anneau qui se resserre 0,6 s avant |
| 5 | Les tirs effacés deviennent de l'énergie | 2,0 | 226 u | 17, × 2,4 | 470 | 35 % des tirs effacés → cellule d'énergie |
| 6 | ULTIME — aura permanente + vague déferlante | 1,7 | 250 u | 20, × 2,6 | 520 | aura 5 toutes les 0,2 s (25 DPS) à 105 u ; vague de 16 qui roule à 460 u/s jusqu'à 600 u |

- **Comment.** Première impulsion 1,2 s après le départ ; poussée de 40 à 100 % ; anneaux crème et blanc,
  halo, secousse 4 + 0,02 × rayon ; son `boost`.
- **Pourquoi c'est bien.** L'arme qui fait respirer : l'écran se nettoie autour de la tête à intervalle
  régulier. La récolte transforme le danger en butin, une conversion très lisible. Le télégraphe de sa
  propre arme (palier 4) permet de jouer avec son rythme.
- **Défauts.** Elle repousse ce que d'autres armes veulent garder près (mines qui aimantent, filins,
  éperon, encerclement) ; elle emprunte le son du boost ; dégâts faibles (c'est du contrôle) ; télégraphe
  seulement au palier 4.
- **En mieux.** Anneau tramé qui s'étend et se troue (`N.gfx.ring` avec intensité) : c'est exactement le
  vocabulaire d'explosion de 2975. Les tirs ennemis effacés deviennent des cellules `ambre` : on **voit**
  le magenta devenir butin. Télégraphe dès le palier 1 (anneau pointillé qui se resserre 0,6 s avant),
  calé sur la mesure : à 112-128 BPM, une mesure dure 1,9 à 2,1 s (30-music.js:89), l'onde devient la
  grosse caisse du jeu (G-33). Rayon 110-250 u → 28-63 px. Un palier d'aspiration (onde inversée)
  réconcilie l'onde avec les mines et le lasso.

### A8. MINES DE SILLAGE ◈ — derrière, zone (l. 151-162, 1043-1187)

| Palier | Texte | Recharge | Mines | Dégâts | Souffle | Amorçage | Déclenche à | Vie | Spécial |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Une mine de proximité régulière | 2,2 | 1 | 14 | 70 u | 0,45 s | 30 u | 9 s | — |
| 2 | Charges plus denses et plus larges | 1,9 | 1 | 17 | 88 u | 0,40 s | 32 u | 9 s | — |
| 3 | Les mines aimantent leurs victimes | 1,7 | 1 | 20 | 102 u | 0,36 s | 34 u | 10 s | aimant à 1,1 × souffle |
| 4 | Éclatent en trois sous-charges | 1,5 | 1 | 22 | 112 u | 0,32 s | 36 u | 10 s | 3 mini-mines (40 % des dégâts, 55 % du souffle, 0,12 s, 3,2 s) |
| 5 | Grappe de deux, cratère incandescent | 1,3 | 2 | 25 | 126 u | 0,30 s | 38 u | 11 s | cratère 1,6 s : 16 % des dégâts toutes les 0,18 s |
| 6 | ULTIME — charges à singularité : implosion | 1,1 | 2 | 34 | 152 u | 0,26 s | 42 u | 12 s | aimant × 2, 4 sous-charges, cratère 2 s, implosion 0,45 s (aspire à 260 u/s dans 1,5 souffle) puis souffle |

- **Comment.** Posées à la queue, côte à côte à ± 11 u quand il y en a deux ; dégâts de 50 à 100 % selon la
  distance, poussée 260 × proximité ; déclenchement vérifié pour une mine sur cinq à chaque image (jusqu'à
  cinq images de retard) ; 72 au plus, la plus vieille cède. Dessin : losanges tournants (or en
  amorçage, blancs armés), halo pulsé, cercle de déclenchement discret. Sons : `boostDry` à la pose,
  `explode` à la détonation, `absorb` à l'implosion.
- **Pourquoi c'est bien.** Le déni de zone derrière soi : on attire les chasseurs dans son passé, on
  récompense le « kiting ». La singularité (aspirer, puis souffler) regroupe pour les réactions en chaîne :
  un grand spectacle.
- **Défauts.** La pose joue `boostDry`, le son qui veut dire « boost vide » ; l'implosion joue `absorb`,
  le son du corps qui absorbe un tir : trois armes empruntent des sons qui veulent dire autre chose. Mines
  de la joueuse et mines ennemies coexistent ; 72 mines encombrent le sol.
- **En mieux.** Mine de la joueuse = **losange 5 × 5 `cyan`**, cœur `cyanPale` qui bat à 2 Hz une fois armée
  (sous les 3 Hz de G-29), cercle de déclenchement en pointillé de 8 à 10 px ; la mine ennemie de 2975 est
  une sphère `magenta` à piques de 13 × 13 : forme ET couleur différentes (V-10). Petite détonation
  (force 0,25) ; zones persistantes de la joueuse en tramage `cyan`, jamais en `brasier`, que V-11 confond
  avec le magenta. 24 mines au plus. Un son propre : petit bip grave à la pose, dans la tonalité.

---

## 4. Les huit armes côte à côte

| Arme | Couvre | DPS palier 1 | DPS palier 6 | Rapport | Défense | Mesure audit (historique) |
|---|---|---|---|---|---|---|
| Canon | devant | 14,7 | 105 par ennemi de la ligne | × 7 | le rayon efface les tirs | CANON 3 → 6 : + 21 % de kills |
| Tourelles | flancs, suit la longueur | 8,8 | 600 à 900 | × 70 à × 100 | — | ×6 : + 46 % |
| Sillage | derrière, lasso | 18,8 par ennemi dedans | 122,2 par ennemi dedans | × 6,5 | le mur avale les tirs | + 37 % |
| Arc | à distance, chaînes | 9,7 | 875 | × 90 | — | ×6 : + 64 % |
| Missiles | priorité | 5,7 | 372 | × 65 | — | + 25 % |
| Drones | autour | 8,1 | 245 + anneau | × 30 | interception | + 35 % |
| Onde | autour, contrôle | 7 toutes les 3,4 s | 20 × 2,6 toutes les 1,7 s + aura 25 | — | efface, récolte | ×6 : + 45 % |
| Mines | derrière, zone | 14 toutes les 2,2 s | 2 × 34 toutes les 1,1 s + sous-charges | — | — | — |

Repères : traqueur 9 PV, artilleur 18, brouilleur 40, pondeuse 100 (22-enemies.js:1928-2020) ; × 3,2 pour
une élite ; × 2,6 par secteur (10-core.js:45, 560-563), soit × 17,6 au secteur 4. Les armes et les cartes
de mort en chaîne sont, selon l'audit, ce qui change vraiment le résultat d'une partie ; les cartes de
pourcentage, non.

**À retenir pour 2975.** L'échelle de PV de la démo (flèche 1, mine 2, tourelle et sentinelle 4, colosse 120 ;
70-game.js:77-83) est trop grossière pour des bonus de 15 % ou des dégâts par tic : passer à une échelle
proche de 2030 (× 10 environ). Et un arsenal qui grandit appelle des ennemis qui durcissent, sinon la
démo reste « trop facile » (RETOURS-PROPRIETAIRE.md, point 2) : la pente géométrique de 2030
(PV × 2,6 par secteur, coups × (1 + 1,9 par secteur)) répondait précisément à « passé 60 s, plus personne
ne meurt ».

---

## 5. Les cartes : le tirage et les choix

### C1. La montée de niveau mise en scène
- **Quoi.** XP pleine → 350 ms de ralenti à 0,15, invulnérabilité ≥ 900 ms, flash 0,3, anneau, pulsation
  de caméra, son `levelup` → écran de cartes, jeu en pause (90-boot.js:1260-1316).
- **Pourquoi c'est bien.** On voit monter, on n'est pas jeté dans un menu.
- **En mieux.** Même ralenti, en gros pixels : anneau tramé `cyanPale`, le serpent qui pulse de la queue à
  la tête (la démo sait déjà faire courir `P.pulse` le long du corps, 70-game.js:506, 1365).

### C2. Une main de trois, quatre si deux montées attendent
- **Quoi.** `roll(3)`, ou `roll(4)` si deux montées ou plus attendent ; **une seule carte est prise et
  toute la file est absorbée** (`S.lvlUps = 0`, 90-boot.js:1292-1311) ; au moins 2,5 s entre deux écrans.
  Le texte d'une carte d'arme est celui du **palier suivant** ; l'étiquette dit « NIV n » ou « NOUVEAU ».
- **Pourquoi c'est bien.** Pas d'écrans enchaînés en rafale (l'audit en comptait 8 % à moins de 2 s).
- **Défauts.** Trois montées d'un coup = une seule carte parmi quatre : de la progression perdue.
- **En mieux.** Deux montées = deux choix sur le même écran (« CHOISIS 2 »), jamais de perte.

### C3. Des poids qui évoluent
- **Quoi.** Poids de base de 6 (ultras) à 88 (CANON). Carte d'arme (24-upgrades.js:172-179) : arme neuve
  × 1,9 tant que la joueuse a moins de quatre armes, × 0,85 ensuite ; × 1,3 quand le palier suivant est
  l'ULTIME. Conditions `req()` : une carte n'est tirable que si ses prérequis sont remplis.
- **Pourquoi c'est bien.** Pas de partie sans arme ; l'ultime « appelle ».
- **Défauts.** Le × 1,9 remplissait la première main d'armes pour un serpent à 5 segments (audit :
  TOURELLES, ONDE, MISSILES, DRONES offertes 12 fois chacune sur 90 premières mains, BOUCLIER 1 fois) —
  d'où la règle C5.

### C4. L'étouffement d'axe
- **Quoi.** Dans une main, une carte dont l'axe est déjà servi deux fois voit son poids × 0,12
  (24-upgrades.js:705-716), « pour garder des mains lisibles ».
- **Défauts.** C'est l'inverse de ce qu'il faut pour former une construction : l'audit mesurait
  18 cartes par partie de 10 min sur 6 axes, 12 identifiants différents, axe dominant à 33 %.
- **En mieux.** Pondérer **pour** l'école choisie : × 1,7 pour un axe où la joueuse a déjà deux cartes,
  × 0,6 pour un axe vierge après la sixième carte (proposition PROG-7 de l'audit, jamais appliquée).

### C5. La première main protège
- **Quoi.** Si aucune carte n'a été prise (24-upgrades.js:660-675, 739-769) : au plus **une arme neuve**
  (les autres quittent le tirage dès qu'une sort) et au moins **une carte de survie** (CROISSANCE,
  BOUCLIER, RÉPARATION, AMORTISSEURS, NANITES), substituée à une place au hasard si besoin.
- **Mesuré au bac à sable (20 000 premières mains, CANON 1).** CROISSANCE est dans 28,9 % des mains,
  AMORTISSEURS 20,4 %, NANITES 19,5 %, BOUCLIER 18,0 %, RÉPARATION 17,6 %, puis CANON 11,6 %, ARC 11,6 %,
  TOURELLES 10,5 %, PUISSANCE 10,5 %, SILLAGE 10,2 %. Raretés : 66,3 % communes, 32,1 % rares, 1,6 %
  épiques, 0 % ultra ; une première main sur 21 contient une épique.
- **Pourquoi c'est bien.** Avant G7, 30 à 70 % des parties mouraient sans avoir vu une carte ; la
  première décision donne de quoi survivre.
- **En mieux.** Garder la règle ; en 2975, la première carte doit tomber pendant les cinq premières
  secondes sans danger (J-14) ou juste après, comme récompense du premier virage.

### C6. La main de trophée
- **Quoi.** Un boss abattu ajoute une montée de niveau dont la main n'a **aucune commune** et au moins une
  épique ou ultra, garantie en forçant la dernière place (24-upgrades.js:676-736 ; 25-levels.js:724-731).
  Elle s'ajoute à 60 crédits et 50 d'ultime. Vivier épuisé : main ordinaire.
- **Mesuré.** Dans l'état « CANON 3, ARC 2, MISSILES 1 » : 66,3 % de rares, 33,7 % d'épiques, **0 %
  d'ultras** (aucune condition d'ultra n'est remplie).
- **Pourquoi c'est bien.** Le boss devient un événement qui paie (l'audit le mesurait comme un
  ralentisseur de 3 à 9 s sans récompense, avant G9).
- **En mieux.** Une main de trophée **dans l'école de la joueuse**, avec l'ultime ou l'évolution d'une de
  ses armes si elle est à un palier près.

### C7. La rareté et ORACLE
- **Quoi.** Poids cumulés du vivier : communes 1 308, rares 942, épiques 150, ultras 30. ORACLE (le
  déblocage le plus cher) multiplie les poids par 1 / 1,6 / 2,4 / 3,2 selon la rareté (24-upgrades.js:637-650) ;
  il ne faisait rien avant correction.
- **Mesuré (main ordinaire : CANON 3, ARC 2, MISSILES 1, PROPULSEURS 1, PUISSANCE 1).** 56,4 % communes,
  40,6 % rares, 3,0 % épiques, 0 % ultras ; avec ORACLE : 44,2 / 50,4 / 5,4 / 0 %.
- **Défauts.** La rareté est presque inerte : une épique toutes les onze mains, les ultras jamais avant des
  prérequis lointains (CAPACITEUR : ARC 4 et CONDUCTEURS ; MUR DU SON : PROPULSEURS 3 et ÉPERON ;
  SINGULARITÉ : trois paliers explosifs et OGIVE ; CITADELLE : CROISSANCE 3 ou BOUCLIER 2 ; MARCHE DU
  VIDE : PHASE 2 et 12 segments). L'audit : 5 cartes jamais offertes en 179 parties, 13 dans moins de 1 %
  des écrans.
- **En mieux.** Une **pitié** de rareté (une rare garantie tous les trois écrans, une épique tous les sept,
  une évolution offerte dès que sa condition est remplie : PROG-6). Les conditions affichées : une
  quatrième case grisée montre la prochaine carte verrouillée de l'école et ce qu'il faut pour l'ouvrir.

### C8. L'écran de cartes
- **Quoi.** Cadre et libellé colorés par la rareté (commune `#9fb6cc`, rare `#00e5ff`, épique `#b388ff`,
  ultra `#ffd166` avec une classe animée), icône teintée par l'axe (sept couleurs), entrée décalée de 55 ms
  par carte (26-ui.js:50-55, 1674-1706). Au choix : flare, anneau, nom flottant et gerbe teintés par l'axe
  (24-upgrades.js:206-213).
- **Défauts.** Le cyan du joueur sert de couleur à la rareté RARE (contre G11) ; sept teintes d'axe ne
  tiennent pas dans une palette de seize.
- **En mieux.** Rareté par **forme et encre** (V-10) : 1 à 4 crans au coin, encre `acier` (commune), `os`
  (rare), `ambre` (épique), `jaune` (ultime, avec un reflet tramé qui passe) ; jamais `cyan` (joueuse) ni
  `magenta` (danger). L'axe par l'icône 11 × 11 et le nom de l'école, pas par la couleur. Texte : nom de
  14 caractères au plus (5 × 7 : 83 px), une ligne de 21 caractères avec le chiffre. Au doigt : cartes
  dans la moitié centrale (le quart bas est au pouce en portrait, J-09), choix seulement par un toucher
  **commencé après l'ouverture de l'écran** et au moins 400 ms plus tard (comme la garde de 0,45 s de
  l'écran de fin, 70-game.js:73), pour que le pouce qui dirigeait ne choisisse pas par accident ; 44 pt
  (22 px) sont largement tenus. *Piste à tester* : le choix « dans le monde » — trois portes de données
  s'ouvrent dans l'arène au ralenti, on passe dans l'une ; pur un-pouce, sans lever le doigt.

---

## 6. Les 53 cartes, axe par axe : ce qu'elles promettent, ce qu'elles font

Format : rareté, nombre de prises au plus, poids. « Fidèle » = le texte dit ce que fait le code.
Les huit cartes d'arme sont décrites au § 3 ; leur texte est celui du palier suivant.

### Axe électrique (7 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| ARC (commune, 6, 84) | — | La foudre saute d'ennemi en ennemi. | palier d'arme (A4) | fidèle |
| CONDUCTEURS (rare, 3, 50) | ARC ≥ 1 | Tout le corps devient conducteur : la foudre part de n'importe quel segment. | + 1 au **compteur d'aura** (10-core.js:776-787) : aura de 100 + 26 n u autour de la tête, ≈ 6 dégâts/s par point ; aucun arc ne part des segments | ment |
| SURTENSION (commune, 3, 60) | ARC ≥ 1 | Un rebond de plus et des arcs qui portent plus loin. | + 1 rebond et + 15 % de portée par point | fidèle |
| IONISATION (rare, 3, 46) | ARC ≥ 2 | Les cibles foudroyées restent ionisées et encaissent tout plus mal. | + 1 au compteur d'aura, comme CONDUCTEURS ; aucun marquage n'existe | ment, doublon |
| DÉTONATION (épique, 2, 20) | ARC ≥ 2 | Tout ennemi tué par la foudre explose sur ses voisins. | **toute** mort, quelle qu'en soit la cause, explose (« bombe » + 1, 10-core.js:697-719) | ment, en mieux |
| CHAMP TESLA (épique, 2, 18) | ARC ≥ 3 | Une aura électrique permanente grille ce qui s'approche. | + 1 au compteur d'aura | fidèle, faible, identique à deux autres cartes |
| CAPACITEUR (ultra, 1, 6) | ARC ≥ 4 et CONDUCTEURS | Chaque mort relâche un nouvel éclair depuis le cadavre. | trois sauts de 7 dégâts à 240 u depuis chaque cadavre, deux générations au plus | fidèle |

L'aura : rayon 100 + 26 n u, `1,6 n × dt × 15` dégâts sur une image sur quatre environ, soit ≈ 6 n par
seconde, avec n = CONDUCTEURS + IONISATION + CHAMP TESLA (8 au plus : 308 u, ≈ 48/s).

### Axe laser (7 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| CANON (commune, 6, 88) | — | Tire droit devant, sans relâche. | palier d'arme (A1) | fidèle |
| TOURELLES (commune, 6, 80) | — | Des tourelles montées le long du corps. | palier d'arme (A2) | fidèle |
| PERFORATION (rare, 3, 48) | CANON ≥ 2 ou TOURELLES ≥ 2 | Tes tirs traversent une cible de plus. | + 1 perforation par point sur tout projectile d'arme | fidèle |
| PRISME (épique, 2, 19) | PERFORATION ≥ 1 | Un tir épuisé rebondit vers la cible suivante. | à **chaque** impact, un éclat de ≈ 2,1 dégâts vers l'ennemi le plus proche à 240 u ; jamais pour le flak ni les missiles ; la deuxième prise ne change rien | ment en partie |
| ACCÉLÉRATEUR (commune, 3, 56) | une arme à projectiles | Des projectiles nettement plus rapides et plus durs à esquiver. | + 14 % de vitesse par point | fidèle, effet minime |
| BORDÉE ARRIÈRE (rare, 1, 34) | TOURELLES ≥ 2 | Tes tourelles couvrent aussi tes arrières. | une tourelle sur deux tire vers l'arrière au lieu de son flanc ; son canon reste dessiné de côté | fidèle, dessin faux |
| POINT FAIBLE (rare, 3, 44) | une arme à projectiles | Tes coups peuvent frapper au triple. | 8 % × n de chances de × 2,2 | ment (× 2,2, pas × 3) |

### Axe explosif (8 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| MISSILES (rare, 6, 66) | — | Rares, autoguidés sur le plus dangereux. | palier d'arme (A5) | fidèle à partir du palier 5 |
| MINES (rare, 6, 64) | — | Semées sur ta trajectoire passée. | palier d'arme (A8) | fidèle |
| OGIVE (commune, 4, 56) | une arme explosive (missiles, mines ou onde) | Toutes tes explosions s'élargissent franchement. | toute **balle** gagne une zone de 34 + 14 n u à 60 % ; mines, onde, explosions de mort et missiles (zone déjà ≥ 70) inchangés | ment |
| CHARGE CREUSE (commune, 4, 54) | idem | Tes explosions frappent beaucoup plus fort. | n'agit que sur les explosions de mort (+ 16 u de rayon, + 25 % de dégâts par point) : **seule, elle ne fait rien** | ment |
| RÉACTION (épique, 2, 20) | MISSILES ≥ 2 ou MINES ≥ 2 | Une explosion en déclenche d'autres, de proche en proche. | toute mort explose, en cascade sur trois générations au plus | presque |
| GRAPPE (rare, 3, 42) | une arme explosive | Les victimes d'explosion lâchent une sous-charge en mourant. | **toute** mort explose : rayon 70 + 22 × (bombe + chaîne) + 16 × CHARGE CREUSE, dégâts (5 + 4 × bombe + 3 × chaîne) × (1 + 0,25 × CHARGE CREUSE) ; avec une « bombe », la cascade n'a pas de limite de profondeur | ment, en mieux |
| NAPALM (rare, 2, 38) | une arme explosive | Chaque explosion laisse une flaque incandescente. | chaque **mort** laisse une flaque : rayon 60 + 14 n u, 3 n dégâts/s, 2,2 + 0,5 n s, 40 au plus | ment, en mieux |
| SINGULARITÉ (ultra, 1, 6) | trois paliers explosifs et OGIVE | Tes explosions aspirent tout au centre avant de détoner. | quand une mort explose (il faut GRAPPE, DÉTONATION ou RÉACTION, qui ne sont pas dans la condition), les ennemis à 190 u reçoivent + 420 u/s vers le cadavre (boss exclu) ; l'aspiration suit la détonation | ment en partie |

### Axe vitesse (9 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| SILLAGE (commune, 6, 76) | — | Ta queue laisse une traînée brûlante. | palier d'arme (A3) | fidèle |
| PROPULSEURS (commune, 5, 72) | — | Vitesse de croisière nettement supérieure. | + 7 % par point (le cœur recalcule la vitesse à chaque image ; le × 1,09 écrit par la carte est écrasé) | fidèle |
| AGILITÉ (commune, 4, 64) | — | Des virages beaucoup plus mordants. | + 20 % de vitesse de virage par point ; *d'après le code*, **perdu** dès qu'un PARASITE s'accroche ou se détache : 22-enemies.js:373-378 recalcule le virage depuis `f_agility`, que personne n'écrit | bogue |
| RÉSERVE (commune, 4, 60) | — | Un réservoir de boost bien plus profond. | + 40 de réserve par point (100 → 260), réserve remplie | fidèle |
| POSTCOMBUSTION (rare, 3, 44) | PROPULSEURS ou RÉSERVE | Le boost consomme beaucoup moins. | consommation × (1 − 0,16 n) : 34/s → 17,7/s | fidèle |
| ÉPERON (rare, 4, 50) | PROPULSEURS ou RÉSERVE | Percuter un ennemi en boost le déchire au lieu de te blesser. | 12 / 26 / 46 / 72 dégâts **à chaque image** de contact en boost, et aucun coup reçu au contact tant que le boost dure | fidèle, très fort |
| INERTIE (épique, 2, 19) | PROPULSEURS ≥ 2 | Plus tu vas vite, plus tout ce que tu touches souffre. | tous les dégâts × (1 + 0,18 n) pendant le boost, sans lien avec la vitesse | presque |
| PLASMA ÉPAIS (rare, 2, 40) | SILLAGE ≥ 2 | Le sillage de queue frappe plus fort et bien plus loin. | + 1 PUISSANCE et + 1 PORTÉE pour toutes les armes ; la portée n'agit pas sur le sillage | ment |
| MUR DU SON (ultra, 1, 6) | PROPULSEURS ≥ 3 et ÉPERON | En boost, une onde permanente broie tout devant toi. | zone de 90 u centrée 74 u devant la tête : 390 dégâts/s et poussée, pendant le boost (n'efface pas les tirs, contrairement à la documentation) | fidèle |

### Axe forteresse (9 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| DRONES (rare, 6, 66) | — | Ils orbitent, tirent et encaissent pour toi. | palier d'arme (A6) | fidèle |
| ONDE (rare, 6, 64) | — | Une impulsion qui repousse et blesse tout autour. | palier d'arme (A7) | fidèle |
| CROISSANCE (commune, 6, 74) | — | Quatre segments de plus, immédiatement. | + 4 segments, + 4 de longueur max | fidèle |
| BOUCLIER (rare, 3, 46) | — | Un bouclier encaisse un coup entier, puis se recharge. | n charges, une revient toutes les 9 / 7 / 5,2 s ; un coup de 3 segments ou moins est absorbé en entier (+ 400 ms d'invulnérabilité), un coup plus gros passe moins 3 (`K.SHIELD_CAP`) | presque |
| RÉPARATION (rare, 3, 44) | — | Ton corps se recoud tout seul avec le temps. | + 1 segment tout de suite, puis 1 toutes les 9 / n s (9 ; 4,5 ; 3) jusqu'à la longueur max atteinte | fidèle |
| ÉPINES (rare, 3, 42) | — | Qui touche ton corps se déchire dessus. | 10 / 24 / 42 × 0,9 × dt × 60 dégâts par pas de contact avec le corps, soit ≈ 540 / 1 300 / 2 270 par seconde de contact ; rien en traversée | fidèle, très fort |
| NANITES (commune, 2, 50) | — | Les ressources ramassées réparent ton corps. | une cellule rend 1 segment avec 35 % + 18 % par point de chances (53 %, 71 %) ; les 35 % existent sans la carte | fidèle |
| AMORTISSEURS (commune, 3, 52) | — | Une invulnérabilité bien plus longue après un coup. | 900 + 220 n ms | fidèle, sans effet mesurable (audit) |
| CITADELLE (ultra, 1, 6) | CROISSANCE ≥ 3 ou BOUCLIER ≥ 2 | Aucun coup ne peut plus te coûter plus d'un segment. | coup plafonné à un segment, + 3 segments | fidèle |

BOUCLIER : jusqu'à sa correction, la recharge lue en secondes au lieu de millisecondes rendait une charge
à chaque image ; une seule carte rendait la joueuse intouchable (10-core.js:341-348). C'était, selon le
commentaire, « la cause première du “passé 60 s plus personne ne meurt” ».

### Axe spectral (6 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| PHASE (commune, 3, 52) | — | Ta traversée spectrale dure bien plus longtemps. | TRAVERSÉE : 2 200 + 700 n ms | fidèle |
| DÉSYNCHRO (rare, 2, 40) | — | Encaisser un coup te fait passer à travers tout. | traversée de 700 n ms après un coup | fidèle |
| DILATATION (épique, 2, 20) | — | Le temps se fige dès qu'un ennemi te frôle. | le monde entier, joueuse comprise, passe à 0,82 / 0,64 quand il ne reste que **3 segments ou moins** ; sinon `S.timeScale` est remis à 1 à chaque pas de simulation (10-core.js:358-362), après le déclenchement de l'ultime : *d'après le code*, il **annule le ralenti de l'APOGÉE** | ment, et conflit |
| TIRS SPECTRAUX (rare, 1, 34) | une arme à projectiles | Tes tirs ignorent blindages et boucliers. | blindage brisé d'emblée, boucliers d'arc ignorés (22-enemies.js:1137, 1201) | fidèle |
| DÉPHASAGE (épique, 2, 18) | CANON ≥ 2 | Encaisser un coup te fait traverser la matière un instant. | le même drapeau que DÉSYNCHRO ; l'« écho » prévu (un fantôme qui rejoue le canon à 45 %) n'a jamais été écrit | doublon |
| MARCHE DU VIDE (ultra, 1, 6) | PHASE ≥ 2 et 12 segments | Traversée permanente, au prix d'un segment toutes les quinze secondes. | traversée permanente des ennemis ; **le prix n'est pas codé** ; les tirs touchent toujours ; coupe ÉPINES et ÉPERON (le bloc de contact est sauté en traversée, 10-core.js:972-997) | ment, anti-synergie |

### Transversal (7 cartes)

| Carte | Condition | Texte | Ce que fait le code | Verdict |
|---|---|---|---|---|
| PUISSANCE (commune, 5, 82) | — | Toutes tes armes frappent plus fort. | + 15 % par point, armes seulement | fidèle (audit : + 14 % de kills à × 5) |
| CADENCE (commune, 5, 78) | — | Toutes tes armes tirent plus vite. | recharges ÷ (1 + 0,10 n) | fidèle (audit : + 4 %) |
| PORTÉE (commune, 4, 62) | — | Tes armes accrochent leurs cibles de bien plus loin. | + 12 % par point | fidèle (audit : 0 %) |
| AIMANT (commune, 3, 58) | — | Les ressources viennent à toi de bien plus loin. | rayon d'aimant 200 + 90 n u | fidèle |
| ANALYSE (commune, 3, 50) | — | Chaque fragment rapporte davantage d'expérience. | XP × (1 + 0,25 n) | fidèle |
| RÉACTEUR (rare, 3, 40) | — | Ta surcharge se recharge beaucoup plus vite. | seuil de l'ultime − 12 par prise (55 au plus bas) ; charge par le boost × (1 + 0,3 n), pas celle des kills | presque |
| SANG-FROID (épique, 1, 16) | — | Prendre un coup ne casse plus ton multiplicateur. | le combo n'est plus divisé par deux au coup reçu | fidèle (audit : score × 2,3) |

### Bilan du vivier
- **13 textes trompeurs** : CONDUCTEURS, IONISATION, DÉTONATION, PRISME, POINT FAIBLE, OGIVE, CHARGE
  CREUSE, GRAPPE, NAPALM, SINGULARITÉ, PLASMA ÉPAIS, DILATATION, MARCHE DU VIDE (DÉTONATION, GRAPPE et
  NAPALM font **mieux** que promis).
- **Doublons** : DÉPHASAGE = DÉSYNCHRO ; CONDUCTEURS, IONISATION et CHAMP TESLA nourrissent un seul
  compteur.
- **Bogues et conflits** (*d'après le code*) : AGILITÉ perdue au premier parasite, DILATATION contre
  l'ultime, canons de BORDÉE ARRIÈRE dessinés de côté, ricochet écrasé par le flak et les missiles.
- **Cartes qui ne font rien seules** : CHARGE CREUSE, SINGULARITÉ ; la deuxième prise de PRISME.
- **En mieux.** Un vivier où **chaque carte change quelque chose que l'on voit** sur le serpent ou à
  l'écran, avec son chiffre écrit, et un test automatique par carte qui vérifie que l'effet mesuré
  correspond au texte (l'audit l'a fait à la main, carte par carte, et c'est ce qui a trouvé la moitié de
  ces défauts).

---

## 7. Synergies et anti-synergies

### Y1. « Tout explose » : les morts en chaîne
- **Quoi.** `deathEffects` (10-core.js:697-755), appelé à **chaque** mort : GRAPPE ou DÉTONATION (une
  « bombe »), RÉACTION (une chaîne de trois générations), CHARGE CREUSE (rayon et dégâts), NAPALM (une
  flaque par mort), SINGULARITÉ (regroupe pour la suivante), CAPACITEUR (trois arcs depuis le cadavre).
  Chaque explosion de mort fait plonger la musique un instant (`duckMusic`).
- **Pourquoi c'est bien.** Le meilleur rapport spectacle / décision du jeu, et l'audit le mesurait comme
  ce qui change le plus le résultat après les armes (DÉTONATION + 33 %, RÉACTION + 30 %, NAPALM + 27 %,
  GRAPPE + 22 %, CAPACITEUR + 37 %).
- **En mieux.** C'est l'« explosion énorme » voulue par DIRECTION.md, mais **répétée** : sous le limiteur
  (trois flashs par seconde), une cascade doit partir **en une seule rafale** (les départs à moins de trois
  images comptent pour un seul flash, 50-fx.js:104, 235-237) ou en anneaux tramés sans aplat. Nommer la
  cascade (« RÉACTION × 7 ») et en faire un défi (ARTIFICIER : trois explosions en chaîne en moins de 2 s,
  déjà proposé en G-22).

### Y2. « Le corps lame »
- **Quoi.** CROISSANCE (longueur) → TOURELLES (une tous les 1,6 à 4 segments) + ÉPINES (le corps déchire) +
  BOUCLIER ou CITADELLE ; le corps au-delà du 8e anneau absorbe les tirs (10-core.js:877-890).
- **Pourquoi c'est bien.** La fantaisie du serpent : plus long = plus armé, plus dangereux à frôler.
- **En mieux.** Voir A2 ; et, puisque la démo « protège trop » (RETOURS-PROPRIETAIRE.md, point 4),
  l'absorption des tirs par le corps devient **une carte** (ÉCAILLES, par exemple : au-delà du 8e
  segment, le corps absorbe et recharge le boost) au lieu d'un acquis de départ.

### Y3. « Le bolide »
- **Quoi.** PROPULSEURS + RÉSERVE + POSTCOMBUSTION → ÉPERON (contact = dégâts, immunité au contact en
  boost) + INERTIE (+ 18 % par point en boost) + MUR DU SON (390/s devant la tête).
- **Défauts.** L'audit : les cartes de vitesse sans arme sont un piège (le pilote parfait mourait dans deux
  parties sur quatre avant 40 s avec canon 1 et cartes de vitesse).
- **En mieux.** Le boost se déclenche en poussant le manche (§ 8) ; les cartes de vitesse ne sont offertes
  qu'avec une arme au palier 2 (PROG-8).

### Y4. « L'orage »
- **Quoi.** ARC + SURTENSION + l'aura (CONDUCTEURS, IONISATION, CHAMP TESLA) + DÉTONATION + CAPACITEUR.
- **En mieux.** Trois cartes d'aura → une seule à trois paliers ; IONISATION devient vraie (marque visible
  d'un pixel `cyanPale` sur l'ennemi, + 25 % de dégâts).

### Y5. « La forteresse mobile »
- **Quoi.** DRONES (interception) + ONDE (efface les tirs) + SILLAGE ultime (mur qui avale) + BOUCLIER.
- **En mieux.** À doser : c'est la construction qui rend intouchable ; 2975 veut « pouvoir mourir ».

### Les anti-synergies
- MARCHE DU VIDE, TRAVERSÉE et DÉSYNCHRO coupent ÉPINES et ÉPERON : tout le contact est ignoré en
  traversée (10-core.js:972).
- L'ONDE repousse ce que les MINES aimantent, ce que les filins et l'ÉPERON veulent toucher, ce que le
  lasso veut enfermer.
- DILATATION annule le ralenti de l'APOGÉE.
- PRISME ne marche pas avec le flak ni les missiles.
- OGIVE est réclamée par les armes explosives et n'aide que les balles.
- SINGULARITÉ ne fait rien sans une carte de mort absente de sa condition.

### En mieux : des écoles nommées et des évolutions
2030 nomme déjà la construction à l'écran de fin (axe dominant + arme la plus haute : « ÉLECTRICIEN —
ARC 6 », 26-ui.js:1338-1349 ; écoles ÉLECTRICIEN, TIREUR, ARTIFICIER, COUREUR, BLINDÉ, SPECTRE,
TECHNICIEN). En 2975 (*proposition*) : l'école s'annonce **pendant** la partie dès trois cartes du même
axe (« ÉCOLE : ARTIFICIER »), et chaque arme a une **évolution** explicite à deux clés (ultime de l'arme +
une carte passive précise, comme dans Vampire Survivors), annoncée sur la carte, à la place des ultras à
prérequis cachés.

---

## 8. Pouvoirs, boost et ultime : les choix pendant l'action

### P1. Le boost
- **Quoi.** × 1,9 de vitesse, 34 de réserve par seconde (− 16 % par POSTCOMBUSTION), recharge 22/s (0 →
  100 en 4,5 s), panne franche à vide (reprise à 10 sur nouvel appui, à 25 seule) ; départ : six traînées
  par image sur trois images (10-core.js:252-287). Le corps absorbe les tirs au-delà du 8e anneau, + 1 de
  réserve chacun. Le boost charge l'ultime de 3 par seconde.
- **Pourquoi c'est bien.** Une réserve à gérer, un risque (on fonce dans la foule), et avec ÉPERON une arme.
- **En mieux.** **Pas de bouton** : boost en poussant le manche au-delà de 80 % de son rayon (J-08 ;
  90-boot.js de 2975 fournit déjà `S.input.mag` de 0 à 1). Jauge en arc autour de la tête (voir
  `inventaire-coeur.md`, D2).

### P2. Trois pouvoirs, un bouton
- **Quoi.** `27-phases.js:533-707`. **TRAVERSÉE** ◈ (dès le départ, recharge 7 s) : traversée et
  invulnérabilité 2,2 s + 0,7 s par PHASE, repousse et blesse (6) ce qui est à 240 u. **RALENTI** ◐ (débloqué
  à 25 kills, 11 s) : ennemis et tirs à 0,35 pendant 4,2 s, pas la joueuse. **REPLI** ❖ (à 60 kills, 13 s) :
  − 35 % de segments pendant 8 s, tête 1,5 × plus grosse, + 12 % de vitesse, **dégâts × 1,8** ; les segments
  reviennent. Le bouton lance le prochain pouvoir prêt, dans l'ordre.
- **Pourquoi c'est bien.** Trois verbes très différents ; le REPLI troque la longueur contre la force.
- **Défauts.** Débloqués après la mort médiane (audit : 45 et 53 s contre 42 s) ; l'ordre du bouton est
  imprévisible ; un bouton de plus.
- **En mieux.** Les pouvoirs deviennent **des cartes** (on choisit RALENTI ou REPLI au lieu de les recevoir
  à un compte de kills) ; déclenchement sans bouton, par un toucher bref sans glisser n'importe où, comme
  le propose `inventaire-coeur.md` (G1) — 90-boot.js de 2975 ignore aujourd'hui le second doigt et ne
  publie aucun toucher bref : il faudra un champ d'entrée de plus.

### P3. L'ultime APOGÉE
- **Quoi.** Seuil 100 (80 avec CONDENSATEUR, − 12 par RÉACTEUR jusqu'à 55). Charge : 6 × √(12 / max(12,
  xpNext)) par kill, + 22 par élite, + 20 par noyau, + 3/s en boost, + 50 par boss. Effet (90-boot.js:396-430) :
  ralenti 0,25 pendant 420 ms, flash 0,4 de 120 ms, secousse 18, **six anneaux à 90 ms** (160 → 1 100 u),
  chacun 40 + 10 × secteur à ce qu'il couvre : un ennemi proche prend les six (300 au secteur 1). Toast
  « APOGÉE PRÊT » et son `ultReady`.
- **Défauts.** L'écran de fin doit rappeler « Ton ultime était prêt à … et n'a pas servi » : on l'oublie ;
  avant G7, une surcharge toutes les 0,7 s en fin de partie.
- **En mieux.** Voir `inventaire-coeur.md` (F1) : anneaux tramés, gel, une au plus par 45 s, sans bouton.
  Dans mon domaine : **l'ultime de la joueuse prend le style de son école** (orage d'arcs pour
  l'ÉLECTRICIEN, nuée pour l'ARTIFICIER, bordée totale pour le TIREUR…) ; un seul flash compté, les
  anneaux suivants en contours.

---

## 9. L'économie d'une partie : butin, XP, multiplicateur, crédits

(Le détail du butin et du multiplicateur est aussi dans `inventaire-coeur.md`, B2, E1, E4.)

### E1. Le butin
- **Quoi.** Chaque ennemi lâche `loot` cellules d'énergie (1 par défaut, élite + 3), un **noyau** avec la
  probabilité `coreP` (traqueur 3 %, brouilleur 40 %, élite + 55 %), un **soin** avec 1,5 % (+ 12 % élite)
  (22-enemies.js:490-500). Énergie : 1 XP, 5 points, 35 % de chances de + 1 segment. Noyau : 8 XP,
  60 points, + 20 d'ultime, + 1 segment. Soin : + 3 segments. Aimant 200 u (+ 90 par AIMANT), attraction
  jusqu'à 900 u/s ; expiration à 10 s (clignote les deux dernières) ; fusion de trois cellules à moins de
  30 u (deux au-delà de 60 butins) ; plafond 400 (10-core.js:999-1072). Le VOLEUR empoche le butin au sol
  et file ; tué, il rend tout en un noyau, plus une prime.
- **Récompenses de rythme.** Fin de secteur : un noyau de valeur 3 et un soin. Boss abattu : main de
  trophée, + 60 crédits, + 50 d'ultime, bannière « + 60 ◆ » (25-levels.js:724-746).
- **En mieux.** Une ressource, une couleur : la cellule `ambre` (déjà dans la démo : + 1 segment, + 10 ×
  multiplicateur, ramassage à 8 px, aimant à 28 px, 70-game.js:65, 976-986) donne **aussi de l'XP** ; le
  noyau = grosse cellule à cœur `jaune` lâchée par élites et boss, qui charge l'ultime. Aucune ressource
  verte ni cyan. Fusion et expiration comme 2030.

### E2. L'expérience
- **Quoi.** Kill = XP de l'ennemi × (1 + 0,15 × (secteur − 1)) ; xpNext part à 6 puis
  round(xpNext × 1,12 + 6) : 6, 13, 21, 30, 40, 51, 63, 77, 92, 109 (502 XP pour dix cartes) ;
  ANALYSE × (1 + 0,25 n) (10-core.js:813-821). Objectif de G7 : première carte vers 12 s, 1,5 à
  3,5 cartes par minute pendant dix minutes.
- **En mieux.** Pour une démo de deux minutes : six à huit cartes (une toutes les 15 à 20 s), assez pour
  voir l'ultime d'une arme à quatre paliers.

### E3. Le multiplicateur de combo
- **Quoi.** + 0,5 tous les trois kills, plafond × 12 (× 16 en surcharge), fenêtre 5 s (7 s dès × 3), un coup
  divise le combo par deux (SANG-FROID le garde), son `multUp` à × 2 / 4 / 8 / 12 / 16 (10-core.js:622-693).
- **En mieux.** La démo dérive le multiplicateur de la **longueur** (`min(8, 1 + ⌊longueur / 8⌋)`,
  70-game.js:472) : ramasser suffit à scorer. Le combo de 2030 récompense l'agressivité (J-11) et donne
  son sens à SANG-FROID.

### E4. Les crédits
- **Quoi.** + 1 par kill, + 5 par élite, + 60 par boss (`S.coins`), versés au total persistant à la fin de
  la partie (26-ui.js:1403).
- **Défauts.** L'audit : 5 à 75 crédits par partie pour un débutant, 3 000 à 5 000 pour une partie parfaite
  de dix minutes ; soit 25 à 250 parties pour le premier article, soit toute la boutique en une fois.
- **En mieux.** Une seule monnaie, l'énergie ramassée (G-04 : « l'énergie ramassée s'ajoute à un total
  persistant »), avec un apport par partie plafonné et un bonus de niveau atteint.

---

## 10. La progression d'une partie à l'autre

### M1. La boutique de déblocages
- **Quoi.** 26-ui.js:58-68 et 1185-1209 ; effets dans 90-boot.js:1368-1377 :

| Déblocage | Prix | Effet |
|---|---|---|
| BIO-RALLONGE ⌁ | 120 | départ à + 3 segments |
| RÉACTEUR » | 180 | réserve de boost 125 |
| CANON LOURD ▲ | 240 | canon frontal au palier 2 |
| CONDENSATEUR ★ | 320 | seuil de l'ultime à 80 |
| PARE-CHOCS ◈ | 400 | une charge de bouclier au départ (le texte promettait « une seconde d'invulnérabilité » avant G14) |
| ORACLE ◇ | 520 | raretés plus fréquentes (C7 ; ne faisait rien avant correction) |

  Total : 1 780 crédits. Bouton DÉBLOCAGES au menu ; à l'écran de fin, la barre du prochain déblocage y
  mène.
- **Défauts.** L'audit : les six déblocages ne changent pas la survie d'un bon joueur (+ 13 s pour un
  joueur passif) ; aucun contenu nouveau ; deux articles sur six ne faisaient pas ce qu'ils disaient.
- **En mieux.** **Débloquer du contenu, jamais de la puissance plate** : armes de départ (commencer avec
  l'ARC, les TOURELLES ou le SILLAGE au lieu du canon), cartes qui entrent au vivier une fois débloquées
  (montrées grisées avant), styles de règles, palettes par échange d'index (V-12) — c'est la proposition
  PROG-13 de l'audit, jamais faite, et le G-04 / G-05 de la recherche. Les étoiles des trois défis de
  chaque niveau ouvrent styles et modes, jamais la campagne (G-21, G-25).

### M2. Les records et l'écran de fin
- **Quoi.** `S.stats` dans `localStorage` (`snake2030.v1`) : meilleur score, record par cran (5),
  meilleur niveau, meilleur temps, boss abattus, crédits, parties, déblocages (90-boot.js:1452-1470).
  L'écran de fin (26-ui.js:1408-1460) dit qui a tué et où (« Détruit par … — niveau n — x % du
  secteur »), le combo max, la meilleure arme (« ARC ÉLECTRIQUE 6 »), le libellé de construction, les
  cartes prises en icônes avec leur niveau, l'écart avec la partie précédente et le record du cran, un
  seul conseil, la barre « PROCHAIN DÉBLOCAGE : … dans N ◆ », et « REJOUER AU CRAN SUPÉRIEUR » après le
  secteur 3.
- **Pourquoi c'est bien.** Une fin qui explique et donne la marche suivante (G-03).
- **En mieux.** La même fiche, en gros pixels : la **silhouette du serpent avec ses modules** à la fin de
  la partie (tourelles, drones, sillage), le nom de l'école, les cartes en icônes 11 × 11. Sauvegarde
  durable (`navigator.storage.persist()` et code d'export, V-40). À trancher : en campagne (25 niveaux
  de 2 min 30, recherche 3.1), une construction dure-t-elle un niveau ou un chapitre de cinq ? Un
  chapitre (≈ 13 min, 20 à 30 cartes) ressemble le plus à une partie de 2030 ; il faut alors sauvegarder
  la construction à chaque fin de niveau (G-08, V-40).

---

## 11. Les contraintes de SNAKE 2975 qui changent la façon de reprendre

1. **Échelle.** 1 px ≈ 4 u : portée de l'arc 58-108 px, recherche des missiles 180 px, rayon de l'onde
   28-63 px, souffle des mines 18-38 px, orbite des drones 14-24 px, rayon du sillage 4-7 px, rayon de
   l'ultime du canon ≈ 130 px, explosion de mort 18-38 px, aimant de 2030 ≈ 50 px (la démo : 28 px).
2. **Palette.** Arsenal en `cyan` / `cyanPale` (+ `os` à l'impact) ; danger `magenta` / `rosePale` / `sang` ;
   butin `ambre` / `jaune` ; feu `brasier` → `jaune` → `os`. Le masque de la joueuse du critère 3 doit
   inclure ses armes. Huit couleurs d'arme et sept d'axe sont impossibles : l'identité passe par la
   forme (V-10).
3. **Flashs** (50-fx.js:216-252). Seuil ≈ 5 431 pixels de jeu sur iPhone 13 paysage (le plus petit de
   21 824 px CSS² / 4 et 6,6 % de 422 × 195). Une explosion moyenne (force ≤ 0,6, rayon 4 + 50 × force
   px, au plus ≈ 2 700 px² comptés) reste sous le seuil **seule**, mais les départs à moins de trois
   images s'additionnent ; trois flashs par seconde au plus, dont deux moyens. Un arsenal explosif doit
   donc faire de petites explosions (force ≤ 0,3, rayon ≤ 19 px), des contours plutôt que des aplats, et
   laisser la troisième place à la grosse.
4. **Gel d'image.** La démo gèle deux à trois images par kill, au plus toutes les 0,12 s de jeu
   (70-game.js:916) : avec un arsenal qui tue par dizaines, six à huit gels par seconde, un cinquième à un
   quart du temps figé (calcul). Réserver le gel aux élites, au boss, à ENCERCLÉ et à l'ultime.
5. **Budgets.** 400 particules, 24 explosions, 160 tirs joueur, 140 tirs ennemis : chaque arme a son
   réservoir fixe (2030 : 700 projectiles, 72 mines, 256 nœuds).
6. **Un pouce** (J-07, J-08, G-19). Aucun bouton : tir automatique, boost au manche poussé, pouvoir et
   ultime par un toucher bref ou automatiques ; cartes choisies d'un toucher protégé.
7. **Son** (30-music.js:26-42). Sept sons (`tir`, `kill`, `bigkill`, `degat`, `butin`, `intro`, `defi`) et
   un neutre. Les gardes FUSION (22 à 400 ms), plafond de voix et USURE (g = 1 / √(1 + k (d − 1))) sont
   faites pour des armes automatiques. Tempo 112-128 BPM : double croche de 0,117 à 0,134 s, mesure de
   1,9 à 2,1 s ; des cadences d'arme posées sur la grille donnent G-33 (« les tirs dans le tempo »).
8. **Contrat.** CONTRAT.md n'a pas de module d'armes : tout est dans 70-game.js. Huit armes et un vivier
   de cartes justifient un propriétaire à eux (par exemple `N.arsenal` et `N.cartes`).
9. **Difficulté.** La propriétaire trouve la démo trop facile et veut une vraie mort : chaque carte
   défensive doit être forte sans rendre intouchable (le BOUCLIER mal lu de 2030 l'a montré), et la
   difficulté doit suivre la puissance de feu (PV par secteur, comme G9).

### Esquisse d'arsenal pour 2975 (*proposition*)

| Arme | Rôle | Palier 1 | Palier 2 | Palier 3 | ULTIME | En pixels | Son |
|---|---|---|---|---|---|---|---|
| CANON | devant | 6,5 tirs/s (la démo) | deux bouches | lances qui percent | RAYON ≈ 130 px qui efface les tirs | trait 7 × 7 → ligne de 3 px tramée | `tir` pentatonique |
| TOURELLES | flancs, longueur | 1 tous les 6 segments, ± 25° | les deux flancs, 1 tous les 4 | rafale de deux | BORDÉE EN VAGUE, 1 tous les 2 | module 3 × 3 sur la perle | pincements fusionnés |
| SILLAGE | derrière, LASSO | trace 0,9 s, ENCERCLÉ dès ici | plus longue, freine | gerbes, boucle plus forte | MUR qui avale les tirs | trace d'un pixel tramée par l'âge | souffle, accent sur ENCERCLÉ |
| ARC | à distance | 3 sauts, 60 px | 4 sauts | deux arcs | ORAGE : quatre arcs de huit sauts, tête et queue | polyligne, nœuds `os` 3 × 3 | crépitement à la double croche |
| MISSILES | priorité | 2 missiles, élites d'abord | 3 | sous-munitions | NUÉE de six | 3 × 5, traînée, crochets de verrouillage | souffle montant, médiums |
| DRONES | autour | 1 satellite, orbite 15 px | 2, interceptent | 3, filin | ANNEAU de six fermé | satellite 5 × 5, filin pointillé | clics |
| ONDE | contrôle | anneau 28 px toutes les deux mesures, télégraphe | efface les tirs → cellules `ambre` | freine | DÉFERLANTE et aura | anneau tramé qui se troue | grosse caisse sur le temps fort |
| MINES | zone | losange 5 × 5, souffle 18 px | deux mines | sous-charges | SINGULARITÉ : aspire puis souffle | losange `cyan` qui bat | bip grave à la pose |

Passifs à garder (douze, *proposition*) : PUISSANCE, CADENCE, AIMANT, CROISSANCE, BOUCLIER, RÉPARATION,
ÉPINES, ÉPERON, SURTENSION, PERFORATION, GRAPPE (« toute mort explose », écrit honnêtement), SANG-FROID ;
plus les pouvoirs en cartes (TRAVERSÉE, RALENTI, REPLI). Vingt à vingt-quatre cartes à apprendre au lieu
de 53, chacune visible.

---

## 12. Les dix idées les plus importantes, classées

1. **Le choix d'une carte à chaque montée de niveau, dans un vivier qui forme des constructions** (C1-C8,
   § 6) : la boucle XP → choix toutes les 15 à 30 s est le moteur du genre (Survivor.io, Vampire
   Survivors) ; c'est ce qui manque le plus à 2975, où la joueuse ne prend **aucune** décision.
2. **Un arsenal automatique de huit armes à rôles spatiaux, qui se cumulent** (S1, A1-A8) : devant, flancs,
   derrière, autour, à distance. Il remplace « un canon qui tire plus de balles » et donne du sens à
   chaque trajectoire.
3. **Des paliers qui changent la forme de l'arme jusqu'à un ULTIME spectaculaire** (S2) : rayon, bordée en
   vague, mur de plasma, orage, nuée, anneau, déferlante, singularité ; en quatre paliers pour qu'on le
   voie à chaque partie.
4. **Le corps comme arsenal** (A2, A3, A8, Y2) : tourelles dont le nombre suit la longueur, sillage et mines
   à la queue, épines, absorption des tirs gagnée par une carte : la longueur devient puissance, armure et
   munitions.
5. **ENCERCLÉ, le lasso** (A3) : boucler sa trajectoire fait détoner ce qui est dedans ; à promouvoir de
   mécanique cachée du palier 3 au verbe central de SNAKE 2975.
6. **Les morts en chaîne** (Y1) : « toute mort explose », cascades, flaques, aspiration, arcs depuis les
   cadavres — le spectacle d'explosions que DIRECTION.md réclame, tenu sous le limiteur de flashs.
7. **Le boost-arme** (P1, Y3) : ÉPERON, MUR DU SON, INERTIE, POSTCOMBUSTION, déclenché en poussant le
   manche, sans bouton.
8. **Les pouvoirs et l'ultime** (P2, P3) : TRAVERSÉE, RALENTI, REPLI et l'APOGÉE qui vide l'écran, refaits
   pour un pouce et choisis comme des cartes.
9. **Des récompenses qui rythment la partie** (C6, E1, E3) : main de trophée du boss, noyau triple de fin de
   secteur, fontaine de butin fusionné, multiplicateur de combo.
10. **Une progression entre parties honnête** (M1, M2) : écran de fin qui nomme l'école et le prochain
    déblocage ; déblocages de contenu (armes de départ, cartes, styles) au lieu de bonus plats.

---

## 13. Ce que la démo actuelle de SNAKE 2975 n'a pas

### Dans `70-game.js`
- **Une seule arme**, le canon frontal : 6,5 tirs/s (× 1,35 en surcharge, × 1,4 avec Espace au clavier),
  210 px/s, 1,4 s, 1 dégât (2 en surcharge) (l. 66, 514-530). Sa seule évolution suit la longueur :
  1 tir sous 10 segments, 2 sous 20, 3 sous 32, puis 5 (l. 520-523). Pas de perforation, de zone,
  d'autoguidage, de chaîne, de rayon, de palier ni d'ultime ; aucune arme visible sur le corps.
- **Aucune décision** : ni XP, ni montée de niveau, ni carte, ni rareté, ni synergie, ni école. La seule
  amélioration est le TIR SURCHARGÉ, gagné une fois par le défi « dix kills en chaîne » (avec + 5 000 et
  + 1 vie, l. 576-583).
- **Aucun pouvoir, aucun ultime, aucun boost.** Le seul effet de zone de la joueuse est le choc de la
  blessure (tirs éteints à 46 px, ennemis repoussés à 44 px, l. 543-554).
- **Le corps ne fait qu'absorber les tirs** (l. 946-951) : ni tourelles, ni épines, ni sillage, ni mines,
  ni drones, ni lasso — alors que la démo enregistre déjà un point par pixel de trajet (l. 399).
- **Une économie à un seul effet** : la cellule ambre donne + 1 segment et + 10 × multiplicateur
  (l. 980-986) ; le multiplicateur vient de la longueur, pas du combo (l. 472) ; pas de noyau, de soin,
  d'aimant réglable (28 px fixes), de fusion ; le colosse ne paie que 24 cellules et 10 000 points
  (l. 82, 767) ; aucune monnaie, aucun déblocage ; seul un record est gardé (l. 74, 1103).
- **Défauts visibles dans mon domaine.** L'éventail à cinq tirs est bancal : deux tirs parallèles, puis
  − 0,16, + 0,16 et − 0,32 rad, sans + 0,32 (l. 523). Un choc coupe 30 % de la longueur (l. 556-563), donc
  à la fois des canons, du multiplicateur et du bouclier : une triple peine. L'échelle de PV (1 à 4,
  colosse 120) ne permet aucune amélioration fine.

### Dans `50-fx.js`
- L'interface publiée (l. 792-803) offre `boom`, `hitstop`, `shake`, `hit` / `isHit`, `spark`, `trail`,
  `flashGate` : **rien pour un rayon, un éclair, une onde, une aura, une zone qui dure (cratère, flaque,
  mur), un verrouillage**. Les anneaux existent mais seulement à l'intérieur des explosions ; `N.gfx`
  fournit les primitives (`line`, `ring` tramé, `ditherCirc`, `disc`), il manque les effets.
- Le limiteur (trois flashs par seconde) et le gel par kill sont dimensionnés pour quelques morts à la
  fois, pas pour des cascades.

### Dans `30-music.js`
- **Sept sons et un neutre** (l. 498-590) : aucun son d'arme (arc, missile, mine, onde, rayon, drone,
  tourelle), ni de montée de niveau, de carte, de rareté, d'ultime prêt ou déclenché, de bouclier, de
  palier ultime, d'ENCERCLÉ ou de cascade. Le moteur a pourtant ce qu'il faut pour les accueillir :
  tonalité courante, pentatonique, fusion et usure.
