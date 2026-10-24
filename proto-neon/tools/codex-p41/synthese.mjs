import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
import {ICI,dateParis,hash,sources,monde} from './vm.mjs';
const read=f=>JSON.parse(fs.readFileSync(path.join(ICI,f))),calibration=read('calibration.json'),paires=read('parties80.json'),relances=read('relance-vm.json'),v1=read('v1.json'),controles=read('controles.json');
const mediane=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null;};
const seuil=monde().N.R.criteres.R35;
const v1res={};for(const version of ['avant','apres']){
 const cas=v1.cas.filter(c=>c.version===version),d=cas.map(c=>c.duree).filter(Number.isFinite);
 v1res[version]={observations:cas.length,nettoyees:d.length,nonNettoyees:cas.filter(c=>c.duree===null).map(c=>c.graine),mediane:mediane(d),min:Math.min(...d),max:Math.max(...d),mediane5:mediane(cas.filter(c=>c.graine<=5).map(c=>c.duree)),erreurs:cas.filter(c=>c.err||c.erreursConsole.length)};
}
const v1PairesIdentiques=Array.from({length:50},(_,i)=>i+1).every(g=>{const a=v1.cas.find(c=>c.version==='avant'&&c.graine===g),b=v1.cas.find(c=>c.version==='apres'&&c.graine===g);return a&&b&&a.duree===b.duree&&a.journalSha256===b.journalSha256;});
const chronologies=[];let imagesMesurees=0,pixelsHorsPalette=0;
for(const r of relances.cas){const b=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,r.fichier))));imagesMesurees+=b.images.length;pixelsHorsPalette+=b.images.reduce((s,i)=>s+i.pixels.horsPalette,0);}
for(const version of ['avant','apres','p38','p38+p41']){
 const r=relances.cas.find(c=>c.version===version&&c.profil==='paysage'&&c.mode==='clavier');
 const brut=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,r.fichier))));
 let etapes=[];for(const i of brut.images){if(etapes.at(-1)?.etat===i.etat)etapes.at(-1).fin=i.f;else etapes.push({etat:i.etat,debut:i.f,fin:i.f});}
 etapes=etapes.map(e=>({...e,images:e.fin-e.debut+1,duree:(e.fin-e.debut+1)/60}));
 chronologies.push({version,premiereImage:r.premiereImage,secondes:r.secondes,etapes,source:r.fichier});
}
const candidats=relances.cas.filter(c=>c.version==='apres'||c.version==='p38+p41');
const sourcesAvant=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,'sources-avant.json.gz'))));
const result={dateParis:dateParis(),v1PairesIdentiques,imagesMesurees,pixelsHorsPalette,calibration:calibration.conforme,paires:{complete:paires.complete,identiques:paires.identiques,saines:paires.saines,terminees:paires.cas.filter(c=>c.avant.etat==='fin'&&c.apres.etat==='fin').length,censurees:paires.cas.filter(c=>c.avant.raison==='borne'||c.apres.raison==='borne').map(c=>({pilote:c.pilote,graine:c.graine,avant:c.avant,apres:c.apres})),erreurs:paires.cas.reduce((s,c)=>s+c.avant.err+c.apres.err+c.avant.erreursConsole.length+c.apres.erreursConsole.length,0)},relances:candidats.map(c=>({version:c.version,profil:c.profil,mode:c.mode,secondes:c.secondes,etats:c.etats,err:c.err})),v1:v1res,chronologies,sourcesReserveesIntactes:hash(sources())===hash(sourcesAvant),erreursRelances:relances.cas.reduce((s,c)=>s+c.err+c.erreursConsole.length,0),erreursControles:controles.cas.reduce((s,c)=>s+c.priseMain.err+c.films.err+c.erreursConsole.length,0),conformeVM:calibration.conforme&&paires.complete&&paires.identiques===80&&paires.saines&&candidats.every(c=>c.secondes<seuil.relance&&c.sansBriefing&&!c.err&&!c.erreursConsole.length)&&v1res.apres.mediane!==null&&v1res.apres.mediane<=seuil.v1Max&&v1res.apres.erreurs.length===0,navigateur:'non exécuté : interdit dans ce bac',integration:'patch livré ; source réservée non modifiée'};
result.R35logique=calibration.conforme&&candidats.every(c=>c.secondes<seuil.relance&&c.sansBriefing&&!c.err&&!c.erreursConsole.length)&&v1res.apres.mediane!==null&&v1res.apres.mediane<=seuil.v1Max&&v1res.apres.erreurs.length===0;
fs.writeFileSync(path.join(ICI,'bilan.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.conformeVM)process.exitCode=1;
