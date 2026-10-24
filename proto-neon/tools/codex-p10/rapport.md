# codex-p10 — R-13 photosensibilité et R-37 tête gainée

18/10/2026 · 02 h 10 (Paris), publication ; mis à jour à 02 h 12.

**Commande hors bac, depuis la racine de la copie :**
`cd proto-neon && node tools/codex-p10/verifier.mjs`

**Chantier bloqué sur R-13.** La tête est corrigée et vérifiée en VM ; le limiteur journalise toutes ses décisions et sa faille pendant le gel est corrigée. **Le jeu composé dépasse encore trois flashs/s** : aucun feu vert photosensibilité, aucune qualification WCAG ou Safari. Le décor impliqué par les essais est hors des fichiers confiés à codex-p10 ; demande bornée dans [demandes.md](../../refonte/lots/demandes.md), section codex-p10. Le navigateur reste à vérifier hors bac. Ni serveur ni Chromium n'ont été lancés ou essayés ici. Aucun commit.

## Modifications livrées

- `50-fx.js` : chaque chemin d'admission écrit `N.journal('flash',…)` : sous-seuil, plein, composants simultanés, réduction, refus de budget et réglage. Les champs officiels `aire,accepte` restent au contrat. Métadonnées locales `_type,_luminance,_rouge,_image,_temps,_issue,_echelle,_compte`, autorisées par le validateur du socle. `_compte` distingue un nouveau flash d'un composant admis sous le seuil ou pendant la même image ; compter simplement toutes les lignes `accepte=true` serait faux. La luminance est celle de l'encre de crête demandée ; le rouge indique le chemin de palette de l'effet, pas un pixel fictivement mesuré. Pour les producteurs externes sans encre, ces deux valeurs restent **null** ; l'argument optionnel `flashGate(aire,{type,ci})` permet de les fournir. Tous les pixels sont mesurés séparément par l'instrument.
- Faille reproduite : avec `update(0)`, l'ancienne rafale restait ouverte pendant toutes les images gelées. Les départs doivent maintenant appartenir à **la même image**, et respecter aussi la borne temporelle historique. Le journal glissant du limiteur survit toujours à `reset()`.
- `40-sprites.js` : gaine nuit profonde index 15, d'un pixel, calculée **après** chacune des rotations et mémorisée. Boîte **13×13** et ancrage **(6,6)** conservés. Les pixels cyan qui touchaient le bord de la boîte cèdent leur place à la gaine ; aucun déplacement, agrandissement ou cyan nouveau à l'extérieur. Les détails cyan intérieurs restent identiques. Les yeux fermés restent des trous.
- `02-regles.js` : ajout seul `lisibiliteP10`, valeurs et raisons consignées dans la section de demandes. Aucun seuil augmenté. Les autres sources sont intactes ; `index.html` est seulement reconstruit.

## Calibration de la VM et portée

[calibration.json](calibration.json) : **10/10** cas e1bdc6f strictement identiques, temps de jeu, temps de combat, vague, score, arrêt, erreurs **et SHA-256 du journal complet** ; neuf graines inertes et tourneur graine 1. Sans arrondi, sans modification des sources de référence. La VM charge les vrais fichiers dans l'ordre de `build.mjs`, sans DOM.

Le premier échantillon de cinq pilotes × deux graines avait **10/10 métriques exactes mais seulement 5/10 journaux identiques** : [calibration-metriques.json](calibration-metriques.json). Il est conservé, et n'est pas présenté comme une calibration stricte du journal. La calibration stricte ci-dessus satisfait les dix parties demandées ; elle ne prouve pas une identité navigateur universelle de tous les calculs flottants. Les différences de ce premier échantillon ne sont ni arrondies ni effacées.

[parties-finales.json](parties-finales.json) : **20/20 parties avant/après identiques**, inerte et tourneur, graines 1 à 10, sur les **sources finales**. Égalité exacte de temps, vague, score, fin et erreurs ; SHA-256 des journaux hors nouveaux événements `flash` identiques ; **zéro erreur**. Écarts de ces vingt résultats avec les métriques de la référence e1bdc6f : **1 cas**. tourneur graine 1 : jeu référence 20.192500001688256 s, avant/après 20.19041666860327 s ; combat référence 15.975833335021887 s, avant/après 15.97375000193691 s. Vague et score conservés. Cet écart est déjà présent avant les changements p10. Le protocole garde localStorage vierge, jour 20261017, réglage actions, départ plongée, saut du seul démarrage initial, pilote officiel, amorçage horloge, tranches de 0,25 s jusqu'à fin. Pas de scène forcée pendant ces parties. Les **80 parties ne sont pas prétendues intégralement rejouées**. Une série complémentaire de huit pilotes × trois graines est conservée dans [parties.json](parties.json) ; elle a commencé avant la dernière correction du regroupement par image et a été **arrêtée volontairement à 21/24, sortie 130**, après la réussite des vingt parties finales. Ses vingt et un cas avant/après sont identiques ; les trois cas dieu restants ne sont pas mesurés. Ce lot complémentaire incomplet n'est pas la preuve finale de vingt parties.

Empreinte SHA-256 de la liste ordonnée des sources finales : `c54ec5a2b4dd6476eb243c0dc12362c262fc7053b0b1b15d344ea23741bbd499`.

## R-13 — preuves sur le vrai tampon

[scenes-avant.json](scenes-avant.json), [scenes-apres.json](scenes-apres.json) : **600 images par scène et profil**, soit neuf essais ; vraie boucle `frame()` de `90-boot.js`, invulnérabilité publique, `dbg.scene('charge')`, `dbg.scene('boss3')`, mort de l'œil par dégâts publics pendant ses vraies fenêtres. La mort est confirmée par le journal kill du boss dans les trois formats. Les parties simulées utilisent séparément le protocole des pilotes, pas cette boucle de rendu.

Chaque image relit les index de `N.gfx.buf()` : luminance moyenne, parts de hausses/baisses ≥0,1 (niveau sombre <0,8), entrées/sorties du rouge, image, état, phase et PV. Union des fins simultanées luminance/rouge, fenêtre glissante réelle de 60 images, aire **strictement >0,066**, plafond **3**. Transitions brutes et journal intégral conservés. Ce compteur agrégé ne prouve pas le recouvrement spatial des régions et n'est pas une certification WCAG.

| Profil | Scène | Pixels avant, pire /s | Pixels après, pire /s | Nouveaux départs admis après, pire /s | Résultat après |
|---|---|---:|---:|---:|---|
| paysage | charge | 9 | 9 | 3 | **ÉCHEC** |
| paysage | boss3 | 1 | 1 | 1 | satisfait ce test |
| paysage | mort-cyclope | 7 | 7 | 3 | **ÉCHEC** |
| portrait | charge | 3 | 3 | 3 | satisfait ce test |
| portrait | boss3 | 4 | 4 | 1 | **ÉCHEC** |
| portrait | mort-cyclope | 4 | 4 | 3 | **ÉCHEC** |
| bureau | charge | 14 | 14 | 3 | **ÉCHEC** |
| bureau | boss3 | 1 | 1 | 1 | satisfait ce test |
| bureau | mort-cyclope | 6 | 6 | 3 | **ÉCHEC** |

Les reçus historiques demandés sont conservés à leur emplacement : batterie-8f55a91, R-13 **6/s**, journal non mesurable ; R-37 **0/9** gaines. Ils utilisent un autre bundle et ne sont pas confondus avec la comparaison appariée ci-dessus.

[limiteur.json](limiteur.json) : scénario contradictoire de gel, **30→3 flashs/s** réellement dessinés au tampon via `flashGate`. Pression de **4800 demandes**, resets inclus : **30 nouveaux départs**, maximum **3/s**, **4560 refus**, zéro erreur. Le scénario de gel est un test dirigé du limiteur, pas une scène de partie déclarée sûre. Le contre-exemple analytique de quatre flashs est bien refusé à **4/s**, sans double comptage L/R.

[journal-et-tetes.json](journal-et-tetes.json) : les six issues sont réellement exercées ; tous leurs enregistrements satisfont `N.ids.valider('journal:flash',…)`. Les 4 800 enregistrements de pression satisfont aussi ce schéma. `_image` et l'image officielle du journal concordent.

[attribution.json](attribution.json) : ablations de diagnostic, réalisées après journalisation et avant la correction du gel. En paysage, charge **9/s**, sans dessin FX **6/s**, sans décor **2/s** ; mort CYCLOPE **7/s**, sans FX **5/s**, sans décor **2/s**. Boss3 portrait **4/s**, toujours **4/s** sans FX ou sans colosse, **1/s** sans décor. Cela implique le décor ou son interaction avec la composition ; **cela ne localise pas encore sa fonction interne exacte**. Le décor n'est pas supprimé du jeu livré. Lecture complémentaire : `15-decor.js:82-86` exclut victoire de `enJeu()`, donc son atténuation change alors que la cascade de mort continue ; contribution exacte à isoler par sa propriétaire.

## R-37 — preuve de la gaine et de la conservation

Avant **0/48**, après **48/48** gaines complètes : seize directions × trois animations. Dessin par `N.gfx.blit` sur fond os, puis lecture du **tampon**, voisinage extérieur de huit, trous internes des yeux séparés du bord. Pas de disque de collision, pas de radar compté comme tête. Le détecteur refuse une gaine percée : **47/48**, contrôle négatif dans `journal-et-tetes.json`.

Dans les neuf scènes, **4470/4470** têtes réellement dessinées et hors panneau sont identiques pixel par pixel à leur vraie direction/animation ; aucune tronquée. La sonde enregistre le sprite réellement passé à blit, position et encre ; elle relit les pixels finaux, gaine incluse, après composition. Elle ne se contente pas d'un compteur d'appels. Après disparition de la tête dans la séquence de victoire, elle n'invente pas de capture supplémentaire.

[sprites.json](sprites.json) : **48/48** boîtes/ancrages conservés, aucun détail cyan intérieur modifié, aucun pixel cyan ajouté ailleurs ; **34** autres sprites/animations comparés identiques. Ce lot ne qualifie pas le silence de l'arsenal R-37, réservé à sa propriétaire.

## Vérifications et suite indispensable

- `cd proto-neon && node build.mjs` : **sortie 0**, **35 modules**, **1 873 214 octets**. Bundle SHA-256 : `47cfb6e4017ae31b8a387aa9350e05ecb473a58569bf8d94d783f191ca717110`.
- Générateur de rapport : première exécution sortie 1 (backticks Markdown non échappés), corrigée ; exécution finale sortie 0. Aucun effet sur les sources du jeu.
- Syntaxe des sources et scripts, import de Playwright et de ses profils, `git diff --check` : sortie 0. Import seul, aucun lancement du navigateur.
- Les neuf scènes VM : `window.__ERR.count === 0`. Le script de scènes retourne **1**, honnêtement, à cause de R-13 encore en échec. Calibration stricte, vingt parties finales, limiteur, journal et sprites : sortie 0 ; série complémentaire arrêtée volontairement : sortie 130. Aucun seuil ni essai raté masqué.
- [verifier.mjs](verifier.mjs) prêt hors bac : serveur Node sur port libre, un seul Chromium avec `--mute-audio`, contextes en série, profils iPhone 13 paysage 844×390, portrait 390×844, bureau 1440×900 ; neuf séries de 600 images, journal complet, mêmes mesures et vrais pixels de la tête, 48 sprites par profil, captures finales tampon + écran. Résultats dans `navigateur/resultats.json`. Pas de capture finale prétendue être celle d'un pic passé.

**Sous-tâches gaine et journal livrées ; limiteur de gel corrigé. Palier R-13 non validé ; chantier bloqué sur la correction des transitions impliquant `15-decor.js`, puis la vérification navigateur et Safari réel.** Reprise : la propriétaire du décor isole/corrige les transitions sans changer les seuils ; la cheffe lance la commande en tête et renvoie tous les reçus, y compris les échecs. Aucun correctif hors périmètre ni commit à intégrer automatiquement.
