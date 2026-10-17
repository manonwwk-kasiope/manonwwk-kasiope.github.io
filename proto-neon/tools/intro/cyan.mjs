// Règle du cyan sur le tampon d'index : part de pixels cyan / cyan pâle à chaque étape de l'ouverture et des
// interludes. Attendu : 0 hors des images où la joueuse est montrée (étincelle, serpent) et du liseré du logo.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })).newPage();
await page.addInitScript(() => { window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/intro/index.html');
await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
const compte = () => page.evaluate(() => { const N = window.__N, b = N.gfx.buf(), c1 = N.pal.i('cyan'), c2 = N.pal.i('cyanPale'); let n = 0; for (const v of b) if (v === c1 || v === c2) n++; return { n, part: +(100 * n / b.length).toFixed(2), e: N.intro.state().etape }; });
const res = [];
for (const T of [0.5, 1.5, 2.3, 3.2, 4.5, 5.6, 7.9, 9.5, 12.0]) {
  await page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T) { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf' });
  await page.waitForTimeout(30); res.push({ t: T, ...(await compte()) }); await page.evaluate(() => { window.__DT = 1 / 60; });
}
/* le logo seul : combien de ses pixels sont cyan ? (liseré bas, prévu par CONTRAT.md) */
const logo = await page.evaluate(() => { const a = window.__N.art.get('logo'), c1 = window.__N.pal.i('cyan'), c2 = window.__N.pal.i('cyanPale'); let n = 0; for (const v of a.data) if (v === c1 || v === c2) n++; return n; });
await page.evaluate(() => { window.__N.game = { reset() {}, update() {}, draw() { window.__N.gfx.clear(0); }, drawTop() { const N = window.__N; if (N.intro.current()) N.intro.draw(); }, tension() { return 0; } }; window.__N.intro.skip(); });
for (const [nom, T] of [['boss', 0.6], ['boss', 2.5], ['victoire', 1.0], ['defaite', 1.0]]) {
  if (T < 1 || nom !== 'boss') await page.evaluate((n) => window.__N.intro.transition(n), nom);
  await page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T) { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf' });
  await page.waitForTimeout(30); res.push({ t: nom + ' ' + T, ...(await compte()) }); await page.evaluate(() => { window.__DT = 1 / 60; });
}
for (const r of res) console.log(String(r.t).padEnd(13), (r.e || '').padEnd(10), 'cyan', String(r.n).padStart(6), 'px =', r.part, '%');
console.log('pixels cyan du logo lui-même :', logo);
await browser.close();
