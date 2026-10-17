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
