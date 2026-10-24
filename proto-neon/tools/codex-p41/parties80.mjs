import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {ICI,compiler,jouer,hash,dateParis} from './vm.mjs';
const lire=f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,f))));
const save=(f,x)=>fs.writeFileSync(path.join(ICI,f),JSON.stringify(x,null,2)+'\n');
assert(JSON.parse(fs.readFileSync(path.join(ICI,'calibration.json'))).conforme);
const sources={avant:lire('sources-avant.json.gz'),apres:lire('sources-apres.json.gz')},scripts=Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,compiler(s)])),sha=Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,hash(s)]));
const protocole=hash(fs.readFileSync(new URL('./vm.mjs',import.meta.url),'utf8')),cas=[],debut=Date.now();
fs.mkdirSync(path.join(ICI,'parties'),{recursive:true});
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
 const paire={pilote,graine};let brut={};
 for(const version of ['avant','apres']){
  const fichier=`parties/${sha[version].slice(0,16)}-${protocole.slice(0,12)}-${pilote}-${graine}.json.gz`;
  const r=fs.existsSync(path.join(ICI,fichier))?lire(fichier):jouer(scripts[version],pilote,graine);
  if(!fs.existsSync(path.join(ICI,fichier)))fs.writeFileSync(path.join(ICI,fichier),zlib.gzipSync(JSON.stringify(r)));
  brut[version]=r;const {journal,echantillons,...resume}=r;paire[version]={...resume,journalSha256:hash(journal),echantillonsSha256:hash(echantillons),fichier};
 }
 paire.identique=hash(brut.avant)===hash(brut.apres);paire.saines=Object.values(brut).every(r=>r.etat==='fin'&&!r.err&&!r.erreursConsole.length);
 cas.push(paire);save('parties80.json',{dateParis:dateParis(),sources:sha,protocole,calculMs:Date.now()-debut,complete:cas.length===80,identiques:cas.filter(c=>c.identique).length,saines:cas.every(c=>c.saines),cas});
 console.log(JSON.stringify({pilote,graine,identique:paire.identique,saines:paire.saines,t:paire.apres.tempsJeu,vague:paire.apres.vague,score:paire.apres.score}));
 if(!paire.identique||!paire.saines)process.exitCode=1;
 brut=null;if(global.gc)global.gc();
}
