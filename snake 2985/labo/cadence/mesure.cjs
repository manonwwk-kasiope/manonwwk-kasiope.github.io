'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {performance}=require('node:perf_hooks'),cad=require('./cadence.js');
const w={};w.window=w;vm.createContext(w);
const lab=path.dirname(__dirname);
for(const file of ['../forge.js','../vol-libre.js','evolution/evolution.js','moteur.js','singularite/singularite.js','gardiens/gardiens.js','surf-boss/surf.js','noeud/noeud.js','surcharges/surcharges.js','ecologie/ecologie.js','equilibrage/parametres.js','rythme/directeur.js','difficulte/relance.js','revanche/revanche.js','atelier/atelier.js']){
  vm.runInContext(fs.readFileSync(path.join(lab,file),'utf8'),w,{filename:file});
}
w.SnakeSurf.install();
const k=w.SnakeKnot.install(w.SnakeArcade,w.SnakeEvolution.install(w.SnakeForge),{mode:'exact'});
const api=w.SnakeSurcharges.install(k.engine,k.forge),e=api.engine;w.SnakeForge=api.forge;
const choose=require('../bout-en-bout/pilote.js')(require('../equilibrage/pilotes.cjs'));
const round=n=>Math.round(n*1e6)/1e6;
function create(year,seed){
 const s=e.create(w.SnakeRevanche.random(seed),e.eras.findIndex(it=>it.year===year));s.director=w.SnakeDirector.create();
 api.forge.equip(s,'prism','chain');
 return {s,events:[],count:0,cpu:0};
}
function advance(g,dt){
 const {s}=g;if(s.status!=='playing'||dt<=0)return;
 const started=performance.now();g.count++;
 if(['boss','recovery'].includes(s.director.phase))s.spawnClock=Math.max(.15,s.spawnClock);
 w.SnakeRelance.before(s);
 w.SnakeEcologie.tick(s,dt,(q,t)=>w.SnakeEquilibre.tick(q,t,w.SnakeGardiens.tick));
 const enc=w.SnakeDirector.tick(s.director,s,dt);s.score+=enc.points;
 for(const ev of s.events)if(['death','upgrade','boss','bossDefeated','flightStart','flightRing','flightEnd'].includes(ev.type))
   g.events.push({event:ev.type,t:round(s.elapsed),score:s.score});
 s.events.length=0;g.cpu+=performance.now()-started;
}
function act(s,c){
 const [,type,x,y]=c;
 if(type==='aim')w.SnakeFlight.aim(s,x,y);
 if(type==='turn')e.turn(s,x,y);
 if(type==='plan')e.shiftPlane(s);
 if(type==='nova')e.fire(s);
 if(type==='atelier'&&s.status==='upgrade'){
   if(w.SnakeAtelier.available(s))w.SnakeAtelier.apply(s,'prism',{forge:api.forge});
   e.upgrade(s,x);
 }
}
function makeTrace(name,year,seed){
 const g=create(year,seed),s=g.s,commands=[];
 let due=0,wasFlight=false;
 for(let frame=0;frame<60*115;frame++){
   const stamp=(frame+.22+(frame%5)*.09)*1000/60;
   const issue=(type,...args)=>{const cmd=[round(stamp),type,...args];commands.push(cmd);act(s,cmd);};
   if(s.status==='upgrade')issue('atelier',!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
   if(s.status!=='playing')break;
   if(name==='grille'){
     const moves={61:['turn',0,-1],85:['turn',1,0],114:['nova'],170:['plan'],197:['turn',0,1],263:['turn',-1,0],359:['plan'],421:['turn',0,-1]};
     if(moves[frame])issue(...moves[frame]);
   }else if(name==='vol'){
     if(s.flight && frame%4===0){const h=s.snake[0],r=s.flight.rings[s.flight.passed];issue('aim',round(r.x-h.x),round(r.y-h.y));wasFlight=true;}
     else if(wasFlight && !s.flight && frame%79===0)issue('plan');
   }else if(stamp>=due || (s.flight&&!wasFlight)){
     const a=choose(s);
     if(a.flight)issue('aim',...a.vector.map(round));
     else{
       if(a.shift)issue('plan');if(a.fire)issue('nova');
       const key=a.keys[0];issue('turn',+(key==='ArrowRight')-+(key==='ArrowLeft'),+(key==='ArrowDown')-+(key==='ArrowUp'));
     }
     wasFlight=!!s.flight;due=stamp+a.advance*1000;
   }
   advance(g,1/60);
   if(s.status==='won'||s.status==='cleared'||s.status==='dead')break;
 }
 return {name,year,seed,commands,duration:Math.ceil((s.elapsed*1000+3000)/1000)*1000,recorded:{status:s.status,score:s.score,events:g.events}};
}
const tempos={'30 Hz':[1000/30],'60 Hz':[1000/60],'120 Hz':[1000/120],jitter:[8,27,11,21,9,24]};
function timeline(periods,duration){
 const out=[];let t=0,i=0;
 while(t<duration-1e-6){t=Math.min(duration,t+periods[i++%periods.length]);out.push(Math.round(t*10)/10);}
 return out;
}
const xyz=p=>p?[round(p.x),round(p.y),p.plane??0]:null;
function snapshot(g){
 const s=g.s;
 return {status:s.status,cause:s.cause,score:s.score,kills:s.kills,difficulty:s.difficulty,elapsed:round(s.elapsed),snake:s.snake.map(xyz),
   dir:xyz(s.direction),levels:{...s.levels},charge:round(s.novaCharge),gun:round(s.gunClock),step:round(s.stepClock),
   drones:s.drones.map(d=>[d.id,...xyz(d),...xyz(d.next),round(d.moveIn)]),boss:s.boss?[s.boss.hp,xyz(s.boss),s.boss.attack?.phase]:null,
   flight:s.flight?[round(s.flight.angle),s.flight.passed,round(s.flight.remaining)]:null,encounter:[s.director.phase,s.director.rounds]};
}
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,16);
function replay(trace,periods,model){
 const g=create(trace.year,trace.seed),s=g.s,marks=[],lags=[];let prev=0,idx=0;
 const fixed=model.startsWith('fixe'),hz=model.endsWith('240')?()=>s.flight?240:60:model.endsWith('mixte')?()=>s.flight?120:60:model.endsWith('120')?120:60;
 const clock=cad.create(dt=>{advance(g,dt);},hz);clock.reset(0);
 for(const now of timeline(periods,trace.duration)){
   let last=prev;
   while(idx<trace.commands.length && trace.commands[idx][0]<=now+1e-7){
     const c=trace.commands[idx++];
     if(model==='découpé'){advance(g,(c[0]-last)/1000);last=c[0];}
     if(fixed&&model.includes('geste'))clock.advance(c[0]);
     act(s,c);lags.push(c[0]-prev);
   }
   if(fixed)clock.advance(now);else advance(g,(now-last)/1000);
   prev=now;
   if(Math.abs(now/1000-Math.round(now/1000))<1e-7 && marks.length<Math.round(now/1000))marks.push(snapshot(g));
 }
 const snap=snapshot(g);
 return {status:s.status,cause:s.cause,score:s.score,simTime:round(s.elapsed),boss:g.events.filter(e=>e.event==='boss').length,
   flight:g.events.filter(e=>e.event==='flightStart').length,calls:g.count,cpu:round(g.cpu),
   timeline:digest(marks),final:digest(snap),marks,lag:lags};
}
function main(){
const traceFile=path.join(__dirname,'commandes.json');
let traces;
if(fs.existsSync(traceFile)&&!process.argv.includes('--enregistrer')){
 traces=JSON.parse(fs.readFileSync(traceFile,'utf8'));
}else{
 traces=[makeTrace('grille',1976,17),makeTrace('vol',2985,1),makeTrace('boss',1995,1)];
 assert.equal(traces[1].recorded.events.filter(e=>e.event==='flightRing').length,3);
 assert.equal(traces[2].recorded.events.filter(e=>e.event==='bossDefeated').length,2);
 fs.writeFileSync(traceFile,JSON.stringify(traces,null,2)+'\n');
}
const results=[];
for(const t of traces){
 for(const model of ['courante','découpé','fixe simple 60','fixe geste 60','fixe geste 120','fixe geste mixte','fixe geste mixte 240']){
  const ref=replay(t,tempos['60 Hz'],model);
  for(const [hz,p] of Object.entries(tempos)){
   const r=replay(t,p,model);
   const paths=r.marks.map((m,i)=>Math.hypot(m.snake[0][0]-ref.marks[i].snake[0][0],m.snake[0][1]-ref.marks[i].snake[0][1]));
   const {marks,lag,...row}=r;
   results.push({trace:t.name,model,hz,...row,exactParSeconde:r.timeline===ref.timeline,
     scoresIdentiques:r.marks.every((m,i)=>m.score===ref.marks[i].score),maxEcartTete:round(Math.max(...paths)),
     avanceGesteSurDerniereImageMs:lag.length?round(Math.max(...lag)):0});
  }
 }
}

fs.writeFileSync(path.join(__dirname,'resultats.json'),JSON.stringify(results,null,2)+'\n');
for(const t of traces)console.log(t.name,t.seed,t.commands.length,t.recorded.status,t.recorded.score,t.recorded.events.filter(e=>e.event==='boss').length);
for(const model of new Set(results.map(x=>x.model))){const subset=results.filter(x=>x.model===model&&x.hz!=='60 Hz');
 console.log(model,'exact',subset.filter(x=>x.exactParSeconde).length,'/9','score snapshots',subset.filter(x=>x.scoresIdentiques).length,'/9','écart tête',Math.max(...subset.map(x=>x.maxEcartTete)));
}

}
if(require.main===module)main();
module.exports={create,advance,act,replay,timeline,tempos,round};
