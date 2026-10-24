// Aucun réseau, serveur ni Chromium. Validation historique exigée avant toute mesure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {sources,partie,ICI} from './vm.mjs';
import {camera,charge,preparer} from './mesures.mjs';
const validation=JSON.parse(fs.readFileSync(path.join(ICI,'validation-vm.json')));
if(validation.identiques<10)throw Error('VM non validée');
const mode=process.argv[2]||'parties', phase=process.argv[3]||'avant';
const src=phase==='avant'?JSON.parse(fs.readFileSync(path.join(ICI,'avant/sources.json'))):sources();
const sha=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
const file=path.join(ICI,mode+'-'+phase+'.json');
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesSha256:sha,phase,mode,cas:[]};
function save(){fs.writeFileSync(file,JSON.stringify(out,null,2));}
if(mode==='parties'){
 for(const p of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let g=1;g<=10;g++){
  const r=partie(src,p,g);out.cas.push(r);save();console.log(phase,p,g,r.raison,r.tempsJeu,r.score,r.err);global.gc?.();
 }
 out.causes={};for(const r of out.cas)for(const m of r.morts)out.causes[m.cause]=(out.causes[m.cause]||0)+1;
 if(phase==='apres'){
  const avant=JSON.parse(fs.readFileSync(path.join(ICI,'parties-avant.json')));
  const champs=['tempsJeu','tempsCombat','pas','tempsSimule','vague','score','raison','fin','err','erreurs','console','morts','phases','vagues','armes'];
  out.ecarts=out.cas.flatMap((c,i)=>champs.filter(k=>JSON.stringify(c[k])!==JSON.stringify(avant.cas[i][k])).map(champ=>({pilote:c.pilote,graine:c.graine,champ,avant:avant.cas[i][champ],apres:c[champ]})));
  out.identiques=out.cas.length-new Set(out.ecarts.map(e=>e.pilote+e.graine)).size;
 }
 save();
}else if(mode==='camera'){
 out.cas=camera(src);save();
}else if(mode==='flashs'){
 for(const reduit of [false,true]){out.cas.push(charge(src,reduit));save();global.gc?.();}
}else if(mode==='r05'){
 const dir=path.join(ICI,'journaux-r05-'+phase);fs.mkdirSync(dir,{recursive:true});out.causes={};
 for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert'])for(let graine=1;graine<=10;graine++){
  const m=preparer(src,{graine});m.c.options={pilote,graine,jour:20261017,maxT:540,...(pilote==='humain'?{actions:'auto'}:{})};
  const r=JSON.parse(JSON.stringify(m.run('__MESURE.simulerPartie(options)'))),morts=(r.journal||[]).filter(e=>e.type==='mort').map(e=>e.d);
  const c={pilote,graine,ok:r.ok,raison:r.raison,fin:r.fin,morts,err:m.c.__ERR,console:m.erreurs};out.cas.push(c);
  for(const mort of morts)out.causes[mort.cause]=(out.causes[mort.cause]||0)+1;
  fs.writeFileSync(path.join(dir,pilote+'-'+graine+'.json.gz'),zlib.gzipSync(JSON.stringify(r)));save();console.log(phase,'R05',pilote,graine,morts.map(x=>x.cause));global.gc?.();
 }
 out.manquantes=['mur','ennemi','tir','laser','souffle','convoi','traine'].filter(c=>!out.causes[c]);save();
}else throw Error('Mode inconnu');
