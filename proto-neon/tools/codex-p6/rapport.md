# codex-p6 — API de test du contrat

18/10/2026 · 00 h 51 — mis à jour à 00 h 52 (Paris).

**Commande hors bac :** depuis le dépôt, `cd proto-neon && node tools/codex-p6/verifier.mjs`.

**Statut : implémentation et contrôles VM terminés ; validation navigateur à vérifier hors bac.** Aucun serveur ni Chromium lancé ici. Aucun commit. Bundle reconstruit par `node build.mjs`, sortie **0** ; SHA-256 : `a14e9bf281cdb0ca6b1fd636e6efa5ebbc7dd8c4afe84c95d449373398dc395b`.

## Changements livrés

- `reset(graine,{depart})` atteint directement `demarrage`, `ouverture`, `titre`, `briefing`, `plongee` ou `jeu`. Les six états sont encore atteints au premier pas de mise à jour ; le départ explicite neutralise uniquement pour ce test le lancement automatique de compatibilité de l’ancienne boucle. Les départs après l'ouverture la sautent réellement (`S.phase='play'`). Un nom invalide rend `false` sans mutation. Le contrat publiait la signature sans énumération des valeurs ; cette liste est documentée dans la section codex-p6 de demandes.md. Sans options, départ historique en `demarrage` ; option `direct` conservée.
- Six scènes nouvelles et correction de `boss3`, construites par les interfaces publiques. La phase du CYCLOPE est atteinte par ses vraies fenêtres de dégâts et répits, sous une préparation bornée ; aucune phase ni PV privés forcés. Le god temporaire de préparation est restauré. Le build maximal des fixtures signifie longueur maximale et six armes au palier IV, pour le cas de charge maximal de l'arsenal.
- `dbg.masque(true)` arme le suivi ; après le dessin, `dbg.masque()` rend le vrai tableau de propriété. **Le premier appel arme la prochaine image** : il ne reconstitue pas rétroactivement une propriété absente. Lire pixels et masque après ce dessin, sans pas intermédiaire. `dbg.masque(false)` libère le tableau et retire les fonctions d'instrumentation.
- Propriétaires suivis à l'écriture, y compris les écritures directes à `gfx.buf()` dans une portée de dessin instrumentée. Pas de classement des pixels par couleur. Les sprites de tête, les glyphes de vie et le marqueur projeté de tête du radar sont identifiés sémantiquement. Le tampon public reste un vrai Uint8Array hors des portées instrumentées.
- Correction du suivi des plans transparents : leurs pixels transparents ne prennent plus la propriété des pixels derrière eux ; `clear` efface les propriétés de l'image précédente. Copie/fondu conservent la propriété d'un instantané créé par `copyTo` ; sans provenance connue, code 0, jamais un propriétaire inventé.

## Preuves avant / après

Source avant : vraies sources du commit de départ `3883b2a94b07f50810f538f7061545fd22915e5e`, exécutées sans écraser le worktree. [Mesures](statique.json), [image et journaux avant](avant-paysage.json.gz), [qualification de la VM](validation-vm.json).

La VM a reproduit **10 parties sur 10 à l'identique** sur `e1bdc6f` : temps de jeu exact, vague et score, sur les huit pilotes et deux graines complémentaires. Chaque partie suit le protocole de `tools/pilotes/parties.mjs` (stockage vide, jour 20261017, réglage actions, skip de l'ouverture, départ plongée, pilote, journal, un premier avancer, puis tranches de 0,25 s jusqu'à fin). Le reçu garde les valeurs réelles et attendues, l'empreinte du constructeur VM et celle du fichier de références. Aucun résultat de la VM n'a été utilisé comme verdict avant cette qualification.

| Contrôle | Avant | Après, mêmes assertions sur les trois tailles |
|---|---|---|
| Départs | Tous les `depart` ignorés, état demarrage | État demandé atteint pour les six valeurs ; plongee/jeu sans ouverture |
| charge | false | boss phase 3, un œil vivant, 30 ennemis ordinaires, 60 tirs, longueur 40, six armes IV, cœur/chaos |
| v5 | false | V5, 32 ennemis, travelling en marche, convoi annoncé, longueur 40 et six armes IV |
| lasso6 | false | 6 tourelles fixes groupées, longueur 20 ; positions inchangées après mise à jour ; 6 destructions par la vraie chaîne dans(poly)/hit avec source lasso |
| inversion | false | 12 ennemis en proie et INVERSION active de la joueuse |
| convoi | false | Convoi en passage, annonce réelle dans le journal ; 6 ennemis à l'ordonnée de sa voie |
| travelling | false | V3, mur en marche, queue à exactement 40 px au relevé |
| boss3 | true, mais phase 0 | true, phase 3 prouvée aussi par le journal, œil vivant à 1 500 PV, aucun ennemi ordinaire ni tir |
| Masque calme | codes tous à 0 ; 0 % des cyan correctement attribués | 340/340 pixels cyan correctement attribués : **100 %**, aucun cyan hors tête/corps/arsenal |

| Profil VM | Taille CSS | Tampon | Erreurs __ERR / console | Résultat |
|---|---|---|---|---|
| paysage | 844 × 390 | 422 × 195 | 0 / 0 | contrôles réussis |
| portrait | 390 × 844 | 195 × 422 | 0 / 0 | contrôles réussis |
| bureau | 1440 × 900 | 360 × 225 | 0 / 0 | contrôles réussis |

Les archives [paysage](vm-paysage.json.gz), [portrait](vm-portrait.json.gz) et [bureau](vm-bureau.json.gz) conservent les pixels, le masque de **la même image**, les états et les journaux complets. Les empreintes et effectifs figurent dans statique.json. Ce sont les primitives réelles exécutées en VM ; pas des captures de navigateur.

Autres contrôles réussis : recouvrement transparent simple et bouclé, effacement du masque, écriture directe qui repose la même couleur, copie/fondu, redimensionnement et désactivation. Le rendu calme reste identique octet par octet avant/après et avec/sans masque. Sans activation, aucune instrumentation de module ni Proxy ni allocation de masque ; désactiver restaure les fonctions originales.

## Coût mesuré, limites et essais échoués

Mesure locale du **dessin en VM** : 5 dessins de chauffe puis 30 dessins à scène/horloge fixes, chronométrés par Node. Sans masque : moyenne **3,13 ms**, p95 **4,48 ms**. Avec suivi exact des écritures : moyenne **83,49 ms**, p95 **110,53 ms**. Le suivi par Proxy est coûteux : à désactiver pour la mesure de performance R-20 et pour le jeu normal. Ce relevé n'est ni une mesure Safari, ni le coût d'une frame complète, ni une réussite du budget navigateur.

Essais intermédiaires échoués, corrigés sans changer les assertions : des mines groupées donnaient **1 kill attribué lasso sur 6**, les autres partant par réaction en chaîne ; les cibles fixes sont désormais des tourelles. Le travelling relevé à 3 s restait en `mise` par arrondi flottant ; la préparation attend maintenant l'état réel `marche` dans une borne. En portrait, après une charge, la V5 perdait **23 segments (40 → 17)** et le CANON retombait à **II**, révélant le reset du monde défectueux. Le seuil du build n'a pas été abaissé : l'arène est réellement rétablie avant la fixture.

Le test des cibles de LASSO vérifie leur immobilité, leur inclusion et leurs dégâts réels ; il **ne qualifie pas** la fermeture d'une boucle par un geste humain. Les autres scènes préexistantes (morsure, mortTir, cartes, fin, vol, etc.) n'ont pas été redéfinies ni déclarées conformes à tous les détails de REFONTE.

## Ce qui reste

1. Lancer le script Playwright indiqué en tête hors bac : un seul Chromium muet, profils tactile paysage/portrait et bureau en série, contrôle des états, erreurs, pixels et masque ; reçus gzip et captures écrits dans ce dossier. Le script a été contrôlé syntaxiquement et ses imports résolus ; **aucun résultat navigateur revendiqué**. L'émulation Chromium ne qualifie pas Safari sur iPhone réel.
2. Corriger chez le propriétaire de `12-cam.js` la double déclaration de reset : `world.reset` désigne actuellement le reset de caméra. Le contournement est limité aux nouvelles scènes, pas au comportement normal du jeu.
3. Armer le masque avant dessin dans le banc codex-08. Pour R-37, distinguer la tête du monde de sa représentation au radar lors de la comparaison au seul sprite. Ces demandes figurent dans [demandes.md](../../refonte/lots/demandes.md), section codex-p6. Aucun critère R complet ni performance iPhone n'est annoncé validé.

Relance locale autorisée : `node tools/codex-p6/verifier.mjs --statique`. Pour refaire les références : `node tools/codex-p6/verifier.mjs --qualifier-vm --statique`.
