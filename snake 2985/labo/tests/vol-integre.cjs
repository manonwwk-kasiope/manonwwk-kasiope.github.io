'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
global.window={};
require('../../forge.js');
require('../../vol-libre.js');
require('../moteur.js');

test('96 départs depuis 1976 : franchissement, salves en vol et deux pas après sortie', () => {
  const engine=window.SnakeArcade;
  const totals={entrees:0,reussites:0,ejections:0,salvesEnVol:0,reprises:0};
  for (let seed=0;seed<96;seed++) {
    let v=seed;
    const s=engine.create(()=>((v=(Math.imul(v,1664525)+1013904223)>>>0)/4294967296));
    let shot=false, ended=false;
    for (let i=0;i<900 && s.status==='playing';i++) {
      const flying=Boolean(s.flight);
      if (flying && i%4===0) {
        const ring=s.flight.rings[s.flight.passed], head=s.snake[0];
        engine.turn(s,ring.x-head.x,ring.y-head.y);
      }
      s.events.length=0;
      engine.tick(s,1/60);
      if (s.events.some(e=>e.type==='flightStart')) totals.entrees++;
      if (flying && s.events.some(e=>e.type==='forgeShot')) shot=true;
      const end=s.events.find(e=>e.type==='flightEnd');
      if (end) {
        if (end.success) totals.reussites++;
        else { assert.equal(end.cause,'Drone'); totals.ejections++; }
        ended=true; break;
      }
    }
    assert(ended);
    if (shot) totals.salvesEnVol++;
    engine.tick(s,s.stepTime*2+.001);
    if (s.status==='playing') totals.reprises++;
  }
  console.log(totals);
  assert.equal(totals.entrees,96);
  assert.equal(totals.reprises,96);
  assert(totals.reussites>0 && totals.ejections>0);
  assert(totals.salvesEnVol>0);
});
