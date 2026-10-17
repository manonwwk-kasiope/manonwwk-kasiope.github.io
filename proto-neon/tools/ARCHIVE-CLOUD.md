# Les bancs des lots du cloud (L1, L3a, L4a, L5a, L6a, L7a)

Décision de la propriétaire (17 octobre, nuit) : **le code local fait foi**. Les modules écrits par le cloud
sur les branches `lot/L1` à `lot/L7a` ne sont pas fusionnés, parce qu'ils refont les fichiers des lots
locaux B à G déjà intégrés. Seuls sont repris :

- `src/20-crt.js` du lot L1 : le tube cathodique en une passe par tables, le préréglage adaptatif (il descend
  d'un cran au-delà de 12 ms par image au p90, se coupe au-delà de 15 ms), l'extinction de fin de partie ;
- dans `src/90-boot.js` : la mesure du coût de l'image (S.perf, p50 à p99), `?perf=1` (affichage en bas à
  gauche), `?tube=riche|sobre|pur|coupe` et `?auto=0` ;
- les scripts de banc `tools/L*/` (sans leurs sorties) et les rapports `refonte/lots/L*.md`.

Attention : ces bancs ont été écrits contre les versions cloud des modules. Ils servent de RÉFÉRENCE (les
critères, les mesures, les scénarios) ; beaucoup échoueront tels quels contre le code local et sont à adapter
avant de compter. Les branches `lot/L*` restent en place pour qui voudrait relire une idée ou un algorithme.
Le lot L2 (décor, VOL, ouverture) n'a jamais été commité : il est abandonné, le lot local B le couvre.
