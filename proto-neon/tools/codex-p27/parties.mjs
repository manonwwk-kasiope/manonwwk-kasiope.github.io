import fs from 'node:fs';
import crypto from 'node:crypto';
import {sources,partie,ICI} from './vm.mjs';
const mode=process.argv[2]||'avant';
const historique=mode.startsWith('calibrer'), src=mode==='avant'?JSON.parse(fs.readFileSync(ICI+'/recu-sources.json')):sources(historique?'e1bdc6f':null);
const ref=JSON.parse(fs.readFileSync(ICI+'/../pilotes/sortie.json'));
const selection=historique?ref.cas.filter(c=>c.graine===1||(c.graine===2&&['bon','expert'].includes(c.pilote))):ref.cas;
const hash=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
fs.writeFileSync(ICI+'/'+mode+'-sources.json',JSON.stringify(src));
const cas=[];
for(const c of selection){
 const r=partie(src,c.pilote,c.graine);
 r.journalSha256=crypto.createHash('sha256').update(JSON.stringify(r.journal)).digest('hex');delete r.journal;
 if(historique) r.identique=['tempsJeu','tempsCombat','tempsSimule','vague','score'].every(k=>r[k]===c[k]);
 cas.push(r);fs.writeFileSync(ICI+'/'+mode+'.json',JSON.stringify({hash,cas},null,2));
 console.log(JSON.stringify({mode,p:r.pilote,g:r.graine,t:r.tempsJeu,score:r.score,err:r.err,identique:r.identique}));
}
if(historique&&!(cas.length>=10&&cas.every(c=>c.identique&&!c.err&&!c.console.length)))process.exitCode=1;
if(mode==='apres'||mode==='apres-final'){
 const avant=JSON.parse(fs.readFileSync(ICI+'/avant.json')).cas;
 const comparaison=cas.map((c,i)=>({pilote:c.pilote,graine:c.graine,identique:['tempsJeu','tempsCombat','tempsSimule','vague','score','journalSha256'].every(k=>c[k]===avant[i][k]),erreurs:c.err,fin:c.fin}));
 fs.writeFileSync(ICI+'/'+(mode==='apres-final'?'parite-final':'parite')+'.json',JSON.stringify(comparaison,null,2));
 if(!comparaison.every(c=>c.identique&&!c.erreurs&&c.fin))process.exitCode=1;
}
