import fs from 'node:fs';
import { sources, monde } from './vm.mjs';
const src=sources();for(const f of fs.readdirSync(new URL('./avant/',import.meta.url)))src[f]=fs.readFileSync(new URL('./avant/'+f,import.meta.url),'utf8');
const cas=[];
for(const [w,h] of [[844,390],[390,844],[1440,900]]){
 const {N,S,c}=monde(src,w,h); N.game.reset(7);N.game.dbg.etat('jeu');N.game.dbg.god(true);N.ennemis.reset();
 N.joueuse.reset({x:512,y:256,len:3,ang:0});Object.assign(S.input,{x:1,y:0,mag:1,boost:false,stick:{active:true}});
 for(let i=0;i<30;i++){N.horloge.avancer();N.joueuse.update(N.R.temps.h);}
 N.joueuse.force({x:512,y:256,ang:0,trace:true});N.cam.reset();for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);
 const boost=N.cam.devant();N.outils.geom();N.outils.origineMonde();N.gfx.clear(0);N.joueuse.drawTop();const p=N.cam.toScreen(512,256);
 let ambre=0;for(const signe of [-1,1])for(let d=10;d<=16;d++){const x=Math.round(p.x-d),y=Math.round(p.y+signe*5);if(N.gfx.buf()[y*N.gfx.W+x]===N.pal.i('ambre'))ambre++;}
 const effectif=N.joueuse.boost;N.joueuse.boost=false;N.cam.reset();for(let i=0;i<120;i++)N.cam.update(N.R.temps.imageRef);
 cas.push({profil:[w,h],critiquePublie:typeof N.joueuse.critique,boostManche:effectif,ambre,cam:{croisiere:N.cam.devant(),boost,delta:boost-N.cam.devant()},err:c.__ERR.count});
}
fs.writeFileSync(new URL('./avant-visuel.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas},null,2));console.log(JSON.stringify(cas));
