# Inventaire SNAKE 2030 — le cœur, les phases, l'amorçage

Domaine : `snake2030/src/10-core.js` (1 144 lignes), `snake2030/src/27-phases.js` (736 lignes),
`snake2030/src/90-boot.js` (1 857 lignes), `snake2030/src/CONTRACT.md` (265 lignes), lus en entier.
Pour les défauts mesurés : `snake2030/docs/audit-2026-09.md` (sections G1 à G14, « Sensations de jeu »,
« Progression », « Accueil, menus », « Robustesse »). Pour ce que l'amorçage orchestre sans le définir :
quelques lignes de `26-ui.js` (écran de fin, déblocages, réglages) et de `25-levels.js` (durées des secteurs).
Côté SNAKE 2975 : `DIRECTION.md`, `CONTRAT.md`, `REPRISE.md`, les trois recherches, `src/70-game.js`,
`src/60-intro.js`, `src/90-boot.js`, et les captures `tools/jeu/L7-*.png`.

Conventions. « u » = unité monde de SNAKE 2030 ; « px » = pixel de jeu de SNAKE 2975. Ordre de grandeur
pour transposer : la vue 2030 fait 600 à 780 u de haut, le tampon 2975 fait 195 px de haut sur iPhone
paysage, donc **1 px ≈ 3 à 4 u**. La tête 2030 (rayon 16 u) fait donc ≈ 4-5 px de rayon, la vitesse
de 150 u/s ≈ 40-50 px/s (la démo 2975 roule à 64 px/s). Les références J-, G-, V- renvoient aux exigences
de `proto-neon/recherche/`.

Chaque fiche suit le même plan : **Quoi** (fonctionnement, chiffres du code) · **Pourquoi c'est bien** ·
**Défauts** · **En mieux dans 2975**.

---

## Ce que montrent les captures de la démo (pour situer « triste et basique »)

`tools/jeu/L7-debut.png` et `L7-minute2.png` : une seule arène égale à l'écran, fond presque noir quadrillé
de violet, un serpent cyan, quelques cellules ambre, des flèches magenta. Rien ne bouge sauf les
entités : pas de caméra, pas d'avance, pas de zoom, pas de changement de décor, pas de jauge, pas de
pouvoir, pas de combo visible, pas de moment fort hormis le colosse à 1 min 16. Le HUD tient en une ligne
(score, cœurs, défi). C'est exactement ce que SNAKE 2030 avait d'abondant : une mise en scène qui change
toutes les 10 à 20 s, une caméra qui respire, une boucle de croissance (XP → cartes) et des moments
(montée de niveau, ultime, pouvoirs, boss, secteur nettoyé).

---

## A. Mouvement et contrôle du serpent

### A1. Virage analogique continu, vitesse de virage bornée
- **Quoi.** `updateSnake` : la direction voulue est `atan2(jy, jx)` du manche, ignorée sous une zone morte
  `jmag ≤ 0,12`. Le cap tourne vers elle à `TURN_RATE 4,6 rad/s × turnBoost × sensibilité ×
  clamp(jmag × 1,35, 0, 1)` : le virage sature à 74 % de course, une déflexion de 25 % tourne trois fois
  plus lentement (90° en 69 images contre 21). Vitesse de base 150 u/s ; rayon de virage 32,6 u, soit
  2 rayons de tête. Mesuré : **1 image de latence** clavier comme doigt, 90° en 19-21 images (≈ 340 ms).
- **Pourquoi c'est bien.** Le serpent glisse en courbes, jamais en escalier ; le pouce dose la courbe ;
  la réponse immédiate donne confiance (J-05).
- **Défauts.** La zone morte proportionnelle (12 % de 64 px) n'a pas été réglée au doigt ; la
  « sensibilité » est un réglage de plus que personne ne comprend.
- **En mieux.** La démo 2975 a déjà mieux sur le principe (5,9 rad/s, cap mémorisé au relâcher, J-02).
  Reprendre de 2030 le **virage proportionnel à la déflexion** (petite poussée = courbe large, utile
  pour slalomer sans sur-virer) avec saturation à 70-75 % de course, et garder les 266 ms/quart de tour de
  la démo à pleine course. Le cap visé reste montré par le chevron (J-33, déjà dans la démo).

### A2. Le corps suit exactement le chemin de la tête
- **Quoi.** `pushPath` enregistre un point tous les `PATH_STEP 5 u` avec sa distance cumulée ; `buildSegs`
  échantillonne les segments tous les `SEG_SPACING 15 u` le long de ce chemin, par interpolation et un seul
  curseur arrière (coût linéaire). Le chemin est amorcé de 400 points pour que le corps existe dès la
  première image ; les points au-delà de la queue + 240 u sont jetés et le tableau est compacté au-delà
  de 600.
- **Pourquoi c'est bien.** Le corps dessine la trajectoire réelle : on lit où l'on est passé, on peut
  « enrouler » un ennemi, le corps devient un objet de jeu (bouclier, A4/C3).
- **Défauts.** Aucun mesuré.
- **En mieux.** La démo fait pareil avec une trace d'un point par pixel (anneau de 4 096). Reprendre la
  distance cumulée (pour placer les segments au sous-pixel puis arrondir au pixel du tampon) et surtout
  **ce que 2030 en fait** : épaisseur variable (repli, A9), écailles tous les 3 segments, effets posés le
  long du corps (gerbe par segment à la mort, pulsation qui court de la tête à la queue).

### A3. Bords d'arène : rebond amorti, jamais de mort
- **Quoi.** Toucher un bord réfléchit le cap (`π − ang` ou `−ang`), avec `wallBump` : secousse 3 u,
  anneau rose 8 u, son `wallBump`, anti-répétition 260 ms. Sur les rails, on prend parmi les quatre caps
  celui qui rentre le plus franchement et on verrouille 0,45 s (sinon le manche tenu contre le mur y
  ramenait le cap à 6 Hz).
- **Pourquoi c'est bien.** Pas de mort injuste « au mur » (piège Nimble Quest relevé par G, § 4) ; le
  rebond a un son et un choc, il fait partie du jeu.
- **Défauts.** Un cap réfléchi repointe souvent vers le mur (66 % du temps collé sur rails, mesuré) ;
  le rebond surprend quand on ne voit pas le bord (arène plus grande que l'écran).
- **En mieux.** La démo fait glisser le cap le long du mur (plus doux). Garder le glissement par défaut et
  **ajouter le retour de 2030** : 2 px de secousse, un anneau magenta-pâle d'un cran au point de contact,
  un son court. Si l'arène dépasse l'écran (H1), dessiner le bord en pointillés qui défilent
  (`drawArenaEdge` : tirets 26/18, décalage −t/30) dans la palette, en `nuitProfonde` + `violet`.

### A4. Visée de la tête distincte du cap (cône ±1,15 rad)
- **Quoi.** `s.aim` = cap des canons. Libre : `aim = ang`. Sur rails : la tête pivote dans un cône
  `RAIL_LOOK 1,15 rad` vers le manche, ou vers l'ennemi le plus proche à 560 u si le manche est au repos.
  À la souris + clavier : les touches dirigent, la souris vise dans le cône (twin-stick).
- **Pourquoi c'est bien.** Le tir reste utile quand le corps est contraint ; le joueur de bureau a une
  visée fine.
- **Défauts.** Peu lisible (cône à α 0,25) ; deux notions (cap, visée) dans un jeu à un pouce.
- **En mieux.** Ne garder qu'un usage : la **visée assistée vers l'ennemi le plus proche dans un cône de
  ±30°** pour les canons secondaires (les canons latéraux de la démo), sans second contrôle. Au bureau,
  option souris twin-stick. Rien à dessiner : le tir montre déjà la visée.

### A5. Entrées complètes par appareil
- **Quoi.** `90-boot.js` :
  - doigt : manche flottant (rayon 64 px × taille réglable), né sur la moitié gauche (ou droite pour
    gaucher), origine traînée au-delà du rayon, bande haute de 22 % réservée au HUD, boutons au doigt
    via `ui.hitTest` ; `preventDefault` seulement si l'événement est annulable ;
  - clavier : directions sur `e.code` (ZQSD, WASD, flèches marchent sur AZERTY et QWERTY), modificateurs
    ignorés (Cmd+R ne déclenche plus l'ultime), répétition ignorée pour E/R/F/P/Échap/Entrée ;
    Espace boost, E pouvoir, R ultime, P/Échap pause, Entrée reprise, F plein écran ;
  - souris (bureau) : mode « auto » actif après 8 px cumulés, rendu à la première touche ; au-delà de
    24 px de la tête, cap = direction du curseur, `jmag = clamp(d/120, 0,25, 1)` ; gauche = boost,
    droit = pouvoir, molette ou milieu = ultime ; réticule masqué après 1,5 s d'immobilité ;
  - détection bureau (`maxTouchPoints == 0` et pas `pointer:coarse`), annulée au premier vrai toucher.
- **Pourquoi c'est bien.** Le même jeu est natif sur iPhone et sur PC/Mac (l'audit G2/G3 a rendu le
  bureau jouable : avant, souris inerte et contrôles tactiles affichés).
- **Défauts.** Manche limité à une moitié d'écran ; trois boutons tactiles à aller chercher (contraire à
  J-08) ; pas de manette (DESK-6 écarté).
- **En mieux.** La démo a le meilleur manche (n'importe où, J-01, J-04). Reprendre de 2030 : **la souris
  pilote au bureau** (avec réticule masqué), le filtrage des modificateurs et des répétitions, les touches
  E/R/P/F, et ajouter la **manette** (J-31, V-18 : stick gauche, A = boost, X = pouvoir, Y = ultime,
  Start = pause). Les actions au doigt sans bouton : voir D1, F1, G1.

---

## B. Croissance, longueur, vie

### B1. La longueur EST la vie
- **Quoi.** `START_LEN 9`, `MAX_LEN 90`, `hp = len`. Un coup retire `dmg` segments ; mort quand
  `len ≤ 1`. `healSnake` : +n jusqu'à 90, mémorise `peakLen`, relève `maxHp`.
- **Pourquoi c'est bien.** Un seul chiffre fait tout : grandir = survivre = être fort ; on voit sa vie sur
  l'écran (la queue), sans jauge. C'est l'idée la plus « serpent » du jeu, et la recherche la recommande
  (G, § 3.6 : « la longueur sert de bouclier »).
- **Défauts.** Mesuré : 90 segments atteints à 172 s par un bon joueur, qui ne meurt plus jamais ensuite
  (difficulté plate, corrigée par le directeur, J3) ; un débutant meurt avant d'avoir grandi
  (41,9 s médianes).
- **En mieux.** La démo mélange deux systèmes : **3 vies** et une queue coupée de 30 % par coup. Les
  fusionner sur le modèle 2030 : plus de cœurs, la longueur est la vie ; un coup coupe la queue (perte
  proportionnelle bornée : 2 à 30 %, une part se ramasse, comme la démo), la mort vient quand la tête est
  touchée **à 3 segments ou moins**. Afficher la longueur sous forme de pastilles près de la tête quand
  elle devient critique (≤ 4), pas dans un HUD lointain.

### B2. Butin : énergie, noyau, soin, aimant, expiration, fusion
- **Quoi.** `grabPickup` : énergie = XP +v, score 5v, **35 % de chance de +1 segment** (+18 % par carte
  GLOUTON) ; noyau = XP 8, score 60, ultime +20, +1 segment, halo ; soin = +3 segments. Aimant rayon
  200 u (+90 par carte), attraction jusqu'à 900 u/s. Expiration à 10 s, clignotement les 2 dernières
  (avant : 128 butins accumulés en 3 min puis plus aucun butin produit au plafond de 400). Fusion :
  3 énergies à moins de 30 u (2 au-delà de 60 butins vivants) n'en font qu'une de valeur cumulée, rayon
  +15 % (299 butins vivants mesurés en pointe).
- **Pourquoi c'est bien.** Le butin vient à la tête (pas de corvée), disparaît s'il traîne (pas
  d'encombrement), récompense le combat (pas l'attente).
- **Défauts.** La croissance par énergie est aléatoire (35 %) : le joueur ne relie pas « je mange » et
  « je grandis » ; trois couleurs vertes proches pour trois butins (corrigé par la forme : losange, étoile,
  croix).
- **En mieux.** La démo fait mieux le lien (1 cellule = 1 segment, 9 px de prise pour 5 px de sprite). Y
  ajouter de 2030 : **l'expiration clignotante**, **la fusion** (moins de sprites et de sons pour la même
  valeur), **le noyau** (grosse cellule `jaune` qui charge l'ultime, lâchée par les élites et les boss),
  et **l'escalier de hauteur** des ramassages consécutifs (audit FEEL-9, réalisé dans 2030 :
  +1 demi-ton par ramassage dans 1,2 s, plafond +12).

### B3. Régénération, sursis, battement de cœur
- **Quoi.** Carte RÉPARATION : +1 segment toutes les `9 / niveau` s. Carte SURSIS : temps ralenti à
  `1 − 0,18 × niveau` quand `len ≤ 3`. Toujours : **son `lowHp` à 1 Hz quand `len ≤ 3`** (« la seule
  information de survie que l'oreille peut donner sans que le regard quitte le serpent »).
- **Pourquoi c'est bien.** On sent le danger sans lire un chiffre ; la dernière ligne droite devient
  dramatique.
- **Défauts.** Pas d'équivalent visuel du battement (G-35 l'exige).
- **En mieux.** Battement à 1 Hz **et** pulsation de la tête entre `cyan` et `cyanPale` (échange d'index,
  pas d'éclair), musique passée sous passe-bas tant que la longueur est critique (G-32).

---

## C. Collisions, dégâts, mort

### C1. Le coup encaissé : une lecture complète en une image
- **Quoi.** `hurtSnake(dmg, x, y, src)` : rien si invulnérable ou hors partie. Mémorise la **source**
  (`S.lastHit` : type, nom, élite, secteur, avancement). BLINDAGE plafonne à 1 segment. Puis :
  invulnérabilité 900 ms (+220 ms par carte TEMPS MORT), ÉCHAPPÉE (700 ms de traversée par niveau),
  **combo divisé par deux** (pas remis à zéro ; SANG-FROID le garde), multiplicateur recalculé dans la
  même image. Retours : secousse 8 u, **vignette rouge du côté d'où vient le coup** (angle reprojeté en
  repère écran), **gel 4 images**, **ralenti 0,4 pendant 180 ms puis retour linéaire sur 120 ms**,
  **jolt** du plateau (0,6 ; 1,5 élite ; 2 boss, voir H4), gerbe de 12 éclats projetés depuis l'impact,
  son `hurt`, vibration [18, 30, 26].
- **Pourquoi c'est bien.** Le coup se sent (gel + ralenti), se localise (vignette orientée), coûte
  clairement (segments perdus visibles), et ne punit pas trop (combo / 2).
- **Défauts.** Avant G8 : flash plein écran d'une image (+82 à +113 % de luminance), sans gel ni
  direction. Le ralenti à chaque coup peut casser le rythme si les coups s'enchaînent.
- **En mieux.** La démo a gel 8, secousse 7, anneau, trait de direction, choc qui repousse : bonne base.
  Ajouter de 2030 : **la source du coup** (pour l'écran de fin, L3), **le ralenti 180 ms**, **le combo
  divisé par deux** au lieu de remis à zéro, et la **vignette directionnelle** en tramage `sang` sur le
  bord touché (petite surface, compatible avec le limiteur de flashs).

### C2. Bouclier plafonné, et toutes les cartes défensives lues au même endroit
- **Quoi.** Une charge de bouclier absorbe `SHIELD_CAP 3` segments : jusqu'au secteur 3 elle prend le coup
  entier (+400 ms d'invulnérabilité, anneau vert, son `shock`) ; au-delà le surplus passe. Recharge d'une
  charge toutes les `f_shieldCd` ms (14 s sans carte). Bug historique documenté : la recharge était lue
  en secondes → une charge **à chaque image** → joueuse intouchable, cause n° 1 du « passé 60 s
  plus personne ne meurt ».
- **Pourquoi c'est bien.** Une défense qui garde la promesse de la carte sans annuler la difficulté.
- **Défauts.** Les unités mêlées (ms / s) ; une défense absolue est toujours un piège d'équilibrage.
- **En mieux.** Bouclier = un liseré `cyanPale` autour de la tête, une charge = un anneau d'un pixel ;
  plafonner toute absorption ; toutes les durées en secondes de jeu, une seule unité.

### C3. Le corps profond absorbe les tirs ennemis
- **Quoi.** `collide` : une balle ennemie qui touche la tête blesse ; celle qui touche les **8 premiers
  anneaux** blesse aussi ; au-delà (`BODY_ABSORB 8`) elle est **absorbée** : pas de dégât, pas
  d'invulnérabilité, pas de combo cassé, **+1 de boost**, 6 éclats couleur du corps, son `absorb`.
- **Pourquoi c'est bien.** La longueur devient un bouclier qu'on **place** : on interpose sa queue.
  Raison mesurée : 48 % des balles d'artilleur touchaient le corps à 420 u de la tête, morts
  incompréhensibles.
- **Défauts.** La frontière « 8e anneau » est invisible.
- **En mieux.** La démo absorbe déjà dès le 2e segment (plus généreux, plus lisible). Ajouter de 2030 la
  **récompense** : chaque tir absorbé charge le boost ou l'ultime et fait clignoter le segment touché
  d'un cran (`cyanPale`). Un défi nommé en sort naturellement (« BOUCLIER VIVANT : absorber 20 tirs »).

### C4. Contacts : bélier, ronces, ennemis-suicides, traversée
- **Quoi.** Ennemi contre tête (rayons additionnés, tête variable en repli) : blessure, et l'ennemi
  `suicide` meurt ; avec ÉPERON en boost, c'est l'ennemi qui prend `f_ramDamage` ; RONCES blessent ce qui
  frôle le corps (un segment sur trois testé) ; en traversée (`ghost > 0`) aucun contact ; un ennemi qui
  fuit la fin de secteur (`harmless`) ne blesse plus.
- **Pourquoi c'est bien.** Le corps et la vitesse deviennent des armes selon le build.
- **Défauts.** Règles invisibles sans la carte en tête.
- **En mieux.** Une seule règle lisible et permanente : **en boost, la tête est un bélier** contre les
  petits ennemis (pas contre élites et colosse), signalée par la traînée du boost. Les variantes
  (ronces, etc.) restent des cartes.

### C5. La mort mise en scène, puis l'écran de fin
- **Quoi.** `die()` : secousse 30, gel 8 images, flash blanc 0,7, gerbe de 70 éclats, un éclat tous les
  deux segments, anneau, son `dead`, arrêt de la musique, vibration [40, 60, 90], verrou d'écran rendu,
  **écran de fin 900 ms après**. Le journal de partie (`S.run`) est clos : tué par, nom du tueur, cartes,
  boss.
- **Pourquoi c'est bien.** La mort est un événement, pas une coupure ; elle laisse 0,9 s pour comprendre.
- **Défauts.** Flash blanc plein écran (photosensibilité) ; musique coupée net (G-34 demande l'inverse).
- **En mieux.** La démo dissout le serpent de la tête à la queue en 0,28 s : garder, en y ajoutant la
  **gerbe par segment** de 2030 et **sans flash** ; la musique passe sous passe-bas au lieu de s'arrêter
  et reprend ailleurs à la relance (G-34).

### C6. Grille spatiale et plafonds
- **Quoi.** Grille de cellules de 110 u reconstruite à chaque pas ; `enemiesNear`, `nearestEnemy`,
  `inView` (sur l'étendue réellement visible, voir H5). Plafonds : 700 tirs joueur, 500 tirs ennemis,
  400 butins. L'aura électrique n'interroge la grille qu'un pas sur quatre.
- **Pourquoi c'est bien.** 130 ennemis, 700 tirs sans erreur ni ralentissement (JS ≈ 1,2 ms/image mesuré).
- **En mieux.** Indispensable dès que la densité monte (G-16 : une constante unique de plafond). Cellules
  de 32 px dans 2975.

---

## D. Le boost

### D1. Boost à réserve, avec panne franche
- **Quoi.** Vitesse × `BOOST_MUL 1,9` (285 u/s) ; réserve 100, **vidée en 2,94 s** (`BOOST_DRAIN 34/s`,
  −16 % par carte), **rechargée en 4,5 s** (`BOOST_FILL 22/s`) quand on ne boost pas. Montée : 95 % de
  la vitesse en 7 images ; descente plus douce (retour en 20-26 images). Départ vendu par 6 traînées
  ambre par image pendant 3 images. **Panne** : réserve < 1,5 → `boostDry`, un seul son de panne, plus
  rien tant que le bouton reste tenu ; reprise à ≥ 25 seule, ou nouvel appui à ≥ 10. Le boost charge
  l'ultime (+3/s) et alimente l'ÉLAN (dégâts +18 %/carte) et le bélier.
- **Pourquoi c'est bien.** Risque et récompense : fuir ou foncer coûte une ressource qui se voit ; la
  panne est franche, pas un bégaiement.
- **Défauts mesurés avant correction :** à vide, 147 bascules marche/arrêt et 148 sons en 3,7 s ; recharge
  6,7 s (31 % de cycle utile). Un bouton de plus sur un écran de téléphone.
- **En mieux.** La démo n'a **aucun boost**. Le reprendre **sans bouton** comme le propose Apple et J-08 :
  **pousser le manche au-delà de 80 % de sa course = boost** ; au clavier Espace, à la manette A. Garder
  exactement l'hystérésis de 2030 (25 / 10) et le son unique de panne.

### D2. Jauge de boost autour de la tête
- **Quoi.** `drawBoostArc` : arc de 270° de rayon 2,2 × tête, 3 px écran, ambre, rouge sous 20 %, visible
  seulement si la réserve n'est pas pleine ou si l'on boost ; il se remplit de l'arrière-gauche vers
  l'avant, suit la visée.
- **Pourquoi c'est bien.** L'information est là où regarde la joueuse (avant : jauge à 690 px de la tête).
- **En mieux.** En gros pixels : un arc tramé d'un pixel en `ambre` (rouge `magenta` interdit : c'est la
  couleur du danger → `brasier` sous 20 %), autour de la tête, qui disparaît plein. Le même anneau peut
  porter la recharge du pouvoir (G2) sur un second rayon.

### D3. Traînée de boost et zoom de vitesse
- **Quoi.** Bande ambre α 0,45 sur les 10 premiers anneaux pendant le boost ; la caméra recule avec la
  vitesse : `zoom / (1 + (v/150 − 1) × 0,22)`, soit ≈ ×0,83 en boost.
- **Pourquoi c'est bien.** La vitesse se voit et on voit plus loin quand on fonce.
- **En mieux.** Traînée en pixels `ambre`/`jaune` qui s'étire derrière la tête ; à défaut de zoom (non
  entier interdit), **l'avance de caméra s'allonge** en boost (H1) et les impulsions du décor défilent
  plus vite.

---

## E. Combo, multiplicateur, score, expérience

### E1. Multiplicateur dérivé du combo, avec paliers sonores
- **Quoi.** `combo` +1 par kill ; `mult = min(cap, 1 + ⌊combo/3⌋ × 0,5)` ; `cap` 12, **16 en surcharge**.
  Fenêtre `multT` **5 s, 7 s dès ×3** ; à expiration, ×1 et combo 0. Paliers ×2, ×4, ×8, ×12, ×16 : son
  `multUp` à chaque franchissement **montant** (un seul chemin d'écriture `setMult`, sinon le HUD mentait).
  Un coup reçu divise le combo par deux.
- **Pourquoi c'est bien.** Enchaîner devient un jeu dans le jeu ; l'oreille suit la montée.
- **Défauts mesurés avant G7 :** fenêtre 3,2 s, remise à zéro au coup → multiplicateur à ×1 pendant
  67-87 % du temps. Après : lisible, mais ×12 atteint puis plafonné 6 min chez le bon joueur.
- **En mieux.** La démo a une chaîne de 1,6 s qui ne sert qu'au défi, et un multiplicateur tiré de la
  longueur (×1 à ×8). Reprendre le **combo 2030** comme multiplicateur de score (fenêtre 5 s, barre qui se
  vide sous le chiffre ×N), garder la longueur comme puissance de tir. Le défi « DIX KILLS EN CHAÎNE »
  devient un cas particulier lisible du combo.

### E2. Le kill qui monte : hauteur, taille, éclat
- **Quoi.** `killEnemy` : son de kill monté d'**un demi-ton par palier de combo** (`2^(min(combo,12)/12)`,
  jusqu'à une octave) ; texte flottant `+score×mult`, **taille 13 + 2 × min(combo, 6)**, blanc puis ambre
  dès que le multiplicateur mord, vitesse −60 ; pulsation de zoom 0,035 (0,09 élite) ; direction du tir
  qui tue mémorisée (`killAng`) pour orienter les éclats.
- **Pourquoi c'est bien.** Une série se lit comme une montée, pas une répétition (Geometry Wars).
- **En mieux.** La démo a le `+points` jaune et un `pitch` de chaîne : y ajouter **la taille qui grossit**
  (police 5×7 à l'échelle 1 puis 2 au-delà du combo 6) et les **éclats projetés dans le sens du tir**.

### E3. Score pondéré par la difficulté, records par cran
- **Quoi.** `addScore(n) = n × mult × facteur de cran` [0,8 ; 1 ; 1,25 ; 1,6 ; 2,0] ; un record par cran
  (`bestByDiff[5]`), meilleur secteur, meilleur temps, boss abattus.
- **Pourquoi c'est bien.** Le risque choisi paie ; un record reste juste.
- **En mieux.** Records **par niveau de campagne et par mode**, et score multiplié par les modificateurs
  choisis (K2).

### E4. Expérience, montée de niveau, cadence des cartes
- **Quoi.** XP par kill × (1 + 0,15 × (secteur − 1)) ; +25 %/carte SAVOIR ; `xpNext` **commence à 6** et
  croît en `round(xpNext × 1,12 + 6)` : première carte vers 12 s, puis 2 à 3 cartes par minute (avant :
  25 s de disette, puis 4,1 → 0,9 carte/min).
- **Pourquoi c'est bien.** La partie récompense toutes les 20-30 s par un choix : c'est le moteur du
  genre (Survivor.io, Vampire Survivors).
- **En mieux.** La démo n'a **aucune** progression en partie. Voir J4 pour la mise en scène.

---

## F. L'ultime (APOGÉE, renommé SURTENSION dans l'audit)

### F1. La vague qui vide l'écran
- **Quoi.** Jauge 100 (80 avec CONDENSATEUR). Charge : `6 × √(12 / max(12, xpNext))` par kill (6 au
  début, ≈ 0,7 tard), +22 par élite, +20 par noyau, +3/s en boost. Prête : son `ultReady` et toast
  « APOGÉE PRÊT ★ / R ». Déclenchement : ralenti du monde 0,25 pendant 420 ms de jeu, flash 0,4 pendant
  120 ms, secousse 18, puis **6 vagues concentriques toutes les 90 ms**, rayon `160 + 188 × k` jusqu'à
  1 100 u, dégâts `40 + 10 × secteur` à chaque vague. Minuteries en temps de jeu (s'arrêtent en pause).
- **Pourquoi c'est bien.** C'est le moment « je reprends la main » : une décision, une attente, une
  détonation. Charge indexée sur la progression pour qu'il reste rare (une toutes les 45-90 s visées).
- **Défauts mesurés :** avant G7, d'une toutes les 40 s à une toutes les **0,7 s** après 5 min ; prête au
  moment de mourir chez les débutants, jamais utilisée.
- **En mieux.** C'est exactement l'« explosion énorme » de DIRECTION.md : **anneaux tramés concentriques
  qui s'étendent et se trouent**, `os` → `jaune` → `ambre`, gel de 6 images, une seule par 45 s au
  plus, passée par le limiteur de flashs. Déclenchement au doigt **sans bouton** : double toucher bref
  n'importe où (un seul pouce, J-07) ; R au clavier, Y à la manette. Jauge = second arc autour de la tête,
  qui bat en `jaune` quand elle est pleine, plus un son et le mot APOGÉE en police 5×7 au premier
  remplissage seulement.

---

## G. Les pouvoirs

### G1. Trois pouvoirs, un seul bouton, débloqués en jouant
- **Quoi.** `27-phases.js` POWERS :
  - **TRAVERSÉE** ◈ (dès le départ), recharge 7 s : traversée + invulnérabilité 2,2 s (+0,7 s par carte
    TRANSE), repousse les ennemis à 240 u à 420 u/s et leur inflige 6 ;
  - **RALENTI** ◐ (après **25 kills**), recharge 11 s : **le monde à 0,35 pendant 4,2 s, la joueuse à
    vitesse normale** ;
  - **REPLI** ❖ (après **60 kills**), recharge 13 s : le corps se replie, −35 % de longueur (au moins 2,
    jamais sous 3) pendant 8 s ; serpent **×1,5 plus épais (tête et boîte de collision)**, +12 % de
    vitesse, **dégâts ×1,8** ; les segments reviennent à la fin.
  Trois au plus ; le bouton déclenche le **prochain prêt dans l'ordre**, puis passe au suivant. Toast
  « POUVOIR » au déblocage ; compte à rebours réel en ms affiché sur le bouton.
- **Pourquoi c'est bien.** Trois verbes très différents (esquiver, gagner du temps, frapper fort), dont le
  REPLI, idée originale : on troque sa longueur contre de la puissance. Débloqués sans menu.
- **Défauts mesurés :** RALENTI à 45 s et REPLI à 53 s en médiane, **après la mort médiane (42 s)** ;
  l'ordre imposé par le bouton est imprévisible ; un bouton à aller chercher.
- **En mieux.** La démo n'a **aucun pouvoir**. Reprendre les trois, en mieux :
  1. **un pouvoir équipé par niveau**, choisi sur la carte de briefing parmi ceux débloqués (TRAVERSÉE au
     chapitre 1, RALENTI au 2, REPLI au 3 : un système à la fois, G-05) ;
  2. déclenché par **un toucher bref sans glisser** n'importe où (le cap ne bouge pas : mag reste sous la
     zone morte, J-02) ; E au clavier, X à la manette ;
  3. lisibilité en gros pixels : TRAVERSÉE = serpent tramé un pixel sur deux `cyan`/`cyanPale`
     (hologramme) ; RALENTI = balayage `indigo` sur le décor et musique sous passe-bas (G-32) ; REPLI =
     perles de corps qui passent de 9 à 13 px, la transformation se voit d'un coup.

### G2. Recharge visible
- **Quoi.** `buttonState()` : identifiant, nom, glyphe, couleur, recharge restante, remplissage ; toast
  « POUVOIR PRÊT ◈ / E » la première fois.
- **En mieux.** Pas de bouton : un **second arc autour de la tête** (rayon 2,6 × tête dans 2030) se
  remplit, un bip discret et un éclat d'un pixel quand il est prêt.

---

## H. La caméra

### H1. Suivi avec avance et bande de tête
- **Quoi.** Arène **2 600 × 1 600 u**, vue de 780 u de haut (largeur bornée entre 1 000 et 1 600 u selon
  l'écran, pour ne pas couper une fenêtre haute ni donner trop de champ à l'ultra-large). Cible =
  tête + **0,55 × vitesse** dans le sens du cap (≈ 82 u, ≈ 157 u en boost), bornée à l'arène ; lissage
  `1 − 0,0015^dt` ; **tête maintenue entre 12 % et 88 %** de l'écran. Mesuré : tête à 0,436 de la
  largeur, 539 u visibles devant pour 417 derrière, stable en 6 images après un virage. Au menu, la
  caméra dérive lentement vers le centre de l'arène.
- **Pourquoi c'est bien.** On voyage : l'écran défile, on découvre ce qui vient, on voit plus loin devant
  que derrière. C'est ce qui manque le plus à la démo, dont l'arène est l'écran : rien ne bouge sauf les
  entités, d'où l'impression de « basique ».
- **Défauts mesurés :** ce qui naît ou tire hors champ tue (52 % des coups, avant G6) ; le bureau voyait
  moins d'arène que l'iPhone.
- **En mieux.** Recommandation : **arène de 2 × 2 écrans environ** pour les niveaux ordinaires, **arène =
  écran pour les boss** (salle d'arcade classique, tout est visible), caméra **au pixel entier** :
  avance vers l'**intention** (direction du manche, pas seulement du cap ; FEEL-12 : ≈ 120 px d'avance en
  ligne droite à l'échelle 2030), tête bornée entre 30 % et 70 % (l'écran est petit), et en portrait
  hors du quart bas (J-09). Garde-fous indispensables repris de G6 : rien n'arme ni ne tire hors champ,
  chevrons de bord (la démo les a), naissance hors champ. Arrière-plan `horizon` en parallaxe lente
  (permis par CONTRAT.md), assombri, qui donne la profondeur que les effets 3D donnaient en 2030.

### H2. Zoom qui respire
- **Quoi.** Base 1,30 sur téléphone, 1,05 sur bureau ; toutes les 20-32 s (après 8 s de secteur), **gros
  plan ×1,54 pendant 3,4 s** (son `warp`) puis **recul ×0,77 pendant 4,6 s**, puis retour ; lissage
  `0,02^dt` ; le zoom suit aussi la vitesse (D3) ; compensation de la bascule pour qu'elle ne se lise pas
  comme un zoom.
- **Pourquoi c'est bien.** Le cadrage vit et rythme la partie.
- **Défauts.** Aléatoire et sans lien avec le jeu (audit FEEL-12) ; zoom mesuré de 0,66 à 1,82, ce qui
  change la taille de tout.
- **En mieux.** Le zoom non entier est interdit en pixel art. Le remplacer par **des cadrages pilotés par
  le jeu**, au pixel entier : avance plus longue en boost, recadrage sur le colosse à son entrée, léger
  recul à l'ultime. Les « gros plans » deviennent des **interludes** (60-intro.js) ou un changement
  d'échelle entière **entre deux niveaux** seulement (px 2 → 3 pour un niveau « rapproché »).

### H3. Pulsation d'impact
- **Quoi.** `pulse(a)` : coup de zoom bref (kill 0,035, élite 0,09, phase 0,10, montée de niveau 0,08,
  repli 0,2), décroissance `0,0015^dt` ; coupé si « réduire les secousses ».
- **En mieux.** En pixels : **poussée de caméra d'1 à 3 px** à l'opposé du tir ou vers l'impact
  (G-27 : secousse à « trauma » et recul opposé au tir ; 20-crt.js sait déjà lire `S.shakeX/Y`).

### H4. Jolt : le plateau encaisse
- **Quoi.** Un coup lourd fait **piquer** (bascule +0,16 × p, max 0,46) et **rouler** (±0,085 × p selon
  l'angle du coup, max ±0,19) le plateau, qui se redresse (`0,012^dt`) ; p = 0,6 coup ordinaire, 1,5
  élite, 2 boss.
- **Pourquoi c'est bien.** Le monde réagit physiquement au coup, et du côté du coup.
- **En mieux.** Rotation interdite au plan de jeu. Équivalent pixel : **décalage de caméra de 3-6 px dans
  la direction du coup**, retour amorti, et un frémissement du décor de fond (les lignes de la grille se
  décalent d'un pixel par rangée, effet « écran qui tremble » des bornes).

### H5. Étendue réellement visible et projection
- **Quoi.** `visibleExtent()` calcule ce que l'œil voit sous la bascule et le roulis (inclusion
  excessive choisie plutôt qu'exclusion d'un point visible) ; `toScreen`, `worldToScreen` ; la caméra
  corrige itérativement pour garder la tête dans la bande. Mesuré avant correction : **tête hors écran
  21 % des images** pendant la bascule sur iPhone.
- **En mieux.** Sans bascule du plan de jeu (voir I3), inutile : tout se calcule au pixel. Retenir la
  leçon : **la tête ne quitte jamais l'écran**, vérifiée par un test sur captures (G-11).

---

## I. Les phases de mise en scène et le treillis

### I1. Une ouverture écrite, puis du hasard pondéré
- **Quoi.** `SCRIPT` : **GRILLE** (treillis orthogonal, 6 s) → **ESPACE** (4 s, zoom 1,04) → **ROULIS**
  (5 s, rotation 0,20 rad) → **PERSPECTIVE** (22 s, **bascule 3D à 30°**, roulis −0,05), une seconde
  entre deux, la bascule vers 19-20 s ; ensuite tirage dans `POOL [3,3,2,0,3,1]` (la perspective revient
  trois fois sur six, « c'est elle qu'on vient voir ») toutes les 10-18 s. Bannière seulement **à la
  première rencontre par profil**, ensuite une étiquette de 11 px ; stinger musical 0,7, pulsation 0,10.
- **Pourquoi c'est bien.** Le spectacle se renouvelle toutes les 10-20 s : c'est la grande force visuelle
  de 2030 et l'anti-« triste » par excellence.
- **Défauts mesurés :** quatre bannières plein écran en 22 s qui n'enseignaient rien (corrigé) ; phases
  **purement visuelles**, sans règle ; +21 % de coups pendant la bascule, +28 % sur le treillis.
- **En mieux.** Garder le principe **« le décor change de régime toutes les 15-25 s »**, mais chaque phase
  doit **changer une règle** et rester lisible : voir I2-I4. Les déclencher aux temps forts du niveau
  (calme, montée, pic) et à la mesure musicale (G-31), jamais au hasard.

### I2. Le treillis : des rails façon moto-lumière
- **Quoi.** Deux orientations (orthogonale, diagonale à 45°), pas de **165 u**, avertissement de 1,4 s
  (trait fin `#142c72`) puis rails `#2a55cc` qui s'allument. Sur les rails, serpent **et ennemis** n'ont
  que quatre caps ; on ne tourne qu'**en atteignant** une droite de la famille visée ; hystérésis 35° ;
  **retour au nœud** franchi depuis moins de 72 u (le chemin est rembobiné, le virage se fait dans la même
  image) ; **demi-tour = deux quarts aux deux nœuds suivants** ; verrou de nœud (pas deux virages au même) ;
  entrée sur le réseau en glissant 0,5 s ; **nœud d'attente montré** (disque pulsé de 10 u + flèche
  fantôme de 24 u, 120 ms de rémanence). Les rails ne blessent pas, ils canalisent.
- **Pourquoi c'est bien.** Hommage au Snake sur grille et à Tron, changement total de pilotage, beau.
- **Défauts mesurés :** au pas de 330 u, virage différé de **700 ms médianes, 1,85 s au pire, classé
  bloquant** (J-06) ; corrigé à 165 u, il reste une latence ; aucun comportement ennemi n'utilise la
  grille (« file indienne » espérée : 12 % des cas) ; +28 % de coups, −25 % de kills.
- **En mieux.** En faire une **phase « GRILLE » assumée, Snake classique en gros pixels** : cases de
  8 à 10 px, une case en 100 ms au plus, **deux virages mis en file, aucun perdu** (J-06, Nimble Quest),
  virage au **prochain croisement** et jamais plus loin, flèche de virage en attente sur le croisement.
  Et **une règle à elle** : le serpent laisse une traînée lumineuse de 2 s qui détruit les petits
  ennemis qui la coupent (duel Tron, proposition ENN-9 de l'audit) ; les ennemis sont eux aussi sur la
  grille. Durée courte (15-20 s), annoncée 1,4 s avant par la grille qui s'allume en tramé.

### I3. La bascule 3D (PERSPECTIVE) et le roulis
- **Quoi.** Transformation CSS du canvas : `perspective(CH × 0,5 × 4,6 px) rotateX(30°) scale(cover)`
  (×1,298 à 30°), installée lentement (`0,14^dt`), compensée dans le zoom ; sol en perspective dont les
  lignes se resserrent vers le fond (pas × 1,09) ; roulis = rotation du plateau. Calculée par le GPU (la
  première version recopiait 96 bandes par image : 73 % du processeur).
- **Pourquoi c'est bien.** Le « wow » de 2030 : le plateau bascule vers l'horizon façon Tron.
- **Défauts mesurés :** silhouettes du fond réduites à 61 %, haut de l'écran rogné, tête hors écran,
  +21 % de coups, qualité dégradée d'un cran pendant la bascule.
- **En mieux.** Une rotation ou une perspective du plan de jeu casse les pixels carrés : **interdit**.
  Deux reprises possibles, toutes deux compatibles avec la palette fermée :
  1. **sol « mode 7 » sous le jeu** : la grille de fond (seulement elle) est calculée rangée par rangée
     en perspective vers l'horizon, tramée, et défile sous le serpent ; le plan de jeu reste à plat et
     lisible ;
  2. **séquence bonus « AUTOROUTE »** de 8-10 s entre deux phases : le serpent fonce vers l'horizon sur la
     grille du panneau `horizon` (comme le titre de 60-intro.js), on ramasse de l'énergie et on évite des
     piliers, sans danger mortel. Le spectacle de la bascule, sans son coût de lisibilité.
  Le roulis est abandonné.

### I4. ESPACE et zoom de phase
- **Quoi.** Phase ESPACE : zoom 1,04, pas de grille.
- **En mieux.** Devient une **phase de respiration** (G-17) : fond étoilé `ciel()` de 60-intro.js, énergie
  abondante, ennemis rares, lead de la musique coupé.

### I5. Couleur du treillis séparée de la joueuse
- **Quoi.** G11 : le rail n'est plus cyan (contraste 1,14:1 avec le corps) mais bleu à 4,18:1.
- **En mieux.** Déjà la règle de 2975 (cyan réservé) : treillis en `violet`/`indigo`.

---

## J. Le déroulé d'une partie

### J1. Secteurs nommés, phases internes, cycles
- **Quoi.** (`25-levels.js`, piloté par le cœur via `S.level`.) Quatre secteurs : **LA GRILLE** (calme 10,
  montée 24, déferlante 24, apogée 34, nettoyage 6 → 98 s, boss PROTOTYPE ZÉRO), **AUTOROUTE NÉON**
  (112 s, couloirs, boss DOUBLE LAME), **ZONE MAGNÉTIQUE** (122 s, champ, boss NOYAU MAGNÉTIQUE),
  **SURCHARGE** (111 s, boss SURCHARGE), puis SURCHARGE se répète en **cycles** (`cycle = secteur − 3`).
  Chaque secteur : une mécanique d'arène, une palette, une bannière « NIVEAU N — NOM ».
- **Pourquoi c'est bien.** La partie avance par étapes nommées, avec un boss à chaque fin : on sait où on
  en est et ce qui vient.
- **Défauts mesurés :** les secteurs défilent à **horaire fixe** quel que soit le joueur (secteur 2 à 80 s,
  3 à 170 s, 6 à 500 s) ; 7 parties réelles sur 7 finissent au secteur 1 ; les phases « calme » ne sont
  pas calmes (8 ennemis vivants médians) ; pas de vraie respiration.
- **En mieux.** C'est la base de la campagne proposée par G (§ 3.3) : **calme 0:00-0:10, montée,
  pic 1 à 57-67 %, respiration sous 40 % du pic, apogée, purge** (la démo a déjà une purge en chaîne :
  la garder comme fin de chaque niveau). Fin de niveau sur le **franchissement d'un objectif** (boss
  abattu, temps tenu) et non sur l'horloge seule.

### J2. Directeur de difficulté géométrique
- **Quoi.** Pour les ennemis non-boss : PV × **2,60^(secteur−1)** × (1 + 0,04 × cycle) ; dégâts ×
  (1 + **1,90** × (secteur−1) + 0,10 × cycle) ; vitesse × min(**1,60**, 1 + 0,16 × (secteur−1) +
  0,03 × cycle). Commentaire du code : la pente linéaire (+8 %/secteur) « ne fait rien » face à une
  puissance de feu de 3 400 PV/s ; il faut une pente géométrique. Cible : le bilan segments perdus/regagnés
  bascule vers 550 s. Les boss en sont exclus (pas d'empilement de facteurs). Par cran de difficulté :
  PV × m^0,5, dégâts × m^0,35, vitesse × (1 + 0,1 (m−1)) ; élite PV ×3,2, score/XP ×4, rayon ×1,35.
- **Pourquoi c'est bien.** La partie sans fin finit par tuer même l'excellent joueur (6 à 12 min visées),
  au lieu du plateau mesuré (100 % des bons pilotes au plafond de 10 min).
- **En mieux.** Pour un **mode sans fin** (K1). En campagne, la difficulté est écrite niveau par niveau ;
  retenir la leçon : **mesurer l'équilibre par simulation à graine fixe** (la démo a déjà un pilote
  automatique déterministe).

### J3. Ce qui se passe entre deux secteurs
- **Quoi.** À la mort d'un boss : bannière, **purge** des survivants, **main TROPHÉE** (aucune carte
  commune, au moins une épique), +60 crédits, ultime +50 ; à l'entrée d'un secteur, les survivants
  **fuient** à 400 u/s et ne blessent plus. Arrivée du boss pilotée vers le cadre, **ralenti du monde 0,3
  pendant 2,2 s, la joueuse à vitesse normale**, boss invulnérable pendant sa bannière.
- **Pourquoi c'est bien.** Chaque secteur se ferme net et récompense ; le boss entre comme un événement.
- **En mieux.** La démo a l'interlude ALERTE + COLOSSE (gel complet) : y ajouter, au retour en jeu, **le
  ralenti de 2,2 s pendant lequel le colosse se met en place** et, à sa mort, la **main trophée** et la
  purge. La fuite des survivants devient le début de la respiration.

### J4. La montée de niveau mise en scène, puis UN écran de cartes
- **Quoi.** `openCards` : **350 ms de ralenti tenu à 0,15** avant les cartes, invulnérabilité, flash 0,3,
  anneau qui part de la tête jusqu'à 2 000 u, pulsation 0,08, son `levelup` ; puis une seule fenêtre :
  **3 cartes, 4 si deux montées attendaient**, toute la file absorbée par le choix ; **2,5 s minimum**
  entre deux écrans (mesuré : 2,6 % d'écrans enchaînés en moins de 2 s) ; un ultime en cours s'arrête.
- **Pourquoi c'est bien.** On voit la montée (avant : son seul puis cartes à l'image suivante) ; jamais
  deux interruptions coup sur coup.
- **Défauts.** Chaque écran de cartes interrompt l'action (choix en plein danger).
- **En mieux.** En gros pixels : anneau tramé `jaune` depuis la tête, ralenti de 350 ms, puis **3 cartes
  hautes** (cibles de 44 pt, J-30), nom en police 5×7 échelle 2, une ligne de description, choix d'un
  pouce, 1/2/3 au clavier. Les cartes tombent plutôt **dans les respirations** (G-17), comme la boutique
  de Brotato entre les vagues.

### J5. Signaux « prêt »
- **Quoi.** `readyTick` : son `ultReady` + toast la première fois que l'ultime est plein ; toast
  « POUVOIR PRÊT » à 2,5 s de partie ou à la première recharge.
- **En mieux.** Signaux au bord de la tête (arcs D2/G2) + son ; texte une seule fois par profil.

### J6. Un départ armé et appris en jouant
- **Quoi.** `resetRun` : on démarre avec le canon frontal niveau 1 (« le tir automatique s'enseigne tout
  seul, sans tutoriel »), 9 segments, l'ultime vide.
- **En mieux.** Déjà dans la démo (tir automatique, pouce fantôme, premier ennemi après le premier
  virage, J-14). À garder tel quel.

---

## K. Modes et difficulté

### K1. Une partie sans fin à cycles de surcharge
- **Quoi.** Après le secteur 4, SURCHARGE recommence avec un cycle de plus : multiplicateur plafonné à
  16 au lieu de 12, ennemis plus durs (J2).
- **En mieux.** Le **mode SURCHARGE** proposé par G-10 : ouvert après le premier boss de la campagne,
  une partie sans fin à secteurs, record à part. La campagne reste le mode principal.

### K2. Cinq crans nommés avec facteur de score
- **Quoi.** `DIFFS` : FACILE 1,25 · NORMAL 1,55 (défaut) · DIFFICILE 1,90 · BRUTAL 2,30 · SUICIDE 2,75 ;
  score × 0,8 à × 2,0 ; échelle retaillée sur des survies mesurées (l'ancienne : premier cran sans fin,
  deux crans indiscernables, dernier qui tuait avant le premier contenu).
- **Défauts.** Les crans restaient indiscernables tôt et sans effet tard ; un menu à régler avant de jouer.
- **En mieux.** Pas de sélecteur avant de jouer. À la place : **aide proposée après 3 morts** sur un niveau
  (G-18, signalée par une icône) et **modificateurs nommés** après le boss (G-10, façon Hades), qui
  multiplient le score.

---

## L. Écrans de début, de pause et de fin

### L1. Menu
- **Quoi.** (Orchestré par 90-boot, dessiné par 26-ui.) Titre, accroche « ARCADE SURVIE — SURVIS À LA
  SURCHARGE », MEILLEUR / CRÉDITS / PARTIES (masqués avant la première partie), JOUER / RÉGLAGES /
  DÉBLOCAGES, légende des touches par appareil, Entrée = JOUER ; derrière, l'arène et le serpent, caméra
  qui dérive vers le centre. JOUER → jeu en **541-583 ms**.
- **Défauts.** Aucune instruction au premier lancement ; fond figé (le mode « attract » a été écarté).
- **En mieux.** La démo enchaîne ouverture → « TOUCHE POUR JOUER » sans menu. Garder ces **deux touchers
  au plus** (J-13) pour la première fois, puis un écran-titre sur le panneau `affiche` avec JOUER seul,
  et les autres entrées (défis, galerie, mode SURCHARGE, réglages) qui apparaissent aux jalons (G-05).
  **Mode attract** derrière le titre : une partie jouée par le pilote automatique déterministe qui existe
  déjà pour les bancs de test — c'est la borne d'arcade de 1985.

### L2. Pause
- **Quoi.** P/Échap, bouton, arrière-plan, perte de focus (bandeau distinct « fenêtre inactive ») ;
  toute pause vide les touches ; reprise par Entrée/Espace ; musique arrêtée ; verrou d'écran redemandé.
- **En mieux.** La démo pause en arrière-plan et reprend au premier geste. Ajouter : **pause sur perte de
  focus au bureau** (J-18 : `blur` vide les touches mais ne met pas en pause dans la démo), écran de pause
  qui montre le pouvoir équipé et les trois défis du niveau.

### L3. Écran de fin qui explique
- **Quoi.** « SIGNAL PERDU » puis : **« Détruit par TRAQUEUR — niveau 1 — 62 % du secteur — 0:52 »**,
  score, durée, secteur, avancement, détruits, **combo max**, arme, record du cran, crédits gagnés,
  **libellé de build** (« ÉLECTRICIEN — ARC 6 ») et cartes en icônes, **écart avec la partie précédente et
  le record**, **un conseil par règle** (ultime prêt et pas utilisé ; pouvoir jamais utilisé ; jamais
  boosté ; aucune carte), **barre « PROCHAIN DÉBLOCAGE : X dans N ◆ »**, bouton « REJOUER AU CRAN
  SUPÉRIEUR » après le secteur 3 ; « NOUVEAU RECORD » seulement à partir de la 2e partie. REJOUER en moins
  de 600 ms.
- **Pourquoi c'est bien.** La mort apprend quelque chose et donne une prochaine marche (G-03).
- **Défauts.** Beaucoup de tuiles à 7 px sur iPhone avant G10 ; trop d'informations pour un téléphone.
- **En mieux.** La démo affiche VICTOIRE/DÉFAITE, score, record, défi, sur le panneau de fin : bon fond.
  Y ajouter **en six lignes de 5×7 au plus** : cause (« DÉTRUIT PAR FLÈCHE — 62 % »), record et écart,
  état des **trois défis**, **un conseil**, barre du prochain déblocage (énergie totale, G-04). Relance au
  premier toucher après la garde de 0,45 s (déjà dans la démo), joueuse aux commandes en moins de 2 s
  (G-02).

### L4. Plein écran honnête
- **Quoi.** Trois mondes : API disponible (bascule + verrou paysage), cadre qui refuse (notice « ouvre la
  page dans son onglet »), Safari iPhone sans API (notice « Partager → Sur l'écran d'accueil » + repli de
  la barre Safari de 80 px pendant 900 ms) ; bouton seulement sur le menu et l'écran de fin, « (F) » sur
  bureau ; sortie du plein écran en partie = pause.
- **En mieux.** Sur iPhone seule la web app d'écran d'accueil existe (J-26, V-27) : manifeste
  `standalone`, `apple-touch-icon` en gros pixels, et **une image unique** en pixels « Partager → Sur
  l'écran d'accueil » (la démo n'a ni manifeste ni icône). Au bureau, F bascule le plein écran.

---

## M. Sauvegarde, records, méta-progression

### M1. Profil local versionné
- **Quoi.** `localStorage['snake2030.v1'] = { stats, opt }` : meilleur, crédits, parties, records par cran,
  meilleur secteur, meilleur temps, boss abattus, dernière partie, cran de qualité stable, phases déjà
  vues ; migration d'un vieux profil (records par cran recréés) ; écriture en fin de partie, au réglage,
  à l'achat. Neuf profils corrompus testés sans casse.
- **Défauts mesurés :** aucune sauvegarde **pendant** la partie (onglet tué = tout perdu ; ROB-2 écarté) ;
  effacement possible par Safari après 7 jours sans visite (V-40).
- **En mieux.** La démo a trois clés éparses (`snake2975.son`, `.record`, `.fx`). Une **clé unique
  versionnée** `snake2975.v1` (progression de campagne, étoiles, énergie totale, records par niveau et
  par mode, options, « déjà vu »), écrite **à chaque fin de niveau et à l'entrée de chaque boss** (G-08),
  instantané léger pendant la partie et sur `pagehide`, `navigator.storage.persist()` après la première
  mission et **code d'export** (V-40).

### M2. Déblocages permanents
- **Quoi.** Six articles achetés en crédits (1 crédit par kill, 5 par élite) et appliqués par `resetRun` :
  BIO-RALLONGE 120 ◆ (+3 segments), RÉACTEUR 180 (boost 125), CANON LOURD 240 (canon niveau 2),
  CONDENSATEUR 320 (ultime à 80), PARE-CHOCS 400 (une charge de bouclier), ORACLE 520 (cartes rares).
- **Défauts mesurés :** économie dégénérée (25 à 250 parties pour le premier article, ou tout en une
  partie) ; bonus plats sans effet sur le bon joueur.
- **En mieux.** G-04 : l'énergie de chaque partie remplit un **total** qui ouvre des **styles**, des
  pouvoirs, des palettes (échange d'index, V-12) et des modes, pas des statistiques plates.

---

## N. Réglages et confort

### N1. Réglages en trois onglets
- **Quoi.** JEU (difficulté, qualité d'image, musique, effets), CONTRÔLES (manche fixe/flottant, main
  directrice, taille, opacité, hauteur, écart des contrôles ; au bureau sensibilité et mode souris),
  CONFORT (réduire mouvements / flashs / secousses / bloom, contraste renforcé, vibrations, taille de
  l'interface, densité des particules) : une vingtaine de lignes, chacune décrite ; lignes tactiles
  masquées au bureau ; « réduire les mouvements » pré-coché si le système le demande.
- **Défauts mesurés :** 18 lignes sur 4 écrans de défilement avant G10 (J-32 en veut six au plus).
- **En mieux.** La démo n'a **qu'un bouton son** (et `N.fx.setShake` sans écran pour le régler). Un seul
  écran, **six lignes** : secousse 100/50/0 %, flashs, CRT (balayage et halo), son en silencieux,
  musique, texte ×2 (V-07). Défauts tirés de `prefers-reduced-motion` et `prefers-contrast`.

### N2. Vibrations
- **Quoi.** `haptic(motif)` sur boost, panne, coups, kills d'élite, ramassages, mort.
- **En mieux.** Inexistant sur iPhone (J-25) : seulement si `navigator.vibrate` existe, et grondement de
  manette au bureau.

---

## O. L'amorçage technique (ce que 90-boot orchestre)

### O1. Horloge à pas fixe
- **Quoi.** Accumulateur du temps réel dépensé par **pas de 1/120 s**, au plus 4 pas par image
  (rattrapage borné à 33 ms), le reste reporté, l'excédent compté dans `S.dropped`. Avant : dt plafonné à
  50 ms → **6,4 % de temps de jeu perdu** sur machine lente. Déterministe à graine et entrées égales.
- **En mieux.** La démo plafonne dt à 50 ms avec pas variable : reprendre le pas fixe. C'est aussi ce qui
  permet **de rejouer la frappe finale** à partir de la graine et des entrées (G-40) et de tenir J-29.

### O2. Gel d'image compté en images
- **Quoi.** `frame()` lit le gel restant, gèle (dt × 0,08), **puis** consomme ; jamais dans l'image de
  pose. Avant : `hitstop(12 ms)` = 0 image gelée.
- **En mieux.** Déjà dans 2975 (50-fx.js). Retenir les valeurs : kill 2, élite 5, blessure 4, mort 8 ;
  un virage demandé pendant un gel n'est jamais perdu (J-21).

### O3. Ralentis superposés avec priorité
- **Quoi.** `S.timeScale` : ralenti de blessure (0,4), d'ultime (0,25), de montée de niveau (0,15),
  d'entrée de boss (0,3, la joueuse garde sa vitesse monde), RALENTI (ennemis à 0,35), SURSIS.
  L'ordre d'écriture décide de la priorité (boss en dernier).
- **En mieux.** Un seul arbitre « le plus lent gagne, la joueuse exemptée quand c'est son pouvoir ».

### O4. Quarantaine des erreurs
- **Quoi.** Chaque étape d'image dans un `try` ; une entité qui lève est retirée ; erreurs comptées une
  fois par signature dans `window.__ERR` ; pile du contexte de dessin restaurée. Avant : 494 exceptions
  en 10 min gelaient image et collisions.
- **En mieux.** Déjà dans la démo (`step`). Ajouter le **retrait de l'entité fautive**.

### O5. Qualité adaptative à hystérésis
- **Quoi.** Mesure de la part d'images de plus de 33 ms sur 2 s ; descente si plus de 6 % (deux crans si
  plus de 50 %), remontée seulement après 45 s sous 1 % et 90 s depuis la dernière ; jamais pendant la
  bascule ; étalonnage sur la médiane des 3 premières secondes ; **cran stable mémorisé** pour la partie
  suivante ; le réglage du joueur n'est jamais écrasé. Avant : 20 changements de netteté en 5 min.
- **En mieux.** La résolution de 2975 est fixée par la règle du pixel entier : appliquer la même
  mécanique **aux couches CRT** (halo puis balayage, jamais la lisibilité, V-30), mémorisée par appareil.

### O6. Démarrage étalé, préchauffage, redimensionnement
- **Quoi.** JOUER : remise à zéro tout de suite, plein écran à l'image suivante, audio à celle d'après
  (avant : gel de 350-533 ms au clic) ; sprites, polices et bruit audio créés au démarrage ; un seul
  minuteur de redimensionnement (80 ms + passage final à 400 ms) ; réallocation seulement si la taille
  change.
- **En mieux.** REPRISE.md signale justement « l'à-coup d'une image quand le son démarre » : même remède.

### O7. Cycle de vie
- **Quoi.** Arrière-plan, `blur`, `pagehide` → toutes les entrées relâchées, pause ; retour → audio relancé
  (`interrupted` de Safari), verrou d'écran redemandé ; armement audio sur le premier geste, relance à
  chaque geste ensuite ; fenêtre portrait sur téléphone = pause.
- **En mieux.** La démo couvre l'arrière-plan et le son. Ajouter : **pause sur `blur` au bureau**, **verrou
  d'écran** pendant les parties et cinématiques (V-39, absent de la démo).

### O8. Lisibilité garantie par l'ordre de dessin
- **Quoi.** Ordre : décor, sol, bord, flaques, butin, ennemis, tirs, treillis, effets, voiles, **serpent
  au-dessus des effets**, télégraphes longs, **marque de tête dessinée en dernier** (triangle blanc avec
  liseré) ; plancher de trait de 2 px à l'écran.
- **En mieux.** Déjà la logique de `drawTop` dans 2975 (G-11). Garder.

---

## Les 10 idées les plus importantes du domaine, classées

1. **La boucle de progression en partie** : expérience → montée de niveau mise en scène (ralenti 350 ms,
   anneau) → choix de 3 cartes, une toutes les 20-30 s (E4, J4). C'est ce qui donne envie de continuer.
2. **La longueur est la vie, le corps est un bouclier** : grandir = survivre, chaque coup coupe la queue,
   les tirs absorbés chargent le boost (B1, C3). Remplace les 3 cœurs de la démo.
3. **Une caméra qui voyage** : monde plus grand que l'écran, avance vers l'intention, secousses et poussées
   au pixel, parallaxe `horizon` (H1, H3, H4). Contre l'arène figée.
4. **La mise en scène qui change de régime toutes les 15-25 s** : GRILLE (Snake classique en gros pixels
   avec traînée Tron), respiration étoilée, sol mode 7, séquence AUTOROUTE (I1-I4).
5. **Le combo-multiplicateur audible et lisible** : ×N qui monte par paliers, son de kill qui monte d'un
   demi-ton, texte qui grossit, fenêtre de 5 s, divisé par deux au coup (E1, E2).
6. **L'ultime APOGÉE** : jauge qui se remplit par le jeu, déclenchée par un double toucher, six anneaux
   tramés concentriques, ralenti (F1). L'explosion énorme demandée par DIRECTION.md, au moment choisi.
7. **Le boost à réserve sans bouton** : manche poussé au-delà de 80 %, panne franche, jauge autour de la
   tête, bélier contre les petits ennemis (D1, D2, C4).
8. **Les trois pouvoirs** TRAVERSÉE, RALENTI, REPLI, un équipé par niveau, déclenché par un toucher bref
   (G1). Le REPLI (troquer sa longueur contre de la force) est l'idée la plus originale.
9. **Une partie qui avance par étapes nommées** : secteurs à phases (calme, montée, pic, respiration,
   apogée, purge), boss qui entre au ralenti, purge, main trophée, puis mode SURCHARGE sans fin avec
   directeur de difficulté (J1-J3, K1).
10. **Un écran de fin qui explique et relance** : cause de la mort, écart au record, défis, un conseil,
    prochain déblocage, relance en moins de 2 s ; sauvegarde unique versionnée (L3, M1).

Hors classement mais indispensables pour tout le reste : horloge à pas fixe (O1), ralentis arbitrés (O3),
coup encaissé lisible avec source (C1), entrées souris et manette au bureau (A5).

## Ce que la démo actuelle (70-game.js, 60-intro.js) n'a pas

- **Aucune caméra** : l'arène est l'écran (« L'ARÈNE EST L'ÉCRAN. Pas de caméra »), rien ne défile, pas
  d'avance, pas de poussée de caméra propre au jeu (seulement `N.fx.shake`), pas de parallaxe en jeu.
- **Aucune mise en scène en partie** : pas de phases, pas de treillis, pas de changement de décor ; le fond
  est un quadrillage fixe avec quelques impulsions de données.
- **Aucune progression en partie** : ni XP, ni montée de niveau, ni cartes, ni build ; la puissance ne vient
  que de la longueur (1, 2, 3 puis 5 canons à 10, 20, 32 segments).
- **Pas de boost, pas de pouvoir, pas d'ultime** : la seule action est diriger.
- **Pas de combo-multiplicateur** : une chaîne de 1,6 s qui ne sert qu'au défi ; multiplicateur tiré de
  la longueur (×1 à ×8), sans palier sonore, sans texte qui grossit.
- **Vie en 3 cœurs** au lieu de la longueur ; pas de battement de cœur à longueur critique, pas de
  bouclier, pas de régénération.
- **Pas de structure de partie** : 2 minutes en montée continue, un seul colosse à 1 min 16, un seul défi ;
  ni secteurs, ni respiration, ni purge-récompense, ni main trophée, ni mode sans fin.
- **Pas de ralenti** (blessure, entrée de boss, ultime, montée de niveau) ; l'interlude du colosse gèle
  le jeu, puis le colosse apparaît sans entrée mise en scène.
- **Pas de menu ni de réglages** : ouverture → « TOUCHE POUR JOUER » ; seul réglage, le son (la secousse
  et les flashs de 50-fx.js n'ont pas d'écran) ; pas de mode attract.
- **Écran de fin minimal** : VICTOIRE/DÉFAITE, score, record, défi ; ni cause de la mort, ni écart, ni
  conseil, ni prochain objectif ; pas de total d'énergie ni de déblocage.
- **Sauvegarde éparse** (record, son, secousse en trois clés) ; pas de progression, pas d'export.
- **Amorçage** : pas d'horloge à pas fixe (dt plafonné à 50 ms), pas de pause sur perte de focus au
  bureau, pas de souris ni de manette, pas de verrou d'écran, pas de manifeste ni d'icône d'écran
  d'accueil, pas de qualité adaptative des couches CRT.

Ce que la démo fait déjà mieux que 2030 et qu'il faut garder : manche flottant né n'importe où, cap
mémorisé au relâcher, portrait et paysage avec rotation en pleine partie, pixels carrés et palette
fermée, interlude ALERTE/COLOSSE avec les panneaux, ouverture sautable, pouce fantôme et premier ennemi
après le premier virage, télégraphes à l'endroit exact des dégâts, purge finale en chaîne, limiteur de
flashs, corps qui absorbe dès le 2e segment.
