# Séquence partie-paysage-maladroit-6

24/10/2026 02:48:00 (Paris)

Build fournie au banc ; profil paysage, graine 6, pilote maladroit, genre partie.
Départ plongée par le crochet officiel ; aucun saut pendant la partie..

Durée réelle 70.768 s ; temps de jeu 60.52875000610676 s ; arrêt fin ; état fin.

| Moment observé | Temps réel (s) | Temps jeu (s) | État | Preuve |
|---|---:|---:|---|---|
| debut | 0.006 | 0.06666666666666667 | plongee | "première image mesurée" |
| premiere-vague | 0.765 | 0.8083333333333329 | jeu | "vague 1 et état jeu" |
| drop | 3.471 | 3.52499999999999 | jeu | {"morceau":"neon-velocity","tFichier":16.70448,"mesure":11} |
| vol | 35.357 | 27.084583335368954 | vol | "état vol" |
| fin | 70.357 | 60.52875000610676 | fin | "état fin" |

Absents de cette séquence : warp, break, cyclope, espace.

Les vidéos .mp4 sont muettes. Chaque fichier .alignement.json donne le début dans la sortie audio captée, les repères r1 et leur temps vidéo. Les fichiers audio-sortie sont le mix réellement calculé (musique et effets). Les MP3 musicaux sources sont exportés dans ../audio-sources avec leur empreinte ; leur carte ne vaut que pour le fichier réellement audible, pas pour un temps de piste inventé.

Les planches contiennent les pixels exacts du tampon, sans mise à l’échelle ; l’ordre et les temps de leurs cases sont dans le JSON homonyme. Les séries drop-*.json demandent une image toutes les 0,5 s dans ±2 s ; toute image absente ou trop éloignée est marquée.

Mesures : mesures.json ; séries image par image, événements horodatés, journal complet et difficulté adaptative : brut.json.gz. Cadence CDP brute : cdp/index.json.

Limites : émulation Chrome tactile, pas Safari ni l’iPhone physique ; pilotes automatiques, pas jugement humain de la maniabilité. R-13 agrégé, pas certification WCAG. Les tirs sont horodatés lors de leur insertion réelle dans le tableau public des projectiles ; leurs positions et vitesses sont conservées. La résolution de currentTime de Web Audio et celle de la carte limitent la précision audio. Aucune note n’est attribuée ici.
