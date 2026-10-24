# codex-p1b — construction : passifs et armes de contrôle

18/10/2026 · 00 h 54 (Paris) — mis à jour à 00 h 54.

**Commande à lancer hors bac, après raccord du registre et reconstruction :**
`node proto-neon/tools/codex-p1b/verifier.mjs`

**Statut : code livré, chantier bloqué pour l'intégration et la validation navigateur.** Aucun commit. Le registre, la joueuse, le pilote et les ennemis ne sont pas modifiés. La reconstruction a rendu **0** ; reçu et empreintes dans [verification-sources.json](verification-sources.json).

## Ce qui est fait

- ONDE : quatre paliers, télégraphe ambre, impulsion répulsive, dégâts dégressifs, effacement des tirs au II, frein au III, aura au IV ; anneau os tramé admis par le vrai flashGate. Période issue des deux mesures de N.R.
- SILLAGE : dépôt à la queue, dégâts de contact, expiration, quatre paliers, frein puis mur anti-tirs ; 192 points au plus et effacement du passé après téléportation. Distinct de BRAISE et du LASSO déjà intégrés.
- PERFORATION : une cible supplémentaire par prise sur les tirs non explosifs ; chaque projectile garde ses cibles déjà traversées, ce qui évite de refrapper la même cible à chaque pas.
- SURTENSION : un saut et 15 % de portée en plus par prise. ÉPINES : contact corps/queue, jamais la tête, aucun dégât pendant TRAVERSÉE, aucune invulnérabilité ajoutée.
- Prérequis réels : PERFORATION après CANON II ou TOURELLES II ; SURTENSION après ARC I. Appels réciproques entre armes et passifs par les poids, sans nouvelle carte d'évolution à condition cachée. Les textes et métadonnées viennent de N.R ; toutes les nouvelles lignes tiennent dans la limite existante.
- Chaque nouveau réglage est regroupé avant le gel de N.R et justifié dans la section codex-p1b de demandes.md. Aucun point d'appel dans 70-joueuse.js n'est nécessaire.

## Méthode et mesures de logique

VM Node sans DOM, sources réelles dans l'ordre de build.mjs. Calibration sur e1bdc6f : **20/20** parties identiques (inerte et tourneur, graines 1–10), temps de jeu exact, vague et score ; [validation-vm.json](validation-vm.json). Le protocole de partie conserve localStorage vide, jour 20261017, plongée, pilote et simulation par tranches de 0,25 s. La VM reproduit les métadonnées d'amorçage, sans navigateur simulé.

**Premier essai de calibration échoué, corrigé :** inerte/graine 1 donnait 25,366666666665868 s contre 25,291666666665872 s de référence. La VM n'initialisait pas les dimensions de S.view ni les étapes d'amorçage avant le protocole. Après correction, les vingt comparaisons sont exactes. Aucun verdict issu du banc divergent n'est conservé.

**Portée conditionnelle :** [vm-registre-anticipe.json](vm-registre-anticipe.json) utilise [registre-attendu.mjs](registre-attendu.mjs) pour compléter uniquement les déclarations manquantes du socle en mémoire (identifiants, noms, sources, schéma mods). Ce n'est pas une intégration de ces changements aux sources. Aucun comportement d'ennemi, de jeu ou d'arsenal n'est remplacé par la fixture.

Scènes courtes à géométrie contrôlée, ennemis stationnaires ; le vrai hit calcule les PV et produit seul les kills. Avant = sources sauvegardées avant ce lot, après = code livré avec registre anticipé. Les journaux sont dans le reçu.

| Carte | Résultat avant → après |
|---|---|
| ONDE I | cible à 20 px : 0 → 4,25 PV retirés ; position y 270 → 286 (poussée 16 px) |
| SILLAGE I | cible à la queue : 0 → 18,75 PV retirés sur 1 s ; une larve tuée et journalisée |
| PERFORATION I | deuxième cible : 0 → 40 PV retirés ; première 60 → 60, troisième 0 → 0 |
| SURTENSION I | quatrième cible : 0 → 14 PV retirés ; les trois premières restent à 14 |
| ÉPINES I | cible au corps : 0 → 18 PV retirés sur 1 s ; une larve tuée et journalisée |

Premier essai PERFORATION inadéquat : les trois cibles perdaient chacune 182 PV avant comme après, le serpent de 24 segments avec amélioration portant déjà le CANON au RAYON. La scène finale impose 8 segments et CANON II, ce qui isole réellement le passif ; aucun seuil abaissé.

Endurances : pilote bon, graine 2975, god(true), au moins 60 s sur N.horloge.t(), tout le jeu actif. Avant/après dans le tableau ; chaque réception contient état, PV indirects par kills, score et journal complet. Les endurances validées ont été conservées pendant la dernière passe de libellés, de déclarations de mods initiaux et de contrôles du banc ; les mécaniques n'ont pas changé.

| Carte | Temps de jeu avant / après (s) | Kills avant / après | Score avant / après | Erreurs après |
|---|---:|---:|---:|---:|
| onde | 60.047 / 60.045 | 38 / 28 | 10590 / 1540 | 0 |
| sillage | 60.047 / 60.223 | 38 / 39 | 10590 / 10270 | 0 |
| perforation | 60.223 / 60.223 | 26 / 26 | 3640 / 3640 | 0 |
| surtension | 60.004 / 60.040 | 68 / 65 | 12360 / 14840 | 0 |
| epines | 60.047 / 60.245 | 38 / 43 | 10590 / 3090 | 0 |

Aucun événement perdu par le bus, aucune erreur VM/console dans ces dix parties. **Ce lot ne démontre aucun gain général de score ni d'équilibrage** : les valeurs inférieures restent publiées.

[limites-vm.json](limites-vm.json) : déplacements réellement mesurés avant/après frein : ONDE 0,4166667 → 0,25 px (rapport 0,6), SILLAGE 0,4166667 → 0,325 px (rapport 0,78) ; sillage plafonné à 192 points, retombe à 1 après saut, à 0 au reset. Pas d'accès privé à l'ennemi ajouté pour ces effets.

Contrôles supplémentaires : les cinq cartes ont été proposées au tirage ; prérequis refusés avant leur arme puis ouverts après ; schéma mods conforme dans le registre anticipé. ONDE II et SILLAGE IV laissent zéro tir de la scène ; conversion ONDE = **0 cellule**, car effacerTirs ne rend pas encore de reçu. ÉPINES en TRAVERSÉE = **0 dégât** ; le mur tue ; morsure conserve effet='coupe'.

## Ce qui reste, précisément

1. **Registre de production absent** : [vm-production.json](vm-production.json) rend conforme=false (sortie 1 attendue), cinq choix refusés et zéro effet nouveau, zéro erreur d'exécution. Le schéma mods signale les trois champs nouveaux comme non prévus. Les ajouts exacts à 03-socle.js sont demandés ; les cartes ne sont pas exposées au tirage avant enregistrement.
2. **Conversion ONDE** : 72-ennemis.effacerTirs doit rendre le nombre réellement effacé. Le code est prêt à convertir ce nombre à 35 %, par accumulation déterministe ; tant que l'API ne le rend pas, aucune cellule n'est fabriquée ni promise par le texte.
3. **Playwright non exécuté**, conformément au cadre du bac. Le script prêt à lancer sert le vrai bundle sur un port libre, ouvre un seul Chromium muet et traite successivement paysage tactile 844×390, portrait tactile 390×844, bureau 1440×900. Il mesure états, journaux, tampons, dépassements de palette, cyan par masque, luminosité sur une fenêtre d'une seconde, et épreuve du vrai flashGate avec sortie pixel. Les captures, trois profils et mesures de flashs restent **à vérifier** ; aucune réussite visuelle ni Safari revendiquée.
4. Le masque actuel de dbg.masque() est entièrement nul. Le script rend cyanHorsJoueuse=null et échoue au verdict, plutôt que produire un faux zéro. Son raccord est demandé au propriétaire.
5. Après ces raccords : reconstruire, lancer la commande en tête, relire les résultats et faire la revue prévue par la cheffe d'orchestre. Le frein agit sur les coordonnées publiques observées ; sa lisibilité et les choix d'équilibrage restent à juger sur iPhone.

Commandes VM rejouables :
`node proto-neon/tools/codex-p1b/valider-vm.mjs`
`node proto-neon/tools/codex-p1b/mesurer-vm.mjs --registre-attendu`
`node proto-neon/tools/codex-p1b/limites-vm.mjs`

La fixture de registre doit être retirée de la commande une fois les déclarations réellement intégrées ; ne pas mélanger ses résultats avec ceux du bundle final.
