# Laboratoire des commandes de Snake 2985

18/11/2026 · 00 h 01 (Paris)

Ouvrir `index.html` depuis le dépôt (aucun serveur requis). La grille se traverse par les bords. Collecter les cellules rondes, viser les drones carrés. Une cellule vide appartient à l’autre plan. Les armes de la forge tirent automatiquement. Le bouton « Vol libre » permet de tester le passage au pilotage continu à tout moment.

| Commande | Stick flottant | Glissé |
|---|---|---|
| Virage sur la grille | Poser le pouce et l’incliner vers la direction voulue. Le centre reste au premier contact. | Dessiner un segment de 18 px par virage. Le point de départ suit chaque segment validé. |
| Vol libre | Le vecteur du pouce indique le cap absolu. | Le glissement horizontal modifie le cap de départ de 180° par 66 px. Reposer le pouce pour poursuivre un grand virage. |
| Plan et nova | Pouce droit sur « Plan ⇄ ». Pour la nova, maintenir 280 ms et relâcher dans sa cible. | Mêmes actions. Le pouce gauche peut continuer à piloter. |

Le changement de plan se déclenche au relâchement. Sortir de la touche ou dériver de plus de 14 px annule l’action. Le pilote ignore les diagonales indécises sur la grille. L’arène refuse les demi-tours et garde deux virages en attente. Le changement de mode, l’ouverture de la forge et la perte de visibilité libèrent les pointeurs.

Dans la forge, toucher un noyau et un catalyseur lance la projection avec la simulation de `../../forge.js`. Le jaune illustre le catalyseur, le violet les projectiles et l’orange les drones. « Équiper » applique la combinaison à l’arène. « Retour » abandonne les essais. Avec « Réduire les animations », l’atelier fige une image calculée et garde la description du comportement.

## Branchement au moteur

`LabControls.createInput(callback, {mode:'stick'|'swipe', flying, angle})` retourne `route`, `configure` et `reset`. Envoyer à `route` des objets `{phase,id,x,y,t,zone}`. Phases admises : `down`, `move`, `up`, `cancel`. La zone vaut `pilot`, `plane`, `nova` ou une chaîne vide hors cible. Coordonnées en pixels CSS, temps monotone en millisecondes. L’interface hôte capture le pointeur et détermine sa position réelle au relâchement. Appeler `configure({mode,flying,angle})` aux transitions et `reset()` à la suspension.

Le callback reçoit `turn{x,y,t}`, `aim{angle,t}`, `plane{t}`, `nova{t}` (discriminant `type`). Transmettre le cap avec `SnakeFlight.aim(state, Math.cos(angle), Math.sin(angle))`. Le moteur valide la file de virages, les collisions, le changement de plan et la disponibilité de la nova. L’atelier applique une recette confirmée avec `SnakeForge.equip(state,core,mod)`.

## Mesures reproductibles

`node traces.cjs` injecte des traces synthétiques horodatées. La grille reçoit un mouvement horizontal à 240 px/s, le vol ajoute 120 px/s sur l’axe vertical. Le délai mesure le temps simulé entre le contact initial et la première intention émise. Le script vérifie les diagonales, les contacts simultanés, l’annulation et la garde de la nova.

| Variante | Grille, 60 Hz | Grille, 120 Hz | Vol, 60 Hz | Vol, 120 Hz |
|---|---:|---:|---:|---:|
| Stick | 50 ms | 50 ms | 33,33 ms | 33,33 ms |
| Glissé | 83,33 ms | 75 ms | 16,67 ms | 8,33 ms |

Sur cette trace, je retiens le stick en premier choix pour les virages de Snake. Le glissé présente un intérêt en vol pour corriger le cap à partir de l’orientation en cours. Ces délais caractérisent les seuils et l’échantillonnage des traces. L’acquisition du tactile, l’affichage et le confort des pouces sur un véritable téléphone restent à mesurer.

`node webkit.cjs` vérifie le document autonome avec WebKit headless et deux fenêtres émulées (568 × 320, 852 × 275). Contrôles portant sur les cibles de 44 px CSS, le changement de mode et de plan, les neuf aperçus statiques distincts, l’abandon et la confirmation. Une vérification humaine sur iPhone reste à effectuer pour le masquage par les doigts, les encoches et les gestes du système.

La même trace dépose un demi-tour à 187 ms (rejeté), puis deux virages à 188 et 189 ms. Ils sortent dans l’ordre aux frontières de 190 et 380 ms. Une troisième intention au tampon plein est rejetée. La fonction publique `LabControls.createTurnBuffer()` expose `offer(direction,next)`, `step(direction)` et `reset()` pour reproduire cette règle.

Résultat du contrôle WebKit : les deux tailles passent, avec neuf aperçus distincts par taille et aucune erreur JavaScript enregistrée. Les mesures brutes figurent dans `resultats-traces.json` et `resultats-webkit.jsonl`.
