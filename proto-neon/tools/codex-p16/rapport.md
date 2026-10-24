# codex-p16c — retrait des gains non prouvés et diagnostic R-30

18/10/2026 · 04 h 48 (Paris), mis à jour à 04 h 48.

Commande exacte à lancer **hors bac**, depuis `proto-neon/` :


```sh
node tools/codex-p16/verifier.mjs
```

Reçu neuf : `tools/codex-p16/navigateur-p16c/resultats.json`. Option séparée : `node tools/codex-p16/verifier.mjs --raccords` teste seulement les raccords caméra/gel en mémoire. Les sources réservées restent intactes. Un seul Chromium muet, profils paysage tactile 844 × 390, portrait tactile 390 × 844 et bureau 1440 × 900, en série. **Ce navigateur n'a pas été lancé ici.** Aucun serveur, réseau sortant ou commit dans ce bac.

## Décision et état livré

Les optimisations de `10-gfx.js` et `78-hud.js` sont retirées : ces fichiers sont exactement restaurés aux sources initiales du lot. `20-crt.js` était déjà inchangé. **Aucun gain de performance revendiqué ou conservé.** Le raccord de performance du décor n'est plus appliqué par l'option du vérifieur ; sa proposition ancienne est historique.

Les seules différences restantes dans les modules de jeu sont les ajouts de paramètres du banc dans N.R : imageP16, attenteP16, rejeuP16 (borne ×4, tranche 0,25 s, reprises du protocole des pilotes). Les corrections d'instruments R-20/R-30 restent. Le build final sort à 0 ; les deux variantes instrumentées se compilent, leurs 85 références relatives d'actifs existent localement (`instrument-statique.json`, `bundles.json`). Aucun seuil abaissé.

## R-30 : reçu navigateur puis instrument contrôlé

**Reçu hors bac du 18/10, 04 h 23–04 h 37**, conservé sans réécriture dans `recu-p16b/` et à son emplacement d'origine `navigateur/` :

| Mesure R-30 | Avant initial du lot | Candidate optimisée reçue |
|---|---|---|
| réinitialisation : même graine → même journal initial | ok | ok |
| simulé : même graine → même journal | ok | ok |
| graine différente → apparitions différentes dans le détail | ok | ok |
| dessiné : même graine → même journal | ok | echec |
| dessiné = simulé (types de jeu) | echec | echec |

Le premier écart dessiné/dessiné est l'entrée 7 : pas 98 et temps 0,8166666666666662 identiques, mais flash.d._image vaut 55 contre 54. La boucle native incrémente S.frame dès le chargement (`90-boot.js:439`) ; reset ne remet pas ce compteur à zéro ; le limiteur le recopie (`50-fx.js:260`). La durée de chargement/JIT peut donc changer ce numéro malgré __DT fixe. Le reçu ne démontre pas un aléatoire consommé par gfx/HUD.

**Preuve causale VM, pas Canvas :** avec exactement une image de préchargement supplémentaire, les DEUX versions divergent au même endroit : entrée 7, _image 49 → 50, même pas 99 et même temps 0,8166666666666662. À départ synchronisé, les DEUX donnent les mêmes 492 entrées dessinées. Le jeu de la candidate reçue et celui de la candidate finale donnent eux aussi exactement les mêmes 492 entrées. Les journaux complets, états, horloges et empreintes du tampon indexé sont dans `diagnostic-p16c.json`.

Le nouvel instrument installe un RAF contrôlé **avant boot au rechargement** et appelle les vraies frames. Le démarrage applique le protocole public des pilotes (profil vierge, jour imposé, actions, skip, reset plongée, amorçage horloge). Les films sont remplacés par leurs panneaux fixes dans ce banc de déterminisme, pour exclure leur horloge murale. **Aucun champ de flash supprimé** entre deux dessins. Les témoins statiques refusent une différence _image, un kill modifié ou absent ; le RAF conserve l'annulation et reporte au tick suivant les rappels enregistrés pendant un tick.

**Toutes les mesures VM à 60 s**, même instrument des deux côtés ; « avant » désigne maintenant la candidate optimisée reçue, « après » le retrait des optimisations. Sources : `diagnostic-p16c.json` et `complements-p16c.json`.

| Mesure | Avant reçu | Après correction |
|---|---|---|
| Journal initial répété | identique, 2 / 2 | identique, 2 / 2 |
| Simulé répété | identique, 338 / 338 | identique, 338 / 338 |
| Graines différentes | différentes, 34 / 32 apparitions | différentes, 34 / 32 |
| Dessiné répété | identique, 492 / 492 | identique, 492 / 492 |
| Vraies frames avec/sans dessin, types de jeu | identique, 427 / 427 | identique, 427 / 427 |
| Dessiné = dbg.simuler, types de jeu | ÉCHEC, entrée 19 | ÉCHEC, entrée 19 |
| __ERR et console | zéro | zéro |

Le contrôle avec/sans dessin emploie la même boucle frame, une fois avec `nodraw=1` : il isole l'effet du dessin des différences de boucle de simulation. Le journal inclut les résultats réels et toutes les décisions du pilote. **R-30 global reste en échec sur les sources non raccordées** ; ce défaut antérieur n'est pas compté comme une régression de cette reprise. Les résultats navigateur du nouvel instrument restent à vérifier.

## Défauts de simulation antérieurs, séparés

Le premier écart de type de jeu (entrée 19) vient de l'ordre de la caméra : frame l'avance dans game.update avant le pas de jeu, dbg.simuler après game.update. Le raccord déjà proposé de `79-jeu.js` supprime cet écart initial. Il ne suffit pas jusqu'à 60 s : un autre écart apparaît à l'entrée 219, après le niveau à 36,683333333331895 s.

La trace publique ajoutée dans `complements-p16c.json` montre à ce niveau **hitstopLeft=10 images mais horloge.gel=0**. dbg.simuler n'avance pas S.frame ; le reliquat du gel posé à 14,175 s reste dans hitstopLeft. `50-fx.js:883` s'en sert pour borner la durée du nouveau ralenti. En mémoire seulement, remplacer cette borne par `N.horloge.etat().gel`, en plus du raccord caméra, rétablit **427 / 427 entrées de jeu identiques jusqu'à 60 s**, score 10070, zéro erreur. La fin de la dernière tranche simulée dépasse le temps cible, donc les temps finaux diffèrent ; la comparaison garde tous les événements jusqu'à la même borne, comme le critère.

`raccord-79-jeu.js.patch` et `raccord-50-fx.js.patch` sont proposés dans le dossier de mission. Aucun fichier réservé n'est écrit. Cela modifie la simulation et demande une intégration/revue séparée ; ce diagnostic borné ne qualifie pas tous les gels/ralentis ou les 80 parties après ces raccords.

## R-20 apparié : dispersion et retrait

Source : `recu-p16b/resultats.json`, r20Apparie, 600 paires par ligne, 120 images d'échauffement, frames sans enveloppes de modules, AB/BA alterné. Ces valeurs décrivent **l'ancien avant initial → ancienne candidate optimisée**, pas une nouvelle exécution.

| Profil / scène | p95 avant → après, ms | delta p50 | delta moyen | écart-type delta | delta min / max |
|---|---:|---:|---:|---:|---:|
| paysage / charge | 4,0000 → 3,9050 | 0,0000 | -0,0198 | 0,5459 | -4,1000 / 7,1000 |
| paysage / v5 | 3,9050 → 3,6000 | 0,0000 | -0,0302 | 0,5239 | -2,5000 / 2,6000 |
| paysage / vol | 2,3000 → 2,4000 | 0,0000 | -0,0032 | 0,4102 | -6,0000 / 1,7000 |
| paysage / boss3 | 3,2000 → 3,2000 | 0,0000 | -0,0075 | 0,4840 | -6,8000 / 4,9000 |
| portrait / charge | 3,3050 → 3,2050 | 0,0000 | -0,0143 | 0,4339 | -2,7000 / 6,8000 |
| portrait / v5 | 3,4000 → 3,5050 | 0,0000 | 0,0083 | 0,5537 | -2,9000 / 3,5000 |
| portrait / vol | 2,4000 → 2,2000 | 0,0000 | -0,0070 | 0,4031 | -1,7000 / 5,5000 |
| portrait / boss3 | 2,9050 → 2,8000 | 0,0000 | -0,0312 | 0,3636 | -4,7000 / 1,4000 |
| bureau / charge | 9,6000 → 9,3050 | -0,0000 | -0,0783 | 0,7044 | -2,6000 / 2,6000 |
| bureau / v5 | 9,1000 → 8,9000 | 0,0000 | 0,0328 | 0,7637 | -3,7000 / 2,7000 |
| bureau / vol | 7,0050 → 7,0000 | 0,0000 | -0,0243 | 0,4742 | -3,0000 / 1,6000 |
| bureau / boss3 | 10,2000 → 10,1050 | 0,0000 | -0,0707 | 0,8688 | -6,8000 / 3,6000 |

En charge paysage, les moyennes AB donnent 2,6253 → 2,5827 ms ; BA donne 2,5647 → 2,5677 ms : le signe s'inverse. Les 12 médianes de différences appariées valent zéro. Les séries brutes et les deux strates d'ordre restent dans le reçu. Ni le petit écart global ni le profilage enveloppé ne permettent d'attribuer un gain fiable à chacune des optimisations. Elles sont retirées ensemble. Les valeurs séquentielles du critère (charge ×1 3,5 → 2,7 ms et ×4 14,98 → 5,0 ms) restent des observations historiques et ne démontrent pas une accélération causée par ce lot.

La relance garde AB/BA, les séries brutes, p50/p95/p99, moyenne/écart-type/min/max, les pixels indexés **et** RGBA après CRT, les états et les journaux. « Avant » de cette relance = sources reçues sauvegardées dans `sources-recues-p16c.json` pour gfx/CRT/HUD, même socle final et paramètres du banc ; « après » = sources finales restaurées. Les SHA-256 des modules, bundles physiques/servis, scripts de critères et réponses HTTP sont publiés. Aucun gain n'est requis ou promis après le retrait.

## SNAKE 2030 : limite de la comparaison reçue

Le reçu brut reste en échec avant et après : 2975/2030 = 3.5/0.6 ms puis 2.7/0.4 ms. Il ne contient pas les phases ou pauses de 2030 pendant cette fenêtre. **Impossible de conclure rétroactivement que 2030 était mort, au menu ou correctement en jeu.**

Lecture du code : `ouvrirSnake2030` vérifie play immédiatement après startRun, puis R-20 attend l'échauffement et la fenêtre entière sans recontrôler. Il ne lance aucun pilote ; contrairement à 2975, le banc ne désactive pas l'adaptation de 2030. Le profil, __DT, le facteur CPU, l'échauffement et la durée sont bien identiques ; la fixture charge 2975 et le début de partie 2030 restent deux charges différentes, ce que le nouveau reçu dit explicitement. La comparaison reçue n'établit donc pas toutes ses conditions d'exécution.

Le nouvel R-20 observe pendant la fenêtre, toutes les 100 ms et aux bornes : phase, pause, temps, ennemis, qualité 2030, dimensions Canvas/tampon. Les coûts bruts sont conservés. Une phase inactive, une pause, un temps immobile ou une qualité variable donnent **non mesurable**, jamais OK. Si les observations sont en jeu actif à qualité stable, le seuil strict `snake2975 < snake2030` est conservé, y compris son échec éventuel. Cette surveillance échantillonnée ne désactive pas l'adaptation de 2030 ni ne prouve une égalité de charge. Aucun changement de son jeu ou de son instrument hors réservation. Le statut réel du nouveau test reste **à vérifier hors bac**.

Le ratio de temps ×4 conserve la correction p16 : différence de horloge.reel (pas effectivement traités), avec ancien ratio t en métadonnée. Les contrôles statiques conservent le témoin normal, le ralenti voulu et la vraie perte CPU ; seuil 0,99 inchangé.

## 80 parties, calibration, vérifications et limites

La VM utilisée ici reproduit exactement **10 références sur les sources e1bdc6f** (temps, vague, score, arrêt et erreurs), avant les diagnostics. Le premier diagnostic a ensuite échoué sur un paramètre rejeuP16 absent de la photographie reçue ; `diagnostic-p16c-echec-config.log` conserve cette erreur d'instrument. La configuration de banc est désormais identique dans les deux VM. La calibration déjà réussie a été réemployée pour la correction, sans la rejouer.

**80 / 80 parties identiques, réemploi contrôlé des reçus existants ; zéro nouvelle partie de ce lot de pilotes annoncée.** Les sources finales restaurent exactement la source du reçu avant hors seuls ajouts N.R du banc ; la photographie reçue retrouve exactement la source du reçu après hors ajout d'attente. Les reçus sont identiques temps/vague/score/journal complet et finissent sans erreur. Les nouveaux paramètres du banc ne sont lus par aucun module de simulation (`diagnostic-p16c.json`, preuve80).

- Référence avant / source finale hors banc : `2bb363d3ee6f60def19760502a3d1ebaa3812bd6779cef8855f812ec361ca994`.
- Référence optimisée / source reçue hors attente : `46b9c2fcc019b0768a9951d46ab61e2bf6b12ab718df7c5c11cbb04e794f7a51`.
- Bundle final : `0b0c9d6310d2a8b41f96d0fb9dbdbc6f9cd8bbe6a050c73f2e9b884fcab1e4dd`.

Commandes locales réalisées, sans navigateur : `node tools/codex-p16/diagnostic-p16c.mjs` (calibration puis reprise avec `--reutiliser-calibration`), `node tools/codex-p16/complements-p16c.mjs`, `node tools/codex-p16/verifier.mjs --statique` et `--raccords --statique`. Build sortie 0, syntaxe des bundles et témoins statiques réussis. Les erreurs de jeu mesurées sont nulles. Les mesures VM de pixels indexés ne valent pas mesure Canvas/CRT ou Safari.

**Préparation du lot terminée ; palier navigateur non validé, chantier bloqué pour cette validation hors bac.** Dépendance indispensable : relancer la commande en tête et lire `navigateur-p16c/resultats.json`. Reste ensuite la revue des deux raccords réservés de simulation, et Safari réel. Le script conserve une sortie 1 pour un critère en échec/non mesurable/partiel, y compris les défauts antérieurs : aucun résultat rouge n'est transformé en validation. Retour arrière disponible dans `sources-recues-p16c.json` ; aucune intégration Git faite.
