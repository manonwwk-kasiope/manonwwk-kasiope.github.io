'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),zlib=require('zlib'),crypto=require('crypto');
const lab=path.dirname(__dirname),profile=require('../equilibrage/pilotes.cjs'),pilot=require('../bout-en-bout/pilote.js')(profile);
const code=p=>fs.readFileSync(path.join(lab,p),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const room=code('campagne/chambre.js'),markup=code('campagne/index.html');
const paths=['../forge.js','../vol-libre.js','evolution/evolution.js','moteur.js','gardiens/gardiens.js','surf-boss/surf.js','noeud/noeud.js','surcharges/surcharges.js','rythme/directeur.js','ecologie/ecologie.js','equilibrage/parametres.js','atelier/atelier.js','initiation/initiation.js','difficulte/relance.js'];
if(markup.includes('/singularite.js'))paths.unshift('singularite/singularite.js');
global.window=globalThis;const hashes={room:hash(room),index:hash(markup)};
for(const file of paths){const text=code(file);vm.runInThisContext('(function(module){'+text+'\n})(undefined)',{filename:file});hashes[file]=hash(text);}
assert(room.includes('SnakeSurf.install()')&&room.includes('SnakeEcologie.tick(state,dt,menaces)'));
SnakeSurf.install();
const k=SnakeKnot.install(SnakeArcade,SnakeEvolution.install(SnakeForge),{mode:'exact'}),api=SnakeSurcharges.install(k.engine,k.forge);
global.SnakeForge=api.forge;
const e=api.engine;
const singular=room.includes('SnakeSingularite.tick');
const defense=(s,dt)=>SnakeEquilibre.tick(s,dt,SnakeGardiens.tick);
const enemies=singular?(s,dt)=>SnakeSingularite.tick(s,dt,defense):defense;
const phases=['normal','duel','apres','approche','repos'];
const fields=()=>({seconds:0,droneSeconds:0,arrivals:0,warnings:0,activations:0,warningTiles:0,liveTiles:0,choices:0,cut:0,pressure:0,decisions:0,relaunch:0});
const rand=n=>()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
function run(year,seed,kind,variant){
 const random=rand(seed^0xb21122),s=e.create(rand(seed),year),dir=SnakeDirector.create(),history=[];
 s.director=dir;s.initiation=SnakeInitiation.create('facultatif',0);api.forge.equip(s,'prism','chain');
 const seen=new Set(s.drones.map(d=>d.id)),levels=Array.from({length:10},()=>Object.fromEntries(phases.map(p=>[p,fields()])));
 let reached=[1],defeats=[],midEnd=-100,current=null;
 function event(ev,row){
   if(ev.type==='sector')reached.push(ev.difficulty);
   if(ev.type==='boss')current={kind:ev.kind,t:s.elapsed,warning:0,volley:0};
   if(ev.type==='guardianWarning'&&current)current.warning++;
   if(ev.type==='bossVolley'&&current)current.volley++;
   if(row&&['guardianWarning','ecoWarning'].includes(ev.type))row.warnings++;
   if(row&&['bossVolley','ecoActive'].includes(ev.type))row.activations++;
   if(ev.type==='bossDefeated'){assert(current);defeats.push({...current,name:ev.name,duration:s.elapsed-current.t});current=null;if(ev.kind==='mid')midEnd=s.elapsed;}
 }
 function phase(){
   if(s.boss)return 'duel';
   if(s.elapsed-midEnd<4)return 'apres';
   if(s.nearBoss>=.84||dir.phase==='boss')return 'approche';
   if(dir.phase==='recovery')return 'repos';
   return 'normal';
 }
 function action(){
   if(s.flight||kind==='expert')return pilot(s);
   const config=profile.profiles.habitué;
   history.push(profile.observe(s,config));
   while(history.length>1&&history[1].elapsed<=s.elapsed-config.latency)history.shift();
   const a=profile.limited(s,history[0],config);
   const alternatives=profile.dirs.filter(d=>profile.legal(s,d)&&(a.d[0]!==d[0]||a.d[1]!==d[1]));
   const err=random(),p=random();
   if(alternatives.length&&err<config.err)a.d=alternatives[Math.floor(p*alternatives.length)];
   return {keys:[a.d[0]>0?'ArrowRight':a.d[0]<0?'ArrowLeft':a.d[1]>0?'ArrowDown':'ArrowUp'],shift:a.shift,fire:a.fire&&s.novaCharge===1,advance:Math.max(.0002,s.stepTime-s.stepClock+1e-5)};
 }
 function sample(row,dt){
   row.seconds+=dt;
   const h=s.snake[0],b=s.boss,a=b?.attack,w=s.ecologie?.wave;
   const marks=[a,w].filter(v=>v?.plane===s.plane);
   for(const active of [false,true]){
      const arrays=marks.filter(o=>(o.phase==='active')===active).map(o=>o.danger||o.mask);
      let n=arrays[0]?.size||0;
      if(arrays.length>1)for(const id of arrays[1])if(!arrays[0].has(id))n++;
      row[active?'liveTiles':'warningTiles']+=n*dt;
   }
   row.droneSeconds+=dt*s.drones.filter(d=>d.plane===s.plane&&d.warmup<=0&&!d.ecoRole).length;
   if(s.flight)return;
   let blocked=0,open=0;
   for(const [dx,dy] of profile.dirs){
     if(dx*s.direction.x+dy*s.direction.y<0)continue;
     const x=h.x+dx,y=h.y+dy;
     if(x<0||y<0||x>=s.width||y>=s.height||s.snake.slice(1,-1).some(p=>p.plane===s.plane&&x===p.x&&y===p.y))continue;
     open++;
     const body=b?.plane===s.plane&&Math.max(Math.abs(x-b.x),Math.abs(y-b.y))<=1;
     const d=s.drones.some(q=>q.plane===s.plane&&!q.ecoRole&&q.warmup<=s.stepTime&&(q.x===x&&q.y===y||q.moveIn<=s.stepTime&&q.next.x===x&&q.next.y===y));
     if(body||d||marks.some(m=>(m.phase==='active'||m.remaining<=s.stepTime)&&(m.danger||m.mask).has(y*s.width+x)))blocked++;
   }
   row.choices+=open*dt;row.cut+=blocked*dt;if(blocked)row.pressure+=dt;
 }
 for(let j=0;j<6000&&s.elapsed<150&&['playing','upgrade'].includes(s.status);j++){
   if(s.status==='upgrade'){
     if(SnakeAtelier.available(s))SnakeAtelier.apply(s,e.eras.findIndex(a=>a.year===year)%2===0?'well':'prism',{forge:api.forge});
     e.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
   }
   const a=action();
   if(a.flight)SnakeFlight.aim(s,...a.vector);
   else{if(a.shift)e.shiftPlane(s);if(a.fire)e.fire(s);if(s.status==='playing'){const k=a.keys[0];e.turn(s,+(k==='ArrowRight')-+(k==='ArrowLeft'),+(k==='ArrowDown')-+(k==='ArrowUp'));}}
   let remain=a.advance;
   while(remain>1e-9&&s.status==='playing'){
      const dt=Math.min(.04,remain),stage=s.difficulty,part=phase(),row=levels[stage-1][part];
      sample(row,dt);if(variant==='relance'&&SnakeRelance.before(s)){assert(part==='normal');row.relaunch++;}
      if(['boss','recovery'].includes(dir.phase))s.spawnClock=Math.max(.15,s.spawnClock);
      SnakeEcologie.tick(s,dt,enemies);
      const enc=SnakeDirector.tick(dir,s,dt);s.score+=enc.points;
      SnakeInitiation.update(s.initiation,s,dt,s.events);s.aide=SnakeInitiation.cue(s.initiation,s);
      for(const drone of s.drones)if(!seen.has(drone.id)){seen.add(drone.id);if(!drone.ecoRole)row.arrivals++;}
      for(const ev of s.events)event(ev,row);
      s.events.length=0;remain-=dt;
   }
   // An input can end a boss before a substep starts (manual nova).
   for(const ev of s.events)event(ev,null);s.events.length=0;
 }
 assert.deepEqual(reached,Array.from({length:s.difficulty},(_,i)=>i+1));
 return {year,seed,kind,variant,levels,reached,defeats,status:s.status,grade:s.difficulty,cause:s.cause||null,t:s.elapsed};
}
const split=process.argv[2]||'cal',rows=[];
for(let i=0;i<(split==='cal'?12:24);i++)for(const era of e.eras)for(const kind of ['expert','habitué'])for(const variant of ['temoin','relance']){
 rows.push(run(era.year,(split==='cal'?83011:191021)+i*113,kind,variant));
}
fs.writeFileSync(path.join(__dirname,split+'.json.gz'),zlib.gzipSync(JSON.stringify({hashes,singular,rows})));console.log(split,rows.length);
