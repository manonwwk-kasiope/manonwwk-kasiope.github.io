'use strict';
const fs=require('node:fs'),path=require('node:path');
global.window={};require('../moteur.js');require('../gardiens/gardiens.js');require('../equilibrage/parametres.js');require('./ecologie.js');
const forge=require('../../forge.js'),{observe,limited,expert,profiles,dirs,legal}=require('../equilibrage/pilotes.cjs');
const e=window.SnakeArcade,g=window.SnakeGardiens,eco=window.SnakeEcologie,b=window.SnakeEquilibre;
const balanced=(s,dt)=>b.tick(s,dt,g.tick);
const random=n=>()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
const fields=()=>({seconds:0,warnings:0,tiles:0,anticipation:0,opening:0,active:0,kills:0,evades:0,cancel:0,ecoDeaths:0,turns:0});
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const key=(s,p)=>p.y*s.width+p.x;
function play(c){
  const s=e.create(random(c.seed),c.year),rng=random(c.seed^0x85ebca6b),profile=profiles[c.pilot],memory=[];
  forge.equip(s,'prism','chain');eco.init(s,{variant:c.variant,shield:c.shield});
  const rs=Array.from({length:10},fields);
  let absorbed=0,first=null;
  while(['playing','upgrade'].includes(s.status)&&s.elapsed<150){
    if(s.status==='upgrade')e.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
    const snap=observe(s,profile),wave=s.ecologie.wave;
    snap.eco=wave&&(!profile.blind||wave.plane===s.plane)?{serial:wave.serial,plane:wave.plane,marks:wave.mask,emitter:wave.emitter}:null;
    memory.push(snap);while(memory.length>1&&memory[1].elapsed<=s.elapsed-profile.latency)memory.shift();
    const v=memory[0],base=c.pilot==='expert'?expert(s,v):limited(s,v,profile);
    let action={...base},decision=false;
    if(c.read&&v.eco?.serial===wave?.serial&&wave){
      const h=s.snake[0],w=v.eco;
      if(w.plane===s.plane){
        const x=h.x+action.d[0],y=h.y+action.d[1],enters=w.marks.has(y*s.width+x)||w.marks.has(key(s,h));
        if(dist(h,w.emitter)<=s.novaRadius-.2 && s.novaCharge===1){action.fire=true;decision=!base.fire;}
        else if(enters||wave.remaining<.8){
          if(s.planeCooldown<=0 && !v.drones.some(d=>d.plane!==s.plane&&dist(h,d)<2)){action.shift=true;decision=!base.shift;}
          else{
            const safe=dirs.filter(d=>legal(s,d)).find(d=>{
              const p={x:h.x+d[0],y:h.y+d[1]};
              return p.x>=0&&p.x<s.width&&p.y>=0&&p.y<s.height&&!w.marks.has(key(s,p))
                &&!s.snake.slice(0,-1).some(q=>q.plane===s.plane&&dist(q,p)===0);
            });
            if(safe){action.d=safe;decision=safe[0]!==base.d[0]||safe[1]!==base.d[1];}
          }
        }
      }else if(action.shift&&w.marks.has(key(s,h))){action.shift=false;decision=true;}
    }
    const roll=rng(),pick=rng(),alts=dirs.filter(d=>legal(s,d)&&(d[0]!==action.d[0]||d[1]!==action.d[1]));
    if(roll<profile.err&&alts.length)action.d=alts[Math.floor(pick*alts.length)];
    const state=rs[s.difficulty-1],time=s.elapsed,dt=s.stepTime;
    if(decision)state.turns++;
    if(action.shift)e.shiftPlane(s);
    if(action.fire)e.fire(s);
    if(s.status==='playing')e.turn(s,...action.d);
    eco.tick(s,dt,balanced);
    state.seconds+=s.elapsed-time;
    for(const ev of s.events.splice(0)){
      if(ev.type==='ecoAbsorb')absorbed++;
      if(ev.type==='ecoWarning'){
        if(first===null)first=s.elapsed;
        state.warnings++;state.tiles+=ev.tiles;state.opening+=ev.opening;state.anticipation+=ev.seconds;
      }
      if(ev.type==='ecoActive')state.active++;
      if(ev.type==='ecoKill')state.kills++;
      if(ev.type==='ecoEvade')state.evades++;
      if(ev.type==='ecoCancel')state.cancel++;
      if(ev.type==='death'&&ev.role)state.ecoDeaths++;
    }
  }
  return {...c,absorbed,first,time:s.elapsed,cran:s.difficulty,status:s.status,cause:s.cause||null,stats:rs};
}
function run(split){
  const base=split==='cal'?271:7001,n=split==='cal'?8:16,part=[];
  for(let i=0;i<n;i++)for(const year of e.eras.map(x=>x.year))for(const pilot of Object.keys(profiles)){
    for(const variant of ['temoin','balises','maillage'])for(const shield of [false,true]){
      for(const read of variant==='temoin'?[false]:[false,true]){
        part.push(play({seed:base+83*i,year,pilot,variant,shield,read}));
      }
    }
  }
  fs.writeFileSync(path.join(__dirname,split+'.json.gz'),require('node:zlib').gzipSync(JSON.stringify(part)));
  console.log(split,part.length);
}
if(require.main===module)run(process.argv[2]||'cal');
module.exports={play,settings:eco.settings};
