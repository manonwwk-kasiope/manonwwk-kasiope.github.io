'use strict';
// A/B apparié : mêmes états initiaux, mêmes graines et règles de pilotage dans chaque paire.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {expert,limited,profiles,observe}=require('../equilibrage/pilotes.cjs');
const ctx={window:{}};
for(const file of ['../../forge.js','../moteur.js','../gardiens/gardiens.js','../equilibrage/parametres.js','surcharges.js'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);
const {SnakeArcade:base,SnakeForge:forge,SnakeEquilibre:balance,SnakeGardiens:guardian,SnakeSurcharges:sig}=ctx.window;
const kit=sig.install(base,forge),results=[];
function run(era,seed,pilot,enabled){
  let n=seed;const rng=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  const engine=enabled?kit.engine:base;
  ctx.window.SnakeForge=enabled?kit.forge:forge;
  const s=engine.create(rng,era);forge.equip(s,'prism','chain');
  const r={year:s.year,seed,pilot,enabled,nova:0,bonus:0,impacts:0};
  while(['playing','upgrade'].includes(s.status)&&s.elapsed<120){
    if(s.status==='upgrade')engine.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
    const snap=observe(s,profiles[pilot]),cmd=pilot==='expert'?expert(s,snap):limited(s,snap,profiles[pilot]);
    if(cmd.shift)engine.shiftPlane(s);
    if(cmd.fire)engine.fire(s);
    engine.turn(s,...cmd.d);balance.tick(s,s.stepTime,guardian.tick);
    for(const e of s.events.splice(0)){
      if(e.type==='nova')r.nova++;
      if(e.type==='novaOverload')r.bonus++;
      if(e.type==='novaOverloadHit')r.impacts++;
    }
  }
  return {...r,score:s.score,sector:s.difficulty,status:s.status,kills:s.kills};
}
for(let era=0;era<5;era++)for(const seed of [13,53,109,211,673,997])for(const pilot of ['expert','habitué'])for(const enabled of [false,true])
  results.push(run(era,seed,pilot,enabled));
fs.writeFileSync(path.join(__dirname,'campagnes.json'),JSON.stringify(results,null,2)+'\n');
for(const enabled of [false,true]){
  const subset=results.filter(r=>r.enabled===enabled);
  console.log(JSON.stringify({enabled,runs:subset.length,won:subset.filter(r=>['won','cleared'].includes(r.status)).length,
    deaths:subset.filter(r=>r.status==='dead').length,...Object.fromEntries(['nova','bonus','impacts','kills','score'].map(k=>[k,subset.reduce((n,r)=>n+r[k],0)]))}));
}
