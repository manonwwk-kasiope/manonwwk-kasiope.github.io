# Médiation — codex-p1, les cartes sans effet

18/10/2026 · 00 h 47 (Paris). Médiateur : cheffe d'orchestre. Auteur : Codex (session parallèle codex-p1).

Jugé : `b07c32c` — `74-arsenal.js` (GRAPPE, BRAISE, `N.arsenal.percuter` pour ÉPERON), `75-cartes.js` (répit de
0,9 s après une coupe réelle, mur exclu), `70-joueuse.js` (raccord de trois appels, livré en correctif par Codex et
appliqué par la cheffe d'orchestre, le fichier étant réservé au lot I pendant son travail), ajouts à `02-regles.js`.

| Contrôle | Mesuré (hors bac, Playwright, trois profils) | Tenu |
|---|---|---|
| GRAPPE II, cinq flèches | 3 mortes (1 avant) | oui |
| ÉPERON, percussion en boost | joueuse vivante, flèche détruite (morte avant) | oui |
| BRAISE I / II | 36,3 / 44,3 dégâts (0 avant) | oui |
| Répit, seconde coupe | 0 segment perdu (8 avant) | oui |
| Endurance 60 s par carte, trois profils | zéro erreur, zéro pixel hors palette | oui |
| Pilotes (contre-épreuve du médiateur, protocole de `tools/pilotes/parties.mjs`) | 14 parties sur 14 jusqu'à la fin, zéro erreur ; résultats identiques aux reçus sauf là où le pilote prend une nouvelle carte | oui |
| Invariants | mur mortel, morsure qui coupe, purge sans propagation | oui |

**Verdict : ACCEPTÉ.** Reste ouvert (chantier suivant) : les passifs PERFORATION, SURTENSION, ÉPINES ; BRAISE qui
renforce le LASSO (texte retiré, rien de promis).
