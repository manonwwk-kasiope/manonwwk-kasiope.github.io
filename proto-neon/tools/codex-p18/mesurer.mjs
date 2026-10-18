import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {sources,instrument,ROOT,noms} from './vm.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url)), mode=process.argv[2]||'validation';
const save=(name,o)=>fs.writeFileSync(path.join(DIR,name),JSON.stringify(o,null,2)+'\n');
if(mode==='validation'){
 const ref=JSON.parse(fs.readFileSync(ROOT+'/tools/pilotes/sortie.json')).cas;
 const banc=instrument(sources('e1bdc6f'));
 const cas=[];
 for(const a of ref.filter(r=>r.graine===1||(r.graine===2&&['bon','expert'].includes(r.pilote)))){
  const r=banc.run(a.pilote,a.graine,{observer:false});
  const champs=['tempsJeu','tempsCombat','tempsSimule','vague','score'];
  cas.push({pilote:a.pilote,graine:a.graine,attendu:Object.fromEntries(champs.map(k=>[k,a[k]])),obtenu:Object.fromEntries(champs.map(k=>[k,r[k]])),ok:champs.every(k=>r[k]===a[k])&&r.fin&&!r.err&&!r.erreursConsole.length});
  console.log(JSON.stringify(cas.at(-1)));
 }
 save('validation-vm.json',{ref:'e1bdc6f',hash:banc.hash,cas,ok:cas.length>=10&&cas.every(c=>c.ok)});
 if(!cas.every(c=>c.ok))process.exitCode=1;
}else{
 if(!JSON.parse(fs.readFileSync(path.join(DIR,'validation-vm.json'))).ok)throw Error('VM non validée');
 let src=sources();
 if(mode==='avant')src=src.map(([f,s])=>[f,['77-score.js','02-regles.js'].includes(f)?fs.readFileSync(path.join(DIR,f.replace('.js','-avant.js')),'utf8'):s]);
 const hash=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
 // Observation des vraies écritures du score, sans changer les valeurs, le temps ou le RNG.
 src=src.map(([f,s])=>[f,f==='77-score.js'?s.replace('m.score += pts;',`m.score += pts;
 window.__points.push({pts:pts,t:O.T.t,mult:mult(),chaine:m.chaine,source:typeof source==='undefined'?null:source,evt:window.__evt||null,appel:new Error().stack.split('\\n').slice(2,5).join(' ')});`):s]);
 const init=`window.__points=[];window.__events=[];window.__evt=null;
 var _emit=N.ev.emit;N.ev.emit=function(type,c){var prev=window.__evt;window.__evt={type:type,c:c};
 if(['kill','mort','coupe','lasso','apogee'].indexOf(type)>=0)window.__events.push({type:type,c:JSON.parse(JSON.stringify(c)),t:N.outils.T.t});
 try{return _emit.apply(this,arguments);}finally{window.__evt=prev;}};`;
 // Partie commune inchangée ; ajout de la sonde avant le protocole et collecte après.
 src.push(['99-sonde-p18.js',init]);
 const banc=instrument(src);
 // Le retour du protocole reçoit les mesures via un petit ajout de source en mémoire.
 // N.score.resume n'est appelé qu'après fin par notre enveloppe et garde son retour réel.
 src.splice(src.length-1,0,['98-retour-p18.js',`var _dbg=N.game.dbg;var _dump=N.journal.dump;N.journal.dump=function(){var j=_dump.apply(this,arguments);j.push({type:'sonde-p18',points:window.__points,events:window.__events,resume:N.score.resume()});return j;};`]);
 const mesure=instrument(src), fichier=path.join(DIR,mode+'.json');
 const sortie=fs.existsSync(fichier)?JSON.parse(fs.readFileSync(fichier)):{hash,cas:[]};
 if(sortie.hash!==hash)throw Error('sources changées : reçus incompatibles');
 const liste=[...['bon','kamikaze','tourneur'].flatMap(p=>Array.from({length:50},(_,i)=>[p,i+1])),...noms.filter(p=>!['bon','kamikaze','tourneur'].includes(p)).flatMap(p=>Array.from({length:10},(_,i)=>[p,i+1]))];
 for(const [p,g]of liste){
  if(sortie.cas.some(r=>r.pilote===p&&r.graine===g))continue;
  const r=mesure.run(p,g,{observer:false}),sonde=r.journal.find(e=>e.type==='sonde-p18');
  const {journal,trace,...court}=r;const nom=`${mode}-${p}-${g}.json.gz`;
  fs.writeFileSync(path.join(DIR,nom),zlib.gzipSync(JSON.stringify(r)));
  sortie.cas.push({...court,points:sonde.points,events:sonde.events,resume:sonde.resume,recu:nom});
  save(mode+'.json',sortie);console.log(mode,p,g,r.tempsJeu,r.vague,r.score,r.err);
 }
}
