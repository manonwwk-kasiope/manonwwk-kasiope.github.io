(()=>{
  const root=document.getElementById('serpents2975'), cv=root.querySelector('canvas'), ctx=cv.getContext('2d');
  const select=root.querySelector('select'), button=root.querySelector('button'), detail=root.querySelector('[aria-live]');
  const scenes=[
    ['Arracher la plaque','La boucle se ferme sur l’attache.','La plaque cède. Le passage est ouvert.'],
    ['Prendre la capsule','Une capsule attend sur le quai extérieur.','La capsule a rejoint la queue du convoi.'],
    ['Passer le relais','Le premier pilote a tracé sa boucle.','L’écho tient le pont. Les pilotes se rejoignent.']
  ];
  const tau=2*Math.PI, mix=(a,b,t)=>a+(b-a)*t, sat=x=>Math.max(0,Math.min(1,x)), ease=x=>{x=sat(x);return x*x*(3-2*x)};
  let scene=0, progress=0, raf=0;
  function poly(pts,fill,stroke,width=1){
    ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
  }
  function ellipse(x,y,rx,ry,fill,stroke,width=1,angle=0){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,tau);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
  }
  function curve(fn,n=110){return Array.from({length:n+1},(_,i)=>fn(i/n))}
  function snake(fn,ink,light,dark,scale=1){
    const pts=curve(fn,68);poly(pts,null,dark,8*scale);poly(pts,null,ink,5*scale);
    for(let i=3;i<66;i+=4){const [x,y]=pts[i],a=Math.atan2(pts[i+1][1]-y,pts[i+1][0]-x);ellipse(x,y,1.4*scale,2.8*scale,light,null,1,a)}
    const [x,y]=pts[68],[px,py]=pts[66];ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(y-py,x-px));poly([[10,0],[0,-5],[-5,-4],[-5,4],[0,5]],ink,dark,1.3);ellipse(1,-2,1.5,1,light);ctx.restore();
  }
  function sky(c){
    for(let i=0;i<110;i++){let x=(i*157+37)%760,y=(i*i*11+53*i+7)%314;ellipse(x,y, i%7===0?1.5:.65,.8,c)}
  }
  function giant(p){
    const pull=ease((p-.38)/.5),end=ease((p-.76)/.24);
    ctx.fillStyle='#101b2a';ctx.fillRect(0,0,760,320);sky('#a8bdc9');
    ellipse(100,158,179,159,'#203d50');ellipse(98,160,184,161,null,'#846f62',2);
    for(let i=0;i<7;i++)ellipse(96,166,202+i*6,34+i*1.8,null,'#455662',1,-.31);
    ctx.save();ctx.translate(0,pull*7);
    const hull=[[147,130],[243,97],[359,91],[420,68],[562,54],[657,72],[715,110],[690,134],[610,145],[563,189],[491,208],[391,210],[288,187],[228,156]];
    poly(hull,'#344758','#101927',4);
    for(let i=0;i<9;i++){let x=198+i*49,y=118-Math.sin(i*.37)*29-i*4;poly([[x,y],[x+37,y-15],[x+75,y-18],[x+43,y+28],[x+5,y+37]],i%2?'#9cabad':'#c5c7b8','#344758',3)}
    for(let i=0;i<7;i++){let x=284+i*44,y=157-Math.max(i-3,0)*8;poly([[x,y],[x+37,y-19],[x+25,y+30],[x+7,y+41]],'#666f71','#253744',2)}
    poly([[620,83],[674,87],[712,109],[663,110]],'#eee2ba');ellipse(668,103,10,3,'#b14327');
    ellipse(423,151,30,21,'#111c29','#c89c63',3,-.28);
    ctx.restore();
    const ax=423-59*pull,ay=149+66*pull;
    ctx.save();ctx.translate(ax,ay);ctx.rotate(-.24+.38*pull);poly([[-35,-12],[-20,-25],[28,-20],[39,0],[23,17],[-19,21]],'#d2b188','#724e44',3);ellipse(0,0,15,12,'#805d46','#f3d5a7',3);ctx.restore();
    const coil=t=>{const a=-2.8+5.65*t,rad=1-.22*ease(p/.42);return [ax+43*rad*Math.cos(a),ay+30*rad*Math.sin(a)]};
    snake(t=>{
      if(t<.43){let u=t/.43,k=coil(0);return [mix(112,k[0],u),mix(242,k[1],u)+28*Math.sin(u*Math.PI*2)*(1-u)*(1-pull)]}
      const u=(t-.43)/.57,k=coil(u);if(u>.72&&end){let z=ease((u-.72)/.28)*end;k[0]+=88*z;k[1]-=64*z}return k
    },'#ed8450','#ffe0ab','#522921',1.2);
  }
  function convoy(p){
    ctx.fillStyle='#f2debb';ctx.fillRect(0,0,760,320);ellipse(606,69,39,39,'#ee9861');
    for(let i=0;i<5;i++){const y=75+35*i;let pts=curve(t=>[t*760,y+13*Math.sin(t*12+i*2)+5*Math.sin(t*33+i)],75);poly([...pts,[760,320],[0,320]],['#e5bf9a','#dba587','#b88e81','#829b96','#4c7d7d'][i])}
    function island(x,y,w){poly([[x-w,y],[x-w*.55,y-12],[x+w*.72,y-9],[x+w,y],[x+w*.7,y+19],[x-w*.34,y+32]],'#845c50');poly([[x-w,y],[x-w*.6,y-16],[x+w*.6,y-17],[x+w,y],[x+w*.28,y+6]],'#cfab81');for(let i=-1;i<=1;i++){let a=x+i*w*.32;poly([[a-8,y-10],[a-8,y-25],[a,y-34],[a+8,y-27],[a+8,y-10]],'#344e51')}}
    island(127,126,86);island(383,153,63);island(704,205,69);
    function route(s){return [43+675*s,216-46*Math.sin(s*5.8)+13*Math.sin(s*13)]}
    poly(curve(route),null,'#d8bb92',1);
    const head=mix(.41,.95,ease(p)), pick=.51;
    function pod(x,y){ctx.save();ctx.translate(x,y);poly([[-9,3],[-7,-5],[6,-6],[10,1],[7,6],[-6,7]],'#fff0bd','#31585a',2);poly([[-4,0],[-2,-3],[3,-3],[5,0]],'#c76b4d');ctx.restore()}
    snake(t=>route(head-.13+.13*t),'#f5b846','#fff1c2','#365759',.95);
    let prev=route(head-.13);
    for(let i=0;i<4;i++){const pos=route(head-.16-i*.032);poly([prev,pos],null,'#334e54',1.8);pod(...pos);prev=pos}
    const tailS=head-.16-4*.032,meet=ease((tailS-pick+.04)/.04),to=route(tailS),at=route(pick);
    const cx=mix(at[0],to[0],meet),cy=mix(156,to[1],meet);
    if(meet>.9)poly([prev,[cx,cy]],null,'#334e54',1.8);pod(cx,cy);
  }
  function shores(p){
    const split=160,latch=ease((p-.23)/.18),second=ease((p-.34)/.62);
    ctx.fillStyle='#dfbc8e';ctx.fillRect(0,0,760,split);ctx.fillStyle='#21394f';ctx.fillRect(0,split,760,166);
    for(let i=0;i<36;i++){let x=(i*69)%760,w=7+i%6*3,h=15+((i*31)%87);poly([[x-w,split],[x-w,split-h],[x,split-h-7],[x+w,split-h],[x+w,split]],'#bd8c68');poly([[x-w,split+1],[x-w,split+h],[x,split+h+10],[x+w,split+h],[x+w,split+1]],'#34536a')}
    for(let i=0;i<9;i++){let x=i*99-35;poly([[x,299],[x+48,245],[x+63,305]],'#182f47')}
    for(let i=0;i<6;i++){let x=38+i*136;poly([[x,34],[x+23,31],[x+43,36]],null,'#9e7458',1)}
    const route=t=>[100+516*t+53*Math.sin(t*Math.PI*2),144-58*Math.sin(t*Math.PI)-31*Math.sin(t*Math.PI*3)];
    poly(curve(route),null,'#faf0d5',2);const doorX=413;
    ctx.save();ctx.translate(doorX,228);ctx.rotate(-Math.PI/2*(1-latch));poly([[0,-4],[57,-4],[59,3],[1,4]],'#dbb88c','#182e45',2);ctx.restore();
    for(let i=0;i<2;i++){const x=doorX+i*60;poly([[x-7,233],[x+7,233],[x+13,290],[x-8,290]],'#b3876b')}
    const lever=route(.46);ellipse(...lever,12,12,'#744e46','#f7d7a2',3);ellipse(...lever,5,5,'#fce9c2');
    const u=mix(.27,.46,ease(p/.34))+ .51*ease((p-.80)/.20);
    snake(t=>route(u-.20+.20*t),'#aa553e','#fff0c6','#784636',.85);
    snake(t=>{let v=.06+.9*second-.15+.15*t;return [100+519*v,225+24*Math.sin(v*Math.PI*2)-78*ease((v-.74)/.22)]},'#86c2c5','#dcf1e0','#16364d',.85);
  }
  const drawScene=[giant,convoy,shores];
  function draw(){const width=Math.max(300,Math.round(cv.clientWidth*(window.devicePixelRatio||1))),h=Math.round(width*320/760);if(cv.width!==width||cv.height!==h){cv.width=width;cv.height=h}ctx.setTransform(width/760,0,0,h/320,0,0);ctx.lineJoin='round';ctx.lineCap='round';drawScene[scene](progress)}
  function reset(value){cancelAnimationFrame(raf);scene=value;select.selectedIndex=scene;progress=0;button.disabled=false;button.textContent=scenes[scene][0];detail.textContent=scenes[scene][1];cv.setAttribute('aria-label',scenes[scene][1]);draw()}
  select.addEventListener('change', () => reset(select.selectedIndex));
  button.addEventListener('click',()=>{if(progress===1)reset(scene);button.disabled=true;const start=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function step(now){progress=reduce?1:sat((now-start)/3400);draw();if(progress<1){raf=requestAnimationFrame(step);return}button.disabled=false;button.textContent='Revoir le geste';detail.textContent=scenes[scene][2];cv.setAttribute('aria-label',scenes[scene][2])}raf=requestAnimationFrame(step)
  });
  reset(select.selectedIndex);
  new ResizeObserver(draw).observe(cv);
})();
