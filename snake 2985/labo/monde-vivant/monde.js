/* Instruments diégétiques ; coordonnées de l'horizon logique 960 × 440. */
(() => {
  'use strict';
  const states=new WeakMap();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=(v,n)=>(v%n+n)%n;
  function observe(s,event){
    let m=states.get(s);
    if(!m||m.year!==s.year){m={year:s.year,caps:[],installed:0,ringAt:-Infinity,lastNova:-Infinity,novaRadius:0};states.set(s,m);}
    if(s.year===1976){
      const d=s.direction;
      if(d&&(d.x||d.y)){
        const cap=Math.abs(d.x)>=Math.abs(d.y)?(d.x>0?1:3):(d.y<0?0:2);
        if(m.caps.at(-1)!==cap){m.caps.push(cap);if(m.caps.length>12)m.caps.shift();}
      }
    }
    if(s.year===2185&&event?.type==='flightRing'){
      m.installed++;m.ringAt=s.elapsed;
    }
    if(s.year===2985&&event?.type==='nova'){
      m.lastNova=s.elapsed;m.novaRadius=clamp(event.radius||4,1,16);
    }
  }
  function line(c,pts,ink,w){
    c.beginPath();for(let i=0;i<pts.length;i++){const [x,y]=pts[i];if(i)c.lineTo(x,y);else c.moveTo(x,y);}
    c.strokeStyle=ink;c.lineWidth=w;c.stroke();
  }
  function rect(c,x,y,w,h,ink){c.fillStyle=ink;c.fillRect(x,y,w,h);}
  function scope(c,m){
    if(!m.caps.length)return;
    // Mémoire de directions commises. Quatre paliers fixes sur la seconde voie du tube.
    const row=i=>92+i*5,step=18,start=650-m.caps.length*step;
    const pts=[[start,row(m.caps[0])]];
    for(const [i,d] of m.caps.entries()){
      const x=start+i*step;
      pts.push([x,row(d)],[x+step,row(d)]);
    }
    line(c,pts,'#70946b',2.5);rect(c,648,row(m.caps.at(-1))-1,4,3,'#dcf1ab');
  }
  function convoy(c,s,cam,t){
    const d=s.director;if(!d)return;
    const links=clamp(d.chain||0,0,3),working=d.phase==='active'||d.phase==='warning';
    if(!links&&!working)return;
    const x=wrap(278+t*(8+clamp(cam.nearBoss||0,0,1)*2),1495)-130;
    // La tête du porteur reçoit les mêmes bandes que le relais fixe au mât.
    function bars(x,y,scale){
      rect(c,x-2,y-2,(links*5+6)*scale,5*scale,'#28364b');
      for(let i=0;i<links;i++)rect(c,x+i*5*scale,y,3*scale,2*scale,'#96d9c6');
      if(working)rect(c,x+links*5*scale,y,2*scale,2*scale,'#e9a491');
    }
    bars(21,67,1.5);line(c,[[19,67],[19,83],[15,88]],'#507b89',1.7);
    if(x>0&&x<928&&141+x*.0145-65<87)bars(x+12,141+x*.0145-65,1);
  }
  function switchboard(c,s){
    const o=s.director?.offer;if(o?.kind!=='aiguillage'||o.anchors?.length<6)return;
    const [at,branch,,,start,end]=o.anchors;
    const dx=start.x-end.x,dy=start.y-end.y,len=dx*dx+dy*dy;if(!len)return;
    const side=Math.sign(dx*(branch.y-at.y)-dy*(branch.x-at.x))||1;
    const y=85,targetY=y+side*4;
    rect(c,629,79,57,15,'#303443');
    line(c,[[633,y],[678,y]],'#777b84',1.4);
    line(c,[[643,y],[650,targetY],[678,targetY]],o.step>=1?'#fed191':'#bba791',1.8);
    rect(c,675,targetY-1,4,3,o.step>=2?'#a7dfc3':'#c7ae8b');
    if(o.train){
      const p=clamp(((o.train.x-start.x)*-dx+(o.train.y-start.y)*-dy)/len,0,1);
      rect(c,Math.round(676-40*p),y-1,5,3,'#99cbd5');
    }
  }
  function gantry(c,m,cam,t,age,reduce){
    if(!m.installed)return;
    const shift=reduce?0:Math.sin(t*.105)*3+(cam.look||0)*4+(cam.transition||0)*3,lift=reduce?0:1.7*Math.cos(t*.16);
    c.translate(shift,lift);
    // La potence du décor peint rejoint ici le bord intérieur de l'anneau.
    const count=1+(m.installed-1)%8,seat=i=>[544+i*6,74+i*2.4];
    const phase=reduce?1:clamp(age/.6,0,1);
    for(let i=0;i<count;i++){
      const [x,y]=seat(i),drop=i===count-1?(1-phase)*15:0;
      line(c,[[x,y-drop],[x+3,y+1.2-drop]],'#c3c6a3',3.4);
    }
    const [x,y]=seat(count-1);
    line(c,[[572,18],[x+2,30],[x+2,y-3-(1-phase)*15]],'#be9f6f',1.3);
    line(c,[[x,y-4-(1-phase)*15],[x+4,y-4-(1-phase)*15]],'#efd49a',2);
  }
  function accretion(c,s,m,cam,t,reduce){
    const hp=s.boss?.maxHp?clamp(s.boss.hp/s.boss.maxHp,0,1):0;
    const age=s.elapsed-m.lastNova;
    const energy=reduce?(age<1?1:0):clamp(1-age/1,0,1);
    if(!energy&&!hp)return;
    const shift=reduce?0:Math.sin(t*.105)*3+(cam.look||0)*4+(cam.transition||0)*3;
    const lift=reduce?0:1.7*Math.cos(t*.16);
    c.translate(602+shift,93+lift);c.rotate(-.15);
    const arc=(rx,ry,a,b,ink,w)=>{c.beginPath();c.ellipse(0,0,rx,ry,0,a,b);c.strokeStyle=ink;c.lineWidth=w;c.stroke();};
    if(hp)arc(116-16*hp,12,2.65,3.1+hp*.38,'#d29a85',1.7);
    if(energy){
      const r=92+m.novaRadius+energy*16;
      arc(r,13,5.23,6.82,'#f6bd85',1+energy*1.5);
      arc(r+9,15.3,5.53,6.47,'#c58ea2',1.2);
    }
  }
  function draw(c,s,cam,t=0,reduced=false){
    const m=states.get(s);if(!m||m.year!==s.year)return;
    c.save();c.beginPath();c.rect(0,0,960,112);c.clip();
    switch(s.year){
      case 1976:scope(c,m);break;
      case 1985:convoy(c,s,cam,reduced?0:t);break;
      case 1995:switchboard(c,s);break;
      case 2185:gantry(c,m,cam,t,s.elapsed-m.ringAt,reduced);break;
      case 2985:accretion(c,s,m,cam,t,reduced);break;
    }
    c.restore();
  }
  window.SnakeMondeVivant=Object.freeze({observe,draw});
})();
