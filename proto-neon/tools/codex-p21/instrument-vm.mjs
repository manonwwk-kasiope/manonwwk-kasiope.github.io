import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {sources,sauver,dateParis} from './vm.mjs';import {avecRaccord} from './raccord.mjs';import {bancGestes} from './gestes-vm.mjs';
import {Doigts,preparerJeu,serieSecondDoigt} from './gestes.mjs';
import {Doigts as AncienDoigts} from '../mesure/gestes.mjs';
// Adaptateur de protocole, pas un navigateur : traduit les ensembles actifs CDP en événements tactiles.
// La conformité réelle de changedTouches sera contrôlée séparément par verifier.mjs.
function session(src){
 const m=bancGestes(src),{c,N}=m,ecoute=new Map(),micro=[];let actifs=new Map();
 c.addEventListener=(t,f)=>{const l=ecoute.get(t)||[];l.push(f);ecoute.set(t,l);};c.queueMicrotask=f=>micro.push(f);
 vm.runInContext(`window.__MESURE={obs:{},parImage(id,code){this.obs[id]={fn:new Function('N','S',code),out:[]};},arreter(id){const r=this.obs[id].out;delete this.obs[id];return r;},echantillonner(){for(const o of Object.values(this.obs))o.out.push(o.fn(window.__N,window.__S));}}`,c);
 const evenement=(type,p)=>{const name=type==='start'?'touchstart':type==='move'?'touchmove':'touchend',t={identifier:p.id,clientX:p.x,clientY:p.y};
 const e={type:name,changedTouches:[t],touches:[...actifs.values()],cancelable:true,preventDefault(){}};
 for(const f of ecoute.get(name)||[])f(e);m.touch(type,p.id,p.x,p.y);while(micro.length)micro.shift()();};
 const cdp={async send(method,{type,touchPoints}){assert.equal(method,'Input.dispatchTouchEvent');if(type==='touchEnd'||type==='touchCancel')assert.equal(touchPoints.length,0,'CDP : touchEnd/touchCancel ne doit contenir aucun point');
 const next=new Map(touchPoints.map(p=>[p.id,p])),prev=actifs;actifs=next;
 for(const [id,p]of prev)if(!next.has(id))evenement('end',p);
 for(const [id,p]of next)if(!prev.has(id))evenement('start',p);else if(p.x!==prev.get(id).x||p.y!==prev.get(id).y)evenement('move',p);
 }};
 return {m,page:{viewportSize:()=>({width:844,height:390}),waitForTimeout:async ms=>m.advance(ms)},cdpSession:async()=>cdp,
 eval:async(fn,arg)=>{c.__arg=arg;return vm.runInContext('('+fn.toString()+')(__arg)',c);},demarrer:async()=>({ok:true}),images:async n=>m.advance(n*1000/60),journal:async vider=>N.journal.dump(vider?{vider:true}:undefined)};
}
const src=avecRaccord(sources()),cas=[];
const ancien=session(src),d=await new AncienDoigts(ancien).init();const id=await d.poser(220,230);let rejet=false;
try{await d.lever(id);}catch(e){rejet=String(e).includes('aucun point');}cas.push({nom:'ancien-lever-rejete-par-contrat-CDP',conforme:rejet});
const unique=session(src),d2=await new Doigts(unique).init();const a=await d2.poser(220,230);unique.m.advance(260);const b=await d2.poser(650,230);unique.m.advance(70);await d2.lever(b);
cas.push({nom:'relever-action-conserve-manche',conforme:unique.m.S.input.stick.active&&unique.m.S.input.pouvoir,stick:{...unique.m.S.input.stick},journal:unique.m.N.journal.lire('geste')});await d2.lever(a);
cas.push({nom:'tout-relever-sans-doigt-fantome',conforme:!unique.m.S.input.stick.active});
for(const genre of ['toucher','glisse','tenu']){
 const s=session(src);await preparerJeu(s);const r=await serieSecondDoigt(s,genre,6,{duree:genre==='tenu'?0.5:undefined}),action=genre==='toucher'?'pouvoir':genre==='glisse'?'apogee':'boost';
 const conforme=r.actions[action]===6&&Object.entries(r.actions).every(([k,n])=>k===action||n===0)&&r.entrees.length===6&&!s.m.c.__ERR.count;
 cas.push({nom:'instrument-'+genre,conforme,resultat:r,err:s.m.c.__ERR.count,erreurs:s.m.erreurs});
}
const partage=session(src);await preparerJeu(partage);const enchaines=[];
for(const genre of ['toucher','glisse','tenu']){
 const r=await serieSecondDoigt(partage,genre,6,genre==='tenu'?{duree:.5}:{}),action=genre==='toucher'?'pouvoir':genre==='glisse'?'apogee':'boost';
 enchaines.push({genre,actions:r.actions,boosts:r.boosts,conforme:r.actions[action]===6&&Object.entries(r.actions).every(([k,n])=>k===action||n===0)});
}
cas.push({nom:'instrument-sequentiel-meme-page-trois-genres',conforme:enchaines.every(e=>e.conforme)&&!partage.m.c.__ERR.count,enchaines});
sauver('instrument-vm.json',{dateParis:dateParis(),limite:'Modèle CDP conforme au contrat local, événements dirigés vers les vrais handlers ; pas une exécution de Chromium.',conforme:cas.every(c=>c.conforme),cas});
console.log(cas.map(({nom,conforme,resultat})=>({nom,conforme,actions:resultat?.actions,boosts:resultat?.boosts})));if(!cas.every(c=>c.conforme))process.exitCode=1;
