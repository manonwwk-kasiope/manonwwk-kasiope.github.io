# Avis du pilote de la chaîne — la batterie lancée à 06:38 ne fait pas foi

Le pilote a lancé une expérience nulle sur le banc de 06:42 à 06:50, pendant que la batterie de
non-régression lancée à 06:38 tournait. Les deux se sont disputé la machine pendant huit des onze
minutes du banc. L'échec publié par cette exécution — `iphone/plat-treillis`, p95 6,9 ms contre 5,9,
soit 1,169 — est un artefact de cette contention, pas un défaut du build.

La signature est nette. Sur machine calme à 06:20, les huit rapports de médiane allaient de 1,007 à
1,068. Sur la machine occupée à 06:38, les mêmes huit vont de 1,022 à 1,085 : tout monte, y compris les
régimes qui n'ont rien à voir avec le régime en échec.

**Conséquences.** Seule une exécution sur machine calme fait foi. Cette exécution ne doit peser ni dans
le verdict de l'objectif, ni dans le décompte des tentatives. C'est une faute de conduite du pilote.

**Ce qui reste vrai et n'est pas un artefact.** Sur machine calme, les huit rapports de médiane sont tous
au-dessus de un, alors qu'à build identique des deux côtés ils se tiennent entre 0,98 et 1,02. G6 coûte
donc réellement de trois à sept pour cent de temps d'image. C'est sous la tolérance de dix pour cent, et
cela s'explique par les chevrons de bord, les portails, les marqueurs permanents et le test d'absorption.
Le travail d'attribution de ce coût garde tout son intérêt ; c'est l'échec sur le p95 qui est faux.

Détail complet, avec les mesures d'exposition de l'artilleur et l'erreur d'arithmétique du test 5 :
`snake2030/tools/test/G6/MESURE-ARTILLEUR.md`.
