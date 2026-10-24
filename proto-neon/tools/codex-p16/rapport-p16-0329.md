# codex-p16 — R-20 / R-30

18/10/2026 · 03 h 29 (Paris), mis à jour à 18/10/2026 · 03 h 29.

Commande hors bac, depuis la racine du dépôt :


`node proto-neon/tools/codex-p16/verifier.mjs`

Pour tester aussi les raccords réservés, en mémoire et sans modifier les sources : `node proto-neon/tools/codex-p16/verifier.mjs --raccords`.

**Lot non validé.** Aucun serveur ni Chromium essayé dans ce bac. R-20 strictement meilleur que 2030, CRT, sortie Canvas et Safari restent à vérifier hors bac. Aucun commit.

## Livré et portée

- `10-gfx.js` : une décision Bayer par sous-colonne puis écritures espacées ; couronne décomposée en intervalles entiers plutôt que parcours du trou. Phase écran, arrondis, découpage et masque conservés.
- `78-hud.js` : réserve réutilisée et copie opaque des rangées de bannière ; dissolution existante conservée. L'index zéro reste opaque. Aucun rythme, aucune collision, aucune palette changés.
- `20-crt.js` reste intact : son coût réel n'est pas mesurable sans Canvas dans ce bac. Le profiler navigateur mesure explicitement son step ; aucune cause CRT supposée n'est présentée comme prouvée.
- R-20 : numérateur `horloge.reel()`, somme des pas fixes réellement exécutés, au lieu de `t()`, somme des dtMonde ralentis. L'ancien ratio reste publié en métadonnée ; seuil **0,99 inchangé**. Un vrai retard CPU reste une perte.
- R-30 : `hudBanniere` et les décisions du limiteur `flash` sont exclus seulement de la comparaison entre modes. Deux parties dessinées doivent encore reproduire ces traces. Aucun événement de jeu supprimé du comparateur.

Les chiffres ajoutés vivent dans `N.R.perf.imageP16` : Bayer 4 (géométrie existante), 600 images de preuve par scène/profil, 120 images d'échauffement du banc. Aucune valeur de gameplay ajoutée.

## Référence et logique

`calibration.json` : dix références e1bdc6f exactement reproduites (inerte, tourneur, maladroit, kamikaze, humain ; graines 1–2), temps de jeu, vague, score, fin, erreurs. La calibration porte sur ces sorties, pas sur une promesse d'égalité bit à bit de tous les journaux historiques.

Point de reprise : avant **80/80** parties enregistrées ; après **80/80** ; comparaison stricte **80/80**, journal SHA-256 complet compris. Protocole officiel, localStorage vide, jour 20261017, actions, plongee, pilote, amorçage avancer(), tranches de 0,25 s jusqu'à fin ou borne officielle (540 s de jeu, garde à 2160 s de pas, stagnation 10 s). Les résultats antérieurs e1bdc6f ne servent pas de référence avant/après de ce lot. `parties80.mjs` reprend uniquement les reçus finis déjà calculés, sans rejouer les parties validées. Les 71 premiers reçus après sont réutilisés par `terminer-parties.mjs` ; les neuf derniers sont exécutés dans deux workers Node isolés, même VM et même protocole. Hash de sources obligatoire avant réemploi, écritures atomiques des reçus. Le second Mac n'a pas pu être joint : résolution de MacBook-Air-de-Manon.local impossible, SSH sortie 255 (`seconde-machine.txt`). Aucun calcul distant effectué.

`primitives.json` : 4200 cas exacts, zéro octet ni masque différent ; trames aux frontières, NaN, origines, bornes, rayons inversés. Contrôle algorithmique sans DOM.

## Classement avant, vraie frame en VM

Enveloppes de chaque step de 90-boot et des méthodes publiques ; pas de réécriture du jeu. Classements inclusifs par coût total ; on ne somme pas parent et enfant. Les p95 des sous-modules sont par appel. Les coûts ci-dessous **ne sont pas des mesures navigateur** ; present/CRT n'ont pas de Canvas. Fichier : `profil-vm-avant.json`.

- **charge** : fx.draw 2,049 ms/image (p95 6,367 ms/appel) ; decor.drawFar 2,026 ms/image (p95 2,303 ms/appel) ; decor.drawPlateau 0,600 ms/image (p95 2,336 ms/appel) ; hud.draw 0,230 ms/image (p95 0,405 ms/appel).
- **v5** : decor.drawFar 2,430 ms/image (p95 3,060 ms/appel) ; fx.draw 0,697 ms/image (p95 2,550 ms/appel) ; decor.drawPlateau 0,624 ms/image (p95 0,883 ms/appel) ; hud.draw 0,254 ms/image (p95 0,623 ms/appel).
- **vol** : decor.drawFar 1,629 ms/image (p95 3,563 ms/appel) ; decor.drawVol 1,132 ms/image (p95 3,147 ms/appel) ; hud.draw 0,204 ms/image (p95 0,367 ms/appel) ; decor.drawPlateau 0,093 ms/image (p95 0,199 ms/appel).
- **boss3** : decor.drawFar 2,680 ms/image (p95 3,548 ms/appel) ; fx.draw 1,209 ms/image (p95 5,384 ms/appel) ; decor.drawPlateau 0,521 ms/image (p95 0,765 ms/appel) ; hud.draw 0,107 ms/image (p95 0,161 ms/appel).

La fenêtre du scénario initialisé en VOL évolue naturellement : **257 images sur la branche vol.draw, puis 343 sur game.draw** dans le profil avant. Le coût p95 du seul step vol.draw vaut **3,505 ms VM**, pour ses appels effectivement observés ; la fenêtre complète ne vaut pas une mesure de 600 images toutes en VOL. Les états et les nombres d'appels sont conservés, sans neutraliser la transition du jeu. Le banc navigateur enregistre aussi l'état réel après chaque image.

Complément strict `vol-soutenu-vm.json` : **600/600/600 images dans l'état VOL** sur paysage/portrait/bureau, 0 octet différent ; deux réarmements publics de la fixture par profil, et 242 images d'entrée/transition également contrôlées par profil. État et journal finaux identiques, zéro erreur. Le banc navigateur contient le même complément pour les index et les RGBA.

Essai conservé en échec : `vol-soutenu-echec-vm.json`, **0/600** images VOL sur chaque format (code de sortie 1). Le premier banc réarmait dès l'interlude d'entrée, empêchant le VOL de commencer. Le banc corrigé attend désormais le premier état VOL, puis le retour naturel avant de réarmer ; aucun seuil réduit ni changement au jeu.

## Images et coût appariés sans DOM

Les vraies sorties du tampon d'index sont comparées octet par octet à chaque image. État, horloge et journal complet comparés en fin de scène. Ce complément VM ne qualifie ni les couleurs du CRT ni le coût iPhone. Les premières séries séquentielles ont régressé : p95 charge **10,767 → 12,307 ms VM** (`profil-vm-avant.json`, `profil-vm-apres.json`, candidat intermédiaire). Aucun gain global ni seuil R-20 validé n'en est déduit.

| Profil | Scène | Images | Octets différents | Logique identique | p95 VM avant ms | p95 VM après ms |
|---|---|---:|---:|---|---:|---:|
| paysage | charge | 600 | 0 | true | 12,057 | 11,692 |
| paysage | v5 | 600 | 0 | true | 6,279 | 6,178 |
| paysage | vol | 600 | 0 | true | 3,612 | 3,497 |
| paysage | boss3 | 600 | 0 | true | 7,382 | 7,398 |
| portrait | charge | 600 | 0 | true | 10,760 | 10,488 |
| portrait | v5 | 600 | 0 | true | 4,490 | 4,450 |
| portrait | vol | 600 | 0 | true | 3,218 | 3,172 |
| portrait | boss3 | 600 | 0 | true | 9,615 | 9,130 |
| bureau | charge | 600 | 0 | true | 13,032 | 12,942 |
| bureau | v5 | 600 | 0 | true | 5,661 | 5,532 |
| bureau | vol | 600 | 0 | true | 5,159 | 5,271 |
| bureau | boss3 | 600 | 0 | true | 12,614 | 12,385 |

## R-20 et R-30 : preuves et raccords

Reçus de départ : `~/Projets/wt-snake/recus/batterie-8f55a91/R-20.json` : charge **4,5 ms contre 0,8 ms**, ratio ×4 **0,98479**. Ces échecs restent les derniers résultats navigateur connus.

Scène calme réelle sans ralenti en VM : 0 pas ralentis ; ancien ratio **0.9999999999999977**, nouveau **0.9999999999999977**, 240 pas. Le temps mural est ici le temps injecté par le banc, donc ce témoin vérifie la formule, pas la vitesse du Mac. Contrôles négatifs dans `instrument-statique.json` : un ralenti laisse machine=1, une perte de pas donne 0,9 et échoue toujours à 0,99 ; un kill changé ou manquant reste refusé.

R-30 sur les sources reçues : le diagnostic VM à 15 s conserve une divergence de jeu après retrait des seules traces visuelles. La caméra avance avant le pas de jeu en dessiné, après le pas en simulé (`79-jeu.js:530,843`). Le premier désaccord de pilotage est publié dans `rejouabilite-vm.json`, avec le kill absent et les morts différentes ; ne pas l'effacer par filtrage.

`raccord-79-jeu.js.patch` fait avancer la caméra une fois au même endroit, via update(), et supprime son second site dans simuler(). Testé seulement en copie VM : égalité de jeu **true**, longueurs **91/91** ; dessiné répété **true**, traces visuelles comprises. Ce raccord n'est PAS appliqué au jeu livré ; il modifie la simulation et nécessite sa revue/integration séparée, puis R-30 navigateur complet (60 s).

`raccord-15-decor.js.patch` déroule les quatre sous-colonnes de taireFondJeu et résout leurs tables une fois par rangée. Test en copie : 12/12 scènes/profils, 0 octet différent ; coûts détaillés dans `raccord-vm.json`. Il reste réservé à codex-p13, non appliqué.

## Hors bac et reste

`verifier.mjs` sert les bundles avant/après sur port libre, lance **un Chromium muet**, puis les trois profils en série. Il compare **chaque octet d'index ET de RGBA après CRT** sur 600 images × quatre scènes × trois profils, conserve erreurs, état, journal, captures et classement de chaque step/module. Les deux versions vivent dans deux iframes du même Chromium ; les panneaux fixes sont utilisés pour isoler le rendu déterministe des horloges murales vidéo. Les coûts diagnostiques sont séparés du vrai critère non enveloppé. R-20 (dont 2030 et ×4) et R-30 sont relancés en série sur les deux versions, sans cache. L'option --raccords ne change que la version après en mémoire.

Les reçus des deux commandes sont séparés : `navigateur/` et `navigateur-raccords/`. Le code de sortie du banc reste 1 si un critère échoue, y compris sur la version **avant**, dont les échecs sont attendus et conservés : lire les fichiers avant-R-20 / apres-R-20 et avant-R-30 / apres-R-30 séparément. Le build reste un contrôle distinct, sortie 0 obligatoire et obtenue.

La comparaison des 80 parties est terminée, les workers ont fini sans erreur. À faire : recevoir le reçu navigateur ; mesurer le classement Canvas/CRT ; choisir les optimisations supplémentaires sur ce profil ; vérifier zéro pixel changé sur la sortie finale ; intégrer/revoir les raccords ; obtenir les seuils R-20/R-30 inchangés. Un gain VM local n'établit pas snake2975 < snake2030. Safari iPhone réel reste distinct de Chromium émulé. **Chantier bloqué pour cette validation hors bac ; aucun gain R-20 global annoncé.**

Build : `cd proto-neon && node build.mjs`, sortie 0 (`build.log`). Retour arrière : changements non committés, sources initiales intégrales dans `sources-avant.json`, bundle initial dans `avant.html`. Aucun fichier réservé modifié.

Empreintes de la candidate au moment de cette publication :

02-regles.js `5281f95acfc9018b623ea1eef07d7f34dc4871e9ed37de3765df376424dc6d50`

10-gfx.js `3e09e6f783fa0e069a3b2a2ca89a728de302acdbd4bfd2cb67c9b3dc0dfee460`

20-crt.js `56092696f8cdd961eabbbfe04834e16261e52ab10fd6d05f666ba8e59f6038db`

78-hud.js `1dffd6ad8c7cd235d646573351a30171d495b743b7279c6a9e4ec43353368e83`
