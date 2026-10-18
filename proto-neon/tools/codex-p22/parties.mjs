import fs from 'node:fs';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {instrument,sources,noms,ICI} from './vm.mjs';import {raccorder} from './raccords.mjs';
const phase=process.argv[2]||'avant';
let src=sources();
if(phase==='avant')src=src.map(([n,s])=>[n,['02-regles.js','17-vol.js','73-arene.js'].includes(n)?fs.readFileSync(`${ICI}/${n.replace('.js','-avant.js')}`,'utf8'):s]);
if(phase==='raccords')src=raccorder(src);
if(process.argv[3]==='--worker') {
 const pilote=process.argv[4],graine=+process.argv[5],banc=instrument(src),r=banc.run(pilote,graine,{observer:false});
 fs.writeFileSync(`${ICI}/${phase}-${pilote}-${graine}.json.gz`,zlib.gzipSync(JSON.stringify(r)));
} else {
 const hash=instrument(src).hash, cas=[];
 for(const pilote of noms)for(let graine=1;graine<=10;graine++) {
  const file=`${ICI}/${phase}-${pilote}-${graine}.json.gz`;
  if(!fs.existsSync(file))execFileSync(process.execPath,['--max-old-space-size=512',fileURLToPath(import.meta.url),phase,'--worker',pilote,''+graine],{stdio:'inherit'});
  const r=JSON.parse(zlib.gunzipSync(fs.readFileSync(file))),{journal,trace,...resume}=r;
  cas.push({...resume,journalSha256:crypto.createHash('sha256').update(JSON.stringify(journal)).digest('hex')});
  fs.writeFileSync(`${ICI}/parties-${phase}.json`,JSON.stringify({hash,cas},null,2)+'\n');
  console.log(JSON.stringify({phase,pilote,graine,t:r.tempsJeu,vague:r.vague,score:r.score,err:r.err}));
 }
}
