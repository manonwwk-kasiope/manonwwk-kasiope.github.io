/* Fonction sérialisée par Playwright : toutes ses dépendances passent par cfg.
   Aucun pas simulé, aucun rAF artificiel, aucune modification de vitesse du jeu. */
export function installer(cfg) {
  const natRAF=window.requestAnimationFrame.bind(window), natConnect=AudioNode.prototype.connect;
  const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
  let actif=false, origine=0, previous=null, lastStamp=null, snapAt=-Infinity;
  let frames=[],evenements=[],images=[],adapte=[],audio=[],pending=[],erreurs=[];
  let dernierAdapte='',courantFrame=0, hooks=false;
  const recorders=new Map();
  const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
  function horloge() {
    const N=window.__N,ctx=N?.music?.context?.(),b=N?.music?.beat?.(),tempo=N?.music?.tempo?.();
    const lat=ctx?Math.min(.2,(ctx.outputLatency||0)+(ctx.baseLatency||0)):null;
    const ecart=b&&tempo>0?Math.min(b.phase,1-b.phase)*60000/tempo:null;
    const moteur=N?.music?.moteur?.(),track=moteur?.trackState?.();
    const it=track?.items?.findLast(it=>it.tJoin<=ctx.currentTime&&ctx.currentTime<it.tEnd);
    const detail=it&&moteur.itemLog?.().findLast(x=>x.bloc===it.bloc&&x.tCore===it.tCore);
    return {w:(performance.now()-origine)/1000,tempsJeu:N?.horloge?.t?.(),pas:N?.horloge?.pas?.(),
      audioCtx:ctx?.currentTime??null,audioRunning:ctx?.state==='running',latence:lat,
      /* N.music.beat() compense déjà baseLatency + outputLatency. Ne pas les soustraire deux fois. */
      beat:b?{...b}:null,bpm:tempo??null,ecartAudioMs:ecart,
      rmsMusique:N?.music?.rms?.()??null,rmsSortie:N?.music?.rmsOut?.()??null,
      musiqueMuette:!!(N?.music?.muted?.()||N?.music?.muted?.('musique')),
      morceau:clone(N?.music?.morceau?.()),sonde:clone(N?.music?.morceauSonde?.()),piste:clone(N?.music?.piste?.()),
      blocAudio:it&&detail?{bloc:it.bloc,tCore:it.tCore,from:detail.from}:null};
  }
  function ev(type,d,preuve) {
    if(!actif)return;
    evenements.push({...horloge(),type,d:clone(d),preuve});
  }
  function capterContexte(ctx,source) {
    if(!cfg.media||!ctx.createMediaStreamDestination)return;
    let r=recorders.get(ctx);
    if(!r) {
      const dest=ctx.createMediaStreamDestination();
      const mime=['audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
      const recorder=new MediaRecorder(dest.stream,mime?{mimeType:mime}:{});
      r={ctx,dest,recorder,id:recorders.size,mime:recorder.mimeType,started:false,queue:Promise.resolve()};recorders.set(ctx,r);
      recorder.ondataavailable=e=>{
        if(!e.data.size)return;
        const job=r.queue=r.queue.then(()=>e.data.arrayBuffer()).then(a=>window.__juryAudio({id:r.id,data:b64(new Uint8Array(a))}));
        pending.push(job); job.catch(e=>erreurs.push('audio-chunk:'+String(e)));
      };
    }
    natConnect.call(source,r.dest);
    if(actif&&!r.started) startRecorder(r);
  }
  function startRecorder(r) {
    r.started=true;
    const h=horloge();audio.push({id:r.id,fichier:`audio-sortie-${r.id}.webm`,mime:r.mime,w:h.w,audioCtx:r.ctx.currentTime,
      origine:'Branchement parallèle des nœuds aboutissant à AudioContext.destination ; sortie réelle musique ET effets, sans réencodage de synthèse.'});
    r.recorder.start(1000);
  }
  AudioNode.prototype.connect=function(destination,...args) {
    const result=natConnect.call(this,destination,...args);
    if(destination===this.context.destination)capterContexte(this.context,this);
    return result;
  };
  /* Les films sont muets avant play(). Le son musical reste calculé dans Web Audio,
     le processus Chrome est muet (--mute-audio), y compris ses éléments audio. */
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){if(this instanceof HTMLVideoElement){this.muted=true;this.volume=0;}return play.apply(this,args);};
  function poserHooks() {
    if(hooks)return;
    if(cfg.performance)return;
    const N=window.__N;
    if(!N?.ev?.on)return;
    hooks=true;
    for(const type of ['apparition','vague','mort','kill','phase','vol','coupe']) {
      N.ev.on(type,99,d=>ev(type,d,type==='apparition'?{
        ennemi:N.ennemis.list.some(e=>e.id===d.id&&e.etat!=='mort'),
        x:d.x,y:d.y}:null),'jury2-sonde');
    }
    const tirs=N.ennemis.tirs,push=tirs.push;
    tirs.push=function(...objets){
      const resultat=push.apply(this,objets);
      for(const t of objets)ev('tir-ennemi',{id:t.id,x:t.x,y:t.y,vx:t.vx,vy:t.vy,src:t.src},
        {source:'objet effectivement inséré dans le tableau public N.ennemis.tirs',incertitudeMs:0});
      return resultat;
    };
  }
  function image(coutMs,stamp) {
    const N=window.__N,S=window.__S;
    if(!actif||!N?.gfx?.buf||!S)return;
    const h=horloge(),b=N.gfx.buf(),L=N.pal.L,n=b.length;
    let up=0,dn=0,rin=0,rout=0,horsPalette=0,changes=0,lum=0;
    if(cfg.pixels) {
      for(let i=0;i<n;i++) {
        const c=b[i],a=previous?.[i];if(c>=N.pal.C.length)horsPalette++;
        lum+=L[c]||0;
        if(a===undefined||a===c)continue;
        changes++;
        if(L[c]-L[a]>=.1&&Math.min(L[a],L[c])<.8)up++;
        if(L[a]-L[c]>=.1&&Math.min(L[a],L[c])<.8)dn++;
        const ra=a===5||a===11||a===14,rc=c===5||c===11||c===14;
        if(rc&&!ra)rin++;if(ra&&!rc)rout++;
      }
      if(!previous||previous.length!==n)previous=new Uint8Array(n);previous.set(b);
    }
    const adv=N.aventure?.state?.(),w=N.warp?.state?.();
    for(const e of evenements)if(e.type==='apparition'&&e.preuve?.apresRendu===undefined){
      const objet=N.ennemis.list.find(x=>x.id===e.d.id);
      e.preuve.apresRendu=!!objet;e.preuve.etat=objet?.etat??null;e.preuve.frame=window.__FRAME;
    }
    frames.push({...h,f:window.__FRAME,coutMs,intervalleMs:lastStamp===null?null:stamp-lastStamp,
      instrumentMs:null,etat:N.game.etat(),vague:N.dir?.vague?.(),score:N.score?.score,
      ennemis:N.ennemis?.count?.(),tension:S.tension,shake:S.shake||0,
      shakeXY:[S.shakeX??null,S.shakeY??null],W:N.gfx.W,H:N.gfx.H,PX:N.gfx.PX,
      up:up/n,dn:dn/n,rin:rin/n,rout:rout/n,horsPalette,changes:changes/n,luminance:lum/n,
      aventure:adv?{enCours:adv.enCours,etape:adv.etape,qui:adv.qui,type:adv.type}:null,
      warp:w?{phase:w.phase,facteur:w.facteur,raison:w.raison}:null,paused:!!S.paused});
    lastStamp=stamp;
    if(N.adapte) {
      const f=N.adapte.state||N.adapte.etat||N.adapte.info;
      const a=typeof f==='function'?clone(f.call(N.adapte)):null, sig=JSON.stringify(a);
      if(sig!==dernierAdapte){adapte.push({w:h.w,t:h.tempsJeu,vague:N.dir.vague(),valeur:a,
        absent:a===null?'N.adapte sans state/etat/info public':null});dernierAdapte=sig;}
    }
    if(cfg.media&&h.w>=snapAt) {
      images.push({w:h.w,t:h.tempsJeu,etat:N.game.etat(),W:N.gfx.W,H:N.gfx.H,buf:b64(b),pal:N.pal.C});
      snapAt=h.w+cfg.capturePas;
    }
  }
  window.requestAnimationFrame=f=>natRAF(stamp=>{
    const avant=window.__FRAME,t=performance.now();f(stamp);const cout=performance.now()-t;
    if(window.__FRAME!==avant&&window.__FRAME!==courantFrame){courantFrame=window.__FRAME;
      const ti=performance.now();try{image(cout,stamp);}catch(e){erreurs.push('sonde:'+String(e.stack||e));}
      if(frames.length)frames.at(-1).instrumentMs=performance.now()-ti;
    }
  });
  window.__jury={
    commencer(){poserHooks();origine=performance.now();actif=true;previous=null;lastStamp=null;snapAt=0;
      for(const r of recorders.values())if(!r.started)startRecorder(r);
      return {performanceTimeOrigin:performance.timeOrigin,originePerformanceMs:origine,regles:clone(window.__N.R.criteres),audio};},
    vider(){const d={frames,evenements,images,adapte,erreurs};frames=[];evenements=[];images=[];adapte=[];erreurs=[];return d;},
    horloge,
    async finir(){actif=false;for(const r of recorders.values())if(r.started&&r.recorder.state!=='inactive'){
      await new Promise(resolve=>{r.recorder.onstop=resolve;r.recorder.stop();});
    }await Promise.all(pending);const d=window.__N.game.dbg();return {audio,final:{...horloge(),etat:window.__N.game.etat(),err:clone(window.__ERR),
      tempsJeu:window.__N.horloge.t(),dbg:{t:d.t,vague:d.vague,score:d.score,kills:d.kills,stats:clone(d.stats)},
      bilanScore:clone(window.__N.score.resume?.()),aventure:clone(window.__N.aventure?.state?.()),profil:clone(window.__N.choix?.profil?.()),adapteExiste:!!window.__N.adapte}};}
  };
}
