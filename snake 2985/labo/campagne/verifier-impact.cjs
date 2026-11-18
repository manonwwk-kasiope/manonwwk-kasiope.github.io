'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{}};vm.createContext(sandbox);
function load(p){vm.runInContext(fs.readFileSync(path.join(__dirname,p),'utf8'),sandbox);}
load('impact.js');load('../spectacle.js');
const {SnakeImpact:fx,SnakeSpectacle:art}=sandbox.window;
const results=[];
for(const year of [1976,1985,1995,2185,2985]){
  let max=0,maxStep=0,maxQuiet=0,last=null;
  const state={year,elapsed:0,plane:0,snake:[{x:18,y:9}],nearBoss:1};
  for(let i=0;i<900;i++){
    state.elapsed=i/60;state.musicPulse=Math.exp(-(i%24)/24*7);
    if(i%37===0)fx.event(state,{type:'bossVolley'});
    if(i%61===0)fx.event(state,{type:'nova'});
    const m=art.camera(state,state.elapsed,false),q=art.camera(state,state.elapsed,true);
    const impact=state.impact;state.impact=null;const pulse=state.musicPulse;state.musicPulse=0;
    const base=art.camera(state,state.elapsed,false),quiet=art.camera(state,state.elapsed,true);
    state.impact=impact;state.musicPulse=pulse;
    const p=art.project(m,27,14,1),b=art.project(base,27,14,1);
    const a=art.project(q,27,14,1),c=art.project(quiet,27,14,1);
    max=Math.max(max,Math.hypot(p.x-b.x,p.y-b.y));
    maxQuiet=Math.max(maxQuiet,Math.hypot(a.x-c.x,a.y-c.y));
    if(last)maxStep=Math.max(maxStep,Math.hypot(last.x-p.x,last.y-p.y));
    last=p;
  }
  assert.equal(maxQuiet,0);assert.ok(max<6 && max>1);results.push({year,maxLogicalShift:max,maxOneFrame:maxStep,reduced:maxQuiet});
}
console.log(JSON.stringify(results,null,2));
