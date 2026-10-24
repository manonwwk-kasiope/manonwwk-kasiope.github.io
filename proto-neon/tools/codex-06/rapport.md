**18/10/2026 · 00 h 37 — codex-06, cartes et passifs**

**Lot arrêté : intégration propriétaire et validation navigateur indispensables.** GRAPPE et BRAISE sont actives dans les sources livrées. ÉPERON et le répit sont préparés, avec un raccord de la joueuse essayé uniquement en mémoire. Le jeu assemblé ne contient pas ce raccord. Aucun commit.

**Changements livrés**

- `src/74-arsenal.js` : GRAPPE écoute les vrais kills au rang 50 prévu au contrat, demande les dégâts par `N.ennemis.hit`, limite les générations à celles de N.R et diffère la cascade. Les purges du décor et les morts de boss ne la déclenchent pas. La file, le travail par pas et le dessin sont bornés ; les anneaux roses passent par `N.fx.flashGate`. La mort de la joueuse et les resets effacent les effets en attente.
- BRAISE dépose des points à la queue, inflige le DPS de N.R une seule fois par ennemi et par pas, expire les points, efface les sauts de position et dessine un sillage ambre au Bayer stable. BRAISE II prolonge la brûlure. Son texte annonce cette prolongation ; il ne promet plus le multiplicateur LASSO, non raccordé.
- ÉPERON : `N.arsenal.percuter(e)` vérifie le boost, le contact, les PV, le plafond existant de 30 PV et la disponibilité des 15 points de réserve. Il demande le kill au module ennemi. La joueuse doit l'appeler avant la mort par contact et débiter sa propre réserve, ce que prépare le patch.
- `src/75-cartes.js` : `apresCoupe()` / `repitActif(cause)` préparent un répit commun de 0,9 s après une perte réelle. Le mur est exclu. Il s'agit de l'équivalent du répit de base AMORTISSEURS, sans ajouter un identifiant de carte non enregistré.
- Ajouts seuls à `src/02-regles.js`, tous motivés dans la section codex-06 de `refonte/lots/demandes.md`. Aucun autre module source modifié. `index.html` reconstruit.

**Mesures des sources réellement livrées — Node VM, sans navigateur**

Même scène, mêmes graines, vrais modules et vrais PV/journaux/tampons d'indices. Avant : sources de HEAD `3da78d632aeb0a353565143b03ad3130db8758ab`. Après : sources de la copie. Les trois tailles correspondent aux profils demandés, mais ne simulent pas Safari.

| scène | avant | après livré | portée |
|---|---:|---:|---|
| GRAPPE II, cinq flèches espacées | 1 morte | 3 mortes | deux propagations ; les deux suivantes gardent 20 PV ; journal de kills avec source grappe |
| BRAISE I, cible fixe, scène de 2,5 s | 0 dégât | 36,33 dégâts | contact effectif plus court que la scène ; pas de multiplication par les points superposés |
| BRAISE II, même scène | 0 dégât | 44,33 dégâts | +8 dégâts = les 0,4 s supplémentaires à 20 dégâts/s |
| ÉPERON, collision en boost | joueuse morte | joueuse morte | échec obligatoire conservé : appel de collision absent |
| seconde coupe après une perte de 8 segments | 8 segments retirés | 8 segments retirés | échec obligatoire conservé : garde interne absente |
| stress GRAPPE, 128 flèches superposées | 1 morte | 128 mortes | 24 morts au plus par pas, file au plus 64 ; zéro événement perdu, zéro erreur |

La saturation de GRAPPE est réellement atteinte : **64 explosions secondaires non mises en file** dans ce stress extrême. C'est un plafonnement volontaire du spectacle/travail ; aucun événement du bus n'est perdu. La file finit vide. Les morts restent toutes demandées au module ennemi.

Pixels mesurés dans `N.gfx.buf()` après dessin de l'arsenal : BRAISE I/II ajoutent respectivement **58/71 pixels ambre** en paysage et bureau, **49/49** en portrait dans le cadrage du test ; zéro avant. Les douze endurances n'ont aucun indice hors palette. Cela ne prouve ni la présentation canvas, ni la lisibilité, ni les flashs perçus sur iPhone. Les règles visuelles restent à vérifier par navigateur.

**Raccord préparé, non appliqué aux fichiers du dépôt**

`raccord-joueuse.patch` passe `git apply --check`. Il contient les trois points d'appel nécessaires dans `70-joueuse.js` ; il ne modifie aucun autre fichier. Le banc peut l'appliquer à une chaîne de sources en mémoire, sans écrire ce module.

| résultat avec le raccord proposé en mémoire | paysage / portrait / bureau |
|---|---|
| ÉPERON | flèche à 0 PV, joueuse vivante ; réserve à 67,5 après la demi-seconde de boost et le coût de percussion |
| répit | première coupe : 8 perdus ; seconde : 0 ; longueur 16, contre 8 sans raccord |
| expiration | actif avant le terme, expiré à 0,9 s ; mur non protégé |
| invariants | mur mortel, morsure configurée en coupe, purge sans propagation ; zéro erreur |

Reçu distinct : `raccord-propose-etat.json`. Il ne valide pas le jeu assemblé, et son endurance n'a pas été répétée : seul le raccord manquant a été essayé.

**Pilote bon : trois graines, avant/après identiques**

Appels réels `N.pilote.lancer('bon')`, puis `N.game.dbg.simuler(60)`, sans corriger les entrées ni passer les écrans dans ces essais.

| profil | graine 2975 | graine 2030 | graine 1976 |
|---|---|---|---|
| paysage | CARTES à 36,517 s | CARTES à 36,517 s | FIN à 18,958 s |
| portrait | FIN à 12,017 s | FIN à 19,675 s | FIN à 21,608 s |
| bureau | CARTES à 36,517 s | CARTES à 36,517 s | FIN à 16,525 s |

Les neuf instantanés (état, score, longueur, kills, coupes, morts, choix et erreurs) sont identiques avant/après. Aucune carte n'est choisie par le pilote : le hook de `79-jeu.js` ne l'appelle pas sur CARTES. Le constat vérifié ne permet donc pas de valider une progression autonome avec les nouvelles cartes. Dépendance déjà signalée par codex-02, rappelée dans `demandes.md`.

Endurance complémentaire : **12 essais de 60 s de combat calculé**, GRAPPE / ÉPERON / BRAISE / BOUCLIER séparément, sur chaque taille, avec `god(true)`. Une reprise explicite sur un écran est nécessaire dans chaque essai. Tous terminent sans erreur console, avec `window.__ERR.count = 0`. **Ce sont des endurances supervisées, pas des parties autonomes ni une qualification d'équilibrage.** Les coûts p95 présents dans les JSON mesurent un pas Node, pas une image Safari ; aucun verdict de FPS iPhone.

**Vérification navigateur bloquée par l'outil**

`verifier.mjs` importe bien `chromium, devices` de Playwright, démarre un serveur HTTP Node sur port libre, prévoit les deux orientations iPhone 13 et le bureau, avec un seul Chromium muet à la fois. Son exécution a échoué avant les scènes :

- serveur local : `listen EPERM: operation not permitted 127.0.0.1` ;
- tentative de lecture locale sans serveur : Chromium quitte au lancement, `bootstrap_check_in ... Permission denied (1100)`.

Reçu : `blocages-playwright.txt`. Aucune validation Playwright, tactile, Safari ou photosensibilité n'est revendiquée. Le navigateur n'a pas été relancé après ces refus.

**Reprise sans recommencer les travaux validés**

1. Le propriétaire de `70-joueuse.js` intègre `raccord-joueuse.patch` et relit les collisions. Les limites 30 PV / 15 réserve sont celles déjà présentes dans N.R, pas les dégâts par image de 2030.
2. Le propriétaire de `79-jeu.js` raccorde le pilote aux écrans. Refaire alors seulement les essais autonomes manquants.
3. Dans un environnement autorisant serveur local et Chromium, reconstruire et exécuter `node proto-neon/tools/codex-06/verifier.mjs apres`. Faire ensuite la qualification Safari réelle requise par le projet.
4. PERFORATION, SURTENSION et ÉPINES restent différées : leurs identifiants/noms/schémas doivent d'abord être ajoutés au registre gelé par son propriétaire. Aucun faux ajout au vivier.
5. Un type de source dédié BRAISE et la propagation du champ public `kill.gen` sont demandés au gardien. Aujourd'hui BRAISE utilise la source valide joueuse/tete ; les générations GRAPPE sont bornées dans l'arsenal, mais le producteur du kill journalise toujours gen=0.

**Reçus et commandes**

- `avant-etat.json`, `apres-etat.json` : état réel avant/après, neuf essais pilote et douze endurances chacun ; le reçu avant réutilise les endurances déjà obtenues, avec leur date conservée.
- `raccord-propose-etat.json` : essai séparé du patch en mémoire.
- `bilan.json` : huit contrôles de périmètre vrais, quatre exigences encore fausses ; SHA-256 du candidat et du patch. `node proto-neon/tools/codex-06/bilan.mjs` sort **2**, volontairement, tant que ces exigences restent fausses.
- `node proto-neon/tools/codex-06/verifier-etat.mjs avant` recharge les sources HEAD ; `... apres` recharge la copie courante. Ce repli sans DOM ne remplace pas Playwright.
- `node proto-neon/tools/codex-06/verifier-etat.mjs raccord-propose --raccord-propose --sans-endurance` mesure uniquement la proposition en mémoire.
- `cd proto-neon && node build.mjs` : **sortie 0**, 30 modules, 1 578 000 octets. Syntaxe des deux modules et des bancs contrôlée ; `git diff --check` réussi. Aucun commit.
