# SNAKE 2975 — reprendre le projet sur ton ordinateur

## Cheffe d'orchestre (session Claude du Mac) — point de reprise du 18/10/2026 · 01 h 36 (mis à jour à 08 h 06)

- Objectif (délégation de la propriétaire, 00 h 22) : jusqu'à la sortie finale, décisions prises par la cheffe
  d'orchestre, Codex à plein régime. Critères : `refonte/SORTIE.md` (portes et état). **Depuis 01 h 40, la propriétaire
  dort : tout est automatisé**, sans fenêtre d'autorisation (chemins `${X:?}`), relance de session aux minutes 13 et 43
  de 2 h à 9 h, guetteur `~/Projets/wt-snake/guetter.sh` (sort à chaque fin de session Codex, nouveau `.final.md` ou commit).
- Codex travaille par deux voies : la boîte aux lettres (`COORDINATION.md`, dans le dossier principal) et des
  sessions `codex exec` parallèles, chacune dans `~/Projets/wt-snake/<nom>` (consignes dans
  `~/Projets/wt-snake/consignes/`, journal `<nom>.log`, réponse `<nom>.final.md`). Leur bac à sable interdit
  serveur local et Chromium : la cheffe d'orchestre exécute leurs `verifier.mjs` hors bac, un Chromium à la fois.
- Intégration : jamais dans le dossier principal (Codex y écrit) ; copie `~/Projets/wt-snake/chef` et
  `~/Projets/wt-snake/integrer.sh <copie> <auteur> <message> <chemins…>` (NOPUSH=1 pour vérifier avant de publier) ;
  écritures de suivi dans la copie `~/Projets/wt-snake/integ`.
- Fait depuis 01 h 36 (tout vérifié en navigateur avant intégration) : 01c tranché ; 05b, codex-10 (DÉFILÉ) jugés ; intégrés : p4b,
  codex-09 (aventure), p5 (réglage 8/20, arrêté), p3c (instrument), p8, p10, p11, p13 (photosensibilité 9/9 ≤ 3 flashs/s),
  p4c (871 → 8 apparitions), p12 (défis, déblocages), codex-10 (raccord 79 appliqué à la main). Médiations dans `refonte/mediation/`.
- Intégrés depuis 02 h 50 : p14 (pilotes LASSO/APOGÉE, 7b86ecf), p18 (score de maîtrise, 8547e48). Médiation `2026-10-18-codex-p14-p18.md`.
- En cours à 03 h 23 : livrés et en vérification navigateur : p15 (R-13 navigateur 8 flashs/s, rejeu sur la build sans p15 en cours :
  `chef/proto-neon/tools/verif-p15-avant/`, à supprimer après), p17 (navigateur ok, captures vues, à intégrer), p4d (CYCLOPE 15 → 0
  apparitions, vérifieur en file). Sessions `codex exec` : p16 (perf), p19 (instrument R-12), p20 (mixage : 30-music), p21 (gestes :
  90-boot, 03-socle), p22 (R-27/R-03 : 73-arene, 17-vol), p23 (R-28/R-11 : 12-cam, 50-fx, 15-decor) ; boîte : codex-11 (directeur).
- À 03 h 51 : intégrés aussi p17 (écrans), p4d (CYCLOPE), p19 (instrument R-12) et le correctif `quartier()` de 70-joueuse. Renvoyés : p15b (R-13 1 → 8 flashs/s,
  R-05 7 → 4), p16b (vérifieur sans mesure). Lancés : p20 à p27 (p26 régénérateurs, p27 ennemis de 2030), p29 (diagnostic R-08). **En attente de
  lancement : codex-p28** (consigne prête `consignes/codex-p28.md`, R-18 régressé par p17) **dans la copie codex-p24 dès que p24 a livré**.
  File navigateur : p16, p23, p20. Batterie `318ce61` : 8 ok (régressions R-08, R-18).
- À 04 h 14 : intégrés p23 (R-28 ok, R-11 1 échec ; ambiance au jury) et p29 (R-08 = défaut de mesure). Non retenu : p25 (R-34 arrêté, non-convergence).
  Livrés en attente du navigateur : p16b, p20 (audio), p22, p27 (raccord directeur après codex-11). Sessions : p15b, p21, p26, p28 (copie p24, puis
  intégrer p24+p28 avec `tools/codex-p24/raccord-79-jeu.patch`), p30, p32. **À lancer quand 70-joueuse (p30), 72-ennemis (p27), 73-arene (p22),
  73-colosse (p32) sont libres : codex-p31** (`consignes/codex-p31.md`, provenance des morts, R-08). Tempo de la grille : après p20 et codex-11.
- À 05 h 14 : intégrés aussi p22 (R-27), p24+p28 (écran de fin restauré), p34 (analyse des cibles B), p16c (instruments R-20/R-30).
  Non retenus : p20 (R-26 déjà tenu), p25 (R-34 arrêté), p27 (doublon des ennemis du cloud → p27b). codex-11 accepté avec réserves ; **réglage par
  cibles B arrêté** (non-convergence) ; décision de spécification inerte « avant 11 s ». Sessions : p33 (tempo), p35 (R-13 limiteur), p36 (R-04
  instrument), p37 (pilote humain), p38 (dessiné = simulé) ; boîte : codex-12 (R-15, R-14). File navigateur : p21, p30, p32, rejeu aventure
  (copie batterie figée 6b040d7, pour juger p26b), p15b, p22b, p27b. Après : p31 (provenance des morts, consigne prête), batterie complète, jury.
- À 05 h 44 : intégré p27b (ennemis de 2030 unifiés, b34d288 + raccords a9aa133 ; R-13 global préexistant → p35). Jugés : p15b (arrêt de
  non-convergence ; **p15c** reporte ses changements sur la pointe et mesure avant/après sur la même base), p22b (diagnostic accepté, cyan du panneau
  PLONGÉE ; **p22c** propage l'attribution ou change l'encre), codex-12 (accepté avec réserves ; règle R-15 des vagues interrompues ; **ordre n° 12** :
  qualifier le correctif des bannières). Livrés en attente du navigateur : p33 (tempo), p36 (R-04 ; raccord 02-regles « inerte 11 s »), p37 (pilote
  humain : 3 cibles tenues, LASSO et V1 sous cibles). Sessions : p35, p38, p15c, p22c ; boîte : codex-12 (ordre 12). File navigateur (ordre non garanti) :
  p37 en cours, puis p21, p30, p32, rejeu aventure (p26b), p36, p33. Ensuite : p31 dès que p30 et p32 libèrent 70-joueuse et 73-colosse.
- À 06 h 13 : intégrés p37 (pilote humain au contrat, 0766382), p36 (instrument R-04, e3cde9b ; inerte 11 s c8fc0f5). Jugés : p38 (diagnostic accepté :
  caméra et gel en simulation ; non-régression = dessiné inchangé et simulé = dessiné ; raccords 79-jeu et 50-fx, ce dernier après p35), p39 (LASSO
  impossible à L = 8 ; `raccord-70-joueuse.patch` à appliquer après p30 si son vérifieur passe), p33 (navigateur : R-26 inchangé, H 6 échecs au
  CYCLOPE, morceau à demi-vitesse ; rejeu H sur la pointe en file pour séparer préexistant/régression), p22d (clips PLONGÉE, planches relues bonnes).
  Sessions : p40 (attraction R-19), p41 (relance R-35), p42 (instruments R-07/R-17) ; boîte : codex-12 ordre 12. File navigateur : p21 en cours,
  puis p30, p32, aventure, p35, p15c, p38, p22d (copie codex-p22c), H sur chef, p39. Ensuite : p31 ; p35 → raccord 15-decor (après p33) ; batterie.
- À 08 h 06 : intégrés p21 (40357d0), p15c (8969e50), raccord codex-12 79-scene (1a676b3), p30 (6fc61f0, + 40-sprites/70-joueuse 0cc5700), p32 (695ec30),
  p38 (93ac478 + raccords ed9ed83), p41 (f786ef6 + 13c80af), p43 (instrument tactile, c30fcb8). codex-12 ordre 12 accepté (bannières) ; ordre 13 (morts d'élites,
  R-12) en cours dans la boîte. Livrés, vérifieur en file (`file-verifs.sh`, ordre) : p44 (difficulté ; raccords 70-joueuse, 73-colosse, 79-jeu), p35 avec raccord
  15-decor (limiteur R-13 ; plongée portrait 27–28 flashs/s préexistant), p45b (perf −38 %, arrêt ; décision R-20 proposée dans SORTIE.md), p31 (R-08 ; raccords
  72-ennemis, 03-socle), p33b (frein audio retiré) puis banc aventure sur chef, p40c (attraction), p22d en Chrome (H.264). Sessions : p39b (vérifieur LASSO, puis
  raccord 70-joueuse de p39), p47 (R-33 : touchers courts pendant un recentrage → pouvoir involontaire). Diagnostic p46 : R-05 = échantillon, aucun code.
  Ensuite : intégrer dans l'ordre 50-fx/79-jeu/15-decor/70-joueuse avec `git apply --check` ; secousses (trauma 50-fx) après p35 ; batterie ; jury ; publication.
- **Copie dérivée d'une autre copie : appliquer le diff (`git diff` → `git apply -3`), jamais copier les fichiers** (p44 avait effacé du p21).
- Outils de nuit : `guetter.sh` (réveil), `file-verifs.sh` (vérifieurs en série, verrou `/tmp/snake-chromium-chef.lock`, respecte
  `/tmp/snake-chromium-boite`), `integrer.sh` (fusionne seul les ajouts de `02-regles.js` et les `.md`, reçus > 5 Mo hors dépôt).
- À faire ensuite : intégrer chaque livraison après son vérifieur ; `70-joueuse.js` : `quartierCourant()` → `quartier()` (après p4d) ;
  quand p14, p18 et codex-11 sont intégrés : batterie complète, second réglage (même banc p5), jury (`tools/jury/partie.mjs`),
  publication sur gh-pages, demande de JALON, notification de fin.

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
