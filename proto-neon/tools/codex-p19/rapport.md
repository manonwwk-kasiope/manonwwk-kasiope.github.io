# codex-p19 — instrument caméra R-12

18/10/2026 · 03 h 24 (Paris).

Commande **hors du bac**, depuis la copie codex-p19 :

```sh
cd proto-neon && node tools/codex-p19/verifier.mjs
```

Commande Node/VM utilisable dans le bac :

```sh
cd proto-neon && node tools/codex-p19/verifier.mjs --statique
```

**Instrument livré et contre-épreuves VM réussies. R-12 global non validé. Qualification navigateur : chantier bloqué dans ce bac**, où serveur local et Chromium sont interdits par la mission ; ni `listen` ni lancement Chromium n'ont été essayés. Le script navigateur est prêt, son exécution réelle et Safari restent à vérifier.

## Correction et portée exacte

Seul `tools/mesure/criteres/R-12-explosion.mjs` est modifié dans le banc. `sonde.js`, tous les fichiers `src/` et tous les seuils sont inchangés ; demandes consignées dans la section codex-p19 de `refonte/lots/demandes.md`. Aucun commit.

La grandeur retenue est **l'amplitude publique `S.shake`, en pixels de jeu**, autorisée par la mission et par l'ancien R-12. Elle est lue avant `N.gfx.present`, une fois le tampon dessiné. Elle ne certifie pas le déplacement final du CRT. Le déplacement de suivi `N.cam − tête` ne contribue plus au verdict.

Pour chacune des quatre cibles, deux relectures partent du même chargement vierge, avec le même seed et le même jour. Toutes les scènes et morts antérieures sont rejouées dans les deux branches : le budget de flash et les cascades sont conservés. Les tentatives refusées sur l'œil du CYCLOPE sont aussi rejouées ; seul le coup fatal constaté est omis dans le témoin. Aucun champ privé de module n'est utilisé.

Le résultat est `max(0, max_i(shake_impact[i] − shake_témoin[i]))`, sur les **30 images consécutives après ce coup**, fenêtre déjà utilisée dans l'instrument reçu. Les **60 images** du volet brasier sont conservées. Les différences négatives restent dans la trace, mais ne prouvent pas une secousse supplémentaire. Les deux maxima globaux ne sont plus soustraits. Le seuil reste **≥ 6 px**, lu dans `N.R.criteres.R12.camera` ; brasier **> 8 % pendant ≥ 4 images** inchangé.

Le banc vérifie l'identité du préfixe : état, horloge, seed, état RNG public, cible, journal, valeurs caméra et empreintes des vrais tampons. Préfixe différent, image manquante/dupliquée ou amplitude invalide : **non mesurable**, sans valeur de remplacement. Les RAF sont livrés à la demande à la vraie fonction `frame()` de `90-boot.js`, sans modifier cette source, pour éliminer les courses entre deux `page.evaluate`. L'adaptation automatique du tube est arrêtée dans cette fixture, sans changer le préréglage ni la secousse.

L'ancien calcul reste publié à titre diagnostique sur **les mêmes traces impact**. Le diagnostic p3c historique **0,4752 = 12 − 11,5248**, communiqué dans la mission, n'est pas présenté comme un nouveau résultat de cette copie.

## Validation préalable de la VM

[validation-vm.json](validation-vm.json) : **10/10 parties e1bdc6f identiques**, cinq pilotes (inerte, tourneur, maladroit, kamikaze, humain), graines 1 et 2. Comparaison stricte de tempsJeu, tempsCombat, pas, tempsSimule, vague, score, raison, fin et err avec `tools/pilotes/sortie.json`. Aucune tolérance ajoutée. Chargement par `git show e1bdc6f:proto-neon/src/…`, ordre lexical du build et fermeture commune ; protocole officiel de départ/simulation. Le reçu porte l'empreinte du helper VM ; il est réutilisé seulement si cette empreinte correspond et si dix parties ont réussi.

La VM n'a pas de DOM. Pour R-12, elle exécute la **vraie fonction frame de 90-boot**, avec les vrais modules, mises à jour, dessins, HUD et lectures de `N.gfx.buf()` ; les images d'art et la sortie CRT ne sont pas disponibles. Ce résultat n'est ni une capture navigateur ni une qualification iPhone Safari. Le helper est repris du helper lisible de codex-p15, avec une exposition de `frame()` réservée à cet essai.

[ordonnanceur-vm.json](ordonnanceur-vm.json) : le même ordonnanceur RAF que le script navigateur avance de **0 à 3 vraies images**, zéro erreur VM/console. [controle-recus.json](controle-recus.json) : **8 paires de branches**, **240 écarts par image** vérifiés ; zéro erreur VM/console ; préfixe altéré, image manquante et secousse négative refusés.

## Cas construits aux verdicts connus

Source : [construits-vm.json](construits-vm.json), script [statique.mjs](statique.mjs). Vraies fonctions `N.fx.shake`, `N.fx.update`, horloge/caméra et dessin ; aucune sortie simulée par un compteur d'appels. Un témoin sans secousse est apparié à chaque trace. Les valeurs sont lues après la première décroissance normale : l'entrée de 8 px n'est donc pas annoncée comme une sortie de 8 px.

| Entrée construite | Maximum apparié réel | Verdict au seuil ≥ 6 px |
|---|---:|---|
| aucun coup / aucune secousse | 0 px | échec attendu |
| secousse forcée 8 px | 7,2353632823 px | réussite attendue |
| secousse forcée 3 px | 2,5392 px | échec attendu |

Les trois assertions passent. Le suivi caméra seul donne aussi **0 px**. Contre-exemple analytique supplémentaire : un témoin culmine à 12 px sur une image et l'impact à 8 px sur la suivante ; le calcul apparié rend **8 px**, là où la différence de maxima rendrait zéro. Troncature, duplication et NaN sont refusés. Ces tests d'instrument ne constituent pas une mesure de qualité visuelle.

## R-12 sur les deux états reçus — VM, profil paysage

Sources complètes : [codex-p15-vm.json](codex-p15-vm.json), [integre-vm.json](integre-vm.json) ; résumé [statique.json](statique.json). Dans le tableau, « avant → après » compare **ancien calcul et calcul apparié sur la même branche impact**, sans modification du jeu. Chaque branche conserve le vrai journal et les valeurs par image. Les tampons sont analysés réellement, sans illustrations décodées ni CRT.

| État reçu | Cible | Caméra ancien → apparié, px | Caméra ≥ 6 | Images consécutives > 8 % de brasier |
|---|---|---:|---|---:|
| codex-p15 | CYCLOPE | 1,209958 → 12 | oui | 60 |
| codex-p15 | flèche blindée | 0 → 3,686400 | **non** | **0** |
| codex-p15 | rival | 0 → 4,224000 | **non** | 9 |
| codex-p15 | ruche instable | 0 → 4,578735 | **non** | 11 |
| intégré codex-p19 | CYCLOPE | 1,209958 → 12 | oui | 34 |
| intégré codex-p19 | flèche blindée | 0 → 10,160608 | oui | **0** |
| intégré codex-p19 | rival | 0 → 10,160608 | oui | **0** |
| intégré codex-p19 | ruche instable | 0 → 10,160608 | oui | **0** |

**Tous les préfixes sont identiques et toutes les branches ont zéro erreur VM/console.** Les trois élites p15 restent réellement en échec sur la grandeur demandée. Exemple précis, flèche : sur l'image relative 21, impact **6,9312**, témoin **3,2448**, différence **3,6864 px**. L'état intégré donne pour les élites, image relative 5 : impact **10,5**, témoin **0,3393916236**, différence **10,1606083764 px**. Les traces permettent de contrôler les témoins encore secoués et la saturation ; ces résidus ne valent pas une mesure d'explosion isolée.

Les résultats brasier sont conservés, même nuls. La correction caméra ne les valide pas. Les valeurs du rapport antérieur de p15 provenaient de sa boucle VM manuelle ; ici la vraie frame comprend aussi les trois images de préparation de scène, le dessin complet et la décroissance de fin d'image. On ne confond pas ces fixtures ni ces résultats avec un reçu navigateur. Aucune cause du défaut brasier n'est attribuée à l'aveugle.

## Builds, vérifications et suite

[empreintes.json](empreintes.json) fige les empreintes de chaque fichier source et des sorties ; [build-integre.log](build-integre.log), [build-p15.log](build-p15.log).

- `cd proto-neon && node build.mjs` : **sortie 0**, 37 modules ; `index.html` sans différence Git. SHA-256 : `59d89e7f8f61468f28c0135078c11961ce25e4cae83cc139de57dd1b513b3bc2`.
- `node build.mjs <dossier-codex-p19>/bundles/codex-p15.html`, exécuté depuis la copie p15 : **sortie 0**, aucune écriture dans cette copie. Snapshot SHA-256 : `9478fd555bbeb103c38cb772586ad2c0f81a253c398793fe32527e702f7b1291`. Son chemin de sortie différent explique des chemins relatifs d'actifs différents de l'index reçu, dont l'empreinte figure aussi dans le reçu.
- Passe Node/VM complète : **sortie 0**. Syntaxe des scripts et du critère vérifiée ; `git diff --check` : **sortie 0**.
- Premier essai statique arrêté par **ENOENT** : chemin de lecture p15 initialement résolu dans `Projets/codex-p15` au lieu de `Projets/wt-snake/codex-p15`. Les trois construits avaient déjà passé ; chemin corrigé puis passe complète réussie. Ce n'était pas une erreur du jeu.
- Aucune partie des 80 pilotes avant/après de l'état courant n'est revendiquée : aucun module de jeu ni bundle intégré n'a changé. La validation historique des dix parties sert uniquement à qualifier la VM.

Le [vérificateur navigateur](verifier.mjs) reconstruit les deux bundles dans son propre dossier `navigateur/bundles`, les sert sur un port Node libre, puis utilise **un seul Chromium muet**. Il exécute R-12 successivement pour chaque bundle en iPhone 13 tactile **844 × 390**, iPhone 13 **390 × 844** et bureau **1440 × 900**. Reçus dans `navigateur/resultats.json`, traces des deux branches par cible, anciens calculs, captures, PNG du tampon, journal, état et erreurs. Une erreur d'environnement ou un critère en échec produit une sortie non nulle et reste conservé.

**Reste indispensable :** exécuter la commande hors bac et relire ses six bilans, puis vérification Safari réelle. Le brasier et les échecs caméra p15 appartiennent aux propriétaires du jeu ; aucune correction de source ni dépense n'est entreprise ici. Sous-tâche instrument terminée ; palier R-12 et chantier de qualification non achevés.
