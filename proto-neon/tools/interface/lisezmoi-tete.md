# SNAKE 2975 — les actifs d'interface

*Fichier produit par `proto-neon/tools/interface/genere.mjs`. L'en-tête vient de
`tools/interface/lisezmoi-tete.md` et le catalogue de `interface.json`. Ne le modifiez pas à la main :
relancez le script.*

Ce dossier contient **{{N}} sprites d'interface** en gros pixels, dans la palette fermée de
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
  joueuse. Voici le nombre de pixels cyan et cyan pâle par icône de 16 × 16 : {{CYAN}}. Les maquettes de
  cartes posent les icônes à l'échelle 2, et la part de cyan hors joueuse reste à 0,28 % en paysage et
  0,33 % en portrait. C'est sous le seuil de 0,5 % de R-03, à condition que le HUD porte le code 9. Si
  une main de cinq cartes très cyan approchait le seuil, `dbg.masque()` peut marquer les icônes d'arme en
  code 3 (arsenal) : ce sont des images de l'arsenal de la joueuse.
- **La rareté se lit deux fois** (§ 2.7) : par l'encre (acier, os, ambre, jaune) et par les crans au coin
  haut droit (1, 2, 3, 4). La carte ULTIME a en plus un reflet tramé en 16 images, qui passe une fois par
  seconde à 16 i/s, sous la limite de 3 passages par seconde.
- **Silhouettes des 19 icônes** : l'intersection sur union des masques, deux à deux, vaut au plus
  {{IOU}}. Le seuil du lot 6b est 0,6.

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
