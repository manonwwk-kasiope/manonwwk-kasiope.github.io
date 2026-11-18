# Animation des dix gardiens

18/11/2026 · 00 h 41, Paris

Ouvrir `relecture.gif` pour revoir les dix personnages animés à partir de leurs combats réels. La planche `planche.png` permet d’examiner une pose de chaque phase. L’apparition du losange clair indique le moment où le moteur accepte les dégâts majorés au cœur.

| Époque | Gardien intermédiaire | Gardien final |
|---|---|---|
| 1976 | Le Registre écarte ses montants et fait coulisser les curseurs avant de les rabattre. | Le Mainframe comprime ses racks, les rapproche à la frappe puis écarte leurs portes devant le cœur. |
| 1985 | Les pôles du Magnétron arment leur étreinte en pivotant autour de deux fixations. | Les paupières du Cyclope se resserrent, la pupille frappe puis l’œil s’ouvre. |
| 1995 | Les bras du Signal fantôme passent de la verticale au travers des voies. | La cheminée de la Locomotive Spectre s’enfonce puis se redresse pendant que la bielle pousse ; le foyer flambe en récupération. |
| 2185 | Le Pulsar incline deux antennes articulées et renverse leur axe au tir. | L’Éclipse rapproche deux coques orbitales et les disjoint pour exposer leur liaison. |
| 2985 | Le Dévoreur serre sa mâchoire et dégage ses crocs du centre lors de l’ouverture. | Les six pales de la Singularité aspirent en spirale, inversent leur torsion puis s’écartent. |

L’anticipation suit `1 − remaining / total` sur l’attaque réelle, y compris lors d’une seconde ou troisième salve. La déformation se renverse au passage à l’état actif, puis les pièces se stabilisent sur le temps de récupération du gardien. Les époques 1976, 1985 et 1995 disposent respectivement de trois, cinq et huit paliers ; les deux dernières sont interpolées en continu. La préférence de mouvement réduit sélectionne une pose fixe par phase et bloque les reflets du sprite. Un changement d’état reste immédiatement visible. La construction du mouvement reprend les principes d’anticipation et de prolongement du geste décrits par John Lasseter. [Article original, SIGGRAPH 1987](https://users.cs.northwestern.edu/~animation/Lasseter_1987.pdf)

**Raccord dans le rendu.** Charger `animation.js` puis entourer uniquement le dessin du personnage. Le premier appel trace les attaches arrière et place le châssis dans son repère local. Le second ajoute les organes frontaux et restaure le contexte.

```js
const options = {
  x: a.x, y: a.y, unit, plane: z, kind: p.kind, time: t, reduced: cam.reduced,
  footprint: tile(cam, p.x, p.y, z, 1.5)
};
const token = SnakeBossAnimation.before(c, cam.year, p, options);
SnakeSprites.draw(c, 'boss', cam.year, token.sprite);
SnakeBossAnimation.after(c, token);
```

Le quadrilatère `footprint` est indispensable au plafonnement de la taille apparente. La jauge et l’empreinte au sol restent dans le repère de caméra de l’hôte. Le module lit les données du gardien sans modifier la simulation.

**Vérifications.** `node eprouver.cjs` exécute les cinq campagnes réelles depuis leur premier cran, avec le pilote et les assertions de victoire des gardiens. Sur 2 689 lectures où un boss était présent, l’ouverture correspond exactement aux 936 lectures où `boss.weak` était vrai. Les dix gardiens passent par les trois phases. En mouvement réduit, les coordonnées et couleurs des pièces demeurent identiques dans une même phase. Le contexte Canvas revient à sa profondeur initiale après chaque paire d’appels. Les états et nombres de paliers observés figurent dans `etats.json`.

`planche.py` compose les rasters réels avec leurs pièces mobiles et compare les pixels de couverture supérieure à 50 % au quadrilatère projeté de trois cases par trois. La mesure porte sur 30 poses à trois largeurs d’écran, 320, 568 et 852 px CSS, soit 90 compositions. Aucune ne déborde du quadrilatère. La largeur maximale mesurée atteint 71,61 % et la hauteur 91,11 % des dimensions projetées. Dans une première version sans plafonnement, le Registre atteignait 159,78 % de la hauteur de son empreinte. La composition corrigée demeure lisible sur la planche.

En phosphore, le remplissage et le joint sombre du cœur ont un contraste de palette de 16,88:1. Après sous-échantillonnage à la taille CSS sur fond uni, le plus faible contraste local maximal observé descend à 4,72:1 pour le Registre et 6,78:1 pour le Mainframe. Le cœur le plus étroit mesure 3,20 px CSS. Ces chiffres décrivent le dessin isolé aux tailles éprouvées ; la lisibilité derrière une arme ou dans la lumière du décor reste à vérifier sur le téléphone. Détail par gardien dans `emprises.json`. Ajouter `--film` à la commande de composition pour recréer la relecture à douze images par seconde.
