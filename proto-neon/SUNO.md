# SNAKE 2975 — la musique avec Suno

Le moteur génératif du jeu (`src/30-music.js`) reste en place : il suit l'action image par image, fait
les sons et monte avec la tension. Les morceaux Suno viennent par-dessus, là où une vraie production
fait la différence : l'écran-titre, les cinématiques, le jeu, le boss et les écrans de fin. Le jeu
enchaîne les morceaux en fondu sur le temps fort et module leur filtre avec la tension. Sans morceau
Suno, le moteur génératif joue seul et rien ne casse.

## Mise à jour du 17 octobre au soir — à lire en premier

Le jeu est maintenant construit autour de **ton morceau « Neon Velocity »** (`snake2030/neonvelocity-2.mp3`),
mesuré à **115 BPM, en ré mineur**, et découpé en blocs de 8 mesures qui s'enchaînent selon l'action
(`proto-neon/musique/`). Pour que les nouveaux morceaux Suno puissent s'enchaîner avec lui dans le même
séquenceur, **ajoute à chaque style : `115 bpm, D minor`** (au lieu des tempos indiqués plus bas, sauf
pour `victoire` et `defaite`, libres). Dépose les MP3 dans `proto-neon/musique/brut/` sur la branche
`claude/snake-game-mobile-17dqpi` (fais `git pull --rebase` avant de pousser : la session cloud pousse
souvent). La session cloud les récupère, les découpe et les branche.

## Ce qu'il faut faire, depuis le téléphone

1. Dans Suno, mode **Custom**, interrupteur **Instrumental** activé, un morceau par ligne du tableau.
   Copier le style dans « Style of Music » et la liste « à exclure » dans « Exclude styles ».
2. Pour chaque morceau retenu : **Partager → Copier le lien**, puis coller les liens dans la
   conversation. Le MP3 se télécharge depuis `cdn1.suno.ai` : ce domaine doit être ajouté, comme
   celui des vidéos, aux « Allowed domains » de l'environnement (réglages de l'environnement, Network
   access).
3. À défaut, déposer les MP3 dans le dépôt, dossier `proto-neon/musique/`, sur la branche
   `claude/snake-game-mobile-17dqpi` (github.com → Add file → Upload files).

Deux variantes par morceau, c'est mieux : on garde la meilleure à l'écoute dans le jeu.

## Les morceaux

Règle commune, c'est la réponse à « pas agaçante » : pas de voix, pas de lead suraigu, des médiums
chauds, des arrangements qui évoluent et ne bouclent pas toutes les huit mesures.

**À exclure (pour tous)** : `vocals, choir, spoken word, screeching lead, high-pitched whistle, harsh noise, dubstep wobble`

| fichier | titre Suno | durée visée | style (« Style of Music ») |
|---|---|---|---|
| `titre.mp3` | Snake 2975 — Neon Horizon | 2 à 3 min | `instrumental synthwave, 98 bpm, warm Juno pads, slow analog arpeggio, gated reverb drums, nostalgic 1984 night drive, dreamy, evolving, cinematic, no vocals` |
| `ouverture.mp3` | Snake 2975 — Wake Up, Serpent | 45 s à 1 min | `cinematic darksynth intro, slow build from silence, deep sub drones, rising arpeggio, tension swell, huge final hit, retro-futuristic, no vocals` |
| `jeu-calme.mp3` | Snake 2975 — Data Stream | 3 à 4 min | `instrumental outrun, 115 bpm, driving analog bassline, light electronic drums, hypnotic arpeggios, focused and steady, evolving sections, no vocals` |
| `jeu-tension.mp3` | Snake 2975 — Grid Pressure | 3 à 4 min | `instrumental darksynth, 115 bpm, pulsing bass, punchy drums, dark minor arpeggios, rising tension, cyberpunk chase, evolving, no vocals` |
| `boss.mp3` | Snake 2975 — The Titan | 2 à 3 min | `epic darksynth boss battle, 128 bpm, heavy distorted bass, massive drums, aggressive arpeggios, menacing, relentless, cinematic, no vocals` |
| `victoire.mp3` | Snake 2975 — Breakthrough | 30 à 45 s | `triumphant synthwave fanfare, bright analog brass synths, uplifting chords, big drums, short victory theme, no vocals` |
| `defaite.mp3` | Snake 2975 — Signal Lost | 20 à 30 s | `melancholic synthwave outro, slow, warm pads, detuned tape, fading arpeggio, soft and short, no vocals` |

Les deux morceaux de jeu partagent le tempo de 115 bpm : le jeu passe de l'un à l'autre sur la mesure
quand la tension monte, sans rupture.
