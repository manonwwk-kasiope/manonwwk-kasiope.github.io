# codex-p4c — 18/10/2026 · 02 h 33 (Paris) — mis à jour à 02 h 33

**Commande hors bac :** `cd proto-neon && node tools/codex-p4c/verifier.mjs`.
Script prêt, non exécuté : aucune tentative HTTP/Chromium dans ce bac. Un Chromium muet, pages et profils en série ; 844×390 tactile, 390×844 tactile, 1440×900. Il collecte buffers, captures et journaux sur les deux versions, puis les 60 parties par version. `--scenes-seules` permet de reprendre uniquement les scènes après réception de parties déjà exécutées.

**Statut : correctifs du périmètre autorisé livrés ; chantier bloqué sur les raccords externes et la vérification navigateur. R-06 et R-31 ne sont pas annoncés validés globalement.** Aucun commit. Build exécuté, sortie 0 ([build.log](build.log)). Sources avant : `639fbf5edbf07c85d65ce49cc7f788b7ffe89926` ; empreintes du candidat dans [reprise.json](reprise.json). Le retour arrière consiste à retirer le diff de ce lot et reconstruire le bundle ; les trois sources antérieures sont aussi conservées dans ce dossier.

## Causes établies avant modification

- `76-directeur.js:133` crée via spawn. Les formations ordinaires utilisent `pointHors()/validePt()` (lignes 85–113 : vue réelle et anticipée). Les mines duo/champ (203–220) passent directement par `devantTete`, bornage aux murs et distance à la tête : aucune exclusion de la vue. Un portail de 1,5 s ne garantit pas le hors-champ à sa fin.
- `72-ennemis.js:122–148` AVANT accepte toutes les positions ; `apparu` émet à la fin du portail sans revérifier la vue. `72:602` AVANT fait éclore les larves autour d'une ruche visible ; `73-colosse.js:592` pose les mines autour de l'impact. Les reçus stockent coordonnées, vue et état réels, pas un simple nombre de requêtes spawn.
- `73-arene.js:110–118,129–140` AVANT lance la mise en place immédiatement (callAt=0), puis annonce après 1 s. `12-cam.js:97–108` fait déjà glisser les murs pendant ces trois secondes. Le premier déplacement est mesuré à 0,008333 s. L'ancien agrégateur de `72` ne publie aucune zone de ces murs dans S.tele ; S.monde.annonce ne remplace pas S.tele.
- Cas réel conservé : bon/2 paysage, mort murMobile à t=57,066667, travelling encore en mise (tvT=2,607083), S.tele vide. Source : [journal avant](journaux/avant-paysage-bon-2.json.gz), champ mortsEtat. La frontière basse est aussi classée mobile par `12-cam.js:153–154` pendant tout glissement, même si elle ne se déplace pas ; cette attribution n'a pas été modifiée.
- Hors réservation : `73-colosse.js:255,282,304` crée l'œil et les mains dans la vue avec ext:true ; `279,320` lance ses glissements directement. `70-joueuse.js:156–158` ne renseigne teleDuree que pour une source ennemi. Le prédicat de `R-31-plateau.mjs` ignore travellingAnnonce. Demandes précises dans [demandes.md](../../refonte/lots/demandes.md), section codex-p4c.

## Changements

72 place les ennemis ordinaires hors de la vue réelle, demi-sprite et marge existante de 24 px compris, dans l'espace légal disponible, sans tirage aléatoire supplémentaire. Les quatre bandes sont parcourues de façon déterministe ; aucune superposition forcée avec les voisins. Si aucune place n'existe, l'objet reste invisible et sans contact en attente. Une caméra rejoignant un portail suspend sa matérialisation tant qu'il reste visible : aucune téléportation du marqueur visible, aucun renommage ni déplacement de l'événement apparition. Les objets externes du boss restent pilotés par leur propriétaire et leur échec reste compté.

Les mines posées du boss naissent elles aussi hors champ. Elles restent ensuite sans contact et sans progression de mèche jusqu'à une annonce visible complète de 0,8 s et aux 0,6 s de visibilité existantes. L'armement hors champ n'est plus émis à la pose ; l'anneau reste publié immédiatement. Le placement et les échéances ne sont donc plus identiques au lot p4b : aucune parité de difficulté n'est revendiquée. Mine ordinaire et ruche exigent maintenant le même contrôle vu6 que les autres armements.

73 annonce le travelling immédiatement, le publie dans S.tele et attend les 2 s existantes avant d'appeler world.travelling. Les 3 s de mise en place viennent ensuite. Les frontières courantes restent publiées comme actives pendant le mouvement, avec les lignes finales datées ; le tampon reçoit des repères magenta stables. 72 réagrège l'arène après ses ennemis ; 73 rafraîchit avant les collisions joueuse. Les glissements externes sont publiés une fois observés, ce qui **ne prouve pas leur annonce préalable**.

Seuls chiffres ajoutés dans N.R : bord strict de 1 px ; quatre identités de murs -10001 à -10004. Raisons consignées dans demandes.md. Tous les autres délais, marges, sprites et seuils viennent des règles existantes. Mur mortel, morsure coupe, palette et plafonds de flash inchangés ; aucun nouveau flash ni cyan d'arène.

## Mesures VM : 10 graines × bon/humain × trois vues

La VM reproduit exactement dix parties du commit e1bdc6f : temps de jeu, vague, score, raison et erreurs ([calibration.json](calibration.json)). Protocole original : localStorage vide, jour 20261017, actions auto pour humain/doigts pour bon, intro sautée, reset plongée, éventuel seul état initial demarrage → plongee, pilote, journal, un avancer initial, puis simuler(0.25) jusqu'à fin ou la borne 540 s. Aucun saut de garde/cartes ni god dans ces 60 parties. Un monde neuf par partie. Vue réelle issue de gfx.resize et de la caméra : 422×195, 195×422, 360×225.

| Vue | Version | Apparitions totales | Dans vue (seuil 0) | Armements hors vue (seuil 0) | Morts mur mobile | Sans annonce, prédicat historique | __ERR | Fins |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| paysage | avant | 2229 | 362 | 12 | 5 | 2 | 0 | 20/20 |
| paysage | apres | 1269 | 1 | 0 | 0 | 0 | 0 | 20/20 |
| portrait | avant | 1644 | 145 | 0 | 3 | 1 | 0 | 20/20 |
| portrait | apres | 2148 | 2 | 0 | 2 | 0 | 0 | 20/20 |
| bureau | avant | 2559 | 342 | 0 | 0 | 0 | 0 | 20/20 |
| bureau | apres | 1886 | 5 | 0 | 3 | 0 | 0 | 20/20 |

Types encore apparus dans la vue APRÈS : **{"cyclope":8}**. Types AVANT : {"mine":623,"larve":164,"lame":3,"cyclope":16,"traqueur":10,"fleche":22,"sentinelle":2,"rival":2,"tourelle":3,"dard":3,"ruche":1}. Les apparitions externes ne sont pas exclues du total. Les 127 apparitions et la mort sans annonce fournis sur 8f55a91 restent les mesures de cette batterie ; le tableau ci-dessus utilise un autre état initial, intégrant notamment p4b, et un autre échantillon. Il ne prétend pas reproduire 127 à l'identique.

Résultats complets : [avant.json](avant.json), [apres-v2.json](apres-v2.json), journaux gzip dans journaux/, [bilan.json](bilan.json). Ce dernier contient aussi les 60 écarts appariés temps/vague/score de ce lot. Une réduction d'apparitions sous les yeux ne prouve pas à elle seule un bon équilibre du jeu.

La répartition du calcul sur le second Mac n'a pas pu être amorcée : la connexion SSH en mode non interactif a échoué avec « Could not resolve hostname macbook-air-de-manon.local » (sortie 255). Aucun fichier ni clé transmis ; calcul poursuivi sur ce Mac, sans tentative de contournement. Les tests navigateur n'ont été lancés sur aucune machine.

## Scènes physiques ciblées

15/15 contrôles du périmètre propre satisfaits ([statique.json](statique.json), [scenes-vm.json](scenes-vm.json)). 48 zones réelles conformes au schéma N.ids.tele, zéro erreur ([schemas.json](schemas.json)). Onze types testés dans chaque vue : insertion réelle et événement apparition hors champ. Caméra amenée sur un portail : marqueur immobile, état portail, aucune apparition active. Mines : véritables morts par contact et par souffle, protection depuis visibilité mesurée à 0,816667 s et 1,400000 s ; pas d'armement hors vue. La sonde de contact avant se place après 1,1 s de préparation : son contact à 1,116667 s n'est pas présenté comme le premier contact possible.

| Vue après | Annonce → premier déplacement (s) | Zones S.tele au départ | Mort forcée par mur (mur reste mortel) | Pixels de l'annonce isolée |
|---|---:|---:|---:|---:|
| paysage | 2,008 | 6 | 1 | 634 |
| portrait | 2,008 | 6 | 1 | 1371 |
| bureau | 2,008 | 6 | 1 | 730 |

Avant : premier déplacement à 0,008333 s, zéro zone de mur et zéro pixel d'annonce à cet instant. Après : annonce présente avant le premier mouvement ; mort forcée après plus de 2 s d'annonce. Les buffers analysés sont les vrais Uint8Array de N.gfx, avec empreinte et nombre de pixels ; zéro index hors palette, zéro cyan dans les annonces isolées, zéro erreur VM/console. Ces buffers sans DOM **ne qualifient pas le navigateur**.

**Limite du critère R-31 conservée :** sur ces trois collisions contrôlées, son prédicat historique donne **3 sans annonce avant et 3 après** : il omet travellingAnnonce et la mort indique teleDuree=0. Le contrôle physique indépendant voit bien l'annonce ≥2 s avant le déplacement et la mort. Aucun seuil abaissé et aucun faux événement travelling émis pour faire passer ce compteur. Le raccord de mesure/attribution est indispensable avant de valider R-31.

**R-06 externe encore en échec :** la scène boss produit une apparition de l'œil dans la vue sur chacun des trois formats, avant comme après. La phase 2 peut y ajouter les deux mains. Les laisser hors du verdict aurait caché un écart réel à la demande « tout ennemi ».

## Écart des 80 parties de référence

Les vingt bon/humain paysage ci-dessus sont réutilisées ; soixante autres parties ont été exécutées, sans doublonner les vingt. Comparaison exacte avec les 80 reçus e1bdc6f de tools/pilotes/sortie.json ; cet écart inclut les changements déjà présents entre e1bdc6f et le point de départ de ce lot. Les écarts propres à ce lot sont séparés dans bilan.json.

| Pilote | Identiques / 10 | Fins / 10 | Médiane Δ temps (s) | Médiane Δ vague | Médiane Δ score | __ERR |
|---|---:|---:|---:|---:|---:|---:|
| inerte | 9/10 | 10/10 | 0,000 | 0 | 0 | 0 |
| tourneur | 3/10 | 10/10 | 0,000 | 0 | 0 | 0 |
| maladroit | 5/10 | 10/10 | 0,000 | 0 | 0 | 0 |
| kamikaze | 2/10 | 10/10 | 2,672 | 0 | 0 | 0 |
| humain | 0/10 | 10/10 | 0,869 | 0 | -125 | 0 |
| bon | 0/10 | 10/10 | -11,216 | 0 | -685 | 0 |
| expert | 0/10 | 9/10 | 8,715 | 0 | 1950 | 0 |
| dieu | 0/10 | 10/10 | 55,481 | 0 | -10910 | 0 |

Arrêts autres que fin : **expert/2 : borne, 540,088 s, V5, score 143890**. Ils sont conservés comme échecs de terminaison, sans prolonger la borne ni annoncer une campagne intégralement réussie. Détail de chaque écart dans bilan.json / comparaison80 ; autres reçus dans reference60.json.

## Essais et reste à faire

Première passe exploratoire conservée dans [apres.json](apres.json), 9 parties : une annonce rectangulaire couvrait toute la bande qui serait traversée plus tard. Cette géométrie annonçait à tort une grande zone comme déjà mortelle ; elle a été rejetée et remplacée par les frontières courantes / lignes finales datées. Les seuils n'ont pas changé. Aucun résultat de cette passe n'est substitué à apres-v2. La première version de la sonde de scènes accumulait les événements de parties remises à zéro avec des ids réutilisés : la sonde vide désormais son propre journal entre cas ; aucun événement de jeu n'a été supprimé des journaux des parties.

1. Intégrer/revoir le diff de 72 et 73 et les ajouts N.R ; aucun commit réalisé ici.
2. Raccorder les vraies naissances du boss et l'annonce préalable de ses deux world.arena dans son module réservé. Ne pas déplacer ni filtrer les seuls événements pour masquer la création.
3. Raccorder la reconnaissance de travellingAnnonce ou l'attribution de l'annonce arène dans les morts. Le cinquième VOL reste une demande au directeur, sans modification dans ce lot.
4. Examiner les écarts de terminaison/équilibre publiés ci-dessus, puis lancer le script Playwright en tête hors bac et renvoyer playwright/resultats.json. Les pixels navigateur, flashs en situation et Safari réel restent à vérifier ; Chromium avec profil iPhone n'est pas Safari.

**Sous-tâche de correction et préparation des preuves terminée ; palier global non validé ; chantier bloqué sur ces raccords et la réception des preuves navigateur.**
