(() => {
  'use strict';

  const cores = [
    { id: 'orbit', name: 'Satellites', description: 'Deux lunes tournent autour de ta tête et frappent au contact.' },
    { id: 'prism', name: 'Prisme', description: 'Une lance de lumière se divise en trois éclats divergents.' },
    { id: 'well', name: 'Singularité', description: 'Un puits capture les drones à proximité avant d’imploser.' },
  ];
  const mods = [
    { id: 'echo', name: 'Écho', description: 'La salve se répète après un court délai.' },
    { id: 'chain', name: 'Chaîne', description: 'Un arc saute sur un voisin ou revient sur la cible isolée.' },
    { id: 'blast', name: 'Détonation', description: 'Le premier impact de chaque projectile libère une onde de choc.' },
  ];
  const names = {
    orbit: { echo: 'Lunes fantômes', chain: 'Couronne Tesla', blast: 'Lunes explosives' },
    prism: { echo: 'Kaléidoscope', chain: 'Vitrail électrique', blast: 'Éclats de supernova' },
    well: { echo: 'Étoiles jumelles', chain: 'Nœud gravitationnel', blast: 'Soleil noir' },
  };
  const name = (core, mod) => names[core]?.[mod];
  const cadence = { orbit: 2.8, prism: 1.8, well: 3.6 };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function init(s, recipe = {}) {
    s.forge = { core: 'orbit', mod: 'echo', clock: 0, projectiles: [], effects: [], orbits: [], pending: [] };
    if (recipe) equip(s, recipe.core, recipe.mod);
    return s.forge;
  }
  function equip(s, core, mod) {
    if (!cores.some(c => c.id === core) || !mods.some(m => m.id === mod)) return false;
    const f = s.forge || init(s);
    if (core === f.core && mod === f.mod) return true;
    Object.assign(f, { core, mod });
    f.projectiles.length = f.orbits.length = f.pending.length = f.effects.length = 0;
    return true;
  }
  function fx(f, kind, p, life, radius, to) {
    f.effects.push({ kind, x: p.x, y: p.y, plane: p.plane, life, maxLife: life, radius, toX: to?.x, toY: to?.y });
  }
  function event(f, h, type, p) {
    h.emit(type, { core: f.core, mod: f.mod, x: p.x, y: p.y, plane: p.plane });
  }
  function near(h, p, radius) {
    return h.targets().filter(t => dist(t, p) <= radius && h.visible(p, t)).sort((a, b) => dist(p, a) - dist(p, b));
  }
  function damage(f, h, p, target, power) {
    const at = { x: target.x, y: target.y, plane: p.plane };
    h.damage(target, power);
    fx(f, 'impact', at, .16, .65);
    event(f, h, 'forgeHit', at);
  }
  function hit(f, h, p, t, power) {
    if (!h.targets().includes(t) || !h.visible(p, t)) return;
    const at = { x: t.x, y: t.y, plane: p.plane };
    damage(f, h, p, t, power);
    if (p.modified) return;
    p.modified = true;
    if (f.mod === 'chain') {
      const next = near(h, at, 4.1).find(other => other !== t);
      if (next) {
        fx(f, 'chain', at, .25, 1, next);
        damage(f, h, at, next, 1);
      } else if (h.targets().includes(t)) {
        fx(f, 'chain', p, .3, 1, t);
        f.pending.push({ kind: 'return', at, target: t, delay: .22 });
      }
    } else if (f.mod === 'blast') {
      fx(f, 'blast', at, .36, 2.6);
      for (const other of near(h, at, 2.6)) damage(f, h, at, other, 1);
    }
  }
  function shot(kind, p, life, extra) {
    return { kind, x: p.x, y: p.y, plane: p.plane, life, maxLife: life, ...extra };
  }
  function launch(s, h, origin, dir, echo) {
    const f = s.forge;
    event(f, h, 'forgeShot', origin);
    if (echo) fx(f, 'echo', origin, .3, 1.5);
    if (f.core === 'orbit') {
      const phase = Math.atan2(dir.y, dir.x) + (echo ? Math.PI / 2 : 0);
      for (const angle of [phase, phase + Math.PI]) {
        f.orbits.push(shot('orbit', origin, echo ? 1.1 : 2.5, { angle, contacts: new Set(), radius: echo ? 2.8 : 2.1 }));
      }
    } else if (f.core === 'prism') {
      f.projectiles.push(shot('prism', origin, .48, { vx: dir.x * 11, vy: dir.y * 11 }));
    } else {
      const ahead = { ...origin, x: origin.x + dir.x * 3, y: origin.y + dir.y * 3 };
      const target = near(h, origin, 6)[0];
      const anchor = target || ahead;
      const p = { plane: origin.plane, x: Math.max(0, Math.min(s.width - 1, anchor.x)), y: Math.max(0, Math.min(s.height - 1, anchor.y)) };
      f.projectiles.push(shot('well', p, echo ? .8 : 1.38, { pulse: 0, contacts: new Set(), radius: 3.5 }));
    }
  }
  function split(f, p, struck) {
    fx(f, 'split', p, .22, 1.2);
    for (const angle of [-.58, 0, .58]) {
      const heading = Math.atan2(p.vy, p.vx) + angle;
      f.projectiles.push(shot('shard', p, .82, { vx: 10 * Math.cos(heading), vy: 10 * Math.sin(heading), ignore: angle === 0 ? null : struck }));
    }
  }
  function pulseWell(s, h, p) {
    for (const target of near(h, p, p.radius)) {
      if (target !== s.boss) h.pull(target, p);
      if (p.contacts.has(target) || dist(p, target) > 1.05) continue;
      p.contacts.add(target);
      hit(s.forge, h, p, target, 1);
      if (s.status !== 'playing') break;
    }
  }
  function update(s, dt, h) {
    if (s.status !== 'playing' || !(dt > 0)) return;
    const f = s.forge || init(s);
    const head = s.snake[0];
    for (const list of [f.effects, f.pending]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        if (list === f.effects) {
          item.life -= dt;
          if (item.life <= 0) list.splice(i, 1);
        } else {
          item.delay -= dt;
          if (item.delay > 0) continue;
          list.splice(i, 1);
          if (item.kind === 'echo') launch(s, h, item.at, item.dir, true);
          else if (h.targets().includes(item.target) && h.visible(item.at, item.target) && dist(item.at, item.target) < 4.1)
            damage(f, h, item.at, item.target, 1);
        }
      }
    }
    f.clock -= dt;
    if (f.clock <= 0) {
      const at = { x: head.x, y: head.y, plane: h.plane() }, dir = { ...s.direction };
      launch(s, h, at, dir, false);
      f.clock = cadence[f.core];
      if (f.mod === 'echo') f.pending.push({ kind: 'echo', at, dir, delay: .38 });
    }
    for (let i = f.orbits.length - 1; i >= 0; i--) {
      const p = f.orbits[i];
      p.life -= dt;
      if (p.life <= 0) { f.orbits.splice(i, 1); continue; }
      p.angle += 3.5 * dt;
      p.x = head.x + Math.cos(p.angle) * p.radius;
      p.y = head.y + Math.sin(p.angle) * p.radius;
      p.plane = h.plane();
      for (const t of near(h, p, 1.05)) {
        if (p.contacts.has(t)) continue;
        p.contacts.add(t);
        hit(f, h, p, t, 2);
        if (s.status !== 'playing') return;
      }
    }
    for (let i = f.projectiles.length - 1; i >= 0; i--) {
      const p = f.projectiles[i];
      if (p.kind === 'well') {
        p.pulse -= dt;
        if (p.pulse <= 0) { p.pulse = .25; pulseWell(s, h, p); }
        if (s.status !== 'playing') return;
        p.life -= dt;
        if (p.life > 0) continue;
        fx(f, 'collapse', p, .43, p.radius);
        for (const t of near(h, p, p.radius)) hit(f, h, p, t, 3);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.x < -.5 || p.x > s.width - .5 || p.y < -.5 || p.y > s.height - .5) { f.projectiles.splice(i, 1); continue; }
        const target = near(h, p, .8).find(t => t !== p.ignore);
        if (target) hit(f, h, p, target, p.kind === 'prism' ? 2 : 1);
        if (p.life > 0 && !target) continue;
        if (p.kind === 'prism') split(f, p, target);
      }
      f.projectiles.splice(i, 1);
      if (s.status !== 'playing') return;
    }
  }

  const api = { cores, mods, names, name, init, equip, update };
  if (typeof window !== 'undefined') window.SnakeForge = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
