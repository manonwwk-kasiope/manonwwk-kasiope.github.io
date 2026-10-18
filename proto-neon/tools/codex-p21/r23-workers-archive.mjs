import fs from 'node:fs';import vm from 'node:vm';import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {sources,chargerAvant,compiler,monde,sauver,hash,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {partiePouce} from './partie-r23.mjs';
// Deux VM de logique au maximum, sans Chromium ni modèle local. Chaque partie garde un contexte vierge.
if(!isMainThread){
 const script=compiler(workerData.src);
 parentPort.on('message',job=>{try{const m=monde(script,job.graine);m.c.opts=job;let r=vm.runInContext('('+partiePouce.toString()+')(opts)',m.c);
 const journal=JSON.parse(JSON.stringify(r.journal));delete r.journal;parentPort.postMessage({...r,journalSha256:hash(journal),erreursConsole:m.erreurs});
 }catch(e){parentPort.postMessage({graine:job.graine,variante:job.variante,exception:String(e.stack)});}});
}else{
 const phase=process.argv.includes('--avant')?'avant':'apres',raccord=process.argv.includes('--raccord'),pouce=!process.argv.includes('--sans-pouce');
 let src=phase==='avant'?chargerAvant():sources();if(raccord)src=avecRaccord(src);
 const protocoleSha256=hash(partiePouce.toString());
 const cas=[],limit=Number(process.argv.find(a=>a.startsWith('--n='))?.split('=')[1]||50),out=`r23-${phase}${raccord?'-raccord':''}${pouce?'-pouce':'-sans-pouce'}.json`;
 const file=new URL(out,import.meta.url);let cached=[];
 if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file));if(old.sourceSha256===hash(src)&&old.pouce===pouce&&old.protocoleSha256===protocoleSha256)cached=old.cas;}
 const jobs=[];for(const variante of ['diriger','auto'])for(let graine=1;graine<=limit;graine++){
  const previous=cached.find(r=>r.variante===variante&&r.graine===graine);if(previous&&!previous.exception)cas.push(previous);else jobs.push({variante,graine,pouce});}
 const save=()=>sauver(out,{dateParis:dateParis(),sourceSha256:hash(src),protocoleSha256,pouce,calcul:'2 workers VM maximum, contextes vierges, aucun navigateur',cas:cas.toSorted((a,b)=>a.variante.localeCompare(b.variante)||a.graine-b.graine)});
 const parallele=Math.max(1,Math.min(2,Number(process.argv.find(a=>a.startsWith('--workers='))?.split('=')[1]||2)));
 let curseur=0;await Promise.all(Array.from({length:Math.min(parallele,jobs.length)},()=>new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{workerData:{src}});
  const next=()=>{if(curseur<jobs.length)worker.postMessage(jobs[curseur++]);else worker.terminate().then(resolve,reject);};
  worker.on('message',r=>{cas.push(r);save();if(cas.length%10===0)console.log(phase,raccord?'raccord':'sources',cas.length,JSON.stringify(['diriger','auto'].map(v=>[v,cas.filter(c=>c.variante===v&&c.victoire).length,cas.filter(c=>c.variante===v).length])));next();});worker.on('error',reject);next();
 })));save();if(cas.some(c=>c.exception||c.err||c.erreursConsole.length||!c.fin))process.exitCode=1;
}
