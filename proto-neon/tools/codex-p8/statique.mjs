import fs from 'node:fs';
import vm from 'node:vm';
import { sources, monde } from './vm.mjs';
import { mesurer } from './sonde.mjs';
const profils = [[844,390],[390,844],[1440,900]], cas=[];
for(const [w,h] of profils) for(const reduced of [false,true]) {
  const {c}=monde(sources(),w,h,reduced);
  const resultat=vm.runInContext(`(${mesurer.toString()})()`,c);
  cas.push({profil:[w,h],...resultat});
  console.log(JSON.stringify({profil:[w,h],reduced,checks:resultat.checks}));
}
const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'VM Node sans DOM : aucune capture ni preuve Safari.',cas};
fs.writeFileSync(new URL('./statique.json',import.meta.url),JSON.stringify(bilan,null,2));
if(cas.some(c=>c.checks.some(t=>!t.ok)))process.exitCode=1;
