24/10/2026 · 13 h 05 (Paris) — mis à jour à 13 h 05

Commande locale de contrôle : `node proto-neon/tools/codex-di5/verifier.mjs --statique`.
Commande exigée : `node proto-neon/tools/jury2/verifier.mjs --statique`.

**Films : échec du seuil R-13. 34 usages sur les 50 actifs examinés dépassent 3 flashs/s ; 37 actifs dépassent en lecture intégrale. Maximum reproduit : 18/s, éveil dans l’ouverture, bureau, 60 Hz contractuels.** Le tableau ci-dessous distingue les actifs complets des usages composés du jeu. Ce verdict porte sur les tampons réellement dessinés dans la VM, pas sur la cadence physique d’un iPhone.

**Réserve d’intégration :** le contrôle historique `tools/mesure/verifier-p3c-instrument.mjs` fournit des fractions seules et ne passe plus tel quel : 1 attendu, valeur actuelle `null` (non qualifiable). La migration de sa fixture, sans modification des assertions ni des seuils, passe ses 8 contrôles. Elle est préparée dans `p3c-fixture.patch` et vérifiée par `git apply --check`. Le fichier est hors de la liste autorisée ; l’extension de périmètre demandée reste sans réponse au moment de publication, donc le patch n’est pas appliqué. Le critère « tous les anciens contrôles verts dans leur commande directe » reste bloqué sur cette seule adaptation de fixture.

Corrections livrées (fichier:ligne)

- `tools/codex-di5/r13.mjs:9` : acquisition de quatre masques signés, RLE varint/base64 sans perte, nombre de pixels et dimensions par rendu.
- `tools/codex-di5/r13.mjs:50` : état par pixel et par famille ; une transition consommée au signe opposé sur un rendu ultérieur ; union des pixels L/R terminant leur paire avant le seuil strict d’aire. Redimensionnement : états remis à zéro.
- `tools/codex-di5/r13.mjs:37` : temps de présentation réel `w`. Exception explicite pour une acquisition véritablement fixe, avec vérification `w=k/hz` de chaque rendu : indices exacts, 60 rendus à 60 Hz, 12 à 12 Hz. Cela évite le treizième événement dû à `19/12-7/12=0.9999999999999999` ; aucun seuil de photosensibilité changé.
- `tools/mesure/criteres/R-13-photosensibilite.mjs:9` et `tools/jury2/analyse.mjs:5` : même fonction importée, identité de fonction vérifiée par contrôle. Plus de compteur agrégé employé pour qualifier.
- `tools/mesure/criteres/R-13-photosensibilite.mjs:11` et `tools/jury2/sonde.mjs:100` : masques, horodatage et géométrie à chaque rendu, zéro transition artificielle au démarrage/resize ; seuils lus dans N.R. Le wrapper de sonde reste sérialisable par Playwright.
- `tools/codex-f1/verifier.mjs:53` : acquisition simulée R-13 migrée, état initial conservé et pas fixe explicitement déclaré ; comparaison des scènes inconnues empêchée de devenir verte par `null <= 3`.
- `tools/jury2/jure.mjs:22` : recalcul depuis chaque brut ; sans masques, publication `non qualifiable (fractions sans recouvrement spatial)`, maximum et conformité `null`. L’ancienne estimation n’apparaît que sous `borneSuperieureNonProbante`, avec son libellé. Cela ne prouve pas une majoration mathématique de la nouvelle union spatiale (deux sous-surfaces L/R peuvent s’unir).
- `tools/jury2/jure.mjs:61` : maintien des candidats de planches et du tirage historique, explicitement non probants. Même un canari de mesure contradictoire sur un ancien brut reste cantonné à cette borne ; il ne crée jamais un dépassement qualifié.
- `tools/jury2/verifier.mjs:36` : les mêmes assertions R-13 historiques du jury reçoivent maintenant une vraie suite spatiale synthétique.

Contrôles avant/après

Baseline des deux anciens instruments : commit local `7f025edad64bd928fd75840f41f1d342d5532f0c`, fonctions relues avec `git show`, sans modification de la baseline. Détail : `controles.json`.

| Contrôle | Attendu | Avant jury / projet | Après partagé |
|---|---:|---:|---:|
| fixe | 0 | 0 / 0 | 0 |
| une permutation sans retour | 0 | 1 / 1 | 0 |
| quatre permutations sans retour | 0 | 4 / 4 | 0 |
| un flash L et R | 1 | 1 / 1 | 1 |
| trois flashs | 3 | 3 / 3 | 3 |
| quatre flashs | 4 | 4 / 4 | 4 |
| aire 6 % | 0 | 0 / 0 | 0 |
| aire exactement 6,6 % | 0 | 0 / 0 | 0 |
| aire 6,7 % | 1 | 1 / 1 | 1 |

9 contrôles du diagnostic et 11 complémentaires réussis : surfaces disjointes dans le temps, intersection seule sous le seuil, seconde réelle malgré les rendus manquants, borne exacte, absence d’horloge, resize, RLE corrompu, horloge non croissante, annexe ancienne/neuve, union de sous-surfaces L/R, précision du pas fixe. Le cas des quatre permutations passe bien de 4 à 0 ; le vrai cas à quatre flashs reste refusé.

`annexe.mjs` construit un vrai paquet depuis une fixture brute, avec canaris : 4 séquences restent toutes non qualifiables, maximum et conformité nuls malgré un manifeste périmé annonçant 13/s. Reçu : `annexe-controle.json`.

`jury2/verifier.mjs --statique` : **64/64 verts**, 0 échec ; reçu copié dans `verification-jury2.json`. Les sorties temporaires du jury ont été restaurées à leur contenu initial afin de respecter le périmètre.

`verifier.mjs --statique` : 510 suites de masques relues, mêmes maxima et instants que la mesure ; aucune nouvelle conversion ni nouvelle partie lors de cette relecture.

Méthode des films et portée

1. Inventaire complet des 50 MP4 de `cine/`, vérifiés à 384 × 216 et 12 images/s par ffprobe, nom présent dans le catalogue de `05-art.js`. Décodage `ffmpeg -an -sn -dn … -pix_fmt rgba` vers un tuyau mémoire : aucune lecture sonore, aucun lecteur vidéo.
2. La vraie fonction `frameOf` de `05-art.js`, appelée par `N.art.play/get`, exécute les vraies `lut` et `qtab` et le Bayer. Seuls le décodeur et les ports canvas sont injectés ; aucun algorithme de conversion de remplacement pour la mesure. Les dimensions sont natives : aucune mise à l’échelle d’une vidéo.
3. Équivalence d’une image : `affiche-duo`, image 0, comparaison pixel par pixel contre un calcul indépendant redmean/quantification/Bayer : **0 différence sur 82 944 pixels**, SHA-256 commun `94a170348ed08aa9d4db08b7476a63bc68ca96afcc129b308dc49e820962153b`. `reference.png` et `films.json#/equivalence` conservent le reçu. Le RGBA ffmpeg n’a pas été comparé à la colorimétrie du décodeur matériel Safari.
4. VM validée avant les rendus : **10/10 parties de e1bdc6f identiques** (temps, vague, score), même protocole public que `parties.mjs`, zéro erreur ; `validation-vm.json`. Cette validation ne devient pas un verdict sur une campagne de parties courante.
5. Composition avec les vraies fonctions publiques `N.film.draw`, `N.intro.draw`, `N.choix.draw` et `N.ui.draw` : recadrage, miroirs, assombrissement, révélation, scintillement, légendes et cartes inclus. L’ouverture et l’annonce alerte → boss utilisent aussi les clips voisins ; leurs statistiques sont segmentées pour ne pas attribuer le pic d’éveil au briefing. Le teaser est rendu sur toute sa durée de 5,5 s. Les boucles sont rendues deux fois pour inclure leur raccord.
6. Profils CSS : 844 × 390 tactile, 390 × 844 tactile et 1440 × 900 bureau ; tampons du vrai `N.gfx.resize`. Zone sûre du harnais = zéro inset. Chaque profil est rendu à 12 et à 60 Hz, avec `w=k/hz`. **60 Hz est une cadence de présentation contractuelle simulée, pas une cadence réelle mesurée sur Safari ni une acquisition rAF de cette machine.** Tous les rendus restent dans les 16 indices de palette ; `__ERR.count=0` et aucune erreur console dans les cas mesurés.
7. Les suites de tampons sont produites en mémoire, hachées intégralement, puis leurs masques sans perte et horodatages sont conservés pour le recomptage. Par actif : empreinte du MP4, dimensions et nombre d’images ; par cas : empreinte de la suite complète de tampons, profil, cadence, route, surface, instant et événements. Données détaillées : `films.json` et `films/*.json.gz`.

Tableau complet des films

Colonnes « actif » : maximum sur le clip intégral dans le lecteur réel N.film, y compris sa fin éventuellement inutilisée. Colonnes « usage » : maximum sur les chemins et durées reproduits du jeu ; « — » = clip du catalogue sans usage reproduit identifié. Chaque paire donne **12 Hz / 60 Hz**. Profil, surface commune et instant correspondent au pire usage (sinon au pire actif), avec l’instant en secondes depuis le début de ce film/segment ; la surface est celle du flash terminant sa pire fenêtre, pas la boîte englobante des pixels. « — » en surface/instant = aucun flash qualifiant.

| Film | Actif max/s 12/60 | Usage max/s 12/60 | Profil / cadence / rendu du pic | Surface commune au pic | Instant (s) |
|---|---:|---:|---|---:|---:|
| affiche-duo | 12 / 12 | 0 / 0 | paysage, 12 Hz, titre | — % | — |
| affiche | 0 / 0 | — / — | paysage, 12 Hz, film | — % | — |
| alerte | 10 / 10 | 8 / 5 | paysage, 12 Hz, intro-complet-alerte | 9.0862 % | 1.1667 |
| amiral-elle | 7 / 7 | 7 / 7 | paysage, 12 Hz, film-usage | 7.8442 % | 4.5833 |
| amiral-lui | 0 / 0 | 0 / 0 | paysage, 12 Hz, film-usage | — % | — |
| apotheose-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 19.0011 % | 2.9167 |
| apotheose-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 11.0366 % | 1.25 |
| apotheose | 8 / 8 | 7 / 6 | paysage, 12 Hz, intro | 7.0227 % | 1.25 |
| boss | 9 / 10 | 9 / 9 | portrait, 12 Hz, intro-complet | 7.2524 % | 1.4167 |
| briefing | 0 / 0 | 0 / 0 | paysage, 12 Hz, ouverture | — % | — |
| chasse-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 15.5426 % | 1.1667 |
| chasse-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 21.3003 % | 1.0833 |
| chasse | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 16.8101 % | 1.1667 |
| connexion-elle | 10 / 10 | 3 / 3 | bureau, 12 Hz, film-usage | 7.0864 % | 4.4167 |
| connexion-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 10.3269 % | 1.8333 |
| connexion | 4 / 4 | 3 / 3 | bureau, 12 Hz, film-usage | 9.0346 % | 3.5833 |
| defaite-elle | 0 / 0 | 0 / 0 | paysage, 12 Hz, intro | — % | — |
| defaite-lui | 2 / 2 | 2 / 2 | bureau, 12 Hz, intro | 7.2309 % | 2.0833 |
| defaite | 0 / 0 | 0 / 0 | paysage, 12 Hz, intro | — % | — |
| espace-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 12.6905 % | 1.4167 |
| espace-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 8.7763 % | 1.25 |
| eveil | 12 / 18 | 12 / 18 | bureau, 60 Hz, ouverture | 7.2457 % | 1.5333 |
| exterieur | 5 / 5 | 5 / 5 | paysage, 12 Hz, ouverture | 7.6097 % | 1.4167 |
| fin-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 7.9633 % | 1.8333 |
| fin-lui | 11 / 10 | 11 / 10 | bureau, 12 Hz, film-usage | 8.3099 % | 1.25 |
| fissure-elle | 12 / 12 | 12 / 12 | bureau, 12 Hz, film-usage | 10.9012 % | 4.1667 |
| fissure-lui | 1 / 0 | 1 / 0 | paysage, 12 Hz, film-usage | 9.3231 % | 0.5 |
| neon-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 6.6314 % | 1.25 |
| neon-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 10.0024 % | 1.1667 |
| pilote-elle | 1 / 1 | 1 / 1 | paysage, 12 Hz, choix | 8.5976 % | 5.0833 |
| pilote-lui | 2 / 2 | 2 / 2 | bureau, 12 Hz, invitation | 7.758 % | 2 |
| plongee-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 14.4671 % | 1.1667 |
| plongee-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 18.9318 % | 1.0833 |
| plongee | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 9.9891 % | 1.1667 |
| profondeur-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 14.2338 % | 1.1667 |
| profondeur-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 22.9931 % | 1.4167 |
| retournement-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 7.8454 % | 1.25 |
| retournement-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 8.374 % | 1.1667 |
| retournement | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 7.2828 % | 1.25 |
| retrouvailles | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 9.3936 % | 3.0833 |
| reveil-elle | 1 / 0 | 1 / 0 | paysage, 12 Hz, intro | 6.7967 % | 0.5 |
| reveil-lui | 1 / 0 | 1 / 0 | paysage, 12 Hz, intro | 6.8259 % | 0.5 |
| reveil | 1 / 1 | 1 / 1 | paysage, 12 Hz, intro | 6.9109 % | 0.5 |
| rival-elle | 12 / 12 | 9 / 9 | paysage, 12 Hz, intro | 7.5842 % | 2.9167 |
| rival-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 9.3414 % | 1.25 |
| rival | 12 / 12 | 12 / 12 | paysage, 12 Hz, intro | 8.1614 % | 1.25 |
| teaser-3019 | 0 / 0 | 0 / 0 | paysage, 12 Hz, film-usage-rendu | — % | — |
| victoire | 6 / 7 | 6 / 7 | bureau, 60 Hz, intro | 10.2049 % | 1.2 |
| warp-elle | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 9.7934 % | 1.1667 |
| warp-lui | 12 / 12 | 12 / 12 | paysage, 12 Hz, film-usage | 9.1761 % | 1.25 |

Écrans de film sans MP4 : les 12 cas complémentaires sont dans `proceduraux.json`. Le titre d’ouverture horizon + logo atteint 1/s sur chaque profil aux deux cadences ; le film À SUIVRE atteint 0/s. Les six suites nouvelles À SUIVRE sont conservées à côté du rapport ; les six segments titre réemploient les masques de l’ouverture déjà acquis. Aucun ne dépasse le seuil.

Correction minimale proposée, sans l’appliquer

Ajouter une garde commune **sur le tampon final composé des films**, avant présentation : si le candidat ferait entrer une quatrième paire spatiale dans la seconde de présentation réelle, garder le tampon précédent et ne pas consommer un rendu refusé. Réutiliser les seuils existants de N.R et faire passer les compositions de `60-intro` et `64-aventure` par cette garde (les autres usages mesurés passent actuellement). La vidéo peut continuer son décodage ; ce sont les images effectivement présentées qui sont bornées. Cette proposition couvre aussi les scintillements, balayages, déplacements et textes : abaisser seulement le décodage à 3 Hz ou compter les demandes de N.fx ne constitue pas une preuve sur leur composition. La mesure actuelle ne prouve pas quelle part du pic d’éveil vient de chaque effet ; aucun diagnostic de cause isolée n’est inventé. La fluidité et tous les films devront être requalifiés après une correction de src.

Taille mesurée de la preuve conservée

510 fichiers gzip, 103 698 rendus, 282 760 734 octets compressés (282.76 Mo) pour 8.489 Go de tampons palette bruts équivalents, soit 3.33 %. Moyenne : 2727 octets compressés/rendu ; maximum moyen d’un cas : 22178 octets/rendu. Ce chiffre inclut les JSON de preuve ; ce n’est pas une mesure de coût CPU ou de stockage d’une partie moyenne sur iPhone. La collecte future possède le même codec, mais son surcoût navigateur reste à vérifier hors bac.

Build, commandes et reste à faire

`cd proto-neon && node build.mjs` : sortie **0**. SHA-256 avant = après : `3eaf75cf596e5e101d7b33d103eae98dca36ae83435afa3b4890618f684a4024`. Aucun changement de `index.html` ni de `src/`, aucun nouveau seuil ni nombre de gameplay ; demandes dans la section codex-di5 de `refonte/lots/demandes.md`.

Reproduction des rendus, en série, sans navigateur :

`node proto-neon/tools/codex-di5/valider-vm.mjs`
`node proto-neon/tools/codex-di5/films.mjs`
`node proto-neon/tools/codex-di5/films.mjs --complements`
`node proto-neon/tools/codex-di5/films.mjs --complements --queues`
`node proto-neon/tools/codex-di5/usages.mjs`
`node proto-neon/tools/codex-di5/proceduraux.mjs`
`node proto-neon/tools/codex-di5/verifier.mjs --statique`

Le script Playwright complet est prêt dans `verifier.mjs --navigateur` (serveur local sur port libre, verrou commun, un Chrome headless muet à la fois, trois profils en série, masques réels, journal et état). **Non exécuté**, conformément à la mission. Commande éventuelle de la cheffe hors bac : `node proto-neon/tools/codex-di5/verifier.mjs --navigateur`.

Reste : décision de périmètre pour la fixture p3c ; correction des films dans un autre lot puis requalification ; cadence rAF et décodeur Safari physique non mesurés. Les anciens bancs de scènes à fractions doivent migrer avant de redevenir qualifiants (demande écrite, pas de lecture spatiale inventée).

Commit local demandé dans la dernière consigne : **tenté, échec code 128** pour git add et git commit, création de `index.lock` refusée (Operation not permitted). Reçu : `commit.json` ; aucun contournement des permissions .git.
