# La piste musicale de SNAKE 2975 (lot 7a, première partie)

« Neon Velocity », de manonwwk (Suno), `snake2030/neonvelocity-2.mp3`, découpée en **17 blocs MP3** qui
s'enchaînent sans couture, décrits par `musique/piste.json`. Ce dossier contient les outils, l'analyse
et les preuves ; le dossier `proto-neon/musique/` contient ce que le jeu charge.

## En bref

| | Valeur mesurée |
|---|---|
| Tempo | **114,995 BPM, constant** (Suno : 115). **Pas 144,6.** |
| Mesure | **2,08705 s** (4 temps de 0,52176 s), 131 mesures complètes, puis 1,57 s de queue |
| Première mesure | à t = 0 (−0,6 ms : le morceau commence sur le premier temps fort, en plein son) |
| Tonalité | **ré mineur** : éolien (si bémol) dans PLATEAU et RETOUR, avec un do dièse fréquent ; dorien (si naturel) dans INTRO, PONT et RESPIRATION |
| Blocs | 17 fichiers, 4,8 Mo en tout : 8 mesures (16,7 s) alignées sur les phrases, plus 1 mesure de recouvrement de chaque côté |
| Format | MP3 CBR 112 kb/s, stéréo, 44,1 kHz, en-tête Xing et LAME (retard 576, bourrage), sans pochette ni ID3 |
| Jointures | décalage 0 échantillon (ffmpeg et Chromium) ; erreur dans la jointure au plus 0,7 dB au-dessus du bruit du codec ; 220 enchaînements vérifiés, aucun clic |

## La décision sur le tempo : 115 BPM, pas 144,6

Le chiffre de 144,6 BPM vient de la constante `K.MUSIC_BPM` de `snake2030/src/10-core.js` ; rien ne
montre qu'il ait été mesuré. La mesure le dément :

- l'autocorrélation de l'enveloppe d'attaque culmine à 0,5224 s (114,8 BPM, à la résolution de 5,8 ms
  près) dans toutes les sections et dans les trois bandes (grave, médium, aigu), avec ses multiples
  1,045 s et 2,09 s. Aucun pic à 0,415 s (144,6 BPM) ;
- le repliement de l'enveloppe au millième de BPM donne 114,998 ;
- 222 temps recalés sur l'attaque grave réelle, à 1 ms près, donnent par régression **114,9951 BPM** et
  une origine à −0,6 ms ; la dérive locale (fenêtres de 8 mesures) reste sous 0,19 % et l'écart de
  phase sous 6 ms, ce qui est le bruit du détecteur. Le plan fixe le seuil de dérive à 0,5 % :
  **le tempo est constant**, les blocs sont coupés sur la grille calculée, et chaque bloc porte quand
  même sa mesure mesurée sur ses propres attaques (`mesureMesuree`, de 2,0852 à 2,0879 s) ;
- la première version du morceau (`snake2030/neonvelocity.mp3`) est à 110 BPM, pas plus à 144,6.

**Conséquence pour les autres lots** : partout où le plan, `02-regles.js` ou `CONTRAT.md` écrivent
144,6 BPM ou 1,6598 s, il faut lire **114,995 BPM et 2,08705 s** (voir « À reporter » en bas). Le plus
simple est que `N.R` lise `bpm` et `mesureS` de `piste.json`, ou recopie ces deux nombres.

## La structure

| Section | Mesures | Temps | Niveau | Blocs | Usage |
|---|---|---|---|---|---|
| INTRO | 1 à 8 | 0 à 16,70 s | −25 dB | nv-01 | titre, briefing, attraction ; boucle sur 3 à 8 |
| PLATEAU | 9 à 56 | 16,70 à 116,87 s | −14,6 dB | nv-02 à nv-07 | les vagues et LE VOL ; décollage à la mesure 9 ; nv-05 (33 à 40) est un creux relatif (−15,4 dB) |
| PONT | 57 à 58 | 116,87 à 121,05 s | −26 dB | nv-08 | cassure de 2 mesures (accord de do), levée vers la RESPIRATION |
| RESPIRATION | 59 à 82 | 121,05 à 171,14 s | −21 dB | nv-09 à nv-11 | LE DÉFILÉ, répits du CYCLOPE ; nv-11 (75 à 82) remonte vers le RETOUR |
| RETOUR | 83 à 122 | 171,14 à 254,62 s | −14,5 dB | nv-12 à nv-16 | LE CYCLOPE ; boucle sur 107 à 122 (nv-15, nv-16) |
| OUTRO | 123 à 131, puis la queue | 254,62 à 274,97 s | −21 dB | nv-17 | victoire, défaite, initiales, records ; boucle sur 123 à 130 |

Les ruptures de niveau tombent exactement sur les barres des mesures 9 (+12 dB), 57 (−11 dB), 83 (+6 dB) et 123 (−6 dB) ; l'harmonie
tourne en cycles de 8 mesures qui commencent tous sur l'accord de la (mesures 9, 17, 25…, 59, 67, 75,
83…, 123) : c'est ce qui aligne les blocs sur les phrases et permet de sauter d'un bloc à l'autre
d'une même section sans faute d'harmonie.

**Correspondance avec la numérotation du plan** (mesures de 1,6598 s) : sa mesure 11 (16,6 s) est notre
9 ; sa mesure 70 (l'alerte, 116 s) notre 56 ; son PONT 71 notre 57-58 ; sa RESPIRATION 72-103 notre
59-82 ; son RETOUR 104 (171 s) notre 83 ; sa boucle de boss 136-151 (224-251 s) notre 107-122 ; son
OUTRO 154 (254 s) notre 123. Les instants du plan étaient justes, seul le compte des mesures change.

## La tonalité

Chromagramme (fenêtre de 8 192, 55 Hz à 2 kHz) pondéré par le niveau, profils de Krumhansl : **ré
mineur** (r = 0,61 ; puis fa majeur 0,46). Par section (`piste.json` → `tonalite.parSection`) :

- **PLATEAU, RETOUR** : si bémol fort (0,16), si faible (0,03) : ré éolien ; do et do dièse tous deux
  présents (l'accord de la majeur, dominante, en mineur harmonique) ;
- **INTRO, PONT, RESPIRATION** : si naturel plus fort que si bémol (accord de sol majeur) : ré dorien ;
- **OUTRO** : sixte indécise.

Conseil pour le génératif (lot 7a) : ré éolien sur PLATEAU et RETOUR, do dièse permis sur l'accord de
la ; ré dorien sur INTRO, PONT et RESPIRATION ; la pentatonique de ré mineur (ré fa sol la do) va
partout. Les accords estimés de chaque mesure sont dans `piste.json` → `mesures[].accord` et
`blocs[].accords` (estimation sur le chroma, à prendre comme une indication : la basse domine).

## Les fichiers

`proto-neon/musique/` (ce que le jeu charge ; `build.mjs` n'y prend que `piste.json` et `nv-*.mp3`) :

- `nv-01.mp3` à `nv-17.mp3` : les blocs ;
- `piste.json` : leur description (ci-dessous).

`proto-neon/tools/musique/` (jamais chargé par le jeu) :

| Fichier | Rôle |
|---|---|
| `lib.mjs` | décodage par ffmpeg (rééchantillonnage soxr 28 bits vers 44,1 kHz), FFT, WAV, corrélation, lecture de l'en-tête LAME |
| `analyse.mjs` | tempo, premier temps, grille, dérive, mesures (niveau, bandes, attaques, chroma, accord), tonalité, ruptures → `analyse.json` |
| `decoupe.mjs` | structure, découpe à l'échantillon près, encodage parallèle, enchaînements, boucles → `musique/nv-NN.mp3` et `musique/piste.json` |
| `verifie.mjs` | calage, jointures naturelles et les 220 enchaînements, décodés par ffmpeg → `verification.json` (code de sortie 1 si un critère tombe) |
| `verifie-navigateur.mjs` | les mêmes blocs décodés et enchaînés par Chromium (Web Audio, `OfflineAudioContext`) → `verification-navigateur.json` |
| `chaine.mjs` | rend une suite de blocs pour l'écoute, avec la règle de jointure du jeu : `node tools/musique/chaine.mjs sortie.mp3 nv-01 nv-02 nv-08 …` |

Reproduire tout (environ 1 min) :

```
node tools/musique/analyse.mjs && node tools/musique/decoupe.mjs \
  && node tools/musique/verifie.mjs && node tools/musique/verifie-navigateur.mjs
```

## Le format de `piste.json`

Les temps sont en secondes, les échantillons à **44 100 Hz**. « Fichier » veut dire le bloc décodé par
un décodeur qui applique l'en-tête LAME (Chromium, Firefox, ffmpeg) : le premier échantillon décodé est
le premier échantillon utile.

```
{
  version: 1, titre, auteur, source: { fichier, sha256, duree, frequence },
  bpm: 114.9951, mesureS: 2.087046, tempsS: 0.521761, tempsParMesure: 4,
  premiereMesure: -0.00064,              // instant de la mesure 1 dans la source
  nMesures: 131,
  tempo:     { decision, constant: true, deriveMaxPct, ecartPhaseMaxMs, residuMs, tempsFiables, tempsTotal },
  tonalite:  { centre: 're', mode: 'mineur', detail, conseil, krumhansl[], parSection{}, cycle },
  frequence: 44100,
  encodage:  { codec: 'mp3', debitKbps: 112, mode: 'CBR', canaux: 2, frequence: 44100, entete, pochette: false },
  sections:  [ { nom, mesures: [de, a], debut, fin, niveau, blocs: [id…], usage } ],
  sectionsJeu: {                         // ce que joue chaque N.music.section(nom), § 5.7
    titre|attraction|briefing: { section: 'INTRO', boucle: 'intro-courte' },
    jeu:    { section: 'PLATEAU', entree: { bloc: 'nv-02', mesure: 9 }, tirage },
    repit:  { section: 'RESPIRATION', levee: 'nv-08', entree: { bloc: 'nv-09', mesure: 59 }, remontee: 'nv-11' },
    alerte: { section: 'PLATEAU', mesure: 56, bloc: 'nv-07', boucle: 'alerte', note },
    boss:   { section: 'RETOUR', entree: { bloc: 'nv-12', mesure: 83 }, boucle: { de: 107, a: 122, blocs: ['nv-15', 'nv-16'] } },
    victoire|defaite|initiales: { section: 'OUTRO', bloc: 'nv-17', boucle: 'outro' (, filtre) }
  },
  reperes:   { decollage, cassure, remontee, retour, outro : { mesure, t, bloc } },
  correspondance144, memoire: { note, blocMoyenOctets44k, coeurOctets44k },
  boucles: [ { nom, bloc, de, a, debutS, finS, score } ],   // boucles internes a un bloc
  blocs: [ {
    id: 'nv-02', fichier: 'nv-02.mp3', section: 'PLATEAU', partie: null | 'creux' | 'montee',
    mesures: [9, 16], nMesures: 8,
    source: { debut, fin, fichierDebut, fichierFin },        // ou le coeur et le fichier tombent dans la source
    echantillons: { fichier, coeurDebut, coeurFin },        // le coeur dans le fichier, a 44,1 kHz
    avant, apres,                                           // recouvrements en secondes (nv-01 : avant = 0)
    avantMesures, apresMesures,
    mesureS,                                                // mesure de la grille
    barres: [9 instants],                                   // chaque barre du coeur dans le fichier, fin comprise
    mesureMesuree: { s, attaques, ecartMoyenMs, ecartMaxMs },  // sur les attaques du bloc (null si trop peu)
    niveau, creteDb, intensite,                             // intensite 0..1 (niveau et densite d'attaques)
    accords: [8 accords estimes],
    octets, lame: { encodeur, retard, bourrage, trames },
    suivants: [ { id, type: 'naturel' | 'saut' | 'boucle' | 'changement', score } ]
  } ],
  mesures: [ { m, t, niveau, accord } ]                     // les 131 mesures
}
```

**Les enchaînements** (`suivants`) : le bloc qui suit dans le morceau (`naturel`, score 1), puis tous
ceux dont le score atteint 0,5, et toujours le meilleur bloc de chaque section, pour que le séquenceur
puisse changer de section à la fin de n'importe quel bloc. `saut` va plus loin dans la même section,
`boucle` revient en arrière ou sur lui-même (dont nv-16 → nv-15, la boucle du boss), `changement`
change de section. Le score (0 à 1) est le meilleur de trois lectures : la première mesure du suivant
ressemble à celle qui suit naturellement la fin ; la dernière mesure jouée ressemble à celle qui précède
naturellement le suivant ; la fin et le début se ressemblent (même texture). Il compare niveau, bandes,
attaques, aigus, chroma et accord. Tous les `suivants` et toutes les `boucles` passent le test de clic.

**Exception** : nv-01 n'est un `suivant` que des blocs calmes (intensité < 0,65). Le morceau commence en
plein son à t = 0 ; y entrer depuis un bloc fort donne une attaque brutale (mesurée : nv-14 → nv-01
dépassait le seuil d'aigus). Depuis un bloc fort, on va au titre par l'OUTRO, ou par un fondu de sortie
puis un départ à neuf de nv-01.

## Comment le jeu doit lire un bloc (pour `30-music.js`)

1. `fetch(MUSIQUE_BASE + 'piste.json')`, puis chaque `MUSIQUE_BASE + bloc.fichier` à la demande,
   `decodeAudioData`.
2. **Le décalage.** Chromium et ffmpeg appliquent l'en-tête LAME : le décalage mesuré est de 0 échantillon
   sur les 17 blocs (`verification-navigateur.json`). Pour un décodeur qui ne l'appliquerait pas (Safari
   n'a pas pu être essayé ici), il vaudrait 1 105 échantillons à 44,1 kHz (576 de retard + 529 du
   décodeur) : le jeu le mesure lui-même, comme le prévoit le plan, en corrélant la mesure d'après du
   bloc A (`echantillons.coeurFin` et suivants) avec la première mesure du bloc B
   (`echantillons.coeurDebut` et suivants), sur ±1 500 échantillons. Il suffit de le faire une fois : le
   décalage est le même pour tous les blocs (même encodeur, mêmes réglages). À un autre taux que
   44,1 kHz, tous les nombres d'échantillons se convertissent par `× contexte.sampleRate / 44100`.
3. **Le départ** : `source.start(t, (coeurDebut + decalage) / 44100)`, à un instant `t` arrondi à
   l'échantillon du contexte. Le bloc dure `(coeurFin − coeurDebut) / 44100`, soit 8 mesures exactes.
4. **La jointure** : un fondu sin² / cos² de **10 ms centré sur la barre** (5 ms avant, 5 ms après :
   les recouvrements le permettent). Seule exception : si le bloc entrant n'a pas de recouvrement avant
   (`avant` < 5 ms, c'est-à-dire nv-01), le fondu commence sur la barre et le bloc sortant le suit,
   sinon nv-01 entrerait d'un coup à mi-gain. Une jointure à n'importe quelle barre interne (demande
   urgente, boucle) suit la même règle : les instants sont dans `barres`.
5. **Les boucles internes** (`boucles`) : de `finS` à `debutS` dans le même bloc ; `intro-courte`
   (3 à 8) pour le titre, `outro` (123 à 130) pour les écrans de fin, `alerte` (la seule mesure 56),
   `respiration` (59 à 66), `remontee` (75 à 82). La boucle de boss passe par deux blocs (nv-15, nv-16).
6. **La mémoire.** Un bloc décodé pèse `echantillons × 2 canaux × 4 octets` : 7,4 Mo à 44,1 kHz,
   8,0 Mo à 48 kHz (nv-17, avec sa queue : 7,9 et 8,6 Mo). Quatre blocs entiers dépassent donc la cible
   de 25 Mo du plan, calculée pour des blocs de 13,3 s à 144,6 BPM. Deux façons de la tenir : ne garder,
   une fois le décalage mesuré, que le cœur et 10 ms de chaque côté (5,9 Mo à 44,1 kHz, 6,4 Mo à
   48 kHz, soit 23,6 Mo ou 25,6 Mo pour quatre blocs), et ouvrir le contexte à 44,1 kHz
   (`new AudioContext({ sampleRate: 44100 })`, accepté par Safari et Chromium) ; ou ne garder que trois
   blocs décodés (le courant et les deux préchargés), ce qui tient dans 25 Mo à 48 kHz même entiers.
7. **La grille du génératif** se recale au début de chaque bloc sur `barres` (et sur le décalage mesuré),
   à 2,08705 s la mesure.

## Ce qui a été vérifié

`verifie.mjs` (décodage ffmpeg) et `verifie-navigateur.mjs` (Chromium 141, `decodeAudioData` et
`OfflineAudioContext` à 44,1 kHz, un `AudioBufferSourceNode` par bloc) :

| Critère | Seuil | Mesuré |
|---|---|---|
| Calage de chaque bloc sur la source | < 1 ms | 0 échantillon, 17 blocs, dans ffmpeg comme dans Chromium (corrélation 1,000000 entre les deux décodages) |
| Décalage entre voisins, mesuré dans la page comme le fera le jeu | < 1 ms | 0 échantillon sur les 16 jointures |
| Chaîne naturelle nv-01 → nv-17 rendue par Web Audio, comparée à la source | calée, sans couture | calée à 0,07 ms près ; erreur dans les 8 ms de chaque jointure au plus **0,7 dB** au-dessus de celle du meilleur des deux blocs lu d'un tenant ; le morceau entier recomposé par `chaine.mjs` redonne la source à 19,9 dB, le bruit du codec |
| Aucun clic, sur les 220 enchaînements et boucles déclarés et sur une chaîne de 15 sauts rendue par Chromium | pic de dérivée < le plus fort pic relevé sur une vraie barre de la piste d'origine (0,45), et pas plus de 1 dB au-dessus des deux contextes naturels ; bouffée d'aigus (dérivée seconde sur 2 ms rapportée au voisinage) sous celle des barres d'origine + 1 dB | 0 hors seuil ; la jointure la plus vive est à 1,03 fois son contexte naturel |
| Erreurs de page | 0 | 0 |

Ce qui n'a pas pu être vérifié ici : Safari (pas de WebKit sur la machine) et l'écoute humaine. La
chaîne de sauts rendue pour l'écoute se refait par `node tools/musique/chaine.mjs sauts.mp3 nv-01 nv-02
nv-05 nv-03 nv-03 nv-08 nv-09 nv-09 nv-11 nv-12 nv-16 nv-15 nv-16 nv-07 nv-17 nv-01`.

## À reporter dans `02-regles.js` et `CONTRAT.md` (par le gardien, pas par ce lot)

- `BPM` = **114.995** (ou `piste.json` → `bpm`), d'où `dureeTemps` = 0,52176 s et `dureeMesure` =
  2,08705 s ; la grille de jeu (`N.horloge.temps()`, apparitions, avance du sol) suit.
- `musique.piste` : `mesure: 2.08705`, `tonique: 'ré'`, `mode: 'mineur'` (éolien dans PLATEAU et
  RETOUR, dorien dans INTRO, PONT et RESPIRATION).
- `musique.sections` : INTRO 1-8 (0-16,7 s, −25 dB, boucle 3-8) ; PLATEAU 9-56 (16,7-116,9 s, −14,6 dB,
  décollage 9) ; PONT 57-58 (−26 dB) ; RESPIRATION 59-82 (121,0-171,1 s, −23 à −20 dB) ; RETOUR 83-122
  (171,1-254,6 s, −14,5 dB, boucle 107-122) ; OUTRO 123-131 (254,6-275 s, −21 dB).
- `musique.blocs.duree` : 16,7 s (8 mesures) ; `memoire` : 6 à 8 Mo par bloc (voir la mémoire ci-dessus).
- `musique.alerte.mesure` : **56**.
