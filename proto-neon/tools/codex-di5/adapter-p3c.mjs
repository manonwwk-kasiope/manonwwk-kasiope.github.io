/* Préparation de la seule migration de fixture demandée ; ne modifie pas le fichier hors périmètre. */
import fs from 'node:fs';import {execFileSync,spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const original=new URL('../mesure/verifier-p3c-instrument.mjs',import.meta.url);
const ancien=fs.readFileSync(original,'utf8');
const ligne=ancien.split('\n').find(s=>s.startsWith('const images=n=>'));
const nouveau="const images=n=>{let old=new Uint8Array(100);return Array.from({length:60},(_,i)=>{const b=new Uint8Array(100).fill(i<n*2&&i%2===0?5:0),r={w:i/60,...transitions(old,b,[0,0,0,0,0,.24],.1,.8)};old=b;return r;});};";
const adapte=ancien.replace("import { flashs }", "import {transitions} from '../codex-di5/r13.mjs';\nimport { flashs }").replace(ligne,nouveau);
fs.writeFileSync(new URL('./verifier-p3c-instrument.propose.txt',import.meta.url),adapte);
const diff=spawnSync('diff',['-u','-L','a/proto-neon/tools/mesure/verifier-p3c-instrument.mjs','-L','b/proto-neon/tools/mesure/verifier-p3c-instrument.mjs',fileURLToPath(original),fileURLToPath(new URL('./verifier-p3c-instrument.propose.txt',import.meta.url))],{encoding:'utf8'});
if(diff.status!==1)throw Error('Diff attendu : '+diff.stderr);
fs.writeFileSync(new URL('./p3c-fixture.patch',import.meta.url),diff.stdout);
// Même code et mêmes assertions, seuls chemins relocalisés et sortie dans la mission.
let s=adapte.replace(/from '(\.[^']+)'/g,(_,p)=>`from '${new URL(p,original).href}'`)
 .replace("new URL('./diagnostic/p3c-instrument.json',import.meta.url)","new URL('./p3c-instrument-adapte.json',import.meta.url)");
fs.writeFileSync(new URL('./p3c-execution.mjs',import.meta.url),s);
execFileSync(process.execPath,[fileURLToPath(new URL('./p3c-execution.mjs',import.meta.url))],{stdio:'inherit'});
