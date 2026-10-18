# codex-p37 — politique humaine et mesures appariées

18/10/2026 · 05 h 26 (Paris), mis à jour à 18/10/2026 · 05 h 26.

**Commande hors bac :** `cd proto-neon && node tools/codex-p37/verifier.mjs`. Le script est complet, sa syntaxe et l'import Playwright ont été contrôlés. Il n'a pas été exécuté : interdiction explicite de serveur local et de Chromium dans ce bac. Un Chromium muet, profils successifs paysage 844×390 tactile, portrait 390×844 tactile et bureau 1440×900 ; sources et bundle vérifiés avant démarrage.

**Livraison locale : politique humaine rétablie sur les points demandés ; 70/70 parties des autres pilotes strictement identiques. Le palier de difficulté humain n'est pas validé.** Les cibles ci-dessous sont publiées sans réglage du jeu ni seuil affaibli. La qualification navigateur/Safari reste à vérifier hors bac. Aucun commit, réseau sortant, SSH, serveur ou navigateur lancé.

## Ce qui change

- L'humain suit à nouveau le groupe de quatre ennemis ou plus et son barycentre vivant, avec le rayon, le sens et les sorties du §4.1. Il n'évalue plus les cercles p14, n'anticipe plus sa file de réaction et ne protège plus son LASSO en déclenchant TRAVERSÉE.
- L'humain n'écrit plus de pouvoir ni d'APOGÉE. Le banc conserve ACTIONS AUTO, qui déclenche les vrais pouvoirs du jeu. Aucun boost ajouté.
- Réaction et bruit lus dans les valeurs déjà présentes de N.R.pilotes.humain. Ajout seul de N.R.pilotageContrat.lasso : valeurs historiques inchangées du §4.1 centralisées, justifiées dans la section p37 de demandes.md. Bon/expert gardent p14 ; les autres politiques gardent leur résultat jusqu'au journal complet et aux sorties d'entrée.

## Protocole et validation de l'instrument

Sources reçues : HEAD `0ac28eb76550033717647d4486ece94b09709a20`, empreinte `d248653b8461b4a5e29d68ddf6dc573fa9ff2bc260a35ed371440dab666f5158`. Candidat : `9251c198993b3f8fc91abc970810191f2da18427667207881ebd7f3455fa5aeb`. [Provenance et manifeste](provenance.json), [sources avant](sources-avant.json.gz), [sources après](sources-apres.json.gz), [construction sortie 0](build.log). Les seuls fichiers source différents sont `02-regles.js` et `85-pilote.js`. Le bundle index.html est reconstruit, aucune édition manuelle.

[Calibration VM](validation-vm.json) : **10/10 identiques**, huit pilotes représentés, au moins dix parties historiques sur les sources de e1bdc6f lues par git show, temps de jeu/combat/simulation, vague et score exacts ; zéro erreur. L'ancien état ne sert pas de référence de non-régression.

Les 240 parties actuelles utilisent les sources réelles dans l'ordre de build.mjs, VM Node sans DOM. Une VM vierge par partie, stockage vide, S.jour=20261017, réglage auto pour humain et doigts pour les autres, intro.skip, reset(graine,{depart:'plongee'}), repli dbg.etat('plongee') uniquement si demarrage, lancement du pilote, god pour dieu, journal actif, horloge.avancer une fois puis dbg.simuler(0.25), arrêt au premier fin observé ou à 540 secondes de jeu. Les séquences de partie ne sont pas sautées. Garde de secours inchangée à quatre fois le temps simulé et dix secondes de stagnation.

[Avant](avant.json), [après](apres.json), reçus complets gzip dans recus/ : sept pilotes × dix graines et humain × cinquante graines par état. Un observateur passif du crochet public relève S.input après le vrai pilote, avant consommation par le jeu ; aucun résultat n'est déduit d'un compteur d'appels. La mesure des pouvoirs effectifs repose sur les événements debut du jeu. **0 erreur** sur ces 240 parties ; 0 journal privé de son événement partie. Aucun reçu ancien réutilisé par simple numéro de graine.

Une correction de la ligne de dispatch optionnelle synthese a eu lieu pendant la série avant ; les branches de simulation, le chargeur et la fonction de partie n'ont pas changé. L'instrument avant est reconstitué et vérifié octet pour octet contre son empreinte dans [instrument-avant.mjs](instrument-avant.mjs) ; la différence exacte et l'empreinte du corps de partie sont dans provenance.json. Aucun résultat n'est recalculé pour cette correction sans effet.

## Mesures humain avant/après, graines 1–50

| Mesure | Avant reçu | Après p37 | Contrat / définition |
|---|---:|---:|---|
| Parties terminées / censurées | 50 / 0 | 50 / 0 | 50 graines chacune |
| Game over médian, défaites seulement | 95,386 s (38 défaites) | 194,299 s (46 défaites) | 120–210 s |
| Médiane de toutes les fins | 188,799 s | 230,874 s | variable distincte publiée pour lever toute ambiguïté |
| Arrivée CYCLOPE, phase/arrivee | 17/50 | 12/50 | 10–35 % |
| Entrée en combat, phase/entree | 17/50 | 12/50 | aucun repli par un panneau |
| Victoire CYCLOPE | 12/50 | 4/50 | 2–12 % ; section/victoire ou phase/mort |
| Au moins un événement coup en V1 | 7/50 | 8/50 | au moins 50 % ; mort publiée séparément |
| Tentatives LASSO / dont <4 cibles | 790 / 784 | 942 / 0 | minimum quatre à chaque entrée |
| Tentatives réussies / captures réelles | 158 / 183 | 36 / 67 | journal lasso dans [entrée, sortie +0,3 s] |
| LASSO court, longueur 8–20 | 32/164 (19,512 %) | 8/360 (2,222 %) | au moins 50 % |
| LASSO long, longueur 30–40 | 59/279 (21,147 %) | 14/277 (5,054 %) | au moins 40 % |
| Impulsions pouvoir / APOGÉE écrites dans S.input | 199 / 90 | 0 / 0 | 0 / 0 pour humain |
| Décisions pouvoir / APOGÉE du journal pilote | 206 / 90 | 0 / 0 | 0 / 0 pour humain |
| Débuts effectifs de pouvoir / APOGÉE | 251 / 111 | 79 / 100 | après : uniquement ACTIONS AUTO |
| Pas avec boost manuel | 0 | 0 | 0 |
| Erreurs VM humain | 0 | 0 | 0 |

Verdicts séparés : medianeGameOver : **tenu** ; arrivee : **tenu** ; victoire : **tenu** ; coupV1 : **ÉCHEC** ; lassoCourt : **ÉCHEC** ; lassoLong : **ÉCHEC**. Une cible échouée reste échouée ; une absence de tentative vaut non mesurable. Les tentatives de la même partie ne sont pas des observations indépendantes de joueuses. Cette correction de politique n'est pas un réglage de difficulté pour faire entrer artificiellement une médiane dans sa cible.

[Les cent lignes brutes CSV](humain-100.csv) et [les données structurées](humain-bruts.json) publient horloge globale, temps de combat, temps simulé, arrivée et entrée du CYCLOPE par événement, victoire, LASSO, décisions et sorties des pouvoirs. Les charges de mort restent imbriquées avec leur propre t ; elles n'écrasent jamais tHorloge. Alerte et panneau ne servent jamais de preuve d'arrivée au boss. La médiane game over est conditionnelle aux défaites terminées ; les victoires ne sont pas ajoutées silencieusement à cette variable.

## Non-régression des sept autres pilotes

[Paires détaillées](paires-70.json) : **70/70 identiques**, graines 1–10 pour inerte, tourneur, maladroit, kamikaze, bon, expert et dieu. Comparaison exacte de raison, état, temps jeu/combat/simulation, pas, vague, score, erreurs, SHA-256 du journal complet et SHA-256 des sorties d'entrée. Les différences actuelles avec e1bdc6f ne sont pas imputées à ce lot.

## Conformité point par point

[Scènes construites](conformite.json) : 20/20 contrôles passés sur les vraies sources, sans physique lorsque les vues S sont synthétiques. Elles isolent la politique ; elles ne sont pas présentées comme des parties naturelles.

| Point du contrat | Preuve et portée |
|---|---|
| §1 lectures / écritures / hasard | Recherche des accès modules et champs privés, flux pilote seul, absence de pause/retour/car/gestes/taps ; revue du diff ; S.input réellement observé |
| §2 réaction | 14 pas initiaux sans direction ; première direction au quinzième pas ; réponse différée exactement 14 pas après l'apparition d'un télégraphe construit, conformément à round(0,12 / (1/120)) |
| §2 bruit | Scène de deux minutes sans ralenti : 480 notes, moyenne −0,124°, écart type 5,843° pour 5,774° attendu ; bornes ±10° et tolérances du §8 tenues ; sorties retardées vérifiées |
| §3 champ de potentiel | 25 caps, prédiction, potentiel et hystérésis inchangés ; reprise du champ au pas même d'une sortie danger |
| §4.1 groupe | Refus à trois cibles, sous huit segments et au-delà de 140 px ; plus grand groupe et égalité par distance ; portail/mort/proie exclus |
| §4.1 rayon / sens / guidage | Rayon max(26, éloignement+16), sens à l'entrée ; cap contractuel exact sans compensation ; barycentre recalculé sur les vivants ; pas de planSur pour humain |
| §4.1 sorties | Scènes vide, boucle, temps et danger ; intervalle strict au-delà de 1,5 s ; tentative réussie calculée jusqu'à sortie+0,3 s sur événements lasso |
| §4.2 pouvoir / APOGÉE | Sorties nulles même face à une menace et malgré les jauges prêtes ; contrôle sur 50 parties après, réglage auto conservé |
| §4.3 boost / course | Zéro boost manuel ; course 0,80 dans le combat, sans poussée auto à 1 |
| §4.4 cartes | Ordre fixe, attente 0,45 s, impulsion séparée des suivantes ; politique inchangée |
| §4.5 états et VOL | États sans action et sans validation, porte/cellule temporelle puis esquive de mine ; politique inchangée |
| §5 autres pilotes | Sept politiques : 70 paires naturelles identiques ; variantes expert inchangées dans le diff, hors de la batterie de 70 |

Les deux échecs de la première passe construite sont conservés dans [echec-scenarios-initial.json](echec-scenarios-initial.json) : le projectile unique ne déclenchait pas la sortie danger attendue (le potentiel total peut rester sous CERT avec les attractions), et la recherche statique rejetait les crochets autorisés window.__N/__PILOT. La scène danger contient maintenant deux projectiles superposés ; le filtre distingue les crochets globaux des champs privés de modules. Aucune règle, tolérance ou seuil de réussite du jeu n'a changé pour faire passer ces tests.

## Ce qui reste

Les dix parties logiques complémentaires [portrait/bureau](profils-vm.json) sont sans erreur ni impulsion interdite : cinq graines humain par profil. Cela ne vaut pas un essai DOM, des pixels navigateur ou Safari physique.

Le script Playwright prêt produit 70 paires et 50 paires humain en paysage, cinq humains portrait et bureau, captures, vrais tampons palette, journal et erreurs. Il ferme chaque contexte avant le suivant et n'ouvre qu'un Chromium --mute-audio. Il refuse les connexions extérieures et les sources/bundles dérivés. Commande en tête du rapport.

**Chantier bloqué pour la qualification finale** : il faut le retour de ce banc hors bac et l'examen des cibles humaines échouées par la cheffe d'orchestre, avec R-04 corrigé par p36. Le contrat gelé et les seuils n'ont pas été modifiés pour atteindre ces cibles. La vérification sur un iPhone Safari réel reste distincte. Retour arrière préparé : sources-avant.json.gz et diff local, sans commit.
