# 24/10/2026 · 13 h 45 (Paris) — codex-di6

Mis à jour à 13 h 46 (Paris).

Commande de reprise, depuis `proto-neon/` : **`node tools/jury2/verifier.mjs --statique`**.
Contrôle ciblé : `node tools/jury2/tests-oracle.mjs`.

L'étalon corrigé passe le contrôle du juré-oracle : **68 contrôles statiques réussis, 0 échec**.
Les reconstructions des trois paquets réels et d'un doublon atteignent **100 % des défauts retrouvés et 0 preuve introuvable pour chaque regard et chaque famille**, dans les deux passes. Aucun navigateur, serveur, modèle ou accès réseau sortant. Aucun seuil modifié.

## Défauts établis avant correction

Source de départ : commit `6d9c10f`. Reçu conservé : [`oracle-avant.json`](../jury2/oracle-avant.json).

| Contrôle nouveau | Avant | Après |
|---|---|---|
| Oracle sur les fixtures, cinq regards et deux familles | Échec : 3/4 sur la fixture `J-fixture0` ; le canari R-13 n'est pas qualifiable | Réussite : 4/4 sur chaque paquet, aucune preuve introuvable |
| Reconstruction des paquets réels | Échec dès `J-4ed1eb86` : `/sequences/S03/mesures/R13` non qualifiable | Trois reconstructions et doublon : 4/4 partout |
| Preuve sans rapport avec la case altérée | `/ordre` accepté comme défaut retrouvé : résultat 1 au lieu de 0 | Résultat 0 ; champ inexistant, case négative et temps hors fenêtre également refusés |
| Rejeu du JSON réel de X-gd | 1/4, dont le recul des temps effectivement crédité | 1/4, même crédit justifié ; aucun défaut supplémentaire inventé |

Les quatre paquets historiques ont aussi été relus sans modification : l'oracle honnête y trouve seulement **3/4** dans chacun des cinq regards, car il refuse de transformer la borne R-13 « non probante » en mesure qualifiée. Reçu : [`oracle-originaux.json`](../jury2/oracle-originaux.json). Ces originaux restent impropres au contrôle parfait demandé ; les nouvelles reconstructions corrigent l'étalon, pas les anciens verdicts.

L'ancien correcteur pouvait également laisser passer une citation de l'annexe non déclarée dans `fichiersInspectes`, dès lors que sa part de preuves introuvables restait sous le seuil. Ce cas est désormais testé explicitement, sans modifier le seuil de 20 %.

## Corrections et contrôles

- [`oracle.mjs:25`](../jury2/oracle.mjs:25) : observations déduites des JSON publics et des pixels RGB des cases PNG. La clé indique les pièces et le type à examiner ; ni ses descriptions, ni ses indices, ni ses fenêtres secrètes ne fournissent le texte ou les coordonnées des preuves. Un test remplace ces informations secrètes par des valeurs fausses et exige des verdicts identiques. Les anomalies d'intégrité restent dans `anomaliesDossier`, les défauts de jeu dans les défauts.
- [`oracle.mjs:64`](../jury2/oracle.mjs:64) : deux passes, cinq regards, juré-oracle, juré nul et tricheur. Les notes de test sont injectées pour éprouver l'instrument ; elles ne sont pas une évaluation esthétique ou humaine du jeu. Les constats de support citent les écarts réellement présents dans les tapis, sans inventer d'observation visuelle ni d'écoute.
- [`canaris.mjs:60`](../jury2/canaris.mjs:60), [`jure.mjs:70`](../jury2/jure.mjs:70), [`jure.mjs:202`](../jury2/jure.mjs:202) : sélection d'une mesure qualifiée avant le tirage des cibles. R-13 n'est candidate que si `qualifiable === true` et ses nombres sont mesurés. Sinon, R-14 est candidate lorsque sa part, son seuil, ses secousses et son nombre d'images sont disponibles. La contradiction visible devient `part = 1 > seuil = 0.12` mais `conforme = true`, avec `secouees = frames`. L'ancienne borne historique R-13 n'est jamais altérée pour fabriquer une qualification. Sans candidate, canari manquant explicite ; le contrôle l'interdit.
- [`etalonnage.mjs:93`](../jury2/etalonnage.mjs:93) : une citation de l'annexe en passe 1 invalide le verdict, même si le juré omet de déclarer son inspection.
- [`etalonnage.mjs:130`](../jury2/etalonnage.mjs:130) : reconnaissance d'une preuve par fichier et case/pointeur d'image altérée, ou fenêtre temporelle. Les événements des tapis sont localisés dans leur fenêtre ; les horloges sont converties avec leurs métadonnées. La consolidation exige aussi que la preuve soit résolue dans le paquet et dans la passe autorisée. Un champ d'annexe doit viser la mesure plantée ou un descendant exact, jamais une mesure voisine.
- [`tests-oracle.mjs:50`](../jury2/tests-oracle.mjs:50), [`verifier.mjs:111`](../jury2/verifier.mjs:111) : contrôles ajoutés à `--statique`. Montages et reconstructions sériels dans un dossier temporaire propre, supprimé à la fin. Les six types de canaris sont couverts par les fixtures. Les trois paquets réels conservent leurs graines de tirage et leur ordre ; les défauts de passe 1 restent identiques dans le contrôle d'accessibilité existant.
- Les anciennes fixtures de verdicts ne citent plus la passe 2 pendant la passe 1 ; leurs deux passes sont réunies pour compter les défauts. Le contrôle d'accessibilité conserve l'égalité stricte des canaris de passe 1 ; la passe 2 est contrôlée par qualification et observation publique, puisqu'elle doit changer de champ.

## X-gd : pourquoi 1 défaut sur 4

Paquet historique `J-4ed1eb86`, clé `cles/J-4ed1eb86.json` dans la copie `jury-etal` : quatre défauts distincts sont attendus (`temps-incoherent`, `decalage-rythme`, `mesure-contradictoire`, `image-gelee`). **Le recul des temps est déjà l'unique défaut crédité avant correction** ; ce n'est pas un défaut perdu par le correcteur.

Dans [`X-gd/J-4ed1eb86.p1.json:96`](/Users/manonwojciechowski/Projets/wt-snake/jury-etal/proto-neon/tools/jury2/verdicts/X-gd/J-4ed1eb86.p1.json:96), le constat est rangé dans `anomaliesDossier` et référence `a1`, `a2`, `a3`, `a4`. Ses preuves sont notamment :

```json
{"id":"a2","fichier":"S03/planche-vague-5.json","temps":null,"champ":"/images/6/w","observation":"Case 6 : w = 243.718, inférieur à la case précédente."}
{"id":"a3","fichier":"S03/planche-vague-5.json","temps":null,"champ":"/images/12/w","observation":"Case 12 : w = 371.734."}
```

Ces entrées sont aux [lignes 322 et suivantes](/Users/manonwojciechowski/Projets/wt-snake/jury-etal/proto-neon/tools/jury2/verdicts/X-gd/J-4ed1eb86.p1.json:322). La clé désigne précisément les cases 6 et 12. Le correcteur actuel les accepte par [`retrouverCanaris:147`](../jury2/etalonnage.mjs:147), sans exiger que les temps corrompus retombent dans leur fenêtre d'origine.

Les deux passes réelles ne rangent aucune preuve de défaut visant `S03/tapis-vol.*` ou `S05/planche-break-1.*` ; les autres anomalies de X-gd concernent d'autres pièces. Le défaut R-13 est non qualifiable par construction. Les quatre preuves `a1…a4` décrivent **un seul canari**, elles ne peuvent pas compter pour les quatre. Le test de non-régression conserve donc honnêtement le résultat **1/4**, avec le détail de chaque défaut dans les reçus.

## Mesures finales et portée

Reçus : [`oracle-apres.json`](../jury2/oracle-apres.json), [`verification-locale.json`](../jury2/verification-locale.json).

- Fixtures : trois rôles et doublon, cinq regards, deux familles ; tous les schémas et preuves conformes, 100 % des défauts retrouvés, aucun juré-oracle écarté.
- Réel reconstruit : `J-4ed1eb86`, `J-69cf5913`, `J-c053a476`, puis doublon renommé de la pointe ; mêmes résultats dans les 40 couples paquet × regard × famille, chacun en deux passes.
- Ancrage : 0. Discrimination injectée : V0 6, témoin 3, écart 3 ; témoin strictement sous 7. Doublon stable, accord de rang positif, chaque cellule conserve son oracle. Les contrôles des jurés gardent leurs seuils initiaux.
- Le nul retrouve 0 défaut et est écarté ; le tricheur est rejeté pour l'annexe en passe 1. La variante qui omet `fichiersInspectes` est également rejetée.
- Build temporaire : sortie 0, SHA-256 `3eaf75cf596e5e101d7b33d103eae98dca36ae83435afa3b4890618f684a4024`, identique au bundle reçu. `index.html` et les sources du jeu n'ont pas été modifiés. Aucun chiffre nouveau du jeu ; aucune modification de N.R ou des seuils de `protocole.mjs`.
- `git diff --check` : sortie 0.

Lot de correction et de vérification locale terminé. Pour solliciter de nouveaux jurés, l'orchestratrice doit intégrer ces changements et reconstruire les paquets depuis les bruts ; les paquets historiques n'ont pas été écrasés. Ce contrôle valide la cohérence de l'étalon sur les cas exercés ; il ne valide ni la qualité du jeu ni une nouvelle campagne de jurés humains/modèles.

**Commit local bloqué.** `git add -- proto-neon/tools/jury2 proto-neon/tools/codex-di6/rapport.md` a retourné 128 :

```text
fatal: Unable to create '/Users/manonwojciechowski/Projets/SNAKE 2975/.git/worktrees/codex-di6/index.lock': Operation not permitted
```

La tentative explicite `git commit --only -m 'SNAKE 2975 : valider le jury par oracle' -- proto-neon/tools/jury2 proto-neon/tools/codex-di6/rapport.md` a ensuite retourné 1 : le nouveau rapport ne peut pas être connu de Git puisque l'indexation a été refusée. Aucun commit créé, aucun contournement. Les fichiers restent prêts à relire et intégrer ; seule l'intégration Git exige un environnement autorisant l'écriture de l'index.
