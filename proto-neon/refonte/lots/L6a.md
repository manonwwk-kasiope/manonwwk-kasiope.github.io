# Lot 6a — Image I : rapport de livraison

*Agent du lot 6a, 17 octobre 2026, contre le contrat 1.0 (`CONTRAT.md`). Copie isolée `../wt/L6a`, branche
`lot/L6a`. Les trois modules du lot tournent avec les replis des autres lots ; zéro erreur sur les trois
profils.*

## Les fichiers livrés

| Fichier | Contenu |
|---|---|
| `src/40-sprites.js` | `N.spr.get(nom, dir, img)` branché sur trois sources, dans cet ordre : les sprites dessinés ici (démo et lot 6a), les **planches de `art/sprites/`** (58, dont les 20 « hors catalogue »), les **pièces de `art/interface/`** (163, sous le préfixe `ui:`, et `carte:<id>` pour les 19 icônes), puis le repli. Les index des PNG sont recopiés dans le module par `tools/L6a/pack.mjs` (RLE + base64, 175 Ko, décodés à la première demande, aucune requête, aucun décodage asynchrone). Nouveaux dessins du lot : `tete:dos`, `vieMini`, `lance` (16 dir.), `rayon`, `fleche:armee` (16 dir.), `noyau`, `pastille`. Police : le point médian « · » (2 × 2 au milieu de la case). `catalogue()` dit pour chaque nom s'il est réel et d'où il vient. Préchauffage étendu aux sprites de la tranche. |
| `src/50-fx.js` | Réécrit autour du moteur d'explosions de la démo : espaces **monde** et **écran** séparés (la démo écrivait au tampon sans retrancher l'origine de la caméra) ; temps du monde ou temps réel par effet ; **gel en secondes** par `N.horloge.geler`, avec un **budget** (un épisode continu de gels et de ralentis courts ≤ 0,5 s, puis 0,25 s de repos) ; **arbitre des ralentis** à pool fixe ; **le vocabulaire commun des télégraphes** (§ 4.4) pour les six formes ; ondes, éclat de ramassage, **lasso** (remplissage par rangées en 3 images, refusé par le limiteur → contour seul), glitch, vignette (côté du coup, ou les quatre bords), **désintégration** de la mort, explosion « joueuse », **effets d'écran** (feu d'artifice, grand texte « ×5 », bandes WARNING) ; limiteur de flashs en **temps réel** avec journal `flash` ; masque de propriété tenu (code 7, et 3 pour ce qui est à la joueuse) ; réglages lus dans `S.reglages` (plus aucun `localStorage` : la persistance appartient à `77-score`). Aucune allocation par image. |
| `src/79-scene.js` | La mise en scène de tous les événements de la tranche au rang 60, d'après le § 5.3 (tableau en tête du fichier), la séquence de mort du § 5.4 côté image et son (gel, cue, cause entourée qui clignote à 3 Hz et son nom gardé dans l'écran, désintégration, READY! ou glitch puis extinction et GAME OVER), les **paliers de chaîne** (× 3, × 5, × 8 : onde jaune plein écran, « ×5 » en grand, EXCELLENT à × 8), l'**escalier sonore** du butin, le **danger proche** (mur à 24 px, télégraphe qui frappe dans 0,5 s : bords en sang qui battent à 1,2 Hz et `N.music.danger(v)`), le **budget des bannières** (une toutes les 10 s de temps de jeu ; au-delà, une étiquette), le panoramique en sept positions, les bandes WARNING à l'entrée de l'état `alerte`. |
| `tools/L6a/pack.mjs` | recopie `art/sprites/` et `art/interface/` dans `40-sprites.js` (`--verifier` : 221 planches décodées et comparées pixel à pixel, 0 écart) |
| `tools/L6a/commun.mjs`, `sprites.mjs`, `fx.mjs`, `galerie.mjs`, `charge.mjs` | les bancs des critères et les captures ; sorties dans `tools/L6a/sortie/` |

## Les critères d'acceptation [U]

Mesurés sur la page d'essai (`bash tools/lots/worktree.sh essai L6a`, servie sur le port 8129), Chromium,
iPhone 13 paysage, portrait, bureau 1440 × 900.

| Critère | Seuil | Résultat |
|---|---|---|
| Tailles (V-05) | menaces et butin ≥ 7 × 7, tirs ≥ 3 × 3 | **tenu** (`sprites.mjs`) : plus petite boîte opaque sur toutes les directions et images : larve 8 × 8, planeur 8 × 8, rival 9 × 9, flèche 11 × 11, noyau 11 × 11 ; tirs ennemis 5 × 5 au moins. Les tirs de la joueuse (lance 1 × 5) suivent le § 2.8 (« les tirs sont fins ») : V-05 est lu sur les menaces |
| Couleurs | aucun cyan dans un sprite ennemi ; palette 100 % | **tenu** : 0 pixel cyan ou cyan pâle dans les 110 noms réels de menace, de marque, de portail et de mini-silhouette, toutes directions et images ; 0 index hors des seize |
| Silhouettes | masques des types deux à deux, centrés, IoU < 0,6 (planche en niveaux de gris) | **tenu** : 13 types (les 11 et les deux élites), pire paire dard / rival à 0,565, puis mine / sentinelle 0,565 ; planche `sortie/planche-gris.png` |
| Limiteur de flashs | 0 dépassement sur 30 explosions en 2 s | **tenu au journal** sur les 3 profils (au plus 3 flashs acceptés par fenêtre d'une seconde) ; **à l'image** (montées de luminance ≥ 0,1 sur une aire au-delà du seuil) : 2 en paysage, 3 en portrait, **6 sur bureau** — voir les écarts |
| Ralentis et gels | le plus lent gagne ; joueuse exemptée ; pas de cumul au-delà de 0,5 s ; un gel de 6 images = 0,1 s à toute cadence | **tenu** : gel de 6 = 0,100 s à 30, 60 et 120 i/s ; ralentis 0,5 et 0,25 → 0,25 puis 0,5 ; `kJoueuse` = 1 sous un ralenti exempté ; une pluie de gels de 6 tous les 3 pas pendant 3 s, avec un ralenti de niveau et une APOGÉE : plus long épisode 0,500 s ; l'APOGÉE seule (gel de 6 + 0,25 pendant 0,42 s) : 0,417 s |
| Télégraphes | gaine en nuit profonde sur 100 % des pixels de bord ; rose pâle dans les 300 dernières ms ± 1 image | **tenu** : 8 formes (lignes fine et large, disque, secteur, rect, deux losanges, voie) à reste 0,8 / 0,29 / 0 / −0,2 : 100 % des pixels de bord en nuit profonde ; une ligne dont le reste décroît d'1/60 par image passe au rose pâle à reste = 0,300 exactement |
| Mise en scène | 50 événements scriptés, chaque effet attendu au § 5.3 exactement une fois | **tenu** : 50 sur 50 (36 cas distincts, plus 14 kills en chaîne) : sons demandés, explosions, gels, ralentis, bannières, étiquettes, gains, poussées, ondes, lasso, vignette comptés par événement |
| Coût | `fx.draw` + `drawTele` + `scene` p95 ≤ 0,7 ms, 24 explosions et 30 télégraphes | **non tenu sur ce banc** : 0,9 à 1,3 ms (minimum de 5 mesures par image, p95 sur 400 images) ; brut 1,2 à 5,6 ms — voir les écarts |
| Zéro erreur | `__ERR.count = 0`, console vide, 3 profils | **tenu** : bancs, galerie, `contrat.mjs` (49 tests sur 3 profils, groupe `modules` 8 sur 8), `tools/jeu/etats.mjs` (6 parcours, bus en mode vérification) |

Mesures en plus :

- **Scène `charge`, image complète** (`charge.mjs`, page du lot contre la page des squelettes, mesurées en
  alternance, 3 fois chacune) : p95 médian 8,0 ms contre 7,9 ms pour les squelettes (premier passage : 5,6
  contre 6,5), écart dans le bruit ; le coût propre des trois modules sur cette scène est de 0,2 ms au p95.
- **Non-régression** (`tools/nonreg/nonreg.mjs` sur la page d'essai) : tout au vert (build, interdits,
  contrat, états, fumée sur 3 profils, R-01, R-02, R-03 à 0,00 %, R-21 sur 5 graines bus vérifié, cadence),
  **sauf le coût de `charge`** : 13 ms contre la référence de 4,8 ms enregistrée sur une machine au repos ;
  la page des squelettes, mesurée au même moment, en fait autant (ligne ci-dessus). Le lot 9 la remesurera.
- **R-03 sur le lasso** : 2 702 pixels cyan à l'image du remplissage, 0 hors des codes 1 à 4 du masque (le
  lasso, la désintégration et les ondes cyan portent le code 3 de l'arsenal).
- **Branchement** : 119 noms au catalogue figé, 110 réels (33 dessinés, 58 de `art/sprites/`, 19 de
  `art/interface/`), 9 en repli (`corps:repli`, `tourelleJ`, `tourelleJ:double`, `drone`, `missile`, `mineJ`,
  `orbe` : l'arsenal du lot 6b ; `colosseLoin`, `colosseMi` : voir les demandes).

## Les captures (à regarder)

`tools/L6a/sortie/` : `planche-ennemis.png` (couleur, 16 directions), `planche-gris.png`, `planche-six.png`
(les sprites du lot), `planche-ui.png`, et la galerie en jeu, tampon ×3 avant le tube : `g-kills-a/b`
(chaîne de kills et gains), `g-elite`, `g-teles` (les huit formes sur le décor), `g-lasso-a/b`, `g-coupe`,
`g-palier`, `g-apogee`, `g-warning` (bandes et feu d'artifice d'écran), `g-mort-a/b/c` (cause entourée et
son nom, désintégration, explosion cyan de la tête).

## Les écarts

1. **Coût de 0,9 à 1,3 ms au lieu de 0,7.** La machine des bancs est partagée par sept lots (charge de 3 à 14
   sur 4 cœurs pendant les mesures) : la même mesure a varié de 1,0 à 1,5 ms d'un passage à l'autre sans
   changement de code. Gains déjà faits : racines et angles précalculés, couronne évaluée par blocs de 2 × 2
   au-delà de 10 px (Bayer gardé au pixel), rangées bornées à la couronne, perforation des anneaux par paires,
   gaine des télégraphes sans division. Répartition au p95 : couronnes 0,5, anneaux 0,3, particules 0,1,
   télégraphes 0,3 à 0,4. Le scénario est dur (24 explosions de force 0,3 à 0,6 vivantes ensemble et 30
   télégraphes dont des secteurs de 30 px). À remesurer par le lot 9 sur une machine au repos ; s'il le
   faut, la piste suivante est de passer les anneaux des explosions moyennes en blocs de 2 × 2.
2. **Limiteur, mesure à l'image sur bureau : 6 montées par seconde.** Le limiteur compte l'aire du cœur (0,75 πR²)
   et accumule maintenant l'aire admise avec une extinction de 0,2 s (deux petites explosions rapprochées
   comptent ensemble) : au journal, 3 flashs par seconde au plus partout. Mais sur bureau le seuil n'est que de
   1 364 px de jeu (px = 4) et les anneaux et les éclats qui se déplacent allument à eux seuls plus que le
   seuil quand quatre explosions vivent ensemble. Compter les anneaux dans l'aire rapetisserait toutes les
   explosions du téléphone. La méthode de R-13 (« analyse image par image ») doit être fixée par le lot 1 et
   le lot 9 ; le paysage, profil de référence, tient (2 montées par seconde au plus).
3. **La mort quand il ne reste aucune vie** : le § 5.4 place glitch (0,3 s) et extinction (0,4 s) entre 0,9 et
   1,3 s, ce qui ne tient pas en 0,4 s. Ici : glitch de 0,6 à 0,9 s, extinction de 0,9 à 1,3 s.
4. **L'explosion de la tête** est de force 0,55 (moyenne) : à 0,62 elle débordait sur READY!.
5. **« VAGUE n NETTOYÉE »** est une étiquette, pas une bannière : sinon la bannière de la vague suivante, 6,5 s
   de temps de jeu plus tard (nettoyage et VOL), violerait le budget d'une bannière toutes les 10 s. Les
   entrées de vague, les pics et READY! passent toujours ; le reste devient étiquette quand le budget est pris.
6. **L'événement `carte`** n'a pas `79-scene` pour consommateur au contrat 1.0 (le mode vérification du bus le
   refuse) : le son `choix` et l'onde cyan partent à la fermeture de l'écran de cartes (changement d'état).
7. **« CANON III → II »** n'est pas affiché : aucune interface ne donne la dernière perte de palier à la mise
   en scène (demande 6). « −1 VIE · n RESTANTES » et READY! le sont, à la réapparition.

## Ce que les autres lots doivent savoir

- **Lot 3a** : la désintégration est lancée par `79-scene` à l'événement `mort` (`N.fx.desintegre(S.player.segs, 0,73,
  {delai: 0,17})`) ; `N.fx.desintegres()` rend le nombre de segments déjà partis, de la queue vers la tête :
  `drawTop` pendant la mort peut ne plus les dessiner. La tête explose seule à 0,9 s. Le lasso : envoyer
  `poly` en `[x0, y0, x1, y1, …]` monde. Les sons `boost*` sont joués par `79-scene` sur l'événement `boost`
  (CONTRAT.md § 6) : `70-joueuse` ne doit pas les jouer aussi.
- **Lot 4a** : `N.fx.tele(desc)` à chaque pas ; la forme `losange` est le crochet d'impact (rose pâle si
  `cible:'tete'`, magenta si `'corps'`) ; `r` d'une `ligne` est sa demi-largeur ; un disque se remplit avec
  `1 − reste/total`. Les sprites `dard`, `larve`, `traqueur`, `fleche:armee`, `mini:*`, `portail` sont réels.
- **Lot 8** : toutes les pièces de `art/interface/` sont servies par `N.spr.get('ui:<nom>', dir, img)` avec leur
  ancre (`N.spr.interface()` en donne la liste) ; `carte:<id>` sert les 19 icônes. `79-scene` demande
  `banniere(texte, {duree, ci, barre})`, `tag(texte)`, `pop(x, y, texte, {echelle, ci})`, et tient lui-même le
  budget des bannières.
- **Lot 1** : `N.fx.drawEcran()` dessine aussi les bandes WARNING ; `79-scene` appelle `N.crt.extinction(0,4)`
  à 0,9 s d'une mort sans vie.

## Demandes au gardien

| N° | Demande | Raison |
|---|---|---|
| 1 | Ajouter à `N.ids.sprites` les états hors catalogue que `N.spr.get` sert déjà depuis `art/sprites/` : `rival:coupe`, `ruche:elite:p2`, `fleche:elite:nue`, `plaque:debris`, `instable`, `wagon:g`, `wagon:tete:g`, `portail:double`, `portail:triple`, `portail:sol`, `portail:sol:elite`, `marque:mine`, `marque:mine:loin`, `marque:pastille`, `marque:pastille:loin`, `colosse:tronc:colere`, `colosse:oeil:vise`, `colosse:oeil:charge`, `colosse:oeil:colere`, `colosse:oeil:mort` ; et la convention `ui:<nom>` pour les pièces de `art/interface/` | les actifs existent et sont branchés ; sans entrée au catalogue, `catalogue()` les marque `hors: true` |
| 2 | Corriger `colosseLoin` (48 × 48) et `colosseMi` (80 × 80) au catalogue : `art/decor/` les fait en 58 × 48 et 96 × 80 | le lot 2 les pose dans le décor ; `N.spr.get` les laisse en repli tant que les tailles divergent |
| 3 | Publier dans `CONTRAT.md` les extensions de `N.fx` : `hitstop(n, {force})`, `ralenti(k, dur, {joueuse, force})`, `boom(x, y, f, ci, {ecran, reel, variante})`, `onde(…, {ecran, reel, delai, epais})`, `drawMort()`, `desintegres()`, `texte(chaine, ci, dur)`, `bandes(dur)`, `budget()` ; et `N.scene.stats`, `N.scene.danger()` | elles servent la mise en scène et la mort (crochet de mort : `drawCause` appelle `drawMort`) |
| 4 | Reporter dans `N.R` les valeurs locales marquées `// → N.R` : `fx.gel = {max: 0,5, repos: 0,25, court: 0,5}`, `fx.vignette = {duree: 0,35, prof: 14}`, `fx.lasso = {remplir: 3/60, os: 4/60, eteindre: 0,22, contour: 0,35}`, `fx.desintegre = {anneau: 0,16, eclats: 3}`, `fx.flashTau = 0,2`, `scene.escalier = {fenetre: 1,2, max: 12}`, `scene.popGrand = 6`, `scene.danger = {mur: 24, tele: 0,5}`, `mortScene.glitchDebut = 0,6` | chiffres du lot qui n'étaient pas dans le plan |
| 5 | Ajouter `79-scene` au rang 60 de l'événement `carte` | REFONTE.md § 8.3 (lot 6a) le liste ; le contrat 1.0 ne l'a pas (repli : fermeture de l'écran de cartes) |
| 6 | Donner à la mise en scène la dernière perte de palier, par exemple `N.arsenal.derniereDescente() -> {arme, de, a, t}` | pour l'étiquette « CANON III → II » à la réapparition (§ 2.4) |
| 7 | Trancher les sons `boost*` : REFONTE.md § 5.8 les donne à leur module, CONTRAT.md § 6 met `79-scene` en consommateur de `boost` | ici `79-scene` les joue ; un double appel par `70-joueuse` doublerait le son |
| 8 | Fixer la méthode de mesure de R-13 (aire du flash : cœur seul, ou balayage des anneaux et des éclats) | écart 2 |
| 9 | `N.hud.banniere(texte, {barre:true})` : le nom de l'élite barré à sa mort (§ 5.3) | à faire par le lot 8 ; sans lui, le nom s'affiche sans barre |

## Reproduire

```
bash tools/lots/worktree.sh essai L6a && bash tools/lots/worktree.sh servir L6a &
node tools/L6a/pack.mjs --verifier            # les planches recopiées = les PNG
node tools/L6a/sprites.mjs                    # tailles, couleurs, silhouettes, planches
node tools/L6a/fx.mjs --profil paysage        # gels, ralentis, flashs, télégraphes, mise en scène, coût
node tools/L6a/galerie.mjs                    # les captures des temps forts
node tools/L6a/charge.mjs                     # la scène 'charge' contre les squelettes
node tools/contrat/contrat.mjs --url http://127.0.0.1:8129/proto-neon/tools/L6a/index.html --profil tous
node tools/jeu/etats.mjs --url http://127.0.0.1:8129/proto-neon/tools/L6a/index.html
```
