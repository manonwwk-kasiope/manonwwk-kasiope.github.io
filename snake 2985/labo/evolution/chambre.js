(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const engine=window.SnakeArcade, evo=window.SnakeEvolution;
  const forge=window.SnakeForge=evo.install(window.SnakeForge);
  const canvas=$('arena'), ctx=canvas.getContext('2d'), u=canvas.width/36;
  let s, active=false, previous=0, lastStatus='';
  function options(id,items) {
    for(const [key,value] of items) $(id).add(new Option(value,key));
  }
  options('era',engine.eras.map((e,i)=>[i,e.year+' · '+evo.eras.find(a=>a.year===e.year).bits+' bits']));
  options('core',forge.cores.map(c=>[c.id,c.name]));
  options('mod',forge.mods.map(m=>[m.id,m.name]));
  function toggle(on) { active=on; $('pause').textContent=on?'Pause':s.status==='dead'?'Rejouer':'Jouer'; }
  function reset() {
    const era=Number($('era').value),core=$('core').value,mod=$('mod').value;
    s=engine.create(()=>.43,era);
    forge.equip(s,core,mod); evo.attach(s);
    s.gunClock=1e8; s.spawnClock=1e8;
    s.cells=[]; s.drones=[];
    for(const [i,[x,y,plane]] of [[11,13,0],[14,11,0],[16,9,0],[14,9,1],[12,12,1]].entries()) {
      const p={x,y,plane};
      s.drones.push({...p,id:100+i,next:{...p},warmup:0,moveIn:4,moveEvery:1.6});
    }
    // Le premier relais est visible avant le départ ; la partie reste arrêtée.
    engine.tick(s,.001);
    const info=evo.describe(s.year,core,mod);
    $('help').textContent=info.name+' · '+info.gesture+' '+info.geometry+' '+info.route;
    toggle(false); paint();
  }
  function disk(p,color,r,outline=false) {
    ctx.strokeStyle=ctx.fillStyle=color;ctx.beginPath();
    ctx.arc((p.x+.5)*u,(p.y+.5)*u,r*u,0,2*Math.PI);
    if(outline)ctx.stroke();else ctx.fill();
  }
  function paint() {
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.lineWidth=1;
    ctx.strokeStyle='#173047';ctx.beginPath();
    for(let x=0;x<=36;x++){ctx.moveTo(x*u,0);ctx.lineTo(x*u,canvas.height);}
    for(let y=0;y<=18;y++){ctx.moveTo(0,y*u);ctx.lineTo(canvas.width,y*u);}
    ctx.stroke();ctx.lineWidth=2;
    for(const d of s.drones)disk(d,d.plane===s.plane?'#ff797c':'#ba798d',.34,d.plane!==s.plane);
    for(const p of [...s.snake].reverse()) disk(p,p.plane===s.plane?'#7ef9dc':'#609caf',.4,p.plane!==s.plane);
    disk(s.snake[0],'#f6ffff',.2);
    for(const p of [...s.forge.orbits,...s.forge.projectiles])disk(p,'#a2c5ff',p.kind==='well'?1.1:.2,p.kind==='well'||p.plane!==s.plane);
    for(const p of [...s.forge.effects,...s.evolution.effects]) {
      if(p.kind==='switchRail') {
        ctx.strokeStyle='#fff4a4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo((p.fromX+.5)*u,(p.fromY+.5)*u);ctx.lineTo((p.x+.5)*u,(p.y+.5)*u);ctx.stroke();ctx.lineWidth=2;
      }
      disk(p,'#cf99ff',Math.max(.15,(1-p.life/p.maxLife)*p.radius),true);
    }
    for(const m of s.evolution.marks) {
      if(m.kind==='switch') {
        ctx.strokeStyle=m.entered?'#ffd460':'#9b8055';ctx.beginPath();ctx.moveTo((m.first.x+.5)*u,(m.first.y+.5)*u);ctx.lineTo((m.x+.5)*u,(m.y+.5)*u);ctx.stroke();
        ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
        for(const [p,label,active] of [[m.first,'1',!m.entered],[m,'2',m.entered]]) {
          disk(p,active?'#ffe786':'#8e8066',.49);ctx.fillStyle='#14171e';ctx.fillText(label,(p.x+.5)*u,(p.y+.5)*u);
        }
        continue;
      }
      disk(m,m.entered?'#fdffcb':'#ffd460',.8,true);
      const x=(m.x+.5)*u, y=(m.y+.5)*u;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(m.dy,m.dx));ctx.strokeStyle='#ffd460';
      ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.lineTo(2,-5);ctx.moveTo(8,0);ctx.lineTo(2,5);ctx.stroke();ctx.restore();
    }
    const message=(s.status==='dead'?'Collision · ':'')+'Plan '+(s.plane+1)+' · '+s.evolution.activations+' activation(s) · '+s.evolution.impulses+' impact(s) de signature · '+s.kills+' drone(s) détruit(s)';
    if(lastStatus!==message) { $('status').textContent=message;lastStatus=message; }
  }
  function command(dx,dy){ if(s.status!=='playing')return;engine.turn(s,dx,dy);toggle(true); }
  for(const b of document.querySelectorAll('[data-d]'))b.onclick=()=>command(...b.dataset.d.split(',').map(Number));
  function phase(){ if(engine.shiftPlane(s)) {toggle(true);paint();} }
  function pause(){if(s.status==='dead')reset();toggle(!active);}
  $('reset').onclick=reset;$('pause').onclick=pause;$('phase').onclick=phase;
  for(const id of ['core','mod','era'])$(id).onchange=reset;
  const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  addEventListener('keydown',e=>{
    if(e.target.tagName==='SELECT'||e.repeat)return;
    if(directions[e.key]){e.preventDefault();command(...directions[e.key]);}
    else if(e.code==='Space' && e.target.tagName!=='BUTTON'){e.preventDefault();phase();}
    else if(e.code==='KeyP')pause();
  });
  function frame(timestamp) {
    if(active && previous){engine.tick(s,Math.min(.05,(timestamp-previous)/1000));if(s.status!=='playing')toggle(false);paint();}
    previous=timestamp;requestAnimationFrame(frame);
  }
  reset();requestAnimationFrame(frame);
})();
