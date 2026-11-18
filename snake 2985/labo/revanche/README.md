# Rejouer une époque

18/11/2026 · 01 h 30 (Paris)

En choisissant « Rejouer cette époque », le joueur retrouve la disposition et les paramètres du départ qu’il vient de quitter. Il peut tenter une autre trajectoire. Le jeu utilise les commandes réelles du joueur. La récompense, le score et les apparitions qui suivent continuent de dépendre de sa conduite.

## Raccord de campagne

Charger `../revanche/revanche.js` avant `chambre.js`, puis conserver une instance dans le contrôleur de la chambre.

```js
const revanche = SnakeRevanche.create();

function preparation(epoch = 0, resume = false, retry = false) {
  // À la place de la création actuelle de state.
  const depart = revanche.begin(arcade.eras[epoch].year, {retry});
  state = arcade.create(depart.random, epoch);
  // Suite habituelle de la préparation.
}
```

Dans le callback du bouton « Rejouer cette époque », remplacer `preparation(era)` par `preparation(era, false, true)`. Conserver les appels ordinaires pour le départ, le voyage, la carte et le nouveau cycle. Un voyage vers la même date tire également une nouvelle graine. Si la date demandée diffère de celle enregistrée, le contrôleur ouvre un nouveau départ même avec `retry: true`. L’instance vit en mémoire pendant la session.

`begin` renvoie `{seed, random}`. Pour reproduire un départ isolé dans un outil, passer `SnakeRevanche.random(seed)` à `arcade.create`. Le mot de 32 bits fourni est le premier mot émis. Le voyage suivant commence au premier mot disponible après les tirages de la partie quittée. Si celle-ci a été quittée avant son premier tirage, le voyage avance d’un mot. La première source d’entropie est lue au premier départ. Cette convention préserve la suite LCG du pilote de campagne à semence 298501, y compris les tirages antérieurs du plateau provisoire.

## Vérification avec le moteur

Depuis ce dossier, exécuter `node verifier.cjs`. Le script réécrit `resultats.json`, avec les empreintes SHA-256 des modules chargés, les graines et les résultats individuels. Il exécute le moteur et ses extensions sous Node. Les comparaisons concernent l’état simulé. La cadence de rendu, les pixels, le son, les entrées physiques et le stockage du navigateur sortent du champ de l’essai.

| Essai | Résultat |
| --- | --- |
| Rejouer à commandes et pas de temps identiques | 40/40 traces d’état et séquences de tirages identiques, du départ à la mort |
| Rejouer avec un virage vers le haut à la 79e image simulée | 40/40 départs et 78 premières images identiques, puis 40/40 traces divergentes |
| Voyager après le virage alternatif | 40/40 nouvelles graines et paramètres de drones différents ; les positions initiales scénarisées des drones et des cellules sont conservées |
| Pilote de campagne, cinq dates successives, LCG historique et nouveau générateur | 5/5 traces identiques à chaque décision ; quatre époques franchies, dernière victoire |

Huit graines par époque, quatre parties par graine, puis dix parties avec le pilote, soit 170 parties terminées. Scores du pilote dans les deux versions, en ordre chronologique : 34 550, 30 575, 31 375, 23 000 et 29 300. Le démarrage avec plateau provisoire bénéficie d’une comparaison supplémentaire de l’état initial. Les 20 voyages consécutifs sans tirage produisent 20 graines distinctes.

Le harnais remplace le `Math.random` global des modules de jeu par une fonction qui lève une erreur. Aucune des 170 parties ne l’a appelée. Le moteur consomme le générateur injecté pour choisir des cases libres, certains choix de drone et leur cadence. Les cases libres dépendent des occupations et de l’ordre des événements. Deux trajectoires distinctes peuvent donc donner des apparitions ultérieures différentes même avec une graine de départ commune. L’identité du replay porte sur les versions de modules consignées dans le rapport et des pas de simulation identiques. Le choix de branche change la graine du voyage suivant en fonction du nombre de tirages consommés.
