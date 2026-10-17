// Planche-contact : le tampon d'index (vrais pixels du jeu, avant post-traitement) toutes les `pas` s.
// Vérifie aussi la palette fermée (index 0..15) et compte le cyan par image.
// usage : node planche.mjs <profil> <t0> <t1> <pas> <colonnes> <fichier>
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { encode } from './png.mjs';
const [prof = 'paysage', a = '0', b = '12.5', st = '0.25', cols = '6', out = 'planche.png'] = process.argv.slice(2);
const P = { paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }[prof];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext(P)).newPage();
await page.addInitScript(() => { window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/intro/index.html');
await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
const frames = []; let W = 0, H = 0, bad = 0;
for (let T = +a; T <= +b + 1e-9; T += +st) {
  await page.waitForFunction((T) => { const s = window.__N.intro.state(); if (s.t >= T - 1e-6) { window.__DT = 1e-9; return true; } return false; }, T, { polling: 'raf', timeout: 30000 });
  await page.waitForTimeout(40);
  const r = await page.evaluate(() => { const s = window.__N.intro.state(), g = window.__N.gfx, buf = g.buf(); return { W: g.W, H: g.H, d: Array.from(buf), e: s.etape, t: s.t }; });
  await page.evaluate(() => { window.__DT = 1 / 60; });
  W = r.W; H = r.H; frames.push(r);
  for (const v of r.d) if (v > 15) bad++;
}
const PAL = await page.evaluate(() => window.__PAL.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16))));
const C = +cols, R = Math.ceil(frames.length / C), gap = 4, OW = C * (W + gap), OH = R * (H + gap), img = new Uint8Array(OW * OH * 4);
frames.forEach((f, i) => { const ox = (i % C) * (W + gap), oy = Math.floor(i / C) * (H + gap);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = PAL[f.d[y * W + x]], o = ((oy + y) * OW + ox + x) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255; } });
for (let i = 0; i < img.length; i += 4) if (img[i + 3] === 0) { img[i + 3] = 255; }
encode(new URL('cap/' + out, import.meta.url).pathname, OW, OH, img);
console.log(frames.length, 'vignettes', W + 'x' + H, '; pixels hors palette :', bad, '; étapes :', frames.map(f => f.e[0] + f.t.toFixed(2)).join(' '));
await browser.close();
