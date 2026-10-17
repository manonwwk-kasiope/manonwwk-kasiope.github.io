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
| 1 | 0b | `N.intro.transition(nom)` reçoit aussi les noms d'état `demarrage`, `titre`, `briefing`, `plongee` ; elle rend `false` tant que 60-intro ne sait pas les faire, et 79-jeu dessine alors son repli | seule voie, dans l'interface figée de 60-intro, pour que 79-jeu demande une cinématique sans la dessiner lui-même | | |
| 2 | 0b | `N.ui.ouvrir(nom, opts)` : `opts.retour(choix)` est appelé par l'écran quand la joueuse a choisi (`'jouer'`, `'fini'`, `'reprendre'`, `'rejouer'`, les initiales) ; `opts.choix` (cartes), `opts.victoire` (fin) | seul 79-jeu change d'état : l'écran doit lui rendre la main sans changer d'état lui-même | | |
| 3 | 0b | `N.dir.progression()` rend `{i, ordre, etape, suivante, apresVol, part}` ; `N.dir.reset(secteur, {depart})` accepte un index ou un nom d'étape (`'v3'`, `'cyclope'`) | 79-jeu en tire l'enchaînement cartes → VOL → étape suivante ; `dbg.vague(n)` et les scènes en partent | | |
| 4 | 0b | `N.gfx.masque(b)` (armer, désarmer, lire le masque de propriété), `N.gfx.originX()`, `originY()` | `dbg.masque()` doit le lire sans connaître l'intérieur de 10-gfx | | |
| 5 | 0b | `N.score._fin(victoire)`, `_entreRecords()`, `_inscrire(initiales)`, `profil.donnees()` | la fin de partie, le top 10 et la première visite : 79-jeu et 80-ecrans les demandent à leur propriétaire | | |
| 6 | 0b | `N.joueuse._god(b)` ; `N.joueuse.reset(cfg)` : `cfg = {x, y, ang, len, etat, reapparition}` | `dbg.god`, la réapparition et les scènes de référence | | |
| 7 | 0b | `reset()` ajouté aux squelettes de `N.colosse` et `N.hud` ; `N.pilote.actif()`, `nom()` ; `N.music.canaux()` | 79-jeu remet tout à zéro à chaque partie et n'appelle le pilote que s'il est actif | | |
| 8 | 0b | le bouton PAUSE du HUD lève `S.input.pause` (comme la touche P) | 78-hud lit les touchers sur ses boutons mais ne change pas d'état ; sinon il faudrait un appel `N.game.pause()` hors contrat | | |
| 9 | 0b | `N.game.dbg.historique()` : les transitions d'état `{etat, pas, t}` (256 dernières) | le parcours des états se vérifie à chaque pas, y compris en mode simulé (tools/jeu/etats.mjs) | | |
| 10 | 0b | champ privé `src._cause` (`'tir'`, `'souffle'`…) passé à `N.joueuse.couper(k, src)` | `couper(k, src)` n'a pas de paramètre de cause, alors que la charge `coupe` en exige une | | |
| 11 | 0b | `build.mjs` publie `MUSIQUE_LISTE`, `MUSIQUE_BASE`, `CINE_BASE` (relatifs au fichier produit), et `MUSIQUE_EMBED`, `CINE_EMBED` avec `--embed` (sortie par défaut `snake2975.html`) | une page d'essai dans `tools/<lot>/` doit trouver les blocs ; le fichier autonome ne fait aucune requête | | |
