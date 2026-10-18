# Ordre14 — correctif réservé à l’intégration par Claude

Le vrai src/50-fx.js n’est pas modifié par la boîte. Le correctif raccord-50-fx.patch est contre la base inscrite dans base.json, appliqué à apres-50-fx.js puis au bundle après en mémoire. L’ajout src/02-regles.js doit accompagner le correctif pour activer le budget. Aucun bloc de flash n’est modifié. Si la pointe50 a changé pendant p35/p38, rebaser seulement ces petits blocs de secousse, sans remplacer le fichier entier.

Depuis la racine du dépôt, avant application autorisée par la cheffe :

```
git apply --check --directory=proto-neon proto-neon/tools/codex-12/secousses/raccord-50-fx.patch
```

Le vérificateur utilise les bundles figés avant/après, même base. Depuis proto-neon :

```
node tools/codex-12/secousses/verifier.mjs
```

Il prend lui-même /tmp/snake-chromium-chef.lock par mkdir, attend zéro headless_shell et aucune boîte, ouvre un seul Chromium muet, puis libère uniquement son propre témoin/son verrou. Il déroule R14, R12 et R13, trois profils, avant puis après. Les seuils et modes complets restent ceux des instruments copiés. Sorties : chromium-avant/, chromium-apres/, chromium-execution.json. Un code1 signifie aussi critère échoué, à lire avant de relancer ; ne pas confondre avec un plantage. `--seulement R14` est une portée partielle explicite, sans mode rapide.

Si la commande passe par file-verifs.sh (qui a déjà acquis le verrou Chef), ajouter impérativement `--verrou-detenu` ; le script ne retire alors jamais le verrou de l’appelant. Ne pas utiliser ce drapeau sans être son détenteur. Ne pas lancer un deuxième vérificateur sur la même sortie. Vérifier PID/états réels et attendre sa fin avant reprise. La boîte ne lance pas ce navigateur pour cet ordre.

Pour le retour arrière, annuler seulement le correctif caméra, après vérification `git apply --check -R` sur la version réellement intégrée ; aucun reset/stash/écrasement des autres travaux. L’ajout02 est inerte avec l’ancien50. Les preuves VM ne constituent ni une qualification du rendu de cette intégration future ni une validation globale des effets/R13.

Les reçus de parties et captures sont isolés par profil dans chromium-avant/profils/ et chromium-apres/profils/. Les rapports de critères restent à la racine de chaque phase. Le profil effectif est attesté dans profil-reel.json : le critère R14 copié ne transmet pas son profil à lot(), donc son champ params peut conserver une valeur implicite paysage. Les dossiers distincts empêchent toute réutilisation de parties paysage pour portrait ou bureau. Cette correction du contrôleur précède toute exécution Chromium de ce lot.
