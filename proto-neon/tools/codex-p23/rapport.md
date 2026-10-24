# codex-p23 — mouvement réduit et lumière du décor

18/10/2026 · 03 h 45 (Paris) — publication ; mis à jour à 03 h 45.

**Commande hors bac, depuis la racine du dépôt :**
`node proto-neon/tools/codex-p23/verifier.mjs`

**Livraison dans le périmètre autorisé ; chantier bloqué pour le verdict navigateur et la gaine du CYCLOPE hors fichiers possédés.** Aucun serveur local ni Chromium n'a été lancé ou essayé. Aucun commit. Les résultats ci-dessous sont les vrais états, journaux et pixels d'une VM sans DOM ; ils ne qualifient ni Safari réel, ni le CRT, ni les médias décodés, ni le coût d'image sur iPhone.

## Correction livrée

- `50-fx.js` : l'âge d'explosion tenait à dt=0 mais son allumage `eIgn` avançait à chaque mise à jour. Il tient désormais aussi pendant le gel en mouvement réduit. Le limiteur p10 et les effets en mouvement normal gardent leur comportement. La préférence système est relue et annule la secousse, même si son réglage manuel était à 1.
- `12-cam.js` : une poussée déjà engagée est annulée si mouvement réduit ou secousse zéro est activé. Le suivi nécessaire au jeu et les murs continuent à fonctionner.
- `15-decor.js` : un contre-jour froid acier éclaire les matières sombres du lointain par un Bayer fixe dans l'espace écran. Ni vide, ni nuit profonde ne sont comblés ; le sol ne reçoit pas cet éclairage. Ajout seul dans N.R : `decorContrejour.rangs=4`, `rangsPortrait=8`, `encre='acier'`. Justification dans la section codex-p23 de demandes.md.
- R-28 exige maintenant un kill réel au journal et frappe la cible au centre du tampon. R-11 conserve l'image ambiante pour la lumière et mesure une vraie flèche ajoutée si cette image n'a aucune menace. Seuls x/y publics sont repositionnés ; aucun champ privé n'est lu ni écrit. Tous les seuils sont conservés.

## Instrument et provenance

[calibration.json](calibration.json) : **10/10 parties e1bdc6f identiques**, temps de jeu/combat, vague, score, arrêt, erreurs et SHA-256 du journal complet, sans arrondi. La VM utilise `vm.createContext(vm.constants.DONT_CONTEXTIFY)`, les sources réelles dans l'ordre lexicographique du build et aucun DOM. Ce mode a été recalibré avant les résultats retenus. Les profils VM représentent les trois dimensions du tampon ; les entrées sans DOM gardent le repli tactile du banc p10. Le vrai profil bureau/clavier est réservé au script navigateur.

L'état reçu est conservé dans [avant/sources.json](avant/sources.json) et [avant/index.html](avant/index.html). Le bundle reçu contient exactement toutes ces sources (vérifié). La référence historique ne sert qu'à calibrer : la non-régression se juge sur l'état reçu.

Empreinte des sources finales ordonnées : `35f77e0ee1ffaa42609caa2faa12ab1734164d6bc757f19e3ee535803594f8ff`.
Empreinte du bundle final : `f118dcf261fb9814b49849b17ce6f2ea7290dc1d046ef6ff15c50e3f6d1899ec`.
Empreinte des sources du reçu après : `35f77e0ee1ffaa42609caa2faa12ab1734164d6bc757f19e3ee535803594f8ff` ; parties après : `35f77e0ee1ffaa42609caa2faa12ab1734164d6bc757f19e3ee535803594f8ff`.

## R-28, images gelées réellement consécutives

[r28-cases.json](r28-cases.json), même fonction sonde VM/navigateur, mort de l'élite confirmée au journal. Préférence réduite active dès le chargement ; une cible est créée après la chauffe puis frappée au centre. Le gel doit offrir une paire consécutive, sinon l'essai échoue. Plafond inchangé **0,5 %**, secousse zéro, caméra ≤ 0,5 px entre deux images gelées.

| Profil | Avant, pixels changés % | Après % | Paires gelées après | Erreurs après |
|---|---:|---:|---:|---:|
| paysage | 6,415 | 0,000 | 6 | 0 |
| portrait | 10,108 | 0,000 | 4 | 0 |
| bureau | 6,672 | 0,000 | 5 | 0 |

Le cas historique reçu (batterie 8f55a91) était à 23,974 %. Il n'est pas présenté comme notre avant : le bundle et la fixture ont évolué. Le cas conservant l'ancien placement hors champ est aussi publié dans mesures-avant/apres.json ; le cas dirigé ci-dessus a une cible et un kill identifiés.

[parties-reduit.json](parties-reduit.json) : 2/2 parties dieu finies avec victoire réelle (N.score.resume().victoire, reçu complet conservé), mouvement réduit dès le chargement. Détails : graine 1 : fin, 416.84000004608504 s, victoire true, erreurs 0 ; graine 2 : fin, 451.07083337953645 s, victoire true, erreurs 0. Borne officielle 540 s inchangée. Seuil satisfait en VM.

[cas-construits.json](cas-construits.json) : une poussée de 6 px engagée disparaît exactement lors de l'activation du mouvement réduit ; S.shake reste à zéro malgré le réglage FX manuel à 1. La position avant/après et les erreurs sont publiées, pas un compteur d'appels.

## R-11, décor seul lumineux code 8 / tampon complet

[mesures-avant.json](mesures-avant.json), [mesures-apres.json](mesures-apres.json) : même graine, même ordre de scènes, trois vraies images par scène. Luminance > 0,10, cible **18 à 28 %** inchangée.

| Profil | Scène | Avant % | Après % |
|---|---|---:|---:|
| paysage | calme | 11,943 | 21,971 |
| paysage | montee | 11,944 | 22,071 |
| paysage | chaos | 11,658 | 21,729 |
| paysage | colosse | 12,119 | 19,711 |
| portrait | calme | 8,236 | 20,554 |
| portrait | montee | 8,160 | 20,708 |
| portrait | chaos | 8,158 | 20,530 |
| portrait | colosse | 7,917 | 18,537 |
| bureau | calme | 12,338 | 21,015 |
| bureau | montee | 12,348 | 19,984 |
| bureau | chaos | 12,188 | 19,773 |
| bureau | colosse | 12,205 | 21,953 |

[lumiere-cases.json](lumiere-cases.json) contient aussi les douze scènes indépendantes sur contexte neuf (même méthode que le vérifieur navigateur) : toutes dans la cible. Leurs valeurs ne sont pas mélangées avec le tableau séquentiel ci-dessus. Les tampons PNG tampon-vm-*.png sont issus du repli procédural de cette VM ; ce ne sont pas des captures navigateur.

**Pas de contradiction constatée entre lumière R-11 et sol 01b.** R-11 compte les pixels lumineux de tout le décor, alors que 01b borne à 8 % la part du sol de luminance > 0,25. Ici le contre-jour est au-dessus de l'horizon ; sur les 315 relevés après, sol lumineux max **0,387 %**, sol chaud max **0,000 %**, plafonds respectifs 8 % et 3 %. Aucun seuil n'a été déplacé.

**Gaine : R-11 non validé dans son ensemble.** Sur les scènes ambiantes séquentielles reçues, colosse : paysage 789/945 = 83,492 %, portrait 209/3066 = 6,817 %, bureau 335/603 = 55,556 %. Les valeurs après sont dans le reçu ; l'éclairage du fond ne répare pas les contours des acteurs. Dans les douze cas indépendants, la vraie flèche dirigée atteint 35/35 en calme/montée/chaos sur les trois profils ; le colosse reste en échec. Demande aux propriétaires de 72-ennemis/73-colosse/40-sprites écrite dans demandes.md, sans modifier leurs fichiers. Un bord de masque peut aussi être créé par une occultation : ces mesures ne prouvent pas seules que tous les défauts viennent du sprite.

## Conservation lisibilité et photosensibilité

Banc 01b repris : sept scènes × trois profils, quinze relevés dans drawFront à 2, 4…30 secondes de combat, soit **315 avant et 315 après**. Sol chaud ≤ 3 %, sol lumineux ≤ 8 %, ciel lumineux ≥ 12 % (8 % dans l'éclipse), ciel chaud ≤ 12 %, aucun cyan décoratif. **21/21 cas après satisfaits** ; les résultats avant et chaque relevé restent publiés. Cette reprise VM vérifie les seuils chromatiques, pas les coûts navigateur ni l'identité du ciel : l'ambiance du ciel change volontairement.

Contrôle p13 inchangé : 600 images par cas, charge/boss3/mort-cyclope sur trois profils, compteur de transitions p10, fenêtre glissante d'une seconde, seuil d'aire > 6,6 %, plafond **3 flashs/s**. Le vrai kill du CYCLOPE est vérifié au journal par la sonde existante. **9/9 cas après satisfaits**.

| Profil | Scène | Avant, pire /s | Après, pire /s | Sol chaud max % | Sol L > 0,25 max % |
|---|---|---:|---:|---:|---:|
| paysage | charge | 0 | 0 | 0,000 | 0,278 |
| paysage | boss3 | 0 | 0 | 0,000 | 0,278 |
| paysage | mort-cyclope | 2 | 2 | 0,000 | 0,408 |
| portrait | charge | 2 | 2 | 0,000 | 0,494 |
| portrait | boss3 | 0 | 0 | 0,000 | 0,000 |
| portrait | mort-cyclope | 1 | 2 | 0,000 | 0,000 |
| bureau | charge | 1 | 1 | 0,000 | 0,266 |
| bureau | boss3 | 0 | 0 | 0,000 | 0,257 |
| bureau | mort-cyclope | 2 | 2 | 0,000 | 0,316 |

Le vérifieur hors bac relance également les vrais outils navigateur 01b et p13, en série, avant/après. Pour 01b, `--ambiance-a` retire uniquement l'exigence d'empreinte de ciel identique ; les seuils chromatiques, les empreintes publiées et le contrôle de performance sont conservés. Une nouvelle lumière du ciel rendait cette égalité inapplicable ; aucune égalité n'est annoncée ici.

## 80 parties avant/après sur l'état reçu

[parties-avant.json](parties-avant.json), [parties-apres.json](parties-apres.json) : **80/80 identiques** (0 divergences). Huit pilotes, graines 1 à 10. Temps jeu/combat, vague, score, arrêt, erreurs console et journal complet par SHA-256 strictement comparés, sans arrondi ni filtrage. Stockage vierge, S.jour=20261017, actions, intro.skip, reset départ plongée, seul démarrage initial contourné si nécessaire, pilote officiel, journal, amorçage horloge puis tranches officielles de 0,25 s jusqu'à fin ou borne. Les bornes et arrêts du protocole officiel sont conservés.

## Essais non retenus et limites

Premier contre-jour à quatre rangs partout : paysage dans la cible mais portrait **14,31 à 15,21 %**, échec conservé dans [essai-contrejour-4-mesures-apres.json](essai-contrejour-4-mesures-apres.json). La passe est arrêtée à cette insuffisance ; aucun 18 % n'a été inventé. La passe finale utilise huit rangs seulement en portrait.

L'indicateur initial de victoire cherchait un événement de fin/phase absent de ces reçus ; il rendait false malgré l'état fin. Il a été corrigé pour lire N.score.resume().victoire, sans changer ni le jeu ni la borne. Les deux parties corrigées publient le résumé officiel complet.

La première construction de gaine avec `direct:true` restait hors champ ; `ext:true` soustrait l'objet au dessin ordinaire et était inadapté. Ces essais n'ont pas fourni de réussite retenue. La construction finale utilise le spawn ordinaire puis seulement les coordonnées publiques. Les sources hors périmètre ne sont pas corrigées.

## Vérification, reprise et dépendances

`cd proto-neon && node build.mjs` : **sortie 0**, journal build.log. Syntaxe des scripts, résolution de Playwright sans lancement, git diff --check : sortie 0. Les règles du mur et de morsure n'ont pas changé. Chaque pixel mesuré reste dans la palette ; aucune couleur littérale ni source de hasard n'est ajoutée.

Commandes VM :
`node proto-neon/tools/codex-p23/calibrer.mjs`
`node proto-neon/tools/codex-p23/mesurer-vm.mjs --avant`
`node proto-neon/tools/codex-p23/mesurer-vm.mjs`
`node proto-neon/tools/codex-p23/r28-cases-vm.mjs`
`node proto-neon/tools/codex-p23/lumiere-cases-vm.mjs`
`node proto-neon/tools/codex-p23/reduit-parties-vm.mjs`
`node proto-neon/tools/codex-p23/parties-vm.mjs --avant`
`node proto-neon/tools/codex-p23/parties-vm.mjs`

Le script hors bac en tête sert le bon bundle avant/après sur un port libre ; un seul Chromium --mute-audio à la fois, iPhone 13 tactile 844×390, 390×844 et bureau 1440×900. Il conserve états, journaux, pixels et captures, puis relance 01b, p13 et les critères R-28/R-11 complets. **Prêt, non exécuté ici.** La comparaison SNAKE 2030 et les médianes de partie sont du ressort du critère navigateur complet, pas prétendues issues de cette VM.

Reste indispensable : reçus de la cheffe d'orchestre hors bac, résolution de la gaine par ses propriétaires, puis Safari réel et coût iPhone. Retour arrière : inverser uniquement les diffs codex-p23 des quatre sources et des deux critères, retirer sa section de demandes, puis reconstruire. avant/sources.json sert de référence ; ne pas rétablir ces fichiers en bloc après intégration d’autres lots.
