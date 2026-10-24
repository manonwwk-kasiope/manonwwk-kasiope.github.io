# Chantier « jeu incroyable » — plan, critères et arrêts (écrits avant le lancement)

24/10/2026 · 01 h 57 (Paris). Demande de la propriétaire (24/10, 01 h 55) : « des tests et améliorations afin de rendre le jeu vraiment incroyable.
tout doit être fait de consort avec codex. rien ne doit être "à peu près" […] un jeu dynamique, qui bouge au rythme de la musique (les
événements arrivent sur les temps du bpm), certaines scènes peuvent aussi accélérer le tempo. n'oublie pas le warp […] un jeu qui adapte sa
difficulté aux compétences du joueur. fais des autotests, tourne au moins 6 heures pour adapter et optimiser la jouabilité, le tempo,
l'intérêt du jeu. il doit être supérieur à 9,5/10. »

## Pistes (Codex construit, la cheffe vérifie au navigateur et intègre ; le jury n'est jamais l'auteur)

| Piste | Objet | Fichiers propriétaires |
|---|---|---|
| i1 | Report sur la pointe des lots vérifiés du 18/10 (p35 flashs, p44 difficulté/annonces, p45b performance, p33b tempo retenu par v0c, p47 gestes) | raccords uniquement |
| r2b | Rythme : module `31-rythme.js` de codex-r2 + carte codex-r1, ramené sous R-13, R-14 et la difficulté | `31-rythme.js`, `15-decor.js` |
| t1 | Tempo qui accélère dans certaines scènes (WARP, CYCLOPE final, dernier drop), sans changer la hauteur des voix | `30-music.js`, `musique/` |
| w1 | WARP spectaculaire et rythmé | `78-warp.js` |
| d1 | Difficulté adaptative aux compétences du joueur | `32-adapte.js` (neuf) |
| j1 | Banc d'autotest et dossier du jury (vidéos, images aux temps forts, mesures) | `tools/jury2/` |

## Critères de réussite (portes), mesurés au navigateur (Chrome, iPhone 13 paysage/portrait, bureau)

1. **Zéro erreur** (jeu, console, page) ; build sortie 0.
2. **Photosensibilité R-13** ≤ 3 flashs/s au-delà de 6,6 % de l'écran ; **secousses R-14** ≤ 12 % des images ; palette 16 couleurs ; cyan réservé à la joueuse.
3. **Rythme** : ≥ 95 % des apparitions, tirs ennemis et départs de vague à ± 40 ms d'un temps audio (horloge audio réelle, latence compensée) ; chaque drop de la carte r1 suivi d'un moment fort en ≤ 1 temps ; chaque break d'une retenue visible.
4. **Tempo** : dans les scènes désignées, tempo effectif relevé d'au moins 8 % sans changement de hauteur (écart ≤ 10 cents), raccords sur la mesure.
5. **Difficulté adaptative** : pour les pilotes maladroit, humain, bon et expert, défaite médiane entre 150 et 240 s et part atteignant le CYCLOPE entre 20 et 50 % ; écart entre pilotes réduit d'au moins 40 % par rapport à la difficulté fixe ; ajustements bornés (± 25 %), seulement entre deux vagues ; dieu encore mis en difficulté (au moins une mort sur 10 parties).
6. **Performance** : p95 du temps d'image ≤ 11 ms (émulation normale) ; ≤ 16,7 ms sur l'iPhone de la propriétaire (à vérifier par elle).
7. **Jury ≥ 9,5/10** : cinq jurés Claude neufs (joueuse iPhone, game design, rythme et musique, direction artistique, confort et performance) et un juré Codex, chacun sur le dossier j1 d'une même build ; moyenne ≥ 9,5 et aucune note < 9. Deux jurys consécutifs au-dessus du seuil pour conclure.

## Arrêts (règle de non-convergence)

- Chaque piste : 3 passes au plus. Si la même porte échoue à deux passes consécutives, la piste s'arrête et la méthode est mise en cause (diagnostic écrit), sans « tour de plus ».
- Durée : au moins 6 h de boucle d'autotest et d'optimisation (de 02 h 00 à 08 h 00 au plus tôt), point chiffré toutes les 2 h dans ce fichier.
- Le jury est un jugement de modèles, pas de joueurs humains : la partie de la propriétaire sur son iPhone reste le juge final.

## Séries autonomes de tests, améliorations, optimisations (ajout de 02 h 06, demande de la propriétaire à 02 h 05)

- **Séries de mesure** : `~/Projets/wt-snake/serie-autotest.sh` rejoue 80 parties de pilotes (8 pilotes × 10 graines) au navigateur sur chaque
  nouvelle pointe, ou toutes les 40 min, jusqu'à 11 h ; reçus horodatés `~/Projets/wt-snake/recus/series/<date-heure>-<commit>.json`.
  Chaque série est comparée à la précédente (mêmes graines) : une régression d'une porte part en consigne Codex, sans attendre.
- **Études Claude** (5 agents neufs, lecture seule, 02 h 04) : game design et sensations, rythme et tempo, WARP et scènes, joueuse iPhone et
  difficulté adaptative, méthode d'autotest. Rendus dans `~/Projets/wt-snake/etudes/`, synthétisés par la cheffe en consignes Codex.
- **Boucle** : étude → consigne Codex → livraison → vérifieur navigateur → intégration → série de mesure → dossier j1 → jury → nouvelles consignes.

## Amendements de 02 h 22, avant toute mesure (étude de méthode `etude-autotest.md`, décisions D1 à D8 retenues par la cheffe)

- **Porte 3 (rythme)** : mesurée sur le son réel (prise du rendu WebAudio dans la page, détection des attaques), pas sur l'horloge de la VM,
  qui la rend vraie par construction ; banc validé avant usage par un décalage connu injecté, retrouvé à ± 8 ms. Carte r1 = entrée du jeu,
  jamais étalon : l'étalon des drops est recalculé sur le son rendu. Plancher de visibilité du rythme (on ne passe pas R-13 en éteignant le rythme).
- **Porte 4 (tempo)** : mesurée sur le signal (rapport de tempo ≥ 1,08, hauteur ≤ 10 cents, raccord ≤ 10 ms), banc validé à ± 3 cents.
- **Porte 5 (D1)** : survie censurée à 540 s (médiane de Kaplan–Meier), part CYCLOPE comptée sur `phase/arrivee` seule, n = 100 graines puis 300 si
  indéterminé ; « dieu » (invulnérable par `dbg.god`) remplacé par un pilote « surhumain » vulnérable ; écart entre pilotes réduit de 40 à 80 % ;
  rang des pilotes préservé (τ de Kendall = 1) ; sandbagging (mourir exprès pour baisser la difficulté) : gain ≤ 10 % ; 12 pilotes hold-out tirés au gel.
- **Porte 7 (D2, D3, D4)** : cinq regards (joueuse iPhone, game design, rythme et musique, direction artistique, avocat du diable), chacun tenu par
  deux familles (Claude Sonnet 5.5 xhigh, Codex GPT-6.1 Sol très élevé) ; « confort et performance » devient des seuils mesurés. Réussite = moyenne
  ≥ 9,5 **dans chaque famille** et aucune moyenne de regard < 9, sur deux jurys A et B de la même build gelée (dossiers différents), jamais de troisième.
  Note valide seulement si : l'étalonnage distingue témoin saboté, V0 et build (≥ 1,5 point), ≥ 70 % des défauts plantés retrouvés, écart entre
  familles ≤ 1 point. Sinon publiée « non interprétable ».
- **Instrument (D5)** : écrit par un agent Claude, relu par une session Codex (les auteurs du jeu ne mesurent pas leur travail). **Graines (D6)** :
  TUNE visible, VALID agrégée, TEST scellée et lue une fois. **Machine (D7)** : 1 Chromium + 1 VM. **Horaire (D8)** : boucle de 02 h 30 à 09 h 05 au moins.

## Point chiffré — 24/10/2026 · 04 h 00 (Paris)

Durée écoulée : 2 h 05 sur ≥ 6 h (boucle jusqu'à ≥ 09 h 05). Quota Claude : 76 % de la semaine (remise 24/10 19 h), 28 % de la fenêtre de 5 h (`get_usage`, 03 h 58). Sessions Codex en cours : 7 (f1, p44b, r2c, d1b, g1, m1, w1c).

| Piste | État | Mesure qui fait foi |
|---|---|---|
| j1 jury | intégré (bd06d4e, 42 contrôles locaux) | étalonnage à lancer sur la candidate |
| u1 interface | **intégré** (5b29c30 / b270d8f) | navigateur conforme 3 profils, 0 chevauchement, 0 erreur ; VM 80/80 |
| i1 lots du 18/10 | livré 03 h 30 (p35, p45b, p33b, p47 ; p44 écarté) | VM 80/80 par lot, 0 erreur ; navigateur en cours depuis 03 h 44 (91 min) |
| t1 tempo des scènes | vert navigateur 03 h 39 | H 180/180, 0 erreur ; ×1,0801 / < 10 cents / raccord 1,27 ms (VM) ; entre par f1 |
| s1 scènes, secousses | livré 03 h 31, arrêté sur la fin CYCLOPE (2 échecs : fichier 79 réservé) | R-14 Chrome paysage 2,40–7,61 % (≤ 12 %) ; films à revérifier (Chromium sans H.264 → Chrome) |
| w1 WARP | geste réel réparé (w1b : défaut du banc CDP) ; **W-02 échoue au navigateur** | 9/9 armements, 0 erreur ; écart à la grille 9–17 ms et 0,31–0,70 s (réduit, portrait) pour ≤ 12 ms → w1c |
| f1 fusion n° 1 | lancée 03 h 33, propriétaire de tous les fichiers | réalise S-01, S-02, S-05, fin CYCLOPE dans 79 |
| p44b préavis visibles | lancé 03 h 32 | coups sans préavis 181/265 → 25/259 dans p44, à rendre compatible |
| r2c, d1b, g1 | en cours | — |
| instruments mesure2 | écrits (agent Claude), relus par Codex m1 depuis 03 h 41 | témoins 69/69, 207/207, 50/50, 14/14 |

Série autonome sur b270d8f (80 parties, 03 h 28, paysage) : médianes de survie inerte 45 s, maladroit 54 s, humain 175 s, bon 243 s, expert 367 s, dieu 385 s ; 78/80 fins, 2 bornes (expert/2, dieu/9), 0 « bloque », 0 erreur. Portes fermées à ce point : aucune des 7 (le jury n'a pas encore noté). Arrêts : s1 (fin CYCLOPE) arrêté à 2 échecs, cause structurelle traitée par f1 ; W-02 premier échec au navigateur.

## Décisions de la cheffe pour la fusion n° 2 — 24/10/2026 · 04 h 36 (Paris)

- **g1 (puissance)** : accepté avec réserves. Prendre le candidat de la passe 2 de g1 **plus** la correction du plafond de naissances de g1b (`72-ennemis.js` : recontrôle du plafond dur à chaque éclosion, max 42 → 40) ; **ne pas prendre** le service des cartes en combat de g1b (essai de la cheffe, échoué : délai max 11,785 s, 10 niveaux non servis, morts dans les 2 s après fermeture 0 → 15). Retour au service des cartes de g1 passe 2 (VOLS et DÉFILÉ ouverts, seuil d'XP abaissé). La porte « carte ≤ 10 s » de l'étude game-design reste ouverte, non bloquante pour les 7 portes. Équilibre du pilote bon (KM 238 → 320 s) : rendu à d1b.
- **r2c (rythme)** : ne pas intégrer tel quel ; attendre r2d (propriétaire de 31/72/73 : fin de carte, portail orphelin, annonces jamais raccourcies, télégraphes du CYCLOPE sur la croche). 72 est touché par g1b et r2d : fusion par `git apply -3`, garder les deux intentions.
- **i1** : au navigateur, R-13 portrait 6/s et bureau 4/s (bloquant, invariant) et 2 contrats tactiles R-33 → i1b ; R-14 bon 12,6 % réglé par s1.
- **w1** : geste réparé ; W-02 recalé par w1c (cause principale : banc qui suspendait les images) ; confirmation Chrome en file.
- **Instruments (05 h 16)** : relecture Codex m1 → 5 instruments refusés (faux ACQUIS reproduits) ; corrigés par l'agent Claude auteur (18 faux ACQUIS → 1, témoins 160/400/75/23 + garde 26/26) ; contre-relecture Codex m2 lancée. **Exigence pour la fusion n° 2** : journaliser la création réelle de chaque projectile ennemi dans `72-ennemis.js` (identifiant, temps, type) et le premier tampon qui le montre (demande D1/D2 de `mesure2/DEMANDES.md`), sans changer le jeu ; pilote surhumain 30 ms exposé par codex-o1.

## Arrêt de non-convergence — instruments des portes 3, 4, 5 (24/10/2026 · 05 h 34, Paris)

**Lot arrêté par la cheffe, pas de troisième tour.** Même porte (qualification de l'instrument) refusée deux fois de suite : relecture Codex m1 (04 h 37, 18 faux ACQUIS reproduits) puis contre-relecture m2 (05 h 31) après correction par l'agent Claude auteur. m2 confirme les corrections de m1 (témoins 160/400/75/23/26 reproduits, trois changements d'énoncé justifiés) mais construit de nouveaux faux ACQUIS, dont plusieurs avec code de sortie 0 : tir rattaché à une partie inexistante (porte 3) ; types non scellés par le manifeste (une apparition remplace un tir) ; raccord réel −50 ms lu +1,88 ms (porte 4, ambiguïté de rang modulo les périodes) ; hold-out à partitions facultatives et registre TEST illisible traité comme neuf ; porte 5 publiée ACQUISE sans hold-out, surhumain ni sandbagger, latence livrée 50 ms ignorée. Noyau statistique, audio et synth : qualifiés avec réserves. Reçus : `~/Projets/wt-snake/codex-m1/proto-neon/tools/codex-m2/rapport.md`.

**Diagnostic de méthode.** Un seul auteur a écrit cinq instruments qui à la fois mesurent ET décident (verdicts, garde, publication), sur un langage ouvert ; un relecteur adverse trouve à chaque passe de nouveaux chemins vers ACQUIS. La surface de décision est trop grande pour converger par corrections successives.

**Ce qui vaut d'ici là.** Les instruments sont utilisés **en mesure brute seulement** : aucune porte 3, 4 ou 5 n'est dite ACQUISE ; les valeurs sont publiées avec la mention « instrument non qualifié ». La porte 7 (jury, jury2 durci et étalonné séparément) reste le critère 9,5.

**Méthode proposée à la propriétaire (non lancée sans son ordre, règle du 02/10) :** séparer mesure et verdict. Les instruments ne produisent que des mesures brutes horodatées avec provenance ; un **script de verdict unique, court (≤ 200 lignes), à table de conditions fermée** (chaque condition = une ligne, provenance exigée, toute absence = NON INTERPRÉTABLE), scellé par empreinte avant toute mesure ; pilote sur la seule porte 4 (la plus petite) avec les pièges m1 + m2 comme cas obligatoires ; coût estimé (hypothèse) : 1 session Codex + 1 agent Claude ≈ 1 h, < 2 % du plafond hebdomadaire Claude.

## Arrêt de non-convergence — difficulté adaptative, porte 5 (24/10/2026 · 05 h 58, Paris)

**Lot d1b arrêté par lui-même au second échec, contrôleur désactivé ; pas de nouveau tour sans l'ordre de la propriétaire.** Passe 2 : maladroit n = 100, médiane KM 59,82 s [55,31 ; 88,15], CYCLOPE 1 % (cible 150–240 s, 20–50 %). Passe 1 : bon 252 → 435 s, expert 265 → 486 s (le contrôleur facilite les forts au lieu de resserrer l'écart). Élasticité aux bornes ±25 % : +65 % pour le maladroit, IC [9,9 % ; 75,4 %], borne basse sous +30 %. 2 512 reçus sans erreur. Rapport : `~/Projets/wt-snake/codex-d1b/proto-neon/tools/codex-d1b/rapport.md`.

**Mesure de la joueuse moyenne (codex-o1, 05 h 53)** : pilote « occasionnel » (réaction 0,30 s, bruit 20°, un doigt) : survie médiane **73,3 s en paysage, 57,7 s en portrait**, V3 atteinte 50 % / 40 %, **aucun CYCLOPE** ; cible de l'étude 120–200 s, ≥ 60 % en V3, CYCLOPE 5–20 %. Écart portrait/paysage 21,4 % (cible ≤ 15 %). Pilote surhumain livré à 33,333 ms : 30 ms n'est pas atteignable à 60 images/s (2 images = 33,33 ms) — erreur de spécification démontrée, valeur retenue.

**Diagnostic de méthode.** Les joueuses faibles meurent en V1–V2, **avant la première décision** du contrôleur (entrée des vagues 2 à 5) ; leur estimation θ reste ≈ 0,5 (V1 0,50 · V2 0,48 · V3 0,49) : le signal ne distingue pas la maladresse ; les leviers agissent surtout sur les vagues que seuls les bons atteignent, d'où l'écart creusé.

**Méthode proposée à la propriétaire (non lancée, règle du 02/10)** : traiter d'abord la **première minute** par une courbe fixe, non adaptative (V1 apprenable : naissances plus espacées, aucun tir avant 20 s, première mort de chaque vague avec réapparition protégée), puis un contrôleur **à sens unique et intra-vague** qui ne fait qu'alléger après une mort, jamais durcir. Pilote borné avant toute campagne : occasionnel, maladroit, humain, bon, 20 graines × paysage + portrait (≈ 25 min VM, une session Codex), critères écrits avant : occasionnel ≥ 120 s et ≥ 60 % en V3 ; bon et expert à ± 10 % de leur survie fixe. Coût Claude ≈ 0 (Codex construit, la cheffe vérifie).

## Point chiffré — 24/10/2026 · 06 h 00 (Paris)

Durée écoulée : 4 h 05 sur ≥ 6 h. Sessions Codex en cours : 1 (f1, fusion n° 1, au rythme r2d). Livrés depuis 04 h : p44b (préavis : coups sans préavis 181/265 → 21/233), w1c (WARP recalé : 10,3 ms en VM, Chrome en file), g1 → g1b → g1c (ULTIME 85 %, intensité V5/V4 ≥ 1,27, plafond 40 tenu, cartes en combat écartées), r2c → r2d (drops 13/13 exacts, apparitions 99,78 % sur la croche, tirs CYCLOPE 98,3 %, 400/400 parties sans blocage), i1b (flashs au navigateur 0/6/4 → 0/1/1 en VM), m1/m2 (instruments arrêtés), d1b (arrêté), o1 (joueuse moyenne mesurée). Navigateur : t1 vert (H 180/180), s1 R-14 7,61 % au plus, i1 R-13 échec → i1b ; en file : p44b (en cours depuis 04 h 21), s1 avec films, WARP, i1 refait, rythme. Portes fermées : aucune des 7 (porte 5 arrêtée ; portes 3–4 non qualifiables tant que l'instrument est arrêté ; porte 7 jury en attente de la candidate).

## Ce qui tue la joueuse occasionnelle — analyse codex-a1 (24/10/2026 · 06 h 32, Paris)

971 morts classées (`~/Projets/wt-snake/codex-a1/proto-neon/tools/codex-a1/rapport.md`, `morts.csv`). Occasionnel, morts avant 90 s : **mur + FLÈCHE = 92,0 % en paysage, 80,8 % en portrait** (paysage : mur fixe 48 %, FLÈCHE 22 %) ; première mort médiane 34,6 s paysage / 28,4 s portrait, surtout en V2. Maladroit : FLÈCHE 42,8 %, dard 33,3 %, mur fixe 12,9 %.

**Méthode précisée pour la propriétaire (toujours non lancée)** — leviers ciblés sur ces deux causes, invariants intacts (le mur tue toujours, la morsure coupe sans tuer) : (1) **mur annoncé** : liseré qui s'allume quand la tête est à moins de 1 s du mur à sa vitesse, plus fort sous 0,5 s ; (2) **FLÈCHES apprenables en V1–V2** : élan télégraphié ≥ 0,8 s (trait au sol sur sa trajectoire), pas de FLÈCHE avant 20 s, au plus deux à la fois en V1 ; (3) réapparition protégée 2 s après chaque mort. Pilote : occasionnel, maladroit, humain, bon, 20 graines × paysage + portrait ; critères écrits avant : occasionnel ≥ 120 s et ≥ 60 % en V3, part mur + FLÈCHE des morts < 90 s divisée par deux, bon et expert à ± 10 % de leur survie fixe. Coût Claude ≈ 0.

## Candidate f1 intégrée — 24/10/2026 · 06 h 56 (Paris)

**Intégrée** (e4b2428, bundle 5f7dbb3) : u1, i1 (sans i1b), t1, r2d, g1c, raccord audio commun. **Chrome, 33 parties** (bon 1–10 + dieu 2 × paysage, portrait, bureau) : 0 erreur ; R-14 2,5–8,0 % (≤ 12 %) ; R-13 0 / 3 / 1 flashs/s (≤ 3) ; palette fermée (0 pixel hors palette) ; catalogue six morceaux + neuf versions ; CYCLOPE atteint dans 22/33. Scènes S-01–S-05, WARP et préavis non inclus (écartés par f1, repris par f2).
**WARP (w1c) conforme dans Chrome** (06 h 52) : 9/9 cas, écart à la grille ≤ 11,84 ms (≤ 12 ms), 0 erreur, ≤ 1 flash/s.
**i1b dans Chrome** : R-13 paysage 0/s, R-33 14/14 ; cas de geste « retour-origine » (second doigt pendant le retour du pouce) en échec : second échec de R-33 au navigateur → i1 arrêté, cas transmis à la vérification de f2.
**p44b dans Chrome** : 0 annonce courte ; 13 % des coups reçus sans préavis à l'endroit → p44c (ventilation par auteur et correction à la source).
**Étalonnage du jury lancé sur la pointe f1** (06 h 56, `tools/jury2/banc.mjs --serie etalonnage --valider-instrument`, 3–5 h hypothèse).

## Point chiffré — 24/10/2026 · 07 h 58 (Paris)

Durée écoulée : 6 h 03 (le plancher de 6 h est atteint ; la boucle continue jusqu'au verdict du jury, ≥ 09 h 05). Quota Claude : 80 % de la semaine (remise 24/10 19 h), 9 % de la fenêtre de 5 h (`get_usage`, 07 h 58). Sessions Codex : 2 (f2 fusion n° 2 — en VM, 60/60 cas identiques hors traces sur sa dernière étape ; p44c coups sans préavis). Navigateur : étalonnage du jury depuis 06 h 55 (candidate jouée, témoin dégradé en cours, toutes les parties finies sans erreur).

| Porte | État à 07 h 58 |
|---|---|
| 1 jouabilité (zéro erreur, partie complète) | candidate f1 : 33/33 parties Chrome sans erreur, CYCLOPE 22/33 — **tenue sur f1** |
| 2 rythme visible | r2d intégré (drops 13/13, apparitions 99,78 % sur la croche, moment fort ≥ 97,9 % des drops) — mesure VM, instrument navigateur non qualifié |
| 3 calage audio-image | **non qualifiable** (instrument arrêté, mesures brutes seulement) |
| 4 tempo des scènes | t1 intégré (×1,0801, < 10 cents, H 180/180 Chrome) ; raccord au signal non qualifié |
| 5 difficulté adaptative | **arrêtée** (d1, d1b) ; joueuse occasionnelle 58–73 s ; méthode proposée, attend la propriétaire |
| 6 photosensibilité et secousses | f1 Chrome : R-13 ≤ 3/s, R-14 ≤ 8 % — **tenue sur f1** |
| 7 jury ≥ 9,5 (A et B) | étalonnage en cours ; jurys après f2 |

## Fusion n° 2 livrée et R-07 — 24/10/2026 · 08 h 29 (Paris)

- **f2 livrée (08 h 26)** : f1 + i1b + s1 + w1c + p44b + o1 + journal des tirs (D1/D2) ; d1b exclu. VM : 211 parties, 0 erreur ; R-13 1/0/1 flash/s ; R-14 ≤ 8,71 % ; p44b 24/24, 9/9 scènes. Vérification Chrome en file après l'étalonnage du jury ; relecture adverse du code par Codex rv1 en cours.
- **p44c (08 h 26), accepté avec réserves, lot arrêté** (second échec de R-07 à 100 %) : coups reçus sans préavis à l'endroit **13 % → 1,06 %** (39/3 674 sur 480 parties) ; reliquat : 34 convois, 4 lasers CYCLOPE, 1 souffle INSTABLE ; aucun contact ni projectile non annoncé ; 0 erreur, 9/9 scènes. À inclure dans la fusion n° 3 (`~/Projets/wt-snake/codex-p44b/proto-neon/tools/codex-p44c/combine.patch`) ; le reliquat est consigné, sans troisième essai.

## Point chiffré — 24/10/2026 · 09 h 58 (Paris)

Durée écoulée : 8 h 03. Quota Claude : 83 % de la semaine (remise 24/10 19 h), 21 % de la fenêtre de 5 h (`get_usage`, 09 h 58). Coupure de session vers 09 h 06 : f3, l'étalonnage et la file f2 tués ; f3 relancé en reprise (consigne `codex-f3r.md`, 28 fichiers déjà modifiés dans sa copie), étalonnage relancé à 09 h 47 dans la copie figée `jury-f1` (dossiers partiels mis de côté dans `recus/etalonnage-interrompu-0906*`). Sessions Codex SNAKE : 1 (f3). Mémoire libre + inactive : 3,6 Go (`vm_stat`), donc aucune session de plus.

| Porte | État à 09 h 58 |
|---|---|
| 1 jouabilité | **tenue sur f1** ; f2 0 erreur en VM (211 parties) ; f3 corrige les 10 défauts de la relecture rv1 (dont cyan hors joueuse, bloquant) |
| 2 rythme visible | inchangé (r2d intégré, instrument navigateur non qualifié) |
| 3 calage audio-image | **non qualifiable** (instrument arrêté ; méthode « mesure séparée du verdict » proposée, attend la propriétaire) |
| 4 tempo des scènes | inchangé (t1 intégré) |
| 5 difficulté adaptative | **arrêtée** ; essai « première minute apprenable » proposé avec ses critères écrits, attend la propriétaire |
| 6 photosensibilité et secousses | **tenue sur f1** ; f2 VM R-13 ≤ 1/s, R-14 ≤ 8,71 % |
| 7 jury ≥ 9,5 | étalonnage en cours (essai 1 depuis 09 h 47) ; jurys A et B sur f3 après sa vérification Chrome |

Prochaines actions : à la livraison de f3, vérification Chrome (après l'étalonnage, un Chromium à la fois), intégration par `integrer.sh` avec p44c, puis paquets d'étalonnage, banc alpha/beta et jurys.
