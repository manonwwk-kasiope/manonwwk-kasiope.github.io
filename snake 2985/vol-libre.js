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
