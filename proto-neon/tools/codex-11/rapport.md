# codex-11 — directeur des vagues

18/10/2026 · 04 h 51 (Paris) · mis à jour à 18/10/2026 · 04 h 51.

Source et preuves livrables pour médiation. **Réglage global non validé : 5 → 7/20 cibles B.** 397/400 fins après, 0 erreur(s) VM/console ; 3 cas censuré(s), borne de 540 s conservée. Équivalence VM/Chromium sur dix références par version : NON CONFORME : les métriques VM ne constituent pas une qualification.

Le directeur lit les effectifs de toutes les formations dans N.R et réserve la borne haute de la NUÉE. Chaque création respecte le plafond régulier ; l’attente de vingt secondes ne crée plus de dérogation. Les TRAQUEURS restent hors quota régulier, sont inclus dans la limite totale et ne consomment annonce/compteur que si leur création réussit. Les deux défauts introduits par la première garde ont été reproduits puis réparés : deux échecs avant, dix-huit contrôles après conformes. Les naissances autonomes de 72 et les convois de 73 restent hors de cette garde du producteur 76.

V1 dispose d’un budget de 23,5 s incluant huit secondes de respiration, avec peu d’ennemis au début et des plafonds progressifs. V2 revient à 38 s, V3 à 44 s. La fin ne dépend plus d’une file suspendue et purgée. Les formations, quotas, plafonds, vitesses et durées nominales de combat V4/V5 sont identiques dans les sources avant/après ; la fin suit la respiration sans attente supplémentaire. Cela ne prouve pas une difficulté humaine identique, car l’état de la joueuse à leur entrée évolue avec les vagues précédentes.

## Mesures demandées

| Mesure | Avant | Après |
|---|---:|---:|
| V1, médiane du pilote bon | 35,14s (n=48) | 23,89s (n=50) |
| Maladroit, temps médian d’arrêt | 18,80s | 55,51s |
| Humain, temps médian d’arrêt | 173,29s | 230,87s |
| Dieu, temps médian d’arrêt | 407,90s | 386,36s |
| Cinq VOLS dans les parties gagnées | true (n=64) | true (n=74) |
| Respirations complètes conformes ≥8s | true (n=715) | true (n=945) |

Les temps médians d’arrêt incluent les bornes lorsqu’il y en a : les lignes censurées ne sont ni des victoires ni des défaites imputées. La cible dieu porte sur toute la plage 320–390 s, pas seulement sa médiane ; le tableau complet ci-dessous conserve ce seuil. Le cinquième VOL existait déjà dans le raccord codex-10 intégré : aucune modification de 79 ni de 76-defile nécessaire.

La médiane humaine dépasse 210 s et la plage dieu dépasse 390 s ; ces objectifs ne sont pas atteints. Trois parties restent censurées à 540 s. Les trois passes autorisées sont épuisées : lot de réglage arrêté, suite soumise à Claude.

## Méthode et limites

Même banc p5, mêmes huit pilotes, graines 1–50 appariées, mêmes seuils et gardes. Banc, worker, protocole et analyse repris sans modification ; seul le chargeur accepte des sources figées. SHA et provenance dans methode-manifest.json. Avant sur 52fe12d ; après ne change que 02 (ajout directeur) et 76-directeur, dont le correctif TRAQUEUR. Les autres intégrations arrivées par pull sont préservées dans le checkout et ne sont pas incluses dans cette paire. Les cinquante graines contiennent les vingt employées pour choisir les paramètres : ce n’est pas une réserve indépendante.

Trois passes numériques, toutes conservées dans passes.json et methode.md. Première retenue ; deuxième et troisième rejetées avec cas censurés. Le correctif technique TRAQUEUR précède la qualification ; ses 400 reçus portent une nouvelle empreinte, sans faire passer les 160 précédents pour un essai de la version corrigée. Aucun réglage après cette qualification. Journaux gzip complets dans recus/, écarts par pilote/graine dans ecarts.json.

R-31/R-35 relancés avec l’instrument d’origine en mode complet sur chaque bundle, sans seuil ni nombre de graines réduit. Rapports : [avant](criteres-avant/rapport.md), [après](criteres-apres/rapport.md). Totaux après : {"ok":0,"echec":2,"partiel":0,"nonMesurable":0,"horsBanc":0,"erreur":0}. Dix références VM/Chromium par version dans equivalence-*.json ; les désaccords éventuels ne sont pas masqués. Chromium muet, un seul à la fois, attente du verrou chef et marqueur exclusif. Ces contrôles ne valent pas Safari physique ni un verdict artistique.

R-31 après : six mesures conformes, une mort par mur mobile sans annonce (zéro avant). Les cinq VOLS sont présents dans les seize victoires du lot navigateur ; le TRAVELLING V2 passe de 94,83 % à 100 %. R-35 : V1 conforme, mais REJOUER prend encore 2,81667 s et traverse le briefing dans les deux versions figées. Ces défauts restent publiés, sans correction hors réservation.

Les vingt comparaisons VM/Chromium retrouvent exactement les huit métriques finales et la structure des événements (pas, temps, image, type). Le journal complet reste STRICTEMENT différent : trois sélections de défis au démarrage portent le jour 20261017 en VM contre 20261018 dans Chromium ; les autres écarts observés sont numériques dans les données d’événement. Maximum absolu hors défis : avant = 1.639083038185163e-7 ; apres = 3.745981302927248e-11. Le diagnostic lit les reçus complets existants : aucune tolérance adoptée, aucun champ supprimé, aucune partie relancée. Cela limite la qualification VM revendiquée, malgré la concordance des métriques finales. Détails : diagnostic-equivalence.json, journaux bruts equivalence-*-recus/.

## Tableau p5 complet — mêmes cinquante graines

18/10/2026 04:51:38 (Paris), mis à jour à 18/10/2026 04:51:38.

| Pilote | Cible | Avant (50 graines) | Après (50 graines) | Seuil inchangé | B/i | Tenu après ? |
|---|---|---|---|---|---|---|
| inerte | 3 vies perdues avant 35 s | 66,00 % | 28,00 % | 100 % | B | non |
| inerte | première mort au mur avant 8 s | 0,00 % ; 10,18–10,18 s | 0,00 % ; 10,18–10,18 s | 100 % | B | non |
| tourneur | 3 vies perdues avant 90 s | 100,00 % | 98,00 % | 100 % | B | non |
| tourneur | rapport des scores médians tourneur/bon | 0,0047 | 0,0418 | < 0,10 | i | oui |
| maladroit | game over médian | 18,80 s | 55,51 s | 45–150 s | B | oui |
| maladroit | CYCLOPE atteint | 2,00 % | 0,00 % | 0/50 | B | oui |
| maladroit | premier coup avant 30 s | 92,00 % | 58,00 % | ≥ 80 % | i | non |
| kamikaze | game over avant CYCLOPE | 100,00 % | 100,00 % | ≥ 90 % | B | oui |
| kamikaze | victoires | 0,00 % | 0,00 % | ≤ 2/50 | B | oui |
| humain | game over médian | 173,29 s [parties sans fin : 1, données incomplètes] | 230,87 s | 120–210 s | B | non |
| humain | CYCLOPE atteint | 18,00 % [parties sans fin : 1, données incomplètes] | 24,00 % | 10–35 % | i | oui |
| humain | CYCLOPE battu | 10,00 % [parties sans fin : 1, données incomplètes] | 12,00 % | 2–12 % | i | oui |
| humain | au moins un coup en V1 | 48,00 % [parties sans fin : 1, données incomplètes] | 16,00 % | ≥ 50 % | i | non |
| humain | LASSO 8–20 segments | 3/603 (0,50 %) [parties sans fin : 1, données incomplètes] | 7/361 (1,94 %) | ≥ 50 % | B | non |
| humain | LASSO 30–40 segments | 13/288 (4,51 %) [parties sans fin : 1, données incomplètes] | 12/277 (4,33 %) | ≥ 40 % | B | non |
| bon | CYCLOPE atteint | 16,00 % | 22,00 % | 30–60 % | B | non |
| bon | CYCLOPE battu | 8,00 % | 12,00 % | 10–30 % | B | oui |
| bon | mort avant CYCLOPE | 100,00 % | 98,00 % | ≥ 70 % | i | oui |
| bon | au moins un coup en V1 | 62,00 % | 16,00 % | ≥ 40 % | i | non |
| bon | première longueur maximale, médiane | 159,41 | 130,25 | ≥ 120 s ou non atteinte | i | oui |
| expert | CYCLOPE atteint | 18,00 % [parties sans fin : 1, données incomplètes] | 36,00 % [parties sans fin : 1, données incomplètes] | ≥ 80 % | i | à vérifier |
| expert | CYCLOPE battu | 16,00 % [parties sans fin : 1, données incomplètes] | 28,00 % [parties sans fin : 1, données incomplètes] | 40–70 % | B | à vérifier |
| expert | au moins une vie perdue | 100,00 % [parties sans fin : 1, données incomplètes] | 98,00 % [parties sans fin : 1, données incomplètes] | ≥ 80 % | B | à vérifier |
| expert | LASSO affectant un ennemi, minimum par partie | 0,00 [parties sans fin : 1, données incomplètes] | 0,00 [parties sans fin : 1, données incomplètes] | ≥ 10 | i | à vérifier |
| expert | APOGÉE, minimum par partie | 0,00 [parties sans fin : 1, données incomplètes] | 0,00 [parties sans fin : 1, données incomplètes] | ≥ 2 | i | à vérifier |
| dieu | durée secteur, min–max | 359,20–540,17 s [parties sans fin : 3, données incomplètes] | 325,91–540,23 s [parties sans fin : 2, données incomplètes] | 320–390 s pour toutes les parties | B | à vérifier |
| dieu | combat CYCLOPE, min–max | 54,06–227,85 s [parties sans fin : 3, données incomplètes] | 50,32–222,67 s [parties sans fin : 2, données incomplètes] | 55–90 s pour toutes les parties | B | à vérifier |
| dieu | erreurs VM | 0,00 [parties sans fin : 3, données incomplètes] | 0,00 [parties sans fin : 2, données incomplètes] | 0 | B | à vérifier |
| rythme | pics médians V1 à V5 | 12,00 (n=50) ; 25,50 (n=48) ; 18,00 (n=37) ; 21,00 (n=22) ; 22,00 (n=17) | 6,00 (n=50) ; 13,50 (n=50) ; 18,00 (n=45) ; 21,00 (n=26) ; 18,50 (n=20) | V1 < V2 < V3 < V4 < V5 | B | non |
| rythme | minimum sous 40 %, après vagues terminées | 11,72 s jeu / 16,75 s simulé ; 0/139 échecs | 11,72 s jeu / 16,75 s simulé ; 0/164 échecs | ≥ 8 s de jeu | B | oui |
| rythme | parties avec tir ennemi avant V2 | 0,00 | 0,00 | 0 | B | oui |
| rythme | rapport scores médians bon/kamikaze | 1,8263 | 2,0246 | ≥ 1,3 | i | oui |

## Cas censurés et suite

- avant : humain, graine 2, arrêt à 540,11 s (borne), reçu recus/f13ba3764da4eede-humain-2.json.gz.
- avant : expert, graine 42, arrêt à 540,05 s (borne), reçu recus/f13ba3764da4eede-expert-42.json.gz.
- avant : dieu, graine 29, arrêt à 540,13 s (borne), reçu recus/f13ba3764da4eede-dieu-29.json.gz.
- avant : dieu, graine 30, arrêt à 540,16 s (borne), reçu recus/f13ba3764da4eede-dieu-30.json.gz.
- avant : dieu, graine 35, arrêt à 540,17 s (borne), reçu recus/f13ba3764da4eede-dieu-35.json.gz.
- apres : expert, graine 34, arrêt à 540,11 s (borne), reçu recus/70faf67ed0a0bca1-expert-34.json.gz.
- apres : dieu, graine 30, arrêt à 540,01 s (borne), reçu recus/70faf67ed0a0bca1-dieu-30.json.gz.
- apres : dieu, graine 42, arrêt à 540,23 s (borne), reçu recus/70faf67ed0a0bca1-dieu-42.json.gz.

Médiation et choix de suite par Claude : les cibles manquées restent ouvertes. Les sous-tâches du directeur, la qualification des pilotes et la sortie du jeu constituent des paliers distincts.
