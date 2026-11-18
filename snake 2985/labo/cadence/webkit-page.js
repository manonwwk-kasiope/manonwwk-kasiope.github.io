function instrumentCadence(conf) {
  const p=window.cadenceProbe={state:null,wall:0,frames:0,observations:[],events:[],cues:[],inputs:[],steps:[]};
  localStorage.setItem('snake2985.voyage.v1',JSON.stringify({last:conf.year,seen:[conf.year]}));
  const bind=(key,fn)=>{let value;Object.defineProperty(window,key,{configurable:true,get:()=>value,set:v=>{value=fn(v);}});};
  bind('SnakeRevanche',api=>({...api,create:()=>api.create(()=>conf.seed/4294967296)}));
  bind('SnakeArcade',api=>({...api,create(...args){const s=api.create(...args);p.state=s;return s;}}));
  bind('SnakeCameraMusicale',api=>({...api,cue(s,e,beat){
    const applied=api.cue(s,e,beat);
    if(['flightStart','boss','novaOverload','surfStart'].includes(e.type))
      p.cues.push({type:e.type,time:r(s.elapsed),applied,bpm:beat?.bpm,phase:beat?.phase});
    return applied;
  }}));
  bind('SnakeMondeVivant',api=>({...api,observe(s,ev){
    if(ev&&['boss','bossDefeated','flightStart','flightRing','flightEnd','death','clear','win'].includes(ev.type))p.events.push([ev.type,s.elapsed,s.score]);
    return api.observe(s,ev);
  }}));
  // The control experiment preserves the installed event handlers but restores the former frame dt.
  if(conf.policy==='variable'){
    bind('SnakeCadence',api=>({...api,create(step){
      let last=null;
      return {reset(t=null){last=t;},advance(t){if(!p.inFrame)return 0;if(last===null){last=t;return 0;}
        const dt=Math.max(0,Math.min(.08,(t-last)/1000));last=t;if(dt>0)step(dt,t);return +!!dt;}};
    }}));
  }
  let frames=new Map(),nextId=0;
  Object.defineProperty(performance,'now',{value:()=>p.wall});
  window.requestAnimationFrame=fn=>{const id=++nextId;frames.set(id,fn);return id;};
  window.cancelAnimationFrame=id=>frames.delete(id);
  function frame(t){p.wall=t;const prev=frames;frames=new Map();p.inFrame=true;try{for(const fn of prev.values())fn(t);}finally{p.inFrame=false;}p.frames++;}
  function position(v){return v?[r(v.x),r(v.y),v.plane??0]:null;}
  function r(n){return Math.round(n*1e6)/1e6;}
  p.snap=()=>{
    const s=p.state;
    return {year:s.year,status:s.status,cause:s.cause,score:s.score,kills:s.kills,
      time:r(s.elapsed),snake:s.snake.map(position),direction:position(s.direction),level:s.difficulty,planes:s.plane,levels:{...s.levels},
      charge:r(s.novaCharge),gun:r(s.gunClock),step:r(s.stepClock),drones:s.drones.map(d=>[d.id,...position(d),...position(d.next),r(d.moveIn)]),
      boss:s.boss?[s.boss.name,s.boss.hp,position(s.boss),s.boss.attack?.phase]:null,flight:s.flight?[r(s.flight.angle),s.flight.passed,r(s.flight.remaining)]:null,
      director:[s.director.phase,s.director.rounds]};
  };
  p.start=()=>{frame(0);p.wall=0;};
  let cursor=0;
  p.until=(t,trace)=>{
    while(cursor<conf.timing.length && conf.timing[cursor]<=t+1e-7){
      const at=conf.timing[cursor++];frame(at);
      if(at>0&&at%1000===0)p.observations.push(p.snap());
    }
    p.wall=t;
  };
  p.project=(dx,dy)=>{
    const s=p.state,h=s.snake[0],field=document.querySelector('#monde'),sp=SnakeSpectacle,cam=sp.camera(s,s.elapsed,conf.motion!=='normal');
    const o=sp.project(cam,h.x,h.y,s.plane),q=sp.project(cam,h.x+.01,h.y,s.plane),u=sp.project(cam,h.x,h.y+.01,s.plane);
    const a=Math.atan2(((q.y-o.y)*dx+(u.y-o.y)*dy)*field.clientHeight/sp.height,((q.x-o.x)*dx+(u.x-o.x)*dy)*field.clientWidth/sp.width);
    return [Math.round(27*Math.cos(a)),Math.round(27*Math.sin(a))];
  };
  p.action=()=>{
    const s=p.state,screen=document.body.dataset.screen;
    if(screen==='upgrade'){
      const i=!s.levels.arc?1:!s.levels.rail?0:2;
      return {kind:'atelier',i,confirm:!!document.querySelector('.sat-confirmer'),in:18};
    }
    if(screen!=='play')return {kind:'fin'};
    const a=pilotDecision(s);
    return a.flight?{kind:'aim',v:p.project(...a.vector),in:80}
      :{kind:'commandes',d:a.keys[0],shift:a.shift,fire:a.fire,in:Math.max(16,a.advance*1000)};
  };
  p.testInput=false;p.proofs=[];
  p.beginInput=()=>{p.inputStart=p.inputs.length;};
  p.endInput=(type,args,target)=>{
    const seen=p.inputs.slice(p.inputStart).filter(ev=>ev.at(-1)&&ev[0]===r(p.wall));
    const ok=type==='touche'?seen.some(v=>v[1]==='keydown' && v[2]===(args[0]==='Space'?' ':args[0]))&&seen.some(v=>v[1]==='keyup'&&v[2]===(args[0]==='Space'?' ':args[0])):
      seen.some(v=>v[1]===(type==='aim'?'pointermove':'pointerup') && Math.abs(v[3]-target[0])<.6 && Math.abs(v[4]-target[1])<.6);
    if(!ok)throw Error('Commande sans contact de confiance '+JSON.stringify({time:p.wall,type,args,target,seen}));
    p.proofs.push([r(p.wall),type,type==='touche'?args[0]:target]);
  };
  for(const type of ['click','keydown','keyup','pointerdown','pointerup','pointermove'])document.addEventListener(type,ev=>{
    if(p.testInput)p.inputs.push([r(p.wall),type,ev.key??'',ev.clientX??null,ev.clientY??null,ev.isTrusted]);
  },true);
}
if(typeof module==='object')module.exports=instrumentCadence;
