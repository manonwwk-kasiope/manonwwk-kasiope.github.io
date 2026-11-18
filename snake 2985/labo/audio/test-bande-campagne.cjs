'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {create,offlineFiles}=require('./bande-campagne.js'),clock=require('./horloge.js'),synth=require('./priorites.js');
const rows=require('./pouls.json');
const flush=()=>new Promise(r=>setImmediate(r));
const gate=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
class Events {
  list=new Map();hidden=false;
  addEventListener(k,f) {this.list.set(k,f);}
  removeEventListener(k,f) {if(this.list.get(k)===f)this.list.delete(k);}
  emit(k) {this.list.get(k)?.();}
}
function environment(options={}) {
  let time=0,contexts=0;
  const doc=new Events(),page=new Events(),started=[],gains=[];
  const storage=options.storage??{data:new Map(),setItem(k,v){this.data.set(k,v);},getItem(k){return this.data.get(k);}};
  const parameter=()=>({value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},
    setTargetAtTime(v){this.value=v;}});
  const ctx={state:'suspended',sampleRate:12000,destination:{},get currentTime(){return time;},
    async resume(){if(options.resume) await options.resume();this.state='running';},
    async close(){this.state='closed';},
    createGain(){const n={gain:parameter(),connect(){},disconnect(){}};gains.push(n);return n;},
    createDynamicsCompressor(){return {threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),connect(){}};},
    async decodeAudioData(data){if(options.decoder) await options.decoder(data);return {duration:200,isMusic:true,data};},
    createBuffer(ch,len,sr){const a=Array.from({length:ch},()=>new Float32Array(len));return {duration:len/sr,getChannelData:c=>a[c]};},
    createBufferSource(){
      const n={playbackRate:parameter(),connect(){},disconnect(){},start(t,off=0){this.at=t;this.offset=off;started.push(this);},
        stop(){this.stopped=true;this.onended?.();}};
      return n;
    }};
  const audio=create({rows,clock,synth,makeContext:()=>{contexts++;return ctx;},bytes:options.bytes??(async f=>f),
    now:()=>time,storage,doc,page});
  return {audio,started,music:()=>started.filter(n=>n.buffer.isMusic),ctx,gains,doc,page,storage,
    advance:dt=>{time+=dt;},get contexts(){return contexts;}};
}
test('chargement et navigation silencieux, choix des cinq MP3 et progression de retour',async()=>{
  const e=environment(),a=e.audio;a.start(1976);
  assert.equal(a.muted,true);assert.equal(e.contexts,0);a.event('boss');a.beat();
  for(const row of rows) {a.scene(row.year,1,0);assert.equal(a.status.track,row.track);}
  assert.equal(e.contexts,0);
  a.scene(0,1,0);assert(await a.setMuted(false));assert.equal(e.music().length,1);
  e.advance(2);const at=a.pulse().mediaTime;
  for(const row of rows.slice(1)) {a.scene(row.year,6,.6,'mid');await flush();assert.equal(e.music().at(-1).buffer.data,row.track);}
  a.scene(0,1,0);await flush();assert(Math.abs(e.music().at(-1).offset-at)<1e-6);
  assert.equal(e.music().filter(n=>!n.stopped).length,1);
  a.stop();assert(e.started.every(n=>n.stopped));assert.equal(e.gains[0].gain.value,0);
});
test('boss médian/final et prime sur la piste en cours, pression et réglages dans le graphe commun',async()=>{
  const e=environment(),a=e.audio;a.start(1995);await a.setMuted(false);
  const head=e.music()[0];a.scene(1995,5,.9,'mid');const gainCombat=e.gains[1].gain.value;
  for(const kind of ['mid','final']) {
    for(const type of ['boss','bossAttack','bossVolley','bossDefeated']) {
      e.advance(1);assert(a.event({type,kind}));
    }
  }
  a.scene(1995,5,0,null);assert(e.gains[1].gain.value<gainCombat);assert.equal(e.music()[0],head);
  assert.equal(e.music().length,1);
  a.setVolumes({music:0,fx:0});assert.equal(e.gains[1].gain.value,0);assert(!a.event('boss'));
  a.setVolumes({music:.5,fx:.6});assert.equal(a.musicLevel,.5);assert.equal(a.fxLevel,.6);
  a.pause();assert(head.stopped);e.advance(20);const frozen=a.pulse().mediaTime;
  e.advance(3);assert.equal(a.pulse().mediaTime,frozen);assert(await a.resume());
  assert(Math.abs(e.music().at(-1).offset-frozen)<1e-6);
  a.dispose();assert.equal(e.ctx.state,'closed');
});
test('dix couples gardien/prime avec le timbre effectif de chaque époque',async()=>{
  const e=environment(),a=e.audio;
  a.start(0);await a.setMuted(false);
  const signatures=new Set();
  for(const row of rows) {
    a.scene(row.year,5,1,'mid');await flush();
    for(const kind of ['mid','final']) {
      const sig=[];
      for(const type of ['boss','bossDefeated']) {
        e.advance(1);assert(a.event({type,kind}));
        const b=e.started.at(-1).buffer;
        const channel=b.getChannelData(0);
        sig.push([b.duration,channel[319],channel[723],channel[1081]]);
      }
      signatures.add(JSON.stringify(sig));
    }
  }
  assert.equal(signatures.size,10);a.dispose();
});
test('masquage, rotation, pagehide et interruptions ne réarment jamais le son',async()=>{
  const e=environment(),a=e.audio;a.start(1);await a.setMuted(false);
  e.page.emit('orientationchange');assert.equal(e.music().length,1);
  e.advance(2);const before=a.pulse().mediaTime;
  e.doc.hidden=true;e.doc.emit('visibilitychange');assert(a.muted);assert(e.music()[0].stopped);
  e.advance(30);assert(Math.abs(a.pulse().mediaTime-before)<1e-6);assert(!await a.setMuted(false));
  e.doc.hidden=false;e.doc.emit('visibilitychange');assert(!await a.resume());
  assert.equal(e.music().length,1);assert(!a.event('boss'));
  await a.setMuted(false);e.page.emit('pagehide');e.page.emit('pageshow');assert(a.muted);
  await a.setMuted(false);e.ctx.state='interrupted';e.ctx.onstatechange();assert(a.muted);
  assert(e.music().every(n=>n.stopped));a.dispose();assert.equal(e.doc.list.size,0);assert.equal(e.page.list.size,0);
});
test('décodages tardifs après silence, nouvelle année, pause, arrêt ou destruction',async()=>{
  for(const action of ['mute','switch','pause','stop','dispose','hidden']) {
    const deferred=gate(),e=environment({bytes:async name=>name===rows[0].track?deferred.promise:name});
    const a=e.audio;a.start(0);const old=a.setMuted(false);await flush();
    if(action==='mute') await a.setMuted(true);
    else if(action==='switch') a.scene(1,1,0);
    else if(action==='hidden') {e.doc.hidden=true;e.doc.emit('visibilitychange');}
    else a[action]();
    deferred.resolve('ancien');await old;await flush();
    assert(!e.music().some(n=>n.buffer.data==='ancien'));
    if(action==='switch') assert.equal(e.music().at(-1).buffer.data,rows[1].track);
    else assert.equal(e.music().length,0);
  }
});
test('refus de contexte ou de chargement, réessai explicite et progression sauvegardée',async()=>{
  let attempts=0;
  const e=environment({bytes:async name=>{if(++attempts===1) throw Error('offline');return name;}});
  const a=e.audio;a.start(3);assert(!await a.setMuted(false));assert.equal(a.status.error,'offline');
  e.advance(3);assert(Number.isFinite(a.beat()));assert(await a.setMuted(false));
  e.advance(2);a.setVolumes({music:.45,fx:.32});const at=a.pulse().mediaTime;a.dispose();
  const restored=environment({storage:e.storage});restored.audio.start(3);assert(restored.audio.muted);
  assert(Math.abs(restored.audio.pulse().mediaTime-at)<1e-6);assert.equal(restored.audio.fxLevel,.32);
  const blocked=environment({resume:async()=>{throw Error('geste requis');}});
  blocked.audio.start();assert(!await blocked.audio.setMuted(false));assert.equal(blocked.music().length,0);
});
test('préparation locale des cinq MP3, réponse hors ligne sans nouvelle requête',async()=>{
  const data=new Map();let offline=false,calls=0;
  const store={match:async key=>data.get(key)?.clone(),put:async(key,res)=>data.set(key,res)};
  const files=offlineFiles({caches:{open:async()=>store},fetch:async address=>{
    assert(!offline);calls++;assert(address.startsWith('https://test.invalid/jeu/audio/'));
    const name=new URL(address).pathname.split('/').pop();
    return new Response(fs.readFileSync(path.join(__dirname,'../../audio',name)));
  }},'https://test.invalid/jeu/labo/audio/bande-campagne.js');
  assert.equal((await files.prepare(rows)).length,5);assert.equal(calls,5);offline=true;
  for(const {track} of rows) assert.equal((await files.bytes(track)).byteLength,
    fs.statSync(path.join(__dirname,'../../audio',track)).size);
  assert.equal(calls,5);
});
test('scripts classiques et données disponibles sans fetch du JSON',()=>{
  const env={document:Object.assign(new Events(),{currentScript:{src:'https://test.invalid/jeu/labo/audio/bande-campagne.js'}}),
    performance:{now:()=>0},addEventListener(){},removeEventListener(){},URL};
  for(const f of ['pouls-data.js','horloge.js','priorites.js','bande-campagne.js'])
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),env);
  assert.deepEqual(JSON.parse(JSON.stringify(env.SnakeCampagnePulseData)),rows);
  env.SnakeCampagneSon.start(1995);assert.equal(env.SnakeCampagneSon.status.track,rows[2].track);
  assert(env.SnakeCampagneSon.muted);
});

test('fin de partie sur la même image : une seule queue audible et fermeture naturelle',async()=>{
  for(const [status,type] of [['dead','death'],['cleared','clear'],['won','win']]) {
    const e=environment(),a=e.audio;a.start(2985);await a.setMuted(false);
    a.event({type:'bossHit',heart:true});a.event({type:'bossDefeated',kind:'final'});
    assert(a.event({type}));a.finish(status);
    const tail=e.started.at(-1);
    assert(a.status.ending && !a.status.active && !a.status.playingMusic);
    assert.equal(e.started.filter(s=>!s.stopped).length,1);
    assert.equal(e.gains[0].gain.value,1);assert(!a.event('shot'));
    assert(tail.buffer.duration>=(type==='death'?.27:.66));tail.onended();
    assert.equal(e.gains[0].gain.value,0);assert(!a.status.ending);
  }
});
test('annulation immédiate de la queue de fin et protection contre un callback périmé',async()=>{
  for(const how of ['stop','mute','pause','hidden','interrupted','dispose','restart']) {
    const e=environment(),a=e.audio;a.start(0);await a.setMuted(false);
    assert(a.finish('dead'));const tail=e.started.at(-1),late=tail.onended;
    if(how==='mute')await a.setMuted(true);
    else if(how==='hidden'){e.doc.hidden=true;e.doc.emit('visibilitychange');}
    else if(how==='interrupted'){e.ctx.state='interrupted';e.ctx.onstatechange();}
    else if(how==='restart'){a.start(1);await a.setMuted(false);}
    else a[how]();
    assert(tail.stopped);assert(!a.status.ending);late();
    assert.equal(e.gains[0].gain.value,how==='restart'?1:0);
  }
  const e=environment();e.audio.start();assert(!e.audio.finish('won'));assert.equal(e.contexts,0);
});
test('contrats reliés au directeur et transitions silencieuses',async()=>{
  const e=environment(),a=e.audio;a.start(1995);await a.setMuted(false);
  for(const type of ['open','aiguille','branche','score']) {e.advance(1);assert(a.encounter({type,kind:'aiguillage'}));}
  for(const type of ['close','bossBreath']) assert(!a.encounter({type,kind:'aiguillage'}));
});

test('surcharge et nova ordinaires dans une même image, toutes les années et les deux ordres',async()=>{
  const signatures=['comb','ricochet','train','moons','echo'];
  for(const [i,row] of rows.entries()) {
    const e=environment(),a=e.audio;a.start(row.year);await a.setMuted(false);
    const overload={type:'novaOverload',year:row.year,signature:signatures[i],x:4,y:7,plane:0};
    const nova={type:'nova',x:4,y:7,plane:0},other={...nova,x:12};
    for(const batch of [[nova,overload],[overload,nova],[other,nova,overload]]) {
      const count=e.started.length;a.events(batch);
      assert.equal(e.started.length-count,batch.includes(other)?2:1);
      assert(e.started.slice(count).some(s=>s.buffer.duration>.30));
      e.advance(1);
    }
    let count=e.started.length;
    a.events([nova,{...overload,year:1234}]);assert.equal(e.started.length-count,1);
    e.advance(1);count=e.started.length;
    a.events([nova,overload,{type:'guardianWarning'},...Array(4).fill({type:'novaOverloadHit'})]);
    assert.equal(e.started.length-count,3);
    a.stop();count=e.started.length;a.events([nova,overload]);assert.equal(e.started.length,count);
  }
});

test('URL publique muet=1 : zéro constructeur audio, décodage ou requête MP3 après les gestes',async()=>{
  for(const href of ['https://jeu.invalid/?muet=1','https://jeu.invalid/SNAKE/?muet=0&muet=1#carte']){
    const forbidden=[];
    const blocked=name=>function(){forbidden.push(name);throw Error(name);};
    const doc=Object.assign(new Events(),{currentScript:{src:'https://jeu.invalid/js/bande-campagne.js'}});
    let time=0;
    const env={location:{href},document:doc,performance:{now:()=>time},URL,
      AudioContext:blocked('AudioContext'),webkitAudioContext:blocked('webkitAudioContext'),
      Audio:blocked('Audio'),fetch:blocked('fetch'),addEventListener(){},removeEventListener(){}};
    for(const file of ['pouls-data.js','horloge.js','priorites.js','bande-campagne.js'])
      vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),env);
    const a=env.SnakeCampagneSon;assert.equal(a.muteLocked,true);
    for(const row of rows){
      a.start(row.year);assert.equal(await a.setMuted(false),false);
      const first=a.pulse();time+=120;assert.notEqual(a.pulse().phase,first.phase);
      a.setVolumes({music:1,fx:1});a.events([{type:'boss'},{type:'novaOverload',year:row.year}]);a.scene(row.year,10,1,'final');
      a.pause();await a.resume();doc.hidden=true;doc.emit('visibilitychange');
      doc.hidden=false;doc.emit('visibilitychange');await a.setMuted(false);
      assert(!a.finish('won'));assert(a.muted);assert(!a.status.playingMusic);
    }
    a.dispose();assert.deepEqual(forbidden,[]);
  }
});
