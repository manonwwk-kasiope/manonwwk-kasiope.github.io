import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
page.on('console', m => console.log('LOG', m.type(), m.text()));
await page.addInitScript(() => { window.__SEED = 5; window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8131/proto-neon/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const r = await page.evaluate(async () => {
  const N = window.__N, g = N.game; g.dbg.god(true); g.dbg.boss();
  for (let s = 0; s < 8; s++) { g.dbg.input({ x: 0, y: 0, mag: 0 }); g.dbg.simuler(1); }
  const log = [];
  const d0 = N.colosse.draw;
  N.colosse.draw = function () {
    const b = N.gfx.buf(), W = N.gfx.W, H = N.gfx.H;
    let before = new Set(); for (let k = 0; k < b.length; k++) if (b[k] === 3) before.add(k);
    N.gfx.px(100, 50, 3);
    let pos = null; for (let k = 0; k < b.length; k++) if (b[k] === 3 && !before.has(k)) { pos = [k % W, (k / W) | 0]; break; }
    if (log.length < 3) log.push({ pos, cam: [N.cam.x, N.cam.y] });
    return d0.apply(this, arguments);
  };
  await new Promise(r => setTimeout(r, 4500));
  return { log, etat: g.etat() };
});
console.log(JSON.stringify(r));
await browser.close();
