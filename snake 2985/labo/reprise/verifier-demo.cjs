'use strict';
// Exercise the UI event handlers in a small DOM substitute, without browser or audio.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
for(const reduced of [false,true]){
  const nodes=new Map(), keyEvents={}, store=new Map(), draw=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
  let raf,now=0;
  function node(id){if(!nodes.has(id))nodes.set(id,{getContext:()=>draw,focus(){},replaceChildren(...children){this.children=children;}});return nodes.get(id);}
  const env={document:{hidden:false,getElementById:node,createElement:()=>({}),addEventListener(){}},localStorage:{getItem:k=>store.get(k)??JSON.stringify({1985:12,2185:110,2985:88}),setItem:(k,v)=>store.set(k,v)},
    performance:{now:()=>now},requestAnimationFrame:cb=>{raf=cb;},matchMedia:()=>({matches:reduced,addEventListener(){}}),addEventListener:(type,cb)=>{keyEvents[type]=cb;}};
  env.window=env;vm.createContext(env);
  function evaluate(s){return vm.runInContext(s,env);}
  for(const p of ['../moteur.js','reprise.js','demo.js'])evaluate(fs.readFileSync(path.join(__dirname,p),'utf8'));
  evaluate('state.spawnClock=100;state.gunClock=100;state.drones=[];state.cells=[];state.score=37');
  for(let i=0;i<600&&node('review').hidden;i++){now+=1000/60;raf(now);}
  assert.equal(node('review').hidden,false);assert.match(node('cause').textContent,/Mur/);
  const end=evaluate('at'),rng=()=>{throw Error('RNG utilisé pendant la reprise');};
  env.bannedRng=rng;evaluate('state.rng=bannedRng');
  node('back').onclick();assert.equal(evaluate('at'),end-250);
  node('next').onclick();assert.equal(evaluate('at'),end);
  node('play').onclick();assert.equal(evaluate('at'),end-2000);
  now+=20;raf(now);assert.equal(evaluate('at'),end-2000+(reduced?0:20));
  node('slider').oninput({target:{value:end-400}});assert.equal(evaluate('at'),end-400);
  assert.deepEqual(Array.from(node('era').children,o=>o.value),[1976,1985,1995,2185,2985]);assert.match(node('era').children[0].textContent,/1976 · record 37/);
  assert.match(node('era').children[2].textContent,/1995 · Rail 8 bits · record 0/);
  assert.match(node('era').children[3].textContent,/2185 · record 110/);
  node('era').value='1995';node('retry').onclick();
  assert.equal(evaluate('state.year'),1995);assert.equal(evaluate('rec.death'),null);
  assert.equal(node('live').hidden,false);
  console.log(JSON.stringify({reducedMotion:reduced,death:'Mur',record:37,nextEra:1995,rangeMs:2000}));
}
