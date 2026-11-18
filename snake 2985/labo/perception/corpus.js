(function(){
  'use strict';
  const years=[1976,1985,1995,2185,2985],dirs=[[1,0],[0,1],[-1,0],[0,-1]],pt=(x,y,plane)=>({x,y,plane});
  const nativeSprites=SnakeSprites,nativeArt=SnakeArtillerie,nativeWorlds=SnakeMondes,nativePhosphore=SnakePhosphore,nativeLocomotion=SnakeLocomotion,nativeSurcharge=SnakeSurchargeFX;
  function scene(year,i,test){
    const seed=(test?790907:17921)+year*23+i*131;
    let v=seed;const r=()=>((v=Math.imul(v,1664525)+1013904223>>>0)/4294967296);
    const s=SnakeArcade.create(r,years.indexOf(year));const idx=years.indexOf(year);
    const plane=(idx+i)%2,pose=(i+idx)%4;
    const x=8+Math.floor(r()*19),y=6+Math.floor(r()*6);
    const mode=i%4,flight=mode===2||(test&&mode===3),shift=mode===1;
    const ang=pose*Math.PI/2+(flight?(test?.66:.29):0);
    const dx=Math.cos(ang),dy=Math.sin(ang),head=pt(x,y,plane);
    s.plane=plane;s.direction={x:dx,y:dy};s.elapsed=(test?14:1)+r()*5;s.progress=1;
    const body=5+Math.floor(r()*5);
    s.snake=Array.from({length:body},(_,n)=>{
      const k=Math.min(3,n),l=Math.max(0,n-3);
      return pt(x-k*dx-l*dy,y-k*dy+l*dx,shift&&n>0?1-plane:plane);
    });
    s.previousSnake=s.snake.map(p=>({...p}));
    if(shift)s.planeShift={from:1-plane,to:plane,remaining:test?.12:.22,total:.35};
    if(flight)s.flight={angle:ang,targetAngle:ang,total:8,remaining:7.1,passed:0,goal:2,
      rings:[{x:x+2*dx,y:y+2*dy,heading:ang,radius:1.05},{x:x+6*dx,y:y+6*dy,heading:ang-.4,radius:1.05}]};
    const hazardDir=Math.floor(r()*4),[hx,hy]=dirs[hazardDir];
    // Keep the ordinary cell away from the snake and the nearest of its active plane.
    const cdir=dirs[(hazardDir+1+Math.floor(r()*3))%4];
    s.cells=[pt(x+cdir[0]*3,y+cdir[1]*3,plane),pt(x-cdir[0]*5,y-cdir[1]*5,plane),
      {...pt(x+2*dx,y+2*dy,1-plane),bonus:true}];
    if(i%4===1)s.cells[0].bonus=true;
    if(i%7===6)s.cells=s.cells.filter(p=>p.plane!==plane);
    const warm=pt(x+4*hx,y+4*hy,plane);s.drones=[{...warm,next:pt(warm.x,warm.y+1,plane),warmup:0}];
    if(i%3===1)s.drones.push({...pt(x+1,y,1-plane),next:pt(x,y,1-plane),warmup:0});
    const hazard=['active','warning','opposite','away','none'][i%5],burnPlane=hazard==='opposite'?1-plane:plane;
    const hazardTiles=[];
    s.boss={...pt(x<18?29:5,5,plane),kind:'mid',name:SnakeArcade.eras[idx].bosses[0],hp:14,maxHp:20,weak:false,attack:null};
    if(hazard!=='none'){
      const distance=hazard==='away'?3:1;
      for(let d=-1;d<=1;d++)hazardTiles.push(pt(x+distance*hx-hy*d,y+distance*hy+hx*d,burnPlane));
      s.boss.attack={tiles:hazardTiles,danger:new Set(hazardTiles.map(p=>p.y*s.width+p.x)),plane:burnPlane,total:.8,remaining:.52,phase:hazard==='warning'?'warning':'active'};
    }
    if(i%3!==0){
      s.forge.core='orbit';s.forge.orbits=[0,Math.PI].map(a=>({kind:'orbit',angle:a+ang,radius:2.1,x:x+2.1*Math.cos(a+ang),y:y+2.1*Math.sin(a+ang),plane}));
      if(i%3===2)s.effects=[{kind:'nova',x,y,plane,life:.23,maxLife:.6,radius:4}];
    }
    if(i%3===2){
      s.eaten=2;
      const wrapper=SnakeSurcharges.install(SnakeArcade,{...SnakeForge,update(){}});
      wrapper.engine.fire(s);wrapper.forge.update(s,.24,{targets:()=>[],emit(){}});
    }
    const headAbsent=i%11===10; // Instrumented no-head negatives, retaining its neck and scene.
    return {s,seed,head,ang,hazard,headAbsent,test};
  }
  function render(year,i,test,ablation='normal'){
    const {s,seed,head,ang,hazard,headAbsent}=scene(year,i,test),t=s.elapsed;
    const reduced=test&&i%7===4;
    const canvas=document.querySelector('canvas'),cam=SnakeSpectacle.camera(s,t,reduced);
    const P=(p,z=p.plane)=>SnakeSpectacle.project(cam,p.x,p.y,z);
    const pix=p=>[p.x*canvas.clientWidth/960,p.y*canvas.clientHeight/440];
    const h=P(head);
    const forward=P(pt(head.x+Math.cos(ang),head.y+Math.sin(ang),head.plane)),base=P(head);
    const angle=Math.atan2(forward.y-base.y,forward.x-base.x)*180/Math.PI;
    let target=s.cells.filter(p=>p.plane===head.plane).sort((a,b)=>Math.hypot(a.x-head.x,a.y-head.y)-Math.hypot(b.x-head.x,b.y-head.y))[0];
    const cardinal=dirs.map(([x,y])=>pt(head.x+x,head.y+y,head.plane));
    const lethal=cardinal.map(p=>Boolean(s.boss?.attack?.phase==='active'&&s.boss.attack.plane===p.plane&&s.boss.attack.danger.has(p.y*s.width+p.x)));
    // Matched counterfactuals affect rendering only. Truth is derived before their application.
    window.SnakeSprites={...nativeSprites,link:ablation==='sans-corps'?()=>{}:nativeSprites.link,draw(c,role,...args){
      if((role==='head'&&headAbsent)||(role==='body'&&ablation==='sans-corps'))return;nativeSprites.draw(c,role,...args);
    }};
    window.SnakeArtillerie=ablation==='sans-fx'?{draw(){}}:nativeArt;
    window.SnakeMondes=ablation==='sans-palette'?{...nativeWorlds,finish(surface,year,out){
      if(surface!==out){const c=out.getContext('2d');c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.drawImage(surface,0,0,out.width,out.height);c.restore();}
    }}:nativeWorlds;
    if(headAbsent)window.SnakePhosphore={...nativePhosphore,headHalo(){}};
    if(ablation==='sans-corps')window.SnakeLocomotion={...nativeLocomotion,overlay(){}};
    if(ablation==='sans-fx')window.SnakeSurchargeFX={draw(){}};
    if(ablation==='sans-hors-plan'){s.cells=s.cells.filter(q=>q.plane===s.plane);s.drones=s.drones.filter(q=>q.plane===s.plane);}
    try{SnakeSpectacle.draw(canvas,s,t,reduced);}
    finally{window.SnakeSprites=nativeSprites;window.SnakeArtillerie=nativeArt;window.SnakeMondes=nativeWorlds;window.SnakePhosphore=nativePhosphore;window.SnakeLocomotion=nativeLocomotion;window.SnakeSurchargeFX=nativeSurcharge;}
    return {png:canvas.toDataURL('image/png').split(',')[1],label:{year,seed,split:test?'holdout':'calibration',width:canvas.width,height:canvas.height,
      head:headAbsent?null:pix(h),angle,target:target?pix(P(target)):null,directions:lethal,cardinal:cardinal.map(p=>pix(P(p))),
      painted:SnakeMatieres.ready(year),overload:!!SnakeSurcharges.read(s).active,reduced,plane:s.plane,mode:s.flight?'vol':s.planeShift?'bascule':'grille',hazard,ablation,fx:s.forge.orbits.length>0}};
  }
  window.perceptionRender=render;
})();
