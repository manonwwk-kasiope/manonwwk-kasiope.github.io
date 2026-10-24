18/10/2026 · 05 h 53 (Paris) — codex-p15c. Mis à jour à 18/10/2026 · 05 h 53 (Paris).

Commande **hors bac**, sur les deux bundles figés (ne pas reconstruire entre les phases) :

```sh
cd proto-neon && node tools/codex-p15/verifier.mjs
```

Le report est livré, sans dégradation mesurée de R-05 ou R-13 sur cette même base ; le palier global reste non validé. R-05 manque déjà de traine, le placement R-12 produit déjà trois zéros, et R-13 normal dépasse encore le plafond en portrait/bureau (6/s et 4/s après). La qualification navigateur reste à vérifier hors du bac. Tous ces échecs sont conservés. Aucun serveur, Chromium, SSH, service extérieur ou commit exécuté.

**Même base, intégrations conservées.** Pointe reçue : 11d3794. Sources figées avant dans [avant/sources.json](avant/sources.json), après dans [sources-apres.json](sources-apres.json). [Appariement et SHA-256](appariement.json) : seuls 79-scene.js et les ajouts de 02-regles.js diffèrent. Le raccord des battements de danger vers N.arene est conservé ; onMort, majMort, drawCause et journalDanger sont strictement identiques ([contrôle](conservation.json)). 50-fx.js et les pilotes reçus restent identiques. Bundles construits séparément depuis cette copie : [avant](avant/index.html), [après](apres.html). Build avant, après et index.html : sortie 0 ([avant/build.log](avant/build.log), [build-apres.log](build-apres.log), [build.log](build.log)).

Le report reprend l'empreinte de brasier p15b à rayon constant, admise avant dessin par N.fx.flashGate ; file prioritaire bornée, refroidissement, secousse bornée et suppression des mouvements explicites en mode réduit. Pas de double cascade de scène sur le CYCLOPE. Paramètres repris dans N.R et motivés dans notre section de demandes.md. Aucun chiffre de combat, durée de gel, seuil ou règle de mort changé.

**VM calibrée avant mesure.** 10/10 parties e1bdc6f reproduites à l'identique : tempsJeu, tempsCombat, pas, tempsSimule, vague, score, fin, raison et erreurs ([validation-vm.json](validation-vm.json)). Sources historiques obtenues par git show, vrais modules dans une seule fermeture, ordre de build.mjs. Aucune ancienne partie réutilisée comme avant de ce lot.

**80 parties appariées.** 80/80 identiques ; 0 écarts. Les 80 avant et les 80 après atteignent fin ; erreurs : 0 → 0. Comparaison stricte : durées, pas, vague, score, fin/raison, erreurs, charges de mort, phases, vagues et armements. Protocole exact tools/pilotes/parties.mjs : stockage vide, jour 20261017, actions avant reset (auto pour humain, doigts sinon), intro.skip, départ plongée, pilote, journal, premier horloge.avancer puis simuler(0.25), borne 540 s. Reçus : [avant](parties-avant.json), [après](parties-apres.json).

**R-05 naturel, protocole officiel distinct.** Sonde tools/mesure/sonde.js reçue, mode banc, actions humain=auto après reset, autres par défaut, sept pilotes × dix graines, aucun saut ni mort artificielle. Avant : {"mur":65,"ennemi":127,"laser":3,"tir":9,"convoi":5,"souffle":1} ; après : {"mur":65,"ennemi":127,"laser":3,"tir":9,"convoi":5,"souffle":1}. Causes manquantes : ["traine"] → ["traine"]. 70/70 sorties identiques (fins complètes, causes et charges de mort, raison, erreurs et console), 0 écarts. [Avant](r05-avant.json), [après](r05-apres.json), journaux complets gzip dans journaux-r05-avant/ et journaux-r05-apres/. Les 80 du protocole pilotes donnent séparément {"mur":65,"ennemi":127,"laser":3,"tir":9,"convoi":5,"souffle":1} → {"mur":65,"ennemi":127,"laser":3,"tir":9,"convoi":5,"souffle":1} ; les deux protocoles ont ici la même couverture de six causes.

**R-12 officiel, tampon et caméra appariée.** Même fixture, mêmes seuils : brasier >8 % sur au moins quatre images ; caméra imputable ≥6 px. Caméra = différence positive de S.shake image par image dans deux branches identiques avant le coup, suivi exclu ; amplitude publique, pas déplacement CRT certifié.

| Cible | Images brasier avant → après | Caméra px avant → après |
|---|---:|---:|
| CYCLOPE | 34 → 54 | 12 → 12 |
| flecheBlindee | 0 → 0 | 10,1606 → 11,6606 |
| rival | 0 → 0 | 10,1606 → 11,6606 |
| rucheInstable | 0 → 0 | 10,1606 → 11,6606 |

Aucune dégradation : les trois zéros restent des échecs officiels. Centres des élites à y=384,5 / 382,5 / 390, vue y∈[157,352[ : spawn déplace la cible avant le coup immédiat de la fixture. [Positions mesurées](placement-officiel.json), [avant](camera-avant.json), [après](camera-apres.json). On ne modifie pas la naissance des ennemis pour réussir le test.

**Contre-épreuve de placement, diagnostique uniquement.** Position publique de l'élite remise au point demandé par la fixture, après spawn et avant hit, sur chaque branche. Seuils inchangés ; ne remplace pas le R-12 officiel.

| Profil | Cible | Images >8 % avant → après | Caméra px avant → après |
|---|---|---:|---:|
| paysage | CYCLOPE | 34 → 54 | 12 → 12 |
| paysage | flecheBlindee | 0 → 19 | 10,1606 → 11,6606 |
| paysage | rival | 0 → 19 | 10,1606 → 11,6606 |
| paysage | rucheInstable | 0 → 18 | 10,1606 → 11,6606 |
| portrait | CYCLOPE | 31 → 19 | 12 → 12 |
| portrait | flecheBlindee | 12 → 28 | 9,2069 → 10,7069 |
| portrait | rival | 15 → 28 | 9,2069 → 10,7069 |
| portrait | rucheInstable | 3 → 28 | 9,2069 → 10,7069 |
| bureau | CYCLOPE | 60 → 54 | 7,9968 → 7,9968 |
| bureau | flecheBlindee | 0 → 21 | 8 → 8 |
| bureau | rival | 0 → 20 | 8 → 8 |
| bureau | rucheInstable | 0 → 19 | 8 → 8 |

[Reçus complets](placement-vm.json). La qualification « 12/12 R-12 navigateur p15b » fournie concernait une autre base ; elle n'est pas transférée à cette pointe.

**R-13 paysage, vrais pixels du tampon.** Scène charge, invulnérable, 3600 images (60 s) par mode et par version ; rafale cadencée toutes les quatre images, 30 destructions au plus dans les deux premières secondes. Réducteur officiel inchangé ; première image de référence sans transition. Le navigateur officiel utilise setInterval(66), donc ces séquences ne sont pas annoncées identiques image par image au navigateur.

| Mode | Pic tampon flashs/s avant → après | Total avant → après | Compteur officiel journal avant → après |
|---|---:|---:|---:|
| Normal | 2 → 2 | 6 → 3 | 32 → 31 |
| Mouvement réduit | 1 → 1 | 5 → 5 | 32 → 30 |

Aucune dégradation du tampon, pic à la même image avant/après (2346 normal, 140 réduit), zéro erreur. [Transitions brutes avant](flashs-avant.json), [après](flashs-apres.json), [comparaison et fenêtres des pics](flashs-comparaison.json). Le seuil reste ≤3/s sur plus de 6,6 % du tampon. Le compteur officiel brut du journal reste **en échec** avant/après : il compte aussi les admissions sous-seuil et celles d'une même rafale. Contrôle sémantique distinct, `_compte=true` avec `_temps` : 3 → 2/s dans les deux modes ; il ne remplace pas l'échec officiel. Demande de relecture inscrite pour la propriétaire du banc.

**Mouvement réduit et profils.** Contrôle isolé réel au centre de la vue : brasier, palette et secousse lus du tampon/état, plus vraies collisions dirigées des sept causes, trois dimensions requises. Les résultats détaillés sont dans [profils-vm.json](profils-vm.json) et leur résumé dans [bilan.json](bilan.json). Une position forcée de fixture ne prouve pas une mort naturelle. Les résultats procéduraux VM n'incluent ni images/films décodés, ni DOM, ni CRT, ni preuve Safari.

**Vérification R-13 des trois profils.** Même protocole VM et 3600 images par cellule ; les reçus paysage sont réutilisés. La version navigateur préparée mesure également les trois profils dans les deux modes.

| Profil | Mode | Pic tampon avant → après | Total avant → après | Erreurs avant → après |
|---|---|---:|---:|---:|
| paysage | normal | 2 → 2 | 6 → 3 | 0 → 0 |
| paysage | réduit | 1 → 1 | 5 → 5 | 0 → 0 |
| portrait | normal | 6 → 6 | 10 → 10 | 0 → 0 |
| portrait | réduit | 2 → 1 | 3 → 2 | 0 → 0 |
| bureau | normal | 6 → 4 | 10 → 6 | 0 → 0 |
| bureau | réduit | 3 → 1 | 6 → 5 | 0 → 0 |

[Transitions et journaux des trois profils](flashs-profils-vm.json). Ces valeurs restent des mesures procédurales VM.

**Contrôle isolé en mouvement réduit, au centre.**

| Profil | Images brasier >8 % avant → après | Secousse maximale après | Causes dirigées après |
|---|---:|---:|---:|
| paysage | 0 → 25 | 0 px | 7/7 |
| portrait | 0 → 25 | 0 px | 7/7 |
| bureau | 0 → 25 | 0 px | 7/7 |

Premier essai dirigé conservé : **6/7**, souffle absent, joueuse vivante ([reçu initial](profils-vm-initial.json)). La mine demandée en (532,256) naissait réellement en (532,127,5) en paysage, (641,5,256) en portrait et (532,112,5) au bureau. La fixture de notre outil replace désormais ses coordonnées publiques au point demandé avant la vraie mise à feu ; **7/7** ensuite sur les trois profils, avant comme après. Aucun événement mort fabriqué ni règle du jeu modifiée. Ce contrôle dirigé ne remplace pas les six causes naturelles du R-05.


Contrôle de placement diagnostique : 12/12 cibles après satisfont brasier, caméra et zéro erreur. Le placement officiel n'est pas modifié et conserve ses échecs.

**Reste et dépendances.** Chantier bloqué pour la qualification navigateur : exécuter la commande en tête hors bac et rapporter navigateur-comparaison.json. Le script importe Playwright, sert sur un port libre, séquence les deux bundles et un seul Chromium muet, vérifie les trois profils, les pixels, l'état, le journal et les erreurs, R-12 officiel dans les trois profils et R-13 normal/réduit. Le dépassement pixel R-13 en portrait (6 → 6/s) et bureau (6 → 4/s), la couverture naturelle traine absente de R-05 et les échecs officiels de placement R-12 / compteur journal R-13 exigent une intervention/relecture par les lots propriétaires hors de mes fichiers ; aucune source réservée ni seuil n'a été modifié. Safari réel reste à vérifier.

Retour arrière : retirer uniquement le diff 79-scene.js et les deux ajouts N.R de ce lot, puis reconstruire. Les sources avant sont conservées intégralement. Aucune dépense, connexion sortante ou transmission.

Contrôle statique final : [controle-livraison.json](controle-livraison.json) — sources et deux bundles toujours figés, scripts syntaxiquement valides, diff sans erreur, aucun fichier suivi hors périmètre. Commandes VM reproductibles : `node tools/codex-p15/valider-vm.mjs`, puis `node --expose-gc tools/codex-p15/mesurer-vm.mjs <parties|r05|camera|flashs> <avant|apres>` ; scripts complémentaires profils-vm.mjs, placement-vm.mjs et flashs-profils-vm.mjs. Les reçus terminés sont déjà disponibles et ne nécessitent pas de nouvelle exécution pour cette livraison.
