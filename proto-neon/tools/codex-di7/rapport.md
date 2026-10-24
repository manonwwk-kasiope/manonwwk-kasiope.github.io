24/10/2026 · 15 h 27 (Paris), mis à jour à 15 h 28

Commande de vérification locale : `node proto-neon/tools/jury2/verifier.mjs --statique`.
Aucun navigateur, serveur ni réseau sortant lancé. Modifications limitées à `tools/jury2/` et à ce rapport expressément demandé.

La grille est corrigée et la coupure musicale devient lisible dans les paquets reconstruits. **La discrimination complète reste bloquée par les anciens bruts** : les doublons ne sont pas attribuables et le témoin filmé n'est pas réellement désynchronisé. Aucun nouveau juré ne doit être sollicité sur ces anciens paquets pour prétendre valider ces axes.

Le défaut de grille est confirmé : ancien `sonde.mjs:15` et ancien `tapis.mjs:21-23` calculaient la distance au temps entier ; le jeu utilise `src/31-rythme.js:246-250`, avec `src/02-regles.js:1251` (`subdivisions = 2`). La correction lit la règle du **bundle réellement observé**, et non du checkout : `grille-sync.mjs:7-24`. La sonde capture désormais `N.R.rythme` (`sonde.mjs:158`, `banc.mjs:257`). Sans règle identifiable, résultat inconnu. Aucun changement de ± 40 ms, 95 %, écart minimal de 1,5, témoin < 7 ni des autres seuils.

Mesures sur les parties des deux paquets réels cités dans la mission, sans modifier leurs originaux :

| Mesure | Avant | Après |
|---|---:|---:|
| V0, agrégat audible (apparitions, tirs, entrées de vague) | 315/1980 = 15,91 % | 1755/1980 = 88,64 % |
| V0, apparitions audibles mesurables | 36/1287 = 2,80 % | 1274/1287 = 98,99 % |
| V0, tirs ennemis audibles mesurables | 259/665 = 38,95 % | 455/665 = 68,42 % |
| V0, entrées de vague audibles mesurables | 20/28 = 71,43 % | 26/28 = 92,86 % |
| Témoin dégradé, liaison audible | 0 mesurable | 0 mesurable, coupure explicitée |
| Sonde positive historique, grille géométrique | 3/96 = 3,13 % | 95/96 = 98,96 % ; ≥ 50 % |
| Sonde dégradée historique, grille géométrique | 3/96 = 3,13 % | 95/96 = 98,96 % |

Sources recalculables : `../jury2/synchronisation-di7.json`, `../jury2/sondes-sync-di7.json`, `../jury2/discriminant-di7.json`. L'ordre de grandeur des apparitions rejoint celui de r2d, sans prétendre reproduire 99,78 % : corpus et mesure différents. Les 17 apparitions audio inconnues et le tir inconnu restent comptés ; les critères stricts de conformité restent faux. L'agrégat, les tirs et les départs de vague ne passent pas tous 95 %. La perte temporelle historique positif−dégradé vaut **0**, sous le minimum requis de 0,2 : ancien instrument non validé sur cet axe.

Ce qui manquait à quelle pièce :

| Sabotage | Absence constatée | Correction et limite |
|---|---|---|
| Musique coupée | Le tapis ne conservait ni `musiqueMuette` ni l'état audible ; le RMS public avant mute restait positif. L'annexe agrégée disait seulement « 0 mesurable ». | Tapis JSON/PNG : état muet, croix rouge, aucun faux vert musical. `observations.json` en passe 1 : trace publique des sorties et de la porte mute ; agrégats en annexe passe 2. Le mix capté peut toujours contenir les effets ; aucune écoute inventée. |
| Retards de 0 à 0,9 | Dans `build.html` du témoin filmé, seul `portail` était augmenté ; `src/72-ennemis.js:205` recalait ensuite la naissance. Le sabotage temporel n'existe donc pas comme désynchronisation dans ces bruts. | Le `temoin.mjs` **déjà reçu** impose `rythmeFin` explicite (`:35-49`). Ses contrôles VM réels passent. Aucun changement supplémentaire à ce module ; nouveau tournage indispensable pour confirmer la sortie Chrome. |
| Poursuivants doublés | Ni les planches ni l'annexe ne relient une réservation à deux identifiants apparus. Les types/positions d'apparition ne suffisent pas à attribuer le doublon. La durée de survie varie et ne le prouve pas. | `sonde.mjs:88-96` conserve la différence effective du tableau public avant/après `spawn`. `observations.mjs` relie chaque identifiant à son apparition confirmée après rendu. Trace publique et annexe ajoutées. Nouveaux bruts requis ; aucune mesure de doublons inventée pour l'ancien lot. |

`discriminant.mjs` accepte uniquement le chemin du paquet et la passe. Il ne lit aucune clé, aucun brut, aucun rôle secret. Les clés ne servent qu'au montage de test ; aucun accès de ce type dans le juge-code. Les tests enferment ses lectures dans le paquet, interdisent l'annexe en passe 1, empoisonnent un fichier secret voisin et rejettent un chemin parent et un lien symbolique sortant.

Ses scores sont des **indices physiques hors jugement esthétique**, dont les formules sont publiées dans README. Rythme : dix fois la fraction de sorties reliées à une grille musicale non muette. Game design : dix fois le rapport réservations/sorties réellement apparues, par classe, avec la classe la plus altérée retenue et toutes les classes affichées.

| Regard | Paquets réels reconstruits : V0 / témoin | Écart | État |
|---|---:|---:|---|
| rythme et musique | 8,71 / 0 | 8,71 | Séparation physique ≥ 1,5 ; témoin < 7 ; deux passes identiques |
| game design | non mesurable / non mesurable | non mesurable | Réservations absentes des anciens bruts ; acquisition corrigée, validation réelle restante |
| joueuse iPhone | non mesurable / non mesurable | non mesurable | Aucun défaut de lecture ou de commande prouvé par ces sabotages seuls |
| direction artistique | non mesurable / non mesurable | non mesurable | Aucun défaut de composition prouvé par ces sabotages seuls |
| avocat du diable | non mesurable / non mesurable | non mesurable | Une densité supérieure ne suffit pas à prouver une mort injuste |

Les quatre derniers regards n'ont pas reçu de note fabriquée pour faire passer le seuil. Le juge-code n'est pas une évaluation globale du jeu ni une référence indépendante de qualité ; ne pas l'utiliser pour ouvrir la porte 7. Les paquets ont été reconstruits dans des dossiers temporaires puis supprimés, originaux conservés ; les reçus et les formules restent livrés.

Vérification : **73 contrôles statiques sur 73 réussis**, puis **5 contrôles ciblés sur 5 réussis** après ajout du contrôle des sondes réelles. Le premier passage a conservé ses 3 échecs dans `verification-di7-premiere-passe.json` : une fixture sans état audio/règle explicites (corrigée), deux recherches d'anciennes pièces déplacées dans `jury-etal/archives-v2` (retrouvées, tests conservés). Les témoins purs ont les mêmes attendus, les contrôles de défauts plantés et d'accessibilité restent intacts. Reçus : `verification-locale.json`, `verification-di7-ciblee.json`, `statique-di7.log`, `cibles-di7.log`. `pretPourJury` reste **false**.

Build en copie temporaire : sortie **0**, octets identiques au jeu reçu, SHA-256 `3eaf75cf596e5e101d7b33d103eae98dca36ae83435afa3b4890618f684a4024`. Aucun changement à `src/` ni à `index.html`. La validation VM historique du chargeur est réutilisée : dix parties e1bdc6f identiques, reçu courant vérifié par empreinte. Pas de nouvelle campagne de 80 parties : aucune logique du jeu modifiée.

Nouveau Chrome **nécessaire**, à lancer uniquement par la cheffe hors du bac, depuis cette copie après intégration des outils :

```sh
cd /Users/manonwojciechowski/Projets/wt-snake/codex-di7/proto-neon
node tools/jury2/banc.mjs --serie etalonnage --build di7-20261024 --valider-instrument --carte /Users/manonwojciechowski/Projets/wt-snake/codex-r1/proto-neon/tools/codex-r1/structure.json
```

Durée **hypothèse : 90 à 180 minutes**, si les parties et l'aventure restent proches des anciens bruts ; plafond de durée d'acquisition d'environ **270 minutes**, dérivé des bornes existantes : deux builds × (8 parties × 12 min + aventure 30 min + sondes/charges), plus encodage non borné. Un seul Chrome headless, muet, verrou exclusif existant. Les chemins de carte ont été vérifiés présents. Une validation instrument seule ne fournirait pas les parties nécessaires à la discrimination game design ; ne pas la confondre avec cette reprise complète. Reconstruire ensuite les paquets avec `jure.mjs paquet`, puis lancer `discriminant.mjs CHEMIN_PAQUET --passe2` et contrôler l'écart avant tout nouveau jury. Aucun lancement effectué ici.

**Lot arrêté pour la qualification complète** : livrables techniques et contrôle de grille terminés ; restent la désynchronisation réelle et les doublons sur les nouveaux bruts, puis les regards visuels indépendants. Dépendance indispensable : retour de la prise hors bac par la cheffe. Aucun seuil affaibli.

Commit local tenté : la commande `git add … && git commit …` a échoué dès la préparation de l’index (sortie 128) : impossible de créer `/Users/manonwojciechowski/Projets/SNAKE 2975/.git/worktrees/codex-di7/index.lock`, `Operation not permitted`. Les métadonnées Git sont hors écriture dans ce bac. Aucun commit créé ; modifications laissées dans cette copie pour intégration, sans contournement.
