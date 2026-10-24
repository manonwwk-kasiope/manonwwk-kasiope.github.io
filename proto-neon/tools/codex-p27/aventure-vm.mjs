// Parcours du MODULE aventure : premier rattrapage final, puis événements séparés, comme tools/aventure/banc.mjs.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {monde,sources,ICI,PROTO}from './vm.mjs';import {schemas,raccorder}from './raccords.mjs';
const avant=process.argv.includes('--avant'),src=avant?schemas(JSON.parse(fs.readFileSync(ICI+'/recu-sources.json'))):raccorder(sources());
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'VM sans DOM : transitions du module, pas de vidéo ni performance navigateur',cas:[]};
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const m=monde(src,{w,h}),N=m.N;Object.assign(m.c.ART_SRC,Object.fromEntries(fs.readdirSync(PROTO+'/art').filter(f=>f.endsWith('.png')).map(f=>[f.slice(0,-4),'actif-non-decode'])));
 const cas={profil,personnages:[]};
 for(const qui of ['elle','lui']){
  let fin=null,retours=[],evenements=qui==='elle'?['fin']:['profondeur','warp','espace','fin'];const trace=[];
  N.aventure.demarrer({qui,aJouer:i=>retours.push(i.etape),surFin:b=>{fin=b;}});
  for(let i=0;i<3000&&!fin;i++){
   const e=N.aventure.etape();if(trace.at(-1)!==e)trace.push(e);
   if(!N.aventure.actif()&&evenements.length)N.aventure.reprendre(evenements.shift());
   else N.aventure.sauter();
   N.aventure.update(.05);N.aventure.draw();
  }
  assert.ok(fin);assert.equal(fin.issue,'fin');assert.equal(fin.qui,qui);assert.equal(fin.deux,qui==='lui');
  const films=JSON.parse(JSON.stringify(N.aventure.state().joues));
  assert.deepEqual(films,qui==='elle'?['connexion-elle','fissure-elle','neon-elle','profondeur-elle','warp-elle','espace-elle','fin-elle','pilote-lui']:['connexion-lui','fissure-lui','neon-lui','profondeur-lui','warp-lui','espace-lui','fin-lui','retrouvailles','teaser-3019','asuivre']);
  cas.personnages.push({qui,fin,retours,trace,films});
 }
 cas.err=m.c.__ERR;cas.console=m.erreurs;assert.equal(cas.err.count,0);assert.equal(cas.console.length,0);sortie.cas.push(cas);console.log(profil,'module aventure : deux parcours OK');
}
 sortie.conforme=true;fs.writeFileSync(ICI+'/aventure-'+(avant?'avant':'apres')+'.json',JSON.stringify(sortie,null,2));
