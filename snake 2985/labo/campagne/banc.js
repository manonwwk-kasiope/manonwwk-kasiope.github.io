(() => {
  'use strict';
  // Banc autonome. Les impacts et les marques proviennent des deux modules du jeu.
  const forge=window.SnakeEvolution?.install(window.SnakeForge)??window.SnakeForge;
  const routes={
    1976:{steps:['S','S'],target:[8,8],cue:'Vire vers le relais'},
    1985:{steps:['E','E','E'],target:[12,4],cue:'Fais passer la troisième vertèbre'},
    1995:{steps:['E','S'],target:[9,7],cue:'Aiguillage 1 puis 2'},
    2185:{steps:['E','P'],target:[11,4],cue:'Bascule près du relais'},
    2985:{steps:['E','E','S','S'],target:[10,7],cue:'Sors par le côté de l’ombre'},
  };
  const moves={E:{x:1,y:0},S:{x:0,y:1}};
  const proj=(_cam,x,y,z=0)=>({x:x*22-33,y:13+y*13-z*8,k:1});
  let demo=null,last=0;
  function prepare(canvas,year,core,mod,reduced){
    const route=routes[year],plane=year===2185?1:0;
    const sim={width:18,height:10,year,eraIndex:Object.keys(routes).indexOf(String(year)),plane:0,status:'playing',
      snake:Array.from({length:4},(_,i)=>({x:8-i,y:4,plane:0})),direction:{x:1,y:0},shots:[],effects:[]};
    const [x,y]=route.target;
    const bots=[[x,y],[x+1,y+1],[x+3,y]].map(([x,y])=>({x,y,plane,flash:0}));
    const d={sim,canvas,core,mod,route,bots,reduced,step:0,time:0,nextStep:.45,lastMark:null,gesture:null,traces:[{...sim.snake[0]}],hits:0};
    d.hooks={targets:()=>bots,visible:(p,t)=>p.plane===t.plane,plane:()=>sim.plane,
      emit(type,data){
        if(type==='evolutionTrigger')d.gesture={...data};
        if(type==='evolutionHit')d.hits++;
      },
      damage(t){t.flash=.2;},
      pull(t,p){t.x+=(p.x-t.x)*.18;t.y+=(p.y-t.y)*.18;},
    };
    forge.init(sim,{core,mod});return d;
  }
  function advance(d,dt){
    const {sim}=d;d.time+=dt;
    if(d.step<d.route.steps.length&&d.time+1e-8>=d.nextStep){
      const step=d.route.steps[d.step++],head=sim.snake[0];
      if(step==='P'){sim.plane=1-sim.plane;sim.snake[0]={...head,plane:sim.plane};}
      else{
        sim.direction=moves[step];
        sim.snake=[{x:head.x+sim.direction.x,y:head.y+sim.direction.y,plane:sim.plane},...sim.snake.slice(0,-1)];
      }
      d.nextStep+=.27;d.traces.push({...sim.snake[0]});
    }
    for(const b of d.bots)b.flash=Math.max(0,b.flash-dt);
    forge.update(sim,dt,d.hooks);
    const m=sim.evolution?.marks[0];if(m)d.lastMark={...m};
  }
  function select(canvas,year,core,mod,reduced){
    if(demo&&demo.canvas!==canvas)demo.canvas.hidden=true;
    demo=prepare(canvas,year,core,mod,reduced);last=0;canvas.hidden=false;
    canvas.setAttribute?.('aria-label',[forge.name(core,mod),routes[year].cue].join(' · '));
    // Le mode réduit présente la première décharge réelle sans attendre une animation.
    if(reduced){
      const limit=window.SnakeEvolution?96:33;
      for(let i=0;i<limit&&!demo.hits;i++)advance(demo,1/60);
    }
    else advance(demo,1/60);
    draw(demo);
  }
  function draw(d){
    const {sim,canvas,bots,reduced}=d,c=canvas.getContext('2d'),pr=(p)=>proj(null,p.x,p.y,p.plane);
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#0c1222';c.fillRect(0,0,canvas.width,canvas.height);
    c.setTransform(canvas.width/345,0,0,canvas.height/144,0,0);
    function stroke(pts,color,width){
      c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
    }
    c.strokeStyle='#243341';c.lineWidth=.7;c.beginPath();
    for(let y=13;y<144;y+=13){c.moveTo(0,y);c.lineTo(345,y);}
    for(let x=11;x<345;x+=22){c.moveTo(x,0);c.lineTo(x,144);}c.stroke();
    if(d.traces.length>1)stroke(d.traces.map(pr),'#6ab5ba',2.4);
    for(const z of [0,1])SnakeArtillerie.draw(c,sim,{zoom:1},z,d.time,reduced,proj);
    const m=d.lastMark;
    const diamond=(p,label,color)=>{
      const q=pr(p),r=7;c.fillStyle='#182c37';c.beginPath();c.moveTo(q.x,q.y-r);c.lineTo(q.x+r,q.y);c.lineTo(q.x,q.y+r);c.lineTo(q.x-r,q.y);c.closePath();c.fill();
      stroke([{x:q.x,y:q.y-r},{x:q.x+r,y:q.y},{x:q.x,y:q.y+r},{x:q.x-r,y:q.y},{x:q.x,y:q.y-r}],color,1.65);
      if(label){c.fillStyle='#fff8d4';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(label,q.x,q.y+3);}
    };
    if(m){
      if(m.first){stroke([pr(m.first),pr(m)],'#bca469',2);diamond(m.first,'1','#d8bd84');}
      diamond(m,m.first?'2':'',d.gesture?'#a5f4d6':'#ffe096');
    }
    for(const b of bots){
      const p=pr(b);SnakeSprites.draw(c,'drone',sim.year,{...p,unit:.62,viewportWidth:500,plane:b.plane,reduced:true});
      if(b.flash){c.strokeStyle='#ffe4ab';c.lineWidth=2;c.strokeRect(p.x-10,p.y-8,20,16);}
    }
    for(const e of sim.evolution?.effects??[]){
      if(Number.isFinite(e.fromX))stroke([proj(null,e.fromX,e.fromY,e.plane),pr(e)],'#ffe2a0',2.5);
    }
    for(let i=sim.snake.length-1;i>=0;i--){
      const b=sim.snake[i],next=sim.snake[i-1],p=pr(b);
      const a=i&&next?Math.atan2(next.y-b.y,next.x-b.x):Math.atan2(sim.direction.y,sim.direction.x);
      SnakeSprites.draw(c,i?'body':'head',sim.year,{...p,unit:i ? .64 : .84,viewportWidth:500,plane:b.plane,angle:a,reduced:true});
    }
    c.fillStyle='#0c1725';c.fillRect(0,126,345,18);c.textAlign='left';c.fillStyle='#e6f5e7';c.font='bold 13px system-ui';
    c.fillText(d.route.cue,7,139);
    if(sim.year===2185&&sim.plane===1){
      c.fillStyle='#c8edff';c.font='bold 12px system-ui';c.textAlign='left';c.fillText('Plan haut',7,15);
    }
    if(d.hits){c.textAlign='right';c.fillStyle='#addfbc';c.fillText('Impact',338,139);}
  }
  function frame(now){
    if(!demo||demo.reduced||now-last<40)return;
    let dt=last?Math.min(.09,(now-last)/1000):1/60;last=now;
    if(demo.time>=3.1)demo=prepare(demo.canvas,demo.sim.year,demo.core,demo.mod,false);
    while(dt>1e-7){const slice=Math.min(dt,1/60);advance(demo,slice);dt-=slice;}
    draw(demo);
  }
  function stop(){if(demo)demo.canvas.hidden=true;demo=null;}
  window.SnakeBanc={select,frame,stop};
})();
