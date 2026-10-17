# codex-02 — parties des pilotes

18/10/2026 00:58:23 (Paris).

Statut : **critères du banc satisfaits ; revue Claude attendue**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `6ef5e9b4b4eea46f227ade6b2ce0f5b07ca76dea961aeb4aff8f02590bc1aa8d`.

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
| maladroit | 7 | 103,70 | 117,50 | 3 | 20700 | ennemi, mur, ennemi, ennemi | canon, traversee, minesQ, puissance, reparation, missiles | 0 | fin |
| maladroit | 8 | 16,09 | 16,75 | 1 | 230 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 9 | 15,79 | 16,50 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 10 | 14,41 | 15,00 | 1 | 70 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 1 | 15,22 | 16,25 | 1 | 640 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 2 | 15,42 | 16,25 | 1 | 690 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 3 | 63,93 | 74,50 | 2 | 12540 | ennemi, mur, mur, mur | croissance | 0 | fin |
| kamikaze | 4 | 14,14 | 15,00 | 1 | 370 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 5 | 68,83 | 80,25 | 2 | 17010 | ennemi, mur, mur, mur | tourelles, bouclier | 0 | fin |
| kamikaze | 6 | 14,90 | 15,75 | 1 | 530 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 7 | 17,11 | 18,00 | 1 | 840 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 8 | 59,29 | 70,75 | 2 | 14160 | ennemi, mur, mur, mur | missiles, bouclier | 0 | fin |
| kamikaze | 9 | 13,48 | 14,25 | 1 | 380 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 10 | 19,95 | 21,00 | 1 | 700 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 1 | 66,07 | 75,00 | 2 | 2350 | mur, mur, ennemi | bouclier | 0 | fin |
| humain | 2 | 72,97 | 81,75 | 2 | 1470 | mur, ennemi, mur | arc | 0 | fin |
| humain | 3 | 89,17 | 98,25 | 2 | 7690 | mur, ennemi, ennemi, ennemi | croissance | 0 | fin |
| humain | 4 | 67,72 | 76,50 | 2 | 1330 | mur, mur, ennemi | croissance | 0 | fin |
| humain | 5 | 206,57 | 230,75 | 5 | 56190 | ennemi, mur, ennemi, ennemi | tourelles, tourelles, missiles, croissance, arc, puissance, drones, canon, missiles, puissance | 0 | fin |
| humain | 6 | 86,37 | 95,00 | 2 | 6930 | mur, mur, ennemi | bouclier | 0 | fin |
| humain | 7 | 55,26 | 63,75 | 2 | 1360 | ennemi, mur, ennemi | tourelles | 0 | fin |
| humain | 8 | 66,44 | 75,25 | 2 | 1460 | mur, ennemi, ennemi | bouclier | 0 | fin |
| humain | 9 | 90,34 | 99,00 | 2 | 1390 | mur, ennemi, ennemi | croissance | 0 | fin |
| humain | 10 | 194,54 | 214,50 | 4 | 41120 | ennemi, ennemi, mur, ennemi | arc, missiles, croissance, arc, tourelles, croissance, arc | 0 | fin |
| bon | 1 | 81,14 | 89,75 | 2 | 1280 | mur, ennemi, ennemi | bouclier | 0 | fin |
| bon | 2 | 322,72 | 356,00 | 5 | 118460 | laser, tir, tir, ennemi, ennemi | arc, tourelles, bouclier, cadence, canon, missiles, drones, croissance, puissance, drones | 0 | fin |
| bon | 3 | 84,13 | 93,00 | 2 | 2180 | mur, ennemi, ennemi | croissance | 0 | fin |
| bon | 4 | 89,85 | 99,25 | 2 | 8920 | souffle, ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 5 | 72,00 | 80,75 | 2 | 1320 | ennemi, ennemi, ennemi | tourelles | 0 | fin |
| bon | 6 | 86,86 | 95,50 | 2 | 1320 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 7 | 154,51 | 171,50 | 4 | 37390 | mur, mur, ennemi, convoi | tourelles, croissance, tourelles, missiles, aimant, canon, missiles, puissance | 0 | fin |
| bon | 8 | 83,75 | 92,25 | 2 | 2140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 9 | 74,50 | 83,25 | 2 | 1430 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 10 | 237,78 | 261,50 | 5 | 73250 | mur, ennemi, ennemi, ennemi | arc, missiles, croissance, arc, tourelles, croissance, arc, tourelles, canon, missiles | 0 | fin |
| expert | 1 | 141,33 | 153,25 | 3 | 19650 | mur, ennemi, ennemi, ennemi | bouclier, canon, tourelles, puissance | 0 | fin |
| expert | 2 | 375,44 | 413,25 | 5 | 168610 | ennemi, ennemi, ennemi | arc, tourelles, cadence, bouclier, canon, missiles, traversee, missiles, puissance, croissance | 0 | fin |
| expert | 3 | 75,69 | 84,25 | 2 | 1580 | mur, ennemi, ennemi | croissance | 0 | fin |
| expert | 4 | 69,43 | 78,25 | 2 | 1380 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 5 | 299,24 | 335,25 | 5 | 122190 | laser | tourelles, tourelles, missiles, puissance, puissance, arc, traversee, canon, missiles, puissance | 0 | fin |
| expert | 6 | 63,82 | 72,25 | 2 | 1270 | mur, ennemi, ennemi | bouclier | 0 | fin |
| expert | 7 | 65,45 | 74,00 | 2 | 1270 | mur, ennemi, ennemi | tourelles | 0 | fin |
| expert | 8 | 68,91 | 77,50 | 2 | 1300 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 9 | 75,70 | 84,00 | 2 | 1150 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 10 | 58,98 | 68,25 | 2 | 1810 | ennemi, ennemi, ennemi | arc, traversee | 0 | fin |
| dieu | 1 | 373,37 | 411,00 | 5 | 176500 | — | bouclier, tourelles, canon, croissance, tourelles, missiles, arc, missiles, traversee, aimant | 0 | fin |
| dieu | 2 | 306,16 | 342,25 | 5 | 143460 | — | arc, tourelles, bouclier, cadence, canon, missiles, drones, croissance, puissance, drones | 0 | fin |
| dieu | 3 | 420,36 | 457,25 | 5 | 181820 | — | croissance, arc, puissance, puissance, drones, traversee, croissance, drones, reparation | 0 | fin |
| dieu | 4 | 362,21 | 399,50 | 5 | 184690 | — | croissance, canon, croissance, arc, tourelles, missiles, arc, missiles, reparation, aimant | 0 | fin |
| dieu | 5 | 316,04 | 354,25 | 5 | 179720 | — | tourelles, tourelles, missiles, croissance, arc, puissance, drones, canon, missiles, puissance | 0 | fin |
| dieu | 6 | 295,62 | 331,50 | 5 | 183050 | — | bouclier, tourelles, canon, missiles, tourelles, missiles, cadence, tourelles, missiles, arc | 0 | fin |
| dieu | 7 | 282,56 | 319,00 | 5 | 115610 | — | tourelles, tourelles, missiles, drones, tourelles, missiles, croissance, tourelles, croissance, drones | 0 | fin |
| dieu | 8 | 366,69 | 405,00 | 5 | 153020 | — | bouclier, tourelles, canon, puissance, croissance, puissance, cadence, tourelles, missiles, puissance | 0 | fin |
| dieu | 9 | 348,91 | 386,75 | 5 | 178210 | — | croissance, tourelles, missiles, puissance, canon, missiles, croissance, tourelles, canon, missiles | 0 | fin |
| dieu | 10 | 315,08 | 352,00 | 5 | 187770 | — | arc, missiles, croissance, arc, tourelles, croissance, arc, tourelles, canon, missiles | 0 | fin |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 10 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.
