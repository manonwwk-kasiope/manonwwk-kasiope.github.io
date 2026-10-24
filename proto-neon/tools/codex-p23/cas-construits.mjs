import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {sources,monde} from './vm.mjs';
const H=new URL('./',import.meta.url),resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[],gaines:[]};
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',H))).valide)throw Error('VM non calibrée');
const src=sources();
{
 const {c,N,S}=monde(src,7);let reduit=false;c.matchMedia=()=>({matches:reduit});N.cam.suit({x:500,y:250,ang:0,vit:0});N.cam.reset(500,250);const base=[N.cam.x,N.cam.y];N.cam.jolt(6,0);N.cam.update(0);const pousse=[N.cam.x,N.cam.y];reduit=true;N.cam.update(0);const annule=[N.cam.x,N.cam.y];assert.notDeepEqual(pousse,base);assert.deepEqual(annule,base);N.fx.setShake(1);N.fx.shake(10);assert.equal(S.shake,0);resultat.cas.push({nom:'préférence réduite activée pendant une poussée et secousse manuelle à 1',base,pousse,annule,shake:S.shake,err:c.__ERR,ok:true});
}
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const {c,N,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;N.game.dbg.masque();vm.runInContext(fs.readFileSync(new URL('../mesure/sonde.js',H),'utf8'),c);
 for(const scene of ['calme','montee','chaos','colosse']){
  N.game.dbg.scene(scene);N.game.dbg.god(true);const p=N.joueuse.tete,v=N.cam;const e=N.ennemis.spawn('fleche',v.x+v.w*N.R.camera.cadre.min,v.y+v.h*N.R.camera.cadre.max,{});if(e){e.x=v.x+v.w*N.R.camera.cadre.min;e.y=v.y+v.h*N.R.camera.cadre.max;}
  for(let i=0;i<3;i++)c.frame((c.__FRAME||0)*1000/60);
  const a=c.__MESURE.analyseCourante({gaine:true});resultat.gaines.push({profil,scene,ennemi:e?{id:e.id,x:e.x,y:e.y,etat:e.etat}:null,gaine:a.gaine,err:c.__ERR});
 }
}
fs.writeFileSync(new URL('cas-construits.json',H),JSON.stringify(resultat,null,2)+'\n');console.log(JSON.stringify(resultat));
