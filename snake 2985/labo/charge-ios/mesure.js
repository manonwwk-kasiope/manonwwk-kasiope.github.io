'use strict';
(async()=>{
 const endpoint='/record'+location.pathname,display=document.querySelector('canvas'),status=document.querySelector('output');
 async function post(id,kind,data){
   for(let retry=0;;retry++){
     try{const reply=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,kind,...data})});if(!reply.ok)throw Error('HTTP '+reply.status);return;}
     catch(e){if(retry===2)throw e;await new Promise(r=>setTimeout(r,250));}
   }
 }
 try{
   if(!window.silenceReady)throw Error('Neutralisation audio non vérifiée');
   const ua=navigator.userAgent;
   if(!/iPhone/.test(ua)||!/Mobile\/.*Safari\//.test(ua))throw Error('Safari iPhone requis : '+ua);
   const lifecycle={active:false,request:0,hiddenStops:0,visibleRestarts:0,controlledStops:0,controlledRestarts:0,pagehide:0,pageshow:0};
   let resume=null;
   document.addEventListener('visibilitychange',()=>{
     if(document.hidden){cancelAnimationFrame(lifecycle.request);lifecycle.hiddenStops++;}
     else{lifecycle.visibleRestarts++;if(resume)resume();}
   });
   addEventListener('pagehide',()=>lifecycle.pagehide++);addEventListener('pageshow',()=>lifecycle.pageshow++);
   const largePortrait=document.documentElement.hasAttribute('data-landscape-only');
   if(largePortrait&&!matchMedia('(orientation: landscape)').matches)throw Error('Safari n’est pas en paysage');
   const schedules=[];
   for(const reduced of (largePortrait?[false]:[false,true]))for(const size of (largePortrait?['paysage']:['grand','compact']))for(const [yi,year] of [1976,1985,1995,2185,2985].entries())for(const [pi,phase] of ['guide','grille','vol','boss'].entries()){
     const first=(yi+pi+Number(reduced)+Number(size==='compact'))%2;
     for(const mode of first?['selection','reference']:['reference','selection'])schedules.push({year,phase,size,reduced,mode});
   }
   const view=()=>({w:innerWidth,h:innerHeight,visualW:visualViewport?.width,visualH:visualViewport?.height,orientation:matchMedia('(orientation: landscape)').matches?'paysage':'portrait',screenOrientation:screen.orientation?.type??null,dpr:devicePixelRatio});
   const firstIndex=Number(document.documentElement.dataset.resumeAt||0);
   const started=performance.now();const windowMs=4000,sec=1/60;
   await post('start','start',{ua,view:view(),rows:schedules.length,windowMs,navigationReady:started,deviceMemory:navigator.deviceMemory??null,jsHeap:performance.memory?.usedJSHeapSize??null,screenHz:null,osReduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
   function newScene(cell){
     let seed=cell.year*17+11;
     const s=SnakeArcade.create(()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),cell.year);
     SnakeForge.equip(s,cell.phase==='boss'?'well':'prism',cell.phase==='boss'?'blast':'chain');s.forge.clock=0;
     if(cell.phase==='guide'){
       s.initiation=SnakeInitiation.create('facultatif',0);SnakeInitiation.prepare(s.initiation);
       SnakeInitiation.update(s.initiation,s,0,[]);s.aide=SnakeInitiation.cue(s.initiation,s);
     }
     if(cell.phase==='boss'){
       s.difficulty=s.sector=9;s.sectorCells=1;s.cells.unshift({x:10,y:9,plane:0});SnakeGardiens.tick(s,s.stepTime+1e-6);
       if(!s.boss)throw Error('Gardien absent en '+cell.year);
       SnakeArcade.fire(s);
     }
     if(cell.phase==='vol'){s.flightGate={...s.snake[0]};if(!SnakeFlight.cross(s))throw Error('Vol absent');}
     return s;
   }
   function advance(s,cell,frame){
     if(s.flight){const goal=s.flight.rings[s.flight.passed],h=s.snake[0];if(goal)SnakeFlight.aim(s,goal.x-h.x,goal.y-h.y);}
     if(cell.phase==='grille'&&frame%70===32)SnakeArcade.shiftPlane(s);
     if(cell.phase==='boss'&&frame%85===50)SnakeArcade.shiftPlane(s);
     SnakeGardiens.tick(s,sec);
     if(s.initiation){SnakeInitiation.update(s.initiation,s,sec,s.events);s.aide=SnakeInitiation.cue(s.initiation,s);}
     for(const ev of s.events)SnakeImpact.event(s,ev);s.events.length=0;
   }
   function stats(a){
     const sorted=a.sort((x,y)=>x-y),p=v=>sorted.length?sorted[Math.floor((sorted.length-1)*v)]:null;
     const edges=[2,4,8,12,17,20,25,33.4,50,75,100,250,1000],bins=Array(edges.length+1).fill(0);
     for(const v of a){const i=edges.findIndex(x=>v<=x);bins[i<0?edges.length:i]++;}
     return {n:a.length,p50:p(.5),p95:p(.95),p99:p(.99),max:p(1),over25:a.filter(v=>v>25).length,over50:a.filter(v=>v>50).length,edges,bins};
   }
   function trial(cell,i){
     const logical=cell.mode==='selection'&&[1985,2185].includes(cell.year);
     const width=largePortrait?Math.floor(Math.min(innerWidth-8,2*(innerHeight-32))):Math.floor(Math.min(innerWidth-4,(innerHeight-40)*2)*(cell.size==='grand'?1:.73));
     display.style.width=width+'px';display.style.height=Math.round(width/2)+'px';
     status.textContent=(i+1)+' / '+schedules.length+' · '+cell.year+' · '+cell.phase+' · '+cell.mode;
     const requested=performance.now();SnakeMatieres.load(cell.year);
     let s=newScene(cell),step=0,elapsed=0,last=null,firstDraw=null,firstPresented=null,decorReady=null,resets=0;
     const counts={guide:0,vol:0,boss:0,artillery:0,painted:0},d=[],r=[],sim=[];
     return new Promise((resolve,reject)=>{
       let settled=false,pausedOnce=false;
       function wake(){if(settled||document.hidden)return;last=null;cancelAnimationFrame(lifecycle.request);lifecycle.request=requestAnimationFrame(frame);}
       function frame(stamp){
         try{
           if(document.hidden||settled)return;
           if(last!==null){const gap=stamp-last;r.push(gap);elapsed+=gap;if(firstPresented===null)firstPresented=performance.now()-requested;}
           last=stamp;
           const begin=performance.now(),target=Math.floor(elapsed*.06);
           while(step<target){if(s.status!=='playing'||cell.phase==='vol'&&!s.flight||cell.phase==='boss'&&!s.boss||cell.phase==='guide'&&!s.aide){s=newScene(cell);resets++;}advance(s,cell,step++);}
           const drawAt=performance.now();sim.push(drawAt-begin);
           const renderer=cell.mode==='selection'?SnakeSpectacle:SnakeReference;
           renderer.draw(display,s,s.elapsed,cell.reduced,'direct');
           const end=performance.now();d.push(end-drawAt);
           if(firstDraw===null)firstDraw=end-requested;
           if(SnakeMatieres.ready(cell.year)){counts.painted++;if(decorReady===null)decorReady=end-requested;}
           counts.guide+=Number(!!s.aide);counts.vol+=Number(!!s.flight);counts.boss+=Number(!!s.boss);
           counts.artillery+=Number(Boolean(s.shots.length||s.forge?.projectiles.length||s.forge?.orbits.length));
           if(elapsed>=windowMs){
             settled=true;resume=null;
             resolve({...cell,i,elapsed,frames:d.length,logical,css:[display.clientWidth,display.clientHeight],pixels:[display.width,display.height],view:view(),raf:stats(r),draw:stats(d),simulation:stats(sim),firstDraw,firstPresented,decorReady,counts,resets,steps:step,audio:{...silence}});
           }else if(i===Math.floor(schedules.length/2)&&!pausedOnce&&elapsed>=1800){
             pausedOnce=true;
             lifecycle.request=requestAnimationFrame(frame);cancelAnimationFrame(lifecycle.request);lifecycle.controlledStops++;
             const preserved={draws:d.length,steps:step};
             setTimeout(()=>{if(d.length!==preserved.draws||step!==preserved.steps){reject(Error('Simulation active pendant suspension'));return;}
               lifecycle.controlledRestarts++;wake();},250);
           }else lifecycle.request=requestAnimationFrame(frame);
         }catch(err){settled=true;resume=null;reject(err);}
       }
       resume=wake;wake();
     });
   }
   for(const [i,cell] of schedules.entries()){
     if(i<firstIndex)continue;
     const row=await trial(cell,i);if(row.audio.media||row.audio.context)throw Error('Tentative audio');
     await post('cell-'+i,'cell',row);
   }
   status.textContent='Mesure terminée';
   await post('done','done',{rows:schedules.length,lifecycle,firstIndex,wallMs:performance.now()-started,view:view(),audio:silence,firstContentfulPaint:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null});
 }catch(e){document.querySelector('output').textContent='Mesure interrompue';await post('error','error',{message:String(e),stack:e.stack?.slice(0,1400)});}
})();
