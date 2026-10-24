// Boss : forfait de temps -> bannière « SECTEUR NETTOYÉ » et récompense identiques, boss reporté au niveau suivant ?
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const URL = 'http://127.0.0.1:8112/snake2030/index.html';
const OUT = '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__S && window.__M && window.__M.ui);
await page.evaluate(() => { const M = window.__M, S = window.__S; for (const d of M.levels.defs) { d.spawns.length = 0; d.dur.calm = 1; d.dur.rise = 1; d.dur.surge = 1; d.dur.climax = 8; } S.opt.music = false; S.opt.sfx = false;
  window.__ban = []; const ob = M.ui.banner; M.ui.banner = function (t) { window.__ban.push([Math.round(S.t), t]); return ob.call(M.ui, t); };
  window.__toast = []; const ot = M.ui.toast; M.ui.toast = function (a, b) { window.__toast.push([Math.round(S.t), a, b]); return ot.call(M.ui, a, b); };
  window.__pk = []; const op = window.addPickup; });
const btn = page.locator('button.s2big:visible', { hasText: /^(JOUER|REJOUER)$/ }).first();
await btn.waitFor({ state: 'visible' }); await btn.click();
await page.waitForFunction(() => window.__S.phase === 'play');
// on rend le boss invulnérable dès qu'il apparaît, on note la mise en scène
const trace = [];
const t0 = Date.now();
let bossShotDone = false;
while (Date.now() - t0 < 16000) {
  const st = await page.evaluate(() => { const S = window.__S, M = window.__M; const b = S.boss; if (b) { b.hp = b.maxHp; } const pk = {}; for (const p of S.pickups) pk[p.kind] = (pk[p.kind] || 0) + 1; return { t: Math.round(S.t), lph: S.levelPhase, level: S.level, boss: b ? { name: b.name, hp: Math.round(b.hp), d: Math.round(Math.hypot(b.x - S.snake.x, b.y - S.snake.y)), inView: Math.abs(b.x - S.cam.x) < S.view.w / 2 && Math.abs(b.y - S.cam.y) < S.view.h / 2 } : null, ne: S.enemies.length, pk, zoom: +M.phases.state().zoom.toFixed(2), timeScale: S.timeScale, bossAlive: S.enemies.filter(e => e.boss && !e.dead).map(e => e.name) }; });
  trace.push(st);
  if (st.boss && !bossShotDone) { bossShotDone = true; await page.screenshot({ path: `${OUT}en-bossfx-in.png` }); }
  await sleep(250);
}
await page.screenshot({ path: `${OUT}en-bossfx-after.png` });
const ban = await page.evaluate(() => ({ ban: window.__ban, toast: window.__toast }));
const climaxStart = trace.find(x => x.lph === 'climax'); const clearStart = trace.find(x => x.lph === 'clear'); const next = trace.find(x => x.level === 2);
console.log(JSON.stringify({ climaxAt: climaxStart && climaxStart.t, clearAt: clearStart && clearStart.t, level2At: next && next.t, bossAliveAtClear: clearStart && clearStart.bossAlive, bossAliveAtL2: next && next.bossAlive, pickupsAtClear: clearStart && clearStart.pk, pickupsL2: next && next.pk, banners: ban.ban, toasts: ban.toast, bossTrace: trace.filter(x => x.boss).slice(0, 12).map(x => [x.t, x.boss.d, x.boss.inView, x.zoom, x.timeScale]) }, null, 1));
fs.writeFileSync(`${OUT}en-bossfx.json`, JSON.stringify({ trace, ban }, null, 1));
await browser.close();
