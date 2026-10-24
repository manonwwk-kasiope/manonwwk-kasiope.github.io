import fs from 'node:fs';import {sources,monde,sauver,hash,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {partiePouce} from './partie-r23.mjs';
const lire=f=>JSON.parse(fs.readFileSync(new URL(f,import.meta.url))),VM=lire('validation-vm.json'),G=lire('gestes-apres-raccord.json'),B=lire('bornes-apres.json'),C=lire('commandes-apres.json'),I=lire('instrument-vm.json'),Boost=lire('boost-bords.json');
let validationProcessus=null;try{validationProcessus=lire('validation-processus.json');}catch{}
const source=avecRaccord(sources()),R=monde().N.R;
let conservation=null;try{conservation=lire('conservation-finale.json');}catch{}
const r23=[];
for(const phase of ['avant','apres-raccord']){
 let lot=null;try{lot=lire(`r23-${phase}-pouce.json`);}catch{}
 for(const variante of ['diriger','auto']){const cas=lot?.cas.filter(c=>c.variante===variante)||[],seuil=R.criteres.R23[variante],v=cas.filter(c=>c.victoire).length;
  r23.push({phase,variante,parties:cas.length,victoires:v,taux:cas.length?v/cas.length:null,seuil,terminees:cas.filter(c=>c.fin&&c.raison==='fin').length,impulsions:cas.reduce((n,c)=>n+(c.impulsions||0),0),erreurs:cas.filter(c=>c.exception||c.err||c.erreursConsole?.length).length,
   conforme:cas.length===50&&v/cas.length>=seuil&&cas.every(c=>c.fin&&!c.err&&!c.erreursConsole.length&&c.piloteConforme)&&(variante!=='diriger'||cas.every(c=>c.impulsions===0))});
 }
}
const autoDiagnostic=lire('auto-diagnostic-vm.json');
const controle={autoResiduel:{cas:autoDiagnostic.cas.length,echecs:autoDiagnostic.cas.filter(c=>!c.conforme).length,corrige:false},dateParis:dateParis(),sourcesSha256:hash(source),protocolePouceSha256:hash(partiePouce.toString()),raccordSha256:hash(fs.readFileSync(new URL('raccord-70-joueuse.patch',import.meta.url))),
 calibration:VM.conforme,calibrationProcessus:validationProcessus?.conforme,instrument:I.conforme,gestes:G.conforme,bornes:B.conforme,commandesVM:C.conforme,boost:Boost.conforme,
 conservation:conservation?.conforme&&conservation.sourceSha256===hash(source),pairesIdentiques:conservation?.cas.filter(c=>c.identique).length||0,r23,
 navigateur:'à vérifier hors bac ; script prêt, non exécuté',safari:'à vérifier sur iPhone physique',statut:'lot non validé tant que R-23, raccord intégré et navigateur ne sont pas tous vérifiés'};
sauver('bilan-vm.json',controle);console.log(JSON.stringify(controle,null,2));
