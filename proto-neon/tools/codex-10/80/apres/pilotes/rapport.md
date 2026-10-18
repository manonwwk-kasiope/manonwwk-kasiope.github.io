# codex-02 — parties des pilotes

18/10/2026 02:36:26 (Paris).

Statut : **lot non validé**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `ba7740c648de147ca589bd30933eee52df855de38f709b118869fd67001cebb5`.

Profil iPhone 13 paysage 844 × 390, __DT=1/60, profil vierge par partie, S.jour=20261017. Départ plongée ; simulation officielle par tranches de 0,25 s, arrêt au premier état fin observé ou à 540 s de jeu. Borne de secours à quatre fois ce temps en pas simulés ; détection d’une séquence figée au-delà de dix secondes de pas. Aucun réglage du jeu changé. Les gardes et intermèdes ne sont pas sautés. TempsJeu vient de N.horloge.t(), tempsSimule du nombre de pas (inclut les arrêts d’horloge). Un écran de fin figé reste observé jusqu’à la fin de la tranche en cours. Les éventuelles vues S absentes sont publiées dans donneesDebut/Fin.

| Pilote | Graine | Jeu s | Pas simulés s | Vague | Score | Causes de mort | Cartes | Erreurs | Arrêt |
|---|---:|---:|---:|---:|---:|---|---|---:|---|
| inerte | 1 | 25,29 | 26,00 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| inerte | 2 | 24,78 | 25,50 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| inerte | 3 | 24,96 | 25,50 | 1 | 60 | mur, ennemi, mur | — | 0 | fin |
| inerte | 4 | 24,88 | 25,50 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| inerte | 5 | 26,27 | 27,00 | 1 | 20 | mur, mur, ennemi | — | 0 | fin |
| inerte | 6 | 40,13 | 40,75 | 1 | 1040 | mur, mur, mur | — | 0 | fin |
| inerte | 7 | 26,31 | 27,00 | 1 | 50 | mur, mur, ennemi | — | 0 | fin |
| inerte | 8 | 25,32 | 26,00 | 1 | 100 | mur, ennemi, mur | — | 0 | fin |
| inerte | 9 | 40,13 | 40,75 | 1 | 1020 | mur, mur, mur | — | 0 | fin |
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
| maladroit | 6 | 62,82 | 74,00 | 2 | 10840 | ennemi, mur, mur, mur | minesQ, bouclier, traversee | 0 | fin |
| maladroit | 7 | 55,97 | 66,50 | 2 | 8670 | ennemi, ennemi, mur, ennemi | croissance, traversee, onde | 0 | fin |
| maladroit | 8 | 16,09 | 16,75 | 1 | 230 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 9 | 15,79 | 16,50 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 10 | 14,41 | 15,00 | 1 | 70 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 1 | 15,22 | 16,25 | 1 | 640 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 2 | 15,42 | 16,25 | 1 | 690 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 3 | 54,01 | 63,75 | 2 | 9820 | ennemi, mur, ennemi, ennemi | croissance, arc | 0 | fin |
| kamikaze | 4 | 14,14 | 15,00 | 1 | 370 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 5 | 81,97 | 93,50 | 2 | 16110 | ennemi, mur, mur, mur | bouclier, arc | 0 | fin |
| kamikaze | 6 | 14,90 | 15,75 | 1 | 530 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 7 | 17,11 | 18,00 | 1 | 840 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 8 | 43,56 | 53,50 | 2 | 9820 | ennemi, ennemi, mur, mur | bouclier, drones | 0 | fin |
| kamikaze | 9 | 13,48 | 14,25 | 1 | 380 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 10 | 19,95 | 21,00 | 1 | 700 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 1 | 83,85 | 92,50 | 2 | 1730 | mur, ennemi, ennemi | bouclier | 0 | fin |
| humain | 2 | 141,77 | 155,00 | 3 | 19170 | mur, ennemi, ennemi, ennemi | arc, arc, cadence, onde | 0 | fin |
| humain | 3 | 75,55 | 84,25 | 2 | 1280 | mur, ennemi, ennemi | croissance | 0 | fin |
| humain | 4 | 87,59 | 97,00 | 2 | 7580 | mur, ennemi, ennemi, ennemi | croissance | 0 | fin |
| humain | 5 | 166,55 | 183,00 | 3 | 31880 | ennemi, mur, mur, mur | bouclier, arc, canon, missiles, croissance, drones, aimant, epines | 0 | fin |
| humain | 6 | 80,86 | 89,50 | 2 | 1160 | mur, ennemi, ennemi | bouclier | 0 | fin |
| humain | 7 | 55,09 | 63,75 | 2 | 1200 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| humain | 8 | 81,18 | 90,25 | 2 | 7470 | ennemi, ennemi, ennemi, ennemi | bouclier | 0 | fin |
| humain | 9 | 131,91 | 143,00 | 3 | 12050 | ennemi, ennemi, ennemi, ennemi | croissance, tourelles, aimant | 0 | fin |
| humain | 10 | 375,15 | 407,75 | 5 | 141000 | ennemi, mur, laser, mur, mur | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |
| bon | 1 | 146,90 | 157,75 | 3 | 17090 | mur, ennemi, ennemi, ennemi | bouclier, croissance, arc | 0 | fin |
| bon | 2 | 317,56 | 347,75 | 5 | 75250 | mur, ennemi, ennemi, laser | arc, arc, cadence, onde, canon, puissance, epines, puissance, cadence, braise | 0 | fin |
| bon | 3 | 70,19 | 78,75 | 2 | 1300 | mur, ennemi, ennemi | croissance | 0 | fin |
| bon | 4 | 129,76 | 139,50 | 3 | 4280 | ennemi, ennemi, mur | croissance, canon, bouclier | 0 | fin |
| bon | 5 | 85,49 | 95,00 | 2 | 10190 | ennemi, ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 6 | 411,52 | 443,50 | 5 | 112390 | mur, ennemi, ennemi, ennemi, tir | bouclier, tourelles, canon, missiles, arc, puissance, tourelles, missiles, arc | 0 | fin |
| bon | 7 | 173,74 | 188,25 | 3 | 46260 | mur, ennemi, ennemi, mur | croissance, tourelles, drones, minesQ, tourelles, croissance, puissance | 0 | fin |
| bon | 8 | 116,48 | 126,25 | 3 | 4250 | ennemi, mur, ennemi | bouclier, canon, arc | 0 | fin |
| bon | 9 | 77,58 | 86,25 | 2 | 1900 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 10 | 64,45 | 73,25 | 2 | 2070 | mur, ennemi, ennemi | arc | 0 | fin |
| expert | 1 | 81,31 | 90,00 | 2 | 7360 | ennemi, ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 2 | 60,49 | 69,25 | 2 | 1760 | ennemi, ennemi, ennemi | arc | 0 | fin |
| expert | 3 | 58,64 | 67,00 | 2 | 1170 | mur, ennemi, ennemi | croissance | 0 | fin |
| expert | 4 | 132,30 | 143,50 | 3 | 6020 | ennemi, ennemi, ennemi | croissance, canon, bouclier, arc | 0 | fin |
| expert | 5 | 281,40 | 303,50 | 5 | 63910 | ennemi, ennemi, ennemi, ennemi | bouclier, puissance, arc, aimant, missiles, puissance, traversee, canon, puissance, cadence | 0 | fin |
| expert | 6 | 63,29 | 71,75 | 2 | 1220 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 7 | 67,73 | 76,25 | 2 | 1200 | mur, ennemi, ennemi | arc | 0 | fin |
| expert | 8 | 68,32 | 76,75 | 2 | 1240 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 9 | 67,86 | 76,25 | 2 | 1250 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 10 | 67,72 | 76,75 | 2 | 2380 | ennemi, ennemi, ennemi | arc | 0 | fin |
| dieu | 1 | 484,79 | 521,25 | 5 | 185390 | — | bouclier, canon, croissance, arc, missiles, arc, drones, cadence, traversee, reparation | 0 | fin |
| dieu | 2 | 540,23 | 574,00 | 5 | 148460 | — | arc, arc, cadence, onde, canon, puissance, epines, puissance, cadence, braise | 0 | borne |
| dieu | 3 | 491,53 | 527,00 | 5 | 148860 | — | croissance, missiles, arc, reparation, bouclier, puissance, cadence, aimant, braise, sillage | 0 | fin |
| dieu | 4 | 447,22 | 480,75 | 5 | 138470 | — | croissance, canon, bouclier, tourelles, missiles, puissance, tourelles, croissance, aimant | 0 | fin |
| dieu | 5 | 431,53 | 467,75 | 5 | 154960 | — | bouclier, arc, puissance, drones, missiles, traversee, canon, cadence, drones | 0 | fin |
| dieu | 6 | 390,00 | 425,75 | 5 | 159410 | — | bouclier, tourelles, canon, missiles, arc, puissance, tourelles, missiles, arc | 0 | fin |
| dieu | 7 | 427,11 | 465,00 | 5 | 173230 | — | croissance, tourelles, drones, minesQ, tourelles, croissance, puissance, puissance, drones, reparation | 0 | fin |
| dieu | 8 | 374,69 | 409,25 | 5 | 166400 | — | bouclier, canon, arc, puissance, puissance, aimant, grappe, tourelles, missiles, puissance | 0 | fin |
| dieu | 9 | 502,02 | 541,00 | 5 | 172540 | — | croissance, tourelles, drones, aimant, canon, croissance, cadence, tourelles, bouclier, arc | 0 | fin |
| dieu | 10 | 413,51 | 448,75 | 5 | 153850 | — | arc, missiles, drones, reparation, missiles, croissance, arc, missiles, arc, reparation | 0 | fin |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 10 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.
