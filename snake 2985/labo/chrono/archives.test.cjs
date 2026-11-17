'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function lab(storage,reduced) {
  let draws=0,frames=0,focus=null,callback=null;
  const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(()=>{draws++;})});
  class El{
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attrs={};this.textContent='';this.value='';}
    append(...els){this.children.push(...els);}
    replaceChildren(...els){this.children=els;}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(k,fn){this.listeners[k]=fn;}
    dispatch(k){this.listeners[k]?.({preventDefault(){},stopPropagation(){}});}
    focus(){focus=this;}
    showModal(){this.open=true;}
    close(){this.open=false;this.dispatch('close');}
    getContext(){return ctx;}
    all(){return [this,...this.children.flatMap(c=>c.all())];}
  }
  const doc={readyState:'complete',getElementById:()=>null,get activeElement(){return focus;},createElement:t=>new El(t),body:new El('body')};
  const win={localStorage:storage,document:doc,console,Intl,btoa,atob,matchMedia:()=>({matches:reduced}),
    requestAnimationFrame:fn=>{callback=fn;return ++frames;},cancelAnimationFrame:()=>{callback=null;},addEventListener(){}};
  win.window=win;vm.createContext(win);
  for(const file of ['../../palmares.js','../../forge.js','../../vol-libre.js','../moteur.js','chrono.js','../reprise/reprise.js','../spectacle.js','../campagne/archives.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),win,{filename:file});
  return {win,doc,get draws(){return draws;},frame(time){callback?.(time);}, find:predicate=>doc.body.all().find(predicate)};
}
function storage(){
  const m=new Map();
  return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),key:i=>[...m.keys()][i],get length(){return m.size;}};
}
for(const reduced of [false,true])test('mort, deux plans, signature, saut et mise ; mouvement réduit '+reduced,()=>{
  const store=storage(),legacy={id:'avant-cinq-dates',name:'PILOTE X',score:1700,difficulty:6,year:2185,status:'dead',endedAt:1600000000000};
  const key='snake2985.hall.tentative.'+legacy.id,original=JSON.stringify(legacy);store.setItem(key,original);
  const env=lab(store,reduced),w=env.win,api=w.SnakeArchives,engine=w.SnakeArcade;
  const s=engine.create(()=>.3,0),id=api.newRun(s);assert.equal(api.newRun(s),id);
  for(let i=0;i<1800 && s.status==='playing';i++){
    // Physically shift to the upper plane, then travel there until impact.
    if(i===50)engine.shiftPlane(s);
    engine.tick(s,1/60);api.tick(s);s.events.length=0;
  }
  assert.equal(s.status,'dead');assert.equal(s.plane,1);
  assert.equal(api.end(s).id,id);assert.equal(api.end(s).id,id);assert.equal(w.SnakePalmares.list().length,2);
  assert(api.openReplay());
  const range=env.find(e=>e.type==='range');assert.equal(Math.round(range.max-range.min),2000);
  const planes=env.doc.body.all().filter(e=>e.tag==='canvas');assert.equal(planes.length,2);
  assert.match(range.attrs['aria-valuetext'],/Impact · plan 2/);
  const findButton=t=>env.find(e=>e.tag==='button'&&e.textContent===t);
  findButton('− 0,25 s').dispatch('click');assert.match(range.attrs['aria-valuetext'],/0,25 s avant/);
  range.value=range.max;range.dispatch('input');
  findButton(reduced?'Image suivante':'Lire').dispatch('click');
  env.frame(10);env.frame(80);
  assert.equal(Math.round(range.value-range.min),reduced?0:70);
  assert(env.draws>0);findButton('Fermer').dispatch('click');
  api.openHall();
  const select=env.find(e=>e.tag==='select');assert.equal(select.children.map(o=>o.value).join(','),',1976,1985,1995,2185,2985');
  select.value='2185';select.dispatch('change');assert.equal(env.find(e=>e.tag==='tbody').children.length,1);
  assert(env.find(e=>e.textContent==='PILOTE X'));
  const input=env.find(e=>e.type==='text');input.value='LILA';env.find(e=>e.tag==='form').dispatch('submit');
  assert.equal(w.SnakePalmares.list(1976)[0].name,'LILA');
  assert.equal(store.getItem(key),original);assert.equal(lab(store,reduced).win.SnakePalmares.list().length,2);
  assert(api.jump(s));const dest=engine.create(()=>.2,4);api.newRun(dest);
  assert.match(api.offer(dest),/25 %/);assert(api.wager(dest));assert.equal(dest.novaCharge,.75);assert(!api.wager(dest));
  assert.match(api.label(dest),/1976/);
  const before=env.draws;api.draw(planes[0],dest,reduced);assert(env.draws>before);
  engine.tick(dest,1/60);api.tick(dest);assert.equal(dest.score,0);
  assert.equal(w.SnakePalmares.list().length,2);
});
