'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {create,advance,act,timeline,tempos,round}=require('./mesure.cjs'),cad=require('./cadence.js');
const diff=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const results=[];
for(const [hz,periods] of Object.entries(tempos)){
  for(const policy of ['courante','fixe geste 60','fixe geste 120','fixe geste mixte','mixte 240']){
    const delays=[];
    for(let phase=0;phase<100;phase++){
      const g=create(2985,1),s=g.s;
      for(let i=0;i<180&&!s.flight;i++)advance(g,1/60);
      assert(s.flight);
      const initial=s.flight.angle,at=100+phase+.3;
      const clock=cad.create(dt=>advance(g,dt),policy.endsWith('60')?60:policy.endsWith('120')?120:()=>s.flight?(policy==='mixte 240'?240:120):60);
      clock.reset(0);let prev=0,issued=false,changed=false;
      for(const now of timeline(periods,400)){
        if(!issued&&at<=now){
          if(policy!=='courante')clock.advance(at);
          act(s,[at,'aim',Math.cos(initial+1),Math.sin(initial+1)]);issued=true;
          assert(diff(s.flight.targetAngle,initial+1)<1e-6);
        }
        if(policy==='courante')advance(g,(now-prev)/1000);else clock.advance(now);
        if(issued&&diff(s.flight.angle,initial)>.001){
          delays.push(now-at);changed=true;break;
        }
        prev=now;
      }
      assert(changed);
    }
    delays.sort((a,b)=>a-b);
    results.push({hz,policy,n:delays.length,medianeMs:round(delays[49]),p95Ms:round(delays[94]),maxMs:round(delays.at(-1))});
  }
}
fs.writeFileSync(path.join(__dirname,'virages.json'),JSON.stringify(results,null,2)+'\n');console.table(results);
