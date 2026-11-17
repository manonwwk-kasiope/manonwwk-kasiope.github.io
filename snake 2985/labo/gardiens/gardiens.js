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
