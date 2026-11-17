'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path');
global.window={};
require('../../forge.js'); require('../../vol-libre.js'); require('../moteur.js');
const engine=window.SnakeArcade, chrono=require('./chrono.js');
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function steer(s) {
  const head=s.snake[0], obstacles=new Set(), goals=new Set(), key=(x,y)=>s.width*y+x;
  for (const p of s.snake.slice(1,-1)) if(p.plane===s.plane) obstacles.add(key(p.x,p.y));
  for (const d of s.drones) if(d.plane===s.plane) { obstacles.add(key(d.x,d.y));obstacles.add(key(d.next.x,d.next.y)); }
  if (s.boss && s.boss.plane===s.plane) for(const b of [s.boss,s.boss.next]) {
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++) obstacles.add(key(b.x+dx,b.y+dy));
  }
  for(const p of s.cells) if(p.plane===s.plane) goals.add(key(p.x,p.y));
  const queue=[{x:head.x,y:head.y,first:null}],visited=new Set([key(head.x,head.y)]);
  for(let i=0;i<queue.length;i++){
    const node=queue[i];
    if(node.first && goals.has(key(node.x,node.y))){engine.turn(s,...node.first);return;}
    for(const d of dirs){
      if(!node.first && d[0]*s.direction.x+d[1]*s.direction.y<0) continue;
      const x=node.x+d[0],y=node.y+d[1],k=key(x,y);
      if(x<0||y<0||x>=s.width||y>=s.height||visited.has(k)||obstacles.has(k))continue;
      visited.add(k);queue.push({x,y,first:node.first||d});
    }
  }
  if(queue[1])engine.turn(s,...queue[1].first);
}
function pilot(s,controls,past,releaseAt) {
  const head=s.snake[0];
  if(s.flight){
    controls.flew=true;
    const ring=s.flight.rings[s.flight.passed];
    engine.turn(s,ring.x-head.x,ring.y-head.y);
  } else if(controls.flew) {
    if(!controls.shifted)controls.shifted=engine.shiftPlane(s);
    if(!past || s.elapsed<releaseAt) {
      const key=head.x+','+head.y+','+s.plane;
      if (key!==controls.key) {steer(s);controls.key=key;}
    }
  }
}
function pastRun(era,seed){
  const s=engine.create(rng(seed),era),control={},rec=chrono.recorder(),truth=[];
  chrono.capture(rec,s);truth.push([0,chrono.position(s)]);
  for(let i=0;i<5400;i++){
    if(s.status==='upgrade')engine.upgrade(s,'arc');
    if(s.status!=='playing')break;
    pilot(s,control,true,seed%2?8:18);
    engine.tick(s,1/60);
    truth.push([Math.round(s.elapsed*1000),chrono.position(s)]);chrono.capture(rec,s);
  }
  assert.equal(s.status,'dead');
  const record=chrono.finish(rec,s),clip=chrono.open(record);assert(clip);
  const errors=[], modes=[0,0],planes=[0,0];let wrong=0;
  for(const [t,p] of truth){
    const g=chrono.ghost(clip,t-clip.start);
    if(!g)continue;
    errors.push(Math.hypot(g.x-p.x,g.y-p.y));
    if(g.plane!==p.plane||g.flight!==p.flight)wrong++;
    modes[+p.flight]++;planes[p.plane]++;
  }
  assert.equal(chrono.ghost(clip,-1),null);assert.equal(chrono.ghost(clip,clip.duration+1),null);
  return {clip,errors,modes,planes,wrong,bytes:Buffer.byteLength(JSON.stringify(record)),
    rawBytes:Buffer.byteLength(JSON.stringify(truth.filter(([t])=>t>=clip.start)))};
}
function future(clip,seed,model,toYear=2985){
  const s=engine.create(rng(seed),engine.eras.findIndex(e=>e.year===toYear)), c=chrono.challenge(clip,s,model),controls={};
  assert(c);if(model==='poursuite'){assert(chrono.wager(c,s));assert(!chrono.wager(c,s));}
  let beatAt=null;
  for(let i=0;i<60*50;i++){
    if(s.status==='upgrade')engine.upgrade(s,'arc');
    if(s.status!=='playing')break;
    pilot(s,controls,false);
    if(s.novaCharge>=1 && s.drones.some(d=>d.plane===s.plane&&Math.hypot(d.x-s.snake[0].x,d.y-s.snake[0].y)<3))engine.fire(s);
    engine.tick(s,1/60);
    const score=s.score;chrono.update(c,s);assert.equal(s.score,score);
    if(beatAt===null && c.status==='record battu')beatAt=s.elapsed;
    if(c.status!=='en cours' && c.bet!=='engagé')break;
  }
  return {score:s.score,status:c.status,bet:c.bet,beatAt:beatAt===null?null:+beatAt.toFixed(2)};
}
let allErrors=[],wrong=0,bytes=0,rawBytes=0,maxBytes=0,long=0,flight=0,upper=0;const groups=[];
for(const year of [1976,2185]){
 const era=engine.eras.findIndex(e=>e.year===year);
 const rows=[];
 for(let seed=0;seed<48;seed++){
   const src=pastRun(era,seed);allErrors.push(...src.errors);
   wrong+=src.wrong;bytes+=src.bytes;rawBytes+=src.rawBytes;maxBytes=Math.max(maxBytes,src.bytes);
   flight+=src.modes[1];upper+=src.planes[1];if(src.clip.start>0)long++;
   rows.push({seed,scorePerdu:src.clip.score,duree:src.clip.elapsed,chrono:future(src.clip,seed+891,'chrono'),poursuite:future(src.clip,seed+891,'poursuite')});
 }
 const summary={depart:engine.eras[era].year,arrivee:2985,duels:rows.length,
   chrono:rows.filter(r=>r.chrono.status==='record battu').length,poursuite:rows.filter(r=>r.poursuite.status==='record battu').length,
   misesGagnees:rows.filter(r=>r.poursuite.bet==='gagné').length,misesPerdues:rows.filter(r=>r.poursuite.bet==='perdu').length,
   anciensScores:[Math.min(...rows.map(r=>r.scorePerdu)),Math.max(...rows.map(r=>r.scorePerdu))]};
 groups.push({summary,rows});
}
allErrors.sort((a,b)=>a-b);
const fidelity={images:allErrors.length,framesVol:flight,framesPlan1:upper,erreursCoucheOuVol:wrong,
  mediane:allErrors[Math.floor(allErrors.length*.5)],p95:allErrors[Math.floor(allErrors.length*.95)],max:allErrors.at(-1),
  tailleMaxJSON:maxBytes,ratioTailleJSON:bytes/rawBytes,clipsTronques:long};
console.log(fidelity,groups.map(g=>g.summary));
assert(wrong===0 && fidelity.p95<.03 && fidelity.max<.5 && flight>0 && upper>0 && long>0);
assert(groups.every(g=>g.summary.chrono && g.summary.poursuite && g.summary.misesGagnees && g.summary.misesPerdues));
const successions=[];
assert.deepEqual(engine.eras.map(e=>e.year),[1976,1985,1995,2185,2985]);
for(const [index,era] of engine.eras.entries()) {
  for(const to of chrono.futureYears(era.year)) {
    const runs=[];
    for(let seed=0;seed<8;seed++){
      const {clip}=pastRun(index,seed);
      const result=future(clip,seed+891,'poursuite',to);
      runs.push({seed,record:clip.score,...result});
    }
    assert(runs.some(r=>r.status==='record battu'));
    successions.push({de:era.year,vers:to,battus:runs.filter(r=>r.status==='record battu').length,essais:runs.length,runs});
  }
}
console.table(successions.map(({runs,...s})=>s));
fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify({fidelity,groups,successions},null,2)+'\n');
