// Complément sans Canvas : sorties du tampon réel, journal et état à CHAQUE image ; coût VM seulement.
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';
import { sources,monde } from './vm.mjs';
import {decor} from './raccords.mjs';
const raccord=process.argv.includes('--raccord');
const current=sources(),src=raccord?{...current,'15-decor.js':decor(current['15-decor.js'])}:current;
const old=raccord?current:JSON.parse(fs.readFileSync(new URL('sources-avant.json',import.meta.url)));
if(!JSON.parse(fs.readFileSync(new URL('calibration.json',import.meta.url))).valide)throw Error('VM non calibrée');
const sha=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sources:{avant:sha(old),apres:sha(src)},limite:'VM sans Canvas, pas une preuve de la sortie CRT ni du coût navigateur.',cas:[]};
const stats=a=>{a.sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],somme:a.reduce((a,b)=>a+b,0)};};
for(const [profil,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const scene of ['charge','v5','vol','boss3']) {
  const a=monde(old,w,h),b=monde(src,w,h);
  const setup=m=>{m.c.__DT=1/60;m.c.__SEED=7;m.N.reseed(7);m.N.game.reset(7);const ok=m.N.game.dbg.scene(scene);m.N.game.dbg.god(true);m.N.crt.auto(false);return ok;};
  const r={profil,scene,preparation:[setup(a),setup(b)],images:src['02-regles.js']?b.N.R.perf.imageP16.images:0,imagesDifferentes:0,octetsDifferents:0,premiere:null};
  const times=[[],[]],n=r.images,chauffe=b.N.R.perf.imageP16.chauffeImages;
  for(let i=0;i<n+chauffe;i++) {
    // Alterner l'ordre pour ne pas attribuer systématiquement l'échauffement à une version.
    for(const k of (i%2?[1,0]:[0,1])){const m=k?b:a,t=performance.now();m.c.frame(i*1000/60);if(i>=chauffe)times[k].push(performance.now()-t);}
    if(i<chauffe)continue;
    const x=a.N.gfx.buf(),y=b.N.gfx.buf();let d=0;for(let k=0;k<x.length;k++)if(x[k]!==y[k])d++;
    if(d){r.imagesDifferentes++;r.octetsDifferents+=d;if(!r.premiere)r.premiere={image:i-chauffe,d};}
  }
  const signature=m=>JSON.stringify([m.N.game.etat(),m.N.horloge.etat(),m.N.game.dbg(),m.N.journal.dump()]);
  r.logiqueIdentique=signature(a)===signature(b);r.erreurs=[a.c.__ERR,b.c.__ERR];r.coutsVM={avant:stats(times[0]),apres:stats(times[1])};
  out.cas.push(r);fs.writeFileSync(new URL(raccord?'raccord-vm.json':'appariement-vm.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
  console.log(profil,scene,r.imagesDifferentes,r.logiqueIdentique,r.coutsVM);
  if(r.imagesDifferentes||!r.logiqueIdentique||r.erreurs.some(e=>e.count))process.exitCode=1;
}
