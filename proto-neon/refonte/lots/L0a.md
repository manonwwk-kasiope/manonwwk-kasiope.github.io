# Lot 0a — le contrat : rapport de livraison

*Agent du lot 0a, 17 octobre 2026. Ce lot devient ensuite le gardien du contrat (REFONTE.md § 8.3).*

## Les fichiers livrés

| Fichier | Contenu |
|---|---|
| `CONTRAT.md` | **version 1.0** : gardien, propriétaires, temps, hasard, chiffres, événements, schémas et miroirs dans `S`, états, ordre de dessin, interfaces des 27 modules, réglages, journal, budget, outils, illustrations, interdits, tests |
| `DIRECTION.md` | amendé d'après REFONTE.md § 0.2 (secteur de 5:20 à 6:30, piste de la propriétaire, bundle et dossiers, masque du cyan, critère 6 remplacé, critère 7 amendé, critère de lumière, ouverture, défis, écart J-17), le reste maintenu |
| `src/03-socle.js` | **complet** : `N.ev`, `N.rng`, `N.horloge`, `N.journal`, `N.ids` (listes, tables des états et des événements, catalogue des sprites, `texte`, schémas et `valider`), `N.socle` |
| `src/02-regles.js` | `N.R` gelé : tous les chiffres du plan (liste de contrôle ci-dessous), et `N.R.f`, les 16 formules partagées |
| `src/00-pal.js` | ajout de `N.pal.L` (luminances WCAG du § 5.1, vérifiées contre la table des couleurs) et de `N.pal.lumineux` |
| `refonte/lots/pilotes.md` | la spécification gelée des 8 pilotes (§ 4.10) |
| `refonte/lots/demandes.md` | le registre des demandes au gardien, vide, avec sa règle |
| `tools/contrat/tests.js` | la suite de tests de contrat comportementaux (49 tests en 4 groupes) |
| `tools/contrat/socle.mjs` | exécution dans Node, sur le socle seul |
| `tools/contrat/contrat.mjs` | exécution dans Chromium sur n'importe quel bundle, 3 profils, zéro erreur exigé |
| `tools/contrat/liste-R.mjs` | la liste de contrôle de `N.R`, ligne par ligne |
| `index.html` | reconstruit : la démo tourne avec le socle et les règles, sans erreur |

## Les critères d'acceptation [U]

| Critère | Seuil | Résultat |
|---|---|---|
| Bus d'événements | par rang, puis par nom de fichier ; émis pendant un envoi : après, dans l'ordre d'émission ; au-delà de 64 par pas : perte journalisée | **tenu** : tests « par rang, puis par nom de fichier… », « émis pendant un envoi… », « au-delà de 64 par pas… » |
| Flux de hasard | 1 000 tirages dans `ennemis` ne changent pas un tirage de `dir` ; deux `reset` de même graine, mêmes suites | **tenu** : 200 tirages de `dir` identiques ; re-semis en place identique |
| Horloge | `hitstop(6)` = 0,1 s ± 1 pas à `__DT` 1/30, 1/60, 1/120 ; `temps()` arrêté pendant gel, pause, cartes ; `t()` en secondes | **tenu** : 12 pas gelés aux trois cadences ; arrêt vérifié sur les 9 états à horloge arrêtée et en pause |
| Journal | anneau des 65 536 dernières entrées ; `dump()` en JSON valide ; un validateur par type du § 7.9 | **tenu** : 70 000 écritures, 65 536 gardées dans l'ordre ; aller-retour JSON ; 33 types validés (les 27 du § 7.9, plus 6 ajoutés) |
| `N.R` | chaque valeur chiffrée du plan ; liste de contrôle jointe | **tenu** : 1886 valeurs (liste ci-dessous) ; 287 valeurs recoupées automatiquement avec le plan par le test « les valeurs du plan » |

Les tests ont été éprouvés par mutation : cinq défauts injectés dans une copie du socle (tri sans nom de
fichier, gels cumulés, pas de limite de 64, un seul flux pour tous, journal par référence) sont tous détectés.

`node tools/contrat/socle.mjs` et `node tools/contrat/contrat.mjs` passent : groupes `socle`, `palette` et
`regles` à 100 % sur les trois profils (iPhone 13 paysage, portrait, bureau 1440 × 900), `__ERR.count = 0`,
console vide. Les 8 tests du groupe `modules` sont « absents » sur la démo, comme prévu : ils s'activeront
module par module dès que les squelettes du lot 0b publieront l'interface 1.0.

## Ce que le contrat 1.0 tranche, au-delà de la lettre du plan

Ces choix comblent des trous du chapitre 7 ; ils sont dans `CONTRAT.md` et vérifiés par les tests.

1. **`N.ev.on(nom, rang, fn, qui)`** prend un quatrième argument, le nom du fichier : c'est la seule façon
   d'ordonner deux consommateurs de même rang « par nom de fichier ». Une nouvelle inscription du même
   (nom, rang, qui) remplace l'ancienne, pour qu'un module puisse s'inscrire à chaque `reset` sans se doubler.
2. **Le mode vérification** du bus (`N.ev.verifier(true)`) refuse une charge hors schéma, un événement hors
   contrat et un consommateur hors du tableau : c'est l'outil du gardien pour « aucun effet hors de son
   consommateur ». Le tableau ajoute trois consommateurs que le plan supposait sans les nommer :
   `76-directeur` au rang 10 de `kill`, `ramassage` (inaction du TRAQUEUR) et `inversion` (les apparitions
   attendent), et `78-hud` au rang 70 de plusieurs événements.
3. **L'enregistrement du journal est `{pas, t, image, type, d}`**, la charge sous `d` : plusieurs charges ont
   leur propre champ `type` (le type d'ennemi). Le journal copie à l'écriture.
4. **Une entrée `coup` par coup reçu** : l'événement `coup` (corps, ou tête absorbée) et l'événement `mort`
   (tête) l'écrivent ; l'événement `arme` écrit l'enregistrement `armement`, ce qui donne un seul écrivain.
5. **L'horloge** : le gel le plus long gagne (pas de cumul) ; il ne s'use pas quand l'horloge est arrêtée ;
   l'arriéré de pas est borné à une image ; `reel()` donne le temps réel des interfaces pendant un arrêt.
   L'arrêt se lit sur `S.paused` et sur `N.ids.tableEtats[N.game.etat()]`.
6. **`N.socle.reset(graine, mode)`**, appelé en premier par `N.game.reset`, re-sème les flux en place, remet
   l'horloge et le compteur d'identifiants (`N.ids.suivant`) à zéro : deux parties de même graine ont les
   mêmes identifiants et le même journal.
7. **La règle des champs** : un champ non listé est une erreur, sauf préfixe `_` (état privé d'un module).
8. **Des miroirs dans `S`**, chacun avec un seul écrivain, pour que les pilotes et les mesures ne lisent que
   `S` : `S.butin`, `S.voies`, `S.monde`, `S.vue`, `S.vague`, `S.ecran` (avec `niveaux`), `S.vol` ; et
   `S.player.pouvoir`.
9. **`S.tele` en double tampon** : les télégraphes enregistrés pendant un pas sont publiés par
   `N.fx.update` du même pas ; une attaque qui dure reste enregistrée avec `reste ≤ 0` jusqu'à la fin des
   dégâts.
10. **Les valeurs de champs** : `vague.n` = 0 pour LE DÉFILÉ ; `S.death.vague` = 0 au DÉFILÉ, 6 au CYCLOPE ;
    `arene.evt` reçoit `travellingAnnonce` (2 s avant le départ) ; `phase.evt` reçoit `arrivee` ; la source
    `decor/purge` (purge de vague et du CYCLOPE) ; la cause de coupe et l'auteur `vol` (mine du VOL) ; le type
    d'ennemi `cyclope` pour les parties du boss ; le TRAQUEUR a un PV symbolique fini.
11. **Le catalogue des sprites** est figé dans `N.ids.sprites` (99 noms, tailles et directions), avec les
    conventions `mini:<type>` et `carte:<id>` ; la rémanence RAPIDE n'est pas un sprite.

## Les valeurs du gardien (le plan ne les donnait pas)

Toutes sont marquées « valeur du gardien » dans `02-regles.js` ; le lot 9 les règle comme les autres.

| Valeur | Choix | Pourquoi |
|---|---|---|
| taille de la main | 3 cartes, + 1 par choix en plus, 5 au plus | les « 3 à 5 plaques » du § 5.6 et la scène `cartes` à 4 cartes |
| poids de rareté | commune 1, rare 0,5, épique 0,2, ultime 0,6 | la pitié de rareté (3 et 7 écrans) suppose des rares peu fréquentes |
| rareté des cartes d'arme | palier I et II communes, III rare, ULTIME ultime | le § 2.7 n'en donne qu'aux passifs ; l'encre jaune de l'ultime est faite pour l'ULTIME |
| rareté des pouvoirs | rare | non donnée |
| prises des armes | 4 (nouvelle, puis 3 paliers) ; 3 pour le CANON, déjà tenu | les 4 paliers du § 2.8 |
| vitesse des tirs de tourelle | 180 px/s | non donnée ; sous les 210 du canon |
| rafale de TOURELLES III | 2 tirs à 0,08 s, 2,5 rafales/s | « rafales de deux » sans cadence |
| missiles | 140 px/s, virage 4 rad/s | non donnés |
| `Z0` du sol et du VOL | 64 | la formule ⌊r0 × Z0 / z⌋ ne le donnait pas |
| avance du sol en accélération | × 1,6 (le facteur d'accélération) | « plus vite en accélération » |
| DÉFERLANTE | deux formations toutes les 5 s, tirées dans le flux `dir` | « toutes les formations, deux à la fois » sans intervalle |
| défis de vague | 15, dont les 5 exemples du plan | « un parmi trois » par vague |
| force d'une explosion d'élite | 0,8 ; CYCLOPE 1,0 | « supérieure à 0,6 » |
| `ruche:elite` | 25 × 25 px | **écart** : une élite fait 19 à 21 px, mais la ruche ordinaire en fait déjà 23 |
| commandes de manette et de souris | indices de boutons standard | le tableau du § 2.15 les nomme sans les numéroter |

## Ce qui reste à faire, et à qui

- **Lot 0b** : les squelettes contre ce contrat, la répartition de `70-game.js`, `79-jeu.js` (machine d'états
  qui appelle `N.socle.reset`, puis la boucle de `90-boot.js` sur `N.horloge.image` et `avancer`, et
  `N.rnd = N.rng('jeu').f`), `build.mjs`, `tools/lots/worktree.sh`, `tools/nonreg/` ; `contrat.mjs` doit
  alors passer avec le groupe `modules` actif.
- **Le gardien** (cet agent) : `demandes.md` au fil de l'eau, relecture de chaque livraison, `79-jeu.js`
  pendant les phases 1 et 2.

## La liste de contrôle de `N.R`, ligne par ligne

Produite par `node tools/contrat/liste-R.mjs` sur `src/02-regles.js` ; la section du plan est donnée pour
chaque bloc.

1886 valeurs dans N.R (version 1.0), plus 16 formules dans N.R.f.


**N.R.version** (contrat)

| Chemin | Valeur |
|---|---|
| `version` | "1.0" |

**N.R.temps** (§ 7.2)

| Chemin | Valeur |
|---|---|
| `temps.h` | 0,008333 |
| `temps.pasMax` | 4 |
| `temps.imageRef` | 0,016667 |
| `temps.bpm` | 144,6 |
| `temps.tempsParMesure` | 4 |
| `temps.dureeTemps` | 0,414938 |
| `temps.dureeMesure` | 1,659751 |

**N.R.monde** (§ 3.1, 3.2)

| Chemin | Valeur |
|---|---|
| `monde.W` | 1024 |
| `monde.H` | 512 |
| `monde.ecransEnviron.paysage` | [2.4,2.6] |
| `monde.vues.paysage` | [422,195] |
| `monde.vues.portrait` | [195,422] |
| `monde.vues.bureau` | [360,225] |
| `monde.aireVue` | 82000 |
| `monde.plateau.pasPoints` | 16 |
| `monde.plateau.lignesTrame` | 0,25 |
| `monde.mur.epaisseur` | 3 |
| `monde.mur.alerte` | 24 |
| `monde.mobile.glissementMin` | 2 |
| `monde.mobile.annonceVoyage` | 2 |
| `monde.arenaCyclope.w` | 448 |
| `monde.arenaCyclope.h` | 256 |
| `monde.arenaCyclope.duree` | 3 |
| `monde.arenaCyclope.marge` | 80 |
| `monde.arenaCyclope.resserre` | 0,15 |
| `monde.arenaCyclope.resserreDuree` | 2 |
| `monde.travelling.largeur` | 576 |
| `monde.travelling.hauteur` | 512 |

**N.R.joueuse** (§ 2.1, 2.2)

| Chemin | Valeur |
|---|---|
| `joueuse.dz` | 0,12 |
| `joueuse.courseCSS` | 44 |
| `joueuse.dzCSS` | 5 |
| `joueuse.rayonVirage` | 11 |
| `joueuse.deflexion.min` | 0,12 |
| `joueuse.deflexion.pleine` | 0,7 |
| `joueuse.reference.vitesse` | 68 |
| `joueuse.reference.tauxVirage` | 6,2 |
| `joueuse.reference.quartDeTour` | 0,253 |
| `joueuse.latenceImages` | 1 |
| `joueuse.deriveMaxDeg` | 2 |
| `joueuse.chevron.ecartDeg` | 20 |
| `joueuse.chevron.taille` | 7 |
| `joueuse.souris.seuil` | 24 |
| `joueuse.souris.masqueApres` | 1,5 |
| `joueuse.gaine` | 1 |
| `joueuse.rayonTete` | 3 |
| `joueuse.spriteTete` | 13 |
| `joueuse.partLargeurTete` | 0,46 |
| `joueuse.vitesse.v1` | 68 |
| `joueuse.vitesse.v2` | 72 |
| `joueuse.vitesse.v3` | 76 |
| `joueuse.vitesse.defile` | 76 |
| `joueuse.vitesse.v4` | 80 |
| `joueuse.vitesse.v5` | 84 |
| `joueuse.vitesse.cyclope` | 86 |
| `joueuse.vitesse.cyclopeEnrage` | 90 |

**N.R.boost** (§ 2.2)

| Chemin | Valeur |
|---|---|
| `boost.seuilCourse` | 0,85 |
| `boost.ecartDeg` | 15 |
| `boost.maintien` | 0,12 |
| `boost.doigtTenu` | 0,18 |
| `boost.coupureDeg` | 30 |
| `boost.retourImages` | 4 |
| `boost.repriseDeg` | 15 |
| `boost.facteur` | 1,6 |
| `boost.reserve` | 100 |
| `boost.conso` | 35 |
| `boost.autonomie` | 2,9 |
| `boost.recharge` | 22 |
| `boost.delaiRecharge` | 0,4 |
| `boost.panne` | 2 |
| `boost.reprise` | 25 |
| `boost.reappui` | 10 |
| `boost.basculesMax` | 2 |
| `boost.monteeImages` | 7 |
| `boost.monteePart` | 0,95 |
| `boost.jauge.arcDeg` | 270 |
| `boost.jauge.epaisseur` | 1 |
| `boost.jauge.alerte` | 0,2 |
| `boost.sillage.distance` | 40 |
| `boost.sillage.facteur` | 1,4 |

**N.R.mort** (§ 2.3)

| Chemin | Valeur |
|---|---|
| `mort.rayonTete` | 3 |
| `mort.mur.grace` | 0,06 |
| `mort.mur.cosInterieur` | 0,2 |
| `mort.mur.alerte` | 24 |
| `mort.morsure.segMin` | 6 |
| `mort.morsure.derniersFermant` | 3 |
| `mort.morsure.rayonSegment` | 3,5 |
| `mort.morsure.rayon` | 5,5 |
| `mort.morsure.longueurSure` | 9 |
| `mort.ennemi.facteurRayon` | 0,8 |
| `mort.ennemi.apparition` | 0,6 |
| `mort.teleMin` | 0,5 |
| `mort.teleCyclope` | 0,8 |
| `mort.annonceConvoi` | 1,5 |
| `mort.traineAgeMin` | 0,15 |
| `mort.coupe.rayonSegment` | 3,5 |
| `mort.coupe.longueurMin` | 3 |
| `mort.coupe.segmentsParCellule` | 2 |
| `mort.coupe.expireCellules` | 3 |
| `mort.coupe.chaineDiviseur` | 2 |
| `mort.coupe.gelImages` | 3 |
| `mort.coupe.jolt` | 3 |
| `mort.causes` | 8 |

**N.R.vies** (§ 2.4)

| Chemin | Valeur |
|---|---|
| `vies.depart` | 3 |
| `vies.reserveAffichee` | 2 |
| `vies.bonus` | 1 |
| `vies.seuilBonus` | 80000 |
| `vies.max` | 4 |
| `vies.reapparition.candidats` | 16 |
| `vies.reapparition.margeMurs` | 40 |
| `vies.reapparition.longueurMin` | 8 |
| `vies.reapparition.longueurPart` | 0,5 |
| `vies.reapparition.perteNiveaux` | 1 |
| `vies.reapparition.etiquette` | 1 |
| `vies.reapparition.effaceTirs` | 40 |
| `vies.reapparition.figeRayon` | 48 |
| `vies.reapparition.figeDuree` | 0,4 |
| `vies.reapparition.invul` | 1 |
| `vies.reapparition.clignoteHz` | 4 |
| `vies.reapparition.ready` | 0,6 |
| `vies.continuer.parPartie` | 1 |
| `vies.continuer.vies` | 3 |
| `vies.continuer.score` | 0 |

**N.R.longueur** (§ 2.5)

| Chemin | Valeur |
|---|---|
| `longueur.depart` | 8 |
| `longueur.espacement` | 5 |
| `longueur.perle` | 9 |
| `longueur.max` | 40 |
| `longueur.parCroissance` | 5 |
| `longueur.croissancePrises` | 2 |
| `longueur.refletHz` | 1 |

**N.R.butin** (§ 2.6)

| Chemin | Valeur |
|---|---|
| `butin.cellule.w` | 9 |
| `butin.cellule.h` | 11 |
| `butin.cellule.segments` | 1 |
| `butin.cellule.xp` | 1 |
| `butin.cellule.energie` | 1 |
| `butin.cellule.points` | 10 |
| `butin.cellule.expire` | 9 |
| `butin.noyau.w` | 11 |
| `butin.noyau.h` | 11 |
| `butin.noyau.segments` | 2 |
| `butin.noyau.xp` | 5 |
| `butin.noyau.energie` | 5 |
| `butin.noyau.apogee` | 20 |
| `butin.noyau.points` | 200 |
| `butin.noyau.expire` | 9 |
| `butin.pastille.w` | 11 |
| `butin.pastille.h` | 11 |
| `butin.pastille.battementHz` | 2 |
| `butin.pastille.expire` | 12 |
| `butin.pastille.aimantee` | false |
| `butin.prise` | 8 |
| `butin.aimant` | [28,48,68] |
| `butin.vitesseAimant` | 220 |
| `butin.clignoteAvant` | 2 |
| `butin.fusion.nombre` | 3 |
| `butin.fusion.distance` | 10 |
| `butin.largages.ordinaire` | 0,45 |
| `butin.largages.larve` | 0,2 |
| `butin.largages.ruche.cellules` | 6 |
| `butin.largages.ruche.noyaux` | 1 |
| `butin.largages.elite.cellules` | 6 |
| `butin.largages.elite.noyaux` | 1 |
| `butin.largages.lasso.parEnnemi` | 1 |
| `butin.largages.lasso.noyauDes` | 4 |
| `butin.largages.finVague.base` | 3 |
| `butin.largages.finVague.parVague` | 1 |
| `butin.largages.vol` | 24 |
| `butin.largages.cyclopeParPhase` | 8 |

**N.R.xp** (§ 2.6)

| Chemin | Valeur |
|---|---|
| `xp.seuils` | [6,16,28,42,58,76,96,118,142,168] |

**N.R.cartes** (§ 2.7, 2.9)

| Chemin | Valeur |
|---|---|
| `cartes.nettoyage` | 2,5 |
| `cartes.parVague` | 1 |
| `cartes.choixMax` | 3 |
| `cartes.tailleMain.base` | 3 |
| `cartes.tailleMain.max` | 5 |
| `cartes.cible.partieGagnee` | 10 |
| `cartes.cible.tolerance` | 2 |
| `cartes.cible.mortV3` | 4 |
| `cartes.cible.premiere` | 24 |
| `cartes.ceremonie.ralenti` | 0,15 |
| `cartes.ceremonie.duree` | 0,35 |
| `cartes.main.armesMax` | 4 |
| `cartes.main.pouvoirsMax` | 1 |
| `cartes.poids.ecole` | 1,7 |
| `cartes.poids.ecoleCartes` | 2 |
| `cartes.poids.vierge` | 0,6 |
| `cartes.poids.viergeApres` | 6 |
| `cartes.poids.rarete.commune` | 1 |
| `cartes.poids.rarete.rare` | 0,5 |
| `cartes.poids.rarete.epique` | 0,2 |
| `cartes.poids.rarete.ultime` | 0,6 |
| `cartes.pitie.rare` | 3 |
| `cartes.pitie.epique` | 7 |
| `cartes.premiereMain.arme` | 1 |
| `cartes.premiereMain.pouvoir` | 1 |
| `cartes.premiereMain.survie` | ["croissance","bouclier","reparation"] |
| `cartes.trophee.communes` | 0 |
| `cartes.trophee.ultimeAUnPalier` | true |
| `cartes.defileParfaitRare` | 1 |
| `cartes.crans.commune` | 1 |
| `cartes.crans.rare` | 2 |
| `cartes.crans.epique` | 3 |
| `cartes.crans.ultime` | 4 |
| `cartes.encres.commune` | "acier" |
| `cartes.encres.rare` | "os" |
| `cartes.encres.epique` | "ambre" |
| `cartes.encres.ultime` | "jaune" |
| `cartes.refletMaxParSeconde` | 3 |
| `cartes.cibleMinPt` | 44 |
| `cartes.garde` | 0,4 |
| `cartes.touches` | [1,2,3,4] |
| `cartes.liste.canon.famille` | "canon" |
| `cartes.liste.canon.rarete` | "commune" |
| `cartes.liste.canon.prises` | 3 |
| `cartes.liste.tourelles.famille` | "tourelles" |
| `cartes.liste.tourelles.rarete` | "commune" |
| `cartes.liste.tourelles.prises` | 4 |
| `cartes.liste.arc.famille` | "arc" |
| `cartes.liste.arc.rarete` | "commune" |
| `cartes.liste.arc.prises` | 4 |
| `cartes.liste.missiles.famille` | "missiles" |
| `cartes.liste.missiles.rarete` | "commune" |
| `cartes.liste.missiles.prises` | 4 |
| `cartes.liste.drones.famille` | "drones" |
| `cartes.liste.drones.rarete` | "commune" |
| `cartes.liste.drones.prises` | 4 |
| `cartes.liste.minesQ.famille` | "minesQ" |
| `cartes.liste.minesQ.rarete` | "commune" |
| `cartes.liste.minesQ.prises` | 4 |
| `cartes.liste.puissance.famille` | "puissance" |
| `cartes.liste.puissance.rarete` | "commune" |
| `cartes.liste.puissance.prises` | 3 |
| `cartes.liste.cadence.famille` | "puissance" |
| `cartes.liste.cadence.rarete` | "commune" |
| `cartes.liste.cadence.prises` | 3 |
| `cartes.liste.aimant.famille` | "survie" |
| `cartes.liste.aimant.rarete` | "commune" |
| `cartes.liste.aimant.prises` | 2 |
| `cartes.liste.croissance.famille` | "survie" |
| `cartes.liste.croissance.rarete` | "commune" |
| `cartes.liste.croissance.prises` | 2 |
| `cartes.liste.reparation.famille` | "survie" |
| `cartes.liste.reparation.rarete` | "rare" |
| `cartes.liste.reparation.prises` | 2 |
| `cartes.liste.bouclier.famille` | "survie" |
| `cartes.liste.bouclier.rarete` | "epique" |
| `cartes.liste.bouclier.prises` | 1 |
| `cartes.liste.eperon.famille` | "puissance" |
| `cartes.liste.eperon.rarete` | "epique" |
| `cartes.liste.eperon.prises` | 1 |
| `cartes.liste.grappe.famille` | "puissance" |
| `cartes.liste.grappe.rarete` | "epique" |
| `cartes.liste.grappe.prises` | 2 |
| `cartes.liste.sangFroid.famille` | "survie" |
| `cartes.liste.sangFroid.rarete` | "epique" |
| `cartes.liste.sangFroid.prises` | 1 |
| `cartes.liste.braise.famille` | "puissance" |
| `cartes.liste.braise.rarete` | "rare" |
| `cartes.liste.braise.prises` | 2 |
| `cartes.liste.traversee.famille` | "pouvoir" |
| `cartes.liste.traversee.rarete` | "rare" |
| `cartes.liste.traversee.prises` | 1 |
| `cartes.liste.ralenti.famille` | "pouvoir" |
| `cartes.liste.ralenti.rarete` | "rare" |
| `cartes.liste.ralenti.prises` | 1 |
| `cartes.liste.repli.famille` | "pouvoir" |
| `cartes.liste.repli.rarete` | "rare" |
| `cartes.liste.repli.prises` | 1 |
| `cartes.rareteArme` | ["commune","commune","rare","ultime"] |
| `cartes.texte.nomMax` | 14 |
| `cartes.texte.ligneMax` | 19 |
| `cartes.texte.lignes` | 2 |

**N.R.armes** (§ 2.8)

| Chemin | Valeur |
|---|---|
| `armes.ultimeSurCyclope` | 1,5 |
| `armes.paliers` | 4 |
| `armes.lisibilite.tirLong` | [3,5] |
| `armes.lisibilite.tirLarge` | 1 |
| `armes.lisibilite.aplatMax` | 3 |
| `armes.lisibilite.silenceTete` | 3 |
| `armes.lisibilite.naissance` | 7 |
| `armes.lisibilite.segmentsDessus` | 2 |
| `armes.lisibilite.plafondCyan` | 0,08 |
| `armes.retours.forceMax` | 0,3 |
| `armes.retours.rayonMax` | 19 |
| `armes.salveParSeconde` | 8 |
| `armes.tirsMax` | 160 |
| `armes.canon.nom` | "CANON" |
| `armes.canon.place` | "devant" |
| `armes.canon.paliers.0.nom` | "I" |
| `armes.canon.paliers.0.tirs` | 1 |
| `armes.canon.paliers.0.cadence` | 6,5 |
| `armes.canon.paliers.0.degats` | 10 |
| `armes.canon.paliers.0.portee` | 130 |
| `armes.canon.paliers.0.vitesse` | 210 |
| `armes.canon.paliers.0.dessin` | [1,3] |
| `armes.canon.paliers.1.nom` | "II" |
| `armes.canon.paliers.1.tirs` | 2 |
| `armes.canon.paliers.1.bouches` | 2 |
| `armes.canon.paliers.1.ecartBouches` | 2 |
| `armes.canon.paliers.1.alterne` | true |
| `armes.canon.paliers.1.cadence` | 9 |
| `armes.canon.paliers.1.degats` | 10 |
| `armes.canon.paliers.1.portee` | 130 |
| `armes.canon.paliers.1.vitesse` | 210 |
| `armes.canon.paliers.1.dessin` | [1,3] |
| `armes.canon.paliers.2.nom` | "III" |
| `armes.canon.paliers.2.tirs` | 2 |
| `armes.canon.paliers.2.perce` | 2 |
| `armes.canon.paliers.2.ecartAngle` | 0,06 |
| `armes.canon.paliers.2.cadence` | 8 |
| `armes.canon.paliers.2.degats` | 12 |
| `armes.canon.paliers.2.portee` | 150 |
| `armes.canon.paliers.2.vitesse` | 210 |
| `armes.canon.paliers.2.dessin` | [1,5] |
| `armes.canon.paliers.3.nom` | "RAYON" |
| `armes.canon.paliers.3.continu` | true |
| `armes.canon.paliers.3.efface` | true |
| `armes.canon.paliers.3.tics` | 15 |
| `armes.canon.paliers.3.degats` | 14 |
| `armes.canon.paliers.3.portee` | 140 |
| `armes.canon.paliers.3.largeur` | 3 |
| `armes.canon.paliers.3.depart` | 7 |
| `armes.tourelles.nom` | "TOURELLES" |
| `armes.tourelles.place` | "flancs" |
| `armes.tourelles.vitesseTir` | 180 |
| `armes.tourelles.paliers.0.nom` | "I" |
| `armes.tourelles.paliers.0.parSegments` | 8 |
| `armes.tourelles.paliers.0.max` | 4 |
| `armes.tourelles.paliers.0.viseeDeg` | 25 |
| `armes.tourelles.paliers.0.cadence` | 2 |
| `armes.tourelles.paliers.0.portee` | 100 |
| `armes.tourelles.paliers.0.degats` | 10 |
| `armes.tourelles.paliers.0.module` | 3 |
| `armes.tourelles.paliers.0.canon` | 2 |
| `armes.tourelles.paliers.0.directions` | 8 |
| `armes.tourelles.paliers.1.nom` | "II" |
| `armes.tourelles.paliers.1.parSegments` | 6 |
| `armes.tourelles.paliers.1.max` | 6 |
| `armes.tourelles.paliers.1.viseeDeg` | 25 |
| `armes.tourelles.paliers.1.cadence` | 2,5 |
| `armes.tourelles.paliers.1.portee` | 100 |
| `armes.tourelles.paliers.1.degats` | 10 |
| `armes.tourelles.paliers.1.module` | 3 |
| `armes.tourelles.paliers.1.canon` | 2 |
| `armes.tourelles.paliers.1.directions` | 8 |
| `armes.tourelles.paliers.2.nom` | "III" |
| `armes.tourelles.paliers.2.parSegments` | 4 |
| `armes.tourelles.paliers.2.max` | 8 |
| `armes.tourelles.paliers.2.viseeDeg` | 25 |
| `armes.tourelles.paliers.2.cadence` | 2,5 |
| `armes.tourelles.paliers.2.rafale` | 2 |
| `armes.tourelles.paliers.2.ecartRafale` | 0,08 |
| `armes.tourelles.paliers.2.portee` | 100 |
| `armes.tourelles.paliers.2.degats` | 10 |
| `armes.tourelles.paliers.2.double` | true |
| `armes.tourelles.paliers.3.nom` | "BORDÉE" |
| `armes.tourelles.paliers.3.parSegments` | 2 |
| `armes.tourelles.paliers.3.max` | 16 |
| `armes.tourelles.paliers.3.viseeDeg` | 25 |
| `armes.tourelles.paliers.3.cadence` | 3 |
| `armes.tourelles.paliers.3.portee` | 100 |
| `armes.tourelles.paliers.3.degats` | 10 |
| `armes.tourelles.paliers.3.eclats` | 3 |
| `armes.tourelles.paliers.3.degatsEclat` | 4 |
| `armes.tourelles.paliers.3.salveParTourelle` | 0,03 |
| `armes.arc.nom` | "ARC" |
| `armes.arc.place` | "distance" |
| `armes.arc.paliers.0.nom` | "I" |
| `armes.arc.paliers.0.arcs` | 1 |
| `armes.arc.paliers.0.sauts` | 3 |
| `armes.arc.paliers.0.periode` | 1 |
| `armes.arc.paliers.0.degats` | 14 |
| `armes.arc.paliers.0.portee` | 60 |
| `armes.arc.paliers.1.nom` | "II" |
| `armes.arc.paliers.1.arcs` | 1 |
| `armes.arc.paliers.1.sauts` | 4 |
| `armes.arc.paliers.1.periode` | 0,85 |
| `armes.arc.paliers.1.degats` | 14 |
| `armes.arc.paliers.1.portee` | 70 |
| `armes.arc.paliers.2.nom` | "III" |
| `armes.arc.paliers.2.arcs` | 2 |
| `armes.arc.paliers.2.sauts` | 5 |
| `armes.arc.paliers.2.periode` | 0,85 |
| `armes.arc.paliers.2.degats` | 14 |
| `armes.arc.paliers.2.portee` | 70 |
| `armes.arc.paliers.2.paralyse` | 0,3 |
| `armes.arc.paliers.3.nom` | "ORAGE" |
| `armes.arc.paliers.3.arcs` | 4 |
| `armes.arc.paliers.3.sauts` | 8 |
| `armes.arc.paliers.3.periode` | 0,4 |
| `armes.arc.paliers.3.degats` | 14 |
| `armes.arc.paliers.3.portee` | 100 |
| `armes.arc.paliers.3.departs` | ["tete","queue"] |
| `armes.arc.noeud` | 3 |
| `armes.missiles.nom` | "MISSILES" |
| `armes.missiles.place` | "priorite" |
| `armes.missiles.priorite` | ["elite","ruche","rival","oeil"] |
| `armes.missiles.vitesse` | 140 |
| `armes.missiles.virage` | 4 |
| `armes.missiles.dessin` | [3,5] |
| `armes.missiles.paliers.0.nom` | "I" |
| `armes.missiles.paliers.0.missiles` | 2 |
| `armes.missiles.paliers.0.periode` | 2,4 |
| `armes.missiles.paliers.0.degats` | 30 |
| `armes.missiles.paliers.0.souffle` | 14 |
| `armes.missiles.paliers.0.souffleDegats` | 0,6 |
| `armes.missiles.paliers.1.nom` | "II" |
| `armes.missiles.paliers.1.missiles` | 3 |
| `armes.missiles.paliers.1.periode` | 2,1 |
| `armes.missiles.paliers.1.degats` | 30 |
| `armes.missiles.paliers.1.souffle` | 14 |
| `armes.missiles.paliers.1.souffleDegats` | 0,6 |
| `armes.missiles.paliers.2.nom` | "III" |
| `armes.missiles.paliers.2.missiles` | 3 |
| `armes.missiles.paliers.2.periode` | 2,1 |
| `armes.missiles.paliers.2.degats` | 30 |
| `armes.missiles.paliers.2.souffle` | 14 |
| `armes.missiles.paliers.2.souffleDegats` | 0,6 |
| `armes.missiles.paliers.2.sousMunitions` | 4 |
| `armes.missiles.paliers.2.degatsSous` | 8 |
| `armes.missiles.paliers.3.nom` | "NUÉE" |
| `armes.missiles.paliers.3.missiles` | 6 |
| `armes.missiles.paliers.3.periode` | 1,5 |
| `armes.missiles.paliers.3.degats` | 30 |
| `armes.missiles.paliers.3.souffle` | 14 |
| `armes.missiles.paliers.3.souffleDegats` | 0,6 |
| `armes.missiles.paliers.3.verrouillage` | 6 |
| `armes.drones.nom` | "DRONES" |
| `armes.drones.place` | "autour" |
| `armes.drones.orbite` | 16 |
| `armes.drones.cadence` | 1,6 |
| `armes.drones.degats` | 10 |
| `armes.drones.portee` | 90 |
| `armes.drones.dessin` | [5,5] |
| `armes.drones.paliers.0.nom` | "I" |
| `armes.drones.paliers.0.drones` | 1 |
| `armes.drones.paliers.1.nom` | "II" |
| `armes.drones.paliers.1.drones` | 2 |
| `armes.drones.paliers.1.interception` | true |
| `armes.drones.paliers.1.penalite` | 0,6 |
| `armes.drones.paliers.2.nom` | "III" |
| `armes.drones.paliers.2.drones` | 3 |
| `armes.drones.paliers.2.interception` | true |
| `armes.drones.paliers.2.penalite` | 0,6 |
| `armes.drones.paliers.2.filin` | 30 |
| `armes.drones.paliers.3.nom` | "ANNEAU" |
| `armes.drones.paliers.3.drones` | 6 |
| `armes.drones.paliers.3.interception` | true |
| `armes.drones.paliers.3.penalite` | 0 |
| `armes.drones.paliers.3.anneau` | 24 |
| `armes.drones.paliers.3.contact` | 60 |
| `armes.minesQ.nom` | "MINES DE QUEUE" |
| `armes.minesQ.place` | "derriere" |
| `armes.minesQ.armement` | 0,4 |
| `armes.minesQ.declenche` | 8 |
| `armes.minesQ.vie` | 8 |
| `armes.minesQ.max` | 12 |
| `armes.minesQ.dessin` | [5,5] |
| `armes.minesQ.coeurHz` | 2 |
| `armes.minesQ.paliers.0.nom` | "I" |
| `armes.minesQ.paliers.0.periode` | 2,2 |
| `armes.minesQ.paliers.0.souffle` | 18 |
| `armes.minesQ.paliers.0.degats` | 40 |
| `armes.minesQ.paliers.1.nom` | "II" |
| `armes.minesQ.paliers.1.periode` | 1,6 |
| `armes.minesQ.paliers.1.souffle` | 22 |
| `armes.minesQ.paliers.1.degats` | 40 |
| `armes.minesQ.paliers.2.nom` | "III" |
| `armes.minesQ.paliers.2.periode` | 1,6 |
| `armes.minesQ.paliers.2.souffle` | 22 |
| `armes.minesQ.paliers.2.degats` | 40 |
| `armes.minesQ.paliers.2.sousCharges` | 3 |
| `armes.minesQ.paliers.2.souffleSous` | 12 |
| `armes.minesQ.paliers.2.degatsSous` | 16 |
| `armes.minesQ.paliers.3.nom` | "SINGULARITÉ" |
| `armes.minesQ.paliers.3.periode` | 1,6 |
| `armes.minesQ.paliers.3.aspiration` | 0,45 |
| `armes.minesQ.paliers.3.rayonAspiration` | 30 |
| `armes.minesQ.paliers.3.souffle` | 30 |
| `armes.minesQ.paliers.3.degats` | 80 |

**N.R.passifs** (§ 2.9, 7.5)

| Chemin | Valeur |
|---|---|
| `passifs.puissance.parPrise` | 0,25 |
| `passifs.puissance.prises` | 3 |
| `passifs.cadence.parPrise` | 0,2 |
| `passifs.cadence.prises` | 3 |
| `passifs.aimant.rayons` | [28,48,68] |
| `passifs.aimant.prises` | 2 |
| `passifs.croissance.segments` | 4 |
| `passifs.croissance.lenMax` | 5 |
| `passifs.croissance.prises` | 2 |
| `passifs.reparation.periodes` | [6,4] |
| `passifs.reparation.prises` | 2 |
| `passifs.bouclier.charges` | 1 |
| `passifs.bouclier.recharge` | 20 |
| `passifs.bouclier.prises` | 1 |
| `passifs.eperon.pvMax` | 30 |
| `passifs.eperon.cout` | 15 |
| `passifs.eperon.prises` | 1 |
| `passifs.grappe.prises` | 2 |
| `passifs.grappe.generations` | 2 |
| `passifs.grappe.niveaux.0.rayon` | 16 |
| `passifs.grappe.niveaux.0.degats` | 15 |
| `passifs.grappe.niveaux.1.rayon` | 22 |
| `passifs.grappe.niveaux.1.degats` | 25 |
| `passifs.sangFroid.prises` | 1 |
| `passifs.braise.prises` | 2 |
| `passifs.braise.dps` | 20 |
| `passifs.braise.traine2` | 0,4 |
| `passifs.braise.lasso2` | 1,5 |
| `passifs.mods.degats` | 1 |
| `passifs.mods.cadence` | 1 |
| `passifs.mods.aimant` | 28 |
| `passifs.mods.lenMax` | 40 |
| `passifs.mods.reparation` | 0 |
| `passifs.mods.bouclier` | 0 |
| `passifs.mods.eperon` | false |
| `passifs.mods.grappe` | 0 |
| `passifs.mods.sangFroid` | false |
| `passifs.mods.braise` | 0 |

**N.R.pouvoirs** (§ 2.10)

| Chemin | Valeur |
|---|---|
| `pouvoirs.equipes` | 1 |
| `pouvoirs.premierePartie` | ["traversee"] |
| `pouvoirs.traversee.duree` | 1,4 |
| `pouvoirs.traversee.recharge` | 12 |
| `pouvoirs.ralenti.duree` | 3,5 |
| `pouvoirs.ralenti.recharge` | 16 |
| `pouvoirs.ralenti.monde` | 0,35 |
| `pouvoirs.ralenti.passeBas` | 1200 |
| `pouvoirs.repli.duree` | 7 |
| `pouvoirs.repli.recharge` | 15 |
| `pouvoirs.repli.longueur` | 0,35 |
| `pouvoirs.repli.longueurMin` | 6 |
| `pouvoirs.repli.perle` | 13 |
| `pouvoirs.repli.degats` | 1,8 |
| `pouvoirs.repli.vitesse` | 0,12 |

**N.R.apogee** (§ 2.11)

| Chemin | Valeur |
|---|---|
| `apogee.max` | 100 |
| `apogee.charge.ordinaire` | 2 |
| `apogee.charge.elite` | 12 |
| `apogee.charge.noyau` | 20 |
| `apogee.charge.lasso` | 3 |
| `apogee.charge.devore` | 2 |
| `apogee.charge.boost` | 0 |
| `apogee.anneauPoints` | 8 |
| `apogee.battementHz` | 2 |
| `apogee.glisse.distancePt` | 24 |
| `apogee.glisse.duree` | 0,22 |
| `apogee.ralenti` | 0,25 |
| `apogee.ralentiDuree` | 0,42 |
| `apogee.gelImages` | 6 |
| `apogee.anneaux.nombre` | 6 |
| `apogee.anneaux.intervalle` | 0,09 |
| `apogee.anneaux.rayons` | [30,70,110,150,200,260] |
| `apogee.anneaux.degats` | 12 |
| `apogee.cyclopeMaxPhase` | 0,06 |
| `apogee.flashs` | 1 |
| `apogee.cible.parPartieGagnee` | 3 |
| `apogee.cible.tolerance` | 1 |

**N.R.lasso** (§ 2.12)

| Chemin | Valeur |
|---|---|
| `lasso.traine.base` | 1,2 |
| `lasso.traine.parSegment` | 0,02 |
| `lasso.traine.braise2` | 0,4 |
| `lasso.traine.largeur` | 1 |
| `lasso.fermetureTraine` | 7 |
| `lasso.ageMin` | 0,15 |
| `lasso.fermetureQueue` | 5,5 |
| `lasso.derniers` | 3 |
| `lasso.aireMin` | 300 |
| `lasso.intervalle` | 0,8 |
| `lasso.annonce` | 14 |
| `lasso.degats.base` | 40 |
| `lasso.degats.parSegment` | 4 |
| `lasso.degats.braise2` | 1,5 |
| `lasso.cyclopePhase` | 0,1 |
| `lasso.excellent` | 4 |
| `lasso.remplissageImages` | 3 |
| `lasso.exemple.segments` | 40 |
| `lasso.exemple.vitesse` | 84 |
| `lasso.exemple.cible` | 168 |
| `lasso.cibles.reussiteCourt` | 0,5 |
| `lasso.cibles.longCourt` | 20 |
| `lasso.cibles.reussiteLong` | 0,4 |
| `lasso.cibles.longDe` | 30 |
| `lasso.cibles.longA` | 40 |
| `lasso.cibles.rapportParMinute` | 0,8 |
| `lasso.pilote.reaction` | 0,12 |
| `lasso.pilote.erreurDeg` | 10 |

**N.R.score** (§ 2.13)

| Chemin | Valeur |
|---|---|
| `score.chaine.fenetre` | 2,5 |
| `score.chaine.coupeDiviseur` | 2 |
| `score.mult.pas` | 5 |
| `score.mult.max` | 8 |
| `score.paliersOnde` | [3,5,8] |
| `score.paliersImages` | 2 |
| `score.grandDuree` | 0,4 |
| `score.base.larve` | 20 |
| `score.base.mine` | 40 |
| `score.base.fleche` | 50 |
| `score.base.dard` | 80 |
| `score.base.lame` | 120 |
| `score.base.planeur` | 100 |
| `score.base.tourelle` | 150 |
| `score.base.sentinelle` | 200 |
| `score.base.rival` | 300 |
| `score.base.ruche` | 400 |
| `score.base.traqueur` | 5000 |
| `score.base.cyclope` | 0 |
| `score.elite` | 5 |
| `score.primes.boutPortant.distance` | 24 |
| `score.primes.boutPortant.facteur` | 2 |
| `score.primes.frole.distance` | 5 |
| `score.primes.frole.points` | 50 |
| `score.primes.crash` | 2 |
| `score.primes.broye.facteur` | 1 |
| `score.primes.broye.sillage` | 2 |
| `score.primes.devore` | [200,400,800,1600] |
| `score.primes.cellule` | 10 |
| `score.primes.vague.parVague` | 1000 |
| `score.primes.vague.parfait` | 2 |
| `score.primes.vol.porte` | 500 |
| `score.primes.vol.parfait` | 5000 |
| `score.primes.defile.parfait` | 10000 |
| `score.primes.defile.planeur` | 100 |
| `score.primes.cyclope.main` | 3000 |
| `score.primes.cyclope.phase` | 5000 |
| `score.primes.cyclope.mort` | 25000 |
| `score.primes.cyclope.tempsRef` | 120 |
| `score.primes.cyclope.parSeconde` | 200 |
| `score.affiche.chiffres` | 7 |
| `score.affiche.roule` | 0,2 |
| `score.affiche.seuilRoule` | 1000 |
| `score.gains.echelle2Chaine` | 6 |
| `score.gains.decalage` | 8 |

**N.R.defis** (§ 2.14)

| Chemin | Valeur |
|---|---|
| `defis.annonceMax` | 1 |
| `defis.parPartie` | 3 |
| `defis.duJour` | 2 |
| `defis.finir.prime` | 20000 |
| `defis.finir.energie` | 50 |
| `defis.energieReserve` | 20 |
| `defis.cibles.expertMin` | 0,3 |
| `defis.cibles.bonMin` | 0,1 |
| `defis.cibles.bonMax` | 0,7 |
| `defis.reserve.premierJet.nom` | "PREMIER JET" |
| `defis.reserve.premierJet.prime` | 5000 |
| `defis.reserve.premierJet.destructions` | 25 |
| `defis.reserve.premierJet.avant` | 60 |
| `defis.reserve.premierJet.jamaisAvant` | 30 |
| `defis.reserve.lasso6.nom` | "LASSO ×6" |
| `defis.reserve.lasso6.prime` | 10000 |
| `defis.reserve.lasso6.enfermes` | 6 |
| `defis.reserve.sansCoupe.nom` | "SANS COUPE" |
| `defis.reserve.sansCoupe.prime` | 8000 |
| `defis.reserve.sansCoupe.vagues` | [1,2] |
| `defis.reserve.chaine5.nom` | "CHAÎNE ×5" |
| `defis.reserve.chaine5.prime` | 6000 |
| `defis.reserve.chaine5.mult` | 5 |
| `defis.reserve.gloutonne.nom` | "GLOUTONNE" |
| `defis.reserve.gloutonne.prime` | 8000 |
| `defis.reserve.gloutonne.devores` | 6 |
| `defis.reserve.crash.nom` | "CRASH" |
| `defis.reserve.crash.prime` | 10000 |
| `defis.reserve.broyeuse.nom` | "BROYEUSE" |
| `defis.reserve.broyeuse.prime` | 8000 |
| `defis.reserve.broyeuse.broyes` | 4 |
| `defis.reserve.parfait.nom` | "PARFAIT" |
| `defis.reserve.parfait.prime` | 10000 |
| `defis.reserve.parfait.planeurs` | 40 |
| `defis.reserve.rasante.nom` | "RASANTE" |
| `defis.reserve.rasante.prime` | 6000 |
| `defis.reserve.rasante.froles` | 10 |
| `defis.reserve.eclair.nom` | "ÉCLAIR" |
| `defis.reserve.eclair.prime` | 8000 |
| `defis.reserve.eclair.delai` | 8 |
| `defis.reserve.volParfait.nom` | "VOL PARFAIT" |
| `defis.reserve.volParfait.prime` | 6000 |
| `defis.reserve.sansFilet.nom` | "SANS FILET" |
| `defis.reserve.sansFilet.prime` | 12000 |
| `defis.vague.prime` | 1000 |
| `defis.vague.energie` | 10 |
| `defis.vague.liste.1.0.id` | "v1Lasso" |
| `defis.vague.liste.1.0.texte` | "2 LASSO" |
| `defis.vague.liste.1.0.lassos` | 2 |
| `defis.vague.liste.1.1.id` | "v1Mines" |
| `defis.vague.liste.1.1.texte` | "ABATS LES 2 MINES" |
| `defis.vague.liste.1.1.mines` | 2 |
| `defis.vague.liste.1.2.id` | "v1Rafle" |
| `defis.vague.liste.1.2.texte` | "RAMASSE 15 CELLULES" |
| `defis.vague.liste.1.2.cellules` | 15 |
| `defis.vague.liste.2.0.id` | "v2Devore" |
| `defis.vague.liste.2.0.texte` | "DÉVORE 4" |
| `defis.vague.liste.2.0.devores` | 4 |
| `defis.vague.liste.2.1.id` | "v2Lasso" |
| `defis.vague.liste.2.1.texte` | "LASSO ×3" |
| `defis.vague.liste.2.1.enfermes` | 3 |
| `defis.vague.liste.2.2.id` | "v2Meute" |
| `defis.vague.liste.2.2.texte` | "ABATS UNE MEUTE ENTIÈRE" |
| `defis.vague.liste.2.2.meute` | 6 |
| `defis.vague.liste.3.0.id` | "v3Cote" |
| `defis.vague.liste.3.0.texte` | "ABATS 3 TOURELLES DE CÔTÉ" |
| `defis.vague.liste.3.0.tourelles` | 3 |
| `defis.vague.liste.3.0.angleDeg` | 45 |
| `defis.vague.liste.3.1.id` | "v3Eclair" |
| `defis.vague.liste.3.1.texte` | "FLÈCHE BLINDÉE EN 10 S" |
| `defis.vague.liste.3.1.delai` | 10 |
| `defis.vague.liste.3.2.id` | "v3Chaine" |
| `defis.vague.liste.3.2.texte` | "×4 EN VAGUE 3" |
| `defis.vague.liste.3.2.mult` | 4 |
| `defis.vague.liste.4.0.id` | "v4Broie" |
| `defis.vague.liste.4.0.texte` | "BROIE 3 ENNEMIS" |
| `defis.vague.liste.4.0.broyes` | 3 |
| `defis.vague.liste.4.1.id` | "v4Sillage" |
| `defis.vague.liste.4.1.texte` | "5 S DANS LE SILLAGE" |
| `defis.vague.liste.4.1.duree` | 5 |
| `defis.vague.liste.4.2.id` | "v4Rival" |
| `defis.vague.liste.4.2.texte` | "LE RIVAL AU LASSO" |
| `defis.vague.liste.5.0.id` | "v5Mult" |
| `defis.vague.liste.5.0.texte` | "×5 AVANT LA PURGE" |
| `defis.vague.liste.5.0.mult` | 5 |
| `defis.vague.liste.5.1.id` | "v5Ruche" |
| `defis.vague.liste.5.1.texte` | "RUCHE INSTABLE AU LASSO" |
| `defis.vague.liste.5.2.id` | "v5Devore" |
| `defis.vague.liste.5.2.texte` | "DÉVORE 5" |
| `defis.vague.liste.5.2.devores` | 5 |

**N.R.controles** (§ 2.15)

| Chemin | Valeur |
|---|---|
| `controles.clavier.gauche` | ["ArrowLeft","KeyA","KeyQ"] |
| `controles.clavier.droite` | ["ArrowRight","KeyD"] |
| `controles.clavier.haut` | ["ArrowUp","KeyW","KeyZ"] |
| `controles.clavier.bas` | ["ArrowDown","KeyS"] |
| `controles.clavier.boost` | ["Space"] |
| `controles.clavier.pouvoir` | ["KeyE"] |
| `controles.clavier.apogee` | ["KeyR"] |
| `controles.clavier.pause` | ["KeyP","Escape"] |
| `controles.clavier.valider` | ["Enter"] |
| `controles.clavier.retour` | ["Escape","Backspace"] |
| `controles.clavier.chiffres` | ["Digit1","Digit2","Digit3","Digit4"] |
| `controles.souris.boost` | 0 |
| `controles.souris.pouvoir` | 2 |
| `controles.souris.apogee` | 1 |
| `controles.manette.boost` | [0,7] |
| `controles.manette.pouvoir` | [2] |
| `controles.manette.apogee` | [3] |
| `controles.manette.pause` | [9] |
| `controles.manette.valider` | [0] |
| `controles.manette.retour` | [1] |
| `controles.capuchons.parties` | 3 |
| `controles.capuchons.duree` | 6 |

**N.R.gestes** (§ 2.16)

| Chemin | Valeur |
|---|---|
| `gestes.delaiAction` | 0,15 |
| `gestes.toucher.duree` | 0,18 |
| `gestes.toucher.deplacementPt` | 10 |
| `gestes.glisse.distancePt` | 24 |
| `gestes.glisse.duree` | 0,22 |
| `gestes.tenu.duree` | 0,18 |
| `gestes.tenu.deplacementPt` | 24 |
| `gestes.boutonPt` | 44 |
| `gestes.bordPt` | 20 |
| `gestes.auto.traversee` | 0,25 |
| `gestes.auto.ralentiTele` | 3 |
| `gestes.auto.repliEnnemis` | 5 |
| `gestes.auto.repliRayon` | 60 |
| `gestes.auto.apogeeEnnemis` | 8 |

**N.R.inversion** (§ 2.17)

| Chemin | Valeur |
|---|---|
| `inversion.vagues` | [2,3,4,5] |
| `inversion.distanceTete` | 160 |
| `inversion.apparition.2` | 20 |
| `inversion.apparition.3` | 14 |
| `inversion.apparition.4` | 18 |
| `inversion.apparition.5` | 22 |
| `inversion.expire` | 12 |
| `inversion.duree.2` | 6 |
| `inversion.duree.3` | 5 |
| `inversion.duree.4` | 4 |
| `inversion.duree.5` | 4 |
| `inversion.fuite` | 0,8 |
| `inversion.devore.points` | [200,400,800,1600] |
| `inversion.devore.segments` | 1 |
| `inversion.devore.apogee` | 2 |
| `inversion.devore.traqueur` | 5000 |
| `inversion.clignoteFin.duree` | 1 |
| `inversion.clignoteFin.hz` | 4 |
| `inversion.finInoffensives.rayon` | 32 |
| `inversion.finInoffensives.duree` | 0,5 |
| `inversion.jamais` | ["defile","vol","boss"] |

**N.R.camera** (§ 3.3)

| Chemin | Valeur |
|---|---|
| `camera.avanceX` | 0,3 |
| `camera.avanceY` | 0,42 |
| `camera.avanceBoost` | 1,4 |
| `camera.amorti` | 0,22 |
| `camera.cadre.min` | 0,15 |
| `camera.cadre.max` | 0,85 |
| `camera.cadre.portraitMaxY` | 0,72 |
| `camera.devant.croisiere` | 1,2 |
| `camera.devant.boost` | 0,8 |
| `camera.devant.margeMur` | 16 |
| `camera.repere.paysageDevant` | 131 |
| `camera.repere.demandeV5Boost` | 107 |
| `camera.repere.demandeEnrage` | 115 |
| `camera.repere.portraitDevant` | 127 |
| `camera.debord` | 16 |
| `camera.retardMax` | 2,4 |
| `camera.cyclope.tete` | 0,7 |
| `camera.cyclope.oeil` | 0,3 |
| `camera.jolt.min` | 2 |
| `camera.jolt.max` | 6 |
| `camera.jolt.amorti` | 0,15 |

**N.R.decor** (§ 3.4 à 3.6, 5.2)

| Chemin | Valeur |
|---|---|
| `decor.plans.P0.fx` | 0 |
| `decor.plans.P0.fy` | 0,02 |
| `decor.plans.P0.bandeHorizon` | 16 |
| `decor.plans.P0.trameBas` | [0.25,0.5] |
| `decor.plans.P1.fx` | 0,03 |
| `decor.plans.P1.fy` | 0,05 |
| `decor.plans.P1.etoiles` | 60 |
| `decor.plans.P1.phases` | 2 |
| `decor.plans.P2.fx` | 0,08 |
| `decor.plans.P2.fy` | "fh" |
| `decor.plans.P2.soleil` | 80 |
| `decor.plans.P2.soleilPortrait` | 64 |
| `decor.plans.P2.largeurSource` | 512 |
| `decor.plans.P3.fx` | 0,2 |
| `decor.plans.P3.fy` | "fh" |
| `decor.plans.P3.enseignes` | [0.05,0.08] |
| `decor.plans.P3.prolonge` | 600 |
| `decor.plans.P4.fx` | 0,35 |
| `decor.plans.P4.fy` | 0,4 |
| `decor.plans.P4.derive` | 4 |
| `decor.plans.P4.trame` | 0,25 |
| `decor.plans.P4.reflets` | 0,12 |
| `decor.plans.P5.fx` | 0,6 |
| `decor.plans.P5.fy` | 0,6 |
| `decor.plans.P5.tuile` | [32,64] |
| `decor.plans.P5.faisceaux` | 0,12 |
| `decor.plans.sol.fxHorizon` | "fh" |
| `decor.plans.sol.fxBas` | 1 |
| `decor.plans.plateau.fx` | 1 |
| `decor.plans.plateau.fy` | 1 |
| `decor.plans.P6.fx` | 1,4 |
| `decor.plans.P6.fy` | 1,4 |
| `decor.plans.P6.bande` | 0,12 |
| `decor.plans.P6.trame` | 0,5 |
| `decor.horizon.paysage` | [0.8,0.42] |
| `decor.horizon.portrait` | [0.62,0.2] |
| `decor.ecartPlans` | 1,7 |
| `decor.decorDangerMax` | 0,005 |
| `decor.vivesTrameMax` | 0,5 |
| `decor.blocVif.taille` | 3 |
| `decor.blocVif.vitesseMax` | 1 |
| `decor.sol.K` | 900 |
| `decor.sol.Z0` | 64 |
| `decor.sol.pasLongitudinal` | 32 |
| `decor.sol.pasTransversal` | 24 |
| `decor.sol.avance.calme` | 1 |
| `decor.sol.avance.chaos` | 2 |
| `decor.sol.avance.vol` | 6 |
| `decor.sol.avanceBoost` | 1,6 |
| `decor.sol.reflet.min` | 24 |
| `decor.sol.reflet.max` | 44 |
| `decor.sol.reflet.amplitude` | 2 |
| `decor.sol.reflet.ky` | 0,7 |
| `decor.sol.reflet.kt` | 3 |
| `decor.sol.coutMs` | 0,5 |
| `decor.sol.tests` | 34000 |
| `decor.quartiers.docks.nom` | "LES DOCKS" |
| `decor.quartiers.docks.vague` | 1 |
| `decor.quartiers.artere.nom` | "L'ARTÈRE" |
| `decor.quartiers.artere.vague` | 2 |
| `decor.quartiers.centrale.nom` | "LA CENTRALE" |
| `decor.quartiers.centrale.vague` | 3 |
| `decor.quartiers.ciel.nom` | "LE CIEL" |
| `decor.quartiers.ciel.vague` | "defile" |
| `decor.quartiers.tours.nom` | "LES TOURS" |
| `decor.quartiers.tours.vague` | 4 |
| `decor.quartiers.coeur.nom` | "LE CŒUR" |
| `decor.quartiers.coeur.vague` | 5 |
| `decor.quartiers.eclipse.nom` | "L'ÉCLIPSE" |
| `decor.quartiers.eclipse.vague` | "cyclope" |
| `decor.transition` | 0,5 |
| `decor.precalculMs` | 4 |
| `decor.lumiere.seuil` | 0,1 |
| `decor.lumiere.calme.part` | 0,25 |
| `decor.lumiere.calme.moyenne` | 0,075 |
| `decor.lumiere.montee.part` | 0,28 |
| `decor.lumiere.montee.moyenne` | 0,085 |
| `decor.lumiere.chaos.part` | 0,32 |
| `decor.lumiere.chaos.moyenne` | 0,095 |
| `decor.lumiere.colosse.part` | 0,25 |
| `decor.lumiere.colosse.moyenne` | 0,075 |
| `decor.lumiere.decorSeul` | [0.18,0.28] |
| `decor.lumiere.decorMoyenneMin` | 0,06 |
| `decor.lumiere.desT` | 1 |
| `decor.lumiere.reperes.ouverture` | 0,089 |
| `decor.lumiere.reperes.affiche` | 0,116 |
| `decor.lumiere.reperes.demoT1` | 0,0155 |
| `decor.lumiere.reperes.demoSombre` | 0,97 |
| `decor.lumiere.sources.soleil` | 0,06 |
| `decor.lumiere.sources.horizon` | 0,03 |
| `decor.lumiere.sources.fenetres` | [0.05,0.08] |
| `decor.lumiere.sources.reflet` | 0,02 |
| `decor.lumiere.sources.lignes` | [0.02,0.03] |
| `decor.lumiere.sources.decor` | [0.18,0.22] |
| `decor.lumiere.videMax` | 0,3 |
| `decor.lumiere.changes.croisiere` | 0,15 |
| `decor.lumiere.changes.croisiereDuree` | 0,5 |
| `decor.lumiere.changes.immobile` | 0,03 |
| `decor.lumiere.changes.immobileDuree` | 1 |
| `decor.lumiere.reduit` | 0,005 |
| `decor.vie.soleilBandesMesures` | 2 |
| `decor.vie.projecteurs.nombre` | 2 |
| `decor.vie.projecteurs.trame` | 0,12 |
| `decor.vie.projecteurs.hz` | 0,2 |
| `decor.vie.intersectionsImages` | 2 |
| `decor.vie.ondule.elite` | 48 |

**N.R.radar** (§ 3.7)

| Chemin | Valeur |
|---|---|
| `radar.w` | 48 |
| `radar.h` | 24 |
| `radar.tete` | [2,1] |
| `radar.gros` | [2,3] |
| `radar.clignoteHz` | 2 |
| `radar.pastille` | 2 |
| `radar.portail.avance` | 0,6 |
| `radar.portail.chevron` | 7 |
| `radar.portail.mini` | 5 |
| `radar.portail.eliteMultiple` | 2 |
| `radar.portail.cyclopeMultiple` | 3 |
| `radar.portail.cyclopeAvance` | 1,4 |
| `radar.marqueurs.pres` | 7 |
| `radar.marqueurs.loin` | 3 |
| `radar.marqueurs.clignoteMaxHz` | 6 |
| `radar.marqueurs.mineHz` | 2 |

**N.R.apparitions** (§ 3.8)

| Chemin | Valeur |
|---|---|
| `apparitions.anticipee` | 1,15 |
| `apparitions.marge` | 24 |
| `apparitions.distanceTete` | 48 |
| `apparitions.interieurMurs` | 16 |
| `apparitions.reverifImages` | 4 |
| `apparitions.portail` | 0,6 |
| `apparitions.sansContact` | 0,6 |
| `apparitions.shownMarge` | 6 |
| `apparitions.rallonge` | 0,3 |
| `apparitions.teleMin` | 0,5 |
| `apparitions.teleCyclope` | 0,8 |
| `apparitions.teleConvoi` | 1,5 |
| `apparitions.portraitBas` | 0,5 |

**N.R.vol** (§ 3.9)

| Chemin | Valeur |
|---|---|
| `vol.parPartie` | 5 |
| `vol.duree` | 4 |
| `vol.depuis` | ["v1","v2","v3","defile","v4"] |
| `vol.balayage` | 0,4 |
| `vol.horizon` | 0,38 |
| `vol.sol` | 0,62 |
| `vol.grille` | 6 |
| `vol.tete.sprite` | 13 |
| `vol.tete.echelle` | 2 |
| `vol.anneaux` | [5,4,3,2,1] |
| `vol.cadre.x` | [0.15,0.85] |
| `vol.cadre.y` | [0.55,0.9] |
| `vol.vitesse` | 140 |
| `vol.cellules.nombre` | 24 |
| `vol.cellules.xp` | 1 |
| `vol.cellules.energie` | 1 |
| `vol.cellules.points` | 10 |
| `vol.portes.nombre` | 6 |
| `vol.portes.rayonMax` | 24 |
| `vol.portes.points` | 500 |
| `vol.portes.xp` | 5 |
| `vol.mines.nombre` | 4 |
| `vol.mines.versCoeur` | 8 |
| `vol.mines.ombreAvant` | 1,2 |
| `vol.mines.coupe` | 0,25 |
| `vol.mines.longueurMin` | 8 |
| `vol.mines.chaineDiviseur` | 2 |
| `vol.parfait` | 5000 |
| `vol.coutMs` | 2 |
| `vol.primitives` | 40 |
| `vol.Z0` | 64 |

**N.R.secteurs** (§ 4.1, 4.2)

| Chemin | Valeur |
|---|---|
| `secteurs.0.id` | "grille" |
| `secteurs.0.nom` | "LA GRILLE" |
| `secteurs.0.numero` | 1 |
| `secteurs.0.consigne` | ["ENCERCLE-LES.","ÉVITE LE MUR.","ÉVITE TA QUEUE."] |
| `secteurs.0.duree.min` | 320 |
| `secteurs.0.duree.max` | 390 |
| `secteurs.0.structure.ouverture` | 12 |
| `secteurs.0.structure.plongee` | 1,4 |
| `secteurs.0.structure.nettoyage` | 2,5 |
| `secteurs.0.structure.vol` | 4 |
| `secteurs.0.structure.warning` | 3 |
| `secteurs.0.structure.panneau` | 1,6 |
| `secteurs.0.structure.arrivee` | 2,2 |
| `secteurs.0.structure.victoire` | 6 |
| `secteurs.0.structure.cyclope.min` | 55 |
| `secteurs.0.structure.cyclope.max` | 90 |
| `secteurs.0.structure.cyclope.repits` | 2 |
| `secteurs.0.structure.cyclope.repit` | 7 |
| `secteurs.0.ordre` | ["v1","vol","v2","vol","v3","vol","defile","vol","v4","vol","v5","cyclope"] |
| `secteurs.0.finVague.vivantsMax` | 2 |
| `secteurs.0.soupape` | 12 |
| `secteurs.0.entree` | 6 |
| `secteurs.0.respiration.part` | 0,4 |
| `secteurs.0.respiration.duree` | 8 |
| `secteurs.0.grilleTemps` | 0,414938 |
| `secteurs.0.premierEnnemi.apresVirageDeg` | 45 |
| `secteurs.0.premierEnnemi.delai` | 3 |
| `secteurs.0.premierEnnemi.auPlusTard` | 6 |
| `secteurs.0.premierEnnemi.rienAvant` | 5 |
| `secteurs.0.premierEnnemi.partiesSuivantes` | 1 |
| `secteurs.0.premiereMenaceAvant` | 20 |
| `secteurs.0.traqueur.vagues` | [2,3,4,5] |
| `secteurs.0.traqueur.inaction` | 7 |
| `secteurs.0.traqueur.annonce` | 1,5 |
| `secteurs.0.traqueur.second` | 6 |
| `secteurs.0.elroy.reste` | 0,2 |
| `secteurs.0.elroy.acceleration` | 0,3 |
| `secteurs.0.vitessesFleches` | [50,55,60,65,70] |
| `secteurs.0.plafondDur.ennemis` | 40 |
| `secteurs.0.plafondDur.tirs` | 80 |
| `secteurs.0.vagues.0.n` | 1 |
| `secteurs.0.vagues.0.id` | "eveil" |
| `secteurs.0.vagues.0.nom` | "ÉVEIL" |
| `secteurs.0.vagues.0.quartier` | "docks" |
| `secteurs.0.vagues.0.etat` | "calme" |
| `secteurs.0.vagues.0.vitesse` | 68 |
| `secteurs.0.vagues.0.quota` | 24 |
| `secteurs.0.vagues.0.duree` | 22 |
| `secteurs.0.vagues.0.plafond` | 10 |
| `secteurs.0.vagues.0.chargesFleches` | 1 |
| `secteurs.0.vagues.0.tirsEnnemis` | false |
| `secteurs.0.vagues.0.formations.0.t` | 0 |
| `secteurs.0.vagues.0.formations.1.t` | 5 |
| `secteurs.0.vagues.0.formations.2.t` | 10 |
| `secteurs.0.vagues.0.formations.3.t` | 14 |
| `secteurs.0.vagues.0.formations.4.t` | 17 |
| `secteurs.0.vagues.0.remplissage` | "file" |
| `secteurs.0.vagues.0.travelling` | null |
| `secteurs.0.vagues.0.convois` | null |
| `secteurs.0.vagues.0.pastille` | null |
| `secteurs.0.vagues.0.pic` | null |
| `secteurs.0.vagues.1.n` | 2 |
| `secteurs.0.vagues.1.id` | "meute" |
| `secteurs.0.vagues.1.nom` | "MEUTE" |
| `secteurs.0.vagues.1.quartier` | "artere" |
| `secteurs.0.vagues.1.etat` | "montee" |
| `secteurs.0.vagues.1.vitesse` | 72 |
| `secteurs.0.vagues.1.quota` | 48 |
| `secteurs.0.vagues.1.duree` | 42 |
| `secteurs.0.vagues.1.plafond` | 16 |
| `secteurs.0.vagues.1.chargesFleches` | 2 |
| `secteurs.0.vagues.1.tirsEnnemis` | true |
| `secteurs.0.vagues.1.formations.0.t` | 2 |
| `secteurs.0.vagues.1.formations.1.t` | 14 |
| `secteurs.0.vagues.1.formations.2.t` | 28 |
| `secteurs.0.vagues.1.formations.3.t` | 8 |
| `secteurs.0.vagues.1.formations.4.t` | 30 |
| `secteurs.0.vagues.1.formations.5.t` | 18 |
| `secteurs.0.vagues.1.formations.6.t` | 26 |
| `secteurs.0.vagues.1.formations.7.t` | 36 |
| `secteurs.0.vagues.1.formations.8.t` | 10 |
| `secteurs.0.vagues.1.formations.9.t` | 22 |
| `secteurs.0.vagues.1.remplissage` | null |
| `secteurs.0.vagues.1.travelling.t` | 12 |
| `secteurs.0.vagues.1.travelling.vx` | 8 |
| `secteurs.0.vagues.1.convois` | null |
| `secteurs.0.vagues.1.pastille` | 20 |
| `secteurs.0.vagues.1.pic` | null |
| `secteurs.0.vagues.2.n` | 3 |
| `secteurs.0.vagues.2.id` | "batterie" |
| `secteurs.0.vagues.2.nom` | "BATTERIE" |
| `secteurs.0.vagues.2.quartier` | "centrale" |
| `secteurs.0.vagues.2.etat` | "montee" |
| `secteurs.0.vagues.2.vitesse` | 76 |
| `secteurs.0.vagues.2.quota` | 54 |
| `secteurs.0.vagues.2.duree` | 44 |
| `secteurs.0.vagues.2.plafond` | 20 |
| `secteurs.0.vagues.2.chargesFleches` | 3 |
| `secteurs.0.vagues.2.tirsEnnemis` | true |
| `secteurs.0.vagues.2.formations.0.t` | 4 |
| `secteurs.0.vagues.2.formations.1.t` | 24 |
| `secteurs.0.vagues.2.formations.2.t` | 10 |
| `secteurs.0.vagues.2.formations.3.t` | 16 |
| `secteurs.0.vagues.2.formations.4.t` | 34 |
| `secteurs.0.vagues.2.remplissage` | "file" |
| `secteurs.0.vagues.2.travelling.t` | 4 |
| `secteurs.0.vagues.2.travelling.vx` | 12 |
| `secteurs.0.vagues.2.convois` | null |
| `secteurs.0.vagues.2.pastille` | 14 |
| `secteurs.0.vagues.2.pic.t` | 30 |
| `secteurs.0.vagues.2.pic.elite` | "flecheBlindee" |
| `secteurs.0.vagues.2.pic.avec` | "meute" |
| `secteurs.0.vagues.2.pic.banniere` | true |
| `secteurs.0.vagues.3.n` | 4 |
| `secteurs.0.vagues.3.id` | "essaim" |
| `secteurs.0.vagues.3.nom` | "ESSAIM" |
| `secteurs.0.vagues.3.quartier` | "tours" |
| `secteurs.0.vagues.3.etat` | "chaos" |
| `secteurs.0.vagues.3.vitesse` | 80 |
| `secteurs.0.vagues.3.quota` | 60 |
| `secteurs.0.vagues.3.duree` | 48 |
| `secteurs.0.vagues.3.plafond` | 24 |
| `secteurs.0.vagues.3.chargesFleches` | 3 |
| `secteurs.0.vagues.3.tirsEnnemis` | true |
| `secteurs.0.vagues.3.formations.0.t` | 3 |
| `secteurs.0.vagues.3.formations.1.t` | 28 |
| `secteurs.0.vagues.3.formations.2.t` | 10 |
| `secteurs.0.vagues.3.formations.3.t` | 34 |
| `secteurs.0.vagues.3.formations.4.t` | 20 |
| `secteurs.0.vagues.3.formations.5.t` | 40 |
| `secteurs.0.vagues.3.formations.6.t` | 6 |
| `secteurs.0.vagues.3.formations.7.t` | 24 |
| `secteurs.0.vagues.3.remplissage` | null |
| `secteurs.0.vagues.3.travelling` | null |
| `secteurs.0.vagues.3.convois.t` | 8 |
| `secteurs.0.vagues.3.convois.periode` | 9 |
| `secteurs.0.vagues.3.convois.alea` | 2 |
| `secteurs.0.vagues.3.pastille` | 18 |
| `secteurs.0.vagues.3.pic.t` | 30 |
| `secteurs.0.vagues.3.pic.elite` | "rival" |
| `secteurs.0.vagues.3.pic.avec` | null |
| `secteurs.0.vagues.3.pic.banniere` | true |
| `secteurs.0.vagues.4.n` | 5 |
| `secteurs.0.vagues.4.id` | "deferlante" |
| `secteurs.0.vagues.4.nom` | "DÉFERLANTE" |
| `secteurs.0.vagues.4.quartier` | "coeur" |
| `secteurs.0.vagues.4.etat` | "chaos" |
| `secteurs.0.vagues.4.vitesse` | 84 |
| `secteurs.0.vagues.4.quota` | 80 |
| `secteurs.0.vagues.4.duree` | 50 |
| `secteurs.0.vagues.4.plafond` | 32 |
| `secteurs.0.vagues.4.chargesFleches` | 4 |
| `secteurs.0.vagues.4.tirsEnnemis` | true |
| `secteurs.0.vagues.4.formations` | [] |
| `secteurs.0.vagues.4.melange.toutes` | true |
| `secteurs.0.vagues.4.melange.parSalve` | 2 |
| `secteurs.0.vagues.4.melange.intervalle` | 5 |
| `secteurs.0.vagues.4.rapide` | 0,1 |
| `secteurs.0.vagues.4.remplissage` | null |
| `secteurs.0.vagues.4.travelling.t` | 6 |
| `secteurs.0.vagues.4.travelling.vx` | 14 |
| `secteurs.0.vagues.4.convois.t` | 12 |
| `secteurs.0.vagues.4.convois.periode` | 14 |
| `secteurs.0.vagues.4.convois.alea` | 0 |
| `secteurs.0.vagues.4.pastille` | 22 |
| `secteurs.0.vagues.4.pic.t` | 32 |
| `secteurs.0.vagues.4.pic.elite` | "rucheInstable" |
| `secteurs.0.vagues.4.pic.avec` | null |
| `secteurs.0.vagues.4.pic.banniere` | true |
| `secteurs.0.defile.id` | "defile" |
| `secteurs.0.defile.nom` | "LE DÉFILÉ" |
| `secteurs.0.defile.quartier` | "ciel" |
| `secteurs.0.defile.etat` | "calme" |
| `secteurs.0.defile.vitesse` | 76 |
| `secteurs.0.defile.duree` | 24 |
| `secteurs.0.defile.escadrilles` | 5 |
| `secteurs.0.defile.parEscadrille` | 8 |
| `secteurs.0.defile.intervalle` | 4,5 |
| `secteurs.0.defile.planeurs` | 40 |
| `secteurs.0.cyclope.quartier` | "eclipse" |
| `secteurs.0.cyclope.etat` | "colosse" |

**N.R.formations** (§ 4.3)

| Chemin | Valeur |
|---|---|
| `formations.annonce` | 1 |
| `formations.etiquette` | 1 |
| `formations.file.nom` | "FILE" |
| `formations.file.fleches` | 3 |
| `formations.meute.nom` | "MEUTE" |
| `formations.meute.fleches` | 6 |
| `formations.meute.forme` | "V" |
| `formations.nuee.nom` | "NUÉE" |
| `formations.nuee.larves` | [6,8] |
| `formations.nuee.forme` | "spirale" |
| `formations.duoMines.nom` | "DUO DE MINES" |
| `formations.duoMines.mines` | 2 |
| `formations.duoMines.distanceMin` | 90 |
| `formations.duoMines.marqueurs` | 1,5 |
| `formations.champMines.nom` | "CHAMP DE MINES" |
| `formations.champMines.mines` | 9 |
| `formations.champMines.grille` | 3 |
| `formations.champMines.distanceMin` | 100 |
| `formations.champMines.marqueurs` | 1,5 |
| `formations.pince.nom` | "PINCE" |
| `formations.pince.dards` | 2 |
| `formations.batterie.nom` | "BATTERIE" |
| `formations.batterie.tourelles` | 3 |
| `formations.batterie.ecartTirs` | 0,4 |
| `formations.essaim.nom` | "ESSAIM" |
| `formations.essaim.ruches` | 1 |
| `formations.essaim.larves` | 6 |
| `formations.duel.nom` | "DUEL" |
| `formations.duel.lames` | 2 |
| `formations.garde.nom` | "GARDE" |
| `formations.garde.sentinelles` | 1 |
| `formations.garde.fleches` | 4 |
| `formations.escadrille.nom` | "ESCADRILLE" |
| `formations.escadrille.planeurs` | 8 |
| `formations.escadrille.duree` | 8 |

**N.R.ennemis** (§ 4.4)

| Chemin | Valeur |
|---|---|
| `ennemis.tele.finRosePale` | 0,3 |
| `ennemis.tele.gaine` | 1 |
| `ennemis.tir.taille` | 5 |
| `ennemis.tir.rayon` | 2 |
| `ennemis.tir.correlationMax` | 0,5 |
| `ennemis.codex.duree` | 2 |
| `ennemis.codex.echelle` | 2 |
| `ennemis.fleche.nom` | "FLÈCHE" |
| `ennemis.fleche.pv` | 20 |
| `ennemis.fleche.r` | 5 |
| `ennemis.fleche.sprite` | 15 |
| `ennemis.fleche.approche` | [50,70] |
| `ennemis.fleche.fige` | 0,6 |
| `ennemis.fleche.distance` | [40,110] |
| `ennemis.fleche.bond.vitesse` | 160 |
| `ennemis.fleche.bond.duree` | 0,42 |
| `ennemis.fleche.bond.longueur` | 67 |
| `ennemis.fleche.recharge` | 1,6 |
| `ennemis.fleche.esquive.duree` | 0,25 |
| `ennemis.fleche.esquive.vitesse` | 70 |
| `ennemis.fleche.esquive.angleDeg` | 12 |
| `ennemis.fleche.esquive.distance` | 60 |
| `ennemis.fleche.esquive.recharge` | 1,2 |
| `ennemis.fleche.codex` | "SE FIGE, PUIS FONCE" |
| `ennemis.dard.nom` | "DARD" |
| `ennemis.dard.pv` | 30 |
| `ennemis.dard.r` | 5 |
| `ennemis.dard.sprite` | 15 |
| `ennemis.dard.croisiere` | 60 |
| `ennemis.dard.avance` | 165 |
| `ennemis.dard.verrou` | 0,6 |
| `ennemis.dard.fuseau.vitesse` | 165 |
| `ennemis.dard.fuseau.duree` | 0,5 |
| `ennemis.dard.fuseau.longueur` | 82 |
| `ennemis.dard.recharge` | 2 |
| `ennemis.dard.losange` | [9,5] |
| `ennemis.dard.codex` | "VISE OÙ TU VAS" |
| `ennemis.larve.nom` | "LARVE" |
| `ennemis.larve.pv` | 10 |
| `ennemis.larve.r` | 3,5 |
| `ennemis.larve.sprite` | 9 |
| `ennemis.larve.zigzag` | 55 |
| `ennemis.larve.orbite` | 30 |
| `ennemis.larve.mordDerniers` | 3 |
| `ennemis.larve.coupe` | 1 |
| `ennemis.larve.annonce` | 0,5 |
| `ennemis.larve.codex` | "MORD TA QUEUE" |
| `ennemis.mine.nom` | "MINE" |
| `ennemis.mine.pv` | 20 |
| `ennemis.mine.r` | 5,5 |
| `ennemis.mine.sprite` | 13 |
| `ennemis.mine.derive` | 4 |
| `ennemis.mine.cercle` | 34 |
| `ennemis.mine.meche` | 0,8 |
| `ennemis.mine.souffle` | 30 |
| `ennemis.mine.codex` | "S'ARME QUAND TU ENTRES" |
| `ennemis.tourelle.nom` | "TOURELLE" |
| `ennemis.tourelle.pv` | 60 |
| `ennemis.tourelle.r` | 6,5 |
| `ennemis.tourelle.sprite` | 15 |
| `ennemis.tourelle.bande` | 120 |
| `ennemis.tourelle.bandeAlea` | 25 |
| `ennemis.tourelle.vitesse` | 35 |
| `ennemis.tourelle.vise` | 0,75 |
| `ennemis.tourelle.balle` | 95 |
| `ennemis.tourelle.portee` | 160 |
| `ennemis.tourelle.tirs` | 3 |
| `ennemis.tourelle.blindageDeg` | 45 |
| `ennemis.tourelle.crochet` | 5 |
| `ennemis.tourelle.codex` | "BLINDÉE DE FACE" |
| `ennemis.lame.nom` | "LAME" |
| `ennemis.lame.pv` | 50 |
| `ennemis.lame.r` | 6 |
| `ennemis.lame.sprite` | 15 |
| `ennemis.lame.spriteDeploye` | 21 |
| `ennemis.lame.approche` | 45 |
| `ennemis.lame.declenche` | 150 |
| `ennemis.lame.recul` | 0,6 |
| `ennemis.lame.traverse.vitesse` | 230 |
| `ennemis.lame.traverse.duree` | 0,82 |
| `ennemis.lame.traverse.longueur` | 190 |
| `ennemis.lame.recup` | 0,8 |
| `ennemis.lame.degatsRecup` | 2 |
| `ennemis.lame.codex` | "RECULE PUIS TRAVERSE TOUT" |
| `ennemis.ruche.nom` | "RUCHE" |
| `ennemis.ruche.pv` | 240 |
| `ennemis.ruche.r` | 11 |
| `ennemis.ruche.sprite` | 23 |
| `ennemis.ruche.vitesse` | 25 |
| `ennemis.ruche.garde` | 90 |
| `ennemis.ruche.petales` | 0,7 |
| `ennemis.ruche.couvee` | 0,6 |
| `ennemis.ruche.larves` | 3 |
| `ennemis.ruche.periode` | 3,5 |
| `ennemis.ruche.larvesMax` | 12 |
| `ennemis.ruche.arcPv` | 1 |
| `ennemis.ruche.codex` | "PONDEUSE DE LARVES" |
| `ennemis.sentinelle.nom` | "SENTINELLE" |
| `ennemis.sentinelle.pv` | 60 |
| `ennemis.sentinelle.r` | 6,5 |
| `ennemis.sentinelle.sprite` | 15 |
| `ennemis.sentinelle.orbite` | 80 |
| `ennemis.sentinelle.vise` | 0,85 |
| `ennemis.sentinelle.laser` | 0,35 |
| `ennemis.sentinelle.longueur` | 300 |
| `ennemis.sentinelle.recharge` | 3 |
| `ennemis.sentinelle.lasersMax` | 2 |
| `ennemis.sentinelle.codex` | "LASER QUI TRAVERSE L'ÉCRAN" |
| `ennemis.rival.nom` | "RIVAL" |
| `ennemis.rival.pvTete` | 180 |
| `ennemis.rival.r` | 5,5 |
| `ennemis.rival.rSegment` | 3,5 |
| `ennemis.rival.segments` | 10 |
| `ennemis.rival.espacement` | 5 |
| `ennemis.rival.vitesse` | 0,9 |
| `ennemis.rival.rayonVirage` | 14 |
| `ennemis.rival.visee` | 40 |
| `ennemis.rival.evitementMurs` | 24 |
| `ennemis.rival.traine` | 1,5 |
| `ennemis.rival.traineLargeur` | 1 |
| `ennemis.rival.traineAgeMin` | 0,15 |
| `ennemis.rival.coupeRoute.distance` | 60 |
| `ennemis.rival.coupeRoute.annonce` | 0,5 |
| `ennemis.rival.spriteTete` | 11 |
| `ennemis.rival.perle` | 7 |
| `ennemis.rival.codex` | "VEUT TE COUPER LA ROUTE" |
| `ennemis.planeur.nom` | "PLANEUR" |
| `ennemis.planeur.pv` | 10 |
| `ennemis.planeur.r` | 4 |
| `ennemis.planeur.sprite` | 9 |
| `ennemis.planeur.sortie` | 8 |
| `ennemis.planeur.codex` | "NE TIRE PAS : ABATS-LES TOUS" |
| `ennemis.traqueur.nom` | "TRAQUEUR" |
| `ennemis.traqueur.pv` | 1 |
| `ennemis.traqueur.invulnerable` | true |
| `ennemis.traqueur.r` | 6 |
| `ennemis.traqueur.sprite` | 15 |
| `ennemis.traqueur.vitesse` | 0,95 |
| `ennemis.traqueur.portail` | 1,5 |
| `ennemis.traqueur.radarHz` | 2 |
| `ennemis.traqueur.points` | 5000 |
| `ennemis.traqueur.codex` | "SEUL UN LASSO LE TUE" |
| `ennemis.convoi.codex` | "BALAIE SA VOIE" |

**N.R.elites** (§ 4.5)

| Chemin | Valeur |
|---|---|
| `elites.pv` | 3 |
| `elites.sprite` | [19,21] |
| `elites.gelImages` | 5 |
| `elites.force` | 0,8 |
| `elites.cellules` | 6 |
| `elites.noyaux` | 1 |
| `elites.apogee` | 12 |
| `elites.pic` | [0.55,0.75] |
| `elites.flecheBlindee.type` | "fleche" |
| `elites.flecheBlindee.mods` | ["blinde"] |
| `elites.flecheBlindee.nom` | "FLÈCHE BLINDÉE" |
| `elites.flecheBlindee.vague` | 3 |
| `elites.rival.type` | "rival" |
| `elites.rival.mods` | [] |
| `elites.rival.nom` | "LE RIVAL" |
| `elites.rival.vague` | 4 |
| `elites.rival.pvPropres` | true |
| `elites.rucheInstable.type` | "ruche" |
| `elites.rucheInstable.mods` | ["instable"] |
| `elites.rucheInstable.nom` | "RUCHE INSTABLE" |
| `elites.rucheInstable.vague` | 5 |

**N.R.modificateurs** (§ 4.5)

| Chemin | Valeur |
|---|---|
| `modificateurs.blinde.pv` | 2 |
| `modificateurs.blinde.eclatent` | 0,5 |
| `modificateurs.blinde.allure` | 1,4 |
| `modificateurs.blinde.debris` | 3 |
| `modificateurs.blinde.pattes` | 2 |
| `modificateurs.rapide.allure` | 1,5 |
| `modificateurs.rapide.recharges` | 0,7 |
| `modificateurs.instable.meche` | 0,8 |
| `modificateurs.instable.souffle` | 34 |

**N.R.arene** (§ 4.6)

| Chemin | Valeur |
|---|---|
| `arene.travelling.largeur` | 576 |
| `arene.travelling.hauteur` | 512 |
| `arene.travelling.miseEnPlace` | 3 |
| `arene.travelling.marge` | 80 |
| `arene.travelling.annonce` | 2 |
| `arene.travelling.vitesses.2` | 8 |
| `arene.travelling.vitesses.3` | 12 |
| `arene.travelling.vitesses.5` | 14 |
| `arene.travelling.alerte` | 24 |
| `arene.travelling.retour` | 2 |
| `arene.travelling.cibleMouvement` | 0,25 |
| `arene.convois.voies` | [64,160,256,352,448] |
| `arene.convois.hauteurVoie` | 20 |
| `arene.convois.annonce` | 1,5 |
| `arene.convois.hachure` | 0,25 |
| `arene.convois.silenceApresElite` | 3 |
| `arene.convois.wagons` | 6 |
| `arene.convois.wagon` | [18,14] |
| `arene.convois.vitesse` | 240 |
| `arene.convois.museauHzMax` | 3 |
| `arene.convois.sillage.distance` | 40 |
| `arene.convois.sillage.facteur` | 1,4 |
| `arene.convois.sillage.broyes` | 2 |
| `arene.convois.v4.debut` | 8 |
| `arene.convois.v4.periode` | 9 |
| `arene.convois.v4.alea` | 2 |
| `arene.convois.v5.debut` | 12 |
| `arene.convois.v5.periode` | 14 |
| `arene.convois.joltPassage` | 2 |

**N.R.defile** (§ 4.7)

| Chemin | Valeur |
|---|---|
| `defile.duree` | 24 |
| `defile.escadrilles` | 5 |
| `defile.parEscadrille` | 8 |
| `defile.intervalle` | 4,5 |
| `defile.sortie` | 8 |
| `defile.points` | 100 |
| `defile.parfait` | 10000 |
| `defile.planeurs` | 40 |

**N.R.colosse** (§ 4.8)

| Chemin | Valeur |
|---|---|
| `colosse.corps` | [96,128] |
| `colosse.tete` | [40,32] |
| `colosse.main` | [24,24] |
| `colosse.plaques` | 6 |
| `colosse.plaque` | [12,12] |
| `colosse.silhouettes.loin` | 48 |
| `colosse.silhouettes.mi` | 80 |
| `colosse.pvPhase` | 1500 |
| `colosse.pvTotal` | 4500 |
| `colosse.pvMain` | 300 |
| `colosse.entree.total` | 6,8 |
| `colosse.entree.gelees` | 1,6 |
| `colosse.entree.warning` | 3 |
| `colosse.entree.bandes` | 10 |
| `colosse.entree.coupure` | 0,25 |
| `colosse.entree.panneau` | 1,6 |
| `colosse.entree.garde` | 0,3 |
| `colosse.entree.arrivee` | 2,2 |
| `colosse.entree.ralenti` | 0,3 |
| `colosse.entree.jauge` | 0,9 |
| `colosse.seuils` | [1,0.66,0.33,0] |
| `colosse.teleMin` | 0,8 |
| `colosse.phase1.rayon.vise` | 0,9 |
| `colosse.phase1.rayon.largeur` | 5 |
| `colosse.phase1.rayon.balayageDeg` | 100 |
| `colosse.phase1.rayon.duree` | 1,2 |
| `colosse.phase1.salve.charge` | 0,8 |
| `colosse.phase1.salve.balles` | 14 |
| `colosse.phase1.salve.vitesse` | 70 |
| `colosse.phase1.salve.salves` | 2 |
| `colosse.phase1.salve.ecart` | 0,5 |
| `colosse.phase1.appel.cycles` | 3 |
| `colosse.phase1.appel.formation` | "file" |
| `colosse.phase1.oeil` | 1,4 |
| `colosse.phase2.annonceCiseaux` | 0,8 |
| `colosse.phase2.oeilMain` | 3 |
| `colosse.phase2.oeilSalve` | 1,4 |
| `colosse.phase2.entree` | "meute" |
| `colosse.phase3.ombre` | 40 |
| `colosse.phase3.annonceBond` | 1 |
| `colosse.phase3.mines` | 6 |
| `colosse.phase3.armementMines` | 0,6 |
| `colosse.phase3.salveDouble` | 2 |
| `colosse.phase3.balles` | 14 |
| `colosse.phase3.resserre` | 0,15 |
| `colosse.phase3.oeil` | 1,4 |
| `colosse.repit.duree` | 7 |
| `colosse.repit.cellules` | 8 |
| `colosse.enrage.apres` | 100 |
| `colosse.enrage.allure` | 1,3 |
| `colosse.enrage.intervalle` | 0,75 |
| `colosse.mort.arretImages` | 24 |
| `colosse.mort.explosions` | 5 |
| `colosse.mort.cascade` | 0,66 |
| `colosse.mort.brasier` | 0,08 |
| `colosse.mort.brasierImages` | 4 |
| `colosse.mort.camera` | 6 |
| `colosse.mort.carcasse` | 3 |
| `colosse.mort.purge` | 0,045 |
| `colosse.cibles.combat` | [55,90] |
| `colosse.cibles.kamikazeMin` | 30 |
| `colosse.cibles.partCoups` | 0,35 |
| `colosse.cibles.teleTous` | 0,8 |

**N.R.pilotes** (§ 4.10)

| Chemin | Valeur |
|---|---|
| `pilotes.banc.profil` | "iPhone 13 paysage" |
| `pilotes.banc.dt` | 0,016667 |
| `pilotes.banc.graines` | 50 |
| `pilotes.banc.grainesAutres` | 5 |
| `pilotes.banc.coutPartie` | 10 |
| `pilotes.banc.passe` | 3600 |
| `pilotes.inerte.perdAvant` | 35 |
| `pilotes.inerte.partPerd` | 1 |
| `pilotes.inerte.premiereMortAvant` | 8 |
| `pilotes.tourneur.perdAvant` | 90 |
| `pilotes.tourneur.partPerd` | 1 |
| `pilotes.tourneur.scoreMax` | 0,1 |
| `pilotes.maladroit.decision` | 0,7 |
| `pilotes.maladroit.erreurDeg` | 35 |
| `pilotes.maladroit.medianeGameOver` | [45,150] |
| `pilotes.maladroit.cyclope` | 0 |
| `pilotes.maladroit.premierCoupAvant` | 30 |
| `pilotes.maladroit.partPremierCoup` | 0,8 |
| `pilotes.kamikaze.accelereAuDela` | 40 |
| `pilotes.kamikaze.perdAvantCyclope` | 0,9 |
| `pilotes.kamikaze.gagneMax` | 2 |
| `pilotes.humain.reaction` | 0,12 |
| `pilotes.humain.erreurDeg` | 10 |
| `pilotes.humain.medianeGameOver` | [120,210] |
| `pilotes.humain.cyclope` | [0.1,0.35] |
| `pilotes.humain.bat` | [0.02,0.12] |
| `pilotes.humain.coupV1` | 0,5 |
| `pilotes.humain.lasso.court` | 0,5 |
| `pilotes.humain.lasso.long` | 0,4 |
| `pilotes.bon.reaction` | 0,08 |
| `pilotes.bon.cyclope` | [0.3,0.6] |
| `pilotes.bon.bat` | [0.1,0.3] |
| `pilotes.bon.mortAvantCyclope` | 0,7 |
| `pilotes.bon.coupV1` | 0,4 |
| `pilotes.bon.longueurMaxAvant` | 120 |
| `pilotes.bon.lassoGroupe` | 4 |
| `pilotes.bon.lassoRayon` | 60 |
| `pilotes.bon.traversee` | 0,2 |
| `pilotes.bon.apogeeEnnemis` | 8 |
| `pilotes.bon.attraction` | 60 |
| `pilotes.bon.repulsionMurs` | 24 |
| `pilotes.expert.reaction` | 0,05 |
| `pilotes.expert.cyclope` | 0,8 |
| `pilotes.expert.bat` | [0.4,0.7] |
| `pilotes.expert.perdVie` | 0,8 |
| `pilotes.expert.lassos` | 10 |
| `pilotes.expert.apogees` | 2 |
| `pilotes.dieu.duree` | [320,390] |
| `pilotes.dieu.combat` | [55,90] |
| `pilotes.rythme.ecartBonKamikaze` | 1,3 |
| `pilotes.unPouce.diriger` | 0,15 |
| `pilotes.unPouce.auto` | 0,35 |

**N.R.scene** (§ 5.3)

| Chemin | Valeur |
|---|---|
| `scene.kill.force` | 0,32 |
| `scene.kill.forceTireur` | 0,45 |
| `scene.kill.parEnchaine` | 0,03 |
| `scene.kill.forceMax` | 0,58 |
| `scene.kill.recul` | 1 |
| `scene.kill.gelImages` | 2 |
| `scene.kill.gelIntervalle` | 0,12 |
| `scene.palier.grand` | 0,4 |
| `scene.lasso.gelImages` | 4 |
| `scene.lasso.gelDes` | 4 |
| `scene.coupe.gelImages` | 3 |
| `scene.elite.force` | 0,8 |
| `scene.elite.gelImages` | 5 |
| `scene.elite.ondule` | 48 |
| `scene.rival.gelImages` | 6 |
| `scene.convoi.jolt` | 2 |
| `scene.vague.duree` | 2,5 |
| `scene.niveau.ralenti` | 0,15 |
| `scene.niveau.duree` | 0,35 |
| `scene.apogee.gelImages` | 6 |
| `scene.apogee.ralenti` | 0,25 |
| `scene.apogee.duree` | 0,42 |
| `scene.danger.bordsHz` | 1,2 |
| `scene.cyclope.ralenti` | 0,3 |
| `scene.cyclope.duree` | 2,2 |
| `scene.cyclope.phase` | 7 |
| `scene.cyclope.mortImages` | 24 |
| `scene.cyclope.force` | 1 |
| `scene.etiquettePouvoir` | 1 |
| `scene.budgets.flashsParSeconde` | 3 |
| `scene.budgets.imagesSecouees` | 0,12 |
| `scene.budgets.banniereIntervalle` | 10 |
| `scene.budgets.bannieresSimultanees` | 1 |

**N.R.mortScene** (§ 5.4)

| Chemin | Valeur |
|---|---|
| `mortScene.gelImages` | 10 |
| `mortScene.anneau` | 1 |
| `mortScene.anneauHz` | 3 |
| `mortScene.coupure` | 0,015 |
| `mortScene.son.duree` | 0,9 |
| `mortScene.son.octaves` | 1,5 |
| `mortScene.desintegre.debut` | 0,17 |
| `mortScene.desintegre.fin` | 0,9 |
| `mortScene.desintegre.ralenti` | 0,25 |
| `mortScene.desintegre.imagesParSegment` | 2 |
| `mortScene.suite.debut` | 0,9 |
| `mortScene.suite.fin` | 1,3 |
| `mortScene.ready` | 0,6 |
| `mortScene.glitch` | 0,3 |
| `mortScene.extinction` | 0,4 |
| `mortScene.duree` | 1,3 |
| `mortScene.sautDes` | 0,5 |
| `mortScene.mainAvant` | 2 |
| `mortScene.finAvant` | 1,5 |

**N.R.hud** (§ 5.5)

| Chemin | Valeur |
|---|---|
| `hud.police` | [5,7] |
| `hud.pxMin` | 2 |
| `hud.ptMin` | 14 |
| `hud.partMax` | 0,1 |
| `hud.score.chiffres` | 7 |
| `hud.vie` | [5,5] |
| `hud.radar` | [48,24] |
| `hud.cyclope.jauge` | [120,3] |
| `hud.bouton.px` | 22 |
| `hud.bouton.pt` | 44 |
| `hud.banniere.echellePaysage` | 4 |
| `hud.banniere.echellePortrait` | 3 |
| `hud.banniere.entreeImages` | 2 |
| `hud.banniere.fantomes` | 2 |
| `hud.banniere.sortie` | 0,25 |
| `hud.toast.echelle` | 1 |

**N.R.ecrans** (§ 5.6, 5.6.1)

| Chemin | Valeur |
|---|---|
| `ecrans.demarrage.clignoteHz` | 1 |
| `ecrans.ouverture.duree` | 12 |
| `ecrans.ouverture.garde` | 0,3 |
| `ecrans.touchersMax` | 2 |
| `ecrans.titre.fondu` | [12,16] |
| `ecrans.titre.partChangeMax` | 0,6 |
| `ecrans.titre.classes` | [0.05,0.1] |
| `ecrans.attraction.attente` | 15 |
| `ecrans.attraction.boucle` | 35 |
| `ecrans.attraction.demo` | 20 |
| `ecrans.attraction.galerie` | 6 |
| `ecrans.attraction.records` | 5 |
| `ecrans.attraction.invitation` | 4 |
| `ecrans.attraction.graine` | 2975 |
| `ecrans.attraction.couches` | 2 |
| `ecrans.attraction.gainDb` | -6 |
| `ecrans.briefing.duree` | 2 |
| `ecrans.briefing.lignes` | 3 |
| `ecrans.plongee.duree` | 0,8 |
| `ecrans.cartes.plaques` | [3,5] |
| `ecrans.cartes.paysage` | [120,80] |
| `ecrans.cartes.paysageSerre` | [96,80] |
| `ecrans.cartes.portrait` | [180,48] |
| `ecrans.cartes.icone` | 16 |
| `ecrans.cartes.entree` | 0,055 |
| `ecrans.cartes.rebond` | 1 |
| `ecrans.cartes.etouffoir` | 900 |
| `ecrans.pause.etouffoir` | 420 |
| `ecrans.reglages.lignes` | 8 |
| `ecrans.fin.titreEchelle` | 3 |
| `ecrans.fin.garde` | 0,45 |
| `ecrans.fin.continuer.de` | 9 |
| `ecrans.fin.continuer.a` | 0 |
| `ecrans.fin.boutonPt` | 44 |
| `ecrans.fin.notes.S` | "FINIR, les 2 autres défis et aucune vie perdue" |
| `ecrans.fin.notes.A` | "FINIR et au moins un autre défi" |
| `ecrans.fin.notes.B` | "FINIR" |
| `ecrans.fin.notes.C` | "CYCLOPE atteint" |
| `ecrans.fin.notes.D` | "sinon" |
| `ecrans.fin.lassoBuild` | 0,3 |
| `ecrans.records.nombre` | 10 |
| `ecrans.records.lettres` | 3 |
| `ecrans.conseils.0` | ["murMobile","LE MUR ARRIÈRE AVANCE : RESTE DEVANT"] |
| `ecrans.conseils.1` | ["mur","LE MUR TUE. IL S'ALLUME QUAND TU APPROCHES"] |
| `ecrans.conseils.2` | ["morsure","TOURNE PLUS LARGE QUE TON CORPS"] |
| `ecrans.conseils.3` | ["convoi","LA VOIE CLIGNOTE AVANT LE CONVOI"] |
| `ecrans.conseils.4` | ["traine","FAIS-LE S'ÉCRASER SUR TON CORPS"] |
| `ecrans.conseils.5` | ["fleche","LA FLÈCHE SE FIGE AVANT DE FONCER"] |
| `ecrans.conseils.6` | ["dard","LE DARD VISE OÙ TU VAS : CHANGE DE CAP"] |
| `ecrans.conseils.7` | ["tourelle","PRENDS LA TOURELLE DE CÔTÉ"] |
| `ecrans.conseils.8` | ["lame","LA LAME RECULE PUIS TRAVERSE TOUT"] |
| `ecrans.conseils.9` | ["mine","LA MINE S'ARME DANS SON CERCLE"] |
| `ecrans.conseils.10` | ["sentinelle","QUITTE LA LIGNE PÂLE DU LASER"] |
| `ecrans.conseils.11` | ["traqueur","SEUL UN LASSO TUE LE TRAQUEUR"] |
| `ecrans.conseils.12` | ["apogeeInutilisee","TON APOGÉE ÉTAIT PRÊTE À m:ss : GLISSE UN 2ᵉ DOIGT"] |
| `ecrans.conseils.13` | ["pastilleIgnoree","L'ÉTOILE JAUNE DU RADAR RETOURNE LA CHASSE"] |
| `ecrans.conseils.14` | ["aucunLasso","BOUCLE AUTOUR D'EUX : TOUT ÉCLATE"] |

**N.R.deblocages** (§ 5.6)

| Chemin | Valeur |
|---|---|
| `deblocages.0.id` | "ralenti" |
| `deblocages.0.seuil` | 300 |
| `deblocages.1.id` | "repli" |
| `deblocages.1.seuil` | 800 |
| `deblocages.2.id` | "styles" |
| `deblocages.2.seuil` | 1500 |
| `deblocages.3.id` | "galerie" |
| `deblocages.3.seuil` | 2500 |
| `deblocages.4.id` | "departV3" |
| `deblocages.4.seuil` | 4000 |
| `deblocages.4.cartes` | 2 |

**N.R.deblocagesCible** (§ 5.6)

| Chemin | Valeur |
|---|---|
| `deblocagesCible.premierParties` | [1,2] |
| `deblocagesCible.dernierParties` | [12,25] |

**N.R.surcharge** (§ 9)

| Chemin | Valeur |
|---|---|
| `surcharge.vitesse` | 1,12 |
| `surcharge.densite` | 1,3 |
| `surcharge.score` | 1,5 |

**N.R.musique** (§ 5.7)

| Chemin | Valeur |
|---|---|
| `musique.piste.duree` | 275 |
| `musique.piste.frequence` | 48000 |
| `musique.piste.debit` | 196 |
| `musique.piste.bpm` | 144,6 |
| `musique.piste.mesure` | 1,6598 |
| `musique.piste.tonique` | "ré" |
| `musique.piste.mode` | "dorien" |
| `musique.sections.INTRO.mesures` | [1,10] |
| `musique.sections.INTRO.temps` | [0,16.6] |
| `musique.sections.INTRO.db` | -24 |
| `musique.sections.INTRO.boucle` | [3,10] |
| `musique.sections.PLATEAU.mesures` | [11,70] |
| `musique.sections.PLATEAU.temps` | [16.6,116] |
| `musique.sections.PLATEAU.db` | [-13,-11] |
| `musique.sections.PLATEAU.decollage` | 11 |
| `musique.sections.PONT.mesures` | [71,71] |
| `musique.sections.PONT.db` | -15 |
| `musique.sections.RESPIRATION.mesures` | [72,103] |
| `musique.sections.RESPIRATION.temps` | [119,171] |
| `musique.sections.RESPIRATION.db` | [-28,-18] |
| `musique.sections.RETOUR.mesures` | [104,153] |
| `musique.sections.RETOUR.temps` | [171,254] |
| `musique.sections.RETOUR.db` | [-13,-11] |
| `musique.sections.RETOUR.boucle` | [136,151] |
| `musique.sections.OUTRO.mesures` | [154,165] |
| `musique.sections.OUTRO.temps` | [254,274] |
| `musique.sections.OUTRO.db` | [-23,-19] |
| `musique.blocs.mesures` | 8 |
| `musique.blocs.duree` | 13,3 |
| `musique.blocs.recouvrement` | 1 |
| `musique.blocs.debit` | 112 |
| `musique.blocs.frequence` | 44100 |
| `musique.blocs.deriveMax` | 0,005 |
| `musique.blocs.decodesMax` | 4 |
| `musique.blocs.memoire` | 20 |
| `musique.blocs.memoireMax` | 25 |
| `musique.blocs.fondu` | 0,01 |
| `musique.blocs.precharges` | 2 |
| `musique.blocs.jointureMs` | 1 |
| `musique.blocs.sansRepetition` | 3 |
| `musique.alerte.coupure` | 0,25 |
| `musique.alerte.mesure` | 70 |
| `musique.alerte.passeBas` | 300 |
| `musique.defaite.passeBas` | 1200 |
| `musique.tension.filtre` | [2500,18000] |
| `musique.tension.tension` | [0.15,0.6] |
| `musique.tension.gainDb` | [-3,0] |
| `musique.etouffoirs.pause` | 420 |
| `musique.etouffoirs.cartes` | 900 |
| `musique.etouffoirs.ralenti` | 1200 |
| `musique.etouffoirs.danger` | 2000 |
| `musique.couches.percu` | 0,6 |
| `musique.couches.etincelles` | 0,8 |
| `musique.couches.etincellesRapport` | 0,25 |
| `musique.couches.etincellesOctaves` | ["ré5","ré6"] |
| `musique.accents.stingerMesures` | 1 |
| `musique.accents.drop` | 0,25 |
| `musique.accents.plongee.niveau` | 0,1 |
| `musique.accents.plongee.duree` | 0,09 |
| `musique.accents.plongee.retour` | 1,28 |
| `musique.repli.refrain.notes` | 8 |
| `musique.repli.refrain.mesures` | 2 |
| `musique.repli.centroide` | [900,1500] |
| `musique.repli.leadOctaves` | [4,5] |
| `musique.repli.couches` | 4 |
| `musique.calage.barreMs` | 10 |
| `musique.demarrage.mesures` | 1 |
| `musique.demarrage.releve` | 3 |
| `musique.reprise` | 1 |

**N.R.son** (§ 5.7, 5.8)

| Chemin | Valeur |
|---|---|
| `son.mix.calmeDbfs` | -20 |
| `son.mix.passeHautTel` | 350 |
| `son.mix.chaosDbfs` | -14 |
| `son.mix.ecartDb` | 6 |
| `son.mix.correlation` | 0,5 |
| `son.mix.sonsAuDessus` | [3,6] |
| `son.mix.tirSousKill` | 6 |
| `son.mix.esquive` | 0,3 |
| `son.mix.esquiveRelache` | 0,12 |
| `son.mix.creteDbfs` | -1 |
| `son.energieAigus` | 0,25 |
| `son.seuilAigus` | 400 |
| `son.pans` | 7 |
| `son.sitesParNom` | 3 |
| `son.salveParSeconde` | 8 |
| `son.noeudsParSeconde` | 60 |
| `son.butin.fenetre` | 1,2 |
| `son.butin.demiTons` | 12 |
| `son.bip.rapport` | 0,125 |
| `son.bip.duree` | 0,03 |
| `son.battement.hz` | 1 |
| `son.warning` | [1300,1800] |
| `son.repetition.fenetre` | 4 |
| `son.repetition.tolerance` | 0,01 |
| `son.repetition.duree` | 180 |
| `son.repetition.mesuresIdentiquesMax` | 2 |
| `son.voix.source` | [90,110] |
| `son.voix.formants` | 3 |
| `son.voix.intervalle` | 4 |

**N.R.reglages** (§ 7.10)

| Chemin | Valeur |
|---|---|
| `reglages.musique` | true |
| `reglages.effets` | true |
| `reglages.secousse` | 1 |
| `reglages.flashs` | true |
| `reglages.ecran` | "riche" |
| `reglages.texte` | 1 |
| `reglages.manche` | 1 |
| `reglages.actions` | "doigts" |

**N.R.reglagesValeurs** (§ 7.10)

| Chemin | Valeur |
|---|---|
| `reglagesValeurs.secousse` | [1,0.5,0] |
| `reglagesValeurs.ecran` | ["riche","sobre","pur"] |
| `reglagesValeurs.texte` | [1,2] |
| `reglagesValeurs.manche` | [0.8,1,1.25] |
| `reglagesValeurs.actions` | ["doigts","auto"] |

**N.R.persistance** (§ 7.10)

| Chemin | Valeur |
|---|---|
| `persistance.cle` | "snake2975.v1" |
| `persistance.version` | 1 |

**N.R.socle** (§ 7.4, 7.9)

| Chemin | Valeur |
|---|---|
| `socle.evParPas` | 64 |
| `socle.journal` | 65536 |
| `socle.vueImages` | 6 |

**N.R.perf** (§ 7.11)

| Chemin | Valeur |
|---|---|
| `perf.budget.crt` | 5,8 |
| `perf.budget.decor` | 1,5 |
| `perf.budget.ennemis` | 1 |
| `perf.budget.joueuse` | 1 |
| `perf.budget.effets` | 0,7 |
| `perf.budget.hud` | 0,4 |
| `perf.budget.systemes` | 0,3 |
| `perf.budget.musique` | 0,2 |
| `perf.budget.boucle` | 0,1 |
| `perf.budget.total` | 11 |
| `perf.crtAuditMs` | 7,7 |
| `perf.skipScaleGain` | 0,5 |
| `perf.adaptatif.sobre` | 12 |
| `perf.adaptatif.coupe` | 15 |
| `perf.adaptatif.retour` | 9 |
| `perf.adaptatif.hysteresis` | 45 |
| `perf.adaptatif.descenteMax` | 1 |
| `perf.bureauLargeurMax` | 1280 |
| `perf.cibles.x1` | 11 |
| `perf.cibles.x4` | 25 |
| `perf.cibles.iphone` | 16,7 |
| `perf.cibles.redimensionnementMax` | 50 |
| `perf.cibles.redimensionnements` | 10 |
| `perf.nonRegressionMs` | 0,5 |
| `perf.simule.partie` | 360 |
| `perf.simule.dureeMax` | 15 |

**N.R.criteres** (§ 8.5, 8.3)

| Chemin | Valeur |
|---|---|
| `criteres.R02.palette` | 1 |
| `criteres.R03.cyanHorsMasque` | 0,005 |
| `criteres.R05.causes` | 8 |
| `criteres.R06.apparitionsVue` | 0 |
| `criteres.R06.armementsHorsVue` | 0 |
| `criteres.R07.tele` | 0,5 |
| `criteres.R07.cyclope` | 0,8 |
| `criteres.R07.convoi` | 1,5 |
| `criteres.R08.visible` | 0,6 |
| `criteres.R08.part` | 0,95 |
| `criteres.R09.cadre` | [0.15,0.85] |
| `criteres.R09.segments` | 2 |
| `criteres.R10.vitesses` | 5 |
| `criteres.R10.changes` | 0,15 |
| `criteres.R10.duree` | 0,5 |
| `criteres.R12.brasier` | 0,08 |
| `criteres.R12.images` | 4 |
| `criteres.R12.camera` | 6 |
| `criteres.R13.flashsParSeconde` | 3 |
| `criteres.R13.aire` | 0,066 |
| `criteres.R14.secouees` | 0,12 |
| `criteres.R14.banniere` | 10 |
| `criteres.R16.cartes` | 10 |
| `criteres.R16.tolerance` | 2 |
| `criteres.R16.mortV3` | 4 |
| `criteres.R17.duree` | 1,3 |
| `criteres.R17.fin` | 1,5 |
| `criteres.R17.relance` | 2 |
| `criteres.R19.attente` | 15 |
| `criteres.R20.x1` | 11 |
| `criteres.R20.x4` | 25 |
| `criteres.R20.iphone` | 16,7 |
| `criteres.R21.profils` | 3 |
| `criteres.R21.pilotes` | 8 |
| `criteres.R21.graines` | 5 |
| `criteres.R21.grainesPaysage` | 50 |
| `criteres.R22.latenceImages` | 1 |
| `criteres.R23.diriger` | 0,15 |
| `criteres.R23.auto` | 0,35 |
| `criteres.R24.teteHorsQuartBas` | 0,95 |
| `criteres.R26.aigus` | 0,25 |
| `criteres.R29.arrierePlan` | 10 |
| `criteres.R29.sonRevenu` | 1 |
| `criteres.R31.mouvement` | 0,25 |
| `criteres.R31.vols` | 5 |
| `criteres.R31.convoisV4` | 4 |
| `criteres.R32.quartiers` | 7 |
| `criteres.R32.iou` | 0,5 |
| `criteres.R32.premiereFois` | 60 |
| `criteres.R34.court` | 0,5 |
| `criteres.R34.long` | 0,4 |
| `criteres.R34.rapport` | 0,8 |
| `criteres.R35.relance` | 2 |
| `criteres.R35.v1Max` | 24 |
| `criteres.R37.cyan` | 0,08 |
| `criteres.R37.silence` | 3 |
| `criteres.direction.flashsAire` | 0,066 |
| `criteres.direction.brasier` | 0,08 |
| `criteres.direction.brasierImages` | 4 |
| `criteres.direction.camera` | 6 |
| `criteres.direction.musiqueFenetre` | 4 |
| `criteres.direction.musiqueTolerance` | 0,01 |
| `criteres.direction.musiqueDuree` | 180 |
| `criteres.direction.p95` | 16,7 |
| `criteres.lots.accelerationSlalom` | 60 |
| `criteres.lots.rayonVirageTolerance` | 1 |
| `criteres.lots.recentrages` | 120 |
| `criteres.lots.recentrageCourt` | 0,3 |
| `criteres.lots.recentrageAutreDoigt` | 0,1 |
| `criteres.lots.gestes` | 20 |
| `criteres.lots.balayages` | 50 |
| `criteres.lots.bordPx` | 10 |
| `criteres.lots.appuiTenu` | 0,5 |
| `criteres.lots.accelerationAppui` | 0,32 |
| `criteres.lots.rotations` | 5 |
| `criteres.lots.monotonieImages` | 600 |
| `criteres.lots.pasFixeEcart` | 0,01 |
| `criteres.lots.travellingEcart` | 0,01 |
| `criteres.lots.lassoBruite.graines` | 50 |
| `criteres.lots.lassoBruite.reussite` | 0,8 |
| `criteres.lots.lassoBruite.longueurs` | [8,20,40] |
| `criteres.lots.reapparitions` | 200 |
| `criteres.lots.mortsMenace` | 48 |
| `criteres.lots.journalMinutes` | 10 |
| `criteres.lots.dpsTolerance` | 0,1 |
| `criteres.lots.paliersPixels` | 0,1 |
| `criteres.lots.passifTolerance` | 0,02 |
| `criteres.lots.silhouettesIou` | 0,6 |
| `criteres.lots.quartiersIou` | 0,5 |
| `criteres.lots.flashsChaine.explosions` | 30 |
| `criteres.lots.flashsChaine.duree` | 2 |
| `criteres.lots.ralentiGelMax` | 0,5 |
| `criteres.lots.teleImages` | 1 |
| `criteres.lots.scene.evenements` | 50 |
| `criteres.lots.scene.explosions` | 24 |
| `criteres.lots.scene.teles` | 30 |
| `criteres.lots.apparitionsGraines` | 20 |
| `criteres.lots.portails` | 0,99 |
| `criteres.lots.jointureMs` | 1 |
| `criteres.lots.calageMs` | 10 |
| `criteres.lots.memoireMo` | 25 |
| `criteres.lots.nonRegressionMinutes` | 10 |

**N.R.f** : `virage`, `deflexion`, `traine`, `degatsLasso`, `mult`, `objectif`, `longueurReapparition`, `longueurCoupe`, `cellulesCoupe`, `horizon`, `bonusCyclope`, `devore`, `pvElite`, `vitesse`, `niveau`, `tailleMain`
