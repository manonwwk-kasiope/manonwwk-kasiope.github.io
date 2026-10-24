import fs from 'node:fs';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {sources,partie,monde} from './vm-bundle.mjs';
const src=sources('e1bdc6f'),refs=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url)));
const cas=[],t=performance.now();
for(const r of refs.cas.filter(c=>c.graine<=2&&['inerte','tourneur','maladroit','kamikaze','humain'].includes(c.pilote))) {
  const m=monde(src),obtenu=partie(m,r.pilote,r.graine),attendu=Object.fromEntries(Object.keys(obtenu).map(k=>[k,r[k]]));
  cas.push({attendu,obtenu,identique:JSON.stringify(obtenu)===JSON.stringify(attendu)});
}
const validationRecue=[],recus=JSON.parse(fs.readFileSync(new URL('parties-avant.json',import.meta.url))),recue=JSON.parse(fs.readFileSync(new URL('sources-avant.json',import.meta.url)));
for(const r of recus.cas.filter(c=>['inerte','tourneur','maladroit','kamikaze'].includes(c.pilote))) {
  const m=monde(recue),b=partie(m,r.pilote,r.graine);b.tempsCombat=m.N.game.dbg().t;b.journalSha256=crypto.createHash('sha256').update(JSON.stringify(m.N.journal.dump())).digest('hex');b.erreursConsole=m.erreurs;
  validationRecue.push({pilote:r.pilote,graine:r.graine,identique:JSON.stringify(r)===JSON.stringify(b),attendu:r,obtenu:b});
}
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas,validationRecue,ms:performance.now()-t,valide:cas.every(c=>c.identique)&&validationRecue.every(c=>c.identique)};
fs.writeFileSync(new URL('calibration-bundle.json',import.meta.url),JSON.stringify(bilan,null,2)+'\n');console.log({valide:bilan.valide,ms:bilan.ms,historique:cas.filter(c=>c.identique).length,recue:validationRecue.filter(c=>c.identique).length});
if(!bilan.valide)process.exitCode=1;
