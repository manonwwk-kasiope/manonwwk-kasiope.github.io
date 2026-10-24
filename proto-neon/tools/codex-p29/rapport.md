Commande navigateur, hors bac à sable : `node proto-neon/tools/codex-p29/verifier.mjs`

# codex-p29 — R-08, diagnostic de la bascule

18/10/2026 · 04 h 10 (Paris) ; mis à jour à 04 h 10.

**Commit de bascule du critère brut : `51c9aa12ec802804109e87426dea737873d74ac5` (codex-p5). Verdict : défaut de mesure démontré ; la baisse ne prouve pas une régression de l'équité du jeu.** Le réglage de difficulté change les parcours et expose des limites anciennes de `visibleDepuis`. Aucun fichier `src/`, seuil ou comportement du jeu n'a été corrigé. Le résultat brut final reste **88,46 %, en échec** ; aucun cas n'est retiré ni reclassé dans ce résultat.

Diagnostic VM terminé. Les pixels et Safari restent à vérifier par la cheffe avec le script préparé ; ce rapport ne valide pas la qualité visuelle ni toutes les morts du jeu.

## Instrument et périmètre réellement mesuré

- Validation préalable de la VM sur les sources de `e1bdc6f` : **14/14 parties identiques**, sept pilotes × graines 1 et 2, sur temps de jeu, temps de combat, vague, score et arrêt ; zéro erreur. La référence contient 80 parties ; je ne prétends pas les avoir toutes rejouées. Preuve : [validation-vm.json](validation-vm.json).
- Sources historiques lues par `git show`, concaténées dans l'ordre de `build.mjs`, dans une fermeture et une `vm.createContext`, sans DOM. Stockage vide, jour imposé 20261017, profil logique paysage 844 × 390, actions auto pour humain, doigts pour les autres ; départ plongée, pilote, journal actif, amorçage de l'horloge, tranches de 0,25 s. Aucun interlude, garde ou écran de partie sauté.
- Les deux reçus fournis viennent d'une batterie de **tous les critères en mode `rapide: true`** : pour R-08, quatre pilotes (`bon`, `humain`, `expert`, `maladroit`) × cinq graines, donc **20 parties par commit**, et non cinquante graines par pilote. Ce même lot est conservé pendant la dichotomie.
- Définition brute inchangée de `tools/mesure/criteres/R-08-mort-juste.mjs` : exclure mur, morsure et traînée ; compter `visibleDepuis >= 0.6 - 1e-6` ; exiger une part ≥ 0,95. Ces valeurs sont celles de N.R. Aucun nouveau chiffre de jeu ajouté.
- Chaque partie conserve les vrais événements `N.journal.dump()`. La sonde lit les sources, projectiles, zones et voies publiques, avec leur géométrie à chaque pas ; aucune lecture de champ privé d'un module. **9/9 observations sont neutres** : temps, vague, score, morts et journal complet identiques au témoin sans sonde. Preuve : [preuves.json](preuves.json), rubrique `observations`.
- Les comptes, causes et exemples fautifs des deux extrémités reproduisent les reçus : **46/48** et **46/52**. Ce n'est pas une identité intégrale avec le protocole du banc : l'amorçage explicite imposé par `tools/pilotes/parties.mjs` est absent de `__MESURE.simulerPartie`. L'écart maximal d'horloge finale est 0,016667 s sur 8f55a91 et 0,008333 s sur 318ce61. Sur 8f55a91, une mort déjà conforme de humain/graine 1 a un autre auteurId et une autre durée conforme ; aucun exemple fautif ni classement R-08 ne change. Sur 318ce61, tous les champs comparés des morts retenues sont identiques. Voir [comparaison-recus.json](comparaison-recus.json).
- Les bundles historiques de départ et d'arrivée contiennent exactement leurs **35 et 37 modules** historiques ; leurs empreintes SHA-1 commencent bien par celles des reçus, `a9d697adff61` et `467758821afe`. Voir [coherence-bundles.json](coherence-bundles.json).

## Dichotomie et tableau par commit

Source de tous les nombres : [preuves.json](preuves.json) et journaux `mesure-<commit>-5.json.gz`.

| Commit | Parties | Morts retenues | Conformes | Part brute | Verdict R-08 |
|---|---:|---:|---:|---:|---|
| 8f55a91 | 20 | 48 | 46 | 95,83 % | conforme |
| 15b0ef3 | 20 | 49 | 47 | 95,92 % | conforme |
| e7f8324 | 20 | 55 | 53 | 96,36 % | conforme |
| **51c9aa1** | **20** | **62** | **57** | **91,94 %** | **échec** |
| 6993076 | 20 | 62 | 57 | 91,94 % | échec |
| 318ce61 | 20 | 52 | 46 | 88,46 % | échec |

Ordre de recherche sur les commits touchant `src/` de la lignée principale : 6993076 (échec) → 15b0ef3 (conforme) → e7f8324 (conforme) → 51c9aa1 (échec). Le parent immédiat de 51c9aa1 est **2a158db**, dont l'arbre `src/` est strictement identique à e7f8324 : aucun changement source intermédiaire ne reste à départager. Il s'agit de la frontière conforme/échec isolée par cette dichotomie ; cela ne suppose pas une évolution monotone de toutes les statistiques de jeu.

**Zéro erreur de jeu sur les 120 parties de comparaison.** Un essai n'atteint pas `fin` : **e7f8324, bon, graine 2, borne à 540,153750 s**. Il reste publié comme borné, ses morts observées restent dans le calcul comme dans la définition de R-08 ; aucune fin n'est inventée. Les autres 119 parties atteignent `fin`.

## Ce que change le commit responsable de la bascule

Le [diff exact](bascule.diff) ne touche que `02-regles.js` :

| Ligne de 51c9aa1 | Réglage | Avant → après |
|---|---|---|
| 571 | `directeur.vitessesFleches` | [50,55,60,65,70] → [40,44,48,52,56] |
| 576 | plafond V1 | 10 → 12 |
| 582 | charges de flèches V2 | 2 → 1 |
| 639 | approche de la flèche | [50,70] → [40,56] |
| 737 | PV phase / total CYCLOPE | 1500/4500 → 1200/3600 |

Ces changements suffisent ensemble à modifier les parcours déterministes et la population des morts mesurées. Aucune attribution à une seule de ces lignes n'a été démontrée par une ablation ; je n'en invente pas une. **La fonction `infoSource` n'a pas changé entre les extrémités.** p4d n'est pas ancêtre de 318ce61 : son changement d'attribution ne peut expliquer ce reçu.

Les lignes citées ci-dessous sont celles des commits indiqués, pas celles du HEAD actuel. Les passages numérotés sont conservés dans [sources-diagnostic.txt](sources-diagnostic.txt).

## Les cinq morts sous le seuil au commit de bascule

Temps `mort.d.t` du jeu, non l'horloge globale du journal. Liste exhaustive : [mesure-51c9aa1-5.json.gz](mesure-51c9aa1-5.json.gz).

| Pilote / graine | Temps s | Cause | Auteur / id | visibleDepuis s | Vague | Quartier |
|---|---:|---|---|---:|---:|---|
| bon / 2 | 214,789583 | ennemi | mine / 489 | 0 | 5 | coeur |
| bon / 3 | 215,845417 | convoi | convoi / null | 0 | 5 | coeur |
| bon / 5 | 67,491667 | ennemi | mine / 62 | 0 | 2 | artere |
| humain / 1 | 365,811667 | tir | cyclope / 536 | 0 | 5 | coeur |
| humain / 3 | 67,491667 | ennemi | mine / 56 | 0 | 2 | artere |

**Les trois mines révèlent un compteur qui ignore le portail.** Les sources 489, 62 et 56 sont géométriquement dans la vue pendant respectivement **1,450 / 1,500 / 1,500 s** avant la mort (bornes conservatrices au pas observé précédent). Leur événement `apparition` arrive juste avant le contact, et `vuDepuis` vaut encore -1. Dans `51c9aa1:72-ennemis.js:732-736`, le portail se termine puis `continue` saute le calcul de visibilité du même pas. `76-directeur.js:208,220` annonce ces mines par des marqueurs de 1,5 s ; `72-ennemis.js:1105-1114` dessine ces marqueurs pendant le portail. Le zéro n'est donc pas une mesure de la durée d'annonce. Il ne prouve pas que la mine a attaqué sans avertissement.

Preuves indépendantes et neutralité : `observation-51c9aa1-bon-2.json.gz`, `...-bon-5.json.gz`, `...-humain-3.json.gz`. Les durées ci-dessus sont géométriques ; le rendu effectif du marqueur est à confirmer en navigateur. Les deux autres zéros ont les mêmes limites de famille que les convois et tirs décrits ci-dessous ; leur durée visuelle propre n'est pas annoncée comme mesurée ici.

## Les six morts fautives de 318ce61

Liste exhaustive avec coordonnées et journaux : [mesure-318ce61-5.json.gz](mesure-318ce61-5.json.gz). Une observation neutre complète existe pour chacune des six parties dans `observation-318ce61-<pilote>-<graine>.json.gz`.

| Pilote / graine | Temps s | Cause | Auteur / id | visibleDepuis s | Vague | Quartier |
|---|---:|---|---|---:|---:|---|
| bon / 3 | 180,707917 | convoi | convoi / null | 0 | 4 | tours |
| bon / 4 | 245,943750 | ennemi | traqueur / 492 | 0,566667 | 5 | coeur |
| bon / 5 | 267,575000 | souffle | mine / null | 0 | 5 | coeur |
| humain / 2 | 197,798333 | laser | sentinelle / 357 | 0 | 4 | tours |
| expert / 1 | 262,562500 | convoi | convoi / null | 0 | 5 | coeur |
| expert / 5 | 370,493750 | tir | cyclope / 670 | 0 | 5 | coeur |

1. **Convois : zéro par construction.** `318ce61:70-joueuse.js:180-182` ne cherche que les sources `genre:'ennemi'`, tandis que le convoi est `genre:'arene'`. Bon/graine 3 : voie géométriquement visible depuis **5,045 s**, wagons depuis **1,379 s**. Expert/graine 1 : voie depuis **1,825 s**, wagons depuis **0,325 s**. Le premier est un faux zéro manifeste. Le second distingue annonce et corps du convoi : il reste sous 0,6 s si l'on exige le corps plutôt que son annonce ; je ne le transforme pas en succès. L'annonce vient de `73-arene.js:196-203`. Ce n'est pas un changement apporté par p4d.
2. **Souffle : auteur erroné et identité perdue.** La vraie menace est le disque INSTABLE laissé par la ruche élite 531, abattue à l'horloge 288,712083. Le disque reste dans la vue jusqu'à la mort à 289,512083 ; observation conservatrice : **0,791667 s**, total annoncé 0,8 s. `72-ennemis.js:830` appelle `souffle(..., null, false)`, puis `:228` le remplace par `{type:'mine',id:-1}`. `infoSource` ne peut retrouver cette source. La mine affichée dans le journal n'est pas la vraie origine de ce souffle.
3. **Laser : l'auteur a été détruit.** Sentinelle 357 vue pendant **1,483333 s** jusqu'au dernier pas précédant sa destruction à 215,506667 ; laser annoncé à 214,556667, mort à 215,756667. La zone de laser est géométriquement visible depuis **1,191667 s** au dernier pas observé. `72-ennemis.js:856` retire l'auteur de la liste, mais le laser continue ; `70-joueuse.js:174-182` ne conserve aucun historique et produit zéro. C'est un défaut de mesure établi.
4. **Tir : visibilité de l'émetteur substituée à celle du projectile.** La balle qui touche effectivement la tête est **1033**, rattachée au CYCLOPE 670 ; sa visibilité géométrique continue observée est **1,725 s**. L'œil du CYCLOPE est alors hors du cadre : sa valeur -1 devient zéro. `70-joueuse.js:408` transmet seulement `b.src` ; `73-colosse.js:234-238,791-792` mesure l'œil, pas la balle. L'instrument ne dit donc pas combien de temps le danger qui touche a été visible. Il faut préciser cette attribution, sans abaisser le seuil.
5. **Traqueur : cas limite conservé.** Le compteur mesure le centre depuis **0,566667 s**, sous le seuil. La borne géométrique du sprite intersecte la vue depuis **0,6375 s** ; le même ennemi avait aussi été vu antérieurement pendant plus de deux secondes. `72-ennemis.js:778-779` mesure le centre avec marge zéro et réinitialise sa durée à chaque sortie de vue. Cela n'est pas une mesure des premiers pixels effectivement dessinés. **Ce cas reste à vérifier visuellement** ; je ne déclare ni sa conformité ni une mort injuste prouvée à partir de cette intersection de rectangle.

Les deux échecs initiaux de 8f55a91 étaient bon/1 et expert/1, mines en V2/artere, **0,033333 et 0,058333 s** : ils sont conservés dans les preuves. Les listes fautives exhaustives de tous les commits testés figurent dans [preuves.json](preuves.json), sans la limite de huit exemples du critère officiel.

## Suites précises et limites

La correction est à confier aux propriétaires des modules, conformément à la mission : conserver la provenance et l'historique du danger qui tue (portail, convoi, INSTABLE, laser, projectile), et distinguer durée d'annonce, visibilité de l'auteur et visibilité du danger. Une absence d'identité ne doit pas être présentée comme une durée réellement mesurée de zéro. **Conserver 0,6 s et 95 %, les exclusions actuelles et les résultats bruts ; ne pas simplement compter tous les zéros comme conformes.** Demandes inscrites dans la seule section codex-p29 de `refonte/lots/demandes.md`.

Le résultat de la VM est un diagnostic d'état, de chronologie et de géométrie ; les durées de rendu, les pixels réellement visibles et Safari restent hors de sa preuve. Le script Playwright est complet et syntaxiquement vérifié, avec imports résolus : serveur Node sur port libre, bundles historiques contrôlés, un seul Chromium `--mute-audio`, réseau des pages limité au serveur local, 20 parties paysage par extrémité, contrôles portrait 390 × 844 et bureau 1440 × 900, états/journaux/erreurs et véritables tampons de pixels archivés. **Il n'a pas été exécuté**, conformément à l'interdiction de `listen` et Chromium dans ce bac. Il produit `navigateur/resultats.json` et des reçus gzip. Chromium émulant un iPhone ne constitue pas une validation Safari réelle.

`cd proto-neon && node build.mjs` : **sortie 0**, bundle strictement identique à l'entrée, aucun fichier généré hors mission modifié. Preuves : [build.json](build.json), [build.log](build.log). Aucun commit Git, serveur local, lancement de navigateur, SSH, service extérieur ni connexion sortante.

Reproduction locale de la logique, sans navigateur :

```sh
node proto-neon/tools/codex-p29/diagnostic.mjs valider
node proto-neon/tools/codex-p29/diagnostic.mjs mesurer 8f55a91
node proto-neon/tools/codex-p29/diagnostic.mjs mesurer 318ce61
node proto-neon/tools/codex-p29/diagnostic.mjs mesurer 6993076
node proto-neon/tools/codex-p29/diagnostic.mjs mesurer 15b0ef3
node proto-neon/tools/codex-p29/diagnostic.mjs mesurer e7f8324
node proto-neon/tools/codex-p29/diagnostic.mjs mesurer 51c9aa1
node proto-neon/tools/codex-p29/diagnostic.mjs observer 318ce61 expert 5
```

Les journaux complets sont compressés, lisibles par `zlib.gunzipSync`. `diagnostic.mjs` sait relire les témoins compressés pour contrôler la neutralité d'une observation.
