(() => {
  'use strict';

  const horizon = 12000, maxFrames = 750, scale = 64, stride = 7;
  const eras = [1976,1985,1995,2185,2985];
  const millis = s => Math.round(s.elapsed * 1000);
  function position(s) {
    const p = s.snake[0], prev = s.previousSnake?.[0] ?? p;
    const t = s.flight ? 1 : Math.max(0, Math.min(1, s.progress));
    return {x:prev.x+(p.x-prev.x)*t,y:prev.y+(p.y-prev.y)*t,plane:p.plane ?? 0,flight:!!s.flight};
  }
  function recorder() { return {frames:[], prior:null, next:0}; }
  function capture(r,s) {
    const t = millis(s), p = position(s), previous = r.prior;
    if (previous && t <= previous.t) return;
    const cut = previous && (previous.p.plane !== p.plane || previous.p.flight !== p.flight
      || Math.hypot(previous.p.x-p.x,previous.p.y-p.y)>.42);
    const frame = {t,p,cut:!!cut,score:s.score};
    if (t >= r.next || cut || s.status==='dead') {
      if (cut && r.frames.at(-1)?.t < previous.t) r.frames.push(previous);
      r.frames.push(frame);
      r.next=t+30;
    }
    r.prior=frame;
    while (r.frames.length>maxFrames || (r.frames.length && r.frames[0].t<t-horizon)) r.frames.shift();
  }
  function finish(r,s) {
    capture(r,s);
    if (s.status!=='dead' || !r.frames.length) return null;
    const frames=r.frames, first=frames[0], data=new Uint8Array(frames.length*stride), view=new DataView(data.buffer);
    for (let i=0;i<frames.length;i++) {
      const {p,t,cut}=frames[i], off=i*stride;
      view.setUint16(off,t-first.t);
      view.setInt16(off+2,Math.round(p.x*scale));
      view.setInt16(off+4,Math.round(p.y*scale));
      view.setUint8(off+6,p.plane | (+p.flight<<1) | (+cut<<2));
    }
    return {v:1,year:s.year,width:s.width,height:s.height,score:s.score,elapsed:millis(s),
      start:first.t,startScore:first.score,bytes:btoa(String.fromCharCode(...data))};
  }
  function open(record) {
    if (!record || record.v!==1 || !eras.includes(record.year) || record.width!==36 || record.height!==18
      || ![record.score,record.elapsed,record.start,record.startScore].every(v=>Number.isSafeInteger(v)&&v>=0)
      || record.startScore>record.score || typeof record.bytes!=='string'
      || record.bytes.length>Math.ceil(maxFrames*stride/3)*4) return null;
    let binary;
    try { binary=atob(record.bytes); } catch { return null; }
    if (!binary.length || binary.length%stride || binary.length>stride*maxFrames) return null;
    const view=new DataView(Uint8Array.from(binary,c=>c.charCodeAt(0)).buffer), frames=[];
    for (let off=0;off<binary.length;off+=stride) {
      const t=view.getUint16(off),x=view.getInt16(off+2)/scale,y=view.getInt16(off+4)/scale,
        bits=view.getUint8(off+6);
      if (bits>7 || t>horizon || (frames.length?t<=frames.at(-1).t:t!==0)
        || x<-.5 || x>record.width-.5 || y<-.5 || y>record.height-.5) return null;
      frames.push({t,x,y,plane:bits&1,flight:!!(bits&2),cut:!!(bits&4)});
    }
    const duration=frames.at(-1).t;
    return record.start+duration===record.elapsed?{...record,frames,duration}:null;
  }
  // Random access permits an instant replay or scrub without replaying the other era's enemies.
  function ghost(clip,t) {
    if (!clip || !Number.isFinite(t) || t<0 || t>clip.duration) return null;
    const frames=clip.frames;
    let lo=0,hi=frames.length-1;
    while (lo<hi) {
      const mid=Math.ceil((lo+hi)/2);
      if (frames[mid].t<=t) lo=mid;
      else hi=mid-1;
    }
    const a=frames[lo],b=frames[lo+1];
    const k=b&&!b.cut?(t-a.t)/(b.t-a.t):0;
    return {x:a.x+(b?b.x-a.x:0)*k,y:a.y+(b?b.y-a.y:0)*k,plane:a.plane,flight:a.flight};
  }
  // The renderer supplies its own perspective. Do not bridge a portal or join different planes.
  function draw(ctx,clip,t,project,plane) {
    const head=ghost(clip,t);
    if (!head || head.plane!==plane) return;
    ctx.save();
    ctx.lineWidth=1.5;
    ctx.strokeStyle='#a9edff';
    ctx.fillStyle='#e4faff';
    ctx.setLineDash([3,4]);
    ctx.beginPath();
    let prev=null;
    const start=Math.max(0,t-800);
    for (let now=start;;now=Math.min(t,now+40)) {
      const p=ghost(clip,now), screen=project(p);
      if (p.plane===plane) {
        const cut=prev && clip.frames.some(f=>f.cut && f.t>prev.time && f.t<=now);
        if (prev && !cut) ctx.lineTo(screen.x,screen.y);
        else ctx.moveTo(screen.x,screen.y);
        prev={time:now};
      } else prev=null;
      if (now===t) break;
    }
    ctx.stroke();
    const h=project(head);
    ctx.beginPath();
    ctx.arc(h.x,h.y,3.5,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  function futureYears(year) { return eras.includes(year)?eras.filter(y=>y>year):[]; }

  // The original v2 trace timestamps grid positions in centiseconds; it has no charge or score history.
  function oldClip(rec,year) {
    if (!rec || rec.year!==year || rec.width!==36 || rec.height!==18 || !Number.isSafeInteger(rec.score)
      || rec.score<0 || !Number.isSafeInteger(rec.until) || rec.until<0 || rec.until>Number.MAX_SAFE_INTEGER/10
      || !Array.isArray(rec.path) || rec.path.length<6 || rec.path.length>6000 || rec.path.length%3) return null;
    const trace=[];
    for (let i=0;i<rec.path.length;i+=3) {
      const [t,x,y]=rec.path.slice(i,i+3);
      if (![t,x,y].every(Number.isSafeInteger) || t<0 || t>rec.until || (i && t*10<=trace.at(-1).t)
        || x<0 || x>=36 || y<0 || y>=18) return null;
      trace.push({t:t*10,x,y,plane:0,flight:false,cut:false});
    }
    const elapsed=rec.until*10,start=Math.max(trace[0].t,elapsed-horizon),duration=elapsed-start;
    const full={frames:trace,duration:elapsed};
    const frames=[];
    // Preserve legacy corners exactly up to the hard cap. A dense archive is sampled at 60 Hz.
    const knots=trace.filter(p=>p.t>start && p.t<elapsed).map(p=>p.t);
    const times=knots.length+2<=maxFrames?[start,...knots,elapsed]:
      Array.from({length:maxFrames},(_,i)=>Math.round(start+duration*i/(maxFrames-1)));
    for(const t of times) {
      if(frames.at(-1)?.t===t-start) continue;
      frames.push({...ghost(full,t),t:t-start,cut:false});
    }
    return {legacy:true,year,width:36,height:18,score:rec.score,startScore:0,start,elapsed,duration,frames};
  }

  function archive(storage) {
    const key=year=>'snake2985.chrono.v1.36x18.'+year;
    function read(k) {
      try {return JSON.parse(storage.getItem(k));} catch {return null;}
    }
    return {
      save(record) {
        if (!open(record)) return false;
        try {storage.setItem(key(record.year),JSON.stringify(record));return true;} catch {return false;}
      },
      load(year) {
        if(!eras.includes(year)) return null;
        const recent=open(read(key(year)));
        return recent?.year===year?recent:oldClip(read('snake2985.echo.v2.36x18.'+year),year);
      },
    };
  }
  function challenge(clip,state,model='poursuite') {
    if (!clip || !eras.includes(state.year) || !eras.includes(clip.year) || state.year<=clip.year || state.score!==0 || state.elapsed!==0
      || !['chrono','poursuite'].includes(model)) return null;
    return {model,target:clip.score,deadline:clip.elapsed,sprint:clip.duration,segmentGain:clip.score-clip.startScore,
      status:'en cours',bet:clip.legacy?'historique':'disponible',sprintGain:0};
  }
  function wager(c,s) {
    if (!c || c.model!=='poursuite' || c.bet!=='disponible' || c.status!=='en cours' || s.status!=='playing'
      || s.novaCharge<.25 || millis(s)>Math.min(2000,c.sprint/2)) return false;
    s.novaCharge-=.25;
    c.bet='engagé';
    return true;
  }
  function update(c,s) {
    if (!c) return;
    const t=millis(s);
    if (c.bet==='disponible' && (t>Math.min(2000,c.sprint/2) || s.status==='dead')) c.bet='clos';
    if (c.bet==='engagé') {
      if (t<=c.sprint) c.sprintGain=s.score;
      if (c.sprintGain>c.segmentGain) {
        c.bet='gagné';
        s.novaCharge=Math.min(1,s.novaCharge+.60);
      } else if (t>=c.sprint || ['dead','cleared','won'].includes(s.status)) c.bet='perdu';
    }
    if (c.status!=='en cours') return;
    if (c.model==='chrono' && t>c.deadline) c.status='temps écoulé';
    else if (s.score>c.target) c.status='record battu';
    else if (s.status==='dead' || s.status==='won' || s.status==='cleared') c.status='terminé';
  }
  const api={recorder,capture,finish,open,ghost,draw,archive,futureYears,challenge,wager,update,position};
  if (typeof module!=='undefined') module.exports=api;
  else window.SnakeChrono=api;
})();
