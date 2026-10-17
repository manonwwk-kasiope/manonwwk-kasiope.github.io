// La voie vidéo : un clip d'essai (tools/intro/cine/eveil.mp4, jetable) doit remplacer le panneau fixe
// pendant l'étape « eveil », avec les effets de 60-intro.js par-dessus, palette toujours fermée.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/intro/index.html');
await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
for (const T of [4.6, 5.2]) {
  await page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T) { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf', timeout: 30000 });
  await page.waitForTimeout(80);
  const r = await page.evaluate(() => { const N = window.__N, a = N.art.get('eveil'), b = N.gfx.buf(); let bad = 0, os = 0; for (const v of b) { if (v > 15) bad++; if (v === N.pal.i('os')) os++; } return { video: !N.art.ended('eveil'), w: a && a.w, h: a && a.h, bad, os }; });
  await page.screenshot({ path: new URL(`cap/video-eveil-${T}.png`, import.meta.url).pathname });
  console.log('t', T, JSON.stringify(r));
  await page.evaluate(() => { window.__DT = 1 / 60; });
}
console.log('erreurs', errs.length);
await browser.close();
