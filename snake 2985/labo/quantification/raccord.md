# Quantification du laboratoire

18/11/2026 · 01 h 08 (Paris)

Charger `quantification/quantification.js` avant le premier rendu. Dans `SnakeMondes.finish`, conserver le retour anticipé du 32 bits, le choix des surfaces et le calcul de `w,h`. Entre la lecture et la restitution de l’image, le chemin optimisé tient en deux lignes.

```js
const img = c.getImageData(0, 0, w, h);
SnakeQuantification.convert(img.data, w, h, f.bits, f.palette ? lut(year) : null);
```

La ligne suivante existante est `c.putImageData(img,0,0)`. Les fixtures qui chargent uniquement `mondes.js` peuvent garder la boucle historique dans la branche `else` de `if (window.SnakeQuantification)`. Déclarer la vue `packed` historique uniquement dans ce `else`.

Les palettes 2 et 4 bits restituent l’alpha 255 comme le convertisseur d’origine. Les formats 8 et 16 bits conservent l’alpha source à l’octet près. Le module conserve le 32 bits par retour immédiat. La voie par octets couvre les tampons non alignés et les architectures à octet fort en premier.

## Vérification

Dans ce dossier, `node identite-finish.cjs` vérifie les sorties RGBA de la fonction entière figée sur dix captures et les deux chemins de surface. `node essais.cjs` vérifie les 32 768 indices RGB555 dans les seize positions Bayer et huit résidus, puis les captures et quatre tailles complémentaires de bruit déterministe. Il mesure deux variantes en ordre alterné après 24 paires de préchauffage, sur 181 paires par scène. Le reçu contient les médianes et P95 de chaque étape en millisecondes. Le chronométrage encadre les appels synchrones de Node/Skia sur Apple M5. La génération préalable du contenu des surfaces est exclue.

Les huit combinaisons testées gagnent en médiane sur la conversion et sur la passe complète. À 740 en 2185, le P95 de la conversion passe de 0,605 à 0,142 ms, tandis que celui de la passe complète passe de 3,438 à 3,956 ms. La mesure sur appareil iOS dépend de sa propre implémentation Canvas.
