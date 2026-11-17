/* Deux surfaces transparentes en perspective centrale. Unités publiques en cases,
   point (0,0) au centre de la première case. L'espace de dessin mesure 960 × 440. */
(() => {
  'use strict';
  const W=960, H=440, TAU=2*Math.PI;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const mod=(x,n)=>(x%n+n)%n;
  const palettes={
    1976:['#111b2b','#34545b','#d7a176','#9ba57f','#e4dd95'],
    1985:['#151333','#593364','#ed8b83','#bd648b','#ffe8a6'],
    2185:['#111d39','#304c73','#d18b8f','#897aa7','#ffe5b4'],
    2985:['#151333','#503364','#ec8799','#aa72aa','#ffe5ab']
  };
  function camera(s,t=0,reduced=false){
    const shift=s.planeShift, part=shift?clamp(1-shift.remaining/shift.total):1;
    const level=shift?mix(shift.from,shift.to,part):s.plane||0;
    const transition=reduced?0:Math.sin(Math.PI*part)*(shift?(shift.to-shift.from):0);
    const flight=reduced?0:s.flight?clamp((s.flight.total-s.flight.remaining)*2.5):0;
    const look=reduced?0:clamp(((s.snake?.[0]?.x??17.5)-17.5)/18,-1,1);
    const yaw=reduced?-.044:-.06+.035*look+.11*transition+flight*.047*Math.cos(s.flight?.angle||0);
    const cam={yaw,tilt:reduced?.61:.61+.16*Math.abs(transition)+.13*flight,
      bank:reduced?0:.013+.034*transition+.022*flight*Math.sin(s.flight?.angle||0),
      level:reduced?.5:level,look,transition,zoom:1};
    const motion=window.SnakeImpact?.sample(s,t,reduced);
    if(motion){cam.bank+=motion.roll;cam.dx=motion.x;cam.dy=motion.y;cam.music=motion;}
    const limits=[0,1].flatMap(z=>[[-.5,-.5],[35.5,-.5],[35.5,17.5],[-.5,17.5]].map(([x,y])=>project(cam,x,y,z)));
    cam.zoom=Math.min(1,...limits.flatMap(p=>[466/Math.abs(p.x-480),p.y>254?174/(p.y-254):230/(254-p.y)]));
    return cam;
  }
  function project(cam,x,y,z=0){
    const X=(x-17.5)/18, D=(y-8.5)/9;
    const depth=1-.21*D+cam.yaw*X;
    const sx=(X*342+cam.yaw*D*92+z*8)/depth;
    const sy=(D*200*cam.tilt-z*23)/depth;
    return {x:W/2+(cam.dx||0)+cam.zoom*(sx-cam.bank*sy),y:254+(cam.dy||0)+cam.zoom*(sy+cam.bank*sx+cam.level*8),k:1/depth};
  }
  function tile(cam,x,y,z=0,r=.5){
    return [[-r,-r],[r,-r],[r,r],[-r,r]].map(([dx,dy])=>project(cam,x+dx,y+dy,z));
  }
  function shape(c,pts,fill,ink,w=1){
    c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
    if(fill){c.closePath();c.fillStyle=fill;c.fill();}
    if(ink){c.strokeStyle=ink;c.lineWidth=w;c.stroke();}
  }
  const xy=(pts)=>pts.map(([x,y])=>({x,y}));
  const path=(c,pts,f,s,w)=>shape(c,xy(pts),f,s,w);
  function oval(c,x,y,rx,ry,fill,ink,w=1){
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
    if(fill){c.fillStyle=fill;c.fill();}
    if(ink){c.strokeStyle=ink;c.lineWidth=w;c.stroke();}
  }
  function surface(w,h){
    const el=document.createElement('canvas');el.width=w;el.height=h;return el;
  }
  const caches=new Map();
  function scenery(year){
    if(caches.has(year))return caches.get(year);
    const colors=palettes[year]||palettes[1985];
    const sky=surface(W,H), c=sky.getContext('2d');
    const grad=c.createLinearGradient(0,0,0,350);
    [[0,colors[0]],[.24,colors[1]],[.46,colors[2]],[.62,colors[3]],[1,'#171c34']].forEach(([n,v])=>grad.addColorStop(n,v));
    c.fillStyle=grad;c.fillRect(0,0,W,H);
    const glow=c.createRadialGradient(634,76,7,634,76,178);
    glow.addColorStop(0,'#ffdba494');glow.addColorStop(1,'#ffdba400');
    c.fillStyle=glow;c.fillRect(430,0,420,260);
    c.save();c.beginPath();c.arc(634,72,57,0,TAU);c.clip();
    const disc=c.createLinearGradient(0,15,0,138);disc.addColorStop(0,colors[4]);disc.addColorStop(.55,'#ffc58d');disc.addColorStop(1,'#f0808a');
    c.fillStyle=disc;c.fillRect(570,12,120,57);
    for(let y=70;y<132;y+=7)c.fillRect(570,y,120,6-(y-70)*.063);
    c.restore();
    let seed=2985; const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
    const stars=Array.from({length:120},()=>[rand()*W,rand()*127,rand()]);
    const far=surface(W,180), f=far.getContext('2d'),city=surface(W,195),g=city.getContext('2d');
    for(let n=0;n<2;n++){
      const points=[[-3,180]];
      for(let x=0;x<=W;x+=8)points.push([x,119+n*13+Math.sin(x*TAU/W*3+n)*12+Math.sin(x*TAU/W*13)*3-rand()*8]);
      points.push([W,180]);path(f,points,n?'#715171':'#946577');
    }
    for(let x=0;x<W;x+=8){
      const w=6+rand()*12,h=9+rand()*50+(x%88<8?22:0),y=171-h;
      const tone=rand()>.6?'#3b3354':'#443750';
      g.fillStyle=tone;g.fillRect(x,y,w,h+24);g.fillRect(x+2,y-3,w-4,5);
      if(h>47){path(g,[[x+w*.5,y],[x+w*.5,y-8]],null,'#58425d',1);g.fillStyle='#ffc399';g.fillRect(x+w*.5,y-8,1,1);}
      for(let j=y+4;j<174;j+=4)for(let i=2;i<w-2;i+=4)if(rand()>.42){g.fillStyle=rand()>.5?'#b38c94':'#687b90';g.fillRect(x+i,j,2,.95);}
    }
    const art={sky,far,city,stars};caches.set(year,art);return art;
  }
  function periodic(c,img,offset,y){
    const x=-mod(offset,W);c.drawImage(img,x,y);c.drawImage(img,x+W,y);
  }
  function walker(c,x,y,scale,t){
    c.save();c.translate(x,y);c.scale(scale,scale);
    const armor='#28253e', edge='#a66c81';
    for(const [index,hip] of [[0,-19],[1,14],[2,-12],[3,23]]){
      const step=Math.sin(t*1.2+index*1.8), knee=hip+(index%2?10:-10)+step*5;
      const leg=[[hip,-36],[knee,-20+step*3],[knee-4+step*8,-2]];
      path(c,leg,null,'#30273e',index>1?5:3.6);
      path(c,leg.map(([a,b])=>[a-1,b]),null,'#855469',.85);
      path(c,[[leg[2][0]-4,0],[leg[2][0]+6,0]],null,armor,3);
      oval(c,knee,-20+step*3,3,3,armor,edge,.7);
    }
    path(c,[[-35,-46],[-24,-53],[-13,-54],[-10,-60],[2,-60],[9,-53],[25,-51],[33,-44],[27,-39],[10,-39],[3,-32],[-16,-32],[-21,-38],[-35,-40]],armor,edge,1);
    path(c,[[-26,-47],[-15,-50],[20,-48],[25,-45]],null,'#da899b',1.2);
    path(c,[[17,-48],[38,-52],[45,-50],[37,-46],[25,-43]],'#303048',edge,.8);
    path(c,[[-12,-53],[-10,-64],[-3,-67],[-3,-60]],armor,edge,1);
    c.fillStyle='#ffd4a7';c.fillRect(26,-49,6,1.5);
    c.restore();
  }
  function world(c,s,t,cam){
    const a=scenery(s.year||1985);c.drawImage(a.sky,0,0);
    for(const [x,y,k] of a.stars){
      c.fillStyle=k>.9?'#eee4d4':'#b9a8bb';c.fillRect(mod(x-t*.9,W),y,k>.9?2:.85,k>.9?1.3:.8);
    }
    periodic(c,a.far,t*1.8+cam.look*2,0);
    for(let i=0;i<12;i++){
      const x=mod(72+i*84+t*(3+i%3),W+50)-24,y=34+i*23%67;
      path(c,[[x-8,y],[x+4,y-2],[x+9,y],[x+2,y+2],[x-4,y+2]],'#44324c','#b48590',.55);
      path(c,[[x-9,y+1],[x-15,y+1]],null,'#ef9d9c88',.8);
    }
    for(let i=0;i<2;i++)walker(c,mod(226+i*570-t*3+cam.look*4,W+180)-60,153,i?1.02:1.63,t+i);
    periodic(c,a.city,t*6+cam.look*6,1);
    // Viaduc aérien à haubans, piles et trafic sur sa propre couche de profondeur.
    const offset=mod(t*10+cam.look*8,240);
    for(let x=-offset;x<W+240;x+=240){
      const y=141+.018*x;
      path(c,[[x-3,y+39],[x-2,y-31],[x+1,y-35],[x+4,y+42]],'#46384d','#a97781',.85);
      for(const spread of [18,34,51])for(const d of [-1,1])path(c,[[x,y-28],[x+d*spread,y+d*spread*.018]],null,'#926974',.85);
    }
    path(c,[[0,141],[W,158.3],[W,166],[0,149]],'#3d344c','#b78c8a',1);
    for(let i=0;i<11;i++){
      const x=mod(i*93+(i%2?-1:1)*t*(18+i%4*5),W+32)-16,y=139+x*.018+(i%2?5:0);
      path(c,[[x-6,y],[x-2,y-2],[x+6,y-2],[x+8,y]],null,i%2?'#ffd1a5':'#a7dddc',1.25);
    }
    const dark=c.createLinearGradient(0,160,0,H);dark.addColorStop(0,'#261d3990');dark.addColorStop(.64,'#11152a');dark.addColorStop(1,'#080e20');
    c.fillStyle=dark;c.fillRect(0,179,W,H-179);
    for(let i=0;i<15;i++){
      const d=mod(i+t*.45,15)/15,y=183+d*d*259;
      path(c,[[0,y],[W,y]],null,'#69446655',.7+d);
    }
    for(let n=-12;n<=12;n++)path(c,[[480+n*19,173],[480+n*143,H]],null,'#6b486050',.85);
  }
  const gridTexture=new Map();
  const deckColors=[['#131a30ed','#54749170','#88b5cc'],['#24304a31','#719eae50','#82cbc4']];
  function floorGrid(c,cam,z,selected,method){
    const P=(x,y)=>project(cam,x,y,z);
    const corners=[P(-.5,-.5),P(35.5,-.5),P(35.5,17.5),P(-.5,17.5)];
    const colors=deckColors[z];
    shape(c,corners,colors[0]);
    const step=selected?1:3;
    const ink=selected?colors[1]:z?'#7d9fba22':'#7889a639';
    if(method==='bands'){
      // Rendu témoin : véritable texture orthogonale projetée par parallélogrammes
      // affines. Les deux extrémités inférieures héritent du gradient de la bande.
      const key=z+':'+selected;
      if(!gridTexture.has(key)){
        const texture=surface(720,360),g=texture.getContext('2d');
        g.strokeStyle=ink;g.lineWidth=1.1;g.beginPath();
        for(let i=0;i<=36;i+=step){g.moveTo(i*20,0);g.lineTo(i*20,360);}
        for(let j=0;j<=18;j+=step){g.moveTo(0,j*20);g.lineTo(720,j*20);}
        g.stroke();gridTexture.set(key,texture);
      }
      const texture=gridTexture.get(key);
      for(let j=0;j<36;j++){
        const a=P(-.5,j*.5-.5),b=P(35.5,j*.5-.5),d=P(-.5,j*.5);
        c.save();c.transform((b.x-a.x)/720,(b.y-a.y)/720,(d.x-a.x)/10,(d.y-a.y)/10,a.x,a.y);
        c.drawImage(texture,0,j*10,720,10,0,0,720,10);c.restore();
      }
    }else{
      c.beginPath();
      for(let x=-.5;x<=35.5;x+=step){const a=P(x,-.5),b=P(x,17.5);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}
      for(let y=-.5;y<=17.5;y+=step){const a=P(-.5,y),b=P(35.5,y);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}
      c.lineWidth=selected?.88:.67;c.strokeStyle=ink;c.stroke();
    }
    shape(c,[...corners,corners[0]],null,selected?colors[2]:'#7693ae66',selected?1.7:.95);
    // Blocs de rive, éclairage axial et entretoises rendent l'altitude explicite.
    for(let i=0;i<36;i+=3){
      const a=P(i,17.5),b=P(i+.8,17.5);
      shape(c,[a,b,{x:b.x-1,y:b.y+3},{x:a.x-1,y:a.y+3}],z?'#66abae':'#617e98');
    }
  }
  function ring(c,cam,p,z,r,col,width){
    const line=Array.from({length:33},(_,i)=>project(cam,p.x+Math.cos(i*TAU/32)*r,p.y+Math.sin(i*TAU/32)*r,z));
    shape(c,line,null,col,width);
  }
  function symbol(c,cam,p,z,draw){
    const a=project(cam,p.x,p.y,z);
    c.save();c.translate(a.x,a.y);c.scale(cam.zoom*a.k,cam.zoom*a.k);draw();c.restore();
  }
  function mask(c,cam,attack,z){
    const active=attack.phase==='active';
    const tiles=attack.tiles||[];
    c.beginPath();
    for(const p of tiles){
      if((p.plane??attack.plane??0)!==z)continue;
      const q=tile(cam,p.x,p.y,z);
      c.moveTo(q[0].x,q[0].y);for(let i=1;i<4;i++)c.lineTo(q[i].x,q[i].y);c.closePath();
    }
    c.fillStyle=active?'#ff4f7478':'#ee754957';c.fill();
    c.strokeStyle=active?'#ffd3a0':'#ffa488';c.lineWidth=.9;c.stroke();
    c.beginPath();
    for(const p of tiles){
      if((p.plane??attack.plane??0)!==z)continue;
      const a=project(cam,p.x-.3,p.y+.28,z),b=project(cam,p.x+.3,p.y-.28,z);
      c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
    }
    c.strokeStyle=active?'#fff3b6':'#ffb195';c.lineWidth=1.4;c.stroke();
  }
  function cell(c,cam,p,z){
    if(window.SnakeSprites){
      const a=project(cam,p.x,p.y,z);
      SnakeSprites.draw(c,'cell',cam.year,{x:a.x,y:a.y,unit:a.k*cam.zoom,plane:z,bonus:p.bonus,reduced:cam.reduced,time:cam.time});
      return;
    }
    symbol(c,cam,p,z,()=>{
      oval(c,0,3,7.7,3.2,'#111b27','#887453',.9);
      const col=p.bonus?'#9df1ff':'#ffe09f';
      path(c,[[0,-9],[6,-3],[5,2],[0,6],[-6,0],[-5,-4]],p.bonus?'#48acca':'#de9250',col,1.4);
      path(c,[[0,-7],[2,-2],[0,3],[-2,-2]],'#fff3c8');
    });
  }
  function sentinel(c,cam,p,z,t,boss){
    if(boss){
      const q=tile(cam,p.x,p.y,z,1.5);shape(c,[...q,q[0]],'#a951512b','#e9a485ae',1.2);
    }
    if(p.next&&(p.next.x!==p.x||p.next.y!==p.y)){
      const q=tile(cam,p.next.x,p.next.y,z,boss?1.45:.38);
      c.setLineDash([2,3]);shape(c,[...q,q[0]],null,'#ffb19cac',1);c.setLineDash([]);
    }
    if(window.SnakeSprites){
      const a=project(cam,p.x,p.y,z),unit=a.k*cam.zoom;
      SnakeSprites.draw(c,boss?'boss':'drone',cam.year,{x:a.x,y:a.y,unit,plane:z,kind:p.kind,time:t,reduced:cam.reduced});
      if(p.warmup>0)oval(c,a.x,a.y,10*unit,7*unit,null,'#ffabad',1);
      if(boss){
        const half=18*unit;
        c.fillStyle='#341b31';c.fillRect(a.x-half,a.y+17*unit,2*half,3);
        c.fillStyle=p.weak?'#edffbb':'#ffcead';c.fillRect(a.x-half,a.y+17*unit,2*half*clamp(p.hp/p.maxHp),3);
      }
      return;
    }
    symbol(c,cam,p,z,()=>{
      const size=boss?2.65:1;c.scale(size,size);
      if(p.warmup>0)oval(c,0,0,10,7,null,'#ffabad',1);
      for(const d of [-1,1]){
        path(c,[[d*2,-5],[d*9,-9],[d*8,-3],[d*12,4],[d*8,3],[d*5,8],[d*3,5]],'#783756','#eaa1a0',.85);
        path(c,[[d*8,-6],[d*6,-2],[d*9,3]],null,'#ffa9ad',.8);
      }
      path(c,[[0,-7],[5,-2],[4,3],[0,7],[-4,3],[-5,-2]],'#39263f','#fa998e',1.15);
      oval(c,0,-1,2.5,2,'#ffd7a5');oval(c,.25,-1,.78,1.35,'#4a233a');
      if(boss){c.fillStyle='#432640';c.fillRect(-9,10,18,1.5);c.fillStyle='#ffc398';c.fillRect(-9,10,18*clamp(p.hp/p.maxHp),1.5);}
    });
  }
  function snakePoints(s,cam,reduced){
    return (s.snake||[]).map((p,i)=>{
      const prev=s.previousSnake?.[i]||p,z=p.plane??s.plane??0;
      const lerp=s.flight||reduced?1:clamp(s.progress??1);
      let alt=z;
      if(!i&&s.planeShift&&!reduced)alt=cam.level;
      else if((prev.plane??z)!==z)alt=mix(prev.plane,z,lerp);
      return {...project(cam,mix(prev.x,p.x,lerp),mix(prev.y,p.y,lerp),alt),plane:z};
    });
  }
  function serpent(c,s,cam,points,z,headOnly=false){
    const look=s.flight?{x:Math.cos(s.flight.angle),y:Math.sin(s.flight.angle)}:s.direction||{x:1,y:0};
    for(let i=headOnly?0:points.length-1;i>=0;i--){
      const p=points[i];if(p.plane!==z)continue;
      const prev=headOnly?null:points[i+1],unit=p.k*cam.zoom;
      if(prev&&window.SnakeSprites)SnakeSprites.link(c,s.year,p,prev,unit);
      else if(prev&&i+1<points.length){
        shape(c,[p,prev],null,'#0a1828',11*unit);
        shape(c,[p,prev],null,'#4ea9ad',7.3*unit);
        shape(c,[p,prev],null,'#c4f8df',1.6*unit);
      }
      const h=s.snake[i];
      const next=i?points[i-1]:project(cam,h.x+look.x,h.y+look.y,z);
      const origin=i?p:project(cam,h.x,h.y,z);
      const angle=Math.atan2(next.y-origin.y,next.x-origin.x);
      if(window.SnakeSprites){
        SnakeSprites.draw(c,i?'body':'head',s.year,{x:p.x,y:p.y,angle,unit,plane:z,time:cam.time,reduced:cam.reduced});
        continue;
      }
      c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(unit,unit);
      if(i===0){
        path(c,[[-9,-3],[-6,-7],[0,-6],[8,-3],[12,0],[8,3],[0,6],[-6,7],[-9,3]],'#316f79','#bdfbe7',1.8);
        path(c,[[-4,-5],[2,-4],[6,-2],[0,-2]],'#fff2bd');
        path(c,[[-4,5],[2,4],[6,2],[0,2]],'#fff2bd');
        path(c,[[-7,0],[4,0]],null,'#87e9df',1.25);
      }else{
        path(c,[[-6,-3],[-3,-5],[4,-4],[7,0],[4,4],[-3,5],[-6,3]],'#386775','#8ed9cf',1.3);
        path(c,[[0,-3],[3,0],[0,3]],null,'#c8f5e6',1.2);
      }
      c.restore();
    }
  }
  function gate(c,cam,p,z,t,flight,next=false){
    const center=project(cam,p.x,p.y,z),size=(p.radius||.66)*13*cam.zoom*center.k;
    const color=next?'#9acacc9c':flight?'#ffde98':'#a3f4e1';
    ring(c,cam,p,z,p.radius||.75,color,1.25);
    if(flight){
      const dx=Math.cos(p.heading??Math.PI/2),dy=Math.sin(p.heading??Math.PI/2);
      const edge=project(cam,p.x-dy*(p.radius||.8),p.y+dx*(p.radius||.8),z);
      const span={x:edge.x-center.x,y:edge.y-center.y};
      // La balise reste lisible lorsque l'anneau est presque vu par la tranche.
      if(Math.abs(span.x)<size*.45)span.x=(Math.sign(span.x)||1)*size*.45;
      const arc=Array.from({length:25},(_,i)=>{
        const a=i*Math.PI/24;
        return {x:center.x+span.x*Math.cos(a),y:center.y+span.y*Math.cos(a)-size*1.8*Math.sin(a)};
      });
      shape(c,arc,null,'#253345',4.3);shape(c,arc,null,color,next?1.2:2.8);
    } else oval(c,center.x,center.y-size*.7,size*.75,size,null,color,2);
  }
  function weapons(c,s,cam,z){
    for(const p of s.shots||[])if((p.plane??0)===z){
      const seg=[project(cam,p.x,p.y,z),project(cam,p.toX,p.toY,z)];
      shape(c,seg,null,'#e9ac9755',5);shape(c,seg,null,p.kind==='arc'?'#dac7ff':'#fff0bc',1.55);
    }
    const f=s.forge||{};
    for(const p of [...(s.effects||[]),...(f.effects||[])]){
      if((p.plane??0)!==z)continue;
      const life=clamp(p.life/(p.maxLife||1)),color=p.kind==='nova'?'#e6b6ff':'#ffcf9a';
      c.save();c.globalAlpha*=life;
      if(p.kind==='chain')shape(c,[project(cam,p.x,p.y,z),project(cam,p.toX,p.toY,z)],null,'#b6efff',2.1);
      else ring(c,cam,p,z,Math.max(.13,(p.radius||.9)*(1-life)),color,1.5);
      c.restore();
    }
    for(const p of [...(f.orbits||[]),...(f.projectiles||[])]){
      if((p.plane??0)!==z)continue;
      if(p.kind==='well')ring(c,cam,p,z,p.radius||3.5,'#c6a5e3',1.5);
      symbol(c,cam,p,z,()=>{oval(c,0,0,p.kind==='shard'?2.6:4.1,p.kind==='well'?2.1:3.2,p.kind==='orbit'?'#fff1a0':'#e1beff','#615180',1);});
    }
  }
  function draw(canvas,s,t=0,reduced=false,method='direct'){
    if(!canvas||!s)return;
    if(!s.snake)return window.SnakeRendu?.draw(canvas,s,t,reduced);
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.round((canvas.clientWidth||W)*dpr),h=Math.round((canvas.clientHeight||H)*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const c=canvas.getContext('2d');c.setTransform(w/W,0,0,h/H,0,0);c.lineJoin='round';c.lineCap='round';
    const time=reduced?0:t,cam=camera(s,time,reduced);
    cam.year=s.year;cam.reduced=reduced;cam.time=time;cam.nearBoss=s.boss?1:(s.nearBoss||0);
    if(window.SnakeMondes)window.SnakeMondes.draw(c,s.year,time,cam,reduced);
    else world(c,s,time,cam);
    if(cam.music)SnakeImpact.skyline(c,cam.music,time,s.year);
    const points=snakePoints(s,cam,reduced);
    for(let z=0;z<=1;z++){
      if(z)for(const x of [-.5,35.5])for(const y of [-.5,8.5,17.5]){
        shape(c,[project(cam,x,y,0),project(cam,x,y,1)],null,'#7491a779',2.5);
      }
      const selected=z===(s.plane||0);floorGrid(c,cam,z,selected,method);
      c.save();c.globalAlpha=selected?1:.47;
      if(s.boss?.attack)mask(c,cam,s.boss.attack,z);
      if(s.shiftMode==='portal')for(const p of s.planeGates||[])gate(c,cam,p,z,time,false,true);
      if(s.rift&&(s.rift.plane??0)===z)gate(c,cam,s.rift,z,time,false);
      if(s.flightGate&&(s.flightGate.plane??s.plane??0)===z)gate(c,cam,s.flightGate,z,time,true);
      if(s.flight&&z===(s.plane||0)){
        const rings=s.flight.rings||[],idx=s.flight.passed||0;
        if(rings[idx+1])gate(c,cam,rings[idx+1],z,time,true,true);
        if(rings[idx])gate(c,cam,rings[idx],z,time,true);
      }
      for(const p of s.cells||[])if((p.plane??0)===z)cell(c,cam,p,z);
      for(const p of s.drones||[])if((p.plane??0)===z)sentinel(c,cam,p,z,time,false);
      if(s.boss&&(s.boss.plane??0)===z)sentinel(c,cam,s.boss,z,time,true);
      window.SnakeIndices?.draw(c,s,cam,z,selected);
      weapons(c,s,cam,z);serpent(c,s,cam,points,z);c.restore();
    }
    if(s.plane===0)serpent(c,s,cam,points,0,true);
    if(window.SnakeKnot)SnakeKnot.draw(c,s,(p,z)=>project(cam,p.x,p.y,z));
    window.SnakeArchives?.draw(canvas,s,reduced);
    window.SnakeMondes?.finish?.(canvas,s.year);
  }
  window.SnakeSpectacle=Object.freeze({draw,camera,project,tile,width:W,height:H});
})();
