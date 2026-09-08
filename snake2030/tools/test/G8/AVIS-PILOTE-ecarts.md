# Avis du pilote — relecture du diff de G8 contre les valeurs de la spécification

Relecture faite par le pilote de la chaîne, à la lecture du diff, avant le passage de l'exécuteur. Elle
ne remplace aucune mesure : elle compare les nombres écrits dans le code aux nombres écrits dans la
spécification, ce qu'aucun des sept tests ne fait.

## Un écart, un seul

**L'onde de montée de niveau va trois fois plus loin que demandé.** La spécification écrit « fx.ring
depuis la tête 10 → 600 u largeur 6 ». Le code appelle :

    S2030.fx.ring(s.x, s.y, '#ffffff', 10, 2000, { w: 6, life: 0.5 })

Le rayon de départ et la largeur sont conformes ; le rayon d'arrivée vaut 2 000 unités au lieu de 600,
soit trois fois et un tiers. C'est le seul appel à `fx.ring` ajouté par l'objectif, et la valeur 600
n'apparaît nulle part ailleurs comme rayon dans le diff.

Le test 5 ne peut pas le voir : il vérifie qu'un appel à `fx.ring` part bien de la tête à deux unités
près, pas jusqu'où l'onde va. L'écart est donc invisible à la batterie et ne se voit qu'en lisant.

**Ce que j'en pense, sans trancher à la place du médiateur.** Une onde de 600 unités sur une vue qui en
fait 1 200 de large traverse la moitié de l'écran ; à 2 000 elle sort du cadre par tous les côtés. Ce
peut être un choix délibéré pour que l'onde balaie l'écran entier au moment où le temps ralentit, auquel
cas il doit être déclaré dans `deviations` avec sa raison. Ce peut être un nombre posé au jugé. La
question à poser à l'implémenteur est simplement : pourquoi 2 000 ?

## Ce que la relecture a confirmé comme conforme

Vérifié valeur par valeur dans le diff : gel de l'ultime ramené de 0,85 à 0,4 pendant 120 ms et bannière
retirée ; secousse de l'ultime plafonnée à 18 ; taille du score flottant `13 + 2 × min(combo, 6)` avec
bascule à l'ambre dès que le multiplicateur dépasse un et vitesse verticale −60 ; hauteur du son de kill
`2^(min(combo, 12) / 12)` ; secousse directionnelle à la blessure 0,6 en ordinaire, 1,5 pour une élite,
2 pour un boss ; teinte de blessure `#ff2b52` à 0,7 en mode vignette ; plafond d'un flash plein écran
toutes les 4 000 ms ; silhouette d'ennemi remplie tant que `hitT > 60` ms ; `fx.hit` désormais appelé.

Les trois bornes de combo sont écrites en ternaires plutôt qu'avec `Math.min` : c'est la même chose, et
une recherche naïve du texte de la spécification les manquerait.

## Une inquiétude levée par la lecture, pas par une mesure

La séquence de montée de niveau dure « 350 ms » comptées sur `S.t`. J'ai vérifié comment `S.t` avance :
`S.t += raw * 1000` dans `90-boot.js`, où `raw` est le temps d'image **non ralenti**. Les 350 ms sont
donc du temps réel, soit une vingtaine d'images, et non 350 ms de temps de jeu qui auraient duré deux
secondes et demie à l'écran sous un ralenti à 0,15. La séquence est bien courte. C'était mon premier
soupçon en lisant le diff, et il est infondé.

---

# RECTIFICATION — l'écart signalé n'existe pas, j'avais mal lu la signature

L'exécuteur a mesuré le rayon réel de l'onde au pixel, et il réfute ce que cette note reproche au code.

**Ce que j'avais mal lu.** Le cinquième argument de `fx.ring` n'est pas un rayon d'arrivée. `_fxRing`
l'écrit dans `r.sp` et `_fxUpdate` intègre `r.r += r.sp · dt` avec `r.sp *= 1/(1 + 3,2 · dt)` : c'est une
**vitesse en unités par seconde, amortie**. Écrire 2 000 ne demande donc pas un rayon de 2 000.

**Ce que donne la mesure.** Différence A/B sur la même image de jeu, scène figée, l'anneau isolé en
capturant avec puis sans lui. Le code livré fait croître l'onde jusqu'à environ 520 unités, ce qui rend
bien le « 10 → 600 u » de la spécification. En écrivant 600 comme ma lecture littérale le demandait, la
même mesure donne 152 unités : une onde quatre fois trop petite. Ma correction aurait cassé ce qu'elle
prétendait réparer.

**Ce qu'il faut en retenir.** J'ai comparé un nombre du code à un nombre de la spécification sans vérifier
ce que ce nombre signifie. Une valeur ne se relit pas contre une spécification sans sa signature. La
règle que j'impose aux autres — mesurer plutôt que déduire — vaut aussi pour une relecture : si je ne
peux pas mesurer, je dois écrire « à vérifier » et non « écart ».

Le reste de la note tient : les autres valeurs relues sont conformes, et le soupçon sur la durée du
ralenti était bien infondé pour la raison indiquée. La section d'origine est conservée sans retouche.
