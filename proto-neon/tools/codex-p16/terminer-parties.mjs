// Reprise des derniers cas, deux workers Node isolés, aucun navigateur ni nouvel agent IA.
// Même VM validée et même protocole ; seuls les reçus FINIS avec le bon hash sont réutilisés.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {sources,monde,partie} from './vm.mjs';
const here=new URL('./',import.meta.url),sha=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
const noms=['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'];
if(!isMainThread) {
  const {src,pilote,graine}=workerData,m=monde(src),r=partie(m,pilote,graine);
  r.tempsCombat=m.N.game.dbg().t;r.journalSha256=sha(m.N.journal.dump());r.erreursConsole=m.erreurs;
  parentPort.postMessage(r);
} else {
  if(!JSON.parse(fs.readFileSync(new URL('calibration.json',here))).valide)throw Error('VM non calibrée');
  const src=sources(),f=new URL('parties-apres.json',here),out=JSON.parse(fs.readFileSync(f));
  if(out.sourcesSha256!==sha(src))throw Error('Sources changées : ne pas réutiliser les reçus');
  const cas=new Map(out.cas.map(r=>[r.pilote+':'+r.graine,r]));
  const taches=[];for(const pilote of noms)for(let graine=1;graine<=10;graine++)if(cas.get(pilote+':'+graine)?.raison!=='fin')taches.push({pilote,graine});
  const save=()=>{
    out.cas=[...cas.values()].sort((a,b)=>noms.indexOf(a.pilote)-noms.indexOf(b.pilote)||a.graine-b.graine);
    out.dateParisMiseAJour=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
    out.reprise={workers:2,protocole:'vm.mjs partie(), mêmes entrées et tranches officielles de 0,25 s'};
    const tmp=new URL('parties-apres.tmp',here);fs.writeFileSync(tmp,JSON.stringify(out,null,2)+'\n');fs.renameSync(tmp,f);
  };
  async function executer(t) {
    return new Promise((ok,ko)=>{
      const w=new Worker(new URL(import.meta.url),{workerData:{src,...t}});
      let r;w.on('message',v=>{r=v;});w.on('error',ko);w.on('exit',code=>{if(code||!r)ko(Error('Worker '+JSON.stringify(t)+' sortie '+code));else ok(r);});
    });
  }
  await Promise.all([0,1].map(async()=>{while(taches.length){const t=taches.shift(),r=await executer(t);cas.set(r.pilote+':'+r.graine,r);save();console.log(r.pilote,r.graine,r.raison,r.tempsJeu,r.score,r.err);}}));
  save();
  const avant=JSON.parse(fs.readFileSync(new URL('parties-avant.json',here)));
  const comparaisons=out.cas.map(r=>{const a=avant.cas.find(a=>a.pilote===r.pilote&&a.graine===r.graine);return {pilote:r.pilote,graine:r.graine,identique:r.raison==='fin'&&!!a&&JSON.stringify(a)===JSON.stringify(r),raison:r.raison};});
  const preuve={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),total:comparaisons.length,identiques:comparaisons.filter(r=>r.identique).length,cas:comparaisons};
  fs.writeFileSync(new URL('comparaison80.json',here),JSON.stringify(preuve,null,2)+'\n');
  if(preuve.total!==80||preuve.identiques!==80)process.exitCode=1;
  console.log(preuve.total,preuve.identiques);
}
