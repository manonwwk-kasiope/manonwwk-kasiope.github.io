# Directeur des rencontres · 18/11/2026 · 00 h 03, Paris · mis à jour à 00 h 07

Le banc charge le véritable moteur expérimental et son module de vol. Lancer `node simulate.cjs` depuis ce dossier. Les événements des dix parcours sont enregistrés dans `prises.json`. Le premier passage annonce la rencontre à 1,00 s et ouvre le score à 2,50 s dans les cinq époques.

| Époque | Contrat | Pilote engagé | Pilote qui continue sa route |
|---|---|---|---|
| 1976 | Laisser passer le convoi puis prendre son sillage. Toucher le convoi ferme le bonus de ce passage. | 100 points à 5,38 s | 0, en vie |
| 1985 | Changer de plan sur le socle, laisser la mue tenir le contact, atteindre le relais opposé. | 160 points à 3,28 s | 0, en vie |
| 1995 | Prendre l’aiguille à contresens, déboîter en empruntant la branche latérale et rejoindre le marquage express avant que la locomotive atteigne le carrefour. | 190 points à 6,65 s | Voie libre à 2,53 s, 0 point, en vie |
| 2185 | Entrer dans la porte existante et diriger le serpent à travers les deux premiers anneaux du vol. | 200 points à 3,82 s | 0, en vie |
| 2985 | Poser une mue, activer le relais opposé, puis ramener le courant au socle initial. | 260 points à 5,78 s | 0, en vie |

Les tests complémentaires vérifient la suspension dès 84 % de progression vers le boss, l’absence d’une nouvelle annonce pendant son combat, la récupération après le combat et le report sous la pression de deux drones proches. Une série contrôlée rapporte 100, 200, 300, 300, 0 puis 100 points, avec plafonnement et remise à zéro. Source de toutes les mesures de jeu : `simulate.cjs` et `prises.json`.

**Raccord.** Charger `directeur.js`, créer un état par partie avec `SnakeDirector.create()`, appeler `SnakeDirector.tick(d, s, dt)` après chaque pas de simulation, avant de vider les événements du jeu. Le banc utilise un pas de 1/60 s. Ajouter `result.points` au score une fois. `result.suppressWaves` commande l’ajournement des nouveaux drones pendant le répit ou l’approche du boss. L’hôte garde la main sur les drones existants et le déclenchement des boss. Le directeur lui-même annule ou reporte ses propres engagements. Le rendu peut lire `d.offer`, ses ancres en coordonnées du moteur, le temps restant, le convoi mobile, la progression et le prochain anneau. `result.events` décrit les transitions de ce seul pas. Cette expérience ne crée aucun son.

**Dessin de la gare 1995.** Les six ancres `[A,B,C,D,E,F]` sont des centres de cases du même plan. Dessiner le rail principal de E vers F avec des chevrons rouges orientés, la branche express A–B–C en pointillés or et la voie de dégagement A–D en cyan. À A, une flèche claire indique l’entrée du serpent dans le sens F vers E. Poser un fanion à damier sur C et une paire de traits arrondis sur D. Pendant l’annonce, afficher le contour du train à E ; pendant la course, utiliser `offer.train`. L’étape 0 désigne A, 1 désigne B, 2 désigne C. Le contact avec le train fait perdre le contrat et la série. Le serpent poursuit sa partie. L’entrée par le mauvais côté laisse l’aiguille fermée. Ces deux branches sont vérifiées dans le banc.

**Migration.** Le directeur sélectionne ses rencontres par année. Le banc retrouve l’indice dans le catalogue réel et enregistre les deux informations dans les prises. Les années 2185 et 2985 gardent leurs contrats et leurs scores avec les nouveaux indices 3 et 4.

**Portée.** Les dix parcours emploient les vraies commandes de direction, de changement de plan et de vol, avec population et ramassages neutralisés pour isoler les décisions. La porte orbitale est fixée au départ. Les tests de pression et de boss pilotent les entrées du directeur. La jouabilité sous feu nourri et la lisibilité humaine restent à mesurer. Le surf complète le slalom natif et laisse son bonus intact.

**Origine des choix.** Michael Booth décrit l’allègement progressif de la population lorsque l’intensité culmine et conserve la place des boss dans la progression de Left 4 Dead. Nous reprenons le principe du répit, avec une mesure locale de proximité et d’éliminations. [Présentation de Michael Booth, Valve](https://cdn.cloudflare.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf)

Housemarque explique que sauver successivement des humains accélère le multiplicateur de Nex Machina et que certains passages facultatifs procurent des points supplémentaires. Ici, le joueur construit sa série en réussissant des contrats de déplacement. [Conseils de Housemarque sur PlayStation Blog](https://blog.playstation.com/archive/2017/07/06/10-expert-tips-for-dying-slightly-less-frequently-in-housemarques-brutal-ps4-shooter-nex-machina/)
