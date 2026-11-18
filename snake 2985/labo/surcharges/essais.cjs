'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sig=require('./surcharges.js');
function bench(era){
  const ctx={window:{}};
  for(const file of ['../../forge.js','../moteur.js']){
    let src=fs.readFileSync(path.join(__dirname,file),'utf8');
    if(file.endsWith('moteur.js'))src=src.replace('window.SnakeArcade = {','window.SnakeArcade = {forgeHooks,');
    vm.runInNewContext(src,ctx);
  }
  const raw=ctx.window.SnakeArcade,kit=sig.install(raw,ctx.window.SnakeForge);ctx.window.SnakeForge=kit.forge;
  const s=kit.engine.create(()=>.4,era);s.gunClock=s.spawnClock=s.forge.clock=999;s.drones=[];
  function eat(){
    const n=s.eaten,head=s.snake[0];s.cells=[{x:head.x+1,y:head.y,plane:s.plane}];
    for(let i=0;i<90&&s.eaten===n;i++)kit.engine.tick(s,1/60);
    assert.equal(s.eaten,n+1);
  }
  return {s,...kit,raw,eat,h:raw.forgeHooks(s)};
}
function midpoint(p){
  return p.kind==='ring'?{x:p.x+p.r,y:p.y,plane:p.plane}:{x:(p.ax+p.bx)/2,y:(p.ay+p.by)/2,plane:p.plane};
}
for(let era=0;era<5;era++){
  test('Profil '+era+' · collecte réelle, visée, plan, limite et durée',()=>{
    const {s,engine,forge,eat,h}=bench(era);
    eat();assert.equal(sig.read(s).cells,1);eat();assert(sig.read(s).ready);
    assert(engine.fire(s));assert(!engine.fire(s));assert.equal(sig.read(s).cells,0);
    const events=s.events.map(e=>e.type);assert(events.indexOf('novaOverload')>events.indexOf('nova'));
    const path=sig.geometry(s)[0],pos=midpoint(path),count=6;
    s.drones=Array.from({length:count},(_,id)=>({...pos,id,warmup:id===1?1:0,plane:id===0?1-pos.plane:pos.plane}));
    forge.update(s,1/600,h);
    assert.equal(s.drones.length,3);assert(s.drones.some(d=>d.id===0));assert(s.drones.some(d=>d.id===1));
    for(let i=0;i<150;i++)forge.update(s,1/60,h);
    assert.equal(s.drones.length,3);assert.equal(sig.geometry(s).length,0);assert.equal(sig.read(s).active,null);
    assert.equal(s.events.filter(e=>e.type==='novaOverloadHit').length,3);
  });
  test('Profil '+era+' · bouclier du gardien, exposition et impact unique',()=>{
    const {s,engine,forge,eat,h}=bench(era);eat();eat();engine.fire(s);
    s.boss={...midpoint(sig.geometry(s)[0]),weak:false,hp:20};forge.update(s,.001,h);assert.equal(s.boss.hp,20);
    s.boss.weak=true;forge.update(s,.001,h);assert.equal(s.boss.hp,18);
    forge.update(s,.001,h);assert.equal(s.boss.hp,18);
  });
}
test('Nova réussie réinitialise les cellules ; Nova refusée conserve la préparation',()=>{
  const {s,engine,eat}=bench(1);eat();engine.fire(s);assert(!sig.read(s).active);eat();eat();
  assert.equal(sig.read(s).cells,2);assert(!engine.fire(s));assert.equal(sig.read(s).cells,2);
  s.novaCharge=1;assert(engine.fire(s));assert(sig.read(s).active);
});
test('Les deux anneaux de 2985 frappent dans leur ordre sur des plans distincts',()=>{
  const {s,engine,forge,h,eat}=bench(4);eat();eat();engine.fire(s);
  for(let i=0;i<34;i++)forge.update(s,1/60,h);
  const [p]=sig.geometry(s);assert.equal(p.stage,1);assert.equal(p.plane,1);
  const b=midpoint(p);s.drones=[{...b,id:8,warmup:0}];forge.update(s,.001,h);assert.equal(s.drones.length,0);
});
test('Le carreau rebondit sur une paroi et le train reproduit son parcours sans diagonale',()=>{
  for(const era of [1,2]){
    const {s,engine,forge,h,eat}=bench(era);eat();eat();
    if(era===1){const offset=s.width-3-s.snake[0].x;s.snake.forEach(p=>p.x+=offset);}
    if(era===2){engine.turn(s,0,1);for(let i=0;i<22;i++)engine.tick(s,1/60);}
    engine.fire(s);const paths=new Map();
    for(let i=0;i<150;i++){for(const p of sig.geometry(s))paths.set(p.stage,p);forge.update(s,1/60,h);}
    assert(paths.size>=2);const ps=[...paths.values()].sort((a,b)=>a.stage-b.stage);
    for(let i=1;i<ps.length;i++){assert.equal(ps[i-1].bx,ps[i].ax);assert.equal(ps[i-1].by,ps[i].ay);}
    if(era===1){assert.equal(ps[0].bx,s.width-1);assert(ps[1].bx<ps[0].bx);}
    else {assert(ps.some(p=>p.ax===p.bx));assert(ps.some(p=>p.ay===p.by));}
  }
});
test('A/B à commandes identiques : les cinq surcharges éliminent une cible hors de la Nova ordinaire',()=>{
  for(let era=0;era<5;era++){
    function prepare(){
      const box=bench(era),{s,eat,engine}=box;eat();eat();s.cells=[];
      const goal=s.snake[0].x+9;
      while(s.snake[0].x<goal)engine.tick(s,1/60);
      return box;
    }
    const spy=prepare();spy.engine.fire(spy.s);
    let victim;
    for(let i=0;i<150&&!victim;i++){
      spy.forge.update(spy.s,1/60,spy.h);
      for(const p of sig.geometry(spy.s)){
        for(let y=1;y<spy.s.height-1&&!victim;y++)for(let x=1;x<spy.s.width-1&&!victim;x++){
          const t={x,y,plane:p.plane},head=spy.s.snake[0];
          if((p.plane!==spy.s.plane||Math.hypot(x-head.x,y-head.y)>spy.s.novaRadius+.01)&&sig.touches(p,t))victim=t;
        }
      }
    }
    assert(victim,'Cible supplémentaire possible en '+spy.s.year);
    for(const enabled of [false,true]){
      const live=prepare(),s=live.s;
      s.drones=[{...victim,id:100,warmup:0,next:victim,moveIn:99,moveEvery:99}];
      assert((enabled?live.engine:live.raw).fire(s));
      assert.equal(s.drones.length,1);
      for(let i=0;i<150;i++)live.forge.update(s,1/60,live.h);
      assert.equal(s.drones.length,enabled?0:1);
    }
  }
});
test('Le convoi traverse un ancien étage uniquement quand le corps y a réellement roulé',()=>{
  const {s,engine,forge,eat,h}=bench(2);eat();eat();s.cells=[];
  for(let i=0;i<36;i++)engine.tick(s,1/60);
  assert(engine.shiftPlane(s));
  for(let i=0;i<28;i++)engine.tick(s,1/60);
  assert(engine.fire(s));const planes=new Set();
  for(let i=0;i<150;i++){
    for(const p of sig.geometry(s)){
      planes.add(p.plane);
      assert.equal(p.ay,p.by);assert(Math.abs(p.ax-p.bx)<=1.001);
      assert.equal(p.width,2.2);
    }
    forge.update(s,1/60,h);
  }
  assert.deepEqual([...planes].sort(),[0,1]);
});
test('1995 : diriger la voie après le tir permet de faucher un drone hors du rayon natif',()=>{
  for(const steer of [false,true]){
    const {s,engine,eat}=bench(2);eat();eat();s.cells=[];
    const tile={x:s.snake[0].x+8,y:s.snake[0].y+1,plane:0};
    s.drones=[{...tile,next:tile,warmup:0,id:901,moveIn:100,moveEvery:100}];
    assert(engine.fire(s));assert.equal(s.drones.length,1);
    if(steer)engine.turn(s,0,-1);
    for(let i=0;i<122&&s.status==='playing';i++)engine.tick(s,1/60);
    assert.equal(s.drones.some(d=>d.id===901),steer);
  }
});
