# codex-p11 — 18/10/2026 · 02 h 06 (Paris), mis à jour à 18/10/2026 02:18:30

**Commande à lancer hors bac** : `cd proto-neon && node tools/codex-p11/verifier.mjs`.

**Sous-tâche logique terminée ; chantier bloqué pour la validation finale** : extension du schéma journal à intégrer par la cheffe d'orchestre, puis reçu navigateur à produire hors bac. Aucun serveur ni Chromium lancé ici, aucun commit effectué. Le script navigateur est complet et sa syntaxe contrôlée ; il conserve le contrôle du schéma en échec tant que le raccord n'est pas intégré. Il ne qualifie pas Safari matériel.

Fait : attente du titre réutilisée depuis N.R (15 s), vraie partie de démonstration avec le pilote public bon ; sa mort ou les 20 s de démonstration relancent celle-ci, sans supprimer la règle mortelle du mur. Les transitions vers les cartes/intermèdes et le bilan ne sont pas exécutés dans cet état. Silence global et par canaux (voix et cues compris), état sonore du titre restauré à la sortie. Aucun score de démonstration sauvegardé. Un toucher/clavier/clic quitte immédiatement la démo ; son relâcher est consommé par la nouvelle interface publique N.entree.annuler(), pour ne pas lancer JOUER.

La fonction geste() journalise chaque reconnaissance existante : genre, doigt, durée en secondes, déplacement en points CSS, action demandée, t0/t1 en millisecondes issues de la reconnaissance. Une reconnaissance ne prouve pas l'activation effective d'un pouvoir soumis à recharge. Aucune reconnaissance ni aucun seuil changés. Ajouts N.R : pilote public et conversion 1000 ms/s, documentés dans la section codex-p11 de [demandes.md](../../refonte/lots/demandes.md).

Aventure appartient désormais au registre gelé : horloge avance, section null, plein écran. L'acceptation spéciale de 79-jeu est retirée. Aucun raccord defile changé.

## Mesures VM avant / après

Instrument validé : **10/10** parties exactes sur les vraies sources e1bdc6f, cinq pilotes × deux graines ; temps de jeu, vague, score, fin et erreurs sans tolérance. Source : [calibration.json](calibration.json), commande `node tools/codex-p11/calibrer.mjs`. Ce contrôle ne prétend pas à l'identité des journaux historiques flottants.

Avant reçu : aucune attraction en 25 s sur les trois formats, zéro écriture de geste ; JOUER mène déjà à aventure mais le registre est absent. Source : [scenarios-avant.json](scenarios-avant.json), sources HEAD du worktree reçu.

Après, sources réelles sans DOM : [scenarios-apres.json](scenarios-apres.json), commande `node tools/codex-p11/scenarios.mjs apres`.

| Format | Attraction après s | Sortie sur input.any simulé | Journal unitaire toucher / glisse / tenu | JOUER | __ERR |
|---|---:|---|---|---|---:|
| paysage | 15.008333333333121 | titre | 6 / 6 / 6 | aventure | 0 |
| portrait | 15.008333333333121 | titre | 6 / 6 / 6 | aventure | 0 |
| bureau | 15.008333333333121 | titre | 6 / 6 / 6 | aventure | 0 |

Le contrôle unitaire appelle la vraie fonction geste() avec des reconnaissances préparées ; **ce n'est pas une preuve de reconnaissance tactile**. Les vraies entrées navigateur restent à vérifier. L'erreur initiale document is not defined lors d'un essai des handlers tactiles sans DOM a conduit à limiter honnêtement le test VM à la journalisation ; aucun faux DOM ni lecteur n'a été ajouté. Le navigateur utilise les vrais événements tactiles CDP, sur une horloge de test contrôlée.

Compléments : activité après 10 s repousse bien l'attraction ; démo encore active après 45 s supplémentaires, pilote actif, coupure globale et deux canaux actifs, disque inchangé, __ERR = 0. Clic puis relâcher tardif : titre conservé, pilote arrêté, coupure globale restaurée. Source : [complements.json](complements.json), commande `node tools/codex-p11/complements.mjs`.

## Conservation des parties

**24/24** parties avant/après exactes sur l'état reçu, huit pilotes × trois graines. Temps de jeu, temps de combat, vague, score, fin, erreurs et SHA-256 du journal complet identiques, sans arrondi ni tolérance. Sources : [avant.json](avant.json), [apres.json](apres.json), [comparaison.json](comparaison.json). Les 80 cas n'ont pas tous été rejoués ; cette preuve couvre le minimum demandé, sans étendre son verdict aux cas non mesurés.

Protocole identique à tools/pilotes/parties.mjs : monde neuf et localStorage vide par partie, S.jour = 20261017, réglage actions selon pilote, intro.skip(), reset départ plongée (secours démarrage uniquement), pilote, journal actif, horloge.avancer() une fois, simulation par tranches de 0,25 s jusqu'à fin. Borne de 540 s de jeu et quatre fois cette durée en simulation, garde de stagnation de 10 s. Amorçage préalable reseed/reset comme boot. Chaque partie finit sans erreur.

| Pilote | Graine | Temps jeu s avant = après | Vague | Score avant = après | Journal et résumé |
|---|---:|---:|---:|---:|---|
| inerte | 1 | 25.291666666665872 | 1 | 10 | exact |
| inerte | 2 | 24.783333333332568 | 1 | 10 | exact |
| inerte | 3 | 24.958333333332558 | 1 | 60 | exact |
| tourneur | 1 | 20.19041666860327 | 1 | 1370 | exact |
| tourneur | 2 | 17.658333333332973 | 1 | 270 | exact |
| tourneur | 3 | 20.249999999999492 | 1 | 220 | exact |
| maladroit | 1 | 21.00708333526989 | 1 | 550 | exact |
| maladroit | 2 | 18.158333333332944 | 1 | 330 | exact |
| maladroit | 3 | 19.299999999999546 | 1 | 720 | exact |
| kamikaze | 1 | 15.216666666666443 | 1 | 640 | exact |
| kamikaze | 2 | 15.416666666666432 | 1 | 690 | exact |
| kamikaze | 3 | 65.1229166706382 | 2 | 13670 | exact |
| humain | 1 | 95.36208333946475 | 2 | 8380 | exact |
| humain | 2 | 71.95250000407619 | 2 | 1460 | exact |
| humain | 3 | 342.75583337977577 | 5 | 124690 | exact |
| bon | 1 | 81.13458333538057 | 2 | 1280 | exact |
| bon | 2 | 69.15833333730829 | 2 | 7110 | exact |
| bon | 3 | 84.01666667065312 | 2 | 7120 | exact |
| expert | 1 | 98.16666667066438 | 2 | 2470 | exact |
| expert | 2 | 133.93916667455744 | 3 | 23190 | exact |
| expert | 3 | 73.49291666870782 | 2 | 1250 | exact |
| dieu | 1 | 404.19000004609603 | 5 | 186830 | exact |
| dieu | 2 | 500.8708333792434 | 5 | 189930 | exact |
| dieu | 3 | 411.6391667130544 | 5 | 150240 | exact |

Reproduction : `node tools/codex-p11/parties.mjs avant` (sources HEAD reçues), puis `node tools/codex-p11/parties.mjs apres` (sources courantes). Les résultats après sont sauvegardés après chaque partie.

## Reste précis et intégration

Le validateur actuel refuse les **deux champs t0/t1 sur chaque geste** (18 événements par format), car le schéma ne les prévoyait pas ; fenêtre __ERR = 0 ne signifie pas conformité de schéma. Le fichier 03-socle m'est réservé pour les états uniquement : **aucune modification de son schéma appliquée**. Patch prêt : [raccord-schema.patch](raccord-schema.patch), git apply --check réussi. Champs optionnels pour conserver les anciens reçus. Le même raccord sur une copie en mémoire donne zéro erreur de schéma ([complements.json](complements.json)). Demande exacte consignée dans demandes.md. Intégration par la cheffe indispensable avant le verdict contractuel.

Après intégration du raccord, reconstruire le bundle avec `cd proto-neon && node build.mjs`, puis lancer la commande navigateur en tête : trois profils 844 × 390 tactile, 390 × 844 tactile et 1440 × 900 ; un seul Chromium --mute-audio ; entrée attraction à 15 ± 1 s, sortie au premier toucher et clic bureau, six gestes de chaque genre avec dates/doigt, JOUER → choix aventure, sortie RMS audio, captures et vrais pixels du tampon, palette, journaux, __ERR et console. Résultats attendus dans navigateur/resultats.json, PNG et JSON de chaque capture. Aucun succès navigateur ni mesure Safari annoncé.

Build : `cd proto-neon && node build.mjs`, **sortie 0** ([build.log](build.log)). Sources finales SHA-256 : `7b58ece776b1aa8d22969776df75d666b331e7db531ace5dcd6ebd1eb65e7ee0`. Bundle reconstruit SHA-256 : `90b72265b4fbc87823a7135642a92906cf35ffa6faeb4bd73b653a6ea0c0e1b4`. git diff --check sans erreur. Pas de nouveau flash ou de modification de collision dans ce lot.
