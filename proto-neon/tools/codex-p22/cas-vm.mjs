import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {instrument,sources,ICI} from './vm.mjs';import {raccorder} from './raccords.mjs';import {construire} from './cas.mjs';
if(!JSON.parse(fs.readFileSync(ICI+'/validation-vm.json')).conforme)throw new Error('VM non calibrée');
const preparer=phase=>{let src=sources();if(phase==='avant')src=src.map(([n,s])=>[n,['02-regles.js','17-vol.js','73-arene.js'].includes(n)?fs.readFileSync(`${ICI}/${n.replace('.js','-avant.js')}`,'utf8'):s]);return instrument(phase==='raccords'?raccorder(src):src);};
if(process.argv[2]==='--worker'){
 const [phase,profil,width,height,nom]=process.argv.slice(3),b=preparer(phase),c=b.create(7,{width:+width,height:+height});c.opts={nom,pixels:false};
 let r;try{r=JSON.parse(JSON.stringify(vm.runInContext('('+construire.toString()+')(opts)',c)));}catch(e){r={nom,erreur:String(e)};}
 fs.writeFileSync(`${ICI}/cas-${phase}-${profil}-${nom}.json`,JSON.stringify({hash:b.hash,profil,...r,erreursConsole:c.erreursConsole},null,2)+'\n');
}else{
 const bilan={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'VM sans DOM, aucun rendu de navigateur',phases:{}};
 for(const phase of ['avant','apres','raccords']){
  const b=preparer(phase),cas=[];
  for(const [profil,width,height]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const nom of ['calme','vol','convoi','travelling','battement','sillage','fondCyan']){
   execFileSync(process.execPath,[fileURLToPath(import.meta.url),'--worker',phase,profil,''+width,''+height,nom],{stdio:'inherit'});
   const r=JSON.parse(fs.readFileSync(`${ICI}/cas-${phase}-${profil}-${nom}.json`));if(r.hash!==b.hash)throw new Error('Sources ont changé pendant le lot');cas.push(r);
   console.log(phase,profil,nom,JSON.stringify({pire:r.pire,image:r.image,pixels:r.pixelsVisuels,min:r.min,max:r.max,err:r.err,erreur:r.erreur}));
  }
  bilan.phases[phase]=cas;fs.writeFileSync(ICI+'/cas-vm.json',JSON.stringify(bilan,null,2)+'\n');
 }
}
