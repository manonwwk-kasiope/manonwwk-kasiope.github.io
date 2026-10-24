import fs from 'node:fs';import vm from 'node:vm';import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {sources,compiler,monde,partie,sauver,hash,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';
if(!isMainThread){
 const script=compiler(workerData.src);
 parentPort.on('message',job=>{try{const m=monde(script,job.graine);m.c.opts=job;let r=vm.runInContext('('+partie.toString()+')(opts)',m.c);
 const journal=JSON.parse(JSON.stringify(r.journal));delete r.journal;delete r.echantillons;
 parentPort.postMessage({...r,journalSha256:hash(journal),erreursConsole:m.erreurs});
 }catch(e){parentPort.postMessage({...job,exception:String(e.stack)});}});
}else{
 const ref=JSON.parse(fs.readFileSync(new URL('./pilotes-avant.json',import.meta.url))),src=avecRaccord(sources()),cas=[],jobs=[];
 const file=new URL('./conservation-finale.json',import.meta.url);let cache=[];
 if(fs.existsSync(file)){const r=JSON.parse(fs.readFileSync(file));if(r.sourceSha256===hash(src)&&r.protocoleSha256===hash(partie.toString()))cache=r.cas;}
 for(const a of ref.cas){const r=cache.find(c=>c.pilote===a.pilote&&c.graine===a.graine);if(r&&!r.exception)cas.push(r);else jobs.push({pilote:a.pilote,graine:a.graine});}
 const champs=['raison','etat','tempsJeu','tempsCombat','tempsSimule','pas','score','vague','morts','cartes','journalSha256','err','erreurs','erreursConsole'];
 const bilan=()=>{const rows=cas.toSorted((a,b)=>a.pilote.localeCompare(b.pilote)||a.graine-b.graine).map(r=>{const a=ref.cas.find(a=>a.pilote===r.pilote&&a.graine===r.graine);
 const ecarts=champs.filter(k=>JSON.stringify(r[k])!==JSON.stringify(a[k]));return {...r,ecarts,identique:!r.exception&&!ecarts.length};});
 return {dateParis:dateParis(),sourceAvantSha256:ref.sourceSha256,protocoleSha256:hash(partie.toString()),sourceSha256:hash(src),patchSha256:hash(fs.readFileSync(new URL('./raccord-70-joueuse.patch',import.meta.url))),calcul:'1 ou 2 workers VM selon --workers, chacun une partie vierge',conforme:rows.length===80&&rows.every(c=>c.identique&&c.raison==='fin'&&!c.err&&!c.erreursConsole.length),cas:rows};};
 const parallele=Math.max(1,Math.min(2,Number(process.argv.find(a=>a.startsWith('--workers='))?.split('=')[1]||2)));
 let curseur=0;await Promise.all(Array.from({length:Math.min(parallele,jobs.length)},()=>new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{src}});
 const next=()=>{if(curseur<jobs.length)worker.postMessage(jobs[curseur++]);else worker.terminate().then(resolve,reject);};
 worker.on('message',r=>{cas.push(r);sauver('conservation-finale.json',bilan());if(cas.length%10===0)console.log(cas.length+'/80',bilan().cas.filter(r=>!r.identique).length,'écarts');next();});worker.on('error',reject);next();})));
 const r=bilan();sauver('conservation-finale.json',r);if(!r.conforme)process.exitCode=1;
}
