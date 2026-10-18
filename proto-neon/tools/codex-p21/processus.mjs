import fs from 'node:fs';import zlib from 'node:zlib';import path from 'node:path';import {spawn} from 'node:child_process';import {ICI,hash} from './vm.mjs';
export function figer(src){const f=path.join(ICI,'sources-'+hash(src)+'.json.gz');if(!fs.existsSync(f))fs.writeFileSync(f,zlib.gzipSync(JSON.stringify(src)));return f;}
export function lancer(sources,methode,opts){return new Promise((resolve,reject)=>{
 const p=spawn(process.execPath,[path.join(ICI,'processus-partie.mjs')],{stdio:['pipe','pipe','pipe']}),out=[],err=[];
 p.stdout.on('data',b=>out.push(b));p.stderr.on('data',b=>err.push(b));p.on('error',reject);
 p.on('close',(code,signal)=>{if(code!==0){reject(Error(JSON.stringify({code,signal,opts,stderr:Buffer.concat(err).toString()})));return;}
 try{resolve(JSON.parse(Buffer.concat(out).toString()));}catch(e){reject(e);}});
 p.stdin.end(JSON.stringify({sources,methode,opts}));
});}
export async function file(jobs,concurrence,faire,recu){let k=0;await Promise.all(Array.from({length:Math.min(concurrence,jobs.length)},async()=>{while(k<jobs.length){const j=jobs[k++];let r;try{r=await faire(j);}catch(e){r={...j,exception:String(e.stack||e)};}await recu(r);}}));}
