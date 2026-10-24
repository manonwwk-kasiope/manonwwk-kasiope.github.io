import fs from 'node:fs';
import crypto from 'node:crypto';
import {sources,monde} from '../codex-p10/vm.mjs';
import {installer,analyser} from '../codex-p10/sonde.mjs';
import {installerDecor} from './sonde-decor.mjs';
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url))).valide)throw Error('VM non calibrée');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1];};
const avant=process.argv.includes('--avant'), ablation=process.argv.includes('--ablation');
const src=sources().map(([f,s])=>[f,avant&&['15-decor.js','02-regles.js'].includes(f)?fs.readFileSync(new URL('avant/'+f,import.meta.url),'utf8'):s]);
const resultats=[];
const fichier=arg('--sortie',(ablation?'ablation':'scenes')+(avant?'-avant':'-apres')+'.json');
const save=()=>fs.writeFileSync(new URL(fichier,import.meta.url),JSON.stringify({sourceSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),resultats},null,2)+'\n');
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]].filter(p=>!arg('--profil','')||p[0]===arg('--profil','')))for(const scene of ['charge','boss3','mort-cyclope'].filter(s=>!arg('--scene','')||s===arg('--scene','')))for(const retrait of (ablation?arg('--retraits','aucun,fx,decor,colosse').split(','):['aucun'])){
 const {c,N,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;installer(c);if(!avant)installerDecor(c);const P=c.__P10;P.preparer(scene);
 if(['decor','fx','colosse'].includes(retrait))for(const n of ['draw','drawTop','drawFar','drawPlateau','drawFront','drawEcran'])if(N[retrait][n])N[retrait][n]=()=>{};
 if(['lointain','plateau','front'].includes(retrait))N.decor[{lointain:'drawFar',plateau:'drawPlateau',front:'drawFront'}[retrait]]=()=>{};
 if(retrait==='camera-decor'){const draw=N.decor.drawFar;N.decor.drawFar=()=>draw({x:300,y:160});}
 const images=[];for(let f=0;f<+arg('--images',600);f++){P.stimuler(f);c.frame(f*1000/60);images.push({...P.lire(f),decor:c.__P13?.lire()});}
 const r=analyser({profil,scene,retrait,images,...P.bilan()});if(!avant){const d=images.map(i=>i.decor).filter(Boolean);r.decor={solChaudMax:Math.max(...d.map(i=>i.solChaud)),solLumineuxMax:Math.max(...d.map(i=>i.solLumineux)),cyanMax:Math.max(...d.map(i=>i.cyan)),cielLumineuxMin:Math.min(...d.map(i=>i.cielLumineux))};if(retrait==='aucun'&&(r.decor.solChaudMax>.03||r.decor.solLumineuxMax>.08||r.decor.cyanMax>0))r.ok=false;}resultats.push(r);save();console.log(profil,scene,retrait,r.pixels.maxParSeconde,'err',r.err.count);
}
save();
if(!ablation&&!resultats.every(r=>r.ok))process.exitCode=1;
