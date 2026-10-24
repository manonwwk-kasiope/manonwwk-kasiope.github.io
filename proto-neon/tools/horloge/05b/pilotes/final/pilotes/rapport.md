# codex-02 — parties des pilotes

18/10/2026 01:32:47 (Paris).

Statut : **critères du banc satisfaits ; revue Claude attendue**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `16a7b5ee5775d623ad9fb67487d75ebd6248e1d2b4de1ef4f4b386fd86c36d14`.

Profil iPhone 13 paysage 844 × 390, __DT=1/60, profil vierge par partie, S.jour=20261017. Départ plongée ; simulation officielle par tranches de 0,25 s, arrêt au premier état fin observé ou à 540 s de jeu. Borne de secours à quatre fois ce temps en pas simulés ; détection d’une séquence figée au-delà de dix secondes de pas. Aucun réglage du jeu changé. Les gardes et intermèdes ne sont pas sautés. TempsJeu vient de N.horloge.t(), tempsSimule du nombre de pas (inclut les arrêts d’horloge). Un écran de fin figé reste observé jusqu’à la fin de la tranche en cours. Les éventuelles vues S absentes sont publiées dans donneesDebut/Fin.

| Pilote | Graine | Jeu s | Pas simulés s | Vague | Score | Causes de mort | Cartes | Erreurs | Arrêt |
|---|---:|---:|---:|---:|---:|---|---|---:|---|
| inerte | 1 | 25,29 | 26,00 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| inerte | 2 | 24,78 | 25,50 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| inerte | 3 | 24,96 | 25,50 | 1 | 60 | mur, ennemi, mur | — | 0 | fin |
| inerte | 4 | 24,88 | 25,50 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| inerte | 5 | 26,27 | 27,00 | 1 | 20 | mur, mur, ennemi | — | 0 | fin |
| inerte | 6 | 27,17 | 27,75 | 1 | 30 | mur, mur, ennemi | — | 0 | fin |
| inerte | 7 | 26,31 | 27,00 | 1 | 50 | mur, mur, ennemi | — | 0 | fin |
| inerte | 8 | 25,32 | 26,00 | 1 | 100 | mur, ennemi, mur | — | 0 | fin |
| inerte | 9 | 26,88 | 27,50 | 1 | 10 | mur, mur, ennemi | — | 0 | fin |
| inerte | 10 | 26,33 | 27,00 | 1 | 10 | mur, mur, ennemi | — | 0 | fin |
| tourneur | 1 | 20,19 | 21,25 | 1 | 1370 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 2 | 17,66 | 18,50 | 1 | 270 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 3 | 20,25 | 21,00 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 4 | 14,70 | 15,25 | 1 | 0 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 5 | 14,43 | 15,00 | 1 | 100 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 6 | 17,99 | 18,75 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 7 | 16,21 | 17,00 | 1 | 100 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 8 | 19,69 | 20,50 | 1 | 540 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 9 | 16,46 | 17,25 | 1 | 340 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 10 | 19,41 | 20,25 | 1 | 1380 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 1 | 21,01 | 22,25 | 1 | 550 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 2 | 18,16 | 19,00 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 3 | 19,30 | 20,25 | 1 | 720 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 4 | 15,59 | 16,25 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 5 | 16,47 | 17,25 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 6 | 125,45 | 141,00 | 3 | 20560 | ennemi, mur, ennemi, ennemi | aimant, minesQ, bouclier, puissance, cadence, canon | 0 | fin |
| maladroit | 7 | 36,42 | 38,50 | 1 | 7100 | ennemi, ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 8 | 16,09 | 16,75 | 1 | 230 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 9 | 15,79 | 16,50 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 10 | 14,41 | 15,00 | 1 | 70 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 1 | 15,22 | 16,25 | 1 | 640 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 2 | 15,42 | 16,25 | 1 | 690 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 3 | 65,12 | 75,75 | 2 | 13670 | ennemi, mur, mur, mur | croissance | 0 | fin |
| kamikaze | 4 | 14,14 | 15,00 | 1 | 370 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 5 | 75,47 | 88,25 | 3 | 17440 | ennemi, mur, mur, mur | bouclier, arc, canon, missiles, croissance | 0 | fin |
| kamikaze | 6 | 14,90 | 15,75 | 1 | 530 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 7 | 17,11 | 18,00 | 1 | 840 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 8 | 43,02 | 53,75 | 2 | 11640 | ennemi, ennemi, mur, mur | bouclier, drones | 0 | fin |
| kamikaze | 9 | 13,48 | 14,25 | 1 | 380 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 10 | 19,95 | 21,00 | 1 | 700 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 1 | 95,35 | 105,25 | 2 | 8380 | mur, ennemi, ennemi, ennemi | bouclier | 0 | fin |
| humain | 2 | 71,95 | 81,00 | 2 | 1460 | mur, ennemi, ennemi | arc | 0 | fin |
| humain | 3 | 368,99 | 406,25 | 5 | 125430 | mur, ennemi, laser, mur, mur | croissance, missiles, arc, reparation, bouclier, puissance, cadence, aimant, braise, sillage | 0 | fin |
| humain | 4 | 58,43 | 67,25 | 2 | 1280 | mur, mur, mur | croissance | 0 | fin |
| humain | 5 | 62,65 | 71,25 | 2 | 1230 | ennemi, mur, ennemi | bouclier | 0 | fin |
| humain | 6 | 86,37 | 95,00 | 2 | 6930 | mur, mur, ennemi | bouclier | 0 | fin |
| humain | 7 | 55,19 | 63,75 | 2 | 1230 | ennemi, mur, ennemi | croissance | 0 | fin |
| humain | 8 | 66,44 | 75,25 | 2 | 1460 | mur, ennemi, ennemi | bouclier | 0 | fin |
| humain | 9 | 90,97 | 100,00 | 2 | 8280 | ennemi, ennemi, ennemi, ennemi | croissance | 0 | fin |
| humain | 10 | 315,22 | 351,50 | 5 | 145520 | ennemi, laser, tir, mur, ennemi | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |
| bon | 1 | 81,13 | 89,75 | 2 | 1280 | mur, ennemi, ennemi | bouclier | 0 | fin |
| bon | 2 | 69,16 | 78,50 | 2 | 7110 | mur, mur, ennemi, ennemi | arc | 0 | fin |
| bon | 3 | 84,02 | 93,25 | 2 | 7120 | mur, ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 4 | 75,83 | 84,75 | 2 | 2480 | mur, mur, mur | croissance | 0 | fin |
| bon | 5 | 79,63 | 88,25 | 2 | 1140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 6 | 86,86 | 95,50 | 2 | 1340 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 7 | 414,36 | 455,00 | 5 | 148880 | mur, ennemi, ennemi, mur | croissance, arc, arc, drones, aimant, tourelles, cadence, drones, croissance, drones, reparation | 0 | fin |
| bon | 8 | 83,75 | 92,50 | 2 | 2140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 9 | 79,23 | 88,00 | 2 | 1450 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 10 | 285,69 | 319,25 | 5 | 80960 | mur, ennemi, mur, laser, ennemi | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |
| expert | 1 | 98,17 | 107,25 | 2 | 2470 | mur, ennemi, ennemi | bouclier | 0 | fin |
| expert | 2 | 133,94 | 146,25 | 3 | 23190 | ennemi, ennemi, ennemi, ennemi | arc, cadence, arc, onde | 0 | fin |
| expert | 3 | 73,49 | 82,00 | 2 | 1250 | mur, ennemi, ennemi | croissance | 0 | fin |
| expert | 4 | 66,93 | 75,75 | 2 | 1190 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 5 | 71,73 | 80,00 | 2 | 1140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 6 | 63,82 | 72,25 | 2 | 1260 | mur, ennemi, ennemi | bouclier | 0 | fin |
| expert | 7 | 66,28 | 74,75 | 2 | 1320 | mur, ennemi, ennemi | arc | 0 | fin |
| expert | 8 | 90,28 | 99,00 | 2 | 1680 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 9 | 75,70 | 84,25 | 2 | 1150 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 10 | 312,60 | 347,25 | 5 | 107370 | ennemi, ennemi, ennemi, laser, mur | arc, traversee, canon, aimant, drones, tourelles, arc, tourelles, arc, sangFroid | 0 | fin |
| dieu | 1 | 414,51 | 453,50 | 5 | 188040 | — | bouclier, canon, croissance, arc, missiles, arc, drones, cadence, traversee, reparation | 0 | fin |
| dieu | 2 | 478,77 | 518,75 | 5 | 189200 | — | arc, arc, cadence, onde, canon, puissance, epines, puissance, cadence, braise | 0 | fin |
| dieu | 3 | 402,26 | 442,25 | 5 | 166640 | — | croissance, missiles, arc, reparation, bouclier, puissance, cadence, aimant, braise, sillage | 0 | fin |
| dieu | 4 | 391,34 | 430,50 | 5 | 175000 | — | croissance, canon, bouclier, arc, tourelles, missiles, croissance, reparation, aimant, sangFroid | 0 | fin |
| dieu | 5 | 347,06 | 385,25 | 5 | 204030 | — | bouclier, arc, puissance, drones, missiles, traversee, canon, cadence, drones | 0 | fin |
| dieu | 6 | 340,45 | 379,00 | 5 | 167380 | — | bouclier, tourelles, canon, missiles, arc, puissance, tourelles, missiles, arc | 0 | fin |
| dieu | 7 | 404,64 | 446,25 | 5 | 183780 | — | croissance, tourelles, drones, minesQ, tourelles, croissance, puissance, puissance, drones, reparation | 0 | fin |
| dieu | 8 | 363,82 | 401,50 | 5 | 165130 | — | bouclier, canon, arc, puissance, puissance, aimant, grappe, tourelles, missiles, puissance | 0 | fin |
| dieu | 9 | 444,98 | 485,75 | 5 | 164220 | — | croissance, tourelles, drones, aimant, canon, croissance, cadence, tourelles, bouclier, arc | 0 | fin |
| dieu | 10 | 340,93 | 378,75 | 5 | 161160 | — | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 10 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.
