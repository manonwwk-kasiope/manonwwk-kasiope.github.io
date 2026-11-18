'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const art=require('./artillerie.js');
const ctx={window:{}};
for(const file of ['../../forge.js','../moteur.js']){
  let src=fs.readFileSync(path.join(__dirname,file),'utf8');
  if(file.endsWith('moteur.js'))src=src.replace('window.SnakeArcade = {','window.SnakeArcade = {forgeHooks,shoot,');
  vm.runInNewContext(src,ctx);
}
const {SnakeArcade:engine,SnakeForge:forge}=ctx.window;
function state(year,kind){
  const s=engine.create(()=>.2,engine.eras.findIndex(e=>e.year===year));s.effects=[];s.drones=[];
  const head=s.snake[0];
  if(['rail','arc','nova'].includes(kind)){
    if(kind==='nova'){s.novaRadius=3.4;engine.fire(s);s.effects=s.effects.filter(e=>e.kind==='nova');s.effects.forEach(p=>p.life*=.43);}
    else {
      const p={x:head.x-2,y:head.y+2,plane:0};
      s.drones=[{...p,next:p,id:101,warmup:0,moveIn:1000}];s.levels.arc=1;
      engine.shoot(s);s.shots=s.shots.filter(p=>p.kind===kind);s.effects=[];
    }
  }else{
    const core=({orbit:'orbit',prism:'prism',shard:'prism',well:'well',echo:'orbit',chain:'orbit',blast:'orbit'})[kind];
    const mod=['echo','chain','blast'].includes(kind)?kind:'chain';
    if(kind==='chain'||kind==='blast'){
      s.drones=[[2,0],[4,1]].map(([x,y],i)=>({x:head.x+x,y:head.y+y,plane:0,id:100+i,warmup:0}));
    }
    forge.equip(s,core,mod);
    const steps={orbit:9,prism:7,shard:39,well:3,echo:26,chain:1,blast:12}[kind];
    for(let i=0;i<steps;i++)forge.update(s,1/60,engine.forgeHooks(s));
    s.effects=[];
    if(['echo','chain','blast'].includes(kind)){
      s.forge.orbits=[];s.forge.projectiles=[];s.forge.effects=s.forge.effects.filter(p=>p.kind===kind);
    }else s.forge.effects=[];
  }
  return s;
}
function record(s,z=0,reduced=false,time=.35,projection=(cam,x,y)=>({x,y})){
  const paths=[];let pts=[];
  const c={save(){},restore(){},beginPath(){pts=[];},moveTo(x,y){pts.push([x,y]);},lineTo(x,y){pts.push([x,y]);},closePath(){},stroke(){paths.push({points:pts,color:this.strokeStyle,width:this.lineWidth});},fill(){paths.push({points:pts,color:this.fillStyle,fill:true});}};
  art.draw(c,s,{},z,time,reduced,projection);
  return paths;
}
const kinds=['orbit','prism','shard','well','echo','chain','blast','rail','arc','nova'];
if(require.main===module){
  const out={};
  for(const year of [1976,1985,1995,2185,2985]){
    for(const kind of kinds){
      const s=state(year,kind),paths=record(s,0,false,.1,(cam,x,y)=>({x:x*19,y:y*14}));out[year+':'+kind]=paths;
    }
  }
  process.stdout.write(JSON.stringify(out));
}
module.exports={state,record,kinds};
