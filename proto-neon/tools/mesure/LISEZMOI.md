# tools/mesure — les bancs des critères R-01 à R-38

Ces bancs mesurent les 38 critères du jeu entier (`REFONTE.md` § 8.5) : **un script par critère**, dans
`criteres/`, et **un lanceur** (`lancer.mjs`) qui les passe tous et écrit un rapport. Ils ouvrent le jeu
dans Chromium (Playwright) sur trois profils, et mesurent sur les pixels du tampon, sur le masque de
propriété et sur le journal, par les crochets du contrat (`__N`, `__S`, `__ERR`, `__SEED`, `__DT`,
`__FRAME`, `__N.game.dbg`, `__N.journal`, `__N.pilote`).

Ils tournent sur **n'importe quel bundle** : la démo, les squelettes du lot 0b, la page d'essai d'un lot,
l'intégration. Quand une interface manque, la mesure ne plante pas : elle sort **« non mesurable :
interface X absente »**, et le critère est marqué `non-mesurable` (ou `partiel` si d'autres mesures ont pu
se faire). Le jour où le lot qui possède l'interface la livre, la mesure se fait, sans toucher aux bancs.

## Lancer

```
node tools/mesure/lancer.mjs                         # les 38 critères, aux valeurs du plan (long : 1 h et plus)
node tools/mesure/lancer.mjs --rapide --parallele 3  # graines et durées réduites, environ 6 min
node tools/mesure/criteres/R-02-palette.mjs          # un seul critère
node tools/mesure/lancer.mjs --seulement R-01,R-02,R-03,R-21 --rapide   # la part des critères du banc de non-régression
node tools/mesure/criteres/R-09-tete-visible.mjs --url http://127.0.0.1:8112/proto-neon/tools/L1/index.html
```

| Option | Effet |
|---|---|
| `--url URL` | le bundle mesuré (défaut `http://127.0.0.1:8112/proto-neon/index.html`) ; si l'adresse locale ne répond pas, un serveur statique de secours est ouvert sur ce port, à la racine du dépôt |
| `--rapide` | moins de graines (3 à 5 au lieu de 50), parties dessinées et fenêtres plus courtes ; les proportions deviennent indicatives |
| `--long` | fenêtres plus longues que le plan (R-09 : 180 s, R-11 : partie entière) |
| `--graines 1-50` ou `--graines 3,7,9` | impose les graines des pilotes |
| `--profil paysage,portrait` | restreint les profils là où le critère en balaie plusieurs |
| `--seulement R-01,R-09`, `--sans R-20` | filtre (lanceur) |
| `--parallele N` | N critères ordinaires à la fois (lanceur) ; les critères `exclusif` passent toujours seuls |
| `--strict` | le lanceur sort en échec aussi pour un critère bloquant non mesurable ou partiel |
| `--sortie DOSSIER` | défaut `tools/mesure/sortie/` (ignoré par git) |
| `--sans-cache` | rejoue les parties des pilotes au lieu de les relire |
| `--snake2030 URL` | adresse de SNAKE 2030 pour les comparaisons (défaut : `../snake2030/index.html` à côté du bundle), ouvert **en lecture seule** |
| `--bavard` | trace chaque partie de pilote |

Codes de sortie : un critère seul sort en 1 s'il est en échec ou en erreur ; le lanceur sort en 1 si un
critère **bloquant** est en échec ou en erreur (et, avec `--strict`, non mesurable ou partiel).

Outils : `/opt/node22/bin/node` et Playwright (`/opt/node22/lib/node_modules/playwright/index.mjs`) ; aucune
autre dépendance (le PNG est décodé et encodé par `png.mjs`, avec le zlib de Node).

## Les profils

| Profil | Vue (pt CSS) | dpr | Toucher |
|---|---|---|---|
| `paysage` | 844 × 390 (iPhone 13 paysage) | 3 | oui, agent Safari iPhone |
| `portrait` | 390 × 844 | 3 | oui |
| `bureau` | 1440 × 900 | 1 | non |

## Les fichiers

| Fichier | Rôle |
|---|---|
| `commun.mjs` | options, profils, serveur de secours, `Banc` (le navigateur), `Session` (une page ouverte sur le jeu, avec la sonde), `Resultat`, statistiques, seuils |
| `sonde.js` | injectée dans la page avant le jeu : `window.__MESURE` (présence des interfaces, analyse du tampon et du masque, observateurs par image, par pas et par appel, départ de partie, partie simulée échantillonnée) |
| `parties.mjs` | les parties des pilotes en mode simulé, leur cache et leur résumé |
| `scenes.mjs` | atteindre une scène de référence, le titre, l'attraction, la mort ; couper le tube |
| `gestes.mjs` | des doigts simulés par CDP (`Input.dispatchTouchEvent`) et les séries de gestes du second doigt |
| `snake2030.mjs` | ouvrir SNAKE 2030 (lecture seule) pour les comparaisons de R-11 et R-20 |
| `png.mjs` | décodeur et encodeur PNG minimaux |
| `criteres/R-xx-nom.mjs` | un critère : `export const meta`, `export async function mesurer(banc, res)` |
| `lancer.mjs` | le lanceur et le rapport |

## Les formats de sortie

### Un critère : `sortie/R-xx.json`

```json
{ "id": "R-11", "titre": "Lumière, et décor qui se tait par la forme", "seuil": "…", "bloquant": true,
  "statut": "ok | echec | partiel | non-mesurable | hors-banc | erreur",
  "resume": "12 ok, 20 en échec, 0 indicatives hors cible, 4 non mesurables",
  "mesures": [
    { "nom": "scène calme : pixels lumineux", "valeur": 0.0829, "seuil": "≥ 0.25", "statut": "echec" },
    { "nom": "scène calme : gaine des menaces", "statut": "non-mesurable", "raison": "non mesurable : aucun pixel d’ennemi (code 5) dans l’image" },
    { "nom": "humain : atteint le CYCLOPE", "valeur": 0, "seuil": [0.1, 0.35], "statut": "hors-cible", "indicatif": true }
  ],
  "notes": ["…"], "captures": ["tools/mesure/sortie/captures/R-11-calme-paysage-tampon.png"],
  "duree": 41.2, "bundle": { "url": "…", "empreinte": "fea6b0dbb21a" }, "date": "2026-10-17T…" }
```

- **`statut` d'une mesure** : `ok`, `echec`, `hors-cible` (cible indicative manquée : n'entraîne pas
  l'échec), `non-mesurable` (avec `raison`, toujours « non mesurable : … »), `hors-banc` (se mesure ailleurs :
  sur le vrai iPhone, ou par relecture). Les autres champs d'une mesure sont des détails chiffrés.
- **`statut` du critère** : `erreur` si le script a levé une exception (`exception` contient la pile) ;
  sinon `echec` si une mesure est en échec ; sinon `non-mesurable` si aucune mesure n'a pu se faire
  (`hors-banc` si toutes sont hors banc) ; sinon `partiel` si certaines sont non mesurables ; sinon `ok`.
- **`bloquant`** : faux pour les critères P3 (R-19).
- **`empreinte`** : les 12 premiers caractères du SHA-1 du bundle mesuré.

### Le rapport : `sortie/rapport.json` et `sortie/rapport.md`

`rapport.json` = `{date, url, empreinte, options, duree, totaux:{ok, echec, partiel, nonMesurable, horsBanc,
erreur}, criteres:[…les R-xx.json…]}`. `rapport.md` en est la lecture humaine : un tableau des 38 critères,
puis le détail de chacun, mesure par mesure, avec ses captures.

### Les captures : `sortie/captures/`

`<critère>-<moment>-<profil>.png` est l'écran tel qu'affiché (tube compris, pixels de l'appareil) ;
`…-tampon.png` est le tampon d'index avant tube, en palette, agrandi ×2 ou ×3.

### Les parties des pilotes : `sortie/parties/*.json.gz`

Une partie est jouée en mode simulé, au profil demandé (paysage par défaut), `__DT = 1/60`, profil vierge
(stockage vidé), `S.jour = 20261017`, par `N.game.reset(graine, {depart:'plongee', mode:'banc'})`, puis
`__N.game.dbg.simuler(0,25)` en boucle jusqu'au premier passage en `fin` (ou `initiales`), ou 9 minutes de
jeu (`refonte/lots/pilotes.md` § 6). **Au premier passage en `fin`, le pilote est coupé** : sinon il valide
REJOUER et `simuler` enchaîne une nouvelle partie dans la même tranche. Le fichier est nommé
`<empreinte>_<profil>_<pilote>_<variante>_<graine>_<actions>_<god>_<maxT>_<jour>_<mouvement réduit>` et
contient :

```
{ ok, raison: 'fin' | 'temps' | 'figee:<état>',
  journal: [ {pas, t, image, type, d} … ]        // tout N.journal.dump() de la partie, du reset à la fin
  echantillons: [ {t, etat, vivants, vague, vagueNom, quartier, etape, mouvement, len, vies, score,
                   defiVague, defis, decor} … ]  // une ligne par tranche de 0,25 s de jeu
  parPas: { pas, secoues, mouvement:{vague:pas}, pasVague:{vague:pas}, transitions:[{t, etat, vague}] }
                                                 // compté pas à pas par un crochet sur N.cam.update
  appels: { 'N.hud.banniere': [{t, etat, a, o}], 'N.hud.toast': […], 'N.music.cue': […],
            'N.music.section': […], 'N.music.sfx': […] }   // a = premier argument (texte, nom)
  fin: {etat, t, err, score, vies, cartes, prochain, energie},
  erreurs: {err, sigs, console, pageErreurs, zero}, params: {…, empreinte} }
```

`resumer(partie)` (dans `parties.mjs`) en tire : `duree`, `victoire`, `defaite`, `gameOver`, `morts`
(journal `mort`), `coups`, `coupsV1`, `cyclopeAtteint`, `cyclopeBattu`, `combatCyclope`, `vagues`,
`pics` (vivants maximaux par vague), `entreeV(n)`, `nettoyeeV(n)`, `vagueA(t)`, `cartes`, `lassos`,
`apogees`, `vols`, `arene`, `pilote` (journal du pilote), `piloteConforme` (le pilote journalise ses
décisions `cap` : c'est le pilote gelé, pas le repli du squelette), `transitions`, `appels`.

Le cache est indexé par l'empreinte du bundle : un nouveau bundle rejoue tout. R-04 passe en premier dans
le lanceur et remplit le cache des 8 pilotes ; R-05 à R-08, R-14 à R-16, R-21, R-23, R-27, R-31, R-32,
R-34, R-35 relisent les mêmes parties.

## Ce que chaque critère branche

Les interfaces sont celles de `REFONTE.md` § 7.8 et de `CONTRAT.md` § 10. Une interface absente donne
« non mesurable : interface X absente » pour les mesures qui en dépendent, et seulement pour elles.

| Critère | Comment | Interfaces et données |
|---|---|---|
| R-01 | capture de l'écran réel, tube coupé, 3 profils : chaque pixel du tampon couvre un bloc uniforme de px × dpr ; aucune couleur hors des seize ; toile = tampon × px | `N.gfx.buf/W/H/PX`, `N.pal.C`, `N.crt.preset('coupe')`, scène `calme` |
| R-02 | index du tampon < 16 sur 10 scènes de jeu, l'attraction, la mort, le VOL, l'INVERSION, les cartes, la fin | `N.gfx.buf`, `dbg.scene`, état `attraction` |
| R-03 | cyan hors codes 1-4 du masque < 0,5 % | `dbg.masque` |
| R-04 | cibles des 8 pilotes (B bloquantes, i indicatives), 50 graines | parties ; `N.R.pilotes` |
| R-05 | les 8 causes de mort | journal `mort` |
| R-06 | apparitions dans la vue ; armements hors vue | journal `apparition` (`vue`), `armement` (`shown`) |
| R-07 | durée des télégraphes (ordinaires, CYCLOPE, convois) ; coups télégraphiés avec `teleDuree` | journal `tele`, `coup` |
| R-08 | `visibleDepuis` ≥ 0,6 s sur 95 % des morts (hors mur, morsure, traînée) | journal `mort` |
| R-09 | tête dans 15-85 % de la zone sûre, trajet visible devant (calculé sur la vue, et comparé à `N.cam.devant()`), tête et segments 1-2 au-dessus des effets | `N.cam.toScreen/x/y/w/h/devant`, `N.world.x0…`, `S.player`, `S.view.safe`, `N.joueuse.segs`, `dbg.masque`, `N.gfx.present` |
| R-10 | monde > vue ; recalage horizontal des bandes de 3 lignes entre deux images à 0,5 s → vitesses de plan ; pixels changés | `N.world.W/H`, `N.cam`, `N.gfx.buf` |
| R-11 | parts lumineuses, luminance moyenne, vide, décor seul (code 8), cyan et magenta du décor, gaine des menaces (bord des pixels code 5 en nuit profonde) ; t = 30 s contre SNAKE 2030 (captures) ; 10 captures par état d'une partie | `N.pal.L`, `dbg.masque`, scènes `calme/montee/chaos/colosse`, `N.decor.etat()` (lu sans argument) |
| R-12 | brasier > 8 % pendant ≥ 4 images et caméra ≥ 6 px (écart caméra − tête par rapport au témoin d'avant, ou `S.shake`) à la mort du CYCLOPE (scène `boss3`) et de chaque élite (scène `v5`, élite posée par `N.ennemis.spawn(type, x, y, {elite, direct:true})`) | `N.ennemis.hit/list/spawn`, `dbg.god` |
| R-13 | flashs par seconde, image par image (variations de luminance ≥ 0,1 et rouge saturé sur > 6,6 %) ; journal `flash` | scène `charge`, rafale de 30 destructions |
| R-14 | images secouées (`S.shake` > 0, pas à pas) ; écart entre bannières hors CYCLOPE | `N.cam.update` (crochet), `N.hud.banniere` (observé) |
| R-15 | vagues nommées et annoncées ; respirations de 8 s sous 40 % ; pics croissants ; `vague`/`pic` en V3-V5 ; 0 tir ennemi en V1 | journal `vague`, `tirEnnemi` ; `N.ennemis.count`, `N.dir.vague()` |
| R-16 | cartes par victoire, par mort en V3, première carte ; 3 défis, défi de vague | journal `carte` ; `N.score.defis`, `N.score.defiVague` |
| R-17 | séquence de mort chronométrée en images × 1/60 : durée, gel, `N.music.cue('mort')`, remappage, clignotement, fin ≤ 1,5 s, serpent en main < 2 s, saut à 0,5 s | scène `mortTir`, `N.horloge.gele`, `N.score.vies` (écrit pour la dernière vie), `N.crt.extinction` (observé) |
| R-18 | textes demandés à `N.spr.text` sur l'écran de fin : cause = `N.ids.texte(cause, auteur)`, quartier, CONTINUER, et rubriques par mots-clés (indicatives) | scène `fin`, `S.death`, `N.ids.noms` |
| R-19 | chronométrage de l'attraction après 15 s au titre ; galerie, records, invitation | `dbg.input`, `N.ui.actif()`, `N.spr.text` |
| R-20 | durée de chaque rappel `requestAnimationFrame` (sonde, `__MESURE_COUTS`), p95 sur `charge`, `v5`, `vol` ; SNAKE 2030 dans la même fenêtre ; processeur ×4 (CDP) et rapport temps de jeu / temps réel | `N.crt.preset/auto`, `S.reglages.ecran` |
| R-21 | `__ERR.count` et console sur 3 profils × 8 pilotes × 5 graines, 50 graines, parties dessinées, rotations, arrière-plan, son coupé, page gelée (`Page.setWebLifecycleState`) | `__ERR`, `N.music.mute` |
| R-22 | J-01 à J-06, latence (image courante à l'arrivée de l'événement → image où `S.player.angVise` change), accélération droit devant et coupure en virage, gestes du second doigt | CDP touch ; `S.player.ang/angVise/boost`, `S.input.boost`, journal `geste` |
| R-23 | victoires de l'expert `diriger` et `auto` | parties ; `N.pilote.niveau('expert', {variante})` |
| R-24 | pilote dieu jusqu'à la victoire, paysage et portrait ; tête hors du quart bas en portrait | parties ; `N.cam.toScreen` |
| R-25 | `N.music.piste()`, journal `bloc` (calage sur la mesure à 10 ms, bloc après une mort) ; repli avec `musique/` refusé : silence < 0,5 s | `N.music.piste`, `N.music.rmsOut`, `N.joueuse.tuer` |
| R-26 | rendus hors ligne : RMS après passe-haut 350 Hz, écart, corrélation, crête, sons au-dessus de la musique, énergie au-dessus de 400 Hz | `N.music.renderOffline(sec, tension, [{t, name, opts}], 44100, 'sfx' \| 'music' \| null)` |
| R-27 | chaque son utile (`arme`, `portail`, `traqueur`, `convoi`, `travelling`) accompagné de son signe (journal `tele`, `portail`, `arene` ; bannière) | `N.music.sfx` (observé) |
| R-28 | `prefers-reduced-motion` : poussée, secousse, pixels changés pendant le gel à la mort d'une élite ; lumière ; jeu complet | `reducedMotion: 'reduce'` |
| R-29 | arrière-plan simulé (visibilitychange + blur) en plein chaos : empreinte de `S` identique, aucun dégât, son revenu < 1 s | `S.paused`, `N.music.context`, `N.music.rmsOut` |
| R-30 | journaux identiques à graine égale (simulé, dessiné, dessiné = simulé hors types d'image et d'audio) ; graines différentes → apparitions différentes | journal |
| R-31 | arène en mouvement (pas à pas), TRAVELLING en V2/V3/V5, 5 VOLS, convois en V4, morts par mur mobile annoncées | `N.world.enMouvement`, journal `arene`, `vol`, `mort` |
| R-32 | masques de cité des 7 quartiers (décor lointain seul à caméra fixe, encres de silhouette au-dessus de l'horizon), IoU deux à deux ; premières fois toutes les 60 s | `N.decor.quartier/preparer/drawFar/horizon`, `N.ids.quartiers` |
| R-33 | recentrages humains (série reproductible), slalom serré, 20/20 par geste, 50 balayages par bord (navigation, zoom, sélection, `preventDefault`, origines du manche) | CDP touch ; `S.input.stick` (origine du manche, publiée par `90-boot.js`) |
| R-34 | tentatives (`pilote`/`lassoTente`) et réussites (`lasso` avant `lassoFin`) du pilote humain, par longueur ; cadence | journal du pilote |
| R-35 | REJOUER depuis la scène `fin` → état `jeu` et joueuse vivante en < 2 s, sans briefing ; durée de V1 | `dbg.input({valider})` |
| R-36 | 25 parties enchaînées sur un profil (stockage gardé) : énergie et prochain déblocage, rang du premier et du dernier déblocage ; défis du jour sur trois dates ; défi de vague | `N.score.energie/prochain/defis/defiVague`, journal `deblocage` |
| R-37 | scène `v5`, 10 captures : cyan hors codes 1-2, gaine de la tête, nombre de pixels de la tête = sprite, pixels d'arsenal (code 3) à moins de 3 px de la tête | `dbg.masque`, `N.spr.get('tete', dir, 0)`, `N.spr.dir` |
| R-38 | sections « Jalon A » et « Jalon B » de `refonte/RETOURS-PROPRIETAIRE.md` | fichier |

**Hors banc** : le p95 sur le vrai iPhone (R-20) et le suivi de chaque « non » de la propriétaire (R-38).

## Les conventions sur lesquelles les bancs s'appuient (à confirmer au contrat)

Le contrat 1.0 ne fixe pas tout ce qu'un banc doit lire. Les bancs supposent les points suivants ; s'ils
changent, seule la ligne concernée est à reprendre ici :

1. **Le départ direct** : `N.game.reset(graine, {depart:'plongee'})` met la partie en `plongee` (c'est ce que
   fait le squelette du lot 0b). Sinon `__MESURE.allerEnJeu` pousse par `dbg.input({any, valider})`.
2. **`dbg.simuler(sec)`** fait avancer le temps de jeu de `sec`, borné en pas quand l'horloge est arrêtée.
3. **`N.dir.vague()`** rend un objet `{n, nom, quartier, etape, evt}` (ou un nombre : les deux sont lus).
4. **`N.decor.etat()`** sans argument rend le nom de l'état courant.
5. **`S.input.stick`** `{active, ox, oy, r}` (pt CSS) publie l'origine du manche (R-22, R-33) ; hors contrat.
6. **`N.score.vies`** s'écrit (R-17 force la dernière vie).
7. **`N.ennemis.spawn(type, x, y, {elite, direct:true})`** pose un ennemi tout de suite, sans portail (R-12, R-28).
8. **`N.music.rmsOut()`** et **`N.music.context()`** restent publiés pour les tests (R-25, R-29).
9. **`N.spr.get('tete', dir, 0)`** rend le sprite de tête (R-37).

## Les mesures approchées (heuristiques documentées)

- **R-10** : les vitesses de plan sont les décalages horizontaux entiers distincts (portés par au moins deux
  bandes) qui recalent au mieux le tampon entre deux images à 0,5 s ; le sol en perspective peut compter
  plusieurs vitesses.
- **R-13** : un flash est une paire de transitions opposées sur plus de 6,6 % du tampon (luminance relative
  ±0,1 avec la plus sombre sous 0,8, ou entrée et sortie du rouge saturé) ; WCAG 2.3.1 simplifié.
- **R-18** : hors la cause (exacte) et CONTINUER, les rubriques de l'écran de fin sont cherchées par
  mots-clés dans les textes demandés à `N.spr.text` (indicatif) ; la capture est jointe.
- **R-32** : le masque de cité est fait des encres de silhouette au-dessus de l'horizon, décor lointain seul.
- **R-37** : « tête identique au sprite » est comparé en nombre de pixels (code 1 contre pixels opaques du
  sprite).
- **R-12, R-28** : la poussée de caméra est l'écart caméra − tête rapporté au même écart sur les 30 images
  d'avant (le suivi qui se pose encore n'est pas compté).
- **R-22** : les durées sont relues telles que la page les reçoit (`performance.now` des événements), pour
  ne pas compter le retard de CDP.

## Ajouter ou reprendre un critère

Un critère est un module :

```js
import { executer, principal, seuils, exiger } from '../commun.mjs';
export const meta = { id: 'R-xx', titre: '…', seuil: '…', bloquant: true /*, exclusif: true si temps réel */ };
export async function mesurer(banc, res) {
  const s = await banc.ouvrir('paysage', { dt: 1 / 60 });          // graine, dt, query, cpu, reducedMotion, bloquer…
  const { s: S } = await seuils(s, 'Rxx');                          // N.R.criteres.Rxx, sinon src/02-regles.js, sinon le plan
  if (!await exiger(s, res, 'nom de la mesure', ['N.game.dbg.scene'])) return;   // « non mesurable : interface … absente »
  const r = await s.scene('charge'); if (!r.ok) return res.nonMesurable('charge', r.raison);
  const a = await s.analyse({ gaine: true });                       // parts du tampon et du masque
  res.verifie('pixels lumineux', a.lumineux, '≥ 0,25', a.lumineux >= 0.25);
}
if (principal(import.meta.url)) executer({ meta, mesurer });
```

`res.verifie(nom, valeur, seuil, ok, détails)`, `res.indicatif(…)`, `res.nonMesurable(nom, raison)`,
`res.absent(nom, interfaces)`, `res.horsBanc(nom, raison)`, `res.note(texte)`, `res.capture(fichier)`.
