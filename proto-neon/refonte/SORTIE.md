# SNAKE 2975 — la sortie finale : ce qui doit être vrai

18/10/2026 · 00 h 27 (Paris). Écrit par la cheffe d'orchestre (session Claude du Mac) sur délégation de la
propriétaire : « tu prends les décisions qui te semblent meilleures, en multiagent avec Codex, jusqu'à la sortie
finale, avec vérifications, optimisations et corrections, jusqu'à jouabilité et intérêt optimaux ».

## Le périmètre de la version 1.0 (décision)

- **L'époque néon complète** (le jeu actuel : cinq vagues, VOLS, LASSO, INVERSION, CYCLOPE, cartes, écran de fin),
  rendue juste et riche : les cinq causes communes de `couverture-snake2030.md` réglées, les dix manques prioritaires
  de chaque inventaire faits ou écartés avec une raison écrite.
- **L'ouverture en 1976** (`VISION-PROGRESSION.md` § 1, étape 2 : le terminal à deux couleurs, case par case) qui
  bascule dans l'époque néon : la promesse « un snake qui traverse l'univers » commence à se voir.
- Les époques suivantes (8 → 16 bits, intergalactique) : après la 1.0, dans l'ordre de la vision.
  Raison : livrer un jeu fini et poli plutôt qu'une traversée de toutes les époques à moitié faites.

## Les portes, toutes mesurées (aucune n'est déclarée tenue sans sa preuve)

1. **Batterie R-01 à R-38** (`tools/mesure/lancer.mjs`, mode complet, pas `--rapide`) : chaque critère bloquant
   « réussi » ; un « non mesurable » est une interface à fournir, pas une réussite.
2. **Pilotes** (`85-pilote.js`, `tools/pilotes/parties.mjs`) : 8 pilotes × 10 graines jusqu'à la fin, zéro
   blocage, zéro erreur, déterministes ; courbe de difficulté conforme à R-04 et R-23 (inerte meurt en V1, bon et
   expert atteignent le CYCLOPE dans les proportions du plan).
3. **Lisibilité** : seuils de codex-01 et codex-01b sur tout l'écran, dans chaque état (éclipse : 8 %).
4. **Performance** : R-20 (p95 ≤ 11 ms en iPhone 13 paysage émulé, qualité adaptative coupée), sans régression
   de plus de 0,5 ms par chantier.
5. **Jury indépendant** (agents neufs qui jouent au pilote et au doigt simulé, regardent leurs captures et leurs
   journaux, n'ont lu aucun rapport) : joueuse iPhone, game design, direction artistique, son, performance ;
   **jouabilité ≥ 8/10 et intérêt ≥ 8/10 chez chacun**, aucun défaut bloquant ouvert. Une note sous 8 ouvre un
   chantier ; on rejuge après.
6. **Publication** sur `gh-pages` (`https://manonwwk-kasiope.github.io/proto-neon/`), vérifiée en ligne sur les
   trois profils, zéro erreur.
7. **Le JALON de la propriétaire** (R-38) : une partie sur son iPhone ; chaque « non » reçoit une correction ou une
   raison écrite. Il ne bloque pas la publication d'une version candidate ; il peut rouvrir n'importe quelle porte.

## Décisions de spécification prises en route

- **R-05** (00 h 41) : la morsure coupe et ne tue pas (invariant) ; sept causes de mort naturelles.
- **R-11** (00 h 47) : la part de pixels lumineux sur tout le tampon (≥ 25 / 28 / 32 / 25 %) et la luminance
  moyenne deviennent **indicatives**. Démonstration : sous l'horizon (au moins la moitié de l'écran), le décor doit
  rester sous 8 % de pixels lumineux (codex-01, la lisibilité prime) ; le ciel devrait alors être lumineux à plus
  de 42 %, avec au plus 12 % d'encres chaudes et moins de 0,5 % de magenta et rose pâle (R-11 lui-même) : seul
  l'acier gris resterait, que le jury a jugé terne. Le reste de R-11 reste bloquant (0 cyan dans le décor, magenta
  et rose pâle < 0,5 %, vide < 30 %, gaine des menaces). Le « pas triste » (retour n° 1 de la propriétaire) se juge
  au jury (ambiance ≥ 8/10) et au JALON.

## Arrêt de non-convergence

Si une même porte échoue deux tours de suite, ou si un tour n'en ferme aucune, la méthode est en cause : arrêt,
diagnostic écrit ici, puis seulement une méthode changée et prouvée sur un pilote.

## Où en est chaque porte

| porte | état | preuve |
|---|---|---|
| 1. Batterie R-01 à R-38 | instrument réparé (3883b2a) : 1 ok, 7 échecs, 6 partiels, 23 non mesurables (00 h 41, rapide) ; départ, scènes et masque en cours (codex-p6) | `tools/mesure/sortie/` (codex-08) |
| 2. Pilotes | codex-02 et lot I acceptés : 80/80 parties ; jeu trop dur (bon : V5 dans 2/10) ; réglage en cours (codex-p5) | `mediation/2026-10-18-codex-02-lot-I.md` |
| 3. Lisibilité | codex-01, 01b, 03 acceptés ; ambiance A en cours (codex-01c) | `mediation/` |
| 4. Performance | à mesurer | — |
| 5. Jury | pas encore | — |
| 6. Publication | version du 17/10 en ligne, antérieure | — |
| 7. JALON | à demander quand la version candidate sera prête | — |

## Diagnostic de non-convergence — codex-01c

Mis à jour à 18/10/2026 · 00 h 45 (Paris), Codex. Deux méthodes de prototype option A échouent au précontrôle V4/paysage (15 relevés chacune) : ciel lumineux min 5,69 %, puis 8,58 %, contre 12 %. Le sol et les erreurs restent conformes. Arrêt de cette méthode ; aucune modification de source 01c appliquée. Diagnostic et reçus : `tools/lisibilite/01c/diagnostic.md`. Fenêtres violet/indigo sont sous L=0,10 ; le soleil est en partie masqué par les tours. Avant toute nouvelle passe complète, une méthode de lumière différente doit être décidée et prouvée sur un seul cas. Question déposée dans COORDINATION.md ; les seuils ne sont pas modifiés par Codex. Les lots 01b et 02 acceptés restent conservés.
