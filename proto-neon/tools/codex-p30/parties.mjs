import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {sources,partie,ICI} from './vm.mjs';
const v=JSON.parse(fs.readFileSync(path.join(ICI,'validation-vm.json')));if(v.identiques<10||v.vmSha256!==crypto.createHash('sha256').update(fs.readFileSync(path.join(ICI,'vm.mjs'))).digest('hex'))throw Error('VM non validée');
const mode=process.argv[2]||'avant';let src=sources().map(([f,s])=>[f,mode==='avant'&&fs.existsSync(path.join(ICI,'avant',f))?fs.readFileSync(path.join(ICI,'avant',f),'utf8'):s]);
// La qualification après comprend le correctif de sprite, appliqué seulement dans cette VM.
if(mode==='apres')src=src.map(([f,s])=>[f,f==='40-sprites.js'?s.replace('d[j - 1] && d[j + 1] && d[j - w] && d[j + w]) continue;','d[j - 1] && d[j + 1] && d[j - w] && d[j + w]) { o.data[j] = NP; continue; }'):s]);
const o={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),mode,sourceSha256:crypto.createHash('sha256').update(src.map(([f,s])=>f+'\n'+s).join('\n')).digest('hex'),cas:[]};
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu']){
  for(let graine=1;graine<=10;graine++){o.cas.push(partie(src,pilote,graine));fs.writeFileSync(path.join(ICI,mode+'-parties.json'),JSON.stringify(o,null,2)+'\n');}
  console.log(mode,pilote,o.cas.length,'fins',o.cas.filter(c=>c.fin).length,'err',o.cas.filter(c=>c.err||c.console.length).length);
}
