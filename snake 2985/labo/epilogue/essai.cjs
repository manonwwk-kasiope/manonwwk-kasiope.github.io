'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const epi=require('./epilogue.js'),scores=new Map(),storage={get length(){return scores.size;},key:i=>[...scores.keys()][i],getItem:k=>scores.get(k)??null,setItem:(k,v)=>scores.set(k,v)};
global.window={addEventListener(){}};global.localStorage=storage;
global.document={readyState:'loading',getElementById(){return null;},addEventListener(){}};
require('../../palmares.js');require('../moteur.js');require('../gardiens/gardiens.js');
const engine=window.SnakeArcade,hall=window.SnakePalmares;
let victory;const realVoyage=epi.create(),tick=engine.tick;engine.tick=(s,dt)=>{
  epi.start(realVoyage,s);const previous=new Set(s.events);tick(s,dt);
  epi.observe(realVoyage,s,s.events.filter(e=>!previous.has(e)));if(s.status==='won')victory=s;
};
const fixture=path.resolve(__dirname,'../gardiens/gardiens.cjs');
const realRequire=require('node:module').createRequire(fixture),apis=window;
vm.runInThisContext('(function(require){'+fs.readFileSync(fixture,'utf8')+'\n})',{filename:fixture})(id=>{
  if(id==='node:test')return (name,fn)=>{if(name.startsWith('campagne 2985'))fn();};
  Object.assign(global.window,apis);return realRequire(id);
});
assert(victory?.difficulty===10 && victory.year===2985);engine.tick=tick;
const realRow={id:'réelle',status:victory.status,year:victory.year,score:victory.score};
const realSummary=epi.finish(realVoyage,victory,realRow,{list:()=>[realRow]});
assert.deepEqual(realSummary.route,[2985]);assert.deepEqual(realSummary.gestures,[]);
const voyage=epi.create(),backup=hall.record({id:'avant',name:'PILOTE',year:2985,status:'dead',difficulty:8,score:3400});
const mid=engine.create(()=>.3,0);epi.start(voyage,mid);
epi.observe(voyage,mid,[{type:'flightEnd',success:false},{type:'surfGate'},{type:'knotClosed'}]);
epi.start(voyage,mid);const second=engine.create(()=>.4,2);epi.start(voyage,second);
epi.observe(voyage,second,[{type:'flightEnd',success:true},{type:'ecoAbsorb'}]);
const unplayed=engine.create(()=>.4,3);
epi.observe(voyage,unplayed,[{type:'bossHit',weapon:'surf',heart:true,damage:42}]);
const final=engine.create(()=>.5,4);epi.start(voyage,final);
epi.observe(voyage,final,[{type:'bossHit',weapon:'surf',heart:true,damage:2}]);
Object.assign(final,{status:victory.status,score:victory.score,difficulty:victory.difficulty});
const row=hall.record({id:'fin',name:'PILOTE',year:2985,status:final.status,difficulty:10,score:final.score});
const out=epi.finish(voyage,final,row,hall);assert.equal(out.previous,backup.score);
assert.deepEqual(out.route,[1976,1995,2985]);assert.deepEqual(out.gestures,[{year:2985,text:'Cœur frappé en surf'},{year:1976,text:'Circuit de queue fermé'}]);
for(const status of ['playing','dead','cleared','upgrade']){final.status=status;assert.equal(epi.finish(voyage,final,row,hall),null);}
final.status='won';final.difficulty=9;assert.equal(epi.finish(voyage,final,row,hall),null);final.difficulty=10;
const duplicate=epi.finish(voyage,final,row,hall);assert.deepEqual(duplicate,out);assert.equal(hall.list().length,2);
const saved=scores.size,key=Object.keys(require.cache).find(k=>k.endsWith('/palmares.js'));
hall.setName('fin','NOVA');delete require.cache[key];require('../../palmares.js');
assert.equal(window.SnakePalmares.list().find(r=>r.id==='fin').name,'NOVA');assert.equal(scores.size,saved+1);
class El{
  constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.child=[];this.events={};this.dataset={};this.style={setProperty(){}};}
  setAttribute(k,v){this[k]=v;}append(el){this.child.push(el);}addEventListener(k,cb){this.events[k]=cb;}focus(){this.ownerDocument.active=this;}remove(){this.removed=true;}
}
const doc={createElement(tag){return new El(tag,this);},querySelector(){return this.input;},input:null};
function render(model){
  const host=new El('section',doc),counts={signed:0,cycle:0,retry:0};
  const view=epi.mount(host,model,{onHall(){counts.signed++;doc.input=new El('input',doc);},onRetry(){counts.retry++;},onCycle(){counts.cycle++;}},{reduced:true,assetBase:'/illustrations/'});
  return {view,counts,nav:view.root.child.at(-1).child};
}
for(const previous of [99,120,33]){
  const snapshot={...out,previous,score:99},display=render(snapshot);
  const caption=display.view.root.child[0].child[1].child[1].textContent;
  assert(caption.includes(previous===99?'égalé':previous>99?'−21 pts':'+66 pts'));display.view.destroy();
}
const {view,counts,nav}=render(out);view.focus();assert.equal(doc.active,nav[2]);assert.equal(view.root.dataset.reduced,'true');
assert.equal(view.root.child[1].child.length,3);assert.deepEqual(view.root.child[1].child.map(el=>el.child[0].src),out.route.map(y=>'/illustrations/paysage-'+y+'.webp'));
nav[0].events.click();assert.equal(doc.active,doc.input);nav[2].events.click();nav[2].events.click();nav[1].events.click();
assert.deepEqual(counts,{signed:1,cycle:1,retry:0});view.destroy();assert(view.root.removed);
const fresh=epi.create(),alone=engine.create(()=>.5,4);epi.start(fresh,alone);
Object.assign(alone,{status:'won',difficulty:10,score:99});const soleRow={id:'only',status:'won',year:2985,score:99};
const solo=epi.finish(fresh,alone,soleRow,{list:()=>[soleRow]});
assert.deepEqual(solo.route,[2985]);assert.deepEqual(solo.gestures,[]);assert.equal(solo.previous,null);
const signed=render(solo);signed.nav[1].events.click();assert.equal(signed.counts.retry,1);
const all=epi.create();for(let i=0;i<5;i++){const st=engine.create(()=>.2,i);epi.start(all,st);epi.start(all,st);}assert.equal(all.route.length,5);
console.log(JSON.stringify({moteur:{status:victory.status,year:victory.year,difficulty:victory.difficulty,score:victory.score},sauts:out.route,gestes:out.gestures,ancienRecord:out.previous,signatureRelue:'NOVA',actions:counts,cycleSuivant:solo.route},null,2));
