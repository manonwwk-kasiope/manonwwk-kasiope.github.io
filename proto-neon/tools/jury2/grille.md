# Grille du jury — SNAKE 2975, sur 10

24/10/2026 · 02 h 15 (Paris), réécrite à 03 h 02 (relecture indépendante : ancres comptées, avocat du diable, deux passes).

Chaque juré reçoit le même paquet figé, **un seul regard**, et note ce qu'il peut observer en citant fichier et temps.
Une absence de preuve ne vaut pas une réussite. Les seuils techniques viennent de `N.R.criteres` (annexe) et de
`refonte/chantiers/INCROYABLE.md`, jamais d'une estimation visuelle du juré.

## Vocabulaire (compté par le script de contrôle, pas à l'estime)

- **Défaut grave** : mort injuste reproductible (aucun télégraphe lisible dans les 2 s qui précèdent), menace invisible, commande
  inaccessible, flashs au-delà du seuil mesuré, blocage ou erreur de jeu, mesure fabriquée ou contredite par une autre pièce.
- **Défaut mineur** : un constat isolé, avec preuve, d'effet limité. Il est **récurrent** quand ses preuves citent au moins deux
  séquences différentes (le script lit les chemins `S01/…`, `S02/…` de tes preuves).
- **Limite de preuve** : ce que le paquet ne permet pas de juger (audio, Safari, fluidité réelle, geste humain). Elle ne baisse pas la note ;
  elle plafonne ce que tu peux affirmer.
- **Moment fort prouvé** : une force rangée dans `forces` dont au moins une preuve est résolue par le script (fichier existant, temps ou champ réel).
- **Anomalie de dossier** : deux pièces du paquet qui se contredisent (images identiques à des temps différents, temps qui reculent ou sortent de la
  fenêtre, planche annonçant plus de cases qu'elle n'en contient, mesure annoncée conforme alors que sa valeur dépasse son seuil). Rangée dans
  `anomaliesDossier`, **jamais** dans les défauts du jeu et sans effet sur ta note : tu écartes simplement la pièce altérée de ton évaluation.

## Échelle commune (les ancres de chaque regard précisent ce qui prouve chaque palier)

| Note | Ce qui doit être vrai |
|---|---|
| 10 | Aucun défaut grave. Aucun défaut mineur récurrent. Au moins 5 moments forts prouvés, dont une surprise positive prouvée. Aucune limite de preuve ne touche ton regard (très rarement atteignable sur dossier seul : la propriétaire sur son iPhone reste le juge final). |
| 9 | Aucun défaut grave. Au plus 1 défaut mineur récurrent. Au moins 3 moments forts prouvés. |
| 8 | Aucun défaut grave, mais 2 ou 3 défauts mineurs récurrents, ou moins de 3 moments forts prouvés. |
| 7 | Un défaut grave évitable, ou au moins 4 défauts mineurs récurrents. |
| 5 | Au moins 2 défauts graves, ou aucun moment fort prouvé : le regard entier déçoit. |
| 3 | Un défaut grave visible dans chaque séquence. |

Les notes intermédiaires sont permises. **Plafonds appliqués par le script, publiés avec ta note brute** : un défaut grave → ≤ 8,5 ; deux
défauts graves ou plus → ≤ 7 ; moins de 3 moments forts prouvés → ≤ 8,5 ; deux défauts mineurs récurrents ou plus → ≤ 8,5, quatre ou plus → ≤ 7 ;
moins de 5 éléments listés (graves, mineurs, limites) ou moins de 3 défauts avec preuve résolue → ≤ 8,5. Une note élevée ne compense pas un défaut grave.

## Ancres par regard

| Regard | Ce qui prouve 5 | Ce qui prouve 7 | Ce qui prouve 9 | Ce qui prouve 10 |
|---|---|---|---|---|
| Joueuse iPhone | Une séquence portrait ou paysage où l'on ne comprend ni la menace, ni la cause d'une mort, ni quoi toucher. | Paysage et portrait lisibles, mais une annonce ou un effet couvre l'action dans au moins une planche, ou une mort reste inexpliquée (cause invisible dans les 4 s précédentes). | Dans les deux orientations, chaque mort montrée s'explique par ses images (menace visible avant l'impact) ; actions, choix et morts se comprennent dans toutes les séquences ; aucune planche où l'action est masquée. | Idem dans les moments les plus chargés (chaos, VOL, WARP), avec des retours précis et sans surcharge. L'ergonomie au pouce reste une réserve explicite tant que la propriétaire ne l'a pas testée sur Safari. |
| Game design | Les séquences se ressemblent (mêmes types de moments d'une époque à l'autre) ou les morts n'ont pas de cause lisible. | Les mécaniques se distinguent, la progression se lit, mais au moins un creux (séquence ≥ 4 s sans menace ni télégraphe) ou une répétition nette subsiste. | De 1976 à l'espace, chaque mécanique apporte une décision visible dans les planches ; les parties de quatre pilotes montrent une progression et des causes de mort lisibles (annexe) ; la difficulté adaptative, si elle existe, est étayée par ses courbes. | Les séquences reliées forment un voyage cohérent avec une surprise prouvée dans chaque époque ; les chiffres d'annexe appuient les portes de difficulté, sans réglage caché ni saut. |
| Rythme et musique | Les événements du tapis rythmique ne se groupent sur aucun temps (moins de la moitié à ± 40 ms) et aucun drop n'est suivi d'un moment fort visible. | Des événements se calent sur les temps (plus de la moitié à ± 40 ms) mais des départs, apparitions, breaks ou raccords restent visiblement indépendants de la piste dans au moins une séquence. | Au moins 95 % des apparitions, tirs ennemis et départs de vague à ± 40 ms dans le tapis ; chaque drop suivi d'un moment fort en ≤ 1 temps (planches denses) ; chaque break d'une retenue visible ; sans écart inconnu masqué. | Cette précision tient dans toutes les séquences et tous les profils ; les variations de tempo créent surprise et respiration. Tu n'inventes jamais une écoute : tu ne juges ni timbre, ni agrément, ni hauteur sans reçu dédié. |
| Direction artistique | Palette cohérente mais plusieurs planches sans hiérarchie ni silhouettes distinctes (impossible de dire quel élément est la joueuse). | Époques et menaces se distinguent ; au moins une scène (chaos, raccord) réduit nettement la lecture. | Progression d'époque nette dans les planches, ennemis lisibles, compositions fortes, cyan attribué à la joueuse seule ; effets spectaculaires qui préservent la hiérarchie. | Toutes les planches gardent cette identité, y compris le final et les deux personnages ; chaque transition sert le voyage. L'invariant de palette et de cyan a sa preuve mesurée, pas seulement une impression. |
| Avocat du diable | Plusieurs séquences où l'on s'ennuie (temps morts, répétitions) ou où une mort paraît injuste. | Un temps mort ou une mort injuste isolés, ou au moins 4 défauts mineurs récurrents. | Aucun temps mort ni mort injuste prouvés dans l'échantillon uniforme, les pires cas ni les morts ; les pires cas (images lentes, morts à plus court préavis, seconde la plus chargée en flashs) restent acceptables. | Même chose avec une surprise positive prouvée dans les pires cas. Sa note ne dépasse jamais 10 − 1 point par défaut grave − 0,25 par défaut mineur (script). |

« Confort et performance » (flashs R-13, secousses R-14, zéro erreur, p95 ≤ 11 ms) n'est plus un juré : ce sont des **portes mesurées**, lues dans
l'annexe, avec la propriétaire sur son iPhone pour la cible ≤ 16,7 ms. Une valeur de l'annexe qui dépasse son seuil est un défaut grave pour le regard
qu'elle touche, même si le paquet de la passe 1 ne la montrait pas.

## Deux passes de notation

1. **Passe 1, images seules** : tu lis les fichiers de ton regard (`paquet.json › parRegard`), tu remets un JSON (`passe: 1`) avec ta note. L'annexe
   de chiffres (`annexe/annexe.json`) ne t'est pas remise et tu ne la cherches pas.
2. **Passe 2, avec l'annexe** : tu relis ta note à la lumière des chiffres, tu remets un second JSON (`passe: 2`, `note_passe1` recopiée). L'écart
   entre les deux notes mesure ton ancrage par les chiffres ; au-delà de 0,8 point en moyenne, ton verdict est écarté.
3. **Lecture de la porte 7** : passe 1 pour joueuse iPhone, rythme et musique, direction artistique, avocat du diable ; passe 2 pour game design.

## Ce que devient ta note

Elle est lue avec celles d'autres jurés indépendants que tu ne connais pas, après contrôle par script de tes preuves, de tes plafonds et de ton ancrage.
Ces seuils ne sont pas des notes de départ : n'essaie pas d'atteindre un nombre. Les auteurs du jeu et du banc ne sont pas jurés. La propriétaire sur son
iPhone reste le juge final.
