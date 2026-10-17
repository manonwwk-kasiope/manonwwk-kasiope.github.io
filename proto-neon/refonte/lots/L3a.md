# Lot 3a — La joueuse : rapport de livraison

*Agent du lot 3a, 17 octobre 2026, contre le contrat 1.0. Copie isolée `../wt/L3a`, branche `lot/L3a`.
Le lot livre le serpent (mouvement, accélération, les huit morts à la tête, la coupe, la réapparition, le
LASSO, la TRAVERSÉE, l'APOGÉE, ACTIONS AUTO, la séquence de désintégration), le butin (dont la PASTILLE) et
le CANON à quatre paliers. 82 critères mesurés sur la page d'essai, 82 tenus, zéro erreur.*

## Les fichiers livrés

| Fichier | Contenu |
|---|---|
| `src/70-joueuse.js` | **réécrit** : mouvement et virage proportionnel, accélération (poussée droit devant, second doigt, coupure en virage, réserve, panne franche, SILLAGE), mur avec grâce de 60 ms et tête retenue, morsure, coupe, mur mobile qui coupe le corps, `tuer`/`couper` avec invulnérabilité, TRAVERSÉE, BOUCLIER et ÉPERON, réapparition au point sûr, LASSO (traînée, deux fermetures, annonce, réarmement), TRAVERSÉE et RALENTI (repli), APOGÉE, ACTIONS AUTO, désintégration dessinée après le remappage, perles à volume et gaine, signes autour de la tête, souris au bureau ; RÉPARATION et BRAISE en avance du lot 3b |
| `src/71-butin.js` | **réécrit** : cellules, noyaux, PASTILLE ; aimant et vol à 220 px/s ; fusion ; expiration et clignotement ; allumage ; butin dépassé par le mur ; largages (ordinaire, larve, élite, ruche, LASSO, coupe) ; aspiration ; noyau et PASTILLE de repli dessinés à la main |
| `src/74-arsenal.js` | **réécrit pour le CANON** : I, II, III, RAYON (continu, efface les tirs), réserve de tirs sans allocation, silence de la tête, perte de palier à égalité « dernière montée », `_descente()` ; un cadre `ARMES[id]` où le lot 3b range les cinq autres |
| `tools/L3a/banc.mjs`, `harnais.js` | serveur, profils, capture du tampon d'index ; harnais qui gèle la boucle d'images et fait les pas un à un |
| `tools/L3a/criteres.mjs` | les critères [U] du lot, `node tools/L3a/criteres.mjs [--seulement …] [--rapide]` → `sortie/criteres.json`, `criteres.txt` |
| `tools/L3a/vitrine.mjs` | les captures (serpent, LASSO, mort image par image, coupe, APOGÉE, butin, TRAVERSÉE, réapparition, CANON ×4) et 30 s de jeu réel sur les 3 profils |
| `tools/L3a/allocations.mjs` | échantillonneur de tas (CDP) et tas après ramasse-miettes sur 60 s |

Hors du lot, vérifiés sur la page d'essai : `tools/contrat/contrat.mjs` (3 profils, 49 tests dont les 8 du
groupe `modules`, OK), `tools/jeu/etats.mjs` (OK), `tools/jeu/fumee.mjs` 60 s × 3 profils (0 erreur, avec le
TRAVELLING de V2).

## Les critères d'acceptation [U] (REFONTE.md § 8.3, LOT 3a)

| Critère | Seuil | Mesure |
|---|---|---|
| Commandes | J-02, J-03, J-05, J-06 | latence 1 pas ; quart de tour 258 ms ; dérive 0,000° sur 2 s doigt levé ; 0° sous la zone morte ; course 0,30 : 90° en 817 ms (courbe large) ; souris : cap au curseur à 0,4°, le clavier reprend la main |
| Accélération | 10/10 en 120 ms + 1 image ; slalom 60 s : 0 ; rayon 11 ± 1 ; coupure en 1 image ; ≤ 2 bascules ; un son de panne ; 95 % en 7 images | 10/10, au plus 125 ms ; 0 pas accéléré sur 7 200 ; rayon 11,00 (min 11,00, max 11,00) ; suspendue au pas suivant, retour à la croisière en 3 images ; 2 bascules (on, panne), 1 panne ; 95 % en 4,5 images ; reprise sous 15° sans son ; nouvel appui à 11,5 points : repart ; clavier à fond : jamais |
| Mort au mur | instant calculé ± 1 image, jamais au-delà de 3 px ; virage intérieur en 60 ms : 10/10 | 458,3 ms pour 457,1 calculés ; 0 pas au-delà de la limite ; 10/10 survies en rasant (incidences 2 à 7,9°) ; témoin sans réaction : mort |
| Morsure | segment ≥ 6 hors des 3 derniers, jamais avant ; ≤ 9 segments : jamais | segment 13 sur 30 ; 0 contact mordant survécu ; L 5, 8, 9 : vivantes après 30 s de cercle serré |
| Coupe | max(3, k) ; ⌊(L − k)/2⌋ cellules en 3 s | k 1 → 3, 4 → 4, 9 → 9, 16 → 16 ; 8/8, 8/8, 5/5, 2/2 ; présentes à 2,95 s, parties à 3,05 s ; le tir disparaît |
| LASSO | 6 cibles ; fermeture sur la queue ; corps ailleurs : mort ; < 300 px² : rien ; T = 1,2 + 0,02 L ± 1 image | 6/6, `kill`×6 puis `lasso` ; fermeture « queue » ; morsure ; 225 px² rien, 400 px² enferme ; 1,358 / 1,592 / 1,983 s pour 1,36 / 1,60 / 2,00 ; annonce à 14 px |
| LASSO bruité | ≥ 80 % de 50 graines à L = 8, 20, 40 | 50/50, 50/50, 50/50 (± 10° tiré toutes les 0,25 s, 120 ms de retard, guidage de `pilotes.md` § 4.1) |
| Réapparition | > 48 px de toute menace sur 200 morts ; 1,0 s ± 1 image, jamais contre le mur ; palier perdu et étiquette | 200/200 (au plus près 50,0 px), 200/200 à 40 px des murs ; séquence 1 308 ms ; invulnérabilité 1 008 ms ; un tir ne tue pas ; le mur tue avec 0,70 s d'invulnérabilité restante ; « CANON III → II » |
| Événements | `kill`, `coupe`, `mort`, `lasso`, `ramassage` une fois par occurrence, 10 min | 20 parties : 60/60 morts, 57/57 coupes, 11/11 lassos (0 pas à deux), 91/91 prises, 100 kills sans doublon |
| CANON | 4 paliers distincts ; DPS ± 10 % | 64,0 / 90,0 / 96,0 / 210,0 pour 65 / 90 / 96 / 210 ; dessin : 38 %, 43 %, 89 % de pixels d'arsenal changés d'un palier au suivant ; III perce (2 cibles en ligne touchées) ; RAYON : 0 tir traversé |
| Couleurs | cyan, cyan pâle, os, gaine ; tête et 2 segments au-dessus des effets ; tête en cyan | 0 pixel hors de ces encres sur 1 259 ; 92/92 pixels d'encre de la tête en cyan ou cyan pâle ; 453/453 de l'empreinte tête + 2 segments à la joueuse sous une explosion ; gaine sur 201/201 pixels de bord ; 0 pixel d'arsenal à moins de 3 px du contour |
| Plafonds | aucune allocation par image | tas après ramasse-miettes : 3 551 304 → 3 549 016 octets sur 60 s de jeu dessiné ; l'échantillonneur attribue ~20 octets par image au lot (nombres flottants en boîte de V8, des fonctions purement arithmétiques comme `d2` ou `wrapA` : du bruit) |
| Zéro erreur | 3 profils | 0 erreur et console vide : bancs, vitrine (3 × 30 s de jeu réel), contrat, états, fumée |

Mesurés en plus : TRAVERSÉE (tir à la tête et au corps traversés, mur mortel, 1,4 s puis 12 s), BOUCLIER (un
coup absorbé, `coup` absorbé émis, recharge à 20 s), jauge de l'APOGÉE (+2, +12, +20, +3 n, +2, 0 en
accélération), APOGÉE (6 anneaux à 90 ms de temps actif, 12 dégâts chacun, tirs effacés, monde à 0,25, gel),
ACTIONS AUTO (TRAVERSÉE avant le tir : survie, sans AUTO : mort ; APOGÉE à 8 ennemis en vue, pas à 7), butin
(aimant 28 → 48, 220 px/s, noyau +2 et +20, PASTILLE immobile et 12 s, fusion de valeur 3, mur qui avance,
largages 44,7 % et 19,9 % sur 2 000, élite 6 + 1).

## Les choix (à relire par le gardien)

1. **La poussée du pouce est relâchée, pas suspendue, quand le manche tourne de plus de 30°** depuis sa
   direction de départ : il faut de nouveau 120 ms dans l'axe. Sans cela, un pouce à pleine course reprend
   l'accélération à chaque fin de virage et le slalom du critère accélère presque tout le temps (7 167 pas sur
   7 200 au premier essai). Le second doigt et Espace gardent la suspension du § 2.2.
2. **Le clavier ne pousse jamais « droit devant »** : il donne toujours une course de 1. Il est reconnu à ses
   directions exactes (0, ± 1, ± 1/√2) ; voir la demande 5.
3. **Le CANON III tire 8 tirs/s, soit 4 salves de deux lances** (96 de DPS sur une cible). Lu comme 8 salves,
   il ferait 192 et l'ULTIME (210) ne vaudrait plus × 1,5 le palier III (critère du lot 3b).
4. **Le LASSO se réarme** : après une fermeture, la tête doit quitter le point de fermeture avant d'en refermer
   une autre. Sans cela, un cercle tenu sur sa queue « broie » tout ce qui entre, un lasso toutes les 0,8 s.
5. **La mort au mur** : la grâce sauve un contact rasant (le cap doit repasser à cos > 0,2 en 60 ms, soit 21°
   à 6,2 rad/s) ; un choc de face tue toujours, à l'instant calculé. Les 10 survies du critère sont mesurées
   en rasant le mur (2 à 7,9°).
6. **La désintégration est dessinée par `drawTop()`** (perles, anneaux, éclats, éclat final de la tête, anneau
   d'impact) : 90-boot.js ne redessine que `N.joueuse.drawTop()` après le remappage, donc `N.fx.desintegre`
   et `N.fx.boom` seraient éteints avec le monde. Un segment toutes les 2 images au plus, 0,73 s en tout.
7. **Les perles du corps sont dessinées par 70-joueuse** (9, 7, 5, 3 px, rangée de cyan pâle en haut, de nuit
   profonde en bas, gaine, reflet qui court, variante tramée de la TRAVERSÉE, gaine qui clignote en cyan pâle
   pendant l'invulnérabilité) : le § 2.5 les décrit au pixel et les sprites `corps` de la démo n'ont ni gaine
   ni volume. La tête reste le sprite `tete` ; s'il n'a pas de gaine, elle est ajoutée par dilatation.
8. **Les signes autour de la tête** (jauge, point du pouvoir, APOGÉE pleine, chevron) passent sous le cou et la
   tête : la gaine reste entière et rien ne touche le contour.
9. **Les anneaux de l'APOGÉE partent en temps réel** (90 ms) pendant que le monde est à 0,25 ; ils s'arrêtent
   seulement pendant les gels. Ils sont dessinés seulement sur leurs pixels (les grands débordent de la vue).
10. **Le SILLAGE est automatique** : × 1,4 sans geste et sans vider la réserve (`N.arene.sillage`, lot 5b).
11. **Les cellules d'une coupe tombent 0,35 s** avant de pouvoir être reprises (sinon l'aimant les rend dans
    le même pas pour une coupe près de la tête) ; elles expirent 3 s après la coupe.
12. **Le point de réapparition** est choisi parmi 16 candidats de la vue ; si aucun n'est à 48 px de toute
    menace (bord d'un ennemi, d'un tir, d'un télégraphe, d'une voie ; une mine compte pour son cercle de 34 px),
    on cherche dans toute l'arène (62 fois sur 200 dans le banc, très chargé).
13. **Le RAYON et les tirs naissent à 7 px** mais ne sont dessinés qu'au-delà de 9 px du centre de la tête
    (contour de 6 px + 3 px de silence) : le premier tiers d'image d'un tir est invisible.
14. **Le toast « UNE MAIN ? RÉGLAGES → ACTIONS AUTO »** part une fois par session (pas par profil, faute de
    champ persistant : demande 9).

## Ce qui n'est pas fait, et à qui

- **REPLI** (lot 3b) : le pouvoir s'équipe et se recharge, sans effet. **RALENTI** : en repli, le monde à 0,35
  la joueuse exemptée ; le balayage indigo et le passe-bas sont à 79-scene et 30-music.
- **GRAPPE**, les cinq autres armes, la fusion `salve` : lot 3b. RÉPARATION, BRAISE, ÉPERON et BOUCLIER sont
  écrits ici, à vérifier par le lot 3b.
- **Les ennemis figés 0,4 s à la réapparition** : il faut une action du propriétaire de 72-ennemis (demande 6).
- **Le battement de cœur et l'alerte du mur à 24 px** : le pan qui s'allume est au décor (lot 2) ; qui calcule
  `N.music.danger(v)` reste à trancher (demande 10).
- Vu dans les captures, hors du lot : `drawCause` (79-scene) et l'étiquette « −1 VIE » (78-hud) posent leur
  texte sur la tête pendant la mort ; à placer dans le tiers opposé.

## Demandes au gardien

| N° | Demande | Raison |
|---|---|---|
| 1 | Ajouter à `N.R` les valeurs locales marquées `// → N.R` : joueuse (`bouclierGrace` 0,5 s ; réapparition `grille` 4, `menaceMine` 34, `sur` 48 ; `ticFermable` 0,3 s ; rayons des signes 10, 11, 13, 8, chevron à 12 ; `desintegre` 0,73 s, `eclatTete` 0,4 s ; `braisePas` 0,25 s ; `sourisBouge` 2 px ; `lassoFlash` 0,3 s ; `petiteBoucle` 0,1 s), butin (`allumage` 0,12 s, `aspiration` 330 px/s, `fusionPas` 0,2 s, élan 20 à 60 px/s, `frein` 0,05, `margeMur` 3 px, `departLigne` 5, `gardeCoupe` 0,35 s), arsenal (`silence` 9, `toucheMarge` 1,5, paquets du RAYON 300 px/s tous les 13 px, `sonRayon` 7,5/s) | aucun chiffre en dur hors de `02-regles.js` |
| 2 | `ramassage.valeur` = **nombre d'unités** (1, ou la somme des cellules fusionnées) ; 75-cartes (XP) et 77-score (points, énergie) la multiplient | la fusion garde la valeur cumulée (§ 2.6) ; aujourd'hui seule 70-joueuse la lit |
| 3 | Écrire dans `CONTRAT.md` § 10.2 la forme de `N.joueuse.traine()` : `{n, x, y, age, duree}` (tableaux typés réutilisés, un point sur deux, âge depuis le passage de la queue) | le RIVAL (lot 4b) s'écrase sur la traînée de la joueuse |
| 4 | Préciser `N.R.armes.canon.paliers[2]` : `cadence` = tirs par seconde, deux lances par salve | choix 3 ci-dessus |
| 5 | `S.input.source` (`'doigt'`, `'clavier'`, `'souris'`, `'manette'`, `'pilote'`), écrit par 90-boot (lot 1) | la poussée droit devant est réservée au manche analogique ; l'heuristique actuelle reconnaît le clavier à ses directions exactes |
| 6 | `N.ennemis.figer(x, y, r, duree)` (72-ennemis), appelé par 79-jeu à la réapparition avec `effacerTirs` | « les ennemis à moins de 48 px sont figés 0,4 s » (§ 2.4) |
| 7 | Reporter dans REFONTE.md § 2.2 et 2.12 les choix 1 et 4 (pouce relâché au-delà de 30° ; LASSO réarmé) | les critères les supposent |
| 8 | Crochets privés publiés par le lot : `N.joueuse._detaches()` (lu par 71-butin), `_etiquette()`, `_etat()`, `_boucle(poly)` (bancs) ; `N.arsenal._descente()` (lu par 70-joueuse), `_rayon()` | règle des champs `_` : à connaître du gardien |
| 9 | Un champ persistant pour les aides vues une fois (`profil.gestesVus`) et son accès pour 78-hud et 70-joueuse | « 2ᵉ DOIGT : TOUCHE », « GLISSE = APOGÉE », « UNE MAIN ? » une fois par profil |
| 10 | Désigner l'écrivain de `N.music.danger(v)` (proposé : 79-scene, d'après `S.player`, `S.monde` et `S.tele`) | un seul écrivain, sinon les valeurs se battent |

## Comment rejouer les mesures

```
cd proto-neon && node build.mjs tools/L3a/index.html
node tools/L3a/criteres.mjs            # 82 critères, ~10 s
node tools/L3a/vitrine.mjs             # captures dans tools/L3a/sortie/, 30 s de jeu par profil
node tools/L3a/allocations.mjs         # tas et allocations
```
