(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.SnakeBossAnimation=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const histories=new WeakMap();
  const palettes={1976:['#09180e','#385d31','#87ca5c','#e5ffbf'],1985:['#21162c','#713354','#ef78af','#fff4bc'],
    1995:['#231921','#79473c','#ee8c49','#ffefa9'],2185:['#111528','#674469','#9cd8f1','#ffffdb'],2985:['#20112c','#63395d','#d67eab','#ffefbd']};
  const steps={1976:3,1985:5,1995:8};
  const clamp=v=>Math.max(0,Math.min(1,v));
  function pose(year,b,reduced=false){
    const a=b.attack,phase=b.weak?'open':a?.phase==='active'?'strike':a?.phase==='warning'?'wind':'idle';
    const history=histories.get(b);
    let progress=a?clamp(1-a.remaining/Math.max(.001,a.total)):0;
    const timeLeft=Math.max(b.stun||0,b.attackClock||0);
    const recovery=phase==='open'?(history?.phase==='open'?history.recovery:timeLeft):0;
    if(phase==='open')progress=clamp(1-timeLeft/Math.max(.001,recovery));
    histories.set(b,{phase,recovery});
    if(reduced)progress=phase==='idle'?0:.6;
    else if(steps[year])progress=Math.round(progress*(steps[year]-1))/(steps[year]-1);
    // L'élan se renverse à la frappe ; les pièces reviennent en place sur la riposte.
    const pull=phase==='wind'?.18+.82*progress:phase==='strike'?-.98+.45*progress:phase==='open'?.20*(1-progress):0;
    const open=phase==='open';
    return {year,kind:b.kind,phase,progress,pull,open};
  }
  function parts(p){
    const rear=[],front=[],q=p.pull,v=p.progress,op=p.open,hit=p.phase==='strike';
    let side=front;
    const poly=(color,points)=>side.push({color,points});
    const box=(color,x,y,w,h)=>poly(color,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
    const oval=(color,x,y,rx,ry)=>poly(color,Array.from({length:20},(_,i)=>[x+rx*Math.cos(i*Math.PI/10),y+ry*Math.sin(i*Math.PI/10)]));
    const arm=(a,b,w,color)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,X=-dy*w/n,Y=dx*w/n;
      poly(color,[[a[0]+X,a[1]+Y],[b[0]+X,b[1]+Y],[b[0]-X,b[1]-Y],[a[0]-X,a[1]-Y]]);};
    const mid=p.kind==='mid';
    // Les appendices sont peints autour du sprite original ; aucune particule indépendante.
    for(const k of [-1,1]){
      side=front;
      if(p.year===1976 && mid){
        const x=k*(8+q*3);box(0,x-2,-10,4,19);box(2,x-1,-9,2,17);
        const y=k*5+Math.round(q*3);box(1,-7,y-1.5,14,3);box(3,k*4-2,y-2,4,4);
      }else if(p.year===1976){
        const x=k*(7+(op?3:2*q));box(0,x-4,-10,8,18);box(2,x-3,-9,6,16);
        for(let i=0;i<3;i++)box(1,x-2,-6+5*i,4,2);
        box(3,x-3,(hit?-7:5),6,2);
      }else if(p.year===1985 && mid){
        const joint=[k*8,6],tip=[k*(11+4*q),-7+3*q];arm(joint,tip,3.6,0);arm(joint,tip,2.5,2);
        box(3,tip[0]-2.6,tip[1]-2.8,5.2,4);oval(1,...joint,3,3);
      }else if(p.year===1985){
        const y=k*(op?6:2+2.5*q);poly(0,[[-13,0],[-5,y-k*3],[5,y-k*3],[13,0],[5,y+k*2],[-5,y+k*2]]);
        arm([-8,y],[7,y],1.2,2);if(!op)oval(3,3*q,0,1.2,hit?5:2);
      }else if(p.year===1995 && mid){
        const joint=[k*3,3],angle=(hit?-8:op?57:24+42*q)*Math.PI/180;
        const tip=[joint[0]+k*11*Math.cos(angle),joint[1]-11*Math.sin(angle)];
        arm(joint,tip,2.1,0);arm(joint,tip,1.35,2);oval(3,...tip,2,2);oval(1,...joint,2.5,2.5);
      }else if(p.year===1995){
        if(k===-1){
          const y=hit?-12:op?-9: -9+4*q;box(0,0,y,7,9);box(2,1,y+1,5,7);box(3,-1,y-1,9,2);
          const piston=hit?2:q*-2;arm([-10,7], [7+piston,5],1.2,2);oval(3,7+piston,5,1.4,1.4);
        }else{
          const tip=[13+(hit?3: -2*q),5];poly(1,[[4,1],tip,[13,8],[4,6]]);
          if(op){poly(2,[[2,-5],[2,-12],[4,-10],[6,-15],[8,-8],[7,-4]]);poly(3,[[4,-5],[5,-10],[7,-7],[6,-4]]);}
        }
      }else if(p.year===2185 && mid){
        const a=k*Math.PI/2+.55*q;
        const tip=[14*Math.cos(a),11*Math.sin(a)], elbow=[6*Math.cos(a+.38),5*Math.sin(a+.38)];
        arm([0,0],elbow,2.8,1);arm(elbow,tip,1.9,2);oval(3,...tip,2.1,2.1);
      }else if(p.year===2185){
        const x=k*(op?9:6+2.6*q),y=k*(3+2*q);oval(0,x,y,6.2,5.6);oval(1,x,y,5.4,4.7);
        poly(2,[[x-4,y],[x-2,y-3],[x+2,y-4],[x,y-2]]);arm([0,0],[x,y],1,2);
      }else if(mid){
        const tip=[k*(hit?4:op?14:10+4*q),hit?8:-8-1.8*q];
        poly(0,[[k*5,6],[k*13,1],tip,[k*7,-2],[k*2,2]]);
        poly(2,[[k*5,3],[k*11,0],tip,[k*6,-1]]);poly(3,[[k*5,2],[k*7,0],[k*5,-2]]);
      }else{
        for(let i=0;i<3;i++){
          const a=i*Math.PI/3+(k<0?Math.PI:0),twist=(op?-.58:.16+.74*q);
          const polar=(r,t)=>[r*Math.cos(t),r*.82*Math.sin(t)];
          poly(1,[polar(4,a),polar(12,a+twist),polar(14,a+twist+.23),polar(6,a+.35)]);
          arm(polar(7,a+.1),polar(13,a+twist+.14),.85,2);
        }
      }
    }
    // Scellé horizontal ou chambre lumineuse dans une ouverture bordée de noir.
    side=front;
    if(op){
      const r=5.5,cy=p.year===1995&&!mid?1:0;
      poly(0,[[-r-1.6,cy],[0,cy-r-1.5],[r+1.6,cy],[0,cy+r+1.5]]);
      poly(3,[[-r,cy],[0,cy-r],[r,cy],[0,cy+r]]);box(1,-1,cy-1,2,2);
    }else{
      if(p.year===1976){
        box(0,-4,-2,8,4);box(2,-3,-1,2,2);box(2,1,-1,2,2);
      }else if(p.year===1985 && !mid){
        oval(0,0,0,5,hit?2.4:1.35);oval(3,q,0,hit?1.7:1,.8);
      }else if(p.year===1995 && mid){
        oval(0,0,2,2.8,2.8);oval(2,0,2,1.4,1.4);
      }else if(p.year===1995){
        for(let i=-1;i<=1;i++)arm([-4+i*2,0],[-3+i*2,2],.7,0);
      }else if(p.year===2185){
        oval(0,0,0,3,2);arm([-2,1],[2,-1],.65,2);
      }else if(p.year===2985 && mid){
        poly(0,[[-4,-1],[0,2],[4,-1],[2,3],[-2,3]]);
      }else if(p.year===2985){
        oval(0,0,0,3.5,3.5);oval(1,0,0,1.5,1.5);
      }
    }
    side=rear;
    // Deux attaches relient les pièces articulées à la masse du corps en mouvement.
    if(p.year>=2185)for(const k of [-1,1])arm([k*4,2],[k*(10+q),5.2],1.7,1);
    return {rear,front};
  }
  function transform(p){
    const q=p.pull;
    const bias={1976:0,1985:.025,1995:.045,2185:.07,2985:.09}[p.year];
    return {sx:1+.095*q,sy:1-.14*q,angle:(p.kind==='final'?1:-1)*q*bias};
  }
  function paint(c,list,colors){for(const {color,points} of list){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=colors[color];c.fill();
  }}
  // Inscrit le châssis dans le quadrilatère de trois cases vu sous la caméra du jeu.
  // Le plafond reste fixe pendant toute la pose, pour garder l'amplitude de son mouvement.
  function fit(footprint,origin,scale){
    if(!footprint || footprint.length!==4)return 1;
    const corners=[[-18.9,-16.5],[18.9,-16.5],[18.9,16.5],[-18.9,16.5]];
    let limit=1;
    for(let i=0;i<4;i++){
      const a=footprint[i],b=footprint[(i+1)%4],dx=b.x-a.x,dy=b.y-a.y;
      const room=Math.abs(dx*(origin.y-a.y)-dy*(origin.x-a.x));
      const extent=Math.max(...corners.map(([x,y])=>Math.abs(dx*y-dy*x)))*scale;
      if(extent>0)limit=Math.min(limit,.98*room/extent);
    }
    return limit;
  }
  function before(c,year,b,o){
    const p=pose(year,b,o.reduced),t=transform(p),layers=parts(p),colors=palettes[year];
    const viewport=o.viewportWidth||c.canvas?.clientWidth||960,scale=1.67*Math.max(.78,290/viewport,o.unit??1);
    const shrink=fit(o.footprint,o,scale);
    c.save();c.translate(o.x,o.y);c.scale(shrink,shrink);c.rotate(t.angle);c.scale(t.sx,t.sy);
    c.save();c.scale(scale,scale);paint(c,layers.rear,colors);c.restore();
    // L'hôte dessine le sprite au centre local : la déformation s'applique à son châssis.
    return {layers,colors,scale,sprite:{...o,x:0,y:0,reduced:true}};
  }
  function after(c,token){
    c.scale(token.scale,token.scale);paint(c,token.layers.front,token.colors);c.restore();
  }
  return {pose,parts,transform,fit,before,after,palettes};
});
