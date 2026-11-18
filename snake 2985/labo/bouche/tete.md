# Motif de bouche et lecture du cap

18/11/2026 · 02 h 47 (Paris)

**Sur 540 paires avec/sans motif, aucun pixel du repère de cap ni des reflets des yeux ou du cockpit n’a changé.** Tous les pixels entièrement couverts par le sprite de tête sont également identiques après conversion aux cinq palettes. Les formes du nez et les chevrons de direction restent présents.

Le motif touche parfois le **bord anticrénelé**, ou son voisin immédiat. En 1976, jusqu’à neuf pixels de bord partiellement couverts changent. Le cas le plus marqué en proportion pour ce phosphore est un prisme Écho à 120 ms, vers le haut : six des 70 contacts bord/fond qui atteignaient 3:1 passent sous ce seuil. Ils se trouvent sur le pourtour ; l’indice de cap reste identique. En 2185 et 2985, quatre et un pixels de liseré couverts entre 95 % et 100 % peuvent varier, de 12 et 10 niveaux RGB au plus. La perte locale la plus forte en proportion est en 2985 (neuf contacts sur 42 pour un prisme Détonation vers le haut). Ces comptages portent sur des paires de pixels adjacents du contour.

Le banc reproduit les paires du test de départ (40, 120 et 175 ms, neuf recettes, deux orientations, cinq époques, plan inférieur normal et plan supérieur réduit). Il reconstruit la silhouette depuis l’atlas réel, y compris l’index 7 du repère de cap et l’index 5 des reflets, à la pose et à la résolution observées. Les résultats portent sur ces cadrages à 568 × 275 CSS et sur les pixels du jeu. Ils ne mesurent pas la compréhension du cap au pouce. [Mesures par paire](tete.json) · [Reproduction Node](controle-tete.cjs)
