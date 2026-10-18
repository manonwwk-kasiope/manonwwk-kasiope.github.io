# codex-p34 — les cibles B sont-elles tenables ensemble ?

18/10/2026 · 05 h 09 (Paris), mis à jour à 18/10/2026 · 05 h 09.

**Commande hors bac :** `cd proto-neon && node tools/codex-p34/verifier.mjs`. Script prêt, syntaxe et import Playwright contrôlés, **non exécuté** ici. Aucun serveur, Chromium, SSH ou réseau extérieur lancé.

## Décision proposée

**Ne pas engager un troisième réglage global.** Les vingt cibles numériques ne sont pas contradictoires par elles-mêmes ; les 190 paires ont un témoin mathématique commun. Leur réalisation simultanée par les pilotes actuels n'est toutefois **pas établie**, et elle est impossible sur le jeu reçu inchangé : le mur de l'inerte arrive trop tard. Surtout, l'instrument R-04 confond des interludes avec l'accès au CYCLOPE et deux bancs emploient des médianes différentes. Corriger ces définitions et recadrer les politiques des pilotes précède une décision sur la difficulté du jeu. Aucun seuil ni réglage n'a été changé dans ce lot.

**Ce qui est livré :** VM validée, 80 parties actuelles, 30 contrefactuelles appariées, relecture des 40 reçus Chromium de la batterie fournie, matrice complète et proposition. Toutes les parties nouvellement calculées finissent sans erreur ; aucune censure à 540 s. Cela termine l'analyse demandée, pas la qualification du jeu, de Safari ou de la joueuse moyenne.

## Périmètre, protocole et provenance

- État reçu : `0f978918106bb952e029fc4df5c2a89282536ca0` ; sources SHA-256 `58a2ca394266bc85e24a9a466624ac4f3a07cf7fd891d35d8ebb1c51e3574726`. [Instantané intégral](sources-recues.json.gz), [manifest des sources et instruments](sources-manifest.json). Le chemin demandé `refonte/REFONTE.md` est absent ; la référence réelle est [REFONTE.md §4.10](../../REFONTE.md#410-la-difficulté-chiffrée-par-des-pilotes).
- [Calibration](validation-vm.json) : dix cas e1bdc6f, couvrant les huit pilotes, identiques au champ près sur temps de jeu, combat, simulation, vague et score. Sources historiques lues par `git show`. Aucun écart actuel à e1bdc6f n'est présenté comme régression.
- [Actuel](actuel.json) : huit pilotes × graines 1–10, paysage 844×390 ; [avant-p14 contrefactuel](avant-p14.json) : humain/bon/expert × mêmes graines. Seul le fichier 85 de l'instantané pré-p14 remplace celui reçu **en mémoire**, toutes les autres sources restant identiques. Ce n'est pas une reconstruction de l'ancien jeu complet.
- Chargement des vraies sources dans l'ordre de build.mjs, VM sans DOM ; stockage vide, jour 20261017, actions auto pour humain et doigts pour les autres, intro.skip, reset(graine,{depart:'plongee'}), repli d'état initial si nécessaire, pilote, god pour dieu, journal actif, horloge.avancer une fois, puis dbg.simuler(0.25) jusqu'à fin. Reçu complet après chaque partie, un processus de calcul à la fois. Mesures par état, listes publiques et journal, pas par compteur d'appels seul. [Code de mesure](mesurer.mjs), protocole existant [p5](../reglage/protocole.mjs), chargeur existant [p14](../codex-p14/vm.mjs).
- Budget consommé : 10 calibrations + 80 parties reçues + 30 contrefactuelles = **120 simulations**, et 40 reçus historiques relus sans simulation. Aucun essai de réglage. Les proportions sur dix graines sont **exploratoires** ; le §4.10 exige cinquante graines pour les qualifier. Les tentatives LASSO d'une même partie ne sont pas des joueuses indépendantes.
- Aucun fichier src changé, ni index après sa reconstruction (build sortie 0, [journal](build.log)). L'identité des sources avant/après est vérifiée par empreinte : rejouer les 80 parties sans changement n'apporterait pas une comparaison supplémentaire. Aucun commit.

## 1. Les mesures qui faussent la question initiale

### 1.1 « Atteint le CYCLOPE » compte des panneaux génériques

[tools/mesure/parties.mjs:88–100](../mesure/parties.mjs) utilise alerte, **panneau**, boss comme repli si aucune phase d'entrée n'existe. Or les films entre V1 et V2 passent aussi par panneau. Exemple actuel : inerte, graine 1, panneau à **29,4833 s**, vague 1, puis fin à **45,3333 s**, sans aucun événement phase. Ce n'est pas le CYCLOPE. L'inerte, le maladroit et le kamikaze produisent des témoins de cette erreur dans [synthese.json](synthese.json).

Sur les dix graines actuelles :

| Pilote | Accès selon resumer/R-04 | Véritable phase/arrivee |
|---|---:|---:|
| inerte | 7/10 | 0/10 |
| tourneur | 9/10 | 0/10 |
| maladroit | 9/10 | 0/10 |
| kamikaze | 10/10 | 0/10 |
| humain | 10/10 | 5/10 |
| bon | 10/10 | 6/10 |
| expert | 10/10 | 7/10 |
| dieu | 10/10 | 10/10 |

**Confirmation sur la batterie 318ce61 elle-même**, sans nouvel essai : [relecture et 40 reçus copiés](relecture-318ce61.json), [R-04 original](R-04-318ce61.json). Le code resumer actuel est vérifié identique à celui de 318ce61 avant relecture.

| Pilote | Accès publié R-04 | Phase d'arrivée réellement journalisée | Victoires publiées |
|---|---:|---:|---:|
| inerte | 1/5 | 0/5 | 0/5 |
| tourneur | 0/5 | 0/5 | 0/5 |
| maladroit | 1/5 | 0/5 | 0/5 |
| kamikaze | 5/5 | 0/5 | 0/5 |
| humain | 5/5 | 5/5 | 4/5 |
| bon | 5/5 | 2/5 | 2/5 |
| expert | 5/5 | 3/5 | 3/5 |
| dieu | 5/5 | 5/5 | 5/5 |

Donc **bon n'atteignait pas le CYCLOPE dans 100 % mais dans 2/5 de ces parties**, valeur située dans la cible 30–60 %. Le prétendu accès unique du maladroit est un faux positif : **0/5** arrivées réelles. Le kamikaze meurt bien avant le boss dans ces cinq reçus. Les quatre victoires humaines, elles, sont réelles dans les états de victoire observés. Ce diagnostic retire des accusations précises contre le jeu ; il ne valide pas ses autres cibles.

### 1.2 Game over conditionnel et fin de partie ne sont pas la même variable

[resumer:113–118](../mesure/parties.mjs) rend gameOver=null en cas de victoire, et R-04 filtre les null avant la médiane. [Le banc de réglage p5](../reglage/analyse.mjs) prend au contraire toutes les durées finales, victoires comprises.

Pour humain sur l'état reçu : **94,75 s sur 6 défaites** selon R-04, contre **289,66 s sur 10 fins** selon p5. Les deux échouent à 120–210 s, **dans des directions opposées**. Sur 318ce61, les **425,04 s** publiées sont le temps de **l'unique défaite**, et non la médiane des cinq parties ; celle-ci vaut **408,86 s**. Sources : synthese.json et relecture-318ce61.json.

L'affirmation « 80 % de victoires après 320 s interdit un game over médian à 150 s » est donc fausse pour la définition R-04 : quatre victoires à 350 s et une défaite à 150 s donnent exactement ce contre-exemple. Elle serait vraie pour la médiane **de toutes les fins**, si plus de la moitié de ces fins surviennent nécessairement après 210 s. En outre, la durée visée pour dieu n'est pas une borne inférieure prouvée de toutes les parties humaines ; leurs politiques diffèrent actuellement.

### 1.3 Durée du boss, horloges et événements

- Le combat R-04 exige phase/mort. Cet événement manque dans les **10 victoires dieu actuelles** et les cinq de 318ce61 : résultat officiel **non mesurable**, pas « durée trop longue » déduite d'un null. L'autre durée explicitement donnée ici va de la première phase/entree à la section/victoire. Elle est mesurée, mais n'est pas substituée silencieusement à la définition officielle.
- La voie de victoire anticipée est visible : [76-directeur.js:458–465](../../src/76-directeur.js) marque bossMort sur le kill de l'œil, [79-jeu.js:573](../../src/79-jeu.js) entre en victoire ; l'émission phase/mort du colosse est prévue après sa cascade, [73-colosse.js:741–748](../../src/73-colosse.js). Le défaut de raccord est à faire examiner par leurs propriétaires ; aucun module n'est modifié ici.
- resumer construit morts par {t:événement.t, ...charge} : la charge.t du temps de combat remplace l'horloge globale. Première mort inerte : **10,1833 s** à l'horloge, **9,3667 s** dans la charge. Les deux dépassent 8 s. Les comparaisons de morts avec des phases à l'horloge globale doivent être normalisées.
- R-04 compte tous les événements apogee ; l'expert actuel a une médiane **12 événements**, mais **4 vrais débuts**. La cible de deux utilisations reste tenue sur cet échantillon. Le banc p5 prend par ailleurs un minimum pour les LASSO/APOGÉE expert, alors que R-04 rapporte une médiane. Ces indicateurs ne doivent pas être mélangés.

## 2. Les vingt B sur les sources reçues

Lecture contractuelle transparente : accès par vraie phase d'arrivée ; game over selon R-04 ; LASSO selon R-34 (la différence p5 est affichée) ; rythme selon le banc p5 ; combat officiel laissé indéterminé lorsqu'il manque. Ce tableau ne prétend pas être un R-04 complet exécuté dans Chromium.

| ID | Cible | Seuil inchangé | Valeur réelle | Constat sur dix graines |
|---|---|---|---|---|
| 01 | inerte : trois vies avant 35 s | 100 % | 3/10 | échec |
| 02 | inerte : première mort au mur avant 8 s | 100 % | 0/10 ; 10,1833 s horloge / 9,3667 s combat | échec |
| 03 | tourneur : trois vies avant 90 s | 100 % | 10/10 | tenue sur ce lot |
| 04 | maladroit : game over médian | 45–150 s | 52,18 s | tenue sur ce lot |
| 05 | maladroit : accès CYCLOPE | 0/50 | 0/10 arrivées réelles | tenue sur ce lot |
| 06 | kamikaze : défaite avant CYCLOPE | ≥90 % | 10/10 | tenue sur ce lot |
| 07 | kamikaze : victoires | ≤2/50 | 0/10 | tenue sur ce lot |
| 08 | humain : game over médian | 120–210 s | 94,75 s (6 défaites) ; toutes fins 289,66 s | échec |
| 09 | humain : LASSO court | ≥50 % | R-34 : 6/39 = 15,38 % ; p5, 8–20 : 6/38 = 15,79 % | échec |
| 10 | humain : LASSO long | ≥40 % | 13/65 = 20,00 % | échec |
| 11 | bon : accès CYCLOPE | 30–60 % | 6/10 = 60 % (phase/arrivee) | tenue sur ce lot |
| 12 | bon : victoires | 10–30 % | 5/10 = 50 % | échec |
| 13 | expert : victoires | 40–70 % | 6/10 = 60 % | tenue sur ce lot |
| 14 | expert : au moins une vie perdue | ≥80 % | 9/10 = 90 % | tenue sur ce lot |
| 15 | dieu : toutes les fins victorieuses | 320–390 s | 10/10 gagnées ; 315,69–466,76 s ; médiane 372,27 s | échec |
| 16 | dieu : chaque combat CYCLOPE | 55–90 s | R-04 : 0/10 durées disponibles ; autre borne explicite : 40,10–187,28 s | à vérifier |
| 17 | dieu : zéro erreur | 0 | 0 erreur VM et console | tenue sur ce lot |
| 18 | rythme : pics médians croissants | V1<V2<V3<V4<V5 | 6 ; 9,5 ; 15 ; 20 ; 18 (n=10/10/9/8/7) | échec |
| 19 | rythme : respiration après chaque pic | ≥8 s sous 40 % | 40 complètes, minimum 11,72 s ; 4 tronquées, aucun succès imputé | tenue sur ce lot |
| 20 | rythme : tir ennemi avant V2 | 0 | 0 observé par le banc p5 | tenue sur ce lot |

Le banc p5 inchangé rapporte **11/20** B sur ce lot (actuel.json). Avec la médiane R-04 et le combat laissé indéterminé, il reste onze cibles tenues, huit échecs et une indéterminée. **Ce n'est ni un progrès mesuré contre les 7/20 de codex-11 ni une validation à cinquante graines** : sources, effectifs et définitions ne sont pas identiques. R-04, R-34 et R-15 se partagent les vingt B du contrat ; leur total n'est pas le nombre de lignes « ok » du seul R-04.

## 3. Compatibilité : démonstrations et toutes les paires

### 3.1 Les cibles numériques seules admettent même un témoin commun

[temoin-abstrait.json](temoin-abstrait.json) construit cinquante parties **fictives, uniquement mathématiques** : humain perd quarante fois à 150 s, cinq fois au boss à 300 s, gagne cinq fois à 350 s ; accès 20 %, victoires 10 %, médiane des défaites et de toutes les fins 150 s ; LASSO courts 50/100, longs 40/100. Bon accède 25 fois et gagne 10 fois ; expert gagne 30 fois et perd une vie 45 fois ; dieu gagne à 350 s avec un combat de 70 s ; pics croissants et huit secondes de respiration. Inerte/tourneur/maladroit/kamikaze ont leurs distributions admissibles décrites dans le fichier.

[Vérification algébrique](verification-temoin.json) : **20/20 contraintes numériques satisfaites**. Un témoin commun satisfait chacune des **190 paires**. Cela réfute une contradiction purement arithmétique ; **cela ne prouve pas que ces trajectoires sont accessibles aux politiques ou aux réglages actuels**. Les données fictives sont séparées des reçus réels.

| Famille de paires | Relation démontrée | Verdict utile |
|---|---|---|
| Pilotes différents, sans durée commune imposée | Distributions différentes ; aucune égalité de résultats n'est exigée | Pas de contradiction numérique ; couplage par les réglages du jeu à mesurer |
| Bon accès / victoire | Victoire implique accès ; 10–30 % de victoires et 30–60 % d'accès se recouvrent sans conflit | Compatible ; 50 % d'accès et 20 % de victoires en sont un témoin |
| Expert victoire / perte d'une vie | P(victoire ∩ vie perdue) ≥ P(victoire)+P(vie perdue)−1 | Au moins 20 % d'intersection si 40 % gagnent et 80 % perdent une vie ; possible. Actuel : les deux B tenues |
| Maladroit médiane / jamais boss ; kamikaze avant boss / victoires | Les pertes précoces et rares victoires peuvent coexister | Les deux paires sont tenues sur les vraies phases actuelles ; le repli panneau donnait un autre résultat |
| Humain médiane / réussite LASSO court ou long | Le taux est conditionnel aux tentatives à une longueur, sans quota obligatoire de tentatives ni victoire garantie | Compatible numériquement ; améliorer les captures pourrait augmenter la survie, sans la forcer au-delà de 210 s |
| Pics / respiration / zéro tir avant V2 | L'effectif au pic et la durée creuse sont des observables différentes ; le contact peut tuer sans projectile | Compatibles ; aucun besoin logique de supprimer huit secondes de repos ou d'ajouter des tirs précoces |
| Dieu durée / combat | T=O+C ; intersection non vide exactement pour O∈[230,335] | Compatible sur chacun des dix budgets hors boss mesurés, voir ci-dessous |
| Toute paire contenant inerte.mur8, jeu reçu figé | Le trajet droit au mur prend déjà plus de huit secondes | Incompatible avec cette géométrie, même si l'autre cible était satisfaite |

### 3.2 Inerte : impossibilité géométrique précise

Monde de **1024 px** (N.R.monde.W), départ horizontal à **0,38×1024 = 389,12 px** ([70-joueuse.js:120–126](../../src/70-joueuse.js)), limite de tête à **1021 px**, croisière **68 px/s** (N.R). Le trajet nu vaut **(1021−389,12)/68 = 9,29235 s**, avant même la grâce au mur et la plongée. Mesuré sur les dix graines : première mort horloge **10,18333 s**, charge combat **9,36667 s**, toujours par mur. **Le seuil strict <8 s est intenable en conservant ces conditions.** Changer les PV du boss, le LASSO ou le plafond V2 ne peut raccourcir ce trajet initial.

Pour respecter huit secondes, une condition nécessaire, même en ignorant tout délai, est une distance au mur < **544 px** : départ x>**477 px**, ou vitesse>**78,985 px/s** au départ actuel. Ce sont des bornes nécessaires calculées, pas une solution testée ; les délais réels les renforcent. La cible des trois vies avant 35 s exige aussi de considérer les réapparitions : seulement 3/10 réussites actuellement. Rendre le pilote inerte actif pour atteindre ces seuils détruirait sa définition.

### 3.3 Durée du secteur : aucune contradiction avec le combat visé

Avec T fin à l'horloge, C première phase/entree→section/victoire, O=T−C, on veut simultanément 320≤T≤390 et 55≤C≤90. Il faut donc :

**max(55,320−O) ≤ C ≤ min(90,390−O)**, soit **230≤O≤335**.

| Graine dieu | T (s) | C alternatif observé (s) | O (s) | C compatible si O reste fixe (s) |
|---|---:|---:|---:|---:|
| 1 | 337,43 | 61,08 | 276,35 | 55,00–90,00 |
| 2 | 466,76 | 187,28 | 279,47 | 55,00–90,00 |
| 3 | 373,21 | 90,07 | 283,13 | 55,00–90,00 |
| 4 | 389,91 | 110,67 | 279,25 | 55,00–90,00 |
| 5 | 371,33 | 89,43 | 281,91 | 55,00–90,00 |
| 6 | 315,69 | 40,10 | 275,59 | 55,00–90,00 |
| 7 | 374,01 | 92,00 | 282,01 | 55,00–90,00 |
| 8 | 340,19 | 58,22 | 281,97 | 55,00–90,00 |
| 9 | 430,71 | 148,47 | 282,24 | 55,00–90,00 |
| 10 | 337,36 | 72,91 | 264,45 | 55,55–90,00 |

Source : [durees.json](durees.json), temps bruts et reçus joints. O va de **264,45 à 283,13 s**, dans la zone compatible pour chaque graine. Un C hypothétique commun de **70 s** donnerait des T de **334,45 à 353,13 s** : les deux cibles se tiennent ensemble dans ce budget. Aucun C n'a été imposé au jeu ; cette substitution arithmétique ne prédit pas les effets d'un changement de gameplay.

Le problème actuel est la **dispersion** du combat alternatif, **40,10–187,28 s**, plutôt qu'une incompatibilité de durées. Sept T sur dix sont dans la plage, mais la cible porte sur **toutes** les parties. Les C alternatifs sont dans 55–90 sur quatre graines ; cela ne répare pas le marqueur officiel manquant. Dans le simple modèle hypothétique C'=kC, le combat court impose k≥55/40,10≈**1,372** et le long k≤90/187,28≈**0,481** : aucun même facteur ne convient. **Ce modèle linéaire n'est pas une loi établie des PV ou dégâts du jeu**, qui comportent des fenêtres et des phases ; il explique pourquoi une baisse uniforme n'est pas une correction démontrée.

### 3.4 Matrice exhaustive sur l'état reçu

Chaque paire a sa relation et son constat séparés dans [paires.csv](paires.csv). **55 paires** ont leurs deux B tenues sur le lot, **124** contiennent au moins un échec, **11** restent indéterminées sans échec déjà constaté. Ces nombres décrivent le lot, pas un espace de réglages exploré. Les 19 paires contenant 02 rencontrent la borne géométrique prouvée.

Matrice des 190 paires sur les sources reçues, dix graines ; aucune projection à cinquante. + = les deux cibles tenues sur ce lot, E = au moins un échec mesuré, ? = au moins une mesure indéterminée sans échec déjà établi. E ne démontre pas une impossibilité de réglage. Dans le témoin abstrait, toutes les paires sont compatibles. Les paires contenant 02 échouent notamment sur la géométrie actuelle.

| B | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | — | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| 02 | E | — | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| 03 | E | E | — | + | + | + | + | E | E | E | + | E | + | + | E | ? | + | E | + | + |
| 04 | E | E | + | — | + | + | + | E | E | E | + | E | + | + | E | ? | + | E | + | + |
| 05 | E | E | + | + | — | + | + | E | E | E | + | E | + | + | E | ? | + | E | + | + |
| 06 | E | E | + | + | + | — | + | E | E | E | + | E | + | + | E | ? | + | E | + | + |
| 07 | E | E | + | + | + | + | — | E | E | E | + | E | + | + | E | ? | + | E | + | + |
| 08 | E | E | E | E | E | E | E | — | E | E | E | E | E | E | E | E | E | E | E | E |
| 09 | E | E | E | E | E | E | E | E | — | E | E | E | E | E | E | E | E | E | E | E |
| 10 | E | E | E | E | E | E | E | E | E | — | E | E | E | E | E | E | E | E | E | E |
| 11 | E | E | + | + | + | + | + | E | E | E | — | E | + | + | E | ? | + | E | + | + |
| 12 | E | E | E | E | E | E | E | E | E | E | E | — | E | E | E | E | E | E | E | E |
| 13 | E | E | + | + | + | + | + | E | E | E | + | E | — | + | E | ? | + | E | + | + |
| 14 | E | E | + | + | + | + | + | E | E | E | + | E | + | — | E | ? | + | E | + | + |
| 15 | E | E | E | E | E | E | E | E | E | E | E | E | E | E | — | E | E | E | E | E |
| 16 | E | E | ? | ? | ? | ? | ? | E | E | E | ? | E | ? | ? | E | — | ? | E | ? | ? |
| 17 | E | E | + | + | + | + | + | E | E | E | + | E | + | + | E | ? | — | E | + | + |
| 18 | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E | — | E | E |
| 19 | E | E | + | + | + | + | + | E | E | E | + | E | + | + | E | ? | + | E | — | + |
| 20 | E | E | + | + | + | + | + | E | E | E | + | E | + | + | E | ? | + | E | + | — |

01 : inerte.35 (échec)  
02 : inerte.mur8 (échec)  
03 : tourneur.90 (tenue)  
04 : maladroit.mediane (tenue)  
05 : maladroit.cyclope (tenue)  
06 : kamikaze.avant (tenue)  
07 : kamikaze.gagne (tenue)  
08 : humain.mediane (échec)  
09 : humain.lassoCourt (échec)  
10 : humain.lassoLong (échec)  
11 : bon.cyclope (tenue)  
12 : bon.bat (échec)  
13 : expert.bat (tenue)  
14 : expert.perdVie (tenue)  
15 : dieu.duree (échec)  
16 : dieu.combat (à vérifier)  
17 : dieu.erreurs (tenue)  
18 : rythme.pics (échec)  
19 : rythme.respiration (tenue)  
20 : rythme.tirs (tenue)


## 4. Les pilotes représentent-ils encore leur joueur ?

L'expérience appariée suivante remplace uniquement le 85 reçu par le 85 avant-p14. Les autres modules et les graines sont fixes. Elle mesure l'effet de **l'ensemble des changements de politique p14 sur le jeu actuel**, sans attribuer le gain séparément au LASSO, aux pouvoirs ou à l'APOGÉE. Source : [synthese.json](synthese.json), ecarts et reçus ; [parties.csv](parties.csv).

| Pilote | Médiane toutes fins avant→après (s) | Médiane défaites avant→après (s) | Vraies arrivées avant→après | Victoires avant→après | LASSO médian avant→après | APOGÉE débuts médians avant→après |
|---|---:|---:|---:|---:|---:|---:|
| humain | 217,46 → 289,66 | 196,49 → 94,75 | 20,00 % → 50,00 % | 10,00 % → 40,00 % | 2,00 → 3,00 | 2,50 → 3,50 |
| bon | 151,55 → 369,75 | 151,19 → 188,73 | 10,00 % → 60,00 % | 10,00 % → 50,00 % | 0,50 → 6,00 | 1,00 → 4,00 |
| expert | 164,91 → 354,46 | 101,21 → 215,64 | 30,00 % → 70,00 % | 10,00 % → 60,00 % | 0,00 → 6,50 | 1,00 → 4,00 |

| Pilote | Verdict sur son rôle actuel |
|---|---|
| Inerte | Toujours aucune entrée. Bonne sonde d'absence d'action ; échec des cibles de temps imputable au parcours observé, pas à un renforcement p14. |
| Tourneur | Tourne sans éviter ; dix pertes avant 90 s. Rôle conservé dans ce lot, sans validation sur cinquante graines. |
| Maladroit | Vise sans danger, décisions 0,7 s et bruit ±35°, pas de pouvoir. Médiane 52,18 s et aucune vraie arrivée. Rôle cohérent avec le contrat ; le faux positif CYCLOPE ne doit pas servir à l'affaiblir. |
| Kamikaze | Charge et déclenche dès que prêt ; dix défaites avant boss, zéro victoire. Rôle conservé ; R-04 le faisait échouer à cause des panneaux. |
| Humain | **Plus fort depuis p14 sur cette paire**, 10→40 % de victoires, mais **représentativité d'une joueuse moyenne non établie**. Ce n'est pas une mesure sur des personnes ou un iPhone physique. Il calcule des rayons faisables, choisit parmi des cercles, mémorise leur centre et anticipe son propre retard. Il décide à chaque pas avec des données géométriques exactes. Les 120 ms et ±10° conservés ne suffisent pas à prouver une compétence moyenne. |
| Bon | Nettement renforcé, 10→50 % de victoires, au-dessus des 10–30 % visés sur ce lot. L'entrée en boucle accepte une seule cible au lieu du groupe de quatre, et l'APOGÉE n'attend plus nécessairement huit ennemis. Ce n'est plus exactement le « bon » gelé. Son accès réel 60 % reste dans la borne haute. |
| Expert | 10→60 % de victoires et 90 % avec perte d'une vie : **pas de preuve qu'il soit trop fort pour ses deux B**. Il ne réalise toutefois plus la planification complète du cercle prescrite par l'ancienne spécification ; le nouveau guide est partagé avec humain/bon. LASSO médian 6,5<10 ; APOGÉE début médian 4≥2. |
| Dieu | Invulnérabilité effective, dix victoires et zéro vie perdue. **Ne représente plus “bon + god”** : lassoDoigt exclut dieu, qui utilise l'ancien guide et l'ancien déclenchement APOGÉE. Sa durée ne peut servir de mesure du seul effet de l'invulnérabilité par rapport au bon actuel. |

Écarts de politique vérifiables : [85-pilote.js:204](../../src/85-pilote.js), :214–227, :275–283 et :300–324 ; contrat [pilotes.md §4–5](../../refonte/lots/pilotes.md). L'humain émet **48 impulsions de pouvoir et 22 d'APOGÉE** contre zéro dans le contrefactuel, en plus du mode auto. Humain : **180/181** tentatives sur moins de quatre cibles ; bon : **203/203** ; expert : **275/277**. Le changement dépasse donc la réparation d'un cercle autrefois irréalisable. Ces impulsions ne sont pas revendiquées comme autant de succès : les résultats de jeu viennent des vrais événements et des états.

La fréquence de décision à chaque pas, le champ à 25 caps et la prédiction jusqu'à 0,70 s existaient déjà ; **ils ne sont pas attribués à p14**. Le délai nominal humain est bien conservé, mais sa compensation dans le guide change sa portée comportementale. Aucun chiffre de latence ou de bruit censé décrire « la moyenne humaine réelle » ne peut être déduit de ce lot sans référence de joueurs.

## 5. Plus petite correction cohérente proposée, sans l'appliquer

**Choix recommandé : réparer l'observateur, puis recaler sélectivement les pilotes sur leur définition, sans modifier les seuils.** Un simple retour arrière de tout p14 ferait revenir humain à 10 % de victoires et à 196,49 s de médiane des défaites sur ce contrefactuel, mais bon n'accéderait qu'à 10 % et expert ne gagnerait qu'à 10 % : ce n'est pas une solution globale. Garder la géométrie qui permet de fermer une boucle, tout en distinguant l'aide et les décisions, est plus cohérent.

| Intervention proposée | Chiffres et critère de vérification | Ce qu'on perd / limite |
|---|---|---|
| Normaliser la mesure, avant tout essai | Accès par phase d'arrivée ou état boss identifié ; pas panneau générique. Un seul repère de victoire raccordé au producteur ; temps d'événement conservé séparé du temps de combat. Publier ensemble médiane de toutes les fins et médiane des défaites, avec leurs effectifs. Garder les bornes 120–210, 320–390 et 55–90 dans leur sens choisi explicitement par le gardien. | Anciennes séries et décomptes B ne sont plus directement comparables ; il faut les relire, pas faire passer l'évolution de l'instrument pour un progrès du jeu. |
| Humain : séparer le geste de la stratégie assistée | Garder **120 ms**, **±10°**, bruit toutes **0,25 s**, ACTIONS AUTO ; retirer les impulsions manuelles de pouvoir/APOGÉE et la compensation anticipée du retard pour ce seul archétype. Distinguer son entrée sans planification de celle de l'expert. Aucun nouveau délai arbitraire proposé. | Perte possible d'une partie de l'amélioration LASSO/survie ; effet exact non mesuré. Le profil doit ensuite être gelé par le gardien et confronté aux joueurs, pas ajusté jusqu'à obtenir un taux voulu. |
| Bon/expert : rétablir les conditions annoncées ; dieu suit exactement bon | Bon : groupe **≥4** dans **60 px**, APOGÉE pleine avec **≥8** ennemis en vue, TRAVERSÉE menace **<0,2 s**. Expert : vérifier les **24 points** du cercle, réaction **50 ms**, œil du boss autorisé. Dieu : même politique que bon, réaction **80 ms**, seul god diffère. | Moins de boucles opportunistes et d'APOGÉE sur une ou deux cibles ; Dieu peut alors changer de durée. Aucun gain de cibles garanti avant mesure. Les valeurs sont celles du contrat existant, pas de nouveaux seuils. |
| Traiter séparément la géométrie de départ si le seuil inerte reste intangible | Distance initiale strictement sous **544 px** nécessaire à 68 px/s, et moins encore avec les délais ; vérifier ensuite première mort mur<8 s et trois vies<35 s sur le profil prescrit. Publier toute nouvelle constante dans N.R, par le propriétaire de 70. | Changer le départ affecte la première minute des huit pilotes. Une correction des seuls pilotes ne peut résoudre ce blocage sans trahir “inerte”. La position suffisante n'est pas inventée ici. |

Cette proposition est un **recadrage de méthode et de politique**, pas une candidate qualifiée 20/20. Tant que le défaut géométrique demeure, aucun réglage des seuls pilotes ne peut suffire. Si la cheffe exige de conserver tous les pilotes p14 tels quels, il faut assumer un autre choix de design, décrit ci-dessous, et non prétendre avoir corrigé leur représentation.

| Autre voie | Changement minimal requis pour accepter les valeurs actuelles | Ce qu'on perd |
|---|---|---|
| Reformuler les cibles pour accepter ces machines | Renommer humain en agent assisté ; une plage de victoires doit contenir **40 %** ici au lieu de finir à 12 %, bon doit contenir **50 %** au lieu de finir à 30 %. Avec les définitions présentes, accepter dieu exigerait de couvrir **315,69–466,76 s** et son combat alternatif **40,10–187,28 s** ; humain exigerait de couvrir **94,75 s** de défaites, ou **289,66 s** si toutes fins. | Cela abandonne les ambitions initiales de difficulté et de rythme. Ces enveloppes calculées sont le coût de ce choix, **pas des seuils recommandés ni appliqués** ; dix graines ne justifient pas leur adoption. |
| Régler le jeu en gardant les politiques actuelles | Première trajectoire à raccourcir ; dispersion boss à contenir, sans supposer un facteur PV suffisant ; bon à ramener vers 10–30 % de victoires en conservant expert à 40–70 %. Pour humain, les défaites sont déjà trop courtes (94,75<120) tout en gagnant trop souvent (40>12). | Durcir uniformément peut raccourcir davantage les défaites humaines tout en réduisant les victoires ; alléger uniformément peut encore augmenter ces victoires. Effets antagonistes possibles, **pas preuve d'impossibilité de réglage**. Coût et risque supérieurs au recadrage préalable de l'instrument. |

Le lot n'applique aucune de ces voies. Les demandes aux propriétaires sont consignées dans [demandes.md, section codex-p34](../../refonte/lots/demandes.md).

## 6. Vérifications, limites et suite pour la cheffe et le jury

**Faits livrés et vérifiés :** calibration exacte 10/10 ; 110/110 parties actuelles et contrefactuelles finies, zéro erreur VM/console ; 40 reçus Chromium historiques relus sans altération, SHA joint ; 190 paires présentes ; témoin abstrait vérifié contre les vingt contraintes ; sources src et index inchangés après build sortie 0. Aucun seuil abaissé, aucun jugement de qualité artistique ou de joueuse humaine inventé.

[Audit final reproductible](verification-finale.json), par auditer.mjs. Une première lecture du bundle via git show a échoué avec ENOBUFS ; le contrôle a été terminé par comparaison des empreintes de blob Git, sans modifier de fichier ni rejouer une partie. Ce défaut de commande n'est pas compté comme erreur du jeu.

**À vérifier hors bac :** exécuter verifier.mjs si une comparaison navigateur est requise. Il ouvre un seul Chromium muet, 80 cas paysage et cinq graines par pilote dans chacun des deux autres profils, puis conserve états/journaux, indices bruts du tampon, histogrammes, PNG et différences VM. Aucun pixel ni résultat de ce script n'est revendiqué ici. Chromium iPhone émulé ne vaut pas Safari physique, ni un test de photosensibilité complet.

**Suite de décision proposée :** faire corriger les repères d'accès/fin et figer les deux définitions de médiane ; faire publier la spécification amendée des pilotes avant une recalibration sélective ; laisser au jury de joueurs le constat de difficulté ressentie. Une fois le candidat figé et les erreurs de mesure corrigées, qualifier les proportions sur les cinquante graines prescrites ; ajouter un lot indépendant si ces graines ont servi à choisir les paramètres. Ne pas reprendre les passes de réglage arrêtées comme si leur plafond avait été annulé.

Données jointes : [parties.csv](parties.csv), [paires.csv](paires.csv), [synthèse complète et différences appariées](synthese.json), [durées](durees.json), [relecture 318ce61](relecture-318ce61.json), [validation VM](validation-vm.json), reçus compressés dans recus/ et recus-318ce61/, sources intégrales figées et manifest. Scripts sans réseau : mesurer.mjs valider ; mesurer.mjs actuel ; mesurer.mjs avant-p14 ; relire-318.mjs ; analyser.mjs ; rapport.mjs ; auditer.mjs. Les séries actuelles et contrefactuelles réutilisent leurs reçus ; il n'est pas nécessaire de les rejouer pour relire l'analyse.
