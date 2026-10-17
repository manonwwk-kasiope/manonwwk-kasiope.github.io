18/10/2026 · 01 h 20 (Paris) — mis à jour à 01 h 29.
Objectif : mines du CYCLOPE inoffensives >=0,8 s avant contact/souffle, annonce visible et publiée à la pose.
Base git 098bd37 ; avant-p4b.html identique au bundle Git. Aucun commit.
Correctif figé dans 72/73, N.R en ajout seulement, demandes.md dans la section codex-p4b. Build sortie 0. SHA après : 634c0df895ae64e96dba86baeae5ab76326d56c6d732528609ff3480703293ae.
VM validée : dix parties inerte e1bdc6f identiques temps/vague/score ; validation-p4b.log et validation-vm.json.
Six scènes mines après sur trois formats satisfaites : contact 0,816667 s ; souffle 1,403333 à 1,408333 s ; six publications synchrones par pose ; zéro erreur. Échec initial souffle portrait conservé (collision avec l'œil), corrigé dans la sonde par placement opposé. hors-champ-vm.json : protection jusqu'à 0,600 s de visibilité continue, interruption réinitialise le compteur. Aucun pixel mesuré en VM.
Douze parties avant/après terminées fin/0 erreur ; pilote bon : auteur cyclope 2→2, toutes morts pendant boss 3→5 (murs 1→3). Aucune mort par mine pendant boss. Dieu : 0 sous invulnérabilité. Journaux complets p4b-{version}-{pilote}-{graine}.json.gz ; morts-boss-p4b.json et rapport.md.
Contrôle final : controle-final-p4b.json ; bundle stable et périmètre respecté, git diff --check sortie 0. Aucun processus de partie encore engagé. Ne pas relancer les essais validés.
Reste indépendant terminé. Chantier bloqué uniquement sur la validation visuelle hors bac : aucun serveur/Chromium lancé, interdits ici. Commande pour la cheffe : cd proto-neon && node tools/codex-p4/verifier.mjs ; examiner playwright-p4b/resultats.json et captures. Palier visuel R-07/R-08 à vérifier ; compatibilité Safari appareil non qualifiée.
