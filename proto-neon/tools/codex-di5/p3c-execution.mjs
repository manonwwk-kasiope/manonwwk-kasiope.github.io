/* Contrôles de l'instrument sur données connues. Aucun serveur, navigateur ou simulation de jeu. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {transitions} from 'file:///Users/manonwojciechowski/Projets/wt-snake/codex-di5/proto-neon/tools/codex-di5/r13.mjs';
import { flashs } from 'file:///Users/manonwojciechowski/Projets/wt-snake/codex-di5/proto-neon/tools/mesure/criteres/R-13-photosensibilite.mjs';
import { ANALYSE } from 'file:///Users/manonwojciechowski/Projets/wt-snake/codex-di5/proto-neon/tools/mesure/criteres/R-37-arsenal.mjs';
import { CAUSES } from 'file:///Users/manonwojciechowski/Projets/wt-snake/codex-di5/proto-neon/tools/mesure/criteres/R-05-mourir.mjs';
import { lireGestes } from 'file:///Users/manonwojciechowski/Projets/wt-snake/codex-di5/proto-neon/tools/mesure/gestes.mjs';
import { dateParis } from 'file:///Users/manonwojciechowski/Projets/wt-snake/codex-di5/proto-neon/tools/mesure/commun.mjs';
const controles=[];
function test(nom,fn){fn();controles.push({nom,ok:true});}
const images=n=>{let old=new Uint8Array(100);return Array.from({length:60},(_,i)=>{const b=new Uint8Array(100).fill(i<n*2&&i%2===0?5:0),r={w:i/60,...transitions(old,b,[0,0,0,0,0,.24],.1,.8)};old=b;return r;});};
const ancienSrc=execFileSync('git',['show','15a196a:proto-neon/tools/mesure/criteres/R-13-photosensibilite.mjs'],{encoding:'utf8'});
const fn=ancienSrc.slice(ancienSrc.indexOf('export function flashs('),ancienSrc.indexOf('export async function mesurer')).replace('export function','function');
const ancienFlashs=new Function(fn+';return flashs;')();
assert.equal(ancienFlashs(images(1),0.066,1/60).maxParSeconde,2);
test('Flash lumineux et rouge simultané : un flash, pas deux',()=>assert.equal(flashs(images(1),0.066,1/60).maxParSeconde,1));
test('Trois flashs simultanément rouges et lumineux : trois',()=>assert.equal(flashs(images(3),0.066,1/60).maxParSeconde,3));
test('Quatre flashs toujours refusés au seuil de trois',()=>assert.equal(flashs(images(4),0.066,1/60).maxParSeconde,4));
test('Sept causes naturelles ; morsure exclue des morts',()=>{assert.equal(CAUSES.length,7);assert.ok(!CAUSES.includes('morsure'));assert.ok(CAUSES.includes('mur'));});
const W=20,H=20,b=new Uint8Array(W*H),m=new Uint8Array(W*H),sp={x:8,y:8,w:2,h:2,data:[7,7,7,7],ink:null};
for(const i of [168,169,188,189]){m[i]=1;b[i]=7;}
m[0]=m[1]=1;b[0]=b[1]=7; // deux pixels du radar
const N={R:{criteres:{R37:{silence:3}}}},M={tampon:()=>({W,H,buf:b}),masque:()=>m,__tete37:sp,analyse:()=>({cyanHorsTeteCorps:0})};
const analyser=()=>new Function('N','S','M',ANALYSE)(N,{},M);
test('La tête réelle exclut les deux pixels du radar',()=>{const a=analyser();assert.equal(a.tete,4);assert.equal(a.sprite,4);assert.equal(a.differences,0);});
test('Une tête corrompue de même surface reste refusée',()=>{b[168]=8;assert.equal(analyser().differences,1);b[168]=7;});
test('Silence strictement inférieur à trois pixels : exactement trois est permis',()=>{m[165]=3;assert.equal(analyser().proches,0);m[165]=0;m[166]=3;assert.equal(analyser().proches,1);m[166]=0;});
// Le journal d'un seul pouvoir peut contenir debut, fin et pret : une seule activation.
const oldWindow=globalThis.window;globalThis.window={__GESTES_MESURE:[]};
try{
 const l=await lireGestes({journal:async()=>['debut','fin','pret'].map(evt=>({type:'pouvoir',d:{evt}})),eval:async fn=>fn()});
 assert.equal(l.pouvoirs,1);controles.push({nom:'debut/fin/pret du pouvoir : une seule activation',ok:true});
}finally{globalThis.window=oldWindow;}
const preuve={dateParis:dateParis(),avantApresFlashAnalytique:{avant:ancienFlashs(images(1),0.066,1/60),apres:flashs(images(1),0.066,1/60)},limite:'Fixtures analytiques de l’instrument uniquement ; aucun après navigateur.',controles};
fs.writeFileSync(new URL('./p3c-instrument-adapte.json',import.meta.url),JSON.stringify(preuve,null,2)+'\n');
console.log(controles.length+' contrôles de l’instrument réussis');
