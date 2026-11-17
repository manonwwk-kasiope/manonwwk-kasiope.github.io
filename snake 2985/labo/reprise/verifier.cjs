'use strict';
const assert=require('node:assert/strict'), crypto=require('node:crypto');
global.window={};require('../moteur.js');
const engine=window.SnakeArcade,{create,flags}=require('./reprise.js');
const results=[];
const pt=(x,y,plane=0)=>({x,y,plane});
function scenario(id,configure,expected){
  const s=engine.create(()=>.25);s.drones=[];s.cells=[];s.gunClock=s.spawnClock=100;
  configure(s);
  const rec=create();rec.capture(s,0);
  for(let n=0;n<30&&s.status==='playing';n++){
    engine.tick(s,1/60);rec.capture(s,s.elapsed*1000);
  }
  assert.equal(s.status,'dead');assert.deepEqual([rec.death.kind,rec.death.x,rec.death.y,rec.death.plane],expected);
  const f=rec.frameAt(rec.bounds().end),j=rec.death.plane*648+rec.death.y*36+rec.death.x;
  if(id==='corps')assert.ok(f.cells[j]&flags.body);
  if(id==='drone')assert.ok(f.cells[j]&flags.next);
  if(id==='attaque')assert.ok(f.cells[j]&flags.active);
  if(id==='coque')assert.ok(f.cells[j]&flags.hull);
  const frozen=rec.bounds();s.snake[0].x=0;s.events.length=0;assert.equal(rec.capture(s,99999),false);assert.deepEqual(rec.bounds(),frozen);
  results.push({scenario:id,annotation:rec.death.kind,cause:s.cause,plane:rec.death.plane});
}
scenario('mur',s=>{s.snake=[pt(35,8),pt(34,8)];},['wall',36,8,0]);
scenario('corps',s=>{s.snake=[pt(10,8),pt(10,9),pt(11,9),pt(11,8),pt(12,8)];},['body',11,8,0]);
scenario('drone',s=>{
  assert.equal(engine.shiftPlane(s),true);s.drones=[{...pt(10,9,1),next:pt(9,9,1),warmup:0,moveIn:.11}];
},['drone',9,9,1]);
const boss=()=>({...pt(25,8,1),name:'Gardien témoin',moveIn:10,attackClock:9,stun:0});
scenario('attaque',s=>{
  assert.equal(engine.shiftPlane(s),true);s.boss={...boss(),attack:{plane:1,phase:'warning',remaining:.09,danger:new Set([9*36+9])}};
},['attack',9,9,1]);
scenario('coque',s=>{s.boss={...boss(),x:11,y:9,plane:0};},['hull',10,9,0]);
require('../../vol-libre.js');
const transit=engine.create(()=>.25),landingRecorder=create();
transit.eaten=1;assert.equal(window.SnakeFlight.offer(transit),true);
assert.equal(window.SnakeFlight.enter(transit),true);
transit.cells=Array.from({length:648},(_,j)=>pt(j%36,Math.floor(j/36)));
landingRecorder.capture(transit,0);
assert.equal(window.SnakeFlight.land(transit),false);
landingRecorder.capture(transit,11);
assert.equal(landingRecorder.frameAt(0).flight,true);
assert.equal(landingRecorder.death.kind,'landing');
results.push({scenario:'transit',annotation:'landing',cause:transit.cause,plane:0});
const rec=create(),s=engine.create(()=>.25);
for(let t=0;t<=600000;t+=10){s.snake[0].x=(t/100)%35;rec.capture(s,t);}
s.cause='Transit saturé';s.status='dead';rec.capture(s,600013);
assert.equal(rec.death.kind,'landing');assert.deepEqual(rec.bounds(),{start:598013,end:600013,count:42});
const before=(f)=>crypto.createHash('sha256').update(f.cells).update(JSON.stringify([f.x,f.y,f.plane,f.t])).digest('hex');
const times=[598013,598399,598888,600013],hashes=times.map(t=>before(rec.frameAt(t)));
s.drones.length=s.snake.length=0;const copy=rec.frameAt(598399);copy.cells.fill(255);
assert.deepEqual(times.toReversed().map(t=>before(rec.frameAt(t))).reverse(),hashes);
assert.ok(rec.storageBytes<56000);const storageBytes=rec.storageBytes;
rec.reset();assert.equal(rec.frameAt(0),null);assert.equal(rec.death,null);
console.log(JSON.stringify({actualEngineCollisions:results,simulationSeconds:600,retainedFrames:42,storageBytes,rewindHashes:hashes},null,2));
