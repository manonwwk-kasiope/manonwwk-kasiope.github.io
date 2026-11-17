'use strict';
// Parties courtes totalement simulées par le tick du moteur de recherche.
// La batterie standard et le renfort automatique sont désactivés pour isoler la forge.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'forge.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(__dirname, 'moteur.js'), 'utf8');
const ctx = { window:{} };
// B augmente l’orbite, resserre le prisme et rétrécit le puits.
const candidate = process.argv.includes('--variante-b')
  ? code.replace('echo ? 2.8 : 2.1','echo ? 3.7 : 3.1').replace('[-.58, 0, .58]','[-.32, 0, .32]').replace('radius: 3.5','radius: 2.5')
  : code;
vm.runInNewContext(candidate,ctx);
const forge = ctx.window.SnakeForge;
vm.runInNewContext(engineSource,ctx);
const engine = ctx.window.SnakeArcade;
const formations = {
  front: [[4,0],[6,1],[5,-2],[8,2],[7,-1],[9,0]],
  flanc: [[2,2],[0,3],[3,3],[-2,-3],[3,-2],[5,-4]],
  mixte: [[-3,2],[3,-2],[7,0],[2,4],[0,-4],[6,2]],
};
function pilot(s, tick) {
  const p = s.snake[0], d = s.direction;
  if (d.x === 1 && p.x >= 21) engine.turn(s,0,1);
  else if (d.y === 1 && p.y >= 13) engine.turn(s,-1,0);
  else if (d.x === -1 && p.x <= 10) engine.turn(s,0,-1);
  else if (d.y === -1 && p.y <= 9) engine.turn(s,1,0);
  if (tick === 100 || tick === 205) engine.shiftPlane(s);
}
function simulate(core,mod,formation,seed) {
  const rng = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0) / 4294967296);
  const s = engine.create(rng,3);
  const head = s.snake[0];
  s.drones = formation.map(([dx,dy],i) => {
    const p = { x: head.x+dx, y: head.y+dy, plane: i === 4 || i === 5 ? 1 : 0 };
    return { ...p, id: i+100, warmup:0, moveIn:.35+i*.15, moveEvery:.75+rng()*.35, next:{...p} };
  });
  s.cells = []; s.gunClock = s.spawnClock = 1000;
  if (core) forge.equip(s,core,mod);
  else s.forge.clock = 1000;
  const first = [];
  for (let t = 0; t < 360 && s.status === 'playing'; t++) {
    pilot(s,t);
    engine.tick(s,1/60);
    for (const e of s.events.splice(0)) if (e.type === 'forgeHit') first.push(t/60);
  }
  return { kills:s.kills, alive:s.status === 'playing', first:first[0] };
}
const rows=[];
for (const [core,mod] of [[null,null], ...forge.cores.flatMap(c=>forge.mods.map(m=>[c.id,m.id]))]) {
  const row = { core:core || 'témoin',mod };
  const all=[];
  for (const [name,formation] of Object.entries(formations)) {
    const runs = Array.from({length:12},(_,i)=>simulate(core,mod,formation,128+i));
    all.push(...runs);
    row[name] = +(runs.reduce((a,r)=>a+r.kills,0)/runs.length).toFixed(2);
  }
  row.survies = all.filter(r=>r.alive).length + '/' + all.length;
  const firstHits=all.filter(r=>Number.isFinite(r.first)).map(r=>r.first).sort((a,b)=>a-b);
  row.premierImpactMedian = firstHits.length ? +firstHits[Math.floor(firstHits.length/2)].toFixed(2) : null;
  rows.push(row);
}
console.table(rows);
