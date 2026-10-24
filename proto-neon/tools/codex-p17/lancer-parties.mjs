import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const phase=process.argv[2]||'apres';
let nombre=0;
while(nombre<80){
 const r=spawnSync(process.execPath,[new URL('./parties.mjs',import.meta.url).pathname,phase],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status||1);
 const suite=JSON.parse(fs.readFileSync(new URL(phase+'.json',import.meta.url)));
 if(suite.cas.length<=nombre)throw new Error('absence de progression de la vérification');
 nombre=suite.cas.length;
}
