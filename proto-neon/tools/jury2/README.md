# Banc jury2 : prise, paquet neutre, étalonnage, porte 7

24/10/2026 · 03 h 15 (Paris), version 2 (relecture indépendante du banc écrit par codex-j1 ; l'auteur du banc n'est pas le relecteur).

Rien ici n'est chargé par le jeu livré. Rien n'est lancé sans l'orchestratrice : `banc.mjs` ouvre un serveur local et Chrome (verrou
`/tmp/snake-chromium-chef.lock`, jamais supprimé), `verifier.mjs --statique`, `jure.mjs`, `etalonnage.mjs` ne lisent que des fichiers.

## Chaîne complète (qui fait quoi)

| Étape | Commande | Navigateur | Produit |
|---|---|---|---|
| 1. Prise | `banc.mjs` | oui (Chrome headless, muet) | `dossiers/<série>-<id>/` : dossier BRUT, qui identifie la build (jamais remis à un juré) |
| 2. Paquet | `jure.mjs paquet` | non | `paquets/J-xxxxxxxx/` (neutre) et `cles/J-xxxxxxxx.json` (clé aveugle, jamais dans le paquet) |
| 3. Jurés | l'orchestratrice | non | un JSON par juré et par passe (`consigne-jure.md`) |
| 4. Étalonnage / porte 7 | `etalonnage.mjs` | non | tests de chaque juré, écartés ou retenus ; lecture de la porte 7 (`--mode porte`) |

## Commandes

Étalonnage de l'instrument (version 0 = pointe : mêmes octets, `snake2975-v0` et `index.html` ont le même SHA-256), une seule fois, hors bac :

```sh
node /Users/manonwojciechowski/Projets/wt-snake/instrument/proto-neon/tools/jury2/banc.mjs --serie etalonnage --valider-instrument --carte /Users/manonwojciechowski/Projets/wt-snake/codex-r1/proto-neon/tools/codex-r1/structure.json
```

Paquets d'étalonnage (le dossier de la pointe sert aussi de version 0 : paquets distincts, codes et canaris tirés séparément) :

```sh
J=/Users/manonwojciechowski/Projets/wt-snake/instrument/proto-neon/tools/jury2
node $J/jure.mjs paquet --dossier $J/dossiers/etalonnage-<id> --role etalonnage-v0
node $J/jure.mjs paquet --dossier $J/dossiers/etalonnage-<id> --role etalonnage-pointe
node $J/jure.mjs paquet --dossier $J/dossiers/etalonnage-<id>-temoin --role etalonnage-temoin
node $J/jure.mjs doublon --code J-xxxxxxxx      # même paquet, noms mélangés : test de stabilité d'un juré
```

Verdict, une fois l'instrument validé (`validation-instrument.json` valide) : `banc.mjs --serie alpha`, puis `--serie beta`
(graines tirées au hasard au premier usage, scellées dans `sceaux/`, disjointes entre elles et des graines de réglage 1–100, jamais relues par
l'orchestratrice avant la fin), puis :

```sh
node $J/jure.mjs paquet --dossier $J/dossiers/alpha-<id> --role verdict-A --validation $J/dossiers/etalonnage-<id>/validation-instrument.json
node $J/jure.mjs paquet --dossier $J/dossiers/beta-<id>  --role verdict-B --validation $J/dossiers/etalonnage-<id>/validation-instrument.json
node $J/etalonnage.mjs --verdicts <dossier des JSON des jurés> --mode porte
```

Options de réduction de `banc.mjs` (`--graines N`, `--profils`, `--pilotes`, `--max`, `--sans-aventures`, `--sans-performance`) : un dossier ainsi
réduit est marqué `reduit` et ne donne jamais de paquet de verdict.

## Ce que chaque exigence devient

- **Échantillon écrit avant** (`protocole.mjs › echantillon`, `echantillon.mjs`) : 6 instants uniformes stratifiés (graine fixe), tous les drops
  (3), breaks (2), entrées de vague (5), entrée et sortie du WARP, CYCLOPE, VOL, fin, toutes les morts ; pires cas = 3 images les plus lentes,
  3 morts au plus court préavis, la seconde de flashs maximale. Le script l'applique à toutes les données ; personne ne choisit.
- **Images denses** (`sonde.mjs`, `protocole.mjs › denses`) : 15 Hz de 0,6 s avant à 1,2 s après chaque drop (curseur du fichier musical),
  et 1,5 s après chaque mort, vague, phase, vol, transition du WARP ; 4 Hz ailleurs. Les images absentes sont listées dans le JSON de la
  planche, jamais inventées.
- **Noms neutres** : code `J-` tiré au sort, séquences `S01…` dans un ordre tiré au sort ; ni empreinte de build, ni nom de dossier brut, ni
  mot « témoin / V0 / alpha / bêta » dans un fichier du paquet (testé).
- **Défaut planté** (`canaris.mjs`) : 4 dans un paquet d'étalonnage, 3 dans un paquet de verdict, tirés par `crypto` ; nature « intégrité »
  (deux pièces qui se contredisent, à ranger dans `anomaliesDossier`) dans les verdicts, « jeu » seulement à l'étalonnage. Comptés par script
  (`retrouverCanaris`) : une preuve rangée parmi les défauts ou les anomalies doit désigner le fichier et la fenêtre altérés.
- **Deux passes** : passe 1 = images, clips muets, tapis ; passe 2 = `annexe/annexe.json` (chiffres), remise après la note 1. L'écart des deux
  notes (≤ 0,8 en moyenne) est le test d'ancrage ; « game design » se lit en passe 2, les quatre autres regards en passe 1.
- **α et β différents** : deux séries de graines scellées et disjointes, un seul jury par série, jamais un troisième.
- **Étalonnage** : version 0, pointe et témoin dégradé jugés par chaque juré ; écart V0 − témoin ≥ 1,5 point et témoin < 7 ; platitude,
  stabilité (doublon renommé), ancrage, accord de rang (Spearman), défauts plantés ≥ 70 %, preuves introuvables ≤ 20 %.
- **Preuves vérifiables par script** (`etalonnage.mjs › verifierPreuve`) : fichier du paquet, unité de temps (`s_video`, `s_reel`, `s_jeu`,
  `s_fichier_audio`), champ JSON, numéro de case.
- **Grille et plafonds** : `grille.md` (ancres comptées) ; plafonds appliqués par `plafond()` et publiés avec la note brute.
- **Musique** : un juré n'entend rien. Il reçoit la grille des temps du moteur, les événements du jeu avec leur écart signé à ± 40 ms (vert /
  rouge), l'énergie visuelle et les repères de la carte r1 alignés sur le temps vidéo (`tapis-*.png` et `.json`). Limite assumée : c'est la
  grille du moteur, pas les attaques du signal rendu.
- **Témoin dégradé** (`temoin.mjs`, `window.__JURY_TEMOIN_MODE`) : mode `desync` (musique coupée, apparitions retardées de 0 à 0,9 s,
  60 % des poursuivants doublés) ; mode `synchro` (témoin POSITIF, apparitions calées sur le prochain temps audio), seulement pour la validation.

## Validation de l'instrument (deux axes indépendants, écrits avant essai)

1. Audio : RMS capté du témoin ≤ 0,1 × celui de la pointe.
2. Temps : sur les sondes `sync-probe` (150 s, mêmes graines des deux côtés, ≥ 30 événements), part d'apparitions à ± 40 ms du témoin positif
   ≥ 50 % et perte de part ≥ 0,2 entre le témoin positif et le témoin dégradé.

Amendement du 24/10/2026 (02 h 50), à lire : l'ancienne règle comparait la pointe au témoin dégradé ; la version 0 mesure 4,8 % à ± 40 ms,
elle aurait fait échouer l'instrument alors que celui-ci voit bien. La pointe n'intervient plus dans l'axe temporel, elle ne sert que de
référence audio. Amendement de tolérance : un clip est conforme jusqu'à 2 s de trou de capture (le drapeau strict à 1 s reste publié,
`sansTrou`) ; le premier dossier réel avait un trou de 1,07 s et quatre clips sur cinq « non conformes ».

## Limites à dire

- Aucun jeu simulé ici : tout est testé sur fixtures (`verifier.mjs --statique`, 42 contrôles). Le comportement dans Chrome des images denses,
  du témoin positif (arrondi au temps audio) et des sondes de synchronisation n'est pas encore vu en vrai.
- Les durées de prise sont des hypothèses : étalonnage 1 h 30 à 2 h 30 pour la pointe, 1 h 30 à 2 h 30 pour le témoin (parties jusqu'à 720 s en
  temps réel, aventure jusqu'à 30 min).
- Deux modèles peuvent se tromper ensemble : l'orchestratrice relit un court échantillon des notes du jury.
- Un neuf et demi sur dossier ne remplace pas l'iPhone de la propriétaire, qui reste le juge final.
