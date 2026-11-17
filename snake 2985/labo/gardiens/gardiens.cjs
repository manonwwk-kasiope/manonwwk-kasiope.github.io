'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../moteur.js');
require('./gardiens.js');
const engine = window.SnakeArcade, guardians = window.SnakeGardiens;
const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
const seed = n => () => ((n = (Math.imul(n,1664525)+1013904223) >>> 0) / 4294967296);

function route(s) {
  const head=s.snake[0],boss=s.boss,k=(x,y)=>y*s.width+x;
  const walls=new Set(s.snake.slice(1,-1).filter(p=>p.plane===s.plane).map(p=>k(p.x,p.y)));
  for (const d of s.drones.filter(d=>d.plane===s.plane)) for(const p of [d,d.next]) walls.add(k(p.x,p.y));
  if(boss?.plane===s.plane) for(const p of [boss,boss.next]) {
    for(let x=p.x-1;x<=p.x+1;x++) for(let y=p.y-1;y<=p.y+1;y++) walls.add(k(x,y));
  }
  const targets=new Set(s.cells.filter(p=>p.plane===s.plane).map(p=>k(p.x,p.y)));
  const queue=[{...head,depth:0,dir:null}], seen=new Set([k(head.x,head.y)]);
  let best=null, score=-Infinity;
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];
    if(p.dir) {
      if(!boss && targets.has(k(p.x,p.y))) return p.dir;
      const radius=boss ? Math.max(Math.abs(p.x-boss.x),Math.abs(p.y-boss.y)) : 0;
      const value=-p.depth-(boss?Math.abs(radius-3)*6:0);
      if(value>score){score=value;best=p.dir;}
    }
    if(boss && p.depth>=10) continue;
    for(const d of dirs) {
      const [dx,dy]=d,x=p.x+dx,y=p.y+dy,id=k(x,y);
      if(!p.dir && dx*s.direction.x+dy*s.direction.y<0)continue;
      if(x<0||y<0||x>=s.width||y>=s.height||walls.has(id)||seen.has(id))continue;
      const a=boss?.attack;
      if(a?.plane===s.plane&&a.danger.has(id)&&(a.phase==='active'||a.remaining<(p.depth+2)*s.stepTime))continue;
      seen.add(id);queue.push({x,y,dir:p.dir||d,depth:p.depth+1});
    }
  }
  return best;
}

function drive(s) {
  if(s.status==='upgrade') engine.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
  if(s.status!=='playing')return;
  const a=s.boss?.attack;
  if(a?.plane===s.plane || (s.boss?.weak && s.boss.plane!==s.plane))engine.shiftPlane(s);
  let dir=route(s);
  if(!dir && engine.shiftPlane(s))dir=route(s);
  if(dir)engine.turn(s,...dir);
  if(s.boss?.weak && s.boss.plane===s.plane) {
    const h=s.snake[0],b=s.boss;
    if(Math.hypot(Math.max(0,Math.abs(h.x-b.x)-1),Math.max(0,Math.abs(h.y-b.y)-1))<=s.novaRadius)engine.fire(s);
  }
  guardians.tick(s,s.stepTime);
}

// Both starts enter through a real sector pickup, attacking from opposite headings and planes.
function threshold(era,final,reverse) {
  const s=engine.create(seed(9),era),dx=reverse?-1:1,x=reverse?28:7,y=reverse?12:5,plane=+reverse;
  s.plane=plane;s.direction={x:dx,y:0};
  s.snake=s.snake.map((p,i)=>({x:x-i*dx,y,plane}));s.previousSnake=s.snake.slice();
  s.cells=[{x:x+dx,y,plane},{x:17,y:2,plane:1-plane}];
  s.difficulty=s.sector=final?9:4;s.sectorCells=1;
  s.drones=[];s.gunClock=s.spawnClock=Infinity;
  guardians.tick(s,s.stepTime);
  assert.equal(s.difficulty,final?10:5);assert(s.boss);
  return s;
}

for(let era=0;era<engine.eras.length;era++) for(const final of [false,true]){
  const name=engine.eras[era].bosses[+final];
  test(name+' : deux approches, avertissement, évitement, retour et riposte',()=>{
    for(const reverse of [false,true]){
      const s=threshold(era,final,reverse), original=s.boss, warnings=new Map();
      let counter=false, strikes=0, actualEvades=0;
      for(let i=0;i<900 && s.status==='playing' && s.boss===original;i++){
        const a=s.boss.attack;
        if(a?.phase==='warning')warnings.set(a,[...a.danger]);
        if(a?.phase==='active'){
          assert.deepEqual([...a.danger],warnings.get(a));
          if(s.plane!==a.plane)actualEvades++;
        }
        if(guardians.read(s)?.phase==='counter'){
          counter=true;
          if(s.boss.plane!==s.plane)engine.shiftPlane(s);
          if(s.boss.plane===s.plane) s.gunClock=Math.min(s.gunClock,.06);
        }
        drive(s);
        strikes+=s.events.filter(e=>e.type==='bossHit'&&e.heart).length;s.events.length=0;
        if(strikes)break;
      }
      assert(counter && strikes && actualEvades,name+' sans esquive/riposte '+JSON.stringify({reverse,status:s.status,cause:s.cause,counter,strikes,actualEvades}));
    }
  });
}

for(let era=0;era<engine.eras.length;era++) test('campagne '+engine.eras[era].year+' depuis le premier cran',()=>{
  const s=engine.create(seed(1),era), thresholds=[], beaten=[];
  for(let i=0;i<2400 && ['playing','upgrade'].includes(s.status);i++){
    drive(s);
    for(const e of s.events.splice(0)){
      if(e.type==='boss')thresholds.push(s.difficulty);
      if(e.type==='bossDefeated')beaten.push(e.name);
    }
  }
  assert.deepEqual(thresholds,[5,10],s.cause);
  assert.deepEqual(beaten,engine.eras[era].bosses,s.cause);
  assert.equal(s.status,s.year===2985?'won':'cleared');
});

// Search a continuous cardinal route for the exact number of moves before ignition.
function arrival(s, wantHit) {
  const a=s.boss.attack, moves=Math.floor((a.remaining+s.stepClock)/s.stepTime);
  let states=[{body:s.snake,dir:s.direction,route:[]}];
  for(let i=0;i<moves;i++){
    const choices=[], seen=new Set();
    for(const state of states) for(const [dx,dy] of dirs) {
      if(dx*state.dir.x+dy*state.dir.y<0)continue;
      const x=state.body[0].x+dx,y=state.body[0].y+dy;
      if(x<0||y<0||x>=s.width||y>=s.height)continue;
      if(state.body.slice(0,-1).some(p=>p.x===x&&p.y===y))continue;
      if(Math.max(Math.abs(x-s.boss.x),Math.abs(y-s.boss.y))<=3)continue;
      const id=[x,y,dx,dy].join(',');
      if(seen.has(id))continue;
      seen.add(id);
      choices.push({body:[{x,y},...state.body.slice(0,-1)],dir:{x:dx,y:dy},route:[...state.route,[dx,dy]]});
    }
    states=choices;
  }
  return states.find(st=>a.danger.has(st.body[0].y*s.width+st.body[0].x)===wantHit)?.route;
}

test('chaque empreinte annoncée est différente, esquivable au sol et létale si traversée à l’allumage',()=>{
  const masks=new Set();
  for(let era=0;era<engine.eras.length;era++)for(const final of [false,true])for(const reverse of [false,true])for(const wantHit of [false,true]){
    const s=threshold(era,final,reverse), name=s.boss.name, attack=s.boss.attack;
    const path=arrival(s,wantHit);
    assert(path,name+' : aucune trajectoire pour '+JSON.stringify({reverse,wantHit}));
    if(!reverse)masks.add([...attack.danger].join('.'));
    for(const dir of path){engine.turn(s,...dir);guardians.tick(s,s.stepTime);}
    guardians.tick(s,attack.remaining+.002);
    assert.equal(s.status,wantHit?'dead':'playing',name+' '+JSON.stringify({reverse,wantHit,path}));
    if(wantHit)assert.equal(s.cause,name);
  }
  assert.equal(masks.size,10);
});

test('une alerte déclenchée près du mur reste visible dans les quatre directions',()=>{
  for(let era=0;era<engine.eras.length;era++)for(const final of [false,true])for(const [dx,dy] of dirs){
    const s=threshold(era,final,false);
    s.snake[0]={x:dx===1?s.width-2:dx===-1?1:8,y:dy===1?s.height-2:dy===-1?1:7,plane:s.plane};
    s.direction={x:dx,y:dy};
    s.boss.attack={...s.boss.attack}; // A new lock-on is sampled before the next movement.
    guardians.tick(s,.001);
    assert(s.boss.attack.tiles.length>=3,s.boss.name+' '+dx+','+dy);
    assert(s.boss.attack.tiles.every(p=>p.x>=0&&p.x<s.width&&p.y>=0&&p.y<s.height));
  }
});

test('1995 : les blocs échangent leurs feux ; le train change de rail et ses wagons avancent',()=>{
  const era=engine.eras.findIndex(e=>e.year===1995);
  for(const final of [false,true]){
    const s=threshold(era,final,false), beats=[];
    const head={...s.snake[0]};
    engine.shiftPlane(s);
    for(let n=0;n<700 && !s.boss.weak;n++){
      const a=s.boss.attack;
      if(a?.phase==='warning' && !beats.includes(a))beats.push(a);
      if(s.stepClock+1/60>=s.stepTime){
        const dir=route(s);
        if(dir)engine.turn(s,...dir);
      }
      guardians.tick(s,1/60);
      assert.equal(s.status,'playing');
    }
    assert(s.boss.weak);
    assert.equal(beats.length,final?3:2);
    const hit=(beat,u,v)=>beats[beat].danger.has((head.y+v)*s.width+head.x+u);
    for(let u=0;u<17;u++){
      if(!final)for(let v=-3;v<=3;v++)assert.notEqual(hit(0,u,v),hit(1,u,v));
      else{
        assert.equal(hit(0,u,0),hit(1,u+3,3));
        assert.equal(hit(0,u,0),hit(2,u+6,-2));
        assert(!hit(1,u,0));
      }
    }
    assert.equal(new Set(beats.map(a=>a.plane)).size,1);
  }
});
