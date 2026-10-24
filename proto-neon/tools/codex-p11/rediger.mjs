import fs from 'node:fs';
import crypto from 'node:crypto';
import {sources} from './vm.mjs';
const lire=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url)));
const cal=lire('./calibration.json'),cmp=lire('./comparaison.json'),avant=lire('./avant.json'),apres=lire('./apres.json'),sc=lire('./scenarios-apres.json'),co=lire('./complements.json');
const hash=crypto.createHash('sha256').update(JSON.stringify(sources())).digest('hex');
if(hash!==apres.sourcesSha256)throw new Error('Sources différentes du candidat mesuré');
if(cmp.identiques!==cmp.total||cmp.total<20||apres.cas.some(p=>p.raison!=='fin'||p.err))throw new Error('Conservation ou fins non validées');
const date=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const bundle=crypto.createHash('sha256').update(fs.readFileSync(new URL('../../index.html',import.meta.url))).digest('hex');
const table=sc.profils.map(p=>`| ${p.nom} | ${p.entree} | ${p.sortieDemo} | ${p.journalisationUnitaire.toucher} / ${p.journalisationUnitaire.glisse} / ${p.journalisationUnitaire.tenu} | ${p.aventure} | ${p.err.count} |`).join('\n');
const pilotes=apres.cas.map((p,i)=>`| ${p.pilote} | ${p.graine} | ${p.tempsJeu} | ${p.vague} | ${p.score} | ${cmp.comparaison[i].identique ? 'exact' : 'DIVERGE'} |`).join('\n');
fs.writeFileSync(new URL('./rapport.md',import.meta.url),`# codex-p11 — 18/10/2026 · 02 h 06 (Paris), mis à jour à ${date}

**Commande à lancer hors bac** : \`cd proto-neon && node tools/codex-p11/verifier.mjs\`.

**Sous-tâche logique terminée ; chantier bloqué pour la validation finale** : extension du schéma journal à intégrer par la cheffe d'orchestre, puis reçu navigateur à produire hors bac. Aucun serveur ni Chromium lancé ici, aucun commit effectué. Le script navigateur est complet et sa syntaxe contrôlée ; il conserve le contrôle du schéma en échec tant que le raccord n'est pas intégré. Il ne qualifie pas Safari matériel.

Fait : attente du titre réutilisée depuis N.R (15 s), vraie partie de démonstration avec le pilote public bon ; sa mort ou les 20 s de démonstration relancent celle-ci, sans supprimer la règle mortelle du mur. Les transitions vers les cartes/intermèdes et le bilan ne sont pas exécutés dans cet état. Silence global et par canaux (voix et cues compris), état sonore du titre restauré à la sortie. Aucun score de démonstration sauvegardé. Un toucher/clavier/clic quitte immédiatement la démo ; son relâcher est consommé par la nouvelle interface publique N.entree.annuler(), pour ne pas lancer JOUER.

La fonction geste() journalise chaque reconnaissance existante : genre, doigt, durée en secondes, déplacement en points CSS, action demandée, t0/t1 en millisecondes issues de la reconnaissance. Une reconnaissance ne prouve pas l'activation effective d'un pouvoir soumis à recharge. Aucune reconnaissance ni aucun seuil changés. Ajouts N.R : pilote public et conversion 1000 ms/s, documentés dans la section codex-p11 de [demandes.md](../../refonte/lots/demandes.md).

Aventure appartient désormais au registre gelé : horloge avance, section null, plein écran. L'acceptation spéciale de 79-jeu est retirée. Aucun raccord defile changé.

## Mesures VM avant / après

Instrument validé : **${cal.cas.filter(c=>c.identique).length}/${cal.cas.length}** parties exactes sur les vraies sources e1bdc6f, cinq pilotes × deux graines ; temps de jeu, vague, score, fin et erreurs sans tolérance. Source : [calibration.json](calibration.json), commande \`node tools/codex-p11/calibrer.mjs\`. Ce contrôle ne prétend pas à l'identité des journaux historiques flottants.

Avant reçu : aucune attraction en 25 s sur les trois formats, zéro écriture de geste ; JOUER mène déjà à aventure mais le registre est absent. Source : [scenarios-avant.json](scenarios-avant.json), sources HEAD du worktree reçu.

Après, sources réelles sans DOM : [scenarios-apres.json](scenarios-apres.json), commande \`node tools/codex-p11/scenarios.mjs apres\`.

| Format | Attraction après s | Sortie sur input.any simulé | Journal unitaire toucher / glisse / tenu | JOUER | __ERR |
|---|---:|---|---|---|---:|
${table}

Le contrôle unitaire appelle la vraie fonction geste() avec des reconnaissances préparées ; **ce n'est pas une preuve de reconnaissance tactile**. Les vraies entrées navigateur restent à vérifier. L'erreur initiale document is not defined lors d'un essai des handlers tactiles sans DOM a conduit à limiter honnêtement le test VM à la journalisation ; aucun faux DOM ni lecteur n'a été ajouté. Le navigateur utilise les vrais événements tactiles CDP, sur une horloge de test contrôlée.

Compléments : activité après 10 s repousse bien l'attraction ; démo encore active après 45 s supplémentaires, pilote actif, coupure globale et deux canaux actifs, disque inchangé, __ERR = 0. Clic puis relâcher tardif : titre conservé, pilote arrêté, coupure globale restaurée. Source : [complements.json](complements.json), commande \`node tools/codex-p11/complements.mjs\`.

## Conservation des parties

**${cmp.identiques}/${cmp.total}** parties avant/après exactes sur l'état reçu, huit pilotes × trois graines. Temps de jeu, temps de combat, vague, score, fin, erreurs et SHA-256 du journal complet identiques, sans arrondi ni tolérance. Sources : [avant.json](avant.json), [apres.json](apres.json), [comparaison.json](comparaison.json). Les 80 cas n'ont pas tous été rejoués ; cette preuve couvre le minimum demandé, sans étendre son verdict aux cas non mesurés.

Protocole identique à tools/pilotes/parties.mjs : monde neuf et localStorage vide par partie, S.jour = 20261017, réglage actions selon pilote, intro.skip(), reset départ plongée (secours démarrage uniquement), pilote, journal actif, horloge.avancer() une fois, simulation par tranches de 0,25 s jusqu'à fin. Borne de 540 s de jeu et quatre fois cette durée en simulation, garde de stagnation de 10 s. Amorçage préalable reseed/reset comme boot. Chaque partie finit sans erreur.

| Pilote | Graine | Temps jeu s avant = après | Vague | Score avant = après | Journal et résumé |
|---|---:|---:|---:|---:|---|
${pilotes}

Reproduction : \`node tools/codex-p11/parties.mjs avant\` (sources HEAD reçues), puis \`node tools/codex-p11/parties.mjs apres\` (sources courantes). Les résultats après sont sauvegardés après chaque partie.

## Reste précis et intégration

Le validateur actuel refuse les **deux champs t0/t1 sur chaque geste** (18 événements par format), car le schéma ne les prévoyait pas ; fenêtre __ERR = 0 ne signifie pas conformité de schéma. Le fichier 03-socle m'est réservé pour les états uniquement : **aucune modification de son schéma appliquée**. Patch prêt : [raccord-schema.patch](raccord-schema.patch), git apply --check réussi. Champs optionnels pour conserver les anciens reçus. Le même raccord sur une copie en mémoire donne zéro erreur de schéma ([complements.json](complements.json)). Demande exacte consignée dans demandes.md. Intégration par la cheffe indispensable avant le verdict contractuel.

Après intégration du raccord, reconstruire le bundle avec \`cd proto-neon && node build.mjs\`, puis lancer la commande navigateur en tête : trois profils 844 × 390 tactile, 390 × 844 tactile et 1440 × 900 ; un seul Chromium --mute-audio ; entrée attraction à 15 ± 1 s, sortie au premier toucher et clic bureau, six gestes de chaque genre avec dates/doigt, JOUER → choix aventure, sortie RMS audio, captures et vrais pixels du tampon, palette, journaux, __ERR et console. Résultats attendus dans navigateur/resultats.json, PNG et JSON de chaque capture. Aucun succès navigateur ni mesure Safari annoncé.

Build : \`cd proto-neon && node build.mjs\`, **sortie 0** ([build.log](build.log)). Sources finales SHA-256 : \`${hash}\`. Bundle reconstruit SHA-256 : \`${bundle}\`. git diff --check sans erreur. Pas de nouveau flash ou de modification de collision dans ce lot.
`);
console.log('Rapport actualisé',date);
