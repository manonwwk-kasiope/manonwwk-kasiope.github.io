// Saut de l'ouverture à des instants variés, au doigt (CDP) et au clavier ; garde de 300 ms.
import { chromium, devices } from 'playwright';
const PAGE = 'http://127.0.0.1:8112/proto-neon/tools/intro/index.html';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
async function essai(mode, T, prof) {
  const ctx = await browser.newContext(prof === 'bureau' ? { viewport: { width: 1440, height: 900 } } : { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.__DT = 1 / 60;
    const mark = () => { if (window.__evF === undefined) window.__evF = window.__FRAME; };
    window.addEventListener('touchstart', mark, { capture: true }); window.addEventListener('keydown', mark, { capture: true }); });
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
  await page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T) { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf', timeout: 120000 });
  const avant = await page.evaluate(() => ({ ...window.__N.intro.state(), f: window.__FRAME }));
  const cdp = mode === 'doigt' ? await ctx.newCDPSession(page) : null;
  await page.evaluate(() => { window.__DT = 1 / 60; });
  if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 600, y: 200, id: 1 }] });
  else await page.keyboard.down(mode);
  // combien d'images jusqu'au passage en jeu ?
  const r = await page.waitForFunction((f0) => { const S = window.__S; return S.phase === 'play' ? { f: window.__FRAME - f0, phase: S.phase } : (window.__FRAME - f0 > 40 ? { f: -1, phase: S.phase } : false); }, avant.f, { polling: 'raf', timeout: 5000 }).then(h => h.jsonValue());
  if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.keyboard.up(mode);
  const log = await page.evaluate(() => window.__N.intro.log.slice(-2));
  const lat = await page.evaluate(() => { const e = window.__N.intro.log.find(l => l.e === 'saut'); return e ? e.f - window.__evF : null; });
  console.log(`${mode.padEnd(6)} à ${T.toFixed(2)} s (${avant.etape.padEnd(9)}) -> phase ${r.phase}, latence ${lat} image(s) après l'événement ; journal ${JSON.stringify(log)}`, errs.length ? errs : '');
  await ctx.close();
}
const CAS = [['doigt', 0.1], ['doigt', 0.35], ['doigt', 1.0], ['doigt', 2.6], ['doigt', 4.4], ['doigt', 6.7], ['doigt', 9.9], ['doigt', 12.5], ['Space', 0.5], ['Enter', 5.0], ['ArrowLeft', 7.5], ['KeyA', 11.0]];
const choix = process.argv.slice(2).map(a => a.split(':')).map(([m, t]) => [m, +t]);   // ex. ArrowLeft:7.5
for (const [m, T] of (choix.length ? choix : CAS)) await essai(m, T, m === 'doigt' ? 'paysage' : 'bureau');
await browser.close();
