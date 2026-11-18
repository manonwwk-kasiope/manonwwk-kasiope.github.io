# Livrer SNAKE 2985 · campagne panoramique

18/11/2026 · 01 h 52 (Paris)

La campagne comprend **1976, 1985, 1995, 2185 et 2985**. La page source est [la chambre](../labo/campagne/index.html). L’assembleur en tire un dossier autonome destiné à `/snake-2985/`. Pour une vérification silencieuse, ouvrir la page avec `?muet=1` dès la première navigation.

## Préparer et éprouver le paquet

Depuis la racine du dépôt, dans le même terminal et avec les dépendances locales déjà installées :

```sh
jeu="snake 2985"
dist=$(mktemp -d)
node "$jeu/labo/livraison/preparer.cjs" "$dist"
node --test "$jeu/labo/tests/moteur.cjs" "$jeu/labo/tests/forge-vol.cjs" "$jeu/labo/gardiens/gardiens.cjs" "$jeu/labo/audio/test-bande-campagne.cjs"
```

Conserver le JSON imprimé par l’assembleur : `edition`, nombre de fichiers, nombre de scripts, cinq MP3 et chemin du dossier. Le dossier de sortie doit être absolu et vide. Publier **son contenu**. Le `sw.js` généré porte les empreintes des ressources de cette édition. [Assembleur](../labo/livraison/preparer.cjs) · [Construction du worker](../labo/livraison/worker-build.cjs)

Pendant un créneau navigateur, enchaîner ces parcours silencieux. Les deux premiers servent **le paquet du terminal précédent** sur une adresse de boucle locale. Le dernier reconstruit ses propres éditions et vérifie la migration, le redémarrage hors connexion et la réutilisation du cache.

```sh
node "$jeu/labo/livraison/interface.cjs" "$dist"
CAMPAGNE_DIST="$dist" CAMPAGNE_PASSE="livraison-$(date +%Y%m%d-%H%M%S)" node "$jeu/labo/bout-en-bout/recette.cjs"
node "$jeu/labo/livraison/hors-ligne.cjs" --browser --browser-reuse
```

Le premier parcours doit ouvrir les cinq aperçus, maintenir les dates verrouillées, permettre pause/reprise, signature du score et téléchargement de la carte souvenir PNG de 960 × 520. Le second exige un nom de passe inédit et conserve le journal, les captures et `resultat.json` sous [preuves](../labo/bout-en-bout/preuves). Pour le seul banc de cache Node, lancer `node "$jeu/labo/livraison/hors-ligne.cjs"` sans option. [Parcours d’interface](../labo/livraison/interface.cjs) · [Parcours de campagne](../labo/bout-en-bout/recette.cjs) · [Banc de cache](../labo/livraison/hors-ligne.cjs)

## Ce que les reçus locaux établissent

| Portée | Résultat observé |
|---|---|
| Campagne jouée en WebKit | Les cinq années ont été gagnées, les dix boss vaincus et les cinq scores signés conservés après rechargement. Le nouveau cycle repart réellement en 1976. [Rapport](../labo/bout-en-bout/rapport.md) · [Résultat de la passe 02](../labo/bout-en-bout/preuves/passe-02/resultat.json) |
| Safari standard, iPhone 17 simulé, iOS 27.2 | L’édition locale `64449e40c5ded7cc` passe le départ silencieux, la pause, le palmarès, la défaite, le rejeu de la trajectoire et l’entrée en 1995. L’édition `e3ea0cc4b6a226bc` a aussi été ouverte depuis l’écran d’accueil en mode app web. [Parcours XCTest](../labo/qa-ios/recette.json) · [Preuve en mode autonome](../labo/plein-ecran-ios/preuve.json) |
| Migration et PWA | Le banc Node conserve les scores et les échos des quatre dates historiques, puis ajoute 1995. Le reçu Chromium couvre un redémarrage hors ligne et les réponses partielles des médias. Chaque reçu nomme l’édition testée. [Migration et mises à jour interrompues](../labo/livraison/hors-ligne-maj-node.json) · [Essai Chromium](../labo/livraison/hors-ligne-chromium.json) |
| Audio | WebKit a décodé les cinq MP3 et rendu les deux canaux en mémoire. Le verrou URL est testé au niveau du lecteur, y compris après une tentative d’activation. [Rendu hors sortie](../labo/audio/hors-sortie.webkit.json) · [Test du lecteur](../labo/audio/test-bande-campagne.cjs) |

## Recette finale sur l’URL publique · à compléter

Cible de contrôle : [ouvrir la campagne publique en silence](https://manonwwk-kasiope.github.io/snake-2985/?muet=1). Reporter les reçus de la révision effectivement servie dans les cases suivantes. Les essais Safari locaux ci-dessus ont été conduits sur simulateur.

| Contrôle | Attendu | Reçu final |
|---|---|---|
| Identité de l’édition | Date et heure de Paris, SHA du commit publié, `edition` du worker, comparaison SHA-256 des fichiers HTTP avec le dossier préparé | À renseigner |
| Médias et hors-ligne | Cinq MP3 complets vérifiés ; une plage d’octets demandée sur chacun renvoie 206 avec le bon contenu. Après installation du worker, la page redémarre hors ligne. | À renseigner |
| Safari public | URL avec `?muet=1`, paysage, jeu, pause/reprise, palmarès et passage en 1995. Préciser modèle, version iOS, appareil physique ou simulateur, résultat XCTest et emplacement des captures. | À renseigner |
| Retour arrière | Identifier le commit de livraison et la révision publique précédente. En cas de retrait, rétablir uniquement `/snake-2985/` depuis celle-ci et vérifier l’édition servie. | À renseigner |

## Témoin historique à quatre époques

Le [témoin conservé](../labo/livraison/temoin-4-epoques/index.html), le [reçu HTTP du commit edc50ef7](recette-http-quatre-epoques.json) et le [premier parcours Safari public](safari-iphone.json) documentent la version antérieure, qui passe directement de 1985 à 2185. `tests/paysage.cjs` cible ce témoin par défaut. Conserver ces preuves pour la migration et le retour arrière.
