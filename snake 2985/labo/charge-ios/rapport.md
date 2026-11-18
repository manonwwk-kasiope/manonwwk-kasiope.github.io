# Charge réelle sous MobileSafari simulé

18/11/2026 · 01 h 03 (Paris)

Safari 27.2 a exécuté les 160 blocs sur un iPhone 17 simulé sous iOS 27.2. Le viewport était en portrait (402 × 714 CSS). Les deux surfaces de jeu étaient 398 × 199, 290 × 145 CSS. Durée depuis le lancement du protocole : 10,85 min.

## Chemins de rendu

La référence dessine la scène à la résolution du canvas de sortie, avec le DPR plafonné à 2. La sélection dessine à la résolution logique avant agrandissement en 1985 et 2185. Les trois autres dates gardent le même chemin et servent de témoins. Tous les modules visuels, les contrôles d’entrée et les décors peints sont identiques entre les variantes.

| Année | Chemin | Blocs | Images JS | Rappels/s | rAF p95 (ms) | rAF >25 ms | rAF >50 ms | Draw p95 (ms) | Moteur p95 (ms) | Premier rappel après draw (ms) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1976 | reference | 16 | 3272 | 50,8 | 17,0 | 4,7 % | 2,0 % | 8,0 | 0,5 | 23,5 |
| 1976 | selection | 16 | 3442 | 53,3 | 17,0 | 5,3 % | 2,4 % | 7,0 | 1,0 | 34,0 |
| 1985 | reference | 16 | 3795 | 59,0 | 17,0 | 0,9 % | 0,2 % | 8,0 | 0,0 | 22,0 |
| 1985 | selection | 16 | 3760 | 58,4 | 17,0 | 1,1 % | 0,2 % | 8,0 | 0,0 | 23,5 |
| 1995 | reference | 16 | 3846 | 59,8 | 17,0 | 0,3 % | 0,1 % | 7,0 | 0,0 | 21,5 |
| 1995 | selection | 16 | 3833 | 59,6 | 17,0 | 0,8 % | 0,1 % | 7,0 | 0,5 | 21,0 |
| 2185 | reference | 16 | 3841 | 59,7 | 17,0 | 0,3 % | 0,1 % | 7,0 | 0,0 | 23,5 |
| 2185 | selection | 16 | 3835 | 59,6 | 17,0 | 0,5 % | 0,1 % | 7,0 | 0,0 | 24,5 |
| 2985 | reference | 16 | 3835 | 59,6 | 17,0 | 0,5 % | 0,1 % | 1,0 | 0,0 | 25,0 |
| 2985 | selection | 16 | 3846 | 59,8 | 17,0 | 0,4 % | 0,1 % | 1,0 | 0,0 | 25,5 |

Les p95 affichés sont les médianes des p95 de blocs. Les proportions de retards utilisent tous les intervalles du groupe. « Rappels/s » est le nombre de rappels rAF divisé par le temps actif mesuré. Les comptages et les histogrammes de tous les blocs se trouvent dans le JSONL.

## Comparaisons appariées


| Année | Paires | Δ draw p95 (ms) | Δ rAF p95 (ms) | Draw amélioré | rAF amélioré |
|---|---|---|---|---|---|
| 1976 | 16 | -1,0 | 0,0 | 9 | 2 |
| 1985 | 16 | 0,0 | 0,0 | 7 | 1 |
| 1995 | 16 | 0,0 | 0,0 | 3 | 0 |
| 2185 | 16 | 0,0 | 0,0 | 5 | 0 |
| 2985 | 16 | 0,0 | 0,0 | 0 | 1 |

Chaque différence est calculée à phase, taille et réglage de mouvement égaux. Une différence négative favorise la sélection. L’ordre est alterné ; chaque configuration n’a qu’une exécution par chemin.

## Phases, taille et mouvement de la sélection

| Regroupement | Blocs | Images JS | Rappels/s | rAF p95 (ms) | rAF >25 ms | rAF >50 ms | Draw p95 (ms) | Moteur p95 (ms) | Premier rappel après draw (ms) |
|---|---|---|---|---|---|---|---|---|---|
| guide | 20 | 4629 | 57,5 | 17,0 | 2,0 % | 0,6 % | 7,0 | 0,0 | 28,0 |
| grille | 20 | 4723 | 58,7 | 17,0 | 1,3 % | 0,4 % | 7,0 | 0,0 | 24,5 |
| vol | 20 | 4648 | 57,8 | 17,0 | 1,4 % | 0,7 % | 7,0 | 0,0 | 22,5 |
| boss | 20 | 4716 | 58,6 | 17,0 | 1,4 % | 0,3 % | 8,0 | 0,0 | 23,0 |
| grand | 40 | 9095 | 56,5 | 17,0 | 2,9 % | 1,0 % | 7,0 | 0,0 | 25,0 |
| compact | 40 | 9621 | 59,8 | 17,0 | 0,3 % | 0,1 % | 7,0 | 0,0 | 23,5 |
| normal | 40 | 9093 | 56,4 | 17,0 | 3,0 % | 1,0 % | 7,0 | 1,0 | 24,0 |
| réduit | 40 | 9623 | 59,8 | 17,0 | 0,1 % | 0,0 % | 7,0 | 0,0 | 24,0 |


## Bascule et premier écran

| Époque | Premier draw (ms) | Rappel suivant (ms) | Peinture prête au draw (ms) | Images avec peinture (%) |
|---|---|---|---|---|
| 1976 | 288,0 | 304,0 | procédural | procédural |
| 1985 | 1147,0 | 1195,0 | procédural | procédural |
| 1995 | 95,0 | 110,0 | procédural | procédural |
| 2185 | 114,0 | 220,0 | 238,0 | 100,0 % |
| 2985 | 105,0 | 185,0 | 202,0 | 100,0 % |

Le temps de bascule part de la demande de la scène. Le premier draw compte la création du moteur et le temps jusqu’au premier dessin retourné. Le rappel suivant donne une borne approchée de présentation. Le protocole JavaScript a démarré 2150,0 ms après le début de navigation. First Contentful Paint exposé par Safari : 1596,0 ms.

## Pointes et limites

| Année | Phase | Taille | Mouvement | rAF p95 (ms) | Draw p95 (ms) | Simulation p95 (ms) | rAF >50 ms |
|---|---|---|---|---|---|---|---|
| 1976 | vol | grand | normal | 108,0 | 50,0 | 3,0 | 30/82 |
| 1976 | boss | grand | normal | 70,0 | 8,0 | 1,0 | 14/146 |
| 1976 | guide | grand | normal | 59,0 | 7,0 | 1,0 | 16/170 |
| 1976 | grille | grand | normal | 58,0 | 7,0 | 1,0 | 17/164 |
| 1985 | guide | grand | normal | 47,0 | 19,0 | 1,0 | 5/153 |

Le chronomètre du draw couvre le travail JavaScript et les appels synchrones Canvas. Le rAF inclut le scheduling de Safari et la concurrence du simulateur et du Mac. Un retard rAF avec un draw court ne permet pas d’attribuer le coût au GPU. Aucune mesure de présentation du compositeur ou de fréquence native de l’écran n’est exposée ici. Mémoire JS et mémoire du processus WebContent : indisponibles.

Le démarrage a été contrôlé par consultation du processus MobileSafari, capture isolée du simulateur et bref diagnostic système pendant les premiers blocs 1976. Ces premières observations peuvent inclure cette charge. La version 27.2 provient du runtime CoreSimulator et de la version de Safari ; la chaîne de compatibilité de l’agent utilisateur indique aussi iPhone OS 18_7.

Chaque cellule reproduit quatre secondes de temps actif. Le jeu réel et les composants visuels sont chargés sans la coque interactive complète ; les scènes sont préparées pour atteindre les états voulus, notamment le boss de cran 10. Le réglage réduit est transmis au vrai moteur de rendu ; la préférence système est restée désactivée. Les intervalles entre cellules, les transferts de résultats et la pause de contrôle ne comptent pas dans les distributions. Cette première passe couvre un simulateur en orientation portrait, sur deux tailles de canvas. Les durées retournées par Safari sont quantifiées à la milliseconde ; une médiane nulle de simulation est inférieure à la résolution exploitable de cette mesure.

La coroutine du banc a été suspendue pendant 0,25 seconde au milieu du bloc 81 : la simulation et le compteur de dessins sont restés immobiles, puis un rappel les a relancés. Changements réels de visibilité pendant la passe : 0 masquage(s), 0 reprise(s). Tentatives audio : 0.

## Plateau en orientation paysage native

Un complément de 2.70 min affiche un plateau de 520 × 260 CSS, soit 1040 × 520 pixels de sortie. Le viewport natif de Safari est en paysage, obtenu en orientant l’iPhone avec XCUIDevice. L’application utilisée par le banc reste MobileSafari. Les cinq dates et quatre phases sont rejouées dans les deux chemins, en mouvement normal. La première ouverture a produit 31 blocs avant l’arrêt inattendu du simulateur, dont la cause est inconnue. Après un nouveau démarrage, les neuf blocs manquants ont été rejoués sur les mêmes assets. La première case reprise (boss 2185, sélection) redémarre à cache froid. La durée cumulée exclut le redémarrage.

| Époque | Chemin | p95 draw (ms) | p95 rAF (ms) | rAF >25 ms | rAF >50 ms |
|---|---|---|---|---|---|
| 1976 | reference | 7,0 | 17,0 | 2,0 % | 0,6 % |
| 1976 | selection | 7,0 | 17,0 | 1,0 % | 0,0 % |
| 1985 | reference | 8,0 | 17,0 | 0,6 % | 0,1 % |
| 1985 | selection | 11,0 | 17,0 | 0,8 % | 0,1 % |
| 1995 | reference | 7,5 | 17,0 | 0,6 % | 0,2 % |
| 1995 | selection | 7,5 | 17,0 | 0,5 % | 0,1 % |
| 2185 | reference | 7,0 | 17,0 | 0,0 % | 0,0 % |
| 2185 | selection | 7,0 | 17,0 | 1,8 % | 0,3 % |
| 2985 | reference | 1,0 | 17,0 | 2,4 % | 0,8 % |
| 2985 | selection | 1,0 | 17,0 | 2,2 % | 0,9 % |

En paysage, sur les quatre phases :
- 1985 : le chemin logique fait passer le p95 médian de dessin de 8,0 à 11,0 ms et celui des intervalles rAF de 17,0 à 17,0 ms.
- 2185 : le chemin logique fait passer le p95 médian de dessin de 7,0 à 7,0 ms et celui des intervalles rAF de 17,0 à 17,0 ms.

Les deux chemins utilisent le même moteur, les mêmes scènes et les mêmes peintures. Les relevés attribuent la différence au chemin de dessin complet. Ils ne ventilent pas le temps entre le dessin de primitives, la quantification des couleurs et la copie ou composition de la surface.
