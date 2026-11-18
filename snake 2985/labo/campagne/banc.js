(() => {
  'use strict';
  // Le banc prévisualise une recette avec ses véritables projectiles et un terrain d'essai séparé.
  const base=window.SnakeForge;
  let demo=null, last=0, tick=0;
  function select(canvas,year,core,mod,reduced) {
    const sim={width:28,height:12,year,plane:0,status:'playing',snake:[{x:8,y:6,plane:0}],direction:{x:1,y:0},shots:[],effects:[]};
    base.init(sim,{core,mod});
    const locations=core==='orbit'?[[10,6],[8,8],[6,6],[8,4]]:[[12,6],[15,5],[15,7],[17,6]];
    const bots=locations.map(([x,y])=>({x,y,plane:0,flash:0}));
    const hooks={targets:()=>bots,visible:()=>true,plane:()=>0,emit:()=>{},damage:t=>{t.flash=.15;},
      pull:(t,p)=>{t.x+=(p.x-t.x)*.2;t.y+=(p.y-t.y)*.2;}};
    demo={sim,bots,hooks,canvas,reduced};tick=0;last=0;
    canvas.hidden=false;
    if(reduced)for(let i=0;i<33;i++)advance(1/60);
    draw();
  }
  function advance(dt){
    tick+=dt;const {sim,bots,hooks}=demo;
    for(const b of bots)b.flash=Math.max(0,b.flash-dt);
    base.update(sim,dt,hooks);
  }
  const projection=(_cam,x,y)=>({x:12+x*16,y:11+y*10,k:1});
  function draw(){
    const {sim,canvas,bots,reduced}=demo,c=canvas.getContext('2d');
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#0c1222';c.fillRect(0,0,canvas.width,canvas.height);
    c.setTransform(canvas.width/345,0,0,canvas.height/144,0,0);
    c.strokeStyle='#253747';c.lineWidth=.7;c.beginPath();
    for(let y=11;y<144;y+=10){c.moveTo(0,y);c.lineTo(345,y);}
    for(let x=12;x<345;x+=16){c.moveTo(x,0);c.lineTo(x,144);}c.stroke();
    SnakeArtillerie.draw(c,sim,{zoom:1},0,tick,reduced,projection);
    for(const b of bots){
      const p=projection(null,b.x,b.y);
      SnakeSprites.draw(c,'drone',sim.year,{x:p.x,y:p.y,unit:.6,viewportWidth:500,reduced:true});
      if(b.flash){c.strokeStyle='#ffe4ab';c.lineWidth=2;c.strokeRect(p.x-10,p.y-8,20,16);}
    }
    const h=projection(null,8,6);SnakeSprites.draw(c,'head',sim.year,{x:h.x,y:h.y,unit:.8,viewportWidth:500,reduced:true});
  }
  function frame(now) {
    if(!demo||demo.reduced||now-last<40)return;
    const delta=last?Math.min(.08,(now-last)/1000):1/60;
    last=now;advance(delta);draw();
  }
  function stop(){if(demo)demo.canvas.hidden=true;demo=null;}
  window.SnakeBanc={select,frame,stop};
})();
