import fs from 'node:fs';import vm from 'node:vm';import {sources,monde} from './vm.mjs';
const H=new URL('./',import.meta.url),resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[]};
for(const version of [process.argv[2]||'apres']){const src=version==='avant'?JSON.parse(fs.readFileSync(new URL('avant/sources.json',H))):sources();
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]].filter(x=>!process.argv[3]||x[0]===process.argv[3])){
 const {N,c,S,erreurs}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',H),'utf8'),c);
 const pas=n=>{for(let f=0;f<n;f++)c.frame((c.__FRAME||0)*1000/60);};const dem=c.__MESURE.demarrer({graine:1,pilote:'bon',god:true});
 // Le départ non atteint n'est pas contourné. Ensuite, mêmes scènes et cas dirigés que R-11.
 for(const scene of ['calme','montee','chaos','colosse']){
  N.game.dbg.scene(scene);pas(3);const a=c.__MESURE.analyseCourante({gaine:true});let dirigee=null;
  if(!a.gaine?.bord){N.game.dbg.god(true);const v=N.cam,e=N.ennemis.spawn('fleche',v.x+v.w*N.R.camera.cadre.min,v.y+v.h*N.R.camera.cadre.max,{});if(e){e.x=v.x+v.w*N.R.camera.cadre.min;e.y=v.y+v.h*N.R.camera.cadre.max;}pas(3);dirigee=c.__MESURE.analyseCourante({gaine:true}).gaine;}
  resultat.cas.push({version,profil,scene,depart:dem,analyse:a,dirigee,err:c.__ERR,erreursConsole:[...erreurs]});
 }
}}
fs.writeFileSync(new URL('r11-sequence-'+(process.argv[2]||'apres')+'-'+(process.argv[3]||'tous')+'.json',H),JSON.stringify(resultat,null,2)+'\n');console.log(resultat.cas.filter(x=>x.scene==='colosse').map(x=>[x.version,x.profil,x.analyse.gaine]));
if(resultat.cas.some(x=>x.version==='apres'&&x.scene==='colosse'&&x.analyse.gaine?.part!==1))process.exitCode=1;
