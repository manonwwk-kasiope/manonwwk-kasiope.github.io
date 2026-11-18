'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function lab(storage,reduced,session) {
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
  const win={localStorage:storage,sessionStorage:session,document:doc,console,Intl,btoa,atob,matchMedia:()=>({matches:reduced}),
    requestAnimationFrame:fn=>{callback=fn;return ++frames;},cancelAnimationFrame:()=>{callback=null;},addEventListener(){}};
  win.window=win;vm.createContext(win);
  for(const file of ['../../palmares.js','../../forge.js','../../vol-libre.js','../moteur.js','chrono.js','../reprise/reprise.js','../spectacle.js','../campagne/archives.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),win,{filename:file});
  return {win,doc,get draws(){return draws;},frame(time){callback?.(time);}, find:predicate=>doc.body.all().find(predicate)};
}
function storage(){
  const m=new Map();
  return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size;}};
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

function deathWithScore(w,year,score){
  const era=w.SnakeArcade.eras.findIndex(e=>e.year===year),s=w.SnakeArcade.create(()=>.1,era);
  w.SnakeArchives.newRun(s);
  s.elapsed=2;s.score=score;s.status='dead';s.cause='Mur';
  s.events.push({type:'death',cause:'Mur',x:s.snake[0].x,y:s.snake[0].y});
  w.SnakeArchives.end(s);return s;
}
test('le saut explicite survit au reload avant et après la préparation, aucune mise restaurée',()=>{
  const disk=storage(),tab=storage(),first=lab(disk,false,tab),a=first.win.SnakeArchives;
  const dead=deathWithScore(first.win,1976,310);
  assert.equal(a.resumeYear(),null); // Enregistrer une mort ne sélectionne jamais un rival.
  assert.equal(a.jump(dead,2185),true);assert.equal(a.resumeYear(),2185);
  const reload=lab(disk,false,tab).win;
  const dest=reload.SnakeArcade.create(()=>.4,3);
  reload.SnakeArchives.newRun(dest,{resume:true});
  assert.match(reload.SnakeArchives.label(dest),/1976.*310/);assert.equal(dest.novaCharge,1);
  assert.match(reload.SnakeArchives.offer(dest),/25 %/);
  assert.equal(reload.SnakeArchives.wager(dest),true);assert.equal(dest.novaCharge,.75);
  // Another tab can overwrite the year archive; this tab keeps the precisely selected clip.
  const other=lab(disk,false,storage()).win;deathWithScore(other,1976,975);
  const fresh=lab(disk,false,tab).win,again=fresh.SnakeArcade.create(()=>.2,3);
  fresh.SnakeArchives.newRun(again,{resume:true});
  assert.match(fresh.SnakeArchives.label(again),/1976.*310/);assert.equal(again.novaCharge,1);
  assert.equal(fresh.SnakeArchives.wager(again),true);assert.equal(again.novaCharge,.75);
  assert.equal(other.SnakeArchives.resumeYear(),null);
  // Abandon clears persisted and active rival even when a new route returns to this year.
  fresh.SnakeArchives.abandon();assert.equal(fresh.SnakeArchives.resumeYear(),null);assert.equal(fresh.SnakeArchives.label(again),'');
  assert.equal(lab(disk,false,tab).win.SnakeArchives.resumeYear(),null);
});
test('destination incompatible, fin de tentative, nouvelle route, session bloquée et historique ignoré',()=>{
  const disk=storage(),tab=storage(),e=lab(disk,false,tab).win,a=e.SnakeArchives;
  const src=deathWithScore(e,1985,120);
  for(const bad of [1976,1985,2030,'2185'])assert.equal(a.jump(src,bad),false);
  assert(a.jump(src,2985));
  const wrong=lab(disk,false,tab).win,wrongState=wrong.SnakeArcade.create(()=>.4,2);
  wrong.SnakeArchives.newRun(wrongState,{resume:true});assert.equal(wrong.SnakeArchives.label(wrongState),'');assert.equal(wrong.SnakeArchives.resumeYear(),null);
  assert(a.jump(src,2985));
  const dest=e.SnakeArcade.create(()=>.4,4);a.newRun(dest);assert.match(a.label(dest),/1985/);
  dest.status='won';a.end(dest);assert.equal(a.resumeYear(),null);
  assert(a.jump(src,2985));const newRoute=lab(disk,false,tab).win;const fresh=newRoute.SnakeArcade.create(()=>.4,4);
  newRoute.SnakeArchives.newRun(fresh);assert.equal(newRoute.SnakeArchives.label(fresh),'');assert.equal(newRoute.SnakeArchives.resumeYear(),null);
  for(const raw of ['{','x'.repeat(10000),JSON.stringify({v:1,year:2985,record:{}})]){
    tab.setItem('snake2985.chrono.saut.v1',raw);assert.equal(lab(disk,false,tab).win.SnakeArchives.resumeYear(),null);
  }
  const blocked={getItem(){throw Error('interdit');},setItem(){throw Error('interdit');},removeItem(){throw Error('interdit');}};
  const priv=lab(disk,false,blocked).win,p=priv.SnakeArchives,old=deathWithScore(priv,1995,15);
  assert(p.jump(old,2985));const future=priv.SnakeArcade.create(()=>.4,4);p.newRun(future);
  assert.match(p.label(future),/1995/);assert.equal(future.novaCharge,1);
});
test('la préférence manuelle fige la reprise et ne neutralise pas la préférence système',()=>{
  for(const [system,manual,wanted] of [[false,true,'Image suivante'],[true,false,'Image suivante'],[false,false,'Lire']]){
    const e=lab(storage(),system,storage());deathWithScore(e.win,1976,20);
    assert(e.win.SnakeArchives.openReplay(()=>manual));
    assert(e.find(n=>n.tag==='button'&&n.textContent===wanted));
  }
});
