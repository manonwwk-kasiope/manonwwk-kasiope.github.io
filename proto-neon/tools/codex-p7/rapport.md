# codex-p7 — CONTINUER ? / R-18

18/10/2026 · 01 h 25 (Paris), mis à jour à 01 h 27.

**Commande navigateur, à lancer hors bac :**

```sh
cd proto-neon && node tools/codex-p7/verifier.mjs
```

Cette commande prépare une copie temporaire, y applique `raccord-jeu.patch`, reconstruit le bundle, sert cette copie sur un port libre et vérifie les trois profils en série. Un seul Chromium muet est ouvert à la fois. Après les captures et parcours, elle ferme ce navigateur avant de lancer séquentiellement les critères officiels R-18 et R-35 avec le banc commun. Sorties : `tools/codex-p7/navigateur/`. Aucun lancement HTTP ni Chromium tenté ici, conformément au cadre fourni.

**Statut : implémentation livrée et logique vérifiée en VM ; intégration et palier navigateur en attente.** Le fichier réservé `src/79-jeu.js` est intact : son raccord est livré dans [raccord-jeu.patch](raccord-jeu.patch). Le `index.html` reconstruit dans ce worktree contient les modifications des modules attribués, mais ne peut reprendre CONTINUER avant l'intégration de ce correctif. Les preuves de la mécanique complète ci-dessous utilisent exclusivement la copie temporaire avec raccord appliqué. Aucun commit.

Ce qui est fait :

- `80-ecrans.js` dessine deux cibles distinctes dans la zone sûre : CONTINUER ? avec décompte 9 → 0, puis désactivation ; REJOUER. Zéro reste affiché et sélectionnable durant sa seconde. Une victoire, une continuation déjà consommée ou un délai expiré refusent la reprise. Un toucher hors cible ne relance rien. Les dates de toucher transmises par le raccord refusent aussi le doigt posé avant la garde. Entrée/Espace conserve REJOUER par défaut ; 1/2 et flèches permettent les deux choix.
- `77-score.js` porte l'API publique `continuerPossible`, `continuer`, `marque` et `classement`. Une continuation remet le score à zéro et donne trois vies ; la prochaine fin persiste le score marqué C. Les scores numériques historiques restent compatibles ; les marques sont conservées par rang dans `marquesRecords`. L'énergie déjà attribuée n'est pas créditée une deuxième fois, et `terminer` est idempotent.
- Le raccord mémorise à chaque entrée de vague et du CYCLOPE longueur, armes et pouvoir. Il reprend directement la vague ou le boss, restitue longueur et armes, conserve les cartes sans les rejouer, nettoie les dangers et rend l'arène par ses interfaces publiques. Aucun champ privé d'un autre module n'est lu ou écrit. Il n'appelle pas le reset de partie lors de CONTINUER.
- Les nouvelles constantes de disposition et la conversion des dates des touchers sont ajoutées dans `N.R.ecrans.fin.actions` et justifiées dans la section codex-p7 de `refonte/lots/demandes.md`. Tous les chiffres de la règle de continuation préexistants sont réemployés. Les icônes du build sur l'écran de fin utilisent désormais l'os, pour respecter la réservation du cyan à la joueuse. Les nouveaux boutons restent fixes, sans flash ni clignotement.

**Mesures avant/après — sources des valeurs :** [avant.json](avant.json), [statique.json](statique.json), et le diagnostic R-18 fourni dans `tools/mesure/DIAGNOSTIC-ECHECS.md`.

| Mesure | Avant | Après, avec raccord temporaire |
|---|---|---|
| CONTINUER | absent dans le diagnostic ; API `undefined` dans la VM de HEAD 15a196a | reprise V3 → jeu et CYCLOPE → boss, joueuse vivante |
| Longueur | aucune reprise proposée | 13 au début, croissance supplémentaire en cours de vague, reprise à 13 dans les six parcours de continuation |
| Cartes / armes | aucune reprise proposée | identiques au point de départ dans les six parcours ; grappe et bouclier inclus dans les prises |
| Score / vies | aucune reprise proposée | score 0, trois vies ; score suivant 2345 persisté avec marque C et rechargé sans perte de marque |
| Seconde continuation | non applicable | offre, toucher et API refusés, sur vague et boss |
| Décompte | absent | suite exacte 9,8,7,6,5,4,3,2,1,0 ; refus après la seconde de zéro, dans les trois profils |
| Cibles, géométrie VM | REJOUER seul | paysage 300 × 44 pt, portrait 180 × 44 pt, bureau 600 × 44 pt ; séparées et contenues dans les marges explicites de test |
| REJOUER → jeu, joueuse vivante | 0,8166666666666662 s dans les trois profils | 0,8166666666666662 s dans les neuf parcours ; aucun passage briefing/ouverture |
| Erreurs du jeu | `__ERR.count = 0` dans les trois mesures avant | `__ERR.count = 0` et console VM vide dans les neuf parcours |

La VM a été calibrée **avant** ces conclusions : [calibration.json](calibration.json) reproduit exactement dix parties du commit e1bdc6f, soit cinq pilotes (inerte, tourneur, maladroit, kamikaze, humain), graines 1 et 2. Comparaison stricte du temps de jeu, de la vague, du score, de la raison d'arrêt et des erreurs avec `tools/pilotes/sortie.json`. Le protocole des parties est celui demandé : stockage vide, jour fixé, réglages, skip, reset plongée, pilote, journal, amorçage de l'horloge puis tranches de 0,25 s. Le chargement VM reproduit en plus le reset de boot préalable à ce protocole.

**Essais non concluants conservés :** un premier lancement a quitté avec sortie 1 (`TypeError` sur `gfx.resize`) : la lecture du tree Git depuis le sous-dossier renvoyait une liste vide ; la requête est désormais faite depuis la racine du dépôt.  [calibration-initiale.json](calibration-initiale.json) contient les quatre divergences initiales sur dix cas. Par exemple inerte/1 donnait 25,366666666665868 s au lieu de 25,291666666665872 s ; kamikaze/1 donnait vague 2, score 12850 au lieu de vague 1, score 640. La correction de l'amorçage de la VM a supprimé ces divergences sans toucher aux sources e1bdc6f ni aux valeurs attendues. Une exécution des parcours enrichis a ensuite été interrompue par le processus Node, sortie 139, après les deux cas paysage réussis : aucune cause système n'est établie. Le lanceur exécute désormais chaque VM dans un processus séparé, strictement en série ; la passe finale a terminé avec sortie 0, neuf parcours et **222 contrôles réussis** ([statique.json](statique.json)).

Commandes exécutées :

```sh
node proto-neon/tools/codex-p7/calibrer.mjs
node proto-neon/tools/codex-p7/avant.mjs
node proto-neon/tools/codex-p7/statique.mjs
node --check proto-neon/tools/codex-p7/verifier.mjs
git apply --check proto-neon/tools/codex-p7/raccord-jeu.patch
git diff --check
cd proto-neon && node build.mjs
```

Sortie 0 pour la calibration finale, la mesure avant, les parcours finaux, les vérifications de syntaxe/correctif/diff et le build. Build principal : 34 modules, 1 854 012 octets. `statique.mjs` construit aussi le candidat temporaire avant de le tester.

**Reste et dépendances :** la cheffe d'orchestre doit relire puis intégrer le raccord dans `79-jeu.js` avec le lot codex-05b, reconstruire et lancer la commande navigateur ci-dessus hors bac. Les pixels des libellés, les captures, les véritables interactions tactiles/souris et les verdicts des critères officiels R-18/R-35 restent **à vérifier**, sans réussite inventée. Le script contrôle leur sortie réelle ; les textes sont comparés aux pixels du tampon, et les états/journaux des parcours sont enregistrés. Une recette Safari sur iPhone réel reste nécessaire après Chromium émulé. La VM vérifie des dimensions et des marges explicites ; elle ne mesure ni les env CSS de Safari, ni ses performances. TITRE et les initiales ne sont pas développés dans cette mission.
