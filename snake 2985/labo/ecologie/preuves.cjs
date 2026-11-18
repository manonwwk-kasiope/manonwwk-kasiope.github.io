'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
global.window={};require('../moteur.js');require('./ecologie.js');
const game=window.SnakeArcade,eco=window.SnakeEcologie;
function arena(year,n,seq,variant,shield=true){
  const s=game.create(()=>.417,year);s.drones=[];s.spawnClock=s.gunClock=Infinity;
  s.difficulty=s.sector=n;s.elapsed=4.5;
  s.stepTime=.100+(.144-.01*s.pace)*Math.pow(.88,n-1);
  s.normalStepTime=s.stepTime;
  s.cells=[{x:14,y:9,plane:0},{x:27,y:15,plane:0},{x:18,y:3,plane:1}];
  eco.init(s,{variant,shield});s.ecologie.seq=seq;
  return s;
}
function measure(){
 const rows=[];
 for(const era of game.eras)for(const variant of ['balises','maillage'])for(let n=1;n<=10;n++){
  const roles=eco.settings({difficulty:n},variant).depth;
  for(let seq=0;seq<roles;seq++){
    const s=arena(era.year,n,seq,variant);
    eco.tick(s,.001,game.tick);
    const w=s.ecologie.wave;
    assert(w,era.year+' '+n+' '+seq);
    assert(w.remaining>=1.35);assert(w.path.length>=3);
    const total=w.remaining+w.active;
    const squares=w.tiles.length;
    const signatures=new Set();
    for(const dest of w.path){
      const h=s.snake[0],key=dest.y*s.width+dest.x;
      assert.equal(Math.abs(h.x-dest.x)+Math.abs(h.y-dest.y),1);
      assert(!signatures.has(key));signatures.add(key);
      assert(w.plane!==dest.plane||!w.mask.has(key));
      game.turn(s,dest.x-h.x,dest.y-h.y);
      eco.tick(s,s.stepTime-s.stepClock+.00000001,game.tick);
      assert.equal(s.status,'playing',era.year+' '+n+' '+seq+' '+s.cause);
      assert.equal(s.snake[0].x,dest.x);assert.equal(s.snake[0].y,dest.y);
    }
    assert(!s.ecologie.wave||s.ecologie.wave.serial!==w.serial);
    rows.push({year:era.year,variant,n,role:w.id,squares,warning:eco.settings(s,variant).warning,
      opening:w.path.length,active:w.active,cycle:eco.settings(s,variant).period,seconds:total});
  }
 }
 return rows;
}
function reflex(){
  const s=arena(1976,1,0,'temoin');
  s.snake=Array.from({length:8},(_,i)=>({x:35-i,y:9,plane:0}));
  eco.tick(s,s.stepTime,game.tick);
  assert.equal(s.status,'playing');assert.equal(s.snake.length,6);assert(s.ecologie.spent);
  assert.equal(s.events.filter(e=>e.type==='ecoAbsorb').length,1);
  assert(!s.events.some(e=>e.type==='death'));
  const next={...s.snake[0]};
  eco.tick(s,s.stepTime,game.tick);
  assert.notDeepEqual(s.snake[0],next);
  s.ecologie.protectedUntil=0;s.snake=Array.from({length:8},(_,i)=>({x:35-i,y:9,plane:0}));s.direction={x:1,y:0};
  eco.tick(s,s.stepTime,game.tick);
  assert.equal(s.status,'dead');assert.equal(s.cause,'Mur');
}
if(require.main===module){
  const rows=measure();reflex();
  fs.writeFileSync(path.join(__dirname,'geometrie.json'),JSON.stringify(rows));
  console.log(rows.length+' routes effectuées, avec marche et collisions réelles ; protection du corps vérifiée.');
}

function combat(){
  const straight=arena(1976,1,0,'maillage');
  for(let i=0;i<180&&straight.status==='playing';i++)eco.tick(straight,1/60,game.tick);
  assert.equal(straight.cause,'Sentinelle');
  assert(straight.events.findIndex(e=>e.type==='ecoWarning')<straight.events.findIndex(e=>e.type==='ecoActive'));
  assert(straight.events.findIndex(e=>e.type==='ecoActive')<straight.events.findIndex(e=>e.type==='death'));
  const diver=arena(1976,1,0,'maillage');
  eco.tick(diver,.001,game.tick);assert(game.shiftPlane(diver));
  for(let i=0;i<165;i++)eco.tick(diver,1/60,game.tick);
  assert.equal(diver.status,'playing');assert(diver.events.some(e=>e.type==='ecoEvade'));
  const nova=arena(2985,9,0,'maillage');
  eco.tick(nova,.001,game.tick);assert(nova.ecologie.wave);
  assert(game.fire(nova));eco.tick(nova,.001,game.tick);
  assert(nova.events.some(e=>e.type==='ecoKill'));
  assert.equal(nova.ecologie.wave,null);
  const cold=arena(1976,1,0,'maillage');cold.elapsed=0;
  for(let i=0;i<260;i++)eco.tick(cold,1/60,game.tick);
  assert(!cold.ecologie.wave);assert(!cold.events.some(e=>e.type==='ecoWarning'));
}
if(require.main===module){combat();console.log('Sentinelle létale annoncée, plongeon, désarmement par nova et ouverture protégée vérifiés.');}
if(require.main===module){
  const forge=require('../../forge.js');
  const s=arena(1995,5,0,'maillage');
  forge.equip(s,'well','blast');
  s.forge.clock=.03;
  eco.tick(s,.05,game.tick);
  assert(s.events.some(x=>x.type==='forgeHit'));
  assert(s.events.some(x=>x.type==='ecoKill'));
  console.log('Destruction d’un émetteur par une arme forgée réelle vérifiée.');
}
