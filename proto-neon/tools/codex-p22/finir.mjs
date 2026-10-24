// Poursuite séquentielle de la série déjà engagée, sans second calcul lourd.
import fs from 'node:fs';import {spawn} from 'node:child_process';import {ICI} from './vm.mjs';
const attente=()=>new Promise(r=>setTimeout(r,1000));
for(;;){let b;try{b=JSON.parse(fs.readFileSync(ICI+'/parties-avant.json'));}catch{}
 if(b?.cas.length===80){if(b.cas.some(c=>!c.fin||c.err||c.erreursConsole.length))throw new Error('Avant incomplet ou en erreur');break;}await attente();}
function lancer(script,args=[],log=null){return new Promise((ok,ko)=>{const f=log?fs.openSync(ICI+'/'+log,'w'):null;const p=spawn(process.execPath,[ICI+'/'+script,...args],{stdio:f?['ignore',f,f]:'inherit'});p.on('error',ko);p.on('exit',c=>{if(f)fs.closeSync(f);c===0?ok():ko(new Error(script+' sortie '+c));});});}
await lancer('parties.mjs',['raccords'],'raccords.log');await lancer('comparer.mjs',[],'comparaison.log');await lancer('rapporter.mjs');
console.log('80 paires vérifiées, rapport actualisé.');
