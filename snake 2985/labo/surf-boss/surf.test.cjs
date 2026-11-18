'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {setup,run,engine,surf,g,chase}=require('./rejouer.cjs');
const recordings=[];
for(const year of [1995,2985])test(year+' : bord véritable, gestes, impact, éjection et échappatoire',()=>{
  for(const mode of ['guidé','retard','passif','annuler','sortie','manqué','esquive','nouvelle-salve']){
    const r=run(year,mode),s=r.final;
    assert.equal(r.score,r.scoreBefore);assert.equal(r.status,'playing');
    if(mode==='esquive'){
      assert(r.switched);assert(!r.active);assert.equal(r.hp,r.apres);
    }else {
      assert(r.active && r.finished);
      assert.equal(s.flight,null);
      assert.equal(r.hp-r.apres,mode==='guidé'?(year===1995?9:12):0);
      const hits=r.log.filter(e=>e.type==='bossHit');
      assert.equal(hits.length,mode==='guidé'?1:0);
      if(hits.length)assert(r.log.find(e=>e.type==='surfPulse').t<hits[0].t);
      if(mode==='manqué')assert(r.log.some(e=>e.type==='surfPulse'));
      if(mode==='guidé')assert(r.trace.some(([,x,y])=>!Number.isInteger(x)&&!Number.isInteger(y)));
      assert(s.snake.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)));
      g.tick(s,s.stepTime*2+.0001);assert.equal(s.status,'playing');
    }
    const {final,...record}=r;recordings.push(record);
  }
  const rev=run(year,'guidé',28,12,true);assert(rev.hp>rev.apres);assert(rev.trace.every(tr=>tr[3]===1));
  for(const hp of [1,3]){
    const r=run(year,'guidé',7,5,false,hp);
    assert.equal(r.apres,1);assert.equal(r.final.status,'playing');assert.equal(r.score,r.scoreBefore);
    assert(!r.final.finishers.length);
  }
});
test('la porte suit le bord de la salve ; pause et temps invalide immobiles',()=>{
  const s=setup(2985),initial=surf.read(s);assert(initial);
  const a=s.boss.attack;
  for(const p of initial.edge){
    assert(!a.danger.has(p.y*36+p.x));
    assert([[1,0],[0,1],[-1,0],[0,-1]].some(([dx,dy])=>a.danger.has((p.y+dy)*36+p.x+dx)));
  }
  let last='';
  for(let i=0;i<130 && !s.flight;i++){
    const v=surf.read(s);if(!v)break;
    if(v.accessible)surf.action(s);
    else if(last!==s.snake[0].x+','+s.snake[0].y){chase(s,v.gate);last=s.snake[0].x+','+s.snake[0].y;}
    g.tick(s,1/60);
  }
  assert(s.flight?.surf);assert.equal(surf.action(s),false);
  const clock=s.elapsed,remaining=s.flight.remaining;
  for(const dt of [0,-.1,NaN,Infinity])g.tick(s,dt);
  assert.equal(s.elapsed,clock);assert.equal(s.flight.remaining,remaining);
  s.status='paused';g.tick(s,1);assert.equal(s.elapsed,clock);assert.equal(surf.action(s),false);
  s.status='playing';a.remaining=Infinity;
  for(let i=0;i<250&&s.flight;i++)g.tick(s,1/60);
  assert(!s.flight);assert.equal(s.status,'playing');assert(!s.events.some(e=>e.type==='bossHit'&&e.weapon==='surf'));
});
test('aucun portail chez les huit autres gardiens',()=>{
  for(const y of [1976,1985,1995,2185,2985]) for(const final of [true,false]){
    if(final && [1995,2985].includes(y))continue;
    const s=setup(y,7,5,false,final);
    assert(!surf.read(s));assert(!surf.action(s));
  }
});
test.after(()=>fs.writeFileSync(path.join(__dirname,'trajectoires.json'),JSON.stringify(recordings,null,2)+'\n'));
