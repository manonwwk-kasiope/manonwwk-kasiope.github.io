/* Handshake avec la file Chef : une course fait rendre notre témoin, puis réattendre. */
import fs from'node:fs';import{spawnSync}from'node:child_process';
export async function obtenirCreneau({f=fs,chef='/tmp/snake-chromium-chef.lock',temoin='/tmp/snake-chromium-boite',pid=process.pid,headless=()=>!!spawnSync('pgrep',['-f','[/]headless_shell( |$)'],{encoding:'utf8'}).stdout.trim(),attendre=()=>new Promise(ok=>setTimeout(ok,1000)),conflit=()=>{}}={}){
 const propre=()=>{try{return f.readFileSync(temoin,'utf8').trim()===String(pid)}catch{return false}},liberer=()=>{if(propre())f.unlinkSync(temoin)};
 for(;;){
  while(f.existsSync(chef)||f.existsSync(temoin)||headless())await attendre();
  try{f.writeFileSync(temoin,String(pid)+'\n',{flag:'wx'})}catch(e){if(e.code==='EEXIST'){await attendre();continue}throw e}
  if(f.existsSync(chef)||headless()){liberer();conflit();await attendre();continue}
  return{liberer};
 }
}
