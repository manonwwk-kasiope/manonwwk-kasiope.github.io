# Mesure indépendante — l'artilleur a-t-il encore une substance ?

Mesure faite par le pilote de la chaîne, hors implémenteur et hors exécuteur, avec
`snake2030/tools/test/G6/mesure-artilleur.mjs` : huit parties simulées par build, graines 6000 à 6007, difficulté 1,25,
fenêtre 1440×900, build courant et build du commit `f1a0b5d` mesurés dans la même session.

Le seuil « coups de balle ≤ 25 % du total » peut être atteint de deux façons : en rendant les balles
évitables, ou en retirant l'artilleur du jeu. Les deux donnent le même chiffre au test 1. Voici ce qui
les sépare.

## Ramené à cent secondes de jeu

| | référence `f1a0b5d` | build courant | rapport |
|---|---|---|---|
| artilleurs apparus | 4,58 | 1,07 | ÷ 4,3 |
| salves tirées | 12,77 | 0,86 | ÷ 14,8 |
| balles arrivées sur le serpent | 1,60 | 0,24 | ÷ 6,8 |
| ennemis apparus, tous types | 43,2 | 36,4 | ÷ 1,19 |
| part de l'artilleur dans la population | 10,6 % | 2,9 % | ÷ 3,7 |
| taux de touche des balles tirées | 12,5 % | 27,3 % | × 2,2 |
| part des images d'artilleur passées dans le champ | 39,7 % | 30,1 % | × 0,76 |
| survie moyenne d'une partie | 682 s | 1111 s | × 1,63 |

## Lecture

Deux tiers de la chute des salves viennent du contrat lui-même et ne sont pas discutables : la
spécification interdit d'ouvrir une fenêtre d'armement hors champ, or un artilleur passe soixante-dix
pour cent de sa vie hors champ. Un artilleur tire donc mécaniquement trois fois moins. Le reste vient du
levier d'exposition que le médiateur avait lui-même désigné à la tentative 2 : la part de l'artilleur
dans la population tombe de 10,6 % à 2,9 %.

Ce qui plaide pour la substance conservée : le taux de touche double, de 12,5 à 27,3 %. Les balles qui
partent maintenant sont tirées de près, depuis un ennemi visible, et elles portent. L'artilleur n'a pas
été désarmé, il a été rendu lisible et rare.

Ce qui doit rester ouvert : à 1,07 apparition pour cent secondes, l'artilleur devient un ennemi
occasionnel là où il était structurant. Et la survie moyenne augmente de soixante-trois pour cent, alors
que G6 portait sur la lisibilité et non sur la difficulté. Ces deux effets appellent un rééquilibrage
des vagues quand le directeur de difficulté de G9 existera, et non un retour en arrière ici.

## Ce que cela ne dit pas

La mesure porte sur huit parties par build, à difficulté 1,25 et sur une seule fenêtre, avec un pilote
automatique dont le jeu n'est pas celui d'une personne. Elle établit des ordres de grandeur, pas des
valeurs d'équilibrage.

# Deuxième vérification — le compte d'anneaux du test 5 est inatteignable par arithmétique

Le test 5 demande « ≤ 1 coup par ruée (40 → ≥ 38 segments) ». La mesure donne deux ruées, deux coups,
soit exactement un coup par ruée — le critère est tenu — mais le serpent tombe à 36 anneaux et non 38.

La parenthèse suppose qu'un coup de trancheur coûte un anneau. Il en coûte deux : `dmg: 2` dans
`defs.cutter`, valeur identique dans le commit de référence `f1a0b5d` et dans le build courant. Avec deux
charges et un coup par ruée, le plancher est 40 − 2 × 2 = 36. Atteindre 38 exigerait un seul coup au
total, ce qui contredit la première moitié de la même phrase.

C'est une erreur de la spécification, pas un manquement du build : la parenthèse a été écrite en
supposant un dégât unitaire que l'ennemi n'a jamais eu. Le critère opérant, un coup par ruée, est tenu.
Rien dans le build ne doit être changé pour cela ; c'est la parenthèse qui est fausse.

# Avertissement — la batterie de 06:38 a été mesurée sur une machine occupée, par ma faute

Le pilote de la chaîne a lancé une expérience nulle sur le banc entre 06:42 et 06:50, alors que la
batterie de non-régression de l'implémenteur tournait depuis 06:38. Les deux se sont disputé la machine
pendant huit des onze minutes du banc. Le résultat de cette exécution — échec sur
`iphone/plat-treillis`, p95 6,9 ms contre 5,9, soit 1,169 — n'est pas imputable au build. La signature
de la contention est visible : les huit rapports de médiane montent tous, de 1,022 à 1,085, alors que la
même exécution sur machine calme à 06:20 donnait de 1,007 à 1,068.

Seule une exécution sur machine calme fait foi. C'est une faute de conduite du pilote, pas un manquement
de l'implémenteur, et elle ne doit peser ni dans le verdict ni dans le décompte des tentatives.

# Ce que le banc dit vraiment du coût de G6

Sur machine calme, à scène figée et à contenu identique, les huit rapports de médiane sont tous au-dessus
de un : 1,007 à 1,068 selon le régime et le profil. À build identique des deux côtés, ces mêmes rapports
se tiennent entre 0,98 et 1,02. G6 coûte donc réellement quelques pour cent de temps d'image, de l'ordre
de trois à sept, et c'est cohérent d'une session à l'autre. C'est sous la tolérance de dix pour cent, et
cela s'explique : chevrons de bord, portails, marqueurs permanents et test d'absorption sont du travail
en plus à chaque image. Ce n'est pas du bruit et il ne faut pas le présenter comme tel.

# Le calendrier des vagues, avant et après, effectif cumulé

Compté sur `src/25-levels.js`, somme des effectifs de toutes les entrées de vague, commit `f1a0b5d`
contre build courant.

| type | avant | après |
|---|---|---|
| artilleur | 18 | 7 |
| traqueur | 42 | 50 |
| intercepteur | 23 | 25 |
| parasite | 10 | 12 |
| trancheur | 8 | 8 |
| mine | 12 | 12 |
| miroir | 5 | 5 |
| brouilleur | 4 | 4 |
| pondeuse | 1 | 1 |
| **total** | **123** | **124** |

La pression totale est conservée à une unité près. L'artilleur perd soixante et un pour cent de son
effectif et tombe de 14,6 à 5,6 pour cent des apparitions programmées ; les onze places libérées sont
rendues au traqueur, à l'intercepteur et au parasite. Aucun type n'est supprimé, aucune place n'est
perdue. C'est exactement le levier d'exposition que le médiateur avait désigné, appliqué sans vider le
jeu de sa substance — mais appliqué fort, d'où la réserve pour G9 ci-dessus.

# Vérification manquante comblée — les chevrons de portail, en pixels, sur iPhone

Le test 3 ne tournait qu'en 1440 × 900. Or l'iPhone 13 en paysage fait 844 × 390 points, avec un zoom
tactile de 1,30 : la bande de quarante pixels du cadre y représente une fraction bien plus grande de
l'écran, et rien ne garantissait que les chevrons s'y dessinent au bon endroit. Le script du pilote
`G6/pilote-t3-iphone.mjs` reprend le test 3 sans changer un seuil ; seule la ligne de lancement du
navigateur diffère, et le résultat est écrit sous un nom distinct pour ne pas écraser celui de
l'exécuteur.

| mesure | seuil | iPhone 13 paysage | bureau 1440 × 900 |
|---|---|---|---|
| apparitions précédées d'un portail 550-650 ms avant | ≥ 95 % | **100 %** (167/167) | 100 % (170/170) |
| portails avec ≥ 100 pixels modifiés dans la bande du cadre | toutes | 167/167 | 170/170 |
| bruit de fond de la bande, p95 | — | 24 pixels | — |

La séparation entre le signal et le bruit est nette : vingt-quatre pixels de bruit au p95 contre cent
exigés. La lisibilité des menaces est donc démontrée sur la plateforme de la joueuse, en pixels réellement
rendus, et plus seulement par analogie avec le bureau.

# Contrôle d'intégrité de la mesure — le pilote de simulation est aveugle aux annonces

L'implémenteur affirme que le pilote automatique ne lit aucun télégraphe, donc que le rapport « part des
coups de balle » ne peut pas s'améliorer parce que le robot aurait appris à lire les annonces. C'est
l'affirmation dont tout le reste dépend : si elle était fausse, le chiffre mesurerait l'adresse du robot
et non la lisibilité du jeu. Vérifiée indépendamment dans `tools/test/simlib.mjs`.

Le pilote lit deux choses, et deux seulement : les positions des ennemis, et les balles **déjà en vol** à
moins de 240 unités, contre lesquelles il applique une poussée perpendiculaire pondérée par la distance
et par le rapprochement. Aucune occurrence de `aimT`, `aimA`, `st`, ni d'aucun état d'armement, dans tout
le fichier. Le robot ne peut donc pas anticiper une attaque annoncée ; il ne peut qu'esquiver ce qui vole
déjà vers lui.

Conclusion : seuls l'exposition des artilleurs et l'absorption par le corps peuvent déplacer ce rapport,
ce qui est exactement ce que l'implémenteur revendique avoir fait. Le chiffre est honnête, et son
interprétation aussi — mais il ne mesure pas la lisibilité, il mesure l'exposition. La lisibilité, elle,
est démontrée ailleurs : par les portails en pixels, les annonces jamais ouvertes hors champ, et les
marqueurs de bord.

# Réserve remontée par l'exécuteur — l'API des marqueurs et le pixel tracé ne disent pas la même chose

L'exécuteur a contrôlé le test 5 par une contre-mesure en pixels : captures d'écran décodées dans Node
par un décodeur PNG écrit pour l'occasion, donc sans passer par la page. Il établit trois choses. Le
repère est non ambigu, canvas 1440 × 900 sans transformation, un pixel de canvas vaut un pixel d'écran.
Un chevron rose est réellement tracé près du bord droit, à treize pixels du bord et à 7,6 degrés de la
direction du boss, donc conforme à l'intention de la spécification. Et l'attribution est prouvée par
ablation : en remplaçant `ui.offscreen()` par une fonction qui rend une liste vide, cet amas de pixels
disparaît, puis réapparaît quand on la rétablit.

Sa réserve : `ui.offscreen()` annonce le marqueur en (1420, 646) alors qu'il est tracé en (1418, 750),
soit **cent quatre pixels d'écart en ordonnée** pour le même marqueur. Le test 5 ne lit que la valeur
rendue par l'API, il ne peut donc pas voir cet écart. Deux conséquences : l'API ment sur l'ordonnée, ce
qui égarera tout code futur qui s'en sert, et le test qui la contrôle ne contrôle pas ce que la joueuse
voit.

À départager par le médiateur : soit l'API est fausse et doit être corrigée, soit c'est le tracé qui
déplace le marqueur après coup — l'écartement en peigne décale de trente pixels par cran, et cent quatre
en fait trois à quatre — auquel cas c'est l'API qui devrait publier la position finale, celle que la
joueuse voit, et non la position demandée.

## Ce que la lecture du code élimine dans cet écart de 104 pixels

Deux explications tombent.

**L'écartement en peigne n'est pas en cause.** Il ne s'applique qu'aux marqueurs transitoires du tableau
`_fxEdges`, à l'intérieur de leur propre boucle. Les marqueurs permanents passent par `_fxCollectOff`,
qui recopie `o.x` et `o.y` tels quels dans `_fxDrawn` sans jamais entrer dans la boucle de peigne. Le
chevron d'un boss est donc tracé exactement là où l'API le place.

**Le changement de repère n'est pas en cause non plus.** `_uiOffscreen` calcule en `CW`, `CH`, et
`90-boot.js` appelle `fx.drawScreen(ctx, CW, CH)` : les deux travaillent dans le même repère. L'exécuteur
a d'ailleurs vérifié que le canvas fait 1440 × 900 sans transformation et que le rapport de pixels vaut
un, donc pixel de canvas et pixel d'écran coïncident.

**Ce qui reste.** Soit l'API a été interrogée à une image différente de celle de la capture, et le boss ou
la caméra ont bougé entre les deux — l'ordonnée sur le cadre dépend de la direction du boss, elle peut
donc varier vite. Soit un décalage subsiste dans le tracé du chevron lui-même, entre le point publié et
le centre de la forme dessinée.

Le départage demande une seule mesure : relever la liste rendue par l'API **dans l'image même** où la
capture est prise, en accrochant `fx.drawScreen`. Tant que ce n'est pas fait, on ne sait pas si l'API ment
ou si la comparaison était mal synchronisée, et il faut le dire ainsi.
