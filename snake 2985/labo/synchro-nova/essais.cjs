'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
require('./accents.js');const sig=require('./synchro.js'),gridClock=require('../audio/horloge.js'),rows=require('../audio/pouls.json');
const {measure}=require('./mesures.cjs');
const ctx={window:{}};
for(const f of ['../../forge.js','../moteur.js','../surcharges/surcharges.js'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
const engine=ctx.window.SnakeArcade;
function arena(era){
  const s=engine.create(()=>.27,era);s.drones=[{x:10,y:9,plane:0,id:44,warmup:0}];s.events=[];return s;
}
for(const [era,row] of global.SnakeNovaAccents.entries()){
  test(row.year+' · délai, dégâts, score et contrôle des entrées',()=>{
    for(const turbo of [false,true])for(const ms of [-79,-20,0,79,81,250]){
      const plain=arena(era),special=arena(era);engine.turbo(plain,turbo);engine.turbo(special,turbo);
      const beat={playing:true,mediaTime:row.accents[3]+ms*.001*row.rate};
      const t=special.elapsed;
      let calls=0;
      const triggered=sig.fire(special,beat,s=>{calls++;assert.equal(s.elapsed,t);assert.equal(s.novaCharge,1);return engine.fire(s);});
      assert(triggered);assert.equal(calls,1);assert(engine.fire(plain));
      assert.equal(special.score,plain.score);assert.equal(special.kills,plain.kills);
      assert.deepEqual(special.effects,plain.effects);assert.equal(special.elapsed,t);
      assert.deepEqual(Array.from(special.events.filter(e=>e.type!=='novaSync')),Array.from(plain.events));
      const hit=Math.abs(ms)<=80;
      assert.equal(special.novaCharge,hit?.06:0);assert.equal(special.events.some(e=>e.type==='novaSync'),hit);
      for(let i=0;i<100;i++)assert(!sig.fire(special,beat,engine.fire));
      assert.equal(special.novaCharge,hit?.06:0);
    }
  });
}
test('Une recharge externe rapide et des entrées répétées ne cumulent pas les remboursements',()=>{
  const s=arena(0),row=global.SnakeNovaAccents[0],beat={playing:true,mediaTime:row.accents[2]};
  for(let i=0;i<40;i++){
    s.elapsed=i*.1;s.novaCharge=1;
    assert(sig.fire(s,beat,engine.fire));
  }
  assert.equal(s.events.filter(e=>e.type==='novaSync').length,1);
  s.elapsed=4.1;s.novaCharge=1;sig.fire(s,beat,engine.fire);assert.equal(s.novaCharge,.06);
});
test('Pause, arrêt de transport, absence de pouls et dégâts du boss',()=>{
  const s=arena(1),beat={mediaTime:global.SnakeNovaAccents[1].accents[5],playing:false};
  s.status='upgrade';assert(!sig.fire(s,beat,engine.fire));assert.equal(s.novaCharge,1);
  s.status='playing';assert(sig.fire(s,beat,engine.fire));assert.equal(s.novaCharge,0);assert.equal(sig.cue(s,null),'off');
  for(const weak of [true,false]){
    const p=arena(1),q=arena(1);
    for(const t of [p,q])t.boss={x:12,y:9,plane:0,hp:70,weak,kind:'mid'};
    engine.fire(p);sig.fire(q,{...beat,playing:true},engine.fire);
    assert.equal(p.boss.hp,q.boss.hp);
  }
});
test('Horloge muette et horloge média aux deux extrémités de la boucle et après pause',()=>{
  for(const row of global.SnakeNovaAccents){
    const info=rows.find(r=>r.year===row.year),s=arena(rows.indexOf(info)),position=row.accents.at(-1);
    const muted=gridClock.create(rows,row.year),audio=gridClock.create(rows,row.year);
    for(const c of [muted,audio])c.sample({now:0,mediaTime:position,playing:true,audible:true});
    for(const [t,playing] of [[.01,true],[.22,true],[.22,false],[5,false],[5,true],[5.13,true]]){
      const a=muted.sample({now:t,playing,audible:false});
      const media=position+Math.min(t,.22)*row.rate+Math.max(0,t-5)*row.rate;
      const b=audio.sample({now:t,playing,audible:true,mediaTime:media});
      assert.equal(sig.cue(s,a),sig.cue(s,b));
    }
  }
  assert(measure().every(x=>x.décisionsDifférentes===0));
});
test('Une sur-nova garde toutes ses règles natives et les entrées restent dans le même appel',()=>{
  const s=arena(4),kit=ctx.window.SnakeSurcharges.install(engine,ctx.window.SnakeForge);
  const beat={playing:true,mediaTime:global.SnakeNovaAccents[4].accents[3]};s.eaten=2;
  assert(sig.fire(s,beat,kit.engine.fire));
  const types=s.events.map(e=>e.type);assert(types.includes('novaOverload'));assert.equal(types.at(-1),'novaSync');
  assert.equal(ctx.window.SnakeSurcharges.read(s).cells,0);
});
test('Repère HUD dédié : compteur préservé, seul le bouton Nova existant reçoit le geste',()=>{
  const counter={},nodes=[{},counter],button={lastElementChild:counter,ownerDocument:{createElement:t=>({tag:t,dataset:{},setAttribute(){}})},
    insertBefore(mark,node){nodes.splice(nodes.indexOf(node),0,mark);}};
  const s=arena(0),row=global.SnakeNovaAccents[0],beat={playing:true,mediaTime:row.accents[0]-.18*row.rate};
  assert.equal(sig.paint(button,s,beat),'approach');assert.equal(sig.paint(button,s,beat,true),'off');
  beat.mediaTime=row.accents[0];assert.equal(sig.paint(button,s,beat,true),'hit');
  assert.equal(nodes.length,3);assert.equal(nodes.at(-1),counter);
});
