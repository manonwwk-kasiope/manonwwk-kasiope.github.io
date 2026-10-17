# codex-02 — parties des pilotes

18/10/2026 00:04:20 (Paris).

Statut : **lot non validé**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `e21c812f9e95ba6a1e2add06641856f01e856c8ce617891d123d990a9783bfd0`.

Profil iPhone 13 paysage 844 × 390, __DT=1/60, profil vierge par partie, S.jour=20261017. Départ plongée ; simulation officielle par tranches de 0,25 s, arrêt au premier état fin observé ou à 60 s de jeu. Borne de secours à quatre fois ce temps en pas simulés ; détection d’une séquence figée au-delà de dix secondes de pas. Aucun réglage du jeu changé. Les gardes et intermèdes ne sont pas sautés. TempsJeu vient de N.horloge.t(), tempsSimule du nombre de pas (inclut les arrêts d’horloge). Un écran de fin figé reste observé jusqu’à la fin de la tranche en cours. Les éventuelles vues S absentes sont publiées dans donneesDebut/Fin.

| Pilote | Graine | Jeu s | Pas simulés s | Vague | Score | Causes de mort | Cartes | Erreurs | Arrêt |
|---|---:|---:|---:|---:|---:|---|---|---:|---|
| inerte | 1 | 25,29 | 26,00 | 1 | 10 | mur, ennemi, mur | — | 0 | fin |
| tourneur | 1 | 17,23 | 18,00 | 1 | 230 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 1 | 23,55 | 35,00 | 1 | 10800 | ennemi | — | 0 | bloque:panneau |
| kamikaze | 1 | 23,85 | 35,25 | 1 | 8000 | ennemi, mur | — | 0 | bloque:panneau |
| humain | 1 | 39,60 | 50,25 | 1 | 1010 | ennemi, ennemi | — | 0 | bloque:panneau |
| bon | 1 | 39,60 | 50,50 | 1 | 1170 | ennemi, ennemi | — | 0 | bloque:panneau |
| expert | 1 | 38,47 | 49,00 | 1 | 1010 | ennemi | — | 0 | bloque:panneau |
| dieu | 1 | 37,33 | 47,75 | 1 | 1020 | — | — | 0 | bloque:panneau |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 1 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.
