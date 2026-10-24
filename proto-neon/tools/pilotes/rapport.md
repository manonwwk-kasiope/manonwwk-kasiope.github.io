# codex-02 — parties des pilotes

18/10/2026 00:32:17 (Paris).

Statut : **critères du banc satisfaits ; revue Claude attendue**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `dbaab852689afb63c33f8746c140d62f04f91015e5ebed0e84317d7a3b1c6f82`.

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
| humain | 5 | 221,95 | 246,50 | 5 | 55840 | ennemi, mur, ennemi, ennemi | tourelles, tourelles, missiles, croissance, arc, puissance, drones, canon, missiles, puissance | 0 | fin |
| humain | 6 | 86,37 | 95,00 | 2 | 6930 | mur, mur, ennemi | bouclier | 0 | fin |
| humain | 7 | 55,26 | 63,75 | 2 | 1360 | ennemi, mur, ennemi | tourelles | 0 | fin |
| humain | 8 | 63,88 | 72,75 | 2 | 1440 | mur, ennemi, ennemi | bouclier | 0 | fin |
| humain | 9 | 90,34 | 99,00 | 2 | 1390 | mur, ennemi, ennemi | croissance | 0 | fin |
| humain | 10 | 194,54 | 214,50 | 4 | 41120 | ennemi, ennemi, mur, ennemi | arc, missiles, croissance, arc, tourelles, croissance, arc | 0 | fin |
| bon | 1 | 81,14 | 89,75 | 2 | 1280 | mur, ennemi, ennemi | bouclier | 0 | fin |
| bon | 2 | 318,55 | 352,00 | 5 | 118090 | laser, ennemi, mur, mur, ennemi | arc, tourelles, bouclier, cadence, canon, missiles, drones, croissance, puissance, drones | 0 | fin |
| bon | 3 | 84,13 | 93,00 | 2 | 2180 | mur, ennemi, ennemi | croissance | 0 | fin |
| bon | 4 | 89,85 | 99,25 | 2 | 8920 | souffle, ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 5 | 72,00 | 80,75 | 2 | 1320 | ennemi, ennemi, ennemi | tourelles | 0 | fin |
| bon | 6 | 86,86 | 95,50 | 2 | 1320 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 7 | 154,51 | 171,50 | 4 | 37390 | mur, mur, ennemi, convoi | tourelles, croissance, tourelles, missiles, aimant, canon, missiles, puissance | 0 | fin |
| bon | 8 | 83,75 | 92,25 | 2 | 2140 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| bon | 9 | 76,37 | 85,25 | 2 | 1820 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| bon | 10 | 237,78 | 261,50 | 5 | 73250 | mur, ennemi, ennemi, ennemi | arc, missiles, croissance, arc, tourelles, croissance, arc, tourelles, canon, missiles | 0 | fin |
| expert | 1 | 141,33 | 153,25 | 3 | 19650 | mur, ennemi, ennemi, ennemi | bouclier, canon, tourelles, puissance | 0 | fin |
| expert | 2 | 211,76 | 233,75 | 5 | 47810 | ennemi, ennemi, ennemi, ennemi | arc, tourelles, cadence, bouclier, canon, missiles, traversee, missiles, puissance, croissance | 0 | fin |
| expert | 3 | 75,69 | 84,25 | 2 | 1580 | mur, ennemi, ennemi | croissance | 0 | fin |
| expert | 4 | 69,43 | 78,25 | 2 | 1380 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 5 | 301,54 | 335,75 | 5 | 129870 | ennemi, laser, laser, tir, ennemi | tourelles, tourelles, missiles, puissance, puissance, arc, traversee, canon, missiles, puissance | 0 | fin |
| expert | 6 | 63,82 | 72,25 | 2 | 1270 | mur, ennemi, ennemi | bouclier | 0 | fin |
| expert | 7 | 65,45 | 74,00 | 2 | 1270 | mur, ennemi, ennemi | tourelles | 0 | fin |
| expert | 8 | 68,91 | 77,50 | 2 | 1300 | ennemi, ennemi, ennemi | bouclier | 0 | fin |
| expert | 9 | 75,70 | 84,00 | 2 | 1150 | ennemi, ennemi, ennemi | croissance | 0 | fin |
| expert | 10 | 58,98 | 68,25 | 2 | 1810 | ennemi, ennemi, ennemi | arc, traversee | 0 | fin |
| dieu | 1 | 349,91 | 387,25 | 5 | 187660 | — | bouclier, tourelles, canon, croissance, tourelles, missiles, arc, missiles, traversee, aimant | 0 | fin |
| dieu | 2 | 328,99 | 365,50 | 5 | 143860 | — | arc, tourelles, bouclier, cadence, canon, missiles, drones, croissance, puissance, drones | 0 | fin |
| dieu | 3 | 403,88 | 441,75 | 5 | 185260 | — | croissance, arc, puissance, puissance, drones, traversee, croissance, drones, reparation | 0 | fin |
| dieu | 4 | 349,74 | 387,25 | 5 | 160560 | — | croissance, canon, croissance, arc, tourelles, missiles, arc, missiles, reparation, aimant | 0 | fin |
| dieu | 5 | 341,54 | 379,50 | 5 | 186630 | — | tourelles, tourelles, missiles, croissance, arc, puissance, drones, canon, missiles, puissance | 0 | fin |
| dieu | 6 | 350,73 | 387,25 | 5 | 135260 | — | bouclier, tourelles, canon, missiles, tourelles, missiles, cadence, tourelles, missiles, arc | 0 | fin |
| dieu | 7 | 291,99 | 329,00 | 5 | 116060 | — | tourelles, tourelles, missiles, drones, tourelles, missiles, croissance, tourelles, croissance, drones | 0 | fin |
| dieu | 8 | 352,66 | 391,50 | 5 | 153370 | — | bouclier, tourelles, canon, puissance, croissance, puissance, cadence, tourelles, missiles, puissance | 0 | fin |
| dieu | 9 | 329,55 | 367,25 | 5 | 202750 | — | croissance, tourelles, missiles, puissance, canon, missiles, croissance, tourelles, canon, missiles | 0 | fin |
| dieu | 10 | 327,52 | 364,75 | 5 | 187350 | — | arc, missiles, croissance, arc, tourelles, croissance, arc, tourelles, canon, missiles | 0 | fin |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 10 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.

## Qualification après le lot I

Mis à jour à 18/10/2026 · 00 h 34 (Paris). L’intégration `036f96e` de Claude publie les vues S et appelle le pilote dans tous les états ; elle fait avancer les gardes et les panneaux en simulation. Le précontrôle bon/graine 1 atteint fin à 81,14 s, sans erreur, avec journal identique sur répétition. Le lot complet réutilise ce reçu puis exécute les graines restantes : **80 parties sur 80 atteignent fin, zéro blocage, zéro erreur ; les huit répétitions de graine 1 sont identiques jusqu’au journal complet**. Source : sortie.json (`conforme: true`, bundle SHA-256 enregistré).

Les 80 constats antérieurs au lot I (47 fin, 33 blocages) restent dans [sortie-avant-lot-I.json](sortie-avant-lot-I.json) et [rapport-avant-lot-I.md](rapport-avant-lot-I.md), avec leurs journaux gzip inchangés. Ils ne sont pas comptés comme des parties réussies du nouveau lot. Les neuf contrôles ciblés de conformité du correctif LASSO restent dans conformite-cible.json ; aucune règle ni poids du pilote n’est réglé à partir des résultats.

Faits à signaler : le pilote dieu ne subit aucune mort dans les dix parties ; `dbg.god(true)` est activé pour lui conformément à la spécification. Les autres pilotes atteignent fin avec les morts listées dans le tableau. Aucun pilote n’a dix durées de partie inférieures ou égales à 10 s. Les durées et vagues atteintes restent des mesures sur dix graines ; la courbe de difficulté R-04/R-23 et les proportions sur cinquante graines ne sont pas qualifiées ici.

Limite de l’intégration signalée par Claude dans demandes.md : les télégraphes propres à `73-colosse.js` ne sont toujours pas publiés dans S.tele ; le pilote ne peut anticiper ces zones invisibles dans S. Il lit les données publiées sans accéder au module privé. Complément producteur demandé dans la boîte aux lettres, conformément à la clause « faire au plus près en le disant » du chantier. Le lot satisfait les seuils de parties, de déterminisme et de zéro erreur demandés ; revue indépendante Claude attendue.
