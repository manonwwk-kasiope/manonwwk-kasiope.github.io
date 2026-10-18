# codex-p13 — décor et photosensibilité R-13

18/10/2026 · 02 h 28 (Paris) — publication ; mis à jour à 02 h 28.

**Commande hors bac, depuis la racine du dépôt :**
`cd proto-neon && node tools/codex-p13/verifier.mjs`

**Correction livrée et seuil du banc VM satisfait dans les neuf scènes. Chantier bloqué uniquement pour la validation navigateur, le coût sur iPhone et Safari réel.** Aucun serveur ni Chromium n'a été lancé ou essayé ; aucune certification WCAG ni qualification visuelle iPhone n'est revendiquée. Aucun commit. Le vérifieur navigateur est complet et prêt à exécuter par la cheffe d'orchestre.

## Causes localisées et correction

Les références « avant » désignent [avant/15-decor.js](avant/15-decor.js), copie exacte du fichier reçu ; « après » désigne la source livrée.

- **Trame mobile du ciel** : avant `15-decor.js:346–370`, pose `:689–690`. Son Bayer était inscrit dans l'image puis déplacé avec l'horizon ; changer la position d'une seule rangée inversait une grande surface tramée. Après `15-decor.js:353`, quatre phases précalculées gardent le Bayer à sa position écran. Le même correctif s'applique au fond du VOL.
- **Trame mobile des fenêtres** : avant `15-decor.js:216–237`, pose `:704`. Deux versions de la même cité, mêmes graines et mêmes silhouettes, rephasent le damier à l'écran (après `:180`). La cité n'est ni retirée ni aplatie.
- **Couleurs rapides** : avant `:504–538` : clignotement du chaos à 5 changements/s, incendies à 4–6 changements/s et enseignes accélérées ; pulsation de sol `:549`. Après `:525–586` : accents espacés de 4,8 s, avec fondu de 1,2 s pour la cité ; inversion bornée. Les formes, les seize encres et les accents sont conservés.
- **Déplacement du lointain** : avant `:808–821`, les coordonnées de la caméra étaient appliquées directement aux plans tramés. Après `:842` : rattrapage visuel à 60 pixels de jeu/s par axe, tenu pendant le gel. La caméra de jeu, le plateau, les murs, les acteurs et les collisions gardent leurs interfaces et leur comportement.
- **Quartiers, états et éclipse publique** : avant `:480–491` et `:822–843` : balayage et reprise depuis une cible pas encore affichée ; mouvement réduit supprimait la transition. Après `:493` et `:871` : snapshot du décor seul réellement affiché, fondu d'au moins 1,2 s, Bayer étendu à 64 rangs. Les appels quartier/état dans un même pas repartent du même fond. Le sol reçoit sa table sombre après composition, même si un ancien ciel passe sous le nouvel horizon. L'appel public `eclipse()` suit ce fondu.
- **Éclairs** : avant `:786–801` et `:985`, apparition/disparition franche et retrigger libre. Après `:826` et `:1043` : enveloppe sinusoïdale de 1,2 s, 2,4 s minimum entre départs ; aucun éclair si mouvement réduit ou flashs coupés.
- **Victoire** : avant `:82–86`, la sortie d'`enJeu()` réallumait le décor pendant la cascade du CYCLOPE. Après `:83` : l'atténuation du fond proche reste active en victoire et fin. Aucun acteur n'est assombri.
- Le mouvement réduit fige aussi le premier plan, les ondes et la pulsation du sol. Le MediaQueryList est relu pour suivre ses changements sans nouvelle écoute ni horloge système.

Toutes les valeurs nouvelles sont ajoutées uniquement dans `N.R.decorPhotosensibilite` (`02-regles.js:1066`) et justifiées dans la section codex-p13 de demandes.md. Les modifications p10 de `40-sprites.js`, `50-fx.js` et leur bloc de règles sont conservées. La section codex-p10 annoncée n'existait pas dans le demandes.md reçu ; son rapport et attribution.json ont été lus.

## Calibration et méthode

[calibration.json](calibration.json) : **10/10 cas e1bdc6f identiques**, temps exacts, combat, vague, score, arrêt, erreurs et SHA-256 du journal complet. Sources historiques chargées par git show, ordre exact de build.mjs ; VM p10 reprise sans modification, sans DOM. Aucun résultat issu d'une VM divergente n'est utilisé.

[scenes-avant.json](scenes-avant.json) et [scenes-apres.json](scenes-apres.json) : **600 images réelles de tampon par scène/profil**, trois scènes × trois profils ; vraie fonction frame(), mêmes graines et stimuli p10, mort du CYCLOPE confirmée au journal. Chaque image relit N.gfx.buf(), mesure hausses/baisses de luminance ≥ 0,1 avec état sombre < 0,8, entrées/sorties du rouge (magenta/brasier/sang), union des fins L/R et fenêtre glissante de 60 images. Aire strictement > 6,6 %, plafond 3 : **méthode p10 inchangée**, aucun seuil relâché. Les images ici sont des tableaux de pixels/index en VM, pas des captures d'écran prétendues navigateur.

Ce compteur agrégé est volontairement le même que p10 ; il ne démontre pas le recouvrement spatial d'une région entre deux transitions et ne remplace pas un analyseur WCAG indépendant. Le tampon précède aussi le CRT et les médias décodés par un navigateur, absents de cette VM.

## Mesures avant/après

| Profil | Scène | Avant, pire /s | Après, pire /s | Sol chaud max % | Sol L > 0,25 max % | Erreurs après |
|---|---|---:|---:|---:|---:|---:|
| paysage | charge | 9 | 2 | 0,000 | 0,279 | 0 |
| paysage | boss3 | 1 | 1 | 0,000 | 0,278 | 0 |
| paysage | mort-cyclope | 7 | 2 | 0,000 | 0,408 | 0 |
| portrait | charge | 3 | 3 | 0,000 | 0,502 | 0 |
| portrait | boss3 | 4 | 0 | 0,000 | 0,000 | 0 |
| portrait | mort-cyclope | 4 | 1 | 0,000 | 0,000 | 0 |
| bureau | charge | 14 | 3 | 0,000 | 0,275 | 0 |
| bureau | boss3 | 1 | 1 | 0,000 | 0,257 | 0 |
| bureau | mort-cyclope | 6 | 2 | 0,000 | 0,316 | 0 |

**9/9 scènes satisfont ≤ 3/s ; zéro cyan dans le décor sur ces mesures.** Le sol est relevé après drawFront, avant les acteurs, strictement sous l'horizon et sur toute la largeur. Les plafonds 01b restent **chaud ≤ 3 %**, **lumineux ≤ 8 %**. Les fenêtres du CYCLOPE sont frappées par les vrais dégâts publics ; pas de mort déclarée à partir d'un compteur d'appels.

## Ablation après correction

[ablation-apres.json](ablation-apres.json) : mêmes trois cas de diagnostic que p10, même compteur, 600 images par cas ; douze exécutions. Retirer un producteur modifie la composition et son interaction avec les autres ; ce diagnostic n'est pas une preuve additive par soustraction.

| Profil | Scène | Retrait temporaire | Pire /s |
|---|---|---|---:|
| paysage | charge | aucun | 2 |
| paysage | charge | fx | 0 |
| paysage | charge | decor | 2 |
| paysage | charge | colosse | 1 |
| portrait | boss3 | aucun | 0 |
| portrait | boss3 | fx | 0 |
| portrait | boss3 | decor | 1 |
| portrait | boss3 | colosse | 1 |
| paysage | mort-cyclope | aucun | 2 |
| paysage | mort-cyclope | fx | 0 |
| paysage | mort-cyclope | decor | 2 |
| paysage | mort-cyclope | colosse | 2 |

[ablation-avant.json](ablation-avant.json.gz) : 63 essais diagnostiques sur le fichier reçu (tous profils, scènes et retraits : FX, décor, lointain, plateau, premier plan, caméra du lointain fixée). Charge paysage 9→2/s sans le lointain ; bureau 14→2/s. Le retrait du plateau en bureau produit **16/s**, supérieur aux 14/s complets : cette valeur est conservée, pas transformée en réussite. Le décor n'est supprimé que dans ces ablations d'essai, jamais dans le jeu livré. Sans décor, la mesure de couleur est absente/null, pas un faux zéro.

## Transitions, confort et conservation des parties

[transitions.json](transitions.json) : 9 essais dirigés de décor seul, hors combat. Changements quartiers/états, deux révélations de fenêtres, éclipse par API, victoire et pression d'éclairs, sur chaque profil : plafond satisfait. Mouvement réduit système et secousse zéro : **une seule empreinte de tampon par cas**, sur 120 images malgré les demandes d'ondes/éclairs. Les tests normaux lisent 720 images ; ce sont de vrais pixels de décor, pas des scènes de partie composées présentées comme telles.

[parties.json](parties.json) : **20/20 parties appariées strictement identiques** sur l'état reçu puis le rendu final, inerte/tourneur, graines 1–10. Temps de jeu et de combat, vague, score, fin, erreurs et **journal complet** identiques. Protocole officiel : stockage vierge, jour 20261017, réglage actions, skip de l'intro initiale, reset départ plongée, saut du seul démarrage initial si nécessaire, pilote officiel, journal, amorçage horloge puis tranches de 0,25 s jusqu'à fin. Aucun arrondi ni événement supprimé. **Les 80 parties ne sont pas prétendues toutes rejouées** ; vingt cas couvrent l'échantillon demandé. L'ancienne référence e1bdc6f sert seulement à calibrer la VM.

## Essais insuffisants conservés

- [essai-ancrage-ciel.json](essai-ancrage-ciel.json.gz) : ciel ancré et victoire assombrie seuls, charge **5/s paysage, 11/s bureau** ; échec, sortie 1.
- [essai-sans-camera-bornee.json](essai-sans-camera-bornee.json.gz) : cité ancrée et fondus ajoutés, charge bureau **5/s** ; échec, sortie 1.
- [essai-camera-bureau.json](essai-camera-bureau.json.gz) : ajout du rattrapage borné, charge bureau **3/s**, sortie 0. Les reçus finals ci-dessus portent tous l'empreinte du candidat final.

## Construction, reprise et limite restante

`cd proto-neon && node build.mjs` : **sortie 0** ; dimensions du bundle et empreintes dans [verification-sources.json](verification-sources.json). Syntaxe des sources et scripts, import de Playwright/profils sans lancement, git diff --check : sortie 0. Règles mur et morsure inchangées. Le rendu reste dans les seize index de palette ; ni cyan décoratif ni couleur littérale nouvelle.

Empreinte de la liste ordonnée des sources finales : `dbbcadac26023b23b5f69ddd0f107370e0d6b9294a2f8a92f3bbbefc6afea4b5`.

Commandes VM :
`node proto-neon/tools/codex-p13/calibrer.mjs`
`node proto-neon/tools/codex-p13/scenes-vm.mjs --avant`
`node proto-neon/tools/codex-p13/scenes-vm.mjs`
`node proto-neon/tools/codex-p13/attribuer.mjs`
`node proto-neon/tools/codex-p13/transitions-vm.mjs`
`node proto-neon/tools/codex-p13/parties-vm.mjs`

Le script hors bac en tête lance un serveur Node sur port libre et **un seul Chromium --mute-audio**, contextes en série : iPhone 13 tactile paysage 844×390, portrait 390×844, bureau 1440×900. Il mesure les neuf scènes, pixels de la tête, sol, journal et __ERR, sauvegarde captures tampon/écran et résultats.json. **Non exécuté ici**, conformément à l'interdiction de la mission.

Sous-tâche de rendu corrigée et preuves VM livrées ; **palier navigateur non validé**. Dépendance indispensable : la cheffe exécute le vérifieur hors bac et transmet les reçus, y compris les échecs, puis contrôle Safari réel et le coût du rendu sur iPhone. Retour arrière : rétablir avant/15-decor.js et retirer uniquement l'ajout decorPhotosensibilite, puis reconstruire ; conserver les changements p10.
