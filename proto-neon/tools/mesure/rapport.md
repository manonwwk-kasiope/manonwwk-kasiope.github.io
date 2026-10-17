# codex-p3b — diagnostic des échecs

18/10/2026 · 01 h 02 (Paris) — publication ; mis à jour à 01 h 04.

**Hors bac, depuis `proto-neon/` : `node tools/mesure/verifier.mjs --diagnostic-p3b`**

Le livrable principal est [DIAGNOSTIC-ECHECS.md](DIAGNOSTIC-ECHECS.md) : tableau des sept critères en échec, preuves source/reçus, verdict instrument ou jeu, corrections exactes et mesures manquantes des six critères partiels.

Corrections d'instrument préparées : tube effectivement coupé et contrôlé ; lumière globale indicative selon SORTIE.md ; reprise de contrôle et vraie dernière vie ; textes build/conseil ; section et graine audio appariées, fenêtres comparables et spectre du transitoire entier ; vraie silhouette P3 hors transition. Tous les seuils chiffrés sont conservés. Aucun fichier src ni N.R changé, aucun commit.

Mesures avant : batterie rapide de 00 h 41, 1 ok, 7 échecs, 6 partiels, 23 non mesurables, 1 hors banc. Après réel du jeu : **à vérifier**. Le seul reclassement documentaire R-11/R-28 produit des partiels et ne valide aucun pixel nouveau. Preuves dans `diagnostic/p3b-recus.json`, `p3b-reclassement.json`, `p3b-fft.json`.

VM : temps/vague/score identiques sur dix références, mais un journal flottant divergent ; validation stricte refusée, sortie 1, aucune conclusion sur le jeu tirée de la VM. Syntaxe des 12 scripts et imports des 38 critères vérifiés ; 9 contrôles historiques d'instrument réussis. Reconstruction `node build.mjs` : sortie 0, 33 modules, bundle sans différence Git.

**Qualification navigateur bloquée dans ce bac**, sans nouvel essai serveur/Chromium. Script complet prêt, non exécuté. Restent les nouvelles mesures hors bac, les corrections du jeu indiquées au tableau (notamment CONTINUER et boot), puis la qualification complète et l'iPhone Safari réel. L'ancienne remise en état reste dans [REMISE-EN-ETAT.md](REMISE-EN-ETAT.md).
