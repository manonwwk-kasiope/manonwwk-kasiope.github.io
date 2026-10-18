import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {bilan,decompose} from './analyse.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(DIR,'../..');
const a=JSON.parse(fs.readFileSync(DIR+'/avant.json')),b=JSON.parse(fs.readFileSync(DIR+'/apres.json'));
const date=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),resultats={dateParis:date,avant:bilan(a.cas),apres:bilan(b.cas)};
const egaux=(x,y)=>JSON.stringify(x)===JSON.stringify(y),comparaison=[];
for(const r of b.cas){
 const p=a.cas.find(x=>x.pilote===r.pilote&&x.graine===r.graine);if(!p)continue;
 const cles=['tempsJeu','tempsCombat','tempsSimule','vague','fin','raison'];
 const ja=JSON.parse(zlib.gunzipSync(fs.readFileSync(DIR+'/'+p.recu))).journal.filter(e=>e.type!=='sonde-p18');
 const jb=JSON.parse(zlib.gunzipSync(fs.readFileSync(DIR+'/'+r.recu))).journal.filter(e=>e.type!=='sonde-p18');
 comparaison.push({pilote:r.pilote,graine:r.graine,tempsVagueIdentiques:cles.every(k=>r[k]===p[k]),mortsIdentiques:egaux(p.morts,r.morts),cartesIdentiques:egaux(p.cartes,r.cartes),evenementsCombatIdentiques:egaux(p.events,r.events),defisP12Identiques:egaux(p.resume?.defis,r.resume?.defis)&&p.resume?.primesDefis===r.resume?.primesDefis,journalIdentique:egaux(ja,jb),avant:Object.fromEntries(cles.concat('score').map(k=>[k,p[k]])),apres:Object.fromEntries(cles.concat('score').map(k=>[k,r[k]])),sourcesAvant:decompose(p),sourcesApres:decompose(r)});
}
resultats.comparaison=comparaison;
const subset=comparaison.filter(r=>r.graine<=10);
const erreurs=[...a.cas,...b.cas].filter(r=>!r.fin||r.err||r.erreursConsole.length||decompose(r).ecart!==0);
resultats.preuves={casAvant:a.cas.length,casApres:b.cas.length,comparaisons:comparaison.length,parties80:subset.length,identiques80:subset.filter(r=>r.tempsVagueIdentiques).length,combatIdentiques:comparaison.filter(r=>r.tempsVagueIdentiques&&r.mortsIdentiques&&r.cartesIdentiques&&r.evenementsCombatIdentiques).length,defisP12Identiques:comparaison.filter(r=>r.defisP12Identiques).length,erreurs:erreurs.map(r=>({pilote:r.pilote,graine:r.graine,err:r.err,fin:r.fin,attribution:decompose(r).ecart})),sourcesAvant:a.hash,sourcesApres:b.hash,bundleSha256:crypto.createHash('sha256').update(fs.readFileSync(ROOT+'/index.html')).digest('hex')};
resultats.ok=a.cas.length===200&&b.cas.length===200&&subset.length===80&&comparaison.every(r=>r.tempsVagueIdentiques&&r.mortsIdentiques&&r.cartesIdentiques&&r.evenementsCombatIdentiques&&r.defisP12Identiques)&&erreurs.length===0&&resultats.apres.bonKamikaze>=1.3&&resultats.apres.tourneurBon<.10;
fs.writeFileSync(DIR+'/bilan.json',JSON.stringify(resultats,null,2)+'\n');
const f=(x,n=2)=>Number(x).toLocaleString('fr-FR',{maximumFractionDigits:n,minimumFractionDigits:n});
const pilotes=['bon','kamikaze','tourneur'];
const sources={kills:'Kills ordinaires : bases',multiplicateur:'Supplément du multiplicateur de combat',defiHistorique:'Défi historique (vie/surcharge conservées)',defisVague:'Défis de vague',defisP12:'Primes des objectifs p12 au bilan',lasso:'LASSO : bases + complément du geste',apogee:'APOGÉE : bases des kills',temps:'Temps seul / attente',cellules:'Cellules (multiplicateur inclus)',noyaux:'Noyaux (multiplicateur inclus)',vagues:'Vagues nettoyées',cyclope:'Prime de destruction CYCLOPE',autres:'Autres primes / compléments',continuite:'Continuité des kills sur 5 s',survie:'Kills après survie sans mort',risque:'Kills à risque sans invulnérabilité'};
const lignes=Object.entries(sources).map(([k,label])=>'| '+label+' | '+['avant','apres'].flatMap(e=>pilotes.map(p=>f(resultats[e].pilotes[p].sources[k]?.moyenne||0))).join(' | ')+' |');
const ratios=['avant','apres'].map(e=>`| ${e} | ${pilotes.map(p=>f(resultats[e].pilotes[p].scoreMedian,0)).join(' | ')} | ${f(resultats[e].bonKamikaze,4)} | ${f(resultats[e].tourneurBon,4)} |`);
const details=pilotes.map(p=>`| ${p} | ${resultats.avant.pilotes[p].n} | ${f(resultats.avant.pilotes[p].tempsMedian)} | ${f(resultats.apres.pilotes[p].tempsMedian)} |`);
fs.writeFileSync(DIR+'/rapport.md',`# codex-p18 — le score récompense la maîtrise

${date} (Paris), mis à jour à ${date}.

**Commande hors bac :** \`cd proto-neon && node tools/codex-p18/verifier.mjs\`

**${resultats.ok?'Palier VM validé ; qualification navigateur à vérifier hors bac.':'Lot non validé : voir les mesures et les écarts ci-dessous.'}** Aucun commit ; changements laissés dans cette copie. Le script Playwright est prêt, contrôlé en syntaxe et par résolution de Playwright, sans serveur ni Chromium exécuté dans le bac.

## Ce qui est livré

Dans \`77-score.js\`, les points de combat et les défis reçus sont conservés. S'y ajoutent : prime de continuité sur cinq secondes (seul supplément au multiplicateur déjà payé), une base de cible par tranche de quinze secondes sans mort, plafonnée à quatre bases et payée uniquement sur kill ; prime de bout portant ou de proximité d'un mur, sans invulnérabilité ; complément du LASSO jusqu'à somme des bases tuées × nombre enfermé × multiplicateur final. Une fermeture sans mort ne crée pas de points répétés. Attendre ou activer une APOGÉE vide ne donne rien.

La chaîne publique de combat reste à 2,5 s, avec son multiplicateur, ses coupes et sa remise à zéro après mort. La continuité de cinq secondes est une prime distincte : elle évite de changer les effets de combat du défi historique et de p12. Les gains flottants agrègent les primes du même kill ; le HUD et l'écran de fin emploient toujours leurs interfaces existantes. Les nouvelles primes n'avancent pas la vie bonus : celle-ci reste déclenchée par le cumul des anciens points de combat. C'est nécessaire pour que le score ne change pas les parties. \`stats.points\` rend les nouvelles catégories consultables.

Les seuls nouveaux nombres sont ajoutés dans \`N.R.score.maitrise\` et justifiés dans la section codex-p18 de \`refonte/lots/demandes.md\`. Morsure-coupe, mur létal, palette, flashs, pilotes et critères n'ont pas changé. Les primes de p12 restent identiques sur les parties comparées.

## Rapports des scores médians — 50 graines par pilote

| État | Bon | Kamikaze | Tourneur | Bon / kamikaze (≥ 1,3) | Tourneur / bon (< 0,10) |
|---|---:|---:|---:|---:|---:|
${ratios.join('\n')}

Le constat p5 de 0,9995 appartient à l'ancien état cité dans la mission. La ligne avant ci-dessus est la mesure des sources effectivement reçues, après les lots intégrés. Aucune sélection de graines : 1 à 50, mêmes départs et actions.

## Sources des points — moyenne par partie sur les 50 graines

Ces moyennes s'additionnent ; les médianes par source, qui ne s'additionnent pas, sont également dans [bilan.json](bilan.json). Une base de kill appartient à une seule des catégories ordinaire/LASSO/APOGÉE ; le supplément du multiplicateur est présenté séparément. Le temps sans action vaut zéro ; la survie paie uniquement à la destruction d'une cible. Les cellules et noyaux incluent leur propre multiplicateur.

| Source | Avant bon | Avant kamikaze | Avant tourneur | Après bon | Après kamikaze | Après tourneur |
|---|---:|---:|---:|---:|---:|---:|
${lignes.join('\n')}
| **Total moyen** | ${['avant','apres'].flatMap(e=>pilotes.map(p=>f(resultats[e].pilotes[p].sources.total.moyenne))).join(' | ')} |

Source : écritures réelles du score instrumentées dans une copie en mémoire de \`ajouter\`, contexte des événements publics, et primes p12 réellement inscrites au bilan. Chaque reçu doit reconstituer exactement son score final : **${erreurs.filter(e=>decompose(e).ecart).length} écart(s) d'attribution détecté(s)**. Aucun compteur d'appels ne tient lieu de points. L'élément de sonde \`sonde-p18\` ajouté uniquement à la copie retournée par dump transporte ces mesures ; il est exclu de toutes les comparaisons du vrai journal et n'est jamais émis dans le bus du jeu.

## Conservation des parties et validation de l'instrument

- VM historique : [validation-vm.json](validation-vm.json), dix parties exactement identiques sur \`e1bdc6f\` (huit pilotes graine 1 + bon/expert graine 2) : temps de jeu, combat, temps simulé, vague et score. Aucun DOM et aucun module de jeu remplacé. La variante avec objets standard hôtes a été revalidée sur les mêmes dix contrôles.
- Protocole de \`tools/pilotes/parties.mjs\`, via sa fonction commune \`tools/reglage/protocole.mjs\` : contexte et localStorage neufs, \`S.jour=20261017\`, actions auto pour humain uniquement, skip de l'ouverture, reset plongée, crochet plongée seulement si demarrage, pilote, journal, horloge avancée une fois, puis simulation par tranches de 0,25 s jusqu'à fin. Dieu seul reçoit god(true). Borne 540 s de jeu / 2160 s de simulation.
- **${subset.filter(r=>r.tempsVagueIdentiques).length}/${subset.length} parties du lot obligatoire de 80** ont les mêmes temps de jeu/combat/simulation et vague. Sous-ensemble explicite : huit pilotes × graines 1 à 10.
- Vérification élargie sans rejouer ces reçus : **${resultats.preuves.combatIdentiques}/${comparaison.length} paires** à mêmes temps, vague, morts, cartes et événements kill/coupe/mort/LASSO/APOGÉE ; **${resultats.preuves.defisP12Identiques}/${comparaison.length}** mêmes objectifs p12 et mêmes primes. **${comparaison.filter(r=>r.journalIdentique).length}/${comparaison.length} journaux réels identiques en entier**, conservés dans les reçus gzip ; détails par paire dans bilan.json.
- Avant : **${a.cas.length}** parties ; après : **${b.cas.length}** parties. ${erreurs.length} partie(s) avec erreur, fin manquante ou attribution inexacte. [Avant](avant.json), [après](apres.json), [bilan et comparaison par graine](bilan.json).
- Huit scénarios ciblés sur les vraies sources : attente, continuité, survie/mort, LASSO non doublé, APOGÉE vide, purge, seuil de vie bonus, risque/invulnérabilité : [cas-cibles.json](cas-cibles.json).
- \`cd proto-neon && node build.mjs\` : sortie 0, [build.log](build.log). Empreinte du bundle : \`${resultats.preuves.bundleSha256}\`.
- [Contrôle de périmètre et des sources](verification-source.json) : seuls 77-score, ajouts de 02-regles, section propre de demandes et index généré ; sources avant/après conformes aux empreintes de leurs reçus, bundle contenant les sources finales.

| Pilote | Graines | Durée médiane avant (s de jeu) | Après |
|---|---:|---:|---:|
${details.join('\n')}

## Limites et reste à faire

La VM mesure la logique, les états, les événements et les points ; elle ne qualifie ni les pixels ni Safari. Le script [verifier.mjs](verifier.mjs) lance un unique Chromium muet et ferme chaque contexte avant le suivant : iPhone 13 paysage 844 × 390 tactile, portrait 390 × 844 tactile, bureau 1440 × 900. Il attend un vrai multiplicateur >1 dans une partie bon/graine 2, recherche le motif complet du texte attendu dans le tampon du vrai HUD, puis vérifie l'état fin, la valeur SCORE et ses pixels. Il conserve tampons, captures, journaux et \`window.__ERR\` ; aucune réussite navigateur n'est annoncée ici.

**Reste : exécuter cette commande hors bac et relire les captures. Qualification finale navigateur bloquée par les limites établies du bac (listen/Chromium indisponibles), pas par une autorisation manquante.** Une émulation Chromium ne remplace pas une vérification Safari physique sur iPhone.
`);
console.log(JSON.stringify({ok:resultats.ok,preuves:resultats.preuves,rapports:{avant:[resultats.avant.bonKamikaze,resultats.avant.tourneurBon],apres:[resultats.apres.bonKamikaze,resultats.apres.tourneurBon]}}));
if(!resultats.ok)process.exitCode=1;
