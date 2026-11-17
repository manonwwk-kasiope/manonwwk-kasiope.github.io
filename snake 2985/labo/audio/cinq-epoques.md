# Musique, armes et pouls des cinq époques

18/11/2026 · 00 h 11 (Paris)

**[Écouter les cinq époques en rafale](cinq-epoques-en-rafale.wav)**. Les cinq blocs durent chacun trois secondes. Le même scénario passe du phosphore au carré bruité, à l’arpège, à la FM puis au synthétiseur ample. Le fichier mono présente les cinq MP3 locaux à leur vitesse de jeu. Mesure FFmpeg du fichier final : −24,6 LUFS intégrés et −9,3 dBTP.

| Époque | Musique affectée | Identité des armes et des annonces | Pulsation à vitesse de jeu |
|---|---|---|---:|
| 1976 · phosphore 2 bits | *Neon Velocity*, plateau instrumental | Carré aux partiels impairs, sans bruit ajouté | 143,76 BPM |
| 1985 · ville 4 bits | *Électro Tension* | Carré resserré avec attaque bruitée et déterministe | 146,07 BPM |
| 1995 · arcade express 8 bits | *Électro Titan* | Triangle adouci et arpège de quatre pas à 42 ms | 150,28 BPM |
| 2185 · 16 bits | *Voix Machine* | Modulation de fréquence et attaque PCM synthétique quantifiée | 144,47 BPM |
| 2985 · 32 bits | *Voix Plus Vite* | Fondamentale claire, octave et deux couches légèrement désaccordées en stéréo | 147,48 BPM |

Cette affectation est un choix de direction sonore. Le plateau de *Neon Velocity* donne au terminal une grille plus exploitable que son ouverture. Les deux morceaux électroniques instrumentaux accompagnent ensuite la ville puis l’arcade. Les textures vocales arrivent dans les deux futurs. Les étiquettes de résolution décrivent l’esthétique. Les timbres n’utilisent aucun échantillon d’une machine historique.

## Où tombe réellement la pulsation

| Année | Premier signal du fichier, s | Début de boucle, s | Ancre acoustique de la première mesure, s | BPM source | Écart médian à une attaque locale sur la moitié réservée | Flux sur grille / hors grille |
|---|---:|---:|---:|---:|---:|---:|
| 1976 | 0,000 | 16,704 | 16,699 | 143,76 | 31,9 ms | 1,80 |
| 1985 | 0,000 | 46,573 | 46,566 | 123,79 | 6,0 ms | 3,90 |
| 1995 | 0,000 | 20,857 | 20,847 | 142,44 | 8,0 ms | 3,20 |
| 2185 | 0,180 | 29,399 | 29,399 | 132,54 | 6,0 ms | 3,51 |
| 2985 | 0,090 | 30,412 | 30,404 | 136,56 | 3,7 ms | 7,01 |

Le PCM mono est décodé à 12 kHz. Le premier signal correspond au début de la première fenêtre de 30 ms dont le niveau moyen dépasse −50 dBFS, avec un pas de 5 ms. Les horodatages de mesures existants servent d’hypothèse de grille. Le flux spectral positif de cinq bandes déplace cette grille de −10 à 0 ms suivant le morceau. Seule la première moitié règle ce déplacement. Sur la seconde moitié, le banc mesure la distance entre chaque temps attendu et le maximum de flux dans ±65 ms. Le rapport au flux hors grille compare les attaques attendues à sept déphasages. Pour le phosphore, préférer une respiration large à un flash précis : c’est la boucle dont l’attaque est la moins nette. [Analyse reproductible](analyse-pouls.py) · [Grilles et paramètres réellement utilisés](pouls.json)

## Vérification en charge

Seize graines de rafale par année sont réparties sur quatre passages du MP3, aux vitesses du tableau. Elles mêlent rail, arc, nova, recettes forgées, anneaux de vol, menaces et traversées. Les gains testés sont 0,79 × 0,82 sur la musique et 0,32 × 0,72 sur la sortie FX. Dans les cinq palettes, les annonces critiques sont préparées à 1,8 fois leur gain de référence pour conserver une marge face au MP3. Les mêmes paramètres sont appliqués au mode brut et au mode prioritaire pour la comparaison. Chaque année conserve **128/128 boss et 64/64 traversées** dans le budget de huit voix. La simulation mono en utilise au plus six simultanément. Le pic maximal de l’ensemble est −2,47 dBFS, sans échantillon hors plage avant limiteur.

| Année | Boss / reste, médiane | Plan / reste, médiane | Crête du mix prioritaire |
|---|---:|---:|---:|
| 1976 | −11,21 dB | −13,37 dB | −2,47 dBFS |
| 1985 | −9,21 dB | −11,21 dB | −5,92 dBFS |
| 1995 | −7,44 dB | −9,89 dB | −6,05 dBFS |
| 2185 | −9,44 dB | −11,30 dB | −5,91 dBFS |
| 2985 | −9,54 dB | −11,42 dB | −6,58 dBFS |

Les dix paires de palettes produisent des formes d’onde différentes pour la même attaque de boss. Le banc vérifie l’admission des événements et mesure un rapport de puissance sur leur durée. La reconnaissance des années et des alertes par des joueurs ainsi que les performances d’iOS restent à vérifier. Les sorties stéréo de la synthèse restent disponibles dans le module. [Résultats, graines, fenêtres, modes brut et prioritaire](mesures-epoques.json)

## API du laboratoire

- `SnakeAudioPriority.create(context, sortieFX, {year: 1995, limit: 8})` crée la banque de timbres dans le contexte déjà possédé par le jeu. Appeler `setYear(2185)` au changement d’époque, puis `handles(info)` et `play(info)` à la consommation d’un événement du moteur. La banque gère rail, arc, nova, forge, vols, traversées et annonces de boss. Garder les effets terminaux et les changements d’état musicaux dans l’hôte. [Module de synthèse](priorites.js)
- `SnakePulse.create(rows, year)` reçoit les lignes décodées de `pouls.json` et expose `track`, `loopStart`, `loopEnd`, `rate`. Utiliser ces bornes pour la lecture du MP3. Les secondes de fichier restent exprimées avant application de la vitesse. Créer une nouvelle horloge au changement de morceau. [Module d’horloge](horloge.js)
- À chaque image, appeler `sample({now, mediaTime, playing, audible, playbackRate})`. `now` est une horloge monotone en secondes ; `mediaTime` est le temps du lecteur dans le MP3. Si le lecteur est silencieux, indisponible, bloqué en chargement ou en recherche, lui passer `audible: false`. Le repli continue depuis la dernière position connue, boucle à la limite, se fige en pause et se recale à la reprise du média. Signaler la transition de pause même si le rendu s’interrompt. L’objet retourné fournit `phase` de 0 à 1, `pulse` de 1 au temps vers 0 entre les temps, `bar`, `beat`, `bpm` et `source`. Les visuels peuvent utiliser `pulse` sans démarrer le lecteur.
- Reproduire avec le Python local muni de NumPy : `python3 analyse-pouls.py`, puis `node test-epoques.cjs`. Pour revalider les scénarios précédents : `node test-priorites.cjs`. Les commandes écrivent des données et un WAV sans lancer de périphérique audio. [Banc des cinq années](test-epoques.cjs)

## Lecteur de campagne prêt à brancher

Mis à jour le 18/11/2026 à 00 h 17 (Paris).

[Le lecteur de campagne](bande-campagne.js) crée une seule sortie Web Audio et décode le MP3 de l’année à la demande. Une source bouclée conserve les points de mesure et la vitesse de la prise. Les années conservent séparément leur position. L’approche d’un boss augmente progressivement la musique de 0,62 à 0,79 fois le volume choisi, sur le même morceau. Le signal d’entrée et la prime musicale du gardien médian ou final passent par le mixeur prioritaire de l’époque. Le test de formes d’onde distingue les dix couples entrée/prime. Le lecteur réutilise les points de boucle du moteur historique, la grille acoustique et les synthèses de ce laboratoire.

**Chargement.** Depuis la chambre, charger les scripts dans cet ordre : `../audio/pouls-data.js`, `../audio/horloge.js`, `../audio/priorites.js`, `../audio/bande-campagne.js`. Le point d’entrée est `window.SnakeCampagneSon`. Cette instance remplace le routage audio de la chambre lorsque le prototype est activé. Les appels compatibles avec le jeu existant sont `start`, `sector`, `scene`, `event`, `beat`, `setVolumes`, `setMuted`, `pause`, `resume` et `stop`. Les compléments sont `pulse()`, `status`, `prepareOffline()` et `dispose()`.

**Gestes et gardes.** `start(annéeOuIndex)` démarre silencieusement le pouls et restaure la position. Le bouton Son appelle directement `await setMuted(false)` dans le geste utilisateur. En cas de refus, l’horloge visuelle continue et `status.error` indique la cause. `scene(annéeOuIndex, difficulté, proximité, typeDeBoss)` ajuste la pression et sélectionne la bonne piste. `event(e)` consomme chaque événement une fois. `beat()` donne la phase entre les temps et `pulse()` expose l’enveloppe et les indices de mesure. Les volumes restent dans `musicLevel` et `fxLevel`. L’orientation seule conserve la source. La pause ordinaire stoppe toutes les sources et `resume()` reprend selon le mute courant. L’arrière-plan, la sortie de page et l’interruption du contexte coupent le gain maître, arrêtent la musique et les voix, invalident les chargements différés et imposent le réarmement par le bouton Son. Après `dispose()`, le contexte et les écouteurs sont fermés.

**Hors ligne.** Sur une origine HTTP locale ou HTTPS, `await prepareOffline()` vérifie la présence des cinq MP3 dans CacheStorage, en utilisant aussi le cache du jeu quand il existe. Il renvoie les cinq noms après vérification. Cette opération charge les fichiers sans créer de contexte audio. Les réglages et positions sont enregistrés aux transitions et toutes les cinq secondes de progression observée. Pour rouvrir la chambre entièrement sans connexion, son hôte doit également avoir mis en cache sa page et les quatre scripts ci-dessus. Une URL `file://` dépend des restrictions d’accès local du navigateur. Le bouton Son demeure nécessaire après un rechargement.

**Vérification.** Huit tests automatisés couvrent notamment le passage des cinq musiques, la restauration des positions, les dix couples gardien/prime, la course entre changement d’année et décodage, les interruptions, les gardes de visibilité, les volumes et la réutilisation des cinq MP3 complets après coupure simulée du réseau. Les appels Web Audio utilisent des sources simulées. Les durées des cinq fichiers ont été contrôlées avec FFprobe et dépassent leur borne de boucle. Les trois bancs se reproduisent sans périphérique avec `node --test test-bande-campagne.cjs`, `node test-epoques.cjs` et `node test-priorites.cjs`. Le décodage navigateur, le comportement audio d’iOS et le résultat perçu sur l’appareil restent à vérifier. [Tests du lecteur](test-bande-campagne.cjs)
