# Lot 4a — Bestiaire I : rapport de livraison

*Agent du lot 4a, 17 octobre 2026, contre le contrat 1.0 (`CONTRAT.md`), dans la copie isolée `../wt/L4a`
(branche `lot/L4a`). Fichier livré : `src/72-ennemis.js`. Outils : `tools/L4a/`.*

## Ce qui est fait

`src/72-ennemis.js` est réécrit en entier (environ 1 100 lignes). Il tient toute l'interface 1.0 de
`N.ennemis` : `reset`, `update`, `draw`, `spawn`, `list`, `count`, `hit`, `zone`, `devorer`, `dans`, `pres`,
`tir`, `tirs`, `effacerTirs`, `inverser`, `fuir` et `purge`. Il tient aussi les miroirs `S.enemies` et
`S.shots`, les événements `kill`, `apparition`, `arme` et `inversion`, et le consommateur `ramassage` (10),
où la PASTILLE lance l'INVERSION. Tous les chiffres viennent de `N.R`. Ceux que le plan ne donne pas sont dans
un objet local `LOC` marqué `// → N.R` (demande 1).

### Sept ennemis, chacun avec un caractère qu'on lit à son mouvement

| Ennemi | Mouvement (le caractère) | Attaque, télégraphe |
|---|---|---|
| **FLÈCHE**, le chasseur | Elle rôde devant la tête, à distance de bond (66 px d'un point placé 40 px devant la tête), en ondulant comme un brochet. Dans l'axe du canon, à moins de 60 px, elle fait un pas de côté (0,25 s à 70 px/s). La MEUTE entre en arc, à la façon de Galaga : chaque aile tourne de son côté. | Elle se fige 0,6 s : la silhouette gonfle d'un pixel, le cœur passe au rose pâle, elle tremble. La ligne fait 67 px, raccourcie si un mur la coupe. Puis elle bondit d'exactement la longueur de la ligne, à 160 px/s, et recharge 1,6 s. Charges simultanées plafonnées par vague. |
| **DARD**, le coupeur | Il croise sur le flanc de la tête, un peu en avant, comme une guêpe qui cherche l'ouverture. La PINCE envoie un dard par flanc. | Il verrouille 0,6 s le point où la tête sera (tête + vitesse × min(d / 165, 1)) : une ligne mène au point gelé, où un losange se resserre de 9 à 5 px. Puis il file en fuseau sur 82 px à 165 px/s. Le rebond sur le mur est calculé au verrou et montré dès le verrou, en deux tronçons. |
| **LARVE**, la nuée | Elle avance par saccades : son cap bascule toutes les 0,17 s. Elle file vers la queue, puis tourne autour à 30 px. La NUÉE tourne en spirale. | Elle annonce sa morsure 0,5 s par un anneau qui se resserre de 9 à 4 px sur le segment visé, parmi les 3 derniers. Puis elle se jette sur le point gelé : un segment de moins (`couper(L − 1)`). Toucher la tête tue. |
| **MINE**, le contrôle de zone | Elle flotte vers sa station (celle du directeur, `opts.station`) à 4 px/s, puis houle doucement. Ses piques tournent. Le cercle d'armement de 34 px est toujours montré, en violet tramé gainé de nuit profonde : il se lit sur le soleil comme sur le ciel. | Elle s'arme quand la tête ou un segment entre dans le cercle, sous les yeux de la joueuse. La mèche dure 0,8 s, le cœur bat de 2 à 14 Hz et le disque de souffle de 30 px se remplit. Ce disque est exactement celui qui tue la tête et coupe le corps. Abattue, elle saute 0,12 s plus tard sans blesser la joueuse et emporte ses voisines en chaîne. |
| **TOURELLE**, le tireur | Elle tourne autour de la tête dans sa bande (120 ± 25 px, 35 px/s), le canon braqué. Elle glisse le long de son anneau vers l'arc **visible** : en paysage, les côtés ; en portrait, le haut et le bas. Elle change de bande après 3 tirs. La BATTERIE tire à 0,4 s d'écart. | Elle suit la tête 0,25 s, en anticipant la moitié du vol de la balle, puis se fige 0,5 s sur sa ligne réelle (portée 160 px, coupée au mur). Le crochet d'impact se pose au premier point de la voie qui touche la tête (`cible:'tete'`) ou le corps (`'corps'`). La balle part à 95 px/s ; sa voie reste enregistrée comme télégraphe tant qu'elle vole. Il y a un recul et un éclair de bouche. **Blindée de face** : tout tir direct reçu à moins de 45° de la face ricoche (étincelle, son `ricochet`). Un arc rose pâle dessiné sur la face dit où est le blindage. |
| **SENTINELLE**, le tireur d'élite | Un œil qui orbite à 80 px, lui aussi vers l'arc visible. La pupille suit la tête. | Elle vise 0,85 s : elle suit 0,35 s, puis la pupille se fixe en os pendant les 0,5 dernières secondes. Le laser de 300 px, coupé au mur, dure 0,35 s ; il est dessiné en cœur os et bords rose pâle, gainé. Deux lasers au plus en même temps. |
| **TRAQUEUR**, contre l'attente | Il glisse vers la tête à 0,95 fois sa vitesse de **croisière** (accélération retirée : l'accélération le sème). Son virage est borné à 2,3 rad/s : un virage serré le décroche. Il flotte et son halo tourne. | Contact. Les armes ne lui font rien (une étincelle). Il meurt au LASSO ou dévoré (5 000). À la purge, il ne saute pas : il s'en va. |

### Justice, temps et INVERSION

- **Tout naît en état `portail`.** L'ennemi se matérialise pendant 0,6 s (`N.R.apparitions.sansContact`) :
  un anneau s'ouvre, et le sprite monte à travers une trame de Bayer. Pendant ce temps, il ne touche pas et
  n'arme pas.
- **On n'arme que sous les yeux de la joueuse.** Il faut `N.cam.shown(x, y, r + 6 + 3)` : les 3 px de plus
  couvrent le retard d'une image de la caméra (§ 3.3).
  - Sortie du cadre pendant l'armement : une seule rallonge de 0,3 s, et un chevron (`portail`) clignote au
    bord, sur la ligne d'attaque.
  - Encore dehors à l'instant de frapper : l'attaque est annulée et l'ennemi recharge.
- **Les télégraphes sont enregistrés à chaque pas** par `N.fx.tele`, à l'endroit exact des dégâts.
  - Ils restent enregistrés pendant la phase active : bond, fuseau, laser, morsure, voie d'une balle.
  - **Pendant un gel** (dt = 0), ils sont ré-enregistrés tels quels. Sans cela, `S.tele` se vidait à chaque
    hitstop : les pilotes perdaient l'annonce et le dessin clignotait (demande 9).
  - RAPIDE (allure × 1,5, recharges × 0,7, deux rémanences de sang) ne raccourcit jamais une annonce.
- **L'INVERSION** (`inverser(dur)`) :
  - au début : les tirs sont effacés et les télégraphes annulés ;
  - les ennemis ordinaires, le TRAQUEUR et les mines passent en `proie` : ardoise pleine, contour rose pâle,
    gaine de nuit profonde. Le sprite est transformé à la volée et mis en cache ;
  - les proies fuient à 0,8 fois la vitesse de la tête en longeant les murs, si bien qu'on peut les acculer ;
  - la tête les dévore au contact : 200, 400, 800, puis 1 600 (`N.R.f.devore`) ; le TRAQUEUR vaut 5 000, hors
    de l'escalier ;
  - les élites, le RIVAL et le CYCLOPE ne changent pas ;
  - pendant la dernière seconde, les proies clignotent en os à 4 Hz ;
  - à la fin, celles qui sont à moins de 32 px de la tête restent inoffensives 0,5 s.
- **La mort au mur.** Un ennemi que le mur, celui du TRAVELLING, dépasse meurt sans butin ni score
  (`src decor/mur`, base 0). Le mouvement propre d'un ennemi ne le fait jamais sortir par un mur.
- **`purge(ordre)`** fait sauter les ennemis dans l'ordre des distances, toutes les 45 ms. Le TRAQUEUR s'en
  va au lieu de sauter. **`fuir()`** les fait tous fuir hors champ, sans blesser ; ils disparaissent une fois
  sortis de la vue.
- **Le dessin.**
  - Chaque ennemi a une ombre tramée en nuit profonde sur le plateau. Le flash de frappe garde la gaine.
  - Les tirs ennemis ont une courte traînée de sang.
  - Tant que les sprites du lot 6a manquent (`fleche:armee`, canon tournant de la tourelle), le module les
    remplace : la flèche gonfle d'un pixel, et un canon de 4 px est tracé.
  - Les replis se détectent tout seuls : dès que `N.spr.get` rend un vrai sprite, ils s'effacent.
- **Les options du directeur** (lot 5a) sont honorées : `cap` (cap initial), `station` (mines), `formation`
  et `rang` (MEUTE en arc, PINCE par flanc, NUÉE en spirale, BATTERIE à 0,4 s d'écart). La demande 5 les fait
  entrer dans le contrat.

## Page d'essai et outils (`tools/L4a/`)

| Fichier | Rôle |
|---|---|
| `construire.mjs` | Construit `index.html`, la page d'essai réglementaire (le bundle avec les replis des autres lots), et `bestiaire.html`, la même avec une **cale d'essai** qui sert les planches de `art/sprites/` (dard, larve, traqueur, couronne, portail…) par `N.spr.get`. On y voit le bestiaire avec ses vrais sprites. La cale n'est jamais livrée. |
| `outils.mjs` | Serveur statique, Chromium, les 3 profils, un **mode manuel** où la vraie boucle de `90-boot.js` n'avance qu'image par image (captures reproductibles), capture du tampon d'index et planches. |
| `voir.mjs` | Les planches de regard : chaque type isolé à ses instants de caractère, le groupe, l'INVERSION. Options `--profil`, `--page`, `--url`. |
| `harnais.js` | Le harnais injecté dans la page. Il fait avancer la simulation pas à pas (la suite d'appels de la boucle) et observe chaque ennemi à chaque pas : armements, télégraphes publiés, tirs, bonds, schémas. Il porte aussi les essais ponctuels. |
| `banc.mjs` | Les critères d'acceptation du lot : 20 graines, chaque type isolé puis en groupe, les 3 profils, le coût. Il écrit `sortie/banc.json` et `sortie/banc.txt`, et rend un code de sortie. |
| `sortie/planche-*.png` | Les planches de référence (×2) : `fleche`, `dard`, `larve`, `mine`, `tourelle`, `sentinelle`, `traqueur`, `groupe`, `inversion`. |

Pour relancer, depuis la copie : `node tools/L4a/construire.mjs && node tools/L4a/banc.mjs`, puis
`node tools/L4a/voir.mjs`.

## Les critères d'acceptation [U], mesurés

Ils sont mesurés par `node tools/L4a/banc.mjs` sur `tools/L4a/index.html` (sortie complète :
`tools/L4a/sortie/banc.txt`).
- Chaque type est d'abord isolé (3 ennemis, 10 s), puis tous sont mêlés (18 ennemis, 14 s, 15 % de RAPIDE),
  sur les graines 1 à 20.
- La tête est conduite par un script à graine et protégée, pour qu'elle provoque les attaques sans mourir.
- RAPIDE est présent dans les essais isolés (une graine sur deux).

| Critère | Seuil | Mesure | Verdict |
|---|---|---|---|
| Télégraphes journalisés | ≥ 500 ms pour 100 % des attaques, sous RAPIDE et en groupe compris | 1 288 attaques, 0 sous 0,5 s, minimum 0,500 s (larve). Par type, flèche 0,600, dard 0,600, larve 0,500, mine 0,808, tourelle 0,758, sentinelle 0,858 ; les mêmes valeurs sous RAPIDE (276 attaques). Télégraphe publié à 144 833 pas d'armement sur 144 833 | **tenu** |
| Le télégraphe montre la vraie zone | ligne de la flèche = bond réel ± 2 px ; disque de la mine = souffle réel | 253 bonds, écart max 0,70 px. Mine : télégraphe r = 30 = souffle ; tête à 10, 25 et 29 px, mort (`souffle`) ; à 31 et 33 px, vivante | **tenu** |
| Armement dans la vue | 0 armement commencé hors de la vue ; 0 tir parti hors de la vue | 1 707 armements, 0 hors de `shown` (vérifié après la mise à jour de la caméra) ; 343 tirs, 0 né hors de la vue, 0 frappe d'un auteur hors de la vue | **tenu** |
| Contres | ricochet sur la face de la tourelle ; esquive de la flèche dans l'axe ; mine abattue sans blesser (G-30) | Ricochets : 469 sur 469 de face, 0 sur 1 521 de côté. Esquive : 20 sur 20. Mine abattue sous la tête : 20 sur 20 vivante, 0 coupe. Chaîne de 3 mines : 3 kills, joueuse vivante 5 fois sur 5 | **tenu** |
| TRAQUEUR | entre après 7 s ± 0,1 s d'inaction ; invulnérable aux armes ; meurt au LASSO ; dévorable ; fuit à la fin de la vague | Les 9 sources d'arme : 10 fois sur 10 sans effet. LASSO : 10 sur 10 (base 5 000). Dévoré : 10 sur 10 (5 000). Fuite à la purge puis départ : 10 sur 10. Vitesse : 0,95 fois la croisière, exactement. **L'entrée après 7 s appartient à 76-directeur** (contrat § 6, consommateur 10 de `kill` et `ramassage`). Mesurée avec le directeur du lot 5a en intégration d'essai : portail ouvert à 7,01 s d'inaction, sur 5 graines | **tenu**, entrée par le lot 5a |
| INVERSION | après `inverser(5)` : 100 % des ordinaires en `proie` en 1 image, 0 tir en vol, 0 attaque commencée, 0 dégât au contact ; points 200, 400, 800, 1 600, 1 600 ; à la fin, 0 dégât pendant 0,5 s dans 32 px | 20 graines sur 20 : proies toutes, tirs 0 (6 effacés), télégraphes 0, armements 0, tirs 0, joueuse vivante après 5 dévorées et 4 s au milieu des proies. Points 200, 400, 800, 1 600, 1 600 (et 1 600 ensuite). Délai avant le premier dégât : 0,500 s | **tenu** |
| Schéma | 100 % des objets de `list` et `tirs` valides, à chaque pas | 1 107 828 validations (`N.ids.valider`), 0 faute | **tenu** |
| Plafonds | 40 ennemis et 80 tirs ; coût p95 ≤ 1,0 ms à 40 ennemis | 60 apparitions demandées, 40 acceptées ; 120 tirs demandés, 80 tenus. Coût (update + draw par image, 40 ennemis mêlés, 3 × 1 200 images) : moyenne 0,17 ms, p95 0,30 ms (séries 0,3, 0,3, 0,4), max 1,8 ms | **tenu** |
| Zéro erreur | `__ERR.count = 0`, console vide | iPhone 13 paysage, portrait, bureau 1440 × 900 (jeu dessiné, 24 ennemis puis INVERSION) : 0 et 0 | **tenu** |

### Mesures complémentaires

- **Tests de contrat** : `node tools/contrat/contrat.mjs --url …/tools/L4a/index.html` donne **CONTRAT : OK**
  sur les 3 profils (socle 35, palette 1, règles 5, modules 8 sur 8, 0 erreur).
- **Non-régression** : `tools/nonreg/nonreg.mjs` sur la page d'essai.
  - Tout est vert : build, interdits, contrat, états, fumée sur 3 profils, R-01, R-02, R-03, R-21 sur 5
    graines, cadence.
  - **Sauf le coût p95 de la scène `charge`** : 9,4 ms pour une référence de 4,8 ms, en image entière et en
    temps réel. La machine est partagée par six autres agents, et la mesure est très bruitée : la page du
    squelette, mesurée à côté, donne elle-même 8,3, 8,3 puis 12,6 ms.
  - Mesurée seule, image par image, dans la scène `charge`, la part de 72-ennemis vaut 0,26 à 0,30 ms par
    image, contre 0,16 ms pour le squelette : **+0,10 à +0,14 ms**. Cela tient dans le budget de 1,0 ms et sous
    le seuil de +0,5 ms. L'intégrateur refera cette mesure sur une machine calme.
- **Intégration d'essai** (hors livraison) : mon module, avec les fichiers en cours des lots 1, 2, 3a, 5a et
  6a, construit dans le dossier temporaire de ma session.
  - Trois parties de 45 s en V2 avec le pilote de repli : 0 erreur, et les 5 types de V2 sont apparus.
  - Les morts journalisées sont `ennemi/traqueur`, `ennemi/fleche`, `ennemi/dard` ; les coupes,
    `ennemi/larve`.
- **Ce que j'ai regardé** (outil Read sur les planches) :
  - chaque type à ses instants de caractère : flèche qui gonfle et tremble, ligne de 67 px ; dard, losange,
    fuseau et rémanences ; larves en essaim et anneau sur la queue ; mines, cercle d'armement, disque qui se
    remplit ; tourelle, voie, crochet, recul ; sentinelle, pupille et laser ; traqueur, matérialisation et
    halo ;
  - le groupe en paysage et en portrait, où les tireurs trouvent l'arc visible ;
  - l'INVERSION en ardoise et rose pâle ;
  - le rendu avec le décor et les télégraphes en cours des lots 2 et 6a (`sortie/integ-*`, non gardé).

## Les choix d'interprétation

1. **La flèche se poste devant la tête** au lieu de la poursuivre. « Vise la tête » se lit au moment du gel :
   la ligne part vers la tête. Mais une flèche qui chasse par-derrière, plus lente que le serpent, ne tire
   jamais. Postée devant, elle laisse la tête venir sur sa ligne, et le contre « s'écarter de sa ligne »
   prend tout son sens.
2. **Les tireurs cherchent l'arc visible de leur anneau.**
   - Problème : un anneau de 120 px autour de la tête sort de la vue en paysage (demi-hauteur de 97 px). La
     tourelle, qui n'arme que dans la vue, y passait la moitié de son temps muette.
   - Solution : elle glisse vers l'arc où on la voit, et y fait les cent pas. La distance du plan est gardée.
3. **Une visée qui suit se fige pendant ses 0,5 dernières secondes** : 0,25 s de suivi pour la tourelle, 0,35 s
   pour la sentinelle. Ainsi « 500 ms à l'endroit exact des dégâts » (§ 3.8, règle 5) tient aussi pour une
   visée qui bouge.
4. **La morsure de la larve vise un point gelé** au départ du bond (0,3 s au plus). Elle mord si l'un des 3
   derniers segments s'y trouve ; la coupe retire un segment.
5. **La mine qui saute d'elle-même blesse aussi les ennemis** (40 de dégâts), ce qui permet de « s'en servir
   comme bombe ». Ses victimes sont créditées à la joueuse, qui a déclenché la chaîne.
6. **Le TRAQUEUR dévoré vaut 5 000 hors de l'escalier** : il ne fait pas monter 200, 400, 800, 1 600.
7. **La base d'un `kill`** est la valeur de `N.R.score.base` du type ; dévoré, c'est la marche de l'escalier ;
   au mur, 0. Le « × 5 » des élites n'est pas appliqué ici : il revient à 77-score, qui connaît `elite`
   (demande 6).
8. **Pendant l'INVERSION, un ennemi qui naît** (le directeur fait attendre les apparitions, mais une ruche le
   lot 4b pourrait pondre) naît directement en proie.

## Les écarts

- **L'entrée du TRAQUEUR après 7 s d'inaction** n'est pas dans ce module : le contrat la donne au directeur
  (lot 5a). Elle est mesurée en intégration d'essai, voir ci-dessus.
- **Les sprites de `art/sprites/`** sont demandés par leur nom (`dard`, `larve`, `traqueur`, `fleche:armee`,
  `couronne`, `portail`…). Les servir est le travail de 40-sprites (lot 6a). D'ici là, la page d'essai
  `bestiaire.html` les montre par une cale, et le jeu dessine les replis.
- **Le style des télégraphes** (couleurs, pointillés, losange) appartient à `N.fx.drawTele` (lot 6a). Ce
  module donne les formes, les `cible` et les rayons qui changent (losange du dard, anneau de la larve).
- **La traque de fin de vague** (les dernières flèches + 30 %) attend un signal du directeur (demande 8). Le
  repli : aucune accélération.
- **Le coût de la scène `charge`** en non-régression : voir plus haut. Sur machine partagée, la mesure ne peut
  pas trancher ; la part propre du module est de +0,1 ms.

## Demandes au gardien

| N° | Demande | Raison |
|---|---|---|
| 1 | Reporter dans `N.R.ennemis` les valeurs de `LOC` (en tête de `72-ennemis.js`). Gestes : `viseeFigee` 0,5 ; `retardCam` 3. Flèche : `avant` 40, `garde` 66, `rode` 0,2, `ondule` 0,32, `onduleHz` 1,15, `virage` 3,2, `entreeMeute` 1,0, `arcMeute` 1,1, `recup` 0,35, `premier` [0,5, 1,3], `separation` 9. Dard : `flanc` 50, `avant` 44, `verrouMin` 34, `virage` 3,4, `recup` 0,4. Larve : `saccade` 0,17, `angleSaccade` 0,95, `approche` 46, `lance` 150, `lanceMax` 0,32, `recharge` 1,4, `anneau` [9, 4], `recul` 0,35. Mine : `station` [6, 18], `houle` 1,5, `houleHz` 0,35, `coeurHz` [2, 14], `chaine` 0,12, `degats` 40. Tourelle : `virage` 1,7, `rattrape` 1,6, `pause` [0,35, 0,6], `recharge` [1,0, 1,6], `recul` 0,09, `bouche` 7. Sentinelle : `vitesse` 36, `angulaire` 0,45, `largeur` 3. Traqueur : `virage` 2,3. Proie : `virage` 7, `murs` 22. Fuite : `vitesse` 110. Repousse : 120 | Chiffres de jeu que le plan ne donnait pas : comportement fin, réglables par le lot 9 |
| 2 | Que l'arsenal passe la position du projectile dans `src._x`, `src._y` quand il appelle `N.ennemis.hit` (canon, tourelles, drones, missiles) | Le blindage de face de la tourelle (± 45°) se juge sur l'origine du tir. Repli : la position de la tête |
| 3 | Inscrire au contrat trois ajouts à `N.ennemis` : `figer(x, y, r, dur)`, que 70-joueuse appelle à la réapparition (§ 2.4 : ennemis à moins de 48 px figés 0,4 s) ; `inversion() → {reste, dur, devores} \| null`, pour le HUD, les pilotes et les mesures ; `stats`, les compteurs du banc | Aucune voie du contrat 1.0 ne permet de figer les ennemis à la réapparition ni de lire l'INVERSION en cours |
| 4 | Ranger `tirEnnemi` et `ricochet` parmi les sons « propres à un module » (§ 5.8), appelés par 72-ennemis comme `tir` l'est par l'arsenal. Sinon, créer les événements correspondants | Ces sons n'ont pas d'événement ; le squelette appelait déjà `tirEnnemi` directement |
| 5 | Inscrire au contrat les options de `spawn(type, x, y, opts)` : `elite`, `mods`, `etat`, `pv`, `partie` (squelette), plus `formation`, `rang`, `cap`, `station` (passées par le directeur du lot 5a) | Le directeur et le bestiaire s'en servent déjà ; elles doivent être figées pour le lot 4b |
| 6 | Fixer la convention de `kill.base`. Ce module rend la base du type ; la marche de l'escalier pour une proie dévorée (200 … 1 600) ; 5 000 pour le TRAQUEUR dévoré ou pris au LASSO ; 0 au mur. Le « × 5 » des élites revient à 77-score. Et dire si les points dévorés sont multipliés (« valeurs fixes », § 2.13) | Éviter un double « × 5 » ou un oubli entre 72-ennemis et 77-score |
| 7 | Rendre publique la marque « chaîne déclenchée par la joueuse ». Le module pose aujourd'hui `src._joueuse` sur les sources `ennemi/mine` des réactions en chaîne. Il faut un champ lisible par 77-score, ou une règle : `ennemi/mine` compte toujours pour la joueuse | « Compte pour la joueuse quand c'est elle qui a déclenché la chaîne » (contrat § 6) ; un champ `_` ne doit être lu par personne d'autre |
| 8 | Un signal de « traque de fin de vague » (Cruise Elroy, § 4.2 : moins de 20 % du quota restant, dernières flèches + 30 %), par exemple `S.vague.traque = true` écrit par 76-directeur | 72-ennemis ne connaît pas le quota ; repli : pas d'accélération |
| 9 | Écrire dans le contrat (§ 7, `S.tele`) que **pendant un gel** (dt = 0) chaque propriétaire ré-enregistre ses télégraphes tels quels. Ou que `N.fx.update` garde le `S.tele` publié quand dt = 0 | Sans cela, `S.tele` se vide à chaque hitstop : les pilotes perdent l'annonce, le dessin clignote. 72-ennemis le fait déjà ; 73-colosse et 73-arene doivent faire de même |
| 10 | Pour `N.fx.drawTele` (lot 6a) : dessiner la forme `losange` comme un losange ; colorer le crochet d'impact selon `cible` (`tete` en rose pâle, `corps` en magenta, § 4.4) ; ne pas épaissir une ligne active quand un laser est déjà dessiné par son propriétaire | Le crochet et le losange du dard sont fournis avec leur `cible` et leur rayon ; le squelette les dessine en cercle |

## Pour les autres lots

- **6a** (sprites) : servir depuis `art/sprites/` `dard`, `larve`, `traqueur`, `fleche:armee`, `couronne` et
  `portail`. Rendre `tourelle` et `tourelle:charge` en 16 directions : le module ne trace plus son canon de
  repli dès que le sprite tourne.
- **3a** (joueuse) : appeler `N.ennemis.figer(x, y, 48, 0.4)` à la réapparition (si la demande 3 est
  acceptée) ; passer `src._x`, `src._y` dans `hit` (demande 2).
- **8** (score) : `kill.base` selon la demande 6 ; `src.type === 'devore'` pour GLOUTONNE et les défis
  DÉVORE n.
- **P** (pilotes) : `S.enemies[i].etat` vaut `portail` pendant 0,6 s après chaque apparition. `S.tele`
  contient, en plus, la voie de chaque balle de tourelle (`ligne`, `cible:'tout'`, reste ≤ 0) tant qu'elle
  vole.
