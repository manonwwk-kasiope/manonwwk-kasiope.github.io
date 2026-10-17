/* tools/D/probe.mjs — lot D : TRAQUEUR (joueuse immobile 25 s en vague 2) et INVERSION par la PASTILLE (butin pastille ramassé) */
import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8131/proto-neon/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const r = await page.evaluate(() => {
  const N = window.__N, g = N.game; N.ev.verifier(true); g.dbg.god(false); g.dbg.vague(2); N.dir.update = () => {};
  const P = N.joueuse.tete, out = { morts0: N.score.stats.morts.length };
  N.joueuse.force({ x: 400, y: 250, ang: 0, len: 12 });
  const T = ['fleche', 'dard', 'larve', 'lame', 'tourelle', 'sentinelle'];
  T.forEach((t, k) => N.ennemis.spawn(t, 400 + 40 + k * 6, 250 + (k - 3) * 14, { portail: 0 }));
  g.dbg.simuler(0.1);
  N.ennemis.inverser(6);
  const kills0 = N.score.stats.kills;
  for (let s = 0; s < 40; s++) {
    const q = N.ennemis.list.filter(e => e._st === 'proie').sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
    if (q) { const a = Math.atan2(q.y - P.y, q.x - P.x); g.dbg.input({ x: Math.cos(a), y: Math.sin(a), mag: 1 }); }
    g.dbg.simuler(0.15);
  }
  out.morts = N.score.stats.morts.length - out.morts0; out.kills = N.score.stats.kills - kills0; out.restent = N.ennemis.list.filter(e => e._st === 'proie').length; out.etat = N.joueuse.etat;
  return out;
});
console.log(JSON.stringify(r));
const err = await page.evaluate(() => ({ count: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6) }));
console.log('ERR', JSON.stringify(err), 'console', logs.length); for (const l of logs.slice(0, 6)) console.log('  ' + l);
await browser.close();
