'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,ctx={window:{}};
for(const file of ['../../vol-libre.js','../moteur.js','../spectacle.js'])
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const {SnakeArcade:eng,SnakeSpectacle:view,SnakeFlight:flight}=ctx.window;
const loc=require('./locomotion.js'),methods=['linear','curve','joint'];
function scenarios(year,observe){
  function setup(){
    const s=eng.create(()=>.41,eng.eras.findIndex(e=>e.year===year));s.gunClock=s.spawnClock=10000;s.difficulty=10;s.drones=[];s.cells=[];return s;
  }
  function move(s,dir,grow,name){
    const h=s.snake[0],p={x:h.x+dir[0],y:h.y+dir[1],plane:s.plane};
    if(dir[0]!==s.direction.x||dir[1]!==s.direction.y)eng.turn(s,...dir);
    s.cells=grow?[p]:[];
    // Les portes du vol sont testées séparément.
    s.nextFlightCell=Infinity;
    for(let i=0;i<40&&s.snake[0]===h;i++){
      eng.tick(s,1/60);observe(name,s);
      if(s.status!=='playing')throw Error(s.cause||s.status);
    }
  }
  const s=setup();
  for(const dir of [[1,0],[1,0],[0,-1],[0,-1],[-1,0],[-1,0],[0,-1],[1,0],[1,0],[1,0]])move(s,dir,true,'virage');
  eng.shiftPlane(s);
  for(let i=0;i<5;i++)move(s,[1,0],false,'bascule');
  const long=setup();
  for(let row=0;row<5;row++){
    const dx=row%2?-1:1,limit=dx===1?33:2;
    while(long.snake[0].x!==limit)move(long,[dx,0],true,'queue');
    move(long,[0,-1],true,'queue');
  }
  const air=setup();air.eaten=1;
  if(!flight.offer(air))throw Error('porte absente');
  while(air.snake[0].x!==air.flightGate?.x&&!air.flight)move(air,[1,0],false,'entrée');
  if(!air.flight)throw Error('entrée en vol absente');
  for(let i=0;i<120&&air.flight;i++){
    const h=air.snake[0],ring=air.flight.rings[air.flight.passed];
    if(ring)eng.turn(air,ring.x-h.x,ring.y-h.y);
    eng.tick(air,1/60);observe('vol',air);
  }
}
function points(s,cam){
  return s.snake.map((p,i)=>{
    const prev=s.previousSnake[i]||p,k=s.flight?1:s.progress,z=p.plane??0;
    let alt=z;if(!i&&s.planeShift)alt=cam.level;else if((prev.plane??z)!==z)alt=(prev.plane??z)+(z-(prev.plane??z))*k;
    return {...view.project(cam,prev.x+(p.x-prev.x)*k,prev.y+(p.y-prev.y)*k,alt),plane:z};
  });
}
const scores={},samples={};
for(const year of [1976,1985,1995,2185,2985]){
  let seq=0;
  scenarios(year,(scene,s)=>{
    if(seq++%3||scene==='entrée')return;
    const cam=view.camera(s,s.elapsed,false),base=points(s,cam);
    for(const m of methods){
      const a=loc.transform(s,cam,base,s.elapsed,false,view.project,m);
      const row=scores[[year,scene,m]]||={frames:0,longueur:0,écartTête:0,écartCorps:0,angleTête:0,centresHorsCase:0,liaisonsHorsCases:0,angleCorpsMax:0};
      row.frames++;row.longueur=Math.max(row.longueur,a.length);
      const bodies=new Set(s.snake.map(p=>[p.x,p.y,p.plane??0].join(',')));
      for(const [i,q] of a.entries()){
        const p=s.snake[i],d=Math.hypot(p.x-q.wx,p.y-q.wy),k=i?'écartCorps':'écartTête';
        row[k]=Math.max(row[k],d);
        if(i&&scene!=='vol'&&Math.max(Math.abs(q.wx-p.x),Math.abs(q.wy-p.y))>.5)row.centresHorsCase++;
        if(!i){
          const dir=s.flight?{x:Math.cos(s.flight.angle),y:Math.sin(s.flight.angle)}:s.direction;
          const t=view.project(cam,p.x+dir.x,p.y+dir.y,q.plane),center=view.project(cam,p.x,p.y,q.plane);
          const err=q.angle-Math.atan2(t.y-center.y,t.x-center.x);
          row.angleTête=Math.max(row.angleTête,Math.abs(Math.atan2(Math.sin(err),Math.cos(err)))*180/Math.PI);
        }else if(scene!=='vol'&&q.plane===a[i-1].plane){
          const lead=a[i-1],err=q.angle-Math.atan2(lead.y-q.y,lead.x-q.x);
          row.angleCorpsMax=Math.max(row.angleCorpsMax,Math.abs(Math.atan2(Math.sin(err),Math.cos(err)))*180/Math.PI);
          for(const t of [.2,.4,.6,.8]){
            const key=[Math.round(q.wx+(lead.wx-q.wx)*t),Math.round(q.wy+(lead.wy-q.wy)*t),q.plane].join(',');
            if(!bodies.has(key))row.liaisonsHorsCases++;
          }
        }
      }
      if(m==='joint'&&year===2985&&((scene==='queue'&&a.length>=145)||scene==='vol'||scene==='virage'||scene==='bascule')){
        const key=scene;
        const count=samples[key] ||= [];
        const frame=scene==='queue'?a.length:row.frames;
        if(count.length<5&&(scene==='queue'?frame%3===0&&count.at(-1)?.points.length!==a.length:frame%({'vol':6,'virage':6,'bascule':2}[scene])===0)){
          const lines=[];let pen=[];
          const c={save(){},restore(){},beginPath(){pen=[];},moveTo(x,y){pen.push([x,y]);},lineTo(x,y){pen.push([x,y]);},stroke(){lines.push({pts:pen,ink:this.strokeStyle,w:this.lineWidth});}};
          loc.overlay(c,s,cam,a,0,s.elapsed,false,view.project);loc.overlay(c,s,cam,a,1,s.elapsed,false,view.project);
          count.push({year,scene,time:s.elapsed,lines,points:a.map(p=>({x:p.x,y:p.y,z:p.plane,angle:p.angle,k:p.k*cam.zoom,scale:p.scale,pulse:p.pulse}))});
        }
      }
    }
  });
}
for(const r of Object.values(scores))for(const k in r)if(typeof r[k]==='number')r[k]=+r[k].toFixed(4);
if(require.main===module){
  fs.writeFileSync(path.join(root,'mesures.json'),JSON.stringify(scores,null,2)+'\n');
  fs.writeFileSync(path.join(root,'poses.json'),JSON.stringify(samples)+'\n');
}
module.exports={scores,samples};
