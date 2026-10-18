// Paysage réutilisé depuis les reçus terminés ; orientations supplémentaires en série.
import fs from 'node:fs';
import {sources,ICI} from './vm.mjs';
import {charge} from './mesures.mjs';
const avant=JSON.parse(fs.readFileSync(ICI+'/avant/sources.json')),out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[]};
for(const phase of ['avant','apres']){
 const f=JSON.parse(fs.readFileSync(ICI+'/flashs-'+phase+'.json'));for(const r of f.cas)out.cas.push({phase,profil:'paysage',reutilise:true,...r});
}
for(const [phase,src] of [['avant',avant],['apres',sources()]])for(const [profil,w,h] of [['portrait',390,844],['bureau',1440,900]])for(const reduit of [false,true]){
 const r=charge(src,reduit,3600,{w,h});out.cas.push({phase,profil,reutilise:false,...r});fs.writeFileSync(ICI+'/flashs-profils-vm.json',JSON.stringify(out,null,2));
 console.log(phase,profil,reduit,r.maxParSeconde,r.flashs,r.err.count);global.gc?.();
}
