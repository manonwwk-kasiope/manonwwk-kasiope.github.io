'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {create}=require('./bande-campagne.js'), synth=require('./priorites.js'), clock=require('./horloge.js');
const {Context}=require('./test-priorites.cjs'), rows=require('./pouls.json');
const project=path.resolve(__dirname,'../..'), sandbox={window:{}};
for(const file of ['forge.js','vol-libre.js','labo/evolution/evolution.js','labo/moteur.js',
  'labo/gardiens/gardiens.js','labo/surf-boss/surf.js','labo/noeud/noeud.js','labo/surcharges/surcharges.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(project,file),'utf8'),sandbox,{filename:file});
}
const w=sandbox.window;
assert(w.SnakeSurf.install());
const knot=w.SnakeKnot.install(w.SnakeArcade,w.SnakeEvolution.install(w.SnakeForge),{mode:'exact'});
const {engine,forge}=w.SnakeSurcharges.install(knot.engine,knot.forge);
w.SnakeForge=forge;
const data=[], catalog=[];
async function sample(era,core,mod,target,historical=false) {
  let seed=125;
  const s=engine.create(()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),era);
  s.drones=[];s.gunClock=s.spawnClock=1e3;
  assert(engine.shiftPlane(s));s.eaten=1;assert(w.SnakeFlight.offer(s));
  s.snake[0]={...s.flightGate};assert(w.SnakeFlight.cross(s));forge.equip(s,core,mod);
  const head=s.snake[0],x=Math.round(head.x+2.5*s.direction.x),y=Math.round(head.y+2.5*s.direction.y);
  if(target) s.drones=[{x,y,next:{x,y,plane:s.plane},id:41,plane:s.plane,warmup:0,moveIn:100,moveEvery:100}];
  s.events.length=0;
  const ctx=new Context();
  ctx.state='running';ctx.destination={};
  ctx.createDynamicsCompressor=()=>({threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}});
  const observed={create(...args){
    const mixer=synth.create(...args),play=mixer.play;
    return {...mixer,play(info,...rest){ctx.cue=info;return play(info,...rest);}};
  }};
  const player=create({rows,clock,synth:observed,makeContext:()=>ctx,now:()=>ctx.currentTime});
  player.start(s.year);player.setVolumes({music:0,space:0});assert(await player.setMuted(false));
  const emitted=[];
  for(let tick=0;tick<144;tick++) {
    ctx.currentTime=(tick+1)/120;engine.tick(s,1/120);
    const batch=s.events.splice(0);
    for(const e of batch.filter(e=>e.type.startsWith('forge'))) {
      assert.equal(e.core,core);assert.equal(e.mod,mod);emitted.push([tick+1,e.type]);
    }
    if(historical) for(const e of batch) if(e.type==='forgeShot') delete e.mod;
    player.events(batch,s,ctx.currentTime);
  }
  assert(emitted.some(([,name])=>name==='forgeShot'));
  assert.equal(emitted.some(([,name])=>name==='forgeHit'),target);
  const sources=ctx.sources.filter(v=>v.cue.type.startsWith('forge'));
  const first=sources.find(v=>v.cue.type==='forgeShot'),rate=ctx.sampleRate;
  const rendered=new Float32Array(2*rate), onset=new Float32Array(rendered.length);
  const [master,,fx]=ctx.gains,env=new Map(ctx.gains.map(g=>[g,g.envelope()]));
  for(const source of sources) {
    const at=Math.round(source.at*rate),l=source.buffer.getChannelData(0),r=source.buffer.getChannelData(1);
    const n=Math.min(l.length,source.stopped===undefined?Infinity:Math.round(source.stopped*rate)-at);
    for(let i=0;i<n;i++) {
      const t=i+at,amplitude=(l[i]+r[i])/2*env.get(source.bus)[t]*env.get(master)[t]*env.get(fx)[t];
      assert(t<rendered.length);
      rendered[t]+=amplitude;if(source===first)onset[t]=amplitude;
    }
  }
  if(historical) {
    const sha=require('node:crypto').createHash('sha256').update(Buffer.from(rendered.buffer)).digest('hex').slice(0,20);
    assert.equal(sha,require('./forge45-temoin.json').historical[s.year+'/'+core]);
    return;
  }
  for(const pcm of [rendered,onset]) data.push(Buffer.from(pcm.buffer));
  catalog.push({year:s.year,core,mod,target,emitted,played:sources.map(v=>[Math.round(v.at*120),v.cue.type])});
}
(async()=>{
  for(const era of rows.keys()) for(const {id:core} of forge.cores) for(const {id:mod} of forge.mods)
    for(const target of [false,true])await sample(era,core,mod,target);
  for(const era of rows.keys()) for(const {id:core} of forge.cores) await sample(era,core,'chain',false,true);
  const input=Buffer.concat([Buffer.from(JSON.stringify(catalog)+'\n'),...data]);
  process.stdout.write(execFileSync(process.env.PYTHON||'python3',[path.join(__dirname,'forge45-mesure.py')],{input,maxBuffer:8e6}));
})().catch(e=>{console.error(e);process.exitCode=1;});
