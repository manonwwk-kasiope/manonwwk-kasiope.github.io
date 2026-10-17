# musique/ : la piste de SNAKE 2975

« Neon Velocity » (manonwwk, Suno) en 17 blocs : `nv-01.mp3` à `nv-17.mp3` (MP3 112 kb/s, stéréo,
44,1 kHz), décrits par `piste.json`. **114,995 BPM, mesure de 2,08705 s, ré mineur.** Chargés à la
demande par `src/30-music.js` depuis `MUSIQUE_BASE` ; `build.mjs --embed` n'y prend que `piste.json`
et `nv-*.mp3`.

Le format de `piste.json`, la règle de lecture et de jointure, les mesures et les preuves sont dans
`../tools/musique/LISEZMOI.md`. Ces fichiers sont produits par `node tools/musique/decoupe.mjs` : ne
pas les retoucher à la main.
