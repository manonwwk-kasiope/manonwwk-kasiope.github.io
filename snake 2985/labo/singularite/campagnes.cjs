'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const pilots=require('../equilibrage/pilotes.cjs');
function setup(phase){
  const ctx={window:{}};
  const files=['../../forge.js','../moteur.js','../gardiens/gardiens.js','../equilibrage/parametres.js'];
  if(phase)files.unshift('singularite.js');
  for(const file of files)vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx);
  return ctx.window;
}
function steerTo(s,target){
  const head=s.snake[0],z=s.plane,b=s.boss,visited=new Set(),queue=[{x:head.x,y:head.y,first:null}];
  const avoid=new Set(s.snake.slice(1,-1).filter(t=>t.plane===z).map(t=>t.x+t.y*s.width));
  for(const drone of s.drones)if(drone.plane===z)for(const p of [drone,drone.next])avoid.add(p.x+p.y*s.width);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(p.first&&p.x===target.x&&p.y===target.y)return p.first;
    for(const dir of pilots.dirs){
      if(!p.first&&!pilots.legal(s,dir))continue;
      const x=p.x+dir[0],y=p.y+dir[1],key=x+y*s.width;
      if(x<0||x>=s.width||y<0||y>=s.height||visited.has(key)||avoid.has(key))continue;
      if([b,b?.next].some(p=>p&&p.plane===z&&Math.abs(p.x-x)<=1&&Math.abs(p.y-y)<=1))continue;
      if(b?.attack?.plane===z&&b.attack.phase==='active'&&b.attack.danger.has(key))continue;
      visited.add(key);queue.push({x,y,first:p.first||dir});
    }
  }
  return null;
}
function run(seed,mode,year=2985){
  const w=setup(mode!=='témoin'),eng=w.SnakeArcade,sig=w.SnakeSingularite;
  let n=seed;const s=eng.create(()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296),eng.eras.findIndex(e=>e.year===year));
  w.SnakeForge.equip(s,'prism','chain');
  const evidence={seed,mode,year,start:null,split:null,open:null,end:null,route:null,first:false,points:0,minHp:Infinity,heals:0,finalHP:0,events:[]};
  let oldHP=null;
  while(['upgrade','playing'].includes(s.status)&&s.elapsed<170){
    if(s.status==='upgrade')eng.upgrade(s,!s.levels.arc?'arc':!s.levels.rail?'rail':'nova');
    const snap=pilots.observe(s,pilots.profiles.expert),cmd=pilots.expert(s,snap),read=sig?.read(s);
    if(read?.phase==='split'&&mode==='balises'&&read.points.length){
      const target=read.points[read.index];
      if(target){
        const change=s.plane!==target.plane;
        if(change)eng.shiftPlane(s);
        const choice=steerTo(s,target);
        if(choice)cmd.d=choice;
        cmd.shift=false;
      }
    }
    if(mode==='classique'&&read?.phase==='split'&&read.index===1){
      const goal=read.points[1],head=s.snake[0];
      if(goal && Math.abs(head.x-goal.x)+Math.abs(head.y-goal.y)<=1){
        // Refus explicite de la seconde balise ; le pilote esquive avec les commandes habituelles.
        if(s.plane!==goal.plane)cmd.shift=false;
        else if(!cmd.shift&&eng.shiftPlane(s))cmd.shift=false;
      }
    }
    if(cmd.shift)eng.shiftPlane(s);
    if(cmd.fire&&read?.phase!=='split')eng.fire(s);
    eng.turn(s,...cmd.d);
    const next=(state,dt)=>w.SnakeEquilibre.tick(state,dt,w.SnakeGardiens.tick);
    if(mode==='témoin')next(s,s.stepTime);else sig.tick(s,s.stepTime,next);
    for(const e of s.events.splice(0)){
      if(e.type==='boss'&&e.kind==='final'){evidence.start=s.elapsed;oldHP=null;}
      if(evidence.start===null)continue;
      if(e.type==='singularitySplit'){evidence.split=s.elapsed;evidence.points=e.beacons.length;}
      if(e.type==='singularityBeacon')evidence.first=true;
      if(e.type==='singularityOpen'){evidence.route=e.route;evidence.open=s.elapsed;}
      if(e.type==='bossDefeated'&&e.kind==='final')evidence.end=s.elapsed;
      if(['singularitySplit','singularityBeacon','singularityOpen','guardianCounter','riftPickup','bossDefeated'].includes(e.type))evidence.events.push(e.type);
    }
    if(evidence.start!==null&&s.boss){
      if(oldHP!==null&&s.boss.hp>oldHP)evidence.heals++;
      oldHP=s.boss.hp;evidence.minHp=Math.min(evidence.minHp,oldHP);
    }
  }
  evidence.finalHP=s.boss?.hp??0;evidence.status=s.status;evidence.cause=s.cause||null;
  evidence.duration=evidence.end!==null?+(evidence.end-evidence.start).toFixed(3):null;
  return evidence;
}
const reserved=[9257,9277,9293,9311,9323,9341,9371,9391,9413,9431,9461,9479,9497,9521,9539,9551,9587,9601,9623,9643];
if(require.main===module){
  const rows=[];
  for(const seed of reserved)for(const mode of ['témoin','classique','balises'])rows.push(run(seed,mode));
  fs.writeFileSync(path.join(__dirname,'campagnes.json'),JSON.stringify(rows,null,2)+'\n');
  for(const mode of ['témoin','classique','balises']){
    const s=rows.filter(r=>r.mode===mode);console.log(mode,JSON.stringify(s.map(r=>[r.status,r.duration,r.route,r.first,r.points])));
  }
}
module.exports={setup,run,reserved};
