# codex-p22 — point de reprise

18/10/2026 · 03 h 29 (Paris). Mission R-27/R-03, réservations respectées, aucun commit.

- VM validée contre e1bdc6f : 10/10 références exactes (`validation-vm.json`).
- Sources reçues conservées dans `*-avant.js` ; logique des autres modules inchangée sur disque.
- Changements : chevrons de travelling persistants et rabattus dans la vue ; sillage ambre/jaune ; fond VOL sans cyan avant dessin du serpent, propriétaire décor explicite. Ajouts seuls dans N.R.
- Raccords réservés : journal battement dans `79-scene.js`, enum dans `03-socle.js`. Patches prêts, appliqués seulement en mémoire par `raccords.mjs` pour les essais.
- `cas-vm.json` : trois profils, avant/après/raccords ; vrais pixels et journaux. VOL déjà à 0 cyan hors masque sur l'état reçu ; ne pas attribuer la correction historique à ce lot. Mutation de fond et cas sillage ajoutés, en cours de vérification.
- 80 parties avant en cours (session 87328). 37 premières archivées avant un plantage Node signal 11 / code 139 de l'ancien processus multi-contextes ; reprise sans rejouer les reçus, un processus Node par partie. Aucun seuil changé, plantage conservé dans le rapport.
- Finalisation engagée : session exec 42926, `finir.mjs`. Attend les 80 avant, lance automatiquement les 80 raccords en séquence, puis comparer.mjs et rapporter.mjs. Ne pas lancer un doublon ; lire finalisation.log, raccords.log et comparaison.json. Un processus Node par partie, un seul calcul lourd. Comparaison temps/vague/score et journal complet sauf événements battement ajoutés explicitement.
- Playwright complet prêt : `cd proto-neon && node tools/codex-p22/verifier.mjs --criteres`. Ne pas l'exécuter dans ce bac (HTTP/Chromium interdits). Captures, vrais pixels et critères avant/après seront produits dans `navigateur/`.
- Fixtures finies : 63 cas avant/après/raccords sans erreur, 36 cas sens/flashs conformes et 4 mutations fautives rejetées. Build sortie 0, bundle synchronisé, vérification du périmètre et des règles additives dans verification-source.json. Rapport provisoire écrit ; finir.mjs le mettra à jour une fois les 80 paires finies. Reste : attendre finalisation, inspecter comparaison.json, actualiser le présent point et livrer sans annoncer la qualification navigateur.

## Clôture de la préparation — 18/10/2026 · 04 h 05 (Paris)

Finalisation terminée, session 42926 sortie 0. Avant 80/80 fins, après 80/80 fins ; comparaison.json conforme=true : 80/80 temps, combat, vague, score, état/raison identiques ; 23 journaux bruts identiques ; 80/80 identiques hors 1 251 nouvelles entrées battement/battementFin. Zéro erreur jeu et console sur 160 parties. Rapport définitif et section demandes actualisés à 04 h 05. Sources inchangées depuis le gel ; le bundle contient toutes les sources et le build a rendu 0. Aucun commit.

Aucune simulation engagée ne reste active. Ne pas rejouer ces parties. Reste indispensable : intégration des deux patches réservés, rebuild, puis `cd proto-neon && node tools/codex-p22/verifier.mjs --criteres` hors bac. Ce script distingue candidatConforme, criteresConformes et l'intégration réelle ; un raccord seulement en mémoire ne donne pas conforme=true. Médias chargés avant les captures, un Chromium muet, profils successifs. Qualification navigateur/Safari toujours bloquée ici, pas annoncée achevée.
