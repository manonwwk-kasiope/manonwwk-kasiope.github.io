Commande hors bac : `cd proto-neon && node tools/codex-p36/verifier.mjs`

# codex-p36 — R-04 mesure les véritables arrivées au CYCLOPE

18/10/2026 · 05 h 19 (Paris), mis à jour à 05 h 19.

**Livraison locale terminée. R-04 reste en échec ; contrôle navigateur à vérifier hors bac.** Aucun commit, serveur, Chromium, SSH ou réseau sortant. Aucun fichier `src/` modifié. Le script Playwright complet est prêt, sa syntaxe et son import sont vérifiés ; il n'a pas été exécuté dans ce bac.

## Ce qui est corrigé

- **Arrivée** : `phase/arrivee`, événement émis par le module du boss. Aucun repli sur `alerte`, `panneau`, `boss`, ni même une entrée en phase supposée équivalente. `entreeCyclope` donne l'instant global de cette arrivée.
- **Médiane de fin** : toutes les parties terminées, victoires comprises, à l'horloge globale. Même fonction `medianeFins` dans R-04 et le banc ; un lot censuré ou une durée manquante donne non mesurable. Les seuils 45–150 et 120–210 s restent identiques. `gameOver` conserve sa signification de diagnostic des seules défaites ; il n'alimente plus cette médiane.
- **Morts et coups** : le `t` du journal global a priorité sur le `t` de leur charge ; ce dernier est publié sous `tempsCombat`. Les comparaisons avec les phases et vagues emploient ainsi la même horloge. Les reçus restent intacts.
- **Combat** : première `phase/entree n=1` → `phase/mort`, répits compris ; l'arrivée ne commence pas ce chronomètre. Une victoire sans marqueur de mort rend la durée officielle non mesurable. `combatCyclopeJusquaVictoire` (banc : `combatJusquaVictoire`) publie séparément la borne alternative jusqu'à `section/victoire`, sans substitution.
- **Inerte** : seuil strict **avant 11 s**, décision de la cheffe du 18/10 à 05 h 11. `(1021−389,12)/68 = 9,29235 s` de trajet nu, avant grâce au mur et plongée : 8 s était intenable (p34 §3.2). Aucun autre seuil ne change.

La consigne spécifique « aucun fichier src » est respectée. **N.R contient encore 8** sur cet état reçu : le report de la décision est demandé à son propriétaire dans [demandes.md](../../refonte/lots/demandes.md), avec [patch prêt](raccord-02-regles.patch). Les deux instruments partagent une migration transitoire 8→11 ; une valeur future différente de N.R reste prioritaire. Il ne s'agit pas d'une modification de vitesse, position ou mort du jeu. Les anciens générateurs de rapports p5 doivent aussi adopter les nouveaux libellés et la clé `inerte.mur11` ; ils sont hors mission et n'ont pas été lancés.

## Preuves avant/après

Sources : les **40 reçus Chromium paysage de batterie-318ce61**, huit pilotes × graines 1–5, jamais rejoués. Chaque reçu garde son chemin et son SHA-256 dans [relecture-318ce61.json](relecture-318ce61.json). Les fonctions réelles `mesurer`, `lot`, `resumer` s'exécutent sur un adaptateur de sessions qui retourne ces observations ; aucune fonction de navigateur ni simulation n'est exécutée. L'instrument avant est conservé intégralement dans `avant/` et son résumé est vérifié identique au commit 318ce61. Chaque mesure R-04 avant reproduit exactement le JSON publié, y compris ses bornes non arrondies.

| Pilote | Accès avant | Arrivées réelles après | Victoires |
|---|---:|---:|---:|
| inerte | 1/5 | 0/5 | 0/5 |
| tourneur | 0/5 | 0/5 | 0/5 |
| maladroit | 1/5 | 0/5 | 0/5 |
| kamikaze | 5/5 | 0/5 | 0/5 |
| humain | 5/5 | 5/5 | 4/5 |
| bon | 5/5 | 2/5 | 2/5 |
| expert | 5/5 | 3/5 | 3/5 |
| dieu | 5/5 | 5/5 | 5/5 |

- Humain : **425,03792 s avant** (une défaite) → **408,86083 s après** (cinq fins). Le banc et le critère donnent la même médiane sur chaque pilote.
- Première mort inerte : **10,175 s globale**, **9,366666667 s de combat**, par mur sur les cinq reçus. Avant : 0/5 sous 8 s ; après : 5/5 sous 11 s. Ces valeurs Chromium diffèrent du 10,18333 s VM p34 : aucune valeur de p34 n'est substituée aux reçus.
- Tableau complet : [les 20 cibles avant/après](vingt-cibles.md), [données](vingt-cibles.json). **6 tenues / 14 échecs avant ; 10 tenues / 9 échecs / 1 non mesurable après.** Ces quatre cibles reclassées et le combat indéterminé ne constituent pas une amélioration du jeu.
- R-04 : [avant](R-04-avant.json) **11 ok, 10 échecs, 7 indicatives hors cible** ; [après](R-04-apres.json) **15 ok, 5 échecs, 7 indicatives hors cible, 1 non mesurable**. Ce nombre de lignes inclut des indicateurs et diffère des vingt B, réparties entre R-04, R-15 et R-34.
- R-15 et R-34 : relecture identique à leurs reçus publiés et strictement identique avant/après ([preuves](criteres-inchanges.json)). Leurs défauts propres signalés par p34, dont la mesure des pics et les plages LASSO, ne sont pas traités par cette mission.
- **Zéro erreur : 40/40 reçus** (`erreurs.zero=true`), instrument sans exception au contrôle final. Cela ne préjuge pas des nouveaux essais navigateur.

## Cas construits et contrôles

[19 cas construits](cas-construits.json), tous conformes : film V1→V2, états génériques sans événement, vraie arrivée avant le combat, entrée seule, victoire, défaite, victoire journalisée entre échantillons, début/fin de combat distincts, marqueur absent, deux horloges, mort après arrivée/V2, médianes paire/impaire, censure, durée absente, seuil strict et N.R futur. Le vrai R-04 est également exercé sur des données fictives : quatre victoires à 350 s et une défaite à 150 s donnent **350 s après, 150 s avant** ; une mort exactement à 11 s est refusée même si sa charge de combat indique 1 s. Ces cas sont des oracles fictifs, jamais présentés comme des parties réelles.

Commandes locales exécutées : `node tools/codex-p36/rapport.mjs`, `node tools/codex-p36/cas-construits.mjs`, contrôles `node --check`, import de `playwright`, `node build.mjs` (**sortie 0, 39 modules**), `git diff --check`. [Vérification finale](verification-finale.json) : les 39 sources et `index.html` sont strictement identiques à HEAD reçu `0ac28eb76550033717647d4486ece94b09709a20` ; les changements portent uniquement sur l'instrumentation et ce dossier. Aucune nouvelle partie VM n'est nécessaire pour comparer un jeu dont les octets n'ont pas changé ; aucune VM de jeu n'est utilisée, donc aucune calibration de VM n'est revendiquée. Le chargement habituel des seules tables de règles par `reglesNode` ne simule pas de partie.

Incidents d'outillage corrigés : une première comparaison arrondissait à tort aussi les métadonnées min/max (538,61875 contre 538,6187500461235 dans le reçu) ; la comparaison finale porte sur les objets exacts, sans tolérance. La première création du vérifieur avait un chemin doublé à cause du dossier courant ; le fichier a été créé au bon emplacement puis sa syntaxe vérifiée. Aucun de ces incidents n'a modifié un seuil ni été compté comme un essai de jeu réussi.

## Ce qui reste

1. Le propriétaire de N.R reporte 11 s, et les générateurs de rapports p5 adoptent le libellé et les champs cohérents ; demandes précises et patch fournis.
2. Le raccord de `phase/mort` du CYCLOPE reste à examiner par les propriétaires des sources. Sur les cinq victoires dieu fournies, **0/5 combats officiels mesurables** : ce résultat reste indéterminé.
3. La cheffe lance la commande en tête et retourne `navigateur/resultats.json` : 40 parties paysage, puis huit portrait et huit bureau, un Chromium muet et une seule page à la fois ; états, journaux, vrais tampons et captures sauvegardés. Le script produit R-04 avant/après sur les mêmes nouvelles observations. Les proportions sur cinq graines restent exploratoires ; Safari réel et cinquante graines constituent des qualifications distinctes.

Le correctif local et les preuves demandées sont livrés. La qualification navigateur du lot reste à vérifier hors bac ; le chantier de difficulté n'est pas déclaré achevé.
