# Codex-12 — rythme et bannières

18/10/2026 · 05 h 32 (Paris), mis à jour à 18/10/2026 · 05 h 32.

**Regroupement V5 non retenu : garde de durée ±10 % échouée.** Le code courant a retrouvé le mélange précédent. La source candidate et tous ses reçus restent figés ; aucun autre regroupement ni réglage des cibles B essayé. Le palier R14/R15 reste à arbitrer par Claude.

La référence compte 80/80 fins, le candidat 78/80 ; zéro erreur logique/console dans les deux séries. 2 cas après atteignent la borne de 540 s sans fin, expert/2 et dieu/2. Ces censures ne sont ni victoires ni défaites imputées. La collecte VM ne revendique pas une égalité stricte du journal avec Chromium : la limite de codex-11 reste publiée.

## Proposition et garde de durée

Neuf salves V5 nominales groupées deux par deux à 11/21/31/41 s, puis dernière à 46 s. Mêmes quotas, plafonds, effectifs nominaux, PV, dégâts, vitesses, armement et cadences paramétrées ; le regroupement change la chronologie des attaques. Toutes les règles préexistantes sont comparées dans ecarts.mjs, sans autre variation numérique. Les pics bon sur dix graines passent de [6,9.5,15,20,18] à [6,9.5,15,20,22]. Ce progrès ne compense pas la garde de durée manquée.

| Pilote (10 graines) | Arrêt médian avant (s) | Après (s) | Écart | Victoires avant → après |
|---|---:|---:|---:|---:|
| inerte | 43,98 | 43,98 | 0,00 % | 0 → 0 |
| tourneur | 42,99 | 42,99 | 0,00 % | 0 → 0 |
| maladroit | 52,18 | 52,18 | 0,00 % | 0 → 0 |
| kamikaze | 83,07 | 83,07 | 0,00 % | 0 → 0 |
| humain | 289,66 | 234,67 | -18,99 % | 4 → 1 |
| bon | 369,75 | 247,09 | -33,18 % | 5 → 3 |
| expert | 354,46 | 353,90 | -0,16 % | 6 → 6 |
| dieu | 372,27 | 375,27 | 0,81 % | 10 → 9 |

Ces médianes d’arrêt comprennent les victoires et les bornes. La durée de game over de R04 exclut les victoires : son écart humain est 146,08 %, avec changement du sous-ensemble de parties perdues. Ces chiffres proviennent des 80 cas appariés demandés ; aucune nouvelle qualification de 400 cas n’est revendiquée. Les durées et résultats individuels sont conservés dans ecarts.json.

| Vague, pilote bon | Médiane avant (s) | Après (s) | Écart | Fins observées avant / après |
|---|---:|---:|---:|---:|
| V1 | 23,89 | 23,89 | 0,00 % | 10 / 10 |
| V2 | 38,39 | 38,39 | 0,00 % | 9 / 9 |
| V3 | 44,01 | 44,01 | 0,00 % | 8 / 8 |
| V4 | 54,87 | 54,87 | 0,00 % | 7 / 7 |
| V5 | 58,46 | 60,28 | 3,11 % | 6 / 3 |

L’écart sur les seules graines où la même vague est nettoyée dans les deux versions est aussi publié dans ecarts.json, pour rendre visible le changement de population. V1 et la médiane maladroite restent dans leurs cibles sur ces dix graines ; ce résultat borné ne vaut pas une nouvelle validation sur cinquante.

## Bannières : correction de l’étalon et du producteur

Décision Claude du 18/10 à 05 h 08 : compter les admissions réelles, avec la même décision en simulation et avec dessin. Le HUD journalise hudBanniereAdmise lors de la sélection de bannière ; le journal géométrique hudBanniere du dessin reste distinct. La temporisation lit l’horloge de jeu, sans attendre draw. Une réserve pendant respiration, transition et DÉFILÉ protège l’annonce de la vague suivante ; cette entrée est prioritaire. Nettoyage et VOL PARFAIT deviennent des étiquettes. Les fichiers réservés 78-hud et 79-scene restent des correctifs à appliquer par Claude.

7/7 contrats du composant réel passent : anciennes demandes sous dix secondes en échec, admissions conformes, mêmes admissions avec/sans dessin, chaque admission dessinée retrouvée au journal géométrique, réserve et entrée conservées, zéro erreur. Reçu contrats-hud.json, correctifs raccord-78-hud.patch et raccord-79-scene.patch.

La référence ancienne ne journalise pas les admissions sans dessin. Son ancien R14 compte les demandes brutes : ce résultat est conservé comme historique, sans le comparer directement aux admissions après. Avec le correcteur autorisé, l’absence de journal d’admission se déclare non mesurable, jamais zéro violation. Aucun rejeu des soixante parties navigateur avant pour masquer cette limite.

## Critères Chromium — instruments et échecs conservés

| Critère | Avant (instrument original) | Candidat figé après |
|---|---|---|
| R-14 | echec — 0 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables | echec — 1 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-15 | echec — 2 ok, 6 en échec, 0 indicatives hors cible, 0 non mesurables | echec — 4 ok, 4 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-31 | echec — 6 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables | ok — 7 ok, 0 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-35 | echec — 1 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables | echec — 1 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |

Rapports complets : [avant](criteres-avant/rapport.md), [candidat après](criteres-apres/rapport.md). R14 après utilise l’étalon d’admission autorisé ; R15, R31 et R35 gardent leurs critères d’origine. Les défauts préexistants de R31/R35 ne sont pas présentés comme des acquis. Chaque rapport conserve ses erreurs, limites et données. Chromium muet, un seul navigateur, attente du verrou chef et marqueur exclusif.

R15 exige un pic pour chaque vague entrée, y compris une partie perdue avant l’heure de ce pic : bon/4 finit V5 après 12,05 s alors que le pic est prévu à 32 s ; bon/9 finit V3 après 12,625 s contre un pic prévu à 30 s. Diagnostic et reçus sources dans diagnostic.json. Règle des vagues interrompues soumise à Claude ; aucun faux événement de pic ou respiration ajouté. Les échecs originaux restent conservés jusqu’à arbitrage de cet étalon.

Mesures après : 0 violation sur 165 admissions ; 14,92 % d’images secouées contre 12 %. Annonces de vague : 41,95 → 100,00 % (205 entrées après). Pics Chromium bon50 : [6,10,17.5,20,24]. Respirations selon l’étalon original : 91,98 → 90,91 %, encore en échec. R31 passe ses sept mesures sur le candidat rejeté ; cela ne qualifie pas le code courant après retrait. R35 conserve la V1 conforme et les deux échecs de relance.

Vérification supplémentaire par lecture des mêmes reçus : 205/205 entrées correspondent à l’admission de leur vraie bannière dans la fenêtre du R15 (pas seulement à une demande). Sur les soixante parties, 971 admissions ordinaires hors CYCLOPE et 0 intervalle inférieur à dix secondes. Reçu annonces-admises.json ; aucune partie rejouée.

## Livraison et suite

Le candidat regroupé est archivé dans apres-sources.json et apres.html.gz ; son rejet n’a pas remplacé ces fichiers par le retrait du regroupement. Les intégrations parallèles ont été préservées par rebase et restent hors de cette paire figée. Le code courant a retrouvé le mélange antérieur, avec les seules réserves de bannière facultatives en préparation. Les correctifs HUD/scène n’ont pas de qualification80 indépendante revendiquée.

Le patch des ennemis p27b attend l’instruction explicite de Claude : il n’est pas appliqué. Aucun nouveau réglage ni80 supplémentaire engagé après l’échec. Arbitrage requis sur les pics sous garde10 %, la règle R15 avant pic et la qualification séparée du correctif HUD. Lot de regroupement arrêté ; chantier global en cours.
