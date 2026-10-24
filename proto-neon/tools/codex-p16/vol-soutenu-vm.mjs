// Complément : 600 images réellement dans l'état VOL ; réarmer la fixture entre ses cycles naturels.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {monde,sources} from './vm.mjs';
const old=JSON.parse(fs.readFileSync(new URL('sources-avant.json',import.meta.url))),src=sources();
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'Tampon réel sans DOM, pas la sortie CRT. Chaque réarmement public est déclaré.',cas:[]};
for(const [profil,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]) {
  const a=monde(old,w,h),b=monde(src,w,h),cfg=b.N.R.perf.imageP16;
  const setup=m=>{m.c.__DT=1/60;m.N.reseed(7);m.N.game.reset(7);const ok=m.N.game.dbg.scene('vol');m.N.game.dbg.god(true);m.N.crt.auto(false);return ok;};
  const r={profil,preparation:[setup(a),setup(b)],imagesVol:0,transitions:0,rearmements:0,octetsDifferents:0,etatsIdentiques:true,imagesControlees:0};
  let volVu=false;
  for(let i=0;i<2*(cfg.images+cfg.chauffeImages)&&r.imagesVol<cfg.images;i++) {
    if(volVu&&(a.N.game.etat()!=='vol'||b.N.game.etat()!=='vol')){r.rearmements++;r.preparation.push(setup(a),setup(b));volVu=false;}
    a.c.frame(i*1000/60);b.c.frame(i*1000/60);
    if(a.N.game.etat()==='vol'&&b.N.game.etat()==='vol')volVu=true;
    if(i<cfg.chauffeImages)continue;
    const x=a.N.gfx.buf(),y=b.N.gfx.buf();for(let j=0;j<x.length;j++)if(x[j]!==y[j])r.octetsDifferents++;
    r.imagesControlees++;
    const ea=a.N.game.etat(),eb=b.N.game.etat();if(ea!==eb)r.etatsIdentiques=false;
    if(ea==='vol'&&eb==='vol')r.imagesVol++;else r.transitions++;
  }
  r.erreurs=[a.c.__ERR,b.c.__ERR];
  const signature=m=>crypto.createHash('sha256').update(JSON.stringify([m.N.game.etat(),m.N.horloge.etat(),m.N.game.dbg(),m.N.journal.dump()])).digest('hex');
  r.logiqueIdentique=signature(a)===signature(b);out.cas.push(r);
  fs.writeFileSync(new URL('vol-soutenu-vm.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(r);
  if(r.imagesVol!==cfg.images||r.octetsDifferents||!r.etatsIdentiques||!r.logiqueIdentique||r.erreurs.some(e=>e.count))process.exitCode=1;
}
