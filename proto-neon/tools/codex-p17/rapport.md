Commande hors bac : `cd proto-neon && node tools/codex-p17/verifier.mjs`

# codex-p17 — finition briefing, pause, fin ; R-36 terminal

18/10/2026 · 02 h 54 (Paris), mis à jour à 03 h 15.

Fichiers et contrôles VM terminés. **Chantier bloqué pour la validation finale navigateur** : HTTP et Chromium sont interdits dans ce bac ; le script est prêt pour la cheffe d'orchestre. Aucun serveur ni navigateur tenté ici. Aucune qualification Safari annoncée. Aucun commit.

Les défis tiennent sur une ligne : ✓ / ·, nom, progression alignée à droite. Aucun NON. Un libellé long utilise sa forme courte seulement s'il manque de place (PREMIER JET → 1ER JET, SANS COUPE → INTACT, SANS FILET → UNE VIE). Le briefing dit FINIR puis 2 DÉFIS ; le nom du prochain palier et son reste forment une seule expression, sans PROCHAIN isolé. Le score reste un nombre entier, y compris à sept chiffres ; la marque C figure dans son intitulé.

En portrait, résultat, énergie/progression et défis forment trois blocs espacés régulièrement. Les cibles SUITE et REJOUER, la zone sûre, l'échelle 2 et les couleurs de la palette sont conservées. La cause complète, le temps, la note, le build et les récompenses restent accessibles dans BILAN. Le prochain palier possède aussi sa barre au briefing et à la pause.

R-36 exige un prochain palier ordinaire, ou, à son terme, exige ensemble : prochain nul, tous les identifiants de N.R.deblocages réellement acquis et TOUT DÉBLOQUÉ réellement peint dans la zone sûre. L'écran vérifie lui aussi les acquisitions avant d'écrire cette phrase. Aucune récompense ajoutée ; seuils 25 / 180 / 350 / 550 / 800 et bornes parties 1–2 / 12–25 inchangés.

| Contrôle | Avant | Après / preuve |
|---|---|---|
| Calibration VM, références e1bdc6f : temps jeu/combat, vague, score | références historiques | 10/10 exactes dans `calibration.json` ; second instrument 10/10 dans `calibration-liaisons.json` |
| Parties, 8 pilotes × 10 graines | 80 fins mesurées | 80/80 strictement identiques, temps, vague, score et journal SHA-256 ; aucune erreur (`avant.json`, `apres.json`, `comparaison.json`) |
| Composition : 3 profils × 3 écrans × 4 stades ; vrais pixels, compteurs alignés, groupes entiers, aucun NON | 0/36 satisfont les nouveaux critères | 36/36 (`composition.json`) |
| Variantes extrêmes : causes/auteurs publiés, 5 défis disponibles, score 9 999 999 marqué C | premier candidat : 30 sorties de zone sûre sur bureau | zéro après correction (`variantes-echec-initial.json`, `variantes.json`) |
| Espaces entre blocs, fin portrait | — | 72 / 72 pixels de jeu entre rectangles de composition ; dernier défi à y=369, limite à 374 (`espacement.json`) |
| Cibles, police, palette du composant isolé | contrôles communs | SUITE/REJOUER ≥ 44 pt ; échelle ≥ 2 ; aucun index hors palette ni cyan (`composition.json`) |
| R-36 ciblé, état public et pixels | prochain toujours exigé, terminal refusé | 8 contrôles réussis, dont vrai dernier déblocage et refus d'un profil incomplet (`r36.json`) |
| Construction et syntaxe du script Playwright | — | `node build.mjs` : sortie 0 (`build.log`) ; script syntaxiquement valide |
| Playwright, captures et Safari | non exécutés ici | à vérifier hors bac |

Les parties suivent le protocole demandé : stockage vierge, S.jour=20261017, actions du pilote, intro sautée, départ plongée, amorçage de l'horloge, tranches de 0,25 s jusqu'à fin, bornes inchangées. Le témoin remplace 80-ecrans par la source reçue ; les ajouts déclaratifs de finition dans N.R sont communs et ne sont lus que par le nouvel écran. Les règles de combat sont celles reçues. Les reprises gardent la provenance de chaque instrument dans les JSON. La VM assemblée en fermeture lie les mêmes objets natifs ; elle a été calibrée avant usage et reproduit aussi exactement un expert courant, journal compris (`equivalence-vm.json`).

Les reçus des 80 parties ont été gelés avant le dernier ajustement des fragments de texte. Celui-ci modifie seulement `retourModele`, fonction de dessin absente du protocole de simulation : toutes les autres sources et les fonctions ouvrir/fermer/update/sortie/finActions sont identiques. `reutilisation-parties.json` vérifie ces conditions. Les 80 reçus du moteur sont réutilisés ; composition, variantes, R-36 ciblé et build sont vérifiés sur le rendu final. Les empreintes sont séparées : `candidat-parties.json`, `candidat.json`. Pour relire les reçus sans rejouer : `node tools/codex-p17/parties.mjs apres --recu-parties`.

Les contrôles de composition chargent les vraies sources et lisent leurs vrais pixels sans DOM. Les stades des défis sont des fixtures de présentation explicitement synthétiques : aucune mesure de difficulté n'en est déduite. Le dernier déblocage est acquis par le vrai bilan depuis le dernier seuil moins une unité. Les PNG `tampon-vm/` sont des rendus VM, pas des captures de navigateur.

Le script Playwright produit 72 captures avant/après : iPhone 13 paysage tactile 844 × 390, portrait 390 × 844 et bureau 1440 × 900 ; briefing/pause/fin ; défis zéro/en cours/faits et dernier palier acquis. Il mesure pixels des textes, chevauchements, compteurs, groupes entiers, barres, cibles, zone sûre, palette, cyan, journal et __ERR. Un seul Chromium muet, contextes en série ; zones sûres explicites. Résultats attendus : `playwright/resultats.json`. Chromium émulé ne qualifie pas Safari physique.

Essais insuffisants conservés : arrêt système Node 139 après 30 cas (`apres-interrompu-139.json`), sans cause établie ; candidat intermédiaire de 50 cas refusé par la garde d'empreinte, puis série finale séparée (`apres-candidat-intermediaire-50.json`) ; première comparaison prématurée avec seulement 74 témoins disponibles sur 80 (`comparaison-temoin-incomplet.json`), recalculée après les 80 fins sans rejouer les parties. Ces incidents concernent le banc ; aucun n'est converti en réussite ni effacé. Les 30 débordements initiaux sont conservés puis corrigés sans abaisser les critères.

Le critère R-36 complet sur 25 parties persistantes n'est pas déclaré validé par les huit contrôles ciblés. Hors bac, le lancer après les captures : `node tools/mesure/criteres/R-36-raison-de-revenir.mjs --sans-cache --sortie tools/codex-p17/r36-navigateur`. Les bornes de parties restent intégralement exigées.

Reste indispensable : exécution Playwright hors bac, relecture des captures et essai Safari réel ; reçu du critère R-36 complet. Aucun raccord hors réservation nécessaire. Le seul chiffre de mise en page ajouté, réserve de marque à 18 pixels, et sa raison figurent dans la section codex-p17 de `refonte/lots/demandes.md`.
