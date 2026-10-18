import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {instrument,sources,ICI} from './vm.mjs';import {raccorder} from './raccords.mjs';import {construire,verdictCas} from './cas.mjs';
const b=instrument(raccorder(sources())),cas=[];
for(const [profil,width,height]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const c=b.create(7,{width,height});
 for(const nom of ['convoi','travelling','battement'])for(const sens of [-1,1])for(const flashs of [false,true]){
  c.opts={nom,sens,flashs};const r=JSON.parse(JSON.stringify(vm.runInContext('('+construire.toString()+')(opts)',c)));
  const ok=verdictCas(r);cas.push({profil,sens,flashs,ok,...r});
  if(!ok)console.log('ECHEC',profil,nom,sens,flashs,r.pixelsVisuels,r.min,r.max);
 }
}
fs.writeFileSync(ICI+'/signaux.json',JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas},null,2)+'\n');
assert.ok(cas.every(c=>c.ok));console.log(cas.length+' cas sens/flashs conformes');
