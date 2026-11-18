'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const trial=require('./initiation.js');global.window={};
for(const f of ['../../vol-libre.js','../../forge.js','../moteur.js','../evolution/evolution.js','../noeud/noeud.js'])require(f);
const w=window, kit=w.SnakeKnot.install(w.SnakeArcade,w.SnakeEvolution.install(w.SnakeForge),{mode:'exact'});
w.SnakeForge=kit.forge;const engine=kit.engine;
const dirs=[[1,0],[0,1],[-1,0],[0,-1]],dt=1/60,eq=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y;
function navigate(s,target,avoidGate){
  const h=s.snake[0],q=[[h.x,h.y,null]],seen=new Set([h.y*s.width+h.x]);
  for(let i=0;i<q.length;i++){
    const [x,y,first]=q[i];if(first&&eq({x,y},target))return first;
    for(const v of dirs){
      const [dx,dy]=v,px=x+dx,py=y+dy,id=py*s.width+px,p={x:px,y:py};
      if(!first && dx*s.direction.x+dy*s.direction.y<0)continue;
      if(px<0||py<0||px>=s.width||py>=s.height||seen.has(id))continue;
      if(s.snake.slice(1,-1).some(b=>b.plane===s.plane&&eq(p,b)))continue;
      if(s.drones.some(b=>b.plane===s.plane && b.warmup<=0 && (eq(p,b)||eq(p,b.next))))continue;
      if(avoidGate && s.flightGate?.plane===s.plane && eq(p,s.flightGate))continue;
      seen.add(id);q.push([px,py,first||v]);
    }
  }
  return null;
}
function run(model,year,policy,cycle=0,tape=null,seed=83,lag=0,prepared=false){
  const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const s=engine.create(rng,engine.eras.findIndex(e=>e.year===year));
  w.SnakeForge.equip(s,'orbit','blast');
  const d=trial.create(model,cycle),log={},inputs=[],seenStages=new Set(),probes=[];
  if(prepared)assert(trial.prepare(d));
  let frame=0,idx=0,last='',events=[];
  const mark=k=>{log[k]??=+((frame+1)*dt).toFixed(3);};
  const command=(op,...args)=>{
    inputs.push([frame,op,...args]);
    if(op==='turn' && engine.turn(s,...args)){mark('choix');mark('commande');}
    if(op==='aim' && w.SnakeFlight.aim(s,...args))mark('commande');
    if(op==='shift' && engine.shiftPlane(s))mark('commande');
    if(op==='upgrade')engine.upgrade(s,'arc');
  };
  for(;frame<3600 && ['playing','upgrade'].includes(s.status);frame++){
    const prior=d.stage;trial.update(d,s,dt,events);seenStages.add(d.stage);
    if(prior==='virage' && d.stage==='libre')mark('fermeture');
    if(prior==='virage' && d.stage==='forge')mark('entree');
    if(frame%60===0)probes.push([frame,s.snake[0].x,s.snake[0].y,s.plane,s.score]);
    if(tape){while(idx<tape.length&&tape[idx][0]===frame){const [,op,...args]=tape[idx++];command(op,...args);}}
    else if(s.status==='upgrade')command('upgrade');
    else if(policy!=='inerte' && frame*dt+1e-9>=lag){
      const h=s.snake[0];
      if(s.flight){
        const r=s.flight.rings[s.flight.passed];command('aim',+(r.x-h.x).toFixed(4),+(r.y-h.y).toFixed(4));
      }else{
        if(['plan','retour'].includes(d.stage) && policy==='suivre')command('shift');
        if(d.stage==='boucle' && s.knot?.preview && !s.knot.pending && policy==='suivre')command('shift');
        let target=policy==='suivre'?d.at:null;
        const ordinary=s.cells.filter(c=>c.plane===s.plane).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
        if(d.stage==='plan'||!target||policy!=='suivre') target=s.flightGate?.plane===s.plane?s.flightGate:ordinary;
        if(d.stage==='boucle'&&s.knot?.pending)target=s.knot.pending.crossing;
        if(target){
          const key=[h.x,h.y,s.plane,target.x,target.y,d.stage].join(',');
          if(last!==key){last=key;const dir=navigate(s,target,d.stage==='croissance'||d.stage==='boucle');
            if(dir && s.direction.x*dir[0]+s.direction.y*dir[1]===0)command('turn',...dir);}
        }
      }
    }
    const prev=s.direction,wasFlying=!!s.flight;
    engine.tick(s,dt);events=s.events.splice(0);
    if(!wasFlying&&!s.flight&&(s.direction.x!==prev.x||s.direction.y!==prev.y))mark('virage');
    if(events.some(e=>e.type==='forgeShot'))mark('tir');
    if(events.some(e=>e.type==='forgeHit'))mark('impact');
    if(events.some(e=>e.type==='planeShift'))mark('plan');
    if(events.some(e=>e.type==='flightStart'))mark('vol');
    if(events.some(e=>e.type==='knotClosed'))mark('queue');
    if(s.status==='dead')mark('mort');
  }
  return {year,model,policy,cycle,log,stage:[...seenStages],status:s.status,cause:s.cause,score:s.score,frames:frame,inputs,probes};
}
const results=[],traces=[];
for(const year of [1976,1985,1995,2185,2985]){
  for(const model of trial.models)for(const policy of ['suivre','contourner','inerte']){
    const a=run(model,year,policy);const b=run(model,year,policy,0,a.inputs);
    assert.deepEqual(b,a);
    const {inputs,probes,...stats}=a;results.push(stats);
    if(year===1995 && policy==='suivre')traces.push(a);
    if(model!=='actuel'&&policy==='suivre')assert(a.log.queue && a.log.virage && a.log.vol && a.log.plan && a.log.tir);
    if(policy==='inerte')assert.equal(a.cause,'Mur');
    if(policy==='contourner'){const ref=run('actuel',year,policy);assert.deepEqual(a.probes,ref.probes);assert.deepEqual({...a.log,fermeture:null,entree:null},{...ref.log,fermeture:null,entree:null});}
  }
  const reference=run('actuel',year,'suivre',1);
  for(const model of trial.models){
    const again=run(model,year,'suivre',1);
    assert.deepEqual(again.probes,reference.probes);
    assert.deepEqual(again.log,reference.log);
  }
}
fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'prises.json'),JSON.stringify(traces)+'\n');
for(const r of results.filter(r=>r.policy==='suivre'))console.log(r.year,r.model,r.log,r.stage.at(-1),r.cause);
const following=require('../bifurcation/bifurcation.js').destinations(2985,'won')[0];
assert.equal(following.year,1976);assert.equal(following.cycle,true);
const reset=run('facultatif',following.year,'suivre',+following.cycle);
assert.deepEqual(reset.inputs,run('actuel',1976,'suivre').inputs);
const variations=[];
for(const seed of [1,11,121])for(const year of [1976,1985,1995,2185,2985])for(const model of trial.models){
  const {inputs,probes,...caseData}=run(model,year,'suivre',0,null,seed);variations.push({seed,...caseData});
}
fs.writeFileSync(path.join(__dirname,'variations.json'),JSON.stringify(variations,null,2)+'\n');
for(const model of trial.models){
  const v=variations.filter(r=>r.model===model);
  console.log(model,'queue',v.filter(r=>r.log.queue).length,'sur',v.length,'mort',v.filter(r=>r.log.mort).length);
}

const delays=[];
for(const year of [1976,1985,1995,2185,2985])for(const lag of [.4,.8,1.2,1.6,2.2])for(const prepared of [false,true]){
 const a=run('facultatif',year,'suivre',0,null,83,lag,prepared);
 const b=run('facultatif',year,'suivre',0,a.inputs,83,lag,prepared);
 assert.deepEqual(a,b);
 delays.push({year,lag,prepared,...a.log,status:a.status,cause:a.cause});
}
fs.writeFileSync(path.join(__dirname,'latences.json'),JSON.stringify(delays,null,2)+'\n');
for(const lag of [.4,.8,1.2,1.6,2.2])for(const prepared of [false,true]){
 const rows=delays.filter(r=>r.lag===lag&&r.prepared===prepared);
 console.log(lag,prepared,'entrée',rows.filter(r=>r.entree).length,'nœud',rows.filter(r=>r.queue).length);
}
const preview=trial.create('facultatif'), fresh=engine.create(()=>.5,2);trial.update(preview,fresh,dt);
const firstCue=trial.cue(preview,fresh),inkLines=[];
const pen={save(){},restore(){},beginPath(){},stroke(){},moveTo(){},lineTo(x,y){inkLines.push([x,y]);}};
trial.drawFork(pen,firstCue,p=>({x:p.x*2,y:p.y*3}));
assert.equal(firstCue.marks.length,8);assert.equal(inkLines.length,9);
assert.equal(new Set(firstCue.marks.map(p=>p.x)).size,8);
for(const prepared of [false,true]){
  const rows=delays.filter(r=>r.prepared===prepared);
  if(prepared)assert(rows.every(r=>r.queue && r.entree && r.plan));
  else assert(rows.filter(r=>r.lag===2.2).every(r=>r.fermeture && !r.entree));
}
