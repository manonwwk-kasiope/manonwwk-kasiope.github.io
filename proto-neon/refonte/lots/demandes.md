# Demandes au gardien du contrat

Règle (REFONTE.md § 8.1) : un besoin nouveau s'écrit en UNE ligne, ici (lot, fichier, besoin, raison). Le gardien accepte ou
refuse, publie une version 1.1, 1.2… et l'orchestrateur reporte les fichiers du contrat dans toutes les copies.
On ne modifie jamais le fichier d'un autre lot.

| lot | fichier | besoin | raison |
|---|---|---|---|
| 0b | `60-intro.js` | `N.intro.demarrage()` / `titre()` / `plongee()` : dessin des états `demarrage`, `titre`, `plongee` ; `N.intro.fini(etat)` ; l'ouverture jouée par `N.game.update` (S.phase disparaît) | 79-jeu dessine des replis de ces trois états (« TOUCHE POUR COMMENCER », titre, plongée de 0,8 s) ; il appelle seulement transition('boss'|'victoire'|'defaite'), busy(), current(), update(), draw(), stop(), skip() |
| 0b | `90-boot.js` | appeler `N.ev.nouveauPas()` (déjà par `N.horloge.avancer()`), ne plus aiguiller sur `S.phase`, appeler `N.hud.draw()`, `N.ui.draw()` et `N.intro.draw()` après `N.gfx.origin(0,0)` | 79-jeu les dessine lui-même tant que `N.horloge.pas()` vaut 0 (ancienne boucle) |
| 0b | `10-gfx.js` | `N.gfx.origin`, `N.gfx.remap(lut)`, `N.gfx.owner` | 70-commun et 79-jeu appellent `origin` et `remap` quand ils existent ; sinon repli (origine nulle, remappage direct dans `buf()`) |
| 0b | `03-socle.js` | `SCH.player` : accepter `lives` et `invul` ? | refusé par moi : ces champs restent dans `N.score.vies` et `N.joueuse.invul()` ; aucune action |
| 0b | `03-socle.js` | accepter dans `N.ids.cartes` l'identifiant `cadence` du repli CARTES v0 (déjà présent) et signaler que les cartes `canon`, `croissance`, `cadence` du repli sont émises par 79-jeu en l'absence de `N.cartes` | un seul émetteur de `carte` : N.cartes ; le repli la remplace tant que 75-cartes.js manque |
| 0b | `72-ennemis.js` | le gros ennemi de la démo vit ici (type `cyclope`, boss, partie `oeil`) jusqu'à `73-colosse.js` | lot 5b : à retirer de 72-ennemis quand N.colosse existe |
| G | `03-socle.js` (`EVT`) | un consommateur `carte` au rang 60, nom `79-scene` (son `carte`/`choix` à l'ouverture de l'écran et au choix) | § 5.3 / lot 6a demandent `carte` à 79-scene, mais le tableau du § 7.4 ne le prévoit pas : N.scene n'inscrit donc rien sur `carte` |
| G | `79-jeu.js` | appeler `N.scene.drawCause()` AVANT `O.origine(0,0)` (déjà le cas) et ne plus dessiner `drawCause` de repli ; mesurer `etT` de la mort en temps RÉEL (`dt / N.fx.k()`) si un jour la séquence doit subir un vrai ralenti d'horloge | le ralenti à 0,25 de la mort est VISUEL (`N.fx.ralenti(…,{visuel:true})`, anneaux et éclats étirés, horloge de jeu intacte) pour garder les durées testées (réapparition 1,13 s, saut dès 0,5 s) ; un ralenti d'horloge allongerait `etT` sans que 79-jeu le compense |
| G | `79-jeu.js` / `90-boot.js` | appeler `N.fx.drawEcran()` après `N.gfx.origin(0,0)` (étape 7 du § 7.7) ; la boucle d'avant le lot 9 ne le fait pas : `N.fx.draw()` dessine alors vignette et glitch lui-même (repli, un peu sous l'interface) | vignette de danger, glitch du game over, explosions d'écran |
| G | `79-jeu.js` | les bandes WARNING du CYCLOPE (état `alerte`, § 4.8) n'ont pas de point d'appel dans `N.scene` (contrat : `reset`, `update`, `drawCause`) : ajouter `N.scene.drawEcran()` (bandes WARNING magenta et nuit profonde de 10 px) appelé après `N.hud.draw()` en état `alerte` | § 5.3 : « bandes WARNING (79-scene) » ; non fait faute de crochet |
| G | `72-ennemis.js` (lot 4a) | appeler `N.fx.tele(desc)` à chaque pas pour chaque attaque annoncée (schéma § 7.5, `par:{type,id}`, `reste`, `total`) puis retirer son `drawTele` ; tant que rien n'est enregistré par un type d'ennemi, `N.fx.drawTele()` rappelle `N.ennemis.drawTele()` (aucun avertissement ne disparaît) | § 4.4 : télégraphe en deux temps, gaine nuit profonde, rose pâle dans les 300 dernières ms |
| G | `72-ennemis.js`, `74-arsenal.js`, `70-joueuse.js` | demander les sprites par `N.spr.get(nom, dir, img)` : `fleche:armee`, `fleche:elite`, `dard`, `larve`, `traqueur`, `planeur`, `lame`/`lame:deployee`, `ruche:p0..p2`, `rival` (tête, 16 directions) et `perle`, `pastille`, `noyau`, `mini:<type>`, `vie5`, `tourelleJ`, `drone`, `missile`, `mineJ`, `orbe`, `colosse:tronc`… (catalogue : `N.spr.catalogue()`) | les noms existants (`make`) sont intacts ; les nouveaux ne sont lus par personne tant que les lots 4a/4b/3b ne les emploient pas |
| G | `00-pal.js` ou lot 9 | décision sur le critère « silhouettes IoU < 0,6 » (lot 6a) : sur des masques binaires CENTRÉS de sprites de 13 à 15 px, 19 paires de types dépassent 0,6 (mine/traqueur 0,86, mine/sentinelle 0,79, mine/rival 0,77) ; des formes compactes de même taille ne peuvent pas passer ce seuil sans changer le gabarit (tailles, creux, appendices) | mesure : `node tools/G/planche.mjs` (iou.json) |
| E | `79-jeu.js` | appeler `N.joueuse.apres(dt)` juste après `N.ennemis.update(dt)` (une fois par pas ; sans cet appel `71-butin.update`, qui passe juste après, le fait) | l'INVERSION déplace et dévore les proies après le mouvement propre des ennemis |
| E | `72-ennemis.js` | jouer l'état `proie` lui-même (lire `inv.t` posée par `inverser(dur)` : fuite à 0,8 × la vitesse de la tête, ni tir ni contact létal, dessin ardoise pleine / contour rose pâle / gaine de nuit profonde), émettre `inversion {debut\|fin}` et publier `N.ennemis.inversionActive()` | tant que la fonction manque, `70-joueuse` fait le repli (marque `e._proie`, pousse la position, pose `etat='proie'`, anneau rose pâle) ; dès qu'elle existe il se met en retrait |
| E | `77-score.js` | sur `kill` avec `src.type === 'devore'` : points fixes 200 / 400 / 800 / 1 600 (`N.R.f.devore(rang)`, TRAQUEUR 5 000), puis publier `N.score.devoreGere = true` ; consommer `lasso` (somme des bases × n × multiplicateur) | `70-joueuse` complète aujourd'hui le score dévoré par `N.score.ajouter` jusqu'à la valeur fixe (base × mult déjà compté par `kill`) tant que `devoreGere` est faux |
| E | `76-directeur.js` | appeler `N.butin.pastille()` (une par vague de V2 à V5, à +20 / +14 / +18 / +22 s ; jamais DÉFILÉ, VOL, CYCLOPE) et publier `N.dir.pastille = true` | `71-butin` la pose lui-même en repli (lit `N.dir.vague()` et `phase()`), sans doublon dès que le flag existe |
| E | `50-fx.js` | `N.fx.ralenti(k, dur, {joueuse:false})` | RALENTI (k 0,35) et APOGÉE (k 0,25) l'appellent seulement s'il existe ; sans lui, pas de ralenti du monde |
| E | `75-cartes.js` | pour une carte de pouvoir, appeler `N.joueuse.equiper(id)` ; lire `N.arsenal.armes()` / `niveau(id)` pour le texte des cartes d'arme ; l'XP : `71-butin` tient `N.butin.xp` ({total, niveau}) en repli et ne la dépense pas | le consommateur `ramassage` rang 30 est à `75-cartes` ; il ne doit pas la compter deux fois |
| E | `90-boot.js` | dans `frame()`, `N.gfx.origin(N.cam.x, N.cam.y)` (ou `N.outils.origineMonde()`) après `gfx.clear` et avant `game.draw`, puis `origin(0,0)` avant l'interface | dans cette copie la boucle ne pose pas l'origine caméra : les entités du monde (serpent, ennemis) sortent du tampon ; les essais de `tools/E/` dessinent avec `origineMonde()` |
| F | `90-boot.js` | corrigé par F (lot B l'avait étendu sans `pause`, `valider`, `retour`, `chiffre`, `car`, `pointer`, `manette`) : clavier → valider (Entrée, Espace), retour (Échap, Retour arrière), pause (P), chiffre (1 à 4), car (lettres) ; clic gauche de la souris → `S.input.taps` (doigt `action`) ; pas encore faits : lecture de `navigator.getGamepads()`, E / R et clic droit / milieu de la souris (pouvoir, APOGÉE), Espace tenue = boost | 79-jeu ne reçoit plus ses touches que par `S.input` depuis que `taps` existe : sans cela, aucune carte ne se choisissait au clavier |
| F | `CONTRAT.md` | publier les ajouts de `N.cartes` (`niveau()`, `choix()`, `pouvoir()`, `armes()`, `palierDe(id)`, `rarete(id)`, `ecrans()`, `vivier()`, `pris()`, `courante()`, `texte(id) -> {nom, l1, l2, tag, rarete, palier, prises, max}`), de `N.score` (`resume()`, `prochain()`, `terminer(victoire)`), de `N.ui` (`rect(i)`, `main()`, `icone(id, x, y, c)`) et `N.ui.ouvrir('cartes', {trophee, rareGarantie})` | 79-jeu peut passer `trophee: true` après le CYCLOPE et `rareGarantie: true` après un DÉFILÉ PARFAIT (§ 2.7) ; non appelé aujourd'hui |
| F | `70-joueuse.js` | CROISSANCE : le tableau du § 2.9 dit +4 segments et +5 au maximum ; `70-joueuse` applique `R.longueur.parCroissance` (5) tout de suite. Le texte de la carte (75-cartes) suit l'effet réel (+5) ; à trancher avec le gardien : +4 (`R.passifs.croissance.segments`) ou +5 | la leçon C8 : le texte égale l'effet mesuré (`tools/F/cartes.mjs`) |
| F | `79-jeu.js` | `S.paused` à la reprise : le toucher de reprise passe aussi par `S.input.taps` ; un toucher commencé avant l'ouverture d'un écran n'est écarté que par la garde (0,4 s des cartes, 0,45 s de la fin), car `ramasserTaps` ne transmet pas `t0` des taps | § 2.7 : « un toucher n'est accepté que s'il commence après l'ouverture » : transmettre `t0` dans `N.outils.taps` pour l'exiger exactement |
| F | `76-directeur.js` / `70-joueuse.js` | pas d'événement `lasso` par ennemi ni de statistique « LASSO MAX » / « % de destructions au lasso » : le build LASSO (§ 5.6) n'est pas reconnu, le nom vient des armes | 77-score compte les `lasso` émis (n) : à brancher |

| 5a | `70-joueuse.js` | un multiplicateur de vitesse externe (ex. `N.joueuse.mulVitesse` lu dans `update`, ou `vitesseMul(k)`) pour le SILLAGE ×1,4 sans vider la réserve (§ 4.6) | `73-arene.js` n’a aucun point d’accroche : il pousse la tête de (1,4 − 1) × vitesse × dt le long du cap quand c’est sûr (plus de 8 px des murs) ; à retirer dès que le multiplicateur existe |
| 5a | `76-directeur.js` / `72-ennemis.js` | faire naître les ennemis devant le mur arrière en lisant `N.arene.murArriere()` -> `{x, sens, actif, y0, y1}` ou `null` (§ 3.8, « les apparitions naissent devant le mur arrière ») | `73-arene.js` publie la position du mur arrière (finale avant le départ, courante ensuite) ; sans lecture, les naissances ignorent le plateau qui voyage |
| D | `70-joueuse.js` | ne pas tuer au contact un ennemi dont `etat === 'proie'` (INVERSION) ni un `planeur` ; seul 72-ennemis les dévore avant le contact (rayon 3 + r + 4 contre 3 + 0,8 r) | sans cela la dévoration ne tient que parce que 72-ennemis passe après la joueuse dans le pas de jeu |
| D | `79-jeu.js` | tenir `N.dir.lancerBoss()` pour seul démarreur du combat (il appelle `N.arene.nettoyee()` puis `N.colosse.start()`) ; ne plus appeler le cyclope de repli | le repli du cyclope est retiré de 72-ennemis |
| D | `79-jeu.js` | poser `O.origineMonde()` avant `N.ennemis.draw()` dans `draw()` (72-ennemis le fait lui-même en attendant) | l'origine de dessin n'est posée nulle part avant les ennemis dans la passe actuelle |

## Demande du pilote (17 octobre, soir) — tempo réel de la piste
Mesuré par la préparation musicale (tools/musique/LISEZMOI.md) : la piste de la propriétaire est à
**114,995 BPM** (mesure de 2,08705 s), pas 144,6. 02-regles.js (BPM et table musique), l'horloge du
CONTRAT et les numéros de mesures des sections (alerte à la mesure 56, boucle du boss 107-122) sont à
corriger à l'intégration A, avant tout réglage.

## Demande du cloud (17 octobre, nuit) — brancher les intermèdes
Les six mini-films 8 bits d'intermède sont livrés : `cine/{chasse,retournement,rival,plongee,reveil,apotheose}.mp4`
(384 x 216, 12 i/s) et leurs panneaux de repli `art/<nom>.png` ; `05-art.js` les connaît (table CLIPS).
Reste à les appeler depuis `79-jeu.js` (par `N.intro.transition` de `60-intro.js`) aux moments de
`refonte/INTERMEDES.md` : jeu figé pendant le film, un toucher le passe (garde de 300 ms), 6 s au plus,
jamais deux fois le même dans une partie.

## codex-02 — dépendances du contrat constatées sur la branche

| lot | fichier | besoin | raison |
|---|---|---|---|
| codex-02 | `79-jeu.js` | appeler le pilote au début de **chaque** pas, y compris cartes/VOL/mort/plongée, avant `ramasserTaps` ; le hook actuel est limité à JOUE | sans appel sur cartes le pilote ne peut choisir, et ses entrées combat restent actives pendant le VOL ; le banc ne doit pas piloter à sa place |
| codex-02 | producteurs `71-butin.js`, `12-cam.js`, `73-arene.js`, `17-vol.js`, `72-ennemis.js` / `50-fx.js` | publier les vues contractuelles `S.butin`, `S.vue`, `S.voies`, `S.vol` et les télégraphes vivants dans `S.tele` | ces champs sont absents ou vides sur la branche ; impossible d’appliquer les attractions, les règles de vue/VOL et les dangers annoncés en ne lisant que S |
| codex-02 | `03-socle.js`, `70-joueuse.js`, `80-ecrans.js` | accepter et publier `S.player.pouvoir` et `S.ecran.niveaux` selon la spécification des pilotes ; préciser si niveaux est indexé par carte | la spécification les exige mais les schémas et les producteurs actuels les omettent ; pas d’accès privé de contournement dans le pilote |
| codex-02 | `79-jeu.js` / banc | préciser l’avancement des écrans à horloge arrêtée en simulation : `dbg.simuler` passe dt=0 aux cartes/panneaux | le jeu simulé doit laisser passer les séquences sans `valider` ni saut ; les écrans ont besoin du pas réel pour leurs gardes et films |

**Réponse du lot I (Claude Mac, cheffe d'orchestre, 18 octobre).** Les quatre demandes sont faites dans les sources du jeu, sans rien changer à `85-pilote.js` ; la preuve est dans `tools/I/rapport.md` (rejouable : `node tools/I/verifier.mjs`).

1. **Crochet** (`79-jeu.js`) : `window.__PILOT` est appelé au début de **chaque** pas de `update`, dans tous les états, avant `ramasserTaps()` (le cliché `dbg()` passé en argument ne sert qu'aux anciens bancs de `tools/jeu` ; s'il ne peut pas être construit, le pilote est appelé quand même).
2. **Vues du contrat**, republiées à chaque pas par leur producteur :
   - `S.butin` = `N.butin.list` (71), la liste vivante, objets au schéma `butin` ;
   - `S.vue` = `{x, y, w, h}` de la caméra en coordonnées monde, un objet réutilisé (12) ;
   - `S.voies` = la liste de `N.arene.voies()`, objets au schéma `voie`, vide hors convoi (73) ;
   - `S.vol` = **null hors du VOL**, sinon `{tete:{x,y}, objets:[{type:'cellule'|'porte'|'mine', x, y, z, r, avant}], reste}` (17). Seuls les objets en vol et déjà visibles (rayon projeté ≥ 1) y sont. `x`, `y` = l'endroit où l'objet croisera la tête, dans le repère de `tete` (celui où la tête se déplace), pas sa position projetée sur l'écran ; `z` = profondeur actuelle ; `r` = rayon dans le plan de la tête ; `avant` = secondes avant le croisement ; `reste` = secondes qui restent au VOL. Nouveau schéma `vol` dans `03-socle.js` (conforme à l'exemple de `tools/contrat/tests.js`) ;
   - `S.tele` (72) : un objet au schéma `tele` par attaque armée, **à l'endroit des dégâts** (FLÈCHE : ligne de 67 px ; DARD : ligne de 82 px (et non le losange de `arme`) ; LARVE : disque de 12 px sur la queue, cible `corps` ; MINE : disque de son souffle ; TOURELLE : ligne de sa portée ; SENTINELLE : ligne de 300 px ; LAME : ligne de 190 px depuis son point de recul ; RIVAL : losange du coupe-route ; mèche d'un INSTABLE : disque de souffle). `r` est le rayon qui tue **sans** la tête (0,8 × le rayon de l'ennemi), la marge de 4 px du pilote la rajoute ; `reste` va de `total` à 0 ; `par` = `{type, id}` de l'ennemi.
3. **`S.player.pouvoir`** (70) = l'identifiant du pouvoir équipé, toujours présent (TRAVERSÉE au départ), republié à chaque changement. **`S.ecran.niveaux`** (80, schéma de `03-socle.js`).
   **Décision sur `niveaux` : c'est un dictionnaire indexé par identifiant de carte** `{ idCarte: palier que la carte donnerait si on la prenait }`, de 1 à 4, 4 = l'ULTIME d'une arme (valeur de `N.cartes.texte(id).palier`) ; `{}` hors de l'écran des cartes. C'est la forme que lit `85-pilote.js` (`S.ecran.niveaux[idCarte]`) et que son essai prévoit (`niveaux: {arc: 4}`), et `pilotes.md` § 4.4 dit « une carte d'arme dont `niveaux` vaut 4 ». **Écart à régler par le gardien** : l'exemple de `tools/contrat/tests.js` écrit un tableau parallèle à `cartes` (`niveaux: [3, 1, 1]`). Le schéma accepte les deux formes pour que cet essai passe, mais le jeu publie le dictionnaire ; à toi de figer l'une des deux dans le contrat (je recommande le dictionnaire : le pilote ne change pas, et un rang de carte peut changer de place dans la main).
4. **Simulation** (`dbg.simuler`, 79) : quand la boucle au pas fixe est lancée (`N.horloge.pas() > 0`) et que l'horloge est arrêtée par l'état (cartes, panneaux, films, fin), `update` reçoit le pas réel `h` au lieu de 0, comme la boucle de `90-boot.js` qui leur donne `S.dt`. Le temps de jeu `N.horloge.t()` n'avance toujours pas dans ces états ; les gardes (0,45 s des cartes) et les films avancent seuls, sans `valider` ni saut.

**Ajout non demandé** : `vx`, `vy` des ennemis (72) valent maintenant leur vitesse observée en px/s (déplacement entre deux mises à jour, un saut de plus de 600 px/s compte pour 0) ; ils restaient à 0, et le pilote prédit « déplacé de (vx, vy) × t ». Personne d'autre dans le jeu ne les lit.

**Non fait, hors de mes fichiers** : les télégraphes du CYCLOPE (`73-colosse.js` dessine les siens et ne les publie pas) ; la RUCHE n'en publie pas (sa couvée ne blesse pas) ; un laser déjà tiré par la SENTINELLE (0,35 s) n'est plus un télégraphe. `N.fx.tele` n'est appelé par personne : le dessin des télégraphes reste celui de `72-ennemis.js` (`drawTele`).

## Demande du cloud (18 octobre, 00 h 40) — brancher l'époque 1976 (`src/68-terminal.js`)
Livré : `N.terminal`, l'époque 1976 (refonte/VISION-PROGRESSION.md § 1), autonome, essayée par
`tools/terminal/` (page d'essai : `node build.mjs tools/terminal/index.html`). À brancher par qui tient `79-jeu.js` :
1. au lancement d'une partie, AVANT la plongée : `N.terminal.start({ surFin: function () { aller('plongee'); } })` et
   un état de jeu (par exemple `terminal`, à ajouter à `N.ids.etats` avec horloge « avance », section « intro ») ;
2. tant que `N.terminal.actif()` : `update(dt)` appelle `N.terminal.update(dt)` et rien d'autre ; `draw()` appelle
   `N.terminal.draw()` ; `drawTop()` ne dessine rien (ni HUD, ni score du jeu) — c'est ce que fait la page d'essai ;
3. la piste principale se tait pendant l'époque (la musique de 1976 est jouée par le module sur
   `N.music.context()`), et reprend à la fin de la fissure (`surFin`) ;
4. pour qui l'a déjà finie (profil), proposer de la passer (toucher long sur l'écran-titre, ou `N.terminal.skip()`
   qui saute à la fissure — on ne saute jamais la fissure elle-même : c'est la révélation).
Mesuré : partie complète au pilote en 21 s (6 cellules, une mort qui garde la menace, fissure), zéro erreur ;
deux couleurs (vide, cyan) jusqu'à la menace 2, les autres n'apparaissent que comme menaces voulues.

## Demande du cloud (18 octobre, 01 h 20) — brancher le WARP (`src/78-warp.js`)
Livré : `N.warp` (vision § 2), autonome, essayé par `tools/warp/` (banc : facteur effectif 0,152 au creux du warp,
14 verrous en 4 warps, bombe 17 tués, laser 7, missile 1, mine 1 ; trois profils, zéro erreur). Branchement :
1. à chaque image, avant le monde : `N.warp.update(dtRéel)`, puis `dt × N.warp.facteur()` pour `N.game.update`,
   `N.fx.update` et la caméra ; l'interface et la musique gardent le dt réel (pris avant le gel de frappe) ;
2. `N.warp.draw('monde')` après `N.game.draw` (avant `N.fx.draw`), `N.warp.draw('dessus')` après `N.game.drawTop` ;
3. `N.warp.declencher('jauge' | 'pickup' | 'escadrille')` au moment choisi (l'annonce d'escadrille 1 s avant
   revient au directeur) ;
4. tant que `N.warp.capte()`, 70-joueuse ignore boost, pouvoir et APOGÉE (sinon le second doigt les déclenche aussi) ;
5. `N.warp.reset()` à chaque partie et à chaque vague forcée ; 6. musique en demi-temps pendant `N.warp.actif()` ;
7. dans 90-boot : publier `S.input.action = { actif, x, y }` (le second doigt), pour guider la lunette au doigt.
Dépend de l'horloge à pas fixe (codex-05) pour un vrai ralenti du monde.

## codex-08 — remise en état du banc (18/10/2026 · 00 h 36, Paris)

| lot | fichier | besoin | raison / preuve |
|---|---|---|---|
| codex-08 | `src/79-jeu.js:162` / contrat de départ | prendre en charge `reset(graine, {depart:'plongee'})` ou faire préciser officiellement le départ public prévu | `reset` fait `aller('demarrage')` et ne lit que `opts.direct` à la ligne 172 ; `tools/mesure/verification/statique.json` reproduit `demarrage` en VM avec les sources réelles. Le banc garde « non mesurable », sans appeler lancer, changer direct ni simuler des validations. |
| codex-08 | `src/79-jeu.js:690` | livrer les scènes contractuelles `charge`, `v5`, `lasso6`, `inversion`, `convoi`, `travelling` | les six appels publics rendent false (preuve VM dans `verification/statique.json`) ; aucun alias vers une autre scène dans le banc. Dépendances notamment R-02/03/12/13/20/28/37. |
| codex-08 | `src/79-jeu.js:692` | publier le vrai masque de propriété de la dernière image par `dbg.masque()` | le code rend systématiquement un `new Uint8Array` vide ; en paysage VM : 82 290 codes tous à zéro. Le banc déclare le masque indisponible, sans inventer les propriétaires ni conclure sur le cyan. |
| codex-08 | `src/79-jeu.js:661` / `src/90-boot.js:339` | brancher le pas fixe et les horodatages réels dans la simulation et la boucle, sans correction du temps par le banc | après `dbg.scene('calme')` et `dbg.simuler(N.R.temps.imageRef)` : état jeu mais `N.horloge.t()` et `pas()` restent à zéro en VM ; `N.journal` lit cette horloge (`03-socle.js:658`). Le test navigateur des horloges reste à vérifier. |
| codex-08 | `REFONTE.md:2893` (R-05) / `src/02-regles.js:100` | arbitrer la référence « huit causes de mort » face à la morsure qui coupe ; conserver l’invariant propriétaire | `70-joueuse.js:354` ne tue naturellement par morsure que si effet='mort', tandis que N.R impose 'coupe'. Les pilotes ne peuvent satisfaire naturellement la huitième cause ; le seuil du banc n’est pas abaissé et aucune mort artificielle n’est fabriquée. |
| codex-08 | environnement d’exécution Playwright | relancer le banc et ses mutations dans une session autorisée à écouter sur localhost et à lancer Chromium | serveur : `listen EPERM` sur port libre ; Chromium : `bootstrap_check_in … Permission denied (1100)`. Commandes prêtes : `node tools/mesure/verifier.mjs`, puis `node tools/mesure/lancer.mjs --rapide --parallele 1`. Aucun résultat navigateur revendiqué. |

## codex-p1b — construction : passifs et contrôle (18/10/2026 · 00 h 54, Paris)

| lot | fichier | besoin | raison |
|---|---|---|---|
| codex-p1b | `03-socle.js` | ajouter `onde`, `sillage` à `N.ids.armes` ; `perforation`, `surtension`, `epines` à `N.ids.passifs` ; les cinq à la liste dérivée `cartes`, noms ONDE DE CHOC / SILLAGE / PERFORATION / SURTENSION / ÉPINES | registre profondément gelé, hors propriété du lot ; les cartes restent volontairement inéligibles tant que le registre est absent ; `85-pilote.js` intact |
| codex-p1b | `03-socle.js` | source `arme/epines` dans `SRC_TYPES.arme`, `onde` et `sillage` venant de L.armes ; compléter `SCH.mods` avec perforation/surtension/epines entiers de 0 à 3 | schémas de sources et de mods cohérents ; `tools/codex-p1b/registre-attendu.mjs` ne simule que les déclarations manquantes, en mémoire, jamais leur intégration effective |
| codex-p1b | `72-ennemis.js:effacerTirs` | rendre le nombre de tirs vivants effectivement effacés, sans changer l'effet existant | ONDE II efface déjà par l'API publique ; la conversion en cellules ne fonctionne que sur ce reçu numérique, actuellement absent. Aucun accès aux champs privés ni comptage inventé. `74-arsenal` accumule ensuite 0,35 cellule par tir et lâche la partie entière |
| codex-p1b | `79-jeu.js:dbg.masque()` | rendre le vrai masque de la dernière image, avec propriétaires de chaque couche | le masque actuel est tout nul ; le script Playwright refuse de conclure « cyan hors joueuse = 0 » sans masque. Même dépendance que le lot codex-08 |
| codex-p1b | `CONTRAT.md` | documenter les lectures `arsenal.etat().sillage`, `ondeDans`, `freins`, `onde` ; `cartes.texte().prerequis` et `.appelle`, mods perforation/surtension/epines | interfaces publiques de diagnostic et d'affinité, sans exposition de structures internes modifiables |
| codex-p1b | `80-ecrans.js` | facultatif : afficher `.appelle` / `.prerequis` des textes de carte | les prérequis filtrent réellement le vivier et les appels influencent le tirage ; leur métadonnée est prête, mais aucune modification hors du périmètre autorisé |
| codex-p1b | `02-regles.js` | ajout ONDE : départ 1,2 s ; période 2 mesures (grille existante), télégraphe 0,4 s ; rayons 28/36/44/56 px ; dégâts 7/9/11/20, facteur au bord 0,45 ; poussées 28/32/36/42 px, facteur au bord 0,4 ; ralentis III/IV ×0,6 pendant 0,6/0,8 s ; aura ultime rayon 16 px, 25 DPS ; conversion 0,35 | A7 et proposition 2975 §12 de l'inventaire : adapter les unités du contrôle au tampon, conserver des dégâts modestes, des tirs effacés au II, un ralentissement au III et une aura au IV ; dégâts mesurés, équilibrage non qualifié |
| codex-p1b | `02-regles.js` | dessin ONDE : départ 3 px, durée 0,28 s, épaisseur de budget 1 px, Bayer 0,5 | anneau fin ambre/os, aucun aplat ajouté ; admission par le vrai `N.fx.flashGate` avant visibilité de l'onde |
| codex-p1b | `02-regles.js` | ajout SILLAGE : 192 points au plus, espacement 2 px, coupure après saut >32 px ; durées 0,9/1,5/1,9/2,4 s ; rayons de contact 1/2/2/3 px ; 18,75/28,57/41,67/63,64 DPS ; ralenti III/IV ×0,78/0,72 pendant 0,2 s ; IV efface les tirs ; Bayer 0,5 | reprendre A3 sur quatre paliers, dégâts continus équivalents aux anciens tics, contact local de queue ; une touche par ennemi et par pas, mémoire bornée ; le LASSO existant reste autonome |
| codex-p1b | `02-regles.js` | PERFORATION : 3 prises, +1 cible par prise ; prérequis CANON II OU TOURELLES II | inventaire axe tireur ; mémoire des cibles traversées propre au projectile pour éviter de refrapper la même cible sur plusieurs pas ; projectiles non explosifs seulement |
| codex-p1b | `02-regles.js` | SURTENSION : 3 prises, +1 saut et +15 % de portée par prise ; prérequis ARC I | comportement fidèle de l'axe électrique de l'inventaire, sans nouvelle aura cachée |
| codex-p1b | `02-regles.js` | ÉPINES : 3 prises, 18/30/42 DPS, pointe tous les 3 segments de longueur 2 px ; retour ambre 0,2 s | rendre le contact du corps dangereux sans reprendre les 540–2 270 DPS de 2030 ; pas de dégâts à la tête, aucune protection accordée, aucun effet pendant TRAVERSÉE ; équilibre à revoir sur iPhone |
| codex-p1b | `02-regles.js` | contrôle public : saut non ralenti >32 px, marge de poussée au mur 1 px ; mods initiaux à 0 | ne pas annuler les téléportations ni pousser un ennemi dans le mur ; le frein garde seulement ses propres copies des coordonnées publiques, expire et se vide au reset/mort |
| codex-p1b | `02-regles.js` | nouvelles cartes : armes 4 prises ; passifs 3 prises ; familles existantes, raretés arme héritées de `rareteArme`, PERFORATION/ÉPINES rares, SURTENSION commune ; poids d'appel ×1,5 | liste fermée de cinq nouvelles cartes ; liaison canon/tourelles ↔ perforation, arc ↔ surtension, onde ↔ épines, sillage ↔ braise ; mêmes plafonds d'armes et pitié que l'existant, aucun ultime à prérequis supplémentaire caché |

Les preuves de logique avec registre anticipé sont explicitement conditionnelles (`tools/codex-p1b/vm-registre-anticipe.json`). Les sources du registre et de la joueuse ne sont pas modifiées ; aucun correctif `70-joueuse.js` n'est nécessaire à ce lot.

## codex-06 — cartes et passifs (18 octobre 2026)

| lot | fichier | besoin | raison |
|---|---|---|---|
| codex-06 | `70-joueuse.js` | intégrer `tools/codex-06/raccord-joueuse.patch` : appeler `N.arsenal.percuter(e)` avant la mort par contact, débiter `N.R.passifs.eperon.cout` seulement si elle renvoie true ; tester `N.cartes.repitActif(cause)` avant la coupe, puis `N.cartes.apresCoupe()` seulement après perte réelle | les collisions emploient des fonctions internes et précèdent `arsenal.update` ; impossible d'intercepter proprement ces opérations depuis les deux fichiers autorisés. Le patch est livré mais le fichier de la joueuse est laissé intact |
| codex-06 | `02-regles.js` | ajout `passifs.effets.grappe` : fileMax=64, explosionsParPas=2, touchesParPas=24 ; ondeDepart=2 px, ondeDuree=0,28 s, ondeEpaisseur=1 px | limiter mémoire, travail et événements ; différer la cascade au lieu d'une récursion ; anneau rose fin sous le limiteur global, sans nouveau flash plein écran. Les 2 générations et les dégâts/rayons sont ceux déjà présents dans N.R |
| codex-06 | `02-regles.js` | ajout `passifs.effets.braise` : pointsMax=192, pas=2 px, largeur=1 px, sautMax=32 px, intensite=0,5 | borner le parcours de collision ; déposer la traînée à la queue, effacer les points après une téléportation, dessin ambre au Bayer stable. DPS=20 et prolongation=0,4 s restent ceux de N.R |
| codex-06 | `02-regles.js` | ajout `passifs.effets.repit.duree=0,9 s` | équivalent du répit de base de l'inventaire AMORTISSEURS, commun à toutes les coupes ; aucun nouvel identifiant de carte non enregistré. Le mur reste hors protection ; raccord de la joueuse indispensable |
| codex-06 | `CONTRAT.md` | publier `N.arsenal.percuter(e)->bool` et les champs de lecture `etat().grappes`, `grappeSaturee`, `braises` ; `N.cartes.apresCoupe()` et `repitActif(cause)->bool` | interfaces publiques pour le propriétaire des collisions et pour les mesures ; aucun accès ajouté à un champ privé d'un autre module |
| codex-06 | `03-socle.js`, `72-ennemis.js` | autoriser une source de contact dédiée BRAISE et transmettre la génération GRAPPE au champ `kill.gen` | la traînée utilise provisoirement la source de contact joueuse/tete déjà valide ; les générations sont bornées dans l'arsenal mais `72-ennemis` émet toujours gen=0. Aucun champ privé ni charge d'événement d'un autre propriétaire n'est modifié |
| codex-06 | `03-socle.js` | enregistrer noms/identifiants/schémas de PERFORATION, SURTENSION, ÉPINES avant un lot ultérieur qui les ajoute au vivier | les listes N.ids et leurs schémas sont profondément gelés ; ne pas introduire de cartes choisissables qui échoueraient à la validation du bus. Optionnels laissés hors de ce lot |
| codex-06 | `79-jeu.js` (coordination avec codex-02) | appeler le pilote hors des seuls états JOUE, notamment sur CARTES | le pilote bon est bloqué sur CARTES avant comme après pour les graines 2975/2030 en paysage et bureau ; reçus `tools/codex-06/{avant,apres}-etat.json`. Les essais d'endurance signalent explicitement leur reprise supervisée ; ils ne prouvent pas le parcours autonome |

## Demande du cloud (18 octobre, 01 h 45) — brancher l'écran de choix (`src/62-choix.js`)
Livré : `N.choix` (vision § 6), autonome, essayé par `tools/choix/` (40 vérifications sur 40, trois profils, zéro
erreur ; dessin p95 ≤ 3,3 ms ; garde de 300 ms vérifiée ; profil `snake2975.pilotes` par `N.outils.store`).
1. un état `choix` après l'ouverture (« TOUCHE POUR JOUER »), avant l'époque 1976 :
   `N.choix.start({ surFin: function (qui) { /* étape suivante */ } })`, puis `update` / `draw` à la place du jeu
   tant que `N.choix.actif()` (modèle : `tools/choix/panneau.html`) ;
2. tout film propre au personnage passe par `N.art.pour(base)` (déjà fait dans `60-intro.js` pour les intermèdes) ;
3. à la fin de la partie gagnée : `N.choix.marquerFini(N.choix.personnage())` ; si `N.choix.lesDeuxFinis()`,
   enchaîner `retrouvailles` puis `teaser-3019` (le module `64-aventure.js`, en cours, s'en chargera).

## Demande du cloud (18 octobre, 02 h 00) — brancher l'époque 1982 (`src/69-arcade.js`)
Livré : `N.arcade` (vision § 1), autonome, essayé par `tools/arcade/` (`?pilote=1`, touche N : passage) ; partie
complète au pilote en 55 à 57 s sur les trois profils, zéro erreur, 4 couleurs en jeu. Continuité avec 1976 (le
cadre se déroule en corde et devient le serpent), envahisseurs, flèches, soucoupe, cellule d'or (tir triple),
musique 3 voix en la mineur, 132 → 152 → 168 BPM ; passage vers 1987 (palette qui s'ouvre, pixels qui s'affinent).
1. dans le `surFin` de `N.terminal` : `N.arcade.start({ graine: seed, surFin: function () { /* plongée */ } })` ;
   un état `arcade` dans `N.ids.etats` (horloge « avance ») ;
2. tant que `N.arcade.actif()` : `update` → `N.arcade.update(dt)` seul, `draw` → `N.arcade.draw()`, `drawTop` rien ;
3. la piste principale se tait pendant 1976 et 1982, Neon Velocity reprend au `surFin` de l'arcade ;
4. `N.arcade.skip()` pour qui l'a déjà finie (saute au passage, jamais par-dessus).
À régler : le texte « TIR TRIPLE » passe sur le serpent (le placer hors de la tête).


## codex-05 — dépendances constatées dans la vraie boucle (18/10/2026 · 00 h 55 Paris)

La boucle à pas fixe est branchée dans 90-boot : titre sur trois profils, conservation des impulsions sur une image sans pas, deux/quatre pas par image, zéro erreur au précontrôle. Les écarts suivants sont hors de ma réservation :

- `src/50-fx.js`, `ralenti()`, ligne 857 : plafond inconditionnel `dur > 3` ; la carte RALENTI demande bien k=0,35 et 3,5 s (70-joueuse/02-regles), mais les pas réels de frame n'en ralentissent que **3,00 s**. Demande : respecter la durée officielle du pouvoir (sans diminuer N.R).
- `src/79-scene.js`, `onPhase()` : ne réagit pas à `evt:'arrivee'` de 73-colosse (`start`, ligne 280). Demande : déclencher R.scene.cyclope.ralenti / duree (0,3 / 2,2 s). Le banc observe **zéro pas ralenti** après `dbg.boss()`. 73-colosse précise que cette mise en scène appartient à 79-scene.
- `src/79-jeu.js`, `ecranVieux()` lignes 623–625 : l'indicateur et les transitions de pause automatique de l'application sont seulement dans le chemin ancien. Nouveau chemin : S.paused gèle le monde, mais aucune UI de pause ne s'ouvre. Demande : exposer/gérer la pause automatique dans update ou une méthode publique, en conservant le panneau courant (notamment cartes ; ne pas refaire une main). 90-boot continue de geler/reprendre les pas selon S.paused.
- `src/60-intro.js` : les journaux privés d'ouverture utilisent encore `S.t / 1000` alors que S.t est désormais en secondes selon contrat. La longue ouverture historique n'est plus lancée en parallèle du titre 80-ecrans. À corriger lors de l'intégration des époques si ces journaux servent encore.

Preuve de précontrôle : `tools/horloge/banc.mjs`, mode ralentis (avant/après distincts, reçus à livrer) ; aucun seuil retouché. Montée de niveau : un premier essai à k=0,15 a duré 0,35 s ; le banc final provoque désormais la montée par N.cartes.xp (pas d'événement niveau injecté). Pas d'ajout d'un ralenti de secours dans le boot.

- Régression ancien banc 01, premier passage APRÈS : les **neuf cas** passent les quatre plafonds/minimums couleur, sans erreur. Les neuf empreintes `horsJeu` diffèrent : ce contrôle compare des scènes qui ont évolué sous deux boucles temporelles différentes, pas le même contexte à un état forcé différent. Je garde le verdict brut en échec ; faut-il remplacer ce contrôle de non-régression d'une retouche de palette par un rendu apparié du même contexte pour le chantier horloge ? Aucun seuil du banc n'a été changé. Les trois deltas p95 sont aussi hors borne (+0,90 / +0,60 / +0,60 ms) pendant des bancs d'autres sessions (`mesure/lancer`, lot H). La comparaison dédiée V4 donne +0,10 ms ; ce n'est pas une preuve au repos. Un second passage apparié au repos est nécessaire avant verdict performance.

- **Correction du diagnostic écran de fin (00 h 59)** : la documentation de 60-intro précise que victoire/défaite sont un FOND permanent, pas un film qui doit disparaître. Le défaut d'ordre de dessin était dans mon boot : fond dessiné après le bilan, et révélation auto basée sur S.dtMonde=0. Corrigé dans 90-boot : fond avant l'UI, temps d'interface H explicite pour sa révélation. Aucun saut, aucun effacement de fond ni modification hors réservation. Contrôle ciblé `--mode fin` sur les trois profils ; journaux des parties déjà terminées conservés. La demande à 79-jeu sur ce point est retirée ; les autres dépendances restent.

## Demande du cloud (18 octobre, 02 h 30) — LE branchement qui relie tout : `N.aventure` (`src/64-aventure.js`)
Livré : `N.aventure` (le déroulé de l'aventure, liste déclarative d'étapes) et `N.film` (lecteur de film plein écran,
repli sur panneau fixe, légende tapée, saut après 300 ms). Banc `tools/aventure/` : trois profils, zéro erreur ;
ELLE : 7 films (connexion → … → fin-elle → « LE PILOTE T'ATTEND ») ; puis LUI : 9 films jusqu'aux retrouvailles,
au teaser « SNAKE 3019 — BIENTÔT. À DEUX. » et « À SUIVRE ». Il appelle lui-même N.choix, N.terminal, N.arcade
(et N.cosmos quand il sera livré) : **brancher N.aventure dans 79-jeu.js branche d'un coup le choix, 1976, 1982,
les films par personnage, les fins, les retrouvailles et le teaser.**
1. un état `aventure` ; au JOUER du titre : `aller('aventure'); N.aventure.demarrer({ aJouer: entrerDansLeNeon,
   surFin: finAventure })` ;
2. dans cet état : `update` → `N.aventure.update(dt)`, `draw` → `N.aventure.draw()`, `drawTop` rien ; couper la piste
   principale pendant les étapes `1976` et `1982` (elles jouent leur propre musique) ;
3. `entrerDansLeNeon(info)` : si `info.premiere`, `lancer(false)` ; sinon reprendre l'état gelé ;
4. rendre la main dans `update` : `if (N.aventure.reprendre('profondeur' | 'warp' | 'espace' | 'fin')) aller('aventure')`
   — aujourd'hui seul `'fin'` sert : à la victoire, après « apotheose », à la place de `terminer(true)` ;
5. `finAventure(bilan)` mène à l'écran de fin ou au titre ; une défaite ne concerne pas l'aventure ; quitter vers le
   titre appelle `N.aventure.stop()`.
6. (ajout du 18 octobre) **90-boot.js dessine lui-même `N.ui`, `N.hud` et `N.intro` par-dessus le jeu** : dans l'état
   `aventure`, il faut les taire, sinon le titre « SNAKE 2975 » de l'écran de démarrage couvre 1976 et 1982 (vu en
   portrait). Modèle qui marche : `demo/panneau.html` (la démo du voyage entier, `demo/index.html`, testée de bout en
   bout : choix → 1976 → 1982 → néon → profondeur à la vague 3 → fin, zéro erreur).

7. (ajout du 18 octobre, après codex-09) **2975 joue déjà dans le vrai jeu**, sans rien changer à 79-jeu.js : à la
   victoire, `finirVoyage()` → `reprendre('fin')` rattrape les films profondeur, warp, espace, puis l'époque finale
   2975 (N.cosmos, environ 2 min, `final: true`), puis le film de fin. Pendant 2975, N.aventure tait elle-même la piste
   principale et cache `N.ennemis.list` à N.warp (`isole: true`), et rend tout à l'étape suivante. Vérifié dans le vrai
   jeu : titre → JOUER → … → victoire → films → 2975 → fin → écran de fin, 0 erreur.
   FAIT (Claude cloud, 79-jeu.js réservé puis libéré) : profondeur au début de la vague 3, warp à la vague 4 ; l'espace et
   2975 restent à la victoire, après le CYCLOPE. Texte d'origine de la demande :
   Facultatif, pour que les films d'époque tombent au bon moment plutôt qu'au rattrapage : appeler
   `N.aventure.reprendre('profondeur' | 'warp' | 'espace')` au début des vagues 3, 4 et 5 (et `aller('aventure')`
   si c'est accepté), comme le fait `demo/panneau.html` (`surveiller()`). Après « espace », c'est 2975 puis la fin :
   le jeu néon ne reprend pas.

## codex-p6 — API de test (18/10/2026 · 00 h 51, Paris ; mis à jour à 00 h 52)

| lot | fichier | besoin / changement | raison / preuve |
|---|---|---|---|
| codex-p6 | `src/79-jeu.js` | `reset(graine,{depart})` accepte `demarrage`, `ouverture`, `titre`, `briefing`, `plongee`, `jeu` ; faute de nom = `false` sans mutation ; sans options et `direct` inchangés | CONTRAT publie la signature sans énumérer `depart`. Départ plongée demandé par codex-08 ; entrées directes vérifiées dans `tools/codex-p6/statique.json`. |
| codex-p6 | `src/02-regles.js` (`R.tests.scenes`) | ajout uniquement : `charge` 30 ennemis/60 tirs ; boss phase 3 et préparation bornée à 120 s ; `lasso6` 6 cibles/20 segments, grille de 3 colonnes espacées de 12 px ; inversion 12 proies en V2 ; convoi 6 cibles, voie 2, sens +1, avance 0,25 s après annonce ; travelling V3, queue à 40 px, départ x=128, sens +1 ; groupes 8 colonnes au plus, marge 24 px, espacement 20 px, centre 64 px devant | Effectifs/phase/longueurs/distances imposés par REFONTE § 7.12 ; les autres valeurs rendent les fixtures déterministes, visibles et bornées, sans réglage de la partie normale. |
| codex-p6 | `src/02-regles.js` (`R.tests.masque`, `R.tests.mesureVM`) | radar : retrait du bouton de 4 px et bord de 1 px ; mesure VM : 5 dessins de chauffe, puis 30 dessins mesurés | Géométrie existante de `78-hud` pour identifier le vrai marqueur de tête par position/dimensions, sans classifier par couleur ; coût local du masque publié séparément du budget navigateur. |
| codex-p6 | `src/12-cam.js:83,294,160` | renommer les deux fonctions `reset` et raccorder chaque interface à la bonne | `Wd.reset = reset` désigne la fonction caméra à cause des deux déclarations dans la même fermeture. Preuve VM : après charge, reset conserve le rectangle du boss et V5 portrait perdait 23 segments (40 → 17, CANON IV → II). Contournement limité aux nouvelles fixtures : arène complète via `world.arena`, achevée par `cam.update`, avant préparation. Aucun changement dans ce fichier. |
| codex-p6 | `tools/mesure/sonde.js`, contrat du masque | armer `N.game.dbg.masque(true)` AVANT le dessin à mesurer ; lire `dbg.masque()` après ce dessin dans la même image ; `dbg.masque(false)` libère le masque et restaure les fonctions | Activation paresseuse nécessaire : aucune propriété historique n'est inventée au premier appel, qui arme la prochaine image. Le masque n'est pas reconstruit depuis les couleurs. Script prêt : `tools/codex-p6/verifier.mjs`. |
| codex-p6 | `tools/mesure/criteres/R-37-lisibilite-arsenal.mjs` | distinguer dans l'analyse du sprite de tête le marqueur de tête du radar (zone HUD) | Le vrai marqueur appartient à la tête (code 1) et porte du cyan pâle ; l'inclure dans une comparaison au seul sprite du monde gonfle sa boîte et son nombre de pixels. Aucun seuil abaissé, aucun résultat R-37 revendiqué. |
| codex-p6 | exécution hors bac | lancer `cd proto-neon && node tools/codex-p6/verifier.mjs` | HTTP et Chromium interdits dans ce bac selon le cadre commun ; script complet, trois profils en série et navigateur muet, jamais exécuté ici. Les mesures VM ne qualifient ni Safari ni les performances du navigateur. |

## codex-07 — HUD des temps forts (18/10/2026 · 00 h 40, Paris)

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-07 | `30-music.js` / `79-scene.js` | jouer `palier` une fois lors du changement de l'objet public `N.score.palier = {mult,t}` ; initialisé à `null` au reset ; n'annonce que les hausses après un kill hors purge | le score ne déclenche pas d'effet ; le HUD montre déjà le chiffre et son accent. Le son reste réservé au lot audio |
| codex-07 | `79-scene.js` | respecter le budget dans `N.hud.banniere` aussi pour les priorités 1 ; le HUD centralise désormais l'espacement de 10 s entre débuts réellement dessinés, et reconnaît le CYCLOPE par son texte ou `opts.cyclope` | les appels directs de 77-score contournaient le budget de scène ; les compteurs de requêtes de scène ne prouvent pas le nombre de bannières affichées |
| codex-07 | `10-gfx.js` / producteurs de dessin | conserver le masque existant et attribuer les propriétaires lors du dessin de la joueuse et de l'arsenal ; `dbg.masque()` rend actuellement un tableau vide de propriétaires et le masque graphique réel attribue les pixels cyan au décor (code 8) | le masque est alloué mais la joueuse et l'arsenal ne posent pas leur propriétaire après celui du décor ; le comptage cyan est donc publié brut et avec un masque géométrique complémentaire, pas présenté comme une mesure fiable par propriétaire |
| codex-07 | environnement de vérification | exécuter `node proto-neon/tools/codex-07/verifier.mjs avant` sur la version d'origine puis `apres` sur ce lot, avec serveur HTTP et Chromium autorisés | ce bac à sable refuse `listen` avec EPERM et Chromium avec `MachPortRendezvousServer: Permission denied` ; les exports Node ne valident pas Safari |

| codex-07 | `79-jeu.js` / pilote (lot codex-02) | terminer le raccordement du pilote à l'écran de cartes avant la recette complète R-14 | sur les 120 s de pas demandées au banc Node, le pilote bon reste en cartes après 36,53 s de jeu en paysage et bureau ; en portrait, il atteint la fin à 20,53 s. Aucun choix ni invulnérabilité ajouté par le banc |

Ajouts uniquement dans `N.R.hud.tempsForts` ; les valeurs préexistantes de `N.R.hud.banniere`, `N.R.temps.imageRef` et du budget de scène restent lues telles quelles :

- `banniere` : échelle minimale **2**, durée de repli **2 s**, file bornée à **3**, attente maximale **10 s** (éviter les annonces périmées) ; marge **6 px**, réservation supérieure **56 px** (HUD et radar), interligne **3 px**, padding **6 px**, base du décalage des fantômes **2 px** (déplacements entiers dérivés de ce pas et du nombre de fantômes), durée des fantômes **6 images**, balayage **0,20 s**, clignotement optionnel des deux filets à **1,5 Hz** (texte fixe). Ces valeurs composent une entrée en pixels entiers et évitent les débordements en portrait.
- `palier` : durée **0,65 s**, coup **0,14 s**, échelles tenue **2** et coup **3**, marge **4 px**, accent local **0,35 s**. Un retour bref sans occuper le budget de bannières.
- `derniereVie` : seuil **1 vie**, battement **1,2 Hz** (G-04), bord **4 px**, densité de Bayer minimale **0,25** et amplitude **0,50**, seuil du cœur rose **0,68**. Bord sombre et local, sans éclair plein écran ; état fixe sous mouvement réduit.
- `protection` : **2 segments**, rayon tête **9 px** et corps **6 px**. Sauvegarde puis restitution des pixels et de leur propriétaire au-dessus du HUD, via les seules interfaces publiques.
- `texte` : ligne de **11 px** (interligne existant du HUD, utilisé pour placer le pop sous le défi et le nom de vague en portrait) ; `ptMin` **11 pt équivalent**, seuil demandé par la mission pour la vérification de lisibilité ; les nouveaux textes sont au moins à l'échelle **2**. Le rendu réel Safari reste à vérifier.

## codex-p4 — S.tele du CYCLOPE, RUCHE et lasers actifs

18/10/2026 · 00 h 51 (Paris). Publication seulement ; aucun délai d'annonce, dégât, dessin ou collision modifié. Preuves : `tools/codex-p4/scenes-vm.json`, traces et journaux gzip ; méthode et limites dans `tools/codex-p4/rapport.md`.

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p4 | `02-regles.js` (`publicationTele`, ajouté) | `tirVie = 9`, `rucheDecalage = 3`, `ruchePortail = 0.4`, `cyclopeTirDepart = 12`, `cyclopeRayonDepart = 9`, `cyclopeSpiraleDecalage = 0.5` | reprendre exactement les constantes existantes de 72/73 pour calculer la portée et les positions des zones ; les producteurs réemploient les mêmes valeurs ; aucune règle nouvelle |
| codex-p4 | `72-ennemis.js` / `73-colosse.js` | arbitrer le contact des mines du bond, sans correction dans ce lot | collision EFFECTIVE `mort` auteur mine : zone publiée 8,33 ms avant le contact après sortie du portail ; sous 500 ms et 800 ms. Avant/après identiques. Le portail existe déjà pendant 600 ms mais n'est pas dans S.tele ; aucun délai ni dégât changé |
| codex-p4 | `73-colosse.js` / règle R-07 | arbitrer le seuil applicable au souffle des mines du bond | souffle EFFECTIF à 600 ms de la première zone : satisfait 500 ms des mines ordinaires, échoue à 800 ms si ces mines sont comptées parmi les attaques du CYCLOPE ; avant/après identiques, `phase3.armementMines = 0.6` inchangé |
| codex-p4 | `70-joueuse.js` / journal des coups | fiabiliser l'attribution de la durée d'annonce du CYCLOPE et de ses mines | les collisions mesurées ont `teleDuree = 0` dans le journal malgré la présence de leurs zones ; la mesure de ce lot utilise les vrais états et la boucle image par image, pas ce champ seul |
| codex-p4 | banc hors bac à sable | lancer `cd proto-neon && node tools/codex-p4/verifier.mjs` | script complet, Chromium unique muet, iPhone paysage/portrait et bureau, vrais pixels et journaux ; serveur/Chromium interdits dans cette session, aucune tentative de contournement |

Interfaces publiques ajoutées : `N.colosse.publierTele(ajouter)` fournit ses zones à l'agrégateur ; `N.ennemis.publierTele()` rafraîchit S.tele après le pas de 73 (72 est mis à jour avant 73). Le pool réutilisé grandit si nécessaire, sans troncature silencieuse. Une salve ou un secteur peut nécessiter plusieurs formes portant le même id d'attaque. La RUCHE publie les emplacements de contact de sa couvée, puis de ses larves encore dans leur portail ; aucun souffle fictif autour de la mère. Les lasers et projectiles actifs du CYCLOPE restent publiés à `reste = 0` jusqu'à leur suppression réelle.

## codex-p7 — CONTINUER ? (18/10/2026 · 01 h 25, Paris)

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p7 | `79-jeu.js` | intégrer `tools/codex-p7/raccord-jeu.patch` (vérifié dans une copie temporaire, jamais appliqué au fichier réservé) | mémoriser longueur/armes/pouvoir à chaque entrée de vague et du CYCLOPE ; consommer `continuer` sans reset de partie ni des cartes ; restaurer la trace, les armes, les murs et la caméra ; transmettre `t0/t1` des touchers pour refuser un doigt posé pendant la garde |
| codex-p7 | `02-regles.js` (`ecrans.fin.actions`, ajout uniquement) | `marge:5`, `ecart:4`, `largeurMax:150`, `texteH:7`, `msParSeconde:1000` | marge intérieure de 5 pixels de jeu ; 4 pixels entre les deux cibles pour éviter l'ambiguïté ; largeur bornée à 150 pixels par bouton ; centrage de la police de 7 pixels ; conversion des dates de début/fin de toucher de boot en secondes, sans lire l'horloge système |
| codex-p7 | `77-score.js` (API ajoutée) | `continuerPossible()`, `continuer() -> bool`, `marque() -> '' ou 'C'`, `classement() -> [{score,marque}]` ; `resume().marque` | ce module reste seul écrivain du score, des vies et de la persistance. `records` reste numérique ; `marquesRecords` persiste la marque par rang, y compris les ex æquo et les anciens profils sans marque. La seconde fin ne double ni les parties ni l'énergie déjà attribuée ; `terminer` est idempotent |
| codex-p7 | `80-ecrans.js` (API ajoutée) | `finActions()` et `S.ecran.fin` publient rectangles, disponibilité, garde et décompte | mêmes rectangles pour le dessin et la sélection ; deux cibles sûres, clavier 1/2 ou flèches + validation ; Entrée/Espace conserve REJOUER par défaut, R-35. Zéro reste proposé une seconde puis CONTINUER est désactivé ; pas de relance implicite à l'expiration |
| codex-p7 | exécution hors bac | `cd proto-neon && node tools/codex-p7/verifier.mjs` | copie temporaire, raccord appliqué, build, trois profils en série, un seul Chromium muet ; captures, vrais pixels des libellés, toucher/souris réel, parcours, journal, __ERR puis critères officiels R-18/R-35. HTTP/Chromium interdits dans ce bac : script non exécuté ici |

Réemploi sans changement : `ecrans.fin.continuer` (9 → 0), `ecrans.fin.garde` (0,45 s), `ecrans.fin.boutonPt` (44 pt), `vies.continuer` (une fois, trois vies, score zéro). Le raccord emploie `monde.mobile.glissementMin` pour rendre l'arène par l'API publique, car le double `reset` de `12-cam.js` signalé par codex-p6 subsiste. Aucune modification de `12-cam.js`, aucun champ privé consommé.

Preuves VM : `tools/codex-p7/calibration.json` (10 parties exactes du commit e1bdc6f, cinq pilotes × deux graines), `avant.json` et `statique.json` (9 parcours, 222 contrôles, zéro erreur). La relance mesurée reste à 0,8166666666666662 s avant/après ; ceci ne qualifie pas Safari ni le résultat navigateur des critères officiels. Compte rendu et limites : `tools/codex-p7/rapport.md`.

## codex-p4b — armement des mines du CYCLOPE

18/10/2026 · 01 h 23 (Paris). Suite autorisée de codex-p4 ; résout les deux écarts mines de la section précédente. État courant et mesures dans `tools/codex-p4/rapport.md` ; aucune modification des autres modules.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p4b | `02-regles.js`, ajout `colosse.minesPosees.armement = 0.8` | protection de pose avant tout contact et avant le départ de la mèche ; plancher partagé avec `colosse.teleMin` | R-07 exige CYCLOPE ≥ 800 ms ; l'ancien portail de 600 ms était absent de S.tele. La mèche préexistante `phase3.armementMines = 0.6` suit la protection, soit au moins 1,4 s pose → souffle |
| codex-p4b | `02-regles.js`, ajouts `colosse.minesPosees.contour = 1`, `densiteAnneau = 1` | contour sombre de 1 px et anneau magenta entièrement tracé pendant le portail | annoncer exactement le rayon de souffle existant, sans cyan, clignotement ni flash ajouté ; anneau stable plutôt qu'aplat lumineux |
| codex-p4b | `72-ennemis.js`, option publique `spawn('mine',…, {annoncePose:true, portail,…})` | publication synchrone dans S.tele et événement arme dès la pose ; le portail interdit contact/mèche, puis le contact actif reste à `reste=0` séparément du souffle | éviter un pas sans annonce et distinguer les échéances des deux dangers. 73 n'écrit aucun champ privé de 72 |
| codex-p4b | `72-ennemis.js`, visibilité de pose | compter `vuDepuis` pendant le portail ; le prolonger tant que la visibilité continue reste sous `R.criteres.R08.visible = 0.6`, avec le pas existant `R.temps.h` | R-08 : une mine hors champ ne s'active pas à son entrée dans l'écran. Réutilisation des chiffres existants, aucune nouvelle valeur |
| codex-p4b | `tools/codex-p4/verifier.mjs`, hors bac | lancer `cd proto-neon && node tools/codex-p4/verifier.mjs` et renvoyer `playwright-p4b/resultats.json` | trois profils en série, un Chromium muet, vrais pixels de pose/armement/collision et anneau isolé, journaux et 6 parties dieu/bon avant/après. Aucune tentative serveur/Chromium dans ce bac. Les huit scènes déjà acceptées ne sont pas relancées par défaut |

Le nombre et le placement des mines restent ceux de phase 3. La difficulté est évaluée sur les parties demandées ; aucune compensation chiffrée n'est inventée avant leur résultat. Aucun seuil d'acceptation abaissé. Les mesures VM ne sont pas une qualification Safari ni une preuve des pixels du navigateur.

codex-p4b — mis à jour le 18/10/2026 à 01 h 29 (Paris) : VM validée sur dix références ; six scènes mines après sur trois formats satisfaites, douze parties avant/après fin sans erreur. Bon : morts auteur cyclope 2→2 ; toutes morts pendant le boss 3→5 (murs 1→3), aucune mort par mine pendant le boss. Nombre et placement conservés. Construction sortie 0 ; rapport et reçus dans `tools/codex-p4/`. Chantier bloqué uniquement sur la vérification visuelle hors bac, sans lancement navigateur ici.

## codex-09 — aventure branchée dans le vrai jeu

18/10/2026 · 01 h 44 (Paris), mis à jour à 01 h 53. Mesures finales : `tools/codex-09/rapport.md`.

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-09 | `03-socle.js` (`N.ids.etats`, `tableEtats`) | ajouter `aventure`, `{horloge:'avance', section:null, plein:true}` | registre gelé, hors réservation ; `79-jeu` accepte cet état localement sans modifier N.ids. Les époques avancent avec leur propre temps, le monde néon n'est pas mis à jour. Le boot masque explicitement les interfaces et effets du néon. |
| codex-09 | `79-jeu.js` | JOUER → aventure ; victoire après apothéose → reprendre('fin') ; sortie gagnée → bilan ; REJOUER gagné → titre et choix suivant ; défaite/CONTINUER conservent le néon | parcours ELLE puis LUI, marquage des deux fins, retrouvailles/teaser ; départs explicites inchangés. Arrêt public de l'aventure au retour au titre et au reset. |
| codex-09 | `90-boot.js` | en aventure, taire N.ui/N.hud/N.intro, les effets et le manche du néon | le tampon du choix, de 1976 et de 1982 doit être celui du module d'aventure seul, en particulier en portrait. |
| codex-09 | intégration / vérification hors bac | `cd proto-neon && node tools/codex-09/verifier.mjs` | script complet, un Chromium muet, trois profils en série, deux pilotes, sorties naturelles des époques, toucher réel pour chaque film, captures, histogrammes, comparaison du tampon aventure/boot et journal ; non exécuté ici conformément au cadre. |
| codex-09 | référence `tools/pilotes/sortie.json` / état reçu `8f55a91` | arbitrer les écarts préexistants avant de revendiquer la conservation des 80 références historiques | valeurs brutes conservées dans `tools/codex-09/pilotes-final.json` et comparaison avant/après ; aucun seuil ni comportement de combat corrigé pour rapprocher le résultat. |

Correction dans 79-jeu : retirer le second lancement de boss après réveil (N.intro enchaîne déjà les deux). Échec initial conservé dans `tools/codex-09/complements-avant.json` ; après correction, saut au toucher vers le combat sur les trois profils. Le pilote dieu/graine 1 garde exactement son temps, sa vague et son score avant/après (`victoire-pilote.json`).

Aucun chiffre de jeu nouveau : garde réutilisée depuis `N.R.ecrans.ouverture.garde` (300 ms) ; les films restent dans N.aventure/N.intro, sans duplication de leurs règles. Les états de transition aventure sont écrits au journal public. Les films de profondeur/WARP/espace restent le rattrapage de fin livré par N.aventure : ce lot n'introduit pas leurs mécaniques dans les vagues néon ni dans les parties des pilotes.
## codex-10 — DÉFILÉ et respiration (18/10/2026 · 01 h 56)

Ordre de la cheffe dans COORDINATION.md. Modules76-defile/76-directeur ;79-jeu appartient àcodex09, raccord livré en patch, jamais édité dans le checkout partagé. Tous les chiffres existent déjà dans N.R : defile24s,5×8, intervalle4,5s, sortie8s,100points par planeur, prime10000, raregarantie1 ; respiration8s sous40% strict du pic réel. Aucun ajout ni changement de02-regles.js, réservé àp5.

La respiration se place encore dans la vague, avant le nettoyage : une fois l’objectif atteint ou la durée nominale écoulée (pic annoncé réalisé), suspension des producteurs, purge publique sans score de combat, puis compteur uniquement sous40% du maximum réel observé dans cette vague. Fin de vague toujours conditionnée par les objectifs/soupape existants, et par les8s complètes de respiration. Rien n’est ajouté au pilote pour améliorer artificiellement ses résultats.

Le DÉFILÉ suit VOL3→DÉFILÉ→VOL4 ; les vrais planeurs de72 sont des cibles de tir et deLASSO, inoffensives au contact ; mur et règle de morsure deN.R inchangés. Le parfait compte40kills valides, prime une seule fois et rare garantie consommée par la prochaine main. Dernier départ à18s : la fenêtre globale de24s laisse6s àla dernière escadrille ; aucune valeur de règle modifiée pour masquer cette limite. ContrôlesVM préparatoires seulement ; parcours3profils,20défilés bon/humain et80avant/après attendent un créneau Chromium libre.

## codex-p5 — lot 9, réglage par les pilotes

18/10/2026 · 00 h 48 (Paris), mis à jour à 02 h 25. Mesures sur la tête `85b389d`, avant intégration des autres chantiers ; voir `tools/reglage/rapport.md` et `methode.md`. Les essais numériques sont confinés au banc, aucun pilote ni fichier de jeu tiers modifié.

| lot | fichier | besoin | raison |
|---|---|---|---|
| codex-p5 | `76-directeur.js:324` | appliquer le plafond de vague aussi aux formations qui attendent depuis vingt secondes, ou expliciter cette exception au contrat | le code cesse de tester le plafond après `q.t + 20` ; un plafond N.R réduit ne borne donc pas réellement le pic (départ sur vingt graines : V1 médiane 19 vivants pour plafond 10) ; impossible de promettre des pics contrôlés par le seul chiffre |
| codex-p5 | `76-directeur.js`, `79-jeu.js`, `03-socle.js` | garantir la respiration existante de huit secondes et préciser le référentiel pendant les cartes/panneaux | le banc publie séparément temps de jeu et temps simulé ; les écrans arrêtent l'horloge. `N.R.secteurs[0].respiration` n'est pas lu par le directeur ; un chiffre sans consommateur ne peut imposer l'intervalle |
| codex-p5 | `70-joueuse.js:83` | aiguiller les vitesses déjà définies pour DÉFILÉ, CYCLOPE et CYCLOPE enragé sur leurs états | `vitesse()` ne sélectionne que v1 à v5 à partir du numéro de vague ; modifier `N.R.joueuse.vitesse.cyclope` ne règle pas le combat. Le lot 9 n'ajoute aucune règle de sélection |
| codex-p5 | `76-directeur.js:156,196-208` | lire les effectifs déjà définis dans `N.R.formations` et en déduire `TAILLE` | FILE = 3, MEUTE = 6 et NUÉE = 6–8 sont des littéraux dans `formation()` ; changer leurs nombres dans N.R n'a aucun effet. La passe 5 règle les plafonds/dates réellement lus au lieu d'annoncer un faux réglage de ces effectifs |

Nombres retenus appliqués le 18/10/2026, mis à jour à 02 h 05 (Paris), candidate 2. Les cinq passes sont closes ; les essais rejetés restent documentés dans `tools/reglage/passes.md` et les JSON. Contrôle final sur 50 graines terminé : 400 parties finies, zéro erreur VM/console, 8/20 B tenues. Lot arrêté au plafond de cinq passes, R-04 et R-15 non validés ; aucune retouche après ce contrôle. Voir `tools/reglage/rapport.md`.


| lot | fichier / nombre | ancien → nouveau | raison |
|---|---|---|---|
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vitessesFleches.0` | 50 → 40 | Garder la table de vitesses par vague cohérente avec les deux bornes effectivement lues par 72-ennemis. |
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vitessesFleches.1` | 55 → 44 | Garder la table de vitesses par vague cohérente avec les deux bornes effectivement lues par 72-ennemis. |
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vitessesFleches.2` | 60 → 48 | Garder la table de vitesses par vague cohérente avec les deux bornes effectivement lues par 72-ennemis. |
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vitessesFleches.3` | 65 → 52 | Garder la table de vitesses par vague cohérente avec les deux bornes effectivement lues par 72-ennemis. |
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vitessesFleches.4` | 70 → 56 | Garder la table de vitesses par vague cohérente avec les deux bornes effectivement lues par 72-ennemis. |
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vagues.0.plafond` | 10 → 12 | Plafond V1 à 12 : combinaison candidate 2 mesurée, bon atteint le CYCLOPE dans 35 % sur vingt graines ; ne prétend pas garantir le pic (exception après vingt secondes dans le directeur). |
| codex-p5 | `02-regles.js` · `N.R.secteurs.0.vagues.1.chargesFleches` | 2 → 1 | Une seule charge simultanée en V2 pour les morts de contact concentrées dans cette vague ; combinaison mesurée avec les autres paramètres, sans attribution isolée. |
| codex-p5 | `02-regles.js` · `N.R.ennemis.fleche.approche.0` | 50 → 40 | Réduire la pression d’approche ; variante isolée et candidate 2 font entrer la durée humaine dans sa cible sur vingt graines. |
| codex-p5 | `02-regles.js` · `N.R.ennemis.fleche.approche.1` | 70 → 56 | Réduire la pression d’approche ; variante isolée et candidate 2 font entrer la durée humaine dans sa cible sur vingt graines. |
| codex-p5 | `02-regles.js` · `N.R.colosse.pvPhase` | 1500 → 1200 | Réduire la difficulté du CYCLOPE : 1 200 PV par phase, combinaison candidate 2 donne 10 % de victoires bon sur vingt graines. |
| codex-p5 | `02-regles.js` · `N.R.colosse.pvTotal` | 4500 → 3600 | Total cohérent avec les trois phases de 1 200 PV ; pas de modification du nombre de phases ni des répits. |


## codex-p3c — diagnostic de la batterie 15a196a (18/10/2026 · 01 h 41 Paris)

Tableau détaillé, valeurs reçues et limites : `tools/mesure/DIAGNOSTIC-ECHECS-2.md`.
Aucun fichier src ni chiffre N.R modifié dans ce lot ; seuils existants conservés. R-05 applique la décision explicite de SORTIE.md, sans prétendre que les six causes encore absentes ont été produites.

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p3c | `50-fx.js` | `admit()` : journal réel `flash {aire,accepte}` sur chaque issue ; conserver le budget N.R de trois flashs par seconde ; corriger les pixels seulement après lecture des transitions | R-13 : 7/s dans l'ancien compteur qui doublait L/R, journal vide ; pas de feu vert sécurité sans nouveau reçu |
| codex-p3c | `70-joueuse.js` | `majBoost()` : maintien aligné continu avant reprise du boost par poussée ; réinitialiser le maintien hors `R.boost.ecartDeg`, conserver second doigt tenu | R-33 : 30 images réellement accélérées pendant le slalom ; détails de cap/course maintenant collectés |
| codex-p3c | `90-boot.js` | journaliser les vrais gestes selon le schéma de `03-socle`, ou conserver l'observation des entrées livrées par le banc ; aucun événement synthétique | les 0/6 de R-22 et R-33 viennent du journal geste absent ; reconnaissance et activation du pouvoir sont distinctes |
| codex-p3c | `79-jeu.js`, `90-boot.js` | synchroniser la fin de l'interlude PLONGÉE et le vrai VOL ; vérifier `intro.state/current`, état et pixels au même instant ; fond de fin non bloquant réservé à fin | R-03 : la capture en échec est un panneau illustré, pas les seules bannières signalées par p2 ; le banc refuse désormais un panneau actif comme mesure de jeu |
| codex-p3c | `40-sprites.js` | `genTete/dir16` : gaine nuit profonde d'un pixel sur chaque orientation et animation | R-37 : silhouette cyan sans gaine ; l'erreur de 94 contre 92 inclut aussi les deux pixels du radar, séparés dans le banc |
| codex-p3c | `74-arsenal.js` | si le nouveau reçu confirme des pixels strictement trop proches, exclure les dessins à distance strictement inférieure à `R.armes.lisibilite.silenceTete` de la vraie silhouette | R-37 : l'ancien compteur incluait la borne exactement égale à trois pixels et le radar ; aucun nouveau seuil arbitraire |
| codex-p3c | `02-regles.js`, `03-socle.js` (gardien) | mettre `mort.causes` et `criteres.R05.causes` à sept ; distinguer les causes naturelles de mort de la liste de coupe sans supprimer morsure des coupes | décision SORTIE.md du 18/10 à 00 h 41 ; l'instrument exige désormais les sept causes naturelles et refuse une mort par morsure |
| codex-p3c | `15-decor.js` | `pal/taireFondJeu` : préserver la lumière neutre spatiale nécessaire au décor code 8 entre les bornes R existantes, avec cyan zéro et magenta/rose sous la borne | quatre parts reçues 0,10423 / 0,10148 / 0,09680 / 0,14609 restent sous 0,18 ; la lumière globale reste indicative |
| codex-p3c | `73-colosse.js` | `corps/teles/drawTop` : gaine sur le bord final des menaces selon `R.ennemis.tele.gaine`, mesurer les couches en défaut avant réglage | R-11 colosse : 380 pixels de bord gainés sur 888 ; export masque/tampon préparé |
| codex-p3c | `79-jeu.js`, `80-ecrans.js` | produire et rendre l'attraction après l'attente et selon la boucle déjà chiffrées dans N.R | R-19 jamais atteint en 25 s ; la branche titre n'a pas de transition d'inaction |
| codex-p3c | propriétaires performance / effets | attendre la sonde avant un ordre numérique R-20 ; témoin apparié R-12 pour la caméra ; paire consécutive de gel R-28 ; aucune hausse de force avant validation R-13 | les reçus ne prouvent ni un goulot CRT, ni une perte CPU de 1,804 %, ni un gel continu changeant de 23,974 % |
| codex-p3c | exécution hors bac | `cd proto-neon && node tools/mesure/verifier.mjs --diagnostic-p3c` | serveur sur port libre, un seul Chromium muet, trois profils, critères prioritaires et traces ; script non exécuté dans le bac |

## codex-p8 — longueur critique et accélération (18/10/2026 · 01 h 48, Paris)

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p8 | `02-regles.js`, ajout `longueur.critique` | seuil **3**, battement **1 Hz**, rayon **7 px**, amplitude **1 px**, trame minimale **0,5** | B1/B3 : longueur critique indépendante du mur, petite couronne cyan pâle en Bayer autour de la tête ; une seule respiration par seconde ; fixe si mouvement réduit ou flashs désactivés. Aucun aplat plein écran. |
| codex-p8 | `02-regles.js`, ajout `longueur.critique.pastilles` | rayon **1 px**, pas **4 px**, recul vertical **15 px**, marge sûre **3 px**, fond **2 px** | trois emplacements près de la tête ; distinguer longueurs 1/2/3 par le nombre de pastilles cyan pâle, emplacements perdus acier ; rester dans la zone sûre en portrait comme en paysage. |
| codex-p8 | `02-regles.js`, ajout `boost.trainee` | recul **6 px**, longueur **10 px**, demi-largeur **5 px**, **2 branches** | deux filets ambre parallèles attachés à la tête, dessinés après le corps ; aucune boule de tir, aucune particule autonome ni clignotement. |
| codex-p8 | `12-cam.js` | lire aussi le boost effectif public `N.joueuse.boost` | l'accélération au manche fonctionne déjà, mais son avance de caméra manquait ; facteur existant `camera.avanceBoost` conservé. |
| codex-p8 | `15-decor.js` | si le lot décor traite D3, lire aussi `N.joueuse.boost` pour la vitesse du sol | hors des fichiers attribués : la mission p8 couvre la traînée et la caméra ; la couverture mentionne également le sol. Aucune modification de ce module ici. |
| codex-p8 | banc hors bac | `node proto-neon/tools/codex-p8/verifier.mjs` depuis la racine | script complet pour les trois profils, deux préférences de mouvement, captures L=3/boost, mesures du tampon après dessin et journal, un seul Chromium muet ; non exécuté dans ce bac conformément au cadre commun. |

Interface publique ajoutée : `N.joueuse.critique() -> bool`, dérivée exclusivement de la longueur et de l'état vivant/réapparition ; aucun changement des collisions, du mouvement, du boost ou des événements. Les pastilles sont attribuées au propriétaire `tete` dans le masque public, avec restauration du propriétaire précédent.

Mise à jour codex-p8 à 01 h 55 : 20/20 parties inchangées avant/après, journal complet compris ; 7/20 diffèrent déjà des reçus e1bdc6f avant ce lot (tourneur 1, maladroit 1, kamikaze 3, humain 1–4). Tableau exact dans `tools/codex-p8/rapport.md` et `comparaison20.json` ; aucune cause attribuée ni tolérance ajoutée. Réconciliation historique à faire par les lots de logique concernés ; aucune modification hors périmètre ici. 78 contrôles ciblés VM réussis, zéro erreur ; Playwright non exécuté. La caméra ignore le drapeau de boost résiduel lorsque la joueuse est morte (comportement testé), sans changer sa publication ni la simulation du serpent.

## codex-p10 — photosensibilité et tête gainée (18/10/2026 · 02 h 06, Paris)

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p10 | `02-regles.js`, ajout `lisibiliteP10` | `teteGaine=1` ; `flash={fenetre:1,max:3,rafale:0.05,aireCSS:21824,aire:0.066}` ; mesure `{images:600,dt:1/60,luminanceDelta:0.1,luminanceSombre:0.8}` | gaine d'un pixel dans la boîte 13×13 existante, après rotation ; valeurs du limiteur historique centralisées sans hausse ; protocole et seuils R-13 repris sans affaiblissement. Le regroupement temporel est désormais aussi borné à la même image : un gel ne peut partager son admission entre images différentes |
| codex-p10 | `15-decor.js:803-846`, `drawFar()/rendreFar()/taireFondJeu()` et `enJeu():82-86` — propriétaire du décor | corriger les grandes transitions de luminance / rouge, puis relancer `tools/codex-p10/verifier.mjs` ; inclure la séquence victoire dans la protection de lumière | VM calibrée : R-13 reste en échec malgré ≤3 admissions/s. Ablation sur les vrais pixels : charge paysage 9/s→6/s sans dessins FX, 9/s→2/s sans décor ; boss3 portrait 4/s inchangé sans FX ou colosse, →1/s sans décor ; mort CYCLOPE paysage 7/s→5/s sans FX, →2/s sans décor. Cela implique le décor ou sa composition ; l'ablation ne prouve pas encore la fonction interne exacte. Ne pas affaiblir 3/s ni 6,6 %, ne pas supprimer le décor en production |
| codex-p10 | `03-socle.js:479` / critère `R-13` — gardienne du banc | conserver `{aire,accepte}` ; compter les nouveaux flashs via `d._compte`, publier séparément sous-seuil, rafale, réduction et refus ; éventuelle formalisation des métadonnées par le socle | journalisation de chaque chemin, donc `accepte=true` inclut aussi des demandes sous le seuil et plusieurs composants d'une même image. Compter chaque ligne comme un flash inventerait des événements. `_type,_luminance,_rouge,_image,_temps,_issue,_echelle,_compte` sont des métadonnées locales permises par le schéma ; zéro champ privé d'un autre module lu |
| codex-p10 | producteurs `flashGate` (`60-intro.js`, `70-joueuse.js`, `73-colosse.js:963`, `74-arsenal.js`, `78-hud.js`) | utiliser le second argument optionnel `{type,ci}` lorsque l'effet est connu | rétrocompatibilité conservée. Sans encre fournie, le journal marque luminance et rouge `null` plutôt que les inventer ; les vrais pixels de chaque image restent la mesure de référence |
| codex-p10 | exécution hors bac | `cd proto-neon && node tools/codex-p10/verifier.mjs` | script prêt : trois profils, neuf scènes de 600 images, journal complet, transitions et luminance du vrai tampon, pixels de tête réellement dessinée et 48 sprites par profil, captures ; un seul Chromium muet. Ni serveur ni navigateur essayé dans ce bac. Safari réel reste à vérifier |

Preuves détaillées et résultat non clos : `tools/codex-p10/rapport.md`. Aucune correction des modules réservés à leurs propriétaires, aucun commit.


## codex-p11 — attraction, gestes et registre aventure

18/10/2026 · 02 h 06 (Paris). État et preuves : `tools/codex-p11/rapport.md`.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p11 | `02-regles.js` (ajouts) | `ecrans.attraction.pilote = 'bon'` ; `gestes.msParSeconde = 1000` | politique publique déjà disponible pour jouer la démo ; conversion des t0/t1 en millisecondes vers la durée du schéma en secondes. Aucun seuil de reconnaissance changé |
| codex-p11 | `79-jeu.js` | attente et durée reprises de `ecrans.attraction.attente = 15` et `.demo = 20`, graine existante ; démo silencieuse, sans bilan ni sauvegarde ; sortie au premier toucher/clavier/clic | R-19 ; la mort continue de tuer, elle relance uniquement la démo. Les transitions de combat ordinaires restent inchangées hors attraction ; aucun raccord defile modifié |
| codex-p11 | `90-boot.js` (API publique ajoutée) | `N.entree.annuler()` | consommer le doigt/clic qui quitte la démo, y compris son relâcher, sans lancer JOUER à travers le titre ; reconnaissance inchangée |
| codex-p11 | `03-socle.js` (registre appliqué) | `aventure`, `{horloge:'avance', section:null, plein:true}` | résout la demande codex-09 ; suppression de l'exception locale de 79-jeu |
| codex-p11 | `03-socle.js` (schéma journal, hors réservation : à intégrer) | appliquer `tools/codex-p11/raccord-schema.patch`, ajout optionnel de `t0:'?n', t1:'?n'` au journal `geste` | la mission exige t0/t1, absents du schéma gelé ; seuls les états sont réservés à ce lot dans le socle. Les écritures contiennent les champs existants genre/doigt/duree/deplacement/action plus ces deux dates. Le validateur actuel signale exactement ces deux champs ; le raccord est testé en copie VM, non appliqué |
| codex-p11 | exécution hors bac | `cd proto-neon && node tools/codex-p11/verifier.mjs` | trois profils en série, un Chromium muet, entrée/sortie attraction, vraies entrées CDP, 6 gestes de chaque genre, pixels et journal, JOUER → aventure, zéro erreur ; script non exécuté ici. Le contrôle du schéma reste rouge tant que le raccord n'est pas intégré |

Réemploi des durées existantes ; aucun nouveau seuil de jeu, aucun seuil de test abaissé. Le silence passe par les deux canaux et la coupure globale, pour couvrir également les voix/cues. Aucun réglage persistant modifié. Le test VM des gestes appelle la vraie fonction `geste()` : il valide la journalisation uniquement, pas les TouchEvents ni Safari. Ceux-ci restent à vérifier hors bac.

Codex-p11 — après intégration du raccord de schéma, reconstruire `index.html` par `cd proto-neon && node build.mjs` avant le contrôle navigateur ; sinon le bundle conserve encore le schéma antérieur.

Codex-p11 — mis à jour le 18/10/2026 à 02 h 18 (Paris) : VM calibrée sur 10 références historiques exactes ; 24/24 parties avant/après strictement identiques (temps, vague, score et journal complet), toutes finies sans erreur. Attraction mesurée à 15,008333333333121 s sur les trois formats ; JOUER → aventure intact. Build sortie 0. Détails et limites dans `tools/codex-p11/rapport.md`. Chantier bloqué pour la validation finale sur le raccord de schéma hors réservation et le reçu navigateur hors bac ; aucune exécution serveur/Chromium ici.

## codex-p13 — décor et photosensibilité (18/10/2026 · 02 h 25, Paris)

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p13 | `02-regles.js`, ajout seul `decorPhotosensibilite.fondu = 1.2` | fondu minimal commun des quartiers/états et des couleurs de la cité | répartir les révélations sur 64 petites étapes, conserver la palette et éviter les reprises brusques d'une transition interrompue ; mouvement réduit conserve le fondu |
| codex-p13 | `02-regles.js`, `decorPhotosensibilite.cycle = 4.8` | période entre deux accents des enseignes, fenêtres, incendies et inversion | remplacer les alternances locales à 4–6 changements/s par une animation lente avec fondu ; aucun seuil R-13 modifié |
| codex-p13 | `02-regles.js`, `decorPhotosensibilite.cameraVitesse = 60` | déplacement du lointain borné à 60 pixels de jeu/s par axe | l'ablation implique aussi le déplacement du fond tramé ; calmer son rattrapage sans toucher au suivi de la caméra de jeu, aux murs ni aux collisions |
| codex-p13 | `02-regles.js`, `decorPhotosensibilite.eclairDuree = 1.2`, `eclairRepos = 2.4` | enveloppe douce et intervalle minimal entre départs d'éclairs | supprimer le saut marche/arrêt ; ne pas redéclencher en rafale ; désactiver en mouvement réduit ou flashs coupés |
| codex-p13 | `02-regles.js`, `decorPhotosensibilite.trame = 4`, `rangsFondu = 64` | Bayer officiel 4×4, extension déterministe 8×8 pour les fondus | conserver les seize encres ; rephaser le ciel et les fenêtres sur l'écran plutôt que laisser le déplacement inverser la trame ; passer de sauts plein écran de 6,25 % à 1,5625 % par rang |
| codex-p13 | `02-regles.js`, `decorPhotosensibilite.seuilLumineuxSol = 0.25`, `solChaudMax = 0.03`, `solLumineuxMax = 0.08` | publication des seuils existants de lisibilité 01b, utilisés par la mesure | sol strictement sous l'horizon, largeur entière ; aucune tolérance relâchée |
| codex-p13 | `15-decor.js` | maintenir la table nuit/ardoise pendant victoire et fin | la cascade du CYCLOPE ne doit pas réallumer brutalement tout le sol ; aucun pixel d'acteur assombri |
| codex-p13 | vérification hors bac | lancer `cd proto-neon && node tools/codex-p13/verifier.mjs` et renvoyer `tools/codex-p13/navigateur/resultats.json` | neuf scènes de 600 images, trois profils successifs, un Chromium muet, vrais pixels, sol et journaux ; HTTP et Chromium interdits ici, aucune tentative |

Les modifications p10 reçues sont conservées. La section codex-p10 annoncée par la mission n'était pas présente dans ce `demandes.md` reçu ; son rapport et son fichier d'attribution ont été lus. Les résultats, y compris les essais intermédiaires insuffisants, sont conservés dans `tools/codex-p13/`. Aucun commit. Le rendu navigateur, le coût sur iPhone et Safari réel restent à vérifier hors bac.


## codex-p4c — naissances hors champ et murs mobiles (18/10/2026 · 02 h 04, Paris ; mis à jour à 02 h 20)

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p4c | `02-regles.js`, ajout `apparitions.naissance.bord = 1` | un pixel de jeu au-delà de la marge et du demi-sprite | rendre l'exclusion de la vue stricte, y compris un point exactement sur son bord ; toutes les autres marges viennent des règles existantes |
| codex-p4c | `02-regles.js`, ajout `arene.teleMurs.ids = [-10001,-10002,-10003,-10004]` | identités stables gauche/droite/haut/bas | séparer les murs des identités ennemies positives et des petites identités négatives des mèches instables ; aucun dégât, délai ni seuil nouveau |
| codex-p4c | `76-directeur.js` (codex-10) | corriger uniquement chez son propriétaire les 4 VOLS au lieu des 5 demandés | reçu R-31 de la batterie `8f55a91` : 4, seuil 5 ; ce lot ne change ni le directeur ni l'ordre des séquences |
| codex-p4c | `73-colosse.js:255,282,304` | faire réellement entrer l'œil et les deux mains depuis le hors-champ, puis appeler le spawn avec leurs vraies positions de naissance | `ext:true` donne la position au producteur ; 72 ne doit ni déplacer ensuite ces objets ni maquiller le journal. La scène boss montre encore une apparition de l'œil dans la vue sur chacun des trois formats ; les parties atteignant la phase 2 enregistrent aussi les deux mains |
| codex-p4c | `73-colosse.js:279,320` / propriétaire de `12-cam.js` | annoncer dans S.tele et à l'écran AVANT les deux appels directs world.arena du boss, avec garde de 2 s avant le premier déplacement | 73-arene peut publier les frontières dès qu'il observe le mouvement, mais ne connaît pas à l'avance ces appels externes. Les télégraphes actifs publiés après leur départ ne prouvent pas une annonce préalable |
| codex-p4c | `tools/mesure/criteres/R-31-plateau.mjs` / `70-joueuse.js:156-158` | reconnaître l'événement réel `travellingAnnonce` dans la recherche des annonces, ou attribuer dans la mort la durée de l'annonce effective de l'arène | la sonde actuelle ne reconnaît que `travelling` (départ, après la mise en place) et `convoiAnnonce` ; `teleDuree` reste 0 pour toute source arène. Dans la collision contrôlée après correctif, l'annonce précède bien le mouvement de 2,008 s, mais le prédicat historique la classe encore sans annonce. Garder le seuil 0 et la durée 2 s ; ne pas renommer mensongèrement l'annonce en départ |
| codex-p4c | hors bac | lancer `cd proto-neon && node tools/codex-p4c/verifier.mjs` | HTTP et Chromium interdits dans cette session. Le script est prêt : un Chromium muet, trois formats, captures/buffers/journaux et 10 graines × bon/humain avant/après. Les cas externes non résolus font explicitement échouer le bilan |

Le travelling propre à 73-arene annonce désormais immédiatement et attend les 2 s EXISTANTES avant même sa mise en place de 3 s. 72 agrège les télégraphes de l'arène ; 73 les republie avant la collision joueuse. Les frontières courantes sont actives à reste=0 ; les positions d'arrivée sont datées, sans déclarer mortelle toute la bande qu'un mur traversera plus tard.
Les mines/couvées sont placées hors vue dans 72. Un portail que la caméra rejoint reste inoffensif et immobile jusqu'à être à nouveau hors champ : l'événement apparition garde son sens de fin du portail. Une mine posée du CYCLOPE conserve ensuite une protection jusqu'à l'annonce visible complète de 0,8 s et aux 0,6 s de visibilité existantes ; sa mèche reste arrêtée jusque-là. Ce lot change donc son emplacement et peut retarder son activation ; la parité de placement du lot p4b n'est plus revendiquée.


## codex-p12 — défis et raisons de revenir (R-16, R-36)

18/10/2026 · 02 h 13 (Paris), mis à jour à 02 h 42. État et mesures actualisés dans `tools/codex-p12/rapport.md`.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p12 | `02-regles.js`, ajout `defis.partie` | FINIR, réserve mesurable (`premierJet`, `lasso6`, `sansCoupe`, `chaine5`, `sansFilet`), but FINIR 1, jour de repli 20261017 ; compatibilité du défi historique : 10 kills, 5 000 points, 20 énergie | publier 3 objectifs exacts sans inventer la mesure des 7 objectifs dont les événements manquent ; conserver les effets de combat reçus pour les pilotes |
| codex-p12 | `02-regles.js`, ajout `defis.retour.seuils` | seuils effectifs de progression 25 / 180 / 350 / 550 / 800 énergie ; validés sur 25 parties enchaînées (premier : partie 2 ; dernier : partie 13) | avancer le premier déblocage et garder un dernier déblocage entre les parties 12 et 25 ; les anciennes valeurs ne sont pas modifiées |
| codex-p12 | `02-regles.js`, ajout `ecrans.retour` | échelle 2, marge 5, padding 4, écart 8, ligne 18, barre 3, hauteur texte 14, 2 colonnes, 2 lignes réservées à la pagination, bouton minimum 44 pt | faire tenir les défis et le prochain seuil dans la zone sûre en portrait/paysage ; conserver record/build/conseil dans un bilan paginé accessible au toucher |
| codex-p12 | `79-jeu.js` (codex-p11), `tools/codex-p12/raccord-jeu.patch` | appliquer le petit raccord : ouvrir/fermer le briefing public, passage briefing → plongée après `R.ecrans.briefing.duree`, lancement ordinaire → briefing | 80-ecrans ne commande aucun état. Les départs explicites des pilotes en plongée restent inchangés. Patch livré, fichier réservé non modifié |
| codex-p12 | `90-boot.js` | appliquer `tools/codex-p12/raccord-date.patch` : publier `S.jour` sous forme AAAAMMJJ à la date de Paris, avant le premier `game.reset`, puis au retour au premier plan si le jour change | le lot respecte `S.jour` et n'introduit pas de lecture de l'heure dans le module de score. Le boot reçu ne publie pas encore ce champ ; le repli fixe sert seulement à jouer en son absence |
| codex-p12 | `tools/mesure/criteres/R-36-raison-de-revenir.mjs` | accepter `prochain() === null` lorsque tous les déblocages sont acquis et que l'écran dit TOUT DÉBLOQUÉ | le test actuel exige un prochain identifiant même après le dernier déblocage, alors que ce dernier doit tomber avant ou à la partie 25. Ne pas inventer un sixième déblocage pour satisfaire ce test contradictoire |
| codex-p12 | `03-socle.js` | appliquer `tools/codex-p12/raccord-schemas.patch` : champs optionnels du journal défi (sélection/bilan, portée, état, progression, date/vague) et du modèle de retour dans S.ecran | rendre les nouvelles traces conformes au validateur public ; aucun champ obligatoire existant retiré. Les trois raccords passent ensemble dans `tools/codex-p12/raccords.mjs` |
| codex-p12 | vérification hors bac | `cd proto-neon && node tools/codex-p12/verifier.mjs` | un Chromium muet, trois profils en série, captures briefing/fin, pixels, zones sûres, cibles, journal et zéro erreur ; aucun lancement navigateur ici |

Les primes des trois nouveaux défis sont versées une seule fois au bilan, sans passer par le seuil de vie bonus de combat. FINIR réutilise ses 50 énergie existantes ; chaque défi de réserve réussi ajoute les 20 énergie existantes. Le défi historique `N.score.defi` conserve ses effets pour ne pas changer les durées/vagues des pilotes ; il reste distinct de la liste `N.score.defis` et de ses journaux portant `portee: partie`. La suppression de ses vies/surcharge est un changement de difficulté à traiter séparément, pas une conservation prouvée par ce lot.

Validation finale du lot VM : instrument historique 10/10 ; 80/80 fins avant/après à temps de jeu, temps de combat et vague identiques ; zéro erreur. Les 22 scores modifiés ne diffèrent que des primes (0 à 31 000 points). Déblocages sur le profil persistant : RALENTI 2, REPLI 9, STYLES 11, GALERIE 11, DÉPART V3 13 ; série complète de 25 parties. Le candidat 40 (premier en 3) est conservé comme échec, puis réglé à 25. Après ce réglage, les deux branches de fin nouvellement concernées sont rejouées seules et vérifiées. Construction sortie 0, script Playwright prêt et non exécuté, trois raccords vérifiés ensemble en VM. Les réserves de qualification navigateur et de schémas sans intégration restent explicites dans le rapport.
## codex-p14 — LASSO et APOGÉE, changement de méthode

18/10/2026 · 02 h 36 (Paris). Mission explicite : corriger les politiques humain/bon/expert, jusque-là gelées pour le réglage p5. Aucun seuil, réglage de difficulté ni règle de détection changé. Point de reprise : `tools/codex-p14/methode.md`, calibration et reçus dans le même dossier.

| mission | fichier | besoin / ajout | raison |
|---|---|---|---|
| codex-p14 | `02-regles.js`, ajout `pilotageLasso.trainePart = 0.5`, `rayonVirageMarge = 1.25` | rayon = (corps + moitié de la traînée utilisable) / 2π, au moins 1,25 rayon de virage | viser le milieu de la fenêtre réelle de fermeture ; laisser de la marge au bruit humain et au retour de réaction |
| codex-p14 | `02-regles.js`, `pilotageLasso.margeCible = 2`, `angles = [0,-0.35,0.35,-0.7,0.7]`, `margeMur = 14` | marge de deux pixels en plus du rayon de contact ; cinq orientations latérales ; quatorze pixels entre cercle et mur | cibler une boucle immédiatement traçable de côté, plutôt qu'une poursuite du barycentre ; ne pas planifier un cercle qui touche le mur |
| codex-p14 | `02-regles.js`, `pilotageLasso.gainRadial = 1.2`, `correctionMax = 0.7`, `prevision = 0.16` | gain de correction, saturation en radians et horizon de danger en secondes | tenir le cercle avec les vraies entrées et le retard existant ; prévoir assez tôt une collision pour réagir |
| codex-p14 | `02-regles.js`, `pilotageLasso.progressionFin = 0.25`, `tempsMarge = 0.6`, `intervalle = 0.9` | dépasser le tour de 0,25 rad au maximum ; marge de 0,6 s ; au moins 0,9 s entre départs | fermer effectivement avant de sortir du geste ; borner l'essai et éviter les impulsions en rafale ; le délai de LASSO du jeu reste 0,8 s |
| codex-p14 | `02-regles.js`, `pilotageLasso.ciblePoids = 12`, `capPoids = 4`, `apogeeCibles = 2` | poids par cible, coût du changement de cap, deux ennemis visibles pour dépenser l'APOGÉE | choisir une boucle utile et conserver une direction stable ; utiliser la jauge pleine en partie sans attendre huit ennemis à l'écran ; aucun changement de charge ni de dégâts |
| codex-p14 | `refonte/lots/pilotes.md`, mise à jour par la cheffe | remplacer les paragraphes LASSO gelés par la politique livrée et noter les actions de soutien de la boucle | la présente mission autorise explicitement cette évolution structurelle ; `pilotes.md` reste hors de la réservation p14 |
| codex-p14 | exécution hors bac | `cd proto-neon && node tools/codex-p14/verifier.mjs` | serveur libre et Chromium interdits ici ; vérifier le bundle final sur trois profils, état, journal, dégâts et tampon réels ; un seul Chromium muet |

Détection `70-joueuse.js` : pas de modification tant qu'aucune boucle valide manquée n'est démontrée. Les fixtures sur l'état reçu acceptent les boucles fermées sur cible fixe/mobile et à 1/3/6 px ; refus à 10 px, aire insuffisante ou traînée expirée. Voir `cas-avant.json`. Le fichier de spécification est réellement `proto-neon/REFONTE.md`, pas `refonte/REFONTE.md`.

codex-p14 — mis à jour le 18/10/2026 à 02 h 56 (Paris). **Lot arrêté après 4/4 variantes, candidate 2 retenue ; R-34 et cible LASSO expert non validés.** Sur les mêmes vingt graines reçues : humain 8–20 = 0/277 → 6/63 (9,52 %), 30–40 = 3/154 → 38/182 (20,88 %) ; expert médiane LASSO 0 → 7,5 pour ≥10, APOGÉE 0 → 5 pour ≥2. Les variantes 3/4 de retour sur traînée sont rejetées, leurs politiques/configurations restent archivées. Contrôle final 40/40 identique à la candidate jusqu'au journal complet ; dix régressions des autres pilotes identiques ; cinq graines bon appariées finies sans erreur. Calibration e1bdc6f 10/10 ; détection 38 cas par état (30 positifs et 8 négatifs conformes), gestes isolés 122/240 → 240/240, sans coupe ni erreur. Les gestes isolés n'actualisent pas l'arsenal : ils ne qualifient pas les vraies formations. Build sortie 0, aucun commit. Aucun changement de 70-joueuse, aucun patch de détection justifié. Le rapport `tools/codex-p14/rapport.md` publie les échecs, les cas et les limites ; Playwright est prêt et non exécuté. Prochaine dépendance : résultats de `verifier.mjs` hors bac ; résoudre le taux de capture des cibles réelles exige encore une nouvelle hypothèse structurelle. Aucun seuil d'acceptation modifié.


## codex-p18 — score de maîtrise

18/10/2026 · 03 h 05 (Paris), mis à jour à 03 h 05. Candidate 1 retenue ; aucun seuil de critère changé.

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p18 | `02-regles.js`, ajout `score.maitrise.continuiteFenetre = 5` s | prime du supplément de multiplicateur pour des kills liés sur 5 s, en réutilisant `score.mult.pas/max` | la fenêtre de combat de 2,5 s est courte (couverture E1/manque 10). La continuité de score tolère les cibles espacées sans changer la chaîne publique, le défi historique, ses vies/surcharge ni les primes de p12 |
| codex-p18 | `02-regles.js`, ajout `score.maitrise.survie = {palier:15,max:4}` | +1 base de cible par tranche de 15 s sans mort, plafonné à +4 bases, uniquement sur un vrai kill attribué à une arme ou à la joueuse | rémunérer la maîtrise active sur la durée, jamais l'attente ou une purge ; remise à zéro à chaque mort/CONTINUER ; valeurs du premier candidat validé en VM, pas seuils de critères |
| codex-p18 | `02-regles.js`, ajout `score.maitrise.danger.mur = 12` px | prime de risque si kill près d'un mur ; bout portant réemploie les 24 px et le facteur 2 existants | un vrai kill sans invulnérabilité, à proximité de la menace, mérite plus qu'un kill à l'abri ; une seule prime même si les deux conditions sont réunies |
| codex-p18 | `02-regles.js`, ajout `score.maitrise.lasso = true` | complément jusqu'à somme des bases tuées × ennemis enfermés × multiplicateur final | appliquer la formule LASSO du § 2.12 ; seules les morts du geste courant paient, une seule fois, sans rente sur les survivants |
| codex-p18 | `77-score.js`, ajout `stats.points` et cumul interne des anciens points de combat | séparer l'attribution réelle des nouvelles primes et la progression inchangée de la vie bonus | le score reçu agissait sur les vies : les nouvelles primes comptables ne doivent pas changer la difficulté, le temps ou la vague des pilotes. La chaîne, le multiplicateur et les effets reçus restent identiques ; aucune modification d'un autre module |

La prime de continuité est une prime distincte ; le HUD garde le multiplicateur de la chaîne de combat § 2.13, pas un faux multiplicateur de 5 s. Les nouveaux points entrent dans le score, les gains flottants et les records existants. Aucune prime forfaitaire pour APOGÉE ou pour le temps passé. Les primes de p12 restent versées au bilan. Preuves et commande hors bac : `tools/codex-p18/rapport.md`.

Validation codex-p18 : VM historique 10/10 exactes ; 50 graines par bon/kamikaze/tourneur. Scores médians bon/kamikaze : 2,218742 avant → 3,332277 après (cible ≥1,3) ; tourneur/bon : 0,003902 → 0,003464 (cible <0,10). Le seuil bon/kamikaze était donc déjà tenu sur l’état reçu, distinct du constat p5 de 0,9995 ; ne pas attribuer cette entrée à p18. 80/80 parties obligatoires à temps/vague identiques ; contrôle élargi 200/200 paires à temps/vague, morts, cartes, défis p12 et journal réel complet identiques. 400 fins sans erreur et attribution exacte des points ; huit scénarios ciblés satisfaits. Build sortie 0, règles en ajout seul et périmètre contrôlés. Aucun serveur/Chromium lancé ; script trois profils prêt, qualification navigateur à vérifier hors bac.


## codex-p17 — finition briefing, pause et fin ; R-36 terminal

18/10/2026 · 02 h 52 (Paris), mis à jour à 03 h 15. Mesures et statut final : `tools/codex-p17/rapport.md`.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p17 | `02-regles.js`, ajout `ecrans.retour.finition.marqueW = 18` | réserve de 18 pixels de jeu pour la marque ✓ / ·, à l'échelle 2 existante | aligner le nom et la progression de chaque défi sur une seule ligne, sans rogner la marque |
| codex-p17 | `02-regles.js`, ajout `ecrans.retour.finition.defisCourts` | PREMIER JET → 1ER JET ; SANS COUPE → INTACT ; SANS FILET → UNE VIE ; LASSO / CHAÎNE gardent leur compteur à droite | garder des noms entiers et lisibles dans la colonne disponible, sans baisser l'échelle 2 ; le libellé long est conservé lorsqu'il tient |
| codex-p17 | `80-ecrans.js` | trois blocs en portrait, espaces égaux calculés avec la place réellement disponible ; barre de prochain déblocage aussi au briefing et à la pause | répartir l'écran jusqu'aux actions plutôt que tasser tous les textes en haut ; dimensions et cibles existantes réemployées |
| codex-p17 | `80-ecrans.js` | cause principale sans le suffixe INSTABLE si nécessaire ; cause complète, temps, note, build et récompenses dans BILAN | les causes longues ne doivent pas repousser le prochain palier sous la zone sûre ; aucune donnée du bilan supprimée |
| codex-p17 | `tools/mesure/criteres/R-36-raison-de-revenir.mjs` | exiger tous les identifiants de `N.R.deblocages` dans `N.score.deblocages`, prochain nul ET texte TOUT DÉBLOQUÉ réellement peint et dans la zone sûre | reconnaître le terme du vrai catalogue, sans sixième récompense ; seuils de déblocage 25 / 180 / 350 / 550 / 800 et bornes parties 1–2 / 12–25 inchangés |
| codex-p17 | vérification hors bac | `cd proto-neon && node tools/codex-p17/verifier.mjs` | un Chromium muet, trois formats, 72 captures avant/après (briefing/pause/fin, défis zéro/en cours/faits, dernier palier acquis), buffers, journaux et erreurs ; ne pas lancer dans ce bac |

Aucun autre propriétaire sollicité pour un raccord. Les fixtures de défis des contrôles de composition sont explicitement synthétiques ; le dernier palier est acquis par le vrai bilan du score depuis son seuil moins une unité. Les PNG `tampon-vm/` proviennent du tampon VM sans DOM et ne sont pas des captures Playwright. Aucun commit.

Codex-p17 — finition finale : suppression du titre PROCHAIN isolé et des groupes FINIR LE / SECTEUR, 2 DÉFIS DU / JOUR ; FINIR puis 2 DÉFIS, nom du prochain palier et reste sur une ligne. 80/80 parties du moteur identiques (temps jeu/combat, vague, score, empreinte du journal), zéro erreur ; rendu final 36/36 cas, variantes extrêmes sans débordement, R-36 terminal 8/8, build sortie 0. Les derniers textes modifient seulement retourModele : réutilisation des reçus du moteur inchangé vérifiée dans tools/codex-p17/reutilisation-parties.json ; contrôles de rendu rejoués. Captures, Safari et R-36 complet sur 25 parties persistantes restent à vérifier hors bac. Aucun commit.

## codex-p4d — CYCLOPE, annonce d’arène et critère R-31 (18/10/2026 · 02 h 52, Paris)

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p4d | `02-regles.js`, ajout `colosse.entreeHorsVue` | `mursEntree=[-10005,-10006,-10007,-10008]`, `mursPhase3=[-10009,-10010,-10011,-10012]` | identités des quatre frontières pour chacun des deux glissements du boss, distinctes des murs de 73-arene ; empêcher de réutiliser l’annonce du glissement précédent. Aucun délai, dégât ni seuil nouveau : garde de `arene.travelling.annonce=2`, marge et géométrie existantes réemployées |
| codex-p4d | `73-colosse.js` | naissance réelle de l’œil au-dessus du cadre et des mains sur les côtés ; mouvement continu jusqu’à leur position de combat ; annonces `S.tele` et dessin avant les deux `world.arena` | `REFONTE.md:2894` R-06 impose 0 apparition dans la vue, sans exception « boss annoncé » ; R-31 et §4.6 imposent le préavis de 2 s. Aucun événement d’apparition filtré ni renommé |
| codex-p4d | `70-joueuse.js` (attribution seulement) | observer les annonces de murs dans S.tele et porter leur durée observée dans les morts ; rattacher la ligne au pan physique touché | `total=2` ne prouve pas une annonce préalable ; un glissement découvert déjà actif garde une durée attribuée de zéro. Aucun changement de collision, mort, mouvement ou vie |
| codex-p4d | `tools/mesure/criteres/R-31-plateau.mjs` | reconnaître `travellingAnnonce` dans le cycle courant ; rejeter annonce insuffisante, terminée, d’une autre vague/phase, convoi ou départ seul | préserver le seuil strict de 0 mort sans annonce et le préavis de 2 s ; comparer les dates du journal entre elles (S.death.t est local au combat) ; pas de faux événement « travelling » pour faire passer le prédicat |
| codex-p4d | `76-directeur.js` — boîte de Codex | fournir le cinquième VOL réel par partie gagnée, puis refaire le sous-critère R-31 correspondant | exigence `R.vol.parPartie=5` / REFONTE R-31 ; reçu antérieur à 4. Demande seulement : aucun changement de directeur, ni baisse du seuil dans ce lot |
| codex-p4d | contrôle hors bac | `cd proto-neon && node tools/codex-p4d/verifier.mjs` (`--scenes-seules` pour les seules scènes) | script complet, un seul Chromium muet, trois profils successifs, vrais pixels, journaux, naissances et collisions ; serveur/Chromium non tentés dans ce bac. Les preuves VM ne qualifient ni Chromium ni Safari |

État détaillé, campagne complète et écarts de durée : `tools/codex-p4d/rapport.md`. La comparaison des parties bon/humain reste publiée même si les changements du boss la font diverger ; aucun échantillon favorable ne la remplace.

Codex-p4d — mis à jour le 18/10/2026 · 03 h 21 (Paris) : 60 parties avant et 60 après, toutes finies, zéro erreur. Apparitions dans la vue : **15 → 0** sur l’état réellement reçu (les huit de p4c relevaient de son état antérieur). Armements hors vue : 0 → 0 ; morts sans annonce, prédicat final : 0 → 0. Trois collisions contrôlées : durée attribuée 0 → 2 s, ancien comptage erroné 3 → 0 avec le critère corrigé ; annonce physiquement observée ≥ 2 s. **Parité des vingt bon/humain paysage : 17/20, échec publié** (bon/3, bon/6, humain/6 ; vagues identiques, durées différentes). Vingt témoins inerte/tourneur identiques, journaux compris, ne remplacent pas cet échec. Build sortie 0 ; Playwright prêt, non exécuté. R-06 qualifié sur l’échantillon VM seulement ; R-31 global et intégration restent non validés sur parité, cinquième VOL et reçu navigateur.


## codex-p19 — caméra R-12 appariée image par image

18/10/2026 · 03 h 22 (Paris).

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p19 | `tools/mesure/criteres/R-12-explosion.mjs` | mesurer `max(0, max_i(S.shake_impact[i] - S.shake_sans_coup[i]))` sur les 30 images suivant le même coup ; refuser les branches différentes avant coup et les traces incomplètes | éliminer la différence de deux maxima non appariés et le mouvement de suivi. `S.shake` est l'amplitude publique en pixels de jeu, pas une mesure certifiée du déplacement CRT |
| codex-p19 | `02-regles.js` | aucun changement ; seuil lu dans `N.R.criteres.R12.camera = 6`, brasier et durée inchangés | aucun nouveau chiffre de jeu. 0/8/3 px sont les entrées des cas construits expressément demandés ; 3/30/60 images, 70 px, dégâts ×4 et graine 2975 reprennent la fixture reçue ; jour 20261017 reprend le protocole officiel. Les constantes FNV décrivent une empreinte d'instrument, pas une règle du jeu |
| codex-p19 | `tools/codex-p19/verifier.mjs` (exécution hors bac) | `cd proto-neon && node tools/codex-p19/verifier.mjs` | deux bundles reconstruits sans écrire dans p15, trois profils en série, un Chromium muet ; journal, vraies valeurs caméra par image, brasier du tampon, captures et erreurs. Script préparé, navigateur non exécuté ici |
| codex-p19 | propriétaires `50-fx.js` / `79-scene.js` (diagnostic à confirmer hors bac) | examiner les échecs conservés, sans baisse de seuil ni correction prescrite à l'aveugle | VM p15 : élites caméra 3,6864 / 4,2240 / 4,5787 px (<6), flèche brasier 0 image. VM intégrée : caméra élites 10,1606 px (≥6), brasier 0 image pour les trois. Résultats réels VM, pas une qualification navigateur ; reçus `tools/codex-p19/*-vm.json` |

Aucun fichier `src/`, aucun `sonde.js`, aucun seuil changé ; aucun commit. Build intégré : sortie 0, `index.html` sans différence Git. Build p15 : sortie 0 vers un fichier du dossier codex-p19, copie p15 en lecture seule. Rapport et limites : `tools/codex-p19/rapport.md`.


## codex-11 — directeur réglable et première minute (18/10/2026 · 03 h 10)

Ordre10 de Claude. Ajouts N.R.directeur uniquement ; paramètres historiques transférés depuis CFG sans nouveau sens (énergie libre2,6s/min3, mines12, traqueurs2, géométrie24/1,15/70/16, espacements14/13/30/24, essais60, remplissage2/10/0,85, quota0,9 et minimum5s). Les effectifs de toutes les formations lisent N.R.formations ; tailles de réservation identiques aux tailles produites, NUÉE réservée par sa borne haute. Le plafond s'applique à chaque spawn du directeur, même après20s, sans dérogation.

Hypothèse passe1 (pas encore mesurée) : budgets respiration incluse V1=23,5s, V2=38s, V3=44s ; V4/V5 gardent tout leur combat48/50s et leurs paramètres. V1 quota8, intervalle4s, plafonds3→4→6 aux temps0/8/12s, FILE2, NUÉE2–3, calendrier FILE0/8s et NUÉE12s. V2 intervalle2s, plafonds4→8→16 aux temps0/12/26s, MEUTE3, NUÉE2–4. Objectif : apprentissage puis montée progressive. La respiration>=8s reste réelle ; après son achèvement, fin de vague sans attendre une queue définitivement suspendue ni la soupape. Seuils p5/R35/R31 inchangés, aucun pilote modifié.

Méthode et paire figée : tools/codex-11/. Au plus3 passes20graines, arrêt2 sans nouvelleB puis une qualification50graines, pas de réglage après le final. Les naissances autonomes des RUCHES appartiennent à72 ; les contrôles de plafond du directeur ne prétendent pas vérifier ses producteurs externes. Cinquième VOL : à vérifier sur le raccord codex-10 déjà intégré, avant d'en modifier le nombre.


codex-11 — passe2, 18/10/2026 · 03 h 32 : après160/160 fins de passe1 (11B, maladroit56,32s dans45–150, humain213,07s au-dessus210, bon35% au-dessus30), une seule variation àmesurer : `R.directeur.vagues.1.plafonds.1.n`8→10 au temps12s deV2. Départ4, fin16 à26s, autres chiffres et V4/V5 conservés. Hypothèse de pression intermédiaire, aucun effet revendiqué avant mesure. Dieu passe1 médiane379,18s mais plage328,37–457,39 : critère toutesparties non validé. Budget : deuxième passe sur troismaximum, contrôlefinal50graines encoreàfaire.


codex-11 — passe3 (dernière), 18/10/2026 · 03 h 41 : passe2 rejetée (158/160 fins, bornes bon/2 et dieu/2 ; humain247,78s, expert25% de victoires ; zéro erreur ; aucune nouvelleB). Repartir de passe1, faire varier seulement `R.directeur.vagues.1.dureeMax`38→34s, respiration8s maintenue et plafond intermédiaire8 rétabli. Hypothèse de compression de V2, pas d'effet revendiqué avant mesure. V1 et V3–V5 conservées. Après cette passe, choisir puis figer ; aucune passe4, aucune retouche après qualification50.

## Demande du cloud (18 octobre, 03 h 45) — au chef d'orchestre : ce qui reste du tableau « Prochains chantiers »

Le voyage entier est jouable dans le vrai jeu (1976 → 1982 → 1987 → 1993 la grille → 2001 → 2975 → fin, puis LUI,
retrouvailles, teaser ; bancs `tools/voyage`, `tools/aventure`, `tools/films`, `tools/grille`, `tools/cosmos`).
Ce qui reste touche le cœur du jeu, où les sessions Codex qualifient en parallèle (parties identiques avant/après) :
je ne l'ai donc pas pris, pour ne pas fausser leurs mesures. À ordonner quand les qualifications en cours sont closes :
1. **Le tempo (n° 1)** : le lot H joue déjà chaque morceau à SON tempo (115 à 128 BPM, `N.music.tempo()`). Reste la
   grille du jeu (`N.R`, vagues, décor, VOL) qui suit `N.music.tempo()` au lieu d'une constante, et les changements
   mis en scène sur une barre (montée de vague, demi-temps à l'INVERSION et au RALENTI, frein puis reprise au CYCLOPE).
   Les époques 1976, 1982, 1993 et 2975 font déjà ainsi dans leur propre musique (modèles : `66-grille.js`, `67-cosmos.js`).
2. **Les régénérateurs à ramasser sur le terrain (n° 4)** : `71-butin.js` (libre) ; modèle jouable dans `66-grille.js`
   (régénérateur qui fait repousser le serpent) et `refonte/prototypes/la-grille.html`.
3. **Les ennemis « serpent » de 2030 (n° 8)** : tique, voleur, miroir, brouilleur — `72-ennemis.js` et leur entrée
   dans les vagues par `76-directeur.js` (réservé à codex-11).

**Réponse de la cheffe d'orchestre (18/10, 03 h 45)** à la demande du cloud de 03 h 45 : point 2 (régénérateurs) confié à codex-p26, point 3 (ennemis « serpent ») à codex-p27 (entrée dans les vagues par correctif du directeur, appliqué après codex-11) ; point 1 (tempo de la grille du jeu) ordonné dès que codex-p20 (mixage) libère `30-music.js` et codex-11 le directeur.


codex-11 — réparation avant qualification, 18/10/2026 · 03 h 45 : deux échecs reproduits sur le TRAQUEUR au plafond régulier et après refus au plafond dur. La garde de vague ne compte pas le TRAQUEUR hors quota ; la garde totale40 le compte. Un mk refusé ne consomme plus l'annonce ni le compteur.18contrôles conformes après. Valeurs candidate1 préparées pour final50 (candidate3 a déjà bon/2 àla borne, collecte en cours). La file attend sa terminaison réelle avant le choix définitif et le final ; source corrigée donc aucun recyclage des160anciens comme qualification du correctif. Aucun nouveau réglage numérique et aucune passe4.

## codex-p23 — mouvement réduit et contre-jour du décor (18/10/2026)

| lot | fichier | besoin | raison |
|---|---|---|---|
| codex-p23 | `02-regles.js` | Ajout seul `R.decorContrejour = { rangs: 4, rangsPortrait: 8, encre: 'acier' }` | Contre-jour froid à Bayer fixe sur les matières sombres du ciel ; 4 rangs/16 en paysage et bureau, 8/16 en portrait où l'horizon couvre moins d'écran. Conserver nuit profonde, vide, sol et tous les seuils 01b/p13. Premier essai à 4 partout : portrait 14,31–15,21 %, sous la cible R-11 18–28 %, échec conservé dans tools/codex-p23/essai-contrejour-4-mesures-apres.json. |
| codex-p23 | `72-ennemis.js`, `73-colosse.js`, `40-sprites.js` (propriétaires concernés) | Corriger la gaine des menaces qui reste incomplète ; pas de retouche dans ce lot | Mesure ambiante sur l'état reçu : colosse paysage 789/945 bords nuit profonde, bureau 335/603, portrait 209/3066 ; seuil strict 1 conservé. Une flèche dirigée, déplacée par ses coordonnées publiques, donne 100 % dans les trois ambiances paysage. Reçus dans tools/codex-p23/cas-construits.json et mesures-avant/apres.json. Vérifier aussi les bords artificiels créés par occultation au masque et les appendices du boss avant d'attribuer chaque défaut au sprite. |
| codex-p23 | `79-scene.js` (codex-p15) | Aucun correctif demandé pour le gel réduit dans l'état reçu | Cause isolée dans 50-fx : l'allumage eIgn avançait à dt=0 ; pixels du tampon R-28 dirigé désormais immobiles sans toucher au module scène. |
| codex-p23 | `72-ennemis.js` (propriétaire concerné) | Documenter une fixture de pose visible si besoin, option direct non reconnue | R-11/R-28 employaient direct:true ; spawn() applique quand même la naissance hors champ. Les critères de ce lot n'écrivent aucun champ privé : ils déplacent seulement x/y publics après spawn. ext:true est réservé aux objets externes, ignorés par drawEnemies, et n'est pas employé dans le résultat livré. |

## codex-p29 — R-08, diagnostic seulement (18/10/2026)

Date et heure de publication : voir `tools/codex-p29/rapport.md`. Aucun fichier src ni chiffre de jeu ajouté ou corrigé par ce lot.

| Mission | Fichier | Besoin | Raison |
|---|---|---|---|
| codex-p29 | 70-joueuse.js / 72-ennemis.js | Conserver la provenance et l'historique de visibilité du danger lors d'une mort ; distinguer durée inconnue et zéro observé, visibilité du portail, de l'auteur et du projectile | La bascule brute est isolée sur 51c9aa1 (réglage p5) ; infoSource reste inchangé mais ignore les portails et les auteurs retirés de la liste. Rapport et journaux dans tools/codex-p29/ |
| codex-p29 | 72-ennemis.js | Publier une identité stable et le type réel de la mèche INSTABLE, conservés jusqu'au souffle | Le souffle de la ruche 531 est attribué à mine/id -1 ; le disque est géométriquement visible pendant plus que le seuil, mais visibleDepuis est zéro |
| codex-p29 | 73-arene.js / 70-joueuse.js | Raccorder une source publique de convoi avec son historique d'annonce et sa visibilité effective | Les deux morts convoi de 318ce61 reçoivent zéro par construction ; pour expert/1, distinguer la voie annoncée du corps du convoi, qui n'atteint pas le seuil de visibilité |
| codex-p29 | tools/mesure/criteres/R-08-mort-juste.mjs | Préciser la source par cause et mesurer les durées effectives avec une référence indépendante ; conserver les seuils et exclusions actuels | Aucun zéro sans identité ne doit devenir automatiquement conforme ; le cas traqueur/bon/4 demande une vérification des pixels |
| codex-p29 | tools/codex-p29/verifier.mjs | Faire exécuter le script préparé par la cheffe hors bac, puis vérifier le cas limite sur Safari | listen et Chromium sont interdits ici ; aucun essai navigateur exécuté, aucun résultat pixel inventé |

## Demande du cloud (18 octobre, 04 h 45) — finir l'inscription des ennemis serpent de 2030 (fichiers réservés ailleurs)
**FAIT le 18/10 vers 05 h (Claude cloud), par ajouts disjoints des zones réservées** : `tique`, `voleur`, `miroir`, `brouilleur`
au NOMS et au DE de `03-socle.js` ; `N.joueuse.frein(facteur, duree)` dans `70-joueuse.js` (facteur 1 sans frein : virage
identique), la TIQUE accrochée freine à ×0,75. Parties directes identiques (3 graines × 2 protocoles).
Livré : TIQUE, VOLEUR, MIROIR, BROUILLEUR (`72-ennemis.js`, `72-serpents.js`, en aventure seulement) et la pénalité
« BUTIN VOLÉ » (−40 par objet, `N.score.retirer`, nouvelle API de `77-score.js`). Reste, dans des fichiers réservés :
1. **`03-socle.js`** (codex-p21) : inscrire `tique`, `voleur`, `miroir`, `brouilleur` au contrat (liste des ennemis,
   noms affichés, auteurs des événements, schémas) ; sans cela, une mort par contact affiche « ENNEMI ».
2. **`70-joueuse.js`** (codex-p30) : une API publique pour freiner le virage (par exemple
   `N.joueuse.frein(facteur, duree)`), pour que la TIQUE accrochée alourdisse le serpent comme dans 2030.

**Cheffe d'orchestre (18/10, 04 h 44) — erreur d'ordonnancement reconnue** : à 03 h 45 j'ai lu « ennemis serpent » comme à faire, alors que la
demande du cloud ne laissait que leur entrée dans les vagues ; codex-p27 a refait les quatre ennemis dans `72-ennemis.js`. Ils ne sont pas
intégrés. codex-p27b garde la version du cloud (`72-serpents.js`) comme base, y reporte les apports mesurés de p27 et prépare l'entrée dans
la partie. Claude cloud : merci de ne plus toucher `72-serpents.js` pendant p27b.

## codex-p22 — sans le son, cyan réservé (R-27, R-03)

18/10/2026 · 04 h 05 (Paris), mis à jour à 04 h 05. 80 paires vérifiées ; qualification navigateur à vérifier hors bac. Statut et chiffres dans tools/codex-p22/rapport.md. Aucun seuil modifié.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p22 | `02-regles.js`, ajout seul `arene.signaux = {hz:1,marge:7,pasY:20,pasX:6,colonnes:4}` | accent à 1 pas/s, marge 7 px, lignes espacées de 20 px, colonnes de 6 px, quatre chevrons persistants | remplacer l'apparition/disparition rapide par un signe permanent, rabattu dans la vue quand le mur arrière est hors champ ; conserver les dimensions déjà présentes dans le dessin, ralentir son accent, sans changer annonce, délai ou déplacement |
| codex-p22 | `73-arene.js` | retirer le clignotement d'extinction du chevron convoi ; sillage ambre/jaune ; publier l'interface `battement(actif)` | maintenir l'information visuelle sans le son, réserver le cyan à la joueuse ; garder 73-arene seul émetteur des événements d'arène |
| codex-p22 | `17-vol.js` | réaffecter cyan/cyan pâle du fond à indigo/ardoise AVANT le dessin de la joueuse ; marquer le fond comme décor | fermer les deux entrées du décor (poursuite/destination) à une fuite de cyan ; palette existante, aucun pixel de joueuse recoloré, aucun propriétaire inventé d'après sa couleur ; test par mutation volontaire du producteur |
| codex-p22 | `79-scene.js`, `tools/codex-p22/raccord-79-scene.patch` | appliquer le raccord de journal : à l'entrée et à chaque cycle de la vignette, appeler `N.arene.battement(true)` ; à la sortie, `false` | le son `music.danger` et les bords existent déjà dans ce module réservé ; même déclencheur et même phase, sans ajouter de nouveau danger ni modifier le son ; le fichier réservé n'a pas été modifié |
| codex-p22 | `03-socle.js`, `tools/codex-p22/raccord-03-socle.patch` | ajouter les valeurs `battement` et `battementFin` à l'enum `CH.arene.evt` | accepter les vraies entrées de journal sans erreur de schéma ; appliquer ce raccord avec celui de la scène |
| codex-p22 | `tools/mesure/criteres/R-27-sans-le-son.mjs` | reconnaître annonce ET départ du travelling ; reconnaître `vol.debut` pour le souffle de VOL ; compléter l'absence de convoi naturel par un vrai cas construit ; mesurer les pixels et le journal du battement | ne pas confondre début de l'annonce, départ effectif et souffle du VOL ; une absence ou un journal sans dessin ne vaut jamais réussite ; seuil 1 et tolérance 0,1 s inchangés |
| codex-p22 | `tools/mesure/criteres/R-03-cyan-reserve.mjs` | armer le masque avant la première scène, examiner trois profils et les deux balayages du VOL | régler le cas calme par l'interface de propriété et observer le rendu complet ; seuil strict 0,005 inchangé |
| codex-p22 | hors bac | après raccords et build : `cd proto-neon && node tools/codex-p22/verifier.mjs --criteres` ; renvoyer `tools/codex-p22/navigateur/resultats.json` | serveur HTTP et Chromium impossibles ici : aucune tentative. Script complet, un Chromium muet, profils successifs paysage/portrait/bureau, captures des vrais tampons, journaux et R-27/R-03 avant/après |

Les raccords sont essayés ensemble en mémoire par `raccords.mjs`, sans écrire les modules réservés. La référence e1bdc6f valide seulement l'instrument ; les 80 parties appariées se comparent sur l'état reçu. La batterie navigateur historique n'est pas présentée comme une mesure VM actuelle. Les sources avant, les échecs du banc et les reçus sont conservés dans le dossier de mission.

## codex-p24 — attraction R-19 et briefing portrait regroupé

18/10/2026 · 03 h 39 (Paris), mis à jour à 04 h 03. Résultats détaillés et limites : `tools/codex-p24/rapport.md`.

| mission | fichier | besoin / ajout | raison |
|---|---|---|---|
| codex-p24 | `02-regles.js`, ajout `ecrans.attraction.presentation` | galerie `fleche/tourelle/sentinelle/mine`, réserve sprite 32 pixels de jeu, trois records maximum | montrer les ennemis et les records dans la boucle existante sans rogner les noms en portrait ; aucun nouveau délai, aucune règle de combat modifiée |
| codex-p24 | `79-jeu.js` (fichier partagé) | intégrer `tools/codex-p24/raccord-79-jeu.patch` : ouvrir l'écran attraction une seule fois, puis conserver son horloge de présentation entre les reprises de la démo ; restaurer séparément les deux canaux audio | les 20/6/5/4 secondes de la boucle restent celles de N.R ; les reprises de partie ne doivent pas effacer la galerie et les records ni remplacer des préférences audio asymétriques |
| codex-p24 | `80-ecrans.js` | briefing portrait : réutiliser l'écart existant de 8 pixels, centrer l'ensemble des blocs ; indication DÉPART AUTO à l'échelle 2 sur les trois profils | supprimer les deux grands vides sans réduire le texte ; aucune nouvelle constante de composition ; fin et pause restent inchangées |
| codex-p24 | `tools/mesure/criteres/R-19-attraction.mjs` | départ titre explicite, mesure des volets sur l'état publié et les pixels peints, contrôle du retour titre et de zéro erreur | `ui.actif()` est un booléen ; un appel à `spr.text` ne prouve pas un texte visible ; garder strictement 15 ± 1 s |
| codex-p24 | vérification hors bac | `cd proto-neon && node tools/codex-p24/verifier.mjs` | un Chromium muet, trois profils en série, compositions p17, captures titre/briefing/fin/attraction, buffers et journaux ; le script prévisualise le raccord 79 en mémoire tant qu'il n'est pas intégré. Safari physique reste une vérification distincte |

Le fichier `79-jeu.js` n'est pas modifié ici ; le candidat est exercé uniquement dans la VM et dans la prévisualisation du vérifieur. Aucun besoin de raccord dans `90-boot.js` reçu ; aucune modification de `60-intro.js` nécessaire pour le briefing public concerné (OBJECTIFS/ÉNERGIE/DÉFIS). Le reçu de batterie ancien rapporte null après 25 secondes ; sur l'état reçu, le départ est déjà observé à 15,008 s en VM. Cette différence n'est pas attribuée à p24. Aucun commit.

Codex-p24 — fin des contrôles locaux : 10/10 calibrations historiques exactes ; 80/80 paires identiques (temps jeu/combat, vague, score, journal SHA-256), zéro erreur ; 36/36 compositions p17 conservées. R-19 construit : 15,008333 s avant et après, 7/7 mesures après ; cas absent / 13,05 / 17,05 s refusés. Modèle final dans le champ déjà prévu S.ecran.retour : 4/4 volets conformes au schéma. Construction sortie 0. Le seul changement après gel des parties déplace une affectation de métadonnées de dessin ; réutilisation exacte des reçus vérifiée par reutilisation-parties.json. Chantier bloqué pour la qualification finale : intégration du raccord 79, contrôle Playwright hors bac et Safari réel.

## codex-p28 — restaurer le contenu de fin R-18

18/10/2026 · 04 h 20 (Paris). Reçus et limites : `tools/codex-p28/rapport.md`.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p28 | `80-ecrans.js` | rendre sur la fin principale quartier, progression, record, écart disponible, build, note et conseil, avec les défis et l'énergie | rétablir R-18 sans cacher ces rubriques derrière BILAN ; le résumé vient de l'interface publique `N.score.resume()` |
| codex-p28 | `80-ecrans.js` | `CONTINUER ?` et décompte existant 9 → 0 ; largeur tirée de la mesure du libellé, boutons empilés en portrait | garder la phrase entière à l'échelle 2 et les cibles existantes de 44 pt ; la garde, la disponibilité, le score et les vies ne changent pas |
| codex-p28 | `80-ecrans.js` | composer les lignes avec les constantes existantes de `ecrans.retour` : échelle 2, texteH 14, ligne 18, marge 5, padding 4, écart 8, barreH 3, deux colonnes ; mesurer les accents dans le vrai sprite | aucune nouvelle constante numérique dans le jeu ; l'espacement est calculé sur les glyphes et la place sûre, sans réduire la police ni écraser les accents |
| codex-p28 | `80-ecrans.js` | le sprite de la phrase complète fournit les glyphes des lignes repliées ; cause longue sur la largeur disponible, conseil en bas sur toute la largeur | conserver un texte complet réellement rendu et les rubriques du critère R-18 inchangé, sans appel de texte factice ; éviter les titres et prépositions isolés signalés par p17 |
| codex-p28 | `80-ecrans.js` | arrêter la zone tactile de pagination BILAN avant le premier des boutons empilés | CONTINUER reste actionnable lorsque le bilan détaillé est ouvert en portrait |
| codex-p28 | vérification hors bac | `cd proto-neon && node tools/codex-p28/verifier.mjs` | un seul Chromium muet, trois profils en série, compositions p17/p24, défaite, victoire, décompte complet, R-18 réel, tampons et journaux ; script prêt, non exécuté dans ce bac |

Aucun raccord demandé dans un autre module. `02-regles.js` est strictement identique à l'état reçu : aucun chiffre de jeu ajouté. Les modifications p24 reçues et son raccord 79 encore non intégré sont conservés. Aucun commit, serveur, Chromium ou réseau sortant dans ce lot.

Codex-p28 — mis à jour à 04 h 22 (Paris) : calibration 10/10 exacte ; R-18 inchangé à 12/12 sur chacun des trois profils après, contre 6/12, 6/12 et 5/12 sur p17 et l'état p24 reçu ; 36/36 compositions avant et après, 24/24 briefing/pause strictement identiques, 39/39 fins avec glyphes intacts, 80/80 parties strictement identiques jusqu'au journal SHA-256, zéro erreur VM. Build sortie 0. Les dernières différences après chargement des parties sont bornées et leur réutilisation est vérifiée dans `reutilisation-parties.json`. Livraison locale terminée ; captures navigateur et Safari restent à vérifier hors bac.

## codex-p34 — cohérence des cibles B, analyse seulement

18/10/2026 · 05 h 07 (Paris), mis à jour à 05 h 07. **Propositions non appliquées** ; aucun fichier src ni seuil modifié. Rapport et reçus : `tools/codex-p34/rapport.md`. Aucun nouveau nombre de règle introduit ; les valeurs ci-dessous reprennent le contrat ou sont des bornes mathématiques explicitement calculées, à ne pas intégrer comme une candidate validée.

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p34 | `tools/mesure/parties.mjs` | distinguer les panneaux génériques de l'arrivée du CYCLOPE ; conserver séparément le temps de l'événement et `charge.t` ; compter les débuts d'APOGÉE | relecture de 40 reçus 318ce61 : maladroit 1 accès publié mais 0 phase d'arrivée ; bon 5 publiés mais 2 phases ; `morts` écrase le temps d'horloge par le temps de combat ; tous les événements APOGÉE ne sont pas des déclenchements |
| codex-p34 | `tools/reglage/analyse.mjs`, `tools/mesure/criteres/R-04-difficulte.mjs`, `refonte/lots/pilotes.md` | publier médiane des défaites et médiane de toutes les fins avec leurs effectifs, puis fixer explicitement celle associée à la cible inchangée 120–210 s | humain actuel : 94,75 s sur 6 défaites contre 289,66 s sur 10 fins ; ces échecs sont de sens opposé. Le taux de victoire ne suffit pas à prouver une contradiction avec une médiane conditionnelle |
| codex-p34 | `73-colosse.js`, `76-directeur.js`, `79-jeu.js`, `tools/mesure/parties.mjs` | raccorder un repère de fin du combat réellement produit avant la fin de la partie ; garder les seuils 55–90 s et 320–390 s | phase/mort manque dans les 10 victoires dieu actuelles et les 5 de 318ce61 ; la voie `bossMort` passe en victoire avant la cascade du colosse. La durée entrée→section/victoire est publiée comme autre définition, sans remplacer silencieusement le critère officiel |
| codex-p34 | `85-pilote.js`, `refonte/lots/pilotes.md` | faire réviser puis geler les politiques : humain 120 ms, ±10°, bruit 0,25 s et ACTIONS AUTO sans impulsions manuelles ni compensation anticipée ; bon groupe ≥4 dans 60 px, APOGÉE ≥8 en vue, TRAVERSÉE menace <0,2 s ; expert plan des 24 points, 50 ms ; dieu exactement bon + god, 80 ms | p14 renforce trois politiques mais exclut dieu du nouveau guide ; 180/181 tentatives humaines et 203/203 bon concernent moins de quatre cibles ; aucun étalonnage sur des joueuses moyennes ne justifie ces aides. Proposition sélective, pas retour intégral à l'ancien LASSO ni promesse de 20/20 |
| codex-p34 | `70-joueuse.js`, `02-regles.js` si une correction de géométrie est retenue | étudier le départ et les réapparitions sans changer le mur létal ; toute nouvelle constante doit être ajoutée à N.R par leur propriétaire, puis expliquée ici | trajet initial nu (1021−389,12)/68 = 9,29235 s, donc première mort <8 s impossible en conservant cette géométrie. Distance <544 px nécessaire avant délais ; ce n'est pas une position suffisante testée. Inerte doit rester sans entrée ; trois vies avant 35 s doivent aussi être vérifiées |
| codex-p34 | `tools/codex-p34/verifier.mjs`, hors bac | si nécessaire, exécuter `cd proto-neon && node tools/codex-p34/verifier.mjs` et renvoyer `navigateur/resultats.json` | script prêt, jamais exécuté ici : un Chromium muet, trois profils en série, états, journal, vrais indices du tampon et captures. Aucune connexion sortante ni tentative de serveur local dans ce lot |

Décision recommandée : maintenir l'arrêt du réglage global, corriger l'observation et la définition des pilotes avant un nouveau candidat ; les vingt cibles numériques ont un témoin abstrait commun mais leur réalisation par le jeu actuel n'est pas prouvée. Les seuils, profils, budget de flash, mur létal et morsure-coupe restent inchangés. Les simulations et contre-exemples mathématiques sont séparés dans les données sources.


## codex-p16 — performance de l'image et instruments R-20/R-30

18/10/2026 · 02 h 44 (Paris). Preuves et reprise : `tools/codex-p16/rapport.md`.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p16 | `02-regles.js`, ajout `perf.imageP16` | `bayerCote=4`, `images=600`, `chauffeImages=120` | 4 est la géométrie de la matrice existante ; 600 est la preuve demandée par scène et profil ; 120 images échauffent le banc avant les prélèvements. Aucun chiffre de gameplay, aucune qualité visuelle ni seuil modifiés. |
| codex-p16 | `10-gfx.js`, `78-hud.js` | décisions Bayer par sous-colonne, couronnes par intervalles ; copie opaque de bannières via réserve | réduire parcours inutiles et travail par pixel ; conserver origine, arrondis, clipping, index zéro et masque. Identité des primitives prouvée sans DOM ; sortie CRT à vérifier hors bac. Aucun gain navigateur annoncé. |
| codex-p16 | `tools/mesure/criteres/R-20-performance.mjs` | temps réellement traité = différence de `horloge.reel()` ; conserver ratio historique `t()` en métadonnée | les ralentis et gels voulus ne sont pas des pas perdus. Seuil 0,99 inchangé ; une perte CPU reste mesurée. Témoin calme en VM : 240 pas sans ralenti, deux ratios exactement égaux. |
| codex-p16 | `tools/mesure/criteres/R-30-rejouabilite.mjs` | exclure `hudBanniere` et `flash` seulement entre les modes | ces types décrivent le rendu et le limiteur de lumière ; les comparaisons dessiné/dessiné les gardent. Un kill absent/changé reste refusé. Les nouvelles traces flash du lot p10 exposent aussi les admissions sous-seuil. |
| codex-p16 | `15-decor.js` — codex-p13 | raccord `tools/codex-p16/raccord-15-decor.js.patch`, non appliqué | `taireFondJeu` choisit la même table Bayer par sous-colonne une fois par rangée, puis déroule les quatre écritures. Décor dominant dans le profil VM ; Canvas/CRT et gain navigateur restent à mesurer. |
| codex-p16 | `79-jeu.js` — cheffe d'orchestre | raccord `tools/codex-p16/raccord-79-jeu.js.patch`, non appliqué | vraie divergence additionnelle R-30 sur les sources reçues : caméra avant `pas()` en dessiné, après en simulé. Le raccord avance la caméra au même endroit via update(), une fois. Égalité des 91 entrées de jeu à 15 s en copie VM ; le mode dessiné répété conserve ses 99 traces. Cela modifie la simulation et exige une intégration/revue séparée, pas un filtrage de gameplay. |
| codex-p16 | exécution hors bac | `node proto-neon/tools/codex-p16/verifier.mjs` ; avec raccords en mémoire : ajouter `--raccords` | un Chromium muet, trois profils, quatre scènes, 600 images comparées octet par octet (index + RGBA final), vrai frame/chaque step chronométrés, R-20/R-30 officiels relancés. Aucun listen ni Chromium essayé ici. |

Les reçus navigateur de départ restent en échec : charge 4,5 ms contre 0,8 ms pour 2030, ratio ×4 0,98479. Le CRT reste intact faute de profil réel ; les temps VM ne remplacent pas R-20. Les sources et le bundle initiaux sont conservés dans le dossier de mission ; aucun commit.

Codex-p16 — mis à jour le 18/10/2026 · 03 h 29 (Paris) : 80/80 parties avant/après strictement identiques, toutes finies, journaux compris ; zéro erreur VM et console. 7 200 images de scénarios identiques dans le tampon, plus 600 images réellement en état VOL par profil (deux réarmements publics par profil). 4 200 cas de primitives, zéro différence de pixels ou de masque. Candidate inchangée depuis ces mesures, bundles synchronisés, build sortie 0. Preuve consolidée : `tools/codex-p16/verification-finale.json`. Le banc navigateur, y compris le complément VOL et les raccords optionnels, est prêt et non exécuté ; R-20 global et sortie CRT restent à vérifier. Aucun commit.

### codex-p16b — reprise du vérifieur après le délai expiré hors bac

18/10/2026 · 03 h 41 (Paris), mis à jour à 03 h 41. Reçu initial conservé dans `tools/codex-p16/navigateur/echec-0333.json` : aucun profil ni critère mesuré, attente expirée après 30 000 ms. Ce résultat n'est pas une validation navigateur.

| mission | fichier | besoin | raison |
|---|---|---|---|
| codex-p16b | `02-regles.js`, ajout `perf.attenteP16` | `delaiMs=30000`, `pollingMs=100` | conserver la borne précédente et vérifier les crochets par timer, indépendamment du RAF neutralisé ; aucun seuil R-20/R-30 ni chiffre de gameplay modifié. |
| codex-p16b | `tools/codex-p16/` | reconstruire les bundles depuis le build final, servir `/proto-neon/__avant.html` et `__apres.html`, empreintes sources/fichiers/réponses instrumentées et ressources résolues | éliminer les bundles périmés et aligner art/cine/musique sur l'emplacement du jeu ; avant = même socle final, avec seulement les optimisations de 10-gfx/78-hud retirées. |
| codex-p16b | `tools/codex-p16/verifier.mjs` | diagnostic par iframe avant attente et en échec : crochets, ready, images absentes, état, erreurs, requêtes en 404 ; alternance AB/BA et dispersion | `ready` peut être vrai malgré une erreur Image ; ne pas confondre absence d'image et attente non repollée. Les coûts appariés sans enveloppes de modules sont séparés du profilage et de la qualification complète R-20. |

Les contrôles statiques des deux variantes passent ; 85 références d'actifs par bundle existent localement. Aucun serveur, navigateur ou réseau sortant utilisé ici. Les sources de jeu des 80 parties précédentes restent identiques après retrait du seul ajout des paramètres d'attente (empreinte vérifiée), donc aucune partie validée rejouée. Relance hors bac indispensable : `cd proto-neon && node tools/codex-p16/verifier.mjs`. Rapport de reprise : `tools/codex-p16/rapport.md`.


### codex-p16c — reprise après le reçu navigateur du 18/10 à 04 h 23–04 h 37

18/10/2026 · 04 h 47 (Paris), mis à jour à 04 h 47. Rapport et toutes les mesures : `tools/codex-p16/rapport.md` ; reçu reçu conservé dans `tools/codex-p16/recu-p16b/`.

| mission | fichier | besoin / changement | raison |
|---|---|---|---|
| codex-p16c | `10-gfx.js`, `78-hud.js` | optimisations du lot retirées ; sources exactement restaurées à leur état initial | appariement AB/BA non concluant : charge paysage p95 4 → 3,905 ms, delta médian 0, moyenne −0,0198 ms, écart-type 0,5459 ms ; signe du gain moyen inversé entre AB et BA. Aucun gain maintenu. `20-crt.js` était déjà inchangé. |
| codex-p16c | `02-regles.js`, ajout `perf.rejeuP16` | `facteurBorne=4`, `tranche=0.25` | reprendre la borne ×4 et la tranche de 0,25 s des pilotes pour le rejeu contrôlé ; aucun chiffre de gameplay ni seuil modifié. Les anciens paramètres Bayer/attente du banc restent pour respecter l'ajout seulement. |
| codex-p16c | `tools/mesure/criteres/R-30-rejouabilite.mjs`, `tools/codex-p16/raf-controle.mjs` | RAF contrôlé installé avant boot au rechargement, profil vierge et protocole exact des pilotes ; comparer aussi vraies frames avec/sans dessin | S.frame survit à reset ; une image de chargement suffit à décaler flash.d._image dans les DEUX versions. Aucun champ de flash filtré entre dessins ; témoins négatifs conservés. VM : 492 traces dessinées identiques et 427 types de jeu identiques avec/sans dessin, avant/après. |
| codex-p16c | `79-jeu.js` — cheffe d'orchestre | raccord caméra déjà proposé, non appliqué ; ordre identique de cam.update en dessiné/simulé | premier écart des types de jeu à l'entrée 19, avant comme après ; défaut de simulation antérieur, distinct du compteur d'image de l'instrument. |
| codex-p16c | `50-fx.js` — propriétaire du module | raccord `tools/codex-p16/raccord-50-fx.js.patch`, NON appliqué : borner le nouveau ralenti avec `N.horloge.etat().gel` quand disponible | après le seul raccord caméra, nouvel écart à l'entrée 219 ; à t=36,6833 s, hitstopLeft=10 mais horloge.gel=0, car dbg.simuler ne fait pas avancer S.frame. Caméra + gel public, en mémoire seulement : 427/427 entrées de jeu égales jusqu'à 60 s, zéro erreur. Ne pas intégrer sans revue séparée des effets et des parties. |
| codex-p16c | `tools/mesure/criteres/R-20-performance.mjs` | conserver le ratio des pas réels ; observer pendant la fenêtre phase/pause/temps/qualité/dimensions des deux jeux ; publier aussi le p95 brut en cas d'incomparabilité | ancien reçu SNAKE 2030 sans contrôle après startRun : hypothèse d'écran inactif ou de qualité adaptative, non prouvée. Si 2030 reste actif et stable, le critère conserve strictement snake2975 < snake2030 ; sinon non mesurable, jamais OK. |
| codex-p16c | exécution hors bac | `cd proto-neon && node tools/codex-p16/verifier.mjs` ; reçu neuf `tools/codex-p16/navigateur-p16c/resultats.json` | avant = candidate optimisée reçue, après = optimisations retirées ; mêmes instruments, mêmes scènes et profils, AB/BA, pixels index/RGBA et R-20/R-30 complets. `--raccords` ne teste plus le décor non mesuré : caméra + gel uniquement en mémoire. |

Preuve des 80 parties réemployée sans rejouer le lot validé : sources finales = sources du reçu avant (SHA-256 `2bb363d3ee6f60def19760502a3d1ebaa3812bd6779cef8855f812ec361ca994`) hors seuls paramètres du banc ; sources reçues = reçu après (SHA-256 `46b9c2fcc019b0768a9951d46ab61e2bf6b12ab718df7c5c11cbb04e794f7a51`) hors ajout d'attente. Les deux reçus donnent 80/80 identiques, journaux compris, finies sans erreur. Sources détaillées et vérification exacte dans `tools/codex-p16/diagnostic-p16c.json`. R-20/R-30 navigateur et Safari restent à vérifier ; aucun serveur, Chromium, réseau sortant ou commit utilisé dans ce bac.

## codex-12 — rythme et annonces, 18/10/2026 · 05 h 16

Arbitrage Claude05h08 : regroupement temporel autorisé avec paramètres de combat et effectifs nominaux conservés, écarts de durée≤10%. Proposition unique : V5 groupe par deux ses salves prévues, sans ajouter de salve ; neuf rendez-vous6/11/16/21/26/31/36/41/46 deviennent quatre groupes de deux à11/21/31/41 et le dernier à46. Chiffre dans N.R.directeur.rythme.regrouperSalves. Aucun quota, plafond, PV, vitesse, dégâts ni armement changé. Résultat à mesurer, pas présumé conforme.

Bannières : réserve pendant respiration/transition, entrée de vague prioritaire. Correctifs78-hud/79-scene livrés à Claude ; admissions journalisées au même endroit avec/sans dessin. R14 corrigé seulement selon arbitrage sur admissions réelles, seuil10s inchangé. R15vagues perdues avant pic attend son arbitrage, aucun faux pic émis.

## codex-p27b — un seul système de serpents cloud, aventure et partie

18/10/2026 · 05 h 06 (Paris). Détail, mesures et état de reprise : `tools/codex-p27/rapport.md`, `validation.json`, `reprise.json`.

| Mission | Fichier | Besoin / chiffres | Raison |
|---|---|---|---|
| codex-p27b | `02-regles.js`, ajout `R.serpents.types` | Transfert de toute la table cloud `SERP` de `72-ennemis.js`, valeurs conservées sauf `voleur.arrache.annonce : 0.6 → 0.8` ; configurations TIQUE/VOLEUR/MIROIR/BROUILLEUR accessibles par un seul objet gelé | Éviter les deux implémentations concurrentes ; garder frein ×0,75, pénalité 40/objet, besace 3, champ 42, retard miroir 1,5 s et tous les autres réglages intégrés. Snapshot exact avant transfert dans `tools/codex-p27/recu-sources.json` |
| codex-p27b | `02-regles.js`, ajout `R.serpents.plan` | V2 TIQUE à 9/15 s ; V3 VOLEUR 8 s, TIQUE 26 s ; V4 BROUILLEUR 8 s, MIROIR 24 s ; V5 MIROIR 7 s puis tirage VOLEUR/BROUILLEUR/TIQUE à 22 s | Calendrier cloud transféré sans changement ; même plan partagé par aventure et partie, aucun calendrier supplémentaire dans le directeur |
| codex-p27b | `02-regles.js`, `R.serpents` | `max=2`, `portail=0.9`, `marge=30`, `distanceTete=90` ; `placement={essais:32,bords:4,profondeur:40,interieur:20,cadre:24}` ; `journalMax=400` | Constantes cloud déplacées depuis `72-serpents.js`, sans nouveau tirage ni changement de valeur ; placement réel final toujours contrôlé par `placerNaissance` du module ennemis |
| codex-p27b | `02-regles.js`, `R.serpents.annonce` | `{duree:0.8,rayon:12,approche:1.45,virage:6}` | Préavis continu en vue avant interaction, ring lisible sur les trois formats ; approche inoffensive bornée, valeurs géométriques/allure réemployées du cloud. Si le préavis sort du cadre, il recommence entièrement ; même remise en garde après INVERSION |
| codex-p27b | `02-regles.js`, `R.serpents.visuel` | `sonneAlternances=4` (deux cycles clairs/sombres par seconde) | TIQUE sonnée : réduire l'alternance cloud à 10/s ; aucun seuil R-13 modifié. BROUILLEUR : supprimer seulement son glitch répété d'écran, conserver champ local, armes coupées, absorption, icône et sons ; VOLEUR : ligne de fuite visible continûment |
| codex-p27b | `03-socle.js` — propriétaire du socle | Appliquer `tools/codex-p27/raccord-03-socle.patch`, qui ajoute les quatre types à la liste figée L.ennemis | NOMS/DE intégrés mais liste de schémas encore incomplète dans cette copie. Essai strict sans raccord : 230 erreurs ; avec raccord : zéro dans les cas qualifiés. Ne pas désactiver les schémas |
| codex-p27b | `76-directeur.js` — codex-11 / cheffe | Appliquer **après codex-11** `tools/codex-p27/raccord-76-directeur.patch` : appel public `N.serpents.pasPartie(dt, cap)` sous les gardes du directeur | Un seul producteur, mêmes noms et plan ; appel inactif pendant l'aventure. Les serpents de partie comptent au plafond régulier ; plafond dur existant réutilisé, deux serpents au plus. Sans ce raccord, les 80 parties restent identiques |
| codex-p27b | Rendu global : propriétaires de `15-decor.js`, `50-fx.js`, `78-hud.js` et autres compositeurs concernés | Reprendre les scènes `tools/codex-p27/vagues-apres.json` et `ablation.json`, rendre R-13 ≤3/s au-delà de 6,6 %, puis relancer les pixels | Sur les 12 scènes de 60 s, maximum 13/s ; ennemis isolés 0/s. V4 paysage : 8/s complet, 7/s sans dessin des serpents, journal strictement identique. Le composant restant exact n'est pas isolé ; aucune attribution causale plus précise, aucun seuil abaissé et aucun retrait de décor en production |
| codex-p27b | `tools/codex-p27/verifier.mjs` — cheffe hors bac | Lancer la commande en tête du rapport et contrôler Safari réel ensuite | Script complet prêt, serveur Node sur port libre, Chromium muet unique, profils 844×390/390×844/1440×900, captures/tampons/journaux ; bancs serpents, aventure et voyage enchaînés. Aucun serveur ni Chromium exécuté dans ce bac |

Résultats VM : calibration historique 10/10 exacte ; 80/80 paires finies et identiques, journal complet compris, zéro erreur ; 114/114 assertions du banc cloud avec les raccords en mémoire ; 12 cas d'annonces à 0,808333 s avec reprise entière après interruption ; coupes réelles TIQUE 0,908333 s pour un segment et VOLEUR 0,808333 s pour deux (avant : 0,600000 s). Les deux voyages et le module aventure conservent étapes, films, fins et profil avant/après sur les trois formats. Six cas de plafonds/suspensions/reprise satisfaits. Palette isolée fermée, sans cyan et sans flash dépassant l'aire ; R-06 des vagues : zéro apparition en vue, zéro armement hors vue, journaux non vides.

**Lot arrêté avant validation globale** : R-13 du rendu complet reste en échec ; raccords 03/76 et reçu navigateur attendus. Réutilisation explicitement vérifiée des reçus des 80 parties après le seul garde-fou final `pasPartie`, qui n'est jamais appelé sans le raccord ; bornes et vagues raccordées testées sur la source finale. Le banc VOLEUR a été isolé de l'aimant de la tête, de la fusion du butin et des tirs pendant la collecte ; ses assertions et les seuils de combat sont conservés, le canon rétabli pour sa mort. Build final sortie 0, aucun commit ni réseau sortant.
