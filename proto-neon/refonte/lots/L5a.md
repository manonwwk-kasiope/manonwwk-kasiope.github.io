# Lot 5a — Secteur I : rapport de livraison

*Agent du lot 5a, 17 octobre 2026, contre le contrat 1.0 (`CONTRAT.md`), dans la copie `../wt/L5a` (branche
`lot/L5a`). Le lot livre le directeur des vagues (`76-directeur.js`) et le TRAVELLING (`73-arene.js`) : les
vagues V1 et V2 avec leurs formations, des apparitions justes et annoncées sur la grille de la musique, le
TRAQUEUR, la PASTILLE, la tension qui pilote la musique, et l'arène qui voyage dans le monde en poussant la
joueuse de son mur arrière. Le moteur lit tout le secteur dans `N.R.secteurs[0]` : V3 à V5, le DÉFILÉ et les
pics y tournent déjà en repli honnête, que le lot 5b n'aura qu'à approfondir.*

## Les fichiers livrés

| Fichier | Contenu |
|---|---|
| `src/76-directeur.js` | **réécrit** : le déroulé des étapes, l'entrée calme, les formations dessinées et annoncées, les apparitions justes (deux vues, murs annoncés, mur arrière à venir, revérification toutes les 4 images, déplacement et réannonce), la grille des temps, le remplissage réparti, le plafond, le TRAQUEUR, la PASTILLE, l'ordre de TRAVELLING, la traque de fin de vague, le NETTOYAGE, la soupape, la tension lissée, `progression().part` |
| `src/73-arene.js` | **réécrit** pour le TRAVELLING : mise en place (placement, glissement annoncé), annonce de 2 s, voyage, fin au bord du monde, retour au NETTOYAGE ; le mur qui avance coupe le corps et emporte les ennemis ; le dessin des chevrons, du champ de poussée et des traits de vitesse. Convois et SILLAGE restent le repli du lot 0b (lot 5b) |
| `tools/L5a/banc.mjs` | le banc des critères [U] : 20 graines × 3 profils en mode simulé, plus l'INVERSION, la soupape et le TRAQUEUR |
| `tools/L5a/chrono.mjs` | la chronologie d'une vague (portails, apparitions, vivants, tension), pour régler |
| `tools/L5a/captures.mjs` | les captures du tampon d'index (V1, V2 : MEUTE, mise en place, annonce, voyage, corps au mur, PASTILLE), et un gros plan du mur arrière |
| `tools/L5a/cout.mjs` | le coût par image du directeur et de l'arène, en mode dessiné |
| `tools/L5a/sonde.mjs` | une sonde rapide (résumé du journal d'une partie) |
| `tools/L5a/banc.json`, `banc.txt`, `banc-suivante.json`, `banc-suivante.txt` | les mesures rapportées ci-dessous |
| `tools/L5a/captures/*.png` | les captures, ignorées par git (règle du dépôt) : `node tools/L5a/captures.mjs` les refait |
| `refonte/lots/L5a.md` | ce rapport |

## Ce qui est fait

### Le directeur (`N.dir`)

- **Le déroulé.** L'ordre des étapes de `N.R.secteurs[0].ordre` ; une étape commence quand 79-jeu revient à un
  état de jeu (`jeu`, `defile`, `alerte`, `boss`, `attraction`), jamais pendant une réapparition (sinon une mort
  pendant le NETTOYAGE lançait la vague suivante trop tôt). `vague/entree`, puis les formations à leurs
  instants, puis `vague/nettoyee` (purge des derniers, retour des murs) ou `vague/soupape`.
- **L'entrée calme** (§ 4.1). Pendant `entree` secondes, seule la première formation part : les autres instants
  antérieurs sont reportés à la fin de l'entrée. **En V1, J-14** : à la toute première partie du profil
  (`N.score.profil.donnees().profil.parties === 0`), la première FILE attend le premier virage de plus de 45°,
  plus 3 s, et au plus tard 6 s ; aux parties suivantes, elle entre à + 1 s.
- **Les formations ont une forme** (§ 4.3), calculée dans un repère « sortant / en travers » puis tournée :
  FILE en colonne depuis un bord ; MEUTE en V, la pointe vers la tête ; NUÉE en spirale ; DUO et CHAMP DE MINES
  posés **sur la trajectoire anticipée**, au-delà des vues, en travers du cap (marqueurs de 1,5 s) ; PINCE par
  les **deux flancs à la fois** ; ESSAIM, GARDE, BATTERIE, ESCADRILLE (pour 5b) ; le TRAQUEUR dans le dos.
  Le côté d'entrée (devant, flanc, derrière) est tiré dans le flux `dir`, avec des poids par formation, jamais
  deux fois de suite le même huitième de tour ; en portrait, une naissance par le bas sur deux est renvoyée sur
  un flanc (§ 3.8, 6). Pendant un TRAVELLING, rien n'entre par le côté que pousse le mur arrière, et une
  formation sur deux entre **par l'avant de l'arène** : la joueuse est prise en étau entre le mur qui pousse et
  ce qui vient. `spawn` reçoit en plus `{formation, rang, cap, station}` (demande n° 7) pour que le bestiaire
  puisse faire l'entrée en arc de la MEUTE et garder les mines sur leur point.
- **Le nom, 1 s avant** : par un événement `formation` dès que le contrat le publie (demande n° 2), sinon, en
  repli, une étiquette d'une seconde du HUD (`N.hud.tag`).
- **Des apparitions justes** (§ 3.8). Un point est valide s'il est hors de la vue courante **et** de la vue
  anticipée (1,15 s, et plus pour les portails longs) avec 24 px de marge, à plus de 48 px de la tête, à 16 px
  à l'intérieur des murs courants, des murs annoncés (un glissement en cours) et du mur arrière **tel qu'il
  sera** à la naissance (sa marche pendant le portail, plus 1 s). La recherche fait quatre passes de moins en
  moins prudentes : hors de toutes les vues anticipées possibles (la joueuse peut tourner), la moitié de cette
  enveloppe, une marge de sécurité de 56 px, puis la seule marge du plan ; devant la tête, le point recule de
  la marche de la tête pendant le portail. Revérifié toutes les 4 images ; un point devenu mauvais est déplacé
  **à sa place dans la formation**, du même côté, et réannoncé avec 600 ms pleines ; faute de point,
  l'apparition attend ; au plafond dur, elle attend aussi.
- **Sur la grille.** Chaque portail dure au moins 600 ms (1,5 s pour les mines et le TRAQUEUR) et se termine
  sur un temps de la grille de jeu (144,6 BPM) ; les membres d'une formation s'égrènent en peigne sur les
  demi-temps (FILE) ou les quarts de temps (MEUTE, NUÉE) qui suivent ; la PINCE et les mines tombent ensemble.
- **Le plafond** de la vague (vivants + portails, TRAQUEUR à part) : une formation attend d'avoir sa place
  entière, puis part en partie au-delà de 3 s d'attente.
- **Le remplissage** (« FILE pour remplir ») : le quota que les formations ne couvrent pas est réparti, par
  formations entières, entre la fin de l'entrée et 5,5 s avant la durée nominale, seulement quand la densité
  est basse ; le reste part à la fin. La vague ne finit donc ni trop tôt, ni sur un remplissage d'un coup.
- **La fin** : quota apparu, plus aucun portail, et au plus 2 ennemis qui viennent à la joueuse — le TRAQUEUR et
  les mines posées ne retiennent pas la vague (la purge les emporte), sinon un champ de mines resté hors de vue
  bloquait la vague jusqu'à la soupape. **La soupape** à durée + 12 s : les survivants fuient (`fuir`),
  `vague/soupape`, puis purge et `vague/nettoyee` 1,5 s plus tard, parce que 79-jeu ne passe au NETTOYAGE que
  sur `nettoyee` (demande n° 3).
- **Le TRAQUEUR** (V2 à V5) : 7 s sans rien détruire ni ramasser, **quand il y a de quoi faire** (un ennemi ou
  du butin), ouvrent son portail de 1,5 s dans le dos de la joueuse ; un second suit 6 s plus tard si l'attente
  dure ; deux au plus.
- **La PASTILLE** (§ 2.17) : à son instant (`+20 s` en V2), à 160 px au moins de la tête, à l'intérieur de
  l'arène et devant le mur arrière **pour toute sa vie de 12 s**, loin des mines et des ennemis, de préférence
  hors de la vue (c'est l'étoile du radar qui la montre).
- **L'INVERSION** : les apparitions attendent (horloge des formations, portails et TRAQUEUR gelés) ; à la fin,
  les portails en attente sont réannoncés.
- **La traque de fin de vague** (Cruise Elroy) : sous 20 % du quota restant, `N.dir._elroy()` rend 1,3, pour le
  bestiaire (demande n° 4).
- **Les ordres de TRAVELLING** : commandés pour **partir à l'instant** de la vague (+12 s en V2) après une mise en
  place de 3 s et une annonce de 2 s ; si la tête est trop près d'un bord du monde pour être contenue avec 80 px,
  la mise en place attend et se raccourcit (2 s au moins) pour partir quand même à l'heure.
- **La tension** (`N.dir.tension()`) : une plage par vague (V1 0,12 → 0,42 ; V2 0,30 → 0,84 ; jusqu'au CYCLOPE),
  parcourue par l'**arc de la vague** (temps et formations lâchées, comme une section de morceau), la densité,
  les télégraphes proches de la tête et la pression au contact ; + 0,05 quand le plateau avance ; 0,72 au
  moins pendant l'INVERSION (filtre grand ouvert) ; retombée au NETTOYAGE ; 0,32 pendant LE VOL ; lissée sur
  le temps de jeu (montée 1,2 s, descente 2,5 s). V1 reste sous le seuil des percussions (0,6) ; V2 le franchit
  à ses pointes : les couches PERCU entrent et sortent avec la vague.
- `progression().part` donne enfin l'avancée du secteur (étapes faites, plus l'avancée de l'étape), pour la barre
  de secteur et l'écran de fin.
- Un seul flux de hasard (`dir`), aucune allocation par image (portails et membres réutilisés), aucun chiffre en
  dur : ce que `N.R` ne donne pas est dans `LOC`, marqué « → N.R ».

### L'arène qui voyage (`N.arene`, TRAVELLING)

- **La mise en place** : l'arène de 576 px de large est placée pour contenir la tête avec 80 px de marge au
  moins, la tête à 30 % de la largeur depuis le mur arrière (qui reste ainsi en vue), et part vers le côté où il
  reste le plus de monde ; les murs latéraux glissent des bords du monde par `N.world.arena`, position finale
  hachurée dès le premier instant (par 15-decor). `travelling(vx, depuis)` garde la signature du contrat :
  `'auto'`, `'gauche'`, `'droite'` ou un `x0`.
- **L'annonce** : `arene/travellingAnnonce`, 2 s de **trois rangs de chevrons qui défilent vers l'avant** sur le
  mur arrière, tous rose pâle dans les 300 dernières ms (le QUAND des télégraphes) ; si le mur arrière est hors
  de la vue, une colonne de chevrons bat au bord de l'écran, de son côté, pendant l'annonce, au départ, puis
  chaque fois qu'il revient à moins de 96 px du bord (rose pâle sous 48 px). 79-scene en fait le grondement et
  « LE PLATEAU AVANCE ».
- **Le voyage** : `arene/travelling`, `N.world.travelling({largeur, vx signé, depuis: x0})`, jusqu'au bord du
  monde (`arene/fin`). Devant le mur arrière, un **champ de poussée** tramé en trois colonnes (50, 25, 12 %), des
  **traits de vitesse** qui partent du mur et refroidissent du rose pâle au sang, un rang de chevrons qui glisse
  et bat sur le temps ; le pan du mur s'allume en rose pâle quand un segment du corps s'en approche à moins de
  24 px.
- **Le mur qui avance coupe et emporte** : tout segment du corps au contact d'un mur qui avance vers
  l'intérieur est coupé (`N.joueuse.couper(k, {genre:'arene', type:'murMobile'})`) ; tout ennemi dépassé meurt
  sans butin ni score (`N.ennemis.hit(e, …, {genre:'decor', type:'mur'})`). La tête, elle, meurt au mur comme
  partout (70-joueuse, par `distMur`).
- **Le retour** au NETTOYAGE (et à la soupape) : les murs reviennent aux bords du monde en 2 s.

## Les critères d'acceptation [U]

Mesurés par `node tools/L5a/banc.mjs` sur la page d'essai (`tools/L5a/index.html`, squelettes des autres lots),
mode simulé, **20 graines × 3 profils** (iPhone 13 paysage 844 × 390, portrait 390 × 844, bureau 1440 × 900),
soit 60 parties de V1 + VOL + V2, plus 20 parties « profil qui a déjà joué » (`--suivante`). La joueuse du banc
est le pilote de repli des squelettes rendu invulnérable, qui va au contact des ennemis, plus une « main » qui
détruit ce qu'elle voit depuis 0,8 s à moins de 150 px (un CANON correct) : ce n'est pas un pilote de la
spécification gelée, c'est ce dont le directeur a besoin pour que les vagues se vident.

| Critère | Seuil | Résultat |
|---|---|---|
| Apparitions dans la vue | 0 sur 20 graines × 3 profils | **tenu** : 0 sur 6 801 apparitions (la vue est journalisée à la naissance) |
| Portails | 600 ms annoncés pour au moins 99 % des apparitions | **tenu** : 100 % ; 14 % des apparitions ont été déplacées pendant leur portail, et réannoncées avec 600 ms pleines |
| Distance à la tête | 0 sous 48 px ; 0 derrière le mur arrière | **tenu** : 0 et 0 |
| Respiration | après chaque pic, au moins 8 s sous 40 % de ce pic | **tenu** : 8,9 s au plus court (pics de 6 à 10 vivants en V1, de 13 à 16 en V2 : ils croissent dans 100 % des parties) |
| Vague 1 : aucun tir ennemi | 0 | **tenu** : 0 sur 80 parties |
| Vague 1 : première menace avant 0:20 | 100 % des graines | **tenu** : 80 / 80 (le DUO DE MINES naît à 15,8 s de jeu, la PINCE vers 17,8 s) |
| Vague 1 : durée | 22 s ± 2 | **tenu en médiane, pas partout** : médiane 21,5 s (première partie) et 20,8 s (parties suivantes) ; 74 parties sur 80 entre 20 et 24 s ; extrêmes 19,9 et 25,1 s, quand le plafond de 10 vivants (une NUÉE qui traîne autour de la queue) retarde la PINCE et le remplissage |
| TRAVELLING annoncé 2 s avant | 2 s | **tenu** : 2,008 s (2 s plus un pas) |
| TRAVELLING : départ à + 12 s en V2 | 12 s | **tenu** : 12,00 s dans 100 % des parties |
| TRAVELLING : la tête à 80 px des murs à la création | ≥ 80 px | **tenu** : 150,9 px au plus juste (murs latéraux, ceux que l'arène crée ; la marge verticale, celle des murs du monde, descend à 48,5 px) |
| PASTILLE | + 20 s en V2, ≥ 160 px de la tête, dans l'arène | **tenu** : 20,01 s ; 170 px au plus près ; 100 % dans l'arène |
| Zéro erreur | `__ERR.count = 0`, console vide | **tenu** : 0 sur toutes les parties, en mode vérification du bus aussi ; fumée de 60 s en mode dessiné sur les 3 profils (morts et réapparitions comprises) : 0 |

Mesuré en plus :

| Mesure | Résultat |
|---|---|
| Plateau en mouvement pendant V2 (R-31 vise 25 % de V2 à V5) | 43 % au moins, 70 % en moyenne |
| Durée de V2 (nominale 42 s) | 36,6 à 40,4 s avec la joueuse du banc |
| TRAQUEUR (V2 sans rien faire) | portail ouvert à 7,0 s d'inaction (8,09 s après l'entrée : l'inaction compte dès que le butin du début est là) ; le second 6,0 s plus tard ; portails de 1,66 à 1,86 s (1,5 s posés sur la grille) |
| INVERSION de 6 s à + 10 s en V2 | 0 apparition pendant ; les portails en attente réannoncés à la fin ; les apparitions reprennent après |
| Soupape (V1 sans rien détruire) | `soupape` à 34,0 s (22 + 12), `nettoyee` 1,5 s plus tard, puis NETTOYAGE et cartes |
| Reproductibilité | deux parties de même graine : journal (vagues, portails, apparitions, arène) identique ; graine différente : différent |
| Tension | V1 : sommet entre 0,30 et 0,33 (jamais les percussions) ; V2 : sommet entre 0,62 et 0,72, au-dessus de 0,6 pendant 17 à 19 % de la vague ; corrélation avec le nombre de vivants : 0,74 à 0,80 en V1, 0,48 à 0,51 en V2 (l'arc de la vague y pèse plus que la densité) |
| Coût par image (`cout.mjs`, V2, plateau en marche, mode dessiné) | directeur + arène (deux pas) + dessin de l'arène : p50 0,0 ms, **p95 0,2 ms** (budget « butin, directeur, arène, colosse » : 0,3 ms) ; des pointes de 1 à 2 ms quand une formation part, surtout dans les consommateurs de `portail` (sons, HUD), et des pauses du ramasse-miettes, sans allocation par image dans ces deux fichiers |
| Contrat | `tools/contrat/contrat.mjs` sur la page d'essai, 3 profils : socle, palette, règles, modules **tous réussis** ; interdits (Math.random, N.rnd, couleurs, horloge murale) : aucun dans les deux fichiers |

Captures (`tools/L5a/captures/`, tampon d'index sans le tube, refaites par `captures.mjs`) : `paysage-v2-annonce.png` (les trois rangs de
chevrons sur le mur arrière pendant « LE PLATEAU AVANCE »), `paysage-v2-voyage.png` et
`paysage-v2-voyage-corps-mur.png` (champ de poussée, traits de vitesse, chevrons, pan allumé par le corps),
`portrait-v2-voyage.png` (le mur arrière juste hors de la vue, signalé au bord droit), `paysage-v2-meute.png`,
`paysage-v1-formations.png`, et leurs pendants.

## Les écarts et les interprétations

- **Les mines et le TRAQUEUR ne retiennent pas la fin d'une vague.** Le plan dit « au plus 2 ennemis vivants » ;
  un champ de mines posé hors de vue (et qui ne vient jamais à la joueuse) bloquait V2 jusqu'à la soupape dans
  toutes les parties. La purge les emporte. À trancher par le gardien (demande n° 9).
- **Le quota de V2 est dépassé par ses formations** : 3 MEUTES, 2 CHAMPS, 3 PINCES et 2 NUÉES font 54 à 58
  ennemis pour un quota de 48. Le quota est traité comme un plancher (le remplissage le complète, V1) ; les
  formations ne sont jamais tronquées. Au lot 9 de réconcilier les chiffres.
- **Le TRAQUEUR ne compte l'inaction que quand il y a de quoi faire** (un ennemi vivant ou du butin) : une
  attente imposée par le directeur ne doit pas être punie.
- **La marge de 80 px du TRAVELLING** porte sur les murs latéraux, ceux que l'arène crée ; la hauteur de l'arène
  est celle du monde, ses murs haut et bas ne bougent pas.
- **Le rang de chevrons au bord de l'écran** quand le mur arrière est hors de la vue n'est pas dans le plan : il
  répond à « jouable sans le son » (R-27) et à la mort juste quand la joueuse ne voit pas le mur (en portrait,
  la vue ne fait que 195 px de large : le mur arrière en sort vite).
- **La durée de V1** dépend de la vitesse de la joueuse : le remplissage la cale sur 22 s pour une joueuse qui
  détruit vite (banc) ; le pilote bon du lot P donnera la vraie médiane (R-35 : 24 s au plus).
- **Les réannonces** (un point devenu mauvais pendant son portail est déplacé et annoncé de nouveau) : 14 %
  des apparitions, surtout quand la joueuse fonce vers un portail ou fait demi-tour ; le chevron saute alors,
  du même côté. C'est la règle du plan (« faute de point valide, l'apparition attend ») ; une marge plus grande
  les raréfierait encore, au prix d'ennemis plus lents à arriver.

## Demandes au gardien

| N° | Demande | Raison | Repli dans le code |
|---|---|---|---|
| 1 | Reporter dans `N.R` les valeurs locales marquées « → N.R » : `LOC` de `76-directeur.js` (marges de sécurité, écarts et formes des formations, peignes, poids des côtés, étau, remplissage, PASTILLE, TRAQUEUR au plus, soupape, plages et poids de la tension) et de `73-arene.js` (place de la tête, contact, chevrons, champ de poussée, traits) — par exemple sous `N.R.secteurs[0].directeur` et `N.R.arene.travelling.dessin` | aucun chiffre de jeu hors de `02-regles.js` | `LOC` local |
| 2 | Un événement **`formation`** `{nom, premiere}` émis par `76-directeur` 1 s avant une formation ; consommateurs 60 `79-scene` (bannière à la première rencontre du profil, étiquette sinon), 70 `78-hud`, 90 journal | § 4.3 : « nommées, annoncées 1 s avant » ; aucun événement ne le porte | `N.hud.tag(nom)` (étiquette d'une seconde), sans profil |
| 3 | `79-jeu` passe au NETTOYAGE sur **`vague/soupape`** aussi ; `77-score` ne donne ni bonus de vague ni PARFAIT après une soupape | § 4.1 : « pas de bonus » ; sinon la soupape bloque la partie | `nettoyee` émis 1,5 s après `soupape` (le squelette de 77-score donne alors le bonus à tort) |
| 4 | Rendre public **`N.dir.elroy()`** (1 ou 1,3) et le faire lire par `72-ennemis` pour les dernières flèches | § 4.2, la traque de fin de vague | `N.dir._elroy()` |
| 5 | **`79-jeu.draw()` appelle `N.arene.draw()`** après `decor.drawPlateau` et `drawFront`, avant le butin | les chevrons du mur arrière, le champ de poussée (et les voies du lot 5b) ne sont jamais dessinés | la page d'essai l'ajoute (captures) |
| 6 | Fixer la sémantique de **`N.world.travelling({largeur, vx, depuis})`** (lot 1) : `depuis` numérique = `x0` de l'arène au départ (aucun saut), `vx` signé (négatif : vers la gauche) | 73-arene place l'arène lui-même, puis la lance de là où elle est | conforme au squelette du lot 0b |
| 7 | Ajouter aux options de **`N.ennemis.spawn`** : `formation` (nom), `rang`, `cap` (direction de la tête à la naissance) et `station` `{x, y}` (mines) | l'entrée en arc de la MEUTE à la Galaga, la colonne de la FILE, les mines qui restent sur la trajectoire | passées dès maintenant ; le squelette les ignore |
| 8 | Publier dans le contrat les méthodes de `N.arene` dont `N.dir` se sert : `retour(dur)` (aujourd'hui `_retour`), `commande(vx, depuis, miseEnPlace, force)` (`_travelling`), `sens()`, `vitesse()` | le directeur doit savoir où sera le mur arrière avant qu'il bouge, et rendre les murs au NETTOYAGE | méthodes privées, entre les deux fichiers du même lot |
| 9 | Écrire dans `N.R` la règle de fin : `finVague.ignorer: ['mine', 'traqueur']` (ou la refuser) | voir les écarts | appliquée |
| 10 | `71-butin` : le butin que le mur arrière dépasse est **perdu** (§ 2.6, § 4.6), au lieu d'être repoussé à l'intérieur des murs comme dans le squelette | le mur pousse aujourd'hui le butin devant lui | — (fichier du lot 3a) |
| 11 | `12-cam` (lot 1) : la caméra **bornée à l'arène qui voyage** (§ 4.6) | avec la caméra bornée au monde, la vue montre le hors-arène et les apparitions ont moins de place | — |

## Comment relancer

```
bash tools/lots/worktree.sh essai L5a && bash tools/lots/worktree.sh servir L5a     # http://127.0.0.1:8127/…
node tools/L5a/banc.mjs --graines 1-20 --profils paysage,portrait,bureau --sortie tools/L5a/banc.json
node tools/L5a/banc.mjs --graines 1-20 --profils paysage --suivante                  # profil qui a déjà joué
node tools/L5a/chrono.mjs <graine> <vague> <secondes> <réflexe>                       # une vague, seconde par seconde
node tools/L5a/captures.mjs ; node tools/L5a/cout.mjs
node tools/contrat/contrat.mjs --url http://127.0.0.1:8127/proto-neon/tools/L5a/index.html --profil tous
```
