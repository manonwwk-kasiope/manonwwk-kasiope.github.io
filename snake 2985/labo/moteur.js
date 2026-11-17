(() => {
  'use strict';

  const WIDTH = 36;
  const HEIGHT = 18;
  const CELLS_PER_SECTOR = 2;
  const eras = [
    { year: 1976, name: 'Le Terminal', weapons: ['Bit perforant', 'Relais à étincelle', 'Impulsion cathodique'], bosses: ['Le Registre', 'Le Mainframe'], railRange: 12, railPower: 1, lanes: 0, arcRange: 2.7, chains: 0, blast: 4, blastPower: 3 },
    { year: 1985, name: 'Le Circuit néon', weapons: ['Canon photonique', 'Bobine Tesla', 'Onde chromatique'], bosses: ['Le Magnétron', 'Le Cyclope'], railRange: 18, railPower: 2, lanes: 0, arcRange: 3.3, chains: 0, blast: 5, blastPower: 5 },
    { year: 1995, name: 'La Gare autoroutière', weapons: ['Canon à pixels', 'Aiguillage électrique', 'Onde bitume'], bosses: ['Le Signal fantôme', 'La Locomotive Spectre'], railRange: 23, railPower: 3, lanes: 1, arcRange: 4.0, chains: 1, blast: 6.2, blastPower: 7 },
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
    const damage = boss.weak ? amount * 2 : Math.max(1, Math.floor(amount * .45));
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
