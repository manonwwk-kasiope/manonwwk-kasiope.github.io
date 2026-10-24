# SNAKE 2030 → SNAKE 2975 : inventaire de l'interface, des effets et de l'audio

*Inventaire du 17 octobre 2026 pour la refonte de `proto-neon/`. Domaine : écrans, menus, HUD, boutons, retours
visuels, explosions, particules, éclairages, transitions, musique (les deux MP3 et leur usage), sons, et tout ce qui
donne de la vie, de la couleur et de l'émotion. Les retours de la propriétaire (`refonte/RETOURS-PROPRIETAIRE.md`)
priment sur tout le reste : « triste, basique », « trop facile », « des scrollings parallaxes », « il faut pouvoir
mourir ».*

## Comment ce document a été fait

- **Lus en entier** : `snake2030/src/26-ui.js` (2 166 lignes), `20-fx.js` (1 138), `21-audio.js` (1 429).
- **Lus pour savoir qui déclenche quoi, et avec quels chiffres** : `10-core.js` (blessure, mort, kill, butin, esquive
  musicale, vibrations), `90-boot.js` (musique, démarrage, pause, ultime, montée de niveau, rendu du serpent),
  `25-levels.js` (bannières, phases, portails, boss, décor), `27-phases.js` (phases de caméra), `22-enemies.js`
  (morts, glitch), `CONTRACT.md`, et `docs/audit-2026-09.md` (objectifs G8, G10, G11, G12, G14 ; audits AUDIOVISUEL,
  ACCUEIL, SENSATIONS ; propositions écartées).
- **Les deux MP3 ont été mesurés** (ffprobe, niveau RMS par fenêtres de 1 à 5 s).
- **Démo SNAKE 2975 lue en entier** : `proto-neon/src/70-game.js`, `50-fx.js`, `30-music.js` ; survol de `20-crt.js`,
  `60-intro.js` et `90-boot.js` pour ne pas déclarer absent ce qui existe ailleurs.
- **Recherche** : `recherche/visuel-technique-mobile.md` (V-xx), `jouabilite-mobile.md` (J-xx),
  `game-design-campagne.md` (G-xx, et ses sections 3.x).
- **Références** : `fichier:lignes` dans `snake2030/src/`, sauf « démo » (= `proto-neon/src/`).
- **Frontières** : le contenu des ennemis, des armes, des cartes, des niveaux et des phases de caméra relève d'autres
  inventaires ; ici, seulement leur mise en scène (image, son, mot).

**Unités.** « u » = unité monde de 2030 (la vue fait 780 u de haut partout). « px » = pixel de jeu de 2975 (tampon de
422 × 195 sur iPhone 13 paysage, px = 2). Repère de conversion sur iPhone paysage : **1 px ≈ 4 u** (780 u ↔ 195 px).
Un pt iOS vaut un px CSS.

**Chaque fiche dit** : *Quoi* (comment ça marche, avec les chiffres du code) · *Pourquoi c'est bien* · *Défauts*
(mesurés par l'audit ou lus dans le code) · *En mieux dans 2975* (gros pixels, palette fermée de seize, téléphone
d'abord, exigences de la recherche).

---

## 0. L'essentiel

1. Dans SNAKE 2030, **chaque événement a une triple signature** : une image (gerbe, onde, halo, texte), un son
   calibré et panoramisé, et souvent un mot (bannière, toast, tag). La démo a surtout l'image.
2. Il **rythme la partie par des temps forts** : ralentis (0,15 à 0,4), gels comptés en images (2, 4, 5, 8), ondes,
   flash budgété, bannière, accent musical. La démo n'a aucun ralenti.
3. Sa **musique est une vraie production** : « Neon Velocity » (Suno, 144,6 BPM, deux versions de 4 min 35 et
   4 min 19, signée **manonwwk**, c'est-à-dire la propriétaire). Elle **monte avec l'action** : −6 dB à 0 dB,
   passe-bas de 700 Hz à 18 kHz, cinq couches synthétisées, accents. La démo joue une musique générative en la
   mineur, à 112 BPM au départ, avec seulement la nappe et la basse pendant vingt secondes.
4. Son **HUD raconte la progression** : expérience, multiplicateur et ce qu'il manque pour le palier suivant, secteur
   et sa barre, boss et sa jauge, vie en pastilles. La démo montre le score, les cœurs et le défi ; elle calcule un
   multiplicateur qu'elle n'affiche jamais.
5. Il **annonce tout ce qui arrive** : chevrons de portail 600 ms avant (1,4 s pour un boss), marqueurs hors champ,
   tic sonore. C'est indispensable dès que le monde dépasse l'écran (retour n° 3) et pour une mort juste (retour n° 4).
6. Il **fait peur, et justement** : vignette du côté touché, ralenti de blessure, battement de cœur à 1 Hz sous
   4 segments, alarme du boss et « drop » de la musique.
7. Le **cadre existe** : menu, cartes d'amélioration à rareté, pause, réglages, déblocages, fin de partie qui dit qui
   a tué et quoi changer. La démo n'a qu'une ouverture, une invite et un écran de fin de quatre lignes.
8. **Ce que la démo fait déjà mieux** : explosions en pixel pur avec limiteur de flashs (WCAG), secousse à trauma,
   flash de frappe, musique sans répétition, musique gardée sous étouffoir en pause, sons dans la tonalité, coupure du
   son mémorisée, interlude du colosse. À garder.
9. **Ce qu'il ne faut pas reprendre** : une interface en DOM avec polices système et dégradés, des icônes Unicode, des
   boutons fixes dans les coins (62 % des images avaient un ennemi caché dessous), le silence des menus, des couches
   musicales qui ne tombent pas sur les temps du MP3, des MP3 de 6,8 Mo.

### Pourquoi la démo paraît « triste et basique », dans ce domaine (chiffres)

| | SNAKE 2030 | Démo SNAKE 2975 |
|---|---|---|
| Tempo, tonalité | 144,6 BPM, piste produite ; percussions dès l'intensité 0,07 | 112 → 128 BPM, la mineur ; nappe et basse seules jusqu'à 20 s, batterie à 20 s, lead à 80 s (`démo 30-music.js:89-91, 686-687` ; `démo 70-game.js:1174-1180`) |
| Sons | 32 sons, en 7 positions stéréo, gains calibrés | 7 noms joués (tir, kill, bigkill, degat, butin, intro, defi), tous au centre |
| Annonces | une dizaine de bannières, des toasts, des tags, des chevrons | 3 bandeaux possibles (défi réussi, défi raté, colosse détruit) et l'interlude du colosse |
| Temps forts | ralenti à la blessure, à la montée de niveau, à l'ultime, au boss ; purge de secteur | un seul (le colosse) ; aucun ralenti ; les paliers de canons (10, 20, 32 segments) passent en silence |
| HUD | XP, multiplicateur et prochain palier, secteur, boss, vie, trois jauges | score, cœurs, défi |
| Couleur | une palette par secteur, des lumières qui suivent l'intensité | une seule arène en vide, nuit, indigo, violet du début à la fin |
| Cadre | menu, cartes, pause, réglages, déblocages, fin qui explique | ouverture, « TOUCHE POUR JOUER », fin en quatre lignes |

---

## A. Les écrans et les menus (`26-ui.js`)

### A-01 · Le menu titre (`26-ui.js:774-817`, styles `353-378`)
- *Quoi* : trois blocs empilés, centrés et bornés à 1 100 px (G10). En haut, le logo : « SNAKE » en capitales chromées
  (dégradé de texte blanc → bleu acier → blanc, halo cyan de 16 px) au-dessus de « 2030 » en magenta à double halo
  (24 et 60 px), puis l'accroche « ARCADE SURVIE — SURVIS À LA SURCHARGE ». Au milieu, le gros bouton JOUER
  (hauteur clamp(46 px, 13,5 vh, 78 px), dégradé cyan) qui « respire » (son halo passe de 26 à 48 px en 2,6 s), et
  deux pilules, RÉGLAGES et DÉBLOCAGES. En bas, le cran courant et son record (« CRAN NORMAL »), puis MEILLEUR,
  CRÉDITS et PARTIES. Sur un profil vierge, ces trois zéros laissent la place à « Première partie : les cartes tombent
  à 12 s ». Une ligne de commandes dépend de l'appareil (bureau : toutes les touches ; tactile : « Pouce gauche :
  diriger · » boost · ◈ pouvoir · ★ APOGÉE »). Raccourcis S et D.
- *Pourquoi c'est bien* : une seule action évidente, l'identité tout de suite, un but avant même de jouer (le record
  du cran), aucun chiffre inutile la première fois. JOUER mène au jeu en 541 à 583 ms, sans écran intermédiaire.
- *Défauts* : polices système, aucune fonte embarquée (AV-13 écartée), donc aucune signature ; fond presque statique
  (le monde est dessiné derrière un voile à 86-94 %) ; **aucune musique au menu** (l'audio est armé au premier geste
  mais ne démarre qu'à JOUER, `90-boot.js:1708-1714, 1413-1416`) ; avant G10, logo et JOUER s'écartaient de 3 000 px
  sur écran large.
- *En mieux dans 2975* : un écran-titre en gros pixels avec les illustrations déjà converties : `affiche` (384 × 216)
  en fond, `logo` (200 × 113) qui se construit comme dans l'ouverture, `horizon` qui défile en parallaxe lente
  (retour n° 3). JOUER est une plaque en police 5 × 7 à l'échelle 2 (≥ 44 pt, V-13), en jaune et os : le cyan reste à
  la joueuse. Record et énergie totale (G-04) n'apparaissent qu'après la première partie (G-05). Une ligne d'aide
  selon l'appareil, en acier sur nuit (V-08). **La musique joue dès l'écran-titre** : l'intro calme de « Neon
  Velocity » (dix mesures, voir J-03), et JOUER fait tomber la partie sur le décollage du morceau. Bonus : derrière le
  logo, la meilleure partie rejouée depuis sa graine et ses entrées (le moteur est déterministe, G-40).

### A-02 · Le décor des écrans (`26-ui.js:310-322`)
- *Quoi* : chaque écran pose trois couches : une lueur magenta qui monte du bas (ellipse de 120 × 90 %, 20 %), une
  lueur cyan qui tombe du haut (16 %), un voile sombre de 86 à 97 %. Par-dessus, un faux balayage en CSS (une ligne
  sombre de 1 px toutes les 3 px, à 50 %). En contraste renforcé : voile plein, sans balayage.
- *Pourquoi c'est bien* : une ambiance de borne d'arcade commune à tous les menus, pour presque rien ; le jeu reste
  deviné derrière.
- *Défauts* : un balayage simulé en haute résolution, exactement ce que DIRECTION.md interdit ; des dégradés alpha
  impossibles dans une palette fermée.
- *En mieux dans 2975* : le vrai balayage existe déjà (`20-crt.js`) et s'applique aussi aux menus. Les lueurs
  deviennent des bandes tramées par Bayer (sang → magenta en bas, indigo → violet en haut), le voile un tramage de
  nuit profonde à 50 % (`G.ditherRect`, déjà employé par la pause de la démo). Le monde continue de vivre derrière
  (parallaxe, impulsions de données).

### A-03 · L'écran de cartes AMÉLIORATION (`26-ui.js:819-854, 1671-1713`, styles `380-411` ; appel `90-boot.js:1265-1317`)
- *Quoi* : titre AMÉLIORATION, sous-titre « CHOISIS UNE CARTE », trois cartes (quatre quand deux montées attendent ;
  trois « trophée » après un boss, sans aucune commune et avec au moins une épique ou une ultra). Chaque carte a un
  liseré supérieur de 3 px et un cadre dans la couleur de sa rareté (COMMUN #9fb6cc, RARE #00e5ff, ÉPIQUE #b388ff,
  ULTRA #ffd166), un halo intérieur de 40 px, une icône (un glyphe) teintée selon l'AXE de la carte (électricité,
  laser, explosion…), un nom, une description d'une phrase, la rareté en toutes lettres, et « NIV n » ou « NOUVEAU »
  dans le coin. Entrée échelonnée : chaque carte remonte de 26 px en passant de l'échelle 0,9 à 1 en 0,34 s, avec
  55 ms d'écart ; une ULTRA pulse ensuite (halo de 22 à 52 px en 1,8 s). Choix au doigt, au clic ou aux touches 1-4,
  verrou contre le double choix, vibration de 14 ms, son « card » à l'ouverture et au choix, et au moins 2,5 s entre
  deux écrans.
- *Pourquoi c'est bien* : c'est LE moment de décision et de récompense. La rareté se lit d'un coup d'œil, l'entrée
  échelonnée donne de la valeur, l'ultra qui palpite fait envie. Couleur du cadre = rareté, teinte de l'icône =
  famille : deux informations sans un mot.
- *Défauts* : icônes en glyphes Unicode (⊥ ◐ ◈ ➤) ; textes à 7-9 px sur iPhone avant G10 ; le cyan de RARE est la
  couleur du joueur ; avant G8, les cartes tombaient sur le jeu figé, sans transition.
- *En mieux dans 2975* : trois plaques de nuit gainées de nuit profonde. La rareté est portée deux fois (V-10) : par
  la couleur (commune acier, rare ambre, épique jaune, ultra jaune et os, jamais cyan ni magenta) ET par la forme
  (cadre de 1, 2 ou 3 px, gemme de 1 à 4 facettes). Une icône sprite de 16 × 16 dessinée, pas un glyphe ; le nom en
  os, la description en acier à l'échelle 1 (14 pt, V-06), deux lignes au plus. Les cartes tombent du haut en pas
  entiers, à 55 ms d'écart, et rebondissent d'un pixel. L'ultra « brille » par une bande d'échange d'index
  jaune ↔ os qui la traverse moins de trois fois par seconde (V-21). Toute la carte est la cible (> 44 pt). La musique
  passe sous l'étouffoir à 900 Hz et reprend à la mesure suivante.

### A-04 · La pause (`26-ui.js:856-889` ; `90-boot.js:1426-1436`)
- *Quoi* : titre PAUSE, REPRENDRE (gros), RÉGLAGES et ABANDONNER (pilules), ligne des commandes. Pause subie (fenêtre
  inactive, onglet caché) : le titre devient « PAUSE — FENÊTRE INACTIVE » en ambre. Échap reprend. La musique est
  arrêtée, puis reprend au début d'une mesure.
- *Pourquoi c'est bien* : distinguer la pause voulue de la pause subie rassure (« ce n'est pas un bug ») ; la légende
  rappelle les touches au bon moment.
- *Défauts* : silence total ; aucun rappel de la construction en cours (ACC-14 écartée).
- *En mieux dans 2975* : la démo garde déjà la musique sous un passe-bas à 420 Hz en pause (`démo 30-music.js:837-845`,
  G-32) : à conserver. Sur le voile : REPRENDRE (≥ 44 pt), RÉGLAGES, QUITTER, les icônes 8 × 8 des améliorations
  prises et la ligne de commandes ; au retour d'arrière-plan, « EN PAUSE » attend un toucher (V-26, J-18).

### A-05 · La fin de partie « SIGNAL PERDU » (`26-ui.js:891-947, 1374-1462` ; journal `10-core.js:399-421`)
- *Quoi* : titre SIGNAL PERDU, et « NOUVEAU RECORD » qui clignote seulement s'il y avait un record à battre. Une ligne
  qui explique : « Détruit par TRAQUEUR D'ÉLITE — niveau 2 — 62 % du secteur — 0:52 » (cause mémorisée à chaque coup :
  ennemi, tir, « UN CONVOI », « LA ZONE »). Neuf tuiles : SCORE, DURÉE, NIVEAU, PROGRESSION, DÉTRUITS, COMBO MAX,
  ARME, RECORD, CRÉDITS. Un libellé de construction (« ÉLECTRICIEN — ARC 6 ») et les cartes prises en icônes avec leur
  niveau. L'écart avec la partie précédente et avec le record du cran. UNE phrase-conseil, la première règle qui
  s'applique : « Ton ultime ★ / R était prêt à 0:49 et n'a pas servi », « E / ◈ : traverse les ennemis 2 s »,
  « Espace / » : fuis », « Les cartes tombent à 12 s : survis jusque-là ». Une barre « PROCHAIN DÉBLOCAGE : X dans
  N ◆ » qui est un bouton vers la boutique. Puis REJOUER (magenta), REJOUER AU CRAN SUPÉRIEUR (après le secteur 3),
  MENU. La partie n'est close qu'une fois (pas de double crédit en revenant de la boutique) ; verrou de 600 ms contre
  une relance accidentelle au clavier ; l'écran arrive 900 ms après la mort.
- *Pourquoi c'est bien* : la mort devient une leçon (qui, où, quoi changer) et une promesse (combien il manque). C'est
  ce qui fait relancer (G-03). Le libellé de construction donne une identité à la partie.
- *Défauts* : chargé (l'écran défile en paysage sur téléphone) ; avant G14, il ne disait rien et annonçait un record
  dès la première partie.
- *En mieux dans 2975* : sur le panneau `defaite` assombri (déjà en place), en police 5 × 7 : SIGNAL PERDU (plutôt que
  DÉFAITE : c'est l'univers du serpent de données, « TU ES EN LIGNE » dit le briefing), la ligne « DÉTRUIT PAR FLÈCHE
  EN CHARGE — 1:07 » (la démo journalise déjà la cause dans `stats.hitLog`, `démo 70-game.js:536`, sans l'afficher),
  le score, le record, l'état des défis (G-03), l'écart avec la partie précédente, UN conseil tiré d'une règle
  (« LA FLÈCHE TREMBLE AVANT DE FONCER »), et l'énergie gagnée ajoutée au total (G-04). Quatre à six lignes, pas neuf
  tuiles. Relance d'un toucher après 0,45 s de garde (déjà là, J-17), serpent en main moins de 2 s après le coup
  fatal (G-02).

### A-06 · Les réglages (`26-ui.js:949-1152, 1210-1261`)
- *Quoi* : trois onglets (JEU, CONTRÔLES, CONFORT), un seul monté à la fois, une description d'une ligne sous chaque
  réglage. JEU : difficulté (FACILE × 0,8 à SUICIDE × 2,0 sur le score, valeurs lues dans la table du moteur pour ne
  jamais mentir), qualité d'image, musique, effets. CONTRÔLES : manche FIXE ou FLOTTANT, droitier ou gaucher, taille
  (80-140 %), opacité (50-150 %), hauteur (−24 à +44 px), écart du bord ; sur bureau, sensibilité et mode souris (AUTO,
  TOUJOURS, JAMAIS). CONFORT : « Réduire les mouvements » (réglage maître, pré-coché si le système le demande), réduire
  les flashs, les secousses, le bloom, contraste renforcé, vibrations (masquées là où elles ne marchent pas), taille de
  l'interface (85-150 %), densité des particules (40-100 %). Tout est enregistré.
- *Pourquoi c'est bien* : honnête (le facteur de score est affiché, les lignes sans objet sont masquées), accessible,
  et chaque ligne dit à quoi elle sert.
- *Défauts* : 18 lignes, quand J-32 en veut six au plus.
- *En mieux dans 2975* : un seul écran en pixels, six lignes : MUSIQUE, EFFETS, SON EN SILENCIEUX (V-34), SECOUSSE
  100 / 50 / 0 (G-28 ; `N.fx.setShake` existe déjà), FLASHS OUI / NON (G-28 ; `N.fx.setFlash` existe), TEXTE × 2
  (V-07). Si la place le permet : ÉCRAN RICHE / SOBRE / PUR / COUPÉ (`N.crt.preset`, V-23). Chaque ligne garde sa
  description. `prefers-reduced-motion` pré-règle la secousse à 0 et coupe les flashs (V-22).

### A-07 · Les déblocages (`26-ui.js:59-68, 1154-1208`)
- *Quoi* : six améliorations permanentes achetées avec les crédits gagnés (1 par kill, 5 par élite, +60 par boss) :
  BIO-RALLONGE, +3 segments au départ (120 ◆) ; RÉACTEUR, +25 % de boost (180) ; CANON LOURD (240) ; CONDENSATEUR,
  ultime +20 % plus vite (320) ; PARE-CHOCS, un coup absorbé (400) ; ORACLE, meilleures cartes (520). Toasts
  « DÉBLOQUÉ » ou « CRÉDITS INSUFFISANTS ».
- *Pourquoi c'est bien* : chaque partie rapporte quelque chose, même ratée (G-04).
- *Défauts* : 7 à 10 crédits par partie pour un premier achat à 120 (12 à 17 parties) ; surtout, ce sont des bonus de
  puissance, qui rendent le jeu plus facile — l'inverse du retour n° 2.
- *En mieux dans 2975* : le total d'énergie ouvre des **styles** plutôt que de la puissance (G-04, à la manière de
  Downwell) : palettes de substitution par échange d'index (V-12, la palette reste fermée), traînées, voix du tir,
  modes (Surcharge, G-10). Écran en grille d'icônes 16 × 16 avec cadenas et barre de progression.

### A-08 · Le plein écran honnête (`90-boot.js:1512-1706`)
- *Quoi* : un bouton « Plein écran » au menu et à la fin, jamais en jeu ; quand c'est impossible (iPhone, cadre), une
  notice qui le dit et donne la seule méthode (Partager → Sur l'écran d'accueil) ; sur iPhone, un repli de la barre
  de Safari par un défilement de 64 px.
- *Pourquoi c'est bien* : « un bouton qui ne fait rien est un bug, pas une limite » (commentaire du code).
- *Défauts* : la notice n'apparaît qu'après avoir appuyé.
- *En mieux dans 2975* : une seule fois, une image en pixels « PARTAGER → SUR L'ÉCRAN D'ACCUEIL » (J-26, V-27), plus
  rien une fois en web app.

### A-09 · Le bouton universel et le clavier (`26-ui.js:545-586, 1480-1571`, styles `99-116`)
- *Quoi* : tout bouton passe par `_uiTap` : pointerdown (on n'attend pas le click), anti-rebond de 220 ms, propagation
  coupée (le jeu n'avale pas le geste), son « click » et vibration de 8 ms à chaque appui. Au clavier, sur tous les
  écrans : un curseur (cadre cyan, échelle 1,04), flèches et Tab pour naviguer, ←/→ pour régler, Entrée et Espace pour
  valider, Échap selon l'écran, touches directes (1-4 aux cartes, R et M à la fin, S et D au menu) ; écrans inactifs
  en `inert` ; en jeu, Tab va au bouton pause ; réticule SVG cyan sur bureau, masqué à l'inactivité ; capuchons de
  touches (ESPACE, E, R) à côté des jauges pendant les 6 premières secondes des trois premières parties.
- *Pourquoi c'est bien* : réponse immédiate et sonore à chaque appui, aucun double déclenchement, tout le jeu au
  clavier.
- *Défauts* : verrous en `setTimeout` (horloge murale).
- *En mieux dans 2975* : chaque toucher d'interface donne dès l'image suivante un retour visible AUTOUR du doigt (un
  anneau tramé de 1 px, V-16) et un clic dans la tonalité ; garde de 300 ms sur les cinématiques (G-37) et de 0,45 s à
  la fin (déjà là). Clavier : flèches, ZQSD, WASD, Espace, Échap ou P, M (déjà là), Entrée, 1-3 ; capuchons en 5 × 7
  pendant les premières parties sur bureau (J-31).

### A-10 · L'échelle de l'interface (`26-ui.js:84-93, 1236-1246`)
- *Quoi* : `--uis = clamp(hauteur / 720, 1, 2,2) × réglage (0,85 à 1,5)` ; plancher de 11 px sur téléphone, 12 px sur
  bureau ; zones sûres lues en CSS et republiées au cœur pour caler les cercles tactiles.
- *Pourquoi c'est bien* : la même lisibilité de 720p à 4K, et rien sous l'îlot.
- *Défauts* : avant G10, des textes à 7 px sur iPhone.
- *En mieux dans 2975* : l'échelle entière du tampon fait déjà ce travail (V-01, V-03) ; texte jamais sous 14 pt
  (police 5 × 7 à px ≥ 2, V-06), option × 2 (V-07), HUD dans `S.view.safe` (déjà publié par `90-boot.js`).

---

## B. Le HUD en jeu (`26-ui.js:121-220, 671-733, 1811-1930`)

### B-01 · La barre d'expérience (`124-127`, `1873`)
- *Quoi* : 3 px de haut sur toute la largeur, en haut de l'écran, dégradé cyan avec halo ; elle se remplit vers la
  prochaine montée de niveau.
- *Pourquoi c'est bien* : la promesse de la prochaine carte est toujours là, sans texte.
- *Défauts* : en cyan, la couleur du joueur.
- *En mieux dans 2975* : une ligne de 1 px en ambre (la couleur de l'énergie, cohérente avec le butin) qui s'allume
  d'un pixel jaune à chaque cellule ramassée ; pleine, elle déclenche la cérémonie (G-06). Sans XP dans la refonte, la
  même ligne montre la progression du niveau.

### B-02 · Le score (`135-136`, `1836`)
- *Quoi* : en haut à gauche, chiffres à chasse fixe de clamp(17 px, 4,4 vh, 30 px), blancs à halo cyan ; milliers
  séparés par des espaces (« 12 345 »).
- *Pourquoi c'est bien* : lisible d'un coup d'œil, sans sautillement de largeur.
- *En mieux dans 2975* : la démo l'a déjà (sept chiffres jaunes en 5 × 7 sur plaque de nuit profonde) ; ajouter un
  roulement de 0,2 s quand le score saute de plus de 1 000 (les chiffres défilent en pas entiers).

### B-03 · Le multiplicateur et sa fenêtre (`137-146`, `1837-1860` ; règles `10-core.js:620-660`)
- *Quoi* : « ×4,5 » en ambre (à demi-opacité tant qu'il vaut 1) ; une jauge de 54 × 3 px qui se vide pendant la
  fenêtre de chaîne (5 s, 7 s au-delà de × 3) ; un texte « · 2 kills → ×2 » qui dit ce qu'il manque (un palier tous les
  3 kills, +0,5 par palier, plafond × 12, × 16 en surcharge). Chaque palier rond (× 2, × 4, × 8, × 12, × 16) joue
  « multUp ». Un coup reçu divise le combo par deux au lieu de le remettre à zéro.
- *Pourquoi c'est bien* : le risque et la récompense sont visibles (« encore deux ! »), la jauge crée l'urgence, le
  palier sonne comme une victoire.
- *Défauts* : avant G7, le multiplicateur dépassait 1 pendant 0 à 12 % du temps ; le texte d'aide est petit.
- *En mieux dans 2975* : la démo calcule un multiplicateur (1 + ⌊longueur / 8⌋, plafond 8, `démo 70-game.js:472`) mais
  ne l'affiche pas, et sa chaîne de défi a déjà une barre qui se vide (`démo 70-game.js:1457-1460`). Afficher « ×3 »
  en ambre à côté du score ; au palier, le chiffre passe deux images à l'échelle 2 et la barre s'allume en jaune ;
  « MAX » au plafond.

### B-04 · Le niveau, le nom du secteur, la progression (`148-160`, `1862-1872`)
- *Quoi* : « NIVEAU 2 — AUTOROUTE NÉON » au centre (cyan, le nom en gris) et une barre de progression du secteur
  (clamp(90 px, 26 vw, 220 px) × 4 px, dégradé cyan → violet).
- *Pourquoi c'est bien* : on sait où l'on est et ce qu'il reste ; le nom donne un lieu.
- *Défauts* : le haut-centre accueille aussi les annonces et le boss : trois choses s'y disputaient avant G10.
- *En mieux dans 2975* : en 5 × 7, le niveau (« 1-3 TRAFIC », chapitres de G 3.2) en acier, une barre de 1 px sous
  le HUD, et le tag de phase (B-05) à côté.

### B-05 · Le tag de phase (`153-155`, `1657-1669`)
- *Quoi* : à droite du nom de niveau, en violet et en 11 px, le nom de la phase de caméra pendant 1 s (GRILLE,
  ESPACE, ROULIS, PERSPECTIVE) ; seule la toute première rencontre, par profil, a sa bannière.
- *Pourquoi c'est bien* : nommer sans crier ; la bannière reste rare, donc forte.
- *En mieux dans 2975* : la même règle pour les phases d'un niveau (CALME, MONTÉE, PIC, RÉPIT, APOGÉE, PURGE, d'après
  G 3.3) : tag 5 × 7 d'une seconde, bannière seulement au pic et à l'apogée.

### B-06 · La jauge du boss (`162-170`, `1875-1891`)
- *Quoi* : au centre, le nom du boss en magenta (espacement 0,24 em) et une barre de 9 px (largeur clamp(150 px,
  44 vw, 420 px)) à cadre et halo magenta, dégradé #ff2e63 → #ff8a5c. Elle se REMPLIT en 900 ms à l'éclosion (pleine
  avant même que le boss entre dans le cadre), puis suit ses PV avec une transition de 0,12 s.
- *Pourquoi c'est bien* : le remplissage met en scène l'arrivée (« il est énorme ») ; la barre dit où en est le combat.
- *En mieux dans 2975* : la démo dessine un arc de vie autour du colosse lui-même (`démo 70-game.js:1337-1341`), très
  bien quand il est à l'écran. Avec un monde qui défile, ajouter la barre du haut (nom en 5 × 7 magenta sur plaque de
  nuit, barre de 3 px rose et sang gainée de nuit profonde) qui se remplit en 0,9 s, avec une encoche par phase du
  colosse (une à trois phases, G 3.1).

### B-07 · La vie en pastilles et son alarme (`180-200`, `1893-1902`, `1913-1930`)
- *Quoi* : « VIE », le nombre de segments en chiffres cyan, et une pastille par segment dans un gabarit fixe de 84 px
  (pastille de 5 px au plus, écart de 3 px au plus, qui rétrécissent quand le serpent s'allonge ; le compte reste
  exact). À 3 segments ou moins, chiffres et pastilles alternent blanc et magenta à 2 Hz.
- *Pourquoi c'est bien* : la longueur EST la vie ; on voit la marge d'un coup d'œil, et l'alarme se lit en vision
  périphérique.
- *Défauts* : jusqu'à 53 pastilles, d'où la suppression de leurs halos (coût d'image) ; abrégé « SEG » avant G14.
- *En mieux dans 2975* : avec une vraie mort (retour n° 4), la marge doit se lire mieux encore : rangée de pastilles de
  2 × 4 px en cyan pâle (c'est la joueuse ; moins de 0,2 % de l'écran, sous les 0,5 % du critère 3), qui passent en
  rose et os à 2 Hz au seuil d'alarme (≤ 3 Hz, V-20), avec le battement sonore et la vignette tramée de danger (G-04).

### B-08 · Les jauges BOOST, POUVOIR, APOGÉE (`201-214`, `1903-1910`)
- *Quoi* : trois jauges de 54-96 × 6 px à droite (boost ambre, pouvoir violet sur bureau seulement, apogée magenta).
  APOGÉE pleine : l'étiquette clignote (0,7 s). Panne de boost : la barre devient rouge le temps de deux éclats (0-120
  et 240-360 ms).
- *Pourquoi c'est bien* : l'état des ressources sans chiffres ; la panne se voit.
- *Défauts* : loin de la tête (≈ 690 px sur bureau) : l'œil doit quitter le serpent.
- *En mieux dans 2975* : dessiner ces états SUR la joueuse : l'arc de boost de 270° autour de la tête (B-10) en ambre
  tramé, un point qui orbite autour de la tête quand le pouvoir est prêt, un anneau de 8 points quand l'ultime l'est.
  Rien dans les coins (J-09, V-15).

### B-09 · Le bouton pause (`216-220`, `728-732`)
- *Quoi* : ❚❚ en haut à droite, 38 px, opacité 0,4 (0,9 à l'appui), zone de toucher élargie de 12 px de chaque côté,
  tabulable seulement en jeu.
- *Pourquoi c'est bien* : discret mais atteignable.
- *En mieux dans 2975* : la démo a un bouton son de 23 × 22 px de jeu (46 × 44 pt) ; ajouter à côté un bouton pause de
  même taille (V-13), en haut (V-15).

### B-10 · Les repères portés par le serpent (`90-boot.js:435-573`)
- *Quoi* : la tête est un triangle BLANC à liseré sombre et deux yeux, posé en DERNIER, par-dessus brume et vignette ;
  halo de tête blanc de 1,6 × le rayon ; cône de visée de 30° sur 120 u devant la tête, cyan à 25 % ; corps cyan à
  liseré bleu (2,3 × le rayon) et « écailles » claires tous les trois segments. En invulnérabilité, seul le LISERÉ
  clignote (60 ms) ; en boost, une bande ambre à 45 % couvre les dix premiers anneaux ; l'arc de boost fait 270°
  autour de la tête, à 2,2 × le rayon, ambre, rouge sous 20 %, sur une piste à 28 %.
- *Pourquoi c'est bien* : la joueuse se retrouve à tout instant, elle ne perd pas sa couleur en invulnérabilité, et la
  réserve se lit sans quitter la tête des yeux.
- *Défauts* : avant G11, la tête se noyait dans son propre halo (contraste 2,66:1).
- *En mieux dans 2975* : la démo a une tête en 16 directions et un chevron de cap visé (J-33). Ajouter l'arc de boost
  en anneau de 1 px tramé (`G.ring`), et ne faire clignoter que le contour en invulnérabilité : la démo masque un
  segment sur deux (`démo 70-game.js:1359-1361`), ce qui fait disparaître la joueuse une image sur deux.

---

## C. Les annonces

### C-01 · La bannière plein écran (`26-ui.js:276-308, 1611-1655`)
- *Quoi* : texte en capitales au centre, clamp(26 px, 10 vh, 76 px), espacement 0,2 em, blanc à double halo (cyan
  26 px, magenta 62 px). Animation de 1,15 s : le texte arrive de l'échelle 1,6, penché de −14° et flou de 6 px, il est
  net à 18 %, tenu jusqu'à 74 %, puis repart à l'échelle 1,12 en s'effaçant. Deux fantômes, magenta et cyan, se
  décalent de ±6, ±3 puis ±2 px en trois pas (le glitch). Une ligne cyan de 2 px balaie l'écran (de zéro à la pleine
  largeur en 20 % du temps). La taille est plafonnée selon le nombre de caractères, puis réduite par pas de 4 % (dix
  fois au plus) tant que le texte déborde. File d'attente : une bannière à la fois, cinq au plus ; 1,2 s par défaut,
  2,2 s pour un nom de boss. En « réduire les flashs » : un simple fondu de 1,1 s.
- **Textes émis** : « NIVEAU 1 — LA GRILLE » et les trois autres secteurs (puis « SURCHARGE n » en boucle),
  « SURCHARGE DU SECTEUR », le nom du boss (PROTOTYPE ZÉRO, DOUBLE LAME, NOYAU MAGNÉTIQUE, SURCHARGE), « SECTEUR
  NETTOYÉ », « +60 ◆ », RALENTI, REPLI, et les phases de caméra à leur première rencontre.
- *Pourquoi c'est bien* : c'est la VOIX du jeu. Elle rythme les actes, nomme les lieux et les ennemis, et fait de
  chaque transition un événement.
- *Défauts* : avant G10, des débordements de 278 px et quatre bannières de phases caméra en 22 s ; alpha, flou et
  inclinaison n'existent pas en gros pixels.
- *En mieux dans 2975* : en 5 × 7 à l'échelle 3 (portrait) ou 4 (paysage). Entrée : deux images à l'échelle
  supérieure, puis la taille finale (le « coup », en pas entiers). Deux fantômes, magenta et violet (jamais cyan),
  décalés de 2 px pendant six images, en trois pas. Balayage par une ligne os de 1 px. Sortie par dissolution au
  seuil de Bayer en 0,25 s. Placée dans le tiers opposé à la tête (la démo le fait déjà pour ses bandeaux,
  `démo 70-game.js:1425`), jamais sur un télégraphe (G-23) ; aire passée au limiteur (`N.fx.flashGate`) ; horloge de
  jeu, pas `setTimeout` ; échelle 4 → 3 → 2 tant que `N.spr.measure` déborde de la zone sûre.

### C-02 · Le toast (`26-ui.js:172-178, 1573-1609`)
- *Quoi* : deux lignes sous le HUD (titre blanc à halo cyan, sous-titre gris), 1,9 s, entrée de 6 px en 0,18 s ; file
  de trois ; exclusion mutuelle avec la bannière, dans les deux sens (chacun attend la fin réelle de l'autre).
  Exemples : « LA GRILLE / ÉVITE LE CONTACT, LE CANON TIRE SEUL », « AUTOROUTE NÉON / LES CONVOIS BALAIENT LES
  VOIES », « ZONE MAGNÉTIQUE / BLEU ATTIRE, AMBRE REPOUSSE », « APOGÉE PRÊT / ★ / R », « POUVOIR PRÊT / ◈ / E »,
  « DÉBLOQUÉ ».
- *Pourquoi c'est bien* : la règle du lieu en six mots, au moment où elle sert.
- *En mieux dans 2975* : une plaque en 5 × 7 à l'échelle 1 sous le HUD, à l'horloge de jeu. La démo enseigne par le
  geste (pouce fantôme, J-14) : le toast vient en complément, une règle par niveau.

### C-03 · La règle éditoriale des annonces (G10 ; `27-phases.js:127-146`)
- *Quoi* : une seule voix à l'écran ; la bannière plein écran est réservée aux vrais événements (niveau, boss, pic,
  purge, récompense) ; un nom technique devient un tag après sa première rencontre ; jamais deux textes à la fois.
- *Pourquoi c'est bien* : les annonces gardent leur poids.
- *En mieux dans 2975* : à garder telle quelle, avec un budget : une bannière par 10 s au plus, hors boss.

---

## D. Les contrôles tactiles (`26-ui.js:222-274, 608-666, 735-765, 1730-1809, 2072-2165`)

### D-01 · Le manche fixe ou flottant
- *Quoi* : cercle de 112 px (rayon 56 × taille), opacité 0,24 (0,5 pressé), poignée à dégradé cyan qui suit le pouce
  jusqu'à 62 % du rayon ; FLOTTANT par défaut, il naît sous le pouce ; au repos, à 110 px du bord.
- *Pourquoi c'est bien* : c'est le standard (J-01).
- *Défauts* : dessiné sur bureau avant G2 ; il couvre une partie de la zone de jeu.
- *En mieux dans 2975* : `90-boot.js` de la démo le fait déjà (manche flottant invisible au repos, J-01 à J-04) ;
  n'en garder que le réglage de taille.

### D-02 · Les trois boutons à jauge circulaire
- *Quoi* : BOOST » (ambre, rayon 62), TRAVERSÉE ◈ (violet, 46 ; le nom suit le pouvoir courant), APOGÉE ★ (magenta,
  46). Un arc SVG qui se remplit (épaisseur 7, 8 quand il est prêt, halo × 1,3). Opacité 0,45, 0,72 pressé, 0,9 prêt
  avec une pulsation de luminosité de 0,9 s. Une étiquette de 11 px sous chaque bouton (c'est aussi le nom lu par le
  lecteur d'écran). Pendant la recharge, les secondes restantes au centre. Panne de boost : bouton rouge plein le
  temps de deux éclats. La zone tactile vaut 1,18 × le rayon, et c'est le CENTRE le plus proche (rapporté au rayon)
  qui gagne, pas le premier disque touché.
- *Pourquoi c'est bien* : prêt, pressé, en recharge, en panne se lisent sans texte ; le compte à rebours répond à
  « quand ? » ; le test au plus proche évite les faux boosts.
- *Défauts* : des boutons fixes dans un coin, qu'il faut aller chercher (J-08) ; 62 % des images avaient un ennemi
  sous un contrôle ou sous le HUD (audit, AV-14 écartée).
- *En mieux dans 2975* : pas de bouton fixe (J-08). Accélérer en poussant le manche au-delà de 80 % (WWDC26), le
  pouvoir d'un second doigt posé n'importe où, l'ultime d'un double toucher du second doigt ou de lui-même ; les
  états vivent autour de la tête (B-08). Au clavier : Espace, E, R.

### D-03 · La géométrie et les réglages des contrôles
- *Quoi* : les mêmes formules que le cœur ; gaucher en miroir ; taille 80-140 %, opacité 50-150 %, hauteur −24 à
  +44 px, écart du bord −14 à +36 px ; zones sûres ajoutées.
- *En mieux dans 2975* : la taille du manche, seulement (J-32).

---

## E. Les menaces hors champ

### E-01 · Les chevrons de portail (`20-fx.js:774-959` ; `25-levels.js:446-492`)
- *Quoi* : 600 ms avant chaque apparition, un chevron sur le cadre de l'écran, à 20 px du bord, dans la direction du
  point d'apparition et dans la COULEUR du type ; doublé pour une élite. Pour un boss : 1,4 s d'avance, chevron triple
  de taille 40, qui clignote de 3 Hz à 12 Hz à mesure que l'échéance approche. Une salve au même endroit s'étale en
  peigne le long du bord (décalages de ±30, ±60… px, huit essais) au lieu de s'empiler. Coût borné : 48 marqueurs
  acceptés, 16 tracés, deux traits par groupe de couleur (≈ 0,9 ms gagnée par image sur téléphone). Un son
  « spawnTick » (2 kHz, 40 ms, −18 dBFS) part du côté de l'arrivée. Un marqueur ne vit qu'une image : il est reposé
  à chaque image tant que le portail attend.
- *Pourquoi c'est bien* : « rien n'arrive sans prévenir » ; on lit d'où viendra la vague, donc la mort devient juste ;
  le peigne garde le compte d'une salve ; le clignotement qui accélère fait monter la tension avant le boss.
- *Défauts* : avant G6, les apparitions et les armements hors champ causaient la plupart des coups reçus.
- *En mieux dans 2975* : **indispensable** dès que le monde dépasse l'écran (retour n° 3). Chevrons de 5 × 5 px en
  magenta, gainés de nuit profonde, au bord de la zone sûre ; double pour l'élite, triple pour le colosse ;
  clignotement plafonné à 6 Hz (aire minuscule, V-20 tenu) ; 600 ms d'avance (G-13 : ≥ 500 ms), 1,4 s pour le
  colosse (≥ 800 ms) ; tic panoramisé (I-05). La démo n'a que des carrés de 5 × 5 px pour les ennemis à moins de
  45 px du bord (`démo 70-game.js:1343-1352`).

### E-02 · Les marqueurs permanents (`26-ui.js:1932-1986` ; `20-fx.js:911-932`)
- *Quoi* : boss, élites et mines amorcées hors champ gardent un chevron au bord, recalculé toutes les trois images,
  huit tracés au plus, les boss d'abord (deux passes). Taille clamp(11 000 / max(distance, 420), 8, 26) px : 26 px à
  420 u ou moins, 8 px au-delà de 1 375 u. Couleurs : boss rouge #ff2b2b (chevron double), mine orange, élite jaune.
- *Pourquoi c'est bien* : on garde la carte mentale de ce qui compte, et la taille dit la distance.
- *En mieux dans 2975* : la même règle, de 3 à 7 px selon la distance ; puisque toutes les menaces sont magenta, des
  formes distinctes (boss triple, élite double, mine ronde à cœur clignotant à 2 Hz, V-10).

---

## F. Les effets visuels (`20-fx.js`)

### F-01 · Une architecture sans allocation (`10-56`, `189-210`, `1033-1042`)
- *Quoi* : quatre réserves préallouées et recyclées en anneau : 800 particules, 60 ondes, 40 halos, 30 textes. Alpha
  quantifié en 20 niveaux pour regrouper les dessins ; un seul passage par couche ; dégradés et polices mis en cache
  et préchauffés au démarrage, hors de l'image du premier effet.
- *Pourquoi c'est bien* : des effets massifs sans à-coup.
- *En mieux dans 2975* : la démo fait de même (400 particules, 24 explosions, tableaux typés, priorités d'éviction,
  `démo 50-fx.js:324-354`).

### F-02 · Les gerbes de particules (`214-275`, `545-622`)
- *Quoi* : `burst(x, y, couleur, n, puissance, options)` : direction et demi-ouverture, gravité, freinage (2,4 par
  seconde), durée (0,30 s + puissance / 1 000, plafonnée), taille (1,7 u et plus), trois formes (étincelle étirée par
  sa vitesse jusqu'à 96 u, point carré, éclat en rotation à 6 rad/s), vitesse héritée, fondu linéaire ou rapide,
  rétrécissement de 70 %, dispersion initiale. Chaque particule varie : vitesse × 0,26 à 1,15, taille × 0,6 à 1,45,
  vie × 0,6 à 1,3. Une couleur ou un tableau de couleurs. Densité réglable de 0 à 2.
- *Pourquoi c'est bien* : une seule primitive pour les étincelles, les débris, les confettis, la poussière.
- *Défauts* : plusieurs appels passent une « puissance » héritée de 0,7 à 3 u/s au lieu de 150 à 420 : la gerbe de
  MORT (70 particules, `10-core.js:495-519`), celle des ramassages (`10-core.js:1056-1076`) et celle de la purge
  (`25-levels.js:702-746`) restent sur place au lieu de jaillir.
- *En mieux dans 2975* : la démo a ses éclats carrés, freinés, à traînée qui refroidit, et ses étincelles d'un pixel
  (`démo 50-fx.js:393-405, 720-764`). Y ajouter des « confettis » de points ambre et jaune pour le butin ; garder un
  tiers des éclats à la couleur de ce qui meurt (déjà fait).

### F-03 · Les ondes de choc (`277-293`, `444-452`, `646-688`)
- *Quoi* : un anneau dont le rayon croît par une vitesse AMORTIE (r += v·dt, puis v ← v / (1 + 3,2·dt) : 2 000 u/s
  donnent une onde d'environ 600 u) ; vie de 0,42 s par défaut ; épaisseur qui fond de 100 à 15 % ; alpha en t² ;
  options d'écrasement et de rotation (ellipse) ; dans les kills, divisée par le zoom pour garder la même taille à
  l'écran.
- *Pourquoi c'est bien* : la forme la plus lisible d'un impact ; l'amorti donne un coup sec puis une décélération
  naturelle.
- *En mieux dans 2975* : les anneaux tramés et percés par secteurs de la démo (`démo 50-fx.js:585-644`) sont plus
  beaux ; en publier une variante « onde seule », sans boule de feu, pour le butin, le bouclier, la montée de niveau,
  l'ultime et la purge.

### F-04 · Les halos, c'est-à-dire le bloom (`127-140`, `295-313`, `624-644`)
- *Quoi* : un disque à dégradé radial (1 au centre ; 0,70 à 16 % ; 0,26 à 40 % ; 0,07 à 70 % ; 0) qui grandit de 55 %
  pendant sa vie (0,26 s par défaut), alpha en t².
- *Pourquoi c'est bien* : c'est la lumière du néon.
- *Défauts* : additif à l'origine, il blanchissait la joueuse (G11, F-14) ; impossible en palette fermée.
- *En mieux dans 2975* : la chaleur `S.heat` des explosions nourrit déjà le halo de `20-crt.js` ; pour un halo local,
  un disque tramé à seuil décroissant (`G.ditherCirc`) d'une seule encre.

### F-05 · Les traînées (`315-332`)
- *Quoi* : une particule courte derrière un moteur ou un projectile (±0,35 rad, 30 à 110 u/s, 0,12 à 0,26 s).
- *En mieux dans 2975* : la traînée fixe de la démo (`démo 50-fx.js:486-491`, 0,15 s) suffit ; l'employer pour
  l'accélération de la joueuse (en cyan pâle) comme pour la charge de la flèche (déjà fait).

### F-06 · Les textes flottants (`334-346`, `690-728` ; score de kill `10-core.js:677-683`)
- *Quoi* : « +240 » au-dessus de l'ennemi tué ; taille 13 + 2 × min(combo, 6) px, soit de 13 à 25 px ; blanc, ou ambre
  dès que le multiplicateur mord ; « pop » de l'échelle 1,42 à 1 en 110 ms ; montée de 60 u/s amortie ; pleine opacité
  pendant les 40 premiers pour cent de la vie (0,85 s), puis fondu ; contour sombre de 3,5 px. Textes d'événements :
  « BUTIN VOLÉ », « IL FUIT ! », « RÉCUPÉRÉ », « ENCERCLÉ », le nom d'une carte prise.
- *Pourquoi c'est bien* : le score s'enracine dans l'action ; la taille qui croît avec le combo fait sentir
  l'emballement.
- *En mieux dans 2975* : la démo pose « +pts » en jaune, à taille fixe (`démo 70-game.js:909, 1005, 1387-1389`).
  Passer à l'échelle 2 dès 6 kills enchaînés, acier puis jaune quand le multiplicateur dépasse 1, « pop » de deux
  images à l'échelle + 1, contour de nuit profonde.

### F-07 · La secousse (`348-353`, `473-491`, `526-538`)
- *Quoi* : une amplitude additive plafonnée à 18 u. La part posée DANS l'image n'est jamais amortie avant d'être vue ;
  ensuite, amortissement très rapide (× 10⁻¹³ par seconde, et −1,2 u/s : une secousse de kill retombe sous 0,5 u en
  4 images au lieu de 17). Le décalage suit deux sinus incommensurables, × 0,66 × l'amplitude. Valeurs : kill 4,5,
  élite 14, blessure 8, mort 30 (ramenée à 18), boss 16, ultime 18, mur 3, mine posée par le joueur 6.
- *Pourquoi c'est bien* : franche et brève, elle signifie un coup sans fatiguer.
- *Défauts* : avant G8, 30 % des images étaient secouées.
- *En mieux dans 2975* : la secousse à trauma et la caméra à ressort de la démo (`démo 50-fx.js:269-296`, `20-crt.js`)
  sont meilleures ; reprendre seulement l'échelle relative (kill ≈ 1, élite ≈ 3, blessure ≈ 2, mort au plafond).

### F-08 · Le gel d'image, compté en images (`355-376` ; `90-boot.js:786-795`)
- *Quoi* : n images gelées à la vitesse 0,08 ; « le plus grand, jamais la somme » ; lu au début de l'image puis
  décompté, pour qu'une pose ne soit jamais avalée par l'image qui la pose. Valeurs : kill 2, élite ou boss 5,
  blessure 4, mort 8.
- *Pourquoi c'est bien* : c'est le punch, et compté en images il ne dépend pas de la cadence.
- *En mieux dans 2975* : déjà dans la démo (plafond 30, 26 images au colosse) ; garder J-21 (un virage demandé pendant
  un gel part à l'image suivante).

### F-09 · Le recul de caméra (`409-415`, `495-503`)
- *Quoi* : une impulsion de 3 u À L'OPPOSÉ du tir qui a tué, étalée sur deux ou trois images (93 % du reste par image à
  60 Hz).
- *Pourquoi c'est bien* : le tir « pèse » (Vlambeer, G-27).
- *En mieux dans 2975* : `20-crt.js` sait lire `S.shakeX` et `S.shakeY`, mais personne ne les écrit (c'est un des
  travaux restants de REPRISE.md). Les écrire au kill (sens du tir), à la blessure (depuis l'impact) et au tir lourd ;
  un recul d'1 px toutes les quatre rafales du tir automatique.

### F-10 · Le flash plein écran budgété (`378-407`, `505-514`, `996-1004`)
- *Quoi* : une nappe de couleur en addition ; au plus UNE toutes les 4 s de jeu, et seulement au-dessus de 0,28 ; en
  dessous ou trop tôt, l'appel devient une vignette. Durée imposée possible (décroissance linéaire), sinon décroissance
  libre (÷ (1 + 9 dt), −0,7 par seconde). Valeurs : mort blanc 0,7 ; ultime blanc 0,4 pendant 120 ms ; montée de
  niveau blanc 0,3 ; début de secteur 0,26 ; entrée de boss 0,30 en rouge ; secteur nettoyé 0,22 ; phase de surcharge
  0,16 ; phase de montée 0,10.
- *Pourquoi c'est bien* : le flash garde sa force parce qu'il est rare ; sous 0,28, il n'annonçait rien qu'une
  bannière ne dise déjà.
- *Défauts* : avant G8, 120 flashs en 5 min.
- *En mieux dans 2975* : le limiteur WCAG de la démo (`démo 50-fx.js:216-252`) est plus juste. Réserver le flash plein
  écran à trois événements (mort du colosse, mort de la joueuse, ultime) via `N.fx.flashGate`, et tout le reste en
  bandes de bord (F-11).

### F-11 · La vignette directionnelle de dégât (`740-772`, `961-973`)
- *Quoi* : le centre d'un dégradé radial posé SUR le bord touché (rayon : un quart de la diagonale), pleine couleur
  jusqu'à 55 % du rayon puis extinction, plus une vignette générale à 10 % ; décroissance ÷ (1 + 4,5 dt), −0,35 par
  seconde. Blessure : #ff2b52 à 0,7, angle calculé dans le repère de l'écran.
- *Pourquoi c'est bien* : « je me fais toucher par la droite » se comprend sans y penser, et le centre de l'écran reste
  lisible (mesuré : +23 points de luminance sur le bord touché).
- *En mieux dans 2975* : une bande tramée en sang sur le bord touché (seuil de Bayer qui décroît vers l'intérieur),
  sur un quart de la diagonale, pendant 0,35 s ; aire passée au limiteur (rouge saturé, V-20). Garder aussi le trait
  qui part de la tête dans la démo (`démo 70-game.js:1390-1394`).

### F-12 · Le glitch (`417-420`, `520-524`, `975-994`)
- *Quoi* : 3 à 6 bandes horizontales (2 px, plus jusqu'à 5,5 % de la hauteur) décalées de ±26 px × l'intensité, une
  copie magenta et une copie bleue, en addition à 13 % × l'intensité, retirées au sort toutes les 17 ms environ ;
  décroissance ÷ (1 + 7 dt), −0,6 par seconde. Déclencheurs : début de secteur 0,5, phase de surcharge 0,4, entrée de
  boss 0,7, champ du brouilleur 0,28 (toutes les 340 ms), mort du brouilleur 0,45, mort du miroir 0,5.
- *Pourquoi c'est bien* : c'est la signature numérique du monde, une transmission perturbée.
- *En mieux dans 2975* : en pixels, décaler des rangées entières du tampon de 1 à 4 px et poser deux copies en magenta
  et en violet (jamais cyan), 0,3 s au plus, renouvelées toutes les quatre images. Idéal à l'arrivée d'un niveau, à
  l'entrée du colosse et à la mort (« SIGNAL PERDU ») ; coupé par « réduire les animations ».

### F-13 · Les combinaisons prêtes à l'emploi (`1077-1137`)
- *Quoi* : `hit` (5 étincelles à 190 u/s pendant 0,2 s et un halo de 22 u pendant 0,14 s) ; `kill` (16 ou 34
  particules à 260 ou 420 u/s, 6 ou 12 éclats crème, 6 éclats tournants à 300 u/s pendant 0,35 s, onde de 8 ou 14 u
  à 330 ou 520 u/s, halo de 54 ou 110 u, flash de la silhouette pendant 60 ms à 1,35 × le rayon, secousse 4,5 ou 14,
  gel 2 ou 5, recul de 3 u) ; `pickup` (8 points à 150 u/s, onde de 4 u à 220 u/s, halo de 34 u).
- *Pourquoi c'est bien* : chaque module parle le même langage d'impact en un appel.
- *En mieux dans 2975* : `N.fx.boom` de la démo couvre `kill`, `N.fx.hit` existe (flash de frappe) ; ajouter
  `N.fx.pickup` (onde tramée de 1 px et quatre points ambre).

### F-14 · La leçon G11 : plus d'addition, le blanc réservé à la tête (`562-578`, `1094-1128`)
- *Quoi* : toutes les couches d'effets sont passées en composition normale, parce qu'en addition, la lumière chaude
  posée sur le corps cyan saturait les trois canaux et créait des taches blanches qu'on prenait pour la tête. Crème
  #fff3b0 au lieu du blanc ; le blanc pur à la seule tête.
- *En mieux dans 2975* : la palette fermée règle le problème par construction. Le principe demeure : une couleur à la
  joueuse (cyan), une encre de frappe (os) jamais posée sur la tête, la tête et les deux premiers segments dessinés
  par-dessus tout (G-11 ; la démo le fait dans `drawTop`).

### F-15 · Les préférences de confort (`156-187`)
- *Quoi* : densité de particules de 0 à 2 (le réglage ET la qualité automatique) ; flashs réduits × 0,28 ; secousses
  réduites × 0,3 ; « réduire les mouvements » met la secousse à 0 dès l'image suivante.
- *En mieux dans 2975* : la démo a les réglages (`setShake` 0 / 0,5 / 1, `setFlash`, `prefers-reduced-motion`) mais
  pas l'écran (A-06).

---

## G. Les moments mis en scène (qui déclenche quoi, avec quels chiffres)

### G-01 · Le kill (`10-core.js:647-694` ; `20-fx.js:1087-1132` ; `21-audio.js:289-297, 1308-1332`)
- *Quoi* : gerbe, éclats, onde, halo, flash de silhouette, secousse 4,5, gel 2, recul de 3 u, texte « +score » (taille
  selon le combo), son de kill dont la hauteur monte d'un demi-ton par kill de combo (× 2^(combo/12), une octave au
  douzième), accord de palier de multiplicateur, vibration (20 ms pour une élite), coup de zoom (+3,5 %, élite +9 %).
  Une élite : 34 particules, secousse 14, gel 5, « bigkill ».
- *Pourquoi c'est bien* : sept retours dans la même image pour une seule entrée (« un maximum de sortie pour un
  minimum d'entrée ») ; l'escalier de hauteur transforme une série en montée musicale.
- *En mieux dans 2975* : la démo a l'explosion, le gel, le flash de frappe et une hauteur qui monte dans la
  pentatonique (`démo 30-music.js:506-516`) ; il lui manque le texte indexé sur la chaîne, le recul, l'accord de
  palier, et la garantie qu'aucun kill ne se taise (I-07).

### G-02 · L'impact qui ne tue pas (`10-core.js:603-621` ; `22-enemies.js:2133-2139`)
- *Quoi* : `fx.hit` à chaque projectile de la joueuse, silhouette blanche (un disque à 0,55 × hitT / 90 pendant 90 ms),
  son « hit » (60 ms, 1 à 2 kHz) ou « bossHit » (métallique, distinct : on sait qu'on entame la bonne cible).
- *En mieux dans 2975* : la démo a le flash de frappe d'une image, limité à trois par seconde et par objet, et deux
  étincelles d'impact (`démo 70-game.js:932-933`) ; ajouter le son de frappe et sa version boss.

### G-03 · La blessure (`10-core.js:414-486`)
- *Quoi* : vignette rouge du côté touché (0,7), gel 4, RALENTI à 0,4 pendant 180 ms puis retour linéaire en 120 ms,
  « jolt » (le plateau pique et roule : 0,6, élite 1,5, boss 2), 12 éclats projetés depuis le point d'impact (et non
  posés sur la tête), secousse 8, son « hurt » (grave saturé avec une composante à 1-2 kHz), vibration [18, 30, 26],
  invulnérabilité de 900 ms (+220 par carte), combo divisé par deux, et la cause mémorisée pour l'écran de fin.
- *Pourquoi c'est bien* : le coup se SENT (le ralenti) et se COMPREND (le côté, la cause), sans masquer le jeu.
- *En mieux dans 2975* : la démo pose une explosion cyan (0,45), secousse 7, gel 8, anneau rose, trait de direction,
  son « degat », et un choc qui repousse les ennemis (`démo 70-game.js:533-565`). Ajouter le ralenti (la démo n'en a
  aucun), la bande de bord (F-11), le son panoramisé.

### G-04 · La vie basse (`10-core.js:358-367` ; `21-audio.js:390-399` ; `25-levels.js:2183-2210` ; `26-ui.js:185-200`)
- *Quoi* : à 3 segments ou moins, un battement de cœur à 1 Hz (« lub-dub » : deux coups à 160 ms d'écart, 1 250 →
  625 Hz puis 1 080 → 540 Hz, −14 dBFS, audible sur un haut-parleur de téléphone), une vignette rouge de danger qui
  pulse (0,5 + 0,3 sin), des pastilles et des chiffres qui clignotent ; avec la carte SURSIS, le temps ralentit
  (× (1 − 0,18 n)).
- *Pourquoi c'est bien* : la seule information de survie que l'oreille donne sans quitter le serpent des yeux ; la
  peur monte juste avant la mort.
- *En mieux dans 2975* : rien de tel dans la démo, et c'est l'outil n° 1 du retour n° 4 (« une vraie mort qui fait
  peur ») : battement dans la tonalité, bords tramés en sang qui pulsent à 1,2 Hz, pastilles rose et os, musique qui
  se resserre (passe-bas à 2 kHz, batterie réduite au kick).

### G-05 · La mort (`10-core.js:495-519`)
- *Quoi* : secousse 30 (ramenée à 18), gel 8, flash blanc 0,7, gerbe de 70 particules cyan et une gerbe tous les deux
  segments, onde blanche (10 u à 700 u/s), son « dead » (1,3 s : trois dents de scie qui tombent de 1 320 à 220 Hz,
  de 440 à 55 Hz et de 660 à 130 Hz, et un souffle), arrêt de la musique, vibration [40, 60, 90], écran de fin à
  900 ms.
- *Pourquoi c'est bien* : un vrai point final, avec le temps de comprendre.
- *Défauts* : « mort en gel sec » (audit) : le monde se fige, le corps reste dessiné, la gerbe ne jaillit pas
  (puissance de 3 u/s, F-02). La mise en scène AV-9 (ralenti 0,15, désintégration de la queue vers la tête, musique qui
  s'effondre, écran à 1,4 s) a été écartée.
- *En mieux dans 2975* : la démo dissout le serpent de la tête vers la queue en 0,28 s, puis affiche l'écran
  (`démo 70-game.js:567-573, 1057-1066`) : trop vite pour faire peur. Proposition qui tient en moins d'une seconde
  (J-17) : gel de 8 images sur le coup fatal ; ralenti à 0,2 pendant 0,5 s pendant que le corps se désintègre de la
  queue vers la tête en débris cyan ; la musique s'effondre (le passe-bas se ferme en 0,6 s, la piste chute de
  hauteur) ; un « dead » redessiné avec des médiums ; une seule image d'impact plein écran (limiteur), puis
  **l'extinction cathodique** dans `20-crt.js` (l'image s'écrase en une ligne puis en un point, comme un vieux
  téléviseur qu'on éteint) ; SIGNAL PERDU.

### G-06 · La montée de niveau (`90-boot.js:1265-1317`)
- *Quoi* : pendant 350 ms AVANT l'écran de cartes : temps à 0,15, invulnérabilité, flash blanc 0,3, onde depuis la
  tête (10 u à 2 000 u/s amortis, soit environ 600 u ; épaisseur 6 ; 0,5 s), coup de zoom de 0,08, arpège « levelup »
  (la majeur, quatre notes en 270 ms), vibration de 14 ms ; puis les cartes et le son « card ».
- *Pourquoi c'est bien* : on VOIT la montée ; avant G8, l'écran tombait sans transition.
- *En mieux dans 2975* : rien dans la démo, dont les paliers de puissance (deux canons à 10 segments, trois à 20, cinq à
  32, `démo 70-game.js:520-523`) passent en silence. Leur donner la cérémonie : temps à 0,15 pendant 0,35 s, onde
  tramée depuis la tête, arpège majeur dans la tonalité, bannière courte « CANONS × 2 ».

### G-07 · L'ultime APOGÉE (`90-boot.js:396-432, 1320-1338` ; `21-audio.js:443-456, 1403-1428`)
- *Quoi* : PRÊT : son « ultReady » (un accord qui s'ouvre, puis la4 et un souffle qui monte), toast « APOGÉE PRÊT —
  ★ / R », bouton qui pulse. DÉCLENCHÉ : temps à 0,25 pendant 420 ms, flash blanc 0,4 pendant 120 ms, secousse 18,
  vibration [40, 20, 90] ; six paliers à 90 ms d'écart, ondes de 160 à 1 100 u, dégâts 40 + 10 × le secteur, un
  « bigkill » par palier. La musique PLONGE à 10 % en 90 ms, deux battements graves (à +0,02 et +0,30 s), une montée de
  bruit inversée (260 → 5 400 Hz), puis à +0,68 s le retour explosif : la musique bondit à 128 %, puis revient à 100 %.
- *Pourquoi c'est bien* : le moment de toute-puissance, chorégraphié comme un drop.
- *En mieux dans 2975* : rien dans la démo (le défi réussi donne un tir surchargé). Si la refonte garde un ultime :
  anneaux tramés de 40 à 275 px toutes les 90 ms, temps à 0,25, une seule image plein écran (limiteur), et le
  plongeon musical calé sur la mesure.

### G-08 · Le pouvoir (`90-boot.js:374-394` ; `27-phases.js:540-600`)
- *Quoi* : TRAVERSÉE : fantôme pendant 2,2 s (+0,7 par carte), onde violette (10 u à 900 u/s), halo de 160 u, son
  « teleport » (glissando qui descend puis remonte), ennemis proches repoussés à 420 u/s et touchés de 6, vibration de
  24 ms. RALENTI et REPLI ont leur bannière ; le nom du pouvoir s'affiche sous le bouton ; toast « POUVOIR PRÊT ».
- *En mieux dans 2975* : le contenu relève de l'inventaire des armes ; le langage reste : onde, couleur du pouvoir,
  son dédié, nom en tag.

### G-09 · L'accélération (`10-core.js:262-271` ; `90-boot.js:450-463, 560-573` ; `21-audio.js:347-360`)
- *Quoi* : son « boost » (souffle de 260 à 5 200 Hz, dent de scie de 180 à 760 Hz), « boostEnd » (souffle qui
  retombe), « boostDry » à la panne (un clic grave de 90 ms, une seule fois) ; bande ambre sur le corps, arc autour de
  la tête, bouton rouge à la panne.
- *En mieux dans 2975* : si la refonte garde une accélération (manche poussé au-delà de 80 %, J-08) : traînée de cyan
  pâle, arc ambre autour de la tête, et le son en trois temps.

### G-10 · L'entrée du boss (`25-levels.js:446-492, 669-689` ; `21-audio.js:457-467, 1374-1388` ; `26-ui.js:1886-1890`)
- *Quoi* : au PORTAIL, 1,4 s avant : l'alarme « bossIn » (sub de 70 à 30 Hz, dents de scie la1 et mi2 qui s'ouvrent,
  et surtout une CORNE de 1 750 → 1 340 Hz et de 1 960 → 1 470 Hz pendant 1,1 s, avec plus de 30 % de l'énergie entre
  600 et 2 000 Hz pour le haut-parleur du téléphone), le « drop » (la musique se tait 250 ms puis revient d'un coup) et
  le chevron triple qui clignote de 3 à 12 Hz. À l'entrée : la bannière du nom pendant 2,2 s, seule à l'écran ; flash
  rouge 0,30, secousse 16, glitch 0,7 ; 3,4 s sans autre portail ; arrivée pilotée en 1,8 s ; RALENTI à 0,3 pendant
  2,2 s (le serpent garde sa vitesse) ; boss invulnérable pendant sa bannière ; jauge qui se remplit en 0,9 s ; escorte
  à 66 % et 33 % de ses PV ; enragé au bout de 45 s (vitesse × 1,3, liseré blanc).
- *Pourquoi c'est bien* : la seule fois où le jeu se tait, et c'est pour annoncer ; le ralenti laisse regarder
  l'ennemi.
- *En mieux dans 2975* : la démo a un très bel interlude (ALERTE pendant 1,2 s, puis le colosse et son nom pendant
  1,8 s, `60-intro.js`) et un télégraphe de 2,4 s (croix qui bat à 2 Hz, silhouette qui se trame). Il manque le drop,
  une corne dans les médiums (« intro » n'est qu'un souffle montant), le ralenti d'arrivée, la jauge qui se remplit,
  et un changement de musique à la mesure suivante (G-32 : une section ou un morceau de boss).

### G-11 · Le secteur nettoyé (`25-levels.js:702-746`)
- *Quoi* : tous les ennemis restants sont soldés (score × 1, une gerbe chacun) ; bannières « SECTEUR NETTOYÉ » puis
  « +60 ◆ » ; carte trophée et +50 d'ultime ; son « warp » ; flash 0,22 ; onde depuis la tête (20 u à 1 100 u/s,
  épaisseur 7, 0,9 s) ; un noyau de valeur triple et un soin posés près de la tête ; les survivants tardifs FUIENT
  vers le bord.
- *Pourquoi c'est bien* : la purge est la récompense visuelle du combat.
- *En mieux dans 2975* : la démo a déjà une meilleure purge : à 120 s, chaque ennemi explose à son tour, le plus
  proche d'abord, toutes les 45 ms (`démo 70-game.js:1067-1099`). Y ajouter l'annonce, la récompense chiffrée qui
  monte, l'onde finale et un accent musical sur la barre.

### G-12 · Les transitions de secteur et de phase (`25-levels.js:640-666, 1500-1540`)
- *Quoi* : chaque secteur suit calme → montée → surcharge → apogée → purge (10, 24, 24, 34 et 6 s au secteur 1). Au
  début : bannière « NIVEAU n — NOM », toast nom et règle, flash 0,26, glitch 0,5, son « warp ». Montée : flash 0,10
  (donc une vignette). Surcharge : bannière « SURCHARGE DU SECTEUR », flash 0,16, glitch 0,4. À chaque changement de
  phase : une mesure d'accent musical (J-09). La palette du secteur colore le décor et les effets (H-05).
- *Pourquoi c'est bien* : la partie a des actes ; on voit et on entend qu'on change de régime.
- *En mieux dans 2975* : pour le niveau de 2 min 30 de la recherche (G 3.3 : calme, montée, pic, respiration, apogée,
  purge) : accent sur la barre à chaque phase, tag de phase, remappage d'index du décor au tramage, bannière au pic et
  à l'apogée seulement. Entre deux niveaux : une carte de résultats de 2 s (G-38) et une transition « warp » : la
  parallaxe accélère en lignes de vitesse vers l'horizon pendant 1,5 s.

### G-13 · Les phases de caméra (`27-phases.js:16-146`)
- *Quoi* : une ouverture écrite, GRILLE (6 s, treillis orthogonal) → ESPACE (4 s, zoom 1,04) → ROULIS (5 s, 0,20 rad)
  → PERSPECTIVE (22 s, bascule 3D de 30°), puis un tirage où la bascule revient le plus souvent ; à chaque début de
  phase, un accent (force 0,7) et un coup de zoom de 0,10 ; un cycle de zoom toutes les 20 à 32 s (3,4 s à × 1,54, puis
  4,6 s à × 0,77) avec le son « warp ».
- *Pourquoi c'est bien* : le spectacle de caméra est le « waouh » de 2030 (« c'est elle qu'on vient voir », dit le
  code).
- *Défauts* : noms techniques ; quatre bannières en 22 s avant G10 ; tête hors de l'écran 21 % du temps en bascule sur
  iPhone.
- *En mieux dans 2975* : une bascule CSS casserait l'égalité des pixels (V-01). En gros pixels, le spectacle passe par
  la parallaxe demandée (retour n° 3) et par un plancher façon « Mode 7 » calculé dans le tampon pour le plan lointain,
  jamais pour le plan de jeu. Un coup de zoom ne peut pas être fractionnaire : le remplacer par une image d'impact
  (une ou deux images en deux couleurs, silhouettes os sur vide), réservée aux plus grands coups et passée au
  limiteur.

### G-14 · Les petits retours (`10-core.js:331-378, 414-445, 697-760, 1056-1076, 1114-1120`)
- *Quoi* : mur : secousse 3, onde rose, son « wallBump » (coup mat, distinct de « hit »), toutes les 260 ms au plus.
  Bouclier : onde verte (12 u à 700 u/s), halo de 120 u, « shock » ; recharge du bouclier : onde verte. Butin : gerbe,
  son « pickup » en escalier (I-08), vibration de 6 ms. Noyau : halo or de 90 u, son « core » (arpège mi-si-mi). Soin :
  son « core ». Explosions en chaîne des cartes : onde ambre, halo du rayon de l'explosion, « explode », et la musique
  plonge à 35 % en 50 ms puis revient en 0,5 s (« sinon l'explosion perd »).
- *En mieux dans 2975* : chaque petit événement garde son image et son son. Si les bords tuent désormais (retour n° 4),
  le rebond devient une alerte de proximité : des bips qui accélèrent et un bord tramé qui s'allume quand la tête
  s'approche d'un mur mortel. La mort reste ainsi lisible et juste.

---

## H. La lumière et l'ambiance (frontière avec l'inventaire du décor)

### H-01 · La grille qui s'allume (`25-levels.js:1617-1682`)
- *Quoi* : une trame fine (1 px) et une trame forte une ligne sur quatre (2 px, alpha 0,20 + 0,16 × l'intensité) ;
  une onde de balayage diagonale allume les nœuds à son passage (trois paliers, carrés de 3 à 8 u) et avance avec le
  temps ET avec l'intensité.
- *En mieux dans 2975* : la démo a des impulsions qui courent le long du treillis (4 + 14 × la tension,
  `démo 70-game.js:1207-1222`). Les caler sur la MUSIQUE (AV-18, écartée dans 2030) : à chaque temps, les grosses
  lignes passent d'indigo à violet pendant deux images ; à chaque début de phrase, une onde diagonale traverse ; le
  décor reste au plus en violet (V-09).

### H-02 · Les blooms du décor (`25-levels.js:1575-1594`)
- *Quoi* : cinq grandes taches de lumière (340 à 640 u) qui respirent (0,5 ± 0,22) et s'avivent avec l'intensité
  (+0,2).
- *En mieux dans 2975* : des nappes tramées très sombres (nuit → indigo) dans le plan lointain de la parallaxe, plus
  denses quand la tension monte.

### H-03 · La poussière en parallaxe (`25-levels.js:1596-1615`)
- *Quoi* : une poussière qui glisse à 10 % de la caméra et scintille (0,7 à 1).
- *En mieux dans 2975* : c'est déjà une parallaxe (retour n° 3) : un plan intermédiaire de points d'un pixel qui
  défilent à 30-50 % de la vitesse de la caméra.

### H-04 · La brume et la vignette de danger (`25-levels.js:2160-2210`)
- *Quoi* : un voile radial aux couleurs du secteur (0,10 + 0,05 × l'intensité) ; une vignette rouge de danger qui pulse
  (0,7 ± 0,3, environ 2,2 Hz) à 3 segments ou moins, plus faible pendant un boss (0,16).
- *En mieux dans 2975* : des bords tramés en sang dont le seuil de Bayer pulse à 3 Hz au plus (V-20 ; l'aire reste
  petite à chaque instant).

### H-05 · Une palette par secteur (`25-levels.js:36-46, 54-200`)
- *Quoi* : chaque secteur a sa palette (fond, grille, grille chaude, accent, chaleur, danger, bloom, poussière…) :
  bleu nuit pour LA GRILLE, pourpre pour AUTOROUTE NÉON, bleu profond pour ZONE MAGNÉTIQUE ; la SURCHARGE tourne sur
  trois palettes, cycle après cycle.
- *Défauts* : des palettes monochromes (73 à 80 % de violet au secteur 2) ; le cyan du joueur réutilisé par le décor
  avant G11.
- *En mieux dans 2975* : dans la palette fermée, un chapitre change la TABLE DE REMAPPAGE des index du décor (vide,
  nuit, ardoise, indigo, violet) et son illustration d'horizon, jamais les couleurs des entités ; les palettes
  déblocables (V-12) passent par le même mécanisme.

---

## I. L'audio : les effets (`21-audio.js`)

### I-01 · Le graphe de mixage (`21-audio.js:1017-1192`)
- *Quoi* :
  - **Effets** → l'un des 7 panoramiques → entrée à 0,9 → compresseur d'effets (−18 dB, rapport 8, attaque 2 ms,
    relâche 120 ms) → compresseur maître (−13 dB, genou 24, rapport 5, 4 ms, 180 ms) → maître à 0,88.
  - **Piste MP3** → gain de piste → compresseur de piste (−18 dB, rapport 4, 15 ms, 280 ms) → rattrapage × 1,03 → gain
    d'intensité → passe-bas (700 Hz → 18 kHz) → bus musique (0,40) → esquive → compresseur maître.
  - **Couches synthétisées** → bus des couches → compresseur (−26 dB, rapport 6, 6 ms, 200 ms) → rattrapage × 1,29 →
    bus musique ; le lead passe d'abord par une saturation douce (courbe k = 9, suréchantillonnage × 2).
  - **Accents** (stinger) → directement au compresseur maître : le compresseur d'effets les écrasait au moment même où
    ils devaient s'entendre.
- *Pourquoi c'est bien* : la musique laisse la place aux impacts, et la piste est lissée pour que son niveau suive
  l'intensité, pas les creux de l'arrangement.
- *En mieux dans 2975* : le graphe de la démo (genou doux, porte, étouffoir, réverbération à quatre peignes, esquive
  par classe de son, `démo 30-music.js:230-305, 461-469`) est plus propre ; y ajouter une entrée « accents musicaux »
  hors esquive et les sept panoramiques (I-05).

### I-02 · La banque de 32 sons (`21-audio.js:212-468`)

| Nom | Événement | Timbre (synthèse) | Durée | Crête visée |
|---|---|---|---|---|
| shoot | tir de la joueuse | souffle 3 → 1,6 kHz ; carré 900 → 300 Hz, désaccord de ±70 cents au hasard ; triangle ; petit sub | 45 ms | −12 dBFS |
| eshoot | tir ennemi | dent de scie 380 → 300 Hz filtrée à 1,2 kHz ; souffle | 120 ms | distinct du tir joueur |
| laser | rayon | deux dents de scie 1 500 → 380 Hz ; souffle 5,6 → 1,8 kHz | 200 ms | — |
| missile | missile | souffle 1,4 → 4,2 kHz ; triangle qui monte de 300 à 900 Hz ; sub court | 300 ms | — |
| shock | électrocution, bouclier | trois claquements aigus à 0, 35 et 75 ms ; carré 2,4 kHz → 420 Hz | 150 ms | — |
| zap | arc électrique | carré 1 800 → 190 Hz ; souffle 6,2 → 0,8 kHz | 110 ms | — |
| hit | impact sur un ennemi | souffle 1,6 → 1,1 kHz ; carré 1 500 → 900 Hz ; triangle | 60 ms | −14 |
| bossHit | impact sur le boss | deux carrés métalliques 1 100 → 820 et 1 650 → 1 230 Hz | 90 ms | — |
| wallBump | mur | coup mat 790 → 470 Hz ; triangles | 75 ms | — |
| kill | mort d'un ennemi | deux souffles, deux carrés, un sub ; hauteur × 2^(combo/12) | 170 ms | −8 |
| bigkill | mort d'une élite | souffles larges ; sub 190 → 60 Hz ; dents de scie 1 040 → 300 et 520 → 70 Hz ; queue à +0,1 s | 400 ms | −4 |
| explode | explosion | deux souffles ; sub 150 → 50 Hz ; souffle aigu | 340 ms | −4 |
| pickup | ramassage | triangle 1 080 → 1 620 Hz puis sinus 2 160 → 2 430 Hz à +50 ms ; escalier (I-08) | 150 ms | −14 |
| core | noyau | arpège mi5, si5, mi6 à 60 ms d'écart, et mi7 | 380 ms | −12 |
| hurt | blessure | carrés 1 200 → 380 et 300 → 62 Hz ; souffles ; sub 90 → 34 Hz | 280 ms | −4 |
| dead | mort | trois dents de scie qui tombent (1 320 → 220, 440 → 55, 660 → 130 Hz) ; souffles ; sub | 1,3 s | −3 |
| boost | accélération | souffle 260 → 5 200 Hz ; dent de scie 180 → 760 Hz | 340 ms | −12 |
| boostEnd | fin d'accélération | souffle 4 200 → 380 Hz ; triangle | 260 ms | −16 |
| boostDry | panne | clic grave, carré 260 → 130 Hz | 90 ms | −16 |
| warp | transition | souffle 260 → 6 400 Hz ; dent de scie 330 → 2 200 Hz ; sinus 1 760 → 110 Hz ; atterrissage à +0,6 s | 0,9 s | −10 |
| spawnTick | portail | sinus à 2 kHz et 4 kHz | 40 ms | −18 |
| absorb | le corps encaisse un tir | sinus 430 → 250 Hz ; souffle | 50 ms | — |
| lowHp | battement de cœur | deux coups : 1 250 → 625 Hz, puis 1 080 → 540 Hz à +160 ms | 270 ms | −14 |
| teleport | téléportation | sinus 1 400 → 320 Hz, puis 480 → 2 200 Hz | 260 ms | — |
| steal | butin volé | trois carrés qui descendent, do6, sol5, do5 (moqueur) | 480 ms | — |
| click | interface | deux carrés très courts, 3,2 et 1,6 kHz | 18 ms | −16 |
| levelup | montée de niveau | arpège la4, do#5, mi5, la5 (la majeur) à 90 ms | 0,7 s | −10 |
| multUp | palier de multiplicateur | accord montant mi4, sol#4, si4 (et si5) en 120 ms, sous le kill | 220 ms | — |
| card | cartes | quinte aérienne do6 + sol6, souffle | 550 ms | −14 |
| ultReady | ultime prêt | la3 et mi4 qui s'ouvrent, puis la4 et un souffle qui monte | 770 ms | — |
| ultFire | tir de l'ultime | souffle 8 kHz → 150 Hz ; sub 210 → 26 Hz ; dents de scie | 0,8 s | — |
| bossIn | alarme de boss | sub ; dents de scie graves ; CORNE 1,75 → 1,34 kHz | 1,45 s | −3 |

Et quatre événements musicaux : stinger, drop, esquive, ultime (J-09).
- *Pourquoi c'est bien* : chaque événement a SA voix, on peut donc jouer à l'oreille ; les sons d'information vivent
  dans les médiums, parce que le haut-parleur d'un téléphone ne rend pas les graves.
- *Défauts* : avant G12, 11 sons sur 22 avaient plus de 70 % de leur énergie sous 400 Hz, le tir ennemi était le tir
  joueur en trois fois plus fort, « warp » servait à huit événements ; seuls core, levelup, multUp, card, ultReady et
  les accents sont en la, les autres ignorent la tonalité du morceau.
- *En mieux dans 2975* : porter cette banque dans `30-music.js`. La démo a 8 noms (tir, kill, bigkill, degat, butin,
  intro, defi, neutre), tous dans la tonalité courante (pentatonique, G-33) : c'est mieux. Il lui manque une vingtaine
  de voix : tir ennemi, télégraphes (mine qui s'arme, rayon qui charge, flèche qui vise), portail, alarme, frappe et
  frappe du boss, battement, alerte de bord, absorption par le corps, palier, cartes, « prêt », interface. Règles de
  2030 à garder : au moins 25 % de l'énergie au-dessus de 400 Hz, des centroïdes espacés d'au moins 20 % dans une même
  classe, trois sites d'appel au plus par nom.

### I-03 · Le code sonore par classes (`21-audio.js:212-217`)
- *Quoi* : la joueuse en timbres clairs et chauds, les ennemis en médiums rêches, les ressources en cloches
  cristallines, le danger en graves saturés.
- *En mieux dans 2975* : la même grammaire, accordée à la palette (cyan = clair, magenta = rêche, ambre = cristallin,
  sang = grave), toutes les hauteurs dans la gamme courante.

### I-04 · Des gains calibrés par la mesure (`21-audio.js:92-96`)
- *Quoi* : un facteur par son (de 0,48 pour spawnTick à 3,03 pour dead) qui amène la crête réelle, en sortie du maître,
  sur la cible en dBFS (outil `tools/test/G12/calibre.mjs`) ; « ne pas retoucher à la main sans remesurer ».
- *Pourquoi c'est bien* : le mixage devient une mesure, pas un goût ; les sons d'information passent 9 dB au-dessus de
  la musique.
- *En mieux dans 2975* : la démo a son banc (`tools/musique2/mesure.mjs`) : y calibrer chaque son ajouté.

### I-05 · Le panoramique à sept positions (`21-audio.js:199-210, 1124-1133`)
- *Quoi* : sept panoramiques créés une seule fois (de −0,85 à +0,85) ; chaque son prend la position de sa source par
  rapport à la caméra ((x − caméra) / demi-largeur de la vue).
- *Pourquoi c'est bien* : on entend d'où vient le danger, sans aucun coût par son.
- *En mieux dans 2975* : la démo est en mono, hors réverbération. L'iPhone a deux haut-parleurs en paysage : ajouter
  les sept panoramiques, surtout pour les menaces hors champ (E-01) ; en portrait, panoramique réduit.

### I-06 · La garde anti-saturation (`21-audio.js:80-121`)
- *Quoi* : par nom, un maximum de voix par fenêtre (40 ms ; 60 ms pour le tir et le zap, 55 ms pour la frappe) : tir 1,
  frappe 3, explosion 1, kill sans limite… ; et un budget global de 28 voix par 40 ms.
- *Pourquoi c'est bien* : une foule ne tourne pas à la bouillie.
- *En mieux dans 2975* : la démo combine fusion, plafond et USURE (le gain baisse avec la densité récente,
  `démo 30-music.js:588-613`), plus fin : garder l'usure, sauf pour les kills (I-07).

### I-07 · Aucun kill muet (`21-audio.js:1308-1332`)
- *Quoi* : un kill qui tombe dans les 40 ms d'un autre ne rejoue pas le corps grave : il AJOUTE une note courte (30 ms,
  carré 640 → 420 Hz), un demi-ton plus haut par kill empilé (jusqu'à douze) et 1 dB plus forte, posée au moins 12 ms
  après la précédente. Huit kills dans la même image restent huit attaques distinctes.
- *Pourquoi c'est bien* : une rafale de kills devient une gamme qui monte, au lieu d'un son avalé (20 à 25 % des kills
  étaient muets avant G12).
- *En mieux dans 2975* : la démo FUSIONNE deux kills à moins de 22 ms en un seul son, et n'en joue que quatre à la fois
  (`démo 30-music.js:589-603`) : reprendre l'empilement de 2030, dans la pentatonique.

### I-08 · L'escalier des ramassages (`21-audio.js:1334-1341`)
- *Quoi* : un ramassage dans les 1,2 s du précédent monte d'un demi-ton (jusqu'à +12).
- *En mieux dans 2975* : la démo monte d'un degré par cellule mais retombe tous les huit (`pitch: P.len`, modulo 8,
  `démo 70-game.js:984`) : garder la montée tant que la série dure, et un accord quand la série atteint un palier de
  puissance.

### I-09 · Les sondes de test (`21-audio.js:969-993, 1291-1293, 1349, 1390-1398`)
- *Quoi* : `lastSfx()` (nom, fondamentale et instant du dernier son réellement joué), `stats()`, `tap()` (brancher un
  analyseur sur la musique ou le maître), `layersOnly()` (couper la piste pour n'entendre que les couches).
- *En mieux dans 2975* : la démo a `rms()`, `journal()` et `renderOffline()` ; ajouter `lastSfx()` pour prouver les
  escaliers de hauteur.

---

## J. L'audio : la musique

### J-01 · Les deux MP3 (mesurés le 17 octobre 2026)

| | `neonvelocity-2.mp3` (premier de la liste) | `neonvelocity.mp3` |
|---|---|---|
| Durée | 4 min 35 s (275,0 s) | 4 min 19 s (259,1 s, la constante `K.MUSIC_LOOP`) |
| Format | MP3 à 196 kb/s, 48 kHz, stéréo, pochette de 360 × 360 intégrée : 6,8 Mo | MP3 à 96 kb/s, 44,1 kHz, stéréo : 3,1 Mo |
| Métadonnées | « Neon Velocity », artiste **manonwwk**, « made with suno », créé le 3 août 2026 | aucune |
| Tempo | 144,6 BPM (`K.MUSIC_BPM`), une mesure = 1,66 s | le même |
| Structure (niveau RMS) | intro calme à −25 dB de 0 à 16 s ; décollage vers 16,3-16,6 s (dixième mesure) ; plein régime à −14 dB jusqu'à 116 s ; longue respiration à −20 / −22 dB de 116 à 170 s (creux à −28 dB vers 118 s) ; retour à −14 dB de 170 à 250 s ; fin vers 255 s | intro à −23 / −21 dB de 0 à 8 s ; montée de 8 à 10 s ; plateau à −14 / −15 dB ; trois respirations courtes (vers 45-60 s, 130-145 s, 185-200 s) ; fin vers 255 s |

- *Pourquoi c'est bien* : une vraie production (synthwave énergique à 144,6 BPM), et c'est la musique de la
  propriétaire. Deux versions du même morceau donnent neuf minutes sans boucle identique (G-34 : aucune boucle de
  moins de 60 s).
- *Défauts* : 10 Mo à télécharger, dont 6,8 Mo pour la version 2 (pochette comprise) ; un seul morceau pour tout le jeu,
  la même couleur au calme, au boss et à la fin.
- *En mieux dans 2975* : ré-encoder (AAC ou MP3 à 96 kb/s, sans pochette : environ 3 Mo par version, V-36) et charger
  la seconde pendant que la première joue. À trancher : DIRECTION.md interdit tout fichier audio, SUNO.md en prévoit
  sept, et les retours de la propriétaire priment sur l'un comme sur l'autre.

### J-02 · La lecture en flux (`21-audio.js:631-760` ; `90-boot.js:1471-1503, 1708-1747`)
- *Quoi* : deux pistes de plus de quatre minutes décodées en mémoire coûteraient près de 200 Mo de PCM. Elles sont donc
  lues en FLUX par des éléments `<audio>` attachés au document (invisibles, `playsinline`, sinon Safari refuse),
  branchés au graphe par `createMediaElementSource`. La première est préchargée ; la suivante se met en tampon
  pendant que la première joue (enchaînement inaudible) ; une seule piste joue à la fois (toutes les autres sont en
  pause : c'est la seule garantie contre deux morceaux superposés). Page autonome : pistes embarquées en URI de
  données (`build.mjs --embed`).
- *Pourquoi c'est bien* : la mémoire ne dépend plus de la durée.
- *En mieux dans 2975* : à reprendre tel quel si la musique de la propriétaire revient ; ne jamais décoder un morceau
  entier sur iPhone.

### J-03 · Entrer dans le morceau, ne jamais recommencer (`21-audio.js:666-679, 731-737`)
- *Quoi* : à la première lecture, la première piste démarre à ⌈18 s / mesure⌉ × mesure = 11 mesures = **18,26 s**,
  après l'intro calme (que l'audit mesurait à −32 dB) ; la piste de départ est tirée au sort (compteur
  `snake2030.mus` en stockage local, mêlé à la graine) ; après une mort ou une pause, la lecture reprend où elle en
  était, recalée sur le début de mesure le plus proche.
- *Pourquoi c'est bien* : la musique est là quand on joue (avant G12, 15 s d'intro très basse à chaque chargement) ;
  elle ne redémarre jamais au début (G-34) et ne reprend jamais au milieu d'un temps.
- *Défauts* : l'entrée à 18,26 s tombe environ une mesure APRÈS le décollage (16,6 s) : on rate l'impact ; la seconde
  piste démarre à 0 s.
- *En mieux dans 2975* : **l'intro devient la musique de l'écran-titre et du briefing** (les dix premières mesures,
  bouclées sur les quatre dernières), et JOUER fait sauter la lecture à la mesure 10 : la partie commence SUR le
  décollage du morceau. Après une mort, reprise à un point tiré au sort, au début d'une mesure (G-34).

### J-04 · La robustesse (`21-audio.js:762-833`)
- *Quoi* : un chien de garde écoute les vrais signes de vie (progress, loadedmetadata, canplay, playing) et n'abandonne
  qu'après une erreur franche ou 30 s de silence total (une version précédente abandonnait des pistes saines sous
  4,5 Mb/s). Un refus de `play()` n'est jamais avalé, sauf l'AbortError de nos propres pauses. La base synthétisée ne
  s'éteint qu'une fois la PREUVE que du son sort (`playing`, ou plus de 0,05 s lus) : fondu de 0,6 s pour la piste, de
  0,9 s pour la base. Si toutes les pistes échouent : décodage en mémoire d'une piste à la fois, en alternance ;
  sinon, la synthèse seule.
- *Pourquoi c'est bien* : aucune partie muette, même en 3G ou sous une politique de sécurité stricte.
- *En mieux dans 2975* : le moteur génératif de la démo est le repli naturel (il joue déjà seul) ; reprendre la règle
  « on n'éteint le repli qu'à la preuve du son ».

### J-05 · La base de secours synthétisée (`21-audio.js:66-78, 505-519`)
- *Quoi* : quand aucune piste ne joue : kick sur les noires (sub de 150 à 44 Hz), charleston, basse en dent de scie une
  double croche sur deux, accords en carrés aux pas 2, 10 et 14, sur quatre mesures la mineur, fa, do, sol, au tempo du
  morceau.
- *En mieux dans 2975* : c'est ce que la démo fait mieux (anti-répétition, grilles variées, breaks, fills), mais plus
  lentement (112 à 128 BPM).

### J-06 · Les cinq couches d'intensité (`21-audio.js:470-583, 1141-1185`)

| Couche | Entre à (pleine à + 0,12) | Volume | Contenu |
|---|---|---|---|
| perc | 0,07 | 1,85 | charleston sur les croches (ouvert à contretemps), clap aux temps 2 et 4, crash au pas 14, tics aux pas 7 et 15 ; « c'est elle qui porte le démarrage » |
| arp | 0,35 | 1,27 | arpège en carrés sur les notes de l'accord, octaves alternées, triangle deux octaves plus haut sur les noires |
| pad | 0,55 | 0,99 | nappe d'un accord par mesure : trois dents de scie désaccordées et un sinus grave, attaque lente (28 à 32 % de la mesure) |
| lead | 0,75 | 0,99 | mélodie en deux dents de scie à ±11 cents, par la saturation douce, transposée à chaque mesure |
| clim | 0,90 | 1,27 | sub sur chaque noire, stabs qui glissent de deux octaves, montée de bruit sur la 4e mesure (400 → 7 200 Hz) ; n'atteint que 83 % à l'intensité 1 |

Mode allégé : une double croche sur deux quand le téléphone peine (la piste n'est pas concernée).
- *Pourquoi c'est bien* : la densité de la musique suit celle du jeu.
- *Défauts* : en mode FLUX, qui est le cas normal en ligne, la grille des couches n'est PAS calée sur les temps du MP3 :
  `_audStartStream` ne remet ni le pas ni l'instant à zéro (seul le repli mémoire le fait, `880-881`), et le démarrage
  réel de l'élément audio a une latence inconnue ; les doubles croches synthétisées peuvent donc tomber à côté des
  temps du morceau. Et leur progression en la mineur n'est vérifiée nulle part contre la tonalité du morceau.
- *En mieux dans 2975* : déduire la phase de la mesure de `audio.currentTime` à chaque réveil de l'ordonnanceur et y
  caler les couches ; mesurer une fois la tonalité du morceau et y accorder couches, sons et accents ; garder la règle
  de la démo, « on n'ajoute une couche qu'à la barre de mesure » (G-31).

### J-07 · La musique suit l'action (`21-audio.js:919-951, 1244-1256`)
- *Quoi* : à chaque réglage d'intensité v (huit par seconde au plus, écart d'au moins 0,004, fondus d'environ 1 s) :
  gain de PISTE d'environ −6,2 dB à v = 0 (−7 dB, plus un plancher de 0,8 dB) jusqu'à 0 dB dès v ≥ 0,8 ; passe-bas de
  la piste à 700 Hz × 25,7^v (700 Hz au calme, 3,5 kHz à mi-intensité, 18 kHz au chaos) ; vitesse de lecture de
  1,00 à 1,06 ; et les couches de J-06.
- *Pourquoi c'est bien* : mesuré après G12, +6 dB entre le calme et le chaos et une corrélation intensité ↔ niveau d'au
  moins 0,5 (0,09 avant) ; la musique est étouffée au calme et « s'ouvre » quand ça chauffe.
- *Défauts* : +6 % de vitesse sur un élément `<audio>` veut dire un étirement temporel, avec des artefacts possibles ;
  en repli mémoire, la hauteur monte d'environ un demi-ton et désaccorde les couches.
- *En mieux dans 2975* : garder le gain et le passe-bas (la démo ajoute déjà +0,50 de niveau avec la tension) ; ne plus
  toucher à la vitesse de la piste et laisser la variation de tempo au moteur génératif ; ajouter le resserrement de
  vie basse (G-04).

### J-08 · L'intensité calculée par le niveau (`25-levels.js:1049-1077`)
- *Quoi* : une base par phase (calme 0,20 ; montée 0,46, +0,12 au fil de la phase ; surcharge 0,76, +0,12 ; apogée
  0,94 ; purge 0,22, −0,10), plus la densité (ennemis vivants / 46, × 0,16), plus 0,06 si un boss est là, plus le cycle
  de surcharge (0,10 au plus), lissée avec une constante de temps d'environ 0,36 s.
- *Pourquoi c'est bien* : l'intensité mêle le SCÉNARIO (les phases) et la RÉALITÉ (ce qu'on voit à l'écran).
- *En mieux dans 2975* : la tension de la démo n'est qu'un escalier de 20 s (0,06, puis +0,175 par tranche,
  `démo 70-game.js:1174-1180`) ; y mêler la densité réelle et la vie basse, et suivre les phases de G 3.3, respiration
  comprise (G-17).

### J-09 · Les accents musicaux (`21-audio.js:957-967, 1351-1388, 1403-1428` ; `10-core.js:1114-1120`)
- *Quoi* :
  - **le stinger** : une mesure d'accent à chaque changement de phase du niveau et à chaque phase de caméra (force
    0,7) : un souffle qui monte de 3 à 7,6 kHz, deux dents de scie la4 et mi5, un sub, puis sur les temps 2, 3 et 4
    trois notes la5, si5, mi6 ; force × 6 pour passer +7,6 dB au-dessus du plancher de l'action ;
  - **le drop** : 250 ms de silence total, puis tout revient d'un coup ; réservé au portail du boss (« le seul moment où
    le jeu a le droit de se taire ») ;
  - **l'esquive** : la musique plonge à 35 % en 50 ms puis revient en 0,5 s pour laisser passer une explosion (une fois
    toutes les 90 ms au plus) ;
  - **l'ultime** : plongeon à 10 %, battements, montée inversée, retour explosif à 128 % (G-07).
- *Pourquoi c'est bien* : la musique RACONTE les événements (G-32) au lieu de les ignorer.
- *Défauts* : le stinger part à l'instant de l'événement, pas sur la mesure ; coupé avec les effets, alors que c'est un
  événement musical.
- *En mieux dans 2975* : la démo a l'esquive par classe (kill 0,10, gros kill 0,45, dégât 0,32, information 0,22) et
  l'étouffoir ; il lui manque le stinger, le drop et le plongeon : les ajouter calés sur la mesure suivante (G-31),
  dans la tonalité.

### J-10 · Le cycle de vie du son (`21-audio.js:1194-1289` ; `90-boot.js:1835-1854`)
- *Quoi* : `start` (bus à 0,40 en 0,4 s) ; `stop` (fondu de 0,18 s, puis arrêt réel des sources à 240 ms : un vrai
  silence, plus aucun calcul) ; `resume` (relance un contexte `suspended` ou `interrupted`, comme Safari après un
  appel) ; musique coupée = fondu de 0,25 s puis arrêt réel ; effets coupés = rampe de 0,12 s ; le contexte est créé
  au premier geste (pointerdown, touchstart, keydown, en capture) et relancé à chaque geste.
- *En mieux dans 2975* : la démo fait tout cela (suspend, resume, coupure mémorisée valable avant même
  l'initialisation, porte) ; V-33 demande en plus de déverrouiller sur touchend, pointerup ou click.

### J-11 · Le silence des menus (constat ; `90-boot.js:1413-1416, 1431-1435` ; `10-core.js:513-514`)
- *Quoi* : la musique ne joue que pendant la partie : rien au menu, rien en pause, rien sur l'écran de fin (seul
  « dead » résonne).
- *Défauts* : les écrans qu'on voit le plus souvent sont muets, et la mort coupe tout d'un coup.
- *En mieux dans 2975* : la démo fait mieux (musique dès le premier toucher, étouffoir en pause, tension 0,12 à la fin) :
  garder cela, et donner à la fin un thème court (SUNO.md : `defaite.mp3` de 20 à 30 s, `victoire.mp3` de 30 à 45 s).

---

## K. Les vibrations

### K-01 · Les motifs haptiques (`10-core.js:1122-1125` et appels ; `90-boot.js` ; `26-ui.js:577-580`)
- *Quoi* : clic 8 ms ; choix de carte 14 ; accélération 12 ; panne [10, 30, 10] ; butin 6 ; kill d'élite 20 ;
  bouclier 16 ; pouvoir 24 ; montée de niveau 14 ; blessure [18, 30, 26] ; mort [40, 60, 90] ; ultime [40, 20, 90] ;
  le réglage est masqué là où `navigator.vibrate` n'existe pas.
- *En mieux dans 2975* : `navigator.vibrate` n'existe pas dans Safari sur iPhone (J-25) : chaque motif doit avoir son
  équivalent en son et en image (c'est le cas pour tous ceux de cet inventaire) ; garder les vibrations pour Android,
  derrière un réglage visible seulement là où il marche.

---

## L. Ce que la démo a déjà, et parfois mieux que 2030 : à ne pas perdre

- **Explosions en pixel pur** (`démo 50-fx.js:407-467, 646-700`) : cœur qui blanchit en trois images puis refroidit en
  bandes tramées, boule qui se troue, anneaux percés par secteurs, éclats à traînée, étincelles ; débris qui restent
  au sol 3,2 à 4,4 s (G-30). Plus beau et plus lisible que les gerbes de 2030.
- **Limiteur de flashs WCAG** (`démo 50-fx.js:216-252`) : trois flashs par seconde au plus au-delà du seuil d'aire,
  les suivants atténués ou rapetissés ; plus juste que le budget « un toutes les 4 s » de 2030.
- **Secousse à trauma et caméra à ressort** (`démo 50-fx.js:269-296`, `20-crt.js`), **gel ancré sur le numéro
  d'image** (`démo 50-fx.js:254-267`), **flash de frappe d'une image limité par objet** (`démo 50-fx.js:298-322`).
- **Musique générative sans répétition** (`démo 30-music.js:615-631`), qui ne change de couche qu'à la mesure, change
  de tonalité toutes les 16 mesures, place breaks et fills ; **étouffoir** en pause (420 Hz) et pendant les longs gels
  (900 Hz) ; **sons dans la tonalité** ; **usure** des sons répétés ; **coupure du son mémorisée**, valable avant même
  la création du contexte ; rendu hors ligne pour la preuve.
- **Interlude du colosse** (ALERTE puis le colosse et son nom), **ouverture** de 11,5 s avec les panneaux, **fonds de
  fin** victoire et défaite (`60-intro.js`).
- **Lisibilité** (`démo 70-game.js`) : télégraphes en pointillés qui défilent, gainés de nuit profonde (1263-1315) ;
  arc de vie du colosse sur lui-même (1337-1341) ; chevron du cap visé (1371-1373) ; pouce fantôme (1397-1417) ;
  bandeaux placés loin de la tête (1425) ; défi nommé avec barre de chaîne (1449-1460) ; purge finale en chaîne
  (1067-1099) ; mort du colosse en cinq explosions sur 0,66 s et 24 cellules (760-779) ; vague de cyan pâle le long du
  corps au défi réussi (1365) ; garde de 0,45 s à la fin (73).
- **Le tube cathodique** (`20-crt.js`) : balayage, grille, vignette, aberration sur les bords, halo nourri par la
  chaleur des explosions ; préréglages riche, sobre, pur, coupé.

## M. Ce que la démo n'a pas, dans ce domaine

| Idée de SNAKE 2030 | Dans la démo | Fiches |
|---|---|---|
| Écran-titre avec JOUER, réglages, déblocages, record par cran | absent : ouverture, puis « TOUCHE POUR JOUER » | A-01, A-06, A-07 |
| Écran de cartes et cérémonie de montée | absent ; les paliers de canons (10, 20, 32 segments) passent en silence | A-03, G-06 |
| Pause utile | « PAUSE / TOUCHE POUR REPRENDRE » seulement | A-04 |
| Fin qui explique (cause, conseil, comparaison) | score, record, défi ; la cause est journalisée (`stats.hitLog`) mais pas affichée | A-05 |
| Multiplicateur affiché, avec son palier sonore | calculé (1 + ⌊longueur / 8⌋, plafond 8) mais jamais montré | B-03, I-02 |
| Barre d'XP ou de progression, nom du lieu | absents | B-01, B-04 |
| Jauge de boss en haut de l'écran | l'arc autour du colosse seulement (très bien quand il est visible) | B-06 |
| Vie en pastilles et alarme de vie basse | trois cœurs, rien de particulier à la dernière vie | B-07, G-04 |
| Bannières plein écran avec glitch | petits bandeaux encadrés à l'échelle 1 (défi, colosse) | C-01 |
| Toasts de règle | le pouce fantôme seulement | C-02 |
| Chevrons de portail et marqueurs hors champ | carrés de 5 × 5 px à moins de 45 px du bord | E-01, E-02 |
| Ralenti (blessure, montée, ultime, boss) | aucun | G-03, G-06, G-07, G-10 |
| Recul de caméra orienté | absent (`20-crt.js` le sait, personne n'écrit `S.shakeX` et `S.shakeY`) | F-09 |
| Vignette orientée du dégât | un trait de 12 px depuis la tête pendant 0,55 s | F-11 |
| Glitch | absent | F-12 |
| Texte de score qui grossit avec la chaîne | taille fixe | F-06 |
| Ultime, pouvoir, accélération et leurs retours | absents | G-07, G-08, G-09 |
| 32 sons, en classes, en stéréo | 7 noms joués, tous au centre | I-02, I-05 |
| Tir ennemi, télégraphes, portail, alarme de boss qui s'entendent | muets (seul « intro » annonce le colosse) | I-02, G-10 |
| Aucun kill muet | fusion à 22 ms et quatre voix au plus | I-07 |
| Stinger aux changements de phase, drop au boss, plongeon de l'ultime | absents (esquive seulement) | J-09 |
| Musique produite | interdite par DIRECTION.md, prévue par SUNO.md | J-01 à J-04 |
| Tempo énergique dès le départ | 112 BPM, nappe et basse seules pendant 20 s | J-06, J-07 |
| Palette et ambiance par niveau | une seule arène, même décor du début à la fin | H-05 |
| Décor qui réagit (balayage, blooms, danger) | impulsions de données (4 + 14 × la tension) | H-01 à H-04 |

## N. Les dix idées les plus importantes, classées

1. **Une bande-son produite, énergique, qui suit l'action et marque les temps** (J-01 à J-09). « Neon Velocity », la
   musique de la propriétaire, en flux, entrée sur le décollage, reprise sur la mesure, passe-bas et gain qui
   s'ouvrent avec l'intensité, couches calées sur ses temps, stinger, drop et plongeon à la mesure. *La démo n'a* qu'un
   moteur génératif en la mineur qui démarre à 112 BPM avec la seule nappe et la basse pendant vingt secondes, et ni
   stinger, ni drop, ni plongeon : c'est très probablement le cœur du « triste ».
2. **Des temps forts mis en scène** (G-03, G-06, G-07, G-10, G-11, F-08, F-10). Ralenti, gel, onde depuis la tête,
   flash passé au limiteur, bannière, accent musical, réunis dans un seul « metteur en scène » des moments (blessure,
   palier, boss, purge, ultime, mort) pour que tout reste cohérent et sous le limiteur. *La démo n'a* aucun ralenti, et
   ses paliers de puissance passent en silence.
3. **Le jus du kill et de la chaîne** (G-01, B-03, F-06, F-09, I-07). Multiplicateur visible avec ce qu'il manque,
   accord à chaque palier, texte qui grossit et vire au jaune, recul de caméra à l'opposé du tir, aucun kill muet.
   *La démo n'a* ni multiplicateur affiché (alors qu'elle en calcule un), ni texte indexé, ni recul, et elle fusionne
   les kills rapprochés.
4. **La peur juste : la blessure lisible, la vie basse qui bat, une mort qui fait peur** (G-03, G-04, G-05, F-11,
   B-07). Vignette tramée du côté touché, ralenti de 0,4, battement de cœur à 1 Hz, bords qui pulsent, désintégration
   au ralenti, musique qui s'effondre, extinction cathodique, SIGNAL PERDU, le tout en moins d'une seconde. *La démo
   n'a* qu'un trait de direction, rien à la dernière vie, et une dissolution de 0,28 s : c'est le retour n° 4.
5. **Les menaces annoncées hors champ** (E-01, E-02, I-05). Chevrons de portail 600 ms avant (1,4 s, triples et
   clignotants pour le colosse), marqueurs persistants dont la taille dit la distance, tic sonore du côté de l'arrivée.
   Sans cela, le monde qui défile (retour n° 3) rendrait les morts injustes. *La démo n'a* que des carrés pour les
   ennemis déjà au bord, et aucun son de portail.
6. **La voix du jeu : bannières et toasts disciplinés** (C-01 à C-03). Noms des niveaux, des pics, du colosse, de la
   purge et de la récompense, avec entrée à l'échelle supérieure, fantômes magenta et violet, balayage, dissolution de
   Bayer, une voix à la fois. *La démo n'a* que trois petits bandeaux encadrés.
7. **Le HUD qui raconte la progression** (B-01 à B-08). Ligne de progression, multiplicateur, nom du lieu et tag de
   phase, jauge du colosse qui se remplit, vie en pastilles avec alarme, états de ressources dessinés autour de la
   tête. *La démo n'a* que le score, les cœurs et le défi.
8. **Une banque sonore complète, par classes de timbre, en stéréo** (I-02 à I-06). Une voix par événement (tir ennemi,
   télégraphes, portail, alarme, frappe, frappe du boss, battement, palier, cartes, interface), dans les médiums,
   calibrée par la mesure, dans la tonalité. *La démo n'a* que sept noms, tous au centre.
9. **L'écran de cartes et sa cérémonie** (A-03, G-06). Rareté lisible deux fois (couleur et forme), entrée
   échelonnée, ultra qui scintille, musique étouffée pendant le choix. *La démo n'a* aucun écran de choix : la longueur
   est la seule progression.
10. **Le cadre complet** (A-01, A-04, A-05, A-06, J-11). Écran-titre vivant et musical, pause utile, réglages en six
    lignes, fin de partie qui dit qui a tué, donne un conseil, compare et relance en moins de 2 s. *La démo n'a* ni
    menu, ni réglages, et une fin de quatre lignes qui n'affiche pas la cause qu'elle connaît pourtant.

## O. Ce qu'il ne faut pas reprendre de 2030

1. Une interface en DOM avec polices système, dégradés et halos flous : elle casse les gros pixels et n'a aucune
   signature (AV-13).
2. Des icônes en glyphes Unicode (⊥ ◐ ◈ ➤).
3. Des boutons fixes dans les coins : 62 % des images avaient un ennemi sous un contrôle ou sous le HUD.
4. Des bannières pour des noms techniques (quatre en 22 s avant G10).
5. Le silence des menus, de la pause et de la fin (J-11) : la démo fait mieux.
6. Un même son pour plusieurs sens (« warp » pour huit événements avant G12, « SURCHARGE » qui nommait trois choses).
7. Des couches musicales qui ne tombent pas sur les temps du MP3 en flux, et un +6 % de vitesse sur la piste (J-06,
   J-07).
8. Des MP3 lourds : 6,8 Mo à 196 kb/s avec pochette.
9. Des « puissances » héritées dans certaines gerbes (0,7 à 3 u/s : la gerbe de mort reste sur place).
10. Un monde gelé à la mort, sans mise en scène ; et des annonces cadencées par `setTimeout`, qui ignorent la pause et
    les ralentis.
11. Dix-huit lignes de réglages, et des retours confiés à la vibration.
12. Le flash plein écran fréquent et la secousse permanente (corrigés par le budget en 2030, et mieux encore par le
    limiteur de la démo).

## P. Repères chiffrés

| Famille | SNAKE 2030 | Démo SNAKE 2975 |
|---|---|---|
| Gel (images) | kill 2, élite et boss 5, blessure 4, mort 8 | kill 2 ou 3 (0,12 s entre deux), blessure 8, mort 4, colosse 26, fin du colosse en purge 20 |
| Ralenti | blessure 0,4 × 180 ms (+ 120 ms de retour) ; montée 0,15 × 350 ms ; ultime 0,25 × 420 ms ; boss 0,3 × 2,2 s ; gel 0,08 | gel 0,08 seulement |
| Secousse | plafond 18 u (≈ 4,5 px) ; mur 3, kill 4,5, mine 6, blessure 8, élite 14, boss 16, ultime 18 | trauma, plafond de 12 px à px = 2 ; dégât 7, colosse 12 |
| Flash | une nappe plein écran toutes les 4 s, au-dessus de 0,28 | trois flashs par seconde au plus au-delà de 6,6 % de l'écran |
| Annonces | bannière 1,2 s (boss 2,2 s) ; toast 1,9 s ; tag 1 s ; portail 600 ms (boss 1,4 s) | bandeaux de 2,0 à 2,8 s ; interlude du colosse 3 s |
| Écrans | fin à 900 ms de la mort, verrou de 600 ms ; anti-rebond de 220 ms | fin à 0,28 s de la mort, garde de 0,45 s |
| Tempo | 144,6 BPM, mesure de 1,66 s, entrée à 18,26 s | 112 → 128 BPM selon la tension |
| Musique et intensité | gain de piste −6,2 → 0 dB ; passe-bas 700 Hz → 18 kHz ; couches à 0,07 / 0,35 / 0,55 / 0,75 / 0,90 ; huit réglages par seconde | niveau 0,58 + 0,50 × tension ; batterie dès 0,20, lead dès 0,68, changés à la mesure |
| Garde des sons | 28 voix par 40 ms ; kills empilés à 12 ms d'écart ; ramassages en escalier sur 1,2 s | fusion (22 à 400 ms), plafond par nom, usure |
| Conversion | 1 px de 2975 ≈ 4 u de 2030 sur iPhone paysage | |
