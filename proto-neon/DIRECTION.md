# SNAKE 2975 — direction artistique et contrat technique du prototype

*Amendée par le lot 0a de la refonte, le 17 octobre 2026, d'après `REFONTE.md` § 0.2. L'ordre d'autorité
est : les retours de la propriétaire (`refonte/RETOURS-PROPRIETAIRE.md`, y compris ceux des jalons), puis
`REFONTE.md`, puis ce fichier et `CONTRAT.md`, puis les exigences J-, G- et V- de `recherche/`.*

Le jeu s'appelle **SNAKE 2975**. NEON 2084 n'était qu'un nom de travail : le dossier `proto-neon/` le
garde, mais le titre de la page, le logo et tout texte affiché à l'écran disent SNAKE 2975, et
l'histoire se passe en 2975.

**Un secteur complet et rejouable** : de l'éveil à la mort du CYCLOPE, en six quartiers, de 5 min 20 à
6 min 30 pour une bonne joueuse qui gagne. Il faut pouvoir le rejouer, et le perdre. Il ne remplace pas
`snake2030/`, qui reste jouable et intact.

## L'intention, en une phrase

Une borne d'arcade des années 80 qu'on aurait retrouvée en 2975 : gros pixels, néon, balayage cathodique,
synthwave — mais avec la réactivité et la lisibilité d'un jeu d'aujourd'hui. **Lumineuse, dure et juste,
spectaculaire** : on y meurt souvent, mais toujours de ce qu'on a vu venir.

## Ce qui est non négociable

**Les gros pixels sont réels, pas simulés.** Tout le jeu se dessine dans un tampon de basse résolution,
puis ce tampon est agrandi en voisin le plus proche. Jamais de filtre « pixelisé » par-dessus du rendu
haute résolution : un pixel du jeu doit être un carré net, identique partout à l'écran.

- Taille apparente du pixel : la plus grande possible tant que la zone sûre garde au moins 360 × 180
  pixels de jeu, `px = max(2, ⌊min(largeur sûre / 360, hauteur sûre / 180)⌋)`, dans les deux orientations
  (`recherche/visuel-technique-mobile.md`). L'ancienne règle `round(cssW / 340)` donnait px 2 à
  l'iPhone 13 et px 3 à l'iPhone 16, soit 55 % de surface de jeu en moins pour presque le même écran.
  Tampon = `ceil(cssW / px) × ceil(cssH / px)`. Pas de letterbox, pas de bandes noires ; ce qui compte
  (interface, apparitions, joueuse) reste dans la zone sûre, que 90-boot.js publie dans `S.view.safe`.
- Le canvas mesure exactement tampon × px en CSS (90-boot.js s'en charge) : jamais de réduction non
  entière par le navigateur. Au bureau, la toile de sortie mesure tampon × k, où k est le plus grand
  diviseur de px qui garde la largeur sous 1 280 ; le CSS agrandit d'un facteur entier px / k.
- `imageSmoothingEnabled = false` sur le contexte de sortie. Toutes les positions de dessin arrondies
  au pixel du tampon : un sprite ne doit jamais tomber entre deux pixels. La caméra est arrondie au pixel
  une seule fois par image ; ni rotation, ni bascule, ni zoom non entier.
- Conséquence mesurable, et c'est un gain : sur iPhone 844×390 à px = 2, on dessine 422×195 au lieu de
  1266×585, soit neuf fois moins de pixels.

**Le monde dépasse l'écran.** Il mesure 1 024 × 512 px de jeu, indépendamment de l'écran ; une caméra suit
la tête et anticipe son cap ; six plans de parallaxe et un sol calculé ligne par ligne défilent derrière le
plateau de jeu, qui lui-même voyage à partir de la vague 2 (`REFONTE.md` § 3 et § 4.6).

**La palette est fermée à seize couleurs.** Aucun littéral de couleur hors de la table. Un dégradé se
fait au tramage (dither 4×4 de Bayer), pas en interpolation. C'est ce qui donne l'époque.

| rôle | hex | usage | luminance (WCAG) |
|---|---|---|---|
| vide | `#0d0221` | fond du monde | 0,002 |
| nuit | `#190b28` | voiles, profondeur | 0,006 |
| ardoise | `#241734` | structures mortes | 0,012 |
| violet | `#541388` | treillis, grille de sol | 0,041 |
| indigo | `#2d1b69` | treillis proche | 0,024 |
| magenta | `#ff2a6d` | ENNEMIS, danger, télégraphes | 0,240 |
| rose pâle | `#ff8fab` | éclats d'ennemi | 0,438 |
| cyan | `#05d9e8` | LA JOUEUSE, et elle seule | 0,555 |
| cyan pâle | `#d1f7ff` | tête, reflets de la joueuse | 0,873 |
| ambre | `#ff9e00` | butin, énergie | 0,457 |
| jaune | `#ffd319` | score, récompense | 0,679 |
| brasier | `#ff5714` | explosions, cœur chaud | 0,281 |
| os | `#fffce8` | flash de frappe, texte | 0,967 |
| acier | `#8a8fa3` | interface neutre | 0,277 |
| sang | `#8b0f3a` | ombre des ennemis | 0,061 |
| nuit profonde | `#01012b` | bordure d'arène, gaine des télégraphes | 0,002 |

Une encre est **lumineuse** si sa luminance dépasse 0,10 (`N.pal.L`, `N.pal.lumineux`) : magenta, rose pâle,
cyan, cyan pâle, ambre, jaune, brasier, os et acier.

Le cyan appartient à la joueuse. Un ennemi, un décor, un butin n'est JAMAIS cyan. Cette règle vient de
l'objectif de lisibilité déjà livré et elle survit à la refonte. **La joueuse comprend son arsenal** : ses
tirs, tourelles, drones, missiles, mines de queue, son lasso, sa traînée, et ses icônes de vie.

**Le jeu est lumineux.** Le décor de jeu reprend la lumière de l'ouverture : un grand soleil en bandes jaune,
ambre et brasier, une cité dont les enseignes tournent, un sol qui reflète le soleil. Le décor se tait par la
forme et par le contour (gaine de nuit profonde autour de tout ce qui joue), jamais par l'extinction.

**La musique de jeu est celle de la propriétaire.** C'est « Neon Velocity » (`snake2030/neonvelocity-2.mp3`,
lu en lecture seule), à 144,6 BPM, découpée en blocs MP3 de 8 mesures sous `proto-neon/musique/`, chargés à
la demande par `30-music.js` et réenchaînés sur la mesure selon l'action. **Le moteur génératif reste** pour
les couches, les accents, les sons, la voix, et il joue seul l'arrangement complet si la piste manque. La
règle d'or devient : **aucune mesure complète, toutes couches confondues, n'est identique trois fois de
suite**. La piste n'est jamais accélérée.

**Soixante images par seconde sur iPhone 13 paysage.** Mesuré, pas supposé, avec la parallaxe complète.

## Ce que le prototype doit montrer

1. **Une entrée en gros pixels.** Au chargement, le logo et « TOUCHE POUR COMMENCER ». Puis, à la première
   visite, l'ouverture en panneaux (logo qui se construit, grille qui défile vers l'horizon, briefing de
   mission, sautable à la première touche) ; aux visites suivantes, le titre. Puis une **plongée** dans le
   monde de jeu. Deux touchers au plus mènent au serpent.
2. **Un secteur qui monte**, en cinq vagues nommées dans cinq quartiers, LE VOL entre deux vagues, une étape
   bonus (LE DÉFILÉ) et un boss en trois phases (LE CYCLOPE) : on comprend en cinq secondes, on a peur avant
   0:20, on est débordée au CŒUR, avec des respirations entre les pics.
3. **Des explosions énormes.** Un gros ennemi qui meurt doit remplir un quart de l'écran de brasier et
   d'éclats, secouer la caméra, et geler l'image. En gros pixels, une explosion est une forme, pas un
   flou : des anneaux concentriques tramés qui s'étendent et se trouent.
4. **La musique qui suit l'action** : la piste de la propriétaire enchaînée par sections (INTRO, PLATEAU,
   RESPIRATION, RETOUR, OUTRO), filtrée par la tension, avec les couches génératives qui entrent à la mesure.
5. **Des défis nommés** : trois par partie (FINIR, et deux tirés chaque jour dans une réserve de douze), plus
   un défi par vague, affichés à l'écran et réussis ou ratés de façon lisible.
6. **Une vraie mort**, lisible et juste, qui fait peur : gel, cause entourée, désintégration, coupure de la
   musique, en 1,3 s.

## Ce qui est interdit

- Toute dépendance externe : pas de CDN, pas de police web. Le jeu est un bundle HTML, plus deux dossiers
  chargés à la demande : `musique/` (blocs MP3 et `piste.json`) et `cine/` (clips). `node build.mjs --embed`
  produit le fichier unique, autonome, où tout est inline. Les seules images admises sont les illustrations
  de `art/`, générées puis converties en pixel art dans la palette fermée, et injectées par `build.mjs`.
- Toute couleur hors palette, tout `Math.random` (le jeu doit être rejouable à graine fixe), tout `Date.now`
  (horloge de jeu uniquement).
- Toucher à `snake2030/`. Le prototype vit dans `proto-neon/` et nulle part ailleurs.

## Comment on juge

Automatiquement, et sur les pixels rendus, pas sur l'état interne (la batterie complète R-01 à R-38 est au
§ 8.5 de `REFONTE.md`) :

1. **Pixels carrés** : une capture agrandie montre des blocs de `px × px` identiques ; zéro valeur
   intermédiaire sur un bord de sprite (preuve que rien n'est lissé).
2. **Palette fermée** : sur dix captures de jeu, l'attraction, la mort, LE VOL, l'INVERSION, les cartes et la
   fin, 100 % des pixels appartiennent à la table des seize, tolérance zéro.
3. **Cyan réservé** : sur les captures de jeu, la part de pixels cyan et cyan pâle hors du masque de la
   joueuse est sous 0,5 %. **Le masque comprend son arsenal** (tirs, tourelles, drones, missiles, mines de
   queue, lasso, traînée) **et ses icônes de vie** ; il est produit par le jeu lui-même
   (`__N.game.dbg.masque()`, codes 1 à 4). Les panneaux de cinématique où le serpent apparaît sont hors de ce
   compte : ce serpent, c'est la joueuse.
4. **Explosion** : à la mort du CYCLOPE et des élites, la part de pixels « brasier » dépasse 8 % de l'écran
   pendant au moins quatre images, et la caméra bouge d'au moins six pixels de jeu. Et jamais plus de trois
   flashs par seconde sur plus de 6,6 % de l'écran (WCAG 2.3.1 ; magenta, brasier et sang sont des rouges
   saturés) : un limiteur global dans 50-fx.js atténue les explosions suivantes. Une seule énorme explosion
   reste permise, c'est la répétition qui est dangereuse.
5. **Musique non répétitive** : sur trois minutes enregistrées en hors-ligne, aucune fenêtre de quatre
   secondes n'est identique à une autre à moins de 1 % près (corrélation sur l'enveloppe RMS), et aucune
   mesure complète, toutes couches confondues, n'est identique trois fois de suite.
6. **Montée en tension, avec des respirations** (remplace la montée monotone par tranches de 20 s) :
   - le pic d'ennemis vivants croît d'une vague à l'autre ;
   - après chaque pic, les ennemis vivants restent sous 40 % de ce pic pendant au moins 8 s (G-17) ;
   - la musique monte d'au moins 6 dB entre le calme et le chaos, avec une corrélation tension ↔ niveau d'au
     moins 0,5.
7. **Performance**, mesurée **avec** la parallaxe complète, sur la scène de référence la plus chargée
   (`?scene=charge`) : au profil iPhone 13 ×1 en émulation, **sans** qualité adaptative, p95 du coût d'image
   ≤ 11 ms, et strictement meilleur que `snake2030/index.html` mesuré dans la même fenêtre ; au profil
   processeur ×4, p95 ≤ 25 ms avec la qualité adaptative et sans perte de temps de jeu ; sur le vrai iPhone
   de la propriétaire, p95 ≤ 16,7 ms lu sur `?perf=1`, aux deux jalons.
8. **Zéro erreur** : aucune exception, aucune erreur de console, sur bureau et sur iPhone.
9. **Lumière** (nouveau) : en jeu, au moins 25 % des pixels du tampon ont une luminance relative supérieure à
   0,10 dès la première seconde, et la part monte avec l'état du décor : au moins 25 % en `calme`, 28 % en
   `montee`, 32 % en `chaos`, 25 % en `colosse` ; luminance moyenne du tampon d'au moins 0,075, 0,085, 0,095
   et 0,075. Le décor seul reste entre 18 et 28 % de pixels lumineux, pour que le jeu reste devant.

Et la lisibilité, d'après les calculs de contraste de `recherche/visuel-technique-mobile.md` : le texte
en acier seulement sur vide, nuit ou ardoise, jamais sur indigo ni violet ; chaque menace garde un
contour d'un pixel en nuit profonde, même au milieu d'une explosion ou devant le soleil, parce que magenta
et brasier se confondent en niveaux de gris et pour une partie des daltoniens.

## Les écarts assumés à la recherche

- **Le son malgré l'interrupteur silencieux** : la recherche recommande que le son ne passe outre
  l'interrupteur silencieux de l'iPhone que sur un choix explicite (V-34, J-20). La propriétaire joue en mode
  silencieux et veut entendre la musique : le premier toucher qui lance le jeu vaut ce choix, et le jeu offre
  une coupure du son visible, mémorisée d'une partie à l'autre.
- **La mort dure 1,3 s** (J-17 demandait un écran de fin en moins d'une seconde) : la propriétaire demande
  une mort « qui fait peur ». La séquence se saute dès 0,5 s, et G-02 reste en vigueur : la joueuse peut avoir
  de nouveau le serpent en main moins de 2 s après l'impact ; l'écran de fin arrive au plus 1,5 s après.
- **Les autres écarts** (J-07 et le second doigt, V-17, V-25, V-36, G-18, et ce qui relève de la campagne)
  sont listés et justifiés au § 0.3 de `REFONTE.md`.
