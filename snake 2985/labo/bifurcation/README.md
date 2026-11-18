# Choix du saut temporel

18/11/2026 · 00 h 26, Paris

Ouvrir `index.html?v=A` pour les cartes ou `index.html?v=B` pour l’axe temporel. Le panneau de gauche garde le bilan, le record de cette année et les commandes de reprise et de nouvel essai. Le choix d’une destination se confirme avec un bouton distinct. Ajouter `&year=2985&status=won` pour examiner le nouveau cycle.

Les cartes montrent simultanément le paysage, les bits et le record de chaque destination. La molette réserve une grande image à la destination sélectionnée. Elle se pilote par les dates, les flèches du clavier, un glissement horizontal sur l’image ou la molette de la souris. Début et Fin vont aux deux extrémités. Le parcours clavier entre dans le groupe par une seule tabulation ; la suivante atteint la confirmation.

## Intégration

Charger `bifurcation.css` et `bifurcation.js`. Ajouter les cinq fichiers `paysage-ANNÉE.webp` à côté du script. La fonction monte une section à l’intérieur du parent fourni et respecte la hauteur disponible. Transmettre `variant:'cards'` ou `variant:'wheel'`.

```js
const panel = SnakeBifurcation.mount(parent, {
  year: state.year,
  status: state.status, // dead, cleared ou won
  score: state.score,
  records: bestByYear, // {1976: 1920, 1985: 3250, ...}
  boss: guardianName,
  cause: state.cause,
  durationMs: clip ? clip.end - clip.start : 0,
  drawReview: canvas => drawImpactFrame(canvas)
}, {
  onReview: ({canvas, durationMs}) => inspectRecordedFrames(canvas, durationMs),
  onJump: ({year, cycle}) => startCampaign(year, cycle),
  onRetry: ({year}) => restartCampaign(year)
}, {variant:'cards'});
panel.focus();
// Lors du départ ou à la fermeture de l'écran :
panel.destroy();
```

Les fonctions de rendu, de démarrage et de sauvegarde de cet exemple sont fournies par l’hôte. Le mini-canvas de reprise est facultatif et reste visible pendant la consultation des destinations. Le parent conserve la responsabilité d’arrêter sa lecture s’il retire le panneau. Si les images résident ailleurs, fournir `assetBase` (URL terminée par un slash). Les callbacks de départ se déclenchent une seule fois. Le composant lit les records par année.

`SnakeBifurcation.destinations(year,status)` renvoie les destinations autorisées. Après une défaite, toutes les dates strictement ultérieures sont proposées. Une victoire ouvre la prochaine date. À l’issue de 2985, le saut ouvre un nouveau cycle en 1976. « Rejouer » relance l’époque qui vient de s’achever.

## Sources et vérifications

Les paysages sont de véritables recadrages des cinq scènes de `../mondes/scene-ANNÉE.png`. `paysages.py` en extrait la moitié haute et exporte en WebP. La démo montre un impact contre le mur produit par le moteur ; son score et ses records sont des données de démonstration.

`node verifier-node.cjs` couvre 30 combinaisons de dates, issues et variantes dans un substitut DOM. Le contrôle vérifie la sélection au clavier, les événements de pointeur, la molette, les rappels, le rejet des doubles confirmations et la présence de toutes les images. Voir `node.json`. Les mesures de surface et de cibles sont prises dans le moteur WebKit par `node verifier-webkit.cjs`.

### Comparaison mesurée, mise à jour à 00 h 34

| Fenêtre CSS | Variante | Surface du rapport | Surface des paysages | Plus petite largeur de cible | Plus petite hauteur |
|---|---|---:|---:|---:|---:|
| 568 × 320 | A · cartes | 46 248 px² (27,6 %) | 18 704 px² | 153 px | 44 px |
| 568 × 320 | B · molette | 46 248 px² (27,6 %) | 56 700 px² | 85,6 px | 44 px |
| 852 × 275 | A · cartes | 61 348 px² (27,2 %) | 29 277 px² | 234,4 px | 44 px |
| 852 × 275 | B · molette | 61 348 px² (27,2 %) | 67 121 px² | 134,5 px | 44 px |

La surface des paysages additionne les boîtes des images, légende superposée comprise. Chaque variante compte sept cibles dans le choix à quatre destinations. WebKit a vérifié l’absence de chevauchement et de dépassement du panneau ainsi que l’accès tactile, les touches Début et Fin, la consultation de reprise, la confirmation et le nouveau cycle. Les fichiers `preuve-A-568.png`, `preuve-A-852.png`, `preuve-B-568.png` et `preuve-B-852.png` montrent les écrans mesurés ; `webkit.json` conserve les rectangles et surfaces.

Retenir A en premier choix pour viser un record, car les quatre scores des destinations sont visibles simultanément. B convient lorsque la comparaison porte d’abord sur les paysages ; seule l’époque sélectionnée affiche son record. La reconnaissance des décors et les préférences des joueurs sur un iPhone physique restent à mesurer.
