(() => {
  'use strict';
  const routes=new WeakMap(), installed=new WeakSet();
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  const key=(s,p)=>Math.round(p.y)*s.width+Math.round(p.x);
  const hull=(p,b)=>Math.max(Math.abs(p.x-b.x),Math.abs(p.y-b.y));
  const inside=(s,p)=>p.x>=0&&p.y>=0&&p.x<=s.width-1&&p.y<=s.height-1;
  const point=(p,dx,dy,n=1)=>({x:p.x+dx*n,y:p.y+dy*n,plane:p.plane});
  function emit(s,type,more={}) {
    if(s.events.length>=96)s.events.shift();
    s.events.push({type,plane:s.plane,...more});
  }
  const eligible=s=>s.boss?.kind==='final' && ((s.year===1995 && s.boss.signature==='Convoi spectral')
    || (s.year===2985 && s.boss.signature==='Effondrement fractal'));
  function passable(s,p){
    if(!inside(s,p))return false;
    const b=s.boss;
    return !(b && b.plane===p.plane && [b,b.next].some(q=>q&&hull(p,q)<=1.4))
      && !s.drones.some(d=>d.plane===p.plane && (dist(p,d)<.75 || (d.next && dist(p,d.next)<.75)));
  }
  // Search reachable boarding squares. Every marked segment shares its side with real attack tiles.
  function route(s,a) {
    const h=s.snake[0], max=Math.min(6,Math.floor((a.remaining-.12)/s.stepTime));
    const queue=[{...h,steps:0}], seen=new Set([key(s,h)]);
    let best=null,cost=Infinity;
    for(let i=0;i<queue.length;i++){
      const p=queue[i];
      for(const [nx,ny] of dirs){
        if(!a.danger.has(key(s,point(p,nx,ny))) || a.danger.has(key(s,p)))continue;
        for(const sign of [-1,1]){
          const dx=-ny*sign,dy=nx*sign;
          const edge=[];
          for(let j=0;j<=8;j++){
            const q=point(p,dx,dy,j),neighbour=point(q,nx,ny);
            if(!inside(s,neighbour)||!a.danger.has(key(s,neighbour))||a.danger.has(key(s,q))||!passable(s,q))break;
            edge.push(q);
          }
          if(edge.length<4)continue;
          const launch=edge[Math.min(edge.length-1,Math.round(3.1*Math.max(.2,a.remaining-p.steps*s.stepTime)))];
          const approach=((s.boss.x-launch.x)*dx+(s.boss.y-launch.y)*dy)/Math.max(1,dist(launch,s.boss));
          const next=point(launch,dx,dy);
          const clearance=!inside(s,next)||a.danger.has(key(s,next))?5:0;
          const rank=1.3*p.steps+dist(launch,s.boss)*.18-.18*Math.min(edge.length,6)-2.3*approach+clearance;
          if(rank<cost){best={gate:point(p,0,0),edge,dx,dy};cost=rank;}
        }
      }
      if(p.steps>=max)continue;
      for(const [dx,dy] of dirs){
        if(!p.steps && dx*s.direction.x+dy*s.direction.y<0)continue;
        const q=point(p,dx,dy),k=key(s,q);
        if(seen.has(k)||!passable(s,q)||s.snake.slice(1).some(o=>o.plane===q.plane&&dist(o,q)<.8))continue;
        seen.add(k);queue.push({...q,steps:p.steps+1});
      }
    }
    return best;
  }
  function offer(s){
    if(s.status!=='playing'||s.flight||!eligible(s))return;
    const a=s.boss.attack;
    if(a?.phase!=='warning'||!Number.isFinite(a.remaining)||a.remaining<=0||a.plane!==s.plane||s.boss.plane!==s.plane||routes.get(s)?.attack===a)return;
    const front=route(s,a);
    routes.set(s,{attack:a,boss:s.boss,front,spent:false});
    if(front)emit(s,'surfGate',{...front.gate});
  }
  function read(s){
    const r=routes.get(s);
    if(s.status!=='playing'||!r || !r.front || s.boss!==r.boss)return null;
    const f=s.flight;
    if(f?.surf)return {phase:f.surf,gate:r.front.gate,edge:r.front.edge,plane:s.plane,
      pulse:windowOpen(s,f),target:{x:r.boss.x,y:r.boss.y,plane:r.boss.plane},remaining:f.remaining};
    if(f||r.spent||r.attack!==s.boss.attack||r.attack.phase!=='warning'||s.plane!==r.attack.plane)return null;
    return {phase:'porte',gate:r.front.gate,edge:r.front.edge,plane:r.attack.plane,
      accessible:dist(s.snake[0],r.front.gate)<.55,remaining:r.attack.remaining};
  }
  function windowOpen(s,f){
    const a=s.boss?.attack,r=routes.get(s);
    return f.surf==='crête' && a===r?.attack && f.along>=.8 && f.steered
      && a.phase==='active';
  }
  function action(s){
    const v=read(s);if(!v)return false;
    const r=routes.get(s);
    if(v.phase==='porte' && v.accessible && r.attack.remaining>.16){
      const angle=Math.atan2(r.front.dy,r.front.dx),total=4;
      s.flight={surf:'crête',angle,targetAngle:angle,remaining:total,total,passed:0,goal:1,rings:[],
        along:0,steered:false,trail:s.snake.map(p=>({...p}))};
      s.direction={x:r.front.dx,y:r.front.dy};s.turns.length=0;s.progress=1;
      r.spent=true;emit(s,'surfStart',{...r.front.gate});return true;
    }
    if(v.pulse){
      const f=s.flight;
      f.surf='plongée';f.remaining=2.2;f.total=2.2;
      // The rider launches tangentially and must turn toward the current hull.
      emit(s,'surfPulse');return true;
    }
    return false;
  }
  function land(s,reason,success=false){
    const f=s.flight;
    if(!f?.surf)return false;
    // The ordinary grid landing reserves two forward steps. An incomplete slalom cannot pay out.
    f.goal=1;f.passed=0;
    const landed=window.SnakeFlight.land(s,reason);
    if(s.events.at(-1)?.type==='flightEnd')s.events.pop();
    emit(s,'surfEnd',{success:success&&landed,reason});
    return landed;
  }
  function cancel(s){return s.status==='playing'&&land(s,'Abandon');}
  function trace(s,h){
    const f=s.flight,trail=f.trail;
    trail.unshift(h);
    let total=0,i=1;
    const body=[h],size=s.snake.length;
    for(;i<trail.length && body.length<size;i++){
      const a=trail[i-1],b=trail[i],d=dist(a,b);
      while(d>0 && body.length<=total+d+1e-8 && body.length<size){
        const k=clamp((body.length-total)/d,0,1);
        body.push({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,plane:k<1?a.plane:b.plane});
      }
      total+=d;
    }
    while(body.length<size)body.push({...trail.at(-1)});
    trail.length=i;s.previousSnake=s.snake;s.snake=body;s.progress=1;
  }
  function move(s,dt){
    const f=s.flight,r=routes.get(s),b=s.boss;
    if(!r||r.boss!==b||s.plane!==b.plane||b.stun>0){land(s,'Onde interrompue');return;}
    if(f.surf==='crête' && b.attack!==r.attack){land(s,'Front passé');return;}
    f.remaining-=dt;
    if(f.remaining<=0){land(s,'Fenêtre écoulée');return;}
    f.angle+=clamp(delta(f.angle,f.targetAngle)*(1-Math.exp(-16*dt)),-9*dt,9*dt);
    s.direction={x:Math.cos(f.angle),y:Math.sin(f.angle)};
    const speed=f.surf==='crête'?3.1:18;
    const p=point(s.snake[0],s.direction.x,s.direction.y,speed*dt);
    if(!inside(s,p)||s.drones.some(d=>d.warmup<=0&&d.plane===s.plane&&dist(d,p)<.7)){
      land(s,'Sortie du front');return;
    }
    const a=b.attack;
    if(a && a.plane===s.plane && (a.phase==='active'||a.remaining<=dt+.002) && a.danger.has(key(s,p))){
      land(s,'Salve traversée');return;
    }
    if(f.surf==='crête'){
      const {gate,edge,dx,dy}=r.front;
      f.along=(p.x-gate.x)*dx+(p.y-gate.y)*dy;
      const cross=Math.abs((p.y-gate.y)*dx-(p.x-gate.x)*dy);
      if(cross>.80||f.along<-.55||f.along>edge.length-.30){land(s,'Crête quittée');return;}
    }
    if(hull(p,b)<=1.35){
      if(f.surf!=='plongée'){land(s,'Coque');return;}
      const damage=Math.min(Math.max(0,b.hp-1),s.year===1995?9:12);
      if(land(s,damage?'Impact au cœur':'Bouclier résiduel',damage>0) && damage>0){
        b.hp-=damage;
        s.effects.push({kind:'bossHit',x:b.x,y:b.y,plane:b.plane,radius:1.2,life:.18,maxLife:.18});
        emit(s,'bossHit',{kind:b.kind,weapon:'surf',damage,hp:b.hp,heart:true,shield:false});
      }
      return;
    }
    trace(s,p);
  }
  // Project only unoccupied edge marks on the safe side. The native danger mask remains visible.
  function draw(canvas,s,reduced=false){
    const view=read(s),renderer=window.SnakeSpectacle;
    if(!view||!renderer||view.phase==='plongée')return;
    const c=canvas.getContext('2d');if(!c)return;
    const cam=renderer.camera(s,reduced?0:s.elapsed,reduced);
    const project=p=>renderer.project(cam,p.x,p.y,p.plane);
    c.save();c.setTransform(canvas.width/renderer.width,0,0,canvas.height/renderer.height,0,0);
    c.strokeStyle=view.pulse?'#ffe68a':'#95ffdb';c.lineWidth=1.7;
    const gate=project(view.gate);
    if(view.phase==='porte'){
      c.beginPath();c.ellipse(gate.x,gate.y,7,4.5,0,0,Math.PI*2);c.stroke();
    }
    const e=view.edge;
    for(let i=1;i<Math.min(6,e.length-1);i+=2){
      const p=project(e[i]),q=project(e[i+1]),d=Math.max(1,Math.hypot(q.x-p.x,q.y-p.y));
      const x=(q.x-p.x)/d,y=(q.y-p.y)/d;
      c.beginPath();c.moveTo(p.x-3*x-2*y,p.y-3*y+2*x);c.lineTo(p.x,p.y);
      c.lineTo(p.x-3*x+2*y,p.y-3*y-2*x);c.stroke();
    }
    c.restore();
  }
  function install(){
    const g=window.SnakeGardiens,fly=window.SnakeFlight;
    if(!g||!fly)return false;
    if(installed.has(g))return true;
    installed.add(g);
    const nativeTick=g.tick,nativeMove=fly.step,nativeAim=fly.aim,nativeLand=fly.land;
    fly.step=(s,dt)=>s.flight?.surf?move(s,dt):nativeMove(s,dt);
    fly.aim=(s,x,y)=>{
      const accepted=nativeAim(s,x,y);
      if(accepted&&s.flight?.surf)s.flight.steered=true;
      return accepted;
    };
    fly.land=(s,reason)=>{
      if(s.flight?.surf){s.flight.passed=0;s.flight.goal=1;}
      return nativeLand(s,reason);
    };
    g.tick=(s,dt)=>{
      if(!(dt>0)||!Number.isFinite(dt)||s.status!=='playing')return;
      while(dt>1e-9 && s.status==='playing'){
        const slice=Math.min(dt,1/60);
        nativeTick(s,slice);offer(s);dt-=slice;
      }
    };
    return true;
  }
  window.SnakeSurf=Object.freeze({install,read,action,cancel,draw});
})();
