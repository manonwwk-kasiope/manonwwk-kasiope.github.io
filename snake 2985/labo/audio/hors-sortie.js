/* Banc WebKit injecté dans about:blank. Aucun contexte connecté à un périphérique. */
(() => {
  'use strict';
  const rate=24000, quantum=128/rate, duration=300*quantum;
  const at={attack:40*quantum,surge:105*quantum,hit:113*quantum,volley:170*quantum,forge:205*quantum,stop:240*quantum};
  function stats(ch,a,b) {
    let sum=0,peak=0,clipped=0;
    const first=Math.round(a*rate),last=Math.min(ch.length,Math.round(b*rate));
    for(let i=first;i<last;i++) {sum+=ch[i]**2;peak=Math.max(peak,Math.abs(ch[i]));if(Math.abs(ch[i])>=1)clipped++;}
    return {rms:Math.sqrt(sum/(last-first)),peak,clipped};
  }
  function aligned(sample,ref,start,span,maxLag) {
    let best={correlation:-1};
    // On garde un point sur quatre de la fenêtre ; le retard est balayé à l’échantillon.
    for(let lag=-maxLag;lag<=maxLag;lag++){
      let aa=0,bb=0,ab=0;
      for(let i=0;i<span;i+=4){const a=sample(i),b=ref(start+i+lag);aa+=a*a;bb+=b*b;ab+=a*b;}
      const correlation=ab/Math.sqrt(aa*bb || 1);
      if(correlation>best.correlation) best={correlation,lagMs:lag*1000/rate,
        rmsDeltaDb:10*Math.log10(Math.max(1e-20,aa)/Math.max(1e-20,bb))};
    }
    return best;
  }
  function fromBase64(s) {return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
  async function evaluateTrack({row,mp3,reference,signature,shot}) {
    if(!window.__offlineGuards) throw Error('Gardes manquantes');
    const Offline=window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if(!Offline) throw Error('OfflineAudioContext absent');
    const encoded=fromBase64(mp3);const ff=new Float32Array(fromBase64(reference).buffer);
    let decoded=null,decodes=0;
    async function render(full,historical=false) {
      const native=new Offline(2,Math.round(duration*rate),rate);
      const timed=typeof native.suspend==='function' && typeof native.resume==='function';
      let planningTime=0,nodes=0,master;
      const sources=[];
      // L’hôte voit le transport disponible pendant la préparation. Le DSP et les
      // connexions appartiennent intégralement au contexte hors ligne natif.
      const facade={state:'running',sampleRate:rate,destination:native.destination,
        get currentTime(){return timed?native.currentTime:planningTime;},createGain(){
          const node=native.createGain();if(!master)master=node;nodes++;return node;},
        createDynamicsCompressor(){nodes++;return native.createDynamicsCompressor();},
        createBuffer:(...args)=>native.createBuffer(...args),
        async decodeAudioData(data){if(!decoded){decoded=await native.decodeAudioData(data);decodes++;}return decoded;},
        createBufferSource(){
          nodes++;const node=native.createBufferSource();
          const entry={};sources.push(entry);
          const start=node.start.bind(node);node.start=(time,...args)=>{entry.start=time;entry.offset=args[0]??0;
            entry.music=node.loop;entry.duration=node.buffer.duration;start(time,...args);};
          if(!timed) {
            // Une déconnexion native avant startRendering effacerait le passé. Le
            // stop du buffer est donc programmé, puis la déconnexion suit onended.
            const stop=node.stop.bind(node),disconnect=node.disconnect.bind(node);
            node.stop=()=>{entry.stop=planningTime;stop(planningTime);};
            node.disconnect=()=>{if(native.state==='closed'||native.currentTime>=planningTime) disconnect();};
          }else{
            const stop=node.stop.bind(node);node.stop=(...args)=>{entry.stop=native.currentTime;stop(...args);};
          }
          return node;
        }};
      const player=window.__playerFactory.create({rows:[row],clock:SnakePulse,synth:SnakeAudioPriority,
        makeContext:()=>facade,bytes:async()=>encoded.buffer.slice(0),now:()=>facade.currentTime});
      player.start(row.year);
      if(!await player.setMuted(false))throw Error(player.status.error||'Le lecteur est resté silencieux');
      function step(kind) {
        if(kind==='stop'){player.pause();return;}
        if(!full)return;
        if(kind==='forge')player.events([historical?{...shot,mod:undefined}:shot],{width:30});
        if(kind==='attack')player.event({type:'bossAttack',kind:'final'});
        if(kind==='surge')player.events([{type:'nova',x:2,y:3,plane:0},
          {type:'novaOverload',year:row.year,signature,x:2,y:3,plane:0}]);
        if(kind==='hit')player.events(Array.from({length:3},()=>({type:'novaOverloadHit',year:row.year,signature})));
        if(kind==='volley')player.event({type:'bossVolley',kind:'final'});
      }
      const entries=Object.entries(at);
      let buffer;
      if(timed) {
        const suspends=entries.map(([,t])=>native.suspend(t));
        const rendering=native.startRendering();
        for(let i=0;i<entries.length;i++){await suspends[i];step(entries[i][0]);await native.resume();}
        buffer=await rendering;
      }else{
        for(const [kind,time] of entries){planningTime=time;step(kind);}
        buffer=await native.startRendering();
      }
      return {buffer,nodes,sources,mode:timed?'suspensions natives':'arrêts natifs programmés',status:player.status};
    }
    const music=await render(false), mix=await render(true),legacy=await render(true,true),channels=[];
    for(let ch=0;ch<2;ch++){
      const referenceChannel=decoded.getChannelData(ch),bed=music.buffer.getChannelData(ch),full=mix.buffer.getChannelData(ch);
      const delta=full.map((v,i)=>v-bed[i]);
      const offset=Math.round(row.loopStart*rate);
      const oracle=aligned(i=>referenceChannel[offset+i],i=>ff[2*i+ch],Math.round(.065*rate),Math.round(.16*rate),Math.round(.055*rate));
      const rmsMusic=stats(bed,.05,.18);
      const musicMatch=aligned(i=>bed[Math.round(.05*rate)+i],i=>{
        const t=offset+i*row.rate,index=Math.floor(t),frac=t-index;
        return (referenceChannel[index]*(1-frac)+referenceChannel[index+1]*frac)*.62*.82;
      },Math.round(.05*rate),Math.round(.10*rate),Math.round(.025*rate));
      const windows={};
      for(const [key,range] of Object.entries({before:[.03,.16],boss:[.23,.37],surge:[.572,.598],
        hits:[.61,.68],volley:[.925,1.02],after:[at.stop+.04,duration-.01]}))windows[key]=stats(delta,...range);
      // Dernier échantillon au-dessus de −80 dBFS après le front d’arrêt.
      let last=-1;for(let i=Math.round(at.stop*rate);i<full.length;i++)if(Math.abs(full[i])>1e-4)last=i;
      const legacyChannel=legacy.buffer.getChannelData(ch);
      const catalyst=stats(full.map((v,i)=>v-legacyChannel[i]),at.forge+.012,at.forge+.13);
      channels.push({catalyst,oracle,musicMatch,music:rmsMusic,windows,output:stats(full,0,duration),
        afterStop:stats(full,at.stop+.04,duration-.01),tailMs:last<0?0:(last/rate-at.stop)*1000});
    }
    return {year:row.year,shot,track:row.track,nativeType:decoded.constructor.name,rate:decoded.sampleRate,channelsDecoded:decoded.numberOfChannels,
      decodedDuration:decoded.duration,decodes,mode:mix.mode,sourceCount:mix.sources.length,nodes:mix.nodes,
      musicSources:music.sources,mixSources:mix.sources,status:mix.status,channels};
  }
  globalThis.horsSortie={evaluateTrack};
})();
