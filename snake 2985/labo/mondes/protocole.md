# 18/11/2026 · 00 h 10, Paris

Les cinq époques sont comparées sur la même scène de jeu. [Voir les cinq captures côte à côte](cinq-mondes.png). [Ouvrir les décors animés](comparaison.html).

| Époque | Palette et résolution de travail | Mouvement du monde | À l’approche du gardien |
|---|---|---|---|
| 1976 | Quatre niveaux de phosphore, largeur 384 px | Oscillogramme, balayage, diodes et papier entraîneur | Le signal accélère, son amplitude et le nombre de diodes augmentent |
| 1985 | Palette de 16 couleurs, largeur 480 px | Convoi de porteurs quadrupèdes, pluie, ville et viaduc à vitesses différentes | Le convoi accélère et les signaux du viaduc s’allument en séquence |
| 1995 | RGB332, largeur 568 px | Express profilé, ligne aérienne et quais en pixel art | Le train accélère et le portique change de signal |
| 2185 | RGB565, largeur 768 px | Grues sur l’anneau, barges, étoiles en parallaxe | Les barges convergent en hauteur vers le chantier |
| 2985 | RGBA 8888, résolution native du canvas | Filaments des arches, poussière et disque d’accrétion | L’ombre centrale rétrécit, la matière orbite plus vite |

Les formats rétro traitent l’image en dernier, après la grille, les gardiens, le serpent, les effets et la forge. Le rapport d’aspect est conservé. La largeur du tampon respecte la définition disponible sur les écrans plus petits. Une scène peut employer une partie de sa palette.

## Recette reproductible

Depuis ce dossier, exécuter `node mesurer.cjs` pendant un créneau navigateur disponible. La recette lance Chromium headless-shell muet, neutralise la lecture des médias avant de charger une page locale et ferme son propre processus. `node planche.cjs` régénère seulement la planche à partir des captures.

Le viewport mesure 740 × 328 pixels CSS, le canevas de mesure 1 480 × 656 pixels. Les cinq époques partagent la même géométrie, les mêmes entités et le même instant. Chaque contrôle de signal compare deux rendus sur une fenêtre de 17 × 13 pixels centrée sur la projection prévue. La référence omet uniquement le dessin de la tête et du corps, ou celui des cases de danger. La caméra et la simulation restent identiques. Au moins six pixels doivent différer avec un rapport de luminance supérieur ou égal à 3. Les dix contrôles de scènes sol et bascule ont franchi ce seuil pour les deux signaux.

Le test de mouvement compare le tiers supérieur de l’image à deux secondes d’intervalle, en état normal et en mode réduit. Un pixel est compté lorsque la somme des différences des trois canaux dépasse 12. Pour l’approche du gardien, le temps reste fixe et le paramètre de proximité passe de 0 à 1. Le mode réduit fige le décor. Les captures apportent une vérification graphique et les mesures une vérification des pixels. Un test de reconnaissance auprès de joueurs et une mesure sur iPhone physique restent à faire.

Les performances mesurées incluent le décor, les deux grilles, toutes les entités, la présentation rétro éventuelle et la lecture synchrone des pixels de tout le canevas sur Mac. Les valeurs sont en millisecondes. Trois images de chauffe précèdent chaque série de quinze. Le 95e percentile de ces petites séries correspond à leur maximum. [Consulter les mesures détaillées](mesures.json).
