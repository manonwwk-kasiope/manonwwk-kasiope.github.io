import fs from 'node:fs';
import crypto from 'node:crypto';
import {sources,monde} from '../codex-p10/vm.mjs';
import {installer,compter} from '../codex-p10/sonde.mjs';
import {installerDecor} from './sonde-decor.mjs';
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url))).valide)throw Error('VM non calibrée');
const src=sources(),cas=[];
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const mode of ['transitions','reduit-systeme','secousse-zero']){
 const {c,N,S}=monde(src,7);N.gfx.resize(w,h);S.view.w=N.gfx.W;S.view.h=N.gfx.H;
 if(mode==='reduit-systeme')c.matchMedia=()=>({matches:true});
 if(mode==='secousse-zero')S.reglages.secousse=0;
 N.game.dbg.etat('jeu');N.decor.reset();N.decor.fixer('docks','calme');installer(c);installerDecor(c);
 const images=[],empreintes=new Set(),etapes=[];
 for(let f=0;f<(mode==='transitions'?720:120);f++){
  S.t=f*1000/60;
  if(mode==='transitions'){
   if(f===60){N.decor.quartier('artere');N.decor.etat('montee');}
   if(f===180){N.decor.quartier('centrale');N.decor.etat('chaos');}
   if(f===300){N.decor.quartier('eclipse');N.decor.etat('colosse');}
   if(f===420){N.decor.etat('victoire');N.game.dbg.etat('victoire');}
   if(f%15===0)N.decor.eclair();
   if(f===90||f===210)N.decor.fenetres();
   if(f===240)N.decor.eclipse(.6);
   if(f===360)N.decor.eclipse(0);
   if([60,180,300,420].includes(f))etapes.push({f,q:N.decor.quartier(),e:N.decor.etat()});
  }else{N.decor.eclair();N.decor.ondule(320,180,1);}
  N.gfx.clear(0);N.decor.drawFar({x:300,y:160});N.gfx.origin(300,160);N.decor.drawPlateau({x:300,y:160});N.decor.drawFront({x:300,y:160});
  images.push({...c.__P10.lire(f),decor:c.__P13.lire(),transition:N.decor.transition()});
  empreintes.add(crypto.createHash('sha256').update(N.gfx.buf()).digest('hex'));
 }
 const pixels=compter(images),d=images.map(i=>i.decor),solChaudMax=Math.max(...d.map(i=>i.solChaud)),solLumineuxMax=Math.max(...d.map(i=>i.solLumineux));
 const r={profil,mode,etapes,pixels,solChaudMax,solLumineuxMax,empreintes:empreintes.size,images,journal:N.journal.dump(),err:c.__ERR};
 r.ok=pixels.maxParSeconde<=3&&solChaudMax<=.03&&solLumineuxMax<=.08&&!r.err.count&&(mode==='transitions'||empreintes.size===1);
 cas.push(r);console.log(profil,mode,pixels.maxParSeconde,'hashs',empreintes.size,r.ok?'OK':'ECHEC');
 fs.writeFileSync(new URL('transitions.json',import.meta.url),JSON.stringify({dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas,conforme:cas.length===9&&cas.every(r=>r.ok)},null,2)+'\n');
}
if(cas.some(r=>!r.ok))process.exitCode=1;
