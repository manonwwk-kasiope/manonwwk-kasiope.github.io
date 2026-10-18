import fs from 'node:fs';
import vm from 'node:vm';
import {sources,monde} from './vm.mjs';
import {installerLot} from './sonde.mjs';
const H=new URL('./',import.meta.url),out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[]};
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
const src=sources();
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const scene of ['calme','montee','chaos','colosse']){
 const {c,N,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;c.__p23step=()=>c.frame((c.__FRAME||0)*1000/60);vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',H),'utf8'),c);installerLot(c);const r=c.__P23.r11(scene);out.cas.push({profil,...r});fs.writeFileSync(new URL('lumiere-cases.json',H),JSON.stringify(out,null,2)+'\n');
}
console.log(out.cas.map(r=>({profil:r.profil,scene:r.scene,lumiere:r.analyse.decorLumineux,gaine:r.dirigee?.gaine||r.analyse.gaine})));

if(out.cas.length!==12||out.cas.some(r=>r.analyse.decorLumineux<.18||r.analyse.decorLumineux>.28||r.err.count))process.exitCode=1; // La gaine reste publiée séparément et peut échouer.
