import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {instrument,sources,ICI} from './vm.mjs';import {raccorder} from './raccords.mjs';import {construire,verdictCas} from './cas.mjs';
const b=instrument(raccorder(sources())),cas=[];
for(const [nom,mutation]of [['convoi','N.arene.draw=function(){};'],['travelling','N.arene.draw=function(){};'],['battement','N.fx.vignette=function(){};'],['fondCyan','N.gfx.remap=function(){};']]){
 const c=b.create();c.opts={nom};vm.runInContext(mutation,c);
 const r=JSON.parse(JSON.stringify(vm.runInContext('('+construire.toString()+')(opts)',c)));
 const accepte=verdictCas(r);assert.equal(accepte,false,'Le banc accepte la mutation '+nom);cas.push({nom,mutation,accepte,mesure:r});
}
fs.writeFileSync(ICI+'/mutants.json',JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas},null,2)+'\n');console.log('4 défauts de pixels rejetés, journaux conservés');
