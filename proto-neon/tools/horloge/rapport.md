# codex-05 — horloge réelle et écrans

18/10/2026 · 01 h 01 (Paris).

**Source livrée pour revue ; palier non validé.** La boucle fixe, les écrans et les parties fonctionnent dans les contrôles ci-dessous. Restent deux producteurs de ralentis hors de ma réservation, la pause automatique de l'application et l'arbitrage d'un contrôle d'empreinte hérité du chantier palette. Aucun seuil n'a été diminué.

## Changement

`90-boot.js` appelle `horloge.image(dtReel)` puis `avancer()` pour chaque pas, au plus PAS_MAX. S.t est désormais le temps du monde en secondes, S.dt son pas. `__DT` alimente aussi l'accumulateur et accepte zéro. Une impulsion reste en attente si aucune mise à jour n'a eu lieu ; elle est effacée après le premier pas consommateur. Le hitstop ne multiplie plus un pas variable par 0,08.

Le jeu reçoit H pour ses interfaces quand le monde est arrêté (convention de `dbg.simuler`), et dtMonde en combat, y compris zéro pendant un gel. Les effets reçoivent dtMonde. La caméra est déjà appelée par 79-jeu : aucun deuxième appel ajouté. Le rendu se fait une fois par image, avec VOL, HUD, UI et cinématiques. Le fond de victoire/défaite précède le bilan et sa révélation reçoit H ; les films bloquants restent au-dessus des acteurs. Le tube reçoit le temps d'image ; pas d'agrandissement doublé quand il compose la sortie. `?nodraw` omet rendu et présentation.

## Preuves et limites

| Contrôle | Résultat | Reçu |
|---|---|---|
| Vrai titre | absent avant ; `titre` + UI titre visibles après, trois profils | `avant/titre.json`, `precontrole/titre.json` et PNG |
| Accumulateur et impulsion | 0 pas à dt=0 et 1/240, conservation de l'impulsion ; 1 pas après deux demi-pas, 2 à 1/60, 4 au rattrapage ; un seul dessin et au plus une impulsion consommée | `precontrole/pas.json` |
| Partie bon, vraie boucle avec dessin | paysage 4 656 images, portrait 5 462, bureau 5 601 ; état fin, zéro erreur de jeu/console/page | `apres-boucle/parties.json`, journaux complets |
| Déterminisme de la partie | deux paysages : même journal SHA-256 `302e4b849a5add261be0c0860b7047021d210641de7ef7694fd4da018f48d74a` | même reçu |
| Bilan effectivement visible | fond et texte visibles après 2 s, trois profils, zéro erreur | `apres-fin/fin.json` et PNG |
| Montée de niveau par XP réelle | k=0,15 pendant 0,35 s, trois profils ; zéro pas ralenti avant branchement | `avant/ralentis.json`, `apres-fin/ralentis.json` |
| Pouvoir RALENTI équipé et déclenché | facteur 0,35 effectivement appliqué, joueuse exemptée ; **3,00 s mesurées contre 3,50 demandées**, trois profils | mêmes reçus |
| Arrivée CYCLOPE réelle via dbg.boss | **aucun pas ralenti**, trois profils ; facteur attendu 0,3 pendant 2,2 s | mêmes reçus |
| Banc 02 intégral | **80/80 fin avant et après**, zéro erreur ; huit répétitions identiques à chaque fois ; les 80 couples score/temps sont identiques entre bundles | `regressions/{avant,apres}/pilotes/` |
| Banc 01, couleurs | neuf cas avant/après conformes aux quatre seuils couleur ; zéro erreur | `regressions/{avant,apres}/lisibilite/` |
| Banc 01, empreintes hors jeu | **neuf différences**, verdict brut du banc en échec conservé | mêmes reçus |
| Performance paysage V2/V4/V5, seconde paire | p95 après 1,4 / 1,7 / 1,5 ms ; deltas **0,0 / +0,1 / +0,1 ms** (borne +0,5) | `reprise-performance/{avant,apres}.json` |

Profils : iPhone 13 paysage 844 × 390, portrait 390 × 844 et bureau 1440 × 900, Chromium émulé et muet ; aucune preuve sur appareil iPhone physique.

Les parties réelles ont été mesurées avant la correction limitée au fond de fin. Leur capture à l'entrée de fin était vide : le fond était dessiné après le texte. Cette erreur de mon boot a été corrigée et vérifiée par le scénario public `dbg.scene('fin')`, sans rejouer les parties déjà déterministes. Les journaux de partie sont donc ceux du premier bundle ; les captures `apres-fin/` sont celles de la correction. Les empreintes exactes de chaque bundle sont dans chaque JSON. Une première partie de préparation avait hérité du mode god : exclue, puis banc corrigé explicitement par god(false) avant toutes les parties admissibles (trace dans `precontrole/essai-god-exclu.json`).

L'ancien banc 02 est exécuté sans modifier son algorithme ni ses seuils : `regressions.mjs` n'isole que ses chemins d'entrée/sortie et d'import dans une copie temporaire ; son protocole original reste identifié par SHA. Le banc 01 est invoqué directement, avec sa référence avant réellement copiée dans le dossier après. Aucun « conforme » global n'est attribué à cette régression.

## Dépendances et arrêt ciblé

- **50-fx.js**, `ralenti()` : coupe toute durée à 3 s, même pour la carte à 3,5. Le boot ne prolonge pas artificiellement le pouvoir.
- **79-scene.js**, `onPhase()` : ignore `evt:'arrivee'` émis par le CYCLOPE. Aucun ralenti de secours ajouté au boot.
- **79-jeu.js**, `ecranVieux()` : gérait la pause automatique de l'application ; ce code est court-circuité par le nouveau chemin. Le gel S.paused reste actif, mais son indicateur doit être raccordé en préservant l'écran courant et la main de cartes.
- **60-intro.js** : ancien journal d'ouverture divise encore S.t par 1000 ; signalé, ouverture ancienne non démarrée en parallèle du titre.

L'empreinte « hors jeu » du banc 01 compare des contextes ayant évolué sous deux intégrateurs différents (caméras avant/après également différentes dans les reçus). Son échec ne permet donc pas de conclure seul à une retouche du décor ; interprétation à arbitrer par Claude, sans modifier le verdict brut. Deux passages donnent ce même échec : **arrêt de cette méthode de comparaison**, diagnostic également dans SORTIE. Une méthode appariée du même contexte doit être validée avant toute passe supplémentaire sur cette porte.

La première paire de mesures p95 du banc 01 donnait +0,90 / +0,60 / +0,60 ms. Réitération demandée effectuée : la seconde paire donne 0,00 / +0,10 / +0,10 ms. La mesure dédiée V4 donne aussi +0,10 ms (`avant/perf.json`, `apres-boucle/perf.json`). Des tests lourds d'autres sessions tournaient pendant ces collectes (`tools/mesure/lancer`, lot H, réglage) : **le résultat au repos reste à vérifier**, même si la seconde paire tient la borne. Aucun processus d'une autre session n'a été interrompu.

Reprise : producteurs corrigés → seuls contrôles ralentis et pause manquants ; fenêtre machine au repos → comparaison performance ; arbitrage de l'empreinte → preuve appariée. Les parties et les 80 pilotes conformes ne sont pas à refaire sans changement qui les concerne. Réservation boot libérée pour l'ordre 06 ; 05 reste non validé sur les points publiés. Prêt pour /mediateur.
