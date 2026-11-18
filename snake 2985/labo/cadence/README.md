# Rejouer une même partie sur des écrans de fréquences différentes

**18/11/2026 · 01 h 44, Paris**

**Recommandation de laboratoire : 60 pas de simulation par seconde sur la grille, 120 en vol, avec avancement des pas échus avant chaque commande de jeu.** Sur la trace 1995, cette politique conserve la victoire à 19 700 points dans les quatre conditions. La boucle variable donne 1 800 points et une défaite à 30 Hz, 19 700 et une victoire à 60 Hz, 13 775 à 120 Hz et 11 750 en cadence irrégulière. Dans ces deux derniers cas, le jeu est encore en cours à la fin de la fenêtre d'observation de 55 s. Les trois prises concernent des pilotes simulés. Les résultats complets figurent dans `resultats.json`, les entrées datées dans `commandes.json`.

## Ce qui a été rejoué

| Partie | Entrées | Origine des gestes |
|---|---:|---|
| Grille 1976 | 6 | Cellule, virages, nova et changement de plan avant la mort |
| Vol 2985 | 47 | Premier portail, visées analogiques vers les trois anneaux, retour puis mort |
| Campagne 1995 | 347 | Pilote de campagne existant, du premier cap à la victoire contre les deux gardiens, avec les ateliers |

Les traces commencent à zéro, depuis `engine.create`, année et graine identiques entre relectures. La forge équipée est Prisme/Chaîne. Décisions et visées sont enregistrées pendant la partie de référence à 60 Hz. Chaque commande reçoit une position explicite à l’intérieur de son intervalle de rendu. Lors des rejeux, le pilote est débranché et les commandes sont reprises telles quelles, même si une autre version de la trajectoire heurte un drone. Aucun point, cellule, boss, position ou issue n’est injecté.

La simulation reprend le moteur, les gardiens, le vol, la forge, les surcharges, l’écologie, la relance, l’équilibrage et le directeur locaux. Les entrées sont exprimées au niveau des commandes moteur ; le navigateur, la projection du manche depuis les pixels, le rendu, l'audio et le délai matériel de la dalle ne sont pas mesurés. Les menus d’atelier sont traités par des commandes de la trace. Le banc compare le temps actif du jeu ; les pauses utilisateur sont éprouvées séparément.

Les timestamps des images sont arrondis à 0,1 ms. Les cadences fixes sont 30, 60 et 120 Hz. La quatrième séquence répète 8, 27, 11, 21, 9 et 24 ms entre images. Les observations à chaque seconde portent sur score, statut, cause, temps de jeu, corps, direction, niveaux, charges et horloges d’armes, drones et leurs destinations, intégrité/phase du boss, état du vol et rythme des rencontres. Les nombres sont arrondis à six décimales avant empreinte. La vérification concerne ces champs de simulation.

## Séparer la réception d'un geste et le pas du moteur

Chacune des trois cadences alternatives est comparée au rejeu à 60 Hz du **même modèle**, soit neuf comparaisons par méthode.

| Méthode | Chronologie et état identiques à chaque seconde | Chronologie des scores identique |
|---|---:|---:|
| Boucle actuelle, temps variable | 0/9 | 6/9 |
| Temps variable subdivisé à l'instant exact de chaque commande | 0/9 | 6/9 |
| Pas fixe 60 Hz ; commandes immédiates sur le dernier état dessiné | 7/9 | 7/9 |
| Pas fixe 60 Hz ; pas échus simulés avant le geste | 9/9 | 9/9 |
| Pas fixe 120 Hz ; même traitement des gestes | 9/9 | 9/9 |
| 60 Hz grille, 120 ou 240 Hz vol ; même traitement | 9/9 pour chaque variante | 9/9 pour chaque variante |

Dans la boucle actuelle, un appui situé entre deux images modifie un état dont l’horloge s’est arrêtée à l’image précédente. Deux fréquences peuvent ainsi placer le même virage de part et d’autre d'une avancée de case. Le contrôle à pas fixe seul isole cet effet. Le contrôle qui subdivise exactement à chaque geste élimine ce décalage, mais laisse le moteur avancer sur des durées différentes entre deux gestes. Ses traces diffèrent encore. Les règles dépendantes d’une échéance (déplacement, salve, rotation du vol, rencontre) sont également sensibles au découpage. Le banc n’attribue pas chaque défaite particulière à un seul de ces mécanismes.

## Pilotage au doigt

`virage.cjs` rejoue 100 instants d’appui par cadence sur le vol 2985 réellement atteint. Le cap cible change immédiatement dans le gestionnaire. On mesure ensuite le délai jusqu’à la première image simulée où le corps présente une variation d’angle supérieure à 0,001 radian. La lecture ne comporte pas le temps du compositeur ni de l'écran physique.

| Condition | P95 actuel | P95 avec 60 Hz partout | P95 avec 60/120 | P95 avec 60/240 |
|---|---:|---:|---:|---:|
| 30 Hz | 31,4 ms | 31,7 ms | 31,7 ms | 31,7 ms |
| 60 Hz | 15,7 ms | 16,0 ms | 16,0 ms | 16,0 ms |
| 120 Hz | 7,7 ms | 16,0 ms | 8,0 ms | 8,0 ms |
| Cadence irrégulière | 22,7 ms | 32,7 ms | 29,7 ms | 25,7 ms |

La variante 60/120 préserve presque toute la réponse du manche aux trois fréquences régulières. Elle ajoute 7 ms au P95 avec la séquence irrégulière mesurée. La variante 60/240 ramène ce surcoût à 3 ms mais consomme 892 appels de simulation sur la trace de vol, contre 524 pour 60/120. Sur le parcours des gardiens, 60/120 emploie 3 234 appels, contre 3 120 à 60 Hz et 6 236 à 120 Hz. Il s’agit de comptes d'appels, pas d'une mesure de consommation électrique. À 120 Hz d’affichage pendant le déplacement sur grille, le rendu peut conserver ou interpoler les poses entre les états 60 Hz ; ce banc ne mesure pas leur fluidité visuelle.

## Raccord optionnel

Le fichier `cadence.js` est autonome. L'approche reprend le principe d’accumulation de temps présenté par Glenn Fiedler dans [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/).

1. Construire `const ticks=SnakeCadence.create(simuler,()=>state.flight?120:60)`. Dans `simuler(dt)`, avancer le monde, les armes et le directeur, puis traiter les changements de statut à chaque pas. Terminer par `return screen==='play' && state.status==='playing'`. Ne dessiner, synchroniser le DOM et piloter la musique qu'une fois par image. Traiter ou accumuler les événements de chaque pas dans l’ordre pour préserver les captures de reprise avant vidage.
2. À chaque image en jeu appeler `ticks.advance(now)`. Avant toute commande (cap, virage, nova, plan, turbo, surf ou évolution) avancer au timestamp monotone de sa livraison, puis vérifier que l'avancée a laissé le jeu actif avant de l'appliquer. Mettre à jour le cap clavier tenu au pas de simulation. Pour le manche tactile, saisir la commande dans le gestionnaire de pointeur. Le rendu du manche reste immédiat.
3. Au passage en pause, à une interruption de visibilité, au changement de partie ou d’atelier, appeler `ticks.reset()`. À la reprise, appeler `ticks.reset(performance.now())` sur l’horloge de cette reprise. Les pas non joués sont abandonnés. Une image retardée en jeu est bornée à 80 ms, comme la boucle actuelle. Les commandes d’une session interrompue sont écartées. Une entrée livrée après une image qui a déjà simulé sa date historique ne peut être antidatée par ce module. L’expérience exclut les entrées livrées hors ordre et les événements que le navigateur aurait fusionnés.
4. La tolérance de demi-quantum (0,05 ms) compense l’arrondi des timestamps de ce banc. Le crédit reste signé pour éviter la dérive sur les sessions longues.

**Vérifier localement** avec `node mesure.cjs`, `node virage.cjs` et `node --test cadence.test.cjs`. Le premier conserve le fichier de commandes enregistré. L'option `--enregistrer` recrée les trois prises en utilisant le moteur présent sur disque. Le module reste dans le laboratoire ; le temps d'image sur téléphone, le coût du pipeline réel et le confort d'un joueur restent à vérifier avant un éventuel déploiement.

## Rejeu dans la chambre WebKit

**18/11/2026 · 02 h 02, Paris.** WebKit 26.0 a exécuté la chambre de campagne, son canvas et ses gestionnaires de commandes en 568 × 300, avec mouvements réduits et verrou muet activé avant le chargement. Une horloge pilotée distribue les images à 30, 60, 120 Hz ou à intervalles irréguliers. Les chiffres mesurent la reproductibilité de la simulation. La fréquence physique d’un écran, la latence matérielle et la caméra en animation complète restent hors de cette mesure.

| Trace enregistrée | Commandes par rejeu | Observations par seconde, nombre total | Résultat aux quatre cadences avec la boucle intégrée |
| --- | ---: | ---: | --- |
| Grille 1976 | 6 | 9 | Mort, 125 points |
| Vol 2985 | 47 | 9 | Mort, 550 points |
| Campagne 1995 | 562 | 64 | Victoire, 29 950 points |

Les 24 exécutions utilisent les trois mêmes enregistrements de commandes, chacun joué huit fois. Pour chaque geste, le banc vérifie la réception d’un événement DOM de confiance à la date prévue, avec la touche ou les coordonnées attendues. Les relevés de physique à chaque seconde et au terme de chaque trace concordent dans les neuf comparaisons à leur référence de 60 Hz. Le témoin à pas variable diverge dans les neuf comparaisons. Sur la campagne 1995, il termine à 1 700 points par mort à 30 Hz, et poursuit la partie à 10 350, 23 750 et 10 100 points respectivement à 60 Hz, 120 Hz et en cadence irrégulière.

La première passe détectait deux divergences sur la campagne 1995 dès la deuxième seconde. L’angle et la position de la tête différaient entre des parties qui terminaient sur le même score. Le passage du contrôleur grille au contrôleur de vol se faisait au dessin. La chambre le fait désormais après les événements de chaque pas physique. Les mêmes commandes enregistrées ont permis de vérifier la correction.

Reproduction depuis ce répertoire avec `node --test webkit-preflight.test.cjs`, puis `node webkit.cjs` pendant un créneau navigateur. Le lanceur échoue si les états divergent, si une commande manque ou si le verrou muet échoue. Les fichiers `webkit-commandes.json`, `webkit-avant.json` et `webkit-resultats.json` contiennent respectivement les traces physiques, les écarts avant correction et les résultats vérifiés.

**Caméra animée, mis à jour à 02 h 07.** `CADENCE_MOTION=normal node webkit.cjs` conserve les mêmes commandes écran, rétablit les mouvements du plateau et écrit dans `webkit-anime-resultats.json`. Il journalise pour chaque prise de caméra le temps du monde, le BPM et la phase du battement. Le verrou audio reste actif. La première passe en caméra normale trouvait cinq comparaisons divergentes sur neuf. Sur le garde de 1995, l'angle de vol divergeait à la deuxième seconde, car le départ de la prise de caméra utilisait le battement du dernier dessin. L'échantillonnage du battement à l'instant du pas physique et du geste a corrigé tous les écarts en vol 2985. Sur le parcours 1995, la deuxième passe a isolé deux écarts de charge de nova après un passage à l'atelier. 

**Caméra animée, mis à jour à 02 h 08.** La pause en atelier et la fin de partie mémorisent à présent la position du morceau à l'instant physique de l'événement. Les neuf comparaisons de la boucle intégrée concordent aux quatre cadences. Les commandes enregistrées donnent 125 points en grille et 550 en vol avec trois anneaux traversés. En 1995, le premier gardien tombe à 23,825 secondes de simulation et le score atteint 11 475 points à la fin des commandes, avec une partie encore active. Les quatre rejeux de 1995 déclenchent la prise de caméra de la nova au même battement (phase 0,851010046, arrondie à neuf décimales). Voir `webkit-anime-avant.json`, `webkit-anime-apres-battement.json` et `webkit-anime-resultats.json` pour les trois passes successives.
