import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {sources,hash,sauver,dateParis,ICI,ROOT} from './vm.mjs';
import {raccorder} from './raccords.mjs';
const lire=f=>JSON.parse(fs.readFileSync(path.join(ICI,f),'utf8'));
const calibration=lire('calibration.json'),p=lire('parties80.json'),c=lire('controles.json'),g=lire('garde.json'),extras=lire('complements.json');
assert(calibration.conforme&&p.complete&&p.identiques===80&&c.conforme&&g.conforme&&extras.conforme);
assert.equal(hash(raccorder(sources())),p.sources.apres,'Sources changées après le banc : ne pas réutiliser ses reçus.');
const build=spawnSync(process.execPath,['build.mjs'],{cwd:ROOT,encoding:'utf8'});fs.writeFileSync(path.join(ICI,'build.log'),build.stdout+build.stderr);assert.equal(build.status,0);
const checks=[];
for(const [cmd,args] of [
 ['git',['diff','--check']],
 ['git',['apply','--check','proto-neon/tools/codex-v0d/raccord-79-jeu.js.patch','proto-neon/tools/codex-v0d/raccord-50-fx.js.patch']],
 [process.execPath,['--check','proto-neon/tools/codex-v0d/verifier.mjs']]
]){const r=spawnSync(cmd,args,{cwd:path.dirname(ROOT),encoding:'utf8'});checks.push({commande:[cmd,...args].join(' '),sortie:r.status,stdout:r.stdout,stderr:r.stderr});assert.equal(r.status,0);}
const date=dateParis(),bornes=p.cas.filter(x=>x.apres.raison!=='fin');
const bilan={dateParis:date,statut:'Implémentation et VM livrées ; intégration réservée et mesure Chrome en attente.',build:{sortie:build.status,sha256:hash(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'))},sources:p.sources,calibrationExacte:calibration.cas.length,parties:{identiques:p.identiques,fins:p.fins,bornes:bornes.map(({pilote,graine,apres})=>({pilote,graine,...apres})),zeroErreur:p.cas.every(x=>!x.avant.err&&!x.apres.err&&!x.avant.erreursConsole.length&&!x.apres.erreursConsole.length)},controlesConstruits:c.cas.length,garde:g.cas,checks,navigateur:'non exécuté conformément à la consigne du bac'};
sauver('bilan.json',bilan);
fs.writeFileSync(path.join(ICI,'rapport.md'),`# codex-v0d — le film de l'amiral

${date} (Paris).

**Commande hors bac :** \`cd proto-neon && node tools/codex-v0d/verifier.mjs\`.
Le script sert le candidat avec les deux raccords appliqués **en mémoire**. Après intégration des patchs et reconstruction, lancer \`node tools/codex-v0d/verifier.mjs --integre\` pour contrôler le vrai bundle livré. Résultats attendus dans \`tools/codex-v0d/navigateur/resultats.json\`, captures à côté. Aucun serveur ni navigateur n'a été lancé ici ; aucune connexion sortante, aucun commit.

**Statut : sous-tâche implémentation / VM terminée ; palier navigateur bloqué sur son exécution hors bac et l'intégration des fichiers réservés. Le jeu complet n'est pas déclaré validé.**

## Ce qui change

- \`67-cosmos.js\` lance \`N.film.jouer('amiral-' + T.qui)\` après la création du vaisseau, à son arrivée naturelle comme via le crochet de saut. Le personnage transmis par l'aventure est conservé. Un seul lancement par époque cosmos (une époque 2975 par partie), réarmé au démarrage suivant ; aucun film ajouté sous pilote contractuel actif.
- Pendant le film, le cosmos ne modifie ni ses temps, ni le warp, les positions, PV, tirages de hasard, compteurs ou journaux. Le lecteur existant assure vidéo / panneau fixe / ciel ultime, révélation tramée et sortie au chronomètre ; aucun flash procédural nouveau. Le saut d'époque ne peut pas franchir le film.
- L'ordonnanceur de musique cosmique est suspendu ; son gain descend vers zéro, puis revient à son niveau habituel. Sa section, sa mesure, son tempo et le demi-temps restent conservés ; le prochain pas audio est recalé sur le temps réel à la reprise. Stop et nouvelle partie annulent la lecture.
- \`64-aventure.js\` ajoute l'option de garde du lecteur, sans modifier sa valeur historique pour les autres films. Les quatre réglages ajoutés sont dans \`N.R.filmAmiral\` : durée 5 s, garde 0,3 s, gain 0,62 et lissage 0,05 s ; raisons dans \`refonte/lots/demandes.md\`.

## Intégration réservée indispensable

Depuis la racine du dépôt, la cheffe applique :

\`git apply proto-neon/tools/codex-v0d/raccord-79-jeu.js.patch proto-neon/tools/codex-v0d/raccord-50-fx.js.patch\`

Puis \`cd proto-neon && node build.mjs\`, et le contrôle Chrome \`--integre\`.

Le raccord 79 expose l'état effectif \`panneau\` pendant le film pour arrêter l'horloge commune, tout en conservant l'état interne suspendu et son chronomètre. Il traite le lecteur à la place du jeu et consomme ses entrées. Le raccord 50 conserve les effets et évite leur superposition. **Ces fichiers réservés ne sont pas modifiés dans cette copie.** Aucun raccord 70-joueuse / 15-decor requis ; aucun champ privé d'un autre module lu.

Témoin négatif conservé : sans ces raccords, la VM observe **+0,3000000000000001 s** d'horloge pendant le film au lieu de zéro (\`complements.json\`). Le build présent intègre le déclencheur mais attend donc les raccords pour le gel commun complet.

## Mesures avant / après

Sources reçues figées dans \`sources-avant.json.gz\` ; candidat avec raccords dans \`sources-apres-raccordees.json.gz\`. Empreintes dans \`bilan.json\` et \`parties80.json\`. La vérification finale confirme que les sources candidates sont toujours exactement celles mesurées.

| Preuve | Avant | Après | Source |
|---|---|---|---|
| Calibration VM sur e1bdc6f | dix parties historiques | 10/10 temps de jeu, temps combat, vague, score strictement identiques ; zéro erreur | calibration.json |
| Arrivée naturelle, elle et lui, graine 2975 | amiral créé à t = 66,65 s, vt = 57 s | même état complet à chaque pas jusqu'au film ; bon personnage, un lancement | complements.json |
| Gel du monde pendant le film | aucun film déclenché | delta d'horloge 0 ; état cosmos et journaux inchangés ; gel préexistant conservé | controles.json, complements.json |
| Garde clavier / toucher | pas de film amiral | refus avant 300 ms ; accepté à 300 ms pour les deux entrées | garde.json, controles.json |
| Reprise après saut | module reçu sans film | état complet identique pendant les 240 pas suivants, puis tampon identique | controles.json |
| Vidéo refusée, panneau présent | pas de lecture amiral | panneau fixe rendu dans le vrai tampon palette ; mêmes gel, saut et reprise | controles.json |
| Musique | ordonnanceur existant | notes et paramètres gelés ; sortie de fixture 0 pendant le film, cible 0,62 au retour | complements.json |
| 80 parties, mêmes pilotes et graines | 78 fins, 2 bornes | **80/80 strictement identiques**, journaux et échantillons compris ; zéro erreur | parties80.json et parties/*.json.gz |
| Build / patchs / script Chrome | sources reçues | build sortie 0 ; patchs applicables sans conflit ; syntaxe du script valide | build.log, bilan.json |

Les seize cas construits couvrent les trois formats demandés, les deux personnages et vidéo acceptée / refusée, puis fin naturelle, stop, reset et pilote. **En VM, le décodeur et les images des films sont des fixtures déclarées** : leurs pixels prouvent le raccord de rendu et le repli, pas le décodage H.264 ni l'apparence des vrais films. Le double WebAudio prouve les paramètres et l'ordonnanceur, pas une qualité sonore.

Les deux bornes identiques avant / après restent des essais non terminés :

${bornes.map(x=>`- ${x.pilote}, graine ${x.graine} : ${x.apres.tempsJeu} s de jeu, vague ${x.apres.vague}, score ${x.apres.score}, zéro erreur.`).join('\n')}

Aucune borne ni aucun seuil n'a été élargi ; aucune de ces deux parties n'est comptée comme fin. Ce lot ne corrige pas ces déroulés préexistants.

Un essai de construction a d'abord échoué : attendu \`neon\`, mesuré \`1976\`. Le saut du terminal entre dans sa fissure et attend sa fin ; la boucle de préparation de l'instrument était trop courte. Elle a été corrigée, sans changer le jeu ni sa garde ; la construction complète passe désormais (\`construction-initiale.json\`, \`complements.json\`).

## Ce qui reste à vérifier

Les deux fichiers locaux sont H.264, 384 × 216, 12 images/s, 61 images, durée 5,083333 s, sans piste audio listée (\`media-elle.json\`, \`media-lui.json\`, ffprobe local). Le lecteur est cadencé sur 5 s comme les intermèdes du contrat ; ce relevé de métadonnées ne prouve pas leur lecture dans Chrome ou Safari.

Le script Chrome prêt à lancer mesure, pour chaque profil et personnage, de vraies images décodées, la progression du temps vidéo et des images, le tampon non noir et dans la palette, le refus du saut précoce, le saut effectif au clavier / toucher, le gel, la reprise, le panneau en cas de refus de lecture et les erreurs. Un seul Chrome H.264 à la fois, muet ; seules les ressources HTTP locales sont autorisées. Le parcours construit utilise les interfaces publiques de l'aventure jusqu'à l'époque 2975.

**À vérifier hors bac :** décodage et mouvement des MP4, captures réelles, éventuels flashs des clips, son au retour et comportement sur Safari iPhone réel. Le banc Chrome émule les dimensions / entrées iPhone ; il ne vaut pas une qualification Safari. Dépendance indispensable : application des deux raccords par la cheffe, puis exécution du script hors du bac et retour de ses reçus. Aucune mesure navigateur n'est inventée.
`);
console.log(JSON.stringify(bilan,null,2));
