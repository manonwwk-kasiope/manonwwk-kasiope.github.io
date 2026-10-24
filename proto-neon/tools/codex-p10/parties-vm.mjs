import fs from 'node:fs';
import crypto from 'node:crypto';
import { sources,partie } from './vm.mjs';
const cal=JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url)));if(!cal.valide)throw Error('VM non calibrée');
const src=sources(),avant=src.map(([f,s])=>[f,['40-sprites.js','50-fx.js'].includes(f)?fs.readFileSync(new URL('avant/'+f,import.meta.url),'utf8'):s]);
const refs=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas;
const fields=['tempsJeu','tempsCombat','vague','score','raison','err'];
const propre=r=>Object.fromEntries(fields.map(k=>[k,r[k]]));
const cas=[];
const finales=process.argv.includes('--finales');
const fichier=finales?'parties-finales.json':'parties.json';
const sourceSha256=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
for(const pilote of (finales?['inerte','tourneur']:['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']))for(let graine=1;graine<=(finales?10:3);graine++){
 const a=partie(avant,pilote,graine),b=partie(src,pilote,graine),ref=refs.find(r=>r.pilote===pilote&&r.graine===graine);
 const differences=fields.filter(k=>a[k]!==b[k]);
 // Le nouveau journal flash est une différence attendue ; toutes les autres charges restent exactes.
 const ja=a.journal.filter(e=>e.type!=='flash'),jb=b.journal.filter(e=>e.type!=='flash');
 const journalIdentique=JSON.stringify(ja)===JSON.stringify(jb);
 const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
 cas.push({pilote,graine,avant:propre(a),apres:propre(b),differences,journalHorsFlashIdentique:journalIdentique,journalAvantSha256:sha(ja),journalApresSha256:sha(jb),ecartsReference:fields.filter(k=>ref[k]!==b[k]),erreursConsole:b.erreursConsole});
 console.log(pilote,graine,!differences.length&&journalIdentique?'identique':'DIVERGE');
 fs.writeFileSync(new URL(fichier,import.meta.url),JSON.stringify({sourceSha256,dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas,conforme:cas.length>=20&&cas.every(c=>!c.differences.length&&c.journalHorsFlashIdentique&&!c.apres.err&&!c.erreursConsole.length)},null,2)+'\n');
}
if(cas.some(c=>c.differences.length||!c.journalHorsFlashIdentique||c.apres.err))process.exitCode=1;
