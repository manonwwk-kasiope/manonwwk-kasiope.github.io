// Contrôle complémentaire du chemin CYCLOPE, modifié pour supprimer sa double annonce.
import fs from 'node:fs';
import {sources,monde,partie} from './vm.mjs';
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),avant:null,apres:null};
for(const [cle,ref] of [['avant','8f55a91'],['apres',null]]) {
  const m=monde(sources(ref));out[cle]={...partie(m,'dieu',1),erreursConsole:m.erreurs};
  fs.writeFileSync(new URL('./victoire-pilote.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify({version:cle,...out[cle]}));
}
out.identique=['tempsJeu','vague','score','raison','err'].every(k=>out.avant[k]===out.apres[k]);
fs.writeFileSync(new URL('./victoire-pilote.json',import.meta.url),JSON.stringify(out,null,2));
if(!out.identique||out.apres.err||out.avant.erreursConsole.length||out.apres.erreursConsole.length)process.exitCode=1;
