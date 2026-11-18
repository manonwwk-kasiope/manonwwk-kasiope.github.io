# Mise à jour hors ligne de SNAKE 2985

18/11/2026 · 01 h 39 (Paris), mis à jour à 01 h 40. Édition Node `7cbb86353616ee5d`.

Le service worker reçoit les SHA-256 complets calculés sur les fichiers de la distribution. Pour chaque URL de sa portée, il relit les octets d’une réponse complète conservée, calcule son empreinte avec Web Crypto et la compare à celle de la nouvelle édition. Une correspondance permet de copier la réponse et ses en-têtes dans le cache en préparation. À défaut, le worker télécharge la ressource et soumet son contenu au même contrôle. La réparation à la demande vérifie aussi l’empreinte.

La première installation exige les quatre ressources de démarrage et autorise les illustrations ou musiques temporairement absentes. Lors d’une mise à jour, tous les actifs sont obligatoires. Si le réseau coupe ou sert un seul octet différent, le worker supprime le cache en préparation et l’édition active continue à servir. L’activation réussie nettoie les anciens caches de la portée. Republier l’ancienne édition suit la même procédure et récupère les seuls fichiers qui diffèrent encore.

## Mesure locale

La recette `node hors-ligne.cjs` assemble deux distributions identiques puis construit deux mises à jour dans des répertoires temporaires. Elle utilise les réponses HTTP locales, l’implémentation Fetch de Node, Web Crypto et un modèle en mémoire de Cache Storage. Elle compte les requêtes d’actifs et les octets des corps, avec un serveur sans compression HTTP. Le script de service worker et les en-têtes de transport sont exclus de cette table. Le fichier `hors-ligne-maj-node.json` conserve la mesure de l’édition indiquée.

| Installation ou changement | Requêtes d’actifs | Octets reçus |
| --- | ---: | ---: |
| Première installation complète | 27 | 20 298 232 |
| Ancienne édition à quatre dates, sans manifeste d’empreintes | 21 | 3 085 444 |
| JavaScript modifié, avec son URL versionnée dans HTML | 2 | 386 118 |
| Un octet modifié dans un seul MP3, longueur conservée | 1 | 3 164 831 |
| Même changement avec un aperçu de 1995 corrompu en cache | 2 | 3 471 867 |
| Même changement et coupure pendant la demande du MP3 | 2 | 307 036 |
| Même changement et MP3 réseau de longueur correcte, contenu erroné | 2 | 3 471 867 |
| Retour à l’édition dont le MP3 précédent doit être restauré | 1 | 3 164 831 |

La mise à jour JavaScript économise 98,1 % du corps des actifs par rapport à la première installation de cette édition. Le cache à quatre dates fournit ses cinq MP3 et son manifeste. Le test lit les cinq nouveaux aperçus hors ligne et vérifie 80 réponses de plage sur les illustrations et les morceaux. La coupure intervient après le transfert de l’aperçu de 307 036 octets ; les deux essais de mise à jour interrompue préservent l’édition active. Le scénario initial avec deux médias absents vérifie leur réparation ultérieure.

Une mise à jour exige de lire les fichiers locaux et d’écrire le nouveau cache, avec coexistence transitoire des éditions. La capacité disponible sur l’iPhone et le temps de hachage Safari restent à mesurer sur l’appareil. Un budget réseau réel comprend également le téléchargement de `sw.js`, les en-têtes et les variations de compression. Le reçu navigateur incrémental s’obtient avec `node hors-ligne.cjs --browser-reuse`, dans un créneau réservé au headless-shell muet.

## Cache Storage réel

Mis à jour à 01 h 56. L’édition Chromium `89c68d01c4c755f3` contient les changements de campagne intervenus depuis la mesure Node. Le serveur local a reçu 27 requêtes d’actifs pour 20 320 721 octets à neuf, 2 pour 407 720 octets après un changement JavaScript et 1 pour 3 164 831 octets après la modification du MP3 ou son retour à la version précédente. Les quatre vérifications de mise à jour ont chacune demandé en plus les 7 967 octets du service worker. Le redémarrage du processus hors ligne a retrouvé les 27 fichiers, les quatre scores et les quatre fantômes historiques. Les 20 médias testés ont servi les bonnes plages d’octets. Source : `hors-ligne-maj-chromium.json`.
