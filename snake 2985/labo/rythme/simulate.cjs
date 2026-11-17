'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const director=require('./directeur.js'), ctx={window:{}};
for(const file of ['../../vol-libre.js','../moteur.js'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);
const {SnakeArcade:engine,SnakeFlight:flight}=ctx.window;
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
function steer(s,target){
  const head=s.snake[0], queue=[[head.x,head.y, ...[s.direction.x,s.direction.y],null]], visited=new Set();
  for(let i=0;i<queue.length;i++){
    const [x,y,dx,dy,first]=queue[i];
    if(first && x===target.x && y===target.y){engine.turn(s,...first);return;}
    for(const dir of dirs){
      const [vx,vy]=dir,px=x+vx,py=y+vy,key=px+','+py+','+vx+','+vy;
      if(dx*vx+dy*vy<0||visited.has(key)||px<1||py<1||px>=s.width-1||py>=s.height-1)continue;
      if(s.snake.slice(0,-1).some(q=>q.x===px&&q.y===py&&q.plane===s.plane))continue;
      visited.add(key);queue.push([px,py,vx,vy,first||dir]);
    }
  }
}
function run(year,mode) {
  const era=engine.eras.findIndex(item=>item.year===year);
  assert(era>=0,'Époque moteur absente : '+year);
  const s=engine.create(()=>.3,era),d=director.create(),log=[];
  // Isolate the actual grid and flight locomotion from random pickups and enemies.
  s.drones=[];s.cells=[];s.spawnClock=999;s.gunClock=999;
  if(year===2185){s.eaten=1;s.flightGate={x:17,y:9,plane:0};}
  let w=0,prev='', pts=0;
  const loop=[{x:mode==='ignore'?9:22,y:mode==='ignore'?4:9},{x:22,y:14},{x:5,y:14},{x:5,y:4},{x:22,y:4}];
  for(let frame=0;frame<60*23;frame++){
    const h=s.snake[0],o=d.offer;
    if(s.flight){const ring=s.flight.rings[s.flight.passed];engine.turn(s,ring.x-h.x,ring.y-h.y);}
    else{
      if(h.x===loop[w].x && h.y===loop[w].y)w=(w+1)%loop.length;
      let target=loop[w];
      if(o?.kind==='aiguillage' && mode==='ignore')target=o.anchors[3];
      if(o && mode==='engage'){
        const [a,b,c]=o.anchors;
        if(o.kind==='convoi'){
          if(o.elapsed<2 && s.plane===a.plane){engine.shiftPlane(s);}
          target=b;
          if(o.elapsed>=2 && s.plane!==b.plane)engine.shiftPlane(s);
        }else if(o.kind==='aiguillage'){
          const start=o.anchors[4], vx=Math.sign(start.x-a.x),vy=Math.sign(start.y-a.y);
          const entry={x:a.x-vx,y:a.y-vy};
          target=o.step===0?a:o.step===1?b:c;
          if(o.step===0 && (d.phase==='warning' || (h.x!==entry.x || h.y!==entry.y)))target=entry;
        }else if(o.kind==='surf')target=a;
        else{
          target=o.step===0?a:o.step===1?b:c;
          if(o.step===0 && d.phase==='active' && Math.hypot(h.x-a.x,h.y-a.y)<=1 && s.plane===a.plane)
            engine.shiftPlane(s);
          if(o.step===2 && c && s.plane!==c.plane)engine.shiftPlane(s);
        }
      }
      const key=h.x+','+h.y+','+s.plane+','+target.x+','+target.y;
      if(key!==prev){steer(s,target);prev=key;}
    }
    engine.tick(s,1/60);
    assert.equal(s.status,'playing','déplacement '+era+' '+mode+' '+frame+' '+s.cause);
    const r=director.tick(d,s,1/60);pts+=r.points;
    for(const e of r.events)log.push({t:+((frame+1)/60).toFixed(2),...e});
    if(log.some(e=>e.type==='close'))break;
  }
  return {year,era,mode,points:pts,log};
}
let cases=[];
for(const era of [1976,1985,1995,2185,2985]){
  const engaged=run(era,'engage'),ignored=run(era,'ignore');cases.push(engaged,ignored);
  console.log(era,engaged.points,ignored.points,JSON.stringify(engaged.log));
  assert.equal(engaged.points,({1976:100,1985:160,1995:190,2185:200,2985:260})[era]);
  assert.equal(ignored.points,0);
  if(era===1995)assert.equal(ignored.log.at(-1).reason,'voie libre');
}
const s=engine.create(()=>.3,1), d=director.create();
for(let i=0;i<65;i++)director.tick(d,s,1/60);
assert(d.offer);
s.nearBoss=.87;assert(director.tick(d,s,1/60).suppressWaves);assert(!d.offer);
s.boss={};assert.equal(director.tick(d,s,1/60).events.length,0);
s.boss=null;s.nearBoss=0;director.tick(d,s,1/60);assert.equal(d.phase,'recovery');
for(let i=0;i<230;i++)director.tick(d,s,1/60);assert(!d.offer);
s.drones=[{...s.snake[0]},{...s.snake[0]}];
for(let i=0;i<360;i++)director.tick(d,s,1/60);assert.equal(d.phase,'recovery');
s.drones=[];for(let i=0;i<140;i++)director.tick(d,s,1/60);assert(d.offer);

// Vérifie le barème et la remise à zéro indépendamment du pilote.
const board=engine.create(()=>.2), clock=director.create();
board.drones=[];
function finishConvoy(take){
  const events=[];let award=0;
  for(let i=0;i<1000;i++){
    const o=clock.offer;
    if(o?.phase==='active' && o.elapsed>=2 && take){
      board.snake[0]={...o.anchors[1]};board.plane=board.snake[0].plane;
    }else if(o){board.plane=1-o.anchors[0].plane;board.snake[0]={x:10,y:8,plane:board.plane};}
    const r=director.tick(clock,board,1/60);events.push(...r.events);award+=r.points;
    if(events.some(e=>e.type==='close'))return award;
  }
  throw Error('Engagement absent');
}
assert.deepEqual([true,true,true,true,false,true].map(finishConvoy),[100,200,300,300,0,100]);

// Le train ferme uniquement le contrat ; entrer par le mauvais côté ne l'arme pas.
const express=engine.create(()=>.2,engine.eras.findIndex(e=>e.year===1995));
express.drones=[];
const expressClock=director.create();
while(expressClock.phase!=='active')director.tick(expressClock,express,1/60);
const [switchPoint,,,,trainStart]=expressClock.offer.anchors;
const unitX=Math.sign(trainStart.x-switchPoint.x),unitY=Math.sign(trainStart.y-switchPoint.y);
express.snake[0]={x:switchPoint.x+unitX,y:switchPoint.y+unitY,plane:switchPoint.plane};
director.tick(expressClock,express,1/60);
express.snake[0]={...switchPoint};director.tick(expressClock,express,1/60);
assert.equal(expressClock.offer.step,0);
express.snake[0]={...expressClock.offer.train};
const trainHit=director.tick(expressClock,express,1/60);
assert.equal(trainHit.events.at(-1).reason,'train');assert.equal(trainHit.points,0);
assert.equal(express.status,'playing');
fs.writeFileSync(path.join(__dirname,'prises.json'),JSON.stringify(cases,null,2)+'\n');
