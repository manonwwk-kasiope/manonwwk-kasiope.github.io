# codex-p18 — le score récompense la maîtrise

18/10/2026 03:04:31 (Paris), mis à jour à 18/10/2026 03:04:31.

**Commande hors bac :** `cd proto-neon && node tools/codex-p18/verifier.mjs`

**Palier VM validé ; qualification navigateur à vérifier hors bac.** Aucun commit ; changements laissés dans cette copie. Le script Playwright est prêt, contrôlé en syntaxe et par résolution de Playwright, sans serveur ni Chromium exécuté dans le bac.

## Ce qui est livré

Dans `77-score.js`, les points de combat et les défis reçus sont conservés. S'y ajoutent : prime de continuité sur cinq secondes (seul supplément au multiplicateur déjà payé), une base de cible par tranche de quinze secondes sans mort, plafonnée à quatre bases et payée uniquement sur kill ; prime de bout portant ou de proximité d'un mur, sans invulnérabilité ; complément du LASSO jusqu'à somme des bases tuées × nombre enfermé × multiplicateur final. Une fermeture sans mort ne crée pas de points répétés. Attendre ou activer une APOGÉE vide ne donne rien.

La chaîne publique de combat reste à 2,5 s, avec son multiplicateur, ses coupes et sa remise à zéro après mort. La continuité de cinq secondes est une prime distincte : elle évite de changer les effets de combat du défi historique et de p12. Les gains flottants agrègent les primes du même kill ; le HUD et l'écran de fin emploient toujours leurs interfaces existantes. Les nouvelles primes n'avancent pas la vie bonus : celle-ci reste déclenchée par le cumul des anciens points de combat. C'est nécessaire pour que le score ne change pas les parties. `stats.points` rend les nouvelles catégories consultables.

Les seuls nouveaux nombres sont ajoutés dans `N.R.score.maitrise` et justifiés dans la section codex-p18 de `refonte/lots/demandes.md`. Morsure-coupe, mur létal, palette, flashs, pilotes et critères n'ont pas changé. Les primes de p12 restent identiques sur les parties comparées.

## Rapports des scores médians — 50 graines par pilote

| État | Bon | Kamikaze | Tourneur | Bon / kamikaze (≥ 1,3) | Tourneur / bon (< 0,10) |
|---|---:|---:|---:|---:|---:|
| avant | 43 565 | 19 635 | 170 | 2,2187 | 0,0039 |
| apres | 73 610 | 22 090 | 255 | 3,3323 | 0,0035 |

Le constat p5 de 0,9995 appartient à l'ancien état cité dans la mission. La ligne avant ci-dessus est la mesure des sources effectivement reçues, après les lots intégrés. Aucune sélection de graines : 1 à 50, mêmes départs et actions.

## Sources des points — moyenne par partie sur les 50 graines

Ces moyennes s'additionnent ; les médianes par source, qui ne s'additionnent pas, sont également dans [bilan.json](bilan.json). Une base de kill appartient à une seule des catégories ordinaire/LASSO/APOGÉE ; le supplément du multiplicateur est présenté séparément. Le temps sans action vaut zéro ; la survie paie uniquement à la destruction d'une cible. Les cellules et noyaux incluent leur propre multiplicateur.

| Source | Avant bon | Avant kamikaze | Avant tourneur | Après bon | Après kamikaze | Après tourneur |
|---|---:|---:|---:|---:|---:|---:|
| Kills ordinaires : bases | 6 793,40 | 1 986,00 | 185,40 | 6 793,40 | 1 986,00 | 185,40 |
| Supplément du multiplicateur de combat | 12 873,60 | 2 446,00 | 36,00 | 12 873,60 | 2 446,00 | 36,00 |
| Défi historique (vie/surcharge conservées) | 3 500,00 | 3 500,00 | 100,00 | 3 500,00 | 3 500,00 | 100,00 |
| Défis de vague | 4 140,00 | 20,00 | 60,00 | 4 140,00 | 20,00 | 60,00 |
| Primes des objectifs p12 au bilan | 8 720,00 | 6 080,00 | 100,00 | 8 720,00 | 6 080,00 | 100,00 |
| LASSO : bases + complément du geste | 1 072,40 | 2,00 | 34,00 | 14 688,20 | 2,00 | 44,00 |
| APOGÉE : bases des kills | 583,40 | 34,40 | 0,00 | 583,40 | 34,40 | 0,00 |
| Temps seul / attente | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| Cellules (multiplicateur inclus) | 1 896,60 | 496,80 | 21,20 | 1 896,60 | 496,80 | 21,20 |
| Noyaux (multiplicateur inclus) | 724,00 | 0,00 | 0,00 | 724,00 | 0,00 | 0,00 |
| Vagues nettoyées | 7 580,00 | 900,00 | 20,00 | 7 580,00 | 900,00 | 20,00 |
| Prime de destruction CYCLOPE | 15 000,00 | 0,00 | 0,00 | 15 000,00 | 0,00 | 0,00 |
| Autres primes / compléments | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| Continuité des kills sur 5 s | 0,00 | 0,00 | 0,00 | 6 268,00 | 1 282,20 | 0,00 |
| Kills après survie sans mort | 0,00 | 0,00 | 0,00 | 20 150,40 | 577,80 | 4,00 |
| Kills à risque sans invulnérabilité | 0,00 | 0,00 | 0,00 | 3 482,20 | 788,80 | 159,00 |
| **Total moyen** | 62 883,40 | 15 465,20 | 556,60 | 106 399,80 | 18 114,00 | 729,60 |

Source : écritures réelles du score instrumentées dans une copie en mémoire de `ajouter`, contexte des événements publics, et primes p12 réellement inscrites au bilan. Chaque reçu doit reconstituer exactement son score final : **0 écart(s) d'attribution détecté(s)**. Aucun compteur d'appels ne tient lieu de points. L'élément de sonde `sonde-p18` ajouté uniquement à la copie retournée par dump transporte ces mesures ; il est exclu de toutes les comparaisons du vrai journal et n'est jamais émis dans le bus du jeu.

## Conservation des parties et validation de l'instrument

- VM historique : [validation-vm.json](validation-vm.json), dix parties exactement identiques sur `e1bdc6f` (huit pilotes graine 1 + bon/expert graine 2) : temps de jeu, combat, temps simulé, vague et score. Aucun DOM et aucun module de jeu remplacé. La variante avec objets standard hôtes a été revalidée sur les mêmes dix contrôles.
- Protocole de `tools/pilotes/parties.mjs`, via sa fonction commune `tools/reglage/protocole.mjs` : contexte et localStorage neufs, `S.jour=20261017`, actions auto pour humain uniquement, skip de l'ouverture, reset plongée, crochet plongée seulement si demarrage, pilote, journal, horloge avancée une fois, puis simulation par tranches de 0,25 s jusqu'à fin. Dieu seul reçoit god(true). Borne 540 s de jeu / 2160 s de simulation.
- **80/80 parties du lot obligatoire de 80** ont les mêmes temps de jeu/combat/simulation et vague. Sous-ensemble explicite : huit pilotes × graines 1 à 10.
- Vérification élargie sans rejouer ces reçus : **200/200 paires** à mêmes temps, vague, morts, cartes et événements kill/coupe/mort/LASSO/APOGÉE ; **200/200** mêmes objectifs p12 et mêmes primes. **200/200 journaux réels identiques en entier**, conservés dans les reçus gzip ; détails par paire dans bilan.json.
- Avant : **200** parties ; après : **200** parties. 0 partie(s) avec erreur, fin manquante ou attribution inexacte. [Avant](avant.json), [après](apres.json), [bilan et comparaison par graine](bilan.json).
- Huit scénarios ciblés sur les vraies sources : attente, continuité, survie/mort, LASSO non doublé, APOGÉE vide, purge, seuil de vie bonus, risque/invulnérabilité : [cas-cibles.json](cas-cibles.json).
- `cd proto-neon && node build.mjs` : sortie 0, [build.log](build.log). Empreinte du bundle : `639a042566c681076bafce005e0fd71ed3ac343151920f1dbf5a1a38510ad349`.
- [Contrôle de périmètre et des sources](verification-source.json) : seuls 77-score, ajouts de 02-regles, section propre de demandes et index généré ; sources avant/après conformes aux empreintes de leurs reçus, bundle contenant les sources finales.

| Pilote | Graines | Durée médiane avant (s de jeu) | Après |
|---|---:|---:|---:|
| bon | 50 | 216,30 | 216,30 |
| kamikaze | 50 | 58,03 | 58,03 |
| tourneur | 50 | 19,27 | 19,27 |

## Limites et reste à faire

La VM mesure la logique, les états, les événements et les points ; elle ne qualifie ni les pixels ni Safari. Le script [verifier.mjs](verifier.mjs) lance un unique Chromium muet et ferme chaque contexte avant le suivant : iPhone 13 paysage 844 × 390 tactile, portrait 390 × 844 tactile, bureau 1440 × 900. Il attend un vrai multiplicateur >1 dans une partie bon/graine 2, recherche le motif complet du texte attendu dans le tampon du vrai HUD, puis vérifie l'état fin, la valeur SCORE et ses pixels. Il conserve tampons, captures, journaux et `window.__ERR` ; aucune réussite navigateur n'est annoncée ici.

**Reste : exécuter cette commande hors bac et relire les captures. Qualification finale navigateur bloquée par les limites établies du bac (listen/Chromium indisponibles), pas par une autorisation manquante.** Une émulation Chromium ne remplace pas une vérification Safari physique sur iPhone.
