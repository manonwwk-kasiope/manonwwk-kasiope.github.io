# Chantier « jeu incroyable » — plan, critères et arrêts (écrits avant le lancement)

24/10/2026 · 01 h 57 (Paris). Demande de la propriétaire (24/10, 01 h 55) : « des tests et améliorations afin de rendre le jeu vraiment incroyable.
tout doit être fait de consort avec codex. rien ne doit être "à peu près" […] un jeu dynamique, qui bouge au rythme de la musique (les
événements arrivent sur les temps du bpm), certaines scènes peuvent aussi accélérer le tempo. n'oublie pas le warp […] un jeu qui adapte sa
difficulté aux compétences du joueur. fais des autotests, tourne au moins 6 heures pour adapter et optimiser la jouabilité, le tempo,
l'intérêt du jeu. il doit être supérieur à 9,5/10. »

## Pistes (Codex construit, la cheffe vérifie au navigateur et intègre ; le jury n'est jamais l'auteur)

| Piste | Objet | Fichiers propriétaires |
|---|---|---|
| i1 | Report sur la pointe des lots vérifiés du 18/10 (p35 flashs, p44 difficulté/annonces, p45b performance, p33b tempo retenu par v0c, p47 gestes) | raccords uniquement |
| r2b | Rythme : module `31-rythme.js` de codex-r2 + carte codex-r1, ramené sous R-13, R-14 et la difficulté | `31-rythme.js`, `15-decor.js` |
| t1 | Tempo qui accélère dans certaines scènes (WARP, CYCLOPE final, dernier drop), sans changer la hauteur des voix | `30-music.js`, `musique/` |
| w1 | WARP spectaculaire et rythmé | `78-warp.js` |
| d1 | Difficulté adaptative aux compétences du joueur | `32-adapte.js` (neuf) |
| j1 | Banc d'autotest et dossier du jury (vidéos, images aux temps forts, mesures) | `tools/jury2/` |

## Critères de réussite (portes), mesurés au navigateur (Chrome, iPhone 13 paysage/portrait, bureau)

1. **Zéro erreur** (jeu, console, page) ; build sortie 0.
2. **Photosensibilité R-13** ≤ 3 flashs/s au-delà de 6,6 % de l'écran ; **secousses R-14** ≤ 12 % des images ; palette 16 couleurs ; cyan réservé à la joueuse.
3. **Rythme** : ≥ 95 % des apparitions, tirs ennemis et départs de vague à ± 40 ms d'un temps audio (horloge audio réelle, latence compensée) ; chaque drop de la carte r1 suivi d'un moment fort en ≤ 1 temps ; chaque break d'une retenue visible.
4. **Tempo** : dans les scènes désignées, tempo effectif relevé d'au moins 8 % sans changement de hauteur (écart ≤ 10 cents), raccords sur la mesure.
5. **Difficulté adaptative** : pour les pilotes maladroit, humain, bon et expert, défaite médiane entre 150 et 240 s et part atteignant le CYCLOPE entre 20 et 50 % ; écart entre pilotes réduit d'au moins 40 % par rapport à la difficulté fixe ; ajustements bornés (± 25 %), seulement entre deux vagues ; dieu encore mis en difficulté (au moins une mort sur 10 parties).
6. **Performance** : p95 du temps d'image ≤ 11 ms (émulation normale) ; ≤ 16,7 ms sur l'iPhone de la propriétaire (à vérifier par elle).
7. **Jury ≥ 9,5/10** : cinq jurés Claude neufs (joueuse iPhone, game design, rythme et musique, direction artistique, confort et performance) et un juré Codex, chacun sur le dossier j1 d'une même build ; moyenne ≥ 9,5 et aucune note < 9. Deux jurys consécutifs au-dessus du seuil pour conclure.

## Arrêts (règle de non-convergence)

- Chaque piste : 3 passes au plus. Si la même porte échoue à deux passes consécutives, la piste s'arrête et la méthode est mise en cause (diagnostic écrit), sans « tour de plus ».
- Durée : au moins 6 h de boucle d'autotest et d'optimisation (de 02 h 00 à 08 h 00 au plus tôt), point chiffré toutes les 2 h dans ce fichier.
- Le jury est un jugement de modèles, pas de joueurs humains : la partie de la propriétaire sur son iPhone reste le juge final.

## Séries autonomes de tests, améliorations, optimisations (ajout de 02 h 06, demande de la propriétaire à 02 h 05)

- **Séries de mesure** : `~/Projets/wt-snake/serie-autotest.sh` rejoue 80 parties de pilotes (8 pilotes × 10 graines) au navigateur sur chaque
  nouvelle pointe, ou toutes les 40 min, jusqu'à 11 h ; reçus horodatés `~/Projets/wt-snake/recus/series/<date-heure>-<commit>.json`.
  Chaque série est comparée à la précédente (mêmes graines) : une régression d'une porte part en consigne Codex, sans attendre.
- **Études Claude** (5 agents neufs, lecture seule, 02 h 04) : game design et sensations, rythme et tempo, WARP et scènes, joueuse iPhone et
  difficulté adaptative, méthode d'autotest. Rendus dans `~/Projets/wt-snake/etudes/`, synthétisés par la cheffe en consignes Codex.
- **Boucle** : étude → consigne Codex → livraison → vérifieur navigateur → intégration → série de mesure → dossier j1 → jury → nouvelles consignes.
