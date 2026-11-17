'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const ctx={window:{}};
for(const file of ['../../forge.js','../moteur.js','evolution.js']) {
  let src=fs.readFileSync(path.join(__dirname,file),'utf8');
  if(file.endsWith('moteur.js'))src=src.replace('window.SnakeArcade = {','window.SnakeArcade = {forgeHooks,enterBoss,');
  vm.runInNewContext(src,ctx);
}
const {SnakeArcade:engine,SnakeEvolution:evo,SnakeForge:forge}=ctx.window;
function trial(era,core,mod,action,scene) {
  const s=engine.create(()=>.41,era);s.drones=[];s.cells=[];
  s.snake=[{x:10,y:9,plane:0},{x:9,y:9,plane:0},{x:8,y:9,plane:0}];
  forge.equip(s,core,mod);
  const h=engine.forgeHooks(s), instrument=evo.wrap(s,h);
  instrument.emit('forgeShot',{core,mod,plane:0,x:10,y:9});
  const m=s.evolution.marks[0], year=s.year, desiredPlane=year===2185?1:0;
  const point=(x,y,plane=0)=>({x,y,plane});
  const pose=(head,dir={x:1,y:0},third=s.snake[2])=>{
    s.snake[0]=head;s.plane=head.plane;s.direction=dir;s.snake[2]=third;evo.update(s,1/60,h);
  };
  const final=year===2985?point(m.x,m.y+2):year===1985?point(m.x+2,m.y):year===2185?point(m.x,m.y,1):point(m.x,m.y);
  const dir=year===1995?{x:m.dx,y:m.dy}:year===1976?{x:0,y:1}:year===2985?{x:0,y:-1}:{x:1,y:0};
  const at=core==='well'?m:final;
  const target=point(at.x+dir.x*2,at.y+dir.y*2,desiredPlane);
  let before=0;
  if(scene.startsWith('boss')){
    s.difficulty=10;engine.enterBoss(s);
    Object.assign(s.boss,{...target,weak:scene==='boss'});before=s.boss.hp;
  } else {
    for(const [i,delta] of [0,2,4].entries()){
      const p=point(target.x+dir.x*delta,target.y+dir.y*delta,desiredPlane);
      s.drones.push({...p,next:p,id:100+i,warmup:0});
    }
    s.drones.push({...target,id:103,plane:1-desiredPlane,warmup:0});
  }
  if(year===1995) {
    if(action)pose(m.first,{x:m.inX,y:m.inY});
    pose(final,dir);
  }
  if(year===1976)pose(final,action?dir:{x:1,y:0});
  if(year===1985){pose(point(m.x,m.y));pose(final,dir,action?point(m.x,m.y):point(1,1));}
  if(year===2185)pose(action?final:point(final.x,final.y),dir);
  if(year===2985){pose(point(m.x,m.y));pose(action?final:point(m.x+2,m.y),dir);}
  for(let i=0;i<40;i++)evo.update(s,1/60,h);
  if(scene==='pack')assert(s.drones.some(d=>d.id===103));
  return {s,h,m,instrument,loss:before-(s.boss?.hp??0)};
}
for(let era=0;era<5;era++)for(const {id:core} of forge.cores)for(const {id:mod} of forge.mods){
  test([evo.eras[era].name,core,mod].join(' / '),()=>{
    for(const scene of ['boss','bossBlindé','pack']){
      const yes=trial(era,core,mod,true,scene), no=trial(era,core,mod,false,scene);
      assert.equal(no.s.evolution.activations,0);assert.equal(no.loss,0);assert.equal(no.s.kills,0);
      assert.equal(yes.s.evolution.activations,1);
      assert(yes.s.evolution.impulses<=3);
      if(scene.startsWith('boss'))assert.equal(yes.loss,scene==='boss'?6:3);
      else assert.equal(yes.s.kills,mod==='echo'?1:3-(mod==='blast'?1:0));
      for(let j=0;j<100;j++)yes.instrument.emit('forgeShot',{core,mod,plane:0});
      assert.equal(yes.s.evolution.marks.length,0);
    }
  });
}
test('Intégration du moteur et de la forge décorée, sans doubler l’installation',()=>{
  const installed=evo.install(forge);assert.equal(evo.install(installed),installed);
  ctx.window.SnakeForge=installed;
  const s=engine.create(()=>.43,1);s.drones=[];s.cells=[];s.gunClock=100;
  engine.tick(s,.001);
  assert.equal(s.evolution.marks.length,1);
  for(let i=0;i<70;i++)engine.tick(s,1/60);
  assert.equal(s.evolution.activations,1);
});

test('Une position immobile ne produit plus de relais après la recharge',()=>{
  const {s,h,instrument}=trial(3,'well','echo',true,'boss');
  for(let i=0;i<300;i++)evo.update(s,1/60,h);
  s.snake[0]={x:10,y:9,plane:0};s.plane=0;
  instrument.emit('forgeShot',{core:'well',mod:'echo',plane:0});
  assert.equal(s.evolution.marks.length,0);
  s.snake[0].x+=3;
  instrument.emit('forgeShot',{core:'well',mod:'echo',plane:0});
  assert.equal(s.evolution.marks.length,1);
});

test('Les 45 signatures se déclenchent au pilotage avec les commandes publiques du moteur',()=>{
  ctx.window.SnakeForge=evo.install(forge);
  assert.deepEqual(Array.from(engine.eras,e=>e.year),Array.from(evo.eras,e=>e.year));
  for(const [i,era] of engine.eras.entries()) for(const core of forge.cores) for(const mod of forge.mods){
    const s=engine.create(()=>.42,i);
    s.drones=[];s.cells=[];s.gunClock=s.spawnClock=1000;
    forge.equip(s,core.id,mod.id);
    engine.tick(s,.001);
    const m=s.evolution.marks[0];
    assert.equal(m.kind,evo.eras[i].kind);
    let issued=false;
    for(let frame=0;frame<100 && !s.evolution.activations;frame++){
      const head=s.snake[0];
      if(!issued){
        if(era.year===1976) issued=engine.turn(s,m.dx,m.dy);
        if(era.year===1995 && head.x===m.first.x && head.y===m.first.y) issued=engine.turn(s,m.dx,m.dy);
        if(era.year===2185) issued=engine.shiftPlane(s);
        if(era.year===2985 && head.x===m.x && head.y===m.y) issued=engine.turn(s,0,1);
      }
      engine.tick(s,1/60);
    }
    assert.equal(s.evolution.activations,1,[era.year,core.id,mod.id].join('/'));
    assert.equal(s.status,'playing');
    if(era.year===1995)assert(s.evolution.effects.some(e=>e.kind==='switchRail'));
  }
});
