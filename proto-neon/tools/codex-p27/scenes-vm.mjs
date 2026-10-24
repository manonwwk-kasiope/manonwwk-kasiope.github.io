import fs from 'node:fs';import crypto from 'node:crypto';
import {monde,sources,ICI}from './vm.mjs';import {raccorder,schemas}from './raccords.mjs';
import {scenario,vagueScenario}from './scenarios.mjs';import {photosensibilite,apparitions}from './mesures.mjs';
if(!JSON.parse(fs.readFileSync(ICI+'/calibrer.json')).cas.every(c=>c.identique))throw Error('VM non calibrée');
const avant=process.argv.includes('--avant'),vagues=process.argv.includes('--vagues');
let src=avant?JSON.parse(fs.readFileSync(ICI+'/recu-sources.json')):sources();src=avant?schemas(src):raccorder(src);
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'VM sans DOM, pas de qualification Safari',sourcesSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas:[]};
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const [type,vague]of [['tique',2],['voleur',3],['miroir',4],['brouilleur',5]]){
 if(process.argv.includes('--rapide')&&(profil!=='paysage'||type!=='brouilleur'))continue;
 const m=monde(src,{w,h}),r=m.run('('+(vagues?vagueScenario:scenario).toString()+')('+JSON.stringify(type)+(vagues?','+vague:'')+')');
 r.R13=photosensibilite(r.transitions,m.N.R.criteres.R13);r.R06=apparitions(r.journal);r.console=m.erreurs;
 if(r.captures){for(const c of r.captures){c.sha256=crypto.createHash('sha256').update(Buffer.from(c.buf)).digest('hex');delete c.buf;}}
 r.R07={preavis:r.preavis,annonces:r.journal.filter(x=>x.type==='armement'&&['tique','voleur','miroir','brouilleur'].includes(x.d.type)).map(x=>({type:x.d.type,total:x.d.total,shown:x.d.shown}))};
 r.conforme=!r.err&&!r.console.length&&!r.R06.dansVue&&!r.R06.horsVue&&r.R13.maxParSeconde<=m.N.R.criteres.R13.flashsParSeconde&&(vagues?r.R07.annonces.length>0&&r.R07.annonces.every(x=>x.total>=.8):r.preavis>=.8&&r.interruption.annule&&r.interruption.repris>=.8&&!r.palette.hors&&!r.palette.cyan&&r.palette.maxPixels>0);
 sortie.cas.push({profil,...r});fs.writeFileSync(ICI+'/'+(vagues?'vagues':'scenes')+'-'+(avant?'avant':'apres')+'.json',JSON.stringify(sortie,null,2));
 console.log(JSON.stringify({profil,type,preavis:r.preavis,interruption:r.interruption,palette:r.palette,R13:r.R13,R06:r.R06,err:r.err}));
}

sortie.conforme=sortie.cas.length===12&&sortie.cas.every(c=>c.conforme);
fs.writeFileSync(ICI+'/'+(vagues?'vagues':'scenes')+'-'+(avant?'avant':'apres')+'.json',JSON.stringify(sortie,null,2));
if(!sortie.conforme)process.exitCode=1;
