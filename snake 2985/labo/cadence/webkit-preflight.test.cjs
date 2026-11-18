'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const instrument=require('./webkit-page.js');
const {timeline,tempos}=require('./mesure.cjs');
test('chronomètre injecté : horodatage de gestes entre raf, même ordre, mode variable seulement dans la frame',()=>{
 const events={},mem=new Map(),ctx={document:{addEventListener(k,fn){events[k]=fn;}},
   performance:{},localStorage:{setItem(k,v){mem.set(k,v);}}};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext('('+instrument.toString()+')('+JSON.stringify({year:1995,seed:1,policy:'variable',timing:[8,35,46]})+')',ctx);
 assert.equal(JSON.parse(mem.get('snake2985.voyage.v1')).last,1995);
 const clock=ctx.SnakeCadence={create(){throw Error('Le témoin doit remplacer le pas fixe.');}};
 const result=[];
 const variable=ctx.SnakeCadence.create(dt=>result.push(dt));
 variable.reset(0);ctx.requestAnimationFrame(function frame(t){variable.advance(t);ctx.requestAnimationFrame(frame);});
 ctx.cadenceProbe.until(29);assert.deepEqual(result,[.008]);
 variable.advance(29);assert.deepEqual(result,[.008]);ctx.cadenceProbe.until(46);
 assert.deepEqual(result,[.008,.027,.011]);
});
test('observations communes aux quatre cadences et séparation des entrées',()=>{
 for(const p of Object.values(tempos)){
  const frames=timeline(p,55000),samples=frames.filter(t=>t%1000===0);
  assert.equal(samples.length,55);assert.equal(frames.at(-1),55000);
 }
});
