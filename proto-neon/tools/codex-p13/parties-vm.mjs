import fs from 'node:fs';
import crypto from 'node:crypto';
import {sources,partie} from '../codex-p10/vm.mjs';
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url))).valide)throw Error('VM non calibrée');
const apres=sources(),avant=apres.map(([f,s])=>[f,['15-decor.js','02-regles.js'].includes(f)?fs.readFileSync(new URL('avant/'+f,import.meta.url),'utf8'):s]);
const fields=['tempsJeu','tempsCombat','vague','score','raison','err','journalSha256'],cas=[];
const sha=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
for(const pilote of ['inerte','tourneur'])for(let graine=1;graine<=10;graine++){
 const a=partie(avant,pilote,graine),b=partie(apres,pilote,graine);
 const differences=fields.filter(k=>a[k]!==b[k]);
 cas.push({pilote,graine,avant:Object.fromEntries(fields.map(k=>[k,a[k]])),apres:Object.fromEntries(fields.map(k=>[k,b[k]])),differences,journalCompletIdentique:JSON.stringify(a.journal)===JSON.stringify(b.journal)});
 console.log(pilote,graine,differences.length?'DIVERGE':'identique');
 fs.writeFileSync(new URL('parties.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),avantSha256:sha(avant),apresSha256:sha(apres),cas,conforme:cas.length===20&&cas.every(c=>!c.differences.length&&c.journalCompletIdentique&&!c.apres.err)},null,2)+'\n');
}
if(cas.some(c=>c.differences.length||!c.journalCompletIdentique||c.apres.err))process.exitCode=1;
