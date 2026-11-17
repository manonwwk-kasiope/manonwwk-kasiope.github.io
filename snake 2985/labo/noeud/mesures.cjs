'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const knot=require('./noeud.js'),demo=require('./parcours.js');
const ctx={window:{}};
for(const f of ['../../forge.js','../moteur.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
const base=ctx.window.SnakeForge;
for(const mode of ['exact','assist']){
  const successes=[];
  let surface,perimeter;
  for(let delay=0;delay<42;delay++){
    const {engine,forge}=knot.install(ctx.window.SnakeArcade,base,{mode});ctx.window.SnakeForge=forge;
    const d=demo.create(engine,mode);
    for(let i=0;i<900 && !(d.ready&&d.s.knot.preview);i++)d.tick();
    const p=d.s.knot.preview;surface=p.area;perimeter=p.points.length;
    for(let i=0;i<delay;i++)d.tick();
    if(d.s.status==='playing')engine.shiftPlane(d.s);
    for(let i=0;i<60&&d.s.status==='playing'&&!d.s.knot.closures;i++)d.tick();
    if(d.s.knot.closures)successes.push(delay);
  }
  console.log(JSON.stringify({mode,surface,perimeter,successfulDelaysFrames60Hz:successes}));
}
