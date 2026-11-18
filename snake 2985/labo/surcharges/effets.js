/* Tracé des cinq surcharges à partir des primitives de collision actives.
   Appeler par plan, avant les dangers, les acteurs et la tête contrôlée. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  function trace(c,pts,close=false){
    c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
    if(close)c.closePath();
  }
  function line(c,pts,ink,width=1){
    trace(c,pts);c.strokeStyle=ink;c.lineWidth=width;c.stroke();
  }
  function fill(c,pts,color){
    trace(c,pts,true);c.fillStyle=color;c.fill();
  }
  function arc(P,g,r,a,b,n){
    const pts=[];for(let i=0;i<=n;i++){const t=a+(b-a)*i/n;pts.push(P(g.x+Math.cos(t)*r,g.y+Math.sin(t)*r));}return pts;
  }
  function segment(P,g){
    const dx=g.bx-g.ax,dy=g.by-g.ay,L=Math.hypot(dx,dy),h=g.width/2,ux=L?dx/L:1,uy=L?dy/L:0;
    const at=(u,v=0)=>P(g.ax+u*ux-v*uy,g.ay+u*uy+v*ux);
    const clip=[];
    for(let i=0;i<=8;i++){
      const a=-Math.PI/2+i*Math.PI/8;
      clip.push(at(L+h*Math.cos(a),h*Math.sin(a)));
    }
    for(let i=0;i<=8;i++){
      const a=Math.PI/2+i*Math.PI/8;
      clip.push(at(h*Math.cos(a),h*Math.sin(a)));
    }
    return {L,h,at,clip};
  }
  // Tube cathodique : trois registres indépendants portent une suite de bits.
  function comb(c,shape,g,clock){
    const {L,h,at}=shape;
    line(c,[at(0),at(L)],'#70946b',2.2);
    const count=Math.max(1,Math.ceil(L)),pitch=L/count,step=(Math.floor(clock*9)+g.stage)%3;
    for(let i=0;i<count;i++){
      const x=i*pitch,len=pitch*.65,side=i%2?1:-1;
      if((i+step)%3===0)fill(c,[at(x,-h*.65),at(x+len,-h*.65),at(x+len,h*.65),at(x,h*.65)],'#dcf1ab');
      else line(c,[at(x,0),at(x,side*h*.82),at(x+len,side*h*.82)],'#a5c38c',1.35);
    }
    line(c,[at(L,-h),at(L,h)],'#dcf1ab',2);
  }
  // Le carreau de néon montre sa facette en V et un point de réflexion.
  function ricochet(c,shape,g,clock){
    const {L,h,at}=shape,tip=Math.min(L*.42,1.3);
    fill(c,[at(0),at(L*.32,-h*.74),at(L),at(L*.32,h*.36)],'#966ba067');
    line(c,[at(0,-h*.55),at(L-tip,-h*.55),at(L)],'#a3f1e4',1.9);
    line(c,[at(0,h*.51),at(L-tip,h*.51),at(L)],'#ffa0c8',1.95);
    const len=Math.min(1.1,L*.33),x=(.15+.69*((clock*1.2+.27*g.stage)%1))*L;
    fill(c,[at(x-len,0),at(x,-h*.67),at(x+len*.55,0),at(x,h*.67)],'#ffe7c6');
    fill(c,[at(0,-h*.79),at(h*.63,0),at(0,h*.79),at(-h*.63,0)],'#bfecde');
  }
  // Chaque liaison réellement active devient une voiture, orientée selon la trace.
  function train(c,shape,g,clock){
    const {L,h,at}=shape,leading=(g.stage%3)===0;
    fill(c,[at(-h*.55,-h*.38),at(0,-h*.74),at(L*.64,-h*.74),at(L+h*.55,-h*.17),at(L+h*.51,h*.43),at(L*.64,h*.72),at(0,h*.72),at(-h*.55,h*.38)],'#273b53');
    line(c,[at(0,-h*.71),at(L*.64,-h*.71),at(L+h*.50,-h*.16)],'#ffd794',2);
    line(c,[at(0,h*.55),at(L*.78,h*.55)],'#ec8568',1.7);
    for(let i=0;i<3;i++){
      const a=i*(L*.68)/3,b=a+L*.13;
      fill(c,[at(a,-h*.37),at(b,-h*.37),at(b,h*.12),at(a,h*.12)],'#96d8e3');
    }
    if(leading)fill(c,[at(L*.68,-h*.38),at(L+h*.34,-h*.10),at(L+h*.21,h*.22),at(L*.73,h*.18)],'#ffda88');
    const offset=(Math.floor(clock*5)+g.stage)%2;
    for(const n of [0,1])line(c,[at((n*.53+.08)*L,h*.80),at((n*.53+.23)*L,h*.8)],offset===n?'#f6e4a9':'#99aaa7',1.2);
  }
  function ringClip(c,P,g){
    const h=g.width/2,outer=arc(P,g,g.r+h,0,TAU,48),inner=g.r>h?arc(P,g,g.r-h,TAU,0,48):[];
    trace(c,outer,true);
    if(inner.length){c.moveTo(inner[0].x,inner[0].y);for(let i=1;i<inner.length;i++)c.lineTo(inner[i].x,inner[i].y);c.closePath();}
    c.clip('evenodd');
  }
  // Deux croissants solides restent sur les deux anneaux qui se rapprochent.
  function moons(c,P,g,clock){
    const s=g.stage%2,h=g.width/2,a=(s?Math.PI:0)+Math.sin(clock*2)*.27;
    line(c,arc(P,g,g.r,0,TAU,30),'#6f929e',1.5);
    const edge=arc(P,g,g.r+h*.92,a+.13,a+Math.PI*1.67,19);
    const inner=[];
    for(let i=19;i>=0;i--){const f=i/19,angle=a+.13+(Math.PI*1.67-.13)*f,rad=g.r+h*.9-Math.sin(Math.PI*f)*h*1.72;inner.push(P(g.x+Math.cos(angle)*rad,g.y+Math.sin(angle)*rad));}
    fill(c,edge.concat(inner),s?'#cba57d':'#7eb8c6');
    line(c,arc(P,g,g.r+h*.65,a+.23,a+1.78,12),s?'#ffe7b4':'#def6ec',1.8);
    for(const a2 of [a+2.23,a+2.63])line(c,arc(P,g,g.r,a2,a2+.16,3),'#eef1d7',1.25);
  }
  // Le front d'écho est continu. Les condensations dessinent ses fréquences
  // à l'intérieur de l'anneau actif ; aucune étincelle hors de son enveloppe.
  function echo(c,P,g,clock){
    const h=g.width/2,s=g.stage%2,base=clock*.66+s*.45,light=s?'#e3c9ff':'#ffe6bd';
    line(c,arc(P,g,g.r,0,TAU,54),s?'#a981c1':'#cca589',1.6);
    for(let i=0;i<6;i++){
      const a=base+i*TAU/6;
      const ribbon=[];
      for(let k=0;k<=7;k++){
        const f=k/7,angle=a+.72*f,r=g.r+(s?-1:1)*Math.sin(f*Math.PI*2)*h*.72;
        ribbon.push(P(g.x+Math.cos(angle)*r,g.y+Math.sin(angle)*r));
      }
      line(c,ribbon,light,1.4);
      line(c,arc(P,g,Math.max(.02,g.r-h*.64),a+.13,a+.49,4),'#c095de',1.15);
    }
  }
  const segments={comb,ricochet,train},rings={moons,echo};
  function draw(c,s,cam,z,t,reduced,project){
    const api=window.SnakeSurcharges,active=api?.read(s)?.active;
    if(!active||typeof project!=='function')return;
    const geometry=api.geometry(s);
    if(!geometry?.length)return;
    const clock=reduced?0:Math.max(0,active.age||0),P=(x,y)=>project(cam,x,y,z);
    c.save();
    trace(c,[P(-.5,-.5),P((s.width||36)-.5,-.5),P((s.width||36)-.5,(s.height||18)-.5),P(-.5,(s.height||18)-.5)],true);c.clip();
    c.lineJoin='round';c.lineCap='round';
    for(const g of geometry){
      if(g.plane!==z||!(g.width>0))continue;
      const signature=g.signature||active.signature;
      c.save();
      if(g.kind==='segment'&&segments[signature]){
        const shape=segment(P,g);trace(c,shape.clip,true);c.clip();segments[signature](c,shape,g,clock);
      }else if(g.kind==='ring'&&g.r>=0&&rings[signature]){
        ringClip(c,P,g);rings[signature](c,P,g,clock);
      }
      c.restore();
    }
    c.restore();
  }
  window.SnakeSurchargeFX=Object.freeze({draw});
})();
