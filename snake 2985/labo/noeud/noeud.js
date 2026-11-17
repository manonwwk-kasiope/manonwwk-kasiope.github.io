(() => {
  'use strict';
  const minArea=4, price=.28;
  const same=(a,b)=>a.x===b.x && a.y===b.y;
  const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const layer=p=>p.plane??0;
  const copy=p=>({x:p.x,y:p.y});
  const key=p=>p.x+','+p.y;
  const grid=p=>Number.isInteger(p.x)&&Number.isInteger(p.y);
  function area(points) {
    return Math.abs(points.reduce((a,p,i)=>{
      const q=points[(i+1)%points.length]; return a+p.x*q.y-q.x*p.y;
    },0))/2;
  }
  function contains(points,p) {
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i];
      if((b.x-a.x)*(p.y-a.y)===(b.y-a.y)*(p.x-a.x) && p.x>=Math.min(a.x,b.x) && p.x<=Math.max(a.x,b.x) && p.y>=Math.min(a.y,b.y) && p.y<=Math.max(a.y,b.y)) return false;
      if((a.y>p.y)!==(b.y>p.y) && p.x<a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y)) inside=!inside;
    }
    return inside;
  }
  function simple(points) {
    return points.length>=8 && points.every((p,i)=>grid(p)&&dist(p,points[(i+1)%points.length])===1)
      && new Set(points.map(key)).size===points.length && area(points)>=minArea;
  }
  function state(s,mode) {
    return s.knot ||= {mode,preview:null,pending:null,last:null,cooldown:0,closures:0,impacts:0,recent:[]};
  }
  function safeTile(s,p,to) {
    return p.x>=0 && p.y>=0 && p.x<s.width && p.y<s.height
      && !s.snake.slice(1).some(q=>same(q,p)&&layer(q)===to);
  }
  function preview(s,mode) {
    const k=state(s,mode);
    if(s.flight||s.status!=='playing'||k.cooldown>0||s.novaCharge<price||s.planeCooldown>0) return null;
    const head=s.snake[0],dir=s.turns[0]||s.direction,from=s.plane,to=1-from;
    if(!grid(head)||!safeTile(s,head,to)) return null;
    if(s.shiftMode==='portal' && !s.planeGates.some(p=>dist(p,head)<=1)) return null;
    const lethal=p=>s.drones.some(d=>layer(d)===to&&d.warmup<=0&&same(d,p))
      || (s.boss&&layer(s.boss)===to&&Math.abs(s.boss.x-p.x)<=1&&Math.abs(s.boss.y-p.y)<=1)
      || (s.boss?.attack?.phase==='active'&&s.boss.attack.plane===to&&s.boss.attack.danger.has(p.y*s.width+p.x));
    if(lethal(head))return null;
    const ahead=[];
    for(let n=1;n<=2;n++){
      const crossing={x:head.x+dir.x*n,y:head.y+dir.y*n};
      if(!safeTile(s,crossing,to)||lethal(crossing)) break;
      ahead.push(crossing);
      for(let i=5;i<s.snake.length-n;i++){
        const anchor=s.snake[i];
        const exact=same(crossing,anchor)&&layer(anchor)===from;
        const assisted=mode==='assist'&&dist(crossing,anchor)===1&&layer(anchor)===to;
        if(!exact&&!assisted) continue;
        const segment=s.snake.slice(0,i+1);
        if(segment.slice(0,-1).some(p=>layer(p)!==from)) continue;
        const points=segment.map(copy).reverse().concat(ahead.slice(0,exact?-1:undefined).map(copy));
        if(!simple(points))continue;
        const signature=from+'|'+points.map(key).sort().join(';');
        if(k.recent.includes(signature))continue;
        return {points,signature,crossing:copy(crossing),plane:from,mode:exact?'exact':'assist',area:area(points),start:copy(head),dir:copy(dir),steps:n};
      }
      if(s.snake.slice(1).some(p=>same(p,crossing)&&layer(p)===from))break;
    }
    return null;
  }
  function discharge(s,p,h) {
    const k=s.knot;k.closures++;k.cooldown=5;k.last={...p,life:.75};s.novaCharge-=price;
    k.recent.push(p.signature);if(k.recent.length>8)k.recent.shift();
    const targets=h.targets().filter(t=>h.visible({...p.crossing,plane:p.plane},t)&&contains(p.points,t)&&!(t===s.boss&&!t.weak));
    for(const target of targets.slice(0,3)) {
      if(s.status!=='playing')break;
      h.damage(target,1);k.impacts++;
    }
    h.emit('knotClosed',{x:p.crossing.x,y:p.crossing.y,plane:p.plane,area:p.area,mode:p.mode});
  }
  function update(s,dt,h,mode) {
    const k=state(s,mode);k.cooldown=Math.max(0,k.cooldown-dt);
    if(k.last && (k.last.life-=dt)<=0)k.last=null;
    let p=k.pending;
    if(p) {
      const head=s.snake[0];
      const n=(head.x-p.start.x)*p.dir.x+(head.y-p.start.y)*p.dir.y;
      p.time-=dt;
      if(s.flight||s.status!=='playing'||p.time<=0||s.plane===p.plane||n<0||n>p.steps||
        head.x!==p.start.x+n*p.dir.x||head.y!==p.start.y+n*p.dir.y||s.novaCharge<price)k.pending=null;
      else if(same(head,p.crossing)){k.pending=null;discharge(s,p,h);}
    }
    k.preview=k.pending?null:preview(s,k.mode);
  }
  function install(engine,forge,opts={}) {
    const mode=opts.mode==='assist'?'assist':'exact';
    return {
      engine:{...engine,shiftPlane(s){
        const k=state(s,mode), proposal=preview(s,k.mode);
        if(!engine.shiftPlane(s))return false;
        if(proposal && !s.flight && s.status==='playing'){
          k.pending={...proposal,time:Math.max(.8,s.stepTime*3)};k.preview=null;
        }
        return true;
      }},
      forge:{...forge,update(s,dt,h){forge?.update?.(s,dt,h);update(s,dt,h,mode);}},
    };
  }
  function draw(ctx,s,project) {
    const k=s.knot, p=k?.last||k?.pending||k?.preview;
    if(!p||s.status!=='playing')return;
    ctx.save();ctx.lineWidth=k.last?4:2;ctx.strokeStyle=k.last?'#fffbd1':k.pending?'#79ffe3':'#fbcf72';
    if(!k.last)ctx.setLineDash([5,4]);
    ctx.beginPath();
    for(const [i,tile] of p.points.entries()){
      const q=project(tile,p.plane);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
    }
    ctx.closePath();ctx.stroke();const q=project(p.crossing,p.plane);ctx.setLineDash([]);ctx.beginPath();ctx.arc(q.x,q.y,6,0,2*Math.PI);ctx.stroke();ctx.restore();
  }
  const api={preview,contains,simple,area,install,draw,price};
  if(typeof window!=='undefined')window.SnakeKnot=api;
  if(typeof module!=='undefined')module.exports=api;
})();
