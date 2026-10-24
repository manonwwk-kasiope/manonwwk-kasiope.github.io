import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {flashs,transitions,compteur} from './r13.mjs';
import {flashs as projet} from '../mesure/criteres/R-13-photosensibilite.mjs';
import {flashs as jury} from '../jury2/analyse.mjs';
import {r13Annexe} from '../jury2/jure.mjs';
const HERE=fileURLToPath(new URL('.',import.meta.url));
function ancien(file,end){const s=execFileSync('git',['show','7f025edad64bd928fd75840f41f1d342d5532f0c:'+file],{encoding:'utf8'});return new Function(s.slice(s.indexOf('export function flashs('),s.indexOf(end)).replace('export function','function')+';return flashs;')();}
const J=ancien('proto-neon/tools/jury2/analyse.mjs','export function sync('),F=ancien('proto-neon/tools/mesure/criteres/R-13-photosensibilite.mjs','export async function mesurer(');
const n=1000,L=[.002,.240,.679], redPalette=[0,5,7], full=v=>new Uint8Array(n).fill(v),p=(v,nb=n)=>Uint8Array.from({length:n},(_,i)=>i<nb?v:0);
function suite(np,nb=n){return [{w:0,p:full(0)},...Array.from({length:np*2},(_,i)=>({w:(i+1)/60,p:p(i%2?0:1,nb)}))];}
const swap=[{w:0,p:Uint8Array.from({length:n},(_,i)=>i>=100&&i<200?1:0)},{w:1/60,p:p(1,100)},{w:2/60,p:p(1,100)}];
const swaps=Array.from({length:5},(_,k)=>({w:k/60,p:Uint8Array.from({length:n},(_,i)=>{const b=Math.floor(i/100);return b<k||(b>=4+k&&b<8)?1:0;})}));
function acquerir(images){let old=null;return images.map(x=>{const b=Uint8Array.from(x.p,v=>redPalette[v]),r={w:x.w,...transitions(old,b,[.002,0,0,0,0,.240,0,.679],.1,.8)};old=b;return r;});}
const cas=[['fixe',suite(0),0],['une permutation sans retour',swap,0],['quatre permutations sans retour',swaps,0],['un flash L et R',suite(1),1],['trois flashs',suite(3),3],['quatre flashs',suite(4),4],['aire 6 %',suite(4,60),0],['aire exactement 6,6 %',suite(4,66),0],['aire 6,7 %',suite(1,67),1]];
const controles=cas.map(([nom,im,attendu])=>{const a=acquerir(im),r=flashs(a,.066);assert.equal(projet,jury,'Une seule fonction partagée');assert.equal(r.maxParSeconde,attendu,nom);assert.deepEqual(projet(a,.066,1/60),jury(a,.066),nom);return{nom,attendu,avantJury:J(a,.066).maxParSeconde,avantProjet:F(a,.066,1/60).maxParSeconde,apres:r.maxParSeconde};});
assert.equal(controles[1].avantJury,1);assert.equal(controles[1].avantProjet,1);assert.equal(controles[2].avantJury,4);assert.equal(controles[2].avantProjet,4);
const autres=[];function test(nom,f){f();autres.push({nom,ok:true});}
test('Zones opposées sur deux rendus distincts mais sans pixel commun',()=>{const a=acquerir([{w:0,p:Uint8Array.from({length:n},(_,i)=>i>=100&&i<200?1:0)},{w:.1,p:p(1,200)},{w:.2,p:p(1,100)}]);assert.equal(jury(a,.066).flashs,0);});
test('Surface commune seule : 10 % aller, 6 % retour',()=>assert.equal(jury(acquerir([{w:0,p:full(0)},{w:.1,p:p(1,100)},{w:.2,p:Uint8Array.from({length:n},(_,i)=>i>=60&&i<100?1:0)}]),.066).flashs,0));
test('Temps réel prioritaire : quatre flashes sur 1,25 s',()=>{const a=acquerir(suite(4));a.forEach((x,i)=>x.w=i===0?0:Math.floor((i-1)/2)*.4+((i-1)%2)*.05+.01);assert.equal(projet(a,.066,1/60).maxParSeconde,3);});
test('Borne une seconde exclue, même avec seulement huit rendus',()=>{const a=acquerir(suite(4));a.forEach((x,i)=>x.w=i===0?0:(i===8?1.02:i*.01));a[2].w=.02;assert.equal(jury(a,.066).maxParSeconde,3);});
test('Pas fixe explicite sans w accepté ; sans horloge refusé',()=>{const a=acquerir(suite(4)).map(({w,...x})=>x);assert.equal(projet(a,.066,1/60).maxParSeconde,4);assert.equal(jury(a,.066).qualifiable,false);});
test('Resize : aucune paire entre surfaces de dimensions différentes',()=>{const a=acquerir(suite(1));a[2].W=500;a[2].H=2;assert.equal(jury(a,.066).flashs,0);});
test('RLE corrompu refusé ; temps non croissant refusé',()=>{const a=acquerir(suite(1));a[1].r13.data='AA==';assert.equal(jury(a,.066).qualifiable,false);const b=acquerir(suite(1));b[2].w=b[1].w;assert.equal(jury(b,.066).qualifiable,false);});
test('Fenêtre fixe exacte à 12 Hz : un événement par rendu, jamais treize dans une seconde',()=>{
 const im=[{w:0,p:full(0)}];for(let k=1;k<=26;k++)im.push({w:k/12,p:Uint8Array.from({length:n},(_,i)=>k===1?(i<500?1:0):(i<500?k%2:1-k%2))});
 const r=flashs(acquerir(im),.066,undefined,{hzFixe:12});assert.equal(r.maxParSeconde,12);assert.equal(r.flashs,25);
});
test('Annexe historique : maximum et conformité null, ancienne valeur bornée non probante',()=>{const a=acquerir(swaps).map(({r13,...x})=>x),r=r13Annexe({frames:a,regles:{R13:{aire:.066,flashsParSeconde:3}}});assert.equal(r.statut,'non qualifiable (fractions sans recouvrement spatial)');assert.equal(r.conforme,null);assert.equal(r.maxParSeconde,null);assert.equal(r.borneSuperieureNonProbante.maxParSeconde,4);assert.match(r.borneSuperieureNonProbante.libelle,/non probante/);});
test('Annexe neuve : paire spatialement mesurée conservée',()=>assert.equal(r13Annexe({frames:acquerir(suite(4)),regles:{R13:{aire:.066,flashsParSeconde:3}}}).conforme,false));
test('Deux familles sur surfaces distinctes, union avant seuil sans doublon',()=>{const a=full(0),b=Uint8Array.from({length:n},(_,i)=>i<40?5:i<80?7:0),c=full(0);const T=[0,0,0,0,0,.002,0,.679];const r=jury([{w:0,...transitions(null,a,T,.1,.8)},{w:.1,...transitions(a,b,T,.1,.8)},{w:.2,...transitions(b,c,T,.1,.8)}],.066);assert.equal(r.flashs,1);assert.equal(r.surface,.08);});
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),controles,autres,reussi:true};
fs.writeFileSync(HERE+'controles.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
