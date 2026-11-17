'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../vol-libre.js');
const flight = window.SnakeFlight;

function state(x=10,y=8) {
  const s = {width:36,height:18,plane:0,snake:Array.from({length:8},(_,i)=>({x:x-i,y,plane:0})),
    cells:[],drones:[],direction:{x:1,y:0},turns:[],events:[],score:0,sector:1,novaCharge:0,
    status:'playing',eaten:1};
  flight.init(s);
  return s;
}
test('première cellule, entrée sur case ou par commande, puis fréquence de trois', () => {
  const s = state();
  s.eaten = 0;
  assert.equal(flight.offer(s),false);
  s.eaten++;
  assert(flight.offer(s));
  assert.deepEqual(s.flightGate,{x:13,y:8,plane:0});
  assert.equal(flight.cross(s),false);
  s.snake[0] = {...s.flightGate};
  assert(flight.cross(s));
  assert(flight.land(s));
  s.eaten = 3;
  assert.equal(flight.offer(s),false);
  s.eaten = 4;
  assert(flight.offer(s));
  s.plane = 1;
  assert.equal(flight.enter(s),false);
  s.plane = 0;
  assert(flight.enter(s));
});
test('slalom tactile échantillonné à 15 Hz, inertie, tangentes, bonus et recharge', () => {
  for (const turbo of [false,true]) {
    const s = state();
    s.turbo = turbo;
    flight.offer(s); flight.enter(s);
    let curved = false;
    for (let i=0;s.flight && i<600;i++) {
      const f=s.flight, next=f.rings[f.passed], h=s.snake[0];
      if (i%4===0) flight.aim(s,next.x-h.x,next.y-h.y);
      const angle=f.angle;
      flight.step(s,1/60);
      assert(Math.abs(f.angle-angle)<=8/60+.000001);
      if (s.flight && i>20) curved ||= Math.abs(s.snake[0].y-s.snake[1].y)>.15;
      assert.equal(s.snake.length,8);
    }
    assert(curved);
    assert.equal(s.events.filter(e=>e.type==='flightRing').length,3);
    const end=s.events.at(-1);
    assert.equal(end.success,true);
    assert.equal(s.score,end.points);
    assert(s.novaCharge>0);
    assert.equal(Math.abs(s.direction.x)+Math.abs(s.direction.y),1);
    assert(s.snake.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)));
    assert.equal(new Set(s.snake.map(p=>p.x+36*p.y)).size,8);
    s.snake.slice(1).forEach((p,i)=> assert.equal(Math.abs(p.x-s.snake[i].x)+Math.abs(p.y-s.snake[i].y),1));
  }
});
test('sorties du vol sur 4 bords, deux plans, drones, futur boss, tirs, faille et élan', () => {
  let trials=0;
  for (const plane of [0,1]) for (const [x,y] of [[.1,8],[34.9,8],[16,.1],[16,16.9],[16,8]]) {
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const s=state();
      s.plane=plane;
      s.snake.forEach(p=>p.plane=plane);
      flight.offer(s); flight.enter(s);
      s.snake=s.snake.map((p,i)=>({x:x-i*dx,y:y-i*dy,plane}));
      s.direction={x:dx,y:dy};
      const cx=Math.round(x), cy=Math.round(y);
      s.rift={x:cx,y:cy,plane};
      s.boss={x:cx+2,y:cy,plane,next:{x:cx+3,y:cy,plane},
        attack:{plane,danger:new Set([cx+(cy+1)*36])}};
      s.drones=[{x:cx-2,y:cy,plane,next:{x:cx-1,y:cy,plane}}];
      assert(flight.land(s)); assert.equal(s.status,'playing');
      const h=s.snake[0], d=s.direction;
      for (let k=0;k<=2;k++) {
        const px=h.x+d.x*k, py=h.y+d.y*k;
        assert(px>=0 && py>=0 && px<36 && py<18);
        assert(!(px===cx && py===cy));
        assert(!s.boss.attack.danger.has(px+36*py));
        for (const b of [s.boss,s.boss.next]) assert(Math.max(Math.abs(px-b.x),Math.abs(py-b.y))>1);
        for (const t of [...s.drones,s.drones[0].next,...s.snake.slice(1)]) assert(!(px===t.x && py===t.y));
      }
      trials++;
    }
  }
  assert.equal(trials,40);
});
test('collision physique conditionnée au plan, pénalité de traversée et temps limité', () => {
  const s=state();
  flight.offer(s); flight.enter(s);
  s.drones=[{...s.snake[0],plane:1,warmup:0}];
  flight.step(s,1/60); assert(s.flight);
  s.drones[0].plane=0;
  flight.step(s,1/60); assert.equal(s.flight,null);
  assert.equal(s.events.at(-1).cause,'Drone');
  assert.equal(s.events.at(-1).success,false);
  assert.equal(s.score,0);
  s.eaten=4; flight.offer(s); flight.enter(s);
  s.drones=[]; s.flight.remaining=.001;
  flight.step(s,1/60);
  assert.equal(s.events.at(-1).cause,'Temps écoulé');
});
