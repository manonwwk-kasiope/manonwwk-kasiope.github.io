import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sources,compiler,jouer,sauver,dateParis} from './vm.mjs';
const refs=JSON.parse(fs.readFileSync(new URL('../pilotes/sortie.json',import.meta.url))).cas.slice(0,10);
const script=compiler(sources('e1bdc6f'));
const cas=refs.map(ref=>{const r=jouer(script,ref.pilote,ref.graine);const champs=['tempsJeu','tempsCombat','vague','score'];return {pilote:ref.pilote,graine:ref.graine,attendu:Object.fromEntries(champs.map(k=>[k,ref[k]])),mesure:Object.fromEntries(champs.map(k=>[k,r[k]])),identique:champs.every(k=>r[k]===ref[k]),err:r.err};});
sauver('calibration.json',{dateParis:dateParis(),reference:'e1bdc6f',cas,conforme:cas.every(c=>c.identique&&!c.err)});
assert(cas.every(c=>c.identique&&!c.err)); console.log('10/10 références exactes.');
