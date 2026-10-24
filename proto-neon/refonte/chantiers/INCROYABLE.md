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
