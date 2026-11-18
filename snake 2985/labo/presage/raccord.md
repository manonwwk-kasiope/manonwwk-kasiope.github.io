# Présages avant gardien

18/11/2026 · 01 h 41 (Paris)

Charger `../presage/presage.js` dans la campagne. Dans `SnakeSpectacle.draw`, placer l’appel après `SnakeImpact.skyline` et avant `const projected=snakePoints(...)`.

```js
window.SnakePresage?.draw(c,s,cam,reduced);
```

Le signal commence quand `s.nearBoss` dépasse 0,38, monte progressivement et retombe à 55 % de son amplitude lorsqu’un gardien occupe la grille. Une salve annoncée ou active, une vague d’écologie, une offre du directeur ou un vol suspend le présage. L’horloge est `s.beat` fournie par la bande de campagne. En mode réduit ou sans phase musicale, le signe garde une pose fixe à pression donnée. La limite inférieure du ciel est ajustée à la perspective avec une marge de 30 unités logiques devant les cases les plus hautes.

| Époque | Réaction du décor | Pixels visibles en passant de la noire à sa moitié à 98 % de pression |
|---|---|---:|
| 1976 | Une fenêtre de l’oscilloscope décroche horizontalement et reprend sa trace | 1 920 |
| 1985 | Une bande de l’antenne s’éteint et plusieurs quartiers perdent leurs lumières | 995 |
| 1995 | Trois palettes suspendues à la traverse du quai se rabattent en cadence | 1 196 |
| 2185 | Les lames des obturateurs ferment les panneaux verts de l’anneau | 3 277 |
| 2985 | Deux images courbes du bord supérieur se resserrent autour du trou noir | 1 604 |

Le banc Node/Skia compare le rendu complet activé et témoin sur cinq pressions injectées (0,20 à 0,98) et quatre phases calculées par l’horloge officielle à partir des repères du morceau, en silence. Le canevas mesure 568 × 275 CSS à DPR 2. Le seuil de visibilité est un écart d’au moins 16 niveaux dans une composante RGB après la palette finale. Sur les 100 comparaisons, le signe change au maximum 6 804 pixels sur 624 800 (1,09 %). Le pixel le plus bas atteint la ligne logique 83 sur 440. Les quatre situations d’action prioritaire et le changement de phase en mode réduit ont chacun donné zéro différence dans les cinq époques.

Le P95 du temps de soumission de dessin s’étend de 0,007 à 0,076 ms sur Node/Skia. Le chronomètre exclut la synchronisation raster, la peinture du reste du jeu et la conversion finale. Le ressenti de tension en partie reste à apprécier. Reproduction avec `node essais.cjs` ; `planche.png` et `mesures.json` contiennent les comparaisons et les mesures.
