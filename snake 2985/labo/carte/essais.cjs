'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const files=['../moteur.js','../bifurcation/bifurcation.js','carte.js'];
const years=[1976,1985,1995,2185,2985];
function env({db=new Map(),bundled=false,unavailable=false}={}){
  let focus;
  class El{
    constructor(tag){this.tag=tag;this.attrs={};this.dataset={};this.children=[];this.listeners={};}
    append(el){this.children.push(el);el.parent=this;}
    remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(k,fn){this.listeners[k]=fn;}
    emit(k,props={}){this.listeners[k]?.({target:this,preventDefault(){},stopPropagation(){},...props});}
    focus(){focus=this;}
    showModal(){this.open=true;}
    close(){this.open=false;this.emit('close');}
    all(){return [this,...this.children.flatMap(c=>c.all())];}
  }
  const doc={body:new El('body'),get activeElement(){return focus;},createElement:t=>new El(t),
    currentScript:{src:bundled?'https://example.test/jeu/arcade.js?v=ab':'https://example.test/jeu/labo/carte/carte.js',dataset:bundled?{musicRoot:'audio/'}:{}}};
  const ctx={document:doc,URL,Intl,localStorage:{getItem:k=>{if(unavailable)throw Error();return db.get(k);},setItem:(k,v)=>{if(unavailable)throw Error();db.set(k,v);}}};
  ctx.window=ctx;
  for(const f of files)vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
  return {api:ctx.SnakeCarte,eras:ctx.SnakeArcade.eras,bif:ctx.SnakeBifurcation,doc,db,get focus(){return focus;}};
}
const rows=(year,status,score=100,difficulty=10,endedAt=100)=>({year,status,score,difficulty,endedAt});
test('Première visite ; les quinze issues reprennent les destinations exactes de la bifurcation',()=>{
  for(const y of years)for(const status of ['dead','cleared','won']){
    const {api,bif}=env();
    assert.equal(api.resume([]),1976);assert.deepEqual([...api.progress([]).open],[1976]);
    const unlocked=[...api.progress([rows(y,status)]).open].sort();
    assert.deepEqual(unlocked,[...new Set([1976,y,...bif.destinations(y,status).map(row=>row.year)])].sort());
  }
});
test('Records agrégés, historique préservé et reprise à la dernière date réellement visitée',()=>{
  const {api,db}=env(),data=[rows(1976,'dead',400,5),rows(1995,'cleared',30,10,300),rows(1976,'cleared',25,10,200)];
  assert.equal(api.resume(data),1995);assert.equal(api.progress(data).info.get(1976).score,400);
  assert(api.progress(data).info.get(1976).won);assert.equal(api.progress(data).info.get(1976).cap,10);
  const before=JSON.stringify(data);api.visit(2185);api.visit(1985);assert.equal(api.resume(data),1985);
  const reload=env({db});assert.equal(reload.api.resume(data),1985);assert(reload.api.progress([]).open.has(2185));
  assert.equal(JSON.stringify(data),before);assert.equal(db.size,1);assert(!api.visit(1900));
});
test('Stockage refusé et données corrompues',()=>{
  const db=new Map([['snake2985.voyage.v1','x']]);assert.equal(env({db}).api.resume([]),1976);
  const {api}=env({unavailable:true});api.visit(2185);assert.equal(api.resume([]),2185);assert(api.progress([]).open.has(2185));
});
for(const bundled of [false,true])test('Toucher, clavier, verrouillage, focus et images '+(bundled?'du bundle':'du laboratoire'),()=>{
  const e=env({bundled}),opener=e.doc.createElement('button');e.doc.body.append(opener);opener.focus();
  const chosen=[];
  const dialog=e.api.open({year:1976,eras:e.eras,records:[]},r=>chosen.push(r));assert(dialog.root.open);
  assert.equal(e.api.open({year:1976,eras:e.eras},()=>{}),dialog);
  const all=dialog.root.all(),tabs=all.filter(b=>b.attrs.role==='tab'),launch=all.find(b=>b.className==='vc-depart');
  assert.equal(tabs.length,5);assert.equal(e.focus,tabs[0]);assert(!launch.disabled);
  const base=bundled?'https://example.test/jeu/':'https://example.test/jeu/labo/bifurcation/';
  for(const im of all.filter(b=>b.tag==='img'))assert(im.src.startsWith(base+'paysage-'));
  tabs[3].emit('click');assert(launch.disabled);assert.equal(e.api.resume([]),1976);launch.emit('click');assert.equal(chosen.length,0);
  dialog.root.emit('keydown',{key:'End',target:tabs[3]});assert.equal(e.focus,tabs[4]);
  assert.equal(all.find(n=>n.className==='vc-arsenal').textContent,e.eras[4].weapons.join(' · '));
  dialog.root.emit('cancel');assert.equal(e.focus,opener);assert.equal(chosen.length,0);
  const second=e.api.open({year:1976,eras:e.eras,records:[rows(1976,'dead'),rows(2185,'dead',830,6)]},r=>chosen.push(r));
  const ui=second.root.all();ui.filter(n=>n.attrs.role==='tab')[3].emit('click');
  const confirm=ui.find(b=>b.className==='vc-depart');
  assert.equal(confirm.textContent,'Battre mon record');assert(ui.find(n=>n.className==='vc-gardien').textContent.includes(e.eras[3].bosses[0]));
  confirm.emit('click');confirm.emit('click');assert.equal(chosen.length,1);assert.equal(chosen[0].year,2185);assert.equal(chosen[0].record,830);
  assert.equal(e.focus,opener);
});
test('Les cinq miniatures et les volumes de commandes sont présents dans la distribution source',()=>{
  for(const y of years){const raw=fs.readFileSync(path.join(__dirname,'../bifurcation','paysage-'+y+'.webp'));assert.equal(raw.toString('ascii',8,12),'WEBP');}
  const css=fs.readFileSync(path.join(__dirname,'carte.css'),'utf8');
  assert(css.includes('min-height:44px'));assert(css.includes('max-height:300px'));
});
