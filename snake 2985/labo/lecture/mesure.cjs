'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),hud=require('./arbitre.js');
const director=require('../rythme/directeur.js'),fixtures=path.resolve(__dirname,'../gardiens/gardiens.cjs');
global.window={};require('../moteur.js');require('../gardiens/gardiens.js');
const engine=window.SnakeArcade, native=engine.tick;
function meter(){
  return {frames:0,elapsed:0,writes:0,kinds:{},last:null,streak:{}};
}
function measure(m,r,dt){
  m.frames++;m.elapsed+=dt;m.writes+=+r.changed;
  if(r.primary)m.last=r.primary.kind;
  for(const kind of Object.keys(hud.shapes)){
    const k=m.kinds[kind]??={visible:0,masked:0,longest:0};
    if(r.primary?.kind===kind)k.visible+=dt;
    if(r.masked.includes(kind)){
      k.masked+=dt;m.streak[kind]=(m.streak[kind]||0)+dt;k.longest=Math.max(k.longest,m.streak[kind]);
    }else m.streak[kind]=0;
  }
}
function rounded(m){
  return JSON.parse(JSON.stringify(m,(k,v)=>typeof v==='number'?+v.toFixed(3):v));
}
const results={campaigns:[],crowded:null};
let current;
engine.tick=(s,dt)=>{
  s.director??=director.create();
  const r=hud.read(current.hud,s);
  measure(current.m,r,dt);
  native(s,dt);
  director.tick(s.director,s,dt);
};
const based=createRequire(fixtures);
function runCampaign(name,fn){
  if(!name.startsWith('campagne '))return;
  current={hud:hud.create(),m:meter()};fn();
  results.campaigns.push({name,...rounded(current.m)});
}
// Réemploie la campagne et le pilote vérifiés du laboratoire, avec leur propre oracle de victoire.
const modules=global.window;
vm.runInThisContext('(function(require){'+fs.readFileSync(fixtures,'utf8')+'\n})',
  {filename:fixtures})(name=>{if(name==='node:test')return runCampaign;Object.assign(global.window,modules);return based(name);});
engine.tick=native;
assert.equal(results.campaigns.length,5);
const m=meter(), monitor=hud.create(), s=engine.create(()=>.3,2),h=s.snake[0];
s.boss={x:22,y:4,plane:0,weak:false,attack:{plane:0,remaining:.2,phase:'warning',danger:new Set([h.y*s.width+h.x])}};
s.flight={rings:[{x:15,y:7,plane:0}],passed:0};
s.planeShift={from:1,to:0,remaining:.35};
s.director={offer:{kind:'aiguillage',step:0,anchors:[{x:16,y:7,plane:0}]}};
function block(frames,expected){
  for(let i=0;i<frames;i++){
    const r=hud.read(monitor,s);assert.equal(r.primary.kind,expected);measure(m,r,1/60);
    if(i)assert.equal(r.announcement,null);
  }
}
block(12,'danger');s.boss.attack.plane=1;block(15,'ring');
s.flight=null;block(6,'plane');s.planeShift=null;s.boss.weak=true;block(48,'guardian');
s.boss=null;block(60,'target');
assert.equal(m.writes,5);results.crowded=rounded(m);
const keys=Object.keys(hud.shapes), distances={};
for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
  const a=hud.shapes[keys[i]].join(''),b=hud.shapes[keys[j]].join('');
  distances[[keys[i],keys[j]].join('-')]=[...a].filter((v,k)=>v!==b[k]).length;
}
assert(Math.min(...Object.values(distances))>4);
results.shapePixelDifferences=distances;
fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify(results,null,2)+'\n');
console.log(results.campaigns.map(c=>[c.name,c.frames,c.writes,c.kinds.danger.masked,c.kinds.guardian.longest,c.kinds.target.longest]));
// Contre-exemples avec le pas moteur réel : un virage déjà en file ou la dernière
// vertèbre mobile doivent libérer l'alerte. Un bord imminent doit la déclencher.
const board=engine.create(()=>.23,0);board.drones=[];board.cells=[];
board.snake[0]={x:board.width-1,y:5,plane:0};
assert.equal(hud.read(hud.create(),board).primary.kind,'danger');
engine.turn(board,0,1);assert.notEqual(hud.read(hud.create(),board).primary?.kind,'danger');
board.turns.length=0;engine.tick(board,board.stepTime);
assert.equal(board.cause,'Mur');
const tail=engine.create(()=>.2);tail.drones=[];
tail.snake=[{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5}];tail.cells=[];
assert.notEqual(hud.read(hud.create(),tail).primary?.kind,'danger');
tail.cells=[{x:6,y:5}];assert.equal(hud.read(hud.create(),tail).primary.kind,'danger');
const fly=engine.create(()=>.2,3);fly.flight={angle:0,targetAngle:0,passed:0,rings:[{x:15,y:9}]};
fly.boss={x:25,y:13,plane:0,attack:{phase:'active',remaining:.25,plane:0,danger:new Set([9*fly.width+10])}};
assert.equal(hud.read(hud.create(),fly).primary.kind,'danger');
fly.boss.attack.plane=1;
assert.equal(hud.read(hud.create(),fly).primary.kind,'ring');
