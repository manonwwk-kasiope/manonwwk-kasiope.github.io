# Remise en état de l’instrument R-01 à R-38

18/10/2026 · 00 h 36 — Paris · publication ; mis à jour à 00 h 36

**Chantier bloqué pour la qualification Playwright.** Corrections de l’instrument livrées ; aucune amélioration de mesurabilité du jeu revendiquée sans navigateur. Aucun fichier de src/ modifié, aucun commit.

## Changements livrés

- Import Playwright par `playwright`, profils `devices`, port libre par défaut et Chromium explicitement muet. Un seul navigateur par Banc ; le vérificateur les ouvre successivement.
- La sonde accepte `dbg` fonction portant ses méthodes, sans confondre `dbg()` (instantané) avec `dbg.scene`. Pilote lancé par `N.pilote.lancer`, arrêté par `arreter`.
- Le départ contractuel reste strict : aucun `direct`, `lancer`, toucher simulé ou état forcé pour contourner `reset(...,{depart:"plongee"})`.
- Les scènes de debug peuvent quitter uniquement l’ouverture par `N.intro.skip`, puis utilisent `dbg.scene`. Cette préparation indépendante n’est jamais appliquée aux parties. Le VOL attend son interlude ; une cinématique encore affichée n’est pas prise pour la scène demandée. Les scènes absentes restent absentes.
- Masque entièrement nul ou de mauvaise taille refusé ; aucun verdict de cyan tiré d’une attribution fictive. Une simulation figée ne devient plus une partie valide. Cache invalidé aussi par l’empreinte de l’instrument.
- R-21 garde les erreurs au chargement et avant départ. R-30 contrôle en plus les journaux initiaux ; il refuse les journaux vides et borne l’attente du rejeu dessiné. Ces contrôles partiels ne valident pas la couverture requise.
- Une interdiction d’environnement produit un rapport complet « non mesurable » et une sortie 1. R-38 reste lisible sans navigateur. Aucun seuil abaissé.

## Mesures avant / après et vérification disponible

| Observation | Avant | Après | Preuve |
|---|---|---|---|
| Résolution de dbg (VM, vraies sources) | null avec le filtre historique typeof === object | fonction et méthodes publiques accessibles | verification/statique.json, avantApres |
| Départ après reset, graine 7 (VM) | demarrage dans le constat fourni | demarrage, non contourné | verification/statique.json, depart |
| Masque de propriété (VM) | objet vide accepté comme masque | 82290 codes tous à zéro : indisponible | verification/statique.json, masque |
| Scènes manquantes (VM) | masquées par la mauvaise résolution de dbg | charge, v5, lasso6, inversion, convoi, travelling rendent false | verification/statique.json, scenes |
| Horloge après scene calme + simuler(imageRef) (VM) | non mesurée dans le constat fourni | t=0 → 0, pas=0, état jeu | verification/statique.json, simulation |
| Contrôles Node/VM | non fournis | 9 réussis ; import des 38 critères et syntaxe des 47 JS/MJS vérifiées | verifier.mjs --statique ; node --check |
| Reconstruction | non reprise du constat | node build.mjs : sortie 0, 30 modules | exécuté depuis proto-neon/ |

La VM exécute les sources réelles sans appeler boot(), sans DOM, sans clips ni Web Audio. Elle prouve les états d’API et la logique de sonde ci-dessus, pas le rendu ou les performances Safari. Le premier essai du contrôle de journaux dans une même VM a donné false ; le test a été corrigé pour isoler les contextes comme les deux sessions de R-30. Aucune différence du journal n’est supprimée ou normalisée.

## Cas à verdict connu

`verifier.mjs` prépare quatre copies HTML fautives dans un dossier temporaire, les sert avec un serveur HTTP Node sur port libre et exécute les vrais critères, successivement :

| Critère | Défaut volontaire | Contrôle Node effectué | Contrôle Chromium |
|---|---|---|---|
| R-02 | index hors palette dans le vrai tampon avant present | un index hors palette détecté | à vérifier |
| R-03 | tampon cyan, propriétaires décor | part hors masque au-dessus du seuil détectée | à vérifier |
| R-21 | exception JavaScript au chargement | __ERR.count passant de 0 à 1 détecté | à vérifier |
| R-30 | données partie du journal altérées à chaque dump | journal altéré et troncature refusés ; mêmes journaux acceptés | à vérifier |

**Les quatre verdicts négatifs Playwright exigés ne sont pas démontrés ici.** Les copies ont été préparées puis supprimées ; le serveur est refusé avant toute navigation. Les contrôles Node ne sont pas présentés comme ces essais de bundles au navigateur. Les profils paysage/portrait/bureau sont dans le vérificateur mais n’ont pas été exécutés.

## Empêchement exact

- Serveur Node : `listen EPERM: operation not permitted 127.0.0.1`, aussi avec `listen(0, "127.0.0.1")`.
- Essai séparé de Chromium : `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer… Permission denied (1100)`, arrêt SIGTRAP. Aucun second Chromium simultané.
- La session ne permet pas de demander une exécution hors bac à sable. Aucun contournement tenté.

## Dernière passe rapide obligatoire

`node tools/mesure/lancer.mjs --rapide --parallele 1` : exécutée, **sortie 1**.

**0 ok, 0 échec, 0 partiel, 37 non mesurables, 1 hors banc, 0 critère au statut erreur.** Mesures navigateur réellement obtenues : **0** ; gain mesurable confirmé : **aucun dans cet environnement**. Le statut non mesurable est un empêchement de mesure, pas un résultat du jeu.

Constat fourni du 18/10 à 00 h 24 : 0 ok, 1 échec, 2 partiels, 32 non mesurables, 2 erreurs. Ces nombres totalisent 37 et non 38 ; le rapport détaillé initial n’est pas présent dans cette copie. Impossible d’attribuer les deux erreurs historiques à des critères précis ou de comparer des taux. Le tableau ci-dessous distingue les résultats réels de cette passe et le diagnostic des dépendances.

| Critère | Résultat de la dernière passe | Diagnostic / suite hors blocage global localhost |
|---|---|---|
| R-01 Pixels carrés | non mesurable : listen EPERM | Sonde dbg corrigée ; les blocs réels demandent une capture Chromium. Scène calme publique disponible en VM. |
| R-02 Palette fermée | non mesurable : listen EPERM | Sonde dbg corrigée ; six scènes rendent false. Ne pas remplacer ces scènes par calme/chaos. Valeur de palette à vérifier sur les images. |
| R-03 Cyan réservé | non mesurable : listen EPERM | Sonde dbg corrigée ; masque contractuel entièrement nul et six scènes absentes. Attribution du cyan non mesurable tant que le vrai masque manque. |
| R-04 Difficulté | non mesurable : listen EPERM | Départ direct bloqué ; les huit pilotes existent et N.pilote.lancer est employé. Aucun taux de victoire calculable. |
| R-05 On peut mourir | non mesurable : listen EPERM | Départ bloqué ; conflit morsure/coupe avec les huit causes mortelles. Démonstration ci-dessous, seuil maintenu. |
| R-06 Aucune apparition dans la vue | non mesurable : listen EPERM | Départ bloqué ; il faudra ensuite contrôler les champs vue/shown du journal réel. |
| R-07 Télégraphes | non mesurable : listen EPERM | Départ bloqué ; le journal tele/coup reste à mesurer, aucun seuil de durée modifié. |
| R-08 Mort juste | non mesurable : listen EPERM | Départ bloqué ; les morts et visibleDepuis ne peuvent être qualifiés. |
| R-09 Tête visible | non mesurable : listen EPERM | Départ bloqué et masque nul ; cadre, trajet visible et superposition à vérifier sur les trois profils. |
| R-10 Monde et parallaxe | non mesurable : listen EPERM | Départ bloqué pour la parallaxe ; monde/caméra présents, déplacement réel et captures à vérifier. |
| R-11 Lumière, et décor qui se tait par la forme | non mesurable : listen EPERM | Sonde dbg corrigée ; quatre scènes disponibles en VM, masque nul ; partie à t=1/30 s bloquée, comparaison SNAKE 2030 non exécutée. |
| R-12 Explosion | non mesurable : listen EPERM | Sonde dbg corrigée ; boss3 disponible en VM, v5 absent. Destruction réelle du colosse et élites non essayée au navigateur. |
| R-13 Photosensibilité | non mesurable : listen EPERM | Scène charge renvoie false ; aucune séquence réelle de flashs recueillie. |
| R-14 Budgets d’effets | non mesurable : listen EPERM | Départ bloqué ; budget de secousse/bannières sur une partie entière non mesuré. |
| R-15 Rythme | non mesurable : listen EPERM | Départ bloqué ; vagues, pics et respirations non mesurés. |
| R-16 Progression dans la partie | non mesurable : listen EPERM | Départ bloqué ; cartes, défis et parties gagnées non mesurés. |
| R-17 Mort mise en scène | non mesurable : listen EPERM | Sonde dbg corrigée ; mortTir disponible en VM, mort naturelle et chronométrage des images à vérifier. |
| R-18 Écran de fin | non mesurable : listen EPERM | Sonde dbg corrigée ; fin disponible en VM ; textes/capture du vrai écran à vérifier. |
| R-19 Attraction (P3) | non mesurable : listen EPERM | Sonde dbg corrigée ; le titre forcé ne suffit pas si S.phase reste intro. Délai et galerie à vérifier ; P3 maintenu. |
| R-20 Performance | non mesurable : listen EPERM | Scènes charge et v5 absentes ; vol démarre en panneau (interlude maintenant attendu). Coûts navigateur et vrai iPhone non mesurés. |
| R-21 Zéro erreur | non mesurable : listen EPERM | Départ bloqué ; observation ajoutée au chargement et avant départ pour ne pas perdre les exceptions. Aucun zéro erreur navigateur certifié. |
| R-22 Commandes | non mesurable : listen EPERM | Départ bloqué ; protocole tactile préparé mais aucune latence ni commande mesurée. |
| R-23 Un pouce | non mesurable : listen EPERM | Départ bloqué ; variantes diriger/auto publiées via N.pilote.lancer, taux de victoire non mesurés. |
| R-24 Portrait et paysage | non mesurable : listen EPERM | Départ bloqué ; secteur complet et tête en portrait non mesurés. |
| R-25 Musique de la propriétaire | non mesurable : listen EPERM | Départ bloqué ; musique/piste et reprise après mort non mesurées. |
| R-26 Mixage | non mesurable : listen EPERM | renderOffline existe dans le jeu ; ce critère est indépendant du départ. Impossible de reproduire son rendu Web Audio dans cette session. |
| R-27 Jouable sans le son | non mesurable : listen EPERM | Départ bloqué ; les couples signes/sons exigent des sorties réelles, non obtenues. |
| R-28 Mouvement réduit | non mesurable : listen EPERM | v5 absent, scène calme disponible en VM ; secteur complet bloqué au départ. |
| R-29 Pause | non mesurable : listen EPERM | Sonde dbg corrigée ; chaos disponible en VM. Pause, invariance et reprise audio à vérifier au navigateur. |
| R-30 Rejouabilité | non mesurable : listen EPERM | Départ bloqué ; comparaison des journaux initiaux ajoutée séparément. Égalité sur reset ne valide pas une partie ; journaux vides et rejeux figés refusés. |
| R-31 Le plateau se déplace | non mesurable : listen EPERM | Départ bloqué ; pourcentage de mouvement/VOLS/convois non mesuré. |
| R-32 Variété | non mesurable : listen EPERM | Sonde dbg corrigée ; rendu public des quartiers et IoU à vérifier. Les premières fois dépendent des parties bloquées. |
| R-33 Gestes sûrs | non mesurable : listen EPERM | Départ bloqué ; recentrages, slalom, second doigt et bords non mesurés. |
| R-34 LASSO jouable | non mesurable : listen EPERM | Départ bloqué ; aucun taux de LASSO calculable. |
| R-35 Relance | non mesurable : listen EPERM | fin disponible en VM ; relance dessinée à vérifier, durée de V1 bloquée au départ. |
| R-36 Raison de revenir | non mesurable : listen EPERM | Départ bloqué ; parties enchaînées et déblocages non mesurés. |
| R-37 Lisibilité de l’arsenal | non mesurable : listen EPERM | v5 absent et masque nul ; aucune capture au build maximal qualifiable. |
| R-38 Verdict de la propriétaire | hors banc | Lecture du fichier effectuée sans navigateur : sections Jalon A et Jalon B absentes ; statut réel des jalons non établi. |

## Seuil R-05 inatteignable par la morsure naturelle

REFONTE.md § 8.5 impose huit causes et R-05 contient mur, morsure, ennemi, tir, laser, souffle, convoi, traine. Or N.R.mort.morsure.effet vaut coupe (02-regles.js:100) ; le chemin de collision de morsure dans 70-joueuse.js:354 n’appelle tuer que si cet effet vaut mort, sinon il appelle couper. Les pilotes ne déclenchent pas tuer artificiellement. La couverture des huit causes naturelles exige donc une mort de morsure incompatible avec l’invariant actuel. Une commande explicite tuer("morsure") ne prouverait pas cette mécanique. **Seuil maintenu à huit ; arbitrage demandé au gardien, aucune réparation de src par ce lot.**

## Reprise et reste à faire

1. Exécuter `node tools/mesure/verifier.mjs` dans un environnement permettant localhost et Chromium ; examiner les quatre contrôles fautifs et les vraies valeurs du jeu sur les trois profils.
2. Exécuter `node tools/mesure/lancer.mjs --rapide --parallele 1` ; traiter chaque échec du jeu et les éventuelles erreurs de script alors reproductibles, sans modifier les seuils.
3. Faire livrer/arbitrer par les propriétaires : départ public, six scènes, vrai masque, horloge/journal, R-05. Les demandes avec fichier:ligne et preuves sont dans refonte/lots/demandes.md, section codex-08.
4. Rejouer seulement les contrôles dépendant de ces corrections. La qualification iPhone Safari et les jalons de la propriétaire restent séparés de Chromium émulé.

Livrables : commun/sonde/scènes/parties/critères modifiés, verifier.mjs, preuves verification/*.json, rapport rapide sortie/rapport.{json,md}, ce rapport. index.html reconstruit à l’identique ; aucun changement de règle de jeu.
