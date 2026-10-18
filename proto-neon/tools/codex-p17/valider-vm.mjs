import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sources,monde,jouer} from './vm.mjs';
const refs=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas;
const src=sources('e1bdc6f');
const cas=[];
for(const ref of refs.filter(r=>r.graine===1||r.pilote==='inerte'&&r.graine<=3)){
 const r=jouer(monde(src),ref.pilote,ref.graine);
 const attendu=[ref.tempsJeu,ref.tempsCombat,ref.vague,ref.score],obtenu=[r.tempsJeu,r.tempsCombat,r.vague,r.score];
 cas.push({pilote:r.pilote,graine:r.graine,attendu,obtenu,identique:JSON.stringify(attendu)===JSON.stringify(obtenu),err:r.err});
 console.log(cas.at(-1));
}
fs.writeFileSync(new URL('calibration.json',import.meta.url),JSON.stringify({reference:'e1bdc6f',cas},null,2));
assert.ok(cas.length>=10&&cas.every(c=>c.identique&&c.err===0));
