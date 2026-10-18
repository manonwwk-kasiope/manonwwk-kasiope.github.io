Commande hors bac : `cd proto-neon && node tools/codex-p14/verifier.mjs` (ne pas lancer dans cette sandbox).

# codex-p14 — LASSO et APOGÉE

18/10/2026 02:56:40 (Paris), mis à jour à 18/10/2026 02:56:40.

**Lot arrêté au budget de quatre variantes ; R-34 non validé, cible LASSO expert non atteinte.** Candidate 2 retenue : amélioration réelle de l'usage en partie ; les retours sur traînée des variantes 3/4 font moins bien sur les longs LASSO humains et la médiane de l'expert. Aucun seuil d'acceptation abaissé. Le chantier global n'est pas annoncé achevé. La VM valide la logique ; navigateur, pixels et Safari restent à vérifier hors bac.

## Livré

`src/85-pilote.js` : humain/bon/expert choisissent une boucle latérale traçable, gardent son centre fixe, dimensionnent son rayon entre corps et traînée, anticipent leur délai de réaction et achèvent le geste même si sa cible initiale meurt. La prédiction de morsure tient compte du déplacement du corps vers la queue. TRAVERSÉE est demandée par une impulsion du second doigt face au danger ; l'APOGÉE pleine est utilisée avec des cibles accessibles. L'humain garde 120 ms et le bruit uniforme ±10° toutes les 0,25 s, plus ACTIONS AUTO du protocole ; il peut maintenant demander ces actions comme une joueuse. L'expert garde 50 ms. Le pilote n'écrit que S.input : aucune charge, aucun kill, aucun LASSO imposé, aucun champ privé lu.

`src/02-regles.js` : seul ajout pilotageLasso, chiffres et raisons dans la section codex-p14 de `refonte/lots/demandes.md`. Toutes les anciennes règles N.R et tous les seuils d'acceptation sont inchangés. `70-joueuse.js` reste identique à l'état reçu : aucun correctif de détection démontré nécessaire, donc aucun raccord-joueuse.patch produit. `index.html` reconstruit, build sortie 0 ([journal](build.log)). Aucun commit.

## Cause établie, fichier:ligne

La vraie référence est [REFONTE.md:535](../../REFONTE.md#212-le-lasso-verbe-central) : le chemin doit se fermer sur la queue ou sur une traînée encore allumée. La morsure qui coupe, explicitement imposée par la propriétaire et N.R, prévaut sur l'ancienne phrase « donc une mort » de cette section.

- Ancien pilote : [avant-src/85-pilote.js:173](avant-src/85-pilote.js), groupe d'au moins quatre et rayon minimal de 26 px ; au début, 2π×26 = 163,36 px, alors que corps + traînée = 8×5 + 68×1,36 = 132,48 px. Ce cercle ne rentre pas dans la fenêtre. Le rayon expert calculé à cette longueur reste sous son plancher de 20 px ; il ne tente donc pas cette boucle. Sources : lignes 171–181 de l'instantané et N.R.longueur/traine/vitesse.
- Ancien pilote : [avant-src/85-pilote.js:192](avant-src/85-pilote.js), somme absolue des virages de la tête ; ligne 194, centre recalculé depuis des ennemis mobiles. Tourner de 2π ne garantit pas le retour sur la trace. La graine humaine 1 finit deux essais par « boucle » avec des distances au départ de **81,76 et 81,29 px** et des périmètres visés de **519,40 et 467,36 px** pour des fenêtres de **138,84 et 145,20 px**. Ce ne sont pas des boucles fermées manquées par le détecteur. [Trace réelle](diagnostic-avant.json), sans changement des entrées.
- Ancien pilote : [avant-src/85-pilote.js:82](avant-src/85-pilote.js), corps traité comme obstacle statique sur 0,7 s ; ligne 198, abandon au danger prédit. Cette prédiction ne retire pas les segments qui auront quitté le corps pendant cet horizon. La candidate utilise le déplacement public des segments et une prévision courbe : [85-pilote.js:232](../../src/85-pilote.js).
- Détecteur : [70-joueuse.js:578](../../src/70-joueuse.js), derniers segments et traînée ; âge minimal, tolérances puis aire minimale, [ligne 603](../../src/70-joueuse.js). L'indice TT décalé de m mesure une approximation de l'âge depuis le passage de la queue à vitesse constante ; le remplacer par l'âge depuis le passage de la tête raccourcirait la fenêtre. Les fixtures ci-dessous ne montrent aucun raté de boucle conforme. Aucune généralisation à tous les boosts, coupes ou changements de vitesse.

## Détection, puis geste : deux bancs séparés

Calibration [validation-vm.json](validation-vm.json) : **10/10 références e1bdc6f identiques**, temps de jeu, vague, score, combat et simulation. L'écart avec cette ancienne version ne sert jamais de comparaison du lot : avant/après utilisent l'instantané reçu e47f22f, conservé dans sources-avant.json.gz.

Cas construits [avant](cas-avant.json) / [après](cas-apres.json) : 38 cas par état. Cercles parfaits et carrés sur cible fixe puis mobile, longueurs 8/20/40. Les fermetures à 0/1/3/6 px affectent réellement la cible et produisent un événement LASSO : **30 avant, 30 après**. Les six cas à 10 px et les deux témoins (aire trop petite ; périmètre hors fenêtre) restent sans dégâts ni LASSO : **8/8 avant, 8/8 après**. Zéro erreur. force() ne sert qu'à la fixture géométrique, jamais au pilote.

Geste via les vraies entrées du pilote, groupe contrôlé de quatre larves, vingt graines par case ; cible fixe ou mouvement prescrit dans la boucle. Pas de mise à jour de l'arsenal dans ce banc isolé : il teste le tracé, pas la survie face à une vraie formation. Succès = dégâts réels et événement LASSO. Traces/journaux complets dans gestes-avant.json.gz et gestes-apres.json.gz ; résumés JSON homonymes.

| Pilote | Longueur | Cible | Avant | Après |
|---|---:|---|---:|---:|
| humain | 8 | fixe | 0/20 | 20/20 |
| humain | 8 | mobile | 0/20 | 20/20 |
| humain | 20 | fixe | 20/20 | 20/20 |
| humain | 20 | mobile | 20/20 | 20/20 |
| humain | 40 | fixe | 7/20 | 20/20 |
| humain | 40 | mobile | 15/20 | 20/20 |
| expert | 8 | fixe | 0/20 | 20/20 |
| expert | 8 | mobile | 0/20 | 20/20 |
| expert | 20 | fixe | 20/20 | 20/20 |
| expert | 20 | mobile | 20/20 | 20/20 |
| expert | 40 | fixe | 0/20 | 20/20 |
| expert | 40 | mobile | 20/20 | 20/20 |

## Parties complètes : mêmes vingt graines 1–20

Protocole exact de tools/pilotes/parties.mjs : contexte vierge, localStorage vide, jour 20261017, actions auto pour humain et doigts pour expert, plongée, horloge initialisée une fois puis simulation officielle par 0,25 s jusqu'à fin. Aucun interlude sauté. Borne inchangée de 540 s de jeu. Réussite = vrai LASSO affectant au moins un ennemi dans la fenêtre lassoTente→lassoFin ; un cercle vide reste un échec. [Avant](avant.json), [final](final.json), reçus complets compressés dans recus/.

| Pilote | Segments | Avant : réussis/tentés | Après : réussis/tentés |
|---|---|---:|---:|
| humain | 8-20 | 0/277 (0,00 %) | 6/63 (9,52 %) |
| humain | 21-29 | 5/156 (3,21 %) | 15/95 (15,79 %) |
| humain | 30-40 | 3/154 (1,95 %) | 38/182 (20,88 %) |
| expert | 8-20 | 0/121 (0,00 %) | 18/129 (13,95 %) |
| expert | 21-29 | 1/40 (2,50 %) | 29/120 (24,17 %) |
| expert | 30-40 | 1/37 (2,70 %) | 51/266 (19,17 %) |

Humain : seuil court ≥50 %, long ≥40 % : **échecs conservés**. Cadence par minute : court 0,00→0,18, long 0,14→1,43 ; rapport final 7,95 pour ≥0,8. Le taux avant court nul interdit un rapport avant significatif. Le critère officiel compte aussi les tentatives sous huit segments dans « jusqu'à vingt » : 0/277 (0,00 %)→6/63 (9,52 %), échec également ; aucune tentative hors tranche n'est transformée en succès.

Expert, **médianes du critère R-04**, et non moyennes : LASSO **0,00→7,50**, cible ≥10 : **non atteinte** ; APOGÉE **0,00→5,00**, cible ≥2 : **atteinte sur ce lot exploratoire**. Moyennes LASSO 0,45→7,30, APOGÉE 1,00→4,65. Résultats graine par graine dans final.json. Cela ne valide pas le reste de R-04.

Un cas réel distingue fermeture et capture : dans la première tentative humaine finale, graine 1, la tête revient à **6,31 px** du départ et le nombre de fermetures du module augmente de un, sans événement LASSO affectant un ennemi. La cible 27 reste vivante (20→10 PV) et passe de (405,99 ; 144,45) à (368,13 ; 151,61) pendant le geste. Le tracé et les états sont dans [diagnostic-apres.json](diagnostic-apres.json) ; temps et score sont identiques au reçu non instrumenté. Ce cas ne donne pas une proportion des causes sur les vingt graines.

## Variantes et contrôle de la candidate

| Variante | Humain court | Humain long | Expert LASSO médiane | Expert APOGÉE médiane |
|---|---:|---:|---:|---:|
| 1 | 3/90 (3,33 %) | 6/126 (4,76 %) | 2,50 | 2,50 |
| 2 | 6/63 (9,52 %) | 38/182 (20,88 %) | 7,50 | 5,00 |
| 3 | 13/138 (9,42 %) | 16/158 (10,13 %) | 5,00 | 6,00 |
| 4 | 17/139 (12,23 %) | 24/195 (12,31 %) | 5,00 | 5,50 |

1 : cercle latéral fixe et anticipation du retard. 2 : finir le geste malgré les tirs alliés et employer TRAVERSÉE/ancien réglage auto avec soutien manuel ; candidate retenue. 3 : retour vers une traînée mémorisée, rejeté. 4 : suivi de la courbe prévue, sortie au-delà de la fermeture et contrôle de morsure, rejeté. Leurs politiques sont archivées dans pilote-passe1.js à pilote-passe4.js, leurs configurations dans configurations-variantes.json. Chaque série compile un instantané immuable ; les éditions de la variante suivante ne changent pas son exécution. Les champs de configuration inutilisés des essais sont retirés de la candidate finale. Aucune cinquième variante.

Contrôle final sur les fichiers réellement écrits : **40/40 identiques à la candidate 2 jusqu'au journal complet**. Les six séries principales font 240/240 fins, 0 erreur de jeu/console VM ; ce ne sont pas 240 parties indépendantes. Régression des cinq politiques non modifiées, deux graines chacune : **10/10 avant/après identiques**, journal compris ([preuve](regression.json)). Bon : cinq graines appariées avant/après, **5/5 finies sans erreur** ([preuve](bon.json)). Aucun maintien des 80 anciennes parties n'est prétendu.

[Contrôle de source](controle-source.json) : N.R en ajout seul, joueuse intacte, aucune lecture privée/interdite, bruit et réaction conservés. Bundle SHA-256 : `c06e92ad63326371c9057ce6cc6c9051bc41e876885380697b06343a11d831ab`. Source SHA-256 : `1b7ff15c7b45b7feb99c4c0ebdfe2a5c85984f43faf29b911b6f0c6bce9f8c40`.

## Ce qui reste

**R-34 reste à résoudre en partie complète**, ainsi que la médiane de dix LASSO de l'expert. Les cercles isolés réussis ne prouvent pas que les formations réelles resteront dedans jusqu'à la fermeture. Les abandons face aux menaces, le déplacement des cibles et les destructions pendant le tour restent les limites de cette politique ; leurs causes respectives ne sont pas quantifiées sur vingt graines. Les essais 3/4 ne constituent pas une solution livrée. Un nouveau lot doit partir de ces reçus et préciser une nouvelle hypothèse structurelle, sans continuer à régler des chiffres de fermeture.

**Navigateur en attente de la cheffe** : verifier.mjs complet, import Playwright vérifié et syntaxe contrôlée ; aucun listen, aucun Chromium lancé ici. Le script sert l'avant et le bundle final sur port libre, un Chromium --mute-audio, profils 844×390 tactile, 390×844 et 1440×900 en série ; cas géométriques, parties humain/bon/expert, état/journal/dégâts, vrais indices du tampon, histogrammes, PNG et erreurs. Il refuse un bundle périmé ou un module tiers modifié depuis l'instantané. Résultats attendus dans playwright/resultats.json. Les pixels, l'ergonomie Safari, le budget de flash réel et le verdict des critères officiels restent **à vérifier** ; aucune mesure de navigateur inventée.
