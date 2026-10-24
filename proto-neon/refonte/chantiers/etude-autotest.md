# SNAKE 2975 — étude : 6 h d'autotests qui optimisent vraiment la jouabilité, le tempo et l'intérêt, et une note de jury qui veut dire quelque chose

24/10/2026 · 02 h 20 (Paris). Étude en lecture seule : aucun fichier du jeu modifié, aucun navigateur ni serveur lancé. Chemins relatifs à `~/Projets/wt-snake/chef/proto-neon/` sauf mention. Chiffre sans source = **hypothèse**. Durée annoncée = minutes ou heures, avec qui l'exécute.

Sources lues : `refonte/chantiers/INCROYABLE.md`, `refonte/SORTIE.md`, `refonte/VERSION-0.md`, `REPRISE.md`, `refonte/lots/pilotes.md`, `REFONTE.md` § 4.10, `tools/mesure/` (LISEZMOI, `parties.mjs`, `criteres/R-04`, `R-15`, `R-22`, `R-25`), `tools/pilotes/` (`parties.mjs`, `rapport.md`), `tools/jury/partie.mjs`, `src/85-pilote.js`, `tools/codex-p34/rapport.md`, `tools/lisibilite/01c-contours/jury/rapport.md`, et dans `~/Projets/wt-snake/` : `codex-r2/proto-neon/tools/codex-r2/rapport.md`, `consignes/codex-{d1,j1,r2b,i1}.md`.

---

## 0. En bref

1. **La méthode actuelle ne peut pas donner un 9,5 interprétable.** Pas d'échelle ancrée, un jury qui n'entend rien et ne voit rien en temps réel, un dossier composé par ceux qui visent la note, cinq jurés sur six de la même famille, et un seuil (9,5, aucune note < 9) qu'un jeu réellement à 9,5 franchit **3 à 8 % du temps** (calcul § 1, F13). Les seules notes de jury connues du projet (01c, 18/10) vont de 5,5 à 8,5.
2. **Deux portes ont des défauts de définition** : « dieu mis en difficulté (une mort sur 10) » est impossible par construction (dieu est invulnérable) ; la porte 3 (± 40 ms) est vraie par construction en VM et invérifiable en Chromium muet piloté image par image.
3. **Je propose une boucle à trois étages** : la VM détecte (≈ 4,5 s la partie, hypothèse tirée des horodatages du 18/10), Chromium décide (un seul à la fois, c'est la ressource rare : ≈ 270 min des 360), le jury juge un dossier protocolaire (deux familles de modèles, ancres, défauts plantés). ≈ 4 400 parties VM, ≈ 270 min de Chromium, 3 dossiers de calibration puis 2 dossiers de verdict.
4. **« 9,5 » est reconnu seulement si** les jurés distinguent un témoin sabotage et la version 0, retrouvent les défauts plantés, et si les deux familles (Claude, Codex) s'accordent à ≤ 1 point ; sinon la note est publiée « non interprétable » et ne ferme aucune porte. Le dernier mot reste l'iPhone de la propriétaire.
5. **Le « au moins 6 h » est un plancher, pas un objectif** : deux passes Codex par piste tiennent dans 6 h (une passe dure 1 h 30 à 2 h, hypothèse), la troisième est une extension décidée par une règle écrite (§ 2.6).

---

## 1. Failles de la méthode actuelle (ce qui pourrait donner un faux 9,5)

### A. Les portes elles-mêmes

**F1. « Dieu encore mis en difficulté (au moins une mort sur 10) » est impossible.**
Preuve : dieu = « bon et invulnérable » (`REFONTE.md` § 4.10) ; `tools/pilotes/parties.mjs:49` `if (pilote === 'dieu') N.game.dbg.god(true)` ; `tools/pilotes/rapport.md` : « le pilote dieu ne subit aucune mort dans les dix parties ». La consigne d1 (`consignes/codex-d1.md`) reprend la phrase telle quelle.
Effet : la porte est soit non mesurable, soit « tenue » par un artefact (god coupé, un seul cas). Correction : § 5 D1 (remplacer par un pilote « surhumain » sans invulnérabilité).

**F2. « Défaite médiane » n'a pas de définition unique, et l'adaptation la rend indéfinie.**
Preuve : `tools/mesure/parties.mjs:96` `medianeFins` = toutes les fins, victoires comprises ; le banc p5 fait de même ; R-04 historique filtrait les défaites. `tools/codex-p34/rapport.md` § 1.2 : pour l'humain, **94,75 s (6 défaites) contre 289,66 s (10 fins)** sur les mêmes parties, « dans des directions opposées ». Avec une difficulté adaptative qui vise 150–240 s, un expert qui gagne ne produit aucune défaite : la médiane conditionnelle disparaît ou se biaise.
Correction : survie censurée (Kaplan–Meier, censure à 540 s), médiane de toutes les fins **et** médiane des défaites publiées côte à côte.

**F3. Les effectifs ne permettent pas de trancher les fenêtres écrites.**
Preuve : d1 mesure « au moins 20 graines par pilote » (`consignes/codex-d1.md`), le vérifieur navigateur 10 ; `REFONTE.md` § 4.10 : « sur 20, l'erreur type vaut ± 11 points » ; `src/02-regles.js:760` `graines: 50`. Calcul (Wilson 95 %, p = 35 %, hypothèse de la valeur centrale) : demi-largeur **± 25,5 pts à n = 10, ± 19,3 à n = 20, ± 12,8 à n = 50, ± 9,2 à n = 100, ± 5,4 à n = 300**. La fenêtre « part atteignant le CYCLOPE entre 20 et 50 % » fait 30 points de large : à n = 20 aucun résultat ne peut la prouver. Médiane de survie : σ ≈ 58 s pour l'humain, 84 s pour le bon (écart-type des 10 durées de `tools/pilotes/rapport.md`) → demi-largeur de l'IC de la médiane ± 14,7 s à n = 100 (σ = 60), ± 33 s à n = 20.

**F4. « Réduire l'écart entre pilotes d'au moins 40 % » récompense l'aplatissement.**
Aucune borne haute, aucune contrainte de rang. Un jeu où l'expert et le maladroit finissent à 190 s tous les deux « réussit » la porte et a tué la maîtrise (retour n° 2 de la propriétaire : « une maîtrise qui se mérite », `refonte/RETOURS-PROPRIETAIRE.md`). Une adaptation qui se laisse tromper (mourir exprès pour baisser la difficulté) passe aussi : aucun test de ce type n'est prévu.

### B. Les pilotes

**F5. Les pilotes ne sont plus gelés, et la difficulté adaptative va s'y régler.**
Preuve : `refonte/lots/pilotes.md` § 0 et `REFONTE.md` § 4.10 : « le lot 9 règle `N.R`, jamais les pilotes : sinon on règle un pilote pour qu'il tombe dans ses cibles, ce qui ne mesure rien » ; or `src/85-pilote.js:1` : « bon/expert révisés par codex-p14 ; humain conforme au contrat (p37) », et `tools/codex-p34/rapport.md` propose de « recadrer les politiques des pilotes ». d1 va maintenant régler `32-adapte.js` contre ces mêmes pilotes, en estimant la compétence à partir, entre autres, du « temps de réaction aux menaces annoncées » (`consignes/codex-d1.md`) : or ce temps est **une constante par pilote** (`src/85-pilote.js:12` : 0,12 / 0,08 / 0,05 s). Le module peut apprendre les constantes des quatre pilotes au lieu de mesurer un joueur.

**F6. Dix graines ne sont pas dix joueurs : bon et expert sont déterministes.**
Preuve : seuls l'humain (`:389`) et le maladroit (`:334`) tirent dans `N.rng('pilote')`. Bon, expert, kamikaze, dieu sont des fonctions pures de l'état : la seule variation entre deux parties est le monde. 4 000 parties de bon sur 100 graines = 100 observations, pas 4 000. Rejouer une graine ne sert à rien (`tools/pilotes/rapport.md` : 8 répétitions identiques au journal près) — y compris pour « réitérer une aberration » : en VM, la réitération doit changer le flux pilote ou la graine voisine, sinon elle ne prouve rien.

**F7. Les pilotes ne perçoivent ni la musique ni l'écran.**
Preuve : `grep` de `music|rythme|beat` dans `src/85-pilote.js` : 0 occurrence ; contrat `refonte/lots/pilotes.md` § 1 : il lit `S` seulement (positions, `S.tele` avec `reste`, vitesses exactes, `:73-110`). Donc : (a) la difficulté est calibrée sur des politiques insensibles au rythme ; (b) rien ne dit si la quantification sur les temps aide ou gêne un humain (la candidate r2 a déplacé la médiane de l'humain de 181,1 s à 212,6 s, `codex-r2/.../rapport.md` : un effet visible des pilotes, dont la perception humaine est inconnue) ; (c) la lisibilité et l'« intérêt » ne sont vus par aucun pilote.

### C. Les mesures

**F8. La porte 3 (± 40 ms) est tautologique en VM et invérifiable dans le banc actuel.**
Preuve : `codex-r2/.../rapport.md` : « Écart maximal apparition / créneau 8,292 ms — logique VM, pas une mesure audio réelle » ; le module met les événements en file jusqu'au temps suivant, donc ± 40 ms est vrai par construction. L'oracle navigateur prévu est « un curseur audio indépendant reconstruit à partir des horaires de lecture » : les horaires **prévus**, pas le signal rendu. Chromium est lancé `--mute-audio` avec `requestAnimationFrame` remplacé par `__tick(n)` synchrone (`tools/jury/partie.mjs:27,37,39`) : le temps audio et le temps de jeu y sont découplés. La latence de sortie est bornée à 0,2 s (`src/30-music.js:1941` `Math.min(0.2, outputLatency + baseLatency)`) et ne se mesure pas hors appareil. La carte des drops (r1 : 13 drops, 18 breaks, 4 montées, « zone grise ») sert à la fois d'entrée du jeu et d'étalon : circulaire. Lors des mesures r2 « la carte r1 réelle était absente du dépôt reçu » (repli de phrases de 8 mesures).
Effet : porte « tenue » avec un rythme que personne n'a entendu. Correction : § 2.3, oracle indépendant (onsets du signal rendu hors ligne).

**F9. L'instrument a déjà menti dans les deux sens, la nuit du 18/10.**
Preuve (`tools/codex-p34/rapport.md` § 1.1) : R-04 « atteint le CYCLOPE » comptait des panneaux génériques — sur 10 graines, kamikaze 10/10 « atteint » contre **0/10** réel, maladroit 9/10 contre 0/10 ; sur la batterie 318ce61, bon 5/5 publié contre 2/5 réel ; § 1.2 ci-dessus ; `SORTIE.md` : R-08 « mort juste 88,5 % » = défaut de mesure (p29) ; R-13 : 5 flashs/s en VM, 8 flashs/s en navigateur pour le même lot (p15). Un instrument jamais validé sur des cas à verdict connu donne des faux échecs **et** des faux succès ; seuls les premiers se voient.

**F10. Les seuils sont des conventions du 17/10, pas des mesures de plaisir.**
Preuve : cibles de `REFONTE.md` § 4.10 écrites avant toute partie observée ; la cheffe a déjà déplacé un seuil (inerte « avant 8 s » → « avant 11 s », `SORTIE.md`, 18/10 05 h 11, géométrie du monde) ; le réglage par cibles B a été arrêté pour non-convergence (REPRISE). Tenir 20 cibles ne dit rien de l'intérêt.

**F11. Les portes se contredisent, donc la voie la plus courte est d'éteindre le rythme.**
Preuve : candidate r2 : R-13 5 flashs/s (limite 3), R-14 14,68 % (limite 12 %), médiane humain 212,6 s (limite 210) — trois portes tombées d'un coup (`codex-r2/.../rapport.md`). Passer R-13 et R-14 en atténuant les pulsations réussit les portes 2 et 3 (la quantification reste exacte) et appauvrit le jeu ; aucune mesure ne fixe de plancher à la **visibilité** du rythme. Goodhart classique.

**F12. Le journal en anneau peut tronquer sans prévenir.**
Preuve : `src/03-socle.js:11` et `:667` : anneau de 65 536 entrées ; r2 a mesuré 21 252 livraisons + 1 203 drops en une série et n'a vérifié `journauxTronques` que ce jour-là. `31-rythme` et `32-adapte` ajoutent des types de journal. Une partie de 540 s analysée sur un journal tronqué perd ses premiers événements sans erreur.

### D. Le jury

**F13. Le seuil 9,5 / « aucune note < 9 » n'a ni échelle ni précédent, et il est presque inatteignable par construction.**
Preuve : `VERSION-0.md` : « aucun jury final complet » n'a jamais noté le jeu ; le seuil historique était ≥ 8/10 (`SORTIE.md` porte 5). Le seul précédent chiffré (`tools/lisibilite/01c-contours/jury/rapport.md`, Claude Opus 5.5 et ChatGPT 6.1 Sol, 6 captures) : notes de **5,5 à 8,5** ; écarts entre familles jusqu'à 1 point sur la même image (bureau-v5, ambiance : 8,5 contre 7,5) ; lisibilité X préférée à Y par Claude, l'inverse par ChatGPT.
Calcul (hypothèse σ du juré 0,5 à 0,7 point, tirée de ces 6 paires ; jurés indépendants ; simulation de 200 000 tirages) : pour un jeu dont la vraie valeur est 9,5, P(les 6 notes ≥ 9) = 20 à 36 %, P(moyenne ≥ 9,5 **et** aucune < 9) = **18 à 29 %**, P(deux jurys consécutifs) = **3 à 8 %** ; pour un jeu à 9,0, P(6 notes ≥ 9) = 1,6 %. Soit la règle bloque presque toujours un excellent jeu, soit elle finit par passer par réessais, inflation ou jurés corrélés — aucun des deux n'a de sens.

**F14. Le dossier est composé par ceux qui visent la note.**
Preuve : `consignes/codex-j1.md` : j1 (Codex) produit « des vidéos des moments clés », « des planches aux temps forts » et « les mesures » ; la cheffe lance le jury. « Moments clés » = meilleur choix possible ; les « mesures » du dossier (R-13 ok, 95 % calés) ancrent les jurés. L'ancien kit était à l'opposé : `tools/jury/partie.mjs` photographie toutes les 6 s de temps de jeu (`--pas 6`), soit **une image tous les 14,4 temps** (143,76 BPM : 0,417 s par temps) : invisible pour un pouls. Meilleur choix ou échantillon aveugle : dans les deux cas, pas un échantillon honnête.

**F15. Les jurés ne peuvent pas percevoir deux des cinq regards.**
Preuve : `--mute-audio` et `consignes/codex-j1.md` : « le jury ne l'entend pas » ; vidéos = suites d'images ; la « joueuse iPhone » ne touche rien (les parties se jouent par `S.input`, les gestes tactiles ne sont testés qu'à part, R-22/R-33) ; « confort et performance » lit des p95 de VM ou de Chromium Mac (R-20 : 1,72 ms en VM, `SORTIE.md`), alors que le seuil du joueur est 16,7 ms **sur l'iPhone, à vérifier par elle**. Ces regards extrapolent un dossier textuel : complaisance structurelle.

**F16. Cinq jurés Claude + un Codex ne font pas six observations.**
Même famille (Sonnet 5.5 xhigh, `REPRISE.md`), même dossier, mêmes angles morts : avec une corrélation de 0,3 à 0,7 entre jurés (hypothèse), l'effectif utile des cinq est **1,3 à 2,3**. Le seul juré hétérogène pèse 1/6, alors que 01c montre que les deux familles divergent vraiment. Les jurés sont aussi des modèles : la partie de la propriétaire reste le juge final (`INCROYABLE.md`).

**F17. Autres points qui peuvent fausser le résultat.** Auteur ≠ juge à tenir pour l'instrument aussi : j1 (Codex) écrit le banc qui produit le dossier et r2b/d1 (Codex) ont leur propre `verifier.mjs`. Aucune règle ne limite le nombre de jurys sur une même build (réessai possible). Rien n'est scellé avant la boucle : graines, pilotes, seuils de décision, grille.

---

## 2. Boucle de 6 h, minute par minute

### 2.1 Machine, débits et partage des voies

| Ressource | Mesure | Source |
|---|---|---|
| VM Node, un processus | ≈ 2,5 s la partie en moyenne sur le mélange des 8 pilotes (120 parties, 13 h 43 → 13 h 48 le 18/10) ; ≈ 4,5 s pour l'humain (20 parties en 89 s) ; je prends **4,5 s** pour le quatuor maladroit, humain, bon, expert (hypothèse : parallélisme inconnu) | horodatages des fichiers `codex-r2/proto-neon/tools/codex-r2/recus/85cf910fe2b5e7a6-*`, boucle séquentielle de `mesurer.mjs` |
| Navigateur, simulé sans dessin | 10 s la partie ; une passe 8 pilotes × 50 graines ≈ 1 h | `src/02-regles.js:760` (`coutPartie: 10`, `passe: 3600`) |
| Chromium | un à la fois, verrou `/tmp/snake-chromium-chef.lock` | `REPRISE.md` |
| Mémoire à 02 h 10 | pages libres 8 420 × 16 Ko ≈ 0,13 Go ; inactives 136 258 × 16 Ko ≈ 2,1 Go ; processus `node` ≈ 0,2 Go chacun | `vm_stat`, `ps` (24/10, 02 h 10) ; `REPRISE.md` : « ≤ 4 sessions Codex à la fois, 2,3 Go libres à 02 h » |
| Quota Claude | semaine 73 %, fenêtre 5 h 15 % (remise à 05 h 10) | `get_usage`, 24/10 02 h 16 |

Règles de lancement : **1 Chromium + 1 VM Node en parallèle** (≈ 0,9 Go, hypothèse) ; un second processus VM seulement si `vm_stat` (libres + inactives) ≥ 1,5 Go après démarrage ; **les mesures en temps réel (p95, calage audio) se font VM suspendue** (`kill -STOP` puis `-CONT`) et deux fois (règle des aberrations). Le M5 n'est pas compté : la clé SSH dédiée est retirée depuis le 12/10 et sa remise exige un geste de la propriétaire. Les lancements VM sont faits par moi en `run_in_background`, sans agent qui relit les sorties.

**Principes** (écrits dans le protocole avant toute mesure) :
1. **Reçus d'abord, analyse ensuite** : chaque partie VM garde son journal complet en gzip (≈ 61 Ko, `codex-r2/.../recus` : 22 Mo pour 360 parties). Quand une définition est corrigée (leçon p34), on recalcule sans rejouer. Un reçu invalide si `N.journal.compte() > N.journal.taille()` (F12).
2. **Oracle indépendant du module testé** : le tempo se mesure sur le signal rendu, pas sur `N.music.tempo()` ; le calage sur des onsets du rendu, pas sur la carte r1 ; l'évitabilité d'une mort sur des sondes rejouées, pas sur le champ `visibleDepuis` seul.
3. **VM détecte, Chromium décide, jury juge** : aucune porte n'est fermée par la VM seule (R-13 : 5 contre 8 flashs/s entre VM et navigateur).
4. **Les auteurs ne voient ni la grille ni les notes** du jury : seulement la liste de défauts prouvés (fichier, temps) et les écarts chiffrés des métriques.

### 2.2 Graines, pilotes et ce qui est scellé avant de commencer

| Ensemble | Contenu | Usage |
|---|---|---|
| **TUNE** | graines 1 à 50 | visible des auteurs, sert aux essais et au débogage |
| **VALID** | graines `SHA-256(hash_protocole ‖ "VALID" ‖ i) mod 2³¹`, i = 1 à 200 | agrégats seulement, jamais lues une par une pendant le réglage ; ≤ 2 lectures par lot |
| **TEST** | même formule avec « TEST », i = 1 à 300 | une seule lecture, sur la build gelée F |
| **Pilotes figés (P4)** | maladroit, humain, bon, expert, code et SHA-256 écrits dans le protocole ; tout changement = nouvelle référence, jamais une retouche | mesure principale |
| **Sentinelles** | inerte (meurt), tourneur (meurt), kamikaze (meurt), dieu (finit, durée ; **aucune porte sur sa mort**) | « le jeu reste un jeu » |
| **Famille hold-out H** | 12 pilotes tirés **au gel de F** (jamais avant), construits par un enveloppe de `window.__PILOT` sans toucher `85-pilote.js` (`activer` chaîne déjà `ancienHook`, `src/85-pilote.js:411`) : base ∈ {humain, bon} ; retard supplémentaire ∈ [0, 150] ms ; bruit de cap ∈ [0, 12]° retiré toutes les 0,25 s ; trous d'attention (λ = 0,05/s, durée 0,3 à 0,8 s) ; pouvoir et APOGÉE coupés une fois sur deux ; choix de cartes aléatoire avec q ∈ [0, 0,6] ; 3 des 12 jouent leurs changements de cap sur les temps (lecture de `N.rythme`, s'il existe) | sur-réglage, variété des cartes, effet du rythme sur un joueur qui l'exploite |

Les consignes des auteurs ne citent que TUNE ; la formule des graines n'est écrite que dans `tools/autotest/PROTOCOLE.json`, qui porte son SHA-256 dans `INCROYABLE.md`. Le journal des sessions Codex est relu pour détecter une lecture de ce dossier (hypothèse d'un risque faible, contrôle quasi gratuit).

### 2.3 Étages VM et navigateur

**VM Node (moi, un processus, ≈ 4,5 s/partie, hypothèse)**

| Étage | Contenu | Parties | Durée |
|---|---|---:|---:|
| Référence B0 | P4 × 100 graines (TUNE 1-50 + VALID 1-50), pointe `462582e` | 400 | 30 min |
| Validation de l'instrument | 10 références `e1bdc6f` identiques (procédure `codex-r2/.../validation-vm.json`) ; couverture des IC sur 2 000 tirages synthétiques (IC 95 % doit contenir la vraie valeur 93 à 97 % du temps) ; sondes sur cas à verdict connu | 10 + calcul | 20 min |
| Plancher A/A′ | B0 avec retard pilote + 1 pas (8,3 ms) et flux pilote décalé ; P4 × 50 TUNE | 200 | 15 min |
| Témoins dégradés | D1 apparitions décalées d'une phase aléatoire, D2 pulsation coupée, D3 difficulté × 1,5, D4 télégraphes − 40 % ; P4 × 20 graines | 320 | 24 min |
| Nouvelle référence B1 | pointe + i1 (le report change la base : p44 difficulté, p35 flashs), P4 × 100 | 400 | 30 min |
| Lot, criblage (A) | P4 × 20 TUNE, appariés à B1 | 80 | 6 min |
| Lot, décision (B) | P4 × 100 (TUNE 1-50 + VALID 1-50), appariés | 400 | 30 min |
| Factoriel 2 × 2 | B1 / + r2b / + d1 / + les deux ; P4 × 25 TUNE | 400 | 30 min |
| Hold-out (C) | H × 25 VALID, au jalon 06 h 00 (puis H × 15 dans TEST) ; hold-out de jalon : famille tirée à 05 h 55 | 300 | 22 min |
| Adaptation (D) | sandbagging, fatigue, changement de niveau en cours de partie (`N.pilote.niveau` rappelé), alternance par vague ; 4 scénarios × 25 | 100 | 8 min |
| TEST (E) | F contre B1, P4 × 100 (TEST 1-100) × 2 builds + H × 15 × 2 | 1 160 | 87 min (45 min à deux processus) |

Total : ≈ 4 400 parties (4 410), ≈ 350 min en un seul processus pour 360 min disponibles (≈ 310 min si TEST passe à deux processus) : serré ; sans second processus, TEST glisse en extension. Un lot accepté coûte A + B = 36 min ; t1 et w1 passent seulement l'étage A.

**Navigateur (moi, un Chromium, verrou)**

| Tâche | Durée (hypothèse sauf mention) |
|---|---:|
| Portes 1, 2, 6 sur B0 : `node tools/mesure/lancer.mjs --seulement R-13,R-14,R-20,R-21 --rapide` (batterie rapide complète = 968 s, `SORTIE.md`) | 25 min |
| p95 R-20, VM suspendue, deux passes | 15 min |
| Banc témoin du calage audio ↔ image : page d'essai qui planifie un clic sur l'horloge audio et allume un éclair à δ ∈ {0, 40, 80, 120} ms ; doit retrouver δ à ± 8 ms (une demi-image) | 15 min |
| Banc témoin tempo et hauteur : sinusoïde 440 Hz étirée de 0, 8, 12 % avec et sans changement de hauteur ; l'analyseur doit retrouver tempo à ± 1 % et hauteur à ± 3 cents (`N.music.renderOffline`, `src/30-music.js:2640`) | 10 min |
| Vérification d'une livraison (build 0, R-13, R-14, partie complète, 3 profils) | 20 min par livraison × 3 |
| Dossiers légers de calibration du jury × 3 | 3 × 15 min |
| Portes 1, 2, 6 sur F + aventure complète | 20 min |
| p95 sur F, deux passes | 15 min |
| Calage audio réel sur F : 2 profils × 3 min en temps réel × 2 passes, onsets du rendu hors ligne ; tempo et hauteur des scènes désignées | 25 min |
| Dossiers α et β de F | 40 min |
| **Total** | **≈ 270 min** |

**Mesure du calage (porte 3).** Les événements (apparitions, tirs ennemis, départs de vague) sont horodatés dans le journal en temps de jeu ; leur écart au temps audio se lit sur un oracle indépendant : un rendu `OfflineAudioContext` des blocs réellement joués (journal `bloc`) passé dans un détecteur d'onsets écrit par un autre auteur que 31-rythme, avec la latence de sortie lue au moment de la mesure (et loguée si l'API ne la donne pas, auquel cas la porte est « non mesurable sur Chromium, à vérifier sur l'iPhone », pas « tenue »). Résultats publiés : p50, p95, max par type d'événement, part ≤ 40 ms, et concentration de phase.

### 2.4 Comparer deux builds

1. **Mêmes graines, flux pilote dérivé de la graine** (appariement par graine). Unité statistique = la graine, jamais la partie ni l'événement.
2. **Estimateurs** : différence appariée avec **bootstrap sur les graines (10 000 rééchantillons, IC 95 %)** ; proportions (part CYCLOPE, victoires) : différence appariée + test de McNemar exact ; durées : Kaplan–Meier censuré à 540 s et test de rang logarithmique stratifié par graine ; **Holm** sur les 8 à 10 métriques primaires.
3. **Plancher de bruit A/A′** (ligne du tableau § 2.3) : le déterminisme rend A/A identique (variance nulle, inutile) ; on perturbe donc de façon minimale (retard + 1 pas, flux pilote décalé). Elle donne le bruit résiduel et **ρ, la corrélation d'appariement** : après la première divergence la trajectoire décorrèle (chaos), l'appariement ne réduit la variance que de (1 − ρ) — hypothèse tant que ρ n'est pas mesuré à 03 h 55.
4. **Effet minimal détectable à 80 % de puissance** (sans appariement, donc pessimiste) : proportion près de 35 % : ± 26,7 pts à n = 50, **± 18,9 pts à n = 100**, ± 10,9 pts à n = 300 ; médiane de survie (σ = 60 s) : ± 42 s à n = 50, **± 30 s à n = 100**, ± 17 s à n = 300. Conséquence : à n = 100 on ne détecte **que des écarts de 19 pts ou de 30 s** ; les boucles courtes se pilotent sur des **métriques continues par vague** (dégâts reçus, temps de survie dans la vague, intensité, nombre d'événements sur le temps) qui ont beaucoup plus de données par graine, les portes à seuil ne se tranchent qu'à l'étage B (n = 100) puis E (n = 100, et 300 pour les cas indéterminés).
5. **Trois verdicts par porte**, jamais un deux-états : **ACQUIS** (IC 95 % entièrement dans la fenêtre), **ÉCHEC** (entièrement dehors), **INDÉTERMINÉ** (le reste) → on étend à n = 300 sur ce pilote seulement (≈ 20 min), puis on publie « indéterminé » sans tour de plus.
6. **Règle de rétention d'un changement** : retenu si (a) aucune porte bloquante dégradée au-delà de 2 × le plancher A/A′, (b) au moins une métrique cible améliorée avec IC excluant 0, (c) aucune régression au-delà du plancher sur le hold-out. Sinon retour arrière. Un changement = une hypothèse et une métrique écrites avant la mesure.
7. **Aberrations** : critère écrit avant de regarder le classement — valeur > 2 × la médiane du même pilote sur la même métrique, partie avec erreur, borne de 540 s, échec transitoire ; chaque aberration est réitérée une fois **avec flux pilote différent** (la graine identique redonnerait le même résultat) ; confirmée = gardée et signalée, sinon écartée, avec valeurs avant/après dans le rapport. En navigateur temps réel (p95, calage) : deux passes systématiques, flagrant si l'écart entre passes dépasse 2 × le plancher.

### 2.5 Ne pas se sur-régler sur les pilotes

1. **Pilotes gelés par hash** pour toute la nuit ; une idée de pilote nouveau s'ajoute à la famille, ne remplace pas.
2. **TUNE / VALID / TEST** (§ 2.2) : l'auteur voit TUNE, la décision se prend sur VALID, la vérité sur TEST lu une fois.
3. **Hold-out tiré après le gel** : 12 pilotes dont les paramètres sont tirés (`os.urandom`) à l'instant du gel de F, donc impossibles à apprendre ; la plage de tirage est écrite avant.
4. **Un levier, une métrique** (pré-enregistrement) ; d1 garde ≤ 4 leviers bornés à ± 25 %, ajustés seulement entre deux vagues (`consignes/codex-d1.md`).
5. **Tests d'adaptation qui visent la tricherie** (étage D) : *sandbagging* (inerte 40 s puis bon : gain de difficulté ≤ 10 % par rapport au bon honnête) ; *fatigue* (expert dont le retard passe de 50 à 150 ms à t = 150 s : réajustement en ≤ 2 vagues) ; *changement de niveau* (maladroit puis bon à la vague 3 : montée ≤ + 25 % en ≤ 2 vagues) ; *alternance* (bon, maladroit, bon… : pas plus d'une inversion de sens par 4 vagues).
6. **Transfert** : une amélioration constatée sur le bon doit se retrouver sur l'humain et sur ≥ 8 des 12 hold-out ; sinon c'est de l'ajustement à la politique.
7. **Budget de passes** inchangé (3 par piste) ; ≤ 2 lectures de VALID par lot ; **alarme à deux** : même porte en échec à deux passes consécutives, ou un tour qui ne ferme aucune porte → arrêt, diagnostic écrit, jamais « un tour de plus ».
8. **Limite à dire une fois** : tous ces pilotes sont des politiques synthétiques ; seule la partie de la propriétaire sur son iPhone échappe à ce biais.

### 2.6 Planning minute par minute (heure de Paris ; T0 = 02 h 30)

Légende : **M** = moi (Bash, Chromium), **V** = VM Node lancée par moi, **A** = agents Claude, **C** = sessions Codex, **J** = jurés. Les durées sont des hypothèses sauf quand une source est citée.

| Heure | Durée | Voie | Tâche | Sortie · arrêt |
|---|---:|---|---|---|
| 02 h 30 → 02 h 45 | 15 min | M | **Protocole scellé** : `tools/autotest/PROTOCOLE.json` (graines, hash des pilotes, métriques primaires, plancher, MDE, règles d'arrêt, grille du jury, ancres) ; SHA-256 noté dans `INCROYABLE.md` | hash écrit · aucune mesure avant |
| 02 h 30 → 03 h 20 | 50 min | A | 2 agents Claude neufs (auteurs de l'instrument, pas du jeu) : **inst** (`lot.mjs` reprenable après coupure avec `REPRISE.md`, `stats.mjs`, `enveloppe.mjs`, sondes d'évitabilité et de journal tronqué ; part de `tools/mesure/vm-p3c.mjs` qui exporte déjà `sources`, `monde`, `partie`) et **temoins** (D1 à D4 dans des copies temporaires) | livrés · relus par Codex à 03 h 20 |
| 02 h 35 → 03 h 05 | 30 min | V | **B0** : P4 × 100, reçus gzip complets, script minimal sur `vm-p3c.mjs` (déjà validé 10/10, `validation-vm.json`) | 400 reçus |
| 02 h 35 → 03 h 00 | 25 min | M | Portes 1, 2, 6 sur B0 (R-13, R-14, R-21) | baseline chiffrée |
| 03 h 10 → 03 h 25 | 15 min | M | p95 R-20 sur B0, VM suspendue, deux passes | p50/p95 B0 |
| 03 h 20 → 03 h 40 | 20 min | C | Relecture indépendante de l'instrument par une session Codex (créneau libéré par la première fin de session ; lecture seule) | avis écrit |
| 03 h 20 → 03 h 40 | 20 min | V | **Validation de l'instrument** (10 références, couverture des IC, sondes) | tout vert, sinon arrêt |
| 03 h 25 → 03 h 50 | 25 min | M | Bancs témoins : calage audio ↔ image (δ retrouvé ± 8 ms) puis tempo et hauteur (± 3 cents) ; VM suspendue 10 min | bancs « qualifiés » ou réparés |
| 03 h 40 → 03 h 55 | 15 min | V | **Plancher A/A′**, ρ, tableau des effets minimaux | plancher publié |
| 03 h 55 → 04 h 20 | 25 min | V | **Témoins D1–D4** : matrice de détection (chaque métrique doit signaler *son* témoin, IC excluant 0, et pas les autres) | matrice · **si une métrique primaire ne détecte rien, elle sort de la liste** |
| 04 h 00 | 10 min | M | **Point chiffré n° 1** dans `INCROYABLE.md` : instrument validé ?, plancher, MDE, livraisons reçues, quota Claude | |
| dès 04 h 00 | cycle 70 min | M, V, C | **Cycle d'une livraison** (FIFO : i1 → r2b → d1 → t1 → w1 ; jamais deux intégrations à la fois) : T+0 Chromium 20 min (build 0, R-13, R-14, partie complète, 3 profils) ; T+20 intégration 10 min (`integrer.sh`) ; T+30 VM A 6 min puis B 30 min ; T+70 décision (rétention § 2.4) et retour à l'auteur (défauts prouvés + écarts chiffrés, pas de notes). **Après i1 : nouvelle référence B1** (30 min VM) | décision écrite par lot · 3 passes/piste max |
| 04 h 20 → 05 h 05 | 45 min | M | Dossiers légers (3 séquences : début, drop, WARP ; 12 planches) : **V0** (`gh-pages` 9733710, tag `snake2975-v0`), **B1**, **témoin sabotage** (D1 + D3) | 3 dossiers. Si le banc de j1 n'est pas livré à 04 h 20, **A** bâtit le banc minimal (captures événementielles en repartant de `tools/jury/partie.mjs`, 35 min) |
| 05 h 05 → 05 h 55 | 50 min | J | **Calibration du jury** : 3 dossiers × (5 regards Claude + 3 regards Codex) = 24 sessions ; Claude en parallèle (≈ 15 min), Codex par vagues de 4 (≈ 36 min) | notes, ancres, tests de complaisance (§ 3.4) |
| 05 h 00 → 06 h 00 | 60 min | V | **Factoriel 2 × 2** (si r2b et d1 intégrés) 30 min, puis **hold-out C** 22 min | interactions r2b × d1 · transfert |
| 05 h 55 → 06 h 05 | 10 min | M | **Décision jury** : si les jurés distinguent le sabotage de V0 et B1 et ne se contredisent pas (§ 3.4), le jury est « interprétable » ; sinon **une seule** réécriture de la grille (ou du dossier), une seule recalibration (+ 45 min) ; si l'échec persiste → « note non interprétable », aucun 9,5 revendiqué | verdict d'instrument du jury |
| 06 h 00 | 10 min | M | **Point chiffré n° 2** | |
| 06 h 05 → 06 h 30 | 25 min | V + M | Étage D (adaptation) 8 min ; dernier lot accepté ou refusé | |
| **06 h 30** | — | M | **Gel de F** : hash des sources et du bundle ; tirage du hold-out (`os.urandom`) ; **toute livraison arrivée après entre dans le bloc d'extension**, jamais dans F | F figée |
| 06 h 30 → 07 h 15 | 45 min | V | **TEST** sur 2 processus (si RAM ≥ 1,5 Go ; 87 min sur un seul) : F contre B1, P4 × 100 (TEST) × 2 + H × 15 × 2 | 1 160 reçus |
| 06 h 30 → 06 h 50 | 20 min | M | Portes 1, 2, 6 sur F, 3 profils, zéro erreur, une aventure complète | |
| 06 h 50 → 07 h 05 | 15 min | M | p95 sur F, VM suspendue, deux passes | |
| 07 h 05 → 07 h 30 | 25 min | M | Calage audio réel (2 profils × 3 min × 2 passes, VM suspendue) ; tempo et hauteur des scènes désignées | porte 3 et 4 chiffrées |
| 07 h 30 → 08 h 10 | 40 min | M | **Dossiers α et β de F** (graines TEST différentes, échantillon protocolaire § 3.2, défauts plantés) | 2 dossiers scellés par hash |
| 08 h 10 → 08 h 50 | 40 min | J | **Jurys A (α) et B (β)** : 2 × (5 regards Claude + 5 regards Codex) = 20 sessions ; Claude 15 min en parallèle, Codex par vagues de 4 (≈ 36 min) | notes brutes |
| 08 h 50 → 09 h 05 | 15 min | M | **Agrégation par script** (moyennes par famille, IC bootstrap sur jurés × séquences, tests de complaisance, règles de verdict) ; **point chiffré n° 3** et verdict | rapport final, distinction sous-tâche / palier / chantier |

Durée de la boucle : 02 h 30 → 09 h 05 = **6 h 35**, soit au-delà des 6 h.

**Si une livraison Codex glisse** : la file passe, jamais d'interruption d'une mesure en cours ; sur Chromium, la vérification d'une livraison passe avant les dossiers de calibration (qui glissent, la marge de 05 h 05 à 05 h 55 absorbe ≈ 30 min) ; une livraison reçue pendant la fenêtre exclusive (p95, calage) attend la fin de la fenêtre. **Si le jury ne passe pas la calibration** : arrêt du jury (pas de boucle de notes), la boucle d'autotests continue seule, le verdict reste « porte 7 non interprétable ».

**Bloc d'extension (2 h au plus à la fois)** : décidé à 08 h 50 seulement si le dernier bloc a fait passer au moins une porte d'ÉCHEC à ACQUIS **ou** amélioré une métrique primaire de plus que son MDE ; chaque extension ouvre une nouvelle build gelée, de nouveaux jurés, et reste dans les 3 passes par piste. Sinon : « lot arrêté » avec résultats, raison exacte et reste à faire.

**Arrêts écrits avant** (en plus de ceux de `INCROYABLE.md`) : une métrique qui ne détecte aucun témoin sort de la liste ; instrument non validé = arrêt avant tout candidat ; deux portes identiques en échec à deux passes = diagnostic ; budget VM ≤ 6 000 parties par bloc de 6 h ; budget Chromium ≤ 300 min ; jury ≤ 3 dossiers de calibration et 2 dossiers de verdict par build gelée, jamais de jury supplémentaire sur la même build ; plafond Claude suivi à chaque point (semaine à 73 % à 02 h 16).

---

## 3. Le jury

### 3.1 Composition

Je propose **cinq regards, chacun tenu par deux familles de modèles**, soit 10 jurés, plus des mesures déterministes à la place du regard « confort et performance ». Un regard ne se note que sur ce qu'il peut percevoir ; le reste est déclaré **non jugeable** (champ prévu), pas inventé.

| # | Regard | Ce qu'il peut percevoir | Reçoit (en plus de la fiche) | Remarque |
|---|---|---|---|---|
| 1 | **Joueuse iPhone** (30 ans, pouce, dix minutes dans le métro) | prise en main, lisibilité, équité des morts, confort | planches paysage et portrait, **toutes** les morts de 3 parties de l'humain (séquences de 4 s avant la mort), l'écran de fin | doit lister chaque mort qu'elle n'explique pas |
| 2 | **Game design** | courbe, adaptation, variété, progression | courbes des leviers d'adaptation par pilote, tables de vagues, causes de mort, choix de cartes | |
| 3 | **Rythme** | calage, retenue, drops, tempo | **tapis rythmique** (§ 3.2), images à ± 1/8 de temps autour de 4 drops, 3 breaks, 2 changements de tempo, courbe du tempo | ne juge pas le timbre (il n'entend rien) |
| 4 | **Direction artistique** | pixels, palette, lisibilité, WARP, films | planches pleine résolution écran et tampon, 4 images par film | |
| 5 | **Avocat du diable** (le joueur qui s'ennuie) | temps morts, morts injustes, répétitions, ruptures | échantillon uniforme **et** pires cas (§ 3.2), liste de toutes les morts | note = 10 − pénalités ; compte les défauts graves |

**Remplacement proposé du regard « confort et performance » de `INCROYABLE.md`** : ses données sont déjà des seuils mesurés (R-13, R-14, p95, zéro erreur) ; un juré ne ferait que les recopier (F15). Il devient une porte déterministe, avec l'iPhone de la propriétaire en juge.

**Familles et modèles** : Claude = Sonnet 5.5 niveau extra, sessions neuves (règle de la propriétaire) ; Codex = GPT-6.1 Sol, effort Très élevé (règle « annoter une référence »), sessions `codex exec` neuves, jamais un auteur de lot (d1, r2b, j1, i1, t1, w1 exclus). Coût Claude : 15 sessions en calibration + 10 au verdict (5 par jury) = 25 sessions, et 19 sessions Codex (9 + 10) ; **à ≈ 100 à 150 k jetons par session Claude (hypothèse) c'est lourd quand la semaine est à 73 %** : si le plafond dépasse 90 %, je garde Claude sur les regards 2, 3, 5 et Codex sur les cinq (l'accord des deux familles se mesure alors sur trois regards).

### 3.2 Ce qu'il reçoit, et comment le dossier est composé

Le dossier est produit **par un script, à partir d'un échantillon écrit avant** (graines et règles dans `PROTOCOLE.json`), pas à la main :

1. **Échantillon uniforme** : 6 instants par partie tirés par une graine pré-enregistrée (il remplace le pas fixe de 6 s).
2. **Échantillon d'événements** : les 3 premiers drops, 2 premiers breaks, chaque entrée de vague 1 à 5, entrée et sortie du WARP, entrée du CYCLOPE, la mort et la fin.
3. **Pires cas** : les 3 temps d'image les plus longs, les 3 morts au plus court préavis, la seconde la plus chargée en flashs.
4. **Un défaut planté** par dossier (« canari ») : une séquence où l'on a décalé les événements de + 120 ms, ou une mort construite sans télégraphe, tirée au sort dans une liste écrite à l'avance.
5. **Format** : planches de contact (6 × 4 images) ; **tapis rythmique** de 30 s : voie 1 signal et onsets du rendu hors ligne, voie 2 grille des temps, voie 3 événements (apparitions, tirs, vagues, drops), voie 4 énergie visuelle (pixels modifiés par image) ; 30 images environ par juré (≈ 1,5 k jetons l'image, hypothèse).
6. **Aveugle** : build désignée par un code tiré au sort, noms de fichiers neutres, aucun « avant/après », aucun rapport de constructeur ni médiation.
7. **Deux passes de notation** : la **passe 1** se fait sur les images seules ; l'**annexe de mesures** (R-13, R-14, p95, causes de mort, courbes d'adaptation) n'est donnée qu'après la remise de la note 1 ; la note 2 est la note finale. L'écart note 2 − note 1 mesure l'ancrage par les chiffres. **La porte 7 se lit sur la passe 1 pour les regards 1, 3, 4, 5** (perceptibles sans chiffres) et sur la passe 2 pour le regard 2.
8. **Deux dossiers de verdict** (α et β, graines TEST distinctes) pour la même build gelée : le jury A lit α, le jury B lit β ; ils sont lancés ensemble, comptent tous les deux, **jamais de troisième**.

### 3.3 Consigne et sortie d'un juré

Consigne (extrait) : tu es [regard] ; tu n'as lu aucun rapport ; tu ne lis que le dossier ; **liste d'abord au moins cinq défauts, dont trois avec preuve (fichier, temps)**, puis la note ; une note > 9 exige zéro défaut grave et trois moments forts prouvés, sinon plafond 8,5 ; déclare ce que tu ne peux pas juger.

Sortie JSON : `{regard, note_passe1, note_passe2, defauts_graves[{enonce, preuve:{fichier,temps}}], defauts_mineurs[], moments_forts[{preuve}], defauts_vus_dans_les_sequences_plantees[], non_jugeable[], confiance}`.

Grille (les ancres s'étalonnent en § 3.4, pas à la main) : 9 = aucun défaut grave, au moins 3 moments forts prouvés par séquence, au plus 2 défauts mineurs ; 10 = rien à reprocher et une surprise positive prouvée ; 7 = un défaut grave évitable ou plusieurs défauts mineurs récurrents ; 5 = jouable mais un regard entier déçoit ; 3 = bug visible à chaque minute.

### 3.4 Repérer un juré complaisant, et croiser avec Codex

**Étalonnage sur ancres (étape « calibration », § 2.6, 05 h 05)** : chaque juré note, dans la **même session, en aveugle et dans un ordre tiré au sort**, V0 (la version 0 publiée le 18/10), B1 (la pointe avec le report i1) et le **témoin sabotage** (rythme décalé au hasard + difficulté × 1,6). Les jurés répétés sur deux dossiers identiques renommés servent à mesurer l'instabilité.

| Test | Définition | Un juré est écarté ou la porte non interprétable si… |
|---|---|---|
| Discrimination | note(sabotage) | ≥ 7, ou note(sabotage) ≥ note(V0) − 1 |
| Défauts plantés | part des canaris retrouvés par le juré (et leur enjeu) | < 70 % sur la moyenne des regards perceptibles |
| Platitude | étendue des sous-notes d'un juré | toutes ≥ 9 avec étendue < 1 |
| Stabilité | même dossier présenté deux fois (noms mélangés) | |Δ| > 1 |
| Preuves | `preuve.fichier` + `preuve.temps` résolus par script ; énoncé « cite-t-il un fait vérifiable ? » classé par **Jev** (une question simple, seuil calibré sur ces 24 sessions, aucune donnée personnelle) | > 20 % de preuves introuvables ou génériques |
| Accord de rang | corrélation de Spearman avec les autres jurés sur les 3 dossiers | négative |
| Ancrage | écart note 2 − note 1 | > 0,8 en moyenne : le juré suit les chiffres, pas ce qu'il voit |

**Lecture de « 9,5 »** : elle n'est **valide** que si, sur les dossiers de verdict, les cinq conditions suivantes tiennent ensemble : (1) l'étalonnage a distingué sabotage, V0 et la build (écart V0 → F ≥ 1,5 point) ; (2) détection des canaris ≥ 70 % ; (3) **moyenne ≥ 9,5 dans chacune des deux familles** (c'est le minimum des familles qui compte, pas la moyenne générale) ; (4) accord Claude/Codex ≤ 1 point sur chaque regard, sinon désaccord publié sans moyenne ; (5) les deux jurys A et B passent. Sinon le résultat est publié « note non interprétable » avec les notes brutes, et ne ferme pas la porte.

**Croiser avec Codex.** Même dossier, sessions indépendantes, aucune note partagée, le juré Codex tourne dans un dossier de travail vide (`codex exec -C`) ; la **liste des fichiers qu'il a ouverts** est lue dans son journal : s'il a ouvert autre chose que le dossier, sa session est écartée. Par regard : moyenne par famille ; si |Δ| ≤ 1 → accord ; si 1 < |Δ| ≤ 1,5 → publié tel quel ; si |Δ| > 1,5 → **arbitrage sur les faits seulement** par un troisième juré neuf (Opus 5.5 xhigh) qui reçoit les deux justifications et les preuves contestées, et rend le verdict sur ces faits, pas une nouvelle note. L'inventaire des défauts (graves et mineurs) est comparé famille contre famille (κ de Cohen pondéré par la gravité) ; deux désaccords > 1,5 sur le même regard obligent à recalibrer ce regard une fois, pas à moyenner.

**Auteur ≠ juge** : l'instrument qui produit le dossier est écrit par un agent Claude et relu par Codex ; les auteurs de lots (Codex) ne produisent ni ne notent ; la cheffe lance le script, ne choisit pas l'échantillon.

---

## 4. Métriques objectives qui doivent accompagner la note

Les cibles marquées « (hyp.) » sont **provisoires** : elles sont fixées sur B1 et sur la matrice des témoins à 04 h 00, avant toute candidate, puis scellées. Une métrique que les témoins ne détectent pas sort de la liste.

### 4.1 Rythme et tempo

| Métrique | Définition | Source · lieu | Cible |
|---|---|---|---|
| Calage | part des apparitions, tirs ennemis et départs de vague à ± 40 ms d'un temps ; p50, p95, max par type | journal × onsets du rendu hors ligne · Chromium temps réel | ≥ 95 % (porte de la propriétaire) |
| Concentration de phase | longueur moyenne du vecteur de phase (0 = uniforme, 1 = tous sur le même point du temps) | idem | ≥ 0,9 (hyp.) |
| Drop → moment fort | délai entre drop de la carte et premier moment fort (kills groupés, explosion, rafale) ; effectif de drops observés publié | journal `rythme` · VM puis Chromium | 100 % ≤ 1 temps ; **si n < 30 drops observés, verdict indéterminé** (la carte r1 n'en compte que 13 sur 7 morceaux) |
| Retenue au break | énergie visuelle (pixels modifiés par image) pendant le break ÷ médiane des 4 mesures précédentes | tampon · VM | ≤ 0,6 (hyp.) |
| **Visibilité du rythme** (anti-Goodhart) | énergie visuelle sur le temps ÷ hors temps, dans le budget `aireMax` | tampon · VM | ≥ 1,3 (hyp.) ; empêche d'éteindre le rythme pour passer R-13 et R-14 |
| Rafales | nombre maximal d'apparitions et de tirs sur un même temps ; part des morts dans les 600 ms qui suivent une rafale quantifiée | journal · VM | p99 ≤ 5 (hyp.) ; max observé par r2 : 8 |
| Tempo effectif | BPM mesuré sur le signal rendu (autocorrélation des onsets) ÷ BPM de base, par scène désignée | `renderOffline` · Chromium | ≥ 1,08 |
| Hauteur | écart de hauteur après étirement (suivi de la fondamentale et du chromagramme) | idem | ≤ 10 cents, banc validé à ± 3 cents |
| Raccord | écart entre le changement de tempo et le début de mesure | journal `bloc` | ≤ 10 ms (`R25`) |

### 4.2 Flux (tension et respiration)

| Métrique | Définition | Cible |
|---|---|---|
| Temps mort | part du temps de jeu en séquences ≥ 4 s sans ennemi hostile actif ni télégraphe | ≤ 8 % (hyp.) |
| Plus long silence | p95 par partie de l'intervalle sans événement de combat | ≤ 4 s (hyp.) |
| Contraste d'intensité | coefficient de variation de l'intensité (vivants + télégraphes + dégâts) par vague | ≥ 0,35 (hyp.) |
| Zone de défi | part du temps passée avec des dégâts par minute dans la bande visée par d1 | ≥ 60 % (hyp.) |
| Respirations | existant : R-15 (≥ 8 s sous 40 % du pic après chaque pic) | inchangé |
| Cadence du joueur | changements de cap > 20°, accélérations, pouvoirs et LASSO par fenêtre de 10 s | ni inerte ni frénétique, bandes fixées sur B1 |

### 4.3 Morts injustes

| Métrique | Définition | Cible |
|---|---|---|
| Mort juste | R-08 : danger visible depuis ≥ 0,6 s sur ≥ 95 % des morts, instrument réparé (p29/p31) | ≥ 95 % |
| **Sonde d'évitabilité** | pour 60 morts de bon et d'expert, par rejeu déterministe jusqu'à 1,0 s avant la mort puis 9 sondes (8 caps à 45° d'écart + accélération) : la mort est « évitable » si une sonde survit 1,5 s ; aucune capture d'état n'existe, donc un rejeu depuis le début par sonde (hypothèse à vérifier à 03 h 20) | part sans échappatoire ≤ 5 % (hyp.) ; ≈ 25 à 30 s par mort, ≈ 25 min, au jalon et au gel seulement |
| Mort par apparition | mort causée par un ennemi apparu < 1 s avant et à < 120 px | 0 |
| Mort sans télégraphe | R-07 | 0 |
| Mort après changement de levier | mort dans les 2 s suivant un ajustement de l'adaptation | 0 |
| Répartition des causes | entropie des causes, par pilote | publiée |

### 4.4 Variété

| Métrique | Définition | Cible |
|---|---|---|
| Entropie des types d'ennemis | entropie normalisée par vague | ≥ 0,6 (hyp.) |
| Distance entre parties | distance d'édition médiane entre séquences d'événements de deux graines | ≥ 30 % (hyp.) |
| Répétition | taux de compression (LZ) de la suite d'événements d'une vague | à fixer sur B1 |
| Scènes distinctes | quartiers, VOL, WARP, intermèdes par partie | publié |
| Cartes | taux de choix de chaque carte **chez les 12 pilotes hold-out à choix aléatoire** (les pilotes figés choisissent dans un ordre fixe : leur taux ne mesure que leur ordre) | aucune < 3 % ni > 40 % (hyp.) |

### 4.5 Sensation de progression et d'adaptation

| Métrique | Définition | Cible |
|---|---|---|
| Gratifications | intervalle p95 entre deux gratifications (carte, niveau d'arme, déblocage, vie) | ≤ 45 s (hyp.) |
| Puissance / menace | DPS du joueur ÷ PV total de la vague, par vague, pour le bon | couloir fixé sur B1 |
| Cadence de nouveauté | une nouveauté (ennemi, arme, scène) au moins toutes les 60 s sur 5 min | oui (hyp.) |
| Adaptation, bornes | ± 25 % ; 0 changement pendant une vague | 100 % (journal) |
| Adaptation, stabilité | inversions de sens par 4 vagues ; vagues pour converger à ± 10 % | ≤ 1 ; ≤ 2 |
| **Rang préservé** | corrélation de Kendall entre le niveau des 4 pilotes et leur score brut sous adaptation | τ = 1 |
| **Écart entre pilotes** | (max − min) des 4 médianes de survie, avec adaptation ÷ sans, mêmes graines | **rapport entre 0,2 et 0,6**, soit une réduction de 40 % à 80 % (borne de la propriétaire : au moins 40 % ; borne haute ajoutée : on ne supprime pas la maîtrise) |
| Sandbagging | gain de difficulté d'un « bon qui meurt exprès » | ≤ 10 % |
| Fenêtre de survie | médiane de survie de chacun des 4 pilotes | 150 à 240 s, verdict à trois états (§ 2.4) |
| Part CYCLOPE | `phase/arrivee` uniquement (jamais un panneau, leçon p34) | 20 à 50 %, n = 100 puis 300 |
| Plafond | « surhumain » (expert, retard 30 ms, sans god) : au moins 1 victoire et 1 mort sur 20 parties | oui (remplace la mort de dieu) |

### 4.6 Confort et robustesse (déterministe, avec l'iPhone en juge)

R-13 ≤ 3 flashs/s au-delà de 6,6 % d'aire, R-14 ≤ 12 % d'images secouées, p95 ≤ 11 ms (Chromium) et ≤ 16,7 ms (iPhone de la propriétaire, hors bancs), zéro erreur jeu/console/page, zéro journal tronqué, palette 16 couleurs, cyan réservé. Chaque métrique est publiée avec **valeur, IC 95 %, n et verdict à trois états**, jamais « ok » seul.

---

## 5. Décisions à valider (ma recommandation en tête)

| # | Décision | Je propose | Raison · ce qu'on perd | Alternative |
|---|---|---|---|---|
| D1 | Porte 5 | Réécrire comme § 4.5 : survie censurée, `phase/arrivee` seule, n = 100 puis 300, « dieu » remplacé par « surhumain », écart réduit de **40 à 80 %** (rapport 0,2 à 0,6), rang préservé | F1 à F4 ; on perd le texte exact « dieu mis en difficulté » | Garder le texte et déclarer la porte « non mesurable » |
| D2 | Regard 5 du jury | Remplacer « confort et performance » par des mesures déterministes + un **avocat du diable** | F15 ; on perd un juré sur cinq regards | Garder le juré mais avec plafond 8,5 tant que l'iPhone n'a pas parlé |
| D3 | Règle de la porte 7 | **Moyenne par famille ≥ 9,5 et aucune moyenne de regard < 9** (au lieu de « aucune note < 9 »), sur deux jurys A et B de la même build, jamais de troisième | F13 : 3 à 8 % de passage pour un vrai 9,5 avec la règle actuelle ; on perd la sévérité note par note, compensée par les défauts graves comptés | Conserver la règle et accepter que le jury échoue presque toujours |
| D4 | Sens de « 9,5 » | Publier la note avec ancres, canaris et écart entre familles ; « non interprétable » sinon | F13, F14 ; on perd un chiffre simple | Publier le chiffre brut en l'annotant |
| D5 | Instrument | Écrit par un agent Claude, relu par une session Codex (auteur ≠ juge) | F17 ; coûte ≈ 20 min de relecture | Faire écrire l'instrument à j1 (Codex) : plus simple, mais auteur = juge |
| D6 | TEST scellé et lu une fois | Oui, avec hold-out tiré au gel | § 2.5 ; on perd la possibilité de « réessayer » | VALID lu plus souvent : plus de rejeux, moins de sens |
| D7 | Machine | 1 Chromium + 1 VM (2 pour TEST), pas de M5 cette nuit | RAM libre 0,13 + 2,1 Go inactifs ; clé du M5 retirée | Demander à la propriétaire de rouvrir le M5 pour TEST (gain ≈ 40 min) |
| D8 | Début de la boucle | T0 = 02 h 30, fin ≥ 09 h 05 | 6 h de boucle après la validation de l'instrument, pas avant | Compter depuis 02 h 00 : fin à 08 h 00 mais ≈ 30 min de moins de mesures et un verdict plus fragile |

---

## 6. Limites (une fois)

- **Aucune de ces durées n'est mesurée sur la machine de cette nuit** : les 4,5 s la partie viennent des horodatages du 18/10, les durées de jurés et de Chromium sont des hypothèses.
- **Les pilotes, même hold-out, sont des politiques synthétiques** ; deux familles de modèles peuvent se tromper ensemble ; aucun juré n'entend la musique ; Safari sur iPhone n'est pas testé par Chromium. Le jury reste un jugement de modèles : la partie de la propriétaire sur son iPhone est le juge final.
- Le détecteur d'onsets et l'étalement de tempo sont des bancs à écrire et à valider (03 h 25) ; si l'un échoue à ± 8 ms ou ± 3 cents, les portes 3 et 4 restent « non mesurables », pas « tenues ».
- Je n'ai ni lancé ni modifié quoi que ce soit : les failles viennent de la lecture du code, des rapports et des reçus du 18/10, sauf les deux calculs statistiques (reproductibles : Wilson, simulation de 200 000 tirages du § 1 F13).
