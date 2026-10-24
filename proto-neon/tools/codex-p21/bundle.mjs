import fs from 'node:fs';import {ROOT,sources} from './vm.mjs';
export function bundleDepuis(src){
 let html=fs.readFileSync(ROOT+'/index.html','utf8');
 for(const [nom,avant]of sources()){
  const apres=src.find(([n])=>n===nom)?.[1];if(apres===undefined)throw Error('Module absent : '+nom);
  if(!html.includes(avant))throw Error('index.html périmé pour '+nom+' : reconstruire avant la mesure');
  if(apres!==avant)html=html.replace(avant,()=>apres);
 }
 return html;
}
