# Deux pouces sur la chambre de campagne

**18/11/2026 · 00 h 50, Paris**

`node --test preflight.test.cjs` vérifie hors navigateur le jeu de contacts transmis à Chromium et la réponse du contrôleur dans huit directions.

`node parcours.cjs` ouvre la chambre locale dans le seul `headless_shell` de la révision Playwright installée. Le service HTTP est limité à la boucle locale. Le commutateur `--mute-audio`, les propriétés media muettes, le blocage de la lecture et la désactivation de Web Audio sont en place avant l'exécution du jeu. Le parcours démarre avec « Jouer en silence ».

Le transport utilise uniquement `Input.dispatchTouchEvent` pour les gestes. L'option Chromium `SyntheticPointerActions` permet d'ajouter ou d'enlever un doigt en transmettant les identifiants actifs avec `touchMove`. Chaque essai enregistre les événements reçus par la page, la confiance native, le nombre de contacts et la capture du manche. [Implémentation Chromium de la version installée](https://chromium.googlesource.com/chromium/src/+/140.0.7339.16/content/browser/devtools/protocol/input_handler.cc)

Le banc cadence les images de simulation à 60 Hz et fixe la graine de la partie. Les seuils de pilotage, les collisions, les écouteurs tactiles et les limites de jeu appartiennent à la chambre. Les caps de vol sont évalués après projection de la direction moteur sur l’écran. La fiche de résultats `mesures.json` est écrite par le lancement Chromium, avec le statut individuel des gestes et les événements bruts. Ce protocole mesure les entrées d'un navigateur mobile émulé, pas le confort des pouces sur un appareil physique.

## Résultat mis à jour à 01 h 05, Paris

Le premier passage (`avant-correction.json`) reproduit cinq échecs sur 26 contrôles. Un contact secondaire recevait des `pointerdown` et `pointerup` natifs, mais aucun `click` sur les boutons Nova, Plan et Pause. Le jeu utilisait seulement le dernier événement.

Après branchement de `actions.js` aux boutons de la chambre, la recette enregistre 27/27 contrôles réussis, sans erreur JavaScript, sous Chromium 140.0.7339.16 à 852 × 393 pixels CSS. Le 27e contrôle vérifie qu’un glissé du second doigt annule la nova. La levée tolérée à trois pixels au-delà du bord déclenche la nova. La capture du premier doigt reste active après le portail ; le plus grand écart angulaire relevé est de 0,006° sur les huit directions. Les résultats proviennent de `mesures.json`. Trois tests Node complètent le parcours pour le transport, le contrôleur et le dédoublonnage du bouton.
