# Banc jury2

24/10/2026 · 02 h 15 (Paris).


Mis à jour à 02 h 37 le 24/10/2026 (Paris).
Depuis `proto-neon/`, hors du bac :

```sh
node tools/jury2/verifier.mjs --navigateur --valider-instrument --carte /chemin/vers/structure.json
```

La carte attendue est la carte r1, schéma `{version, morceaux: {id: {barres,
drops, breaks}}}`. Une copie lisible existe dans le worktree `codex-r1`, sous
`proto-neon/tools/codex-r1/structure.json`. La pointe peut aussi l’intégrer dans
`musique/morceaux/structure.json` : ce chemin devient alors le défaut. Le banc
n’a aucune dépendance permanente envers un autre worktree.

Un essai réduit, explicitement incomplet :

```sh
node tools/jury2/verifier.mjs --navigateur --valider-instrument --graines 1 --sans-aventures --sans-performance --carte /chemin/vers/structure.json
```

Sans `--navigateur`, `verifier.mjs` fait uniquement les contrôles locaux, le build
et la construction du témoin. Il ne lance jamais de serveur ni de navigateur.
Les modules sont importables sans effet de bord. Aucun accès réseau sortant.

Le banc prend atomiquement le verrou répertoire
`/tmp/snake-chromium-chef.lock`. Si le verrou existe, il s’arrête sans le supprimer.
Un seul Chrome headless `channel:'chrome'`, muet, tient les trois profils en série.
Les fichiers de sortie sont nouveaux et refusent l’écrasement. Un arrêt conserve
les blocs `collecte.ndjson.gz`, les tampons et les frames CDP déjà reçus.

Le plan normal joue les quatre pilotes, dix graines chacun, sur trois profils,
puis une fenêtre musique seule, les deux aventures sur chaque profil, neuf
fenêtres de performance et trois stress R-13. Le premier seed de chaque pilote
est filmé ; tous les seeds ont mesures et journal. Les séquences appartiennent
à une même empreinte de build. Aucune accélération du temps : rAF et horloge
audio réels, sans `__DT`, sans simulation du jeu. Ce banc ne remplace donc pas
la référence des 80 parties simulées et ne revendique pas leur identité.

Le témoin est construit sur les mêmes sources dans un répertoire temporaire :
canal musical public coupé, portails retardés par un générateur indépendant.
Il conserve la signature de `N.ennemis.spawn` et le générateur du vrai jeu.
`--valider-instrument` exécute les deux dossiers en série dans le même Chrome.
La preuve exige simultanément une baisse de sortie musicale et une perte de
synchronisation des apparitions réellement présentes. Une pointe déjà
désynchronisée peut échouer à ce test : on garde cet échec et ses valeurs.
Les seuils sont figés dans `protocole.mjs`, avant toute prise.

Les paramètres de caméra, d’échantillonnage et les fixtures sont des paramètres
d’instrument hors jeu. Aucun chiffre de gameplay n’est ajouté. Les seuils R-13,
R-14 et performance sont lus dans `N.R` de la build. Les portes nouvelles de
rythme/difficulté sont celles d’`INCROYABLE.md`, sans nouvelle valeur choisie.
Le dossier `tools/jury2/` est le seul périmètre modifié (hors reconstruction
autorisée de `index.html`). Aucun commit.

La présence d’un dossier ne signifie ni validation du jeu, ni réussite du jury.
Une source, une vidéo courte, une carte absente ou une aventure inachevée restent
des limites publiées. Safari réel, écoute et évaluation de qualité par des jurés
indépendants demandent leurs propres reçus.
