# Signatures à la bouche de la forge

18/11/2026 · 02 h 29 (Paris)

Pour chacun des trois cœurs, les départs à vide d’Écho, Chaîne et Détonation donnaient les mêmes pixels à 40, 120 et 175 ms. Le véritable événement `forgeShot` commande désormais deux fronts courbes pour Écho, un éclair brisé pour Chaîne, trois rayons pour Détonation. Les motifs suivent l’orientation du départ et durent 190 ms. Le second tir différé d’Écho conserve son effet existant. [Planche du prisme à 120 ms](planche.png)

Le banc exerce les trois cœurs et les trois catalyseurs dans les cinq époques, avec deux orientations et deux configurations (plan inférieur normal, plan supérieur réduit). À taille mobile 568 × 275 CSS, canevas DPR 2, les 540 comparaisons par paires avaient zéro pixel différent avant raccord. Après raccord, chaque paire présente au moins 21 pixels de contraste 3:1, médiane 93. Les minima par époque sont respectivement 21, 54, 64, 89 et 81 pixels. Un motif individuel modifie au maximum 226 pixels sur 624 800 dans la vérification plein cadre. La marque garde sa forme au fil du tir et se retire lors d’un masque de danger ou à l’expiration. L’interprétation par les joueurs reste à observer.

Sous Node/Skia, le P95 de soumission du petit tracé est au plus de 0,004 ms dans cette passe, hors synchronisation finale. Les contrôles de salve annoncée et de vague active retrouvent exactement les octets du témoin. Le moteur de lancement et les trajectoires restent ceux de la forge. [Mesures](mesures.json)

Le préparateur de livraison a produit l’édition isolée `abff3c81f9b275df` avec 62 scripts. Le bundle passe `node --check` et contient une fois le module, la distribution de l’événement et le point de dessin. Les sources de jeu concernées sont `bouche/bouche.js`, `campagne/chambre.js`, `campagne/index.html` et `spectacle.js`. Reproduction du banc avec `node essais.cjs`.
