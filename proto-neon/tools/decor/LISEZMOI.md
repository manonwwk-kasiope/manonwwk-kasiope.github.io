# Outils des plans de parallaxe

- `commun.mjs` : palette fermée (ordre de `00-pal.js`), luminances du § 5.1, Bayer 4 × 4, hasard à graine,
  image d'index, PNG indexé (lecture et écriture), garde des blocs 3 × 3 vifs.
- `genere.mjs` : fabrique `art/decor/*.png` et `art/decor/decor.json` à partir de `art/exterieur.png`,
  `art/affiche.png` et `art/boss.png`, puis contrôle (palette, couleurs interdites, blocs 3 × 3, quartiers
  distincts). Sort 1 si un contrôle échoue.
- `maquette.mjs` : compose le décor comme le fera `15-decor.js` (implémentation de référence, fonction
  `composer`), mesure la lumière (`mesurer`) et écrit des captures dans `out/` (non versionné) ;
  `--verifie` passe les critères du lot 2 mesurables sur le décor seul.

Le format des données et les mesures sont dans `art/decor/LISEZMOI.md`.
