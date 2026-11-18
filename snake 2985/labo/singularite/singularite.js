(() => {
  'use strict';
  const sessions=new WeakMap();
  const within=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<=.51;
  const emit=(s,type,data={})=>{
    if(s.events.length>=96)s.events.shift();s.events.push({type,...data});
  };
  function session(s){
    const b=s.boss;
    if(!b||s.year!==2985||b.kind!=='final')return null;
    const old=sessions.get(s);
    if(old?.boss===b)return old;
    const restored=b.singularityAct;
    if(!restored||!['pending','split','open'].includes(restored.phase)||!Array.isArray(restored.points))return null;
    Object.defineProperty(restored,'boss',{value:b,configurable:true});
    sessions.set(s,restored);return restored;
  }
  function split(s,b){
    const v={phase:'pending',points:[],index:0,route:null,elapsed:0,cue:'',placed:false,waited:false};
    Object.defineProperty(v,'boss',{value:b,configurable:true});b.singularityAct=v;
    sessions.set(s,v);return v;
  }
  function damage(s,b,amount){
    if(s.year!==2985||b?.kind!=='final'||b!==s.boss||s.status!=='playing'||!(amount>0))return amount;
    const v=session(s);
    if(v?.boss===b){
      // Une vraie ouverture au sein du sous-pas (surf ou faille) porte déjà ses dégâts.
      if(v.phase==='split'&&b.weak&&b.stun>0){
        unlock(s,v,s.riftUsed?'faille':'contre');return amount;
      }
      return v.phase==='open'?amount:0;
    }
    const half=Math.ceil(b.maxHp/2);
    if(b.hp-amount>half)return amount;
    split(s,b);
    return Math.max(0,b.hp-half);
  }
  const dir4=[[1,0],[0,1],[-1,0],[0,-1]];
  function safe(s,x,y,plane){
    if(x<1||y<1||x>=s.width-1||y>=s.height-1)return false;
    for(const p of [s.boss,s.boss?.next])if(p && (p.plane??s.boss.plane)===plane&&Math.abs(x-p.x)<=1&&Math.abs(y-p.y)<=1)return false;
    if(s.boss?.attack?.plane===plane&&s.boss.attack.danger.has(y*s.width+x))return false;
    const same=p=>p&&(p.plane??0)===plane&&p.x===x&&p.y===y;
    return ![s.rift,s.flightGate,...s.snake,...s.cells,...s.drones,...s.drones.map(d=>d.next)].some(same);
  }
  function place(s,v){
    if(s.flight)return;
    const head=s.snake[0],plane=s.plane,to=1-plane;
    const dirs=[...dir4].sort((a,b)=>(b[0]-a[0])*s.direction.x+(b[1]-a[1])*s.direction.y);
    // Un court chemin témoin garantit des cases libres sur les deux plans au placement.
    for(const d of dirs){
      if(s.direction.x*d[0]+s.direction.y*d[1]<-.1)continue;
      for(const end of [[-d[1],d[0]],[d[1],-d[0]],d]){
        const point=(i,j,z)=>({x:head.x+i*d[0]+j*end[0],y:head.y+i*d[1]+j*end[1],plane:z});
        const one=point(2,0,plane),two=point(2,2,to);
        const gate=s.shiftMode!=='portal'||s.planeGates?.some(p=>Math.abs(p.x-one.x)+Math.abs(p.y-one.y)<=1);
        if(!gate)continue;
        if([point(1,0,plane),one,point(2,0,to),point(2,1,to),two].every(p=>safe(s,p.x,p.y,p.plane))){
          v.points=[one,two];v.placed=true;return;
        }
      }
    }
  }
  function unlock(s,v,route){
    v.route=route;v.phase='open';v.cue=route==='balises'?'Salve désarmée · cœur ouvert':route==='espace'?'Passage libre · poursuis le combat':'Cœur ouvert · riposte';
    if(route==='balises'||route==='surf'){
      v.boss.attack=null;v.boss.weak=true;v.boss.stun=Math.max(v.boss.stun,2.45);
      v.boss.attackClock=Math.max(.45,v.boss.attackClock||0);
    }
    emit(s,'singularityOpen',{route,plane:v.boss.plane});
  }
  function sync(s){
    const v=session(s);
    if(!v)return;
    if(v.boss!==s.boss||s.status!=='playing'){sessions.delete(s);return;}
    const b=v.boss;
    if(v.phase==='pending'){
      v.phase='split';v.cue='Deux balises ou esquive les contours';
      place(s,v);
      if(!v.points.length)v.cue='Esquive les contours · puis vise le cœur';
      if(!b.attack&&!(b.stun>0)&&v.points.length){
        b.weak=false;b.attackClock=Math.min(.12,b.attackClock||.12);
      }
      emit(s,'singularitySplit',{plane:s.plane,beacons:v.points.map(p=>({...p}))});
      if(!v.points.length&&!b.attack&&!(b.stun>0)){unlock(s,v,'espace');return;}
    }
    if(v.phase!=='split')return;
    if(b.weak&&b.stun>0){unlock(s,v,s.riftUsed?'faille':'contre');return;}
    if(b.attack)v.waited=true;
    if(!v.waited&&!b.attack&&v.elapsed>1.45){unlock(s,v,'espace');return;}
    if(v.waited&&!b.attack&&b.weak){unlock(s,v,'esquive');return;}
    if(!v.placed&&!s.flight){
      const h=s.snake[0],at=h.x+','+h.y+','+s.plane;
      if(v.lastTry!==at){v.lastTry=at;place(s,v);}
    }
    const target=v.points[v.index];
    if(!target||s.flight||s.plane!==target.plane||!within(s.snake[0],target))return;
    v.index++;
    if(v.index===2){unlock(s,v,'balises');return;}
    v.cue='Bascule · rejoins la seconde balise';emit(s,'singularityBeacon',{index:1,plane:target.plane,...target});
  }
  function tick(s,dt,next){
    if(!Number.isFinite(dt)||dt<=0||s.status!=='playing')return;
    if(s.year!==2985||s.boss?.kind!=='final'){next(s,dt);return;}
    let left=dt;
    while(left>1e-9&&s.status==='playing'){
      const d=Math.min(1/60,left);sync(s);
      const b=s.boss,prior=b?.hp,diving=s.flight?.surf==='plongée';
      next(s,d);
      const surf=diving&&b===s.boss&&b&&b.hp<prior&&s.events.some(e=>e.type==='bossHit'&&e.weapon==='surf'&&e.hp===b.hp);
      if(surf&&b.kind==='final'&&b.hp<=Math.ceil(b.maxHp/2)&&!session(s))split(s,b);
      sync(s);
      if(surf&&session(s)?.phase==='split')unlock(s,session(s),'surf');
      const v=session(s);if(v)v.elapsed+=d;left-=d;
    }
  }
  function read(s){
    const v=session(s);
    if(!v||v.boss!==s.boss||s.status!=='playing'||v.phase==='pending')return null;
    return {phase:v.phase,route:v.route,index:v.index,elapsed:v.elapsed,cue:v.cue,
      points:v.phase==='split'?v.points.map((p,i)=>({...p,index:i+1,armed:i===v.index,done:i<v.index})):[]};
  }
  function draw(c,s,cam,z,t,reduced,project){
    const v=read(s);if(!v||v.phase!=='split')return;
    c.save();c.lineJoin='round';c.lineCap='round';
    function stroke(pts,col,w){c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
    for(const p of v.points){
      if(p.plane!==z||p.done)continue;
      const q=project(cam,p.x,p.y,z),r=7+(p.armed&&!reduced?Math.sin(t*4):0);
      const diamond=[{x:q.x,y:q.y-r},{x:q.x+r,y:q.y},{x:q.x,y:q.y+r},{x:q.x-r,y:q.y},{x:q.x,y:q.y-r}];
      stroke(diamond,'#172234',4.5);stroke(diamond,p.armed?'#fff1a4':'#80dbe4',2);
      for(let i=0;i<p.index;i++){
        const x=q.x+(i-(p.index-1)/2)*3;stroke([{x,y:q.y-2},{x,y:q.y+2}],'#fff8dc',1.6);
      }
    }
    if(s.boss.plane===z){
      const q=project(cam,s.boss.x,s.boss.y,z),r=16*(q.k||1)*cam.zoom;
      for(const d of [-1,1])stroke([{x:q.x+d*r*.52,y:q.y-r},{x:q.x+d*r,y:q.y-r*.5},{x:q.x+d*r*1.1,y:q.y}],d===1?'#86eced':'#ffe0a1',2.3);
    }
    c.restore();
  }
  const api={damage,tick,read,draw};
  if(typeof window!=='undefined')window.SnakeSingularite=api;
  if(typeof module!=='undefined')module.exports=api;
})();
