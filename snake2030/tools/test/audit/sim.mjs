// Campagne de simulations parallèles.
// usage : node sim.mjs <config.json> <out.jsonl> [workers]
// config : { cells: [ { name, diff, pilot, cards, n, maxT, build?, unlocks?, kind? } ] }
import fs from 'node:fs';
import { launchSim, runOne } from './sim-lib.mjs';

const [cfgPath, outPath, workersArg] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const workers = +(workersArg || 3);
const jobs = [];
for (const c of cfg.cells) for (let i = 0; i < c.n; i++) jobs.push({ ...c, i });
fs.writeFileSync(outPath, '');
let done = 0; const t0 = Date.now();

function compact(r, job) {
  const L = r.L; const t0r = L.t0 || 0;
  const rel = t => Math.round((t - t0r));
  return {
    cell: job.name, i: job.i, diff: job.diff, pilot: job.pilot, cards: job.cards, build: job.build || null, unlocks: job.unlocks || null,
    dur: rel(L.tEnd), aborted: !!L.aborted, score: r.score, kills: r.kills, level: r.level, lph: r.lph, coins: r.coins, len: r.len, maxHp: r.maxHp,
    up: r.up, ultMax: r.ultMax, powers: r.powers,
    cardsLog: L.cards.map(c => ({ t: rel(c.t), offered: c.offered, picked: c.picked, len: c.len, kills: c.kills, level: c.level })),
    hits: L.hits.map(h => ({ t: rel(h.t), from: h.from, to: h.to, level: h.level, lph: h.lph, en: h.enemies, boss: h.boss })),
    levels: L.levels.map(l => ({ t: rel(l.t), level: l.level })),
    boss: L.boss.map(b => ({ t: rel(b.t), level: b.level, name: b.name, hp: b.hp })),
    ults: L.ults.map(u => ({ t: rel(u.t), en: u.enemies })),
    powers_t: L.powers.map(p => ({ t: rel(p.t), kills: p.kills, owned: p.owned })),
    phases: L.phases.map(p => ({ t: rel(p.t), level: p.level, ph: p.ph })),
    specials: L.specials.length,
    samples: L.samples.map(s => ({ ...s, t: rel(s.t) }))
  };
}

async function worker(id) {
  const { browser, page } = await launchSim(cfg.kind || 'phone');
  try {
    while (jobs.length) {
      const job = jobs.shift();
      try {
        const r = await runOne(page, { diff: job.diff, pilot: job.pilot, cards: job.cards, maxT: job.maxT || 600000, build: job.build || null, unlocks: job.unlocks || null, noCards: !!job.noCards, god: !!job.god, level: job.level || 0 });
        const c = compact(r, job);
        fs.appendFileSync(outPath, JSON.stringify(c) + '\n');
        done++;
        console.log(`[${id}] ${done}/${done + jobs.length} ${job.name}#${job.i} dur=${(c.dur / 1000).toFixed(0)}s lvl=${c.level} kills=${c.kills} score=${c.score} cards=${c.cardsLog.length} ${c.aborted ? '(plafond)' : ''} wall=${((Date.now() - t0) / 1000).toFixed(0)}s`);
      } catch (e) {
        console.log(`[${id}] ERREUR ${job.name}#${job.i}: ${e.message}`);
        // page probablement bloquée : on la recharge
        try { await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__S && window.__M && window.__M.ui); await page.evaluate(() => location.reload()); } catch (e2) {}
        await page.goto('http://127.0.0.1:8112/snake2030/index.html', { waitUntil: 'load' }).catch(() => {});
        await page.waitForFunction(() => window.__S && window.__M && window.__M.ui).catch(() => {});
        // réinjection du pilote
        const mod = await import('./sim-lib.mjs');
        await mod.reinject(page).catch(() => {});
      }
    }
  } finally { await browser.close(); }
}
await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
console.log('terminé', done, 'parties en', ((Date.now() - t0) / 1000).toFixed(0), 's');
