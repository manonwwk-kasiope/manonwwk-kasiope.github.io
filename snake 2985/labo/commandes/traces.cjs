'use strict';
const assert=require('node:assert/strict');
const {createInput,createTurnBuffer}=require('./commandes.js');
const results=[];
for(const hz of [60,120])for(const mode of ['stick','swipe']){
  const events=[], c=createInput(e=>events.push(e),{mode});
  function input(phase,id,x,y,t,zone='pilot'){c.route({phase,id,x,y,t,zone});}
  // 240 CSS px/s sampled on frame boundaries. Latency measured from contact.
  input('down',1,0,0,0);
  for(let i=1;i<=hz/4;i++)input('move',1,240*i/hz,0,i*1000/hz);
  assert.equal(events.length,1);assert.equal(events[0].x,1);
  const firstTurn=events[0].t;
  input('up',1,60,0,251);input('down',1,10,50,260);
  input('move',1,11,48,264);input('move',1,25,35,270);
  assert.equal(events.length,1);
  input('move',1,10,23,285);
  assert.deepEqual([events.at(-1).x,events.at(-1).y],[0,-1]);
  input('down',2,0,0,288,'plane');input('up',2,0,0,320,'plane');
  assert.equal(events.at(-1).type,'plane');
  input('down',2,0,0,330,'nova');input('up',2,0,0,500,'nova');
  input('down',2,0,0,530,'nova');input('move',2,20,0,620,'nova');input('up',2,0,0,940,'nova');
  input('down',2,0,0,950,'nova');input('cancel',2,0,0,1250,'nova');
  assert.equal(events.length,3);
  input('down',2,0,0,1270,'nova');input('up',2,0,0,1550,'nova');assert.equal(events.at(-1).type,'nova');
  c.configure({mode,flying:true,angle:.3});
  input('down',1,0,0,2000);
  for(let i=1;i<=hz/4;i++)input('move',1,240*i/hz,120*i/hz,2000+1000*i/hz);
  const aims=events.filter(e=>e.type==='aim');assert.ok(aims.length);
  assert.ok(Math.abs(aims.at(-1).angle-(mode==='stick'?Math.atan2(.5,1):.3+60*Math.PI/66))<1e-9);
  input('up',1,60,30,2251);
  results.push({mode,hz,turnMs:firstTurn,aimMs:+(aims[0].t-2000).toFixed(2),novaHoldMs:280,events:events.length});
}
const simultaneous=[], multi=createInput(e=>simultaneous.push(e),{flying:true});
function send(phase,id,x,y,t,zone){multi.route({phase,id,x,y,t,zone});}
send('down',1,10,40,0,'pilot');send('down',2,400,80,1,'nova');
send('move',1,20,50,20,'pilot');send('move',1,10,15,110,'pilot');
send('up',2,400,80,281,'nova');send('move',1,30,40,282,'pilot');
assert.deepEqual(simultaneous.map(e=>e.type),['aim','aim','nova','aim']);
// Inputs arrive 2 and 1 ms before a grid boundary at 190 ms.
const buffer=createTurnBuffer(),right={x:1,y:0},down={x:0,y:1},left={x:-1,y:0};
let heading=right;
const checkpoints=[];
for(const [timestamp,intent] of [[187,left],[188,down],[189,left],[189.5,down],[190,null],[380,null],[570,null]]) {
  if(intent)checkpoints.push([timestamp,buffer.offer(heading,intent)]);
  else{ heading=buffer.step(heading);checkpoints.push([timestamp,heading]);}
}
assert.deepEqual(checkpoints,[[187,false],[188,true],[189,true],[189.5,false],[190,down],[380,left],[570,left]]);
buffer.offer(left,down);buffer.reset();assert.deepEqual(buffer.step(left),left);
console.log(JSON.stringify({gestures:results,turnBuffer:checkpoints,simultaneous},null,2));
