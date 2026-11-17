'use strict';
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const key=(x,y)=>y*36+x;
const dist=(x,y,p)=>Math.abs(x-p.x)+Math.abs(y-p.y);
const profiles={
  découverte:{latency:.42,horizon:3,err:.035,range:5,blind:true},
  habitué:{latency:.19,horizon:6,err:.012,range:10,blind:false},
  expert:{latency:0,horizon:Infinity,err:0,range:Infinity,blind:false}
};
function observe(s,profile){
  const h=s.snake[0],near=p=>dist(h.x,h.y,p)<=profile.range;
  const drones=s.drones.filter(d=>(!profile.blind||s.plane===d.plane)&&near(d)).map(d=>({...d,next:{...d.next}}));
  const b=s.boss,a=b?.attack;
  return {drones,elapsed:s.elapsed,boss:b?{x:b.x,y:b.y,plane:b.plane,weak:b.weak,next:{...b.next}}:null,
    attack:a&&(!profile.blind||a.plane===s.plane)?{plane:a.plane,phase:a.phase,expiry:s.elapsed+a.remaining,danger:a.danger}:null};
}
function blocked(s,view,plane){
  const walls=new Set(s.snake.slice(1,-1).filter(p=>p.plane===plane).map(p=>key(p.x,p.y)));
  for(const d of view.drones.filter(d=>d.plane===plane)){
    walls.add(key(d.x,d.y)); walls.add(key(d.next.x,d.next.y));
  }
  const boss=view.boss;
  if(boss?.plane===plane)for(const p of [boss,boss.next])for(let x=p.x-1;x<=p.x+1;x++)for(let y=p.y-1;y<=p.y+1;y++)walls.add(key(x,y));
  return walls;
}
function legal(s,d){return d[0]*s.direction.x+d[1]*s.direction.y>=0;}
function threatened(s,v,x,y,depth){
  const a=v.attack;
  return a?.plane===s.plane && a.danger.has(key(x,y)) && (a.phase==='active'||a.expiry-s.elapsed<=(depth+.8)*s.stepTime);
}
function input(d,shift,fire){return {d,shift:Boolean(shift),fire:Boolean(fire)};}
// The limited pilot follows local paths. Food beacons are public even beyond its hazard horizon.
function limited(s,v,p){
  const h=s.snake[0],walls=blocked(s,v,s.plane),food=s.cells.filter(c=>c.plane===s.plane);
  const boss=v.boss, a=v.attack,other=1-s.plane;
  const canDive=s.planeCooldown<=0 && !blocked(s,v,other).has(key(h.x,h.y));
  const shift=canDive && (a?.plane===s.plane && a.expiry-s.elapsed<.85 || boss?.weak && boss.plane!==s.plane);
  const fire=s.novaCharge===1 && (v.drones.some(d=>d.plane===s.plane&&dist(h.x,h.y,d)<=s.novaRadius-1)
    || boss?.weak&&boss.plane===s.plane&&dist(h.x,h.y,boss)<=s.novaRadius);
  const queue=[{x:h.x,y:h.y,n:0,d:null}],seen=new Set([key(h.x,h.y)]);
  let best=null,value=-Infinity;
  for(let i=0;i<queue.length;i++){
    const q=queue[i];
    if(q.n===p.horizon)continue;
    for(const d of dirs){
      if(!q.d&&!legal(s,d))continue;
      const x=q.x+d[0],y=q.y+d[1],id=key(x,y);
      if(x<0||y<0||x>=s.width||y>=s.height||walls.has(id)||seen.has(id)||threatened(s,v,x,y,q.n+1))continue;
      const n=q.n+1,first=q.d||d;
      const gap=boss?Math.abs(Math.max(Math.abs(x-boss.x),Math.abs(y-boss.y))-3):Math.min(...food.map(c=>dist(x,y,c)));
      const score=-gap-.19*n+.04*Math.min(x,y,s.width-1-x,s.height-1-y);
      if(score>value){best=first;value=score;}
      seen.add(id);queue.push({x,y,n,d:first});
    }
  }
  return input(best||[s.direction.x,s.direction.y],shift||(!best&&canDive),fire);
}
// Independent full-board breadth-first objective planner, always using current information.
function expert(s,v){
  const h=s.snake[0],b=v.boss,walls=blocked(s,v,s.plane),food=new Set(s.cells.filter(c=>c.plane===s.plane).map(c=>key(c.x,c.y)));
  const queue=[{x:h.x,y:h.y,n:0,d:null}],seen=new Set([key(h.x,h.y)]);
  let d0=null,value=-Infinity;
  for(let i=0;i<queue.length;i++){
    const q=queue[i];
    if(q.d){
      if(!b&&food.has(key(q.x,q.y))){d0=q.d;break;}
      const score=-q.n-(b?6*Math.abs(Math.max(Math.abs(q.x-b.x),Math.abs(q.y-b.y))-3):0);
      if(score>value){value=score;d0=q.d;}
    }
    if(b&&q.n>=8)continue;
    for(const d of dirs){
      if(!q.d&&!legal(s,d))continue;
      const x=q.x+d[0],y=q.y+d[1],id=key(x,y);
      if(x<0||y<0||x>=s.width||y>=s.height||seen.has(id)||walls.has(id)||threatened(s,v,x,y,q.n+1))continue;
      seen.add(id);queue.push({x,y,n:q.n+1,d:q.d||d});
    }
  }
  return input(d0||[s.direction.x,s.direction.y],!d0||v.attack?.plane===s.plane||b?.weak&&b.plane!==s.plane,
    b?dist(h.x,h.y,b)<s.novaRadius-1:v.drones.some(d=>d.plane===s.plane&&dist(h.x,h.y,d)<4));
}
module.exports={dirs,profiles,observe,limited,expert,threatened,legal,dist,key};
