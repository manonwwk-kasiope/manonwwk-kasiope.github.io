# codex-p3c — diagnostic des échecs restants

18/10/2026 · 01 h 41 (Paris) — publication.

**Commande hors bac, depuis `proto-neon/` : `node tools/mesure/verifier.mjs --diagnostic-p3c`**

Livrable principal : [DIAGNOSTIC-ECHECS-2.md](DIAGNOSTIC-ECHECS-2.md), tableau des onze critères demandés, dans l'ordre de priorité, avec valeurs reçues, causes établies, verdict instrument/jeu, corrections demandées et incertitudes. Demandes aux propriétaires dans la section codex-p3c de `refonte/lots/demandes.md`.

Le script est prêt : serveur sur port libre, un seul Chromium muet, trois profils, gestes aussi en portrait, critères en série, transitions de flashs, entrées tactiles et sorties réelles, masque/tampon et coût inclusif par module, temps traité à CPU ×4. **Non exécuté dans ce bac**, conformément à la consigne.

Avant : batterie 15a196a exécutée hors bac à 01 h 27, **5 ok, 14 échecs, 8 partiels, 10 non mesurables** (source : reçu fourni ; verdict propriétaire hors banc à part). R-13 **7/s**, R-33 **cinq échecs**, R-03 **0,03723** hors autorisés au moment VOL. La capture de ce dernier montre en réalité le panneau **PLONGÉE**, pas une bannière seule. R-05 exigeait encore huit causes avec morsure, contrairement à SORTIE.md ; il exige désormais les sept naturelles. **Le lot historique reste en échec : une seule cause observée sur sept.**

Après : corrections de l'instrument préparées pour R-03, R-05, R-12, R-13, R-22/R-33, R-28 et R-37 ; mêmes seuils, hormis l'application de la décision explicite R-05. **Tous les nouveaux résultats navigateur restent à vérifier.** Aucun chiffre de réussite du jeu déduit des corrections.

Vérifications réelles : **8 contrôles analytiques réussis**, **38 critères importables**, **46 scripts valides en syntaxe**, `git diff --check` sortie **0**. Build depuis `proto-neon/` : sortie **0**, **34 modules**, **1 857 796 octets**, index sans diff. Aucun fichier `src/` modifié, aucun commit. Reçus : [p3c-instrument.json](diagnostic/p3c-instrument.json), [p3c-verifications.json](diagnostic/p3c-verifications.json), [p3c-recus.json](diagnostic/p3c-recus.json).

VM refusée pour les conclusions : dix parties aux résultats identiques, mais un journal divergent sur une coordonnée flottante ; sortie **1**, [p3c-validation-vm.json](diagnostic/p3c-validation-vm.json). Aucun résultat de jeu fondé sur cette VM.

**Lot de diagnostic livré ; qualification du jeu bloquée** sur les reçus navigateur et les corrections des propriétaires des sources. Les dix blocages d'horloge confiés à codex-05b ne sont pas traités. Restent notamment la mesure de sécurité après réparation, le slalom réel, les gaines, la lumière du décor, l'attraction, puis le coût dominant et l'imputation de caméra/gel à isoler par les sondes prévues.

---

Rapport précédent conservé ci-dessous.

# codex-p3b — diagnostic des échecs

18/10/2026 · 01 h 02 (Paris) — publication ; mis à jour à 01 h 04.

**Hors bac, depuis `proto-neon/` : `node tools/mesure/verifier.mjs --diagnostic-p3b`**

Le livrable principal est [DIAGNOSTIC-ECHECS.md](DIAGNOSTIC-ECHECS.md) : tableau des sept critères en échec, preuves source/reçus, verdict instrument ou jeu, corrections exactes et mesures manquantes des six critères partiels.

Corrections d'instrument préparées : tube effectivement coupé et contrôlé ; lumière globale indicative selon SORTIE.md ; reprise de contrôle et vraie dernière vie ; textes build/conseil ; section et graine audio appariées, fenêtres comparables et spectre du transitoire entier ; vraie silhouette P3 hors transition. Tous les seuils chiffrés sont conservés. Aucun fichier src ni N.R changé, aucun commit.

Mesures avant : batterie rapide de 00 h 41, 1 ok, 7 échecs, 6 partiels, 23 non mesurables, 1 hors banc. Après réel du jeu : **à vérifier**. Le seul reclassement documentaire R-11/R-28 produit des partiels et ne valide aucun pixel nouveau. Preuves dans `diagnostic/p3b-recus.json`, `p3b-reclassement.json`, `p3b-fft.json`.

VM : temps/vague/score identiques sur dix références, mais un journal flottant divergent ; validation stricte refusée, sortie 1, aucune conclusion sur le jeu tirée de la VM. Syntaxe des 12 scripts et imports des 38 critères vérifiés ; 9 contrôles historiques d'instrument réussis. Reconstruction `node build.mjs` : sortie 0, 33 modules, bundle sans différence Git.

**Qualification navigateur bloquée dans ce bac**, sans nouvel essai serveur/Chromium. Script complet prêt, non exécuté. Restent les nouvelles mesures hors bac, les corrections du jeu indiquées au tableau (notamment CONTINUER et boot), puis la qualification complète et l'iPhone Safari réel. L'ancienne remise en état reste dans [REMISE-EN-ETAT.md](REMISE-EN-ETAT.md).
