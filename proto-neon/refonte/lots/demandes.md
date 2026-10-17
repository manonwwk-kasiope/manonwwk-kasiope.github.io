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
