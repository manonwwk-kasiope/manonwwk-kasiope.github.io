import fs from 'node:fs';import {sources,chargerAvant,sauver,hash,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {partiePouce} from './partie-r23.mjs';import {figer,lancer,file} from './processus.mjs';
const phase=process.argv.includes('--avant')?'avant':'apres',raccord=process.argv.includes('--raccord'),pouce=!process.argv.includes('--sans-pouce');
let src=phase==='avant'?chargerAvant():sources();if(raccord)src=avecRaccord(src);
const protocoleSha256=hash(partiePouce.toString()),fichier=figer(src),cas=[],limit=Number(process.argv.find(a=>a.startsWith('--n='))?.split('=')[1]||50),out=`r23-${phase}${raccord?'-raccord':''}${pouce?'-pouce':'-sans-pouce'}.json`;
const chemin=new URL(out,import.meta.url);let cached=[];
if(fs.existsSync(chemin)){const old=JSON.parse(fs.readFileSync(chemin));if(old.sourceSha256===hash(src)&&old.pouce===pouce&&old.protocoleSha256===protocoleSha256)cached=old.cas;}
const jobs=[];for(const variante of ['diriger','auto'])for(let graine=1;graine<=limit;graine++){
 const previous=cached.find(r=>r.variante===variante&&r.graine===graine);if(previous&&!previous.exception&&!previous.err&&previous.fin)cas.push(previous);else jobs.push({variante,graine,pouce});}
const save=()=>sauver(out,{dateParis:dateParis(),sourceSha256:hash(src),protocoleSha256,pouce,calcul:'Reprise des seuls cas manquants, processus Node distinct par partie, deux au maximum ; reçus achevés antérieurs réutilisés.',cas:cas.toSorted((a,b)=>a.variante.localeCompare(b.variante)||a.graine-b.graine)});
const concurrence=Math.max(1,Math.min(2,Number(process.argv.find(a=>a.startsWith('--workers='))?.split('=')[1]||2)));
await file(jobs,concurrence,j=>lancer(fichier,'r23',j),r=>{cas.push(r);save();console.log(phase,cas.length,JSON.stringify(['diriger','auto'].map(v=>[v,cas.filter(c=>c.variante===v&&c.victoire).length,cas.filter(c=>c.variante===v).length])));});save();
if(cas.some(c=>c.exception||c.err||c.erreursConsole?.length||!c.fin))process.exitCode=1;
