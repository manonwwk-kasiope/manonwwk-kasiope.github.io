# codex-p43 — instrument tactile R-22 / R-33

18/10/2026 · 06 h 29 (Paris).

Commande exacte à lancer **hors bac**, depuis cette copie :

```sh
cd proto-neon && node tools/codex-p43/verifier.mjs
```

Reçu attendu : `tools/codex-p43/navigateur/resultats.json`, accompagné des sous-dossiers `paysage/`, `portrait/`, `bureau/`. Le script complet n'a **pas été exécuté** ici : ni serveur, ni Chromium, ni réseau sortant. **Préparation livrée ; palier R-22/R-33 bloqué sur l'exécution hors bac et ses reçus. Aucun verdict navigateur inventé.**

## Candidat et périmètre

HEAD effectivement reçu : `b0868c2813fa9796e760be8ddcd491b033db5dfc`, descendant de `40357d0` (deux commits de reconstruction/médiation). SHA-256 du bundle reconstruit : `73f684ec01b0afb6e67d94a76680dca565c734da3bd311d2c710182437a1966c`.

Aucun `src/` modifié, aucun seuil R-22/R-33 changé, aucun commit. `node build.mjs` : sortie **0**, 39 modules. Sources et `index.html` sans aucun diff contre HEAD reçu : la conservation du jeu repose ici sur cette identité, sans rejouer inutilement les 80 parties. Empreintes détaillées : `verification-locale.json`.

## Ce qui est préparé

- `tools/mesure/gestes.mjs` devient l'instrument commun ; R-22 et R-33 l'importent directement. Aucune horloge Playwright ni `__DT` autorisés. La trace brute en capture conserve `isTrusted`, identifiants, coordonnées, `touches`, `changedTouches`, image et `performance.now`. L'état après handler est lu en propagation sur window ; la microtâche de capture précédente pouvait précéder les handlers.
- `etalon-tactile.mjs` construit une page indépendante du jeu : rAF native, direction et déplacement connus, vrai canevas. Il éprouve explicitement les variantes de relâchement partiel CDP dans des pages jetables. Un acquittement CDP ne suffit jamais : seul le DOM « second doigt relâché, premier conservé ; puis premier relâché » permet de choisir un mode. Chaque variante rejetée et son erreur éventuelle restent dans le reçu. Si aucune ne convient, aucun verdict sur le jeu.
- Sur cet étalon : glissé attendu vers −90°, réponse à l'image suivante, toucher et glissé aux effets connus ; puis **même analyse sur un geste volontairement ignoré**, qui doit produire une absence de réponse mesurée. Le cas témoin est réussi seulement si l'analyse le refuse. C'est un étalon construit, pas une modification du jeu.
- `tactile.mjs` calcule la latence depuis l'événement reçu jusqu'au cap attendu sur une image effectivement présentée. Il refuse l'événement absent, une cible déjà atteinte, le mouvement absent et le temps forcé. La trace inclut position réelle, cap visé/réel, horloge du jeu, empreinte du tampon et pixels cyan. Le virage effectif reste distinct de la latence du cap visé.
- Le lanceur traite les profils en série, **un Chromium muet**, HTTP local sur port libre. Étalon indépendant puis cas construit sur le vrai serpent en paysage 844×390 et portrait 390×844 ; R-22 et R-33 complets pour chacun. Bureau 1440×900 : clavier, cap, déplacement, tampon et erreurs.
- R-22 conserve ses seuils et ajoute la vérification directe de J-04. Les cas de commandes disposent d'une position initiale centrale et de réserves prêtes par les interfaces publiques. Les essais de second doigt sont indépendants : leurs actions doivent apparaître dans le journal réel et leurs effets dans l'état de sortie.
- R-33 conserve les 120 s, 20 essais par geste, 50 balayages par bord, les proportions et les seuils reçus. Les recentrages remettent une scène centrale entre les poses pour ne pas compter un menu ou un mur comme un zéro d'action. Ce sont des cas de commande répétés, pas une qualification de campagne. Le slalom ne compte qu'à partir du premier mouvement reçu ; les images antérieures restent publiées séparément.
- Journaux complets, traces par image, essais par geste, tampons binaires et captures sont sauvegardés. Un échec du jeu reste chiffré ; une panne d'étalon reste non mesurable. Sortie 0 seulement si étalons, critères, bureau et zéro erreur passent tous.

## Mesures disponibles, avant / après

| Mesure | Avant reçu | Après local |
|---|---|---|
| R-22 navigateur | non mesurable, reçu p21 du 18/10 à 06 h 13 | **à vérifier hors bac** |
| R-33 navigateur | non mesurable, même constat fourni | **à vérifier hors bac** |
| Relâchement partiel CDP | trace p21 : deux `touchstart`, aucun `touchend` du second doigt ; horloge et déplacement avançaient | étalonnage DOM exécutable livré, **pas encore mesuré** |
| Sources / jeu assemblé | HEAD reçu | strictement identiques après reconstruction |
| Référence VM `e1bdc6f` | valeurs de `tools/pilotes/sortie.json` | **10/10** temps de jeu, temps combat, temps simulé, vague et score exactement identiques ; tous finis, zéro erreur |
| Calculs purs | cas construits de réponses connues | **6/6** ; réponse 1 image/12 ms acceptée, retard 2 images conservé, témoin ignoré et faux contrats refusés |
| Vrais handlers en VM | aucun verdict navigateur | **12/12** cas : toucher, glissé, tenu et second doigt précoce ignoré sur les trois formats ; `__ERR.count = 0` |
| Cap / déplacement en VM | cap initial 0° | **3/3** : cible −90°, latence 1 image, entrée dans la tolérance 4° après **266,66666666666606 ms**, déplacement non nul, zéro erreur |
| Garde d'horloge réelle | temps VM imposé | refuse bien les trois traces VM ; elles ne peuvent pas être prises pour une mesure navigateur |
| Syntaxe / imports | — | **8** scripts vérifiés syntaxiquement ; **5** modules communs/critères importés ; `git diff --check` sans erreur |

Sources des résultats locaux : `vm.json`, `direction-vm.json`, leurs logs et `verification-locale.json`. Les 266,67 ms sont un résultat VM au pas imposé, **pas une mesure Safari ni Chromium**. Le cas de calcul 12 ms est une donnée d'étalon, pas une latence du jeu.

Un premier contrôle supplémentaire exigeait aussi l'empreinte intégrale des journaux historiques : **2/10 identiques, 8/10 différentes** malgré les cinq sorties finales exactement identiques. Cette tentative en échec est conservée dans `vm-premier-etalonnage.json`. Un premier écart inspecté sur inerte/graine 7 porte sur les coordonnées d'un même kill : x attendu `216.4271644280685`, obtenu `216.42716442806744`, mêmes événement, pas, temps et longueurs de journal (32). L'origine de ce dernier écart numérique n'est pas établie. La validation VM demandée porte sur les temps, vague et score ; aucune identité des journaux Node/Chromium n'est revendiquée. Aucun seuil du jeu n'a été modifié.

## Ce qui reste

1. La cheffe lance la commande ci-dessus, puis retourne `navigateur/resultats.json` et les reçus associés. L'instrument CDP est **candidat**, pas encore validé par un navigateur. Le lanceur conserve chaque défaut et ne relance pas silencieusement un test raté.
2. Si les étalons passent, les deux critères rendent leurs verdicts chiffrés sur le bundle courant dans chaque orientation. Toute exception ou erreur de console empêche la sortie 0. Si le contrat CDP échoue encore, les traces précisent la portée exacte du blocage.
3. Safari iPhone physique et mode écran d'accueil restent une qualification distincte ; Chromium ne prouve pas le comportement des gestes système iOS.

Aucun changement numérique de jeu ajouté : vitesse, rayon, charge maximale et seuils de gestes viennent de N.R ou des exigences déjà reçues. Les coordonnées et valeurs connues des étalons sont des données d'essai. La mission interdisant tout `src/`, toute centralisation supplémentaire de ces seules données d'essai dans N.R appartient au propriétaire de `02-regles.js` ; demande explicitée dans la section codex-p43 de `demandes.md`.
