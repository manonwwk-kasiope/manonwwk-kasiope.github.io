# Rapport des critères R-01 à R-38

Bundle : `http://127.0.0.1:51972/proto-neon/index.html` (empreinte 76769be408d9) — 18/10/2026 · 06 h 20 (Paris) — 218.6 s.

**0 ok, 4 en échec, 0 partiels, 0 non mesurables, 0 hors banc, 0 en erreur.**

| Critère | Statut | Bloquant | Résumé |
|---|---|---|---|
| R-14 Budgets d’effets | ÉCHEC | oui | 1 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-15 Rythme | ÉCHEC | oui | 6 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-31 Le plateau se déplace | ÉCHEC | oui | 5 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-35 Relance | ÉCHEC | oui | 1 ok, 2 en échec, 0 indicatives hors cible, 0 non mesurables |

## R-14 — Budgets d’effets : ÉCHEC

Seuil : ≤ 12 % d’images secouées ; ≤ 1 bannière par 10 s hors CYCLOPE. Script : `tools/mesure/criteres/R-14-budgets-effets.mjs` (33.3 s).

- ✗ images secouées (pire partie) : 0.16335 (seuil "≤ 0.12")
- ✓ bannières à moins de 10 s de la précédente, hors CYCLOPE : 0 (seuil 0)

## R-15 — Rythme : ÉCHEC

Seuil : vagues nommées et annoncées ; respirations ≥ 8 s < 40 % ; pics croissants ; pic en V3-V5 ; 0 tir ennemi en V1. Script : `tools/mesure/criteres/R-15-rythme.mjs` (122.8 s).

- ✓ vagues nommées (entrées avec nom) : 1 (seuil 1)
- ✓ vagues annoncées par une bannière (± 1,5 s) : 1 (seuil 1)
- ✗ respirations de 8 s sous 40 % du pic, après chaque pic : 0.94505 (seuil 1)
- ✗ pics de vivants croissants V1 < V2 < V3 < V4 < V5 (médianes) : [6,11,18,22,19] (seuil "strictement croissants")
- ✓ pic connu en V3 (événement vague/pic) : 1 (seuil 1)
- ✓ pic connu en V4 (événement vague/pic) : 1 (seuil 1)
- ✓ pic connu en V5 (événement vague/pic) : 1 (seuil 1)
- ✓ tirs ennemis avant la vague 2 : 0 (seuil 0)
- note : Vagues perdues avant le pic exclues des contrôles pic/respiration : {"nombre":14,"parProfil":{"paysage":{"total":14,"V4":2,"V3":4,"V5":8}},"cas":[{"interrompue":true,"profil":"paysage","graine":4,"n":4,"disponible":16.89999999998463,"heurePic":30},{"interrompue":true,"profil":"paysage","graine":8,"n":3,"disponible":25.159583335389613,"heurePic":30},{"interrompue":true,"profil":"paysage","graine":9,"n":3,"disponible":6.816666666672091,"heurePic":30},{"interrompue":true,"profil":"paysage","graine":14,"n":5,"disponible":24.783333333310793,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":15,"n":5,"disponible":15.599999999985812,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":16,"n":5,"disponible":19.366666666649053,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":21,"n":5,"disponible":21.049999999980855,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":28,"n":5,"disponible":11.558333333322821,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":29,"n":4,"disponible":14.24999999998704,"heurePic":30},{"interrompue":true,"profil":"paysage","graine":34,"n":3,"disponible":14.000000000011141,"heurePic":30},{"interrompue":true,"profil":"paysage","graine":37,"n":3,"disponible":12.691666666676767,"heurePic":30},{"interrompue":true,"profil":"paysage","graine":43,"n":5,"disponible":15.273750001923673,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":49,"n":5,"disponible":15.374999999986017,"heurePic":32},{"interrompue":true,"profil":"paysage","graine":50,"n":5,"disponible":15.913333335256425,"heurePic":32}]}

## R-31 — Le plateau se déplace : ÉCHEC

Seuil : ≥ 25 % en mouvement (V2-V5) ; TRAVELLING V2, V3, V5 ; 5 VOLS ; ≥ 4 convois en V4 ; 0 mort par mur mobile non annoncé. Script : `tools/mesure/criteres/R-31-plateau.mjs` (58 s).

- ✓ arène en mouvement, vagues 2 à 5 : 0.25237 (seuil "≥ 0.25")
- ✓ TRAVELLING en V2 : 1 (seuil 1)
- ✗ TRAVELLING en V3 : 0.97959 (seuil 1)
- ✗ TRAVELLING en V5 : 0.97368 (seuil 1)
- ✓ VOLS par partie gagnée : 5 (seuil 5)
- ✓ convois en V4 (minimum par partie) : 4 (seuil "≥ 4")
- ✓ morts par un mur mobile sans annonce : 0 (seuil 0)

## R-35 — Relance : ÉCHEC

Seuil : REJOUER → serpent en main < 2 s, sans briefing ; V1 ≤ 24 s (médiane). Script : `tools/mesure/criteres/R-35-relance.mjs` (4.4 s).

- ✗ REJOUER → serpent en main (s) : 2.81667 (seuil "< 2")
- ✗ REJOUER sans briefing : false (seuil true)
- ✓ durée de V1 (médiane, s) : 23.89167 (seuil "≤ 24")
