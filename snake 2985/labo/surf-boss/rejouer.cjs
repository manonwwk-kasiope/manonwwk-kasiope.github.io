'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.window={};
require('../../vol-libre.js');require('../moteur.js');require('../gardiens/gardiens.js');require('./surf.js');
const engine=window.SnakeArcade,g=window.SnakeGardiens,surf=window.SnakeSurf;
surf.install();assert(surf.install());
const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
function setup(year,headX=7,headY=5,rev=false,final=true) {
  let seed=13;const s=engine.create(()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),engine.eras.findIndex(e=>e.year===year));
  const dx=rev?-1:1;s.plane=Number(rev);s.direction={x:dx,y:0};
  s.snake=s.snake.map((_,i)=>({x:headX-i*dx,y:headY,plane:s.plane}));s.previousSnake=s.snake.slice();
  s.cells=[{x:headX+dx,y:headY,plane:s.plane},{x:16,y:2,plane:1-s.plane}];
  s.difficulty=s.sector=final?9:4;s.sectorCells=1;s.drones=[];s.gunClock=s.spawnClock=Infinity;
  g.tick(s,s.stepTime);assert(s.boss);
  return s;
}
function chase(s,goal) {
  const h=s.snake[0],queue=[{...h,first:null}],seen=new Set();
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(p.x===goal.x&&p.y===goal.y){if(p.first)engine.turn(s,...p.first);return;}
    for(const d of dirs){
      const [x,y]=[p.x+d[0],p.y+d[1]],k=x+y*36;
      if(!p.first && d[0]*s.direction.x+d[1]*s.direction.y<0)continue;
      if(x<0||y<0||x>35||y>17||seen.has(k)||s.snake.slice(1,-1).some(o=>o.plane===s.plane&&o.x===x&&o.y===y))continue;
      seen.add(k);queue.push({x,y,first:p.first||d});
    }
  }
}
function run(year,mode,x=7,y=5,rev=false,startingHp){
  const s=setup(year,x,y,rev);
  if(startingHp!==undefined)s.boss.hp=startingHp;
  const hp=s.boss.hp,scoreBefore=s.score,attempt=s.boss.attack,log=[],trace=[];
  let active=false,last='',switched=false,terminal=null,near=null;
  for(let i=0;i<330 && s.status==='playing';i++){
    const v=surf.read(s),h=s.snake[0];
    if(mode==='esquive'){
      if(!switched){switched=engine.shiftPlane(s);engine.turn(s,0,1);}
      if(s.snake[0].y>13)engine.turn(s,1,0);
    }else if(v?.phase==='porte'){
      if(v.accessible){active=surf.action(s)||active;near=v.gate;}
      else if(last!==h.x+','+h.y){chase(s,v.gate);last=h.x+','+h.y;}
    }else if(v?.phase==='crête'){
      const a=v.edge[0],b=v.edge[1],dx=b.x-a.x,dy=b.y-a.y;
      if(mode==='annuler'){surf.cancel(s);}
      else if(mode==='nouvelle-salve'){s.boss.attack={...s.boss.attack,danger:new Set(s.boss.attack.danger)};}
      else if(mode==='sortie')engine.turn(s,-dy,dx);
      else if(mode!=='passif'){
        engine.turn(s,dx,dy);
        if(v.pulse && mode!=='retard' && (year!==2985 || s.boss.attack.remaining<=.11)){
          assert.equal(s.boss.attack.phase,'active');assert(surf.action(s));
        }
      }
    }else if(v?.phase==='plongée'){
      if(mode==='manqué')engine.turn(s,-1,0);
      else engine.turn(s,s.boss.x-h.x,s.boss.y-h.y);
    }
    if(active && mode==='annuler' && !s.flight){terminal=s.events.findLast(e=>e.type==='surfEnd');break;}
    if(i%4===0&&s.flight)trace.push([+s.elapsed.toFixed(2),+h.x.toFixed(2),+h.y.toFixed(2),h.plane,s.flight.surf]);
    const before=s.elapsed;g.tick(s,1/60);assert(s.elapsed>before);
    for(const e of s.events){if(e.type.startsWith('surf') || e.weapon==='surf')log.push({type:e.type,t:+s.elapsed.toFixed(3),reason:e.reason,damage:e.damage});}
    terminal=s.events.findLast(e=>e.type==='surfEnd');s.events.length=0;
    if(terminal || (mode==='esquive'&&s.boss.attack!==attempt))break;
  }
  return {year,mode,active,near,switched,hp,apres:s.boss?.hp,status:s.status,reason:terminal?.reason,score:s.score,scoreBefore,
    finished:!!terminal,trace,log,final:s};
}
if(require.main===module){
 for(const y of [1995,2985]) for(const mode of ['guidé','retard','passif','annuler','sortie','manqué','esquive','nouvelle-salve']){
  const r=run(y,mode);console.log(y,mode,r.active,r.reason,r.hp-r.apres,r.near,r.status,r.log.map(e=>e.type).join('/'));
 }
}
module.exports={setup,run,engine,surf,g,chase};
