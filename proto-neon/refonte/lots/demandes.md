# Demandes au gardien du contrat

Règle (REFONTE.md § 8.1) : un besoin nouveau s'écrit en UNE ligne, ici (lot, fichier, besoin, raison). Le gardien accepte ou
refuse, publie une version 1.1, 1.2… et l'orchestrateur reporte les fichiers du contrat dans toutes les copies.
On ne modifie jamais le fichier d'un autre lot.

| lot | fichier | besoin | raison |
|---|---|---|---|
| 0b | `60-intro.js` | `N.intro.demarrage()` / `titre()` / `plongee()` : dessin des états `demarrage`, `titre`, `plongee` ; `N.intro.fini(etat)` ; l'ouverture jouée par `N.game.update` (S.phase disparaît) | 79-jeu dessine des replis de ces trois états (« TOUCHE POUR COMMENCER », titre, plongée de 0,8 s) ; il appelle seulement transition('boss'|'victoire'|'defaite'), busy(), current(), update(), draw(), stop(), skip() |
| 0b | `90-boot.js` | appeler `N.ev.nouveauPas()` (déjà par `N.horloge.avancer()`), ne plus aiguiller sur `S.phase`, appeler `N.hud.draw()`, `N.ui.draw()` et `N.intro.draw()` après `N.gfx.origin(0,0)` | 79-jeu les dessine lui-même tant que `N.horloge.pas()` vaut 0 (ancienne boucle) |
| 0b | `10-gfx.js` | `N.gfx.origin`, `N.gfx.remap(lut)`, `N.gfx.owner` | 70-commun et 79-jeu appellent `origin` et `remap` quand ils existent ; sinon repli (origine nulle, remappage direct dans `buf()`) |
| 0b | `03-socle.js` | `SCH.player` : accepter `lives` et `invul` ? | refusé par moi : ces champs restent dans `N.score.vies` et `N.joueuse.invul()` ; aucune action |
| 0b | `03-socle.js` | accepter dans `N.ids.cartes` l'identifiant `cadence` du repli CARTES v0 (déjà présent) et signaler que les cartes `canon`, `croissance`, `cadence` du repli sont émises par 79-jeu en l'absence de `N.cartes` | un seul émetteur de `carte` : N.cartes ; le repli la remplace tant que 75-cartes.js manque |
| 0b | `72-ennemis.js` | le gros ennemi de la démo vit ici (type `cyclope`, boss, partie `oeil`) jusqu'à `73-colosse.js` | lot 5b : à retirer de 72-ennemis quand N.colosse existe |
| 5a | `70-joueuse.js` | un multiplicateur de vitesse externe (ex. `N.joueuse.mulVitesse` lu dans `update`, ou `vitesseMul(k)`) pour le SILLAGE ×1,4 sans vider la réserve (§ 4.6) | `73-arene.js` n’a aucun point d’accroche : il pousse la tête de (1,4 − 1) × vitesse × dt le long du cap quand c’est sûr (plus de 8 px des murs) ; à retirer dès que le multiplicateur existe |
| 5a | `76-directeur.js` / `72-ennemis.js` | faire naître les ennemis devant le mur arrière en lisant `N.arene.murArriere()` -> `{x, sens, actif, y0, y1}` ou `null` (§ 3.8, « les apparitions naissent devant le mur arrière ») | `73-arene.js` publie la position du mur arrière (finale avant le départ, courante ensuite) ; sans lecture, les naissances ignorent le plateau qui voyage |
