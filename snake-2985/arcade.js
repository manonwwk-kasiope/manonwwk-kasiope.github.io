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

;
(() => {
  'use strict';

  const dirs = [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];
  const planeOf = p => p.plane ?? 0;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const delta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const at = (p, d, n, plane) => ({x:p.x + n * d.x, y:p.y + n * d.y, plane});
  const inside = (s, p, margin = 0) => p.x >= margin && p.y >= margin
    && p.x <= s.width - 1 - margin && p.y <= s.height - 1 - margin;
  const same = (p, q) => q && p.x === q.x && p.y === q.y && planeOf(p) === planeOf(q);
  const hull = (p, q) => q && Math.abs(p.x - q.x) <= 1.45 && Math.abs(p.y - q.y) <= 1.45;
  function emit(s, type, data = {}) {
    if (s.events.length >= 96) s.events.shift();
    s.events.push({type, ...data});
  }
  function init(s) {
    s.flight = s.flightGate = null;
    s.nextFlightCell = 1;
  }
  function blocked(s, p) {
    if (!inside(s, p) || same(p, s.rift) || s.cells.some(q => same(p,q))) return true;
    const b = s.boss;
    if (b && planeOf(b) === planeOf(p) && (hull(p, b) || hull(p, b.next))) return true;
    if (b?.attack && planeOf(b.attack) === planeOf(p) && b.attack.danger.has(p.y * s.width + p.x)) return true;
    return s.drones.some(d => planeOf(d) === planeOf(p) && (distance(p,d) < 1 || (d.next && distance(p,d.next) < 1)));
  }
  function offer(s) {
    if (s.flight || s.flightGate || s.status !== 'playing' || s.eaten < s.nextFlightCell) return false;
    const head = s.snake[0];
    const headings = [s.direction, {x:-s.direction.y, y:s.direction.x}, {x:s.direction.y, y:-s.direction.x}];
    for (const dir of headings) {
      for (const n of [3, 2, 1]) {
        const p = at(head, dir, n, s.plane);
        if (blocked(s,p) || s.snake.some(q => same(q,p)) || !inside(s,p,1)) continue;
        s.flightGate = p;
        emit(s, 'flightGate', p);
        return true;
      }
    }
    return false;
  }

  // Construct the slalom in the player's frame. Near a wall, rotate the next leg inward.
  function course(s, head, angle) {
    const rings = [];
    let prev = head;
    for (const bend of [.28, -.92, 1.28]) {
      let best = null, score = Infinity;
      for (let i = -12; i <= 12; i++) {
        const heading = angle + bend + i * Math.PI / 12;
        const p = at(prev, {x:Math.cos(heading),y:Math.sin(heading)}, 6.1, s.plane);
        if (!inside(s,p,1.5)) continue;
        const proximity = Math.min(p.x,p.y,s.width - 1 - p.x,s.height - 1 - p.y);
        const cost = Math.abs(i) + Math.max(0, 3 - proximity)
          + (rings.slice(0,-1).some(r => distance(p,r) < 3) ? 8 : 0);
        if (cost < score) { best = {...p, radius:1.05, heading}; score = cost; }
      }
      if (!best) break;
      rings.push(best);
      angle = best.heading;
      prev = best;
    }
    return rings;
  }
  function enter(s) {
    if (!s.flightGate || s.flight || s.status !== 'playing' || s.plane !== planeOf(s.flightGate)) return false;
    const head = s.snake[0];
    const rings = course(s, head, Math.atan2(s.direction.y, s.direction.x));
    if (!rings.length) return false;
    const angle = rings[0].heading;
    s.flight = { angle, targetAngle:angle, remaining:8, total:8, passed:0, goal:rings.length, rings,
      trail:s.snake.map(p => ({...p})), plane:s.plane };
    s.direction = {x:Math.cos(angle), y:Math.sin(angle)};
    s.nextFlightCell = s.eaten + 3;
    s.flightGate = null;
    s.turns.length = 0;
    s.progress = 1;
    emit(s, 'flightStart', {...head, goal:rings.length});
    return true;
  }
  function cross(s) {
    return same(s.snake[0], s.flightGate) && enter(s);
  }
  function aim(s, dx, dy) {
    if (!s.flight || s.status !== 'playing' || !Number.isFinite(dx) || !Number.isFinite(dy)
      || Math.hypot(dx,dy) < .08) return false;
    s.flight.targetAngle = Math.atan2(dy,dx);
    return true;
  }

  // Resample along the actual flown path, keeping a unit of arc length between vertebrae.
  function trace(s, head) {
    const trail = s.flight.trail;
    trail.unshift(head);
    const body = [head];
    let travelled = 0, i = 1;
    for (; i < trail.length && body.length < s.snake.length; i++) {
      const a = trail[i-1], b = trail[i], length = distance(a,b);
      while (body.length < s.snake.length && body.length <= travelled + length + 1e-8 && length > 0) {
        const t = clamp((body.length - travelled) / length,0,1);
        body.push({x:a.x + (b.x-a.x)*t, y:a.y + (b.y-a.y)*t, plane: t >= 1-1e-8 ? planeOf(b) : planeOf(a)});
      }
      travelled += length;
    }
    while (body.length < s.snake.length) body.push({...trail[trail.length-1]});
    trail.length = i;
    s.previousSnake = s.snake;
    s.snake = body;
    s.progress = 1;
  }

  // Reserve two clear forward steps, then follow the continuous tail with adjacent lattice cells.
  function landing(s) {
    const head = s.snake[0], choices = [];
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const p = {x,y,plane:s.plane};
      if (!blocked(s,p)) choices.push(p);
    }
    choices.sort((a,b) => distance(a,head) - distance(b,head));
    const headings = [...dirs].sort((a,b) => (b.x-a.x)*s.direction.x + (b.y-a.y)*s.direction.y);
    for (const p of choices) for (const dir of headings) {
      const first = at(p,dir,1,s.plane), second = at(p,dir,2,s.plane);
      if (blocked(s,first) || blocked(s,second)) continue;
      const occupied = [first,second,p], body = [p];
      for (const segment of s.snake.slice(1)) {
        const options = dirs.map(d => at(body[body.length-1], d, 1, planeOf(segment)))
          .filter(q => !blocked(s,q) && !occupied.some(o => same(o,q)))
          .sort((a,b) => distance(a,segment) - distance(b,segment));
        if (!options.length) break;
        body.push(options[0]);
        occupied.push(options[0]);
      }
      if (body.length === s.snake.length) return {body,dir};
    }
    return null;
  }
  function land(s, cause = 'Interruption') {
    if (!s.flight) return false;
    const f = s.flight, result = landing(s);
    s.flight = null;
    if (!result) {
      s.status = 'dead';
      s.cause = 'Transit saturé';
      s.turns.length = 0;
      emit(s,'flightCrash',{cause:s.cause});
      emit(s,'death',{...s.snake[0],cause:s.cause});
      return false;
    }
    s.snake = result.body;
    s.previousSnake = result.body.slice();
    s.direction = {...result.dir};
    s.turns.length = 0;
    s.stepClock = s.progress = 0;
    const success = f.passed === f.goal;
    const points = success ? 325 * s.sector : 0;
    if (success) {
      s.score += points;
      s.novaCharge = Math.min(1,s.novaCharge + .55);
    }
    emit(s,'flightEnd',{...s.snake[0],success,points,cause,passed:f.passed,goal:f.goal});
    return true;
  }
  function step(s, dt) {
    const f = s.flight;
    if (!f || s.status !== 'playing' || !(dt > 0) || !Number.isFinite(dt)) return;
    // Short exponential response near the requested bearing, bounded rotation at full deflection.
    const error = delta(f.angle, f.targetAngle);
    f.angle += clamp(error * (1-Math.exp(-12*dt)), -8*dt, 8*dt);
    s.direction = {x:Math.cos(f.angle), y:Math.sin(f.angle)};
    const head = at(s.snake[0],s.direction,(s.turbo ? 7.2 : 5.4)*dt,s.plane);
    trace(s,head);
    const drone = s.drones.some(d => planeOf(d) === s.plane && d.warmup <= 0 && distance(d,head) < .66);
    const boss = s.boss && planeOf(s.boss) === s.plane && hull(head,s.boss);
    if (drone || boss || !inside(s,head)) {
      const cause = drone ? 'Drone' : boss ? s.boss.name : 'Bord du tunnel';
      emit(s,'flightCrash',{...head,cause});
      land(s,cause);
      return;
    }
    const ring = f.rings[f.passed];
    if (distance(head,ring) <= ring.radius) {
      f.passed++;
      emit(s,'flightRing',{...ring,passed:f.passed,goal:f.goal});
      if (f.passed === f.goal) { land(s,'Slalom réussi'); return; }
    }
    f.remaining = Math.max(0, f.remaining - dt);
    if (!f.remaining) land(s,'Temps écoulé');
  }
  window.SnakeFlight = {init,offer,enter,cross,aim,step,land};
})();

;
(() => {
  'use strict';
  const eras = [
    { year:1976, bits:2, kind:'relay', name:'Relais binaire', verb:'Traverse le relais dans la direction de la flèche.' },
    { year:1985, bits:4, kind:'coil', name:'Bobine inductive', verb:'Fais traverser la bobine par ta tête, puis par le troisième segment.' },
    { year:1995, bits:8, kind:'switch', name:'Double aiguillage', verb:'Avance sur 1, puis vire vers 2 pour dévier le train lumineux.' },
    { year:2185, bits:16, kind:'phase', name:'Inversion orbitale', verb:'Change de plan à proximité du relais et frappe sur le plan d’arrivée.' },
    { year:2985, bits:32, kind:'shadow', name:'Ombre galactique', verb:'Entre dans l’ombre, puis ressors par un côté du cercle.' },
  ];
  const geometries = {
    orbit:'L’anneau frappe entre 1 et 4 cases de ta tête.',
    prism:'Le rayon frappe jusqu’à 7 cases dans ta direction.',
    well:'Le puits frappe dans un disque de 3,2 cases autour du relais.',
  };
  const routes = {
    echo:'Une frappe immédiate, puis deux impulsions retardées sur la même cible.',
    chain:'Trois impulsions rebondissent entre des cibles distantes de quatre cases au plus.',
    blast:'Les trois impulsions se répartissent entre les cibles proches du premier impact.',
  };
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  function describe(era,core,mod) {
    const e = eras.find(e=>e.year===era) || eras[era] || eras[0];
    return {name:e.name, gesture:e.verb, geometry:geometries[core], route:routes[mod]};
  }
  function attach(s) {
    return s.evolution ||= { marks:[], effects:[], pending:[], cooldown:0, activations:0, impulses:0, lastPlane:s.plane };
  }
  function createMark(s,data) {
    const e=attach(s);
    if (e.cooldown > 0 || e.marks.length || s.status !== 'playing') return;
    const d=s.direction, h=s.snake[0];
    const era=eras.find(e=>e.year===s.year) || eras[s.eraIndex] || eras[0];
    const forward = era.kind==='coil' || era.kind==='switch' ? 1 : 2;
    let dx=era.kind==='relay' ? -d.y : d.x, dy=era.kind==='relay' ? d.x : d.y;
    if (h.x + forward*dx < 0 || h.x + forward*dx >= s.width) dx=-dx;
    if (h.y + forward*dy < 0 || h.y + forward*dy >= s.height) dy=-dy;
    const m={ x:clamp(h.x+forward*dx,0,s.width-1), y:clamp(h.y+forward*dy,0,s.height-1),
      plane:data.plane, dx,dy, core:data.core,mod:data.mod,era:s.eraIndex,
      kind:era.kind,life:4,maxLife:4,radius:1,entered:false };
    if(m.kind==='switch') {
      m.first={x:m.x,y:m.y,plane:m.plane};
      m.inX=dx; m.inY=dy;
      m.dx=-dy; m.dy=dx;
      if(m.x+m.dx<0 || m.x+m.dx>s.width-1 || m.y+m.dy<0 || m.y+m.dy>s.height-1) {
        m.dx=-m.dx; m.dy=-m.dy;
      }
      m.x+=m.dx; m.y+=m.dy;
    }
    if(e.lastAnchor && distance(m,e.lastAnchor)<2.25) return;
    e.marks.push(m);
  }
  function wrap(s,hooks) {
    return {...hooks, emit(type,data) { hooks.emit(type,data); if(type==='forgeShot') createMark(s,data); }};
  }
  function eligible(s,m,h) {
    const p=s.snake[0], dir=s.direction;
    const origin=m.core==='well'?{...m,plane:s.plane}:{...p,plane:s.plane};
    return h.targets().filter(t => {
      if(!h.visible(origin,t)) return false;
      const r=distance(t,origin), x=t.x-origin.x, y=t.y-origin.y;
      if(m.core==='orbit') return r>=1 && r<=4;
      if(m.core==='prism') {
        const ahead=x*dir.x+y*dir.y, lateral=Math.abs(x*dir.y-y*dir.x);
        return ahead>=0 && ahead<=7 && lateral<=1.15;
      }
      return r<=3.2;
    }).sort((a,b)=>distance(a,origin)-distance(b,origin));
  }
  function impulse(s,h,target,origin,m) {
    if(s.status!=='playing' || !h.targets().includes(target) || !h.visible(origin,target)) return false;
    const e=s.evolution;
    h.damage(target,1);
    e.impulses++;
    e.effects.push({kind:m.mod,x:target.x,y:target.y,fromX:origin.x,fromY:origin.y,plane:origin.plane,life:.24,maxLife:.24,radius:1.2});
    h.emit('evolutionHit',{core:m.core,mod:m.mod,plane:origin.plane,x:target.x,y:target.y});
    return true;
  }
  function discharge(s,m,h) {
    const e=s.evolution, targets=eligible(s,m,h), start=targets[0];
    const origin={...m,plane:s.plane};
    e.activations++;
    e.cooldown=3.6;
    e.lastAnchor={x:m.x,y:m.y};
    h.emit('evolutionTrigger',{...origin,found:targets.length});
    if(m.kind==='switch') {
      e.effects.push({kind:'switchRail',fromX:m.first.x,fromY:m.first.y,x:m.x,y:m.y,plane:m.plane,life:.34,maxLife:.34,radius:1});
    }
    if(!start) return;
    impulse(s,h,start,origin,m);
    if(m.mod==='echo') {
      for(const delay of [.27,.54]) e.pending.push({delay,target:start,origin,m});
      return;
    }
    let anchor=start;
    const seen=new Set([start]);
    for(let i=1;i<3;i++) {
      const from={x:anchor.x,y:anchor.y,plane:origin.plane};
      const nearby=h.targets().filter(t=>h.visible(from,t) && distance(t,anchor)<=(m.mod==='chain'?4:2.5));
      nearby.sort((a,b)=>Number(seen.has(a))-Number(seen.has(b)) || distance(a,anchor)-distance(b,anchor));
      const next=nearby[0];
      if(!next) break;
      impulse(s,h,next,from,m); seen.add(next);
      if(m.mod==='chain') anchor=next;
    }
  }
  function trigger(s,m) {
    const p=s.snake[0], same=s.plane===m.plane, r=distance(p,m);
    if(m.kind==='switch') {
      if(!same) { m.entered=false; return false; }
      if(!m.entered) {
        if(distance(p,m.first)<=.48 && s.direction.x*m.inX+s.direction.y*m.inY>.65) m.entered=true;
        return false;
      }
      if(distance(p,m.first)>1.55) m.entered=false;
      return m.entered && r<=.48 && s.direction.x*m.dx+s.direction.y*m.dy>.65;
    }
    if(m.kind==='relay') return same && r<=.72 && m.dx*s.direction.x+m.dy*s.direction.y>.65;
    if(m.kind==='phase') return !same && s.evolution.lastPlane===m.plane && r<=2.1;
    if(same && r<=.74) m.entered=true;
    if(m.kind==='coil') {
      const tail=s.snake[2];
      return m.entered && same && tail && (tail.plane??0)===m.plane && distance(tail,m)<=.72 && r>=1.25;
    }
    return m.entered && same && r>=1.55 && Math.abs((p.x-m.x)*m.dy-(p.y-m.y)*m.dx)>=1.35;
  }
  function update(s,dt,h) {
    if(s.status!=='playing' || !Number.isFinite(dt) || dt<=0) return;
    const e=attach(s);
    e.cooldown=Math.max(0,e.cooldown-dt);
    for(const item of e.effects) item.life-=dt;
    e.effects=e.effects.filter(item=>item.life>0);
    for(const p of e.pending) p.delay-=dt;
    const due=e.pending.filter(p=>p.delay<=0); e.pending=e.pending.filter(p=>p.delay>0);
    for(const p of due) impulse(s,h,p.target,p.origin,p.m);
    const m=e.marks[0];
    if(m) {
      m.life-=dt;
      if(m.life<=0 || m.core!==s.forge.core || m.mod!==s.forge.mod || m.era!==s.eraIndex) e.marks.length=0;
      else if(trigger(s,m)) { e.marks.length=0; discharge(s,m,h); }
    }
    e.lastPlane=s.plane;
  }
  // Installation explicite dans la chambre : le moteur garde ses propres règles de dégâts.
  function install(forge) {
    if(forge.evolutionInstalled) return forge;
    const original=forge.update;
    return {...forge,evolutionInstalled:true,update(s,dt,h) { original(s,dt,wrap(s,h)); update(s,dt,h); }};
  }
  const api={describe,attach,wrap,update,install,eras};
  if(typeof window!=='undefined') window.SnakeEvolution=api;
  if(typeof module!=='undefined') module.exports=api;
})();

;
(() => {
  'use strict';

  const WIDTH = 36;
  const HEIGHT = 18;
  const CELLS_PER_SECTOR = 2;
  const eras = [
    { year: 1976, name: 'Le Terminal', weapons: ['Bit perforant', 'Relais à étincelle', 'Impulsion cathodique'], bosses: ['Le Registre', 'Le Mainframe'], railRange: 12, railPower: 1, lanes: 0, arcRange: 2.7, chains: 0, blast: 4, blastPower: 3 },
    { year: 1985, name: 'Le Circuit néon', weapons: ['Canon photonique', 'Bobine Tesla', 'Onde chromatique'], bosses: ['Le Magnétron', 'Le Cyclope'], railRange: 18, railPower: 2, lanes: 0, arcRange: 3.3, chains: 0, blast: 5, blastPower: 5 },
    { year: 1995, name: 'La Gare de verre', weapons: ['Canon à pixels', 'Aiguillage électrique', 'Onde bitume'], bosses: ['Le Signal fantôme', 'La Locomotive Spectre'], railRange: 23, railPower: 3, lanes: 1, arcRange: 4.0, chains: 1, blast: 6.2, blastPower: 7 },
    { year: 2185, name: 'La Ceinture orbitale', weapons: ['Lance héliosphère', 'Foudre orbitale', 'Puits de gravité'], bosses: ['Le Pulsar', 'L’Éclipse'], railRange: 28, railPower: 4, lanes: 1, arcRange: 4.7, chains: 2, blast: 7.4, blastPower: 10 },
    { year: 2985, name: 'Le Cœur galactique', weapons: ['Faisceau quasar', 'Réseau de pulsars', 'Supernova stellaire'], bosses: ['Le Dévoreur', 'La Singularité'], railRange: 36, railPower: 5, lanes: 2, arcRange: 5.7, chains: 3, blast: 9, blastPower: 14 },
  ];
  // Keep the original four eras' timings and route seeds when inserting a date.
  const paceByYear = { 1976: 0, 1985: 1, 1995: 1.5, 2185: 2, 2985: 3 };
  const signatures = {
    1976: ['Balayage binaire', 'Banques de mémoire'],
    1985: ['Pôles jumeaux', 'Visée en croix'],
    1995: ['Feux de triage', 'Convoi spectral'],
    2185: ['Anneau de pulsar', 'Portes gravitationnelles'],
    2985: ['Prisme diagonal', 'Effondrement fractal'],
  };
  const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const weapons = [
    { id: 'rail', name: 'Rail triple', description: 'Étend le rail aux deux lignes voisines, puis accélère ses salves et élargit sa portée latérale.' },
    { id: 'arc', name: 'Arc voltaïque', description: 'Un anneau foudroie le drone le plus proche du corps. Les niveaux suivants enchaînent les cibles.' },
    { id: 'nova', name: 'Supernova', description: 'Agrandit l’onde de choc et accélère sa recharge. Sa portée augmente aussi avec ta longueur.' },
  ];

  const layer = p => p.plane ?? 0;
  const samePlane = (a, b) => layer(a) === layer(b);
  const equal = (a, b) => samePlane(a, b) && a.x === b.x && a.y === b.y;
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const squared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const inside = p => p.x >= 0 && p.x < WIDTH && p.y >= 0 && p.y < HEIGHT;
  const advance = (p, d) => ({ x: p.x + d.x, y: p.y + d.y, plane: layer(p) });

  function announce(s, type, data = {}) {
    if (s.events.length >= 96) s.events.shift();
    s.events.push({ type, ...data });
  }

  function effect(s, kind, point, life, radius) {
    s.effects.push({ x: point.x, y: point.y, plane: layer(point), kind, life, maxLife: life, radius });
  }

  function beam(s, from, to, kind) {
    const life = kind === 'arc' ? 0.24 : 0.16;
    s.shots.push({ x: from.x, y: from.y, toX: to.x, toY: to.y, plane: layer(from), kind, life, maxLife: life });
  }

  function tune(s) {
    s.normalStepTime = 0.100 + (0.144 - 0.01 * s.pace) * Math.pow(0.88, s.difficulty - 1);
    s.stepTime = s.normalStepTime * (s.turbo ? 0.6 : 1);
    s.novaRadius = Math.min(37, eras[s.eraIndex].blast + (s.snake.length - 5) * 0.31 + 2.25 * s.levels.nova);
  }

  function create(rng = Math.random, eraIndex = 0, options = {}) {
    if (Object.hasOwn(signatures, eraIndex)) eraIndex = eras.findIndex(era => era.year === Number(eraIndex));
    eraIndex = Number.isInteger(eraIndex) && eras[eraIndex] ? eraIndex : 0;
    const snake = Array.from({ length: 5 }, (_, i) => ({ x: 9 - i, y: 9, plane: 0 }));
    const s = {
      width: WIDTH, height: HEIGHT, rng, status: 'playing', cause: '',
      plane: 0, shiftMode: options.shiftMode === 'portal' ? 'portal' : 'free',
      planeGates: [{ x: 11, y: 9 }, { x: 24, y: 6 }, { x: 7, y: 13 }], planeCooldown: 0, planeShift: null,
      snake, previousSnake: snake.slice(), direction: { x: 1, y: 0 }, turns: [],
      progress: 0, elapsed: 0, stepTime: 0, stepClock: 0, normalStepTime: 0, turbo: false,
      eraIndex, year: eras[eraIndex].year, pace: paceByYear[eras[eraIndex].year], difficulty: 1, sector: 1, sectorGoal: CELLS_PER_SECTOR,
      sectorCells: 0, nearBoss: 0, rift: null, riftUsed: false, bonus: null, finishers: [], nextBossKind: 'mid', bossKind: null, boss: null,
      score: 0, kills: 0, eaten: 0, levels: { rail: 0, arc: 0, nova: 0 },
      novaCharge: 1, novaRadius: 0, gunClock: 0.52, spawnClock: 1, nextId: 1,
      cells: [{ x: 13, y: 9, plane: 0 }, { x: 7, y: 4, plane: 0 }, { x: 25, y: 12, plane: 0 }, { x: 12, y: 7, plane: 1, bonus: true }],
      drones: [], shots: [], effects: [], events: [],
    };
    tune(s);
    spawnDrone(s, { x: 18, y: 3, plane: 1 });
    spawnDrone(s, { x: 26, y: 8, plane: 0 });
    window.SnakeFlight?.init(s);
    window.SnakeForge?.init(s);
    return s;
  }

  // A bounded scan also works when the arena is almost full or the injected RNG repeats.
  function freeTile(s, allowed, plane = s.plane) {
    const area = WIDTH * HEIGHT;
    const offset = Math.floor(s.rng() * area) % area;
    for (let i = 0; i < area; i++) {
      const cell = (offset + i * 137) % area;
      const p = { x: cell % WIDTH, y: Math.floor(cell / WIDTH), plane };
      const occupied = (s.flightGate && equal(p, s.flightGate)) || (s.rift && equal(p, s.rift)) || (s.boss && inHull(p, s.boss)) || s.snake.some(q => equal(p, q)) || s.cells.some(q => equal(p, q))
        || s.drones.some(d => equal(p, d) || equal(p, d.next));
      if (!occupied && (!allowed || allowed(p))) return p;
    }
    return null;
  }

  function planDrone(s, drone) {
    const head = s.snake[0];
    const options = directions.map(d => advance(drone, d)).filter(p =>
      inside(p) && !(s.boss && inHull(p, s.boss)) && !s.cells.some(q => equal(p, q))
      && !s.drones.some(d => d !== drone && (equal(p, d) || equal(p, d.next)))
      && !s.snake.slice(1).some(q => equal(p, q)));
    if (!options.length) return { x: drone.x, y: drone.y, plane: layer(drone) };
    const ranked = options.map(p => ({ p, cost: distance(p, head) + s.rng() * 3.5 }));
    ranked.sort((a, b) => a.cost - b.cost);
    return ranked[0].p;
  }

  function spawnDrone(s, at) {
    const p = at || freeTile(s, tile => distance(tile, s.snake[0]) >= 7, s.nextId % 2);
    if (!p) return;
    const moveEvery = 0.64 + 0.97 * Math.pow(0.86, s.sector - 1) + s.rng() * 0.22;
    const drone = { ...p, id: s.nextId++, next: p, warmup: 0.85, moveIn: moveEvery, moveEvery };
    s.drones.push(drone);
    drone.next = planDrone(s, drone);
    effect(s, 'spawn', p, 0.75, 1);
  }

  function turn(s, dx, dy) {
    if (s.flight && s.status === 'playing') return window.SnakeFlight.aim(s, dx, dy);
    if (s.status !== 'playing' || !Number.isInteger(dx) || !Number.isInteger(dy)
      || Math.abs(dx) + Math.abs(dy) !== 1 || s.turns.length >= 2) return false;
    const last = s.turns[s.turns.length - 1] || s.direction;
    if (last.x * dx + last.y * dy !== 0) return false;
    s.turns.push({ x: dx, y: dy });
    return true;
  }

  function shiftPlane(s) {
    if (s.status !== 'playing' || s.flight || s.planeCooldown > 0) return false;
    if (s.shiftMode === 'portal' && !s.planeGates.some(g => distance(g, s.snake[0]) <= 1)) return false;
    const from = s.plane, to = 1 - from;
    const head = { ...s.snake[0], plane: to };
    if (s.snake.slice(1).some(p => equal(p, head))
      || s.drones.some(d => d.warmup <= 0 && equal(d, head))
      || (s.boss && inHull(head, s.boss))
      || (s.boss?.attack?.phase === 'active' && s.boss.attack.plane === to
        && s.boss.attack.danger.has(head.y * WIDTH + head.x))) return false;
    s.plane = to;
    s.planeCooldown = .65;
    s.planeShift = { from, to, remaining: .35, total: .35 };
    s.snake = [head, ...s.snake.slice(1)];
    announce(s, 'planeShift', { from, to, plane: to });
    const item = s.cells.findIndex(p => equal(p, head));
    if (item >= 0) {
      s.snake.push({ ...s.snake[s.snake.length - 1] });
      collect(s, item, head);
      if (s.status === 'playing') window.SnakeFlight?.offer(s);
    }
    if (s.rift && equal(s.rift, head)) collectRift(s);
    if (s.status === 'playing') window.SnakeFlight?.cross(s);
    return true;
  }

  function turbo(s, on) {
    const active = Boolean(on);
    if (active === s.turbo || (active && s.status !== 'playing')) return false;
    const phase = s.stepClock / s.stepTime;
    s.turbo = active;
    tune(s);
    // Preserve position within a tile on both press and release.
    s.stepClock = phase * s.stepTime;
    return true;
  }

  function death(s, cause, p) {
    s.status = 'dead';
    s.cause = cause;
    s.progress = 1;
    s.turns.length = 0;
    effect(s, 'death', p, 0.65, 2);
    announce(s, 'death', { cause, x: p.x, y: p.y });
  }

  function removeDrones(s, targets) {
    if (!targets.length) return;
    const ids = new Set(targets.map(d => d.id));
    for (const d of targets) {
      effect(s, 'kill', d, 0.46, 1.55);
      announce(s, 'kill', { id: d.id, x: d.x, y: d.y });
      s.kills++;
      s.score += 50 * s.sector * (s.turbo ? 2 : 1);
    }
    s.drones = s.drones.filter(d => !ids.has(d.id));
  }

  function inHull(point, center) {
    return samePlane(point, center) && Math.abs(point.x - center.x) <= 1 && Math.abs(point.y - center.y) <= 1;
  }

  function hullDistanceSquared(point, center) {
    const x = Math.max(0, Math.abs(point.x - center.x) - 1);
    const y = Math.max(0, Math.abs(point.y - center.y) - 1);
    return x * x + y * y;
  }

  // Slab intersection also handles arbitrary flight angles and edge-clipped rays.
  function flightRayHits(from, to, target, radius) {
    let low = 0, high = 1;
    for (const axis of ['x', 'y']) {
      const delta = to[axis] - from[axis], gap = target[axis] - from[axis];
      if (Math.abs(delta) < 1e-8) {
        if (Math.abs(gap) > radius) return false;
      } else {
        const a = (gap - radius) / delta, b = (gap + radius) / delta;
        low = Math.max(low, Math.min(a, b));
        high = Math.min(high, Math.max(a, b));
        if (low > high) return false;
      }
    }
    return true;
  }

  function insideRay(from, to, target, margin) {
    return target.x + margin >= Math.min(from.x, to.x) && target.x - margin <= Math.max(from.x, to.x)
      && target.y + margin >= Math.min(from.y, to.y) && target.y - margin <= Math.max(from.y, to.y);
  }

  function approach(s) {
    if (s.boss) { s.nearBoss = 1; return; }
    const base = s.nextBossKind === 'mid' ? 1 : 5;
    const target = s.nextBossKind === 'mid' ? 5 : 10;
    s.nearBoss = Math.min(1, (s.difficulty - base + s.sectorCells / CELLS_PER_SECTOR) / (target - base));
  }

  function openWorkshop(s) {
    s.status = 'upgrade';
    s.turns.length = 0;
    s.progress = 1;
  }

  const flightLanes = [3, Math.floor(HEIGHT / 2), HEIGHT - 4];
  // Each guardian visits both wings; the final routes also switch depth across midfield.
  const midRoute = [[4, 0], [WIDTH - 5, 0], [WIDTH - 5, 2], [4, 2]];
  const finalRoute = [[3, 0], [Math.floor(WIDTH / 2), 1], [WIDTH - 4, 2],
    [WIDTH - 4, 0], [Math.floor(WIDTH / 2), 2], [3, 1]];

  function flightPlane(y) {
    if (y < (flightLanes[0] + flightLanes[1]) / 2) return 0;
    return y < (flightLanes[1] + flightLanes[2]) / 2 ? 1 : 2;
  }

  function patrol(s, boss) {
    const route = boss.kind === 'mid' ? midRoute : finalRoute;
    let [gx, lane] = route[boss.waypoint];
    if (boss.x === gx && boss.y === flightLanes[lane]) {
      boss.waypoint = (boss.waypoint + 1) % route.length;
      [gx, lane] = route[boss.waypoint];
    }
    const gy = flightLanes[lane];
    const options = directions.map(d => advance(boss, d)).filter(p =>
      p.x >= 2 && p.y >= 2 && p.x < WIDTH - 2 && p.y < HEIGHT - 2
      && !s.snake.some(q => inHull(q, p)) && !s.cells.some(q => inHull(q, p))
      && !(s.rift && inHull(s.rift, p)));
    if (!options.length) return { x: boss.x, y: boss.y, plane: boss.plane };
    const rank = p => Math.abs(p.x - gx) + Math.abs(p.y - gy)
      + (p.x === boss.x && (boss.moves + Math.floor(s.pace)) % 3 !== 0 ? .15 : 0)
      + (boss.previous && equal(p, boss.previous) ? 1.2 : 0);
    options.sort((a, b) => rank(a) - rank(b));
    return options[0];
  }

  function enterBoss(s) {
    // The farthest unoccupied hull appears away from the head, never around the snake.
    const head = s.snake[0], final = s.difficulty === 10;
    const wing = head.x < WIDTH / 2 ? WIDTH - 8 : 7;
    const entryLane = flightLanes[(Math.floor(s.pace) + (final ? 1 : 0)) % flightLanes.length];
    let start = null, best = -Infinity;
    for (let y = 3; y < HEIGHT - 3; y++) {
      for (let x = 3; x < WIDTH - 3; x++) {
        const p = { x, y, plane: s.plane };
        if (s.snake.some(q => inHull(q, p)) || s.cells.some(q => inHull(q, p))) continue;
        const desirability = Math.min(13, distance(p, head)) - Math.abs(x - wing) * .30 - Math.abs(y - entryLane) * .42;
        if (desirability > best) { best = desirability; start = p; }
      }
    }
    if (!start) return;
    const kind = s.difficulty === 5 ? 'mid' : 'final';
    const tech = eras[s.eraIndex];
    const maxHp = kind === 'mid' ? 16 + 10 * s.pace : Math.round(36 + 17 * s.pace);
    const name = tech.bosses[kind === 'mid' ? 0 : 1];
    const moveEvery = (kind === 'mid' ? 1.23 : 1.05) - .06 * s.pace;
    s.boss = {
      ...start, id: s.nextId++, name, kind, hp: maxHp, maxHp, weak: false, stun: 0,
      signature: signatures[s.year][kind === 'mid' ? 0 : 1], riftOffered: false,
      moves: 0, next: start, previous: null, moveIn: moveEvery, moveEvery,
      lane: flightPlane(start.y), waypoint: start.x >= WIDTH / 2 ? 0 : (kind === 'mid' ? 1 : 2),
      attack: null, attackClock: 2.9, volleys: 0,
    };
    s.boss.next = patrol(s, s.boss);
    s.bossKind = kind;
    s.drones = [];
    s.nearBoss = 1;
    announce(s, 'boss', { name, kind });
    aim(s, s.boss);
  }

  function hurtBoss(s, amount, weapon) {
    const boss = s.boss;
    if (!boss) return;
    const scaled = boss.weak ? amount * 2 : Math.max(1, Math.floor(amount * .45));
    const damage = window.SnakeSingularite?.damage(s, boss, scaled) ?? scaled;
    if (damage <= 0) return;
    boss.hp = Math.max(0, boss.hp - damage);
    effect(s, 'bossHit', boss, .18, 1.2);
    announce(s, 'bossHit', { kind: boss.kind, weapon, damage, hp: boss.hp, heart: boss.weak, shield: !boss.weak });
    if (boss.hp > 0) return;
    effect(s, 'bossDefeated', boss, .75, 4);
    announce(s, 'bossDefeated', { name: boss.name, kind: boss.kind, weapon });
    s.finishers.push(weapon);
    s.score += (boss.kind === 'mid' ? 1500 : 4000) * (s.turbo ? 2 : 1);
    s.kills++;
    s.boss = null;
    s.bossKind = null;
    s.rift = null;
    if (s.flight && !window.SnakeFlight.land(s)) return;
    if (boss.kind === 'mid') {
      s.nextBossKind = 'final';
      s.novaCharge = 1;
      approach(s);
      openWorkshop(s);
    } else {
      if (s.finishers.length === 2 && s.finishers[0] !== s.finishers[1]) {
        s.bonus = { name: 'Double signature', points: 2000 };
        s.score += s.bonus.points;
        announce(s, 'bonus', s.bonus);
      }
      s.status = s.year === 2985 ? 'won' : 'cleared';
      s.turns.length = 0;
      s.progress = 1;
      announce(s, s.status === 'won' ? 'win' : 'clear', { eraIndex: s.eraIndex, year: s.year });
    }
  }

  // With no guaranteed exit from a warned line in the next few turns, delay the volley.
  function canEscape(s, danger) {
    if (s.flight) return true;
    const queue = [{ head: s.snake[0], dir: s.direction, trail: [], depth: 0 }];
    for (let i = 0; i < queue.length; i++) {
      const { head, dir, trail, depth } = queue[i];
      if (!danger.has(head.y * WIDTH + head.x)) return true;
      if (depth >= 4) continue;
      for (const d of directions) {
        if (d.x * dir.x + d.y * dir.y < 0) continue;
        const p = advance(head, d);
        if (!inside(p) || inHull(p, s.boss) || s.snake.some(q => equal(q, p)) || trail.some(q => equal(q, p))) continue;
        queue.push({ head: p, dir: d, trail: [...trail, head], depth: depth + 1 });
      }
    }
    return false;
  }

  function patternTiles(s, boss, axis) {
    const head = { x: Math.round(s.snake[0].x), y: Math.round(s.snake[0].y) }, tiles = [], signature = boss.signature;
    const gap = Math.max(2, Math.min(WIDTH - 3, head.x + (head.x < WIDTH / 2 ? 3 : -3)));
    // The singularity cycles three geometries. The combat renderer uses these exact same tiles.
    const phase = boss.volleys % 3;
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const dx = x - head.x, dy = y - head.y;
        const lateral = axis === 'row' ? dy : dx;
        let hit = false;
        switch (signature) {
          case 'Balayage binaire': hit = lateral === 0; break;
          case 'Banques de mémoire': hit = lateral % 4 === 0; break;
          case 'Pôles jumeaux': hit = lateral === 0 || lateral === (boss.volleys % 2 ? -2 : 2); break;
          case 'Visée en croix': hit = dx === 0 || dy === 0; break;
          case 'Feux de triage': {
            const track = axis === 'row' ? dx : dy;
            hit = Math.floor(Math.abs(track) / 3) % 2 === phase % 2 && Math.abs(lateral) <= 2;
            break;
          }
          case 'Convoi spectral': {
            const forward = axis === 'row' ? dx : dy;
            hit = Math.abs(lateral) <= 1 && ((forward + phase * 3) % 8 + 8) % 8 < 5;
            break;
          }
          case 'Anneau de pulsar': hit = Math.abs(dx) + Math.abs(dy) === 4; break;
          case 'Portes gravitationnelles':
            hit = (dy === 0 && Math.abs(x - gap) > 1)
              || (dy === (head.y < HEIGHT / 2 ? 4 : -4) && Math.abs(x - (WIDTH - 1 - gap)) > 1);
            break;
          case 'Prisme diagonal': hit = dx === dy || dx === -dy; break;
          case 'Effondrement fractal':
            if (phase === 0) hit = (dx === dy || dx === -dy || dx === 0) && Math.abs(dy) < 10;
            if (phase === 1) hit = Math.max(Math.abs(dx), Math.abs(dy)) === 3 || Math.max(Math.abs(dx), Math.abs(dy)) === 7;
            if (phase === 2) hit = (Math.abs(dy) === 0 || Math.abs(dy) === 3) && (Math.abs(dx) + 1) % 7 > 1;
            break;
        }
        if (hit) tiles.push({ x, y, plane: s.plane });
      }
    }
    return tiles;
  }

  function aim(s, boss) {
    const axis = (boss.volleys + Math.floor(s.pace)) % 2 === 0 ? 'column' : 'row';
    const tiles = patternTiles(s, boss, axis);
    const danger = new Set(tiles.map(p => p.y * WIDTH + p.x));
    if (!canEscape(s, danger)) {
      boss.attackClock = .25;
      return;
    }
    const warning = (boss.kind === 'mid' ? 1.68 : 1.50) - .065 * s.pace;
    boss.attack = {
      axis, line: axis === 'row' ? s.snake[0].y : s.snake[0].x,
      plane: s.plane, tiles, danger, pattern: boss.signature, label: boss.signature,
      phase: 'warning', remaining: warning, total: warning,
    };
    boss.weak = false;
    boss.volleys++;
    announce(s, 'bossAttack', { kind: boss.kind, plane: boss.attack.plane, pattern: boss.signature });
  }

  function offerRift(s, boss) {
    if (boss.kind !== 'final' || boss.riftOffered) return;
    const p = freeTile(s, tile => {
      const distanceFromHead = distance(tile, s.snake[0]);
      return distanceFromHead >= 3 && distanceFromHead <= 7 && !inHull(tile, boss.next);
    });
    if (!p) return;
    s.rift = { ...p, remaining: 7, total: 7 };
    boss.riftOffered = true;
    announce(s, 'riftOpen', p);
  }

  function collectRift(s) {
    const boss = s.boss, location = s.rift;
    s.riftUsed = true;
    s.rift = null;
    s.novaCharge = 1;
    boss.stun = 3;
    boss.weak = true;
    boss.attack = null;
    boss.attackClock = .35;
    effect(s, 'riftPickup', location, .52, 4);
    announce(s, 'riftPickup', { x: location.x, y: location.y });
  }

  function updateBoss(s, dt) {
    const boss = s.boss;
    if (s.rift) {
      s.rift.remaining -= dt;
      if (s.rift.remaining <= 0) { s.rift = null; announce(s, 'riftClose'); }
    }
    if (boss.stun > 0) { boss.stun = Math.max(0, boss.stun - dt); return; }
    boss.moveIn -= dt;
    if (boss.moveIn <= 0) {
      // A moving hull gives way to the player's head and tail.
      if (!s.snake.some(q => inHull(q, boss.next)) && !s.cells.some(q => inHull(q, boss.next)) && !(s.rift && inHull(s.rift, boss.next))) {
        boss.previous = { x: boss.x, y: boss.y, plane: boss.plane };
        boss.x = boss.next.x;
        boss.y = boss.next.y;
        boss.lane = flightPlane(boss.y);
      }
      boss.moves++;
      boss.next = patrol(s, boss);
      boss.moveIn += boss.moveEvery;
    }
    const attack = boss.attack;
    if (!attack) {
      boss.attackClock -= dt;
      if (boss.attackClock <= 0) aim(s, boss);
      return;
    }
    attack.remaining -= dt;
    if (attack.phase === 'warning' && attack.remaining <= 0) {
      attack.phase = 'active';
      announce(s, 'bossVolley', { kind: boss.kind, plane: boss.attack.plane, pattern: boss.signature });
      attack.total = .33 + .025 * s.pace;
      attack.remaining = attack.total;
    }
    if (attack.phase !== 'active') return;
    if (attack.remaining <= 0) {
      boss.attack = null;
      boss.weak = true;
      announce(s, 'recover', { kind: boss.kind });
      offerRift(s, boss);
      boss.attackClock = (boss.kind === 'mid' ? 2.7 : 2.1) - .12 * s.pace;
      return;
    }
    const head = s.snake[0];
    if (samePlane(attack, head) && attack.danger.has(Math.round(head.y) * WIDTH + Math.round(head.x))) death(s, boss.name, head);
  }

  function shoot(s) {
    const tech = eras[s.eraIndex];
    const head = s.snake[0], dir = s.direction;
    const lanes = Math.min(4, tech.lanes + Math.ceil(s.levels.rail / 2));
    const targets = [];
    let railHit = false;
    const intersects = s.flight ? (a, b, t, m) => flightRayHits(a, b, t, m + .4) : insideRay;
    for (let i = -lanes; i <= lanes; i++) {
      const from = { plane: s.plane, x: head.x + i * dir.y, y: head.y - i * dir.x };
      if (!inside(from)) continue;
      let reach = tech.railRange + 2 * s.levels.rail;
      for (const [axis, last] of [['x', WIDTH - 1], ['y', HEIGHT - 1]]) {
        if (dir[axis] > 0) reach = Math.min(reach, (last - from[axis]) / dir[axis]);
        if (dir[axis] < 0) reach = Math.min(reach, -from[axis] / dir[axis]);
      }
      const to = { x: from.x + dir.x * reach, y: from.y + dir.y * reach };
      beam(s, from, to, 'rail');
      if (s.boss && samePlane(head, s.boss) && intersects(from, to, s.boss, 1)) railHit = true;
      for (const drone of s.drones) {
        if (samePlane(head, drone) && drone.warmup <= 0 && intersects(from, to, drone, 0)) targets.push(drone);
      }
    }
    removeDrones(s, targets);
    announce(s, 'shot', { kind: 'rail', x: head.x, y: head.y });
    if (railHit) hurtBoss(s, tech.railPower + s.levels.rail, 'rail');
    if (s.status !== 'playing' || !s.levels.arc) return;
    let origins = s.snake.filter(p => samePlane(p, head));
    const arcTargets = [];
    const conductors = s.boss ? [...s.drones, s.boss] : s.drones;
    const reach = tech.arcRange + Math.sqrt(s.levels.arc);
    for (let link = 0; link < s.levels.arc + tech.chains; link++) {
      let hit = null, source = null, nearest = reach * reach + 0.01;
      for (const drone of conductors) {
        if (!samePlane(head, drone) || drone.warmup > 0 || arcTargets.includes(drone)) continue;
        for (const point of origins) {
          const measure = drone === s.boss ? hullDistanceSquared(point, drone) : squared(drone, point);
          if (measure < nearest) { nearest = measure; source = point; hit = drone; }
        }
      }
      if (!hit) break;
      beam(s, source, hit, 'arc');
      arcTargets.push(hit);
      origins = [hit];
    }
    if (arcTargets.length) {
      announce(s, 'shot', { kind: 'arc', targets: arcTargets.length });
      const hitBoss = s.boss && arcTargets.includes(s.boss);
      removeDrones(s, arcTargets.filter(d => d !== s.boss));
      if (hitBoss) hurtBoss(s, tech.railPower + s.levels.arc, 'arc');
    }
  }

  function fire(s) {
    if (s.status !== 'playing' || s.novaCharge < 1) return false;
    const origin = s.snake[0];
    s.novaCharge = 0;
    effect(s, 'nova', origin, 0.58, s.novaRadius);
    announce(s, 'nova', { ...origin, radius: s.novaRadius });
    removeDrones(s, s.drones.filter(d => samePlane(d, origin) && squared(d, origin) <= s.novaRadius ** 2));
    if (s.boss && samePlane(origin, s.boss) && hullDistanceSquared(origin, s.boss) <= s.novaRadius ** 2)
      hurtBoss(s, eras[s.eraIndex].blastPower + 2 * s.levels.nova, 'nova');
    return true;
  }

  function collect(s, item, head) {
    const [cell] = s.cells.splice(item, 1);
    s.eaten++;
    s.score += (cell.bonus ? 200 : 125) * s.sector * (s.turbo ? 2 : 1);
    s.novaCharge = Math.min(1, s.novaCharge + 0.20);
    effect(s, 'cell', head, 0.38, 1.2);
    announce(s, 'cell', { ...head, eaten: s.eaten });
    tune(s);
    const replacement = freeTile(s, undefined, layer(cell));
    if (replacement) s.cells.push({ ...replacement, bonus: Boolean(cell.bonus) });
    if (!s.boss) {
      s.sectorCells++;
      if (s.sectorCells >= CELLS_PER_SECTOR && s.difficulty < 10) {
        s.sectorCells = 0;
        s.difficulty++;
        s.sector = s.difficulty;
        tune(s);
        announce(s, 'sector', { sector: s.difficulty, difficulty: s.difficulty });
        effect(s, 'sector', head, 0.7, 3);
        if (s.difficulty === 5 || s.difficulty === 10) enterBoss(s);
        else if ([3, 7, 9].includes(s.difficulty)) openWorkshop(s);
      }
      approach(s);
    }
  }

  function march(s) {
    if (s.turns.length) s.direction = s.turns.shift();
    const head = advance(s.snake[0], s.direction);
    if (!inside(head)) { death(s, 'Mur', s.snake[0]); return; }
    const item = s.cells.findIndex(p => equal(p, head));
    // The tail vacates its tile on this step, except when a cell makes the snake grow.
    const bodyLength = s.snake.length - (item === -1 ? 1 : 0);
    if (s.snake.slice(0, bodyLength).some(p => equal(p, head))) { death(s, 'Ta propre queue', s.snake[0]); return; }
    if (s.boss && inHull(head, s.boss)) { death(s, s.boss.name, head); return; }
    if (s.drones.some(d => d.warmup <= 0 && equal(d, head))) { death(s, 'Drone', head); return; }
    s.previousSnake = s.snake;
    s.snake = [head, ...s.snake];
    if (item === -1) s.snake.pop();
    else collect(s, item, head);
    if (s.rift && equal(head, s.rift)) collectRift(s);
    if (s.status === 'playing') {
      if (item !== -1) window.SnakeFlight?.offer(s);
      window.SnakeFlight?.cross(s);
    }
  }

  function moveDrones(s, dt) {
    for (const d of s.drones) {
      if (d.warmup > 0) {
        d.warmup = Math.max(0, d.warmup - dt);
        // Never materialise a lethal drone underneath the player.
        if (d.warmup === 0 && s.snake.some(p => equal(d, p))) d.warmup = 0.25;
        continue;
      }
      d.moveIn -= dt;
      if (d.moveIn > 0) continue;
      if (!s.flight && equal(d.next, s.snake[0])) { death(s, 'Drone', s.snake[0]); return; }
      if (!s.snake.some(p => equal(p, d.next))) { d.x = d.next.x; d.y = d.next.y; }
      d.next = planDrone(s, d);
      d.moveIn += d.moveEvery;
    }
  }

  function age(items, dt) {
    for (let i = items.length - 1; i >= 0; i--) {
      items[i].life -= dt;
      if (items[i].life <= 0) items.splice(i, 1);
    }
  }

  function forgeHooks(s) {
    return {
      targets: () => s.boss ? [...s.drones, s.boss] : s.drones,
      plane: () => s.plane,
      visible: (from, target) => samePlane(from, target) && !(target.warmup > 0),
      damage(target, amount) {
        if (s.status !== 'playing') return;
        if (target === s.boss) hurtBoss(s, amount, 'forge');
        else if (s.drones.includes(target)) removeDrones(s, [target]);
      },
      pull(target, point) {
        if (!s.drones.includes(target) || !samePlane(target, point)) return;
        target.moveIn = Math.max(target.moveIn, .32);
        const options = directions.map(d => advance(target, d)).filter(p => inside(p)
          && !s.snake.some(q => equal(q, p)) && !s.cells.some(q => equal(q, p))
          && !s.drones.some(d => d !== target && (equal(p, d) || equal(p, d.next))));
        options.sort((a, b) => squared(a, point) - squared(b, point));
        if (options.length && squared(options[0], point) < squared(target, point)) {
          Object.assign(target, options[0]);
          target.next = planDrone(s, target);
        }
      },
      emit: (type, data) => announce(s, type, data),
    };
  }

  function step(s, dt) {
    s.elapsed += dt;
    s.planeCooldown = Math.max(0, s.planeCooldown - dt);
    if (s.planeShift) {
      s.planeShift.remaining -= dt;
      if (s.planeShift.remaining <= 0) s.planeShift = null;
    }
    age(s.shots, dt); age(s.effects, dt);
    const rechargeTime = 4 + (12 - s.pace * 1.05) / (1 + s.levels.nova * 0.6);
    s.novaCharge = Math.min(1, s.novaCharge + dt / rechargeTime);
    s.gunClock -= dt;
    if (s.gunClock <= 0) {
      shoot(s);
      s.gunClock += 0.20 + (0.75 - s.pace * 0.07) / (1 + 0.075 * (s.snake.length - 5) + 0.48 * s.levels.rail);
    }
    if (s.status !== 'playing') return;
    window.SnakeForge?.update(s, dt, forgeHooks(s));
    if (s.status !== 'playing') return;
    if (s.flight) window.SnakeFlight.step(s, dt);
    else advanceGrid(s, dt);
    if (s.status !== 'playing') return;
    if (s.boss) updateBoss(s, dt);
    if (s.status !== 'playing') return;
    moveDrones(s, dt);
    if (s.status !== 'playing') return;
    spawnWave(s, dt);
  }

  function advanceGrid(s, dt) {
    s.stepClock += dt;
    if (s.stepClock + 1e-10 >= s.stepTime) {
      s.stepClock = Math.max(0, s.stepClock - s.stepTime);
      march(s);
      if (s.status !== 'playing') return;
    }
    s.progress = Math.min(1, s.stepClock / s.stepTime);
  }

  function spawnWave(s, dt) {
    s.spawnClock -= dt;
    if (s.spawnClock <= 0) {
      if (!s.boss && s.drones.length < Math.min(14, 2 + s.difficulty + Math.floor(s.pace))) spawnDrone(s);
      s.spawnClock = 0.65 + 2.4 / (1 + s.sector * 0.42);
    }
  }

  function tick(s, dt) {
    if (!Number.isFinite(dt) || dt <= 0 || s.status !== 'playing') return;
    // Bound internal substeps to keep collisions and queued turns ordered across frame rates.
    while (dt > 1e-9 && s.status === 'playing') {
      const slice = Math.min(1 / 60, dt);
      step(s, slice);
      dt -= slice;
    }
  }

  function upgrade(s, id) {
    if (s.status !== 'upgrade' || !weapons.some(w => w.id === id)) return false;
    s.levels[id]++;
    s.status = 'playing';
    s.gunClock = 0;
    s.stepClock = 0;
    s.previousSnake = s.snake.slice();
    s.progress = 0;
    tune(s);
    if (id === 'nova') s.novaCharge = 1;
    announce(s, 'upgrade', { id, level: s.levels[id] });
    return true;
  }

  window.SnakeArcade = { create, turn, shiftPlane, turbo, tick, fire, upgrade, weapons, eras };
})();

;
(() => {
  'use strict';
  const sessions=new WeakMap();
  const within=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<=.51;
  const emit=(s,type,data={})=>{
    if(s.events.length>=96)s.events.shift();s.events.push({type,...data});
  };
  function session(s){
    const b=s.boss;
    if(!b||s.year!==2985||b.kind!=='final')return null;
    const old=sessions.get(s);
    if(old?.boss===b)return old;
    const restored=b.singularityAct;
    if(!restored||!['pending','split','open'].includes(restored.phase)||!Array.isArray(restored.points))return null;
    Object.defineProperty(restored,'boss',{value:b,configurable:true});
    sessions.set(s,restored);return restored;
  }
  function split(s,b){
    const v={phase:'pending',points:[],index:0,route:null,elapsed:0,cue:'',placed:false,waited:false};
    Object.defineProperty(v,'boss',{value:b,configurable:true});b.singularityAct=v;
    sessions.set(s,v);return v;
  }
  function damage(s,b,amount){
    if(s.year!==2985||b?.kind!=='final'||b!==s.boss||s.status!=='playing'||!(amount>0))return amount;
    const v=session(s);
    if(v?.boss===b){
      // Une vraie ouverture au sein du sous-pas (surf ou faille) porte déjà ses dégâts.
      if(v.phase==='split'&&b.weak&&b.stun>0){
        unlock(s,v,s.riftUsed?'faille':'contre');return amount;
      }
      return v.phase==='open'?amount:0;
    }
    const half=Math.ceil(b.maxHp/2);
    if(b.hp-amount>half)return amount;
    split(s,b);
    return Math.max(0,b.hp-half);
  }
  const dir4=[[1,0],[0,1],[-1,0],[0,-1]];
  function safe(s,x,y,plane){
    if(x<1||y<1||x>=s.width-1||y>=s.height-1)return false;
    for(const p of [s.boss,s.boss?.next])if(p && (p.plane??s.boss.plane)===plane&&Math.abs(x-p.x)<=1&&Math.abs(y-p.y)<=1)return false;
    if(s.boss?.attack?.plane===plane&&s.boss.attack.danger.has(y*s.width+x))return false;
    const same=p=>p&&(p.plane??0)===plane&&p.x===x&&p.y===y;
    return ![s.rift,s.flightGate,...s.snake,...s.cells,...s.drones,...s.drones.map(d=>d.next)].some(same);
  }
  function place(s,v){
    if(s.flight)return;
    const head=s.snake[0],plane=s.plane,to=1-plane;
    const dirs=[...dir4].sort((a,b)=>(b[0]-a[0])*s.direction.x+(b[1]-a[1])*s.direction.y);
    // Un court chemin témoin garantit des cases libres sur les deux plans au placement.
    for(const d of dirs){
      if(s.direction.x*d[0]+s.direction.y*d[1]<-.1)continue;
      for(const end of [[-d[1],d[0]],[d[1],-d[0]],d]){
        const point=(i,j,z)=>({x:head.x+i*d[0]+j*end[0],y:head.y+i*d[1]+j*end[1],plane:z});
        const one=point(2,0,plane),two=point(2,2,to);
        const gate=s.shiftMode!=='portal'||s.planeGates?.some(p=>Math.abs(p.x-one.x)+Math.abs(p.y-one.y)<=1);
        if(!gate)continue;
        if([point(1,0,plane),one,point(2,0,to),point(2,1,to),two].every(p=>safe(s,p.x,p.y,p.plane))){
          v.points=[one,two];v.placed=true;return;
        }
      }
    }
  }
  function unlock(s,v,route){
    v.route=route;v.phase='open';v.cue=route==='balises'?'Salve désarmée · cœur ouvert':route==='espace'?'Passage libre · poursuis le combat':'Cœur ouvert · riposte';
    if(route==='balises'||route==='surf'){
      v.boss.attack=null;v.boss.weak=true;v.boss.stun=Math.max(v.boss.stun,2.45);
      v.boss.attackClock=Math.max(.45,v.boss.attackClock||0);
    }
    emit(s,'singularityOpen',{route,plane:v.boss.plane});
  }
  function sync(s){
    const v=session(s);
    if(!v)return;
    if(v.boss!==s.boss||s.status!=='playing'){sessions.delete(s);return;}
    const b=v.boss;
    if(v.phase==='pending'){
      v.phase='split';v.cue='Deux balises ou esquive les contours';
      place(s,v);
      if(!v.points.length)v.cue='Esquive les contours · puis vise le cœur';
      if(!b.attack&&!(b.stun>0)&&v.points.length){
        b.weak=false;b.attackClock=Math.min(.12,b.attackClock||.12);
      }
      emit(s,'singularitySplit',{plane:s.plane,beacons:v.points.map(p=>({...p}))});
      if(!v.points.length&&!b.attack&&!(b.stun>0)){unlock(s,v,'espace');return;}
    }
    if(v.phase!=='split')return;
    if(b.weak&&b.stun>0){unlock(s,v,s.riftUsed?'faille':'contre');return;}
    if(b.attack)v.waited=true;
    if(!v.waited&&!b.attack&&v.elapsed>1.45){unlock(s,v,'espace');return;}
    if(v.waited&&!b.attack&&b.weak){unlock(s,v,'esquive');return;}
    if(!v.placed&&!s.flight){
      const h=s.snake[0],at=h.x+','+h.y+','+s.plane;
      if(v.lastTry!==at){v.lastTry=at;place(s,v);}
    }
    const target=v.points[v.index];
    if(!target||s.flight||s.plane!==target.plane||!within(s.snake[0],target))return;
    v.index++;
    if(v.index===2){unlock(s,v,'balises');return;}
    v.cue='Bascule · rejoins la seconde balise';emit(s,'singularityBeacon',{index:1,plane:target.plane,...target});
  }
  function tick(s,dt,next){
    if(!Number.isFinite(dt)||dt<=0||s.status!=='playing')return;
    if(s.year!==2985||s.boss?.kind!=='final'){next(s,dt);return;}
    let left=dt;
    while(left>1e-9&&s.status==='playing'){
      const d=Math.min(1/60,left);sync(s);
      const b=s.boss,prior=b?.hp,diving=s.flight?.surf==='plongée';
      next(s,d);
      const surf=diving&&b===s.boss&&b&&b.hp<prior&&s.events.some(e=>e.type==='bossHit'&&e.weapon==='surf'&&e.hp===b.hp);
      if(surf&&b.kind==='final'&&b.hp<=Math.ceil(b.maxHp/2)&&!session(s))split(s,b);
      sync(s);
      if(surf&&session(s)?.phase==='split')unlock(s,session(s),'surf');
      const v=session(s);if(v)v.elapsed+=d;left-=d;
    }
  }
  function read(s){
    const v=session(s);
    if(!v||v.boss!==s.boss||s.status!=='playing'||v.phase==='pending')return null;
    return {phase:v.phase,route:v.route,index:v.index,elapsed:v.elapsed,cue:v.cue,
      points:v.phase==='split'?v.points.map((p,i)=>({...p,index:i+1,armed:i===v.index,done:i<v.index})):[]};
  }
  function draw(c,s,cam,z,t,reduced,project){
    const v=read(s);if(!v||v.phase!=='split')return;
    c.save();c.lineJoin='round';c.lineCap='round';
    function stroke(pts,col,w){c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
    for(const p of v.points){
      if(p.plane!==z||p.done)continue;
      const q=project(cam,p.x,p.y,z),r=7+(p.armed&&!reduced?Math.sin(t*4):0);
      const diamond=[{x:q.x,y:q.y-r},{x:q.x+r,y:q.y},{x:q.x,y:q.y+r},{x:q.x-r,y:q.y},{x:q.x,y:q.y-r}];
      stroke(diamond,'#172234',4.5);stroke(diamond,p.armed?'#fff1a4':'#80dbe4',2);
      for(let i=0;i<p.index;i++){
        const x=q.x+(i-(p.index-1)/2)*3;stroke([{x,y:q.y-2},{x,y:q.y+2}],'#fff8dc',1.6);
      }
    }
    if(s.boss.plane===z){
      const q=project(cam,s.boss.x,s.boss.y,z),r=16*(q.k||1)*cam.zoom;
      for(const d of [-1,1])stroke([{x:q.x+d*r*.52,y:q.y-r},{x:q.x+d*r,y:q.y-r*.5},{x:q.x+d*r*1.1,y:q.y}],d===1?'#86eced':'#ffe0a1',2.3);
    }
    c.restore();
  }
  const api={damage,tick,read,draw};
  if(typeof window!=='undefined')window.SnakeSingularite=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(() => {
  'use strict';

  // u is the distance ahead at lock-on, v is the signed distance across that bearing.
  const patterns = [
    {name:'Balayage binaire', hint:'Décale ta route d’une ligne.', warn:1.3, counter:2.9,
      hits:(u,v) => v === 0},
    {name:'Banques de mémoire', alternates:true, hint:'La copie de la bande frappe l’autre plan.', warn:1.25, counter:3.3, beats:2,
      hits:(u,v,b) => ((v - b * 2) % 5 + 5) % 5 <= 1},
    {name:'Pôles jumeaux', hint:'Les deux pôles ferment leurs mâchoires. Sors du couloir.', warn:1.25, counter:2.8, beats:2,
      hits:(u,v,b) => Math.abs(v) === (b ? 0 : 2) || (b === 0 && u === 6 && Math.abs(v) <= 2)},
    {name:'Visée en croix', hint:'Les axes convergent devant ta tête. Coupe en diagonale ou change de plan.', warn:1.45, counter:2.8,
      hits:(u,v) => u === 5 || v === 0},
    {name:'Feux de triage', hint:'Les feux échangent les voies rouges. Coupe entre deux signaux verts.', warn:1.36, counter:3.1, beats:2,
      hits:(u,v,b) => Math.abs(v)<=3 && ((Math.floor((u+2)/4)+Math.floor((v+3)/2)+b)%2+2)%2===0},
    {name:'Convoi spectral', hint:'Le train traverse trois voies. Passe entre les wagons ou plonge sous le convoi.', warn:1.48, counter:3.35, beats:3,
      hits:(u,v,b) => Math.abs(v-[0,3,-2][b])<=1 && ((u+2-3*b)%10+10)%10<7},
    {name:'Anneau de pulsar', hint:'Deux anneaux successifs s’éloignent du point marqué.', warn:1.35, counter:2.5, beats:2,
      hits:(u,v,b) => [0,1].includes(Math.abs(u - 3) + Math.abs(v) - (b ? 7 : 3))},
    {name:'Portes gravitationnelles', hint:'Cherche les ouvertures opposées des deux portes.', warn:1.6, counter:3,
      hits:(u,v) => (u >= 4 && u <= 5 && Math.abs(v - 2) > 1) || (u >= 8 && u <= 9 && Math.abs(v + 2) > 1)},
    {name:'Prisme diagonal', hint:'Les obliques se croisent devant toi. Trouve leur intervalle.', warn:1.35, counter:2.8,
      hits:(u,v) => Math.abs(u - 4) === Math.abs(v) || Math.abs(u - 9) === Math.abs(v)},
    {name:'Effondrement fractal', alternates:true, hint:'Les trois contours se resserrent en alternant les plans.', warn:1.55, counter:3.6, beats:3,
      hits:(u,v,b) => Math.max(Math.abs(u-4),Math.abs(v)) === [7,4,1][b]},
  ];
  const bySignature = new Map(patterns.map(p => [p.name,p]));
  const sessions = new WeakMap();
  const emit = (s, type, data) => {
    if (s.events.length >= 96) s.events.shift();
    s.events.push({type,...data});
  };

  function lock(s, boss) {
    const p = bySignature.get(boss.signature);
    const head = s.snake[0], dir = s.direction;
    const horizontal = Math.abs(dir.x) >= Math.abs(dir.y);
    let dx = horizontal ? Math.sign(dir.x) || 1 : 0;
    let dy = horizontal ? 0 : Math.sign(dir.y);
    // Keep the projected gate or convergence point inside the arena near a wall.
    const room = horizontal ? (dx > 0 ? s.width-1-head.x : head.x)
      : (dy > 0 ? s.height-1-head.y : head.y);
    if (room < 5) { dx = -dx; dy = -dy; }
    const wave = { boss, profile:p, x:Math.round(head.x), y:Math.round(head.y), dx, dy,
      plane:s.plane, beat:0, attack:null };
    sessions.set(s,wave);
    return wave;
  }

  function arm(s,wave) {
    const {profile:p,boss,dx,dy,x:cx,y:cy,beat} = wave;
    const plane = p.alternates ? (wave.plane + beat) % 2 : wave.plane;
    const tiles = [], danger = new Set();
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const u = (x-cx)*dx + (y-cy)*dy, v = (y-cy)*dx - (x-cx)*dy;
        if (!p.hits(u,v,beat)) continue;
        tiles.push({x,y,plane});
        danger.add(y*s.width+x);
      }
    }
    const warning = beat ? .84 : p.warn;
    boss.attack = {plane,tiles,danger,axis:dy ? 'column' : 'row',line:dy ? cx : cy,
      pattern:p.name,label:p.name,phase:'warning',remaining:warning,total:warning};
    boss.weak = false;
    wave.attack = boss.attack;
    emit(s,'guardianWarning',{signature:p.name,plane,beat:beat+1,beats:p.beats||1,hint:p.hint});
  }

  function sync(s) {
    const boss = s.boss;
    if (!boss || boss.stun > 0) { sessions.delete(s); return; }
    const wave = sessions.get(s);
    if (boss.attack && (!wave || wave.attack !== boss.attack || wave.boss !== boss)) {
      arm(s,lock(s,boss));
    } else if (wave && wave.attack && !boss.attack && boss.weak) {
      if (++wave.beat < (wave.profile.beats||1)) {
        // The native motor emits recover when one volley ends; here the shield stays shut.
        const recovery = s.events.findLastIndex(e => e.type === 'recover');
        if (recovery >= 0) s.events.splice(recovery,1);
        arm(s,wave);
      } else {
        wave.attack = null;
        boss.attackClock = wave.profile.counter;
        emit(s,'guardianCounter',{signature:wave.profile.name,plane:boss.plane,seconds:boss.attackClock});
      }
    }
  }

  function tick(s,dt) {
    if (!Number.isFinite(dt) || dt <= 0 || s.status !== 'playing') return;
    sync(s);
    while (dt > 1e-9 && s.status === 'playing') {
      const slice = Math.min(1/60,dt);
      window.SnakeArcade.tick(s,slice);
      sync(s);
      dt -= slice;
    }
  }

  function read(s) {
    if (!s.boss) return null;
    const boss=s.boss, wave=sessions.get(s), p=bySignature.get(boss.signature);
    return {name:boss.name,signature:p.name,hint:boss.weak ? 'Cœur ouvert : reviens sur son plan et tire.' : p.hint,
      phase:boss.attack?.phase || (boss.weak ? 'counter' : 'ready'),
      remaining:boss.attack?.remaining ?? (boss.stun || boss.attackClock),
      plane:boss.attack?.plane ?? boss.plane,beat:Math.min((wave?.beat||0)+1,p.beats||1),beats:p.beats||1};
  }

  window.SnakeGardiens = {tick,read};
})();

;
(() => {
  'use strict';
  const routes=new WeakMap(), installed=new WeakSet();
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  const key=(s,p)=>Math.round(p.y)*s.width+Math.round(p.x);
  const hull=(p,b)=>Math.max(Math.abs(p.x-b.x),Math.abs(p.y-b.y));
  const inside=(s,p)=>p.x>=0&&p.y>=0&&p.x<=s.width-1&&p.y<=s.height-1;
  const point=(p,dx,dy,n=1)=>({x:p.x+dx*n,y:p.y+dy*n,plane:p.plane});
  function emit(s,type,more={}) {
    if(s.events.length>=96)s.events.shift();
    s.events.push({type,plane:s.plane,...more});
  }
  const eligible=s=>s.boss?.kind==='final' && ((s.year===1995 && s.boss.signature==='Convoi spectral')
    || (s.year===2985 && s.boss.signature==='Effondrement fractal'));
  function passable(s,p){
    if(!inside(s,p))return false;
    const b=s.boss;
    return !(b && b.plane===p.plane && [b,b.next].some(q=>q&&hull(p,q)<=1.4))
      && !s.drones.some(d=>d.plane===p.plane && (dist(p,d)<.75 || (d.next && dist(p,d.next)<.75)));
  }
  // Search reachable boarding squares. Every marked segment shares its side with real attack tiles.
  function route(s,a) {
    const h=s.snake[0], max=Math.min(6,Math.floor((a.remaining-.12)/s.stepTime));
    const queue=[{...h,steps:0}], seen=new Set([key(s,h)]);
    let best=null,cost=Infinity;
    for(let i=0;i<queue.length;i++){
      const p=queue[i];
      for(const [nx,ny] of dirs){
        if(!a.danger.has(key(s,point(p,nx,ny))) || a.danger.has(key(s,p)))continue;
        for(const sign of [-1,1]){
          const dx=-ny*sign,dy=nx*sign;
          const edge=[];
          for(let j=0;j<=8;j++){
            const q=point(p,dx,dy,j),neighbour=point(q,nx,ny);
            if(!inside(s,neighbour)||!a.danger.has(key(s,neighbour))||a.danger.has(key(s,q))||!passable(s,q))break;
            edge.push(q);
          }
          if(edge.length<4)continue;
          const launch=edge[Math.min(edge.length-1,Math.round(3.1*Math.max(.2,a.remaining-p.steps*s.stepTime)))];
          const approach=((s.boss.x-launch.x)*dx+(s.boss.y-launch.y)*dy)/Math.max(1,dist(launch,s.boss));
          const next=point(launch,dx,dy);
          const clearance=!inside(s,next)||a.danger.has(key(s,next))?5:0;
          const rank=1.3*p.steps+dist(launch,s.boss)*.18-.18*Math.min(edge.length,6)-2.3*approach+clearance;
          if(rank<cost){best={gate:point(p,0,0),edge,dx,dy};cost=rank;}
        }
      }
      if(p.steps>=max)continue;
      for(const [dx,dy] of dirs){
        if(!p.steps && dx*s.direction.x+dy*s.direction.y<0)continue;
        const q=point(p,dx,dy),k=key(s,q);
        if(seen.has(k)||!passable(s,q)||s.snake.slice(1).some(o=>o.plane===q.plane&&dist(o,q)<.8))continue;
        seen.add(k);queue.push({...q,steps:p.steps+1});
      }
    }
    return best;
  }
  function offer(s){
    if(s.status!=='playing'||s.flight||!eligible(s))return;
    const a=s.boss.attack;
    if(a?.phase!=='warning'||!Number.isFinite(a.remaining)||a.remaining<=0||a.plane!==s.plane||s.boss.plane!==s.plane||routes.get(s)?.attack===a)return;
    const front=route(s,a);
    routes.set(s,{attack:a,boss:s.boss,front,spent:false});
    if(front)emit(s,'surfGate',{...front.gate});
  }
  function read(s){
    const r=routes.get(s);
    if(s.status!=='playing'||!r || !r.front || s.boss!==r.boss)return null;
    const f=s.flight;
    if(f?.surf)return {phase:f.surf,gate:r.front.gate,edge:r.front.edge,plane:s.plane,
      pulse:windowOpen(s,f),target:{x:r.boss.x,y:r.boss.y,plane:r.boss.plane},remaining:f.remaining};
    if(f||r.spent||r.attack!==s.boss.attack||r.attack.phase!=='warning'||s.plane!==r.attack.plane)return null;
    return {phase:'porte',gate:r.front.gate,edge:r.front.edge,plane:r.attack.plane,
      accessible:dist(s.snake[0],r.front.gate)<.55,remaining:r.attack.remaining};
  }
  function windowOpen(s,f){
    const a=s.boss?.attack,r=routes.get(s);
    return f.surf==='crête' && a===r?.attack && f.along>=.8 && f.steered
      && a.phase==='active';
  }
  function action(s){
    const v=read(s);if(!v)return false;
    const r=routes.get(s);
    if(v.phase==='porte' && v.accessible && r.attack.remaining>.16){
      const angle=Math.atan2(r.front.dy,r.front.dx),total=4;
      s.flight={surf:'crête',angle,targetAngle:angle,remaining:total,total,passed:0,goal:1,rings:[],
        along:0,steered:false,trail:s.snake.map(p=>({...p}))};
      s.direction={x:r.front.dx,y:r.front.dy};s.turns.length=0;s.progress=1;
      r.spent=true;emit(s,'surfStart',{...r.front.gate});return true;
    }
    if(v.pulse){
      const f=s.flight;
      f.surf='plongée';f.remaining=2.2;f.total=2.2;
      // The rider launches tangentially and must turn toward the current hull.
      emit(s,'surfPulse');return true;
    }
    return false;
  }
  function land(s,reason,success=false){
    const f=s.flight;
    if(!f?.surf)return false;
    // The ordinary grid landing reserves two forward steps. An incomplete slalom cannot pay out.
    f.goal=1;f.passed=0;
    const landed=window.SnakeFlight.land(s,reason);
    if(s.events.at(-1)?.type==='flightEnd')s.events.pop();
    emit(s,'surfEnd',{success:success&&landed,reason});
    return landed;
  }
  function cancel(s){return s.status==='playing'&&land(s,'Abandon');}
  function trace(s,h){
    const f=s.flight,trail=f.trail;
    trail.unshift(h);
    let total=0,i=1;
    const body=[h],size=s.snake.length;
    for(;i<trail.length && body.length<size;i++){
      const a=trail[i-1],b=trail[i],d=dist(a,b);
      while(d>0 && body.length<=total+d+1e-8 && body.length<size){
        const k=clamp((body.length-total)/d,0,1);
        body.push({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,plane:k<1?a.plane:b.plane});
      }
      total+=d;
    }
    while(body.length<size)body.push({...trail.at(-1)});
    trail.length=i;s.previousSnake=s.snake;s.snake=body;s.progress=1;
  }
  function move(s,dt){
    const f=s.flight,r=routes.get(s),b=s.boss;
    if(!r||r.boss!==b||s.plane!==b.plane||b.stun>0){land(s,'Onde interrompue');return;}
    if(f.surf==='crête' && b.attack!==r.attack){land(s,'Front passé');return;}
    f.remaining-=dt;
    if(f.remaining<=0){land(s,'Fenêtre écoulée');return;}
    f.angle+=clamp(delta(f.angle,f.targetAngle)*(1-Math.exp(-16*dt)),-9*dt,9*dt);
    s.direction={x:Math.cos(f.angle),y:Math.sin(f.angle)};
    const speed=f.surf==='crête'?3.1:18;
    const p=point(s.snake[0],s.direction.x,s.direction.y,speed*dt);
    if(!inside(s,p)||s.drones.some(d=>d.warmup<=0&&d.plane===s.plane&&dist(d,p)<.7)){
      land(s,'Sortie du front');return;
    }
    const a=b.attack;
    if(a && a.plane===s.plane && (a.phase==='active'||a.remaining<=dt+.002) && a.danger.has(key(s,p))){
      land(s,'Salve traversée');return;
    }
    if(f.surf==='crête'){
      const {gate,edge,dx,dy}=r.front;
      f.along=(p.x-gate.x)*dx+(p.y-gate.y)*dy;
      const cross=Math.abs((p.y-gate.y)*dx-(p.x-gate.x)*dy);
      if(cross>.80||f.along<-.55||f.along>edge.length-.30){land(s,'Crête quittée');return;}
    }
    if(hull(p,b)<=1.35){
      if(f.surf!=='plongée'){land(s,'Coque');return;}
      const damage=Math.min(Math.max(0,b.hp-1),s.year===1995?9:12);
      if(land(s,damage?'Impact au cœur':'Bouclier résiduel',damage>0) && damage>0){
        b.hp-=damage;
        s.effects.push({kind:'bossHit',x:b.x,y:b.y,plane:b.plane,radius:1.2,life:.18,maxLife:.18});
        emit(s,'bossHit',{kind:b.kind,weapon:'surf',damage,hp:b.hp,heart:true,shield:false});
      }
      return;
    }
    trace(s,p);
  }
  // Project only unoccupied edge marks on the safe side. The native danger mask remains visible.
  function draw(canvas,s,reduced=false){
    const view=read(s),renderer=window.SnakeSpectacle;
    if(!view||!renderer||view.phase==='plongée')return;
    const c=canvas.getContext('2d');if(!c)return;
    const cam=renderer.camera(s,reduced?0:s.elapsed,reduced);
    const project=p=>renderer.project(cam,p.x,p.y,p.plane);
    c.save();c.setTransform(canvas.width/renderer.width,0,0,canvas.height/renderer.height,0,0);
    c.strokeStyle=view.pulse?'#ffe68a':'#95ffdb';c.lineWidth=1.7;
    const gate=project(view.gate);
    if(view.phase==='porte'){
      c.beginPath();c.ellipse(gate.x,gate.y,7,4.5,0,0,Math.PI*2);c.stroke();
    }
    const e=view.edge;
    for(let i=1;i<Math.min(6,e.length-1);i+=2){
      const p=project(e[i]),q=project(e[i+1]),d=Math.max(1,Math.hypot(q.x-p.x,q.y-p.y));
      const x=(q.x-p.x)/d,y=(q.y-p.y)/d;
      c.beginPath();c.moveTo(p.x-3*x-2*y,p.y-3*y+2*x);c.lineTo(p.x,p.y);
      c.lineTo(p.x-3*x+2*y,p.y-3*y-2*x);c.stroke();
    }
    c.restore();
  }
  function install(){
    const g=window.SnakeGardiens,fly=window.SnakeFlight;
    if(!g||!fly)return false;
    if(installed.has(g))return true;
    installed.add(g);
    const nativeTick=g.tick,nativeMove=fly.step,nativeAim=fly.aim,nativeLand=fly.land;
    fly.step=(s,dt)=>s.flight?.surf?move(s,dt):nativeMove(s,dt);
    fly.aim=(s,x,y)=>{
      const accepted=nativeAim(s,x,y);
      if(accepted&&s.flight?.surf)s.flight.steered=true;
      return accepted;
    };
    fly.land=(s,reason)=>{
      if(s.flight?.surf){s.flight.passed=0;s.flight.goal=1;}
      return nativeLand(s,reason);
    };
    g.tick=(s,dt)=>{
      if(!(dt>0)||!Number.isFinite(dt)||s.status!=='playing')return;
      while(dt>1e-9 && s.status==='playing'){
        const slice=Math.min(dt,1/60);
        nativeTick(s,slice);offer(s);dt-=slice;
      }
    };
    return true;
  }
  window.SnakeSurf=Object.freeze({install,read,action,cancel,draw});
})();

;
(function (root, factory) {
  const director = factory();
  if (typeof module === 'object') module.exports = director;
  else root.SnakeDirector = director;
})(globalThis, function () {
  'use strict';
  const warning = 1.5, windowLength = 7;
  const basePoints = { convoi: 100, mue: 160, aiguillage: 190, surf: 200, relais: 260 };
  const books = {1976:['convoi'],1985:['mue','convoi'],1995:['aiguillage','convoi'],
    2185:['surf','convoi'],2985:['relais','surf','mue']};
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const same = (a,b,r=0.85) => a && b && (a.plane??0)===(b.plane??0) && distance(a,b)<=r;
  function create() {
    return { phase:'rest', remaining:1, offer:null, intensity:0, chain:0, turn:0,
      era:null, kills:0, previous:null, trackedFlight:null, rounds:0 };
  }
  function anchors(s,kind) {
    const head=s.snake[0], plane=s.plane, opposite=1-plane;
    if (kind==='surf') {
      if (s.flightGate) return [{...s.flightGate}];
      return null;
    }
    const dir=s.direction;
    const free=p => p.x>=1 && p.y>=1 && p.x<s.width-1 && p.y<s.height-1 &&
      !s.drones.some(dr=>same(dr,p,1.25) || same(dr.next,p,1)) &&
      !s.snake.slice(1).some(seg=>same(seg,p)) && !same(s.flightGate,p);
    const vectors=[dir,{x:-dir.y,y:dir.x},{x:dir.y,y:-dir.x}];
    for (const v of vectors) {
      const origin={x:Math.round(head.x+v.x*5),y:Math.round(head.y+v.y*5),plane};
      if(kind==='aiguillage'){
        for(const side of [1,-1]){
          const at=(forward,lateral)=>({x:origin.x+forward*v.x-lateral*side*v.y,
            y:origin.y+forward*v.y+lateral*side*v.x,plane});
          const tracks=[origin,at(0,2),at(4,2),at(0,-2),at(7,0),at(-2,0)];
          if(tracks.every(free))return tracks;
        }
        continue;
      }
      if(s.shiftMode==='portal' && kind!=='convoi'){
        const gate=s.planeGates.find(g=>distance(g,origin)<5 && distance(g,head)<9);
        if(!gate)continue;
        origin.x=gate.x;origin.y=gate.y;
      }
      const target={x:origin.x+Math.round(v.x*3),y:origin.y+Math.round(v.y*3),plane:kind==='convoi'?plane:opposite};
      const path=[origin,target];
      if(kind==='relais')path.push({...origin});
      if(path.every(free))return path;
    }
    return null;
  }
  function tick(d,s,dt) {
    const events=[];let points=0;
    const result=()=>({events,points,suppressWaves:d.phase==='boss'||d.phase==='recovery'});
    if (!Number.isFinite(dt)||dt<=0||s.status!=='playing')return result();
    const h={...s.snake[0],plane:s.plane};
    if(d.era!==s.year){
      Object.assign(d,create(),{era:s.year,kills:s.kills});
    }
    const crowd=s.drones.filter(dr=>same(dr,h,3.1)).length;
    const target=Math.min(1,crowd*.45+Math.min(1,Math.max(0,s.kills-d.kills))*.6);
    d.intensity=Math.max(target,d.intensity*Math.exp(-dt/2.4));d.kills=s.kills;
    function transition(phase,remaining) { d.phase=phase;d.remaining=remaining; }
    function rest(reason,delay,phase='rest'){
      if(d.offer) events.push({type:'close',kind:d.offer.kind,reason});
      d.offer=null;d.trackedFlight=null;transition(phase,delay);
    }
    const before=d.previous;d.previous=h;
    if(s.boss || s.nearBoss>=.84){
      if(d.phase!=='boss'){
        rest(s.boss?'boss':'approche',0,'boss');d.chain=0;events.push({type:'bossBreath'});
      }
      return result();
    }
    if(d.phase==='boss'){transition('recovery',4);return result();}
    d.remaining-=dt;
    const o=d.offer;
    if(!o){
      if(d.remaining>1e-8)return result();
      if(d.intensity>.72){transition('recovery',1.5);return result();}
      if(s.flight){transition('rest',.25);return result();}
      const list=books[s.year], planned=list[d.turn%list.length];
      let kind=planned;
      if(planned==='surf' && !s.flightGate){kind='convoi';}
      const path=anchors(s,kind);
      if(!path){transition('rest',.5);return result();}
      // Keep a pending surf slot until a gate opens, but allow a convoy meanwhile.
      if(planned===kind)d.turn++;
      d.offer={kind,phase:'warning',anchors:path,step:0,remaining:warning,elapsed:0,
        armed:false, touchedTrain:false};
      transition('warning',warning);events.push({type:'warning',kind});return result();
    }
    o.remaining=Math.max(0,d.remaining);
    if(o.kind==='surf' && !o.armed && s.flight && same(h,o.anchors[0],1.5)){
      o.armed=true;d.trackedFlight=s.flight;events.push({type:'capture',kind:o.kind});
    }
    if(d.phase==='warning'){
      if(d.remaining>1e-8)return result();
      transition('active',windowLength);o.phase='active';o.remaining=d.remaining;
      events.push({type:'open',kind:o.kind});
    }
    o.elapsed+=dt;
    const [a,b,c]=o.anchors;
    if(o.kind==='convoi'){
      // A moving gate spans the announced line once; the tail opens the bonus.
      const u=Math.min(1,o.elapsed/2);o.train={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,plane:a.plane};
      if(u<1 && same(h,o.train,.74)){o.touchedTrain=true;}
      if(u>=1 && !o.touchedTrain && same(h,b))o.step=1;
    }else if(o.kind==='aiguillage'){
      const [,branch,finish,siding,start,end]=o.anchors;
      const u=Math.min(1,o.elapsed/6);
      o.train={x:start.x+(end.x-start.x)*u,y:start.y+(end.y-start.y)*u,plane:a.plane};
      if(same(h,o.train,.8)){
        d.chain=0;rest('train',3,'recovery');return result();
      }
      if(same(h,siding)){
        d.chain=0;rest('voie libre',2,'recovery');return result();
      }
      if(o.step===0 && same(h,a) && before && before.plane===h.plane &&
         (h.x-before.x)*(start.x-end.x)+(h.y-before.y)*(start.y-end.y)>0){
        o.step=1;events.push({type:'aiguille',kind:o.kind});
      }
      if(o.step===1 && same(h,branch)){o.step=2;events.push({type:'branche',kind:o.kind});}
      if(o.step===2 && same(h,finish) && u<7/9)o.step=3;
    }else if(o.kind==='surf'){
      if(d.trackedFlight){
        const f=d.trackedFlight;
        o.nextRing=f.rings[f.passed]||null;
        o.step=Math.min(2,f.passed);
      }
    }else{
      if(o.step===0 && before && same(before,a,1.1) && h.plane!==before.plane){
        o.step=1;events.push({type:'double',kind:o.kind});
      }
      if(o.step===1 && same(h,b)){o.step=2;events.push({type:'liaison',kind:o.kind});}
      if(o.kind==='relais' && o.step===2 && same(h,c))o.step=3;
    }
    const goal={convoi:1,mue:2,aiguillage:3,surf:Math.min(2,d.trackedFlight?.goal??2),relais:3}[o.kind];
    if(o.step===goal){
      d.chain=Math.min(3,d.chain+1);points=basePoints[o.kind]*d.chain;d.rounds++;
      events.push({type:'score',kind:o.kind,points,chain:d.chain});
      rest('réussi',2.5+3*d.intensity,'recovery');
    }else if(d.remaining<=1e-8){
      d.chain=0;rest('expiré',3+3*d.intensity,'recovery');
    }
    return result();
  }
  return {create,tick};
});

;
/* Source et destination : octets RGBA du même ImageData. La table palette
   existante utilise toujours le codage numérique 0xAABBGGRR. */
(() => {
  'use strict';
  const nativeLittle=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
  const dither=[-6,2,-4,4,6,-2,8,0,-3,5,-5,3,9,1,7,-1];
  const index5=new Uint8Array(4096),rg3=new Uint8ClampedArray(4096),blue2=new Uint8ClampedArray(4096);
  for(let tile=0;tile<16;tile++){
    for(let v=0;v<256;v++){
      const j=(tile<<8)+v,delta=dither[tile]*.75;
      index5[j]=Math.min(255,Math.max(0,v+dither[tile]*.55))>>3;
      rg3[j]=Math.min(7,Math.max(0,Math.round((v+delta)*7/255)))*255/7;
      blue2[j]=Math.min(3,Math.max(0,Math.round((v+delta*1.6)*3/255)))*85;
    }
  }
  function convert(bytes,w,h,bits,palette){
    if(bits===32||!(w*h))return;
    const words=nativeLittle&&(bytes.byteOffset&3)===0?new Uint32Array(bytes.buffer,bytes.byteOffset,w*h):null;
    if(bits===16){
      if(words){
        for(let i=0;i<words.length;i++){
          const v=words[i];
          words[i]=(v&0xfff8fcf8)|((v>>>5)&0x00070007)|((v>>>6)&0x00000300);
        }
      }else for(let j=0;j<w*h*4;j+=4){
        bytes[j]=(bytes[j]&248)|(bytes[j]>>5);
        bytes[j+1]=(bytes[j+1]&252)|(bytes[j+1]>>6);
        bytes[j+2]=(bytes[j+2]&248)|(bytes[j+2]>>5);
      }
      return;
    }
    for(let y=0,i=0;y<h;y++){
      const row=(y&3)<<10;
      if(bits===8){
        for(let x=0;x<w;x++,i++){
          const bank=row|((x&3)<<8),j=i*4;
          bytes[j]=rg3[bank|bytes[j]];bytes[j+1]=rg3[bank|bytes[j+1]];
          bytes[j+2]=blue2[bank|bytes[j+2]];
        }
      }else if(words){
        for(let x=0;x<w;x++,i++){
          const bank=row|((x&3)<<8),j=i*4;
          words[i]=palette[(index5[bank|bytes[j]]<<10)|(index5[bank|bytes[j+1]]<<5)|index5[bank|bytes[j+2]]];
        }
      }else for(let x=0;x<w;x++,i++){
        const bank=row|((x&3)<<8),j=i*4;
        const v=palette[(index5[bank|bytes[j]]<<10)|(index5[bank|bytes[j+1]]<<5)|index5[bank|bytes[j+2]]];
        bytes[j]=v&255;bytes[j+1]=(v>>>8)&255;bytes[j+2]=(v>>>16)&255;bytes[j+3]=v>>>24;
      }
    }
  }
  const api=Object.freeze({convert});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.SnakeQuantification=api;
})();

;
/* Les quatre arrière-plans du laboratoire. Coordonnées logiques 960 × 440,
   secondes de simulation, cam.nearBoss de 0 à 1. Aucune dépendance ni média. */
(() => {
  'use strict';
  const W=960,H=440,TAU=2*Math.PI,wrap=(n,max)=>(n%max+max)%max;
  const tiles=new Map();
  function line(c,p,color,w=1,closed=false){
    c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    if(closed)c.closePath();c.strokeStyle=color;c.lineWidth=w;c.stroke();
  }
  function poly(c,p,fill,color,w=1){
    c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.closePath();c.fillStyle=fill;c.fill();if(color){c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  }
  function ellipse(c,x,y,rx,ry,rotation,fill,color,w=1,a=0,b=TAU){
    c.beginPath();c.ellipse(x,y,rx,ry,rotation,a,b);
    if(fill){c.fillStyle=fill;c.fill();}if(color){c.strokeStyle=color;c.lineWidth=w;c.stroke();}
  }
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
  function sky(c,colors){
    const grad=c.createLinearGradient(0,0,0,H);for(const [p,v] of colors)grad.addColorStop(p,v);
    c.fillStyle=grad;c.fillRect(0,0,W,H);
  }
  function halo(c,x,y,r,stops){
    const g=c.createRadialGradient(x,y,0,x,y,r);for(const [p,col] of stops)g.addColorStop(p,col);
    rect(c,x-r,y-r,r*2,r*2,g);
  }
  function rnd(seed){return ()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);}
  function layer(key,w,h,fn){
    if(!tiles.has(key)){const el=document.createElement('canvas');el.width=w;el.height=h;fn(el.getContext('2d'));tiles.set(key,el);}
    return tiles.get(key);
  }
  function repeat(c,img,t,y=0){
    const x=-wrap(t,img.width);c.drawImage(img,x,y);c.drawImage(img,x+img.width,y);
  }
  function dots(c,t,count,limit,color,seed=7){
    const rand=rnd(seed);
    c.fillStyle=color;
    for(let i=0;i<count;i++){const x=rand()*W,y=rand()*limit,k=rand();c.fillRect(wrap(x-t*(.3+k),W),y,k>.92?1.8:.85,k>.92?1.5:.85);}
  }
  function terminal(c,t,cam,boss){
    c.drawImage(layer('rack',W,H,g=>{
      sky(g,[[0,'#131b1d'],[.24,'#2d3434'],[.46,'#233536'],[1,'#0a1319']]);
      for(let n=-1;n<7;n++){
        const x=n*180+22;
        poly(g,[[x,10],[x+159,10],[x+163,14],[x+163,152],[x+2,152],[x-2,148],[x-2,14]],'#2c3534','#63716a',1);
        rect(g,x+4,15,150,5,'#141e21');
        for(const dx of [6,153])for(const y of [14,146]){ellipse(g,x+dx,y,1.7,1.7,0,'#afafa0');line(g,[[x+dx-1,y],[x+dx+1,y]],'#343a39',.7);}
        for(let j=0;j<5;j++){rect(g,x+9,25+j*7,110,3,'#172123');rect(g,x+9,28+j*7,111,1,'#51645c');}
        for(let j=0;j<3;j++){
          const k=x+23+j*47;ellipse(g,k,94,12,12,0,'#171f21','#747766',1.8);
          ellipse(g,k,94,8.5,8.5,0,'#333c38','#596159',.8);
          line(g,[[k,94],[k+(j-1)*4,87]],'#d4c197',1.3);
        }
        for(let j=0;j<14;j++){rect(g,x+8+j*10,117,6,6,'#101a1b');rect(g,x+8+j*10,132,6,4,'#67745c');}
      }
      poly(g,[[266,17],[670,17],[696,37],[696,115],[674,134],[262,134],[243,117],[243,37]],'#4b5448','#a59d79',2.3);
      poly(g,[[269,25],[666,25],[683,41],[683,109],[668,125],[264,125],[255,112],[255,41]],'#101c1d','#282e28',4);
      halo(g,472,75,214,[[0,'#487044a6'],[1,'#18251d00']]);
      for(let x=267;x<679;x+=16)line(g,[[x,37],[x,114]],'#6f8c622c',.75);
      for(let y=40;y<115;y+=12)line(g,[[264,y],[674,y]],'#758e653a',.75);
      for(let j=0;j<9;j++){const y=180+j*24;line(g,[[0,y],[W,y]],'#43534a50');}
    }),0,0);
    const wave=[];
    for(let i=0;i<=402;i+=2){
      const phase=wrap(i*.014-t*(.8+boss*.6),1);
      const peak=Math.exp(-Math.pow((phase-.46)/.075,2));
      const y=77+(5+boss*9)*Math.sin(phase*TAU)+peak*(Math.sin(phase*TAU*4)*(16+boss*12));
      wave.push([270+i,y]);
    }
    line(c,wave,'#9cd57630',4);line(c,wave,boss>.62?'#f7cc83':'#badf93',1.4);
    const sweep=wrap(t*56,398);line(c,[[270+sweep,37],[270+sweep,113]],'#d6f49c4a',1.3);
    for(let n=0;n<7;n++)for(let i=0;i<14;i++){
      const k=wrap(i+n*3-Math.floor(t*3),14);
      if(k<(boss>.6?6:2))rect(c,n*180+30+i*10,117,6,5,boss>.6?'#eaa76c':'#becf8b');
    }
    // Papier enregistreur et galets synchronisés sous la baie.
    rect(c,0,154,W,14,'#242c29');line(c,[[0,157],[W,157]],'#818773',1.2);
    for(let i=-1;i<39;i++){const x=i*26+wrap(t*15+cam.look*3,26);rect(c,x,162,6,2,'#9b9879');}
  }
  function city(c,t,cam,boss){
    c.drawImage(layer('rain-sky',W,H,g=>{
      sky(g,[[0,'#181b37'],[.19,'#50405c'],[.32,'#a46679'],[.48,'#393250'],[1,'#10162b']]);
      halo(g,700,78,167,[[0,'#ef997eaa'],[1,'#db618800']]);
      g.save();g.beginPath();g.arc(698,76,46,0,TAU);g.clip();
      const disc=g.createLinearGradient(0,25,0,125);disc.addColorStop(0,'#fff0b3');disc.addColorStop(1,'#e99184');rect(g,647,26,103,59,disc);
      for(let y=87;y<124;y+=6)rect(g,647,y,103,Math.max(1,4.5-(y-87)*.09),disc);g.restore();
    }),0,0);
    const skyline=layer('tours',W,168,g=>{
      const r=rnd(2108);
      for(let pass=0;pass<2;pass++)for(let x=0;x<W;){
        const w=9+r()*24,h=(pass?17:6)+r()*(pass?92:70),y=164-h;
        poly(g,[[x,169],[x,y+6],[x+3,y+6],[x+3,y],[x+w-4,y],[x+w-4,y+4],[x+w,y+4],[x+w,169]],pass?'#302c48':'#65506b');
        if(h>77){line(g,[[x+w*.45,y],[x+w*.45,y-10]],'#997073');rect(g,x+w*.45,y-11,1.3,1.3,'#f2a788');}
        for(let yy=y+7;yy<157;yy+=4.5)for(let dx=2;dx<w-2;dx+=4)if(r()>.55)rect(g,x+dx,yy,2,1,r()>.49?'#bc8d99':'#8296b2');
        if(pass&&h>60&&r()>.5)rect(g,x+4,y+9,1,h*.57,'#cd7d9c');
        x+=w-2;
      }
    });
    repeat(c,skyline,t*3+cam.look*4);
    cityTraffic(c,t,cam,boss);
  }
  function cityTraffic(c,t,cam,boss){
    line(c,[[0,132],[W,146]],'#29263b',6);line(c,[[0,130],[W,144]],'#cf96a0',1);
    for(let i=-1;i<6;i++){
      const x=i*203-wrap(t*7+cam.look*6,203),y=130+x*.0145;
      poly(c,[[x-4,170],[x-1,y-17],[x+2,y-20],[x+5,170]],'#3d3248','#976f82',.85);
      for(const span of [27,45])for(const d of [-1,1])line(c,[[x,y-16],[x+d*span,y+d*span*.0145]],'#9e7b896e',.85);
    }
    const x=wrap(278+t*(8+boss*2),W+535)-130;
    // Trois porteurs géants marchent derrière le viaduc. Chaque genou suit sa
    // propre foulée ; le poste de pilotage domine les tours à l'avant du convoi.
    for(let j=2;j>=0;j--){
      const k=j===0?1.5:j===1?.99:.74,cx=x-j*72,cy=141+cx*.0145;
      c.save();c.translate(cx,cy);c.scale(k,k);
      for(let leg=0;leg<4;leg++){
        const hip=-20+leg*13,phase=t*1.6+leg*1.58+j,swing=Math.sin(phase);
        const knee=hip-7+swing*4,foot=hip-13+swing*7,ground=-2-Math.max(0,Math.cos(phase))*3;
        line(c,[[hip,-30],[knee,-17],[foot,ground]],leg%2?'#292a40':'#42415a',leg%2?4:3.3);
        line(c,[[hip-1,-29],[knee-1,-17],[foot-1,ground]],'#a47f93',.85);
        ellipse(c,knee,-17,2.2,2.2,0,'#676079','#b68b99',.75);
        line(c,[[foot-4,ground],[foot+4,ground]],'#493d52',2.6);
      }
      poly(c,[[-35,-41],[-28,-47],[-16,-47],[-13,-54],[0,-54],[4,-48],[21,-47],[33,-40],[30,-34],[15,-34],[7,-27],[-13,-27],[-19,-33],[-33,-33]],'#343245','#bd8d9a',1.15);
      for(let j=0;j<5;j++)rect(c,-25+j*5,-42,3,1.6,'#c99b9e');
      poly(c,[[11,-44],[22,-51],[35,-52],[40,-49],[36,-44],[24,-41]],'#534656','#c4969b',1);
      line(c,[[27,-49],[36,-50]],'#ffe3af',1.6);line(c,[[-15,-49],[-14,-58],[-8,-60]],'#c2949b',1.1);
      c.restore();
    }
    for(let i=0;i<13;i++){
      const dir=i%2?1:-1,x=wrap(i*77+t*dir*(17+i%5*3),W+24)-12,y=132+x*.0145+(dir>0?2:-1);
      line(c,[[x-4,y],[x+4,y]],dir>0?'#ffb7a9':'#98e2e2',1.4);
      rect(c,x+dir*4,y-1,1.6,1.4,'#fff1c1');
    }
    for(let i=0;i<42;i++){
      const xx=wrap(i*331-t*31,W), yy=wrap(i*57+t*95,171);
      line(c,[[xx,yy],[xx-2,yy+6]],'#baadc04d',.7);
    }
    // Signaux rouges successifs précédant la machine de tête.
    for(let i=0;i<8;i++){const xx=i*130+22,yy=138+xx*.0145;rect(c,xx,yy,5,1.5,boss>.25&&wrap(t*2-i,8)<boss*6?'#ffb090':'#aa8698');}
    for(let i=0;i<21;i++){const xx=wrap(i*99-t*11,W),yy=187+i%6*9;line(c,[[xx,yy],[xx+8+i%5*3,yy]],'#ba8b9633',1);}
  }
  function orbit(c,t,cam,boss){
    c.drawImage(layer('saturn',W,H,g=>{
      sky(g,[[0,'#08182b'],[.31,'#23394f'],[.54,'#283445'],[1,'#0b1726']]);
      halo(g,201,72,174,[[0,'#a6bcb461'],[1,'#75b9bd00']]);
      g.save();g.beginPath();g.arc(180,109,91,0,TAU);g.clip();
      const gas=g.createLinearGradient(90,40,263,160);gas.addColorStop(0,'#ddc6a5');gas.addColorStop(.38,'#af9c93');gas.addColorStop(.69,'#787a88');gas.addColorStop(1,'#35394e');rect(g,80,15,200,195,gas);
      const r=rnd(121);
      for(let i=0;i<48;i++){
        const yy=12+i*3.8,arr=[];
        for(let x=70;x<=287;x+=4)arr.push([x,yy+(x-179)*.095+Math.sin(x*.035+i*.11)*2.2]);
        line(g,arr,r()>.5?'#f4d5a93b':'#594e6755',1+r()*3);
      }
      g.restore();
      ellipse(g,180,109,91,91,0,null,'#eebd918f',1.15,Math.PI,Math.PI*1.65);
      const hills=[];for(let x=-4;x<=968;x+=8)hills.push([x,185+12*Math.sin(x*.019)+5*Math.sin(x*.057)+r()*7]);
      poly(g,[...hills,[W,H],[0,H]],'#1c293a','#495060',.9);
    }),0,0);
    dots(c,t,115,137,'#bdc6ca91',101);
    // Anneau interrompu : segments en titane parallèles et treillis de charpente
    // dans le repère local incliné. Les grues circulent sur le rail construit.
    c.save();c.translate(634+cam.look*3,102);c.rotate(-.17);
    const arc=(a,r=1)=>[255*r*Math.cos(a),54*r*Math.sin(a)];
    for(let j=0;j<60;j++){
      const a=j*TAU/60,b=a+TAU/60;
      if(j>=45&&j<=50)continue;
      const front=Math.sin(a)>0;
      const p=arc(a),q=arc(b),p2=arc(a,.94),q2=arc(b,.94);
      poly(c,[p,q,[q[0],q[1]+6],[p[0],p[1]+6]],front?'#495765':'#36485e',front?'#9e9b97':'#627b88',.8);
      poly(c,[p,q,q2,p2],front?'#81929a':'#617384',front?'#d0c4a3':'#9da9a9',.7);
      line(c,[[p[0],p[1]+6],q],front?'#85969a':'#496271',.8);
      if(j%3===0)rect(c,p[0],p[1],2,1.8,'#f4c98d');
    }
    for(let j=0;j<6;j++){
      const a=wrap(.33+j*1.04+t*.031,TAU),[x,y]=arc(a);
      if(a>4.7&&a<5.34)continue;
      c.save();c.translate(x,y);
      poly(c,[[-7,1],[-5,-4],[4,-4],[8,1]],'#435468','#cbb79b',.9);
      line(c,[[-3,-3],[-7,-18],[6,-24],[17,-19]],'#d0b29b',1.5);
      line(c,[[-3,-3],[0,-16],[6,-24]],'#788792',1.2);
      line(c,[[15,-19],[15,-10]],'#b0a59b',.8);rect(c,13,-10,4,2,'#d3c1a4');c.restore();
    }
    c.restore();
    // Les barges convergent vers le segment manquant à l'approche du gardien.
    for(let i=0;i<5;i++){
      const xx=wrap(290+i*142+t*(9+i),W+90)-40,yy=34+Math.sin(t*.19+i)*10+i%2*9;
      const y=yy+(64-yy)*boss*.65;
      poly(c,[[xx-9,y],[xx-5,y-3],[xx+4,y-3],[xx+9,y],[xx+4,y+1.8],[xx-7,y+1.8]],'#425466','#d2bd9f',.8);
      line(c,[[xx-10,y],[xx-14,y]],'#9cd6de',1);
    }
  }
  function abyss(c,t,cam,boss){
    c.drawImage(layer('void',W,H,g=>{
      sky(g,[[0,'#100e25'],[.28,'#33203e'],[.55,'#2d2036'],[1,'#120f21']]);
      halo(g,571,77,211,[[0,'#ffbb838a'],[.28,'#d472768a'],[.65,'#af48634d'],[1,'#72365100']]);
      for(let k=0;k<3;k++){
        const points=[];
        for(let x=-2;x<=963;x+=6)points.push([x,158+8*k+6*Math.sin(x*.015+2*k)+4*Math.cos(x*.027+k)]);
        poly(g,[...points,[W,H],[0,H]],['#52334d','#412b42','#2b2537'][k]);
      }
    }),0,0);
    dots(c,t,96,149,'#d6c0c4ad',2985);
    c.save();c.translate(570+cam.look*2,79);
    const r=36-boss*5;
    for(let j=0;j<6;j++){
      const rx=r+10+j*6,ry=r*.87+j*1.06;
      ellipse(c,0,0,rx,ry,-.13,null,['#ffd8a4','#ffc08d','#ea967c','#bb7977','#965a69','#86516b'][j],j===0?2.7:1.3,Math.PI*.95,TAU*1.02);
    }
    ellipse(c,0,0,r+3,r+3,0,'#1d142a','#c98079',1.5);
    ellipse(c,0,0,r,r,0,'#100e20','#ffbd8c',2.5);
    c.rotate(-.12);
    for(let j=0;j<11;j++){
      const rx=68+j*8.4,ry=4+j*1.08;
      ellipse(c,0,2,rx,ry,0,null,j%3===0?'#fbbc93':'#c48384',j<4?1.7:1,0,Math.PI);
      ellipse(c,0,2,rx,ry,0,null,'#af6d7c',.8,Math.PI,Math.PI*1.3);
      ellipse(c,0,2,rx,ry,0,null,'#c88581',.8,TAU-.86,TAU);
    }
    for(let j=0;j<18;j++){
      const a=wrap(t*(.24+boss*.31)+j*.849,TAU);
      if(Math.sin(a)<0&&Math.abs(Math.cos(a))<.5)continue;
      const rx=73+j%6*10;
      ellipse(c,0,2,rx,4+j%6*1.8,0,null,j%2?'#ffddac':'#e5a589',1.3,a,a+.17);
    }
    c.restore();
    // Colonnes de matière érodées, avec filaments orbitant vers la singularité.
    for(let j=0;j<4;j++){
      const x=[92,279,772,915][j]+Math.sin(t*.18+j)*2,h=[73,48,62,98][j],y=172,side=j<2?1:-1;
      c.save();c.translate(x,y);c.scale(side,1);
      poly(c,[[-22,1],[-15,-14],[-13,-h*.72],[-8,-h],[-1,-h-4],[-3,-h*.64],[5,-h*.46],[10,-13],[23,1]],'#30233d','#946575',1.1);
      poly(c,[[-13,-h*.72],[-8,-h],[-5,-h],[-6,-h*.58],[-1,-22],[-6,-12]],'#705067');
      const curl=[];
      for(let i=0;i<=32;i++){
        const f=i/32;curl.push([f*(60+j*7),-h-4-22*Math.sin(f*Math.PI)-f*8+2*Math.sin(t*.9+f*9+j)]);
      }
      line(c,curl,'#bd7c8480',1);
      const f=wrap(t*(.11+boss*.14)+j*.28,1),index=Math.floor(f*31);
      line(c,curl.slice(index,index+3),'#ffd1a6',1.45);
      for(let i=0;i<3;i++){
        const yy=-h-7-i*6+Math.sin(t*.55+i)*2,xx=i*3-2;poly(c,[[xx-2,yy],[xx+1,yy-3],[xx+2,yy],[xx,yy+1.5]],'#926676');
      }c.restore();
    }
  }
  function railway(c,t,cam,boss){
    c.drawImage(layer('gare',W,H,g=>{
      sky(g,[[0,'#28324c'],[.2,'#705670'],[.43,'#cb846e'],[.66,'#534459'],[1,'#172634']]);
      const r=rnd(1995);
      for(let j=0;j<27;j++){
        const x=Math.floor(r()*W/4)*4,y=20+Math.floor(r()*60/4)*4,w=16+Math.floor(r()*49/4)*4;
        rect(g,x,y,w,4,'#d18d806e');rect(g,x+8,y-4,w*.45,4,'#b5838480');
      }
      for(let x=0;x<W;x+=16){
        const y=130+Math.floor(15*Math.sin(x*.017)/4)*4;
        rect(g,x,y,16,80,'#6c6371');rect(g,x,y+4,12,3,'#96868a');
      }
      for(const [x,y] of [[46,75],[322,64],[647,74],[893,69]]){
        rect(g,x,y,6,73,'#414654');rect(g,x-7,y+6,21,4,'#444452');
        rect(g,x-18,y-4,48,6,'#4b4756');rect(g,x-14,y-7,40,3,'#ceaa87');
        for(const d of [1,12,24])rect(g,x-14+d,y,5,2,'#ffe5ad');
      }
      for(let j=-1;j<9;j++){
        const x=j*126;
        poly(g,[[x,98],[x+14,82],[x+86,82],[x+111,97],[x+111,103],[x,103]],'#4a4c59','#b6a39b',1);
        rect(g,x,99,112,4,'#d0ac80');rect(g,x+16,103,4,37,'#5e5359');
        for(let k=0;k<7;k++)rect(g,x+15+k*11,88,8,3,'#849299');
      }
      rect(g,0,133,W,11,'#303b48');rect(g,0,144,W,4,'#cfaa85');rect(g,0,148,W,12,'#453e49');
      for(let x=0;x<W;x+=23){rect(g,x,151,11,2,'#827479');rect(g,x+3,156,7,1,'#a29386');}
      for(let y=185;y<440;y+=22){rect(g,0,y,W,2,'#403646');}
    }),0,0);
    railTraffic(c,t,cam,boss);
  }
  function railTraffic(c,t,cam,boss){
    for(let j=-1;j<4;j++){
      const x=j*300-wrap(t*9+cam.look*4,300);
      rect(c,x+4,35,3,101,'#424251');rect(c,x,35,64,4,'#615461');rect(c,x+58,39,2,8,'#655764');
      line(c,[[x+5,62],[x+42,39]],'#675968',2);
      line(c,[[x-240,46],[x-95,51],[x+60,46]],'#534c60',1);
    }
    const off=wrap(260+t*(48+boss*10),W+550)-310;
    for(let j=0;j<3;j++){
      const x=Math.floor((off+j*96)/2)*2,y=108;
      poly(c,[[x,y+17],[x,y+3],[x+4,y],[x+88,y],[x+95,y+5],[x+95,y+18]],'#c1cbd0','#394859',1.8);
      rect(c,x+2,y+10,91,4,'#ce655d');rect(c,x+2,y+15,91,3,'#737e8a');
      for(let k=0;k<8;k++){rect(c,x+7+k*10,y+3,7,5,'#345467');rect(c,x+8+k*10,y+3,5,1,'#8bb8be');}
      for(const d of [15,66]){rect(c,x+d,y+18,13,4,'#393842');rect(c,x+d+3,y+21,6,2,'#262b34');}
    }
    const x=Math.floor((off+287)/2)*2;
    poly(c,[[x,108],[x+14,108],[x+29,112],[x+36,118],[x+43,121],[x+43,125],[x,126]],'#cbd5d0','#3e4a56',1.6);
    poly(c,[[x+10,110],[x+18,111],[x+29,116],[x+15,116]],'#426277');
    rect(c,x+5,120,30,3,'#ce625f');rect(c,x+35,120,6,2,'#ffe9a8');
    // Portique de signalisation à palettes ; alerte avant l'arrivée de la locomotive.
    const gx=705;
    rect(c,gx,75,6,80,'#484756');rect(c,gx-80,74,100,5,'#504957');line(c,[[gx-29,79],[gx,100]],'#605565',3);
    rect(c,gx-76,79,56,14,'#353443');rect(c,gx-70,82,43,2,'#85777b');
    for(let n=0;n<5;n++)rect(c,gx-68+n*8,86,4,3,n>3-boss*4?'#f3a478':'#b7d596');
  }
  // Palettes et cadence spatiale propres au matériel de chaque époque. La passe
  // agit sur les pixels composites déjà peints, y compris projectiles et gardiens.
  const formats={
    1976:{bits:2,width:384,palette:['#111c22','#304a43','#70946b','#dcf1ab']},
    1985:{bits:4,width:480,palette:['#101324','#1c2239','#28364b','#403551','#664565','#915a7a','#be7885','#e9a491','#ffdfaa','#ffefc7','#36516b','#507b89','#60a4a5','#96d9c6','#ccf5e0','#d86967']},
    1995:{bits:8,width:568},
    2185:{bits:16,width:768},
    2985:{bits:32,width:Infinity}
  };
  const palettesRGB=new Map(),stages=new WeakMap();
  function lut(year){
    if(palettesRGB.has(year))return palettesRGB.get(year);
    const rgb=formats[year].palette.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
    const table=new Uint32Array(32768);
    const pack=(r,g,b)=>(255<<24)|(b<<16)|(g<<8)|r;
    for(let n=0;n<table.length;n++){
      const r=(n>>10)*255/31,g=((n>>5)&31)*255/31,b=(n&31)*255/31;
      let closest=0,d0=Infinity;
      if(year===1976){
        const lum=.23*r+.62*g+.15*b;
        closest=lum<43?0:lum<86?1:lum<156?2:3;
      }else for(let j=0;j<rgb.length;j++){
        const p=rgb[j],d=.32*(p[0]-r)**2+.51*(p[1]-g)**2+.17*(p[2]-b)**2;
        if(d<d0){d0=d;closest=j;}
      }
      table[n]=pack(...rgb[closest]);
    }
    palettesRGB.set(year,table);return table;
  }
  const bayer=[-6,2,-4,4,6,-2,8,0,-3,5,-5,3,9,1,7,-1];
  function finish(canvas,year,destination=canvas){
    const f=formats[year];if(!f||f.bits===32)return;
    const w=Math.min(canvas.width,f.width),h=Math.max(1,Math.round(w*canvas.height/canvas.width));
    const direct=canvas!==destination;
    let stage=direct?{el:canvas,ctx:canvas.getContext('2d')}:stages.get(canvas);
    if(!stage){
      const el=document.createElement('canvas');
      stage={el,ctx:el.getContext('2d',{willReadFrequently:true})};
      stages.set(canvas,stage);
    }
    const c=stage.ctx;
    if(!direct){
      if(stage.el.width!==w||stage.el.height!==h){stage.el.width=w;stage.el.height=h;}
      c.imageSmoothingEnabled=true;c.imageSmoothingQuality='low';
      c.drawImage(canvas,0,0,w,h);
    }
    c.save();c.setTransform(1,0,0,1,0,0);
    const img=c.getImageData(0,0,w,h),buf=img.data;
    const table=f.palette?lut(year):null;
    if(window.SnakeQuantification){
      window.SnakeQuantification.convert(buf,w,h,f.bits,table);
    }else{
      const packed=new Uint32Array(buf.buffer,buf.byteOffset,w*h);
      for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i++){
        const j=i*4,d=bayer[(y%4)*4+x%4]*(f.bits===8?.75:.55),r=buf[j],g=buf[j+1],b=buf[j+2];
        if(table){
          const rr=Math.min(255,Math.max(0,r+d))>>3,gg=Math.min(255,Math.max(0,g+d))>>3,bb=Math.min(255,Math.max(0,b+d))>>3;
          packed[i]=table[rr*1024+gg*32+bb];
        }else if(f.bits===8){
          // RGB332 exact, arrondi au niveau le plus proche avec trame ordonnée.
          const ri=Math.min(7,Math.max(0,Math.round((r+d)*7/255))),gi=Math.min(7,Math.max(0,Math.round((g+d)*7/255))),bi=Math.min(3,Math.max(0,Math.round((b+d*1.6)*3/255)));
          buf[j]=ri*255/7;buf[j+1]=gi*255/7;buf[j+2]=bi*85;
        }else{
          const ri=r>>3,gi=g>>2,bi=b>>3;
          buf[j]=(ri<<3)|(ri>>2);buf[j+1]=(gi<<2)|(gi>>4);buf[j+2]=(bi<<3)|(bi>>2);
        }
      }
    }
    c.putImageData(img,0,0);c.restore();
    const out=destination.getContext('2d');out.save();out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;
    out.drawImage(stage.el,0,0,destination.width,destination.height);out.restore();
  }
  function draw(c,year,t=0,cam={},reduce=false){
    const fn={1976:terminal,1985:city,1995:railway,2185:orbit,2985:abyss}[year]||city;
    const boss=clamp01(cam.nearBoss||0);
    c.save();c.lineCap='round';c.lineJoin='round';fn(c,reduce?0:t,{look:reduce?0:cam.look||0},boss);c.restore();
  }
  function traffic(c,year,t=0,cam={},reduce=false){
    const render=year===1985?cityTraffic:year===1995?railTraffic:null;
    if(!render)return false;
    c.save();c.lineCap='round';c.lineJoin='round';
    render(c,reduce?0:t,{look:reduce?0:cam.look||0},clamp01(cam.nearBoss||0));
    c.restore();return true;
  }
  function clamp01(n){return Math.max(0,Math.min(1,n));}
  window.SnakeMondes=Object.freeze({draw,finish,formats,traffic});
})();

;
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.SnakeInitiation=api;})(globalThis,function(){
  const models=['actuel','corridor','facultatif'];
  const eq=(a,b)=>a && b && a.x===b.x && a.y===b.y;
  const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  function create(model,cycle=0){
    if(!models.includes(model))throw Error('Départ inconnu');
    return {model,stage:cycle>0||model==='actuel'?'libre':'virage',t:0,route:null,cursor:0,
      prepared:false,resumeTurn:false,flew:false,shot:false,at:null,marks:[],startPlane:null};
  }
  function prepare(d){
    if(d.model!=='facultatif'||d.stage!=='virage'||d.t!==0)return false;
    d.prepared=true;return true;
  }
  function square(s){
    const o=s.snake[0], d=s.direction;
    for(const k of [-1,1]){
      const p=(i,j)=>({x:o.x+i*d.x-j*k*d.y,y:o.y+i*d.y+j*k*d.x,plane:s.plane});
      const route=[[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1],[0,0]].map(([i,j])=>p(i,j));
      const clear=route.slice(0,-1).every(t=>t.x>=1&&t.y>=1&&t.x<s.width-1&&t.y<s.height-1 &&
        !s.snake.slice(1).some(b=>eq(t,b)&&b.plane===s.plane) &&
        !s.drones.some(b=>b.plane===s.plane&&(eq(t,b)||eq(t,b.next)))&& !eq(t,s.flightGate));
      if(clear)return route;
    }
    return null;
  }
  function dismiss(d){d.stage='libre';d.at=null;d.marks=[];}
  function update(d,s,dt,events=[]){
    if(s.status!=='playing'||d.stage==='libre')return;
    d.t+=dt;if(d.t>=60||s.boss){dismiss(d);return;}
    const h=s.snake[0];d.startPlane??=s.plane;
    d.shot ||=events.some(e=>e.type==='forgeShot');
    if(d.stage==='virage' && d.model==='facultatif' && s.flight){
      if(!d.prepared){dismiss(d);return;}
      d.resumeTurn=true;d.at=null;d.marks=[];return;
    }
    if(d.stage==='virage' && d.resumeTurn){
      if(!d.landing){
        const v=s.direction, choices=[{x:-v.y,y:v.x},{x:v.y,y:-v.x}];
        const safe=choices.find(n=>[1,2].every(i=>{
          const p={x:h.x+n.x*i,y:h.y+n.y*i};
          return p.x>=1&&p.y>=1&&p.x<s.width-1&&p.y<s.height-1 &&
            !s.snake.some(b=>eq(b,p)&&b.plane===s.plane)&&!s.drones.some(b=>eq(b,p)&&b.plane===s.plane);
        }));
        if(!safe){dismiss(d);return;}
        d.landing={x:h.x+safe.x*2,y:h.y+safe.y*2,plane:s.plane};d.arrivalDir={...v};
      }
      if(s.direction.x*d.arrivalDir.x+s.direction.y*d.arrivalDir.y===0){d.stage='forge';d.turnedAt=d.t;}
    }else if(d.stage==='virage'){
      if(s.direction.y!==0){
        if(d.model==='facultatif' && (s.direction.y>0||h.x<9||h.x>16)){dismiss(d);return;}
        d.stage='forge';d.turnedAt=d.t;
      }
      else if(d.model==='facultatif' && h.x>16 && !d.prepared){dismiss(d);return;}
    }
    if(d.stage==='forge' && d.shot && d.t-d.turnedAt>=.75)d.stage='plan';
    if(d.stage==='plan' && s.plane!==d.startPlane)d.stage='cellule';
    if(d.stage==='cellule' && s.flightGate)d.stage='porte';
    if(d.stage==='porte' && s.flightGate && s.flightGate.plane!==s.plane)d.stage='retour';
    if(d.stage==='retour' && s.flightGate?.plane===s.plane)d.stage='porte';
    if(s.flight){d.flew=true;d.stage='anneau';}
    if(d.stage==='anneau' && !s.flight && d.flew)d.stage='croissance';
    if(d.stage==='croissance' && s.snake.length>=9 && !s.flight){
      d.route=square(s);if(d.route){d.cursor=0;d.stage='boucle';}
    }
    if(d.stage==='boucle'){
      if(s.knot?.closures){dismiss(d);return;}
      if(eq(h,d.route[d.cursor]))d.cursor++;
      if(d.cursor>=d.route.length){dismiss(d);return;}
    }
    const nearest=s.cells.filter(c=>c.plane===s.plane).sort((a,b)=>dist(h,a)-dist(h,b))[0];
    const fork=d.model==='corridor'?{x:13,y:12,plane:d.startPlane}:d.landing||{x:Math.max(10,Math.min(16,h.x)),y:7,plane:d.startPlane};
    const targets={virage:fork,forge:null,retour:s.flightGate,plan:{...h,plane:1-d.startPlane},cellule:nearest,porte:s.flightGate,
      anneau:s.flight?.rings[s.flight.passed],croissance:nearest,boucle:d.route?.[d.cursor]};
    d.at=targets[d.stage]||null;
    if(d.stage==='virage' && d.model==='facultatif' && !d.landing){
      d.marks=Array.from({length:8},(_,i)=>({x:9+i,y:8,plane:d.startPlane}));return;
    }
    d.marks=d.stage==='boucle'&&d.model==='corridor'?d.route.slice(d.cursor):[d.at].filter(Boolean);
  }
  function cue(d,s){
    if(d.stage==='libre'||s.status!=='playing'||(d.stage==='virage'&&s.flight))return null;
    const knot=s.knot?.preview;
    if(d.stage==='boucle' && knot)return {shape:'loop',text:'Fermer · 28 % de nova',at:knot.crossing,plane:knot.plane,marks:knot.points};
    const hints={virage:['corner',''],forge:['orbit',s.forge?.core==='orbit'?'Satellites déployés':'Arme en action'],
      plan:['layers','Passe sur l’autre plan'],retour:['layers','Porte sur l’autre plan'],
      cellule:['diamond',''],porte:['gate',''],anneau:['ring',''],croissance:['diamond',''],
      boucle:['stitch','Dessine la boucle']};
    const [shape,text]=hints[d.stage];return {shape,text,at:d.at,marks:d.marks};
  }
  function drawFork(ctx,signal,project,ink='#fff4bd'){
    if(signal?.shape!=='corner'||!signal.marks?.length)return;
    const marks=signal.marks;
    const stroke=(a,b)=>{const p=project(a),q=project(b);ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);};
    ctx.save();ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();
    if(marks.length>1){
      stroke(marks[0],marks[marks.length-1]);
      for(const p of marks)stroke(p,{...p,y:p.y+.36});
    }else{
      const p=marks[0];stroke({...p,x:p.x-.4},p);stroke(p,{...p,y:p.y+.4});
    }
    ctx.stroke();ctx.restore();
  }
  return {models,create,prepare,update,cue,drawFork,dismiss};
});

;
(function(root,factory){
  const api=factory();if(typeof module==='object')module.exports=api;else root.SnakeLecture=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // Masques de sept pixels, statiques et distincts, lisibles avec une seule encre.
  const shapes={
    danger:['0001000','0010100','0010100','0101010','0100010','1001001','1111111'],
    ring:['0011100','0100010','1000001','1000001','1000001','0100010','0011100'],
    plane:['0001000','0011100','0111110','0000000','0111110','0011100','0001000'],
    guardian:['1000001','1101011','1011101','1000001','0100010','0010100','0001000'],
    target:['0001000','0010100','0100010','1001001','0100010','0010100','0001000']
  };
  const texts={convoi:['Passe au ◇ après le convoi'],mue:['Sur le ◇, touche Plan','Rejoins le second ◇'],surf:['Entre en vol'],
    relais:['Sur le ◇, touche Plan','Rejoins le second ◇','Reviens au premier ◇'],aiguillage:['Prends l’aiguille','Bifurque','Double le train']};
  const same=(p,q)=>p && q && p.x===q.x && p.y===q.y && (p.plane??0)===(q.plane??0);
  function threat(s){
    const h=s.snake[0],dir=s.turns[0]||s.direction,a=s.boss?.attack;
    const next=s.flight?h:{x:h.x+dir.x,y:h.y+dir.y,plane:s.plane};
    const mask=p=>a?.plane===s.plane && a.danger.has(Math.round(p.y)*s.width+Math.round(p.x));
    if(a && (a.phase==='active'||a.remaining<=.6)){
      if(mask(h))return ['Sors de la salve',h];
      const arrival=s.stepTime-s.stepClock;
      if(!s.flight && mask(next) && (a.phase!=='active'||arrival<a.remaining))
        return ['Sors de la salve',next];
    }
    if(s.flight){
      if(a?.plane!==s.plane)return null;
      const f=s.flight,speed=s.turbo?7.2:5.4,step=1/60;
      let x=h.x,y=h.y,angle=f.angle;
      for(let frame=1;frame<=15;frame++){
        const delta=Math.atan2(Math.sin(f.targetAngle-angle),Math.cos(f.targetAngle-angle));
        angle+=Math.max(-8*step,Math.min(8*step,delta*(1-Math.exp(-12*step))));
        x+=Math.cos(angle)*speed*step;y+=Math.sin(angle)*speed*step;
        const t=frame*step,p={x,y,plane:s.plane};
        const on=a.phase==='active'?t<a.remaining:t>=a.remaining && t<a.remaining+.33;
        if(on && mask(p))return ['Sors de la salve',p];
      }
      return null;
    }
    if(next.x<0||next.x>=s.width||next.y<0||next.y>=s.height)return ['Bord devant',h];
    const wave=s.ecologie?.wave;
    if(wave && wave.plane===s.plane && (wave.phase==='active'||wave.remaining<=.65)){
      if(wave.mask.has(h.y*s.width+h.x)||wave.mask.has(next.y*s.width+next.x))
        return [wave.name+' · Sors des cases marquées',next];
    }
    const growing=s.cells.some(p=>same(p,next));
    if(s.snake.slice(0,growing?s.snake.length:-1).some(p=>same(p,next)))return ['Évite ta queue',next];
    const b=s.boss;
    if(b?.plane===s.plane && Math.max(Math.abs(next.x-b.x),Math.abs(next.y-b.y))<=1)return ['Évite la coque',next];
    for(const d of s.drones){
      if(d.warmup>0)continue;
      if(same(d,next)||(same(d.next,h)&&d.moveIn<=s.stepTime-s.stepClock))return ['Évite le drone',d];
    }
    return null;
  }
  const create=()=>({lastText:null});
  function read(m,s){
    const options=[];
    const add=(kind,text,at)=>{if(at)options.push({kind,text,at:{x:at.x,y:at.y,plane:at.plane??s.plane}});};
    if(s.status==='playing'){
      const h=s.snake[0],b=s.boss,o=s.director?.offer;
      const risk=threat(s);if(risk)add('danger',...risk);
      const ring=s.flight?.rings[s.flight.passed];
      if(ring)add('ring','Traverse l’anneau',ring);
      if(s.planeShift)add('plane',s.plane===0?'Premier plan':'Second plan',h);
      if(b)add('guardian',b.weak?(b.plane===s.plane?'Vise le cœur':'Cœur sur l’autre plan'):
        b.attack?.phase==='warning'?'Observe la salve':'Suis le gardien',b);
      if(o && texts[o.kind]){
        const i=Math.min(o.step,texts[o.kind].length-1);
        const at=o.kind==='convoi'?o.anchors[1]:o.anchors[i];
        let label=texts[o.kind][i];
        if(o.kind==='aiguillage'&&i===0&&o.anchors.length===6){
          const [, , , ,start,end]=o.anchors;
          const deltaX=start.x-end.x,deltaY=start.y-end.y;
          label+=' '+(Math.abs(deltaX)>Math.abs(deltaY)?deltaX>0?'→':'←':deltaY>0?'↓':'↑');
        }
        add('target',label,at);
      }else{
        const cells=s.cells.filter(p=>p.plane===s.plane);
        const nearest=cells.reduce((best,p)=>!best||Math.hypot(h.x-p.x,h.y-p.y)<Math.hypot(h.x-best.x,h.y-best.y)?p:best,null);
        add('target','Prends la cellule',nearest);
      }
    }
    const primary=options[0]||null, text=primary?.text||'';
    const changed=text!==m.lastText;m.lastText=text;
    return {primary,secondary:options[1]||null,changed,announcement:changed?text:null,
      masked:options.slice(1).map(option=>option.kind)};
  }
  function draw(ctx,kind,x,y,scale,ink){
    const rows=shapes[kind];if(!rows)return;
    ctx.fillStyle=ink;
    rows.forEach((row,j)=>{for(let i=0;i<7;i++)if(row[i]==='1')
      ctx.fillRect(x+i*scale,y+j*scale,scale,scale);});
  }
  return {create,read,draw,shapes,palette:['#101629','#727d96','#dbc178','#faf8ed']};
});

;
(function(){
  'use strict';
  // All drawings face east. A shared 32 × 26 design grid anchors the actor to its collision centre.
  // Each shape is a filled polygon, ellipse or rectangle, hand-drawn for its family.
  const years=[1976,1985,1995,2185,2985];
  function vector(draw){
    const shapes=[];
    const p=(color,points)=>shapes.push({color,points:points.trim().split(/\s+/).map(pair=>pair.split(',').map(Number))});
    const r=(color,x,y,w,h)=>p(color,`${x},${y} ${x+w},${y} ${x+w},${y+h} ${x},${y+h}`);
    const e=(color,x,y,rx,ry)=>shapes.push({color,x,y,rx,ry});
    // Mirrored painting about the heading axis, retaining continuous rotation in flight.
    function pair(color,points){p(color,points);p(color,points.split(' ').map(q=>{const [x,y]=q.split(',');return x+','+(-Number(y));}).join(' '));}
    draw({p,e,r,pair});return shapes;
  }
  // Palette indices: 1 dark edge, 2 rim, 3 primary, 4 shade, 5 highlight, 6 secondary, 7 heading beacon.
  const atlas={
    1976:{
      head:({r})=>{r(3,-12,-7,14,14);r(3,2,-5,7,10);r(5,7,-5,6,3);r(5,7,2,6,3);r(7,6,-5,4,3);r(7,6,2,4,3);r(4,-10,-2,6,4);},
      body:({r})=>{r(3,-10,-7,20,14);r(4,-7,-4,4,8);r(5,3,-4,4,8);},
      drone:({r})=>{r(3,-5,-6,10,12);r(3,-9,-8,3,7);r(3,6,-8,3,7);r(3,-10,1,20,3);r(3,-10,4,3,5);r(3,7,4,3,5);r(5,-3,-3,6,3);},
      cell:({r})=>{r(3,-3,-8,6,16);r(3,-8,-3,16,6);r(5,-2,-2,4,4);},
      mid:({r})=>{r(3,-9,-11,3,22);r(3,6,-11,3,22);for(const [y,x] of [[-7,-4],[0,1],[7,-3]]){r(3,-7,y-1,14,2);r(5,x-2,y-3,5,6);}r(6,-11,9,22,3);},
      final:({r})=>{r(3,-14,-7,10,17);r(3,4,-7,10,17);r(3,-6,-11,12,19);r(4,-11,-3,5,6);r(4,6,-3,5,6);for(const y of [-7,-2,3])r(5,-4,y,8,2);r(6,-16,8,32,3);}
    },
    1985:{
      head:({p,pair})=>{pair(6,'-12,-10 -2,-8 8,-3 1,-1 -8,-3');p(3,'-10,-3 -5,-6 3,-5 15,0 3,5 -5,6 -10,3');p(5,'-7,-3 0,-4 7,-1 -3,-1');p(4,'-6,2 7,1 1,4 -4,4');p(7,'6,-2 13,0 6,2');},
      body:({p,pair})=>{p(3,'-10,0 -5,-7 8,-5 11,0 8,5 -5,7');pair(6,'-9,0 -4,-8 0,-8 -3,-2');p(5,'-2,-4 6,-3 8,-1 -1,-1');},
      drone:({p,e})=>{p(3,'-14,-5 -4,-2 0,-9 4,-2 14,-5 8,3 1,8 -1,8 -8,3');e(5,0,1,3.5,2.5);},
      cell:({p})=>{p(3,'0,-10 8,0 0,10 -8,0');p(5,'0,-7 4,0 0,3 -3,0');p(4,'0,3 5,0 0,8');},
      mid:({p,r})=>{p(3,'-14,-9 -6,-9 -6,2 -3,5 3,5 6,2 6,-9 14,-9 14,4 8,10 -8,10 -14,4');r(5,-14,-10,8,5);r(6,6,-10,8,5);p(5,'-12,3 -6,8 6,8 10,4 7,9 -7,9');},
      final:({p,e})=>{p(6,'-16,0 -10,-3 -5,-4 0,-11 5,-4 10,-3 16,0 9,4 4,5 0,10 -4,5 -9,4');e(3,0,0,10,5);e(5,0,-.2,5,4);e(4,1,-.2,2.1,3);}
    },
    1995:{
      head:({p,r,e})=>{p(3,'-12,-7 -5,-7 -5,-4 6,-4 9,-2 14,5 6,6 -12,6');r(6,-13,-9,9,3);r(5,-10,-6,4,4);r(3,2,-8,4,5);r(6,1,-9,6,2);e(4,-7,6,3,3);e(4,3,6,3,3);r(7,7,-2,3,4);},
      body:({r,e})=>{r(3,-10,-6,19,11);r(6,-11,-7,21,3);for(const x of [-7,0]){r(5,x,-3,4,4);e(4,x+1,5,3,3);}},
      drone:({p,r})=>{p(3,'-10,-8 -3,-5 0,-1 3,-5 10,-8 7,0 2,4 2,9 -2,9 -2,4 -7,0');r(5,-3,-2,6,5);},
      cell:({p,r})=>{p(3,'-9,-6 9,-6 9,-2 6,0 9,2 9,6 -9,6 -9,2 -6,0 -9,-2');r(5,-4,-3,2,6);r(5,1,-3,3,6);},
      mid:({r,p,e})=>{r(3,-2,-7,4,17);r(3,-11,-8,23,3);r(4,-11,-9,6,10);r(4,5,-9,6,10);e(5,-8,-6,2,2);e(6,8,-3,2,2);p(3,'-4,7 4,7 8,11 -8,11');},
      final:({p,r,e})=>{p(3,'-14,-7 -5,-7 -5,-4 7,-4 10,-2 16,7 -14,7');r(6,-15,-9,11,3);r(5,-12,-6,5,5);r(3,2,-10,5,7);r(6,0,-11,9,3);for(const x of [-9,-1,7]){e(4,x,7,3.5,3.5);e(5,x,7,1.5,1.5);}p(5,'9,-1 12,2 8,2');}
    },
    2185:{
      head:({p,pair,e})=>{pair(3,'-13,-7 -7,-10 2,-9 6,-5 -5,-4');p(4,'-13,-3 -3,-5 3,-4 13,0 3,4 -3,5 -13,3');e(3,1,0,8,4);pair(5,'-9,-7 -6,-9 -1,-8 -4,-7');e(7,7,0,3.6,1.7);},
      body:({e,pair})=>{e(4,0,0,9,5);pair(3,'-7,-3 -5,-7 3,-8 7,-5 8,-3');pair(5,'-4,-5 -2,-7 3,-7 0,-5');e(3,4,0,1.5,2.5);},
      drone:({p,e})=>{p(6,'-13,0 -6,-3 0,-10 6,-3 13,0 6,3 0,9 -6,3');e(3,0,0,7,5);e(5,1,-1,3.2,2);},
      cell:({e,p})=>{p(6,'-9,3 -3,-4 8,-5 3,3 -7,5');e(3,0,0,5.5,7.5);e(5,-1,-2,2,3);},
      mid:({e,p})=>{p(6,'-15,0 -6,-4 0,-12 4,-4 15,0 5,4 0,12 -5,4');e(3,0,0,9,8);e(4,0,1,6,5);e(5,-2,-2,3,2);},
      final:({p,e})=>{p(6,'-9,-4 -3,-2 2,3 9,3 9,6 0,7 -5,2 -10,1');e(3,-7,-3,7.5,7.5);e(3,7,4,7,6.7);e(4,-6,-2,4,4);e(5,-8,-5,2,2);e(5,6,2,2.5,2);}
    },
    2985:{
      head:({p,pair,e})=>{pair(6,'-12,-4 -9,-8 -3,-11 5,-11 10,-8 4,-8 -1,-6 -4,-3');p(3,'-13,0 -5,-3 0,-5 6,-5 11,-3 14,0 11,3 6,5 0,5 -5,3');pair(4,'-4,-2 1,-4 7,-3 5,-1');e(7,8,0,3.2,2);},
      body:({p,pair,e})=>{p(3,'-10,0 -4,-5 3,-5 10,0 3,5 -4,5');pair(6,'-10,-8 -4,-7 3,-3 0,-1 -5,-3');e(5,2,0,2.2,2);},
      drone:({p,e})=>{p(3,'0,-10 2,-4 10,-7 6,0 12,6 3,5 0,10 -3,3 -12,6 -7,0 -10,-7 -2,-4');e(5,0,0,3,3);},
      cell:({p,e})=>{p(3,'0,-11 2,-4 7,-3 4,1 5,8 0,5 -5,8 -4,1 -7,-3 -2,-4');e(5,0,0,2,3);},
      mid:({p,e})=>{p(3,'-15,-10 -6,-7 -2,-4 2,-4 6,-7 15,-10 11,-1 5,4 7,11 1,8 0,4 -2,9 -8,11 -5,4 -11,-1');p(6,'-12,-7 -6,-5 -3,-1 -8,-3');p(6,'12,-7 6,-5 3,-1 8,-3');e(5,0,0,2.6,4);},
      final:({p,e})=>{p(6,'-1,-12 2,-7 8,-10 7,-5 14,-4 11,0 16,4 8,5 9,10 3,8 0,12 -3,7 -9,10 -8,4 -15,4 -11,0 -14,-5 -7,-5 -8,-10 -2,-7');e(3,0,0,7.3,7.3);e(4,0,0,4.7,5);e(5,-1,-1,2,2.5);}
    }
  };
  const inks={
    1976:['#09180e','#d7ffaf','#7ed649','#285b29','#eeffba','#4fa950','#ffffd2'],
    1985:['#130c25','#f0deff','#6dacc9','#334268','#fff1fa','#e66ac9','#ffffbc'],
    1995:['#161525','#e8eced','#4189a7','#343947','#c3eeed','#e68c51','#fff7ad'],
    2185:['#111326','#e2edff','#8497b5','#333a63','#e5fdff','#86c9e8','#fff1a0'],
    2985:['#1c102b','#fee1ff','#a284bc','#51346f','#ffebb9','#6ad4ba','#ffffb8']
  };
  const scales={head:1.25,body:.94,drone:.92,cell:.86,boss:1.67};
  const resolution={1976:.75,1985:1,1995:1,2185:2,2985:3};
  const cache=new Map(),surfaces=new Map();
  function contains(s,x,y){
    if(!s.points)return ((x-s.x)/s.rx)**2+((y-s.y)/s.ry)**2<=1;
    let inside=false;
    for(let i=0,j=s.points.length-1;i<s.points.length;j=i++){
      const a=s.points[i],b=s.points[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function geometry(year,role,kind){
    const key=[year,role,kind].join('-');
    if(cache.has(key))return cache.get(key);
    const shapes=vector(atlas[year][role==='boss'?kind:role]),density=resolution[year];
    const w=Math.ceil(39*density),h=Math.ceil(31*density),data=new Uint8Array(w*h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const x=(i+.5-w/2)/density,y=(j+.5-h/2)/density;
      for(const s of shapes)if(contains(s,x,y))data[j*w+i]=s.color;
    }
    const core=data.slice(),outer=Math.max(2,Math.round(2.1*density)),inner=Math.max(1,Math.round(.85*density));
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      if(core[j*w+i])continue;
      let min=Infinity;
      for(let dy=-outer;dy<=outer;dy++)for(let dx=-outer;dx<=outer;dx++){
        const k=i+dx,l=j+dy;
        if(k>=0&&k<w&&l>=0&&l<h&&core[l*w+k])min=Math.min(min,dx*dx+dy*dy);
      }
      if(min<=outer**2)data[j*w+i]=min<=inner**2?2:1;
    }
    const result={w,h,data,density};cache.set(key,result);return result;
  }
  function palette(year,role,options){
    const colors=['',...inks[year]];
    if(role==='drone'||role==='boss'){
      colors[3]=({1976:'#94b965',1985:'#d66594',1995:'#ca614b',2185:'#a06f90',2985:'#ad6c9b'})[year];
      colors[5]=year===1976?'#edffd0':'#ffe2c3';
      if(year!==1976)colors[6]='#e69a71';
    }
    if(role==='cell'){colors[3]=options.bonus?'#7cc6ec':'#e5bf6f';colors[5]=options.bonus?'#eaffff':'#fff3be';}
    if(options.plane===1)colors[2]=year===1976?'#b5efa9':'#97eaff';
    // The sparkle runs in the material; the collision anchor and headings stay put.
    if(!options.reduced&&Math.floor((options.time||0)*3)%4===1)colors[5]='#fffdee';
    if(year===1976){
      // The CRT material uses exactly four phosphor levels for every role.
      const phosphor=['#09180e','#385d31','#87ca5c','#e5ffbf'];
      const slots=[0,3,2,1,3,2,3];
      for(let i=1;i<=7;i++)colors[i]=phosphor[slots[i-1]];
      if(options.plane===1)colors[2]=phosphor[2];
      if(role==='cell'&&options.bonus)colors[3]=phosphor[3];
    }
    return colors;
  }
  function normalize(year,role,o={}){
    year=years.includes(+year)?+year:1976;
    const kind=role==='boss'&&o.kind==='final'?'final':'mid';
    if(!(role in scales))throw new RangeError('Rôle de sprite inconnu : '+role);
    return {year,role,kind};
  }
  function raster(year,role,options={}){
    const spec=normalize(year,role,options);
    return {...geometry(spec.year,role,spec.kind),colors:palette(spec.year,role,options),scale:scales[role]};
  }
  function draw(c,role,year,o={}){
    const spec=normalize(year,role,o),colors=palette(spec.year,role,o);
    const key=[spec.year,role,spec.kind,colors[2],colors[3],colors[5]].join('|');
    let img=surfaces.get(key);
    if(!img){
      const a=geometry(spec.year,role,spec.kind);
      const source=typeof OffscreenCanvas==='function'?new OffscreenCanvas(a.w,a.h):document.createElement('canvas');
      source.width=a.w;source.height=a.h;
      const ctx=source.getContext('2d'),pixels=ctx.createImageData(a.w,a.h);
      const rgb=colors.map(k=>Number.parseInt(k.slice(1),16)||0);
      for(let i=0;i<a.data.length;i++)if(a.data[i]){
        const color=rgb[a.data[i]];pixels.data[4*i]=color>>16;pixels.data[4*i+1]=color>>8&255;pixels.data[4*i+2]=color&255;pixels.data[4*i+3]=255;
      }
      ctx.putImageData(pixels,0,0);
      img={source,width:a.w/a.density,height:a.h/a.density};surfaces.set(key,img);
    }
    const width=o.viewportWidth || c.canvas?.clientWidth || 960;
    const minimum=role==='head'?390:role==='boss'?290:250;
    const scale=scales[role]*Math.max(.78,minimum/width,o.unit??1);
    c.save();c.translate(o.x??0,o.y??0);c.rotate(o.angle||0);c.scale(scale,scale);
    c.imageSmoothingEnabled=spec.year>=2185;
    c.drawImage(img.source,-img.width/2,-img.height/2,img.width,img.height);c.restore();
  }
  function link(c,year,a,b,unit=1){
    const colors=inks[year]||inks[1976];
    c.save();c.lineCap=+year===1995?'square':'round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
    for(const [width,color] of [[9.5,colors[0]],[6.2,colors[2]],[2,colors[4]]]){c.lineWidth=width*unit;c.strokeStyle=color;c.stroke();}
    c.restore();
  }
  const api=Object.freeze({draw,link,raster,years});
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeSprites=api;
})();

;
(function(){
  'use strict';
  const W=36,H=18,AREA=W*H,WINDOW=2000,INTERVAL=50,CAPACITY=42;
  const flags={body:1,cell:2,drone:4,next:8,hull:16,warning:32,active:64,gate:128};
  const plane=p=>p?.plane??0;
  function tile(x,y){x=Math.round(x);y=Math.round(y);return x>=0&&x<W&&y>=0&&y<H?y*W+x:-1;}
  function explain(s){
    const head=s.snake[0], event=s.events?.findLast(e=>e.type==='death');
    const pos={x:event?.x??head.x,y:event?.y??head.y,plane:event?.plane??plane(head)};
    const tried={x:head.x+s.direction.x,y:head.y+s.direction.y,plane:plane(head)};
    const cause=String(s.cause||event?.cause||'Impact').slice(0,80);
    let tip='Observe la dernière trajectoire avant de reprendre.', impact=pos, kind='impact';
    if(cause==='Mur'){
      impact=tried;kind='wall';tip='La prochaine case était hors de la grille. Prépare le virage une case plus tôt.';
    }else if(cause==='Ta propre queue'){
      impact=tried;kind='body';tip='La case visée était encore occupée par ton corps sur ce plan. Laisse passer la queue.';
    }else if(cause==='Drone'){
      kind='drone';tip='Le drone et ta trajectoire se sont rejoints sur ce plan. Regarde sa prochaine case, marquée d’une croix.';
    }else if(cause==='Transit saturé'){
      kind='landing';tip='Au retour du vol, le moteur n’a trouvé aucune position de repli. Observe l’encombrement à la sortie.';
    }else if(s.boss?.name===cause){
      const a=s.boss.attack;
      if(pos.x===head.x&&pos.y===head.y&&a?.phase==='active'&&plane(a)===pos.plane&&a.danger.has(tile(pos.x,pos.y))){
        kind='attack';tip='La zone hachurée était active sur ton plan. Quitte-la pendant le préavis.';
      }else{
        kind='hull';tip='La trajectoire a rencontré la coque du gardien. Laisse de la place autour de son centre.';
      }
    }
    return Object.freeze({cause,kind,...impact,tip});
  }
  function create(){
    const cells=new Uint8Array(CAPACITY*AREA*2);
    const times=new Float64Array(CAPACITY),heads=new Float32Array(CAPACITY*2),layers=new Uint8Array(CAPACITY),flight=new Uint8Array(CAPACITY);
    let start=0,count=0,death=null;
    const index=i=>(start+i)%CAPACITY;
    function capture(s,t){
      if(death||!Number.isFinite(t)||!s.snake?.length)return false;
      const previous=count?times[index(count-1)]:-Infinity;
      if(t<previous || (t-previous<INTERVAL && s.status!=='dead'))return false;
      let i;
      if(t===previous)i=index(count-1);
      else{
        if(count===CAPACITY){start=index(1);count--;}
        i=index(count++);
      }
      const offset=i*AREA*2;
      cells.fill(0,offset,offset+AREA*2);
      function mark(x,y,p,flag){const j=tile(x,y);if(j>=0 && (p===0||p===1))cells[offset+p*AREA+j]|=flag;}
      for(const p of s.snake)mark(p.x,p.y,plane(p),flags.body);
      for(const p of s.cells||[])mark(p.x,p.y,plane(p),flags.cell);
      for(const p of [s.rift,s.flightGate])if(p)mark(p.x,p.y,plane(p),flags.gate);
      for(const d of s.drones||[]){
        if(d.warmup>0)continue;
        mark(d.x,d.y,plane(d),flags.drone);
        if(d.next)mark(d.next.x,d.next.y,plane(d.next),flags.next);
      }
      if(s.boss){
        const b=s.boss;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)mark(b.x+dx,b.y+dy,plane(b),flags.hull);
        const a=b.attack;
        if(a)for(const j of a.danger||[])if(j>=0 && j<AREA)
          mark(j%W,Math.floor(j/W),plane(a),a.phase==='active'?flags.active:flags.warning);
      }
      times[i]=t;heads[2*i]=s.snake[0].x;heads[2*i+1]=s.snake[0].y;layers[i]=plane(s.snake[0]);flight[i]=s.flight?1:0;
      // Keep one actual sample at or before the left boundary.
      while(count>1&&times[index(1)]<=t-WINDOW){start=index(1);count--;}
      if(s.status==='dead')death=explain(s);
      return true;
    }
    function bounds(){
      if(!count)return null;
      const end=times[index(count-1)];return {start:Math.max(times[start],end-WINDOW),end,count};
    }
    function frameAt(ms){
      const range=bounds();if(!range)return null;
      const t=Math.max(range.start,Math.min(range.end,ms));let j=count-1;
      while(j>0&&times[index(j)]>t)j--;
      const i=index(j);
      // An independent copy lets a renderer retain a frame across subsequent ticks.
      return {t:times[i],x:heads[2*i],y:heads[2*i+1],plane:layers[i],flight:Boolean(flight[i]),
        cells:cells.slice(i*AREA*2,(i+1)*AREA*2)};
    }
    return {capture,bounds,frameAt,get death(){return death;}, reset(){start=count=0;death=null;},
      storageBytes:cells.byteLength+times.byteLength+heads.byteLength+layers.byteLength+flight.byteLength};
  }
  const api={create,flags,width:W,height:H};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeReprise=api;
})();

;
(function(root){
  'use strict';
  const clamp=(v)=>Math.max(0,Math.min(1,v));
  const force={nova:.8,novaOverload:1,knotClosed:.95,bossVolley:.85,bossDefeated:1,flightStart:.45,flightEnd:.35,planeShift:.34,bossHit:.22,kill:.14};
  function event(s,e) {
    const weight=force[e.type];
    if(!weight)return;
    const old=s.impact;
    const current=old?old.power*Math.exp(-8*Math.max(0,s.elapsed-old.start)):0;
    s.impact={start:s.elapsed,power:Math.min(1,weight+current*.35)};
  }
  function sample(s,t,reduce) {
    if(reduce)return {x:0,y:0,roll:0,beat:0,tear:0};
    const pressure=clamp(s.boss?1:s.nearBoss||0);
    const kick=s.impact?s.impact.power*Math.exp(-8*Math.max(0,t-s.impact.start)):0;
    const beat=clamp(s.musicPulse||0),stress=pressure*beat;
    // Déplacement logique indépendant du DPR ; le HUD garde sa position.
    return {x:Math.sin(t*70)*2.35*kick,y:Math.cos(t*63)*1.55*kick,
      roll:.0036*kick*Math.sin(t*53)+.0018*stress,
      beat,tear:kick>.4?clamp((kick-.4)*1.7):.28*stress};
  }
  function skyline(c,m,t,year) {
    if(m.tear<.18)return;
    const y=53+Math.floor((Math.sin(Math.floor(t*10)*32)+1)*16),direction=Math.sin(t*78)>=0?1:-1;
    // Deux bandes du ciel seulement : aucun projectile, tête ou texte n'est déplacé.
    c.save();c.globalAlpha=m.tear*.34;c.fillStyle=year<2000?'#b1edc6':'#f1a6b2';
    c.fillRect(66+direction*4,y,81,1.6);c.fillRect(705-direction*7,y+5,132,1.2);c.restore();
  }
  root.SnakeImpact={event,sample,skyline};
})(typeof window!=='undefined'?window:globalThis);

;
(function () {
  'use strict';
  // Les objets tactiques doivent passer par la même matrice de projection que les cases mortelles.
  const labels={convoi:'Passe au ◇ après le convoi',mue:'Sur le ◇, touche Plan',surf:'Attrape la vague',relais:'Sur le ◇, touche Plan',aiguillage:'Double le train',express:'Double le train'};
  function draw(c,s,cam,z,selected) {
    const project=(p)=>SnakeSpectacle.project(cam,p.x,p.y,z);
    const at=p=>p && (p.plane??0)===z;
    const line=(a,b,color,width,dashed=false)=>{
      const x=project(a),y=project(b); c.beginPath(); c.strokeStyle=color;c.lineWidth=width;
      c.setLineDash(dashed?[4,6]:[]);c.moveTo(x.x,x.y);c.lineTo(y.x,y.y);c.stroke();c.setLineDash([]);
    };
    const beacon=(v,label,color)=>{
      const p=project(v), r=8*p.k*cam.zoom;
      c.beginPath();c.moveTo(p.x-r,p.y+r*.35);c.lineTo(p.x-r,p.y-r*.55);c.lineTo(p.x-r*.55,p.y-r);
      c.moveTo(p.x+r,p.y+r*.35);c.lineTo(p.x+r,p.y-r*.55);c.lineTo(p.x+r*.55,p.y-r);c.lineWidth=2;c.strokeStyle=color;c.stroke();
      if(label){c.font='bold '+Math.max(8,10*p.k*cam.zoom)+'px sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(label,p.x,p.y+r*.2);}
    };
    c.save();c.globalAlpha*=selected?1:.55;
    const o=s.director?.offer;
    if(o){
      const route=o.anchors||[],next=o.kind==='convoi'?route[1]:route[Math.min(o.step||0,route.length-1)];
      if(o.kind==='aiguillage' && route.length===6){
        const [a,b,d,exit,train,last]=route;
        if(at(train)&&at(last))line(train,last,'#ffaa92',2.5);
        if(o.step===0&&at(a)){
          const dx=Math.sign(train.x-last.x),dy=Math.sign(train.y-last.y);
          const point=(forward,side)=>({x:a.x+dx*forward-dy*side,y:a.y+dy*forward+dx*side});
          for(const back of [-1.34,-.84]){
            const tip=point(back+.32,0);
            for(const side of [-.30,.30]){
              line(point(back,side),tip,'#292a42',4.3);line(point(back,side),tip,'#ffdd98',2.2);
            }
          }
        }
        if(at(a)&&at(b)){line(a,b,'#ffdf96',1.5,true);line(b,d,'#ffdf96',1.5,true);line(a,exit,'#9bd9d5',1);}
      }else for(let i=1;i<route.length;i++)if(at(route[i-1])&&at(route[i]))line(route[i-1],route[i],'#9ebae2',1,true);
      if(at(next))beacon(next,'⋄',o.phase==='active'?'#cbebff':'#9fbbd2');
      if(at(o.train))beacon(o.train,'≡','#ffcf80');
    }
    if(s.aide?.marks?.[0] && at(s.aide.marks[0]))SnakeInitiation.drawFork(c,s.aide,project,'#c8efd2');
    if(s.aide && at(s.aide.at) && s.initiation?.prepared)beacon(s.aide.at,'⌁','#b1ffe1');
    for(const m of s.evolution?.marks||[]){
      if(!at(m))continue;
      if(m.first&&!m.entered){beacon(m.first,'1','#ffda92');line(m.first,m,'#ffda92',1,true);}
      beacon(m,m.kind==='switch'?'2':m.kind==='phase'?'⇅':'•','#ffda92');
    }
    for(const e of s.evolution?.effects||[]) {
      if(!at(e))continue;
      if(Number.isFinite(e.fromX)&&Number.isFinite(e.fromY))line({x:e.fromX,y:e.fromY},e,'#ffd6aa',2);
    }
    c.restore();
  }
  window.SnakeIndices={draw,labels};
})();

;
// Convertit un déplacement du pouce en cap sur le plan incliné à l'emplacement de la tête.
(function (root) {
  'use strict';
  function cap(project, camera, head, plane, angle, width, height) {
    const p=project(camera,head.x,head.y,plane);
    const x=project(camera,head.x+.01,head.y,plane);
    const y=project(camera,head.x,head.y+.01,plane);
    const a=(x.x-p.x)*width, b=(y.x-p.x)*width;
    const c=(x.y-p.y)*height, d=(y.y-p.y)*height;
    const det=a*d-b*c, sx=Math.cos(angle), sy=Math.sin(angle);
    if(Math.abs(det)<1e-10)return {x:sx,y:sy};
    const dx=(d*sx-b*sy)/det, dy=(a*sy-c*sx)/det;
    const length=Math.hypot(dx,dy);
    return {x:dx/length,y:dy/length};
  }
  root.SnakePilotage={cap};
})(typeof window!=='undefined'?window:globalThis);

;
(() => {
  'use strict';
  const TAU=2*Math.PI;
  const years=[1976,1985,1995,2185,2985];
  // Ombre, éclair, satellites, prisme, gravité, onde, câble.
  const palettes=[
    ['#10231e','#e9ffe8','#a4c9a3','#e9ffe8','#a4c9a3','#e9ffe8','#507556'],
    ['#191839','#fff1c9','#ffc678','#78eadd','#c5a6ff','#fb8f9d','#766d9d'],
    ['#182033','#fff8d5','#ffab48','#8ce8fc','#be9dff','#ff807c','#7096bf'],
    ['#172334','#fff6db','#ffc278','#7aeeee','#bf9cf3','#ff987e','#6694aa'],
    ['#100e27','#fff9dd','#ffcb78','#94fbea','#dbabff','#ff929d','#729fbb'],
  ];
  const fraction=p=>Math.max(0,Math.min(1,p.life/(p.maxLife||1)));
  function draw(c,s,cam,z,t,reduced,projection) {
    if(!s||!c||typeof projection!=='function')return;
    const level=Math.max(0,years.indexOf(s.year)),[ink,light,amber,ice,violet,coral,wire]=palettes[level];
    const detail=level>=3, fine=level===4, clock=reduced?0:t||0;
    const proj=(x,y)=>projection(cam,x,y,z);
    const belongs=p=>(p.plane??0)===z;
    // Encombrement borné par plan, indépendamment de la fréquence d'affichage.
    const layer=(list,n)=>{const out=[];for(let i=(list?.length||0)-1;i>=0&&out.length<n;i--)if(belongs(list[i]))out.push(list[i]);return out;};
    const f=s.forge||{};
    c.save();c.lineJoin='round';c.lineCap='round';
    function path(pts,color,width=1.8,fill=false) {
      if(pts.length<2)return;
      c.beginPath();pts.forEach((p,i)=>{if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});
      if(fill){c.closePath();c.fillStyle=color;c.fill();}
      else{c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    }
    const line=(a,b,col,w)=>path([a,b],col,w);
    function arc(p,r,start,end,col,w,n=18) {
      const pts=[];
      for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;pts.push(proj(p.x+r*Math.cos(a),p.y+r*Math.sin(a)));}
      path(pts,col,w);
    }
    const ring=(p,r,col,w)=>arc(p,r,0,TAU,col,w,level<2?20:32);
    function oriented(p,a,coords,col,fill=true,width=2) {
      const co=Math.cos(a),si=Math.sin(a);
      path(coords.map(([x,y])=>proj(p.x+x*co-y*si,p.y+x*si+y*co)),col,width,fill);
    }
    function lightning(p,tx,ty,col,w) {
      const dx=tx-p.x,dy=ty-p.y,length=Math.hypot(dx,dy);
      if(length<.06){ring(p,.28,col,w);return;}
      const count=Math.min(12,Math.max(3,Math.ceil(length*1.8)));
      const pts=[proj(p.x,p.y)];
      for(let i=1;i<count;i++){
        const k=i/count,bend=(i%2?1:-1)*Math.min(.35,length*.085)*(i%3===0?.58:1);
        pts.push(proj(p.x+dx*k-dy/length*bend,p.y+dy*k+dx/length*bend));
      }
      pts.push(proj(tx,ty));path(pts,ink,w+2.6);path(pts,col,w);
    }
    function spikes(p,r,col,count){
      for(let i=0;i<count;i++){
        const a=i*TAU/count,co=Math.cos(a),si=Math.sin(a);
        line(proj(p.x+co*r*.87,p.y+si*r*.87),proj(p.x+co*r,p.y+si*r),col,2);
      }
    }
    for(const e of layer(s.effects,7)){
      if(e.kind==='nova')continue;
      const k=reduced?.85:1-fraction(e);
      arc(e,Math.max(.16,(e.radius||.8)*k),.22,TAU-.22,e.kind==='death'?'#ff9992':wire,1.8,14);
    }
    for(const p of layer(s.shots,6)){
      if(p.kind==='arc') {
        lightning(p,p.toX,p.toY,violet,2.7);
        const dx=p.toX-p.x,dy=p.toY-p.y,mag=Math.hypot(dx,dy)||1;
        const fork={x:p.x+dx*.46,y:p.y+dy*.46};
        lightning(fork,p.x+dx*.73-dy/mag*.45,p.y+dy*.73+dx/mag*.45,light,1.4);
        continue;
      }
      const dx=p.toX-p.x,dy=p.toY-p.y,mag=Math.hypot(dx,dy)||1,wx=-dy/mag*.17,wy=dx/mag*.17;
      const start=proj(p.x,p.y),end=proj(p.toX,p.toY);
      line(start,end,ink,6);
      for(const sign of [-1,1])line(proj(p.x+wx*sign,p.y+wy*sign),proj(p.toX+wx*sign,p.toY+wy*sign),sign===1?light:amber,1.9);
      oriented({x:p.toX,y:p.toY},Math.atan2(dy,dx),[[0,0],[-.67,-.38],[-.43,0],[-.67,.38]],light);
    }
    for(const p of layer((s.effects||[]).filter(e=>e.kind==='nova'),2)){
      const k=reduced?.86:Math.max(.08,1-fraction(p)),r=p.radius;
      ring(p,r,wire,1.35);ring(p,r*k,coral,3);spikes(p,r,light,8);
      if(detail)ring(p,Math.max(.1,r*k-.23),light,1.1);
    }
    const head=s.snake?.[0], guiding=new Set();
    for(const p of layer(f.orbits,4)){
      if(!head)break;
      const a=p.angle,r=p.radius;
      if(!guiding.has(r)){guiding.add(r);ring(head,r,wire,1.2);}
      arc(head,r,a-.97,a-.16,amber,2.4,9);
      if(detail) {
        arc(head,r-.17,a-.9,a-.12,wire,2.1,7);
        arc(head,r+.14,a-.58,a-.1,light,1.4,7);
      }
      const tangent=a+Math.PI/2;
      oriented(p,tangent,[[-.87,0],[-.26,-.4],[.28,-.33],[.54,0],[.22,.32],[-.26,.38]],ink);
      oriented(p,tangent,[[-.63,0],[-.18,-.27],[.39,0],[-.18,.27]],amber);
      oriented(p,tangent,[[-.12,-.12],[.28,0],[-.12,.12]],light);
      if(detail){
        oriented(p,tangent,[[-.36,-.23],[-.19,-.53],[.11,-.38],[.02,-.21]],ice);
        oriented(p,tangent,[[-.36,.23],[-.19,.53],[.11,.38],[.02,.21]],ice);
      }
    }
    for(const p of layer(f.projectiles,8)){
      if(p.kind==='well'){
        const r=p.radius;
        // Le cercle extérieur suit exactement le rayon d'attraction en coordonnées de jeu.
        ring(p,r,wire,1.45);
        const strands=detail?4:3;
        for(let j=0;j<strands;j++){
          const pts=[], phase=j*TAU/strands+(reduced?0:clock*.42);
          for(let i=0;i<=14;i++){
            const u=i/14,rr=r*(.85-.62*u),a=phase+u*1.45;
            pts.push(proj(p.x+rr*Math.cos(a),p.y+rr*Math.sin(a)));
          }
          path(pts,j%2?violet:wire,1.65);
          // Pointe orientée vers le noyau, y compris sur une image immobile.
          const tip=pts.at(-1),prev=pts.at(-3),a=Math.atan2(tip.y-prev.y,tip.x-prev.x);
          path([tip,{x:tip.x-5*Math.cos(a-.48),y:tip.y-5*Math.sin(a-.48)},{x:tip.x-5*Math.cos(a+.48),y:tip.y-5*Math.sin(a+.48)}],light,1,true);
        }
        const disk=[];
        for(let i=0;i<=32;i++){const a=i*TAU/32;disk.push(proj(p.x+.57*Math.cos(a),p.y+.57*Math.sin(a)));}
        path(disk,ink,1,true);ring(p,.61,violet,3.2);arc(p,.76,.16,2.7,light,2.2);
        if(detail){
          arc(p,1.13,.45,3.65,amber,2.5);
          arc(p,1.26,.3,2.8,violet,1.5);
        }
        if(fine)arc(p,.88,3.4,5.95,wire,1.9);
      }else{
        const a=Math.atan2(p.vy,p.vx);
        if(p.kind==='prism'){
          oriented(p,a,[[.77,0],[-.2,-.67],[-.72,-.1],[-.43,.62]],ink);
          oriented(p,a,[[.62,0],[-.2,-.53],[-.44,-.06]],light);
          oriented(p,a,[[.62,0],[-.44,-.06],[-.35,.47]],ice);
          oriented(p,a,[[-.2,-.53],[-.44,-.06],[.62,0]],ink,false,1.55);
          if(detail){
            oriented(p,a,[[-.2,-.53],[-.61,-.1],[-.44,-.06]],violet);
            oriented(p,a,[[-.27,.35],[-.12,.15],[.4,.07]],light,false,1.15);
          }
        }else oriented(p,a,[[.64,0],[-.46,-.17],[-.19,.02],[-.43,.22]],ice);
      }
    }
    for(const p of layer(f.effects,8)){
      const age=reduced?.72:1-fraction(p),r=p.radius||1;
      if(p.kind==='chain'){
        lightning(p,p.toX,p.toY,ice,2.5);
        ring(p,.26,light,1.9);ring({x:p.toX,y:p.toY},.26,light,1.9);
        continue;
      }
      if(p.kind==='blast'||p.kind==='collapse'){
        ring(p,r,p.kind==='collapse'?violet:wire,1.3);
        const scale=p.kind==='collapse'?1-age:age;
        ring(p,Math.max(.12,r*scale),p.kind==='collapse'?light:coral,3.1);
        if(detail)ring(p,Math.max(.15,r*scale-.22),amber,1.3);
      }else if(p.kind==='echo'){
        const a=Math.atan2(s.direction?.y??0,s.direction?.x??1),co=Math.cos(a),si=Math.sin(a);
        for(const k of [1,.48,0])oriented({x:p.x-k*co,y:p.y-k*si},a,[[-.24,-.36],[.16,0],[-.24,.36]],k===0?light:wire,false,2);
      }else if(p.kind==='split') {
        const a=Math.atan2(s.direction?.y??0,s.direction?.x??1);
        for(const d of [-.58,0,.58])oriented(p,a+d,[[.16,0],[.75,0]],light,false,1.8);
      }else spikes(p,.37+age*.25,light,4);
    }
    c.restore();
  }
  const api=Object.freeze({draw});
  if(typeof window!=='undefined')window.SnakeArtillerie=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
/* Empreinte brève à la bouche au départ réel d'un tir de forge. */
(() => {
  'use strict';
  const shots=new WeakMap(),duration=.19;
  function event(s,e){
    if(e?.type!=='forgeShot')return;
    const {x,y,plane=0,core,mod}=e;
    if(!Number.isFinite(x)||!Number.isFinite(y)||!['echo','chain','blast'].includes(mod))return;
    const previous=shots.get(s);
    // L’écho différé repart de l’ancien point de tir et possède déjà son propre effet.
    if(mod==='echo'&&previous?.mod===mod&&previous.core===core&&previous.x===x&&previous.y===y&&previous.plane===plane&&s.elapsed-previous.start<.6)return;
    const d=s.direction;if(!d)return;
    shots.set(s,{x,y,plane,core,mod,dx:d.x,dy:d.y,start:s.elapsed});
  }
  function draw(c,s,cam,z,reduced,project){
    const hit=shots.get(s);if(!hit||hit.plane!==z||hit.core!==s.forge?.core||hit.mod!==s.forge?.mod||s.status!=='playing')return;
    const age=s.elapsed-hit.start;
    if(age<0||age>=duration||s.boss?.attack||s.ecologie?.wave)return;
    const a=project(cam,hit.x,hit.y,z),b=project(cam,hit.x+hit.dx,hit.y+hit.dy,z);
    const vx=b.x-a.x,vy=b.y-a.y,n=Math.hypot(vx,vy);if(n<1)return;
    const k=Math.max(.85,Math.min(1.25,a.k*cam.zoom)),dx=vx/n,dy=vy/n;
    // Hors du noyau du projectile, juste au-dessus de sa bouche projetée.
    const x=a.x+k*(18*dx+8*dy),y=a.y+k*(18*dy-8*dx);
    c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.scale(k,k);
    c.lineJoin='round';c.lineCap='round';c.beginPath();
    if(hit.mod==='echo'){
      for(const offset of [-3.5,2.8]){c.moveTo(offset-2,-4.6);c.quadraticCurveTo(offset+4,0,offset-2,4.6);}
    }else if(hit.mod==='chain'){
      c.moveTo(-6.2,2.8);c.lineTo(-2.1,-3.9);c.lineTo(.4,2.1);c.lineTo(5.9,-3.4);
    }else{
      for(const [ex,ey] of [[3.7,-4.9],[6.4,0],[3.7,4.9]]){c.moveTo(-4.3,0);c.lineTo(ex,ey);}
    }
    c.strokeStyle='#15222b';c.lineWidth=4.6;c.stroke();c.strokeStyle=s.year===1976?'#dcf1ab':'#fff0c6';c.lineWidth=2.35;c.stroke();
    c.restore();
  }
  window.SnakeBouche=Object.freeze({event,draw});
})();

;
(() => {
  'use strict';
  const profiles={
    1976:{signature:'comb',name:'Peigne binaire',duration:.72},
    1985:{signature:'ricochet',name:'Carreau à ricochets',duration:.96},
    1995:{signature:'train',name:'Train de la trace',duration:2.05},
    2185:{signature:'moons',name:'Pince des deux lunes',duration:.94},
    2985:{signature:'echo',name:'Échos des deux plans',duration:1.1},
  };
  const states=new WeakMap(), clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const pt=p=>({x:p.x,y:p.y,plane:p.plane??0});
  function state(s){
    let v=states.get(s);
    if(!v){v={spent:0,active:null,trail:[]};states.set(s,v);}
    return v;
  }
  function track(s,v){
    const p=pt(s.snake[0]),last=v.trail[0];
    if(!last||last.plane!==p.plane||Math.hypot(last.x-p.x,last.y-p.y)>=.75){
      v.trail.unshift(p);if(v.trail.length>36)v.trail.pop();
    }
  }
  function read(s){
    const v=state(s),cells=clamp((s.eaten||0)-v.spent,0,2),a=v.active;
    return {cells,ready:s.status==='playing'&&cells>=2&&s.novaCharge>=1,name:profiles[s.year]?.name,
      active:a?{signature:a.signature,year:a.year,start:a.start,age:a.age,duration:a.duration,plane:a.plane,x:a.x,y:a.y}:null};
  }
  function ray(p,dx,dy,width,height,maxLength){
    const tX=dx>0?(width-1-p.x)/dx:dx<0?-p.x/dx:Infinity;
    const tY=dy>0?(height-1-p.y)/dy:dy<0?-p.y/dy:Infinity;
    const n=Math.max(0,Math.min(tX,tY,maxLength));
    return {x:p.x+dx*n,y:p.y+dy*n,n,flipX:tX<=n+1e-7,flipY:tY<=n+1e-7};
  }
  function segment(p,q,width,stage,a){
    return {kind:'segment',ax:p.x,ay:p.y,bx:q.x,by:q.y,width,stage,signature:a.signature,plane:p.plane??a.plane};
  }
  function ring(x,y,r,width,stage,plane,a){return {kind:'ring',x,y,r,width,stage,plane,signature:a.signature};}
  function begin(s,v){
    const p=pt(s.snake[0]),dir=s.direction,mag=Math.hypot(dir.x,dir.y)||1;
    const a={...profiles[s.year],...p,year:s.year,start:s.elapsed,age:0,dx:dir.x/mag,dy:dir.y/mag,
      w:s.width,h:s.height,track:[],paths:[],seen:new Set(),hits:0};
    const {dx,dy}=a;
    if(a.signature==='comb'){
      for(const [i,offset] of [0,-2,2].entries()){
        const origin={x:p.x-dy*offset,y:p.y+dx*offset,plane:p.plane};
        if(origin.x<0||origin.x>s.width-1||origin.y<0||origin.y>s.height-1)continue;
        a.paths.push(segment(origin,ray(origin,dx,dy,s.width,s.height,16),.9,i,a));
      }
    }else if(a.signature==='ricochet'){
      // La première paroi renvoie le carreau. La distance totale et les rebonds sont bornés.
      let vx=dx*.835-dy*.55,vy=dy*.835+dx*.55,from=p,remaining=28;
      const norm=Math.hypot(vx,vy);vx/=norm;vy/=norm;
      for(let i=0;i<8&&a.paths.length<4&&remaining>.001;i++){
        const q=ray(from,vx,vy,s.width,s.height,remaining);
        if(q.n>.001){a.paths.push(segment(from,q,1.1,a.paths.length,a));remaining-=q.n;}
        if(!q.flipX&&!q.flipY)break;
        if(q.flipX)vx=-vx;if(q.flipY)vy=-vy;from=q;
      }
    }else if(a.signature==='train'){
      // Les coordonnées du corps sont les plus récentes, l'historique prolonge la voie derrière la queue.
      const live=s.snake.map(pt);let rest=[];
      const tail=live.at(-1),pos=v.trail.findIndex(q=>q.plane===tail.plane&&Math.hypot(q.x-tail.x,q.y-tail.y)<.6);
      if(pos>=0)rest=v.trail.slice(pos+1);
      for(const q of [...live,...rest].slice(0,32)){
        const last=a.track.at(-1);
        if(last&&Math.hypot(q.x-last.x,q.y-last.y)>1.75)break;
        if(!last||q.plane!==last.plane||Math.hypot(q.x-last.x,q.y-last.y)>.03)a.track.push(q);
      }
      a.track.reverse();
      for(let i=1;i<a.track.length;i++){
        if(a.track[i-1].plane===a.track[i].plane)a.paths.push(segment(a.track[i-1],a.track[i],2.2,i-1,a));
      }
      a.initial=a.paths.length;a.front=pt(p);
    }else if(a.signature==='moons'){
      const q=ray(p,dx,dy,s.width,s.height,6);
      a.cx=q.x;a.cy=q.y;
    }
    v.active=a;
    const d={type:'novaOverload',year:a.year,signature:a.signature,x:p.x,y:p.y,plane:p.plane};
    if(s.events.length>=96)s.events.shift();s.events.push(d);
  }
  function geometry(s){
    const a=states.get(s)?.active;if(!a)return [];
    const u=clamp(a.age/a.duration,0,1);
    if(a.signature==='comb'){
      return a.paths.filter(p=>u>=p.stage*.18 && u<p.stage*.18+.61);
    }
    if(a.signature==='ricochet'){
      const i=Math.min(a.paths.length-1,Math.floor(u*a.paths.length));
      return i>=0?[a.paths[i]]:[];
    }
    if(a.signature==='train'){
      const i=u<.32?Math.min(a.initial-1,Math.floor(u/.32*a.initial)):a.paths.length-1;
      return i<0?[]:a.paths.slice(Math.max(0,i-2),i+1);
    }
    if(a.signature==='moons'){
      const shift=5*(1-u);
      return [-1,1].map((sign,i)=>ring(
        clamp(a.cx-a.dy*sign*shift,0,a.w-1),clamp(a.cy+a.dx*sign*shift,0,a.h-1),1.7,1.1,i,a.plane,a));
    }
    const second=u>=.5,phase=second?(u-.5)*2:u*2;
    return [ring(a.x,a.y,.45+9.55*phase,1.25,second?1:0,second?1-a.plane:a.plane,a)];
  }
  function touches(p,t){
    const radius=p.width/2;
    if(p.kind==='ring')return Math.abs(Math.hypot(t.x-p.x,t.y-p.y)-p.r)<=radius;
    const dx=p.bx-p.ax,dy=p.by-p.ay,length=dx*dx+dy*dy;
    const k=length?clamp(((t.x-p.ax)*dx+(t.y-p.ay)*dy)/length,0,1):0;
    return Math.hypot(t.x-(p.ax+k*dx),t.y-(p.ay+k*dy))<=radius;
  }
  function update(s,dt,h){
    const v=state(s);track(s,v);const a=v.active;if(!a)return;
    if(s.status!=='playing'||a.year!==s.year){v.active=null;return;}
    a.age+=dt;if(a.age>a.duration){v.active=null;return;}
    if(a.signature==='train'){
      // La locomotive remonte le sillage puis emprunte les nouvelles cases réellement traversées.
      const head=pt(s.snake[0]),gap=Math.hypot(head.x-a.front.x,head.y-a.front.y);
      if(gap>=.75||head.plane!==a.front.plane){
        if(gap<=1.75&&head.plane===a.front.plane&&a.paths.length<48)
          a.paths.push(segment(a.front,head,2.2,a.paths.length,a));
        a.front=head;
      }
    }
    if(a.hits>=3)return;
    for(const path of geometry(s)){
      const from={plane:path.plane,x:path.x??path.ax,y:path.y??path.ay};
      for(const t of h.targets()){
        if(a.seen.has(t)||t===s.boss&&!t.weak||!h.visible(from,t)||!touches(path,t))continue;
        a.seen.add(t);a.hits++;h.damage(t,1);
        h.emit('novaOverloadHit',{year:a.year,signature:a.signature,x:t.x,y:t.y,plane:path.plane});
        if(a.hits===3||s.status!=='playing')return;
      }
    }
  }
  function install(engine,forge){
    return {
      engine:{...engine,fire(s){
        const v=state(s),eligible=read(s).ready&&!!profiles[s.year];
        if(!engine.fire(s))return false;
        v.spent=s.eaten||0;v.active=null;
        if(eligible&&s.status==='playing')begin(s,v);
        return true;
      }},
      forge:{...forge,update(s,dt,h){forge.update(s,dt,h);update(s,dt,h);}},
    };
  }
  const api={read,geometry,install,touches};
  if(typeof window!=='undefined')window.SnakeSurcharges=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
/* Tracé des cinq surcharges à partir des primitives de collision actives.
   Appeler par plan, avant les dangers, les acteurs et la tête contrôlée. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  function trace(c,pts,close=false){
    c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
    if(close)c.closePath();
  }
  function line(c,pts,ink,width=1){
    trace(c,pts);c.strokeStyle=ink;c.lineWidth=width;c.stroke();
  }
  function fill(c,pts,color){
    trace(c,pts,true);c.fillStyle=color;c.fill();
  }
  function arc(P,g,r,a,b,n){
    const pts=[];for(let i=0;i<=n;i++){const t=a+(b-a)*i/n;pts.push(P(g.x+Math.cos(t)*r,g.y+Math.sin(t)*r));}return pts;
  }
  function segment(P,g){
    const dx=g.bx-g.ax,dy=g.by-g.ay,L=Math.hypot(dx,dy),h=g.width/2,ux=L?dx/L:1,uy=L?dy/L:0;
    const at=(u,v=0)=>P(g.ax+u*ux-v*uy,g.ay+u*uy+v*ux);
    const clip=[];
    for(let i=0;i<=8;i++){
      const a=-Math.PI/2+i*Math.PI/8;
      clip.push(at(L+h*Math.cos(a),h*Math.sin(a)));
    }
    for(let i=0;i<=8;i++){
      const a=Math.PI/2+i*Math.PI/8;
      clip.push(at(h*Math.cos(a),h*Math.sin(a)));
    }
    return {L,h,at,clip};
  }
  // Tube cathodique : trois registres indépendants portent une suite de bits.
  function comb(c,shape,g,clock){
    const {L,h,at}=shape;
    line(c,[at(0),at(L)],'#70946b',2.2);
    const count=Math.max(1,Math.ceil(L)),pitch=L/count,step=(Math.floor(clock*9)+g.stage)%3;
    for(let i=0;i<count;i++){
      const x=i*pitch,len=pitch*.65,side=i%2?1:-1;
      if((i+step)%3===0)fill(c,[at(x,-h*.65),at(x+len,-h*.65),at(x+len,h*.65),at(x,h*.65)],'#dcf1ab');
      else line(c,[at(x,0),at(x,side*h*.82),at(x+len,side*h*.82)],'#a5c38c',1.35);
    }
    line(c,[at(L,-h),at(L,h)],'#dcf1ab',2);
  }
  // Le carreau de néon montre sa facette en V et un point de réflexion.
  function ricochet(c,shape,g,clock){
    const {L,h,at}=shape,tip=Math.min(L*.42,1.3);
    fill(c,[at(0),at(L*.32,-h*.74),at(L),at(L*.32,h*.36)],'#966ba067');
    line(c,[at(0,-h*.55),at(L-tip,-h*.55),at(L)],'#a3f1e4',1.9);
    line(c,[at(0,h*.51),at(L-tip,h*.51),at(L)],'#ffa0c8',1.95);
    const len=Math.min(1.1,L*.33),x=(.15+.69*((clock*1.2+.27*g.stage)%1))*L;
    fill(c,[at(x-len,0),at(x,-h*.67),at(x+len*.55,0),at(x,h*.67)],'#ffe7c6');
    fill(c,[at(0,-h*.79),at(h*.63,0),at(0,h*.79),at(-h*.63,0)],'#bfecde');
  }
  // Chaque liaison réellement active devient une voiture, orientée selon la trace.
  function train(c,shape,g,clock){
    const {L,h,at}=shape,leading=(g.stage%3)===0;
    fill(c,[at(-h*.55,-h*.38),at(0,-h*.74),at(L*.64,-h*.74),at(L+h*.55,-h*.17),at(L+h*.51,h*.43),at(L*.64,h*.72),at(0,h*.72),at(-h*.55,h*.38)],'#273b53');
    line(c,[at(0,-h*.71),at(L*.64,-h*.71),at(L+h*.50,-h*.16)],'#ffd794',2);
    line(c,[at(0,h*.55),at(L*.78,h*.55)],'#ec8568',1.7);
    for(let i=0;i<3;i++){
      const a=i*(L*.68)/3,b=a+L*.13;
      fill(c,[at(a,-h*.37),at(b,-h*.37),at(b,h*.12),at(a,h*.12)],'#96d8e3');
    }
    if(leading)fill(c,[at(L*.68,-h*.38),at(L+h*.34,-h*.10),at(L+h*.21,h*.22),at(L*.73,h*.18)],'#ffda88');
    const offset=(Math.floor(clock*5)+g.stage)%2;
    for(const n of [0,1])line(c,[at((n*.53+.08)*L,h*.80),at((n*.53+.23)*L,h*.8)],offset===n?'#f6e4a9':'#99aaa7',1.2);
  }
  function ringClip(c,P,g){
    const h=g.width/2,outer=arc(P,g,g.r+h,0,TAU,48),inner=g.r>h?arc(P,g,g.r-h,TAU,0,48):[];
    trace(c,outer,true);
    if(inner.length){c.moveTo(inner[0].x,inner[0].y);for(let i=1;i<inner.length;i++)c.lineTo(inner[i].x,inner[i].y);c.closePath();}
    c.clip('evenodd');
  }
  // Deux croissants solides restent sur les deux anneaux qui se rapprochent.
  function moons(c,P,g,clock){
    const s=g.stage%2,h=g.width/2,a=(s?Math.PI:0)+Math.sin(clock*2)*.27;
    line(c,arc(P,g,g.r,0,TAU,30),'#6f929e',1.5);
    const edge=arc(P,g,g.r+h*.92,a+.13,a+Math.PI*1.67,19);
    const inner=[];
    for(let i=19;i>=0;i--){const f=i/19,angle=a+.13+(Math.PI*1.67-.13)*f,rad=g.r+h*.9-Math.sin(Math.PI*f)*h*1.72;inner.push(P(g.x+Math.cos(angle)*rad,g.y+Math.sin(angle)*rad));}
    fill(c,edge.concat(inner),s?'#cba57d':'#7eb8c6');
    line(c,arc(P,g,g.r+h*.65,a+.23,a+1.78,12),s?'#ffe7b4':'#def6ec',1.8);
    for(const a2 of [a+2.23,a+2.63])line(c,arc(P,g,g.r,a2,a2+.16,3),'#eef1d7',1.25);
  }
  // Le front d'écho est continu. Les condensations dessinent ses fréquences
  // à l'intérieur de l'anneau actif ; aucune étincelle hors de son enveloppe.
  function echo(c,P,g,clock){
    const h=g.width/2,s=g.stage%2,base=clock*.66+s*.45,light=s?'#e3c9ff':'#ffe6bd';
    line(c,arc(P,g,g.r,0,TAU,54),s?'#a981c1':'#cca589',1.6);
    for(let i=0;i<6;i++){
      const a=base+i*TAU/6;
      const ribbon=[];
      for(let k=0;k<=7;k++){
        const f=k/7,angle=a+.72*f,r=g.r+(s?-1:1)*Math.sin(f*Math.PI*2)*h*.72;
        ribbon.push(P(g.x+Math.cos(angle)*r,g.y+Math.sin(angle)*r));
      }
      line(c,ribbon,light,1.4);
      line(c,arc(P,g,Math.max(.02,g.r-h*.64),a+.13,a+.49,4),'#c095de',1.15);
    }
  }
  const segments={comb,ricochet,train},rings={moons,echo};
  function draw(c,s,cam,z,t,reduced,project){
    const api=window.SnakeSurcharges,active=api?.read(s)?.active;
    if(!active||typeof project!=='function')return;
    const geometry=api.geometry(s);
    if(!geometry?.length)return;
    const clock=reduced?0:Math.max(0,active.age||0),P=(x,y)=>project(cam,x,y,z);
    c.save();
    trace(c,[P(-.5,-.5),P((s.width||36)-.5,-.5),P((s.width||36)-.5,(s.height||18)-.5),P(-.5,(s.height||18)-.5)],true);c.clip();
    c.lineJoin='round';c.lineCap='round';
    for(const g of geometry){
      if(g.plane!==z||!(g.width>0))continue;
      const signature=g.signature||active.signature;
      c.save();
      if(g.kind==='segment'&&segments[signature]){
        const shape=segment(P,g);trace(c,shape.clip,true);c.clip();segments[signature](c,shape,g,clock);
      }else if(g.kind==='ring'&&g.r>=0&&rings[signature]){
        ringClip(c,P,g);rings[signature](c,P,g,clock);
      }
      c.restore();
    }
    c.restore();
  }
  window.SnakeSurchargeFX=Object.freeze({draw});
})();

;
/* Repères PCM mesurés par accents.py ; horodatage dans le fichier source. */
globalThis.SnakeNovaAccents=[{"year":1976,"lo":16.70448,"hi":70.12752,"rate":1,"accents":[16.707,18.399,20.091,21.667,23.351,25.047,26.791,28.439,30.007,31.707,33.395,35.095,36.659,38.355,40.051,41.743,43.483,45.139,46.703,48.407,50.091,51.791,53.487,55.047,56.739,58.439,60.179,61.831,63.395,65.091,66.787,68.487],"bars":32,"source":"neonvelocity-2.mp3","sha256":"66c4943111a16a0bcf9924a5cf0acafb7ffecbb1517409abc352cff52fb003b6"},{"year":1985,"lo":46.573264,"hi":93.102453,"rate":1.18,"accents":[46.575,48.503,50.447,52.375,54.327,56.255,58.207,60.139,62.079,64.011,65.951,67.895,69.843,71.763,73.699,75.639,77.587,79.531,81.455,83.459,85.343,87.267,89.227,91.155],"bars":24,"source":"electro-tension-t106.mp3","sha256":"2afdb292071ef0bf632d9fb43818936730449bd84f903bcbbd6e06378bd1f122"},{"year":1995,"lo":20.856536,"hi":61.280214,"rate":1.055,"accents":[20.859,22.531,24.211,25.915,27.559,29.283,30.971,32.655,34.331,36.019,37.699,39.391,41.075,42.759,44.443,46.123,47.823,49.479,51.171,52.859,54.555,56.231,57.903,59.583],"bars":24,"source":"electro-titan-t112.mp3","sha256":"47afaca3079552b91f5b6436aa000e8247aae82d5883a6a3bc123e8bf547b3a9"},{"year":2185,"lo":29.398906,"hi":72.861226,"rate":1.09,"accents":[29.411,31.203,33.031,34.831,36.655,38.467,40.283,42.079,43.899,45.703,47.515,49.331,51.095,52.947,54.759,56.575,58.395,60.211,62.011,63.819,65.631,67.435,69.263,71.055],"bars":24,"source":"voix-machine-t106.mp3","sha256":"b4003c74dbdde451d68fff16b1927cff2ce69b1817d68550b898a953cd9aeb9b"},{"year":2985,"lo":30.411815,"hi":72.62935,"rate":1.08,"accents":[30.463,32.171,33.935,35.699,37.443,39.231,40.975,42.739,44.511,46.279,48.023,49.787,51.547,53.311,55.059,56.827,58.575,60.335,62.091,63.843,65.595,67.363,69.111,70.867],"bars":24,"source":"voix-plus-vite-t108.mp3","sha256":"45d59303f7cecba5205cf7c1514861e0d61976764d145cc46038d4ef84fa7d49"}];

;
(() => {
  'use strict';
  const gain=.06,settle=4,windowMs=80,last=new WeakMap(),markers=new WeakMap();
  function nearest(year,beat){
    if(!beat?.playing||!Number.isFinite(beat.mediaTime))return null;
    const row=globalThis.SnakeNovaAccents?.find(r=>r.year===year);
    if(!row||!row.accents.length)return null;
    const period=row.hi-row.lo,position=row.lo+((beat.mediaTime-row.lo)%period+period)%period;
    let best=null;
    for(let i=0;i<row.accents.length;i++){
      let gap=row.accents[i]-position;
      if(gap>period/2)gap-=period;else if(gap< -period/2)gap+=period;
      const ms=gap/row.rate*1000;
      if(!best||Math.abs(ms)<Math.abs(best.ms))best={index:i,ms};
    }
    return best;
  }
  function cue(s,beat){
    if(!s||s.status!=='playing'||s.novaCharge<1)return 'off';
    const n=nearest(s.year,beat),previous=last.get(s);
    if(!n||previous&&s.elapsed-previous.at<settle)return 'off';
    if(Math.abs(n.ms)<=windowMs+1e-6)return 'hit';
    return n.ms>0&&n.ms<=320?'approach':'off';
  }
  function fire(s,beat,native){
    const qualifies=cue(s,beat)==='hit';
    if(!native(s))return false;
    if(qualifies&&s.status==='playing'&&Number.isFinite(s.elapsed)&&s.novaCharge>=0&&s.novaCharge<1){
      const refund=Math.min(gain,1-s.novaCharge);
      s.novaCharge+=refund;last.set(s,{at:s.elapsed});
      if(s.events.length>=96)s.events.shift();
      s.events.push({type:'novaSync',year:s.year,refund});
    }
    return true;
  }
  function paint(button,s,beat,reduced=false){
    let mark=markers.get(button);
    if(!mark){
      mark=button.ownerDocument.createElement('span');mark.className='nova-sync-cue';mark.setAttribute('aria-hidden','true');
      mark.textContent='♪';button.insertBefore(mark,button.lastElementChild);markers.set(button,mark);
    }
    const value=cue(s,beat),status=reduced&&value==='approach'?'off':value;
    if(mark.dataset.cue!==status)mark.dataset.cue=status;
    return status;
  }
  const api=Object.freeze({nearest,cue,fire,paint,gain,windowMs});
  if(typeof window!=='undefined')window.SnakeSynchroNova=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.SnakeBossAnimation=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const histories=new WeakMap();
  const palettes={1976:['#09180e','#385d31','#87ca5c','#e5ffbf'],1985:['#21162c','#713354','#ef78af','#fff4bc'],
    1995:['#231921','#79473c','#ee8c49','#ffefa9'],2185:['#111528','#674469','#9cd8f1','#ffffdb'],2985:['#20112c','#63395d','#d67eab','#ffefbd']};
  const steps={1976:3,1985:5,1995:8};
  const clamp=v=>Math.max(0,Math.min(1,v));
  function pose(year,b,reduced=false){
    const a=b.attack,phase=b.weak?'open':a?.phase==='active'?'strike':a?.phase==='warning'?'wind':'idle';
    const history=histories.get(b);
    let progress=a?clamp(1-a.remaining/Math.max(.001,a.total)):0;
    const timeLeft=Math.max(b.stun||0,b.attackClock||0);
    const recovery=phase==='open'?(history?.phase==='open'?history.recovery:timeLeft):0;
    if(phase==='open')progress=clamp(1-timeLeft/Math.max(.001,recovery));
    histories.set(b,{phase,recovery});
    if(reduced)progress=phase==='idle'?0:.6;
    else if(steps[year])progress=Math.round(progress*(steps[year]-1))/(steps[year]-1);
    // L'élan se renverse à la frappe ; les pièces reviennent en place sur la riposte.
    const pull=phase==='wind'?.18+.82*progress:phase==='strike'?-.98+.45*progress:phase==='open'?.20*(1-progress):0;
    const open=phase==='open';
    return {year,kind:b.kind,phase,progress,pull,open};
  }
  function parts(p){
    const rear=[],front=[],q=p.pull,v=p.progress,op=p.open,hit=p.phase==='strike';
    let side=front;
    const poly=(color,points)=>side.push({color,points});
    const box=(color,x,y,w,h)=>poly(color,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
    const oval=(color,x,y,rx,ry)=>poly(color,Array.from({length:20},(_,i)=>[x+rx*Math.cos(i*Math.PI/10),y+ry*Math.sin(i*Math.PI/10)]));
    const arm=(a,b,w,color)=>{const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1,X=-dy*w/n,Y=dx*w/n;
      poly(color,[[a[0]+X,a[1]+Y],[b[0]+X,b[1]+Y],[b[0]-X,b[1]-Y],[a[0]-X,a[1]-Y]]);};
    const mid=p.kind==='mid';
    // Les appendices sont peints autour du sprite original ; aucune particule indépendante.
    for(const k of [-1,1]){
      side=front;
      if(p.year===1976 && mid){
        const x=k*(8+q*3);box(0,x-2,-10,4,19);box(2,x-1,-9,2,17);
        const y=k*5+Math.round(q*3);box(1,-7,y-1.5,14,3);box(3,k*4-2,y-2,4,4);
      }else if(p.year===1976){
        const x=k*(7+(op?3:2*q));box(0,x-4,-10,8,18);box(2,x-3,-9,6,16);
        for(let i=0;i<3;i++)box(1,x-2,-6+5*i,4,2);
        box(3,x-3,(hit?-7:5),6,2);
      }else if(p.year===1985 && mid){
        const joint=[k*8,6],tip=[k*(11+4*q),-7+3*q];arm(joint,tip,3.6,0);arm(joint,tip,2.5,2);
        box(3,tip[0]-2.6,tip[1]-2.8,5.2,4);oval(1,...joint,3,3);
      }else if(p.year===1985){
        const y=k*(op?6:2+2.5*q);poly(0,[[-13,0],[-5,y-k*3],[5,y-k*3],[13,0],[5,y+k*2],[-5,y+k*2]]);
        arm([-8,y],[7,y],1.2,2);if(!op)oval(3,3*q,0,1.2,hit?5:2);
      }else if(p.year===1995 && mid){
        const joint=[k*3,3],angle=(hit?-8:op?57:24+42*q)*Math.PI/180;
        const tip=[joint[0]+k*11*Math.cos(angle),joint[1]-11*Math.sin(angle)];
        arm(joint,tip,2.1,0);arm(joint,tip,1.35,2);oval(3,...tip,2,2);oval(1,...joint,2.5,2.5);
      }else if(p.year===1995){
        if(k===-1){
          const y=hit?-12:op?-9: -9+4*q;box(0,0,y,7,9);box(2,1,y+1,5,7);box(3,-1,y-1,9,2);
          const piston=hit?2:q*-2;arm([-10,7], [7+piston,5],1.2,2);oval(3,7+piston,5,1.4,1.4);
        }else{
          const tip=[13+(hit?3: -2*q),5];poly(1,[[4,1],tip,[13,8],[4,6]]);
          if(op){poly(2,[[2,-5],[2,-12],[4,-10],[6,-15],[8,-8],[7,-4]]);poly(3,[[4,-5],[5,-10],[7,-7],[6,-4]]);}
        }
      }else if(p.year===2185 && mid){
        const a=k*Math.PI/2+.55*q;
        const tip=[14*Math.cos(a),11*Math.sin(a)], elbow=[6*Math.cos(a+.38),5*Math.sin(a+.38)];
        arm([0,0],elbow,2.8,1);arm(elbow,tip,1.9,2);oval(3,...tip,2.1,2.1);
      }else if(p.year===2185){
        const x=k*(op?9:6+2.6*q),y=k*(3+2*q);oval(0,x,y,6.2,5.6);oval(1,x,y,5.4,4.7);
        poly(2,[[x-4,y],[x-2,y-3],[x+2,y-4],[x,y-2]]);arm([0,0],[x,y],1,2);
      }else if(mid){
        const tip=[k*(hit?4:op?14:10+4*q),hit?8:-8-1.8*q];
        poly(0,[[k*5,6],[k*13,1],tip,[k*7,-2],[k*2,2]]);
        poly(2,[[k*5,3],[k*11,0],tip,[k*6,-1]]);poly(3,[[k*5,2],[k*7,0],[k*5,-2]]);
      }else{
        for(let i=0;i<3;i++){
          const a=i*Math.PI/3+(k<0?Math.PI:0),twist=(op?-.58:.16+.74*q);
          const polar=(r,t)=>[r*Math.cos(t),r*.82*Math.sin(t)];
          poly(1,[polar(4,a),polar(12,a+twist),polar(14,a+twist+.23),polar(6,a+.35)]);
          arm(polar(7,a+.1),polar(13,a+twist+.14),.85,2);
        }
      }
    }
    // Scellé horizontal ou chambre lumineuse dans une ouverture bordée de noir.
    side=front;
    if(op){
      const r=5.5,cy=p.year===1995&&!mid?1:0;
      poly(0,[[-r-1.6,cy],[0,cy-r-1.5],[r+1.6,cy],[0,cy+r+1.5]]);
      poly(3,[[-r,cy],[0,cy-r],[r,cy],[0,cy+r]]);box(1,-1,cy-1,2,2);
    }else{
      if(p.year===1976){
        box(0,-4,-2,8,4);box(2,-3,-1,2,2);box(2,1,-1,2,2);
      }else if(p.year===1985 && !mid){
        oval(0,0,0,5,hit?2.4:1.35);oval(3,q,0,hit?1.7:1,.8);
      }else if(p.year===1995 && mid){
        oval(0,0,2,2.8,2.8);oval(2,0,2,1.4,1.4);
      }else if(p.year===1995){
        for(let i=-1;i<=1;i++)arm([-4+i*2,0],[-3+i*2,2],.7,0);
      }else if(p.year===2185){
        oval(0,0,0,3,2);arm([-2,1],[2,-1],.65,2);
      }else if(p.year===2985 && mid){
        poly(0,[[-4,-1],[0,2],[4,-1],[2,3],[-2,3]]);
      }else if(p.year===2985){
        oval(0,0,0,3.5,3.5);oval(1,0,0,1.5,1.5);
      }
    }
    side=rear;
    // Deux attaches relient les pièces articulées à la masse du corps en mouvement.
    if(p.year>=2185)for(const k of [-1,1])arm([k*4,2],[k*(10+q),5.2],1.7,1);
    return {rear,front};
  }
  function transform(p){
    const q=p.pull;
    const bias={1976:0,1985:.025,1995:.045,2185:.07,2985:.09}[p.year];
    return {sx:1+.095*q,sy:1-.14*q,angle:(p.kind==='final'?1:-1)*q*bias};
  }
  function paint(c,list,colors){for(const {color,points} of list){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=colors[color];c.fill();
  }}
  // Inscrit le châssis dans le quadrilatère de trois cases vu sous la caméra du jeu.
  // Le plafond reste fixe pendant toute la pose, pour garder l'amplitude de son mouvement.
  function fit(footprint,origin,scale){
    if(!footprint || footprint.length!==4)return 1;
    const corners=[[-18.9,-16.5],[18.9,-16.5],[18.9,16.5],[-18.9,16.5]];
    let limit=1;
    for(let i=0;i<4;i++){
      const a=footprint[i],b=footprint[(i+1)%4],dx=b.x-a.x,dy=b.y-a.y;
      const room=Math.abs(dx*(origin.y-a.y)-dy*(origin.x-a.x));
      const extent=Math.max(...corners.map(([x,y])=>Math.abs(dx*y-dy*x)))*scale;
      if(extent>0)limit=Math.min(limit,.98*room/extent);
    }
    return limit;
  }
  function before(c,year,b,o){
    const p=pose(year,b,o.reduced),t=transform(p),layers=parts(p),colors=palettes[year];
    const viewport=o.viewportWidth||c.canvas?.clientWidth||960,scale=1.67*Math.max(.78,290/viewport,o.unit??1);
    const shrink=fit(o.footprint,o,scale);
    c.save();c.translate(o.x,o.y);c.scale(shrink,shrink);c.rotate(t.angle);c.scale(t.sx,t.sy);
    c.save();c.scale(scale,scale);paint(c,layers.rear,colors);c.restore();
    // L'hôte dessine le sprite au centre local : la déformation s'applique à son châssis.
    return {layers,colors,scale,sprite:{...o,x:0,y:0,reduced:true}};
  }
  function after(c,token){
    c.scale(token.scale,token.scale);paint(c,token.layers.front,token.colors);c.restore();
  }
  return {pose,parts,transform,fit,before,after,palettes};
});

;
/* Instruments diégétiques ; coordonnées de l'horizon logique 960 × 440. */
(() => {
  'use strict';
  const states=new WeakMap();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=(v,n)=>(v%n+n)%n;
  function observe(s,event){
    let m=states.get(s);
    if(!m||m.year!==s.year){m={year:s.year,caps:[],installed:0,ringAt:-Infinity,lastNova:-Infinity,novaRadius:0};states.set(s,m);}
    if(s.year===1976){
      const d=s.direction;
      if(d&&(d.x||d.y)){
        const cap=Math.abs(d.x)>=Math.abs(d.y)?(d.x>0?1:3):(d.y<0?0:2);
        if(m.caps.at(-1)!==cap){m.caps.push(cap);if(m.caps.length>12)m.caps.shift();}
      }
    }
    if(s.year===2185&&event?.type==='flightRing'){
      m.installed++;m.ringAt=s.elapsed;
    }
    if(s.year===2985&&event?.type==='nova'){
      m.lastNova=s.elapsed;m.novaRadius=clamp(event.radius||4,1,16);
    }
  }
  function line(c,pts,ink,w){
    c.beginPath();for(let i=0;i<pts.length;i++){const [x,y]=pts[i];if(i)c.lineTo(x,y);else c.moveTo(x,y);}
    c.strokeStyle=ink;c.lineWidth=w;c.stroke();
  }
  function rect(c,x,y,w,h,ink){c.fillStyle=ink;c.fillRect(x,y,w,h);}
  function scope(c,m){
    if(!m.caps.length)return;
    // Mémoire de directions commises. Quatre paliers fixes sur la seconde voie du tube.
    const row=i=>92+i*5,step=18,start=650-m.caps.length*step;
    const pts=[[start,row(m.caps[0])]];
    for(const [i,d] of m.caps.entries()){
      const x=start+i*step;
      pts.push([x,row(d)],[x+step,row(d)]);
    }
    line(c,pts,'#70946b',2.5);rect(c,648,row(m.caps.at(-1))-1,4,3,'#dcf1ab');
  }
  function convoy(c,s,cam,t){
    const d=s.director;if(!d)return;
    const links=clamp(d.chain||0,0,3),working=d.phase==='active'||d.phase==='warning';
    if(!links&&!working)return;
    const x=wrap(278+t*(8+clamp(cam.nearBoss||0,0,1)*2),1495)-130;
    // La tête du porteur reçoit les mêmes bandes que le relais fixe au mât.
    function bars(x,y,scale){
      rect(c,x-2,y-2,(links*5+6)*scale,5*scale,'#28364b');
      for(let i=0;i<links;i++)rect(c,x+i*5*scale,y,3*scale,2*scale,'#96d9c6');
      if(working)rect(c,x+links*5*scale,y,2*scale,2*scale,'#e9a491');
    }
    bars(21,67,1.5);line(c,[[19,67],[19,83],[15,88]],'#507b89',1.7);
    if(x>0&&x<928&&141+x*.0145-65<87)bars(x+12,141+x*.0145-65,1);
  }
  function switchboard(c,s){
    const o=s.director?.offer;if(o?.kind!=='aiguillage'||o.anchors?.length<6)return;
    const [at,branch,,,start,end]=o.anchors;
    const dx=start.x-end.x,dy=start.y-end.y,len=dx*dx+dy*dy;if(!len)return;
    const side=Math.sign(dx*(branch.y-at.y)-dy*(branch.x-at.x))||1;
    const y=85,targetY=y+side*4;
    rect(c,629,79,57,15,'#303443');
    line(c,[[633,y],[678,y]],'#777b84',1.4);
    line(c,[[643,y],[650,targetY],[678,targetY]],o.step>=1?'#fed191':'#bba791',1.8);
    rect(c,675,targetY-1,4,3,o.step>=2?'#a7dfc3':'#c7ae8b');
    if(o.train){
      const p=clamp(((o.train.x-start.x)*-dx+(o.train.y-start.y)*-dy)/len,0,1);
      rect(c,Math.round(676-40*p),y-1,5,3,'#99cbd5');
    }
  }
  function gantry(c,m,cam,t,age,reduce){
    if(!m.installed)return;
    const shift=reduce?0:Math.sin(t*.105)*3+(cam.look||0)*4+(cam.transition||0)*3,lift=reduce?0:1.7*Math.cos(t*.16);
    c.translate(shift,lift);
    // La potence du décor peint rejoint ici le bord intérieur de l'anneau.
    const count=1+(m.installed-1)%8,seat=i=>[544+i*6,74+i*2.4];
    const phase=reduce?1:clamp(age/.6,0,1);
    for(let i=0;i<count;i++){
      const [x,y]=seat(i),drop=i===count-1?(1-phase)*15:0;
      line(c,[[x,y-drop],[x+3,y+1.2-drop]],'#c3c6a3',3.4);
    }
    const [x,y]=seat(count-1);
    line(c,[[572,18],[x+2,30],[x+2,y-3-(1-phase)*15]],'#be9f6f',1.3);
    line(c,[[x,y-4-(1-phase)*15],[x+4,y-4-(1-phase)*15]],'#efd49a',2);
  }
  function accretion(c,s,m,cam,t,reduce){
    const hp=s.boss?.maxHp?clamp(s.boss.hp/s.boss.maxHp,0,1):0;
    const age=s.elapsed-m.lastNova;
    const energy=reduce?(age<1?1:0):clamp(1-age/1,0,1);
    if(!energy&&!hp)return;
    const shift=reduce?0:Math.sin(t*.105)*3+(cam.look||0)*4+(cam.transition||0)*3;
    const lift=reduce?0:1.7*Math.cos(t*.16);
    c.translate(602+shift,93+lift);c.rotate(-.15);
    const arc=(rx,ry,a,b,ink,w)=>{c.beginPath();c.ellipse(0,0,rx,ry,0,a,b);c.strokeStyle=ink;c.lineWidth=w;c.stroke();};
    if(hp)arc(116-16*hp,12,2.65,3.1+hp*.38,'#d29a85',1.7);
    if(energy){
      const r=92+m.novaRadius+energy*16;
      arc(r,13,5.23,6.82,'#f6bd85',1+energy*1.5);
      arc(r+9,15.3,5.53,6.47,'#c58ea2',1.2);
    }
  }
  function draw(c,s,cam,t=0,reduced=false){
    const m=states.get(s);if(!m||m.year!==s.year)return;
    c.save();c.beginPath();c.rect(0,0,960,112);c.clip();
    switch(s.year){
      case 1976:scope(c,m);break;
      case 1985:convoy(c,s,cam,reduced?0:t);break;
      case 1995:switchboard(c,s);break;
      case 2185:gantry(c,m,cam,t,s.elapsed-m.ringAt,reduced);break;
      case 2985:accretion(c,s,m,cam,t,reduced);break;
    }
    c.restore();
  }
  window.SnakeMondeVivant=Object.freeze({observe,draw});
})();

;
// Horizons du studio. Le décor procédural reste disponible dès la première image.
(() => {
  'use strict';
  const base=document.currentScript?.src||document.baseURI;
  const files={1985:'circuit-antenne.webp',1995:'quai-verriere.webp',2185:'chantier-orbital.webp',2985:'etoile-effondree.webp'};
  const loaded=new Map();
  function load(year){
    if(!files[year])return Promise.resolve(false);
    const url=new URL('decors/'+files[year],base);
    // Un document file:// peut avoir une origine opaque, même pour un voisin.
    if(!['https:','http:'].includes(url.protocol)||new URL(document.baseURI).protocol==='file:')return Promise.resolve(false);
    if(loaded.has(year))return loaded.get(year).pending;
    const img=new Image(),item={img,ready:false,pending:null};
    img.crossOrigin='anonymous';img.decoding='async';
    item.pending=new Promise(resolve=>{
      const fail=()=>{if(loaded.get(year)===item)loaded.delete(year);resolve(false);};
      img.onload=()=>{
        try{
          // Le worker peut fournir une carte de remplacement si la peinture est absente.
          if(img.width<900||img.height<400){fail();return;}
          const probe=document.createElement('canvas');probe.width=1;probe.height=1;
          const c=probe.getContext('2d');c.drawImage(img,0,0,1,1);c.getImageData(0,0,1,1);
          item.ready=true;resolve(true);
        }catch{fail();}
      };
      img.onerror=fail;
    });
    loaded.set(year,item);img.src=url.href;
    return item.pending;
  }
  function horizon(c,img,year,time,cam,reduce){
    // Repères mesurés sur les planches studio 1859/1860 × 846 :
    // pieds de la ville à la ligne 421 et sommet du rail à la ligne 356.
    const railway=year===1995,sourceY=img.height*(railway?356:421)/846;
    const railY=railway?131:152;
    const shift=reduce?0:Math.sin(time*.10)*(railway?1.4:2.2)+(cam.look||0)*(railway?1.6:2.6);
    const left=-6+shift;
    c.fillStyle=railway?'#18132f':'#24132b';c.fillRect(0,0,960,440);
    c.drawImage(img,0,0,img.width,sourceY,left,0,972,railY);
    c.drawImage(img,0,sourceY,img.width,img.height-sourceY,left,railY,972,440-railY);
    c.fillStyle=railway?'rgba(17,24,45,.20)':'rgba(18,17,38,.14)';
    c.fillRect(0,0,960,440);
  }
  function draw(c,year,t,cam,reduce){
    const item=loaded.get(year);if(!item?.ready)return false;
    const time=reduce?0:t,pressure=cam.nearBoss||0,look=reduce?0:(cam.look||0);
    const slide=reduce?0:Math.sin(time*.105)*3+look*4+(cam.transition||0)*3;
    const lift=reduce?0:1.7*Math.cos(time*.16);
    if(year===1985||year===1995){
      if(!window.SnakeMondes?.traffic)return false;
      c.save();horizon(c,item.img,year,time,cam,reduce);
      window.SnakeMondes.traffic(c,year,time,cam,reduce);c.restore();return true;
    }
    c.save();
    c.drawImage(item.img,-13+slide,-6+lift,986,452);
    if(year===2185){
      // Navettes de service sur des trajectoires distinctes devant l'anneau.
      for(let i=0;i<8;i++){
        const x=((i*141+time*(7+i%3*5))%1020)-24;
        const y=25+((i*31)%104)+Math.sin(i+.25*time)*3;
        const l=3+i%4;
        c.fillStyle='#071627';c.fillRect(Math.round(x-l),Math.round(y),l*2,3);
        c.fillStyle=i%2?'#a3c1c4':'#ffbe7c';c.fillRect(Math.round(x-l+2),Math.round(y),l,1);
        c.fillStyle='#7fe6db';c.fillRect(Math.round(x+l),Math.round(y+1),2,1);
        if(pressure>.35){c.fillStyle='#ffc07a';c.fillRect(Math.round(x-l-4),Math.round(y+1),3,1);}
      }
    }else{
      // Les débris décrivent des orbites elliptiques. L'approche du gardien resserre les rayons.
      c.translate(578+slide*.55,96+lift*.55);c.rotate(-.15);
      for(let i=0;i<24;i++){
        const a=i*2.39996+time*(.075+.017*(i%5))*(1+pressure*.7);
        const r=(76+(i*29)%173)*(1-.16*pressure),x=Math.cos(a)*r,y=Math.sin(a)*r*.18;
        c.fillStyle=i%4?'#e5a17b9c':'#e9c4dfcc';
        c.fillRect(x,y,1+(i%3),1.15);
      }
    }
    c.restore();return true;
  }
  window.SnakeMatieres={load,draw,ready:year=>Boolean(loaded.get(year)?.ready)};
})();

;
// Masque phosphore à quatre niveaux. Les coordonnées viennent du masque de
// collision de l'attaque ; le motif est ancré aux cases et au plan physique.
(() => {
  'use strict';
  const {abs,min,max,floor,ceil,hypot}=Math;
  const targets=new WeakMap(),baseInk=[17,28,34],light=[220,241,171],middle=[112,148,107];
  const pack=([r,g,b])=>((255<<24)|(b<<16)|(g<<8)|r)>>>0;
  const dark=pack(baseInk),bright=pack(light),soft=pack(middle);
  function cells(s,z){
    const width=s.width||36,height=s.height||18,mask=new Map();
    for(const a of [s.ecologie?.wave,s.boss?.attack]){
      if(!a||a.plane!==z)continue;
      const danger=a.danger||a.mask;
      const keys=danger||Array.from(a.tiles||[],p=>p.y*width+p.x);
      for(const k of keys)if(Number.isInteger(k)&&k>=0&&k<width*height)mask.set(k,a.phase==='active'||mask.get(k)||false);
    }
    return mask;
  }
  function sheet(c,z){
    const screen=c.canvas,w=min(384,screen.width),h=Math.round(w*screen.height/screen.width);
    let pair=targets.get(screen);if(!pair){pair=[];targets.set(screen,pair);}
    let b=pair[z];
    if(!b||b.w!==w||b.h!==h){
      const el=document.createElement('canvas');el.width=w;el.height=h;
      const ctx=el.getContext('2d'),img=ctx.createImageData(w,h);
      b={el,ctx,img,w,h,words:new Uint32Array(img.data.buffer)};pair[z]=b;
    }
    return b;
  }
  function projectCell(project,cam,x,y,z,w,h){
    const P=(a,b)=>{const p=project(cam,a,b,z);return [p.x*w/960,p.y*h/440];};
    const a=P(x-.5,y-.5),b=P(x+.5,y-.5),c=P(x+.5,y+.5),d=P(x-.5,y+.5);
    return [a,b,c,d];
  }
  function walk(q,w,h,visit){
    const [a,b,c,d]=q;
    const minX=max(0,floor(min(a[0],b[0],c[0],d[0]))),maxX=min(w-1,ceil(max(a[0],b[0],c[0],d[0])));
    const minY=max(0,floor(min(a[1],b[1],c[1],d[1]))),maxY=min(h-1,ceil(max(a[1],b[1],c[1],d[1])));
    const ax=b[0]-a[0],ay=b[1]-a[1],bx=d[0]-a[0],by=d[1]-a[1],cx=c[0]-b[0]-d[0]+a[0],cy=c[1]-b[1]-d[1]+a[1];
    const det=ax*by-ay*bx,rx=hypot(ax,ay),ry=hypot(bx,by);
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=x+.5-a[0],py=y+.5-a[1];
      let u=(px*by-py*bx)/det,v=(ax*py-ay*px)/det;
      // Inverse bilinéaire : deux itérations suffisent sur cette case convexe.
      for(let i=0;i<2;i++){
        const dx=ax*u+bx*v+cx*u*v-px,dy=ay*u+by*v+cy*u*v-py;
        const ux=ax+cx*v,uy=ay+cy*v,vx=bx+cx*u,vy=by+cy*u,disc=ux*vy-uy*vx;
        u-=(dx*vy-dy*vx)/disc;v-=(ux*dy-uy*dx)/disc;
      }
      if(u>=0&&v>=0&&u<1&&v<1)visit(x,y,u,v,rx,ry);
    }
  }
  function ink(strategy,u,v,rx,ry,neighbors,active,selected){
    const intensity=selected?bright:soft;
    const d=(u+v-1)*min(rx,ry);
    if(strategy==='double'){
      if(abs(d)<.66)return intensity;
      return abs(d)<1.6?dark:0;
    }
    if(strategy==='adaptative'){
      const cycles=max(1,Math.round(min(rx,ry)/3));
      const phase=((u+v)*cycles+.19)%1;
      if(phase<.23+(active?.08:0))return intensity;
      return phase<.59?dark:0;
    }
    const [left,top,right,bottom]=neighbors;
    const near=min(left?999:u*rx,top?999:v*ry,right?999:(1-u)*rx,bottom?999:(1-v)*ry);
    const centerX=(u-.5)*rx, centerY=(v-.5)*ry;
    const diagonal=centerY+centerX*(active?-.55:.55);
    // Un tiret oblique et sa contreforme au centre de chaque case. Les côtés
    // partagés laissent respirer les salves étendues, leurs entrées sont ponctuées.
    if(abs(centerX)<max(1.6,rx*.27)&&abs(centerY)<max(1.15,ry*.34)){
      if(abs(diagonal)<.67)return intensity;
      if(abs(diagonal)<1.65)return dark;
    }
    const dash=((u*rx+v*ry)*(active?.90:.62))%3;
    if(near<1.45)return dash<1.6?intensity:dark;
    const dx=min(u,1-u)*rx,dy=min(v,1-v)*ry;
    if(dx<.95&&dy<1.25)return intensity;
    return 0;
  }
  function balance(words,indices,lightInk,share){
    if(indices.length<2)return;
    const wanted=max(1,min(floor(indices.length/2),ceil(indices.length*share)));
    let lights=0,darks=0;
    for(const at of indices){if(words[at]===lightInk)lights++;if(words[at]===dark)darks++;}
    // Priorité au milieu de l'entrée, en alternant les deux côtés de son milieu.
    // Des encres déjà posées restent en place ; on complète le motif transparent.
    for(const [color,number] of [[lightInk,wanted-lights],[dark,wanted-darks]]){
      let left=number;
      if(left<=0)continue;
      const count=indices.length,mid=floor(count/2);
      for(let pass=0;pass<2&&left>0;pass++)for(let j=0;j<count&&left>0;j++){
        const k=mid+(j%2?-(j+1)/2:j/2);if(k<0||k>=count)continue;
        const at=indices[k],previous=words[at];
        if(previous===color||(!pass&&previous!==0))continue;
        if(previous===lightInk&&lights<=wanted||previous===dark&&darks<=wanted)continue;
        if(previous===lightInk)lights--;if(previous===dark)darks--;
        words[at]=color;if(color===dark)darks++;else lights++;
        left--;
      }
    }
  }
  function draw(c,s,cam,project,z,strategy='groupe'){
    if(s.year!==1976)return false;
    const attack=s.boss?.attack, wave=s.ecologie?.wave;
    if(attack?.plane!==z&&wave?.plane!==z)return true;
    const b=sheet(c,z),width=s.width||36,selected=z===(s.plane??0);
    const key=[cam.yaw,cam.tilt,selected,attack?.phase,wave?.phase,strategy].join('|');
    if(b.key!==key||b.attack!==(attack?.danger||attack?.tiles)||b.wave!==(wave?.mask||wave?.tiles)){
      const mask=cells(s,z);b.words.fill(0);
    for(const [key,isActive] of mask){
      const x=key%width,y=floor(key/width),neighbors=[x>0&&mask.has(key-1),mask.has(key-width),x<width-1&&mask.has(key+1),mask.has(key+width)];
      const q=projectCell(project,cam,x,y,z,b.w,b.h);
      const zones=strategy==='groupe'?[[],[],[],[],[]]:null;
      walk(q,b.w,b.h,(ix,iy,u,v,rx,ry)=>{
        const at=iy*b.w+ix;b.words[at]=ink(strategy,u,v,rx,ry,neighbors,isActive,selected);
        if(!zones)return;
        if(abs(u-.5)<=.3&&abs(v-.5)<=.32)zones[0].push(at);
        if(u<.24)zones[1].push(at);
        if(v<.24)zones[2].push(at);
        if(u>.76)zones[3].push(at);
        if(v>.76)zones[4].push(at);
      });
      if(zones){
        for(let j=1;j<zones.length;j++)balance(b.words,zones[j],selected?bright:soft,.30);
        balance(b.words,zones[0],selected?bright:soft,.30);
      }
    }
      b.ctx.putImageData(b.img,0,0);
      b.base={...cam};b.key=key;b.attack=attack?.danger||attack?.tiles;b.wave=wave?.mask||wave?.tiles;
    }
    c.save();c.globalAlpha=1;c.imageSmoothingEnabled=false;
    const base=b.base,scale=cam.zoom/base.zoom/(1+base.bank*base.bank);
    const a=(1+cam.bank*base.bank)*scale,rot=(cam.bank-base.bank)*scale;
    const px=480+(base.dx||0),py=254+(base.dy||0)+base.zoom*8*base.level;
    const tx=480+(cam.dx||0)-a*px+rot*py,ty=254+(cam.dy||0)+cam.zoom*8*cam.level-rot*px-a*py;
    c.transform(a,rot,-rot,a,tx,ty);
    c.drawImage(b.el,0,0,960,440);c.restore();
    return true;
  }
  let halo;
  function headHalo(c,p,angle,unit){
    if(!window.SnakeSprites?.raster)return;
    if(!halo){
      const g=SnakeSprites.raster(1976,'head'),pad=1,el=document.createElement('canvas');
      el.width=g.w+2*pad;el.height=g.h+2*pad;
      const layer=el.getContext('2d'),img=layer.createImageData(el.width,el.height),pixels=new Uint32Array(img.data.buffer);
      for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++)if(g.data[y*g.w+x]){
        for(let dy=-pad;dy<=pad;dy++)for(let dx=-pad;dx<=pad;dx++)if(dx*dx+dy*dy<=pad*pad)
          pixels[(y+pad+dy)*el.width+x+dx+pad]=dark;
      }
      layer.putImageData(img,0,0);
      halo={el,w:el.width/g.density,h:el.height/g.density,scale:g.scale};
    }
    const width=c.canvas?.clientWidth||960,scale=halo.scale*max(.78,390/width,unit);
    c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(scale,scale);c.imageSmoothingEnabled=false;
    c.drawImage(halo.el,-halo.w/2,-halo.h/2,halo.w,halo.h);c.restore();
  }
  window.SnakePhosphore=Object.freeze({draw,cells,projectCell,walk,headHalo});
})();

;
(() => {
  'use strict';
  const years=[1976,1985,1995,2185,2985], memory=new WeakMap();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const level=y=>Math.max(0,years.indexOf(y));
  const zOf=(p,s)=>p.plane??s.plane??0;
  const unit=(x,y)=>{const m=Math.hypot(x,y);return m>1e-6?{x:x/m,y:y/m}:{x:0,y:0};};
  const angle=(p,q)=>Math.atan2(q.y-p.y,q.x-p.x);
  const blend=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
  function wavefronts(s) {
    const t=s.elapsed??0,n=s.eaten??0;
    let v=memory.get(s);
    if(!v || n<v.n || t<v.t){v={n,t,starts:[]};memory.set(s,v);}
    if(n>v.n)v.starts=[t,...v.starts].slice(0,3);
    v.n=n;v.t=t;
    const speed=Math.max(10,s.snake.length/2.2);
    return v.starts.map(start=>(t-start)*speed).filter(i=>i<=s.snake.length+2);
  }
  function transform(s,cam,points,t,reduced,projection,method='joint'){
    const body=s.snake;if(!body?.length)return [];
    const tech=level(s.year),fase=clamp(s.progress??1,0,1),fronts=wavefronts(s);
    const dir=s.flight?{x:Math.cos(s.flight.angle),y:Math.sin(s.flight.angle)}:s.direction;
    const angles=[1,3,6,0,0];
    return body.map((p,i)=>{
      const prev=s.previousSnake?.[i]||p,z=zOf(p,s),lead=body[i-1],tail=body[i+1];
      const forward=i&&lead?unit(lead.x-p.x,lead.y-p.y):dir;
      const incoming=tail?unit(p.x-tail.x,p.y-tail.y):forward;
      const base=projection(cam,p.x,p.y,z);
      const ahead=projection(cam,p.x+forward.x,p.y+forward.y,z);
      const back=projection(cam,p.x+incoming.x,p.y+incoming.y,z);
      const outgoing=angle(base,ahead),from=angle(base,back);
      let wx=p.x,wy=p.y,pitch=outgoing;
      if(method==='linear'){
        const k=s.flight||reduced?1:fase;
        wx=prev.x+(p.x-prev.x)*k;wy=prev.y+(p.y-prev.y)*k;
        const legacy=points?.[i]||projection(cam,wx,wy,z);
        if(i&&points?.[i-1])pitch=angle(legacy,points[i-1]);
        return {...legacy,plane:z,wx,wy,angle:pitch,scale:1,pulse:0};
      }
      // La tête garde le centre et la direction du moteur même au premier instant d’un virage.
      if(i&&!reduced){
        if(s.flight){
          const a=s.flight.angle||0;
          const amp=[0,.018,.028,.045,.058][tech]*Math.min(1,i/3);
          const sway=amp*Math.sin((t||0)*3.3-i*.72+a);
          wx-=forward.y*sway;wy+=forward.x*sway;
        }else if(method==='curve'){
          const dx=prev.x-p.x,dy=prev.y-p.y;
          const adjacent=Math.hypot(dx,dy)<=1.001 && zOf(prev,s)===z;
          const drag=adjacent?[0,.065,.09,.12,.14][tech]*(1-fase)**2:0;
          wx+=dx*drag;wy+=dy*drag;
          const corner=incoming.x*forward.y-incoming.y*forward.x;
          const bow=corner*Math.sin(fase*Math.PI)*[0,.02,.035,.045,.055][tech];
          wx-=forward.y*bow;wy+=forward.x*bow;
        }
        let hinge=fase*fase*(3-2*fase);
        if(angles[tech])hinge=Math.round(hinge*angles[tech])/angles[tech];
        const articulated=blend(from,outgoing,hinge);
        const error=Math.atan2(Math.sin(articulated-outgoing),Math.cos(articulated-outgoing));
        const limit=[0,.20,.32,.43,.49][tech];
        pitch=outgoing+clamp(error,-limit,limit);
      }
      const pulse=reduced?0:fronts.reduce((v,f)=>Math.max(v,Math.max(0,1-Math.abs(f-i)/1.45)),0);
      // À 2 bits le retour reste une seule pose de lumière, sans expansion.
      const scale=1+(i?1:0)*pulse*[0,.025,.045,.068,.085][tech];
      const q=wx===p.x&&wy===p.y?base:projection(cam,wx,wy,z);
      return {...q,plane:z,wx,wy,angle:pitch,scale,pulse};
    });
  }
  function overlay(c,s,cam,points,z,t,reduced,project,pass='all'){
    if(!points?.length)return;
    const tech=level(s.year);
    c.save();c.lineJoin='round';c.lineCap='round';
    const path=(pts,ink,w)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineWidth=w;c.strokeStyle=ink;c.stroke();};
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(pass!=='pulse'&&a.plane!==b.plane&&a.plane===z){
        const end=project(cam,a.wx,a.wy,b.plane),joint=[b,end,a];
        path(joint,'#19273b',6);path(joint,'#72cfd7',3);
        const dx=a.x-end.x,dy=a.y-end.y,mag=Math.hypot(dx,dy)||1;
        const count=tech<2?2:4;
        for(let j=1;j<=count;j++){
          const k=j/(count+1),x=end.x+k*dx,y=end.y+k*dy,ex=-dy/mag*2.8,ey=dx/mag*2.8;
          path([{x:x-ex,y:y-ey},{x:x+ex,y:y+ey}],'#f9eeaf',1.65);
        }
      }
      if(pass!=='links'&&!reduced&&b.plane===z&&b.pulse>.22){
        const dx=Math.cos(b.angle+Math.PI/2),dy=Math.sin(b.angle+Math.PI/2),r=3.7*(b.k||1)*cam.zoom;
        path([{x:b.x-r*dx,y:b.y-r*dy},{x:b.x+r*dx,y:b.y+r*dy}],tech<2?'#ebffc7':'#ffdc8c',1.3+b.pulse);
      }
    }
    c.restore();
  }
  // Le mouvement de présentation réutilise les poses ; il ne simule aucune collision.
  function displayPose(mode,t,reduced=false,index=0,year=2985){
    const tech=level(year),time=reduced?0:t;
    if(mode==='workshop'){
      // Le flux quitte la tête et rejoint successivement chaque pièce exposée.
      const cycle=(time%3.2)*5, pulse=reduced?0:Math.max(0,1-Math.abs(cycle-index));
      return {x:-index,y:0,angle:0,scale:1+.05*pulse,pulse};
    }
    // Défilé du menu autour d'un cartouche : chaque maillon reprend le chemin de la tête.
    let d=((time*2.2-index)%20+20)%20;
    if(tech<2)d=Math.floor(d*(tech+1))/(tech+1);
    if(d<7)return {x:d,y:0,angle:0,scale:1,pulse:0};
    if(d<10)return {x:7,y:d-7,angle:Math.PI/2,scale:1,pulse:0};
    if(d<17)return {x:17-d,y:3,angle:Math.PI,scale:1,pulse:0};
    return {x:0,y:20-d,angle:-Math.PI/2,scale:1,pulse:0};
  }
  const api={transform,overlay,displayPose};
  if(typeof window!=='undefined')window.SnakeLocomotion=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
// Mouvement ponctuel du plateau. La durée se compte à partir de la grille de noires du MP3.
(() => {
  'use strict';
  const weights={1976:.44,1985:.62,1995:.75,2185:.90,2985:1};
  const prises=new WeakMap();
  const smooth=x=>x*x*(3-2*x);
  function cue(s,e,beat){
    const strength={boss:1,flightStart:.7,novaOverload:.85,surfStart:.54}[e.type];
    if(!strength||!beat||!Number.isFinite(beat.bpm)||beat.bpm<=0)return false;
    const prev=prises.get(s),now=s.elapsed;
    if(prev&&now<prev.until+4.5)return false;
    const period=Math.max(.28,Math.min(.9,60/beat.bpm));
    const phase=Math.max(0,Math.min(1,beat.phase));
    let crest=(1-phase)*period;
    if(crest<.21)crest+=period;
    const attack=s.boss?.attack;
    // Le plateau revient à son assiette avant l'impact d'une salve annoncée.
    if(attack?.phase==='active')return false;
    const available=attack?.phase==='warning'?attack.remaining-.12:Infinity;
    const fall=Math.min(period*1.55,available-crest);
    if(fall<.22)return false;
    const sign=s.snake[0].x<s.width/2?-1:1;
    prises.set(s,{start:now,until:now+crest+fall,crest,fall,sign,power:strength*(weights[s.year]||.6)});
    return true;
  }
  function offsets(s,t,reduced){
    const a=prises.get(s);
    if(!a||reduced||t<a.start||t>=a.until)return null;
    const dt=t-a.start;
    const curve=dt<a.crest?smooth(dt/a.crest):1-smooth(Math.min(1,(dt-a.crest)/a.fall));
    const n=a.power*curve;
    return {bank:a.sign*.14*n,yaw:a.sign*.10*n,tilt:.11*n};
  }
  window.SnakeCameraMusicale={cue,offsets};
})();

;
/* Relief ponctuel de combat. À appeler dans spectacle, avant la tête active et la conversion finale de palette. */
(function(root){
  'use strict';
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]],plane=p=>p.plane??0,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function choose(s,preferred=null){
    const head=s.snake?.[0],z=s.plane??0;
    if(!head)return {cell:null,walls:[]};
    const walls=[],waves=[s.boss?.attack,s.ecologie?.wave].filter(w=>w?.phase==='active'&&plane(w)===z);
    if(s.year===1976&&!s.flight){
      for(const [dx,dy] of dirs){
        const x=Math.round(head.x)+dx,y=Math.round(head.y)+dy,index=y*s.width+x;
        if(x<0||x>=s.width||y<0||y>=s.height)continue;
        if(waves.some(w=>(w.danger||w.mask)?.has(index)))walls.push([dx,dy]);
      }
    }
    // Flight rewards rings; a nearby collectible is actionable again after landing.
    if(s.flight)return {cell:null,walls};
    const same=(s.cells||[]).filter(c=>plane(c)===z).sort((a,b)=>dist(a,head)-dist(b,head));
    const cell=preferred?same.find(p=>p.x===preferred.x && p.y===preferred.y && plane(p)===plane(preferred)):same[0];
    const d=cell&&dist(head,cell);
    if(!cell || d<1.5 || d>6 || s.snake.some(p=>plane(p)===z&&dist(p,cell)<.9))return {cell:null,walls};
    const closeItem=s.cells.some(p=>p!==cell&&dist(p,cell)<4.5);
    const closeEffect=[...(s.forge?.orbits||[]),...(s.forge?.projectiles||[]),...(s.effects||[])].some(p=>plane(p)===z&&dist(cell,p)<4.5);
    const closeEnemy=(s.drones||[]).some(p=>dist(p,cell)<3);
    const closeBody=s.snake.slice(1).some(p=>dist(p,cell)<2);
    const active=s.boss?.attack||s.ecologie?.wave;
    const nearWarning=active&&plane(active)===z&&(active.tiles||[]).some(p=>dist(p,cell)<2);
    return {cell:(closeItem||closeEffect||closeEnemy||closeBody||nearWarning)?cell:null,walls};
  }
  function draw(c,s,cam,project,{time=0,reduced=false,cellOnly=false,preferred=null}={}){
    const cue=choose(s,preferred),cell=cue.cell,walls=cellOnly?[]:cue.walls,head=s.snake[0],z=s.plane??0;
    if(!cell&&!walls.length)return;
    const P=(x,y)=>project(cam,x,y,z);
    c.save();c.lineJoin='round';c.lineCap='round';
    if(cell){
      const p=P(cell.x,cell.y),unit=Math.max(.78,p.k*cam.zoom);
      // Small opaque backing insulates the real icon from lines and glints at its own tile.
      c.fillStyle='#101c22';c.beginPath();c.ellipse(p.x,p.y,11*unit,9*unit,0,0,Math.PI*2);c.fill();
      c.strokeStyle=s.year===1976?'#dcf1ab':'#f4e2aa';c.lineWidth=1.5*unit;
      c.beginPath();
      for(const side of [-1,1]){
        c.moveTo(p.x+side*6*unit,p.y+8*unit);
        c.lineTo(p.x+side*10*unit,p.y+8*unit);
        c.lineTo(p.x+side*10*unit,p.y+5*unit);
      }
      c.stroke();
      root.SnakeSprites.draw(c,'cell',s.year,{x:p.x,y:p.y,unit:unit*1.12,plane:z,bonus:cell.bonus,time,reduced,viewportWidth:cam.viewportWidth});
    }
    for(const [dx,dy] of walls){
      const x=Math.round(head.x)+dx*.55,y=Math.round(head.y)+dy*.55;
      const a=P(x-dy*.36,y+dx*.36),b=P(x+dy*.36,y-dx*.36);
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
      c.strokeStyle='#101c22';c.lineWidth=4;c.stroke();
      c.strokeStyle='#dcf1ab';c.lineWidth=1.6;c.stroke();
    }
    c.restore();
  }
  function drawDiscovery(c,s,cam,project){
    const guide=s.initiation, hint=s.aide;
    if(s.status!=='playing' || !guide?.prepared || !['cellule','croissance'].includes(guide.stage) ||
      s.flight || hint?.shape!=='diamond' || !hint.at) return;
    // Reuse the guide's existing collectible so two cues cannot indicate competing goals.
    draw(c,s,cam,project,{time:cam.time,reduced:cam.reduced,cellOnly:true,preferred:hint.at});
  }
  // Petit repère de niveau à droite ou à gauche de la cellule de l'autre grille.
  // Le triangle indique l'altitude de l'objet ; le trait horizontal est son palier.
  function drawDepth(c,s,cam,z,project){
    if(z===(s.plane??0)||s.flight||!s.cells?.some(p=>(p.plane??0)===z))return;
    const blocked=[];
    function actor(p,r,layer=p?.plane??0){
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
      const q=project(cam,p.x,p.y,layer),size=r*q.k*cam.zoom;
      blocked.push({x:q.x-size,y:q.y-size,w:size*2,h:size*2,source:p});
    }
    for(const p of s.cells)actor(p,10);
    for(const p of s.snake||[])actor(p,15);
    for(const p of s.previousSnake||[])actor(p,15);
    for(const p of s.drones||[])actor(p,13);
    actor(s.boss,36);actor(s.flightGate,20);actor(s.rift,17);actor(s.aide?.at,17);
    if(s.shiftMode==='portal')for(const g of s.planeGates||[]){actor(g,15,0);actor(g,15,1);}
    for(const a of [s.boss?.attack,s.ecologie?.wave]){
      if(!a)continue;
      const cover=(x,y,plane)=>{
        const corners=[project(cam,x-.5,y-.5,plane),project(cam,x+.5,y-.5,plane),
          project(cam,x+.5,y+.5,plane),project(cam,x-.5,y+.5,plane)];
        const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
        const left=Math.min(...xs)-3,top=Math.min(...ys)-3;
        blocked.push({x:left,y:top,w:Math.max(...xs)+3-left,h:Math.max(...ys)+3-top});
      };
      if(a.tiles?.length){for(const p of a.tiles)cover(p.x,p.y,p.plane??a.plane??0);}
      else for(const k of a.danger||a.mask||[])cover(k%(s.width||36),Math.floor(k/(s.width||36)),a.plane??0);
    }
    c.save();c.lineJoin='round';c.lineCap='round';c.globalAlpha=1;
    for(const p of s.cells){
      if((p.plane??0)!==z)continue;
      const q=project(cam,p.x,p.y,z),u=Math.max(.78,Math.min(1.25,q.k*cam.zoom)),dir=z?-1:1;
      if(blocked.some(b=>b.source!==p&&q.x+2*u>=b.x&&q.x-2*u<=b.x+b.w&&q.y+2*u>=b.y&&q.y-2*u<=b.y+b.h))continue;
      for(const side of [1,-1]){
        if((side===1&&p.x>=s.width-1)||(side===-1&&p.x<=0))continue;
        const x=q.x+side*13*u,y=q.y;
        if(blocked.some(b=>b.source!==p&&x+6*u>=b.x&&x-6*u<=b.x+b.w&&y+7*u>=b.y&&y-7*u<=b.y+b.h))continue;
        c.beginPath();c.moveTo(x-3.6*u,y-dir*3.5*u);c.lineTo(x+3.6*u,y-dir*3.5*u);
        c.moveTo(x-3.8*u,y-dir*.4*u);c.lineTo(x,y+dir*4*u);c.lineTo(x+3.8*u,y-dir*.4*u);
        c.strokeStyle='#17232c';c.lineWidth=4.6*u;c.stroke();
        c.strokeStyle=s.year===1976?'#dcf1ab':'#dce8de';c.lineWidth=2.2*u;c.stroke();
        blocked.push({x:x-6*u,y:y-7*u,w:12*u,h:14*u});break;
      }
    }
    c.restore();
  }
  const api={choose,draw,drawDiscovery,drawDepth};if(typeof module==='object')module.exports=api;else root.SnakeMarquage=api;
})(typeof window!=='undefined'?window:globalThis);

;
/* Deux empreintes de commande, exclusivement sur leurs cases libres. */
(function(root){
  'use strict';
  const inks={1976:['#dcf1ab','#70946b'],1985:['#96d9c6','#60a4a5'],1995:['#b6dfdf','#82bccd'],2185:['#abd6de','#80aabc'],2985:['#b6d3e9','#92a2be']};
  function blocked(s,x,y,z){
    const at=p=>p&&(p.plane??0)===z&&Math.abs(x-p.x)<.76&&Math.abs(y-p.y)<.76;
    const boss=s.boss;
    if(boss&&(boss.plane??0)===z&&Math.abs(x-boss.x)<=1&&Math.abs(y-boss.y)<=1)return true;
    for(const a of [boss?.attack,s.ecologie?.wave]){
      if((a?.plane??0)===z&&(a?.danger?.has?.(y*s.width+x)||a?.mask?.has?.(y*s.width+x)))return true;
      if(a?.tiles?.some(p=>(p.plane??a.plane??0)===z&&p.x===x&&p.y===y))return true;
    }
    const offer=s.director?.offer;
    if([s.rift,s.flightGate,s.bonus,s.aide?.at,offer?.train].some(at))return true;
    if(s.shiftMode==='portal'&&s.planeGates?.some(p=>p.x===x&&p.y===y))return true;
    return [s.snake,s.cells,s.drones,offer?.anchors,s.aide?.marks,s.evolution?.marks].some(list=>list?.some(at));
  }
  function footprints(s,z){
    const head=s.snake?.[0],turns=s.turns;
    if(!head||!turns?.length||s.flight||s.status!=='playing'||(head.plane??0)!==z)return [];
    let {x,y}=head;const marks=[];
    for(let i=0;i<Math.min(2,turns.length);i++){
      const d=turns[i];
      if(!d||!Number.isInteger(d.x)||!Number.isInteger(d.y)||Math.abs(d.x)+Math.abs(d.y)!==1)break;
      x+=d.x;y+=d.y;
      if(x<0||x>=s.width||y<0||y>=s.height||blocked(s,x,y,z))break;
      marks.push({x,y,dx:d.x,dy:d.y,order:i+1});
    }
    return marks;
  }
  function draw(c,s,cam,z,project){
    if(!s.turns?.length||(!s.turbo&&!(s.initiation?.prepared&&s.initiation.stage!=='libre')))return;
    const marks=footprints(s,z);if(!marks.length)return;
    const tones=inks[s.year]||inks[2985];c.save();c.lineCap='butt';
    for(const m of marks){
      // Talon carré, pointe resserrée. La deuxième semelle est plus courte.
      const P=(u,v)=>project(cam,m.x+u*m.dx-v*m.dy,m.y+u*m.dy+v*m.dx,z);
      const end=m.order===1?.47:.23,start=m.order===1?-.16:-.32;
      const halfWidth=s.year===2985&&m.order===1?.22:.17;
      const points=[P(start,-halfWidth),P(end-.05,-halfWidth),P(end,.03),P(end-.08,halfWidth),P(start,halfWidth)];
      c.beginPath();
      for(const [i,p] of points.entries()){if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
      c.closePath();c.fillStyle=tones[m.order-1];c.fill();
      const a=P(start+.18,-.18),b=P(start+.18,.18);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
      c.strokeStyle='#172932';c.lineWidth=1.5;c.stroke();
      if(s.year===1976&&m.order===2){
        const a=P(end-.06,-.13),b=P(end-.06,.13);
        c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=tones[0];c.lineWidth=2;c.stroke();
      }
    }
    c.restore();
  }
  const api=Object.freeze({footprints,draw});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.SnakeVirages=api;
})(typeof window!=='undefined'?window:globalThis);

;
/* Signes d'approche du gardien, peints dans le décor avant les deux plans. */
(() => {
  'use strict';
  const tau=2*Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
  const wrap=x=>x-Math.floor(x);
  function line(c,pts,color,width){
    c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(i)c.lineTo(...p);else c.moveTo(...p);}
    c.lineWidth=width;c.strokeStyle=color;c.stroke();
  }
  function polygon(c,pts,ink){
    c.beginPath();c.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)c.lineTo(...pts[i]);c.closePath();c.fillStyle=ink;c.fill();
  }
  function phosphor(c,p,q,bar,s,cam,reduced){
    // La première voie du tube perd son verrou horizontal dans une fenêtre.
    const x=343+bar*23,w=33+p*117,delta=3+p*(8+q*14);
    c.save();c.beginPath();c.rect(x,49,w,35);c.clip();
    c.fillStyle='rgba(19,34,31,.88)';c.fillRect(x,49,w,35);
    for(let y=52;y<84;y+=12)line(c,[[x,y],[x+w,y]],'#3a5040',.8);
    const pts=[];
    for(let i=0;i<=w+2;i+=2){
      const phase=wrap((x+i-270+delta)*.014-(reduced?0:cam.time||0)*(.8+(s.nearBoss||0)*.6));
      const shock=Math.exp(-(((phase-.46)/.075)**2));
      pts.push([x+i,71+(5+8*p)*Math.sin(phase*tau)+shock*(15+9*q)*Math.sin(phase*tau*4)]);
    }
    line(c,pts,'#9bac80',2.1);line(c,[[x,54],[x,79]],'#bdc397',1.6);c.restore();
  }
  const facades=[
    [[143,75],[143,66],[151,66],[151,57],[158,57],[158,76]],
    [[163,76],[163,62],[172,62],[172,55],[177,55],[177,76]],
    [[181,78],[181,62],[187,62],[187,65],[194,65],[194,78]],
    [[198,81],[198,58],[205,58],[205,67],[210,67],[210,81]],
    [[213,84],[213,74],[220,74],[220,63],[226,63],[226,84]]];
  function blackout(c,p,q,bar){
    // Les fenêtres s'éteignent dans l'ordre du relais central vers les quartiers.
    for(let i=0;i<facades.length;i++){
      const dim=clamp((p*5.8+q*.85-i)*.84);
      if(dim===0)continue;
      c.save();c.globalAlpha*=dim*.90;polygon(c,facades[i],'#171b31');c.restore();
    }
    const y=8+p*(12+12*q);
    // Le courant quitte une bande des anneaux émetteurs, puis gagne la ville.
    c.save();c.globalAlpha*=.88*p;const band=12+(1-q)*29;
    polygon(c,[[162,band],[194,band],[197,band+4+p*5],[160,band+4+p*5]],'#192139');c.restore();
    line(c,[[179,y],[171,y+9],[187,y+9],[179,y]],'#629788',1.7);
    line(c,[[173,y+13],[185,y+13]],'#8d9e8e',1.1);
  }
  function signals(c,p,q,bar){
    // Trois palettes articulées suspendues à la traverse du quai.
    line(c,[[247,41],[247,46],[342,46],[342,41]],'#364353',3);
    for(let i=0;i<3;i++){
      const x=260+i*31,y=52,drop=clamp(p*1.42-i*.26),angle=.12+drop*(.72+.49*q);
      line(c,[[x,46],[x,y]],'#525765',2);
      c.save();c.translate(x,y);c.rotate(angle);
      polygon(c,[[-2,-4],[16,-4],[22,0],[17,4],[-2,4]],'#382c42');
      line(c,[[2,-1],[15,-1]],i===bar%3?'#ffda91':'#db935d',3);
      line(c,[[11,0],[15,0]],'#d4c4a0',2.2);c.restore();
    }
  }
  const panels=[[286,-8,44,9,4,24],[332,2,37,9,4,23],[417,21,32,10,5,21],[452,32,38,11,5,21]];
  function shutters(c,p,q,bar){
    // Obturateurs de modules sur l'arc d'assemblage. Les lames restent sur leur cadre.
    for(let i=0;i<panels.length;i++){
      const [x,y,w,rise,slant,h]=panels[i],amount=clamp(p*1.34-i*.1)*(.62+q*.36);
      if(amount<=0)continue;
      const point=(u,v)=>[x+u*w-v*slant,y+u*rise+v*h];
      for(let k=0;k<4;k++){
        const a=k/4,b=a+amount*.23;
        polygon(c,[point(0,a),point(1,a),point(1,b),point(0,b)],'#253543');
        line(c,[point(0,b),point(1,b)],'#93876e',1);
      }
    }
  }
  function lens(c,p,q,bar,s,cam){
    const painted=window.SnakeMatieres?.ready(2985);
    const cx=painted?602:570,cy=painted?92:79;
    c.translate(cx,cy);c.rotate(-.15);
    const rx=(painted?66:49)*(1-.18*p),ry=(painted?59:49)*(1-.14*p),swell=q*p*4;
    // Deux images tangentielles du bord supérieur de l'horizon des événements.
    for(let i=0;i<2;i++){
      c.beginPath();c.ellipse(0,1,rx+i*7+swell,ry+i*4+swell*.7,0,Math.PI*(1.03+i*.11),Math.PI*(1.86-i*.05));
      c.strokeStyle=i?'#bd7e92':'#eab08b';c.lineWidth=i?1.15:1.5+p*1.6;c.stroke();
    }
  }
  const signs={1976:phosphor,1985:blackout,1995:signals,2185:shutters,2985:lens};
  function draw(c,s,cam,reduced=false){
    const near=s.nearBoss;
    if(!(near>.38)||s.status!=='playing'||!signs[s.year]||s.flight||s.boss?.attack||s.ecologie?.wave||s.director?.offer)return;
    const t=clamp((near-.38)/.62),p=t*t*(3-2*t)*(s.boss ? .55 : 1);
    const sampled=!reduced&&s.beat?.playing!==false&&Number.isFinite(s.beat?.phase);
    const phase=sampled?clamp(s.beat.phase):.5,beat=sampled?(s.beat.beat||0):0;
    // Mouvement continu à chaque noire, même quand l'horloge musicale est muette.
    const q=.5+.5*Math.cos(tau*phase),ink=(.20+.8*p)*(reduced?.78:1);
    const project=window.SnakeSpectacle?.project;
    let y=83;
    if(project)for(const z of [0,1])for(const x of [-.5,35.5])y=Math.min(y,project(cam,x,-.5,z).y-30);
    if(y<4)return;
    c.save();c.beginPath();c.rect(0,0,960,y);c.clip();c.globalAlpha*=ink;
    signs[s.year](c,p,q,beat,s,cam,reduced);c.restore();
  }
  window.SnakePresage=Object.freeze({draw});
})();

;
/* Deux surfaces transparentes en perspective centrale. Unités publiques en cases,
   point (0,0) au centre de la première case. L'espace de dessin mesure 960 × 440. */
(() => {
  'use strict';
  const W=960, H=440, TAU=2*Math.PI;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const mod=(x,n)=>(x%n+n)%n;
  const palettes={
    1976:['#111b2b','#34545b','#d7a176','#9ba57f','#e4dd95'],
    1985:['#151333','#593364','#ed8b83','#bd648b','#ffe8a6'],
    2185:['#111d39','#304c73','#d18b8f','#897aa7','#ffe5b4'],
    2985:['#151333','#503364','#ec8799','#aa72aa','#ffe5ab']
  };
  function camera(s,t=0,reduced=false){
    const shift=s.planeShift, part=shift?clamp(1-shift.remaining/shift.total):1;
    const level=shift?mix(shift.from,shift.to,part):s.plane||0;
    const transition=reduced?0:Math.sin(Math.PI*part)*(shift?(shift.to-shift.from):0);
    const flight=reduced?0:s.flight?clamp((s.flight.total-s.flight.remaining)*2.5):0;
    const look=reduced?0:clamp(((s.snake?.[0]?.x??17.5)-17.5)/18,-1,1);
    const yaw=reduced?-.044:-.06+.035*look+.11*transition+flight*.047*Math.cos(s.flight?.angle||0);
    const cam={yaw,tilt:reduced?.61:.61+.16*Math.abs(transition)+.13*flight,
      bank:reduced?0:.013+.034*transition+.022*flight*Math.sin(s.flight?.angle||0),
      level:reduced?.5:level,look,transition,zoom:1};
    const movement=window.SnakeCameraMusicale?.offsets(s,t,reduced);
    if(movement){cam.yaw+=movement.yaw;cam.tilt+=movement.tilt;cam.bank+=movement.bank;}
    const motion=window.SnakeImpact?.sample(s,t,reduced);
    if(motion){cam.bank+=motion.roll;cam.dx=motion.x;cam.dy=motion.y;cam.music=motion;}
    const limits=[0,1].flatMap(z=>[[-.5,-.5],[35.5,-.5],[35.5,17.5],[-.5,17.5]].map(([x,y])=>project(cam,x,y,z)));
    cam.zoom=Math.min(1,...limits.flatMap(p=>[466/Math.abs(p.x-480),p.y>254?174/(p.y-254):230/(254-p.y)]));
    return cam;
  }
  function project(cam,x,y,z=0){
    const X=(x-17.5)/18, D=(y-8.5)/9;
    const depth=1-.21*D+cam.yaw*X;
    const sx=(X*342+cam.yaw*D*92+z*8)/depth;
    const sy=(D*200*cam.tilt-z*23)/depth;
    return {x:W/2+(cam.dx||0)+cam.zoom*(sx-cam.bank*sy),y:254+(cam.dy||0)+cam.zoom*(sy+cam.bank*sx+cam.level*8),k:1/depth};
  }
  function tile(cam,x,y,z=0,r=.5){
    return [[-r,-r],[r,-r],[r,r],[-r,r]].map(([dx,dy])=>project(cam,x+dx,y+dy,z));
  }
  function shape(c,pts,fill,ink,w=1){
    c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
    if(fill){c.closePath();c.fillStyle=fill;c.fill();}
    if(ink){c.strokeStyle=ink;c.lineWidth=w;c.stroke();}
  }
  const xy=(pts)=>pts.map(([x,y])=>({x,y}));
  const path=(c,pts,f,s,w)=>shape(c,xy(pts),f,s,w);
  function oval(c,x,y,rx,ry,fill,ink,w=1){
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
    if(fill){c.fillStyle=fill;c.fill();}
    if(ink){c.strokeStyle=ink;c.lineWidth=w;c.stroke();}
  }
  function surface(w,h){
    const el=document.createElement('canvas');el.width=w;el.height=h;return el;
  }
  const caches=new Map();
  function scenery(year){
    if(caches.has(year))return caches.get(year);
    const colors=palettes[year]||palettes[1985];
    const sky=surface(W,H), c=sky.getContext('2d');
    const grad=c.createLinearGradient(0,0,0,350);
    [[0,colors[0]],[.24,colors[1]],[.46,colors[2]],[.62,colors[3]],[1,'#171c34']].forEach(([n,v])=>grad.addColorStop(n,v));
    c.fillStyle=grad;c.fillRect(0,0,W,H);
    const glow=c.createRadialGradient(634,76,7,634,76,178);
    glow.addColorStop(0,'#ffdba494');glow.addColorStop(1,'#ffdba400');
    c.fillStyle=glow;c.fillRect(430,0,420,260);
    c.save();c.beginPath();c.arc(634,72,57,0,TAU);c.clip();
    const disc=c.createLinearGradient(0,15,0,138);disc.addColorStop(0,colors[4]);disc.addColorStop(.55,'#ffc58d');disc.addColorStop(1,'#f0808a');
    c.fillStyle=disc;c.fillRect(570,12,120,57);
    for(let y=70;y<132;y+=7)c.fillRect(570,y,120,6-(y-70)*.063);
    c.restore();
    let seed=2985; const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
    const stars=Array.from({length:120},()=>[rand()*W,rand()*127,rand()]);
    const far=surface(W,180), f=far.getContext('2d'),city=surface(W,195),g=city.getContext('2d');
    for(let n=0;n<2;n++){
      const points=[[-3,180]];
      for(let x=0;x<=W;x+=8)points.push([x,119+n*13+Math.sin(x*TAU/W*3+n)*12+Math.sin(x*TAU/W*13)*3-rand()*8]);
      points.push([W,180]);path(f,points,n?'#715171':'#946577');
    }
    for(let x=0;x<W;x+=8){
      const w=6+rand()*12,h=9+rand()*50+(x%88<8?22:0),y=171-h;
      const tone=rand()>.6?'#3b3354':'#443750';
      g.fillStyle=tone;g.fillRect(x,y,w,h+24);g.fillRect(x+2,y-3,w-4,5);
      if(h>47){path(g,[[x+w*.5,y],[x+w*.5,y-8]],null,'#58425d',1);g.fillStyle='#ffc399';g.fillRect(x+w*.5,y-8,1,1);}
      for(let j=y+4;j<174;j+=4)for(let i=2;i<w-2;i+=4)if(rand()>.42){g.fillStyle=rand()>.5?'#b38c94':'#687b90';g.fillRect(x+i,j,2,.95);}
    }
    const art={sky,far,city,stars};caches.set(year,art);return art;
  }
  function periodic(c,img,offset,y){
    const x=-mod(offset,W);c.drawImage(img,x,y);c.drawImage(img,x+W,y);
  }
  function walker(c,x,y,scale,t){
    c.save();c.translate(x,y);c.scale(scale,scale);
    const armor='#28253e', edge='#a66c81';
    for(const [index,hip] of [[0,-19],[1,14],[2,-12],[3,23]]){
      const step=Math.sin(t*1.2+index*1.8), knee=hip+(index%2?10:-10)+step*5;
      const leg=[[hip,-36],[knee,-20+step*3],[knee-4+step*8,-2]];
      path(c,leg,null,'#30273e',index>1?5:3.6);
      path(c,leg.map(([a,b])=>[a-1,b]),null,'#855469',.85);
      path(c,[[leg[2][0]-4,0],[leg[2][0]+6,0]],null,armor,3);
      oval(c,knee,-20+step*3,3,3,armor,edge,.7);
    }
    path(c,[[-35,-46],[-24,-53],[-13,-54],[-10,-60],[2,-60],[9,-53],[25,-51],[33,-44],[27,-39],[10,-39],[3,-32],[-16,-32],[-21,-38],[-35,-40]],armor,edge,1);
    path(c,[[-26,-47],[-15,-50],[20,-48],[25,-45]],null,'#da899b',1.2);
    path(c,[[17,-48],[38,-52],[45,-50],[37,-46],[25,-43]],'#303048',edge,.8);
    path(c,[[-12,-53],[-10,-64],[-3,-67],[-3,-60]],armor,edge,1);
    c.fillStyle='#ffd4a7';c.fillRect(26,-49,6,1.5);
    c.restore();
  }
  function world(c,s,t,cam){
    const a=scenery(s.year||1985);c.drawImage(a.sky,0,0);
    for(const [x,y,k] of a.stars){
      c.fillStyle=k>.9?'#eee4d4':'#b9a8bb';c.fillRect(mod(x-t*.9,W),y,k>.9?2:.85,k>.9?1.3:.8);
    }
    periodic(c,a.far,t*1.8+cam.look*2,0);
    for(let i=0;i<12;i++){
      const x=mod(72+i*84+t*(3+i%3),W+50)-24,y=34+i*23%67;
      path(c,[[x-8,y],[x+4,y-2],[x+9,y],[x+2,y+2],[x-4,y+2]],'#44324c','#b48590',.55);
      path(c,[[x-9,y+1],[x-15,y+1]],null,'#ef9d9c88',.8);
    }
    for(let i=0;i<2;i++)walker(c,mod(226+i*570-t*3+cam.look*4,W+180)-60,153,i?1.02:1.63,t+i);
    periodic(c,a.city,t*6+cam.look*6,1);
    // Viaduc aérien à haubans, piles et trafic sur sa propre couche de profondeur.
    const offset=mod(t*10+cam.look*8,240);
    for(let x=-offset;x<W+240;x+=240){
      const y=141+.018*x;
      path(c,[[x-3,y+39],[x-2,y-31],[x+1,y-35],[x+4,y+42]],'#46384d','#a97781',.85);
      for(const spread of [18,34,51])for(const d of [-1,1])path(c,[[x,y-28],[x+d*spread,y+d*spread*.018]],null,'#926974',.85);
    }
    path(c,[[0,141],[W,158.3],[W,166],[0,149]],'#3d344c','#b78c8a',1);
    for(let i=0;i<11;i++){
      const x=mod(i*93+(i%2?-1:1)*t*(18+i%4*5),W+32)-16,y=139+x*.018+(i%2?5:0);
      path(c,[[x-6,y],[x-2,y-2],[x+6,y-2],[x+8,y]],null,i%2?'#ffd1a5':'#a7dddc',1.25);
    }
    const dark=c.createLinearGradient(0,160,0,H);dark.addColorStop(0,'#261d3990');dark.addColorStop(.64,'#11152a');dark.addColorStop(1,'#080e20');
    c.fillStyle=dark;c.fillRect(0,179,W,H-179);
    for(let i=0;i<15;i++){
      const d=mod(i+t*.45,15)/15,y=183+d*d*259;
      path(c,[[0,y],[W,y]],null,'#69446655',.7+d);
    }
    for(let n=-12;n<=12;n++)path(c,[[480+n*19,173],[480+n*143,H]],null,'#6b486050',.85);
  }
  const gridTexture=new Map();
  const deckColors=[['#131a30ed','#54749170','#88b5cc'],['#24304a31','#719eae50','#82cbc4']];
  function floorGrid(c,cam,z,selected,method){
    const P=(x,y)=>project(cam,x,y,z);
    const corners=[P(-.5,-.5),P(35.5,-.5),P(35.5,17.5),P(-.5,17.5)];
    const colors=deckColors[z];
    shape(c,corners,colors[0]);
    const step=selected?1:3;
    const ink=selected?colors[1]:z?'#7d9fba22':'#7889a639';
    if(method==='bands'){
      // Rendu témoin : véritable texture orthogonale projetée par parallélogrammes
      // affines. Les deux extrémités inférieures héritent du gradient de la bande.
      const key=z+':'+selected;
      if(!gridTexture.has(key)){
        const texture=surface(720,360),g=texture.getContext('2d');
        g.strokeStyle=ink;g.lineWidth=1.1;g.beginPath();
        for(let i=0;i<=36;i+=step){g.moveTo(i*20,0);g.lineTo(i*20,360);}
        for(let j=0;j<=18;j+=step){g.moveTo(0,j*20);g.lineTo(720,j*20);}
        g.stroke();gridTexture.set(key,texture);
      }
      const texture=gridTexture.get(key);
      for(let j=0;j<36;j++){
        const a=P(-.5,j*.5-.5),b=P(35.5,j*.5-.5),d=P(-.5,j*.5);
        c.save();c.transform((b.x-a.x)/720,(b.y-a.y)/720,(d.x-a.x)/10,(d.y-a.y)/10,a.x,a.y);
        c.drawImage(texture,0,j*10,720,10,0,0,720,10);c.restore();
      }
    }else{
      c.beginPath();
      for(let x=-.5;x<=35.5;x+=step){const a=P(x,-.5),b=P(x,17.5);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}
      for(let y=-.5;y<=17.5;y+=step){const a=P(-.5,y),b=P(35.5,y);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}
      c.lineWidth=selected?.88:.67;c.strokeStyle=ink;c.stroke();
    }
    shape(c,[...corners,corners[0]],null,selected?colors[2]:'#7693ae66',selected?1.7:.95);
    // Blocs de rive, éclairage axial et entretoises rendent l'altitude explicite.
    for(let i=0;i<36;i+=3){
      const a=P(i,17.5),b=P(i+.8,17.5);
      shape(c,[a,b,{x:b.x-1,y:b.y+3},{x:a.x-1,y:a.y+3}],z?'#66abae':'#617e98');
    }
  }
  function ring(c,cam,p,z,r,col,width){
    const line=Array.from({length:33},(_,i)=>project(cam,p.x+Math.cos(i*TAU/32)*r,p.y+Math.sin(i*TAU/32)*r,z));
    shape(c,line,null,col,width);
  }
  function symbol(c,cam,p,z,draw){
    const a=project(cam,p.x,p.y,z);
    c.save();c.translate(a.x,a.y);c.scale(cam.zoom*a.k,cam.zoom*a.k);draw();c.restore();
  }
  function mask(c,cam,attack,z){
    const active=attack.phase==='active';
    const tiles=attack.tiles||[];
    c.beginPath();
    for(const p of tiles){
      if((p.plane??attack.plane??0)!==z)continue;
      const q=tile(cam,p.x,p.y,z);
      c.moveTo(q[0].x,q[0].y);for(let i=1;i<4;i++)c.lineTo(q[i].x,q[i].y);c.closePath();
    }
    c.fillStyle=active?'#ff4f7478':'#ee754957';c.fill();
    c.strokeStyle=active?'#ffd3a0':'#ffa488';c.lineWidth=.9;c.stroke();
    c.beginPath();
    for(const p of tiles){
      if((p.plane??attack.plane??0)!==z)continue;
      const a=project(cam,p.x-.3,p.y+.28,z),b=project(cam,p.x+.3,p.y-.28,z);
      c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
    }
    c.strokeStyle=active?'#fff3b6':'#ffb195';c.lineWidth=1.4;c.stroke();
    if(active && cam.year!==1976){
      // Une croix marque l'impact effectif ; l'annonce conserve sa diagonale.
      c.beginPath();
      for(const p of tiles){
        if((p.plane??attack.plane??0)!==z)continue;
        const a=project(cam,p.x-.29,p.y-.27,z),b=project(cam,p.x+.29,p.y+.27,z);
        c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);
      }
      c.strokeStyle='#272333';c.lineWidth=3.3;c.stroke();
      c.strokeStyle='#ffefbe';c.lineWidth=1.8;c.stroke();
    }
  }
  function cell(c,cam,p,z){
    if(window.SnakeSprites){
      const a=project(cam,p.x,p.y,z);
      SnakeSprites.draw(c,'cell',cam.year,{x:a.x,y:a.y,unit:a.k*cam.zoom,plane:z,bonus:p.bonus,reduced:cam.reduced,time:cam.time,viewportWidth:cam.viewportWidth});
      return;
    }
    symbol(c,cam,p,z,()=>{
      oval(c,0,3,7.7,3.2,'#111b27','#887453',.9);
      const col=p.bonus?'#9df1ff':'#ffe09f';
      path(c,[[0,-9],[6,-3],[5,2],[0,6],[-6,0],[-5,-4]],p.bonus?'#48acca':'#de9250',col,1.4);
      path(c,[[0,-7],[2,-2],[0,3],[-2,-2]],'#fff3c8');
    });
  }
  function sentinel(c,cam,p,z,t,boss){
    if(boss){
      const q=tile(cam,p.x,p.y,z,1.5);shape(c,[...q,q[0]],'#a951512b','#e9a485ae',1.2);
    }
    if(p.next&&(p.next.x!==p.x||p.next.y!==p.y)){
      const q=tile(cam,p.next.x,p.next.y,z,boss?1.45:.38);
      c.setLineDash([2,3]);shape(c,[...q,q[0]],null,'#ffb19cac',1);c.setLineDash([]);
    }
    if(window.SnakeSprites){
      const a=project(cam,p.x,p.y,z),unit=a.k*cam.zoom;
      const options={x:a.x,y:a.y,unit,plane:z,kind:p.kind,time:t,reduced:cam.reduced,viewportWidth:cam.viewportWidth};
      let pose;
      if(boss && window.SnakeBossAnimation){
        options.footprint=tile(cam,p.x,p.y,z,1.5);
        pose=SnakeBossAnimation.before(c,cam.year,p,options);
      }
      SnakeSprites.draw(c,boss?'boss':'drone',cam.year,pose?.sprite||options);
      if(pose)SnakeBossAnimation.after(c,pose);
      if(p.warmup>0)oval(c,a.x,a.y,10*unit,7*unit,null,'#ffabad',1);
      if(boss){
        const half=18*unit;
        c.fillStyle='#341b31';c.fillRect(a.x-half,a.y+17*unit,2*half,3);
        c.fillStyle=p.weak?'#edffbb':'#ffcead';c.fillRect(a.x-half,a.y+17*unit,2*half*clamp(p.hp/p.maxHp),3);
      }
      return;
    }
    symbol(c,cam,p,z,()=>{
      const size=boss?2.65:1;c.scale(size,size);
      if(p.warmup>0)oval(c,0,0,10,7,null,'#ffabad',1);
      for(const d of [-1,1]){
        path(c,[[d*2,-5],[d*9,-9],[d*8,-3],[d*12,4],[d*8,3],[d*5,8],[d*3,5]],'#783756','#eaa1a0',.85);
        path(c,[[d*8,-6],[d*6,-2],[d*9,3]],null,'#ffa9ad',.8);
      }
      path(c,[[0,-7],[5,-2],[4,3],[0,7],[-4,3],[-5,-2]],'#39263f','#fa998e',1.15);
      oval(c,0,-1,2.5,2,'#ffd7a5');oval(c,.25,-1,.78,1.35,'#4a233a');
      if(boss){c.fillStyle='#432640';c.fillRect(-9,10,18,1.5);c.fillStyle='#ffc398';c.fillRect(-9,10,18*clamp(p.hp/p.maxHp),1.5);}
    });
  }
  function snakePoints(s,cam,reduced){
    return (s.snake||[]).map((p,i)=>{
      const prev=s.previousSnake?.[i]||p,z=p.plane??s.plane??0;
      const lerp=s.flight||reduced?1:clamp(s.progress??1);
      let alt=z;
      if(!i&&s.planeShift&&!reduced)alt=cam.level;
      else if((prev.plane??z)!==z)alt=mix(prev.plane,z,lerp);
      return {...project(cam,mix(prev.x,p.x,lerp),mix(prev.y,p.y,lerp),alt),plane:z};
    });
  }
  function serpent(c,s,cam,points,z,headOnly=false){
    const look=s.flight?{x:Math.cos(s.flight.angle),y:Math.sin(s.flight.angle)}:s.direction||{x:1,y:0};
    for(let i=headOnly?0:points.length-1;i>=0;i--){
      const p=points[i];if(p.plane!==z)continue;
      const adjacent=points[i+1];
      const crossing=window.SnakeLocomotion&&adjacent&&p.plane!==adjacent.plane;
      const prev=headOnly||crossing?null:adjacent,unit=p.k*cam.zoom*(p.scale??1);
      if(prev&&window.SnakeSprites)SnakeSprites.link(c,s.year,p,prev,unit);
      else if(prev&&i+1<points.length){
        shape(c,[p,prev],null,'#0a1828',11*unit);
        shape(c,[p,prev],null,'#4ea9ad',7.3*unit);
        shape(c,[p,prev],null,'#c4f8df',1.6*unit);
      }
      if(i===0&&!headOnly)continue;
      const h=s.snake[i];
      const next=i?points[i-1]:project(cam,h.x+look.x,h.y+look.y,z);
      const origin=i?p:project(cam,h.x,h.y,z);
      const angle=p.angle??Math.atan2(next.y-origin.y,next.x-origin.x);
      if(i===0&&s.year===1976)window.SnakePhosphore?.headHalo(c,p,angle,unit);
      if(window.SnakeSprites){
        SnakeSprites.draw(c,i?'body':'head',s.year,{x:p.x,y:p.y,angle,unit,plane:z,time:cam.time,reduced:cam.reduced,viewportWidth:cam.viewportWidth});
        continue;
      }
      c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(unit,unit);
      if(i===0){
        path(c,[[-9,-3],[-6,-7],[0,-6],[8,-3],[12,0],[8,3],[0,6],[-6,7],[-9,3]],'#316f79','#bdfbe7',1.8);
        path(c,[[-4,-5],[2,-4],[6,-2],[0,-2]],'#fff2bd');
        path(c,[[-4,5],[2,4],[6,2],[0,2]],'#fff2bd');
        path(c,[[-7,0],[4,0]],null,'#87e9df',1.25);
      }else{
        path(c,[[-6,-3],[-3,-5],[4,-4],[7,0],[4,4],[-3,5],[-6,3]],'#386775','#8ed9cf',1.3);
        path(c,[[0,-3],[3,0],[0,3]],null,'#c8f5e6',1.2);
      }
      c.restore();
    }
  }
  function flightApproach(c,cam,goal,head,z){
    const dx=goal.x-head.x,dy=goal.y-head.y,distance=Math.hypot(dx,dy);
    if(distance<1.4)return;
    const ux=dx/distance,uy=dy/distance,r=goal.radius||1;
    // Les chevrons sont au sol, centrés sur le vrai disque de passage.
    // Ils restent à l'extérieur du disque et laissent la tête libre à courte distance.
    for(const length of [r+.45,r+1.18]){
      if(length>distance-.45)continue;
      const x=goal.x-ux*length,y=goal.y-uy*length;
      const points=[[x-ux*.28-uy*.34,y-uy*.28+ux*.34],[x,y],
        [x-ux*.28+uy*.34,y-uy*.28-ux*.34]].map(([a,b])=>project(cam,a,b,z));
      shape(c,points,null,'#0e1926',4);shape(c,points,null,'#f7edb3',1.8);
    }
  }
  function gate(c,cam,p,z,t,flight,next=false){
    const center=project(cam,p.x,p.y,z),size=(p.radius||.66)*13*cam.zoom*center.k;
    const color=next?'#9acacc9c':flight?'#ffde98':'#a3f4e1';
    ring(c,cam,p,z,p.radius||.75,color,1.25);
    if(flight){
      const dx=Math.cos(p.heading??Math.PI/2),dy=Math.sin(p.heading??Math.PI/2);
      const edge=project(cam,p.x-dy*(p.radius||.8),p.y+dx*(p.radius||.8),z);
      const span={x:edge.x-center.x,y:edge.y-center.y};
      // La balise reste lisible lorsque l'anneau est presque vu par la tranche.
      if(Math.abs(span.x)<size*.45)span.x=(Math.sign(span.x)||1)*size*.45;
      const arc=Array.from({length:25},(_,i)=>{
        const a=i*Math.PI/24;
        return {x:center.x+span.x*Math.cos(a),y:center.y+span.y*Math.cos(a)-size*1.8*Math.sin(a)};
      });
      shape(c,arc,null,'#253345',4.3);shape(c,arc,null,color,next?1.2:2.8);
    } else oval(c,center.x,center.y-size*.7,size*.75,size,null,color,2);
  }
  function weapons(c,s,cam,z){
    for(const p of s.shots||[])if((p.plane??0)===z){
      const seg=[project(cam,p.x,p.y,z),project(cam,p.toX,p.toY,z)];
      shape(c,seg,null,'#e9ac9755',5);shape(c,seg,null,p.kind==='arc'?'#dac7ff':'#fff0bc',1.55);
    }
    const f=s.forge||{};
    for(const p of [...(s.effects||[]),...(f.effects||[])]){
      if((p.plane??0)!==z)continue;
      const life=clamp(p.life/(p.maxLife||1)),color=p.kind==='nova'?'#e6b6ff':'#ffcf9a';
      c.save();c.globalAlpha*=life;
      if(p.kind==='chain')shape(c,[project(cam,p.x,p.y,z),project(cam,p.toX,p.toY,z)],null,'#b6efff',2.1);
      else ring(c,cam,p,z,Math.max(.13,(p.radius||.9)*(1-life)),color,1.5);
      c.restore();
    }
    for(const p of [...(f.orbits||[]),...(f.projectiles||[])]){
      if((p.plane??0)!==z)continue;
      if(p.kind==='well')ring(c,cam,p,z,p.radius||3.5,'#c6a5e3',1.5);
      symbol(c,cam,p,z,()=>{oval(c,0,0,p.kind==='shard'?2.6:4.1,p.kind==='well'?2.1:3.2,p.kind==='orbit'?'#fff1a0':'#e1beff','#615180',1);});
    }
  }
  const logicalBuffers=new WeakMap();
  function draw(canvas,s,t=0,reduced=false,method='direct'){
    if(!canvas||!s)return;
    if(!s.snake)return window.SnakeRendu?.draw(canvas,s,t,reduced);
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.round((canvas.clientWidth||W)*dpr),h=Math.round((canvas.clientHeight||H)*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    let surface=canvas;
    if(window.SnakeMondes?.formats?.[s.year]&&(s.year===1985||s.year===2185)){
      surface=logicalBuffers.get(canvas);
      if(!surface){
        surface=document.createElement('canvas');
        surface.getContext('2d',{willReadFrequently:true});
        logicalBuffers.set(canvas,surface);
      }
      const lw=Math.min(w,SnakeMondes.formats[s.year].width),lh=Math.max(1,Math.round(lw*h/w));
      if(surface.width!==lw)surface.width=lw;
      if(surface.height!==lh)surface.height=lh;
    }
    const c=surface.getContext('2d');c.setTransform(surface.width/W,0,0,surface.height/H,0,0);c.lineJoin='round';c.lineCap='round';
    const time=reduced?0:t,cam=camera(s,time,reduced);
    cam.year=s.year;cam.viewportWidth=canvas.clientWidth||W;cam.reduced=reduced;cam.time=time;cam.nearBoss=s.boss?1:(s.nearBoss||0);
    if(!window.SnakeMatieres?.draw(c,s.year,time,cam,reduced)){
      if(window.SnakeMondes)window.SnakeMondes.draw(c,s.year,time,cam,reduced);
      else world(c,s,time,cam);
    }
    window.SnakeMondeVivant?.draw(c,s,cam,time,reduced);
    if(cam.music)SnakeImpact.skyline(c,cam.music,time,s.year);
    window.SnakePresage?.draw(c,s,cam,reduced);
    const projected=snakePoints(s,cam,reduced);
    const locomotion=window.SnakeLocomotion;
    const points=locomotion?.transform(s,cam,projected,time,reduced,project,'joint')??projected;
    for(let z=0;z<=1;z++){
      if(z)for(const x of [-.5,35.5])for(const y of [-.5,8.5,17.5]){
        shape(c,[project(cam,x,y,0),project(cam,x,y,1)],null,'#7491a779',2.5);
      }
      const selected=z===(s.plane||0);floorGrid(c,cam,z,selected,method);
      c.save();c.globalAlpha=selected?1:.47;
      window.SnakeMarquage?.drawDepth?.(c,s,cam,z,project);
      window.SnakeVirages?.draw(c,s,cam,z,project);
      if(window.SnakeArtillerie)SnakeArtillerie.draw(c,s,cam,z,time,reduced,project);
      else weapons(c,s,cam,z);
      window.SnakeBouche?.draw(c,s,cam,z,reduced,project);
      window.SnakeSurchargeFX?.draw(c,s,cam,z,time,reduced,project);
      if(s.year===2985&&s.boss?.kind==='final')window.SnakeSingularite?.draw(c,s,cam,z,time,reduced,project);
      if(s.year!==1976||!window.SnakePhosphore){
        if(s.ecologie?.wave)mask(c,cam,s.ecologie.wave,z);
        if(s.boss?.attack)mask(c,cam,s.boss.attack,z);
      }
      if(s.shiftMode==='portal')for(const p of s.planeGates||[])gate(c,cam,p,z,time,false,true);
      if(s.rift&&(s.rift.plane??0)===z)gate(c,cam,s.rift,z,time,false);
      if(s.flightGate&&(s.flightGate.plane??s.plane??0)===z)gate(c,cam,s.flightGate,z,time,true);
      if(s.flight&&z===(s.plane||0)){
        const rings=s.flight.rings||[],idx=s.flight.passed||0;
        if(rings[idx+1])gate(c,cam,rings[idx+1],z,time,true,true);
        if(rings[idx]){
          flightApproach(c,cam,rings[idx],s.snake[0],z);
          gate(c,cam,rings[idx],z,time,true);
        }
      }
      for(const p of s.cells||[])if((p.plane??0)===z)cell(c,cam,p,z);
      for(const p of s.drones||[])if((p.plane??0)===z)sentinel(c,cam,p,z,time,false);
      if(s.boss&&(s.boss.plane??0)===z)sentinel(c,cam,s.boss,z,time,true);
      if(s.year===1976&&!selected)window.SnakePhosphore?.draw(c,s,cam,project,z);
      if(s.year!==1976||!selected)window.SnakeIndices?.draw(c,s,cam,z,selected);
      locomotion?.overlay(c,s,cam,points,z,time,reduced,project,'links');
      serpent(c,s,cam,points,z);
      locomotion?.overlay(c,s,cam,points,z,time,reduced,project,'pulse');
      c.restore();
    }
    if(window.SnakeKnot)SnakeKnot.draw(c,s,(p,z)=>project(cam,p.x,p.y,z));
    window.SnakeSurf?.draw(surface,s,reduced);
    if(s.year===1976){
      window.SnakePhosphore?.draw(c,s,cam,project,s.plane??0);
      c.save();
      if(s.boss?.attack||s.ecologie?.wave)c.globalAlpha=.48;
      window.SnakeIndices?.draw(c,s,cam,s.plane??0,true);c.restore();
    }
    window.SnakeArchives?.draw(surface,s,reduced);
    window.SnakeMarquage?.drawDiscovery(c,s,cam,project);
    if(points.length)serpent(c,s,cam,points,points[0].plane,true);
    window.SnakeMondes?.finish?.(surface,s.year,canvas);
  }
  window.SnakeSpectacle=Object.freeze({draw,camera,project,tile,width:W,height:H});
})();

;
(() => {
  'use strict';
  // A second finger does not generate a compatibility click on every mobile browser.
  function bind(button,activate) {
    let secondary=null, handled=null;
    const finish=()=>{secondary=null;};
    button.addEventListener('pointerdown',e=>{
      handled=null;
      if(e.pointerType==='touch'&&!e.isPrimary&&!secondary)secondary={id:e.pointerId,x:e.clientX,y:e.clientY,canceled:false};
    });
    button.addEventListener('pointermove',e=>{
      if(secondary?.id===e.pointerId && Math.hypot(e.clientX-secondary.x,e.clientY-secondary.y)>14)secondary.canceled=true;
    });
    button.addEventListener('pointercancel',e=>{if(secondary?.id===e.pointerId)finish();});
    button.addEventListener('lostpointercapture',e=>{if(secondary?.id===e.pointerId)finish();});
    button.addEventListener('pointerup',e=>{
      if(secondary?.id!==e.pointerId)return;
      const first=secondary;finish();
      const r=button.getBoundingClientRect();
      const valid=!first.canceled && Math.hypot(e.clientX-first.x,e.clientY-first.y)<=14
        && e.clientX>=r.left-6 && e.clientX<=r.right+6 && e.clientY>=r.top-6 && e.clientY<=r.bottom+6;
      // Suppress the matching native compatibility click even when the gesture was canceled.
      handled={t:e.timeStamp};if(valid&&!button.disabled)activate(e);
    });
    button.addEventListener('click',e=>{
      const duplicate=handled && e.detail>0 && e.timeStamp-handled.t>=0 && e.timeStamp-handled.t<800;
      handled=null;if(!duplicate&&!button.disabled)activate(e);
    });
  }
  const api={bind};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeGestes=api;
})();

;
(function () {
  'use strict';
  // Independent of rendering. Coordinates are CSS pixels, time is monotonic ms.
  function createInput(emit, {mode = 'stick', flying = false, angle = 0} = {}) {
    let left, right;
    function route(e) {
      const {phase, id, x, y, t, zone} = e;
      if (phase === 'down') {
        if (zone === 'pilot' && !left) left = {id, x, y, angle};
        else if (['plane','nova'].includes(zone) && !right) right = {id, x, y, t, zone};
        return;
      }
      if (right && right.id === id) {
        const action = right;
        if (Math.hypot(x-action.x,y-action.y)>14 || zone !== action.zone) action.canceled = true;
        if (phase === 'up' && !action.canceled && (action.zone === 'plane' || t-action.t >= 280))
          emit({type:action.zone, t});
        if (phase === 'up' || phase === 'cancel') right = null;
        return;
      }
      if (!left || left.id !== id) return;
      if (phase === 'up' || phase === 'cancel') { left = null; return; }
      const dx = x-left.x, dy = y-left.y;
      const radius = Math.hypot(dx,dy);
      if (flying) {
        if (mode === 'stick' && radius < 8 || mode === 'swipe' && Math.abs(dx)<2) return;
        angle = mode === 'stick' ? Math.atan2(dy,dx) : left.angle + dx*Math.PI/66;
        emit({type:'aim', angle, t});
      } else {
        const threshold = mode === 'stick' ? 12 : 18;
        if (radius < threshold) { if (mode==='stick' && radius<7) left.last = null; return; }
        if (Math.abs(Math.abs(dx)-Math.abs(dy)) < radius*.15) return;
        const h = Math.abs(dx)>Math.abs(dy);
        const vx = h ? Math.sign(dx) : 0, vy = h ? 0 : Math.sign(dy);
        const key = vx+','+vy;
        if (left.last !== key) emit({type:'turn',x:vx,y:vy,t});
        left.last = key;
        if (mode === 'swipe') { left.x=x; left.y=y; }
      }
    }
    return {route, reset(){left=right=null;}, configure(options) {
      left=right=null; mode=options.mode??mode; flying=options.flying??flying; angle=options.angle??angle;
    }};
  }
  // The engine consumes one accepted turn on each grid boundary.
  function createTurnBuffer() {
    const queue=[];
    return {
      offer(direction,next) {
        const previous=queue.at(-1)||direction;
        if(queue.length===2 || Math.abs(next.x)+Math.abs(next.y)!==1 ||
          !Number.isInteger(next.x) || !Number.isInteger(next.y) ||
          previous.x*next.x+previous.y*next.y!==0) return false;
        queue.push({x:next.x,y:next.y});
        return true;
      },
      step(direction){return queue.shift()||direction;},
      reset(){queue.length=0;}
    };
  }
  const api = {createInput,createTurnBuffer};
  if (typeof module !== 'undefined') module.exports=api;
  if (typeof window !== 'undefined') window.LabControls=api;
})();

;
(() => {
  'use strict';

  const prefix = 'snake2985.hall.tentative.';
  const nameKey = 'snake2985.hall.pilote';
  const attempts = new Map();
  const defaultName = 'PILOTE';
  const displayLimit = 25;
  const numberFormat = new Intl.NumberFormat('fr-FR');
  const labels = { dead: 'défaite', cleared: 'époque franchie', won: 'voyage achevé' };
  let name = defaultName;
  let filterControl;

  function cleanName(value) {
    return Array.from(String(value || '').normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim())
      .slice(0, 20).join('') || defaultName;
  }

  function validated(row) {
    if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 180) return null;
    const year = Number(row.year), difficulty = Number(row.difficulty), score = Number(row.score);
    if (!Number.isInteger(year) || year <= 0 || !Number.isInteger(difficulty)
      || difficulty < 1 || difficulty > 10 || !Number.isSafeInteger(score) || score < 0) return null;
    const status = Object.hasOwn(labels, row.status) ? row.status : (row.cleared ? 'cleared' : 'dead');
    const endedAt = Number.isFinite(row.endedAt) ? row.endedAt : Date.now();
    return { id: row.id, year, difficulty, score, status, cleared: status !== 'dead',
      name: cleanName(row.name), endedAt };
  }

  function loadAttempt(key, json) {
    try {
      const row = validated(JSON.parse(json));
      if (row && key === prefix + row.id) attempts.set(row.id, row);
    } catch { /* Les autres scores restent lisibles. */ }
  }

  try {
    name = cleanName(localStorage.getItem(nameKey));
    for (let n = 0; n < localStorage.length; n++) {
      const key = localStorage.key(n);
      if (key && key.startsWith(prefix)) loadAttempt(key, localStorage.getItem(key));
    }
  } catch { /* Le classement fonctionne en mémoire quand le stockage est inaccessible. */ }

  function persist(key, value) {
    try { localStorage.setItem(key, value); } catch { /* La copie en mémoire reste disponible. */ }
  }

  function record(input) {
    if (!input) return null;
    const existing = attempts.get(input.id);
    if (existing) return { ...existing };
    const row = validated({ ...input, name: input.name || name });
    if (!row) return null;
    attempts.set(row.id, row);
    persist(prefix + row.id, JSON.stringify(row));
    render();
    return { ...row };
  }

  function setName(id, value) {
    name = cleanName(value);
    persist(nameKey, name);
    const row = attempts.get(id);
    if (row && row.name !== name) {
      row.name = name;
      persist(prefix + row.id, JSON.stringify(row));
      render();
    }
    return name;
  }

  function list(year) {
    return [...attempts.values()]
      .filter(row => !year || row.year === Number(year))
      .sort((a, b) => b.score - a.score || b.difficulty - a.difficulty
        || a.endedAt - b.endedAt || a.id.localeCompare(b.id))
      .map(row => ({ ...row }));
  }

  function populateFilter(select) {
    const years = new Set((window.SnakeArcade?.eras || []).map(era => era.year));
    for (const row of attempts.values()) years.add(row.year);
    const values = ['', ...Array.from(years).sort((a, b) => a - b).map(String)];
    if (select.options.length !== values.length
      || values.some((value, i) => value !== select.options[i].value)) {
      const current = select.value;
      const options = values.map(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value || 'Toutes les époques';
        return option;
      });
      select.replaceChildren(...options);
      select.value = values.includes(current) ? current : '';
    }
    if (filterControl !== select) {
      filterControl?.removeEventListener('change', render);
      filterControl = select;
      select.addEventListener('change', render);
    }
  }

  function render() {
    const body = document.getElementById('classement');
    const select = document.getElementById('filtre-annee');
    const empty = document.getElementById('vide');
    if (!body || !select) return;
    populateFilter(select);
    const rows = list(select.value).slice(0, displayLimit);
    const fragment = document.createDocumentFragment();
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      const level = row.difficulty + '/10' + (row.cleared ? ' ✓' : '');
      [String(i + 1), row.name, String(row.year), level, numberFormat.format(row.score)]
        .forEach((value, column) => {
          const td = document.createElement('td');
          td.textContent = value;
          if (column === 3) {
            td.title = labels[row.status];
            td.setAttribute('aria-label', level + ', ' + labels[row.status]);
          }
          tr.append(td);
        });
      fragment.append(tr);
    });
    body.replaceChildren(fragment);
    if (empty) empty.hidden = rows.length > 0;
  }

  window.addEventListener('storage', event => {
    if (!event.key) { attempts.clear(); name = defaultName; }
    else if (event.key === nameKey) name = cleanName(event.newValue);
    else if (event.key.startsWith(prefix)) {
      if (event.newValue === null) attempts.delete(event.key.slice(prefix.length));
      else loadAttempt(event.key, event.newValue);
    } else return;
    render();
  });

  window.SnakePalmares = Object.freeze({ record, setName, getName: () => name, render, list });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();

;
(() => {
  'use strict';

  const horizon = 12000, maxFrames = 750, scale = 64, stride = 7;
  const eras = [1976,1985,1995,2185,2985];
  const millis = s => Math.round(s.elapsed * 1000);
  function position(s) {
    const p = s.snake[0], prev = s.previousSnake?.[0] ?? p;
    const t = s.flight ? 1 : Math.max(0, Math.min(1, s.progress));
    return {x:prev.x+(p.x-prev.x)*t,y:prev.y+(p.y-prev.y)*t,plane:p.plane ?? 0,flight:!!s.flight};
  }
  function recorder() { return {frames:[], prior:null, next:0}; }
  function capture(r,s) {
    const t = millis(s), p = position(s), previous = r.prior;
    if (previous && t <= previous.t) return;
    const cut = previous && (previous.p.plane !== p.plane || previous.p.flight !== p.flight
      || Math.hypot(previous.p.x-p.x,previous.p.y-p.y)>.42);
    const frame = {t,p,cut:!!cut,score:s.score};
    if (t >= r.next || cut || s.status==='dead') {
      if (cut && r.frames.at(-1)?.t < previous.t) r.frames.push(previous);
      r.frames.push(frame);
      r.next=t+30;
    }
    r.prior=frame;
    while (r.frames.length>maxFrames || (r.frames.length && r.frames[0].t<t-horizon)) r.frames.shift();
  }
  function finish(r,s) {
    capture(r,s);
    if (s.status!=='dead' || !r.frames.length) return null;
    const frames=r.frames, first=frames[0], data=new Uint8Array(frames.length*stride), view=new DataView(data.buffer);
    for (let i=0;i<frames.length;i++) {
      const {p,t,cut}=frames[i], off=i*stride;
      view.setUint16(off,t-first.t);
      view.setInt16(off+2,Math.round(p.x*scale));
      view.setInt16(off+4,Math.round(p.y*scale));
      view.setUint8(off+6,p.plane | (+p.flight<<1) | (+cut<<2));
    }
    return {v:1,year:s.year,width:s.width,height:s.height,score:s.score,elapsed:millis(s),
      start:first.t,startScore:first.score,bytes:btoa(String.fromCharCode(...data))};
  }
  function open(record) {
    if (!record || record.v!==1 || !eras.includes(record.year) || record.width!==36 || record.height!==18
      || ![record.score,record.elapsed,record.start,record.startScore].every(v=>Number.isSafeInteger(v)&&v>=0)
      || record.startScore>record.score || typeof record.bytes!=='string'
      || record.bytes.length>Math.ceil(maxFrames*stride/3)*4) return null;
    let binary;
    try { binary=atob(record.bytes); } catch { return null; }
    if (!binary.length || binary.length%stride || binary.length>stride*maxFrames) return null;
    const view=new DataView(Uint8Array.from(binary,c=>c.charCodeAt(0)).buffer), frames=[];
    for (let off=0;off<binary.length;off+=stride) {
      const t=view.getUint16(off),x=view.getInt16(off+2)/scale,y=view.getInt16(off+4)/scale,
        bits=view.getUint8(off+6);
      if (bits>7 || t>horizon || (frames.length?t<=frames.at(-1).t:t!==0)
        || x<-.5 || x>record.width-.5 || y<-.5 || y>record.height-.5) return null;
      frames.push({t,x,y,plane:bits&1,flight:!!(bits&2),cut:!!(bits&4)});
    }
    const duration=frames.at(-1).t;
    return record.start+duration===record.elapsed?{...record,frames,duration}:null;
  }
  // Random access permits an instant replay or scrub without replaying the other era's enemies.
  function ghost(clip,t) {
    if (!clip || !Number.isFinite(t) || t<0 || t>clip.duration) return null;
    const frames=clip.frames;
    let lo=0,hi=frames.length-1;
    while (lo<hi) {
      const mid=Math.ceil((lo+hi)/2);
      if (frames[mid].t<=t) lo=mid;
      else hi=mid-1;
    }
    const a=frames[lo],b=frames[lo+1];
    const k=b&&!b.cut?(t-a.t)/(b.t-a.t):0;
    return {x:a.x+(b?b.x-a.x:0)*k,y:a.y+(b?b.y-a.y:0)*k,plane:a.plane,flight:a.flight};
  }
  // The renderer supplies its own perspective. Do not bridge a portal or join different planes.
  function draw(ctx,clip,t,project,plane) {
    const head=ghost(clip,t);
    if (!head || head.plane!==plane) return;
    ctx.save();
    ctx.lineWidth=1.5;
    ctx.strokeStyle='#a9edff';
    ctx.fillStyle='#e4faff';
    ctx.setLineDash([3,4]);
    ctx.beginPath();
    let prev=null;
    const start=Math.max(0,t-800);
    for (let now=start;;now=Math.min(t,now+40)) {
      const p=ghost(clip,now), screen=project(p);
      if (p.plane===plane) {
        const cut=prev && clip.frames.some(f=>f.cut && f.t>prev.time && f.t<=now);
        if (prev && !cut) ctx.lineTo(screen.x,screen.y);
        else ctx.moveTo(screen.x,screen.y);
        prev={time:now};
      } else prev=null;
      if (now===t) break;
    }
    ctx.stroke();
    const h=project(head);
    ctx.beginPath();
    ctx.arc(h.x,h.y,3.5,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  function futureYears(year) { return eras.includes(year)?eras.filter(y=>y>year):[]; }

  // The original v2 trace timestamps grid positions in centiseconds; it has no charge or score history.
  function oldClip(rec,year) {
    if (!rec || rec.year!==year || rec.width!==36 || rec.height!==18 || !Number.isSafeInteger(rec.score)
      || rec.score<0 || !Number.isSafeInteger(rec.until) || rec.until<0 || rec.until>Number.MAX_SAFE_INTEGER/10
      || !Array.isArray(rec.path) || rec.path.length<6 || rec.path.length>6000 || rec.path.length%3) return null;
    const trace=[];
    for (let i=0;i<rec.path.length;i+=3) {
      const [t,x,y]=rec.path.slice(i,i+3);
      if (![t,x,y].every(Number.isSafeInteger) || t<0 || t>rec.until || (i && t*10<=trace.at(-1).t)
        || x<0 || x>=36 || y<0 || y>=18) return null;
      trace.push({t:t*10,x,y,plane:0,flight:false,cut:false});
    }
    const elapsed=rec.until*10,start=Math.max(trace[0].t,elapsed-horizon),duration=elapsed-start;
    const full={frames:trace,duration:elapsed};
    const frames=[];
    // Preserve legacy corners exactly up to the hard cap. A dense archive is sampled at 60 Hz.
    const knots=trace.filter(p=>p.t>start && p.t<elapsed).map(p=>p.t);
    const times=knots.length+2<=maxFrames?[start,...knots,elapsed]:
      Array.from({length:maxFrames},(_,i)=>Math.round(start+duration*i/(maxFrames-1)));
    for(const t of times) {
      if(frames.at(-1)?.t===t-start) continue;
      frames.push({...ghost(full,t),t:t-start,cut:false});
    }
    return {legacy:true,year,width:36,height:18,score:rec.score,startScore:0,start,elapsed,duration,frames};
  }

  function archive(storage) {
    const key=year=>'snake2985.chrono.v1.36x18.'+year;
    function read(k) {
      try {return JSON.parse(storage.getItem(k));} catch {return null;}
    }
    return {
      save(record) {
        if (!open(record)) return false;
        try {storage.setItem(key(record.year),JSON.stringify(record));return true;} catch {return false;}
      },
      load(year) {
        if(!eras.includes(year)) return null;
        const recent=open(read(key(year)));
        return recent?.year===year?recent:oldClip(read('snake2985.echo.v2.36x18.'+year),year);
      },
    };
  }
  function challenge(clip,state,model='poursuite') {
    if (!clip || !eras.includes(state.year) || !eras.includes(clip.year) || state.year<=clip.year || state.score!==0 || state.elapsed!==0
      || !['chrono','poursuite'].includes(model)) return null;
    return {model,target:clip.score,deadline:clip.elapsed,sprint:clip.duration,segmentGain:clip.score-clip.startScore,
      status:'en cours',bet:clip.legacy?'historique':'disponible',sprintGain:0};
  }
  function wager(c,s) {
    if (!c || c.model!=='poursuite' || c.bet!=='disponible' || c.status!=='en cours' || s.status!=='playing'
      || s.novaCharge<.25 || millis(s)>Math.min(2000,c.sprint/2)) return false;
    s.novaCharge-=.25;
    c.bet='engagé';
    return true;
  }
  function update(c,s) {
    if (!c) return;
    const t=millis(s);
    if (c.bet==='disponible' && (t>Math.min(2000,c.sprint/2) || s.status==='dead')) c.bet='clos';
    if (c.bet==='engagé') {
      if (t<=c.sprint) c.sprintGain=s.score;
      if (c.sprintGain>c.segmentGain) {
        c.bet='gagné';
        s.novaCharge=Math.min(1,s.novaCharge+.60);
      } else if (t>=c.sprint || ['dead','cleared','won'].includes(s.status)) c.bet='perdu';
    }
    if (c.status!=='en cours') return;
    if (c.model==='chrono' && t>c.deadline) c.status='temps écoulé';
    else if (s.score>c.target) c.status='record battu';
    else if (s.status==='dead' || s.status==='won' || s.status==='cleared') c.status='terminé';
  }
  const api={recorder,capture,finish,open,ghost,draw,archive,futureYears,challenge,wager,update,position};
  if (typeof module!=='undefined') module.exports=api;
  else window.SnakeChrono=api;
})();

;
(function(){
  'use strict';
  const chronology=[
    {year:1976,bits:2,place:'Le Terminal'},
    {year:1985,bits:4,place:'Le Circuit néon'},
    {year:1995,bits:8,place:'La Gare de verre'},
    {year:2185,bits:16,place:'La Ceinture orbitale'},
    {year:2985,bits:32,place:'Le Cœur galactique'}
  ];
  const base=typeof document!=='undefined' && document.currentScript?.src?new URL('.',document.currentScript.src).href:'';
  const fmt=new Intl.NumberFormat('fr-FR');
  function destinations(year,status){
    const i=chronology.findIndex(e=>e.year===+year);
    if(i<0||!['dead','cleared','won'].includes(status))throw new RangeError('Fin de partie ou année inconnue.');
    const cycle=i===chronology.length-1;
    return (cycle?chronology.slice(0,1):chronology.slice(i+1,status==='dead'?undefined:i+2)).map(e=>({...e,cycle}));
  }
  function mount(host,summary,actions={},options={}){
    const choices=destinations(summary.year,summary.status);
    let index=0,committed=false,disposed=false;
    const doc=host.ownerDocument,variant=options.variant==='wheel'?'wheel':'cards';
    const duration=Math.max(0,Math.min(2000,Number(summary.durationMs)||0));
    const score=Math.max(0,Math.floor(Number(summary.score)||0));
    const best=year=>Math.max(0,Math.floor(Number(summary.records?.[year])||0));
    function tag(parent,name,cls,label){
      const el=doc.createElement(name);
      if(cls)el.className=cls;if(label!==undefined)el.textContent=label;parent.append(el);return el;
    }
    function button(parent,cls,label,fn){
      const el=tag(parent,'button',cls,label);el.type='button';el.addEventListener('click',fn);return el;
    }
    const root=tag(host,'section','bf bf-'+variant);
    root.setAttribute('aria-label','Bilan et saut temporel');
    const info=tag(root,'section','bf-report');
    const dead=summary.status==='dead';
    tag(info,'h2','bf-outcome',(dead?'Défaite':'Victoire')+' · '+summary.year);
    const points=tag(info,'p','bf-score',fmt.format(score));tag(points,'span','',' pts');
    tag(info,'p','bf-record','Record '+fmt.format(best(summary.year))+' pts');
    if(summary.boss)tag(info,'p','bf-boss',(dead?'Gardien · ':'Vaincu · ')+String(summary.boss));
    if(summary.cause && dead)tag(info,'p','bf-cause',String(summary.cause));
    const film=duration&&typeof summary.drawReview==='function'?tag(info,'canvas','bf-film'):null;
    if(film){film.width=320;film.height=60;film.setAttribute('aria-label','Trajectoire observée avant l’impact');summary.drawReview(film);}
    const review=button(info,'bf-review',duration?'Revoir '+fmt.format(duration/1000)+' s':'Reprise indisponible',()=>{
      if(!committed&&duration)actions.onReview?.({year:+summary.year,durationMs:duration,canvas:film});
    });
    review.disabled=duration===0;
    const retry=button(info,'bf-retry','Rejouer '+summary.year,()=>commit('retry'));
    retry.title='Retente cette époque avec les mêmes placements de départ.';
    const choose=tag(root,'section','bf-choice');
    tag(choose,'h2','bf-title',choices[0].cycle?'Nouveau cycle':dead?'Choisir le prochain saut':'Prochaine époque');
    const visual=variant==='wheel'?tag(choose,'div','bf-panorama'):null;
    const hero=visual?tag(visual,'img','bf-hero'):null;
    if(hero)hero.alt='';
    const caption=visual?tag(visual,'p','bf-caption'):null;
    const list=tag(choose,'div','bf-options');list.setAttribute('role','radiogroup');list.setAttribute('aria-label','Destination');
    const image=year=>(options.assetBase??base)+'paysage-'+year+'.webp';
    const radios=choices.map((item,i)=>{
      const b=button(list,'bf-stop','',()=>select(i));
      b.setAttribute('role','radio');
      const label=item.year+', '+item.bits+' bits, '+item.place+', record '+fmt.format(best(item.year))+' points';
      b.setAttribute('aria-label',label);
      if(variant==='cards'){
        const img=tag(b,'img','bf-strip');img.src=image(item.year);img.alt='';
      }
      const text=tag(b,'span','bf-cardtext');
      tag(text,'strong','bf-date',String(item.year));
      if(variant==='cards'){
        tag(text,'span','bf-bits',item.bits+' bits');
        tag(text,'span','bf-cardrecord','Record '+fmt.format(best(item.year)));
      }
      b.addEventListener('keydown',event=>{
        const n=radios.length;
        const indices={ArrowLeft:(i+n-1)%n,ArrowUp:(i+n-1)%n,ArrowRight:(i+1)%n,ArrowDown:(i+1)%n,Home:0,End:n-1};
        if(Object.hasOwn(indices,event.key)){
          event.preventDefault();select(indices[event.key]);radios[index].focus();
        }
      });
      return b;
    });
    const launch=button(choose,'bf-launch','',()=>commit('jump'));
    function commit(which){
      if(committed||disposed)return;
      const handler=which==='retry'?actions.onRetry:actions.onJump;
      if(typeof handler!=='function')return;
      committed=true;
      for(const b of [launch,retry,review,...radios])b.disabled=true;
      if(which==='retry')handler({year:+summary.year,cycle:false});else handler({...choices[index]});
    }
    function select(i){
      if(disposed||committed)return;
      index=i;
      radios.forEach((b,n)=>{b.tabIndex=n===i?0:-1;b.setAttribute('aria-checked',String(n===i));});
      const current=choices[i];
      if(hero){hero.src=image(current.year);caption.textContent=current.place+' · '+current.bits+' bits · Record '+fmt.format(best(current.year));}
      launch.textContent=current.cycle?'Repartir en '+current.year:'Sauter en '+current.year;
    }
    if(visual && choices.length>1){
      let drag=null,accum=0,lastWheel=-Infinity;
      visual.addEventListener('pointerdown',event=>{
        if(!event.isPrimary || event.button!==0)return;
        drag={id:event.pointerId,x:event.clientX};
        visual.setPointerCapture?.(event.pointerId);
      });
      visual.addEventListener('pointerup',event=>{
        if(drag?.id!==event.pointerId)return;
        const dx=event.clientX-drag.x;drag=null;
        if(Math.abs(dx)>=32)select(Math.max(0,Math.min(choices.length-1,index-Math.sign(dx))));
      });
      for(const phase of ['pointercancel','lostpointercapture'])visual.addEventListener(phase,()=>{drag=null;});
      visual.addEventListener('wheel',event=>{
        const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
        if(!delta)return;
        event.preventDefault();
        if(event.timeStamp-lastWheel>180 || Math.sign(accum)!==Math.sign(delta))accum=0;
        lastWheel=event.timeStamp;accum+=delta*(event.deltaMode===1?16:event.deltaMode===2?80:1);
        if(Math.abs(accum)>=42){select(Math.max(0,Math.min(choices.length-1,index+Math.sign(accum))));accum=0;}
      },{passive:false});
    }
    root.dataset.count=String(choices.length);
    select(0);
    return {root,focus:()=>radios[index].focus(),destroy(){disposed=true;root.remove();}};
  }
  const api=Object.freeze({destinations,mount});
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeBifurcation=api;
})();

;
(() => {
  'use strict';
  const width=960,height=520;
  const titles={1976:'Ticket thermique',1985:'Crédit néon',1995:'Billet de la Gare de verre',2185:'Accréditation orbitale',2985:'Passe de la Singularité'};
  const base=typeof document==='undefined'?null:document.currentScript?.src||document.baseURI;
  const fmt=new Intl.NumberFormat('fr-FR');
  function draw(c,row,img,sprites){
    const year=Number(row.year);
    if(!titles[year])throw new RangeError('Époque inconnue');
    const name=row.name||'PILOTE',score=fmt.format(row.score),level='CRAN '+row.difficulty+' / 10',metrics=[];
    const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
    function path(points,col,fill=false,weight=2){
      c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      if(fill){c.closePath();c.fillStyle=col;c.fill();}else{c.lineWidth=weight;c.strokeStyle=col;c.stroke();}
    }
    function type(str,x,y,w,size,color,face='sans-serif',weight=700){
      face={'sans-serif':'Arial, sans-serif',serif:'Georgia, serif',monospace:'"Courier New", monospace'}[face]||face;
      let px=size;c.font=weight+' '+px+'px '+face;
      while(c.measureText(str).width>w-6&&px>12){px--;c.font=weight+' '+px+'px '+face;}
      c.textBaseline='alphabetic';c.fillStyle=color;c.fillText(str,x,y);
      const m=c.measureText(str);
      metrics.push({str,x,y,w,size:px,left:x-m.actualBoundingBoxLeft,right:x+m.actualBoundingBoxRight,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});
    }
    function art(x,y,w,h){
      const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale;
      c.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);
    }
    const emblem=(role,x,y,unit)=>sprites.draw(c,role,year,{x,y,unit,viewportWidth:960,reduced:true,kind:'final'});
    c.save();
    if(year===1976){
      const ink='#233a27',paper='#def0c8';
      rect(0,0,960,520,'#17241d');rect(30,13,900,494,paper);
      for(let x=30;x<930;x+=20)path([[x,507],[x+10,497],[x+20,507]],'#17241d',true);
      type('SNAKE / 1976',61,62,440,33,ink,'monospace');
      type('TICKET THERMIQUE',592,58,305,24,ink,'monospace');
      art(60,84,840,123);for(let y=86;y<207;y+=5)rect(60,y,840,1,'#132d1950');
      type(name,61,264,800,40,ink,'monospace');type('POINTS',61,324,180,23,ink,'monospace');
      type(score,59,402,823,78,ink,'monospace');
      for(let x=60;x<900;x+=18)rect(x,429,10,2,ink);
      type(level,61,472,340,25,ink,'monospace');emblem('head',858,458,2.9);
    }else if(year===1985){
      rect(0,0,960,520,'#130e2d');art(345,0,615,210);
      path([[0,0],[426,0],[305,217],[0,217]],'#130e2d',true);
      for(let i=0;i<3;i++)path([[456+i*18,0],[332+i*18,218],[960,218]],['#ff60af','#fcaa87','#57e3ed'][i],false,4);
      type('1985',43,108,300,93,'#ff77be');type('CRÉDIT NÉON',48,163,294,30,'#83f6fe');
      type(score,43,358,863,96,'#fff3fb');type('POINTS',49,262,260,23,'#ff77be','monospace');
      rect(48,390,864,2,'#ca76c7');type(name,48,445,650,39,'#b8ffff');type(level,692,446,220,24,'#ffb9e4','monospace');
      emblem('head',879,104,3.6);
    }else if(year===1995){
      rect(0,0,960,520,'#f5db9c');rect(677,0,283,520,'#272238');
      type('Gare de verre',40,85,625,64,'#35283e','serif');type('BILLET DE PASSAGE',44,125,580,22,'#503849','monospace');
      art(41,151,593,116);type(name,41,332,595,39,'#282239');
      type(score,40,423,597,62,'#282239');type('POINTS',45,467,330,22,'#503849','monospace');
      for(let y=8;y<520;y+=20)rect(661,y,2,10,'#785f68');
      type('1995',702,94,239,64,'#ffcb82');type(level,705,159,225,24,'#ffe2a7','monospace');
      emblem('boss',817,267,3.15);
      for(let i=0,x=705;x<922;i++){const w=[2,4,1,3,5,2,1][i%7];rect(x,365,w,77,'#fcdf9e');x+=w+3;}
    }else if(year===2185){
      rect(0,0,960,520,'#d8e8e8');rect(0,0,960,86,'#173541');
      type('ACCRÉDITATION ORBITALE',42,56,675,32,'#e3fffb');type('2185',779,62,150,47,'#a8e8e6');
      c.save();c.beginPath();c.arc(155,223,112,0,Math.PI*2);c.clip();art(41,109,228,228);c.restore();
      c.strokeStyle='#287074';c.lineWidth=5;c.beginPath();c.arc(155,223,114,0,Math.PI*2);c.stroke();emblem('head',155,225,3.2);
      type('PILOTE ACCRÉDITÉ',303,158,600,23,'#315858','monospace');type(name,300,233,615,46,'#112e39');
      type(level,304,309,550,30,'#23545a','monospace');
      rect(31,361,898,128,'#173541');type('POINTS',54,405,240,24,'#a8e8e6','monospace');
      type(score,51,464,850,66,'#ecfffa');
    }else{
      rect(0,0,960,520,'#100d24');
      c.save();c.beginPath();c.moveTo(447,0);c.lineTo(960,0);c.lineTo(960,520);c.lineTo(670,520);c.closePath();c.clip();art(442,0,518,520);c.restore();
      path([[448,0],[670,520]],'#cfb0ff',false,3);
      type('2985',40,99,410,82,'#ead9ff','serif');type('PASSE DE LA',46,150,395,25,'#d3a8ff');
      type('Singularité',40,222,459,65,'#fff0ff','serif');
      rect(31,251,897,117,'#241b38');type('POINTS',48,282,200,20,'#dbc0fa','monospace');type(score,46,350,854,72,'#fff1ff');
      rect(31,383,897,101,'#171126');type(name,47,448,632,43,'#f7eaff');type(level,709,448,210,24,'#dbc0fa','monospace');
      emblem('boss',776,135,3.6);
    }
    c.restore();return metrics;
  }
  const compatible=r=>r&&Object.hasOwn(titles,r.year)&&Number.isSafeInteger(r.score)&&r.score>=0&&Number.isInteger(r.difficulty);
  async function open(row,trigger){
    if(!compatible(row))return;
    const dialog=document.createElement('dialog');dialog.className='snake-archives snake-cartouche';
    const heading=document.createElement('h2');heading.id='cartouche-titre';heading.textContent=titles[row.year];
    dialog.setAttribute('aria-labelledby',heading.id);
    const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>dialog.close();
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    const header=document.createElement('header');header.append(heading,close);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',titles[row.year]+' · '+row.year+' · '+row.name+' · cran '+row.difficulty+' · '+fmt.format(row.score)+' points.');
    const download=document.createElement('a');download.textContent='Télécharger le PNG';download.hidden=true;
    const message=document.createElement('p');message.setAttribute('role','status');message.textContent='Préparation de la carte…';
    let url=null,closed=false;
    dialog.addEventListener('close',()=>{closed=true;if(url)URL.revokeObjectURL(url);dialog.remove();trigger?.focus();},{once:true});
    dialog.append(header,canvas,message,download);document.body.append(dialog);dialog.showModal();close.focus();
    try{
      let img=null;
      if(/^https?:$/.test(location.protocol)){
        const src=new URL('../bifurcation/paysage-'+row.year+'.webp',base);
        if(src.origin===location.origin){
          const image=new Image();image.src=src.href;
          try{await image.decode();img=image;}catch{}
        }
      }
      if(!img){
        img=document.createElement('canvas');img.width=960;img.height=220;
        window.SnakeMondes.draw(img.getContext('2d'),Number(row.year),0,{},true);
      }
      if(closed)return;
      draw(canvas.getContext('2d'),row,img,window.SnakeSprites);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(closed)return;
      if(!blob)throw new Error('PNG');
      url=URL.createObjectURL(blob);download.href=url;download.download='snake-'+row.year+'-'+row.score+'.png';
      download.hidden=false;message.hidden=true;
    }catch{if(!closed)message.textContent='La carte souvenir est indisponible.';}
  }
  const api={draw,open,compatible,width,height};
  if(typeof window!=='undefined')window.SnakeCartouches=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(() => {
  'use strict';
  const chrono=window.SnakeChrono, reprise=window.SnakeReprise, hall=window.SnakePalmares;
  const attempts=new WeakMap(), years=[1976,1985,1995,2185,2985];
  let storage=null;
  try { storage=window.localStorage; } catch { /* La session reste jouable en mémoire. */ }
  const archive=chrono.archive(storage);
  const routeKey='snake2985.chrono.saut.v1';
  let session=null, activeAttempt=null;
  try {session=window.sessionStorage;} catch { /* L’onglet conserve son choix en mémoire. */ }
  function abandon(){
    pending=null;
    if(activeAttempt){activeAttempt.source=null;activeAttempt.rival=null;}
    try{session?.removeItem(routeKey);}catch{}
  }
  function storedRoute(){
    try{
      const raw=session?.getItem(routeKey);
      if(!raw||raw.length>9000)return null;
      const data=JSON.parse(raw);
      if(data?.v!==1||!years.includes(data.year))return null;
      const clip=chrono.open(data.record);
      return clip&&chrono.futureYears(clip.year).includes(data.year)?{year:data.year,record:data.record,clip}:null;
    }catch{return null;}
  }
  function saveRoute(route){
    try{session?.setItem(routeKey,JSON.stringify({v:1,year:route.year,record:route.record}));}catch{}
  }
  function resumeYear(){return storedRoute()?.year??null;}
  let latest=null, pending=null, dialog=null, focusBefore=null, animation=null, sequence=0;
  const fmt=n=>n.toLocaleString('fr-FR');
  const clock=t=>(t/1000).toFixed(2).replace('.',',')+' s';
  const elem=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  function button(parent,text,callback) {
    const b=elem('button',text);b.type='button';b.addEventListener('click',callback);parent.append(b);return b;
  }
  function newRun(s,{resume=false}={}) {
    if(attempts.has(s)) return attempts.get(s).id;
    const route=pending||(resume?storedRoute():null);
    pending=null;
    const source=route&&(route.year===null||route.year===s.year)?route.clip:null;
    const rival=source&&chrono.challenge(source,s);
    if(rival && route.year===null)saveRoute({...route,year:s.year});
    if(!rival)abandon();
    const id=window.crypto?.randomUUID?.() || 'arc-'+Date.now().toString(36)+'-'+(++sequence)+'-'+Math.random().toString(36).slice(2);
    const a={id,source:rival?source:null,rival,rec:chrono.recorder(),review:reprise.create(),row:null,clip:null,record:null};
    attempts.set(s,a);activeAttempt=a;tick(s);return id;
  }
  function tick(s) {
    const a=attempts.get(s);
    if(!a || a.row)return;
    a.review.capture(s,s.elapsed*1000);chrono.capture(a.rec,s);chrono.update(a.rival,s);
  }
  function end(s) {
    const a=attempts.get(s);
    if(!a || !['dead','won','cleared'].includes(s.status))return null;
    if(a.row)return a.row;
    tick(s);
    a.row=hall.record({id:a.id,year:s.year,name:hall.getName(),difficulty:s.difficulty,score:s.score,status:s.status});
    if(s.status==='dead'){
      const encoded=chrono.finish(a.rec,s);
      if(encoded){a.record=encoded;a.clip=chrono.open(encoded);archive.save(encoded);}
    }
    if(a===activeAttempt&&a.source)abandon();
    latest=a;return a.row;
  }
  function jump(s,year=null) {
    const a=s?attempts.get(s):latest;
    abandon();
    if(a?.row?.status!=='dead'||!a.clip||!a.record)return false;
    if(year!==null&&!chrono.futureYears(a.clip.year).includes(year))return false;
    pending={clip:a.clip,record:a.record,year};
    if(year!==null)saveRoute(pending);
    return true;
  }
  function offer(s) {
    const c=attempts.get(s)?.rival;
    if(c?.bet!=='disponible' || c.model!=='poursuite' || s.novaCharge<.25 || s.elapsed*1000>Math.min(2000,c.sprint/2))return '';
    return 'Miser 25 % de nova · dépasser '+fmt(c.segmentGain)+' points en '+clock(c.sprint);
  }
  function wager(s) {return chrono.wager(attempts.get(s)?.rival,s);}
  function label(s) {
    const a=attempts.get(s),c=a?.rival;
    if(!c)return '';
    const record=c.status==='record battu'?'Record de '+a.source.year+' battu':'Score de '+a.source.year+' à battre · '+fmt(c.target);
    const bet={engagé:'Pari · '+fmt(s.score)+' / '+fmt(c.segmentGain+1),gagné:'Pari gagné · nova rechargée',perdu:'Mise perdue'};
    return record+(bet[c.bet]?' · '+bet[c.bet]:'');
  }
  function draw(canvas,s,reduced=false) {
    const source=attempts.get(s)?.source,renderer=window.SnakeSpectacle;
    if(!source || !renderer || s.elapsed*1000>source.duration)return;
    const t=s.elapsed*1000,g=chrono.ghost(source,t),ctx=canvas.getContext('2d');
    if(!g || !ctx)return;
    const cam=renderer.camera(s,reduced?0:s.elapsed,reduced);
    ctx.save();
    ctx.setTransform(canvas.width/renderer.width,0,0,canvas.height/renderer.height,0,0);
    if(g.plane!==s.plane)ctx.globalAlpha=.56;
    chrono.draw(ctx,source,t,p=>renderer.project(cam,p.x,p.y,p.plane),g.plane);
    ctx.restore();
  }
  function stop() {if(animation!==null)cancelAnimationFrame(animation);animation=null;}
  let refreshOpenHall=null,detachReplay=null;
  window.addEventListener('storage',event=>{
    if(dialog?.open && (!event.key || event.key.startsWith('snake2985.hall.tentative.')))refreshOpenHall?.();
  });
  function panel(title) {
    refreshOpenHall=null;detachReplay?.();detachReplay=null;
    stop();
    if(!dialog){
      dialog=elem('dialog');dialog.className='snake-archives';
      dialog.setAttribute('aria-labelledby','archives-titre');
      dialog.addEventListener('close',()=>{stop();detachReplay?.();detachReplay=null;refreshOpenHall=null;focusBefore?.focus?.();});
      dialog.addEventListener('keydown',e=>e.stopPropagation());
      document.body.append(dialog);
    }
    if(!dialog.open)focusBefore=document.activeElement;
    const head=elem('header'),heading=elem('h2',title);heading.id='archives-titre';
    head.append(heading);const close=button(head,'Fermer',()=>dialog.close());
    const body=elem('section');dialog.replaceChildren(head,body);
    if(!dialog.open)dialog.showModal();close.focus();return body;
  }
  function openHall() {
    const body=panel('Palmarès'),bar=elem('div');bar.className='archives-outils';
    const label=elem('label','Époque'),select=elem('select');
    const pageSize=12;
    let page=0,records=[],filtered=[],personal=null,yearOptions='';
    label.append(select);bar.append(label);
    if(latest?.row){
      const form=elem('form'),signature=elem('label','Signature'),input=elem('input');
      input.type='text';input.value=latest.row.name;input.autocomplete='off';input.maxLength=40;
      signature.append(input);form.append(signature);
      const sign=elem('button','Signer');sign.type='submit';form.append(sign);
      const status=elem('output');form.append(status);
      form.addEventListener('submit',e=>{e.preventDefault();
        const signed=hall.setName(latest.id,input.value);latest.row.name=signed;input.value=signed;
        status.textContent='Signé '+signed;refresh();goToAttempt();
      });
      bar.append(form);
    }
    const table=elem('table'),thead=elem('thead'),row=elem('tr'),rows=elem('tbody');
    for(const txt of ['Rang','Pilote','Époque','Cran','Score']){
      const th=elem('th',txt);th.scope='col';row.append(th);
    }
    thead.append(row);table.append(thead,rows);
    const empty=elem('p','Aucune tentative dans cette époque.');
    const summary=elem('p'),nav=elem('nav'),pageInfo=elem('output');
    summary.className='archives-resultat';summary.setAttribute('aria-live','polite');
    nav.className='archives-pages';nav.setAttribute('aria-label','Pages du palmarès');
    const prev=button(nav,'Précédente',()=>{page--;paint();});
    pageInfo.setAttribute('aria-live','polite');nav.append(pageInfo);
    const next=button(nav,'Suivante',()=>{page++;paint();});
    const mine=button(nav,'Voir mon rang',goToAttempt);
    const card=window.SnakeCartouches&&button(nav,'Carte souvenir',()=>window.SnakeCartouches.open(personal,card));
    function goToAttempt(){
      if(!personal)return;
      if(select.value && Number(select.value)!==personal.year)select.value=String(personal.year);
      filter();
      page=Math.floor(filtered.findIndex(r=>r.id===personal.id)/pageSize);paint();
    }
    function filter(){filtered=select.value?records.filter(r=>r.year===Number(select.value)):records;}
    function paint(){
      const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
      page=Math.max(0,Math.min(page,pages-1));
      prev.disabled=page===0;next.disabled=page===pages-1;
      prev.hidden=next.hidden=pages===1;
      pageInfo.textContent=filtered.length?'Page '+fmt(page+1)+' sur '+fmt(pages):'';
      mine.hidden=!personal;
      if(card)card.hidden=!window.SnakeCartouches.compatible(personal);
      empty.hidden=filtered.length>0;table.hidden=!filtered.length;
      const visible=filtered.slice(page*pageSize,(page+1)*pageSize);
      rows.replaceChildren(...visible.map((r,i)=>{
        const tr=elem('tr');
        if(r.id===personal?.id){tr.className='archives-moi';tr.setAttribute('aria-current','true');}
        for(const val of [page*pageSize+i+1,r.name,r.year,r.difficulty+'/10'+(r.cleared?' ✓':''),fmt(r.score)])tr.append(elem('td',String(val)));
        return tr;
      }));
    }
    function refresh(){
      records=hall.list();
      const values=[...new Set([...years,...records.map(r=>r.year)])].sort((a,b)=>a-b);
      if(values.join(',')!==yearOptions){
        const keep=select.value;yearOptions=values.join(',');
        select.replaceChildren(...['',...values].map(year=>{
          const op=elem('option',String(year||'Toutes les époques'));op.value=String(year);return op;
        }));
        select.value=values.includes(Number(keep))?keep:'';
      }
      personal=latest?records.find(r=>r.id===latest.id):records.reduce((last,r)=>!last||r.endedAt>last.endedAt?r:last,null);
      summary.hidden=!personal;
      if(personal){
        const epoch=records.filter(r=>r.year===personal.year),rival=epoch.find(r=>r.id!==personal.id);
        const gap=personal.score-(rival?.score??0);
        const comparison=!rival?'Premier record de cette époque.':gap===0?'Record d’époque égalé.':
          gap>0?'Record d’époque battu de '+fmt(gap)+' pts.':'À '+fmt(-gap)+' pts du record d’époque.';
        summary.textContent='Dernière tentative · '+personal.year+' · '+fmt(personal.score)+' pts. Rang époque '+
          fmt(epoch.indexOf(personal)+1)+' / '+fmt(epoch.length)+' · Rang général '+
          fmt(records.indexOf(personal)+1)+' / '+fmt(records.length)+'. '+comparison;
      }
      filter();paint();
    }
    select.addEventListener('change',()=>{page=0;filter();paint();});
    body.append(bar,summary,nav,table,empty);
    refreshOpenHall=refresh;refresh();

  }
  const masks=reprise.flags;
  function board(canvas,frame,plane,impact) {
    const ctx=canvas.getContext('2d'),n=12;
    ctx.fillStyle=plane?'#15132b':'#0b1c23';ctx.fillRect(0,0,432,216);
    ctx.strokeStyle='#334553';ctx.lineWidth=.6;ctx.beginPath();
    for(let x=0;x<=36;x++){ ctx.moveTo(x*n,0);ctx.lineTo(x*n,216); }
    for(let y=0;y<=18;y++){ctx.moveTo(0,y*n);ctx.lineTo(432,y*n);}
    ctx.stroke();
    const square=(x,y,offset,color)=>{ctx.fillStyle=color;ctx.fillRect(x*n+offset,y*n+offset,n-2*offset,n-2*offset);};
    for(let i=0;i<648;i++){
      const bits=frame.cells[i+plane*648];if(!bits)continue;
      const x=i%36,y=Math.floor(i/36);
      if(bits&masks.warning)square(x,y,0,'#8b6737');
      if(bits&masks.active)square(x,y,0,'#bf3850');
      if(bits&masks.hull)square(x,y,1,'#dd827d');
      if(bits&masks.gate){ctx.strokeStyle='#b2a3ff';ctx.strokeRect(x*n+2,y*n+2,8,8);}
      if(bits&masks.cell)square(x,y,4,'#ffdc79');
      if(bits&masks.body)square(x,y,2,'#71c5aa');
      if(bits&masks.drone)square(x,y,2,'#ff6974');
      if(bits&masks.next){ctx.fillStyle='#f9a683';ctx.fillRect(x*n+5,y*n+2,2,8);ctx.fillRect(x*n+2,y*n+5,8,2);}
    }
    if(frame.plane===plane){ctx.fillStyle='#fbffed';ctx.beginPath();ctx.arc((frame.x+.5)*n,(frame.y+.5)*n,4.7,0,2*Math.PI);ctx.fill();}
    if(impact?.plane===plane){
      const x=Math.max(0,Math.min(35,impact.x)),y=Math.max(0,Math.min(17,impact.y));
      ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.strokeRect(x*n+1,y*n+1,10,10);
    }
  }
  function openReplay(getReduced) {
    if(!latest?.review.death)return false;
    const review=latest.review,{start,end}=review.bounds(),death=review.death;
    const body=panel('Dernière trajectoire'),tip=elem('p',death.cause+' · '+death.tip);
    const views=elem('div');views.className='archives-plans';
    const canvases=[0,1].map(i=>{
      const figure=elem('figure'),caption=elem('figcaption',i?'Plan haut':'Plan bas'),canvas=elem('canvas');
      canvas.width=432;canvas.height=216;canvas.setAttribute('aria-hidden','true');
      figure.append(caption,canvas);views.append(figure);return canvas;
    });
    const slider=elem('input');slider.type='range';slider.min=start;slider.max=end;slider.step='1';slider.value=end;
    slider.setAttribute('aria-label','Instant de la dernière trajectoire');
    const status=elem('output'),controls=elem('div');controls.className='archives-commandes';
    status.setAttribute('aria-live','off');
    let t=end,previous=null;
    const paint=ms=>{
      t=Math.max(start,Math.min(end,ms));slider.value=t;
      const f=review.frameAt(t);
      canvases.forEach((c,i)=>board(c,f,i,t>=end?death:null));
      const when=t>=end?'Impact':clock(end-t)+' avant impact';
      status.textContent=when+' · plan '+(f.plane+1)+' · '+(f.flight?'vol':'grille')+' · case '+(Math.round(f.x)+1)+', '+(Math.round(f.y)+1);
      slider.setAttribute('aria-valuetext',status.textContent);
    };
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced=()=>preference.matches||(typeof getReduced==='function'&&getReduced());
    let play;
    const pause=()=>{stop();previous=null;play.textContent=reduced()?'Image suivante':'Lire';};
    const advance=now=>{
      if(previous!==null)paint(t+Math.max(0,now-previous));previous=now;
      if(t>=end){pause();return;}animation=requestAnimationFrame(advance);
    };
    button(controls,'− 0,25 s',()=>{pause();paint(t-250);});
    play=button(controls,reduced()?'Image suivante':'Lire',()=>{
      if(reduced()){
        if(t>=end)paint(start);
        else {
          const current=review.frameAt(t).t;
          let probe=t;
          do {probe=Math.min(end,probe+5);} while(probe<end && review.frameAt(probe).t===current);
          paint(probe);
        }
        return;
      }
      if(animation!==null){pause();return;}
      if(t>=end)paint(start);
      previous=null;play.textContent='Suspendre';animation=requestAnimationFrame(advance);
    });
    button(controls,'+ 0,25 s',()=>{pause();paint(t+250);});
    slider.addEventListener('input',()=>{pause();paint(Number(slider.value));});
    const visible=()=>{if(document.hidden)pause();};
    const cover=e=>{if(e.target!==dialog&&e.target.tagName==='DIALOG'&&e.target.open)pause();};
    document.addEventListener?.('visibilitychange',visible);document.addEventListener?.('toggle',cover,true);
    preference.addEventListener?.('change',pause);
    detachReplay=()=>{
      document.removeEventListener?.('visibilitychange',visible);document.removeEventListener?.('toggle',cover,true);
      preference.removeEventListener?.('change',pause);
    };
    body.append(tip,views,slider,controls,status);paint(end);return true;
  }
  function bande(s){
    const review=attempts.get(s)?.review, range=review?.bounds();
    if(!review?.death||!range)return {};
    return {durationMs:Math.round(range.end-range.start),drawReview(canvas){
      const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
      c.fillStyle='#0b1422';c.fillRect(0,0,w,h);
      c.strokeStyle='#445168';c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();
      const xs=p=>5+p.plane*w/2+p.x/35*(w/2-10),ys=p=>4+p.y/17*(h-8);
      let before=null;
      for(let t=range.start;t<=range.end+49;t+=50){
        const p=review.frameAt(Math.min(range.end,t));
        if(before && p.plane===before.plane){
          c.strokeStyle=p.plane?'#b6b6ff':'#94f5ca';c.lineWidth=2;c.beginPath();c.moveTo(xs(before),ys(before));c.lineTo(xs(p),ys(p));c.stroke();
        }
        before=p;
      }
      if(before){c.fillStyle='#ffc89d';c.fillRect(xs(before)-2,ys(before)-2,4,4);}
    }};
  }
  window.SnakeArchives=Object.freeze({newRun,tick,end,jump,resumeYear,abandon,offer,wager,label,draw,openHall,openReplay,bande,death:s=>attempts.get(s)?.review?.death});
})();

;
/* Généré par analyse-pouls.py depuis les données PCM et les repères du jeu. */
globalThis.SnakeCampagnePulseData = [{"year":1976,"track":"neonvelocity-2.mp3","loopStart":16.70448,"loopEnd":70.12752,"rate":1,"firstSignalSeconds":0,"anchor":16.69948,"attackOffset":-0.005,"bars":[16.70448,18.37395,20.043419999999998,21.712889999999998,23.38236,25.05183,26.7213,28.39077,30.06024,31.72971,33.39918,35.06865,36.73812,38.40759,40.077059999999996,41.74653,43.416,45.08547,46.75494,48.42441,50.09388,51.76335,53.43282,55.102289999999996,56.77176,58.44123,60.1107,61.78017,63.44964,65.11911,66.78858000000001,68.45805,70.12752],"period":0.4173675,"bpmSource":143.76,"bpmPlayback":143.76,"heldOutBeats":63,"medianNearestAttackMs":31.9,"gridOverOffset":1.8},{"year":1985,"track":"electro-tension-t106.mp3","loopStart":46.573264,"loopEnd":93.102453,"rate":1.18,"firstSignalSeconds":0,"anchor":46.565764,"attackOffset":-0.0075,"bars":[46.573264,48.510113,50.446736,52.381358,54.322038,56.26183,58.206396,60.143906,62.086472,64.021264,65.961943,67.895566,69.841245,71.778981,73.719491,75.654113,77.595849,79.531528,81.471264,83.411943,85.347849,87.284528,89.229208,91.159887,93.102453],"period":0.484684,"bpmSource":123.79,"bpmPlayback":146.07,"heldOutBeats":47,"medianNearestAttackMs":6.0,"gridOverOffset":3.9},{"year":1995,"track":"electro-titan-t112.mp3","loopStart":20.856536,"loopEnd":61.280214,"rate":1.055,"firstSignalSeconds":0,"anchor":20.846536,"attackOffset":-0.01,"bars":[20.856536,22.545036,24.22975,25.918357,27.601964,29.294464,30.975286,32.662,34.348607,36.036321,37.713143,39.404964,41.091679,42.7765,44.459107,46.145821,47.827536,49.515036,51.199964,52.882786,54.569929,56.247286,57.929964,59.602643,61.280214],"period":0.42121862,"bpmSource":142.44,"bpmPlayback":150.28,"heldOutBeats":47,"medianNearestAttackMs":8.0,"gridOverOffset":3.2},{"year":2185,"track":"voix-machine-t106.mp3","loopStart":29.398906,"loopEnd":72.861226,"rate":1.09,"firstSignalSeconds":0.18,"anchor":29.398906,"attackOffset":0.0,"bars":[29.398906,31.208,33.021491,34.827811,36.648019,38.457226,40.272377,42.080698,43.895906,45.70717,47.517491,49.332698,51.144132,52.956396,54.761717,56.577094,58.395189,60.203623,62.01866,63.824208,65.631698,67.446019,69.245906,71.051509,72.861226],"period":0.45269813,"bpmSource":132.54,"bpmPlayback":144.47,"heldOutBeats":47,"medianNearestAttackMs":6.0,"gridOverOffset":3.51},{"year":2985,"track":"voix-plus-vite-t108.mp3","loopStart":30.411815,"loopEnd":72.62935,"rate":1.08,"firstSignalSeconds":0.09,"anchor":30.404315,"attackOffset":-0.0075,"bars":[30.411815,32.176392,33.942043,35.710769,37.467643,39.226517,40.989391,42.746265,44.515213,46.272012,48.037035,49.794983,51.558005,53.312175,55.06942,56.827665,58.584984,60.339228,62.093695,63.854014,65.609333,67.3668,69.120268,70.877809,72.62935],"period":0.439376,"bpmSource":136.56,"bpmPlayback":147.48,"heldOutBeats":47,"medianNearestAttackMs":3.7,"gridOverOffset":7.01}];

;
/* Grille de noires interpolée entre les repères de mesure du fichier décodé. */
(() => {
  'use strict';
  function create(rows,year) {
    const info=rows.find(row=>row.year===year);
    if (!info) throw new RangeError('Époque inconnue');
    const {loopStart:start,loopEnd:end,rate,attackOffset,bars}=info;
    // Avance d'affichage mesurée sur les transitoires PCM, en secondes à vitesse de jeu.
    const visualLead=({1985:.004,1995:.003})[year]??0;
    const wrap=x=>start+((x-start)%(end-start)+(end-start))%(end-start);
    let position=start,lastWall=null,wasPlaying=true;
    function sample({now,mediaTime,playing=true,audible=true,playbackRate=rate}) {
      if (!Number.isFinite(now)) throw new TypeError('Temps monotone en secondes requis');
      const elapsed=lastWall===null?0:Math.max(0,now-lastWall);
      lastWall=now;
      const source=audible && Number.isFinite(mediaTime)?'media':'clock';
      if (source==='media') position=wrap(mediaTime);
      else if (playing && wasPlaying) position=wrap(position+elapsed*playbackRate);
      wasPlaying=playing;
      return project(position,playing,source,playbackRate);
    }
    // Un pas de simulation peut tomber entre deux images de l’écran.
    function project(at,playing,source,playbackRate=rate) {
      const mediaTime=wrap(at);
      const time=wrap(mediaTime-attackOffset+visualLead*playbackRate);
      let b=bars.findIndex(x=>x>time+1e-8)-1;
      if (b<0) b=bars.length-2;
      const span=bars[b+1]-bars[b];
      const q=4*(time-bars[b])/span;
      const quarter=Math.abs(q-Math.round(q))<1e-7?Math.round(q):q;
      const phase=quarter-Math.floor(quarter);
      return {source,mediaTime,bar:b,beat:Math.floor(quarter),phase,
        pulse:Math.exp(-phase*7),playing,bpm:240*playbackRate/span};
    }
    return {sample,project,track:info.track,loopStart:start,loopEnd:end,rate,visualLead};
  }
  const api={create};
  if(typeof module==='object' && module.exports) module.exports=api;
  else globalThis.SnakePulse=api;
})();

;
/* Prototype hors production. Le contexte et la sortie appartiennent à l'appelant. */
(() => {
  'use strict';
  const note = (at, start, end, length, level, pan = 0) => ({at, start, end, length, level, pan});
  const timbres = {
    // Deux dents, un vide, puis trois dents : motif asymétrique en créneaux.
    overloadComb: [0,.060,.180,.24,.30].map((at,i)=>note(at,i%2?880:440,i%2?880:440,.041,.35)),
    // Chaque rebond inverse le panoramique et perd de la hauteur et de l'énergie.
    overloadRicochet: [note(0,1420,580,.082,.36,-.58),note(.24,1180,510,.075,.31,.64),
      note(.48,975,420,.069,.27,-.66),note(.72,790,370,.059,.22,.60)],
    // Bogies de plus en plus rapprochés ; le sifflet traverse les essieux.
    overloadTrain: [note(0,300,190,.062,.31,-.65),note(.074,300,185,.045,.23,-.57),
      note(.25,335,195,.061,.31,-.34),note(.31,335,190,.041,.22,-.24),
      note(.46,390,205,.054,.31),note(.515,390,195,.041,.22,.1),
      note(.65,435,215,.049,.31,.30),note(.70,435,205,.041,.22,.4),
      note(.81,475,220,.045,.30,.62),note(.855,475,210,.041,.21,.67),note(.07,1160,620,.41,.23,.05)],
    // Deux arcs en sens contraires, graves et aigus simultanément sur le médium mobile.
    overloadMoons: [note(0,355,720,.38,.28,-.55),note(0,1065,610,.38,.24,.55),
      note(.40,720,600,.45,.27,.15),note(.40,610,600,.45,.22,-.15)],
    // Un appel clair devant, la réponse plus grave derrière, une réplique par plan.
    overloadEcho: [note(0,780,1410,.09,.32,-.32),note(.087,1210,1570,.08,.27,-.25),
      note(.28,780,1410,.08,.16,-.32),
      note(.55,920,580,.105,.29,.46),note(.66,670,455,.092,.23,.42),note(.83,920,580,.10,.14,.46)],
    overloadHit: [note(0,1190,745,.061,.20)],
    rail: [note(0,960,460,.105,.32)],
    arc: [note(0,1210,840,.083,.27),note(.048,1570,1050,.077,.22)],
    nova: [note(0,680,190,.22,.43),note(.028,1160,580,.11,.25)],
    orbit: [note(0,510,620,.36,.23,-.48),note(0,524,611,.36,.18,.48)],
    prism: [note(0,730,1030,.16,.25,-.6),note(.036,730,1450,.16,.25),note(.072,730,1920,.16,.25,.6)],
    well: [note(0,870,205,.39,.41),note(.026,432,310,.28,.19)],
    echo: [note(0,940,645,.085,.28)],
    chain: [note(0,1180,970,.072,.27,-.4),note(.041,1550,1270,.072,.27,.4),note(.082,1910,1570,.072,.27,-.4)],
    blast: [note(0,780,130,.18,.46),note(.008,1860,490,.062,.25)],
    far: [note(0,1460,1450,.103,.33),note(.112,1050,1040,.103,.33),note(.226,740,733,.103,.33)],
    near: [note(0,740,733,.103,.33),note(.077,1460,1450,.103,.33)],
    bossFinal: [note(0,320,465,.28,.37),note(.095,495,755,.22,.26),note(.24,590,980,.14,.23)],
    prizeMid: [note(0,530,640,.13,.31),note(.12,740,850,.16,.32)],
    prizeFinal: [note(0,530,640,.13,.31),note(.12,740,850,.16,.32),note(.245,900,1390,.26,.32)],
    cell: [note(0,554,831,.10,.22)], upgrade: [note(0,415,831,.22,.25)],
    clear: [note(0,440,880,.27,.26)], death: [note(0,470,155,.29,.30)],
    win: [note(0,440,880,.30,.25), note(.2,660,1320,.26,.25)],
    boss: [note(0,410,540,.25,.37),note(.14,615,820,.24,.27)],
    bossAttack: [note(0,680,950,.11,.44),note(.135,680,1120,.15,.44)],
    bossVolley: [note(0,1110,620,.14,.43)],
    ecoSight: [note(0,820,820,.09,.27),note(.13,820,1010,.12,.30)],
    ecoCut: [note(0,1130,670,.08,.29),note(.10,1010,515,.11,.28)],
    ecoWake: [note(0,510,780,.13,.27,-.30),note(.095,705,980,.14,.26,.30)],
    ecoPort: [note(0,610,610,.17,.24),note(.070,910,910,.14,.24)],
    ecoActive: [note(0,930,420,.09,.28)], ecoEvade: [note(0,585,775,.12,.23)],
    ecoKill: [note(0,1350,720,.09,.28),note(.09,420,280,.13,.19)],
    ecoAbsorb: [note(0,660,300,.15,.33),note(.13,500,240,.18,.30)],
    knotClosed: [note(0,470,710,.11,.28),note(.085,710,1065,.11,.30),note(.17,1065,470,.17,.30)],
    evolutionTrigger: [note(0,330,670,.14,.26),note(.085,540,1090,.16,.22)],
    evolutionHit: [note(0,1390,980,.095,.22)],
    surfGate: [note(0,635,805,.14,.23),note(.16,805,805,.07,.22)],
    surfStart: [note(0,220,580,.29,.30),note(.10,420,880,.18,.24)],
    surfPulse: [note(0,590,1280,.18,.35),note(.10,1180,1580,.11,.25)],
    surfLanded: [note(0,960,720,.13,.27),note(.12,720,840,.15,.23)],
    surfMiss: [note(0,680,310,.23,.25)],
    hitShield: [note(0,780,495,.048,.25),note(0,1620,1210,.039,.15)],
    hitHeart: [note(0,370,210,.12,.39),note(.04,1210,1390,.105,.25)],
    hitSurf: [note(0,420,160,.19,.39),note(.065,820,1540,.12,.29)],
    guardianWarning: [note(0,840,965,.10,.37),note(.125,840,1160,.12,.35)],
    guardianBeat: [note(0,1010,1310,.095,.35),note(.11,1120,1490,.12,.30)],
    guardianCounter: [note(0,520,840,.095,.34),note(.10,840,1260,.15,.32)],
    contractTrain: [note(0,540,625,.10,.22),note(.115,540,625,.10,.22)],
    contractMolt: [note(0,645,810,.09,.21,-.3),note(.11,810,645,.09,.21,.3)],
    contractSwitch: [note(0,710,635,.065,.22),note(.08,885,790,.065,.22),note(.16,1010,915,.07,.22)],
    contractSurf: [note(0,510,990,.22,.22)],
    contractRelay: [note(0,700,700,.07,.22),note(.095,1050,1050,.07,.22),note(.19,700,700,.07,.22)],
    contractOpen: [note(0,640,745,.12,.21)], contractStep: [note(0,745,920,.09,.21)],
    contractScore: [note(0,745,920,.10,.23),note(.105,920,1110,.13,.25)],
    riftOpen: [note(0,260,820,.22,.25)],riftPickup: [note(0,830,415,.17,.25)],
    bonus: [note(0,610,910,.12,.22)],
    flightGate: [note(0,560,700,.10,.20)],
    flightStart: [note(0,280,925,.24,.38),note(.04,410,660,.18,.19)],
    flightRing: [note(0,880,1190,.10,.24)],
    flightEnd: [note(0,860,710,.18,.23)],
    flightCrash: [note(0,580,215,.14,.29)]
  };
  // Le départ conserve le geste du noyau. Chaque catalyseur ponctue la première
  // fraction de seconde dans le même tampon, sans prolonger la voix.
  const launches = {
    echo: [note(0,1240,970,.043,.20),note(.071,1240,970,.043,.14)],
    chain: [note(0,1020,1390,.043,.22),note(.033,1390,1910,.067,.23)],
    blast: [note(0,485,155,.130,.31)]
  };
  for(const core of ['orbit','prism','well']) {
    for(const [mod,accent] of Object.entries(launches))
      timbres[core+'-'+mod]=[...timbres[core],...accent];
  }
  // Prime du gardien et résolution chantent dans une même source à la fin de campagne.
  for(const outcome of ['clear','win']) {
    const cadence=timbres[outcome].map(n=>({...n,at:n.at+.40}));
    timbres['prize-'+outcome]=[...timbres.prizeFinal,...cadence];
  }
  function timbre(info) {
    switch (info.type) {
      case 'contractOpen': return ({convoi:'contractTrain',mue:'contractMolt',aiguillage:'contractSwitch',surf:'contractSurf',relais:'contractRelay'})[info.kind] || 'contractOpen';
      case 'ecoWarning': return ({sentinelle:'ecoSight',equarrisseur:'ecoCut',sillage:'ecoWake',portier:'ecoPort'})[info.role];
      case 'surfEnd': return info.success?'surfLanded':'surfMiss';
      case 'bossHit': return info.weapon==='surf'?'hitSurf':info.heart?'hitHeart':'hitShield';
      case 'guardianWarning': return info.beat>1?'guardianBeat':'guardianWarning';
      case 'ecoAbsorb': case 'ecoActive': case 'ecoKill': case 'ecoEvade':
      case 'knotClosed': case 'evolutionHit': case 'evolutionTrigger': case 'surfGate':
      case 'surfStart': case 'surfPulse': case 'guardianCounter': case 'riftOpen':
      case 'riftPickup': case 'bonus': case 'contractStep': case 'contractScore': return info.type;
      case 'boss': return info.kind==='final'?'bossFinal':'boss';
      case 'bossDefeated': return info.kind==='final'?'prizeFinal':'prizeMid';
      case 'win': case 'clear': return info.withPrize?'prize-'+info.type:info.type;
      case 'death': case 'cell': case 'upgrade': return info.type;
      case 'shot': return info.kind==='arc'?'arc':'rail';
      case 'nova': return 'nova';
      case 'novaOverload': return ({1976:'overloadComb',1985:'overloadRicochet',1995:'overloadTrain',
        2185:'overloadMoons',2985:'overloadEcho'})[info.year];
      case 'novaOverloadHit': return 'overloadHit';
      case 'forgeShot': {
        if(!['orbit','prism','well'].includes(info.core)) return false;
        return Object.hasOwn(launches,info.mod)?info.core+'-'+info.mod:info.core;
      }
      case 'forgeHit': return ['chain','echo','blast'].includes(info.mod) && info.mod;
      case 'planeShift': return info.to === 1 ? 'far' : 'near';
      default: return Object.hasOwn(timbres,info.type) && /^(flight|boss)/.test(info.type) && info.type;
    }
  }
  const years=[1976,1985,1995,2185,2985];
  function makeBuffer(context, notes, year, level=1) {
    const rate=context.sampleRate, length=Math.ceil(rate*Math.max(...notes.map(n=>n.at+n.length)));
    const buffer=context.createBuffer(2,length,rate);
    const left=buffer.getChannelData(0), right=buffer.getChannelData(1);
    for (const n of notes) {
      const gainL=Math.sqrt((1-n.pan)/2), gainR=Math.sqrt((1+n.pan)/2);
      const count=Math.floor(n.length*rate), offset=Math.round(n.at*rate);
      let seed=13487, arpPhase=0;
      for (let i=0; i<count && offset+i<length; i++) {
        const t=i/rate;
        const phase=2*Math.PI*(n.start*t+(n.end-n.start)*t*t/(2*n.length));
        const env=Math.min(1,t/.006,(n.length-t)/.013)*Math.exp(-1.4*t/n.length);
        const fundamental=Math.sin(phase), hz=n.start+(n.end-n.start)*t/n.length;
        let l=fundamental,r=l;
        switch(year) {
          case 1976: {
            // Carré monophonique adouci, construit avec ses partiels impairs disponibles.
            let square=fundamental;
            for(let k=3;k<=9 && k*hz<.46*rate;k+=2) square+=Math.sin(k*phase)/k;
            l=r=.89*square;
            break;
          }
          case 1985: {
            seed=(Math.imul(seed,1664525)+1013904223)>>>0;
            const grit=(seed/2**31-1)*.24*Math.exp(-35*t);
            l=r=.86*fundamental+.28*Math.sin(3*phase)+grit;
            break;
          }
          case 1995: {
            const arp=[1,1.25,1.5,1][Math.floor(t/.042)%4];
            arpPhase+=2*Math.PI*hz*arp/rate;
            l=r=.85*(Math.sin(arpPhase)-Math.sin(3*arpPhase)/9)+.16*fundamental;
            break;
          }
          case 2185: {
            const fm=Math.sin(phase+.76*Math.exp(-13*t)*Math.sin(1.5*phase));
            const strike=Math.round(31*Math.sin(2.12*phase))/31*Math.exp(-75*t);
            l=r=.89*fm+.16*strike;
            break;
          }
          case 2985:
            l=.78*fundamental+.20*Math.sin(phase*1.006)+.12*Math.sin(2*phase);
            r=.78*fundamental+.20*Math.sin(phase*.994)+.12*Math.sin(2*phase);
            break;
        }
        const volume=n.level*env*level;
        left[offset+i]+=volume*l*gainL;right[offset+i]+=volume*r*gainR;
      }
    }
    return buffer;
  }

  function create(context, output, {limit=8, mode='priority',year=null}={}) {
    if (!Number.isInteger(limit) || limit<4 || !['priority','fifo','raw'].includes(mode))
      throw new RangeError('Budget minimal de quatre voix et mode de mix valide requis');
    if (year!==null && !years.includes(year)) throw new RangeError('Époque inconnue');
    const buffers=new Map(), placements=new Map(), voices=new Set(), lastHit=new Map();
    const localWeapons=new Set(['shot','nova','forgeShot','forgeHit','evolutionHit','evolutionTrigger',
      'novaOverload','novaOverloadHit','bossHit']);
    const centeredCues=new Set(['boss','bossAttack','bossVolley','guardianWarning','guardianCounter','planeShift','ecoWarning','ecoActive']);
    const foreground=context.createGain(), action=context.createGain();
    foreground.connect(output); action.connect(output);
    let closed=false, duckEnd=0;
    const stats={accepted:0,coalesced:0,rejected:0,peakVoices:0,
      get activeVoices(){return voices.size;},get cachedPlacements(){return placements.size;}};
    const rank={novaOverload:2,guardianWarning:4,guardianCounter:4,bossDefeated:4,ecoWarning:3,ecoAbsorb:4,ecoActive:2,
      knotClosed:3,surfPulse:4,surfStart:3,surfEnd:3,bossHit:2,contractScore:2,evolutionTrigger:2};
    function overloadCeiling(buffer) {
      const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
      let peak=0;
      for(let i=0;i<left.length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
      if(peak>.34) {
        const attenuation=.34/peak;
        for(let i=0;i<left.length;i++) {left[i]*=attenuation;right[i]*=attenuation;}
      }
    }
    // Pour chaque échantillon : M=(G+D)/2 reste identique ; seule la composante latérale varie.
    // Les tampons déplacés sont partagés entre voix et bornés à douze entrées.
    function place(original,key,info,arena,strength) {
      if(!arena || !Number.isFinite(arena.width) || arena.width<=1) return original;
      const centered=centeredCues.has(info.type);
      if(!centered && (!strength || !localWeapons.has(info.type))) return original;
      let x=info.x;
      if(!Number.isFinite(x)) {
        if(info.type==='bossHit') x=arena.boss?.x ??
          (info.hp===0?arena.effects?.findLast(e=>e.kind==='bossHit' && e.maxLife-e.life<.10)?.x:undefined);
        else if(info.type==='shot' || info.type==='nova' || info.type==='novaOverload') x=arena.snake?.[0]?.x;
      }
      if(centered) x=(arena.width-1)*.5;
      if(!Number.isFinite(x)) return original;
      const position=Math.max(-1,Math.min(1,2*x/(arena.width-1)-1));
      const amount=Number.isFinite(strength)?Math.max(0,Math.min(1,strength)):0;
      const step=Math.round(position*amount*12);
      if(!step && !centered) return original;
      const cacheKey=key+'/'+(centered?'center':step);
      if(placements.has(cacheKey)) {
        const hit=placements.get(cacheKey);placements.delete(cacheKey);placements.set(cacheKey,hit);return hit;
      }
      const left=original.getChannelData(0),right=original.getChannelData(1);
      const result=context.createBuffer(2,left.length,context.sampleRate);
      const outL=result.getChannelData(0),outR=result.getChannelData(1),p=step/12;
      const width=centered?0:1-.5*Math.abs(p),offset=.36*p,ceiling=info.type==='novaOverload'?.34:.95;
      for(let i=0;i<left.length;i++) {
        const mid=(left[i]+right[i])*.5;
        const side=(left[i]-right[i])*.5*width - offset*mid;
        const room=Math.max(0,ceiling-Math.abs(mid)),limited=Math.max(-room,Math.min(room,side));
        outL[i]=mid+limited;outR[i]=mid-limited;
      }
      if(placements.size>=12) placements.delete(placements.keys().next().value);
      placements.set(cacheKey,result);return result;
    }
    function play(info,onEnded,arena,spatialStrength=1) {
      if (closed || !info) return false;
      const key=timbre(info);
      if (!key) return false;
      const now=context.currentTime;
      for (const voice of voices) if (voice.end<=now) voices.delete(voice);
      const group=info.type==='planeShift'?'plane':
        (info.type.startsWith('boss') && info.type!=='bossHit') || info.type.startsWith('guardian')?'boss':'action';
      const priority=rank[info.type]??0;
      const lead=group!=='action' || priority>=3;
      const bucket=info.type==='forgeHit'?[info.core,info.mod,info.plane].join('/'):key;
      const hold=info.type==='forgeHit'?.08:info.type==='novaOverloadHit'?.11:['bossHit','evolutionHit'].includes(info.type)?.065:0;
      if (mode==='priority' && hold && now-(lastHit.get(bucket)??-1)<hold) {
        stats.coalesced++; return false;
      }
      // Deux places pour chacun des deux signaux critiques, même au milieu d'une salve.
      const groupLimit=group==='action'?limit-4:2;
      const siblings=[...voices].filter(v=>v.group===group);
      if ((mode!=='raw' && voices.size>=limit) || (mode==='priority' && siblings.length>=groupLimit)) {
        const victim=mode==='priority' && siblings.filter(v=>v.priority<priority)
          .sort((a,b)=>a.priority-b.priority || a.end-b.end)[0];
        if (!victim) {stats.rejected++;return false;}
        voices.delete(victim);victim.source.stop();victim.source.disconnect();
      }
      const paletteKey=(year??'reference')+'/'+key;
      if(!buffers.has(paletteKey)) {
        const buffer=makeBuffer(context,timbres[key],year,year && lead?1.8:1);
        if(info.type==='novaOverload') overloadCeiling(buffer);
        buffers.set(paletteKey,buffer);
      }
      const source=context.createBufferSource();
      source.buffer=place(buffers.get(paletteKey),paletteKey,info,arena,spatialStrength);
      source.connect(lead?foreground:action);
      const end=now+source.buffer.duration, voice={source,end,group,priority};
      source.onended=()=>{voices.delete(voice);source.disconnect();onEnded?.();};
      if (mode==='priority' && lead) {
        duckEnd=Math.max(duckEnd,end+.018);
        action.gain.cancelScheduledValues(now);
        action.gain.setTargetAtTime(.32,now,.007);
        action.gain.setTargetAtTime(1,duckEnd,.040);
      }
      if (hold) lastHit.set(bucket,now);
      voices.add(voice); source.start(now);
      stats.accepted++; stats.peakVoices=Math.max(stats.peakVoices,voices.size);
      return true;
    }
    function stop() {
      for (const {source} of voices) { source.stop(); source.disconnect(); }
      voices.clear();lastHit.clear();duckEnd=0;
      action.gain.cancelScheduledValues(context.currentTime);
      action.gain.setValueAtTime(1,context.currentTime);
    }
    function dispose() {
      if (closed) return;
      stop(); action.disconnect(); foreground.disconnect(); buffers.clear(); placements.clear(); closed=true;
    }
    function setYear(next) {
      if (!years.includes(next)) throw new RangeError('Époque inconnue');
      if(year!==next) placements.clear();
      year=next;
    }
    return {setYear,handles:info=>Boolean(info && timbre(info)),play,stop,dispose,stats};
  }
  const api={create,years:Object.freeze(years)};
  if (typeof module==='object' && module.exports) module.exports=api;
  else globalThis.SnakeAudioPriority=api;
})();

;
/* Lecteur optionnel. Aucun contexte ni média ne sont créés au chargement. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const prefs='snake2985.campagne.audio.v1';
  const cacheName='snake2985-musiques-originales-v1';
  function offlineFiles(env,base,folder='../../audio/') {
    const url=name=>new URL(name,new URL(folder,base)).href;
    async function read(name) {
      const address=url(name);
      let cache;
      try {cache=await env.caches?.open(cacheName);} catch {}
      const saved=await cache?.match(address).catch(()=>null);
      if(saved) return saved;
      const shared=await env.caches?.match?.(address).catch(()=>null);
      if(shared?.status===200) return shared;
      const response=await env.fetch(address);
      if(!response.ok) throw Error('MP3 inaccessible : '+name);
      if(cache) try {await cache.put(address,response.clone());} catch {}
      return response;
    }
    return {
      bytes:async name=>(await read(name)).arrayBuffer(),
      async prepare(rows) {
        const cached=[];
        const storage=await env.caches?.open(cacheName);
        if(!storage) throw Error('CacheStorage indisponible');
        for(const {track} of rows) {
          await read(track);
          if(!await storage.match(url(track)) && !await env.caches.match?.(url(track)))
            throw Error('Mise en cache impossible : '+track);
          cached.push(track);
        }
        return cached;
      }
    };
  }
  function create({rows,clock,synth,makeContext,bytes,prepare=async()=>[],now,storage,
    doc,page,mutedByUrl=false,onError=()=>{}}) {
    const years=rows.map(r=>r.year), positions={};
    let musicLevel=.82,fxLevel=.72,spaceLevel=1;
    try {
      const saved=JSON.parse(storage?.getItem(prefs)||'{}');
      if(Number.isFinite(saved.music)) musicLevel=clamp(saved.music);
      if(Number.isFinite(saved.fx)) fxLevel=clamp(saved.fx);
      if(Number.isFinite(saved.space)) spaceLevel=clamp(saved.space);
      for(const year of years) if(Number.isFinite(saved.positions?.[year])) positions[year]=saved.positions[year];
    } catch {}
    let active=false,paused=false,muted=true,hidden=Boolean(doc?.hidden),closed=false;
    let row=rows[0],pulseClock=clock.create(rows,row.year),ctx,master,musicBus,fxBus,fx;
    let source=null,sourceWhen=0,sourcePosition=0,pressure=0,boss=null,token=0;
    let decoded=null,loading=null,error=null,checkpointAt=-Infinity;
    let decodeQueue=Promise.resolve(),wasRunning=false,ending=false,prizeAt=-Infinity;
    const normalize=v=>years.includes(v)?v:years[Math.max(0,Math.min(years.length-1,Math.trunc(Number(v))||0))];
    const running=()=>active && !paused && !hidden && !closed;
    const allowed=()=>!mutedByUrl && running() && !muted;
    const wrap=(r,t)=>r.loopStart+((t-r.loopStart)%(r.loopEnd-r.loopStart)+(r.loopEnd-r.loopStart))%(r.loopEnd-r.loopStart);
    function save() {
      try {storage?.setItem(prefs,JSON.stringify({music:musicLevel,fx:fxLevel,space:spaceLevel,positions}));} catch {}
    }
    function pulse(wall=now()) {
      const read=Boolean(source && allowed() && ctx?.state==='running');
      const sample=pulseClock.sample({now:wall,mediaTime:read?sourcePosition+(ctx.currentTime-sourceWhen)*row.rate:undefined,
        audible:read,playing:running(),playbackRate:row.rate});
      if(active && running() && wall-checkpointAt>=5) {
        checkpointAt=wall; positions[row.year]=sample.mediaTime; save();
      }
      return sample;
    }
    function pulseAt(stamp) {
      const wall=now(),sample=pulse(wall);
      if(!sample.playing || !Number.isFinite(stamp))return sample;
      return pulseClock.project(sample.mediaTime+(stamp-wall)*row.rate,true,sample.source);
    }
    function anchor(t) {
      pulseClock=clock.create(rows,row.year);
      pulseClock.sample({now:now(),mediaTime:wrap(row,t),audible:true,playing:running()});
    }
    function remember(stamp) {
      if(active) {positions[row.year]=pulseAt(stamp).mediaTime;save();}
    }
    function gain(node,value,smooth=false) {
      if(!node) return;
      node.gain.cancelScheduledValues(ctx.currentTime);
      if(smooth) node.gain.setTargetAtTime(value,ctx.currentTime,.08);
      else node.gain.setValueAtTime(value,ctx.currentTime);
    }
    function levels(smooth=false) {
      gain(master,allowed()?1:0);
      // La prise musicale conserve sa progression pendant l'approche et le duel.
      gain(musicBus,(.62+.17*(boss?1:pressure))*musicLevel,smooth && allowed());
      gain(fxBus,.32*fxLevel);
    }
    function silence() {
      ++token;ending=false;prizeAt=-Infinity;gain(master,0);
      if(source) {
        const old=source;source=null;old.onended=null;
        try {old.stop();} catch {} old.disconnect();
      }
      fx?.stop();
    }
    function graph() {
      if(ctx) return;
      ctx=makeContext();
      master=ctx.createGain();master.gain.value=0;
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-3;limiter.knee.value=1;limiter.ratio.value=12;
      limiter.attack.value=.002;limiter.release.value=.09;
      master.connect(limiter);limiter.connect(ctx.destination);
      musicBus=ctx.createGain();fxBus=ctx.createGain();
      musicBus.connect(master);fxBus.connect(master);
      fx=synth.create(ctx,fxBus,{year:row.year,limit:8});
      ctx.onstatechange=()=>{
        if(ctx.state==='running') wasRunning=true;
        if(((active && !muted) || ending) && (ctx.state==='interrupted' || (ctx.state==='suspended' && wasRunning))) guard();
      };
    }
    async function bufferFor(r) {
      if(decoded?.track===r.track) return decoded.buffer;
      if(loading?.track===r.track) return loading.promise;
      const task={track:r.track};
      task.promise=Promise.resolve().then(()=>bytes(r.track)).then(data=>{
        const decode=decodeQueue.then(()=>{
          if(!allowed() || row!==r) throw Error('Chargement audio abandonné');
          return ctx.decodeAudioData(data);
        });
        decodeQueue=decode.catch(()=>{});
        return decode;
      }).then(buffer=>{
        if(buffer.duration+1/ctx.sampleRate<r.loopEnd) throw Error('MP3 trop court : '+r.track);
        if(row.track===r.track && !closed) decoded={track:r.track,buffer};
        return buffer;
      }).finally(()=>{if(loading===task) loading=null;});
      loading=task;return task.promise;
    }
    async function arm() {
      const id=++token,r=row;
      if(!allowed()) return false;
      try {
        graph();fx.setYear(r.year);
        // Appel au contexte dans la pile du geste, avant le premier await.
        if(ctx.state!=='running') await ctx.resume();
        if(id!==token || !allowed() || ctx.state!=='running') return false;
        wasRunning=true;levels();
        if(!musicLevel || source) return true;
        const buffer=await bufferFor(r);
        if(id!==token || !allowed() || !musicLevel || row!==r || ctx.state!=='running') return false;
        const offset=pulse().mediaTime;
        const next=ctx.createBufferSource();next.buffer=buffer;
        next.loop=true;next.loopStart=r.loopStart;next.loopEnd=r.loopEnd;
        next.playbackRate.value=r.rate;next.connect(musicBus);
        next.start(ctx.currentTime,offset);
        source=next;sourceWhen=ctx.currentTime;sourcePosition=offset;error=null;
        return true;
      } catch(err) {
        if(id===token) {error=String(err?.message||err);onError(error);}
        return false;
      }
    }
    function select(input) {
      remember();silence();row=rows.find(r=>r.year===normalize(input));decoded=null;
      pressure=0;boss=null;anchor(positions[row.year]??row.loopStart);fx?.setYear(row.year);
    }
    function start(input=0) {
      if(closed) return;
      if(active) remember();
      silence(); active=false; muted=true;paused=false;
      select(input);active=true;anchor(positions[row.year]??row.loopStart);levels();error=null;
    }
    function scene(input,difficulty,nearBoss,kind) {
      if(!active || closed) return;
      const changed=normalize(input)!==row.year;
      if(changed) select(input);
      const nextPressure=clamp(Number(nearBoss)||0),nextBoss=['mid','final'].includes(kind)?kind:null;
      if(changed || nextPressure!==pressure || nextBoss!==boss) {
        pressure=nextPressure;boss=nextBoss;levels(true);
      }
      if(changed && allowed()) void arm();
    }
    function setMuted(value) {
      if(closed) return Promise.resolve(false);
      remember();
      if(mutedByUrl || value || hidden || !active) {muted=true;silence();return Promise.resolve(false);}
      muted=false;return arm();
    }
    function pause(stamp) {
      if(ending) {silence();return;}
      if(!active || paused) return;
      remember(stamp);paused=true;silence();anchor(positions[row.year]);
    }
    function resume() {
      if(!active || hidden || closed || !paused) return Promise.resolve(false);
      paused=false;anchor(positions[row.year]??row.loopStart);
      return allowed()?arm():Promise.resolve(false);
    }
    function guard() {
      remember();muted=true;silence();
      anchor(positions[row.year]??row.loopStart);
    }
    function visibility() {
      if(doc?.hidden) {guard();hidden=true;anchor(positions[row.year]??row.loopStart);}
      else {hidden=false;anchor(positions[row.year]??row.loopStart);}
    }
    function leaving() {guard();hidden=true;anchor(positions[row.year]??row.loopStart);}
    function returning() {hidden=Boolean(doc?.hidden);anchor(positions[row.year]??row.loopStart);}
    doc?.addEventListener('visibilitychange',visibility);
    page?.addEventListener('pagehide',leaving);page?.addEventListener('pageshow',returning);
    function setVolumes({music,fx:value,space}={}) {
      if(closed) return;
      if(Number.isFinite(music)) musicLevel=clamp(music);
      if(Number.isFinite(value)) fxLevel=clamp(value);
      if(Number.isFinite(space)) spaceLevel=clamp(space);
      levels();save();
      if(musicLevel && allowed() && !source) void arm();
    }
    function event(info,arena,stamp) {
      if(!allowed() || !fxLevel || ctx?.state!=='running') return false;
      if(typeof info==='string') info={type:info};
      if(['win','clear','death'].includes(info?.type)) return finish(info.type,stamp);
      if(info?.type==='bossDefeated' && info.kind==='final') prizeAt=ctx.currentTime;
      return Boolean(fx?.play(info,undefined,arena,spaceLevel));
    }
    function events(batch,arena,stamp) {
      if(!Array.isArray(batch) || !allowed()) return;
      const omit=new Set();
      for(let i=0;i<batch.length;i++) {
        const surge=batch[i];
        if(surge.type!=='novaOverload' || !fx?.handles(surge)) continue;
        // Le moteur émet sa nova avant la surcharge ; les dommages natifs peuvent les séparer.
        const fits=(other,j)=>other.type==='nova' && !omit.has(j) &&
          ['plane','x','y'].every(k=>other[k]==null || surge[k]==null || other[k]===surge[k]);
        let paired=-1;
        for(let j=i-1;j>=0;j--) if(fits(batch[j],j)) {paired=j;break;}
        if(paired<0) paired=batch.findIndex(fits);
        if(paired>=0) omit.add(paired);
      }
      for(let i=0;i<batch.length;i++) if(!omit.has(i)) event(batch[i],arena,stamp);
    }
    function stop(stamp) {
      remember(stamp);silence();active=false;paused=false;muted=true;pressure=0;boss=null;
      anchor(positions[row.year]??row.loopStart);
    }
    function finish(status,stamp) {
      const type=({dead:'death',death:'death',won:'win',win:'win',cleared:'clear',clear:'clear'})[status];
      if(!type || !active) return false;
      const permitted=allowed() && fxLevel>0 && ctx?.state==='running';
      const withPrize=type!=='death' && ctx && ctx.currentTime-prizeAt<=.035;
      stop(stamp);
      if(!permitted) return false;
      // Le transport est arrêté ; seule cette source peut traverser le gain maître.
      const id=token;
      ending=true;gain(master,1);
      const done=()=>{if(id===token) {ending=false;gain(master,0);}};
      if(!fx.play({type,withPrize},done)) {done();return false;}
      return true;
    }
    function encounter(cue) {
      const type=({open:'contractOpen',capture:'contractStep',aiguille:'contractStep',branche:'contractStep',
        double:'contractStep',liaison:'contractStep',score:'contractScore'})[cue?.type];
      return type?event({type,kind:cue.kind}):false;
    }
    function dispose() {
      if(closed) return;
      stop();closed=true;fx?.dispose();decoded=null;
      if(ctx) {ctx.onstatechange=null;void ctx.close()?.catch(()=>{});}
      doc?.removeEventListener('visibilitychange',visibility);
      page?.removeEventListener('pagehide',leaving);page?.removeEventListener('pageshow',returning);
    }
    return {start,stop,finish,pause,resume,scene,event,events,encounter,setMuted,setVolumes,pulse,pulseAt,beat:()=>pulse().phase,
      sector:n=>scene(row.year,n,clamp((Number(n)-1)/9),boss),
      prepareOffline:()=>prepare(rows),dispose,
      get muteLocked(){return mutedByUrl;},get muted(){return muted;},get musicLevel(){return musicLevel;},get fxLevel(){return fxLevel;},get spaceLevel(){return spaceLevel;},
      get status(){return {year:row.year,track:row.track,active,paused,hidden,muted,muteLocked:mutedByUrl,ending,playingMusic:Boolean(source && allowed() && musicLevel),error};}};
  }
  if(typeof module==='object' && module.exports) module.exports={create,offlineFiles};
  else {
    const env=globalThis,doc=env.document,base=doc.currentScript.src;
    const files=doc.currentScript.dataset?.musicRoot
      ? offlineFiles(env,doc.baseURI,doc.currentScript.dataset.musicRoot)
      : offlineFiles(env,base);
    let storage;try{storage=env.localStorage;} catch {}
    env.SnakeCampagneSon=create({rows:env.SnakeCampagnePulseData,clock:env.SnakePulse,synth:env.SnakeAudioPriority,
      makeContext:()=>new (env.AudioContext||env.webkitAudioContext)(),bytes:files.bytes,prepare:files.prepare,
      mutedByUrl:new URL(env.location?.href || base).searchParams.getAll('muet').includes('1'),
      now:()=>env.performance.now()/1000,storage,doc,page:env});
  }
})();

;
(() => {
  'use strict';
  const minArea=4, price=.28;
  const same=(a,b)=>a.x===b.x && a.y===b.y;
  const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const layer=p=>p.plane??0;
  const copy=p=>({x:p.x,y:p.y});
  const key=p=>p.x+','+p.y;
  const grid=p=>Number.isInteger(p.x)&&Number.isInteger(p.y);
  function area(points) {
    return Math.abs(points.reduce((a,p,i)=>{
      const q=points[(i+1)%points.length]; return a+p.x*q.y-q.x*p.y;
    },0))/2;
  }
  function contains(points,p) {
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i];
      if((b.x-a.x)*(p.y-a.y)===(b.y-a.y)*(p.x-a.x) && p.x>=Math.min(a.x,b.x) && p.x<=Math.max(a.x,b.x) && p.y>=Math.min(a.y,b.y) && p.y<=Math.max(a.y,b.y)) return false;
      if((a.y>p.y)!==(b.y>p.y) && p.x<a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y)) inside=!inside;
    }
    return inside;
  }
  function simple(points) {
    return points.length>=8 && points.every((p,i)=>grid(p)&&dist(p,points[(i+1)%points.length])===1)
      && new Set(points.map(key)).size===points.length && area(points)>=minArea;
  }
  function state(s,mode) {
    return s.knot ||= {mode,preview:null,pending:null,last:null,cooldown:0,closures:0,impacts:0,recent:[]};
  }
  function safeTile(s,p,to) {
    return p.x>=0 && p.y>=0 && p.x<s.width && p.y<s.height
      && !s.snake.slice(1).some(q=>same(q,p)&&layer(q)===to);
  }
  function preview(s,mode) {
    const k=state(s,mode);
    if(s.flight||s.status!=='playing'||k.cooldown>0||s.novaCharge<price||s.planeCooldown>0) return null;
    const head=s.snake[0],dir=s.turns[0]||s.direction,from=s.plane,to=1-from;
    if(!grid(head)||!safeTile(s,head,to)) return null;
    if(s.shiftMode==='portal' && !s.planeGates.some(p=>dist(p,head)<=1)) return null;
    const lethal=p=>s.drones.some(d=>layer(d)===to&&d.warmup<=0&&same(d,p))
      || (s.boss&&layer(s.boss)===to&&Math.abs(s.boss.x-p.x)<=1&&Math.abs(s.boss.y-p.y)<=1)
      || (s.boss?.attack?.phase==='active'&&s.boss.attack.plane===to&&s.boss.attack.danger.has(p.y*s.width+p.x));
    if(lethal(head))return null;
    const ahead=[];
    for(let n=1;n<=2;n++){
      const crossing={x:head.x+dir.x*n,y:head.y+dir.y*n};
      if(!safeTile(s,crossing,to)||lethal(crossing)) break;
      ahead.push(crossing);
      for(let i=5;i<s.snake.length-n;i++){
        const anchor=s.snake[i];
        const exact=same(crossing,anchor)&&layer(anchor)===from;
        const assisted=mode==='assist'&&dist(crossing,anchor)===1&&layer(anchor)===to;
        if(!exact&&!assisted) continue;
        const segment=s.snake.slice(0,i+1);
        if(segment.slice(0,-1).some(p=>layer(p)!==from)) continue;
        const points=segment.map(copy).reverse().concat(ahead.slice(0,exact?-1:undefined).map(copy));
        if(!simple(points))continue;
        const signature=from+'|'+points.map(key).sort().join(';');
        if(k.recent.includes(signature))continue;
        return {points,signature,crossing:copy(crossing),plane:from,mode:exact?'exact':'assist',area:area(points),start:copy(head),dir:copy(dir),steps:n};
      }
      if(s.snake.slice(1).some(p=>same(p,crossing)&&layer(p)===from))break;
    }
    return null;
  }
  function discharge(s,p,h) {
    const k=s.knot;k.closures++;k.cooldown=5;k.last={...p,life:.75};s.novaCharge-=price;
    k.recent.push(p.signature);if(k.recent.length>8)k.recent.shift();
    const targets=h.targets().filter(t=>h.visible({...p.crossing,plane:p.plane},t)&&contains(p.points,t)&&!(t===s.boss&&!t.weak));
    for(const target of targets.slice(0,3)) {
      if(s.status!=='playing')break;
      h.damage(target,1);k.impacts++;
    }
    h.emit('knotClosed',{x:p.crossing.x,y:p.crossing.y,plane:p.plane,area:p.area,mode:p.mode});
  }
  function update(s,dt,h,mode) {
    const k=state(s,mode);k.cooldown=Math.max(0,k.cooldown-dt);
    if(k.last && (k.last.life-=dt)<=0)k.last=null;
    let p=k.pending;
    if(p) {
      const head=s.snake[0];
      const n=(head.x-p.start.x)*p.dir.x+(head.y-p.start.y)*p.dir.y;
      p.time-=dt;
      if(s.flight||s.status!=='playing'||p.time<=0||s.plane===p.plane||n<0||n>p.steps||
        head.x!==p.start.x+n*p.dir.x||head.y!==p.start.y+n*p.dir.y||s.novaCharge<price)k.pending=null;
      else if(same(head,p.crossing)){k.pending=null;discharge(s,p,h);}
    }
    k.preview=k.pending?null:preview(s,k.mode);
  }
  function install(engine,forge,opts={}) {
    const mode=opts.mode==='assist'?'assist':'exact';
    return {
      engine:{...engine,shiftPlane(s){
        const k=state(s,mode), proposal=preview(s,k.mode);
        if(!engine.shiftPlane(s))return false;
        if(proposal && !s.flight && s.status==='playing'){
          k.pending={...proposal,time:Math.max(.8,s.stepTime*3)};k.preview=null;
        }
        return true;
      }},
      forge:{...forge,update(s,dt,h){forge?.update?.(s,dt,h);update(s,dt,h,mode);}},
    };
  }
  function draw(ctx,s,project) {
    const k=s.knot, p=k?.last||k?.pending||k?.preview;
    if(!p||s.status!=='playing')return;
    ctx.save();ctx.lineWidth=k.last?4:2;ctx.strokeStyle=k.last?'#fffbd1':k.pending?'#79ffe3':'#fbcf72';
    if(!k.last)ctx.setLineDash([5,4]);
    ctx.beginPath();
    for(const [i,tile] of p.points.entries()){
      const q=project(tile,p.plane);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
    }
    ctx.closePath();ctx.stroke();const q=project(p.crossing,p.plane);ctx.setLineDash([]);ctx.beginPath();ctx.arc(q.x,q.y,6,0,2*Math.PI);ctx.stroke();ctx.restore();
  }
  const api={preview,contains,simple,area,install,draw,price};
  if(typeof window!=='undefined')window.SnakeKnot=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(() => {
  'use strict';
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const roles=[
    {id:'sentinelle',name:'Sentinelle',glyph:'viseur',hint:'La bande se verrouille. Quitte la voie ou détruis le viseur.'},
    {id:'equarrisseur',name:'Équarrisseur',glyph:'ciseaux',hint:'Il coupe devant ta tête. Suis l’ouverture ou plonge.'},
    {id:'sillage',name:'Chasseur de sillage',glyph:'chevrons',hint:'Il chasse dans la profondeur voisine. Lis le sillage avant de plonger.'},
    {id:'portier',name:'Gardien de porte',glyph:'portique',hint:'La cellule est gardée. Contourne le portique ou brise son émetteur.'},
  ];
  const colors={1976:'#aaff84',1985:'#ff65ca',1995:'#ffbd43',2185:'#56d9ff',2985:'#bd87ff'};
  const key=(s,x,y)=>y*s.width+x, dist=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.y-q.y);
  const inside=(s,x,y)=>x>=0&&y>=0&&x<s.width&&y<s.height;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const config={
    temoin:{},balises:{period:8.0,decay:.48,active:.68,width:0},maillage:{period:6.6,decay:.43,active:1.15,width:1}
  };
  function emit(s,type,data={}){
    if(s.events.length>=96)s.events.shift();
    s.events.push({type,...data});
  }
  function init(s,options={}){
    if(s.ecologie)return s.ecologie;
    s.ecologie={variant:options.variant||'maillage',shield:options.shield!==false,spent:false,wave:null,
      due:4.5,seq:0,protectedUntil:0,serial:0};
    return s.ecologie;
  }
  function settings(s,variant){
    const c=config[variant],n=s.difficulty;
    return {period:c.period-c.decay*(n-1),warning:1.40+.032*(n-1),active:c.active+.065*(n-1),
      depth:Math.min(4,1+Math.floor((n-1)/2)),width:c.width+(n>=5?1:0)+(n>=9?1:0)};
  }
  function limits(s,emitter){
    const plane=s.plane,walls=new Set();
    for(const p of s.snake.slice(1))if(p.plane===plane)walls.add(key(s,p.x,p.y));
    for(const d of s.drones)if(d.plane===plane)for(const p of [d,d.next])walls.add(key(s,p.x,p.y));
    if(emitter?.plane===plane)walls.add(key(s,emitter.x,emitter.y));
    if(s.boss?.plane===plane)for(const p of [s.boss,s.boss.next]){
      for(let x=p.x-1;x<=p.x+1;x++)for(let y=p.y-1;y<=p.y+1;y++)walls.add(key(s,x,y));
    }
    if(s.boss?.attack?.plane===plane)for(const k of s.boss.attack.danger)walls.add(k);
    return walls;
  }
  // Search for a simple cardinal path; an unproven candidate is discarded.
  function certificate(s,mask,plane,length,emitter){
    const walls=limits(s,emitter),h=s.snake[0],path=[],used=new Set([key(s,h.x,h.y)]);
    let fuel=600;
    function walk(x,y,dx,dy){
      if(path.length===length)return true;
      if(--fuel<0)return false;
      const options=dirs.filter(([vx,vy])=>vx*dx+vy*dy>=0).sort((a,b)=>{
        const space=v=>Math.min(x+v[0],s.width-1-x-v[0],y+v[1],s.height-1-y-v[1]);
        return space(b)-space(a);
      });
      for(const [vx,vy] of options){
        const xx=x+vx,yy=y+vy,k=key(s,xx,yy);
        if(!inside(s,xx,yy)||walls.has(k)||used.has(k)||(plane===s.plane&&mask.has(k)))continue;
        used.add(k);path.push({x:xx,y:yy,plane:s.plane});
        if(walk(xx,yy,vx,vy))return true;
        path.pop();used.delete(k);
      }
      return false;
    }
    return walk(h.x,h.y,s.direction.x,s.direction.y)?path:null;
  }
  function geometry(s,role,c){
    const h=s.snake[0],{x:dx,y:dy}=s.direction,project=Math.max(3,Math.round(c.warning/s.stepTime));
    let anchor=h,plane=s.plane;
    if(role.id==='portier')anchor=s.cells.filter(p=>p.plane===s.plane).sort((a,b)=>dist(a,h)-dist(b,h))[0]||h;
    if(role.id==='sillage'){
      plane=1-plane;
      anchor=s.snake.find(p=>p.plane===plane)||h;
    }
    const side=s.ecologie.seq%2?1:-1;
    const marks=[],mask=new Set();
    for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
      const u=(x-anchor.x)*dx+(y-anchor.y)*dy,v=(y-anchor.y)*dx-(x-anchor.x)*dy;
      let hit;
      switch(role.id){
        case 'sentinelle':hit=Math.abs(v)<=c.width && u>=2 && u<=project+7+s.difficulty;break;
        case 'equarrisseur':hit=u>=project-2&&u<=project+1+c.width&&Math.abs(v)<=6+c.width&&Math.abs(v-3*side)>1;break;
        case 'sillage':hit=u>=-1&&u<=project+5&&Math.abs(v-side*Math.floor(Math.max(0,u)/4))<=1+c.width;break;
        case 'portier':hit=Math.abs(u)<=2+c.width&&Math.abs(v)<=3+c.width&&!(v*side>=1&&Math.abs(u)>0);break;
      }
      if(hit){mask.add(key(s,x,y));marks.push({x,y,plane});}
    }
    return {mask,marks,plane};
  }
  function propose(s){
    const eco=s.ecologie,c=settings(s,eco.variant),role=roles[eco.seq%c.depth];
    eco.seq++;
    const {mask,marks,plane}=geometry(s,role,c);
    if(marks.length<3)return false;
    const h=s.snake[0];
    const emitter=marks.filter(p=>dist(p,h)>=4 && !s.snake.some(q=>p.plane===q.plane&&p.x===q.x&&p.y===q.y)
      && !s.cells.some(q=>p.plane===q.plane&&p.x===q.x&&p.y===q.y)
      && !s.drones.some(q=>p.plane===q.plane&&(dist(p,q)===0||dist(p,q.next)===0))
      && !(s.boss?.plane===plane&&Math.max(Math.abs(p.x-s.boss.x),Math.abs(p.y-s.boss.y))<=2))
      .sort((a,b)=>Math.abs(dist(a,h)-6)-Math.abs(dist(b,h)-6))[0];
    if(!emitter)return false;
    const length=Math.ceil((c.warning+c.active+s.stepClock)/s.stepTime)+1;
    const path=certificate(s,mask,plane,length,emitter);
    if(!path)return false;
    const d={...emitter,ecoRole:role.id,id:s.nextId++,next:emitter,warmup:0,moveEvery:Infinity,moveIn:Infinity};
    s.drones.push(d);
    eco.wave={...role,serial:++eco.serial,plane,mask,tiles:marks,path,emitter:d,phase:'warning',
      remaining:c.warning,total:c.warning,active:c.active,difficulty:s.difficulty,boss:s.boss};
    emit(s,'ecoWarning',{role:role.id,plane,serial:eco.serial,seconds:c.warning,tiles:marks.length,opening:length});
    return true;
  }
  function end(s,type){
    const e=s.ecologie,w=e.wave;
    s.drones=s.drones.filter(d=>d!==w.emitter);
    emit(s,type,{role:w.id,serial:w.serial,plane:w.plane});
    e.wave=null;e.due=s.elapsed+settings(s,e.variant).period;
  }
  function absorb(s){
    const e=s.ecologie;
    if(!e.shield||e.spent||s.snake.length<7||!['Mur','Ta propre queue'].includes(s.cause))return;
    const saved=s.snake,shorter=saved.slice(0,-2);
    s.snake=shorter;
    const mask=e.wave?.phase==='active'?e.wave.mask:new Set(),plane=e.wave?.plane??s.plane;
    const path=certificate(s,mask,plane,3,null);
    if(!path){s.snake=saved;return;}
    const cause=s.cause;
    s.events=s.events.filter(v=>v.type!=='death');s.effects=s.effects.filter(v=>v.kind!=='death');
    s.cause='';s.status='playing';s.progress=s.stepClock=0;s.previousSnake=shorter.slice();
    s.direction={x:path[0].x-shorter[0].x,y:path[0].y-shorter[0].y};s.turns.length=0;
    e.spent=true;e.protectedUntil=s.elapsed+1.5;
    s.novaRadius=Math.min(37,s.novaRadius-.62);
    emit(s,'ecoAbsorb',{cause,lost:2,remaining:shorter.length});
  }
  function advance(s,dt){
    const e=s.ecologie;
    if(s.status==='dead'){absorb(s);return;}
    const w=e.wave;
    if(e.variant==='temoin'||s.status!=='playing')return;
    if(w){
      if(s.flight||w.boss!==s.boss){end(s,'ecoCancel');return;}
      if(!s.drones.includes(w.emitter)){end(s,'ecoKill');return;}
      w.remaining-=dt;
      if(w.remaining<=0){
        if(w.phase==='active'){end(s,'ecoEvade');return;}
        w.phase='active';w.remaining=w.total=w.active;
        emit(s,'ecoActive',{role:w.id,serial:w.serial});
      }
      const h=s.snake[0];
      if(w.phase==='active'&&w.plane===s.plane&&w.mask.has(key(s,h.x,h.y))){
        s.status='dead';s.cause=w.name;s.progress=1;s.turns.length=0;
        s.effects.push({...h,kind:'death',life:.65,maxLife:.65,radius:2});
        emit(s,'death',{...h,cause:w.name,role:w.id});
      }
    } else if(s.elapsed>=Math.max(e.due,e.protectedUntil)&&!s.flight){
      if(!propose(s))e.due=s.elapsed+.45;
    }
  }
  function tick(s,dt,next,options){
    if(!Number.isFinite(dt)||dt<=0)return;
    init(s,options);
    while(dt>1e-9&&s.status==='playing'){
      const slice=Math.min(dt,1/60);
      const e=s.ecologie,h=s.snake[0],dir=s.turns[0]||s.direction;
      const body=e.wave?.emitter, willMove=!s.flight&&s.stepClock+slice+1e-10>=s.stepTime;
      const x=h.x+dir.x,y=h.y+dir.y;
      // Crossing the transmitter is harmless. Weapons can still destroy it between steps.
      const cross=willMove&&body&&body.plane===s.plane&&body.x===x&&body.y===y&&s.drones.includes(body);
      if(cross)s.drones=s.drones.filter(d=>d!==body);
      if(willMove&&s.elapsed<e.protectedUntil&&(!inside(s,x,y)||s.snake.slice(0,-1).some(p=>p.plane===s.plane&&p.x===x&&p.y===y))){
        const safe=certificate(s,e.wave?.mask||new Set(),e.wave?.plane??s.plane,3,null);
        if(safe){s.direction={x:safe[0].x-h.x,y:safe[0].y-h.y};s.turns.length=0;}
      }
      next(s,slice);
      if(cross&&e.wave?.boss===s.boss)s.drones.push(body);
      advance(s,slice);dt-=slice;
    }
  }
  function read(s){
    const w=s.ecologie?.wave;
    return w?{role:w.id,name:w.name,glyph:w.glyph,hint:w.hint,tint:colors[s.year],plane:w.plane,phase:w.phase,
      remaining:w.remaining,total:w.total,tiles:w.tiles,opening:w.path,emitter:w.emitter,serial:w.serial}:null;
  }
  window.SnakeEcologie={init,tick,read,settings};
})();

;
(() => {
  'use strict';
  const curves = {
    temoin: { start:0, drone:[1,1], warning:[1,1], recharge:[1,1],rail:[1,1],incoming:[1,1] },
    progressive: { start:3.2, drone:[1.14,.74], warning:[1.16,.76], recharge:[1.18,.70],rail:[1,1],incoming:[1,1] },
    tendue: { start:3.2, drone:[1.07,.58], warning:[1.03,.60], recharge:[1.06,.50],rail:[.9,3.4],incoming:[1.2,.32] },
  };
  const rank = {1976:0,1985:1,1995:2,2185:3,2985:4};
  const chosen = 'progressive';
  const drones = new WeakSet(), warnings = new WeakSet();
  function tick(s,dt,next,curve=chosen) {
    const p=curves[curve];
    if (!p || !Number.isFinite(dt) || dt<=0) return;
    if(curve==='temoin'){next(s,dt);return;}
    while(dt>1e-9 && s.status==='playing'){
      const slice=Math.min(dt,1/60);
      const intensity=.62*(rank[s.year]/4)+.38*((s.difficulty-1)/9);
      const scale=pair=>pair[0]+(pair[1]-pair[0])*intensity;
      for(const d of s.drones){
        if(!drones.has(d)){
          d.moveEvery*=scale(p.drone);d.moveIn*=scale(p.drone);
          drones.add(d);
        }
        if(s.elapsed<p.start)d.warmup=Math.max(d.warmup,p.start-s.elapsed);
      }
      const a=s.boss?.attack;
      if(a?.phase==='warning'&&!warnings.has(a)){
        a.remaining=a.total=Math.max(.64,a.remaining*scale(p.warning));
        warnings.add(a);
      }
      const before=s.novaCharge,eaten=s.eaten,rift=s.riftUsed,flight=s.flight,rail=s.gunClock,spawn=s.spawnClock,boss=s.boss;
      const rechargeSeconds=4+(12-s.pace*1.05)/(1+s.levels.nova*.6);
      next(s,slice);
      if(s.gunClock>rail) s.gunClock*=scale(p.rail);
      if(s.spawnClock>spawn) s.spawnClock*=scale(p.incoming);
      if(s.eaten===eaten && s.riftUsed===rift && s.flight===flight && s.boss===boss && before<1 && s.novaCharge>before)
        s.novaCharge=Math.min(1,before+slice/rechargeSeconds*scale(p.recharge));
      dt-=slice;
    }
  }
  window.SnakeEquilibre={tick,curves,chosen};
})();

;
(() => {
  'use strict';
  const receipts=new WeakMap(), mounted=new WeakMap();
  const subtitles={orbit:'Protège les flancs',prism:'Traverse la ligne',well:'Rassemble les drones'};
  function available(s){
    return !!(s?.status==='upgrade' && s.difficulty===5 && s.nextBossKind==='final'
      && s.finishers?.length===1 && s.forge && !receipts.has(s));
  }
  function apply(s,core,{forge,archives,onDone}){
    if(!available(s)||!forge.cores.some(c=>c.id===core))return null;
    const {core:before,mod}=s.forge;
    if(before!==core&&!forge.equip(s,core,mod))return null;
    const receipt=Object.freeze({type:'workshopRecipe',year:s.year,sector:s.sector,from:before,core,mod,changed:before!==core,elapsed:s.elapsed});
    receipts.set(s,receipt);
    if(s.events.length>=96)s.events.shift();
    s.events.push(receipt);
    archives?.tick?.(s);
    onDone?.(receipt);
    return receipt;
  }
  function mount(host,s,opts){
    if(!available(s))return null;
    const running=mounted.get(host);
    if(running?.state===s)return running;
    running?.destroy();
    const root=document.createElement('section');
    root.className='sat-atelier';root.setAttribute('aria-label','Atelier satellite');
    const el=(tag,cls,parent,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;parent.append(e);return e;};
    const display=el('div','sat-apercu',root);
    const canvas=el('canvas','',display);canvas.width=460;canvas.height=192;canvas.setAttribute('aria-label','Démonstration de la recette sélectionnée');
    const info=el('div','sat-reglage',root);
    const name=el('strong','sat-recette',info);
    const detail=el('span','sat-effet',info);
    const group=el('div','sat-choix',info);group.setAttribute('role','group');group.setAttribute('aria-label','Cœur du satellite');
    const buttons=[];
    let selected=s.forge.core,alive=true;
    function preview(core){
      if(!alive)return;
      selected=core;
      const model=opts.forge.cores.find(c=>c.id===core);
      name.textContent=opts.forge.name(core,s.forge.mod);
      detail.textContent=model.description;
      for(const b of buttons)b.node.setAttribute('aria-pressed',String(b.id===core));
      confirm.textContent=core===s.forge.core?'Garder ma recette':'Équiper cette recette';
      opts.banc.select(canvas,s.year,core,s.forge.mod,!!opts.reduced);
    }
    for(const model of opts.forge.cores){
      const b=el('button','sat-mode',group);b.type='button';
      el('strong','',b,model.name);el('span','',b,subtitles[model.id]);
      b.setAttribute('aria-label',model.name+' · '+subtitles[model.id]+(model.id===s.forge.core?' · équipé':''));
      b.addEventListener('click',()=>preview(model.id));buttons.push({node:b,id:model.id});
    }
    const footer=el('div','sat-action',info);
    el('span','sat-mod',footer,opts.forge.mods.find(m=>m.id===s.forge.mod).name+' conservé');
    const confirm=el('button','sat-confirmer',footer);confirm.type='button';
    function destroy(){
      if(!alive)return;
      alive=false;opts.banc.stop();root.remove();mounted.delete(host);
    }
    function commit(){
      if(!alive||!available(s))return;
      apply(s,selected,{...opts,onDone:receipt=>{destroy();opts.onDone?.(receipt);}});
    }
    confirm.addEventListener('click',commit);
    root.addEventListener('keydown',e=>{
      if(e.defaultPrevented||e.repeat)return;
      if(e.key==='Enter'&&buttons.some(b=>b.node===e.target&&b.id===selected)){
        e.preventDefault();commit();return;
      }
      if(e.key==='Escape'){e.preventDefault();preview(s.forge.core);confirm.focus();return;}
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();
      const i=buttons.findIndex(b=>b.id===selected);
      const j=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;
      preview(buttons[j].id);buttons[j].node.focus();
    });
    host.append(root);preview(selected);confirm.focus();
    const panel={state:s,root,frame:now=>{if(alive)opts.banc.frame(now);},destroy};
    mounted.set(host,panel);
    return panel;
  }
  const api={available,mount,apply,receipt:s=>receipts.get(s)||null};
  if(typeof window!=='undefined')window.SnakeAtelier=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(() => {
  'use strict';
  // Banc autonome. Les impacts et les marques proviennent des deux modules du jeu.
  const forge=window.SnakeEvolution?.install(window.SnakeForge)??window.SnakeForge;
  const routes={
    1976:{steps:['S','S'],target:[8,8],cue:'Vire vers le relais'},
    1985:{steps:['E','E','E'],target:[12,4],cue:'Fais passer la troisième vertèbre'},
    1995:{steps:['E','S'],target:[9,7],cue:'Aiguillage 1 puis 2'},
    2185:{steps:['E','P'],target:[11,4],cue:'Bascule près du relais'},
    2985:{steps:['E','E','S','S'],target:[10,7],cue:'Sors par le côté de l’ombre'},
  };
  const moves={E:{x:1,y:0},S:{x:0,y:1}};
  const proj=(_cam,x,y,z=0)=>({x:x*22-33,y:13+y*13-z*8,k:1});
  let demo=null,last=0;
  function prepare(canvas,year,core,mod,reduced){
    const route=routes[year],plane=year===2185?1:0;
    const sim={width:18,height:10,year,eraIndex:Object.keys(routes).indexOf(String(year)),plane:0,status:'playing',
      snake:Array.from({length:4},(_,i)=>({x:8-i,y:4,plane:0})),direction:{x:1,y:0},shots:[],effects:[]};
    const [x,y]=route.target;
    const bots=[[x,y],[x+1,y+1],[x+3,y]].map(([x,y])=>({x,y,plane,flash:0}));
    const d={sim,canvas,core,mod,route,bots,reduced,step:0,time:0,nextStep:.45,lastMark:null,gesture:null,traces:[{...sim.snake[0]}],hits:0};
    d.hooks={targets:()=>bots,visible:(p,t)=>p.plane===t.plane,plane:()=>sim.plane,
      emit(type,data){
        if(type==='evolutionTrigger')d.gesture={...data};
        if(type==='evolutionHit')d.hits++;
      },
      damage(t){t.flash=.2;},
      pull(t,p){t.x+=(p.x-t.x)*.18;t.y+=(p.y-t.y)*.18;},
    };
    forge.init(sim,{core,mod});return d;
  }
  function advance(d,dt){
    const {sim}=d;d.time+=dt;
    if(d.step<d.route.steps.length&&d.time+1e-8>=d.nextStep){
      const step=d.route.steps[d.step++],head=sim.snake[0];
      if(step==='P'){sim.plane=1-sim.plane;sim.snake[0]={...head,plane:sim.plane};}
      else{
        sim.direction=moves[step];
        sim.snake=[{x:head.x+sim.direction.x,y:head.y+sim.direction.y,plane:sim.plane},...sim.snake.slice(0,-1)];
      }
      d.nextStep+=.27;d.traces.push({...sim.snake[0]});
    }
    for(const b of d.bots)b.flash=Math.max(0,b.flash-dt);
    forge.update(sim,dt,d.hooks);
    const m=sim.evolution?.marks[0];if(m)d.lastMark={...m};
  }
  function select(canvas,year,core,mod,reduced){
    if(demo&&demo.canvas!==canvas)demo.canvas.hidden=true;
    demo=prepare(canvas,year,core,mod,reduced);last=0;canvas.hidden=false;
    canvas.setAttribute?.('aria-label',[forge.name(core,mod),routes[year].cue].join(' · '));
    // Le mode réduit présente la première décharge réelle sans attendre une animation.
    if(reduced){
      const limit=window.SnakeEvolution?96:33;
      for(let i=0;i<limit&&!demo.hits;i++)advance(demo,1/60);
    }
    else advance(demo,1/60);
    draw(demo);
  }
  function draw(d){
    const {sim,canvas,bots,reduced}=d,c=canvas.getContext('2d'),pr=(p)=>proj(null,p.x,p.y,p.plane);
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#0c1222';c.fillRect(0,0,canvas.width,canvas.height);
    c.setTransform(canvas.width/345,0,0,canvas.height/144,0,0);
    function stroke(pts,color,width){
      c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
    }
    c.strokeStyle='#243341';c.lineWidth=.7;c.beginPath();
    for(let y=13;y<144;y+=13){c.moveTo(0,y);c.lineTo(345,y);}
    for(let x=11;x<345;x+=22){c.moveTo(x,0);c.lineTo(x,144);}c.stroke();
    if(d.traces.length>1)stroke(d.traces.map(pr),'#6ab5ba',2.4);
    for(const z of [0,1])SnakeArtillerie.draw(c,sim,{zoom:1},z,d.time,reduced,proj);
    const m=d.lastMark;
    const diamond=(p,label,color)=>{
      const q=pr(p),r=7;c.fillStyle='#182c37';c.beginPath();c.moveTo(q.x,q.y-r);c.lineTo(q.x+r,q.y);c.lineTo(q.x,q.y+r);c.lineTo(q.x-r,q.y);c.closePath();c.fill();
      stroke([{x:q.x,y:q.y-r},{x:q.x+r,y:q.y},{x:q.x,y:q.y+r},{x:q.x-r,y:q.y},{x:q.x,y:q.y-r}],color,1.65);
      if(label){c.fillStyle='#fff8d4';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(label,q.x,q.y+3);}
    };
    if(m){
      if(m.first){stroke([pr(m.first),pr(m)],'#bca469',2);diamond(m.first,'1','#d8bd84');}
      diamond(m,m.first?'2':'',d.gesture?'#a5f4d6':'#ffe096');
    }
    for(const b of bots){
      const p=pr(b);SnakeSprites.draw(c,'drone',sim.year,{...p,unit:.62,viewportWidth:500,plane:b.plane,reduced:true});
      if(b.flash){c.strokeStyle='#ffe4ab';c.lineWidth=2;c.strokeRect(p.x-10,p.y-8,20,16);}
    }
    for(const e of sim.evolution?.effects??[]){
      if(Number.isFinite(e.fromX))stroke([proj(null,e.fromX,e.fromY,e.plane),pr(e)],'#ffe2a0',2.5);
    }
    for(let i=sim.snake.length-1;i>=0;i--){
      const b=sim.snake[i],next=sim.snake[i-1],p=pr(b);
      const a=i&&next?Math.atan2(next.y-b.y,next.x-b.x):Math.atan2(sim.direction.y,sim.direction.x);
      SnakeSprites.draw(c,i?'body':'head',sim.year,{...p,unit:i ? .64 : .84,viewportWidth:500,plane:b.plane,angle:a,reduced:true});
    }
    c.fillStyle='#0c1725';c.fillRect(0,126,345,18);c.textAlign='left';c.fillStyle='#e6f5e7';c.font='bold 13px system-ui';
    c.fillText(d.route.cue,7,139);
    if(sim.year===2185&&sim.plane===1){
      c.fillStyle='#c8edff';c.font='bold 12px system-ui';c.textAlign='left';c.fillText('Plan haut',7,15);
    }
    if(d.hits){c.textAlign='right';c.fillStyle='#addfbc';c.fillText('Impact',338,139);}
  }
  function frame(now){
    if(!demo||demo.reduced||now-last<40)return;
    let dt=last?Math.min(.09,(now-last)/1000):1/60;last=now;
    if(demo.time>=3.1)demo=prepare(demo.canvas,demo.sim.year,demo.core,demo.mod,false);
    while(dt>1e-7){const slice=Math.min(dt,1/60);advance(demo,slice);dt-=slice;}
    draw(demo);
  }
  function stop(){if(demo)demo.canvas.hidden=true;demo=null;}
  window.SnakeBanc={select,frame,stop};
})();

;
/* Une seule entrée depuis la boucle de synchronisation du poste de pilotage.
   Toute animation est portée par CSS : aucune horloge, aucun verrou de saisie. */
(() => {
  'use strict';
  const years=[1976,1985,1995,2185,2985];
  const bound=n=>Number.isFinite(n)?Math.min(1,Math.max(0,n)):0;
  const progress=s=>{
    const d=Math.min(10,Math.max(1,Math.trunc(s.difficulty)||1));
    if(s.status==='cleared'||s.status==='won')return 100;
    const within=s.boss?1-bound(s.boss.hp/Math.max(1,s.boss.maxHp)):
      bound((s.sectorCells||0)/Math.max(1,s.sectorGoal||2));
    return Math.floor(((d-1)+within)*10);
  };
  const mounts=new WeakMap();
  function sync(s,screen,reduced=false,doc=document){
    if(!s)return;
    let m=mounts.get(doc);
    if(!m){
      const post=doc.getElementById('poste'),level=doc.getElementById('niveau'),nova=doc.getElementById('nova');
      if(!post||!level||!nova)return;
      m={post,level,nova};mounts.set(doc,m);
      // Le contrôleur existant écrit le pourcentage dans le premier élément enfant.
      // Le nœud texte précédent conserve une légende visible pour le tir.
      if(nova.firstChild?.nodeType===3)nova.firstChild.nodeValue='Nova ';
      level.setAttribute('role','progressbar');level.setAttribute('aria-label','Progression dans l’époque');
      level.setAttribute('aria-valuemin','0');level.setAttribute('aria-valuemax','100');
    }
    const year=years.includes(s.year)?s.year:1976;
    if(m.year!==year){m.year=year;m.post.dataset.instrument=String(year);}
    if(m.screen!==screen||m.reduced!==reduced){
      if(screen==='play'&&m.screen==='prep'&&!reduced)m.post.dataset.startInstrument='';
      else if(m.post.hasAttribute('data-start-instrument'))m.post.removeAttribute('data-start-instrument');
      m.screen=screen;m.reduced=reduced;
    }
    const phase=progress(s),charge=Math.floor(bound(s.novaCharge)*100);
    if(m.phase!==phase){
      m.phase=phase;m.level.style.setProperty('--avance',phase+'%');
      m.level.setAttribute('aria-valuenow',String(phase));
    }
    const text='Secteur '+(Math.min(10,Math.max(1,Math.trunc(s.difficulty)||1)))+' sur 10, '+phase+' %';
    if(m.phaseText!==text){m.phaseText=text;m.level.setAttribute('aria-valuetext',text);}
    if(m.charge!==charge){
      m.charge=charge;m.nova.style.setProperty('--charge',charge+'%');
      m.nova.setAttribute('aria-label',charge===100?'Nova prête':'Nova en charge, '+charge+' %');
      m.nova.dataset.ready=charge===100?'oui':'non';
    }
  }
  const api=Object.freeze({sync});
  if(typeof window!=='undefined')window.SnakeInstruments=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
// Photogrammes d'une vraie partie. La carte reste consultable pendant le décodage.
(() => {
  'use strict';
  const width=336,height=154,count=40,columns=8,period=100;
  const names={1976:'Cellules du Terminal',1985:'Ricochets du Magnétron',1995:'Express du viaduc',2185:'Vol dans la ceinture',2985:'Écho de la Singularité'};
  function mount(canvas,button,options={}){
    const win=canvas.ownerDocument.defaultView,doc=canvas.ownerDocument;
    const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced=()=>motion.matches||Boolean(options.reduced?.());
    let year=null,source='',sheet=null,started=0,timer=null,frame=-1,mode='ready',sequence=0;
    const captions={ready:'Voir en action',loading:'Chargement…',play:'Arrêter',end:'Revoir',still:'Image suivante',error:'Réessayer'};
    function label(status){
      mode=status;button.textContent=captions[status];
      button.setAttribute('aria-label',captions[status]+' · '+year+' · '+names[year]);
      button.setAttribute('aria-busy',String(status==='loading'));
      button.setAttribute('aria-pressed',String(status==='play'));
    }
    function stopTimer(){
      if(timer!==null){win.clearTimeout(timer);timer=null;}
    }
    function paint(index){
      if(index===frame)return;
      frame=index;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(sheet,(index%columns)*width,Math.floor(index/columns)*height,width,height,0,0,width,height);
      canvas.hidden=false;
    }
    function step(){
      stopTimer();
      if(mode!=='play')return;
      if(doc.hidden){label('end');return;}
      const elapsed=Math.max(0,win.performance.now()-started);
      paint(Math.min(count-1,Math.floor(elapsed/period)));
      if(reduced()){label('still');return;}
      if(elapsed>=count*period){label('end');return;}
      timer=win.setTimeout(step,period-elapsed%period);
    }
    function start(){
      if(reduced()){paint(frame<0?0:(Math.floor(frame/10)+1)*10%count);label('still');return;}
      if(mode==='play'){stopTimer();label('end');return;}
      started=win.performance.now();label('play');step();
    }
    function press(){
      if(!names[year]||mode==='loading')return;
      if(sheet){start();return;}
      label('loading');const stamp=sequence,img=new win.Image();
      img.decoding='async';
      img.onload=()=>{
        if(stamp!==sequence)return;
        if(img.naturalWidth!==width*columns||img.naturalHeight!==height*count/columns){label('error');return;}
        sheet=img;
        if(doc.hidden){label('ready');return;}
        start();
      };
      img.onerror=()=>{if(stamp===sequence)label('error');};
      img.src=source;
    }
    function select(value,url){
      sequence++;stopTimer();sheet=null;frame=-1;year=value;source=url;
      canvas.hidden=true;label('ready');
    }
    function interrupt(){
      if(mode==='play'){stopTimer();label(reduced()?'still':'end');}
      else if(mode==='loading'){sequence++;label('ready');}
    }
    function visibility(){if(doc.hidden)interrupt();}
    function stacked(e){if(e.target.tagName==='DIALOG'&&e.target.open&&!e.target.contains(canvas))interrupt();}
    canvas.width=width;canvas.height=height;
    button.addEventListener('click',press);doc.addEventListener('visibilitychange',visibility);
    doc.addEventListener('toggle',stacked,true);motion.addEventListener('change',interrupt);
    return {select,interrupt,destroy(){
      sequence++;stopTimer();sheet=null;
      button.removeEventListener('click',press);doc.removeEventListener('visibilitychange',visibility);
      doc.removeEventListener('toggle',stacked,true);motion.removeEventListener('change',interrupt);
    }};
  }
  const api={mount};
  if(typeof window!=='undefined')window.SnakeApercus=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(() => {
  'use strict';
  const years=[1976,1985,1995,2185,2985],key='snake2985.voyage.v1';
  const script=typeof document==='undefined'?null:document.currentScript;
  const assets=script?.src?new URL(script.dataset?.musicRoot?'.':'../bifurcation/',script.src).href:'../bifurcation/';
  const extraitBase=script?.src?new URL(script.dataset?.musicRoot?'.':'../apercus/',script.src).href:'';
  const fmt=new Intl.NumberFormat('fr-FR');
  let cache={last:null,seen:[]},active=null;
  function stored(){
    try{
      const raw=JSON.parse(window.localStorage.getItem(key));
      if(raw&&Array.isArray(raw.seen)&&years.includes(raw.last)){
        for(const year of raw.seen)if(years.includes(year)&&!cache.seen.includes(year))cache.seen.push(year);
        if(!cache.last||!unsaved)cache.last=raw.last;
      }
    }catch{}
    return cache;
  }
  let unsaved=false;
  function visit(year){
    if(!years.includes(year))return false;
    const current=stored();current.last=year;
    if(!current.seen.includes(year))current.seen.push(year);
    try{window.localStorage.setItem(key,JSON.stringify(current));unsaved=false;}catch{unsaved=true;}
    return true;
  }
  function progress(records=[]){
    const visited=stored(),open=new Set([1976,...visited.seen]),info=new Map();
    let last=null,latest=-Infinity;
    for(const r of records){
      const y=Number(r?.year);if(!years.includes(y))continue;
      const row=info.get(y)||{score:0,cap:1,won:false};
      row.score=Math.max(row.score,Math.max(0,Number(r.score)||0));row.cap=Math.max(row.cap,Math.min(10,Number(r.difficulty)||1));
      const status=r.status??(r.cleared?'cleared':'dead');
      row.won ||=status==='cleared'||status==='won';info.set(y,row);open.add(y);
      if(['dead','cleared','won'].includes(status))for(const d of window.SnakeBifurcation.destinations(y,status))open.add(d.year);
      const at=Number(r.endedAt)||0;if(at>latest){latest=at;last=y;}
    }
    return {open,info,last:visited.last||last||1976};
  }
  function resume(records){return progress(records).last;}
  function open(options,onPick){
    if(active){active.focus();return active;}
    const {eras,records=[]}=options,eligible=progress(records),current=years.includes(options.year)?options.year:eligible.last;
    const source=options.assetBase??assets;
    let selected=current,closed=false;
    const before=document.activeElement,dlg=document.createElement('dialog');
    dlg.className='voyage-carte';dlg.setAttribute('aria-labelledby','voyage-titre');
    const el=(tag,cls,parent,txt)=>{const v=document.createElement(tag);if(cls)v.className=cls;if(txt)v.textContent=txt;parent.append(v);return v;};
    const top=el('header','vc-top',dlg),title=el('h2','',top,'Carte des époques');title.id='voyage-titre';
    const x=el('button','vc-fermer',top,'Fermer');x.type='button';
    const nav=el('div','vc-ligne',dlg);nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Époques');
    const panel=el('section','vc-panel',dlg);panel.id='voyage-detail';panel.setAttribute('role','tabpanel');
    const hero=el('div','vc-horizon',panel),image=el('img','',hero);image.alt='';
    const reel=el('canvas','vc-extrait',hero);reel.hidden=true;reel.setAttribute('aria-hidden','true');
    const place=el('h3','',hero);
    const play=el('button','vc-apercu',hero);play.type='button';
    const preview=window.SnakeApercus?.mount(reel,play,{reduced:options.reduced});
    if(!preview)play.hidden=true;
    const side=el('div','vc-fiche',panel), arsenal=el('p','vc-arsenal',side),history=el('p','vc-historique',side);
    const guard=el('p','vc-gardien',side);
    const launch=el('button','vc-depart',side);launch.type='button';
    const buttons=[];
    const name=y=>eras.find(e=>e.year===y);
    function paint(y,focus=false){
      if(!years.includes(y)||!name(y))return;
      if(!closed)preview?.select(y,(options.previewBase??extraitBase)+'apercu-'+y+'.webp');
      selected=y;const model=name(y),r=eligible.info.get(y),allowed=eligible.open.has(y);
      for(const tab of buttons){
        const on=tab.year===y;tab.node.tabIndex=on?0:-1;tab.node.setAttribute('aria-selected',String(on));
        if(on&&focus)tab.node.focus();
      }
      panel.setAttribute('aria-labelledby','voyage-date-'+y);place.textContent=model.name;
      image.src=source+'paysage-'+y+'.webp';
      arsenal.textContent=model.weapons.join(' · ');
      history.textContent=r?'Record '+fmt.format(r.score)+' pts · Cap '+r.cap+'/10':'Aucun record · 10 caps';
      const boss=r?.won?model.bosses?.[1]:r?.cap>=5?model.bosses?.[0]:null;
      guard.textContent=boss?'Gardien rencontré · '+boss:!allowed?'Une défaite antérieure ou la victoire précédente ouvre cette époque.':'';
      guard.hidden=!guard.textContent;
      launch.disabled=!allowed;
      launch.textContent=!allowed?'Époque verrouillée':r?'Battre mon record':'Partir en '+y;
      launch.setAttribute('aria-label',allowed?'Préparer '+y+' à zéro point':'Époque verrouillée');
    }
    for(const [i,y] of years.entries()){
      const tab=el('button','vc-date',nav);tab.type='button';tab.id='voyage-date-'+y;
      tab.dataset.locked=String(!eligible.open.has(y));tab.setAttribute('role','tab');tab.setAttribute('aria-controls','voyage-detail');
      tab.setAttribute('aria-label',y+', '+2**(i+1)+' bits, '+(eligible.open.has(y)?'accessible':'verrouillée, aperçu disponible'));
      const thumb=el('img','vc-mini',tab);thumb.alt='';thumb.src=source+'paysage-'+y+'.webp';
      const caption=el('span','vc-num',tab);el('strong','',caption,String(y));el('small','',caption,2**(i+1)+' bits');
      tab.addEventListener('click',()=>paint(y,true));buttons.push({year:y,node:tab});
    }
    function finish(){
      if(closed)return;closed=true;active=null;preview?.destroy();
      if(dlg.open)dlg.close();dlg.remove();if(before?.isConnected!==false)before?.focus?.();
    }
    launch.addEventListener('click',()=>{
      if(closed||!eligible.open.has(selected))return;
      const y=selected,record=eligible.info.get(y)?.score??null;
      finish();onPick?.({year:y,record});
    });
    x.addEventListener('click',finish);
    dlg.addEventListener('cancel',e=>{e.preventDefault();finish();});
    dlg.addEventListener('close',finish);
    dlg.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Escape'){e.preventDefault();finish();return;}
      if(!buttons.some(b=>b.node===e.target))return;
      const i=years.indexOf(selected);
      const n=({ArrowLeft:(i+4)%5,ArrowRight:(i+1)%5,Home:0,End:4})[e.key];
      if(n!==undefined){e.preventDefault();paint(years[n],true);}
    });
    document.body.append(dlg);paint(current);dlg.showModal();
    const focus=()=>buttons.find(b=>b.year===selected)?.node.focus();focus();
    active={root:dlg,focus,close:finish};return active;
  }
  const api={open,visit,resume,progress};
  if(typeof window!=='undefined')window.SnakeCarte=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
// La dernière image de l'époque quittée se défait devant la nouvelle chambre.
(() => {
  'use strict';
  const colors={1976:'#c6e89c',1985:'#ffaab7',1995:'#ffbf77',2185:'#9be0df',2985:'#d8b3f3'};
  let departure=null;
  function stop(canvas){
    departure=null;canvas.hidden=true;
  }
  function start(canvas,arena,from,to,reduced){
    stop(canvas);
    if(reduced||from===to||!arena.width||!arena.height)return;
    const still=document.createElement('canvas');
    still.width=Math.min(900,arena.width);
    still.height=Math.max(1,Math.round(still.width*arena.height/arena.width));
    still.getContext('2d').drawImage(arena,0,0,still.width,still.height);
    canvas.width=still.width;canvas.height=still.height;canvas.hidden=false;
    departure={still,from,to,start:performance.now()};
    draw(canvas,departure.start);
  }
  function draw(canvas,now){
    if(!departure)return;
    const {still,start,from,to}=departure;
    const f=Math.min(1,Math.max(0,(now-start)/740));
    if(f>=1){stop(canvas);return;}
    const w=canvas.width,h=canvas.height,c=canvas.getContext('2d');
    c.clearRect(0,0,w,h);
    const strips=16,step=Math.ceil(h/strips);
    for(let i=0;i<strips;i++){
      const y=i*step,sh=Math.min(step,h-y);if(sh<=0)break;
      const jitter=((i*7+from)%13)/13;
      const p=Math.max(0,Math.min(1,(f-jitter*.22)/.78));
      const dx=w*.75*p*p;
      c.globalAlpha=(1-p)*.89;
      c.drawImage(still,0,y,w,sh,dx,y,w,sh);
      c.fillStyle=i%2?colors[from]:colors[to];
      c.globalAlpha=4*p*(1-p)*.6;
      c.fillRect(dx,y,2+w*.014*(1-p),sh);
    }
    c.globalAlpha=1;
  }
  window.SnakePassage={start,draw,stop};
})();

;
// Aide consultée depuis la pause. Les dessins et l'arsenal proviennent de l'époque jouée.
(() => {
  'use strict';
  function node(parent,tag,text) {
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=text;
    parent.append(el);return el;
  }
  function open(state,era) {
    const focus=document.activeElement;
    const el=node(document.body,'dialog');
    el.className='snake-archives guide';el.setAttribute('aria-labelledby','guide-title');
    const top=node(el,'header');
    const title=node(top,'h2','Pilotage · '+state.year);title.id='guide-title';
    const close=node(top,'button','Fermer');close.type='button';
    close.addEventListener('click',()=>el.close());
    el.addEventListener('close',()=>{el.remove();focus?.focus();},{once:true});
    el.addEventListener('keydown',e=>e.stopPropagation());
    const controls=node(el,'div');controls.className='guide-nav';
    controls.setAttribute('role','group');controls.setAttribute('aria-label','Rubrique');
    const body=node(el,'div');body.className='guide-fiches';
    const tabs=[];
    function card(name,line,role,opts={}){
      const part=node(body,'section');
      if(role){
        const canvas=node(part,'canvas');canvas.width=100;canvas.height=58;
        canvas.setAttribute('aria-hidden','true');
        SnakeSprites.draw(canvas.getContext('2d'),role,state.year,{x:50,y:29,unit:1.5,viewportWidth:500,reduced:true,...opts});
      }
      node(part,'h3',name);node(part,'p',line);
    }
    function select(arsenal){
      tabs.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===Number(arsenal))));
      body.replaceChildren();
      if(arsenal){
        const technique=SnakeEvolution.describe(state.year,state.forge.core,state.forge.mod);
        card(technique.name,technique.gesture);
        card(SnakeForge.name(state.forge.core,state.forge.mod),technique.geometry+' '+technique.route);
        card(SnakeSurcharges.read(state).name,'Prends deux cellules entre deux tirs de nova. À pleine charge, touche Nova pour libérer la surcharge de cette époque.');
        card('Circuit fermé','Encercle un drone avec ton corps. Juste avant de croiser ta queue, change de plan pour décharger la boucle.');
        card(era.bosses[state.difficulty<=5?0:1],state.boss?SnakeGardiens.read(state).hint:'Les gardiens arrivent aux crans 5 et 10. Évite les cases marquées, puis frappe le cœur ouvert sur son plan.','boss',{kind:state.difficulty<=5?'mid':'final'});
      }else{
        card('Prends les cellules','Fais glisser le pouce gauche dans la direction du virage. Deux cellules te font avancer d’un cran.','head');
        card('Change de plan','Touche Plan du pouce droit pour passer au-dessus ou au-dessous des obstacles. Le reste du corps te suit.');
        card('Déclenche la nova','Ta forge tire seule. À pleine charge, touche Nova pour frapper autour de ta tête sur ton plan. Si ♪ s’allume au moment du tir, tu récupères 6 % de charge, même son coupé.');
        card('Quitte la grille','Traverse le portail. Garde le pouce sur le manche pour courber ta trajectoire et enfiler les anneaux.');
      }
    }
    for(const [i,label] of ['Commandes','Arsenal de '+state.year].entries()){
      const b=node(controls,'button',label);b.type='button';tabs.push(b);
      b.addEventListener('click',()=>select(Boolean(i)));
    }
    const keys=node(el,'p','Clavier · Flèches pour piloter, X pour le plan, Espace pour la nova, F pour surfer, T pour le turbo et P pour la pause.');
    keys.className='guide-clavier';select(false);el.showModal();close.focus();
  }
  window.SnakeGuide={open};
})();

;
(function(root){
  'use strict';
  const years=[1976,1985,1995,2185,2985];
  const defaults={1976:'Le Terminal',1985:'Le Circuit néon',1995:'La Gare de verre',2185:'La Ceinture orbitale',2985:'Le Cœur galactique'};
  const src=typeof document!=='undefined'?document.currentScript?.src:null;
  const base=src?new URL(src.endsWith('/epilogue/epilogue.js')?'../bifurcation/':'.',src).href:'';
  const fmt=new Intl.NumberFormat('fr-FR');
  const tripKey='snake2985.traversee.v1';
  const ranks={'Cœur frappé en surf':5,'Circuit de queue fermé':4,'Train doublé':4,'Slalom réussi':3,'Choc absorbé':2};
  function create(storage,resume=false){
    const v={route:[],gestures:[],current:null,storage};
    if(!storage)return v;
    try{
      if(!resume){storage.removeItem(tripKey);return v;}
      const data=JSON.parse(storage.getItem(tripKey));
      if(!Array.isArray(data?.route))return v;
      v.route=[...new Set(data.route.filter(y=>years.includes(y)))];
      if(Array.isArray(data.gestures))for(const g of data.gestures){
        if(g&&v.route.includes(g.year)&&Object.hasOwn(ranks,g.text)&&!v.gestures.some(old=>old.text===g.text))
          v.gestures.push({year:g.year,text:g.text,rank:ranks[g.text]});
      }
      v.gestures.sort((a,b)=>b.rank-a.rank);v.gestures.length=Math.min(2,v.gestures.length);
    }catch{ /* Une traversée neuve fonctionne aussi sans stockage. */ }
    return v;
  }
  function save(v){
    try{v.storage?.setItem(tripKey,JSON.stringify({route:v.route,gestures:v.gestures}));}catch{}
  }
  function start(v,s){
    if(!years.includes(s.year)||s.status!=='playing')return;
    v.current=s;
    if(!v.route.includes(s.year)){v.route.push(s.year);save(v);}
  }
  function observe(v,s,events){
    if(v.current!==s)return;
    for(const e of events){
      let text,rank;
      if(e.type==='bossHit' && e.weapon==='surf' && e.heart && e.damage>0){text='Cœur frappé en surf';rank=5;}
      else if(e.type==='knotClosed'){text='Circuit de queue fermé';rank=4;}
      else if(e.type==='flightEnd'&&e.success){text='Slalom réussi';rank=3;}
      else if(e.type==='ecoAbsorb'){text='Choc absorbé';rank=2;}
      else if(e.type==='score' && e.kind==='aiguillage' && e.points>0){text='Train doublé';rank=4;}
      else continue;
      const previous=v.gestures.find(g=>g.text===text);
      if(previous){if(previous.year!==s.year){previous.year=s.year;save(v);}continue;}
      if(v.gestures.length===2&&rank<=v.gestures[1].rank)continue;
      v.gestures.push({year:s.year,text,rank});
      v.gestures.sort((a,b)=>b.rank-a.rank);v.gestures.length=Math.min(2,v.gestures.length);save(v);
    }
  }
  function finish(v,s,row,hall){
    if(v.current!==s||s.status!=='won'||s.year!==2985||s.difficulty!==10)return null;
    if(!row||row.status!=='won'||row.year!==s.year||row.score!==s.score)return null;
    const prior=hall.list(2985).filter(r=>r.id!==row.id);
    const best=prior.reduce((n,r)=>n===null||r.score>n?r.score:n,null);
    return {year:s.year,score:s.score,previous:best,route:[...v.route],gestures:v.gestures.map(({year,text})=>({year,text}))};
  }
  function mount(host,summary,actions,options={}){
    const doc=host.ownerDocument,root=doc.createElement('section');
    root.className='vic-epilogue';root.dataset.reduced=String(!!options.reduced);
    const add=(parent,tag,cls,text)=>{
      const el=doc.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;parent.append(el);return el;
    };
    const header=add(root,'header','vic-head');
    const title=add(header,'h2','vic-title','Singularité vaincue');title.id='issue-partie';
    root.setAttribute('aria-labelledby',title.id);
    const report=add(header,'div','vic-score');
    add(report,'strong','',fmt.format(summary.score)+' pts');
    const diff=summary.previous===null?null:summary.score-summary.previous;
    const delta=diff===0?'égalé':(diff>0?'+':'−')+fmt.format(Math.abs(diff))+' pts';
    const caption=diff===null?'Premier score en 2985':'Record précédent '+fmt.format(summary.previous)+' · '+delta;
    add(report,'span','vic-record',caption);
    const route=add(root,'ol','vic-route');route.setAttribute('aria-label','Époques jouées dans cette traversée');
    for(const [i,year] of summary.route.entries()){
      const stop=add(route,'li','vic-stop');stop.dataset.year=String(year);
      stop.style.setProperty('--delay',i*75+'ms');
      const img=add(stop,'img','vic-land');img.src=(options.assetBase??base)+'paysage-'+year+'.webp';img.alt='';
      const label=add(stop,'span','vic-date',String(year));label.setAttribute('aria-label',year+' · '+defaults[year]);
    }
    if(summary.gestures.length){
      const hit=add(root,'ul','vic-gestures');hit.setAttribute('aria-label','Gestes réalisés');
      for(const g of summary.gestures)add(hit,'li','',g.text+' · '+g.year);
    }
    const nav=add(root,'div','vic-actions');let done=false;
    function action(text,fn,commit=false){
      const b=add(nav,'button','',text);b.type='button';b.addEventListener('click',()=>{
        if(done)return;if(commit)done=true;fn();
      });return b;
    }
    const sign=action('Signer le palmarès',()=>{sign.focus();actions.onHall();doc.querySelector('dialog.snake-archives[open] form input')?.focus();});
    if(actions.onRetry)action('Rejouer 2985',actions.onRetry,true);
    const next=action('Nouveau cycle · 1976',actions.onCycle,true);next.className='vic-primary';
    host.append(root);
    return {root,focus:()=>next.focus(),destroy(){done=true;root.remove();}};
  }
  const api={create,start,observe,finish,mount};if(typeof module==='object')module.exports=api;else root.SnakeEpilogue=api;
})(typeof window!=='undefined'?window:globalThis);

;
(() => {
  'use strict';
  function capabilities(doc,win){
    const root=doc.documentElement,nav=win.navigator;
    const ios=/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
    const standalone=Boolean(nav.standalone)||win.matchMedia('(display-mode: standalone)').matches;
    const full=!!(doc.fullscreenElement||doc.webkitFullscreenElement);
    const request=doc.fullscreenEnabled&&root.requestFullscreen?()=>root.requestFullscreen():
      doc.webkitFullscreenEnabled&&root.webkitRequestFullscreen?()=>root.webkitRequestFullscreen():null;
    return {ios,standalone,full,request};
  }
  function mount(button,doc=document,win=window){
    let busy=false;
    const update=()=>{
      const c=capabilities(doc,win);
      button.hidden=c.standalone||(!c.ios&&!c.full&&!c.request);
      const label=c.full?'Quitter le plein écran':'Plein écran';
      button.title=label;button.setAttribute('aria-label',label);
    };
    function help(ios){
      if(doc.querySelector('.immersion-aide[open]'))return;
      const dlg=doc.createElement('dialog');dlg.className='snake-archives immersion-aide';
      const head=doc.createElement('header'),h=doc.createElement('h2'),close=doc.createElement('button');
      h.id='titre-immersion';h.textContent='Jouer en plein écran';
      close.type='button';close.textContent='Fermer';close.onclick=()=>dlg.close();
      head.append(h,close);dlg.append(head);dlg.setAttribute('aria-labelledby',h.id);
      if(ios){
        const list=doc.createElement('ol');
        for(const line of ['Dans Safari, touche Partager. Selon la disposition, il se trouve dans le menu de la page.',
          'Choisis « Sur l’écran d’accueil », puis active « Ouvrir comme app web ».','Touche Ajouter et lance SNAKE 2985 depuis son icône.']){
          const item=doc.createElement('li');item.textContent=line;list.append(item);
        }
        dlg.append(list);
      }else{
        const line=doc.createElement('p');line.textContent='Utilise la commande de plein écran du navigateur pour agrandir l’arène.';dlg.append(line);
      }
      dlg.addEventListener('close',()=>{dlg.remove();button.focus();},{once:true});
      doc.body.append(dlg);dlg.showModal();close.focus();
    }
    async function press(){
      if(busy)return;
      const c=capabilities(doc,win);
      busy=true;
      try{
        if(c.full){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;await exit?.call(doc);}
        else if(c.request)await c.request();
        else if(c.ios&&!c.standalone)help(true);
      }catch{help(c.ios);}
      finally{busy=false;update();}
    }
    button.addEventListener('click',press);
    doc.addEventListener('fullscreenchange',update);doc.addEventListener('webkitfullscreenchange',update);
    update();
  }
  const api={mount,capabilities};
  if(typeof window!=='undefined')window.SnakeImmersion=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(function (root) {
  'use strict';
  const bits = {1976: 2, 1985: 4, 1995: 8, 2185: 16, 2985: 32};

  function query(win){
    const media=win.matchMedia('(orientation:portrait)');
    const portrait=()=>win.innerWidth&&win.innerHeight?win.innerHeight>=win.innerWidth:media.matches;
    let last=portrait();
    const events=new win.EventTarget();
    function refresh(){
      const next=portrait();if(next===last)return;
      last=next;events.dispatchEvent(new win.Event('change'));
    }
    win.addEventListener('resize',refresh);
    win.addEventListener('orientationchange',refresh);
    win.visualViewport?.addEventListener('resize',refresh);
    media.addEventListener('change',refresh);
    return {get matches(){return portrait();},addEventListener:(...args)=>events.addEventListener(...args),
      removeEventListener:(...args)=>events.removeEventListener(...args)};
  }
  function mount(dialog, {query, year, screen, pause, primary, calm = () => false}) {
    const doc = dialog.ownerDocument;
    const date = dialog.querySelector('#vertical-date');
    let saved = null;

    function refresh() {
      if (query.matches) {
        const current = year();
        dialog.dataset.year = current;
        date.textContent = bits[current] ? current + ' · ' + bits[current] + ' bits' : '';
        dialog.toggleAttribute('data-calm', calm());
        if (dialog.open) return;
        const field = doc.activeElement;
        const playing = screen() === 'play';
        if (playing) pause();
        const target = playing || field === doc.body ? primary() : field;
        const selection = target && typeof target.selectionStart === 'number'
          ? [target.selectionStart, target.selectionEnd, target.selectionDirection] : null;
        saved = {target, selection};
        dialog.showModal();
        return;
      }
      if (!dialog.open) return;
      dialog.close();
      const {target, selection} = saved || {};
      saved = null;
      const destination = target?.isConnected && !target.closest('[hidden],[inert],dialog:not([open])') && !target.disabled
        ? target : primary();
      destination?.focus({preventScroll: true});
      if (destination === target && selection) target.setSelectionRange(...selection);
    }
    function cancel(event) {event.preventDefault();}
    function stopKey(event) {event.stopPropagation();}
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('keydown', stopKey);
    query.addEventListener('change', refresh);
    refresh();
    dialog.dataset.ready = '';
    return {refresh};
  }
  root.SnakeOrientation = Object.freeze({mount,query});
  if (typeof module === 'object' && module.exports) module.exports = root.SnakeOrientation;
})(globalThis);

;
(function(root){
  'use strict';
  const range=0x100000000;
  const advance=word=>(Math.imul(1664525,word)+1013904223)>>>0;
  function stream(seed){
    if(!Number.isInteger(seed)||seed<0||seed>=range)throw new RangeError('Graine uint32 attendue.');
    let next=seed;
    return {peek:()=>next,random(){
      const word=next;next=advance(word);return word/range;
    }};
  }
  function create(entropy=Math.random){
    let active=null;
    function begin(year,{retry=false}={}){
      if(!Number.isInteger(year))throw new RangeError('Année civile attendue.');
      let seed;
      if(!active){
        const sample=entropy();
        if(!Number.isFinite(sample)||sample<0||sample>=1)throw new RangeError('Source aléatoire hors intervalle.');
        seed=Math.floor(sample*range);
      }else if(retry&&active.year===year){
        seed=active.seed;
      }else{
        seed=active.cursor.peek();
        // A menu may change eras without the previous game requesting any random number.
        if(seed===active.seed)seed=advance(seed);
      }
      const cursor=stream(seed);active={year,seed,cursor};
      return {seed,random:cursor.random};
    }
    return {begin};
  }
  const api=Object.freeze({create,random:seed=>stream(seed).random});
  if(typeof module==='object')module.exports=api;
  if(typeof window!=='undefined')root.SnakeRevanche=api;
})(typeof window!=='undefined'?window:globalThis);

;
(function(){
 'use strict';
 const seen=new WeakMap();
 function before(s){
   let m=seen.get(s);
   if(!m){m={grade:0,midAlive:false,recoveryEnd:0,armed:false};seen.set(s,m);}
   if(m.midAlive&&!s.boss)m.recoveryEnd=s.elapsed+4;
   m.midAlive=s.boss?.kind==='mid';
   if(m.grade!==s.difficulty){m.grade=s.difficulty;m.armed=s.difficulty>=7&&s.difficulty<=9;}
   if(!m.armed||s.boss||s.flight||s.status!=='playing'||s.nearBoss>=.84||
      s.elapsed<m.recoveryEnd||['boss','recovery'].includes(s.director.phase)||!s.ecologie)return false;
   m.armed=false;
   if(s.ecologie.wave)return false;
   const due=s.elapsed+(.95-.18*(s.difficulty-7));
   if(s.ecologie.due<=due)return false;
   s.ecologie.due=due;return true;
 }
 window.SnakeRelance={before};
})();

;
(() => {
  'use strict';
  // Time is monotonic milliseconds. Call advance at a frame or immediately before a real command.
  function create(simulate,hz=60){
    const frequency=typeof hz==='function'?hz:()=>hz;
    function period(){
      const h=frequency();
      if(!Number.isFinite(h)||h<=0)throw RangeError('Fréquence positive requise');
      return 1000/h;
    }
    let last=null,credit=0,generation=0;
    function reset(now=null){last=Number.isFinite(now)?now:null;credit=0;generation++;}
    function advance(now){
      if(!Number.isFinite(now))return 0;
      if(last===null){last=now;return 0;}
      if(now<=last)return 0;
      credit+=Math.min(80,now-last);last=now;
      let count=0;const token=generation;
      // Recorded frame stamps in this experiment are rounded to 0.1 ms. Preserve half a
      // quantum of signed debt to avoid losing a full display refresh to a 0.03 ms roundoff.
      for(let ms=period();credit+.0500001>=ms;ms=period()){
        credit-=ms;count++;
        if(simulate(ms/1000, now-credit)===false || generation!==token){if(generation===token)reset(now);break;}
      }
      return count;
    }
    return {advance,reset};
  }
  const api={create};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.SnakeCadence=api;
})();

;
(() => {
  'use strict';
  // cadence() returns 0 for the display refresh rate, milliseconds for a preview, or null to sleep.
  function create(render,cadence,host=window) {
    const doc=host.document;
    let raf=null,timer=null,generation=0,dirty=false,drawing=false,closed=false,resumed=true,away=false;
    let covered=!!doc.querySelector('dialog[open]');
    function cancel() {
      generation++;
      if(raf!==null)host.cancelAnimationFrame(raf);
      if(timer!==null)host.clearTimeout(timer);
      raf=timer=null;
    }
    function sleep(){cancel();dirty=true;resumed=true;}
    function nextFrame(){
      if(raf!==null || closed || away || doc.hidden || covered)return;
      const token=generation;
      raf=host.requestAnimationFrame(function frame(now){
        if(token!==generation||closed)return;
        raf=null;
        if(away||doc.hidden||covered){sleep();return;}
        const repaint=dirty, first=resumed;
        dirty=resumed=false;drawing=true;
        try {render(now,repaint,first);} finally {drawing=false;}
        if(closed||away||doc.hidden||covered)return;
        if(dirty){nextFrame();return;}
        const delay=cadence();
        if(delay===0){nextFrame();return;}
        if(!Number.isFinite(delay)||delay<=0)return;
        // Time spent painting counts toward the preview period.
        const wait=Math.max(0,now+delay-host.performance.now());
        timer=host.setTimeout(()=>{
          if(token!==generation || closed)return;
          timer=null;nextFrame();
        },wait);
      });
    }
    function wake(){
      if(closed)return;
      dirty=true;
      if(timer!==null){host.clearTimeout(timer);timer=null;generation++;}
      if(!drawing)nextFrame();
    }
    function visibility(){
      covered=!!doc.querySelector('dialog[open]');
      if(doc.hidden||covered)sleep();
      else wake();
    }
    function dialog(e){if(e.target?.tagName==='DIALOG')visibility();}
    function pagehide(){away=true;sleep();}
    function pageshow(){away=false;resumed=true;visibility();}
    host.addEventListener('resize',wake);
    host.addEventListener('pageshow',pageshow);
    host.addEventListener('pagehide',pagehide);
    doc.addEventListener('visibilitychange',visibility);
    doc.addEventListener('toggle',dialog,true);
    doc.addEventListener('close',dialog,true);
    // Some engines dispatch close but omit toggle when showModal() opens a dialog.
    const observer=host.MutationObserver && new host.MutationObserver(changes=>{
      if(changes.some(change=>change.target.tagName==='DIALOG'))visibility();
    });
    if(observer)observer.observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
    function destroy(){
      observer?.disconnect();
      closed=true;cancel();
      host.removeEventListener('resize',wake);
      host.removeEventListener('pageshow',pageshow);
      host.removeEventListener('pagehide',pagehide);
      doc.removeEventListener('visibilitychange',visibility);
      doc.removeEventListener('toggle',dialog,true);
      doc.removeEventListener('close',dialog,true);
    }
    return {wake,destroy};
  }

  // Both the preparation screen and the satellite workshop use the same bench instance.
  function preview(base,wake) {
    let current=null;
    function select(canvas,year,core,mod,reduced){
      current={canvas,year,core,mod,reduced};
      base.select(canvas,year,core,mod,reduced);wake();
    }
    function motion(reduced){
      if(current && current.reduced!==reduced){
        const {canvas,year,core,mod}=current;select(canvas,year,core,mod,reduced);
      }
    }
    function stop(){base.stop();current=null;wake();}
    return {select,motion,stop,frame:now=>base.frame(now),get animated(){return !!current && !current.reduced;}};
  }
  const api={create,preview};
  if(typeof window!=='undefined')window.SnakeVeille=api;
  if(typeof module!=='undefined')module.exports=api;
})();

;
(() => {
  'use strict';
  const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
  SnakeSurf.install();
  const knot=SnakeKnot.install(window.SnakeArcade,SnakeEvolution.install(window.SnakeForge),{mode:'exact'});
  const equipped=SnakeSurcharges.install(knot.engine,knot.forge);
  window.SnakeForge=equipped.forge;
  const arcade=equipped.engine,forge=equipped.forge,audio=SnakeCampagneSon,archives=SnakeArchives;
  const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let manualCalm=false;
  try{manualCalm=localStorage.getItem('snake2985.calme')==='1';}catch{}
  const calm={get matches(){return manualCalm||systemMotion.matches;}};
  const portrait=SnakeOrientation.query(window);
  let state = arcade.create();
  const revanche=SnakeRevanche.create();
  let screen = 'prep', selected = {core: 'orbit', mod: 'blast'};
  let tripStorage;
  try{tripStorage=window.sessionStorage;}catch{}
  let voyage=SnakeEpilogue.create(tripStorage,true);
  let hints=SnakeLecture.create(), nextHint=0,menuFinal=null;
  let activeFlight = false, pointer = null, held = new Set(), until = 0, target = null;
  const ticks=SnakeCadence.create(simuler,()=>state.flight?120:60);
  const veille=SnakeVeille.create(frame,()=>{
    if(screen==='play'||(screen==='prep'&&!ui.passage.hidden))return 0;
    if((screen==='prep'||screen==='upgrade')&&banc.animated&&!calm.matches)return 40;
    return null;
  });
  const banc=SnakeVeille.preview(SnakeBanc,veille.wake);
  const directions = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const controls = LabControls.createInput(action => {
    if (screen !== 'play') return;
    if (action.type === 'turn') arcade.turn(state,action.x,action.y);
    if (action.type === 'aim') aimOnScreen(action.angle);
  });
  function aimOnScreen(angle) {
    const renderer=window.SnakeSpectacle,field=ui.monde;
    const cap=SnakePilotage.cap(renderer.project,renderer.camera(state,state.elapsed,calm.matches),
      state.snake[0],state.plane,angle,field.clientWidth/renderer.width,field.clientHeight/renderer.height);
    SnakeFlight.aim(state,cap.x,cap.y);
  }
  function defense(s,dt){SnakeEquilibre.tick(s,dt,SnakeGardiens.tick);}
  function menaces(s,dt){SnakeSingularite.tick(s,dt,defense);}
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  function button(parent, label, callback, primary = false) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = label;
    if (primary) el.className = 'action';
    el.addEventListener('click',callback); parent.append(el); return el;
  }
  function note(label, seconds = 2, danger = false) {
    ui['compte-contrat'].hidden=true;ui.message.textContent=label; until=state.elapsed+seconds;
    ui.lecture.dataset.tone=danger?'danger':'normal';
  }
  function resetTouch() {
    if(pointer?.owner.hasPointerCapture(pointer.id))pointer.owner.releasePointerCapture(pointer.id);
    controls.reset(); pointer=null; held.clear();
    ui.stick.firstElementChild.style.transform='';
  }
  function show(page, title = '', explanation = '', stamp) {
    menuFinal?.destroy();menuFinal=null;
    ui.bifurcation.hidden=page!=='end';ui['acces-borne'].hidden=page!=='prep';
    ui.rideau.setAttribute('aria-labelledby',page==='end'?'issue-partie':'titre');
    if(page!=='prep')SnakePassage.stop(ui.passage);
    banc.stop();screen=page; document.body.dataset.screen=page;
    resetTouch(); ui.rideau.hidden=page==='play';
    ui.bandeau.inert=ui.pouces.inert=page!=='play';
    ui.pouces.hidden=page!=='play';
    if (page!=='play') {
      ui.titre.textContent=title; ui.explication.textContent=explanation;
      ui.rang.textContent=state.year+' · '+arcade.eras[state.eraIndex].name;
      ui.options.replaceChildren(); ui.validations.replaceChildren();
    }
    if(page==='pause'||page==='upgrade')audio.pause(stamp/1000);
    if(page==='play')audio.resume();
    ticks.reset(page==='play'?performance.now():null);veille.wake();
  }
  function loadHorizon(session){
    SnakeMatieres.load(session.year).then(ready=>{if(ready&&state===session)veille.wake();});
  }
  window.addEventListener('online',()=>{if(!SnakeMatieres.ready(state.year))loadHorizon(state);});
  function preparation(epoch=0,resume=false,retry=false) {
    audio.stop();
    const course=revanche.begin(arcade.eras[epoch].year,{retry});
    state=arcade.create(course.random,epoch);SnakeCarte.visit(state.year);
    loadHorizon(state);
    state.director=SnakeDirector.create();state.initiation=SnakeInitiation.create('facultatif',0); archives.newRun(state,{resume}); hints=SnakeLecture.create();nextHint=0; activeFlight=false;
    controls.configure({mode:'stick',flying:false});
    show('prep','Arme ton serpent.');
    ui.rang.textContent=state.year+' · '+({1976:'2 bits',1985:'4 bits',1995:'8 bits',2185:'16 bits',2985:'32 bits'})[state.year]+' · '+arcade.eras[epoch].name;
    const choice=(key, items, label)=>{
      const row=document.createElement('div'); row.className='groupe'; row.setAttribute('role','group'); row.setAttribute('aria-label',label);
      ui.options.append(row);
      for (const item of items) {
        const choose=()=>{ selected[key]=item.id; for(const b of row.children) b.setAttribute('aria-pressed',String(b.dataset.id===item.id)); update(true); };
        const b=button(row,item.name,choose); b.dataset.id=item.id; b.setAttribute('aria-pressed',String(selected[key]===item.id));
      }
    };
    const update=(preview=false)=>{
      ui.titre.textContent=forge.name(selected.core,selected.mod);
      ui.explication.textContent=forge.cores.find(c=>c.id===selected.core).description+' '+forge.mods.find(m=>m.id===selected.mod).description;
      SnakeForge.equip(state,selected.core,selected.mod);
      if(preview)banc.select(ui.vitrine,state.year,selected.core,selected.mod,calm.matches);
    };
    choice('core',forge.cores,'Noyau'); choice('mod',forge.mods,'Catalyseur'); update();
    const launch=(sound)=>{
      SnakeEpilogue.start(voyage,state);audio.start(state.year);
      if(sound)void audio.setMuted(false);
      show('play');note('Prends la cellule devant toi.',3.2);
    };
    button(ui.validations,'Jouer en silence',()=>launch(false),true);
    if(!audio.muteLocked)button(ui.validations,'Avec musique',()=>launch(true));
    const discover=button(ui.options,'Parcours découverte',()=>{
      if(SnakeInitiation.prepare(state.initiation)){
        discover.setAttribute('aria-pressed','true');discover.textContent='Parcours découverte activé';
      }
    });
    discover.className='apprendre';discover.setAttribute('aria-pressed','false');
    button(ui.validations,'Palmarès',archives.openHall);
    if(archives.offer(state)){
      const wagerButton=button(ui.validations,'Miser de la nova',()=>{
        if(archives.wager(state)){wagerButton.textContent='Mise engagée';wagerButton.disabled=true;}
      });
    }
  }
  function volumeControl(label,value,setting) {
    const line=document.createElement('label'),input=document.createElement('input');
    line.className='mixage'; line.append(label);
    input.type='range'; input.min=0;input.max=100;input.value=Math.round(value*100);
    input.addEventListener('input',()=>audio.setVolumes({[setting]:Number(input.value)/100}));
    line.append(input);ui.options.append(line);
  }
  function pause() {
    if(screen!=='play')return;
    show('pause','Pause.',forge.name(state.forge.core,state.forge.mod));
    button(ui.validations,'Reprendre',()=>{if(!portrait.matches && !document.hidden)show('play')},true);
    const turbo=button(ui.validations,state.turbo?'Turbo actif':'Turbo ×2',()=>{
      arcade.turbo(state,!state.turbo);turbo.textContent=state.turbo?'Turbo actif':'Turbo ×2';
      turbo.setAttribute('aria-pressed',String(state.turbo));
    });
    turbo.setAttribute('aria-pressed',String(state.turbo));
    button(ui.validations,'Palmarès',archives.openHall);
    button(ui.validations,'Pilotage',()=>SnakeGuide.open(state,arcade.eras[state.eraIndex]));
    if(!audio.muteLocked){
      volumeControl('Musique',audio.musicLevel,'music');volumeControl('Bruitages',audio.fxLevel,'fx');
      volumeControl('Stéréo des tirs',audio.spaceLevel,'space');
    }
    const motion=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.checked=manualCalm||systemMotion.matches;check.disabled=systemMotion.matches;
    check.addEventListener('change',()=>{manualCalm=check.checked;banc.motion(calm.matches);veille.wake();try{localStorage.setItem('snake2985.calme',manualCalm?'1':'0');}catch{}});
    motion.className='option-calme';motion.append(check,'Réduire les secousses et les glitches');ui.options.append(motion);
  }
  function upgrade(stamp) {
    if(SnakeAtelier.available(state)){
      show('upgrade','Atelier satellite','Garde ta recette ou remplace son cœur.',stamp);
      SnakeAtelier.mount(ui.options,state,{forge,banc,archives,reduced:calm.matches,onDone(receipt){
        selected={core:receipt.core,mod:receipt.mod};upgrade();
      }});
      return;
    }
    show('upgrade','Une arme de plus.','Choisis le système à amplifier.',stamp);
    const row=document.createElement('div');row.className='ameliorations';ui.options.append(row);
    const gains=['Étend les salves sur les lignes voisines.','Enchaîne les cibles depuis ton corps.','Agrandit l’onde et accélère sa recharge.'];
    arcade.weapons.forEach((w,i)=>{
      const choice=button(row,'',()=>{
        if(arcade.upgrade(state,w.id)){show('play');note(w.description);}
      });
      for(const [tag,value] of [['strong',arcade.eras[state.eraIndex].weapons[i]],['small','Niv. '+(state.levels[w.id]+1)+' · '+gains[i]]]){
        const label=document.createElement(tag);label.textContent=value;choice.append(label);
      }
    });
  }
  function finish(stamp) {
    const dead=state.status==='dead', era=state.eraIndex;
    const entry=archives.end(state),bilan=SnakeEpilogue.finish(voyage,state,entry,SnakePalmares);
    audio.finish(state.status,stamp/1000);
    show('end',dead?'Signal perdu.':'Gardien vaincu.',(dead?(archives.death(state)?.tip||state.cause)+' · ':'')+state.score+' points en '+state.year+'.');
    const depart=({year,cycle})=>{
      target=cycle?null:state.score;
      if(cycle){archives.abandon();voyage=SnakeEpilogue.create(tripStorage);}
      else archives.jump(state,year);
      SnakePassage.start(ui.passage,ui.monde,state.year,year,calm.matches);
      preparation(arcade.eras.findIndex(e=>e.year===year));
    };
    const retry=()=>{archives.abandon();target=state.score;preparation(era,false,true);};
    if(bilan){
      menuFinal=SnakeEpilogue.mount(ui.bifurcation,bilan,{
        onHall:archives.openHall,onRetry:retry,onCycle:()=>depart({year:1976,cycle:true})
      },{reduced:calm.matches});
      menuFinal.focus();return;
    }
    const records={};
    for(const row of SnakePalmares.list())records[row.year]=Math.max(records[row.year]||0,row.score);
    menuFinal=SnakeBifurcation.mount(ui.bifurcation,{
      year:state.year,status:state.status,score:state.score,records,cause:dead?state.cause:'',
      boss:state.boss?.name||(dead?'':arcade.eras[era].bosses[1]),...archives.bande(state)
    },{
      onJump:depart,onRetry:retry,
      onReview:()=>archives.openReplay(()=>calm.matches)
    });
    const title=menuFinal.root.querySelector('.bf-title');title.id='issue-partie';
    const row=document.createElement('div');row.className='titre-saut';title.replaceWith(row);row.append(title);
    button(row,'Signer · Palmarès',archives.openHall);
    menuFinal.focus();
  }
  function events(stamp) {
    SnakeMondeVivant.observe(state);
    const batch=state.events.splice(0);SnakeEpilogue.observe(voyage,state,batch);audio.events(batch,state,stamp/1000);
    for(const e of batch){
      SnakeImpact.event(state,e);SnakeMondeVivant.observe(state,e);
      if(e.type==='forgeShot')SnakeBouche.event(state,e);
      if(!calm.matches)SnakeCameraMusicale.cue(state,e,state.beat);
      if(e.type==='singularitySplit')note(e.beacons.length?'Relie les deux balises ou esquive la salve.':'Esquive la salve, puis riposte.',2.4,true);
      if(e.type==='singularityBeacon')note('Une balise reliée · Change de plan !',2,true);
      if(e.type==='singularityOpen')note(e.route==='balises'?'Salve désarmée · Frappe le cœur !':'Ouverture · Riposte !',1.8,true);
      if(e.type==='novaOverload')note(SnakeSurcharges.read(state).name,1.6);
      if(e.type==='novaSync'){
        const name=batch.some(event=>event.type==='novaOverload')?SnakeSurcharges.read(state).name:'Nova';
        note(name+' en rythme · +'+Math.round(e.refund*100)+' %',1.6);
      }
      if(e.type==='surfGate')note('Onde du gardien · Rejoins son bord',1.7,true);
      if(e.type==='surfStart')note('Suis la crête · Impulsion sur la salve',2);
      if(e.type==='surfPulse')note('Vise le cœur !',1.2);
      if(e.type==='knotClosed')note('Circuit fermé · Arc de queue',2);
      if(e.type==='ecoAbsorb')note('Deux anneaux sacrifiés · tu survis',2);
      if(e.type==='planeShift')note(state.plane?'Grille haute':'Grille basse',1);
      if(e.type==='flightGate')note('Franchis la porte pour voler.',2.4);
      if(e.type==='flightStart')note('Vol libre · Vise les trois anneaux.',3);
      if(e.type==='flightRing')note('Anneau '+e.passed+' / '+e.goal,1);
      if(e.type==='flightEnd')note(e.success?'Slalom réussi · +'+e.points:'Retour sur grille',2);
      if(e.type==='boss')note('Gardien · Cherche son ouverture.',2.5,true);
      if(e.type==='guardianWarning')note(e.hint,2,true);
      if(e.type==='guardianCounter')note('Cœur ouvert · Riposte !',e.seconds,true);
      if(e.type==='bossAttack')note(state.boss?.attack?.label||'Salve imminente',1.2,true);
    }
    if(state.status==='upgrade')upgrade(stamp);
    if(['cleared','won','dead'].includes(state.status))finish(stamp);
  }
  function syncGuardian(){
    const b=state.boss,approaching=!b&&state.nearBoss>=.70;
    ui.duel.hidden=screen!=='play'||(!b&&!approaching);
    if(ui.duel.hidden)return;
    const names=arcade.eras[state.eraIndex].bosses;
    const target=state.nextBossKind==='final'?10:5;
    const cells=Math.max(1,(target-state.difficulty)*state.sectorGoal-state.sectorCells);
    text(ui['nom-garde'],b?b.name:names[target===10?1:0]);
    const split=b&&SnakeSingularite.read(state);
    const defenseText=split?.phase==='split'?(split.points.length?'Balise '+(split.index+1)+'/2 · ou esquive':'Esquive la salve'):(b?.weak?'Cœur ouvert':'Bouclier actif');
    text(ui['etat-garde'],b?defenseText:'À '+cells+(cells===1?' cellule':' cellules'));
    ui.integrite.hidden=!b;
    if(b){
      const pct=Math.ceil(100*b.hp/b.maxHp),str=String(pct);
      if(ui.integrite.getAttribute('aria-valuenow')!==str){
        ui.integrite.setAttribute('aria-valuenow',str);ui.integrite.firstElementChild.style.width=pct+'%';
      }
      ui.duel.dataset.weak=b.weak?'yes':'no';
    }
  }
  function syncBeat(stamp){
    state.beat=audio.pulseAt(stamp/1000);state.musicPulse=state.beat.pulse;
  }
  function actualiseCommande(){
    if(screen==='play'){
      const now=performance.now();ticks.advance(now);
      if(screen==='play')syncBeat(now);
    }
    return screen==='play';
  }
  function toggleTurbo(){
    if(actualiseCommande()&&arcade.turbo(state,!state.turbo))note(state.turbo?'Turbo · Score doublé':'Vitesse normale',1.2);
  }
  function sync() {
    syncGuardian();text(ui.son,audio.muted?'Muet':'Son');
    const speed=state.turbo?'true':'false';
    if(ui.turbo.getAttribute('aria-pressed')!==speed){
      ui.turbo.setAttribute('aria-pressed',speed);ui.turbo.setAttribute('aria-label',state.turbo?'Désactiver le turbo':'Activer le turbo');
      text(ui.turbo,state.turbo?'Turbo ×2':'Turbo');
    }
    ui.son.disabled=audio.muteLocked;ui.son.setAttribute('aria-pressed',String(!audio.muted));ui.son.setAttribute('aria-label',audio.muteLocked?'Son verrouillé par le lien':audio.muted?'Activer le son':'Couper le son');
    text(ui.date,String(state.year));text(ui.niveau,state.difficulty+' / 10');
    text(ui.points,String(state.score).padStart(6,'0'));
    const surf=SnakeSurf.read(state);ui.surf.hidden=!(surf?.pulse||surf?.accessible);
    if(!ui.surf.hidden)text(ui.surf,surf.pulse?'Impulsion':'Surfer');
    text(ui.plan.lastElementChild,'Plan '+(1+state.plane));
    const overload=SnakeSurcharges.read(state);
    const hot=screen==='play'&&overload.ready;
    if(hot && ui.nova.dataset.charged!=='yes')note(overload.name+' · Nova prête',1.6);
    const marker=hot?'yes':'no';
    if(ui.nova.dataset.charged!==marker){
      ui.nova.dataset.charged=marker;
      ui.nova.setAttribute('aria-description',hot?overload.name:'Déclenche une onde autour de la tête.');
    }
    SnakeSynchroNova.paint(ui.nova,state,screen==='play'?state.beat:null,calm.matches);
    text(ui.nova.lastElementChild,hot?'Surcharge':Math.floor(state.novaCharge*100)+' %');
    SnakeInstruments.sync(state,screen,calm.matches);
    const pilot=state.flight?'Vol · '+state.flight.passed+'/'+state.flight.goal:forge.name(state.forge.core,state.forge.mod);
    text(ui.partenaire,screen==='play'?(archives.label(state)||(target===null?pilot:pilot+' · À battre '+target)):'');
    if(screen==='play' && state.elapsed>=nextHint){
      nextHint=state.elapsed+.06;
      const cue=SnakeLecture.read(hints,state).primary;
      const offer=state.director.offer;
      const timed=offer?.phase==='active'&&cue?.kind==='target'&&state.elapsed>=until&&!state.aide?.text;
      ui['compte-contrat'].hidden=!timed;
      if(timed)text(ui['compte-contrat'],Math.max(1,Math.ceil(state.director.remaining))+' s');
      if(cue && (cue.kind==='danger'||state.elapsed>=until)){
        ui.lecture.dataset.tone=cue.kind==='danger'?'danger':'normal';
        text(ui.message,cue.kind==='target' && state.aide?.text?state.aide.text:cue.text);
      }
    }else if(screen!=='play'){text(ui.message,'');ui['compte-contrat'].hidden=true;}
  }
  function syncFlightControls(){
    if(Boolean(state.flight)!==activeFlight) {
      activeFlight=Boolean(state.flight); controls.configure({flying:activeFlight,angle:state.flight?.angle||0});
      if(pointer){
        const base={id:pointer.id,t:performance.now(),zone:'pilot'};
        controls.route({...base,phase:'down',x:pointer.x,y:pointer.y});
        controls.route({...base,phase:'move',x:pointer.lastX,y:pointer.lastY});
      }else ui.stick.firstElementChild.style.transform='';
    }
  }
  function action(which){
    if(!actualiseCommande())return;
    if(which==='surf'){if(SnakeSurf.action(state))events();return;}
    if(which==='plane'){ const old=state.plane; arcade.shiftPlane(state); if(state.plane!==old)note(state.plane?'Grille haute':'Grille basse',1); }
    if(which==='nova' && SnakeSynchroNova.fire(state,audio.pulse(),arcade.fire))note('Nova',.7);
  }
  ui.carte.addEventListener('click',()=>{
    if(screen!=='prep')return;
    SnakeCarte.open({reduced:()=>calm.matches,year:state.year,eras:arcade.eras,records:SnakePalmares.list()},({year,record})=>{
      archives.abandon();target=record;SnakePassage.start(ui.passage,ui.monde,state.year,year,calm.matches);
      preparation(arcade.eras.findIndex(era=>era.year===year));
    });
  });
  SnakeGestes.bind(ui.turbo,toggleTurbo);
  SnakeGestes.bind(ui.pause,()=>{if(actualiseCommande())pause();});
  SnakeGestes.bind(ui.son,()=>{if(screen==='play')void audio.setMuted(!audio.muted);});
  SnakeGestes.bind(ui.plan,()=>action('plane'));
  SnakeGestes.bind(ui.nova,()=>action('nova'));
  SnakeGestes.bind(ui.surf,()=>action('surf'));
  function touch(phase,e){
    if(!actualiseCommande())return;
    if(phase==='down'){
      if(pointer)return;
      pointer={id:e.pointerId,owner:e.currentTarget,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if(!pointer||e.pointerId!==pointer.id)return;
    e.preventDefault();
    pointer.lastX=e.clientX;pointer.lastY=e.clientY;
    controls.route({phase,id:e.pointerId,x:e.clientX,y:e.clientY,t:e.timeStamp,zone:'pilot'});
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,k=Math.min(1,20/(Math.hypot(dx,dy)||1));
    ui.stick.firstElementChild.style.transform='translate('+dx*k+'px,'+dy*k+'px)';
    if(phase==='up'||phase==='cancel'){pointer=null;ui.stick.firstElementChild.style.transform='';}
  }
  for(const el of [ui.stick,ui.monde]) for(const [event,phase] of [['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','cancel'],['lostpointercapture','cancel']])el.addEventListener(event,e=>touch(phase,e));
  document.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]'))return;
    if(e.key==='Escape'&&screen==='pause'){if(!document.hidden&&!portrait.matches)show('play'); return}
    if(!actualiseCommande())return;
    if(e.key==='Escape'||e.code==='KeyP'){e.preventDefault();pause();return}
    if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)action('surf');return;}
    if(e.code==='KeyT'){e.preventDefault();if(!e.repeat)toggleTurbo();return}
    if(e.code==='KeyX'||e.code==='Space'){e.preventDefault();if(!e.repeat)action(e.code==='KeyX'?'plane':'nova');return}
    if(!directions[e.key])return;
    e.preventDefault();held.add(e.key);
    if(!state.flight && !e.repeat)arcade.turn(state,...directions[e.key]);
  });
  document.addEventListener('keyup',e=>{if(held.has(e.key)){actualiseCommande();held.delete(e.key);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
  window.addEventListener('blur',()=>{if(screen==='play')pause()});
  systemMotion.addEventListener('change',()=>{banc.motion(calm.matches);veille.wake();});
  function simuler(dt,stamp){
    syncBeat(stamp);
    if(state.flight && held.size){
      let x=0,y=0; for(const key of held){x+=directions[key][0];y+=directions[key][1];}
      if(x||y)aimOnScreen(Math.atan2(y,x));
    }
    if(['boss','recovery'].includes(state.director.phase))state.spawnClock=Math.max(.15,state.spawnClock);
    SnakeRelance.before(state);
    SnakeEcologie.tick(state,dt,menaces);
    const encounter=SnakeDirector.tick(state.director,state,dt);
    state.score+=encounter.points;SnakeEpilogue.observe(voyage,state,encounter.events);
    for(const cue of encounter.events){
      audio.encounter(cue);
      if(cue.type==='open' && !state.flight)note(SnakeIndices.labels[cue.kind]||'Rejoins la balise.',1.8);
      if(cue.type==='score')note('Trajectoire réussie · +'+cue.points);
    }
    SnakeInitiation.update(state.initiation,state,dt,state.events);
    state.aide=SnakeInitiation.cue(state.initiation,state);
    archives.tick(state);events(stamp);
    syncFlightControls();
    return screen==='play'&&state.status==='playing';
  }
  function frame(now,repaint,resumed){
    if(screen==='play'){
      if(resumed)ticks.reset(now);
      ticks.advance(now);
      if(screen==='play')syncBeat(now);
      if(screen==='play')audio.scene(state.year,state.difficulty,state.nearBoss,state.boss?.kind);
    }
    sync();if(screen==='prep'){
      if(calm.matches&&!ui.passage.hidden)SnakePassage.stop(ui.passage);
      else SnakePassage.draw(ui.passage,now);
    }
    if(screen==='prep'||screen==='upgrade')banc.frame(now);
    const frameKey=screen==='prep'?screen+'-'+state.year+'-'+SnakeMatieres.ready(state.year):screen;
    if(repaint||screen==='play'||ui.monde.dataset.frame!==frameKey){
      SnakeSpectacle.draw(ui.monde,state,state.elapsed,calm.matches);
      ui.monde.dataset.frame=frameKey;
    }
  }
  preparation(arcade.eras.findIndex(era=>era.year===(archives.resumeYear()??SnakeCarte.resume(SnakePalmares.list()))),true);
  SnakeImmersion.mount(ui.immersif);
  SnakeOrientation.mount(ui.vertical,{
    query:portrait,year:()=>state.year,screen:()=>screen,pause,calm:()=>calm.matches,
    primary:()=>ui.validations.querySelector('button.action')||ui.validations.querySelector('button')
  });
  veille.wake();
})();
