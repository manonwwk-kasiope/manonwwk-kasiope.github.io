import fs from 'node:fs';
import {sources,monde} from './vm.mjs';
import {installerLot} from './sonde.mjs';
const H=new URL('./',import.meta.url),sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[]};
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
for(const avant of [true,false])for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const {c,N,S}=monde(avant?JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))):sources(),7,{reduit:true});N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;c.__p23step=()=>c.frame((c.__FRAME||0)*1000/60);installerLot(c);
 sortie.cas.push({phase:avant?'avant':'apres',profil,...c.__P23.r28()});fs.writeFileSync(new URL('r28-cases.json',H),JSON.stringify(sortie,null,2)+'\n');
}
console.log(sortie.cas.map(r=>({phase:r.phase,profil:r.profil,max:r.max,ok:r.ok,paires:r.paires,err:r.err.count})));

if(sortie.cas.filter(r=>r.phase==='apres').length!==3||sortie.cas.filter(r=>r.phase==='apres').some(r=>!r.ok||r.err.count))process.exitCode=1;
