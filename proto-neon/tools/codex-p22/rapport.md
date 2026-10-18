# codex-p22 — jouable sans le son, cyan réservé

18/10/2026 · 04 h 05 (Paris), mis à jour à 04 h 05.

Commande hors bac : **`cd proto-neon && node tools/codex-p22/verifier.mjs --criteres`**.

**État : sources et scripts livrés ; palier de non-régression VM validé ; chantier bloqué pour la qualification finale navigateur et l'intégration des deux raccords réservés.** Aucun commit. Aucun serveur HTTP ni Chromium lancé dans ce bac.

## Ce qui change

- Travelling : chevrons toujours présents pendant l'annonce, rabattus au bord de la vue lorsque le mur arrière est hors champ. L'accent avance lentement entre quatre colonnes ; le signe ne disparaît pas avec son accent. Le délai d'annonce de 2 s et la mise en place sont inchangés.
- Convoi : chevron d'annonce persistant ; voie hachurée et phares conservés. Le sillage est ambre/jaune, jamais cyan.
- VOL : le fond de poursuite et la vue de destination remappent cyan/cyan pâle vers indigo/ardoise **avant** le dessin du serpent. Le fond est attribué au décor. La joueuse, les effets et les balayages gardent leurs vrais propriétaires ; aucune déduction du masque d'après la couleur.
- Journal du battement : interface publique `N.arene.battement(actif)`, raccordée dans le patch de 79-scene au déclencheur et à la phase déjà utilisés par la vignette et `music.danger`. Une entrée à l'ouverture et par cycle ; `battementFin` à la sortie. La fréquence existante de 1,2 Hz reste celle de la scène.
- R-27 reconnaît l'annonce et le départ du travelling, ainsi que le souffle du VOL associé à `vol.debut`. Un convoi absent des parties aléatoires est exercé réellement. Les pixels du signe ET le journal sont requis ; R-03 arme le masque avant la première scène et couvre trois formats et les balayages du VOL.

Ajout seul dans N.R : `arene.signaux = {hz:1,marge:7,pasY:20,pasX:6,colonnes:4}`. Les dimensions reprennent celles du dessin ; l'accent passe à un pas par seconde. Raisons et raccords consignés dans la section codex-p22 de [demandes.md](../../refonte/lots/demandes.md). Aucun seuil R-27/R-03/R-13 modifié, aucune nouvelle couleur, aucun changement de collision ou de RNG de jeu.

## Mesures VM avant/après sur l'état reçu

Vraies sources chargées dans l'ordre de build.mjs, sans DOM. Les médias ne sont pas décodés en VM ; les replis procéduraux réels restent actifs. Instrument validé sur e1bdc6f : **10/10** références exactement reproduites (temps de jeu/combat/simulé, vague et score), [validation-vm.json](validation-vm.json). Cette référence ancienne ne sert pas de cible pour les parties reçues.

Les colonnes après ci-dessous incluent les **deux raccords appliqués en mémoire**, jamais sur les fichiers réservés. Les chiffres comptent les pixels réellement écrits dans le tampon, pas les appels de dessin. Le convoi est annoncé dans une voie visible ; le travelling commence avec le mur arrière hors champ ; le battement vient de la vraie proximité du mur.

| Profil | Pixels voie convoi avant → après | Pixels roses chevrons avant → après | Traces battement avant → après | Pixels des bords min–max après | Cyan VOL hors masque avant → après |
|---|---:|---:|---:|---:|---:|
| paysage | 2430 → 2430 | 0 → 50 | 0 → 2 | 604–1000 | 0.0000 % → 0.0000 % |
| portrait | 1132 → 1132 | 0 → 100 | 0 → 2 | 831–1226 | 0.0000 % → 0.0000 % |
| bureau | 2072 → 2072 | 0 → 55 | 0 → 2 | 514–1030 | 0.0000 % → 0.0000 % |

La batterie navigateur 8f55a91 rapportait un travelling associé dans 0,33333 des cas (seuil 1), aucun convoi rencontré et un battement sans trace. Source en lecture seule : reçus/batterie-8f55a91/R-27.json. Les cas ci-dessus sont construits ; ils ne remplacent pas un nouveau reçu navigateur.

Sources : [cas-vm.json](cas-vm.json), [R-27-vm.json](R-27-vm.json), [R-03-vm.json](R-03-vm.json). 63 cas, zéro erreur jeu/console. Les fenêtres des sons et premières annonces coïncident à la précision de la VM ; contrôle à 0,1 s, seuil 1 inchangé. Le battement reste **non mesurable par journal sans les raccords**, même si les bords sont déjà visibles. Après raccords : 9/9 cas construits R-27 conformes.

Calme : masque non nul dès la première image construite, cyan hors masque 0 sur les trois profils. VOL : dix images par profil (entrée, milieu, sortie, seconde entrée), propriété non vide, palette fermée et cyan hors masque 0. Le sillage reçu produit 0.1677 % de cyan hors joueuse en paysage et 0.1679 % sur bureau ; après : 0. En portrait, le cas reçu donne déjà 0 ; cette valeur n'est pas inventée ni transformée en échec.

**Ne pas attribuer à ce lot une baisse navigateur de 3,72 % à 0.** La batterie 8f55a91 rapporte 0,03723 au VOL, mais cette fuite n'est pas reproduite sur l'état reçu dans ces cas VM. Environnements et états diffèrent. La protection ajoutée est démontrée séparément : une mutation volontaire du producteur remplit le fond de cyan ; hors masque avant 98.8334 %, après 0. Ce cas artificiel est un contrôle de la protection, pas une mesure d'une partie ordinaire.

Compléments : **36/36** cas sur les deux sens et flashs activés/coupés, [signaux.json](signaux.json). **4/4 défauts volontairement injectés rejetés** : dessin de convoi absent, chevrons absents, vignette absente, remap de fond absent ; les journaux seuls ne suffisent pas, [mutants.json](mutants.json).

## Parties des huit pilotes

**80/80 paires identiques** pour temps de jeu, temps de combat, temps simulé, vague, score, état final et raison d'arrêt. Les 160 parties finissent sans erreur du jeu ni erreur console. 23/80 journaux sont strictement identiques ; les 1251 seules entrées ajoutées sont arene battement/battementFin. Après retrait explicite de ces entrées nouvelles, 80/80 journaux complets sont identiques (événements, données, temps, pas et image). Aucun autre écart accepté. Sources : [comparaison.json](comparaison.json), journaux complets avant/raccords en JSON gzip.

Protocole identique à tools/pilotes/parties.mjs : profil vierge, jour 20261017, actions auto pour humain et doigts sinon, skip initial, reset plongée, repli demarrage → plongée seulement, pilote, journal complet, une avance d'horloge puis tranches de 0,25 s jusqu'à fin. Dix graines par chacun des huit pilotes. Chaque partie tourne dans son propre processus Node ; la graine ne dépend ni du dessin ni de ces journaux ajoutés.

## Vérifications et limites

Build : `cd proto-neon && node build.mjs`, sortie 0, [build.log](build.log). Imports Playwright/critères résolus, scripts syntaxiquement valides, `git diff --check` et `git apply --check` des deux raccords satisfaits. Aucun fichier réservé modifié : les copies avant et les fichiers raccordés ne vivent que dans tools/codex-p22.

Deux exécutions multi-contextes du banc Node ont quitté avec le code 139 : la première au cours des parties avant, la seconde en complétant les cas VM. Aucun résultat incomplet n'est une réussite. Reprise dans des processus séparés ; les reçus de parties déjà écrits sont conservés, les cas VM interrompus dans `cas-vm-interrompu.*`, puis le lot de cas complet est exécuté avec le banc isolé. La calibration historique a terminé sans ce défaut. Le code 139 du banc reste distinct de `window.__ERR.count` du jeu.

Le script navigateur sert les variantes avant/après/raccords sur un port libre, lance un seul Chromium avec `--mute-audio`, ferme chaque contexte avant le suivant, produit captures de tampons et d'écran, journaux, palette, propriétaires et erreurs pour iPhone 13 paysage 844 × 390, portrait 390 × 844 et bureau 1440 × 900. Avec `--criteres`, les deux vrais critères complets sont rejoués avant/après dans ce même Chromium. Un échec final fait sortir le script avec le code 1. Le champ candidatConforme décrit le candidat essayé ; conforme exige aussi que les deux raccords soient réellement intégrés dans le bundle servi comme jeu courant. Il n'a pas été exécuté ici : pixels navigateur, coût sur iPhone et Safari réel restent **à vérifier**. Le fond VOL ajoute une passe de remap ; aucun coût Safari n'est annoncé.

## Reste indispensable

1. Intégrer ensemble [raccord-03-socle.patch](raccord-03-socle.patch) et [raccord-79-scene.patch](raccord-79-scene.patch), puis reconstruire le bundle. Ces patches passent ensemble en VM et leur application est vérifiée sans écriture par git apply --check.
2. Lancer la commande en tête hors bac et relire `tools/codex-p22/navigateur/resultats.json`, les R-27/R-03 de navigateur et les captures. Le script distingue les sources réellement intégrées des raccords seulement simulés.
3. Vérifier la lisibilité et le coût sur Safari iPhone réel. La VM et Chromium ne constituent pas une qualification Safari.

Sources livrées et préparation terminées ; qualification finale du lot bloquée sur ces dépendances, pas annoncée achevée.
