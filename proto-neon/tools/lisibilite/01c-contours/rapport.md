# codex-01c — tentative unique contours et enseignes

18/10/2026 · 01 h 40, Paris ; mis à jour à 18/10/2026 · 01 h 41. **Lot arrêté : proposition non conforme, arbitrage Claude requis.** Le candidat n’est pas appliqué à src/15-decor.js ; la production conserve 01b.

La référence numérique 01b passe ses 315 relevés. Le candidat est figé au SHA `0ab886f45981eaa160d7a19e49ea2da3b44f864451b496237554dbf57ad735e7` ; la seule différence entre les deux bundles de mesure est `15-decor.js`. Le manifeste et trois snapshots compressés se trouvent dans bundles/. Le runtime est celui figé avant 05b et les dernières intégrations p4/p7/thèmes : ce rapport qualifie la proposition artistique isolée, pas la production actuelle. Les 45 relevés initiaux de chaque version ont été conservés sans les rejouer (même SHA de bundle) ; seuls les 270 manquants ont été ajoutés. Les relevés incomplets du premier plafond de sécurité demeurent archivés dans mesures/limite-initiale-* ; seule la borne de secours est passée de 2600 à 12000 images pour couvrir 30 secondes effectives, sans modification des seuils.

315 relevés par bundle : sept états × trois profils × 15 relevés à 2 secondes d’intervalle sur 30 secondes de jeu, tampon du décor pris dans draw() après drawFront et avant les acteurs. La plage d’éclipse garde son minimum 8 %, ailleurs 12 %. Sol sur toute la largeur sous l’horizon : chaud ≤ 3 %, lumineux L > 0,25 ≤ 8 %. Ciel chaud ≤ 12 %, zéro cyan. Aucun seuil abaissé.

| Cas | Ciel lumineux minimum avant → candidat % | Ciel chaud maximum % | Sol lumineux maximum % | Relevés couleur en échec |
|---|---:|---:|---:|---:|
| paysage v1 | 19.16 → 11.04 | 9.63 | 0.28 | 15/15 |
| paysage v2 | 20.89 → 11.50 | 10.12 | 0.28 | 3/15 |
| paysage v3 | 21.15 → 10.82 | 9.60 | 0.25 | 15/15 |
| paysage v4 | 14.43 → 13.07 | 9.63 | 0.28 | 0/15 |
| paysage v5 | 20.21 → 11.21 | 9.63 | 0.28 | 15/15 |
| paysage boss | 11.44 → 4.59 | 2.47 | 0.39 | 15/15 |
| paysage defile | 14.43 → 13.07 | 9.63 | 0.28 | 0/15 |
| portrait v1 | 15.24 → 10.81 | 9.95 | 0.00 | 15/15 |
| portrait v2 | 13.10 → 11.24 | 9.95 | 0.00 | 14/15 |
| portrait v3 | 19.38 → 10.79 | 9.95 | 0.00 | 15/15 |
| portrait v4 | 15.38 → 11.97 | 9.95 | 0.00 | 1/15 |
| portrait v5 | 20.38 → 11.08 | 9.95 | 0.00 | 15/15 |
| portrait boss | 10.62 → 4.33 | 2.17 | 0.00 | 15/15 |
| portrait defile | 15.38 → 11.97 | 9.95 | 0.00 | 1/15 |
| bureau v1 | 22.43 → 11.06 | 9.88 | 0.26 | 15/15 |
| bureau v2 | 22.64 → 11.56 | 9.89 | 0.26 | 6/15 |
| bureau v3 | 24.80 → 10.91 | 9.90 | 0.26 | 15/15 |
| bureau v4 | 15.31 → 13.03 | 9.90 | 0.23 | 0/15 |
| bureau v5 | 20.75 → 11.21 | 9.89 | 0.23 | 14/15 |
| bureau boss | 10.88 → 4.47 | 2.30 | 0.36 | 15/15 |
| bureau defile | 15.31 → 13.03 | 9.90 | 0.23 | 0/15 |

Source détaillée : mesures/avant.json et apres.json ; agrégation dans bilan.json. Échecs par contrôle : {'solChaud': 0, 'solLum': 0, 'cielLum': 204, 'cielChaud': 0, 'cyan': 0}. Le sol chaud reste au maximum 0.00%, le sol lumineux 0.39%, zéro cyan dans le décor. Aucune erreur de jeu ni de console. Les six empreintes hors jeu (ouverture, titre, vol, victoire, cartes, attraction) restent identiques pour 21/21 contextes, soit 126/126 empreintes. DÉFILÉ est en jeu ; attraction reste hors jeu.

Captures demandées avant/après dans mesures/ : paysage V4 entier et bord droit, portrait boss, bureau V5. Le jury compare le candidat X à la référence Y **avant 01b**, conformément à l’ordre, et non à la référence numérique 01b. Corpus anonymisé et avis intégraux : jury/. Les deux sessions étaient neuves et n’ont reçu que six PNG et une consigne sans chronologie, code, seuil, rapport ni avis croisé. ChatGPT gpt-6.1-sol xhigh préfère l’ambiance X mais la lisibilité Y ; Claude Opus 5.5 xhigh préfère globalement X sur les deux axes, tout en notant la lisibilité bureau X sous Y. L’accord « sans baisse de lisibilité » n’est pas atteint ; aucune moyenne ne tranche ce désaccord. Détails et limites dans jury/rapport.md. Ces captures fixes ne prouvent pas la jouabilité en mouvement, le son ni la performance.

Le p95 paysage est conservé brut dans bilan.json (borne de non-régression +0,5 ms inchangée). Les deux phases sont en série, mais d’autres équipes travaillent sur la machine ; aucune conclusion de performance au repos ni cause d’un éventuel écart n’est affirmée. Aucun second passage de performance n’est lancé pour faire disparaître un échec du candidat artistique déjà non conforme.

Décision attendue de Claude : conserver la version 01b ou donner un nouvel ordre explicite avec sa méthode et ses critères. La tentative autorisée a été mesurée et les deux juges ont rendu leur avis malgré l’échec numérique, comme demandé à 01 h 05. Aucun réglage après mesure et aucune troisième méthode. Source 15 libérée pour arbitrage.

Contrôle de la production courante, après les intégrations reçues par pull : build réussi ; écran-titre sur trois profils sans erreur (`production-console/titre.json`). Ce contrôle ne qualifie pas le candidat artistique.
