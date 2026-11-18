(() => {
  'use strict';
  const years=[1976,1985,1995,2185,2985], memory=new WeakMap();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const level=y=>Math.max(0,years.indexOf(y));
  const zOf=(p,s)=>p.plane??s.plane??0;
  const unit=(x,y)=>{const m=Math.hypot(x,y);return m>1e-6?{x:x/m,y:y/m}:{x:0,y:0};};
  const angle=(p,q)=>Math.atan2(q.y-p.y,q.x-p.x);
  const blend=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
  function wavefronts(s) {
    const t=s.elapsed??0,n=s.eaten??0;
    let v=memory.get(s);
    if(!v || n<v.n || t<v.t){v={n,t,starts:[]};memory.set(s,v);}
    if(n>v.n)v.starts=[t,...v.starts].slice(0,3);
    v.n=n;v.t=t;
    const speed=Math.max(10,s.snake.length/2.2);
    return v.starts.map(start=>(t-start)*speed).filter(i=>i<=s.snake.length+2);
  }
  function transform(s,cam,points,t,reduced,projection,method='joint'){
    const body=s.snake;if(!body?.length)return [];
    const tech=level(s.year),fase=clamp(s.progress??1,0,1),fronts=wavefronts(s);
    const dir=s.flight?{x:Math.cos(s.flight.angle),y:Math.sin(s.flight.angle)}:s.direction;
    const angles=[1,3,6,0,0];
    return body.map((p,i)=>{
      const prev=s.previousSnake?.[i]||p,z=zOf(p,s),lead=body[i-1],tail=body[i+1];
      const forward=i&&lead?unit(lead.x-p.x,lead.y-p.y):dir;
      const incoming=tail?unit(p.x-tail.x,p.y-tail.y):forward;
      const base=projection(cam,p.x,p.y,z);
      const ahead=projection(cam,p.x+forward.x,p.y+forward.y,z);
      const back=projection(cam,p.x+incoming.x,p.y+incoming.y,z);
      const outgoing=angle(base,ahead),from=angle(base,back);
      let wx=p.x,wy=p.y,pitch=outgoing;
      if(method==='linear'){
        const k=s.flight||reduced?1:fase;
        wx=prev.x+(p.x-prev.x)*k;wy=prev.y+(p.y-prev.y)*k;
        const legacy=points?.[i]||projection(cam,wx,wy,z);
        if(i&&points?.[i-1])pitch=angle(legacy,points[i-1]);
        return {...legacy,plane:z,wx,wy,angle:pitch,scale:1,pulse:0};
      }
      // La tête garde le centre et la direction du moteur même au premier instant d’un virage.
      if(i&&!reduced){
        if(s.flight){
          const a=s.flight.angle||0;
          const amp=[0,.018,.028,.045,.058][tech]*Math.min(1,i/3);
          const sway=amp*Math.sin((t||0)*3.3-i*.72+a);
          wx-=forward.y*sway;wy+=forward.x*sway;
        }else if(method==='curve'){
          const dx=prev.x-p.x,dy=prev.y-p.y;
          const adjacent=Math.hypot(dx,dy)<=1.001 && zOf(prev,s)===z;
          const drag=adjacent?[0,.065,.09,.12,.14][tech]*(1-fase)**2:0;
          wx+=dx*drag;wy+=dy*drag;
          const corner=incoming.x*forward.y-incoming.y*forward.x;
          const bow=corner*Math.sin(fase*Math.PI)*[0,.02,.035,.045,.055][tech];
          wx-=forward.y*bow;wy+=forward.x*bow;
        }
        let hinge=fase*fase*(3-2*fase);
        if(angles[tech])hinge=Math.round(hinge*angles[tech])/angles[tech];
        const articulated=blend(from,outgoing,hinge);
        const error=Math.atan2(Math.sin(articulated-outgoing),Math.cos(articulated-outgoing));
        const limit=[0,.20,.32,.43,.49][tech];
        pitch=outgoing+clamp(error,-limit,limit);
      }
      const pulse=reduced?0:fronts.reduce((v,f)=>Math.max(v,Math.max(0,1-Math.abs(f-i)/1.45)),0);
      // À 2 bits le retour reste une seule pose de lumière, sans expansion.
      const scale=1+(i?1:0)*pulse*[0,.025,.045,.068,.085][tech];
      const q=wx===p.x&&wy===p.y?base:projection(cam,wx,wy,z);
      return {...q,plane:z,wx,wy,angle:pitch,scale,pulse};
    });
  }
  function overlay(c,s,cam,points,z,t,reduced,project,pass='all'){
    if(!points?.length)return;
    const tech=level(s.year);
    c.save();c.lineJoin='round';c.lineCap='round';
    const path=(pts,ink,w)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineWidth=w;c.strokeStyle=ink;c.stroke();};
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(pass!=='pulse'&&a.plane!==b.plane&&a.plane===z){
        const end=project(cam,a.wx,a.wy,b.plane),joint=[b,end,a];
        path(joint,'#19273b',6);path(joint,'#72cfd7',3);
        const dx=a.x-end.x,dy=a.y-end.y,mag=Math.hypot(dx,dy)||1;
        const count=tech<2?2:4;
        for(let j=1;j<=count;j++){
          const k=j/(count+1),x=end.x+k*dx,y=end.y+k*dy,ex=-dy/mag*2.8,ey=dx/mag*2.8;
          path([{x:x-ex,y:y-ey},{x:x+ex,y:y+ey}],'#f9eeaf',1.65);
        }
      }
      if(pass!=='links'&&!reduced&&b.plane===z&&b.pulse>.22){
        const dx=Math.cos(b.angle+Math.PI/2),dy=Math.sin(b.angle+Math.PI/2),r=3.7*(b.k||1)*cam.zoom;
        path([{x:b.x-r*dx,y:b.y-r*dy},{x:b.x+r*dx,y:b.y+r*dy}],tech<2?'#ebffc7':'#ffdc8c',1.3+b.pulse);
      }
    }
    c.restore();
  }
  // Le mouvement de présentation réutilise les poses ; il ne simule aucune collision.
  function displayPose(mode,t,reduced=false,index=0,year=2985){
    const tech=level(year),time=reduced?0:t;
    if(mode==='workshop'){
      // Le flux quitte la tête et rejoint successivement chaque pièce exposée.
      const cycle=(time%3.2)*5, pulse=reduced?0:Math.max(0,1-Math.abs(cycle-index));
      return {x:-index,y:0,angle:0,scale:1+.05*pulse,pulse};
    }
    // Défilé du menu autour d'un cartouche : chaque maillon reprend le chemin de la tête.
    let d=((time*2.2-index)%20+20)%20;
    if(tech<2)d=Math.floor(d*(tech+1))/(tech+1);
    if(d<7)return {x:d,y:0,angle:0,scale:1,pulse:0};
    if(d<10)return {x:7,y:d-7,angle:Math.PI/2,scale:1,pulse:0};
    if(d<17)return {x:17-d,y:3,angle:Math.PI,scale:1,pulse:0};
    return {x:0,y:20-d,angle:-Math.PI/2,scale:1,pulse:0};
  }
  const api={transform,overlay,displayPose};
  if(typeof window!=='undefined')window.SnakeLocomotion=api;
  if(typeof module!=='undefined')module.exports=api;
})();
