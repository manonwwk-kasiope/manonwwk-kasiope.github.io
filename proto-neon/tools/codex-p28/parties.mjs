import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {sources,monde,jouer} from './vm.mjs';
const mode=process.argv[2]||'calibration';
const src=sources(mode==='calibration'?'e1bdc6f':undefined);
if(mode==='avant')for(const [name]of src)if(fs.existsSync(new URL('avant/'+name,import.meta.url)))src.find(([n])=>n===name)[1]=fs.readFileSync(new URL('avant/'+name,import.meta.url),'utf8');

const refs=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas;
const out={mode,dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),sourcesSha256:crypto.createHash('sha256').update(JSON.stringify(src)).digest('hex'),cas:[]};
for(const pilote of mode==='calibration'?['inerte']:['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
 const w=monde(src),r=jouer(w,pilote,graine),c={pilote,graine,raison:r.raison,tempsJeu:r.tempsJeu,tempsCombat:r.tempsCombat,vague:r.vague,score:r.score,err:r.err,erreurs:r.erreurs,journalSha256:crypto.createHash('sha256').update(JSON.stringify(w.N.journal.dump())).digest('hex')};
 if(mode==='calibration'){const ref=refs.find(x=>x.pilote===pilote&&x.graine===graine);c.attendu=[ref.tempsJeu,ref.tempsCombat,ref.vague,ref.score];c.identique=JSON.stringify(c.attendu)===JSON.stringify([c.tempsJeu,c.tempsCombat,c.vague,c.score]);}
 out.cas.push(c);fs.writeFileSync(new URL(mode+'.json',import.meta.url),JSON.stringify(out,null,2));console.log(mode,pilote,graine,c.tempsJeu,c.vague,c.score);
 assert.equal(c.err,0);assert.equal(c.raison,'fin');if(mode==='calibration')assert.ok(c.identique);
}
if(mode==='apres'){const avant=JSON.parse(fs.readFileSync(new URL('avant.json',import.meta.url)));const comparaisons=out.cas.map((c,i)=>({pilote:c.pilote,graine:c.graine,identique:JSON.stringify(c)===JSON.stringify(avant.cas[i])}));fs.writeFileSync(new URL('comparaison.json',import.meta.url),JSON.stringify({total:comparaisons.length,identiques:comparaisons.filter(c=>c.identique).length,cas:comparaisons},null,2));assert.ok(comparaisons.every(c=>c.identique));}
