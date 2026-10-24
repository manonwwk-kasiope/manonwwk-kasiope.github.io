24/10/2026 · 12 h 18 (Paris) — mis à jour à 12 h 19

Commande depuis la racine de la copie : `node proto-neon/tools/jury2/verifier.mjs --statique`

**Résultat : accès corrigé, vérifieur statique vert — 64 contrôles, zéro échec.** Chaque regard reçoit les trois défauts de passe 1 de la fixture et des trois reconstructions réelles, PNG et JSON compris. Les paquets réels livrés précédemment ne sont pas modifiés. La correction s’applique aux prochains montages.

**Corrections et choix**

- `tools/jury2/jure.mjs:201` : toutes les planches et tous les tapis, avec leurs JSON, constituent un socle commun aux cinq regards, ajouté sans doublon à leurs listes spécialisées ; les affectations antérieures n’ont pas d’intersection suffisante (notamment catégories et tapis).
- `tools/jury2/jure.mjs:212` : garde au montage, qui refuse un défaut de passe 1 dont le PNG ou le JSON serait absent d’une liste.
- Le socle dépend de l’inventaire, jamais de la clé ni des défauts sélectionnés : l’ajout ne désigne pas aux jurés les seules pièces altérées ; les listes avec et sans défauts sont identiques à graine égale, contrôle exécuté.
- `tools/jury2/tests-canaris-regards.mjs:18` mesure les pièces effectivement listées ; `:32` exige une accessibilité de 100 %, l’existence des pièces et la séparation de l’annexe ; `:57` monte la fixture ; `:63` reconstruit les trois paquets réels ; `:74` vérifie les noms neutres, le tirage crypto, l’indépendance des listes et le doublon renommé.
- `tools/jury2/verifier.mjs:15` et `:108` intègrent ces contrôles à `--statique` ; `tools/jury2/tests-jury.mjs:183` met à jour l’ancienne attente d’exclusion des tapis pour la joueuse, devenue contraire au socle commun.

Le tirage existant des types, séquences et emplacements est conservé, avec graine aléatoire issue de `crypto`. Les reconstructions réelles rejouent les graines privées des clés uniquement pour comparer exactement les mêmes défauts ; leur ordre et leurs canaris sont comparés intégralement aux clés d’origine. La passe 2 reste dans `annexe/annexe.json`, hors des listes et de l’inventaire de passe 1.

Coût de ce choix : les listes réelles passent de 167–433 à 663–769 fichiers selon paquet et regard, sans ajout de médias au paquet (mesures dans `jury2/verification-locale.json › accessibilite`). Ce volume évite de signaler les défauts par une courte liste d’ajouts ciblés et conserve les emplacements déjà tirés. L’accès garanti ne prouve pas que chaque juré inspectera effectivement toutes les pièces.

**Avant / après mesuré**

Ordre des colonnes : joueuse iPhone, game design, rythme et musique, direction artistique, avocat du diable. Un défaut est accessible seulement si **les deux fichiers PNG et JSON** figurent dans la liste du regard.

| Montage | Avant : défauts accessibles sur 3, par regard | Après, chaque regard |
|---|---|---|
| Fixture J-3f9a1c7e | 1 ; 0 ; 0 ; 1 ; 2 | 3/3 |
| J-625ea38c | 3 ; 1 ; 1 ; 1 ; 2 | 3/3 |
| J-b632cd0a | 2 ; 0 ; 0 ; 1 ; 2 | 3/3 |
| J-611ad6f4 | 2 ; 0 ; 0 ; 0 ; 2 | 3/3 |

Sources : `jury2/accessibilite-avant.json` et `jury2/accessibilite-apres.json`. Le même test ajouté avant la correction échoue sur les quatre montages et sur le contrôle du socle (sortie 1, cinq contrôles rouges) ; après correction, cinq contrôles verts, sortie 0. La vérification complète finale donne 64 contrôles verts, sortie 0 (`jury2/verification-locale.json`). L’assertion de 100 % n’a pas été affaiblie.

Les trois paquets sont reconstruits depuis les dossiers bruts `etalonnage-3eaf75cf596e5e10` et `etalonnage-3eaf75cf596e5e10-temoin`, en lecture seule sous `../jury-f1/proto-neon/tools/jury2/dossiers/`. Sorties dans un répertoire temporaire privé `snake-codex-di3-*`, effacé en fin de contrôle, jamais dans les `paquets/` existants. Pour un autre emplacement : `JURY2_REELS=/chemin/tools/jury2 node proto-neon/tools/jury2/verifier.mjs --statique` ; des données absentes font échouer le contrôle, sans omission silencieuse.

Reconstruction du jeu par `node build.mjs` dans la copie temporaire du vérifieur : sortie 0 ; SHA-256 avant/après identique `3eaf75cf596e5e101d7b33d103eae98dca36ae83435afa3b4890618f684a4024`. Aucun fichier de jeu ni `index.html` modifié. Aucun navigateur, serveur local, lecteur audio, réseau sortant ou partie simulée pour cette mission.

**Diagnostic documentaire de l’ancrage, sans modification**

Les verdicts continuent d’arriver dans le dossier partagé : trois paires à la première lecture, puis cinq disponibles à 12 h 17 ; les cinq sont couvertes ci-dessous. Source commune : `../jury-f1/proto-neon/tools/jury2/verdicts/<juré>/J-625ea38c.p1.json` et `.p2.json`, plus `paquets/J-625ea38c/annexe/annexe.json`. Les extraits, champs résolus, notes et empreintes SHA-256 des sources figurent dans `jury2/diagnostic-ancrage.json`.

- **C-joueuse — 7 → 6 : mixte**, nouveaux chiffres R13 (`p2 › preuves g1–g6`, annexe `/sequences/S02/mesures/R13/maxParSeconde = 13`, seuil 3) non établis par les images échantillonnées, et requalification d’un problème de mur déjà décrit parmi les mineurs de passe 1 (preuves p7–p8), appuyée en passe 2 par `/sequences/S05/morts` (`visibleDepuis=0`, `teleDuree=0`) et `/seuilsDuJeu/R08` (g7–g8).
- **X-joueuse — 7,5 → 7 : nouvel élément chiffré de l’annexe**, le premier défaut grave de passe 2 donne explicitement les dépassements R13 comme raison de la baisse (g1–g7 ; `/sequences/S02/mesures/R13/maxParSeconde = 13`, `/seuilsDuJeu/R13/flashsParSeconde = 3`), en excluant S08 contradictoire.
- **X-rythme — 6,5 → 5 : mixte**, nouveau dépassement R13 (p22–p25, `/sequences/S02/mesures/R13/maxParSeconde = 13`) et reclassement en grave d’un défaut de synchronisation déjà chiffré en passe 1 sur les tapis (p1–p6), l’annexe l’étendant à `/synchronisationAgregee` (`315/1980`, p18–p21), sans ventilation fournie entre ces deux raisons de baisse.
- **X-da — 8 → 7 : nouvel élément chiffré de l’annexe**, le seul défaut devenu grave est R13 (g1–g6, `/sequences/S02/mesures/R13/maxParSeconde = 13`, seuil 3), les trois mineurs de passe 1 étant repris à l’identique et la contradiction de S08 écartée.
- **X-gd — 7,5 → 7 : nouvel élément chiffré de l’annexe**, le seul défaut devenu grave est R13 (p26–p31, `/sequences/S02/mesures/R13/maxParSeconde = 13`, seuil 3), les trois mineurs sont maintenus et le `teleDuree=0` du convoi S05 est expressément écarté comme anomalie plutôt qu’imputé au jeu.

Ces phrases attribuent les raisons **documentées par les verdicts**, sans prétendre mesurer le mécanisme psychologique d’ancrage ni démontrer l’invisibilité absolue d’un effet dans toutes les images : une cadence exacte de transitions n’est pas établie par les seules captures à 4/15 Hz ; R13 annonce lui-même des transitions agrégées sans recouvrement spatial prouvé, pas une certification WCAG. Le juré C-joueuse interprète les préavis nuls de S05 comme défaut, alors que X-gd écarte celui du convoi comme anomalie : désaccord conservé, non arbitré dans cette mission. Jev n’a pas été utilisé, car toute connexion sortante est interdite par la mission.

Les seuils de détection et d’ancrage sont intégralement conservés : `protocole.mjs` et `etalonnage.mjs` sont identiques à HEAD (respectivement SHA-256 `0b19d724f5ddac2ea2238a963e5cea2a5ecaa52d47e1cefcd1a0aa1686e33fb5` et `05e22cb23334d2074f58bd7db0311e6726e5b027e09c58660e57a853aea54dee`). Aucun nouveau chiffre de jeu, aucun ajout à N.R.

**État de remise**

Correction et contrôles terminés ; intégration et nouveau passage des jurés relèvent de la cheffe. Les anciens paquets conservent leur défaut d’accessibilité et leurs verdicts historiques ; le code corrigé ne réécrit aucune note. Retour arrière : retirer le socle et la garde de `jure.mjs`, l’import/appel du test dans `verifier.mjs` et le changement d’attente dans `tests-jury.mjs`.

Commit local tenté à 12 h 19 par `git add -- <les neuf fichiers de ce lot> && git commit -m 'Rendre les défauts du jury accessibles aux cinq regards'` : sortie 128, arrêt dès la préparation de l’index, `Unable to create '/Users/manonwojciechowski/Projets/SNAKE 2975/.git/worktrees/codex-di3/index.lock': Operation not permitted`. Refus du bac, aucun contournement, aucun commit créé. Tous les changements restent dans cette copie pour intégration par la cheffe. `git diff --check` : sortie 0.
