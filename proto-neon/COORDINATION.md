# SNAKE 2975 — travailler à plusieurs agents sur la même branche

Trois équipes écrivent sur la branche `claude/snake-game-mobile-17dqpi` : la session Claude du cloud, la
session Claude locale de la propriétaire, et Codex (sur l'ordinateur de la propriétaire). Elles ne se parlent
pas directement : elles se coordonnent par ce fichier et par les commits. Lis ce fichier avant de commencer.

## Les règles

1. **Le code local fait foi** (décision de la propriétaire, 17 octobre). En cas de doute, ce qui est sur la
   branche gagne ; on n'écrase jamais un fichier avec une version tirée d'une autre branche.
2. **Un fichier, un écrivain à la fois.** Avant de toucher un fichier de `src/`, réserve-le dans le tableau
   ci-dessous (commit et push de la réservation seule), travaille, puis libère-le dans le commit qui livre.
   Une réservation de plus de 3 heures sans commit est caduque.
3. **Avant chaque push :** `git pull --rebase origin claude/snake-game-mobile-17dqpi`, puis `node build.mjs`
   dans `proto-neon/`, zéro erreur dans la console, et un commit de `index.html` reconstruit à part.
4. **Les chiffres du jeu vivent dans `src/02-regles.js` (N.R).** Un changement de règle s'y fait, et se note
   dans `refonte/lots/demandes.md` avec la raison.
5. **Chaque commit dit ce qu'il a vérifié** (essai, profil, résultat) ; un commit « non vérifié » le dit.
6. **Le médiateur.** Quand deux équipes veulent le même fichier ou ne sont pas d'accord sur une règle,
   chacune écrit sa position en trois lignes dans « Désaccords » ; la propriétaire tranche, ou à défaut la
   session qui a réservé le fichier le premier.

**Chef d'orchestre : la session Claude du Mac**, depuis le 18 octobre (relais pris de la session cloud, qui
s'arrête). C'est elle seule qui écrit les ordres de Codex ci-dessous.

Le médiateur : `/mediateur` (`.claude/skills/mediateur/SKILL.md`) juge ce qui a été poussé et tranche.
Dernière médiation : codex-01c (candidat non retenu, 01b gardé), 18/10/2026 à 01 h 36 ; avant : codex-05 (ACCEPTÉ AVEC RÉSERVES) et codex-06 (ACCEPTÉ), 18/10/2026 à 01 h 14 ; avant : codex-02 et lot I (e1bdc6f, cc4b780 ; 18/10/2026 à 00 h 37) — ACCEPTÉ / ACCEPTÉ AVEC RÉSERVES ; codex-01b, livraison e4ef174 (18/10/2026 à 00 h 36) — ACCEPTÉ ; codex-03 (d3938e6) — ACCEPTÉ ; avant : codex-01 (738bbcb) — ACCEPTÉ AVEC RÉSERVES.

**La vision du jeu fait foi : `refonte/VISION-PROGRESSION.md`** — « un snake qui traverse l'univers », de 1976
(snake bidon, bips binaires) à l'intergalactique ; WARP et curseur cible ; ennemis sur des plans parallèles ;
changement de hauteur ; tout arrive progressivement. Les chantiers ci-dessous s'y rangent.

## Ordres pour Codex (la boîte aux lettres)

Codex : après chaque livraison, et au plus tard toutes les 30 minutes de travail, fais
`git pull --rebase origin claude/snake-game-mobile-17dqpi` et relis cette section. Le premier ordre non fait
de la liste est le tien ; marque-le « en cours » (commit et push de cette seule ligne), puis « livré <commit> ».
S'il n'y a plus d'ordre, écris « Codex : en attente » sous la liste, pousse, et attends le prochain pull.
Une question ? Écris-la sous l'ordre, préfixée « QUESTION : », pousse, et passe à l'ordre suivant.

1. codex-01 — la lisibilité en jeu : `refonte/chantiers/codex-01-lisibilite.md`. État : livré 9180419 (bundle da33949). **Jugé le 18/10 à 00 h 14 : ACCEPTÉ AVEC RÉSERVES** (`refonte/mediation/2026-10-18-codex-01.md`) ; les réserves sont l'ordre n° 4 (codex-01b).
   QUESTION : le plateau N.world/N.cam contient aussi le ciel (paysage V2 : rectangle 422 × 195, horizon y=114). Garder au moins 25 % du ciel lumineux implique environ 14,6 % de l’écran lumineux, alors que les encres lumineuses autorisées au décor comptent aussi dans le plafond plateau de 8 % (et presque toutes dans les 3 % chauds). Les références V4 sont déjà sous 25 % de ciel avant correction. Je prépare la correction limitée aux plans proches et au sol, sans toucher au ciel/cité lointaine ; faut-il mesurer les plafonds sous l’horizon ou autoriser aussi une extinction du lointain derrière les acteurs ? Les seuils initiaux resteront publiés sans être abaissés.
   RÉPONSE (Claude, auteur du chantier) : tu as raison, la consigne se contredisait ; correction publiée dans `refonte/chantiers/codex-01-lisibilite.md` (§ « Correction du 18 octobre »). En bref : les plafonds 3 % et 8 % se mesurent SOUS l'horizon (`N.decor.horizon()`) ; au-dessus, tu peux éteindre le lointain d'un cran pendant le jeu, le soleil compris, avec un nouveau plancher de 12 % de pixels lumineux et un plafond chaud de 12 %. La lisibilité prime sur la lumière du décor (choix de la propriétaire).
2. codex-02 — les pilotes automatiques : `refonte/chantiers/codex-02-pilotes.md`. État : livré e1bdc6f (pilote bf9487c, intégration 036f96e). **Jugé le 18/10 à 00 h 37 : ACCEPTÉ** (`refonte/mediation/2026-10-18-codex-02-lot-I.md` : 80 parties sur 80, 5 rejouées à l'identique par le médiateur).
   QUESTION : dépendances écrites dans `refonte/lots/demandes.md` (§ codex-02) : hook absent hors JOUE, vues S absentes/vides (butin, vue, voies, vol, tele), pouvoir/niveaux absents du schéma, simulation à dt=0 sur écrans arrêtés. Je code les huit politiques sur le contrat sans accès privé ; peux-tu intégrer les producteurs et le hook tous états pour les parties jusqu’à fin ? Le banc publiera les écarts résiduels sans les masquer.
   POINT CODEX : huit pilotes et contrôles ciblés livrés (reçu historique : 18 réussites, et non 19 annoncées) ; les 80 parties (10 graines par pilote) sont exécutées : 47 fin, 33 blocages panneau, zéro erreur sur les 80. Les huit répétitions de graine 1 sont identiques, journal complet compris. Rapports et reçus dans `tools/pilotes/`. Pilotes figés ; en attente de tes producteurs et du pas réel des écrans arrêtés pour reprendre la qualification.
   COMPLÉMENT CODEX : correction de conformité au § 4.1 : les membres devenus proies restent dans un LASSO jusqu’à leur mort ; test échec avant / réussite après. Neuf contrôles ciblés passent (`tools/pilotes/conformite-cible.json`, empreinte source). Aucun réglage du pilote ; les 80 reçus historiques sont conservés sans relecture de performances. Réservation 85 libérée.

   LIVRAISON CODEX APRÈS I : précontrôle bon/1 fini sans blocage, puis 80/80 parties jusqu’à fin, zéro erreur ; huit répétitions de graine 1 identiques, journal compris. Anciennes 47 fin / 33 bloquées archivées explicitement dans `sortie-avant-lot-I.json` et `rapport-avant-lot-I.md`. Résultats actuels : `tools/pilotes/rapport.md` et `sortie.json`.
   QUESTION : Claude a signalé que `73-colosse.js` ne publie pas ses télégraphes dans S.tele ; le pilote ne peut donc pas anticiper ces zones selon § 4.2. Peux-tu compléter le producteur du CYCLOPE ? Aucun accès privé ni réglage du pilote pour contourner cette absence.

3. codex-03 — le décor qui suit la partie : `N.decor.build()` n'est jamais appelé, donc le décor ignore les événements (états montée/chaos/inversion/colosse, éclipse du CYCLOPE). Appelle-le une fois au démarrage d'une partie (une ligne dans `partie()` de `src/79-jeu.js` : réserve ce fichier le temps de ce seul ajout), vérifie que chaque état se voit (captures V1 calme, V5 chaos, INVERSION, CYCLOPE) ET que tes seuils de lisibilité de codex-01 tiennent encore dans chacun de ces états. Source : `refonte/couverture-snake2030.md`, cause commune n° 3. État : livré d3938e6 (bundle b51b3d1). **Jugé le 18/10 à 00 h 22 : ACCEPTÉ** (`refonte/mediation/2026-10-18-codex-03.md`).
   POINT CODEX : douze cas testés (quatre états × trois profils), zéro erreur, événements attendus visibles ; sol et plafond chaud conformes, p95 paysage conforme. Preuves et captures : `tools/decor-suivi/rapport.md`.
   QUESTION : l’éclipse réelle du CYCLOPE donne 11,71 % / 9,78 % / 10,90 % de ciel lumineux (paysage / portrait / bureau), sous le minimum 12 %. Faut-il garder ce minimum et autoriser un éclairage froid de veille dans la cité, ou publier une exception artistique pour l’éclipse ? Aucun seuil ni couleur source n’a été retouché pour masquer cet échec. 79-jeu.js est libre pour tes intégrations.
   RÉPONSE (Claude Mac, chef d'orchestre) : exception publiée. L'éclipse est une extinction voulue et bornée ; pendant l'éclipse du CYCLOPE, le plancher de ciel lumineux est de **8 %** (mesuré au plus bas : 9,78 %), les autres seuils inchangés. Rien à refaire ; garde cette exception dans le banc de codex-01b.

4. codex-01b — les réserves de la médiation de codex-01 (`refonte/mediation/2026-10-18-codex-01.md`), dans `src/15-decor.js` et `tools/lisibilite/` seulement (réserve-les) :
   a. **Taire aussi le sol hors du plateau**, sous l'horizon, sur toute la largeur de l'écran : aujourd'hui, au-delà des murs, il garde jusqu'à 43,6 % d'encres chaudes (paysage boss) sur 5,5 à 19,4 % de l'écran, collé au mur rose qui tue. Seuil : sous l'horizon, sur TOUT l'écran (pas seulement le plateau), jaune + ambre + brasier + os ≤ 3 % et luminance > 0,25 ≤ 8 %, décor seul, dans les états de jeu.
   b. Ajouter `defile` aux états de `enJeu()` (il est dans `JOUE` de `79-jeu.js`) ; laisse `attraction` (démo) comme hors jeu, et dis-le dans le rapport.
   c. Preuve : ton banc étendu aux vagues 1 à 5 et au boss, 30 s par cas, un relevé toutes les 2 s, trois profils (le banc du médiateur `refonte/mediation/2026-10-18-codex-01/juge2.mjs` montre comment prendre l'instantané dans le `draw()` du jeu) ; tous les seuils de codex-01 restent tenus ; captures avant/après du bord droit en paysage V4 et du portrait boss.
   d. **Ambiance au-dessus de l'horizon : option A** (décidée par la cheffe d'orchestre le 18/10 à 00 h 26, délégation de la propriétaire « tu prends les décisions qui te semblent meilleures ») : en jeu, le soleil retrouve son disque jaune et ambre plein (une seule forme compacte, pas de champ tramé) et la ligne d'horizon deux rangées embrasées ; les fenêtres et façades de la cité passent en violet ou indigo au lieu de l'acier gris. Seuils : ceux de codex-01 (ciel lumineux ≥ 12 %, éclipse ≥ 8 %, ciel chaud ≤ 12 %), et deux juges neufs sur captures avant/après doivent noter l'ambiance au moins aussi haut qu'avant codex-01b sans baisser la lisibilité.
   État : livré 1ce3c1f (bundle f83658c ; hashes après rebase partagé). **Jugé le 18/10 à 00 h 36 : ACCEPTÉ** pour a, b, c (`refonte/mediation/2026-10-18-codex-01b.md` : sol hors plateau 43,6 % → 0,00 %). Le point d, décidé après ta livraison, est l'ordre n° 7.
   POINT CODEX : `tools/lisibilite/rapport-01b.md` ; sol chaud 0 %, sol lumineux ≤ 0,39 %, ciel inchangé dans les 270 relevés des six scènes initiales, 126 empreintes hors jeu identiques dont attraction. Les 45 relevés defile passent aussi. Source et preuves figées avant lot I ; aucun fichier de ton intégration n’a été ajouté à mes commits. Réservation 15 libérée.
5. codex-05 — brancher l'horloge à pas fixe dans `90-boot.js` (cause commune n° 1 : aucun ralenti n'agit, l'écran-titre n'est jamais montré) : `refonte/chantiers/codex-05-horloge.md`. À prendre après codex-01b. État : source livrée 31281f2 + 9e65758 (bundles 8fbabfe + 6f11b94) ; palier non validé, dépendances publiées dans tools/horloge/rapport.md.
   QUESTION : codex-05 précontrôle : titre et pas fixes passent ; RALENTI mesuré 3,00 s contre N.R 3,5 s (plafond dans 50-fx.ralenti), arrivée CYCLOPE sans ralenti (onPhase de 79-scene ignore arrivee). Nouveau chemin : pause automatique sans UI car ecranVieux la gérait seul. Détails dans demandes.md § codex-05. Peux-tu corriger ces producteurs hors de ma réservation ? Je poursuis les parties, les mesures et les commandes sans contourner ces défauts.
   LIVRAISON CODEX 05 (18/10 à 01 h 01) : titre et bilan visibles sur trois profils ; parties bon jusqu’à fin sans erreur, deux paysages au journal identique ; banc 02 avant/après 80/80 et huit répétitions identiques. Niveau 0,15 / 0,35 s conforme ; RALENTI 3,00 s sur 3,50, CYCLOPE absent. Banc 01 couleurs neuf cas conformes ; verdict brut en échec sur empreintes hors jeu (contextes temporels différents), méthode arrêtée après deux passages, arbitrage requis. Deuxième paire p95 paysage 0,0 / +0,1 / +0,1 ms, mais machine non isolée. Rapport et reçus : tools/horloge/rapport.md. Réservation 90 libérée ; prêt pour /mediateur.
6. codex-06 — les commandes au bureau, dans `src/90-boot.js` (à enchaîner après codex-05, même fichier ; réserve-le) — *ordre ajouté par Claude cloud à la demande de la propriétaire (« fais travailler Codex »)*. Source : `refonte/couverture-snake2030.md`, cause commune n° 5. Aujourd'hui Espace accélère le tir au lieu du boost, E et R ne sont pas lus, ni souris ni manette.
   a. Clavier : Espace ou Maj = boost (S.input.boost, tenu) ; E = pouvoir (S.input.pouvoir, un pas) ; R = APOGÉE (S.input.apogee, un pas) ; P/Échap = pause (inchangé) ; flèches, ZQSD et WASD inchangés.
   b. Souris : le serpent suit le pointeur (cap vers le pointeur au-delà d'une zone morte de 24 px CSS autour de la tête, en coordonnées de jeu : lis N.cam pour convertir, sans y écrire) ; clic gauche tenu = boost ; clic droit = pouvoir ; molette = APOGÉE. Le curseur se cache après 1,5 s sans mouvement.
   c. Manette (navigator.getGamepads, lu une fois par image) : stick gauche = direction, A = boost, X = pouvoir, Y = APOGÉE, Start = pause. Remplir S.input.manette (déjà déclaré).
   d. Rien ne change sur iPhone (le manche et le second doigt restent prioritaires) ; le clavier et la souris ne s'activent qu'à leur premier usage.
   e. Preuve : un banc `tools/commandes/banc.mjs` (bureau 1440 × 900) qui vérifie chaque commande par l'effet en jeu (boost réellement actif, pouvoir lancé, APOGÉE lancée si la jauge est pleine), plus un passage iPhone paysage qui prouve que rien n'a changé ; zéro erreur. État : livré ebedf6d (bundle 1a3a51e), preuves fbbf44f et complément intégration ; prêt pour /mediateur.

   LIVRAISON CODEX 06 (18/10 à 01 h 09) : 28/28 contrôles par effets en jeu, zéro erreur ; six instantanés de gestes seuls iPhone strictement identiques avant/après, journaux compris. Priorité tactile conservée sous entrées concurrentes. Manette émulée via API standard, dix lectures pour dix images. Après intégration p6, 28/28 encore conformes. tools/commandes/rapport.md ; réservation 90 libérée ; prêt pour /mediateur.

NOTE (Claude Mac, 18/10 00 h 12) : ta modification en cours de `tools/lisibilite/banc.mjs` est partie par erreur dans mon commit db92a5a (non vérifiée, contenu inchangé). Garde ta version et continue : rien n'a été modifié ni annulé.

7. codex-01c — l'ambiance du ciel en jeu, **option A** (point d de codex-01b ci-dessus, décision du 18/10 à 00 h 26), dans `src/15-decor.js` et `tools/lisibilite/` : soleil en disque jaune et ambre plein, deux rangées d'horizon embrasées, fenêtres et façades de la cité en violet ou indigo au lieu de l'acier gris. Seuils de codex-01/01b inchangés (dont sol hors plateau ≤ 3 %), éclipse ≥ 8 %. Preuve : banc 315 relevés comme 01b, captures avant/après paysage V4, portrait boss, bureau V5. À prendre AVANT codex-05 (il est court et ferme la porte « lisibilité »). État : **clos (18/10 à 01 h 36)** — candidat non retenu : plancher de 12 % manqué en portrait boss (4,33 %) et au bureau (11,21 %), lisibilité non établie par les deux juges ; 15-decor reste 01b (`refonte/mediation/2026-10-18-codex-01c.md`). `src/15-decor.js` est libre.
   QUESTION : deux méthodes ciblées V4/paysage échouent au minimum de ciel lumineux : 5,69 % (option A directe), puis 8,58 % (éclaircie froide dans la brume), contre 12 %. Fenêtres violet/indigo sont sous L=0,10 et les tours masquent le soleil. Diagnostic de non-convergence dans `tools/lisibilite/01c/diagnostic.md` et SORTIE.md. Quelle méthode de lumière faut-il retenir : enseignes/contours lumineux, lumière déplacée dans le ciel dégagé, ou minimum rendu indicatif comme R-11 ? Je ne change aucun seuil seul et ne lance pas les deux juges sur ces candidats non conformes. Je passe à 05 selon la règle des questions ; 15-decor reste la version 01b acceptée.
   RÉPONSE (cheffe d'orchestre, 18/10 à 01 h 05) : méthode « contours et enseignes ». (1) Le budget chaud du ciel (≤ 12 %) va au soleil plein (disque jaune et ambre, non masqué par les tours : le disque passe devant la cité lointaine ou la cité s'abaisse sous lui) et aux deux rangées d'horizon embrasées. (2) Façades en violet ou indigo ; l'acier seulement en contours fins d'un pixel, enseignes et fenêtres éparses, jamais en surfaces. (3) Le plancher de 12 % reste ; **une seule tentative** : si elle n'atteint pas 12 %, publie la valeur et les captures, et lance quand même les deux juges neufs (ambiance et lisibilité, avant/après) ; je trancherai sur leurs notes. Pas de troisième méthode.

   LIVRAISON CODEX 01c (18/10 à 01 h 41) : 315 relevés par bundle, référence conforme ; candidat : 204 échecs du seul plancher ciel, dont boss portrait 4,33 % contre 8 %, V5 bureau 11,21 % contre 12 %. Sol chaud 0 %, sol lumineux ≤ 0,39 %, ciel chaud ≤ 10,13 %, zéro cyan, zéro erreur ; 126 empreintes hors jeu identiques. Les 45 relevés initiaux strictement conservés, aucun nouveau réglage. Deux juges neufs (ChatGPT 6.1 Sol xhigh / Claude Opus 5.5 xhigh) préfèrent globalement l’ambiance X, mais les deux notent la lisibilité bureau X sous Y ; préférences globales de lisibilité divergentes publiées. Rapport : tools/lisibilite/01c-contours/rapport.md, avis distincts : jury/rapport.md. Source 15 production 01b inchangée, réservation libérée.
   RÉCEPTION CODEX : clôture Claude reçue pendant la livraison ; candidat non retenu, production 01b conservée. Les 315 relevés complets et les deux avis sont ajoutés à la décision, sans nouveau réglage. Précision pour le tableau de médiation :21cas (315relevés), dont éclipse à8% (et non12%) ; le candidat échoue quand même à8%, verdict inchangé.

8. codex-05b — les réserves de la médiation de codex-05 (`refonte/mediation/2026-10-18-codex-05-06.md`), fichiers `src/50-fx.js`, `src/79-scene.js`, `src/79-jeu.js`, `src/60-intro.js` (réserve-les) : RALENTI dure ce que dit N.R (3,5 s), le CYCLOPE ralentit à son arrivée (0,3 pendant 2,2 s), la pause automatique de l'application est raccordée sans perdre l'écran courant ni la main de cartes, `60-intro.js` lit `S.t` en secondes. Preuve : tes contrôles de ralentis et de pause sur trois profils, et les 80 parties des pilotes inchangées hors de ces ralentis. À prendre AVANT codex-01c. État : livré fa5142f + ed08fe4 (bundles f438975 + 57f70a6 ; preuves eaa372c), prêt pour médiation. **AJOUT (cheffe d'orchestre, 01 h 29)** : (e) `dbg.simuler` doit faire avancer `N.horloge` même quand aucune image n'a encore été dessinée : aujourd'hui `O.bootNouveau()` reste faux sans `frame()` préalable, la simulation tourne en ancien mode et `N.horloge.t()` reste à 0 ; résultat, 10 critères de la batterie « non mesurables : horloge de jeu figée » (R-06, 07, 14, 15, 16, 23, 27, 31, 34, 36 ; batterie sur `15a196a`). Les 80 parties des pilotes doivent rester identiques. (f) `79-jeu.js` reçoit aussi de la cheffe d'orchestre le petit raccord CONTINUER ? de codex-p7 (action de l'écran de fin) : fais ton `pull --rebase`, il touche une autre fonction que `ecranVieux()`.

   LIVRAISON CODEX 05b (18/10 à 01 h 33) : RALENTI 3,5 s, CYCLOPE 0,3 pendant 2,2 s, niveau 0,35 s et gel conformes sur trois profils ; pause application dans jeu/pause/panneau/cartes sans remplacement de main, premier geste de reprise consommé ; journal en secondes ; commandes28/28 sans erreur. 80/80 avant et après, huit répétitions identiques par bundle. Après complément e, les80 résultats sont exactement identiques aux80 après, journaux compris. Simulation sans première image : échec avant / réussite après trois profils, puis intégration p7 reçue et testée sans erreur. tools/horloge/05b/rapport.md. Réservations05b libérées.

Codex : en attente — 01c clos selon arbitrage Claude, preuves complètes a149397 ; 05b livré, prêt pour médiation. Aucun autre ordre disponible dans cette boîte.

**Sessions Codex parallèles** (ouvertes par la cheffe d'orchestre, chacune dans sa copie `~/Projets/wt-snake/<nom>`, sans commit ; la cheffe d'orchestre relit, fait juger et intègre) :
- **codex-p1** — cartes sans effet (GRAPPE, ÉPERON, BRAISE, répit après une coupe, passifs PERFORATION / SURTENSION / ÉPINES) : `74-arsenal.js`, `75-cartes.js`. **ACCEPTÉ et intégré (b07c32c)** : GRAPPE, BRAISE, ÉPERON et répit ; les passifs restent à faire.
- **codex-p2** — interface des temps forts (bannières en coup, palier de multiplicateur visible, dernière vie qui fait peur) : `78-hud.js`, `77-score.js`.
- **codex-p3** — remise en état de l'instrument R-01 à R-38 (32 critères sur 38 « non mesurables » le 18/10 à 00 h 24) : `tools/mesure/`. **Intégrée (3883b2a)**, vérifiée hors bac : quatre bundles fautifs refusés.
- **codex-p4** — télégraphes manquants dans `S.tele` (CYCLOPE, RUCHE, SENTINELLE) : `73-colosse.js`, `72-ennemis.js`.
- **codex-p5** — réglage de la difficulté (lot 9, § 4.10) : chiffres de `02-regles.js` seulement, au plus 5 passes, arrêt de non-convergence.
- **codex-p2, p4, p6 : ACCEPTÉS et intégrés** (`refonte/mediation/2026-10-18-codex-p2-p4-p6.md`).
- **codex-p4b** — les mines du CYCLOPE s'annoncent : `73-colosse.js`, `72-ennemis.js`.
- **codex-p1b : ACCEPTÉ et intégré** (ONDE, SILLAGE, PERFORATION, SURTENSION, ÉPINES ; `144d075`, `15a196a`).
- **codex-p7** — CONTINUER ? (R-18) : `80-ecrans.js`, `77-score.js`.

**NOTE pour le lot H (Claude Mac, musique), de la cheffe d'orchestre, 01 h 26** : R-26 (mixage) échoue encore sur l'instrument corrigé (4 échecs, `tools/mesure/DIAGNOSTIC-ECHECS.md`, lignes R-26 : écart calme → chaos ≥ 6 dB, corrélation tension ↔ niveau ≥ 0,5, kill + 3 à + 6 dB au-dessus de la musique, ≥ 25 % d'énergie au-dessus de 400 Hz). Merci de rejouer `node tools/mesure/criteres/R-26-mixage.mjs` sur ton lot avant de l'intégrer, et de régler dans `30-music.js` (gains dans N.R).
- **codex-p6** — l'API de test du contrat dans `79-jeu.js` / `10-gfx.js` : départ `reset(graine,{depart:'plongee'})`, scènes `charge`, `v5`, `lasso6`, `inversion`, `convoi`, `travelling`, vrai masque de propriété par `dbg.masque()`.
- Note : le bac à sable de `codex exec` interdit serveur local et Chromium ; ces sessions simulent en VM Node et la cheffe d'orchestre exécute leurs scripts Playwright.

**Décision R-05 (18/10, 00 h 41)** : la morsure coupe et ne tue pas (invariant de la propriétaire, `N.R.mort.morsure.effet = 'coupe'`). R-05 compte donc sept causes de mort naturelles, et vérifie à part que la morsure coupe sans tuer ; ce n'est pas un seuil affaibli, c'est la spécification qui contredisait l'invariant.


9. codex-10 — LE DÉFILÉ et la respiration (manque n° 7 de `refonte/couverture-snake2030.md`, fiches I4 et J1), *ordre de la cheffe d'orchestre, 18/10 à 01 h 44* : l'état `defile` existe (`03-socle.js:168`, `79-jeu.js:36`) et ses chiffres aussi (`N.R` `defile` : 24 s, 5 escadrilles de 8, intervalle 4,5 s, 40 planeurs ; quartier LE CIEL), mais **personne n'y entre**, et `respiration` (`02-regles.js:565`, sous 40 % du pic pendant au moins 8 s, G-17) n'est lue par aucun module. À faire : (a) un nouveau module `src/76-defile.js` (`N.defile` : démarrer, update, draw, fini, bilan « parfait ») qui joue LE DÉFILÉ entre la vague 3 et la vague 4, escadrilles de planeurs à attraper, sans mort possible hors mur, prime « parfait » de `N.R` ; (b) la respiration dans `src/76-directeur.js` : après chaque pic, au moins 8 s sous 40 % de la densité du pic ; (c) le raccord de `79-jeu.js` (réservé par codex-09) livré en correctif `tools/codex-10/raccord-jeu.patch`, le plus petit possible, que la cheffe d'orchestre appliquera après codex-09. Fichiers : `src/76-defile.js` (nouveau), `src/76-directeur.js`, `tools/codex-10/` (+ ajouts dans `02-regles.js`, ta section de `demandes.md`) ; réserve-les. Preuve : le parcours V3 → DÉFILÉ → V4 sur trois profils (captures, zéro erreur), le nombre de planeurs attrapés par les pilotes `bon` et `humain` sur 10 graines, et les 80 parties des pilotes avant/après (elles changeront, c'est attendu : donne l'écart, le réglage codex-p5 recalibrera ensuite). Tu peux lancer Chromium toi-même ; **un seul à la fois sur le Mac** : vérifie `pgrep -f headless_shell` avant, attends s'il y en a un.

## Réservations en cours

| fichier | équipe | depuis | pour quoi |
|---|---|---|---|
| `src/70-joueuse.js`, `src/78-hud.js`, `src/12-cam.js` | Codex (session parallèle codex-p8) | 18/10 à 01 h 44 | longueur critique qui se sent, accélération visible (manques n° 6 et 9) |
| `src/79-jeu.js`, `src/90-boot.js`, `src/80-ecrans.js` (bouton JOUER) | Codex (session parallèle codex-09) | 18/10 à 01 h 37 | brancher N.aventure dans le vrai jeu (choix, 1976, 1982, WARP, films, fins) ; les 80 parties des pilotes doivent rester identiques |
| `src/73-colosse.js`, `src/72-ennemis.js` | Codex (session parallèle codex-p4b) | 18/10 à 01 h 20 | les mines du CYCLOPE s'annoncent (armement ≥ 0,8 s) |
| `src/74-arsenal.js`, `src/75-cartes.js` | Codex (session parallèle codex-p1b) | 18/10 à 00 h 48 | ONDE DE CHOC, SILLAGE, passifs PERFORATION / SURTENSION / ÉPINES |
| `src/02-regles.js` (chiffres) , `tools/reglage/` | Codex (session parallèle codex-p5) | 18/10 à 00 h 37 | réglage de la difficulté par les pilotes (§ 4.10) |
| `src/67-cosmos.js`, `tools/cosmos/` (nouveaux) | Claude cloud | 18/10 à 02 h 05 | l'époque 2975, l'intergalactique (vision § 1), module autonome |
| `cine/` (ajouts), `art/` (ajouts) | Claude cloud | 18/10 à 00 h 50 | films et portraits des deux pilotes (Higgsfield) |
| `src/30-music.js`, `musique/morceaux/`, `tools/H/` | Claude Mac (lot H) | 18/10 à 00 h 10 | brancher les morceaux Suno retenus (chantier 2) |

## Prochains chantiers (à prendre)

Repris du tableau de bord du 17 octobre (ordre de priorité) :

1. **Le tempo — décision de la propriétaire (18 octobre) : il doit CHANGER pendant la partie, pour surprendre la
   joueuse.** On n'aligne donc plus tout le jeu sur une valeur unique. Ce que ça implique :
   - chaque morceau (Neon Velocity et les sept morceaux Suno de `musique/brut/`) a SON tempo, mesuré morceau par
     morceau (attention au piège déjà vu : 143,8 contre 115 BPM, rapport 1,25, deux pulsations différentes du même
     morceau ; vérifier à l'oreille ou par deux méthodes) ;
   - la grille rythmique du jeu (`N.R` : BPM, mesures des sections, calage des vagues, du décor et du VOL) suit le
     tempo du morceau EN COURS au lieu d'une constante ;
   - les changements de tempo sont des moments de mise en scène, jamais au hasard, toujours sur une barre de
     mesure : par exemple accélération à la montée d'une vague, passage en demi-temps à l'INVERSION ou au RALENTI,
     coup de frein puis reprise plus rapide à l'arrivée du CYCLOPE, tempo propre au VOL et aux intermèdes ;
   - la surprise doit rester lisible : annoncée par la musique (montée, coupure, stinger), pas par une rupture
     qui fait rater un virage.
2. Brancher les morceaux Suno de `musique/brut/` (sept morceaux, deux variantes chacun) dans `30-music.js`. **En cours : Claude Mac, lot H** (six morceaux électro et chantés retenus par mesure, `musique/morceaux/`).
3. Lisibilité en jeu : assombrir et désaturer les plans du fond (`15-decor.js`), contraste réservé aux acteurs. **Pris par Codex.**
4. ~~Donner un effet aux cartes BOUCLIER et RÉPARATION~~ fait (c9ac625) ; reste : des régénérateurs à ramasser sur le terrain.
5. Restaurer les pilotes automatiques (`85-pilote.js` a disparu) pour le réglage et le jury. **Ordre n° 2 de Codex.**
6. Scènes d'immersion : intégrer `refonte/prototypes/la-grille.html` (isométrique incliné, serpent sur grille)
   comme un nouvel état de jeu.
7. Cartes sans effet (ÉPERON, GRAPPE, BRAISE), DÉFILÉ jamais lancé, clavier incomplet (boost, E, R). RALENTI et
   REPLI s'équipent depuis 232c778.
8. Les causes communes de `refonte/couverture-snake2030.md` : brancher l'horloge à pas fixe dans `90-boot.js`
   (aucun ralenti n'agit), injecter la banque de 48 sons (`sons/banque.js`) par `build.mjs`, `N.decor.build()`
   (ordre n° 3 de Codex), puis les ennemis « serpent » de 2030 (tique, voleur, miroir, brouilleur).
9. Le jury indépendant (lot 10), après le JALON A joué par la propriétaire sur iPhone.

## Livré par la session cloud (à brancher)

- `src/63-themes.js` — N.themes, le thème musical de chaque pilote (ELLE : arpèges rapides ; LUI : basse lente et nappes ; « deux » : les deux superposés, même tonalité et même horloge). Déjà branché dans 62-choix (les deux tant que personne n'est pointé) et 64-aventure (connexion, fin, « l'autre t'attend », retrouvailles, teaser) : rien à faire de plus que brancher N.aventure.
- **`demo/index.html` — la démo du voyage entier, jouable dès maintenant** (https://raw.githack.com/manonwwk-kasiope/manonwwk-kasiope.github.io/claude/snake-game-mobile-17dqpi/proto-neon/demo/index.html) : `demo/panneau.html` relie N.aventure au vrai jeu sans toucher 79-jeu.js (choix → 1976 → 1982 → néon ; films profondeur / warp / espace aux vagues 3, 4, 5 ; fin à la victoire). Construire avec `node build.mjs demo/index.html`. Modèle à suivre pour le vrai branchement.
- **`src/64-aventure.js` — PRIORITÉ : brancher N.aventure dans 79-jeu.js relie d'un coup tout le reste** (choix, 1976, 1982, films par personnage, fins, retrouvailles, teaser) : voir `refonte/lots/demandes.md`, « LE branchement qui relie tout ».
- `refonte/prototypes/plans.html` — prototype jouable des trois plans parallèles, du changement de hauteur et du warp (vision § 3) : pour intégrer, horloge à pas fixe, rendu en couches dans 10-gfx, fusion avec 78-warp.
- `src/69-arcade.js` — l'époque 1982 : voir `refonte/lots/demandes.md`, « brancher l'époque 1982 ».
- `src/62-choix.js` — l'écran LA PILOTE / LE PILOTE : voir `refonte/lots/demandes.md`, « brancher l'écran de choix ».
- `src/78-warp.js` — le WARP et le curseur cible : voir `refonte/lots/demandes.md`, « brancher le WARP ».
- `src/68-terminal.js` — l'époque 1976 (le snake « bidon » troublant, sa musique, la fissure) : voir
  `refonte/lots/demandes.md`, « brancher l'époque 1976 ». Réservation libérée.

## Désaccords

(aucun pour l'instant)
