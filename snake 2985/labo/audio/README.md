# Laboratoire audio · SNAKE 2985

18/11/2026 · 00 h 00 (Paris), mis à jour à 00 h 11.

**[Ouvrir le banc actuel des cinq époques, ses musiques, son horloge et son extrait comparatif](cinq-epoques.md).** Les extraits à quatre époques ci-dessous documentent la première passe de recherche.

**Retenir le motif B pour traverser les plans.** Le joueur entend trois notes descendantes vers le fond et deux notes montantes vers l’avant. Dans les essais avec la musique du jeu, les deux directions restent mesurables après sommation mono, même quand on retranche davantage de graves et d’aigus. Le panoramique peut accompagner le déplacement visuel sans porter l’information de direction.

## Écoute manuelle

Ouvrir le fichier voulu. Les quatre extraits de traversée présentent successivement fond, avant, fond, avant, sur le même passage chanté de *Plus vite*. Aucun lecteur automatique. Tous les WAV ont le même gain d’export, 0,4. Les six vérifications FFmpeg EBU R128 donnent des niveaux intégrés de −32,1 à −26,1 LUFS et des crêtes vraies entre −16,0 et −11,0 dBTP.

| Essai | Stéréo | Un haut-parleur simulé |
|---|---|---|
| A · filtre et panoramique | [Écouter A](plans-A-stereo.wav) | [Écouter A mono](plans-A-mono_mobile.wav) |
| B · hauteurs et rythme | [Écouter B](plans-B-stereo.wav) | [Écouter B mono](plans-B-mono_mobile.wav) |

[Écouter les neuf forges sur Titan](forge-neuf-recettes.wav). La colonne indique le geste d’impact, la ligne indique le tir. Les temps désignent les attaques du tir dans l’extrait, en secondes.

| Noyau au tir | Écho · contact sec, deuxième salve | Chaîne · trois étincelles en escalier | Détonation · chute grave et front aigu |
|---|---|---|---|
| Satellites · deux hauteurs voisines tournent autour de la tête | Lunes fantômes · 0,15 | Couronne Tesla · 1,43 | Lunes explosives · 2,71 |
| Prisme · un trait s’ouvre en trois glissandos divergents | Kaléidoscope · 3,99 | Vitrail électrique · 5,27 | Éclats de supernova · 6,55 |
| Singularité · un trait descend de 870 à 205 Hz, doublé dans le médium | Étoiles jumelles · 7,83 | Nœud gravitationnel · 9,11 | Soleil noir · 10,39 |

[Écouter le vol et la gorge dans les quatre époques](vol-gorge-quatre-epoques.wav). Les époques entrent à 0, 3, 6 et 9 secondes. Chaque bloc présente un passage latéral, la poussée à +0,42 s et une gorge qui se resserre puis s’ouvre à partir de +1 s. En 1976 le relais ponctue la scène à 420 Hz. En 1985 le reflet monte à 615 Hz sur *Neon Velocity*. En 2185 la balise devient plus grave (380 Hz) et plus serrée sur *Tension*. En 2985 l’appel à 935 Hz traverse la piste chantée. Cette suite illustre des gestes courts. La musique conserve le premier plan entre les passages.

## Branchement proposé

- **Tirs.** À la consommation de chaque événement `forgeShot`, prendre `core`, `mod`, `plane`, `x` et `y` dans sa charge déjà émise par `s.forge`. Le noyau choisit le geste. La position horizontale situe le tir dans l’image. Réserver un bus aux gestes de jeu et respecter les réglages FX, silence, pause et fin de partie existants. Les tirs de la maquette durent au plus 0,42 s.
- **Écho.** Le moteur émet déjà le second `forgeShot` après 0,38 s. Les deux événements sont sonorisés une fois chacun. Sur impact Écho, un trait sec laisse de la place au second départ.
- **Impacts.** `forgeHit` contient les coordonnées de la cible et le modificateur effectif. Sonoriser le premier impact immédiatement. Coalescer les suivants pour le même plan et la même recette pendant 80 ms à partir du dernier impact joué. Cela évite que les dégâts de zone multiplient le bruit. L’arc de retour à 220 ms peut produire un nouvel impact. Cette règle s’applique uniquement au bus d’impacts de forge. Les indices de plan et les alertes conservent leur priorité. Les cadences 2,8 / 1,8 / 3,6 s sont déjà déterminées par le moteur pour Satellites / Prisme / Singularité.
- **Profondeur.** Déclencher uniquement sur `planeShift` confirmé. Convention de la maquette : `to === 1` désigne le fond. Fond à 0/112/226 ms sur 1 460/1 050/740 Hz. Avant à 0/77 ms sur 740/1 460 Hz. Une note dure 103 ms. Le panning léger alterne, et les deux canaux restent en phase. Pour A, la coupure balaie 3 200→510 Hz en 360 ms à l’éloignement et inversement au retour.
- **Vol.** À `flightStart`, rendre la poussée de 240 ms, 280→925 Hz, doublée par un second trait plus doux après 40 ms. Si le turbo en vol utilise la même poussée, la déclencher sur le front montant ; ne pas la relancer à chaque image. Sur `flightEnd`, `flightCrash` ou pause, fermer l’ambiance de vol avec un court fondu.
- **Gorge.** Si le tunnel fournit une largeur locale, normaliser le rétrécissement par rapport à la largeur ordinaire. Cette pression continue pilote le niveau et une pulsation de 1,4 à 6 Hz. Une seule voix. Le banc illustre le passage avec une courbe synthétique. Il reste à raccorder le paramètre à la géométrie du tunnel effectivement retenue.
- **Environnement.** Placer les reflets sur le passage de repères du décor devant le joueur. Inverser la trajectoire de panoramique avec le sens du passage. Le banc simule un défilement constant, avec intervalles de 1,45 / 1,12 / 0,89 / 1,28 s selon l’époque. Garder le bus de profondeur indépendant pour préserver les deux directions de B.

## Mesures

Les empreintes des cinq MP3, positions de départ, vitesses de lecture, matrices de confusion et crêtes sont consignées dans [les mesures](mesures.json). Les cinq sources sont les prises locales *Neon Velocity*, *Tension*, *Titan*, *Machine* et *Plus vite*. Le mix utilise 0,79 × 0,82 pour le lit et 0,72 pour les effets. Le segment illustrant le terminal utilise 0,39 × 0,82 et l’ouverture de *Neon Velocity*. Les traitements dynamiques, le motif de puce et les autres sons du jeu complet ne sont pas simulés.

Le banc place chaque sens de traversée à 18 instants sur chaque MP3. Les deux variantes subissent les mêmes fonds musicaux. Les profils comprennent la stéréo, la moyenne gauche/droite filtrée à 320–5 300 Hz et une seconde moyenne filtrée à 580–3 500 Hz. Ces deux transferts lisses simulent la perte d’ouverture et de bande passante d’un petit transducteur. Aucune réponse mesurée sur un modèle d’iPhone, interaction acoustique avec le boîtier, compression matérielle ni écoute humaine n’entre dans ce calcul.

| Profil | A · directions décodées | B · directions décodées | A / B · effet sur musique au 10e percentile, 650–3 000 Hz |
|---|---:|---:|---:|
| Stéréo | 180/180 | 180/180 | +6,35 / +6,54 dB |
| Mono mobile | 180/180 | 180/180 | +6,98 / +7,10 dB |
| Mono étroit | 177/180 | 180/180 | +7,00 / +7,29 dB |

Le décodeur A mesure l’évolution du rapport aigu/grave. B mesure l’énergie aux fréquences et instants spécifiés. Chaque décodeur reçoit seulement le mix, avec l’heure du franchissement fournie. La proximité des rapports effet/musique limite l’avantage d’une variante simplement plus forte. Cette mesure de recouvrement spectral porte sur les puissances relatives. Les scores n’estiment pas le nombre de joueurs qui reconnaîtront le geste.

**Forge.** Sur le profil mono mobile, la corrélation aux formes d’onde isolées donne 90/90 pour chacun des trois départs et 90/90 pour chacun des trois impacts. Le dixième percentile effet/musique entre 350 et 3 200 Hz atteint +3,13 dB pour les départs et −0,48 dB pour les impacts. Une partie des impacts se trouve donc en dessous du lit dans cette bande. L’horodatage et les gabarits exacts sont connus du détecteur.

**Densité.** Sur une rafale synthétique de 6,3 s, le regroupement ramène 152 impacts à 19 gestes audibles, auxquels s’ajoutent huit tirs, une traversée et une poussée. Au seuil RMS de −45 dBFS, les effets occupent 71,1 % des tranches de 20 ms. Crête brute sur *Titan* −1,47 dBFS. Les essais de traversée atteignent −0,27 dBFS pour A et −3,85 dBFS pour B avant gain d’export. Aucun échantillon brut ne dépasse la pleine échelle dans ces essais. Le cas de rafale représente le pire cas construit ici, et le mélange complet du jeu reste à contrôler lors de l’intégration.

## Reproduction sans réseau ni lecture

Exécuter `python3 rendre.py` dans ce dossier avec NumPy déjà disponible et FFmpeg local dans le PATH. Environnement utilisé : Python 3.15, NumPy 2.5.4 (cache local), FFmpeg. Le script écrit directement du PCM stéréo ou mono 24 kHz, 16 bits et ne crée aucun lecteur. Il reconstruit les six WAV et les mesures. La vérification complémentaire des crêtes vraies se reproduit par `ffmpeg -i plans-B-stereo.wav -af ebur128=peak=true -f null -`.

## Priorité des menaces en rafale

Mis à jour le 18/11/2026 à 00 h 04 (Paris).

Sur les vingt rafales du second banc, le module restitue **160/160 signaux de boss et 80/80 changements de plan**. À huit voix distribuées par ordre d’arrivée, seuls 108 signaux de boss et 49 changements de plan démarrent. Les mesures distinguent l’admission de la voix et sa place dans le mix. [Résultats par graine](mesures-priorites.json)

| Mode | Boss joués | Plans joués | Boss / reste du mix, médiane | Plan / reste du mix, médiane | Voix simultanées max. |
|---|---:|---:|---:|---:|---:|
| Brut sans plafond | 160/160 | 80/80 | −8,39 dB | −10,73 dB | 21 |
| Ordre d’arrivée, huit voix | 108/160 | 49/80 | −7,46 dB | −9,95 dB | 8 |
| Priorité, huit voix | 160/160 | 80/80 | −3,22 dB | −6,75 dB | 6 |

La dernière ligne gagne **5,17 dB pour le boss et 3,98 dB pour le plan** sur le mix brut. À l’échelle brute, le pire pic vaut +0,61 dBFS, avec deux échantillons qui dépassent la pleine échelle. Une marge commune de 1 dB ramène ce pic à −0,39 dBFS et laisse zéro échantillon hors plage sur cette série, contre 530 pour le brut et 183 pour l’ordre d’arrivée. Le limiteur du jeu reste à mesurer dans le graphe complet.

**Choix sonore.** Dans *Returnal*, Johannes Koski explique que les signaux du jeu guident l’attention pendant les combats intenses, par exemple en rendant la disponibilité du tir secondaire identifiable par un son dédié. Nous appliquons cette idée aux trajectoires du boss et au passage de plan. Le nombre de voix, les temporisations et les niveaux ci-dessous sont nos paramètres expérimentaux. [Témoignage du directeur UI/UX de Housemarque](https://blog.playstation.com/2021/05/11/unpacking-returnals-ux-design-gameplay-first-ui-retro-futuristic-tech-and-accessibility/)

**Allocation.** Une source tamponnée porte tout un geste, y compris ses partiels et ses notes différées. Le module réserve deux places aux annonces de boss et deux aux traversées. Avec le budget de huit, quatre restent disponibles pour le vol et la forge. Les impacts d’une même recette sur un même plan sont regroupés sur 80 ms. À l’apparition d’un signal prioritaire, le bus d’action converge vers 32 % de son gain avec une constante de 7 ms. Sa remontée commence 18 ms après le dernier signal, avec une constante de 40 ms. Les MP3 poursuivent leur lecture au gain prévu. Le banc sature aussi délibérément les huit places au même instant et vérifie la reprise après arrêt. [Module](priorites.js) · [Automatisation de gain Web Audio, W3C](https://www.w3.org/TR/webaudio-1.1/#dom-audioparam-settargetattime)

**Intégration future.** Charger le module avant le branchement audio. Instancier `SnakeAudioPriority.create(audioFX, sortieFX, {limit: 8})` une fois sur le contexte existant. Après les vérifications de mute, de pause et de volume, tester `handles(info)` et router une seule fois vers `play(info)`. Une admission refusée ou fusionnée reste un événement traité. Conserver les changements d’état musicaux de `event(info)` et le circuit de fin. À la pause et à la coupure du son, appeler `stop()`. À la destruction du contexte, appeler `dispose()`. Pour maintenir le plafond existant de 24, affecter au plus 16 autres voix simultanées aux effets historiques, ou réunir les deux allocateurs. Le prototype ne compte que ses propres sources.

**Validation.** Le test Node charge les modules réels de forge, de vol et le moteur de laboratoire. Il vérifie les charges des neuf recettes, le passage dans une porte, le franchissement de plan, l’entrée du boss, sa préparation et sa salve. Les rafales de comparaison sont ensuite synthétisées avec vingt graines distinctes de six secondes. Chaque signal prioritaire est comparé à tout le reste du mix mono sur la durée de sa forme d’onde. Les cinq MP3 réels sont répartis sur les graines avec un passage commun à 36 s dans chaque morceau. Le faux contexte rend à 12 kHz les mêmes buffers et les courbes de gain du module, en mémoire. La validité perceptive, le débit sur téléphone et le compresseur réel restent à vérifier ultérieurement. Reproduire sans installation, interface ni périphérique par `node test-priorites.cjs`. [Banc autonome](test-priorites.cjs)
