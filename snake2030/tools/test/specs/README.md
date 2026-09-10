# Les quatorze spécifications de la feuille de route

Ce sont les contrats que la chaîne exécute : un fichier par objectif, avec son titre, son « pourquoi »
(les constats mesurés qui le motivent), son « quoi » (ce qu'il faut faire, à la lettre) et ses « tests »
(les seuils d'acceptation). Un médiateur juge un objectif contre ce fichier et rien d'autre.

Ils vivaient dans le dossier temporaire de session, perdu une fois déjà. Ils sont ici pour trois raisons.
Ils doivent survivre à un redémarrage. Ils doivent être relisibles par quelqu'un qui reprend le projet.
Et surtout, quand une spécification est corrigée, la correction doit apparaître comme un diff que l'on
peut contester, et non comme une modification silencieuse du contrat par celui qui le fait exécuter.

Cette version est celle d'avant la relecture de la vague 3. Les corrections qui suivront porteront leur
démonstration, et le texte d'origine sera conservé dans le fichier. Voir
`../AVIS-PILOTE-specs-vague3.md` pour ce qui a été trouvé, et `../CONTEXTE-CHAINE.md` pour les règles.

Deux spécifications déjà livrées portaient un piège du même genre. Celle de G6 exigeait « au plus un coup
de trancheur par ruée (40 → au moins 38 anneaux) » alors qu'un coup en coûte deux : le plancher
arithmétique est 36, et la parenthèse contredisait la première moitié de sa propre phrase. Trois
tentatives ont été dépensées avant que quelqu'un fasse la soustraction.
