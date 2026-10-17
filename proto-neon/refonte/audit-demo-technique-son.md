# Audit indépendant de la démo SNAKE 2975 : technique et son

Audit du 17 octobre 2026, fait sur le bundle `proto-neon/index.html` (17/10, 16 h 39) servi sur
http://127.0.0.1:8112/proto-neon/index.html. L'auditeur n'a rien construit et ne s'appuie sur aucun
rapport des constructeurs. Tout ce qui suit a été mesuré dans le navigateur ou lu dans le code, avec le
numéro de ligne.

Les retours de la propriétaire font autorité (`refonte/RETOURS-PROPRIETAIRE.md`). Ce domaine répond :
- au point 1, « triste » : la musique et les sons y sont pour beaucoup ;
- au point 3, monde plus grand que l'écran, caméra et parallaxe : c'est une question d'architecture ;
- au point 4, « il faut pouvoir mourir » : c'est une question d'architecture et de son.

## Comment l'audit a été mené

**Quatre parties complètes ont été jouées en temps réel** avec le vrai `requestAnimationFrame` (pas la
boucle accélérée des bancs). Le pilote est le pilote « expert » de `tools/jeu/pilote.js`, graine 7.
Chaque appel de module est chronométré, et les métriques CDP sont relevées toutes les secondes.

| profil | tampon | px | images | résultat |
|---|---|---|---|---|
| iPhone 13 paysage, 844 × 390 | 422 × 195 | 2 | 8 015 | victoire, 289 kills, **1 seul dégât** |
| iPhone 13 paysage, processeur ralenti ×4 | 422 × 195 | 2 | 5 674 | victoire, 2 dégâts |
| iPhone 13 portrait, 390 × 844 | 195 × 422 | 2 | 8 052 | victoire, 3 dégâts |
| bureau, 1440 × 900 | 360 × 225 | 4 | 7 834 | victoire, 3 dégâts |

**Le son a été rendu hors ligne** avec le moteur même du jeu (`N.music.renderOffline`) :
- 150 s, à la tension exacte de `70-game.js` ;
- environ 1 100 événements sonores réalistes ;
- trois rendus : mixage complet, musique seule, sons seuls ;
- puis spectre par FFT, niveaux RMS, et une simulation de haut-parleur de téléphone (passe-haut 350 Hz,
  2ᵉ ordre).

Deux extraits de 20 s sont à écouter : `captures/audit-technique-son/extrait-calme-14-34s.wav` et
`extrait-chaos-110-130s.wav`.

**La robustesse a été éprouvée** : coupure du son, suspension du contexte audio (comme un appel sur
iPhone), rotation en pleine partie, et une partie sans rien toucher jusqu'à la mort.

**Les captures** sont dans `refonte/captures/audit-technique-son/`. Elles ont été regardées, et elles
servent de preuves ci-dessous.

**Une réserve sur les mesures** : d'autres auditeurs lançaient Playwright sur la même machine (4 cœurs)
pendant ces mesures. Les temps sont donc pessimistes, pas flatteurs.

---

## Note : 4,5 / 10

| partie | note | en une phrase |
|---|---|---|
| Robustesse | 8,5 | Zéro erreur partout, cycle de vie audio solide, mémoire stable. |
| Performance iPhone | 7 | 60 i/s tenues (p95 9,4 ms), mais le tube cathodique prend 75 % de l'image et ne laisse que peu de marge pour la parallaxe. |
| Sons d'information | 5 | Bien pensés contre l'agacement (fusion, plafond, usure, gamme commune), mais ils ne claquent pas, sont mixés trop bas, et plusieurs événements partagent le même son. |
| Musique | 3 | Techniquement propre et non répétitive, mais sombre, sourde sur un téléphone, sans mélodie pendant 80 s et sans refrain. C'est le contraire d'un tube des années 80. |
| Architecture face à la refonte | 3 | Elle est bâtie sur « l'arène, c'est l'écran » et sur « on ne meurt pas ». Les deux demandes de la propriétaire en sont la négation exacte. |

**Justification.** Le moteur est sain : aucune exception sur quatre profils, 60 images par seconde sur
iPhone, un ordonnancement audio exemplaire. Mais la démo échoue là où la propriétaire regarde et écoute.

- **La musique est littéralement triste.**
  - Elle est en la mineur, filtrée sous 1 kHz.
  - 74,5 % de son énergie au calme est sous 200 Hz, là où un haut-parleur d'iPhone ne rend rien.
  - Aucune mélodie n'arrive avant 1 min 20 de jeu.
  - Aucun motif ne revient jamais, par construction.
- **L'architecture ne permet ni la caméra ni la vraie mort sans chantier.**
  - 41 tests de bornes de `70-game.js` et `50-fx.js` prennent le tampon écran (`W`, `H`) pour les
    limites du monde.
  - Une rotation de l'iPhone fait tourner le monde.
  - Cinq mécanismes empilés empêchent de mourir.

---

## 1. Ce que les tubes des années 80 font, et que la démo ne fait pas

La recherche du dépôt (`refonte/quintessence-80s-audiovisuel.md`, § 1.9 à 1.11 et principes 8, 12 et 13)
couvre les bornes d'arcade. Ce qui suit la complète avec les tubes pop et synthé de la décennie, dont la
synthwave descend directement. **Les tempos sont donnés de mémoire et sont approximatifs** ; c'est leur
ordre de grandeur qui compte.

| tube | tempo ≈ | ce qui le fait tenir |
|---|---|---|
| Axel F, Harold Faltermeyer, 1984 | 118 | Le thème au synthé est énoncé dès la première mesure, en question-réponse, puis rejoué tel quel tout le morceau. |
| Take On Me, a-ha, 1985 | 169 | Le riff de synthé brillant de l'intro est le morceau ; il revient à chaque refrain. |
| Blue Monday, New Order, 1983 | 130 | Une basse de séquenceur en doubles croches et une boîte à rythmes qui ne s'arrête jamais : la pulsation est l'énergie. |
| Sweet Dreams, Eurythmics, 1983 | 126 | Un ostinato de basse synthé, une seule phrase de deux mesures répétée tout le morceau, en mineur et pourtant entraînant. |
| Jump, Van Halen, 1984 | 130 | Des accords de cuivres synthétiques plaqués en staccato, dans un registre brillant. |
| The Final Countdown, Europe, 1986 | 118 | Une fanfare de synthé en mineur : un riff de six notes qu'on fredonne, joué haut. |
| In the Air Tonight, Phil Collins, 1981 | 96 | La caisse claire à réverbération coupée (« gated reverb »), le son de batterie de toute la décennie. |
| Billie Jean, Michael Jackson, 1982 | 117 | Une ligne de basse ostinato et une batterie sèche, immuables : la transe vient de la répétition. |

**La quintessence musicale tient en six traits.**

1. **Un motif qu'on fredonne, énoncé tout de suite et répété tel quel.** Les tubes répètent leur
   accroche dix à vingt fois. La variété vient de l'arrangement autour d'elle, pas de ses notes.
2. **Un ostinato de basse en croches ou en doubles croches.** C'est le moteur physique du morceau.
3. **Une grosse caisse et une caisse claire énormes**, la caisse claire en réverbération coupée sur les
   temps 2 et 4.
4. **Des timbres brillants** : cuivres synthétiques, cloches FM du DX7, leads de 600 Hz à 2 kHz dont les
   harmoniques montent à 5 kHz. Le mineur y sonne héroïque, pas triste, parce qu'il est joué haut et
   fort.
5. **Des sections** (intro, couplet, refrain, pont, retour) **et une modulation voulue**, toujours vers le
   haut, au dernier refrain.
6. **Un tempo stable, qui change par paliers** : le corps doit sentir que le monde accélère.

**La démo prend le contre-pied de chacun de ces traits.**

| trait des tubes | dans `30-music.js` | preuve |
|---|---|---|
| motif dès le début, répété | aucune mélodie avant la tension 0,68, soit **83,6 s de jeu mesurées** ; ensuite, des arpèges recombinés au hasard qui ne reviennent jamais | l. 687 `onLead = tSmooth >= 0.68` ; relevé `layers: 4` à t = 83,6 s ; 76 mesures rendues, **76 empreintes distinctes** |
| ostinato de basse qui pousse | bonne idée, mais les notes sont entre A1 et G#2 (55 à 104 Hz), filtrées vers 200 Hz : **inaudibles sur un haut-parleur de téléphone** | l. 365-377 ; spectre ci-dessous |
| batterie énorme | grosse caisse en sinus de 132 à 43 Hz (inaudible sur téléphone, il n'en reste qu'un clic de 12 ms), caisse claire sans réverbération coupée | l. 381-405 |
| timbres brillants | lead « jamais d'octave au-dessus », filtré de 3 kHz à 1,1 kHz ; nappe filtrée à 900 Hz, Q 2,6 | l. 189, 447-448, 317 |
| sections et modulation voulue | aucune section ; une transposition **tirée au hasard** toutes les 16 mesures parmi 0, +5, +3, −2, +7, donc parfois vers le bas | l. 133, 660 |
| tempo par paliers | tempo recalculé à chaque mesure sur une tension continue (113,0 → 113,4 → 115,8…) : une dérive qu'on ne sent pas | l. 682-684 ; relevés `bpm` |

---

## 2. Les mesures du son

### 2.1 Le spectre : une musique sourde

FFT de 4096 points, fenêtre de Hann. La musique seule est rendue au calme (14 à 30 s) et au chaos
(115 à 131 s). Chaque case donne la part de l'énergie dans la bande.

| bande | musique, calme | musique, chaos | sons seuls |
|---|---|---|---|
| 20-100 Hz | **59,6 %** | **49,6 %** | 12,0 % |
| 100-200 Hz | 14,9 % | 31,5 % | 8,1 % |
| 200-400 Hz | 10,6 % | 8,0 % | 22,3 % |
| 400-1000 Hz | 10,4 % | 5,3 % | 45,4 % |
| 1-2,5 kHz | 4,1 % | 3,9 % | 11,3 % |
| 2,5-5 kHz | **0,0 %** | 1,3 % | 0,8 % |
| > 5 kHz | 0,0 % | 0,4 % | 0,1 % |
| **centroïde spectral** | **223 Hz** | **267 Hz** | 557 Hz |

Un morceau synthpop des années 80 a son centroïde vers 1,5 à 3 kHz. Ici il est à 223 Hz : c'est le
spectre d'une musique entendue à travers un mur. Cette sourdine est une décision écrite, pas un
accident. Le commentaire de la l. 189 dit « le lead reste sous 2 kHz » et celui de la l. 433 dit « plus
de carré : ses harmoniques impaires piquaient entre 2 et 5 kHz ». On a soigné le « pas agaçant » en
retirant la lumière, et le résultat est « triste ».

### 2.2 Le niveau, et ce qu'en rend un haut-parleur d'iPhone

Niveaux RMS en dBFS sur 10 s, mixage complet. « Téléphone » est la simulation d'un petit haut-parleur
(passe-haut à 350 Hz).

| fenêtre | musique, pleine bande | musique, « téléphone » | sons, pleine bande | sons, « téléphone » |
|---|---|---|---|---|
| calme, 14-30 s | −24,4 | **−31,9** | −29,6 | −31,3 |
| milieu, 50-70 s | −20,3 | −28,5 | −28,0 | −29,1 |
| chaos, 115-131 s | −16,9 | −25,5 | −27,9 | −28,5 |

- **Le calme est très bas.** −24,6 dBFS RMS en pleine bande et environ −32 dBFS sur un téléphone, soit
  15 à 20 dB sous un jeu mobile ordinaire, qui vise −16 à −14 LUFS. La joueuse monte le volume, puis la
  montée en tension l'agresse : la musique gagne +8,5 dB entre le calme et le chaos.
- **Le téléphone retire 7,5 à 8,6 dB à la musique**, et presque rien aux sons. Ils sont dans les médiums,
  ce qui est bien.
- **Au chaos, les sons sont 11 dB sous la musique** en pleine bande (−27,9 contre −16,9), et encore 3 dB
  dessous sur téléphone. Un kill ne claque pas : l'esquive du kill ne baisse la musique que de 10 %
  (`duckKill: 0.10`, l. 87).
- La crête atteint −1 dBFS au bigkill. Le genou doux tient, sans écrêtage. C'est bien.

### 2.3 La répétition, et le critère 5 de DIRECTION.md

- Sur 150 s, la corrélation maximale entre deux fenêtres de 4 s de l'enveloppe RMS est de **0,81**.
  Aucune fenêtre n'est identique à 1 % près : **le critère 5 est tenu largement**.
- Mais **les 76 mesures rendues sont toutes différentes.** La règle d'or est appliquée à chaque choix
  élémentaire : `pick()`, l. 617, s'applique à 15 poches indépendantes. Rien ne peut donc revenir, et
  aucun motif ne s'imprime dans la mémoire. Un tube fait exactement l'inverse.

### 2.4 Ce que la joueuse entend en jeu

Partie réelle sur iPhone paysage, journal de `N.music.journal()`.

| son | appels | joués | remarque |
|---|---|---|---|
| tir | 955 | 955 | 8 par seconde pendant 2 min. Discret (triangle filtré à 1,7 kHz), il ne gêne pas, mais il n'a aucune personnalité. |
| kill | 288 | 259 | Il monte d'un degré de pentatonique par palier de chaîne : excellente idée, mais il est trop bas dans le mixage. |
| butin | 265 | 234 | Un tintement dans la gamme. Bien. |
| bigkill | 1 | 1 | **Le même son** sert à la mort de la joueuse (l. 571), à celle du colosse (l. 763, l. 1075) et à la fin du son d'intro. |
| degat | 1 | 1 | **Le même son**, joué deux fois, sert au « défi raté » (l. 586-587). |
| tir dans l'ouverture | — | — | Le « bip » du texte tapé est le son de tir (`60-intro.js` l. 561). |

**Il n'y a aucun son de mort**, aucun jingle de fin, aucune voix, aucune alerte. Et la musique **ne réagit
pas à la mort**. Dans la partie sans rien toucher, 1,5 s après la mort, elle joue toujours (`running`,
2 couches, 113,9 BPM) ; elle est seulement retombée à la tension 0,12 de l'écran de fin. Captures :
`mort-inerte-instant.png`, `mort-inerte-fin.png`.

---

## 3. Les mesures de performance et de robustesse

### 3.1 Coût d'image

Durée du rappel de `requestAnimationFrame`, en ms, pendant le jeu (ouverture exclue). « Trous » compte
les intervalles entre images de plus de 20 ms.

| profil | p50 | p95 | p99 | max | dont `crt.apply` p50 / p95 | trous > 20 ms |
|---|---|---|---|---|---|---|
| iPhone paysage | 4,9 | **9,4** | 12,9 | 563 (une seule image) | **3,7 / 7,7** | 34 sur 8 014 (0,4 %) |
| iPhone paysage, CPU ×4 | 15,4 | **26,1** | 33,8 | 69,6 | **11,6 / 20,0** | 2 402 sur 5 673 (42 %) |
| iPhone portrait | 4,2 | 7,4 | 9,7 | 38,2 | 3,2 / 5,8 | 41 sur 8 051 |
| bureau, px 4 | 8,5 | **13,7** | 15,6 | 52,7 | **7,5 / 12,4** | 335 sur 7 834 (4,3 %) |

Le reste du travail est presque gratuit. Sur iPhone paysage, au p95 :

| module | p95 |
|---|---|
| `game.update` | 0,6 ms |
| `game.draw` | 0,6 ms |
| `game.drawTop` | 0,5 ms |
| `fx.draw` | 0,3 ms |
| `gfx.present` | 0,6 ms |
| `music.tension` | 0,2 ms |

**Le post-traitement cathodique, à lui seul, coûte 75 % de l'image.** Sur iPhone à la vitesse réelle,
c'est tenu. Mais :
- la parallaxe demandée ajoutera 0,5 à 1 million de pixels de tampon par image (estimation de
  `quintessence-80s-audiovisuel.md` § 4.8) ;
- un iPhone plus ancien ou en mode économie d'énergie se rapproche du profil ×4, qui décroche déjà
  (p95 de 26 ms, 42 % d'images en retard) ;
- la marge est donc faible.

Le pic de 563 ms est apparu une seule fois, dans `crt.apply`. C'est probablement une réallocation au
premier passage après redimensionnement, mais son origine n'est pas établie.

### 3.2 Mémoire et audio

- **Tas JS** : stable, de 3 à 9 Mo sur toute la partie. Aucune fuite.
- **Nœuds audio** : la partie complète en crée 16 644 (6 933 gains, 3 877 oscillateurs, 3 861 filtres,
  1 973 sources de bruit), soit **environ 120 par seconde**. Chrome encaisse. Safari sur iPhone le fait
  aussi, mais au prix d'un ramasse-miettes audio plus fréquent : à surveiller quand le nombre de voix
  augmentera.
- **Initialisation de l'audio dans le geste** : 31 ms à la vitesse réelle, 60 ms à ×4. C'est un à-coup
  de deux à quatre images au premier toucher. Le constat est déjà noté dans `REPRISE.md` (étape 2) et
  n'a pas été corrigé.

### 3.3 Robustesse

| essai | résultat |
|---|---|
| Erreurs JS et console, 4 profils, plus l'essai de mort | **0** (`__ERR.count = 0`, console vide) |
| Coupure du son | sortie à 0 aussitôt, retour à −30 dBFS RMS en moins de 0,8 s |
| Contexte audio suspendu de force (un appel sur iPhone) | relancé seul par `pump()` en moins de 0,5 s |
| Rotation paysage → portrait en pleine partie | tampon 195 × 422, partie en pause, 0 erreur (`robustesse-rotation-pause.png`) |
| Bureau, partie lancée au clic de souris | **impossible** : le clic lance le son mais pas la partie, car `S.input.any` n'est levé que par une touche ou un toucher (`90-boot.js` l. 96 et 122). L'invite dit « ESPACE POUR JOUER », donc ce n'est pas bloquant, mais une souris seule reste coincée. |

---

## 4. Les défauts, avec leur preuve, leur gravité et la correction

### Bloquants : la refonte ne peut pas se faire sans les traiter

**B1. L'arène est l'écran. Le code n'a aucune notion de monde ni de caméra.**

*La preuve.*
- L'entête de `70-game.js` le dit : « L'ARÈNE EST L'ÉCRAN. Pas de caméra » (l. 11-15).
- `geom()` (l. 337) tire les bornes du monde `AL, AR, AT, AB` de la zone sûre de l'écran.
- `sizeUp()` (l. 354-396) **fait tourner le monde d'un quart de tour** quand l'iPhone tourne.
- `spawnPoint()` (l. 592) fait naître hors du tampon.
- `inside()` (l. 131), le rappel des ennemis (l. 882), l'élimination des tirs (l. 925 et 941) et
  `drawEdgeTicks()` (l. 1343) testent tous `W` et `H`.
- `50-fx.js` tue ses particules hors de `W ± 24` (l. 544).
- Au total, **41 tests de bornes** dans `70-game.js` et `50-fx.js` prennent l'écran pour le monde.
- `drawBG()` (l. 1207) pré-rend une seule image de la taille de l'écran.

*La correction.* Elle est décrite au § 5. En résumé :
- un monde en coordonnées propres, indépendant de l'écran et de l'orientation ;
- un module caméra ;
- une origine de dessin dans `N.gfx` ;
- un module de décor en plans.

**B2. Mourir est quasiment impossible, par cinq mécanismes empilés.**

*La preuve.*
- Le pilote expert, un simple champ de potentiel, gagne avec **1 dégât sur 2 minutes et 289 kills**.
  En portrait, il en prend 3 et gagne aussi.
- Une joueuse qui ne touche à rien survit **34,6 s**. Le serpent longe le mur au lieu d'y mourir
  (`mort-inerte-instant.png` : la tête est collée au bord droit).

*Les cinq mécanismes, dans le code.*

| mécanisme | où |
|---|---|
| le cap glisse le long du mur, jamais de mort au mur | `wallSteer()` l. 478, `DZ = 22` l. 70, `clamp` l. 503 |
| le corps absorbe les tirs ennemis | l. 946-951 |
| trois vies et deux secondes d'invulnérabilité | `VIES = 3, INVUL = 2.0`, l. 69 |
| l'onde de choc d'un dégât éteint les tirs à 46 px et repousse les ennemis à 44 px | l. 543-551 |
| la queue sert de bouclier | `lost`, l. 556 |

Il n'y a **aucune collision de la tête avec son propre corps**. Le serpent se croise librement
(`portrait-t100.png`).

La mort elle-même dure 0,28 s (`MORT_D`, l. 72) :
- elle n'a pas de son propre (`bigkill`, l. 571) ;
- elle n'a pas de réaction musicale ;
- elle ne garde aucune trace de sa cause.

*La correction.* Elle est décrite au § 6 : un automate de vie et de mort, une cause de mort publiée,
des collisions mortelles configurables, et une séquence de mort audio et vidéo.

**B3. La musique est sombre, sans mélodie pendant 80 s et sans refrain : elle rend le jeu triste.**

*La preuve.* §§ 1 et 2 :
- centroïde de 223 Hz ;
- 74,5 % de l'énergie sous 200 Hz au calme ;
- 0 % au-dessus de 2,5 kHz ;
- le lead seulement à partir de 83,6 s de jeu ;
- 76 mesures sur 76 toutes différentes.

*La correction.* Elle est décrite au § 7 : le refrain, un lead dès la première mesure, l'éclairage du
spectre, la batterie des années 80, et des sections au lieu d'un fader.

### Majeurs

**M1. Le mixage n'est pas fait pour le haut-parleur d'un téléphone.** C'est pourtant l'appareil n° 1 de
la propriétaire, qui joue en mode silencieux avec le son forcé.

*La preuve.* La musique perd 7,5 à 8,6 dB sur un téléphone, et elle est à −32 dBFS RMS au calme (§ 2.2).
Les composantes en cause :

| composante | fréquence | ligne |
|---|---|---|
| basse | A1-G#2, de 55 à 104 Hz | l. 627 |
| grosse caisse | de 132 à 43 Hz | l. 383 |
| sub du bigkill | de 118 à 30 Hz | l. 519 |

*La correction.*
- **Basse** : jouer la basse une octave plus haut (A2-G#3) quand la tension est basse. Ou garder la
  fondamentale, mais ajouter une saturation douce (WaveShaper, tanh × 3) avant le filtre, ce qui crée
  les harmoniques de 200 à 800 Hz que le téléphone rend. Ouvrir aussi le plancher du filtre de basse à
  350 Hz.
- **Grosse caisse** : ajouter un « punch » de 150 à 180 Hz sur 40 ms, et un clic de 3 à 4 kHz.
- **Niveau** : remonter le calme à −18 dBFS RMS et le chaos à −14 dBFS, avec le genou existant. La
  montée garde 4 à 5 dB d'écart, pas 8,5.

**M2. Les sons ne claquent pas.**

*La preuve.*
- Au chaos, les sons sont 11 dB sous la musique (§ 2.2).
- L'esquive d'un kill vaut 10 %, l. 87.

*La correction.*
- Viser les sons de 3 à 6 dB **au-dessus** de la musique pour kill et dégât.
- Porter `duckKill` à 0,30, avec un relâchement de 120 ms.
- Ajouter à `kill` une queue de réverbération courte et un « crunch » de bruit en passe-bande à 2,5 kHz
  sur 30 ms.
- Garder `tir` discret.

**M3. Des sons partagés par plusieurs événements : aucun son n'est une signature.**

*La preuve* (§ 2.4) :
- `bigkill` sert à la mort, au colosse et à l'intro ;
- `degat` sert au défi raté ;
- `tir` sert au bip du texte.

*La correction.* Créer des sons propres :

| son | ce qu'il joue |
|---|---|
| `mort` | coupure de la musique, puis glissando carré descendant d'une octave et demie sur 0,9 s, à la manière de Pac-Man |
| `gameover` | jingle de quatre notes calé sur la mesure |
| `colosse_mort` | bigkill rallongé, avec une cadence majeure |
| `defi_rate` | deux notes descendantes en mineur |
| `bip` | carré à 12,5 %, 30 ms, pour le texte |
| `alerte` | sirène sur deux notes, pour le télégraphe d'une menace hors champ, indispensable dès que le monde dépasse l'écran |
| `frole` | un battement de cœur quand la tête frôle un mur ou un ennemi, voir le principe 8 de la quintessence |

**M4. Une tonalité et un tempo sans intention.**

*La preuve.*
- `KEYS = [0,0,0,5,3,-2,7]` est tiré au hasard toutes les 16 mesures, donc parfois vers le bas
  (l. 133 et 660).
- Le tempo est recalculé à chaque mesure sur une tension continue : 113,0, 113,4, 115,8, 119, 122, 124,
  127 BPM au fil des relevés. C'est une dérive imperceptible.

*La correction.*
- **Tonalité** : la fixer pour toute la partie, puis moduler vers le haut, de +2 demi-tons, à des
  instants voulus : l'arrivée du colosse, le dernier refrain.
- **Tempo** : le faire changer par paliers attachés aux sections, par exemple 112, 120, 128 et 140 BPM.
  C'est l'idée des 108 à 144 BPM proposés par la quintessence, au principe 8.

**M5. Le tube cathodique mange 75 % du budget, et la parallaxe va en demander.**

*La preuve* (§ 3.1) : `crt.apply` coûte 3,7 ms au p50 sur iPhone, 7,5 ms sur bureau à px 4, et 11,6 ms
au p50 et 20 ms au p95 à ×4.

*La correction.*
1. **Une qualité adaptative.** `90-boot.js` mesure le p90 des 60 dernières images et publie
   `S.perf.niveau`. Au-dessus de 12 ms, `N.crt.preset('sobre')`, puis `'coupe'` au-dessus de 15 ms ;
   on remonte sous 9 ms.
2. **Ne plus faire deux fois l'agrandissement.** Quand le tube cathodique est actif, `N.gfx.present()`
   fait un `drawImage` que `crt.apply()` réécrit aussitôt en entier (`10-gfx.js` l. 278-305,
   `20-crt.js` l. 494-495). Il faut publier `N.gfx.present({ skipScale: true })`, ou laisser
   `20-crt.js` faire seul la composition.
3. **Au bureau**, le tampon à px 4 coûte deux fois l'iPhone. Plafonner le canvas de sortie à
   1280 pixels de large et laisser le CSS agrandir en pixelisé, comme l'iPhone le fait déjà avec son
   DPR de 3.

**M6. Le contrat ne prévoit aucun événement musical.**

*La preuve.* `N.music` ne publie que `tension(v)` et `sfx(nom)` (`CONTRAT.md` l. 192-196). Impossible donc :
- de couper la musique net à la mort ;
- de caler un jingle sur la mesure ;
- de signaler un danger proche ;
- de changer de section à l'arrivée du colosse.

*La correction.* Elle est décrite au § 8 : `N.music.cue()`, `N.music.danger()`, `N.music.section()`.

### Mineurs

| n° | défaut | preuve | correction |
|---|---|---|---|
| m1 | À-coup au premier toucher | `init()` 31 ms, 60 ms à ×4 (§ 3.2) | Créer l'`AudioContext` et le graphe au chargement (il naît suspendu, ce qui est permis) ; le geste ne fait plus que `resume()`. Générer le tampon de bruit par un LCG local plutôt que par `mk()`, qui échange l'état de `N.S` à chaque échantillon (96 000 appels, l. 296-300). |
| m2 | Environ 120 nœuds audio créés par seconde | 16 644 sur la partie | Une réserve de 4 voix préconstruites pour `tir`, qui fait 955 appels par partie et 8 par seconde : on réarme les enveloppes au lieu de recréer oscillateur, filtre et gain. |
| m3 | Écouteurs DOM hors de `90-boot.js` | `70-game.js` l. 1126 et 1132 (`window.addEventListener('pointerdown'/'keydown')`), `05-art.js` l. 153 | `90-boot.js` publie `S.input.taps` (file des touchers avec x et y en pixels de jeu, et touche) ; le jeu la lit. Indispensable avec une caméra, pour convertir l'écran en monde à un seul endroit. |
| m4 | Souris seule bloquée à l'invite sur bureau | § 3.3 | `gesture()` lève aussi `S.input.any` au `pointerup` de souris. |
| m5 | Pic isolé de 563 ms dans `crt.apply` | relevé paysage | Instrumenter `sizeCheck()` et préallouer les tables au `resize`, pas à la première image. |
| m6 | Le « bip » du texte est le son de tir | `60-intro.js` l. 561 | Un son `bip` propre (voir M3). |

---

## 5. L'architecture pour un monde plus grand que l'écran, une caméra et la parallaxe

### 5.1 Le principe

Trois espaces séparés, et une seule conversion :

| espace | unité | qui l'emploie |
|---|---|---|
| **monde** | pixels de jeu, origine fixe, taille `N.world.W × N.world.H` (par exemple 1 200 × 720, environ 3 × 3,7 écrans de 422 × 195) | 70-game.js, 50-fx.js : positions, collisions, apparitions, éclats |
| **écran** | pixels du tampon `N.gfx.W × N.gfx.H` | HUD, cinématiques, manche, 20-crt.js |
| **plans** | décalage = caméra × facteur du plan | 25-decor.js |

**La rotation de l'iPhone ne touche plus le monde.** Elle change seulement la taille de la fenêtre de la
caméra. `sizeUp()` et son quart de tour (l. 354-396) disparaissent.

### 5.2 Les modules : ce qui naît et ce qui change

| module | état | ce qui change |
|---|---|---|
| **`15-cam.js`, `N.cam`** (nouveau) | à créer | **Caméra** : suit la tête avec une avance dans le sens de la marche (0,55 × vitesse, comme `snake2030/src/10-core.js` l. 1084-1090), une zone morte, et la tête gardée entre 12 % et 88 % de l'écran (`camKeepHead`, l. 1093). En portrait, la tête est cadrée dans les trois quarts du haut, à la place de l'actuel « quart bas interdit ». La caméra est bornée aux limites du monde et arrondie **une seule fois** par image au pixel de jeu. |
| **`10-gfx.js`** | évolue | **Une origine de dessin.** Toutes les primitives (`px, rect, line, circ, ring, blit, ditherRect, ditherCirc, disc`) soustraient l'origine avant d'écrire. C'est la clé : le code de dessin de 70-game.js et de 50-fx.js reste presque intact, il dessine en coordonnées monde. Plus une primitive de plan : copie de rangées avec bouclage horizontal, et `Uint8Array.set` pour un plan opaque, sans boucle pixel par pixel. |
| **`25-decor.js`, `N.decor`** (nouveau) | à créer | **Les plans** : ciel, soleil, cité (`N.art.get('horizon')`, 512 × 220, plus large que l'écran), structures, brume, sol en pseudo-3D ligne par ligne, grille du plateau. Chacun est un tampon d'index pré-rendu au démarrage et au changement de taille, posé avec un facteur `fx, fy`. **Il ne faut pas reprendre le squelette du § 4.9 de la quintessence tel quel** : il fait `ctx.drawImage` sur un canvas, alors que le jeu dessine dans un `Uint8Array` d'index. Le décor doit écrire dans `N.gfx.buf()`, sinon la palette fermée, le tube cathodique et le halo ne le voient pas. |
| **`70-game.js`** | refonte de la géométrie | Il remplace `W/H/AL/AR/AT/AB` par `N.world`. `spawnPoint()` fait naître **hors de la vue de la caméra mais dans le monde**. L'élimination des tirs se fait aux bornes du monde. `inside(e)` devient `N.cam.visible(e.x, e.y, e.r)` : un ennemi ne tire que s'il est à l'écran, ou après un télégraphe sonore. `drawEdgeTicks()` (l. 1343) devient le **radar de bord** des menaces hors champ, en coordonnées écran. `buildBG()/drawBG()` (l. 1184-1222) passent à `N.decor`. Le HUD se dessine après `N.gfx.origin(0, 0)`. Ce fichier de 1 540 lignes devrait aussi être scindé : `70-joueuse.js` (serpent, vie, mort), `72-ennemis.js`, `74-directeur.js` (apparitions, tension), `78-hud.js`. |
| **`50-fx.js`** | évolue peu | Il dessine en coordonnées monde grâce à l'origine. L'élimination des particules (l. 544) se fait sur la vue de la caméra élargie (`N.cam.view ± 24`), pas sur `W/H`. |
| **`20-crt.js`** | inchangé ou presque | La secousse reste un décalage d'échantillonnage en espace écran, ce qui est correct et sans fantôme. En option, `N.decor` lit `S.shake` pour appliquer une secousse différente par plan (× 0,2 pour le ciel, × 1,4 pour le premier plan). |
| **`60-intro.js`** | inchangé | Il dessine en espace écran : il appelle `N.gfx.origin(0, 0)`, ou le jeu le fait pour lui. |
| **`30-music.js`** | évolue | Sons **spatialisés** : un `opts.pan` de −1 à 1, calculé par le jeu depuis la position à l'écran, sur un `StereoPanner` par voix. Son `alerte` pour une menace hors champ. Voir § 8. |
| **`90-boot.js`** | évolue | Il publie `S.input.taps` (m3) et `S.perf` (M5). Il appelle `N.cam.update(dt)` entre `game.update` et le dessin, puis `N.decor.draw()` avant `N.game.draw()`. |

### 5.3 L'ordre de la boucle d'images

`90-boot.js` déroule ces étapes, dans cet ordre :

1. `game.update(dt)`, puis `fx.update(dt)`, puis `cam.update(dt)`.
2. `gfx.clear(0)`.
3. `gfx.origin(0, 0)`, puis `decor.draw(cam)` : les plans lointains, en espace écran avec un décalage
   propre à chaque plan.
4. `gfx.origin(cam.x, cam.y)`, puis `game.draw()` (sol de jeu, éclats, cellules), `fx.draw()`, et la
   partie monde de `game.drawTop()` (ennemis, tirs, serpent).
5. `gfx.origin(0, 0)` : le premier plan de décor s'il existe, puis le HUD, le radar de bord et
   l'interlude.
6. `gfx.present()`, puis `crt.apply(dt)`.

**Le budget.** Le décor de 6 plans coûte environ 6 × 82 000 copies d'octets par image. Avec `set()` par
rangée, c'est de l'ordre de 0,3 à 0,6 ms sur un téléphone, à mesurer. Avec la qualité adaptative de M5,
l'ensemble tient sous 16,7 ms au p95 sur iPhone 13.

---

## 6. L'architecture d'une vraie mort

### 6.1 Un automate de vie, publié

```
S.player.etat : 'vivant' | 'touche' | 'mort' | 'fin'
S.death = { cause: 'mur'|'corps'|'ennemi'|'tir'|'laser', x, y, ref, t, phase }   // null tant qu'on vit
```

`70-joueuse.js` (ou l'actuel `hurt()/die()`) écrit `S.death` à l'instant du coup. Tous les modules la
lisent :
- **50-fx.js** : gel de 10 images, anneau autour de la cause, désintégration de la tête vers la queue ;
- **30-music.js** : coupure, son de mort, jingle ;
- **60-intro.js** : l'écran de défaite, qui sait **pourquoi** on est mort et l'affiche, par exemple
  « TUÉE PAR UN TIR DE TOURELLE ».

### 6.2 Les collisions mortelles, configurables

Un objet de réglage unique, pour que le game design règle la difficulté sans toucher au code :

```
N.game.REGLES = { mortMur: true, mortCorps: true, corpsBouclier: false, vies: 1, invul: 0.6,
                  ondeDeChoc: false, queueBouclier: false }
```

Ce qu'il faut changer dans le code :

| règle | dans le code actuel | quoi faire |
|---|---|---|
| `mortMur` | `wallSteer()` l. 478 et le `clamp` l. 503 | Ne plus appeler `wallSteer()`. Le bord du monde devient un mur électrifié, télégraphié par une bande de 6 px qui grésille et par le son `frole`. |
| `mortCorps` | n'existe pas | Tête contre segments, pour k ≥ 4 (les trois premiers touchent toujours la tête) : 60 tests par image au plus, gratuits. `segAt()` (l. 411) fournit déjà les positions. |
| `corpsBouclier: false` | l. 946-951 | Supprimer l'absorption des tirs par le corps, ou la réserver à un bonus temporaire. |
| `vies`, `invul`, `ondeDeChoc`, `queueBouclier` | `hurt()` l. 533-565 | Les rendre conditionnels. |

### 6.3 La séquence de mort, audio et vidéo

Elle reprend le principe 10 de la quintessence ; la durée totale passe de 0,28 s à environ 1,6 s.

| temps | image | son |
|---|---|---|
| 0 | gel de 10 images (`N.fx.hitstop`), tête en os, **anneau magenta autour de la cause** | `N.music.cue('mort')` : la musique est **coupée net** (la porte à 0 en 15 ms), puis le sub et le coup |
| 0,2 à 1,2 s | désintégration, un segment toutes les 2 images | glissando carré descendant (son `mort`) |
| 1,2 s | GAME OVER en gros | jingle `gameover` calé sur un temps, puis la musique reprend au calme, en section « fin » |
| toucher | relance en moins d'une seconde | la musique repart sur une mesure neuve, ce que `resync()` sait déjà faire |

---

## 7. La musique à refaire : du générateur au tube génératif

**Ce qu'il faut garder** : l'ordonnanceur sur l'horloge audio, la porte, l'étouffoir, `resync()`, le
rendu hors ligne de preuve, le hasard séparé du jeu, et les gardes des sons (fusion, plafond, usure).

**Ce qu'il faut changer**, dans `30-music.js` seulement :

1. **Un refrain.** Ajouter des `HOOKS` : trois à cinq motifs **composés à la main**, de 8 à 16 notes sur
   deux mesures, dans l'esprit d'Axel F ou de The Final Countdown.
   - Le motif est joué par le lead aux sections « refrain », **identique note pour note**.
   - L'arrangement autour de lui change : basse, batterie, octave, harmonisation à la tierce.
   - La règle d'or se reformule ainsi : « aucune mesure complète, toutes couches confondues, identique
     trois fois de suite ». C'est ce que `barGuard()` vérifie déjà (l. 627). Il ne faut plus l'imposer
     à chaque poche via `pick()` pour la mélodie.
   - Le critère 5 de DIRECTION.md (fenêtres RMS de 4 s, pas identiques à 1 % près) reste tenu : la
     batterie et la basse varient sous le refrain. À vérifier par `tools/musique2/repetition.mjs`.
   - DIRECTION.md doit acter cette reformulation.
2. **Un lead dès la première mesure**, au calme, à faible niveau et en écho. Il ne doit plus attendre la
   tension 0,68 (l. 687).
3. **Éclairer le spectre.** Objectif mesurable : un centroïde de 900 Hz à 1,5 kHz au calme, et 8 à
   15 % de l'énergie au-dessus de 2,5 kHz au chaos.
   - Lead entre A4 et A5 : supprimer les −12 de `LEAD_OCT`, et ajouter +12 au refrain.
   - Filtre du lead de 4,5 kHz à 2 kHz, et non de 3 kHz à 1,1 kHz.
   - Une onde carrée à rapport cyclique de 25 % pour la station « arcade ».
   - Nappe à 1,6 kHz au calme et 3,5 kHz au chaos.
   - Charlestons +3 dB.
4. **La batterie des années 80.**
   - Caisse claire en **réverbération coupée** : un envoi vers une réverbération courte dont le gain
     tombe d'un coup à 0 après 220 ms.
   - Grosse caisse avec punch et clic (M1).
   - Une attaque d'orchestre ou de cuivres (« stab ») sur les cassures, au lieu de l'actuel `stab` qui
     n'est qu'une grosse caisse et une caisse claire.
5. **Des sections au lieu d'un fader** : INTRO (4 mesures), COUPLET (8), REFRAIN (8), PONT ou CASSURE
   (4), en boucle.
   - La tension choisit la section et la densité, et change le tempo **par paliers**.
   - Le colosse déclenche `section('boss')` : modulation de +2, 140 BPM, refrain à l'octave.
   - Réutiliser les grilles d'accords existantes : i-VI-III-VII est exactement la progression épique
     des années 80.
6. **Trois « stations » au choix**, comme dans Out Run (quintessence, principe 12) : chacune est une
   graine, un refrain, un timbre et un tempo de base. C'est le levier le plus fort contre la lassitude,
   et il ne coûte qu'un sélecteur sur l'écran de briefing.
7. **Mixer pour le téléphone** (M1) et **pour que les sons claquent** (M2).

**Une alternative à trancher par la propriétaire.** SNAKE 2030, qu'elle demande de reprendre, jouait une
vraie piste (`snake2030/neonvelocity.mp3`, chargée par `snake2030/src/90-boot.js` l. 1479), avec des
couches synthétisées par-dessus. `SUNO.md` prévoit la même chose avec sept morceaux. DIRECTION.md
l'interdit (« aucun fichier audio »). Si les refrains composés du point 1 ne suffisent pas à l'écoute,
lever cette interdiction pour l'écran-titre et le colosse est le chemin le plus court vers un vrai
« tube ». Le moteur génératif resterait alors en dessous, pour la réactivité et les sons.

---

## 8. Les interfaces de CONTRAT.md qui doivent évoluer

**Ce qui change dans l'existant.**

```
N.gfx.resize(cssW,cssH,sûreW,sûreH)   // inchangé : W,H = la VUE, plus le monde

N.gfx.px/rect/line/circ/ring/blit/...  // inchangées en signature, mais elles soustraient l'origine courante
N.fx.boom(x,y,force,ci)                // x,y deviennent des coordonnées MONDE
N.game.draw()/drawTop()                // dessinent en monde ; le HUD après N.gfx.origin(0,0)
N.music.sfx(nom, opts)                 // opts.pan (-1..1), opts.pitch ; noms ajoutés : mort, gameover,
                                       // colosse_mort, defi_rate, bip, alerte, frole ; plus de son neutre en jeu
N.S                                    // s'ajoutent S.cam, S.death, S.player.etat, S.input.taps, S.perf
```

**Ce qui s'ajoute.**

```
// le monde
N.world = { W, H }                     // taille du monde en pixels de jeu, indépendante de l'écran

// la caméra
N.cam.update(dt)                       // suit la tête ; arrondie au pixel de jeu une fois par image
N.cam.x, N.cam.y                       // coin haut-gauche de la vue, dans le monde
N.cam.toScreen(x,y,out)                // conversion monde -> écran ; .toWorld(sx,sy,out) l'inverse
N.cam.visible(x,y,marge)               // dans la vue (élimination, tirs ennemis, radar de bord)

// l'origine de dessin
N.gfx.origin(ox,oy)                    // toutes les primitives retranchent (ox,oy) ; origin(0,0) pour l'écran
N.gfx.layer(tampon, ox, oy, {wrapX, opaque})   // pose un plan par copie de rangées, avec bouclage

// le décor
N.decor.build()                        // pré-rend les plans à la taille de la vue (init, resize)
N.decor.draw(cam)                      // pose les plans lointains ; .drawFront(cam) le premier plan
N.decor.pulse(k)                       // la grille et les néons battent sur la grosse caisse
                                       // (lue sur N.music.beat())

// la musique
N.music.cue(nom)                       // événement calé sur la mesure : 'mort' (coupe net), 'gameover',
                                       // 'boss', 'victoire'
N.music.section(nom)                   // 'intro'|'couplet'|'refrain'|'pont'|'boss'|'fin'
N.music.danger(v)                      // 0..1, battement de cœur (proximité d'un mur ou d'une menace)
N.music.beat()                         // -> {bar, step, phase 0..1} pour synchroniser le décor sur le tempo
N.music.station(i)                     // choix de la station (0..2)

// le jeu
N.game.REGLES                          // mortMur, mortCorps, corpsBouclier, vies, invul,
                                       // ondeDeChoc, queueBouclier
```

**Les critères de DIRECTION.md à réviser.**
- **Critère 3 (cyan réservé)** : il se mesure sur l'écran, inchangé.
- **Critère 6 (montée monotone par tranches de 20 s)** : il est incompatible avec des sections musicales
  (un pont fait baisser le RMS). Il faut le restreindre au nombre d'ennemis, ou le mesurer sur des
  tranches de 40 s.
- **Critère 7 (performance)** : il doit être mesuré **avec** la parallaxe, et aussi au profil ×4.

---

## 9. Ce qui est bon et doit être gardé

- **Zéro erreur** sur quatre profils, avec rotation, coupure du son et suspension (`__ERR.count = 0`,
  console vide).
- **Le cycle de vie audio pour l'iPhone** : porte et étouffoir, `pump()` qui relance un contexte
  `suspended` ou `interrupted` en moins de 0,5 s, `resync()` sur une mesure neuve, coupure valable
  avant `init()`, son forcé malgré l'interrupteur silencieux. C'est de la belle ouvrage, à ne pas
  toucher.
- **L'ordonnancement sur l'horloge audio** (avance de 0,26 s, réveil toutes les 40 ms) : aucune dérive
  rythmique.
- **La preuve hors ligne avec le même moteur** (`renderOffline`) : c'est elle qui permet de mesurer tout
  ce qui précède. Il faut la garder et en faire le banc de non-régression du nouveau mixage :
  centroïde, niveau « téléphone », écart entre les sons et la musique.
- **Les gardes contre l'agacement** (fusion, plafond de voix, usure) et les **sons dans la tonalité
  courante**. `kill` qui monte avec la chaîne est exactement le principe 13 des tubes d'arcade.
- **Le genou doux du master** : crête à −1 dBFS, sans écrêtage.
- **La réverbération à peignes**, d'un coût négligeable.
- **La performance de base** : jeu, effets et présentation coûtent moins de 2 ms au p95 sur iPhone. Le
  tampon d'index tient sa promesse.
- **Le hasard séparé** (jeu, musique, bruit, sons, tube cathodique) et la reproductibilité à graine
  fixe.
- **La mémoire stable** (3 à 9 Mo) et les tableaux préalloués de `50-fx.js`.
- **La secousse comme caméra à ressort** de `20-crt.js` : sans fantôme du halo, alignée sur la grille.

---

## 10. Les dix corrections prioritaires, classées

1. **Introduire le monde et la caméra** (B1) : `N.world`, `15-cam.js`, `N.gfx.origin()`. Ensuite, migrer
   les 41 tests de bornes de `70-game.js` et `50-fx.js` sur le monde ou la vue, et supprimer la rotation
   du monde dans `sizeUp()`.
2. **Créer `25-decor.js`**, avec 5 à 6 plans pré-rendus en tampons d'index (dont `horizon`) posés par
   `N.gfx.layer()`, plus le sol pseudo-3D et le radar de bord des menaces hors champ.
3. **Écrire l'automate de vie et la vraie mort** (B2) : publier `S.death` avec sa cause, ajouter
   `N.game.REGLES` (mort au mur, mort contre son corps, corps sans bouclier, vies et invulnérabilité
   réglables), et allonger la séquence de mort à 1,6 s avec la cause entourée.
4. **Composer des refrains et faire jouer le lead dès la première mesure** (B3). Réserver la règle
   d'or à la mesure entière (`barGuard`), et l'acter dans DIRECTION.md.
5. **Éclairer et remixer pour le téléphone** (M1, B3) : centroïde visé de 900 Hz à 1,5 kHz ; basse
   saturée ou une octave plus haut ; punch de la grosse caisse ; calme à −18 dBFS et chaos à −14 dBFS.
   À vérifier par la simulation « téléphone » de cet audit.
6. **Donner un son propre à chaque événement** (M3, M6) : `mort` avec coupure nette de la musique,
   `gameover`, `colosse_mort`, `defi_rate`, `bip`, `alerte` spatialisée, `frole`. Publier
   `N.music.cue()` et `N.music.danger()`.
7. **Faire claquer les sons** (M2) : kill et dégât 3 à 6 dB au-dessus de la musique, esquive du kill à
   0,30.
8. **Remplacer le fader par des sections** (M4) : tempo par paliers de 112 à 140 BPM, tonalité fixe
   avec une modulation voulue vers le haut au colosse, caisse claire en réverbération coupée, attaques de
   cuivres. Ajouter trois stations au choix.
9. **Mettre en place une qualité adaptative du tube cathodique** (M5) : `S.perf`, bascule vers
   « sobre » puis « coupe », et suppression du double agrandissement dans `present()`. Mesurer
   ensuite p95 et p99 avec la parallaxe, aux profils ×1 et ×4.
10. **Corriger les quatre détails de robustesse** (m1, m2, m3, m4) : construire le graphe audio au
    chargement, ce qui supprime l'à-coup de 31 à 60 ms ; une réserve de voix pour `tir` ;
    `S.input.taps` publié par `90-boot.js`, sans écouteurs DOM ailleurs ; la souris qui lance la partie
    au bureau.
