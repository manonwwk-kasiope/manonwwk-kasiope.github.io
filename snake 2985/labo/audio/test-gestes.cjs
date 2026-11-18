'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {create}=require('./priorites.js'),{Context,bed,run}=require('./test-priorites.cjs');
const {setup,engine,g,run:surfRun}=require('../surf-boss/rejouer.cjs');
const rows=require('./pouls.json');
const out={boss:[],ecology:[],surf:[],knot:[],signatures:[]};
function sources(events,year) {
  const ctx=new Context(),fx=create(ctx,{}, {year});
  for(const info of events) {ctx.cue=info;fx.play(info);}
  return ctx.sources.filter(s=>s.stopped===undefined).map(s=>s.cue.type);
}
for(const row of rows) {
  const s=setup(row.year);
  const start=s.events.splice(0);
  const audible=sources(start,row.year);
  assert(audible.includes('guardianWarning') && audible.includes('boss'));
  assert(!audible.includes('bossAttack')); // L'alerte précise supplante son annonce générique.
  const b=s.boss;s.snake[0]={x:b.x-2,y:b.y,plane:b.plane};s.novaCharge=1;b.hp=1;b.weak=true;
  assert(engine.fire(s));const victory=s.events.splice(0);assert(victory.some(e=>e.type==='bossHit' && e.heart));
  assert(victory.some(e=>e.type==='bossDefeated'));assert(victory.some(e=>['clear','win'].includes(e.type)));
  const music=bed(row.track.replace('.mp3',''),row.loopStart,row.rate);
  const events=start.map(e=>({...e,time:.36,critical:e.type==='guardianWarning'}));
  const result=run(events,'priority',music,{year:row.year,fxGain:.32*.72});
  const raw=run(events,'raw',music,{year:row.year,fxGain:.32*.72});
  assert(result.score.boss.length===1 && Number.isFinite(result.score.boss[0]));
  assert.equal(result.clip,0);
  out.boss.push({year:row.year,entry:start.map(e=>e.type),audible,finish:victory.map(e=>e.type),
    warningOverRestDb:result.score.boss[0],rawWarningOverRestDb:raw.score.boss[0],peakMixDbfs:20*Math.log10(result.peak),voices:result.voices});
}
require('../ecologie/ecologie.js');
for(let r=0;r<4;r++) {
  const s=engine.create(()=>.3,4);s.drones=[];s.cells=[{x:15,y:8,plane:0}];
  s.difficulty=9;s.elapsed=5;window.SnakeEcologie.init(s);s.ecologie.seq=r;
  window.SnakeEcologie.tick(s,.016,(s,dt)=>{s.elapsed+=dt;});
  const e=s.events.find(e=>e.type==='ecoWarning');assert(e);
  out.ecology.push(e);
}
for(const year of [1995,2985]) {
  const frames=[],tick=g.tick;
  g.tick=function(s,dt){tick(s,dt);if(s.events.length) frames.push(s.events.map(e=>({...e,time:s.elapsed})));};
  try {surfRun(year,'guidé');} finally {g.tick=tick;}
  const events=frames.flat();
  assert(events.some(e=>e.type==='surfPulse'));
  const end=frames.find(es=>es.some(e=>e.type==='surfEnd' && e.success));
  assert(end.some(e=>e.type==='bossHit' && e.heart && e.weapon==='surf'));
  const audible=sources(end,year);
  assert(audible.includes('surfEnd') && audible.includes('bossHit'));
  out.surf.push({year,events:events.filter(e=>e.type.startsWith('surf')).map(e=>e.type),
    hitFrame:end.map(e=>e.type),audible});
}
const ctx={window:{}};
for(const f of ['../../forge.js','../moteur.js'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
const bundle=require('../noeud/noeud.js').install(ctx.window.SnakeArcade,ctx.window.SnakeForge,{mode:'exact'});
ctx.window.SnakeForge=bundle.forge;
const demo=require('../noeud/parcours.js').create(bundle.engine);
for(let i=0;i<1400 && demo.s.status==='playing';i++) {
  const gesture=demo.ready && !!demo.s.knot?.preview;
  demo.tick(gesture);
  const es=demo.s.events.splice(0);
  if(es.some(e=>e.type==='knotClosed')) {out.knot=es;break;}
}
assert(out.knot.some(e=>e.type==='knotClosed' && e.area>0));
const cases=[...out.ecology,{type:'ecoAbsorb'},{type:'knotClosed'},{type:'evolutionTrigger'},{type:'evolutionHit'},
  {type:'surfGate'},{type:'surfStart'},{type:'surfPulse'},{type:'surfEnd',success:true},{type:'surfEnd',success:false},
  {type:'bossHit',heart:true},{type:'bossHit',shield:true},{type:'bossHit',weapon:'surf',heart:true},
  ...['convoi','mue','aiguillage','surf','relais'].map(kind=>({type:'contractOpen',kind}))];
for(const row of rows) {
  const fingerprints=new Set(),context=new Context(),mix=create(context,{}, {year:row.year});
  for(const e of cases) {
    context.currentTime+=1;assert(mix.play(e));
    const buffer=context.sources.at(-1).buffer;
    const samples=buffer.getChannelData(0),hash=require('node:crypto').createHash('sha256');
    hash.update(Buffer.from(samples.buffer,samples.byteOffset,samples.byteLength));
    fingerprints.add(hash.digest('hex'));
  }
  assert.equal(fingerprints.size,cases.length);
  out.signatures.push({year:row.year,uniquePcm:fingerprints.size,count:cases.length});
}
fs.writeFileSync(path.join(__dirname,'mesures-gestes.json'),JSON.stringify(out,null,2)+'\n');
console.log(out.boss.map(x=>[x.year,x.warningOverRestDb.toFixed(2),x.peakMixDbfs.toFixed(2)]));
