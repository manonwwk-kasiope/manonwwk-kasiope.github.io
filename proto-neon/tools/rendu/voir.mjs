/* tools/rendu/voir.mjs — regarder la mire de rendu.
   Usage : cd proto-neon && /opt/node22/bin/node tools/rendu/voir.mjs
   Écrit  : tools/rendu/out/*.png  et  tools/rendu/mire.html (page autonome, à ouvrir directement). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

const MIRE = fs.readFileSync(path.join(HERE, 'mire.js'), 'utf8');

/* page autonome : le bundle livré, plus la mire injectée après boot() */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const standalone = html.replace('</body>',
  `<script>${MIRE}\nwindow.__MIRE.install();</script>\n</body>`);
fs.writeFileSync(path.join(HERE, 'mire.html'), standalone);

const URL = 'http://127.0.0.1:8112/proto-neon/index.html';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function shoot(label, ctxOpts, regimes, { freezeAt = 0.30 } = {}) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.addScriptTag({ content: MIRE });
  await page.evaluate(t => { window.__MIRE.install(); window.__MIRE.temps(t); window.__MIRE.gel(true); }, freezeAt);
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => ({
    px: window.__N.gfx.PX, w: window.__N.gfx.W, h: window.__N.gfx.H,
    cw: window.__N.gfx.canvas().width, ch: window.__N.gfx.canvas().height,
    err: window.__ERR.count, frames: window.__FRAME
  }));

  for (const r of regimes) {
    await page.evaluate(rg => { window.__MIRE.regime(rg); }, r);
    await page.waitForTimeout(140);
    const f = path.join(OUT, `${label}-${r}.png`);
    await page.screenshot({ path: f });
    console.log(`  ${path.basename(f)}`);
  }

  /* agrandissement x8 du bord courbe, tube coupé : la preuve visuelle du critère (a) */
  await page.evaluate(() => { window.__MIRE.regime('coupe'); });
  await page.waitForTimeout(140);
  const zoom = await page.evaluate(() => {
    const g = window.__N.gfx, c = g.canvas(), PX = g.PX;
    const x0 = (g.W - 20) * PX, y0 = 60 * PX, ww = 22 * PX, hh = 20 * PX, K = 8;
    const src = c.getContext('2d').getImageData(x0, y0, ww, hh);
    const d = document.createElement('canvas');
    d.width = ww * K; d.height = hh * K;
    const dc = d.getContext('2d');
    dc.imageSmoothingEnabled = false;
    const tmp = document.createElement('canvas');
    tmp.width = ww; tmp.height = hh;
    tmp.getContext('2d').putImageData(src, 0, 0);
    dc.drawImage(tmp, 0, 0, ww, hh, 0, 0, ww * K, hh * K);
    return d.toDataURL('image/png');
  });
  fs.writeFileSync(path.join(OUT, `${label}-zoom-bord.png`),
    Buffer.from(zoom.split(',')[1], 'base64'));
  console.log(`  ${label}-zoom-bord.png`);

  await ctx.close();
  return { info, errs };
}

console.log('bureau 1440x900');
const a = await shoot('bureau', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  ['riche', 'sobre', 'pur', 'coupe']);
console.log('  ', JSON.stringify(a.info), a.errs.length ? a.errs : 'aucune erreur');

console.log('iPhone 13 paysage 844x390');
const b = await shoot('iphone', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  ['riche', 'pur']);
console.log('  ', JSON.stringify(b.info), b.errs.length ? b.errs : 'aucune erreur');

await browser.close();
console.log('\npage autonome : tools/rendu/mire.html');
