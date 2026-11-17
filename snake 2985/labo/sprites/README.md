# Sprites du serpent et des gardiens

18/11/2026 · 00 h 16, Paris

`planche.png` réunit les cinq serpents avec leur corps, leurs drones et leurs cellules, ainsi que les dix gardiens nommés. Les crocs cathodiques, la flèche chromée, la locomotive, le vaisseau à deux nacelles et la carapace astrale ouverte possèdent chacun leur propre contour. Le CRT de 1976 emploie quatre intensités de phosphore. Les coordonnées des formes et les couleurs sont dessinées dans ce dossier ; l’atlas se construit en mémoire.

## Appel depuis le rendu

Charger `sprites.js` et appeler `window.SnakeSprites.draw(ctx,role,year,options)` dans le repère de dessin de 960 × 440. Les rôles sont `head`, `body`, `cell`, `drone` et `boss`.

- `x,y` sont le centre projeté de l’acteur. `angle` indique le cap à l’écran en radians, zéro vers la droite. La tête accepte tous les caps du vol. Les bosses de la planche sont à angle zéro.
- `unit` vaut le facteur de perspective, généralement `point.k * cam.zoom`. Le module applique la taille propre à chaque acteur. Si l’hôte a déjà translaté le contexte, fournir `x:0,y:0` et éviter une seconde rotation ou mise à l’échelle. Les barres de vie, préavis et empreintes restent dessinés dans le repère du terrain.
- `plane` est 0 ou 1, `kind` vaut `mid` ou `final` pour un gardien, `bonus` modifie la cellule. `time` est en secondes et `reduced:true` fige les reflets. Le repère de collision reste au même point pour toutes les phases.
- Le module lit `ctx.canvas.clientWidth` pour maintenir une taille minimale lorsque l’arène est petite. Sur un canvas hors écran, transmettre la vraie largeur CSS dans `viewportWidth`.
- `SnakeSprites.link(ctx,year,a,b,unit)` trace l’attache entre deux points projetés. Dessiner les attaches avant les sprites ; dessiner la tête active après le cou et les acteurs hors plan qui la croisent. La transparence du plan éloigné se règle dans l’hôte. Cette priorité est nécessaire quand une autre couche recouvre exactement la tête.

## Vérification locale

`node verifier-api.cjs` exerce les transformations du véritable point d’entrée Canvas. Les 11 520 appels couvrent deux plans, seize angles et les phases fixe et animée. La deuxième passe réutilise chaque surface sans nouvelle construction. Les transformations sont équilibrées à la sortie. Voir `api.json`.

`verifier.py` utilise le catalogue exporté par Node et le moteur raster local Pillow. Il produit la planche ainsi que les mesures sur quatre teintes, trois largeurs d’arène (320, 568 et 852 px), deux couches, seize caps et cinq époques. Le scénario croise un drone hors plan à 47 % d’opacité, son cou et la tête active dessinée en dernier. Il mesure l’orientation de la proue peinte et les pixels de tête différenciables de la composition précédente.

Sur les 1 920 configurations, la proue reste au minimum 3,38 px CSS en avant du centre, avec une erreur angulaire maximale de 6,32°. Dans le cas de contraste le plus faible, le contraste local maximal atteint 3,28:1 ; dans le cas qui compte le moins de pixels au-dessus de 3:1, un seul pixel franchit ce seuil. Le chevauchement maximal des masques pleins normalisés (intersection sur union) vaut 0,76 entre deux gardiens, 0,70 entre deux têtes et 0,678 entre le drone et la cellule d’une même époque. Voir `mesures.json`.

Ces mesures utilisent des fonds unis et une scène synthétique hors navigateur. Une reconnaissance humaine des dix gardiens dans les vrais décors et les superpositions du gameplay sur iPhone reste à vérifier.
