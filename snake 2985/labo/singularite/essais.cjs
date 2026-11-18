'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const sig=require('./singularite.js'),{run}=require('./campagnes.cjs');
function arena(){
  const b={name:'La Singularité',kind:'final',x:20,y:12,plane:0,next:{x:21,y:12,plane:0},hp:51,maxHp:100,weak:true,stun:0,attack:null,attackClock:2.6};
  return {year:2985,status:'playing',width:36,height:18,boss:b,plane:0,direction:{x:1,y:0},snake:[{x:8,y:7,plane:0},{x:7,y:7,plane:0}],cells:[],drones:[],events:[],flight:null};
}
const noop=()=>{};
test('Franchissement sur gros coup : moitié exacte, aucune régénération, événement unique',()=>{
  const s=arena(),b=s.boss;b.hp-=sig.damage(s,b,1000);assert.equal(b.hp,50);
  b.hp-=sig.damage(s,b,1000);assert.equal(b.hp,50);assert(!sig.read(s));
  sig.tick(s,.1,noop);const r=sig.read(s);assert.equal(r.phase,'split');assert.equal(r.points.length,2);
  assert.equal(s.events.filter(e=>e.type==='singularitySplit').length,1);
  for(const p of r.points){
    assert(!s.snake.some(q=>q.x===p.x&&q.y===p.y));assert(Math.abs(p.x-b.x)>1||Math.abs(p.y-b.y)>1);
  }
  const cp=sig.read(s);cp.points[0].x=777;assert.notEqual(sig.read(s).points[0].x,777);
  assert.equal(b.hp,50);assert(!b.weak);assert(s.events.every(e=>e.type!=='win'));
});
test('Ordre des balises, véritable changement de plan, aucune défaite ou victoire automatique',()=>{
  const s=arena(),b=s.boss;b.hp-=sig.damage(s,b,3);sig.tick(s,.001,noop);
  const [first,second]=sig.read(s).points;
  s.snake[0]=second;s.plane=second.plane;sig.tick(s,.01,noop);assert.equal(sig.read(s).index,0);
  s.snake[0]=first;s.plane=first.plane;sig.tick(s,.01,noop);
  s.snake[0]=second;sig.tick(s,.01,noop);assert.equal(sig.read(s).index,1);
  s.plane=second.plane;sig.tick(s,.01,noop);assert.equal(sig.read(s).route,'balises');assert(b.weak&&b.stun>0);
  assert.equal(b.hp,50);assert.equal(s.status,'playing');assert.equal(sig.damage(s,b,12),12);
  assert.deepEqual(s.events.map(e=>e.type),['singularitySplit','singularityBeacon','singularityOpen']);
});
test('Absence de place et vol : le verrou laisse la voie native praticable',()=>{
  for(const flight of [null,{angle:0}]){
    const s=arena();s.flight=flight;
    if(!flight)for(let y=0;y<18;y++)for(let x=0;x<36;x++)for(const plane of [0,1])s.cells.push({x,y,plane});
    s.boss.hp-=sig.damage(s,s.boss,100);sig.tick(s,.02,noop);
    assert.equal(sig.read(s).route,'espace');assert.equal(sig.read(s).points.length,0);assert.equal(s.boss.hp,50);
    assert.equal(sig.damage(s,s.boss,5),5);assert.equal(s.flight,flight);
  }
});
test('Vraie faille, vraie fin de salve ou collision surf : restituer la fenêtre et les PV natifs',()=>{
  for(const route of ['faille','esquive','surf']){
    const s=arena(),b=s.boss;b.attack={phase:'warning',plane:0,danger:new Set()};b.weak=false;
    b.hp-=sig.damage(s,b,4);sig.tick(s,.01,noop);
    if(route==='surf')s.flight={surf:'plongée'};
    sig.tick(s,.01,()=>{
      if(route==='surf'){b.hp-=12;s.flight=null;s.events.push({type:'bossHit',weapon:'surf',hp:b.hp});}
      else{b.weak=true;b.attack=null;if(route==='faille'){s.riftUsed=true;b.stun=3;}}
    });
    assert.equal(sig.read(s).route,route);assert.equal(b.hp,route==='surf'?38:50);
    assert.equal(sig.damage(s,b,3),3);
  }
});
test('Les neuf autres gardiens gardent strictement leurs dégâts et leur tick',()=>{
  for(const year of [1976,1985,1995,2185,2985])for(const kind of ['mid','final']){
    if(year===2985&&kind==='final')continue;
    const s=arena();s.year=year;s.boss.kind=kind;assert.equal(sig.damage(s,s.boss,1000),1000);
    let calls=0;sig.tick(s,.02,(actual,dt)=>{calls++;assert.equal(dt,.02);assert.equal(actual,s);});
    assert.equal(calls,1);assert.equal(sig.read(s),null);
  }
});
test('Les deux stratégies gagnent via les commandes normales avec eu égard à une campagne entière',()=>{
  for(const mode of ['classique','balises']){
    const r=run(7013,mode);assert.equal(r.status,'won');assert.equal(r.heals,0);
    assert.equal(r.route,mode==='classique'?'esquive':'balises');assert(r.start<r.split&&r.split<r.open&&r.open<=r.end);
  }
});
test('Reprise de la première balise puis du cœur désarmé sans réinitialisation ni doublon',()=>{
  let s=arena();s.boss.hp-=sig.damage(s,s.boss,4);sig.tick(s,.02,noop);
  let [first,second]=sig.read(s).points;
  s.plane=first.plane;s.snake[0]=first;sig.tick(s,.02,noop);assert.equal(sig.read(s).index,1);
  s=JSON.parse(JSON.stringify(s));assert.equal(sig.read(s).index,1);
  s.plane=second.plane;s.snake[0]=second;sig.tick(s,.02,noop);assert.equal(sig.read(s).route,'balises');
  s=JSON.parse(JSON.stringify(s));assert.equal(sig.read(s).route,'balises');
  assert.equal(sig.damage(s,s.boss,20),20);assert.equal(s.events.filter(e=>e.type==='singularitySplit').length,1);
});
test('Le rendu intégré peint une seule fois chaque balise sur son propre plan',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
  const ctx={SnakeMatieres:{draw:()=>true}};ctx.window=ctx;
  for(const file of ['../moteur.js','singularite.js','../spectacle.js'])
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);
  const s=ctx.SnakeArcade.create(()=>.4,4);s.boss=arena().boss;
  s.boss.hp-=ctx.SnakeSingularite.damage(s,s.boss,4);ctx.SnakeSingularite.tick(s,.02,noop);
  const actual=ctx.SnakeSingularite.draw,marks=[];
  ctx.SnakeSingularite.draw=(c,s,cam,z,t,reduced,project)=>{
    let diamonds=0;
    const brush=new Proxy(c,{get:(o,k)=>k==='stroke'?()=>{
      if(['#fff1a4','#80dbe4'].includes(o.strokeStyle))diamonds++;
    }:o[k]});
    actual(brush,s,cam,z,t,reduced,project);marks.push({z,diamonds});
  };
  const brush=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
    {get:(o,k)=>o[k]??(()=>{})});
  const canvas={clientWidth:568,clientHeight:275,getContext:()=>brush};
  ctx.SnakeSpectacle.draw(canvas,s,.8,true);
  assert.deepEqual(marks,[{z:0,diamonds:1},{z:1,diamonds:1}]);
  marks.length=0;s.boss.kind='mid';ctx.SnakeSpectacle.draw(canvas,s,.8,true);assert(!marks.length);
});
test('Un vrai surf guidé qui franchit la mi-vie conserve ses dégâts et ouvre la riposte',()=>{
  const harness=require('../surf-boss/rejouer.cjs');
  const original=harness.g.tick,prior=global.window.SnakeSingularite;
  try{
    global.window.SnakeSingularite=sig;
    harness.g.tick=(s,dt)=>sig.tick(s,dt,original);
    const result=harness.run(2985,'guidé',7,5,false,50);
    assert.equal(result.status,'playing');assert.equal(result.hp-result.apres,12);
    assert.equal(sig.read(result.final).route,'surf');
    assert.equal(result.final.flight,null);assert(result.final.boss.weak);
  }finally{harness.g.tick=original;global.window.SnakeSingularite=prior;}
});
