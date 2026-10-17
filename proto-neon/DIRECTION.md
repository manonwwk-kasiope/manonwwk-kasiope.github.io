# NEON 2084 — direction artistique et contrat technique du prototype

Prototype de style. Deux minutes de jeu, une seule scène, dont le seul but est de faire dire oui ou non
à la joueuse sur le style. Il ne remplace pas `snake2030/`, qui reste jouable et intact.

## L'intention, en une phrase

Une borne d'arcade de 1984 qu'on aurait retrouvée en 2084 : gros pixels, néon, balayage cathodique,
synthwave — mais avec la réactivité et la lisibilité d'un jeu d'aujourd'hui.

## Ce qui est non négociable

**Les gros pixels sont réels, pas simulés.** Tout le jeu se dessine dans un tampon de basse résolution,
puis ce tampon est agrandi en voisin le plus proche. Jamais de filtre « pixelisé » par-dessus du rendu
haute résolution : un pixel du jeu doit être un carré net, identique partout à l'écran.

- Taille apparente du pixel : constante quelle que soit la machine. `px = clamp(round(cssW / 340), 2, 6)`,
  tampon = `ceil(cssW / px) × ceil(cssH / px)`. Pas de letterbox, pas de bandes noires.
- `imageSmoothingEnabled = false` sur le contexte de sortie. Toutes les positions de dessin arrondies
  au pixel du tampon : un sprite ne doit jamais tomber entre deux pixels.
- Conséquence mesurable, et c'est un gain : sur iPhone 844×390 à px = 2, on dessine 422×195 au lieu de
  1266×585, soit neuf fois moins de pixels. Le prototype doit donc être PLUS rapide que le jeu actuel.

**La palette est fermée à seize couleurs.** Aucun littéral de couleur hors de la table. Un dégradé se
fait au tramage (dither 4×4 de Bayer), pas en interpolation. C'est ce qui donne l'époque.

| rôle | hex | usage |
|---|---|---|
| vide | `#0d0221` | fond du monde |
| nuit | `#190b28` | voiles, profondeur |
| ardoise | `#241734` | structures mortes |
| violet | `#541388` | treillis, grille de sol |
| indigo | `#2d1b69` | treillis proche |
| magenta | `#ff2a6d` | ENNEMIS, danger, télégraphes |
| rose pâle | `#ff8fab` | éclats d'ennemi |
| cyan | `#05d9e8` | LA JOUEUSE, et elle seule |
| cyan pâle | `#d1f7ff` | tête, reflets de la joueuse |
| ambre | `#ff9e00` | butin, énergie |
| jaune | `#ffd319` | score, récompense |
| brasier | `#ff5714` | explosions, cœur chaud |
| os | `#fffce8` | flash de frappe, texte |
| acier | `#8a8fa3` | interface neutre |
| sang | `#8b0f3a` | ombre des ennemis |
| nuit profonde | `#01012b` | bordure d'arène, gaine des télégraphes |

Le cyan appartient à la joueuse. Un ennemi, un décor, un butin n'est JAMAIS cyan. Cette règle vient de
l'objectif de lisibilité déjà livré et elle survit à la refonte.

**La musique est générée, pas jouée.** Aucun fichier audio. Un moteur qui recombine des motifs, et dont
la règle d'or est : rien ne se répète à l'identique plus de deux fois. C'est la réponse à « pas
agaçante » — ce n'est pas une question de goût mais de répétition.

**Soixante images par seconde sur iPhone 13 paysage.** Mesuré, pas supposé. Le prototype hérite du banc
d'essai de `snake2030/tools/test/banc.mjs`.

## Ce que le prototype doit montrer

1. **Une séquence d'ouverture en gros pixels.** Logo qui se construit, grille qui défile vers l'horizon,
   briefing de mission en trois lignes, transition vers le jeu. Sautable à la première touche.
2. **Deux minutes de jeu** qui vont du calme au chaos : on comprend en cinq secondes, on est débordé à
   la fin. Une montée, pas un palier.
3. **Des explosions énormes.** Un gros ennemi qui meurt doit remplir un quart de l'écran de brasier et
   d'éclats, secouer la caméra, et geler l'image. En gros pixels, une explosion est une forme, pas un
   flou : des anneaux concentriques tramés qui s'étendent et se trouent.
4. **La musique qui suit l'action.** Quatre couches qui entrent et sortent : basse, batterie, nappe,
   lead. Au calme deux couches, au chaos les quatre.
5. **Un défi nommé**, affiché à l'écran et réussi ou raté de façon lisible.

## Ce qui est interdit

- Toute dépendance externe : pas de CDN, pas de police web, pas d'audio externe. Un seul fichier. Les
  seules images admises sont les illustrations de `art/`, générées puis converties en pixel art dans la
  palette fermée, et injectées dans le bundle par `build.mjs`.
- Toute couleur hors palette, tout `Math.random` (le prototype doit être rejouable à graine fixe),
  tout `Date.now` (horloge de jeu uniquement).
- Toucher à `snake2030/`. Le prototype vit dans `proto-neon/` et nulle part ailleurs.

## Comment on juge

Automatiquement, et sur les pixels rendus, pas sur l'état interne :

1. **Pixels carrés** : une capture agrandie montre des blocs de `px × px` identiques ; zéro valeur
   intermédiaire sur un bord de sprite (preuve que rien n'est lissé).
2. **Palette fermée** : sur dix captures de jeu, 100 % des pixels appartiennent à la table des seize,
   tolérance zéro.
3. **Cyan réservé** : la part de pixels cyan hors du masque de la joueuse est sous 0,5 %.
4. **Explosion** : à la mort d'un gros ennemi, la part de pixels « brasier » dépasse 8 % de l'écran
   pendant au moins quatre images, et la caméra bouge d'au moins six pixels de jeu.
5. **Musique non répétitive** : sur trois minutes enregistrées en hors-ligne, aucune fenêtre de quatre
   secondes n'est identique à une autre à moins de 1 % près (corrélation sur l'enveloppe RMS).
6. **Montée en tension** : le nombre d'ennemis vivants et le niveau RMS de la musique croissent tous
   deux de façon monotone par tranches de vingt secondes.
7. **Performance** : banc d'essai iPhone 13 paysage, p95 du coût d'image sous 16,7 ms, et strictement
   meilleur que `snake2030/index.html` mesuré dans la même fenêtre.
8. **Zéro erreur** : aucune exception, aucune erreur de console, sur bureau et sur iPhone.
