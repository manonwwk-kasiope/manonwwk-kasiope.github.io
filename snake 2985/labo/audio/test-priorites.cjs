'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const assert=require('node:assert/strict'), {execFileSync}=require('node:child_process');
const mix=require('./priorites.js');
const rate=12000, duration=6, samples=duration*rate;
const project=path.resolve(__dirname,'../..');
function random(seed) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
}
class Gain {
  constructor() {
    this.events=[];
    this.gain={
      cancelScheduledValues:t=>{this.events=this.events.filter(e=>e.time<t);},
      setTargetAtTime:(value,time,tau)=>this.events.push({value,time,tau}),
      setValueAtTime:(value,time)=>this.events.push({value,time,tau:0})
    };
  }
  connect() {}
  disconnect() {}
  envelope() {
    const arr=new Float32Array(samples);
    let value=1,dest=1,k=1,index=0;
    for(let i=0;i<samples;i++) {
      while(index<this.events.length && this.events[index].time*rate<=i+1e-8) {
        const e=this.events[index++];dest=e.value;k=e.tau?1-Math.exp(-1/(rate*e.tau)):1;
      }
      arr[i]=value; value+=(dest-value)*k;
    }
    return arr;
  }
}
class Context {
  currentTime=0;sampleRate=rate;gains=[];sources=[];
  createGain() {const g=new Gain();this.gains.push(g);return g;}
  createBuffer(ch,n,sr) {
    const planes=Array.from({length:ch},()=>new Float32Array(n));
    return {duration:n/sr,getChannelData:i=>planes[i]};
  }
  createBufferSource() {
    const source={connect:g=>{source.bus=g;},start:t=>{source.at=t;source.cue=this.cue;this.sources.push(source);},
      stop:()=>{source.stopped=this.currentTime;},disconnect:()=>{}};
    return source;
  }
}

function engineContract() {
  const context={window:{}};
  for(const file of ['vol-libre.js','forge.js','labo/moteur.js'])
    vm.runInNewContext(fs.readFileSync(path.join(project,file),'utf8'),context);
  const {SnakeArcade:engine,SnakeFlight:flight,SnakeForge:forge}=context.window;
  const fake=new Context(), audio=mix.create(fake,{}), seen=new Set();
  for(const {id:core} of forge.cores) for(const {id:mod} of forge.mods) {
    const s=engine.create(random(125),2);
    s.drones=[];s.gunClock=s.spawnClock=1e3;
    assert(engine.shiftPlane(s));s.eaten=1;assert(flight.offer(s));
    s.snake[0]={...s.flightGate};assert(flight.cross(s));forge.equip(s,core,mod);
    const h=s.snake[0],x=Math.round(h.x+2.5*s.direction.x),y=Math.round(h.y+2.5*s.direction.y);
    s.drones=[{x,y,next:{x,y,plane:s.plane},id:41,plane:s.plane,warmup:0,moveIn:100,moveEvery:100}];
    for(let i=0;i<30;i++) engine.tick(s,1/60);
    const valid=s.events.filter(e=>['forgeHit','forgeShot','flightGate','flightStart','planeShift'].includes(e.type));
    for(const info of valid) {
      fake.currentTime+=1;assert(audio.play(info));seen.add(info.type);
      if(info.type.startsWith('forge')) {assert.equal(info.core,core);assert.equal(info.mod,mod);}
    }
    assert(valid.some(e=>e.type==='forgeHit'));
  }
  // Placer une cellule juste devant le joueur à la fin du secteur quatre.
  const duel=engine.create(random(126),2);
  duel.drones=[];duel.gunClock=duel.spawnClock=1e3;
  duel.difficulty=duel.sector=4;duel.sectorCells=duel.sectorGoal-1;
  duel.cells=[{x:duel.snake[0].x+1,y:duel.snake[0].y,plane:0}];
  engine.tick(duel,duel.stepTime+.001);assert(duel.boss?.attack);
  duel.boss.attack.remaining=.001;
  engine.tick(duel,.002);
  for(const e of duel.events.filter(e=>['boss','bossAttack','bossVolley'].includes(e.type))) {
    fake.currentTime+=1; assert(audio.play(e));seen.add(e.type);
  }
  assert.equal(seen.size,8);audio.stop();audio.dispose();assert(!audio.play({type:'boss'}));
  return [...seen].sort();
}
function sequence(seed) {
  const rng=random(seed), events=[];
  for(let t=.12;t<5.57;t+=.12+rng()*.16) {
    const cores=['orbit','prism','well'],mods=['blast','chain','echo'];
    const core=cores[Math.floor(rng()*3)],mod=mods[Math.floor(rng()*3)],plane=rng()>.5?1:0;
    events.push({time:t,type:'forgeShot',core,mod,plane});
    const hits=4+Math.floor(rng()*7);
    for(let i=0;i<hits;i++) events.push({time:t+.048*rng(),type:'forgeHit',core,mod,plane});
    if(rng()<.3) events.push({time:t+.05,type:'flightRing'});
  }
  for(const [i,at] of [.48,1.16,1.84,2.55,3.27,4.01,4.70,5.28].entries()) {
    const time=at+.08*rng();
    events.push({time,type:i%2?'bossVolley':'bossAttack',critical:true});
    if(i%2===0) events.push({time:time+.02,type:'planeShift',to:i%4===0?1:0,critical:true});
  }
  return events.sort((a,b)=>a.time-b.time);
}
function bed(name,start=36,speed=1) {
  const b=execFileSync('ffmpeg',['-v','error','-nostdin','-ss',String(start),'-i',path.join(project,'audio',name+'.mp3'),
    '-t','6',...(speed===1?[]:['-af','aresample=48000,asetrate='+Math.round(48000*speed)+',aresample='+rate]),'-ar',String(rate),'-ac','1','-f','f32le','-']);
  const pcm=new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  assert.equal(pcm.length,samples);
  return pcm.map(x=>x*.79*.82);
}
function run(events,mode,music,{year=null,fxGain=.72,pcm=false}={}) {
  const ctx=new Context(),mixer=mix.create(ctx,{}, {limit:8,mode,year}), accepted=new Set();
  for(const e of events) {
    ctx.currentTime=e.time;ctx.cue=e;
    if(mixer.play(e)) accepted.add(e);
  }
  const audio=music.slice(), stems=new Map(), gains=new Map(ctx.gains.map(g=>[g,g.envelope()]));
  for(const source of ctx.sources) {
    const a=source.buffer.getChannelData(0), b=source.buffer.getChannelData(1);
    const at=Math.round(source.at*rate), sig=new Float32Array(a.length), env=gains.get(source.bus);
    for(let i=0;i<a.length && at+i<samples;i++) {
      sig[i]=fxGain*(a[i]+b[i])*.5*env[at+i];audio[at+i]+=sig[i];
    }
    if(source.cue.critical) stems.set(source.cue,{sig,at});
  }
  const score={boss:[],plane:[]}, sent={boss:0,plane:0};
  for(const e of events.filter(e=>e.critical)) {
    const k=e.type==='planeShift'?'plane':'boss';
    sent[k]++;
    if(!accepted.has(e)) continue;
    const {sig,at}=stems.get(e);let signal=0,noise=0;
    for(let i=0;i<sig.length;i++) {signal+=sig[i]**2; noise+=(audio[at+i]-sig[i])**2;}
    score[k].push(10*Math.log10(signal/Math.max(1e-12,noise)));
  }
  const trim=10**(-1/20);
  let peak=0,clip=0,clippedAfterTrim=0;
  for(const x of audio) {
    peak=Math.max(peak,Math.abs(x));
    if(Math.abs(x)>=1) clip++;
    if(Math.abs(x)*trim>=1) clippedAfterTrim++;
  }
  return {sent,score,peak,clip,clippedAfterTrim,voices:mixer.stats.peakVoices,...(pcm?{audio}:{})};
}
const percentile=(x,p)=>x.slice().sort((a,b)=>a-b)[Math.floor((x.length-1)*p)];
module.exports={bed,run,sequence,Context,percentile};
if(require.main===module) {
// Saturer les huit places à l’identique au même instant, puis vérifier libération et reprise.
{
  const clock=new Context(), audio=mix.create(clock,{});
  for(let i=0;i<4;i++) assert(audio.play({type:'forgeShot',core:'orbit'}));
  assert(!audio.play({type:'forgeShot',core:'well'}));
  for(const type of ['boss','bossAttack','planeShift','planeShift']) assert(audio.play({type,to:1}));
  assert.equal(audio.stats.peakVoices,8);assert(!audio.play({type:'bossVolley'}));
  assert(audio.handles({type:'bossVolley'}));assert(!audio.handles({type:'unexpected'}));
  audio.stop();
  assert(audio.play({type:'bossVolley'}));
  audio.dispose();assert(!audio.play({type:'bossVolley'}));
}
const files=['neonvelocity-2','electro-tension-t106','electro-titan-t112','voix-machine-t106','voix-plus-vite-t108'];
const beds=files.map(name=>bed(name)),summary={engineEvents:engineContract(),seeds:[],files,modes:{}};
for(const mode of ['raw','fifo','priority']) {
  const totals={boss:0,plane:0},scores={boss:[],plane:[]};
  let peak=0,clips=0,clippedAfterTrim=0,voices=0;
  const bySeed=[];
  for(let i=0;i<20;i++) {
    const seed=2985001+i*4093;
    if(mode==='raw') summary.seeds.push(seed);
    const r=run(sequence(seed),mode,beds[i%files.length]);
    for(const k of Object.keys(scores)) {totals[k]+=r.sent[k];scores[k].push(...r.score[k]);}
    bySeed.push({seed,boss:r.score.boss.length,plane:r.score.plane.length,
      bossMedianDb:r.score.boss.length?percentile(r.score.boss,.5):null,
      planeMedianDb:r.score.plane.length?percentile(r.score.plane,.5):null});
    peak=Math.max(peak,r.peak);clips+=r.clip;clippedAfterTrim+=r.clippedAfterTrim;voices=Math.max(voices,r.voices);
  }
  const result={maxVoices:voices,peakDbfs:20*Math.log10(peak),clippingSamples:clips,clippedAfterTrim,peakAfterTrimDbfs:20*Math.log10(peak)-1,bySeed};
  for(const k of Object.keys(scores)) result[k]={sent:totals[k],accepted:scores[k].length,
    medianDb:percentile(scores[k],.5),p10Db:percentile(scores[k],.1)};
  summary.modes[mode]=result;
}
const {priority,raw,fifo}=summary.modes;
assert.equal(priority.clippedAfterTrim,0);assert(priority.maxVoices<=8);assert(fifo.maxVoices<=8);
for(const k of ['boss','plane']) {
  assert.equal(priority[k].accepted,priority[k].sent);
  assert(priority[k].accepted>fifo[k].accepted);
  assert(priority[k].medianDb>raw[k].medianDb);
}
fs.writeFileSync(path.join(__dirname,'mesures-priorites.json'),JSON.stringify(summary,null,2)+'\n');
for(const [k,{bySeed,...v}] of Object.entries(summary.modes)) console.log(k,v);
}
