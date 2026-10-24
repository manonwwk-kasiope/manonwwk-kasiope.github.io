import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {sources,hash,ICI,dateParis,compiler,jouer} from './vm.mjs';
const save=(f,x)=>fs.writeFileSync(path.join(ICI,f),JSON.stringify(x,null,2)+'\n');
const recu=sources();
if(!fs.existsSync(path.join(ICI,'sources-avant.json.gz')))fs.writeFileSync(path.join(ICI,'sources-avant.json.gz'),zlib.gzipSync(JSON.stringify(recu)));
save('reprise.json',{dateParis:dateParis(),objectif:'R-35 relance immédiate sans briefing, V1 ≤24 s, 80 parties identiques',etat:'Sources figées, calibration historique en cours',budget:'10 calibrations historiques ; 80 paires avant/après ; contrôles relance trois profils ; V1 cinq puis cinquante graines si nécessaire',arrets:'VM divergente ou erreur réelle : pas de conclusion ; serveur/Chromium/réseau interdits',sourceSha256:hash(recu),git:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),prochaineAction:'Calibration puis mesure R-35 et raccord en mémoire'});
const historique=sources('e1bdc6f'),script=compiler(historique),ref=JSON.parse(fs.readFileSync(path.join(ICI,'../pilotes/sortie.json'))),cas=[];
for(const a of ref.cas.filter(r=>r.graine===1||r.graine===2&&['bon','expert'].includes(r.pilote))){
 const r=jouer(script,a.pilote,a.graine),champs=['tempsJeu','tempsCombat','tempsSimule','vague','score'];
 const attendu=Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu=Object.fromEntries(champs.map(k=>[k,r[k]]));
 cas.push({pilote:a.pilote,graine:a.graine,attendu,obtenu,identique:champs.every(k=>a[k]===r[k])&&r.etat==='fin'&&!r.err&&!r.erreursConsole.length});
 console.log(JSON.stringify(cas.at(-1)));
 save('calibration.json',{dateParis:dateParis(),ref:'e1bdc6f',sourceSha256:hash(historique),referenceSha256:hash(ref),conforme:cas.length>=10&&cas.every(c=>c.identique),cas});
}
if(cas.length<10||!cas.every(c=>c.identique))process.exitCode=1;
