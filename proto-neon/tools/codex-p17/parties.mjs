import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {sources,monde,jouer} from './vm-liaisons.mjs';
const calibration=JSON.parse(fs.readFileSync(new URL('calibration-liaisons.json',import.meta.url)));
assert.ok(calibration.cas.length>=10&&calibration.cas.every(c=>c.identique&&c.err===0));
const phase=process.argv[2]||'apres',src=sources();
if(phase==='apres'&&process.argv.includes('--recu-parties'))src.find(([f])=>f==='80-ecrans.js')[1]=fs.readFileSync(new URL('candidat-parties-80-ecrans.js',import.meta.url),'utf8');
if(phase==='avant')src.find(([f])=>f==='80-ecrans.js')[1]=fs.readFileSync(new URL('avant/80-ecrans.js',import.meta.url),'utf8');
const fichier=new URL(phase+'.json',import.meta.url);
const precedent=fs.existsSync(fichier)?JSON.parse(fs.readFileSync(fichier)):null;
const empreinte=crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex');
if(precedent)assert.equal(precedent.sourcesSha256,empreinte,'sources de reprise identiques');
const cas=precedent?.cas||[];
const instruments=precedent?.instruments||[{nom:'vm.mjs',debut:1,fin:cas.length}];
instruments.push({nom:'vm-liaisons.mjs',debut:cas.length+1,fin:Math.min(80,cas.length+10)});
const out={phase,instruments,dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas};
let nouveaux=0;
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
 if(cas.some(c=>c.pilote===pilote&&c.graine===graine))continue;
 if(nouveaux>=10)break;
 const w=monde(src),r=jouer(w,pilote,graine);
 const c={pilote,graine,raison:r.raison,tempsJeu:r.tempsJeu,tempsCombat:r.tempsCombat,vague:r.vague,score:r.score,err:r.err,erreurs:r.erreurs,journalSha256:crypto.createHash('sha256').update(JSON.stringify(w.N.journal.dump())).digest('hex')};
 nouveaux++;cas.push(c);fs.writeFileSync(new URL(phase+'.json',import.meta.url),JSON.stringify(out,null,2));console.log(pilote,graine,c.tempsJeu,c.vague,c.score);
}
if(cas.length<80)process.exit(0);
assert.ok(cas.every(c=>c.raison==='fin'&&c.err===0&&!c.erreurs.length));
if(phase==='apres'){
 const avant=JSON.parse(fs.readFileSync(new URL('avant.json',import.meta.url)));
 if(avant.cas.length<80){console.log('Comparaison différée : témoin avant incomplet');process.exit(0);}
 const comparaison=cas.map((c,i)=>({pilote:c.pilote,graine:c.graine,identique:JSON.stringify(c)===JSON.stringify(avant.cas[i])}));
 fs.writeFileSync(new URL('comparaison.json',import.meta.url),JSON.stringify({total:cas.length,identiques:comparaison.filter(c=>c.identique).length,comparaison},null,2));assert.ok(comparaison.every(c=>c.identique));
}
