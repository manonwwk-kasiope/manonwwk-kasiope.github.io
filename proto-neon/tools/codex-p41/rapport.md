# codex-p41 — R-35 : relance rapide

18/10/2026 · 06 h 18 (Paris) — publication ; mis à jour à 06 h 18.

**Commande hors bac, depuis cette copie de travail (sources réservées encore intactes) :**

```sh
cd /Users/manonwojciechowski/Projets/wt-snake/codex-p41/proto-neon
node tools/codex-p41/verifier.mjs
```

Retour attendu : `tools/codex-p41/navigateur/resultats.json`, reçus gzip, tampons `.bin` et captures PNG. Le script ouvre un port libre local et un seul Chromium avec `--mute-audio`, puis les trois profils en série. Il conserve les reçus des parties par empreinte des variantes et du protocole pour reprendre sans rejouer les cas validés. **Ce script n'a pas été exécuté dans le bac.** Seuls sa syntaxe, ses imports et sa préparation de bundles ont été vérifiés.

## Résultat et statut

**Livraison locale prête ; lot arrêté avant validation finale.** R-35 est satisfait en logique/VM ; les 80 observations appariées sont strictement identiques. **79/80 seulement atteignent une fin** : `dieu/2` atteint la borne avant et après. Le banc strict garde donc sa sortie 1, et `bilan.json.conformeVM=false` ; aucun seuil ni garde n'a été affaibli. La validation navigateur et Safari iPhone réel reste à faire.

Source reçue : HEAD `544ee5b04f13852263cb6006a1340f500b5d174c`. Instantané : `sources-avant.json.gz`, SHA-256 `83864f24798d845c5cc478575ec6cc32e8b5ba6c9f9b56d7bb3cc266fc5f44ef`. Candidate p41 en mémoire : `sources-apres.json.gz`, SHA-256 `1bec90c57b6aafc114c8b2ffe8534d2f00b9ab0b58874bc3e96529d54b6815e2`. Les sources réservées restent exactement celles reçues (`bilan.json.sourcesReserveesIntactes=true`). Aucun commit.

## Changement livré

`raccord-79-jeu.js.patch` remplace uniquement la sortie de `lancer()` : après l'arrêt du fond de fin et la remise à zéro complète, `nouvelle === true` appelle directement `lancerVague(N.R.secteurs[0].vagues[0].n)`. Le premier lancement `lancer(false)` garde le briefing. Le chemin REJOUER concerné est `79-jeu.js:608` → `lancer(true)` → `partie(...)` → première vague. Aucun fichier `src/` n'est modifié dans cette copie.

Aucun nombre de gameplay ajouté ; aucun changement dans `02-regles.js`. Les durées de briefing et de plongée restent intactes pour les autres parcours. La branche après une aventure entièrement achevée (`voyageFini`, retour au titre) est conservée : elle ne fait pas partie de la scène de fin de combat du critère R-35 et n'est pas qualifiée ici comme une relance rapide.

## Mesures avant / après

| Mesure réelle | État reçu | Raccord p41 | Seuil inchangé | Source |
|---|---:|---:|---|---|
| REJOUER → première image `jeu` avec joueuse vivante | 2,833333 s, image 170 | 0,016667 s, image 1 | < 2 s | `relance-vm.json`, reçus `relance-*.json.gz` |
| Briefing sur le parcours | présent | absent | absent | états de chaque image dans les mêmes reçus |
| V1, médiane bon, graines 1 à 50 | 23,891667 s | 23,891667 s | ≤ 24 s | `v1.json` |
| V1, minimum / maximum | 23,841667 / 23,892917 s | identiques | indicatif | `v1.json` |
| Comparaisons pilotes | 80 observations | 80 strictement identiques | aucun écart | `parties80.json`, reçus `parties/` |
| Fin atteinte avant la borne | 79/80 | 79/80 | toutes les fins requises par le banc strict | même source |
| Erreurs `__ERR` et console VM | 0 | 0 | 0 | `bilan.json`, reçus complets |

La baisse de V1 à environ 23,9 s était déjà intégrée dans l'état reçu : **elle n'est pas attribuée à p41**. Les 50 V1 sont nettoyées dans chaque variante, sans exclusion ; leurs 50 journaux appariés sont identiques (`v1PairesIdentiques=true`). Les dix premières graines réemploient les reçus complets des 80 paires ; les quarante autres par variante s'arrêtent au nettoyage de V1 ou à une fin réelle. La durée est exclusivement le temps du journal `vague/entree n=1` → `vague/nettoyee n=1`, comme le critère officiel. La médiane des cinq premières graines vaut aussi 23,891667 s.

## Chronologie image par image

Temps fixe de test `__DT=1/60`, vraie fonction `frame()` de `90-boot.js` exposée seulement par l'instrument. L'entrée est une impulsion, effacée par la vraie boucle. La préparation de l'écran de fin dure les 40 images du critère et reste hors chronomètre. Les 200 images suivant le geste sont conservées dans chaque reçu gzip, avec état, film, écran, position/cap/vitesse de tête, vies, score, vague, horloge, histogramme et empreinte du tampon.

| État après le geste, paysage | Images avant | Durée d'occupation échantillonnée | Images après |
|---|---|---:|---|
| `briefing` | 1–120 | 120/60 = 2 s | aucune |
| `plongee` | 121–169 | 49/60 = 0,816667 s | aucune |
| premier `jeu` vivant | 170, soit 170/60 = 2,833333 s | entrée quantifiée à l'image | 1, soit 1/60 = 0,016667 s |

Même résultat pour clavier et toucher injecté par `dbg.input`, dans les trois géométries 844×390 tactile, 390×844 tactile, 1440×900 bureau, et avec les raccords p38. Le premier pas jouable répond réellement : déplacement de 1,132957 pixels du tampon et virage de −0,103030 rad sur l'image suivante dans les trois géométries (`controles.json`). Ce sont des temps de jeu simulés, **pas une mesure de latence d'affichage Safari**.

Le premier instrument de prise en main portrait envoyait le cap déjà suivi : déplacement 1,133333 px, virage **0 rad** (`relance.log` et reçus initiaux). Cette valeur ne prouvait pas le virage. Le contrôle indépendant final envoie un cap perpendiculaire à la direction courante ; il conserve la vraie physique et donne la valeur non nulle ci-dessus. Aucune règle du jeu ni seuil modifié pour cet ajustement d'instrument.

## Calibration, non-régression et censure

`calibration.json` : 10/10 parties de `e1bdc6f` identiques à `tools/pilotes/sortie.json`, pour temps de jeu, temps de combat, temps simulé, vague et score ; toutes terminées, zéro erreur. La VM charge les vraies sources dans l'ordre lexicographique du build, dans une seule fermeture commune, sans DOM. Le protocole des parties reprend le stockage vierge, `S.jour=20261017`, ACTIONS auto pour humain/doigts pour les autres, skip d'ouverture, reset départ plongée, pilote public, journal actif, premier `horloge.avancer()`, tranches de 0,25 s et bornes existantes.

`parties80.json` : 80 paires avant/après, égalité de **toute la sortie sérialisée**, journal entier et échantillons compris. `parties80.mjs` sort **1** à cause de la non-fin déjà présente de `dieu`, graine 2 : temps de jeu **540,2216666824312 s**, temps simulé **556,5 s**, état `jeu`, vague **4**, score **124920**, zéro mort et zéro erreur, exactement les mêmes valeurs et le même journal avant/après. V4 commence à 154,54416667871038 s et aucun nettoyage de V4 n'est journalisé avant la borne. **Cause non établie.** Le pas de 0,25 s explique seulement l'observation après franchissement de la borne, pas la non-fin. Aucune extension de borne ni nouvelle partie de rattrapage. Demande séparée aux propriétaires dans `demandes.md`.

## Intermèdes, pixels et compatibilité

`controles.json` : appel public `portail/rival`, aucune lecture de champ privé ; l'intermède reste bloquant au geste prématuré à t=0,025 s ; il est armé à t=0,325 s et un geste neuf le saute à t=0,333333 s. La seconde demande dans la même partie n'ouvre aucun film ; la demande dans la partie relancée ouvre à nouveau `rival`. Contrôles sur les trois géométries, avec p41 seul et p38+p41 ; zéro erreur. Ce contrôle porte sur RIVAL et le garde commun ; il ne qualifie pas chaque film individuellement.

4800 images de relance ont un vrai tampon procédural dessiné, dont **0 pixel hors palette** : histogrammes et empreintes sont dans les reçus. Ces tampons sans DOM n'incluent pas les illustrations/vidéos décodées ni le rendu final du navigateur. Ils ne valent pas qualification visuelle, Safari, performance ou photosensibilité globale. Le script navigateur conserve les tampons bruts et des captures, puis exerce également un vrai `touchscreen.tap` sur iPhone émulé et un clic souris au bureau.

`compatibilite-outils.json` : application réelle de `/usr/bin/patch --batch -F 0 -p1`, dans des copies temporaires : p41 seul, p38 puis p41, p41 puis p38 ; tous codes 0, aucun fuzz, sources combinées identiques. `compatibilite.json` vérifie aussi la commutativité en mémoire. Les patches p38 témoins sont `p38-79-jeu.js.patch` et `p38-50-fx.js.patch` ; **p41 ne propose aucun changement de `50-fx.js`**.

## Vérifications livrées et reste indispensable

- `cd proto-neon && node build.mjs` : **sortie 0**, log `build.log` ; bundle de production reconstruit depuis les sources reçues intactes, puisque le raccord reste volontairement un patch. Les quatre variantes de qualification sont préparées dans le dossier de mission et servies virtuellement par le vérifieur (`bundles.json`).
- Syntaxe des scripts, imports Playwright/profils et `git apply --check` du raccord : sorties 0 ; sources réservées identiques à l'instantané reçu.
- Réseau sortant, SSH, serveur local, Chromium : **aucun lancé dans ce bac**.
- La cheffe doit exécuter le vérifieur hors bac depuis cette copie avant intégration pour mesurer exactement ces variantes, relire/appliquer le raccord de `79-jeu.js`, reconstruire la branche d'intégration et qualifier le résultat intégré. Le vérifieur refuse des sources différentes de l'instantané pour empêcher l'emploi de reçus périmés.
- Restent la vérification navigateur, Safari iPhone réel, et le diagnostic séparé de la paire censurée dieu/2. Le retour au titre après une aventure entièrement finie reste hors qualification de ce lot. **Ni palier global ni chantier complet annoncé achevé.**
