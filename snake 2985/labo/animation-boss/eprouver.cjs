'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const body=require('./animation.js'),sprites=require('../sprites/sprites.js');
global.window={};require('../moteur.js');require('../gardiens/gardiens.js');require('../spectacle.js');
const engine=window.SnakeArcade,scene=window.SnakeSpectacle, baseTick=engine.tick, captures={},stats={},clips={},lastTime={};
const fixed=new Map(),clockStarts=new WeakMap();
function record(s){
  const b=s.boss;if(!b)return;
  const pose=body.pose(s.year,b),calm=body.pose(s.year,b,true),key=s.year+':'+b.kind;
  const stat=stats[key]??={name:b.name,frames:0,weakFrames:0,phases:{},warningSteps:[],strikeSteps:[]};
  stat.frames++;stat.weakFrames+=+b.weak;
  assert.equal(pose.open,!!b.weak);assert.equal(calm.open,!!b.weak);
  stat.phases[pose.phase]=(stat.phases[pose.phase]||0)+1;
  const geo=JSON.stringify(body.parts(calm)),id=key+calm.phase;
  if(fixed.has(id))assert.equal(geo,fixed.get(id));else fixed.set(id,geo);
  if(process.argv.includes('--animer') && (!lastTime[key]||s.elapsed-lastTime[key]>=.075)){
    lastTime[key]=s.elapsed;(clips[key]??=[]).push({t:s.elapsed,year:s.year,phase:pose.phase,layers:body.parts(pose),transform:body.transform(pose),pal:body.palettes[s.year]});
  }
  const a=b.attack;
  if(a){
    const lock=clockStarts.get(a);if(lock && lock.phase===a.phase)assert(a.remaining<=lock.remaining+1e-6);
    clockStarts.set(a,{phase:a.phase,remaining:a.remaining});
    const list=pose.phase==='wind'?stat.warningSteps:stat.strikeSteps;
    if(!list.includes(pose.progress))list.push(pose.progress);
  }
  if(!['wind','strike','open'].includes(pose.phase))return;
  const wanted={wind:.83,strike:.16,open:.25}[pose.phase],diff=Math.abs(wanted-pose.progress);
  const phase=captures[key]??={};if(phase[pose.phase]?.diff<=diff)return;
  const cam=scene.camera(s,s.elapsed,false),pp=scene.project(cam,b.x,b.y,b.plane),tile=scene.tile(cam,b.x,b.y,b.plane,1.5);
  phase[pose.phase]={name:b.name,diff,time:s.elapsed,year:s.year,kind:b.kind,phase:pose.phase,progress:pose.progress,
    fits:Object.fromEntries([320,568,852].map(w=>[w,body.fit(tile,pp,1.67*Math.max(.78,290/w,pp.k*cam.zoom))])),
    unit:pp.k*cam.zoom,tile:tile.map(v=>[v.x-pp.x,v.y-pp.y]),layers:body.parts(pose),
    transform:body.transform(pose),pal:body.palettes[s.year]};
}
engine.tick=(s,dt)=>{record(s);baseTick(s,dt);};
const filename=path.resolve(__dirname,'../gardiens/gardiens.cjs'),requireAt=require('node:module').createRequire(filename),modules=window;
function run(name,fn){if(name.startsWith('campagne '))fn();}
vm.runInThisContext('(function(require){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(n=>{
  if(n==='node:test')return run;Object.assign(global.window,modules);return requireAt(n);});
assert.equal(Object.keys(captures).length,10);
for(const [key,v] of Object.entries(captures)){
  assert.deepEqual(Object.keys(v).sort(),['open','strike','wind']);
  const x=stats[key];x.warningSteps=x.warningSteps.length;x.strikeSteps=x.strikeSteps.length;
  const a=sprites.raster(v.wind.year,'boss',{kind:v.wind.kind,reduced:true});
  v.base={...a,data:Buffer.from(a.data).toString('base64')};
}
// Contrat du contexte hôte, inclut viewport étroit et réduction de mouvement.
for(const key of Object.keys(captures))for(const reduced of [true,false]){
  const [year,kind]=key.split(':'), o={x:170,y:230,unit:.84,viewportWidth:320,kind,reduced};
  let depth=0;const c={save(){depth++;},restore(){assert(depth>0);depth--;},translate(){},rotate(){},scale(){},
    beginPath(){},closePath(){},moveTo(){},lineTo(){},fill(){}};
  const token=body.before(c,+year,{kind,weak:true,attackClock:2},o);
  assert.equal(token.sprite.x,0);assert.equal(token.sprite.y,0);assert(depth===1);body.after(c,token);assert.equal(depth,0);
}
fs.writeFileSync(path.join(__dirname,'etats.json'),JSON.stringify(stats,null,2)+'\n');
if(process.argv.includes('--animer'))process.stdout.write(JSON.stringify(clips));
else if(process.argv.includes('--atlas'))process.stdout.write(JSON.stringify(captures));
else console.log(stats);
