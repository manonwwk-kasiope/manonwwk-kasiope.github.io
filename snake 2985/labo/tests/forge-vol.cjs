'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const lab = path.resolve(__dirname, '..');
const ctx = { window: {} };
for (const file of ['../vol-libre.js', '../forge.js', 'moteur.js'])
  vm.runInNewContext(fs.readFileSync(path.join(lab,file),'utf8'), ctx);
const { SnakeForge:forge, SnakeArcade:engine, SnakeFlight:flight } = ctx.window;
for (const {id:core} of forge.cores) for (const {id:mod} of forge.mods) {
  test('Vol oblique et tir sur le plan de vol : '+core+' / '+mod, () => {
    const s = engine.create(() => .2,2);
    s.drones = [];
    s.gunClock = s.spawnClock = 1000;
    s.eaten = 1;
    assert(flight.offer(s));
    s.snake[0] = {...s.flightGate};
    assert(flight.cross(s));
    assert(Math.abs(s.direction.x * s.direction.y) > .001);
    forge.equip(s,core,mod);
    const h = s.snake[0];
    const tile = { x: Math.round(h.x + 2.5*s.direction.x), y:Math.round(h.y + 2.5*s.direction.y) };
    s.drones = [0,1].map(plane => ({
      ...tile, next:{...tile,plane}, id:41+plane, plane, warmup:0, moveIn:100, moveEvery:100,
    }));
    for (let i = 0; i < 30; i++) engine.tick(s,1/60);
    assert(s.flight && s.status === 'playing');
    assert(s.events.some(e=>e.type === 'forgeHit' && e.core === core && e.mod === mod));
    assert(!s.drones.some(d=>d.id === 41));
    assert(s.drones.some(d=>d.id === 42));
  });
}
