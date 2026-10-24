# Séquence partie-paysage-maladroit-10

24/10/2026 02:51:03 (Paris)

Build fournie au banc ; profil paysage, graine 10, pilote maladroit, genre partie.
Départ plongée par le crochet officiel ; aucun saut pendant la partie..

Durée réelle 26.678 s ; temps de jeu 25.73458333536896 s ; arrêt fin ; état fin.

| Moment observé | Temps réel (s) | Temps jeu (s) | État | Preuve |
|---|---:|---:|---|---|
| debut | 0.005 | 0.049999999999999996 | plongee | "première image mesurée" |
| premiere-vague | 0.775 | 0.8166666666666662 | jeu | "vague 1 et état jeu" |
| drop | 3.461 | 3.5083333333333235 | jeu | {"morceau":"neon-velocity","tFichier":16.70448,"mesure":11} |
| fin | 26.551 | 25.73458333536896 | fin | "état fin" |

Absents de cette séquence : vol, warp, break, cyclope, espace.

Les vidéos .mp4 sont muettes. Chaque fichier .alignement.json donne le début dans la sortie audio captée, les repères r1 et leur temps vidéo. Les fichiers audio-sortie sont le mix réellement calculé (musique et effets). Les MP3 musicaux sources sont exportés dans ../audio-sources avec leur empreinte ; leur carte ne vaut que pour le fichier réellement audible, pas pour un temps de piste inventé.

Les planches contiennent les pixels exacts du tampon, sans mise à l’échelle ; l’ordre et les temps de leurs cases sont dans le JSON homonyme. Les séries drop-*.json demandent une image toutes les 0,5 s dans ±2 s ; toute image absente ou trop éloignée est marquée.

Mesures : mesures.json ; séries image par image, événements horodatés, journal complet et difficulté adaptative : brut.json.gz. Cadence CDP brute : cdp/index.json.

Limites : émulation Chrome tactile, pas Safari ni l’iPhone physique ; pilotes automatiques, pas jugement humain de la maniabilité. R-13 agrégé, pas certification WCAG. Les tirs sont horodatés lors de leur insertion réelle dans le tableau public des projectiles ; leurs positions et vitesses sont conservées. La résolution de currentTime de Web Audio et celle de la carte limitent la précision audio. Aucune note n’est attribuée ici.
