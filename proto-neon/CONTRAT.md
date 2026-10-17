# Contrat des modules de SNAKE 2975 — version 1.0

**Version 1.0, figée par le lot 0a le 17 octobre 2026.** Elle reporte le chapitre 7 de `REFONTE.md`, qui
fait autorité, et tranche ce qu'il laissait ouvert. Quand ce contrat et `REFONTE.md` se contredisent,
c'est `REFONTE.md` qui l'emporte, et le gardien publie une version corrigée.

Le jeu s'appelle **SNAKE 2975** (NEON 2084 n'est que le nom de code du dossier). Tout texte affiché dit
SNAKE 2975, et l'histoire se passe en 2975.

## 0. Le contrat a un gardien

- **Le gardien** est l'agent du lot 0a. Il possède `02-regles.js`, `03-socle.js`, `79-jeu.js`, ce fichier,
  `DIRECTION.md` et `refonte/lots/pilotes.md`, jusqu'à la fin de la phase 2. Au réglage, `02-regles.js` et
  `79-jeu.js` passent au lot 9.
- **Un besoin nouveau** (champ, événement, consommateur, identifiant, chiffre, signature) s'écrit en une
  ligne dans `refonte/lots/demandes.md`. Le gardien accepte ou refuse, et publie une version 1.1, 1.2…
  L'orchestrateur reporte les fichiers du contrat dans toutes les copies. **On ne modifie jamais le fichier
  d'un autre lot**, et on n'ajoute jamais un champ partagé en douce.
- **Un chiffre absent de `N.R`** s'écrit dans un objet local marqué `// → N.R` et se demande au gardien.
- **Les tests de contrat** (§ 19) font foi : une livraison qui les fait échouer n'est pas intégrée.

## 1. Le principe des modules

Les modules de `src/` sont concaténés par ordre de nom dans **une seule fermeture** par `build.mjs`. Il
n'y a ni `import` ni `export` : un module publie son interface sur l'objet global `N` (`window.__N`) et
consomme celle des autres par `N.<nom>`. Chaque module déclare son ou ses objets **une fois** et ne touche
à rien d'autre.

- **Aucun module n'appelle un autre au chargement**, seulement dans ses fonctions : l'ordre de
  concaténation n'a donc pas d'importance pour l'exécution. Seul `03-socle.js` inscrit des consommateurs
  à son chargement (le journal, sur son propre bus).
- **Tout module survit à l'absence des autres** grâce à des replis procéduraux (carrés et cercles dans
  la palette, sons neutres), et reste utilisable seul sur sa page d'essai `tools/<lot>/index.html`.
- `boot()` est appelée en dernier par le bundle ; c'est `90-boot.js` qui la définit.

## 2. Qui possède quoi — un fichier, un propriétaire, aucun chevauchement

| Fichier | Publie | Responsable de | Lot |
|---|---|---|---|
| `00-pal.js` | `N.pal` | palette, Bayer, conversions, **table des luminances `N.pal.L`** | gardé |
| `02-regles.js` | `N.R` | **tous les chiffres** du jeu, en lecture seule (§ 5 de ce contrat) | gardien, puis 9 |
| `03-socle.js` | `N.ev`, `N.rng`, `N.horloge`, `N.journal`, `N.ids`, `N.socle` | bus d'événements, flux de hasard, horloge de jeu, journal, identifiants, schémas et validateurs | gardien |
| `05-art.js` | `N.art` | illustrations, clips — **le pilote en est propriétaire, n'y touche pas** | gardé tel quel |
| `10-gfx.js` | `N.gfx` | tampon, primitives, origine de dessin, plans, remappage, masque de propriété | 1 |
| `12-cam.js` | `N.world`, `N.cam` | monde, murs et arènes mobiles, TRAVELLING, caméra ; miroirs `S.monde`, `S.vue` | 1 |
| `15-decor.js` | `N.decor` | parallaxe, sol, plateau, murs, quartiers, états, cyclage, ondulation, silhouettes | 2 |
| `17-vol.js` | `N.vol` | LE VOL | 2 |
| `20-crt.js` | `N.crt` | tube cathodique, préréglage adaptatif, extinction | 1 |
| `30-music.js` | `N.music` | piste en blocs, séquenceur, génératif, sons, voix | 7a, 7b |
| `40-sprites.js` | `N.spr` | tous les sprites et la police | 6a, 6b |
| `50-fx.js` | `N.fx` | explosions, gel, ralentis, télégraphes (`S.tele`), ondes, lasso, glitch, vignette, désintégration, écran | 6a, 6b |
| `60-intro.js` | `N.intro` | démarrage, ouverture, titre (décor), attraction (séquencement), plongée, panneau du CYCLOPE, fonds de fin | 2 |
| `70-joueuse.js` | `N.joueuse` | serpent, accélération, collisions, mort, coupe, réapparition, pouvoirs, APOGÉE, lasso, traînée, ACTIONS AUTO ; `S.player`, `S.death` | 3a, 3b |
| `71-butin.js` | `N.butin` | cellules, noyaux, pastille, aimant, fusion, expiration ; `S.butin` | 3a |
| `72-ennemis.js` | `N.ennemis` | bestiaire, élites, modificateurs, RIVAL, TRAQUEUR, planeurs, tirs, armement dans la vue, `proie` ; `S.enemies`, `S.shots` | 4a, 4b |
| `73-arene.js` | `N.arene` | ordres de TRAVELLING, voies et convois, SILLAGE ; `S.voies` | 5a, 5b |
| `73-colosse.js` | `N.colosse` | LE CYCLOPE | 5b |
| `74-arsenal.js` | `N.arsenal` | 6 armes à 4 paliers, tirs, montures, GRAPPE, perte de palier | 3a, 3b |
| `75-cartes.js` | `N.cartes` | XP, vivier, tirages, pitié, `mods`, textes calculés, cartes de vague | 8 |
| `76-directeur.js` | `N.dir` | vagues, formations, apparitions, portails, plafonds, TRAQUEUR, PASTILLE, DÉFILÉ, tension ; `S.vague` | 5a, 5b |
| `77-score.js` | `N.score` | score, chaîne, vies, primes, défis, statistiques, énergie, déblocages, profil, records, persistance ; `S.reglages` | 8 |
| `78-hud.js` | `N.hud` | HUD, radar, chevrons, marqueurs, bannières, toasts, gains, codex | 8 |
| `79-jeu.js` | `N.game` | **machine d'états**, ordre des mises à jour et des dessins, séquence de mort, `dbg`, scènes de référence | gardien, puis 9 |
| `79-scene.js` | `N.scene` | **mise en scène** : tout ce que REFONTE.md § 5.3 associe aux événements | 6a, 6b |
| `80-ecrans.js` | `N.ui` | titre (menu), briefing, cartes, pause, réglages, fin, initiales, records, galerie ; `S.ecran` | 8 |
| `85-pilote.js` | `N.pilote` | les 8 pilotes (`refonte/lots/pilotes.md`) | P |
| `90-boot.js` | `boot`, `N.S` | boucle, pas fixe, entrées et gestes, `S.perf`, `?perf=1`, cycle de vie, verrou d'écran | 1 |

`70-game.js` est supprimé par le lot 0b une fois son contenu réparti dans les squelettes (§ 7.1 du plan).

## 3. Le temps : `N.horloge` (03-socle.js)

Le jeu est reproductible à graine égale, sous `__DT` comme dans la boucle accélérée des bancs.

1. **Le pas est fixe : h = 1/120 s**, au plus 4 pas par image, le reste passe à l'image suivante (l'arriéré
   est borné à 4 pas). `90-boot.js` fait, à chaque image :

   ```
   var n = N.horloge.image(dtReel);               // dtReel = __DT s'il est posé
   for (var k = 0; k < n; k++) {
     var dt = N.horloge.avancer();                // UN pas ; rend dtMonde
     S.t = N.horloge.t(); S.dt = dt;
     N.game.update(dt); N.fx.update(dt); N.cam.update(dt);
   }
   ```
2. **Le gel** (hitstop) se compte **en secondes de temps réel**. `N.fx.hitstop(n)` prend un nombre
   d'images de référence et **doit appeler `N.horloge.geler(n / 60)`** ; le plus long gel en cours gagne,
   ils ne se cumulent pas. Pendant un gel, **dtMonde = dtJoueuse = 0** : rien ne bouge, les entrées sont
   lues, un virage demandé s'applique au premier pas qui suit. L'ancienne règle « dt × 0,08 » disparaît.
3. **Les ralentis.** Hors gel, dtMonde = h × `N.fx.k()` et dtJoueuse = h × `N.fx.kJoueuse()` (1 sans
   `N.fx`, borné à [0, 1]). `50-fx.js` arbitre : le plus lent gagne, la joueuse est exemptée quand c'est
   demandé (RALENTI, arrivée du CYCLOPE).
4. **La transmission.** `N.game.update(dt)` reçoit dtMonde. Tout module qui a besoin du pas de la joueuse
   lit `N.horloge.dtJoueuse()`. Personne d'autre ne calcule de pas.
5. **Les unités.** `N.horloge.t()` et `S.t` sont en **secondes de temps de jeu** : la somme des dtMonde,
   ralentis compris. `S.frame` et `__FRAME` comptent les images (effets visuels et tests seulement).
   `N.horloge.pas()` compte les pas et horodate le journal. `N.horloge.reel()` est la somme des pas en
   temps réel : c'est elle qu'anime une interface pendant que l'horloge est arrêtée.
6. **La grille musicale de jeu.** `N.horloge.temps()` rend `{mesure, temps, phase}` à 144,6 BPM, dérivé de
   `t()` : elle s'arrête pendant les gels, la pause, les cartes et les cinématiques gelantes. Les
   apparitions « sur la grille », l'avance du sol et le cyclage du décor s'y calent. `franchi()` dit si le
   pas qui vient de se faire a franchi un temps ou une mesure ; `prochainTemps()` rend l'instant du temps
   suivant. `N.music.beat()` rend la phase **audio**, pour les seuls effets visuels collés au son. Aucune
   règle de jeu ne lit `AudioContext.currentTime`.
7. **L'horloge s'arrête** (dtMonde = dtJoueuse = 0, le gel ne s'use pas) quand `S.paused` est vrai, ou quand
   `N.game.etat()` est un état à horloge arrêtée (§ 8) : `demarrage`, `ouverture`, `titre`, `briefing`,
   `cartes`, `panneau`, `fin`, `initiales`, `pause`. Pendant `mort`, elle avance au ralenti de la séquence.

```
N.horloge = { H, BPM, image(dtReel) -> n, avancer() -> dtMonde, geler(sec), resteGel(),
              t(), dtMonde(), dtJoueuse(), pas(), reel(), gele(), arretee(),
              temps() -> {mesure, temps, phase},          // objet réutilisé : le lire, ne pas le garder
              franchi() -> {temps, mesure}, prochainTemps(), reset(), etat(), creer(cfg) }
```

## 4. Le hasard : `N.rng` (03-socle.js)

- **`N.rng(nom)`** rend le flux nommé de la partie : `{ f() → [0,1[, i(a,b) entier inclus, r(a,b) réel,
  etat(), reprendre(e), nom }`. Sa graine est `hash(graine de partie, nom)`, avec la même suite
  congruentielle que la démo. **Tirer dans un flux ne change aucun autre flux.**
- **`N.rng.reset(graine)`** re-sème tous les flux **en place** : un module peut garder la référence d'un
  flux d'une partie à l'autre. C'est `N.socle.reset` qui l'appelle.
- **Les noms figés** (`N.ids.flux`) : `dir`, `ennemis`, `arene`, `butin`, `cartes`, `arsenal`, `joueuse`,
  `vol`, `defis`, `decor`, `fx`, `music`, `pilote`. **Un module ne tire que dans ses flux.**
- **Deux familles.** Les flux de jeu (`dir` à `defis`) ne sont tirés que dans les `update`. Les flux
  cosmétiques (`decor`, `fx`, `music`) peuvent l'être au dessin et par l'audio : ils ne changent jamais le
  journal. Le flux `pilote` appartient aux pilotes.
- **Les défis du jour** se tirent dans `N.rng.flux(S.jour, 'defis')`, un flux hors registre semé par la
  date ; les défis de vague, dans `N.rng('defis')`, semé par la partie.
- **L'attraction** remet la partie à zéro avec la graine 2975 : la partie suivante re-sème tout, elle ne
  consomme donc rien de son hasard.
- **`N.rnd`** reste, le temps de la transition, un alias de `N.rng('jeu').f` pour le code repris de la
  démo. Il est **interdit dans le code neuf** (recherche du banc de non-régression).

## 5. Les chiffres : `N.R` (02-regles.js)

`N.R` contient **tous les chiffres** du plan, structurés par section : `temps`, `monde`, `joueuse`, `boost`,
`mort`, `vies`, `longueur`, `butin`, `xp`, `cartes`, `armes`, `passifs`, `pouvoirs`, `apogee`, `lasso`,
`score`, `defis`, `controles`, `gestes`, `inversion`, `camera`, `decor` (plans, sol, quartiers, lumière),
`radar`, `apparitions`, `vol`, `secteurs[0]` (structure, vagues, formations et événements, DÉFILÉ),
`formations`, `ennemis`, `elites`, `modificateurs`, `arene`, `defile`, `colosse`, `pilotes` (cibles du
§ 4.10), `scene`, `mortScene`, `hud`, `ecrans`, `deblocages`, `surcharge`, `musique`, `son`, `reglages`,
`persistance`, `socle`, `perf`, `criteres` (seuils R-xx).

- **`N.R` est gelé en profondeur.** On le lit, on ne l'écrit jamais. Les conventions d'unités sont en tête
  de `02-regles.js` (secondes de temps de jeu, px de jeu, « Images » = images de référence de 1/60 s,
  « Deg » = degrés).
- **`N.R.f`** publie les formules partagées, pour qu'elles n'aient qu'une écriture : `virage(v)`,
  `deflexion(m)`, `traine(L, braise)`, `degatsLasso(L, braise)`, `mult(chaine)`, `objectif(chaine)`,
  `longueurReapparition(L)`, `longueurCoupe(k)`, `cellulesCoupe(L, k)`, `horizon(h, c, portrait)`,
  `bonusCyclope(duree)`, `devore(rang)`, `pvElite(pv)`, `vitesse(moment)`, `niveau(xp)`, `tailleMain(choix)`.
- Les chiffres que le plan ne donnait pas sont marqués « valeur du gardien » dans le fichier ; la liste
  est dans `refonte/lots/L0a.md`.
- **Les textes de cartes** sont calculés à partir de `N.R` (« CADENCE 6,5 → 7,8 TIRS/S »), jamais écrits
  à la main.

## 6. Les événements : `N.ev` (03-socle.js)

**Un événement a un seul émetteur ; les appelants ne font que demander l'action à cet émetteur ; les effets
sont tous des consommateurs, inscrits avec un rang qui fixe leur ordre.**

```
N.ev.on(nom, rang, fn, qui)   // qui = nom du fichier sans « .js » ('77-score') — OBLIGATOIRE
N.ev.off(nom, fnOuQui)
N.ev.emit(nom, charge)        // -> false si l'événement est perdu
N.ev.nouveauPas(), N.ev.consommateurs(nom), N.ev.verifier(bool), N.ev.stats(), N.ev.creer(opts)
```

- **L'envoi est synchrone**, par rang, puis par nom de fichier, puis par ordre d'inscription. `fn(charge,
  nom)` reçoit la charge telle quelle : **un consommateur ne la modifie pas** et ne la garde pas (le journal
  en fait une copie).
- **Une nouvelle inscription du même (nom, rang, qui) remplace l'ancienne** : un module peut s'inscrire à
  chacun de ses `reset` sans se doubler.
- **Un événement émis pendant un envoi** est mis en file et envoyé juste après, premier entré premier sorti.
  Une inscription ou un retrait pendant un envoi prend effet à la fin de la file.
- **Au plus 64 événements par pas** (cascades comprises) ; au-delà, l'événement est perdu, journalisé
  (`perdu`) et compté dans `__ERR`.
- **Une exception dans un consommateur** est mise en quarantaine (comptée dans `__ERR`, une trace console par
  signature) sans empêcher les consommateurs suivants.
- **Le mode vérification** (`N.ev.verifier(true)`, posé par les bancs et les tests) signale comme erreur :
  une charge hors schéma, un événement hors contrat, un consommateur anonyme ou hors du tableau ci-dessous.

**Les rangs**, communs à tous les événements : 10 règles de jeu (machine d'états, joueuse, ennemis, arène,
directeur) ; 20 score et chaîne ; 30 expérience et cartes ; 35 APOGÉE ; 40 butin et décor ; 50 effets
d'arme (GRAPPE, perte et montée de palier) ; 60 mise en scène (`79-scene`) ; 70 interface (HUD, codex) ;
80 défis, statistiques et énergie ; 90 journal (`03-socle`).

| Événement | Émetteur unique | Charge | Consommateurs prévus (rang : module) |
|---|---|---|---|
| `kill` | `72-ennemis` (dans `hit`, `zone`, `devorer`, `purge`, broyage) | `{id, type, x, y, elite, boss, base, src, distTete, gen}` | 10 : 76-directeur ; 20 : 77-score ; 30 : 75-cartes ; 35 : 70-joueuse ; 40 : 71-butin ; 50 : 74-arsenal ; 60 : 79-scene ; 70 : 78-hud ; 80 : 77-score ; 90 |
| `coup` | `70-joueuse` (tête protégée par le BOUCLIER, ou corps avant `coupe`) | `{partie, k, cause, auteur, auteurId, x, y, absorbe, visibleDepuis, teleDuree}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `coupe` | `70-joueuse` (`couper`) | `{k, perdus, cause, auteur, x, y}` | 20 : 77-score ; 40 : 71-butin ; 60 : 79-scene ; 70 : 78-hud ; 80 : 77-score ; 90 |
| `mort` | `70-joueuse` (`tuer`) | copie de `S.death` | 10 : 79-jeu ; 20 : 77-score ; 50 : 74-arsenal ; 60 : 79-scene ; 70 : 78-hud ; 80 : 77-score ; 90 |
| `ramassage` | `71-butin` | `{type, x, y, valeur}` | 10 : 70-joueuse, 72-ennemis (pastille → `inverser`), 76-directeur ; 20 : 77-score ; 30 : 75-cartes ; 35 : 70-joueuse ; 60 : 79-scene ; 80 : 77-score ; 90 |
| `lasso` | `70-joueuse`, **après** `N.ennemis.hit` sur chaque enfermé | `{n, ids, aire, x, y, poly}` | 20 : 77-score ; 35 : 70-joueuse ; 40 : 71-butin ; 60 : 79-scene ; 80 : 77-score ; 90 |
| `niveau` | `75-cartes` | `{niveau, enAttente}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `carte` | `75-cartes` (`choisir`) | `{id, niveau}` | 10 : 70-joueuse ; 50 : 74-arsenal ; 70 : 78-hud ; 90 |
| `vague` | `76-directeur` | `{n, etape, evt, nom, quartier}` | 10 : 79-jeu ; 20 : 77-score ; 40 : 15-decor ; 60 : 79-scene ; 70 : 78-hud ; 80 : 77-score ; 90 |
| `vol` | `17-vol` | `{evt, parfait, vers, portes, mines}` | 10 : 79-jeu ; 20 : 77-score ; 40 : 15-decor ; 60 : 79-scene ; 70 : 78-hud ; 80 : 77-score ; 90 |
| `inversion` | `72-ennemis` | `{evt, dur}` | 10 : 76-directeur ; 40 : 15-decor ; 60 : 79-scene ; 70 : 78-hud ; 80 : 77-score ; 90 |
| `arene` | `73-arene` | `{evt, voie, vx}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `phase` | `73-colosse` | `{n, evt}` | 10 : 79-jeu ; 20 : 77-score ; 40 : 15-decor ; 60 : 79-scene ; 70 : 78-hud ; 90 |
| `apparition` | `72-ennemis` (`spawn`, à la fin du portail) | `{id, type, x, y, elite}` | 70 : 78-hud ; 90 (avec la vue et la vue anticipée) |
| `portail` | `76-directeur` | `{type, x, y, dur, elite}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `arme` | `72-ennemis`, `73-colosse`, `73-arene` (début d'un télégraphe) | `{id, type, forme, total, cible, shown, rallonge}` | 60 : 79-scene ; 90 (enregistrement `armement`) |
| `pouvoir` | `70-joueuse` | `{id, evt:'debut'\|'fin'\|'pret'}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `apogee` | `70-joueuse` | `{id:'apogee', evt:'pleine'\|'debut'\|'fin'}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `boost` | `70-joueuse` | `{id:'boost', evt:'on'\|'off'\|'panne'}` | 60 : 79-scene ; 90 |
| `defi` | `77-score` | `{id, ok, prime}` | 60 : 79-scene ; 70 : 78-hud ; 90 |
| `deblocage` | `77-score` | `{id}` | 30 : 75-cartes ; 60 : 79-scene ; 70 : 78-hud ; 90 |

Les valeurs des champs `evt` : `vague` ∈ `entree`, `pic`, `nettoyee`, `soupape` (`etape` ∈ `vague`,
`defile` ; `n` = 1 à 5, 0 pour LE DÉFILÉ) ; `vol` ∈ `debut`, `porte`, `mine`, `fin` ; `inversion` ∈
`debut`, `fin` ; `arene` ∈ `travellingAnnonce` (2 s avant le départ), `travelling` (départ),
`convoiAnnonce`, `convoiPasse`, `fin` (`voie` = −1 hors convoi) ; `phase` ∈ `arrivee`, `entree`, `repit`,
`enrage`, `mort` (`n` = 1 à 3, 0 pour l'arrivée).

**L'exemple du plan, un tir du canon tue une flèche** : `74-arsenal` appelle `N.ennemis.hit(e, 10, src)` et
s'arrête là. `72-ennemis` retire les PV, voit qu'ils tombent à 0, émet `kill`. Puis `77-score` compte les
points et la chaîne (20), `75-cartes` l'XP (30), `70-joueuse` +2 APOGÉE (35), `71-butin` le largage (40),
`74-arsenal` GRAPPE si `mods.grappe` (50, par `N.ennemis.zone`, dont les kills partent en file),
`79-scene` l'explosion, le gel, la poussée, le son et le gain flottant (60), `78-hud` le codex (70),
`77-score` les défis (80), `03-socle` le journal (90).

**Ce qui n'est pas un événement** : les sons continus et propres à un module (`tir`, `salve`, `boost*`,
`fermable`, `porte`), et les appels de dessin. Les modules ne s'appellent directement que pour **demander une
action à son propriétaire** (`N.ennemis.hit`, `N.joueuse.couper`, `N.butin.lacher`, `N.world.travelling`),
jamais pour en produire les effets.

**Les sources** (`src`) disent qui a fait quoi, et décident des récompenses :

| `genre` | `type` | Règle |
|---|---|---|
| `arme` | `canon`, `tourelles`, `arc`, `missiles`, `drones`, `minesQ`, `lasso`, `apogee`, `grappe`, `eperon` | destruction de la joueuse : score, chaîne, butin |
| `ennemi` | un type d'ennemi, ou `cyclope` | INSTABLE, mine abattue en chaîne : compte pour la joueuse quand c'est elle qui a déclenché la chaîne |
| `arene` | `convoi`, `murMobile` | `convoi` : broyé, compte pour la joueuse (BROYÉ ×n) |
| `joueuse` | `devore` | INVERSION |
| `decor` | `mur`, `purge` | `mur` : dépassé par le mur arrière, **ni butin ni score** ; `purge` : fin de vague et fin du CYCLOPE |

## 7. Les schémas et les identifiants : `N.ids` (03-socle.js)

**La règle des champs.** Un champ listé est obligatoire. **Un champ non listé est une erreur**, sauf s'il
commence par `_` : c'est l'état privé d'un module, que personne d'autre ne lit. `N.ids.valider(genre, objet)`
rend la liste des écarts (vide si l'objet est conforme) ; les tests et le mode vérification s'en servent.
Genres : `ennemi`, `tir`, `src`, `tele`, `death`, `player`, `mods`, `reglages`, `input`, `butin`, `voie`,
`monde`, `vue`, `ecran`, `vague`, `perf`, `sprite`, `charge:<événement>`, `journal:<type>`.

```
// ---- un ennemi : élément de N.ennemis.list (et S.enemies, même tableau)
{ id, type,                    // type ∈ N.ids.ennemis ; 'cyclope' pour les parties du CYCLOPE (boss:true)
  x, y, vx, vy, r, ang,        // MONDE, px, rad
  pv, pvMax,                   // nombres finis (TRAQUEUR : pv symbolique, hit() ne retire rien)
  etat,                        // 'portail'|'approche'|'arme'|'attaque'|'recup'|'fuite'|'proie'|'mort'
  etatT,                       // s écoulées dans l'état
  vuDepuis,                    // s depuis qu'il est entièrement dans la vue ; -1 s'il ne l'est pas
  elite, mods:{blinde, rapide, instable},
  boss, partie,                // partie ∈ 'oeil'|'main'|null ; null hors CYCLOPE
  tele,                        // id du télégraphe en cours ou -1
  img, dir }                   // image d'animation, direction 0..15

// ---- un tir ennemi : élément de N.ennemis.tirs (et S.shots)
{ id, x, y, vx, vy, r, vie, src }

// ---- une source
src = { genre:'arme'|'ennemi'|'arene'|'joueuse'|'decor', type, id }   // id : celui de l'auteur, ou null / -1

// ---- un télégraphe : N.fx.tele(desc) ; lu dans S.tele (pilotes) et dessiné par N.fx.drawTele
{ id, forme:'ligne'|'disque'|'secteur'|'rect'|'losange'|'voie', x0, y0, x1, y1, r, a0, a1,
  reste, total, cible:'tete'|'corps'|'tout', par:{type, id} }
  // ligne : de (x0,y0) à (x1,y1), demi-largeur r ; disque : centre (x0,y0), rayon r ;
  // secteur : centre (x0,y0), rayon r, de a0 à a1 ; rect et voie : (x0,y0)-(x1,y1) ; losange : centre, rayon r.
  // reste : s avant les dégâts ; total : durée totale du télégraphe.

// ---- la mort
S.death = { cause, auteur, auteurId, x, y, t, vague, quartier, visibleDepuis, teleDuree }
  // cause  ∈ N.ids.causes = ['mur','morsure','ennemi','tir','laser','souffle','convoi','traine']
  // auteur ∈ N.ids.ennemis ∪ {'mur','murMobile','corps','convoi','cyclope','cyclope:main','vol'}
  // vague : 1 à 5 ; 0 pendant LE DÉFILÉ ; 6 pendant le CYCLOPE
  // N.ids.texte(cause, auteur) -> 'TIR DE TOURELLE', 'MUR ARRIÈRE', 'TRAÎNÉE DU RIVAL'…

// ---- la joueuse, pour les pilotes et les mesures
S.player = { x, y, ang, angVise, vit, len, segs, etat, boost, reserve, apogee, pouvoirPret }
  // segs : tableau (ou Float32Array) [x0,y0, x1,y1, …] de len segments, tête comprise, coordonnées MONDE
  // etat ∈ 'vivant'|'mort'|'reapparition'|'absent' ; reserve et apogee de 0 à 100

// ---- les modificateurs de cartes : écrits par N.cartes seulement, lus par tous
N.cartes.mods = { degats:1, cadence:1, aimant:28, lenMax:40, reparation:0, bouclier:0,
                  eperon:false, grappe:0, sangFroid:false, braise:0 }
  // degats et cadence : facteurs ; aimant : rayon en px ; lenMax : longueur maximale ;
  // reparation, bouclier, grappe, braise : nombre de prises (0..2, bouclier 0..1)
```

**Les miroirs dans `S`** (ajoutés par le contrat 1.0 pour que les pilotes et les mesures n'aient à lire
que `S`) ; chacun a un seul écrivain, qui le tient à jour à chaque pas :

| Champ | Écrivain | Contenu |
|---|---|---|
| `S.t`, `S.dt`, `S.frame`, `S.paused`, `S.view`, `S.perf`, `S.jour`, `S.input` | `90-boot` | § 3 ; `S.jour` = AAAAMMJJ, seule date que le jeu voit |
| `S.seed` | `79-jeu` | graine de la partie |
| `S.enemies`, `S.shots` | `72-ennemis` | `N.ennemis.list`, `N.ennemis.tirs` (mêmes tableaux) |
| `S.tele` | `50-fx` | les télégraphes du pas précédent (voir plus bas) |
| `S.player`, `S.death` | `70-joueuse` | schémas ci-dessus |
| `S.butin` | `71-butin` | `N.butin.list` : `{id, type:'cellule'\|'noyau'\|'pastille', x, y, valeur, vie}` |
| `S.voies` | `73-arene` | `[{id, y0, y1, etat:'annonce'\|'passage', sens:-1\|1, x, reste}]` (x : tête du convoi) |
| `S.monde` | `12-cam` | `{x0, y0, x1, y1, vx, vy, mobile, annonce:[[x0,y0,x1,y1]…]}` : murs courants et positions annoncées |
| `S.vue` | `12-cam` | `{x, y, w, h}` : la vue en coordonnées MONDE |
| `S.vague` | `76-directeur` | `{n, etape, nom, quartier, t, evt}` : la vague en cours, `t` depuis son entrée |
| `S.ecran` | `80-ecrans` | `{nom, depuis, cartes:[id…], choix, pret}` : l'écran ouvert ; `pret` quand la garde est passée |
| `S.reglages` | `77-score` | § 11 |

**`S.tele` est tenu en double tampon.** Un propriétaire de télégraphe appelle `N.fx.tele(desc)` **à chaque
pas** où son télégraphe est actif. `N.fx.update(dt)`, appelé après `N.game.update` dans le même pas, publie
dans `S.tele` les télégraphes enregistrés pendant ce pas et vide le tampon d'enregistrement. Pilotes et
dessin lisent donc les télégraphes du pas précédent : c'est déterministe. Le journal `tele` s'écrit une fois
par `id`, à sa première apparition.

**Les identifiants d'objets** viennent de `N.ids.suivant()`, un compteur remis à 1 par `N.socle.reset` :
deux parties de même graine ont les mêmes identifiants.

**Les listes d'identifiants** (`N.ids`), figées :

| Liste | Valeurs |
|---|---|
| `ennemis` | `fleche`, `dard`, `larve`, `mine`, `tourelle`, `lame`, `ruche`, `sentinelle`, `rival`, `planeur`, `traqueur` (et `ennemisBoss` : `cyclope`) |
| `armes` | `canon`, `tourelles`, `arc`, `missiles`, `drones`, `minesQ` |
| `cartes` | les 6 armes, `puissance`, `cadence`, `aimant`, `croissance`, `reparation`, `bouclier`, `eperon`, `grappe`, `sangFroid`, `braise`, `traversee`, `ralenti`, `repli` |
| `causes` | `mur`, `morsure`, `ennemi`, `tir`, `laser`, `souffle`, `convoi`, `traine` (`causesCoupe` : `mur`, `ennemi`, `tir`, `souffle`, `convoi`, `traine`, `vol`) |
| `etats` | ceux du § 8 |
| `sections` | `titre`, `attraction`, `briefing`, `jeu`, `repit`, `alerte`, `boss`, `victoire`, `defaite`, `initiales` |
| `quartiers` | `docks`, `artere`, `centrale`, `ciel`, `tours`, `coeur`, `eclipse` (`etatsDecor` : `calme`, `montee`, `chaos`, `inversion`, `colosse`, `victoire`) |
| `defis` | `finir`, `premierJet`, `lasso6`, `sansCoupe`, `chaine5`, `gloutonne`, `crash`, `broyeuse`, `parfait`, `rasante`, `eclair`, `volParfait`, `sansFilet` |
| `defisVague` | trois par vague, de `v1Lasso` à `v5Devore` (textes et conditions dans `N.R.defis.vague`) |
| `deblocages` | `ralenti`, `repli`, `styles`, `galerie`, `departV3` |
| `sons` | les 48 noms de REFONTE.md § 5.8 (`sonsAnciens` : `degat`, `intro`, pendant la transition) |
| `voix`, `cues`, `couches`, `canauxSon` | `READY GO WARNING DANGER EXCELLENT GAMEOVER` ; `mort gameover stinger drop plongee vague inversion` ; `inversion` ; `musique effets` |
| `scenes` | `charge`, `v5`, `boss3`, `mur`, `morsure`, `lasso6`, `mortTir`, `cartes`, `fin`, `vol`, `inversion`, `convoi`, `travelling`, `calme`, `montee`, `chaos`, `colosse` |
| `ecrans` | `titre`, `briefing`, `cartes`, `pause`, `reglages`, `fin`, `initiales`, `records`, `galerie` |
| `pilotes` | `inerte`, `tourneur`, `maladroit`, `kamikaze`, `humain`, `bon`, `expert`, `dieu` |
| `formations`, `elites`, `modificateurs` | `file meute nuee duoMines champMines pince batterie essaim duel garde escadrille` ; `flecheBlindee rival rucheInstable` ; `blinde rapide instable` |
| `proprietaires` | codes du masque : 0 aucun, 1 tête, 2 corps, 3 arsenal, 4 icônes de vie, 5 ennemi, 6 butin, 7 effet, 8 décor, 9 HUD |

S'y ajoutent `N.ids.noms` (noms affichés), `N.ids.tableEtats`, `N.ids.tableEvenements`, `N.ids.rangs`,
`N.ids.typesSrc` et `N.ids.journal` (types du journal).

**Les sprites** se demandent par `N.spr.get(nom, dir, img)` : dir de 0 à 15 (0 vers la droite, sens des
aiguilles d'une montre, y vers le bas), image d'animation, **l'état dans le nom** (`fleche:armee`,
`lame:deployee`, `ruche:p2`), jamais la direction. **Le catalogue est figé dans `N.ids.sprites`** (nom,
taille, directions, images, lot qui le livre) ; `N.spr.catalogue()` rend ce catalogue complété de ce que le
module a réellement. Un nom absent rend le repli procédural. Les mini-silhouettes sont `mini:<type>` (5 × 5)
et les icônes de cartes `carte:<id>` (16 × 16). La rémanence RAPIDE n'est pas un sprite : c'est le sprite du
type posé en sang tramé (`blit` avec `ci`).

## 8. Les états du jeu : `N.game.etat()`

`N.game.etat()` fait foi. `S.phase` disparaît : `90-boot.js` n'aiguille plus sur lui et appelle toujours
`N.game.update` et `N.game.draw`. **Seul `79-jeu.js` change d'état et appelle `N.music.section`** ; les
autres modules le demandent par un événement (`vague`, `vol`, `phase`, `mort`). La table est aussi dans
`N.ids.tableEtats` (horloge, section, plein écran).

| État | Horloge | Mis à jour | Dessiné par | Entrées lues par | Section |
|---|---|---|---|---|---|
| `demarrage` | arrêtée | — | `60-intro` (logo, TOUCHE POUR COMMENCER) | `90-boot` (déverrouillage), puis `79-jeu` | — |
| `ouverture` | arrêtée | `intro` | `60-intro` | `60-intro` (saut) | `titre` |
| `titre` | arrêtée | `decor` | `60-intro` (fond), puis `80-ecrans` (menu) | `80-ecrans` | `titre` |
| `attraction` | avance | tout le jeu, plus `pilote` | le monde, `78-hud`, `60-intro` (DÉMO, galerie), `80-ecrans` (records) | `79-jeu` (tout toucher ramène au titre) | `attraction` |
| `briefing` | arrêtée | — | `60-intro` | `60-intro` (saut) | `briefing` |
| `plongee` | avance | `decor`, `cam` | `60-intro` sur le décor | `60-intro` (saut) | `jeu` |
| `jeu` | avance | `dir`, `arene`, `joueuse`, `arsenal`, `ennemis`, `colosse`, `butin`, `score`, `hud`, `scene` | le monde, puis `78-hud` | `70-joueuse` (manche, gestes) ; `78-hud` (boutons) | `jeu` |
| `nettoyage` | avance | comme `jeu`, sans apparition | idem | idem | `jeu` (stinger) |
| `cartes` | **arrêtée** | — | le monde figé, puis `80-ecrans` | `80-ecrans` | `jeu`, étouffoir 900 Hz |
| `vol` | avance | `vol`, `score`, `hud`, `scene` | `17-vol`, puis `78-hud` | `17-vol` (manche) | `jeu` |
| `defile` | avance | comme `jeu` | idem | idem | `repit` |
| `alerte` | avance | comme `jeu`, sans apparition, arène qui se resserre | le monde, bandes WARNING (`79-scene`), `78-hud` | `70-joueuse` | `alerte` |
| `panneau` | **arrêtée** | — | `60-intro` (panneau `boss`) | `60-intro` (saut) | `alerte` |
| `boss` | avance | comme `jeu`, avec `colosse` | idem | idem | `boss` |
| `mort` | ralentie par la séquence | `fx`, `scene`, `joueuse` (désintégration) | le monde, **remappage**, puis la joueuse et la cause | `79-jeu` (saut dès 0,5 s) | cue `mort` |
| `reapparition` | avance | comme `jeu` | idem | idem | `jeu` |
| `victoire` | avance | `fx`, `colosse` (carcasse), `ennemis` (purge), `butin` | le monde, `N.fx.drawEcran` | `79-jeu` (saut) | `victoire` |
| `fin` | **arrêtée** | `ui` | `60-intro` (fond `defaite` ou `victoire`), puis `80-ecrans` | `80-ecrans` | `defaite` ou `victoire` |
| `initiales` | **arrêtée** | `ui` | `80-ecrans` | `80-ecrans` | `initiales` |
| `pause` | **arrêtée** | — | le monde figé, puis `80-ecrans` | `80-ecrans` | pause, étouffoir 420 Hz |

Pendant les états qui couvrent tout l'écran (`ouverture`, `briefing`, `panneau`, `fin`, `initiales`), le
monde et le décor ne sont **pas** dessinés.

**`N.game.reset(graine, opts)`** appelle d'abord `N.socle.reset(graine, opts && opts.mode)` (flux re-semés,
horloge et identifiants à zéro, enregistrement `partie` au journal), puis le `reset` des modules.

## 9. La boucle d'images et l'ordre de dessin

`90-boot.js` déroule ces étapes à chaque image :

1. **Le temps** : les pas fixes du § 3.
2. **Les entrées** : il remplit `S.input` (§ 10), classe les gestes (REFONTE.md § 2.16), lit la manette par
   `navigator.getGamepads()`, puis vide `S.input.gestes` et `S.input.taps` après la mise à jour.
3. **Les mises à jour**, pour chaque pas : `N.game.update(dtMonde)`, qui appelle les modules de l'état courant
   dans l'ordre `pilote` (s'il est actif), `dir`, `arene`, `joueuse`, `arsenal`, `ennemis`, `colosse`,
   `butin`, `score`, `hud`, `scene` et `ui` ; puis `N.fx.update(dtMonde)` et `N.cam.update(dtMonde)`. Une
   fois par image : `N.music.tension(N.game.tension())`. En mode simulé (`dbg.simuler`, `?nodraw`,
   `__NODRAW`), la boucle s'arrête là : ni dessin, ni présentation, ni tube.
4. **Le décor lointain** : `N.gfx.clear(0)`, `N.gfx.origin(0, 0)`, puis `N.decor.drawFar(cam)` (P0 à P5 et
   le sol, en espace écran avec leur décalage propre). En état `vol`, `N.vol.draw()` remplace les étapes 4
   à 6.
5. **Le monde** : `N.gfx.origin(cam.x, cam.y)`, puis `N.game.draw()` (plateau et murs, P6, butin, ennemis et
   leurs tirs, tirs et montures de la joueuse), puis `N.fx.draw()` (explosions), puis `N.game.drawTop()`
   (télégraphes par `N.fx.drawTele()`, le CYCLOPE, le serpent, le lasso, les arcs autour de la tête).
6. **Le crochet de mort** (état `mort` seulement) : `N.gfx.remap(LUT_MORT)` sur tout le tampon, puis
   `N.joueuse.drawTop()` et `N.scene.drawCause()`.
7. **L'écran** : `N.gfx.origin(0, 0)`, puis `N.fx.drawEcran()`, `N.hud.draw()`, `N.ui.draw()` et
   `N.intro.draw()` quand une cinématique est en cours.
8. **La sortie** : quand le tube est actif, `N.gfx.present({ skipScale: true })` ne fait que publier le
   tampon et `N.crt.apply(dt)` compose seul ; sinon `N.gfx.present()` agrandit.

**Les espaces de coordonnées** : le monde est en px de jeu, origine fixe en haut à gauche ; l'écran est en px
du tampon (HUD, interface, cinématiques, VOL, entrées). On convertit **uniquement** par `N.cam`.

## 10. Les interfaces imposées — à respecter à la lettre, les autres s'appuient dessus

### 10.1 Ce qui reste de la version 0 (la démo), inchangé

```
N.pal.C, N.pal.i(nom), N.pal.dither(x,y,t)     // + NAMES, R, G, B, LUM, U32, near, shade, mix, css, rgba
N.art.load(), N.art.ready(), N.art.get(nom), N.art.names()
N.art.play(nom), N.art.stop(nom), N.art.ended(nom), N.art.unlock()
N.gfx.init(canvas), N.gfx.W, N.gfx.H, N.gfx.PX, N.gfx.clear(ci), N.gfx.buf(), N.gfx.canvas()
N.gfx.present(), N.gfx.resize(cssW,cssH,sûreW,sûreH) -> {w,h,px}
N.crt.apply(dt)                         // lit S.shake et S.heat
N.music.init(), start(), stop(), tension(v), sfx(nom,opts), rms(), suspend(), resume()
N.spr.make(nom,graine), N.spr.text(chaine,opts)
N.fx.boom(x,y,force,ci), N.fx.shake(amplitude), N.fx.update(dt), N.fx.draw(), N.fx.flashGate(aire)
N.intro.reset(), update(dt), draw(), transition(nom), skip(), busy(), current()
```

### 10.2 Ce que le contrat 1.0 ajoute ou change (REFONTE.md § 7.8)

```
// ---- inchangées en signature, mais elles retranchent l'origine courante (coordonnées MONDE en jeu)
N.gfx.px/rect/line/circ/ring/blit/ditherRect/ditherCirc/disc
N.fx.boom(x,y,force,ci[,variante])    // x,y MONDE ; variante 'joueuse' : os → cyan pâle → cyan → indigo
N.gfx.resize(cssW,cssH,sûreW,sûreH)   // W,H = la VUE, plus le monde

// ---- 00-pal.js
N.pal.L[i]                             // luminance relative WCAG de chaque index (REFONTE.md § 5.1)
N.pal.lumineux(i)                      // -> N.pal.L[i] > 0,10

// ---- 02-regles.js
N.R, N.R.f                             // § 5

// ---- 03-socle.js
N.ev = { on(nom,rang,fn,qui), off(nom,fnOuQui), emit(nom,charge), nouveauPas(), consommateurs(nom),
         verifier(b), stats(), creer(opts) }                                   // § 6
N.rng(nom) -> { f(), i(a,b), r(a,b), etat(), reprendre(e), nom }               // § 4
N.rng.reset(g), N.rng.graine(), N.rng.flux(g,nom), N.rng.famille(g), N.rng.hash(g,nom)
N.horloge = { image(dt), avancer(), geler(sec), t(), dtMonde(), dtJoueuse(), pas(), reel(),
              temps() -> {mesure,temps,phase}, franchi(), prochainTemps(), gele(), arretee(), reset() }   // § 3
N.journal(type, d); N.journal.dump(opts); N.journal.actif(bool); .lire(type); .dernier(type)   // § 12
N.ids = { ennemis, armes, cartes, causes, etats, sections, quartiers, defis, deblocages, sons, scenes, …,
          texte(cause,auteur), valider(genre,objet), valide(genre,objet), suivant(), sprites }   // § 7
N.socle = { version, reset(graine,mode), signaler(ou,e), brancherJournal(bus,J), copier(v), geler(o) }

// ---- 10-gfx.js
N.gfx.origin(ox,oy)                    // toutes les primitives retranchent (ox,oy) ; origin(0,0) = écran
N.gfx.layer(img,{x,y,wrapX,opaque,lut})// pose un plan {w,h,data} par copie de rangées ; lut = 16 index
N.gfx.remap(lut[,rect])                // applique une table d'index au tampon (mort)
N.gfx.owner(code)                      // propriétaire des pixels dessinés ensuite (N.ids.proprietaires)
N.gfx.present({skipScale})             // skipScale : ni conversion, ni putImageData, ni agrandissement

// ---- 12-cam.js
N.world = { W:1024, H:512, x0,y0,x1,y1,           // murs courants
            arena(rect, dur), reset(),             // murs qui glissent, télégraphe inclus
            travelling({largeur, vx, depuis}), stop(),
            enMouvement(), mursAnnonces() -> [rect],
            distMur(x,y) -> {d, nx, ny, pan, mobile} }
N.cam = { x, y, w, h, update(dt), reset(x,y),
          toScreen(x,y,out), toWorld(sx,sy,out),
          visible(x,y,m), shown(x,y,m), anticipee(sec,out), devant() -> px,
          jolt(dx,dy), focus(x,y,dur), mode('jeu'|'boss'|'libre') }

// ---- 15-decor.js
N.decor = { build(), etat(nom), quartier(nom), preparer(nom),
            drawFar(cam), drawPlateau(cam), drawFront(cam),
            ondule(x,y,force), fenetres(), eclair(), silhouette(nom, plan, x, y, k), eclipse(t),
            horizon() -> y écran }

// ---- 17-vol.js
N.vol = { start(depuis, vers), update(dt), draw(), actif(), resultat() -> {portes, mines, parfait} }

// ---- 20-crt.js
N.crt.extinction(dur), N.crt.auto(bool)

// ---- 30-music.js (s'ajoute à l'existant)
N.music.load({base}), section(nom), cue(nom), couche(nom,bool), danger(v),
N.music.beat() -> {bar, beat, phase}   // phase AUDIO, pour l'image seulement
N.music.sfx(nom,{pan,pitch,type}), voix(mot), mute(canal,bool), piste() -> {pret,bloc,mesure,section,repli},
N.music.noeuds()

// ---- 40-sprites.js
N.spr.get(nom, dir, img), N.spr.catalogue(), N.spr.measure(texte, échelle) -> {w,h}

// ---- 50-fx.js (s'ajoute à l'existant)
N.fx.hitstop(images)                   // appelle N.horloge.geler(images / 60)
N.fx.tele(desc)                        // ENREGISTRE un télégraphe pour le pas (S.tele, § 7) ; journal 'tele'
N.fx.drawTele(), N.fx.drawEcran()
N.fx.onde(x,y,r0,r1,ci,dur), N.fx.pickup(x,y), N.fx.lasso(poly,n), N.fx.glitch(force,dur), N.fx.vignette(angle,force)
N.fx.ralenti(k,dur,{joueuse:false}), N.fx.k(), N.fx.kJoueuse()
N.fx.desintegre(points, dur), N.fx.boom(x,y,force,ci,{ecran:true})

// ---- 70-joueuse.js
N.joueuse = { reset(cfg), update(dt), draw(), drawTop(),
              tete:{x,y,ang,vit}, segs(), len(), etat,   // 'vivant'|'mort'|'reapparition'|'absent'
              hitTest(x,y,r) -> {part:'tete'|'corps'|'queue'|null, k},
              tuer(cause, src) -> bool, couper(k, src) -> bool, grandir(n),
              invul(), pouvoir, apogee, boost, traine() }
  // tuer et couper appliquent eux-mêmes l'invulnérabilité, le BOUCLIER et la TRAVERSÉE, et rendent false
  // quand le coup est absorbé. Chaque menace teste la joueuse par hitTest (ennemis et tirs : 72-ennemis ;
  // convois : 73-arene ; CYCLOPE : 73-colosse) ; murs et morsure : 70-joueuse.

// ---- 71-butin.js
N.butin = { reset(), update(dt), draw(), lacher(x,y,n,{type}), aspirer(poly), pluie(n), list }

// ---- 72-ennemis.js
N.ennemis = { reset(), update(dt), draw(), spawn(type,x,y,opts), list, count(),
              hit(e,dmg,src) -> bool, zone(x,y,r,dmg,src) -> n, devorer(e),
              dans(poly) -> [], pres(x,y,r) -> [], tir(x,y,vx,vy,opts),
              tirs, effacerTirs(x,y,r), inverser(dur), fuir(), purge(ordre) }

// ---- 73-arene.js
N.arene = { reset(), update(dt), draw(), travelling(vx, depuis), convois(cfg), voies() -> [],
            sillage(x,y) -> bool, actif() }

// ---- 73-colosse.js
N.colosse = { start(), update(dt), draw(), drawTop(), actif(), phase(), pv(), mort() }

// ---- 74-arsenal.js
N.arsenal = { reset(), update(dt), draw(), monter(arme), descendre() -> {arme, de, a},
              niveau(arme), armes(), tirs }

// ---- 75-cartes.js
N.cartes = { reset(), xp(n), niveauxEnAttente(), main(n,{trophee, vague, rareGarantie}),
             choisir(id), prises(), texte(id), mods }

// ---- 76-directeur.js
N.dir = { reset(secteur, opts), update(dt), vague(), phase(), tension(), progression(), entrees() }

// ---- 77-score.js
N.score = { reset(), score, chaine(), mult(), objectif() -> {mult, reste}, vies, defis, defiVague,
            stats, build() -> {nom, armes}, energie, deblocages, prochain() -> {id, reste, part},
            profil:{charger, sauver, reglages(obj?)}, records }

// ---- 78-hud.js
N.hud = { update(dt), draw(), banniere(texte,opts), toast(texte), tag(texte), pop(x,y,texte,opts), codex(type) }

// ---- 79-jeu.js (le contrat de 90-boot.js est inchangé)
N.game = { reset(graine,opts), update(dt), draw(), drawTop(), tension(), etat(),
           dbg:{ god(b), vague(n), boss(), input(o), etat(), scene(nom), simuler(sec) -> journal,
                 masque() -> Uint8Array } }

// ---- 79-scene.js
N.scene = { reset(), update(dt), drawCause() }      // tout le reste passe par N.ev

// ---- 80-ecrans.js
N.ui = { ouvrir(nom,opts), fermer(), actif(), update(dt), draw() }     // noms : N.ids.ecrans

// ---- 85-pilote.js
N.pilote = { niveau(nom, opts), activer(b), agir(dt) }   // N.ids.pilotes ; opts.variante (refonte/lots/pilotes.md)

// ---- 90-boot.js : S.input étendu
S.input = { x, y, mag,                 // manche : direction unitaire et course 0..1
            boost, pouvoir, apogee,    // pouvoir, apogee : vrais pendant UN pas ; boost : tant que tenu
            pause, valider, retour,    // vrais pendant UN pas
            chiffre,                   // 1..4 ou 0
            car,                       // lettres tapées pendant l'image (initiales), chaîne
            any,
            pointer:{x, y, actif, boutons},           // souris, en px ÉCRAN
            manette:{connectee, x, y, boutons},       // lue par navigator.getGamepads()
            gestes:[{genre:'toucher'|'glisse'|'tenu', doigt:'action', t0, t1, x, y, dx, dy}],
            taps:[{x, y, t0, t1, doigt:'manche'|'action'|'bouton'}] }   // px ÉCRAN, pour N.ui
// Consommation : en état 'jeu' et voisins, N.joueuse consomme boost/pouvoir/apogee ; dans les écrans,
// N.ui consomme taps/valider/retour/chiffre/car. Un tap commencé avant l'ouverture d'un écran ne compte pas.
// Les temps t0, t1 des gestes et des taps sont en N.horloge.reel().
S.perf = { p50, p90, p95, p99, niveau }   S.jour = AAAAMMJJ
S.reglages                                 // § 11
```

## 11. Les réglages et la persistance

```
S.reglages = { musique:true, effets:true, secousse:1,        // 1 | 0.5 | 0
               flashs:true, ecran:'riche',                   // 'riche' | 'sobre' | 'pur'
               texte:1,                                      // 1 | 2
               manche:1,                                     // 0.8 | 1 | 1.25 (rayon de course)
               actions:'doigts' }                            // 'doigts' | 'auto'
```

| Ligne | Module qui l'applique | Comment |
|---|---|---|
| `musique`, `effets` | `30-music` | `N.music.mute('musique' \| 'effets', !v)` |
| `secousse` | `20-crt` (trauma), `12-cam` (`jolt`), `15-decor` (0 : mouvement réduit) | facteur multiplicatif |
| `flashs` | `50-fx` | non : aucun flash au-delà du seuil d'aire, les explosions restent en contour |
| `ecran` | `20-crt` | préréglage du tube |
| `texte` | `78-hud`, `80-ecrans` | échelle de la police |
| `manche` | `90-boot` | rayon du manche flottant |
| `actions` | `90-boot` (gestes) et `70-joueuse` (déclenchement AUTO) | REFONTE.md § 2.16 |

Les valeurs par défaut sont `N.R.reglages`, corrigées par `prefers-reduced-motion` et `prefers-contrast`.
**La persistance n'a qu'un écrivain, `77-score.js`**, sous la clé `localStorage['snake2975.v1']`, protégée
par try/catch : `{ v:1, profil:{energie, deblocages, defisFaits, parties, codex, gestesVus}, records:[…],
reglages:{…} }`. `80-ecrans.js` lit et modifie les réglages par `N.score.profil.reglages(obj)`. Sans
stockage, tout vit le temps de la session, sans erreur.

## 12. Le journal de mesure : `N.journal` (03-socle.js)

Les scripts de mesure sont écrits contre ce format. **Un enregistrement est `{pas, t, image, type, d}`** :
`pas` = `N.horloge.pas()`, `t` = `N.horloge.t()`, `image` = `S.frame`, `type` = le type, et `d` = une
**copie** des données (jamais une référence : l'appelant peut réutiliser son objet). Les données sont
rangées sous `d` parce que plusieurs charges ont elles-mêmes un champ `type` (le type d'ennemi).

Le journal est un anneau de 65 536 entrées. `N.journal.dump()` rend les entrées du plus ancien au plus récent
(`{json:true}` : la chaîne JSON ; `{vider:true}` : vide l'anneau après). Il est **complet** sous
`?journal=1`, dans les bancs et en mode simulé (`N.journal.actif(true)`) ; en jeu normal, seuls `coup`,
`mort`, `kill`, `vague`, `partie` et `perdu` sont gardés, pour l'écran de fin. Chaque type a son validateur :
`N.ids.valider('journal:<type>', enregistrement)`.

| Type | Champs de `d` | Écrit par |
|---|---|---|
| `apparition` | id, type, x, y, elite, vue {x,y,w,h}, anticipee {x,y,w,h}, distTete | consommateur 90 de `apparition` |
| `portail` | type, x, y, dur, elite | consommateur 90 de `portail` |
| `armement` | id, type, forme, total, cible, shown, rallonge | consommateur 90 de `arme` |
| `tele` | id, forme, total, cible, par | `N.fx.tele`, une fois par id |
| `tirEnnemi` | id, src, x, y | `N.ennemis.tir` |
| `coup` | partie, k, cause, auteur, auteurId, visibleDepuis, teleDuree, absorbe | consommateur 90 de `coup` (corps, tête absorbée) et de `mort` (tête) : une entrée par coup reçu |
| `kill`, `lasso`, `coupe`, `mort`, `ramassage`, `carte`, `niveau`, `vague`, `vol`, `inversion`, `arene`, `phase`, `defi`, `deblocage`, `pouvoir`, `apogee`, `boost` | la charge de l'événement | consommateur 90 |
| `geste` | genre ('toucher'\|'glisse'\|'tenu'\|'autre'), doigt, duree, deplacement, action ('pouvoir'\|'apogee'\|'boost'\|'aucune') | `90-boot` |
| `section` | nom | `30-music` |
| `bloc` | fichier, t0 (audio), decalage | `30-music` |
| `flash` | aire, accepte | `N.fx.flashGate` |
| `sfx` | nom, demande, joue | `30-music` |
| `vue` | x, y, w, h, devant, teteX, teteY (toutes les 6 images) | `12-cam` |
| `perf` | ms, modules (ms par module), tube | `90-boot` |
| `perdu` | nom, parPas | `N.ev` (au-delà de 64 par pas) |
| `partie` | graine, mode | `N.socle.reset` |
| `pilote` | nom, evt, et les champs de `refonte/lots/pilotes.md` | `85-pilote` |

## 13. Le budget de performance

Par image (deux pas de simulation compris), au p95, profil iPhone 13 paysage ×1 en émulation Chromium, tube
en « riche », **qualité adaptative coupée** (`N.R.perf.budget`) :

| Poste | Budget p95 |
|---|---|
| `crt.apply` (après `skipScale` complet et tables préallouées) | 5,8 ms |
| décor : `drawFar`, `drawPlateau`, `drawFront`, sol compris | 1,5 ms |
| ennemis, tirs ennemis, télégraphes, à 40 ennemis | 1,0 ms |
| joueuse et arsenal, 160 tirs, 16 tourelles, drones, traînée | 1,0 ms |
| effets et mise en scène (`fx.draw`, `drawTele`, `scene`) | 0,7 ms |
| HUD, radar, écrans | 0,4 ms |
| butin, directeur, arène, colosse | 0,3 ms |
| musique : ordonnancement et sons | 0,2 ms |
| boucle, entrées, `present` | 0,1 ms |
| **Total** | **11,0 ms** |

**Aucune allocation par image dans les boucles chaudes** (tas stable sur 60 s). Les objets rendus par
`N.horloge.temps()`, `franchi()`, `N.cam.toScreen(x,y,out)` et semblables sont réutilisés : on les lit, on
ne les garde pas.

## 14. Les outils de mesure intégrés

- **Les scènes de référence** : `__N.game.dbg.scene(nom)` met le jeu dans un état figé et reproductible,
  le même pour tous les lots (`N.ids.scenes`, contenus au § 7.12 du plan) ; `?scene=charge` l'ouvre au
  chargement.
- **Le mode simulé** : `__N.game.dbg.simuler(secondes)` (ou `?nodraw`, `__NODRAW`) fait tourner la mise à
  jour seule, aussi vite que possible, avec le journal complet, et rend le journal.
- **Le masque de propriété** : `__N.game.dbg.masque()` rend un `Uint8Array` de la taille du tampon, où chaque
  pixel porte le code de qui l'a dessiné en dernier (`N.gfx.owner`, codes de `N.ids.proprietaires`).
- **L'affichage de performance** : `?perf=1` affiche en 5 × 7 p50, p95, p99, le préréglage du tube et les
  nœuds audio créés par seconde.

## 15. Les illustrations générées — à employer, pas à refaire

Onze illustrations ont été générées (GPT Image 2.5 Sunburst) puis converties hors ligne en vrai pixel art :
réduites à la résolution du jeu, forcées dans la palette des seize avec le même tramage de Bayer que le jeu.
Elles sont dans `art/`, injectées par `build.mjs`, et servies par `N.art.get(nom)` au format `{w,h,data}`
de `N.spr.make` (0 = transparent), ou `null` tant que ce n'est pas décodé : dessine alors ton repli.

| Nom | Taille | Usage |
|---|---|---|
| `affiche` | 384 × 216 | titre (fond recadré au centre) ; monolithes à sphère de P5 (LE CŒUR) |
| `horizon` | 512 × 220 | ouverture, plongée ; P2 (soleil et montagnes), sol |
| `briefing` | 384 × 216 | panneau derrière le texte de mission |
| `logo` | 200 × 113 | logo SNAKE 2975, fond transparent |
| `exterieur` | 384 × 216 | panneau ; éléments découpés et remappés de P3 (cité) |
| `connexion`, `eveil` | 384 × 216 | panneaux de l'ouverture |
| `alerte` | 384 × 216 | panneau d'alerte, sans cyan |
| `boss` | 384 × 216 | panneau du CYCLOPE ; silhouettes `colosseLoin` et `colosseMi` |
| `victoire`, `defaite` | 384 × 216 | fonds de l'écran de fin, assombris d'un cran |

Le serpent cyan des panneaux `eveil`, `victoire`, `defaite`, `affiche` et l'étincelle de `connexion`, c'est
la joueuse : la règle du cyan y est appliquée, pas enfreinte. Jamais d'agrandissement non entier ; un pixel
d'illustration reste un carré net. **Les cinématiques animées** (`cine/*.mp4`) passent par `N.art.play(nom)`,
`N.art.get(nom)` (image courante), `N.art.stop(nom)` et `N.art.ended(nom)`, converties à la volée dans la
palette ; sans vidéo, tout retombe sur le panneau fixe. Ne fais jamais dépendre un enchaînement de la vidéo :
cadence-le sur ton propre chronomètre. **La planche `ref/ennemis-planche.png`** n'est pas un actif du jeu :
c'est le modèle des silhouettes pour `40-sprites.js`.

## 16. Entrées, orientation, son, pause

- **Au doigt, un manche virtuel flottant** né sous le premier doigt ; la direction est le vecteur depuis
  l'origine, qui suit le pouce au-delà du rayon. `90-boot.js` remplit `S.input` et dessine l'indicateur :
  ne dessine pas d'autre manche. Les gestes du second doigt (toucher → pouvoir, glissé → APOGÉE, tenu →
  accélération) sont classés par `90-boot.js` selon REFONTE.md § 2.16 et `N.R.gestes` ; la décision de
  déclencher appartient à `70-joueuse.js`. Les commandes au clavier, à la souris et à la manette sont dans
  `N.R.controles`.
- **Portrait ET paysage.** Le jeu se joue dans les deux sens et survit à une rotation : une rotation ne
  change que la fenêtre, jamais l'état du monde.
- **Le son joue même interrupteur silencieux enclenché** (`navigator.audioSession.type = 'playback'` au
  premier geste) ; le jeu offre une coupure du son visible. En arrière-plan, `90-boot.js` appelle
  `N.music.suspend()` puis, au retour, `N.music.resume()`.
- **Pause.** En arrière-plan ou sur perte de focus, `S.paused` devient vrai et l'horloge s'arrête ; « EN
  PAUSE » attend un toucher. L'état `pause` (bouton, P, Échap) est tenu par `79-jeu.js`.
- **La recherche fait autorité** après le plan : `recherche/jouabilite-mobile.md` (J-xx),
  `recherche/game-design-campagne.md` (G-xx), `recherche/visuel-technique-mobile.md` (V-xx), avec les écarts
  assumés de REFONTE.md § 0.3.

## 17. Crochets de test, obligatoires

Le bundle expose sur `window` : `__N` (l'objet N), `__S` (l'état), `__PAL` (la table), `__ERR = {count,
sigs}` (exceptions, une trace console par signature), `__SEED` (graine imposée), `__DT` (pas de temps imposé
en secondes, jamais posé en jeu normal), `__FRAME` (compteur d'images), `__NODRAW` (mode simulé).
S'y ajoutent `__N.game.dbg`, `__N.pilote` et `__N.journal`. Un module qui les casse fait échouer la
vérification.

## 18. Interdits

- Aucun `import`, aucun `require`, aucune police web.
- **Aucune URL** hors de `05-art.js` (clips `cine/*.mp4`) et de `30-music.js` (`musique/piste.json` et
  `musique/*.mp3`, depuis `MUSIQUE_BASE`). Aucun actif binaire hors de `art/`, `cine/` et `musique/`.
- **Les écouteurs du DOM** n'existent que dans `90-boot.js`, qui publie tout dans `S.input`.
- **Aucun `Math.random`** : chaque tirage passe par un flux de `N.rng`. **Aucun `N.rnd`** dans le code neuf.
- **Aucun `Date.now` ni `performance.now`** hors de `90-boot.js` ; `S.jour` est la seule date que le jeu voit.
- **Aucune couleur littérale** hors de `00-pal.js`.
- **Aucun chiffre de jeu en dur** hors de `02-regles.js` (sinon un objet local marqué `// → N.R`).
- Aucun fichier touché hors de `proto-neon/` ; jamais `snake2030/`.

## 19. Les tests de contrat

`tools/contrat/` contient une suite de tests comportementaux, la même pour tous :

- `node tools/contrat/socle.mjs` — dans Node, sans navigateur, sur `00-pal.js`, `02-regles.js` et
  `03-socle.js` seuls. À lancer après toute modification du contrat.
- `node tools/contrat/contrat.mjs [--url URL] [--profil paysage|portrait|bureau|tous] [--tout]` — dans
  Chromium, sur **n'importe quel bundle** (la démo, les squelettes, une page d'essai, l'intégration). Il
  échoue si un test échoue, si `__ERR.count` n'est pas nul ou si la console a reçu une erreur.

Les groupes `socle`, `palette` et `regles` sont bloquants dès le lot 0a. Le groupe `modules` teste le contrat
d'un module (schémas de `S.enemies`, `kill` émis une seule fois, `S.death` valide, `hitstop` sur l'horloge,
catalogue des sprites…) **dès que ce module publie son interface 1.0**, et le marque « absent » avant.

## 20. Historique

| Version | Date | Changement |
|---|---|---|
| 0 | 17 oct. 2026 | contrat de la démo (deux minutes, une scène) |
| 1.0 | 17 oct. 2026 | refonte : socle (`N.ev`, `N.rng`, `N.horloge`, `N.journal`, `N.ids`), `N.R`, états, ordre de dessin, schémas, miroirs dans `S`, interfaces des 27 modules, tests de contrat |
