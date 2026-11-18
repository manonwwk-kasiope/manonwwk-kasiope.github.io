# SNAKE 2985 · cinq époques

18/11/2026 · 01 h 16 · Paris

Film panoramique de 30 secondes, 1000 × 460, 30 images par seconde. Une seule piste H.264, zéro piste audio. Taille : 11.11 Mo.

| Temps dans le film | Époque | Temps dans la partie | Événements |
|---|---|---|---|
| 0–6 s | 1976 | 0.13–6.10 s | Le serpent récolte les premières cellules du terminal. |
| 6–12 s | 1985 | 21.83–27.80 s | Bascule entre plans, surcharge à ricochet et destruction du Magnétron. |
| 12–18 s | 1995 | 30.65–36.62 s | Feux de triage, surcharge du train et destruction du Signal fantôme. |
| 18–24 s | 2185 | 1.60–7.57 s | Entrée en vol, sortie, puis changement de plan. |
| 24–30 s | 2985 | 39.93–45.88 s | Surcharge à écho pendant l’effondrement fractal, destruction de la Singularité et victoire. |

Les prises proviennent de cinq parties terminées dans la chambre intégrée depuis un profil WebKit vierge, joué au clavier et à la souris Playwright. Le pilote lit la position des entités et vise les anneaux de vol ; les dégâts et la progression suivent les règles du jeu. Chaque image utilise le moteur de rendu de la chambre sur une toile de 960 × 440. Le cartouche est placé en dessous, hors de l’arène. La caméra musicale suit la pulsation silencieuse du jeu. Les décors peints ont été chargés depuis leurs fichiers du projet ; le terminal 1976 utilise son rendu procédural.

La caméra avance en pas de 1/30 seconde et conserve l’ordre des images. Les cinq prises sont montées sans transition ni changement de vitesse. L’interface de commande reste hors cadre. Les images JPEG intermédiaires sont écrites dans un dossier temporaire. Aucune vidéo n’a été ouverte ou écoutée.

Reproduction depuis ce dossier, avec créneau navigateur : `node tourner.cjs`, puis `python3 encoder.py CHEMIN_TEMPORAIRE_IMPRIMÉ`. Le journal provenance.json conserve les empreintes des assets et les événements du moteur ; ffprobe.json contient le contrôle de la piste unique, du nombre d’images et de la durée.
