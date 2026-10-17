# Lot 7a — La piste : rapport de livraison

*Agent du lot 7a, 17 octobre 2026, contre le contrat 1.0. `30-music.js` joue désormais le morceau de la
propriétaire, « Neon Velocity », découpé en blocs et réenchaîné sur la mesure selon la phase de jeu ; le
moteur génératif de la démo, réaccordé, joue au-dessus et prend la relève sans la piste ; la banque de 48 sons
et la voix de la machine sont branchées.*

## Les fichiers livrés

| Fichier | Contenu |
|---|---|
| `src/30-music.js` | réécrit : graphe audio complet, séquenceur par blocs et par sections, coupure et reprise de la mort, filtre et gain de tension, étouffoirs, génératif réaccordé (repli à quatre couches sur l'harmonie relevée du morceau, refrain de 8 notes ; couches PERCU, ÉTINCELLES, INVERSION, BATTEMENT, SIRÈNE et accents au-dessus de la piste, recalés sur les barres de chaque bloc), banque de sons et voix ; tout le contrat 1.0 de `N.music` |
| `tools/L7a/sons.mjs` | recopie `sons/banque.js`, `sons/jouer.js` et `sons/voix.js` dans `30-music.js` (entre `BANQUE-DEBUT` et `BANQUE-FIN`), enfermés pour ne rien laisser fuir sur `window` ; à relancer après toute retouche de `sons/` |
| `tools/L7a/banc.mjs` | le banc en partie réelle : démarrage, calage, vingt morts, sections, alerte, mémoire, suspension, zéro erreur → `mesures.json` |
| `tools/L7a/jointures.mjs` | les jointures, rendues hors ligne par le code même du jeu (`N.music.rendrePiste`) → `jointures.json` |
| `tools/L7a/repli.mjs` | le jeu sans piste (requêtes vers `musique/` refusées) → `repli.json` |
| `tools/L7a/autonome.mjs` | `build.mjs --embed`, ouvert en `file://` sans réseau → `autonome.json` |
| `tools/L7a/mixage.mjs` | niveaux au calme et au chaos, pleine bande et au téléphone → `mixage.json` |
| `tools/L7a/fumee.mjs` | premier essai, la piste prend la relève |

`musique/` et `tools/musique/` (le découpage, `piste.json`, l'analyse et ses preuves) étaient déjà faits par la
préparation du lot ; ils ne sont pas retouchés. La page d'essai se reconstruit par
`tools/lots/worktree.sh essai L7a` et se sert par `servir L7a` (port 8131).

## Ce que fait la musique, en jeu

- **Au premier toucher**, le génératif sonne dans les 0,1 s (titre : nappe, basse, refrain doux, sur
  l'harmonie de l'INTRO) ; les blocs `nv-01` et `nv-02` sont déjà téléchargés au chargement de la page, décodés
  au geste, et la piste prend la relève sur la barre suivante du génératif (2,2 s). Le repli s'éteint en un
  temps sur cette barre, la preuve que la piste sonne (RMS du bus de la piste) est relevée 0,18 s après.
- **Les sections** (`N.music.section`, 79-jeu) : INTRO puis sa boucle 3-8 au titre ; **décollage** sur
  `nv-02` à la barre suivante quand le jeu commence ; PLATEAU dans l'ordre du morceau, puis tirage pondéré
  dans les `suivants` de `piste.json` (score ≥ 0,5, jamais un bloc des trois derniers, le creux `nv-05` favorisé
  à faible tension) ; RÉPIT par le PONT en levée puis la RESPIRATION ; ALERTE : coupure de 250 ms sur la barre,
  puis la mesure 56 en boucle sous passe-bas à 300 Hz avec la sirène générative (la–ré, deux dents de scie) ;
  BOSS : RETOUR à la barre suivante, puis tirage dans le RETOUR (la boucle 107-122 et ses voisins, jamais les
  deux derniers) ; VICTOIRE, INITIALES, DÉFAITE : OUTRO puis sa boucle 123-130, la défaite sous 1,2 kHz ;
  retour au TITRE par un fondu de sortie de 0,6 s qui finit sur une barre, puis `nv-01` à neuf (le morceau
  commence en plein son : on n'y entre jamais depuis un bloc fort).
- **Quand changer** : à la barre suivante pour une demande urgente (décollage, alerte, boss, victoire), sinon à
  la prochaine **demi-phrase** (mesures 4 et 8 du bloc : l'harmonie tourne en cycles de 8 mesures qui finissent
  sur sol mineur aux mesures 4 et 8, d'où l'on entre sans faute dans n'importe quel bloc), au plus 8,3 s.
- **La mort** : `cue('mort')` coupe toute la musique en 15 ms (`N.R.mortScene.coupure`) ; la reprise vient
  0,6 s après l'entrée en `reapparition` (READY), au début d'un bloc de la section (PLATEAU, ou RETOUR au boss)
  qui n'est ni celui de la mort ni l'INTRO, choisi d'abord parmi les blocs décodés ; le génératif reprend sur
  une mesure neuve. Après un game over, `defaite` (ou `initiales`) part de l'OUTRO.
- **La tension** (section jeu seulement) : passe-bas de la piste de 2,5 kHz (tension 0,15) à 18 kHz (0,6),
  gain de −3 à 0 dB (`N.R.musique.tension`), relus dix fois par seconde au plus ; INVERSION : filtre grand
  ouvert ; danger : vers 2 kHz. Étouffoirs de toute la musique : pause 420 Hz, cartes 900 Hz, RALENTI 1,2 kHz
  (lu sur `N.fx.k()` < 0,5 avec la joueuse exemptée). La piste n'est jamais accélérée.
- **Au-dessus de la piste**, le génératif est recalé au début de chaque bloc : sa grille est faite des barres
  mesurées du bloc (`barres`), chaque mesure prend l'accord de la piste (`accords`, tierce prise dans le mode de
  la section : éolien en PLATEAU et RETOUR, dorien ailleurs). Couches, toutes sur la barre : PERCU (charleston
  en doubles croches accentuées, clap à réverbération coupée) dès 0,6 ; ÉTINCELLES (impulsion à 25 %, notes de
  l'accord entre ré 5 et ré 6, écho à la croche pointée) dès 0,8 ; INVERSION (arpège rapide, filtre ouvert) ;
  BATTEMENT (le `battement` de la banque, une ou deux fois par mesure selon `danger`) ; la grosse caisse seule
  quand le danger dépasse 0,5. Accents : `stinger` (accord de cuivres de puce, crash, roulement de caisse sur la
  mesure), `drop` (250 ms de silence sur la barre), `plongee` (10 % en 90 ms, 128 % au temps suivant), `vague`
  (crash et coup sourd sur la barre). Chaque mesure tire ses motifs dans des poches qui refusent un troisième
  tirage identique, et aucune empreinte de mesure ne sort trois fois de suite.
- **Le repli** (sans piste) : les mêmes sections, au tempo de la piste (114,995 BPM), sur l'harmonie relevée de
  chaque section du morceau (`CYCLES`), avec le refrain la4 · do5 ré5 mi5 | ré5 · do5 la4 · sol4 sur les deux
  mesures de la mineur qui ouvrent chaque cycle. Les transpositions de la démo sont retirées : tout reste en ré.
- **Les sons** : `N.music.sfx(nom, {pan, pitch, type, total, x})` passe par la garde et le lecteur de la banque
  (sept panoramiques, divisés par deux en portrait ; `x` en px écran est converti) ; chaque son retire à la
  musique son `esquive`, relâchée en 120 ms. Anciens noms gardés : `intro` (la montée de l'ouverture) et
  `degat` (vers `coupe`).
- **La voix** : les six mots du contrat sont précalculés hors ligne au premier geste, posés sur le temps
  (l'attaque de la voyelle accentuée sur le temps), un toutes les 4 s au plus, sur leur propre bus.
- **La mémoire** : blocs rognés à leur cœur ± 10 ms, contexte ouvert à 44,1 kHz (pas de rééchantillonnage),
  quatre blocs décodés au plus (le courant, le suivant, le plan, une cible probable : décollage, levée du DÉFILÉ,
  alerte et RETOUR à la vague 5, OUTRO après une mort), les octets MP3 gardés en cache (4,8 Mo au plus).

## Les critères d'acceptation [U]

Mesurés sur la page d'essai `tools/L7a/index.html` (Chromium 141, Web Audio réel, iPhone 13 paysage sauf mention).

| Critère | Seuil | Résultat |
|---|---|---|
| Démarrage | du son moins d'une mesure après le premier toucher ; la piste prend la relève sur une barre, moins de 3 s après | **tenu** : son à **0,06 s** (repli génératif) ; piste sur la barre à **2,24 à 2,29 s** (trois passages) (`banc.mjs`) |
| Chemin | la page d'essai trouve les blocs ; `--embed` produit un fichier autonome qui joue sans réseau | **tenu** : `tools/L7a/index.html` charge `../../musique/` ; le fichier `--embed` (7,5 Mo) ouvert en `file://`, toute requête refusée : piste sur `nv-01` en 2,1 s, **0 requête**, 0 erreur (`autonome.mjs`) |
| Jointures de blocs | écart < 1 ms par corrélation ; aucun clic | **tenu** : 45 jointures rendues hors ligne par le code du jeu (le morceau entier dans l'ordre, une chaîne de 16 sauts et boucles, 13 coupures sur des barres internes : alerte, boss, décollage, demi-phrases) : **écart 0 ms**, rendu identique aux blocs d'origine à l'échantillon près (corrélation normalisée 1,000 de part et d'autre de chaque barre) ; **0 clic** (dérivée ≤ 0,351 pour 0,45 permis, jamais au-delà de +1 dB de la même barre jouée d'un tenant) (`jointures.mjs`) |
| Calage du génératif | sur 3 minutes, 100 % des entrées de couche à moins de 10 ms d'une barre du bloc en cours | **tenu** : toutes les entrées (PERCU, ÉTINCELLES, stinger…) à **0 ms** des barres recalculées depuis `piste.json` et le journal des segments, sur 75 s de jeu et les sections (`banc.mjs`) |
| Après une mort | jamais de reprise au début du morceau ; jamais le même bloc que celui de la mort | **tenu** : **20 morts sur 20**, reprise au début d'un autre bloc de PLATEAU, jamais `nv-01`, 1,9 à 2,2 s après l'impact (`banc.mjs`) ; sans piste, le génératif reprend sur une mesure neuve |
| Robustesse | sans fichier de piste, le jeu complet tourne en génératif sans erreur ; coupure, suspension et reprise sous 1 s ; mémoire audio décodée ≤ 25 Mo | **tenu** : requêtes vers `musique/` refusées, toutes les sections et une mort en portrait : 0 erreur, aucun silence hors de la mort et du READY, grille à 114,995 BPM, 0 mesure identique trois fois de suite sur 60 s rendues (`repli.mjs`) ; suspension puis reprise : son revenu en **26 ms**, coupure générale puis retour en **25 ms** ; mémoire décodée au plus **23,2 Mo** |

Vérifié aussi : les sections (répit par `nv-08` puis `nv-09` ; alerte sur `nv-07` mesure 56 après un trou de
**250 ms** exactement ; boss sur `nv-12` à la mesure suivante ; victoire et défaite sur `nv-17`, titre sur `nv-01`) ;
`tools/contrat/contrat.mjs` sur la page d'essai, trois profils : **49 tests sur 49**, 0 erreur ;
`tools/jeu/fumee.mjs` 60 s en paysage, portrait et bureau : `__ERR.count = 0` ; aucun `Math.random`, `N.rnd`,
`Date.now`, `performance.now` ni couleur littérale dans `30-music.js` ; `worktree.sh verifier L7a` passe.

**Mixage, pour repère** (critère [I] du lot 7b ; `mixage.mjs`, piste sur PLATEAU) : calme (tension 0,15)
−18,0 dBFS pleine bande et −27,0 au téléphone ; chaos (1,0) −15,0 et −21,5 ; écart **+3,1 dB** pleine bande et
**+5,5 dB** au téléphone, sous les +6 dB visés avec le gain de tension de `N.R` (−3 à 0 dB). Voir les demandes.

## Les écarts

- **Le tempo est de 114,995 BPM, pas 144,6.** Mesuré par la préparation du lot (`tools/musique/LISEZMOI.md`) ;
  la musique lit `bpm` et `mesureS` dans `piste.json`. La grille de jeu (`N.horloge`, `N.R.temps`) reste à
  144,6 tant que le gardien ne l'a pas changée : la musique et le jeu ont alors deux grilles (sans conséquence
  de jeu, le plan le prévoit, mais les apparitions « sur le temps » ne tombent plus sur les temps entendus).
- **Les numéros de mesure** du plan (alerte 70, boss 136-151, décollage 11) correspondent à 56, 107-122 et 9 du
  vrai morceau (même instants) ; le séquenceur suit `piste.json` → `sectionsJeu` et `boucles`.
- **La banque et la voix sont recopiées** dans `30-music.js` (104 Ko) par `tools/L7a/sons.mjs`, parce que
  `build.mjs` ne concatène que `src/`. La voix est celle de `sons/voix.js` au commit de base ; l'agent de la
  voix la retouche encore : relancer `sons.mjs` à l'intégration.
- **Les couches au-dessus de la piste** (PERCU, ÉTINCELLES, INVERSION, BATTEMENT, sirène, accents) sont faites
  ici, en avance sur le lot 7b, parce qu'elles portent l'action ; le 7b les règle et les mesure.
- **Un mot de voix toutes les 4 s** : GO, demandé juste après READY, est refusé (règle du § 5.8 appliquée à la lettre).
- **La plongée** : 79-scene l'appelle au début du VOL (squelette) ; le plan la réserve à l'APOGÉE.
- **Le RALENTI** se lit sur `N.fx.k()` ≤ 0,5 avec la joueuse exemptée ; l'arrivée du CYCLOPE (0,3, joueuse
  exemptée) passe donc elle aussi sous l'étouffoir de 1,2 kHz.
- **Les journaux `bloc` et `sfx`** dépendent de l'horloge audio : ils n'existent pas en mode simulé, et deux
  parties dessinées n'y ont pas forcément les mêmes instants.
- **Safari** n'a pas pu être essayé ici. Le décalage du décodeur y est détecté par la longueur décodée (0 si
  l'en-tête LAME est appliqué, sinon 1 105 échantillons), et vérifié par corrélation entre deux blocs voisins.

## Demandes au gardien

| N° | Demande | Raison | Repli en attendant |
|---|---|---|---|
| 7a-1 | `N.R.temps.bpm` = **114,995**, `dureeTemps` 0,52176, `dureeMesure` 2,08705 ; `N.R.musique.piste` (`bpm`, `mesure`, `mode` mineur), `sections` (INTRO 1-8, PLATEAU 9-56, PONT 57-58, RESPIRATION 59-82, RETOUR 83-122 boucle 107-122, OUTRO 123-131), `alerte.mesure` = 56, `blocs.duree` = 16,7 ; le test « grille musicale à 144,6 BPM » de `tools/contrat/tests.js` suit | le morceau est à 115 BPM (mesuré : `tools/musique/LISEZMOI.md`) ; sans cela le jeu se cale sur un tempo qu'on n'entend pas | la musique lit `piste.json` (et `LOC.bpm`, `LOC.mesureS` sans lui) |
| 7a-2 | `N.R.musique.tension.gainDb` = **[−6, 0]** | mesuré avec [−3, 0] : +3,1 dB du calme au chaos (pleine bande), sous les +6 dB du § 0.2 | `N.R` lu tel quel |
| 7a-3 | `build.mjs` injecte `sons/banque.js`, `sons/jouer.js` et `sons/voix.js` avant les modules (comme `ART_SRC`), et `30-music.js` les lit s'ils existent | une seule écriture des recettes ; la voix évolue encore | copie par `tools/L7a/sons.mjs` |
| 7a-4 | les valeurs locales de `LOC` dans `30-music.js` (marquées `// → N.R`) entrent dans `N.R.musique` : horizon 0,26 s, engagement 0,7 s, coupure urgente 0,34 s, preuve 0,18 s à −80 dBFS, attraction −6 dB, fondu vers le titre 0,6 s, seuils des couches (0,6 / 0,55, 0,8 / 0,75), danger (0,25, 0,75, 0,5), niveaux des couches et de la voix | chiffres absents de `N.R` | `LOC` |
| 7a-5 | ajouter au contrat les crochets de banc de `N.music` : `rendrePiste(suite, sr)`, `segments()`, `calage()`, `noeud(nom)`, `rmsPiste()`, et `canaux()` (demande 7 du 0b) | les bancs du 7a et du 7b s'en servent | publiés, hors contrat |
| 7a-6 | pour 79-scene (lots 6a et 6b) : `sfx('butin')` sans `pitch` (la garde fait l'escalier elle-même ; la longueur passée l'écrase) ; `sfx('arme', {type, total})` ; `cue('plongee')` à l'APOGÉE et non au VOL ; ne pas jouer `sfx('gameover')` en plus de `cue('gameover')`, qui joue le jingle sur le temps ; `N.music.voix` aux temps forts (READY à la réapparition, WARNING à l'alerte…) ; et quelqu'un appelle `N.music.danger(v)` (proximité d'un mur ou d'une menace) : rien ne l'appelle aujourd'hui, le BATTEMENT ne part donc jamais | ce que la banque et le séquenceur attendent de leurs appelants | sans effet tant que ce n'est pas fait |
