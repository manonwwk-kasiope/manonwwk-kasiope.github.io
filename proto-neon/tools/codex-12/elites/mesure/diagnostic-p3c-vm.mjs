/* Sans DOM, sans serveur ; aucune qualification navigateur. */
import fs from 'node:fs';
import { sources, partie } from './vm-p3c.mjs';
const refs = JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url)));
const ref=sources('e1bdc6f');
const validation=refs.cas.filter(x=>x.pilote==='inerte').slice(0,10).map(a=>{
 const b=partie(ref,a.pilote,a.graine);
 const differences=['tempsJeu','tempsCombat','vague','score','raison','err','journalSha256'].filter(k=>a[k]!==b[k]).map(k=>({champ:k,attendu:a[k],obtenu:b[k]}));
 delete b.journal; console.log(a.pilote,a.graine,differences.length?'DIVERGE':'identique');return {...b,differences};
});
const preuve={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}), reference:'e1bdc6f',validation,vmValide:validation.length>=10&&validation.every(x=>!x.differences.length)};
fs.mkdirSync(new URL('./diagnostic/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('./diagnostic/p3c-validation-vm.json',import.meta.url),JSON.stringify(preuve,null,2)+'\n');
if(!preuve.vmValide)process.exitCode=1;
