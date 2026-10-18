import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
import {ICI,ROOT,hash,sources} from './vm.mjs';import {raccorder} from './raccords.mjs';
export function bundles(){
 const recu=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,'sources-avant.json.gz'))));
 if(hash(sources())!==hash(recu))throw Error('Sources reçues modifiées : rebaser les raccords, ne pas employer les reçus périmés');
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 for(const [f,s]of recu)if(!html.includes(s))throw Error('Bundle non synchronisé : '+f);
 const variants={avant:recu,apres:raccorder(recu),p38:raccorder(recu,'p38'),'p38-p41':raccorder(raccorder(recu,'p38'))};
 const result={};
 for(const [nom,src]of Object.entries(variants)){
  let h=html;
  for(let i=0;i<src.length;i++)if(src[i][1]!==recu[i][1]){if(h.split(recu[i][1]).length!==2)throw Error('Module ambigu : '+src[i][0]);h=h.replace(recu[i][1],()=>src[i][1]);}
  const fin='boot();})();';if(h.split(fin).length!==2)throw Error('Fin du bundle absente/ambiguë');
  result[nom]=h.replace(fin,'window.__P41Image=frame; boot();})();');
 }
 return result;
}
if(process.argv.includes('--preparer')){
 const out=bundles(),manifest={};for(const [nom,html]of Object.entries(out)){
  fs.writeFileSync(path.join(ICI,'bundle-'+nom+'.html'),html);manifest[nom]=hash(html);
 }
 fs.writeFileSync(path.join(ICI,'bundles.json'),JSON.stringify(manifest,null,2)+'\n');console.log(manifest);
}
