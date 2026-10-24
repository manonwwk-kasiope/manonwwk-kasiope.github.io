# Ordre13 — brasier des morts d’élites

18/10/2026 · 10 h 56 (Paris), mis à jour à 18/10/2026 · 10 h 56.

**80/80 cas appariés gardent toutes les métriques du banc, 0/0 erreur(s) JavaScript/console.** 79/80 fins avant et 79/80 après ; censures : [{"pilote":"dieu","graine":2,"temps":540.2216666824312,"raison":"borne","recu":"recus/b3c16543ac912390-dieu-2.json.gz"}]. Tous les reçus restent archivés, y compris les bornes.

Base 45ef605 : sources et bundle figés avant modification. Seul 79-scene change. La mort émet déjà elite dans72-ennemis : aucune retouche de ce producteur, de 50-fx, des règles ou des pilotes. L’empreinte brasier est bornée dans le cadrage : une explosion dont le point de mort est hors champ ne perd plus toute son aire visible. Rayon, épaisseur, durée, cadence, planification et appel de flashGate restent identiques. Cible, coordonnées de kill et combat inchangés. Le centre de cette empreinte visuelle se rapproche du cadre ; le CYCLOPE utilise aussi ce chemin commun, il est donc contrôlé explicitement.

4/4 contrats du producteur passent, dont porte refusée → aucune onde brasier, impact hors vue → centre dans le cadre sans mutation de la charge, impact central conservé, aire/durée prévues conservées. Ces contrats ne remplacent pas les mesures du tampon ci-dessous.

## R12 — tampon et caméra appariée

| Profil et mort | Avant : images > 8 %, brasier maximal | Après : images > 8 %, brasier maximal |
|---|---:|---:|
| paysage, mort du CYCLOPE | 54 ; 16,079 % | 53 ; 21,946 % |
| paysage, mort de l’élite flecheBlindee | 0 ; 5,916 % | 20 ; 20,766 % |
| paysage, mort de l’élite rival | 0 ; 6,273 % | 20 ; 20,621 % |
| paysage, mort de l’élite rucheInstable | 0 ; 1,795 % | 20 ; 19,731 % |
| portrait, mort du CYCLOPE | 19 ; 10,094 % | 19 ; 10,094 % |
| portrait, mort de l’élite flecheBlindee | 20 ; 10,262 % | 32 ; 31,931 % |
| portrait, mort de l’élite rival | 22 ; 10,616 % | 34 ; 31,931 % |
| portrait, mort de l’élite rucheInstable | 10 ; 9,271 % | 32 ; 31,931 % |
| bureau, mort du CYCLOPE | 54 ; 18,932 % | 53 ; 21,964 % |
| bureau, mort de l’élite flecheBlindee | 0 ; 6,093 % | 25 ; 22,784 % |
| bureau, mort de l’élite rival | 0 ; 6,220 % | 26 ; 22,110 % |
| bureau, mort de l’élite rucheInstable | 0 ; 4,558 % | 27 ; 21,479 % |

paysage : avant 9 ok, 3 en échec, 0 indicatives hors cible, 0 non mesurables, après 12 ok, 0 en échec, 0 indicatives hors cible, 0 non mesurables.

portrait : avant 12 ok, 0 en échec, 0 indicatives hors cible, 0 non mesurables, après 12 ok, 0 en échec, 0 indicatives hors cible, 0 non mesurables.

bureau : avant 9 ok, 3 en échec, 0 indicatives hors cible, 0 non mesurables, après 12 ok, 0 en échec, 0 indicatives hors cible, 0 non mesurables.

Caméra : même réducteur officiel, trente images après le coup appariées au témoin sans coup, suivi exclu. Les branches préalables et les erreurs restent dans les JSON. Aucun déplacement d’ennemi pour réussir la mesure.

## R13 — porte et transitions du tampon

| Profil | Avant tampon / journal | Après tampon / journal | Statut après |
|---|---:|---:|---|
| paysage | 0 / 13 | 0 / 13 | echec : 1 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |
| portrait | 6 / 23 | 6 / 23 | echec : 0 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| bureau | 5 / 15 | 4 / 15 | echec : 0 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| paysage-reduit | 2 / 28 | 2 / 28 | echec : 1 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |

Le volet journal de l’instrument reçu compte tous les `accepte`, y compris les décisions sous le seuil et les rafales : ces valeurs ne sont donc pas présentées comme un nombre certifié de flashs physiques au-dessus de 6,6 %. Son échec officiel reste publié. La rafale utilise le setInterval de66ms du critère reçu : même protocole, sans promesse d’appariement strict image par image de R13 ni attribution causale d’un petit écart avant/après. Sources : mesure/criteres/R-13-photosensibilite.mjs et avant-sources.json (50-fx).


Chaque phase analyse la minute complète et la rafale du critère officiel, seuil ≤ 3/s au-delà de 6,6 % inchangé. Si le journal ou le tampon échoue, cet échec est publié, sans le transformer en conformité ni retoucher50 réservé par p35/p38. Les deux familles de transitions sont celles de l’étalon reçu, avec ses limites de recouvrement spatial publiées.

Console/page/jeu : 14 sessions contrôlées, 0 avec erreur(s). Détail intégral : criteres-execution.json.

## Portée et suite

160 simulations VM bornées sur la paire, protocole p5 et limite historique de parité stricte VM/Chromium conservés. Instruments officiels figés par copie ; aucune modification d’étalon R12/R13. Chromium muet et exclusif, marqueur propre uniquement, phases séquentielles. L’attente60405 a été arrêtée avant toute mesure pour corriger le contrôleur de fermeture des sessions ; la file courante de criteres-execution.json est la seule à avoir mesuré la paire ;61506 s’est arrêté avant navigateur sur une course du créneau, sans reçu à rejouer. Les intégrations ultérieures ne sont pas couvertes implicitement par ces reçus. Aucun essai Safari/iPhone physique revendiqué.

**Lot arrêté, palier non validé** : R12 est conforme sur cette paire, mais R13 reste au-dessus de3/s en portrait et au bureau. La correction globale de R13 et son étalon restent à arbitrer par Claude avec les travaux50 réservés à p35/p38. Aucune nouvelle valeur ni atténuation des seuils n’a été essayée.
