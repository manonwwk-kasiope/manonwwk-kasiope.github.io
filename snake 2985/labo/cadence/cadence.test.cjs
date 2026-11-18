'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cad=require('./cadence.js');
test('pause, reprise, temps identique ou périmé et retard maximal de 80 ms',()=>{
  let steps=0;const c=cad.create(()=>steps++);c.reset(0);c.advance(40);assert.equal(steps,2);
  c.reset();c.advance(720040);assert.equal(steps,2);c.advance(720040);c.advance(720035);assert.equal(steps,2);
  c.advance(720057);assert.equal(steps,3);
  c.advance(950000);assert.equal(steps,7);
});
test('le menu survenant au milieu du rattrapage coupe le lot courant',()=>{
  let steps=0;const c=cad.create(()=>{steps++;return false;});c.reset(0);
  c.advance(70);assert.equal(steps,1);c.reset();c.advance(120000);assert.equal(steps,1);
});
test('les fractions et les timestamps arrondis ne font pas dériver les pas',()=>{
  for(const frames of [30,60,120]){
    let count=0;const c=cad.create(()=>count++,()=>count<60?60:120);c.reset(0);
    for(let i=1;i<=frames*10;i++)c.advance(Math.round(i*10000/frames)/10);
    assert.equal(count,1140);
  }
});
test('trois parties enregistrées gardent leur état en mode mixte lors des 12 rejeux',()=>{
 const {replay,tempos}=require('./mesure.cjs');
 for(const t of require('./commandes.json')){
   const ref=replay(t,tempos['60 Hz'],'fixe geste mixte');
   for(const p of Object.values(tempos)){
     const v=replay(t,p,'fixe geste mixte');
     assert.equal(v.timeline,ref.timeline);assert.equal(v.final,ref.final);assert.equal(v.score,ref.score);assert.equal(v.status,ref.status);
   }
 }
});
