import fs from 'node:fs';
import crypto from 'node:crypto';
import { sources, monde, partie } from './vm.mjs';
const phase = process.argv[2] || 'apres';
const src = sources(phase === 'avant' ? 'HEAD' : undefined);
const cas = [];
const enregistrer=()=>fs.writeFileSync(new URL(phase+'.json',import.meta.url),JSON.stringify({phase,dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas},null,2));
for (const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']) {
  for (let graine=1;graine<=3;graine++) {
    const m=monde(src), r=partie(m,pilote,graine);
    r.tempsCombat=m.N.game.dbg().t;
    r.journalSha256=crypto.createHash('sha256').update(JSON.stringify(m.N.journal.dump())).digest('hex');
    cas.push(r); enregistrer(); console.log(pilote,graine,r.tempsJeu,r.score,r.raison);
  }
}
const sortie={phase, dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}), sourcesSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas};
fs.writeFileSync(new URL(phase+'.json',import.meta.url),JSON.stringify(sortie,null,2));
if(phase==='apres') {
 const avant=JSON.parse(fs.readFileSync(new URL('./avant.json',import.meta.url)));
 const comparaison=cas.map((r,i)=>({pilote:r.pilote,graine:r.graine,identique:JSON.stringify(r)===JSON.stringify(avant.cas[i])}));
 fs.writeFileSync(new URL('./comparaison.json',import.meta.url),JSON.stringify({comparaison,identiques:comparaison.filter(c=>c.identique).length,total:cas.length},null,2));
 if(comparaison.some(c=>!c.identique))process.exitCode=1;
}
