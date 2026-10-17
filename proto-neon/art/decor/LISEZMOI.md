# Les plans de parallaxe de SNAKE 2975 (`art/decor/`)

Données préparées pour le lot 2 (`15-decor.js`, `17-vol.js`, `60-intro.js`), d'après REFONTE.md § 3.4 à 3.6,
§ 4.8 et § 5.2. Tout est **généré** par `tools/decor/genere.mjs` (graine 2975, rejouable à l'octet) : on ne
retouche jamais un PNG à la main, on modifie le script et on relance.

```
/opt/node22/bin/node proto-neon/tools/decor/genere.mjs              # écrit art/decor/*.png et decor.json, contrôle, sort 1 si échec
/opt/node22/bin/node proto-neon/tools/decor/maquette.mjs            # compose les sept quartiers (3 orientations), mesure, captures ×3
/opt/node22/bin/node proto-neon/tools/decor/maquette.mjs --etat chaos --q coeur
/opt/node22/bin/node proto-neon/tools/decor/maquette.mjs --verifie  # critères du lot 2 mesurables sur le décor seul ; sort 0 si tout passe
```

Les captures vont dans `tools/decor/out/` (non versionné : `tools/.gitignore`). La meilleure vue d'ensemble est
`out/planche-calme.png` (les sept quartiers en paysage).

## Format

- **PNG indexé 8 bits, palette de 17 entrées** : les index 0 à 15 sont la palette du jeu **dans l'ordre exact de
  `00-pal.js`** (vide, nuit, ardoise, violet, indigo, magenta, rose pâle, cyan, cyan pâle, ambre, jaune, brasier,
  os, acier, sang, nuit profonde) ; l'index **16 est transparent** (tRNS). Un octet lu = un index `N.pal`
  directement, sans conversion de couleur.
- Pour passer au format `{w, h, data}` de `N.spr.make` / `N.art.get` (0 = transparent), faire comme `05-art.js` :
  16 → 0, et 0 (vide) → 15 (nuit profonde) — ou garder l'index brut et traiter 16 comme transparent, ce qui
  est plus simple pour une copie de rangées.
- `build.mjs` n'injecte que `art/*.png` (premier niveau) : ces fichiers ne sont **pas encore** dans le bundle.
  Le lot qui branche le décor choisira : étendre l'injection à `art/decor/` (≈ 280 Ko, la plupart des fichiers
  font 1 à 8 Ko), ou décoder une fois et embarquer les index.
- **Planches animées** : les images sont côte à côte, l'image k commence en x = k × `imageW` (voir le manifeste).
- Aucun pixel cyan, cyan pâle, magenta ni rose pâle dans aucun fichier (contrôlé). Aucun bloc 3 × 3 plein de
  couleur vive (ambre, jaune, brasier, os, acier) hors du disque du soleil (contrôlé). Les couleurs vives sont
  tramées sur une seule phase de Bayer par couche, pour que leurs unions restent sous 50 %.

## Le manifeste `decor.json`

| Clé | Contenu |
|---|---|
| `plans` | facteurs x / y de P0 à P6, du SOL et du PLATEAU (§ 3.4) ; `"f_h"` = facteur de l'horizon |
| `cycleEnseignes` | `[sang, brasier, ambre, jaune]` en index : le cycle des enseignes |
| `cycleBalises` | `[sang, nuit, nuit profonde]` : le clignotement des balises |
| `quartiers.<q>` | `nom`, `ciel` (fichier du ciel en `calme`), `soleil.haut` (px entre l'horizon et le centre du disque, pour 80 px ; × D/80 en portrait), `soleil.variante`, `cite`, `structures`, `sol.reflet` (3 encres : près de l'horizon, milieu, bas), `sol.grille`, `sol.eau` (docks : eau-miroir), `lut` (remplacements d'index du quartier, appliqués au ciel, aux montagnes et au sol), `enseignes.tempo` (pas de cycle par temps), `rangee` (poses des tuiles de P5 sur une période de 768 px), `etoiles` (nombre de champs), `colosseLoin` / `colosseMi` |
| `etats.<e>` | `ciel` (remplace celui du quartier, `null` = garder), `soleil` (variante imposée), `soleilBaisse` (px de plus vers l'horizon ; `'horizon'` = disque posé sur l'horizon), `sol.cases` (avance de la grille par temps), `sol.braiseProche`, `sol.epaisseur`, `sol.reflet`, `enseignes` (multiplicateur, 0 = éteintes), `braises` (P6) |
| `tuiles.<q>[]` | `nom, x, y, w, h` dans la planche `structures-<q>.png`, `balises [[x, y, 'sang'|'ambre']]`, `projecteurs [[x, y]]` (origine d'un faisceau), `flammes [[x, y]]` (bas de la flamme) |
| `fichiers.<nom>` | `w, h`, plan, `boucleX` (période de bouclage horizontal), `images`, `imageW`, notes d'ancrage |

Les quartiers : `docks`, `artere`, `centrale`, `ciel`, `tours`, `coeur`, `eclipse` (= `N.ids.quartiers`). Les états :
`calme`, `montee`, `chaos`, `inversion`, `colosse`, `victoire` (= `etatsDecor`).

## Les fichiers, plan par plan

Horizon `yh` comme au § 3.4 : `⌊h × (0,80 − 0,42 c)⌋` en paysage et au bureau, `⌊h × (0,62 − 0,20 c)⌋` en portrait.

| Plan | Fichiers | Taille | Ancrage et usage |
|---|---|---|---|
| P0 ciel | `ciel-<etat>.png` (6), `ciel-<quartier>.png` (docks, centrale, ciel, tours, coeur) | 64 × 256, boucle 64 | la rangée 255 est juste au-dessus de l'horizon ; au-dessus de la rangée 0, répéter la rangée 0. Bande embrasée (brasier tramé 31 → 50 %) puis lueur qui s'éteint en 48 à 60 rangées |
| P1 étoiles | `etoiles.png` + `points` du manifeste | 512 × 160, boucle 512 | 60 étoiles (`[x, y, phase, croix]`) ; acier = phase 0, os = phase 1 : échanger os et acier à chaque demi-temps. LE CIEL dessine deux champs |
| P1 voie lactée | `voie-lactee.png` | 512 × 160, boucle 512 | même champ et facteur que les étoiles, dessinée avant elles, seulement sur vide, nuit et indigo |
| P2 halo | `halo-80/64.png`, `halo-eclipse-80/64.png` | D + 60 | centré sur le disque, dessiné avant lui, coupé à l'horizon |
| P2 soleil | `soleil-<plein|chaos|inversion|victoire|eclipse>-<80|64>.png` | 8 images de D × D | 80 en paysage et au bureau, 64 en portrait. Jaune en haut, ambre au milieu, brasier en bas ; l'image k décale les rayures de nuit de k rangées : avancer d'une image toutes les 2 mesures. Éclipse : avancer à chaque temps (la couronne crépite). Coupé à l'horizon |
| P2 colosse lointain | `colosse-loin.png` | 58 × 48 | devant le soleil (LE CŒUR, puis WARNING), bas sur l'horizon ; œil en (29, 9) |
| P2 montagnes | `montagnes.png` | 512 × 56 | bas sur l'horizon, x = 256 sous le soleil ; 512 px couvrent sans boucler au facteur 0,08 |
| P3 cité | `cite-<q>.png`, `cite-<q>-fenetres.png`, `cite-<q>-enseignes.png` | 600 × 100 (LE CIEL : 600 × 30) | bas sur l'horizon (LE CIEL : haut sur l'horizon, dessiné **après** le sol). Boucle 600 ; la tour centrale d'`exterieur.png` est à x = 0, sur la couture. Dessiner la base, puis les fenêtres (on les éteint ou allume par rangées : élite tuée, éclipse), puis les enseignes avec `cycleEnseignes[(phase + n) & 3]`, phase = position de l'encre lue dans le cycle |
| P4 brume | `brume.png` | 256 × 32, boucle 256 | bas à 4 px sous l'horizon, dérive 4 px/s |
| P5 structures | `structures-<q>.png` (tuiles de 32 ou 64 × 64) | — | base = rangée 63 de la tuile ; poses dans `quartiers.<q>.rangee`. Balises, projecteurs (faisceaux en os tramé à 12 %) et flammes sont posés par le code aux points du manifeste |
| P5 LE CIEL | `nuages-ciel.png` | 512 × 64, boucle 512 | à 38 % de la hauteur du ciel, dérive 3 px/s |
| P5 flammes | `flammes.png` | 4 images de 8 × 14 | sur les points `flammes` (centrale) ; une image par demi-temps |
| P5 colosse | `colosse-mi.png` | 96 × 80 | L'ÉCLIPSE, puis passage vers le plateau ; œil en (48, 15) |
| P6 | `avant-haut.png`, `avant-bas.png` | 256 × 24, boucle 256 | rangée 0 en haut de l'écran / rangée 23 en bas ; nuit profonde tramée à 50 % ; avant les entités |

Le SOL, le PLATEAU, les faisceaux, les braises et l'eau-miroir sont procéduraux : leur implémentation de
référence est dans `tools/decor/maquette.mjs` (fonction `composer`), à transcrire dans `15-decor.js`.

## Le sol de référence (`composer`, § 3.5)

`K = 900`, `Z0 = K / (h − yh)` (le bas de l'écran suit le plateau au facteur 1), point de fuite sous le soleil.
Rangée de l'horizon : jaune (sous le soleil) ou brasier, tramés à 50 % sur sang. Puis, par rangée : lueur de
l'horizon (ambre sous le soleil, brasier ailleurs, 50 % sur 3 rangées puis 25 % → 0 sur 17), cône du soleil
(sang tramé, brasier tramé à 25 % au cœur), grille de lignes **pleines d'un pixel** (tramées vers l'horizon),
éclairées en brasier jusqu'à 55 % de la largeur autour du soleil (ambre au centre), violet ailleurs ; puis le
reflet du soleil (colonne de 24 à 48 px, décalage `⌊2 sin(y × 0,7 + t × 3)⌉`, encres de `sol.reflet`).
Toute lumière posée par-dessus une autre couche passe par `sombreAutour` : jamais sur un pixel dont un voisin
est déjà vif, ce qui interdit de fermer un bloc 3 × 3.

## Ce que mesure la maquette (décor seul, sans entités ni HUD)

`maquette.mjs --verifie`, iPhone paysage 422 × 195, 15 positions de caméra par quartier :

| Quartier | Lumineux en `calme` | Luminance moyenne min | Changés en 1 s, caméra fixe | Changés en 0,5 s, croisière |
|---|---|---|---|---|
| LES DOCKS | 22,5 à 24,7 % | 0,104 | 4,2 % | 47,8 % |
| L'ARTÈRE | 20,7 à 23,2 % | 0,087 | 4,4 % | 49,2 % |
| LA CENTRALE | 20,5 à 23,0 % | 0,085 | 3,5 % | 43,4 % |
| LE CIEL | 19,2 à 21,6 % | 0,094 | 4,1 % | 52,6 % |
| LES TOURS | 20,5 à 22,3 % | 0,098 | 3,7 % | 51,5 % |
| LE CŒUR | 18,5 à 22,2 % | 0,081 | 3,6 % | 51,1 % |
| L'ÉCLIPSE | 18,8 à 22,6 % | 0,073 | 3,3 % | 49,2 % |

Cible du plan : 18 à 28 % de pixels lumineux, luminance ≥ 0,06, vide < 30 % (mesuré : ≤ 5,3 %), 0 cyan,
0 magenta ni rose pâle, 0 bloc 3 × 3 vif (6 états × 3 orientations), ≥ 3 % et ≥ 15 % de pixels changés.
Intersection sur union des masques de cité : 0,48 au plus (docks / cœur), sous le seuil de 0,5.

**À savoir pour régler** : en `montee` la lumière monte (19 à 27 %) ; en `chaos` elle reste proche de `montee`
(le soleil descend sur l'horizon), ce sont les entités et les explosions qui portent le passage à 32 % ; en
`colosse` le décor seul descend à 16-23 % (soleil éclipsé), le CYCLOPE et ses tirs complètent. En portrait le
décor seul fait 15 à 19 % en `calme`. La marge vers 18 % est étroite pour LE CŒUR : si un réglage retire de
la lumière, compenser par `lueur` dans `CIELS.coeur` de `genere.mjs`.
