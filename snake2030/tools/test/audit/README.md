# Instruments de l'audit — versionnés pour que les valeurs de référence restent reproductibles

Ces dix scripts ont produit les chiffres entre parenthèses des spécifications : « 52 % de coups par
balle », « survie médiane 41,9 s », « 120 flashs en 5 min », « 15 textes sous 11 px », et ainsi de suite.
Ils vivaient dans le dossier temporaire de session, qui a déjà été perdu une fois lors d'un redémarrage
du conteneur. Sans eux, aucune de ces valeurs de référence ne peut être recalculée, et un implémenteur
qui doute d'un chiffre n'a aucun moyen de le vérifier : il doit le croire.

La relecture des spécifications de la vague 3 a montré pourquoi cela compte. Plusieurs chiffres de
référence se sont révélés faux ou mal rattachés — le boss annoncé à 36 points de vie en a 84, un relevé
de taille d'ennemi mesurait le tampon et non les pixels de l'écran. On ne peut établir cela qu'en
rejouant l'instrument.

## Ce que chacun mesure

| script | ce qu'il produit |
|---|---|
| `sim-lib.mjs`, `sim.mjs` | parties simulées accélérées, pilotes « dodge-greedy » et « sloppy » |
| `en-probe.mjs` | sonde d'attribution : d'où vient chaque coup reçu, quel ennemi, vu depuis quand |
| `en-sim.mjs` | campagnes de simulation sur la composition des vagues |
| `en-bossfx.mjs` | mise en scène et déroulé des combats de boss |
| `av-lib.mjs`, `av-palette.mjs`, `av-hue.mjs` | palette, contrastes, écarts de teinte, luminance |
| `acc-lib.mjs`, `acc-cvd.mjs` | accessibilité, simulation des trois dichromatismes |

## Précautions

Ils datent de l'audit et n'ont pas été maintenus depuis. Certains chemins ou API du jeu ont bougé au fil
des objectifs livrés. Avant de citer un de leurs résultats, relancez-le et vérifiez qu'il tourne encore
sur le build courant ; s'il échoue, c'est une information, pas une raison de recopier l'ancien chiffre.

Ils ne font pas partie de la batterie de non-régression et ne sont pas des tests d'acceptation : ce sont
des instruments de mesure, sans seuil.
