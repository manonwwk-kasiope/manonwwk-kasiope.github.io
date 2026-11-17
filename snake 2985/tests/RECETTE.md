# Recette de SNAKE 2985

17/11/2026 · 23 h 37 (Paris), mis à jour le 18/11 à 00 h 02

Le jeu est livré sous `/snake-2985/` sur GitHub Pages. Dans le dépôt de développement, les fichiers de travail sont dans `snake 2985/`. La branche de publication conserve le contenu antérieur du site.

## Simulation du jeu

Depuis le dépôt de développement, lancer `node --test "snake 2985/tests/moteur.cjs"`. Le pilote utilise les directions, le turbo, les armes et les choix d'amélioration accessibles au joueur. La suite vérifie les dimensions 36 × 18, la progression de 1 à 10 pour les quatre dates, les huit boss, leurs télégraphies, la faille temporelle, la prime de double signature et le score en turbo.

## Parcours vérifiés en local

- Chromium headless et WebKit avec entrée tactile simulée. Entrée et sortie de pause, nova, turbo, choix d'arme, mort, rejeu et saut, signature du score, classement et persistance au rechargement.
- Rotation du format portrait au paysage, gestes sur la grille et interface aux dimensions 844 × 390, 667 × 320 et 568 × 320. Le petit format a nécessité de compacter le logo et les liens.
- Chargement via HTTP, démarrage après coupure du réseau une fois le cache installé, 19 ressources précachées et requête partielle d'un MP3 servie avec HTTP 206.
- Lecture WebKit avec sortie audio neutralisée. L'horloge des MP3 avance, s'arrête en pause ou en mode muet et repart. Les effets ont été synthétisés en PCM hors ligne. Au maximum des deux volumes, le scénario de stress atteint −2,3 dBFS, avec zéro échantillon écrêté. Le scénario muet rend un signal nul. Voir `mesures-audio.json`.
- Mode de mouvement réduit, persistance locale du palmarès, taille et nettoyage de l'historique des échos. Comparaison des cases d'attaque du rendu et du moteur.

## Publication

La révision publiée est `edc50ef75809cd069fc8c66d8fb2c91ac5033f2d`. Les 20 fichiers du dossier public ont été comparés aux fichiers de livraison par SHA-256. Les 5 MP3 honorent les requêtes partielles avec une réponse 206 et les octets demandés. Le rapport est dans [recette-http.json](recette-http.json).

Safari standard sur iPhone 17 simulé sous iOS 27.2 a ouvert l’URL publique en paysage, joué en silence, mis en pause puis repris la partie, enregistré la défaite, ouvert le Hall of Fame et sauté en 1985. [Reçu XCTest](safari-iphone.json). Sous WebKit, le test [paysage.cjs](paysage.cjs) vérifie également la rotation pendant le jeu, la cible Pause, le ratio réel du canevas et le classement avec les dimensions de deux petits écrans. Pour le rejouer depuis le dépôt, utiliser :

```sh
SNAKE_URL=https://manonwwk-kasiope.github.io/snake-2985/ node --test "snake 2985/tests/paysage.cjs"
```

Sur un viewport tactile panoramique de 852 × 275, le cadre jouable mesure 538 × 269 et le canevas intérieur 536 × 268. Pour 640 × 250, ils mesurent 476 × 238 et 474 × 237. Le bord tient dans la fenêtre et le ratio du canevas maintient les cases carrées. Le classement et les échos sont locaux à l'appareil.

### Retour arrière

Chaque commit ci-dessous ne modifie que le nouveau chemin public `/snake-2985/`. Depuis la tête actuelle de `gh-pages`, un revert ordinaire du seul ajustement ciblé conserve les autres projets du site. Pour retirer la nouvelle publication complète, révoquer ces quatre commits du plus récent au plus ancien, en préservant les modifications plus récentes du site lors d'un éventuel conflit :

- `edc50ef7` ajuste la mise à jour du cache hors ligne et la disposition panoramique.
- `a3d4eea8` ajuste la surface de jeu sous les barres de Safari.
- `13a31dea` corrige la capture des gestes à la sortie du manche.
- `e1d874c7` ajoute l’ensemble du jeu public.

SNAKE 2975 est toujours servi séparément sous `/proto-neon/`. L'Aiguilleur répertorie SNAKE 2985 et sa porte privée a passé les contrôles du script de publication.
