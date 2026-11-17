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
  const blocked = new Set(s.snake.slice(1, -1).map(p => key(p.x, p.y)));
  for (const drone of s.drones) {
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
  const threatened = (x, y) => boss?.attack?.tiles.some(p => x === p.x && y === p.y);
  const goals = new Set(s.cells.map(p => key(p.x, p.y)));
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

function simulate(index, seed, inspect = () => {}) {
  const s = engine.create(randomFrom(seed), index);
  const events = [];
  for (let step = 0; step < 2200 && ['playing', 'upgrade'].includes(s.status); step++) {
    if (s.status === 'upgrade') {
      const id = !s.levels.arc ? 'arc' : !s.levels.rail ? 'rail' : 'nova';
      engine.upgrade(s, id);
    }
    const head = s.snake[0];
    const readyTarget = s.boss
      ? distance(s.boss, head) < s.novaRadius - 1
      : s.drones.some(d => distance(d, head) < 4);
    if (s.novaCharge === 1 && readyTarget) engine.fire(s);
    if (s.status === 'playing') {
      const dir = chooseDirection(s);
      if (dir) engine.turn(s, ...dir);
      engine.tick(s, s.stepTime);
    }
    events.push(...s.events.splice(0));
    inspect(s);
  }
  return { s, events };
}

test('exactement quatre temporalités, trois armes originales par date', () => {
  assert.deepEqual(engine.eras.map(era => era.year), [1976, 1985, 2185, 2985]);
  assert.equal(new Set(engine.eras.flatMap(era => era.weapons)).size, 12);
  assert.equal(new Set(engine.eras.flatMap(era => era.bosses)).size, 8);
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
    assert.equal(s.status, i === engine.eras.length - 1 ? 'won' : 'cleared');
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
  const { s, events } = simulate(1, 1);
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
