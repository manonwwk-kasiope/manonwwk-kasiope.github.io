# Lecture de la grille en vision rouge-vert

18/11/2026 · 01 h 57 (Paris)

Le danger dispose désormais d’un indice de forme supplémentaire dans le rendu du jeu. De 1985 à 2985, une diagonale annonce l’attaque, puis une seconde forme un X lors de l’impact. Les deux phases restent distinctes en niveaux de gris, à l’arrêt et avec les animations réduites. [Photogrammes avant et après](phases.png)

| Époque | Cellule visible | Danger à l’impact | Porte de vol |
|---|---|---|---|
| 1976 | Petite masse claire, croix du sprite peu détaillée en fond de grille | Bande hachurée très contrastée, déjà distincte de l’annonce | Grande boucle creuse |
| 1985 | Losange plein et centre clair | X pixellisé | Arche creuse avec une base plus sombre |
| 1995 | Ticket rectangulaire à deux encoches | X dans chacune des cases | Arche sur un anneau de sol |
| 2185 | Noyau ovale et petit anneau oblique | X sur le quadrillage | Arche et base elliptique plus grandes que la cellule |
| 2985 | Étoile pleine | X à deux traits nets | Double contour et centre vide |

Sur les deux plans, les zones de trois cases des quatre dernières époques présentaient **zéro pixel** avec un rapport de luminance d’au moins 3:1 entre annonce et impact, dans chacune des deux simulations rouge-vert. Après correction, ce seuil est franchi par 38 à 98 pixels selon la scène et la simulation. En luminance seule, les fourchettes sont 38–55 pixels en 1985, 64–68 en 1995, 77–89 en 2185 et 93–94 en 2985. Le contrôle des vingt rendus avant et après confirme que chaque pixel modifié se situe dans une case active. L’annonce et les deux phases de 1976 reproduisent exactement les pixels du rendu précédent. [Mesures avant](avant.json) · [Mesures après](mesures.json)

**Le plan de jeu reste le point le plus fragile.** Le bouton affiche « Plan 1 » ou « Plan 2 ». La bascule déplace les deux plateaux et la grille active est plus serrée. À emplacement identique, les deux cellules de la scène testée sont séparées de 16,35 points CSS. Leur silhouette est commune et la cellule inactive est atténuée. En 1995, quand le plan supérieur est actif, aucun pixel de la cellule inférieure testée n’atteint 3:1 par rapport à son fond sous l’une ou l’autre simulation. La profondeur d’une cellule isolée ne peut donc pas toujours se lire par sa seule forme. La porte de vol a été vérifiée ici ; les portails de bascule et les failles partagent par ailleurs le tracé anneau–ovale du rendu et cette étude ne démontre pas leur distinction mutuelle. [Comparaison de scènes](planche.png)

Le banc utilise dix états de grille du moteur (cinq dates × deux plans), les palettes finales et cinq captures archivées du jeu en combat. Il applique les matrices de Machado, Oliveira et Fernandes à sévérité maximale en RGB linéaire. Le canevas mesure 568 × 275 CSS avec DPR 2. Les comptages portent sur des positions connues ; ils n’établissent ni le taux de reconnaissance d’un joueur, ni la lecture de cibles qui se recouvrent au milieu des tirs. Reproduction locale avec `node audit.cjs`. [Méthode de simulation](https://doi.org/10.1109/TVCG.2009.113)
