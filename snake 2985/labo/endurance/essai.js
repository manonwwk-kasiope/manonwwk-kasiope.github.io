(() => {
'use strict';
const display=document.querySelector('canvas'),physical=window.SnakeMondes;
const logical=document.createElement('canvas');logical.getContext('2d',{willReadFrequently:true});
let counters={};let counting=false;
const empty=()=>({newCanvas:0,widthReset:0,heightReset:0,reads:0,bytesRead:0,imageCopies:0,copySourcePixels:0,copyTargetPixels:0});
const create=document.createElement.bind(document);document.createElement=(name,...args)=>{if(counting&&name==='canvas')counters.newCanvas++;return create(name,...args);};
for(const [name,label] of [['width','widthReset'],['height','heightReset']]){
 const prop=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,name);
 Object.defineProperty(HTMLCanvasElement.prototype,name,{...prop,set(value){if(counting)counters[label]++;return prop.set.call(this,value);}});
}
const proto=CanvasRenderingContext2D.prototype,read=proto.getImageData,copy=proto.drawImage;
proto.getImageData=function(x,y,w,h,...opts){if(counting){counters.reads++;counters.bytesRead+=w*h*4;}return read.call(this,x,y,w,h,...opts);};
proto.drawImage=function(src,...args){if(counting){counters.imageCopies++;counters.copySourcePixels+=src.width*src.height;counters.copyTargetPixels+=args.length===2?src.width*src.height:args.at(-2)*args.at(-1);}return copy.call(this,src,...args);};
function start(year,phase,seed){
 const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const s=SnakeArcade.create(rnd,year);
 if(phase==='boss'){
   s.difficulty=4;s.sector=4;s.sectorCells=1;s.cells.unshift({x:10,y:9,plane:0});SnakeArcade.tick(s,s.stepTime+.00001);
   if(!s.boss)throw Error('Entrée gardien absente '+year);
 }
 if(phase==='vol'){s.flightGate={...s.snake[0]};if(!SnakeFlight.cross(s))throw Error('Entrée vol absente '+year);}
 if(phase==='plan')SnakeArcade.shiftPlane(s);
 return s;
}
function advance(s,phase,index){
 if(s.flight){const h=s.snake[0],goal=s.flight.rings[s.flight.passed];if(goal)SnakeFlight.aim(s,goal.x-h.x,goal.y-h.y);}
 if(phase==='plan'&&index%51===1)SnakeArcade.shiftPlane(s);
 if(phase==='boss'&&index%97===65)SnakeArcade.shiftPlane(s);
 if(phase!=='vol'&&index%89===72)SnakeArcade.turn(s,0,index%2?1:-1);
 SnakeArcade.tick(s,1/60);
}
function draw(s,t,reduced,mode){
 if(mode==='dpr2'){window.SnakeMondes=physical;SnakeSpectacle.draw(display,s,t,reduced);return;}
 window.SnakeMondes=window.LogicalMondes;
 const ratio=Math.min(2,devicePixelRatio),W=Math.round(display.clientWidth*ratio),H=Math.round(display.clientHeight*ratio);
 if(display.width!==W)display.width=W;if(display.height!==H)display.height=H;
 if(s.year===2985){LogicalSpectacle.draw(display,s,t,reduced);return;}
 const w=Math.min(W,LogicalMondes.formats[s.year].width),h=Math.round(w*H/W);
 if(logical.width!==w)logical.width=w;if(logical.height!==h)logical.height=h;
 LogicalSpectacle.draw(logical,s,t,reduced);LogicalMondes.finish(logical,s.year,display);
}
const q=(a,f)=>{const v=a.slice().sort((a,b)=>a-b);return v[Math.min(v.length-1,Math.floor(v.length*f))]||0;};
const stats=a=>({p50:q(a,.5),p95:q(a,.95),p99:q(a,.99),max:a.length?Math.max(...a):0,over25:a.filter(v=>v>25).length,over50:a.filter(v=>v>50).length});
const histogram=a=>{const bins={};for(const v of a){const k=Math.round(v*10);bins[k]=(bins[k]||0)+1;}return bins;};
const modes=['sol','plan','vol','boss'];
window.trial=({year,mode,seconds,pass})=>new Promise((resolve,reject)=>{
 const result=[],period=seconds*1000/8;let base=null,prev=null,seq=-1,s,js=[],raf=[],game=[],frameCount=0,step=0,first=null,encounter={},seqStart=0;
 function finish(){result.push({phase:modes[seq%4],reduced:seq>=4,frames:js.length,js:stats(js),rAF:stats(raf),engine:stats(game),histJS:histogram(js),histRAF:histogram(raf),counts:counters,encounter});}
 const run=stamp=>{try{
   if(base==null)base=stamp;const elapsed=stamp-base,n=Math.floor(elapsed/period);
   if(n!==seq){
     if(seq>=0)finish();
     if(n>=8){counting=false;resolve({totalFrames:frameCount,first,elapsedMs:elapsed,rows:result,audioAttempts});return;}
     seq=n;seqStart=n*period;step=0;s=start(year,modes[n%4],year*17+pass);js=[];raf=[];game=[];encounter={flightFrames:0,bossFrames:0,warningFrames:0,shiftFrames:0,resets:0};counters=empty();counting=true;
   }
   const phase=modes[seq%4],target=Math.floor((elapsed-seqStart)*.06),simBefore=performance.now();
   while(step<target){step++;if(s.status!=='playing'){s=start(year,phase,year*17+pass);encounter.resets++;}advance(s,phase,step);}
   const before=performance.now();game.push(before-simBefore);
   draw(s,elapsed/1000+pass*seconds,seq>=4,mode);
   const cost=performance.now()-before;js.push(cost);if(prev!==null)raf.push(stamp-prev);prev=stamp;frameCount++;
   if(s.flight)encounter.flightFrames++;if(s.boss)encounter.bossFrames++;if(s.boss?.attack)encounter.warningFrames++;if(s.planeShift)encounter.shiftFrames++;
   if(first===null)first={js:cost,counts:{...counters},heap:performance.memory?.usedJSHeapSize};
   requestAnimationFrame(run);
 }catch(e){counting=false;reject(e);}};
 requestAnimationFrame(run);
});
window.photo=({year,mode})=>{const s=start(year,'boss',year);for(let i=0;i<15;i++)advance(s,'boss',i);draw(s,2.4,false,mode);return display.toDataURL();};
})();
