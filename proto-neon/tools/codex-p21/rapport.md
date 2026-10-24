# codex-p21 — gestes sûrs et commandes

18/10/2026 · 03 h 37 (Paris), **mis à jour le 18/10/2026 · 04 h 15**.

**Commande hors bac :** `cd proto-neon && node tools/codex-p21/verifier.mjs --raccord`

**Lot arrêté : corrections de sûreté et preuves VM livrées ; R-23 non validé.** Le raccord réservé doit être intégré et les contrôles navigateur restent à exécuter. Aucun seuil n'a été abaissé. Aucun serveur ni Chromium n'a été lancé dans ce bac.

## Ce qui change

- `90-boot.js` conserve l'excursion maximale d'un doigt : revenir à l'origine ne transforme plus un mouvement en toucher. Un TENU exige désormais aussi le déplacement limité prévu par les règles.
- Les seuils tactiles du boot lisent N.R. Les deux ajouts `gestes.zoneMorte = 0.08` et `gestes.tapMenu = 0.3` centralisent les valeurs reçues, sans les modifier. Raisons dans [demandes.md](../../refonte/lots/demandes.md).
- [raccord-70-joueuse.patch](raccord-70-joueuse.patch), deux lignes : une poussée implicite désarmée par un virage serré doit refaire les 120 ms existantes droit devant. Le maintien à 20°, la coupure au-delà de 30° et le boost explicite tenu/suspendu/repris restent conformes. **70-joueuse.js est intact sur disque ; ce raccord n'est donc pas dans index.html.**
- R-22/R-33 utilisent le nouvel instrument de [gestes.mjs](gestes.mjs) ; R-23 matérialise enfin le manche virtuel de la variante un pouce et suit le protocole officiel des pilotes. Toute partie manquante ou erronée empêche la qualification.

## L'instrument avant le verdict

La VM charge les vraies sources dans l'ordre du build, avec stockage vierge, jour 20261017, départ plongée, initialisation de l'horloge et simulation par tranches de 0,25 s jusqu'à fin. Calibration sur e1bdc6f : **10/10 références exactes** en temps de jeu/combat/simulation, vague et score, d'abord dans le processus principal puis dans un processus distinct par partie. Preuves : [validation-vm.json](validation-vm.json), [validation-processus.json](validation-processus.json).

Le reçu R-22 de la batterie 8f55a91 indique bien 0/6 touchers et glissés, mais **6/6 durées de tenu**, et non 0/6 tenu. Sur les sources reçues, les vrais handlers produisent déjà **6/6 par geste**, avec effets N.joueuse et journal réel. L'ancien helper envoyait un touchEnd non vide, contraire au contrat CDP installé (`node_modules/playwright-core/types/protocol.d.ts:7871`). Le nouveau helper envoie l'ensemble actif restant dans touchMove, puis un touchEnd vide pour le dernier doigt.

Le modèle CDP de la VM vérifie les cas connus, la conservation du manche et l'absence de doigt fantôme. Le script navigateur doit encore confirmer ce contrat par les vrais changedTouches. Il contrôle aussi un pouvoir déclenché directement, les deux horloges et un déplacement réel de la tête : si ce garde-fou échoue en paysage, R-22/R-33 sont non mesurables et restent bloquants, tandis que R-23 continue indépendamment. Les essais pouvoirs/APOGÉE sont **indépendants et préparés prêts par API publique** ; ils ne prétendent pas contourner la recharge naturelle. Les accélérations sont mesurées sur S.player.boost et sa réserve, avec journal on/off, pas sur un compteur d'appels. [instrument-vm.json](instrument-vm.json).

## Mesures courtes avant/après

| Cas VM | Sources reçues | Boot corrigé | Avec raccord final |
|---|---:|---:|---:|
| Touchers indépendants → pouvoirs réels | 6/6 | 6/6 | 6/6 |
| Glissés indépendants → APOGÉE réelle | 6/6 | 6/6 | 6/6 |
| Tenus indépendants → boost réel | 6/6 | 6/6 | 6/6 |
| Slalom isolé : images boost | 0 | 0 | 0 |
| Slalom après poussée droite : images boost | **23** | **23** | **0** |
| Aller-retour de 12 pt : pouvoir parasite | **1** | **0** | **0** |
| Mouvement tardif de 30 pt : tenu parasite | **1** | **0** | **0** |

[gestes-avant.json](gestes-avant.json), [gestes-apres.json](gestes-apres.json), [gestes-apres-raccord.json](gestes-apres-raccord.json), [bornes-avant.json](bornes-avant.json), [bornes-apres.json](bornes-apres.json).

Les parcours de recentrages durent au moins 120 s : **86 poses par profil**, zéro action parasite et zéro image d'entrée boost avant/après, sur paysage, portrait et bureau en VM. Les 3 parasites de la batterie ne sont pas reproduits avec ces identifiants corrects ; leur disparition dans Safari n'est pas prouvée. Les bornes 10/24 pt et 180/220 ms restent inchangées. Les quatre contrôles des angles et du tenu passent : [boost-bords.json](boost-bords.json).

Les **28 scénarios de commandes transposés en VM passent avant/après raccord** : [commandes-avant.json](commandes-avant.json), [commandes-apres.json](commandes-apres.json). Cela ne remplace pas les 28 contrôles Playwright d'origine, que verifier.mjs lance ensuite hors bac.

## Parties et R-23

**80/80 paires ordinaires identiques**, y compris temps, vague, score, morts, cartes et empreinte du journal complet ; 80 fins par état, zéro erreur de jeu/console VM. Comparaison avec l'état reçu, pas avec les scores de e1bdc6f : [pilotes-avant.json](pilotes-avant.json), [conservation-finale.json](conservation-finale.json).

R-23, mêmes cinquante graines par variante et par état, manche virtuel actif :

| État | Variante | Victoires | Taux | Seuil | Erreurs |
|---|---|---:|---:|---:|---:|
| Reçu | diriger | 5/50 | 10 % | ≥15 % | 0 |
| Reçu | auto | 6/50 | 12 % | ≥35 % | 0 |
| Après raccord | diriger | 5/50 | 10 % | ≥15 % | 0 |
| Après raccord | auto | 4/50 | 8 % | ≥35 % | 0 |

Les quatre lots ont **50 fins chacun**. Diriger n'envoie aucune impulsion de pouvoir/APOGÉE/boost ; ses **50 journaux sont identiques avant/après**. En AUTO, 19/50 parties sont strictement identiques ; les victoires des graines 4, 17, 23, 25 sont perdues, celles de 11 et 24 gagnées. Le raccord de sûreté n'est donc pas une amélioration du taux de victoire sur cet échantillon. [r23-avant-pouce.json](r23-avant-pouce.json), [r23-apres-raccord-pouce.json](r23-apres-raccord-pouce.json), [r23-comparaison.json](r23-comparaison.json).

Diagnostic résiduel AUTO, identique avant/après : TRAVERSÉE part pour un projectile proche qui s'éloigne ou passe à côté ; RALENTI ne part pas avec trois télégraphes actifs en vue. Le cas positif du tir entrant fonctionne. Les télégraphes sont des données publiques construites et conformes au schéma, sans qualification graphique. Ces défauts contredisent REFONTE.md §2.16 ; **leur contribution aux taux R-23 reste une hypothèse**. [auto-diagnostic-vm.json](auto-diagnostic-vm.json). Ils ne sont pas corrigés par le raccord boost.

## Essais échoués conservés

- Premier adaptateur commandes : **26/28**, car il lisait S.player avant les deux pas de publication après force(), présents dans le banc original. Corrigé sans toucher au jeu ni au seuil ; [preuve initiale](commandes-avant-instrument-initial.json).
- Premier cas de télégraphes du diagnostic AUTO : forme `cercle` refusée au schéma (trois erreurs par état), corrigée en `disque` avant de retenir le défaut RALENTI. [Instrument initial non admissible](auto-diagnostic-instrument-initial.json). Le cas corrigé a zéro erreur de schéma.
- Transport R23 en threads Worker : arrêt natif Node **139**, avant à 40/100 et après à 29/100 reçus. Cause non établie. Cas achevés conservés, seuls les manquants repris en processus distincts après calibration 10/10. Reprise terminée, code 0 ; conservation finale terminée code 0. [incident-node.json](incident-node.json).
- Le premier raccord, archivé, désarmait aussi entre 15 et 30° ; le raccord final préserve le maintien à 20°. La conservation finale a été refaite sur cette version, sans réutiliser celle du premier raccord.

## État livré et dépendances

`index.html` est reconstruit depuis les sources possédées, construction sortie 0 ; 22 scripts et 3 critères contrôlés en syntaxe, diff sans erreur ([reçu final](verification-finale.json)). 03-socle.js et 70-joueuse.js sont inchangés. Aucun commit. [bilan-vm.json](bilan-vm.json) donne les empreintes et les verdicts, avec les réserves.

1. Codex-p4d/cheffe : intégrer le raccord boost de deux lignes dans le module réservé.
2. Propriétaire de 85-pilote.js : reprendre la politique expert diriger, encore à 10 % pour 15 % requis. Propriétaire de 70-joueuse.js : traiter les défauts AUTO documentés, puis mesurer leur effet. Demandes écrites avec fichier et raison ; aucune modification de ces fichiers réservés.
3. Hors bac : lancer verifier.mjs avec --raccord (avant/après, trois profils, journal, effets réels, buffers/captures, R-22/R-23/R-33 et banc commandes original ; Chromium unique et muet). Les échecs avant sont conservés comme mesures ; le code de sortie juge le candidat après. Puis qualifier Safari sur iPhone physique.

Aucune preuve de pixels, de navigation système, de latence Safari ou de résultat Playwright n'est inventée. **Sous-tâche code/VM terminée ; palier R-23 non validé, chantier non achevé.**
