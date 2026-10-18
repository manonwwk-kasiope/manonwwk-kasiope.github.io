# codex-10 — DÉFILÉ et respiration

18/10/2026 02:46:03 (Paris) · mis à jour à 18/10/2026 02:46:03. Source et correctif à relire par Claude ; la médiation et l’intégration ne sont pas déduites des tests. **Le palier des pilotes reste non validé : 80/80 fins avant, 79/80 après et une borne à 540 s (dieu, graine 2), sans erreur.** Le journal de ce cas continue d’avancer et d’enregistrer des actions ; aucune fin n’est revendiquée au-delà de la borne. Le plafond n’a pas été relevé pour faire passer le lot.

Trois parcours de contrat (départ public en V3, pilote dieu avec invulnérabilité de test pour observer toute la séquence) V3 → cartes → VOL → DÉFILÉ → VOL → V4, cinq escadrilles et quarante planeurs, sans erreur. Captures V3, DÉFILÉ et V4 dans parcours/. Le compteur est sous le radar ; lecture à la taille réelle à vérifier sur iPhone physique. Le complément visuel par la vraie boucle d’images confirme CIEL/calme sur les trois profils (visuel/), avec captures après stabilisation ; il ne rejoue pas le parcours déjà validé. Les contrats dans contrats/ vérifient le contact inoffensif et le mur mortel après désactivation de l’invulnérabilité, puis quarante kills par l’API réelle de dégâts, en contrôle invulnérable pour isoler le score : prime PARFAIT de N.R une seule fois et rare garantie dans la main suivante. Ces quarante kills de contrôle ne sont pas une performance de pilote. Le premier contrôle de la main rare était invalide : dbg.etat(cartes) depuis VOL relançait la partie, visible au retour du numéro de vague à 1. Il est archivé dans contrats-initial/. Seuls ces trois contrôles ont été repris, en observant la vraie main suivante de V4 dans la même partie (contrats-complement/) ; les trois contrôles contact/mur déjà conformes ont été conservés.

La respiration se déroule dans la vague avant le nettoyage : elle suspend les producteurs, purge les attaques restantes sans score de combat et commence son compteur uniquement quand la densité est strictement sous 40 % du maximum réel de la vague. Le parcours observe chaque pas de la respiration V3 sur les trois profils ; les journaux des 80 parties après contiennent 112 respirations complètes (durée et seuil enregistrés conformes : true). Les parties qui meurent avant cette séquence ne sont pas comptées comme une respiration réussie.

## Défilés dédiés, bon et humain

Dix graines par pilote, départ direct au DÉFILÉ par le contrat public, vitesse de V3, build initial canon I/longueur initiale, aucune invulnérabilité de test. Humain en mode actions auto, bon en mode doigts comme le banc 02. Il s’agit de la prise de cibles dans ce build contrôlé, distincte des parcours entiers ci-dessous. Un état fin avant 24 s signale une mort avant la fin du bonus.

| Pilote | Graine | Planeurs | Temps du bonus s | État terminal observé | Vies |
|---|---:|---:|---:|---|---:|
| bon | 1 | 2/40 | 24,00 | vol | 3 |
| bon | 2 | 2/40 | 24,00 | vol | 3 |
| bon | 3 | 0/40 | 24,00 | vol | 3 |
| bon | 4 | 0/40 | 24,00 | vol | 3 |
| bon | 5 | 0/40 | 24,00 | vol | 3 |
| bon | 6 | 0/40 | 24,00 | vol | 3 |
| bon | 7 | 3/40 | 24,00 | vol | 3 |
| bon | 8 | 0/40 | 24,00 | vol | 3 |
| bon | 9 | 2/40 | 24,00 | vol | 3 |
| bon | 10 | 0/40 | 24,00 | vol | 3 |
| humain | 1 | 3/40 | 24,00 | vol | 3 |
| humain | 2 | 2/40 | 24,00 | vol | 3 |
| humain | 3 | 3/40 | 24,00 | vol | 3 |
| humain | 4 | 1/40 | 24,00 | vol | 3 |
| humain | 5 | 6/40 | 24,00 | vol | 3 |
| humain | 6 | 3/40 | 24,00 | vol | 3 |
| humain | 7 | 1/40 | 24,00 | vol | 3 |
| humain | 8 | 0/40 | 24,00 | vol | 3 |
| humain | 9 | 5/40 | 24,00 | vol | 3 |
| humain | 10 | 5/40 | 24,00 | vol | 3 |

## Parties complètes

Banc02 original, 8 pilotes × 10 graines avant et après, aucune politique modifiée ; mêmes graines, plafond 540 s, pas fixe et gardes conservés. Reçus gzip et journaux complets dans 80/. Avant conforme : true ; après conforme : false. Huit répétitions par version : true / true. Les écarts individuels (vague, score, temps, morts, entrée au bonus, prises quand le bonus finit) sont dans bilan.json. Les moyennes décrivent seulement ce lot et ne prouvent pas une difficulté optimale. Le recalibrage appartient à codex-p5.

| Pilote | Fins avant → après /10 | Temps moyen avant → après s | Score moyen avant → après | Entrées au DÉFILÉ après |
|---|---:|---:|---:|---:|
| inerte | 10 → 10 | 25,82 → 28,44 | 31,00 → 233,00 | 0/10 |
| tourneur | 10 → 10 | 17,70 → 17,70 | 454,00 → 454,00 | 0/10 |
| maladroit | 10 → 10 | 29,87 → 25,56 | 3033,00 → 2218,00 | 0/10 |
| kamikaze | 10 → 10 | 29,38 → 28,98 | 4690,00 → 3990,00 | 0/10 |
| humain | 10 → 10 | 124,04 → 127,95 | 32516,00 → 22452,00 | 2/10 |
| bon | 10 → 10 | 134,49 → 159,37 | 25412,00 → 27498,00 | 3/10 |
| expert | 10 → 10 | 105,29 → 94,91 | 14202,00 → 8751,00 | 1/10 |
| dieu | 10 → 9 | 392,77 → 450,26 | 176003,00 → 160157,00 | 10/10 |

## Raccord, limites et suite

Le seul raccord de 79-jeu est fourni dans raccord-jeu.patch, basé sur l’intégration aventure 09 et ses départs explicites de test. Le fichier 79 partagé est resté à son écrivain ; manifeste de sources et deux bundles gzip figés dans ce dossier pour reproduire les essais. La génération peut être rejouée sur le 79 courant seulement après lecture du nouveau diff, sans le remplacer par une ancienne version. Les réponses de Claude confirment de conserver 24 s, 5 escadrilles et 4,5 s : le dernier départ à 18s laisse6s dans la fenêtre bonus, pour une courbe individuelle de 8 s. Aucun chiffre changé dans 02-regles.js. La morsure reste une coupe selon l’invariant actuel de N.R ; seule la mort au mur reste possible pendant le bonus.

Chromium émulé, muet, fenêtres en série après pgrep ; témoin commun de créneau utilisé. Pas une qualification Safari/iPhone physique, ni un verdict de qualité artistique, d’intérêt ou de performance au repos. Aucun achat. Limite de métadonnée relevée : les journaux de mort du contrôle au mur portent encore centrale pour le numéro de vague 3. 70-joueuse.js consulte quartierCourant(), absent de 15-decor.js, au lieu du getter public quartier(). Correction à traiter par son écrivain, signalée dans la coordination ; les captures Chromium confirment séparément le décor CIEL.

Prochaine étape : Claude relit/applique le correctif sous la réservation de 79 courante, fait la médiation, puis le réglage reprend sur le jeu enrichi.
