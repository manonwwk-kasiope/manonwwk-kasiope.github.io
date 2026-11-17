(() => {
  'use strict';

  const WIDTH = 36;
  const HEIGHT = 18;
  const CELLS_PER_SECTOR = 2;
  const eras = [
    { year: 1976, name: 'Le Terminal', weapons: ['Bit perforant', 'Relais à étincelle', 'Impulsion cathodique'], bosses: ['Le Registre', 'Le Mainframe'], railRange: 12, railPower: 1, lanes: 0, arcRange: 2.7, chains: 0, blast: 4, blastPower: 3 },
    { year: 1985, name: 'Le Circuit néon', weapons: ['Canon photonique', 'Bobine Tesla', 'Onde chromatique'], bosses: ['Le Magnétron', 'Le Cyclope'], railRange: 18, railPower: 2, lanes: 0, arcRange: 3.3, chains: 0, blast: 5, blastPower: 5 },
    { year: 2185, name: 'La Ceinture orbitale', weapons: ['Lance héliosphère', 'Foudre orbitale', 'Puits de gravité'], bosses: ['Le Pulsar', 'L’Éclipse'], railRange: 28, railPower: 4, lanes: 1, arcRange: 4.7, chains: 2, blast: 7.4, blastPower: 10 },
    { year: 2985, name: 'Le Cœur galactique', weapons: ['Faisceau quasar', 'Réseau de pulsars', 'Supernova stellaire'], bosses: ['Le Dévoreur', 'La Singularité'], railRange: 36, railPower: 5, lanes: 2, arcRange: 5.7, chains: 3, blast: 9, blastPower: 14 },
  ];
  const signatures = [
    ['Balayage binaire', 'Banques de mémoire'],
    ['Pôles jumeaux', 'Visée en croix'],
    ['Anneau de pulsar', 'Portes gravitationnelles'],
    ['Prisme diagonal', 'Effondrement fractal'],
  ];
  const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const weapons = [
    { id: 'rail', name: 'Rail triple', description: 'Étend le rail aux deux lignes voisines, puis accélère ses salves et élargit sa portée latérale.' },
    { id: 'arc', name: 'Arc voltaïque', description: 'Un anneau foudroie le drone le plus proche du corps. Les niveaux suivants enchaînent les cibles.' },
    { id: 'nova', name: 'Supernova', description: 'Agrandit l’onde de choc et accélère sa recharge. Sa portée augmente aussi avec ta longueur.' },
  ];

  const equal = (a, b) => a.x === b.x && a.y === b.y;
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const squared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const inside = p => p.x >= 0 && p.x < WIDTH && p.y >= 0 && p.y < HEIGHT;
  const advance = (p, d) => ({ x: p.x + d.x, y: p.y + d.y });

  function announce(s, type, data = {}) {
    if (s.events.length >= 96) s.events.shift();
    s.events.push({ type, ...data });
  }

  function effect(s, kind, point, life, radius) {
    s.effects.push({ x: point.x, y: point.y, kind, life, maxLife: life, radius });
  }

  function beam(s, from, to, kind) {
    const life = kind === 'arc' ? 0.24 : 0.16;
    s.shots.push({ x: from.x, y: from.y, toX: to.x, toY: to.y, kind, life, maxLife: life });
  }

  function tune(s) {
    s.normalStepTime = 0.100 + (0.144 - 0.01 * s.eraIndex) * Math.pow(0.88, s.difficulty - 1);
    s.stepTime = s.normalStepTime * (s.turbo ? 0.6 : 1);
    s.novaRadius = Math.min(37, eras[s.eraIndex].blast + (s.snake.length - 5) * 0.31 + 2.25 * s.levels.nova);
  }

  function create(rng = Math.random, eraIndex = 0) {
    eraIndex = Number.isInteger(eraIndex) && eras[eraIndex] ? eraIndex : 0;
    const snake = Array.from({ length: 5 }, (_, i) => ({ x: 9 - i, y: 9 }));
    const s = {
      width: WIDTH, height: HEIGHT, rng, status: 'playing', cause: '',
      snake, previousSnake: snake.slice(), direction: { x: 1, y: 0 }, turns: [],
      progress: 0, elapsed: 0, stepTime: 0, stepClock: 0, normalStepTime: 0, turbo: false,
      eraIndex, year: eras[eraIndex].year, difficulty: 1, sector: 1, sectorGoal: CELLS_PER_SECTOR,
      sectorCells: 0, nearBoss: 0, rift: null, riftUsed: false, bonus: null, finishers: [], nextBossKind: 'mid', bossKind: null, boss: null,
      score: 0, kills: 0, eaten: 0, levels: { rail: 0, arc: 0, nova: 0 },
      novaCharge: 1, novaRadius: 0, gunClock: 0.52, spawnClock: 1, nextId: 1,
      cells: [{ x: 13, y: 9 }, { x: 7, y: 4 }, { x: 25, y: 12 }],
      drones: [], shots: [], effects: [], events: [],
    };
    tune(s);
    spawnDrone(s, { x: 18, y: 3 });
    spawnDrone(s, { x: 26, y: 8 });
    return s;
  }

  // A bounded scan also works when the arena is almost full or the injected RNG repeats.
  function freeTile(s, allowed) {
    const area = WIDTH * HEIGHT;
    const offset = Math.floor(s.rng() * area) % area;
    for (let i = 0; i < area; i++) {
      const cell = (offset + i * 137) % area;
      const p = { x: cell % WIDTH, y: Math.floor(cell / WIDTH) };
      const occupied = (s.rift && equal(p, s.rift)) || (s.boss && inHull(p, s.boss)) || s.snake.some(q => equal(p, q)) || s.cells.some(q => equal(p, q))
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
    if (!options.length) return { x: drone.x, y: drone.y };
    const ranked = options.map(p => ({ p, cost: distance(p, head) + s.rng() * 3.5 }));
    ranked.sort((a, b) => a.cost - b.cost);
    return ranked[0].p;
  }

  function spawnDrone(s, at) {
    const p = at || freeTile(s, tile => distance(tile, s.snake[0]) >= 7);
    if (!p) return;
    const moveEvery = 0.64 + 0.97 * Math.pow(0.86, s.sector - 1) + s.rng() * 0.22;
    const drone = { ...p, id: s.nextId++, next: p, warmup: 0.85, moveIn: moveEvery, moveEvery };
    s.drones.push(drone);
    drone.next = planDrone(s, drone);
    effect(s, 'spawn', p, 0.75, 1);
  }

  function turn(s, dx, dy) {
    if (s.status !== 'playing' || !Number.isInteger(dx) || !Number.isInteger(dy)
      || Math.abs(dx) + Math.abs(dy) !== 1 || s.turns.length >= 2) return false;
    const last = s.turns[s.turns.length - 1] || s.direction;
    if (last.x * dx + last.y * dy !== 0) return false;
    s.turns.push({ x: dx, y: dy });
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
    return Math.abs(point.x - center.x) <= 1 && Math.abs(point.y - center.y) <= 1;
  }

  function hullDistanceSquared(point, center) {
    const x = Math.max(0, Math.abs(point.x - center.x) - 1);
    const y = Math.max(0, Math.abs(point.y - center.y) - 1);
    return x * x + y * y;
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
    if (!options.length) return { x: boss.x, y: boss.y };
    const rank = p => Math.abs(p.x - gx) + Math.abs(p.y - gy)
      + (p.x === boss.x && (boss.moves + s.eraIndex) % 3 !== 0 ? .15 : 0)
      + (boss.previous && equal(p, boss.previous) ? 1.2 : 0);
    options.sort((a, b) => rank(a) - rank(b));
    return options[0];
  }

  function enterBoss(s) {
    // The farthest unoccupied hull appears away from the head, never around the snake.
    const head = s.snake[0], final = s.difficulty === 10;
    const wing = head.x < WIDTH / 2 ? WIDTH - 8 : 7;
    const entryLane = flightLanes[(s.eraIndex + (final ? 1 : 0)) % flightLanes.length];
    let start = null, best = -Infinity;
    for (let y = 3; y < HEIGHT - 3; y++) {
      for (let x = 3; x < WIDTH - 3; x++) {
        const p = { x, y };
        if (s.snake.some(q => inHull(q, p)) || s.cells.some(q => inHull(q, p))) continue;
        const desirability = Math.min(13, distance(p, head)) - Math.abs(x - wing) * .30 - Math.abs(y - entryLane) * .42;
        if (desirability > best) { best = desirability; start = p; }
      }
    }
    if (!start) return;
    const kind = s.difficulty === 5 ? 'mid' : 'final';
    const tech = eras[s.eraIndex];
    const maxHp = kind === 'mid' ? 16 + 10 * s.eraIndex : 36 + 17 * s.eraIndex;
    const name = tech.bosses[kind === 'mid' ? 0 : 1];
    const moveEvery = (kind === 'mid' ? 1.23 : 1.05) - .06 * s.eraIndex;
    s.boss = {
      ...start, id: s.nextId++, name, kind, hp: maxHp, maxHp, weak: false, stun: 0,
      signature: signatures[s.eraIndex][kind === 'mid' ? 0 : 1], riftOffered: false,
      moves: 0, next: start, previous: null, moveIn: moveEvery, moveEvery,
      plane: flightPlane(start.y), waypoint: start.x >= WIDTH / 2 ? 0 : (kind === 'mid' ? 1 : 2),
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
      s.status = s.eraIndex === eras.length - 1 ? 'won' : 'cleared';
      s.turns.length = 0;
      s.progress = 1;
      announce(s, s.status === 'won' ? 'win' : 'clear', { eraIndex: s.eraIndex, year: s.year });
    }
  }

  // With no guaranteed exit from a warned line in the next few turns, delay the volley.
  function canEscape(s, danger) {
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
    const head = s.snake[0], tiles = [], signature = boss.signature;
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
        if (hit) tiles.push({ x, y });
      }
    }
    return tiles;
  }

  function aim(s, boss) {
    const axis = (boss.volleys + s.eraIndex) % 2 === 0 ? 'column' : 'row';
    const tiles = patternTiles(s, boss, axis);
    const danger = new Set(tiles.map(p => p.y * WIDTH + p.x));
    if (!canEscape(s, danger)) {
      boss.attackClock = .25;
      return;
    }
    const warning = (boss.kind === 'mid' ? 1.68 : 1.50) - .065 * s.eraIndex;
    boss.attack = {
      axis, line: axis === 'row' ? s.snake[0].y : s.snake[0].x,
      tiles, danger, pattern: boss.signature, label: boss.signature,
      phase: 'warning', remaining: warning, total: warning,
    };
    boss.weak = false;
    boss.volleys++;
    announce(s, 'bossAttack', { kind: boss.kind, pattern: boss.signature });
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
        boss.previous = { x: boss.x, y: boss.y };
        boss.x = boss.next.x;
        boss.y = boss.next.y;
        boss.plane = flightPlane(boss.y);
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
      announce(s, 'bossVolley', { kind: boss.kind, pattern: boss.signature });
      attack.total = .33 + .025 * s.eraIndex;
      attack.remaining = attack.total;
    }
    if (attack.phase !== 'active') return;
    if (attack.remaining <= 0) {
      boss.attack = null;
      boss.weak = true;
      announce(s, 'recover', { kind: boss.kind });
      offerRift(s, boss);
      boss.attackClock = (boss.kind === 'mid' ? 2.7 : 2.1) - .12 * s.eraIndex;
      return;
    }
    const head = s.snake[0];
    if (attack.danger.has(head.y * WIDTH + head.x)) death(s, boss.name, head);
  }

  function shoot(s) {
    const tech = eras[s.eraIndex];
    const head = s.snake[0], dir = s.direction;
    const lanes = Math.min(4, tech.lanes + Math.ceil(s.levels.rail / 2));
    const targets = [];
    let railHit = false;
    for (let i = -lanes; i <= lanes; i++) {
      const from = { x: head.x + i * dir.y, y: head.y - i * dir.x };
      if (!inside(from)) continue;
      const to = {
        x: Math.max(0, Math.min(WIDTH - 1, from.x + dir.x * (tech.railRange + 2 * s.levels.rail))),
        y: Math.max(0, Math.min(HEIGHT - 1, from.y + dir.y * (tech.railRange + 2 * s.levels.rail))),
      };
      beam(s, from, to, 'rail');
      if (s.boss && insideRay(from, to, s.boss, 1)) railHit = true;
      for (const drone of s.drones) {
        if (drone.warmup <= 0 && insideRay(from, to, drone, 0)) targets.push(drone);
      }
    }
    removeDrones(s, targets);
    announce(s, 'shot', { kind: 'rail', x: head.x, y: head.y });
    if (railHit) hurtBoss(s, tech.railPower + s.levels.rail, 'rail');
    if (s.status !== 'playing' || !s.levels.arc) return;
    let origins = s.snake;
    const arcTargets = [];
    const conductors = s.boss ? [...s.drones, s.boss] : s.drones;
    const reach = tech.arcRange + Math.sqrt(s.levels.arc);
    for (let link = 0; link < s.levels.arc + tech.chains; link++) {
      let hit = null, source = null, nearest = reach * reach + 0.01;
      for (const drone of conductors) {
        if (drone.warmup > 0 || arcTargets.includes(drone)) continue;
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
    removeDrones(s, s.drones.filter(d => squared(d, origin) <= s.novaRadius ** 2));
    if (s.boss && hullDistanceSquared(origin, s.boss) <= s.novaRadius ** 2)
      hurtBoss(s, eras[s.eraIndex].blastPower + 2 * s.levels.nova, 'nova');
    return true;
  }

  function collect(s, item, head) {
    s.cells.splice(item, 1);
    s.eaten++;
    s.score += 125 * s.sector * (s.turbo ? 2 : 1);
    s.novaCharge = Math.min(1, s.novaCharge + 0.20);
    effect(s, 'cell', head, 0.38, 1.2);
    announce(s, 'cell', { ...head, eaten: s.eaten });
    tune(s);
    const replacement = freeTile(s);
    if (replacement) s.cells.push(replacement);
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
      if (equal(d.next, s.snake[0])) { death(s, 'Drone', s.snake[0]); return; }
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

  function step(s, dt) {
    s.elapsed += dt;
    age(s.shots, dt); age(s.effects, dt);
    const rechargeTime = 4 + (12 - s.eraIndex * 1.05) / (1 + s.levels.nova * 0.6);
    s.novaCharge = Math.min(1, s.novaCharge + dt / rechargeTime);
    s.gunClock -= dt;
    if (s.gunClock <= 0) {
      shoot(s);
      s.gunClock += 0.20 + (0.75 - s.eraIndex * 0.07) / (1 + 0.075 * (s.snake.length - 5) + 0.48 * s.levels.rail);
    }
    if (s.status !== 'playing') return;
    s.stepClock += dt;
    if (s.stepClock + 1e-10 >= s.stepTime) {
      s.stepClock = Math.max(0, s.stepClock - s.stepTime);
      march(s);
      if (s.status !== 'playing') return;
    }
    s.progress = Math.min(1, s.stepClock / s.stepTime);
    if (s.boss) updateBoss(s, dt);
    if (s.status !== 'playing') return;
    moveDrones(s, dt);
    if (s.status !== 'playing') return;
    s.spawnClock -= dt;
    if (s.spawnClock <= 0) {
      if (!s.boss && s.drones.length < Math.min(14, 2 + s.difficulty + s.eraIndex)) spawnDrone(s);
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

  window.SnakeArcade = { create, turn, turbo, tick, fire, upgrade, weapons, eras };
})();
