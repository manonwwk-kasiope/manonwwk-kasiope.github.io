# codex-01 — lisibilité : livraison pour arbitrage

17/10/2026 · 23 h 54 (Paris)

**Lot arrêté pour arbitrage Claude : correction et preuves livrées, palier non validé.** Les plafonds de 3 % d’encres chaudes et de 8 % de pixels de luminance > 0,25 échouent sur le rectangle complet du plateau. Le minimum de 25 % de ciel lumineux échoue aussi. Aucun seuil n’a été abaissé. La question est publiée sous l’ordre 1 de `COORDINATION.md`.

## Périmètre de la correction

Seul `src/15-decor.js` est modifié parmi les sources. Dans les six états `jeu`, `nettoyage`, `alerte`, `boss`, `reapparition`, `mort` :

- P5 (structures et effets associés : flammes, trains de lumière, projecteurs) et P6 (poutrelles et braises) passent par une table nuit/ardoise ; jaune, ambre, os et acier deviennent ardoise ; brasier devient nuit. Les fonds violet/indigo/sang deviennent nuit. Palette inchangée, sans alpha.
- Après composition du lointain et des transitions de quartier, une passe borne le remappage du sol à l’intersection du plateau courant avec la zone écran sous l’horizon. Elle précède les murs, la grille et les acteurs ; ces éléments gardent leurs couleurs.
- Le ciel, le soleil et la cité au-dessus de l’horizon gardent leurs tables d’origine. P5 et P6, y compris lorsqu’ils croisent le ciel, deviennent sombres en jeu.
- Hors jeu, les chemins existants sont conservés. Les empreintes du décor seul pour ouverture, titre, VOL, victoire et cartes restent identiques avant/après dans chacun des neuf cas (45 comparaisons d’empreintes FNV-1a ; contrôle du décor, pas une navigation complète de ces écrans).

## Mesures avant / après

Sources : [avant.json](avant.json), [apres.json](apres.json), obtenus avec [banc.mjs](banc.mjs). Pourcentages comptés dans le tampon indexé `N.gfx.buf()`, décor seul, après cinq secondes de jeu. La graine, la caméra, le temps, les histogrammes de palette et les rectangles sont conservés dans les reçus. Les deux bundles sont figés au début de chaque exécution et identifiés par SHA-256. Le bundle AVANT vient de l’état `1e29895`, avant la modification de `15-decor.js`.

| Profil | Vague | Chauds % (≤ 3) | Plateau L > 0,25 % (≤ 8) | Ciel L > 0,10 % (≥ 25) | Image p95 ms |
|---|---:|---:|---:|---:|---:|
| paysage | 2 | 28,62 → 12,82 | 28,77 → 12,83 | 22,20 → 21,94 | 0,80 → 0,80 |
| paysage | 4 | 28,42 → 9,58 | 28,43 → 9,59 | 17,24 → 16,61 | 0,90 → 0,90 |
| paysage | 5 | 30,41 → 12,22 | 30,42 → 12,23 | 21,60 → 21,55 | 0,80 → 0,80 |
| portrait | 2 | 19,29 → 8,17 | 19,33 → 8,18 | 14,16 → 14,09 | 0,80 → 0,80 |
| portrait | 4 | 22,28 → 8,64 | 22,30 → 8,64 | 17,02 → 15,39 | 0,90 → 0,90 |
| portrait | 5 | 25,58 → 12,52 | 25,59 → 12,53 | 20,82 → 20,76 | 0,80 → 1,00 |
| bureau | 2 | 29,30 → 14,53 | 29,42 → 14,54 | 25,01 → 24,79 | 3,20 → 3,30 |
| bureau | 4 | 27,03 → 9,21 | 27,05 → 9,22 | 16,41 → 15,72 | 3,30 → 3,30 |
| bureau | 5 | 29,83 → 12,73 | 29,84 → 12,74 | 21,89 → 21,85 | 3,30 → 3,30 |

**Sous l’horizon, dans le plateau : 0 % de pixels chauds et 0 % de pixels L > 0,25 dans les neuf cas APRÈS** (`sousHorizon` des reçus). C’est un diagnostic complémentaire : il ne remplace pas les seuils sur le plateau entier.

Les neuf cas ont `window.__ERR.count === 0` et aucune erreur console/page remontée. Sur le profil paysage, le delta p95 est inférieur ou égal à +0,5 ms dans chaque vague (`deltaP95` et `seuils.performance`). Mesure sur ce Mac dans Chromium avec émulation iPhone : ce n’est pas une mesure matérielle sur un iPhone ni sous Safari.

## Pourquoi le palier ne peut pas être déclaré validé

Le rectangle N.world/N.cam contient aussi la partie supérieure du décor. Exemple paysage V2 : tampon et plateau de 422 × 195, horizon à y=114. Exiger 25 % de pixels lumineux dans ces 114 lignes impose au moins 14,62 % du plateau lumineux. Or les encres lumineuses autorisées au décor lointain (ambre, jaune, brasier, os, acier) sont toutes de luminance > 0,25 ; le plafond de 8 % devient incompatible avec ce minimum. Utiliser du magenta/cyan pour contourner cette contradiction violerait les encres réservées aux acteurs.

Par ailleurs, la luminosité minimale du ciel échoue déjà AVANT dans huit des neuf cas : ce défaut de référence n’est pas créé par cette correction. Assombrir P5/P6 retire encore une petite part lumineuse au ciel, comme l’exige leur hiérarchie visuelle.

**Décision attendue de Claude :** préciser la région des plafonds (par exemple sous l’horizon, si c’est bien la région visée), ou changer explicitement l’intention du lointain derrière les acteurs. Sans cet arbitrage, étendre l’extinction à la cité/le soleil résoudrait les plafonds mais contredirait l’ordre de conserver leur lumière. Ne pas valider ni retoucher les seuils implicitement.

## Reproduction et vérifications

`node build.mjs` depuis `proto-neon/` : sortie 0, syntaxe du bundle validée. `node --check tools/lisibilite/banc.mjs` et `git diff --check` passent.

Le banc requiert le Playwright déjà disponible dans ce dépôt. Profils explicitement forcés à 844 × 390, 390 × 844 et 1440 × 900 (les tailles du descripteur Playwright seul ne sont pas utilisées). Graine 2975, dt=1/60, 301 images réelles de `frame()`, soit 5,0167 s de jeu ; coût calculé par `window.__S.perf` avec `?perf=1`, sur sa fenêtre des dernières images. Pas de bridage CPU. Le rAF est piloté pour figer exactement le même état avant/après ; aucun module du jeu n’est remplacé pour la collecte. L’état est substitué uniquement lors du contrôle ciblé des chemins de rendu hors jeu et des six états jouables. Le navigateur est muet.

```sh
# Avant modification : conserver le bundle hors du dépôt.
node tools/lisibilite/banc.mjs --phase avant --bundle /tmp/snake-codex01-avant.html
# Après reconstruction :
node tools/lisibilite/banc.mjs --phase apres
```

**Le banc sort volontairement 1 si les seuils échouent**, tout en enregistrant les reçus et captures. `collecteComplete: true`, `conforme: false` sont les statuts attendus de ce lot ; une sortie 1 n’est pas présentée comme une réussite.

## Revue des captures

Les captures normales des neuf cas avant/après ont été regardées en planches comparatives ; les fichiers individuels sont joints. Le sol perd les aplats et reflets chauds, la grille reste perceptible, les cellules se détachent davantage. En revanche, la tête du serpent et les tirs passent encore devant la cité lumineuse, particulièrement en V4 paysage/bureau ; cette réserve visuelle rejoint l’échec des seuils globaux. Aucun verdict de qualité indépendante n’est revendiqué : revue attendue par `/mediateur`.

![Avant, paysage V4](avant-paysage-v4.png)

![Après, paysage V4](apres-paysage-v4.png)

## Point de reprise

Objectif : codex-01, lisibilité du décor sans extinction du lointain. Correction ciblée, banc, reçus et captures prêts. Pas de dépense externe ; exécution locale Playwright seulement. Reste : arbitrage du rectangle de mesure et de la lumière au-dessus du plateau, puis éventuelle correction complémentaire et revue Claude. Reprendre par `git pull --rebase origin claude/snake-game-mobile-17dqpi` et relire entièrement la section « Ordres pour Codex » ; ne pas refaire les mesures inchangées sans nouvel élément.
