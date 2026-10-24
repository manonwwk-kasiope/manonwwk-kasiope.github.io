import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
import {sources,monde} from './vm.mjs';import {installer} from './sonde.mjs';
import {installer as installerP10,analyser} from '../codex-p10/sonde.mjs';
const H=new URL('./',import.meta.url),avant=process.argv.includes('--avant');
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
const src=avant?JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))):sources();
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),limite:'Vrais pixels VM sans DOM ; pas de validation Safari/Chromium.',r11:[],construits:[],r13:[]};
function creer(w,h){const m=monde(src,7);m.N.gfx.resize(w,h);m.S.view.w=m.N.gfx.W;m.S.view.h=m.N.gfx.H;m.c.__p32step=()=>m.c.frame((m.c.__FRAME||0)*1000/60);vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',H),'utf8'),m.c);installer(m.c);return m;}
const file=new URL(avant?'mesures-avant.json':'mesures-apres.json',H),save=()=>fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const m=creer(w,h);out.r11.push({profil,...m.c.__P32.r11(),erreursConsole:m.erreurs});save();
 for(const phase of [1,2,3]){const m=creer(w,h);m.c.__P32.preparer(phase);for(const quartier of m.N.decor.QUARTIERS){const mesure=m.c.__P32.construit(quartier);out.construits.push({profil,phase,...mesure,erreursConsole:[...m.erreurs]});}save();}
 for(const scene of ['charge','boss3','mort-cyclope']){const m=creer(w,h);installerP10(m.c);const P=m.c.__P10;P.preparer(scene);const images=[];for(let f=0;f<m.N.R.lisibiliteP10.mesure.images;f++){P.stimuler(f);m.c.__p32step();images.push(P.lire(f));}const r=analyser({profil,scene,images,...P.bilan()});out.r13.push({...r,erreursConsole:m.erreurs});save();}
 console.log(profil,JSON.stringify({r11:out.r11.at(-1).analyse.gaine,construits:out.construits.filter(x=>x.profil===profil).map(x=>[x.phase,x.quartier,x.isole.analyse.gaine?.part,x.compose.analyse.gaine?.part]),r13:out.r13.filter(x=>x.profil===profil).map(x=>[x.scene,x.pixels.maxParSeconde,x.ok])}));
}
save();
if(!avant&&(out.r11.some(x=>x.analyse.gaine?.part!==1)||out.construits.some(x=>x.isole.analyse.gaine?.part!==1||x.cyan||x.isole.err.count||x.erreursConsole.length)||out.r13.some(x=>!x.ok||x.erreursConsole.length)))process.exitCode=1;
