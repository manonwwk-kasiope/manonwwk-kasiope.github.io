# Surcharges, variations de lumière et annonces des gardiens

18/11/2026 · 02 h 11 (Paris), mis à jour à 02 h 31

Sur les 895 paires d’images consécutives hors coupes, la plus grande surface dont la luminance monte ou descend de plus de 0,10 dans le même sens représente 5,03 % du cadre de jeu à 25,83 s, en 2985. Le pic dans le rectangle central atteint 13,13 %. Le film contient une surcharge du train en 1995, à 16,08 s. Chaque vignette de la planche correspond à l’image du pic de son époque. Le SHA-256 du film est `78682ecee508fae0c95b8e6b3e267fcdfd8a1eba8f7f053ed56a91d0c803d59c`. [Cinq images extraites](prises.png) · [Mesures du film](film.json)

Les cinq surcharges ont donc aussi été rendues en laboratoire, avec leur physique réelle, l’onde de nova de base, le décor peint et le motif d’annonce du gardien final de chaque époque. On compare chaque scène à elle-même en retirant la surcharge et l’onde, à caméra et temps identiques. Les maxima ci-dessous portent sur l’union projetée des deux grilles. « Pixel changé » inclut les petites variations de palette. Le seuil fort correspond à une différence de luminance linéaire de 0,10 dans un même sens.

| Époque | Film, pic de variation forte dans le cadre | Arène du labo, pixels changés normal / réduit | Arène du labo, pixels fortement modifiés normal / réduit |
|---|---:|---:|---:|
| 1976 | 0,96 % | 3,22 / 3,31 % | 1,88 / 2,19 % |
| 1985 | 3,48 % | 3,71 / 3,49 % | 1,55 / 1,39 % |
| 1995 | 2,65 % | 2,53 / 2,51 % | 1,08 / 1,05 % |
| 2185 | 2,93 % | 4,88 / 5,22 % | 3,18 / 3,34 % |
| 2985 | 5,03 % | 5,65 / 5,89 % | 3,33 / 3,39 % |

**L’annonce reste identifiable dans les superpositions étudiées.** Le masque de collision du boss est peint après les armes. Pour chaque état, deux rendus additionnels sans dessin du masque isolent son signal. En 2185, au pire instant, 11,42 % des pixels initialement distinctifs du masque passent sous le seuil de 0,10 ; chacune des cases qui comptait au moins huit pixels distinctifs en conserve au moins huit. En 1985 réduit, une seule case sur 52 descend de neuf à sept pixels. Le gros plan montre que le corps du serpent cachait déjà l’essentiel de cette diagonale dans le témoin. Les autres cases maintiennent le dessin de la voie. Aucun correctif du jeu retenu. [Gros plan comparatif](annonce-1985.png) · [Mesures des superpositions](laboratoire.json)

FFmpeg a décodé les 900 images vidéo hors écran, sans audio. Les quatre coupes sont éliminées, soit 895 paires, et le cartouche est exclu. Le rectangle central du film mesure 640 × 160 dans le champ de 960 × 440. Le banc Skia utilise 15 instants par tir, deux modes de mouvement et les cinq années. Il maintient l’annonce d’origine au-delà de sa durée habituelle pour faire coïncider les différentes phases. La réduction conserve la géométrie des collisions et simplifie le mouvement du dessin ; l’aire maximale peut donc rester proche de celle du mode normal. Le film échantillonné à 30 images/s et ces états préparés ne couvrent ni toute transition intermédiaire, ni tout combat. Ces mesures caractérisent les images et leur lisibilité ; aucune certification médicale n’en découle.
