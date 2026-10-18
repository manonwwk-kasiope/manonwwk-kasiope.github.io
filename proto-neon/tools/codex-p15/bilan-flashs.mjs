import fs from 'node:fs';
import {ICI} from './vm.mjs';
function pic(t){let max=0;for(let i=0,j=0;i<t.length;i++){while(t[i]-t[j]>=1)j++;max=Math.max(max,i-j+1);}return max;}
const cas=[];
for(const phase of ['avant','apres'])for(const r of JSON.parse(fs.readFileSync(ICI+'/flashs-'+phase+'.json')).cas){
 const F=r.journal.filter(x=>x.type==='flash'),A=F.filter(x=>x.d.accepte),C=F.filter(x=>x.d._compte);
 cas.push({phase,reduit:r.reduit,images:r.trace.length,picTampon:r.maxParSeconde,totalTampon:r.flashs,picImage:r.a,fenetre:r.trace.slice(Math.max(0,r.a-59),r.a+1),picJournalOfficiel:pic(A.map(x=>x.t)),picNouveauxFlashsTempsFx:pic(C.map(x=>x.d._temps)),demandes:F.length,erreurs:r.err,console:r.console});
}
fs.writeFileSync(ICI+'/flashs-comparaison.json',JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'Le contrôle _compte/_temps est distinct du critère officiel brut, qui reste en échec ; tampon procédural VM sans DOM/art/CRT.',cas},null,2));
console.log(cas.map(({fenetre,...r})=>r));
