'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.window={};require('../moteur.js');require('../gardiens/gardiens.js');require('./parametres.js');
const e=window.SnakeArcade,g=window.SnakeGardiens,b=window.SnakeEquilibre;
test('ouverture protégée : le drone contigu ne dérobe aucune des premières cases',()=>{
  for(const year of [1976,1985,1995,2185,2985]){
    const s=e.create(()=>.5,year);
    const d=s.drones[0];
    Object.assign(d,{x:10,y:9,plane:0,next:{x:9,y:9,plane:0},warmup:0,moveIn:.001});
    b.tick(s,s.stepTime,g.tick);
    assert.equal(s.status,'playing');
    assert.equal(s.snake[0].x,10);
    assert(d.warmup>2);
  }
});
test('à forte intensité la recharge atteint exactement 100 % et la nova peut partir',()=>{
  const s=e.create(()=>.5,2985);s.novaCharge=.99999;s.difficulty=10;
  b.tick(s,1/60,g.tick,'tendue');
  assert.equal(s.novaCharge,1);assert(e.fire(s));
});
test('le témoin délègue au moteur de référence, même ordre des événements',()=>{
  const a=e.create(()=>.5,1995),c=e.create(()=>.5,1995);
  g.tick(a,.81);b.tick(c,.81,g.tick,'temoin');
  assert.deepEqual(a.snake,c.snake);assert.deepEqual(a.events,c.events);assert.equal(a.novaCharge,c.novaCharge);
});
