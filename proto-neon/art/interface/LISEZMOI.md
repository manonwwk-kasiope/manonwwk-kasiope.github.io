# SNAKE 2975 — les actifs d'interface

*Fichier produit par `proto-neon/tools/interface/genere.mjs`. L'en-tête vient de
`tools/interface/lisezmoi-tete.md` et le catalogue de `interface.json`. Ne le modifiez pas à la main :
relancez le script.*

Ce dossier contient **163 sprites d'interface** en gros pixels, dans la palette fermée de
DIRECTION.md. Ce sont les icônes des 19 cartes, les cadres de cartes par rareté, les jauges, le radar,
les chevrons de portail et les marqueurs hors champ, les mini-silhouettes, les bannières et les toasts,
les chiffres de score et les notes, les boutons, les étoiles, l'énergie, les vies, les causes de mort, le
pouce fantôme et les gestes. Ils sont prêts à être branchés par le lot 8 (`78-hud.js`, `80-ecrans.js`,
`75-cartes.js`) et le lot 6b (`40-sprites.js` : `carte:<id>`, `mini:<type>`).

Les maquettes composées à la taille du tampon de l'iPhone 13 se trouvent dans `proto-neon/refonte/maquettes/` :
écran de jeu, CYCLOPE avec WARNING, cartes, fin, titre, en paysage 422 × 195 et en portrait 195 × 422.
Chacune existe à l'échelle 1 et en `-x3`. Elles montrent comment ces pièces s'assemblent.

## Reproduire

```
node proto-neon/tools/interface/genere.mjs      # art/interface/*.png, interface.json, LISEZMOI.md, planche
node proto-neon/tools/interface/maquettes.mjs   # refonte/maquettes/<écran>-<orientation>[-x3].png
```

Le script n'a aucune dépendance et ne tire aucun hasard : le relancer redonne les mêmes octets. Les
dessins sont des cartes de caractères écrites à la main dans `icones.mjs` (les cartes) et `pieces.mjs`
(le reste). Une lettre correspond à une encre : K nuit profonde, n nuit, d ardoise, v violet, i indigo,
m magenta, r rose pâle, c cyan, C cyan pâle, a ambre, j jaune, b brasier, o os, s acier, g sang.

## Le format

- **PNG indexé 8 bits.** Le PLTE contient les seize encres, **dans l'ordre exact de `src/00-pal.js`**.
  Le tRNS ne contient qu'un octet, 0 : **l'index 0 est transparent**. Un octet du PNG est donc
  directement l'index de palette du jeu, et c'est le format `{w, h, data}` de `N.spr`, où 0 veut dire
  « rien ». Le vide (index 0) n'est jamais posé dans un sprite : on le remplace par la nuit profonde (15),
  comme le fait `05-art.js`.
- **Les planches** : les images d'animation sont côte à côte en x. Pour un sprite à directions,
  l'image (d, k) commence en x = (d × images + k) × w. La direction 0 regarde à droite, puis on tourne
  dans le sens horaire, y vers le bas.
- **L'ancre** est le pixel à poser sur le point visé. C'est le centre de l'objet, sauf pour les plaques,
  les cadres, les jauges et les morceaux de bannière, où c'est le coin haut-gauche (0, 0).
- **Le branchement.** `build.mjs` n'injecte aujourd'hui que `art/*.png`, pas les sous-dossiers. Il y a
  deux façons de faire :
  - le propriétaire de `build.mjs` ajoute `art/interface/` à `ART_SRC`, sous le préfixe `ui/` ;
  - un lot transcrit les cartes de caractères de `icones.mjs` et de `pieces.mjs` dans `40-sprites.js`,
    dont c'est déjà le langage.

  La seconde voie évite tout décodage asynchrone. Elle est conseillée pour les icônes de cartes et les
  mini-silhouettes, que `CONTRAT.md` place dans `N.spr` (`carte:<id>`, `mini:<type>`).
- **Gaines.** Tout ce qui se pose sur le décor a sa gaine d'un pixel en nuit profonde. Le décor du jeu
  est très lumineux : sans gaine, rien ne se lit devant le soleil.

## Les règles de couleur, vérifiées par le script

- **Aucun cyan dans un signe de danger** : chevrons, marqueurs, mini-silhouettes, causes ennemies,
  bannière et toast « danger », chiffres magenta, jauge du CYCLOPE. **Aucun magenta ni rose pâle** dans
  une carte, un cadre, une jauge de récompense, les chiffres jaunes, les notes, les étoiles, l'énergie ou
  les vies.
- **Le cyan des icônes de cartes n'est qu'un accent** : le tir, l'œil, l'énergie, les perles de la
  joueuse. Voici le nombre de pixels cyan et cyan pâle par icône de 16 × 16 : canon 10, tourelles 28, arc 26, missiles 4, drones 5, minesQ 27, puissance 0, cadence 0, aimant 0, croissance 41, reparation 0, bouclier 5, eperon 0, grappe 0, sangFroid 0, braise 0, traversee 24, ralenti 0, repli 17. Les maquettes de
  cartes posent les icônes à l'échelle 2, et la part de cyan hors joueuse reste à 0,28 % en paysage et
  0,33 % en portrait. C'est sous le seuil de 0,5 % de R-03, à condition que le HUD porte le code 9. Si
  une main de cinq cartes très cyan approchait le seuil, `dbg.masque()` peut marquer les icônes d'arme en
  code 3 (arsenal) : ce sont des images de l'arsenal de la joueuse.
- **La rareté se lit deux fois** (§ 2.7) : par l'encre (acier, os, ambre, jaune) et par les crans au coin
  haut droit (1, 2, 3, 4). La carte ULTIME a en plus un reflet tramé en 16 images, qui passe une fois par
  seconde à 16 i/s, sous la limite de 3 passages par seconde.
- **Silhouettes des 19 icônes** : l'intersection sur union des masques, deux à deux, vaut au plus
  0.520 (bouclier / braise). Le seuil du lot 6b est 0,6.

## Comment les maquettes posent les pièces (à reprendre dans `78-hud.js` et `80-ecrans.js`)

Les zones sûres de l'iPhone 13 à px = 2 sont les suivantes : en paysage, x de 24 à 398 et y de 0 à 185 ;
en portrait, y de 24 à 405.

**Le HUD en jeu** (`jeu-*.png`). Il couvre 7,8 % de l'écran, plus 2,4 % d'éléments passagers (toast,
gain flottant, chevron).

- **Score et vies.** Plaque de nuit profonde à coins coupés, de 103 × 23 en paysage et 64 × 40 en
  portrait.
  - Le score en 7 chiffres jaunes.
  - « ×n » en ambre, avec la barre de chaîne d'un pixel, jaune sur ardoise.
  - L'objectif « ×3 DANS 3 » en acier.
  - Les vies (`vie`, 7 × 7) et « VIE À 80 000 ». En portrait, seul « 80 000 » tient à côté des vies.
- **Radar et barre de secteur.** Le `radar` (52 × 28) est centré en haut. La `jauge:secteur:cadre` est
  posée 29 px plus bas, puis l'étiquette « V1 · FILE · LES DOCKS » sur une plaque de 11 px de haut.
- **Jauge du CYCLOPE.** Pendant le combat, elle prend la place de l'étiquette : plaque de 128 × 19,
  nom en magenta, `jauge:cyclope:*`. En portrait, elle descend sous la plaque du score.
- **Boutons.** `bouton:son` et `bouton:pause` (22 × 22, soit 44 pt) en haut à droite.
- **Toasts.** Ils sont posés au-dessus de la bande du bas, avec `toast:<ton>:*` et le texte en (x + 5, 2).
- **Bannières.** Elles sont faites de `banniere:<ton>:<36|29>:*` : 36 px de haut avec le texte à
  l'échelle 4 en paysage, 29 px avec le texte à l'échelle 3 en portrait. Le texte est en os, avec ses
  deux fantômes violet et magenta décalés de 2 px.

**Les cartes** (`cartes-*.png`). Le fond est le jeu assombri de deux crans, sans HUD.

- **En paysage (120 × 80).**
  - L'étiquette de famille et de nouveauté en (7, 6), en jaune pour NOUVEAU ou un palier, en acier
    pour un passif.
  - Un halo tramé dans l'encre d'ombre de la rareté, puis **l'icône 16 × 16 à l'échelle 2**, en (44, 14).
  - Le nom en os, centré, en y = 48. Un filet pointillé en y = 57.
  - Deux lignes de description en acier, centrées, en y = 60 et 69.
- **En portrait (180 × 48).**
  - L'icône à l'échelle 2 en (7, 8).
  - Le nom en (46, 6), et la rareté en toutes lettres, à droite, en y = 6.
  - La description en y = 17 et 26, l'étiquette en y = 37.
- **La carte touchée** reçoit `cadre:choisie:*` et monte de 2 px.

**L'écran de fin** (`fin-*.png`). Le panneau `defaite` est assombri d'un cran, sauf le cyan : le
serpent du panneau, c'est la joueuse.

- **En haut**, le titre en magenta, à l'échelle 3 en paysage et 2 en portrait, avec ses fantômes.
- **La cause**, sur une plaque à liseré sang : le sprite du coupable entouré d'un anneau magenta, puis
  « DÉTRUITE PAR : … » et « VAGUE 3 · LA CENTRALE · 2:07 ».
- **L'encart** :
  - à gauche, la progression, le score en `chiffres`, l'écart et le record, le build en `carte8:*`, les
    défis en `etoile` et le conseil en jaune ;
  - à droite en paysage, ou dessous en portrait, le bilan, la `note:*` et le prochain déblocage avec
    son `energie` et sa barre ;
  - les trois boutons de 22 px de haut. Le compte à rebours de CONTINUER est en `chiffres:danger`,
    dans le bouton.

**Le titre** (`titre-*.png`).

- **L'image.** `horizon` derrière, `affiche` fondue par un tramage sur 14 colonnes en paysage, ou 14
  rangées en portrait.
- **Le logo.** En portrait, on lui retire des colonnes presque jumelles, comme le fait `60-intro.js`.
- **Les textes.** « TOUCHE POUR JOUER » en jaune à l'échelle 2, sur deux lignes en portrait.
- **Les boutons.** `bouton:records` et `bouton:reglages` en haut à droite.
- **La plaque du bas.** Le record, l'énergie et les défis du jour.

## Ce que les maquettes ont appris (à trancher par le lot 8, le lot 6b ou le gardien)

1. **19 caractères de description ne tiennent pas dans une carte de 120 px.** 19 × 6 − 1 = 113 px, pour
   112 px à l'intérieur du liseré. Il faut se limiter à **18 caractères** sur 120 px, et à **14** sur
   96 px.
2. **Cinq cartes de 96 px ne tiennent pas dans 422 px** : 5 × 96 = 480 px. On peut ramener les cartes à
   78 px, ou poser deux rangées. Quatre cartes de 96 px tiennent, avec 6 px d'écart.
3. **La police n'a pas de point médian.** REFONTE.md écrit « V3 · BATTERIE · LA CENTRALE », et
   `40-sprites.js` rend « · » par un point bas. Les maquettes emploient une proposition : `'·': '../../../##/##/../..'`
   (2 × 2 au milieu de la case). C'est la seule différence entre la police des maquettes et celle du jeu.
4. **« VIE À 80 000 » ne tient pas en portrait** dans une plaque de 64 px, à côté des vies. Les
   maquettes écrivent seulement « 80 000 ».
5. **Huit directions pour les chevrons de portail, pas seize.** À 7 px, une pointe tournée à 22,5° est
   bancale. Les chevrons sont donc dessinés à la main à 0° et à 45°, puis tournés par quarts de tour.
   L'index se calcule par k = Math.round(angle / (π / 4)) & 7.
6. **Le logo du titre contient du cyan** (3,6 % de l'écran) : c'est un actif existant, et le titre n'est
   pas dans la liste des dix captures de R-03.

## Le catalogue, sprite par sprite

*(Tableau produit par `genere.mjs` à partir de `interface.json`.)*

### Icônes des 19 cartes (16 × 16)

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `carte:canon` | `carte-canon.png` | 16 × 16 | 8, 8 | 1 | icône de la carte canon (arme), au centre haut de la carte et dans les bandeaux |
| `carte:tourelles` | `carte-tourelles.png` | 16 × 16 | 8, 8 | 1 | icône de la carte tourelles (arme), au centre haut de la carte et dans les bandeaux |
| `carte:arc` | `carte-arc.png` | 16 × 16 | 8, 8 | 1 | icône de la carte arc (arme), au centre haut de la carte et dans les bandeaux |
| `carte:missiles` | `carte-missiles.png` | 16 × 16 | 8, 8 | 1 | icône de la carte missiles (arme), au centre haut de la carte et dans les bandeaux |
| `carte:drones` | `carte-drones.png` | 16 × 16 | 8, 8 | 1 | icône de la carte drones (arme), au centre haut de la carte et dans les bandeaux |
| `carte:minesQ` | `carte-minesQ.png` | 16 × 16 | 8, 8 | 1 | icône de la carte minesQ (arme), au centre haut de la carte et dans les bandeaux |
| `carte:puissance` | `carte-puissance.png` | 16 × 16 | 8, 8 | 1 | icône de la carte puissance (passif), au centre haut de la carte et dans les bandeaux |
| `carte:cadence` | `carte-cadence.png` | 16 × 16 | 8, 8 | 1 | icône de la carte cadence (passif), au centre haut de la carte et dans les bandeaux |
| `carte:aimant` | `carte-aimant.png` | 16 × 16 | 8, 8 | 1 | icône de la carte aimant (passif), au centre haut de la carte et dans les bandeaux |
| `carte:croissance` | `carte-croissance.png` | 16 × 16 | 8, 8 | 1 | icône de la carte croissance (passif), au centre haut de la carte et dans les bandeaux |
| `carte:reparation` | `carte-reparation.png` | 16 × 16 | 8, 8 | 1 | icône de la carte reparation (passif), au centre haut de la carte et dans les bandeaux |
| `carte:bouclier` | `carte-bouclier.png` | 16 × 16 | 8, 8 | 1 | icône de la carte bouclier (passif), au centre haut de la carte et dans les bandeaux |
| `carte:eperon` | `carte-eperon.png` | 16 × 16 | 8, 8 | 1 | icône de la carte eperon (passif), au centre haut de la carte et dans les bandeaux |
| `carte:grappe` | `carte-grappe.png` | 16 × 16 | 8, 8 | 1 | icône de la carte grappe (passif), au centre haut de la carte et dans les bandeaux |
| `carte:sangFroid` | `carte-sangFroid.png` | 16 × 16 | 8, 8 | 1 | icône de la carte sangFroid (passif), au centre haut de la carte et dans les bandeaux |
| `carte:braise` | `carte-braise.png` | 16 × 16 | 8, 8 | 1 | icône de la carte braise (passif), au centre haut de la carte et dans les bandeaux |
| `carte:traversee` | `carte-traversee.png` | 16 × 16 | 8, 8 | 1 | icône de la carte traversee (pouvoir), au centre haut de la carte et dans les bandeaux |
| `carte:ralenti` | `carte-ralenti.png` | 16 × 16 | 8, 8 | 1 | icône de la carte ralenti (pouvoir), au centre haut de la carte et dans les bandeaux |
| `carte:repli` | `carte-repli.png` | 16 × 16 | 8, 8 | 1 | icône de la carte repli (pouvoir), au centre haut de la carte et dans les bandeaux |

### Petites icônes des cartes (8 × 8)

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `carte8:canon` | `carte8-canon.png` | 8 × 8 | 4, 4 | 1 | petite icône de canon : pause (cartes prises) et build de l'écran de fin |
| `carte8:tourelles` | `carte8-tourelles.png` | 8 × 8 | 4, 4 | 1 | petite icône de tourelles : pause (cartes prises) et build de l'écran de fin |
| `carte8:arc` | `carte8-arc.png` | 8 × 8 | 4, 4 | 1 | petite icône de arc : pause (cartes prises) et build de l'écran de fin |
| `carte8:missiles` | `carte8-missiles.png` | 8 × 8 | 4, 4 | 1 | petite icône de missiles : pause (cartes prises) et build de l'écran de fin |
| `carte8:drones` | `carte8-drones.png` | 8 × 8 | 4, 4 | 1 | petite icône de drones : pause (cartes prises) et build de l'écran de fin |
| `carte8:minesQ` | `carte8-minesQ.png` | 8 × 8 | 4, 4 | 1 | petite icône de minesQ : pause (cartes prises) et build de l'écran de fin |
| `carte8:puissance` | `carte8-puissance.png` | 8 × 8 | 4, 4 | 1 | petite icône de puissance : pause (cartes prises) et build de l'écran de fin |
| `carte8:cadence` | `carte8-cadence.png` | 8 × 8 | 4, 4 | 1 | petite icône de cadence : pause (cartes prises) et build de l'écran de fin |
| `carte8:aimant` | `carte8-aimant.png` | 8 × 8 | 4, 4 | 1 | petite icône de aimant : pause (cartes prises) et build de l'écran de fin |
| `carte8:croissance` | `carte8-croissance.png` | 8 × 8 | 4, 4 | 1 | petite icône de croissance : pause (cartes prises) et build de l'écran de fin |
| `carte8:reparation` | `carte8-reparation.png` | 8 × 8 | 4, 4 | 1 | petite icône de reparation : pause (cartes prises) et build de l'écran de fin |
| `carte8:bouclier` | `carte8-bouclier.png` | 8 × 8 | 4, 4 | 1 | petite icône de bouclier : pause (cartes prises) et build de l'écran de fin |
| `carte8:eperon` | `carte8-eperon.png` | 8 × 8 | 4, 4 | 1 | petite icône de eperon : pause (cartes prises) et build de l'écran de fin |
| `carte8:grappe` | `carte8-grappe.png` | 8 × 8 | 4, 4 | 1 | petite icône de grappe : pause (cartes prises) et build de l'écran de fin |
| `carte8:sangFroid` | `carte8-sangFroid.png` | 8 × 8 | 4, 4 | 1 | petite icône de sangFroid : pause (cartes prises) et build de l'écran de fin |
| `carte8:braise` | `carte8-braise.png` | 8 × 8 | 4, 4 | 1 | petite icône de braise : pause (cartes prises) et build de l'écran de fin |
| `carte8:traversee` | `carte8-traversee.png` | 8 × 8 | 4, 4 | 1 | petite icône de traversee : pause (cartes prises) et build de l'écran de fin |
| `carte8:ralenti` | `carte8-ralenti.png` | 8 × 8 | 4, 4 | 1 | petite icône de ralenti : pause (cartes prises) et build de l'écran de fin |
| `carte8:repli` | `carte8-repli.png` | 8 × 8 | 4, 4 | 1 | petite icône de repli : pause (cartes prises) et build de l'écran de fin |

### Cadres de cartes par rareté

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `cadre:commune:paysage` | `cadre-commune-paysage.png` | 120 × 80 | 0, 0 | 1 | cadre de carte commune 120 × 80 (paysage) |
| `cadre:rare:paysage` | `cadre-rare-paysage.png` | 120 × 80 | 0, 0 | 1 | cadre de carte rare 120 × 80 (paysage) |
| `cadre:epique:paysage` | `cadre-epique-paysage.png` | 120 × 80 | 0, 0 | 1 | cadre de carte epique 120 × 80 (paysage) |
| `cadre:ultime:paysage` | `cadre-ultime-paysage.png` | 120 × 80 | 0, 0 | 16 | cadre de carte ULTIME 120 × 80 (paysage) ; 16 images à 16 i/s : le reflet passe une fois par seconde |
| `cadre:choisie:paysage` | `cadre-choisie-paysage.png` | 120 × 80 | 0, 0 | 1 | cadre de la carte touchée, 120 × 80 : deux images de flash (§ 5.6), puis la carte part |
| `cadre:commune:serre` | `cadre-commune-serre.png` | 96 × 80 | 0, 0 | 1 | cadre de carte commune 96 × 80 (serre) |
| `cadre:rare:serre` | `cadre-rare-serre.png` | 96 × 80 | 0, 0 | 1 | cadre de carte rare 96 × 80 (serre) |
| `cadre:epique:serre` | `cadre-epique-serre.png` | 96 × 80 | 0, 0 | 1 | cadre de carte epique 96 × 80 (serre) |
| `cadre:ultime:serre` | `cadre-ultime-serre.png` | 96 × 80 | 0, 0 | 16 | cadre de carte ULTIME 96 × 80 (serre) ; 16 images à 16 i/s : le reflet passe une fois par seconde |
| `cadre:choisie:serre` | `cadre-choisie-serre.png` | 96 × 80 | 0, 0 | 1 | cadre de la carte touchée, 96 × 80 : deux images de flash (§ 5.6), puis la carte part |
| `cadre:commune:portrait` | `cadre-commune-portrait.png` | 180 × 48 | 0, 0 | 1 | cadre de carte commune 180 × 48 (portrait) |
| `cadre:rare:portrait` | `cadre-rare-portrait.png` | 180 × 48 | 0, 0 | 1 | cadre de carte rare 180 × 48 (portrait) |
| `cadre:epique:portrait` | `cadre-epique-portrait.png` | 180 × 48 | 0, 0 | 1 | cadre de carte epique 180 × 48 (portrait) |
| `cadre:ultime:portrait` | `cadre-ultime-portrait.png` | 180 × 48 | 0, 0 | 16 | cadre de carte ULTIME 180 × 48 (portrait) ; 16 images à 16 i/s : le reflet passe une fois par seconde |
| `cadre:choisie:portrait` | `cadre-choisie-portrait.png` | 180 × 48 | 0, 0 | 1 | cadre de la carte touchée, 180 × 48 : deux images de flash (§ 5.6), puis la carte part |

### Jauges

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `jauge:cyclope:cadre` | `jauge-cyclope-cadre.png` | 124 × 7 | 0, 0 | 1 | cadre de la jauge du CYCLOPE ; intérieur 120 × 3 en (2, 2) ; encoches d'os aux deux changements de phase |
| `jauge:cyclope:plein` | `jauge-cyclope-plein.png` | 120 × 3 | 0, 0 | 1 | remplissage de la jauge du CYCLOPE, rogné à la valeur par le code (de gauche à droite) |
| `jauge:cyclope:vide` | `jauge-cyclope-vide.png` | 120 × 3 | 0, 0 | 1 | fond de la jauge du CYCLOPE (PV perdus) |
| `jauge:deblocage:cadre` | `jauge-deblocage-cadre.png` | 124 × 7 | 0, 0 | 1 | cadre de la barre PROCHAIN DÉBLOCAGE (écran de fin) ; intérieur 120 × 3 en (2, 2) |
| `jauge:deblocage:plein` | `jauge-deblocage-plein.png` | 120 × 3 | 0, 0 | 1 | remplissage ambre de la barre de déblocage, rogné par le code |
| `jauge:progression:plein` | `jauge-progression-plein.png` | 120 × 3 | 0, 0 | 1 | remplissage de la barre SECTEUR n % ou CYCLOPE À n % (écran de fin), dans le cadre de déblocage |
| `jauge:vide` | `jauge-vide.png` | 120 × 3 | 0, 0 | 1 | fond tramé d'une barre neutre |
| `jauge:secteur:cadre` | `jauge-secteur-cadre.png` | 50 × 5 | 0, 0 | 1 | barre de secteur sous le radar : 6 cases (V1 à V5, la 6e en sang pour le CYCLOPE) ; case k en (2 + 8k, 1) |
| `jauge:secteur:faite` | `jauge-secteur-faite.png` | 6 × 3 | 0, 0 | 1 | case de la barre de secteur : faite |
| `jauge:secteur:encours` | `jauge-secteur-encours.png` | 6 × 3 | 0, 0 | 1 | case de la barre de secteur : encours |
| `jauge:secteur:avenir` | `jauge-secteur-avenir.png` | 6 × 3 | 0, 0 | 1 | case de la barre de secteur : avenir |
| `jauge:secteur:colosse` | `jauge-secteur-colosse.png` | 7 × 3 | 0, 0 | 1 | case de la barre de secteur : colosse |

### Radar

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `radar` | `radar.png` | 52 × 28 | 26, 0 | 1 | plaque du radar 52 × 28, centrée en haut de la zone sûre ; intérieur utile 48 × 24 en (2, 2), monde 1 024 × 512 réduit au 1/21,3 ; ligne médiane en indigo |

### Chevrons de portail

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `portail` | `portail.png` | 9 × 9 | 4, 4 | 8 dir. × 1 | chevron de portail (apparition dans 600 ms), 8 directions (0 = droite, sens horaire, k = round(angle / 45°) & 7) ; la pointe regarde le point d'apparition |
| `portail:elite` | `portail-elite.png` | 12 × 12 | 6, 6 | 8 dir. × 1 | chevron double d'une élite ou du RIVAL, 8 directions |
| `portail:colosse` | `portail-colosse.png` | 15 × 15 | 7, 7 | 8 dir. × 1 | chevron triple du CYCLOPE (annoncé 1,4 s avant), 8 directions |

### Marqueurs hors champ

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `marque:simple:7` | `marque-simple-7.png` | 9 × 9 | 4, 4 | 1 | marqueur hors champ « simple » à 7 px (proche), gaine comprise 9 px |
| `marque:simple:5` | `marque-simple-5.png` | 7 × 7 | 3, 3 | 1 | marqueur hors champ « simple » à 5 px (moyen), gaine comprise 7 px |
| `marque:simple:3` | `marque-simple-3.png` | 5 × 5 | 2, 2 | 1 | marqueur hors champ « simple » à 3 px (loin), gaine comprise 5 px |
| `marque:double:7` | `marque-double-7.png` | 9 × 9 | 4, 4 | 1 | marqueur hors champ « double » à 7 px (proche), gaine comprise 9 px |
| `marque:double:5` | `marque-double-5.png` | 7 × 7 | 3, 3 | 1 | marqueur hors champ « double » à 5 px (moyen), gaine comprise 7 px |
| `marque:double:3` | `marque-double-3.png` | 5 × 5 | 2, 2 | 1 | marqueur hors champ « double » à 3 px (loin), gaine comprise 5 px |
| `marque:triple:7` | `marque-triple-7.png` | 9 × 9 | 4, 4 | 1 | marqueur hors champ « triple » à 7 px (proche), gaine comprise 9 px |
| `marque:triple:5` | `marque-triple-5.png` | 7 × 7 | 3, 3 | 1 | marqueur hors champ « triple » à 5 px (moyen), gaine comprise 7 px |
| `marque:triple:3` | `marque-triple-3.png` | 5 × 5 | 2, 2 | 1 | marqueur hors champ « triple » à 3 px (loin), gaine comprise 5 px |
| `marque:mine:7` | `marque-mine-7.png` | 9 × 9 | 4, 4 | 2 | marqueur hors champ « mine » à 7 px (proche), gaine comprise 9 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:mine:5` | `marque-mine-5.png` | 7 × 7 | 3, 3 | 2 | marqueur hors champ « mine » à 5 px (moyen), gaine comprise 7 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:mine:3` | `marque-mine-3.png` | 5 × 5 | 2, 2 | 2 | marqueur hors champ « mine » à 3 px (loin), gaine comprise 5 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:pastille:7` | `marque-pastille-7.png` | 9 × 9 | 4, 4 | 2 | marqueur hors champ « pastille » à 7 px (proche), gaine comprise 9 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:pastille:5` | `marque-pastille-5.png` | 7 × 7 | 3, 3 | 2 | marqueur hors champ « pastille » à 5 px (moyen), gaine comprise 7 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:pastille:3` | `marque-pastille-3.png` | 5 × 5 | 2, 2 | 2 | marqueur hors champ « pastille » à 3 px (loin), gaine comprise 5 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:traqueur:7` | `marque-traqueur-7.png` | 9 × 9 | 4, 4 | 2 | marqueur hors champ « traqueur » à 7 px (proche), gaine comprise 9 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:traqueur:5` | `marque-traqueur-5.png` | 7 × 7 | 3, 3 | 2 | marqueur hors champ « traqueur » à 5 px (moyen), gaine comprise 7 px ; 2 images : allumé, éteint (2 Hz) |
| `marque:traqueur:3` | `marque-traqueur-3.png` | 5 × 5 | 2, 2 | 2 | marqueur hors champ « traqueur » à 3 px (loin), gaine comprise 5 px ; 2 images : allumé, éteint (2 Hz) |

### Mini-silhouettes des ennemis

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `mini:fleche` | `mini-fleche.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette fleche (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:dard` | `mini-dard.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette dard (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:larve` | `mini-larve.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette larve (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:mine` | `mini-mine.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette mine (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:tourelle` | `mini-tourelle.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette tourelle (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:lame` | `mini-lame.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette lame (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:ruche` | `mini-ruche.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette ruche (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:sentinelle` | `mini-sentinelle.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette sentinelle (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:rival` | `mini-rival.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette rival (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:planeur` | `mini-planeur.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette planeur (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:traqueur` | `mini-traqueur.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette traqueur (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:cyclope` | `mini-cyclope.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette cyclope (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |
| `mini:convoi` | `mini-convoi.png` | 7 × 7 | 3, 3 | 1 | mini-silhouette convoi (5 × 5 gainée) : à côté du chevron de portail, dans le codex, sur l'écran de fin |

### Bannières et toasts

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `banniere:danger:36:gauche` | `banniere-danger-36-gauche.png` | 14 × 36 | 0, 0 | 1 | capuchon gauche de bannière danger, hauteur 36 (texte à l'échelle 4) |
| `banniere:danger:36:milieu` | `banniere-danger-36-milieu.png` | 4 × 36 | 0, 0 | 1 | bande de bannière danger à répéter tous les 4 px (motif tramé de période 4) |
| `banniere:danger:36:droite` | `banniere-danger-36-droite.png` | 14 × 36 | 0, 0 | 1 | capuchon droit de bannière danger, hauteur 36 |
| `banniere:danger:29:gauche` | `banniere-danger-29-gauche.png` | 14 × 29 | 0, 0 | 1 | capuchon gauche de bannière danger, hauteur 29 (texte à l'échelle 3) |
| `banniere:danger:29:milieu` | `banniere-danger-29-milieu.png` | 4 × 29 | 0, 0 | 1 | bande de bannière danger à répéter tous les 4 px (motif tramé de période 4) |
| `banniere:danger:29:droite` | `banniere-danger-29-droite.png` | 14 × 29 | 0, 0 | 1 | capuchon droit de bannière danger, hauteur 29 |
| `banniere:gloire:36:gauche` | `banniere-gloire-36-gauche.png` | 14 × 36 | 0, 0 | 1 | capuchon gauche de bannière gloire, hauteur 36 (texte à l'échelle 4) |
| `banniere:gloire:36:milieu` | `banniere-gloire-36-milieu.png` | 4 × 36 | 0, 0 | 1 | bande de bannière gloire à répéter tous les 4 px (motif tramé de période 4) |
| `banniere:gloire:36:droite` | `banniere-gloire-36-droite.png` | 14 × 36 | 0, 0 | 1 | capuchon droit de bannière gloire, hauteur 36 |
| `banniere:gloire:29:gauche` | `banniere-gloire-29-gauche.png` | 14 × 29 | 0, 0 | 1 | capuchon gauche de bannière gloire, hauteur 29 (texte à l'échelle 3) |
| `banniere:gloire:29:milieu` | `banniere-gloire-29-milieu.png` | 4 × 29 | 0, 0 | 1 | bande de bannière gloire à répéter tous les 4 px (motif tramé de période 4) |
| `banniere:gloire:29:droite` | `banniere-gloire-29-droite.png` | 14 × 29 | 0, 0 | 1 | capuchon droit de bannière gloire, hauteur 29 |
| `banniere:info:36:gauche` | `banniere-info-36-gauche.png` | 14 × 36 | 0, 0 | 1 | capuchon gauche de bannière info, hauteur 36 (texte à l'échelle 4) |
| `banniere:info:36:milieu` | `banniere-info-36-milieu.png` | 4 × 36 | 0, 0 | 1 | bande de bannière info à répéter tous les 4 px (motif tramé de période 4) |
| `banniere:info:36:droite` | `banniere-info-36-droite.png` | 14 × 36 | 0, 0 | 1 | capuchon droit de bannière info, hauteur 36 |
| `banniere:info:29:gauche` | `banniere-info-29-gauche.png` | 14 × 29 | 0, 0 | 1 | capuchon gauche de bannière info, hauteur 29 (texte à l'échelle 3) |
| `banniere:info:29:milieu` | `banniere-info-29-milieu.png` | 4 × 29 | 0, 0 | 1 | bande de bannière info à répéter tous les 4 px (motif tramé de période 4) |
| `banniere:info:29:droite` | `banniere-info-29-droite.png` | 14 × 29 | 0, 0 | 1 | capuchon droit de bannière info, hauteur 29 |
| `toast:danger:gauche` | `toast-danger-gauche.png` | 4 × 11 | 0, 0 | 1 | capuchon gauche de toast danger (plaque d'une ligne, hauteur 11, texte en (x + 5, 2)) |
| `toast:danger:milieu` | `toast-danger-milieu.png` | 1 × 11 | 0, 0 | 1 | colonne de toast danger à répéter |
| `toast:danger:droite` | `toast-danger-droite.png` | 4 × 11 | 0, 0 | 1 | capuchon droit de toast danger |
| `toast:gloire:gauche` | `toast-gloire-gauche.png` | 4 × 11 | 0, 0 | 1 | capuchon gauche de toast gloire (plaque d'une ligne, hauteur 11, texte en (x + 5, 2)) |
| `toast:gloire:milieu` | `toast-gloire-milieu.png` | 1 × 11 | 0, 0 | 1 | colonne de toast gloire à répéter |
| `toast:gloire:droite` | `toast-gloire-droite.png` | 4 × 11 | 0, 0 | 1 | capuchon droit de toast gloire |
| `toast:info:gauche` | `toast-info-gauche.png` | 4 × 11 | 0, 0 | 1 | capuchon gauche de toast info (plaque d'une ligne, hauteur 11, texte en (x + 5, 2)) |
| `toast:info:milieu` | `toast-info-milieu.png` | 1 × 11 | 0, 0 | 1 | colonne de toast info à répéter |
| `toast:info:droite` | `toast-info-droite.png` | 4 × 11 | 0, 0 | 1 | capuchon droit de toast info |

### Chiffres de score et notes

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `chiffres` | `chiffres.png` | 10 × 14 | 0, 0 | 14 | gros chiffres de score 7 × 11 (gainés 10 × 14) ; image n = « 0123456789x+-% »[n] ; avance conseillée 9 px |
| `chiffres:danger` | `chiffres-danger.png` | 10 × 14 | 0, 0 | 14 | les mêmes chiffres en magenta : compte à rebours de CONTINUER ?, dégâts du CYCLOPE |
| `note:S` | `note-S.png` | 17 × 25 | 8, 12 | 1 | la note S de l'écran de fin (lettre 14 × 22), qui tombe avec une secousse |
| `note:A` | `note-A.png` | 17 × 25 | 8, 12 | 1 | la note A de l'écran de fin (lettre 14 × 22), qui tombe avec une secousse |
| `note:B` | `note-B.png` | 17 × 25 | 8, 12 | 1 | la note B de l'écran de fin (lettre 14 × 22), qui tombe avec une secousse |
| `note:C` | `note-C.png` | 17 × 25 | 8, 12 | 1 | la note C de l'écran de fin (lettre 14 × 22), qui tombe avec une secousse |
| `note:D` | `note-D.png` | 17 × 25 | 8, 12 | 1 | la note D de l'écran de fin (lettre 14 × 22), qui tombe avec une secousse |

### Boutons

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `bouton:pause` | `bouton-pause.png` | 22 × 22 | 11, 11 | 2 | bouton pause 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:son` | `bouton-son.png` | 22 × 22 | 11, 11 | 2 | bouton son 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:muet` | `bouton-muet.png` | 22 × 22 | 11, 11 | 2 | bouton muet 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:reglages` | `bouton-reglages.png` | 22 × 22 | 11, 11 | 2 | bouton reglages 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:records` | `bouton-records.png` | 22 × 22 | 11, 11 | 2 | bouton records 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:galerie` | `bouton-galerie.png` | 22 × 22 | 11, 11 | 2 | bouton galerie 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:retour` | `bouton-retour.png` | 22 × 22 | 11, 11 | 2 | bouton retour 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `bouton:lecture` | `bouton-lecture.png` | 22 × 22 | 11, 11 | 2 | bouton lecture 22 × 22 (44 pt à px = 2) ; 2 images : repos, enfoncé |
| `boutonTexte:principal:gauche` | `boutonTexte-principal-gauche.png` | 5 × 22 | 0, 0 | 1 | bouton de texte principal (hauteur 22) : capuchon gauche ; texte centré en y = 8 |
| `boutonTexte:principal:milieu` | `boutonTexte-principal-milieu.png` | 1 × 22 | 0, 0 | 1 | bouton de texte principal : colonne à répéter |
| `boutonTexte:principal:droite` | `boutonTexte-principal-droite.png` | 5 × 22 | 0, 0 | 1 | bouton de texte principal : capuchon droit |
| `boutonTexte:secondaire:gauche` | `boutonTexte-secondaire-gauche.png` | 5 × 22 | 0, 0 | 1 | bouton de texte secondaire (hauteur 22) : capuchon gauche ; texte centré en y = 8 |
| `boutonTexte:secondaire:milieu` | `boutonTexte-secondaire-milieu.png` | 1 × 22 | 0, 0 | 1 | bouton de texte secondaire : colonne à répéter |
| `boutonTexte:secondaire:droite` | `boutonTexte-secondaire-droite.png` | 5 × 22 | 0, 0 | 1 | bouton de texte secondaire : capuchon droit |
| `boutonTexte:danger:gauche` | `boutonTexte-danger-gauche.png` | 5 × 22 | 0, 0 | 1 | bouton de texte danger (hauteur 22) : capuchon gauche ; texte centré en y = 8 |
| `boutonTexte:danger:milieu` | `boutonTexte-danger-milieu.png` | 1 × 22 | 0, 0 | 1 | bouton de texte danger : colonne à répéter |
| `boutonTexte:danger:droite` | `boutonTexte-danger-droite.png` | 5 × 22 | 0, 0 | 1 | bouton de texte danger : capuchon droit |

### Étoiles, énergie, vies, pouce, gestes

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `etoile` | `etoile.png` | 9 × 9 | 4, 4 | 2 | étoile de défi 7 × 7 gainée ; 2 images : réussi (ambre et jaune), à faire (acier) |
| `energie` | `energie.png` | 7 × 8 | 3, 4 | 1 | le losange d'énergie (5 × 6 gainé), à poser après « 412 » dans PROCHAIN DÉBLOCAGE |
| `vie` | `vie.png` | 7 × 7 | 3, 3 | 2 | pastille de vie 5 × 5 gainée (tête de la joueuse) ; 2 images : vie, vie perdue ; code de masque 4 |
| `pouce` | `pouce.png` | 13 × 18 | 6, 1 | 2 | pouce fantôme de la première partie (13 × 18) ; 2 images : posé, levé ; ancre = bout du pouce |
| `geste:touche` | `geste-touche.png` | 13 × 13 | 6, 6 | 1 | pictogramme du geste « touche » du second doigt (13 × 13), devant « 2ᵉ DOIGT : TOUCHE » ou « GLISSE = APOGÉE » |
| `geste:glisse` | `geste-glisse.png` | 13 × 13 | 6, 6 | 1 | pictogramme du geste « glisse » du second doigt (13 × 13), devant « 2ᵉ DOIGT : TOUCHE » ou « GLISSE = APOGÉE » |

### Causes de mort (écran de fin)

| nom | fichier | taille | ancre | images | rôle |
|---|---|---|---|---|---|
| `cause:mur` | `cause-mur.png` | 15 × 15 | 7, 7 | 1 | silhouette de la cause « mur » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi |
| `cause:morsure` | `cause-morsure.png` | 15 × 15 | 7, 7 | 1 | silhouette de la cause « morsure » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi |
| `cause:convoi` | `cause-convoi.png` | 15 × 15 | 7, 7 | 1 | silhouette de la cause « convoi » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi |
| `cause:traine` | `cause-traine.png` | 15 × 15 | 7, 7 | 1 | silhouette de la cause « traine » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi |
| `cause:laser` | `cause-laser.png` | 15 × 15 | 7, 7 | 1 | silhouette de la cause « laser » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi |
| `cause:souffle` | `cause-souffle.png` | 15 × 15 | 7, 7 | 1 | silhouette de la cause « souffle » sur l'écran de fin (15 × 15) ; pour un ennemi ou son tir, poser le sprite de l'ennemi |
