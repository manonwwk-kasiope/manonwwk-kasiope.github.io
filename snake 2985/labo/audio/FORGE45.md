# Les 45 sons de forge au premier tir

18/11/2026 · 02 h 24, Paris

Le tir de chaque noyau porte la signature de son catalyseur dès les 120 premières millisecondes. Écho répète un accent aigu après 71 ms. Chaîne gravit deux intervalles. Explosion plonge de 485 à 155 Hz. Ces notes utilisent la palette de l’année et tiennent dans le tampon du noyau. La durée, la priorité et le nombre de voix par tir restent ceux du noyau. Un événement ancien dépourvu de modificateur garde son son d’origine. [Synthèse](priorites.js)

| Époque | Premier départ distinct, avant → après | Salve à vide | Salve avec impact | Plus faible distance entre départs sur 120 ms |
|---|---:|---:|---:|---:|
| 1976 | 3 → 9 | 6 → 9 | 9 → 9 | 0,2208 |
| 1985 | 3 → 9 | 6 → 9 | 9 → 9 | 0,2201 |
| 1995 | 3 → 9 | 6 → 9 | 9 → 9 | 0,2297 |
| 2185 | 3 → 9 | 6 → 9 | 9 → 9 | 0,2185 |
| 2985 | 3 → 9 | 6 → 9 | 9 → 9 | 0,2389 |

Le témoin distinguait le modificateur au contact. À vide, les couples Chaîne/Explosion d’un même noyau produisaient des échantillons identiques. Seul Écho répétait le tir au tick 47. Le nouveau banc obtient 45 empreintes distinctes dans chacun des trois scénarios, y compris entre époques. Les 15 départs historiques reproduisent leur empreinte brute antérieure. [Témoin](forge45-temoin.json) · [90 scènes et descriptions individuelles](forge45-resultats.json)

## Mesure

Le banc équipe le vrai moteur de la campagne avec ses extensions de forge dans l’ordre de la chambre. Il observe 144 ticks de vol à 120 Hz, avec un drone devant le serpent ou sans cible. Tous les événements passent par le lecteur de campagne. La mesure isole ensuite les sources forge effectivement admises, avec leurs gains. Elle compte 60 événements à vide et 105 avec cible, tous admis. Deux secondes de mémoire par salve incluent la décroissance complète des sources. Les sorties de l’appareil restent fermées. [Banc](forge45.cjs)

Les deux canaux sont rabattus en mono à 12 kHz. Deux empreintes SHA-256 tronquées à 80 bits portent sur le PCM brut et le PCM normalisé au même niveau efficace. Le JSON indique également le centre de gravité spectral et le temps entre 10 % et 90 % de l’énergie. La distance de Hellinger compare la répartition d’énergie temps/fréquence de deux sons à énergie totale égale (fenêtre de Hann de 256 échantillons, pas de 128). Le tableau donne le minimum des 36 paires par année sur les premiers 120 ms. Zéro désigne des distributions identiques. La reconnaissance par des joueurs en situation reste à évaluer. [Calcul](forge45-mesure.py)

## Alertes et coût

Quatre graines par année, avec les cinq MP3 décodés localement par FFmpeg, donnent 240 annonces boss/plan admises sur 240. Le pic mono du mix atteint −3,19 dBFS avant limiteur. Le pic de forge isolée atteint −13,81 dBFS. La différence maximale défavorable du rapport annonce/reste vaut 0,064 dB par rapport aux départs historiques, avec six voix simultanées au maximum dans ces traces. [Résultats de charge](forge45-charge.json)

À 48 kHz sur ce Mac, la synthèse à froid du tampon présente un 95e percentile de 0,88 à 2,57 ms selon l’époque, et la réutilisation du cache coûte au plus 0,004 ms au 95e percentile. Les tampons stéréo des neuf départs occupent 1 131 264 octets par année entièrement visitée (377 088 pour les trois départs historiques). Les durées mesurent Node sur Mac. Le banc PCM reproduit les gains avec un contexte factice et mesure avant le compresseur. [Protocole de charge](forge45-charge.cjs)

Rejouer dans ce dossier avec NumPy déjà présent. Le premier banc imprime ses mesures en JSON. Le second utilise FFmpeg local et écrit aussi sur la sortie texte.

```sh
OPENBLAS_NUM_THREADS=1 PYTHON=/tmp/snake2985-son/bin/python node forge45.cjs
node forge45-charge.cjs
node --test test-bande-campagne.cjs
```

Mis à jour à 02 h 25. WebKit 26.0 a également rendu un tir de forge par époque au travers de son compresseur et mesuré l’accent du catalyseur sur les deux canaux. [Recette native et mesures](hors-sortie.md)
