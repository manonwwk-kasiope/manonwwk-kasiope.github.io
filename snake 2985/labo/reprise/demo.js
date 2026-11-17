'use strict';
const $=id=>document.getElementById(id),ctx=$('view').getContext('2d'),engine=SnakeArcade,rec=SnakeReprise.create(),flags=SnakeReprise.flags;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state,last=0,playing=false,at=0,gesture=null,high={};
try{high=JSON.parse(localStorage.getItem('snake2985-labo-reprise')||'{}')||{};}catch{}
function eras(){
  $('era').replaceChildren(...engine.eras.map(({year})=>{
    const o=document.createElement('option');o.value=year;o.textContent=year+(year===1995?' · Rail 8 bits':'')+' · record '+(high[year]||0);return o;
  }));
  $('era').value=String(state.year);
}
function begin(era){
  state=engine.create(Math.random,era);rec.reset();rec.capture(state,0);playing=false;gesture=null;
  $('review').hidden=true;$('live').hidden=false;last=performance.now();
  render(rec.frameAt(0));
}
function end(){
  if(state.score>(high[state.year]||0)){
    high[state.year]=state.score;try{localStorage.setItem('snake2985-labo-reprise',JSON.stringify(high));}catch{}
  }
  const d=rec.death,r=rec.bounds();
  $('cause').textContent=d.cause+' · plan '+(d.plane+1);$('lesson').textContent=d.tip;
  $('slider').min=r.start;$('slider').max=r.end;at=r.end;stop();
  $('live').hidden=true;$('review').hidden=false;eras();setAt(at);$('slider').focus();
}
function setAt(t){
  const b=rec.bounds();at=Math.min(b.end,Math.max(b.start,t));$('slider').value=at;
  $('time').textContent=((at-b.end)/1000).toFixed(2).replace('.',',')+' s';
  render(rec.frameAt(at));
}
function stop(){playing=false;$('play').textContent=reduced.matches?'Image suivante':'Lire';}
$('play').onclick=()=>{
  if(reduced.matches){setAt(at>=rec.bounds().end?rec.bounds().start:at+250);return;}
  if(playing){stop();return;}
  if(at>=rec.bounds().end)setAt(rec.bounds().start);
  playing=true;$('play').textContent='Pause';
};
$('slider').oninput=e=>{stop();setAt(+e.target.value);};
$('back').onclick=()=>{stop();setAt(at-250);};
$('next').onclick=()=>{stop();setAt(at+250);};
$('retry').onclick=()=>{stop();begin(engine.eras.findIndex(e=>e.year===+$('era').value));};
$('shift').onclick=()=>engine.shiftPlane(state);
$('nova').onclick=()=>engine.fire(state);
$('view').onpointerdown=e=>{if(state.status==='playing'){gesture={id:e.pointerId,x:e.clientX,y:e.clientY};e.target.setPointerCapture(e.pointerId);}};
$('view').onpointermove=e=>{
  if(gesture?.id!==e.pointerId)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;
  if(Math.abs(dx)>Math.abs(dy))engine.turn(state,Math.sign(dx),0);else engine.turn(state,0,Math.sign(dy));
  gesture.x=e.clientX;gesture.y=e.clientY;
};
$('view').onlostpointercapture=()=>{gesture=null;};
window.addEventListener('keydown',e=>{
  if(state.status!=='playing')return;
  const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(dirs[e.key]){e.preventDefault();engine.turn(state,...dirs[e.key]);}
});
function render(f){
  if(!f)return;
  ctx.fillStyle=f.plane?'#1e1c31':'#102531';ctx.fillRect(0,0,720,360);
  if(state.year===1995){
    ctx.fillStyle='#38414b';
    for(let row=2;row<18;row+=6){
      const y=row*20;
      ctx.fillRect(0,y+5,720,1);ctx.fillRect(0,y+14,720,1);
      for(let x=0;x<720;x+=16)ctx.fillRect(x,y+3,2,14);
    }
  }
  for(let i=0;i<648;i++){
    const mask=f.cells[f.plane*648+i],x=i%36*20,y=Math.floor(i/36)*20;
    if(!mask)continue;
    if(mask&(flags.warning|flags.active)){
      ctx.fillStyle=mask&flags.active?'#863824':'#4c4a2a';ctx.fillRect(x,y,20,20);
      ctx.strokeStyle='#ffd49a';ctx.beginPath();ctx.moveTo(x+2,y+17);ctx.lineTo(x+17,y+2);ctx.stroke();
    }
    if(mask&flags.hull){ctx.fillStyle='#a7658c';ctx.fillRect(x+1,y+1,18,18);}
    if(mask&flags.cell){ctx.fillStyle='#efe8a7';ctx.fillRect(x+6,y+6,8,8);}
    if(mask&flags.body){ctx.fillStyle='#63d7bc';ctx.fillRect(x+4,y+4,12,12);}
    if(mask&flags.drone){ctx.fillStyle='#ff926f';ctx.fillRect(x+3,y+3,14,14);}
    if(mask&flags.next){ctx.strokeStyle='#ffbd91';ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+15,y+15);ctx.moveTo(x+15,y+5);ctx.lineTo(x+5,y+15);ctx.stroke();}
    if(mask&flags.gate){ctx.strokeStyle='#a7b6ff';ctx.strokeRect(x+2,y+2,16,16);}
  }
  ctx.fillStyle='#ddfff4';ctx.fillRect(f.x*20+4,f.y*20+4,12,12);
  if(rec.death&&at>=rec.bounds().end){
    const x=Math.max(0,Math.min(35,rec.death.x))*20,y=Math.max(0,Math.min(17,rec.death.y))*20;
    ctx.lineWidth=3;ctx.strokeStyle='#ff704e';ctx.strokeRect(x+2,y+2,16,16);ctx.lineWidth=1;
  }
  $('hud').textContent=state.year+' · '+state.score+' pts · plan '+(f.plane+1);
}
function loop(now){
  const dt=document.hidden?0:Math.min(50,Math.max(0,now-last));last=now;
  if(state.status==='playing'){
    engine.tick(state,dt/1000);
    if(rec.capture(state,state.elapsed*1000)){
      if(state.status==='dead')end(); else render(rec.frameAt(state.elapsed*1000));
    }
    if(state.status==='upgrade')engine.upgrade(state,'rail');
    if(['won','cleared'].includes(state.status))begin((state.eraIndex+1)%engine.eras.length);
  }else if(playing){
    setAt(at+dt);if(at>=rec.bounds().end)stop();
  }
  requestAnimationFrame(loop);
}
reduced.addEventListener('change',()=>stop());
document.addEventListener('visibilitychange',()=>{stop();last=performance.now();});
begin(0);requestAnimationFrame(loop);
