# Passes de réglage

18/10/2026 02:23:07 (Paris).

## Passe 1 — retenue comme candidate de travail

Retenir la variante isolée qui tient le plus de cibles B (9/20), sans perdre de B déjà tenue : approche des flèches 50–70 → 40–56 px/s et table de vitesses cohérente. Deux nouvelles B sur vingt graines : durée humaine et trois vies inerte avant 35 s. Les victoires expert régressent, cible toujours non tenue. Reçus de sensibilité strictement identiques réutilisés, aucun rejeu.

Choix au nombre de B tenues ; ce choix ne valide pas le lot et les régressions indicatives ou hors fourchette restent publiées.

| Paramètre N.R | Avant | Après |
|---|---:|---:|
| ennemis.fleche.approche.0 | 50 | 40 |
| ennemis.fleche.approche.1 | 70 | 56 |
| secteurs.0.vitessesFleches.0 | 50 | 40 |
| secteurs.0.vitessesFleches.1 | 55 | 44 |
| secteurs.0.vitessesFleches.2 | 60 | 48 |
| secteurs.0.vitessesFleches.3 | 65 | 52 |
| secteurs.0.vitessesFleches.4 | 70 | 56 |

| Cible B | Avant | Après |
|---|---|---|
| inerte.35 | non tenue | tenue |
| inerte.mur8 | non tenue | non tenue |
| tourneur.90 | tenue | tenue |
| maladroit.mediane | non tenue | non tenue |
| maladroit.cyclope | tenue | tenue |
| kamikaze.avant | tenue | tenue |
| kamikaze.gagne | tenue | tenue |
| humain.mediane | non tenue | tenue |
| humain.lassoCourt | non tenue | non tenue |
| humain.lassoLong | non tenue | non tenue |
| bon.cyclope | non tenue | non tenue |
| bon.bat | non tenue | non tenue |
| expert.bat | non tenue | non tenue |
| expert.perdVie | tenue | tenue |
| dieu.duree | non tenue | non tenue |
| dieu.combat | non tenue | non tenue |
| dieu.erreurs | tenue | tenue |
| rythme.pics | non tenue | non tenue |
| rythme.respiration | non tenue | non tenue |
| rythme.tirs | tenue | tenue |

B tenues : 7 → 9/20. Nouvelles B depuis le début des passes : inerte.35, humain.mediane. B perdues depuis la candidate précédente : aucune. Passes consécutives sans nouvelle B : 0. 

## Passe 2 — retenue comme candidate de travail

Combiner la vitesse de la candidate 1 avec le plafond V1 à 12 (effet isolé favorable au taux de victoire bon/expert), une seule charge simultanée de flèche en V2 au lieu de deux (morts de contact concentrées en V2), et 1 200 PV par phase / 3 600 au total pour le CYCLOPE (effet isolé favorable au taux bon, durée encore hors cible). Mesure de la combinaison : aucune attribution individuelle n’est déduite de cette passe. Tous les seuils et pilotes restent gelés.

11 B tenues contre 9, avec deux nouvelles B bon (atteint 35 %, battu 10 %) et aucune B perdue. Expert et durées dieu restent hors cible.

| Paramètre N.R | Avant | Après |
|---|---:|---:|
| secteurs.0.vagues.0.plafond | 10 | 12 |
| secteurs.0.vagues.1.chargesFleches | 2 | 1 |
| colosse.pvPhase | 1500 | 1200 |
| colosse.pvTotal | 4500 | 3600 |

| Cible B | Avant | Après |
|---|---|---|
| inerte.35 | tenue | tenue |
| inerte.mur8 | non tenue | non tenue |
| tourneur.90 | tenue | tenue |
| maladroit.mediane | non tenue | non tenue |
| maladroit.cyclope | tenue | tenue |
| kamikaze.avant | tenue | tenue |
| kamikaze.gagne | tenue | tenue |
| humain.mediane | tenue | tenue |
| humain.lassoCourt | non tenue | non tenue |
| humain.lassoLong | non tenue | non tenue |
| bon.cyclope | non tenue | tenue |
| bon.bat | non tenue | tenue |
| expert.bat | non tenue | non tenue |
| expert.perdVie | tenue | tenue |
| dieu.duree | non tenue | non tenue |
| dieu.combat | non tenue | non tenue |
| dieu.erreurs | tenue | tenue |
| rythme.pics | non tenue | non tenue |
| rythme.respiration | non tenue | non tenue |
| rythme.tirs | tenue | tenue |

B tenues : 9 → 11/20. Nouvelles B depuis le début des passes : bon.cyclope, bon.bat. B perdues depuis la candidate précédente : aucune. Passes consécutives sans nouvelle B : 0. 

## Passe 3 — rejetée ; candidate 2 conservée

Hypothèse de survie et de fermeture : flèche à 10 PV au lieu de 20 pour que le canon I puisse la tuer en un impact ; bond à 128 px/s au lieu de 160 avec durée 0,525 s au lieu de 0,42 (même déplacement théorique 67,2 px) ; traînée de base à 6 s au lieu de 1,2 pour donner une fenêtre géométrique de boucle aux tentatives à grand rayon, les variations ±20 % n’ayant pas fait entrer les deux cibles LASSO. Les délais de télégraphe, les pilotes, le mur létal et la morsure-coupe sont inchangés. Combinaison mesurée, pas attribution causale de chaque nombre.

Aucune nouvelle B ; 8/20 au lieu de 11. Perd durée inerte, durée humaine et borne haute d’accès bon. Expert gagne 30 % (cible 40–70 %), LASSO humain encore à 11,86 % / 5,66 %. Pas de bénéfice compensant les régressions.

| Paramètre N.R | Avant | Après |
|---|---:|---:|
| ennemis.fleche.pv | 20 | 10 |
| ennemis.fleche.bond.vitesse | 160 | 128 |
| ennemis.fleche.bond.duree | 0.42 | 0.525 |
| lasso.traine.base | 1.2 | 6 |

| Cible B | Avant | Après |
|---|---|---|
| inerte.35 | tenue | tenue |
| inerte.mur8 | non tenue | non tenue |
| tourneur.90 | tenue | non tenue |
| maladroit.mediane | non tenue | non tenue |
| maladroit.cyclope | tenue | tenue |
| kamikaze.avant | tenue | tenue |
| kamikaze.gagne | tenue | tenue |
| humain.mediane | tenue | non tenue |
| humain.lassoCourt | non tenue | non tenue |
| humain.lassoLong | non tenue | non tenue |
| bon.cyclope | tenue | non tenue |
| bon.bat | tenue | tenue |
| expert.bat | non tenue | non tenue |
| expert.perdVie | tenue | tenue |
| dieu.duree | non tenue | non tenue |
| dieu.combat | non tenue | non tenue |
| dieu.erreurs | tenue | tenue |
| rythme.pics | non tenue | non tenue |
| rythme.respiration | non tenue | non tenue |
| rythme.tirs | tenue | tenue |

B tenues : 11 → 8/20. Nouvelles B depuis le début des passes : aucune. B perdues depuis la candidate précédente : tourneur.90, humain.mediane, bon.cyclope. Passes consécutives sans nouvelle B : 1. 

## Passe 4 — non retenue pour livraison ; base expérimentale de la dernière passe

Compromis après la passe 3 rejetée : partir de la candidate 2, garder le bond ralenti à portée théorique constante et la fenêtre de traînée longue, mais revenir à 15 PV (le canon I exige encore deux impacts, contrairement aux 10 PV de la passe 3). Élargir fermeture sur traînée 7 → 11 px et queue 5,5 → 7,5 px pour tester la fermeture avec les erreurs de trajectoire des pilotes, sans changer ces pilotes ni leurs seuils. Le gain de survie trop fort de la passe 3 et son échec aux cibles LASSO motivent cette combinaison. Si aucune nouvelle B, arrêt obligatoire : deuxième passe sans gain.

Nouvelle B expert : 45 % de victoires, sans vie intacte. B total 10/20 contre 11 pour la candidate 2 : humain dépasse 210 s et bon atteint 65 %, au-dessus de 60 %. La candidate 2 reste la meilleure au nombre de B, mais la nouvelle entrée expert justifie une dernière tentative de compromis.

| Paramètre N.R | Avant | Après |
|---|---:|---:|
| ennemis.fleche.pv | 20 | 15 |
| ennemis.fleche.bond.vitesse | 160 | 128 |
| ennemis.fleche.bond.duree | 0.42 | 0.525 |
| lasso.traine.base | 1.2 | 6 |
| lasso.fermetureTraine | 7 | 11 |
| lasso.fermetureQueue | 5.5 | 7.5 |

| Cible B | Avant | Après |
|---|---|---|
| inerte.35 | tenue | tenue |
| inerte.mur8 | non tenue | non tenue |
| tourneur.90 | tenue | tenue |
| maladroit.mediane | non tenue | non tenue |
| maladroit.cyclope | tenue | tenue |
| kamikaze.avant | tenue | tenue |
| kamikaze.gagne | tenue | tenue |
| humain.mediane | tenue | non tenue |
| humain.lassoCourt | non tenue | non tenue |
| humain.lassoLong | non tenue | non tenue |
| bon.cyclope | tenue | non tenue |
| bon.bat | tenue | tenue |
| expert.bat | non tenue | tenue |
| expert.perdVie | tenue | tenue |
| dieu.duree | non tenue | non tenue |
| dieu.combat | non tenue | non tenue |
| dieu.erreurs | tenue | tenue |
| rythme.pics | non tenue | non tenue |
| rythme.respiration | non tenue | non tenue |
| rythme.tirs | tenue | tenue |

B tenues : 11 → 10/20. Nouvelles B depuis le début des passes : expert.bat. B perdues depuis la candidate précédente : humain.mediane, bon.cyclope. Passes consécutives sans nouvelle B : 0. 

## Passe 5 — rejetée ; candidate 2 conservée pour contrôle final

Dernière passe, base expérimentale 4 : alléger V1 (plafond 12 → 8, encore compatible avec la NUÉE de 6–8 ; seconde FILE +5 → +11 s) pour la survie débutante, et rétablir deux charges simultanées de flèche en V2 pour raccourcir les parties humain et ramener l’accès bon sous 60 %, tout en essayant de conserver les victoires expert. Les effectifs FILE/MEUTE/NUÉE de N.R ne sont pas utilisés par le directeur (littéraux dans le module), donc aucun faux réglage de ces champs. Mines +14 et dards +17 inchangés ; bornes, pilotes et règles létales inchangés. Au terme de cette passe : arrêt au plafond de cinq, quels que soient les résultats.

Collecte des 160 essais terminée, avec un cas expert non fini à 540,1770833508882 s, aucun seuil abaissé ni durée finale imputée. Humain reste au-dessus de 210 s, maladroit sous 45 s. Les cibles expert sont à vérifier du fait du cas borné. Candidate 2 meilleure parmi les séries entièrement finies : 11/20 B. Arrêt obligatoire au plafond de cinq passes ; aucune sixième passe.

| Paramètre N.R | Avant | Après |
|---|---:|---:|
| secteurs.0.vagues.0.plafond | 12 | 8 |
| secteurs.0.vagues.1.chargesFleches | 1 | 2 |
| secteurs.0.vagues.0.formations.1.t | 5 | 11 |

| Cible B | Avant | Après |
|---|---|---|
| inerte.35 | tenue | tenue |
| inerte.mur8 | non tenue | non tenue |
| tourneur.90 | tenue | tenue |
| maladroit.mediane | non tenue | non tenue |
| maladroit.cyclope | tenue | tenue |
| kamikaze.avant | tenue | tenue |
| kamikaze.gagne | tenue | tenue |
| humain.mediane | non tenue | non tenue |
| humain.lassoCourt | non tenue | non tenue |
| humain.lassoLong | non tenue | non tenue |
| bon.cyclope | non tenue | tenue |
| bon.bat | tenue | tenue |
| expert.bat | tenue | à vérifier |
| expert.perdVie | tenue | à vérifier |
| dieu.duree | non tenue | non tenue |
| dieu.combat | non tenue | non tenue |
| dieu.erreurs | tenue | tenue |
| rythme.pics | non tenue | non tenue |
| rythme.respiration | non tenue | non tenue |
| rythme.tirs | tenue | tenue |

B tenues : 10 → 9/20. Nouvelles B depuis le début des passes : aucune. B perdues depuis la candidate précédente : expert.bat, expert.perdVie. Passes consécutives sans nouvelle B : 1. **ARRÊT OBLIGATOIRE atteint : aucune passe supplémentaire.**

