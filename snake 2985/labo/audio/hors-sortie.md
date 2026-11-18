# Vérification native du lecteur dans WebKit hors sortie

18/11/2026 · 01 h 01 (Paris)

L’oracle FFmpeg des cinq fichiers est prêt. La commande `node hors-sortie.cjs --oracle` décode localement les fichiers en PCM stéréo flottant, à 24 kHz, écrit les empreintes SHA-256 et les RMS dans [l’oracle](hors-sortie.oracle.json). Le bloc de référence commence 65 ms avant la boucle du jeu. La mesure d’énergie porte sur les 160 ms qui suivent ce début de boucle.

| Année | RMS gauche | RMS droite |
|---|---:|---:|
| 1976 | 0,2560 | 0,2545 |
| 1985 | 0,1854 | 0,1852 |
| 1995 | 0,1308 | 0,1316 |
| 2185 | 0,1768 | 0,1810 |
| 2985 | 0,0893 | 0,0954 |

Le mode `--webkit` est un travail distinct du mode oracle. Le lanceur ouvre uniquement `about:blank` dans WebKit sans interface. Avant navigation, le contexte est placé hors connexion, les requêtes sont interceptées et rejetées, les service workers sont désactivés, les créations d’AudioContext temps réel et les lectures ou constructions de médias HTML sont interdites. Les scripts et les octets des MP3 sont injectés depuis le disque. Le seul récepteur du graphe DSP est la destination mémoire d’un vrai OfflineAudioContext stéréo. [Lanceur Node](hors-sortie.cjs) · [Rendu WebKit](hors-sortie.js)

Pour chaque année, le banc crée trois graphes. Le témoin contient uniquement la boucle du MP3 ; le second comporte l’annonce du boss, la nova surchargée, trois impacts rapprochés et la salve du boss, puis un tir réel de forge. Le troisième reprend le second avec le même noyau de forge sans catalyseur. Le lecteur de campagne, son compresseur, ses gains, la banque de timbres et les AudioBufferSourceNode sont utilisés par leur chemin habituel. La fabrique injectée présente l’état « running » au contrôleur pendant la préparation hors ligne. Le MP3 est décodé par WebKit une fois, puis le même AudioBuffer décodé est réutilisé sur le témoin et le mix. Le banc compare les canaux du fichier décodé à ceux de FFmpeg, puis le début de la musique rendue à cette source en tenant compte de la vitesse du MP3. Le résidu mix moins témoin mesure les effets sans attribuer leur énergie au fond musical. La pause intervient à 1,28 s. Le banc mesure la crête maximale, le nombre d’échantillons hors plage et la durée de la queue au-dessus de −80 dBFS.

Les seuils sont fixés avant le rendu. La corrélation PCM FFmpeg/WebKit doit dépasser 0,75 par canal avec un décalage recherché dans ±55 ms, afin d’accepter les différences de traitement de l’amorçage MP3. La corrélation de la musique passée par le graphe doit dépasser 0,85 après alignement ; l’écart RMS toléré est 2 dB. Chaque fenêtre d’effet doit dépasser 0,0008 RMS sur chaque canal, le résidu avant le premier effet et l’énergie après interruption doivent rester sous 0,00001 RMS. La queue admise est de 40 ms et la crête reste sous la pleine échelle. Les erreurs sont écrites par année dans le résultat WebKit, y compris si le verdict global échoue.

Lorsque le port WebKit expose les suspensions du rendu hors ligne, les événements sont injectés pendant les suspensions natives successives. Sur un port qui ne les expose pas, les commandes sont horodatées à l’avance sur de vrais AudioParam et le stop est programmé sur chaque vraie source, avec déconnexion différée jusqu’au traitement du signal. Le rapport indique le chemin effectivement emprunté.

## Résultat WebKit natif

Mis à jour le 18/11/2026 à 02 h 25 (Paris).

**WebKit 26.0 a validé les cinq musiques et les quinze graphes de rendu en mémoire.** Les suspensions natives ont fonctionné pour tous les essais. Aucun périphérique audio n’a été ouvert par la recette, aucune requête réseau n’a été interceptée et aucune tentative de lecture HTML ou de création d’un contexte temps réel n’a été enregistrée. Le navigateur a été fermé à l’issue du banc.

| Année | Corrélation minimale du décodage avec FFmpeg (G/D) | Corrélation minimale du MP3 passé dans le graphe (G/D) | Plus petite énergie RMS des fenêtres d’effets | Crête maximale G/D |
|---|---:|---:|---:|---:|
| 1976 | 0,99961 | 0,99657 | 0,02013 | −6,88 dBFS |
| 1985 | 0,99811 | 0,99716 | 0,01319 | −9,75 dBFS |
| 1995 | 0,98175 | 0,99735 | 0,01432 | −10,81 dBFS |
| 2185 | 0,99368 | 0,99713 | 0,03338 | −10,39 dBFS |
| 2985 | 0,97814 | 0,99714 | 0,01850 | −9,45 dBFS |

Chaque mix a produit au niveau de la destination mémoire la boucle, l’annonce de boss, le motif de sur-nova, l’impact regroupé, la salve et le tir de forge. Les deux canaux renferment de l’énergie attribuable aux effets par soustraction du témoin musical. Le véritable lecteur a exécuté la pause à 1,28 s pendant la suspension du graphe ; la dernière valeur au-dessus de −80 dBFS se trouve 5,96 ms après le front de pause dans les cinq essais. À partir de 40 ms après la pause, tous les échantillons valent zéro sur les deux canaux. Ces mesures portent sur le rendu numérique WebKit de bureau. Elles ne mesurent ni le haut-parleur ni le routage physique d’un iPhone. [Résultats complets par canal et par fenêtre](hors-sortie.webkit.json)


Le dernier tir provient de `forge.update`, qui l’émet après équipement de la recette. La soustraction des deux mix mesure l’effet du seul catalyseur entre 12 et 130 ms après le départ. Le plus faible niveau RMS entre gauche et droite vaut 0,00767 (orbite/écho, 1976), 0,01005 (prisme/chaîne, 1985), 0,01643 (puits/explosion, 1995), 0,00984 (puits/chaîne, 2185) et 0,01631 (orbite/explosion, 2985). Le seuil prédéfini était de 0,0008. La vérification exhaustive des 45 recettes utilise le [banc PCM](FORGE45.md).
