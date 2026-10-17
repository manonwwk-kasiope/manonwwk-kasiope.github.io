# codex-p4b — mines annoncées du CYCLOPE

18/10/2026 · 01 h 22 (Paris) — mis à jour le 18/10/2026 01:29:42 (Paris).

**Commande hors bac :** `cd proto-neon && node tools/codex-p4/verifier.mjs`.
Commande VM complète sans navigateur : `cd proto-neon && node tools/codex-p4/verifier.mjs --statique`.

**Lot livré pour revue ; contrôles logiques satisfaits. Palier visuel R-07/R-08 à vérifier hors bac.** Aucun serveur ni Chromium lancé dans cette session. Aucun commit. Rapport du lot déjà accepté conservé dans [rapport-p4-archive.md](rapport-p4-archive.md).

## Ce qui change

- `73-colosse.js` pose ses mines par l'interface publique `N.ennemis.spawn`, avec `annoncePose:true` et un portail protégé d'au moins `N.R.colosse.minesPosees.armement` (0,8 s), borné aussi par `colosse.teleMin`.
- `72-ennemis.js` publie le disque dans S.tele et l'événement arme dans le même appel de pose. Le portail interdit le contact et empêche le départ de la mèche. Après armement, une zone de contact à reste=0 est distincte du disque de souffle encore à retardement.
- Le portail est prolongé si la source n'a pas été visible en continu pendant les 0,6 s déjà définies par R-08. Le compteur public vuDepuis fonctionne dès la pose ; une sortie du champ le remet à -1. Les mines ordinaires ne reçoivent pas cette nouvelle option.
- Pendant ce portail, un anneau magenta stable annonce le rayon de souffle existant ; gaine sombre de 1 px, densité 1, dans N.R. Aucun clignotement ni flash nouveau. La mèche préexistante de 0,6 s commence ensuite : souffle nominal au plus tôt 1,4 s après pose.
- Le nombre (6), le placement, les dégâts et le rayon préexistants sont conservés. Aucune compensation de difficulté appliquée sans preuve qu'elle soit nécessaire. Les constantes ajoutées et leurs raisons sont dans la section codex-p4b de demandes.md.

## Mesures réelles en VM

Sources : [scenes-p4b-vm.json](scenes-p4b-vm.json), traces et journaux complets `p4b-{098bd37,courant}-{profil}-3-mines-*.json.gz`. Base exacte : 098bd37 (les télégraphes précédents sont déjà intégrés). Graine 7, pas fixe de 1/120 s. Les phases sont atteintes par les dégâts publics sur l'œil ; le jeu et ses collisions ne sont pas remplacés. Les temps sont ceux de N.horloge.t(), capturés au pas où une mort effective est constatée. La différence d'un pas entre l'événement et sa réception reste dans les reçus.

Délais en **secondes depuis la première zone S.tele**, avant → après :

| Format VM | Contact | Souffle | Visibilité à l'activation après |
|---|---:|---:|---:|
| paysage | 0,008 → 0,817 | 0,600 → 1,408 | 0,808 |
| portrait | 0,008 → 0,817 | 0,600 → 1,408 | 0,808 |
| bureau | 0,008 → 0,817 | 0,600 → 1,403 | 0,808 |

Les six scènes après satisfont ≥0,8 s. [controles-p4b.json](controles-p4b.json) vérifie aussi les rayons exacts publiés et les champs d'annonce/visibilité des morts réelles dans les reçus, contre N.R. Dans chacune, les six mines sont publiées dès leur création, avec au moins 0,8 s restantes, et restent protégées pendant cette durée ; zéro erreur VM/console, zéro erreur de schéma et couverture de chaque mort effective par la zone publiée au pas précédent. Avant : contact à 8,33 ms de la zone (pose antérieure non publiée) et souffle à 600 ms, écarts conservés comme échecs. Les journaux des coups après donnent teleDuree=0,8 ; les morts par contact donnent visibleDepuis≈0,808 s, celles par souffle ≥1,4 s.

**Échec conservé de l'instrument :** le premier essai du souffle en portrait n'atteignait aucune mort par la mine (avance=null, borne=true). Le journal montre une mort par contact avec l'œil du CYCLOPE avant le souffle. Reçus : [scenes-p4b-vm-initial.json](scenes-p4b-vm-initial.json), [p4b-portrait-souffle-initial.json.gz](p4b-portrait-souffle-initial.json.gz). La sonde a été déplacée à 15 px de la mine, dans la direction opposée à l'œil, et vérifie désormais aussi l'id de la mine meurtrière. Seule la sonde change ; seuils et jeu inchangés. Les trois formats ont ensuite été remesurés.

[hors-champ-vm.json](hors-champ-vm.json) : vrai spawn, vrais update et déplacements par N.cam.reset, sans remplacement de caméra. Source initialement hors champ, portail encore protégé après 1,4 s ; première visibilité interrompue après 0,3 s, compteur réinitialisé ; activation seulement après 0,600 s continues. Zéro erreur. Aucun pixel mesuré en VM : anneauStable et zeroCyan valent null, pas une réussite visuelle.

[validation-vm.json](validation-vm.json), [validation-p4b.log](validation-p4b.log) : 10 parties inerte, graines 1–10, sources exactes du commit e1bdc6f ; temps, vague et score identiques aux références de tools/pilotes/sortie.json, zéro erreur. Validation effectuée avant de conclure sur la VM. Le chargeur contrôle que chaque source appartient exactement au bundle, dans l'ordre de build.mjs ; seul boot() n'est pas appelé.

## Parties dieu/bon

[parties-p4b-vm.json](parties-p4b-vm.json), [parties-p4b-vm.log](parties-p4b-vm.log), journaux `p4b-{avant,apres}-{dieu,bon}-{1,2,3}.json.gz` ; détail des morts pendant le boss : [morts-boss-p4b.json](morts-boss-p4b.json).

Protocole de tools/pilotes/parties.mjs : stockage vide, S.jour=20261017, actions=doigts, intro.skip, reset départ plongée, crochet uniquement si demarrage, pilote, dieu invulnérable, journal actif, horloge.avancer initial, tranches de simuler(0.25) jusqu'à fin. Borne 540 s de jeu ; aucun écran de partie sauté. Une partie par processus, en série.

| Pilote | Graine | Temps jeu s | Score | Morts auteur cyclope | Toutes morts après arrivée du boss | Après : arrêt / erreurs |
|---|---:|---|---|---|---|---|
| dieu | 1 | 359,958 → 397,233 | 175660 → 176210 | 0 → 0 | 0 → 0 | fin / 0 |
| dieu | 2 | 297,994 → 325,160 | 143030 → 143410 | 0 → 0 | 0 → 0 | fin / 0 |
| dieu | 3 | 390,169 → 410,994 | 173620 → 174290 | 0 → 0 | 0 → 0 | fin / 0 |
| bon | 1 | 81,137 → 81,137 | 1280 → 1280 | 0 → 0 | 0 → 0 | fin / 0 |
| bon | 2 | 316,783 → 301,308 | 142920 → 117370 | 2 → 2 | 3 → 5 | fin / 0 |
| bon | 3 | 84,132 → 84,132 | 2180 → 2180 | 0 → 0 | 0 → 0 | fin / 0 |

La colonne auteur cyclope garde la définition du banc précédent ; elle exclut cyclope:main et mine. La colonne suivante couvre toutes les causes pendant le boss, dont ses mines ; les causes et coordonnées sont publiées séparément. Dieu est invulnérable : ses zéros ne prouvent pas la difficulté. Les graines bon qui n'atteignent pas le boss ne qualifient pas la phase 3. Sur ces six paires, bon garde deux morts directement attribuées au CYCLOPE ; aucune mort par mine n'est ajoutée pendant le boss. Aucune facilité excessive n'est démontrée par ce lot ; le nombre et le placement des mines sont donc conservés. Ce petit lot ne constitue pas une mesure statistique de difficulté.

## Construction et suite

`cd proto-neon && node build.mjs` : **sortie 0**, [build-p4b.log](build-p4b.log). Avant SHA-256 : `8b16215a8aa7025e7b1da5bbc0a90fdaebd5e4018b1c6355e0ec6204a502ca3a`. Après : `634c0df895ae64e96dba86baeae5ab76326d56c6d732528609ff3480703293ae`. Copie avant identique au bundle Git de 098bd37 ; empreintes dans [provenance-p4b.json](provenance-p4b.json). Seuls les fichiers attribués, N.R en ajout, demandes.md dans cette section, les outils du lot et le bundle reconstruit changent.

**Reste hors bac :** exécuter la commande en tête et rendre `tools/codex-p4/playwright-p4b/resultats.json`. Le script sert les deux bundles sur port libre, un seul Chromium muet, contextes en série : iPhone 13 paysage tactile 844×390, portrait 390×844, bureau 1440×900 ; scènes contact/souffle, pose synchrone, pixels complets à pose/armement/collision et contrôle isolé d'un anneau stable sans cyan, captures, journaux et six parties par version. Les huit scènes précédemment acceptées restent optionnelles (`--regressions`), non relancées ici. Aucun seuil abaissé. Les échecs avant ne doivent pas rendre les scènes après conformes par défaut. Chromium avec profils iPhone ne qualifie pas Safari réel. Les pixels, flashs et la présentation sur appareil restent à vérifier ; le palier visuel n'est pas annoncé validé.
