/* Contrats isolés, sans navigateur ni modèle local. Ne vaut pas une partie réelle. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),portee:'module isolé, interfaces dépendantes simulées ; aucun verdict de jeu',cas:[]};
function test(nom,f){try{f();output.cas.push({nom,conforme:true});}catch(e){output.cas.push({nom,conforme:false,erreur:String(e)});}}
function env(){
 const c={};c.globalThis=c;vm.createContext(c);
 for(const f of ['00-pal.js','02-regles.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8'),c);
 c.N=c.__N;const N=c.N;let id=0,prime=0;const kills=[],spawns=[],texts=[],logs=[];
 N.S={};N.outils={VUE:{x:100,y:100,w:422,h:195},geo:{W:422,H:195,portrait:false,safe:{l:0,r:0,t:0,b:0}},OS:11,origine(){},textC(...a){texts.push(a)}};
 N.ev={on(type,rang,f){if(type==='kill')kills.push(f)}};N.journal=(type,d)=>logs.push({type,...d});
 const list=[];N.ennemis={list,reset(){list.length=0},spawn(type,x,y){const e={id:++id,type,x,y,etat:'approche'};list.push(e);spawns.push(e);return e}};
 N.dir={fin(){}};N.arene={nettoyee(){}};N.decor={quartier(){},etat(){}};N.hud={banniere(){}};N.score={ajouter(n){prime+=n},defi:{}};N.gfx={PX:2};
 vm.runInContext(fs.readFileSync(path.join(root,'src/76-defile.js'),'utf8'),c);
 return {N,spawns,texts,logs,kill(e,genre='arme'){kills.forEach(f=>f({id:e.id,type:e.type,src:{genre}}))},prime:()=>prime};
}
test('première escadrille et contact inoffensif',()=>{const e=env();e.N.defile.demarrer();assert.equal(e.spawns.length,e.N.R.defile.parEscadrille);assert(e.spawns.every(p=>p._inoff>0&&p._courbe));});
test('cinq départs et bords alternés, quarante planeurs',()=>{const e=env(),D=e.N.defile;D.demarrer();for(let k=1;k<5;k++){D.update(e.N.R.defile.intervalle);assert.equal(e.spawns.length,(k+1)*8);}assert(e.spawns[0].x<e.N.outils.VUE.x);assert(e.spawns[8].x>e.N.outils.VUE.x+e.N.outils.VUE.w);assert.equal(e.N.S.defile.total,40);});
test('pause dt zéro conserve temps et compteur',()=>{const e=env(),D=e.N.defile;D.demarrer();const a=JSON.stringify(D.bilan());D.update(0);assert.equal(JSON.stringify(D.bilan()),a)});
test('quarante kills valides : prime une fois et rare une fois',()=>{const e=env(),D=e.N.defile;D.demarrer();const seen=new Set();for(let k=0;k<24*120;k++){for(const p of e.spawns)if(!seen.has(p.id)){seen.add(p.id);e.kill(p);e.kill(p);}D.update(1/120);}assert.equal(D.bilan().attrapes,40);assert(D.bilan().parfait);assert.equal(e.prime(),e.N.R.defile.parfait);D.update(1);assert.equal(e.prime(),e.N.R.defile.parfait);assert.equal(D.prendreRare(),true);assert.equal(D.prendreRare(),false);assert.equal(e.N.ennemis.list.length,0);});
test('une cible manquée et les purges ne donnent pas PARFAIT',()=>{const e=env(),D=e.N.defile;D.demarrer();const seen=new Set();for(let k=0;k<24*120;k++){for(const p of e.spawns)if(!seen.has(p.id)){seen.add(p.id);e.kill(p,p.id===1?'decor':'arme');}D.update(1/120);}assert.equal(D.bilan().attrapes,39);assert.equal(D.bilan().parfait,false);assert.equal(e.prime(),0);assert.equal(D.prendreRare(),false);});
test('fin bornée à24s, état publié et réinitialisation',()=>{const e=env(),D=e.N.defile;D.demarrer();D.update(24);assert(D.fini());assert(D.joue());assert.equal(D.bilan().t,24);D.reset();assert.equal(D.joue(),false);assert.equal(e.N.S.defile.attrapes,0)});
test('compteur fini dans trois géométries, texte ≥17CSS',()=>{for(const [W,H,PX,portrait] of [[422,195,2,false],[130,281,3,true],[480,300,3,false]]){const e=env();Object.assign(e.N.outils.geo,{W,H,portrait});e.N.gfx.PX=PX;e.N.defile.demarrer();e.N.defile.draw();const t=e.texts.at(-1);assert(t.slice(1,3).every(Number.isFinite));assert(t[1]>0&&t[1]<W&&t[2]>0&&t[2]<H);assert(t[5]*PX*e.N.R.hud.police[1]>=17);}});
output.conforme=output.cas.every(c=>c.conforme);fs.writeFileSync(path.join(root,'tools/codex-10/unitaire.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));if(!output.conforme)process.exitCode=1;
