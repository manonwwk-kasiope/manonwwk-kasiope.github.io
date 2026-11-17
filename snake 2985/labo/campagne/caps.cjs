'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const w={};for(const name of ['../spectacle.js','pilotage.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,name),'utf8'),{window:w,Math});
const project=w.SnakeSpectacle.project;
const samples=[], plain=[], diff=(ax,ay,bx,by)=>Math.abs(Math.atan2(ax*by-ay*bx,ax*bx+ay*by))*180/Math.PI;
for(const area of [[568,320],[852,275],[844,390],[1366,768]])for(const plane of [0,1])for(const x of [1,17,34])for(const y of [1,8,16])for(const angle of Array.from({length:16},(_,i)=>i*Math.PI/8))for(const frame of ['grid','cross','flight']){
  const a={plane,snake:[{x,y}],flight:frame==='flight'?{total:8,remaining:5,angle}:null,planeShift:frame==='cross'?{from:1-plane,to:plane,remaining:.17,total:.35}:null};
  const cam=w.SnakeSpectacle.camera(a,2,false), sx=area[0]/960,sy=area[1]/440;
  const cap=w.SnakePilotage.cap(project,cam,a.snake[0],plane,angle,sx,sy);
  function error(dx,dy){
    const p=project(cam,x,y,plane),n=project(cam,x+dx*.08,y+dy*.08,plane);
    return diff(Math.cos(angle),Math.sin(angle),(n.x-p.x)*sx,(n.y-p.y)*sy);
  }
  samples.push(error(cap.x,cap.y));plain.push(error(Math.cos(angle),Math.sin(angle)));
}
function interval(values){values.sort((a,b)=>a-b);return {median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};}
const report={hypothese:'Écart entre la direction du doigt et le déplacement projeté à l’écran, en degrés.',samples:samples.length,corrected:interval(samples),direct:interval(plain)};
assert.ok(report.corrected.max<.08);assert.ok(report.direct.p95>10);console.log(JSON.stringify(report,null,2));
