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
  const api={choose,draw,drawDiscovery};if(typeof module==='object')module.exports=api;else root.SnakeMarquage=api;
})(typeof window!=='undefined'?window:globalThis);
