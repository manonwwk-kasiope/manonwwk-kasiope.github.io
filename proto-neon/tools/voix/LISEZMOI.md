# La voix de la machine : `sons/voix.js`

La voix de borne de SNAKE 2975 (REFONTE.md § 5.8, quintessence, principe 11) : douze mots d'arcade
synthétisés par formants en Web Audio. Aucun fichier audio, aucune dépendance, aucune URL. Le fichier est un
script ordinaire qui déclare `var VOIX_2975` ; il tient dans la fermeture « use strict » du bundle de
`build.mjs` comme dans une balise `<script>`, et s'exporte aussi pour Node.

**En une ligne** : les 12 mots sont reconnus, 12 sur 12, par un reconnaisseur vocal automatique (épreuve
fermée parmi 80 mots dont 68 pièges), en brut comme à travers un haut-parleur de téléphone simulé. espeak,
synthétiseur à formants de référence, fait 11 sur 12 sur la même épreuve.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `sons/voix.js` | les phonèmes, les douze recettes de mots, le timbre, le graphe Web Audio, le précalcul |
| `tools/voix/ecoute.html` | la page d'écoute (ouvrir le fichier directement, aucun serveur) : un bouton par mot, les réglages en curseurs, la simulation de téléphone, la pose sur le temps (144,6 BPM), le spectrogramme avec les formants prévus en pointillés, la table des mesures |
| `tools/voix/analyse.js` | les mesures (niveaux, spectre, f0, formants par LPC), partagées par la page et le banc |
| `tools/voix/mesure.mjs` | le banc : chaque mot rendu hors ligne (OfflineAudioContext, Chromium via Playwright), puis mesuré ; calibrage ; planche |
| `tools/voix/reconnait.py` | la contre-épreuve d'intelligibilité, par PocketSphinx |
| `tools/voix/mesure.json`, `reconnaissance.json` | les résultats du dernier passage (`planche.png`, les spectrogrammes, est régénérée par `--planche` et reste hors du dépôt, comme toute capture de `tools/`) |

## Pour le lot son (`30-music.js`, `N.music.voix(mot)`)

```js
// au chargement (ou au premier toucher) : précalcul des six mots du contrat, 34 ms par mot dans Chromium
const voix = {};
for (const m of VOIX_2975.contrat) VOIX_2975.rendre(m).then(b => { voix[m] = b; });

// N.music.voix('WARNING') : l'attaque de la voyelle accentuée sur le prochain temps fort
function direVoix(mot, tempsFort) {
  const b = voix[mot]; if (!b) return;                       // pas encore prêt : le mot s'écrit seulement
  const s = ctx.createBufferSource(); s.buffer = b; s.connect(busVoix);
  s.start(tempsFort - b.voix.appui);                          // appui : début du mot -> attaque accentuée
}
```

- **`rendre(mot, opts?, sr?)`** : promesse d'un `AudioBuffer` mono, normalisé à la crête du mot, avec
  `buffer.voix = { mot, appui, fin }`. C'est le **chemin conseillé** : un seul nœud à la lecture, et ce que
  mesure le banc. Le résultat est mis en cache par mot et réglages.
- **`construire(ctx, dest, mot, t0, opts?)`** : le même mot, en direct sur le graphe. 30 nœuds environ pour la
  durée du mot et de son écho, qui se débranchent seuls. Gains calibrés par `CAL` (crête au niveau du mot avec
  les réglages par défaut).
- **`appui(mot)`** (s) : de 0,03 (EXCELLENT, qui commence par sa voyelle) à 0,36 (NEW RECORD). On pose
  `t0 = tempsFort − appui`.
- **`duree(mot)`** : durée totale, écho compris. `pistes(mot)` : la partition (courbes de F1 à F3, AV, AH,
  AF, f0), pure. `texte(mot)` : `GAMEOVER` → « GAME OVER ». `contrat` : les six clés de `N.R.voix`.
- **Les clés** sont celles du contrat : `READY GO WARNING DANGER EXCELLENT GAMEOVER`. Hors contrat, et
  disponibles : `CHAIN PERFECT NEWRECORD BOSS LEVEL CLEAR`, les six que la quintessence ajoute au vocabulaire.

**Le mixage recommandé** :

- crête des mots entre −3 et −2 dBFS (`MOTS[mot].niveau`) ; RMS du mot sec entre −12 et −18 dBFS ;
- RMS du mot sec en simulation de téléphone entre −14 et −21 dBFS : c'est le niveau d'une musique calme
  (−20 dBFS au § 5.7). **Il faut donc esquiver la musique sous la voix** : ×0,3 (−10 dB), de
  `t0 − 0,05 s` à la fin du mot sec, relâchée en 120 ms. La voix passe alors de 6 à 10 dB au-dessus ;
- un bus propre, hors du compresseur des effets (qui écraserait les consonnes), avec son propre volume ;
- au plus un mot toutes les 4 s (`son.voix.intervalle`) : la traîne d'écho dure de 1,9 à 3,1 s au total ;
- panoramique centré.

## Le vocabulaire

`!` marque la voyelle d'appui ; les durées sont en ms.

| Mot | Contrat | Recette | Sec (s) | Appui (s) | Crête dBFS | RMS / tél. dBFS | > 400 Hz | Reconnu (brut, tél.) |
|---|---|---|---|---|---|---|---|---|
| READY | oui | r 105 · eh! 175 · dx 32 · iy 250 | 0,65 | 0,135 | −3 | −15,0 / −19,9 | 35 % | oui, oui |
| GO | oui | g 70 · ow! 400 | 0,53 | 0,100 | −2 | −11,8 / −15,4 | 42 % | oui, oui |
| WARNING | oui | w 95 · ao! 175 · r 85 · n 75 · ih 125 · ng 190 | 0,82 | 0,125 | −2 | −15,0 / −17,2 | 64 % | oui, oui |
| DANGER | oui | d 65 · ey! 230 · n 70 · jh 115 · er 270 | 0,81 | 0,095 | −3 | −15,4 / −19,3 | 56 % | oui, oui |
| EXCELLENT | oui | eh! 165 · k 75 · s 125 · ax 70 · l 80 · ax 70 · n 85 · t 70 | 0,77 | 0,030 | −2 | −18,2 / −21,3 | 60 % | oui, oui |
| GAME OVER | oui | g 75 · ey! 240 · m 120 · ow! 270 · v 80 · er 380 | 1,23 | 0,105 | −2 | −13,5 / −17,3 | 46 % | oui, oui |
| CHAIN | — | ch 95 · ey! 240 · n 170 | 0,55 | 0,125 | −2 | −15,8 / −20,6 | 44 % | oui, oui |
| PERFECT | — | p 85 · er! 190 · f 105 · ih 105 · k 70 · t 70 | 0,63 | 0,115 | −3 | −16,4 / −19,8 | 52 % | oui, oui |
| NEW RECORD | — | n 75 · uw 170 · r 85 · eh! 160 · k 85 · er 210 · d 60 | 0,91 | 0,360 | −3 | −16,8 / −20,2 | 57 % | oui, oui |
| BOSS | — | b 65 · ao! 290 · s 230 | 0,59 | 0,095 | −2 | −12,9 / −14,1 | 92 % | oui, oui |
| LEVEL | — | l 95 · eh! 170 · v 75 · ax 55 · el 200 | 0,67 | 0,125 | −3 | −16,3 / −19,8 | 50 % | oui, oui |
| CLEAR | — | k 105 · l 75 · ih! 120 · iy 60 · ir 250 | 0,67 | 0,210 | −3 | −15,0 / −18,9 | 44 % | oui, oui |

Sur tous les mots :

- **f0** : mesuré entre 92,8 et 110,1 Hz (contrat : 90 à 110) ;
- **formants** : F1 et F2 retrouvés par LPC à 3,1 % de leur cible en moyenne (10 % au plus, sur 50
  mesures) ; l'indice acoustique va de 0,87 à 1 ;
- **aigus** : 0 à 0,4 % de l'énergie au-dessus de 4 kHz, donc aucune sifflante agressive ;
- **bande utile** : au moins 35 % de l'énergie au-dessus de 400 Hz (la banque en demande 25 %) ;
- **écho** : la première répétition arrive de 77 à 367 ms après la fin du mot sec, jamais dessus.

## Le timbre

La chaîne de `construire()`, dans l'ordre :

1. **La source** : une dent de scie qui suit la hauteur de la recette (90 à 110 Hz, une déclinaison
   d'annonceur, la voyelle accentuée en haut). Elle est doublée d'une dent de scie à l'octave inférieure
   (`octave` 0,55 : le poids, la voix « géante ») et d'une troisième désaccordée de 9 cents (`chorus` 0,38 :
   l'épaisseur, le battement métallique). Un souffle à 3,5 % y est mêlé (`souffle` : la râpe de la puce).
2. **Le conduit** : cinq résonateurs en cascade, comme chez Klatt (1980). F1, F2 et F3 sont automatisés
   phonème par phonème, avec des largeurs de bande ×0,8, plus étroites que nature, donc plus métalliques. F4
   (3,3 kHz) et F5 (3,85 kHz) sont fixes. Un anti-formant s'ouvre pendant m, n et ng (−18 dB). Les formants
   sont mis à l'échelle ×0,95 (`taille`), un conduit un peu plus long qu'un humain.
3. **Les consonnes** : un bruit blanc à graine fixe, reproductible. Il passe dans le conduit pour
   l'aspiration (h, et l'aspiration de p, t, k), ou dans un passe-bande propre pour la friction (s, ch, f, v,
   zh), les explosions et le souffle des sourdes. Les lieux sont marqués : explosion compacte et
   « pincement » F2-F3 pour k et g, explosion haute pour t et d, prévoisement des b, d et g. Tous les bruits
   sont renforcés de 4 dB (`consonnes`) : une voix d'annonceur, articulée.
4. **La présence** : une étagère de +7 dB au-dessus de 1,6 kHz, et une coupe sous 160 Hz. Le grave reste
   perçu par l'écart des harmoniques, et le téléphone gagne 1 dB.
5. **Le métal** : un peigne à réinjection (`metal` 0,5) dont la période est celle de **ré 4**
   (293,66 Hz), la tonique du morceau. La caisse de la borne résonne dans le ton.
6. **La saturation** : un tanh doux (`grain` 1,8, crêtes vers 0,5 à son entrée).
7. **L'écho** : à **trois croches** du morceau (0,622 s), réinjection 0,3, passe-bas à 2,4 kHz. Il ne
   reprend que **la dernière syllabe** : « GAME OVER … ver … ver ». Le mot reste sec et net, sa fin résonne
   dans la salle.

Tous ces réglages sont dans `DEFAUT` et se surchargent à l'appel :
`rendre('GAMEOVER', { vitesse: 1.15, echo: 0.3 })`. Pour des essais, on peut aussi surcharger un phonème
(`{ ph: { l: { f: [340, 1200, 2800] } } }`) ou une recette entière (`{ mots: { GO: { ph: [...] } } }`).

## Comment on l'a mis au point

Je n'ai pas d'oreille ; mes juges ont été la mesure et un reconnaisseur vocal. Le premier rendu était
reconnu 1 fois sur 12. Chaque étape ci-dessous a été mesurée sur les douze mots, souvent avec quatre à huit
variantes jouées en parallèle.

| Étape | Effet mesuré | Décision |
|---|---|---|
| Juge de référence : espeak (synthèse à formants) sur la même épreuve | 11/12 brut et tél., 5/12 dans le bruit | le juge est fiable s'il a 0,3 s de silence tramé autour du mot (un silence numérique pur fausse ses cepstres) |
| Saturation attaquée à 2-4 de crête (écrêtage) | 1/12 → 7/12 une fois corrigée | entrée de saturation vers 0,5 |
| Cascade à 3 pôles : 3,2-6,4 kHz à −30 dB sous espeak | + F4 et F5 en vrais résonateurs : 8/12 | gardé |
| Anti-formant nasal, prévoisement, explosions et aspirations plus fortes | 10/12 | gardé |
| `taille` 0,93 : les voyelles glissent vers leurs voisines (« ih » → « eh ») | 0,97 puis 0,95 | 0,95 |
| GO entendu « call » : F2 d'attaque trop bas | F2 à 1 130 Hz comme espeak : reconnu | gardé |
| Pincement vélaire, souffle large bande des sourdes | | gardé |
| l clair (F2 1 350 Hz) | EXCELLENT devient « accident » | l sombre (1 050 Hz) |
| CLEAR entendu « lever » | ih court qui glisse vers iy, r final à F3 1 750 Hz (`ir`) : 12/12 | gardé |
| Écho à la croche, même limité à la dernière syllabe | 12/12 → 7/12 : il chevauche la voyelle | trois croches : il tombe après le mot |
| Peigne, octave, chorus poussés (0,5 ; 0,55 ; 0,38) | toujours 12/12, et mieux au téléphone que la voix nue (12 contre 10) | gardé |
| Saturation plus forte (`pre` 2 à 4) | +3 à +5 dB de RMS, mais 8 à 10/12 | écartée |
| Compression avant saturation | 6 à 8/12 | écartée (option `compression`) |
| Branche d'éclat parallèle à 3,5 kHz | 8 à 12/12, sans gain dans le bruit | écartée (option `eclat`) |
| Limiteur à anticipation sur le précalcul | +1,5 à +3 dB de RMS, CHAIN fragile au téléphone | écarté (option `limiteur`) |
| « ch » de CHAIN à 120 ms, entendu « shame » | 95 ms : reconnu | gardé |

## Mesurer

```sh
node proto-neon/tools/voix/mesure.mjs                     # mesure.json et le résumé
node proto-neon/tools/voix/mesure.mjs --calibre           # réécrit le bloc CAL de sons/voix.js
node proto-neon/tools/voix/mesure.mjs --planche           # planche.png
node proto-neon/tools/voix/mesure.mjs --reglages '{"metal":0}' --mots READY,GO   # essai, dans out-essai.json

# la contre-épreuve (outil de mesure seulement, hors du jeu) :
python3 -m venv /tmp/v && /tmp/v/bin/pip install pocketsphinx numpy scipy
node proto-neon/tools/voix/mesure.mjs --wav /tmp/voix-sec --sec --reconnait /tmp/v/bin/python
```

`reconnait.py` passe trois épreuves sur chaque mot sec :

- **épreuve fermée** : le mot doit sortir parmi les 12 mots et 68 pièges qui lui ressemblent (READY : steady,
  rainy… ; WARNING : morning, warming… ; DANGER : ranger, stranger…) ;
- **transcription libre** : avec le modèle de langue général de PocketSphinx ;
- **trois versions du son** : brut ; « téléphone » (passe-haut 350 Hz d'ordre 4, passe-bas 7 kHz) ;
  « musique » (bruit rose 9 dB sous la voix).

Les WAV restent hors du dépôt.

**Les résultats du dernier passage** :

| | Brut | Téléphone | Dans le bruit |
|---|---|---|---|
| Épreuve fermée | 12/12 | 12/12 | 3/12 |
| Transcription libre | 6/12 | 5/12 | 2/12 |
| espeak, épreuve fermée | 11/12 | 11/12 | 5/12 |
| espeak, transcription libre | 4/12 | 3/12 | 0/12 |

En transcription libre, sans aucune aide, le reconnaisseur écrit en toutes lettres READY, DANGER, EXCELLENT,
PERFECT, BOSS et LEVEL, et souvent GAME OVER selon les réglages.

## Les limites, dites franchement

- **Personne n'a écouté.** « Frissons » et « jamais agaçant » sont visés par construction : grave, lent,
  dans le ton, sans aigus durs, écho de salle. Je ne peux pas les prouver. La première écoute de la
  propriétaire dans `tools/voix/ecoute.html` fera foi. Tout se règle aux curseurs, puis dans `DEFAUT`.
- **Le juge est un reconnaisseur entraîné sur des voix humaines**, et sévère pour une voix de robot. Il ne
  lit pas le mot à l'écran, contrairement à la joueuse. Ses verdicts flottent d'un mot quand on retouche un
  réglage de 10 % : les marges de GO, WARNING et CHAIN sont étroites.
- **Dans le bruit (3/12)**, la voix fait moins bien qu'espeak (5/12) : les consonnes sourdes s'y noient.
  D'où l'esquive de la musique, indispensable.
- **La couche à l'octave inférieure** (45 à 55 Hz) double la source, qui reste entre 90 et 110 Hz comme le
  veut le contrat. Une lecture stricte de `son.voix.source` se règle avec `octave: 0`. Ce réglage a été
  mesuré à 12/12 en brut comme au téléphone (2/12 dans le bruit), au prix du poids de la voix.
- Les six mots hors contrat ne sont branchés nulle part : à la direction de décider s'ils entrent dans
  `N.R.voix`.
