# Chantier codex-02 — les pilotes automatiques

Confié à : **Codex**, par la session Claude du cloud, le 18 octobre 2026. À prendre après codex-01.
Fichiers à toi : `proto-neon/src/85-pilote.js` (nouveau) et `proto-neon/tools/pilotes/` (nouveau). Réserve-les
dans `COORDINATION.md` en le prenant. Aucun autre fichier de `src/` : un besoin ailleurs va dans
`refonte/lots/demandes.md`.

## Pourquoi

Les pilotes automatiques servent à régler le jeu (lot 9) et au jury indépendant : sans eux, on règle à
l'aveugle. Le module `85-pilote.js` a disparu à une fusion (il n'était qu'un squelette : il reste lisible par
`git show 6ebd7a4:proto-neon/src/85-pilote.js`).

## Ce qu'il faut faire

1. Implémente `N.pilote` **exactement** selon la spécification gelée `proto-neon/refonte/lots/pilotes.md` :
   les droits d'accès du § 1 (il ne lit que S, N.R, N.ids, N.game.etat(), N.horloge ; il n'écrit que
   S.input ; il ne tire que dans `N.rng('pilote')`), et chacun des pilotes qu'elle décrit, avec leurs
   retards et leur bruit. Si un point ne peut pas être fait tel qu'écrit avec le code actuel, écris-le dans
   `refonte/lots/demandes.md` et fais au plus près, en le disant.
2. Branchement sans toucher à `79-jeu.js` : `79-jeu.js` appelle déjà `window.__PILOT(snapshot)` à chaque pas
   de jeu (ligne « window.__PILOT ») ; quand un pilote est actif, `85-pilote.js` y pose une fonction qui
   appelle `N.pilote.agir(dt)`. Activation : `N.pilote.lancer(nom)` / `N.pilote.arreter()`, et dans la page
   par `?pilote=<nom>` (lecture de `location.search` tolérée dans ce module, en lecture seule).
3. Banc `proto-neon/tools/pilotes/parties.mjs` : pour chaque pilote, 10 parties à graine fixe
   (`window.__SEED`), profil iPhone 13 paysage, au pilote, jusqu'à la fin ; il écrit
   `proto-neon/tools/pilotes/sortie.json` et `rapport.md` : durée de survie, vague atteinte, causes de mort,
   score, cartes prises, et `window.__ERR.count` (doit rester 0).

## Seuils d'acceptation

- une recherche dans `85-pilote.js` ne trouve aucun accès interdit (`N.ennemis`, `N.joueuse`, `N.cam`,
  champs `_…`, `Math.random`) ;
- les 10 parties de chaque pilote vont jusqu'à l'écran de fin, sans blocage, avec zéro erreur ;
- deux lancements à la même graine donnent les mêmes résultats (déterminisme) ;
- le rapport donne les chiffres sans les commenter au-delà des faits ; un pilote qui ne meurt jamais ou
  meurt toujours en 10 s se signale, il ne se corrige pas en touchant au jeu.

Livraison : libère ta réservation, termine le message de commit par « prêt pour /mediateur ».
