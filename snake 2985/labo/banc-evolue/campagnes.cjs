'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),lab=path.dirname(__dirname);
const pilot=require('../bout-en-bout/pilote.js')(require('../equilibrage/pilotes.cjs'));
const files=['../forge.js','../vol-libre.js','evolution/evolution.js','moteur.js','singularite/singularite.js','gardiens/gardiens.js','surf-boss/surf.js','noeud/noeud.js','surcharges/surcharges.js','ecologie/ecologie.js','equilibrage/parametres.js','rythme/directeur.js','difficulte/relance.js','revanche/revanche.js','atelier/atelier.js','cadence/cadence.js','audio/pouls-data.js','audio/horloge.js','synchro-nova/accents.js','synchro-nova/synchro.js','initiation/initiation.js'];
const w={};w.window=w;vm.createContext(w);
const hashes={};
for(const file of [...files,'campagne/chambre.js','bout-en-bout/pilote.js','equilibrage/pilotes.cjs']){
  const source=fs.readFileSync(path.join(lab,file),'utf8');
  hashes[file]=createHash('sha256').update(source).digest('hex');
  if(files.includes(file))vm.runInContext(source,w,{filename:file});
}
w.SnakeSurf.install();
const knot=w.SnakeKnot.install(w.SnakeArcade,w.SnakeEvolution.install(w.SnakeForge),{mode:'exact'});
const {engine,forge}=w.SnakeSurcharges.install(knot.engine,knot.forge);
w.SnakeForge=forge;
const seeds=[972137,972241,972353];
function run(year,core,mod,seed){
  const s=engine.create(w.SnakeRevanche.random(seed),year);
  s.director=w.SnakeDirector.create();s.initiation=w.SnakeInitiation.create('facultatif',0);
  forge.equip(s,core,mod);
  const pulse=w.SnakePulse.create(w.SnakeCampagnePulseData,year),boss=[],defeated=[],stages=[1];
  let now=0,due=0,flight=false;
  const beat=ms=>pulse.project(pulse.loopStart+ms/1000*pulse.rate,true,'clock');
  const defense=(state,dt)=>w.SnakeEquilibre.tick(state,dt,w.SnakeGardiens.tick);
  const enemies=(state,dt)=>w.SnakeSingularite.tick(state,dt,defense);
  function collect(){
    for(const e of s.events){
      if(e.type==='sector')stages.push(e.difficulty);
      if(e.type==='boss')boss.push(e.name);
      if(e.type==='bossDefeated')defeated.push(e.name);
    }
    s.events.length=0;
  }
  const ticks=w.SnakeCadence.create((dt,t)=>{
    s.beat=beat(t);s.musicPulse=s.beat.pulse;
    if(['boss','recovery'].includes(s.director.phase))s.spawnClock=Math.max(.15,s.spawnClock);
    w.SnakeRelance.before(s);w.SnakeEcologie.tick(s,dt,enemies);
    const enc=w.SnakeDirector.tick(s.director,s,dt);s.score+=enc.points;
    w.SnakeInitiation.update(s.initiation,s,dt,s.events);
    s.aide=w.SnakeInitiation.cue(s.initiation,s);collect();
    return s.status==='playing';
  },()=>s.flight?120:60);ticks.reset(0);
  for(let frame=1;frame<=180*60;frame++){
    if(s.status==='upgrade'){
      if(w.SnakeAtelier.available(s))assert.equal(w.SnakeAtelier.apply(s,core,{forge}).changed,false);
      engine.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');ticks.reset(now);
    }
    if(s.status!=='playing')break;
    if(now>=due||flight!==!!s.flight){
      const act=pilot(s);flight=!!s.flight;due=now+act.advance*1000;
      if(act.flight)w.SnakeFlight.aim(s,...act.vector);
      else{
        if(act.shift)engine.shiftPlane(s);
        if(act.fire)w.SnakeSynchroNova.fire(s,beat(now),engine.fire);
        const key=act.keys[0];
        if(s.status==='playing')engine.turn(s,+(key==='ArrowRight')-+(key==='ArrowLeft'),+(key==='ArrowDown')-+(key==='ArrowUp'));
      }
      collect();
    }
    if(s.status==='playing'){now=frame*1000/60;ticks.advance(now);}
  }
  assert.equal(s.forge.core,core);assert.equal(s.forge.mod,mod);
  assert.deepEqual(stages,Array.from({length:s.difficulty},(_,i)=>i+1));
  if(['cleared','won'].includes(s.status)){assert.equal(s.difficulty,10);assert.deepEqual(boss,defeated);assert.equal(defeated.length,2);}
  return {year,core,mod,seed,score:s.score,status:s.status,cran:s.difficulty,seconds:+s.elapsed.toFixed(2),boss,defeated,cause:s.cause||null};
}
const rows=[];
for(const {year} of engine.eras)for(const {id:core} of forge.cores)for(const {id:mod} of forge.mods)for(const seed of seeds)rows.push(run(year,core,mod,seed));
const wins=r=>['won','cleared'].includes(r.status);
const counts={};
for(const r of rows){
  const key=r.core+'+'+r.mod;
  counts[key]??={};counts[key][r.year]=(counts[key][r.year]||0)+Number(wins(r));
}
fs.writeFileSync(path.join(__dirname,'campagnes.json'),JSON.stringify({seeds,hashes,counts,rows})+'\n');
console.log(JSON.stringify(counts),rows.filter(wins).length+'/'+rows.length,rows.filter(r=>!wins(r)).map(r=>r.cause));
