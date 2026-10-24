import fs from 'node:fs';import zlib from 'node:zlib';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {ICI,noms,sources} from './vm.mjs';
const lire=(phase,p,g)=>JSON.parse(zlib.gunzipSync(fs.readFileSync(`${ICI}/${phase}-${p}-${g}.json.gz`)));
const battement=e=>e.type==='arene'&&['battement','battementFin'].includes(e.d.evt);
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[],sourceSha256:Object.fromEntries(sources().map(([n,s])=>[n,crypto.createHash('sha256').update(s).digest('hex')]))};
for(const pilote of noms)for(let graine=1;graine<=10;graine++){
 const a=lire('avant',pilote,graine),b=lire('raccords',pilote,graine);
 const cles=['tempsJeu','tempsCombat','tempsSimule','vague','score','raison','fin'];
 const egalEtat=cles.every(k=>a[k]===b[k]);
 const ja=a.journal.filter(e=>!battement(e)),jb=b.journal.filter(e=>!battement(e));
 const journalIdentique=JSON.stringify(a.journal)===JSON.stringify(b.journal),journalHorsAjoutsIdentique=JSON.stringify(ja)===JSON.stringify(jb);
 sortie.cas.push({pilote,graine,egalEtat,journalIdentique,journalHorsAjoutsIdentique,annoncesAjoutees:b.journal.filter(battement).length,avant:Object.fromEntries(cles.map(k=>[k,a[k]])),apres:Object.fromEntries(cles.map(k=>[k,b[k]])),erreursAvant:a.err,erreursApres:b.err,consoleAvant:a.erreursConsole,consoleApres:b.erreursConsole});
}
sortie.etatsIdentiques=sortie.cas.filter(c=>c.egalEtat).length;
sortie.journauxIdentiques=sortie.cas.filter(c=>c.journalIdentique).length;
sortie.journauxHorsAjoutsIdentiques=sortie.cas.filter(c=>c.journalHorsAjoutsIdentique).length;
sortie.annoncesAjoutees=sortie.cas.reduce((n,c)=>n+c.annoncesAjoutees,0);
sortie.conforme=sortie.cas.length===80&&sortie.cas.every(c=>c.egalEtat&&c.journalHorsAjoutsIdentique&&c.apres.fin&&!c.erreursAvant&&!c.erreursApres&&!c.consoleAvant.length&&!c.consoleApres.length);
fs.writeFileSync(ICI+'/comparaison.json',JSON.stringify(sortie,null,2)+'\n');
console.log(JSON.stringify({...sortie,cas:undefined,sourceSha256:undefined}));assert.ok(sortie.conforme);
