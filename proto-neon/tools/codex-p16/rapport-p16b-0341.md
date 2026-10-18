# codex-p16b — reprise du vérifieur R-20 / R-30

18/10/2026 · 03 h 41 (Paris), mis à jour à 18/10/2026 · 03 h 41.

Commande exacte à relancer **hors bac**, depuis `proto-neon/` :

```sh
node tools/codex-p16/verifier.mjs
```

Option séparée, avec les deux raccords réservés appliqués seulement en mémoire :
`node tools/codex-p16/verifier.mjs --raccords`.

**Vérifieur corrigé et contrôlé statiquement ; validation navigateur toujours bloquée par le bac.** Aucun serveur, Chromium ou réseau sortant utilisé ici. Aucun commit. Les mesures Canvas, le coût R-20 et R-30 complet sont **à vérifier** après la relance de la cheffe d'orchestre.

## Échec reçu et hypothèses vérifiées par le code

Le reçu du 18/10 à 03 h 33 est conservé dans `navigateur/echec-0333.json`, sans transformation : **0 profil, 0 critère**, délai expiré de **30 000 ms** dans `page.waitForFunction`. Ce reçu ne contient aucun résultat de performance ou de pixels. `navigateur/resultats.json` reste ce reçu historique tant que la nouvelle commande n'a pas tourné.

- **Chemins :** les anciens bundles contenaient déjà `../../cine/`, `../../musique/` et des chemins d'art adaptés à `tools/codex-p16/`. Une mauvaise résolution de tous les actifs n'est donc pas démontrée par ce code. De plus, dans `05-art.js`, `Image.onerror` résout la promesse de décodage : une 404 seule peut laisser `ready=true` avec une image nulle. Le nouveau banc contrôle aussi les illustrations manquantes.
- **RAF :** `N.art.load()` attend les callbacks `Image.onload/onerror` et `Promise.all`, sans dépendre d'une image de jeu dessinée. En revanche, le banc remplaçait `requestAnimationFrame` par une fonction vide, tandis que `waitForFunction` utilise ce rappel par défaut. Le Playwright installé capture le RAF du contexte principal dans `utils.builtins` et le réutilise pour le polling (`playwright-core/lib/server/frames.js`, `waitForFunctionExpression`). C'est une **cause compatible avec l'échec**, pas une confirmation navigateur. La nouvelle attente est explicitement cadencée par timer.
- **Fraîcheur :** les bundles ne sont plus relus tels quels depuis une ancienne génération. Chaque lancement, statique compris, exécute le vrai `build.mjs`, puis reconstruit avant/après à partir de ce build final.

Le contrôle isolé `controle-sans-navigateur.json` fait exécuter le vrai `05-art.js` avec des doubles Image/Canvas : `ready` passe de false à true, y compris avec une image en erreur ; **0 appel RAF**. Cela vérifie le flux des promesses, sans mesurer de décodage ni de pixels réels. Aucune VM de partie nouvelle n'a été utilisée pour en tirer un verdict de jeu.

## Ce qui change

- `preparer-bundles.mjs` produit après depuis `index.html` fraîchement reconstruit ; avant conserve le même socle final, avec seulement `10-gfx.js`, `20-crt.js` et `78-hud.js` remis à leurs sources initiales du lot. `20-crt.js` est identique dans les deux versions. Aucune source réservée modifiée.
- Le serveur expose virtuellement les bundles à `/proto-neon/__avant.html` et `/proto-neon/__apres.html`. Les fichiers physiques restent dans le dossier de mission. Les bases du build valent ainsi `cine/`, `musique/`, `art/`, comme dans le jeu réel. **85 références d'actifs par version, 0 absente localement**, selon `bundles.json`.
- `bundles.json` et le reçu navigateur portent les SHA-256 du build, de tous les modules, des bundles physiques et des versions servies. Les variantes instrumentées ont aussi leur empreinte. La relance vérifiera **le corps HTTP effectivement reçu** dans chaque iframe contre cette empreinte et l'écrira dans `profils[].empreintesRecues`.
- Attente par timer : `N.R.perf.attenteP16.delaiMs=30000`, `pollingMs=100`, ajout documenté dans notre section de `refonte/lots/demandes.md`. La borne précédente est conservée ; aucun seuil de critère n'est diminué.
- Chaque cas est inscrit dans le reçu **avant** son attente. Diagnostics initial, réussi et expiré : URL et état de chaque iframe, `__P16`, modules `__N`, `__S`, `art.ready()`, illustrations nulles, dimensions, état de jeu, `__ERR`, RAF et ressources. Les réponses 404 et requêtes échouées sont conservées avec leur iframe. Une scène en échec reste publiée ; les autres scènes peuvent continuer.
- Les panneaux fixes sont imposés sur toutes les transitions du seul banc déterministe, pour éviter que les horloges murales de deux vidéos faussent la comparaison. Le banc officiel garde les sources non enveloppées. Le navigateur reste muet.

## Mesure avant/après et dispersion

Les scènes `charge`, `v5`, `vol`, `boss3` et les profils paysage tactile 844 × 390, portrait tactile 390 × 844 et bureau 1440 × 900 sont conservés. Un seul Chromium fonctionne à la fois ; les contextes sont fermés en série.

La première passe (`mode: couts`) n'enveloppe ni `step` ni les méthodes des modules. Elle chronomètre la vraie `frame()` ; pour chaque image, les deux iframes sont appelées dans la même page, **avant → après puis après → avant**, en alternance. Après les 120 images d'échauffement existantes, les 600 prélèvements existants publient les séries brutes, min, p50, p95, p99, max, moyenne et écart-type. Le reçu contient aussi la distribution des différences appariées après−avant et les deux strates d'ordre d'exécution : `r20Apparie` et `profils[].coutsApparies`.

Une seconde passe (`mode: profilage`) enveloppe les steps et méthodes pour classer le coût Canvas/CRT et des modules. Ses temps sont explicitement séparés des coûts de la première passe. Les images indexées **et** les RGBA de sortie après CRT sont comparés octet par octet, avec états, horloges et journaux réels. Le complément VOL conserve ses cycles publics et contrôle les transitions.

**Limite :** le coût apparié est une preuve complémentaire d'évolution avant/après ; ses panneaux fixes et ses ticks pilotés ne qualifient pas seuls tout R-20. Les critères officiels complets R-20 (dont SNAKE 2030 et CPU ×4) et R-30 restent exécutés sur les deux versions, en série et sans cache ; leurs fenêtres séquentielles ne servent pas à attribuer un gain avant/après sur une machine chargée. Safari réel reste hors de l'émulation Chromium. Aucun gain n'est annoncé avant ces résultats.

| Mesure | Avant reprise | Après reprise, dans ce bac |
|---|---|---|
| Profils navigateur mesurés | 0 (reçu 03 h 33) | à vérifier hors bac |
| Critères navigateur mesurés | 0 (même reçu) | à vérifier hors bac |
| Build et compilation des bundles instrumentés | instrument statique initial OK, navigateur en échec | sortie 0, normal et raccords |
| Ressources relatives résolues localement | hypothèse de 404, sans journal réseau dans l'ancien reçu | 85 par version, 0 absente |
| Pixels Canvas / dispersion du coût / seuils R-20-R-30 | aucune mesure dans le reçu d'échec | à vérifier hors bac |

## Vérifications faites et preuves conservées

Commandes locales, toutes sans serveur ni navigateur :

```sh
node proto-neon/tools/codex-p16/controle-sans-navigateur.mjs
node proto-neon/tools/codex-p16/verifier.mjs --statique
node proto-neon/tools/codex-p16/verifier.mjs --raccords --statique
```

Résultats : contrôles d'instrument réussis ; syntaxe du JavaScript réellement injecté vérifiée ; ressources normales et avec raccords présentes ; distribution vide rend null, pas un p95 nul inventé ; les séries de tailles différentes sont refusées ; témoins négatifs R-20/R-30 inchangés. Une première exécution statique de la préparation a échoué sur la fermeture du préambule IIFE lors de son analyse isolée (`Unexpected end of input`) ; le préambule est désormais fermé explicitement, puis les deux variantes ont passé ce contrôle. Aucun échec navigateur nouveau n'a été masqué.

Les parties déjà validées ne sont pas rejouées : hors du seul bloc ajouté pour les paramètres d'attente, l'empreinte de toutes les sources correspond exactement au reçu des **80 parties après** : `46b9c2fcc019b0768a9951d46ab61e2bf6b12ab718df7c5c11cbb04e794f7a51` (`controle-sans-navigateur.json`). Les **80/80 parties avant/après**, les **7 200 images VM**, les **4 200 cas de primitives** et le VOL soutenu restent les résultats historiques du lot p16, détaillés dans `rapport-p16-0329.md` et `verification-finale.json` ; ils ne valent pas mesure Canvas nouvelle.

Empreintes des bundles de la reprise, hors raccords en mémoire (`bundles.json`) :

- avant : `b83a56892d1e4be485dd285890c221719482afe1c839a6e8334acfe65152e871`
- après / index final : `98738552c065a687d3f2687dc5c91838d28fe8b688f7cc57a6c848e0e333b4d3`

## Reste et reprise

**Correction de l'instrument terminée au niveau statique ; palier navigateur non validé. Chantier bloqué pour cette validation hors bac.** La dépendance indispensable est l'exécution de la commande en tête du rapport par la cheffe d'orchestre et le retour du nouveau `navigateur/resultats.json`. Lire séparément les pixels, `r20Apparie`, les profils instrumentés et les critères officiels. Le code de sortie reste 1 pour un échec ou un résultat partiel, y compris les échecs de référence avant ; aucun seuil assoupli.

Les réserves R-30 et les raccords réservés de `15-decor.js` / `79-jeu.js` restent ceux du rapport historique : non intégrés aux sources du jeu. Retour arrière de cette reprise : retirer le seul ajout `attenteP16` ; les sources de gameplay reçues dans cette reprise restent inchangées ; aucune modification du gameplay ni commit ajouté ici.
