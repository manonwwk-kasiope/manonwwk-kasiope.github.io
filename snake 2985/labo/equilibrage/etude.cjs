'use strict';
const fs=require('node:fs'),path=require('node:path');
global.window={};
require('../moteur.js');require('../gardiens/gardiens.js');require('./parametres.js');
const forge=require('../../forge.js');
const engine=window.SnakeArcade,g=window.SnakeGardiens,balance=window.SnakeEquilibre;
const {dirs,profiles,observe,limited,expert,threatened,legal,dist,key}=require('./pilotes.cjs');
const years=engine.eras.map(e=>e.year);
const cutoff=150;
function random(n){return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
function start(c){
  window.SnakeForge=c.forge?forge:null;
  const s=engine.create(random(c.seed),c.year);
  if(c.forge)forge.equip(s,'prism','chain');
  return s;
}
function workshop(s){if(s.status==='upgrade')engine.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');}
function apply(s,a,curve){
  workshop(s);
  const dt=s.stepTime;
  if(a.shift)engine.shiftPlane(s);
  if(a.fire)engine.fire(s);
  if(s.status==='playing')engine.turn(s,...a.d);
  balance.tick(s,dt,g.tick,curve);
}
function replay(c,actions,last,extra){
  const s=start(c);
  for(let i=0;i<actions.length-1;i++){apply(s,actions[i],c.curve);s.events.length=0;}
  apply(s,last,c.curve);
  if(extra&&s.status==='playing')apply(s,extra,c.curve);
  return s.status!=='dead';
}
function hazard(s,v){
  const h=s.snake[0],x=h.x+s.direction.x,y=h.y+s.direction.y;
  return Boolean(threatened(s,v,x,y,1)||v.drones.some(d=>d.plane===s.plane && d.warmup<=s.stepTime
    && (d.x===x&&d.y===y||d.moveIn<=s.stepTime&&d.next.x===h.x&&d.next.y===h.y)));
}
function simulate(c,audit){
  const s=start(c),p=profiles[c.pilot],rng=random(c.seed^0x85ebca6b);
  const r={...c,t:0,outcome:'',sector:1,surprise:null,threats:0,escapes:0,counters:0,ripostes:0,errors:0,lastErrorRescue:null,noSafeAction:null,cause:null};
  let pending=false,opportunity=false,remember=[],lastCorrect=null,actual=null;
  const actions=[];
  while(['playing','upgrade'].includes(s.status)&&s.elapsed<cutoff){
    workshop(s);
    const snap=observe(s,p);
    remember.push(snap);
    while(remember.length>1&&remember[1].elapsed<=s.elapsed-p.latency)remember.shift();
    const view=remember[0],actualView=observe(s,profiles.expert);
    if(r.surprise===null && hazard(s,actualView)&&!hazard(s,view))r.surprise=s.elapsed;
    const intended=c.pilot==='expert'?expert(s,view):limited(s,view,p);
    const roll=rng(),choice=rng(), alternatives=dirs.filter(d=>legal(s,d)&&(d[0]!==intended.d[0]||d[1]!==intended.d[1]));
    const error=!c.precise&&roll<p.err&&alternatives.length>0;
    if(error)r.errors++;
    actual=error?{...intended,d:alternatives[Math.floor(choice*alternatives.length)]}:intended;
    lastCorrect=error?intended:null;
    actions.push(actual);
    apply(s,actual,c.curve);
    for(const e of s.events.splice(0)){
      if(e.type==='guardianWarning'){
        if(pending)r.escapes++;
        pending=true;r.threats++; opportunity=false;
      }
      if(e.type==='guardianCounter'){
        if(pending)r.escapes++;
        pending=false;opportunity=true;r.counters++;
      }
      if(e.type==='bossHit'&&e.heart&&opportunity){r.ripostes++;opportunity=false;}
      if(e.type==='bossDefeated'||e.type==='riftPickup'){
        if(pending)r.threats--; // attack canceled before it could resolve
        pending=false;opportunity=false;
      }
    }
  }
  r.t=Math.round(s.elapsed*100)/100;r.sector=s.difficulty;
  r.outcome=s.status==='dead'?'mort':['won','cleared'].includes(s.status)?'victoire':'limite';
  r.cause=s.cause||null;
  if(audit && r.outcome==='mort'){
    if(!replay(c,actions,actual)) {
      r.lastErrorRescue=Boolean(lastCorrect && replay(c,actions,lastCorrect));
      r.noSafeAction=true;
      // Enumerate all four cardinal controls, both depth and nova states.
      outer:for(const d of dirs)for(const shift of [false,true])for(const fire of [false,true]){
        if(replay(c,actions,{d,shift,fire})){r.noSafeAction=false;break outer;}
      }
    } else throw Error('Replay divergent');
  }
  return r;
}
if(require.main===module){
  const split=process.argv[2]||'calibration';
  const pilots=Object.keys(profiles),base=split==='validation'?14009:101;
  const offsets=split==='validation'?48:24, curves=process.argv[3]?[process.argv[3]]:Object.keys(balance.curves);
  const results=[];
  for(const curve of curves)for(let i=0;i<offsets;i++)for(const year of years)for(const pilot of pilots)for(const f of [false,true]){
    const c={curve,year,pilot,forge:f,seed:base+67*i};
    results.push(simulate(c,split==='validation'&&i<6&&curve===balance.chosen));
    if(split==='validation' && curve===balance.chosen && pilot!=='expert')
      results.push(simulate({...c,precise:true},false));
  }
  const file=path.join(__dirname,split+(process.argv[3]?'-'+process.argv[3]:'')+'.json');
  fs.writeFileSync(file,JSON.stringify(results));
  console.log(results.length+' traces : '+file);
}
module.exports={simulate,cutoff,years};
