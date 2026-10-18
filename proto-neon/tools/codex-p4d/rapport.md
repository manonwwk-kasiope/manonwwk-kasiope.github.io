# codex-p4d — 18/10/2026 · 03 h 21 (Paris) — mis à jour à 18/10/2026 · 03 h 21

**Commande hors bac :** `cd proto-neon && node tools/codex-p4d/verifier.mjs`.
`--scenes-seules` exécute seulement les scènes. Script complet, non lancé ici : serveur HTTP et Chromium explicitement interdits dans ce bac, aucune tentative. Un seul Chromium muet, pages et profils en série : iPhone 13 tactile 844×390, 390×844, bureau 1440×900. Il sauvegarde vrais buffers, PNG, journaux et bilan ; il garde rouge la parité si elle échoue.

**Correctifs du périmètre livrés ; campagne complète. Palier global non validé. Chantier bloqué pour la validation globale sur le cinquième VOL externe, les écarts de parties et le reçu navigateur.** Aucun commit ; changements laissés dans cette copie. Build exécuté avec sortie 0 : [build.log](build.log).

## Spécification et changement concret

La spécification disponible est [REFONTE.md](../../REFONTE.md), R-06 ligne 2894 : « 0, et 0 armement hors de la vue ». Aucune exception pour une apparition de boss annoncée. Le choix est donc une vraie naissance hors champ, jamais une exclusion du journal. Le §3.8 porte les apparitions justes ; R-07 conserve 0,8 s pour les attaques CYCLOPE ; §4.6 et R-31 conservent le préavis de 2 s des murs et le seuil de zéro mort non annoncée.

- [73-colosse.js](../../src/73-colosse.js:266) : l’œil naît à sa vraie hauteur initiale, corps entier au-dessus du cadre, puis descend pendant les 2,2 s réelles d’arrivée déjà prévues. Les mains naissent de chaque côté du cadre, sprite tourné et marge compris, puis utilisent leur déplacement existant vers les épaules. Aucun tirage aléatoire ajouté, aucun événement supprimé, déplacé après coup ou renommé. Le dessin et les objets partagent la même position.
- Les deux appels `world.arena` du boss attendent réellement 2 s de jeu. Les frontières courantes et les cibles datées sont dans S.tele dès la demande ; un repère magenta stable, projeté au bord si nécessaire, reste visible à l’écran. L’annonce reste attribuable jusqu’au dernier pas où le monde est réellement mobile. Aucun nouveau flash ni cyan ajouté.
- [70-joueuse.js](../../src/70-joueuse.js:184) : attribution seule. Les annonces sont observées dans S.tele et rattachées au pan physique touché. Une zone découverte déjà active ne gagne pas rétrospectivement un préavis ; son total promis ne suffit pas. Collisions, mouvement, vies et morsure inchangés.
- [R-31-plateau.mjs](../mesure/criteres/R-31-plateau.mjs:11) : `travellingAnnonce` reconnu dans le cycle courant ; annonces anciennes, terminées, d’une autre vague/phase, convoi ou départ seul rejetés. Comparaison des dates du journal entre elles : S.death.t est un temps local au combat. Seuil inchangé, strictement 2 s, sans marge diminuant ce seuil.

Seuls chiffres nouveaux de jeu : huit identités de frontières, -10005 à -10012, dans N.R et la section codex-p4d de [demandes.md](../../refonte/lots/demandes.md). Elles distinguent les deux glissements du boss et ceux de l’arène. Toutes les durées, marges, dimensions et vitesses sont reprises des règles existantes. Le cinquième VOL est demandé à `76-directeur.js` dans cette section, sans modification du directeur.

## Preuves VM et campagne

La VM charge les vraies sources, dans l’ordre lexicographique de build.mjs, sans DOM. [calibration.json](calibration.json) : dix parties e1bdc6f reproduites exactement (temps, vague, score, raison, erreurs). La référence historique ne sert qu’à cette calibration. Les comparaisons ci-dessous portent sur les sources reçues à `3ef7b4e`, sauvegardées pour les fichiers modifiés ; leurs empreintes complètes sont dans [reprise.json](reprise.json). Les changements intégrés depuis p4c interdisent de recopier ses huit apparitions comme notre mesure avant.

Protocole conservé : monde neuf, stockage vide, jour 20261017, actions auto pour humain/doigts pour bon, intro sautée, reset plongée, seul éventuel demarrage → plongee, pilote, journal, un avancer initial, simuler(0.25) jusqu’à fin ou la borne 540 s. Aucun god ni saut de cartes dans ces parties. 10 graines × bon/humain × trois vues, par version. Les reçus gzip contiennent tous les événements ; le bilan recalcule le prédicat final sur les dates réelles du journal.

| Vue | Version | Parties | Apparitions | Dans la vue (seuil 0) | Armements hors vue (0) | Morts mur mobile | Sans annonce (0) | __ERR | Fins |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| paysage | avant | 20 | 2703 | 6 | 0 | 1 | 0 | 0 | 20 |
| portrait | avant | 20 | 2442 | 3 | 0 | 1 | 0 | 0 | 20 |
| bureau | avant | 20 | 2590 | 6 | 0 | 0 | 0 | 0 | 20 |
| paysage | apres | 20 | 2716 | 0 | 0 | 1 | 0 | 0 | 20 |
| portrait | apres | 20 | 2441 | 0 | 0 | 1 | 0 | 0 | 20 |
| bureau | apres | 20 | 2599 | 0 | 0 | 0 | 0 | 0 | 20 |

Sources : [avant.json](avant.json), [apres.json](apres.json), [bilan.json](bilan.json), journaux/. Les créations invisibles en attente de place sont aussi conservées dans `naissances` ; elles ne sont pas confondues avec l’événement apparition. Les objets externes du boss sont inclus dans tous les totaux.

**Parité des vingt bon/humain paysage : 17/20. ÉCHEC de la parité stricte ; ne pas annoncer les parties inchangées.**

| Partie différente | Avant (s) | Après (s) | Vague |
|---|---:|---:|---|
| bon/3 | 313.312083 | 420.343750 | 5 → 5 |
| bon/6 | 328.008333 | 363.241667 | 5 → 5 |
| humain/6 | 323.297917 | 333.914583 | 5 → 5 |

Le tableau apparié complet, scores compris, est dans bilan.json. La sortie 1 de bilan.mjs conserve cet échec de parité ; elle n’est pas présentée comme un succès. Seize contrôles de syntaxe et la cohérence des trois sources avec le bundle passent (statique.json ; build.log). Ces écarts ne sont pas attribués à une cause non isolée : plusieurs effets du boss changent ensemble, dont l’entrée, le préavis des murs et les zones lues par le pilote.

Contrôle indépendant hors CYCLOPE : [comparaison20-hors-boss.json](comparaison20-hors-boss.json), inerte/tourneur, graines 1–10, **20/20 identiques en durée et vague**, journaux complets également identiques sur les vingt paires, zéro erreur. Ce témoin du périmètre hors boss ne remplace PAS la comparaison bon/humain et ne répare pas son échec.

## Collisions, entrées et vrais pixels

Les trois collisions p4c sont reprises : départ fixé, annonce de travelling, détection du premier déplacement, tête forcée contre le mur bas, vrai délai de grâce, vraie mort ; la joueuse est mise à jour pendant l’annonce pour en observer la durée. Pas de mort inventée par un appel direct à tuer().

| Vue après | Annonce → mouvement (s) | Zone observée → mort (s) | teleDuree de la mort | Sans annonce, critère final | Préavis boss entrée / phase 3 (s) | Naissances boss dans vue |
|---|---:|---:|---:|---:|---:|---:|
| paysage | 2.008333 | 2.075000 | 2 | 0 | 2.001667 / 2.008333 | 0 |
| portrait | 2.008333 | 2.075000 | 2 | 0 | 2.001667 / 2.008333 | 0 |
| bureau | 2.008333 | 2.075000 | 2 | 0 | 2.001667 / 2.008333 | 0 |

Avant : les trois morts portent teleDuree=0 ; l’ancien prédicat les classe toutes trois sans annonce. Après : les trois morts portent 2 s et passent le prédicat final. Le nouveau prédicat reconnaît aussi l’annonce réelle dans les trois journaux avant, même avec leur ancienne attribution à zéro : [collisions-critere.json](collisions-critere.json). Aucun déplacement n’est renommé en annonce.

La scène boss crée trois pièces dans chaque vue : **9 naissances dans la vue avant → 0 après**, et les neuf entrées sont physiquement observées, par positions successives, avec déplacement continu ; phase 3 atteinte par les vrais dégâts et transitions. Au dernier pas mobile de chacun des deux glissements, les zones du boss sont encore présentes. Contrôle négatif : trois glissements externes non annoncés, observés plus de 2 s, provoquent de vraies morts qui restent à teleDuree=0. [criteres.json](criteres.json) conserve treize contrôles des limites du prédicat ; tous passent.

[scenes-vm.json](scenes-vm.json) contient positions, zones S.tele, journaux, collisions et empreintes des buffers. [pixels-vm/](pixels-vm/) conserve les buffers et PNG, issus de N.gfx.buf() : zéro index hors palette et zéro cyan dans les dessins isolés de ce lot. Le tampon de naissance du boss après est vide : c’est attendu, le corps est entièrement hors champ. Ces PNG sont des rendus VM sans DOM, pas des captures navigateur ; ils ne qualifient ni Safari, ni les performances iPhone, ni les flashs du jeu complet.

## Essais conservés, portée et reste

[exploratoire.json](exploratoire.json) et [exploratoire-paysage-bon-3.json.gz](exploratoire-paysage-bon-3.json.gz) conservent la première passe : bon/3 paysage, 313,312083 s avant → 420,343750 s après. Le candidat final a été corrigé pour conserver l’attribution jusqu’à la fin physique du glissement, plutôt que jusqu’à une échéance théorique ; bon/3 a été rejoué. Deux reçus hors boss ont été réutilisés, après vérification de l’absence de tout événement phase/CYCLOPE : [reutilisation.json](reutilisation.json). Aucun résultat exploratoire n’est présenté comme preuve du candidat final.

Le calcul sur le second Mac a été essayé via l’accès SSH existant : nom `MacBook-Air-de-Manon.local` non résolu, sortie 255 ([second-mac.log](second-mac.log)). Aucune clé ni source transmise ; calcul poursuivi ici sans contourner le refus.

Reste à faire par la cheffe d’orchestre : relire/intégrer le diff sans commit de cet agent ; traiter les écarts bon/humain si la parité globale reste exigée ; intégrer le cinquième VOL chez le directeur ; lancer la commande hors bac en tête et conserver le reçu navigateur, puis vérifier Safari réel. Le critère complet R-31 comporte aussi mouvement, travelling, VOLS et convois : ce lot ne les déclare pas validés sur la seule preuve des collisions. Retour arrière : retirer le diff réservé à codex-p4d, ou restaurer les trois sources et le critère sauvegardés, puis reconstruire index.html.
