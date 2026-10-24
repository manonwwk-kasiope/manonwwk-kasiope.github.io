# codex-p14 — méthode

18/10/2026 · 02 h 34 (Paris). Heure exacte d'exécution dans chaque reçu JSON.

Objectif : séparer géométrie, détection, puis décisions de pilotage ; aucun seuil R-04/R-34 ni règle du jeu modifié. Sources reçues : e47f22f, instantané complet compressé dans sources-avant.json.gz. Le fichier demandé refonte/REFONTE.md n'existe pas : référence réelle proto-neon/REFONTE.md, § 2.12, amendée par la morsure qui coupe dans N.R.

VM Node sans DOM, vraies sources ordonnées comme build.mjs, initialisation équivalente au boot et protocole exact parties.mjs. Calibration bloquante : dix parties e1bdc6f, temps/vague/score exacts, plus temps combat et simulation. Réussite d'une tentative : vrai événement lasso avec n>0, entre lassoTente et lassoFin ; aucun compteur d'appels. Tranches 8–20, 21–29 et 30–40 publiées avec numérateurs, dénominateurs et temps d'exposition. LASSO/APOGÉE de l'expert : événements réels par partie. Vingt graines appariées 1–20 ; mesures exploratoires, pas une qualification humaine Safari.

Cas géométriques : cercle parfait puis carré autour d'une cible immobile/mobile, écarts de fermeture 0/1/3/6/10 px, longueurs 8/20/40 ; aire trop petite et périmètre trop long comme témoins négatifs. force() est réservé à ces fixtures de détection ; jamais dans les pilotes. Dégâts et journal observés sur les vrais modules. Cas de doigt : pilote via S.input seulement autour d'une cible isolée, avec réaction et bruit d'origine ; pas d'armes mises à jour dans ce cas isolé, distinction explicite avec les parties complètes.

Budget : jusqu'à quatre variantes structurelles sur vingt graines et un contrôle final ; arrêter après deux variantes consécutives sans gain de réussite, ou en cas de VM invalide / erreur jeu. Un seul processus de parties lourd à la fois, reçus liés aux sources et écrits après chaque partie, pas de reprise d'effets. Les variantes sont conservées même en échec. Pas de tuning des règles ni d'abaissement des seuils. Seules les politiques humain/bon/expert changent ; les autres pilotes doivent conserver leurs parties sur les sources reçues.

Navigateur : script Playwright complet, trois profils en série, un Chromium muet ; interdit de l'exécuter ici. La vérification du navigateur et de Safari reste à la cheffe d'orchestre. Aucun agent délégué, aucun commit.

18/10/2026 · 02 h 56 (Paris), mis à jour à 02 h 56. Budget consommé : 4/4 variantes et contrôle final complet de la candidate 2, aucun travail de simulation encore engagé. Instantanés compilés immuables par série ; politiques rejetées et configurations archivées. Résultats et chemins de reprise dans rapport.md et synthese.json. Ne pas rejouer ces séries : prochaine action utile = exécution Playwright hors bac puis nouvelle hypothèse structurelle pour les captures manquées en vraie partie. Aucun maintien des 80 références historiques revendiqué.
