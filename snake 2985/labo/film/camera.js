'use strict';
// The film camera only reads the live game; all mutations below concern recording buffers.
function filmCamera(){
 const f=window.cinema={state:null,logs:[],tracks:{},seed:298501,t:0};
 const watch=(key,wrap)=>{
   let obj;Object.defineProperty(window,key,{get:()=>obj,set:v=>{obj=wrap(v);}});
 };
 Math.random=()=>((f.seed=(Math.imul(f.seed,1664525)+1013904223)>>>0)/4294967296);
 watch('SnakeArcade',v=>({...v,create(...args){const s=v.create(...args);f.state=s;return s;}}));
 watch('SnakeMondeVivant',v=>({...v,observe(s,e){if(e?.type&&!['shot','kill','forgeShot','forgeHit','bossHit'].includes(e.type))
   f.logs.push({year:s.year,t:s.elapsed,...e});return v.observe(s,e);}}));
 let callbacks=new Map(),id=0;window.requestAnimationFrame=fn=>{callbacks.set(++id,fn);return id;};
 window.cancelAnimationFrame=k=>callbacks.delete(k);
 Object.defineProperty(performance,'now',{value:()=>f.t});
 const years=[1976,1985,1995,2185,2985],bits=[2,4,8,16,32];
 let surface,master,ink,origin;
 function snap(s,track){
   if(!surface){
     surface=document.createElement('canvas');surface.style.cssText='position:fixed;left:-2500px;top:0;width:960px;height:440px';
     document.body.append(surface);
     master=document.createElement('canvas');master.width=1000;master.height=460;ink=master.getContext('2d');
   }
   SnakeSpectacle.draw(surface,s,s.elapsed,false);
   ink.fillStyle='#091119';ink.fillRect(0,0,1000,460);ink.drawImage(surface,20,0,960,440);
   const i=years.indexOf(s.year);
   ink.fillStyle='#f0e8d8';ink.font='bold 13px system-ui';ink.textBaseline='middle';ink.fillText(String(s.year),20,450);
   ink.fillStyle='#b1c6cc';ink.font='12px system-ui';ink.fillText(bits[i]+' bits  ·  '+SnakeArcade.eras[i].name,76,450);
   const pic=master.toDataURL('image/jpeg',.94).split(',')[1];
   track.frames.push({pic,t:s.elapsed,boss:s.boss?.name||null,plane:s.plane,flight:!!s.flight,beat:!!s.beat,paint:s.year===1976||SnakeMatieres.ready(s.year),status:s.status});
   if(track.frames.length>180)track.frames.shift();
 }
 function record(s,screen){
   if(!s?.year)return;
   const y=s.year,track=f.tracks[y]||=( {frames:[],active:false,done:false} );
   if(track.done)return;
   if(y===2985){
     if(screen==='play'&&s.difficulty>=9){snap(s,track);return;}
     if(s.status==='won'){snap(s,track);track.done=true;}return;
   }
   if(screen!=='play')return;
   if(!track.active){
     track.active=y===1976?s.elapsed>.1:y===1985?!!s.planeShift:y===1995?!!s.boss:!!s.flight;
   }
   if(track.active){snap(s,track);if(track.frames.length===180)track.done=true;}
 }
 f.advance=(limit,grid)=>{
   let actual=0;const start=f.state.snake[0],phase=!!f.state.flight;
   for(let i=0;i<limit;i++){
     const before=document.body.dataset.screen;
     f.t+=1000/30;const batch=callbacks;callbacks=new Map();for(const fn of batch.values())fn(f.t);
     record(f.state,document.body.dataset.screen);actual++;
     if(before!==document.body.dataset.screen||!!f.state.flight!==phase||grid&&start!==f.state.snake[0])break;
   }
   return actual;
 };
 f.pick=()=>{
   const s=f.state,c=document.querySelector('#monde'),r=SnakeSpectacle;
   const project=pt=>{const q=r.project(r.camera(s,s.elapsed,false),pt.x,pt.y,s.plane);return{x:q.x*c.clientWidth/r.width,y:q.y*c.clientHeight/r.height};};
   const a=pilotDecision(s,project);
   // Take the visible portal through the usual keyboard route in the orbital chapter.
   if(s.year===2185&&s.flightGate&&!s.flight&&!f.tracks[2185]?.active){
     const h=s.snake[0],gate=s.flightGate,dx=gate.x-h.x,dy=gate.y-h.y;
     if(gate.plane===s.plane&&Math.abs(dx)+Math.abs(dy)<=4&&(!dx||!dy)){
       a.keys=[dx>0?'ArrowRight':dx<0?'ArrowLeft':dy>0?'ArrowDown':'ArrowUp'];a.shift=false;
     }
   }
   return a;
 };
}
