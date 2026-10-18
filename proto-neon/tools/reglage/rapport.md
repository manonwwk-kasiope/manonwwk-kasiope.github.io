# codex-p5 — difficulté, lot 9

18/10/2026 · 00 h 45 (Paris), **mis à jour à 02 h 25**.

Commande navigateur, à lancer **hors du bac** : `cd proto-neon && node tools/reglage/verifier.mjs`

**LOT ARRÊTÉ : cinq passes consommées, plafond atteint.** Candidate 2 appliquée, 8/20 cibles B tenues sur cinquante graines. Le réglage global R-04 et le rythme R-15 ne sont pas validés. Aucun commit. Le contrôle final ne donne lieu à aucune retouche.

## Fait et preuves

- Tête de travail : `85b389d301f12a1524b9112a3536d7785818f69c`, dans la copie codex-p5. Sources de jeu initiales identiques à `e1bdc6f`. Les cartes/horloge travaillées ailleurs ne sont pas intégrées ici ; les valeurs devront être remesurées après leur intégration.
- VM validée sur **10 références strictement identiques**, huit pilotes (graine 1) plus bon/expert graine 2 : temps de jeu, combat, pas simulés, vague et score. [Reçus de validation](validation-vm.json). Vraies sources chargées dans l'ordre de build.mjs ; profil vierge et même protocole que [parties.mjs](../pilotes/parties.mjs).
- Sensibilité : huit groupes de paramètres × deux variations, vingt graines × huit pilotes par variante, **2 560 essais complets** ; tous finis sans erreur VM. Départ : 160 parties supplémentaires, 7/20 B. Paramètres et seuils gelés avant les passes : [méthode](methode.md).
- Candidate 2 : **11 nombres écrits** dans [02-regles.js](../../src/02-regles.js), chacun justifié dans [demandes.md](../../refonte/lots/demandes.md). Formules, structures, pilotes et seuils inchangés ; 29 autres modules inchangés. N.R reste gelé, morsure = « coupe », règles de mort inchangées, budgets de flash inchangés. [Contrôle du diff source](verification-source.json).
- `cd proto-neon && node build.mjs` : **sortie 0**, bundle reconstruit ; [journal du build](build.log). Syntaxe des scripts et import Playwright contrôlés, aucun serveur ni navigateur lancé dans ce bac.
- Contrôle final : **400 essais**, **400 finis**, **0 erreur(s) VM/console**. [Données finales](final.json), journaux et traces réels par partie dans les reçus gzip référencés. Les 160 cas déjà mesurés en passe retenue sont **160/160 identiques** sur sources effectivement écrites, jusqu'au journal complet : [comparaison](comparaison-source-injection.json).

Bundle SHA-256 : `9107f7ed9516b198c9095bb789be98cc3029db0e1dbe76fb0a1621c9ba68efad`. Sources finales SHA-256 : `07f216dfa3862bac9d791c985353835fe671bbe8fcf59cb14080626d04accce8`.

## Lecture des mesures

Le banc n’utilise pas le DOM : il mesure la logique, les états et le journal, **pas les pixels ni Safari**. Le contexte Node est neuf par partie, sans stockage persistant, géométrie iPhone 13 paysage 844 × 390, `S.jour=20261017`, actions auto pour humain seulement, départ plongée, horloge initialisée puis simulation officielle par tranches de 0,25 s. Aucun interlude ni état de partie sauté. Dieu seul est invulnérable, comme la spécification le demande.

CYCLOPE atteint = arrivée effective dans son module (événement phase), pas V5 atteinte. Battu = transition réelle vers victoire. Combat = première entrée en phase 1 jusqu’à victoire, répits compris. Les durées de fin viennent de `N.horloge.t()` ; la plongée est incluse. Ainsi, au départ, la première mort inerte est à 10,183333 s d’horloge, dont 9,366667 s de combat, et reste hors des 8 s. Aucun temps n’est retranché pour faire passer une cible.

LASSO réussi : événement réel affectant au moins un ennemi dans la fenêtre de la tentative pilote, jusqu’à `lassoFin` ; au plus une réussite par tentative. Les fermetures vides ne sont pas des réussites de cet indicateur. Numérateurs et dénominateurs sont publiés, absence de tentative = à vérifier. Il s’agit d’un indicateur de jeu, pas d’une qualification de gestes humains sur iPhone.

Rythme : états observés après chaque vrai pas de simulation, sur la liste publique des ennemis (PV > 0 et état différent de « mort »), hors planeurs. Médianes des pics conditionnées aux vagues effectivement atteintes, avec leurs effectifs ; le boss est exclu de V5 malgré le numéro de vague restant à 5. Fenêtre de respiration : après la dernière occurrence du pic, avant le prochain pic, la fin ou le début du boss ; vagues interrompues avant nettoyage publiées comme tronquées. Les durées sous 40 % sont calculées en temps de jeu et séparément en temps simulé (incluant les écrans à horloge arrêtée). Un temps simulé suffisant ne remplace pas les huit secondes de jeu prévues par les conventions N.R.

Les proportions sur vingt graines sont exploratoires : erreur type autour de 50 % **±11 points**. Sur cinquante graines : **±7 points**, comme [§ 4.10](../../REFONTE.md) ; ce n’est pas un intervalle à 95 %. Les contraintes « jamais » et « 100 % » sont strictes, sans marge favorable. Le contrôle final contient les graines 1–20 déjà explorées et les graines 21–50 supplémentaires ; ce n’est pas un lot entièrement indépendant. Avant/après ci-dessous : 20 contre 50 graines, populations différentes, sans prétendre à une estimation causale appariée sur cinquante. Les valeurs affichées sont arrondies ; les tests utilisent les valeurs brutes.

## Sensibilité : valeurs réellement testées

| Groupe | Départ | −20 % | +20 % |
|---|---|---|---|
| approcheFleches | ennemis.fleche.approche.0=50 ; ennemis.fleche.approche.1=70 ; secteurs.0.vitessesFleches.0=50 ; secteurs.0.vitessesFleches.1=55 ; secteurs.0.vitessesFleches.2=60 ; secteurs.0.vitessesFleches.3=65 ; secteurs.0.vitessesFleches.4=70 | ennemis.fleche.approche.0=40 ; ennemis.fleche.approche.1=56 ; secteurs.0.vitessesFleches.0=40 ; secteurs.0.vitessesFleches.1=44 ; secteurs.0.vitessesFleches.2=48 ; secteurs.0.vitessesFleches.3=52 ; secteurs.0.vitessesFleches.4=56 | ennemis.fleche.approche.0=60 ; ennemis.fleche.approche.1=84 ; secteurs.0.vitessesFleches.0=60 ; secteurs.0.vitessesFleches.1=66 ; secteurs.0.vitessesFleches.2=72 ; secteurs.0.vitessesFleches.3=78 ; secteurs.0.vitessesFleches.4=84 |
| dureesVagues | secteurs.0.vagues.0.duree=22 ; secteurs.0.vagues.1.duree=42 ; secteurs.0.vagues.2.duree=44 ; secteurs.0.vagues.3.duree=48 ; secteurs.0.vagues.4.duree=50 | secteurs.0.vagues.0.duree=17.6 ; secteurs.0.vagues.1.duree=33.6 ; secteurs.0.vagues.2.duree=35.2 ; secteurs.0.vagues.3.duree=38.4 ; secteurs.0.vagues.4.duree=40 | secteurs.0.vagues.0.duree=26.4 ; secteurs.0.vagues.1.duree=50.4 ; secteurs.0.vagues.2.duree=52.8 ; secteurs.0.vagues.3.duree=57.6 ; secteurs.0.vagues.4.duree=60 |
| fermetureTraine | lasso.fermetureTraine=7 | lasso.fermetureTraine=5.6 | lasso.fermetureTraine=8.4 |
| plafondV1 | secteurs.0.vagues.0.plafond=10 | secteurs.0.vagues.0.plafond=8 | secteurs.0.vagues.0.plafond=12 |
| plafondV2 | secteurs.0.vagues.1.plafond=16 | secteurs.0.vagues.1.plafond=13 | secteurs.0.vagues.1.plafond=19 |
| pvCyclope | colosse.pvPhase=1500 ; colosse.pvTotal=4500 | colosse.pvPhase=1200 ; colosse.pvTotal=3600 | colosse.pvPhase=1800 ; colosse.pvTotal=5400 |
| quotaV2 | secteurs.0.vagues.1.quota=48 | secteurs.0.vagues.1.quota=38 | secteurs.0.vagues.1.quota=58 |
| traineBase | lasso.traine.base=1.2 | lasso.traine.base=0.96 | lasso.traine.base=1.44 |

Les effectifs entiers sont arrondis au plus proche ; distances/durées ne sont pas arrondies à l’entier. Les bornes de PV sont changées ensemble (trois phases cohérentes). La table de vitesses des flèches est maintenue cohérente avec les deux bornes effectivement lues par l’IA. [CSV de toutes les cibles](sensibilite.csv).

## Effet sur chaque cible

18/10/2026 02:25:00 (Paris), mis à jour à 18/10/2026 02:25:00.

Chaque variante ne change que le groupe indiqué ; valeurs exactes dans les JSON de série. Pas de modification des sources du jeu. Les colonnes donnent les valeurs, puis entre parenthèses le résultat au seuil gelé : oui/non/à vérifier. Les proportions sur 20 graines sont exploratoires (erreur type autour de 50 % : ±11 points).

## inerte

| Variante | 3 vies perdues avant 35 s [B] | première mort au mur avant 8 s [B] |
|---|---|---|
| baseline | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| approcheFleches-moins | 100,00 % (oui) | 0,00 % ; 10,18–10,18 s (non) |
| approcheFleches-plus | 95,00 % (non) | 0,00 % ; 8,29–10,18 s (non) |
| dureesVagues-moins | 90,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| dureesVagues-plus | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| fermetureTraine-moins | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| fermetureTraine-plus | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| plafondV1-moins | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| plafondV1-plus | 85,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| plafondV2-moins | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| plafondV2-plus | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| pvCyclope-moins | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| pvCyclope-plus | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| quotaV2-moins | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| quotaV2-plus | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| traineBase-moins | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |
| traineBase-plus | 95,00 % (non) | 0,00 % ; 10,18–10,18 s (non) |

## tourneur

| Variante | 3 vies perdues avant 90 s [B] | rapport des scores médians tourneur/bon [i] |
|---|---|---|
| baseline | 100,00 % (oui) | 0,0965 (oui) |
| approcheFleches-moins | 100,00 % (oui) | 0,1053 (non) |
| approcheFleches-plus | 100,00 % (oui) | 0,0505 (oui) |
| dureesVagues-moins | 100,00 % (oui) | 0,0267 (oui) |
| dureesVagues-plus | 100,00 % (oui) | 0,0846 (oui) |
| fermetureTraine-moins | 100,00 % (oui) | 0,0987 (oui) |
| fermetureTraine-plus | 100,00 % (oui) | 0,0965 (oui) |
| plafondV1-moins | 100,00 % (oui) | 0,0174 (oui) |
| plafondV1-plus | 100,00 % (oui) | 0,0638 (oui) |
| plafondV2-moins | 100,00 % (oui) | 0,0398 (oui) |
| plafondV2-plus | 100,00 % (oui) | 0,0262 (oui) |
| pvCyclope-moins | 100,00 % (oui) | 0,0965 (oui) |
| pvCyclope-plus | 100,00 % (oui) | 0,0965 (oui) |
| quotaV2-moins | 100,00 % (oui) | 0,0243 (oui) |
| quotaV2-plus | 100,00 % (oui) | 0,0294 (oui) |
| traineBase-moins | 100,00 % (oui) | 0,0965 (oui) |
| traineBase-plus | 100,00 % (oui) | 0,0833 (oui) |

## maladroit

| Variante | game over médian [B] | CYCLOPE atteint [B] | premier coup avant 30 s [i] |
|---|---|---|---|
| baseline | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| approcheFleches-moins | 20,31 s (non) | 0,00 % (oui) | 90,00 % (oui) |
| approcheFleches-plus | 15,31 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| dureesVagues-moins | 17,81 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| dureesVagues-plus | 20,80 s (non) | 0,00 % (oui) | 95,00 % (oui) |
| fermetureTraine-moins | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| fermetureTraine-plus | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| plafondV1-moins | 21,14 s (non) | 0,00 % (oui) | 95,00 % (oui) |
| plafondV1-plus | 17,91 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| plafondV2-moins | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| plafondV2-plus | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| pvCyclope-moins | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| pvCyclope-plus | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| quotaV2-moins | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| quotaV2-plus | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| traineBase-moins | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |
| traineBase-plus | 19,28 s (non) | 0,00 % (oui) | 100,00 % (oui) |

## kamikaze

| Variante | game over avant CYCLOPE [B] | victoires [B] |
|---|---|---|
| baseline | 100,00 % (oui) | 0,00 % (oui) |
| approcheFleches-moins | 100,00 % (oui) | 0,00 % (oui) |
| approcheFleches-plus | 100,00 % (oui) | 0,00 % (oui) |
| dureesVagues-moins | 100,00 % (oui) | 0,00 % (oui) |
| dureesVagues-plus | 100,00 % (oui) | 0,00 % (oui) |
| fermetureTraine-moins | 100,00 % (oui) | 0,00 % (oui) |
| fermetureTraine-plus | 100,00 % (oui) | 0,00 % (oui) |
| plafondV1-moins | 100,00 % (oui) | 0,00 % (oui) |
| plafondV1-plus | 100,00 % (oui) | 0,00 % (oui) |
| plafondV2-moins | 100,00 % (oui) | 0,00 % (oui) |
| plafondV2-plus | 100,00 % (oui) | 0,00 % (oui) |
| pvCyclope-moins | 100,00 % (oui) | 0,00 % (oui) |
| pvCyclope-plus | 100,00 % (oui) | 0,00 % (oui) |
| quotaV2-moins | 100,00 % (oui) | 0,00 % (oui) |
| quotaV2-plus | 100,00 % (oui) | 0,00 % (oui) |
| traineBase-moins | 100,00 % (oui) | 0,00 % (oui) |
| traineBase-plus | 100,00 % (oui) | 0,00 % (oui) |

## humain

| Variante | game over médian [B] | CYCLOPE atteint [i] | CYCLOPE battu [i] | au moins un coup en V1 [i] | LASSO 8–20 segments [B] | LASSO 30–40 segments [B] |
|---|---|---|---|---|---|---|
| baseline | 75,48 s (non) | 5,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/355 (0,00 %) (non) | 1/28 (3,57 %) (non) |
| approcheFleches-moins | 160,70 s (oui) | 15,00 % (oui) | 0,00 % (non) | 80,00 % (oui) | 2/305 (0,66 %) (non) | 0/75 (0,00 %) (non) |
| approcheFleches-plus | 67,34 s (non) | 5,00 % (non) | 0,00 % (non) | 75,00 % (oui) | 1/431 (0,23 %) (non) | 0/26 (0,00 %) (non) |
| dureesVagues-moins | 74,92 s (non) | 10,00 % (oui) | 0,00 % (non) | 65,00 % (oui) | 1/346 (0,29 %) (non) | 1/65 (1,54 %) (non) |
| dureesVagues-plus | 73,92 s (non) | 10,00 % (oui) | 5,00 % (oui) | 95,00 % (oui) | 0/342 (0,00 %) (non) | 2/54 (3,70 %) (non) |
| fermetureTraine-moins | 75,68 s (non) | 5,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/359 (0,00 %) (non) | 0/36 (0,00 %) (non) |
| fermetureTraine-plus | 75,48 s (non) | 15,00 % (oui) | 0,00 % (non) | 85,00 % (oui) | 0/349 (0,00 %) (non) | 0/32 (0,00 %) (non) |
| plafondV1-moins | 82,27 s (non) | 25,00 % (oui) | 0,00 % (non) | 50,00 % (oui) | 0/397 (0,00 %) (non) | 3/80 (3,75 %) (non) |
| plafondV1-plus | 82,78 s (non) | 20,00 % (oui) | 0,00 % (non) | 75,00 % (oui) | 0/387 (0,00 %) (non) | 0/59 (0,00 %) (non) |
| plafondV2-moins | 75,60 s (non) | 5,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/326 (0,00 %) (non) | 1/39 (2,56 %) (non) |
| plafondV2-plus | 81,27 s (non) | 5,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/353 (0,00 %) (non) | 1/40 (2,50 %) (non) |
| pvCyclope-moins | 75,48 s (non) | 5,00 % (non) | 5,00 % (oui) | 85,00 % (oui) | 0/353 (0,00 %) (non) | 1/28 (3,57 %) (non) |
| pvCyclope-plus | 75,48 s (non) | 5,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/355 (0,00 %) (non) | 1/28 (3,57 %) (non) |
| quotaV2-moins | 74,70 s (non) | 15,00 % (oui) | 0,00 % (non) | 85,00 % (oui) | 0/325 (0,00 %) (non) | 0/42 (0,00 %) (non) |
| quotaV2-plus | 78,70 s (non) | 10,00 % (oui) | 0,00 % (non) | 85,00 % (oui) | 0/325 (0,00 %) (non) | 1/53 (1,89 %) (non) |
| traineBase-moins | 75,48 s (non) | 0,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/355 (0,00 %) (non) | 1/31 (3,23 %) (non) |
| traineBase-plus | 75,48 s (non) | 5,00 % (non) | 0,00 % (non) | 85,00 % (oui) | 0/349 (0,00 %) (non) | 1/28 (3,57 %) (non) |

## bon

| Variante | CYCLOPE atteint [B] | CYCLOPE battu [B] | mort avant CYCLOPE [i] | au moins un coup en V1 [i] | première longueur maximale, médiane [i] |
|---|---|---|---|---|---|
| baseline | 15,00 % (non) | 5,00 % (non) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| approcheFleches-moins | 15,00 % (non) | 0,00 % (non) | 100,00 % (oui) | 90,00 % (oui) | non atteinte par au moins la moitié (oui) |
| approcheFleches-plus | 25,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 55,00 % (oui) | non atteinte par au moins la moitié (oui) |
| dureesVagues-moins | 20,00 % (non) | 0,00 % (non) | 100,00 % (oui) | 70,00 % (oui) | non atteinte par au moins la moitié (oui) |
| dureesVagues-plus | 15,00 % (non) | 0,00 % (non) | 100,00 % (oui) | 85,00 % (oui) | non atteinte par au moins la moitié (oui) |
| fermetureTraine-moins | 20,00 % (non) | 10,00 % (oui) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| fermetureTraine-plus | 10,00 % (non) | 5,00 % (non) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| plafondV1-moins | 25,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 55,00 % (oui) | non atteinte par au moins la moitié (oui) |
| plafondV1-plus | 20,00 % (non) | 10,00 % (oui) | 100,00 % (oui) | 75,00 % (oui) | non atteinte par au moins la moitié (oui) |
| plafondV2-moins | 10,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| plafondV2-plus | 10,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| pvCyclope-moins | 15,00 % (non) | 10,00 % (oui) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| pvCyclope-plus | 15,00 % (non) | 0,00 % (non) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| quotaV2-moins | 20,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| quotaV2-plus | 10,00 % (non) | 0,00 % (non) | 100,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| traineBase-moins | 15,00 % (non) | 5,00 % (non) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |
| traineBase-plus | 15,00 % (non) | 5,00 % (non) | 95,00 % (oui) | 65,00 % (oui) | non atteinte par au moins la moitié (oui) |

## expert

| Variante | CYCLOPE atteint [i] | CYCLOPE battu [B] | au moins une vie perdue [B] | LASSO affectant un ennemi, minimum par partie [i] | APOGÉE, minimum par partie [i] |
|---|---|---|---|---|---|
| baseline | 25,00 % (non) | 10,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| approcheFleches-moins | 25,00 % (non) | 0,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| approcheFleches-plus | 25,00 % (non) | 10,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| dureesVagues-moins | 25,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| dureesVagues-plus | 25,00 % (non) | 15,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| fermetureTraine-moins | 35,00 % (non) | 20,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| fermetureTraine-plus | 15,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| plafondV1-moins | 25,00 % (non) | 15,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| plafondV1-plus | 35,00 % (non) | 25,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| plafondV2-moins | 35,00 % (non) | 20,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| plafondV2-plus | 45,00 % (non) | 15,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| pvCyclope-moins | 25,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| pvCyclope-plus | 25,00 % (non) | 5,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| quotaV2-moins | 25,00 % (non) | 10,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| quotaV2-plus | 35,00 % (non) | 20,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| traineBase-moins | 25,00 % (non) | 15,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |
| traineBase-plus | 30,00 % (non) | 15,00 % (non) | 100,00 % (oui) | 0,00 (non) | 0,00 (non) |

## dieu

| Variante | durée secteur, min–max [B] | combat CYCLOPE, min–max [B] | erreurs VM [B] |
|---|---|---|---|
| baseline | 282,21–439,35 s (non) | 44,41–175,00 s (non) | 0,00 (oui) |
| approcheFleches-moins | 270,79–466,24 s (non) | 38,80–197,73 s (non) | 0,00 (oui) |
| approcheFleches-plus | 288,24–486,79 s (non) | 43,18–204,38 s (non) | 0,00 (oui) |
| dureesVagues-moins | 282,61–495,71 s (non) | 43,41–243,92 s (non) | 0,00 (oui) |
| dureesVagues-plus | 309,07–464,34 s (non) | 58,16–183,17 s (non) | 0,00 (oui) |
| fermetureTraine-moins | 282,06–476,29 s (non) | 35,35–223,18 s (non) | 0,00 (oui) |
| fermetureTraine-plus | 282,21–530,02 s (non) | 44,40–239,61 s (non) | 0,00 (oui) |
| plafondV1-moins | 290,42–451,84 s (non) | 44,23–181,20 s (non) | 0,00 (oui) |
| plafondV1-plus | 285,40–452,06 s (non) | 44,22–190,20 s (non) | 0,00 (oui) |
| plafondV2-moins | 299,24–434,91 s (non) | 52,12–169,53 s (non) | 0,00 (oui) |
| plafondV2-plus | 284,60–452,80 s (non) | 50,12–192,98 s (non) | 0,00 (oui) |
| pvCyclope-moins | 275,56–412,15 s (non) | 40,67–147,80 s (non) | 0,00 (oui) |
| pvCyclope-plus | 290,80–466,48 s (non) | 52,99–202,13 s (non) | 0,00 (oui) |
| quotaV2-moins | 272,64–444,50 s (non) | 45,21–190,19 s (non) | 0,00 (oui) |
| quotaV2-plus | 296,85–428,27 s (non) | 51,72–167,54 s (non) | 0,00 (oui) |
| traineBase-moins | 282,21–434,91 s (non) | 44,41–169,53 s (non) | 0,00 (oui) |
| traineBase-plus | 284,69–459,87 s (non) | 45,89–181,17 s (non) | 0,00 (oui) |

## rythme

| Variante | pics médians V1 à V5 [B] | minimum sous 40 %, après vagues terminées [B] | parties avec tir ennemi avant V2 [B] | rapport scores médians bon/kamikaze [i] |
|---|---|---|---|---|
| baseline | 19,00 (n=20) ; 22,00 (n=20) ; 14,00 (n=5) ; 19,00 (n=5) ; 14,00 (n=4) (non) | 3,11 s jeu / 11,15 s simulé ; 3/37 échecs (non) | 0,00 (oui) | 3,4286 (oui) |
| approcheFleches-moins | 18,00 (n=20) ; 18,00 (n=17) ; 19,00 (n=5) ; 21,00 (n=5) ; 19,00 (n=4) (non) | 4,13 s jeu / 10,77 s simulé ; 4/34 échecs (non) | 0,00 (oui) | 0,1358 (non) |
| approcheFleches-plus | 19,00 (n=20) ; 18,00 (n=20) ; 16,00 (n=6) ; 19,00 (n=6) ; 19,50 (n=6) (non) | 3,75 s jeu / 10,82 s simulé ; 6/43 échecs (non) | 0,00 (oui) | 2,2246 (oui) |
| dureesVagues-moins | 14,50 (n=20) ; 24,50 (n=18) ; 18,00 (n=10) ; 24,00 (n=7) ; 19,50 (n=4) (non) | 4,51 s jeu / 11,25 s simulé ; 4/43 échecs (non) | 0,00 (oui) | 13,7481 (oui) |
| dureesVagues-plus | 21,00 (n=20) ; 18,50 (n=16) ; 14,00 (n=4) ; 17,00 (n=4) ; 19,50 (n=4) (non) | 3,16 s jeu / 10,68 s simulé ; 2/31 échecs (non) | 0,00 (oui) | 0,2455 (non) |
| fermetureTraine-moins | 19,00 (n=20) ; 22,00 (n=20) ; 19,00 (n=5) ; 20,00 (n=4) ; 16,00 (n=4) (non) | 3,11 s jeu / 11,15 s simulé ; 4/37 échecs (non) | 0,00 (oui) | 3,4286 (oui) |
| fermetureTraine-plus | 19,00 (n=20) ; 20,00 (n=20) ; 14,50 (n=4) ; 21,50 (n=4) ; 13,00 (n=3) (non) | 3,11 s jeu / 11,15 s simulé ; 2/33 échecs (non) | 0,00 (oui) | 3,4286 (oui) |
| plafondV1-moins | 18,00 (n=20) ; 20,00 (n=19) ; 13,50 (n=8) ; 17,00 (n=7) ; 14,00 (n=7) (non) | 0,00 s jeu / 0,00 s simulé ; 7/47 échecs (non) | 0,00 (oui) | 0,8259 (non) |
| plafondV1-plus | 21,00 (n=20) ; 16,00 (n=18) ; 19,00 (n=8) ; 19,00 (n=7) ; 16,00 (n=7) (non) | 6,07 s jeu / 10,52 s simulé ; 2/44 échecs (non) | 0,00 (oui) | 4,5556 (oui) |
| plafondV2-moins | 19,00 (n=20) ; 18,00 (n=20) ; 16,00 (n=6) ; 20,50 (n=4) ; 17,00 (n=3) (non) | 8,21 s jeu / 10,58 s simulé ; 0/35 échecs (oui) | 0,00 (oui) | 8,3083 (oui) |
| plafondV2-plus | 19,00 (n=20) ; 21,00 (n=20) ; 16,00 (n=7) ; 16,00 (n=7) ; 18,00 (n=6) (non) | 3,09 s jeu / 11,11 s simulé ; 2/42 échecs (non) | 0,00 (oui) | 12,6241 (oui) |
| pvCyclope-moins | 19,00 (n=20) ; 22,00 (n=20) ; 14,00 (n=5) ; 19,00 (n=5) ; 14,00 (n=4) (non) | 3,11 s jeu / 11,15 s simulé ; 3/37 échecs (non) | 0,00 (oui) | 3,4286 (oui) |
| pvCyclope-plus | 19,00 (n=20) ; 22,00 (n=20) ; 14,00 (n=5) ; 19,00 (n=5) ; 14,00 (n=4) (non) | 3,11 s jeu / 11,15 s simulé ; 3/37 échecs (non) | 0,00 (oui) | 3,4286 (oui) |
| quotaV2-moins | 19,00 (n=20) ; 18,00 (n=20) ; 20,00 (n=8) ; 20,00 (n=8) ; 20,00 (n=7) (non) | 5,45 s jeu / 10,65 s simulé ; 2/47 échecs (non) | 0,00 (oui) | 13,5940 (oui) |
| quotaV2-plus | 19,00 (n=20) ; 23,00 (n=20) ; 15,00 (n=6) ; 19,00 (n=5) ; 17,00 (n=5) (non) | 3,20 s jeu / 11,11 s simulé ; 2/38 échecs (non) | 0,00 (oui) | 11,2707 (oui) |
| traineBase-moins | 19,00 (n=20) ; 22,00 (n=20) ; 14,00 (n=5) ; 19,00 (n=5) ; 14,00 (n=4) (non) | 3,11 s jeu / 11,15 s simulé ; 3/37 échecs (non) | 0,00 (oui) | 3,4286 (oui) |
| traineBase-plus | 19,00 (n=20) ; 21,00 (n=20) ; 14,00 (n=6) ; 20,00 (n=5) ; 15,00 (n=5) (non) | 3,11 s jeu / 11,15 s simulé ; 3/39 échecs (non) | 0,00 (oui) | 3,4286 (oui) |


## Passes et arrêt

La passe 1 admet la meilleure variante isolée (9 B), en réutilisant exactement ses reçus ; elle n’ajoute pas de parties rejouées. La passe 2 gagne deux B bon et conserve les autres (11 B). Les passes 3–5 améliorent des indicateurs de survie/LASSO ou expert mais perdent la durée humaine et/ou les bornes hautes bon. La passe 4 fait entrer expert et autorise donc la cinquième ; la cinquième atteint le plafond, aucun essai de réglage supplémentaire. La candidate 2 reste la meilleure série entièrement finie et sans erreur, sans les changements de traînée longue non retenus.


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


## Tableau final — 50 graines, seuils inchangés

18/10/2026 02:25:00 (Paris), mis à jour à 18/10/2026 02:25:00.

| Pilote | Cible | Avant (20 graines) | Final (50 graines) | Seuil | B/i | Tenu ? |
|---|---|---|---|---|---|---|
| inerte | 3 vies perdues avant 35 s | 95,00 % | 100,00 % | 100 % | B | oui |
| inerte | première mort au mur avant 8 s | 0,00 % ; 10,18–10,18 s | 0,00 % ; 10,18–10,18 s | 100 % | B | non |
| tourneur | 3 vies perdues avant 90 s | 100,00 % | 100,00 % | 100 % | B | oui |
| tourneur | rapport des scores médians tourneur/bon | 0,0965 | 0,0202 | < 0,10 | i | oui |
| maladroit | game over médian | 19,28 s | 18,80 s | 45–150 s | B | non |
| maladroit | CYCLOPE atteint | 0,00 % | 0,00 % | 0/50 | B | oui |
| maladroit | premier coup avant 30 s | 100,00 % | 100,00 % | ≥ 80 % | i | oui |
| kamikaze | game over avant CYCLOPE | 100,00 % | 100,00 % | ≥ 90 % | B | oui |
| kamikaze | victoires | 0,00 % | 0,00 % | ≤ 2/50 | B | oui |
| humain | game over médian | 75,48 s | 90,79 s | 120–210 s | B | non |
| humain | CYCLOPE atteint | 5,00 % | 20,00 % | 10–35 % | i | oui |
| humain | CYCLOPE battu | 0,00 % | 2,00 % | 2–12 % | i | oui |
| humain | au moins un coup en V1 | 85,00 % | 66,00 % | ≥ 50 % | i | oui |
| humain | LASSO 8–20 segments | 0/355 (0,00 %) | 3/814 (0,37 %) | ≥ 50 % | B | non |
| humain | LASSO 30–40 segments | 1/28 (3,57 %) | 5/228 (2,19 %) | ≥ 40 % | B | non |
| bon | CYCLOPE atteint | 15,00 % | 20,00 % | 30–60 % | B | non |
| bon | CYCLOPE battu | 5,00 % | 8,00 % | 10–30 % | B | non |
| bon | mort avant CYCLOPE | 95,00 % | 96,00 % | ≥ 70 % | i | oui |
| bon | au moins un coup en V1 | 65,00 % | 74,00 % | ≥ 40 % | i | oui |
| bon | première longueur maximale, médiane | non atteinte par au moins la moitié | non atteinte par au moins la moitié | ≥ 120 s ou non atteinte | i | oui |
| expert | CYCLOPE atteint | 25,00 % | 32,00 % | ≥ 80 % | i | non |
| expert | CYCLOPE battu | 10,00 % | 14,00 % | 40–70 % | B | non |
| expert | au moins une vie perdue | 100,00 % | 100,00 % | ≥ 80 % | B | oui |
| expert | LASSO affectant un ennemi, minimum par partie | 0,00 | 0,00 | ≥ 10 | i | non |
| expert | APOGÉE, minimum par partie | 0,00 | 0,00 | ≥ 2 | i | non |
| dieu | durée secteur, min–max | 282,21–439,35 s | 281,44–473,18 s | 320–390 s pour toutes les parties | B | non |
| dieu | combat CYCLOPE, min–max | 44,41–175,00 s | 39,20–190,78 s | 55–90 s pour toutes les parties | B | non |
| dieu | erreurs VM | 0,00 | 0,00 | 0 | B | oui |
| rythme | pics médians V1 à V5 | 19,00 (n=20) ; 22,00 (n=20) ; 14,00 (n=5) ; 19,00 (n=5) ; 14,00 (n=4) | 21,00 (n=50) ; 18,00 (n=48) ; 16,50 (n=24) ; 18,00 (n=19) ; 20,00 (n=16) | V1 < V2 < V3 < V4 < V5 | B | non |
| rythme | minimum sous 40 %, après vagues terminées | 3,11 s jeu / 11,15 s simulé ; 3/37 échecs | 3,29 s jeu / 10,80 s simulé ; 11/117 échecs | ≥ 8 s de jeu | B | non |
| rythme | parties avec tir ennemi avant V2 | 0,00 | 0,00 | 0 | B | oui |
| rythme | rapport scores médians bon/kamikaze | 3,4286 | 0,9995 | ≥ 1,3 | i | non |

## Échecs conservés, limites et reste

- Passe 5, expert graine 11 : **sans fin à 540,1770833508882 s**, borne 540 s observée en fin de tranche. [Reçu complet](recus/a422e4f0a8e15d36-expert-11.json.gz). Aucun temps final, victoire ou défaite imputé. Les cibles de ce pilote sont à vérifier, pas validées ; la collecte des autres cas a continué sur cache. Sortie 1 du banc conservée. La cause n’est pas établie : un dépassement de garde ne prouve pas à lui seul un bug moteur.
- Un processus long de sensibilité est sorti avec le code système **139**. Reprise sur reçus intacts ; chaque pilote est depuis calculé dans un processus court, en série. Cause exacte non établie ; accumulation mémoire/contexte seulement hypothétique. Aucune règle ni graine ni seuil changé pour cette reprise.
- Les plafonds de vague peuvent être dépassés après vingt secondes d’attente d’une formation (`76-directeur.js:324`). Les effectifs FILE/MEUTE/NUÉE sont des littéraux dans le directeur, pas des lectures des nombres N.R. La respiration N.R n’est pas consommée pour imposer le palier. Les vitesses DÉFILÉ/CYCLOPE/enragé ne sont pas sélectionnées par `70-joueuse.js:83`. Ces dépendances précises sont consignées dans la section codex-p5 de demandes.md ; aucun module hors périmètre modifié.
- Cela ne prouve pas qu’aucune autre combinaison numérique ne pourrait améliorer les cibles restantes. Cela prouve l’échec aux seuils des combinaisons testées et l’absence d’effet des nombres non lus. L’arrêt prévu interdit une sixième passe sur cette tête. Le seuil inerte de 8 s reste notamment non réglé ; aucune impossibilité générale n’est affirmée à partir de cette exploration.
- **À faire hors du bac** : lancer `verifier.mjs`, un seul Chromium muet, 50 graines paysage et 5 par pilote en portrait/bureau ; il recueille état, journal, vrais tampons, histogrammes et captures. Le résultat navigateur n’est pas inventé ici. Même un succès Chromium émulé ne vaut pas Safari physique. Vérifier palette/cyan/flashs et jouabilité iPhone avec le lot intégré.
- **Après intégration** des cartes, télégraphes et de l’horloge des autres sessions : remesurer les mêmes graines sur la nouvelle empreinte de sources, puis réexaminer les cibles manquées et les dépendances. Le lot de réglage est arrêté ; le chantier de qualification du jeu reste ouvert.
