# codex-p18 — point de reprise

18/10/2026 02:56:27 (Paris), mis à jour à 02:56:27.

Objectif : bon/kamikaze ≥ 1,3 et tourneur/bon < 0,10 sur 50 graines, sans changer durée/vague des 80 parties. Fichiers réservés : 77-score.js, ajouts N.R, section demandes, ce dossier ; aucun commit.

Sources reçues sauvegardées ici dans 77-score-avant.js et 02-regles-avant.js. Instrument Node/VM fondé sur tools/reglage/vm.mjs et le protocole commun reglage/protocole.mjs, lui-même conforme à pilotes/parties.mjs. Validation initiale historique 10/10 exacte, revalidation de la variante VM avec objets standard hôtes en cours pour mesurer son coût. Reçus avant incomplets, reprenables par empreinte source. Aucun score de jeu modifié à ce stade.

Méthode : relever les vraies écritures ajouter et les événements publics, rapprocher leur somme du score final et des primes de p12 au bilan ; 50 graines bon/kamikaze/tourneur et 10 graines des cinq autres pilotes, soit 200 parties distinctes par état. Journaux gzip conservés. Maximum trois candidats de score si les mesures l'exigent ; seuils de critères intangibles. Arrêt si une mécanique de combat ne peut pas être conservée dans le périmètre de fichiers autorisé. Le score conserve les primes de p12. Le score reçu commande aussi la vie bonus et le défi historique : toute nouvelle prime doit être dissociée de ces effets, puis conservation mesurée.

Reste : collecte avant, choix et implémentation, collecte après, comparaison 80 parties et tables de sources, build, script Playwright prêt (sans exécution dans le bac), rapport. Pixels et Safari : à vérifier hors bac. Aucun serveur/Chromium tenté.

Prochaine action : finir validation puis `node proto-neon/tools/codex-p18/mesurer.mjs avant` ; reçus existants réutilisés si hash identique. Coût financier engagé : aucun service externe. Pas de limite de durée ou de budget chiffré reçue pour cette mission ; plafond local retenu : trois candidats.

Candidate 1 écrite, huit scénarios ciblés satisfaits, build sortie 0. Avant sur 50 bon + 50 kamikaze : rapport 2,218742, déjà supérieur à 1,3 sur les sources reçues (différent du constat p5). Ne pas attribuer cette entrée au lot p18. Collectes avant/après poursuivies en parallèle sur leurs sources capturées ; sessions exec 64861 et 87655. Aucune autre source modifiée. Vérifier les résultats complets, rapporter.mjs puis revue diff/empreintes ; navigateur toujours à vérifier hors bac.

18/10/2026 03:02:49 (Paris), mis à jour : avant 200/200 ; après 193/200, zéro erreur. Cinquante graines complètes par bon/kamikaze/tourneur : rapports après 3,332277048438207 et 0,003464203233256351. Candidate 1 conservée, aucune nouvelle passe. Vérification de périmètre, ajouts seuls N.R, source des reçus et présence des sources dans le bundle : tous vrais (verification-source.json). Reste : finir les parties dieu, exécuter rapporter.mjs, mettre à jour demandes et ce point de reprise, contrôle final du diff ; ne pas rejouer les cas déjà validés. Navigateur toujours prêt et non exécuté.

18/10/2026 · 03 h 05 (Paris), mis à jour à 03 h 05 : palier VM VALIDÉ. Les deux collectes finies (200+200), rapporter.mjs sortie 0 ; 80/80 obligatoires et 200/200 étendues conservées jusqu’au journal complet, mêmes primes p12, zéro erreur/écart comptable. Rapports 3,332277 et 0,003464. Rapport et script navigateur livrés, aucun commit. Aucune nouvelle passe nécessaire. Reste uniquement la commande hors bac `cd proto-neon && node tools/codex-p18/verifier.mjs`, puis revue des captures ; ne pas rejouer les séries VM déjà validées.
