'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../moteur.js');
const engine = window.SnakeArcade;
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (x, y) => x + 36 * y;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// The pilot observes the same hull, announced cells and snake as the player.
// It chooses food via breadth-first search and circles armed bosses within arc range.
function chooseDirection(s) {
  const head = s.snake[0], boss = s.boss;
  const blocked = new Set(s.snake.slice(1, -1).filter(p => p.plane === s.plane).map(p => key(p.x, p.y)));
  for (const drone of s.drones.filter(d => d.plane === s.plane)) {
    blocked.add(key(drone.x, drone.y));
    blocked.add(key(drone.next.x, drone.next.y));
  }
  if (boss) {
    for (const center of [boss, boss.next]) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) blocked.add(key(center.x + dx, center.y + dy));
      }
    }
  }
  const threatened = (x, y) => boss?.attack?.plane === s.plane && boss.attack.tiles.some(p => x === p.x && y === p.y);
  const goals = new Set(s.cells.filter(p => p.plane === s.plane).map(p => key(p.x, p.y)));
  const queue = [{ ...head, first: null, steps: 0 }];
  const seen = new Set([key(head.x, head.y)]);
  let best = null, bestValue = -Infinity;
  for (let i = 0; i < queue.length; i++) {
    const { x, y, first, steps } = queue[i];
    if (first) {
      if (!boss && goals.has(key(x, y))) return first;
      if (s.rift && x === s.rift.x && y === s.rift.y && !threatened(x, y)) return first;
      let value = -steps;
      if (boss) {
        const radius = Math.max(Math.abs(x - boss.x), Math.abs(y - boss.y));
        value -= Math.abs(radius - 3.2) * 5;
        if (x === boss.x || y === boss.y) value += 1.4;
        if (threatened(x, y)) value -= boss.attack.remaining < .7 || boss.attack.phase === 'active' ? 26 : 5;
        for (const [dx, dy] of directions) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < s.width && ny >= 0 && ny < s.height && !blocked.has(key(nx, ny))) value += .32;
        }
      }
      if (value > bestValue) { bestValue = value; best = first; }
    }
    if (boss && steps > 9) continue;
    for (const dir of directions) {
      const [dx, dy] = dir, nx = x + dx, ny = y + dy;
      if (!first && dx * s.direction.x + dy * s.direction.y < 0) continue;
      if (nx < 0 || nx >= s.width || ny < 0 || ny >= s.height) continue;
      if (blocked.has(key(nx, ny)) || seen.has(key(nx, ny))) continue;
      if (threatened(nx, ny) && (boss.attack.phase === 'active'
        || boss.attack.remaining < (steps + 2) * s.stepTime)) continue;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny, first: first || dir, steps: steps + 1 });
    }
  }
  return best;
}

function simulate(index, seed, inspect = () => {}, shiftMode = 'free') {
  const s = engine.create(randomFrom(seed), index, { shiftMode });
  const events = [];
  for (let step = 0; step < 6000 && ['playing', 'upgrade'].includes(s.status); step++) {
    if (s.status === 'upgrade') {
      const id = !s.levels.arc ? 'arc' : !s.levels.rail ? 'rail' : 'nova';
      engine.upgrade(s, id);
    }
    const head = s.snake[0];
    if (s.flight) {
      const ring = s.flight.rings[s.flight.passed];
      engine.turn(s, ring.x - head.x, ring.y - head.y);
      engine.tick(s, 1/30);
      events.push(...s.events.splice(0));
      inspect(s);
      continue;
    }
    const readyTarget = s.boss
      ? distance(s.boss, head) < s.novaRadius - 1
      : s.drones.some(d => distance(d, head) < 4);
    if (s.novaCharge === 1 && readyTarget) engine.fire(s);
    if (s.status === 'playing') {
      if (s.boss && s.plane !== s.boss.plane) engine.shiftPlane(s);
      let dir = chooseDirection(s);
      if (!dir && engine.shiftPlane(s)) dir = chooseDirection(s);
      if (dir) engine.turn(s, ...dir);
      engine.tick(s, s.stepTime);
    }
    events.push(...s.events.splice(0));
    inspect(s);
  }
  return { s, events };
}

test('exactement cinq temporalités, trois armes originales par date', () => {
  assert.deepEqual(engine.eras.map(era => era.year), [1976, 1985, 1995, 2185, 2985]);
  assert.equal(new Set(engine.eras.flatMap(era => era.weapons)).size, 15);
  assert.equal(new Set(engine.eras.flatMap(era => era.bosses)).size, 10);
});

for (let i = 0; i < engine.eras.length; i++) {
  test(engine.eras[i].year + ' : dix crans, deux boss, salves et libération du niveau', () => {
    const warned = new WeakMap();
    let active = false;
    const { s, events } = simulate(i, 1, state => {
      const attack = state.boss?.attack;
      if (!attack) return;
      if (attack.phase === 'warning') {
        assert(attack.tiles.length >= 10);
        assert(attack.tiles.every(p => p.x >= 0 && p.x < state.width && p.y >= 0 && p.y < state.height));
        if (!warned.has(attack)) warned.set(attack, attack.tiles.map(p => key(p.x, p.y)));
      }
      if (attack.phase === 'active') {
        assert.deepEqual(attack.tiles.map(p => key(p.x, p.y)), warned.get(attack));
        active = true;
      }
    });
    assert(active);
    assert.equal(s.status, s.year === 2985 ? 'won' : 'cleared');
    assert.deepEqual(events.filter(e => e.type === 'sector').map(e => e.difficulty), [2,3,4,5,6,7,8,9,10]);
    assert.deepEqual(events.filter(e => e.type === 'boss').map(e => e.kind), ['mid','final']);
    assert.deepEqual(events.filter(e => e.type === 'bossDefeated').map(e => e.name), engine.eras[i].bosses);
    assert(events.some(e => e.type === 'riftOpen'));
    assert.equal(events.filter(e => e.type === 'win' || e.type === 'clear').length, 1);
    const oldScore = s.score;
    engine.tick(s, 60);
    assert.equal(s.score, oldScore);
  });
}

test('presses et relâchements turbo préservent la fraction de case, score doublé', () => {
  const a = engine.create(randomFrom(7)), b = engine.create(randomFrom(7));
  engine.tick(a, a.stepTime / 3);
  const phase = a.stepClock / a.stepTime;
  engine.turbo(a, true);
  assert.equal(a.stepTime, a.normalStepTime * .6);
  assert(Math.abs(a.stepClock / a.stepTime - phase) < 1e-10);
  engine.turbo(a, false);
  assert(Math.abs(a.stepClock / a.stepTime - phase) < 1e-10);
  engine.turbo(b, true);
  for (const s of [a, b]) {
    while (s.eaten === 0 && s.status === 'playing') engine.tick(s, s.stepTime);
  }
  assert.equal(a.eaten, 1);
  assert.equal(b.eaten, 1);
  assert.equal(b.score, a.score * 2);
});

test('faille atteinte en pilotage réel : nova, gel du boss et coffre vulnérable', () => {
  let opened = false, captured = false;
  const { s, events } = simulate(0, 2, state => {
    if (state.rift) {
      assert(state.rift.remaining > 0 && state.rift.total === 7);
      opened = true;
    }
    if (state.riftUsed && !captured) {
      assert(opened);
      assert.equal(state.rift, null);
      assert.equal(state.novaCharge, 1);
      assert(state.boss.stun >= 3 - state.stepTime);
      assert.equal(state.boss.attack, null);
      assert(state.boss.weak);
      captured = true;
    }
  });
  assert(captured);
  assert.equal(events.filter(e => e.type === 'riftPickup').length, 1);
  assert.deepEqual(s.finishers, ['arc', 'arc']);
  assert.equal(s.bonus, null);
});

test('une finition différente sur chacun des boss attribue la prime une seule fois', () => {
  const { s, events } = simulate(1, 8);
  assert.equal(s.finishers.length, 2);
  assert.notEqual(s.finishers[0], s.finishers[1]);
  assert.deepEqual(s.bonus, { name: 'Double signature', points: 2000 });
  assert.equal(events.filter(e => e.type === 'bonus').length, 1);
  assert.equal(engine.fire(s), false);
  assert.equal(engine.create(randomFrom(1), 0).score, 0);
});

test('arène panoramique, première cellule sur l’axe et spawns libres', () => {
  for (const [index] of engine.eras.entries()) {
    const s = engine.create(randomFrom(8), index);
    assert.equal(s.width, 36);
    assert.equal(s.height, 18);
    assert.equal(s.width / s.height, 2);
    assert.deepEqual(s.direction, { x: 1, y: 0 });
    const first = s.cells[0], start = s.snake[0];
    assert.equal(first.y, start.y);
    assert.equal(first.x - start.x, 4);
    const occupied = new Set();
    for (const point of [...s.snake, ...s.cells, ...s.drones]) {
      assert(point.x >= 0 && point.x < s.width && point.y >= 0 && point.y < s.height);
      const tile = key(point.x, point.y);
      assert(!occupied.has(tile));
      occupied.add(tile);
    }
    for (let i = 0; i < 4; i++) engine.tick(s, s.stepTime);
    assert.equal(s.status, 'playing');
    assert.equal(s.eaten, 1);
    assert.equal(s.snake.length, 6);
  }
});

function practice(mode = 'free') {
  const s = engine.create(randomFrom(1), 0, { shiftMode: mode });
  s.gunClock = s.spawnClock = Infinity;
  s.drones.length = 0;
  return s;
}

function drone(s, x, y, plane) {
  const d = { x, y, plane, id: s.nextId++, next: { x, y, plane }, warmup: 0, moveIn: Infinity, moveEvery: 1 };
  s.drones.push(d);
  return d;
}

test('plonger et remonter conserve la profondeur de chaque tronçon ; le virage reste cardinal', () => {
  const s = practice();
  const old = structuredClone(s.snake);
  assert(engine.shiftPlane(s));
  assert.deepEqual(s.previousSnake, old);
  assert.deepEqual(s.snake.map(p => p.plane), [1,0,0,0,0]);
  assert.equal(s.planeShift.from, 0);
  assert(!engine.shiftPlane(s));
  engine.tick(s, s.stepTime);
  assert.deepEqual(s.snake.map(p => p.plane), [1,1,0,0,0]);
  engine.turn(s, 0, -1);
  engine.tick(s, 2 * s.stepTime);
  assert.equal(s.snake[0].x, 10);
  assert.equal(s.snake[0].y, 7);
  assert(engine.shiftPlane(s));
  assert.equal(s.plane, 0);
});

test('les cellules coïncidentes appartiennent à deux grilles ; la prime et les remplacements suivent le plan', () => {
  const s = practice();
  s.cells = [ { x: 10, y: 9, plane: 0 }, { x: 10, y: 9, plane: 1, bonus: true } ];
  engine.tick(s, s.stepTime);
  assert.equal(s.eaten, 1);
  assert.equal(s.score, 125);
  assert(engine.shiftPlane(s));
  assert.equal(s.eaten, 2);
  assert.equal(s.score, 325);
  assert.deepEqual(s.cells.map(c => c.plane).sort(), [0,1]);
  assert.equal(s.snake.length, 7);
});

test('sauvetage devant un drone : bascule libre hors porte, refus hors porte en variante portail', () => {
  for (const mode of ['free', 'portal']) {
    const s = practice(mode);
    drone(s, 10, 9, 0);
    assert.equal(engine.shiftPlane(s), mode === 'free');
    engine.tick(s, s.stepTime);
    assert.equal(s.status, mode === 'free' ? 'playing' : 'dead');
  }
  const s = practice('portal');
  engine.tick(s, s.stepTime);
  assert(engine.shiftPlane(s));
  const approaching = drone(s, 9, 9, 0);
  approaching.next = {x: 10, y: 9, plane: 0};
  approaching.moveIn = 0;
  engine.tick(s, .01);
  assert.equal(s.status, 'playing');
});

test('le rail, l’arc et la nova ignorent les cibles alignées sur le plan opposé', () => {
  for (const gun of ['rail','arc','nova']) {
    const s = practice();
    const y = gun === 'arc' ? 10 : 9;
    const active = drone(s, 11, y, 0), other = drone(s, 11, y, 1);
    if (gun === 'nova') engine.fire(s);
    else {
      s.levels.arc = gun === 'arc' ? 1 : 0;
      s.gunClock = 0;
      engine.tick(s, .01);
    }
    assert(!s.drones.includes(active));
    assert(s.drones.includes(other));
    assert(s.shots.every(p => p.plane === 0));
  }
});

test('la salve conserve le plan annoncé, y compris après une plongée sous le viseur', () => {
  const s = practice();
  s.difficulty = s.sector = 4;
  s.sectorCells = 1;
  for (let i = 0; i < 4; i++) engine.tick(s, s.stepTime);
  const { boss } = s, { attack } = boss;
  assert.equal(attack.phase, 'warning');
  assert.equal(attack.plane, 0);
  assert(attack.tiles.every(tile => tile.plane === attack.plane));
  assert(attack.danger.has(key(s.snake[0].x, s.snake[0].y)));
  assert(engine.shiftPlane(s));
  attack.remaining = .01;
  engine.tick(s, .02);
  assert.equal(attack.phase, 'active');
  assert.equal(s.status, 'playing');
  assert.equal(boss.plane, 0);
  const warned = s.events.find(e => e.type === 'bossAttack'), volley = s.events.find(e => e.type === 'bossVolley');
  assert.equal(warned.plane, volley.plane);
});

test('comparaison d’évitement des deux variantes sur les mêmes 160 campagnes', t => {
  for (const mode of ['free', 'portal']) {
    const byEra = [];
    for (let era = 0; era < engine.eras.length; era++) {
      const result = { année: engine.eras[era].year, victoires: 0, morts: 0, bascules: 0 };
      for (let seed = 1; seed <= 32; seed++) {
        const { s, events } = simulate(era, seed, () => {}, mode);
        if (s.status === 'dead') result.morts++;
        else {
          assert(['cleared', 'won'].includes(s.status), 'campagne inachevée');
          result.victoires++;
        }
        result.bascules += events.filter(e => e.type === 'planeShift').length;
      }
      byEra.push(result);
    }
    t.diagnostic(mode + ' ' + JSON.stringify(byEra));
  }
});

test('modules réels : premier portail, commande analogique, arme forgée et rentrée cardinale', () => {
  require('../../forge.js');
  require('../../vol-libre.js');
  try {
    const s = practice();
    const forge = window.SnakeForge, flight = window.SnakeFlight;
    assert(forge.equip(s, 'prism', 'chain'));
    const target = drone(s, 11, 9, 0), ghost = drone(s, 11, 9, 1);
    for (let i = 0; i < 4; i++) engine.tick(s, s.stepTime);
    assert.equal(s.eaten, 1);
    assert(!s.drones.includes(target));
    assert(s.drones.includes(ghost));
    assert(s.events.some(e => e.type === 'forgeHit' && e.core === 'prism'));
    assert.equal(s.flightGate.plane, 0);
    assert(flight.enter(s));
    const original = s.flight.angle;
    assert(!engine.shiftPlane(s));
    assert(engine.turn(s, .1, -.85));
    engine.tick(s, .05);
    assert(s.flight.angle < original);
    assert(!Number.isInteger(s.snake[0].x));
    assert(!Number.isInteger(s.snake[0].y));
    for (let i = 0; i < 550 && s.flight; i++) {
      const ring = s.flight.rings[s.flight.passed];
      engine.turn(s, ring.x - s.snake[0].x, ring.y - s.snake[0].y);
      engine.tick(s, 1/60);
    }
    assert.equal(s.status, 'playing');
    assert.equal(s.flight, null);
    assert(s.events.some(e => e.type === 'flightEnd' && e.success && e.points > 0));
    assert(s.events.some(e => e.type === 'forgeShot' && e.core === 'prism'));
    assert(s.snake.every(p => Number.isInteger(p.x) && Number.isInteger(p.y)));
    const at = s.snake[0];
    engine.tick(s, s.stepTime);
    assert.equal(distance(at, s.snake[0]), 1);
    assert.equal(s.status, 'playing');

    for (let i = 0; i < engine.eras.length; i++) {
      const { s: final, events } = simulate(i, 1);
      assert.equal(final.status, final.year === 2985 ? 'won' : 'cleared');
      assert.equal(events.filter(e => e.type === 'bossDefeated').length, 2);
      assert(events.some(e => e.type === 'flightEnd'));
      assert(events.some(e => e.type === 'forgeShot'));
    }
  } finally {
    delete window.SnakeFlight;
    delete window.SnakeForge;
  }
});


test('le choix par année préserve les cadences d’origine et intercale 1995 entre les deux', () => {
  const expected = [[1976,.244,4], [1985,.234,5], [1995,.229,6.2], [2185,.224,7.4], [2985,.214,9]];
  for (const [index,[year,seconds,radius]] of expected.entries()) {
    const s = engine.create(randomFrom(1), year);
    assert.equal(s.year,year);
    assert.equal(s.eraIndex,index);
    assert(Math.abs(s.stepTime-seconds)<1e-9);
    assert.equal(s.novaRadius,radius);
  }
});
