# 18/11/2026 · 00 h 47, Paris

Le module réutilise les commandes de la chambre. Il conserve les références DOM et modifie les jauges seulement lorsque leur valeur entière change. Les guides centraux disposent d’une marge réservée aux commandes pouvant apparaître à droite. Le manche, le canevas et la physique gardent leurs dimensions d’origine.

| Époque | Cadre et instruments | Signal d’entrée |
|---|---|---|
| 1976 | Chiffres de terminal, bords carrés, voyants phosphore à pas étroits | Balayage de gauche à droite |
| 1985 | Cadres obliques, repères néon inclinés et double liseré | Ouverture symétrique |
| 1995 | Boutons à relief de borne, pavés de progression larges | Passage d’un tronçon de voie |
| 2185 | Support de navigation arrondi, jauge de nova verticale | Repli décentré d’un arc |
| 2985 | Cadres elliptiques, progression continue et réserve de nova en fuseau | Fermeture centrée |

Le niveau couvre les dix secteurs. Entre deux secteurs, sa fraction suit les cellules collectées ou, face à un gardien, la part de ses points de vie déjà retirée. La nova garde son pourcentage exact et son nom visible sur le bouton.

## Branchement

Dans le modèle HTML de la chambre, charger `../instruments/instruments.css` après les feuilles existantes et `../instruments/instruments.js` avec `defer`, avant `chambre.js`. Dans `sync()`, après la mise à jour du pourcentage de nova, ajouter la ligne suivante.

```js
window.SnakeInstruments?.sync(state, screen, calm.matches);
```

Le passage de la préparation au jeu lance un dessin de 360 ms dans les deux pixels inférieurs du bandeau. Les commandes sont déjà actives. La reprise après pause ou atelier garde le HUD en place. La réduction des animations du système ou le réglage calme du jeu supprime le signal. Les HUD n’ajoutent aucun gestionnaire d’entrée.

## Vérifications hors navigateur

`node verifier.cjs` vérifie les cinq palettes, les calculs de progression, la charge de nova, les annonces accessibles, l’absence de réécriture sur un état identique, l’entrée initiale et les reprises en mouvement réduit. Les mesures de luminance relative donnent un contraste de texte principal compris entre 14,52:1 et 15,74:1, d’au moins 5,87:1 pour les jauges et d’au moins 3,79:1 pour les contours. Les commandes son et pause demandent au moins 44 × 44 px CSS. Les commandes de pilotage à droite demandent au moins 50 × 48 px CSS. Le rendu réel et la géométrie finale sous WebKit restent à vérifier en recette.

[Résultats de contraste par palette](contrastes.json)
