# Lot I — dépendances de codex-02 (rapport du banc)

18/10/2026 00 h 33 (Paris). Copie propre du commit `036f96e`, construite par `node build.mjs` dans un dossier temporaire ; SHA-256 du bundle `dbaab852689afb63c33f8746c140d62f04f91015e5ebed0e84317d7a3b1c6f82`. Chromium 140.0.7339.16.

Statut du banc : **toutes les mesures ci-dessous passent**. Ce rapport mesure le lot I, il ne valide ni le palier ni le chantier des pilotes.

Profil iPhone 13 paysage 844 × 390, `window.__SEED` fixé, `N.intro.skip()`, départ en plongée, simulation par `N.game.dbg.simuler` (aucun saut de séquence, aucun `valider`). Commande : `node tools/I/verifier.mjs --ref 036f96e --base f96c80f --pilotes inerte,tourneur,maladroit,kamikaze,humain,bon,expert,dieu --graines 3`.

## 1. Le crochet du pilote et les vues, état par état

**Partie au doigt, invulnérable (de la plongée à la victoire)** — arrêt `fin`, 325,0 s de jeu (363,4 s simulées), vague 5, erreurs 0, console 0.

| État | Pas de `update` | Appels de `__PILOT` | Tranches relevées | Vues au schéma (butin · vue · voies · tele · pouvoir · player) | Plus grands relevés |
|---|---:|---:|---:|---|---|
| plongee | 97 | 97 | 8 | 8 · 8 · 8 · 8 · 8 · 8 | 0 cellules, 0 voie, 0 télégraphes |
| jeu | 28965 | 28965 | 2411 | 2411 · 2411 · 2411 · 2411 · 2411 · 2411 | 23 cellules, 1 voie, 6 télégraphes |
| nettoyage | 1518 | 1518 | 128 | 128 · 128 · 128 · 128 · 128 · 128 | 14 cellules, 0 voie, 0 télégraphes |
| panneau | 2534 | 2534 | 210 | 210 · 210 · 210 · 210 · 210 · 210 | 10 cellules, 1 voie, 0 télégraphes |
| cartes | 607 | 607 | 52 | 52 · 52 · 52 · 52 · 52 · 52 | 8 cellules, 0 voie, 0 télégraphes |
| vol | 1919 | 1919 | 160 | 160 · 160 · 160 · 160 · 160 · 160 | 8 cellules, 0 voie, 0 télégraphes, S.vol au schéma sur 160 tranches (30 objets au plus) |
| alerte | 145 | 145 | 12 | 12 · 12 · 12 · 12 · 12 · 12 | 5 cellules, 0 voie, 0 télégraphes |
| boss | 7510 | 7510 | 626 | 626 · 626 · 626 · 626 · 626 · 626 | 29 cellules, 0 voie, 6 télégraphes |
| victoire | 313 | 313 | 26 | 26 · 26 · 26 · 26 · 26 · 26 | 24 cellules, 0 voie, 0 télégraphes |

**Partie au doigt, sans rien faire (jusqu'à la mort et à la fin)** — arrêt `fin`, 25,0 s de jeu (25,5 s simulées), vague 1, erreurs 0, console 0.

| État | Pas de `update` | Appels de `__PILOT` | Tranches relevées | Vues au schéma (butin · vue · voies · tele · pouvoir · player) | Plus grands relevés |
|---|---:|---:|---:|---|---|
| plongee | 97 | 97 | 8 | 8 · 8 · 8 · 8 · 8 · 8 | 0 cellules, 0 voie, 0 télégraphes |
| jeu | 2251 | 2251 | 187 | 187 · 187 · 187 · 187 · 187 · 187 | 3 cellules, 0 voie, 1 télégraphes |
| mort | 468 | 468 | 39 | 39 · 39 · 39 · 39 · 39 · 39 | 3 cellules, 0 voie, 1 télégraphes |
| reapparition | 242 | 242 | 20 | 20 · 20 · 20 · 20 · 20 · 20 | 3 cellules, 0 voie, 1 télégraphes |
| fin | 2 | 2 | 1 | 1 · 1 · 1 · 1 · 1 · 1 | 3 cellules, 0 voie, 0 télégraphes |

Écran des cartes relevé en jeu (`depuis` 0,4 s) : cartes ["croissance","arc","traversee","aimant","reparation"], `niveaux` {"croissance":1,"arc":1,"traversee":1,"aimant":1,"reparation":1}. Plus grands paliers proposés pendant toute la partie : {"croissance":2,"arc":2,"traversee":1,"aimant":2,"reparation":1,"grappe":1,"tourelles":3,"missiles":1,"canon":3,"braise":1,"sangFroid":1} ; le palier IV (ULTIME) n'a pas été proposé pendant ce parcours (voir la sonde du § 1 ter).

## 1 bis. Le crochet dans les états hors combat

États forcés par `N.game.dbg.etat(nom)` puis 0,3 s simulées (à vérifier ainsi parce que les parcours ci-dessus ne les traversent pas tous) : demarrage (36 pas, 36 appels), ouverture (36 pas, 36 appels), titre (36 pas, 36 appels), briefing (36 pas, 36 appels), attraction (36 pas, 36 appels), pause (36 pas, 36 appels), initiales (36 pas, 36 appels), defile (71 pas, 71 appels), reapparition (1 pas, 1 appels). Erreurs : 0.

## 1 ter. `S.ecran.niveaux` et l'ULTIME (sonde)

Après deux prises du CANON, l'écran des cartes rouvert 5 fois jusqu'à ce que le CANON y figure : cartes ["minesQ","canon","puissance"], `niveaux` {"minesQ":1,"canon":4,"puissance":1}. Palier du CANON : **4** (4 = ULTIME) ; chaque valeur égale `N.cartes.texte(id).palier` : oui ; schéma `ecran` respecté sur l'écran des cartes et après sa fermeture (`niveaux` vaut alors {}) : oui.

## 2. Une partie normale au doigt reste identique

Même script de doigt (vise la cellule la plus proche), même graine, trace relevée toutes les 0,1 s (état, temps, score, kills, longueur, position, ennemis et leurs PV, tirs, cellules, vague, pas) sur la version de base `f96c80f` et sur la version du lot I. Les parties s'arrêtent à la première fin ou au seuil d'un écran à horloge arrêtée (la version de base ne le franchit pas en simulation).

| Parcours | Lignes base | Lignes lot I | Première divergence | Dernier état | Empreinte base | Empreinte lot I |
|---|---:|---:|---|---|---|---|
| mortel | 163 | 163 | aucune | fin | `0d7705ad1a579d34` | `0d7705ad1a579d34` |
| invulnerable | 388 | 388 | aucune | panneau | `08bf22a8e1cbeb4b` | `08bf22a8e1cbeb4b` |

## 3. Les pilotes de Codex (inerte, tourneur, maladroit, kamikaze, humain, bon, expert, dieu) : 24 parties

`N.pilote.lancer(nom)` puis `N.game.dbg.simuler(0.25)` par tranches, jusqu'à l'état `fin` ou 540 s de jeu. Blocage = ni l'état, ni le temps de jeu, ni la garde de l'état (`finT`), ni `S.vol.reste` ne changent pendant 10 s simulées.

| Pilote | Graine | Arrêt | Jeu s | Vague | Score | Morts | Cartes prises | Erreurs | Appels de `__PILOT` = pas de `update` |
|---|---:|---|---:|---:|---:|---|---|---:|---|
| inerte | 1 | fin | 25,3 | 1 | 10 | mur, ennemi, mur | — | 0 | oui, dans 5 états |
| inerte | 2 | fin | 24,8 | 1 | 10 | mur, ennemi, mur | — | 0 | oui, dans 5 états |
| inerte | 3 | fin | 25,0 | 1 | 60 | mur, ennemi, mur | — | 0 | oui, dans 5 états |
| tourneur | 1 | fin | 20,2 | 1 | 1370 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| tourneur | 2 | fin | 17,7 | 1 | 270 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| tourneur | 3 | fin | 20,2 | 1 | 220 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| maladroit | 1 | fin | 19,3 | 1 | 480 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| maladroit | 2 | fin | 18,2 | 1 | 330 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| maladroit | 3 | fin | 19,3 | 1 | 720 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| kamikaze | 1 | fin | 15,2 | 1 | 640 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| kamikaze | 2 | fin | 15,4 | 1 | 690 | ennemi, ennemi, ennemi | — | 0 | oui, dans 5 états |
| kamikaze | 3 | fin | 63,9 | 2 | 12540 | ennemi, mur, mur, mur | croissance | 0 | oui, dans 9 états |
| humain | 1 | fin | 66,1 | 2 | 2350 | mur, mur, ennemi | bouclier | 0 | oui, dans 9 états |
| humain | 2 | fin | 73,0 | 2 | 1470 | mur, ennemi, mur | arc | 0 | oui, dans 9 états |
| humain | 3 | fin | 89,2 | 2 | 7690 | mur, ennemi, ennemi, ennemi | croissance | 0 | oui, dans 8 états |
| bon | 1 | fin | 81,1 | 2 | 1280 | mur, ennemi, ennemi | bouclier | 0 | oui, dans 9 états |
| bon | 2 | fin | 318,5 | 5 | 118090 | laser, ennemi, mur, mur, ennemi | arc, tourelles, bouclier, cadence, canon, missiles, drones, croissance, puissance | 0 | oui, dans 11 états |
| bon | 3 | fin | 84,1 | 2 | 2180 | mur, ennemi, ennemi | croissance | 0 | oui, dans 9 états |
| expert | 1 | fin | 141,3 | 3 | 19650 | mur, ennemi, ennemi, ennemi | bouclier, canon, tourelles, puissance | 0 | oui, dans 9 états |
| expert | 2 | fin | 211,8 | 5 | 47810 | ennemi, ennemi, ennemi, ennemi | arc, tourelles, cadence, bouclier, canon, missiles, traversee, puissance, croissance | 0 | oui, dans 9 états |
| expert | 3 | fin | 75,7 | 2 | 1580 | mur, ennemi, ennemi | croissance | 0 | oui, dans 9 états |
| dieu | 1 | fin | 349,9 | 5 | 187660 | — | bouclier, tourelles, canon, croissance, missiles, arc, traversee, aimant | 0 | oui, dans 10 états |
| dieu | 2 | fin | 329,0 | 5 | 143860 | — | arc, tourelles, bouclier, cadence, canon, missiles, drones, croissance, puissance | 0 | oui, dans 10 états |
| dieu | 3 | fin | 403,9 | 5 | 185260 | — | croissance, arc, puissance, drones, traversee, reparation | 0 | oui, dans 10 états |

États traversés par ces parties : plongee, jeu, mort, reapparition, fin, nettoyage, panneau, cartes, vol, alerte, boss, victoire.

## 4. La vraie boucle d'images, au doigt, sans pilote

20 s en temps réel (`requestAnimationFrame` actif, souris qui tourne dans l'arène) : états vus plongee, jeu, mort, reapparition ; `__ERR.count` = 0 ; messages d'erreur de la console : 0 ; appels de `__PILOT` = pas de `update` dans 4 états.

## Ce qui est fait, ce qui ne l'est pas

**Sous-tâche terminée** : les quatre demandes de `refonte/lots/demandes.md` § codex-02 sont dans les sources du jeu (crochet à chaque pas, vues `S.butin`, `S.vue`, `S.voies`, `S.vol`, `S.tele`, `S.player.pouvoir`, `S.ecran.niveaux`, pas réel des écrans à horloge arrêtée), plus `vx`/`vy` des ennemis (ajout non demandé, expliqué dans `demandes.md`). Les mesures ci-dessus sont celles du banc de ce lot.

**Palier non validé, chantier des pilotes non achevé.** Ce rapport ne remplace ni la revue du médiateur ni le banc de Codex :

- *Le banc de Codex n'a pas été relancé ici.* Les 80 parties de `tools/pilotes/parties.mjs` (10 graines × 8 pilotes) et leurs critères de fin sont à rejouer par Codex sur le nouveau bundle. Ce lot a seulement joué trois graines par pilote avec son propre banc (`tools/I/verifier.mjs`), dont la détection de blocage diffère un peu : état, temps de jeu, garde de l'état (`finT`) et `S.vol.reste` figés pendant 10 s simulées, là où le banc de Codex ne regarde que l'état, le temps de jeu, `S.ecran.depuis` et `S.vol.t` (ce dernier champ n'existe pas dans `S.vol`). Si un film dure plus de 10 s simulées, son détecteur pourrait encore parler de blocage : à vérifier chez lui.
- *Qualité des pilotes non évaluée.* Les parties vont jusqu'à `fin` sans erreur, rien de plus : aucune cible de `N.R.pilotes` n'est mesurée. Constat sans cause établie : dans ces essais le pilote « bon » meurt au mur lors de sa première mort sur la graine 1 (voir la colonne Morts) ; je n'ai pas cherché pourquoi.
- *Télégraphes incomplets* : ceux du CYCLOPE ne sont pas publiés (`73-colosse.js` n'est pas dans mes fichiers) ; ni ceux de la RUCHE (sa couvée ne blesse pas) ; un laser déjà tiré par la SENTINELLE n'est plus un télégraphe. Un pilote qui lit `S.tele` ne voit donc pas les attaques du CYCLOPE.
- *Palier IV (ULTIME) jamais proposé pendant les parties mesurées* : `S.ecran.niveaux` n'a été vu à 4 que par une sonde (le CANON déjà pris deux fois, main tirée jusqu'à ce qu'il y figure). Les paliers vus en partie vont jusqu'à 3.
- *Contrat de `niveaux`* : le jeu publie un dictionnaire `{idCarte: palier}` ; l'exemple de `tools/contrat/tests.js` écrit un tableau parallèle. Le schéma accepte les deux ; au gardien de figer l'un (demande écrite dans `demandes.md`).
- *Non mesuré* : le coût en temps par pas (`dbg()` n'est construit que si un `window.__PILOT` existe ; la publication de `S.tele` et de `vx`/`vy` n'a pas été chronométrée), les profils portrait et bureau, la musique et le dessin (la simulation ne dessine pas ; la section « boucle d'images » ne couvre que la plongée, le jeu, la mort et la réapparition pendant 20 s).
- *Hors de mes fichiers, constaté* : `tools/contrat/contrat.mjs` échoue avant comme après ce lot sur « N.spr.catalogue() couvre le catalogue figé » (sprites manquants : tete:dos, corps:7, corps:5, corps:3, corps:repli, chevron, vie, vieVide) ; le reste du contrat (35 essais du socle, palette, règles) passe à l'identique sur la version de base et sur le lot I. `tools/A/verifier.mjs` (60 s de jeu, boucle réelle, non déterministe) finit sans erreur sur les deux versions.

**Contrôle rejoué sur la tête de la branche** (18/10/2026 · 00 h 35, Paris) : après les commits d'autres agents arrivés depuis la mesure ci-dessus (bundle `b5b1c8e28651…` au commit `a2a74b1`), le banc complet hors comparaison à la base (états, hors-combat, niveaux, boucle réelle) et les pilotes « bon » et « expert » sur 3 graines ont donné les mêmes résultats : toutes les parties jusqu'à `fin`, zéro erreur, appels de `__PILOT` = pas de `update`. Les deux autres tableaux (comparaison à la version de base, huit pilotes) n'ont pas été refaits sur ce bundle.
