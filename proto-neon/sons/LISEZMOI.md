# SNAKE 2975 — la banque de sons

Les 48 sons du § 5.8 de `REFONTE.md`, écrits comme des **recettes Web Audio**, accordés sur la piste de la
propriétaire, mesurés hors ligne et calibrés. Ce dossier prépare le **lot 7b** (`30-music.js`, seconde
partie) : il n'est branché sur rien. Aucun fichier de `src/` n'a été touché.

| Fichier | Rôle |
|---|---|
| `sons/banque.js` | **les définitions** : JavaScript pur, sans dépendance, sans URL, sans fichier audio. Chaque son est une recette (couches d'oscillateurs et de bruit, enveloppes, filtres, hauteurs, glissandos, niveau visé en dBFS), plus la tonalité, les sept panoramiques, les classes de timbre et le calibrage. Le schéma est décrit en tête du fichier. |
| `sons/jouer.js` | **le lecteur de référence** : transforme une recette en nœuds sur n'importe quel contexte (AudioContext ou OfflineAudioContext), avec la **réserve de voix** des sons fréquents et la **garde** (FUSION, PLAFOND, USURE, empilement des kills, escalier du butin). |
| `tools/sons/index.html` | **la page d'écoute et de mesure** : chaque son et ses variantes, la hauteur réglable, les 7 panoramiques, l'écoute « téléphone » (passe-haut 350 Hz), la piste de la propriétaire en dessous (calme ou chaos), 14 séquences (chaîne de kills, rafale empilée, escalier de butin, 16 tourelles, LASSO de 2 à 8, mort puis GAME OVER, scène de charge…), et le bilan des mesures. |
| `tools/sons/analyse.js` | les mesures (crête, RMS, durée, parts d'énergie, centroïde, simulation de téléphone, corrélation). |
| `tools/sons/mesure.mjs` | **le banc** : Chromium par Playwright, rendu hors ligne de chaque son, critères, calibrage, clic de chaque bouton de la page. |
| `tools/sons/mesures.json` | le dernier rapport du banc. |

`sons/voix.js` (la voix de la machine, P3) appartient à un autre lot : il n'en fait pas partie.

## Écouter, mesurer, calibrer

```sh
# la page (la musique en dessous demande un serveur http à la racine du dépôt)
npx http-server -p 8123 .          # puis http://127.0.0.1:8123/proto-neon/tools/sons/
# le banc : mesure et critères -> tools/sons/mesures.json ; code de sortie 1 si un critère tombe
node proto-neon/tools/sons/mesure.mjs
# après toute retouche d'une recette : recalcule CALIBRAGE (crête sur `niveau`), réécrit le bloc, remesure
node proto-neon/tools/sons/mesure.mjs --calibrer
```

Le bloc `CALIBRAGE` de `banque.js` est écrit par le banc : on ne le retouche pas à la main.

## La tonalité

- **Ré mineur** : éolien dans PLATEAU et RETOUR, dorien dans RESPIRATION et OUTRO (§ 5.7, confirmé par
  `musique/piste.json`).
- **La gamme des sons** est la **pentatonique de ré** (ré fa sol la do), commune aux deux modes. Les
  escaliers de hauteur montent d'un **degré** de cette gamme, jamais d'un demi-ton chromatique.
- Le butin monte dans l'**hexatonique** (on ajoute mi), commune elle aussi aux deux modes.
- Les récompenses majeures sont en **fa majeur**, relatif de ré mineur, donc dans la tonalité.
- **Une seule exception, déclarée** (`eolien: true`) : la cadence si bémol, do, ré de `colosseMort`. Elle
  est jouée au moment où la piste passe du RETOUR (éolien) à l'OUTRO.
- **Le tempo** de la piste vaut **114,995 BPM**, mesuré par le lot 7a dans `piste.json`, et non les
  144,6 BPM de l'estimation de `REFONTE.md`. Les durées musicales des recettes (`'1/8'`, `'3/16'`…) sont
  des fractions de ronde à ce tempo. Le jingle `gameover` tombe donc en croches de la piste.
- Le banc vérifie chaque note de chaque recette, y compris après transposition aux extrêmes de hauteur.
  Aucune n'est hors de la tonalité.

## Brancher la banque (lot 7b)

```js
var L = SONS_2975_JOUER.lecteur(ctx, SONS_2975, { panneurs: sept StereoPannerNode, graine: n });
var G = SONS_2975_JOUER.garde(SONS_2975);
N.music.sfx = function (nom, o) {               // o : {pan, pitch, type, total}
  var d = G.demande(nom, ctx.currentTime, o);   // null : fusionné ou plafonné ; jamais pour un kill
  if (d) { var r = L.jouer(nom, d.opts); duck(r.esquive); journal('sfx', nom, true); }
};
```

- **Le bus d'effets reste à l'unité** jusqu'au maître du jeu, qui garde son genou doux. Les `niveau` sont
  des crêtes en sortie du lecteur. Si le lot 7b change le gain du bus, il décale toute la banque d'autant.
  Il ne doit jamais retoucher un son à la main sans relancer le banc.
- **Le panoramique** : `SONS_2975.pan(x, largeur, portrait)` donne l'une des sept positions (−0,85 à
  +0,85), réduite de moitié en portrait. Le lecteur envoie le son au panoramique le plus proche.
- **`opts.type`** choisit une variante, directement ou par un identifiant figé :
  - `tir` : `canon`, `tourelles` et `drones` donnent le tir de base ; `lance`, `rayon`, `arc`, `missiles`
    et `minesQ` ont chacun le leur ;
  - `arme` : `fleche` et `larve` → bond, `dard` → verrouillage, `tourelle` → visée, `sentinelle` et
    `cyclope` → laser, `lame` et `convoi` → recul, `mine` et `ruche` → mèche, `rival` → coupe-route.
- **`opts.total`** étire un son de télégraphe (`etirable`, de × 0,6 à × 2) sur la durée réelle du
  télégraphe.
- **`opts.pitch`** :
  - `kill` : palier de chaîne, de 0 à 9 ;
  - `tir` : rotation de 0 à 4 ;
  - `tir.arc` : rang du saut ;
  - `palier` : de 0 à 6 ;
  - `porte` et `devore` : rang ;
  - `lasso` : n, de 2 à 8 notes ;
  - `bip` : rotation ;
  - `butin` : la garde le fournit elle-même (escalier sur 1,2 s).
- **Aucun kill muet** : un kill dans les 40 ms du précédent ne rejoue pas le corps. Il ajoute la note de
  `kill.pile`, un degré plus haut et +1 dB par rang (+6 dB au plus), au moins 12 ms après la précédente.
  La garde ne fusionne jamais un kill. Sur la scène de charge, on compte 15 kills demandés et 15 joués.
- **La réserve de voix** (`reserve: n`) sert à `tir`, `salve`, `impact`, `tirEnnemi` et `butin`. Ces sons
  ont une seule couche et sont joués sur n voix créées une fois par panoramique, qui tournent en silence :
  une lecture ne crée aucun nœud. C'est ce qui tient le plafond de 60 nœuds par seconde.
- **`salve`** fusionne à 125 ms : 48 demandes par seconde donnent au plus 8 sons par seconde.
- **`esquive`** est ce que chaque son retire à la musique (0,30 pour le kill, relâchée en 120 ms par le
  lot 7b, § 5.7).

## Les critères et leurs résultats

Ils viennent de `REFONTE.md` § 5.7, § 5.8 et lot 7b, et de `N.R.son`. Le dernier passage du banc donne
**70 rendus, 0 échec, 0 erreur de page, 86 boutons pressés**.

| Critère | Cible | Mesuré |
|---|---|---|
| Crête de chaque son, à toutes ses hauteurs | ≤ −1 dBFS, et à ± 1 dB de son `niveau` | tenu (la plus forte : −2,0) |
| Énergie au-dessus de 400 Hz (haut-parleur de téléphone) | ≥ 25 % pour chaque son | tenu (la plus basse : 32 %, `explosion` ; 35 à 40 % pour les sons de danger) |
| Énergie au-dessus de 4 kHz (jamais agaçant) | ≤ 12 % pour les sons fréquents, ≤ 30 % pour les autres | tenu |
| Audible au téléphone | RMS sur 30 ms après passe-haut à 350 Hz ≥ −32 dBFS, soit 12 dB sous la musique au calme | tenu |
| `kill`, `coupe` et `mort` au-dessus de la musique au chaos (−14 dBFS RMS) | 3 à 6 dB (RMS sur 100 ms) | +3,2 / +3,2 / +4,3 dB ; **+11,0 / +8,7 / +11,9 dB au téléphone** (la musique y perd 9 dB, les sons presque rien) |
| `tir` sous le `kill` | ≥ 6 dB | 20 dB (en crête : 10 dB) |
| Corrélation `tir` / `tirEnnemi` | < 0,5 | 0,10 |
| Nœuds créés sur la scène de charge (16 tourelles à l'ULTIME, CANON II à 9 tirs/s, 3 kills/s, 6 impacts/s, 4 tirs ennemis/s…) | < 60 par seconde | **42 par seconde**, plus 205 nœuds de réserve créés une fois |
| Durée | au plus 1,25 × la durée déclarée + 30 ms | tenu |
| Tonalité | toutes les notes en ré pentatonique ou hexatonique | tenu (si bémol déclaré dans `colosseMort` seulement) |

La musique de référence est le bloc `musique/nv-03.mp3` (PLATEAU), ramené à −14 dBFS RMS pleine bande
(chaos), et à −20 dBFS RMS au téléphone pour le calme : ce sont les cibles du § 5.7.

**À savoir pour le mixage.** La scène de charge, sommée sans maître, atteint **+1,5 dBFS** en crête, pour
un RMS de −20 dBFS. Le genou doux du maître de `30-music.js` doit rester en place, et la crête de −1 dBFS
se mesure après lui.

### Paires proches, gardées en connaissance de cause

Le banc signale deux sons d'une même classe dont les centroïdes sont à moins de 20 % **et** les durées à
moins de 30 %. Sept paires restent signalées. Elles se distinguent par le contour ou par la texture, que
ce double critère ne voit pas :

| Paire | Ce qui les distingue |
|---|---|
| `tir.missile` / `devore` | souffle de bruit, contre une note qui remonte d'une octave |
| `traversee` / `vie` | nappe qui flotte avec vibrato, contre une ritournelle de cinq notes |
| `repli` / `lasso` | deux verrous métalliques puis un accord, contre un accord égrené |
| `bigkill` / `crash` | souffle et grave, contre de la tôle (bruit métallique) |
| `arme.visee` et `arme.laser` / `traqueur` | servo continu ou charge qui monte, contre une sirène à deux notes en alternance |
| `coupe` / `battement` | un seul coup qui tombe, contre un double coup (lub-dub) |

## Les sons, mesurés

Chaque recette porte en commentaire son intention : son geste, son modèle d'arcade, son rôle. Les valeurs
ci-dessous viennent du dernier passage du banc, à la hauteur de base.

#### Joueuse : timbres clairs

*impulsions douces et triangles, aigus ronds, au-dessus de 500 Hz.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `tir` | tir du CANON (paliers I et II) ; une note de la pentatonique par tir, en rotation | -12.01 | -30.92 | 0.035 | 99 % | 0 % | 945 | 6 |
| `tir.lance` | CANON III : deux lances perforantes | -11 | -25.6 | 0.055 | 75 % | 5 % | 1049 | 6 |
| `tir.rayon` | ULTIME RAYON : un grain de bourdon toutes les tics (au plus 8 par seconde, ils se recouvrent en continu) | -19 | -31.5 | 0.11 | 100 % | 0 % | 1073 | 6 |
| `tir.arc` | ARC : chaque saut monte d'un degre (opts.pitch = rang du saut) | -13 | -32.89 | 0.04 | 99 % | 1 % | 1062 | 6 |
| `tir.missile` | MISSILES : depart de la salve de missiles | -17 | -28.91 | 0.127 | 100 % | 1 % | 828 | 5 |
| `tir.mine` | MINES DE QUEUE : une mine posee | -16 | -32.29 | 0.051 | 92 % | 0 % | 726 | 4 |
| `salve` | tirs des TOURELLES et des DRONES d'une meme image, fusionnes ; au plus 8 par seconde | -17 | -32.06 | 0.048 | 100 % | 5 % | 1399 | 4 |
| `boostOn` | l'acceleration s'enclenche | -13 | -22.06 | 0.268 | 54 % | 3 % | 974 | 8 |
| `boostOff` | l'acceleration se relache (la joueuse lache le geste) | -18 | -29.84 | 0.143 | 89 % | 8 % | 1486 | 5 |
| `boostPanne` | panne franche de la reserve : un seul clic grave | -15 | -32.97 | 0.058 | 68 % | 0 % | 602 | 6 |
| `traversee` | pouvoir TRAVERSEE : le serpent devient fantome 1,4 s | -12 | -19.84 | 0.54 | 100 % | 1 % | 1207 | 11 |
| `ralenti` | pouvoir RALENTI : le monde passe a 0,35 | -12 | -19.3 | 0.49 | 99 % | 1 % | 852 | 5 |
| `repli` | pouvoir REPLI : le corps se replie et s'epaissit d'un coup | -11 | -21.83 | 0.326 | 75 % | 0 % | 653 | 14 |
| `pouvoirPret` | le pouvoir est recharge : bip discret | -18 | -28.8 | 0.118 | 100 % | 6 % | 1972 | 2 |
| `ultimePret` | l'APOGEE est pleine (la premiere fois avec son geste) | -10 | -19.3 | 0.781 | 100 % | 1 % | 1012 | 24 |
| `ultime` | l'APOGEE part : six anneaux, le monde ralentit (la musique plonge, accent a part) | -3 | -12.3 | 0.614 | 57 % | 3 % | 657 | 32 |
| `lasso` | LASSO referme : un accord de n notes, n = ennemis enfermes (opts.pitch, 2 a 8) | -8 | -18.21 | 0.318 | 100 % | 0 % | 689 | 11 |
| `fermable` | la tete arrive a 14 px d'un point refermable : petit tic | -18 | -34.95 | 0.019 | 99 % | 0 % | 1176 | 2 |
| `vie` | VIE + 1 : la pastille de vie nait | -10 | -17.76 | 0.482 | 100 % | 0 % | 1356 | 25 |
| `porte` | LE VOL : une porte traversee ; monte d'un degre par porte (opts.pitch) | -12 | -23.91 | 0.134 | 100 % | 0 % | 662 | 7 |
| `devore` | INVERSION : une proie devoree ; monte d'un degre par proie (opts.pitch) | -9 | -18.97 | 0.127 | 77 % | 1 % | 828 | 5 |

#### Impacts

*attaque de bruit dans les mediums, corps tonal bref, sous-grave court.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `impact` | un tir de la joueuse touche un ennemi sans le tuer | -14 | -33.34 | 0.032 | 94 % | 6 % | 1772 | 6 |
| `impactBoss` | un tir touche l'oeil ou une main du CYCLOPE (metallique) | -13 | -24.58 | 0.121 | 67 % | 1 % | 1357 | 7 |
| `ricochet` | un tir ricoche sur le blindage frontal de la TOURELLE | -16 | -29.57 | 0.093 | 100 % | 2 % | 1464 | 5 |
| `kill` | un ennemi detruit ; monte d'un degre de la pentatonique par palier de chaine (opts.pitch 0 a 9) | -2.2 | -10.8 | 0.156 | 92 % | 0 % | 880 | 10 |
| `kill.pile` | note empilée d'un kill rapproché | -10 | -27.78 | 0.029 | 100 % | 0 % | 809 | 4 |
| `bigkill` | une elite detruite | -3 | -12.7 | 0.387 | 40 % | 1 % | 711 | 15 |
| `crash` | le RIVAL s'ecrase (CRASH !) | -3 | -10.86 | 0.402 | 47 % | 1 % | 634 | 10 |
| `explosion` | une mine ou une charge explose (reactions en chaine, mines de queue) | -6 | -18.4 | 0.227 | 32 % | 1 % | 757 | 7 |
| `colosseMort` | le CYCLOPE meurt : explosion, puis cadence majeure si bemol - do - re | -2 | -11.79 | 2.05 | 71 % | 1 % | 879 | 44 |

#### Ennemis et arene : mediums reches

*dents de scie et impulsions etroites filtrees, resonance, 300 Hz a 1,8 kHz.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `tirEnnemi` | un ennemi tire (balle de tourelle, salve radiale du CYCLOPE) | -15.01 | -27.07 | 0.093 | 92 % | 0 % | 706 | 9 |
| `arme.bond` | FLECHE (et LARVE) : se fige 0,6 s, puis bondit | -18 | -27.75 | 0.556 | 100 % | 0 % | 1126 | 5 |
| `arme.verrouillage` | DARD : verrouille 0,6 s, cible gelee | -17 | -27.16 | 0.562 | 100 % | 0 % | 1416 | 3 |
| `arme.visee` | TOURELLE : vise 0,75 s (servo qui pivote) | -19 | -25.11 | 0.671 | 100 % | 0 % | 1136 | 5 |
| `arme.laser` | SENTINELLE (et RAYON du CYCLOPE) : le laser charge 0,85 s | -15 | -22.17 | 0.808 | 86 % | 0 % | 936 | 6 |
| `arme.recul` | LAME : recule 0,6 s pendant que son laser s'allonge (lame qu'on aiguise) | -16 | -24.82 | 0.526 | 46 % | 1 % | 739 | 6 |
| `arme.meche` | MINE (et RUCHE) : la meche de 0,8 s, dont le tic accelere | -16 | -30.17 | 0.823 | 100 % | 0 % | 1506 | 3 |
| `arme.coupeRoute` | RIVAL : le coupe-route, 0,5 s (le moteur rugit) | -14 | -22.21 | 0.434 | 54 % | 0 % | 523 | 12 |
| `portail` | un portail s'ouvre : tic panoramise du cote de l'arrivee | -15 | -33.05 | 0.064 | 100 % | 2 % | 1967 | 3 |
| `traqueur` | le TRAQUEUR arrive : sirene sur deux notes (la - re) | -9 | -16.85 | 0.85 | 95 % | 0 % | 1101 | 8 |
| `convoi` | un CONVOI est annonce : klaxon panoramise (deux coups) | -8 | -19.3 | 0.623 | 60 % | 0 % | 609 | 18 |
| `travelling` | depart du TRAVELLING : le plateau avance (grondement) | -8 | -20.7 | 1.207 | 47 % | 0 % | 570 | 13 |
| `warning` | WARNING : le CYCLOPE arrive (corne entre 1,3 et 1,8 kHz, deux appels) | -3 | -11.54 | 1.301 | 64 % | 0 % | 1014 | 16 |

#### Ressources : cloches

*sinus et triangles a partiels, attaque nette, queue cristalline.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `butin` | une cellule ramassee ; la serie monte d'une marche de l'hexatonique par ramassage dans les 1,2 s, jusqu'a l'octave (+12 demi-tons, N.R.son.butin), puis y tient | -15 | -23.73 | 0.106 | 100 % | 0 % | 699 | 6 |
| `noyau` | un noyau ramasse : arpege de cloches | -11 | -20.6 | 0.349 | 100 % | 1 % | 1106 | 16 |
| `pastille` | la PASTILLE avalee : l'INVERSION commence (accord ouvert) | -9 | -17.98 | 0.535 | 98 % | 0 % | 951 | 20 |

#### Danger : graves satures, avec medium

*dents de scie saturees et carrees qui tombent, toujours doublees dans les mediums.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `coupe` | le corps est coupe (tir, lame, mine, larve, mur arriere) | -2 | -10.77 | 0.264 | 40 % | 0 % | 544 | 12 |
| `mort` | la mort : apres la coupure net de la musique, glissando carre descendant d'une octave et demie en 0,9 s | -2 | -9.68 | 0.861 | 74 % | 0 % | 647 | 14 |
| `gameover` | GAME OVER : jingle de quatre notes sur le temps (croches au tempo de la piste) | -6 | -13.82 | 1.539 | 36 % | 0 % | 442 | 34 |
| `battement` | danger proche : un lub-dub (joue a 1 Hz, deux fois plus vite au plus pres) | -10 | -26.26 | 0.225 | 35 % | 0 % | 462 | 16 |

#### Recompenses

*accords et arpeges majeurs (fa majeur, relatif de re mineur), impulsions 25 %.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `palier` | palier de multiplicateur atteint (×2 a ×8) : accord majeur qui monte d'un degre par palier (opts.pitch 0 a 6) | -10 | -19.87 | 0.238 | 100 % | 0 % | 1043 | 15 |
| `levelup` | montee de niveau : arpege majeur (fa la do fa la) | -9 | -19.17 | 0.752 | 99 % | 1 % | 1041 | 31 |
| `carte` | l'ecran des cartes s'ouvre (quinte aerienne qui s'allume) | -14 | -23.73 | 0.502 | 100 % | 0 % | 915 | 15 |
| `choix` | une carte choisie (validation) | -12 | -23.77 | 0.193 | 100 % | 3 % | 1478 | 8 |
| `vague` | VAGUE NETTOYEE : « ta-daa » de cuivres de puce (le stinger musical suit sur la barre) | -8 | -16.26 | 0.668 | 78 % | 0 % | 838 | 28 |
| `defi` | un defi reussi (et DEFILE PARFAIT, VOL PARFAIT) | -10 | -17.41 | 0.387 | 100 % | 1 % | 1427 | 9 |
| `defiRate` | un defi rate : deux notes qui descendent, sans moquerie | -14 | -20.22 | 0.364 | 97 % | 0 % | 669 | 8 |
| `record` | NOUVEAU RECORD : fanfare (re re re la, puis accord de fa majeur tenu) | -7 | -17.23 | 1.384 | 72 % | 0 % | 793 | 27 |

#### Interface

*impulsions 12,5 %, tres breves, discretes.*

| Son | Événement | Crête (dBFS) | RMS 100 ms | Durée (s) | > 400 Hz | > 4 kHz | Centroïde (Hz) | Nœuds |
|---|---|---|---|---|---|---|---|---|
| `bip` | une lettre qui s'ecrit, une ligne de bonus comptee (carre a 12,5 %, 30 ms) | -18 | -34.89 | 0.025 | 100 % | 2 % | 1936 | 3 |
| `clic` | un bouton touche, un choix de menu | -15 | -31.08 | 0.022 | 99 % | 2 % | 1173 | 4 |
