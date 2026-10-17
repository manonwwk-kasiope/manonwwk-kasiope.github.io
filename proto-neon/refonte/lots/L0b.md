# Lot 0b — les squelettes : rapport de livraison

*Agent du lot 0b, 17 octobre 2026, contre le contrat 1.0 (`CONTRAT.md`). À la fin de ce lot, chaque module du
§ 7.1 existe, a son propriétaire et son interface 1.0, et tourne en repli : les lots parallèles n'ont plus
qu'à remplir.*

## Les fichiers livrés

| Fichier | Contenu |
|---|---|
| `src/12-cam.js` | **nouveau** : `N.world` (murs, `arena` glissante annoncée, `travelling`, `distMur`) et `N.cam` (suivi avec avance dans le cap, arrondi unique, `shown`, `anticipee`, `devant`, `jolt`, `focus`) ; miroirs `S.monde`, `S.vue` ; journal `vue` |
| `src/15-decor.js` | **nouveau** : ciel en bandes, soleil, deux rangées de cité en parallaxe, sol qui avance sur la grille de jeu, plateau, murs qui virent au magenta près de la tête, murs annoncés ; consommateurs 40 |
| `src/17-vol.js` | **nouveau** : LE VOL de 4 s, portes, cellules et mines en anneaux de rayon entier, `S.vol`, événements `vol` |
| `src/70-joueuse.js` | **nouveau** (tiré de `70-game.js`) : trace, segments, virage borné, cap gardé, chevron ; mort au mur et à la morsure, `tuer`, `couper`, `hitTest`, réapparition sûre, accélération tenue, `S.player`, `S.death` |
| `src/71-butin.js` | **nouveau** (tiré de `70-game.js`) : cellules, noyaux, PASTILLE, aimant, expiration, `ramassage`, `S.butin` |
| `src/72-ennemis.js` | **nouveau** (tiré de `70-game.js`) : FLÈCHE, MINE, TOURELLE, SENTINELLE de la démo au schéma ; repli commun des sept autres ; tirs, laser, armement dans la vue, `N.fx.tele`, `vuDepuis`, `kill` unique, `zone`, `devorer`, INVERSION, `purge` |
| `src/73-arene.js` | **nouveau** : TRAVELLING annoncé puis lancé, `arene` ; convois et SILLAGE en attente (lot 5b) |
| `src/73-colosse.js` | **nouveau** (le colosse de la démo) : CYCLOPE dans `N.ennemis.list`, salve et laser télégraphiés, phases par seuils, enragement, `phase` |
| `src/74-arsenal.js` | **nouveau** (tiré de `70-game.js`) : CANON aux paliers de `N.R`, tirs, `monter`, `descendre` à la mort |
| `src/75-cartes.js` | **nouveau** : XP et niveaux, cartes v0 (texte fixe, ordre fixe), `mods`, `carte` |
| `src/76-directeur.js` | **nouveau** : LA GRILLE lue dans `N.R.secteurs[0]` : ordre, formations à leurs instants, plafonds, portails hors de la vue anticipée, PASTILLE, TRAVELLING, DÉFILÉ, nettoyage et soupape, `S.vague` |
| `src/77-score.js` | **nouveau** (tiré de `70-game.js`) : score et chaîne, vies, défis du jour et de vague, énergie, déblocages, persistance unique `snake2975.v1`, records, `S.reglages` appliqués |
| `src/78-hud.js` | **nouveau** (le HUD de la démo) : score, vies, objectif de chaîne, vague et défi, boutons son et pause, bannière, toasts, étiquettes, gains, repères hors champ, codex |
| `src/79-jeu.js` | **nouveau**, remplace `70-game.js` : machine d'états complète du § 7.6, ordre des mises à jour, séquence de mort, crochets `dbg` (`god`, `vague`, `boss`, `input`, `etat`, `scene`, `simuler`, `masque`, `historique`), les 17 scènes de référence en replis |
| `src/79-scene.js` | **nouveau** : la mise en scène de tous les événements au rang 60, `drawCause` |
| `src/80-ecrans.js` | **nouveau** : titre, cartes v0, pause, fin (celle de la démo, avec cause et prochain déblocage), initiales, records, réglages, galerie ; `S.ecran` |
| `src/85-pilote.js` | **nouveau** : les règles d'accès de `pilotes.md` ; inerte, tourneur, et un repli prudent pour les autres |
| `src/10-gfx.js` | `origin`, `layer`, `remap`, `owner`, `masque`, `present({skipScale})` (squelette simple, le lot 1 optimise) |
| `src/20-crt.js` | `extinction`, `auto` (sans effet visible) |
| `src/30-music.js` | `load`, `section` (journalisée), `cue`, `couche`, `danger`, `beat` (grille de jeu), `voix`, `mute(canal, b)`, `piste`, `noeuds` ; son hasard ne passe plus par `N.rnd` (même suite, en local) |
| `src/40-sprites.js` | `get(nom, dir, img)` sur le catalogue figé, repli procédural à la taille du catalogue pour les noms pas encore livrés ; `catalogue()` ; `measure` accepte une échelle numérique |
| `src/50-fx.js` | `hitstop` gèle `N.horloge`, `tele` et `S.tele` en double tampon, `drawTele`, `ralenti`, `k`, `kJoueuse`, `onde`, `pickup`, `lasso`, `glitch`, `vignette`, `desintegre`, `drawEcran`, `boom` avec variante |
| `src/90-boot.js` | la boucle du § 9 sur `N.horloge` (pas de 1/120 s), `S.input` étendu (clavier de `N.R.controles`, second doigt, souris, manette, taps), `S.jour`, `S.perf`, le crochet de mort (remappage), `?nodraw`, `?scene=` ; `N.rnd` = flux `jeu` |
| `src/05-art.js` | clips servis depuis `CINE_BASE` ou `CINE_EMBED` |
| `src/70-game.js` | **supprimé**, son contenu réparti |
| `build.mjs` | `MUSIQUE_LISTE`, `MUSIQUE_BASE` et `CINE_BASE` relatifs au fichier produit, `--embed` (tout inline, aucune requête) |
| `tools/lots/worktree.sh`, `tools/lots/lots.json` | copie isolée par lot (`creer`, `essai`, `servir`, `verifier`, `integrer`, `supprimer`) et la table des propriétaires |
| `tools/nonreg/nonreg.mjs`, `reference.json` | la batterie de non-régression du § 8.6 |
| `tools/jeu/etats.mjs` | le parcours des états, à chaque pas, bus en mode vérification |
| `tools/jeu/fumee.mjs`, `tools/jeu/cadence.mjs` | adaptés aux nouveaux crochets |
| `refonte/lots/demandes.md` | onze demandes au gardien : ce que les squelettes ont dû ajouter aux signatures |

## Les critères d'acceptation [U]

| Critère | Seuil | Résultat |
|---|---|---|
| Bundle | se construit et tourne sur les trois profils avec zéro erreur | **tenu** : 28 modules ; `__ERR.count = 0` et console vide sur iPhone 13 paysage, portrait et bureau 1440 × 900 |
| États | le parcours complet sans erreur, `N.game.etat()` vérifié à chaque étape | **tenu** (`tools/jeu/etats.mjs`, 3 profils) : demarrage → titre → plongee → jeu → nettoyage → cartes → vol → jeu → mort → reapparition → jeu → mort → reapparition → jeu → mort → initiales → fin → plongee → jeu ; première visite : demarrage → ouverture → plongee → jeu. Bus en mode vérification : aucune charge hors schéma, aucun consommateur hors du tableau |
| Contrat, sur les squelettes | `spawn('fleche')` au schéma, `kill` une seule fois, `S.death` valide, `temps()` sur le temps de jeu | **tenu** : `contrat.mjs`, groupe `modules` actif, **8 sur 8** sur les 3 profils (plus les 41 tests du socle, de la palette et des règles) |
| Acquis | `fumee.mjs` et `cadence.mjs` passent | **tenu** : 60 s de jeu par le pilote sur 3 profils, zéro erreur ; 68 px/s et quart de tour de 258 ms identiques à 30, 60 et 120 images/s |
| Non-régression | la batterie en moins de 10 minutes | **tenu** : `tools/nonreg/nonreg.mjs` en 129 s, tout au vert (build, interdits, contrat, états, fumée, R-01, R-02, R-03, R-21 sur 5 graines, coût de `charge` 4,8 ms au p95, cadence) |

Vérifié aussi : l'attraction après 15 s au titre et son retour au premier toucher ; la pause par l'arrière-plan,
par P et par le bouton ; LE CYCLOPE (alerte, panneau, boss, victoire, fin) ; les 17 scènes de référence
l'une après l'autre ; `--embed` charge sans aucune requête ; une page d'essai dans `tools/<lot>/` trouve
`../../musique/`.

## Les choix et les écarts

- **79-jeu ne dessine rien d'autre que des replis** : logo et invite à `demarrage`, fondu de la `plongee`,
  tant que 60-intro répond `false` à `transition(nom)` pour ces noms (demande 1).
- **Les écrans rendent la main par `opts.retour`** (demande 2) : seul 79-jeu change d'état.
- **Les initiales viennent avant l'écran de fin** quand le score entre au top 10 ; la fin se compte une fois.
- **La séquence de mort se cadence en temps réel** (`N.horloge.H` par pas) : 1,3 s, sautable dès 0,5 s ; le
  monde est ralenti par `N.fx.ralenti`, la joueuse exemptée pour sa désintégration.
- **Le masque de propriété** est rempli seulement pendant `dbg.masque()`, qui refait une passe de dessin
  complète dans l'ordre du § 9 (demande 4).
- **Le présent** : `present({skipScale:true})` quand le tube compose, comme le veut le § 7.11.
- **Le DÉFILÉ** n'a pas de plafond ; une vague garde son `plafond` de `N.R`.
- **La musique** : `mute('musique')` arrête la partition générative, `mute('effets')` filtre les sons ; les deux
  ensemble coupent la sortie. La piste en blocs n'est pas chargée (lot 7a).
- Les champs ajoutés aux signatures (demandes 1 à 11) attendent la réponse du gardien.

## Ce qui reste à faire, et à qui

Chaque squelette dit en tête ce qu'il fait en repli et ce que son lot doit livrer. En bref : lot 1 (gestes du
second doigt fins, `?perf=1`, tube adaptatif, extinction, masque optimisé) ; lot 2 (les plans et les sept
quartiers, LE VOL dessiné, les cinématiques `demarrage`, `titre`, `plongee`, `panneau`) ; lots 3a et 3b (lasso,
pouvoirs, APOGÉE, grâce au mur, armes) ; lots 4a et 4b (les sept autres ennemis, élites, RIVAL, TRAQUEUR) ; lots 5a
et 5b (premier ennemi après le virage, TRAQUEUR, élites, convois, CYCLOPE complet) ; lots 6a et 6b (sprites,
télégraphes, mise en scène du § 5.3) ; lots 7a et 7b (piste, sections, sons) ; lot 8 (cartes, défis, écrans,
HUD) ; lot P (les huit pilotes de la spécification gelée).
