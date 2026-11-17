# Dernière trajectoire

18/11/2026 · 00 h 06, Paris

Ouvrir `index.html` depuis le dépôt. Le jeu démarre sur le moteur du laboratoire. Virages avec les flèches ou un glissé sur la grille. À la mort, l’image reste sur l’impact. Le curseur, les boutons ±¼ s et la lecture permettent d’inspecter les deux dernières secondes. En mouvement réduit, la lecture devient une avance manuelle image par image. Choisir ensuite une des cinq époques et « Rejouer » ; le menu indique le meilleur score local par époque. La démo utilise sa propre clé de stockage.

## Intégrer la reprise

Charger `reprise.js`. Créer `const rec = SnakeReprise.create()` au départ. Appeler `rec.capture(state, state.elapsed * 1000)` immédiatement après chaque pas du moteur et avant de vider ses événements. Le temps augmente en millisecondes de simulation. Dès que `rec.death` est renseigné, suspendre le jeu. Conserver l’archive pendant la consultation, puis appeler `rec.reset()` au nouveau départ.

- `rec.death` indique `cause,kind,x,y,plane,tip`. Les coordonnées du mur peuvent sortir de la grille ; surligner le bord correspondant.
- `rec.bounds()` indique `start,end,count`. La séquence s’étend au plus sur les deux dernières secondes accessibles ; une mort précoce possède une archive plus courte.
- `rec.frameAt(ms)` retourne l’échantillon réel le plus proche antérieur au temps demandé. Champs `t,x,y,plane,flight,cells`. Les images se lisent dans n’importe quel ordre, même après modification de l’état moteur.
- Les deux plans sont rangés dans `cells[plane * 648 + y * 36 + x]`. Tester par masque les bits `SnakeReprise.flags.body, cell, drone, next, hull, warning, active, gate`. Le registre contient les deux couches. La démo dessine la couche où se trouvait la tête à cet instant.
- La géométrie se conserve au niveau des cases. Les coordonnées de la tête gardent leur partie fractionnaire en vol. Les cellules dangereuses et la phase du gardien viennent du moteur. Les projectiles décoratifs, particules et l’audio n’entrent pas dans l’archive.

## Vérifications Node

`node verifier.cjs` provoque six morts avec les routines de collision du moteur et du module de vol : mur, corps, drone après bascule sur le second plan, préavis qui devient actif sur ce plan, coque du gardien et retour de vol sur une grille saturée. Les états de départ de ces cas sont préparés par le test. Le test injecte ensuite dix minutes d’états, vérifie la coupure sur la mort et retrouve les quatre empreintes des images en ordre inversé après mutation du jeu. Les tableaux typés préalloués occupent 55 188 octets pour 42 emplacements. Ce chiffre exclut l’enveloppe JavaScript, l’annotation bornée et la copie de 1 296 octets renvoyée par lecture. Voir `resultats.json`.

`node verifier-demo.cjs` exerce les gestionnaires de la véritable démo dans un substitut DOM sous Node : mort, deux secondes consultables, recul, avance, lecture, mouvement réduit, sauvegarde d’un record à 37 points injectés, conservation du record de 2185, insertion du rail 8 bits de 1995 et redémarrage en 1995. Voir `parcours.jsonl`. Ce contrôle ne mesure ni le rendu Safari ni le confort sur téléphone.
