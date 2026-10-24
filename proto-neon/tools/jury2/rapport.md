# codex-j1 — banc d’autotest et dossier du jury

> 24/10/2026 · 03 h 15 (Paris) : rapport d'origine de codex-j1, conservé. Le banc a été relu et corrigé par une session indépendante ; ce qui change (séries de graines, échantillon écrit avant, images denses, paquet neutre, défauts plantés, étalonnage des jurés, témoin positif) est dans `README.md`. La commande ci-dessous reste valable : sans autre option, `banc.mjs` prend la série « étalonnage » (graine 101, profils paysage et portrait).

24/10/2026 · 02 h 37 (Paris). Préparation livrée ; validation navigateur à faire par la cheffe.

Commande complète **hors bac**, depuis cette copie :

```sh
cd '/Users/manonwojciechowski/Projets/wt-snake/codex-j1/proto-neon'
node tools/jury2/verifier.mjs --navigateur --valider-instrument --carte '/Users/manonwojciechowski/Projets/wt-snake/codex-r1/proto-neon/tools/codex-r1/structure.json'
```

Après intégration dans une autre copie, adapter le `cd` et le chemin de la carte.
Le chemin par défaut devient `musique/morceaux/structure.json` si r1 y est intégré.
Le banc refuse une carte absente avant tout lancement de Chrome.

Pour contrôler uniquement la préparation locale :

```sh
node tools/jury2/verifier.mjs --statique
```

## Livraison et périmètre

- `banc.mjs` : serveur HTTP sur port libre avec Range 206, actifs servis figés et empreintés,
  Chrome headless `channel:'chrome'`, `--mute-audio`, verrou atomique
  `/tmp/snake-chromium-chef.lock`. Une instance, contextes et profils en série.
  Les requêtes extérieures sont bloquées. Un verrou existant est respecté, jamais supprimé.
- Parties naturelles des quatre pilotes sur iPhone 13 paysage 844 × 390 tactile,
  portrait 390 × 844 et bureau 1440 × 900 ; dix graines par défaut. La première graine
  de chaque couple profil/pilote est filmée ; toutes ont état, pixels et journal.
  Aucun `__DT`, aucun pas de simulation : le rendu et le contexte audio avancent réellement.
- Deux visites d’aventure, elle puis lui, par profil, avec profil conservé entre les deux :
  vrai choix par toucher/clic, pilote dieu et invulnérabilité principale annoncés ; conducteur
  des époques lisant leurs états publics et écrivant seulement les entrées. Aucun saut de
  film, d’époque, de victoire ou de boss. Une visite inachevée reste un échec de couverture.
  Ces visites sont exclues des statistiques de difficulté.
- Screencast CDP brut, clips muets de 30 s lorsque les moments sont observés ; contrôle
  des durées encodées entre 20 et 40 s, conservation des vrais timestamps et des trous.
  Images exactes du tampon, planches et échantillons toutes les 0,5 s dans ±2 s autour
  de chaque drop. Acquisition à 4 Hz pour accepter toute phase du drop sans élargir
  le seuil de sélection de 150 ms. Les images manquantes restent signalées.
- Sources musicales exportées à part, prise du mix réellement calculé en WebM,
  carte r1 copiée et alignée par curseur de fichier observé ; grille des temps dans
  chaque sidecar vidéo. Le fichier audio capté est décodé en PCM pour mesurer la
  sensibilité à la coupure musicale. Le RMS public avant la porte de mute ne sert
  pas à prouver cette coupure. La fenêtre `audio-probe` coupe les effets dans les
  deux builds pour isoler la musique en sortie.
- R-13 sur transitions du tampon, R-14 sur secousses rendues et admissions de bannières,
  apparitions et projectiles effectivement présents, mesures p50/p95, morts et causes,
  durée réelle et durée de jeu, états et courbes de N.adapte lorsqu’une interface publique
  existe. Fenêtres de performance sans screencast ni analyse de pixels ; stress R-13 distinct.
- `grille.md` : ancres concrètes 5, 7, 9 et 10 pour les cinq regards.
  `consigne-jure.md` : lecture des preuves, limites et JSON de verdict, sans note du constructeur.
- `temoin.mjs` : copie temporaire des sources, seul ajout de dégradation : canal musical
  public coupé et portails retardés de façon pseudo-aléatoire indépendante. Les effets
  et le générateur du vrai jeu sont conservés. Les deux sorties physiques exigées pour
  distinguer le témoin sont le niveau du fichier audio capté et la synchronisation
  des apparitions réelles. Les seuils sont figés avant essai ; un résultat insuffisant bloque le jury.

Seul `tools/jury2/` contient des changements. La reconstruction autorisée de
`proto-neon/index.html` a rendu exactement le fichier reçu. Aucun `src/` ni N.R
modifié ; aucun nouveau chiffre de gameplay ; paramètres d’acquisition confinés
à `protocole.mjs`, jamais chargés dans le jeu livré. Aucun commit, aucun réseau sortant.
Les raccords nécessaires sont écrits dans [demandes.md](demandes.md).

## Preuves locales et avant/après

Source des résultats : [verification-locale.json](verification-locale.json),
[build.log](build.log), [temoin/preuve.json](temoin/preuve.json).

| Contrôle | Avant | Après / résultat |
|---|---|---|
| Instrument existant `tools/jury/partie.mjs` | rAF piloté, captures espacées ; pas de dossier audio/vidéo r1 | nouveau banc sur rAF/audio réels, clips CDP et sidecars prêts ; exécution réelle à vérifier |
| Contrôles locaux du nouveau banc | pas de reçu j1 | 24 contrôles réussis, 0 échec |
| Build du jeu | SHA `d6bc16210e5729e9b1ae94c3a3db133e074a8ccdda9ddfac42472f7516ec725c` | sortie 0, SHA strictement identique |
| Premier témoin : liens d’actifs temporaires | 34 références à un répertoire supprimé, défaut constaté par inspection | 0 référence après correction ; seul le module de dégradation diffère de la pointe |
| Reproductibilité du témoin | chemins dépendant du nom temporaire | deux constructions indépendantes identiques, SHA `0b39414c37232ba4220415b695ea901d93686d11ab3153b16d7ccea16b8abee1` |
| Détecteur de sensibilité sur fixtures connues | deux dossiers synthétiques identiques | rejet, verdict `valide:false` |
| Détecteur sur témoin synthétique connu | niveau et phase distincts | acceptation mathématique des deux axes ; ne prouve pas la paire de jeux réelle |
| R-13, R-14, synchronisation, p50/p95, difficulté réelle | à vérifier | à vérifier, aucune valeur inventée |
| Vidéos, captures et aventures du vrai navigateur | non exécutées ici | à vérifier hors bac |
| Notes indépendantes du jury | aucune | aucune, porte 7 non validée |

Le défaut des actifs du premier témoin est conservé dans
[correction-actifs-temoin.json](correction-actifs-temoin.json). Il a été corrigé
par canonicalisation du chemin temporaire macOS, puis couvert par le contrôle
comparant le témoin à la pointe après retrait du seul module de dégradation.

Les contrôles locaux couvrent syntaxe/import, sérialisation des fonctions navigateur,
flashs lumineux et rouges simultanés, seconde réelle, seuils inclusifs, audio inconnu,
mesures r1 numérotées depuis 1, compensation de latence et boucles, sélection des
planches, séparation défaites/victoires/censures, témoins synthétiques positif et
négatif, observation passive de pixels et objets dans une fixture, PNG exacts,
fichiers audio décodés, Range et gel des actifs, build et reproductibilité du témoin.
Les fixtures sont explicitement synthétiques et ne sont jamais placées dans `dossiers/`.

La VM locale n’exécute aucune source du jeu : elle vérifie le capteur avec des objets
connus. Aucune conclusion de partie simulée n’en est tirée. Pas de réexécution des
80 parties historiques ni de revendication d’identité de leurs résultats.

## Reprise, critères d’arrêt et travail restant

Le code et les seuils sont figés pour la première prise. Le nombre de graines,
les bornes de temps réel et les paramètres de capture sont consignés dans le protocole.
Le programme refuse d’écraser un dossier existant. Après chaque partie, il sauve
le manifeste ; pendant une partie, blocs gzip, pixels et frames CDP sont conservés.
Une absence d’images, une erreur, une borne atteinte ou une aventure inachevée restent
publiées. Une interruption conserve les traces partielles et libère son propre verrou.

La commande complète produit d’abord la pointe puis le témoin dans le même Chrome.
Renvoyer les deux `manifeste.json`, `validation-instrument.json` et les dossiers de séquences.
Si la sensibilité échoue, conserver les valeurs et mettre l’instrument en cause :
aucun abaissement de seuil, aucune note de jury. Le statut `pretPourJury` exige
la complétude du dossier et la validation physique de l’instrument.

Restent : exécution réelle de la paire, contrôle des médias et de la couverture,
revue des mesures, puis jury indépendant sur une build unique. La qualité sonore
à l’écoute, la hauteur à ±10 cents et l’iPhone/Safari physique ne sont pas démontrés
par ce banc. Les blocs NV dont le tempo change exigent un curseur public supplémentaire
avant de leur attribuer un temps de fichier ; cette conversion est refusée en son absence.
Les limites et les portes échouées restent lisibles par les jurés.

**Chantier j1 bloqué au palier de validation navigateur dans ce bac** :
la mission interdit le serveur local et Chromium ici. Aucun essai de lancement
ni contournement. Dépendance indispensable : exécution de la commande par la cheffe
hors bac. Préparation locale livrée ; palier navigateur et porte 7 non validés.
