# Les pilotes automatiques — spécification gelée (contrat 1.0)

*Écrite par le gardien du contrat au lot 0a, d'après `REFONTE.md` § 4.10. **Elle est gelée** : le lot P
l'implémente dans `85-pilote.js` telle quelle, et le lot 9 règle les chiffres de `N.R` contre ces pilotes
sans jamais les modifier. Sinon on règle un pilote pour qu'il tombe dans ses cibles, ce qui ne mesure rien.
Un pilote qui ne peut pas être implémenté tel qu'écrit fait l'objet d'une demande au gardien
(`refonte/lots/demandes.md`), qui publie une version corrigée de ce fichier avant tout réglage.*

## 1. Ce qu'un pilote a le droit de faire

**Il lit** seulement :

- l'état partagé `S`, dans ses champs du contrat (§ 7 de `CONTRAT.md`) : `S.player`, `S.enemies`, `S.shots`,
  `S.tele`, `S.butin`, `S.voies`, `S.monde`, `S.vue`, `S.vague`, `S.ecran`, `S.vol`, `S.t`, `S.reglages` ;
- les constantes du jeu : `N.R` (rayons qui tuent, vitesses, durées) et `N.ids` (listes, `N.ids.tableEtats`) ;
- l'état du jeu : `N.game.etat()` ;
- le pas : `N.horloge.H` et `N.horloge.pas()`.

Rien d'autre : ni les objets privés des modules, ni leurs champs `_…`, ni `N.ennemis`, `N.joueuse`, `N.cam`
directement. Une recherche dans le code de `85-pilote.js` le prouve (critère du lot P).

**Il écrit** seulement `S.input` : `x`, `y`, `mag`, `boost`, `pouvoir`, `apogee`, `chiffre`, `valider`. Il
ne pose jamais `pause`, `retour` ni `car`. Il ne touche pas `S.input.gestes` ni `S.input.taps`.

**Il tire** seulement dans le flux `N.rng('pilote')`.

**Il est appelé** par `79-jeu.js`, par `N.pilote.agir(dt)`, **au début de chaque pas**, avant tous les autres
modules, quand il est actif (`N.pilote.activer(true)`, attraction et bancs). `N.pilote.niveau(nom, opts)`
choisit le pilote ; `opts.variante` est réservé aux variantes de l'expert (§ 5).

**Il journalise** ses décisions par `N.journal('pilote', {nom, evt, …})` (§ 7) ; c'est ce journal qui prouve
sa conformité à cette spécification.

## 2. Le cycle d'un pas : percevoir, décider, attendre, agir

Les angles sont en radians, dans le repère du monde (x vers la droite, y vers le bas, comme l'écran). La
direction écrite dans `S.input` est le vecteur unitaire `(cos θ, sin θ)`.

1. **Percevoir.** Au pas p, le pilote lit `S` tel que le pas p − 1 l'a laissé.
2. **Décider.** Il calcule une **sortie** : un cap visé θ*, l'accélération (booléen), une impulsion de
   pouvoir et d'APOGÉE (booléens), une carte. Un pilote dont la **période de décision** Δ est plus longue que
   le pas garde sa sortie entre deux décisions.
3. **Le bruit de cap.** Le cap écrit est θ = θ* + ε, avec ε tiré **uniformément** dans [−e, +e] (e en degrés,
   table du § 5) dans le flux `pilote`, **redessiné toutes les 0,25 s** de temps de jeu (et à chaque décision
   pour le maladroit). e = 0 : aucun tirage.
4. **Le retard.** La sortie décidée au pas p est écrite dans `S.input` au pas **p + R**, avec
   R = round(τ / h), où τ est le temps de réaction (table du § 5) et h = 1/120 s. Une file circulaire de R + 1
   sorties le réalise. Pendant les R premiers pas d'une partie, la sortie écrite est « rien » (`mag` = 0).
5. **Agir.** Au pas p + R : `S.input.x = cos θ`, `S.input.y = sin θ`, `S.input.mag = 0,80` (ou 0 quand la
   sortie est « rien », 1,0 dans la seule variante `auto` de l'expert quand il accélère par la poussée),
   `S.input.boost`, et `S.input.pouvoir`, `S.input.apogee` vrais pendant **un seul** pas.

**Pourquoi 0,80** : au-delà de 0,70 de course le taux de virage est plein (`N.R.joueuse.deflexion.pleine`),
et sous 0,85 la poussée droit devant n'accélère jamais (`N.R.boost.seuilCourse`). Un pilote qui ne veut pas
accélérer ne doit pas accélérer par mégarde.

## 3. Le champ de potentiel (pilotes bon, humain, expert, dieu)

À chaque décision, le pilote évalue **25 caps candidats** : les 24 directions espacées de 15°, plus le cap
réel courant `S.player.ang`. Pour chaque candidat θ, il prédit la trajectoire de la tête :

- **Prédiction.** Départ en `(S.player.x, S.player.y)` avec le cap réel ; intégration par sous-pas de 0,05 s ;
  à chaque sous-pas, le cap tourne vers θ d'au plus ω × 0,05, avec ω = `N.R.f.virage(v)` et v =
  `S.player.vit`, puis la tête avance de v × 0,05. On garde les positions P_k aux instants
  **t_k = 0,10 ; 0,25 ; 0,45 ; 0,70 s**, de poids **w_k = 1,0 ; 0,8 ; 0,6 ; 0,4**.
- **Coût.** C(θ) = Σ_k w_k × U(P_k, t_k) + 6 × |θ − ang| / π (le dernier terme préfère ne pas tourner ;
  |θ − ang| est ramené dans [0, π]).
- **Choix.** θ* = le candidat de coût minimal. **Hystérésis** : le cap choisi à la décision précédente est
  gardé tant que son coût dépasse le minimum de moins de 2.

**Le potentiel U(P, t)** est la somme des termes ci-dessous. Une distance d est celle de P à l'objet ;
« prédit » veut dire déplacé de (vx, vy) × t. `CERT` vaut 1 000 : c'est une mort certaine.

| Source | Condition | Terme |
|---|---|---|
| **Murs** (`S.monde`, rectangle `x0,y0,x1,y1`, déplacé de `vx × t` quand `mobile`) | d = distance au bord le plus proche | d < 4 : CERT ; sinon 40 × max(0, 1 − d / 24)² |
| **Murs annoncés** (`S.monde.annonce`) | P hors du rectangle annoncé | 30 |
| **Son corps** (`S.player.segs`, segments 6 à len − 4) | d au centre du segment | d < 6,5 : CERT ; sinon 20 × max(0, 1 − d / 12)² |
| **Télégraphes** (`S.tele`, cible `tete` ou `tout`) | P dans la zone, marge de 4 px (§ 3.1) | t ≥ reste − 0,1 : 300 ; sinon 80 |
| **Tirs ennemis** (`S.shots`, prédits) | d | d < 5 + r : CERT ; sinon 50 × max(0, 1 − d / 14)² |
| **Ennemis** (`S.enemies` hors `portail`, `mort`, `proie`, et hors `planeur`, prédits) | R = 6 + 0,8 r ; d | d < R : CERT ; sinon 30 × max(0, 1 − (d − R) / 24)² |
| **TRAQUEUR** (en plus du terme ennemi) | d | 60 × max(0, 1 − d / 40)² |
| **Mines** (type `mine`, hors `proie`) | d < 37 (cercle d'armement + 3) | 150 |
| **Voies** (`S.voies`) | `y0 − 6 ≤ P.y ≤ y1 + 6` | `passage`, ou `annonce` avec reste − t < 0,3 : 200 ; `annonce` sinon : 120 |
| **Butin** (`S.butin`, cellule et noyau) | d | − 6 × max(0, 1 − d / 120) (noyau : − 12 ×) |
| **PASTILLE** (`S.butin`, type `pastille`) | d | − 40 × max(0, 1 − d / 300) |
| **Chasse** (`S.enemies` hors `portail`, `mort`, `proie`, TRAQUEUR) | d | − 4 × exp(−((d − 60) / 25)²) |
| **Proies** (`etat` = `proie`) | d | − 30 × max(0, 1 − d / 150), et aucun terme de danger |
| **Planeurs** (LE DÉFILÉ) | d | − 4 × exp(−((d − 40) / 25)²) |

### 3.1 La géométrie des télégraphes

Toutes les zones prennent une marge m = 4 px (le rayon qui tue de la tête, plus un pixel) :

- `ligne` : distance de P au segment (x0,y0)–(x1,y1) ≤ r + m ;
- `disque`, `losange` : distance de P à (x0,y0) ≤ r + m ;
- `secteur` : distance à (x0,y0) ≤ r + m, et angle de P vu de (x0,y0) entre a0 et a1 (dans le sens
  croissant, modulo 2π) ;
- `rect`, `voie` : P dans le rectangle (x0,y0)–(x1,y1) agrandi de m.

## 4. Les règles d'action

### 4.1 Le LASSO

**Le groupe.** Parmi les ennemis de `S.enemies` hors `portail`, `mort`, `proie` (le TRAQUEUR compris), on
prend chaque ennemi comme graine et on compte ceux dont le centre est à 60 px ou moins d'elle ; la graine du
plus grand compte gagne (à égalité, la plus proche de la tête). Le groupe est cet ensemble, et c le
barycentre de ses centres.

**L'entrée en mode LASSO** a lieu quand, à la fois :

- le groupe compte **au moins 4** ennemis ;
- la tête est à **140 px ou moins** de c ;
- `S.player.len` ≥ 8, et le dernier LASSO tenté a commencé il y a plus de 1,5 s ;
- (expert seulement) le **plan** est sûr : les 24 points du cercle de centre c et de rayon r_L sont à 24 px
  au moins à l'intérieur des murs, hors de toute zone de télégraphe, et aucun segment 6 à len − 4 du corps
  n'est à moins de r_L + 8 de c ; et la boucle est faisable : 2π r_L ≤ 0,9 × (v × `N.R.f.traine(len)` +
  5 × (len − 3)).

**Le rayon** r_L = max(26, distance du membre le plus éloigné de c + 16). L'expert le réduit au besoin, sans
descendre sous 20, pour tenir la condition de faisabilité.

**Le guidage.** Soit φ l'angle de la tête vers c, et d la distance. Le cap visé est
θ* = φ − s × (π/2 − κ), avec κ = clamp(1,2 × (d − r_L) / r_L, −0,7, 0,7) : au-delà du rayon, le cap rentre
vers c ; en deçà, il sort. Le sens s ∈ {+1, −1} est choisi **à l'entrée** : celui des deux dont le cap
initial est le plus proche du cap réel, puis il ne change plus. Le centre c est recalculé à chaque décision
sur les membres du groupe encore vivants.

**La sortie du mode LASSO**, au premier des cas :

- `boucle` : la tête a tourné, depuis l'entrée, d'au moins 2π + 0,6 rad (cumul des variations du cap réel) ;
- `temps` : 2π r_L / v + 1,0 s se sont écoulées ;
- `danger` : un point de la trajectoire prédite du cap guidé a un potentiel U ≥ CERT ; le pilote reprend
  alors le champ de potentiel au pas même ;
- `vide` : le groupe n'a plus de membre vivant.

Pendant le mode LASSO, le champ de potentiel ne sert qu'à tester le `danger`. **Une tentative** est une entrée
en mode LASSO ; elle est **réussie** si un enregistrement `lasso` du journal tombe entre l'entrée et la sortie
plus 0,3 s. C'est sur cette définition que se mesurent R-34 et le critère du pilote humain.

L'**humain** tente « sans planification » : mêmes règles d'entrée sans le plan de l'expert, même guidage, avec
son retard et son bruit.

### 4.2 Le pouvoir et l'APOGÉE

Le pilote connaît le pouvoir équipé par `S.player.pouvoir` et sa disponibilité par `S.player.pouvoirPret`.
Le pouvoir se déclenche par une impulsion `S.input.pouvoir`, l'APOGÉE par `S.input.apogee`. « En vue » veut
dire : centre dans le rectangle `S.vue`.

| Règle (pilotes bon, expert, dieu) | Déclenche |
|---|---|
| `traversee` équipée et prête, et un coup frappe la tête dans moins de **0,2 s** : un télégraphe `tete`/`tout` dont reste < 0,2 et dont la zone contient la tête prédite à t = reste ; ou un tir dont l'approche la plus proche dans les 0,2 s est sous 4 + r ; ou un ennemi en `attaque` prédit à moins de 6 + 0,8 r dans les 0,2 s | pouvoir |
| `ralenti` équipé et prêt, et au moins **3** télégraphes dont (x0,y0) est en vue | pouvoir |
| `repli` équipé et prêt, et au moins **5** ennemis (hors `portail`, `mort`, `proie`) à moins de **60 px** de la tête | pouvoir |
| `S.player.apogee` ≥ 100 et au moins **8** ennemis en vue (hors `portail`, `mort`, `proie`) | APOGÉE |
| (expert seulement) `S.player.apogee` ≥ 100 et l'œil du CYCLOPE (`boss`, partie `oeil`) en vue | APOGÉE |

Le **kamikaze** déclenche le pouvoir dès que `pouvoirPret`, et l'APOGÉE dès qu'elle est pleine. Le
**maladroit**, l'**humain**, l'**inerte** et le **tourneur** ne les déclenchent jamais eux-mêmes ; pour
l'humain, c'est le réglage ACTIONS AUTO du jeu qui s'en charge.

### 4.3 L'accélération

| Pilote | Règle |
|---|---|
| bon, dieu, humain, maladroit, inerte, tourneur | jamais (`S.input.boost` = false) |
| kamikaze | `boost` = vrai quand sa cible est à plus de 40 px |
| expert | `boost` = vrai quand le coût minimal C(θ*) dépasse 150, que |θ* − ang| < 15° et que `S.player.reserve` > 30 (fuir) ; ou quand le TRAQUEUR est à moins de 80 px (le semer) |
| expert, variante `auto` | même règle, mais par la **poussée droit devant** : `mag` = 1,0 au lieu de `boost` ; jamais `S.input.boost` |
| expert, variante `diriger` | jamais |

### 4.4 Les cartes

Quand `S.ecran.nom` vaut `cartes`, que `S.ecran.pret` est vrai et que `S.ecran.depuis` ≥ 0,45 s, le pilote
écrit `S.input.chiffre` = rang (1 à 4) de la carte choisie pendant **un** pas, puis 0 pendant au moins 0,2 s
avant un éventuel choix suivant (« CHOISIS 2 »). Il journalise `{evt:'carte', id, rang}`.

- **Ordre de préférence fixe** (bon, humain, kamikaze, dieu) : la première carte de la main dont
  l'identifiant vient le plus tôt dans
  `tourelles, canon, missiles, bouclier, croissance, arc, puissance, cadence, drones, traversee,
  reparation, aimant, minesQ, grappe, sangFroid, braise, eperon, ralenti, repli`.
- **Expert** : d'abord une carte d'arme dont `S.ecran.niveaux` vaut 4 (l'ULTIME) ; sinon la première dans
  `canon, tourelles, missiles, grappe, puissance, cadence, bouclier, arc, croissance, traversee,
  reparation, sangFroid, aimant, drones, braise, minesQ, eperon, ralenti, repli`.
- **Maladroit** : un rang uniforme parmi les cartes de la main, par `N.rng('pilote').i(1, n)`.
- **Inerte, tourneur** : le rang 1.

### 4.5 Les autres états

| État (`N.game.etat()`) | Ce que fait le pilote |
|---|---|
| `jeu`, `nettoyage`, `defile`, `alerte`, `boss`, `reapparition`, `attraction`, `plongee` | son comportement de combat (§ 3 à 5) |
| `cartes` | § 4.4, et `mag` = 0 |
| `vol` | si `S.vol` existe : cible = l'objet `porte` ou `cellule` de plus petit `avant` ≥ 0,3 s ; cap = vers sa position écran depuis `S.vol.tete` ; si une `mine` a `avant` < 1,2 s et est à moins de 24 px de la tête, cap horizontal opposé à la mine. Le maladroit et le kamikaze visent l'objet le plus proche sans éviter ; l'inerte ne fait rien. Sans `S.vol` : `mag` = 0 |
| `mort`, `panneau`, `pause`, `fin`, `initiales`, `titre`, `ouverture`, `briefing`, `demarrage` | rien (`mag` = 0, aucune impulsion) ; jamais `valider` : les bancs ne sautent pas les séquences |

## 5. Les huit pilotes

| Pilote | Réaction τ | Bruit e | Décision Δ | Cap | LASSO | Pouvoir, APOGÉE | Accélération | Cartes |
|---|---|---|---|---|---|---|---|---|
| **inerte** | — | — | — | `mag` = 0 en permanence : il ne touche à rien, le serpent file droit | non | jamais | jamais | rang 1 |
| **tourneur** | 0 | 0 | chaque pas | θ* = `S.player.ang` + π/2 : il tourne en rond | non | jamais | jamais | rang 1 |
| **maladroit** | 0 | ± 35°, tiré à chaque décision | 0,7 s | vers le plus proche des butins (hors pastille) et des ennemis (hors `portail`, `mort`), sans aucun terme de danger, murs compris | non | jamais | jamais | au hasard |
| **kamikaze** | 0,08 s | 0 | chaque pas | droit sur l'ennemi le plus proche (hors `portail`, `mort`), sans aucun terme de danger | non | dès que prêt, dès que pleine | au-delà de 40 px | ordre fixe |
| **humain** | 0,12 s | ± 10° | chaque pas | champ de potentiel | sans planification | jamais lui-même : le banc pose `S.reglages.actions = 'auto'` | jamais | ordre fixe |
| **bon** | 0,08 s | 0 | chaque pas | champ de potentiel | oui | § 4.2 | jamais | ordre fixe |
| **expert** | 0,05 s | 0 | chaque pas | champ de potentiel | planifié | § 4.2, plus l'œil du CYCLOPE | pour fuir et semer | ordre de l'expert |
| **dieu** | 0,08 s | 0 | chaque pas | comme le bon ; le banc pose `__N.game.dbg.god(true)` | oui | § 4.2 | jamais | ordre fixe |

**Les variantes de l'expert** (R-23), par `N.pilote.niveau('expert', {variante})` :

- `diriger` : il ne fait que diriger : ni `boost`, ni poussée, ni pouvoir, ni APOGÉE ;
- `auto` : le banc pose `S.reglages.actions = 'auto'` ; il accélère par la poussée droit devant (`mag` = 1,0) et
  ne pose jamais `pouvoir`, `apogee` ni `boost`.

## 6. Le banc

- **Profil** : iPhone 13 paysage (vue de 422 × 195 px), `__DT = 1/60`, mode simulé sans dessin
  (`__N.game.dbg.simuler`), journal complet.
- **Partie** : profil vierge (`localStorage` vide : première partie), graine de partie = numéro de graine,
  `S.jour` = 20261017, `N.game.reset(graine)` puis départ direct en `plongee`, **sans CONTINUER**. La partie
  s'arrête au premier passage en `fin` (game over ou victoire) ou après 9 minutes de temps de jeu.
- **Graines** : 1 à 50 pour toute proportion ; 5 graines par profil pour le zéro erreur sur les autres profils.
- **Les cibles** sont celles du § 4.10 de `REFONTE.md`, recopiées dans `N.R.pilotes` ; seules les cibles
  marquées (B) sont bloquantes (R-04).

## 7. Le journal du pilote

Chaque enregistrement est `N.journal('pilote', {nom, evt, …})`, avec :

| `evt` | Champs | Quand |
|---|---|---|
| `cap` | `vise` (θ* en rad), `bruit` (ε en rad), `retard` (τ en s), `cout` (C(θ*)) | toutes les 0,25 s de temps de jeu |
| `lassoTente` | `n` (taille du groupe), `rayon` (r_L), `longueur` (`S.player.len`), `sens` (s) | entrée en mode LASSO |
| `lassoFin` | `raison` ∈ `boucle`, `temps`, `danger`, `vide` | sortie du mode LASSO |
| `pouvoir` | `id` | impulsion de pouvoir (au pas de la décision) |
| `apogee` | — | impulsion d'APOGÉE (au pas de la décision) |
| `boost` | `on` (booléen) | à chaque changement de la sortie d'accélération |
| `carte` | `id`, `rang` | choix d'une carte |

## 8. La conformité (critères du lot P)

- les 8 pilotes tournent 6 minutes sans erreur, en mode dessiné et en mode simulé ;
- **reproductibles** : deux exécutions de même graine donnent le même journal ;
- **retard** : sur une scène scriptée où un télégraphe apparaît, la première sortie qui en tient compte est
  écrite exactement R = round(τ / h) pas après la décision (journal `cap`) ;
- **bruit** : sur 2 minutes, les `bruit` journalisés sont dans [−e, +e], de moyenne nulle à 15 % de e près et
  d'écart type e / √3 à 15 % près ;
- **cartes** : sur des mains scriptées, le choix suit l'ordre du § 4.4 ;
- **lecture** : une recherche dans `85-pilote.js` ne trouve aucune lecture hors de la liste du § 1.

## 9. Historique

| Version | Date | Changement |
|---|---|---|
| 1.0 | 17 oct. 2026 | spécification gelée, lot 0a |
