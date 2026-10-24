18/10/2026 · 01 h 53 (Paris) — mis à jour à 01 h 53.

Commande hors bac : **`cd proto-neon && node tools/codex-09/verifier.mjs`**.

**Branchement livré ; recette navigateur et conformité des 80 références non validées.** Le contrôle navigateur est volontairement préparé sans exécution, selon la mission. Le retour à l'identique des 80 références historiques est bloqué par des divergences déjà présentes dans l'état reçu ; elles ne sont pas masquées par le verdict de non-régression du lot.

Changements : JOUER au titre passe par l'état aventure, le choix ELLE/LUI, 1976, 1982, puis lancer(false) vers le néon. La victoire passe par l'apothéose puis reprendre('fin') ; N.aventure joue le rattrapage profondeur/WARP/espace et la fin propre au personnage. Les deux fins enregistrées donnent retrouvailles, teaser et À SUIVRE. Le bilan gagné propose REJOUER vers le titre afin de choisir l'autre personnage. Défaite, CONTINUER et REJOUER après défaite restent dans le néon ; retour au titre/reset arrêtent le voyage.

Le boot ne dessine plus N.ui, N.hud, N.intro, effets ou manche néon au-dessus de l'aventure. La piste principale s'arrête pendant le choix et les époques 1976/1982, puis reprend ; la vérification audio effective reste au navigateur. Correction supplémentaire mesurée : N.intro enchaîne déjà réveil → boss ; 79-jeu le relançait ensuite. Ce second lancement est retiré.

Fichiers de production : 79-jeu.js, 90-boot.js et index.html reconstruit. 80-ecrans.js et 02-regles.js intacts ; aucun chiffre de jeu ajouté. Gardes reprises de N.R.ecrans.ouverture.garde. Pas de modification des modules réservés, pas de commit.

| Mesure | Avant | Après / preuve |
|---|---|---|
| VM validée sur e1bdc6f | référence tools/pilotes/sortie.json | 12/12 identiques : temps de jeu, vague, score ; zéro erreur — [calibration.json](calibration.json) |
| Départ néon, profil vierge, S.jour=20261017, protocole officiel | 8f55a91, 4 pilotes × graines 1 à 5 | 20/20 identiques avant/après ; tous à fin, zéro erreur — [pilotes-final.json](pilotes-final.json) |
| Ces mêmes parties contre la référence historique | e1bdc6f | 16/20 exactes ; écarts ci-dessous, tous préexistants |
| Parcours ELLE puis LUI, paysage / portrait / bureau | titre lançait directement le néon | 85/85 ; 85/85 ; 85/85 contrôles VM, zéro erreur — [statique.json](statique.json) |
| Films d'aventure sautés au toucher après la garde | hors du vrai jeu | 18/18 ; 18/18 ; 18/18 ; noms réels fin-elle/fin-lui ; aucune répétition dans chaque aventure |
| Recouvrement boot du choix, 1976, 1982 | titre/HUD pouvaient couvrir les époques | 0 pixel différent entre N.aventure.draw et la vraie frame du boot, dans les 9 cas ; UI titre et fond d'intro volontairement laissés ouverts |
| Annonce CYCLOPE après réveil | après le toucher : toujours panneau, boss t=0 (relancé), échec sur 3 profils | après le toucher : état boss ; gel réel du temps, de la tête et du temps de vague vérifié — [avant](complements-avant.json), [après](complements.json) |
| Défaite / CONTINUER / REJOUER / garde des films historiques | chemins existants | 15/15 ; 15/15 ; 15/15 contrôles, zéro erreur |
| Assemblage | sources reçues | node build.mjs : sortie 0, 35 sources présentes textuellement dans le bundle ; [candidat.json](candidat.json) |

Écarts historiques, avec valeurs brutes (secondes) :

| Pilote | Graine | Temps référence | Temps avant = après | Vague référence → mesurée | Score référence → mesuré |
|---|---:|---:|---:|---:|---:|
| tourneur | 1 | 20,192500001688256 | 20,19041666860327 | 1 → 1 | 1370 → 1370 |
| maladroit | 1 | 19,259166668354975 | 21,00708333526989 | 1 → 1 | 480 → 550 |
| kamikaze | 3 | 63,929166670140596 | 65,1229166706382 | 2 → 2 | 12540 → 13670 |
| kamikaze | 5 | 68,83000000516653 | 75,47375000591687 | 2 → 3 | 17010 → 17440 |

La calibration historique supplémentaire sur tourneur/1 et maladroit/1 retrouve exactement les valeurs e1bdc6f : l'écart se retrouve dans les sources de l'état reçu, sans en attribuer ici la cause à un module. Une exploration préalable des huit pilotes, deux graines chacun et une troisième pour les quatre premiers, conserve également ses résultats bruts dans [exploration-pilotes.json](exploration-pilotes.json). Ce reçu provient du candidat avant la correction de double annonce ; il ne remplace pas la recette finale. [exploration-pilotes-avant.json](exploration-pilotes-avant.json) contient la comparaison des 18 premiers cas à 8f55a91.

Contrôle complémentaire du chemin de victoire après suppression de la double annonce : Terminé : identique avant/après, temps 414,5066667127533 → 414,5066667127533 s, vague 5 → 5, score 188040 → 188040, erreurs 0. Source : [victoire-pilote.json](victoire-pilote.json).

Méthode VM : vraies sources chargées dans l'ordre lexicographique de build.mjs, sans DOM et sans appel à boot(). Le scénario de pixels appelle cependant la vraie fonction frame avec __DT=0, après dimensionnement du tampon. Les noms des PNG réels sont fournis pour vérifier le choix des variantes ; aucun PNG/MP4 n'est décodé. Les époques se terminent naturellement après leurs morts au mur, sans appel skip dans le parcours principal ; la victoire néon est forcée par dbg.etat('victoire'), elle ne prouve pas une victoire jouée. Les gardes sont essayées avant et après 300 ms ; le saut est établi par le changement d'étape avant la durée normale, pas par un nombre d'appels. Les pixels sont ceux des replis procéduraux. Ce n'est ni une mesure Safari, ni une preuve de lecture des clips, ni une mesure de performance ou de photosensibilité.

Essais échoués conservés dans le compte rendu : le premier banc ne dessinait que game.draw/drawTop et rendait 82 290 pixels d'index 0 en mobile, 81 000 sur bureau pour les écrans possédés par boot. Le banc emploie désormais la vraie frame, puis relève les panneaux après leur révélation ; le seuil de tampon non vide n'a pas changé. Un autre premier essai du complément lisait score.resume().victoire avant qu'un bilan existe : TypeError du banc, corrigé par lecture optionnelle. Le défaut de double annonce, lui, était dans le jeu ; son reçu d'échec est conservé. Aucune erreur de ces bancs n'est présentée comme une erreur window.__ERR du jeu.

Reste pour la cheffe d'orchestre : exécuter verifier.mjs hors du bac (un Chromium muet, les trois profils en série, captures et JSON à chaque étape, toucher réel pour les films, comparaison du tampon, statut effectif du moteur musical, journal et erreurs), puis Safari réel. Ajouter aventure au registre gelé N.ids.etats/tableEtats dans 03-socle.js : demande écrite dans [demandes.md](../../refonte/lots/demandes.md). Le jeu fonctionne localement sans muter ce registre grâce à l'acceptation explicite de cet état dans 79-jeu. Les futures mécaniques de profondeur/WARP/espace ne sont pas ajoutées par ce lot, conformément au raccord demandé qui n'utilise aujourd'hui que reprendre('fin').

**Chantier bloqué pour le verdict global des 80 références historiques** : arbitrage des écarts de l'état reçu indispensable. Sous-tâche de branchement et préparation de recette livrée ; aucun verdict navigateur inventé.

Reproduction sans HTTP/Chromium : `node tools/codex-09/pilotes.mjs --calibrer`, `node tools/codex-09/pilotes.mjs`, `node tools/codex-09/statique.mjs`, `node tools/codex-09/complements.mjs` et `node tools/codex-09/victoire-pilote.mjs` (depuis proto-neon). Ne relancer que les contrôles affectés par une modification. Empreinte du bundle livré : `3c42a4f4622cfcec9ca386a3d072122abc2c19110b2ec649b927a15ca7d41209`.
