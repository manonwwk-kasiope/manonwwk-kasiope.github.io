// Protocole VM repris de codex-p15/vm.mjs ; validation strictement refaite ici.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {sources,partie,ICI,PROTO} from './vm.mjs';
const ref=JSON.parse(fs.readFileSync(path.join(PROTO,'tools/pilotes/sortie.json'))),src=sources('e1bdc6f');
const cas=[];
for(const c of ref.cas.filter(c=>c.graine<=2).slice(0,10)){
  const r=partie(src,c.pilote,c.graine);
  const champs=['tempsJeu','tempsCombat','pas','tempsSimule','vague','score','raison','fin','err'];
  const ecarts=champs.filter(k=>r[k]!==c[k]).map(k=>({champ:k,reference:c[k],vm:r[k]}));
  cas.push({pilote:c.pilote,graine:c.graine,ecarts,resultat:r});
  console.log(c.pilote,c.graine,ecarts.length?'DIVERGE':'identique');
}
const o={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),reference:'e1bdc6f',vmSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ICI,'vm.mjs'))).digest('hex'),identiques:cas.filter(c=>!c.ecarts.length).length,cas};
fs.writeFileSync(path.join(ICI,'validation-vm.json'),JSON.stringify(o,null,2)+'\n');
if(o.identiques<10)process.exitCode=1;
