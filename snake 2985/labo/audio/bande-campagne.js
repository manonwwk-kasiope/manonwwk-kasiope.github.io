/* Lecteur optionnel. Aucun contexte ni média ne sont créés au chargement. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const prefs='snake2985.campagne.audio.v1';
  const cacheName='snake2985-musiques-originales-v1';
  function offlineFiles(env,base,folder='../../audio/') {
    const url=name=>new URL(name,new URL(folder,base)).href;
    async function read(name) {
      const address=url(name);
      let cache;
      try {cache=await env.caches?.open(cacheName);} catch {}
      const saved=await cache?.match(address).catch(()=>null);
      if(saved) return saved;
      const shared=await env.caches?.match?.(address).catch(()=>null);
      if(shared?.status===200) return shared;
      const response=await env.fetch(address);
      if(!response.ok) throw Error('MP3 inaccessible : '+name);
      if(cache) try {await cache.put(address,response.clone());} catch {}
      return response;
    }
    return {
      bytes:async name=>(await read(name)).arrayBuffer(),
      async prepare(rows) {
        const cached=[];
        const storage=await env.caches?.open(cacheName);
        if(!storage) throw Error('CacheStorage indisponible');
        for(const {track} of rows) {
          await read(track);
          if(!await storage.match(url(track)) && !await env.caches.match?.(url(track)))
            throw Error('Mise en cache impossible : '+track);
          cached.push(track);
        }
        return cached;
      }
    };
  }
  function create({rows,clock,synth,makeContext,bytes,prepare=async()=>[],now,storage,
    doc,page,onError=()=>{}}) {
    const years=rows.map(r=>r.year), positions={};
    let musicLevel=.82,fxLevel=.72;
    try {
      const saved=JSON.parse(storage?.getItem(prefs)||'{}');
      if(Number.isFinite(saved.music)) musicLevel=clamp(saved.music);
      if(Number.isFinite(saved.fx)) fxLevel=clamp(saved.fx);
      for(const year of years) if(Number.isFinite(saved.positions?.[year])) positions[year]=saved.positions[year];
    } catch {}
    let active=false,paused=false,muted=true,hidden=Boolean(doc?.hidden),closed=false;
    let row=rows[0],pulseClock=clock.create(rows,row.year),ctx,master,musicBus,fxBus,fx;
    let source=null,sourceWhen=0,sourcePosition=0,pressure=0,boss=null,token=0;
    let decoded=null,loading=null,error=null,checkpointAt=-Infinity;
    let decodeQueue=Promise.resolve(),wasRunning=false,ending=false,prizeAt=-Infinity;
    const normalize=v=>years.includes(v)?v:years[Math.max(0,Math.min(years.length-1,Math.trunc(Number(v))||0))];
    const running=()=>active && !paused && !hidden && !closed;
    const allowed=()=>running() && !muted;
    const wrap=(r,t)=>r.loopStart+((t-r.loopStart)%(r.loopEnd-r.loopStart)+(r.loopEnd-r.loopStart))%(r.loopEnd-r.loopStart);
    function save() {
      try {storage?.setItem(prefs,JSON.stringify({music:musicLevel,fx:fxLevel,positions}));} catch {}
    }
    function pulse() {
      const read=Boolean(source && allowed() && ctx?.state==='running');
      const sample=pulseClock.sample({now:now(),mediaTime:read?sourcePosition+(ctx.currentTime-sourceWhen)*row.rate:undefined,
        audible:read,playing:running(),playbackRate:row.rate});
      if(active && running() && now()-checkpointAt>=5) {
        checkpointAt=now(); positions[row.year]=sample.mediaTime; save();
      }
      return sample;
    }
    function anchor(t) {
      pulseClock=clock.create(rows,row.year);
      pulseClock.sample({now:now(),mediaTime:wrap(row,t),audible:true,playing:running()});
    }
    function remember() {
      if(active) {positions[row.year]=pulse().mediaTime;save();}
    }
    function gain(node,value,smooth=false) {
      if(!node) return;
      node.gain.cancelScheduledValues(ctx.currentTime);
      if(smooth) node.gain.setTargetAtTime(value,ctx.currentTime,.08);
      else node.gain.setValueAtTime(value,ctx.currentTime);
    }
    function levels(smooth=false) {
      gain(master,allowed()?1:0);
      // La prise musicale conserve sa progression pendant l'approche et le duel.
      gain(musicBus,(.62+.17*(boss?1:pressure))*musicLevel,smooth && allowed());
      gain(fxBus,.32*fxLevel);
    }
    function silence() {
      ++token;ending=false;prizeAt=-Infinity;gain(master,0);
      if(source) {
        const old=source;source=null;old.onended=null;
        try {old.stop();} catch {} old.disconnect();
      }
      fx?.stop();
    }
    function graph() {
      if(ctx) return;
      ctx=makeContext();
      master=ctx.createGain();master.gain.value=0;
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-3;limiter.knee.value=1;limiter.ratio.value=12;
      limiter.attack.value=.002;limiter.release.value=.09;
      master.connect(limiter);limiter.connect(ctx.destination);
      musicBus=ctx.createGain();fxBus=ctx.createGain();
      musicBus.connect(master);fxBus.connect(master);
      fx=synth.create(ctx,fxBus,{year:row.year,limit:8});
      ctx.onstatechange=()=>{
        if(ctx.state==='running') wasRunning=true;
        if(((active && !muted) || ending) && (ctx.state==='interrupted' || (ctx.state==='suspended' && wasRunning))) guard();
      };
    }
    async function bufferFor(r) {
      if(decoded?.track===r.track) return decoded.buffer;
      if(loading?.track===r.track) return loading.promise;
      const task={track:r.track};
      task.promise=Promise.resolve().then(()=>bytes(r.track)).then(data=>{
        const decode=decodeQueue.then(()=>{
          if(!allowed() || row!==r) throw Error('Chargement audio abandonné');
          return ctx.decodeAudioData(data);
        });
        decodeQueue=decode.catch(()=>{});
        return decode;
      }).then(buffer=>{
        if(buffer.duration+1/ctx.sampleRate<r.loopEnd) throw Error('MP3 trop court : '+r.track);
        if(row.track===r.track && !closed) decoded={track:r.track,buffer};
        return buffer;
      }).finally(()=>{if(loading===task) loading=null;});
      loading=task;return task.promise;
    }
    async function arm() {
      const id=++token,r=row;
      if(!allowed()) return false;
      try {
        graph();fx.setYear(r.year);
        // Appel au contexte dans la pile du geste, avant le premier await.
        if(ctx.state!=='running') await ctx.resume();
        if(id!==token || !allowed() || ctx.state!=='running') return false;
        wasRunning=true;levels();
        if(!musicLevel || source) return true;
        const buffer=await bufferFor(r);
        if(id!==token || !allowed() || !musicLevel || row!==r || ctx.state!=='running') return false;
        const offset=pulse().mediaTime;
        const next=ctx.createBufferSource();next.buffer=buffer;
        next.loop=true;next.loopStart=r.loopStart;next.loopEnd=r.loopEnd;
        next.playbackRate.value=r.rate;next.connect(musicBus);
        next.start(ctx.currentTime,offset);
        source=next;sourceWhen=ctx.currentTime;sourcePosition=offset;error=null;
        return true;
      } catch(err) {
        if(id===token) {error=String(err?.message||err);onError(error);}
        return false;
      }
    }
    function select(input) {
      remember();silence();row=rows.find(r=>r.year===normalize(input));decoded=null;
      pressure=0;boss=null;anchor(positions[row.year]??row.loopStart);fx?.setYear(row.year);
    }
    function start(input=0) {
      if(closed) return;
      if(active) remember();
      silence(); active=false; muted=true;paused=false;
      select(input);active=true;anchor(positions[row.year]??row.loopStart);levels();error=null;
    }
    function scene(input,difficulty,nearBoss,kind) {
      if(!active || closed) return;
      const changed=normalize(input)!==row.year;
      if(changed) select(input);
      const nextPressure=clamp(Number(nearBoss)||0),nextBoss=['mid','final'].includes(kind)?kind:null;
      if(changed || nextPressure!==pressure || nextBoss!==boss) {
        pressure=nextPressure;boss=nextBoss;levels(true);
      }
      if(changed && allowed()) void arm();
    }
    function setMuted(value) {
      if(closed) return Promise.resolve(false);
      remember();
      if(value || hidden || !active) {muted=true;silence();return Promise.resolve(false);}
      muted=false;return arm();
    }
    function pause() {
      if(ending) {silence();return;}
      if(!active || paused) return;
      remember();paused=true;silence();anchor(positions[row.year]);
    }
    function resume() {
      if(!active || hidden || closed || !paused) return Promise.resolve(false);
      paused=false;anchor(positions[row.year]??row.loopStart);
      return allowed()?arm():Promise.resolve(false);
    }
    function guard() {
      remember();muted=true;silence();
      anchor(positions[row.year]??row.loopStart);
    }
    function visibility() {
      if(doc?.hidden) {guard();hidden=true;anchor(positions[row.year]??row.loopStart);}
      else {hidden=false;anchor(positions[row.year]??row.loopStart);}
    }
    function leaving() {guard();hidden=true;anchor(positions[row.year]??row.loopStart);}
    function returning() {hidden=Boolean(doc?.hidden);anchor(positions[row.year]??row.loopStart);}
    doc?.addEventListener('visibilitychange',visibility);
    page?.addEventListener('pagehide',leaving);page?.addEventListener('pageshow',returning);
    function setVolumes({music,fx:value}={}) {
      if(closed) return;
      if(Number.isFinite(music)) musicLevel=clamp(music);
      if(Number.isFinite(value)) fxLevel=clamp(value);
      levels();save();
      if(musicLevel && allowed() && !source) void arm();
    }
    function event(info) {
      if(!allowed() || !fxLevel || ctx?.state!=='running') return false;
      if(typeof info==='string') info={type:info};
      if(['win','clear','death'].includes(info?.type)) return finish(info.type);
      if(info?.type==='bossDefeated' && info.kind==='final') prizeAt=ctx.currentTime;
      return Boolean(fx?.play(info));
    }
    function events(batch) {
      if(!Array.isArray(batch) || !allowed()) return;
      const omit=new Set();
      for(let i=0;i<batch.length;i++) {
        const surge=batch[i];
        if(surge.type!=='novaOverload' || !fx?.handles(surge)) continue;
        // Le moteur émet sa nova avant la surcharge ; les dommages natifs peuvent les séparer.
        const fits=(other,j)=>other.type==='nova' && !omit.has(j) &&
          ['plane','x','y'].every(k=>other[k]==null || surge[k]==null || other[k]===surge[k]);
        let paired=-1;
        for(let j=i-1;j>=0;j--) if(fits(batch[j],j)) {paired=j;break;}
        if(paired<0) paired=batch.findIndex(fits);
        if(paired>=0) omit.add(paired);
      }
      for(let i=0;i<batch.length;i++) if(!omit.has(i)) event(batch[i]);
    }
    function stop() {
      remember();silence();active=false;paused=false;muted=true;pressure=0;boss=null;
      anchor(positions[row.year]??row.loopStart);
    }
    function finish(status) {
      const type=({dead:'death',death:'death',won:'win',win:'win',cleared:'clear',clear:'clear'})[status];
      if(!type || !active) return false;
      const permitted=allowed() && fxLevel>0 && ctx?.state==='running';
      const withPrize=type!=='death' && ctx && ctx.currentTime-prizeAt<=.035;
      stop();
      if(!permitted) return false;
      // Le transport est arrêté ; seule cette source peut traverser le gain maître.
      const id=token;
      ending=true;gain(master,1);
      const done=()=>{if(id===token) {ending=false;gain(master,0);}};
      if(!fx.play({type,withPrize},done)) {done();return false;}
      return true;
    }
    function encounter(cue) {
      const type=({open:'contractOpen',capture:'contractStep',aiguille:'contractStep',branche:'contractStep',
        double:'contractStep',liaison:'contractStep',score:'contractScore'})[cue?.type];
      return type?event({type,kind:cue.kind}):false;
    }
    function dispose() {
      if(closed) return;
      stop();closed=true;fx?.dispose();decoded=null;
      if(ctx) {ctx.onstatechange=null;void ctx.close()?.catch(()=>{});}
      doc?.removeEventListener('visibilitychange',visibility);
      page?.removeEventListener('pagehide',leaving);page?.removeEventListener('pageshow',returning);
    }
    return {start,stop,finish,pause,resume,scene,event,events,encounter,setMuted,setVolumes,pulse,beat:()=>pulse().phase,
      sector:n=>scene(row.year,n,clamp((Number(n)-1)/9),boss),
      prepareOffline:()=>prepare(rows),dispose,
      get muted(){return muted;},get musicLevel(){return musicLevel;},get fxLevel(){return fxLevel;},
      get status(){return {year:row.year,track:row.track,active,paused,hidden,muted,ending,playingMusic:Boolean(source && allowed() && musicLevel),error};}};
  }
  if(typeof module==='object' && module.exports) module.exports={create,offlineFiles};
  else {
    const env=globalThis,doc=env.document,base=doc.currentScript.src;
    const files=doc.currentScript.dataset?.musicRoot
      ? offlineFiles(env,doc.baseURI,doc.currentScript.dataset.musicRoot)
      : offlineFiles(env,base);
    let storage;try{storage=env.localStorage;} catch {}
    env.SnakeCampagneSon=create({rows:env.SnakeCampagnePulseData,clock:env.SnakePulse,synth:env.SnakeAudioPriority,
      makeContext:()=>new (env.AudioContext||env.webkitAudioContext)(),bytes:files.bytes,prepare:files.prepare,
      now:()=>env.performance.now()/1000,storage,doc,page:env});
  }
})();
