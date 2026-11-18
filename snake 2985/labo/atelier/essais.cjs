'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {test}=require('node:test');
const workshop=require('./atelier.js');
const ctx={window:{}};
for(const f of ['../../forge.js','../evolution/evolution.js','../moteur.js']){
  let code=fs.readFileSync(path.join(__dirname,f),'utf8');
  if(f.endsWith('moteur.js'))code=code.replace('window.SnakeArcade = {','window.SnakeArcade = {forgeHooks,');
  vm.runInNewContext(code,ctx);
}
const {SnakeArcade:engine,SnakeEvolution:evo,SnakeForge:forge}=ctx.window;
ctx.window.SnakeForge=evo.install(forge);
function open(era,core,mod){
  const s=engine.create(()=>.45,era);s.difficulty=4;s.sector=4;s.sectorCells=1;s.drones=[];s.gunClock=1000;
  s.cells=[{x:10,y:9,plane:0}];
  s.levels.arc=2;s.score=600;
  forge.equip(s,core,mod);
  for(let i=0;i<60&&!s.boss;i++)engine.tick(s,1/60);
  assert.equal(s.boss.kind,'mid');assert(!workshop.available(s));
  const hooks=engine.forgeHooks(s);
  while(s.boss)hooks.damage(s.boss,3);
  assert(workshop.available(s));
  return s;
}
for(let era=0;era<5;era++){
  test(engine.eras[era].year+' · neuf recettes d’entrée et trois choix intermédiaires',()=>{
    for(const core of forge.cores)for(const mod of forge.mods)for(const choice of forge.cores){
      const s=open(era,core.id,mod.id);
      const score=s.score,energy=s.novaCharge,levels={...s.levels},length=s.snake.length;
      const shots=s.forge.projectiles.slice(),clock=s.forge.clock,elapsed=s.elapsed;
      const prevSnake=s.snake,receiptEvents=[];let captured;
      const archives={tick:state=>{captured=state;receiptEvents.push(state.events.at(-1));}};
      const r=workshop.apply(s,choice.id,{forge,archives});assert(r);
      assert.equal(captured,s);assert.equal(s.status,'upgrade');assert(!workshop.available(s));
      assert.equal(s.forge.core,choice.id);assert.equal(s.forge.mod,mod.id);
      assert.equal(s.score,score);assert.equal(s.novaCharge,energy);assert.equal(s.elapsed,elapsed);
      assert.equal(s.snake.length,length);assert.equal(s.snake,prevSnake);assert.deepEqual({...s.levels},levels);
      assert.equal(s.forge.clock,clock);assert.equal(s.difficulty,5);assert.equal(s.nextBossKind,'final');
      assert.equal(receiptEvents[0],r);assert.equal(workshop.receipt(s),r);
      assert.equal(r.changed,core.id!==choice.id);assert.equal(r.year,engine.eras[era].year);
      assert.equal(workshop.apply(s,choice.id,{forge,archives}),null);assert.equal(receiptEvents.length,1);
      if(!r.changed)assert.deepEqual(s.forge.projectiles,shots);
      assert(engine.upgrade(s,'arc'));assert.equal(s.levels.arc,levels.arc+1);
      engine.tick(s,1/60);assert.equal(s.status,'playing');
      const h=engine.forgeHooks(s);s.evolution.marks.length=0;s.forge.clock=0;
      ctx.window.SnakeForge.update(s,1/60,h);
      const m=s.evolution.marks[0];
      assert.equal(m.core,choice.id);assert.equal(m.mod,mod.id);assert.equal(m.kind,evo.eras[era].kind);
    }
  });
}
test('Un atelier ordinaire et le gardien final ne proposent pas le changement',()=>{
  const s=engine.create(()=>.42,2);
  for(const difficulty of [3,7,9,10]){s.status='upgrade';s.difficulty=difficulty;assert(!workshop.available(s));}
  const live=open(1,'orbit','echo');assert.equal(workshop.apply(live,'inconnu',{forge}),null);assert(workshop.available(live));
});
module.exports={open,forge,ctx};
test('Banc réel, archives réelles et commandes tactiles/clavier',()=>{
  let focus;const frames=[];
  const brush=new Proxy({},{get:(o,k)=>o[k]??(()=>{})});
  class El{
    constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};}
    append(node){this.children.push(node);node.parent=this;}
    remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(k,f){this.listeners[k]=f;}
    focus(){focus=this;}
    getContext(){return brush;}
    all(){return [this,...this.children.flatMap(c=>c.all())];}
  }
  const doc={readyState:'complete',getElementById:()=>null,createElement:t=>new El(t),addEventListener(){},body:new El('body')};
  const win={document:doc,addEventListener(){},btoa,atob,console,Intl,matchMedia:()=>({matches:false})};
  win.window=win;
  for(const file of ['../../palmares.js','../../forge.js','../artillerie/artillerie.js','../chrono/chrono.js','../reprise/reprise.js','../campagne/archives.js','../campagne/banc.js','atelier.js'])
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),win);
  win.SnakeSprites={draw(){}};
  const draw=win.SnakeArtillerie.draw;
  win.SnakeArtillerie={draw(c,s,...rest){frames.push({s,core:s.forge.core,mod:s.forge.mod,model:s.forge.orbits.length+s.forge.projectiles.length});draw(c,s,...rest);}};
  for(const reduced of [false,true]){
    const s=open(3,'orbit','echo'),host=new El('div'),id=win.SnakeArchives.newRun(s);
    const before=s.score,beforeClock=s.elapsed,replies=[];
    const api=win.SnakeAtelier,opts={forge:win.SnakeForge,banc:win.SnakeBanc,archives:win.SnakeArchives,reduced,onDone:r=>replies.push(r)};
    const p=api.mount(host,s,opts);
    assert.equal(api.mount(host,s,opts),p);assert.equal(host.children.length,1);
    const controls=p.root.all().filter(n=>n.tag==='button');
    assert.equal(controls.length,4);assert.equal(focus,controls[3]);assert.equal(focus.textContent,'Garder ma recette');
    function key(k,target){p.root.listeners.keydown({key:k,target,preventDefault(){}});}
    controls[1].listeners.click();assert.equal(controls[1].attrs['aria-pressed'],'true');
    assert.equal(s.forge.core,'orbit');
    const n=frames.length;
    p.frame(100);p.frame(150);p.frame(200);
    assert(reduced?frames.length===n:frames.length>n);
    assert(frames.at(-1).s!==s);assert.equal(frames.at(-1).core,'prism');
    assert.equal(frames.at(-1).mod,'echo');assert(frames.at(-1).model>0);
    key('Escape',controls[1]);assert.equal(focus,controls[3]);
    key('End',focus);assert.equal(focus,controls[2]);key('Enter',focus);
    assert.equal(replies.length,1);assert.equal(s.forge.core,'well');assert.equal(s.forge.mod,'echo');
    assert.equal(s.score,before);assert.equal(s.elapsed,beforeClock);assert.equal(win.SnakeArchives.newRun(s),id);
    assert.equal(host.children.length,0);const count=frames.length;p.frame(777);assert.equal(frames.length,count);
  }
});
