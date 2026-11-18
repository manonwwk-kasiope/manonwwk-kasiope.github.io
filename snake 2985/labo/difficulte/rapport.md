# Difficulté des cinq époques

18/11/2026 · 01 h 25

## Résultats sur graines réservées

Calibration — 240 campagnes commencées. Dans chaque variante, les nombres ci-dessous donnent la proportion des crans 7–9 atteints avec annonce en phase normale, les victoires expertes puis habituées, et le nombre de relances effectivement appliquées.

- Témoin — 36.8 %, 93.3 %, 75.0 %, 0 relances.

- Relance — 56.2 %, 91.7 %, 76.7 %, 156 relances.

Validation — 480 campagnes commencées. Dans chaque variante, les nombres ci-dessous donnent la proportion des crans 7–9 atteints avec annonce en phase normale, les victoires expertes puis habituées, et le nombre de relances effectivement appliquées.

- Témoin — 41.2 %, 90.0 %, 77.5 %, 0 relances.

- Relance — 60.8 %, 89.2 %, 79.2 %, 341 relances.

Expert — 108/120 époques gagnées. Morts par cran {5: 4, 10: 8}. Temps médian des décès observés 42.9 s. Causes {'Gardien de porte': 1, 'Chasseur de sillage': 5, 'Le Dévoreur': 2, 'La Singularité': 2, 'L’Éclipse': 1, 'Sentinelle': 1}.

- mid — 116 victoires, dont 0 avant la première salve active. Durée médiane des duels gagnés 5.0 s.

- final — 108 victoires, dont 0 avant la première salve active. Durée médiane des duels gagnés 5.8 s.

Habitué — 93/120 époques gagnées. Morts par cran {1: 6, 2: 2, 5: 9, 7: 2, 10: 8}. Temps médian des décès observés 19.8 s. Causes {'Ta propre queue': 3, 'Chasseur de sillage': 10, 'Drone': 6, 'Gardien de porte': 2, 'Sentinelle': 2, 'Le Dévoreur': 2, 'Le Mainframe': 1, 'Mur': 1}.

- mid — 103 victoires, dont 0 avant la première salve active. Durée médiane des duels gagnés 4.8 s.

- final — 93 victoires, dont 0 avant la première salve active. Durée médiane des duels gagnés 5.9 s.

## Exposition par cran et par époque

Pilote expert témoin. Chaque case indique la fraction du temps avec au moins une trajectoire cardinale praticable coupée par une menace imminente, en pourcentage. Les crans 5 et 10 portent sur le duel. Les autres portent sur la phase normale. Les repos et approches ont leur propre colonne dans les données brutes.

| Année | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1976 | 0.0 | 0.2 | 0.0 | 0.0 | 0.7 | 0.0 | 0.0 | 0.0 | 0.0 | 1.5 |
| 1985 | 0.0 | 0.4 | 0.0 | 0.0 | 0.9 | 0.0 | 0.0 | 0.0 | 0.0 | 1.7 |
| 1995 | 0.0 | 0.3 | 0.0 | 0.0 | 1.2 | 0.0 | 0.0 | 0.0 | 0.0 | 0.8 |
| 2185 | 0.0 | 0.3 | 0.0 | 0.0 | 0.5 | 0.0 | 0.0 | 0.0 | 0.0 | 0.5 |
| 2985 | 0.0 | 0.0 | 0.1 | 0.0 | 1.1 | 0.0 | 0.0 | 0.0 | 0.0 | 1.3 |

Voir `50-crans.csv` pour les deux profils, les entrants et décès par cran, durées, nombres d’annonces et activations, densité de drones, cases actives et décisions coupées. Les JSON compressés contiennent chaque trajectoire, temps de chacune des cinq phases et empreintes du code.

## Lecture des résultats

Toutes les trajectoires ont franchi les crans dans l’ordre, assertion contrôlée pour les 720 parties. Le cran 10 démarre directement le duel final. Les fenêtres entre commandes se raccourcissent à chaque cran dans le moteur. De 7 à 10, elles passent de 167 à 146 ms en 1976 et de 153 à 136 ms en 2985, hors turbo.

Le ralentissement ressenti avant les boss a deux composantes mesurables. Dans le témoin expert, le temps de phase normale par entrant tombe de 4,97 s au cran 2 à 2,55 s au 3 puis 1,40 s au 4. La seconde moitié reproduit ce creux, de 3,50 s au 7 à 2,66 s au 8 puis 1,25 s au 9. Ce dernier comprend aussi 1,94 s d’approche et 0,67 s de repos. Même hors de ces deux phases, les activations de zones sur le plan courant au 8 et au 9 ont une exposition moyenne inférieure à 0,005 case par instant. En revanche, la densité de drones sur le plan monte de 0,99 à 1,19 entre le 7 et le 9. La baisse ne touche donc pas tous les dangers.

Retenir la relance pour rendre plus fréquentes les décisions annoncées en fin de parcours. Elle franchit les critères sur les deux séries. En validation, le gain d’annonces vaut 19,6 points et la survie varie de −0,8 point chez l’expert et +1,7 point chez l’habitué. Chez l’expert au cran 9, la moyenne des cases en préavis sur son plan passe de 1,10 à 1,51 par instant, tandis que les cases actives restent en dessous de 0,005 par instant. On peut davantage rencontrer et contrer les émetteurs. Cette mesure ne démontre pas une progression continue des risques de mort.

## Limites et reproduction

Chaque époque repart au cran 1 avec prisme et chaîne. Les deux pilotes connaissent la commande de vol et utilisent la même assistance de trajectoire dans les airs. L’expert répond à l’écologie et aux gardiens. L’habitué utilise une observation retardée au sol. Tous deux peuvent ouvrir le second cœur de 2985 par le contre ou l’esquive. La durée par cran dépend de leur collecte. Le jeu ne contient ici ni temps d’atelier humain, ni réaction tactile, ni distribution représentative de joueurs. Les probabilités sont descriptives pour ces graines et ces stratégies. Les années partagent des graines, et deux conditions partagent un pilote. Les durées de décès excluent les victoires. Une menace imminente coupe une case si elle est déjà active ou se déclenche avant le prochain pas. Le temps au vol figure au dénominateur du temps menacé, sans décision cardinale ajoutée. Les événements des deux plans comptent comme annonces et seules les zones du plan courant alimentent la surface exposée.

Reproduction depuis ce dossier avec Node et Python standard, dans l’ordre : `node mesurer.cjs cal`, `node mesurer.cjs val`, `python3 analyser.py`.
