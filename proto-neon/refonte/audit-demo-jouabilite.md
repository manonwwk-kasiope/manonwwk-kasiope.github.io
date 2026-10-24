# Audit de la démo SNAKE 2975 — jouabilité et difficulté

Auditeur indépendant, 17 octobre 2026. Je n'ai rien construit et n'ai lu aucun rapport des
constructeurs. Je ne m'appuie que sur le code de `src/70-game.js` et `src/90-boot.js`, sur
72 parties jouées par mes propres pilotes et sur les captures que j'ai regardées.

Font autorité, dans cet ordre : `refonte/RETOURS-PROPRIETAIRE.md` (« triste, basique, trop facile,
il faut pouvoir mourir »), puis `DIRECTION.md` et `CONTRAT.md`, puis les recherches
`recherche/jouabilite-mobile.md` (J-xx) et `recherche/game-design-campagne.md` (G-xx).

---

## Note : 4 / 10

**Pourquoi pas moins.** Les commandes sont bonnes, au niveau des standards de 2026 : une image de
latence, cap conservé au relâcher, second doigt sans effet, un seul toucher pour jouer. Aucune attaque
n'arrive sans télégraphe, et 72 parties ont tourné sans une seule erreur. Le socle technique de la
jouabilité tient.

**Pourquoi pas plus.** Les règles retirent au jeu ce qui fait un Snake et ce qui fait une borne
d'arcade :

- le serpent ne peut mourir ni d'un mur ni de son propre corps ;
- le corps sert de bouclier ;
- il faut trois ou quatre coups pour mourir, chaque coup étant suivi de deux secondes
  d'invulnérabilité et d'une onde qui nettoie l'écran ;
- la vitesse ne change jamais ;
- la puissance fait boule de neige et plafonne dès 50 s ;
- la stratégie sans cervelle « fonce sur l'ennemi le plus proche » fait aussi bien que le pilote
  prudent, et mieux en score ;
- le colosse meurt en 2 à 10 s ;
- le défi unique est réussi 10 fois sur 10 avant 40 s.

Au total, la première minute est vide de danger pour qui joue, la seconde est un chaos où l'on meurt
de balles radiales plutôt que d'erreurs de pilotage, et rien ne pousse à relancer.

Les quatre retours de la propriétaire sont confirmés par la mesure : « trop facile » (#2), « il faut
pouvoir mourir » (#4), et pour la part qui touche à la jouabilité, « basique » (#1) et l'arène fixe (#3).

---

## 1. Méthode et banc

- **Banc.** Jeu servi sur `http://127.0.0.1:8112/proto-neon/index.html` et piloté par Playwright
  (Chromium). Pas de temps imposé `__DT = 1/60` et graine imposée `__SEED`. La boucle est accélérée,
  mais le pas de jeu est identique au jeu réel. L'ouverture est sautée d'une touche.
- **Quatre pilotes, écrits pour cet audit** (aucun code repris de `tools/jeu/pilote.js`) :
  - `inerte` ne touche jamais l'écran ;
  - `maladroit` est une joueuse distraite : elle décide toutes les 0,7 s, vise à peu près l'énergie
    ou un ennemi (bruit de ±35°), et n'esquive jamais ;
  - `bon` esquive les télégraphes, tirs, lasers et mines, chasse les ennemis et ramasse l'énergie ;
  - `kamikaze` dirige la tête vers l'ennemi le plus proche, sans autre règle.
- **Parties jouées.**
  - 40 en iPhone 13 paysage (844×390) : 10 graines × 4 pilotes, première partie ;
  - 10 en portrait (390×844) ;
  - 9 au bureau (1440×900) ;
  - 10 en relance (deuxième partie d'affilée) ;
  - 4 parties de captures.
- **Mesures prises à chaque image** : coups reçus et leur cause (`stats.hitLog`), temps
  d'invulnérabilité, temps collé au mur, tirs ennemis absorbés par le corps, temps « calme » (aucun
  ennemi à l'écran et aucun tir), longueur, durée de vie du colosse.
- **Toucher réel.** Événements `Input.dispatchTouchEvent` du protocole CDP, émulation iPhone, horloge
  réelle : latence, zone morte, demi-tour, second doigt, relâcher.
- **Captures** dans `refonte/captures/audit-jouabilite/`, toutes regardées. Préfixes : `C1` (bon,
  paysage), `C2` (inerte), `C3` (portrait), `C4` (bureau), `touch-*`.

**Limite.** Mes pilotes ne remplacent pas une joueuse. Le `bon` esquive mal les salves radiales du
colosse : une humaine attentive fera mieux que lui en minute deux, ce qui rend le jeu encore plus
facile qu'il ne paraît ici. Le `maladroit` n'esquive jamais : une humaine maladroite fera mieux que lui
en minute un.

---

## 2. Les chiffres

### 2.1 Qui survit aux deux minutes (iPhone paysage, 10 graines, première partie)

| pilote | victoires | fin médiane | coups avant 60 s | coups après 60 s | défi réussi | score médian |
|---|---|---|---|---|---|---|
| inerte | 0/10 | 38,3 s | 30 (fin) | — | 0/10 | 1 780 |
| maladroit | 0/10 | 68,2 s | 15 | 22 | 7/10 | 66 640 |
| bon | **6/10** | 120 s | **1** | 28 | **10/10** (14 à 39 s) | 435 680 |
| kamikaze | **5/10** | 113 s | **1** | 28 | **10/10** (17 à 21 s) | **489 425** |

Portrait : bon 3/5 victoires, maladroit 0/5. Bureau : bon 3/3, maladroit 0/3, inerte 0/3. En relance,
le maladroit meurt entre 23 et 89 s, comme en première partie.

**Ce que montrent ces chiffres.**

1. **La minute un est vide de danger pour qui joue.** Sur 20 parties de `bon` et de `kamikaze`, il
   y a eu un seul coup reçu avant 60 s (à 27 s). Les seules joueuses touchées en minute un sont celles
   qui conduisent leur tête dans une flèche. C'est l'ennui que la propriétaire appelle « trop facile ».
2. **La stratégie sans cervelle égale la stratégie experte.** Le kamikaze n'esquive rien et gagne
   5 fois sur 10 contre 6 pour le pilote prudent. Son score médian est plus haut (+12 %) et il réussit
   le défi plus tôt. Le jeu ne récompense pas la finesse : viser l'ennemi le plus proche suffit, parce
   que le tir automatique tue avant le contact. La loi de Bushnell (« récompenser la première pièce
   et la centième ») est ratée côté centième.
3. **Ce qui tue en minute deux, ce n'est pas le pilotage.** Causes des coups du `bon` : tirs du
   colosse 12, lasers de sentinelle 9, flèches 5, laser du colosse 3. Le `kamikaze` est touché par les
   lasers de sentinelle (14) et les tirs de tourelle (8). On meurt du nombre, pas d'une erreur de
   serpent.
4. **Le défi est donné.** DIX KILLS EN CHAÎNE est réussi 10/10 par `bon` et par `kamikaze`, dès
   14 à 39 s, et 7/10 par la joueuse distraite. Il rend en plus une vie (+1 ♥).

### 2.2 Le colosse ne fait pas peur

- Il arrive à 78,4 s, après un interlude de 2,4 s. Il a 120 points de vie (`BOSS_PV`, l.71).
- Le kamikaze le détruit en **2,2 à 9,8 s** (médiane 4,5 s, 8 parties sur 10). Le `bon`, plus
  prudent, met 9 à 38 s.
- Ce n'est pas une condition de victoire : à 120 s, la purge le fait exploser tout seul
  (l.1071-1076), et tenir 120 s vaut VICTOIRE qu'il soit mort ou non (l.1056, l.1101).

Le boss final n'est ni un mur ni un objectif.

### 2.3 Les protections, mesurées

| protection | preuve dans le code | mesure |
|---|---|---|
| Glissement le long des murs, jamais de mort au mur | `wallSteer`, l.477-495, `DZ = 22` (l.70) | `inerte` : **90 % du temps** collé au mur, sans jamais en mourir (capture `C2-…-coup1.png`) |
| Le corps ne tue jamais la tête | aucun `hurt()` lié aux segments (l.533-959) | `C1-…-65s.png` : le serpent se croise en boucle sans conséquence |
| Le corps absorbe les tirs ennemis | l.946-951 | `bon` : **11 à 47 tirs absorbés** par partie, contre 0 à 2 tirs reçus à la tête |
| Trois vies, plus une rendue par le défi | `VIES = 3` (l.69), `defiOk` l.579 | 3 à 4 coups pour mourir dans 100 % des parties |
| 2 s d'invulnérabilité à chaque coup | `INVUL = 2.0` (l.69, l.537) | 9 à 18 % du temps de jeu passé invulnérable |
| Onde de choc à chaque coup | l.543-554 : tirs proches effacés, ennemis repoussés et calmés 0,7 s, lasers annulés | le coup suivant est presque impossible pendant 2 s |
| Tête minuscule | `R_TETE = 2` : 4 px de zone qui tue pour un sprite de 13 (l.64) | conforme à G-15, mais cumulé à tout le reste |
| Ennemis plus lents que le serpent | flèche à 32 → 46 px/s (l.790) contre 64 px/s pour le serpent (l.60) | on distance tout ce qui chasse |
| Charges rares | charges seulement après 25 s, deux à la fois au plus (l.797) | 1 coup avant 60 s sur 20 parties |

### 2.4 La puissance fait boule de neige

- La longueur augmente le nombre de canons : 1, puis 2, puis 3, puis 5 (l.519-523). Elle augmente
  aussi le multiplicateur de score, jusqu'à ×8 (l.472), et la surface du bouclier (l.946).
- Le `bon` atteint la longueur maximale de 64 segments **à 50 s dans 10 parties sur 10**. La croissance
  ne sert donc plus à rien pendant les 70 dernières secondes.
- L'énergie est surabondante : chaque kill en lâche 1 ou 2 (l.917), le colosse 24 (l.767), et une
  cellule libre tombe toutes les 2,6 s (l.676). Les captures `C1-…-65s.png` et `C1-…-117s.png`
  montrent plus de 40 cellules ambrées à l'écran, que plus personne n'a besoin de ramasser.
- Un serpent de 64 segments mesure 320 px dans une arène de 408 px de large. Comme il ne se mord pas,
  plus il est long, plus il est protégé. C'est l'inverse du genre : dans Snake, la longueur est le
  danger.

### 2.5 Le rythme des deux minutes

| tranche | ennemis vivants (`bon`, moyenne) | coups reçus (`bon` + `kamikaze`, 20 parties) |
|---|---|---|
| 0-20 s | 2,7 | 0 |
| 20-40 s | 5,4 | 1 |
| 40-60 s | 8,0 | 0 |
| 60-80 s | 15,2 | 8 |
| 80-100 s | 20,3 | 20 |
| 100-120 s | 23,6 | 28 |

- La montée est monotone, ce qui respecte le critère 6 de DIRECTION.md. Mais elle bascule d'un
  coup à 60 s, quand la cible d'ennemis double (`cible()`, l.652-656). Ce n'est pas une montée,
  c'est une marche d'escalier.
- La vitesse du serpent ne bouge pas (64 px/s du début à la fin) et la vitesse de virage non plus.
  Rien ne s'accélère sous les doigts.
- Temps calme :
  - à la première partie, une joueuse qui ne touche à rien voit **12,4 s sans le moindre ennemi**
    (`enemyStart = 12`, l.437) ;
  - une joueuse qui joue en voit 5,4 s, conforme à J-14 ;
  - le reste de la minute un est pauvre : 2 à 8 ennemis, tous lents, aucun tir avant 22 s (aucune
    mine, tourelle ni sentinelle) ;
  - l'interlude du colosse gèle le jeu 2,4 s à 76 s.
- Il n'y a ni vague, ni nettoyage, ni bonus de vague, ni respiration : un flux continu.

### 2.6 Les commandes au doigt (iPhone 13 paysage, horloge réelle)

| essai | mesure | standard | verdict |
|---|---|---|---|
| Touchers pour jouer, depuis le chargement | **1** | J-13 : 2 au plus | bon |
| Latence toucher → cap visé et début du virage | **1 image** | J-05 : 1 image | bon |
| Quart de tour | 12 à 15 images mesurées ; 266 ms en théorie (`VIRAGE = 5.9` rad/s) | J-06 : 350 ms au plus | bon |
| Lever le doigt | dérive du cap **0,000 rad** en 0,6 s | J-02 | bon |
| Second doigt posé et glissé | cap inchangé, y compris après avoir levé le premier doigt | J-04 | bon |
| Zone morte | 3 px CSS ignorés, 4 px suffisent à tourner : **8 %** du rayon de 44 px (`STICK_MORT = 0.08`, 90-boot.js l.110) | J-03 : 10 à 15 % | mineur |
| Viser un mur | glisse le long du mur sans dégât | retour #4 | défaut |
| Tir au clavier | Espace multiplie la cadence par 1,4 (l.517) ; au doigt, rien d'équivalent | parité | mineur |
| Relance | dissolution 0,28 s, garde 0,45 s, puis un toucher | J-17 : moins d'1 s | bon |

---

## 3. Les défauts, avec preuve, gravité et correction

### D1 — Le serpent ne meurt jamais d'un mur · BLOQUANT

- **Preuve.** `wallSteer` (l.477-495) couche le cap le long du bord dès 22 px (`DZ`, l.70), et
  `clamp` (l.503) empêche toute sortie. Le pilote inerte passe 90 % de sa vie collé au mur sans
  dégât (capture `C2-paysage-inerte-s11-coup1.png`). Le commentaire d'en-tête le revendique, l.14 :
  « elle ne meurt jamais d'un mur ».
- **Pourquoi c'est grave.** Retour n° 4 de la propriétaire, mot pour mot. Depuis Blockade (1976) et
  les motos de Tron (1982), un serpent meurt au contact du mur.
- **Correction.**
  - Supprimer `wallSteer`. Le contact de la tête (rayon `R_TETE`) avec la bordure de l'arène, ou
    du monde quand il défilera, appelle `die('mur')`.
  - Garder l'information sans la protection : quand la tête est à moins de 20 px du bord, le bord
    s'allume en magenta, d'autant plus fort qu'elle approche.
  - Pour que la mort soit juste, ajouter une grâce de 60 ms : un virage commencé dans ces 60 ms
    sauve (même principe que le « coyote time » de Celeste, G-15).

### D2 — Le corps est un bouclier au lieu d'être un danger · BLOQUANT

- **Preuve.**
  - Aucun test tête contre corps dans tout le fichier : `hurt()` n'est appelé que par les ennemis,
    les tirs, les lasers et les mines (l.758, 822, 886, 945, 959).
  - Le corps absorbe les tirs (l.946-951) : 11 à 47 tirs absorbés par partie de `bon`.
  - `C1-…-65s.png` et `C1-…-colosse.png` montrent le serpent qui se croise en boucle.
- **Pourquoi c'est grave.** C'est l'identité même du Snake. Dans Nibbler (Rock-Ola, 1982), la seule
  façon de mourir est de se mordre. Retour n° 4 : « son corps absorbe les tirs ».
- **Correction.**
  - La tête qui touche un segment d'indice 6 ou plus appelle `die('morsure')` (rayon
    `R_TETE + segR(k) - 1`). On ignore les 5 premiers segments pour qu'un virage serré ne tue pas.
  - Un tir ennemi qui touche le corps ne disparaît plus gratuitement : il sectionne la queue à cet
    endroit, et les segments perdus tombent en énergie (même logique que l.556-563). Le corps
    redevient une prise de risque, comme le mille-pattes qu'on découpe dans Centipede.

### D3 — Trois ou quatre vies, deux secondes d'invulnérabilité et une onde de choc : la mort n'arrive jamais vraiment · BLOQUANT

- **Preuve.**
  - `VIES = 3` et `INVUL = 2.0` (l.69).
  - Le défi rend une vie (l.579).
  - À chaque coup, l'onde de choc efface les tirs dans un rayon de 46 px, repousse et calme les
    ennemis 0,7 s et annule les lasers (l.543-554).
  - Résultat : 100 % des morts demandent 3 à 4 coups, et 9 à 18 % du temps se passe invulnérable.
- **Correction.**
  - Contact de la tête = mort, comme dans Robotron et Galaga.
  - Deux vies de réserve au plus, plus une vie bonus à score fixe : 100 000 points, affiché dans le
    HUD (« VIE À 100 000 »). C'est le réglage d'usine des bornes, où une vie bonus tombe à
    10 000 points dans Pac-Man.
  - Une vie perdue fait renaître au centre avec `LEN0` segments et un seul canon, puis 1,0 s
    d'invulnérabilité clignotante, sans onde de choc. Seuls les tirs à moins de 30 px du point de
    renaissance disparaissent.
  - Supprimer le `+1 ♥` du défi et le remplacer par un bonus de score.
  - Ajouter une mise en scène de la mort qui fait peur : gel de 12 images, ralenti 0,3 pendant
    300 ms, son descendant, puis dissolution. La pièce doit coûter.

### D4 — La minute un est sans danger et la première partie commence par 12 s de vide · MAJEUR

- **Preuve.**
  - 1 coup reçu avant 60 s sur 20 parties (`bon` et `kamikaze`).
  - Flèches à 32-46 px/s, plus lentes que le serpent (l.790).
  - Charges interdites avant 25 s (l.797).
  - Minute un composée de flèches puis de mines seulement (l.662).
  - Première partie sans toucher : 12,4 s sans ennemi (l.437).
- **Correction.**
  - Flèches à 50 → 85 px/s, autorisées à charger dès 8 s, jusqu'à 3 charges simultanées après 40 s.
  - Mines dès 15 s, tourelles dès 30 s, sentinelles dès 45 s : un nouveau type toutes les 15 s, qui
    s'annonce comme tel (la nouveauté fait le rythme).
  - Cible d'ennemis en rampe continue, `2 + 24 × (t/120)^1,3`, au lieu de la marche de 60 s.
  - Garder le pouce fantôme de J-14, mais faire venir le premier ennemi 3 s après le premier
    virage, et 6 s au plus si la joueuse ne touche à rien.

### D5 — Une stratégie sans cervelle domine · MAJEUR

- **Preuve.** Le kamikaze gagne 5/10, contre 6/10 pour le `bon`, avec un score médian plus haut
  (489 k contre 436 k). Les tirs portent à 294 px (`V_TIR` 210 × `life` 1,4 s, l.66 et l.529) : tout
  l'écran. Les ennemis meurent avant d'arriver au contact.
- **Correction.** Donner aux ennemis de vraies réponses à l'assaut frontal, comme les quatre
  fantômes de Pac-Man qui ont chacun leur façon de cibler :
  - portée des tirs à 120 px (`life` 0,57 s), pour devoir s'approcher et donc risquer ;
  - tourelles blindées de face : un tir sur leur face avant ricoche, il faut les prendre de côté ;
  - flèches qui esquivent latéralement quand elles sont dans l'axe de la tête à moins de 60 px ;
  - mines qui explosent quand on leur tire dessus à moins de 30 px.

### D6 — La puissance plafonne à 50 s ; l'énergie n'a plus de valeur · MAJEUR

- **Preuve.**
  - Longueur 64 atteinte à 50 s, 10 fois sur 10 (`LENMAX`, l.63).
  - Cinq canons dès 32 segments (l.523).
  - Plus de 40 cellules à l'écran à 65 s et à 117 s (captures `C1`).
- **Correction.**
  - `LENMAX` à 40.
  - Une chance sur trois de lâcher de l'énergie par kill ordinaire au lieu de 1 à 2 cellules ; le
    colosse lâche 8 cellules au lieu de 24.
  - Paliers de canons à 12, 24 et 36 segments.
  - Avec D2, un serpent long devient plus dangereux à piloter : c'est le risque contre la
    récompense du genre.
  - Ajouter l'accélération demandée par J-08 (manche poussé au-delà de 80 %) : vitesse ×1,6, payée
    un segment par seconde.

### D7 — La vitesse ne monte jamais · MAJEUR

- **Preuve.** `V = 64` constant (l.60), `VIRAGE` constant (l.61). Le serpent traverse l'arène en
  6,4 s, à la première seconde comme à la dernière.
- **Pourquoi.** Dans Nibbler, chaque vague nettoyée rend la partie plus rapide ou les obstacles plus
  durs. Dans Pac-Man, Blinky accélère quand il reste peu de pastilles.
- **Correction.**
  - Vitesse de 64 à 92 px/s, en +4 px/s par tranche de 20 s, chaque palier annoncé par un son et
    un trait de grille qui accélère.
  - `VIRAGE` multiplié dans la même proportion, pour garder un rayon de virage d'environ 11 px.

### D8 — Le colosse se tue en 2 à 10 s et n'est pas une condition de victoire · MAJEUR

- **Preuve.**
  - 120 points de vie (l.71) : le kamikaze le détruit en 2,2 à 9,8 s.
  - La purge de 120 s le fait exploser de toute façon (l.1075).
  - La victoire ne dépend que du temps tenu (l.1056).
- **Correction.**
  - Points de vie à 450.
  - Trois phases, à 66 % et à 33 %, chacune avec son motif : radial, puis laser balayant, puis appel
    de renforts et radial double.
  - Un œil vulnérable seulement pendant 1,2 s après chaque attaque ; ailleurs, les tirs ricochent.
  - **La victoire, c'est le colosse détruit.** À 120 s, s'il vit encore, il s'enrage : vitesse ×1,3
    et attaques deux fois plus fréquentes, jusqu'à la mort de l'un ou de l'autre.
  - Garder la purge comme récompense après sa mort.

### D9 — Un seul défi, trop facile, qui rend une vie · MAJEUR

- **Preuve.** DIX KILLS EN CHAÎNE est réussi 10/10 par `bon` (14 à 39 s) et 7/10 par la joueuse
  distraite. C'est le seul défi (l.434), alors que G-21 en demande trois, dont FINIR.
- **Correction.**
  - Trois défis affichés au départ :
    - FINIR, c'est-à-dire détruire le colosse ;
    - CHAÎNE ×25, soit 25 kills sans pause de plus de 1,2 s ;
    - INTOUCHABLE, finir sans perdre de vie (ou COLOSSE EN 30 S).
  - Leur réussite rapporte du score et une médaille, jamais une vie.

### D10 — Ni vagues, ni respiration, ni anti-attentisme · MAJEUR

- **Preuve.** Le directeur (l.657-681) remplit l'écran jusqu'à une cible qui monte. Il n'y a ni fin
  de vague, ni bonus de vague, ni ennemi qui punit l'attente. Avec `canAct` (l.787), un ennemi hors de
  l'écran ne tire pas : rester dans un coin reste sûr.
- **Pourquoi.** Iwatani a fait attaquer les fantômes de Pac-Man par vagues, poursuite puis
  dispersion, pour que la joueuse respire. Dans Defender, les « baiters » plus rapides que le
  vaisseau viennent punir qui traîne. Robotron se joue par vagues à nettoyer.
- **Correction.**
  - Cinq vagues de 20 s, chacune nommée et numérotée (« VAGUE 3/5 »), terminées par 2 s de
    nettoyage avec un bonus de vague compté à l'écran.
  - Puis le colosse comme vague 6.
  - Un chasseur rapide (90 px/s, magenta clignotant) entre si aucun kill n'a eu lieu depuis 6 s.
  - Garder la montée monotone d'une vague à l'autre (critère 6 de DIRECTION.md), le creux tenant
    dans les 2 s de bonus.

### D11 — Rien ne pousse à relancer · MAJEUR

- **Preuve.** L'écran de fin (`drawFinTop`, l.1486-1502, capture `C1-…-g1-fin.png`) affiche le score,
  le record, le défi et TOUCHE POUR REJOUER. Il n'y a :
  - ni cause de la mort ;
  - ni progression (« 87 % — colosse à 40 % ») ;
  - ni écart avec la partie précédente ;
  - ni tableau des meilleurs scores.

  La relance change seulement la graine (`seed + 1`, l.1114).
- **Correction.**
  - Ligne « TUÉ PAR : LASER DE SENTINELLE À 1:34 » (les données existent déjà dans
    `stats.hitLog`).
  - Barre de progression vers le colosse ou de sa vie restante.
  - « +12 400 sur ta dernière partie ».
  - Tableau des dix meilleurs scores avec trois initiales à saisir au manche, à la manière des
    bornes de 1981.
  - Défis du jour à graine datée (G-09).

### D12 — L'arène est l'écran : pas de monde, pas de caméra · MAJEUR (pour la jouabilité)

- **Preuve.** Commentaire l.12 : « L'ARÈNE EST L'ÉCRAN. Pas de caméra ». Le retour n° 3 demande un
  monde plus grand que l'écran.
- **Correction côté jouabilité, à concevoir avec la refonte du défilement.**
  - Monde d'environ 2,5 × 2 écrans, caméra en avance de 20 % sur le cap.
  - Mur mortel en bordure du monde (D1), visible au moins 1,5 s avant le contact à vitesse maximale.
  - Ennemis hors champ signalés au bord de l'écran, ce que `drawEdgeTicks` fait déjà.
  - Interdiction de tirer pour un ennemi hors champ (`canAct`), à garder.

### D13 — Zone morte du manche à 8 % · MINEUR

- **Preuve.** `STICK_MORT = 0.08` (90-boot.js l.110) ; tourner suffit à partir de 4 px CSS. J-03
  demande 10 à 15 %.
- **Correction.** 0,12, soit environ 5 px. À valider au doigt sur un vrai iPhone.

### D14 — Espace donne +40 % de cadence au clavier, sans équivalent au doigt · MINEUR

- **Preuve.** l.517.
- **Correction.** Supprimer ce bonus (le tir est automatique partout), ou en faire l'accélération
  de D6 au clavier, Espace ↔ poussée du manche au-delà de 80 %.

### D15 — Le colosse gèle le jeu 2,4 s en plein élan · MINEUR

- **Preuve.** `transition('boss')` à 76 s ; le colosse arrive à 78,4 s.
- **Correction.** Le garder, mais faire porter l'alerte par les 2 s de nettoyage de la vague 5
  (D10), pour que le gel tombe dans une respiration et non au milieu d'une chaîne.

---

## 4. Ce qui est bon et doit être gardé

- **Le manche flottant** de 90-boot.js : une image de latence, cap gardé au relâcher (dérive 0), doigt
  propriétaire par `identifier`, origine qui suit au-delà du rayon. C'est l'état de l'art (J-01 à
  J-05).
- **Le virage libre et franc** : 266 ms le quart de tour, jamais différé à un nœud, avec le chevron
  du cap visé (J-33). C'est exactement la correction du défaut bloquant de snake2030 (700 ms sur les
  rails).
- **Les télégraphes** : flèche 0,6 s, tourelle 0,65 s, mine 0,75 s, sentinelle 0,85 s, colosse 0,9 à
  2,4 s. Ils sont dessinés à l'endroit exact des dégâts, gainés de nuit profonde, et aucun ennemi ne
  naît dans le champ ni à moins de 70-80 px (l.601, l.636). **À garder tels quels quand la mort
  deviendra immédiate** : c'est ce qui la rendra juste.
- **`canAct`** : un ennemi hors de l'écran n'attaque pas (l.787).
- **Le tir automatique vers l'avant** et **J-11** : l'inerte fait 1 780 points contre 435 680 pour le
  `bon`, soit 0,4 %.
- **Le pouce fantôme** qui s'efface au premier virage, avec les flèches du clavier au bureau. Un seul
  toucher pour jouer.
- **La relance** en moins d'une seconde avec garde de 0,45 s (J-17), et la pause automatique.
- **Les retours de jeu** : chaîne de kills montante (`pitch`), gel d'image proportionné, score
  flottant, jauge de chaîne qui se vide sous le défi.
- **Les quatre types d'ennemis**, aux comportements vraiment distincts (chasse, pose, tir visé,
  orbite et laser).
- **Le portrait** : le quart bas est laissé au pouce et rien n'y naît (capture `C3-…-90s.png`).
- **Zéro erreur** sur 72 parties et trois profils.

---

## 5. La quintessence des hits des années 1980, appliquée à SNAKE 2975

Ce que les bornes qui ont avalé des milliards de pièces ont en commun, et ce que la démo en fait :

| principe | exemple d'époque | la démo aujourd'hui | à faire |
|---|---|---|---|
| **Un contact, une vie.** La mort est immédiate et lisible ; la réserve de vies se voit et se gagne au score. | Robotron : tout contact coûte une vie, vies bonus au score. Galaga, Pac-Man. | 3 ou 4 coups, 2 s d'invulnérabilité, onde de choc | D3 |
| **Le serpent meurt de lui-même et des murs.** | Blockade (1976) et Tron (1982) : mur et traînée tuent. Nibbler (1982) : se mordre est la seule mort. | ni l'un ni l'autre | D1, D2 |
| **Ça accélère.** | Nibbler : chaque vague plus rapide. Blinky en « Cruise Elroy » dans Pac-Man. | vitesse constante | D7 |
| **Vagues et respirations.** | Pac-Man : poursuite et dispersion en alternance, voulues par Iwatani. Galaga : étape bonus à la 3e vague puis toutes les 4. Robotron : vagues à nettoyer. | flux continu, marche à 60 s | D10 |
| **Le risque paie.** | Galaga : se faire capturer pour un double vaisseau à la zone de contact plus grande. Robotron : humains sauvés pour 1 000 puis jusqu'à 5 000 points, série remise à zéro à la mort. Pac-Man : la super-pastille et ses 200-400-800-1 600. | grandir n'a que des avantages | D2, D6 (accélération payée en segments, corps long dangereux) |
| **On punit l'attente.** | Defender : les baiters arrivent si l'on traîne. | le coin reste sûr | D10 |
| **Des ennemis qui pensent différemment.** | Les quatre fantômes de Pac-Man. | quatre types distincts, mais tous battus par l'assaut frontal | D5 |
| **Facile à prendre, dur à maîtriser.** « Récompenser la première pièce et la centième » (Bushnell). | Pong, Asteroids. | facile à prendre, aucun plafond de maîtrise | D3 à D9 |
| **Le score comme horizon.** | Nibbler : 9 chiffres, et le milliard de Tim McVey en 1984. Initiales au tableau des scores. | record seul, sans initiales ni écart | D11 |

**En une phrase.** Une bonne borne des années 80 tue vite, juste et souvent, accélère, alterne les
coups de pression et les répits, et paie toujours le risque pris : la démo protège, garde le même
pas, déverse l'écran et paie l'assaut sans cervelle.

Sources (lues par extraits de moteur de recherche) :

- [Robotron: 2084, Wikipédia](https://en.wikipedia.org/wiki/Robotron:_2084)
- [Robotron: 2084, StrategyWiki](https://strategywiki.org/wiki/Robotron:_2084)
- [Galaga, Wikipédia](https://en.wikipedia.org/wiki/Galaga)
- [Nibbler, Wikipédia](https://en.wikipedia.org/wiki/Nibbler_(video_game))
- [Nibbler, StrategyWiki](https://strategywiki.org/wiki/Nibbler)
- [Nibbler: The Billion Point Arcade Game, Arcade Blogger](https://arcadeblogger.com/2016/07/01/nibbler-the-billion-point-arcade-game/)
- [Snake (genre), Wikipédia](https://en.wikipedia.org/wiki/Snake_(video_game_genre))
- [Defender, Codex Gamicus](https://gamicus.fandom.com/wiki/Defender)
- [Pac-Man, JavaScript-PacMan 3D (modes des fantômes)](https://www.masswerk.at/JavaPac/JS-PacMan3D-features.html)
- [Comment les fantômes de Pac-Man choisissent leur chemin, Today I Found Out](https://www.todayifoundout.com/?p=43455)
- [Bushnell's Law, Wikipédia](https://en.wikipedia.org/wiki/Bushnell%27s_Law)

Pour la vie bonus à 10 000 points de Pac-Man, je n'ai pas lu de source pendant cet audit : la valeur
est à vérifier.

---

## 6. Les 10 corrections prioritaires, classées

1. **Mort au mur** (D1). Supprimer `wallSteer`, `die('mur')`, bord qui s'allume à moins de 20 px,
   grâce de 60 ms.
2. **Mort par morsure ; le corps n'absorbe plus les tirs, il est sectionné** (D2).
3. **Contact = mort.** Deux vies de réserve au plus, vie bonus à 100 000 points, renaissance à `LEN0`
   avec 1 s de clignotement sans onde de choc, plus de `+1 ♥` au défi, mise en scène de mort qui fait
   peur (D3).
4. **Le colosse devient la condition de victoire** : 450 points de vie, trois phases, œil vulnérable
   seulement après ses attaques, enragé après 120 s (D8).
5. **Minute un dangereuse** : flèches à 50-85 px/s qui chargent dès 8 s, un nouveau type toutes les
   15 s, cible en rampe continue sans marche à 60 s (D4).
6. **Vitesse croissante** de 64 à 92 px/s par paliers annoncés, virage proportionnel (D7).
7. **Casser la stratégie kamikaze** : portée de tir de 120 px, tourelles blindées de face, flèches qui
   esquivent dans l'axe (D5).
8. **Rareté et risque de la longueur** : `LENMAX` 40, énergie divisée par trois environ, accélération
   au manche payée en segments (D6).
9. **Vagues et anti-attentisme** : cinq vagues nommées avec bonus de nettoyage, chasseur après 6 s
   sans kill, alerte du colosse dans la respiration (D10, D15).
10. **Trois défis et un écran de fin qui fait relancer** : FINIR, CHAÎNE ×25, INTOUCHABLE ; cause de
    la mort, progression, écart avec la dernière partie, initiales au tableau (D9, D11).

**Ce que je mesurerai à la contre-expertise :**

- le pilote `kamikaze` gagne au plus 1 fois sur 10 ;
- le pilote `bon` gagne 3 à 6 fois sur 10 ;
- au moins un coup reçu en minute un dans la moitié des parties de `bon` ;
- un pilote qui va tout droit meurt au mur en moins de 8 s ;
- la longueur maximale n'est jamais atteinte avant 90 s ;
- le colosse vit au moins 25 s face au kamikaze.
