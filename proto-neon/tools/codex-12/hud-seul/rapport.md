# Ordre12 — qualification du correctif HUD seul

18/10/2026 · 06 h 31 (Paris), mis à jour à 18/10/2026 · 06 h 31.

**80/80 cas ont les mêmes métriques avant/après ; 0 / 0 erreur(s) JavaScript/console.** 79/80 fins avant et 79/80 après ; même borne dieu/2 à 540 s conservée. Aucun regroupement ni réglage de difficulté dans cette paire.

Sources gelées sur la pointe e52da2d au démarrage, incluant le raccord p27b déjà appliqué par Claude. Seuls 78-hud et 79-scene changent ; règles, directeur, défilé, pilotes et tous les autres modules identiques. Le HUD est appliqué dans src/78-hud.js sous réservation ; 79-scene est une copie avec le correctif autorisé, en attendant l’intégration p15c et son application par Claude. Les pulls ultérieurs sont conservés hors paire. Cette preuve ne qualifie pas à elle seule une future intégration différente.

Le protocole de partie p5 est conservé. La première exécution a subi un SIGSEGV natif du worker bon après 50 cas agrégés, sans erreur du jeu dans les reçus : incident-native.json conserve le signal, le log et sa limite (cause native non établie). Reprise par processus de graine, série, sans écraser ni rejouer les reçus existants. La mémoire libre mesurée après l’incident était 35 %, ce qui ne prouve pas sa cause. Aucun nouvel arrêt natif sur la reprise 80 avant puis 80 après. Les limites d’égalité stricte VM/Chromium du lot 11 ne sont pas transformées ici en garantie.

## Écarts appariés

| Pilote, 10 graines | Arrêt médian avant (s) | Après (s) | Écart |
|---|---:|---:|---:|
| inerte | 43,98 | 43,98 | 0,00 % |
| tourneur | 42,99 | 42,99 | 0,00 % |
| maladroit | 52,86 | 52,86 | 0,00 % |
| kamikaze | 90,01 | 90,01 | 0,00 % |
| humain | 208,84 | 208,84 | 0,00 % |
| bon | 257,97 | 257,97 | 0,00 % |
| expert | 336,82 | 336,82 | 0,00 % |
| dieu | 365,30 | 365,30 | 0,00 % |

Toutes les observations du banc sont comparées par pilote/graine, hors chemin du reçu : score, temps, fin, vague, arrivées, combat, pertes, LASSO/APOGÉE et observations de densité. Les journaux complets restent archivés ; les admissions HUD ajoutées ne sont pas présentées comme un journal strictement identique. Ce lot de 80 n’est pas une nouvelle qualification des ciblesB sur 400 cas ni une mesure de difficulté humaine. Détails : ecarts.json et recus/.

## Étalons et contrats

6/6 contreexemples R15 conformes : perte à 12 s avant un pic prévu à 30 s exclue, respiration non exigible pour cette perte, dépassement à 31 s sans pic toujours en échec, limite à 30 s exigible, vrai pic accepté et profil conservé. Les vagues interrompues sont comptées séparément par profil dans les notes JSON de R15 ; seul le profil paysage du banc est mesuré. Seuils numériques inchangés.

7/7 contrats HUD passent sur cette même base : mêmes admissions avec/sans dessin, rendus géométriques retrouvés, entrée protégée et espacement respecté. La file journalise l’admission au moment de sa décision, sans dépendre du draw. La référence antérieure au correctif n’a pas ce journal en mode simulé : son volet admission R14 est déclaré non mesurable, jamais zéro violation.

Sur les 60 parties Chromium après, 943 admissions ordinaires hors CYCLOPE et 0 intervalle inférieur à 10 s ; 203/203 entrées de vague correspondent à l’admission de leur vraie bannière dans la fenêtre R15, et non à une simple demande. Vérification par lecture des mêmes reçus, sans partie supplémentaire : admissions.json.

Exclusions R15 avant : 14 vagues ; par profil : {"paysage":{"total":14,"V4":2,"V3":4,"V5":8}}. Détail des cas dans R-15.json.

Exclusions R15 après : 14 vagues ; par profil : {"paysage":{"total":14,"V4":2,"V3":4,"V5":8}}. Détail des cas dans R-15.json.

Les 60 états finaux Chromium appariés sont aussi strictement identiques (ecarts-chromium-fins.json) ; les 60 reçus après indiquent zéro erreur du jeu, console et page (admissions.json).

## Critères Chromium avant/après

| Critère | Avant | Après |
|---|---|---|
| R-14 | echec : 0 ok, 1 en échec, 0 indicatives hors cible, 1 non mesurables | echec : 1 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-15 | echec : 5 ok, 3 en échec, 0 indicatives hors cible, 0 non mesurables | echec : 6 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-31 | echec : 5 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables | echec : 5 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-35 | echec : 1 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables | echec : 1 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |

Rapports et seuils complets : [avant](criteres-avant/rapport.md), [après](criteres-apres/rapport.md). Mêmes modes complets, mêmes graines, même correcteur R15 dans les deux versions. R14 lit les admissions selon l’arbitrage Claude ; la limite de référence ancienne reste visible. Les défauts préexistants R31/R35 et les pics/respirations destinés au jury restent publiés sans retouche de règle ni de jeu pour les masquer. Chromium muet, exclusif ; aucun doublon, les marqueurs d’autrui conservés.

## Secousses : mesure et cause

Le pire cas reçu est bon/6 : 16,34 % des pas secoués. Un seul contrôle supplémentaire applique la préférence publique SECOUSSE=0 sur cette même source : 0,00 %, métriques finales identiques : true. Aucun paramètre livré n’est changé par ce contrôle. Ablation du réglage public SECOUSSE : baisse mesurée sans changement des métriques finales. Le chemin trauma de50-fx contribue causalement à cette occupation ; les appels observés et sa décroissance sans budget temporel sont documentés, sans attribuer une fraction à chaque émetteur.

Chemin source : 79-scene.onKill appelle boom/shake, 50-fx cumule un trauma et le décroît en temps réel, puis écrit S.shake ; la branche de secousse ne lit pas le budget temporel imagesSecouees de 12 %. Les appels observés et leurs piles sont conservés dans diagnostic-secousses.json, le reçu de contrôle dans diagnostic-secousses-raw.json.gz. La part par émetteur n’est pas attribuée sans ablation spécifique.

## Suite

Aucun retour aux réglages B, aux regroupements ni au patch p27b (déjà intégré). Les résultats graphiques ne valent pas un essai iPhone physique. Le correctif 79-scene reste à appliquer par Claude après p15c ; la portée des reçus est la paire figée et ses deux modules. La médiation décide du palier ; les critères manqués ne constituent pas une livraison globalement validée.
