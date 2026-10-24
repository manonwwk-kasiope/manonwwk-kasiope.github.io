# Rapport des critères R-01 à R-38

Bundle : `http://127.0.0.1:61885/proto-neon/index.html` (empreinte 61a924e614ea) — 18/10/2026 · 05 h 16 (Paris) — 277.5 s.

**0 ok, 4 en échec, 0 partiels, 0 non mesurables, 0 hors banc, 0 en erreur.**

| Critère | Statut | Bloquant | Résumé |
|---|---|---|---|
| R-14 Budgets d’effets | ÉCHEC | oui | 0 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-15 Rythme | ÉCHEC | oui | 2 ok, 6 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-31 Le plateau se déplace | ÉCHEC | oui | 6 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-35 Relance | ÉCHEC | oui | 1 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |

## R-14 — Budgets d’effets : ÉCHEC

Seuil : ≤ 12 % d’images secouées ; ≤ 1 bannière par 10 s hors CYCLOPE. Script : `tools/mesure/criteres/R-14-budgets-effets.mjs` (45.3 s).

- ✗ images secouées (pire partie) : 0.14641 (seuil "≤ 0.12")
- ✗ bannières à moins de 10 s de la précédente, hors CYCLOPE : 295 (seuil 0)

## R-15 — Rythme : ÉCHEC

Seuil : vagues nommées et annoncées ; respirations ≥ 8 s < 40 % ; pics croissants ; pic en V3-V5 ; 0 tir ennemi en V1. Script : `tools/mesure/criteres/R-15-rythme.mjs` (157.1 s).

- ✓ vagues nommées (entrées avec nom) : 1 (seuil 1)
- ✗ vagues annoncées par une bannière (± 1,5 s) : 0.41951 (seuil 1)
- ✗ respirations de 8 s sous 40 % du pic, après chaque pic : 0.91979 (seuil 1)
- ✗ pics de vivants croissants V1 < V2 < V3 < V4 < V5 (médianes) : [6,10,17.5,20,19] (seuil "strictement croissants")
- ✗ pic connu en V3 (événement vague/pic) : 0.9 (seuil 1)
- ✗ pic connu en V4 (événement vague/pic) : 0.94444 (seuil 1)
- ✗ pic connu en V5 (événement vague/pic) : 0.72414 (seuil 1)
- ✓ tirs ennemis avant la vague 2 : 0 (seuil 0)

## R-31 — Le plateau se déplace : ÉCHEC

Seuil : ≥ 25 % en mouvement (V2-V5) ; TRAVELLING V2, V3, V5 ; 5 VOLS ; ≥ 4 convois en V4 ; 0 mort par mur mobile non annoncé. Script : `tools/mesure/criteres/R-31-plateau.mjs` (69.9 s).

- ✓ arène en mouvement, vagues 2 à 5 : 0.2622 (seuil "≥ 0.25")
- ✓ TRAVELLING en V2 : 1 (seuil 1)
- ✓ TRAVELLING en V3 : 1 (seuil 1)
- ✗ TRAVELLING en V5 : 0.97436 (seuil 1)
- ✓ VOLS par partie gagnée : 5 (seuil 5)
- ✓ convois en V4 (minimum par partie) : 4 (seuil "≥ 4")
- ✓ morts par un mur mobile sans annonce : 0 (seuil 0)

## R-35 — Relance : ÉCHEC

Seuil : REJOUER → serpent en main < 2 s, sans briefing ; V1 ≤ 24 s (médiane). Script : `tools/mesure/criteres/R-35-relance.mjs` (4.9 s).

- ✗ REJOUER → serpent en main (s) : 2.81667 (seuil "< 2")
- ✗ REJOUER sans briefing : false (seuil true)
- ✓ durée de V1 (médiane, s) : 23.89167 (seuil "≤ 24")
