import fs from 'node:fs';import {sources,partie} from './vm.mjs';
const H=new URL('./',import.meta.url);if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
const src=sources(),out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[]};
for(const graine of [1,2]){const r=partie(src,'dieu',graine,{reduit:true,resume:true});r.victoire=r.resume?.victoire === true;r.evenements=r.journal.length;delete r.journal;out.cas.push(r);fs.writeFileSync(new URL('parties-reduit.json',H),JSON.stringify(out,null,2)+'\n');console.log(graine,r.raison,r.tempsJeu,r.victoire,r.err);}
out.ok=out.cas.length===2&&out.cas.every(r=>r.raison==='fin'&&r.victoire&&!r.err&&!r.erreursConsole.length);fs.writeFileSync(new URL('parties-reduit.json',H),JSON.stringify(out,null,2)+'\n');if(!out.ok)process.exitCode=1;
