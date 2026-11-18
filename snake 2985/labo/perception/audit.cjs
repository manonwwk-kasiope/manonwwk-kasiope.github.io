'use strict';
// Recreate the frozen scene setup for evaluation only. The blind reader never loads this file.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const labels=require('./annotations.json'),sources=require('./sources.json'),crypto=require('node:crypto');
const files=['../../forge.js','../moteur.js','../surcharges/surcharges.js','../spectacle.js','corpus.js'];
const env={SnakeSprites:{},SnakeArtillerie:{},SnakeMondes:{},SnakeLocomotion:{},SnakePhosphore:{},SnakeSurchargeFX:{}};
env.window=env;vm.createContext(env);
for(const f of files){
  const bytes=fs.readFileSync(path.resolve(__dirname,f)),expected=sources[f];
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Audit exige source capturée '+f);
  let code=bytes.toString();if(f==='corpus.js')code=code.replace('window.perceptionRender=render','window.onlyAudit=scene;window.perceptionRender=render');
  vm.runInContext(code,env);
}
const out={};
for(const a of labels.filter(a=>a.split==='holdout'&&a.ablation==='normal')){
  const i=(a.seed-790907-a.year*23)/131,{s}=env.onlyAudit(a.year,i,true),cam=env.SnakeSpectacle.camera(s,s.elapsed,a.reduced);
  const obj=(p,tag)=>{const q=env.SnakeSpectacle.project(cam,p.x,p.y,p.plane);return {tag,x:q.x*.4,y:q.y*.4,gx:p.x,gy:p.y,plane:p.plane};};
  const os=[...s.snake.map((p,i)=>obj(p,i?'corps':'tete')),...s.cells.map(p=>obj(p,'cellule')),
    ...s.drones.map(p=>obj(p,'drone')),...(s.forge.orbits||[]).map(p=>obj(p,'orbite')),obj(s.boss,'gardien'),
    ...(s.flight?.rings||[]).map(p=>obj({...p,plane:s.plane},'anneau')),
    ...(s.boss.attack?.tiles||[]).map(p=>obj(p,'masque'))];
  out[a.id]=os;
}
fs.writeFileSync(path.join(__dirname,'audit.json'),JSON.stringify(out));
