# codex-p8 — longueur critique et accélération

18/10/2026 · 01 h 48 (Paris), mis à jour à 01 h 55. **Implémentation livrée et non-régression avant/après mesurée ; palier global non validé** (référence historique et navigateur, voir ci-dessous).

Commande hors bac, depuis la racine : `node proto-neon/tools/codex-p8/verifier.mjs`.

Sources modifiées : `70-joueuse.js`, `78-hud.js`, `12-cam.js`, ajouts seuls dans `02-regles.js` et section codex-p8 de `demandes.md`. Bundle reconstruit, sortie 0. Aucun commit.

- Existant conservé : boost au manche, jauge de réserve, RÉPARATION, alerte de proximité du mur.
- Ajout : `N.joueuse.critique()`, couronne cyan pâle à L ≤ 3, 1 Hz, sans lien avec le mur ; fixe sous mouvement réduit et si les flashs sont désactivés. Trois pastilles fixes près de la tête, sûres dans les deux orientations. Deux filets ambre courts derrière la tête pendant le vrai boost. Caméra : boost effectif public en plus de l'entrée second doigt ; facteur 1,4 existant conservé.
- Les nouvelles constantes et leurs raisons sont dans `N.R` et la section codex-p8 de `demandes.md`. Le sol reste au lot décor, demande déposée.

## Mesures VM (ne qualifient pas Safari)

VM calibrée : **10/10** parties du commit e1bdc6f identiques au reçu `tools/pilotes/sortie.json` (temps de jeu, vague, score, arrêt et erreurs), cinq pilotes × deux graines. Sources réelles chargées dans l'ordre lexicographique de build, sans DOM. Protocole exact de `tools/pilotes/parties.mjs` ; l'amorçage équivalent au boot précède ce protocole. Reçu : `calibration.json`.

`statique.json` : trois profils × mouvement normal/réduit, 78 contrôles réussis, zéro erreur. `avant-visuel.json` : rendu/caméra des sources d'origine conservées dans `avant/`.

| Mesure réelle | Avant | Après |
|---|---:|---:|
| État critique public L=1/2/3/4 | absent | vrai/vrai/vrai/faux |
| Pixels ambre aux extrémités des deux filets, après dessin complet du serpent | 0 | 14 par profil |
| Distance visible devant la tête, paysage, croisière → manche poussé | 274 → 274 px | 274 → 300 px |
| Distance visible, portrait | 127 → 127 px | 127 → 138 px |
| Distance visible, bureau | 234 → 234 px | 234 → 256 px |
| Couronne critique, différences entre t=0 et 0,5 s, demi-couronne isolée | non présente | 33 pixels ; 0 en mouvement réduit |
| Couronne, différences entre t=0 et 1 s | non présente | 0 |
| Centres des trois pastilles à L=3 | absents | index 8, 8, 8 (cyan pâle) |

Limites de la mesure : fixtures immobiles loin du mur, cap horizontal ; tampon procédural réel de `N.gfx`, sans canvas DOM. Les distances sont mesurées par `N.cam.devant()` après convergence, sans déplacer la tête entre les deux états. La couronne est isolée par comparaison avec L=4 au même instant, sur sa moitié avant, pour exclure l'animation native du pouvoir et du corps. Aucun appel compté ne remplace un pixel ou un état.

Première sonde : sortie 1, corrigée ensuite ; relevé ambre initial vide (0) car `gfx.at` retranchait une seconde fois l'origine ; lecture directe de `gfx.buf()` corrigée. Première mesure de couronne : 2 pixels parasites entre t=0 et 1 s et en mouvement réduit, provenant du point de pouvoir tournant ; isolation par contrôle L=4, sans changement de seuil. La première écriture de `verifier.mjs` a visé un chemin doublé depuis `proto-neon/` et échoué ; corrigée depuis la racine. Aucun serveur ni Chromium tenté.

## Parties et référence historique

**20/20 parties identiques avant/après**, cinq pilotes × quatre graines, toutes à l'état fin et zéro erreur : temps de jeu, vague, score, raison d'arrêt et SHA-256 du journal complet. Reçu : `comparaison20.json`. Les 20 comparaisons emploient les sources finales, dont le garde-fou caméra : un drapeau boost résiduel après mort n'augmente pas l'avance (deux contrôles ciblés supplémentaires, critique désactivé après mort et caméra identique avec/sans ce drapeau).

**13/20 correspondent exactement à l'ancienne référence e1bdc6f ; 7/20 en divergent déjà AVANT ce lot.** Les sept écarts sont reproduits à l'identique après, journal compris. La calibration sur les sources e1bdc6f reste bien à 10/10 : cette différence porte sur l'état actuel des sources, pas sur une tolérance de la VM. Aucune cause précise des écarts historiques n'est attribuée ici. Le script `comparaison20.mjs` sort donc **1**, conformément à son critère strict de référence historique ; `avantApresConforme=true`, `referenceHistoriqueConforme=false`. Aucun seuil abaissé.

| Pilote | Graine | Référence : temps s | Sources de départ = finales : temps s | Référence : score | Départ = final : score |
|---|---:|---:|---:|---:|---:|
| tourneur | 1 | 20.192500001688256 | 20.19041666860327 | 1370 | 1370 |
| maladroit | 1 | 19.259166668354975 | 21.00708333526989 | 480 | 550 |
| kamikaze | 3 | 63.929166670140596 | 65.1229166706382 | 12540 | 13670 |
| humain | 1 | 66.06500000357511 | 95.36208333946475 | 2350 | 8380 |
| humain | 2 | 72.97000000179237 | 71.95250000407619 | 1470 | 1460 |
| humain | 3 | 89.17333333692683 | 368.98916671308524 | 7690 | 125430 |
| humain | 4 | 67.72333333690976 | 58.42750000407051 | 1330 | 1280 |

La première passe exploratoire de 24 parties a été interrompue (sortie 130, sans reçu exploité), puis remplacée par la comparaison complète de 20 parties sur les sources finales ; aucun résultat inachevé n'est compté comme réussi. Les 60 autres cas historiques ne sont pas mesurés ici : aucune égalité globale des 80 n'est revendiquée.

Commandes VM sans serveur ni Chromium, depuis la racine :

- `node proto-neon/tools/codex-p8/calibrer.mjs` (calibration e1bdc6f).
- `node proto-neon/tools/codex-p8/comparaison20.mjs` (strict, échec historique documenté).
- `node proto-neon/tools/codex-p8/statique.mjs` (78 contrôles du tampon et des états).

## Navigateur : à vérifier hors bac

`verifier.mjs` prêt, syntaxe vérifiée seulement. Serveur HTTP Node sur port libre, un seul Chromium `--mute-audio`, trois profils en série : 844×390 tactile, 390×844 tactile, 1440×900 bureau ; chacun avec et sans mouvement réduit. Le script écrit 12 captures du canvas, états et erreurs, journaux et pixels ambre dans `navigateur/`. L=3 et accélération sont capturés sur le vrai bundle, après le dessin de la joueuse. **Aucune preuve Playwright ni validation Safari matériel revendiquée.**

## Clôture du travail autorisé dans ce bac

Build final : sortie **0**, 35 modules, 1 870 751 octets (la taille exacte et le SHA-256 sont dans `empreintes.json`). Syntaxe des scripts et `git diff --check` : sortie 0. Toutes les simulations sont arrêtées ; aucun commit. Le retour critique seul respire à 1 Hz sur une petite couronne, sans aplat ; ce contrôle ciblé ne vaut pas une qualification de photosensibilité du jeu entier.

**Validation globale bloquée** : exécution Playwright hors bac par la cheffe d’orchestre, puis revue visuelle iPhone/Safari ; réconciliation des sept écarts historiques dans les modules responsables, hors périmètre p8. Le script navigateur, les captures demandées et les mesures sont prêts à être produits ; aucune approbation ni mesure navigateur inventée.
