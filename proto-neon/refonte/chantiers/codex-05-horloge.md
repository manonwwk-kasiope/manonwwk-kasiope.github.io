# Chantier codex-05 — brancher l'horloge à pas fixe

Confié à : **Codex**, par la cheffe d'orchestre (session Claude du Mac), le 18/10/2026 à 00 h 32.
À prendre après codex-01b. Fichiers à toi : `proto-neon/src/90-boot.js` et le nouveau dossier
`proto-neon/tools/horloge/`. Réserve-les dans `COORDINATION.md`. `79-jeu.js` est réservé par le lot I
(Claude Mac) : si tu en as besoin, écris la demande dans `refonte/lots/demandes.md` (§ codex-05) et attends
qu'il soit libéré.

## Le problème

Cause commune n° 1 de `refonte/couverture-snake2030.md` : la boucle d'images de `90-boot.js` (`frame()`)
passe son `dt` d'image directement à `N.game.update`, et n'appelle jamais `N.horloge.image(dtReel)` ni
`N.horloge.avancer()` (`03-socle.js`, `creerHorloge`). `O.bootNouveau()` (`70-commun.js`) reste donc faux et
tout le jeu suit « l'ancienne boucle ». Conséquences relevées : aucun ralenti n'agit (carte RALENTI, APOGÉE,
blessure, montée de niveau, arrivée du CYCLOPE : facteurs `k` / `kJoueuse` jamais lus), l'écran-titre de
`80-ecrans.js` n'est jamais montré, le gel d'impact passe par un bricolage (`S.dt * 0.08`).

## Ce qu'il faut obtenir

1. `frame()` alimente l'horloge (`image(dtReel)`), puis fait autant de pas fixes `avancer()` que l'horloge en
   rend (au plus `PAS_MAX`), chaque pas appelant la mise à jour du jeu avec le pas de l'horloge ; dessin une
   fois par image. `window.__DT` reste le moyen de figer le temps pour les tests.
2. Le chemin « nouveau » de `79-jeu.js` devient le chemin réel. Tout ce qui ne marche pas dans ce chemin est
   relevé (écran, fichier, ligne) dans ton rapport et dans `demandes.md`, sans être contourné.
3. Rien ne se perd sur iPhone (plateforme de référence) ; le bureau reste jouable.

## Seuils d'acceptation (`tools/horloge/banc.mjs`, profils iPhone 13 paysage, portrait, bureau)

- une partie complète au doigt simulé (ou au pilote `bon` de `85-pilote.js`) jusqu'à l'écran de fin, zéro
  erreur (`window.__ERR.count === 0`, console, page) sur les trois profils ;
- **RALENTI agit** : carte RALENTI équipée et déclenchée, le temps du monde (`N.horloge.dtMonde()`) est
  réduit selon `N.R` pendant sa durée, mesuré dans la boucle (pas de valeur lue seule) ; idem pour l'arrivée
  du CYCLOPE et une montée de niveau ;
- **l'écran-titre de `80-ecrans.js` s'affiche** au lancement (capture et `N.game.etat()`) ;
- même graine, deux lancements : même journal (déterminisme) ;
- p95 de l'image (`?perf=1`) en paysage : au plus + 0,5 ms par rapport à avant, même graine, machine au
  repos ; mesures aberrantes réitérées au moins une fois et signalées ;
- les bancs de codex-01 (`tools/lisibilite/banc.mjs`) et de codex-02 (`tools/pilotes/parties.mjs`) repassent :
  donne leurs résultats avant / après, sans retoucher leurs seuils.

Livraison : libère ta réservation, commit de `index.html` reconstruit à part, message terminé par
« prêt pour /mediateur ».
