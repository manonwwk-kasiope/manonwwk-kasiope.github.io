# codex-u1 — prise en main iPhone

24/10/2026 · 02 h 48 (Paris) · mis à jour à 02 h 48.

**Commande indispensable hors bac :** `cd proto-neon && node tools/codex-u1/verifier.mjs`.
Après intégration des trois raccords et reconstruction : `cd proto-neon && node tools/codex-u1/verifier.mjs --integre`.

**Sous-tâche locale livrée ; palier iPhone non validé, chantier bloqué sur le contrôle navigateur hors bac.** Aucun serveur, Chromium ni réseau sortant lancé ici ; aucun commit. Le script navigateur est complet et son analyse syntaxique passe, mais son exécution et le contrôle Safari réel restent à faire. L'absence de reçu navigateur ne devient pas une validation visuelle Safari.

## Ce qui change

- Titre à échelle entière calculée d'après la largeur sûre, sur le démarrage et le titre. Les illustrations existantes sont conservées.
- RÉGLAGES accessible au titre et en pause : ACTIONS, MANCHE, SECOUSSES, FLASHS, ÉCRAN, TEXTE, MUSIQUE, EFFETS. Cibles au moins 44 pt, pagination selon la place, retour jaune/violet au toucher, clavier par R/flèches/Entrée/Tab/Échap. Les valeurs existantes de N.R sont reprises. Le profil est écrit seulement par N.score ; les API publiques appliquent les effets. TEXTE agrandit les réglages et les prochaines bannières ; les compteurs de combat gardent leur taille reçue.
- ACTIONS AUTO pour un nouveau profil tactile portrait ; un choix mémorisé n'est pas remplacé. MANCHE influe réellement sur la déflexion, pas seulement sur son dessin. Musique et effets restent indépendants, y compris au retour d'un reset avec le raccord 79.
- Fin allégée : score, vague/temps/cause et conseil. Le bilan détaillé conserve records, note, défis, statistiques, énergie et prochain palier. La note D demeure dans le détail. Chaque ligne du résumé réserve la hauteur réelle de son sprite et une séparation.
- Au premier passage, 1976 et 1982 sont conservés. L'arrivée au néon mémorise le droit au retour ; les voyages suivants passent du choix du pilote au néon. Les films et époques ultérieurs restent en place. Ce comportement exige le raccord 64.
- Prime de fin de vague seulement après une destruction attribuée à la joueuse ou cinq ramassages dans cette vague. Purge/décor exclus. V1 ne tire plus le défi LASSO tant que sa qualification à L=8 manque. Tirage et aperçu suivent le même filtre ; ces deux effets comptables sont intentionnels.

## Avant / après mesuré

Les images sont de vrais tampons N.gfx.buf() des sources exécutées en VM, exportés en PNG sans lissage. Elles ont été regardées : titre, réglages et fin sur les trois formats, ainsi que le grand texte portrait. La VM utilise le repli procédural des illustrations : elle ne décode ni PNG via le DOM ni MP4. Les captures avec les vrais actifs décodés sont demandées au navigateur.

| Sortie réelle | Avant | Après |
|---|---:|---:|
| Largeur du titre portrait, tampon 195 px | 236 px, tronqué | 177 px, échelle 3, complet |
| Largeur du titre paysage / bureau | 236 / 236 px | 236 / 236 px, échelle 4 |
| Séparation visible des lignes du conseil portrait | 0 px | 8 px |
| Recouvrement strict des boîtes de texte du résumé, fixture mesurée | 0 sur les trois profils | 0 sur les trois profils |
| Cas de fin avec marges construites | non mesurés avant | 33/33 sans débordement ni recouvrement |
| Huit réglages modifiés puis rechargés depuis le stockage | écran absent | 8/8, sur les trois profils |
| Manche, déflexion de 22 px CSS | rayon fixe 44 px CSS | rayons 35,2 / 44 / 55 ; intensités 0,625 / 0,5 / 0,4 |
| Retour, démarrage → combat de V1 | époques imposées | 3 touchers, 5,55 s de boucle, chaque profil |
| Prime : inerte / 4 prises / 5 prises / 1 destruction / purge | prime de vague inconditionnelle | 0 / 0 / 1 000 / 1 000 / 0 points |

Le défaut de recouvrement strict de la capture de l'étude n'est pas reproduit tel quel dans cette fixture : avant, les deux lignes portrait se touchent mais leurs boîtes n'ont pas de pixel commun. Le gain mesuré est leur séparation 0 → 8 px, pas un taux de recouvrement inventé. Les marges construites utilisent la règle de bord du jeu ; elles ne prétendent pas mesurer l'encoche Safari.

Preuves : [mesures.json](mesures.json), [controles.json](controles.json), [conseils.json](conseils.json), [texte.json](texte.json). Le titre reste en RÉGLAGES après 20 s ; en pause, temps et position restent strictement fixes, puis reprise en jeu, sur les trois profils. Les 16 cibles de réglages par profil (deux tailles de texte) restent dans la vue et dépassent 44 pt. Premiers passages 1976 et 1982 observés, drapeau mémorisé seulement à l'entrée au néon, puis relu depuis le stockage. Défi V1 : 0 LASSO parmi 80 aperçus de graines. Le test de bannière PRÊTE constate des échelles standard/grand 5→7 en paysage, 4→5 en portrait, 5→8 sur bureau ; les protections de place continuent à borner la taille.

Images : [titre portrait](captures-vm/apres-portrait-titre.png), [réglages portrait](captures-vm/apres-portrait-reglages.png), [fin portrait](captures-vm/apres-portrait-fin.png), [fin paysage](captures-vm/apres-paysage-fin.png). Les fichiers des trois profils, pages et tailles de texte sont dans captures-vm/ ; les .bin conservent les indices bruts.

## Parties et preuve de non-régression

Calibration préalable sur les sources de e1bdc6f obtenues par git show : **10/10** identiques sur temps de jeu, temps de combat, temps simulé, vague et score, zéro erreur. Les empreintes intégrales de journaux historiques ne sont identiques que pour **2/10** : cette limite est publiée, aucune identité historique de tous les journaux n'est revendiquée. [calibration.json](calibration.json).

Même protocole officiel : stockage vide, jour 20261017, humain AUTO/autres DOIGTS, intro skip, reset plongée, pilote, journal actif, premier pas d'horloge, tranches de 0,25 s, bornes reçues. Trois campagnes de 80 parties, toutes complètes : témoin reçu, candidat avec les trois raccords en mémoire, candidat avec uniquement les deux changements comptables rétablis à l'ancien comportement **en mémoire** pour l'ablation. Aucune source de jeu n'est rétablie sur disque. Chaque reçu intégral est conservé gzip dans parties/.

- Candidat réel : **80/80 trajectoires identiques** (temps, pas, vague, morts, cartes et échantillons de longueur) ; **40/80 résumés temps/vague/score identiques**, **32/80 journaux intégralement identiques**. Écarts de score -3000 à 0 points. Les défis V1 et la prime conditionnelle expliquent les changements attendus ; les premiers événements divergents restent dans comparaison80.json.
- Journaux de combat : **80/80 identiques**, pas et données compris, en excluant explicitement les événements défi et les annonces de présentation hudBanniere/hudBanniereAdmise.
- Ablation des deux seuls effets comptables : **80/80 reçus strictement identiques au témoin**, journaux complets compris. Cela isole les effets d'interface, de réglages et de raccord du combat simulé avec la même comptabilité.
- Erreurs jeu et console : **0** sur les 240 reçus, zéro aussi dans les cas construits. Le build sort **0**. Les fichiers réservés sont inchangés ([perimetre.json](perimetre.json)) ; `git apply --check` accepte les trois raccords sans modifier les sources ; `git diff --check` passe.

Deux non-fins préexistantes à la borne restent des **non-fins**, sans allongement du temps ni censure :

- expert, graine 2 : 540.2425000460728 s → 540.2425000460728 s, V5 → V5, arrêt « borne » → « borne ».
- dieu, graine 9 : 540.0104166867044 s → 540.0104166867044 s, V4 → V4, arrêt « borne » → « borne ».

Sources et valeurs : [comparaison80.json](comparaison80.json), avant.json, apres.json, hors-score.json. Le candidat et le témoin sont figés dans sources-candidat.json.gz et sources-avant.json.gz. Le test ne qualifie ni l'adaptation de difficulté du lot d1 ni la note du jury du chantier global.

## Essais d'instrumentation corrigés, valeurs conservées

Le premier scénario de retour, sans dessin du choix des pilotes en VM, reste à « choix » à 12,05 s : ses zones n'avaient pas été calculées. Le scénario corrigé dessine le vrai module avant de lire ses zones publiques, puis mesure jusqu'au combat ; seuil de 12 s inchangé. Le premier contrôle de premier passage ne laissait que 0,33 s à la transition du terminal (drapeau false sur les trois profils), puis la seconde instrumentation observait les étapes seulement entre des lots de pas (1976 manqué dans l'observation portrait malgré un drapeau true). Reçus conservés : controles-passe1.json et controles-passe2.json. Le contrôle final observe chaque pas des vraies transitions ; aucun réglage du jeu ni seuil n'a été modifié pour le faire passer. Un premier pied de réglages « RETOUR / SUITE 1/2 » débordait en portrait : le libellé du suivant est désormais « 1/2 > » ; les cibles gardent leur taille.

## Raccords et dépendance restante

Fichiers locaux : 02-regles, 60-intro, 77-score, 80-ecrans, 90-boot et index.html reconstruit. Les nouveaux chiffres et leurs raisons sont dans la section codex-u1 de refonte/lots/demandes.md. Aucune modification de 64, 70-joueuse, 78-hud ou 79 sur disque.

La cheffe doit intégrer et relire [raccord-79-jeu.patch](raccord-79-jeu.patch), [raccord-64-aventure.patch](raccord-64-aventure.patch), [raccord-78-hud.patch](raccord-78-hud.patch), reconstruire, lancer verifier.mjs hors bac et renvoyer navigateur/resultats.json avec les PNG. Sans ces raccords, le retour des époques, les touches des réglages et les canaux audio après reset ne sont pas entièrement raccordés. Le script propose par défaut un candidat assemblé en mémoire, puis --integre contrôle le vrai bundle intégré. Un seul Chromium headless muet, HTTP local sur port libre, profils iPhone 13 paysage 844×390, portrait 390×844, bureau 1440×900, captures du tampon et de l'écran, gestes DOM, persistance après reload, pause/reprise et retour en trois gestes. Les chemins locaux sont les seuls autorisés dans son routage réseau.

**Reste : exécution et revue navigateur, puis partie sur iPhone Safari réel. Aucun verdict Safari, audio entendu, décodage de film, ni chantier global achevé n'est annoncé.**
