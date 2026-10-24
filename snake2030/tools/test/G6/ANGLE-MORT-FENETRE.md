# Angle mort : la garantie « aucune apparition dans le champ » ne tient pas sur une fenêtre carrée

Constat du pilote de la chaîne, obtenu par le calcul et à confirmer par la mesure. Il ne remet pas en
cause le verdict de G6 sur les trois fenêtres testées ; il désigne une fenêtre non testée où la garantie
tombe, et donne le correctif d'une ligne.

## Le rayon d'apparition ne couvre pas le coin

La règle impose un rayon d'au moins `max(view.w, view.h) / 2 + 150`. Mais le point le plus éloigné
réellement visible n'est pas le milieu d'un bord, c'est le **coin**, à `hypot(view.w, view.h) / 2`. En
posant `a` la plus grande demi-dimension et `b` la plus petite, le rayon ne domine le coin que si

    b² ≤ 300 a + 22500,   soit   b / a ≤ √(300 a + 22500) / a

Pour une demi-dimension de 594 unités, cela donne un rapport limite de 0,754 : la fenêtre doit être au
moins aussi allongée que du quatre tiers. Pour une vue carrée, la condition exige `a ≤ 362` unités, ce
qu'aucune fenêtre de jeu n'approche.

| fenêtre | rapport petit sur grand | rayon minimal | distance au coin | verdict |
|---|---|---|---|---|
| 1440 × 900 | 0,625 | 744 u | 701 u | couvert, 43 u de marge |
| 2560 × 1080 | 0,422 | — | — | couvert largement |
| iPhone 13 paysage | 0,462 | 938 u | 868 u | couvert, 70 u de marge |
| 960 × 1040 (demi-fenêtre haute, rendue jouable par G2) | 0,923 | — | — | **non couvert** |
| 1000 × 1000 | 1,000 | 626 u | 673 u | **non couvert** |

## Le second garde-fou a le même angle mort que le test

Le rayon n'est pas seul : `_lvPoint` rejette aussi tout point déjà dans le champ, avec quarante unités de
marge. Ce second test s'appuie sur `phases.visibleExtent()`, qui **ignore le roulis de la caméra**, alors
que `phases.toScreen()`, elle, en tient compte. Pendant l'étape ROULIS la caméra tourne de 0,20 radian
pendant cinq secondes, et de 0,05 radian ensuite en bascule : la zone réellement vue est un rectangle
tourné, l'étendue publiée est un rectangle droit, et les deux diffèrent près des coins.

Contre-exemple explicite, vue carrée 952 × 952 unités, roulis 0,20 rad, apparition en (360, 520) par
rapport à la caméra :

* rayon 632 u ≥ 626 u exigés — la première règle passe ;
* hors du rectangle droit élargi de 40 u, puisque 520 > 516 — la seconde règle passe ;
* ramené dans le repère de la caméra tournée : (456, 438), donc **à l'intérieur** du rectangle visible.

L'ennemi naît sous les yeux de la joueuse. La sonde du test emploie la même étendue que le jeu : elle
compte ce cas comme hors champ. Le test et le défaut sont d'accord entre eux, et le zéro pour cent publié
ne peut pas le voir.

## Portée réelle et correctif

L'ouverture angulaire fautive est étroite, de l'ordre de trois pour cent des directions, et seulement sur
une fenêtre presque carrée pendant les cinq secondes de roulis. Ce n'est pas un défaut visible tous les
jours ; c'est une garantie annoncée à zéro pour cent qui n'est pas démontrée hors des trois fenêtres
allongées du test.

Le correctif tient en une ligne et supprime la question au lieu de la déplacer : remplacer
`max(view.w, view.h) / 2 + 150` par `hypot(view.w, view.h) / 2 + 150`. Le rayon domine alors le coin par
construction, quelle que soit la forme de la fenêtre et quel que soit le roulis, sans dépendre de
`visibleExtent`. Le coût est de cent unités de distance d'apparition supplémentaires sur une fenêtre
large, ce qui ne change rien au jeu.

Second correctif, indépendant et souhaitable pour les autres usages de l'étendue : rendre
`visibleExtent()` conscient du roulis, en prenant la boîte englobante du rectangle tourné. Sans cela, un
ennemi visible dans un coin tourné est jugé hors champ, donc privé de sa fenêtre d'armement, et peut
recevoir un chevron de bord tracé par-dessus lui.

**Disposition proposée** : ne pas bloquer G6, dont les trois fenêtres testées sont couvertes avec marge.
Porter le correctif du rayon à G6 s'il reste une tentative, sinon à G11 (lisibilité) avec un test ajouté
sur une fenêtre carrée.

# Mesure — le défaut est réel, mais rare, et seulement sur fenêtre presque carrée

Six parties par fenêtre, graines 6000 à 6005, pas de temps imposé, script
`snake2030/tools/test/G6/mesure-roulis.mjs`. Pour chaque ennemi à sa première image on compare deux
choses : l'étendue visible, qui ignore le roulis, et la projection écran, qui en tient compte.

| fenêtre | apparitions | visibles malgré la règle | taux |
|---|---|---|---|
| 1440 × 900 | 1 605 | 0 | 0 % |
| 960 × 1040 | 119 | 0 | 0 % |
| 1000 × 1000 | 1 620 | **2** | 0,123 % |

Les deux cas sont des intercepteurs. La garantie « zéro pour cent » tient donc sur la fenêtre du test et
tombe sur une fenêtre carrée, exactement là où l'arithmétique le prévoyait. L'échantillon de la
demi-fenêtre haute est trop mince pour conclure : cent dix-neuf apparitions seulement, le pilote y meurt
vite.

## Ce que je n'ai pas isolé

Trois mécanismes peuvent produire ces deux cas et je ne les ai pas départagés :

1. le rayon d'apparition, mesuré depuis la tête, ne couvre pas le coin de l'écran sur une fenêtre carrée ;
2. l'étendue visible ignore le roulis, donc le second garde-fou laisse passer les coins tournés ;
3. le point est validé contre une caméra **anticipée** de 1,15 seconde de course, et la joueuse peut avoir
   tourné pendant les six cents millisecondes du portail, ce qui invalide la prédiction.

Le troisième est le plus probable pour des intercepteurs, qui apparaissent en couloir. Les deux premiers
expliquent pourquoi la fenêtre carrée casse là où la fenêtre large tient : la marge y est plus mince.

Le correctif proposé — prendre la distance au coin au lieu de la plus grande demi-dimension — traite les
mécanismes 1 et 2 par construction et élargit la marge du 3. Il reste souhaitable d'y ajouter un test sur
fenêtre carrée, sans quoi la garantie ne sera jamais démontrée là où elle échoue.

# Le correctif a été appliqué, et il a un coût qu'il faut dire

L'implémenteur a repris la proposition et remplacé `max(demi-w, demi-h) + 150` par
`hypot(demi-w, demi-h) + 150` dans `_lvPoint`. Sur une vue de rapport 16:9, cela éloigne les apparitions
d'environ cent six unités, soit quatorze pour cent de plus. Ce n'est pas neutre pour le jeu : un ennemi
qui naît plus loin met plus de temps à devenir une menace, et un artilleur qui n'ouvre sa fenêtre de tir
que dans le champ tire encore moins.

Mesure après correctif, soixante parties sur trois fenêtres :

| critère | seuil | avant correctif | après correctif |
|---|---|---|---|
| coups de balle | ≤ 25 % | 14,31 % | 10,45 % |
| apparitions dans le champ | 0 % | 0 % | 0 % |
| armements hors champ | 0 % | 0 % | 0 % |
| balles au-delà du 8e anneau | 0 | 0 | 0 |
| ruées de trancheur depuis une source fraîche | ≤ 3 % | 0 % | 0,71 % |

Le seuil sur les balles est tenu plus largement, mais pour la mauvaise raison : parce que l'artilleur
compte encore moins. Cela s'ajoute à la réserve déjà ouverte pour G9. En revanche la correction fait ce
qu'on lui demande, et la garantie « aucune apparition dans le champ » ne dépend plus de la forme de la
fenêtre.

Un point de vigilance : sur la fenêtre 2560 × 1080 prise seule, les ruées de trancheur depuis une source
fraîche montent à 3,57 %, au-dessus du seuil de 3 % que l'agrégat respecte à 0,71 %. L'échantillon est
mince, une poignée de ruées, mais le seuil de la spécification porte sur l'ensemble des trois fenêtres et
non sur chacune. À surveiller plutôt qu'à bloquer.

# Deux vérifications de suivi du correctif

**Le repli n'a pas été affaibli.** Un rayon plus grand fait échouer plus souvent les cinq essais du tirage
principal, donc appelle plus souvent `_lvFallback()`. Ce repli essaie huit positions de bord et de coin
d'arène, et vérifie chacune avec `_lvHiddenSoon()` : la garantie y est donc conservée. Seul le tout
dernier recours, `_lvClampPoint()`, place un point sans contrôle de visibilité, et il n'est atteint que
si les huit positions échouent. Le correctif ne dégrade pas cette chaîne.

**Un commentaire est resté en arrière.** Juste au-dessus de `_lvPoint`, `src/25-levels.js` annonce encore
« Tous les motifs tirent à R >= max(view.w, view.h)/2 + 150 », alors que le corps de la fonction prend
maintenant la diagonale et l'explique dans un second commentaire. Les deux se contredisent. Ce n'est pas
un défaut de comportement, mais c'est exactement ce qui égare un lecteur futur : la ligne d'en-tête doit
dire la diagonale.
