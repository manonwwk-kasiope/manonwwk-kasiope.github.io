# codex-02 — parties des pilotes

18/10/2026 01:25:20 (Paris).

Statut : **critères du banc satisfaits ; revue Claude attendue**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `c9483d5d806dbb93d799bd291c270c34089ce6d9f03244b5947601187b58886c`.

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
| maladroit | 1 | 19,26 | 20,25 | 1 | 480 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 2 | 18,16 | 19,00 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 3 | 19,30 | 20,25 | 1 | 720 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 4 | 15,59 | 16,25 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 5 | 16,47 | 17,25 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 6 | 31,49 | 33,25 | 1 | 7690 | ennemi, ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 7 | 60,54 | 72,00 | 2 | 14770 | ennemi, ennemi, mur, ennemi | canon, traversee, onde | 0 | fin |
| maladroit | 8 | 16,09 | 16,75 | 1 | 230 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 9 | 15,79 | 16,50 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 10 | 14,41 | 15,00 | 1 | 70 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 1 | 15,22 | 16,25 | 1 | 640 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 2 | 15,42 | 16,25 | 1 | 690 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 3 | 63,93 | 74,50 | 2 | 12540 | ennemi, mur, mur, mur | croissance | 0 | fin |
| kamikaze | 4 | 14,14 | 15,00 | 1 | 370 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 5 | 82,92 | 96,00 | 3 | 19000 | ennemi, mur, mur, ennemi | bouclier, arc, canon, missiles, croissance | 0 | fin |
| kamikaze | 6 | 14,90 | 15,75 | 1 | 530 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 7 | 17,11 | 18,00 | 1 | 840 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 8 | 66,40 | 78,25 | 2 | 16250 | ennemi, mur, mur, mur | bouclier, drones | 0 | fin |
| kamikaze | 9 | 13,48 | 14,25 | 1 | 380 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 10 | 19,95 | 21,00 | 1 | 700 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 1 | 83,97 | 93,75 | 2 | 8540 | mur, ennemi, ennemi, ennemi | bouclier | 0 | fin |
| humain | 2 | 72,97 | 81,75 | 2 | 1470 | mur, ennemi, mur | arc | 0 | fin |
| humain | 3 | 84,69 | 95,00 | 2 | 13510 | mur, ennemi, ennemi, ennemi | croissance | 0 | fin |
| humain | 4 | 67,72 | 76,50 | 2 | 1330 | mur, mur, ennemi | croissance | 0 | fin |
| humain | 5 | 62,65 | 71,25 | 2 | 1230 | ennemi, mur, ennemi | bouclier | 0 | fin |
| humain | 6 | 86,37 | 95,00 | 2 | 6930 | mur, mur, ennemi | bouclier | 0 | fin |
| humain | 7 | 55,20 | 63,75 | 2 | 1230 | ennemi, mur, ennemi | croissance | 0 | fin |
| humain | 8 | 66,44 | 75,25 | 2 | 1460 | mur, ennemi, ennemi | bouclier | 0 | fin |
| humain | 9 | 95,71 | 104,50 | 2 | 1580 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| humain | 10 | 213,99 | 237,00 | 5 | 63720 | ennemi, ennemi, ennemi, ennemi | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |
| bon | 1 | 81,14 | 89,75 | 2 | 1280 | mur, ennemi, ennemi | bouclier | 0 | fin |
| bon | 2 | 74,06 | 83,50 | 2 | 7700 | mur, ennemi, ennemi, ennemi | arc | 0 | fin |
| bon | 3 | 83,79 | 93,00 | 2 | 7120 | mur, ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 4 | 75,84 | 84,75 | 2 | 2480 | mur, mur, mur | croissance | 0 | fin |
| bon | 5 | 96,84 | 105,75 | 2 | 7360 | ennemi, ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 6 | 86,86 | 95,50 | 2 | 1320 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 7 | 61,39 | 70,75 | 2 | 1750 | mur, ennemi, ennemi | croissance, arc | 0 | fin |
| bon | 8 | 83,75 | 92,25 | 2 | 2140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 9 | 79,24 | 88,00 | 2 | 1450 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 10 | 179,02 | 198,50 | 4 | 47410 | mur, ennemi, ennemi, ennemi | arc, missiles, drones, reparation, missiles, croissance, arc | 0 | fin |
| expert | 1 | 402,26 | 438,75 | 5 | 135000 | mur, ennemi, ennemi | bouclier, canon, puissance, arc, tourelles, missiles, arc, puissance, traversee, sangFroid | 0 | fin |
| expert | 2 | 403,99 | 436,00 | 5 | 88600 | ennemi, ennemi, tir, laser, ennemi | arc, cadence, arc, onde, canon, puissance, epines, puissance, cadence, braise | 0 | fin |
| expert | 3 | 73,64 | 82,25 | 2 | 1230 | mur, ennemi, ennemi | croissance | 0 | fin |
| expert | 4 | 81,76 | 90,50 | 2 | 1560 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 5 | 71,73 | 80,00 | 2 | 1140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 6 | 63,82 | 72,25 | 2 | 1270 | mur, ennemi, ennemi | bouclier | 0 | fin |
| expert | 7 | 64,99 | 73,50 | 2 | 1460 | mur, ennemi, ennemi | arc | 0 | fin |
| expert | 8 | 68,91 | 77,50 | 2 | 1300 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 9 | 75,70 | 84,00 | 2 | 1150 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 10 | 58,98 | 68,25 | 2 | 1810 | ennemi, ennemi, ennemi | arc, traversee | 0 | fin |
| dieu | 1 | 377,62 | 414,50 | 5 | 184800 | — | bouclier, canon, croissance, arc, missiles, arc, drones, cadence, traversee, reparation | 0 | fin |
| dieu | 2 | 465,17 | 503,75 | 5 | 179680 | — | arc, arc, cadence, onde, canon, puissance, epines, puissance, cadence, braise | 0 | fin |
| dieu | 3 | 361,44 | 398,50 | 5 | 151420 | — | croissance, missiles, arc, reparation, bouclier, puissance, cadence, aimant, braise, sillage | 0 | fin |
| dieu | 4 | 384,13 | 421,50 | 5 | 200010 | — | croissance, canon, bouclier, arc, tourelles, missiles, croissance, reparation, aimant, sangFroid | 0 | fin |
| dieu | 5 | 351,89 | 388,50 | 5 | 181480 | — | bouclier, arc, puissance, drones, missiles, traversee, canon, cadence, drones | 0 | fin |
| dieu | 6 | 355,69 | 391,75 | 5 | 190780 | — | bouclier, tourelles, canon, missiles, arc, puissance, tourelles, missiles, arc | 0 | fin |
| dieu | 7 | 343,49 | 382,00 | 5 | 157700 | — | croissance, tourelles, drones, minesQ, tourelles, croissance, puissance, puissance, drones, reparation | 0 | fin |
| dieu | 8 | 377,03 | 414,25 | 5 | 172200 | — | bouclier, canon, arc, puissance, puissance, aimant, grappe, tourelles, missiles, puissance | 0 | fin |
| dieu | 9 | 431,36 | 471,50 | 5 | 164800 | — | croissance, tourelles, drones, aimant, canon, croissance, cadence, tourelles, bouclier, arc | 0 | fin |
| dieu | 10 | 377,09 | 414,25 | 5 | 139260 | — | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 10 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.
