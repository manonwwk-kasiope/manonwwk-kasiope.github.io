# Premières images jouées dans MobileSafari
18/11/2026 · 02 h 20 · Paris

Édition 271669921f6c49f3, iPhone 17 simulé sous iOS 27.2, écran paysage, viewport Safari 874 × 292 pixels CSS. La borne tourne avec ses moteurs, graphismes, cadence et commandes de production. Le test touche « Jouer en silence » en 1976, laisse le serpent avancer jusqu’à sa mort, choisit 2985 puis relance depuis sa préparation. Le service worker et les médias sont bloqués sur cette origine de test. Zéro requête MP3 et zéro tentative de lecture ou de création de contexte audio.

| Départ | Intervalles | Fenêtre | Premier rappel après toucher | Médiane | P95 | Plus long intervalle |
|---|---:|---:|---:|---:|---:|---:|
| 1976 | 104 | 2 006 ms | 37 ms | 17 ms | 31 ms | 92 ms |
| 2985 | 117 | 2 004 ms | 8 ms | 17 ms | 19 ms | 37 ms |

Deux intervalles dépassent 50 ms en 1976. Aucun ne dépasse 50 ms en 2985. La durée d’exécution du rappel de jeu atteint respectivement 41 ms et 13 ms au maximum. Un intervalle entre deux rappels inclut également l’attente entre images.

La sonde enveloppe uniquement le rappel rAF nommé frame du planificateur de la chambre. Elle lit ses timestamps natifs, mesure sa durée murale et envoie le tableau une fois la fenêtre terminée. XCTest ne sonde pas le DOM et ne prend aucune capture pendant ces deux fenêtres. La latence part du clic de confiance au premier rappel exécuté. Ces timings ne mesurent pas la présentation physique des pixels.

Il y a un départ par année sur simulateur. 1976 ouvre la première partie du processus, et 2985 bénéficie d’une session déjà en jeu. Les résultats ne permettent pas d’attribuer leurs différences à l’année ni de conclure sur un iPhone physique. Les observations brutes sont dans mesures.jsonl et les quantiles peuvent être recalculés avec analyser.py.

## Contre-épreuve · mis à jour le 18/11/2026 à 02 h 23

Après extinction et redémarrage du simulateur, Safari a retrouvé 2985 sur la même origine. Le serveur a enregistré des réponses 304 pour le bundle, la CSS et la jaquette. La mémoire de processus était neuve, et ces ressources étaient déjà en cache sur disque. Les prises suivantes s’enchaînent dans le même document avec les boutons de saut et de nouveau cycle.

| Ordre et date | Intervalles | Fenêtre | Premier rappel après toucher | Médiane | P95 | Plus long intervalle | Intervalles > 50 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 · 2985 | 89 | 2 004 ms | 34 ms | 17 ms | 50 ms | 108 ms | 4 |
| 2 · 1976 | 112 | 2 000 ms | 15 ms | 17 ms | 21 ms | 83 ms | 1 |
| 3 · 2985 | 121 | 2 015 ms | 15 ms | 17 ms | 17 ms | 25 ms | 0 |
| 4 · 1976 | 117 | 2 001 ms | 9 ms | 17 ms | 19 ms | 52 ms | 1 |

Dans les deux prises qui ouvrent une session, le maximum survient entre les deux premiers rappels. Les reprises de 1976 comportent encore un intervalle de 83 ms, puis un de 52 ms, tous deux plus tard dans leur fenêtre. Les six prises ne suffisent pas à isoler une cause de rendu. XCTest a terminé les deux séances. Les quatre prises complémentaires figurent dans reprises.jsonl et reprises.json. Les lancements ont utilisé exclusivement le simulateur et les serveurs locaux.
