# art/sprites — le nouveau bestiaire et LE CYCLOPE

*Fabriqué par `node tools/sprites2/genere.mjs` (aucune dépendance, aucun hasard : relancer donne les mêmes
octets). Ce fichier est écrit par le script : ne le corrigez pas à la main, corrigez le script. Les sources
du dessin sont `tools/sprites2/bestiaire.mjs` et `tools/sprites2/cyclope.mjs`.*

Ce sont des **actifs à brancher** par les lots 6a et 6b (`40-sprites.js`), 4a et 4b (`72-ennemis.js`) et 5b
(`73-colosse.js`). Rien dans `src/` ne les charge encore.

## Le format

- **Une planche PNG par sprite.** Colonnes = images d'animation (0, 1, …), rangées = directions. L'image
  `(dir, img)` est le rectangle `x = img × w`, `y = dir × h`, de taille `w × h`.
- **PNG indexé, palette exacte du jeu** : les 16 entrées de la PLTE sont les 16 encres de `DIRECTION.md` dans
  l'ordre de `00-pal.js` (vide, nuit, ardoise, violet, indigo, magenta, rose pâle, cyan, cyan pâle, ambre,
  jaune, brasier, os, acier, sang, nuit profonde). **L'index 0 est transparent** (tRNS), comme dans le format
  `{w, h, data}` de `N.spr.make` : l'index lu dans le PNG est directement l'index du jeu, sans conversion.
  L'encre « vide » n'est donc jamais posée dans un sprite.
- **Directions** : 0 = vers la droite, puis sens des aiguilles d'une montre à l'écran (4 = bas, 8 = gauche,
  12 = haut), comme `N.spr.get(nom, dir, img)`. Les seize directions sont **déjà tournées** (RotSprite, la
  même chaîne que `genFleche` de 40-sprites.js : carte pointe en haut, rotation, ombrage avec la lumière
  toujours en haut à gauche, puis contour) et **déjà détourées** : ne les retournez pas, ne leur ajoutez pas
  de contour. Un sprite à une seule rangée n'a pas d'orientation.
- **Ancre** `(cx, cy)` : le pixel qui se pose sur la position de l'objet : `blit(s, x − cx, y − cy)`. Pour les
  sprites orientés, c'est le centre de rotation.
- **Les tailles comprennent le contour** d'un pixel en nuit profonde (une carte de 13 × 13 fait un sprite de
  15 × 15), comme dans 40-sprites.js. Elles sont **celles du catalogue figé** `N.ids.sprites`
  (`src/03-socle.js`) : le script le relit et refuse tout écart.
- **« hors »** : un état ou une variante en plus du catalogue figé (l'état est dans le nom, comme le veut le
  contrat : `fleche:elite:nue`, `colosse:oeil:vise`). Le lot qui les branche demande leur entrée au gardien
  (`N.ids.sprites`) ; sans elle, `N.spr.get` rend le repli procédural, et rien ne casse.
- `catalogue.json` donne tout cela en machine : fichier, taille, ancre, directions, images, lot, rôle, points
  d'attache, et l'assemblage du CYCLOPE.
- **Le chargement** : `build.mjs` n'injecte que les PNG posés directement dans `art/`. Pour ces planches,
  le lot qui les branche choisit : les faire injecter (demande à l'intégrateur, qui tient `build.mjs`), ou
  recopier leurs index dans 40-sprites.js. Le script est la source : la recopie se régénère.

## Les règles tenues (vérifiées à chaque fabrication)

- 58 sprites écrits dans art/sprites/ (38 du catalogue figé, 20 en plus, marqués « hors catalogue »)
- Silhouettes, masques d encre, SANS la gaine (planche en niveaux de gris) : pire paire mine/sentinelle à 0.56 ; 0 paires sur 90 à 0,6 ou plus
- Silhouettes, masques AVEC la gaine de nuit profonde : pire paire mine/sentinelle à 0.79 ; 29 paires sur 90 à 0,6 ou plus : mine/sentinelle 0.79, sentinelle/lame 0.79, sentinelle/traqueur 0.79, mine/lame 0.78, mine/traqueur 0.78, larve/planeur 0.78, lame/traqueur 0.77, dard/rival 0.74, fleche/mine 0.74, ruche/ruche:elite 0.73, tourelle/traqueur 0.71, tourelle/lame 0.70, mine/rival 0.70, tourelle/fleche:elite 0.69, larve/rival 0.67, fleche/lame 0.64, mine/dard 0.64, fleche/sentinelle 0.63, dard/lame 0.63, mine/tourelle 0.62, tourelle/lame:deployee 0.62, fleche/traqueur 0.62, sentinelle/dard 0.62, sentinelle/rival 0.61, tourelle/sentinelle 0.61, tourelle/ruche 0.61, traqueur/fleche:elite 0.60, fleche/larve 0.60, lame:deployee/fleche:elite 0.60
- Aucun pixel cyan ni cyan pâle dans aucune planche ; 100 % des pixels dans la palette (l'écriture refuse
  tout index hors des seize).
- Contour : sur toutes les menaces, 100 % des pixels de bord (voisins d'un transparent, coins compris, ou
  sur le cadre) sont en nuit profonde, dans toutes les directions et toutes les images.
- **Silhouettes** : le critère des lots 6a et 6b se lit sur la planche en niveaux de gris, où la gaine de
  nuit profonde se confond avec le fond ; mesuré ainsi, aucune paire n'atteint 0,6. Compté AVEC la gaine,
  des sprites compacts de 13 à 15 px se recouvrent forcément : même les quatre sprites de la démo dépassent
  0,6 entre eux (flèche / mine 0,74). Les deux mesures sont dans `tools/sprites2/out/rapport.txt`.
- Rien n'est cyan ; le cyan reste à la joueuse. La forme dit la famille : pointes pour ceux qui foncent
  (dard, lame, flèche blindée), pattes pour la larve, pétales pour la ruche, perles pour le RIVAL, aile pour
  le planeur, disque à œil pour le traqueur.

## Ce qui n'est pas un fichier

- **La rémanence RAPIDE** n'est pas un sprite (contrat, § 7) : c'est le sprite du type posé en sang tramé
  (`blit` avec `ci` sang, une image sur deux en damier de Bayer à 50 %), deux fois, en retard de 1 et 2 images.
- **L'état `proie` de l'INVERSION** : ardoise pleine, contour rose pâle, gaine de nuit profonde. Se fait au
  vol sur n'importe quel sprite : tout pixel d'encre devient ardoise, sauf ceux qui touchent la gaine, qui
  deviennent rose pâle ; la gaine reste. Le dernier temps clignote en os (`ci`).
- **La LAME en récupération** (« corps rose pâle ») : `blit` de `lame` avec `ci` rose pâle sur les pixels
  d'encre (la gaine reste) ; ou la table magenta → rose pâle, sang → magenta.
- **Les silhouettes de décor du CYCLOPE** (`colosseLoin`, `colosseMi`) sont faites par le lot du décor :
  `art/decor/colosse-loin.png` et `art/decor/colosse-mi.png`.
- **Les télégraphes** (lignes, losanges, ombre de 40 px des BONDS, arcs du RAYON BALAYANT) sont dessinés par
  `N.fx.tele`, pas par des sprites.

## LE CYCLOPE, assemblé

Le corps mesure **96 × 128** (REFONTE.md § 4.8). Dans ce cadre (origine = coin haut gauche du sprite
posé), du fond vers l'avant :

| pièce | sprite | position | remarque |
|---|---|---|---|
| tronc | `colosse:tronc` (phases 1 et 2), `colosse:tronc:colere` (phase 3) | (0,32) | 96 × 96 ; ses alvéoles de machinerie sont sous les plaques, ses douilles de poignet sous les mains |
| tête | `colosse:tete` | (28,0) | 40 × 32 ; l'orbite est vide |
| œil | `colosse:oeil`, `:oeilFerme`, `:oeil:vise`, `:oeil:charge`, `:oeil:colere`, `:oeil:mort` | (42,13) | centre (48,17) ; **seul point faible avec les mains** |
| mains | `colosse:main`, direction 4 (elles pendent), image 0 | (2,105) et (70,105) | en phase 2 elles se détachent : image 1 (lame) dans la direction de la charge |
| plaques | `colosse:plaque` ×6 | (12,45), (72,45), (32,50), (52,50), (27,95), (57,95) | épaulières, poitrine, tassettes ; tombent en phase 2 et restent au sol |

**Par phase** :

- **Entrée** (2,2 s du plan P5 au plateau, du sang au magenta) : l'assemblage de la phase 1 posé d'abord avec
  la table OMBRE (magenta -> sang, rose pâle -> sang, sang -> nuit, brasier/jaune/os gardés), puis sans table.
- **Phase 1, LE REGARD** : tronc, tête, mains pendantes, six plaques. L'œil alterne `oeilFerme` → `oeil:vise`
  (0,9 s avant le RAYON) ou `oeil:charge` (0,8 s avant la SALVE) → `oeil` ouvert 1,4 s après chaque attaque.
- **Phase 2, LES MAINS** : les plaques tombent et restent au sol, posées avec la table SOL
  (magenta -> sang, rose pâle -> magenta, sang -> nuit), et découvrent les alvéoles ;
  les mains quittent les poignets (les douilles brillent) et chargent en lame (`colosse:main`, image 1, dans
  la direction de la charge).
- **Phase 3, LA COLÈRE** : `colosse:tronc:colere` (fissures de brasier, alvéoles chauffées, cœur jaune) et
  `oeil:colere` quand il est ouvert ; c'est aussi l'œil de l'enragement (« LE CYCLOPE S'EMBALLE »).
- **Mort** : `colosse:carcasse` (96 × 64, ancre au milieu du bas du torse) tombe dans le plan des structures.
- Zones frappables : rayon 6 autour de (48, 17), seulement œil ouvert ; rayon 10 autour du centre de chaque main.

## Ennemis

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `dard` | `dard.png` | 15 × 15 | (7, 7) | 16 | 2 | oui | DARD, le coupeur : deux fourches avant ouvertes (l inverse de la flèche), tuyère qui crache ; cœur sang |
| `larve` | `larve.png` | 9 × 9 | (4, 4) | 16 | 2 | oui | LARVE, la nuée : éclat à mandibles et pattes qui grouillent ; mord la queue |
| `traqueur` | `traqueur.png` | 15 × 15 | (7, 7) | 1 | 4 | oui | TRAQUEUR : petit disque tout en œil fendu (os, pupille verticale), halo de 8 tirets qui tourne (4 images, 1/8 de tour) |
| `lame` | `lame.png` | 15 × 15 | (7, 7) | 16 | 2 | oui | LAME au repos : trois lames repliées en crochets autour d un noyau sombre |
| `lame:deployee` | `lame-deployee.png` | 21 × 21 | (10, 10) | 16 | 2 | oui | LAME déployée : trois faux qui fauchent large ; la direction fait tourner la faux |
| `ruche` | `ruche.png` | 23 × 23 | (11, 11) | 1 | 2 | oui | RUCHE, pétales fermés : un bouton rond de six pétales magenta |
| `ruche:p1` | `ruche-p1.png` | 23 × 23 | (11, 11) | 1 | 2 | oui | RUCHE, pétales mi-ouverts (0,7 s d ouverture) : le cœur alvéolé paraît |
| `ruche:p2` | `ruche-p2.png` | 23 × 23 | (11, 11) | 1 | 2 | oui | RUCHE, pétales ouverts : le cœur blanchit, la couvée part |
| `ruche:elite` | `ruche-elite.png` | 25 × 25 | (12, 12) | 1 | 2 | oui | RUCHE INSTABLE : pétales sang à nervure de brasier, six épines, cœur brasier et jaune qui bat |
| `ruche:elite:p2` | `ruche-elite-p2.png` | 25 × 25 | (12, 12) | 1 | 2 | **hors** | RUCHE INSTABLE, pétales ouverts (couvée) |
| `rival` | `rival.png` | 11 × 11 | (5, 5) | 16 | 2 | oui | RIVAL, tête : mâchoires en V qui claquent, deux yeux os ; il porte la couronne |
| `rival:coupe` | `rival-coupe.png` | 11 × 11 | (5, 5) | 16 | 2 | **hors** | RIVAL, coupe-route annoncé 0,5 s : la tête passe au rose pâle (télégraphe) |
| `rival:perle` | `rival-perle.png` | 7 × 7 | (3, 3) | 1 | 2 | oui | RIVAL, perle du corps : sang à cœur magenta, éclat rose pâle qui coule (image = indice + compteur) |
| `planeur` | `planeur.png` | 9 × 9 | (4, 4) | 16 | 2 | oui | PLANEUR : aile en chevron ouvert, rose pâle et sang, bouts d aile qui clignotent |
| `fleche:elite` | `fleche-elite.png` | 19 × 19 | (9, 9) | 16 | 2 | oui | FLÈCHE BLINDÉE : la flèche à 19 px, cinq pattes, visière, plaques de sang à rivets rose pâle |
| `fleche:elite:nue` | `fleche-elite-nue.png` | 19 × 19 | (9, 9) | 16 | 2 | **hors** | FLÈCHE BLINDÉE sans ses plaques (après 50 % des PV) : alvéoles sombres, pattes qui trottinent vite |

## Marques des élites et des modificateurs

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `couronne` | `couronne.png` | 23 × 23 | (11, 11) | 1 | 4 | oui | couronne des élites (et du RIVAL) : 12 tirets rose pâle qui tournent ; posée SOUS le sprite, centrée |
| `plaque` | `plaque.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | plaque de BLINDÉ : sang à rivet rose pâle, arête haute magenta ; 2 à 4 par ennemi, puis débris 3 s au sol |
| `plaque:debris` | `plaque-debris.png` | 5 × 5 | (2, 2) | 1 | 4 | **hors** | éclats de plaque qui restent au sol 3 s (quatre formes, à tirer par ennemi) |
| `instable` | `instable.png` | 5 × 5 | (2, 2) | 1 | 4 | **hors** | marque INSTABLE : cœur de brasier qui bat (4 images : repos, montée, éclat, retombée), posé au centre |

## Convois

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `wagon` | `wagon.png` | 18 × 14 | (8, 6) | 1 | 2 | oui | wagon de convoi vers la droite : caisse sang, arêtes magenta, nervures, feux qui alternent |
| `wagon:tete` | `wagon-tete.png` | 18 × 14 | (8, 6) | 1 | 2 | oui | wagon de tête vers la droite : museau rose pâle qui pulse (sous 3 Hz), phares os |
| `wagon:g` | `wagon-g.png` | 18 × 14 | (8, 6) | 1 | 2 | **hors** | wagon roulant vers la gauche (miroir exact) |
| `wagon:tete:g` | `wagon-tete-g.png` | 18 × 14 | (8, 6) | 1 | 2 | **hors** | wagon de tête roulant vers la gauche (miroir exact) |

## Portails

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `portail` | `portail.png` | 7 × 7 | (3, 3) | 16 | 1 | oui | chevron de portail : magenta à pointe rose pâle, pointe vers l apparition ; porte la mini-silhouette à côté |
| `portail:double` | `portail-double.png` | 11 × 11 | (5, 5) | 16 | 1 | **hors** | chevron double : portail d élite (et marqueur permanent de l élite et du RIVAL) |
| `portail:triple` | `portail-triple.png` | 13 × 13 | (6, 6) | 16 | 1 | **hors** | chevron triple : portail du CYCLOPE, annoncé 1,4 s avant (et son marqueur hors champ) |
| `portail:sol` | `portail-sol.png` | 15 × 15 | (7, 7) | 1 | 6 | **hors** | portail au point d apparition : anneau qui s ouvre en 600 ms (6 images de 100 ms), éclat os à la fin |
| `portail:sol:elite` | `portail-sol-elite.png` | 21 × 21 | (10, 10) | 1 | 6 | **hors** | portail d élite, même rythme, plus grand |

## Mini-silhouettes du radar et des chevrons

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `mini:fleche` | `mini-fleche.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette fleche (5 × 5, rose pâle, sans contour) |
| `mini:dard` | `mini-dard.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette dard (5 × 5, rose pâle, sans contour) |
| `mini:larve` | `mini-larve.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette larve (5 × 5, rose pâle, sans contour) |
| `mini:mine` | `mini-mine.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette mine (5 × 5, rose pâle, sans contour) |
| `mini:tourelle` | `mini-tourelle.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette tourelle (5 × 5, rose pâle, sans contour) |
| `mini:lame` | `mini-lame.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette lame (5 × 5, rose pâle, sans contour) |
| `mini:ruche` | `mini-ruche.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette ruche (5 × 5, rose pâle, sans contour) |
| `mini:sentinelle` | `mini-sentinelle.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette sentinelle (5 × 5, rose pâle, sans contour) |
| `mini:rival` | `mini-rival.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette rival (5 × 5, rose pâle, sans contour) |
| `mini:planeur` | `mini-planeur.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette planeur (5 × 5, rose pâle, sans contour) |
| `mini:traqueur` | `mini-traqueur.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette traqueur (5 × 5, rose pâle, sans contour) |
| `mini:cyclope` | `mini-cyclope.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette cyclope (5 × 5, rose pâle, sans contour) |
| `mini:convoi` | `mini-convoi.png` | 5 × 5 | (2, 2) | 1 | 1 | oui | mini-silhouette convoi (5 × 5, rose pâle, sans contour) |

## Marqueurs permanents hors champ

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `marque:mine` | `marque-mine.png` | 7 × 7 | (3, 3) | 1 | 2 | **hors** | marqueur de mine armée hors champ, de près : rond à cœur qui clignote (2 Hz : image = cycle) |
| `marque:mine:loin` | `marque-mine-loin.png` | 3 × 3 | (1, 1) | 1 | 2 | **hors** | marqueur de mine, de loin (3 px) |
| `marque:pastille` | `marque-pastille.png` | 7 × 7 | (3, 3) | 1 | 2 | **hors** | marqueur de la PASTILLE hors champ, de près : étoile jaune (cœur os qui bat à 2 Hz) |
| `marque:pastille:loin` | `marque-pastille-loin.png` | 3 × 3 | (1, 1) | 1 | 2 | **hors** | marqueur de la PASTILLE, de loin (3 px) |

## LE CYCLOPE

| nom | fichier | taille | ancre (cx, cy) | dir. | images | catalogue figé | rôle, et ce que disent les images |
|---|---|---|---|---|---|---|---|
| `colosse:tronc` | `colosse-tronc.png` | 96 × 96 | (47, 47) | 1 | 2 | oui | tronc du CYCLOPE (phases 1 et 2) : épaulières à lames dorsales, poitrine, cœur qui respire, gantelets, jambes ; alvéoles de machinerie sous les 6 plaques ; douilles des poignets — attaches : tete [28,-32], oeil [48,-15], poignets [[13,84],[81,84]], plaques [[12,13],[72,13],[32,18],[52,18],[27,63],[57,63]], coeur [47,26] |
| `colosse:tronc:colere` | `colosse-tronc-colere.png` | 96 × 96 | (47, 47) | 1 | 2 | **hors** | tronc en phase 3, LA COLÈRE : fissures de brasier, évents et alvéoles chauffés à blanc, cœur jaune |
| `colosse:tete` | `colosse-tete.png` | 40 × 32 | (20, 17) | 1 | 2 | oui | tête à œil unique : cornes, crête, casque, pommettes, menton ; orbite vide (l œil se pose en (20, 17)) ; éclats aux cornes — attaches : oeil [20,17], ancreTronc [-28,32] |
| `colosse:oeil` | `colosse-oeil.png` | 14 × 10 | (6, 4) | 1 | 2 | oui | œil ouvert (point faible) : amande de brasier, iris jaune, pupille os ; image 1 = la lame de lumière s allonge |
| `colosse:oeilFerme` | `colosse-oeilFerme.png` | 14 × 10 | (6, 4) | 1 | 1 | oui | œil fermé : volets blindés magenta et sang, joint sombre ; les tirs ricochent |
| `colosse:oeil:vise` | `colosse-oeil-vise.png` | 14 × 10 | (6, 4) | 1 | 2 | **hors** | l œil vise (RAYON BALAYANT, 0,9 s) : iris rose pâle, pupille qui se fixe en fente |
| `colosse:oeil:charge` | `colosse-oeil-charge.png` | 14 × 10 | (6, 4) | 1 | 2 | **hors** | l œil se charge (SALVE RADIALE, 0,8 s) : os et jaune, image 1 à blanc |
| `colosse:oeil:colere` | `colosse-oeil-colere.png` | 14 × 10 | (6, 4) | 1 | 2 | **hors** | œil enragé (LE CYCLOPE S EMBALLE, et phase 3) : l iris passe au brasier |
| `colosse:oeil:mort` | `colosse-oeil-mort.png` | 14 × 10 | (6, 4) | 1 | 1 | **hors** | œil éteint, pour la carcasse |
| `colosse:main` | `colosse-main.png` | 24 × 24 | (11, 11) | 16 | 2 | oui | main-lame : image 0 griffes écartées (direction 4 : elle pend au poignet), image 1 griffes serrées en lame (charge) ; même main à gauche et à droite |
| `colosse:plaque` | `colosse-plaque.png` | 12 × 12 | (5, 5) | 1 | 1 | oui | plaque d armure (×6) : posée sur les alvéoles du tronc en phase 1, tombe en phase 2 et reste au sol (remappage SOL) |
| `colosse:carcasse` | `colosse-carcasse.png` | 96 × 64 | (47, 40) | 1 | 1 | oui | carcasse : le colosse à genoux dans les gravats, tête tombée, œil éteint, armure refroidie, braises ; tombe dans le plan des structures en 3 s |

## Les planches de contrôle

`tools/sprites2/out/` (refaites à chaque fabrication) : `planche-ennemis.png` et `planche-ennemis-gris.png`
(×4 : images de la direction 0, puis les seize directions), `planche-marques.png`, `planche-cyclope.png`,
`cyclope-assemble.png` (phases 1, 2, 3 et carcasse, indexé), et deux scènes à la taille du jeu, agrandies
×3 comme sur iPhone, sur le vrai fond `horizon.png` : `scene-bestiaire.png` et `scene-cyclope.png`. Pour
regarder une planche à la loupe : `node tools/sprites2/voir.mjs art/sprites/dard.png 10 /tmp/dard.png`.
