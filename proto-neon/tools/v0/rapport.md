18/10/2026 · 12 h 05 (Paris) — mis à jour à 12 h 06.

Commande à exécuter **hors bac, depuis la racine du dépôt** :

```sh
node proto-neon/tools/v0/verifier.mjs
```

Le reçu réel sera `proto-neon/tools/v0/navigateur/resultats.json` ; captures et journaux dans les sous-dossiers `iphone-paysage/`, `iphone-portrait/` et `bureau/`. Aucun résultat navigateur ni capture n’a été fabriqué ici.

**Préparation livrée ; sortie de la VERSION 0 non validée. Contrôle navigateur bloqué dans ce bac** par les interdictions de serveur local et de lancement Chromium signalées dans la mission. Aucun `listen()`, navigateur ou accès réseau sortant n’a été tenté. La cheffe peut lancer le contrôle ci-dessus hors bac et examiner les réserves de raccordement ci-dessous.

## Livrables et preuves exécutées

- [inventaire.mjs](inventaire.mjs) : inventaire récursif des médias, SHA-256, sites `fichier:ligne`, appels littéraux, tables de dispatch par personnage, chargements et fichiers sans déclenchement retrouvé. Sortie [inventaire.json](inventaire.json). L’analyse ignore les commentaires et distingue déclaration, chargement et utilisation. Les appels dynamiques non résolus sont conservés ; un chemin ancien ou conditionnel ne prouve pas sa joignabilité depuis le titre.
- [verifier.mjs](verifier.mjs) : script Playwright complet, importable sans effet ; `channel: 'chrome'`, `--mute-audio`, profils temporaires supprimés en fin de passage, un seul Chromium à la fois. Serveur HTTP depuis la racine, port libre, types MIME et requêtes Range, confinement des fichiers servis. Les requêtes de la page hors de l’origine locale sont bloquées et font échouer le contrôle.
- [temoin.mjs](temoin.mjs) : copie temporaire des sources et médias, build sain, renommage de `boss.mp4`, nouveau build puis passage par la même porte de précontrôle du vérifieur. La copie est supprimée. Reçu [node/temoin.json](node/temoin.json).
- [controle-node.mjs](controle-node.mjs) : recette locale reproductible pour syntaxe, import inerte, `node build.mjs`, inventaire, précontrôle et témoin. Reçu [node/preuves.json](node/preuves.json), journal [node/build.log](node/build.log).

Relancer les seules preuves locales :

```sh
node proto-neon/tools/v0/controle-node.mjs
```

## Mesures avant / après

Sources : `node/preuves.json`, `inventaire.json`, `node/temoin.json`. « Avant/après » désigne l’état reçu puis reconstruit, sans modification du jeu ; aucun gain de gameplay ou de pixels n’est annoncé.

| Mesure | État reçu | Après préparation |
|---|---:|---:|
| Vidéos présentes / noms CLIPS | 50 / 50 | 50 / 50 |
| Images dans `art/`, sous-dossiers compris | 335 | 335 |
| Fichiers audio dans `musique/` | 53 | 53 |
| Sons synthétisés du moteur / voix du moteur | 51 / 6 | 51 / 6 |
| Recettes / voix de bibliothèque hors bundle | 48 / 12 | 48 / 12 |
| Références média sans fichier retrouvées | 0 | 0 |
| Vidéos dont le nom est absent de CLIPS | 0 | 0 |
| Fichiers sans déclenchement retrouvé | 314 | 314 |
| Syntaxe des scripts et import du vérifieur | pas de banc v0 | code 0 |
| Build réel `node build.mjs` | bundle reçu | code 0, bundle identique |
| Témoin sain / vidéo renommée, dans la copie | code 0 | code 1 attendu |
| Vidéos décodées, images/audio décodés, pixels | non mesurés ici | à vérifier hors bac |
| Partie complète, REJOUER et parcours tactile | non mesurés ici | à vérifier hors bac |

SHA-256 des sources avant = après : `293ec8e75189b9ead75a525537b8e0a1caf30ab4f607282116bdcfa7d2f9e8dc`.

SHA-256 du bundle avant = après : `57bb0d1089f28178c98b6cb8cc6dbeed1407ddd780732d01d1b1292cb42fc9ac`.

Les 80 parties n’ont pas été rejouées ; aucune parité mesurée n’est revendiquée. Aucune VM de logique du jeu n’a été utilisée : les VM locales lisent seulement des tables déclaratives et des bibliothèques de recettes, sans simulation.

## Réserves de raccordement

Trois vidéos n’ont aucun appel de lecture retrouvé :

- `cine/affiche.mp4` : le titre lance `affiche-duo` (`src/80-ecrans.js:273`). Le PNG `affiche` sert encore de repli (`src/80-ecrans.js:279`), ce qui ne lance pas son ancien film.
- `cine/amiral-elle.mp4` et `cine/amiral-lui.mp4` : déclarées dans `src/05-art.js:36`, mais aucune étape correspondante dans le voyage de `src/64-aventure.js`. Le vaisseau amiral procédural de `67-cosmos.js` n’appelle pas ces vidéos.

Le patch [raccord-64-aventure.patch](raccord-64-aventure.patch), **non appliqué aux sources de cette copie**, ajoute un film `amiral`, résolu selon le personnage, après `espace` et avant l’époque cosmique. Il réemploie la durée et les gardes existantes de `N.film`, sans chiffre nouveau. Preuve : application effective du fichier patch dans la copie temporaire, puis build code 0 ; les vidéos sans `play` passent de trois à une, l’ancienne `affiche`. **Cette preuve est statique : position narrative, progression, rendu et saut du nouveau film restent à vérifier.** Aucun raccord de l’ancienne affiche n’est imposé à la place du titre duo.

Les autres fichiers sans déclenchement retrouvé sont détaillés dans l’inventaire : 283 PNG sous `art/decor`, `art/interface` et `art/sprites` hors injection `ART_SRC` du build ; deux PNG `amiral` chargés mais sans affichage retrouvé ; 26 MP3 sous `musique/brut`, sources de fabrication. Avec les trois vidéos ci-dessus, cela donne 314 fichiers. Le dessin procédural d’un sprite ou d’un décor ne constitue pas une lecture du PNG homonyme.

Les fichiers audio se répartissent en 21 blocs, six morceaux longs et 26 sources brutes. Les sites de chargement sont `src/30-music.js:2024` et `src/30-music.js:2189`, avec les catalogues et sections associés dans l’inventaire. Les recettes `sons/banque.js` et `sons/voix.js` sont hors bundle ; elles sont listées séparément des sons effectivement définis par `30-music.js`.

## Ce que le passage navigateur mesurera

Sur iPhone 13 émulé paysage 844 × 390, portrait 390 × 844, puis bureau 1440 × 900 :

1. Chaque clip CLIPS appelé par le vrai `N.art.play`, sans remplacer ce lecteur : `videoWidth`, temps qui avance, pixels non noirs dans l’image vidéo décodée, puis image quantifiée différente du PNG de secours. Le sprite est posé dans le vrai tampon `N.gfx.buf()` ; les pixels posés sont comparés, les indices hors palette comptés, et une capture est enregistrée pour chaque clip.
2. Chaque PNG et MP3, y compris les fichiers de fabrication, reçu en HTTP 200 puis réellement décodé, en série. Dimensions pour les images ; durée, canaux, échantillons et pic PCM pour l’audio. Les PNG de premier niveau doivent aussi être décodés par `N.art`. Le décodage forcé du banc reste distinct d’un déclenchement naturel dans le jeu.
3. Démarrage → titre → choix réel de LA PILOTE → film de connexion, sauté par un vrai toucher/clic après sa garde de 300 ms → terminal 1976. États, pixels et journal du film prouvent le saut. Aucun `skip()` ne remplace ce toucher.
4. Une partie néon complète par profil avec le pilote contractuel `N.R.ecrans.attraction.pilote` (`bon` dans les sources reçues), graine 1, stockage vierge, jour 20261017 et protocole de `tools/pilotes/parties.mjs` : départ plongée, amorçage `N.horloge.avancer()`, tranches `dbg.simuler(0.25)`, sans saut de séquence jusqu’à `fin`. Journal complet conservé. Ensuite, arrêt du pilote, vrai toucher/clic sur le rectangle public REJOUER, contrôle du retour au jeu et remise à zéro du score. Les captures simulées reprennent l’ordre public de dessin du boot, notamment fond de fin avant le bilan.
5. Zéro `window.__ERR.count`, zéro erreur console/page, aucun échec HTTP ou sortie réseau non autorisée. Le reçu partiel est sauvegardé après chaque média et étape ; un échec conserve son observation réelle. Le témoin négatif Node est relancé automatiquement avant le navigateur.

Les bornes du banc sont regroupées dans `BANC` : 30 s par attente/décodage, interrogation à 100 ms, avancement vidéo supérieur à 0,2 s et luminance moyenne RGB supérieure à 16 pour exclure le fond quasi noir. Les bornes de partie, 540 s de jeu et secours à quatre fois ce temps simulé, viennent du protocole existant. Ce sont des paramètres de vérification dans `tools/v0/`, aucune règle chiffrée du jeu n’a été changée.

## Reste à faire et portée du verdict

La cheffe doit exécuter le passage navigateur, examiner les captures et traiter les trois films sans lecture retrouvée (raccord ou statut explicite d’archive). Le patch livré ne se prétend pas validé par un navigateur.

Un succès technique du script ne prouve ni la joignabilité de tous les anciens chemins depuis le titre, ni les deux aventures complètes jusqu’à la scène commune, ni la qualité artistique, ni les flashs en situation réelle. Chrome avec émulation iPhone ne remplace pas Safari iOS : la vérification sur l’iPhone de référence reste distincte.

Aucun `src/`, règle, demande inter-lot ou réglage du jeu n’a été modifié. `index.html` a été reconstruit conformément à la mission, sans différence binaire. Aucun commit.
