# Avis du pilote — relecture des spécifications de la vague 3 (G7, G9, G10, G11)

Relecture **en lecture seule** : aucun build, aucun navigateur, aucune mesure du jeu. Les seuls
calculs faits ici portent sur des littéraux du code, sur les JSON de campagne déjà produits par
l'audit, et sur de l'arithmétique de couleur — c'est-à-dire sur des choses qu'un crayon suffirait
à vérifier.

Chaque point d'un rapport de relecture a été **recontrôlé dans le code par le pilote** avant d'être
retenu. Trois affirmations ont été écartées ou corrigées ; elles sont signalées en fin d'objectif.

Conventions :
- **ÉTABLI** — la preuve est dans le code, dans l'arithmétique, ou dans un fichier de données déjà
  produit. Le fait est acquis, il n'y a rien à mesurer.
- **À VÉRIFIER** — seule une mesure tranche. Le protocole est donné ; sans lui le point ne sert à rien.
- Les corrections de spec sont à faire **avant** d'ouvrir l'implémentation. Un seuil inatteignable
  coûte une tentative entière, comme le « au moins 38 anneaux » de G6.

Verdict d'ensemble : **les quatre spécifications portent des pièges bloquants.** Douze points sont
bloquants au sens strict — un implémenteur qui suit la spec à la lettre échoue à son propre test.

---

## Ce qui ferait perdre une tentative en premier

| # | Objectif | Piège | Coût |
|---|----------|-------|------|
| 1 | G9 | Le boss du niveau 1 a **84 PV** (91 au cran du test), pas 36 ; « → 90 » c'est *ne rien faire* | tentative entière |
| 2 | G11 | Le contour d'ebullet à **+60 de luminance** est impossible sur un cœur #ffe45e (224/255) | tentative entière |
| 3 | G11 | La palette écrite dans le « quoi » **échoue au test 1 de G11** avant toute implémentation | tentative entière |
| 4 | G10 | Le diviseur **0,68 em/caractère** est plus petit que le seul entre-lettrage + une capitale | tentative entière |
| 5 | G7 | **S.level est le numéro de secteur**, pas le niveau du joueur : deux formules du « quoi » sont ambiguës d'un facteur 2 | tentative entière |
| 6 | G9 | « S.timeScale 0,3 **comme le pouvoir RALENTI** » désigne deux dispositifs incompatibles | tentative entière |
| 7 | G11 | Les deux sondes de télégraphe exigent 90 % / 80 % de points sur des **pointillés** à 59 % / 42 % | tentative entière |
| 8 | G10 | **S.t est l'horloge de la PAGE**, jamais remise à zéro : « premier appel à S.t < 1 000 ms » ne mesure pas la partie | tentative entière |
| 9 | G9 | « 0,8 × demi-diagonale (donc en vue) » : une demi-diagonale n'est pas une demi-étendue | tentative entière |
| 10 | G11 | Rails **#3a7bff = 2,50:1** contre #00e5ff, le test en exige 3,0:1 | tentative entière |
| 11 | G7 | « un seul écran (lvlUps −= 2) » : la parenthèse contredit la phrase dès lvlUps = 3 | tentative entière |
| 12 | G10 | La formule de bannière est écrite **sans `var(--uis)`** alors que la règle en porte un | tentative entière |

---

# G7 — Première minute et courbe de difficulté

**Verdict : pièges sérieux.** 13 points retenus, 2 bloquants. Un point du rapport de relecture a été
corrigé (voir « écarté » en fin de section).

### G7-1 — PRÉMISSE FAUSSE / SEUIL AMBIGU · **ÉTABLI** · bloquant
**Où** : « quoi » — « XP ennemi × (1 + 0,15 × (S.level − 1)) » et « dégâts de la vague 40 → 40 + 10 × S.level » ;
« pourquoi » — « 7 parties sur 7 finissent au niveau 1 ».

`S.level` est le **numéro de SECTEUR**, pas le niveau d'expérience du joueur. Le niveau du joueur
n'existe comme nombre nulle part.

**Preuve.** Les deux seules écritures de S.level sont `S.level = n;` dans `_lvStart(n)`
(src/25-levels.js:1113) et `S.level = 1` dans `resetRun` (src/90-boot.js:882). L'état ne contient que
`xp, xpNext, lvlUps` (src/10-core.js:53) ; `addXp` fait `S.lvlUps++` (src/10-core.js:668) et
`openCards` fait `S.lvlUps--` (src/90-boot.js:833) — rien ne mémorise le niveau atteint. L'interface
confirme le sens : `_uiTxt(_uiE.lvN, 'NIVEAU ' + S.level)` puis recherche du nom de secteur par
`defs[i].n === S.level` (src/26-ui.js:1389-1392).

Le constat du « pourquoi » est une **tautologie de calendrier** : le secteur 1 dure
`calm 16 + rise 24 + surge 24 + climax 34 + clear 6 = 104 s` (src/25-levels.js:66), donc toute mort
avant 104 s affiche « niveau 1 ». Le constat ne mesure pas la progression qu'on prétend corriger.

**Écart entre les deux lectures** : à la 10ᵉ tranche d'une partie de 10 min, S.level ≈ 6 (facteur 1,75)
contre un niveau de joueur ≈ 21 (facteur 4,0) — le revenu d'XP varie de 2,3×, et c'est lui qui décide
du test « cartes/min ∈ [1,5 ; 3,5] ».

**À faire.** Trancher **dans la spec** : soit `S.level` = secteur (le code actuel), soit créer un
compteur neuf (p. ex. `S.plevel`, incrémenté dans `addXp`) et l'écrire comme un **livrable du « quoi »**,
au même titre que `S.cardsTaken`.

### G7-2 — CONTRADICTION · **ÉTABLI** (arithmétique) · bloquant
**Où** : « quoi » — « si S.lvlUps ≥ 2 à l'ouverture, un seul écran de 4 cartes (lvlUps −= 2) » ;
test 3 — « écrans enchaînés en < 2 s ≤ 1 % ».

Même structure que le piège G6 : la phrase dit « un seul », la parenthèse n'en absorbe que deux. À
lvlUps ∈ {3,4} il reste un écran, à {5,6} deux.

**Preuve de l'enchaînement à 610 ms.** `if (S.lvlUps > 0) setTimeout(openCards, 260);`
(src/90-boot.js:843) puis `_lvlSeq = S.t + 350` (src/90-boot.js:815). Or **S.t avance au rythme brut**,
pas au temps ralenti : `S.t += raw * 1000` dans la branche play (src/90-boot.js:559) **et** dans la
branche 'cards' (src/90-boot.js:583), alors que seul `dt = raw * scale` porte le timeScale
(src/90-boot.js:543). Deux écrans consécutifs sont donc séparés de 260 + 350 = **610 ms**, en horloge
murale comme en S.t : toujours < 2 s.

**À VÉRIFIER (protocole)** — que lvlUps ≥ 3 arrive vraiment : envelopper `__M.ui.showCards`, journaliser
`{S.t, S.lvlUps avant décrément}` à chaque ouverture sur 10 parties `{pilot:'dodge', cards:'greedy'}`
de 10 min, et rapporter l'histogramme de S.lvlUps à l'ouverture. Le chemin plausible est l'ultime :
`ultTick` inflige six vagues `damageEnemy(list[i], 40, …)` sur `enemiesNear` jusqu'à r = 910 **dans la
même image** (src/90-boot.js:343-351), tandis qu'`openCards` n'est appelé qu'en fin d'image
(src/90-boot.js:581).

**À faire.** Remplacer « (lvlUps −= 2) » par une règle qui ferme le cas général, p. ex. « un seul écran,
puis `S.lvlUps = 0` ».

### G7-3 — SEUIL INATTEIGNABLE · **ÉTABLI** · majeur
**Où** : « quoi » — « cap simultané 30 → 22 tant que S.snake.len < 8 ».

La condition est **fausse au départ de la partie** : `K.START_LEN: 9` (src/10-core.js:21),
`len: K.START_LEN` (src/10-core.js:133). La longueur ne baisse que dans `hurtSnake`
(`s.len = Math.max(1, s.len - dmg)`, src/10-core.js:360) et CROISSANCE ajoute 4. Le « soulagement de
première minute » ne s'applique donc **jamais à un serpent intact** — seulement après deux coups
encaissés (INVULN 900 ms entre deux).

Second point : 30 et 22 sont des valeurs de **table**, pas le plafond simultané réel. Le code applique
`cap = Math.min(_LV_HARDCAP, Math.round((w.cap + capB) * capM))` avec `capM = Math.pow(dm, 0.55)`
(src/25-levels.js:555, 563). À dm = 1,55 : capM = 1,2734, donc 30 vaut **38** en jeu et 22 en vaudrait **28**.

**À faire.** Relever le seuil (p. ex. `len < 12`, qui couvre le départ à 9 et la première CROISSANCE),
ou le formuler en fraction de maxHp, ou dire explicitement que c'est un mécanisme de retour en arrière.
Et écrire les caps en valeur de table **et** en valeur effective.

### G7-4 — PRÉMISSE FAUSSE · **ÉTABLI** · majeur
**Où** : « quoi » — « mines du calm posées à ≥ 300 u de la tête ».

Déjà vrai depuis G6, avec plus du double de marge. La seule ligne de mines du calm au niveau 1 est
`{ p: 'calm', every: 9.0, …, g: [['mine', 1, 'ahead']] }` (src/25-levels.js:73). Dans `_lvPoint` :
`var off = Math.sqrt(_lvVisW*_lvVisW + _lvVisH*_lvVisH) + 150;` (src/25-levels.js:377) puis, pour
'ahead', `R = off + rndR(0, 190)` (src/25-levels.js:411). `_lvVisW/_lvVisH` valent au minimum la
demi-vue (src/25-levels.js:321) et G2 borne view.w dans [1000 ; 1600], donc **off ≥ 650 u**.

**Danger** : un implémenteur qui croit devoir corriger `_lvPoint` ne peut qu'**affaiblir la garantie
d'apparition hors champ livrée par G6**. Retirer la clause, ou la reformuler sur la distance
**à l'éclosion** (après les 600 ms de portail), ce qui, lui, se mesure.

### G7-5 — CONTRADICTION · **ÉTABLI** · majeur
**Où** : « quoi » et test 1 — « ≥ 1 carte de l'axe 'fort' (CROISSANCE, BOUCLIER, RÉPARATION, AMORTISSEURS)
et ≤ 1 arme neuve ».

L'axe 'fort' compte **neuf** cartes, pas les quatre citées, et **deux sont des armes** :
`drones` (l.450), `shockwave` (l.456), `growth` (462), `shield` (468), `regen` (480), `thorns` (486),
`pickHeal` (496), `iframes` (502), `capDamage` (508) — src/24-upgrades.js. Or
`_WPN_IDS = [… 'drones', 'shockwave', 'tailMines']` (src/23-weapons.js:141-142).

Conséquence : une main `{DRONES, X, Y}` satisfait littéralement « ≥ 1 carte d'axe fort » tout en étant
l'inverse d'une main de survie, et la même carte compte des deux côtés. Le test retient la lecture la
plus faible des deux que la phrase propose.

**À faire.** Écrire une **liste d'identifiants explicite** (growth, shield, regen, iframes — dire si
thorns, pickHeal, capDamage comptent) et exclure nommément drones et shockwave.

### G7-6 — NOM INEXISTANT · **ÉTABLI** · majeur
Quatre noms de la spec n'existent pas sous cette forme.

1. **`au.sfx('multUp')`** : il n'y a aucun objet `au` dans src/*.js ; l'API est `S2030.audio.sfx(name, opts)`
   (src/21-audio.js:1106). Et **'multUp' n'est pas dans la banque** : `_audFxMax` liste ultFire, ultReady,
   warp, levelup, card, core, boost, boostEnd, boostDry, click, spawnTick, absorb (src/21-audio.js:78-84).
   Le son est donc **à créer** — c'est un livrable du « quoi », pas un appel.
2. **`S.cardsTaken`** : aucune occurrence dans src/*.js. Compteur à créer.
3. **« arme neuve »** : indéfini. Le contrat des cartes est `{ id, name, desc, icon, rarity, max, weight,
   req(), apply() }` (src/24-upgrades.js:7-12) — aucun drapeau d'arme. Et la définition n'est pas triviale :
   `resetRun` pose `S.up.frontCannon = u.u_start ? 2 : 1;` (src/90-boot.js:903), donc **CANON n'est jamais
   neuf**, contrairement aux sept autres armes.
4. **`tools/test/sim.mjs`** et **« pilote dodge-greedy »** : le fichier versionné s'appelle
   `tools/test/simlib.mjs` et son pilote est **unique et codé en dur** (`window.__pilotTick`), sans option
   `pilot` ni `cards`. Les pilotes n'existent que dans le fichier **non versionné**
   `<scratchpad>/sim-lib.mjs`, dont la signature est
   `{ diff = 1, pilot = 'dodge', cards = 'first', maxT = 600000, … }` (sim-lib.mjs:226) : **'greedy' est une
   stratégie de cartes, pas un pilote** (sim-lib.mjs:105-112). « dodge-greedy » = `{pilot:'dodge', cards:'greedy'}`.

**À faire.** Écrire `S2030.audio.sfx('multUp')`, ajouter 'multUp' à `_audFx` et `_audFxMax` dans le
« quoi », définir « neuve » par `S.up[id] === 0 au tirage`, lister les huit ids d'arme, écrire
« pilote 'dodge', cartes 'greedy' », et **verser `sim.mjs` + `sim-lib.mjs` dans `tools/test/G7/`** comme
premier livrable — le fichier source vit dans le dossier temporaire dont CONTEXTE-CHAINE.md dit qu'il
a déjà été perdu une fois.

### G7-7 — SEUIL INVÉRIFIABLE · **ÉTABLI** · majeur
**Où** : test 4 — « au.sfx('multUp') appelé exactement au nombre de paliers franchis ».

Le compteur d'audio **ne peut pas voir l'appel dans le harnais**. `sfx` sort immédiatement si
`!_audOk || !_audSfxOn` (src/21-audio.js:1107) et `_audPlayed` n'est incrémenté qu'**à l'intérieur** de
`_audAllow` (src/21-audio.js:105). Or le harnais fait
`window.AudioContext = undefined; window.webkitAudioContext = undefined;` (sim-lib.mjs:15) et
`S.opt.sfx = false` (sim-lib.mjs:230). `audio.stats()` rapportera donc **0** quoi que fasse
l'implémentation : un test qui s'y fierait échouerait sur du code correct.

Deux ambiguïtés s'y ajoutent : (a) la spec est muette sur les **re-franchissements** — combo retombe à 0
à l'expiration de multT (src/90-boot.js:576) et, avec la nouvelle règle, est divisé par 2 à chaque coup ;
(b) la spec liste les paliers ×2/×4/×8/×12 mais fixe aussi un **plafond 16 en SURCHARGE**, donc le
passage de 12 à 16 ne déclenche rien.

**À faire.** Compter en **enveloppant `__M.audio.sfx` depuis la page**, jamais via `audio.stats()`.
Dire explicitement que chaque franchissement ascendant compte, y compris après une retombée. Ajouter ou
retirer un palier ×16 cohérent avec le plafond.

### G7-8 — SEUIL AMBIGU · **ÉTABLI** · majeur
**Où** : « quoi » — « un coup reçu divise combo par 2 (floor) » ; test 4 — « après un coup à combo 20
→ S.combo === 10 ».

La spec dit ce que devient **combo**, jamais ce que devient **mult**. Aujourd'hui les deux sont écrits
ensemble : `if (!S.up.f_multKeep) { S.mult = 1; S.combo = 0; }` (src/10-core.js:366-367). La seule
dérivation de mult est dans `killEnemy` : `S.mult = Math.min(12, 1 + Math.floor(S.combo / 4) * 0.5);`
(src/10-core.js:507). Donc si l'implémenteur écrit seulement `S.combo >>= 1`, **mult ne bouge qu'au
prochain kill** et le HUD affiche ×4 avec combo 10. Les deux lectures passent le seul test qui existe et
donnent des valeurs franchement différentes pour « ≥ 40 % du temps avec mult > 1 ».

Même silence sur l'expiration : la spec passe multT de 3 200 à 5 000 ms sans dire si la remise à zéro
reste totale (src/90-boot.js:576).

**Piège de protocole** : `hurtSnake` sort avant tout si `s.invuln > 0 || S.phase !== 'play'`
(src/10-core.js:342) et sort **aussi**, sans toucher au combo, si un BOUCLIER absorbe
(src/10-core.js:349-356). Le test doit garantir `invuln = 0`, `f_shield = 0`, `f_multKeep = 0`, et
appliquer le coup **par le chemin du jeu**.

### G7-9 — CONTRADICTION INTERNE · **ÉTABLI** (arithmétique) · majeur
Le « pourquoi » et les « tests » citent **deux valeurs incompatibles des mêmes mesures de référence**.

- Ultime : « 1 par 40 s » = 1,5/min et « 1 par 0,7 s » = 85,7/min ; le test annonce « 3,8 → 45 ».
  Facteurs 2,5 et 1,9 d'écart aux deux extrémités.
- Multiplicateur : « ×1 pendant 67-87 % » implique mult > 1 pendant **13 à 33 %** ; le test annonce
  **« 0-11,7 % »**. Les deux intervalles ne se recouvrent même pas.

Un implémenteur ne peut pas savoir contre quel chiffre les seuils ont été calibrés.

**À VÉRIFIER (protocole)** — refaire **une seule** mesure de référence sur le build actuel
(`git show HEAD:snake2030/index.html` servi sur un port dédié, pour ne pas polluer la chaîne) :
10 parties `{pilot:'dodge', cards:'greedy'}` de 10 min en journalisant chaque appel de `useUlt` avec S.t,
agrégées par tranche de 60 s ; et 20 parties 'sloppy' de plus de 60 s en échantillonnant `S.mult` à
chaque image de jeu, en rapportant la fraction d'images avec `S.mult > 1,01` (le seuil que l'interface
utilise déjà, src/26-ui.js:1382). Préciser aussi si « ultimes/min par tranche » est la **moyenne sur les
n parties** ou la valeur **par partie** : un compte sur 60 s est un entier, donc « ∈ [0,7 ; 2,0] » par
partie signifierait « exactement 1 ou 2 ».

### G7-10 — SEUIL INATTEIGNABLE (plancher) · **ÉTABLI** ; plafond **À VÉRIFIER** · majeur
**Où** : test 3 — « ultimes/min par tranche ∈ [0,7 ; 2,0] ».

Le plancher de la fourchette est **déjà consommé par le boost seul**, sans un seul kill, et la spec ne
retouche que le terme de charge par kill.

**Arithmétique, littéraux du code.** `S.ultMax = 100` (src/10-core.js:54) ;
`if (s.boosting) S.ult = Math.min(S.ultMax, S.ult + 3 * dt * (1 + 0.3 * (S.up.f_ultGain || 0)));`
(src/10-core.js:288) ; `BOOST_DRAIN: 34`, `BOOST_FILL: 22` (src/10-core.js:19-20), consommés en
src/10-core.js:219-229. Régime permanent : `t_on × 34 = t_off × 22`, donc la part de temps en boost
soutenable vaut au plus **22/56 = 39,3 %**. Charge = 3 × 0,393 = 1,18 pt/s = 70,7 pt/min =
**0,707 ultime/min**, soit exactement le plancher 0,7.

Avec RÉSERVE (`f_boostDrain`, −16 % de drain par point jusqu'à 5 → drain 6,8/s → part soutenable
22/28,8 = 76 %) et RÉACTEUR (`f_ultGain`, +30 %/point) : 3 × 1,6 × 0,76 = 3,65 pt/s = **2,19 ultimes/min**,
au-dessus du plafond 2,0, toujours sans un seul kill.

Note d'exactitude : la charge par kill **ne décroît pas partout**. La formule prescrite
`6 × sqrt(12 / max(12, S.xpNext))` vaut **6** au début, contre **4,5** aujourd'hui
(`S.ult + (e.elite ? 22 : 4.5)`, src/10-core.js:513) — c'est une hausse en début de partie et une baisse
en fin.

**À VÉRIFIER (protocole)** — instrumenter la **SOURCE** de chaque point de jauge, pas le total :
envelopper `killEnemy`, `grabPickup` et le pas de boost pour cumuler par tranche de 60 s les points issus
des kills ordinaires, des élites, des cœurs et du boost, plus le nombre d'appels de `useUlt` ; rapporter
aussi la part de temps en boost et les cartes prises. Machine au repos (`/proc/loadavg` < 0,5 et le
compteur ancré `ps -eo args --no-headers | grep -cE "^/opt/node22/bin/node .*(run|banc)\.mjs"` à zéro).
Si boost + élites dépassent à eux seuls 200 pt/min à la 10ᵉ tranche, le plafond 2,0 est hors d'atteinte
sans toucher aussi à ces deux termes.

### G7-11 — PRÉMISSE À REVOIR · **ÉTABLI** (cadences) / **À VÉRIFIER** (survie) · majeur
**Où** : test 1 — « coups/min sur 15-45 s ≤ 12 (20-23) » et « survie médiane ∈ [90 ; 240] s (41,9) ».

Les leviers du « quoi » n'agissent presque pas sur la fenêtre où le test mesure.

**Cadences, arithmétique établie.** Toutes les cadences sont resserrées par `rate /= Math.pow(dm, 0.85)`
(src/25-levels.js:554), soit rate = 0,689 à dm = 1,55.
- Aujourd'hui : calm 0-16 s à 2/(4,4 × 0,689) = **0,66 traqueur/s**, rise dès 16 s à 3/(3,6 × 0,689) = **1,21/s**.
- Avec la spec : calm 0-10 s à 2/(3,2 × 0,689) = **0,91/s** (la densité du calm **augmente**), rise 10-20 s
  à 3/(5,0 × 0,689) = **0,87/s**, puis 1,21/s.
- Moyenne sur 15-45 s : ≈ 1,15/s contre 1,19/s, soit **−3 à −5 %**, là où le test exige une chute de 45 %
  des coups reçus.

Le seul autre levier de la fenêtre est la baisse de cap, **inerte** (voir G7-3). Et une médiane de survie
≥ 90 s impose de franchir le **surge** (cap effectif 38-56, eliteP 0,06-0,08, artilleurs) et le **climax**
du secteur 1 : deux phases que le « quoi » ne touche pas. Après le changement, le secteur 1 dure
10 + 24 + 24 + 34 + 6 = 98 s.

**À VÉRIFIER (protocole)** — mesurer l'effet marginal de **chaque levier séparément** (build actuel ;
puis calm seul ; puis rise seul ; puis cap seul), 20 parties 'sloppy' SOUTENU par variante, en
journalisant chaque appel de `hurtSnake` avec `{S.t, dmg, source, S.levelPhase}` et chaque mort avec S.t.
Si la médiane ne franchit pas 60 s en cumulant les trois leviers, **l'intervalle [90 ; 240] est une erreur
de la spec**, pas un manquement du build : il faut alors adoucir aussi le surge/climax du secteur 1, ou
rabaisser la borne.

### G7-12 — SEUIL AMBIGU · **ÉTABLI** · mineur
**Où** : test 4 — « le HUD contient un texte /kills → ×/ ».

La regex impose le pluriel alors que le compte restant vaut 3, 2 ou 1 : « 1 kill → ×4,5 » ferait échouer
un HUD correct environ une fois sur trois. Et le cache d'affichage ne rafraîchit le bloc que quand
**m change** : `var m = Math.round(S.mult * 10); if (m !== _uiP.mult) { … }` (src/26-ui.js:1378-1381) —
un texte « n kills → × » qui décroît à chaque kill sans changer m **ne serait pas rafraîchi**.
Le test ne dit ni quand relever, ni ce qu'affiche le HUD au plafond (plus de palier suivant) ou à combo 0.

**À faire.** Écrire `/kills? → ×/` (ou figer le libellé), préciser l'instant du relevé, dire ce que montre
le HUD au plafond, et **étendre le cache `_uiP.mult` au compte de kills**.

### G7-13 — POINT NEUF DU PILOTE · **ÉTABLI** · majeur
**Où** : « quoi » — « multT 3 200 → 5 000 ms (7 000 si mult ≥ 3) ».

La jauge de multiplicateur du HUD divise par **3 200 en dur** :
`_uiBar(_uiE.multBar, S.multT > 0 ? S.multT / 3200 : 0);` (src/26-ui.js:1384), et `_uiBar` borne à 1
(src/26-ui.js:423-426). Porter multT à 5 000 sans toucher cette ligne laisse la jauge **collée au
maximum pendant les 1 800 premières millisecondes** — exactement l'inverse d'un « multiplicateur lisible ».

**À faire.** Ajouter la ligne au « quoi » : la jauge doit diviser par la durée courante de multT.

### Points du rapport de relecture **écartés ou corrigés**

- **« Les dégâts de l'ultime 40 → 40 + 10 × S.level sont invisibles sur tous les ennemis ordinaires et
  élites » — FAUX.** Vérification : `spawnEnemy` fait `hp = Math.round((d.hp||10) * Math.pow(dm, 0.5))`
  (src/10-core.js:435), donc à dm = 1,55 la PONDEUSE ordinaire a **124 PV** et le BROUILLEUR **50 PV**
  (src/22-enemies.js:1737, 1762) : 40 ne les tue pas. Les élites sont à ×3,2 (src/10-core.js:446). De plus
  `ultTick` inflige 40 par vague à un rayon croissant (`r = 160 + _ultStep * 150`, src/90-boot.js:343),
  donc un ennemi loin de la tête n'encaisse que les dernières vagues. La clause **a bien un effet** ;
  ce qui reste vrai, c'est qu'elle **n'a aucun test** et qu'elle emploie S.level (voir G7-1).
- **« Artilleurs seulement après la première carte » quasi inerte au niveau 1 — retenu, mineur.**
  Vérifié : au niveau 1, 'shooter' n'apparaît qu'en surge (src/25-levels.js:81) et en climax
  (src/25-levels.js:85), donc à t ≥ 34 s avec la spec, alors que la première carte est visée à 15 s
  médians. Soit retirer la clause, soit dire qu'elle couvre tous les secteurs et lui donner un test.
- **Réserve « demi-tour de G5 » portée sur G7 — la réserve tient, mais elle est hors périmètre.**
  Vérifié : le commentaire src/27-phases.js:266 annonce « deux quarts enchaînés aux deux prochains
  nœuds » et pose `o._rw = norm(o._ra + side * QUAD); o._rw2 = t;`. À l'exécution,
  `railPlace(o, o._rw)` pose le serpent **exactement sur le nœud**, puis `o._rw = o._rw2`
  (src/27-phases.js:273-282) ; l'écart `d` au second quart y vaut ~0, et
  `turned = Math.abs(d) <= step * 0.75 + 2 = 125,75` (pas de 165, src/27-phases.js:135) est donc vrai
  **dès l'image suivante**. Le second quart s'exécute au **même nœud**. Mais le « quoi » de G7 ne touche
  pas 27-phases.js et aucun de ses cinq tests ne regarde le demi-tour : **la réserve doit être déplacée
  vers un objectif qui touche ce fichier (G11 en porte déjà une), ou G7 doit gagner un article de
  « quoi » ET un test.** Corriger au passage le commentaire de la ligne 266, qui égare le lecteur.

---

# G9 — Directeur de difficulté, boss non forfaitable

**Verdict : pièges sérieux.** 18 points retenus, 3 bloquants. Le « pourquoi » de G9 est, lui, **solide**
et je l'ai revérifié dans les données : le pilote d'esquive atteint bien le plafond 10/10 sur quatre
crans sur cinq (campA.jsonl, dodge-greedy d0=10/10, d1=10/10, d2=10/10, d3=10/10, d4=6/10) et les PV des
ennemis ordinaires ne dépendent que de `diffMul`, jamais du niveau (src/10-core.js:435).

### G9-1 — PRÉMISSE FAUSSE · **ÉTABLI** · bloquant
**Où** : « quoi » — « Boss : PV × 2,5 (PROTOTYPE ZÉRO ≈ 36 → 90, DOUBLE LAME 2 × 85, NOYAU × 2,5) ».

**Le boss du niveau 1 n'a pas 36 PV mais 84** (à la difficulté par défaut 1,55). La parenthèse oublie le
modificateur BLINDÉ.

**Chaîne de calcul, tous littéraux.** `chaser { hp: 9 }` (src/22-enemies.js:1692) →
`hp = Math.round(9 * Math.pow(1.55, 0.5))` = **11** (src/10-core.js:435) →
élite `e.hp = e.maxHp = Math.round(e.hp * 3.2)` = **35** (src/10-core.js:446) →
`armored.apply : e.hp = e.maxHp = Math.round(e.maxHp * 2.4)` = **84** (src/22-enemies.js:906).
Le modificateur est bien appliqué : `boss: { name: 'PROTOTYPE ZÉRO', type: 'chaser', mod: 'armored', n: 1 }`
(src/25-levels.js:69) et `_lvPortal(b.type, …, b.mod || …, true)` (src/25-levels.js:618).

**Confirmation indépendante par les données de l'audit** (la sonde enregistre `hp: b.maxHp`) : les JSON
de campagne ne contiennent que cinq valeurs pour PROTOTYPE ZÉRO — **77 / 84 / 91 / 108 / 115**, soit
exactement les cinq crans de difficulté (1,25 / 1,55 / 1,90 / 2,30 / 2,75). Jamais 36.

**Le plus coûteux** : le test 1 de G9 tourne au cran **STANDARD (1,90)**, où le boss vaut déjà **91 PV**.
La cible « → 90 » de la spec est donc **la valeur d'aujourd'hui** : suivre la parenthèse, c'est ne rien
faire, et le test 3 (« climax L1 ∈ [20 ; 45] s ») échoue à coup sûr. Suivre le « × 2,5 », c'est 228.

Contrôle croisé : DOUBLE LAME est bien à 34 (cutter 12 → 15 → élite 48 → `fast × 0,7` = 34,
src/22-enemies.js:918), et 34 × 2,5 = 85 — le chiffre de la spec est juste. NOYAU MAGNÉTIQUE :
spawner 100 → 124 → élite **397**, donc × 2,5 = 992. Deux tiers de la parenthèse se vérifient, ce qui
rend l'erreur d'autant plus traître.

**À faire.** Supprimer « ≈ 36 » et écrire **les PV cibles en clair, au cran du test**, ou renoncer au
× 2,5 uniforme et donner un PV cible par boss.

### G9-2 — SEUIL INATTEIGNABLE (géométrie) · **ÉTABLI** · bloquant
**Où** : « quoi » — « apparition à 0,8 × demi-diagonale de `phases.visibleExtent()` (donc en vue) » ;
test 4 — « boss inView à t + 300 ms 20/20 ».

**Une demi-diagonale n'est pas une demi-étendue.** Un rayon fixe égal à 0,8 × hypot(demi-largeur,
demi-hauteur) ne place le point dans le cadre que si sa direction reste proche du grand axe.

**Arithmétique.** `SCALE = h / K.VIEW_H` puis bornage de `w/SCALE` dans [1000 ; 1600]
(src/90-boot.js:87-91), `K.VIEW_H = 780` (src/10-core.js:12).
- Bureau 1440×900 : SCALE = 1,1538, S.view = 1248 × 780, demi-étendues 624 et 390,
  0,8 × hypot = **588,7** — soit **1,51 fois** la demi-hauteur.
- iPhone 13 paysage 844×390 : SCALE = 844/1600 = 0,5275, S.view = 1600 × 739, demi-étendues 800 et 370,
  0,8 × hypot = **705** — soit **1,91 fois** la demi-hauteur.

Le zoom divise les deux demi-étendues par le même facteur et ne change pas le rapport ; et
`visibleExtent()` ne fait que **réduire** top/bottom sous la bascule (`side = hw * Math.min(1, …)`,
src/27-phases.js:404), ce qui aggrave le cas. La part des directions favorables vaut 46 % sur bureau et
35 % sur iPhone ; le motif d'apparition du boss est `'ring'`, d'angle essentiellement uniforme
(`_lvRingA` tourne à 0,55 rad/s, src/25-levels.js:1187). **« 20/20 » est hors d'atteinte.**

Deux aggravations : `inView()` mesure depuis `S.cam` (src/10-core.js:722) alors que `_lvPoint` tire
depuis la tête, et la caméra devance la tête ; et l'étendue publiée ignore le roulis (réserve portée
sur G11, voir G11-19).

**À faire.** Remplacer par la demi-étendue **dans la direction tirée** :
`R(a) = 0,8 · min(left/|cos a|, top/|sin a|)`, ou fixer le point à 0,8 × (left, top) composante par
composante. Puis relever, **dans la même image que l'éclosion**, `inView(e.x, e.y, 0)` et
`M.phases.toScreen(e.x, e.y)` (les deux composantes dans [0,05 ; 0,95]).

### G9-3 — CONTRADICTION · **ÉTABLI** · bloquant
**Où** : « quoi » — « S.timeScale 0,3 pendant 2,2 s, serpent à vitesse normale comme le pouvoir RALENTI » ;
test 4 — « S.timeScale ≤ 0,35 pendant ≥ 1,8 s ».

**Les deux moitiés de la phrase désignent deux dispositifs incompatibles, et le test n'en accepte qu'un.**

`RALENTI` **ne touche jamais** `S.timeScale` : son `run` fait `slowT = 4200` et rien d'autre
(src/27-phases.js:499-509) ; `enemyTimeScale()` renvoie `slowT > 0 ? 0.35 : 1` (src/27-phases.js:593) et
n'est consommé que pour la mise à jour des **ennemis** (src/90-boot.js:603). C'est précisément ce qui
laisse « le serpent à vitesse normale ».

`S.timeScale`, lui, multiplie le dt de **toute** la boucle : `var scale = hs > 0 ? 0.08 : S.timeScale;
var dt = raw * scale;` (src/90-boot.js:542-543) puis `updateSnake(dt)` (src/90-boot.js:563).

Implémenter « comme RALENTI » laisse S.timeScale à 1 et fait **échouer le test 4** ; implémenter le test
contredit la moitié de la phrase.

**Second volet, plus vicieux** : la carte DILATATION (`id: 'slowmo'`, src/24-upgrades.js:530) **réécrit
S.timeScale à chaque image** : `if (S.up.f_slowmo) { var low = s.len <= 3; S.timeScale = low ? (1 - 0.18 *
S.up.f_slowmo) : 1; }` (src/10-core.js:309-311). Chez une joueuse qui a cette carte, le ralenti d'entrée
de boss est **effacé**, et un test lancé sur une partie neuve sans cartes ne le verra jamais.

**À faire.** Trancher : soit « S.timeScale = 0,3 avec vitesse du serpent compensée par 1/0,3 dans
updateSnake » (le test 4 est alors bon), soit « `phases.enemyTimeScale()` forcé à 0,3 » (et le test doit
lire `__M.phases.enemyTimeScale()`, pas S.timeScale). Dans les deux cas, **dire qui a la priorité** entre
le ralenti de boss et DILATATION, et rejouer le test 4 sur une partie où `S.up.f_slowmo = 1` a été posé
avant l'entrée du boss.

### G9-4 — CONTRADICTION AVEC UN ACQUIS LIVRÉ · **ÉTABLI** · majeur
**Où** : « quoi » — « apparition … donc en vue », contre la garantie commitée de G6 (fafb2a0).

Le test de non-régression de G6 est **versionné et compte les boss**, avec une **égalité stricte à zéro** :
`const pass = T.apparitionsEnVuePct === 0 && …` (tools/test/G6/t1-sim.mjs:119), où `apparitionsEnVuePct`
agrège `if (s.inView) o.spawnInView++` sur **toutes** les entrées de `L.spawns` (t1-sim.mjs:51), lesquelles
incluent les boss (tools/test/enprobe.mjs:57-58 écrit `boss: rec.boss` mais ne filtre rien).
Une trentaine de boss vus sur ~25 000 apparitions donne 0,12 % → échec.

Par ailleurs le code de G6 **combat activement** cette naissance : `_lvHatchFix(p)` repousse par pas de
80 u tout point visible, appelé une image sur quatre par `_lvPortalTick` et systématiquement en tête de
`_lvHatch` (src/25-levels.js:460, 475, 499) ; et `_lvPoint` refuse un point non caché sur cinq essais
(src/25-levels.js:417).

**À faire.** Inscrire dans le « quoi » : (1) `_lvPortal(…, boss = true)` court-circuite `_lvHatchFix` et
`_lvHiddenSoon` ; (2) `tools/test/G6/t1-sim.mjs` exclut les apparitions `boss === true` de `spawnInView`,
et **le verdict de G9 porte cette modification comme un écart assumé**, sinon la vérification adversariale
finale la lira comme une régression de G6.

### G9-5 — SEUIL AMBIGU (deux horloges) · **ÉTABLI** · majeur
**Où** : tests 2 et 4 — « e.enraged à 45 ± 1 s », « S.timeScale ≤ 0,35 pendant ≥ 1,8 s », « bannière 2,2 s »,
« S.coins +60 en ≤ 1 s », « 0 → ≥ 95 % entre t + 0 et t + 1 s ».

Le jeu a **trois** horloges et la spec ne dit jamais laquelle elle emploie.
- `S.t` avance au temps d'image **brut** : `S.t += raw * 1000` (src/90-boot.js:559), **non** multiplié par
  `scale` (src/90-boot.js:542-543).
- Les compteurs de phase avancent au dt **ralenti** : `_lvPhaseT += dt` (src/25-levels.js:670), alimenté
  par `levels.update(dt)` (src/90-boot.js:566).
- Les minuteries d'interface sont sur l'**horloge murale** : `setTimeout(…, 1200)` (src/26-ui.js:1224).

Pendant un combat de boss, les deux premières divergent de plusieurs secondes : ralenti d'entrée (0,3 sur
2,2 s), gels d'image (0,08, src/90-boot.js:542), ralenti de blessure (0,4 pendant 180 ms puis remontée sur
120 ms, src/10-core.js:329-340). Dix coups encaissés valent déjà ~1,8 s de dérive. **Un « 45 ± 1 s » posé
sur la mauvaise horloge est faux dès le troisième coup.** C'est la maladie de G8, en sens inverse.

**À faire.** Chaque seuil de temps de G9 doit **nommer son horloge**. Proposition : `_lvPhaseT` pour
l'enragement, `S.t` pour la mise en scène et la bannière, ms d'horloge murale pour les lectures DOM.

### G9-6 — SEUIL INVÉRIFIABLE · **ÉTABLI** · majeur
**Où** : test 4 — « largeur de `.s2boss u` passant de 0 à ≥ 95 % entre t + 0 et t + 1 s ».

Trois défauts dans la même ligne.

(a) **La jauge n'a pas de largeur variable.** `.s2boss>i>u{display:block;height:100%;width:100%;
transform-origin:0 50%;transition:transform .12s linear}` (src/26-ui.js:150) et le remplissage passe par
`el.style.transform = 'scaleX(' + (q/256) + ')'` (`_uiBar`, src/26-ui.js:423-427). `getComputedStyle(u).width`
et `offsetWidth` rendront **toujours 100 %**.

(b) **Au temps t + 0, `.s2boss` est en `display:none`** tant que S.boss est nul (src/26-ui.js:143-144) : le
« 0 » se lirait sur un élément caché, donc pour la mauvaise raison.

(c) **Arithmétique.** Si t désigne l'entrée en climax, le boss n'existe qu'après les 600 ms de portail
(`var _LV_PORTAL = 600;`, src/25-levels.js:436 ; `_lvBossBorn` n'est appelé que depuis `_lvHatch`,
src/25-levels.js:484), et un remplissage de 900 ms atteint 95 % à **1 455 ms** — hors de la fenêtre d'une
seconde.

S'y ajoute que la jauge sert **déjà à autre chose** : `_uiBar(_uiE.bossBar, boss.hp / bmax)` se vide au fil
des dégâts. Le « quoi » ne dit pas comment l'animation d'entrée cède la place au suivi des PV.

**À faire.** Réécrire : « t est l'instant d'éclosion (S.boss passe de null à non-null) ; la largeur rendue
de `.s2boss u`, lue par `getBoundingClientRect().width` rapportée à celle de `.s2boss i`, passe de ≤ 5 % à
≥ 95 % en 900 ± 120 ms, puis suit les PV. » Capturer à 60 Hz par `requestAnimationFrame`, plus un contrôle
en pixels sur le canevas d'interface.

### G9-7 — NOM / GRANDEUR INEXISTANTE · **ÉTABLI** · majeur
**Où** : « quoi » — « hardcap 130 → 160 seulement si la moyenne d'images/s mesurée par `autoQuality` ≥ 50 ».

**`autoQuality` ne mesure aucune moyenne d'images par seconde.** Elle compte la **part d'images longues**
(> 33 ms) sur une fenêtre glissante et n'agit que sur `_qStep` :
`for (…) if (_qWin[i] > 0.033) longues++; var part = longues / _qWin.length;` (src/90-boot.js:749-772).
Aucune division par un temps.

La seule moyenne d'images/s du jeu est une variable de fichier de 90-boot.js : `var … fps = 60;`
(src/90-boot.js:521), `fps = frames / accReal;` (src/90-boot.js:535) — **écrite et jamais lue** (une
recherche de `\bfps\b` sur src/ ne renvoie que ces deux lignes), et invisible depuis 25-levels.js, qui est
concaténé avant 90-boot.js.

**À faire.** Soit exposer la grandeur (`S.fps = fps;` à la ligne 535) et écrire « si `S.fps ≥ 50` », soit
s'appuyer sur l'instrument existant : « hardcap 160 seulement si `_qStep === 0` ».

### G9-8 — GRANDEUR MAL DÉFINIE · **ÉTABLI** (mécanisme) / **À VÉRIFIER** (seuil) · majeur
**Où** : test 3 — « DOUBLE LAME jamais tué en < 12 s ».

DOUBLE LAME n'est pas un boss mais **deux** (`n: 2`, src/25-levels.js:109), et la jauge ne suit qu'un seul
à la fois : quand le premier meurt, `_lvPhaseTick` **passe le relais** au suivant
(`if (_lvBoss && _lvBoss.dead) { … _lvBoss = _lvElites[j]; … }`, src/25-levels.js:678-685). L'instrument de
l'audit clôt son enregistrement à ce relais (`en-probe.mjs:144-148`, `if (!b || b.id !== cur.id)`), ce qui
produit **structurellement** des durées ridicules, indépendantes des PV. Aucun multiplicateur ne peut les
relever au-dessus de 12 s tant que la grandeur mesurée reste « durée du boss courant ».

**À faire.** Redéfinir : « durée du climax du niveau 2, de la première éclosion d'un boss à la mort du
dernier boss encore vivant ». Reconstruire l'intervalle depuis `L.spawns` (premier `boss:true` du niveau 2)
jusqu'au dernier `L.kills` portant `boss:true` du même climax. **Refaire la mesure sur 20 parties avant de
figer le 12 s** : c'est le seul chiffre du test 3 dont je ne peux pas dire par lecture s'il est atteignable.

### G9-9 — SEUIL VIDE OU CENSURÉ · **ÉTABLI** (recalculé par le pilote) · majeur
**Où** : test 1 — « survivants 'sloppy' (parties > 90 s) : survie médiane ≤ 420 s ».

**Recomptage sur campE.jsonl, fait par le pilote :**

| cellule | n | médiane | parties > 90 s |
|---|---|---|---|
| sloppy-first-d2 | 10 | 33 s | **0** |
| sloppy-greedy-d2 | 8 | 36 s | **0** |
| sloppy-first-d0 | 10 | 600 s | 6, **toutes à 600 s** |
| sloppy-greedy-d1 | 8 | 600 s | 4, **toutes à 600 s** |
| sloppy-greedy-d4 | 8 | 45 s | 3, **toutes à 600 s** |

Au cran **STANDARD (d2)** nommé dans la même phrase du test, la population décrite est **vide** : une
médiane sur zéro valeur ne se compare à rien et le test passerait par vacuité. Ailleurs, la population est
**entièrement censurée par le plafond** : on meurt avant 90 s, ou on ne meurt plus. La distribution est
franchement bimodale.

**À faire.** Préciser pilote, cran, n et plafond, et remplacer la médiane par une grandeur non censurée :
p. ex. « part des parties sloppy qui atteignent le plafond ≤ 30 % ».

### G9-10 — CONTRADICTION · **ÉTABLI** · majeur
**Où** : test 4 — « première apparition non-boss à t ≥ 1,4 s » ; « quoi » — « escorte à +1,5 s ».

Retarder l'escorte ne suffit pas : **les vagues ordinaires du climax partent presque immédiatement.**
`_lvEnterPhase` amorce `_lvWaveT[w] = Math.max(0.02, rndR(0.2, 1.4) - _LV_PORTAL / 1000);`
(src/25-levels.js:586-587) — avec `_LV_PORTAL/1000 = 0,6`, **tout tirage ≤ 0,62 s tombe sur le plancher
0,02 s**. Le niveau 1 a bien des vagues de climax (src/25-levels.js:84-85), et `_lvWaves` ne s'arrête que
sur la phase 'clear'. Avec les 600 ms de portail, le premier ennemi éclôt vers **0,62 s**.

**À faire.** Ajouter au « quoi » : « pendant les 1,5 premières secondes du climax, aucune vague ordinaire
n'est armée » (plancher de `_lvWaveT` porté à 0,9 s quand la phase entrée est 'climax'). Vérifier le
**minimum** sur 20 climax, pas la moyenne.

### G9-11 — CONFLIT AVEC UN INVARIANT · **À VÉRIFIER** · majeur
**Où** : « quoi » — « hardcap 130 → 160 » et « capB max 46 → 80 ».

`var _LV_HARDCAP = 130;` (src/25-levels.js:26), consommé par `_lvSpawnGroup` et par `_lvWaves`
(src/25-levels.js:562). +23 % d'entités à mettre à jour et à dessiner, **sur la plateforme de référence**.
Deux réserves versionnées pointent dans cette direction (goal-status.json) : « Surcoût iPhone par ennemi en
bascule chargée, de 0,5 à 0,9 ms par image pour quarante-huit ennemis, direction constante sur trois
sessions » et « le seuil p99 iPhone ≤ 33 ms bascule dès que plus de 1 % des images sont doublées ».
La spec ne prévoit **aucun test de performance**, et son garde-fou repose sur une grandeur qui n'existe pas
(G9-7).

**Protocole.** `banc.mjs` en banc apparié (build courant contre build de référence tiré de git, même
fenêtre, scène figée, sans limiteur de cadence), profil iphone/bascule-charge, scène peuplée à 160 ennemis
construits depuis `enemies.defs.chaser`. Seuil : **p99 iPhone ≤ 33 ms**. Attendre `/proc/loadavg` < 0,5 et
le compteur ancré `^/opt/node22/bin/node` à zéro avant de lancer.

### G9-12 — RÉSERVE NON COUVERTE · **ÉTABLI** · majeur
Le pilote a rattaché à G9 une réserve explicite (goal-status.json, `reserves_portees`, cible G9) :
« Après G6 l'artilleur tombe de 10,6 à 2,9 pour cent de la population et de 4,58 à 1,07 apparition pour
cent secondes, et la survie moyenne du pilote augmente de soixante-trois pour cent. À rééquilibrer quand le
directeur de difficulté existera. »

Le mot **artilleur / shooter est absent du « quoi » de G9 et de ses cinq tests.** Tous les tests peuvent
passer avec un artilleur toujours aussi rare, et rien ne signalera l'oubli.

**À faire.** Ajouter une clause de cadence sur le shooter et un critère mesurable au test 1 (part dans la
population, apparitions pour cent secondes, sans que le taux de coups par balle ne repasse au-dessus des
25 % de G6). L'instrument existe déjà : `tools/test/G6/mesure-artilleur.mjs`.

### G9-13 — DOUBLE COMPTE · **ÉTABLI** · majeur
**Où** : « quoi » — « PV ennemi × (1 + 0,08 × (S.level − 1)) × (1 + 0,04 × cycle) », « 2e boss au cycle 2 et
3e au cycle 4 », « Boss : PV × 2,5 ».

(a) **La montée en PV des boss par cycle existe déjà** et le « quoi » ne le dit pas :
`if (_lvCycle > 0) { e.hp = e.maxHp = Math.round(e.maxHp * (1 + _lvCycle * 0.22)); }`
(src/25-levels.js:656) — **+22 % par cycle**. Les trois nouveaux facteurs s'empileraient dessus. Au niveau
10 (cycle 7), difficulté 1,55 : 84 × 1,72 × 1,28 × 2,5 × 2,54 ≈ **1 174 PV**, quatorze fois la valeur
d'aujourd'hui.

(b) **Le nombre de boss par cycle existe déjà aussi et vaut exactement ce que la spec demande** :
`var count = b.n + ((_lvCycle / 2) | 0); if (count > 4) count = 4;` (src/25-levels.js:613-614) — avec
b.n = 1, deux boss au cycle 2 et trois au cycle 4. Seul le « +40 % PV chacun » serait neuf, et sa
formulation est ambiguë (chaque boss supplémentaire a-t-il +40 % par rapport au premier, ou chaque boss du
groupe gagne-t-il +40 % ?).

**À faire.** Dire explicitement quel sort est réservé au facteur `1 + _lvCycle * 0.22` (conservé, supprimé,
ou remplacé), et lever l'ambiguïté du « +40 % chacun ».

### G9-14 — CONTRADICTION INTERNE · **ÉTABLI** · mineur
« escorte limitée à 2 salves déclenchées à 66 % et 33 % de PV » puis, dans le même paragraphe,
« escorte à +1,5 s ». Si l'escorte se limite à deux salves aux seuils de PV, il n'y a pas d'escorte à
+1,5 s ; si elle arrive à +1,5 s **puis** à 66 % et 33 %, cela fait trois salves. Le code n'a aujourd'hui
qu'une seule salve, tirée à l'entrée du climax (src/25-levels.js:620-625). Décision d'auteur, aucune
mesure.

### G9-15 — CHIFFRES DE RÉFÉRENCE MAL RATTACHÉS · **ÉTABLI** (recalculé) · mineur
**Où** : test 1 — « ≤ 30 % des parties atteignent le plafond (100 %) » et « part du temps à 90 segments
après 120 s ≤ 25 % (65 %) ».

(a) Le « 100 % » a été mesuré avec un **plafond de 600 s** (les configurations de campagne portent toutes
`"maxT": 600000`), alors que le test en impose **900 s**. Le test reste vérifiable, il est simplement plus
sévère qu'il n'en a l'air.

(b) Le « 65 % » ne se retrouve pas sur la cellule nommée. **Recomptage du pilote sur campA.jsonl,
dodge-greedy-d2 : 4 720 échantillons postérieurs à 120 s, dont 3 523 à `len ≥ 90`, soit 74,6 %.**

Le plateau est réel et bien à 90 : `MAX_LEN: 90` (src/10-core.js:22) et
`s.len = Math.min(K.MAX_LEN, s.len + n);` (src/10-core.js:398). Note pour l'auteur du test : `maxHp` peut
dépasser 90 (`_upGrow` fait `s.maxHp += n` sans plafond), donc le prédicat correct est **`len >= 90`**, pas
`len === maxHp`.

**À faire.** Écrire « (100 % à un plafond de 600 s) » ou refaire la mesure à 900 s ; nommer la population
exacte du 65 % ou le remplacer par 74,6 % sur la cellule nommée.

### G9-16 — NOMS INEXISTANTS · **ÉTABLI** · mineur
- **`S.run.bossKills`** : il n'y a **pas de `S.run`** (aucune occurrence dans src/) ; les compteurs de
  partie sont à plat dans S. Écrire `S.bossKills`, ou dire explicitement qu'on crée S.run et pourquoi.
- **« NOYAU »** : le boss du niveau 3 s'appelle **NOYAU MAGNÉTIQUE** (src/25-levels.js:146).
- **« 3 cœurs + soin »** : ce sont des **noyaux** ('core'), pas des cœurs — `addPickup('core', …)` ×3 puis
  `addPickup('heal', …)` dans `_lvClearPhase` (src/25-levels.js:641-648). Et ces quatre ramassables
  **existent déjà** : le « quoi » les présente comme neufs.
- **« tirage étiqueté TROPHÉE (rareté ≥ rare) »** : `roll(n)` ne prend qu'un nombre
  (`function _upRoll(n)`, src/24-upgrades.js:660 ; unique appelant `roll(3)`, src/90-boot.js:836) et le
  contrat fige cette signature. Étendre en `roll(n, opts)` et **le dire dans CONTRACT.md**.
- **« ≥ 1 'epic' »** : le jeu a une rareté **supérieure** à epic — le pool contient 20 'common', 20 'rare',
  8 'epic' et **5 'ultra'**. Reformuler : « rareté dans {rare, epic, ultra}, au moins une dans {epic, ultra} ».
- **« SECTEUR NETTOYÉ »** : la bannière **existe déjà** (`_lvSay('SECTEUR NETTOYÉ')`, src/25-levels.js:634).

### G9-17 — PROTOCOLE ABSENT · **ÉTABLI** · mineur
**Où** : test 2 — « climax forcé avec boss invulnérable 90 s », « S.coins +60 en ≤ 1 s ».

Il **n'existe aujourd'hui aucun mécanisme d'invulnérabilité d'ennemi** : `damageEnemy` fait
`if (!e || e.dead) return; … e.hp -= dmg;` (src/10-core.js:484-489), sans drapeau ni temporisation.
Et la séquence d'après-mort est traversée par un écran de cartes qui **gèle le jeu** : `openCards` tient
350 ms de temps de **jeu** à `S.timeScale = 0.15` (src/90-boot.js:815-822), soit ~2,3 s d'horloge murale,
avant de basculer `S.phase` à 'cards' — après quoi la boucle de jeu ne tourne plus.

**À faire.** Écrire le protocole dans le test (« le boss est rendu invulnérable en réarmant `e.hp = e.maxHp`
à chaque image depuis un crochet posé sur `weapons.update`, jamais depuis une évaluation hors de la boucle
d'images »), dater les seuils d'après-mort sur l'horloge murale, et préciser que `S.coins` doit être lu
avant que S.phase ne passe à 'cards'.

### G9-18 — EFFETS DE BORD DU RETRAIT DU FORFAIT · **ÉTABLI** · mineur
**Où** : « quoi » — « supprimer le forfait `_lvPhaseT > _lvPhaseDur` en climax » ; test 3 —
« enemiesCarried à l'entrée d'un niveau = 0 ».

(a) **Sortie unique.** `if ((_lvElites.length && alive === 0 && !_lvPend.length) || _lvPhaseT > _lvPhaseDur)
{ _lvEnterPhase(4); }` (src/25-levels.js:686). Retirer la seconde condition laisse `_lvElites.length &&`,
faux tant que `_lvBossBorn` n'a pas été appelé — et `_lvHatch` sort avant si `spawnEnemy` rend null
(src/25-levels.js:483-484). La partie se bloquerait sans recours, dans un moteur qui met les entités en
quarantaine depuis G1.

(b) **Les portails éclosent pendant 'clear'.** `_lvUpdate` appelle `_lvPhaseTick(dt); _lvPortalTick();
_lvWaves(dt);` (src/25-levels.js:1190-1192) ; `_lvWaves` commence par `if (ph === 'clear') return;`
(src/25-levels.js:547) mais **`_lvPortalTick` n'a aucun garde de phase**. Un ennemi éclos en fin de 'clear'
(5 à 6 s) n'a pas le temps de fuir jusqu'au bord.

**À faire.** Garder une soupape très longue plutôt que supprimer le forfait, et purger `_lvPend` à la mort
du boss en même temps que S.enemies. Contrôler `enemiesCarried === 0` sur **les 20 parties**, pas en médiane.

### G9-19 — OUTILLAGE NON VERSIONNÉ · **ÉTABLI** · mineur
Trois des cinq tests s'appuient sur des scripts absents du dépôt : `sim.mjs`, `en-bossfx.mjs` et `en-sim.mjs`
(plus `sim-lib.mjs` et `en-probe.mjs` dont ils dépendent) vivent **uniquement dans le dossier temporaire de
session**. `git ls-files tools/test` ne contient ni sim.mjs, ni en-sim.mjs, ni en-bossfx.mjs. Si le conteneur
redémarre, trois tests sur cinq deviennent irreproductibles, **et avec eux toutes les valeurs de référence
entre parenthèses**.

**À faire.** Copier les cinq fichiers dans `snake2030/tools/test/G9/` **avant** d'ouvrir l'implémentation,
comme cela a été fait pour G1 à G6.

---

# G10 — Interface à l'échelle de l'écran

**Verdict : pièges sérieux.** 18 points retenus, 3 bloquants. Les prémisses du « pourquoi » sont, elles,
presque toutes vérifiables et exactes (score plafonné à 30 px par un clamp, JOUER 320×78 par min-width et
height, textes à 7-8 px sur iPhone, défaut SOUTENU sous STANDARD). **Ce sont les tests et les prescriptions
du « quoi » qui portent les pièges.** Une réserve a été requalifiée (voir fin de section).

### G10-1 — SEUIL INATTEIGNABLE · **ÉTABLI** (borne) / **À VÉRIFIER** (coefficient exact) · bloquant
**Où** : « quoi » — « font-size = min(clamp(26px,10vh,76px), 0,9 × innerWidth / (**0,68** × nombre de
caractères)) » ; test 3 — « overflow ≤ 0 px pour toutes les chaînes de bannière ».

**Le diviseur 0,68 em par caractère est arithmétiquement trop petit.** La règle actuelle pose
`letter-spacing:.2em` (src/26-ui.js:231) : **0,2 em de chaque caractère est de l'entre-lettrage pur**, ce qui
ne laisse que **0,48 em** d'avance moyenne de glyphe. Les chaînes de bannière sont toutes en **capitales**
(`_uiBanner` fait `('' + text).toUpperCase()`, src/26-ui.js:1215), la pile de polices est
`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial` (src/26-ui.js:76) et les capitales
d'une grasse 900 y avancent de **0,61 à 0,78 em** ; le tiret cadratin « — » vaut 1,0 em à lui seul. Le
coefficient réel est donc de l'ordre de **0,85 à 0,90**, jamais 0,68.

**Cohérence interne** : la mesure citée par le « pourquoi » (« débordent de 278 px ») implique elle-même un
coefficient de 0,87 à 0,90 selon la fenêtre. **C'est la spec qui se contredit, pas le code.**

Chaînes concernées : `'NIVEAU ' + n + ' — ' + _lvDef.name` (src/25-levels.js:1172) avec 'LA GRILLE' (l.55),
'AUTOROUTE NÉON' (l.92), 'ZONE MAGNÉTIQUE' (l.131), 'SURCHARGE' (l.169) ; 'SURCHARGE DU SECTEUR' (l.593) ;
'SECTEUR NETTOYÉ' (l.634) ; 'PROTOTYPE ZÉRO' (l.69), 'DOUBLE LAME' (l.109), 'NOYAU MAGNÉTIQUE' (l.146) ;
'RALENTI' et 'REPLI' (src/27-phases.js:508, 528).

**Protocole (mesure indispensable avant de figer le coefficient)** : sur le build servi, poser
`b.textContent = 'NIVEAU 3 — ZONE MAGNÉTIQUE'`, fixer font-size à 100 px, lire
`b.getBoundingClientRect().width / 100` → la somme en em. Refaire pour les onze chaînes et **retenir le
maximum du rapport largeur / (taille × nombre de caractères)**.

**À faire.** Remplacer 0,68 par ce maximum, **ou** supprimer `letter-spacing:.2em` sur `.s2ban>b` (0,68
redevient alors tenable), **ou** renoncer à la formule et dimensionner par mesure (réduction jusqu'à
`scrollWidth ≤ clientWidth`).

### G10-2 — CONTRADICTION · **ÉTABLI** · bloquant
La formule de bannière du « quoi » est écrite **sans le facteur `var(--uis)`**, alors que la règle actuelle
le porte : `font:900 calc(var(--uis)*clamp(26px,10vh,76px))/1 var(--fs)` (src/26-ui.js:230). Avec le nouveau
`--uis = clamp(innerHeight/720, 1, 2,2) × uiScale`, à 1920×1080 --uis vaut 1,5 et la taille deviendrait
**114 px** ; à 1440×900, 1,25 × 73,3 = **91,6 px**. Le test 3 mesure précisément ces deux fenêtres.

**À faire.** Écrire explicitement
`font-size: min(calc(var(--uis)*clamp(26px,10vh,76px)), calc(0.9*100vw/(K*var(--n))))`, où `var(--n)` est
posé en JS par `_uiBanner` et K le coefficient mesuré ci-dessus.

### G10-3 — SEUIL INATTEIGNABLE · **ÉTABLI** · bloquant
**Où** : test 3 et « quoi » — « bannière NIVEAU 1 — nom émise à **S.t < 1 000 ms** ».

**`S.t` n'est pas une horloge de partie mais une horloge de PAGE.** Elle est déclarée à 0 au chargement
(`t: 0`, src/10-core.js:44) et **n'est remise à zéro nulle part** (`grep "S.t = " src/*.js` ne renvoie
aucun résultat ; `resetRun` ne la touche pas, src/90-boot.js:878-905). `frame()` l'incrémente dans
**toutes** ses branches, y compris celle du menu (src/90-boot.js:559, 583, 588, 592). Entre le chargement,
le menu, la réécriture éventuelle de localStorage pour obtenir un « profil non vierge » et le clic sur
JOUER, S.t vaut déjà plusieurs milliers de millisecondes.

**Second obstacle sur le même point** : aujourd'hui la bannière de niveau 1 **n'est jamais émise**, parce
que `levels.start(1)` est appelé depuis `resetRun()` (src/90-boot.js:904) **avant** que `S.phase` passe à
'play' (src/90-boot.js:917-918), et que `_lvSay` retourne immédiatement si `S.phase !== 'play'`
(src/25-levels.js:293-295 et 1171).

**À faire.** Remplacer la grandeur. Deux candidats déjà corrects : **`S.levelT`**, remis à 0 par `resetRun`
(src/90-boot.js:882) et incrémenté seulement en jeu (src/90-boot.js:565) → « `S.levelT < 1` » ; ou
**`ui.runTime()`** (`_uiRunMs` remis à 0 à l'affichage du menu). Et corriger l'ordre resetRun / S.phase, ou
émettre la bannière depuis `startRun`.

### G10-4 — SEUIL AMBIGU · **ÉTABLI** · majeur
**Où** : test 4 — « contexte reducedMotion 'reduce' : `fx.shakeAmount() === 0` **100 ms après**
`fx.shake(30)` ».

Deux lectures, une seule passe. Si « Réduire les mouvements » est câblé sur le mécanisme existant,
l'atténuation vaut **0,3 et non 0** : `function _fxShakeF() { return (o && o.reduceShake) ? 0.3 : 1; }`
(src/20-fx.js:178-181), `var v = amount * _fxShakeF(); _fxShake += v;` (src/20-fx.js:335). L'amortissement
est `old *= Math.pow(1e-13, dt); old -= 1.2 * dt; … if (_fxShake < 0.02) _fxShake = 0;`
(src/20-fx.js:468-477), soit ×0,607 par image à 60 Hz moins 0,02.

`fx.shake(30)` dépose 9 unités, puis **5,43 / 3,27 / 1,96 / 1,17 / 0,69 / 0,40** aux six images suivantes —
soit **≈ 0,4 à 100 ms**, et il faut une dizaine d'images (≈ 175 ms) pour tomber sous 0,02. Même sans
atténuation, 30 unités donnent 1,49 à 100 ms. **Le test n'est atteignable qu'en bloquant la secousse à la
source**, ce que le « quoi » ne dit pas.

**À faire.** Écrire : « avec reduceMotion, `_fxShakeF()` retourne 0, donc `fx.shakeAmount()` vaut 0
immédiatement et à tout instant ensuite ». Pour la mesure, appeler `__M.fx.shake(30)` **depuis un crochet
posé DANS une image** (requestAnimationFrame) et relever aussi `S.shakeX/S.shakeY`, qui sont ce que la
caméra lit réellement.

### G10-5 — ÉNUMÉRATION INCOMPLÈTE · **ÉTABLI** · majeur
**Où** : « quoi » — sept familles de planchers ; test 2 — « minimum des font-size **de tous les nœuds texte
visibles** ≥ 11 px ».

Le « quoi » énumère sept familles ; le test mesure le **minimum sur tous les nœuds** de sept écrans. Restent
sous 11 px sur iPhone 13 paysage (--uis = 1, 1 vh = 3,9 px) et **ne figurent pas dans l'énumération** —
vérifié ligne à ligne dans src/26-ui.js :

| sélecteur | taille sur iPhone | ligne |
|---|---|---|
| `.s2lv>b` (« NIVEAU n ») | 10 px | 133 |
| `.s2lv>s` (nom de niveau) | 9 px | 135 |
| `.s2boss>b` | 10 px | 145 |
| `.s2ann>s` (sous-titre de toast) | 9 px | 159 |
| `.s2pill` (RÉGLAGES / DÉBLOCAGES / RETOUR) | 10 px | 292 |
| `.s2kv>s` (MEILLEUR / CRÉDITS / PARTIES) | 8 px | 311 |
| `.s2card .lv` (« NIV 2 » / « NOUVEAU ») | 9 px | 340 |
| `.s2tile>s` | 7 px | 352 |
| `.s2tile.wide>b` (la tuile ARME) | 9 px | 359 |
| `.s2rec` | 10 px | 363 |
| `#ui .s2seg2>button` (segments des réglages) | 10 px | 388 |
| `.s2u s` / `#ui .s2u>button` (déblocages) | 9 / 10 px | 399, 401 |

Un implémenteur qui applique le « quoi » à la lettre **échoue au test 2 sur au moins cinq des sept écrans**.

**À faire.** Compléter l'énumération. Pour la mesure, parcourir le DOM de chaque écran affiché
(`#ui *`), retenir les nœuds portant un nœud texte non vide dont le rect a une aire > 0, et **journaliser le
sélecteur du minimum**, sans quoi l'échec est illisible.

### G10-6 — CONFLIT AVEC UN INVARIANT · **ÉTABLI** · majeur
**Quatre règles de police ne contiennent pas `var(--uis)` du tout** : le réglage « Taille de l'interface »
n'a aucun effet sur elles, donc le seuil « ≥ 16 px à 150 % » leur est **inatteignable par construction**.

- **`#fsb`** — le bouton « Plein écran », que **l'invariant de la joueuse interdit de retirer** et que
  `invariants.mjs` vérifie : `'#ui #fsb{… font:600 10px/1.2 system-ui,sans-serif;'` (src/90-boot.js:1099),
  affiché sur les écrans menu et over (src/90-boot.js:1188). Il rate donc aussi le plancher bureau de 12 px,
  et **il vit dans une feuille de style posée par 90-boot.js, fichier absent du périmètre du « quoi »**.
- **`.s2kcap`** — 9 px fixes (capuchons d'aide de G4, src/26-ui.js:99-100), visibles sur le HUD pendant les
  trois premières parties.
- **`.s2keys`** — 12 px fixes (src/26-ui.js:95) : passe à 100 %, échoue à 150 %.
- **`#ui .s2pause`** — 13 px fixes, **38×38 px** (src/26-ui.js:183-185), alors que le même test 1 exige une
  largeur ≥ 48 px.

**À faire.** Étendre le périmètre du « quoi » à la feuille de style de 90-boot.js et donner à ces quatre
règles un facteur `var(--uis)` avec plancher 11 px (12 sur bureau). Pendant la mesure, forcer `.s2hud.kc`
pour rendre les capuchons opaques, sinon on mesure des nœuds à opacité 0 que le compte inclura quand même.

### G10-7 — CONTRADICTION · **ÉTABLI** · majeur
**Où** : « quoi » — « le toast attend la fin de la bannière (1,15 s) » ; test 3 — « **jamais** `.s2ban.on` et
`.s2ann.on` simultanément ».

Le « quoi » n'ordonne l'attente **que dans un sens**, alors que le test interdit le recouvrement dans les
deux. Or un toast dure **1 900 ms** (`setTimeout(…, 1900)`, src/26-ui.js:1207-1210) et une bannière
**1 200 ms** (src/26-ui.js:1224), et la bannière peut être déclenchée à n'importe quel instant par
**sept sources indépendantes** : src/25-levels.js:593, 609, 634, 1172 et src/27-phases.js:121, 508, 528.
Les toasts « ULTIME PRÊT » et « POUVOIR PRÊT » sont émis par le cœur (src/90-boot.js:856, 862), sans
coordination.

Second écart : **1,15 s est la durée de l'ANIMATION CSS** (src/26-ui.js:233) ; la classe `.on`, elle, est
retirée à **1 200 ms**. Un toast qui attend 1 150 ms laisse 50 ms de recouvrement — exactement la période
d'un sondage à 20 Hz.

**À faire.** Reformuler en **exclusion mutuelle explicite** dans les deux sens, caler l'attente sur 1 200 ms,
et sonder les deux classes **dans le même rappel d'animation** en journalisant l'horodatage des transitions
(un recouvrement de 50 ms échappe à un sondage à 20 Hz une fois sur deux).

### G10-8 — COLLISION DE NOM · **ÉTABLI** · majeur
**Où** : « quoi » — « l'ultime est renommé **SURTENSION** partout … pour ne plus partager son nom avec la
phase SURCHARGE ».

**SURTENSION est déjà le nom d'une carte** : `{ id: 'chainPlus', name: 'SURTENSION', icon: '✳', axis: 'elec' … }`
(src/24-upgrades.js:244). Le renommage **recrée exactement la collision qu'il prétend supprimer**, et
l'énumération « (jauge, toast, cartes, aide) » devient auto-contradictoire : sur l'écran des cartes,
« SURTENSION » désignerait à la fois l'ultime et une carte sans rapport. Le test « 'SURTENSION' ≥ 3 » serait
par ailleurs satisfait **à froid** par cette seule carte si le comptage porte sur un fichier.

**À faire.** Choisir un autre nom (absent de 24-upgrades.js **et** de 25-levels.js), ou renommer `chainPlus`.

### G10-9 — CRITÈRE NON MÉCANISABLE · **ÉTABLI** · majeur
**Où** : test 3 — « grep 'SURCHARGE' dans l'interface de l'ultime = 0 occurrence ».

« L'interface de l'ultime » n'est pas un périmètre mécanisable, et « grep » suggère un fichier. Or SURCHARGE
est un mot **légitime** à six endroits sans rapport avec l'ultime : l'accroche du menu
(`'ARCADE SURVIE — SURVIS À LA SURCHARGE'`, src/26-ui.js:658), un commentaire (src/26-ui.js:1393), le nom du
niveau 4 (src/25-levels.js:169), le nom de son boss (l.183), la bannière de phase (l.593) et un commentaire
(l.12). Un grep sur 26-ui.js renvoie au moins une occurrence et **échoue par construction**.

**À faire.** Réécrire en termes de **nœuds DOM** : « le textContent de l'étiquette de jauge d'ultime, du toast
de disponibilité, de la légende des touches et des cartes qui mentionnent l'ultime ne contient pas
'SURCHARGE' », relevés par référence et non par grep de fichier.

### G10-10 — CONTRADICTION INTERNE · **ÉTABLI** · majeur
**Où** : test 3 — « aucun texte ∈ {GRILLE, ESPACE, ROULIS, PERSPECTIVE} » et, **dans la même phrase**,
« premier appel … avec /NIVEAU 1/ ».

Le niveau 1 s'appelle **'LA GRILLE'** (src/25-levels.js:55) et la bannière est
`'NIVEAU ' + n + ' — ' + _lvDef.name` (src/25-levels.js:1172) : elle **contient GRILLE**. En lecture
« appartenance stricte à l'ensemble » les deux clauses coexistent ; en lecture « aucune de ces chaînes
n'apparaît » (la façon naturelle d'écrire une alternance de regex) la phrase s'auto-contredit. Le piège se
referme aussi sur le tag de phase de 11 px que le « quoi » demande, qui affichera bien
GRILLE / ESPACE / ROULIS / PERSPECTIVE dans le DOM (src/27-phases.js:105-110).

**À faire.** Écrire : « le texte **passé à `ui.banner`** n'est **égal** à aucune de ces quatre chaînes »
(égalité stricte sur l'argument, jamais sur le DOM) ; envelopper `__M.ui.banner` et comparer par `===`.

### G10-11 — DÉPENDANCE MANQUANTE · **ÉTABLI** · majeur
Le « quoi » délègue la file d'attente des bannières à **G9**, qui n'est pas livré et **n'apparaît pas dans
`depend_de` : ["G2","G4"]**. Or le test 3 repose dessus.

**À faire.** Trancher au pilotage : ajouter G9 à `depend_de` et ordonner G9 avant G10, ou réécrire la
parenthèse en « file d'attente à construire ici, réutilisée par G9 ».

*Correction apportée au rapport de relecture* : l'argument « deux des bannières que la file devra gérer
(SECTEUR NETTOYÉ, bannière de boss) n'existent qu'à partir de G9 » est **faux pour SECTEUR NETTOYÉ**, qui est
déjà émise aujourd'hui (src/25-levels.js:634). La dépendance reste réelle pour la file elle-même.

### G10-12 — SEUIL QUI NE MESURE PLUS SON DÉFAUT · **ÉTABLI** · majeur
**Où** : test 1 — « JOUER.left − logo.right ≤ 400 px » ; « quoi » — « menu en **colonne** centrée ».

Le test mesure un écart **horizontal**, ce qui n'a de sens que dans la disposition actuelle en ligne
(`.s2menu{flex-direction:row…}`, `.s2mL{flex:1 1 0}`, `.s2mR{flex:0 0 auto}`, src/26-ui.js:297-299), d'où les
« 3 000 px de vide » du « pourquoi ». Dans la colonne centrée prescrite, logo et bouton sont l'un au-dessus de
l'autre : `JOUER.left − logo.right` vaut une valeur **négative** quelle que soit la distance verticale réelle.
Le test devient **toujours vert** et ne peut plus détecter le défaut pour lequel il a été écrit.

**À faire.** Remplacer par `JOUER.top − logo.bottom ≤ 400 px`, et ajouter que les deux centres horizontaux
coïncident à ±8 px. Relever les deux rects dans la même image.

### G10-13 — CRITÈRE VIDE DE SENS · **ÉTABLI** · majeur
**Où** : test 2 — « pour chaque `.s2tile>b`, `.s2card .nm`, `.s2card .ds` : scrollWidth ≤ clientWidth et
scrollHeight ≤ clientHeight ».

Le critère mord sur `.s2tile>b` (nowrap + overflow hidden + ellipsis, src/26-ui.js:352-359), où
`scrollWidth > clientWidth` signale bien une troncature. Il est **vide de sens** pour `.s2card .nm` et
`.s2card .ds` : ces deux éléments n'ont ni hauteur imposée, ni `overflow:hidden`, et leur texte se replie
(`word-break:break-word`, src/26-ui.js:334-337) — leur `scrollHeight` est égal à leur `clientHeight` quoi
qu'il arrive. Le débordement réel se produit **au niveau de la carte**, dont le contenu déborde d'une rangée
plafonnée par `max-height:clamp(120px,52vh,250px)` (src/26-ui.js:328) — plafond que le « quoi » ne nomme pas
alors qu'il exige une « hauteur proportionnelle ».

**À faire.** Déplacer le critère sur la carte : `.s2card.scrollHeight ≤ .s2card.clientHeight + 1` **et**
`card.bottom ≤ cardrow.bottom + 1`. Garder le critère nowrap sur `.s2tile>b`. Mesurer avec les descriptions
les plus longues du jeu.

### G10-14 — ÉTALONNAGES À FIGER · **ÉTABLI** · majeur
Trois détails à écrire avant l'implémentation.

(a) Sur iPhone 13 paysage, `.s2score` ne vaut pas 17 px mais **17,16 px** (4,4 vh de 390 px, au-dessus de la
borne basse de 17 px : `clamp(17px,4.4vh,30px)`, src/26-ui.js:121). Une égalité stricte échouerait sur une
valeur pourtant inchangée — écrire une tolérance.

(b) **La hauteur de JOUER ne porte pas `var(--uis)`** : `height:clamp(46px,13.5vh,78px)` et
`min-width:clamp(150px,34vw,320px)` (src/26-ui.js:273-274). « ≥ 120 px » à 1440 de haut exige donc de mettre
cette hauteur à l'échelle, ce que le « quoi » ne dit nulle part (il ne parle que des polices). Idem pour
`.s2pause`, figé à 38×38 px.

(c) **`_uiApplyOpt` borne `--uis` à [0,7 ; 1,6]** : `r.style.setProperty('--uis', '' + clamp(o.uiScale, 0.7, 1.6));`
(src/26-ui.js:1004). Si le facteur d'écran est introduit sans élargir cette borne, --uis plafonne à 1,6 à
2560×1440 et `.s2score` vaut 48 px, **sous les 56 exigés**. Il faut au moins [0,7 ; 3,3] pour couvrir 2,2 × 1,5.

**À faire.** Écrire les seuils avec tolérance, compléter le « quoi » (hauteur de JOUER, gabarit de `.s2pause`,
bornes de la clamp de --uis). Après chaque changement de gabarit, **attendre au moins 300 ms avant de lire
les styles** : l'interface ne se recalcule que 70 ms après un resize et 220 ms après un orientationchange
(src/26-ui.js:1535-1536).

### G10-15 — SOURCES DE BANNIÈRE NON MAÎTRISÉES · **ÉTABLI** · mineur
**Où** : test 3 — « sur 30 s de jeu, `ui.banner` appelé ≤ 1 fois ».

Deux pouvoirs appellent `ui.banner` hors de `startPhase` : RALENTI (src/27-phases.js:508) et REPLI
(l.528). Ils ne sont pas donnés au départ (`owned = ['ghost']`, src/27-phases.js:604), mais une carte peut
les octroyer et un pilote qui appuie sur le bouton pouvoir ferait passer le compte à 2. Le reste est sûr :
le niveau 1 dure 104 s, aucune montée de secteur n'intervient dans la fenêtre.

**À faire.** Écrire « aucun pouvoir n'est déclenché pendant les 30 s », ou compter séparément les bannières
de pouvoir, ou dire dans le « quoi » qu'elles deviennent des toasts.

### G10-16 — PÉRIMÈTRE DE FICHIERS INCOMPLET · **ÉTABLI** · mineur
Le « quoi » n'annonce que **deux** fichiers ; **quatre au moins** doivent être touchés pour satisfaire ses
propres tests :
- **src/10-core.js** pour la table DIFFS (`var DIFFS = [{ m: 1.25, nom: 'DÉTENDU' }, …]`, src/10-core.js:101-107),
  puisqu'un commentaire de 26-ui.js interdit explicitement de réécrire les libellés côté interface
  (« Les valeurs du sélecteur DOIVENT venir de la table du moteur », src/26-ui.js:863-869) ;
- **src/25-levels.js** pour émettre la bannière NIVEAU 1 (garde `S.phase !== 'play'`, voir G10-3) et pour la
  réserve portée sur le commentaire d'en-tête de `_lvPoint` ;
- **src/90-boot.js** pour la police de `#fsb` et l'ordre resetRun / S.phase ;
- **src/24-upgrades.js** si le renommage de l'ultime touche des cartes.

Contrôle après coup : `invariants.mjs`, exécuté par `run.mjs nr`, exige `S.opt.diff === 1.55`
(tools/test/invariants.mjs:76) ; il ne lit **aucun libellé**, le renommage FACILE/NORMAL/… est donc sans
risque de ce côté.

La **réserve portée sur G10** au sujet du commentaire de `_lvPoint` est exacte : l'en-tête annonce
« R >= max(view.w, view.h)/2 + 150 » (src/25-levels.js:364-365) alors que le corps prend
`hypot(demi-w, demi-h) + 150` (l.377). Les deux bornes sont compatibles ; la ligne égare le lecteur, à
corriger au passage.

### G10-17 — CHIFFRES DU « POURQUOI » NON REPRODUCTIBLES · **À VÉRIFIER** · mineur
« 278 px de débordement », « 3 000 px de vide », « 15 restent sous 11 px au réglage maximal » : trois mesures
dont **la fenêtre n'est pas indiquée**. La première sert de calibrage implicite à la formule de bannière
(voir G10-1) ; la deuxième dépend de la largeur (le menu est en ligne avec `.s2mL{flex:1 1 0}`) ; la
troisième est un compte de **nœuds**, pas de règles — au réglage maximal actuel (1,25), seules les règles à
borne basse 7 et 8 px restent sous 11 px, plus celles qui ne portent pas `var(--uis)`.

**Protocole.** (1) Débordement = `banT.scrollWidth − ban.clientWidth` pour les onze chaînes, sur les quatre
fenêtres du test. (2) Écart logo → JOUER à 3440×1440, les deux rects **dans la même image**. (3) Compte de
nœuds sous 11 px en parcourant le DOM de chaque écran avec uiScale au maximum, **en journalisant le
sélecteur de chacun**. Aucune de ces mesures ne doit être lancée tant qu'une autre chaîne mesure en parallèle.

### G10-18 — RÉSERVE « PANNE DE BOOST » : REQUALIFIÉE · **À VÉRIFIER** · mineur
La réserve portée sur G10 est **déjà marquée « CONTESTÉE, à trancher par la mesure avant d'agir »** dans
goal-status.json, et elle contient déjà l'analyse de la feuille de style. Il n'y a donc rien de neuf à
signaler de ce côté, et **rien à corriger tant que la mesure n'a pas eu lieu**.

Le seul élément neuf, à ajouter au protocole existant : **à la panne, l'arc de jauge a une longueur nulle.**
`_uiArc(el, v)` pose `el.style.strokeDashoffset = (el._uc0 * (1 - q/128))` (src/26-ui.js:428-432), donc à
`v = 0` l'offset vaut la circonférence entière et l'arc ne dessine rien. Une « correction » qui ajouterait
une couleur rouge à `.arc` dans l'état `.dry` **ne changerait aucun pixel**. Si l'anneau attendu est l'arc de
jauge, le correctif n'est pas une couleur mais un **tracé** : dessiner l'anneau complet en rouge pendant
l'éclat, indépendamment de la valeur de la jauge.

**À noter aussi** : ni le « quoi » ni aucun test de G10 ne mentionne cette réserve, qui fait pourtant partie
de son contrat.

---

# G11 — Lisibilité visuelle

**Verdict : pièges sérieux.** 21 points retenus, 4 bloquants. C'est la spec la plus fragile de la vague :
**quatre de ses propres seuils sont arithmétiquement inatteignables avec les couleurs qu'elle prescrit
elle-même.**

### G11-1 — CONTRADICTION + SEUIL INATTEIGNABLE · **ÉTABLI** · bloquant
**Où** : test 4 — « pixel de contour d'un ebullet : luminance ≥ luminance du centre + 60 » ; « quoi » —
« tirs ennemis orange à **cœur jaune #ffe45e**, contour blanc 1 px **et noyau sombre** ».

(a) **La phrase se contredit elle-même** : elle demande dans la même proposition un cœur jaune **et** un
noyau sombre.

(b) **Le seuil est impossible sous la lecture « cœur jaune ».** Luminance Rec.709 des octets sRGB de
#ffe45e = 0,2126×255 + 0,7152×228 + 0,0722×94 = **224,1**. Le contour le plus clair possible est le blanc
pur, 255. **255 − 224,1 = 30,9**, soit la moitié des +60 exigés.

(c) Aujourd'hui le code fait **l'inverse** de ce que le test suppose : `ctx.fillStyle = '#fff';
ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();` (src/90-boot.js:504-505) — le centre est
déjà blanc, donc le test échoue à 100 % sur le build actuel.

**À faire.** Trancher la phrase. Si « noyau sombre » : écrire « noyau #05060f (ou plus sombre que 60/255),
halo orange #ff6a00, contour blanc 1 px » et supprimer le cœur jaune. Si « cœur jaune » : remplacer le seuil
par un contraste WCAG contour/cœur, ou par « luminance du contour ≥ luminance de l'anneau orange + 60 ».
Relever le pixel central et le pixel à b.r + 1 px **dans la même image**.

### G11-2 — SEUIL INATTEIGNABLE (pointillés) · **ÉTABLI** · bloquant
**Où** : test 4 — « contraste ligne/fond ≥ 2:1 sur ≥ **90 %** de 16 points » (ligne de visée d'artilleur) et
« cercle d'armement de mine ≥ 1,6:1 sur ≥ **80 %** de 24 points ».

**Les deux tracés visés sont en pointillés**, et le taux de points tombant sur de l'encre est borné par le
rapport cyclique :
- `_EN_D_AIM = [13, 9]` → **13/22 = 59,1 %** (src/22-enemies.js:17), utilisé par `_enSight`
  (src/22-enemies.js:110-118) pour la ligne de visée (src/22-enemies.js:1113-1114) ;
- `_EN_D_SCAN = [5, 7]` → **5/12 = 41,7 %** (src/22-enemies.js:18), utilisé pour le cercle d'armement de la
  mine (src/22-enemies.js:1098-1101).

16 points sur la ligne donnent donc ~9,5 touches sur 16, pas 15 ; 24 points sur le cercle donnent ~10 sur 24,
pas 19. Et `lineDashOffset` est **animé** (`-S.t / 26` pour `_enSight`, `S.t / 18` pour `_enDanger`), donc la
phase varie d'une image à l'autre : **le résultat est une loterie, pas un seuil.** Le « quoi » interdit par
ailleurs de supprimer les pointillés (« pointillés ≥ 8 px CSS ») — et les allonger ne change pas le rapport
cyclique.

**À faire.** Remplacer « X % des points » par un critère insensible au pointillé : échantillonner N points,
ne garder que ceux dont la luminance dépasse le fond local d'au moins 10 (les points d'encre), exiger le
contraste sur ≥ 90 % de **ceux-là**, avec un plancher de couverture séparé (« au moins 45 % des 16 points
sont de l'encre ») ; ou mesurer le maximum de contraste sur une fenêtre glissante d'**une période de
pointillé** (22 u pour AIM, 12 u pour SCAN). Fixer `window.__DT` pour que la phase soit reproductible.

### G11-3 — LA PALETTE PRESCRITE ÉCHOUE AU TEST 1 DE G11 · **ÉTABLI** (recalculé par le pilote) · bloquant
**Où** : test 1 — « 0 paire inter-catégorie avec ΔE76 < 25 ou Δteinte < 40° » ; « quoi » — la palette.

`av-palette.mjs` (dont `palette.mjs` doit être « étendu ») définit la teinte comme **l'angle de teinte Lab**
(`hue = atan2(b*, a*)`, av-palette.mjs:19). **Recalcul du pilote sur les seuls hexadécimaux nommés par le
« quoi »** — 16 paires en défaut :

| ΔE76 | Δteinte | paire |
|---|---|---|
| 14,1 | **9°** | core #ffd166 ~ cœur d'ebullet #ffe45e — **double échec** |
| 28,0 | 14° | core ~ tir joueur crème #fff3b0 |
| 33,2 | 5° | cœur d'ebullet ~ tir joueur |
| 54,6 | **5°** | contact #ff2e63 ~ MIROIR #ffb0b0 |
| 30,4 | 19° | contact ~ alerte #ff2b2b |
| 29,6 | 18° | tir/explosif #ff6a00 ~ alerte |
| 54,4 | 37° | contact ~ tir/explosif |
| 39,0 | 19° | contrôle #8a4dff ~ rails #3a7bff |
| 27,0 | 9° | rails ~ rails d'avertissement #6aa0ff |
| … | … | + 7 autres, dont toutes les paires impliquant le blanc |

Trois défauts structurels :
1. Les six couleurs chaudes prescrites tiennent dans un arc de **78°** (contact 16,8° / MIROIR 22,1° /
   alerte 35,4° / tir-explosif 53,4° / core 85,6° / cœur ebullet 94,9°). Un seuil de 40° entre chacune est
   géométriquement impossible.
2. **La règle de teinte est vide de sens pour le blanc** : #ffffff a une chromaticité C\* = 0 et
   `atan2(0,0)` renvoie 296,8° par artefact de virgule flottante, ce qui met le blanc à **8°** des rails.
   Or le « quoi » impose un blanc pour la tête **et** pour les tirs joueur, deux catégories distinctes.
3. **« tir/explosif #ff6a00 » et « tir ennemi #ff6a00 » sont le même hexadécimal dans deux catégories**
   (ΔE = 0), et le gridHot du niveau 3 est identique au joueur (src/25-levels.js:136).

**À faire, avant de toucher aux sources.** (1) Figer la **table des catégories** dans `palette.mjs` — le
« quoi » ne la donne pas, et le compte de paires dépend entièrement d'elle. (2) **Exempter les couleurs
achromatiques (C\* < 12) de la règle de teinte** et ne leur appliquer qu'un critère de clarté L\*.
(3) Écarter MIROIR et alerte du rouge, ou abaisser le seuil inter-catégorie à ~15° et se reposer sur ΔE76.
(4) Refaire le calcul sur la palette candidate **avant** l'implémentation.

### G11-4 — SEUIL INATTEIGNABLE · **ÉTABLI** (recalculé) · bloquant
**Où** : test 1 — « contraste WCAG rails vs #00e5ff ≥ 3,0:1 (1,14) » ; « quoi » — « rails **#3a7bff**
(avertissement #6aa0ff) ».

**La couleur de rail prescrite ne peut pas atteindre le seuil exigé.** Luminances relatives WCAG :
#00e5ff → 0,63259 ; #3a7bff → 0,22285. Contraste = **2,50:1**, sous les 3,0:1 demandés. L'avertissement
#6aa0ff est pire : **1,69:1**. Le gridHot du niveau 1 (#2f7fff) donnerait 2,44:1.

Pour atteindre 3,0:1 il faut une luminance relative **≤ 0,1775** — par exemple #2a55cc (4,18:1).

Note : le chiffre « (1,14) » du test est **juste** et se rapporte à #5ef1ff, la couleur réelle des rails.

**À faire.** Choisir le bleu en **résolvant** le seuil, pas en le postulant ; vérifier ensuite qu'il passe
aussi le critère de teinte (les deux contraintes se disputent le même arc bleu-violet : #3a7bff est à 74° du
cyan mais à 19° du violet de contrôle).

### G11-5 — PRÉMISSE QUI MESURE LA MAUVAISE SURFACE · **ÉTABLI** (arithmétique) / **À VÉRIFIER** (état de
caméra du relevé) · majeur
**Où** : « pourquoi » — « sur iPhone … les traqueurs 6-7 px » ; test 3 — « rayon rendu médian du TRAQUEUR
≥ 9 px CSS sur iPhone (6,4-7,3) » ; « quoi » — « rayons dessinés × 1,35 ».

**Le « 6-7 px » est un relevé du TAMPON du canevas, pas de ce que la joueuse voit.** La sonde renvoie
`rpx: +(rp / p.dpr)` où `rp = rWorld * p.sx` et `p.sx = (CW / S.view.w) * DPR` (av-lib.mjs:63, 70, 85) —
c'est-à-dire `rWorld × SCALE × zoom`, **avant** la transformation CSS du canevas.

Or pendant la bascule à 30° — l'état prescrit par les invariants — `applyPersp` pose sur l'élément
`transform: perspective(…) rotateX(30deg) scale(perspCover(30°))` (src/90-boot.js:716-721) avec
`perspCover(t) = (PERSP_D + sin t)/(PERSP_D cos t) × 1,015`, PERSP_D = 4,6 (src/90-boot.js:693-703).

**Chaîne complète, tous littéraux.** iPhone 13 paysage : SCALE = 844/1600 = 0,5275 (src/90-boot.js:87-89,
K.VIEW_H = 780) ; `zoomBase()` = 1,30 × (4,6 cos30°)/(4,6 + sin30°) = 1,30 × 0,78112 = **1,0155**
(src/27-phases.js:28, 52-54) ; chaser r = 13 (src/22-enemies.js:1692).
Rayon dans le tampon = 13 × 0,5275 × 1,0155 = **6,96 px** — exactement la plage « 6,4-7,3 » citée.
`perspCover(30°)` = 5,1/(4,6 × 0,86603) × 1,015 = **1,2994**.
**Rayon affiché au centre de l'écran = 6,96 × 1,2994 = 9,05 px CSS**, c'est-à-dire **exactement le seuil que
le test réclame**.

Comparaison bureau, même formule : 1440×900 → rayon tampon 12,30 px, affiché 15,98 px, soit **1,78 % de la
hauteur d'écran contre 2,32 % sur iPhone**. Le traqueur occupe **déjà** une part d'écran plus grande sur
iPhone que sur bureau ; avec le ×1,35 il passerait à 3,13 %, soit 1,76 fois la part du bureau.

**Le facteur ×1,35 corrigerait donc un artefact de mesure.**

**Protocole avant de l'implémenter.** Relever **dans la même image**, sur iPhone 13 paysage en phase 'play' :
`M.phases.state()` (zoom et persp), le `rpx` renvoyé par `window.__sampleContrast()`, et
`getComputedStyle(canvas).transform`. Le rayon vu par la joueuse est `rpx × facteur_CSS` au centre (davantage
vers le bas à cause du rotateX, moins verticalement à cause du cos). Si le produit vaut ~9 px, **ne pas
appliquer le ×1,35**. Et si le relevé médian sort à 8,9 px et non 6,96, c'est que la mesure d'origine a été
prise pendant une excursion ZOOM_WIDE (0,77 × 1,30 = 1,00, src/27-phases.js:30) et non sur la médiane.

**Second point à trancher** : le seuil « ≥ 9 px CSS » doit dire s'il se lit **dans le tampon ou à l'écran**,
les deux différant d'un facteur 1,30 pendant la bascule.

### G11-6 — LA SONDE MESURE L'ENNEMI CONTRE SON PROPRE HALO · **ÉTABLI** · majeur
**Où** : « pourquoi » — « le contraste rendu … est sous 3:1 la moitié du temps » ; test 3 — « ≤ 15 % de
relevés < 3 (aujourd'hui **44-61 %**) » ; « quoi » — « halo `_enGlow` limité à 1,6 r ».

`sampleEntity` échantillonne son anneau à `const rr = rp * 1.6 + 6 * p.dpr;` avec le commentaire
« anneau à 1.6 r + 6 px : le fond immédiat (**halo compris**) » (av-lib.mjs:76-77). Or **tous les halos
actuels sont plus larges** : `_enGlow(…, r*2.6, …)` pour le traqueur (src/22-enemies.js:1220), `r*2.8`
pour l'intercepteur (l.1247), `r*2.4` pour l'artilleur (l.1312), jusqu'à `r*3.4` (l.1351), `r*3` (l.1547).

Chiffres : traqueur iPhone rp = 6,96 px, anneau à 1,6 × 6,96 + 6 = **17,1 px**, bord du halo à
2,6 × 6,96 = **18,1 px** → **l'anneau tombe dans le halo**. Sur bureau : anneau 25,7 px, halo 32,0 px →
également dedans.

**Après la modification prescrite** (halo ≤ 1,6 r), le bord du halo tombe à 11,1 px tandis que l'anneau reste
à 17,1 px : il échantillonne alors le **fond sombre**, et le rapport cœur/anneau grimpe **par construction**,
sans que l'ennemi soit plus lisible sur le décor. **Le avant/après comparerait deux grandeurs différentes.**

**À faire.** Découpler la sonde de la grandeur modifiée **avant** de mesurer : fixer le rayon d'anneau à une
valeur indépendante du halo (p. ex. 3,6 r + 6 px, au-delà de tout halo actuel et futur), ou rapporter deux
chiffres. Refaire le relevé de référence (« aujourd'hui 44-61 % ») avec la sonde corrigée **avant** de toucher
aux sources. Utiliser aussi le champ `worst` déjà renvoyé par `sampleEntity` (contraste le plus faible sur les
24 points), qui dit **où** l'entité se perd.

### G11-7 — CONFLIT AVEC UN INVARIANT · **ÉTABLI** · majeur
**Où** : test 1 — « #00e5ff n'apparaît que dans `src/90-boot.js drawSnake` et `src/26-ui.js` ».

Le critère littéral est violé par la feuille de style du **bouton « Plein écran » et de la carte d'aide**,
que l'invariant de la joueuse interdit de retirer : src/90-boot.js:1098, 1110 et 1115 posent #00e5ff dans le
CSS de `#fsb` et `#fshelp`. Ils sont dans 90-boot.js **mais pas dans drawSnake**.

Quatorze autres occurrences hors périmètre du « quoi » : src/10-core.js:410, 413, 734, 885 (gerbes de mort,
impacts, ramassage) ; src/22-enemies.js:958 (mod d'élite GARDE, cité par le « pourquoi » mais **absent du
« quoi »**), 1024, 1043, 1046, 1047, 1535, 1556, 1664, 1894, 1899 ; src/27-phases.js:456 (drawFloor) ;
src/90-boot.js:361, 461 (drawSnake et drawPickups).

**Défaut plus profond** : le critère porte sur un **littéral** alors que le problème décrit est **perceptif**.
Les rails #5ef1ff, la tête #9df5ff, les écailles rgba(120,255,255,.45), le warm #7df9ff du niveau 1, le dust
#6fe8ff du niveau 3 et le #5ef1ff du pouvoir RALENTI produisent le même cyan à l'écran **sans jamais écrire
#00e5ff**.

**À faire.** Deux critères : (a) « #00e5ff n'apparaît dans aucun appel de dessin du canevas hors drawSnake »,
en excluant **nommément** les feuilles de style DOM de 90-boot.js ; (b) un critère de **teinte** sur tous les
littéraux : aucune couleur de teinte HSV dans 165-200° avec S > 0,18 hors drawSnake et UI.

### G11-8 — RECETTE INERTE + CONFLIT MÉCANIQUE · **ÉTABLI** · majeur
**Où** : « quoi » — « drawFloor et **accents des niveaux 1 et 3 → gridHot du niveau** ».

**Coup dans l'eau pour le niveau 3** : son gridHot **est déjà** #00e5ff — `gridHot: '#00e5ff', accent:
'#00e5ff', lane: '#00e5ff', pull: '#00e5ff'` (src/25-levels.js:136-138). `accent → gridHot` est l'identité.
Idem pour la palette de surcharge `_LV_OVERPAL[1]` (src/25-levels.js:35-37). Le niveau 1 est le **seul** cas
où la recette agit (accent #00e5ff → gridHot #2f7fff, src/25-levels.js:60-62).

**Conflit mécanique** : le niveau 3 pose `hint: 'CYAN ATTIRE, AMBRE REPOUSSE'` (src/25-levels.js:131) et la
couleur d'attraction du champ est `pull: '#00e5ff'`. Retirer le cyan du décor du niveau 3 **sans réécrire
l'indication rendrait l'indication fausse**, ce qui coûte plus de lisibilité que le cyan n'en gagne.

**Erreur de localisation** : `drawFloor` est à **src/27-phases.js:447**, pas 405 ; la ligne 405 tombe à
l'intérieur de `visibleExtent()`, la fonction visée par la réserve du même objectif — confusion facile. Et
`drawFloor` **sort tôt si la qualité de particules est sous 0,6** (src/27-phases.js:451), donc un relevé pris
en qualité dégradée ne mesure pas la même chose.

**À faire.** Énumérer les entrées de palette réellement à changer plutôt qu'une règle : niveau 3
gridHot/accent/lane/pull/dust (l.136-138), `_LV_OVERPAL[1]` (l.35-37), niveau 1 accent et pull (l.61-62),
niveau 2 pull (l.99). Décider du couple mécanique du niveau 3 et réécrire `hint` dans la même modification.
Relever `S.partEff / S.opt.particles` **dans la même image que la capture**.

### G11-9 — DESTRUCTION D'UN CODAGE LIVRÉ PAR G6 · **ÉTABLI** · majeur
**Où** : « quoi » — « couleur unique d'alerte #ff2b2b ».

Le crochet d'impact de l'artilleur **passe du orange au rouge exactement quand le tir va blesser** :
`ctx.strokeStyle = e.hkHot ? _EN_ALERT : _EN_EBULL;` (src/22-enemies.js:1123), précédé du commentaire
« le crochet se pose sur l'impact prédit ; rouge = ça blesse (tête ou 8 premiers anneaux) » (l.1121).
`_EN_ALERT` vaut déjà '#ff2b2b' et `_EN_EBULL` '#ff6a00' (src/22-enemies.js:12-13). C'est la **contrepartie
visuelle** de l'absorption des balles au-delà du 8ᵉ anneau livrée par G6 (fafb2a0). Uniformiser tous les
télégraphes en #ff2b2b supprime la distinction « ce tir me touche » / « ce tir passe dans la queue ».

Même remarque pour `_enTeCutter` (l.1138) et la mine non armée (l.1096), qui utilisent `col`, la couleur de
l'ennemi, pour dire **qui** prépare le coup.

**À faire.** Distinguer dans la spec la couleur d'**alerte imminente** de la couleur d'**identité** du
télégraphe : « toute alerte à moins de 300 ms de l'impact est en #ff2b2b ; au-delà, le télégraphe garde la
couleur de famille de son ennemi ». Rejouer `tools/test/G6/mesure-artilleur.mjs` après la modification.

### G11-10 — UN TÉLÉGRAPHE QUI MENTIRAIT DE 35 % · **ÉTABLI** · majeur
**Où** : « quoi » — « sur écran de hauteur < 480 px CSS : rayons dessinés × 1,35 (pas les rayons de
collision) ».

Sous la lecture large de « rayons dessinés », le facteur s'appliquerait aussi à **trois cercles dessinés au
rayon réel de jeu** :
- **Mine** : `_enDanger(ctx, e.x, e.y, e.blast, k, _EN_ALERT)` (src/22-enemies.js:1107) avec `blast: 140`
  (l.1711), et l'explosion réelle est `_enBlast(e.x, e.y, e.blast, …)` (l.1857). Le commentaire de
  `_enDanger` dit « montre **exactement** la zone qui va faire mal » (l.120). À ×1,35 le cercle annoncerait
  189 u pour une explosion de 140 u.
- **Cercle d'armement** : `e.armR = 132` (l.1711), tracé à l'identique (l.1099).
- **Brouilleur** : `var r = e.fr || e.field;` (l.1153) avec le commentaire « la coque : c'est elle qui mange
  les tirs », alors que l'absorption réelle est `if (d < e.fr)` (l.800).

C'est frontalement contraire à l'objet de G6.

**À faire.** Restreindre par écrit : « ×1,35 sur le rayon de silhouette `e.r` utilisé par les fonctions
`_enDr*` uniquement ; **jamais** sur un rayon qui correspond à une portée de jeu (armR, blast, field,
lungeR, range) ». Contrôle : relever le rayon en pixels du cercle rouge et le comparer à
`e.blast × SCALE × zoom` **dans la même image** ; écart < 5 %.

### G11-11 — PORTÉE DU CLAMP DE lineWidth · **ÉTABLI** · majeur
**Où** : test 3 — « aucun `ctx.lineWidth` effectif < 2 px CSS (prototype intercepté) » ; « quoi » — clamp
posé sur src/22-enemies.js **seulement**.

Le test couvre tout le rendu, le « quoi » ne corrige qu'un fichier. **Comptage du pilote : onze littéraux
strictement inférieurs à 2 dans des fichiers que le « quoi » ne touche pas** — src/23-weapons.js:1286
(1.8), 1295 (1.6), 1406 (1.6), 1469 (1.6), 1503 (1.8), 1701 (1.6), 1783 (1.2) ; src/25-levels.js:1260 (1),
1455 (1.5) ; src/27-phases.js:457 (1.5, drawFloor) ; src/90-boot.js:57 (1). S'y ajoutent les rails en
avertissement : `ctx.lineWidth = warn ? 2 : HALF * 2` (src/27-phases.js:355) — 2 u font 1,06 px CSS sur
iPhone.

**Et appliquer le test à la lettre détruirait la hiérarchie visuelle** que le même objectif cherche à créer :
src/25-levels.js:1260 et 1455 et drawFloor sont du **décor de profondeur** ; les porter à 2 px CSS les met à
la même épaisseur que le trait néon fin des ennemis (`_enNeon` wIn de 2 à 2,4 u).

**À faire.** (1) Délimiter : « aucun trait d'**entité** ni de **télégraphe** sous 2 px CSS », en excluant
nommément `levels.drawBack`, `levels.drawFore`, `phases.drawFloor` et `phases.gridDraw`. (2) Définir
« px CSS » : intercepter le **setter** de `lineWidth` ne donne que la valeur brute en unités monde ; il faut
lire `ctx.getTransform()` au moment du `stroke()`, **et** multiplier par le scale CSS du canevas (1,2994 à
30°). **Instrumenter `stroke()`, pas le setter**, et rapporter `min(|a|,|d|) × lineWidth × facteur CSS`.

### G11-12 — FORMULE ANISOTROPE · **ÉTABLI** · majeur
**Où** : « quoi » — « lineWidth = max(w, 2 / (SCALE × zoom)) ».

La formule ne garantit 2 px que **sur un axe**. `drawWorld` pose
`var sx2 = SCALE * zm, sy2 = SCALE * zm * (1 - tl * 0.42);` (src/90-boot.js:651) : l'échelle verticale est
plus petite dès que `tilt()` est non nul. Un trait **horizontal** voit son épaisseur portée par l'axe
vertical : à tilt 0,5, `2 / (SCALE × zoom)` unités monde ne rendent que **1,58 px**. Et `applyPersp` applique
la perspective en **transformation CSS après le rendu** (src/90-boot.js:705-722) : les px du tampon ne sont
pas les px de l'écran.

**À faire.** Écrire `lineWidth ≥ 2 / min(sx2, sy2)`, soit `2 / (SCALE × zoom × (1 − tilt × 0,42))`. Vérifier
en traçant un trait horizontal et un trait vertical connus et en comptant les pixels allumés
perpendiculairement, **dans la même image**, en lisant `getComputedStyle(canvas).transform` pour savoir si
l'on compte dans le tampon ou à l'écran.

### G11-13 — MIROIR ÉCHOUE SOUS PROTANOPIE · **ÉTABLI** (recalculé) · majeur
**Où** : test 5 — « serpent vs chaque ennemi ΔE ≥ 30 dans les trois simulations ».

**Recalcul du pilote** avec les matrices de Machado (sévérité 1) telles qu'elles figurent dans acc-cvd.mjs,
serpent #00e5ff contre les familles prescrites :

| famille | normal | protan | deutan | tritan |
|---|---|---|---|---|
| contact #ff2e63 | 126,4 | 48,5 | 64,5 | 141,4 |
| tir/explosif #ff6a00 | 133,9 | 85,2 | 101,5 | 128,5 |
| contrôle #8a4dff | 118,0 | 69,6 | 58,6 | 61,8 |
| **MIROIR #ffb0b0** | 75,3 | **27,8** | 44,8 | 83,5 |

**MIROIR prescrit échoue en protan (27,8 < 30).** (Le MIROIR actuel #cfe9ff est bien pire : 8,2 — la
prescription est une amélioration, mais elle ne passe pas son propre seuil.)

**Second point, établi** : `acc-cvd.mjs` **code en dur** `out['snake'] = '#00e5ff'` et
`out['pickup:energy'] = '#00e5ff'` (acc-cvd.mjs:8-9). Lancé tel quel après G11, il mesurerait la palette
**d'avant** pour la moitié des entrées, malgré la formule « sur la palette active ».

**À faire.** (1) Assombrir ou désaturer MIROIR jusqu'à ΔE protan ≥ 30 contre #00e5ff, et **refaire le calcul
avant** d'écrire la couleur. (2) Faire lire `snake` et `pickup:energy` depuis le jeu au lieu des littéraux.
(3) **Figer dans la spec la liste exacte des couleurs comptées** : sans elle, « ≤ 6 paires » n'est pas
vérifiable, le compte dépendant entièrement de la taille de l'ensemble.

### G11-14 — UN ENNEMI SANS FAMILLE · **ÉTABLI** · majeur
**Où** : « quoi » — « ennemis en trois familles : contact (TRAQUEUR, LARVE, TRANCHEUR), tir/explosif
(ARTILLEUR, MINE), contrôle (PONDEUSE, BROUILLEUR, PARASITE, VOLEUR), MIROIR ».

L'affectation couvre **dix des onze types**. `src/22-enemies.js:1689-1786` définit chaser, interceptor, mine,
shooter, cutter, spawner, mite, parasite, jammer, thief, mirror. **L'INTERCEPTEUR (#b388ff, l.1701) n'a pas de
famille** — alors que le test 4 et le « quoi » le télégraphient explicitement (« anneau de cible
d'intercepteur 0,16 → 0,4 »). C'est un fonceur au contact (dashSpeed 360, dmg 1) qui se télégraphie comme un
tireur : les deux familles se défendent.

**À faire.** Trancher par écrit, puis refaire le calcul de teinte du test 1 avec la couleur retenue.

### G11-15 — NOM AMBIGU : HEAD_R · **ÉTABLI** · majeur
**Où** : « quoi » — « liseré du corps porté à **2,3 × HEAD_R** » ; test 3 — « dans un rayon de
**1,2 HEAD_R** autour de la tête ».

**« HEAD_R » désigne deux grandeurs différentes, et drawSnake utilise les deux.**
`K.HEAD_R = 16` (constante, src/10-core.js:14) et `S.headR = K.HEAD_R * (1 + 0.5 * fold)` (variable de 16 à
24, src/10-core.js:276). `drawSnake` dessine le **corps** avec `S.headR` (contour 1,9 × S.headR, remplissage
1,5 × S.headR, src/90-boot.js:391-392) et la **tête** avec `K.HEAD_R` (src/90-boot.js:414-425).

Conséquence chiffrée : avec K.HEAD_R le liseré prescrit vaut 2,3 × 16 = 36,8 u alors qu'à pliage maximal le
corps fait 1,5 × 24 = 36 u — **0,4 u de liseré par côté, invisible**. Avec S.headR il vaut 55,2 u contre
36 u de corps, soit 9,6 u par côté. Même ambiguïté pour le rayon du test : 19,2 u ou jusqu'à 28,8 u.

**À faire.** Écrire `S.headR` ou `K.HEAD_R` explicitement aux deux endroits. Recommandation : `S.headR` pour
le liseré du corps (il doit suivre le pliage), `K.HEAD_R` pour le rayon de recherche du blob (la tête est
dessinée en K.HEAD_R). Relever les deux **dans la même image que la capture**.

### G11-16 — LE « BLOB BLANC UNIQUE » N'EST PAS UNIQUE · **ÉTABLI** · majeur
**Où** : test 3 — « un blob blanc (R,G,B > 235) **unique** ≥ 20 px² dans un rayon de 1,2 HEAD_R autour de la
tête sur ≥ 95 % des images **et aucun ailleurs sur le corps** ».

Quatre sources de blanc prescrites par le même objectif tombent hors du rayon ou sur le corps :
1. **Géométrie de la tête** : la pointe du triangle est à `K.HEAD_R * 1.55` et les ailerons à
   `K.HEAD_R * 1.05` latéralement (src/90-boot.js:420-423) — un triangle blanc plein **dépasse le rayon de
   1,2 HEAD_R par construction**.
2. Le « quoi » demande « halo de tête 3,2 r → **1,6 r blanc** » : un halo de rayon 1,6 r déborde lui aussi.
3. Le « quoi » demande « **tirs joueur blanc/crème** » : les tirs naissent à la tête **et aux tourelles
   posées sur le corps** par `weapons.drawMounts` (appelé depuis drawSnake, src/90-boot.js:405).
4. Les ennemis **clignotent en blanc à l'impact** (`hitT`, cf. CONTRACT.md) et les ennemis de contact
   touchent le serpent par définition.

« Sur le corps » n'est jamais délimité.

**À faire.** Trois critères séparés : (1) « la composante connexe de pixels R,G,B > 235 la plus proche de la
tête a son centroïde à moins de 0,6 HEAD_R de (S.snake.x, S.snake.y) et une aire ≥ 20 px², sur ≥ 95 % des
images » ; (2) « aucune composante blanche > 20 px² dont le centroïde est à plus de 2 HEAD_R de la tête **et**
à moins de 1,5 × S.headR d'un segment » ; (3) exclure les images où un ennemi a `hitT > 0` dans un rayon de
3 HEAD_R et celles où une balle joueur a moins de 40 ms d'âge. Relever la position des segments et l'état des
ennemis **dans la même image que la capture**.

### G11-17 — SIGNATURE RÉINTERPRÉTÉE SANS LE DIRE · **ÉTABLI** · majeur
**Où** : « quoi » — « `_enShell` → remplissage à **55 %** de la couleur de l'ennemi sur un liseré extérieur
sombre de 2 u (**#05060f à 0,9**) ».

`_enShell` a déjà un troisième paramètre, mais il pilote le remplissage **SOMBRE**, pas la couleur :
```
function _enShell(ctx, color, a) {
  ctx.globalAlpha = a === undefined ? 0.72 : a;  ctx.fillStyle = _EN_DARK;  ctx.fill();
  ctx.globalAlpha = 0.18;                        ctx.fillStyle = color;     ctx.fill();
}
```
(src/22-enemies.js:100-107 ; `_EN_DARK = '#080a16'`, l.10). **Douze appelants lui passent des valeurs
différentes** — 0,55 (l.1360), 0,6 (l.1434), 0,75 (l.1574), 0,8 (l.1400, 1524), 0,85 (l.1297, 1459),
0,9 (l.1322, 1490), ou rien (l.1232, 1258, 1332) — et la spec ne dit pas ce qu'elles deviennent.

Seconde imprécision : le « quoi » demande **#05060f** pour le liseré alors que la constante existante est
`_EN_DARK = #080a16`, et **#05060f est déjà la couleur d'effacement du fond** (src/90-boot.js:619). Un liseré
exactement de la couleur du fond ne se voit que là où il recouvre autre chose.

**À faire.** Réécrire en nommant la signature cible, p. ex. : « `_enShell(ctx, color, aDark)` : remplissage
`color` à 0,55 puis remplissage `_EN_DARK` à `aDark` (défaut 0,25) ; le liseré extérieur est un stroke de 2 u
en rgba(5,6,15,0.9) posé **avant** `_enNeon` ». Recalculer ensuite le contraste cœur/anneau pour les quatre
couleurs de famille — en particulier pour le MIROIR retenu, très clair.

### G11-18 — TEST 2 : TROIS INCONNUES · **ÉTABLI** · majeur
**Où** : test 2 — « Capture en jeu 1440×900 **après 60 s** (av-hue.mjs **avec masque**) : pixels de la famille
cyan hors d'un masque de 40 px autour des segments < 2 % de l'écran ».

1. **L'outil n'a pas de masque** : `av-hue.mjs` ne prend que des PNG en arguments et n'a **aucune connaissance
   de l'état du jeu**. Il n'y a pas un masque à écrire, il y a un outil à réécrire. (Ses seuils, eux,
   correspondent bien à l'énoncé : h ∈ [165,200), s > 0,18, exclusion de v < 0,09 et du blanc.)
2. **La valeur de départ n'est pas donnée**, contrairement aux autres tests. Ordre de grandeur par lecture :
   les rails sont tracés en #5ef1ff sur `HALF * 2 = 7 u` tous les 165 u dans deux directions
   (src/27-phases.js:355), soit ~8,5 % de couverture, et le pixel composé en mode 'lighter' reste dans la
   famille cyan.
3. **La couleur du cône de visée n'est pas spécifiée** alors qu'il peut consommer un quart du budget : 30° sur
   120 u ≈ 3 770 u², soit ~0,46 % d'un écran 1440×900.
4. **Une capture à 60 s ne voit jamais le niveau 3** : le niveau 1 dure 104 s (src/25-levels.js:66). Le test
   tel qu'écrit **ne couvre pas le cas qu'il prétend corriger**.

**À faire.** Étendre av-hue.mjs pour accepter la liste des positions écran des segments relevée **dans la même
image que la capture** ; relever la part de cyan actuelle **avant** toute modification et l'inscrire dans la
spec ; fixer la couleur du cône ; ajouter une capture à 100 s ou un forçage de niveau.

### G11-19 — RÉSERVE visibleExtent / ROULIS · **ÉTABLI** · majeur
La réserve portée sur G11 tient face au code, avec **une précision à ajouter : l'erreur va dans les deux sens.**

`visibleExtent()` n'utilise que `S.view.w`, `S.view.h`, `persp` et `visCover` — **`rot()` n'y apparaît pas**
(src/27-phases.js:395-411). `toScreen()`, lui, en tient compte : `var rt = rot(); if (rt) { … }`
(src/27-phases.js:414-419). La zone réellement vue est donc un **rectangle tourné**, tandis que
`visibleExtent` publie un rectangle droit de mêmes demi-dimensions.

Conséquence dans les deux sens : les coins du rectangle **tourné** qui débordent du rectangle droit sont
visibles mais déclarés hors champ (le cas décrit par la réserve) ; symétriquement, les coins du rectangle
**droit** hors du rectangle tourné sont déclarés dans le champ alors qu'ils ne sont pas à l'écran. Prendre la
boîte englobante (largeur `w|cos rt| + h|sin rt|`) corrige le premier cas et **aggrave le second**.

**À faire.** Écrire dans la spec **laquelle des deux erreurs on accepte**. Si la garantie d'apparition prime
(c'est le sens de G6), prendre la boîte englobante et l'assumer. Le correctif change **trois comportements
livrés par G6** : le rayon de tir de `_lvPoint`, la fenêtre d'armement des quatre types annonceurs, et
`ui.offscreen()` — il faut donc **rejouer toute la batterie `tools/test/G6/`**, pas seulement les tests de G11.
Test de la réserve : fenêtre carrée 1000×1000, roulis non nul, comparer pour 2 000 points le verdict de
`visibleExtent` avec celui de `toScreen` (0 ≤ x ≤ 1 et 0 ≤ y ≤ 1) et **compter les désaccords dans les deux
sens**.

### G11-20 — OUTILLAGE NON VERSIONNÉ · **ÉTABLI** · majeur
Quatre des cinq instruments nommés ne sont pas dans la batterie versionnée : `av-palette.mjs`, `av-hue.mjs`,
`av-lib.mjs` et `acc-cvd.mjs` (qui importe en plus `acc-lib.mjs`) n'existent que dans le dossier temporaire,
dont CONTEXTE-CHAINE.md dit qu'il est « sensible aux redémarrages du conteneur ». `git ls-files tools/test`
ne les contient pas. Seul `run.mjs` est versionné, et son mode 'nr' existe bien.

**À faire.** Verser les instruments dans `snake2030/tools/test/G11/` au début de l'objectif, comme l'ont fait
G1 à G6, et corriger les chemins d'import. Sans cela le test 1 ne pourra être rejoué ni par un tiers ni par la
vérification adversariale finale.

### G11-21 — CHIFFRES DU « POURQUOI » · **ÉTABLI** (recalculés) · mineur

(a) **« Le cyan #00e5ff du serpent est aussi celui des rails (contraste 1,14:1) » — la phrase se réfute
elle-même.** Deux hexadécimaux identiques donnent 1,00:1. Les rails sont **#5ef1ff** (avertissement #22e0ff)
— `ctx.strokeStyle = warn ? '#22e0ff' : '#5ef1ff'` (src/27-phases.js:355). #5ef1ff contre #00e5ff = **1,14:1**
(le chiffre du test est donc juste, pour #5ef1ff) ; #22e0ff = 1,04:1. Écarts de teinte HSV : moins de 3°.
**Conséquence sur le test 1** : un contrôle qui cherche la chaîne '#00e5ff' **passerait aujourd'hui sur les
rails** tout en laissant le défaut intact — voir G11-7.

(b) **« 7 ennemis sur 11 partagent une bande de teinte de 34° » — le compte est de six, pas sept.**
Recalcul du pilote (teintes Lab, la métrique d'av-palette.mjs) : TRAQUEUR 16,8° / ARTILLEUR 53,4° /
MINE 56,4° / VOLEUR 75,8° / MIROIR 253,4° / BROUILLEUR 302,4° / INTERCEPTEUR 307,2° / PONDEUSE 308,4° /
LARVE 309,9° / PARASITE 322,1° / TRANCHEUR 336,4°. La bande minimale contenant **six** types fait
**33,9°** ; celle qui en contient **sept** fait **74,4°**. La direction du constat est juste, le chiffre ne
l'est pas. Aucun test n'en dépend, mais il est cité comme justification du regroupement en familles.

(c) **« luminance médiane du fond ≤ 30/255 (inchangée) » — aucune grandeur existante ne correspond.**
`av-hue.mjs` calcule `pct.lum = 255 * lum / n` sur **tous** les pixels de l'image entière, entités et
interface comprises : c'est une **moyenne**, pas une médiane, et pas du fond seul. Le mot « (inchangée) » ne
renvoie à aucune valeur de référence citée. Et le même objectif fait **monter** cette grandeur (télégraphes de
0,10 à 0,35 et de 0,18-0,60 à 0,35-0,85, halos blancs, traits épaissis, cône de visée).
**À faire** : définir « le fond » (pixels hors de tout masque d'entité, ou médiane du décile inférieur de
luminance), relever la valeur de référence **avant** toute modification, et l'inscrire à la place de
« (inchangée) ».

---

## Récapitulatif

| Objectif | Verdict | Points retenus | Bloquants |
|---|---|---|---|
| G7 | pièges sérieux | 13 | 2 |
| G9 | pièges sérieux | 18 | 3 |
| G10 | pièges sérieux | 18 | 3 |
| G11 | pièges sérieux | 21 | 4 |

**Rien de ce document n'a été mesuré.** Les points « ÉTABLI » le sont par arithmétique sur des littéraux du
code, par lecture de fichiers versionnés, ou par recomptage sur les JSON de campagne déjà produits par
l'audit. Les points « À VÉRIFIER » portent leur protocole ; ils ne doivent pas être traités comme des écarts
tant que la mesure n'a pas eu lieu.

**Deux affirmations des rapports de relecture ont été écartées ou corrigées** (« les dégâts de l'ultime sont
invisibles sur tous les ennemis ordinaires et élites » — faux, la PONDEUSE ordinaire a 124 PV ; « SECTEUR
NETTOYÉ n'existe qu'à partir de G9 » — faux, la bannière est émise depuis `_lvClearPhase`), et **une réserve
a été requalifiée** (la « panne de boost » de G10 était déjà marquée CONTESTÉE avec son protocole ; seul le
point sur la longueur nulle de l'arc est neuf).
