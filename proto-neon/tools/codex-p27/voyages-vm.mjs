// Enchaînements réels du jeu et du module aventure, avant/après ; aucune image/vidéo décodée.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {monde,sources,ICI,PROTO}from './vm.mjs';import {schemas,raccorder}from './raccords.mjs';
const avant=process.argv.includes('--avant'),src=avant?schemas(JSON.parse(fs.readFileSync(ICI+'/recu-sources.json'))):raccorder(sources());
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'VM : parcours et films demandés seulement, pas de lecture ni capture navigateur',cas:[]};
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const m=monde(src,{w,h}),{N,S}=m.c.__N?{N:m.N,S:m.c.__S}:{};
 Object.assign(m.c.ART_SRC,Object.fromEntries(fs.readdirSync(PROTO+'/art').filter(f=>f.endsWith('.png')).map(f=>[f.slice(0,-4),'actif-present-non-decode'])));
 N.horloge.avancer();N.ev.verifier(true);
 const sim=s=>{N.game.dbg.simuler(s);N.game.draw();N.fx.draw();N.game.drawTop();},tap=(x,y)=>{S.input.taps.push({x,y,t0:0,t1:0});sim(.025);S.input.taps.length=0;};
 const cas={profil,voyages:[]};
 for(const qui of ['elle','lui']){
  const trace=[],note=()=>{const s=N.game.etat()+'/'+N.aventure.etape();if(trace.at(-1)!==s)trace.push(s);};
  for(let i=0;i<160&&N.game.etat()!=='aventure';i++){N.intro.skip();sim(.25);tap(N.gfx.W*.7,N.gfx.H*.5);note();}
  for(let i=0;i<500&&N.aventure.etape()!=='neon';i++){
   note();const et=N.aventure.etape();
   if(et==='choix'){sim(.7);const z=N.choix.state().zones[qui];tap(z.x+z.w*.5,z.y+z.h*.45);}
   else N.aventure.sauter();sim(.05);
  }
  assert.equal(N.aventure.etape(),'neon');assert.equal(N.aventure.enCours(),true);note();
  N.game.dbg.etat('victoire');
  for(let i=0;i<1000&&N.game.etat()!=='fin';i++){
   note();N.intro.skip();if(N.aventure.actif())N.aventure.sauter();sim(.25);
  }
  note();assert.equal(N.game.etat(),'fin');
  const attendu=qui==='elle'?['connexion-elle','fissure-elle','neon-elle','profondeur-elle','warp-elle','espace-elle','fin-elle','pilote-lui']:['connexion-lui','fissure-lui','neon-lui','profondeur-lui','warp-lui','espace-lui','fin-lui','retrouvailles','teaser-3019','asuivre'];
  const films=JSON.parse(JSON.stringify(N.aventure.state().joues));assert.deepEqual(films,attendu);assert.ok(trace.includes('aventure/2975'));
  cas.voyages.push({qui,trace,films});
  if(qui==='elle'){
   sim(1.5);const a=N.ui.finActions();assert.equal(a.disponible,false);tap(a.rejouer.x+a.rejouer.w/2,a.rejouer.y+a.rejouer.h/2);assert.equal(N.game.etat(),'titre');
  }
 }
 cas.profilFinal=JSON.parse(JSON.stringify(N.choix.profil()));assert.ok(cas.profilFinal.elle.fini&&cas.profilFinal.lui.fini);
 cas.err=m.c.__ERR;cas.console=m.erreurs;assert.equal(cas.err.count,0);assert.equal(cas.console.length,0);
 resultat.cas.push(cas);console.log(profil,'deux voyages, deux fins, retrouvailles, teaser, REJOUER : OK');
}
resultat.conforme=true;fs.writeFileSync(ICI+'/voyages-'+(avant?'avant':'apres')+'.json',JSON.stringify(resultat,null,2));
