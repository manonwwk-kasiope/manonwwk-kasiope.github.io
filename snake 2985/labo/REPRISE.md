# R&D de Snake 2985

18/11/2026 · 00 h 02, Paris

Manon attend sur iPhone une arcade panoramique complète pour le 18 novembre à 8 h. Elle demande de poursuivre les expériences jusqu’à la première mesure du quota à 10 % restants ou moins, puis de finaliser. Le relevé authentifié Codex indiquait 42 % à 23 h 52, puis 41 % à 00 h 00. La fenêtre est hebdomadaire, avec renouvellement annoncé le 18 novembre à midi. Les essais fonctionnent hors ligne ou sur les dépendances existantes, en silence absolu. Le jeu de 2975 est conservé.

La base publique de 2985 est la révision edc50ef75809cd069fc8c66d8fb2c91ac5033f2d. La recette HTTP compare 20 fichiers et cinq requêtes partielles sur les musiques. Safari standard a été essayé en simulateur. La branche source dédiée est codex/snake-2985-panoramique. La nouvelle édition est développée dans le laboratoire avant son intégration.

## Expériences et décisions provisoires

- Deux plans physiques avec collisions par couche et cooldown de bascule. Le prototype est dans moteur.js. La bascule libre s’est révélée exploitable par un pilote déterministe sur les quatre campagnes.
- Le portail de vol après la première cellule permet un vol analogique et un retour sur case libre. Sur 96 essais combinés avec la forge, 93 parcours ont rapporté la prime. Les trois éjections ont laissé reprendre le serpent. Rejouer tests/vol-integre.cjs.
- Forge à deux pièces indépendantes. Les neuf couples ont des trajectoires et des utilités distinctes dans les expériences fixes et mobiles. Répertoire forge et mesure-forge.cjs.
- Projection directe retenue. Dans preuves-visuel/mesures.json, le percentile 95 du temps de dessin avec lecture de pixels est inférieur à celui des bandes, et chaque tir est projeté au centre de sa vraie case.
- Lire commandes/README.md pour les contrôles à deux pouces et les limites du chronométrage synthétique. Une série en WebKit teste cible, annulation et recettes.
- Lire directeur/resultats.md pour les trois séquences rejouables et audio/README.md pour la conception des neuf signatures sonores et le motif de passage interplan. Aucun signal test envoyé à une sortie sonore.

## Lot engagé

Prototype d'ensemble jouable reliant moteur, forge, vol, contrôle tactile et spectacle. En parallèle les agents travaillent sur huit gardiens tactiques, quatre mondes graphiques, quatre gestes d'évolution d'armes, le directeur de rencontres et le mix des menaces. Réserver le navigateur à un essai à la fois. Ne diffuser aucune nouvelle édition en remplacement du jeu avant le seuil de quota demandé. Conserver les sources originales des musiques et la sauvegarde du score.

## Prochaine vérification

Partir du véritable écran de départ. Former une arme, entrer dans les deux grilles, franchir le portail en pilotant au doigt, affronter un gardien et comparer l'action observée avec l'état du moteur. Tester pause, réorientation et redémarrage à chaque transition. Chercher un défaut concret à corriger lors de chaque passe. Les résultats de scripts autonomes et la lecture de captures ne tiennent pas lieu de test humain sur téléphone.

## 18 novembre · mis à jour à 00 h 09

Manon a porté le voyage à cinq dates. 1976, 1985, 1995, 2185 et 2985 se jouent respectivement dans un style 2, 4, 8, 16 et 32 bits. La nouvelle étape de 1995 possède dix crans et deux gardiens de la Gare autoroutière. La campagne compte maintenant dix gardiens, le dernier en 2985. Mesure du quota à 00 h 07, 40 % restants. Branche originale de l'édition de base sauvegardée sur le dépôt distant. Reprendre le prototype réunifié dans campagne/index.html. Le laboratoire comporte également l'évolution de 45 montages, cinq contrats de trajectoire, une archive de collision sur deux secondes et une revanche par année qui conserve les anciens enregistrements.

## 18 novembre · mis à jour à 00 h 25

Le prototype intégré dans campagne/ utilise les cinq familles de sprites, l'illustration d'ouverture, la forge, les gardiens, les cinq styles graphiques, le score et les deux formes de reprise. La musique est liée explicitement à l'année avec un départ muet et une action dédiée pour l'activer. L'écoute reste coupée pour toute la recette nocturne. La vérification WebKit précédente confirme le passage de plan, la pause, le vol, la nova et le saut 1976 → 1995 sur deux tailles. Les raccords audio, palmarès, sprites et Circuit fermé ajoutés depuis restent à recetter sur le parcours complet.

Résultats récents : 123 tests groupés passent ; archive classique préservée sur la branche source e35c99d1. À 00 h 16, le compteur Codex indiquait 39 % restants. L'endurance comparative des cinq styles est en cours. La R&D suivante porte sur la diversité des ennemis, la première minute, la sélection des destinations et la distinction visuelle des armes. Pour la recette iOS, le projet qa-ios/ génère exclusivement un faisceau XCTest UI qui pilote l'application MobileSafari d'Apple. Le serveur de recette lié à 127.0.0.1 neutralise les sorties audio avant le premier script de la page. Ne jamais exécuter l'ancien hôte personnalisé SnakeIOSCheck.

## 18 novembre · mis à jour à 00 h 48

Le simulateur iPhone 17 sous iOS 27.2 a exécuté le parcours Safari standard complet de l’édition 64449e40c5ded7cc, en paysage et en silence. Le reçu est dans qa-ios/recette.json. La défaite, la revue de l’impact, le saut choisi en 1995 et le départ 8 bits passent. Les cinq générations ont leurs décors, leur serpent, leurs tirs et deux gardiens spécifiques. La planche reproductible est dans galerie/. Les correctifs plus récents incluent l’articulation, deux décors peints, dix anticipations de gardien et une correction de contraste des menaces 1976.

Le quota hebdomadaire Codex mesuré à 00 h 44 donne 33 % restants. La base publique reste edc50ef7 et la sauvegarde des premiers laboratoires est 4e369d6f. Travail engagé dans charge-ios/ (endurance MobileSafari), perception/ (lecture en pixels), gestes/ (deux pouces), livraison/ (migration hors ligne), atelier/ (choix de recette après le premier gardien), instruments/ et audio/. Refaire la recette depuis l’accueil, avec la distribution assemblée et ses ressources hors ligne avant la diffusion. Le navigateur et le simulateur sont réservés à un seul essai à la fois.

## 18 novembre · mis à jour à 01 h 02

La chambre utilise l’atelier de mi-parcours, les décors peints de 1985, 1995, 2185 et 2985, l’oscilloscope de 1976, les cinq instruments, la carte des époques, l’aide, les surcharges et les réactions du monde aux actes du joueur. L’essai de 199 tests Node ciblés a réussi avant la carte. Une conduite visuelle pas à pas sur le rendu 1976, sans lire les coordonnées internes, a franchi le portail et les trois anneaux puis atteint 500 points avant une salve de sentinelle. Elle a conduit à matérialiser l’entrée du bon anneau par deux chevrons au sol et à corriger le libellé de danger. Ce pilotage sur images arrêtées ne mesure pas les réactions en temps réel.

À 01 h 01 le compteur Codex indiquait 30 % restants. Prochains essais réservés, en série : corpus de perception aveugle, séquence tactile réellement multipoint, migration et chargement sans réseau, décodage WebKit vers mémoire sans haut-parleur, nouvelle galerie, parcours intégré depuis Safari. Le simulateur a terminé la longue matrice portrait, puis 31 des 40 blocs paysage avant son extinction. L’agent reprend uniquement les neuf restants. Pour la production, le constructeur livraison/preparer.cjs lit les seuls modules référencés dans campagne/index.html, les quatre horizons WebP et les cinq MP3. Le témoin quatre époques destiné à la recette est isolé de la nouvelle distribution.

## 18 novembre · mis à jour à 01 h 28

La distribution publique est encore la borne précédente. Le relevé authentifié à 01 h 27 indique 24 % de quota hebdomadaire restant. La chambre locale réunit désormais les cinq dates, les horizons peints, les quarante-cinq évolutions de forge, les surcharges, le second acte du boss final, l'épilogue, la carte et les extraits de jeu. Les musiques viennent des cinq MP3 originaux. La recette WebKit passe-02 a franchi les 50 crans et battu les dix boss ; les cinq signatures persistent après rechargement. La mesure Safari iOS Simulator à deux résolutions a comparé 24 photos identiques avant et après optimisation. Dans huit mesures sur huit, le temps de conversion au percentile 95 baisse. Les mesures et le film sont dans le laboratoire. Le premier point de reprise distant de cette soirée était d722dbb0.

Le verrou explicite ?muet=1 protège le nouveau parcours iOS compilé. Le profil de test public est dans /private/tmp/snake-ios-native-final.RuLG8Hvy ; essais physique et acoustique auditive non effectués. La reprise autonome passe ensuite par les essais de rotation, d’aperçu, d’interruption, de combat et de distribution froide. Déclencher la publication des cinq époques dès le premier relevé à 10 % ou moins. Réserver un seul simulateur ou navigateur à la fois. Les nombreux photogrammes intermédiaires de perception et des deux parcours sont reproductibles et conservés dans le laboratoire local.
