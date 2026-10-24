# Ce que SNAKE 2975 a repris de SNAKE 2030 — vérification idée par idée

Question de la propriétaire (17 octobre, nuit) : « as-tu récupéré tout le travail qui avait été fait sur SNAKE
2030 ? ». Quatre vérificateurs indépendants ont repris chaque idée des quatre inventaires
(`refonte/inventaire-*.md`) et l'ont cherchée dans le code de HEAD (12f86d0), en exigeant qu'un code exécuté
s'en serve : une règle écrite dans N.R mais lue par personne compte comme PARTIELLE.

## Le bilan

| inventaire | idées | reprises en mieux | reprises | partielles | absentes |
|---|---:|---:|---:|---:|---:|
| cœur, phases, amorçage | 58 | 24 | 8 | 19 | 7 |
| ennemis, niveaux, boss | 166 | 73 | 22 | 40 | 29 (+ 2 sans objet) |
| armes, cartes, progression | 97 | 26 | 11 | 19 | 41 |
| interface, effets, audio | 124 | 45 | 40 | 32 | 7 |
| **total** | **445** | **168** | **81** | **110** | **84** |

Réponse courte : **non, pas tout.** 249 idées sur 445 sont reprises (168 en mieux), 110 sont amorcées sans
être finies, 84 manquent. Les manques se concentrent sur les armes et les cartes, et sur les familles
d'ennemis de 2030 que 2975 n'a pas.

## Les causes communes (corriger une cause répare des dizaines de lignes)

1. **L'horloge de jeu à pas fixe n'est pas branchée** : `90-boot.js` n'appelle jamais `N.horloge.avancer()`.
   Conséquences : aucun ralenti n'agit sur le jeu (RALENTI, APOGÉE, blessure, montée de niveau, arrivée du
   CYCLOPE), l'écran-titre de `80-ecrans.js` n'est jamais montré, le décor ne suit pas les temps de la musique.
2. **La banque de 48 sons (`sons/banque.js`) n'est pas dans le jeu** : `build.mjs` ne l'injecte pas ;
   `30-music.js` en réécrit une partie à la main ; mort, game over, battement, palier, bip et clic ne sonnent
   jamais, et tous les télégraphes ont le même son.
3. **`N.decor.build()` n'est jamais appelé** : le décor ne réagit à aucun événement (éclipse du CYCLOPE,
   inversion, états de la partie).
4. **Des cartes sans effet** : ÉPERON, GRAPPE, BRAISE ; les pouvoirs RALENTI et REPLI ne s'équipent jamais
   (`equiper()` n'est appelée nulle part). *BOUCLIER et RÉPARATION sont corrigés depuis (commit c9ac625).*
5. **Clavier incomplet** : pas de boost, E (pouvoir) et R (APOGÉE) non lus, ni souris ni manette.

## Les grands absents

- les ennemis « serpent » de 2030 : tique, voleur, miroir, brouilleur, faucheur ; sauteur, garde, régénère,
  noyau et zone magnétiques ;
- un seul secteur : pas de chapitres à règle d'arène propre, ni de boss par chapitre ; pas d'événements d'arène
  (COUPURE, PLUIE DE MINES, GRAVITÉ, CONTRESENS) ; le mode SURCHARGE annoncé à la victoire n'existe pas ;
- passifs PERFORATION, SURTENSION, ÉPINES, ONDE DE CHOC, SILLAGE qui blesse ; pas de prérequis ni d'évolutions ;
  les PV des ennemis ne montent pas avec l'arsenal (retour du « trop facile ») ;
- codex de première rencontre, crochet d'impact (tête ou corps), postures armées visibles ;
- signal de dernière vie, thème de défaite, mort sonore, son de palier de multiplicateur, bannières animées.

## Petits bugs trouvés en passant

- `72-ennemis.js` demande le sprite `lame:deploye`, le générateur ne connaît que `deployee` : les lames
  déployées ne s'affichent jamais.
- Sprites dessinés mais jamais demandés : `fleche:armee`, `fleche:elite`, `ruche:p1`, `ruche:p2`, `mini:<type>`.
- Une quinzaine de chiffres de N.R ne sont lus par personne (respiration, consigne, codex, crochet, surcharge,
  ralenti du boss…).

Les quatre tableaux complets suivent, avec pour chaque idée son statut, la preuve (fichier:ligne) et ce qui manque.


---

# Couverture de l'inventaire « cœur, phases, amorçage » (SNAKE 2030 → SNAKE 2975)

Source : `proto-neon/refonte/inventaire-coeur.md`, 58 fiches (A1 à O8).
Code vérifié : `proto-neon/src/*.js` à HEAD `12f86d0` (arbre de travail de `src/` propre). Chemins relatifs à `proto-neon/src/`.
Méthode : grep de chaque règle, puis lecture du code qui l'exécute. Une valeur posée dans `N.R` sans aucun module qui la lit compte comme PARTIELLE.

Deux faits pèsent sur beaucoup de lignes :

1. **L'horloge à pas fixe n'est pas branchée.** `90-boot.js` n'appelle jamais `N.horloge.image/avancer`. Le jeu tourne donc à pas variable, avec dt plafonné à 50 ms (`90-boot.js:338`). `N.fx.k()` et `kJoueuse()`, les facteurs de ralenti, ne sont lus que par cette horloge, qui ne tourne pas, et par le passe-bas de la musique (`30-music.js:1861`). Résultat : aucun ralenti du monde n'agit sur le jeu. Ni le pouvoir RALENTI, ni l'APOGÉE, ni la montée de niveau. Le gel d'image, lui, marche (`90-boot.js:348`).
2. **`N.joueuse.equiper()` n'est appelée nulle part.** Le pouvoir reste TRAVERSÉE toute la partie, même quand une carte RALENTI ou REPLI est choisie (`70-joueuse.js:429`, `75-cartes.js` `choisir`).

Règles de 2975 qui remplacent volontairement 2030 : le mur tue, le corps se coupe au lieu d'absorber, et se mordre COUPE le serpent sans tuer (`02-regles.js:83-84`, `70-joueuse.js:302-313`). La mort ne vient donc plus que par la tête : mur, ennemi, tir, laser.

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| A1 Virage proportionnel à la déflexion | REPRISE EN MIEUX | 70-joueuse.js:264 (taux = (mag−0,12)/(0,70−0,12), plancher 0,18) ; 02-regles.js:57 ; chevron 70-joueuse.js:827 | rien d'important (quart de tour 253 ms, saturation à 70 % : fait) |
| A2 Corps qui suit le chemin de la tête | REPRISE EN MIEUX | 70-joueuse.js:54-73 (trace 1 pt/px) ; pulsation tête→queue 70-joueuse.js:821 ; perles épaisses en REPLI 70-joueuse.js:823 ; gerbe par segment 70-joueuse.js:785 | écailles tous les 3 segments ; épaisseur variable visible seulement en REPLI (inaccessible, voir G1) |
| A3 Bords : rebond amorti, jamais de mort | ABSENTE | remplacée : le mur tue après 60 ms de grâce, 70-joueuse.js:292-301 ; alerte rose à 24 px 79-jeu.js:505-520 | choix de la propriétaire : le mur tue (rien à reprendre, sauf le bord en pointillés qui défilent) |
| A4 Visée assistée distincte du cap | REPRISE | tourelles visant l'ennemi le plus proche, 74-arsenal.js:161-164 | cône de ±90° au lieu de ±25-30° (`armes.tourelles.viseeDeg` lu par aucun module) ; pas d'option souris de visée double au bureau |
| A5 Entrées complètes par appareil | PARTIELLE | manche flottant 90-boot.js:180-283 ; e.code, modificateurs et répétitions filtrés 90-boot.js:102-116 ; Espace = cadence de tir 90-boot.js:111 ; manette 90-boot.js:23 (jamais lue) | E/R/F inertes, souris sans pilotage, aucune manette (`N.R.controles` lu par aucun module) |
| B1 La longueur est la vie | PARTIELLE | tir ou morsure = coupe au segment 70-joueuse.js:187-212 ; la queue tombe en cellules 71-butin.js:211-220 ; 3 vies gardées 77-score.js:72, 78-hud.js:98-104 | les 3 cœurs restent ; pas de pastilles de longueur près de la tête quand elle devient critique |
| B2 Butin : expiration, fusion, noyau, aimant | REPRISE EN MIEUX | fusion 71-butin.js:111 ; clignote 2 s 71-butin.js:173 ; noyau d'élite 71-butin.js:195 ; noyau → APOGÉE +20 70-joueuse.js:238 ; escalier +1 demi-ton 30-music.js:832 | le CYCLOPE ne lâche pas de noyau ; une cellule fusionnée ne donne que 1 XP (75-cartes.js consommateur `ramassage`) |
| B3 Régénération, sursis, battement de cœur | PARTIELLE | battement : 79-scene.js:286-297, mais branché sur la proximité du mur ; RÉPARATION dans 75-cartes.js:44, `mods.reparation` lu par aucun module | battement à 1 Hz quand longueur ≤ 3, pulsation de la tête, effet réel de RÉPARATION, SURSIS |
| C1 Coup encaissé lisible (source, vignette, combo ÷ 2) | REPRISE EN MIEUX | source du coup dans S.death 70-joueuse.js:159-185 ; vignette orientée et recul 79-scene.js:139-148 ; chaîne ÷ 2 77-score.js:187 ; gel 3 images 02-regles.js:96 | le ralenti de 180 ms (et il ne marcherait pas, voir O3) |
| C2 Bouclier plafonné | PARTIELLE | `passifs.bouclier` 02-regles.js ; carte proposée 75-cartes.js:45, `mods.bouclier` lu par aucun module | la carte BOUCLIER n'a aucun effet : liseré, charge et recharge à écrire |
| C3 Le corps profond absorbe les tirs | ABSENTE | remplacée : un tir sur le corps le COUPE, 70-joueuse.js:330-337 | choix de la propriétaire ; plus de récompense « bouclier vivant » |
| C4 Contacts : bélier en boost, ronces | PARTIELLE | carte ÉPERON 02-regles.js (passifs.eperon), `mods.eperon` lu par aucun module ; aucun bélier en boost | la tête-bélier en accélération contre les petits ennemis |
| C5 Mort mise en scène | REPRISE EN MIEUX | gel 10, cue musique 'mort' 79-jeu.js:289-299 ; désintégration queue → tête 79-jeu.js:301-330 ; anneaux par segment, glitch, sans flash 79-scene.js:229-257 | rien d'important |
| C6 Grille spatiale et plafonds | PARTIELLE | plafonds : tirs ennemis 80 (72-ennemis.js:27), tirs joueuse 160 (74-arsenal.js:17), butin 140 (71-butin.js:20) | pas de grille spatiale : recherches linéaires (74-arsenal.js:78-87) ; une constante unique de plafond |
| D1 Boost à réserve sans bouton, panne franche | REPRISE EN MIEUX | 70-joueuse.js:368-401 (manche ≥ 0,85 tenu 120 ms ou 2ᵉ doigt tenu, hystérésis 25/10, un seul son de panne) | au bureau, aucun déclencheur (Espace accélère le tir, 90-boot.js:111) ; pas de manette |
| D2 Jauge de boost autour de la tête | REPRISE EN MIEUX | 70-joueuse.js:711-715 (arc de 270°, ambre puis brasier sous 20 %, cachée quand pleine) | rien d'important |
| D3 Traînée de boost, avance de vitesse | PARTIELLE | avance × 1,4 12-cam.js:238 et sol × 1,6 15-decor.js:797, mais seulement sur `S.input.boost` (2ᵉ doigt) | aucune traînée ambre/jaune ; manche poussé (`N.joueuse.boost`) sans effet sur la caméra ni le sol |
| E1 Multiplicateur tiré du combo | REPRISE | 77-score.js:82-90 (×1 à ×8 tous les 5 kills, fenêtre 2,5 s), ÷ 2 à la coupe 77-score.js:187 ; HUD « ×N DANS k » 78-hud.js:129-135 | sons de palier (`score.paliersOnde` lu par aucun module) ; fenêtre courte (2,5 s au lieu de 5) |
| E2 Le kill qui monte | REPRISE EN MIEUX | hauteur du son suit la chaîne 79-scene.js:126 ; gains à l'échelle 2 dès une chaîne de 6 78-hud.js:52 | éclats projetés dans le sens du tir |
| E3 Score pondéré par difficulté, records par cran | ABSENTE | rien trouvé (10 records globaux seulement, 77-score.js:245-256) | records par niveau et par mode ; score × modificateurs |
| E4 XP, montée de niveau, cadence des cartes | REPRISE EN MIEUX | XP 75-cartes.js:69-78 ; seuils 02-regles.js (xp.seuils) ; cartes au nettoyage de chaque vague 79-jeu.js:250-252 | XP gagnée seulement au ramassage, pas au kill (sans conséquence sur le reste) |
| F1 APOGÉE, la vague qui vide l'écran | REPRISE | charge 70-joueuse.js:219-242 ; 6 anneaux et gel 6 70-joueuse.js:472-506 ; geste « glissé » du 2ᵉ doigt 90-boot.js:252-253 | jauge invisible avant d'être pleine ; R au clavier non lu ; ralenti 0,25 sans effet (O3) |
| G1 Trois pouvoirs, un équipé | PARTIELLE | les trois codés 70-joueuse.js:434-461 ; `equiper()` jamais appelée 70-joueuse.js:429 ; RALENTI = N.fx.ralenti sans effet en jeu | RALENTI et REPLI inaccessibles en partie ; RALENTI ne ralentirait rien ; pas de choix au briefing |
| G2 Recharge du pouvoir visible | PARTIELLE | un pixel qui tourne quand le pouvoir est prêt, 70-joueuse.js:716-719 ; son `pouvoirPret` 70-joueuse.js:461 | aucun arc qui se remplit pendant la recharge |
| H1 Caméra qui voyage (avance, bande de tête) | REPRISE EN MIEUX | monde de 1 024 × 512, avance vers le cap visé, amorti critique 12-cam.js:218-258 ; cadre 15-85 % 12-cam.js:259-270 ; parallaxe 15-decor.js | rien d'important |
| H2 Zoom qui respire → cadrages pilotés | REPRISE EN MIEUX | mode boss tête-œil 12-cam.js:240-246 ; `focus` sur le CYCLOPE 73-colosse.js:662 ; intermèdes 79-jeu.js:178-185 | léger recul à l'APOGÉE |
| H3 Pulsation d'impact → poussée en pixels | REPRISE EN MIEUX | recul opposé à l'impact 79-scene.js:79-83 ; jolt de 2 à 6 px 12-cam.js:332-339 | rien d'important |
| H4 Jolt : le plateau encaisse | REPRISE EN MIEUX | jolt 4 px dans le sens du coup 79-scene.js:139-148 ; la grille ondule 79-scene.js:115 (élites seulement) | frémissement du fond sur un coup reçu |
| H5 La tête ne quitte jamais l'écran | REPRISE EN MIEUX | 12-cam.js:259-270 (la tête passe avant la borne) | rien |
| I1 Le décor change de régime | REPRISE EN MIEUX | quartier et état à chaque vague 76-directeur.js:74-78 ; travelling, convois, pic d'élite par vague (02-regles.js `secteurs[0].vagues`) ; INVERSION 70-joueuse.js:601 | phases internes à une vague calées sur la mesure (la grille des temps ne sert qu'aux apparitions) |
| I2 Phase GRILLE, rails façon Tron | ABSENTE | rien trouvé (aucun rail ni treillis de pilotage ; la traînée lumineuse ne sert qu'au LASSO, 70-joueuse.js:548-584) | phase Snake sur cases, virages mis en file, traînée Tron |
| I3 Bascule 3D → sol mode 7 et AUTOROUTE | REPRISE EN MIEUX | sol en perspective ligne par ligne 15-decor.js:525-528 ; LE VOL entre deux vagues 17-vol.js:1-60 et 79-jeu.js:264-268 | le VOL dure 4 s (8-10 s proposées) |
| I4 ESPACE → phase de respiration | PARTIELLE | `secteurs[0].respiration` lu par aucun module ; seule pause : nettoyage de 2,5 s avec pluie de cellules 79-jeu.js:242-248 | respiration étoilée en cours de vague ; LE DÉFILÉ (`R.defile` lu par aucun module) |
| I5 Treillis d'une autre couleur que la joueuse | REPRISE EN MIEUX | 00-pal.js:41-42 ; 79-jeu.js:471-485 (violet et indigo) | rien |
| J1 Secteurs nommés, phases, fin sur objectif | REPRISE EN MIEUX | 5 vagues nommées, calme / montée / chaos 02-regles.js (secteurs) ; fin de vague sur quota et ≤ 2 vivants 76-directeur.js:371 ; purge 79-jeu.js:242-248 | un seul secteur ; pas de respiration dans la vague |
| J2 Directeur de difficulté géométrique | PARTIELLE | difficulté écrite vague par vague (vitesses, plafonds, 02-regles.js) ; `R.surcharge` lu par aucun module ; `R.pilotes` lu par aucun module dans src | directeur géométrique du mode sans fin |
| J3 Entre deux secteurs : purge, trophée, entrée du boss | PARTIELLE | purge 79-jeu.js:242-248 ; les survivants fuient 76-directeur.js:383 ; main trophée prévue 75-cartes.js:121, jamais demandée (79-jeu.js:126 ouvre 'cartes' sans opts) | ralenti de 2,2 s à l'entrée du CYCLOPE (`phase:arrivee` sans consommateur) ; main trophée |
| J4 Montée de niveau mise en scène, puis un écran de cartes | REPRISE EN MIEUX | onde jaune et son 79-scene.js:162-167 ; cartes au nettoyage 79-jeu.js:250-252 ; 3 à 5 plaques, touches 1 à 4, garde 80-ecrans.js:33-87 | le ralenti de 350 ms n'a aucun effet (O3) |
| J5 Signaux « prêt » | REPRISE | sons `ultimePret` 70-joueuse.js:470 et `pouvoirPret` 70-joueuse.js:461 ; anneau jaune quand l'APOGÉE est pleine 70-joueuse.js:720 | texte une seule fois par profil ; arcs de recharge (voir G2) |
| J6 Départ armé, appris en jouant | REPRISE EN MIEUX | canon de départ 74-arsenal.js:95-126 ; premier ennemi après un virage de 45° 76-directeur.js:72 ; pouce fantôme 78-hud.js:180-196 | rien |
| K1 Partie sans fin SURCHARGE | PARTIELLE | `R.surcharge` 02-regles.js (vitesse, densité, score), lu par aucun module | le mode entier |
| K2 Crans de difficulté → aide et modificateurs | ABSENTE | rien trouvé | aide proposée après 3 morts ; modificateurs nommés après le boss |
| L1 Menu, titre, mode attract | PARTIELLE | « TOUCHE POUR JOUER » 60-intro.js:770 (deux touchers au plus) ; l'état 'attraction' n'est jamais atteint (79-jeu.js:358-361) | écran-titre avec JOUER, entrées ouvertes aux jalons, mode attract |
| L2 Pause | REPRISE | P/Échap 79-jeu.js:112-115 ; arrière-plan 90-boot.js:422-427 ; écran REPRENDRE, cartes prises et défi (80-ecrans.js) | pause sur `blur` au bureau (90-boot.js:435 vide les entrées sans mettre en pause) |
| L3 Écran de fin qui explique | REPRISE EN MIEUX | résumé : cause, écart, record, build, défi, conseil, prochain déblocage 77-score.js:245-282 ; affichage 80-ecrans.js:298-388 | limiter à six lignes sur téléphone (dix blocs aujourd'hui) |
| L4 Plein écran honnête, web app | ABSENTE | rien trouvé (ni manifeste, ni apple-touch-icon dans index.html, ni requestFullscreen) | manifeste standalone, icône, image « Sur l'écran d'accueil », F au bureau |
| M1 Profil local versionné | REPRISE | clé unique `snake2975.v1` 77-score.js:35-63 | écriture en fin de vague et à l'entrée du boss, instantané sur `pagehide`, `storage.persist()`, code d'export |
| M2 Déblocages permanents | PARTIELLE | énergie totale → seuils 77-score.js:255-260 ; RALENTI et REPLI entrent dans le vivier 75-cartes.js:99-104 | 'styles', 'galerie', 'departV3' lus par aucun module ; les pouvoirs débloqués ne s'équipent pas (G1) |
| N1 Réglages en un seul écran | PARTIELLE | valeurs par défaut 77-score.js:26 ; secousse et écran lus par 20-crt.js:181,590 et 12-cam.js:325-330 | aucun écran de réglages (seuls le bouton son et la touche M existent) |
| N2 Vibrations | ABSENTE | rien trouvé (ni navigator.vibrate, ni vibration de manette) | vibration où elle existe, vibration de la manette au bureau |
| O1 Horloge à pas fixe | PARTIELLE | N.horloge écrite 03-socle.js:855-930 (R.temps.h lu) ; jamais pilotée : 90-boot.js:338-358 passe un dt variable plafonné à 50 ms | brancher `N.horloge.image/avancer` dans `frame()` |
| O2 Gel compté en images | REPRISE EN MIEUX | 90-boot.js:348-349 (dt × 0,08) ; gels kill 2, élite 5, coupe 3, mort 10 (79-scene.js, 79-jeu.js:294) ; le cap continue de suivre pendant le gel | rien |
| O3 Ralentis superposés avec priorité | PARTIELLE | arbitre « le plus lent gagne », joueuse exemptée 50-fx.js:837-873 ; `k()` lu seulement par 03-socle.js (non piloté) et 30-music.js:1861 | aucun ralenti n'agit sur le jeu (dépend de O1) |
| O4 Quarantaine des erreurs | REPRISE | step/errLog par signature 90-boot.js:36-43 ; appel() 79-jeu.js:49 | retrait de l'entité fautive |
| O5 Qualité adaptative à hystérésis | REPRISE EN MIEUX | 20-crt.js:577-628 (couches du tube, hystérésis 45 s, plafond = réglage) nourri par 90-boot.js:315-318 | cran stable mémorisé par appareil |
| O6 Démarrage étalé, redimensionnement | PARTIELLE | audio lancé dans le geste même 90-boot.js:289-301 ; `resize` sans minuteur 90-boot.js:405-406 | étaler l'audio sur l'image suivante (à-coup de REPRISE.md) ; minuteur de redimensionnement |
| O7 Cycle de vie | REPRISE | visibilitychange : pause et son endormi 90-boot.js:422-427 ; relance au geste 90-boot.js:289-293 | pause sur `blur` ; verrou d'écran ; `pagehide` |
| O8 Lisibilité par l'ordre de dessin | REPRISE EN MIEUX | drawTop : télégraphes, CYCLOPE, joueuse au-dessus des effets 79-jeu.js:579-594 | rien |

**Décompte (58 fiches)** : REPRISE EN MIEUX 24 · REPRISE 8 · PARTIELLE 19 · ABSENTE 7 (dont 2 remplacées par choix de la propriétaire : A3 et C3).

## Les 10 manques les plus importants pour l'expérience de jeu, classés

1. **Brancher l'horloge à pas fixe dans 90-boot.js (O1, O3).** Sans elle, aucun ralenti du monde n'existe en jeu : ni pouvoir RALENTI, ni APOGÉE (0,25), ni montée de niveau (0,15), ni coup reçu. Les moments forts n'ont pas leur respiration. Une seule correction en répare beaucoup.
2. **Les cartes passives sans effet (B3, C2, C4, plus GRAPPE et BRAISE).** RÉPARATION, BOUCLIER, ÉPERON, GRAPPE et BRAISE sont tirées et choisies, mais aucun module ne lit leur `mods`. La joueuse choisit une carte qui ne fait rien.
3. **Les pouvoirs RALENTI et REPLI inaccessibles (G1).** `equiper()` n'est jamais appelée : le pouvoir reste TRAVERSÉE même après la carte, et le REPLI, l'idée la plus originale, ne se joue jamais.
4. **Le bureau ne peut ni accélérer, ni lancer le pouvoir, ni lancer l'APOGÉE (A5, D1, F1).** Espace accélère le tir, E et R ne sont pas lus, la souris ne pilote pas et la manette n'est pas lue.
5. **Les jauges invisibles (F1, G2).** La charge de l'APOGÉE ne se voit qu'une fois pleine, et la recharge du pouvoir ne se voit pas du tout. Il faut les deux arcs autour de la tête.
6. **La longueur critique ne se sent pas (B1, B3).** Pas de battement à longueur ≤ 3 (il est réservé à la proximité du mur), pas de pulsation de la tête, pas de pastilles de longueur, et les 3 cœurs restent l'unique jauge de vie.
7. **Pas de respiration ni de DÉFILÉ (I4, J1).** Entre deux pics, seuls 2,5 s de nettoyage. `secteurs[0].respiration` et `R.defile` ne sont lus par personne.
8. **L'entrée du CYCLOPE et la récompense de fin (J3).** Pas de ralenti de 2,2 s à l'arrivée (`phase:arrivee` sans consommateur), et la main trophée est écrite dans 75-cartes mais jamais demandée.
9. **L'accélération se voit mal (D3).** Pas de traînée ambre derrière la tête, et l'avance de caméra comme la vitesse du sol ne réagissent qu'au 2ᵉ doigt, pas au manche poussé.
10. **Le multiplicateur reste muet (E1).** Les sons de palier (`paliersOnde`) ne sont lus par aucun module, et la fenêtre de 2,5 s rend la chaîne difficile à tenir. Le combo s'entend moins que dans 2030.

Juste après : le mode sans fin SURCHARGE (K1, chiffres seuls), un écran de réglages (N1), l'écran-titre avec mode attract (L1), la phase GRILLE façon Tron (I2), la pause sur `blur` et le verrou d'écran (L2, O7).

---

# Couverture de l'inventaire SNAKE 2030 « ennemis et niveaux » dans le code actuel de SNAKE 2975

Source : `proto-neon/refonte/inventaire-ennemis-niveaux.md` (I-01 à I-59, tableaux des sections 3 à 9, annexe A).
Code vérifié : `proto-neon/src/*.js` au commit HEAD `12f86d0` (arbre propre). Chiffres : `src/02-regles.js` (N.R).
Méthode : grep dans `src/`, puis lecture du code EXÉCUTÉ qui lit la règle (un commentaire seul ne compte pas ;
un chiffre de N.R qu'aucun module ne lit est noté PARTIELLE).

Statuts : **REPRISE EN MIEUX** (présente, version « en mieux dans 2975 » faite pour l'essentiel) · **REPRISE**
(présente, à peu près comme dans 2030 ou la démo) · **PARTIELLE** (amorcée, chiffres ou branchement manquants,
ou chiffre dans N.R lu par aucun module) · **ABSENTE**.

Granularité : une ligne par fiche I-xx ; les sous-idées nommées d'une fiche (formations, événements, défis,
idées « écrites jamais codées ») ont leur ligne ; les tableaux de vagues des secteurs 2030 sont pris par phase
(une ligne par phase et par secteur, au lieu d'une par rangée) ; le tableau de synthèse du § 11 et l'annexe B
(calculs) ne sont pas repris, car ils redisent les fiches.

Raccourcis : `72` = `src/72-ennemis.js`, `73c` = `src/73-colosse.js`, `73a` = `src/73-arene.js`,
`76` = `src/76-directeur.js`, `R` = `src/02-regles.js`.

## 2. Règles transversales (I-01 à I-08)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-01 Tout ce qui tue s'annonce (≥ 0,5 s, 0,8 s colosse) | REPRISE EN MIEUX | 72:385 (fige 0,6), 72:423 (verrou 0,6), 72:463 (0,5), 72:505 (mèche 0,8), 72:519 (0,75), 72:545 (0,8), 73c:408 (`teleMin` 0,8) | rien d'important : toutes les annonces ≥ 0,5 s |
| I-01 Aucun modificateur ne raccourcit une annonce | REPRISE EN MIEUX | 72:55 (`recharge()` seul touché par RAPIDE), 72:385 (durée d'annonce fixe) | — |
| I-01 Télégraphe = zone exacte (longueur réelle du bond, rayon réel du souffle) | REPRISE EN MIEUX | 72:990 (ligne 67 px = 160 × 0,42), 72:992 (82 px), 72:999 (190 px), 72:1003-1005 (disque = `souffle` qui tue, 72:178) | — |
| I-01 Deux temps : magenta pointillé puis rose pâle plein les 300 dernières ms, gaine nuit | REPRISE EN MIEUX | 72:948-955 (lit `R.ennemis.tele.finRosePale`, sur le temps RESTANT) | le losange du dard et le disque de mine basculent sur une part (kk > 0,6/0,7), pas sur les 300 ms |
| I-01 Un son d'armement par type | PARTIELLE | 79-scene.js:205-207 (un seul son `arme` pour tous) ; 73a:199 (klaxon du convoi) | sons distincts bond / fuseau / visée / mèche / traversée / couvée |
| I-02 Armer seulement dans la vue (6 px du bord) | REPRISE EN MIEUX | 72:56 (`cam.shown(…, 6)`), 72:355 `peutArmer`, appelé 72:383, 420, 518, 543, 615 | — |
| I-02 Rallonge unique de 300 ms, sinon annule et recharge | REPRISE | 72:357-361 `verifTir` (0,3 en dur ; `R.apparitions.rallonge` non lu) | lire N.R |
| I-02 Chevron de bord pendant la rallonge (flèche 7 px + mini-silhouette, 3 Hz) | ABSENTE | rien trouvé (78-hud.js ne dessine de chevron que pour les portails et les marqueurs) | le chevron d'alerte de l'attaque qui s'arme hors champ |
| I-02 Marqueurs permanents (colosse, élites, mines armées) | REPRISE EN MIEUX | 78-hud.js:250-279 (taille selon la distance 258, colosse triple 268, mine armée 271) | — |
| I-03 Familles lues à la FORME (pointes, blocs à canon, rondeurs), contour nuit | REPRISE EN MIEUX | 40-sprites.js (flèche, dard, tourelle, ruche, larve), contour NP ; 72:818-823 | test V-10 en niveaux de gris non vérifiable dans le code ; pas de formes pour tique, brouilleur, voleur, miroir (types absents) |
| I-04 Flash de coup sur la silhouette | REPRISE EN MIEUX | 72:892 (`O.inner(s)` en os) | — |
| I-04 Arc de vie pour toute cible ≥ 4 PV, sprite « fêlé » d'élite à mi-vie | PARTIELLE | 72:905-907 (arc de la RUCHE seule) ; `R.ennemis.ruche.arcPv` (R:663) non lu | arc pour tourelle, sentinelle, lame, élites ; sprite fêlé |
| I-05 Mort expliquée : « DÉTRUITE PAR … » + vague, quartier, heure | REPRISE EN MIEUX | 80-ecrans.js:299-305 ; 03-socle.js:244-262 `texte()` ; 79-jeu.js:572-577 (sous la mort) ; anneau sur le coupable 79-scene.js:253-272 | la silhouette du coupable sur l'écran de fin ; « D'ÉLITE » dans le nom |
| I-06 TÊTE mortelle, CORPS coupé (tirs, souffles, lame, traînée, convoi) | REPRISE EN MIEUX | 70-joueuse.js:326-339 (tir : tête tue, corps coupé), 72:183-187, 72:563-569, 73a:252-258 | la règle n'est pas écrite à l'écran au premier niveau (consigne R:548 non lue) |
| I-06 Queue détachée en cellules qui clignotent 3 s | REPRISE EN MIEUX | 71-butin.js:212-219 (`expireCellules` 3, une pour deux segments) | — |
| I-06 Crochet d'impact généralisé (losange 5 px, rose pâle = tête, magenta = corps) | PARTIELLE | 72:997 (losange au bout de la portée de la tourelle, pas au point d'impact) ; 72:993 (cible gelée du dard) ; `R.ennemis.tourelle.crochet` (R:653) non lu | prédiction du point d'impact sur le corps et couleur tête/corps |
| I-07 Explosion de mort d'ennemi ne blesse pas la joueuse ; mine abattue = outil | REPRISE EN MIEUX | 72:217 (`souffle(…, true)` épargne), 72:178-198 | — |
| I-07 Réaction en chaîne (mines, INSTABLE, convoi qui broie) | REPRISE EN MIEUX | 72:191-197 (le souffle blesse les ennemis, la mine tuée re-souffle), 73a:226-234 (BROYÉ ×n) | explosion de chaîne en brasier (le souffle est magenta, 72:180) |
| I-07 Défi ARTIFICIER (3 explosions en chaîne en 2 s) | ABSENTE | rien trouvé (77-score.js:126-152 ne connaît pas ce défi) | le défi |
| I-08 Butin propre à chaque type | PARTIELLE | 71-butin.js:191-203 (ordinaire 45 %, larve 20 %, élite 6 cellules + 1 noyau) ; `R.butin.largages.ruche` (R:150) non lu | gerbe de la ruche, grosse cellule jaune de l'élite, butin rendu par le voleur |

## 3. Le bestiaire (I-09 à I-19)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-09 TRAQUEUR → FLÈCHE : se fige, tremble, bondit, ligne = bond | REPRISE | 72:371-411, 72:888 (tremble), 72:990 | — |
| I-09 Image « armée » gonflée (cœur rose pâle) | PARTIELLE | sprite `fleche:armee` dessiné 40-sprites.js:1050, jamais demandé : 72:865 n'emploie que `fleche:<dir>` | brancher `fleche:armee` pendant `vise` |
| I-09 RAPIDE double le bond sans toucher l'annonce | PARTIELLE | 72:51 (RAPIDE ne touche que l'approche) ; 72:406 (vitesse de bond fixe) | le bond doublé |
| I-09 Brides de la démo levées (2 charges, rien avant 25 s) | REPRISE EN MIEUX | R:571-598 `chargesFleches` 1→4 lu en 72:48 ; premier ennemi après un virage de 45° 76:72-74, 310-314 | — |
| I-09 Ligne brûlante de 1,5 s qui coupe le corps (ENN-13) | ABSENTE | rien trouvé | le mur temporaire après le bond |
| I-10 INTERCEPTEUR → DARD : vise le point où tu vas, cible gelée, fuseau, rebond | REPRISE EN MIEUX | 72:414-441 (165 px/s × 0,5 s, rebond 435-437), sprite dard 72:868 | montrer la ligne de rebond en V (72:992 trace une droite) |
| I-11 MINE : cercle toujours affiché, mèche 0,8 s, souffle exact, tête meurt / corps coupé | REPRISE EN MIEUX | 72:490-506, 72:914 (cercle tramé violet), 72:1002-1005, 72:178-190 | — |
| I-11 Bips qui accélèrent, cœur qui bat de plus en plus vite | PARTIELLE | 72:867 `mine:alerte` (clignote à cadence fixe, 40-sprites.js:477-485) ; aucun `bip` en 72 | l'accélération (son et image) |
| I-12 ARTILLEUR → TOURELLE : ligne sur la portée réelle (160 px) | REPRISE EN MIEUX | 72:509-534, 72:994-997 (portée 160 = 95 px/s × 1,7 s) | — |
| I-12 Bande de distance en orbite | PARTIELLE | 72:100-109 (station dans une bande 120 ± 25 px, fixe, re-tirée après 3 tirs) | l'orbite vivante |
| I-12 Salve en éventail de l'élite / salve de 3 au chapitre 3 (ENN-5) | ABSENTE | rien trouvé (72:527 un seul `ebullet`) | les deux salves |
| I-12 (2975) Tourelle blindée de face | REPRISE EN MIEUX | 72:222-228, 72:237-239 (ricochet ± 45°) | — (ajout propre à 2975) |
| I-13 TRANCHEUR → LAME : recule, traverse 230 px/s, coupe au point touché, ligne = traversée | REPRISE EN MIEUX | 72:537-574, 72:999 | — |
| I-13 Récupération = vraie règle (rose pâle, dégâts × 2) | REPRISE EN MIEUX | 72:240 (`degatsRecup` 2), 72:875 (encre rose pâle) | — |
| I-13 Sprite « lames déployées » 21 px | PARTIELLE | 72:869 demande `lame:deploye`, mais 40-sprites.js:807 n'accepte que `deployee` : l'image déployée n'est jamais montrée | corriger le nom (bug) |
| I-14 PONDEUSE → RUCHE : couvée annoncée, arc de vie, garde ~90 px sans fuir | REPRISE EN MIEUX | 72:578-600 (garde 90, couvée 1,3 s, 3 larves, plafond 12), 72:905-908, 72:1006-1007 | — |
| I-14 Pétales en trois images, nichée en spirale, larves lâchées à sa mort | PARTIELLE | sprites `ruche:p0..p2` 40-sprites.js:824-826, jamais demandés (72:871 `ruche`) ; rien à la mort (72:206-220) | brancher les images ; larves et butin à la mort |
| I-15 LARVE : orbite ~30 px, mord la queue (0,5 s d'annonce), 9 px, grappes en spirale | REPRISE EN MIEUX | 72:444-480, NUÉE 76:199-202 (6 à 8 en spirale) | `R.ennemis.larve.mordDerniers` (R:644) non lu (elle mord le dernier segment) |
| I-16 PARASITE → TIQUE (s'accroche, freine le virage, mord ; écrasée par la tête) | ABSENTE | rien trouvé (absent de `N.ids.ennemis`, 03-socle.js:80) | tout l'ennemi |
| I-17 BROUILLEUR (champ qui coupe les armes, contre par le corps) | ABSENTE | rien trouvé | tout l'ennemi |
| I-18 VOLEUR (vole les cellules, fuit vers un bord visible, « BUTIN VOLÉ ») | ABSENTE | rien trouvé (`largages.vol` R:153 est le bonus du VOL) | tout l'ennemi, et le défi RIEN NE FUIT |
| I-19 MIROIR (rejoue ta trajectoire 1,5 s plus tard, serpent en négatif) | ABSENTE | rien trouvé (le RIVAL 72:653-702 est un autre serpent, pas un replay) | tout l'ennemi, et la face qui renvoie les balles |

## 4. Élites et modificateurs (I-20 à I-26)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-20 Élite : PV × 3, couronne rose pâle qui tourne, rayon + 2 | REPRISE EN MIEUX | 72:84, 72:87, 72:901-904 | — |
| I-20 Un pic connu par vague entre 55 et 75 %, bandeau du nom | REPRISE EN MIEUX | R:586, 594, 602 (t = 30 s) ; 76:251-265, 76:353 ; bandeau 76:260 | — |
| I-20 Sprite d'élite 19-21 px dessiné à la main | PARTIELLE | `fleche:elite` 40-sprites.js:1050, `ruche:elite` 03-socle.js:307 ; jamais demandés par 72:863-872 ; `R.elites.sprite` (R:686) non lu | brancher les sprites d'élite |
| I-20 Mort d'élite = grosse explosion (force > 0,6) | REPRISE EN MIEUX | 79-scene.js:114-121 (force 0,8, gel 5, onde) | — |
| I-20 Deux modificateurs pour les élites des chapitres 4-5 | ABSENTE | rien trouvé (3 élites fixes, R:688-690) | combinaisons |
| I-21 BLINDÉ : plaques sang/rose, éclatent à mi-vie, plus nerveux ensuite | REPRISE | 72:85, 72:242-244, 72:52, 72:894-896 | débris 3 s au sol et pattes × 2 (`blinde.debris`, `pattes` R:693 non lus) |
| I-22 RAPIDE : allure et recharge seulement, rémanence tramée en sang | REPRISE EN MIEUX | 72:51, 72:55, 72:889 ; 10 % en V5 76:132 | — |
| I-23 SAUTEUR (téléportation annoncée, silhouette tramée) | ABSENTE | rien trouvé (`N.ids.modificateurs` 03-socle.js:127 : blinde, rapide, instable) | le modificateur |
| I-24 INSTABLE : cœur en brasier qui bat ; mort = mine amorcée 0,8 s qui blesse ennemis et joueuse | REPRISE EN MIEUX | 72:216, 72:199-202, 72:765-768, 72:897-900, 72:1012-1016 | — |
| I-25 RÉGÉNÈRE | ABSENTE | rien trouvé | le modificateur |
| I-26 GARDE (arc de bouclier qui tourne) | ABSENTE | rien trouvé (la formation GARDE de 76:237-241 est autre chose) | le modificateur |

## 5. Les boss (I-27 à I-35, et le déroulé du climax)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-27 Boss qui ne se contourne pas (le secteur finit à sa mort) | REPRISE EN MIEUX | 79-jeu.js:238, 383 ; 73c:654-700 | — |
| I-27 Pendant le boss, plus de vagues ordinaires, seules ses invocations | REPRISE EN MIEUX | 76:300 (le directeur s'arrête hors `vague`), 76:389-394 ; invocations 73c:455-458, 309 | — |
| I-27 Enragement annoncé (« LE CYCLOPE S'EMBALLE », œil en brasier) | REPRISE EN MIEUX | 73c:608, 620-625 (`R.colosse.enrage` R:737), 73c:759 | — |
| I-27 Défi CHRONO (colosse en moins de 90 s) / prime de temps | PARTIELLE | `R.f.bonusCyclope` R:969 et `primes.cyclope.tempsRef` R:359, lus par aucun module | le défi ou la prime |
| I-28 Entrée mise en scène : ALERTE, film, panneau, arrivée de 2,2 s au tramage, invulnérable | REPRISE EN MIEUX | 79-jeu.js:253, 377-381 ; 73c:261-291, 703-709, 762-791 | — |
| I-28 Ralenti du monde au retour en jeu (× 0,3 pendant 2,2 s) | PARTIELLE | `R.scene.cyclope.ralenti` R:772 et `R.colosse.entree.ralenti` R:725 non lus ; 73c:24 renvoie à 79-scene, qui ne le fait pas (79-scene.js:196-200) | brancher le ralenti |
| I-28 Jauge nommée | REPRISE EN MIEUX | 73c:888-900 (remplissage 0,9 s, seuils 66/33 %, nom de phase) | — |
| I-28 Arrivée pilotée avec la caméra | REPRISE EN MIEUX | 12-cam.js:240-243 (mode `boss` cadre tête et œil), arène 448 × 256 73c:268-276 | — |
| I-29 Escorte par paliers → respiration de 7 s entre phases, énergie qui afflue | REPRISE EN MIEUX | 73c:610, 635-651 (`repit` 7 s, `pluie` 8), entrée de phase 2 avec MEUTE 73c:309 | — |
| I-30 Chorégraphie à la place de la laisse ; durée par phases et PV | REPRISE EN MIEUX | 73c:360-367 (dérive 14 px/s), 73c:292-319, `pvPhase` 1500 × 3 | — |
| I-31 Récompense : boss stop, explosion finale en brasier, cascade, prime 25 000 | REPRISE EN MIEUX | 73c:661 (`hitstop` 24), 73c:670-676, 905-907 ; 77-score.js:165 | — |
| I-31 Carte TROPHÉE et ouverture de la SURCHARGE | PARTIELLE | 75-cartes.js:135 gère `trophee`, mais aucun appel ne l'ouvre (80-ecrans.js:37 lit un `cur_opts.trophee` jamais posé) ; « SURCHARGE DÉBLOQUÉE » écrit en 80-ecrans.js:308 sans mode derrière | la récompense qui dure |
| I-32 PROTOTYPE ZÉRO → bonds et mines à l'atterrissage | PARTIELLE | phase 3 du CYCLOPE 73c:439-445, 553-590 (un bond annoncé 1 s, 6 mines armées) | bonds en éventail ; un boss propre au chapitre 1 |
| I-33 DOUBLE LAME → le colosse détache deux lames et les relance en ciseaux | REPRISE EN MIEUX | phase 2 73c:298-302, 423-438, 499-551 (bandes exactes, coupe le corps) | convois lancés aux croisements ; la survivante qui s'enrage |
| I-34 NOYAU MAGNÉTIQUE (ancré, polarité inversée annoncée) | ABSENTE | rien trouvé | le boss d'arène |
| I-35 SURCHARGE : boss final qui rappelle les boss précédents | PARTIELLE | les 3 phases du CYCLOPE mélangent rayon, ciseaux, bond + mines (73c:388-392) | rotation des boss et des modificateurs, finale de rappel |
| Climax 0 s : bannière, secousse, son, musique qui change | REPRISE EN MIEUX | 79-jeu.js:253, 271-273 (section `boss`), 73c:281 (`impactBoss`) | — |
| Climax 1,4 s : éclosion puis arrivée invulnérable | REPRISE EN MIEUX | 73c:249-257 (`naissance`), 73c:703-709 | — |
| Climax : ralenti × 0,3 et jauge qui se remplit | PARTIELLE | jauge 73c:891 ; ralenti non branché (voir I-28) | le ralenti |
| Climax 3,4 s : première escorte, retour des vagues ordinaires | REPRISE EN MIEUX | 73c:455-458 (FILE tous les 3 cycles, plafond 9) ; pas de vagues ordinaires (76:300) | — |
| Climax 66 % / 33 % : salves 2 et 3 | REPRISE EN MIEUX | R:726 `seuils`, 73c:610 → répit puis phase suivante | — |
| Climax 45 s : enragement | REPRISE EN MIEUX | R:737 (`apres` 100 s), 73c:608 | — |
| Climax : mort du boss → nettoyage, secteur gagné | REPRISE | 73c:686-700 (purge), 79-scene.js:102 « SECTEUR NETTOYÉ », 79-jeu.js:275-279 | — |
| Climax : soupape + 180 s sans récompense | ABSENTE | rien trouvé pour le combat (la soupape de 12 s ne vaut que pour les vagues, 76:372) | filet si le combat se bloque (73c:617 n'attaque que si l'œil est visible) |

## 6. Les niveaux (I-36 à I-51)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-36 Courbe montée → pic → respiration → apogée → purge | REPRISE EN MIEUX | 5 vagues calme/montée/montée/chaos/chaos R:567-603 ; pic 76:353 ; entrée calme de 6 s 76:322 ; nettoyage, cartes et VOL entre les vagues 79-jeu.js:242-269 ; boss ; purge | la respiration DANS la vague : `R.secteurs[0].respiration` (R:559) n'est lue par aucun module |
| I-36 Défis liés aux ennemis : ARTIFICIER, RIEN NE FUIT, MATADOR | ABSENTE | rien trouvé | les trois défis |
| I-36 Défi DÉMINEUSE (6 mines sans être touchée) | PARTIELLE | « ABATS LES 2 MINES » R:391, compté 77-score.js:171 | le défi tel qu'écrit |
| I-36 Défis de vague qui ne peuvent pas tomber | PARTIELLE | `butDe` 77-score.js:129 ignore `meute`, `delai`, `duree` : « ABATS UNE MEUTE ENTIÈRE », « FLÈCHE BLINDÉE EN 10 S », « 5 S DANS LE SILLAGE » (R:394-397) ne sont jamais tirés | mesurer ces objectifs |
| I-37 Intensité pilotée (phase + densité) → musique et décor | REPRISE | 76:403-408 (0,06 + 0,62 × progression + 0,3 × densité), 90-boot.js:362-364 ; état du décor par vague 76:75-78 ; `stinger` en fin de vague 79-scene.js:173 | changement de couche musicale à la mesure (G-31) |
| I-38 Vagues écrites en table, aléa borné | REPRISE EN MIEUX | R:567-603 (formations datées), 76:316-337 (au temps musical), 76:346-351 (remplissage) | — |
| I-38 Formations nommées annoncées 1 s avant | REPRISE EN MIEUX | 76:325-331 (`R.formations.annonce`), bannière à la 1re rencontre puis étiquette 76:328 | — |
| I-38 MEUTE (6 fonceurs en V) | REPRISE EN MIEUX | 76:192-198 | — |
| I-38 BATTERIE (3 tourelles en ligne, 0,4 s d'écart) | REPRISE EN MIEUX | 76:224-230 (`ecartTirs` lu) | — |
| I-38 CHAMP DE MINES (3 × 3 devant la tête, marqueurs 1,5 s) | REPRISE EN MIEUX | 76:203-217 (9 mines, `marqueurs` lu) | — |
| I-38 ESSAIM (une ruche et 8 larves) | REPRISE | 76:231-236 (6 larves) | — |
| I-38 RAID (2 voleurs et 1 miroir) | ABSENTE | rien trouvé (voleur et miroir absents) | la formation |
| I-38 Dernier chapitre : formations combinées deux à deux | REPRISE EN MIEUX | 76:340-344 (V5 : deux formations toutes les 5 s) | — |
| I-39 Sept motifs d'arrivée (bord, anneau, devant, flanc, grappe, voie, coin) | PARTIELLE | 76:102-113 (point hors vue au hasard), 76:166-180 (deux côtés opposés), 76:181-185 (devant, mines seules) | anneau, voie, coin, « devant » pour les fonceurs |
| I-39 Moins de naissances par le bas en portrait | REPRISE | 76:91 (`R.apparitions.portraitBas`) | — |
| I-40 Portails de 600 ms (double pour une élite) au point d'arrivée | REPRISE EN MIEUX | 76:130 (0,6 × 2 pour l'élite), 72:983-986 (anneaux qui se resserrent) | — |
| I-40 Chevron de 7 px au bord, double élite, triple colosse | REPRISE | 78-hud.js:240-248, 262-263 | triple colosse jamais vu (73c:251 crée l'œil avec `portail: 0`) |
| I-40 Mini-silhouette 5 × 5 du type dans le chevron, et tic sonore | PARTIELLE | sprites `mini:<type>` 40-sprites.js:898-905 et `R.radar.portail.mini` (R:515), lus par aucun dessin ; son `portail` seulement pour élites et traqueur (76:139, 79-scene.js:201-204) | dire QUI arrive par la forme et par le son |
| I-41 Naître hors de la vue ET de la vue anticipée (1,15 s), 70 px de la tête, 16 px des murs | REPRISE EN MIEUX | 76:85-100 | — |
| I-41 Re-vérification toutes les 4 images pendant le portail | PARTIELLE | `R.apparitions.reverifImages` (R:522) non lu | la vérification |
| I-42 Garde-fous de densité (plafond par vague, plafond dur ennemis et tirs) | REPRISE | 76:315 (plafond 10 à 32, dur 40), 72:150 (80 tirs) ; valeurs en CFG, égales à R:566 | « serpent court = clémence » des premières secondes |
| I-43 Portes d'entrée des types | REPRISE EN MIEUX | ordre des formations par vague R:571-602 (tourelles en V3, ruche, lames, sentinelle et convois en V4) ; premier ennemi après un virage 76:72-74 | — |
| I-44 Fin de vague : purge en chaîne, retardataires qui fuient, récompense, enchaînement | REPRISE EN MIEUX | 76:379-386 (`fuir`), 79-jeu.js:242-254 (purge, pluie 3 + n, cartes), 72:340-349 (45 ms), 77-score.js:207-208 (1 000 × n) | carte de résultats de 2 s (G-38) |
| I-45 Identité de secteur : quartiers nommés, palettes, plans de parallaxe | REPRISE EN MIEUX | 15-decor.js:1-34, 456 ; quartier posé par vague 76:75-78 ; R:482-486 | — |
| I-45 Consigne de secteur au briefing | PARTIELLE | `R.secteurs[0].consigne` (R:548) lue par aucun module ; le briefing dit autre chose (60-intro.js:52) | afficher la consigne |
| I-46 LA GRILLE (chapitre 1) avec respiration, pic, MEUTE, CHAMP DE MINES | REPRISE EN MIEUX | R:546-608, 76 en entier | respiration interne (voir I-36) |
| I-47 AUTOROUTE : voies et convois annoncés 1,5 s (hachures, cône de phares, chevron, klaxon) | REPRISE EN MIEUX | 73a:194-203, 422-453 ; V4 et V5 seulement, R:593, 601 | voies de 20 px et non 48 px ; un chapitre entier |
| I-47 Le convoi broie les ennemis ; tue la tête, coupe le corps une fois | REPRISE EN MIEUX | 73a:250-267, 226-234 | — |
| I-47 SILLAGE (× 1,4 gratuit, ennemis broyés comptent double) | REPRISE EN MIEUX | 73a:219-224, 273-281, 231 | + 0,5 au multiplicateur toutes les 2 s |
| I-48 ZONE MAGNÉTIQUE (attracteurs, répulseurs, capture, fronde) | ABSENTE | rien trouvé | toute la règle d'arène |
| I-49 SURCHARGE : carrefour, nœuds, palettes tournantes, mode sans fin | PARTIELLE | seul `R.surcharge` (R:841) existe, lu par aucun module | tout le mode |
| I-50 Décor qui suit l'intensité, en plans de parallaxe | REPRISE EN MIEUX | 15-decor.js:12-34 (P0 à P6, sol), états calme/montée/chaos 15-decor.js:140-146 ; impulsions selon la tension 79-jeu.js:493-503 | — |
| I-51 Vignette de danger en périphérie | PARTIELLE | 79-scene.js:286-297 (près du mur seulement, 1,2 Hz) ; coup et coupe 79-scene.js:136, 144 | pendant le boss, à l'approche d'un convoi, au dernier avertissement |

## 7. Difficulté et progression (I-52 à I-55)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-52 La pression par la densité et la cadence, sans sélecteur de cran | REPRISE EN MIEUX | plafonds et quotas croissants R:570-598 ; vitesse de la tête 68 → 84 (R:68) ; approche des flèches 50 → 70 (72:373) | — |
| I-53 Pas d'inflation des PV ; types plus retors, formations, tête mortelle | REPRISE EN MIEUX | PV fixes par type R:632-680 ; formations 76:188-248 | modificateurs combinés aux chapitres 4-5 |
| I-54 Cycles de surcharge (cadence, plafonds, boss de plus) | PARTIELLE | `R.surcharge` { vitesse 1,12, densité 1,3 } (R:841) lu par aucun module | les cycles |
| I-55 Score indexé sur les modificateurs choisis | PARTIELLE | `R.surcharge.score` 1,5 (R:841) lu par aucun module | le multiplicateur de score du mode |

## 8. Idées hors des deux fichiers, ou jamais codées (I-56 à I-59)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| I-56 CORPS-MUR (le corps tue l'ennemi qui le percute) | PARTIELLE | seul le RIVAL meurt sur le corps (72:696-701, prime CRASH) | l'événement pour tous les ennemis |
| I-57 Événements d'arène annoncés 2 s, de 12 à 18 s | PARTIELLE | les seuls « événements » sont le TRAVELLING (73a:98-142, annoncé 2 s), les convois et l'INVERSION (72:291-314) | aucun des cinq événements de 2030 |
| I-57 COUPURE | ABSENTE | rien trouvé | — |
| I-57 CONTRESENS | ABSENTE | rien trouvé | — |
| I-57 INVERSION de polarité | ABSENTE | rien trouvé (l'INVERSION de 2975 retourne la chasse, autre idée) | — |
| I-57 GRAVITÉ | ABSENTE | rien trouvé | — |
| I-57 PLUIE DE MINES | PARTIELLE | CHAMP DE MINES 76:203-217 (9 mines, marqueurs 1,5 s) ; mines du colosse 73c:586-589 | 12 mines autour de la tête comme événement |
| I-58 Codex de première rencontre (ralenti, silhouette, règle en une ligne) | PARTIELLE | textes `codex` par type R:636-681 et `R.ennemis.codex` (R:631) lus par aucun module ; `N.hud.codex` 78-hud.js:54 jamais appelé ; `profil.codex` 77-score.js:32 jamais rempli ; seuls des conseils après la mort 77-score.js:238 | la carte de codex |
| I-58 Bestiaire consultable et reliques de boss | ABSENTE | rien trouvé | — |
| I-59 SENTINELLE tournante (faisceau à 360° en 6 s) | ABSENTE | rien trouvé (la SENTINELLE de 72:605-629 est le tireur d'élite de la démo, gardé) | la tour tournante |
| I-59 FAUCHEUR (suit le chemin jusqu'à la queue) | ABSENTE | rien trouvé | — |
| I-59 Modificateur MAGNÉTIQUE | ABSENTE | rien trouvé | — |
| I-59 Modificateur SPECTRAL | ABSENTE | rien trouvé | — |
| I-59 Rééquilibrage (aucun type > 25 %) | PARTIELLE | aucune mesure ; la FILE de flèches remplit V1 et V3 (R:572, 585) | mesure et règle |

## Tableaux de vagues des secteurs 2030 (une ligne par phase)

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| Durées de phases, secteur 1 (98 s) | REPRISE | 5 vagues de 22 à 50 s (R:570-598), 206 s de vagues + boss de 55 à 90 s (R:553) | — |
| Durées de phases, secteurs 2, 3, 4+ | ABSENTE | un seul secteur (R:546-608) | — |
| LA GRILLE calme (traqueurs au bord, 1 mine devant) | REPRISE | V1 : FILE à 0 et 5 s, DUO DE MINES à 14 s (R:571) | — |
| LA GRILLE montée (traqueurs, flanc, mines, 1 artilleur) | REPRISE EN MIEUX | V2 MEUTE ×3, CHAMP DE MINES ×2, PINCE ×3 (R:577-578) ; tourelles en V3 | — |
| LA GRILLE déferlante (anneau de traqueurs, intercepteurs, artilleurs, grappe de mines, élite) | PARTIELLE | V3 BATTERIE, PINCE, pic FLÈCHE BLINDÉE + MEUTE (R:584-586) | le motif en anneau |
| LA GRILLE apogée | REPRISE | V5 mélange (R:599) | — |
| AUTOROUTE (traqueurs et intercepteurs en voie, trancheurs, voleur, RAPIDE / INSTABLE) | PARTIELLE | dards (PINCE), lames (DUEL), RAPIDE 10 % et RUCHE INSTABLE en V5 (R:599-602) | motif `voie`, voleur |
| ZONE MAGNÉTIQUE (parasites, miroir, brouilleur, larves en grappe) | PARTIELLE | seules les larves (NUÉE, ESSAIM) existent | parasite, miroir, brouilleur, GARDE, SAUTEUR, RÉGÉNÈRE |
| SURCHARGE (tout, élites de 8 à 14 %) | PARTIELLE | V5 mélange tout ce qui existe (76:340-344) | pondeuse + voleur, miroir + brouilleur, cycles |

## Section 9 : échelle, palette, téléphone, chapitres

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| 9.1 Monde d'environ 2 × 2,7 écrans | REPRISE | R:41-42 (1 024 × 512, environ 2,4 × 2,6 écrans) | — |
| 9.1 Portée de bond 66 px | REPRISE | R:633 (distance 40 à 110 px) | portée plus longue que proposé |
| 9.1 Vitesse de bond 93 px/s | REPRISE | R:634 (160 px/s, la valeur de la démo, plus nerveuse) | — |
| 9.1 Fuseau 154 px/s | REPRISE | R:640 (165 px/s) | — |
| 9.1 Traversée 230 px/s | REPRISE EN MIEUX | R:658 (230 px/s) | — |
| 9.1 Cercle / souffle de mine 43 / 45 px | REPRISE | R:648 (34 / 30 px) | plus petits que proposé |
| 9.1 Bande de l'artilleur 129 ± 29 px | REPRISE | R:652 (120 ± 25 px) | — |
| 9.1 Portée et vitesse de balle 163 px, 98 px/s | REPRISE | R:653 (160 px, 95 px/s) | — |
| 9.1 Larve 57 px/s | REPRISE | R:644 (zigzag 55) | — |
| 9.1 Parasite, voleur, miroir ; champ du brouilleur ; nœuds | ABSENTE | types et règle absents | — |
| 9.1 Distance gardée par la pondeuse 139 px (80 proposés) | REPRISE EN MIEUX | R:662 (garde 90) | — |
| 9.1 Hauteur de voie 48 px ; convois 92 à 141 px/s | REPRISE | R:705-706 (20 px, 240 px/s) | voies plus étroites et convois plus rapides que proposé |
| 9.2 Palette fermée : danger en magenta, rose pâle, sang, gainé de nuit | REPRISE EN MIEUX | 72:808 (palette par N.outils), télégraphes 72:948-1018 | — |
| 9.3 Un pouce, tir automatique, contres par le déplacement | REPRISE EN MIEUX | lame vulnérable en récupération, tourelle prise de côté, larves qui viennent à la queue | — |
| 9.3 Les voies suivent le grand axe de l'écran en portrait | ABSENTE | voies toujours horizontales (R:705) | — |
| 9.3 Jouable sans le son (cœur de mine, chevrons) | REPRISE | 72:867, 78-hud.js:262-263 | — |
| 9.4 Chapitre 1 Amorçage | REPRISE EN MIEUX | le secteur actuel (flèche, larves, mines, BLINDÉ, MEUTE, CHAMP DE MINES) | boss propre au chapitre |
| 9.4 Chapitre 2 Trafic | PARTIELLE | convois, sillage, dard, lame, RAPIDE, INSTABLE, ciseaux du colosse, fondus dans les vagues 4-5 | voleur, RAID, un chapitre à part |
| 9.4 Chapitre 3 Pare-feu | PARTIELLE | seulement la tourelle et la BATTERIE | zone magnétique, tique, brouilleur, GARDE, RÉGÉNÈRE, NOYAU |
| 9.4 Chapitre 4 Surtension | PARTIELLE | ruche, sentinelle, ESSAIM | carrefour, événements, tour tournante, SAUTEUR, boss SURCHARGE |
| 9.4 Chapitre 5 Noyau | PARTIELLE | formations combinées (V5), CYCLOPE en 3 phases | miroir, faucheur, couples de modificateurs, finale qui rappelle les 4 boss |

## Annexe A : défauts de 2030 à ne pas reproduire

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| A-1 Alerte rouge inversée | REPRISE EN MIEUX (évité) | 72:951 (bascule sur le temps RESTANT) | — |
| A-2 Liseré d'enragement hors de place, en blanc pur | REPRISE EN MIEUX (évité) | 73c:759 (l'œil passe en brasier), jauge 73c:895 | — |
| A-3 Marqueur du SAUTEUR tourné | sans objet | SAUTEUR absent | — |
| A-4 Annonces raccourcies par RAPIDE | REPRISE EN MIEUX (évité) | 72:55 | — |
| A-5 Ligne de bond trompeuse | REPRISE EN MIEUX (évité) | 72:990 (67 px = bond réel) | — |
| A-6 Annonce des convois jamais écrite | REPRISE EN MIEUX (évité) | 73a:194-203, 239-241 (1,5 s) | — |
| A-7 Promesse du miroir | sans objet | miroir absent | — |
| A-8 Souffles hors du directeur | REPRISE EN MIEUX (évité) | pas d'inflation : souffle = tête tuée ou corps coupé, comme tout le reste (72:183-187) | — |

## Bugs et fils pendants relevés en chemin

- `72-ennemis.js:869` demande le sprite `lame:deploye` ; `40-sprites.js:807` n'accepte que `deployee` : la lame
  ne montre jamais ses lames déployées pendant le recul et la traversée.
- Sprites dessinés mais jamais demandés par `72-ennemis.js` : `fleche:armee`, `fleche:elite`, `ruche:p1`, `ruche:p2`,
  `ruche:elite`, `mini:<type>`.
- Chiffres de N.R lus par aucun module : `secteurs[0].respiration`, `secteurs[0].consigne`, `ennemis.codex` et
  les textes `codex` de chaque type, `ennemis.tourelle.crochet`, `ennemis.larve.mordDerniers`, `ennemis.ruche.arcPv`,
  `elites.sprite`, `modificateurs.blinde.debris` et `pattes`, `butin.largages.ruche`, `radar.portail.mini`,
  `apparitions.reverifImages`, `scene.cyclope.ralenti`, `colosse.entree.ralenti`, `surcharge`, `f.bonusCyclope`.
- Trois défis de vague ne peuvent jamais être tirés (`77-score.js:129`) : « ABATS UNE MEUTE ENTIÈRE »,
  « FLÈCHE BLINDÉE EN 10 S », « 5 S DANS LE SILLAGE ».

## Décompte

| statut | lignes |
|---|---|
| REPRISE EN MIEUX | 73 (dont 6 défauts de 2030 évités, annexe A) |
| REPRISE | 22 |
| PARTIELLE | 40 |
| ABSENTE | 29 |
| sans objet | 2 |
| **total** | **166** |

Sur les 59 fiches seules (I-01 à I-59, ligne principale de chaque fiche) : la plupart des fiches de règles
transversales, de boss et de niveaux sont reprises ; les fiches absentes sont I-16 tique, I-17 brouilleur,
I-18 voleur, I-19 miroir, I-23 sauteur, I-25 régénère, I-26 garde, I-34 noyau magnétique, I-48 zone magnétique.

## Les 10 manques les plus importants pour l'expérience de jeu, classés

1. **Les ennemis qui jouent avec ce qu'est un serpent** : TIQUE (s'accroche au corps et freine le virage),
   VOLEUR (prend les cellules), MIROIR (rejoue ta trajectoire), BROUILLEUR (coupe les armes), FAUCHEUR. C'était
   le meilleur de 2030 et le premier remède à « basique » ; aucun n'existe.
2. **Un seul secteur** : pas de chapitres 2 à 5 avec leur propre règle d'arène (ZONE MAGNÉTIQUE avec capture et
   fronde, carrefour) ni leur boss (NOYAU MAGNÉTIQUE, SURCHARGE). Convois et sillage sont réduits à un événement
   des vagues 4 et 5.
3. **Le mode SURCHARGE n'existe pas**, alors que l'écran de victoire annonce « SURCHARGE DÉBLOQUÉE » ; `R.surcharge`
   n'est lu par aucun module. Il n'y a pas de rejouabilité après la victoire.
4. **Aucun événement d'arène** de 2030 (COUPURE, PLUIE DE MINES, GRAVITÉ, CONTRESENS) : le niveau ne change jamais
   de règle en cours de partie.
5. **Peu de variété par combinaison** : 3 modificateurs sur 6 (pas de SAUTEUR, GARDE, RÉGÉNÈRE), 3 élites fixes,
   sprites d'élite dessinés mais non branchés.
6. **Le crochet d'impact tête/corps manque** : avec une vraie mort (TÊTE mortelle, CORPS coupé, déjà en place), rien
   ne dit à l'avance si un tir touchera la tête ou le corps. `R.ennemis.tourelle.crochet` n'est pas lu.
7. **Des postures armées dessinées mais invisibles** : flèche gonflée (`fleche:armee`), lames déployées (bug de nom
   `lame:deploye`), pétales de ruche. Ce sont des télégraphes lisibles même sans la ligne.
8. **Pas de codex de première rencontre** : les règles en une ligne existent dans N.R et `N.hud.codex` existe,
   mais personne ne les appelle. On apprend un ennemi en mourant, par le conseil de fin de partie.
9. **La récompense de boss qui dure manque** : pas de ralenti à l'arrivée (chiffres de N.R non lus), pas de carte
   trophée (option prévue, jamais ouverte), pas de prime ni de défi CHRONO (`R.f.bonusCyclope` non lu).
10. **On ne sait pas qui arrive ni d'où, et le rythme interne manque de creux** : les portails n'ont ni
    mini-silhouette ni tic sonore pour les ennemis ordinaires, il manque les motifs anneau, voie et devant, la
    respiration interne aux vagues (`R.secteurs[0].respiration`) n'est pas lue, et les défis liés aux ennemis
    (ARTIFICIER, MATADOR, RIEN NE FUIT) n'existent pas.

---

# Couverture SNAKE 2030 → SNAKE 2975 : armes, améliorations, cartes, passifs, pouvoirs, progression

Source des idées : `proto-neon/refonte/inventaire-armes-ameliorations.md` (§ 2 à 11), une ligne par fiche ou par
ligne de tableau. Code vérifié : `proto-neon/src/*.js` à HEAD (d812b48), arbre de travail propre. Une règle de
`02-regles.js` n'est comptée « présente » que si un module exécuté la lit (grep des lecteurs fait carte par carte).
Les cartes d'arme du § 6 (ARC, CANON, TOURELLES, MISSILES, MINES, DRONES, SILLAGE, ONDE) sont comptées une seule fois,
dans les lignes A1 à A8. Les défauts de 2030 (bogues, anti-synergies) ne sont pas des idées : ils ne sont pas comptés.

**Décompte : 97 idées. REPRISE EN MIEUX 26 · REPRISE 11 · PARTIELLE 19 · ABSENTE 41.**

Fait marquant : six cartes du vivier actuel (BOUCLIER, RÉPARATION, ÉPERON, GRAPPE, BRAISE, et le choix de pouvoir
RALENTI / REPLI) se tirent, s'affichent avec un chiffre calculé, et **ne font rien** : `N.cartes.mods.bouclier`,
`.reparation`, `.eperon`, `.grappe`, `.braise` ne sont lus par aucun module (seuls `degats`, `cadence`, `aimant`,
`lenMax` et `sangFroid` le sont : 74-arsenal.js:38, 41 ; 71-butin.js:31 ; 70-joueuse.js:86 ; 77-score.js:189), et
`N.joueuse.equiper()` (70-joueuse.js:429) n'est appelé nulle part. Les essais (`tools/contrat/tests.js:650-652`)
vérifient les chiffres de N.R, pas leurs effets.

## Le tableau

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| **§ 2 Le socle** | | | |
| S1 Arsenal automatique à rôles spatiaux | PARTIELLE | 74-arsenal.js:342-349 ; 02-regles.js:222-282 | 6 armes sur 8 (ni SILLAGE-arme ni ONDE) ; la zone d'une arme n'est jamais montrée quand on la prend |
| S2 Paliers qui changent la forme, ULTIME, « un palier = une ligne » | REPRISE EN MIEUX | 02-regles.js:209-281 (4 paliers) ; 74-arsenal.js:36 | l'ULTIME n'est ni fêté (aucun `onCarte` dans 79-scene.js:308-310) ni annoncé (« ENCORE 1 → RAYON » : `t.ultime` jamais dessiné, 80-ecrans.js:201-235) |
| S3 PUISSANCE (dégâts de toutes les armes) | REPRISE EN MIEUX | 75-cartes.js:43, 204 ; 74-arsenal.js:37-40 | — (+25 % par prise, texte calculé) |
| S3 CADENCE | REPRISE EN MIEUX | 75-cartes.js:44, 206 ; 74-arsenal.js:113, 169, 266 | sans effet sur ARC, MISSILES et MINES (périodes fixes) ; le texte calcule la cadence du palier de carte, pas du palier réel |
| S3 POINT FAIBLE (critique) | ABSENTE | rien trouvé | — |
| S3 PORTÉE | ABSENTE | rien trouvé | — |
| S3 ACCÉLÉRATEUR (vitesse des tirs) | ABSENTE | rien trouvé | — |
| S3 PERFORATION (carte transversale) | ABSENTE | seule la lance du CANON III perce (02-regles.js:227 ; 74-arsenal.js:122-123, 363) | la carte, pourtant dans les « passifs à garder » |
| S3 OGIVE (souffle sur les balles) | ABSENTE | rien trouvé | — |
| S3 PRISME (ricochet) | ABSENTE | rien trouvé | — |
| S3 Texte de carte calculé depuis ses chiffres | REPRISE EN MIEUX | 75-cartes.js:176-237 | mais 5 passifs et 2 pouvoirs affichent un chiffre qu'aucun code n'applique |
| S4 Visée par le cap, les autres armes choisissent leur cible | REPRISE | 74-arsenal.js:77-86, 108 | aide de visée ±10° du canon absente ; `viseeDeg: 25` des tourelles non lu (code : ±90°, 74-arsenal.js:164) |
| S5 BROUILLEUR qui fait taire l'arsenal | ABSENTE | rien trouvé (grep « brouill » : seulement le brouillard du décor) | l'ennemi entier |
| S6 Réservoirs fixes et plafonds | REPRISE | 74-arsenal.js:17, 88 (160 tirs), 186 (24 arcs), 218 (24 missiles), 293 (12 mines) | un objet neuf par tir (`tirs.push({...})`, l. 89) : pas de préallocation |
| S7 Arsenal en cyan / cyan pâle, os à l'impact | REPRISE EN MIEUX | 74-arsenal.js:372-445 | les tirs de canon à 20 dégâts ou plus (atteints avec PUISSANCE) passent en ambre / jaune, couleurs du butin (l. 89, 418) |
| **§ 3 Les armes** | | | |
| A1 CANON à 4 paliers (2 bouches, lances perçantes, RAYON) | REPRISE | 02-regles.js:222-230 ; 74-arsenal.js:103-127 | le palier suit la LONGUEUR plus les cartes (l. 43-49) : CANON II dès 10 segments sans carte, une coupe fait perdre des paliers ; ULTIME ≈ ×1,1 du III sur cible unique (210 contre 192 DPS) au lieu de ×1,5 (`ultimeSurCyclope` non lu) |
| A1 RAYON qui traverse et efface les tirs | REPRISE EN MIEUX | 74-arsenal.js:129-147, 428-433 | — (ligne de 3 px, paquets d'os, départ à 7 px) |
| A2 TOURELLES suivant la longueur, deux flancs dès I, 16 au plus | REPRISE | 74-arsenal.js:150-172, 372-382 ; 02-regles.js:234-239 | canon dessiné selon le flanc, pas vers la cible ; BORDÉE ≈ ×1,2 du III ; pas de débris quand la coupe emporte des modules ; pas de lumière qui court |
| A2 Éclats de flak | REPRISE | 74-arsenal.js:168, 362 | `degatsEclat` de N.R non lu (4 en dur) |
| A3 SILLAGE : traînée de queue qui blesse | ABSENTE | la traînée ne sert qu'au lasso (70-joueuse.js:525-555, 693-700) | aucune trace brûlante (voir BRAISE) |
| A3 LASSO / ENCERCLÉ, verbe central, fermé par la tête | REPRISE EN MIEUX | 70-joueuse.js:525-585 ; 02-regles.js:324-337 ; annonce l. 548-553, 702 ; flashGate l. 578 | rien d'essentiel (BRAISE ne le renforce pas) |
| A3 MUR DE PLASMA (ULTIME du sillage) | ABSENTE | rien trouvé | — |
| A4 ARC (3 sauts, nœud d'os, queue en ORAGE, paralysie) | REPRISE EN MIEUX | 74-arsenal.js:175-200, 393-401 ; 72-ennemis.js:353, 728 | le son ne monte pas d'un degré par saut ; la paralysie ne clignote pas ; ULTIME ≈ ×27 du départ, pas ×6 |
| A5 MISSILES (2 dès I, priorité aux élites) | REPRISE EN MIEUX | 74-arsenal.js:203-249 ; 02-regles.js:253 | verrouillage dessiné seulement à la NUÉE (l. 425) ; pas de traînée ; son `salve` partagé |
| A6 DRONES (interception dès II, filin, ANNEAU) | REPRISE EN MIEUX | 74-arsenal.js:253-287, 434-445 | œil fixe, interception en étincelle et non en anneau d'os |
| A7 ONDE DE CHOC | ABSENTE | rien trouvé (absente de N.ids.armes, 03-socle.js:83) | impulsion, tirs effacés → cellules, télégraphe sur la mesure |
| A8 MINES DE QUEUE (losange cyan, cœur à 2 Hz, sous-charges, SINGULARITÉ) | REPRISE EN MIEUX | 74-arsenal.js:290-333, 407-413 | cercle de déclenchement non dessiné, aucun son de pose, ni aimant ni cratère |
| **§ 4 Côte à côte** | | | |
| Échelle de PV × 10 | REPRISE EN MIEUX | 02-regles.js:207, 633 (FLÈCHE 20 PV) | — |
| Ennemis qui durcissent avec l'arsenal | PARTIELLE | 02-regles.js:568-603 (vitesse, plafond par vague), 686 (élites × 3) | aucune pente de PV par vague |
| **§ 5 Le tirage** | | | |
| C1 Montée de niveau mise en scène | REPRISE | 79-scene.js:162-167 ; 78-hud.js:312 | onde jaune au lieu du pouls queue → tête ; l'écran attend la fin de vague |
| C2 « CHOISIS n » : aucune montée perdue | REPRISE EN MIEUX | 75-cartes.js:128-130 ; 80-ecrans.js:78-84, 240 | trois au plus ; un écran par vague même sans montée |
| C3 Poids qui évoluent (arme neuve, appel de l'ULTIME, prérequis) | PARTIELLE | 75-cartes.js:108-113 (rareté et école seulement) | ni l'appel de l'ULTIME ni aucun prérequis |
| C4 Pondérer POUR l'école (× 1,7 / × 0,6) | REPRISE EN MIEUX | 75-cartes.js:110-111 ; 02-regles.js:166-170 | — |
| C5 Première main protectrice (arme, pouvoir, survie) | REPRISE | 75-cartes.js:140-145 ; 02-regles.js:172 | 2 des 3 cartes de survie (BOUCLIER, RÉPARATION) n'ont aucun effet ; première carte après la vague 1 (≈ 24 s) |
| C6 Main de trophée | PARTIELLE | 75-cartes.js:135-139 | personne ne passe `trophee` : 79-jeu.js:130 ouvre « cartes » sans options |
| C7 Pitié de rareté | REPRISE EN MIEUX | 75-cartes.js:146-156 ; 02-regles.js:171 | pas de quatrième case grisée (prochaine carte verrouillée) |
| C7 ORACLE | ABSENTE | rien trouvé | — (remplacé par la pitié) |
| C8 Écran de cartes : encre et crans, garde, pouce | REPRISE EN MIEUX | 80-ecrans.js:74-89, 94, 213-218 | nom de l'ULTIME non écrit ; choix « dans le monde » non tenté |
| **§ 6 Les cartes non-armes** | | | |
| CONDUCTEURS | ABSENTE | rien trouvé | — |
| SURTENSION | ABSENTE | rien trouvé | prévue dans les « passifs à garder » |
| IONISATION | ABSENTE | rien trouvé | — |
| DÉTONATION / GRAPPE (toute mort explose) | PARTIELLE | 02-regles.js:194, 294 ; 75-cartes.js:51, 214 ; aucun lecteur de `mods.grappe` | carte épique tirable qui n'explose rien |
| CHAMP TESLA (aura) | ABSENTE | rien trouvé | — (l'ORAGE en tient lieu) |
| CAPACITEUR | ABSENTE | rien trouvé | — |
| BORDÉE ARRIÈRE | ABSENTE | rien trouvé | — |
| CHARGE CREUSE | ABSENTE | rien trouvé | — |
| RÉACTION (cascade) | ABSENTE | `grappe.generations: 2` (02-regles.js:294) lu par personne | — |
| NAPALM | ABSENTE | rien trouvé | — |
| SINGULARITÉ | REPRISE EN MIEUX | 74-arsenal.js:304-313 (ULTIME des mines) | ce n'est plus une carte de mort |
| PROPULSEURS | ABSENTE | rien trouvé | — |
| AGILITÉ | ABSENTE | rien trouvé | — |
| RÉSERVE (boost) | ABSENTE | rien trouvé | — |
| POSTCOMBUSTION | ABSENTE | rien trouvé | — |
| ÉPERON | PARTIELLE | 02-regles.js:193, 293 ; 75-cartes.js:50, 213 ; aucun lecteur de `mods.eperon` | percuter en accélération ne blesse rien |
| INERTIE | ABSENTE | rien trouvé | — |
| BRAISE (≈ SILLAGE / PLASMA ÉPAIS) | PARTIELLE | 02-regles.js:196, 296, 325, 330 ; `R.f.traine` et `R.f.degatsLasso` appelés avec braise = 0 (70-joueuse.js:529, 558, 694) | ni les 20 dég/s, ni +0,4 s de traînée, ni lasso × 1,5 |
| MUR DU SON | ABSENTE | rien trouvé | — |
| CROISSANCE | REPRISE EN MIEUX | 70-joueuse.js:247-249 ; 75-cartes.js:47, 208-210 | `passifs.croissance.segments` (4) contredit `longueur.parCroissance` (5), seul appliqué |
| BOUCLIER | PARTIELLE | 02-regles.js:192, 292 ; 75-cartes.js:49, 212 ; `couper()` ne le consulte pas (70-joueuse.js:187-205) | « ABSORBE UN COUP » : aucun coup absorbé |
| RÉPARATION | PARTIELLE | 02-regles.js:191, 291 ; 75-cartes.js:48, 211 ; aucun lecteur de `mods.reparation` | « +1 SEGMENT TOUTES LES 6 S » jamais appliqué |
| ÉPINES | ABSENTE | rien trouvé | prévue dans les « passifs à garder » |
| NANITES | ABSENTE | rien trouvé (proche : la coupe lâche une cellule pour deux segments, 71-butin.js:212-220) | — |
| AMORTISSEURS (répit après un coup) | ABSENTE | `st.invul` n'est posé qu'à la réapparition (70-joueuse.js:770) | une coupe n'ouvre aucun répit : coupes en rafale possibles |
| CITADELLE | ABSENTE | rien trouvé | — |
| PHASE (traversée plus longue) | ABSENTE | rien trouvé | — |
| DÉSYNCHRO / DÉPHASAGE | ABSENTE | rien trouvé | — |
| DILATATION | ABSENTE | rien trouvé | — |
| TIRS SPECTRAUX | ABSENTE | (missiles et mines ignorent déjà le blindage, 72-ennemis.js:223) | — |
| MARCHE DU VIDE | ABSENTE | rien trouvé | — |
| ANALYSE (XP) | ABSENTE | rien trouvé | — |
| RÉACTEUR (ultime) | ABSENTE | rien trouvé | — |
| AIMANT | REPRISE EN MIEUX | 71-butin.js:30-33 ; 75-cartes.js:45-46, 207 | — |
| SANG-FROID | REPRISE | 77-score.js:189 | — |
| Vivier honnête et vérifié carte par carte | PARTIELLE | tools/contrat/tests.js:650-652 (chiffres seulement) | 7 cartes sur 19 sans effet ; aucun essai d'effet |
| **§ 7 Synergies** | | | |
| Y1 Morts en chaîne | ABSENTE | aucune mort n'explose (sauf la RUCHE INSTABLE ennemie, 72-ennemis.js:216) | le grand spectacle d'explosions |
| Y2 Le corps lame | PARTIELLE | tourelles (74-arsenal.js:150-172) | ÉPINES, ÉCAILLES |
| Y3 Le bolide | PARTIELLE | boost (70-joueuse.js:365-400) | ÉPERON sans effet, aucune carte de vitesse |
| Y4 L'orage | PARTIELLE | ARC et ORAGE (74-arsenal.js:175-200) | SURTENSION, aura |
| Y5 La forteresse mobile | PARTIELLE | interception (74-arsenal.js:269-274), RAYON qui efface | BOUCLIER sans effet, ONDE absente |
| Écoles nommées | PARTIELLE | 77-score.js:226-236 ; 80-ecrans.js:327-336 (écran de fin) | jamais annoncée en partie ; l'école LASSO n'est jamais attribuée (`lassoPart = 0`, 77-score.js:234) |
| Évolutions à deux clés | ABSENTE | rien trouvé | — |
| **§ 8 Pouvoirs, boost, ultime** | | | |
| P1 Boost sans bouton, jauge en arc | REPRISE EN MIEUX | 70-joueuse.js:365-400, 712-716 ; 02-regles.js:72-93 | — |
| P2 TRAVERSÉE | REPRISE EN MIEUX | 70-joueuse.js:52, 189, 434-438 ; 90-boot.js:270 (toucher bref) | — |
| P2 RALENTI et REPLI devenus des cartes | PARTIELLE | effets codés 70-joueuse.js:439-442 ; `equiper()` (l. 429) appelé par personne ; 75-cartes.js:170 note seulement `m.pouvoir` | la carte prise ne change pas le pouvoir : TRAVERSÉE reste |
| P3 APOGÉE (6 anneaux, gel, glissé, mode auto) | REPRISE | 70-joueuse.js:466-506 ; 90-boot.js:243 | ni limite d'une par 45 s ni style d'école |
| Ultime au style de l'école | ABSENTE | rien trouvé | — |
| **§ 9 Économie** | | | |
| E1 Butin : cellule ambre qui donne l'XP, noyau jaune, fusion, expiration | REPRISE EN MIEUX | 02-regles.js:139-155 ; 71-butin.js:110-135, 193-195 ; 75-cartes.js:241-244 | — |
| E2 Expérience | REPRISE | 02-regles.js:156 ; 75-cartes.js:63-72 | les cartes suivent les vagues (4 écrans) ; l'XP n'ajoute que des choix |
| E3 Multiplicateur de chaîne | REPRISE EN MIEUX | 77-score.js:2-5, 189 ; 02-regles.js:340-342 | — |
| E4 Une monnaie persistante (énergie) | REPRISE | 77-score.js:256-262 | aucun plafond par partie |
| **§ 10 Progression** | | | |
| M1 Déblocages de contenu | PARTIELLE | 02-regles.js:836-839 ; 75-cartes.js:87-97 | RALENTI et REPLI débloqués mais inéquipables ; `styles`, `galerie`, `departV3` lus par personne ; pas d'arme de départ au choix |
| M1 Six bonus achetables de 2030 | ABSENTE | rien trouvé | — (abandon voulu) |
| M2 Écran de fin qui explique | REPRISE EN MIEUX | 80-ecrans.js:282-345 ; 77-score.js:245-275 | pas de silhouette du serpent avec ses modules |
| **§ 11 Contraintes** | | | |
| Petites explosions d'arme sous le limiteur de flashs | REPRISE EN MIEUX | 74-arsenal.js:244, 332 (force 0,28 et 0,3) ; 70-joueuse.js:578 | — |
| Gel d'image réservé aux gros moments | PARTIELLE | 02-regles.js:761 ; 79-scene.js:124 | le gel de 2 images par kill ordinaire reste |
| Sons propres à l'arsenal | PARTIELLE | 74-arsenal.js:93, 126, 199, 226 (`tir` et `salve` partagés) | pas de son d'arc, de missile, de mine ni de rayon |
| Propriétaires `N.arsenal` et `N.cartes` | REPRISE EN MIEUX | 74-arsenal.js:13 ; 75-cartes.js:23 | — |

## Bonus perdus quand on est touché : protéger (bouclier) ou régénérer (régénérateurs)

**Ce que la joueuse perd aujourd'hui (2975).** Une coupe (tir, souffle, traînée, morsure) raccourcit le serpent
(70-joueuse.js:187-205) : donc des **tourelles** (leur nombre suit la longueur, 74-arsenal.js:151) et des **paliers
de CANON** (le palier suit la longueur, 74-arsenal.js:43-49), et la chaîne est divisée par deux (77-score.js:189).
Une mort retire **un palier à la meilleure arme** (74-arsenal.js:58-68, 450 ; « CANON III → II », 79-jeu.js:311-312)
et la réapparition se fait à la moitié de la longueur. Ce retrait de palier n'existait pas dans 2030. Autre
problème : `N.cartes` ne sait pas que l'arme a perdu un palier (ses `prises` ne bougent pas), donc le texte de la
carte suivante ne correspond plus au palier réel.

**Ce qui protège déjà, et marche :** SANG-FROID (la chaîne n'est pas divisée), TRAVERSÉE et REPLI (rien ne coupe
pendant qu'ils durent, 70-joueuse.js:189, mais seule TRAVERSÉE peut être équipée), l'interception des DRONES, le
RAYON, le LASSO et l'APOGÉE qui effacent les tirs, et l'invulnérabilité d'une seconde à la réapparition.
**Régénérateur de fait :** les segments coupés tombent en cellules (une pour deux segments) qui durent 3 s et se
ramassent (71-butin.js:212-220).

**Ce que 2030 avait de proche :**
- *Protéger* : **BOUCLIER** (des charges qui absorbent un coup entier de 3 segments ou moins, puis reviennent toutes
  les 9 / 7 / 5,2 s, avec 400 ms d'invulnérabilité), **CITADELLE** (aucun coup ne coûte plus d'un segment),
  **PARE-CHOCS** (une charge de bouclier dès le départ), **AMORTISSEURS** (invulnérabilité plus longue après un coup),
  **DÉSYNCHRO / DÉPHASAGE** (on traverse tout juste après un coup), et le corps qui absorbe les tirs au-delà du
  8e anneau (proposition ÉCAILLES).
- *Régénérer* : **RÉPARATION** (+1 segment toutes les 9 / n s jusqu'à la longueur maximale), **NANITES** (une cellule
  ramassée rend un segment, 35 % + 18 % par prise), le soin (+3 segments), le noyau (+1 segment), et la récolte de
  l'ONDE (les tirs effacés deviennent des cellules).
- En 2975, **BOUCLIER (recharge 20 s) et RÉPARATION (6 s puis 4 s) existent déjà comme cartes tirables, avec leurs
  chiffres dans N.R, mais aucun code ne les applique.** Ce sont les deux branchements à faire en premier. Le
  bouclier peut annuler la première coupe ou le retrait de palier à la mort ; la réparation peut rendre les
  segments perdus, et donc les tourelles et le palier du canon.

## Les 10 manques les plus importants pour l'expérience de jeu, classés

1. **BOUCLIER sans effet** : la carte épique « ABSORBE UN COUP » ne protège ni la coupe, ni le palier perdu à la
   mort. C'est la protection demandée par la propriétaire.
2. **RÉPARATION sans effet** : le régénérateur demandé existe en carte, mais il ne fait rien.
3. **Aucun répit après une coupe** (ni AMORTISSEURS, ni DÉSYNCHRO, ni CITADELLE) : des coupes en rafale font
   perdre longueur, tourelles et paliers de canon d'un coup.
4. **RALENTI et REPLI inéquipables** : `equiper()` n'est appelé nulle part. Les déblocages à 300 et 800 d'énergie
   ne changent donc rien.
5. **Le palier du CANON suit la longueur** : la carte CANON ne dit pas ce qu'elle donne, une coupe fait perdre
   l'arme, et `N.cartes` n'est plus d'accord avec `N.arsenal` après une mort.
6. **Pas de morts en chaîne** (GRAPPE sans effet) : le spectacle d'explosions qui changeait le plus une partie
   de 2030.
7. **ÉPERON et BRAISE sans effet** : ni le boost qui devient une arme, ni la traînée qui brûle ou qui renforce
   le lasso.
8. **ONDE DE CHOC et SILLAGE absents** : aucune arme ne couvre « autour » en contrôle, ni « derrière » au contact.
9. **Peu de passifs pour former une construction** : PERFORATION, SURTENSION et ÉPINES manquent, il n'y a ni
   prérequis ni évolution, et sept cartes sur dix-neuf sont vides.
10. **Les ennemis ne durcissent pas en PV** : l'arsenal grandit plus vite que la menace, ce qui ramène au
    « trop facile » déjà signalé.

---

# Couverture de l'inventaire « interface, effets, audio » de SNAKE 2030 dans le code actuel de SNAKE 2975

*Vérifié à HEAD (d812b48), dans `proto-neon/src/*.js`, `sons/` et `musique/`. Chemins relatifs à `proto-neon/`.
Une idée compte comme présente seulement si un code exécuté dans la partie s'en sert.*

**Trois constats de fond, qui expliquent plusieurs lignes du tableau :**

1. **`90-boot.js` n'avance jamais `N.horloge`.** Seul `03-socle.js:892` appelle `avancer()` (et `79-jeu.js:664`, dans
   le mode simulé des tests). Conséquences :
   - **Les ralentis n'agissent pas sur le jeu.** `N.fx.ralenti` règle `kMonde` et `kJou` (`50-fx.js:852`). Ces
     facteurs ne sont lus que par `N.horloge` (`03-socle.js:901`) et par l'étouffoir de la musique
     (`30-music.js:1861`). La joueuse et les ennemis avancent au `dt` de `90-boot.js:357`. Seul le ralenti
     « visuel » de la mort étire bien les effets.
   - **`O.bootNouveau()` reste faux** (`70-commun.js:265`) : `79-jeu.js:347` lance la partie dès la fin de
     l'ouverture, et l'écran-titre de `80-ecrans.js:251` n'est jamais montré.
   - **Le décor ne suit pas les temps de la musique** : `N.horloge.franchi()` ne passe jamais à vrai
     (`15-decor.js:848`).
2. **La banque de 48 sons de `sons/banque.js` n'est pas dans le bundle.** `build.mjs:15-28` n'injecte que `src/`,
   `art/`, `cine/` et `musique/`, et aucun module de `src/` ne cite `SONS_2975`. `30-music.js:599-977` réécrit à la main
   51 sons qui portent les 48 mêmes noms (plus `degat`, `intro` et `neutre`), sans les variantes de `tir` ni le
   calibrage du banc. Le jeu appelle 45 de ces noms. Six ne sonnent jamais : `mort`, `gameover`, `battement` (comme
   son), `palier`, `bip`, `clic`. `79-scene.js:206` appelle `arme` sans `type` : tous les télégraphes jouent donc le
   même son par défaut (`30-music.js:797`).
3. **`N.decor.build()` n'est jamais appelé** (`15-decor.js:1026`). Les écouteurs `vague`, `vol`, `inversion` et
   `phase` du décor ne sont donc jamais branchés. Le quartier et l'état sont posés directement par
   `76-directeur.js:76-77`.

## Tableau

| idée (nom court) | statut | preuve (fichier:ligne ou « rien trouvé ») | ce qui manque (une ligne) |
|---|---|---|---|
| A-01 Écran-titre | PARTIELLE | `80-ecrans.js:251-262` (affiche, record, énergie), jamais atteint à cause de `79-jeu.js:347` ; ouverture avec horizon, logo construit et invite dans `60-intro.js:568-579` | écran-titre accessible, plaque JOUER, RÉGLAGES et DÉBLOCAGES, record au retour, attraction (`03-socle.js:161`, aucune entrée) |
| A-02 Décor des écrans | REPRISE | voile tramé `80-ecrans.js:91` ; tube cathodique sur tout, `90-boot.js` (crt.apply) | bandes tramées sang et indigo ; le monde est figé derrière les cartes et la pause |
| A-03 Écran de cartes | REPRISE EN MIEUX | `80-ecrans.js:201-243` (encre et crans, chute à 55 ms, rebond de 1 px, reflet de l'ultime à moins de 3 passages par s), sons `:42` et `:86`, étouffoir à 900 Hz `30-music.js:1860` | icônes en sprites 16 × 16 (repli tracé au code, `80-ecrans.js:110-136`) |
| A-04 Pause | REPRISE | `80-ecrans.js:144-168` (REPRENDRE à 44 pt, cartes prises, défi) ; 420 Hz `30-music.js:1857-1859` ; pause d'arrière-plan `79-jeu.js:608` | RÉGLAGES, QUITTER, distinction entre pause voulue et pause subie |
| A-05 Fin « SIGNAL PERDU » | REPRISE EN MIEUX | `80-ecrans.js:281-393` ; `77-score.js:237-273` (cause, écart, conseil, énergie, prochain déblocage) | fanfare de NOUVEAU RECORD (« record » ne sonne qu'au déblocage, `80-ecrans.js:378`) |
| A-06 Réglages | PARTIELLE | `77-score.js:26` (REG0 mémorisé) ; `02-regles.js:870` ; `50-fx.js:1225-1226` (setShake, setFlash), qu'aucun module n'appelle | l'écran de six lignes ; seul le son se règle (bouton du HUD, touche M) |
| A-07 Déblocages | PARTIELLE | `77-score.js:255-260` ; `02-regles.js:836-838` ; seuls RALENTI et REPLI changent le jeu (`75-cartes.js:11`) | « styles » et « galerie » ne débloquent rien ; pas d'écran en grille |
| A-08 Plein écran honnête | ABSENTE | rien trouvé (ni requestFullscreen, ni notice) | l'image « PARTAGER → SUR L'ÉCRAN D'ACCUEIL » |
| A-09 Bouton universel et clavier | PARTIELLE | `90-boot.js:102-125` (flèches, ZQSD, WASD, Espace, Entrée, Échap, P, 1-4) ; M `79-jeu.js:107` ; `clic` défini `30-music.js:936`, jamais appelé | clic et anneau au toucher d'interface ; E et R (`02-regles.js:410` non lu) ; capuchons de touches |
| A-10 Échelle de l'interface | REPRISE | pixel entier et zone sûre `90-boot.js:53-75`, `70-commun.js:238-258` | option TEXTE × 2 (REG0.texte, lue par aucun module) |
| B-01 Barre d'XP | PARTIELLE | XP dans `N.R` (`R.f.niveau`) ; toast « NIVEAU n » `78-hud.js:312` | aucune ligne de progression à l'écran |
| B-02 Score | REPRISE | `78-hud.js:96-102` (sept chiffres jaunes sur plaque) | roulement de 0,2 s quand le score saute |
| B-03 Multiplicateur et fenêtre | REPRISE | `78-hud.js:130-134` (« ×2  ×3 DANS 4 » en ambre) ; fenêtre qui se vide `78-hud.js:117-119` | pop au palier, son `palier` (`30-music.js:885`, jamais appelé), « MAX » |
| B-04 Niveau et nom du lieu | REPRISE | `78-hud.js:123-128` (« V1 · NOM ») | barre de progression du niveau |
| B-05 Tag de phase | PARTIELLE | tags `78-hud.js:40, 169-172` ; seulement RÉPIT (`79-scene.js:199`) et noms de pouvoir | tags CALME, MONTÉE, PIC ; vague `pic` consommée seulement par le décor, jamais branché |
| B-06 Jauge du boss | REPRISE EN MIEUX | `73-colosse.js:888-899` (remplissage en 0,9 s, encoches à 66 et 33 %, nom) | — |
| B-07 Vie et alarme | PARTIELLE | cœurs `78-hud.js:104` | aucune alarme à la dernière vie (clignotement, battement, vignette) |
| B-08 Jauges BOOST, POUVOIR, APOGÉE | REPRISE EN MIEUX | `70-joueuse.js:711-720` (arc de 270° ambre puis brasier, point qui orbite, anneau de 8 points) | arc tramé (aujourd'hui en pixels pleins) |
| B-09 Bouton pause | REPRISE EN MIEUX | `78-hud.js:69-94` (22 px = 44 pt, à côté du son) | — |
| B-10 Repères portés par le serpent | PARTIELLE | `70-joueuse.js:815-817` (un segment sur deux masqué) ; arc `:824` ; chevron de cap `:828` | clignoter le contour seulement en invulnérabilité |
| C-01 Bannière plein écran | PARTIELLE | `78-hud.js:145-160` (plaque à l'échelle 1, tiers opposé à la tête) ; `N.R.hud.banniere` (`02-regles.js:793`) lu par aucun module | échelle 3 ou 4, entrée en « coup », fantômes magenta et violet, balayage, dissolution de Bayer |
| C-02 Toast | REPRISE EN MIEUX | `78-hud.js:39, 162-168` ; `77-score.js:150, 202` | `codex()` (`78-hud.js:54`) jamais appelé : pas de règle du lieu |
| C-03 Règle éditoriale | REPRISE | `79-scene.js:66-74` (une bannière à la fois, budget de 10 s) | `70-joueuse.js:619`, `76-directeur.js:47` et `73-colosse.js:229` contournent le budget (INVERSION et TRAQUEUR en double) |
| D-01 Manche flottant | REPRISE EN MIEUX | `90-boot.js:150-160, 281-286` | — |
| D-02 Boutons à jauge, devenus gestes | REPRISE EN MIEUX | `90-boot.js:181-196` (toucher, glissé, tenu) ; états autour de la tête `70-joueuse.js:711-720` | au clavier, Espace tire mais n'accélère pas ; E et R non lus |
| D-03 Réglages des contrôles | PARTIELLE | `02-regles.js:870` (manche 0,8 / 1 / 1,25) ; rayon fixe `90-boot.js:150` | taille du manche réglable |
| E-01 Chevrons de portail | REPRISE | `78-hud.js:240-248, 263` (600 ms ; double pour une élite ; triple et 1,4 s pour le CYCLOPE) | clignotement qui accélère ; tic de portail émis seulement pour élites et traqueur (`76-directeur.js:139`) |
| E-02 Marqueurs permanents | REPRISE | `78-hud.js:266-278` ; radar `:209-238` | taille continue de 3 à 7 px (deux tailles seulement), mine ronde |
| F-01 Architecture sans allocation | REPRISE EN MIEUX | `50-fx.js:347-369` | — |
| F-02 Gerbes de particules | REPRISE EN MIEUX | `50-fx.js:409-421` ; confettis jaunes `50-fx.js:909` | — |
| F-03 Ondes de choc | REPRISE EN MIEUX | `50-fx.js:898-920` ; appels `79-scene.js:164, 172, 221` | — |
| F-04 Halos (bloom) | REPRISE EN MIEUX | S.heat vers le halo de `20-crt.js` ; ditherCirc `73-colosse.js:905` | — |
| F-05 Traînées | REPRISE | `50-fx.js:510` ; flèche `72-ennemis.js:408` | traînée cyan pâle de l'accélération |
| F-06 Textes flottants | REPRISE | `78-hud.js:43-53` (fusion « ×2 », décalage, échelle 2 dès 6 kills) | passage de l'acier au jaune avec le multiplicateur ; pop de deux images |
| F-07 Secousse | REPRISE EN MIEUX | `50-fx.js:286-315` (trauma) ; ressort `20-crt.js` | — |
| F-08 Gel compté en images | REPRISE EN MIEUX | `50-fx.js:271-281` ; `90-boot.js:345-347` | — |
| F-09 Recul de caméra | REPRISE EN MIEUX | `12-cam.js:333-347` ; `79-scene.js:79-83, 127` | recul d'1 px du tir automatique |
| F-10 Flash budgété | REPRISE EN MIEUX | limiteur `50-fx.js:233-265` ; `73-colosse.js:905` | — |
| F-11 Vignette directionnelle | REPRISE EN MIEUX | `50-fx.js:1027-1066` ; `79-scene.js:136, 144` | passage par le limiteur |
| F-12 Glitch | PARTIELLE | `50-fx.js:1026, 1033-1045` ; seul appel `79-scene.js:249` (dernière mort) | glitch à l'arrivée d'un niveau et à l'entrée du colosse ; copies magenta et violet |
| F-13 Combinaisons prêtes | REPRISE EN MIEUX | `boom` `50-fx.js:423`, `hit` `:316`, `pickup` `:909` | — |
| F-14 Blanc réservé à la tête | REPRISE EN MIEUX | drawTop `79-jeu.js:595` ; `70-joueuse.js:825` | — |
| F-15 Préférences de confort | PARTIELLE | `50-fx.js:207-227` (prefers-reduced-motion, mémorisation) | écran pour les régler |
| G-01 Le kill | REPRISE EN MIEUX | `79-scene.js:122-130` ; `30-music.js:712-722` | accord de palier |
| G-02 Impact qui ne tue pas | PARTIELLE | flash `72-ennemis.js:241` ; son `impact` seulement aux plaques (`:243`) ; `impactBoss` `73-colosse.js:281` | son de frappe sur les ennemis ordinaires, étincelles |
| G-03 Blessure (coup, coupe) | REPRISE | `79-scene.js:132-148` (gel 3, vignette, recul, son panoramisé) | ralenti (inopérant, voir constat 1) |
| G-04 Vie basse | PARTIELLE | battement, 2 kHz et grosse caisse seule `30-music.js:1135-1180, 1352`, branchés seulement sur le mur `79-scene.js:286-297` | déclencheur à la dernière vie |
| G-05 Mort | REPRISE EN MIEUX | `79-jeu.js:289-331` ; `79-scene.js:229-251` ; extinction `20-crt.js:672` | son `mort` (`30-music.js:858`) jamais joué : seule la coupure de la musique s'entend |
| G-06 Montée de niveau | PARTIELLE | `79-scene.js:162-167` (onde, levelup, ralenti 0,15) | ralenti sans effet (constat 1) ; bannière « CANONS × 2 » |
| G-07 Ultime APOGÉE | PARTIELLE | `79-scene.js:215-225` (gel 6, six ondes, éclair) ; `70-joueuse.js:470` | ralenti sans effet ; `plongee` (`30-music.js:1676`) jamais appelée (remplacée par `drop`) |
| G-08 Pouvoir | REPRISE EN MIEUX | `79-scene.js:208-214` ; `70-joueuse.js:461` | — |
| G-09 Accélération | REPRISE | sons `70-joueuse.js:384-390` ; arc `:711-714` | traînée |
| G-10 Entrée du boss | REPRISE EN MIEUX | `79-jeu.js:253` ; coupure de 250 ms `30-music.js:1541` ; sirène `:511` ; interlude `60-intro.js` ; jauge `73-colosse.js:888` | ralenti d'arrivée (`N.R.scene.cyclope` lu par aucun module, `73-colosse.js:24`) |
| G-11 Secteur nettoyé | REPRISE EN MIEUX | `79-jeu.js:242-249` ; `79-scene.js:171-176` (ondes, stinger, PARFAIT) | prime de vague (`77-score.js:208`) jamais affichée |
| G-12 Transitions de secteur et de phase | REPRISE | `76-directeur.js:76-77` (quartier, état) ; VOL de 4 s (`17-vol.js`) ; `79-scene.js:170` | accent et tag à chaque phase |
| G-13 Phases de caméra | REPRISE EN MIEUX | `15-decor.js:12-16` (sept plans, sol ligne par ligne) | image d'impact |
| G-14 Petits retours (mur, butin, noyau) | REPRISE EN MIEUX | mur rose `79-jeu.js:506-515` ; vignette à 1,2 Hz et battement `79-scene.js:286-297` ; `50-fx.js:909` | — |
| H-01 Grille qui s'allume | PARTIELLE | `15-decor.js:848` (violet sur le temps, jamais déclenché) ; `N.music.beat` lu par aucun module | calage du décor sur la musique |
| H-02 Blooms du décor | REPRISE EN MIEUX | `15-decor.js` (P4 brume, états selon la tension) | — |
| H-03 Poussière en parallaxe | REPRISE EN MIEUX | `15-decor.js:12-14` (P1, P4, P6) | — |
| H-04 Brume et vignette de danger | REPRISE | `50-fx.js:1047` ; `79-scene.js:293-295` | déclenchée par le mur seulement |
| H-05 Palette par secteur | REPRISE EN MIEUX | `15-decor.js:115-137` (sept quartiers, tables) ; `76-directeur.js:76` | appeler `N.decor.build()` : éclipse et états inversion et victoire jamais posés |
| I-01 Graphe de mixage | REPRISE EN MIEUX | `30-music.js:252-293, 534-539` | — |
| I-02 Banque (48 sons de `sons/banque.js`) | PARTIELLE | `build.mjs:15-28` ; aucune référence à `SONS_2975` dans `src/` ; réécriture `30-music.js:599-977` | injecter la banque ou porter ses variantes et son calibrage |
| I-02 shoot | REPRISE EN MIEUX | `74-arsenal.js:126` ; `30-music.js:601` (note de la gamme) | — |
| I-02 eshoot | REPRISE | `72-ennemis.js:528` ; `30-music.js:769` | — |
| I-02 laser | PARTIELLE | `74-arsenal.js:146` joue `tir` ; `tir.rayon` seulement dans `sons/banque.js` | timbre propre |
| I-02 missile | PARTIELLE | `74-arsenal.js:127` joue `salve` | timbre propre |
| I-02 shock | ABSENTE | rien trouvé (bouclier `75-cartes.js:212` muet) | son du bouclier |
| I-02 zap | PARTIELLE | arc `74-arsenal.js:199` joue `tir` | timbre propre |
| I-02 hit | PARTIELLE | `72-ennemis.js:243` (plaques seulement) | frappe ordinaire |
| I-02 bossHit | REPRISE | `73-colosse.js:281` | — |
| I-02 wallBump | REPRISE EN MIEUX | remplacé par l'alerte de proximité `79-scene.js:286-297` | — |
| I-02 kill | REPRISE EN MIEUX | `79-scene.js:126` ; `30-music.js:712` | — |
| I-02 bigkill | REPRISE | `79-scene.js:119` | — |
| I-02 explode | REPRISE | `73-colosse.js:351` | — |
| I-02 pickup | REPRISE | `79-scene.js:150` ; `30-music.js:832` | — |
| I-02 core | REPRISE | `79-scene.js:150` (noyau) | — |
| I-02 hurt | REPRISE | `79-scene.js:134, 141` (degat, coupe) | — |
| I-02 dead | PARTIELLE | défini `30-music.js:858`, jamais appelé | le jouer à la mort |
| I-02 boost | REPRISE | `70-joueuse.js:390` | — |
| I-02 boostEnd | REPRISE | `70-joueuse.js:384` | — |
| I-02 boostDry | REPRISE | `70-joueuse.js:385` | — |
| I-02 warp | REPRISE | `17-vol.js:493` ; `79-scene.js:192` (travelling) | — |
| I-02 spawnTick | PARTIELLE | `79-scene.js:203` (panoramisé) ; émis seulement pour élites et traqueur | tic pour tous les portails |
| I-02 absorb | ABSENTE | `79-scene.js:134` (absorbé : silence) | sans objet si le corps n'absorbe plus (`70-joueuse.js:7`) |
| I-02 lowHp | PARTIELLE | `30-music.js:520` ; danger lié au mur | battement à la dernière vie |
| I-02 teleport | REPRISE | `79-scene.js:211` (traversee) | — |
| I-02 steal | ABSENTE | rien trouvé | — |
| I-02 click | PARTIELLE | `30-music.js:936`, jamais appelé | l'appeler dans `80-ecrans.js` |
| I-02 levelup | REPRISE | `79-scene.js:166` | — |
| I-02 multUp | PARTIELLE | `palier` `30-music.js:885`, jamais appelé | l'appeler au palier |
| I-02 card | REPRISE EN MIEUX | `80-ecrans.js:42, 86` (carte, choix) | — |
| I-02 ultReady | REPRISE | `70-joueuse.js:470` | — |
| I-02 ultFire | REPRISE | `79-scene.js:224` | — |
| I-02 bossIn | REPRISE | `79-jeu.js:253` (intro) et section alerte ; corne `warning` seulement à l'enragement (`73-colosse.js:624`) | corne à l'arrivée |
| I-02 télégraphes (voix d'armes) | PARTIELLE | `79-scene.js:206` appelle `arme` sans `type` ; `30-music.js:776-797` | passer le type : une voix par armement |
| I-03 Code sonore par classes | REPRISE | `30-music.js:600-940` (sections) | — |
| I-04 Gains calibrés par la mesure | PARTIELLE | CALIBRAGE de `sons/banque.js` jamais chargé ; gains de `30-music.js` écrits à la main | calibrage du banc dans le jeu |
| I-05 Panoramique à sept positions | REPRISE | `30-music.js:998` (quantPan) ; `79-scene.js:53` | panoramique réduit en portrait |
| I-06 Garde anti-saturation | REPRISE EN MIEUX | `30-music.js:979-1026` (fusion, plafond, usure, budget de nœuds) | — |
| I-07 Aucun kill muet | REPRISE | `30-music.js:714, 982` | empilement dans la pentatonique, note courte au lieu du corps entier |
| I-08 Escalier des ramassages | REPRISE | `30-music.js:832-836` | accord au palier de puissance |
| I-09 Sondes de test | PARTIELLE | `30-music.js:2021-2024` (journal, rms, renderOffline) | `lastSfx` |
| J-01 `neonvelocity-2.mp3` | REPRISE EN MIEUX | `musique/nv-01..21.mp3` (4,7 Mo, 112 kb/s, sans pochette) ; `musique/piste.json` | — |
| J-01 `neonvelocity.mp3` (2e version) | ABSENTE | rien trouvé (piste.json : une seule source) | — |
| J-02 Lecture en flux | REPRISE EN MIEUX | `30-music.js:70, 1816-1852` (blocs à la demande, quatre décodés au plus) | — |
| J-03 Entrer dans le morceau | REPRISE EN MIEUX | intro bouclée `30-music.js:1447-1449` ; levée `:188` ; reprise après la mort `:1438-1446` | — |
| J-04 Robustesse | REPRISE EN MIEUX | `30-music.js:1567-1571, 1586-1589` | — |
| J-05 Base de secours | REPRISE EN MIEUX | `30-music.js:1227-1270` (même tonalité, même tempo, refrain) | — |
| J-06 perc | REPRISE EN MIEUX | `30-music.js:1135, 1192-1226` (sur la barre) | — |
| J-06 arp | REPRISE | ÉTINCELLES `30-music.js:1135, 1283` | — |
| J-06 pad | REPRISE | en repli seulement `30-music.js:1150-1154` | — |
| J-06 lead | REPRISE | en repli seulement `30-music.js:1259-1269` | — |
| J-06 clim | ABSENTE | rien trouvé | montée de bruit sur la 4e mesure, stabs |
| J-07 La musique suit l'action | REPRISE EN MIEUX | `30-music.js:1345-1362` (passe-bas et gain, jamais de vitesse) | resserrement à la dernière vie |
| J-08 Intensité calculée | REPRISE | `76-directeur.js:403-408` (progression et densité) | vie basse, phase de respiration |
| J-09 stinger | PARTIELLE | `30-music.js:1656` (sur la barre) ; seul appel `79-scene.js:173` | stinger à chaque changement de phase |
| J-09 drop | REPRISE EN MIEUX | `30-music.js:1541` (coupure de 250 ms sur la barre) ; `79-scene.js:224` | — |
| J-09 esquive | REPRISE EN MIEUX | `30-music.js:534-539, 63` (par classe) | — |
| J-09 plongée de l'ultime | PARTIELLE | `30-music.js:1676`, jamais appelée | l'appeler à l'APOGÉE |
| J-10 Cycle de vie du son | REPRISE EN MIEUX | `90-boot.js:289, 433-434` ; `30-music.js:1985-2002` | — |
| J-11 Silence des menus | REPRISE | titre au premier geste `30-music.js:1906` ; pause `:1857` | thème de défaite : section nulle à la fin (`03-socle.js:175`), `gameover` jamais joué |
| K-01 Vibrations | ABSENTE | rien trouvé (aucun navigator.vibrate) | motifs pour Android, derrière un réglage |

## Décompte

| statut | lignes |
|---|---|
| REPRISE EN MIEUX | 45 |
| REPRISE | 40 |
| PARTIELLE | 32 |
| ABSENTE | 7 |
| **total** | **124** |

## Les dix manques les plus importants pour l'expérience de jeu, classés

1. **Les ralentis ne ralentissent rien.** Blessure, montée de niveau, APOGÉE et arrivée du CYCLOPE n'ont donc pas de
   temps fort. `90-boot.js` ne fait pas avancer `N.horloge`, le seul module qui lit `N.fx.k()`. C'est la même cause qui
   cache l'écran-titre et coupe le calage du décor sur la musique.
2. **La mort est muette.** Les sons `mort` et `gameover` ne sont jamais joués, et la fin de partie n'a pas de thème :
   on n'entend que la coupure de la musique. C'est l'inverse du retour « il faut une vraie mort ».
3. **La dernière vie ne fait pas peur.** Le battement, le passe-bas à 2 kHz et les bords en sang qui pulsent existent,
   mais ils ne réagissent qu'à la proximité d'un mur, jamais à la dernière vie.
4. **La banque de 48 sons n'est pas branchée.** Les télégraphes jouent tous le même son (`arme` sans `type`). LANCE,
   ARC, RAYON et MISSILES sonnent comme le tir de base. Une frappe qui ne tue pas est silencieuse, et le portail des
   ennemis ordinaires aussi.
5. **Les bannières sont petites.** Ce sont des plaques à l'échelle 1, sans entrée en « coup », sans fantômes, sans
   balayage ni dissolution. Les chiffres existent dans `N.R.hud.banniere`, mais aucun module ne les lit.
6. **Le palier de multiplicateur passe en silence.** Le son `palier` n'est jamais appelé, et rien ne marque le palier
   à l'écran (ni pop, ni accord).
7. **La musique raconte peu.** Le stinger ne sonne qu'en fin de vague, la plongée de l'APOGÉE n'est jamais appelée, et
   la grille comme le décor ignorent les temps du morceau.
8. **Le cadre est incomplet.** L'écran-titre, avec son record et son énergie, n'est jamais atteint. Il n'y a ni écran
   de réglages (secousse, flashs, texte × 2, taille du manche), ni QUITTER à la pause.
9. **Le décor ne suit pas les événements**, parce que `N.decor.build()` n'est jamais appelé : pas d'éclipse à
   l'arrivée du CYCLOPE, pas d'état d'inversion ni de victoire. Le glitch, lui, ne sert qu'à la toute dernière mort.
10. **Au clavier, on ne peut ni accélérer, ni lancer le pouvoir, ni l'APOGÉE** : Espace tire, et E et R ne sont pas
    lus. La vibration est absente, et l'arc de boost reste visible pendant l'invulnérabilité alors que le corps
    disparaît un segment sur deux.
