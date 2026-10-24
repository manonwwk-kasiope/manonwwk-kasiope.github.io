# Rapport des critères R-01 à R-38

Bundle : `http://127.0.0.1:58090/proto-neon/index.html` (empreinte 1cc1fcf9f009) — 18/10/2026 · 04 h 22 (Paris) — 256.1 s.

**0 ok, 2 en échec, 0 partiels, 0 non mesurables, 0 hors banc, 0 en erreur.**

| Critère | Statut | Bloquant | Résumé |
|---|---|---|---|
| R-31 Le plateau se déplace | ÉCHEC | oui | 6 ok, 1 en échec, 0 indicatives hors cible, 0 non mesurables |
| R-35 Relance | ÉCHEC | oui | 0 ok, 3 en échec, 0 indicatives hors cible, 0 non mesurables |

## R-31 — Le plateau se déplace : ÉCHEC

Seuil : ≥ 25 % en mouvement (V2-V5) ; TRAVELLING V2, V3, V5 ; 5 VOLS ; ≥ 4 convois en V4 ; 0 mort par mur mobile non annoncé. Script : `tools/mesure/criteres/R-31-plateau.mjs` (251.4 s).

- ✓ arène en mouvement, vagues 2 à 5 : 0.34981 (seuil "≥ 0.25")
- ✗ TRAVELLING en V2 : 0.94828 (seuil 1)
- ✓ TRAVELLING en V3 : 1 (seuil 1)
- ✓ TRAVELLING en V5 : 1 (seuil 1)
- ✓ VOLS par partie gagnée : 5 (seuil 5)
- ✓ convois en V4 (minimum par partie) : 4 (seuil "≥ 4")
- ✓ morts par un mur mobile sans annonce : 0 (seuil 0)

## R-35 — Relance : ÉCHEC

Seuil : REJOUER → serpent en main < 2 s, sans briefing ; V1 ≤ 24 s (médiane). Script : `tools/mesure/criteres/R-35-relance.mjs` (4.6 s).

- ✗ REJOUER → serpent en main (s) : 2.81667 (seuil "< 2")
- ✗ REJOUER sans briefing : false (seuil true)
- ✗ durée de V1 (médiane, s) : 35.14104 (seuil "≤ 24")
