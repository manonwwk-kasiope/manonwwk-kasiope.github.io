# Identifier le plan d’une cellule sans lire sa couleur

18/11/2026 · 02 h 01 (Paris)

Le jeu affiche auprès d’une cellule de l’autre grille un chevron et un court trait horizontal. Le chevron pointe vers le haut pour la grille supérieure et vers le bas pour l’inférieure. Le repère se place du côté libre, se retire si l’objet est masqué ou les deux côtés occupés, et reste éteint en vol. Il conserve sa pose en mouvement réduit.

En 1995 sur la grille haute, le ticket de la grille basse avait zéro pixel avec un contraste de luminance de 3:1 par rapport au même fond sans ticket. Sur le canevas de 568 × 275 CSS, le ticket et son repère en produisent désormais **48 au fond et 88 à l’avant**, en vision ordinaire et dans les deux simulations de déficience rouge-vert. Le petit trait et la pointe restent perceptibles même lorsque le contour du ticket s’efface. [Comparaison visuelle](planche.png)

Les cinq époques ont été rendues sur deux tailles, deux plans actifs et deux profondeurs. Le palier et son chevron apportent au moins huit pixels de contraste 3:1 dans **40 scènes sur 40** sous chacune des trois conditions de vision. La flèche fine le fait dans 31 scènes sur 40. La différence maximale représente 0,041 % de l’image pour cette cellule. Le test porte sur des positions connues et le contraste d’une marque fixe. Il ne mesure pas le temps de compréhension au pouce.

Les objets, la tête, les portails et les zones de danger réservent leur emprise à l’écran, y compris quand ils appartiennent à l’autre grille. Vingt rendus où l’annonce ou l’impact occupent les deux côtés de la cellule reproduisent exactement l’image précédente. Trente autres rendus conservent un repère visible près d’une case d’annonce isolée : aucun pixel de cette case ne change. La cellule du plan courant est identique au témoin dans chaque époque. [Résultats et contrôles](mesures.json)

Le raccord appelle `SnakeMarquage.drawDepth` dans `spectacle.js`, après la grille de chaque plan et avant les armes, les masques et les acteurs. La recette se relance avec `node essais.cjs`, sans navigateur.
