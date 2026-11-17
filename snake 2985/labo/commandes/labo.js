'use strict';
const el=id=>document.getElementById(id), board=el('board').getContext('2d'), preview=el('preview').getContext('2d');
let mode='stick', flying=false, angle=0, targetAngle=0, pos={x:12,y:9}, dir={x:1,y:0}, turns=LabControls.createTurnBuffer(), trail=[], plane=0, pickup={x:20,y:9,plane:0}, score=0, novaAt=-5000, tick=0, last=performance.now(), workshop=false;
const owned={core:'orbit',mod:'echo'}, draft={...owned};
const arena={width:36,height:18,status:'playing',snake:[pos],direction:dir};
SnakeForge.init(arena,owned);
const bots=[[9,8,0],[16,9,0],[19,10,0],[26,5,1],[25,7,1]].map(([x,y,plane])=>({x,y,plane,hp:4,respawn:0}));
const arenaHooks={
  targets:()=>bots.filter(b=>b.hp>0),plane:()=>plane,visible:(p,t)=>p.plane===t.plane,emit:()=>{},
  damage:(t,n)=>{t.hp-=n;if(t.hp<=0)t.respawn=2.5;},pull:(t,p)=>{t.x+=(p.x-t.x)*.18;t.y+=(p.y-t.y)*.18;}
};
const status=()=>{el('status').textContent='Plan '+(plane+1)+' · '+score+' cellules · '+SnakeForge.name(owned.core,owned.mod);};
function dispatch(e){
  if(e.type==='turn'){
    turns.offer(dir,e);
  }
  if(e.type==='aim')targetAngle=e.angle;
  if(e.type==='plane'){plane=1-plane;status();}
  if(e.type==='nova' && e.t-novaAt>1100){
    novaAt=e.t;
    if(pickup.plane===plane && Math.hypot(pickup.x-pos.x,pickup.y-pos.y)<=4) collect();
  }
}
function collect(){score++;pickup={x:2+(score*7)%32,y:2+(score*5)%14,plane:score%2};status();}
const controller=LabControls.createInput(dispatch);
function instructions(){
  el('switch').textContent=mode==='stick'?'Stick':'Glissé';
  el('gesture').textContent=el('switch').textContent;
  el('guide').textContent=flying?(mode==='stick'?'Pointer vers le cap voulu':'Glisser à gauche ou à droite pour tourner'):(mode==='stick'?'Incliner depuis le point touché':'Tracer chaque virage');
  el('flight').textContent=flying?'Sur grille':'Vol libre';
  controller.configure({mode,flying,angle});
}
el('switch').onclick=()=>{mode=mode==='stick'?'swipe':'stick';instructions();};
el('flight').onclick=()=>{
  flying=!flying;
  turns.reset(); tick=0;
  if(flying)angle=targetAngle=Math.atan2(dir.y,dir.x);
  else {pos={x:Math.round(pos.x)%36,y:Math.round(pos.y)%18}; const q=Math.round(angle/(Math.PI/2)); dir={x:Math.round(Math.cos(q*Math.PI/2)),y:Math.round(Math.sin(q*Math.PI/2))};}
  instructions();
};
let armTimer, armedPointer;
function disarm(){clearTimeout(armTimer);armedPointer=null;el('nova').classList.remove('armed');}
function reset(){controller.reset();disarm();}
for(const id of ['pilot','plane','nova']){
  const zone=el(id);
  for(const phase of ['down','move','up','cancel'])zone.addEventListener('pointer'+phase,event=>{
    if(phase==='down'){
      zone.setPointerCapture(event.pointerId);
      if(id==='nova'&&!armedPointer){
        armedPointer={id:event.pointerId,x:event.clientX,y:event.clientY};
        armTimer=setTimeout(()=>zone.classList.add('armed'),280);
      }
    }
    const rect=zone.getBoundingClientRect(), x=event.clientX,y=event.clientY;
    const inside=x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;
    controller.route({phase,id:event.pointerId,x,y,t:performance.now(),zone:inside?id:''});
    if(id==='nova' && armedPointer?.id===event.pointerId &&
      (phase==='up'||phase==='cancel'||!inside||Math.hypot(x-armedPointer.x,y-armedPointer.y)>14)) disarm();
  });
  zone.addEventListener('lostpointercapture',event=>controller.route({phase:'cancel',id:event.pointerId,x:0,y:0,t:performance.now(),zone:''}));
}
window.addEventListener('blur',reset);
document.addEventListener('visibilitychange',()=>{reset();last=performance.now();});
el('plane').onclick=e=>{if(e.detail===0)dispatch({type:'plane',t:performance.now()});};
el('nova').addEventListener('keydown',e=>{if(!e.repeat&&['Enter',' '].includes(e.key))controller.route({phase:'down',id:'key',x:0,y:0,t:performance.now(),zone:'nova'});});
el('nova').addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key))controller.route({phase:'up',id:'key',x:0,y:0,t:performance.now(),zone:'nova'});});
window.addEventListener('keydown',e=>{
  const keys={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(!workshop&&keys[e.key]){e.preventDefault();const [x,y]=keys[e.key]; dispatch(flying?{type:'aim',angle:Math.atan2(y,x)}:{type:'turn',x,y});}
});
function toggle(open){
  reset(); workshop=open; el('game').hidden=open;el('workshop').hidden=!open;
  el('switch').hidden=el('flight').hidden=open;el('forge').textContent=open?'Retour':'Forge';
  if(open){Object.assign(draft,owned);choose();} else el('forge').focus();
}
el('forge').onclick=()=>toggle(!workshop);
for(const [id,list,key] of [['cores',SnakeForge.cores,'core'],['mods',SnakeForge.mods,'mod']]){
  for(const item of list){const b=document.createElement('button');b.textContent=item.name;b.dataset.id=item.id;b.onclick=()=>{draft[key]=item.id;choose();};el(id).append(b);}
}
el('equip').onclick=()=>{Object.assign(owned,draft);SnakeForge.equip(arena,owned.core,owned.mod);status();toggle(false);};
function circle(ctx,x,y,r,color,fill=true){
  ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx[fill?'fillStyle':'strokeStyle']=color;ctx[fill?'fill':'stroke']();
}
let sim, drones, h, time, hits;
function restart(){
  sim={width:29,height:9,snake:[{x:7,y:4}],direction:{x:1,y:0},status:'playing'};
  SnakeForge.init(sim,draft);time=hits=0;
  const locations=draft.core==='orbit'?[[9,4],[7,6],[5,4],[7,2]]:[[11,4],[13,3],[13,5],[14,4]];
  drones=locations.map(([x,y])=>({x,y,plane:0,flash:0}));
  h={targets:()=>drones,visible:()=>true,plane:()=>0,emit:()=>{},damage:t=>{t.flash=.25;hits++;},pull:(t,p)=>{t.x+=(p.x-t.x)*.23;t.y+=(p.y-t.y)*.23;}};
}
function choose(){
  el('recipe').textContent=SnakeForge.name(draft.core,draft.mod);
  const c=SnakeForge.cores.find(i=>i.id===draft.core),m=SnakeForge.mods.find(i=>i.id===draft.mod);
  el('details').textContent=c.description+' '+m.description;
  document.querySelectorAll('[data-id]').forEach(b=>b.setAttribute('aria-pressed',String([draft.core,draft.mod].includes(b.dataset.id))));
  restart();
  if(reduce.matches){for(let n=0;n<34;n++)advancePreview(1/60);drawPreview();}
}
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
reduce.addEventListener('change',()=>{if(workshop)choose();});
function advancePreview(dt){time+=dt;drones.forEach(t=>t.flash=Math.max(0,t.flash-dt));SnakeForge.update(sim,dt,h);}
function drawPreview(){
  preview.fillStyle='#0c1a26';preview.fillRect(0,0,500,150);
  preview.save();preview.scale(16,16);preview.lineWidth=.12;
  circle(preview,7,4,.5,'#8cfbd3');
  for(const t of drones)circle(preview,t.x,t.y,.38,t.flash?'white':'#ff956f');
  for(const p of [...sim.forge.projectiles,...sim.forge.orbits]){
    circle(preview,p.x,p.y,p.kind==='well'?p.radius:.24,'#b8a9ff',p.kind!=='well');
  }
  for(const p of sim.forge.effects){
    if(p.kind==='chain'){preview.strokeStyle='#ffea80';preview.beginPath();preview.moveTo(p.x,p.y);preview.lineTo(p.toX,p.toY);preview.stroke();}
    else circle(preview,p.x,p.y,p.radius,'#ffe482',false);
  }
  preview.restore();preview.fillStyle='#fff';preview.font='16px system-ui';preview.fillText(hits+' impacts',380,28);
  // Permanent schematic of the modifier, including before a projectile hits.
  preview.strokeStyle='#ffd286';preview.lineWidth=3;
  if(draft.mod==='echo'){
    circle(preview,396,77,9,'#ffd286',false);circle(preview,426,77,9,'#ffd286',false);
  }else if(draft.mod==='chain'){
    preview.beginPath();preview.moveTo(385,86);preview.lineTo(404,67);preview.lineTo(411,80);preview.lineTo(434,64);preview.stroke();
  }else{
    circle(preview,410,77,7,'#ffd286',false);circle(preview,410,77,18,'#ffd286',false);
  }
}
function step(dt){
  if(flying){
    const delta=Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle));
    angle+=Math.sign(delta)*Math.min(Math.abs(delta),4.5*dt);
    pos={x:pos.x+Math.cos(angle)*6*dt,y:pos.y+Math.sin(angle)*6*dt};
  } else {
    tick+=dt;if(tick<.19)return;
    tick-=.19;dir=turns.step(dir);pos={x:pos.x+dir.x,y:pos.y+dir.y};
  }
  pos.x=(pos.x+36)%36;pos.y=(pos.y+18)%18;
  trail.unshift({...pos,plane});trail.length=Math.min(trail.length,flying?55:6);
  if(pickup.plane===plane&&Math.hypot(pickup.x-pos.x,pickup.y-pos.y)<.8)collect();
}
function draw(now){
  board.fillStyle=plane?'#201b32':'#0b202b';board.fillRect(0,0,720,360);
  board.fillStyle='#41616e';for(let x=10;x<720;x+=20)for(let y=10;y<360;y+=20)board.fillRect(x,y,1.5,1.5);
  circle(board,10+20*pickup.x,10+20*pickup.y,8,'#ffba77',pickup.plane===plane);
  for(const b of bots)if(b.hp>0 && b.plane===plane){
    board.fillStyle='#ff8b86';board.fillRect(5+20*b.x,5+20*b.y,10,10);
  }
  board.lineWidth=2;
  for(const p of [...arena.forge.projectiles,...arena.forge.orbits])if(p.plane===plane)
    circle(board,10+p.x*20,10+p.y*20,p.kind==='well'?p.radius*20:4,'#c0a8ff',p.kind!=='well');
  for(const p of arena.forge.effects)if(p.plane===plane){
    if(p.kind==='chain'){board.strokeStyle='#ffe37c';board.beginPath();board.moveTo(10+p.x*20,10+p.y*20);board.lineTo(10+p.toX*20,10+p.toY*20);board.stroke();}
    else circle(board,10+p.x*20,10+p.y*20,p.radius*20,'#ffe37c',false);
  }
  for(const p of trail)circle(board,10+20*p.x,10+20*p.y,5,p.plane===plane?'#4bc3a0':'#587180');
  circle(board,10+20*pos.x,10+20*pos.y,9,'#c1ffe6');
  if(now-novaAt<420)circle(board,10+20*pos.x,10+20*pos.y,reduce.matches?80:4+(now-novaAt)*.18,'#ffd38a',false);
}
function frame(now){
  const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;
  if(!workshop){
    step(dt);arena.snake[0]=pos;arena.direction=flying?{x:Math.cos(angle),y:Math.sin(angle)}:dir;
    for(const b of bots)if(b.hp<=0 && (b.respawn-=dt)<=0)b.hp=4;
    SnakeForge.update(arena,dt,arenaHooks);draw(now);
  }
  else if(!reduce.matches){if(time>3.8)restart();advancePreview(dt);drawPreview();}
  requestAnimationFrame(frame);
}
instructions();status();requestAnimationFrame(frame);
