'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const env={};env.window=env;vm.createContext(env);
for(const f of ['../../forge.js','../../vol-libre.js','../moteur.js','../gardiens/gardiens.js','../rythme/directeur.js','../campagne/impact.js','replay.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),env);
const results=env.SnakeGalerie.years.map(y=>{
  const first=env.SnakeGalerie.facts(env.SnakeGalerie.make(y).s);
  assert.deepEqual(first,env.SnakeGalerie.facts(env.SnakeGalerie.make(y).s));return first;
});
assert.ok(results[1].crossing>0);assert.equal(results[2].offer,'aiguillage');assert.ok(results[3].flightRings>0);
assert.ok(results[4].nova&&results[4].shots>0&&results[4].boss==='La Singularité');
console.log(JSON.stringify(results,null,2));
