(() => {
  'use strict';
  const TAU=2*Math.PI;
  const years=[1976,1985,1995,2185,2985];
  // Ombre, éclair, satellites, prisme, gravité, onde, câble.
  const palettes=[
    ['#10231e','#e9ffe8','#a4c9a3','#e9ffe8','#a4c9a3','#e9ffe8','#507556'],
    ['#191839','#fff1c9','#ffc678','#78eadd','#c5a6ff','#fb8f9d','#766d9d'],
    ['#182033','#fff8d5','#ffab48','#8ce8fc','#be9dff','#ff807c','#7096bf'],
    ['#172334','#fff6db','#ffc278','#7aeeee','#bf9cf3','#ff987e','#6694aa'],
    ['#100e27','#fff9dd','#ffcb78','#94fbea','#dbabff','#ff929d','#729fbb'],
  ];
  const fraction=p=>Math.max(0,Math.min(1,p.life/(p.maxLife||1)));
  function draw(c,s,cam,z,t,reduced,projection) {
    if(!s||!c||typeof projection!=='function')return;
    const level=Math.max(0,years.indexOf(s.year)),[ink,light,amber,ice,violet,coral,wire]=palettes[level];
    const detail=level>=3, fine=level===4, clock=reduced?0:t||0;
    const proj=(x,y)=>projection(cam,x,y,z);
    const belongs=p=>(p.plane??0)===z;
    // Encombrement borné par plan, indépendamment de la fréquence d'affichage.
    const layer=(list,n)=>{const out=[];for(let i=(list?.length||0)-1;i>=0&&out.length<n;i--)if(belongs(list[i]))out.push(list[i]);return out;};
    const f=s.forge||{};
    c.save();c.lineJoin='round';c.lineCap='round';
    function path(pts,color,width=1.8,fill=false) {
      if(pts.length<2)return;
      c.beginPath();pts.forEach((p,i)=>{if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});
      if(fill){c.closePath();c.fillStyle=color;c.fill();}
      else{c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    }
    const line=(a,b,col,w)=>path([a,b],col,w);
    function arc(p,r,start,end,col,w,n=18) {
      const pts=[];
      for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;pts.push(proj(p.x+r*Math.cos(a),p.y+r*Math.sin(a)));}
      path(pts,col,w);
    }
    const ring=(p,r,col,w)=>arc(p,r,0,TAU,col,w,level<2?20:32);
    function oriented(p,a,coords,col,fill=true,width=2) {
      const co=Math.cos(a),si=Math.sin(a);
      path(coords.map(([x,y])=>proj(p.x+x*co-y*si,p.y+x*si+y*co)),col,width,fill);
    }
    function lightning(p,tx,ty,col,w) {
      const dx=tx-p.x,dy=ty-p.y,length=Math.hypot(dx,dy);
      if(length<.06){ring(p,.28,col,w);return;}
      const count=Math.min(12,Math.max(3,Math.ceil(length*1.8)));
      const pts=[proj(p.x,p.y)];
      for(let i=1;i<count;i++){
        const k=i/count,bend=(i%2?1:-1)*Math.min(.35,length*.085)*(i%3===0?.58:1);
        pts.push(proj(p.x+dx*k-dy/length*bend,p.y+dy*k+dx/length*bend));
      }
      pts.push(proj(tx,ty));path(pts,ink,w+2.6);path(pts,col,w);
    }
    function spikes(p,r,col,count){
      for(let i=0;i<count;i++){
        const a=i*TAU/count,co=Math.cos(a),si=Math.sin(a);
        line(proj(p.x+co*r*.87,p.y+si*r*.87),proj(p.x+co*r,p.y+si*r),col,2);
      }
    }
    for(const e of layer(s.effects,7)){
      if(e.kind==='nova')continue;
      const k=reduced?.85:1-fraction(e);
      arc(e,Math.max(.16,(e.radius||.8)*k),.22,TAU-.22,e.kind==='death'?'#ff9992':wire,1.8,14);
    }
    for(const p of layer(s.shots,6)){
      if(p.kind==='arc') {
        lightning(p,p.toX,p.toY,violet,2.7);
        const dx=p.toX-p.x,dy=p.toY-p.y,mag=Math.hypot(dx,dy)||1;
        const fork={x:p.x+dx*.46,y:p.y+dy*.46};
        lightning(fork,p.x+dx*.73-dy/mag*.45,p.y+dy*.73+dx/mag*.45,light,1.4);
        continue;
      }
      const dx=p.toX-p.x,dy=p.toY-p.y,mag=Math.hypot(dx,dy)||1,wx=-dy/mag*.17,wy=dx/mag*.17;
      const start=proj(p.x,p.y),end=proj(p.toX,p.toY);
      line(start,end,ink,6);
      for(const sign of [-1,1])line(proj(p.x+wx*sign,p.y+wy*sign),proj(p.toX+wx*sign,p.toY+wy*sign),sign===1?light:amber,1.9);
      oriented({x:p.toX,y:p.toY},Math.atan2(dy,dx),[[0,0],[-.67,-.38],[-.43,0],[-.67,.38]],light);
    }
    for(const p of layer((s.effects||[]).filter(e=>e.kind==='nova'),2)){
      const k=reduced?.86:Math.max(.08,1-fraction(p)),r=p.radius;
      ring(p,r,wire,1.35);ring(p,r*k,coral,3);spikes(p,r,light,8);
      if(detail)ring(p,Math.max(.1,r*k-.23),light,1.1);
    }
    const head=s.snake?.[0], guiding=new Set();
    for(const p of layer(f.orbits,4)){
      if(!head)break;
      const a=p.angle,r=p.radius;
      if(!guiding.has(r)){guiding.add(r);ring(head,r,wire,1.2);}
      arc(head,r,a-.97,a-.16,amber,2.4,9);
      if(detail) {
        arc(head,r-.17,a-.9,a-.12,wire,2.1,7);
        arc(head,r+.14,a-.58,a-.1,light,1.4,7);
      }
      const tangent=a+Math.PI/2;
      oriented(p,tangent,[[-.87,0],[-.26,-.4],[.28,-.33],[.54,0],[.22,.32],[-.26,.38]],ink);
      oriented(p,tangent,[[-.63,0],[-.18,-.27],[.39,0],[-.18,.27]],amber);
      oriented(p,tangent,[[-.12,-.12],[.28,0],[-.12,.12]],light);
      if(detail){
        oriented(p,tangent,[[-.36,-.23],[-.19,-.53],[.11,-.38],[.02,-.21]],ice);
        oriented(p,tangent,[[-.36,.23],[-.19,.53],[.11,.38],[.02,.21]],ice);
      }
    }
    for(const p of layer(f.projectiles,8)){
      if(p.kind==='well'){
        const r=p.radius;
        // Le cercle extérieur suit exactement le rayon d'attraction en coordonnées de jeu.
        ring(p,r,wire,1.45);
        const strands=detail?4:3;
        for(let j=0;j<strands;j++){
          const pts=[], phase=j*TAU/strands+(reduced?0:clock*.42);
          for(let i=0;i<=14;i++){
            const u=i/14,rr=r*(.85-.62*u),a=phase+u*1.45;
            pts.push(proj(p.x+rr*Math.cos(a),p.y+rr*Math.sin(a)));
          }
          path(pts,j%2?violet:wire,1.65);
          // Pointe orientée vers le noyau, y compris sur une image immobile.
          const tip=pts.at(-1),prev=pts.at(-3),a=Math.atan2(tip.y-prev.y,tip.x-prev.x);
          path([tip,{x:tip.x-5*Math.cos(a-.48),y:tip.y-5*Math.sin(a-.48)},{x:tip.x-5*Math.cos(a+.48),y:tip.y-5*Math.sin(a+.48)}],light,1,true);
        }
        const disk=[];
        for(let i=0;i<=32;i++){const a=i*TAU/32;disk.push(proj(p.x+.57*Math.cos(a),p.y+.57*Math.sin(a)));}
        path(disk,ink,1,true);ring(p,.61,violet,3.2);arc(p,.76,.16,2.7,light,2.2);
        if(detail){
          arc(p,1.13,.45,3.65,amber,2.5);
          arc(p,1.26,.3,2.8,violet,1.5);
        }
        if(fine)arc(p,.88,3.4,5.95,wire,1.9);
      }else{
        const a=Math.atan2(p.vy,p.vx);
        if(p.kind==='prism'){
          oriented(p,a,[[.77,0],[-.2,-.67],[-.72,-.1],[-.43,.62]],ink);
          oriented(p,a,[[.62,0],[-.2,-.53],[-.44,-.06]],light);
          oriented(p,a,[[.62,0],[-.44,-.06],[-.35,.47]],ice);
          oriented(p,a,[[-.2,-.53],[-.44,-.06],[.62,0]],ink,false,1.55);
          if(detail){
            oriented(p,a,[[-.2,-.53],[-.61,-.1],[-.44,-.06]],violet);
            oriented(p,a,[[-.27,.35],[-.12,.15],[.4,.07]],light,false,1.15);
          }
        }else oriented(p,a,[[.64,0],[-.46,-.17],[-.19,.02],[-.43,.22]],ice);
      }
    }
    for(const p of layer(f.effects,8)){
      const age=reduced?.72:1-fraction(p),r=p.radius||1;
      if(p.kind==='chain'){
        lightning(p,p.toX,p.toY,ice,2.5);
        ring(p,.26,light,1.9);ring({x:p.toX,y:p.toY},.26,light,1.9);
        continue;
      }
      if(p.kind==='blast'||p.kind==='collapse'){
        ring(p,r,p.kind==='collapse'?violet:wire,1.3);
        const scale=p.kind==='collapse'?1-age:age;
        ring(p,Math.max(.12,r*scale),p.kind==='collapse'?light:coral,3.1);
        if(detail)ring(p,Math.max(.15,r*scale-.22),amber,1.3);
      }else if(p.kind==='echo'){
        const a=Math.atan2(s.direction?.y??0,s.direction?.x??1),co=Math.cos(a),si=Math.sin(a);
        for(const k of [1,.48,0])oriented({x:p.x-k*co,y:p.y-k*si},a,[[-.24,-.36],[.16,0],[-.24,.36]],k===0?light:wire,false,2);
      }else if(p.kind==='split') {
        const a=Math.atan2(s.direction?.y??0,s.direction?.x??1);
        for(const d of [-.58,0,.58])oriented(p,a+d,[[.16,0],[.75,0]],light,false,1.8);
      }else spikes(p,.37+age*.25,light,4);
    }
    c.restore();
  }
  const api=Object.freeze({draw});
  if(typeof window!=='undefined')window.SnakeArtillerie=api;
  if(typeof module!=='undefined')module.exports=api;
})();
