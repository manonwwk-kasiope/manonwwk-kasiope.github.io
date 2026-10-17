# SNAKE 2975 — travailler à plusieurs agents sur la même branche

Trois équipes écrivent sur la branche `claude/snake-game-mobile-17dqpi` : la session Claude du cloud, la
session Claude locale de la propriétaire, et Codex (sur l'ordinateur de la propriétaire). Elles ne se parlent
pas directement : elles se coordonnent par ce fichier et par les commits. Lis ce fichier avant de commencer.

## Les règles

1. **Le code local fait foi** (décision de la propriétaire, 17 octobre). En cas de doute, ce qui est sur la
   branche gagne ; on n'écrase jamais un fichier avec une version tirée d'une autre branche.
2. **Un fichier, un écrivain à la fois.** Avant de toucher un fichier de `src/`, réserve-le dans le tableau
   ci-dessous (commit et push de la réservation seule), travaille, puis libère-le dans le commit qui livre.
   Une réservation de plus de 3 heures sans commit est caduque.
3. **Avant chaque push :** `git pull --rebase origin claude/snake-game-mobile-17dqpi`, puis `node build.mjs`
   dans `proto-neon/`, zéro erreur dans la console, et un commit de `index.html` reconstruit à part.
4. **Les chiffres du jeu vivent dans `src/02-regles.js` (N.R).** Un changement de règle s'y fait, et se note
   dans `refonte/lots/demandes.md` avec la raison.
5. **Chaque commit dit ce qu'il a vérifié** (essai, profil, résultat) ; un commit « non vérifié » le dit.
6. **Le médiateur.** Quand deux équipes veulent le même fichier ou ne sont pas d'accord sur une règle,
   chacune écrit sa position en trois lignes dans « Désaccords » ; la propriétaire tranche, ou à défaut la
   session qui a réservé le fichier le premier.

## Réservations en cours

| fichier | équipe | depuis | pour quoi |
|---|---|---|---|
| — | — | — | — |

## Prochains chantiers (à prendre)

Repris du tableau de bord du 17 octobre (ordre de priorité) :

1. Trancher le tempo de Neon Velocity (144,6 / 143,8 / 115 BPM) et l'aligner partout (N.R, piste.json, sons).
2. Brancher les morceaux Suno de `musique/brut/` (sept morceaux, deux variantes chacun) dans `30-music.js`.
3. Lisibilité en jeu : assombrir et désaturer les plans du fond (`15-decor.js`), contraste réservé aux acteurs.
4. Donner un effet aux cartes BOUCLIER et RÉPARATION (bonus protégés et régénérés), puis les régénérateurs à ramasser.
5. Restaurer les pilotes automatiques (`85-pilote.js` a disparu) pour le réglage et le jury.
6. Scènes d'immersion : intégrer `refonte/prototypes/la-grille.html` (isométrique incliné, serpent sur grille)
   comme un nouvel état de jeu.
7. Cartes sans effet (ÉPERON, GRAPPE, BRAISE), DÉFILÉ jamais lancé, clavier incomplet.

## Désaccords

(aucun pour l'instant)
