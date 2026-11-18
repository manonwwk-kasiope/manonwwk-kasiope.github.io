# Épilogue de la Singularité · 18/11/2026 · 01 h 17, Paris

La victoire au dernier cran ouvre une frise composée des paysages effectivement joués dans la traversée. Une tentative directe en 2985 présente un seul paysage ; un voyage 1976 → 1995 → 2985 présente trois étapes. Le filet supérieur reprend les cinq palettes d’époque. Les images entrent une fois puis restent stables. Le réglage de mouvement réduit de l’hôte et celui du système suppriment l’animation.

Le score de la dernière tentative est comparé au meilleur score précédent de 2985, en excluant du palmarès l’identifiant que les archives viennent d’enregistrer. L’absence de score antérieur, l’égalité et les écarts positifs ou négatifs sont traités. Jusqu’à deux gestes sont affichés, selon les événements reçus durant la traversée. Par exemple, une porte de surf aperçue ne suffit pas à créditer un cœur frappé. Le bouton de signature ouvre le formulaire existant et place le curseur dans la signature. Rejouer 2985 ou repartir en 1976 reste possible dès l’ouverture.

## Raccord

1. Charger les deux fichiers `epilogue.js` et `epilogue.css`, puis créer le suivi via `SnakeEpilogue.create()`. Garder le même objet pour les nouvelles tentatives et pour les sauts d’une traversée.
2. Sur le lancement effectif d’une partie, appeler `SnakeEpilogue.start(voyage,state)`. Une simple ouverture de la préparation ne représente pas une époque jouée. À chaque collecte d’événements, appeler `SnakeEpilogue.observe(voyage,state,batch)`. Le même appel accepte les événements du directeur (aiguillage).
3. Dans la fin de partie, garder `const row=archives.end(state)`, puis appeler `SnakeEpilogue.finish(voyage,state,row,SnakePalmares)`. Un résultat non nul remplace la seule vue finale ; une défaite ou une victoire intermédiaire suit sa bifurcation normale.
4. Appeler `SnakeEpilogue.mount(ui.bifurcation,bilan,{onHall:archives.openHall,onRetry,onCycle},{reduced:calm.matches})`. Les callbacks reprennent les transitions existantes. Le résultat expose `root`, `focus()` et `destroy()`. Détruire la vue quand l’hôte la quitte. Réinitialiser le suivi à chaque véritable nouveau cycle, même après une défaite en 2985. Les boutons ne dépendent d’aucun chronomètre.

## Contrôles

`node essai.cjs` conduit le véritable moteur jusqu’à la victoire en 2985 depuis son premier cran et vérifie le résultat à 20 650 points. Des scénarios déterministes distincts vérifient les sauts d’époques, les gestes présents ou absents, le record et les intentions des boutons. Le pseudonyme est relu après rechargement du véritable module de palmarès. Le scénario de victoire réelle se termine directement en 2985 et n’invente aucun geste marquant. Voir `preuve.json`.

`verifier-format.py` mesure les libellés en police de repli sur le format 568 × 275. La largeur utile calculée est de 528 px. Les trois actions totalisent 423 px, la ligne de titre avec un record à huit chiffres 462 px et les deux gestes 379 px. Le budget vertical laisse 131 px au panorama et 44 px aux boutons. Cette mesure de composition hors navigateur ne couvre pas l’ouverture du clavier iOS ni les métriques réelles de WebKit.
