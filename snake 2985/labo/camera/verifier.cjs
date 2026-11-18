'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const v=vm.createContext({});v.window=v;
for(const f of ['../spectacle.js','../campagne/pilotage.js','camera.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),v);
const shot=v.SnakeCameraMusicale,view=v.SnakeSpectacle,comp=v.SnakePilotage;
let cases=0,active=0,largest=0,worst=0;
const rect={xMin:Infinity,yMin:Infinity,xMax:-Infinity,yMax:-Infinity};
for(const year of [1976,1985,1995,2185,2985])for(const plane of [0,1])for(const corner of [[1,1],[1,16],[34,1],[34,16]])for(const bpm of [76,112,155])for(const phase of [0,.21,.55,.97]){
  const s={year,plane,width:36,elapsed:20,snake:[{x:corner[0],y:corner[1]}]};
  const base=view.camera(s,20,false);
  assert.ok(shot.cue(s,{type:'flightStart'},{phase,bpm}));cases++;
  assert.ok(!shot.cue(s,{type:'boss'},{phase,bpm}),'pas de redéclenchement à l’entrée');
  let peak=0,peakT;
  for(let i=0;i<=125;i++){
    const t=20+i/60,cam=view.camera(s,t,false),amp=Math.abs(cam.bank-base.bank);
    if(amp>peak){peak=amp;peakT=t;}
    if(!amp)continue;
    active++;
    assert.equal(shot.offsets(s,t,true),null);
    for(const z of [0,1])for(const x of [-.5,35.5])for(const y of [-.5,17.5]){
      const p=view.project(cam,x,y,z);
      rect.xMin=Math.min(rect.xMin,p.x);rect.xMax=Math.max(rect.xMax,p.x);
      rect.yMin=Math.min(rect.yMin,p.y);rect.yMax=Math.max(rect.yMax,p.y);
      assert.ok(p.x>=0&&p.x<=960&&p.y>=0&&p.y<=440);
    }
    for(const a of [0,.73,1.45,2.9,4.15,5.4]){
      const h=s.snake[0],sx=874/960,sy=292/440;
      const d=comp.cap(view.project,cam,h,plane,a,sx,sy);
      const p=view.project(cam,h.x,h.y,plane),q=view.project(cam,h.x+d.x*.06,h.y+d.y*.06,plane);
      const vx=(q.x-p.x)*sx,vy=(q.y-p.y)*sy;
      const err=Math.abs(Math.atan2(Math.cos(a)*vy-Math.sin(a)*vx,Math.cos(a)*vx+Math.sin(a)*vy))*180/Math.PI;
      worst=Math.max(worst,err);
    }
  }
  // Le maximum tombe sur une noire à une image de simulation près.
  const beats=(peakT-20)*bpm/60+phase;
  assert.ok(Math.abs(beats-Math.round(beats))*60/bpm<=1/60);
  largest=Math.max(largest,Math.atan(peak)*180/Math.PI);
}
const guarded={width:36,year:2985,elapsed:2,snake:[{x:7,y:6}],boss:{attack:{phase:'active'}}};
assert.equal(shot.cue(guarded,{type:'boss'},{bpm:128,phase:.5}),false);
guarded.boss.attack={phase:'warning',remaining:.25};
assert.equal(shot.cue(guarded,{type:'boss'},{bpm:128,phase:.8}),false);
guarded.boss.attack.remaining=1.2;
assert.equal(shot.cue(guarded,{type:'boss'},{bpm:128,phase:.25}),true);
assert.equal(shot.offsets(guarded,2+1.2-.115,false),null);
assert.ok(worst<.06);
console.log(JSON.stringify({cases,activeFrames:active,flightPeakDegrees:largest,viewportBounds:rect,worstAimErrorDegrees:worst},null,2));
