# Quantification dans MobileSafari

18/11/2026 · 01 h 25 (Paris)
Le simulateur iPhone 17 utilise iOS 27.2. Les deux canevas mesurés occupent respectivement 874 × 292 et 568 × 275 points CSS dans le viewport paysage. La scène est celle du boss de chaque époque avec la même géométrie, le même équipement et les mêmes instants dans les deux chemins. Les 24 paires d’empreintes SHA-256 du framebuffer RGBA concordent. Les quatre WebP et les scripts ont été gelés et hachés avant le démarrage. Les compteurs audio indiquent zéro tentative.

Chaque époque et chaque taille comporte huit fenêtres de 3,9 s en ordre A/B/B/A équilibré, avec quatre frames de chauffe entre les fenêtres. Les agrégats sont établis sur toutes les images du même chemin. Les temps de conversion encadrent seulement le branchement de conversion, et le temps de dessin couvre SnakeSpectacle.draw, lecture et restitution comprises. Le rAF mesure l’intervalle entre deux callbacks. La mesure porte sur le Safari du simulateur.

| CSS | Année | Images A / B | Conversion p50 A / B | Conversion p95 A / B | Dessin p50 A / B | Dessin p95 A / B | rAF p95 A / B |
|---|---:|---:|---:|---:|---:|---:|---:|
|874 × 292|1976|845 / 906|0.14 / 0.08|0.20 / 0.10|7.00 / 6.70|9.52 / 8.90|21.00 / 21.00|
|874 × 292|1985|929 / 922|0.18 / 0.10|0.20 / 0.12|5.58 / 5.64|8.98 / 8.80|16.94 / 16.76|
|874 × 292|1995|924 / 930|0.64 / 0.12|0.92 / 0.16|6.26 / 5.44|11.04 / 9.22|18.24 / 16.76|
|874 × 292|2185|928 / 934|0.40 / 0.08|0.48 / 0.10|5.76 / 5.58|9.54 / 8.70|16.80 / 16.74|
|568 × 275|1976|903 / 933|0.26 / 0.10|0.58 / 0.28|5.34 / 5.30|8.18 / 7.94|18.24 / 16.76|
|568 × 275|1985|938 / 934|0.40 / 0.18|0.44 / 0.20|6.06 / 6.20|7.00 / 6.90|16.72 / 16.72|
|568 × 275|1995|934 / 936|1.02 / 0.20|1.52 / 0.30|7.28 / 7.50|9.14 / 9.08|16.72 / 16.72|
|568 × 275|2185|937 / 934|0.56 / 0.38|0.68 / 0.40|5.96 / 6.28|7.08 / 7.24|16.70 / 16.72|

Sur 14 767 images chronométrées, le P95 de la conversion baisse dans 8/8 combinaisons et le P95 du dessin complet dans 7/8. À 568 × 275 pour 2185, le dessin P95 passe de 7,08 à 7,24 ms et le rAF P95 de 16,70 à 16,72 ms. Les variations du dessin ne s’expliquent pas toutes par la conversion. La nouvelle passe peut rester activée sur les quatre formats étudiés. Le rendu natif 2985 ne passe pas par ce convertisseur.

A est la boucle originale, B la conversion par tables. Tous les temps sont en millisecondes. Les mesures portent sur des scènes de boss à état physique figé dont l’animation graphique continue.

Reçu brut et empreintes disponibles dans `safari-011955.jsonl`.
