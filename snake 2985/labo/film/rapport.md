# SNAKE 2985 · cinq époques

18/11/2026 · 02 h 18 · Paris

Film panoramique de 30 secondes, 1000 × 460, 30 images par seconde. Une seule piste H.264, zéro piste audio. Taille : 10.98 Mo.

| Temps dans le film | Époque | Temps dans la partie | Événements |
|---|---|---|---|
| 0–6 s | 1976 | 0.13–6.10 s | grille |
| 6–12 s | 1985 | 19.53–25.52 s | Changement de plan · Victoire contre Le Magnétron |
| 12–18 s | 1995 | 18.55–24.55 s | Changement de plan · Surcharge de nova · Victoire contre Le Signal fantôme |
| 18–24 s | 2185 | 1.60–7.57 s | Changement de plan · Vol libre |
| 24–30 s | 2985 | 47.47–53.42 s | Changement de plan · Second cœur · Victoire contre La Singularité |

Les prises proviennent de cinq parties terminées dans la chambre intégrée depuis un profil WebKit vierge, joué au clavier et à la souris Playwright. Le pilote lit la position des entités et vise les anneaux de vol ; les dégâts et la progression suivent les règles du jeu. Chaque image utilise le moteur de rendu de la chambre sur une toile de 960 × 440. Le cartouche est placé en dessous, hors de l’arène. La caméra musicale suit la pulsation silencieuse du jeu. Les décors peints ont été chargés depuis leurs fichiers du projet ; le terminal 1976 utilise son rendu procédural.

La caméra échantillonne le jeu à 30 images par seconde. Le moteur simule à 60 pas par seconde sur la grille et 120 en vol. Les compteurs des pas effectués figurent dans provenance.json. Les cinq prises sont montées sans transition ni changement de vitesse. L’interface de commande reste hors cadre. Les images JPEG intermédiaires sont écrites dans un dossier temporaire. Aucune vidéo n’a été ouverte ou écoutée.

Reproduction depuis ce dossier, avec créneau navigateur : `node tourner.cjs`, puis `python3 monter.py CHEMIN_TEMPORAIRE_IMPRIMÉ`. Le journal provenance.json conserve les empreintes des assets et les événements du moteur ; ffprobe.json contient le contrôle de la piste unique, du nombre d’images et de la durée.
