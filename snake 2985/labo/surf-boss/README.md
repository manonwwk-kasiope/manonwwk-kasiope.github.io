# Surfer la salve du gardien

**18/11/2026 · 00 h 30, Paris**

Pendant le préavis du **Convoi spectral** en 1995 ou de l’**Effondrement fractal** en 2985, un anneau turquoise apparaît sur une case accessible du joueur. Le masque réel de l'attaque détermine la crête adjacente. Ses chevrons indiquent dans quel sens l’emprunter. Le joueur peut aussi rester sur la grille et changer de plan pour esquiver.

Sur la porte, une pression décolle. Le joueur pilote la crête au manche, ou avec les flèches. Après au moins 0,8 case parcourue et un cap donné, l’impulsion devient disponible pendant l’activation réelle de la salve. Une deuxième pression propulse le serpent selon la tangente. Il faut ensuite tourner vers la coque mobile. Un impact inflige jusqu’à 9 PV en 1995 ou 12 PV en 2985, avec un minimum de 1 PV restant au gardien. Le tir des armes ordinaires peut toujours l'achever. Source des valeurs et des règles : `surf.js`.

Quitter la crête, traverser une case active, heurter un drone, manquer la cible ou annuler rend la main sur la grille sans point, recharge de nova ni dégât de surf. La rentrée emploie le positionnement du moteur de vol avec deux cases libres devant la tête. Une plongée dure au maximum 2,2 secondes de simulation. La crête dispose d'une limite propre de 4 secondes même si le préavis du gardien reste bloqué. La plongée peut se prolonger dans le préavis suivant et rencontre son masque courant. L’activation suivante peut ainsi couper une mauvaise trajectoire.

## Brancher la chambre

1. Charger `surf.js` après `vol-libre.js`, `moteur.js` et `gardiens.js`, puis appeler `SnakeSurf.install()`. L’installation est idempotente et ne crée aucun écouteur global. Un décorateur d’équilibrage externe peut appeler `SnakeGardiens.tick` comme auparavant. Capturer cette référence après l'installation si l'appelant garde le callback en mémoire.
2. À chaque image, consulter `SnakeSurf.read(s)`. Une entrée `phase === 'porte'` contient `gate, edge, plane, accessible, remaining`. Afficher « Surfer » quand `accessible` est vrai. Les phases embarquées sont `'crête'` et `'plongée'`. Afficher « Impulsion » dès que `pulse` vaut vrai, puis « Vise le cœur ». `target` donne le centre courant de la coque. Ces messages remplacent le compteur d'anneaux du vol ordinaire.
3. Relier le bouton d'action à `SnakeSurf.action(s)`. La méthode renvoie vrai lors du décollage ou d'une impulsion acceptée. Les entrées analogiques et clavier passent par les API existantes `SnakeFlight.aim` et `SnakeArcade.turn`. L'action `SnakeSurf.cancel(s)` permet de rentrer. Toutes les entrées sont réservées à l'écran de jeu actif.
4. Après le plateau, appeler `SnakeSurf.draw(canvas,s,reducedMotion)`. Le dessin se limite à un anneau évidé sur la case sûre et à de petits chevrons orientés. Le moteur garde le dessin de ses cases dangereuses, des plans et de la coque. Le surf n'ajoute aucun aplat, panneau sur l'aire de jeu ou déplacement de caméra spécifique.
5. Les événements sont `surfGate`, `surfStart`, `surfPulse`, `surfEnd {success,reason}` et, sur impact effectif seulement, `bossHit {weapon:'surf',damage,hp}`. Les armes/points habituels du monde continuent d’évoluer indépendamment.

## Rejouer

Depuis ce dossier, lancer `node --test surf.test.cjs`. Les coordonnées de la tête, les plans et les événements horodatés de seize prises sont disponibles dans `trajectoires.json`.

Les deux situations de départ approchent le vrai dernier cran et déclenchent la salve par une collecte du moteur. Le banc fixe les positions de départ et suspend les salves automatiques du joueur et les renforts pour isoler les dégâts du surf. Le pilote traverse ensuite le plateau par les commandes habituelles. Les deux approches guidées de référence atteignent le cœur sur le plan bas. Deux autres rejoignent la coque sur le plan haut. Les trajectoires passives, impulsions manquées, mauvaises directions, annulations et remplacement de salve ne causent aucun dégât de surf. Après les quatorze retours de référence, le moteur avance de deux pas supplémentaires sans mort. Le test d’esquive sur grille réussit pour les deux gardiens. Les huit autres gardiens n’offrent aucun portail. Les essais couvrent aussi un gardien à un seul PV, une pause, des durées invalides et un préavis bloqué. Le contrôle est simulé sous Node ; le confort tactile reste à éprouver dans la chambre.
