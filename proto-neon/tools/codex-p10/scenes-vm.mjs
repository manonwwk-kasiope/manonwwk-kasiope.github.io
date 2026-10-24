import fs from 'node:fs';
import { sources,monde } from './vm.mjs';
import { installer,analyser } from './sonde.mjs';
const cal=JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url)));if(!cal.valide)throw Error('VM non calibrée');
const avant=process.argv.includes('--avant'),src=sources().map(([f,s])=>[f,avant&&['40-sprites.js','50-fx.js'].includes(f)?fs.readFileSync(new URL('avant/'+f,import.meta.url),'utf8'):s]);
const resultats=[];
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 for(const scene of ['charge','boss3','mort-cyclope']){
  const {c,N,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;installer(c);
  const P=c.__P10;P.preparer(scene);const images=[];
  for(let f=0;f<600;f++){P.stimuler(f);c.frame(f*1000/60);images.push(P.lire(f));}
  const r=analyser({profil,scene,images,...P.bilan()});resultats.push(r);console.log(profil,scene,'pixels',r.pixels.maxParSeconde,'gate',r.limiteur.maxParSeconde,'fatal',r.fatal,'err',r.err.count);
 }
}
const {c}=monde(src);installer(c);const tetes=c.__P10.tetes();
console.log('gaines',tetes.completes,'/',tetes.total);
fs.writeFileSync(new URL(avant?'scenes-avant.json':'scenes-apres.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),mode:'VM sans DOM ; vraie boucle frame et vrais pixels, sans canvas/CRT navigateur',resultats,tetes},null,2)+'\n');
if(!avant&&(!resultats.every(r=>r.ok)||tetes.completes!==tetes.total))process.exitCode=1;
