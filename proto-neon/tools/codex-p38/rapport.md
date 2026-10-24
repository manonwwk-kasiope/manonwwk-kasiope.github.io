18/10/2026 · 06 h 01 (Paris) — mis à jour à 06 h 01.

Commande navigateur à lancer **hors bac** : `cd proto-neon && node tools/codex-p38/verifier.mjs`.

**Lot non validé : 30/30 journaux de jeu corrigés identiques, 0/80 parties simulées inchangées.** La contrainte de non-régression ne passe pas ; ne pas intégrer ces raccords comme un palier validé.

La mission produit deux patchs à relire, sans changer les modules réservés : [raccord-79-jeu.js.patch](raccord-79-jeu.js.patch) et [raccord-50-fx.js.patch](raccord-50-fx.js.patch). Le critère R-30 conserve son seuil et compare aussi le pas exact. Aucun nouveau chiffre de gameplay, aucun commit, aucun serveur, navigateur ou réseau sortant utilisé ici. Build sortie 0, trace [build.log](build.log) ; syntaxe candidate contrôlée par preparer.mjs. Les sources reçues et candidates sont figées et empreintées dans [manifeste.json](manifeste.json).

## Cause et premier écart

Le reçu navigateur p16c du 18/10 à 05 h 03–05 h 12 donne le même échec avant/après : entrée 19, pilote/bon, coût −0,08412205609432473 contre −0,06543600754574878. Extrait local et empreinte du reçu externe dans [recu-p16c-extrait.json](recu-p16c-extrait.json) ; ce reçu ne constitue pas une exécution navigateur p38.

1. **Caméra au mauvais endroit en simulation.** `src/79-jeu.js:564` appelle cam.update avant le pas de jeu dans la boucle dessinée ; `src/79-jeu.js:881` l'appelle après le jeu et les effets en simulation. La branche attraction a le même aiguillage divergent à la ligne 556. La caméra lit la vraie tête (`12-cam.js:190`), avance aussi les murs du monde, puis publie S.vue (lignes 232, 297–298). Le pilote et les règles reçoivent donc un état différent au pas suivant. Le directeur utilise aussi la caméra et sa vue anticipée pour refuser les points de naissance (`76-directeur.js:100–121`). Le raccord donne à la simulation l'ordre de la boucle dessinée, une seule mise à jour de caméra par pas.
2. **Un reliquat d'image borne le temps du monde.** `src/50-fx.js:890` lit hitstopLeft()/60 avant de limiter un nouveau ralenti. hitstopLeft est ancré sur S.frame (lignes 301–311), figé dans dbg.simuler ; le gel réel est pourtant consommé par le pas fixe (`03-socle.js:920`). La sonde publique obtient gel=0 et hitstopLeft=10 ; la même demande N.R.scene.niveau revient à k=1 au pas 61 avant, au pas 63 après. Le raccord lit horloge.resteGel(), API publique sans allocation, et conserve le repli d'image sans horloge. Il ne change ni le budget de flash ni ses admissions. Cette correction peut aussi affiner la borne en dessiné lorsqu'un gel et un ralenti se chevauchent.

Le premier écart du journal est généralement une décision du pilote, événement de contrôle réel, pas une bannière. La colonne suivante montre le premier écart parmi les autres événements de jeu. Les valeurs complètes (pas, type, données et t) pour chaque graine/profil sont dans [bilan.json](bilan.json), et les deux journaux complets compressés dans journaux/. Aucun champ des données de jeu n'est supprimé.

| Profil | Graine | Première entrée différente (index zéro) | Pas dessiné / simulé | Type dessiné / simulé | Premier écart hors pilote, pas D/S | Après raccords |
|---|---:|---:|---|---|---|---|
| paysage | 1 | 19 | 362 / 362 | pilote / pilote | apparition (1233 / 1232) | identiques |
| paysage | 2 | 19 | 362 / 362 | pilote / pilote | ramassage (562 / 564) | identiques |
| paysage | 3 | 19 | 362 / 362 | pilote / pilote | kill (1988 / 1988) | identiques |
| paysage | 4 | 21 | 422 / 422 | pilote / pilote | armement (1762 / 1763) | identiques |
| paysage | 5 | 19 | 362 / 362 | pilote / pilote | apparition (1165 / 1165) | identiques |
| paysage | 6 | 23 | 482 / 482 | pilote / pilote | armement (1641 / 1640) | identiques |
| paysage | 7 | 23 | 482 / 482 | pilote / pilote | ramassage (759 / 762) | identiques |
| paysage | 8 | 21 | 422 / 422 | pilote / pilote | apparition (1165 / 1165) | identiques |
| paysage | 9 | 19 | 362 / 362 | pilote / pilote | kill (1988 / 1988) | identiques |
| paysage | 10 | 31 | 662 / 662 | pilote / pilote | armement (1644 / 1642) | identiques |
| portrait | 1 | 54 | 1172 / 1172 | pilote / pilote | kill (1988 / 1988) | identiques |
| portrait | 2 | 48 | 992 / 992 | pilote / pilote | ramassage (1340 / 1340) | identiques |
| portrait | 3 | 73 | 1663 / 1663 | apparition / apparition | apparition (1663 / 1663) | identiques |
| portrait | 4 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| portrait | 5 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| portrait | 6 | 40 | 932 / 932 | pilote / pilote | kill (1988 / 1988) | identiques |
| portrait | 7 | 31 | 662 / 662 | pilote / pilote | apparition (1165 / 1165) | identiques |
| portrait | 8 | 30 | 632 / 632 | pilote / pilote | armement (1613 / 1611) | identiques |
| portrait | 9 | 33 | 692 / 692 | pilote / pilote | kill (1988 / 1988) | identiques |
| portrait | 10 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 1 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 2 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 3 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 4 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 5 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 6 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 7 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 8 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 9 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |
| bureau | 10 | 26 | 568 / 568 | apparition / apparition | apparition (568 / 568) | identiques |

Isolation graine 7 paysage : le raccord caméra seul suffit sur cette fenêtre ; la version complète concorde. Les traces de la variante camera sont conservées.

Isolation complète sans rejouer les dessins validés : le raccord caméra seul passe **28/30** cas. Échecs restants : portrait, graine 9, entrée 336, pilote au pas 7440 contre 7440 (t=53.08708333944045 / 53.10125000600777 s) ; bureau, graine 10, entrée 384, ramassage au pas 8178 contre 8176 (t=59.170416672773435 / 59.16791667267409 s). Le seul ajout du raccord 50-fx dans la candidate complète les fait passer. Données et méthode de réemploi : [isolation-camera.json](isolation-camera.json).

## Méthode et portée de la preuve VM

Calibration préalable obligatoire : **10/10** parties de cinq pilotes, graines 1 et 2, sur les sources de `e1bdc6f` obtenues par git show. Temps de jeu, vague et score sont exactement ceux de tools/pilotes/sortie.json : [calibration.json](calibration.json). Sources triées comme build.mjs, même fermeture unique et Math natif V8 partagé ; localStorage vierge, jour 20261017, réglage actions, intro.skip, reset plongée, seul repli demarrage→plongee, pilote officiel, journal actif et amorçage horloge, puis tranches de 0,25 s. L'ancienne référence sert exclusivement à la calibration.

R-30 : pilote bon, graines 1–10, paysage 844×390 tactile, portrait 390×844 tactile et bureau 1440×900. __DT=1/60, fenêtre inchangée de **60 s de jeu**, avec arrêt naturel à fin. Vraie frame de 90-boot et vrai raster des sources dans le tampon Uint8Array de 10-gfx ; aucun faux draw substitué. Aucun DOM ni Canvas/CRT : les images de cinématique se replient sur les tracés procéduraux. Les indices, leur histogramme, leur empreinte et l'état final sont mesurés ; la simulation ne doit pas produire les mêmes pixels puisqu'elle ne dessine pas. Ce sont ses événements de jeu que l'on compare. Chaque comparaison stricte couvre [pas,t,type,données] ; les empreintes dans bilan.json portent cette même signature. Le seul champ d'enveloppe écarté est image, nécessairement différent sans dessin.

Les exclusions de type sont celles du critère reçu : perf, vue, sfx, bloc, section, geste ; puis hudBanniere et flash seulement entre modes. Aucun kill, apparition, ramassage ou pilote n'est filtré du verdict principal. Les bannières et flashs restent exigés entre deux dessins par le critère et par le banc navigateur. Sept témoins négatifs/positifs sont dans [controle-instrument.json](controle-instrument.json) : donnée altérée, kill absent, pas décalé et troncature refusés.

Contrôle supplémentaire à entrées appliquées identiques : [sondes.json](sondes.json), graine 7 paysage, 1 808 entrées publiques imposées dans les deux parcours sur la fenêtre de 15 s. Avant, le premier écart hors pilote est ramassage au pas 759 contre 761 (x=754,3577621516445 contre 755,3203629066048). Après, les journaux de jeu concordent. Ce contrôle évite de confondre même politique de pilote et mêmes entrées effectives après divergence. Le complément court ne remplace pas les trente fenêtres R-30 complètes.

Zéro erreur de jeu VM observée : maximum __ERR.count=0, consoles détaillées dans chaque reçu. La première version de la sonde a échoué sur un chemin de règle absent ; un autre processus est sorti 139 sans diagnostic. Ces essais n'ont fourni aucune conclusion. Leurs traces sont conservées dans sondes-erreurs.json ; le départ de la sonde a été remis au protocole calibré et toutes ses boucles bornées avant la mesure rapportée.

## Non-régression des 80 parties

**0/80 strictement identiques** avant/après sur l'état reçu, pas sur e1bdc6f. Protocole officiel des huit pilotes, graines 1–10, tranches de 0,25 s, borne 540 s de jeu et garde réelle ×4. Comparaison temps, vague, score, morts, cartes et SHA-256 du journal complet ; les 160 reçus sont conservés dans parties/. Détails : [parties80-assemble.json](parties80-assemble.json).

| Pilote | Mesurées | Inchangées |
|---|---:|---:|
| inerte | 10 | 0 |
| tourneur | 10 | 0 |
| maladroit | 10 | 0 |
| kamikaze | 10 | 0 |
| humain | 10 | 0 |
| bon | 10 | 0 |
| expert | 10 | 0 |
| dieu | 10 | 0 |

Arrêts avant fin : dieu 2 apres : borne à 540.1558333796039 s. Les bornes ne sont jamais prolongées pour convertir un échec.

Le résumé restreint [temps de jeu,vague,score] reste identique pour 10/80 cas ; cette identité partielle ne valide pas le journal ni le parcours.

Exemple humain, graine 1 : 386.2466667123818 s, vague 5, score 252220 avant ; 94.88833334150047 s, vague 3, score 31640 après. Les reçus bruts portent les valeurs non arrondies.

Les raccords corrigent précisément le parcours simulé : les trajectoires, apparitions et décisions qui en dépendaient peuvent donc changer. Ce résultat est un **échec du critère demandé**, pas une équivalence de remplacement. Garder les anciens reçus artificiellement exigerait de conserver un défaut de simulation ou de changer les règles dessinées pour l'imiter ; aucune telle modification n'est livrée. La cheffe d'orchestre doit traiter la révision des mesures dépendantes avant de valider le palier. Les deux critères « modes identiques » et « 80 anciennes simulations inchangées » ne sont pas simultanément démontrés par cette candidate.

Audit final des livrables : [verification-finale.json](verification-finale.json) — 160 reçus de parties et 30 paires R-30 relus, empreintes vérifiées, sources réservées intactes, patchs applicables et syntaxes valides. Aucun rejeu supplémentaire pour cet audit.

## Ce qui reste

Les patchs ne sont pas appliqués dans src ; la mission l'interdit. Le navigateur doit encore exécuter verifier.mjs hors bac : il sert les deux bundles avec les mêmes chemins d'actifs, n'ouvre qu'un Chromium muet, compare les trente couples, vérifie les vraies entrées par pas et le vrai tampon, conserve captures et journaux, et répète la graine 7 dessinée sur les trois profils. Il interdit les requêtes hors localhost. Commande en tête du rapport ; sortie attendue dans navigateur/resultats.json. **À vérifier**, aucune valeur navigateur p38 inventée. Safari iPhone réel reste également à vérifier.

Lot arrêté au constat de non-régression : diagnostic et patchs livrés ; palier non validé. Dépendances indispensables : revue/intégration par les propriétaires de 79-jeu et 50-fx, traitement des mesures rendues obsolètes, puis vérification navigateur hors bac.
