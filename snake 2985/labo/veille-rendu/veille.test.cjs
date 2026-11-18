'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create,preview}=require('./veille.js');
class Events {
  constructor(){this.events=new Map();}
  addEventListener(k,f){if(!this.events.has(k))this.events.set(k,new Set());this.events.get(k).add(f);}
  removeEventListener(k,f){this.events.get(k)?.delete(f);}
  emit(k,tagName){for(const f of this.events.get(k)||[])f({target:{tagName}});}
}
function environment() {
  const host=new Events(),doc=new Events(),pending=new Map();
  let t=0,id=0,modal=false,rafs=0,timers=0;
  doc.hidden=false;doc.querySelector=()=>modal?{}:null;
  const add=(fn,when,kind)=>{pending.set(++id,{fn,when,kind});return id;};
  Object.assign(host,{document:doc,performance:{now:()=>t},
    requestAnimationFrame:fn=>add(fn,(Math.floor(t/16)+1)*16,'raf'),cancelAnimationFrame:n=>pending.delete(n),
    setTimeout:(fn,ms)=>add(fn,t+ms,'timer'),clearTimeout:n=>pending.delete(n)});
  function advance(ms){
    const end=t+ms;
    while(true){
      const next=[...pending].sort((a,b)=>a[1].when-b[1].when)[0];
      if(!next||next[1].when>end)break;
      const [n,e]=next;pending.delete(n);t=e.when;
      if(e.kind==='raf')rafs++;else timers++;
      e.fn(t);
    }
    t=end;
  }
  return {host,doc,advance,pending,get counts(){return{rafs,timers};},
    hide(v){doc.hidden=v;doc.emit('visibilitychange');},cover(v){modal=v;doc.emit(v?'toggle':'close','DIALOG');}};
}
test('une minute simulée par écran, raf mesurés et aucune tâche après mise en veille',()=>{
  const summary=[];
  for(const screen of ['pause','end','prep','play','banc','caché']){
    const l=environment();if(screen==='caché')l.hide(true);
    const loop=create(()=>{},()=>screen==='play'?0:screen==='banc'?40:null,l.host);
    loop.wake();l.advance(60000);
    const counts=l.counts;summary.push({screen,...counts});
    if(['pause','end','prep'].includes(screen)){assert.equal(counts.rafs,1);assert.equal(l.pending.size,0);}
    if(screen==='caché'){assert.equal(counts.rafs,0);assert.equal(l.pending.size,0);}
    if(screen==='play')assert.equal(counts.rafs,3750);
    if(screen==='banc')assert(counts.rafs>=1200&&counts.rafs<=1500);
    loop.destroy();assert.equal(l.pending.size,0);
  }
  fs.writeFileSync(path.join(__dirname,'mesures.json'),JSON.stringify({periodeMs:60000,vsyncMs:16,summary},null,2)+'\n');
});
test('peinture asynchrone en pause, sollicitations groupées, visibilité, retour de cache, modal et resize',()=>{
  const l=environment(),frames=[];let continuous=false;
  const loop=create((t,dirty,first)=>frames.push({t,dirty,first}),()=>continuous?0:null,l.host);
  loop.wake();loop.wake();l.advance(16);assert.equal(frames.length,1);
  l.hide(true);loop.wake();l.advance(1000);assert.equal(frames.length,1);
  l.hide(false);l.advance(16);assert(frames.at(-1).dirty&&frames.at(-1).first);
  l.host.emit('resize');loop.wake();l.advance(16);assert.equal(frames.length,3);assert.equal(l.pending.size,0);
  continuous=true;loop.wake();l.advance(32);assert.equal(l.pending.size,1);
  l.cover(true);l.advance(2000);assert.equal(l.pending.size,0);
  l.cover(false);l.advance(16);assert(frames.at(-1).first);
  l.host.emit('pagehide');loop.wake();l.host.emit('resize');assert.equal(l.pending.size,0);
  l.host.emit('pageshow');l.advance(16);assert(frames.at(-1).first);
  loop.destroy();l.host.emit('resize');l.advance(100);assert.equal(l.pending.size,0);
});
test('prévisualisations, accessibilité, sortie écran et arrêt de la transition',()=>{
  const l=environment(),calls=[];
  let bench,transition=false,screen='prep',frames=0;
  const loop=create(()=>{
    frames++;if(transition && frames===4)transition=false;
    if(screen==='prep'||screen==='upgrade')bench.frame(l.host.performance.now());
  },()=>transition?0:bench.animated?40:null,l.host);
  bench=preview({select:(...args)=>calls.push(['select',...args]),frame:()=>{},stop:()=>calls.push(['stop'])},loop.wake);
  transition=true;loop.wake();l.advance(100);assert.equal(frames,4);assert.equal(l.pending.size,0);
  bench.select({},1995,'prism','echo',false);l.advance(100);assert(bench.animated&&l.pending.size);
  bench.motion(true);l.advance(100);assert(!bench.animated);assert.equal(l.pending.size,0);
  screen='upgrade';bench.motion(false);l.advance(60);assert(bench.animated&&l.pending.size);
  screen='pause';bench.stop();l.advance(100);assert.equal(l.pending.size,0);loop.destroy();
});
test('réveil en cours de dessin, changement vers pause et destruction dans le callback',()=>{
  const l=environment();let n=0;
  const loop=create(()=>{if(++n===1)loop.wake();if(n===2)loop.destroy();},()=>0,l.host);
  loop.wake();l.advance(100);assert.equal(n,2);assert.equal(l.pending.size,0);
});
test('seule la promesse de peinture de la session courante réveille la chambre',async()=>{
  const l=environment();let count=0,session={year:1995};
  const loop=create(()=>count++,()=>null,l.host);
  function load(s){
    let resolve;
    const loaded=new Promise(r=>{resolve=r;}).then(ready=>{if(ready && s===session)loop.wake();});
    return {resolve,loaded};
  }
  loop.wake();l.advance(16);
  const old=load(session);session={year:2985};const current=load(session);
  old.resolve(true);await old.loaded;l.advance(80);assert.equal(count,1);
  l.hide(true);current.resolve(true);await current.loaded;l.advance(80);assert.equal(count,1);
  l.hide(false);l.advance(16);assert.equal(count,2);assert.equal(l.pending.size,0);
  loop.destroy();
});
