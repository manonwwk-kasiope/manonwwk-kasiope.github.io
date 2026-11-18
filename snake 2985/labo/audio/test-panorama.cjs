'use strict';
const {execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),{Context,sequence,percentile}=require('./test-priorites.cjs');
const {create}=require('./priorites.js'),rows=require('./pouls.json'),rate=12000;
const toDb=x=>20*Math.log10(Math.max(1e-16,x));
function summary(buffer) {
  const l=buffer.getChannelData(0),r=buffer.getChannelData(1);
  let ll=0,rr=0,peak=0;
  for(let i=0;i<l.length;i++) {ll+=l[i]**2;rr+=r[i]**2;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));}
  return {rightOverLeftDb:10*Math.log10(rr/ll),peak,mono:l.map((x,i)=>(x+r[i])*.5)};
}
function largestDifference(a,b) {let max=0;for(let i=0;i<a.length;i++) max=Math.max(max,Math.abs(a[i]-b[i]));return max;}
const types=[{type:'shot',kind:'rail'},{type:'shot',kind:'arc'},{type:'forgeShot',core:'prism'},
  {type:'forgeShot',core:'orbit'},{type:'forgeShot',core:'well'},{type:'forgeHit',mod:'chain'},{type:'forgeHit',mod:'blast'},
  {type:'forgeHit',mod:'echo'},{type:'nova'},{type:'novaOverload'},{type:'novaOverloadHit'},
  {type:'bossHit',heart:true},{type:'evolutionTrigger'},{type:'evolutionHit'}];
function placements(row) {
  const ctx=new Context(),fx=create(ctx,{}, {year:row.year}),width=36,arena={width,snake:[{x:35}],boss:{x:4}};
  const fire=(event,strength=1,state=arena)=>{
    ctx.currentTime++;assert(fx.play(event,undefined,state,strength));
    return ctx.sources.at(-1).buffer;
  };
  const info=[];let worstMono=0;
  for(const item of types) {
    const e={...item,year:row.year};
    const base=summary(fire({...e,x:0},0)),placed=[0,17.5,35].map(x=>summary(fire({...e,x})));
    for(const p of placed) worstMono=Math.max(worstMono,largestDifference(base.mono,p.mono));
    assert.equal(placed[1].rightOverLeftDb,base.rightOverLeftDb);
    assert(placed[0].rightOverLeftDb < -1 && placed[2].rightOverLeftDb > 1);
    assert(placed[0].rightOverLeftDb < placed[1].rightOverLeftDb && placed[1].rightOverLeftDb < placed[2].rightOverLeftDb);
    if(item.type==='novaOverload') assert(placed.every(p=>p.peak<=.340001));
    const reduced=summary(fire({...e,x:35},.5));assert(reduced.rightOverLeftDb<placed[2].rightOverLeftDb);
    info.push({type:item,leftDb:placed[0].rightOverLeftDb,centerDb:placed[1].rightOverLeftDb,
      rightDb:placed[2].rightOverLeftDb,reducedRightDb:reduced.rightOverLeftDb});
  }
  assert(worstMono<1e-7);
  for(const e of [{type:'bossAttack'},{type:'guardianWarning'},{type:'planeShift',to:1},{type:'ecoWarning',role:'sillage'}]) {
    const b=fire({...e,x:35});assert.equal(largestDifference(b.getChannelData(0),b.getChannelData(1)),0);
    assert.equal(fire({...e,x:0}),b);
  }
  const event={type:'nova',year:row.year};
  assert.equal(fire(event),fire({...event,x:35}));
  assert.equal(fire({...event,x:0}),fire({...event,x:0},1,{width:72}));
  assert.equal(fire({...event,x:17.5},1,{width:36}),fire({...event,x:35.5},1,{width:72}));
  assert.equal(fire({type:'bossHit',heart:true}),fire({type:'bossHit',heart:true,x:4}));
  const noPoint={type:'forgeHit',mod:'echo'};
  assert.equal(fire(noPoint),fire(noPoint,0));assert(fx.stats.cachedPlacements<=12);
  fx.setYear(row.year===1976?1985:1976);assert.equal(fx.stats.cachedPlacements,0);
  fx.stop();assert.equal(fx.stats.activeVoices,0);fx.dispose();assert.equal(fx.stats.cachedPlacements,0);
  return {worstMono,info};
}
function music(row) {
  const pcm=execFileSync('ffmpeg',['-v','error','-nostdin','-ss',String(row.loopStart),'-i',
    path.join(__dirname,'../../audio',row.track),'-t','6','-af','aresample=48000,asetrate='+Math.round(48000*row.rate)+',aresample='+rate,
    '-ac','2','-ar',String(rate),'-f','f32le','-']);
  return new Float32Array(pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.byteLength)).map(x=>x*.79*.82);
}
function mix(row,seed,bed,strength,fullVolume=false) {
  const ctx=new Context(),fx=create(ctx,{}, {year:row.year}),arena={width:36,snake:[{x:17.5}]};
  const es=sequence(seed),dangers=es.filter(e=>e.critical);
  for(const e of dangers.filter(e=>e.type!=='planeShift'))
    es.push({type:'novaOverload',year:row.year,time:e.time,x:seed%2?0:35});
  es.sort((a,b)=>a.time-b.time);
  let accepted=0;
  for(const [i,e] of es.entries()){
    ctx.currentTime=e.time;ctx.cue=e;
    if(e.x===undefined)e.x=[0,35,5,30,17.5][i%5];
    const ok=fx.play(e,undefined,arena,strength);
    if(e.critical && ok)accepted++;
  }
  const pcm=fullVolume?bed.map(x=>x/.82):bed.slice(),env=new Map(ctx.gains.map(g=>[g,g.envelope()]));
  for(const source of ctx.sources){
    const at=Math.round(source.at*rate),n=source.buffer.getChannelData(0).length;
    const len=Math.min(n,source.stopped===undefined?n:Math.round((source.stopped-source.at)*rate),pcm.length/2-at);
    const g=env.get(source.bus);
    for(let ch=0;ch<2;ch++){const b=source.buffer.getChannelData(ch);
      for(let i=0;i<len;i++)pcm[2*(at+i)+ch]+=.32*(fullVolume?1:.72)*b[i]*g[at+i];}
  }
  const mono=new Float32Array(pcm.length/2);let peak=0;
  for(let i=0;i<mono.length;i++){mono[i]=(pcm[2*i]+pcm[2*i+1])/2;peak=Math.max(peak,Math.abs(pcm[2*i]),Math.abs(pcm[2*i+1]));}
  assert.equal(accepted,dangers.length);assert(fx.stats.peakVoices<=8);assert(peak<1);
  return {mono,peak,accepted,voices:fx.stats.peakVoices};
}
function emittedPositions(){
  const sandbox={window:{}};
  for(const file of ['../../forge.js','../moteur.js'])require('node:vm').runInNewContext(
    fs.readFileSync(path.resolve(__dirname,file),'utf8'),sandbox);
  const engine=sandbox.window.SnakeArcade,forge=sandbox.window.SnakeForge,real=[];
  for(const [origin,d] of [[6,1],[29,-1]]){
    const s=engine.create(()=>.3,2);s.drones=[];s.gunClock=s.spawnClock=1e3;
    s.snake=s.snake.map((p,i)=>({x:origin-i*d,y:9,plane:0}));s.direction={x:d,y:0};s.previousSnake=s.snake.slice();
    forge.equip(s,'prism','chain');const target={x:origin+2*d,y:9,plane:0};
    s.drones=[{...target,id:44,next:{...target},moveIn:100,moveEvery:100,warmup:0}];
    for(let i=0;i<20 && !s.events.some(e=>e.type==='forgeHit');i++)engine.tick(s,1/60);
    const shot=s.events.find(e=>e.type==='forgeShot'),hit=s.events.find(e=>e.type==='forgeHit');
    assert.equal(shot.x,origin);assert.equal(hit.x,target.x);
    const ctx=new Context(),m=create(ctx,{}, {year:s.year});
    assert(m.play(shot,undefined,s));assert(m.play(hit,undefined,s));
    const measured=ctx.sources.map(v=>summary(v.buffer).rightOverLeftDb);
    assert(measured.every(v=>Math.sign(v)===-d));
    real.push({year:s.year,width:s.width,launchX:shot.x,impactX:hit.x,launchDb:measured[0],impactDb:measured[1]});
  }
  return real;
}
const actual=emittedPositions();
const report=[];
for(const row of rows){
  const direct=placements(row),bed=music(row),trials=[];let maxMono=0;
  for(let k=0;k<8;k++){
    const seed=11077+9173*k;
    const neutral=mix(row,seed,bed,0),spatial=mix(row,seed,bed,1),full=mix(row,seed,bed,1,true);
    maxMono=Math.max(maxMono,largestDifference(neutral.mono,spatial.mono));
    trials.push({seed,baselinePeakDb:toDb(neutral.peak),spatialPeakDb:toDb(spatial.peak),fullVolumePeakDb:toDb(full.peak),admittedCues:spatial.accepted,voices:spatial.voices});
  }
  assert(maxMono<1e-6);
  report.push({year:row.year,positions:direct.info,maxDryMonoError:direct.worstMono,maxMixMonoError:maxMono,trials});
}
fs.writeFileSync(path.join(__dirname,'panorama-mesures.json'),JSON.stringify({actual,years:report},null,2)+'\n');
// Comparaison manuelle, au format PCM uniquement ; aucune API de lecture.
const demo=new Float32Array(rate*6*2),clock=new Context(),demoMix=create(clock,{}, {year:1995});
const bed1995=music(rows[2]);
for(let i=0;i<demo.length;i++)demo[i]=.40*bed1995[i%(3*rate*2)];
for(const strength of [0,1])for(const [j,x] of [0,17.5,35].entries()){
  clock.currentTime=strength*3+.30+j*.75;
  demoMix.play({type:'forgeShot',core:'prism',x},undefined,{width:36},strength);
  const b=clock.sources.at(-1).buffer,offset=Math.round(clock.currentTime*rate);
  for(let ch=0;ch<2;ch++){
    const channel=b.getChannelData(ch);for(let i=0;i<channel.length;i++)demo[2*(offset+i)+ch]+=.12*channel[i];
  }
}
for(let i=0;i<demo.length/2;i++){
  const local=i%(3*rate),fade=Math.min(1,local/300,(3*rate-1-local)/300);
  demo[2*i]*=fade;demo[2*i+1]*=fade;
}
execFileSync('ffmpeg',['-v','error','-nostdin','-y','-f','f32le','-ar',String(rate),'-ac','2','-i','pipe:0',
  '-c:a','pcm_s16le',path.join(__dirname,'panorama-comparaison.wav')],{input:Buffer.from(demo.buffer)});
console.table(report.map(r=>({year:r.year,maxDryMono:r.maxDryMonoError,maxMixMono:r.maxMixMonoError,
  left:percentile(r.positions.map(x=>x.leftDb),.5).toFixed(2),right:percentile(r.positions.map(x=>x.rightDb),.5).toFixed(2),
  peak:Math.max(...r.trials.map(x=>x.spatialPeakDb)).toFixed(2)})));
