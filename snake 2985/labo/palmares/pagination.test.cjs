'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path'), test=require('node:test');
const key='snake2985.hall.tentative.';
function setup(count){
  const data=new Map(),listeners=new Map();
  function row(i,score,year=1976){return {id:'ancien-'+i,year,difficulty:5,score,name:'RIVAL',cleared:true,endedAt:i};}
  for(let i=0;i<count;i++)data.set(key+'ancien-'+i,JSON.stringify(row(i,i+100)));
  const keys=[...data.keys()];
  const storage={length:keys.length,key:i=>keys[i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  class El{
    constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.value='';}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(k,v){this[k]=v;}
    addEventListener(k,fn){this.handlers[k]=fn;}
    fire(k){this.handlers[k]?.({preventDefault(){}});}
    focus(){} showModal(){this.open=true;} close(){this.open=false;this.fire('close');}
    nodes(){return [this,...this.children.flatMap(n=>n.nodes())];}
  }
  const doc={body:new El('body'),createElement:t=>new El(t),getElementById:()=>null};
  const w={document:doc,localStorage:storage,crypto:{randomUUID:()=>'ma-partie'},
    SnakeChrono:{archive:()=>({}),recorder:()=>({}),capture(){},update(){}},SnakeReprise:{create:()=>({capture(){}})},
    addEventListener:(k,fn)=>listeners.set(k,[...(listeners.get(k)||[]),fn])};
  w.window=w;vm.createContext(w);
  for(const f of ['../../palmares.js','../campagne/archives.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),w);
  const a=w.SnakeArchives,find=predicate=>doc.body.nodes().find(predicate);
  const get=tag=>find(n=>n.tag===tag),btn=label=>find(n=>n.tag==='button'&&n.textContent===label);
  const setFilter=y=>{get('select').value=String(y);get('select').fire('change');};
  function remote(r){const k=key+r.id,v=JSON.stringify(r);data.set(k,v);for(const f of listeners.get('storage'))f({key:k,newValue:v});}
  function finish(score){const s={year:1976,score,difficulty:7,status:'cleared',elapsed:12};a.newRun(s);a.end(s);a.openHall();}
  return {finish,a,row,remote,btn,get,setFilter,doc,data,summary:()=>find(n=>n.className==='archives-resultat').textContent};
}
test('1 205 anciens scores et une signature profonde, filtre et autre onglet',()=>{
  const u=setup(1205);u.finish(20);
  assert.match(u.summary(),/Rang général 1\s206 \/ 1\s206/);
  const rows=()=>u.get('tbody').children;
  assert.equal(rows().length,12);assert(u.doc.body.nodes().length<130);
  u.btn('Suivante').fire('click');assert.equal(rows()[0].children[0].textContent,'13');
  u.btn('Voir mon rang').fire('click');assert.equal(rows().at(-1)['aria-current'],'true');
  assert(u.btn('Suivante').disabled);
  u.setFilter(1985);assert.equal(rows().length,0);
  u.get('input').value='ÉLO';u.get('form').fire('submit');
  assert.equal(u.get('select').value,'1976');assert.equal(rows().at(-1).children[1].textContent,'ÉLO');
  u.remote(u.row(6000,4800,1976));assert.match(u.summary(),/4\s780 pts du record/);
  assert.match(u.summary(),/Rang général 1\s207/);
  u.remote(u.row(6001,9000,2000));assert(u.get('select').children.some(o=>o.value==='2000'));
  u.setFilter(2000);assert.equal(rows()[0].children[2].textContent,'2000');
  assert(u.doc.body.nodes().length<130);
  u.btn('Fermer').fire('click');assert.equal(u.get('dialog').open,false);
  u.a.openHall();assert.equal(u.get('h2').textContent,'Palmarès');
});
test('record inaugural, égalité et record dépassé',()=>{
  const first=setup(0);first.finish(0);assert.match(first.summary(),/Premier record/);
  const equal=setup(1);equal.finish(100);assert.match(equal.summary(),/Record d’époque égalé/);
  assert.match(equal.summary(),/Rang époque 1 \/ 2/);
  const win=setup(1);win.finish(125);assert.match(win.summary(),/battu de 25 pts/);
  win.remote(win.row(2,150));assert.match(win.summary(),/À 25 pts du record/);
});
test('réouverture sans partie en mémoire, vieux score sans status et dernier rang',()=>{
  const u=setup(13);u.a.openHall();assert.match(u.summary(),/Dernière tentative · 1976 · 112 pts/);
  assert.equal(u.get('tbody').children[0].children[3].textContent,'5/10 ✓');
});
