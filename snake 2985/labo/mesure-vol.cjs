'use strict';
// Rejouer les mêmes gestes sur trois lois de réponse. Aucun appel au navigateur.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../vol-libre.js'),'utf8');
const steering = 'clamp(error * (1-Math.exp(-12*dt)), -8*dt, 8*dt)';
if (!source.includes(steering)) throw new Error('La loi de pilotage a changé.');
const variants = [
  ['cap instantané', 'error'],
  ['rotation filtrée', steering],
  ['inertie lourde', 'clamp(error * (1-Math.exp(-4*dt)), -2.1*dt, 2.1*dt)'],
];
const output=[];
for(const [name, law] of variants) {
  const sandbox={window:{}};
  vm.runInNewContext(source.replace(steering,law),sandbox);
  const pilot=sandbox.window.SnakeFlight;
  function start(x,y,heading,turbo) {
    const dir={x:Math.cos(heading),y:Math.sin(heading)};
    const s={width:36,height:18,plane:0,snake:Array.from({length:6},(_,i)=>({x:x-i*dir.x,y:y-i*dir.y,plane:0})),
      cells:[],drones:[],direction:dir,turns:[],events:[],score:0,sector:1,novaCharge:0,status:'playing',eaten:1,turbo};
    pilot.init(s);
    s.flightGate={x,y,plane:0};
    pilot.enter(s);
    return s;
  }
  const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  let runs=0,wins=0,secondStepsClear=0,elapsed=0;
  for(const [x,y] of [[8,8],[26,6],[9,12],[28,13],[14,5],[20,11]]) for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]) {
    for(const turbo of [false,true]) for(const sampleEvery of [4,8]) {
      const s=start(x,y,heading,turbo), history=[];
      let frame=0;
      for(;frame<510 && s.flight;frame++) {
        const f=s.flight, h=s.snake[0], r=f.rings[f.passed];
        history.push(Math.atan2(r.y-h.y,r.x-h.x));
        if(frame%sampleEvery===0) {
          const delayed=history[Math.max(0,frame-9)]; // réaction visuelle simulée de 150 ms
          const noisy=delayed+.14*Math.sin(frame*1.93+x+y);
          pilot.aim(s,Math.cos(noisy),Math.sin(noisy));
        }
        pilot.step(s,1/60);
      }
      runs++;
      if(s.events.at(-1)?.success) { wins++; elapsed+=frame/60; }
      const h=s.snake[0], d=s.direction;
      if([1,2].every(n=>{
        const px=h.x+d.x*n, py=h.y+d.y*n;
        return px>=0 && py>=0 && px<36 && py<18 && !s.snake.slice(1).some(p=>p.x===px && p.y===py);
      })) secondStepsClear++;
    }
  }
  // Banc sur trajectoire rectiligne, avec oscillation de doigt reproductible ±8° à 5 Hz.
  const response=start(16,5,0,false);
  response.flight.angle=0; response.flight.targetAngle=0;
  response.flight.rings=[{x:0,y:0,radius:0}];response.flight.goal=1;
  let jitterSq=0, step90=null;
  for(let i=0;i<120;i++) {
    const angle=i<60 ? Math.PI*.0444*(Math.floor(i/6)%2 ? -1:1) : Math.PI/2;
    pilot.aim(response,Math.cos(angle),Math.sin(angle));
    pilot.step(response,1/60);
    if(i>=12 && i<60) jitterSq+=delta(0,response.flight.angle)**2;
    if(i>=60 && step90===null && Math.abs(delta(response.flight.angle,Math.PI/2))<Math.PI/18) step90=(i-59)/60;
  }
  output.push({loi:name,slaloms:wins+'/'+runs,rentreesDegagees:secondStepsClear+'/'+runs,
    dureeSucces_s:+(elapsed/wins).toFixed(2),gigueCapRMS_deg:+(Math.sqrt(jitterSq/48)*180/Math.PI).toFixed(2),
    virage90a10degres_ms:Math.round(step90*1000)});
}
console.table(output);
