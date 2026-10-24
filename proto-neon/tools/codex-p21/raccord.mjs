import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
// Le fichier réservé reste intact ; le patch est essayé sur une copie temporaire des sources.
export function avecRaccord(src){
 const patch=new URL('./raccord-70-joueuse.patch',import.meta.url).pathname;
 const ajouts=fs.readFileSync(patch,'utf8').split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')).map(l=>l.slice(1)).join('\n');
 if(src.find(([n])=>n==='70-joueuse.js')[1].includes(ajouts))return src; // raccord déjà intégré par son propriétaire
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'snake-p21-'));
 try{fs.mkdirSync(path.join(dir,'proto-neon/src'),{recursive:true});const f=path.join(dir,'proto-neon/src/70-joueuse.js');
 fs.writeFileSync(f,src.find(([n])=>n==='70-joueuse.js')[1]);
 execFileSync('patch',['-f','-p1','-i',patch],{cwd:dir});
 return src.map(([n,s])=>[n,n==='70-joueuse.js'?fs.readFileSync(f,'utf8'):s]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
