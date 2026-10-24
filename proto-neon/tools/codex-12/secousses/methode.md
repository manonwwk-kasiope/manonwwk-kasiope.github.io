# Ordre14 — budget d’empilement des secousses

18/10/2026 · 12 h 01 (Paris).

Base7e5037b,39sources figées et bundle avant.50-fx réservé par p35/p38 : aucune édition du vrai fichier, seulement raccord-50-fx.patch contre cette pointe et application dans apres-sources.json. Ajout02 autorisé et réservé : scene.budgets.secousse, fenêtre1s et priorité forte égale au seuil caméra R12 existant. Aucun chiffre de combat changé.

Une seule proposition structurelle : dans une fenêtre, une crête ordinaire remplace la précédente sans addition ni réamorçage des petits impacts ; une crête plus haute peut la relever. L’impact fort reste prioritaire, notamment le CYCLOPE. Même décroissance2,4/s et même courbe d’un impact isolé. Horloge dédiée au budget, sans toucher l’horloge des effets/flashs. Réinitialisation avec50.reset, écritures directes S.shake conservées. Aucun appel ni ordre aléatoire modifié. Porte de flashs inchangée.

Budget : une seule paire de qualification,100avant et100après, pas de recherche de valeurs.80parties (8pilotes×10graines paysage) plus20bon (10portrait,10bureau), pour couvrir les trois profils R14 sans rejouer les10bon paysage. Processus de graine série, cache par source/profil/pilote/graine ; aucune partie reçue rejouée. Même sonde officielle simulerPartie dansVM, lecture S.shake>0 après N.cam.update, mêmes fenêtres et mêmes sources/instruments dans les deux phases. Cette mesure VM n’est pas une certification de parité stricte avec Chromium ; la cheffe reçoit verifier.mjs pour sa vérification navigateur.

Contrats du vrai50-fx avant/après : courbe isolée conservée à2,2/6/12px, PX2/4 ; CYCLOPE prioritaire ; écriture directe caméra ; nouvelle frappe après fenêtre ;120 décisions de porte flash identiques ; préférence0 conservée. Une erreur technique initiale comparait des prototypes de contextes VM différents : reçu initial conservé, comparaison JSON stricte corrigée, seul ce contrat rejoué. Douze contrats conformes, aucune retouche du candidat.

Critères d’arrêt : pas de seconde valeur après le bilan ; publier tout dépassement12%, différence de jeu hors caméra ou défaut isolé/CYCLOPE, puis arbitrage Claude. Pas de nouvel essai de difficulté, pas de réglageB. Le script navigateur est préparé pourClaude, pas lancé par la boîte. Son verrou Chef est acquis atomiquement en exécution directe ; avec --verrou-detenu, l’appelant Chef conserve son propre verrou. Jamais de retrait d’un marqueur étranger.
