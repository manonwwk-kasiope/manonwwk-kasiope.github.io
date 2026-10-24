# Fusion f1 — candidate SNAKE 2975

24/10/2026 · 06 h 13 (Paris) · mis à jour à 24/10/2026 · 06 h 13.

**Commande hors bac : `cd proto-neon && node tools/codex-f1/verifier.mjs --verrou-detenu`**, seulement si la cheffe détient déjà `/tmp/snake-chromium-chef.lock`. Sans ce drapeau, le script acquiert le verrou atomiquement. Résultats futurs : `tools/codex-f1/navigateur/resultats.json`.

**Fusion locale livrée, avec les retraits et réserves ci-dessous. Chantier bloqué pour la qualification navigateur ; le palier « jeu incroyable » reste non validé.** Aucun serveur, Chromium, SSH ni service externe lancé dans ce bac. Aucun commit. Safari physique, audio rendu et jury ne sont pas qualifiés.

Pointe reçue : `b270d8f962dd39b32c7ecc58cef828599ca8c028`. Sources intégrées par `git apply -3` sur index et objets temporaires. Les diffs sans identifiants ont soit utilisé le repli direct de git, soit reçu leurs identifiants de base sans changer leurs hunks (r2d/g1c). Les conflits sont résolus dans les vraies sources ; aucune copie de fichiers depuis les autres worktrees. Voir applications.log et les manifestes.

## Lots inclus, écartés ou en attente

| Lot | Décision | Provenance | Résultat / réserve |
|---|---|---|---|
| codex-u1 | appliqué — non-régression VM | HEAD `bd78fe20c565203cd838450486e12d8c785b71c8`<br>patch livré SHA-256 `2ed2b5e44421b17a2c5a0e94078fbf62016a4c9a2daedcfb1630f02ac8ee7f1b` | 100 cas sans erreur ; 80/80 résumés et journaux paysage identiques. R14 et R13 portrait échouent déjà sur la pointe reçue, valeurs conservées. |
| codex-i1 | appliqué — non-régression VM | HEAD `dacaa9d5064a29d7767b3a3403d891ca6d01c2d8`<br>patch livré SHA-256 `e9203c69d5b523b66e7e795048b155268174474ae64a631a295d9d01f80ed457` | 100 cas sans erreur ; 80/80 résumés et journaux hors flash identiques. p35 modifie volontairement le journal flash. R13 complet 0/4/2 comme la pointe ; R14 hérité non résolu. |
| codex-t1 | appliqué — non-régression VM | HEAD `6f7139b4e3204646c7f3a3128710851ce3ab3d88`<br>patch livré SHA-256 `281a148465f3471ebdd0046536363c5f7da8d6fe32f4c909b48b5ef2cca95780` | 100 cas sans erreur ; 80/80 résumés et journaux identiques à i1. Neuf variantes identiques au lot, grilles croissantes, catalogue six originaux. R13 hérité 0/4/2. |
| codex-s1 | écarté — porte R13 échouée deux fois | HEAD `3e81b65f29ca856a21790bb41da30305b571773b`<br>patch livré SHA-256 `c0e3320ff232963ba539dc7705e1594df5aefce0d651e5f37388741b33ed9e24` | 99/100 fins et zéro erreur ; R14 7,72/8,53/9,89 %, scènes et fin CYCLOPE réussies en VM. Charge R13 1/6/3, puis 1/6/2 après plafond du lointain, contre 0/4/2 reçu : portrait en régression persistante. Arrêt, retour exact aux sources t1 prouvé ; sources/raccords S1 non actifs dans la candidate, archivés dans s1-ecarte.patch. |
| codex-w1 | écarté — R13 portrait en régression | HEAD `3e81b65f29ca856a21790bb41da30305b571773b`<br>patch livré SHA-256 `4d2b8d041169f8b7acbb4edac35c7859598c68d0d88de3a42126719e37bbc036` | Deux charges complètes donnent 0/6/2 puis 0/6/2 flashs/s, contre 0/4/2 sur t1 ; 100 cas finaux, zéro erreur ; R14 sous 12 % et 12 fixtures WARP passent mais ne compensent pas ce recul. Retour aux sources t1 ; archive w1-ecarte.patch. Collecte w1-corrige exclue pour mélange de snapshots. |
| codex-r2c | appliqué — r2d accepté avec réserves | HEAD `248b3160072ab599bfc7e56fd2b71dd23924ab23`<br>patch livré SHA-256 `3f895d9e634a5fc9882db393cdcab05191f0166cea5f5b118f0eb00b2e1d4c7e` | Sources corrigées : 100 cas, 96 fins, zéro erreur ; R13 0/3/1 ; R14 8,12/8,33/10,29 %, sans dépassement de bannière. Bon/2 portrait borné : couverture incomplète. 0/80 résumés identiques à t1 (horaires du rythme changés), 80/80 et journaux identiques entre r2d et son correctif de rendu. P4 tirs sous gel reste une réserve acceptée à 04 h 41. |
| codex-p44b | écarté — contrôle de compatibilité arrêté | HEAD `b270d8f962dd39b32c7ecc58cef828599ca8c028`<br>patch livré SHA-256 `4474e1607d4a698c792e5e7c9927d576a2ee5551894c14e4943ede36da84b967` | Deux contrôles ciblés sans erreur mais non concluants : 9/24 puis 12/24 assertions. Après correction des départs publics, 9/9 préparations atteignent boss phase3 / jeu travelling marche. Les fixtures tourelle/mine/larve déplacent un acteur encore soumis au portail r2d ; leurs absences ne prouvent pas un défaut de préavis en partie réelle. Pas de troisième essai ; 80 après non lancées à cette porte arrêtée ; retour exact à r2d-fixe, archive p44b-ecarte.patch. |
| codex-d1b | écarté — lot livré arrêté, contrôleur désactivé | HEAD `248b3160072ab599bfc7e56fd2b71dd23924ab23`<br>patch livré SHA-256 `4acc92a98398490e469e6ccb24b73f769bc95dc2113865dd92a299eef3dd22b3` | final.md arrivé à sa porte (05 h 32) : deux échecs de la porte5, maladroit100 médiane KM59,82 s et CYCLOPE1 %, cibles150–240 s et20–50 %. Contrôleur désactivé et aucune recommandation d’intégration dans son rapport. Aucune troisième passe adaptative ; données et raccords non activés dans f1. G1 avait commencé après une assertion de disponibilité échouée dans un shell sans arrêt automatique ; application anticipée annulée par retour exact à r2d-fixe avant tout essai, puis décision d1b prise dans l’ordre. |
| codex-g1 | appliqué — g1c avec budget caméra, réserves conservées | HEAD `3e81b65f29ca856a21790bb41da30305b571773b`<br>patch livré SHA-256 `7252dfb0b6b3bd8d897befb4caf2ea5bb697e436162e2a3e40c6986221577d6c` | Version g1c acceptée à 04 h 51, plafond40 et cartes de la passe2 sans service combat g1b. Première série100 :99fins,0erreur, pic40 mais R14 13,13/14,36/14,47 %. Unique correction : raccord budget codex12 déjà configuré dans N.R, plancher1px r2d conservé. Série finale100 :99fins,0erreur, R14 8,41/8,10/8,66 %, bannières sans dépassement, R13 0/3/1. 80/80 résumés et journaux identiques avant/après caméra ; titre trois cibles ≥44pt sans recouvrement, 9/9 sorties UI et allocation40/refus sans score sur3profils. Dieu/1 reste borné V4 à540,135 s. Difficulté/temps des cartes et palier qualité restent réservés. |
| codex-f1-audio | appliqué — raccord de transport commun | HEAD `b270d8f962dd39b32c7ecc58cef828599ca8c028`<br>patch livré SHA-256 `88aa6bffb8bfd4a6297b2409a7589ced49860fde29bac242f07d7e2a3af6c7f0` | Une seule propriété music.transport ; contrat t1 conservé, curseur réel r2d séparé par interface publique, annotations indexées reportées sur les neuf grilles remesurées. 47 positions de transport vérifiées, zéro erreur. Série finale100 :99fins,0erreur ; 80/80 résumés et journaux identiques à g1c-budget ; R13 0/3/1, R14 8,41/8,10/8,66 %. Aucun réglage de caméra supplémentaire ; signal WebAudio à vérifier hors bac. |

Les SHA de HEAD décrivent les copies ; les SHA-256 des patches décrivent leurs changements non committés. Les décisions de la cheffe ajoutées à 04 h 41 et 04 h 51 dans les final.md priment les anciens rapports arrêtés de r2c et g1b. `p33b.patch` n’est pas appliqué deux fois. i1 conserve p35, p45b, p33b et p47 ; son ancien p44 écarté n’est pas repris. Les neuf MP3 t1 et leurs grilles restent identiques au lot (catalogue-t1.json).

## Mesures avant / après

| Étape | Résumés paysage identiques | Journaux identiques | Hors flash identiques | Fins /100 avant → après | Erreurs après |
|---|---:|---:|---:|---|---:|
| pointe → u1 | 80/80 | 80/80 | 80/80 | 98 → 98 | 0 |
| u1 → i1 | 80/80 | 0/80 | 80/80 | 98 → 98 | 0 |
| i1 → t1 | 80/80 | 80/80 | 80/80 | 98 → 98 | 0 |
| t1 → w1-fixe | 40/80 | 40/80 | 40/80 | 98 → 98 | 0 |
| t1 → r2d-fixe | 0/80 | 0/80 | 0/80 | 98 → 96 | 0 |
| r2d-fixe → g1c | 0/80 | 0/80 | 0/80 | 96 → 99 | 0 |
| g1c → g1c-budget | 80/80 | 80/80 | 80/80 | 99 → 99 | 0 |
| r2d-fixe → g1c-budget | 0/80 | 0/80 | 0/80 | 96 → 99 | 0 |
| g1c-budget → f1-audio | 80/80 | 80/80 | 80/80 | 99 → 99 | 0 |
| r2d-fixe → f1-audio | 0/80 | 0/80 | 0/80 | 96 → 99 | 0 |

Les trajectoires du rythme, des préavis et des cartes changent volontairement ; chaque variation de temps, vague et score figure dans comparaison-*.json. Aucun écart individuel n’est attribué à une cause isolée sans témoin. Les essais écartés S1 et W1 restent des essais, pas des étapes actives de la candidate.

## R-14 et R-13

| Sources figées | Bon10 paysage : pire | Portrait : pire | Bureau : pire | Flashs/s paysage / portrait / bureau | Fins /100 |
|---|---:|---:|---:|---|---:|
| pointe | 16,16 % | 16,30 % | 18,77 % | 0 / 4 / 2 | 98 |
| u1 | 16,16 % | 16,30 % | 18,77 % | 0 / 4 / 2 | 98 |
| i1 | 16,16 % | 16,30 % | 18,78 % | 0 / 4 / 2 | 98 |
| t1 | 16,16 % | 16,30 % | 18,78 % | 0 / 4 / 2 | 98 |
| s1-avant-cap | 7,72 % | 8,53 % | 9,89 % | 1 / 6 / 3 | 99 |
| w1 | 14,74 % | 15,40 % | 16,24 % | 0 / 6 / 2 | 98 |
| w1-fixe | 7,58 % | 8,36 % | 9,31 % | 0 / 6 / 2 | 98 |
| r2d | 8,12 % | 8,33 % | 10,29 % | non concluant / voir incident | 96 |
| r2d-fixe | 8,12 % | 8,33 % | 10,29 % | 0 / 3 / 1 | 96 |
| g1c | 13,13 % | 14,36 % | 14,47 % | 0 / 3 / 1 | 99 |
| g1c-budget | 8,41 % | 8,10 % | 8,66 % | 0 / 3 / 1 | 99 |
| f1-audio | 8,41 % | 8,10 % | 8,66 % | 0 / 3 / 1 | 99 |

Seuils inchangés : secousses ≤12 % (`S.shake>0` après le vrai cam.update) ; flashs ≤3/s sur plus de 6,6 % du tampon. La pointe reçue échouait déjà en portrait à 4 flashs/s et dépassait le budget caméra. Les bannières admises et leurs écarts sont relus dans les vrais journaux ; les comparatifs récents conservent leur décompte par graine. Une partie à la borne ne valide pas une partie complète, même si son pourcentage de secousse est bas.

## Candidate finale et réserves

La série g1c-budget tient R14 à 8,41 / 8,10 / 8,66 %, avec 30/30 parties bon terminées, zéro bannière hors budget, 99/100 fins et zéro erreur. Le budget caméra codex-12 utilise les paramètres déjà configurés ; le plancher de 1 px de r2d reste en place. 80/80 résumés et journaux sont identiques avant/après ce raccord. Le pic observé à la sortie des vrais spawn/update/directeur est de 40 ennemis non boss, portails et TRAQUEUR compris. La fixture d’allocation accepte 40 puis refuse huit objets sans score et avec IDs uniques, sur les trois profils.

Interface G1/U1 : neuf sorties de boutons satisfaites, cibles ≥44 points et sans recouvrement. Les planches de titre VM paysage/bureau ont été regardées, sans illustrations décodées. Réserve héritée de G1 : glyphes hauts de 14 pixels CSS sur mobile ; au bureau, le libellé JOUR mesure 95 pixels de tampon pour une cible large de 53, il déborde sa surface cliquable. La lisibilité HIG, le raccourci J dans la boucle clavier réelle et la qualité visuelle ne sont pas validés. Les résultats du lot d’origine sur les cartes et la difficulté ne sont pas assimilés à une qualification de cette fusion.

Raccord audio final de fusion : la relecture a trouvé deux propriétés publiques homonymes music.transport ; r2d masquait t1. Une seule API conserve maintenant le contrat t1 et publie un curseur rythme daté sur le temps audio réel. 31 reporte les mêmes indices d’annotations sur les barres remesurées des neuf variantes. Contrôle transport-final.json : 47 positions, drops réellement émis aux dates attendues, durées de temps et minimums d’annonce, zéro erreur. Aucun nouveau nombre de gameplay ni compensation de latence supplémentaire. La phase f1-audio vérifie ensuite les sorties avant/après ; signal et calage WebAudio restent hors bac.

La borne dieu/1 à 540,135 s en V4 reste publiée. Le vérificateur navigateur choisit la graine 2, complète jusqu’au CYCLOPE en VM paysage ; cette sélection sert au parcours de couverture et ne transforme pas la graine 1 en réussite. Les autres profils sont à mesurer dans Chromium.

## Arrêts et raccords non retenus

**S1 : deux échecs, arrêt.** Première charge complète : 1/6/3 flashs/s ; après l’unique plafonnement du lointain : 1/6/2, contre 0/4/2 sur t1. Retour exact à t1 prouvé. La cause fine du surplus portrait reste à établir ; le plafond n’a pas suffi. Aucun troisième essai de S1. Tous les raccords avaient été réalisés : S-01 prochaine barre + bannière 4 temps ; S-02 VOL 8 temps et six portes ; S-05 jolt, silence 1/16, READY un temps, victoire quatre mesures ; mise à jour du CYCLOPE en victoire et attente de sa mort entière avant film. Les 15 scènes VM et les images regardées appartiennent à ce candidat écarté. La durée de victoire observée était 6,683333 s pour 6,677843 s prévues, écart 5,49 ms. **Ces scènes et la correction de fin du CYCLOPE ne sont pas actives dans la candidate livrée.** Archive : s1-ecarte.patch.

**W1/W1b/W1c : deux charges à 0/6/2 flashs/s, arrêt.** Les douze cas ciblés WARP VM passaient : huit cibles détruites, 600 points, retour au repos, écart maximal 10,977 ms pour 12 ms. Le candidat corrigé comptait 100 parties sans erreur et 40/80 résumés identiques à t1 ; les gains ciblés ne compensent pas le recul R13 portrait. Le cadeau NEON prématuré a été corrigé avant le dernier essai ; le défaut photo persistait. Retour exact à t1, W1 et budget indépendant confortFusion retirés. Archive : w1-ecarte.patch. Aucun verdict tactile ou audio réel.

**P44b : arrêt après deux contrôles préalables.** 9/24 puis 12/24 assertions, zéro erreur ; neuf préparations aux états attendus après correction du départ public. Les fixtures déplacent des acteurs encore soumis au portail r2d, ce qui empêche certaines annonces : leurs absences ne prouvent pas un préavis insuffisant en partie réelle. Aucun troisième essai ; les 80 parties après ne sont pas lancées sur cette porte arrêtée. Retour exact à r2d-fixe ; p44b-ecarte.patch conserve le raccord tenté.

**D1b : livré à sa porte puis écarté.** Le rapport final de 05 h 32 arrête le lot après deux échecs et laisse le contrôleur désactivé. Aucune nouvelle passe ni activation de l’adaptation. Ce lot n’est plus en attente. Une application G1 commencée trop tôt après une assertion de disponibilité a été annulée avant tout essai, puis reprise après lecture et décision d1b ; les applications et retours sont conservés.

## Méthode, incidents et limites

Calibration historique : 10/10 parties e1bdc6f exactes (temps de jeu/combat/simulation, vague et score), validation-vm.json. La référence historique calibre la VM ; les comparaisons de fusion portent sur la pointe reçue et les étapes successives. Vraies sources concaténées selon build.mjs, sans DOM, illustrations décodées ni WebAudio. Protocole : stockage vide, jour 20261017, actions auto seulement pour humain, intro.skip, reset plongée, dbg.etat si démarrage, pilote, god pour dieu, journal actif, avancer une fois, puis tranches simuler(0.25), jusqu’à fin ou borne 540 s jeu / 2160 s simulées. Calcul en série, une VM par processus pour les parties et les nouveaux profils R13 ; plafond technique enfant 300 s, qui ne transforme jamais une interruption en réussite.

Chaque étape est figée et signée dans sources-*.json.gz ; chaque enfant vérifie son SHA attendu. Les journaux complets sont gzip et signés. Le retour inutilisé du dump à chaque simuler est différé sans modifier l’anneau ni les événements. Le candidat p44b arrêté conservait son dessin de référence par défaut ; les outils qui dessinent eux-mêmes passent {dessin:false}. p44b est retiré de la candidate finale. R13 compose les vrais calques de 90-boot jusqu’au tampon avant CRT pendant une minute avec rafale initiale ; transitions conservées et mêmes seuils que le critère commun. Le comportement des films décodés reste hors portée VM.

Incidents conservés : premier cwd de git ls-tree corrigé avant calibration ; premières fenêtres R13 sans HUD exclues (instrument-initial/) ; collecte partielle w1-corrige exclue pour instantané écrasé, remplacée par étiquette immuable w1-fixe ; premier rendu r2d : ReferenceError TEMPS, reçu échoué conservé, raccord de tempo corrigé ; processus R13 r2d-fixe sorti 139 après paysage, cause inconnue, profils manquants ensuite acquis séparément sans changer les sources. Les erreurs d’instrument et les erreurs de produit ne sont pas masquées dans un zéro global.

Le raccord build du rythme, hors propriété de f1, est réalisé par src/01-rythme-data.js : mêmes métadonnées synchrones dans le bundle et la VM, concaténées avant les modules. build.mjs reste intact. Lors du futur raccord officiel de build, retirer ce module de données pour conserver une seule injection. Les nouveaux paramètres de jeu sont des ajouts dans N.R et leur raison est dans la section codex-f1 de demandes.md.

Relecture des 100 journaux finaux, sans rejouer les parties : 89 morts au mur, 85 coupes de morsure, zéro mort attribuée à la morsure (relecture-finale.json). Les trois rendus de titre lisent une palette de 16 couleurs et morsure.effet='coupe'. Ce contrôle ne remplace pas l’ensemble du jury ni Safari.

## Livraison et vérification hors bac

combine.patch couvre tout le produit modifié (src, musique, index généré, demandes) et les outils/reçus légers f1. Les journaux gzip, instantanés, planches, patches entrants et logs de calcul restent des annexes locales dans ce dossier. patch-check.json donne le SHA du patch, les empreintes produit et le résultats de git apply --cached --check sur index temporaire et de git apply --check sur arbre propre exporté depuis la pointe. Aucun commit et aucun index Git partagé écrit.

Le vérificateur Playwright est préparé, syntaxiquement contrôlé et **non exécuté** : un seul Chromium headless muet, verrou Chef, HTTP sur port libre, réseau limité au serveur, trois profils en série ; partie dieu jusqu’au CYCLOPE, bon10, R13/R14, scènes S-01 à S-05, préavis p44b, catalogue H six originaux et banc H original après fermeture du Chrome f1. Les scènes S1 retirées sont signalées non mesurables, jamais transformées en réussite. Le banc WARP, si un futur lot l’inclut, déclenche par vrai geste CDP avec touchEnd vide, garde un RAF continu, mesure impacts/PV/score/écarts sur cibles contrôlées et locks publics ; il ne qualifie pas la visée tactile.

**Reste indispensable :** exécution hors bac et revue du reçu Chromium ; résolution des lots arrêtés par décision de la cheffe, arbitrage des lots écartés ; Safari iPhone physique, audio rendu et jury indépendant. La fin CYCLOPE demandée reste un raccord disponible mais retiré avec S1 ; le chantier global n’est pas achevé.
