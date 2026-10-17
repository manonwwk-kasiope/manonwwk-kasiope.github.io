# codex-02 — parties des pilotes

18/10/2026 00:08:41 (Paris).

Statut : **lot non validé**. Sources : [sortie.json](sortie.json), journaux complets gzip dans recus/. Bundle SHA-256 : `951e85ef41bb726b35678213361749f6bd0e9ef399d678253bd13333a5177cc6`.

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
| tourneur | 1 | 17,23 | 18,00 | 1 | 230 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 2 | 15,96 | 16,50 | 1 | 110 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 3 | 19,67 | 20,50 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 4 | 15,83 | 16,50 | 1 | 60 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 5 | 16,88 | 17,50 | 1 | 50 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 6 | 20,95 | 21,75 | 1 | 1500 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 7 | 15,20 | 16,00 | 1 | 150 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 8 | 17,59 | 18,25 | 1 | 110 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 9 | 18,26 | 19,00 | 1 | 440 | ennemi, ennemi, ennemi | — | 0 | fin |
| tourneur | 10 | 18,14 | 18,75 | 1 | 170 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 1 | 23,55 | 35,00 | 1 | 10800 | ennemi | — | 0 | bloque:panneau |
| maladroit | 2 | 16,34 | 17,00 | 1 | 210 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 3 | 16,32 | 17,00 | 1 | 310 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 4 | 12,11 | 12,75 | 1 | 160 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 5 | 15,25 | 16,00 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 6 | 13,88 | 14,50 | 1 | 110 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 7 | 13,75 | 14,50 | 1 | 110 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 8 | 14,97 | 15,50 | 1 | 100 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 9 | 14,62 | 15,50 | 1 | 320 | ennemi, ennemi, ennemi | — | 0 | fin |
| maladroit | 10 | 17,92 | 19,00 | 1 | 830 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 1 | 23,85 | 35,25 | 1 | 8000 | ennemi, mur | — | 0 | bloque:panneau |
| kamikaze | 2 | 17,08 | 18,00 | 1 | 810 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 3 | 22,72 | 33,75 | 1 | 8000 | ennemi | — | 0 | bloque:panneau |
| kamikaze | 4 | 14,42 | 15,25 | 1 | 370 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 5 | 22,72 | 34,00 | 1 | 8730 | ennemi | — | 0 | bloque:panneau |
| kamikaze | 6 | 24,98 | 36,50 | 1 | 7920 | ennemi, mur, ennemi | — | 0 | bloque:panneau |
| kamikaze | 7 | 12,36 | 13,00 | 1 | 280 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 8 | 14,53 | 15,50 | 1 | 470 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 9 | 15,12 | 16,00 | 1 | 580 | ennemi, ennemi, ennemi | — | 0 | fin |
| kamikaze | 10 | 12,98 | 13,75 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 1 | 39,60 | 50,25 | 1 | 1010 | ennemi, ennemi | — | 0 | bloque:panneau |
| humain | 2 | 21,50 | 22,00 | 1 | 10 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 3 | 39,60 | 50,25 | 1 | 1010 | ennemi, ennemi | — | 0 | bloque:panneau |
| humain | 4 | 39,60 | 50,25 | 1 | 1070 | ennemi, ennemi | — | 0 | bloque:panneau |
| humain | 5 | 21,94 | 22,50 | 1 | 0 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 6 | 28,28 | 29,00 | 1 | 50 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 7 | 39,60 | 50,50 | 1 | 1230 | ennemi, ennemi | — | 0 | bloque:panneau |
| humain | 8 | 39,60 | 50,50 | 1 | 1200 | ennemi, ennemi | — | 0 | bloque:panneau |
| humain | 9 | 35,23 | 36,00 | 1 | 120 | ennemi, ennemi, ennemi | — | 0 | fin |
| humain | 10 | 26,77 | 27,50 | 1 | 160 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 1 | 39,60 | 50,50 | 1 | 1170 | ennemi, ennemi | — | 0 | bloque:panneau |
| bon | 2 | 15,61 | 16,25 | 1 | 20 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 3 | 29,88 | 30,50 | 1 | 20 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 4 | 37,25 | 38,00 | 1 | 50 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 5 | 20,50 | 21,25 | 1 | 110 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 6 | 38,47 | 49,00 | 1 | 1040 | ennemi | — | 0 | bloque:panneau |
| bon | 7 | 21,96 | 22,50 | 1 | 50 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 8 | 36,40 | 37,00 | 1 | 160 | ennemi, ennemi, ennemi | — | 0 | fin |
| bon | 9 | 39,60 | 50,25 | 1 | 1010 | ennemi, ennemi | — | 0 | bloque:panneau |
| bon | 10 | 33,20 | 33,75 | 1 | 50 | ennemi, ennemi, ennemi | — | 0 | fin |
| expert | 1 | 38,47 | 49,00 | 1 | 1010 | ennemi | — | 0 | bloque:panneau |
| expert | 2 | 38,47 | 49,00 | 1 | 1120 | ennemi | — | 0 | bloque:panneau |
| expert | 3 | 38,47 | 49,00 | 1 | 1070 | ennemi | — | 0 | bloque:panneau |
| expert | 4 | 37,33 | 47,75 | 1 | 1120 | — | — | 0 | bloque:panneau |
| expert | 5 | 38,47 | 49,00 | 1 | 1070 | ennemi | — | 0 | bloque:panneau |
| expert | 6 | 38,47 | 49,00 | 1 | 1080 | ennemi | — | 0 | bloque:panneau |
| expert | 7 | 38,47 | 49,00 | 1 | 1010 | ennemi | — | 0 | bloque:panneau |
| expert | 8 | 37,33 | 47,75 | 1 | 1020 | — | — | 0 | bloque:panneau |
| expert | 9 | 37,33 | 47,75 | 1 | 1180 | — | — | 0 | bloque:panneau |
| expert | 10 | 37,33 | 47,75 | 1 | 1020 | — | — | 0 | bloque:panneau |
| dieu | 1 | 37,33 | 47,75 | 1 | 1020 | — | — | 0 | bloque:panneau |
| dieu | 2 | 37,33 | 47,75 | 1 | 1180 | — | — | 0 | bloque:panneau |
| dieu | 3 | 37,33 | 47,75 | 1 | 1010 | — | — | 0 | bloque:panneau |
| dieu | 4 | 37,33 | 47,75 | 1 | 1000 | — | — | 0 | bloque:panneau |
| dieu | 5 | 37,33 | 47,75 | 1 | 1090 | — | — | 0 | bloque:panneau |
| dieu | 6 | 37,33 | 47,75 | 1 | 1030 | — | — | 0 | bloque:panneau |
| dieu | 7 | 37,33 | 47,75 | 1 | 1140 | — | — | 0 | bloque:panneau |
| dieu | 8 | 37,33 | 47,75 | 1 | 1090 | — | — | 0 | bloque:panneau |
| dieu | 9 | 37,33 | 47,75 | 1 | 1010 | — | — | 0 | bloque:panneau |
| dieu | 10 | 37,33 | 47,75 | 1 | 1090 | — | — | 0 | bloque:panneau |

Déterminisme : inerte identique ; tourneur identique ; maladroit identique ; kamikaze identique ; humain identique ; bon identique ; expert identique ; dieu identique (graine 1 répétée pour chaque pilote, résumé et empreinte du journal complet). Les 10 graines par pilote décrivent ce lot : aucune proportion sur cinquante graines ni qualification globale du jeu n’est annoncée.

## État de livraison et reprise

Mis à jour à 18/10/2026 · 00 h 10 (Paris). Les 80 parties demandées sont exécutées : 47 atteignent fin, 33 s’arrêtent au garde-fou sur un panneau figé ; zéro erreur pour les 80. Les huit répétitions de graine 1 ont des résumés et journaux complets identiques. Les vues S manquantes sont documentées ; aucune mesure de qualité des pilotes ni du réglage du jeu n’est déduite de ce lot incomplet.

Les 19 contrôles ciblés du pilote passent ([conformite.json](conformite.json), [conformite.mjs](conformite.mjs)) : droits d’accès, réaction, bruit, continuité entre états de combat, actions et variantes, cartes et VOL. Le code est limité à src/85-pilote.js ; il ne lit aucun objet privé du jeu et n’écrit que S.input, hors raccord du hook et publication de sa propre interface.

**Lot arrêté en attente des intégrations Claude**, demandées dans refonte/lots/demandes.md : appel tous états, pas réel sur les écrans arrêtés, publication des vues S et des champs pouvoir/niveaux. Code, banc et reçus livrés ; critères de fin sans blocage non validés. Prochaine action : pull et lecture de « Ordres pour Codex » ; après intégration, rejouer les seuls reçus invalidés par le changement, pas les tests unitaires inchangés. Coût externe nul, simulation locale seulement.

## Correctif de conformité LASSO / INVERSION

Mis à jour à 18/10/2026 · 00 h 15 (Paris). Le § 4.1 de `refonte/lots/pilotes.md` exige de recalculer le centre sur les membres du groupe encore vivants et de sortir pour `vide` uniquement lorsque plus aucun ne vit. Le filtre du pilote réutilisait celui des ennemis dangereux : il retirait à tort les membres devenus proies. Le nouveau test « lasso conserve les membres devenus proies et sort quand ils meurent » échouait avant correction, puis passe après remplacement de ce seul filtre par le filtre des vivants. Aucun seuil, retard, bruit, poids ou règle de décision n’est ajusté.

Le reçu historique `conformite.json` contient **18** réussites, malgré l’annonce précédente de 19 contrôles : cette annonce n’était pas étayée par ce reçu. Le script comportait un contrôle supplémentaire de continuité entre jeu et nettoyage. Le nouveau [conformite-cible.json](conformite-cible.json) prouve **9 contrôles ciblés exécutés sur le correctif**, dont cette continuité, les deux cas LASSO, les impulsions, les variantes, les cartes, le VOL et les écrans arrêtés. Il identifie la source par SHA-256. Les autres contrôles historiques ne sont pas rejoués.

Les 80 reçus de parties sont conservés dans leur état daté, antérieur à ce correctif ; ils ne qualifient pas le nouveau bundle. La qualification jusqu’à fin attend toujours les intégrations Claude signalées plus haut.
