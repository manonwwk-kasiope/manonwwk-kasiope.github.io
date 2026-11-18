# Première minute jouable · 18/11/2026 · 00 h 26, Paris · mis à jour à 00 h 29

**Retenir les micro-défis facultatifs.** Le serpent démarre déjà en mouvement. Une bande latérale sur huit colonnes invite à tourner. La préparation permet de choisir le parcours à l’arrêt. Sans ce choix, prendre tout droit le premier portail ferme l’invitation pour la partie. Sur les cinq époques et quatre graines testées, le pilote qui prend la bifurcation fait un véritable virage, change de plan, entre en vol puis ferme un circuit de queue dans les vingt parcours. Le corridor obtient aussi vingt fermetures ; chez le pilote qui passe son chemin, il continue toutefois à proposer des étapes. Les mesures décrivent les décisions de pilotes programmés ayant accès aux cibles.

| Départ | Première commande acceptée | Premier virage réalisé | Premier tir de forge | Première bascule | Entrée en vol | Premier circuit fermé |
|---|---:|---:|---:|---:|---:|---:|
| Actuel | 1,52–1,73 s | 4,78–5,03 s | 0,017 s | Aucune | 1,50–1,72 s | Aucun |
| Corridor guidé | 0,88–1,00 s | 1,08–1,23 s | 0,017 s | 1,87–2,02 s | 3,18–3,52 s | 11,85–13,73 s |
| Micro-défis | 0,23–0,27 s | 0,43–0,50 s | 0,017 s | 1,20–1,27 s | 2,58–2,93 s | 14,57–23,23 s |

Fourchettes sur les cinq années, graine 83. Le pilote actuel poursuit les cellules et portes visibles ; sa première commande est un cap analogique après l’entrée automatique dans la porte. Les deux variantes démarrent par une commande de virage réellement acceptée au sol. Les trois utilisent la recette Satellites + Détonation, équipée avant le départ. « Premier tir » mesure l’événement automatique de la forge. La première touche de forge peut arriver bien plus tard : en 1995, après 14,23 s avec les micro-défis ; elle ne survient pas dans la prise actuelle de cette année. Source : `mesures.json`.

### Mise en scène proposée

1. Dessiner une ligne transversale à huit encoches au sol, sur les colonnes 9 à 16 de la rangée 8. Le serpent entre par un virage vers cette bande depuis la rangée 9. La tête et le cap restent ceux du moteur. Le module n’écrit ni commande, ni vitesse, ni position ; la forge équipée dans la préparation reste celle choisie.
2. Au premier virage vers la branche, laisser voir les satellites réels pendant 0,75 s. Afficher le noyau près de son effet. Une autre recette garde son propre rendu. La phrase n’annonce aucun impact avant sa réalisation.
3. Au-dessus de la cellule, afficher les deux contours de plan puis éclaircir celui d’arrivée. Passer par la commande de bascule habituelle. Si la porte déjà ouverte se trouve sur le plan précédent, le signal l’indique avant de désigner sa position.
4. Cercler la porte délivrée par le moteur. En vol, reprendre le véritable prochain anneau, son centre et son plan. Aucune flèche n’est posée sur la tête. Les gestes analogiques conservent la projection habituelle de la caméra.
5. Après le vol, laisser le serpent grandir en ramassant des cellules existantes. À partir de neuf segments, proposer une boucle de quatre cases d’aire via des points de couture au sol. Le modèle facultatif ne dessine qu’un point à la fois. Montrer la fermeture et son coût de 28 % de nova uniquement lorsque le module du nœud renvoie une proposition réelle. Le moteur valide le passage et le débit. Puis la partie continue librement.

### Fenêtre de choix et délai de lecture

Le premier virage du pilote idéal à 0,23 s ne constitue pas un délai de lecture acceptable par défaut. Le prototype corrigé accepte un virage vers la bande depuis huit colonnes et conserve le choix fait en préparation si le portail automatique est traversé avant la première commande. Dans ce dernier cas, le slalom se joue normalement ; une nouvelle bifurcation est proposée à l’atterrissage, dans le repère du véritable cap d’arrivée. Aucun plateau, objet, tempo ou trajet du serpent n’est modifié. Les cinq latences sont des scénarios du banc, sans participants humains.

| Délai imposé avant le premier ordre | Entrée en jeu sans préparation | Avec « Parcours découverte » choisi à l’arrêt |
|---|---:|---:|
| 0,4 s | 5 / 5 | 5 / 5 |
| 0,8 s | 5 / 5 | 5 / 5 |
| 1,2 s | 5 / 5 | 5 / 5 |
| 1,6 s | 3 / 5 | 5 / 5 |
| 2,2 s | 0 / 5 | 5 / 5 |

Dans chacun de ces cas réussis, le pilote ferme aussi le circuit de queue. À 2,2 s avec le choix de préparation, le premier ordre est pris en compte à 2,217 s, l’embranchement de reprise à 4,80–5,05 s et le circuit à 20,20–30,78 s. Les drones et les collisions restent actifs. Sans réservation, en continuant tout droit, le module constate la fermeture à **1,733 s en 1976, 1,667 s en 1985, 1,633 s en 1995, 1,600 s en 2185 et 1,517 s en 2985**. Le portail commence au pas précédent, soit jusqu’à 1/60 s auparavant. Cette limite résulte de l’entrée en vol native ; l’option au repos rend la décision possible même après une lecture longue de l’écran initial. Source : `latences.json`, 50 parcours rejoués sur la graine 83.

### Refus, danger et reprise

Sur la graine 83, le pilote de contournement conserve les mêmes positions échantillonnées, plans, scores et instants d’événements que le départ actuel pour chaque année. Dans le modèle facultatif, ses deux seuls états sont la bifurcation puis le jeu libre. Le pilote inerte meurt du mur dans les quinze combinaisons d’année et de modèle, entre 6,03 et 6,37 s. Sous la graine 83, le pilote guidé par micro-défis peut mourir ultérieurement de sa queue en 2185 ou d’un gardien en 1976, 1985 ou 1995.

Le banc rejoue chaque séquence de commandes des 45 parcours de référence et exige le même résultat. Trois autres graines donnent 15 parcours par modèle. Le pilote des micro-défis ferme 15 circuits sur 15 et meurt six fois avant la fin de la minute. Celui du corridor ferme 15 circuits et meurt onze fois. Ces effectifs dépendent du pilote, qui cesse de poursuivre les consignes après la fermeture. La transition réelle de bifurcation depuis 2985 renvoie l’année 1976 avec le drapeau de nouveau cycle. Dans cette configuration les variantes restituent les commandes et le déroulement du départ actuel. Source : `banc.cjs`, `variations.json`, `prises.json`.

### Raccord et limites

Créer `SnakeInitiation.create('facultatif', cycle)` par partie. Proposer « Parcours découverte » en préparation, sans limite de lecture ; ce choix appelle `prepare(d)` avant le premier pas. `drawFork(ctx,signal,project,ink)` trace la bande avec une encre en coordonnées projetées ainsi que le repère après atterrissage. Appeler `update(d,s,dt,events)` sur le temps de jeu avec les événements du dernier pas, puis `cue(d,s)`. La proposition contient `shape`, `at`, `marks` et une phrase éventuellement vide. Projeter les marques comme les cases du plateau. Accorder la priorité au HUD de danger, dont le message doit pouvoir masquer l’initiation. `dismiss(d)` termine immédiatement la séquence. Elle se retire également à l’arrivée du gardien ou à la première minute de jeu.

Le banc charge le moteur du laboratoire, la forge, son évolution, le vol et le nœud exact ; il laisse actifs drones, collisions et progression. Les ateliers sont validés par le pilote. Les trois replays complets de 1995 contiennent les commandes horodatées. Reproduire depuis ce dossier avec `node banc.cjs`. La prise en main tactile, l’identification spontanée des symboles et l’attention réellement accordée à l’arme exigent un essai humain.

Miyamoto décrit comment la position d’un obstacle et le mouvement du premier champignon font découvrir une propriété de Mario à travers les conséquences du geste. Ce prototype transpose l’idée dans un embranchement que le joueur peut laisser passer. [Entretien Nintendo](https://www.nintendo.com/fr-fr/Iwata-demande/Iwata-demande-New-Super-Mario-Bros-Wii/Iwata-demande-New-Super-Mario-Bros-Wii-Vol-1/4-Faire-comprendre-les-vertus-des-champignons/4-Faire-comprendre-les-vertus-des-champignons-210863.html)

Ken Birdwell explique comment Valve distinguait les compétences à introduire et enregistrait positions, temps et événements pour repérer les difficultés. Le banc reprend cette instrumentation ; seule une future observation de joueurs pourra mesurer la compréhension du départ. [Article de Ken Birdwell, Valve](https://www.gamedeveloper.com/design/the-cabal-valve-s-design-process-for-creating-i-half-life-i-)
