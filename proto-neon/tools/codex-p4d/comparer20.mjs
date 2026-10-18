// Vingt paires inerte/tourneur, graines 1..10 : contrôle des trajectoires hors CYCLOPE.
// Les écarts bon/humain de la campagne restent publiés séparément, sans substitution.
import fs from 'node:fs';import crypto from 'node:crypto';import {sources,monde,partie} from './vm.mjs';
const src=sources(),avant={...src},cas=[];for(const f of ['02-regles.js','70-joueuse.js','73-colosse.js'])avant[f]=fs.readFileSync(new URL('./avant-'+f,import.meta.url),'utf8');
if(!JSON.parse(fs.readFileSync(new URL('./calibration.json',import.meta.url))).valide)throw new Error('VM non calibrée');
for(const pilote of ['inerte','tourneur'])for(let graine=1;graine<=10;graine++){
 const paire={pilote,graine};for(const [mode,s] of [['avant',avant],['apres',src]]){const m=monde(s),r=partie(m,pilote,graine),j=m.N.journal.dump();paire[mode]={...r,phases:j.filter(e=>e.type==='phase').length,journalSHA:crypto.createHash('sha256').update(JSON.stringify(j)).digest('hex')};}
 paire.identique=paire.avant.tempsJeu===paire.apres.tempsJeu&&paire.avant.vague===paire.apres.vague;
 cas.push(paire);fs.writeFileSync(new URL('./comparaison20-hors-boss.json',import.meta.url),JSON.stringify({cas,identiques:cas.filter(c=>c.identique).length,terminees:cas.filter(c=>c.avant.raison==='fin'&&c.apres.raison==='fin').length},null,2));console.log(JSON.stringify(paire));
}
if(cas.length!==20||cas.some(c=>!c.identique||c.avant.err||c.apres.err))process.exitCode=1;
