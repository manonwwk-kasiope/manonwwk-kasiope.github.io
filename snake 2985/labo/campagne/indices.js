(function () {
  'use strict';
  // Les objets tactiques doivent passer par la même matrice de projection que les cases mortelles.
  const labels={convoi:'Prends le sillage du convoi',mue:'Laisse ta mue au socle',surf:'Attrape la vague',relais:'Relie les deux plans',aiguillage:'Double le train',express:'Double le train'};
  function draw(c,s,cam,z,selected) {
    const project=(p)=>SnakeSpectacle.project(cam,p.x,p.y,z);
    const at=p=>p && (p.plane??0)===z;
    const line=(a,b,color,width,dashed=false)=>{
      const x=project(a),y=project(b); c.beginPath(); c.strokeStyle=color;c.lineWidth=width;
      c.setLineDash(dashed?[4,6]:[]);c.moveTo(x.x,x.y);c.lineTo(y.x,y.y);c.stroke();c.setLineDash([]);
    };
    const beacon=(v,label,color)=>{
      const p=project(v), r=8*p.k*cam.zoom;
      c.beginPath();c.moveTo(p.x-r,p.y+r*.35);c.lineTo(p.x-r,p.y-r*.55);c.lineTo(p.x-r*.55,p.y-r);
      c.moveTo(p.x+r,p.y+r*.35);c.lineTo(p.x+r,p.y-r*.55);c.lineTo(p.x+r*.55,p.y-r);c.lineWidth=2;c.strokeStyle=color;c.stroke();
      if(label){c.font='bold '+Math.max(8,10*p.k*cam.zoom)+'px sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(label,p.x,p.y+r*.2);}
    };
    c.save();c.globalAlpha*=selected?1:.55;
    const o=s.director?.offer;
    if(o){
      const route=o.anchors||[],next=route[Math.min(o.step||0,route.length-1)];
      if(o.kind==='aiguillage' && route.length===6){
        const [a,b,d,exit,train,last]=route;
        if(at(train)&&at(last))line(train,last,'#ffaa92',2.5);
        if(o.step===0&&at(a)){
          const dx=Math.sign(train.x-last.x),dy=Math.sign(train.y-last.y);
          const point=(forward,side)=>({x:a.x+dx*forward-dy*side,y:a.y+dy*forward+dx*side});
          for(const back of [-1.34,-.84]){
            const tip=point(back+.32,0);
            for(const side of [-.30,.30]){
              line(point(back,side),tip,'#292a42',4.3);line(point(back,side),tip,'#ffdd98',2.2);
            }
          }
        }
        if(at(a)&&at(b)){line(a,b,'#ffdf96',1.5,true);line(b,d,'#ffdf96',1.5,true);line(a,exit,'#9bd9d5',1);}
      }else for(let i=1;i<route.length;i++)if(at(route[i-1])&&at(route[i]))line(route[i-1],route[i],'#9ebae2',1,true);
      if(at(next))beacon(next,'⋄',o.phase==='active'?'#cbebff':'#9fbbd2');
      if(at(o.train))beacon(o.train,'≡','#ffcf80');
    }
    if(s.aide?.marks?.[0] && at(s.aide.marks[0]))SnakeInitiation.drawFork(c,s.aide,project,'#c8efd2');
    if(s.aide && at(s.aide.at) && s.initiation?.prepared)beacon(s.aide.at,'⌁','#b1ffe1');
    for(const m of s.evolution?.marks||[]){
      if(!at(m))continue;
      if(m.first&&!m.entered){beacon(m.first,'1','#ffda92');line(m.first,m,'#ffda92',1,true);}
      beacon(m,m.kind==='switch'?'2':m.kind==='phase'?'⇅':'•','#ffda92');
    }
    for(const e of s.evolution?.effects||[]) {
      if(!at(e))continue;
      if(Number.isFinite(e.fromX)&&Number.isFinite(e.fromY))line({x:e.fromX,y:e.fromY},e,'#ffd6aa',2);
    }
    c.restore();
  }
  window.SnakeIndices={draw,labels};
})();
