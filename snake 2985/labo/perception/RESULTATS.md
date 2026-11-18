# Ce que le lecteur retrouve dans l’image

18/11/2026 · 01 h 09, Paris

Sur 75 scènes inédites, le témoin couleur localise 67 des 70 têtes visibles. Le modèle qui combine gabarits et contraste en localise 46. Une fois la tête retrouvée, il estime le cap à moins de 30° dans 45 cas sur 46, avec une erreur médiane de 3,7°. Ces mesures portent sur des algorithmes et des états préparés du jeu. Elles ne constituent pas un test de perception humaine.

La détection de la cellule utile et du danger est plus fragile. Les prédictions de localisation doivent rester à quatre pixels de la référence dans une image normalisée à 384 × 176 pour être comptées.

| Scènes inédites | Algorithme | Correctes | Fausses annonces | Omissions |
|---|---|---:|---:|---:|
| Tête, 70 visibles + 5 contrôles masqués | Couleur seule | 67 | 6 | 3 |
| Tête | Gabarits et contraste | 46 | 29 | 24 |
| Cellule du plan la plus proche, 65 présentes + 10 absentes | Couleur seule | 11 | 34 | 54 |
| Cellule du plan la plus proche | Gabarits et contraste | 11 | 18 | 54 |
| Direction d’une case voisine dans le masque actif, hors contrôles de tête absente | Couleur seule | 1 | 2 | 9 |
| Direction d’une case voisine dans le masque actif | Gabarits et contraste | 5 | 20 | 5 |

Parmi les 70 scènes de danger évaluables, le modèle à gabarits signale une présence dans 5 des 10 scènes réellement menaçantes et dans 14 des 60 scènes sans menace adjacente. Quatre des cinq images de contrôle sans tête déclenchent une fausse alerte du lecteur couleur ; les cinq déclenchent une alerte des gabarits. Une sortie mal localisée compte à la fois comme une fausse annonce et comme une omission.

Une cellule existe à l’image pendant le vol, mais cet état du moteur récompense le passage dans les anneaux. En limitant l’analyse aux 40 scènes de grille ou de bascule, 35 ont une cellule réellement collectable ; les gabarits en localisent 9, avec 13 fausses annonces. Le marquage proposé reste éteint pendant le vol.

## Diagnostic

[Voir les erreurs représentatives](erreurs.png). Dans 18 des 29 mauvaises annonces de tête du lecteur à gabarits, le centre prédit se trouve à cinq pixels ou moins du gardien. Quatre se trouvent sur un drone. La croix du lecteur couleur tombe sur la vraie tête dans le premier exemple, malgré les effets au premier plan. Dans les essais étiquetés « tête masquée », le moteur conserve sa position mais la collecte supprime le sprite et son halo : c’est un véritable contrôle négatif visuel.

Les 18 mauvaises annonces de cellule du modèle à gabarits désignent toutes une véritable cellule : 15 celle qui est plus loin sur le plan courant et 3 une cellule de l’autre plan. Dans 14 de ces cas, le modèle avait bien localisé la tête. Sur les 65 scènes contenant une cible, le classement des cellules du plan courant par distance au centre projeté donne le même premier choix que la distance sur la grille. L’erreur de rang se produit donc dans la sélection des candidats. Sept états synthétiques plaçaient cependant la cellule à moins de 0,55 case d’un segment du même plan. Cette famille d’états a été écartée de la deuxième expérience appariée.

À deux bits, le lecteur à gabarits localise 8 des 14 têtes visibles et aucune des deux directions létales évaluables. Ce dernier dénominateur est trop petit pour une estimation stable. À quatre bits, il localise 4 des 14 têtes. Les détails par époque, plan, mode et tolérance sont dans [les résultats bruts](resultats.json).

## Effet des superpositions

Sur 25 états appariés reproduits pixel pour pixel à partir de la même graine, supprimer les armes et leurs effets corrige 6 résultats de tête et 7 résultats de cellule, sans résultat inverse. Supprimer le corps et ses liaisons en corrige respectivement 3 et 2. Retirer les seules cellules et les seuls drones de l’autre plan ne change aucun de ces résultats sur les 25 états comparés. Retirer la conversion finale de palette dégrade 6 résultats de tête et 2 résultats de cellule ; cette intervention modifie aussi les indices utilisés pour reconnaître l’époque. Ces manipulations isolent l’effet global de chaque retrait sur ce lecteur.

## Proposition de marquage et décision

[Comparer les captures du jeu](marquage-compare.png). Le prototype `marquage.js` pose un petit fond opaque et deux coins de socle sous la cellule proche du plan actif quand effets, danger, corps ou objets voisins l’encombrent. En 1976, un second repère dessine la frontière d’une case adjacente uniquement si le masque du gardien est actif et mortel sur le plan courant. Le dessin a été intercalé avant la tête et avant la conversion de palette dans la copie de test, sans toucher au jeu.

Sur **36 nouvelles graines appariées**, 22 affichent le socle et 4 la frontière de danger. Les 13 autres paires produisent des PNG strictement identiques ; certaines paires cumulent les deux repères. Les logiciels, dessins et quatre peintures ont les mêmes empreintes que dans l’expérience initiale. Les deux lecteurs conservent leurs seuils et coefficients gelés.

- Sur les 22 cellules marquées, la couleur seule passe de 6 à 8 bonnes localisations, avec 8 puis 6 fausses annonces. Le modèle à gabarits passe de 7 à 6 bonnes localisations, avec 7 puis 6 fausses annonces. Une tête correctement localisée par les gabarits devient incorrecte ; le témoin couleur conserve ses 34 succès sur 36.
- Le contraste local médian de la fenêtre centrée sur la cellule passe de 9,81 à 12,54, mesuré par le rapport des luminances aux 90e et 10e centiles. Il augmente dans 13 cas sur 22 et reste identique dans les 9 autres. La plus forte modification de l’image entière concerne 0,109 % des pixels. Aucun des 36 carrés de contrôle centrés sur la tête ne change de pixel.
- Le lecteur à gabarits retrouve 2 des 4 directions létales bordées à deux bits avant comme après. Le témoin couleur reste à 0 sur 4.

**Décision de laboratoire.** Le socle mérite une comparaison sur téléphone pour sa séparation locale mesurable, avec des résultats contradictoires entre les deux lecteurs. Le trait de frontière n’a pas amélioré la lecture des quatre menaces testées. Le jeu et sa difficulté restent à leur version intégrée. [Comparaison gelée](resultats-marquage.json) · [Impact pixel](impact-pixels.json)

## Sources et reproduction

Le corpus initial compte 55 scènes de calibration, 75 inédites et 100 contre-épreuves. Les quatre panoramas peints, les chevrons du premier anneau, le halo phosphore et les surcharges sont inclus. Les fichiers `sources.json` et `sources-paires.json` conservent les SHA-256 vérifiés sur la durée de chaque collecte. SHA-256 du rendu `spectacle.js` : `d15f1d631650525febaddd19331f5a16adec1be374cca0d2f19b97c37be33043`.

`lire.py image.png` utilise uniquement les pixels du fichier et les paramètres gelés ; il affiche les coordonnées dans la taille originale de l’image. `audit.cjs` et `diagnostiquer.py` examinent les erreurs une fois les prédictions écrites. `comparer-marquage.cjs` recapture les paires en créneau exclusif, puis `mesure-marquage.py` et `impact-pixels.py` les évaluent hors ligne. [Protocole](PROTOCOLE.md) · [Empreintes](sources.json) · [Diagnostic chiffré](diagnostic.json)

### Raccord retenu pour le Parcours découverte, mis à jour à 01 h 10

Charger `../perception/marquage.js`, puis appeler `window.SnakeMarquage?.drawDiscovery(c,s,cam,project)` immédiatement avant le dernier dessin de la tête dans `spectacle.js`. L’appel lit l’état déjà fourni par la campagne. Il utilise exactement la cellule désignée par `s.aide.at` aux étapes « cellule » et « croissance » quand le parcours a été explicitement préparé. La cellule doit être proche, sur le plan actif et dans une zone encombrée. Les autres cellules restent disponibles et le moteur conserve ses commandes et ses règles. Le raccord se tait en vol et n’active aucune frontière 2 bits. La variante générale `draw` reste réservée à l’expérience comparative. Le script `node raccord.cjs` vérifie notamment qu’un gardien actif adjacent ne provoque aucun trait de frontière via cette API. Les images appariées ont validé le dessin d’origine ; cette sélection plus restrictive du parcours a été vérifiée sous Node.
