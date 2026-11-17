# Équilibrage des cinq époques

18/11/2026 00:17 · Paris

Le banc joue des parties entières avec le moteur du laboratoire et les dix gardiens. À chaque pas le joueur peut tourner, changer de plan et tirer sa nova. Les ateliers sont traversés avec les améliorations arc, rail, puis nova.

**La courbe progressive obtient 49.2 %, 78.8 %, 99.4 % de victoires pour les profils découverte, habitué et expert. La validation ne démontre pas une difficulté qui augmente à chacune des cinq dates.** Les remontées du taux de victoire en 2185 et les intervalles appariés imposent cette réserve.

Les collisions avec le mur ou le corps représentent 340 des 349 morts. Sur 56 morts rejouées, 0 étaient inévitables au dernier pas parmi les commandes testées. Les résultats décrivent les limites du modèle de pilote autant que les paramètres du jeu.

Branchement dans le laboratoire : charger `parametres.js` puis appeler `SnakeEquilibre.tick(s, dt, SnakeGardiens.tick)`. La courbe par défaut est progressive. Le module conserve le fonctionnement du terrain, des armes et des récompenses.

## Sélection et validation
Les cibles de conception ci-dessous sont des hypothèses préalables à la validation, en pourcentage de victoires par date. Elles servent à choisir une courbe, sans estimer les performances de personnes réelles.

| Profil | 1976 | 1985 | 1995 | 2185 | 2985 |
|---|---|---|---|---|---|
| découverte | 55.0 % | 49.0 % | 43.0 % | 37.0 % | 31.0 % |
| habitué | 86.0 % | 81.0 % | 76.0 % | 71.0 % | 66.0 % |
| expert | 98.0 % | 98.0 % | 98.0 % | 98.0 % | 98.0 % |

La sélection minimise l’écart absolu moyen aux quinze cibles sur calibration. Une courbe doit conserver au moins 85 % de victoires expertes à chaque date et zéro collision de drone mortelle avant 3,2 s. La première calibration limitée aux drones, aux salves et à la nova a laissé les dates futures presque aussi faciles. Une passe de calibration complémentaire a espacé les tirs automatiques et rapproché les arrivées de drones ; les plus fortes valeurs ont envoyé le profil expert sous le seuil de 85 % en 2985. La variante tendue conserve cette expérience. La variante progressive préserve les cadences natives des salves automatiques et des arrivées. La validation finale utilise une nouvelle série réservée de 48 graines.

| Courbe | Écart aux cibles, calibration | Admissible | Victoires, validation par profil (découverte / habitué / expert) |
|---|---|---|---|
| progressive | 6.5 % | oui | 49.2 % / 78.8 % / 99.4 % |
| temoin | 9.7 % | oui | 49.2 % / 79.0 % / 96.5 % |
| tendue | 11.8 % | non | 31.7 % / 72.1 % / 92.7 % |

Courbe retenue sur calibration : **progressive**. Les deux configurations de forge ont le même poids. Chaque cellule par profil et année de la table suivante contient 96 parties (48 graines × 2 armes).

| Pilote | 1976 | 1985 | 1995 | 2185 | 2985 | Écart 2985 − 1976 et intervalle à 95 % |
|---|---|---|---|---|---|---|
| découverte | 51.0 % | 51.0 % | 45.8 % | 54.2 % | 43.8 % | -7.3 pts [-24.0 ; 10.4] |
| habitué | 82.3 % | 76.0 % | 78.1 % | 80.2 % | 77.1 % | -5.2 pts [-17.7 ; 7.3] |
| expert | 99.0 % | 100.0 % | 100.0 % | 100.0 % | 97.9 % | -1.0 pts [-6.3 ; 3.1] |

Les intervalles utilisent 2 000 rééchantillonnages appariés des graines. Chaque tirage conserve les deux équipements de la même graine. Les cinq dates sont jouées séparément depuis le cran 1.

## Paramètres testés

Les multiplicateurs interpolent entre le début de 1976 et le cran 10 de 2985. L’intensité dépend à 62 % de la date et à 38 % du cran.

| Courbe | Mouvement des drones | Durée des avertissements | Vitesse de recharge de nova | Délai entre tirs automatiques | Délai entre arrivées des drones |
|---|---|---|---|---|---|
| Témoin | 1 | 1 | 1 | 1 | 1 |
| Progressive | 1,14 → 0,74 | 1,16 → 0,76 | 1,18 → 0,70 | 1 | 1 |
| Tendue | 1,07 → 0,58 | 1,03 → 0,60 | 1,06 → 0,50 | 0,9 → 3,4 | 1,2 → 0,32 |

Dans les deux variantes, les drones télégraphient leur apparition et restent inoffensifs durant les 3,2 premières secondes. Une alerte de gardien laisse toujours au moins 0,64 s de réaction. La recharge modulée est passive, les cellules et les failles conservent leurs récompenses.

## Temps, crans et fenêtres de combat

Temps en secondes de jeu. La médiane avant mort porte sur les parties terminées par une mort. La médiane avant surprise porte sur les parties où une menace immédiate du drone ou de la salve était absente de la perception retardée. La part de parties concernées apparaît à côté ; une valeur manquante indique aucune observation. Une salve esquivée est une séquence annoncée résolue vivant ; une salve annulée par la défaite du boss ou la faille est exclue. La riposte exige un dégât sur le cœur pendant la fenêtre.

| Date | Profil | Morts/total | Mort médiane (s) | Première surprise (s) · incidence | Crans finaux 1–2 / 3–4 / 5–6 / 7–9 / 10 | Salves esquivées | Fenêtres avec riposte |
|---|---|---|---|---|---|---|---|
| 1976 | découverte | 47/96 | 28.9 | 37.5 · 1.0 % | 4 / 6 / 18 / 11 / 57 | 97.7 % | 88.8 % |
| 1976 | habitué | 17/96 | 27.2 | — · 0.0 % | 2 / 2 / 6 / 5 / 81 | 99.7 % | 92.7 % |
| 1976 | expert | 1/96 | 48.7 | — · 0.0 % | 0 / 0 / 0 / 0 / 96 | 99.8 % | 95.5 % |
| 1985 | découverte | 47/96 | 35.0 | 12.9 · 1.0 % | 2 / 10 / 12 / 15 / 57 | 98.8 % | 98.6 % |
| 1985 | habitué | 23/96 | 23.4 | — · 0.0 % | 2 / 3 / 8 / 6 / 77 | 98.9 % | 99.2 % |
| 1985 | expert | 0/96 | — | — · 0.0 % | 0 / 0 / 0 / 0 / 96 | 100.0 % | 100.0 % |
| 1995 | découverte | 52/96 | 25.8 | — · 0.0 % | 2 / 13 / 14 / 23 / 44 | 98.6 % | 100.0 % |
| 1995 | habitué | 21/96 | 34.5 | 26.4 · 2.1 % | 2 / 0 / 2 / 13 / 79 | 99.5 % | 98.2 % |
| 1995 | expert | 0/96 | — | — · 0.0 % | 0 / 0 / 0 / 0 / 96 | 100.0 % | 100.0 % |
| 2185 | découverte | 44/96 | 26.8 | — · 0.0 % | 2 / 8 / 13 / 16 / 57 | 95.9 % | 97.2 % |
| 2185 | habitué | 19/96 | 29.9 | — · 0.0 % | 2 / 0 / 7 / 8 / 79 | 99.3 % | 97.8 % |
| 2185 | expert | 0/96 | — | — · 0.0 % | 0 / 0 / 0 / 0 / 96 | 100.0 % | 100.0 % |
| 2985 | découverte | 54/96 | 26.9 | — · 0.0 % | 2 / 7 / 19 / 21 / 47 | 98.7 % | 97.2 % |
| 2985 | habitué | 22/96 | 24.0 | — · 0.0 % | 2 / 2 / 7 / 5 / 80 | 99.4 % | 96.1 % |
| 2985 | expert | 2/96 | 35.3 | — · 0.0 % | 0 / 0 / 0 / 0 / 96 | 100.0 % | 98.0 % |


## Forge et commandes


| Pilote | Sans forge | Prisme + Chaîne | Écart apparié et intervalle à 95 % |
|---|---|---|---|
| découverte | 50.4 % | 47.9 % | -2.5 pts [-7.1 ; 2.5] |
| habitué | 77.5 % | 80.0 % | 2.5 pts [-1.2 ; 5.8] |
| expert | 99.2 % | 99.6 % | 0.4 pts [0.0 ; 1.2] |


| Pilote | Parties appariées | Mort devenue victoire avec commandes exactes | Victoire devenue mort | Dernière erreur réparable / morts auditées | Aucun sauvetage au dernier pas / morts auditées |
|---|---|---|---|---|---|
| découverte | 480 | 237 | 7 | 32 / 32 (100.0 %) | 0 / 32 (0.0 %) |
| habitué | 480 | 100 | 11 | 16 / 22 (72.7 %) | 0 / 22 (0.0 %) |
| expert | 0 | 0 | 0 | 0 / 2 (0.0 %) | 0 / 2 (0.0 %) |

Le contrefactuel enlève uniquement les erreurs de direction injectées, avec la même graine, les mêmes délais et la même visibilité. Les trajectoires divergent ensuite. L’audit local rejoue le préfixe réel jusqu’à l’ultime entrée et essaie les quatre directions avec ou sans bascule et nova. Le résultat porte sur le prochain pas. Une impasse à cet instant peut provenir d’une erreur plusieurs cases auparavant. Les six premières graines de validation servent à cet audit.

## Protocole et limites

- Calibration : 24 graines 101 + 67i. Validation : 48 graines distinctes 14009 + 67i. Chacune est croisée avec cinq dates, trois courbes, trois profils et deux armes. Le générateur des entrées est indépendant de celui du jeu. Les mêmes tirages sont attribués au même numéro de décision dans chaque expérience. Le plafond est de 150 s de simulation par partie.
- Découverte : observation retardée de 0,42 s, horizon de trois pas, drones visibles à cinq cases, plan opposé ignoré, 3,5 % de commandes perturbées. Habitué : 0,19 s, six pas, dix cases, perception des deux plans, 1,2 %. Expert : recherche en largeur distincte vers la nourriture puis autour des boss, carte entière et réaction immédiate. Les valeurs de perception et d’erreur sont des hypothèses de modélisation.
- L’horloge du serpent continue entre deux décisions. Les profils perçoivent instantanément leur propre corps, les cellules et les limites. Les erreurs uniformes sur les autres directions autorisées ne modélisent ni fatigue ni apprentissage. Les simulations imposent un choix tactique toutes les cases, y compris pour le novice. Les esquives au changement de plan ne demandent aucun geste physique.
- Le prisme avec Chaîne utilise le module de forge réel. Sans forge les armes natives et les ateliers restent actifs. Les comparaisons isolent le combat au sol : le slalom optionnel, les commandes tactiles, le visuel, le son et les préférences de construction sont hors modèle. La protection initiale concerne les drones, les murs et le corps restent actifs.
- La victoire clôt l’observation, les médianes conditionnelles de mort et de surprise ne sont pas des espérances de durée. Atteindre le cran 10 inclut les morts au dernier boss. Une victoire experte démontre une solution pour sa partie. Un échec du pilote simulé ne démontre pas qu’une grille est insoluble.
- Échecs au plafond sur validation : 0/4320. Causes des morts, courbe retenue : Mur 130, Ta propre queue 210, Le Registre 1, Le Cyclope 1, Le Mainframe 1, Le Magnétron 4, Le Signal fantôme 2.

Reproduction depuis ce dossier : `node etude.cjs calibration`, `node selection.cjs`, `node etude.cjs validation`, `node rapport.cjs`. Les fichiers JSON contiennent les résultats par partie.
