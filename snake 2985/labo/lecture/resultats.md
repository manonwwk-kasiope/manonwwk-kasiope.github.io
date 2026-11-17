# Lecture à quatre teintes · 18/11/2026 · 00 h 12, Paris

Au prochain pas, si le serpent risque le mur, son corps, un drone, la coque ou une salve sur son plan, le HUD donne la première place à cette menace. Sinon viennent l’anneau en vol, la confirmation du changement de plan, le gardien, puis la cible du contrat ou la cellule. Deux symboles au plus restent visibles ; seul le premier porte une phrase. La menace précède toute temporisation. Le libellé du gardien devient « Vise le cœur » quand il ouvre sa défense sur le plan du serpent.

**Branchement.** Créer un état par partie avec `SnakeLecture.create()`. Après l’actualisation du moteur et du directeur, appeler `SnakeLecture.read(hud,s)`. Projeter `primary.at` et `secondary.at` dans leur plan ; transmettre la phrase à la zone de texte ou à la région d’annonce uniquement quand `changed` est vrai. Une chaîne vide efface la phrase lorsque le jeu s’arrête. `announcement === null` signifie que rien n’a changé. Un déplacement de la cible met à jour l’ancre indépendamment du texte. Le lecteur s’appuie sur l’état courant et tolère la vidange du journal des événements.

**Formes.** Dans la planche ci-dessous, de gauche à droite : triangle d’alerte, anneau vide, deux chevrons de plan, écu du gardien, losange de cible avec point central. Le fichier est un PNG indexé sur deux bits. Les symboles utilisent la même encre claire ; les quatre teintes de la palette figurent dans la barre inférieure. Le plus proche couple de masques diffère sur 11 des 49 pixels. Ces différences sont vérifiées automatiquement. La reconnaissance par des personnes malvoyantes sur téléphone reste à évaluer.

![Cinq symboles monochromes et palette à quatre teintes](formes-2bits.png)

**Parcours du moteur.** Le banc reprend le pilote et les assertions de victoire du laboratoire des gardiens. Chaque année est jouée depuis le premier cran jusqu’au deuxième gardien, avec les drones et les ramassages du moteur. La graine est identique sur les cinq parcours. Les décisions proviennent du pilote, indépendamment du HUD. Le vol est couvert par le scénario encombré et par la simulation de salve sur trajectoire continue du module, en complément des campagnes sur grille.

| Année | Lectures | Changements de texte | Plus longue occultation du gardien | Plus longue occultation de la cible |
|---|---:|---:|---:|---:|
| 1976 | 3 108 | 23 | 0,358 s | 4,451 s |
| 1985 | 2 431 | 22 | 0,361 s | 4,609 s |
| 1995 | 2 835 | 26 | 0,365 s | 5,576 s |
| 2185 | 2 594 | 22 | 0,365 s | 3,903 s |
| 2985 | 2 459 | 28 | 0,355 s | 4,949 s |

Sur 3,55 minutes simulées, 13 427 lectures produisent 121 changements de texte. Le pilote de campagne évite assez tôt pour qu’aucune menace de mort ne soit présentée. Dans la séquence encombrée imposant les cinq signaux simultanés, la salve reste visible dès le premier échantillon et pendant chacun des 12 échantillons où elle est présente. L’anneau attend 0,20 s, le changement de plan 0,45 s, le gardien 0,55 s et la cible 1,35 s. Les 141 lectures de cette séquence produisent cinq changements. Ces durées décrivent le masquage de la phrase lorsque le candidat existe ; un candidat masqué peut encore occuper la deuxième place en tant que symbole.

**Contre-exemples vérifiés.** À la dernière case, une direction déjà en file qui longe le bord doit retirer « Bord devant ». Sans ce virage, le moteur confirme la mort au prochain pas. La dernière vertèbre libère sa case quand le serpent avance ; elle demeure dangereuse si une cellule sur cette case le fait grandir. Une salve sur l’autre plan laisse l’anneau prioritaire. En vol, une case mortelle qui sera atteinte dans le prochain quart de seconde peut en revanche prendre la priorité avant le contact.

Exécuter `node mesure.cjs` depuis ce dossier pour reproduire les mesures. Les durées cumulées et les maxima par catégorie figurent dans `mesures.json`.
