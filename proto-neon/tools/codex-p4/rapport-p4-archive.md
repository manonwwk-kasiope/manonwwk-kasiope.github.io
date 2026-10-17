# codex-p4 — les télégraphes manquants

18/10/2026 · 00 h 52 (Paris) — mis à jour à 00 h 54. **Commande hors bac :** `cd proto-neon && node tools/codex-p4/verifier.mjs`.

**Livré pour revue ; palier R-07 non validé.** Les publications demandées sont vérifiées en VM. La vérification navigateur est bloquée dans ce bac ; le script est prêt. Aucun serveur ni Chromium n'a été lancé. Aucun commit.

## Modifications

- CYCLOPE : secteur balayé avec ses capsules de bord ; chaque trajectoire des deux salves et de la double spirale ; deux bandes des ciseaux pendant leur charge ; disque d'impact du bond. Les vrais lasers et tirs continuent d'être publiés jusqu'à leur suppression, avec `reste = 0` lorsqu'ils sont actifs. Le laser ne blesse que la tête ; les projectiles et les ciseaux peuvent couper le corps.
- RUCHE : contacts aux positions prévues des larves de la couvée, puis positions réelles tant que leurs portails sont actifs. La couvée ne produit aucun souffle et ne blesse pas directement. Les morsures ultérieures des larves gardent leur publication existante dans 72.
- SENTINELLE : le laser réel, ses deux extrémités et sa demi-largeur restent dans S.tele pendant toute sa vie. Avant, seul l'avertissement était présent.
- Agrégation publique : `N.colosse.publierTele(ajouter)` et `N.ennemis.publierTele()`. Rafraîchissement après 73 pour respecter l'ordre 72 → 73 de la boucle. Pool réutilisé extensible, sans plafond silencieux à 48 zones. Plusieurs formes peuvent décrire une seule attaque avec le même id.
- Six constantes existantes déplacées/copartagées dans `N.R.publicationTele`, raisons et valeurs dans la section codex-p4 de `refonte/lots/demandes.md`. Les délais, dégâts, dessins, palette, flashs, mur et morsure n'ont pas été changés.

## Mesures avant/après : scènes

Sources : [scenes-vm.json](scenes-vm.json) ; journaux, créations physiques et états de chaque pas dans les fichiers `courant-*.json.gz` / `85b389d-*.json.gz`. Temps en secondes de jeu depuis le début de chaque scène. Graine 7, pas de 1/120 s (plus fin qu'une image de référence), vraies sources triées comme build.mjs, aucune IA de jeu remplacée. Les phases 2/3 sont atteintes par `N.ennemis.hit` sur l'œil vulnérable ; les placements passent par `N.joueuse.force`.

| Phase | Attaque | Première zone s | Premier dégât possible s | Avance ms | Points couverts | R-07 |
|---|---|---:|---:|---:|---:|---|
| 1 | Rayon balayé | 3,425000 | 4,341667 | 916,67 | 334/334 | ≥ seuil |
| 1 | Salves radiales | 7,558333 | 8,375000 | 816,67 | 1232/1232 | ≥ seuil |
| 2 | Ciseaux | 13,825000 | 14,741667 | 916,67 | 518/518 | ≥ seuil |
| 2 | Salves radiales | 17,358333 | 18,175000 | 816,67 | 1232/1232 | ≥ seuil |
| 3 | Bond / impact | 27,225000 | 28,233333 | 1008,33 | 1/1 | ≥ seuil |
| 3 | Double spirale | 30,250000 | 31,066667 | 816,67 | 1232/1232 | ≥ seuil |
| — | RUCHE / contact des larves | 1,833333 | 3,541667 | 1708,33 | 708/708 | ≥ seuil |
| — | SENTINELLE / laser | 3,133333 | 4,000000 | 866,67 | 126/126 | ≥ seuil |
| 3 | Mines du bond / contact | 28,841667 | 28,850000 | 8,33 | 1/1 | **écart préexistant** |
| 3 | Mines du bond / souffle | 28,841667 | 29,441667 | 600,00 | 1/1 | **écart préexistant** |

**Avant** : aucune zone CYCLOPE ni RUCHE dans ces scènes ; l'avertissement SENTINELLE apparaissait au même instant mais disparaissait au tir (115/126 points de contrôle manquants). Les deux défauts des mines étaient déjà présents. **Après** : 5385 points de contrôle couverts, aucune erreur de schéma ni erreur VM/console. Ces points échantillonnent les centres et bords des trajectoires réelles, les lasers pendant leur vie, les mains, les larves et les collisions effectives ; ils ne constituent pas une preuve exhaustive sur toutes les graines.

Le premier dégât possible des tirs/lasers/contact des mains est déduit des vrais objets créés et de l'ordre de boucle : 70 teste les collisions avant 72/73, donc au pas suivant. Le bond et les mines sont confirmés par une mort effective (retour du module ou événement mort avec coordonnées) ; les ciseaux produisent aussi de vraies coupes. La géométrie est contrôlée au dernier avertissement et sur les dangers créés, avec leur largeur ; aucun compteur d'appels seul ne donne le verdict. Les dates de première création et les objets physiques émis sont **identiques avant/après dans les dix scènes** ([controles.json](controles.json)).

**Écarts laissés tels quels, inscrits dans demandes.md :** le contact d'une mine du bond peut tuer 8,33 ms après la première zone S.tele, sous les deux seuils. Son portail visuel est déjà présent avant, mais il n'est pas publié dans S.tele. Le souffle arrive après 600 ms : conforme au seuil général de 500 ms, insuffisant au seuil CYCLOPE de 800 ms si ces mines lui sont rattachées. Les journaux de ces coups peuvent porter `teleDuree = 0` malgré une zone existante ; ce champ n'est pas utilisé comme preuve de délai. Aucun seuil abaissé, aucun temps corrigé.

## Parties des pilotes

[parties-vm.json](parties-vm.json), reçus complets `avant/apres-{dieu,bon}-{1,2,3}.json.gz`. Protocole de tools/pilotes/parties.mjs : stockage vide, S.jour=20261017, réglage actions, intro.skip, reset départ plongée et crochet seulement si demarrage, pilote, dieu invulnérable, journal actif, horloge.avancer initial puis simuler(0.25) jusqu'à fin. Aucun écran intermédiaire sauté. Borne de 540 s de jeu et garde de blocage inchangées.

| Pilote | Graine | Temps jeu avant → après s | Score avant → après | Morts CYCLOPE avant → après | Boss atteint après | Arrêt / erreurs après |
|---|---:|---|---|---:|---|---|
| dieu | 1 | 349.908 → 346.725 | 187660 → 202370 | 0 → 0 | oui | fin / 0 |
| dieu | 2 | 328.990 → 325.652 | 143860 → 118190 | 0 → 0 | oui | fin / 0 |
| dieu | 3 | 434.908 → 415.885 | 202520 → 200250 | 0 → 0 | oui | fin / 0 |
| bon | 1 | 81.137 → 81.137 | 1280 → 1280 | 0 → 0 | non | fin / 0 |
| bon | 2 | 318.545 → 322.583 | 118090 → 143110 | 3 → 2 | oui | fin / 0 |
| bon | 3 | 84.132 → 84.132 | 2180 → 2180 | 0 → 0 | non | fin / 0 |

Les douze parties vont à fin, zéro erreur et zéro erreur console. Sur ce petit lot, bon passe de **3 à 2 morts attribuées au CYCLOPE**, toutes sur la graine 2 ; les graines 1/3 n'atteignent pas le boss. Dieu est invulnérable par protocole : ses zéros ne qualifient pas la difficulté. Aucune conclusion statistique sur les pilotes.

## Instrument, construction et reste

[validation-vm.json](validation-vm.json) : dix parties inerte, graines 1 à 10, sources de e1bdc6f, redonnent exactement les temps de jeu, vagues et scores de tools/pilotes/sortie.json ; zéro erreur. Le chargeur vérifie aussi que chaque source exacte appartient au bundle de son état. Initialement, plusieurs contextes dans un même processus ont arrêté Node avec le code 139 après quatre concordances ; chaque partie tourne désormais dans un processus isolé. Une adaptation initiale du chemin git ls-tree a donné un TypeError (gfx absent), corrigé avant la nouvelle série complète de dix concordances.

La première sonde produisait jusqu'à deux faux négatifs après modification (collisions d'une attaque antérieure et laser déjà retiré) et ne voyait pas l'appel lexical du laser SENTINELLE : [scenes-vm-initial.json](scenes-vm-initial.json). Elle a été corrigée pour observer les vrais objets publics et l'événement mort, puis les scènes ont été remesurées, sans affaiblir les seuils. Le contact des mines reste un vrai échec de délai, pas une réussite masquée.

Build : `cd proto-neon && node build.mjs`, sortie 0, [build.log](build.log). Avant : `39a4aeca0f9d469b75b7a4608cc94b2055cc466b5bba6f8524548a5239390538`. Après : `04aaf1bbd7b852f3ece520f386b32f48c8d42d1b6d4b6d133891815a41954e44`. Le manifeste des parties conserve aussi l'empreinte initiale prise avant la migration de la constante du rayon ; les enfants après ont tous été lancés après le dernier build (ordre séquentiel du banc, reçu avant-bon-3 postérieur à ce build).

**Reste indispensable hors bac :** lancer verifier.mjs. Il sert les deux bundles, ouvre un seul Chromium muet, teste les profils tactiles iPhone 844×390 / 390×844 et bureau 1440×900 en série, conserve les pixels de N.gfx.buf(), leurs histogrammes/empreintes, captures, journaux et les parties. Il doit rapporter les défauts connus des mines comme échecs, pas adapter les seuils. Aucune mesure de pixels, capture, performance navigateur ou compatibilité Safari réelle n'est revendiquée ici. La cheffe d'orchestre relit/intègre le diff ; le palier R-07 demeure non validé.
