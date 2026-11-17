# Revanche dans le futur

**18/11/2026 · 00 h 09, Paris.** Prototype local. Un saut conserve le score brut de la partie perdue comme adversaire. Battre 900 demande au moins 901 points réels du moteur. Le joueur repart de zéro dans l'époque choisie. Les adversaires, armes et anneaux y sont ceux de sa nouvelle partie.

## Deux contrats essayés

| Variante | Condition de victoire | Saut 1976 → 2985 | Saut 2185 → 2985 |
| --- | --- | --- | --- |
| Contre-la-montre | Dépasser le score brut avant ou à l'instant de la mort passée | 47/48 | 41/48 |
| Poursuite | Dépasser le score brut à tout moment avant la fin de la nouvelle partie | 48/48 | 48/48 |

**Choix de prototype — la poursuite.** Elle laisse au joueur une remontée après le passage du fantôme. Le pari facultatif préserve une tension courte. Pendant les deux premières secondes (ou la première moitié du clip si elle est plus courte), le joueur peut engager 25 points de charge de nova. Dépasser le gain de score du segment fantôme avant sa fin rend 60 points de charge, dans la limite de 100. En cas d’échec, la mise est perdue. Le pari peut réussir tandis que le score brut à battre reste devant le joueur. La récompense ne crédite aucun point de classement. Une nova engagée ne peut plus être tirée tant que sa jauge n'est pas revenue à 100 %.

Affichage proposé au saut : « Ton score de 2185 · 900. Dépasse-le en 2985. » Puis, exemple avec une fin de parcours à +200 : « Pari de 12 s · bats ses 200 derniers points · mise 25 % nova ». Le fantôme dessine la tête et une courte traîne en pointillé sur son plan. Il ne bloque aucune case. Entre entrée et sortie du vol, le trait suit la trajectoire courbe.

## Essai reproductible

Depuis ce dossier, lancer `node mesure.cjs` puis `node --test contrats.test.cjs`. Le premier lance le moteur de laboratoire avec forge et vol libre et écrit `mesures.json` (détails graine par graine). Aucune carte, aucun score, aucun ennemi ni statut n'est injecté. Le pilote source traverse le premier portail, vise les anneaux, change de couche et, après 8 ou 18 secondes selon la graine, lâche les commandes jusqu'à la mort. Le pilote futur cherche les cellules et peut utiliser la nova, pour un maximum de 50 secondes. Dans chaque paire, les deux contrats partagent la même graine future et le même pilote. La mise facultative est exercée dans la poursuite.

Les scores sources allaient de 450 à 3 675 en 1976 et de 500 à 5 050 en 2185. Le pari de poursuite a été gagné 33/48 et 28/48 fois respectivement. Ces chiffres décrivent un pilote déterministe et ce scénario de mort. Ils ne mesurent pas la difficulté ressentie par une personne et ne prouvent pas que tout score historique est atteignable.

La comparaison suit la tête effectivement dessinée à 60 Hz, interpolation du pas comprise. Sur 69 067 images rejouées, dont 9 943 en vol et 56 727 sur la deuxième couche, aucun indicateur couche/vol erroné. Erreur de position au 95e centile 0,0077 case, maximum 0,066 case (arrondis supérieurs). La plus grosse sauvegarde locale du banc pèse 3 513 octets JSON. Ensemble, les sauvegardes représentent 7,46 % de la taille des mêmes segments en JSON brut à 60 Hz. Les 95 parties dont le clip commence après le départ vérifient la conservation de la fin du trajet.

## API et bornes

`chrono.js` expose `window.SnakeChrono` ou `module.exports`.

- `recorder()`, puis `capture(r, s)` après chaque tick et au départ. `finish(r, s)` rend un enregistrement sérialisable lors d'une mort. L'appelant peut conserver ce seul objet dans un emplacement local dédié. Le module passe uniquement par le stockage local explicitement fourni.
- `open(record)` valide et décode une archive versionnée. `ghost(clip, t)` rend la position, le plan et l'état de vol à un temps relatif en millisecondes. Il rend null hors du segment. `draw(ctx,clip,t,project,plane)` dessine le revenant sur la couche demandée. `project({x,y,plane})` fournit les pixels de la caméra de l'hôte.
- `challenge(clip,s,'poursuite'|'chrono')` initialise le contrat au départ du futur, `wager(c,s)` engage une seule mise, `update(c,s)` règle les états après chaque tick. L'interface peut lire `c.status`, `c.target`, `c.bet` et `c.segmentGain`. Le seul champ du moteur que le contrat modifie est la charge de nova. Le classement continue à lire `s.score`.
- Archive glissante des 12 dernières secondes de temps de jeu, au plus 750 poses de 7 octets, codées en base64 pour JSON. Horodatage relatif en millisecondes, coordonnées signées au 1/64 de case, bits de couche, de vol et de discontinuité. Le lecteur coupe le trait lors d'une transition et n'invente aucun déplacement entre deux plans. Seule la tête est conservée. La traîne restitue son parcours récent, sans simuler les articulations du corps.

## Cinq dates et compatibilité

L’identité d’une tentative est son année civile. La succession vérifiée est 1976 → 1985 → 1995 → 2185 → 2985. Le banc a joué les dix paires de dates ultérieures dans le moteur à cinq époques, huit morts sources et huit revanches par paire. Dans cet échantillon, le pilote a dépassé le score brut dans 80/80 revanches. Les huit essais de 1976 → 2985 et de 2185 → 2985 recoupent les cohortes principales. Toutes les lignes détaillées figurent dans `mesures.json`.

`futureYears(year)` renvoie les futures destinations par date. `archive(localStorage).save(record)` mémorise le dernier décès de son année sous `snake2985.chrono.v1.36x18.<année>`. `archive(localStorage).load(year)` cherche sa dernière trace puis, à défaut, lit l'ancien `snake2985.echo.v2.36x18.<année>`. Cette lecture conserve le score et extrait les douze dernières secondes de la polyligne historique. Les archives v2 ne contiennent ni couche, ni vol ni progression des points. Sur ces traces, le fantôme reste au sol et la mise optionnelle est désactivée. Les anciennes clés restent accessibles au lecteur historique. Un test vérifie l’intégrité de chaque ancienne clé et d'une entrée `snake2985.hall.tentative.*` après sauvegarde sur les cinq dates.
