// « Réduire les animations », pause pendant l'ouverture, zone sûre simulée (encoche, barre d'accueil).
import { chromium, devices } from 'playwright';
const PAGE = 'http://127.0.0.1:8112/proto-neon/tools/intro/index.html';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
async function ouvrir(opts) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.__DT = 1 / 60; window.__SH = 0; (function f() { if (window.__S) window.__SH = Math.max(window.__SH, window.__S.shake || 0); requestAnimationFrame(f); })(); });
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
  return { ctx, page, errs };
}
const until = (page, T) => page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T) { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf', timeout: 30000 });
const go = (page) => page.evaluate(() => { window.__DT = 1 / 60; });
// 1. réduire les animations
{
  const { ctx, page, errs } = await ouvrir({ reducedMotion: 'reduce' });
  await until(page, 6.5); await page.waitForTimeout(50);
  await page.screenshot({ path: new URL('cap/reduit-titre-6.50.png', import.meta.url).pathname }); await go(page);
  await until(page, 8.4);
  console.log('réduire les animations : secousse max de l\'ouverture =', await page.evaluate(() => window.__SH), '; erreurs', errs.length);
  await ctx.close();
}
// 2. pause pendant l'ouverture, puis reprise au toucher (qui ne doit rien sauter)
{
  const { ctx, page, errs } = await ouvrir({});
  await until(page, 4.0); await go(page);
  await page.evaluate(() => { window.__S.paused = true; });
  await page.waitForTimeout(300);
  const fig = await page.evaluate(() => window.__N.intro.state().t);
  await page.waitForTimeout(300);
  const fig2 = await page.evaluate(() => window.__N.intro.state().t);
  await page.screenshot({ path: new URL('cap/pause-ouverture.png', import.meta.url).pathname });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 400, y: 200, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(600);
  const apres = await page.evaluate(() => ({ phase: window.__S.phase, paused: window.__S.paused, ...window.__N.intro.state() }));
  console.log('pause : horloge figée', fig.toFixed(3), '->', fig2.toFixed(3), '; après le toucher de reprise : phase', apres.phase, ', pause', apres.paused, ', étape', apres.etape, apres.t.toFixed(2), 's');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 400, y: 200, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
  console.log('   second toucher : phase', await page.evaluate(() => window.__S.phase), '; erreurs', errs.length);
  await ctx.close();
}
// 3. zone sûre simulée : le texte (jaune, os) reste dedans, en paysage et en portrait
for (const [nom, vp, safe] of [['paysage', { width: 844, height: 390 }, { l: 24, t: 0, r: 24, b: 11 }], ['portrait', { width: 390, height: 844 }, { l: 0, t: 24, r: 0, b: 17 }]]) {
  const { ctx, page } = await ouvrir({ viewport: vp });
  await page.evaluate((sf) => { window.__S.view.safe = sf; }, safe);
  for (const T of [12.0, 12.45]) {
    await until(page, T); await page.waitForTimeout(40);
    const r = await page.evaluate(() => {
      const g = window.__N.gfx, b = g.buf(), W = g.W, H = g.H, sf = window.__S.view.safe, J = window.__N.pal.i('jaune'), O = window.__N.pal.i('os');
      let out = 0, n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = b[y * W + x]; if (c !== J && c !== O) continue;
        if (y > H * 0.25 || window.__S.view.h > window.__S.view.w) { n++; if (x < sf.l || x >= W - sf.r || y < sf.t || y >= H - sf.b) out++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      return { W, H, sf, n, out, box: [x0, y0, x1, y1] };
    });
    await page.screenshot({ path: new URL(`cap/sure-${nom}-${T.toFixed(2)}.png`, import.meta.url).pathname });
    console.log(`zone sûre ${nom} à ${T} s : tampon ${r.W}x${r.H}, marges ${JSON.stringify(r.sf)}, pixels de texte ${r.n}, hors zone sûre ${r.out}, boîte ${r.box}`);
    await go(page);
  }
  await ctx.close();
}
await browser.close();
