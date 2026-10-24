# Ordre12 — HUD seul et étalon R15

18/10/2026 · 05 h 44 (Paris).

Autorité : COORDINATION ordre12, arbitrage Claude05h35. Référence actuelle e52da2de1b5f606b6ccbe033f4bcaba30dcb95ef figée avant modification de78. Aucun changement de76-directeur,76-defile,02-regles ni de pilote. Patch p27b déjà intégré par Claude, ne pas le réappliquer. Arrêt des regroupements, pics/respirations au jury et aucune rechercheB.

Paired huitpilotes×dixgraines :80avant et80après sur la même base, seuls78-hud et79-scene changent.79-scene réservé p15c : patch appliqué sur copie en mémoire, jamais écrit danssrc. Toutes les autres sources gelées par série ; pulls ultérieurs préservés hors paire. Sources, SHA et journaux archivés. La qualification stricte VM11 reste non acquise ; chiffresVM bornés, pas une garantie de dessin identique.

R14/R15/R31/R35 avant/après Chromium, modes et seuils inchangés, un navigateur muet, attente chef.lock et zéroheadless, témoinboîte exclusif. R14paradmissions selonarbitrage05h08 ; absence de journal avant = nonmesurable, pas zéro. R15 exclut du dénominateur une vague perdue avant l’heure prévue de son pic et publie le nombre parprofil ; aprèscetteheure un pic reste exigé. Deux contreexemples construits avant mesure et aucun fauxévénement du jeu. Même correcteur suravant/après. Secousses12% inchangé, cause nommée seulement si prouvée (sinon hypothèse).

Aucune variation numérique, aucune nouvelle passe de difficulté. Après collecte, publier écarts et défauts, pas de retouche des sources figées. Si une faute technique est reproduite, correction ciblée documentée et seulement contrôle manquant.

## Reprise native — 18/10/2026 · 05 h 47

Le workerbon26947 quitte parSIGSEGV, sans exception JavaScript enregistrée ; parent26219 terminé,50cas agrégés. Log initial conservé avant-echec-worker-SIGSEGV.log. Cause native non établie. Reprise série par graine dans un processus distinct, même source/protocole/empreinte, cache existant conservé : aucune partie reçue n’est rejouée. Seuls banc/worker pilotent cette isolation, aucune règle ou calcul de jeu changé. Un seul processus de simulation actif à la fois.
