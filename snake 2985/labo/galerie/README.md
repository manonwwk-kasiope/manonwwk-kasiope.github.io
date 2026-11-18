# Cinq époques de Snake 2985

18/11/2026 · 00 h 37, Paris · mis à jour à 01 h 07

Ouvrir `cinq-epoques.png` pour la planche. Chaque panneau reproduit le canvas complet d’une scène de jeu. Le texte de présentation se trouve hors des captures. Les cinq originaux à pleine résolution sont les fichiers `scene-ANNÉE.png`.

## Scènes

| Époque | Situation au moment précis de la capture |
|---|---|
| 1976 · 2 bits | Le corps phosphorescent s’approche à une case de la cellule. |
| 1985 · 4 bits | Le moteur vient de basculer la tête sur le plan 1. Les segments précédents suivent sur le plan 0 et le prisme s’est divisé. |
| 1995 · 8 bits | L’express traverse la gare pendant que le directeur ouvre l’aiguillage. |
| 2185 · 16 bits | La collecte d’une cellule a ouvert le portail. Le serpent l’a franchi, puis le pilote lui a donné un cap analogique. Trois anneaux figurent au parcours. |
| 2985 · 32 bits | La dernière cellule du secteur déclenche La Singularité. Le moteur de forge a produit un puits. Le joueur déclenche la nova pendant le préavis du gardien. |

## Reproduire

`node verifier.cjs > etats.json` rejoue les cinq scénarios deux fois sans navigateur. Les états initiaux préparés, la graine de chaque époque, les commandes, les délais en pas de 1/60 s et les valeurs de capture sont dans `replay.js`. Ce sont des situations préparées pour comparer la direction artistique ; elles utilisent ensuite les routines de déplacement, de vol, de garde et de tir de la campagne.

En créneau navigateur exclusif, `node capturer.cjs` ouvre le headless-shell de Playwright avec la sortie audio désactivée. La page locale `scene.html` charge les modules du jeu, notamment `spectacle.js`, les mondes, les sprites et l’artillerie. Elle attend les quatre décors peints sur une origine interceptée localement et dessine chaque image en silence. Le script photographie uniquement le canvas, recharge la page et vérifie l’égalité des deux fichiers PNG avant de conserver l’original et son empreinte dans `captures.json`.

`planche.py` compose les cinq fichiers avec Pillow, en conservant leur format et en ajoutant les légendes à l’extérieur des images. Les captures de ce lot reproduisent la version du laboratoire du 18 novembre à 01 h 07. Un changement ultérieur du moteur ou des dessins peut faire évoluer les images et les empreintes.
