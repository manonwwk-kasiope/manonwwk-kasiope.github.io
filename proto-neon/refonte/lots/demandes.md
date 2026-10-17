# Demandes au gardien du contrat

**La règle.** Un lot qui a besoin de quelque chose que le contrat ne lui donne pas (un champ partagé, un
événement, un consommateur, un identifiant, un chiffre de `N.R`, une signature, un nom de sprite) **ne le
crée pas en douce** et ne touche jamais au fichier d'un autre lot. Il ajoute **une ligne** au tableau
ci-dessous, puis continue avec un repli local :

- un chiffre manquant vit dans un objet local marqué `// → N.R` ;
- un champ privé porte le préfixe `_` (permis par les validateurs, lu par personne d'autre) ;
- une fonction manquante d'un autre module est appelée seulement si elle existe (`N.x && N.x.f && N.x.f()`).

Le gardien traite les demandes au fil de l'eau : il **accepte** (et publie une version 1.1, 1.2… de
`CONTRAT.md`, avec `02-regles.js`, `03-socle.js` et les signatures des squelettes à reporter dans toutes
les copies) ou il **refuse**, avec sa raison, dans la colonne « Réponse ». Une demande n'est jamais effacée.

| N° | Lot | Demande | Raison | Réponse du gardien | Version |
|---|---|---|---|---|---|
