import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
import {monde,sources,ICI,PROTO} from './vm.mjs';
import {flashs} from '../mesure/criteres/R-13-photosensibilite.mjs';
import {scenarioCamera,comparerCamera} from '../mesure/criteres/R-12-explosion.mjs';
const sonde=fs.readFileSync(path.join(PROTO,'tools/mesure/sonde.js'),'utf8');

export function preparer(src,opts={}){const m=monde(src,{graine:2975,camera:true,...opts});vm.runInContext(sonde,m.c);m.run("(function(){const original=__MESURE.parImage;__MESURE.parImage=function(id,code,max){return original.call(this,id,'var Math=globalThis.Math;\\n'+code,max);};})()");return m;}
export function charge(src,reduit=false,nb=3600,profil={}){const m=preparer(src,{reduit,...profil});m.c.NB=nb;m.c.__progress13=x=>console.log('charge VM',reduit?'réduit':'normal',x,nb);
 const r=m.run(`(function(){const Math=globalThis.Math;N.intro.skip();N.game.dbg.scene('charge');N.game.dbg.god(true);N.journal.actif(true);N.journal.dump({vider:true});
 const L=N.pal.L,prec=new Uint8Array(N.gfx.buf().length),trace=[];let kills=0;
 for(let f=0;f<NB;f++){
  if(f<120&&f%4===0){const e=N.ennemis.list.find(e=>e.etat!=='mort'&&!e.boss);if(e){if(N.ennemis.hit(e,1e6,{genre:'arme',type:'canon',id:0}))kills++;}}
  window.__R12Avancer(); const b=N.gfx.buf();let up=0,dn=0,rin=0,rout=0,br=0;
  for(let i=0;i<b.length;i++){const a=prec[i],c=b[i],lo=Math.min(L[a],L[c]);if(L[c]-L[a]>=0.1&&lo<0.8)up++;else if(L[a]-L[c]>=0.1&&lo<0.8)dn++;const ra=a===5||a===11||a===14,rc=c===5||c===11||c===14;if(rc&&!ra)rin++;else if(ra&&!rc)rout++;if(c===11)br++;}
  if(f===0)up=dn=rin=rout=0; // même première image de référence que le critère R-13
  prec.set(b);trace.push({f:window.__FRAME,up:up/b.length,dn:dn/b.length,rin:rin/b.length,rout:rout/b.length,br:br/b.length,etat:N.game.etat(),shake:S.shake});
  if((f+1)%600===0)window.__progress13(f+1);
 }
 return {trace,kills,err:__ERR,journal:N.journal.dump(),fx:N.fx.stats};})()`);
 return JSON.parse(JSON.stringify({reduit,...flashs(r.trace,m.N.R.criteres.R13.aire,1/60),...r,console:m.erreurs}));}
export function camera(src){const mesures=[];for(let index=0;index<4;index++){const m=preparer(src);m.c.options={index};const avec=JSON.parse(JSON.stringify(m.run('('+scenarioCamera.toString()+')(options)')));const n=preparer(src);n.c.options={index,sansCoup:true,plan:avec};const sans=JSON.parse(JSON.stringify(n.run('('+scenarioCamera.toString()+')(options)')));const a=avec[index],b=sans[index],cam=comparerCamera(a,b);let run=0,best=0;for(const x of a.trace.filter(x=>x.f>a.imageCoup)){run=x.br>m.N.R.criteres.R12.brasier?run+1:0;best=Math.max(run,best);}const r={cible:a.cible,imagesBrasier:best,camera:cam,impact:a,temoin:b,console:[...m.erreurs,...n.erreurs]};mesures.push(r);console.log(r.cible,best,cam.camera,cam.raison||'');}return mesures;}
