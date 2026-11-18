'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {create,years}=require('./priorites.js');
const {Context,sequence,bed,run,percentile}=require('./test-priorites.cjs');
const rows=require('./pouls.json'),surges=require('../surcharges/surcharges.js');
const lab={window:{}};
for(const f of ['../../forge.js','../moteur.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),lab);
const equipped=surges.install(lab.window.SnakeArcade,lab.window.SnakeForge);lab.window.SnakeForge=equipped.forge;
const db=x=>20*Math.log10(Math.max(1e-12,x));
function actual(year,i) {
  const s=equipped.engine.create(()=>.44,i);s.eaten=2;s.novaCharge=1;
  s.drones=[];s.forge.clock=s.gunClock=s.spawnClock=1e3;
  assert(surges.read(s).ready && equipped.engine.fire(s));
  const fired=s.events.splice(0);assert.equal(fired[0].type,'nova');
  const surge=fired.find(e=>e.type==='novaOverload');assert.equal(surge.year,year);
  const shape=surges.geometry(s)[0];assert(shape);
  const x=shape.kind==='ring'?shape.x+shape.r:(shape.ax+shape.bx)/2;
  const y=shape.kind==='ring'?shape.y:(shape.ay+shape.by)/2;
  s.drones=[{id:19,x,y,plane:shape.plane,next:{x,y,plane:shape.plane},warmup:0,moveIn:100,moveEvery:100}];
  equipped.engine.tick(s,1/600);
  const hit=s.events.find(e=>e.type==='novaOverloadHit');assert(hit && hit.signature===surge.signature);
  return {surge,hit,order:fired.map(e=>e.type),onHit:s.events.map(e=>e.type)};
}
function wave(event,year,rate) {
  const c=new Context();c.sampleRate=rate;
  const mix=create(c,{}, {year});assert(mix.play(event));
  return c.sources[0].buffer;
}
function mono(buffer) {
  const a=buffer.getChannelData(0),b=buffer.getChannelData(1);return a.map((v,i)=>(v+b[i])/2);
}
function cosine(a,b) {
  let dot=0,aa=0,bb=0;
  for(const v of a) aa+=v*v;for(const v of b) bb+=v*v;
  for(let i=0;i<Math.min(a.length,b.length);i++) dot+=a[i]*b[i];
  return dot/Math.sqrt(aa*bb);
}
const results=[],preview=[],events=years.map(actual);
for(let i=0;i<years.length;i++) {
  const year=years[i],row=rows[i],{surge,hit,order,onHit}=events[i];
  const sounds=events.map(e=>mono(wave(e.surge,year,12000)));
  let maxCos=0;
  for(let j=0;j<sounds.length;j++)for(let k=0;k<j;k++)maxCos=Math.max(maxCos,Math.abs(cosine(sounds[j],sounds[k])));
  assert(maxCos<.7);
  let peakDry=0;
  for(const rate of [12000,24000,44100,48000]) {
    const signal=wave(surge,year,rate);
    for(let ch=0;ch<2;ch++)for(const x of signal.getChannelData(ch)) peakDry=Math.max(peakDry,Math.abs(x));
  }
  assert(peakDry<=.340001);
  const beds=[0,.26,.54,.81].map(f=>bed(row.track.replace('.mp3',''),row.loopStart+(row.loopEnd-row.loopStart-6*row.rate)*f,row.rate));
  const deltas=[],perTrial=[];let maximum=0,warnings=0,planes=0,overloads=0;
  for(let k=0;k<12;k++) {
    const seed=44039+1237*k,base=sequence(seed),critical=base.filter(e=>e.critical);
    const extra=critical.filter(e=>e.type!=='planeShift').flatMap(e=>[
      {...surge,time:e.time},{...hit,time:e.time+.032},{...hit,time:e.time+.057},{...hit,time:e.time+.075}]);
    const ordered=[...base,...extra].sort((a,b)=>a.time-b.time);
    const music=beds[k%4],opts={year,fxGain:.32*.72};
    const reference=run(base,'priority',music,opts),mixed=run(ordered,'priority',music,opts);
    assert.equal(mixed.score.boss.length,8);assert.equal(mixed.score.plane.length,4);
    warnings+=mixed.score.boss.length;planes+=mixed.score.plane.length;overloads+=mixed.overloads;assert.equal(mixed.overloads,8);
    for(const group of ['boss','plane']) mixed.score[group].forEach((v,j)=>deltas.push(v-reference.score[group][j]));
    maximum=Math.max(maximum,mixed.peak);
    assert.equal(mixed.clip,0);assert(mixed.voices<=8);
    perTrial.push({seed,peakDb:db(mixed.peak),maxVoices:mixed.voices});
  }
  const dry=mono(wave(surge,year,12000)),clip=beds[0].slice(0,24000);
  for(let n=0;n<dry.length;n++)clip[3600+n]+=dry[n]*(.32*.72);
  for(let n=0;n<clip.length;n++)clip[n]*=.5*Math.min(1,n/300,(clip.length-1-n)/300);
  preview.push(Buffer.from(clip.buffer));
  results.push({year,signature:surge.signature,engineOrder:order,hitOrder:onHit,seconds:dry.length/12000,
    peakDryDb:db(peakDry),maxCosineSamePalette:maxCos,warnings,planes,overloads,
    p10DeltaDb:percentile(deltas,.1),medianDeltaDb:percentile(deltas,.5),worstDeltaDb:Math.min(...deltas),
    peakMixDb:db(maximum),perTrial});
}
fs.writeFileSync(path.join(__dirname,'mesures-surnovas.json'),JSON.stringify(results,null,2)+'\n');
execFileSync('ffmpeg',['-v','error','-nostdin','-y','-f','f32le','-ar','12000','-ac','1','-i','pipe:0',
  '-c:a','pcm_s16le',path.join(__dirname,'surnovas-cinq-epoques.wav')],{input:Buffer.concat(preview)});
console.table(results.map(({year,seconds,warnings,planes,peakDryDb,maxCosineSamePalette,p10DeltaDb,worstDeltaDb,peakMixDb})=>({
  year,seconds,warnings,planes,peakDryDb,maxCosineSamePalette,p10DeltaDb,worstDeltaDb,peakMixDb})));
