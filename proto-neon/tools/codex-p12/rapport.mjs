import fs from 'node:fs';
import crypto from 'node:crypto';
import {ROOT} from './vm.mjs';
const dir=ROOT+'/tools/codex-p12/',lire=f=>JSON.parse(fs.readFileSync(dir+f));
const r=lire('comparaison.json'),s=lire('suite-finale-25.json'),v=lire('validation-vm.json'),c=lire('complements.json');
const f=fs.existsSync(dir+'avant-25.json')?lire('avant-25.json'):null;
const partiel=lire('avant-progression-partielle.json');
const anciens=[];if(f)for(const [i,x] of f.cas.entries())for(const id of x.resume?.debloques||[])anciens.push({id,partie:i+1});
const now=new Date();const date=now.toLocaleDateString('fr-FR',{timeZone:'Europe/Paris'});const h=now.toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).replace(':',' h ');
const sha=crypto.createHash('sha256').update(fs.readFileSync(ROOT+'/index.html')).digest('hex');
const rows=r.synthese.map(p=>`| ${p.pilote} | ${p.n} | ${p.tempsIdentiques}/${p.n} | ${p.vaguesIdentiques}/${p.n} | +${p.scoreMin} à +${p.scoreMax} |`).join('\n');
const deb=r.suite.deblocages.map((d,i)=>`| ${d.id} | ${s.seuils[i]} | ${d.partie} | ${d.energie} |`).join('\n');
const scores=r.cas.filter(x=>x.deltaScore).length;
const texte=`# codex-p12 — défis et raisons de revenir

Commande hors bac : \`cd proto-neon && node tools/codex-p12/verifier.mjs\`.

18/10/2026 · 02 h 13 (Paris) ; mis à jour le ${date} à ${h}.

**Lot prêt à intégrer, palier VM validé. Palier navigateur bloqué par le bac ; aucun serveur ni Chromium lancé ici.** Aucun commit. Les fichiers réservés à d'autres agents sont fournis sous forme de patches uniquement.

\`N.score.defis\` est une liste de trois objets : FINIR et deux objectifs du jour, avec id/nom/état/fait/progression/but/date. Le jour utilise un flux indépendant : changer la graine de partie ne change pas les objectifs du jour et ne consomme pas le flux des vagues. Sélection et bilan sont journalisés ; \`defiVague\` et \`defisVagues\` publient la vague courante et son historique. Le briefing dispose d'un aperçu fidèle, sans avancer ce flux.

Briefing, pause et fin montrent les objectifs à l'échelle 2. La fin affiche l'énergie totale et le prochain seuil même lorsqu'une option vient d'être ouverte ; TOUT DÉBLOQUÉ remplace le prochain objectif après le dernier. Le gain d'énergie, record, écart, build, bilan, note et conseil restent accessibles par BILAN, paginé au toucher. Les cibles font au moins 44 pt dans la zone sûre. L'interligne de 18 px tient compte des accents du vrai sprite de texte à l'échelle 2. Aucun cyan d'interface ni flash ajouté.

Les nouveaux défis paient leurs points une fois au bilan : ils ne déclenchent pas de vie bonus pendant le combat. FINIR conserve ses 50 énergie existantes ; la réserve paie 20 énergie par objectif réussi. Le défi historique \`N.score.defi\`, qui donne vie/surcharge, est conservé séparément pour préserver les parties reçues ; sa suppression changerait la difficulté.

## Mesures avant / après

Instrument : ${v.cas.filter(x=>x.identique).length}/10 parties historiques \`e1bdc6f\` identiques en temps de jeu, temps de combat, vague et score. Le premier essai divergent est conservé dans \`validation-vm-echec-initial.json\` (0/10). L'initialisation manquante a été corrigée : reseed, intro.reset et game.reset comme au boot, avant le protocole demandé. Aucune conclusion tirée de la VM divergente.

Référence avant : sources reçues \`2c1546a699f19444008a1793dd3c9ebc86dd4338\`. Huit pilotes × dix graines, profil vierge par partie, iPhone paysage 844 × 390, jour 20261017, départ plongée, initialisation horloge puis tranches de 0,25 s. Bornes inchangées : 540 s de jeu et quatre fois cette valeur en simulation. Les sorties sont l'état réel, l'horloge, le score et les traces réelles des défis/déblocages. Les 70 premiers reçus avant sont réutilisés à source identique (SHA-256 vérifié), sans rejouer les parties déjà validées.

**${r.finsAvant}/80 fins avant et ${r.finsApres}/80 après ; 80/80 temps de jeu, temps de combat et vagues exactement identiques. Zéro erreur VM ou console.** Les ${scores} scores modifiés ne changent que du montant des primes de défis (détail par graine dans \`comparaison.json\`). Après le passage du premier seuil de 40 à 25, seules les deux parties dont l'option de fin changeait ont été rejouées sur les sources finales (humain 9, bon 3) : mêmes temps/vague/score/énergie, RALENTI effectivement ouvert et zéro erreur, dans \`revalidation-seuil25.json\`. L'aperçu pur et la composition visuelle sont contrôlés à part dans les compléments ; les seuils de progression sont qualifiés par la série finale ci-dessous.

| Pilote | Parties | Temps identiques | Vagues identiques | Écart de score |
|---|---:|---:|---:|---:|
${rows}

Les données de l'ancienne batterie \`8f55a91\` annonçaient une première option en partie 3 ; ce n'est pas le même état des sources que celui reçu ici. ${f?`Sur notre série avant de ${f.cas.length} parties enchaînées : ${anciens.map(x=>x.id+' en '+x.partie).join(', ')||'aucune option'} ; ${f.cas.at(-1)?.energie} énergie finale.`:'Sur l’état reçu, la série avant partielle observée pendant 17 parties ouvre RALENTI en partie 10 et REPLI en partie 16 ; le dernier déblocage à 25 n’est pas qualifié. Source : `avant-progression-partielle.json` (sortie console réelle). La preuve complète de la courbe finale reste la série après de 25 parties.'}

## Courbe de progression

**${s.cas.length} parties bon enchaînées, même profil localStorage et S.jour = 20261017 : première option en partie 2, dernière en partie 13 ; ${s.cas.at(-1).energie} énergie finale.** Chaque partie atteint fin, sans erreur. Critères inchangés : première en partie 1–2, dernière en partie 12–25.

| Option | Seuil effectif N.R | Partie du déblocage | Énergie cumulée |
|---|---:|---:|---:|
${deb}

Le candidat de 40 énergie échouait : première option en partie 3. Sa série a été arrêtée après 17 parties, lorsque toutes les options étaient déjà acquises ; reçu \`calage-seuil40-arrete.json\`, sans qualification de 25 parties pour ce candidat. Le seuil corrigé à 25 énergie a ensuite été mesuré sur les 25 parties complètes de \`suite-finale-25.json\`. Les autres seuils sont 180 / 350 / 550 / 800, tous ajoutés dans N.R et documentés dans demandes.md.

Défis du jour : ${c.jours.map(j=>j.jour+' → '+j.selection.join(', ')).join(' ; ')}. Deux graines différentes le même jour donnent la même sélection. Les trois formats des compléments couvrent briefing/pause/fin, pixels réels du tampon logique, cibles, aperçu de vague, idempotence du bilan et zéro erreur ; ils ne qualifient pas Safari.

## Intégration et reste

Trois raccords sont prêts, \`git apply --check\` et exécution conjointe en VM réussis :

- \`raccord-jeu.patch\` pour 79-jeu (codex-p11) : afficher/fermer le briefing et y passer avant la plongée ordinaire, pendant la durée existante de N.R. Les départs explicites des pilotes restent directs.
- \`raccord-date.patch\` pour 90-boot : publier le jour de Paris avant le premier reset et au retour au premier plan. Sans ce raccord, le score respecte S.jour mais utilise un jour fixe si le boot ne le fournit pas. Le passage UTC 17/10 à 22 h 30 → jour de Paris 20261018 est vérifié.
- \`raccord-schemas.patch\` pour 03-socle : accepter les champs optionnels des nouveaux journaux et du modèle d'écran. Le validateur strict passe avec le raccord ; son absence reste visible dans le script navigateur.

La vérification officielle R-36 exige actuellement un prochain identifiant même après le dernier déblocage. La demande au gardien est écrite dans demandes.md : reconnaître l'état TOUT DÉBLOQUÉ lorsque toutes les options sont réellement acquises, sans créer une récompense fictive ni affaiblir la cible 12–25.

La réserve du jour contient les cinq objectifs dont le suivi est complet ; les sept autres restent exclus, sans réussite inventée. L'ancien défi de vague « tourelles de côté » conserve son comptage historique sans mesure de l'angle : ce lot ne qualifie pas cet angle. Aucun changement de difficulté ajouté pour corriger ce point.

Construction \`cd proto-neon && node build.mjs\` : **sortie 0**, reçu \`build.log\`. Bundle livré : SHA-256 \`${sha}\`. Les patches d'intégration nécessiteront une reconstruction par la cheffe.

Playwright est résolu depuis le node_modules existant. \`verifier.mjs\` est complet et sa syntaxe est vérifiée : serveur sur port libre, un Chromium muet, trois profils successifs (844×390 tactile, 390×844 tactile, 1440×900), deux parties naturelles avant la capture de fin, captures briefing/fin, tampons bruts et empreintes, journal, pixels des lignes, zones sûres, cibles et erreurs. **Non exécuté ici** ; reçus attendus dans \`playwright/resultats.json\`. Restent l'intégration des trois raccords et cette passe navigateur hors bac, puis la qualification Safari réelle. Aucun palier navigateur ni chantier global achevé n'est annoncé.
`;
fs.writeFileSync(dir+'rapport.md',texte);console.log(date+' · '+h+' — rapport écrit.');
