(() => {
  'use strict';
  const profiles={
    1976:{signature:'comb',name:'Peigne binaire',duration:.72},
    1985:{signature:'ricochet',name:'Carreau à ricochets',duration:.96},
    1995:{signature:'train',name:'Train de la trace',duration:2.05},
    2185:{signature:'moons',name:'Pince des deux lunes',duration:.94},
    2985:{signature:'echo',name:'Échos des deux plans',duration:1.1},
  };
  const states=new WeakMap(), clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const pt=p=>({x:p.x,y:p.y,plane:p.plane??0});
  function state(s){
    let v=states.get(s);
    if(!v){v={spent:0,active:null,trail:[]};states.set(s,v);}
    return v;
  }
  function track(s,v){
    const p=pt(s.snake[0]),last=v.trail[0];
    if(!last||last.plane!==p.plane||Math.hypot(last.x-p.x,last.y-p.y)>=.75){
      v.trail.unshift(p);if(v.trail.length>36)v.trail.pop();
    }
  }
  function read(s){
    const v=state(s),cells=clamp((s.eaten||0)-v.spent,0,2),a=v.active;
    return {cells,ready:s.status==='playing'&&cells>=2&&s.novaCharge>=1,name:profiles[s.year]?.name,
      active:a?{signature:a.signature,year:a.year,start:a.start,age:a.age,duration:a.duration,plane:a.plane,x:a.x,y:a.y}:null};
  }
  function ray(p,dx,dy,width,height,maxLength){
    const tX=dx>0?(width-1-p.x)/dx:dx<0?-p.x/dx:Infinity;
    const tY=dy>0?(height-1-p.y)/dy:dy<0?-p.y/dy:Infinity;
    const n=Math.max(0,Math.min(tX,tY,maxLength));
    return {x:p.x+dx*n,y:p.y+dy*n,n,flipX:tX<=n+1e-7,flipY:tY<=n+1e-7};
  }
  function segment(p,q,width,stage,a){
    return {kind:'segment',ax:p.x,ay:p.y,bx:q.x,by:q.y,width,stage,signature:a.signature,plane:p.plane??a.plane};
  }
  function ring(x,y,r,width,stage,plane,a){return {kind:'ring',x,y,r,width,stage,plane,signature:a.signature};}
  function begin(s,v){
    const p=pt(s.snake[0]),dir=s.direction,mag=Math.hypot(dir.x,dir.y)||1;
    const a={...profiles[s.year],...p,year:s.year,start:s.elapsed,age:0,dx:dir.x/mag,dy:dir.y/mag,
      w:s.width,h:s.height,track:[],paths:[],seen:new Set(),hits:0};
    const {dx,dy}=a;
    if(a.signature==='comb'){
      for(const [i,offset] of [0,-2,2].entries()){
        const origin={x:p.x-dy*offset,y:p.y+dx*offset,plane:p.plane};
        if(origin.x<0||origin.x>s.width-1||origin.y<0||origin.y>s.height-1)continue;
        a.paths.push(segment(origin,ray(origin,dx,dy,s.width,s.height,16),.9,i,a));
      }
    }else if(a.signature==='ricochet'){
      // La première paroi renvoie le carreau. La distance totale et les rebonds sont bornés.
      let vx=dx*.835-dy*.55,vy=dy*.835+dx*.55,from=p,remaining=28;
      const norm=Math.hypot(vx,vy);vx/=norm;vy/=norm;
      for(let i=0;i<8&&a.paths.length<4&&remaining>.001;i++){
        const q=ray(from,vx,vy,s.width,s.height,remaining);
        if(q.n>.001){a.paths.push(segment(from,q,1.1,a.paths.length,a));remaining-=q.n;}
        if(!q.flipX&&!q.flipY)break;
        if(q.flipX)vx=-vx;if(q.flipY)vy=-vy;from=q;
      }
    }else if(a.signature==='train'){
      // Les coordonnées du corps sont les plus récentes, l'historique prolonge la voie derrière la queue.
      const live=s.snake.map(pt);let rest=[];
      const tail=live.at(-1),pos=v.trail.findIndex(q=>q.plane===tail.plane&&Math.hypot(q.x-tail.x,q.y-tail.y)<.6);
      if(pos>=0)rest=v.trail.slice(pos+1);
      for(const q of [...live,...rest].slice(0,32)){
        const last=a.track.at(-1);
        if(last&&Math.hypot(q.x-last.x,q.y-last.y)>1.75)break;
        if(!last||q.plane!==last.plane||Math.hypot(q.x-last.x,q.y-last.y)>.03)a.track.push(q);
      }
      a.track.reverse();
      for(let i=1;i<a.track.length;i++){
        if(a.track[i-1].plane===a.track[i].plane)a.paths.push(segment(a.track[i-1],a.track[i],2.2,i-1,a));
      }
      a.initial=a.paths.length;a.front=pt(p);
    }else if(a.signature==='moons'){
      const q=ray(p,dx,dy,s.width,s.height,6);
      a.cx=q.x;a.cy=q.y;
    }
    v.active=a;
    const d={type:'novaOverload',year:a.year,signature:a.signature,x:p.x,y:p.y,plane:p.plane};
    if(s.events.length>=96)s.events.shift();s.events.push(d);
  }
  function geometry(s){
    const a=states.get(s)?.active;if(!a)return [];
    const u=clamp(a.age/a.duration,0,1);
    if(a.signature==='comb'){
      return a.paths.filter(p=>u>=p.stage*.18 && u<p.stage*.18+.61);
    }
    if(a.signature==='ricochet'){
      const i=Math.min(a.paths.length-1,Math.floor(u*a.paths.length));
      return i>=0?[a.paths[i]]:[];
    }
    if(a.signature==='train'){
      const i=u<.32?Math.min(a.initial-1,Math.floor(u/.32*a.initial)):a.paths.length-1;
      return i<0?[]:a.paths.slice(Math.max(0,i-2),i+1);
    }
    if(a.signature==='moons'){
      const shift=5*(1-u);
      return [-1,1].map((sign,i)=>ring(
        clamp(a.cx-a.dy*sign*shift,0,a.w-1),clamp(a.cy+a.dx*sign*shift,0,a.h-1),1.7,1.1,i,a.plane,a));
    }
    const second=u>=.5,phase=second?(u-.5)*2:u*2;
    return [ring(a.x,a.y,.45+9.55*phase,1.25,second?1:0,second?1-a.plane:a.plane,a)];
  }
  function touches(p,t){
    const radius=p.width/2;
    if(p.kind==='ring')return Math.abs(Math.hypot(t.x-p.x,t.y-p.y)-p.r)<=radius;
    const dx=p.bx-p.ax,dy=p.by-p.ay,length=dx*dx+dy*dy;
    const k=length?clamp(((t.x-p.ax)*dx+(t.y-p.ay)*dy)/length,0,1):0;
    return Math.hypot(t.x-(p.ax+k*dx),t.y-(p.ay+k*dy))<=radius;
  }
  function update(s,dt,h){
    const v=state(s);track(s,v);const a=v.active;if(!a)return;
    if(s.status!=='playing'||a.year!==s.year){v.active=null;return;}
    a.age+=dt;if(a.age>a.duration){v.active=null;return;}
    if(a.signature==='train'){
      // La locomotive remonte le sillage puis emprunte les nouvelles cases réellement traversées.
      const head=pt(s.snake[0]),gap=Math.hypot(head.x-a.front.x,head.y-a.front.y);
      if(gap>=.75||head.plane!==a.front.plane){
        if(gap<=1.75&&head.plane===a.front.plane&&a.paths.length<48)
          a.paths.push(segment(a.front,head,2.2,a.paths.length,a));
        a.front=head;
      }
    }
    if(a.hits>=3)return;
    for(const path of geometry(s)){
      const from={plane:path.plane,x:path.x??path.ax,y:path.y??path.ay};
      for(const t of h.targets()){
        if(a.seen.has(t)||t===s.boss&&!t.weak||!h.visible(from,t)||!touches(path,t))continue;
        a.seen.add(t);a.hits++;h.damage(t,1);
        h.emit('novaOverloadHit',{year:a.year,signature:a.signature,x:t.x,y:t.y,plane:path.plane});
        if(a.hits===3||s.status!=='playing')return;
      }
    }
  }
  function install(engine,forge){
    return {
      engine:{...engine,fire(s){
        const v=state(s),eligible=read(s).ready&&!!profiles[s.year];
        if(!engine.fire(s))return false;
        v.spent=s.eaten||0;v.active=null;
        if(eligible&&s.status==='playing')begin(s,v);
        return true;
      }},
      forge:{...forge,update(s,dt,h){forge.update(s,dt,h);update(s,dt,h);}},
    };
  }
  const api={read,geometry,install,touches};
  if(typeof window!=='undefined')window.SnakeSurcharges=api;
  if(typeof module!=='undefined')module.exports=api;
})();
