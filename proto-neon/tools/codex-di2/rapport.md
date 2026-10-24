24/10/2026 · 12 h 02 (Paris) — mis à jour à 12 h 04.

**Témoins corrigés ; vérification locale réussie, 59/59 contrôles. Revalidation Chrome non lancée.**

Commande exacte, depuis la racine de cette copie, hors du bac :

```sh
node proto-neon/tools/jury2/banc.mjs --valider-instrument --instrument-seul --build di2-instrument-20261024
```

Durée : **8 à 12 minutes, hypothèse**, sur un Mac disponible, pour 6 minutes de fenêtres d’acquisition (deux prises audio de 30 s et deux sondes temporelles de 150 s, graine 101), plus chargements et encodages. Valeurs : `jury2/protocole.mjs`, `performanceSec`, `probeSyncSec`, série `etalonnage`. Cette commande réserve un seul Chrome headless muet et un serveur local sur port libre ; elle ne rejoue ni parties, ni aventure, ni performance. Elle conserve les seuils et produit des dossiers réduits, jamais « prêts pour jury ». Son code de sortie juge la sensibilité instrumentale ; les manques d’une campagne complète restent publiés. Si le dossier `etalonnage-di2-instrument-20261024` existe déjà, le banc refuse de l’écraser : choisir un nouvel identifiant `--build`.

## Corrections et périmètre

- **Audio — `../jury2/banc.mjs:183`, `:187`, `:239`** : préparation réelle exportée et sérialisée par `page.evaluate`. Après `localStorage.clear()`, avant `game.reset`, la seule fenêtre `audio-probe` mémorise `{effets:false,musique:true}` par `N.score.profil.reglages()`. Suppression de l’ancienne coupure ponctuelle des effets. Le témoin conserve sa coupure musicale publique dans `../jury2/temoin.mjs:53`.
- **Temps — `../jury2/temoin.mjs:35`, `:41`, `:49`** : impose `rythmeFin` dans les deux modes, y compris sans échéance héritée et pour les doublons. Le curseur est `music.transport().rythme || transport`, comme dans `31-rythme`, sans retirer une seconde fois sa latence. Le positif vise le premier temps de `music.beat()` compatible avec le portail demandé et le minimum existant `N.R.apparitions.portail`. Le dégradé ajoute le retard du générateur indépendant déjà prévu par `P.temoin`. Les fonctions de placement, d’attente, de report et d’annulation du jeu sont intactes.
- **Traçabilité — `../jury2/banc.mjs:202`** : le mode termine le nom du dossier de chaque `sync-probe`, donc `-synchro` et `-desync` ont chacun leur brut.
- **Contrôles — `../jury2/verifier.mjs:107`, `:113`, `:114`**, nouveaux `tests-temoins.mjs`, `vm-temoins.mjs`, `valider-vm.mjs`. Les 42 contrôles existants restent présents. Leur fixture minimale reçoit les interfaces publiques désormais utilisées (`tests-jury.mjs:312`) ; la reconnaissance textuelle de la construction est adaptée à `rythmeFin` (`verifier.mjs:94`). Aucun seuil modifié.
- **Commande ciblée — `../jury2/banc.mjs:125`, `:413`, `:450`** : `--instrument-seul` exige `--valider-instrument`, retire les collectes étrangères à la sensibilité, conserve les dossiers réduits et n’assimile pas cet essai à une qualification de campagne.

Aucun fichier de `src/`, aucun `N.R`, aucun `protocole.mjs` ni `index.html` du jeu modifié. Le seul fichier hors de `tools/jury2/` est ce rapport explicitement demandé. Aucun navigateur, serveur local ni accès réseau sortant lancé pendant cette mission.

## Validation de la VM et méthode

Le chargeur commun concatène les vraies sources dans l’ordre lexicographique de `build.mjs`, avec la même fermeture. Sans DOM : initialisation équivalente au boot pour la logique (`reseed`, `gfx.init(null)`, taille de vue, `intro.reset`, premier `game.reset`). Les ports audio matériels et le curseur sont injectés seulement pour les essais des témoins. Le reset, la persistance de profil, `spawn`, les mises à jour des ennemis, `rythme.update`, l’attente, le journal et le bus d’événements sont réels. Les contrôles lisent le moment où l’événement est émis, pas seulement les options ou le nombre d’appels.

**Échec préalable publié :** premier essai du chargeur avec initialisation incomplète : 0/10 parties historiques identiques ; inerte/graine 1 donnait `25.366666666665868 s` au lieu de `25.291666666665872 s` (vague 1, score 10, zéro erreur). Aucune conclusion de jeu retenue depuis ce chargeur. Initialisation reprise selon le harnais local `tools/codex-p18/vm.mjs`, puis mutualisée : **10/10**, temps, vague et score strictement identiques sur les sources `e1bdc6f` et les dix premières références de `tools/pilotes/sortie.json`, zéro erreur. Reçu : [validation-vm.json](../jury2/validation-vm.json), lié au SHA-256 du chargeur commun. Ce résultat ne prétend pas rejouer les 80 parties de la pointe actuelle.

Le curseur externe de la fixture est délibérément différent de `transport.rythme`, et son temps AudioContext aussi ; une confusion de ces horloges fait échouer les émissions attendues. Le changement de morceau annule réellement la naissance ; le placement impossible entraîne un report observé à 11,75 s, soit 250 ms du temps, qui reste **un cas empêché, pas un positif connu**. La livraison au pas suivant est observée à 11,005 s pour une échéance de 11 s. Les contrôles imposent `__ERR.count === 0` et aucune erreur console.

## Sorties avant/après

```text
node proto-neon/tools/jury2/tests-temoins.mjs --avant
→ code 1 ; {"avant":true,"controles":15,"echecs":10}
node proto-neon/tools/jury2/verifier.mjs --statique
→ code 0 ; {"reussi":true,"controles":59,"echecs":0}
```

L’avant est exécutable : il lit par `git show` le banc et le témoin originaux du commit reçu `a294e2b`, sans les réécrire sur disque, et les passe au même chargeur validé. Les sources de jeu sont celles reçues, inchangées. Les deux gardes de placement et de changement de morceau passaient déjà avant correction ; elles ne sont pas présentées comme des défauts nouvellement réparés.

Preuves exactes : [régressions avant](../jury2/temoins-regression-avant.json), [observations avant](../jury2/temoins-observations-avant.json), [observations après](../jury2/temoins-observations.json), [59 contrôles après](../jury2/verification-locale.json). La première passe complète avant correction est aussi archivée dans [temoins-avant.json](../jury2/temoins-avant.json) : 42 contrôles historiques verts, neuf échecs parmi les onze contrôles alors ajoutés.

| Contrôle ajouté | Sortie avant | Sortie après |
| --- | --- | --- |
| Audio VM : préparation réelle, applyMute et reset — synchro | FAIL — préparation: effets coupés, musique ouverte ; 100 applyMute: effets ouverts, musique ouverte ; reset réel: effets ouverts, musique ouverte ; 100 applyMute après reset: effets ouverts, musique ouverte | PASS — préparation: effets coupés, musique ouverte ; 100 applyMute: effets coupés, musique ouverte ; reset réel: effets coupés, musique ouverte ; 100 applyMute après reset: effets coupés, musique ouverte |
| Audio VM : préparation réelle, applyMute et reset — desync | FAIL — préparation: effets coupés, musique coupée ; 100 applyMute: effets ouverts, musique coupée ; reset réel: effets ouverts, musique coupée ; 100 applyMute après reset: effets ouverts, musique coupée | PASS — préparation: effets coupés, musique coupée ; 100 applyMute: effets coupés, musique coupée ; reset réel: effets coupés, musique coupée ; 100 applyMute après reset: effets coupés, musique coupée |
| Temps VM : émission réelle — synchro — échéance absente | FAIL — émission 11.25 s | PASS — émission 11 s |
| Temps VM : émission réelle — synchro — échéance présente | FAIL — émission 11.25 s | PASS — émission 11 s |
| Temps VM : émission réelle — desync — échéance absente | FAIL — émission 11.25 s | PASS — émission 11.08 s |
| Temps VM : émission réelle — desync — échéance présente | FAIL — émission 11.25 s | PASS — émission 11.08 s |
| Temps VM : minimum contractuel du portail, même sans option — synchro | FAIL — émission 10.75 s | PASS — émission 11 s |
| Temps VM : changement de morceau annule, aucun faux positif — synchro | PASS — émission absente s | PASS — émission absente s |
| Temps VM : placement impossible reporte réellement l’émission — synchro | PASS — émission 11.75 s ; report empêché, écart au temps 250 ms | PASS — émission 11.75 s ; report empêché, écart au temps 250 ms |
| Temps VM : minimum contractuel du portail, même sans option — desync | FAIL — émission 10.75 s | PASS — émission 11.08 s |
| Temps VM : changement de morceau annule, aucun faux positif — desync | PASS — émission absente s | PASS — émission absente s |
| Temps VM : placement impossible reporte réellement l’émission — desync | PASS — émission 11.75 s ; report empêché, écart au temps 250 ms | PASS — émission 11.75 s ; report empêché, écart au temps 250 ms |
| Temps VM : livraison au pas suivant, pas de rétrodatage | FAIL — émission 11.255 s | PASS — émission 11.005 s |
| Audio VM : aucune coupure persistée hors audio-probe | PASS — effets et musique ouverts, profil inchangé | PASS — effets et musique ouverts, profil inchangé |
| Traçabilité : les deux modes ont chacun leur dossier brut | FAIL — sync-probe-paysage-bon-101 ; sync-probe-paysage-bon-101 | PASS — sync-probe-paysage-bon-101-synchro ; sync-probe-paysage-bon-101-desync |
| Validation préalable du chargeur | Premier essai 0/10, abandonné | 10/10 identiques ; reçu du chargeur courant accepté |
| Revalidation ciblée | Option absente | PASS ; profils/pilotes de parties vides, aventure/performance retirées, usage sans `--valider-instrument` refusé avant navigateur |

Les deux portes audio sont des **états de canaux**, pas une mesure de PCM dans cette VM. Après correction, `musique:true` et `effets:false` sont effectivement persistés, et les états restent corrects à la préparation, après 100 réapplications, après un vrai reset, puis après 100 nouvelles réapplications. Hors `audio-probe`, les effets restent ouverts.

Les 42 contrôles conservés, sorties détaillées dans les reçus liés ci-dessus :

| Contrôle existant | Avant | Après |
| --- | --- | --- |
| Syntaxe de tous les modules ESM | PASS | PASS |
| Import du banc sans lancement | PASS | PASS |
| Fonctions navigateur sérialisables | PASS | PASS |
| Un flash rouge et lumineux simultané compte une fois | PASS | PASS |
| Trois flashs restent trois ; quatre sont refusés | PASS | PASS |
| R-13 emploie la seconde réelle malgré les images manquantes | PASS | PASS |
| Synchronisation : ±40 ms et 95 % inclusifs | PASS | PASS |
| Un audio inconnu ne disparaît pas du dénominateur | PASS | PASS |
| Le RMS avant mute ne prouve jamais la musique audible | PASS | PASS |
| Carte r1 : mesures numérotées à partir de 1 | PASS | PASS |
| Planches : phase quelconque du drop, sans élargir le seuil de 150 ms | PASS | PASS |
| Alignement : latence retirée une seule fois ; curseur accéléré suivi | PASS | PASS |
| Boucle musicale : aucun faux drop en remontant le curseur | PASS | PASS |
| Difficulté : victoires et censures ne sont pas des défaites | PASS | PASS |
| Sensibilité : le témoin connu dégradé est distingué sur deux axes | PASS | PASS |
| Deux dossiers identiques invalident l’instrument | PASS | PASS |
| Un seul axe ou aucune donnée ne suffisent pas | PASS | PASS |
| Capteur dans une fixture VM indépendante du jeu : pixels et objets réels | PASS | PASS |
| PNG du tampon : aller-retour RGB exact et planche | PASS | PASS |
| Mesure audio du fichier réel : sinusoïde et silence décodés sans lecture | PASS | PASS |
| Serveur : Range 206 et gel des actifs, sans ouvrir de port | PASS | PASS |
| Build du jeu reçu : sortie 0, dans une copie temporaire (la copie de travail n’est pas reconstruite) | PASS | PASS |
| Témoin construit dans une copie temporaire, syntaxe valide | PASS | PASS |
| Témoin reproductible, actifs identiques à la pointe, aucun chemin temporaire | PASS | PASS |
| Intervalle de Wilson et médiane de Kaplan–Meier : valeurs connues | PASS | PASS |
| Séries de graines : étalonnage hors réglage ; alpha et beta tirées, scellées, disjointes, jamais écrasées | PASS | PASS |
| Échantillon : instants uniformes stratifiés et reproductibles, temps de jeu → temps réel, pires cas | PASS | PASS |
| Échantillon : événements désignés par la règle écrite (drops, breaks, vagues, WARP, CYCLOPE, fin, toutes les morts) | PASS | PASS |
| Tapis rythmique : grille des temps, écarts signés, événements verts/rouges, PNG exact | PASS | PASS |
| Défauts plantés : liste écrite, tirage borné par le rôle, altérations réelles sur des copies | PASS | PASS |
| Paquet : noms neutres, passes séparées, échantillon appliqué par script, canaris tirés et consignés dans la clé seule | PASS | PASS |
| Paquet : refus d’écraser ; rôle verdict exige série, validation de l’instrument et dossier complet | PASS | PASS |
| Paquet : un doublon renomme les séquences sans changer le contenu (test de stabilité) | PASS | PASS |
| Preuves vérifiables par script : fichier, temps, champ, case ; tout le reste est introuvable | PASS | PASS |
| Verdict : schéma, deux passes, annexe interdite avant la note 1, plafonds de la grille appliqués par le script | PASS | PASS |
| Défauts plantés : retrouvés seulement par une preuve rangée parmi les défauts ou les anomalies | PASS | PASS |
| Étalonnage : un juré complaisant, plat, instable ou ancré par les chiffres est écarté ; accord de rang ; cellules | PASS | PASS |
| Porte 7 : réussite seulement si tout tient ; sinon échec ou « non interprétable » (accord des familles, troisième jury, graines communes) | PASS | PASS |
| Consolidation sur fichiers : verdicts écrits, relus, validés, plafonnés, canaris comptés | PASS | PASS |
| Témoin : source du module dégradé et du témoin positif, exécutée dans un contexte VM (retards, doublons, calage sur le temps) | PASS | PASS |
| Sensibilité : la pointe désynchronisée ne fait pas échouer l’instrument ; témoin positif et dégradé requis | PASS | PASS |
| Sonde : images denses autour des drops, des morts et du WARP seulement (fixture VM indépendante du jeu) | PASS | PASS |

## Build, intégrité et reste

Build reçu reconstruit en copie temporaire par le vrai `build.mjs` : code 0 ; SHA-256 avant/après identique `3eaf75cf596e5e101d7b33d103eae98dca36ae83435afa3b4890618f684a4024`. Le témoin corrigé est reproductible, syntaxiquement valide et identique au jeu hors de son seul module ajouté ; reçu du vérifieur. `git diff --check` : code 0. Les actifs et preuves dérivées du témoin dans `tools/jury2/temoin/` ont été reconstruits par le vérifieur.

**Sous-tâche de correction validée en VM. Instrument physique à revalider** : lancer la commande en tête hors du bac, lire `validation-instrument.json` et les bruts distincts, mesurer le PCM capté et les apparitions rendues. Aucun ratio acoustique ni verdict Chrome/Safari nouveau n’est revendiqué. Le report de placement et une interruption de transport restent des limites identifiées ; les seuils existants restent appliqués sans assouplissement.

**Commit local bloqué par le bac à sable.** Tentative réelle : `git add -- proto-neon/tools/jury2 proto-neon/tools/codex-di2/rapport.md` → code 128 :

```text
fatal: Unable to create '/Users/manonwojciechowski/Projets/SNAKE 2975/.git/worktrees/codex-di2/index.lock': Operation not permitted
```

Aucun commit créé, aucun contournement tenté ; les changements restent dans la copie. Dépendance indispensable pour ce dernier geste : exécuter Git depuis un environnement autorisé à écrire les métadonnées de ce worktree. Message demandé à conserver : « jury2 : témoins corrigés (audio effets coupés, échéance rythmeFin imposée), contrôles VM ». **Chantier bloqué pour le commit local** ; corrections et contrôles VM terminés. Revalidation physique réservée à la cheffe hors bac, comme demandé.
