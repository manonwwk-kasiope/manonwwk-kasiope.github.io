# Virages saisis

18/11/2026 · 01 h 34 (Paris)

Le module lit directement `s.turns` à chaque rendu. Il marque la première et, si elle existe, la deuxième case de destination. Le point de départ est la tête physique, y compris au changement de plan. Les marques utilisent la même projection que les cases. La première est plus longue et plus claire. Le moteur reste seul responsable de la file, du mouvement et des collisions.

Pour intégrer dans la campagne, charger `../virages/virages.js` avant le rendu. Dans la boucle des plans de `SnakeSpectacle.draw`, entre `c.save();c.globalAlpha=selected?1:.47;` et l’appel à l’artillerie, insérer :

```js
window.SnakeVirages?.draw(c, s, cam, z, project);
```

Le module s’active pendant Turbo ou pendant le Parcours découverte choisi et encore actif. Lorsqu’une case porte un objectif, une menace, un corps ou une porte, les marques s’arrêtent devant cette case. Le passage dans le vol, la fin de partie et la consommation du dernier ordre les retirent immédiatement.

## Essai hors navigateur

`node essais.cjs` compare le rendu sans indicateur, un pointillé continu et les deux empreintes sur les cinq palettes finales, deux résolutions CSS (568 × 275 et 874 × 292, canevas DPR 2), les deux plans, deux profondeurs et quatre orientations. Le seuil de détection retenu est huit pixels de sortie dans chacune des deux cases, de rapport de luminance au moins 3:1 par rapport aux mêmes pixels sans indicateur. Cette mesure décrit le signal graphique. L’interprétation au pouce reste à vérifier sur appareil.

Le pointillé satisfait le seuil dans 130 des 160 scènes. Les empreintes le satisfont dans 160 scènes et changent au maximum 0,051 % du canevas. Aucun pixel au centre de la tête n’a changé dans ces comparaisons. Les sept cas protégés (danger, télégraphie, cellule, pointeur, corps, drone, porte) rendent les mêmes octets que le témoin. En simulation Turbo 60 pas/s, l’ordre est visible dès le premier rendu, puis la file passe effectivement de deux marques à une et à zéro au rythme des vrais déplacements. La recette vérifie aussi le retour au rendu témoin à vitesse normale et à la sortie du parcours.
