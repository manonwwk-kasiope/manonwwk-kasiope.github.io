'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const globalTest={console};globalTest.window=globalTest;
const ctx=vm.createContext(globalTest),lab=path.dirname(__dirname);
for(const mod of ['../forge.js','../vol-libre.js','evolution/evolution.js','moteur.js','gardiens/gardiens.js','surf-boss/surf.js','noeud/noeud.js','surcharges/surcharges.js','rythme/directeur.js','ecologie/ecologie.js','equilibrage/parametres.js','atelier/atelier.js'])vm.runInContext(fs.readFileSync(path.join(lab,mod),'utf8'),ctx);
const w=globalTest;w.SnakeSurf.install();
const knot=w.SnakeKnot.install(w.SnakeArcade,w.SnakeEvolution.install(w.SnakeForge),{mode:'exact'});
const api=w.SnakeSurcharges.install(knot.engine,knot.forge),e=api.engine;w.SnakeForge=api.forge;
const choose=require('./pilote.js')(require('../equilibrage/pilotes.cjs'));
let seed=298501;
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const details=[];
for(const [i,era] of e.eras.entries()){
  let won=false;
  for(let attempt=1;!won&&attempt<=10;attempt++){
    const s=e.create(rand,i);const director=w.SnakeDirector.create();s.director=director;api.forge.equip(s,'prism','chain');
    const encounters=[];
    for(let j=0;j<5000&&['playing','upgrade'].includes(s.status);j++){
      if(s.status==='upgrade'){
        if(w.SnakeAtelier.available(s))w.SnakeAtelier.apply(s,i%2===0?'well':'prism',{forge:api.forge});
        e.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
      }
      const a=choose(s);
      if(a.flight)w.SnakeFlight.aim(s,...a.vector);
      else{
        const d=a.keys[0];if(a.shift)e.shiftPlane(s);if(a.fire)e.fire(s);
        if(s.status==='playing')e.turn(s,Number(d==='ArrowRight')-Number(d==='ArrowLeft'),Number(d==='ArrowDown')-Number(d==='ArrowUp'));
      }
      let remain=a.advance;
      while(remain>1e-9 && s.status==='playing'){
        const dt=Math.min(.04,remain);
        w.SnakeEcologie.tick(s,dt,(st,t)=>w.SnakeEquilibre.tick(st,t,w.SnakeGardiens.tick));
        const o=w.SnakeDirector.tick(director,s,dt);s.score+=o.points;remain-=dt;
      }
      encounters.push(...s.events.splice(0).filter(x=>['bossDefeated','workshopRecipe','death'].includes(x.type)));
    }
    details.push({year:era.year,attempt,status:s.status,cause:s.cause,events:encounters});
    won=['won','cleared'].includes(s.status);
  }
  assert(won,era.year);
}
fs.writeFileSync(path.join(__dirname,'entrainement.json'),JSON.stringify(details,null,2));
console.log(details.map(x=>[x.year,x.attempt,x.status,x.cause]));
