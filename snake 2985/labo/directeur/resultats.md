# Studio des séquences

17/11/2026 · 23 h 58 (Paris)

Ouvrir `index.html` directement. Les deux grilles s’affichent simultanément. Le cercle du serpent se contracte à chaque battement et devient doré quand un saut est en attente. Dans « Prise », chaque stratégie rejoue exactement les entrées enregistrées. « Je joue » rend la main.

| Scène | Décision offensive | Contre-jeu | Résultat sur 3 passages |
|---|---|---|---|
| Gare orbitale | Monter au signal rouge, revenir derrière le dernier wagon et ramasser le losange. | Quitter latéralement la voie. | Sillage 9 points, aucun impact. Contournement 0 point, aucun impact. Immobilité 1 impact. |
| Mue croisée | Laisser une enveloppe sur le socle vert, traverser le plan rose pour ouvrir la serrure au prochain battement avant expiration du double. | Un double hors du socle laisse la serrure armée. On peut éviter la serrure ou revenir poser une nouvelle mue. | Synchronisation 15 points, aucun impact. Appât isolé 0 point, 3 impacts. |
| Colosse | Croiser le front circulaire en changeant de plan, puis diriger le serpent le long du rail oblique jusqu’au cristal. | Passer tôt sur le plan rose pour éviter le front. Sortir du couloir entraîne un décrochage. | Surf 18 points, aucun impact. Survol 0 point, aucun impact. Immobilité 3 impacts. |

Source des mesures : `node replays.cjs`, à exécuter depuis ce dossier. Neuf prises de 720 pas fixes chacune, soit 0,20 minute simulée à 60 pas par seconde. Le résultat des entrées compactées est comparé à l’état complet du premier passage. Chaque prise exporte les signaux, bascules, captures, gains et impacts avec leur numéro de pas. Les prises offensives enregistrent respectivement 91, 418 et 528 pas avec direction et six pressions chacune. Ces nombres décrivent des pilotes scriptés. L’aisance d’un joueur et la compréhension spontanée des signaux restent à mesurer.

**Choix de mise en scène.** Conserver la gare comme premier contact et la mue comme épreuve à deux objectifs. Réserver le colosse aux rencontres exceptionnelles. Dans une première variante de surf, le pilote gagnait 18 points tout en subissant trois impacts. La prise révisée anticipe la capture d’un battement et termine à 18 points sans impact. Dans la gare, un serpent immobile pouvait encaisser un convoi et toucher trois points derrière lui. La version retenue bloque le ramassage pendant la récupération, vérifié par la prise immobile.

**Vérification de l’interface.** À 390 × 844, les trois stratégies offensives ont abouti aux scores du tableau dans un navigateur sans interface et muet, sans exception JavaScript ni débordement horizontal. Le bouton tactile de bascule change le plan au battement suivant. Les traînées, le déplacement différentiel des plans et les signaux sont dessinés dans Canvas. Aucun son ni accès réseau. Ces scènes autonomes ne modifient aucune partie du jeu principal.
