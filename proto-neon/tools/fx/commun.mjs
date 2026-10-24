/* tools/fx/commun.mjs — ouverture de la page de test et outils de capture partagés par voir.mjs et preuve.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
export const SONDE = fs.readFileSync(path.join(HERE, 'sonde.js'), 'utf8');
export const URL = 'http://127.0.0.1:8112/proto-neon/tools/fx/index.html';

export const PROFILS = {
  iphone: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

export function build() {
  execFileSync('/opt/node22/bin/node', [path.join(ROOT, 'build.mjs'), path.join(HERE, 'index.html')], { cwd: ROOT, stdio: 'pipe' });
}

export async function lancer() {
  return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
}

/* une page prête : pas de temps imposé, graine fixe, sonde installée, erreurs relevées */
export async function ouvrir(browser, profil, { crt = 'riche' } = {}) {
  const ctx = await browser.newContext(PROFILS[profil]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.__DT = 1 / 60; window.__SEED = 2975; });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.addScriptTag({ content: SONDE });
  await page.evaluate(m => {
    if (m === 'coupe') window.__N.crt.off = true; else window.__N.crt.preset(m);
    window.__N.fx.reset();
  }, crt);
  await page.waitForTimeout(100);
  return { ctx, page, errs };
}

/* attend que la scène ait atteint l'image k du plan */
export async function attendre(page, k) {
  await page.waitForFunction(kk => window.__FXT.k >= kk, k, { timeout: 60000, polling: 50 });
}

/* planche : des images de sortie posées côte à côte à 1:1, avec une étiquette, puis écrites en PNG */
export async function planche(page, urls, labels, cols, file, crop) {
  const data = await page.evaluate(async ({ urls, labels, cols, crop }) => {
    const imgs = await Promise.all(urls.map(u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
    const w0 = imgs[0].width, h0 = imgs[0].height;
    const cx = crop ? crop[0] : 0, cy = crop ? crop[1] : 0, cw = crop ? crop[2] : w0, ch = crop ? crop[3] : h0;
    const rows = Math.ceil(imgs.length / cols), pad = 18;
    const c = document.createElement('canvas'); c.width = cols * (cw + 4); c.height = rows * (ch + pad + 4);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#333'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => {
      const X = (i % cols) * (cw + 4), Y = ((i / cols) | 0) * (ch + pad + 4);
      x.drawImage(im, cx, cy, cw, ch, X, Y + pad, cw, ch);
      x.fillStyle = '#fff'; x.font = '13px monospace'; x.fillText(labels[i], X + 4, Y + 13);
    });
    return c.toDataURL('image/png');
  }, { urls, labels, cols, crop });
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
}
