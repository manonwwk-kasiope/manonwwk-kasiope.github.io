/* Relief ponctuel de combat. À appeler dans spectacle, avant la tête active et la conversion finale de palette. */
(function(root){
  'use strict';
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]],plane=p=>p.plane??0,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function choose(s,preferred=null){
    const head=s.snake?.[0],z=s.plane??0;
    if(!head)return {cell:null,walls:[]};
    const walls=[],waves=[s.boss?.attack,s.ecologie?.wave].filter(w=>w?.phase==='active'&&plane(w)===z);
    if(s.year===1976&&!s.flight){
      for(const [dx,dy] of dirs){
        const x=Math.round(head.x)+dx,y=Math.round(head.y)+dy,index=y*s.width+x;
        if(x<0||x>=s.width||y<0||y>=s.height)continue;
        if(waves.some(w=>(w.danger||w.mask)?.has(index)))walls.push([dx,dy]);
      }
    }
    // Flight rewards rings; a nearby collectible is actionable again after landing.
    if(s.flight)return {cell:null,walls};
    const same=(s.cells||[]).filter(c=>plane(c)===z).sort((a,b)=>dist(a,head)-dist(b,head));
    const cell=preferred?same.find(p=>p.x===preferred.x && p.y===preferred.y && plane(p)===plane(preferred)):same[0];
    const d=cell&&dist(head,cell);
    if(!cell || d<1.5 || d>6 || s.snake.some(p=>plane(p)===z&&dist(p,cell)<.9))return {cell:null,walls};
    const closeItem=s.cells.some(p=>p!==cell&&dist(p,cell)<4.5);
    const closeEffect=[...(s.forge?.orbits||[]),...(s.forge?.projectiles||[]),...(s.effects||[])].some(p=>plane(p)===z&&dist(cell,p)<4.5);
    const closeEnemy=(s.drones||[]).some(p=>dist(p,cell)<3);
    const closeBody=s.snake.slice(1).some(p=>dist(p,cell)<2);
    const active=s.boss?.attack||s.ecologie?.wave;
    const nearWarning=active&&plane(active)===z&&(active.tiles||[]).some(p=>dist(p,cell)<2);
    return {cell:(closeItem||closeEffect||closeEnemy||closeBody||nearWarning)?cell:null,walls};
  }
  function draw(c,s,cam,project,{time=0,reduced=false,cellOnly=false,preferred=null}={}){
    const cue=choose(s,preferred),cell=cue.cell,walls=cellOnly?[]:cue.walls,head=s.snake[0],z=s.plane??0;
    if(!cell&&!walls.length)return;
    const P=(x,y)=>project(cam,x,y,z);
    c.save();c.lineJoin='round';c.lineCap='round';
    if(cell){
      const p=P(cell.x,cell.y),unit=Math.max(.78,p.k*cam.zoom);
      // Small opaque backing insulates the real icon from lines and glints at its own tile.
      c.fillStyle='#101c22';c.beginPath();c.ellipse(p.x,p.y,11*unit,9*unit,0,0,Math.PI*2);c.fill();
      c.strokeStyle=s.year===1976?'#dcf1ab':'#f4e2aa';c.lineWidth=1.5*unit;
      c.beginPath();
      for(const side of [-1,1]){
        c.moveTo(p.x+side*6*unit,p.y+8*unit);
        c.lineTo(p.x+side*10*unit,p.y+8*unit);
        c.lineTo(p.x+side*10*unit,p.y+5*unit);
      }
      c.stroke();
      root.SnakeSprites.draw(c,'cell',s.year,{x:p.x,y:p.y,unit:unit*1.12,plane:z,bonus:cell.bonus,time,reduced,viewportWidth:cam.viewportWidth});
    }
    for(const [dx,dy] of walls){
      const x=Math.round(head.x)+dx*.55,y=Math.round(head.y)+dy*.55;
      const a=P(x-dy*.36,y+dx*.36),b=P(x+dy*.36,y-dx*.36);
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
      c.strokeStyle='#101c22';c.lineWidth=4;c.stroke();
      c.strokeStyle='#dcf1ab';c.lineWidth=1.6;c.stroke();
    }
    c.restore();
  }
  function drawDiscovery(c,s,cam,project){
    const guide=s.initiation, hint=s.aide;
    if(s.status!=='playing' || !guide?.prepared || !['cellule','croissance'].includes(guide.stage) ||
      s.flight || hint?.shape!=='diamond' || !hint.at) return;
    // Reuse the guide's existing collectible so two cues cannot indicate competing goals.
    draw(c,s,cam,project,{time:cam.time,reduced:cam.reduced,cellOnly:true,preferred:hint.at});
  }
  // Petit repère de niveau à droite ou à gauche de la cellule de l'autre grille.
  // Le triangle indique l'altitude de l'objet ; le trait horizontal est son palier.
  function drawDepth(c,s,cam,z,project){
    if(z===(s.plane??0)||s.flight||!s.cells?.some(p=>(p.plane??0)===z))return;
    const blocked=[];
    function actor(p,r,layer=p?.plane??0){
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
      const q=project(cam,p.x,p.y,layer),size=r*q.k*cam.zoom;
      blocked.push({x:q.x-size,y:q.y-size,w:size*2,h:size*2,source:p});
    }
    for(const p of s.cells)actor(p,10);
    for(const p of s.snake||[])actor(p,15);
    for(const p of s.previousSnake||[])actor(p,15);
    for(const p of s.drones||[])actor(p,13);
    actor(s.boss,36);actor(s.flightGate,20);actor(s.rift,17);actor(s.aide?.at,17);
    if(s.shiftMode==='portal')for(const g of s.planeGates||[]){actor(g,15,0);actor(g,15,1);}
    for(const a of [s.boss?.attack,s.ecologie?.wave]){
      if(!a)continue;
      const cover=(x,y,plane)=>{
        const corners=[project(cam,x-.5,y-.5,plane),project(cam,x+.5,y-.5,plane),
          project(cam,x+.5,y+.5,plane),project(cam,x-.5,y+.5,plane)];
        const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
        const left=Math.min(...xs)-3,top=Math.min(...ys)-3;
        blocked.push({x:left,y:top,w:Math.max(...xs)+3-left,h:Math.max(...ys)+3-top});
      };
      if(a.tiles?.length){for(const p of a.tiles)cover(p.x,p.y,p.plane??a.plane??0);}
      else for(const k of a.danger||a.mask||[])cover(k%(s.width||36),Math.floor(k/(s.width||36)),a.plane??0);
    }
    c.save();c.lineJoin='round';c.lineCap='round';c.globalAlpha=1;
    for(const p of s.cells){
      if((p.plane??0)!==z)continue;
      const q=project(cam,p.x,p.y,z),u=Math.max(.78,Math.min(1.25,q.k*cam.zoom)),dir=z?-1:1;
      if(blocked.some(b=>b.source!==p&&q.x+2*u>=b.x&&q.x-2*u<=b.x+b.w&&q.y+2*u>=b.y&&q.y-2*u<=b.y+b.h))continue;
      for(const side of [1,-1]){
        if((side===1&&p.x>=s.width-1)||(side===-1&&p.x<=0))continue;
        const x=q.x+side*13*u,y=q.y;
        if(blocked.some(b=>b.source!==p&&x+6*u>=b.x&&x-6*u<=b.x+b.w&&y+7*u>=b.y&&y-7*u<=b.y+b.h))continue;
        c.beginPath();c.moveTo(x-3.6*u,y-dir*3.5*u);c.lineTo(x+3.6*u,y-dir*3.5*u);
        c.moveTo(x-3.8*u,y-dir*.4*u);c.lineTo(x,y+dir*4*u);c.lineTo(x+3.8*u,y-dir*.4*u);
        c.strokeStyle='#17232c';c.lineWidth=4.6*u;c.stroke();
        c.strokeStyle=s.year===1976?'#dcf1ab':'#dce8de';c.lineWidth=2.2*u;c.stroke();
        blocked.push({x:x-6*u,y:y-7*u,w:12*u,h:14*u});break;
      }
    }
    c.restore();
  }
  const api={choose,draw,drawDiscovery,drawDepth};if(typeof module==='object')module.exports=api;else root.SnakeMarquage=api;
})(typeof window!=='undefined'?window:globalThis);
