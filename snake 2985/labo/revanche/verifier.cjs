'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const R=require('./revanche.js'),root=path.resolve(__dirname,'..');
const hash=()=>crypto.createHash('sha256'),sha=x=>hash().update(x).digest('hex');
const modules=['../forge.js','../vol-libre.js','evolution/evolution.js','moteur.js','gardiens/gardiens.js','surf-boss/surf.js','noeud/noeud.js','surcharges/surcharges.js','rythme/directeur.js','ecologie/ecologie.js','equilibrage/parametres.js','singularite/singularite.js','difficulte/relance.js','atelier/atelier.js'];
const w={console};w.window=w;vm.createContext(w);
vm.runInContext("Math.random=()=>{throw Error('RNG non injectée');}",w);
const sources={};
for(const f of modules){
  const code=fs.readFileSync(path.join(root,f),'utf8');sources[f]=sha(code);vm.runInContext(code,w,{filename:f});
}
w.SnakeSurf.install();
const k=w.SnakeKnot.install(w.SnakeArcade,w.SnakeEvolution.install(w.SnakeForge),{mode:'exact'});
const api=w.SnakeSurcharges.install(k.engine,k.forge),engine=api.engine;w.SnakeForge=api.forge;
function make(random,i){
  const s=engine.create(random,i);s.director=w.SnakeDirector.create();api.forge.equip(s,'prism','chain');return s;
}
function tick(s,dt){
  if(['boss','recovery'].includes(s.director.phase))s.spawnClock=Math.max(.15,s.spawnClock);
  w.SnakeRelance.before(s);
  w.SnakeEcologie.tick(s,dt,(st,t)=>w.SnakeSingularite.tick(st,t,(st,t)=>w.SnakeEquilibre.tick(st,t,w.SnakeGardiens.tick)));
  s.score+=w.SnakeDirector.tick(s.director,s,dt).points;
}
function snap(s){return JSON.stringify(s,(_,v)=>Object.prototype.toString.call(v)==='[object Set]'?[...v]:v);}
function run(i,random,divert){
  const sequence=hash(),prefix=hash(),samples=hash();let n=0;
  const s=make(()=>{const x=random();samples.update(String(x)+';');n++;return x;},i);
  const init=sha(snap(s)),terrain=sha(JSON.stringify({cells:s.cells,drones:s.drones})),centers=sha(JSON.stringify([...s.cells,...s.drones].map(({x,y,plane})=>[x,y,plane])));
  let frames=0,gates=0,flights=0,divergentInput=false;
  while(s.status==='playing'&&frames<3600){
    if(divert&&frames===78)divergentInput=engine.turn(s,0,-1);
    tick(s,1/60);const state=snap(s);sequence.update(state);if(frames<78)prefix.update(state);
    for(const e of s.events){if(e.type==='flightGate')gates++;if(e.type==='flightStart')flights++;}
    s.events.length=0;frames++;
  }
  assert.equal(s.status,'dead');
  return {init,terrain,centers,prefix:prefix.digest('hex'),trace:sequence.digest('hex'),draws:n,randomHash:samples.digest('hex'),frames,divergentInput,gates,flights,score:s.score,cause:s.cause};
}
const rows=[];
for(const [idx,{year}] of engine.eras.entries()){
  for(const seed of [0,1,298501,0xffffffff,1832052907,7594381,2200000001,590351]){
    const route=R.create(()=>seed/0x100000000);
    const first=route.begin(year),a=run(idx,first.random,false);
    const same=route.begin(year,{retry:true}),b=run(idx,same.random,false);
    const changed=route.begin(year,{retry:true}),c=run(idx,changed.random,true);
    const voyage=route.begin(year),d=run(idx,voyage.random,false);
    assert.equal(first.seed,same.seed);assert.equal(same.seed,changed.seed);
    assert.deepEqual(a,b);assert.equal(a.init,c.init);assert.equal(a.prefix,c.prefix);assert.ok(c.divergentInput);assert.notEqual(a.trace,c.trace);
    assert.notEqual(voyage.seed,seed);assert.notEqual(d.terrain,a.terrain);assert.equal(d.centers,a.centers);
    rows.push({year,seed,voyageSeed:voyage.seed,original:a,retry:b,otherRoute:c,newTrip:d});
  }
}
const pilot=require('../bout-en-bout/pilote.js')(require('../equilibrage/pilotes.cjs'));
function pilotRun(i,random){
  const s=make(random,i),out=hash();let steps=0;
  while(['playing','upgrade'].includes(s.status)&&steps++<5000){
    if(s.status==='upgrade'){
      if(w.SnakeAtelier.available(s))w.SnakeAtelier.apply(s,i%2===0?'well':'prism',{forge:api.forge});
      engine.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
    }
    const action=pilot(s);
    if(action.flight)w.SnakeFlight.aim(s,...action.vector);
    else{
      const d=action.keys[0];if(action.shift)engine.shiftPlane(s);if(action.fire)engine.fire(s);
      if(s.status==='playing')engine.turn(s,Number(d==='ArrowRight')-Number(d==='ArrowLeft'),Number(d==='ArrowDown')-Number(d==='ArrowUp'));
    }
    for(let dt=action.advance;dt>1e-9&&s.status==='playing';dt-=.04)tick(s,Math.min(.04,dt));
    out.update(snap(s));s.events.length=0;
  }
  return {steps,year:s.year,status:s.status,score:s.score,hash:out.digest('hex')};
}
function legacy(){let s=298501;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/0x100000000);}
const reference=legacy(),g=R.create(legacy()),pilotRuns=[];
for(const [i,{year}] of engine.eras.entries()){
  const seed=g.begin(year),a=pilotRun(i,reference),b=pilotRun(i,seed.random);
  assert.deepEqual(a,b);pilotRuns.push({...a,seed:seed.seed});
}
// chambre.js prepares a disposable board before the first real epoch.
const oldBoot=legacy(),newBoot=legacy(),lazyBoot=R.create(newBoot);
assert.equal(snap(engine.create(oldBoot)),snap(engine.create(newBoot)));
const firstBoot=lazyBoot.begin(1976);
assert.equal(snap(make(firstBoot.random,0)),snap(make(oldBoot,0)));
const cases=[];const empty=R.create(()=>0);
for(let i=0;i<20;i++)cases.push(empty.begin(1976).seed);
assert.equal(new Set(cases).size,cases.length);
for(const bad of [-1,2**32,NaN,.5])assert.throws(()=>R.random(bad));
const report={simulations:rows.length*4+pilotRuns.length*2,externalRandomCallsInGameplay:0,canonicalSeeds:8,rows,pilotRuns,sources};
fs.writeFileSync(path.join(__dirname,'resultats.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({simulations:report.simulations,identical:rows.length,divergent:rows.length,divergentTrip:rows.length,pilotRuns},null,2));
