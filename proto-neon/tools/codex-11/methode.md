# codex-11 — méthode avant mesure

18/10/2026 · 03 h 04 (Paris).

Ordre : directeur réglable dans N.R, V1≤24s, cinq VOLS, début progressif sans diminuer les paramètres de combat V4/V5. Aucun pilote, seuil, règle de mort ou durée du DÉFILÉ retouché.

Banc p5 repris à l'identique : banc, worker, protocole et analyse sont copiés, SHA enregistrés. Seul le chargeur VM peut lire un instantané JSON figé par SNAKE11_SOURCES afin que les intégrations parallèles ne changent pas la paire. Caches propres, pas de modification de tools/reglage. La validation VM historique n'est pas une preuve d'équivalence de la tête actuelle ; un contrôle VM/Chromium des mêmes parties et journaux est requis sur la paire.

Avant : huit pilotes, graines1–50, même plafond540s et protocole d'origine. Après : même lot apparié. Pour choisir les nouveaux paramètres de progression : au plus trois passes exploratoires sur1–20, arrêt après deux passes sans nouvelle cible B ; toutes les valeurs et les échecs conservés. Une seule qualification finale1–50, aucun réglage après. Ne pas relancer les cas déjà reçus. Borne540 = cas censuré, ni victoire ni défaite imputée.

R-35 et R-31 d'origine relancés via Chromium muet, sans abaisser leurs seuils. Un seul Chromium sur le Mac : attendre l'absence de /tmp/snake-chromium-chef.lock et de headless_shell ; créer /tmp/snake-chromium-boite exclusivement, libérer seulement notre témoin à la fin. Pas de suppression de verrou d'autrui. Pas d'achat.

Le cinquième VOL pourrait déjà être rétabli par le raccord codex-10 : vérifier les événements réels avant toute modification de79. Si un raccord est encore indispensable, livrer un patch à Claude (79 n'est pas réservé à Codex11). Défaut de métadonnée70 reste à son écrivain.

## Passe exploratoire 1 — valeurs figées avant exécution

Budgets totaux de vague (respiration de8s incluse) : V1 23,5s, V2 38s, V3 44s. Combat V4/V5 toujours48/50s ; suppression de l'attente devenue sans objet après purge, sans baisser les effectifs ou le boss. La respiration n'est jamais retranchée pour publier une durée.

V1 quota8, cadence de groupes4s ; plafonds successifs3 à0s,4 à8s,6 à12s ; FILE2, NUÉE2–3 ; entrées FILE0/8s, NUÉE12s. V2 cadence2s ; plafonds4 à0s,8 à12s,16 à26s ; MEUTE3, NUÉE2–4. Formations globales et V3–V5 conservées. Ces valeurs sont des hypothèses de progression, pas des effets déjà mesurés. Chiffres écrits dans N.R.directeur et consignés dans demandes.md.

Priorité du pic : quand son heure est atteinte, les groupes ordinaires attendent sa vraie apparition ; aucune élite fictive ne débloque la respiration. Cette correction structurelle précède toute mesure du candidat.
