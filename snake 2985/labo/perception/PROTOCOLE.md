# Lecture du jeu à partir des pixels

18/11/2026 · 00 h 46, Paris

Chaque image provient du canvas seul. Le lecteur reçoit un tableau RGB et ses dimensions. Les PNG portent des identifiants opaques. Leur nom sert à joindre les sorties après l’inférence. Le module de vision n’importe ni le DOM, ni l’année réelle, ni la projection de caméra, ni la position du serpent. Les gabarits proviennent de la géométrie publique des sprites, connue à l’avance.

## Corpus fixé avant évaluation

Le collecteur prépare des positions de grille, de vol et de bascule, sur les deux plans. Les cas sont des états synthétiques rendus par le jeu. Les zones portent le masque de collision, la phase et le plan du gardien. La vérité terrain d’une zone est une direction cardinale dont la case voisine immédiate se trouve dans ce masque actif et sur le plan de la tête. Un préavis, une case active à trois pas ou une attaque sur l’autre plan comptent comme absence. Le protocole cible les zones de gardien ; les murs et drones ne font pas partie de cette classe de danger.

La cellule cherchée est la plus proche de la tête en distance de grille parmi celles de son plan. Une cellule de l’autre plan reste visible lors des contrôles négatifs. Les contrôles de tête absente retirent le sprite de tête par instrumentation, en conservant son cou et les autres entités. Ces scènes permettent de compter les fausses alertes du localisateur. Elles sont exclues du jugement sur la direction des zones, où la tête visible définit le voisinage.

Les 55 scènes de calibration et les 75 scènes normales de test viennent de graines disjointes, avec des plages temporelles distinctes pour les décors animés. La calibration utilise des largeurs de 540 et 700 px et des caps de vol décalés de 0,29 radian. Le test utilise 568 et 852 px, un décalage de 0,66 radian et quelques vues en mouvement réduit. Chaque profil d’époque reste représenté dans les deux lots. La généralisation porte sur des scènes inédites au sein des cinq familles graphiques connues.

Les 100 scènes appariées supplémentaires retirent, sur un même état et une même caméra, le traitement final de palette, le corps/sa liaison, l’artillerie ou les objets mobiles et cellules de l’autre plan. La surface de l’autre plan reste présente lors de ce dernier contrôle. Ces contre-épreuves décrivent l’effet net d’une ablation sur le lecteur complet et ne séparent pas les interactions.

## Critères fixés

Le lecteur normalise l’image à 384 × 176 pixels. La tête ou la cellule doit être annoncée à au plus quatre pixels normalisés du point projeté. Le bilan inclut également un rayon de huit pixels. Une localisation hors rayon compte comme une fausse alerte et une omission. La précision angulaire s’évalue uniquement pour les têtes correctement localisées. La fidélité des sorties de pixel ne mesure pas la perception ou le confort d’une personne.

Les seuils sont choisis par F1 sur les scènes de calibration. Le détecteur de danger ajuste une régression linéaire régularisée sur des fenêtres RGB, luminosité, gradients et contraste local autour des quatre voisins estimés. Le témoin couleur utilise deux familles de couleurs pour la tête, la teinte de cellule et l’excès de rouge pour le danger. Le seuil et le modèle sont gelés avant le bilan des scènes inédites.

## Exécution

1. Reconstituer `modeles.json` avec `node ../sprites/catalogue.cjs > modeles.json`.
2. En créneau navigateur exclusif, lancer `node collecter.cjs`. Les images anonymes sont écrites dans `corpus/`, les annotations dans `annotations.json`, les empreintes des sources dans `sources.json`.
3. Avec Python, NumPy et Pillow locaux, lancer `inferer.py`, puis `evaluer.py`, puis `exemples.py`. L’étape d’inférence ne lit pas les annotations. L’évaluateur ajuste les paramètres sur la calibration et mesure ensuite les erreurs hors échantillon.

Mise à jour à 01 h 10. Le collecteur a intercepté localement toutes les requêtes d’une origine HTTP virtuelle pour charger les quatre peintures sans accès extérieur. Les modules de locomotion, de surcharges, du halo phosphore et d’animation des gardiens sont inclus. Les états saturés déclenchent le vrai module de surcharge ; le retrait des effets les retire aussi. La seconde collecte analyse 36 nouvelles graines à lecteur et seuils figés ; les sources communes ont les mêmes SHA-256. Le nouveau raccord du Parcours découverte a été ajouté après l’évaluation des paires.
