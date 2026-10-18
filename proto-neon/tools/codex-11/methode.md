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

## Passe exploratoire 2 — décidée le18/10/2026 à03h32 avant exécution

Passe1 : 160/160 fins, zéro erreur ; maladroit56,32s, humain213,07s, bon35% de victoires, expert45%. Dieu médiane379,18s, mais plage328,37–457,39s : le seuil de durée porte sur toutes les parties et reste non validé. Onze B. V1 mesurée sous24s sur les20graines bon.

Une seule variation : le plafond intermédiaire de V2, à12s de vague, passe de8 à10 (`directeur.vagues.1.plafonds.1.n`). Départ4 et palier final16 à26s conservés, cadence et toutes les autres valeurs inchangées. Hypothèse : remettre de la pression après l'entrée calme, pour réduire le léger dépassement humain et le taux de victoire bon, tout en conservant la survie maladroite. Ce n'est pas une cause prouvée avant mesure. Aucune retouche de V4/V5 ni des pilotes ; la paire conserve le85 antérieur àp14. Les ajouts p14 reçus par pull sont conservés dans le checkout, sans modifier les séries figées.

## Passe exploratoire 3 — dernière, décidée le18/10/2026 à03h41

Passe2 rejetée : 158/160 fins, deux bornes540s (bon/2 et dieu/2), zéro erreur ; humain247,78s, expert25% de victoires, cinq B après traitement des censures. Aucune nouvelle B par rapport aux séries antérieures. La passe1 reste la meilleure référence entièrement finie et sans erreur.

Repartir de passe1 : seul le budget total de V2 passe de38 à34s, respiration8s conservée. Le plafond intermédiaire revient8 (celui de passe1), sans nouveau réglage de densité, V1 et V3–V5 inchangées. Hypothèse : réduire la longueur de la séquence tout en conservant l'entrée et l'apprentissage observés, pour ramener humain vers sa cible sans ajouter d'ennemis. Tous les résultats seront publiés. C'est la troisième et dernière passe ; le contrôle final50 utilisera la candidate retenue, aucune quatrième passe ni retouche après ce contrôle.

Choix de candidate : d'abord collecte entièrement finie et sans erreur, V1≤24s et survie maladroite45–150s ; puis les cibles humaines et de durée dieu demandées par l'ordre, enfin les B globales pour apprécier les compromis. Un seuil manqué reste publié même si la médiane s'améliore. La passe2 ne sera pas retenue avec ses deux cas censurés.

## Réparation technique avant qualification — TRAQUEUR

18/10/2026 · 03 h 45. Deux contrats reproduisent un défaut créé par la garde de plafond : le TRAQUEUR, hors quota régulier, était refusé au plafond de vague ; son compteur et sa bannière étaient consommés même quand spawn renvoyait null. La garde totale40 est conservée ; la garde régulière ne concerne plus le TRAQUEUR. Un spawn refusé ne consomme plus compteur ni bannière. Deux échecs avant, dix-huit contrôles conformes après (`contrats-defaut-traqueur.json`, `contrats.json`). Aucun paramètre de difficulté ajusté à cette occasion.

La troisième passe a déjà un reçu bon/2 censuré à540s : elle ne satisfait pas le critère prédéfini de collecte entièrement finie. La file attendra sa fin réelle et conservera tous ses cas avant de retenir la candidate1 (la seule des trois entièrement finie et sans erreur). Le contrôle final50 utilisera les valeurs de1 et le correctif TRAQUEUR. Nouvelle empreinte de source : ses400cas seront recueillis, sans réutiliser les160reçus antérieurs comme s'ils portaient sur le correctif. Aucune quatrième passe de réglage, aucune retouche après ce contrôle final. Le résultat final peut contredire l'exploration et restera publié.
