/* Instruments officiels figés ; un seul créneau Chromium pour la paire. */
import fs from'node:fs';import path from'node:path';import http from'node:http';import zlib from'node:zlib';import{spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
import{Banc,options,mesurerCritere}from'./mesure/commun.mjs';import *as R12 from'./mesure/criteres/R-12-explosion.mjs';import *as R13 from'./mesure/criteres/R-13-photosensibilite.mjs';
const H=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(H,'../../..'),T='/tmp/snake-chromium-boite',CHEF='/tmp/snake-chromium-chef.lock',r={pid:process.pid,dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),phase:'attente',resultats:[],erreursSessions:[],attenteRemplacee:{pid:60405,raison:'fermeture par critère et capture console corrigées avant toute mesure ; PID terminé, aucun Chromium ouvert'}},save=()=>fs.writeFileSync(path.join(H,'criteres-execution.json'),JSON.stringify(r,null,2)+'\n');let b,server;save();
try{
 while(fs.existsSync(CHEF)||fs.existsSync(T)||spawnSync('pgrep',['-f','[/]headless_shell( |$)'],{encoding:'utf8'}).stdout.trim())await new Promise(ok=>setTimeout(ok,1000));
 fs.writeFileSync(T,String(process.pid)+'\n',{flag:'wx'});if(fs.existsSync(CHEF))throw Error('Créneau Chef concurrent au moment de réserver');
 const html=Object.fromEntries(['avant','apres'].map(p=>[p,zlib.gunzipSync(fs.readFileSync(path.join(H,p+'.html.gz')))]));
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');if(u.pathname==='/proto-neon/index.html'){res.setHeader('Content-Type','text/html');return res.end(html[u.searchParams.get('phase')||'avant'])}const p=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname).replace(/^\/proto-neon/,''));if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.statusCode=404;return res.end()}res.setHeader('Content-Type',p.endsWith('.png')?'image/png':p.endsWith('.mp4')?'video/mp4':p.endsWith('.json')?'application/json':'application/octet-stream');fs.createReadStream(p).pipe(res)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 for(const phase of['avant','apres']){
  r.phase=phase;save();b=new Banc({...options(['--sortie',path.join(H,'criteres-'+phase)]),url:`http://127.0.0.1:${server.address().port}/proto-neon/index.html?phase=${phase}`});await b.demarrer();
  for(const [mod,profils]of[[R12,['paysage','portrait','bureau']],[R13,['paysage','portrait','bureau','paysage-reduit']]])for(const p of profils){
   const profil=p.replace('-reduit',''),reduit=p.endsWith('-reduit');r.critere=mod.meta.id+'-'+p;save();
   const m={meta:{...mod.meta,id:r.critere},mesurer:async(banc,res)=>{const ouvrir=banc.ouvrir.bind(banc);banc.ouvrir=async(_profil,o)=>{const session=await ouvrir(profil,{...o,reducedMotion:reduit?'reduce':'no-preference'}),fermer=session.fermer.bind(session);session.fermer=async()=>{const erreurs=await session.bilanErreurs();r.erreursSessions.push({phase,critere:mod.meta.id+'-'+p,erreurs});save();return fermer()};return session};try{return await mod.mesurer(banc,res,{profil})}finally{banc.ouvrir=ouvrir}}};
   const q=await mesurerCritere(b,m);r.resultats.push({phase,id:q.id,statut:q.statut,resume:q.resume});save();
  }
  await b.fermer();b=null;
 }
 r.phase='fini';r.dateFinParis=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});save();if(r.resultats.some(x=>x.phase==='apres'&&x.statut!=='ok'))process.exitCode=1;
}catch(e){r.phase='arrêt';r.erreur=String(e.stack||e);process.exitCode=1;save()}finally{if(b)await b.fermer();if(server)await new Promise(ok=>server.close(ok));if(fs.existsSync(T)&&fs.readFileSync(T,'utf8').trim()===String(process.pid))fs.unlinkSync(T);save()}
