'use strict';
// Exécuter « node labo/mesure-forge.cjs » depuis le dossier du jeu.
// Banc déterministe : mêmes formations pour chaque recette ; dégâts du moteur.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function load(code, symbol) {
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  return ctx.window[symbol];
}
const source = fs.readFileSync(path.join(root, 'forge.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(__dirname, 'moteur.js'), 'utf8');
const engine = load(engineSource.replace('window.SnakeArcade = {', 'window.SnakeArcade = {forgeHooks,enterBoss,'), 'SnakeArcade');
const a = load(source, 'SnakeForge');
const b = load(source.replace('echo ? 2.8 : 2.1', 'echo ? 3.7 : 3.1').replace('[-.58, 0, .58]', '[-.32, 0, .32]').replace('radius: 3.5', 'radius: 2.5'), 'SnakeForge');
function run(forge, core, mod, scenario, offset) {
  const s = engine.create(() => .42, 3);
  s.forge = undefined;
  s.plane = 0;
  s.snake[0] = { x: 10, y: 9, plane: 0 };
  s.drones = [];
  s.events.length = 0;
  if (scenario.startsWith('boss')) {
    s.difficulty = 10;
    engine.enterBoss(s);
    Object.assign(s.boss, { x: 13 + offset, y: 9, plane: 0, weak: scenario === 'bossOuvert' });
  } else {
    for (const [i, [dx, dy]] of [[2,0],[3,1],[4,-1],[5,0],[6,2],[7,-2]].entries()) {
      const p = { x: 10 + dx + offset, y: 9 + dy };
      s.drones.push({ ...p, id: i + 100, plane: 0, next: p });
      if (scenario === 'double') s.drones.push({ ...p, id: i + 106, plane: 1, next: p });
    }
  }
  forge.init(s, { core, mod });
  let peak = 0, otherHits = 0;
  const hp = s.boss?.hp || 0;
  const hooks = engine.forgeHooks(s);
  const damage = hooks.damage;
  hooks.damage = (t,n) => {
    if (t.plane !== s.plane) otherHits++;
    damage(t,n);
  };
  for (let frame = 0; frame < 360; frame++) {
    // Un déplacement latéral et un retour en six secondes.
    s.snake[0].y = 9 + Math.round(Math.sin(frame / 360 * Math.PI * 2));
    forge.update(s, 1/60, hooks);
    const f = s.forge;
    peak = Math.max(peak, f.effects.length + f.orbits.length + f.projectiles.length);
  }
  return { kills: s.kills, hp: hp - (s.boss?.hp || 0), otherHits, peak };
}
const average = (rows, key) => +(rows.reduce((n,r) => n+r[key],0)/rows.length).toFixed(2);
const rows = [];
for (const [variant,forge] of [['A',a],['B',b]]) for (const {id:core} of forge.cores) for (const {id:mod} of forge.mods) {
  const row = { variant,core,mod }; let peak = 0;
  for (const scene of ['pack','bossOuvert','bossBouclier','double']) {
    const runs = [-1,0,1,2].map(offset => run(forge,core,mod,scene,offset));
    row[scene] = average(runs,scene.startsWith('boss')?'hp':'kills');
    if (runs.some(r=>r.kills > 6)) throw new Error("Double élimination");
    if (runs.some(r=>r.otherHits)) throw new Error('Tir interplan');
    peak = Math.max(peak,...runs.map(r=>r.peak));
  }
  rows.push({ ...row, peak });
}
console.table(rows);
