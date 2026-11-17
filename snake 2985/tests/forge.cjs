'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const forge = require('../forge.js');

function arena(core, mod) {
  const s = { width: 36, height: 18, snake: [{ x: 10, y: 9 }], direction: { x: 1, y: 0 }, plane: 0, status: 'playing' };
  forge.init(s, { core, mod });
  const targets = [], hits = [], events = [], pulls = [];
  const hooks = {
    targets: () => targets, plane: () => s.plane, visible: (p, t) => p.plane === t.plane,
    damage: (t, n) => hits.push([t, n]), emit: (type, data) => events.push({ type, ...data }),
    pull: (t, p) => pulls.push([t, p]),
  };
  function advance(frames) { for (let i = 0; i < frames; i++) forge.update(s, 1 / 60, hooks); }
  return { s, targets, hits, events, pulls, advance };
}
for (const { id: core } of forge.cores) {
  for (const { id: mod } of forge.mods) {
    test(core + ' × ' + mod + ' touche le boss, respecte le plan et déclenche son module', () => {
      const a = arena(core, mod);
      a.s.boss = { x: 12, y: 9, plane: 0 };
      const drone = { x: 12, y: 10, plane: 0 }, other = { x: 12, y: 9, plane: 1 };
      a.targets.push(a.s.boss, drone, other);
      let moduleVisible = false;
      for (let i = 0; i < 96; i++) {
        a.advance(1);
        moduleVisible ||= a.s.forge.effects.some(e => e.kind === mod);
      }
      assert(a.hits.some(([t]) => t === a.s.boss));
      assert(a.hits.some(([t]) => t === drone));
      assert(!a.hits.some(([t]) => t === other));
      assert(moduleVisible);
      assert(a.events.some(e => e.type === 'forgeShot'));
      assert(a.events.some(e => e.type === 'forgeHit'));
      assert(a.events.every(e => e.core === core && e.mod === mod && e.plane === 0 && Number.isFinite(e.x)));
      if (core === 'well') {
        assert(a.pulls.length > 1);
        assert(a.pulls.every(([t]) => t === drone));
      }
    });
  }
}
test('Les lunes suivent le changement de plan et les projectiles gardent le leur', () => {
  for (const core of ['orbit', 'prism', 'well']) {
    const a = arena(core, 'echo');
    a.advance(1);
    a.s.plane = 1;
    a.advance(24);
    const items = core === 'orbit' ? a.s.forge.orbits : a.s.forge.projectiles;
    assert(items.length > 0 && items.every(p => p.plane === (core === 'orbit' ? 1 : 0)));
  }
});
test('Un rééquipement efface les salves différées et conserve la recharge', () => {
  const a = arena('well', 'echo');
  a.advance(1);
  const clock = a.s.forge.clock;
  assert(forge.equip(a.s, 'prism', 'blast'));
  assert.equal(a.s.forge.clock, clock);
  assert(!a.s.forge.pending.length && !a.s.forge.projectiles.length);
  assert(!forge.equip(a.s, 'bad', 'echo'));
  assert.equal(a.s.forge.core, 'prism');
});
