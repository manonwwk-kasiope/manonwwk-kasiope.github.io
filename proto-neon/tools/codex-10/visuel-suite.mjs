/* Complément manquant : rendu natif du quartierCIEL, sans rejouer les parcours validés.
   Prend le relais de notre file au témoin commun, puis le libère. */
import fs from 'node:fs';import path from 'node:path';import {spawn,spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
const H=path.dirname(fileURLToPath(import.meta.url)),T='/tmp/snake-chromium-boite',parent=93562;
if(fs.existsSync(T)&&fs.readFileSync(T,'utf8').trim()!==String(parent))throw Error('Témoin détenu par une autre file');fs.writeFileSync(T,String(process.pid)+'\n');
const r={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),phase:'attente fin de la file80',parentPid:parent,proprietairePid:process.pid};const save=()=>fs.writeFileSync(path.join(H,'visuel-execution.json'),JSON.stringify(r,null,2)+'\n');save();
const live=pid=>{try{process.kill(pid,0);return true}catch(e){if(e.code==='ESRCH')return false;throw e}};
try{while(live(parent))await new Promise(ok=>setTimeout(ok,1000));
 const debut=Date.now();while(spawnSync('pgrep',['-f','[/]headless_shell( |$)'],{encoding:'utf8'}).stdout.trim()){if(Date.now()-debut>10*60*1000)throw Error('Créneau non libre pour le complément visuel');await new Promise(ok=>setTimeout(ok,1000))}
 r.phase='visuel';save();const fd=fs.openSync(path.join(H,'visuel.log'),'w');r.code=await new Promise((ok,ko)=>{const p=spawn(process.execPath,[path.join(H,'banc.mjs'),'--mode','visuel','--bundle','/tmp/snake-codex10-apres.html','--outdir',path.join(H,'visuel')],{stdio:['ignore',fd,fd]});p.on('error',ko);p.on('exit',ok)});fs.closeSync(fd);r.phase='fini';save();if(r.code)process.exitCode=1;console.log('complément visuel code',r.code)
}catch(e){r.phase='arrêt';r.erreur=String(e);save();process.exitCode=1;console.log(r.erreur)}finally{if(fs.existsSync(T)&&fs.readFileSync(T,'utf8').trim()===String(process.pid))fs.unlinkSync(T)}
