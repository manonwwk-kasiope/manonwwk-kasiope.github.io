import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {sources,monde,jouer,ROOT} from './vm.mjs';
const dir=ROOT+'/tools/codex-p12/';
const mode=process.argv[2]||'validation';
if(mode==='validation') {
 const src=sources('e1bdc6f'), ref=JSON.parse(fs.readFileSync(ROOT+'/tools/pilotes/sortie.json')).cas;
 const cas=[];
 // Dix graines historiques, protocole exact et initialisation équivalente au boot sans DOM.
 for(const p of ['inerte'])for(let g=1;g<=10;g++) {
  const r=jouer(monde(src,new Map(),[844,390],g),p,g), ancien=ref.find(x=>x.pilote===p&&x.graine===g);
  const champs=['tempsJeu','tempsCombat','vague','score'];
  console.log('validation',p,g,r.tempsJeu,r.score);
  cas.push({pilote:p,graine:g,attendu:Object.fromEntries(champs.map(k=>[k,ancien[k]])),obtenu:Object.fromEntries(champs.map(k=>[k,r[k]])),identique:champs.every(k=>r[k]===ancien[k])&&r.err===0&&r.raison==='fin',err:r.err});
 }
 fs.writeFileSync(dir+'validation-vm.json',JSON.stringify({ref:'e1bdc6f',cas},null,2));assert.equal(cas.filter(x=>x.identique).length,10);console.log('VM validée : 10/10 identiques.');
} else {
 const src=sources(mode==='avant'?'2c1546a699f19444008a1793dd3c9ebc86dd4338':undefined),cas=[];
 const metadata={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourceSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),seuils:monde(src).N.R.defis.retour?.seuils||monde(src).N.R.deblocages.map(d=>d.seuil)};
 if(process.argv.includes('--reprendre')&&fs.existsSync(dir+mode+'-80.json')) { const ancien=JSON.parse(fs.readFileSync(dir+mode+'-80.json'));assert.equal(ancien.sourceSha256,metadata.sourceSha256,'reprise : même source obligatoire');cas.push(...ancien.cas);metadata.reprise=cas.length; }
 if(mode==='suite') { const w=monde(src),suite=[];for(let g=1;g<=25;g++){const r=jouer(w,'bon',g);suite.push(r);fs.writeFileSync(dir+'apres-25.json',JSON.stringify({...metadata,cas:suite,stockage:Object.fromEntries(w.stockage)},null,2));console.log('apres suite',g,r.energie,r.resume?.debloques);}process.exit(0); }
 for(const p of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let g=1;g<=10;g++){
  if(cas.some(r=>r.pilote===p&&r.graine===g))continue;
  const r=jouer(monde(src,new Map(),[844,390],g),p,g);cas.push(r);fs.writeFileSync(dir+mode+'-80.json',JSON.stringify({...metadata,cas},null,2));console.log(mode,p,g,r.tempsJeu,r.vague,r.score,r.err);
 }
 fs.writeFileSync(dir+mode+'-80.json',JSON.stringify({...metadata,cas},null,2));
 const w=monde(src),suite=[];
 for(let g=1;g<=25;g++){const r=jouer(w,'bon',g);suite.push(r);console.log(mode,'suite',g,r.energie,r.resume?.debloques);}
 fs.writeFileSync(dir+mode+'-25.json',JSON.stringify({...metadata,cas:suite,stockage:Object.fromEntries(w.stockage)},null,2));
}
