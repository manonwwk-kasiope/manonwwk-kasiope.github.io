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

## Où en est chaque porte (mis à jour le 18/10/2026 à 01 h 36)

| porte | état | preuve |
|---|---|---|
| 1. Batterie R-01 à R-38 | sur `15a196a` (rapide) : **5 ok** (R-01, 08, 09, 10, 29), 14 échecs, 8 partiels, 10 non mesurables (horloge en simulation : codex-05b e) ; depuis, R-18 passe (CONTINUER ?, `7629f68`). Diagnostic des échecs restants : codex-p3c | `~/Projets/wt-snake/recus/batterie-15a196a/` |
| 2. Pilotes | 80/80 parties, déterministes ; jeu trop dur ; réglage en cours (codex-p5, 5 passes au plus) | `mediation/2026-10-18-codex-02-lot-I.md` |
| 3. Lisibilité | codex-01, 01b, 03 acceptés ; ambiance A (codex-01c) : une tentative, puis juges | `mediation/` |
| 4. Performance | R-20 : 2 échecs à diagnostiquer (codex-p3c) | batterie |
| 5. Jury | kit prêt (`tools/jury/partie.mjs`) ; après réglage et ambiance | — |
| 6. Publication | version du 17/10 en ligne | — |
| 7. JALON | à demander sur la version candidate | — |

Intégré depuis le début de la nuit : pilotes (codex-02, lot I), API de test (p6), instrument réparé (p3, p3b),
horloge à pas fixe (codex-05, 05b), commandes au bureau (codex-06), cartes GRAPPE, BRAISE, ÉPERON, répit, ONDE,
SILLAGE, PERFORATION, SURTENSION, ÉPINES (p1, p1b), bannières et dernière vie (p2), télégraphes du CYCLOPE (p4),
CONTINUER ? (p7).
