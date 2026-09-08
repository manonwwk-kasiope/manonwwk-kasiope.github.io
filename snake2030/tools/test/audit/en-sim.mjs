// Simulations accélérées : ennemis / boss / niveaux.
// usage : node en-sim.mjs <nRuns> <mode: nominal|fast|god> <cards> <maxT s> <out.json>
import { launchSim, runOne } from './sim-lib.mjs';
import { PROBE_SRC, summarize } from './en-probe.mjs';
import fs from 'node:fs';

const [nRuns = '6', mode = 'nominal', cards = 'greedy', maxTs = '420', out = 'en-sim.out.json'] = process.argv.slice(2);
const OUT = '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad/';

const { browser, page } = await launchSim('phone');
await page.evaluate(PROBE_SRC);
await page.evaluate(() => { window.__simBatch = 12; });

const results = [];
for (let i = 0; i < +nRuns; i++) {
  await page.evaluate((mode) => {
    const M = window.__M, S = window.__S;
    window.__EP.reset();
    if (mode === 'fast' || mode === 'god') {
      for (const d of M.levels.defs) { d.dur.calm = 3; d.dur.rise = 6; d.dur.surge = 8; }
    }
    window.__EPGOD = (mode === 'god');
    if (!window.__EPGODT) {
      window.__EPGODT = true;
      (function g(){ requestAnimationFrame(g); if (window.__EPGOD && S.phase === 'play' && S.snake && S.snake.len < 12) { S.snake.len = 30; S.snake.hp = 30; if (S.snake.maxHp < 30) S.snake.maxHp = 30; } })();
    }
  }, mode);
  const w0 = Date.now();
  const r = await runOne(page, { diff: 1, pilot: 'dodge', cards, maxT: +maxTs * 1000 });
  const L = await page.evaluate(() => window.__EP.L);
  const sum = summarize(L);
  const wall = (Date.now() - w0) / 1000;
  console.log(`run ${i}: survie ${sum.dur}s (wall ${wall.toFixed(0)}s) niveau ${r.level}/${r.lph} kills ${r.kills} hurts ${sum.hurts} boss ${JSON.stringify(sum.boss.map(b => [b.name, b.outcome, b.dur, b.hurts]))} levels ${JSON.stringify(sum.levels.map(l => [l.level, l.t, l.bossSurvivors, l.enemiesCarried]))}`);
  console.log('   sources:', JSON.stringify(sum.bySrc));
  results.push({ run: i, level: r.level, lph: r.lph, kills: r.kills, score: r.score, up: r.up, L, sum });
}
fs.writeFileSync(OUT + out, JSON.stringify(results));
await browser.close();
