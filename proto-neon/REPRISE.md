# SNAKE 2975 — reprendre le projet sur ton ordinateur

## État au 17/10/2026 · 23 h 30 (le projet vit désormais sur l'ordinateur)

- Dossier de travail : `~/Projets/SNAKE 2975` (clone du dépôt, branche `claude/snake-game-mobile-17dqpi`).
  Playwright et Chromium sont installés hors dépôt dans `.outils/` (lien `node_modules` à la racine) ;
  les scripts de `tools/` importent `'playwright'`.
- **Refonte intégrée et publiée** : https://manonwwk-kasiope.github.io/proto-neon/ (branche `gh-pages`,
  dossier `proto-neon/` : `index.html`, `musique/`, `cine/`). Sept lots faits en parallèle puis fusionnés :
  structure (79-jeu.js, machine d'états), monde 1 024 × 512 en parallaxe et LE VOL, piste Neon Velocity
  en 21 blocs (143,76 BPM mesurés), vraie mort et coupe, LASSO, INVERSION, six armes, 19 cartes, écran de
  fin, cinq vagues avec TRAVELLING et CONVOIS, LE CYCLOPE en trois phases, sprites et mise en scène.
- **Vérifié** : partie complète au doigt sur iPhone 13 paysage, portrait et bureau (`tools/F/captures.mjs`),
  partie au pilote de 150 s (`tools/A/verifier.mjs`) : zéro erreur ; en ligne aussi.
- **Reste à faire** (voir `refonte/lots/demandes.md`) : équilibrage par les pilotes (§ 4.10), LE DÉFILÉ et
  LE RIVAL orchestrés, records avec initiales et défis du jour, branchement des intermèdes
  (`refonte/INTERMEDES.md`), deux tests de contrat (champ `player.pouvoir`, noms du catalogue de sprites),
  jury indépendant (§ 8.3, lot 10), essai sur le vrai iPhone.
- **Musiques Suno** : 7 morceaux de `SUNO.md` + 3 variantes « électro française » (demande du 17/10) dans
  `musique/brut/` ; pas encore branchées dans le jeu (la piste de jeu reste Neon Velocity, § 5.7).

Tout le travail est sur GitHub, branche `claude/snake-game-mobile-17dqpi` (pull request n° 8). Rien
n'est resté dans le cloud.

## 1. Récupérer le projet

**Avec l'application Claude Desktop** (onglet Code) : ouvre ou clone le dépôt
`manonwwk-kasiope/manonwwk-kasiope.github.io`, puis demande à Claude :
« passe sur la branche claude/snake-game-mobile-17dqpi et lis proto-neon/REPRISE.md ».

**Ou dans un terminal :**

```
git clone https://github.com/manonwwk-kasiope/manonwwk-kasiope.github.io.git
cd manonwwk-kasiope.github.io
git checkout claude/snake-game-mobile-17dqpi
```

Ce qu'il faut sur l'ordinateur : Node.js 20 ou plus. Pour les essais automatiques, Playwright avec
Chromium (`npx playwright install chromium`). Pour installer les vidéos, ffmpeg. Les scripts
d'essai de `proto-neon/tools/` importent Playwright depuis le chemin du cloud
(`/opt/node22/lib/node_modules/playwright/index.mjs`) : en local, remplace-le par `playwright`.

**Jouer en local :**

```
cd proto-neon && node build.mjs && cd ..
npx http-server -p 8112 -s
```

puis ouvre http://localhost:8112/proto-neon/index.html.

## 2. Où en est le jeu

**Fait, testé sans aucune erreur** sur un iPhone simulé (portrait et paysage) et sur un bureau :

- la direction artistique (`DIRECTION.md`) et le contrat des modules (`CONTRAT.md`), qui font autorité ;
- onze illustrations générées sur Higgsfield et converties en vrai pixel art dans la palette des seize
  couleurs (`art/`), dont le logo SNAKE 2975 et sept panneaux de cinématique ;
- trois recherches sur les jeux mobiles (`recherche/`), soit 115 exigences vérifiables ;
- `05-art.js` : illustrations et clips vidéo convertis en gros pixels à la volée ; `90-boot.js` :
  manche virtuel flottant, son malgré l'interrupteur silencieux, pause en arrière-plan, zone sûre ;
- `10-gfx.js` et `20-crt.js` : gros pixels nets à l'échelle entière, même taille de pixel sur
  iPhone 13 et 16, halo cathodique sans fantôme, caméra qui tremble en souplesse ;
- `40-sprites.js` : serpent en 16 directions, quatre ennemis, colosse, police 5x7 avec accents ;
- `50-fx.js` : explosions en anneaux, gel d'image, secousse, limiteur de flashs (photosensibilité) ;
- `60-intro.js` : ouverture de 11 s avec les panneaux, logo qui se construit, briefing, interludes ;
- `70-game.js` : deux minutes du calme au chaos, défi « dix kills en chaîne », le colosse à 1 min 16,
  écran de fin, bouton son, pause, portrait et paysage.

**Interrompu en cours de route : les finitions de la musique** (`30-music.js`). Le fichier se charge
sans erreur, mais l'agent n'a pas rendu son rapport.

**Pas encore fait :**
1. finir la musique ;
2. l'assemblage final ;
3. installer les vidéos ;
4. les musiques Suno ;
5. le jury indépendant ;
6. la publication.

## 3. La suite, consigne par consigne, à coller dans Claude Code

**Étape 1 — finir la musique**

```
Projet SNAKE 2975, dossier proto-neon/. Lis DIRECTION.md et CONTRAT.md. Dans src/30-music.js seulement :
publie N.music.mute(bool) et N.music.muted() avec un fondu court ; fais exister chaque son que
src/60-intro.js et src/70-game.js demandent à N.music.sfx (ajoute un « bip » discret pour le texte de
l'ouverture) ; garde un mixage doux sur un haut-parleur de téléphone (pas d'aigus perçants, rien qui se
répète à l'identique plus de deux fois) ; publie N.music.suspend() et N.music.resume() que 90-boot.js
appelle. Vérifie par node build.mjs puis dans le navigateur, zéro erreur. Ne touche à aucun autre fichier.
```

**Étape 2 — l'assemblage**

```
Projet SNAKE 2975, dossier proto-neon/. Lis DIRECTION.md, CONTRAT.md et REPRISE.md. Assemble le jeu :
1. un écran « TOUCHE POUR COMMENCER » avant l'ouverture, pour que le premier geste lance le son sans
   sauter l'ouverture (aujourd'hui l'ouverture est muette au premier lancement) ;
2. supprime l'à-coup d'une image quand le son démarre (initialisation lourde de N.music pendant le geste) ;
3. fais écrire S.shakeX et S.shakeY par le jeu et les explosions, pour que la caméra soit poussée à
   l'opposé des tirs et des impacts (20-crt.js sait déjà s'en servir) ;
4. node build.mjs, puis une partie complète au pilote automatique sur bureau, iPhone paysage et
   iPhone portrait (ouverture, jeu, colosse, fin, relance), avec zéro erreur ;
5. commit « SNAKE 2975 : première version assemblée » et pousse sur la branche.
```

**Étape 3 — les vidéos des cinématiques**

```
sh proto-neon/tools/cine.sh && cd proto-neon && node build.mjs
```

Le script télécharge les neuf clips générés sur Higgsfield et les réduit au format du jeu. Le jeu les
détecte tout seul et anime alors les cinématiques en gros pixels. Commite ensuite `proto-neon/cine/`
et `proto-neon/index.html`.

**Étape 4 — la musique Suno** : la consigne est dans `proto-neon/SUNO.md` (sept morceaux). Une fois
les MP3 dans `proto-neon/musique/brut/`, demande à Claude de les alléger pour le téléphone, de les
charger au fil de la partie et de les enchaîner sur la mesure, au-dessus du moteur génératif.

**Étape 5 — le jury indépendant, la phase capitale**

```
Projet SNAKE 2975, dossier proto-neon/. Organise un jury indépendant avec des sous-agents en parallèle,
qui n'ont rien construit et ne lisent aucun rapport des constructeurs. Cinq juges jouent le jeu (Playwright,
iPhone 13 paysage et portrait, bureau), font des captures qu'ils regardent, et notent sur 10 avec des
preuves : 1) la joueuse sur iPhone (prise en main, contrôles, difficulté, équité) avec
recherche/jouabilite-mobile.md ; 2) le directeur artistique (pixels, palette, lisibilité, cinématiques)
avec recherche/visuel-technique-mobile.md ; 3) le game designer (montée, chaos lisible, défi, explosions)
avec recherche/game-design-campagne.md ; 4) l'ingénieur son (musique pas agaçante, montée avec l'action) ;
5) performance et robustesse (coût d'image, zéro erreur, iPhone). Puis un président de jury fusionne les
cinq rapports en une liste de corrections classées par impact, des agents corrigent chacun dans ses
fichiers, et un nouveau jury de juges neufs re-note. On recommence tant qu'un juge note sous 8 ou qu'il
reste un défaut bloquant. Écris les notes et les corrections dans proto-neon/jury/, commite et pousse.
```

**Étape 6 — publier** : quand le jeu te plaît, fusionne la pull request n° 8 (ou copie `proto-neon/`
sur la branche `gh-pages`). Le jeu sera alors en ligne sur
https://manonwwk-kasiope.github.io/proto-neon/ .

## 4. Repères

- Higgsfield : 194 crédits dépensés sur les quelque 2 960 autorisés. Les numéros des vidéos sont
  dans `tools/cine.sh`, et les générations sont toutes dans ta bibliothèque Higgsfield.
- `.claude/settings.json` autorise Higgsfield et la recherche web sans te demander à chaque fois.
- La campagne complète (25 niveaux en 5 chapitres) est proposée dans `recherche/game-design-campagne.md`,
  partie 3 : c'est la suite logique après le prototype.
